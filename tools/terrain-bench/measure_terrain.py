"""V1.2 terrain measurement: runs `processor run` on the P0 samples and writes
one JSON record per case plus a Markdown summary.

Windows only (the peak memory comes from a job object holding the processor
and every tool it starts). Usage:

    python tools/terrain-bench/measure_terrain.py --processor target/release/processor.exe \
        --runtime D:/work/terrain-v1/runtime-v12b --data D:/work/terrain-p0/data \
        --work D:/work/terrain-v1/bench --out docs/terrain/v1/measurements [--cases D0,D1-auto]

Fields that are not measured stay null.
"""

import argparse
import ctypes
import gzip
import hashlib
import json
import os
import shutil
import struct
import subprocess
import time
from ctypes import wintypes
from pathlib import Path

ACK_UNKNOWN = {"mode": "unknown", "acknowledged": True}

CASES = {
    "D0": {"sources": ["D0.tif"], "terrain": {}},
    "EDGE-PLATEAU": {"sources": ["EDGE-PLATEAU.tif"], "terrain": {"tiling": {"maxDepth": 12}}},
    "D1-auto": {"sources": ["D1.tif"], "terrain": {"tiling": {"maxDepth": 15}}},
    "D1-direct": {"sources": ["D1.tif"], "terrain": {"tiling": {"maxDepth": 15}, "preprocess": {"projectionMode": "direct"}}},
    "D2-constant": {"sources": ["D2.tif"], "terrain": {"noData": {"mode": "explicit-constant", "valueMeters": 150.0}}},
    "D3": {"sources": ["D3_a.tif", "D3_b.tif"], "terrain": {}},
    "M-high": {"sources": ["M.tif"], "terrain": {"tiling": {"maxDepth": 15, "meshQuality": "high"}}},
    "D4": {"sources": ["D4.tif"], "terrain": {"tiling": {"maxDepth": 15}}},
    # Same thread count as the P0 benchmark (CTB default, 20 on LM).
    "M-high-t20": {"sources": ["M.tif"], "terrain": {"tiling": {"maxDepth": 15, "meshQuality": "high"}}, "execution": {"cpuWorkers": 20, "memoryBudgetMiB": 16000}},
    "D4-t20": {"sources": ["D4.tif"], "terrain": {"tiling": {"maxDepth": 15}}, "execution": {"cpuWorkers": 20, "memoryBudgetMiB": 16000}},
    # maxDepth=auto across latitudes (Gate V1.2 #7). LAT-30-D1 is D1 itself; the
    # others are D1 relabeled as EPSG:32650 near 0/45/60/70 N (see lat_samples.py).
    "LAT-00": {"sources": ["LAT-00.tif"], "terrain": {}},
    "LAT-30-D1": {"sources": ["LAT-30-D1.tif"], "terrain": {}},
    "LAT-45": {"sources": ["LAT-45.tif"], "terrain": {}},
    "LAT-60": {"sources": ["LAT-60.tif"], "terrain": {}},
    "LAT-70": {"sources": ["LAT-70.tif"], "terrain": {}},
}

# ---------------------------------------------------------------------------
# Peak memory of the whole process tree through a Windows job object.


class IoCounters(ctypes.Structure):
    _fields_ = [(name, ctypes.c_ulonglong) for name in (
        "ReadOperationCount", "WriteOperationCount", "OtherOperationCount",
        "ReadTransferCount", "WriteTransferCount", "OtherTransferCount")]


class BasicLimits(ctypes.Structure):
    _fields_ = [
        ("PerProcessUserTimeLimit", ctypes.c_longlong), ("PerJobUserTimeLimit", ctypes.c_longlong),
        ("LimitFlags", wintypes.DWORD), ("MinimumWorkingSetSize", ctypes.c_size_t),
        ("MaximumWorkingSetSize", ctypes.c_size_t), ("ActiveProcessLimit", wintypes.DWORD),
        ("Affinity", ctypes.c_size_t), ("PriorityClass", wintypes.DWORD), ("SchedulingClass", wintypes.DWORD),
    ]


class ExtendedLimits(ctypes.Structure):
    _fields_ = [
        ("BasicLimitInformation", BasicLimits), ("IoInfo", IoCounters),
        ("ProcessMemoryLimit", ctypes.c_size_t), ("JobMemoryLimit", ctypes.c_size_t),
        ("PeakProcessMemoryUsed", ctypes.c_size_t), ("PeakJobMemoryUsed", ctypes.c_size_t),
    ]


kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
kernel32.CreateJobObjectW.restype = wintypes.HANDLE
kernel32.OpenProcess.restype = wintypes.HANDLE
JOB_EXTENDED_LIMIT_INFORMATION = 9


def peak_job_memory(job) -> int:
    info = ExtendedLimits()
    ok = kernel32.QueryInformationJobObject(job, JOB_EXTENDED_LIMIT_INFORMATION, ctypes.byref(info), ctypes.sizeof(info), None)
    return info.PeakJobMemoryUsed if ok else None


def run_processor(processor: Path, task: Path, runtime: Path):
    env = dict(os.environ, GEOFORGE_TERRAIN_RUNTIME=str(runtime))
    job = kernel32.CreateJobObjectW(None, None)
    started = time.perf_counter()
    child = subprocess.Popen([str(processor), "run", "--task", str(task)], stdout=subprocess.PIPE,
                             stderr=subprocess.DEVNULL, stdin=subprocess.DEVNULL, env=env,
                             creationflags=0x00000004)  # CREATE_SUSPENDED
    handle = kernel32.OpenProcess(0x1F0FFF, False, child.pid)
    kernel32.AssignProcessToJobObject(job, handle)
    resume_main_thread(child.pid)
    events = []
    for line in child.stdout:
        try:
            event = json.loads(line)
        except ValueError:
            continue
        event["_t"] = time.perf_counter() - started
        events.append(event)
    code = child.wait()
    elapsed = time.perf_counter() - started
    peak = peak_job_memory(job)
    kernel32.CloseHandle(handle)
    kernel32.CloseHandle(job)
    return code, elapsed, peak, events


def resume_main_thread(pid: int):
    """Popen has no thread handle, so resume every thread of the new process."""
    TH32CS_SNAPTHREAD = 0x4

    class ThreadEntry(ctypes.Structure):
        _fields_ = [("dwSize", wintypes.DWORD), ("cntUsage", wintypes.DWORD), ("th32ThreadID", wintypes.DWORD),
                    ("th32OwnerProcessID", wintypes.DWORD), ("tpBasePri", wintypes.LONG),
                    ("tpDeltaPri", wintypes.LONG), ("dwFlags", wintypes.DWORD)]

    kernel32.CreateToolhelp32Snapshot.restype = wintypes.HANDLE
    kernel32.OpenThread.restype = wintypes.HANDLE
    snapshot = kernel32.CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0)
    entry = ThreadEntry()
    entry.dwSize = ctypes.sizeof(entry)
    found = kernel32.Thread32First(snapshot, ctypes.byref(entry))
    while found:
        if entry.th32OwnerProcessID == pid:
            thread = kernel32.OpenThread(0x0002, False, entry.th32ThreadID)
            kernel32.ResumeThread(thread)
            kernel32.CloseHandle(thread)
        found = kernel32.Thread32Next(snapshot, ctypes.byref(entry))
    kernel32.CloseHandle(snapshot)

# ---------------------------------------------------------------------------
# Coarse-level edge collapse: vertices inside the data bounds whose height is
# far below the lowest valid height (CTB pulls edges towards 0 m).


def zigzag_deltas(values):
    current, out = 0, []
    for value in values:
        current += (value >> 1) ^ -(value & 1)
        out.append(current)
    return out


def tile_vertices(path: Path):
    data = path.read_bytes()
    if data[:2] == b"\x1f\x8b":
        data = gzip.decompress(data)
    min_height, max_height = struct.unpack_from("<ff", data, 24)
    count = struct.unpack_from("<I", data, 88)[0]
    raw = struct.unpack_from(f"<{3 * count}H", data, 92)
    u = zigzag_deltas(raw[:count])
    v = zigzag_deltas(raw[count:2 * count])
    h = zigzag_deltas(raw[2 * count:])
    return [(a / 32767, b / 32767, min_height + c / 32767 * (max_height - min_height)) for a, b, c in zip(u, v, h)]


def edge_collapse(output: Path, bounds, floor_m: float, max_depth: int):
    west, south, east, north = bounds
    per_level = []
    for level in range(max_depth + 1):
        size = 180.0 / (1 << level)
        inside = sunken = 0
        level_dir = output / str(level)
        if not level_dir.is_dir():
            continue
        for column in level_dir.iterdir():
            x = int(column.name)
            for tile in column.glob("*.terrain"):
                y = int(tile.stem)
                tile_west, tile_south = -180 + x * size, -90 + y * size
                for u, v, height in tile_vertices(tile):
                    lon, lat = tile_west + u * size, tile_south + v * size
                    if west < lon < east and south < lat < north:
                        inside += 1
                        sunken += height < floor_m
        per_level.append({"level": level, "verticesInsideData": inside, "sunkenVertices": sunken})
    return per_level

