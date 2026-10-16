"""T14.2 performance / memory / resume benchmark for convert-terrain (Windows).

Per run it records: phase wall times from the processor's
`terrain.phaseSeconds` events (inspect, setup, vrt, warp, nodata, overview,
ctb, validate, commit), total wall time, peak job commit memory of the whole
process tree, job CPU time (user + kernel) and average CPU utilisation, the
lowest host available memory seen during the run, temporary disk peak
(`terrain.tempPeakBytes`), tile count, output size and sample RMSE.

Robustness: `--crash` kills the process tree during CTB, resumes with
resumePolicy=resume and compares every tile with an uninterrupted run.

    python tools/terrain-bench/v14_perf_bench.py --processor target/release/processor.exe \
        --runtime <runtime/terrain> --data <P0 data> --work <scratch> --out <dir> [--cases ...] [--crash]
"""

from __future__ import annotations

import argparse
import ctypes
import hashlib
import json
import os
import platform
import shutil
import subprocess
import sys
import threading
import time
from ctypes import wintypes
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import measure_terrain as mt  # noqa: E402

kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
kernel32.CreateJobObjectW.restype = wintypes.HANDLE
kernel32.OpenProcess.restype = wintypes.HANDLE

ACK = {"mode": "unknown", "acknowledged": True}
M_HIGH = {"tiling": {"maxDepth": 15, "meshQuality": "high"}}
D4 = {"tiling": {"maxDepth": 15}}
CASES = {
    **{f"M-high-w{w}": {"sources": ["M.tif"], "terrain": M_HIGH, "execution": {"cpuWorkers": w}} for w in (1, 2, 4, 8)},
    "M-high-auto": {"sources": ["M.tif"], "terrain": M_HIGH},
    **{f"D4-w{w}": {"sources": ["D4.tif"], "terrain": D4, "execution": {"cpuWorkers": w}} for w in (2, 4, 8)},
    "D4-auto": {"sources": ["D4.tif"], "terrain": D4},
    "D4-auto-4GiB": {"sources": ["D4.tif"], "terrain": D4, "execution": {"memoryBudgetMiB": 4096}},
}


class MemoryStatus(ctypes.Structure):
    _fields_ = [("dwLength", wintypes.DWORD), ("dwMemoryLoad", wintypes.DWORD), ("ullTotalPhys", ctypes.c_uint64),
                ("ullAvailPhys", ctypes.c_uint64), ("ullTotalPageFile", ctypes.c_uint64), ("ullAvailPageFile", ctypes.c_uint64),
                ("ullTotalVirtual", ctypes.c_uint64), ("ullAvailVirtual", ctypes.c_uint64), ("ullAvailExtendedVirtual", ctypes.c_uint64)]


def host_memory():
    status = MemoryStatus()
    status.dwLength = ctypes.sizeof(status)
    kernel32.GlobalMemoryStatusEx(ctypes.byref(status))
    return status.ullTotalPhys, status.ullAvailPhys


class BasicAccounting(ctypes.Structure):
    _fields_ = [("TotalUserTime", ctypes.c_int64), ("TotalKernelTime", ctypes.c_int64), ("ThisPeriodTotalUserTime", ctypes.c_int64),
                ("ThisPeriodTotalKernelTime", ctypes.c_int64), ("TotalPageFaultCount", wintypes.DWORD),
                ("TotalProcesses", wintypes.DWORD), ("ActiveProcesses", wintypes.DWORD), ("TotalTerminatedProcesses", wintypes.DWORD)]


def job_cpu_seconds(job) -> float:
    info = BasicAccounting()
    kernel32.QueryInformationJobObject(job, 1, ctypes.byref(info), ctypes.sizeof(info), None)
    return (info.TotalUserTime + info.TotalKernelTime) / 1e7


