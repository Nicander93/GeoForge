"""Independent Quantized-Mesh 1.0 validator and accuracy checker (terrain P0).

Implements decoding straight from the Cesium quantized-mesh SPECIFICATION.md,
without using any candidate's code. Checks layer.json vs files, decodes every
tile (or a sample), validates structure, and compares heights against the
source DEM (bilinear) and, when known, the analytic truth surface.

python qm_validate.py --tiles OUT --dem a.tif [--dem b.tif] [--truth geo|proj|d2]
                      [--sample-tiles 400] [--points 3000] [--json report.json]
"""
import argparse, gzip, json, math, os, random, struct, sys, time
import numpy as np
from osgeo import gdal, osr

gdal.UseExceptions()
sys.path.insert(0, os.path.dirname(__file__))
import gen_datasets as G

def unzz(a):
    a = a.astype(np.int64)
    return (a >> 1) ^ (-(a & 1))

def decode(buf):
    gz = buf[:2] == b"\x1f\x8b"
    if gz: buf = gzip.decompress(buf)
    o = 0
    hdr = struct.unpack_from("<3d2f4d3d", buf, o); o += 88
    n = struct.unpack_from("<I", buf, o)[0]; o += 4
    arr = np.frombuffer(buf, "<u2", 3 * n, o); o += 6 * n
    u = np.cumsum(unzz(arr[:n])); v = np.cumsum(unzz(arr[n:2 * n])); h = np.cumsum(unzz(arr[2 * n:]))
    big = n > 65536
    isz = 4 if big else 2
    if o % isz: o += isz - o % isz
    tc = struct.unpack_from("<I", buf, o)[0]; o += 4
    enc = np.frombuffer(buf, "<u4" if big else "<u2", tc * 3, o).astype(np.int64); o += tc * 3 * isz
    idx = np.empty_like(enc); hw = 0
    for i, c in enumerate(enc):  # high-water-mark decode
        idx[i] = hw - c
        if c == 0: hw += 1
    edges = []
    for _ in range(4):
        k = struct.unpack_from("<I", buf, o)[0]; o += 4
        edges.append(np.frombuffer(buf, "<u4" if big else "<u2", k, o).astype(np.int64)); o += k * isz
    exts = {}
    while o + 5 <= len(buf):
        eid, ln = struct.unpack_from("<BI", buf, o); o += 5
        exts[eid] = ln; o += ln
    return dict(gz=gz, hdr=hdr, n=n, u=u, v=v, h=h, tri=idx.reshape(-1, 3), edges=edges, exts=exts, trailing=len(buf) - o)

def tile_bounds(z, x, y):
    s = 180.0 / (1 << z)
    return -180.0 + x * s, -90.0 + y * s, -180.0 + (x + 1) * s, -90.0 + (y + 1) * s

def geo(t, z, x, y):
    w, s, e, n = tile_bounds(z, x, y)
    mn, mx = t["hdr"][3], t["hdr"][4]
    lon = w + (e - w) * t["u"] / 32767.0; lat = s + (n - s) * t["v"] / 32767.0
    hh = mn + (mx - mn) * t["h"] / 32767.0
    return lon, lat, hh

class Dem:
    def __init__(self, paths):
        self.parts = []
        for p in paths:
            ds = gdal.Open(p); b = ds.GetRasterBand(1)
            srs = osr.SpatialReference(wkt=ds.GetProjection()); srs.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
            wgs = osr.SpatialReference(); wgs.ImportFromEPSG(4326); wgs.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
            ct = osr.CoordinateTransformation(wgs, srs)
            self.parts.append((ds.GetGeoTransform(), b.ReadAsArray().astype(np.float64), b.GetNoDataValue(), ct, int(srs.GetAuthorityCode(None) or 0)))
    def to_src(self, part, lon, lat):
        gt, a, nd, ct, epsg = part
        if epsg == 4326: return lon, lat
        pts = np.array(ct.TransformPoints(np.column_stack([lon, lat])))
        return pts[:, 0], pts[:, 1]
    def sample(self, lon, lat):
        out = np.full(lon.shape, np.nan)
        for part in self.parts:
            gt, a, nd, ct, epsg = part
            X, Y = self.to_src(part, lon, lat)
            c = (X - gt[0]) / gt[1] - 0.5; r = (Y - gt[3]) / gt[5] - 0.5
            ok = (c >= 0) & (r >= 0) & (c <= a.shape[1] - 1) & (r <= a.shape[0] - 1) & np.isnan(out)
            c0 = np.clip(np.floor(c).astype(int), 0, a.shape[1] - 2); r0 = np.clip(np.floor(r).astype(int), 0, a.shape[0] - 2)
            fc = c - c0; fr = r - r0
            q = [a[r0, c0], a[r0, c0 + 1], a[r0 + 1, c0], a[r0 + 1, c0 + 1]]
            bad = np.zeros(lon.shape, bool)
            for qq in q: bad |= (qq == nd)
            val = q[0] * (1 - fc) * (1 - fr) + q[1] * fc * (1 - fr) + q[2] * (1 - fc) * fr + q[3] * fc * fr
            sel = ok & ~bad
            out[sel] = val[sel]
        return out
    def srcxy(self, lon, lat):
        return self.to_src(self.parts[0], lon, lat)