# ---------------------------------------------------------------------------


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(8 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def tool_seconds(events):
    totals = {}
    for event in events:
        if event.get("type") == "metric" and event.get("name") == "terrain.toolSeconds":
            value = event["value"]
            key = value["tool"] if not value.get("command") else f'{value["tool"]} {value["command"]}'
            totals[key] = round(totals.get(key, 0.0) + value["seconds"], 3)
    return totals


def measure(name, case, args, hashes):
    sources = [args.data / file for file in case["sources"]]
    work = args.work / name
    shutil.rmtree(work, ignore_errors=True)
    work.mkdir(parents=True)
    output = work / "out"
    terrain = {"version": args.options_version, "sources": [str(path) for path in sources], "verticalDatum": ACK_UNKNOWN, **case["terrain"]}
    task = work / "task.json"
    task.write_text(json.dumps({
        "schemaVersion": 1, "taskId": f"bench-{name}", "operation": "convert-terrain",
        "input": {"path": str(sources[0])}, "output": {"path": str(output)}, "options": {"terrain": terrain, **({"execution": case["execution"]} if "execution" in case else {})},
    }, ensure_ascii=False), encoding="utf-8")
    code, elapsed, peak, events = run_processor(args.processor, task, args.runtime)
    record = {
        "case": name + args.label_suffix,
        "processor": str(args.processor),
        "sources": [{"file": path.name, "bytes": path.stat().st_size, "sha256": hashes.setdefault(path, sha256(path))} for path in sources],
        "options": terrain,
        "exitCode": code,
        "error": next(({"code": e.get("code"), "message": e.get("message")} for e in events if e.get("type") == "error"), None),
        "totalSeconds": round(elapsed, 2),
        "toolSeconds": tool_seconds(events),
        "peakJobCommitMiB": round(peak / 2**20) if peak else None,
        "layerJsonWritten": (output / "layer.json").is_file(),
    }
    report_path = output / "geoforge-terrain.json"
    if code != 0 or not report_path.is_file():
        return record
    report = json.loads(report_path.read_text(encoding="utf-8"))
    validation, no_data = report.get("validation", {}), report.get("noData", {})
    crs = report.get("crs") or {}
    transform = crs.get("transform") or {}
    record.update({
        "crs": crs.get("authority") or crs.get("name"),
        "transform": transform.get("name"),
        "datumShift": (transform.get("datumShift") or {}).get("name"),
        "transformAccuracyM": transform.get("accuracyM"),
        "grids": transform.get("grids"),
        "route": report.get("route"),
        "overviewBuilt": report.get("overviewBuilt"),
        "threads": report["tiling"].get("threads"),
        "maxDepth": report["tiling"]["maxDepth"],
        "maxDepthAuto": report["tiling"].get("maxDepthAuto"),
        "tiles": validation.get("tiles"),
        "outputBytes": sum(f.stat().st_size for f in output.rglob("*") if f.is_file()),
        "noData": {key: no_data.get(key) for key in ("sourceHoleCount", "outsideFootprintCount", "filledCount", "auxiliaryCount", "remainingNoDataCount", "policy")},
        "sampleRmseM": validation.get("sampleRmseM"),
        "sampleP95M": validation.get("sampleP95M"),
        "sampleMaxAbsM": validation.get("sampleMaxAbsM"),
        "sampleBreakdown": validation.get("sampleBreakdown"),
        "maxEdgeGapM": validation.get("maxEdgeGapM"),
        "verticesEdgeBand": validation.get("verticesEdgeBand"),
    })
    if validation.get("minHeightInsideM") is None or not report.get("dataBounds"):
        return record
    floor = validation["minHeightInsideM"] - 1.0
    record["edgeCollapse"] = {
        "rule": "数据范围内、高度低于有效区最低高程 1 m 以上的顶点",
        "floorM": round(floor, 3),
        "perLevel": edge_collapse(output, report["dataBounds"], floor, report["tiling"]["maxDepth"]),
    }
    return record


def fmt(value, digits=2):
    if value is None:
        return "未测"
    if isinstance(value, float):
        return f"{value:.{digits}f}"
    return str(value)


def clean_rmse(record):
    clean = (record.get("sampleBreakdown") or {}).get("clean")
    return f'{fmt(clean.get("rmseM"), 3)}（{clean.get("count")}）' if clean else "未记"


def markdown(records, machine, json_name):
    lines = [
        "# V1.2 实测记录（自动生成）", "",
        f"由 `tools/terrain-bench/measure_terrain.py` 生成，机器：{machine}。原始数据见同目录 `{json_name}.json`。", "",
        "| 用例 | 退出码 | 路线 | CTB 线程 | 总耗时 s | gdalwarp s | gdaladdo s | ctb-tile s | 峰值提交内存 MiB | 层级 | 瓦片 | 输出 MB | RMSE m | 无洞非陡崖 RMSE m（点数） | P95 m | 最大误差 m | 相邻边界差 m | 源内洞 / 范围外 / 填补 | 粗层级下塌顶点 |",
        "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    for r in records:
        tools = r["toolSeconds"]
        nd = r.get("noData") or {}
        collapse = r.get("edgeCollapse")
        sunken = sum(level["sunkenVertices"] for level in collapse["perLevel"]) if collapse else None
        route = f'{r["route"]["effective"]}（{r["route"]["reason"]}）' if r.get("route") else (r["error"] or {}).get("code") or "未记录"
        lines.append("| " + " | ".join([
            r["case"], str(r["exitCode"]), route, fmt(r.get("threads")), fmt(r["totalSeconds"]), fmt(tools.get("gdalwarp")), fmt(tools.get("gdaladdo")),
            fmt(tools.get("ctb-tile")), fmt(r["peakJobCommitMiB"]), fmt(r.get("maxDepth")), fmt(r.get("tiles")),
            fmt(r["outputBytes"] / 1e6) if r.get("outputBytes") else "未测", fmt(r.get("sampleRmseM"), 3), clean_rmse(r), fmt(r.get("sampleP95M"), 3),
            fmt(r.get("sampleMaxAbsM"), 3), fmt(r.get("maxEdgeGapM"), 3),
            f'{fmt(nd.get("sourceHoleCount"))} / {fmt(nd.get("outsideFootprintCount"))} / {fmt(nd.get("filledCount"))}' if nd else "未测",
            fmt(sunken),
        ]) + " |")
    lines += ["", "## 源文件", "", "| 用例 | 文件 | 字节 | SHA-256 |", "|---|---|---|---|"]
    for r in records:
        for source in r["sources"]:
            lines.append(f'| {r["case"]} | {source["file"]} | {source["bytes"]} | `{source["sha256"]}` |')
    lines += ["", "## CRS 与变换", "", "| 用例 | 源 CRS | 选定操作 | 基准转换 | 精度 m | 格网 |", "|---|---|---|---|---|---|"]
    for r in records:
        if r.get("crs"):
            lines.append(f'| {r["case"]} | {r["crs"]} | {r["transform"]} | {r["datumShift"] or "无"} | {fmt(r["transformAccuracyM"])} | {", ".join(r["grids"] or []) or "无"} |')
    lines += ["", "## 粗层级下塌顶点（按层级）", "", "规则：数据范围内、高度低于有效区最低高程 1 m 以上的顶点。只统计，不判定通过与否（V1.4 处理）。", "",
              "| 用例 | 层级:下塌/范围内顶点 |", "|---|---|"]
    for r in records:
        if r.get("edgeCollapse"):
            cells = ", ".join(f'{l["level"]}:{l["sunkenVertices"]}/{l["verticesInsideData"]}' for l in r["edgeCollapse"]["perLevel"] if l["verticesInsideData"])
            lines.append(f'| {r["case"]} | {cells} |')
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--processor", type=Path, required=True)
    parser.add_argument("--runtime", type=Path, required=True)
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--work", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--cases", default=",".join(CASES))
    parser.add_argument("--machine", default="未记录")
    parser.add_argument("--options-version", type=int, default=2, help="1 for a V1.1 processor")
    parser.add_argument("--label-suffix", default="")
    parser.add_argument("--json-name", default="v12-measurements")
    args = parser.parse_args()
    hashes, records = {}, []
    for name in args.cases.split(","):
        print(f"[bench] {name}", flush=True)
        records.append(measure(name, CASES[name], args, hashes))
        print(json.dumps({k: records[-1].get(k) for k in ("exitCode", "totalSeconds", "peakJobCommitMiB", "tiles", "sampleRmseM")}), flush=True)
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / f"{args.json_name}.json").write_text(json.dumps({"machine": args.machine, "records": records}, ensure_ascii=False, indent=2), encoding="utf-8")
    (args.out / f"{args.json_name}.md").write_text(markdown(records, args.machine, args.json_name), encoding="utf-8")


if __name__ == "__main__":
    main()