def run(processor: Path, task: Path, runtime: Path, kill_after_phase: str | None = None, kill_delay: float = 3.0):
    env = dict(os.environ, GEOFORGE_TERRAIN_RUNTIME=str(runtime))
    job = kernel32.CreateJobObjectW(None, None)
    started = time.perf_counter()
    child = subprocess.Popen([str(processor), "run", "--task", str(task)], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                             stdin=subprocess.DEVNULL, env=env, creationflags=0x00000004)
    handle = kernel32.OpenProcess(0x1F0FFF, False, child.pid)
    kernel32.AssignProcessToJobObject(job, handle)
    mt.resume_main_thread(child.pid)
    lowest = [host_memory()[1]]
    done = threading.Event()

    def sample():
        while not done.wait(0.5):
            lowest[0] = min(lowest[0], host_memory()[1])

    sampler = threading.Thread(target=sample, daemon=True)
    sampler.start()
    events, killed = [], False
    for line in child.stdout:
        try:
            event = json.loads(line)
        except ValueError:
            continue
        event["_t"] = time.perf_counter() - started
        events.append(event)
        value = event.get("value") if isinstance(event.get("value"), dict) else {}
        if kill_after_phase and event.get("name") == "terrain.phaseSeconds" and value.get("phase") == kill_after_phase:
            def kill():
                time.sleep(kill_delay)
                kernel32.TerminateJobObject(job, 99)
            threading.Thread(target=kill, daemon=True).start()
            killed = True
    code = child.wait()
    elapsed = time.perf_counter() - started
    done.set()
    record = {
        "exitCode": code, "elapsedS": round(elapsed, 2), "killed": killed,
        "peakCommitMiB": round(mt.peak_job_memory(job) / 2**20),
        "cpuS": round(job_cpu_seconds(job), 1),
        "lowestHostAvailMiB": round(lowest[0] / 2**20),
    }
    record["avgCpuCores"] = round(record["cpuS"] / elapsed, 2) if elapsed else None
    kernel32.CloseHandle(handle)
    kernel32.CloseHandle(job)
    phases = {}
    for event in events:
        value = event.get("value")
        if event.get("name") == "terrain.phaseSeconds" and isinstance(value, dict):
            phases[value["phase"]] = round(phases.get(value["phase"], 0) + value["seconds"], 2)
        elif event.get("name") == "terrain.tempPeakBytes":
            record["tempPeakMiB"] = round(value / 2**20, 1)
        elif event.get("name") == "output.bytes":
            record["outputMiB"] = round(value / 2**20, 1)
    record["phasesS"] = phases
    if code != 0:
        err = next((e for e in events if e.get("type") == "error"), {})
        record["error"] = {"code": err.get("code"), "message": err.get("message")}
    record["logs"] = [e.get("message") for e in events if e.get("type") == "log" and "resum" in str(e.get("message", "")).lower()]
    return record


def write_task(work: Path, name: str, case, data: Path, out: Path, resume: bool = False) -> Path:
    sources = [data / f for f in case["sources"]]
    execution = dict(case.get("execution", {}))
    if resume:
        execution["resumePolicy"] = "resume"
    elif "resumePolicy" not in execution:
        execution["resumePolicy"] = "retain-on-failure"
    terrain = {"version": 2, "sources": [str(p) for p in sources], "verticalDatum": ACK, **case["terrain"]}
    task = work / f"task-{name}{'-resume' if resume else ''}.json"
    task.write_text(json.dumps({"schemaVersion": 1, "taskId": f"perf-{name}", "operation": "convert-terrain",
                                "input": {"path": str(sources[0])}, "output": {"path": str(out)},
                                "options": {"terrain": terrain, "execution": execution}}, ensure_ascii=False), encoding="utf-8")
    return task


def input_sizes(runtime: Path, path: Path):
    info = json.loads(subprocess.check_output([str(runtime / "bin/gdalinfo.exe"), "-json", str(path)], env=mt_env(runtime)))
    width, height = info["size"]
    bits = {"Byte": 8, "Int16": 16, "UInt16": 16, "Int32": 32, "UInt32": 32, "Float32": 32, "Float64": 64}
    band = info["bands"][0]["type"]
    return {"fileMiB": round(path.stat().st_size / 2**20, 1), "uncompressedMiB": round(width * height * bits.get(band, 32) / 8 / 2**20, 1),
            "size": [width, height], "type": band}


def mt_env(runtime: Path):
    return dict(os.environ, PATH=str(runtime / "bin") + os.pathsep + os.environ.get("PATH", ""),
                GDAL_DATA=str(runtime / "share/gdal"), PROJ_DATA=str(runtime / "share/proj"))