def truth(kind, dem, lon, lat):
    if kind == "geo": return G.truth_geo(lon, lat)
    if kind == "d2":
        t = G.truth_d2(lon, lat); t[G.d2_nodata_mask(lon, lat)] = np.nan; return t
    if kind == "proj":
        x, y = dem.srcxy(lon, lat); return G.truth_proj(x, y)
    return None

def stats(d):
    d = d[np.isfinite(d)]
    if d.size == 0: return dict(n=0, rmse=None, p95=None, maxAbs=None, mean=None)
    ad = np.abs(d)
    return dict(n=int(d.size), rmse=round(float(np.sqrt(np.mean(d * d))), 4), p95=round(float(np.percentile(ad, 95)), 4),
                maxAbs=round(float(ad.max()), 4), mean=round(float(d.mean()), 4))

def interp_in_tile(t, z, x, y, lon, lat):
    """Barycentric height at points inside one tile (the mesh surface Cesium renders)."""
    tl, tb, th = geo(t, z, x, y)
    P = np.column_stack([tl, tb]); res = np.full(lon.shape, np.nan)
    for tri in t["tri"]:
        a, b, c = P[tri[0]], P[tri[1]], P[tri[2]]
        den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if den == 0: continue
        l1 = ((b[1] - c[1]) * (lon - c[0]) + (c[0] - b[0]) * (lat - c[1])) / den
        l2 = ((c[1] - a[1]) * (lon - c[0]) + (a[0] - c[0]) * (lat - c[1])) / den
        l3 = 1 - l1 - l2
        m = (l1 >= -1e-9) & (l2 >= -1e-9) & (l3 >= -1e-9) & np.isnan(res)
        res[m] = l1[m] * th[tri[0]] + l2[m] * th[tri[1]] + l3[m] * th[tri[2]]
    return res

