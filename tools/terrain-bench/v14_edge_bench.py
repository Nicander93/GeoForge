"""V1.4 edge-droop bench (T14.0/T14.1).

Synthetic edge cases with known truth plus the P0 samples, each run on two
runtimes (before/after). Everything is measured on independently decoded
.terrain tiles. Windows only (peak memory via measure_terrain's job object).

    python tools/terrain-bench/v14_edge_bench.py --processor target/release/processor.exe \
        --before D:/work/terrain-v1/runtime-v12c --after D:/work/terrain-v1/runtime-v14 \
        --data D:/work/terrain-p0/data --work D:/work/terrain-v1/bench-v14 \
        --out docs/terrain/v1/measurements/v14 [--cases EDGE-PLATEAU-D0,D0]
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import math
import shutil
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import measure_terrain as mt  # noqa: E402

ACK = {"mode": "unknown", "acknowledged": True}

# --------------------------------------------------------------------------
# Synthetic DEMs. Each has a truth function in source coordinates.


def plateau(_x, _y):
    return 500.0


def slope_cliff(lon, lat):
    # West-east slope 300..700 m over 0.2 deg, plus a 300 m cliff north of 30.5.
    h = 300.0 + (lon - 113.9) / 0.2 * 400.0
    return h + (300.0 if lat >= 30.5 else 0.0)


SYNTH = {
    # Same extent as D0: drooped on the old runtime (vertices on the level-5..12
    # grid land just inside the west/north edge).
    "EDGE-PLATEAU-D0": dict(srs="EPSG:4326", west=113.9, north=30.6, cols=200, rows=200, cell=0.001, fn=plateau),
    "EDGE-PLATEAU": dict(srs="EPSG:4326", west=114.0, north=30.1, cols=200, rows=200, cell=0.001, fn=plateau),
    "EDGE-SLOPE-CLIFF": dict(srs="EPSG:4326", west=113.9, north=30.6, cols=200, rows=200, cell=0.001, fn=slope_cliff,
                             cliff_lat=30.5),
    # EPSG:4547 (CGCS2000 GK, CM 114E). Offset ~1 deg east of the CM, so the
    # footprint is a slightly rotated quadrilateral in lon/lat.
    "EDGE-ROTATED": dict(srs="EPSG:4547", west=600000.0, north=3390000.0, cols=400, rows=400, cell=50.0, fn=plateau),
}
# Two EPSG:4547 plateaus: far apart (blocked by the gap rule) and 2 px apart.
GAPS = {
    "EDGE-GAP-WIDE": [(600000.0, 3390000.0), (630000.0, 3390000.0)],
    "EDGE-GAP-NARROW": [(600000.0, 3390000.0), (610100.0, 3390000.0)],
}
GAP_TILE = dict(cols=200, rows=200, cell=50.0)


def gdal_env(runtime: Path):
    import os
    return dict(os.environ, PATH=str(runtime / "bin") + ";" + os.environ.get("PATH", ""),
                GDAL_DATA=str(runtime / "share/gdal"), PROJ_DATA=str(runtime / "share/proj"), PROJ_NETWORK="OFF")


def write_grid(runtime: Path, out: Path, srs, west, north, cols, rows, cell, fn):
    south = north - rows * cell
    with tempfile.TemporaryDirectory() as tmp:
        asc = Path(tmp) / "g.asc"
        lines = [f"NCOLS {cols}", f"NROWS {rows}", f"XLLCORNER {west}", f"YLLCORNER {south}",
                 f"CELLSIZE {cell}", "NODATA_VALUE -9999"]
        for r in range(rows):
            y = north - (r + 0.5) * cell
            lines.append(" ".join(f"{fn(west + (c + 0.5) * cell, y):.3f}" for c in range(cols)))
        asc.write_text("\n".join(lines) + "\n", encoding="ascii")
        out.parent.mkdir(parents=True, exist_ok=True)
        subprocess.check_call([str(runtime / "bin/gdal_translate.exe"), "-q", "-of", "GTiff", "-a_srs", srs,
                               "-ot", "Float32", "-co", "COMPRESS=DEFLATE", str(asc), str(out)], env=gdal_env(runtime))
    return hashlib.sha256(out.read_bytes()).hexdigest()


def wgs84_polygon(runtime: Path, path: Path):
    info = json.loads(subprocess.check_output([str(runtime / "bin/gdalinfo.exe"), "-json", str(path)],
                                              env=gdal_env(runtime)))
    return info["wgs84Extent"]["coordinates"][0][:-1]


def make_synthetic(runtime: Path, data: Path):
    hashes = {}
    for name, spec in SYNTH.items():
        spec = dict(spec)
        hashes[name] = write_grid(runtime, data / f"{name}.tif", spec.pop("srs"), **{k: spec[k] for k in
                                  ("west", "north", "cols", "rows", "cell", "fn")})
    for name, origins in GAPS.items():
        for i, (w, n) in enumerate(origins):
            hashes[f"{name}-{i}"] = write_grid(runtime, data / f"{name}-{i}.tif", "EPSG:4547", w, n, fn=plateau, **GAP_TILE)
    return hashes


# --------------------------------------------------------------------------
# Quantized-mesh decoding with triangles.


def zz(values):
    cur, out = 0, []
    for v in values:
        cur += (v >> 1) ^ -(v & 1)
        out.append(cur)
    return out


def decode(path: Path):
    data = path.read_bytes()
    if data[:2] == b"\x1f\x8b":
        data = gzip.decompress(data)
    hmin, hmax = struct.unpack_from("<ff", data, 24)
    n = struct.unpack_from("<I", data, 88)[0]
    raw = struct.unpack_from(f"<{3 * n}H", data, 92)
    u, v, h = zz(raw[:n]), zz(raw[n:2 * n]), zz(raw[2 * n:])
    at = 92 + 6 * n
    wide = n > 65536
    if wide:
        at += (-at) % 4
    elif at % 2:
        at += 1
    tc = struct.unpack_from("<I", data, at)[0]
    at += 4
    idx = struct.unpack_from(f"<{3 * tc}{'I' if wide else 'H'}", data, at)
    hw, tris = 0, []
    for code in idx:
        tris.append(hw - code)
        if code == 0:
            hw += 1
    heights = [hmin + c / 32767 * (hmax - hmin) for c in h]
    return [x / 32767 for x in u], [y / 32767 for y in v], heights, [tuple(tris[i:i + 3]) for i in range(0, len(tris), 3)]


def tiles(out: Path):
    for level_dir in sorted(out.iterdir(), key=lambda p: p.name):
        if not level_dir.name.isdigit():
            continue
        z = int(level_dir.name)
        for col in level_dir.iterdir():
            for t in col.glob("*.terrain"):
                yield z, int(col.name), int(t.stem), t


def tile_box(z, x, y):
    s = 180.0 / (1 << z)
    return -180 + x * s, -90 + y * s, s


# --------------------------------------------------------------------------
# Footprint helpers (lon/lat polygon, convex).


def point_in_poly(lon, lat, poly):
    inside = False
    for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]):
        if (y1 > lat) != (y2 > lat) and lon < (x2 - x1) * (lat - y1) / (y2 - y1) + x1:
            inside = not inside
    return inside


def dist_to_poly_deg(lon, lat, poly):
    best = 1e9
    for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]):
        dx, dy = x2 - x1, y2 - y1
        t = max(0.0, min(1.0, ((lon - x1) * dx + (lat - y1) * dy) / (dx * dx + dy * dy)))
        best = min(best, math.hypot(lon - x1 - t * dx, lat - y1 - t * dy))
    return best


def truth_range(fn, lon, lat, r):
    """Min/max of the truth within +-r deg (a vertex is a blend of its cell)."""
    vals = [fn(lon + a * r, lat + b * r) for a in (-1, 0, 1) for b in (-1, 0, 1)]
    return min(vals), max(vals)


def synthetic_check(out: Path, poly, fn, inset_deg, tol=0.5, sample_step=8):
    """Vertices and barycentric surface samples strictly inside the footprint
    (inset by `inset_deg`) must match the truth within `tol` m, allowing the
    truth's own range over one cell of that level."""
    per = {}
    for z, x, y, path in tiles(out):
        w, s, size = tile_box(z, x, y)
        u, v, h, tris = decode(path)
        cell = size / 64
        rec = per.setdefault(z, {"vertices": 0, "vertexBad": 0, "vertexMaxDevM": 0.0,
                                 "samples": 0, "sampleBad": 0, "sampleMaxDevM": 0.0, "worst": None})

        def check(kind, lon, lat, height):
            if not point_in_poly(lon, lat, poly) or dist_to_poly_deg(lon, lat, poly) < inset_deg:
                return
            lo, hi = truth_range(fn, lon, lat, cell)
            dev = max(lo - height, height - hi, 0.0)
            rec[kind + "s" if kind == "sample" else "vertices"] += 1
            if dev > tol:
                rec["vertexBad" if kind == "vertex" else "sampleBad"] += 1
            key = "vertexMaxDevM" if kind == "vertex" else "sampleMaxDevM"
            if dev > rec[key]:
                rec[key] = dev
                rec["worst"] = {"kind": kind, "lon": lon, "lat": lat, "height": height, "truthMin": lo, "truthMax": hi}

        for i in range(len(u)):
            check("vertex", w + u[i] * size, s + v[i] * size, h[i])
        inside = [point_in_poly(w + u[i] * size, s + v[i] * size, poly) for i in range(len(u))]
        for a, b, c in tris:
            if not (inside[a] and inside[b] and inside[c]):
                # Triangle spans the data edge: this is the intended real step
                # at the data boundary, interpolated across one mesh cell.
                rec["edgeTriangles"] = rec.get("edgeTriangles", 0) + 1
                continue
            for i in range(1, sample_step):
                for j in range(1, sample_step - i):
                    l1, l2 = i / sample_step, j / sample_step
                    l3 = 1 - l1 - l2
                    uu = l1 * u[a] + l2 * u[b] + l3 * u[c]
                    vv = l1 * v[a] + l2 * v[b] + l3 * v[c]
                    check("sample", w + uu * size, s + vv * size, l1 * h[a] + l2 * h[b] + l3 * h[c])
    total = {k: sum(r.get(k, 0) for r in per.values()) for k in ("vertices", "vertexBad", "samples", "sampleBad", "edgeTriangles")}
    total["vertexMaxDevM"] = max((r["vertexMaxDevM"] for r in per.values()), default=0.0)
    total["sampleMaxDevM"] = max((r["sampleMaxDevM"] for r in per.values()), default=0.0)
    return {"total": total, "perLevel": {str(z): per[z] for z in sorted(per)}}