def tile_hashes(out: Path):
    return {p.relative_to(out).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in out.rglob("*.terrain")}


def report_fields(out: Path):
    report = json.loads((out / "geoforge-terrain.json").read_text(encoding="utf-8"))
    v = report["validation"]
    return {"tiles": v["tiles"], "sampleRmseM": v["sampleRmseM"], "reportPhasesS": report.get("performance", {}).get("phasesS"),
            "ctbThreads": report.get("performance", {}).get("ctbThreads")}


def main():
    ap = argparse.ArgumentParser()
    for name in ("processor", "runtime", "data", "work", "out"):
        ap.add_argument(f"--{name}", type=Path, required=True)
    ap.add_argument("--cases", default=",".join(CASES))
    ap.add_argument("--crash", action="store_true")
    args = ap.parse_args()
    args.work.mkdir(parents=True, exist_ok=True)
    args.out.mkdir(parents=True, exist_ok=True)
    total, avail = host_memory()
    result = {"machine": {"platform": platform.platform(), "cpu": platform.processor(), "logicalCpus": os.cpu_count(),
                          "totalMemMiB": round(total / 2**20), "availMemAtStartMiB": round(avail / 2**20)},
              "runtime": str(args.runtime), "inputs": {}, "runs": {}}
    for f in ("M.tif", "D4.tif"):
        result["inputs"][f] = input_sizes(args.runtime, args.data / f)
    for name in [c for c in args.cases.split(",") if c]:
        out = args.work / name / "out"
        shutil.rmtree(args.work / name, ignore_errors=True)
        (args.work / name).mkdir(parents=True)
        rec = run(args.processor, write_task(args.work / name, name, CASES[name], args.data, out), args.runtime)
        if rec["exitCode"] == 0:
            rec.update(report_fields(out))
        result["runs"][name] = rec
        print(name, json.dumps({k: rec.get(k) for k in ("exitCode", "elapsedS", "peakCommitMiB", "cpuS", "avgCpuCores", "tempPeakMiB", "tiles", "phasesS")}), flush=True)
        if not name.startswith("M-high-auto"):
            shutil.rmtree(out, ignore_errors=True)
    if args.crash:
        case = CASES["M-high-auto"]
        name = "M-high-crash"
        base = args.work / name
        shutil.rmtree(base, ignore_errors=True)
        base.mkdir(parents=True)
        out = base / "out"
        crashed = run(args.processor, write_task(base, name, case, args.data, out), args.runtime, kill_after_phase="overview", kill_delay=4.0)
        resumed = run(args.processor, write_task(base, name, case, args.data, out, resume=True), args.runtime)
        reference = args.work / "M-high-auto" / "out"
        compare = None
        if resumed["exitCode"] == 0 and reference.is_dir():
            a, b = tile_hashes(reference), tile_hashes(out)
            compare = {"referenceTiles": len(a), "resumedTiles": len(b), "identical": a == b,
                       "differing": len([k for k in a if a.get(k) != b.get(k)])}
        # Changed options after a crash must restart, not resume.
        changed_case = {**case, "terrain": {"tiling": {"maxDepth": 15, "meshQuality": "balanced"}}}
        base2 = args.work / "M-crash-changed"
        shutil.rmtree(base2, ignore_errors=True)
        base2.mkdir(parents=True)
        out2 = base2 / "out"
        crashed2 = run(args.processor, write_task(base2, "M-crash-changed", case, args.data, out2), args.runtime, kill_after_phase="overview", kill_delay=4.0)
        changed = run(args.processor, write_task(base2, "M-crash-changed", changed_case, args.data, out2, resume=True), args.runtime)
        result["robustness"] = {"crash": crashed, "resume": resumed, "resumeVsFullRun": compare,
                                "crashBeforeChange": crashed2, "resumeWithChangedOptions": changed}
        print("crash/resume", json.dumps(compare), resumed.get("logs"), changed.get("logs"), flush=True)
    target = args.out / "v14-perf-bench.json"
    target.write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")
    print("written", target)


if __name__ == "__main__":
    main()