def edge_profile(t, z, x, y, which):
    lon, lat, h = geo(t, z, x, y)
    e = t["edges"][{"w": 0, "s": 1, "e": 2, "n": 3}[which]]
    key = lat[e] if which in "we" else lon[e]
    o = np.argsort(key); return key[o], h[e][o]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tiles", required=True); ap.add_argument("--dem", action="append", required=True)
    ap.add_argument("--truth", choices=["geo", "proj", "d2", "none"], default="none")
    ap.add_argument("--sample-tiles", type=int, default=0); ap.add_argument("--points", type=int, default=3000)
    ap.add_argument("--json"); ap.add_argument("--seed", type=int, default=7)
    a = ap.parse_args(); t0 = time.perf_counter(); rep = dict(tiles=a.tiles, errors=[], warnings=[])
    L = json.load(open(os.path.join(a.tiles, "layer.json"), encoding="utf-8"))
    rep["layer"] = {k: L.get(k) for k in ("format", "scheme", "schema", "projection", "tiles", "bounds", "extensions", "minzoom", "maxzoom")}
    if L.get("format") != "quantized-mesh-1.0": rep["errors"].append("layer.format != quantized-mesh-1.0")
    if "scheme" not in L: rep["warnings"].append("layer.json has no 'scheme' key (found %s); Cesium falls back to tms" % ("'schema'" if "schema" in L else "nothing"))
    files = {}
    for zd in os.listdir(a.tiles):
        if not zd.isdigit(): continue
        for xd in os.listdir(os.path.join(a.tiles, zd)):
            for f in os.listdir(os.path.join(a.tiles, zd, xd)):
                if f.endswith(".terrain"): files[(int(zd), int(xd), int(f[:-8]))] = os.path.join(a.tiles, zd, xd, f)
    maxz = max(k[0] for k in files); rep["maxZoomFiles"] = maxz; rep["fileCount"] = len(files)
    avail = set(); outside = 0
    for z, ranges in enumerate(L.get("available", [])):
        for r in ranges:
            for x in range(r["startX"], r["endX"] + 1):
                for y in range(r["startY"], r["endY"] + 1):
                    if x >= (2 << z) or y >= (1 << z): outside += 1
                    avail.add((z, x, y))
    missing = [k for k in avail if k not in files and k[0] <= maxz and k[1] < (2 << k[0]) and k[2] < (1 << k[0])]
    undeclared = [k for k in files if k not in avail]
    rep["available"] = dict(declared=len(avail), outsideTilingScheme=outside, declaredButMissing=len(missing),
                            missingExamples=sorted(missing)[:5], filesNotDeclared=len(undeclared))
    if outside: rep["warnings"].append(f"{outside} available entries are outside the geographic tiling scheme")
    if missing: rep["errors"].append(f"{len(missing)} tiles declared available but missing (Cesium will request 404)")
    rep["rootTiles"] = [k for k in files if k[0] == 0]
    keys = sorted(files)
    if a.sample_tiles and len(keys) > a.sample_tiles:
        random.seed(a.seed); keys = sorted(set(random.sample(keys, a.sample_tiles)) | {k for k in files if k[0] <= 2})
    triz = {}; dem = Dem(a.dem); gz = 0; ext = {}; vcount = tcount = 0; bad = 0; dsrc = []; dtru = []; dec = {}
    for k in keys:
        raw = open(files[k], "rb").read()
        if not raw: rep["errors"].append(f"empty file {k}"); continue
        try: t = decode(raw)
        except Exception as ex: rep["errors"].append(f"decode failed {k}: {ex}"); bad += 1; continue
        gz += t["gz"]; vcount += t["n"]; tcount += len(t["tri"]); triz[k[0]] = triz.get(k[0], 0) + len(t["tri"])
        for e in t["exts"]: ext[e] = ext.get(e, 0) + 1
        prob = []
        if t["u"].min() < 0 or t["u"].max() > 32767 or t["v"].min() < 0 or t["v"].max() > 32767 or t["h"].min() < 0 or t["h"].max() > 32767: prob.append("quantized out of range")
        if len(t["tri"]) and (t["tri"].min() < 0 or t["tri"].max() >= t["n"]): prob.append("index out of range")
        if t["trailing"] != 0: prob.append(f"trailing bytes {t['trailing']}")
        if not (np.all(t["u"][t["edges"][0]] == 0) and np.all(t["v"][t["edges"][1]] == 0) and np.all(t["u"][t["edges"][2]] == 32767) and np.all(t["v"][t["edges"][3]] == 32767)): prob.append("edge indices not on edge")
        if prob: bad += 1; rep["errors"].append(f"tile {k}: {', '.join(prob)}")
        if k[0] == maxz:
            dec[k] = t
            lon, lat, h = geo(t, *k); s = dem.sample(lon, lat); dsrc.append(h - s)
            tr = truth(a.truth, dem, lon, lat)
            if tr is not None: tr = np.where(np.isfinite(s), tr, np.nan); dtru.append(h - tr)
    rep["decoded"] = dict(trianglesByZoom={str(z): triz[z] for z in sorted(triz)}, tiles=len(keys), gzipped=gz, badTiles=bad, vertices=vcount, triangles=tcount, extensionIds=ext)
    rep["vertexVsSourceDem"] = stats(np.concatenate(dsrc)) if dsrc else None
    rep["vertexVsTruth"] = stats(np.concatenate(dtru)) if dtru else None
    # control points: random inside the DEM footprint, mesh-interpolated (what Cesium renders)
    rng = np.random.default_rng(a.seed); gt, arr, nd, ct, epsg = dem.parts[0]
    lons = []; lats = []
    for part in dem.parts:
        g, arr2 = part[0], part[1]
        xs = g[0] + rng.uniform(0.02, 0.98, a.points // len(dem.parts)) * arr2.shape[1] * g[1]
        ys = g[3] + rng.uniform(0.02, 0.98, a.points // len(dem.parts)) * arr2.shape[0] * g[5]
        if part[4] != 4326:
            src = osr.SpatialReference(); src.ImportFromEPSG(part[4]); src.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
            w = osr.SpatialReference(); w.ImportFromEPSG(4326); w.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
            p = np.array(osr.CoordinateTransformation(src, w).TransformPoints(np.column_stack([xs, ys]))); xs, ys = p[:, 0], p[:, 1]
        lons.append(xs); lats.append(ys)
    lon = np.concatenate(lons); lat = np.concatenate(lats); mh = np.full(lon.shape, np.nan)
    s = 180.0 / (1 << maxz); tx = np.floor((lon + 180) / s).astype(int); ty = np.floor((lat + 90) / s).astype(int)
    for kx, ky in set(zip(tx, ty)):
        k = (maxz, kx, ky)
        if k not in files: continue
        t = dec.get(k) or decode(open(files[k], "rb").read())
        m = (tx == kx) & (ty == ky); mh[m] = interp_in_tile(t, maxz, kx, ky, lon[m], lat[m])
    src = dem.sample(lon, lat); tr = truth(a.truth, dem, lon, lat)
    rep["controlPoints"] = dict(n=int(lon.size), noTile=int(np.isnan(mh).sum()), meshVsSourceDem=stats(mh - src),
                               meshVsTruth=stats(mh - tr) if tr is not None else None)
    # horizontal shift search: which (dx,dy) in metres best aligns the mesh with the DEM
    if tr is not None or True:
        best = None; mlat = math.radians(float(np.nanmean(lat)))
        for dx in np.arange(-20, 20.1, 2.5):
            for dy in np.arange(-20, 20.1, 2.5):
                s2 = dem.sample(lon + dx / (111320 * math.cos(mlat)), lat + dy / 110540)
                d = mh - s2; d = d[np.isfinite(d)]
                if d.size: r = float(np.sqrt(np.mean(d * d)));
                if d.size and (best is None or r < best[0]): best = (r, dx, dy)
        d0 = mh - src; d0 = d0[np.isfinite(d0)]
        rep["horizontalShiftSearch"] = dict(stepMeters=2.5, rangeMeters=20, bestDx=best[1], bestDy=best[2], rmseAtBest=round(best[0], 4), rmseAtZero=round(float(np.sqrt(np.mean(d0 * d0))), 4), note="0,0 means no horizontal offset detectable at 2.5 m resolution")
    if a.truth == "d2":  # horizontal check on the 300 m cliff at lon=114.25 (synthetic sharp feature)
        errs = []
        for la in np.linspace(30.505, 30.59, 40):
            ls = np.linspace(114.247, 114.253, 601); hs = np.full(ls.shape, np.nan)
            s = 180.0 / (1 << maxz); kx = np.floor((ls + 180) / s).astype(int); ky = int(math.floor((la + 90) / s))
            for xx in set(kx):
                k = (maxz, xx, ky)
                if k in files:
                    t = dec.get(k) or decode(open(files[k], "rb").read()); m = kx == xx
                    hs[m] = interp_in_tile(t, maxz, xx, ky, ls[m], np.full(m.sum(), la))
            base = 20.0 + 40.0 * np.sin((ls - 114.2) * 120.0); rel = hs - base
            idx = np.where(np.isfinite(rel[:-1]) & np.isfinite(rel[1:]) & (rel[:-1] < 150) & (rel[1:] >= 150))[0]
            if idx.size:
                i = idx[0]; f = (150 - rel[i]) / (rel[i + 1] - rel[i]); lcross = ls[i] + f * (ls[i + 1] - ls[i])
                errs.append((lcross - 114.25) * 111320 * math.cos(math.radians(la)))
        e = np.array(errs)
        rep["cliffHorizontalCheck"] = dict(rows=len(errs), meanOffsetMeters=round(float(e.mean()), 3) if e.size else None,
            maxAbsOffsetMeters=round(float(np.abs(e).max()), 3) if e.size else None,
            note="position of the 150 m mid-height of the synthetic 300 m cliff vs its true lon 114.25; source pixel 0.0001 deg = 9.6 m")
    # seams at maxz between decoded neighbours
    seam = []; seam_pairs = 0
    for (z, x, y), t in dec.items():
        for nb, mine, theirs in (((z, x + 1, y), "e", "w"), ((z, x, y + 1), "n", "s")):
            if nb not in dec: continue
            k1, h1 = edge_profile(t, z, x, y, mine); k2, h2 = edge_profile(dec[nb], *nb, theirs)
            if len(k1) < 2 or len(k2) < 2: continue
            seam_pairs += 1
            seam.append(np.abs(np.interp(k1, k2, h2) - h1).max()); seam.append(np.abs(np.interp(k2, k1, h1) - h2).max())
    rep["seams"] = dict(pairs=seam_pairs, maxDeltaMeters=round(float(max(seam)), 4) if seam else None,
                        p95DeltaMeters=round(float(np.percentile(seam, 95)), 4) if seam else None)
    rep["validateSeconds"] = round(time.perf_counter() - t0, 2)
    rep["status"] = "fail" if rep["errors"] else "pass"
    s = json.dumps(rep, ensure_ascii=False, indent=1, default=lambda o: o.tolist() if hasattr(o, "tolist") else str(o))
    if a.json: open(a.json, "w", encoding="utf-8").write(s)
    print(s)

if __name__ == "__main__":
    main()