# --------------------------------------------------------------------------
# Before/after tile comparison.


def tile_index(out: Path):
    return {(z, x, y): p for z, x, y, p in tiles(out)}


def compare(before: Path, after: Path, bounds, inset=0.15):
    west, south, east, north = bounds
    iw, ie = west + inset * (east - west), east - inset * (east - west)
    is_, in_ = south + inset * (north - south), north - inset * (north - south)
    a, b = tile_index(before), tile_index(after)
    per = {}
    interior = {"common": 0, "changed": 0, "changedKeys": []}
    for key in sorted(set(a) & set(b)):
        z, x, y = key
        w, s, size = tile_box(z, x, y)
        same = a[key].read_bytes() == b[key].read_bytes()
        # ring: 0 = tile straddles a data edge; k = k tiles inward from the
        # nearest straddling tile; -1 = fully outside the data.
        e, n = w + size, s + size
        if e <= west or w >= east or n <= south or s >= north:
            ring = -1
        elif w < west < e or w < east < e or s < south < n or s < north < n:
            ring = 0
        else:
            ring = int(min(w - west, east - e, s - south, north - n) // size) + 1
        rec = per.setdefault(z, {"common": 0, "changed": 0, "byRing": {}, "maxCommonVertexDiffM": 0.0,
                                 "maxSurfaceDiffNote": None})
        rec["common"] += 1
        r = rec["byRing"].setdefault(str(min(ring, 3)), {"common": 0, "changed": 0})
        r["common"] += 1
        if w >= iw and e <= ie and s >= is_ and n <= in_ and z == max(k[0] for k in a):
            interior["common"] += 1
        if same:
            continue
        rec["changed"] += 1
        r["changed"] += 1
        if w >= iw and e <= ie and s >= is_ and n <= in_ and z == max(k[0] for k in a):
            interior["changed"] += 1
            interior["changedKeys"].append(key)
        ua, va, ha, _ = decode(a[key])
        ub, vb, hb, _ = decode(b[key])
        da = {(round(p * 32767), round(q * 32767)): hh for p, q, hh in zip(ua, va, ha)}
        for p, q, hh in zip(ub, vb, hb):
            k2 = (round(p * 32767), round(q * 32767))
            lon, lat = w + p * size, s + q * size
            if k2 in da and west < lon < east and south < lat < north:
                rec["maxCommonVertexDiffM"] = max(rec["maxCommonVertexDiffM"], abs(hh - da[k2]))
    for rec in per.values():
        rec.pop("maxSurfaceDiffNote")
    interior["changedKeys"] = interior["changedKeys"][:10]
    return {"interiorDeepest": interior, "perLevel": {str(z): per[z] for z in sorted(per)},
            "onlyBefore": len(set(a) - set(b)), "onlyAfter": len(set(b) - set(a))}


# --------------------------------------------------------------------------


P0 = {k: mt.CASES[k] for k in ("D0", "D1-auto", "D1-direct", "D2-constant", "D3", "M-high", "D4")}
SYN_CASES = {
    "EDGE-PLATEAU-D0": {"sources": ["EDGE-PLATEAU-D0.tif"], "terrain": {"tiling": {"maxDepth": 13}}},
    "EDGE-PLATEAU": {"sources": ["EDGE-PLATEAU.tif"], "terrain": {"tiling": {"maxDepth": 12}}},
    "EDGE-SLOPE-CLIFF": {"sources": ["EDGE-SLOPE-CLIFF.tif"], "terrain": {"tiling": {"maxDepth": 13}}},
    "EDGE-ROTATED": {"sources": ["EDGE-ROTATED.tif"], "terrain": {"tiling": {"maxDepth": 13}}},
    "EDGE-GAP-WIDE": {"sources": ["EDGE-GAP-WIDE-0.tif", "EDGE-GAP-WIDE-1.tif"], "terrain": {"tiling": {"maxDepth": 12}}},
    "EDGE-GAP-NARROW": {"sources": ["EDGE-GAP-NARROW-0.tif", "EDGE-GAP-NARROW-1.tif"], "terrain": {"tiling": {"maxDepth": 12}}},
}


def run_case(args, runtime: Path, tag: str, name: str, case):
    sources = [args.data / f for f in case["sources"]]
    work = args.work / f"{name}-{tag}"
    shutil.rmtree(work, ignore_errors=True)
    work.mkdir(parents=True)
    out = work / "out"
    terrain = {"version": 2, "sources": [str(p) for p in sources], "verticalDatum": ACK, **case["terrain"]}
    options = {"terrain": terrain, **({"execution": case["execution"]} if "execution" in case else {})}
    task = work / "task.json"
    task.write_text(json.dumps({"schemaVersion": 1, "taskId": f"v14-{name}-{tag}", "operation": "convert-terrain",
                                "input": {"path": str(sources[0])}, "output": {"path": str(out)},
                                "options": options}, ensure_ascii=False), encoding="utf-8")
    code, elapsed, peak, events = mt.run_processor(args.processor, task, runtime)
    rec = {"exitCode": code, "elapsedS": round(elapsed, 2), "peakCommitMiB": round(peak / 2**20) if peak else None}
    if code != 0:
        err = next((e for e in events if e.get("type") == "error"), {})
        rec["error"] = {"code": err.get("code"), "message": err.get("message")}
        return rec, None
    report = json.loads((out / "geoforge-terrain.json").read_text(encoding="utf-8"))
    v = report["validation"]
    floor = v["minHeightInsideM"] - 1.0
    coll = mt.edge_collapse(out, report["dataBounds"], floor, report["tiling"]["maxDepth"])
    rec.update({
        "tiles": v["tiles"], "bytes": sum(p.stat().st_size for _, _, _, p in tiles(out)),
        "maxEdgeGapM": v["maxEdgeGapM"], "sampleRmseM": v["sampleRmseM"],
        "clean": (v.get("sampleBreakdown") or {}).get("clean"),
        "sunkenTotal": sum(l["sunkenVertices"] for l in coll),
        "sunkenPerLevel": {str(l["level"]): l["sunkenVertices"] for l in coll if l["sunkenVertices"]},
        "dataBounds": report["dataBounds"],
        "warnings": sorted({e.get("code") for e in events if e.get("type") == "warning"}),
    })
    return rec, out


def main():
    ap = argparse.ArgumentParser()
    for name in ("processor", "before", "after", "data", "work", "out"):
        ap.add_argument(f"--{name}", type=Path, required=True)
    ap.add_argument("--cases", default="")
    ap.add_argument("--skip-synth-gen", action="store_true")
    args = ap.parse_args()
    args.work.mkdir(parents=True, exist_ok=True)
    args.out.mkdir(parents=True, exist_ok=True)
    hashes = {} if args.skip_synth_gen else make_synthetic(args.after, args.data)
    cases = {**SYN_CASES, **P0}
    if args.cases:
        cases = {k: cases[k] for k in args.cases.split(",")}
    results = {"syntheticSha256": hashes, "before": str(args.before), "after": str(args.after), "cases": {}}
    for name, case in cases.items():
        rec = {}
        outs = {}
        for tag, rt in (("before", args.before), ("after", args.after)):
            rec[tag], outs[tag] = run_case(args, rt, tag, name, case)
            print(name, tag, json.dumps({k: rec[tag].get(k) for k in ("exitCode", "elapsedS", "peakCommitMiB",
                  "tiles", "sunkenTotal", "maxEdgeGapM")}), flush=True)
        if outs["before"] and outs["after"]:
            rec["compare"] = compare(outs["before"], outs["after"], rec["after"]["dataBounds"])
        if name in SYNTH and outs["after"]:
            spec = SYNTH[name]
            if spec["srs"] == "EPSG:4326":
                w, n = spec["west"], spec["north"]
                e, s = w + spec["cols"] * spec["cell"], n - spec["rows"] * spec["cell"]
                poly = [(w, s), (e, s), (e, n), (w, n)]
                pix = spec["cell"]
            else:
                poly = [tuple(p) for p in wgs84_polygon(args.after, args.data / f"{name}.tif")]
                pix = spec["cell"] / 111320.0
            for tag in ("before", "after"):
                if outs[tag]:
                    # inset 1.5 source pixels: vertices on the outermost half
                    # pixel are a blend with the 0 m outside by definition.
                    rec[tag]["truthCheck"] = synthetic_check(outs[tag], poly, spec["fn"], 1.5 * pix)
                    rec[tag]["truthCheckStrict2Cells"] = None
        results["cases"][name] = rec
        (args.out / "v14-edge-bench.json").write_text(json.dumps(results, indent=1, ensure_ascii=False), encoding="utf-8")
    print("written", args.out / "v14-edge-bench.json")


if __name__ == "__main__":
    main()
