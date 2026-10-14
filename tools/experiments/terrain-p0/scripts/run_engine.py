"""Run one terrain engine on one dataset and record wall time, peak RSS of the
whole process tree (sampled every 0.2 s), output size and tile count.

python run_engine.py --engine A|B --input X.tif [--input Y.tif] --out DIR --max 15
       [--workers N] [--normals] [--heap 8g] [--tag name] [--results results.jsonl]
Measured fields that are not taken here stay null. Nothing is filled with 0.
"""
import argparse, json, os, platform, shutil, subprocess, sys, time, datetime
import psutil

W = os.environ.get("TERRAIN_P0_WORK", r"D:\work\terrain-p0")
JAR = os.path.join(W, r"src\mago-3d-terrainer\mago-terrainer\dist\mago-3d-terrainer-1.14.2-release.jar")
CTB = os.path.join(W, r"install\ctb\bin\ctb-tile.exe")

def monitored(cmd, log, env=None, out_dir=None, t_base=0.0, fp=None):
    t0 = time.perf_counter(); peak = 0; cpu = {}
    with open(log, "ab") as lf:
        lf.write(("\n$ " + " ".join(cmd) + "\n").encode())
        p = subprocess.Popen(cmd, stdout=lf, stderr=subprocess.STDOUT, env=env)
        pp = psutil.Process(p.pid)
        while p.poll() is None:
            try:
                procs = [pp] + pp.children(recursive=True); rss = 0
                for q in procs:
                    try: rss += q.memory_info().rss; ct = q.cpu_times(); cpu[q.pid] = ct.user + ct.system
                    except psutil.Error: pass
                peak = max(peak, rss)
            except psutil.Error:
                pass
            if out_dir and fp is not None and "t" not in fp and all(os.path.exists(os.path.join(out_dir, q)) for q in ("layer.json", r"0\0\0.terrain", r"0\1\0.terrain")): fp["t"] = t_base + time.perf_counter() - t0
            time.sleep(0.2)
    return p.returncode, time.perf_counter() - t0, peak, sum(cpu.values())

def tree_stats(d):
    n = b = 0
    for root, _, files in os.walk(d):
        for f in files:
            fp = os.path.join(root, f); b += os.path.getsize(fp)
            if f.endswith(".terrain"): n += 1
    return n, b

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--engine", required=True, choices=["A", "B"])
    ap.add_argument("--input", action="append", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--max", type=int, required=True)
    ap.add_argument("--workers", type=int)
    ap.add_argument("--normals", action="store_true")
    ap.add_argument("--heap", default="8g")
    ap.add_argument("--intensity", type=float)
    ap.add_argument("--qfactor", type=float)
    ap.add_argument("--dataset-id", default="")
    ap.add_argument("--tag", default="")
    ap.add_argument("--results", default=os.path.join(W, "results.jsonl"))
    ap.add_argument("--extra", nargs=argparse.REMAINDER, default=[])
    a = ap.parse_args()
    if os.path.exists(a.out): shutil.rmtree(a.out)
    os.makedirs(a.out)
    log = a.out.rstrip("\\/") + ".log"
    if os.path.exists(log): os.remove(log)
    env = dict(os.environ)
    steps = []
    if a.engine == "A":
        jvm = ["java", f"-Xmx{a.heap}", "-Djava.awt.headless=true", "-Dfile.encoding=UTF-8"]
        if a.workers: jvm.append(f"-XX:ActiveProcessorCount={a.workers}")
        cmd = jvm + ["-jar", JAR, "-o", a.out, "-max", str(a.max)]
        for i in a.input: cmd += ["-i", i]
        if not a.normals: cmd.append("-ncn")
        if a.intensity: cmd += ["-is", str(a.intensity)]
        steps.append(("encode", cmd + a.extra))
    else:
        base = [CTB, "-f", "Mesh", "-o", a.out, "-s", str(a.max), "-e", "0", "-C"]
        if a.workers: base += ["-c", str(a.workers)]
        if a.normals: base.append("-N")
        if a.qfactor: base += ["-g", str(a.qfactor)]
        inp = a.input[0]
        if len(a.input) > 1:
            inp = a.out.rstrip("\\/") + ".vrt"
            steps.append(("preprocess", ["gdalbuildvrt", inp] + a.input))
        steps.append(("encode", base + a.extra + [inp]))
        steps.append(("layer", base + ["-l"] + a.extra + [inp]))
    rec = {"engine": a.engine, "tag": a.tag, "datasetId": a.dataset_id, "inputs": a.input,
           "params": {"maxDepth": a.max, "workers": a.workers, "normals": a.normals,
                      "heap": a.heap if a.engine == "A" else None, "intensity": a.intensity, "qfactor": a.qfactor, "extra": a.extra},
           "machine": "LM-i5-14600KF-32GB-win11-26200", "startedAt": datetime.datetime.now().astimezone().isoformat(),
           "preprocessSeconds": None, "encodeSeconds": None, "layerSeconds": None, "totalSeconds": None,
           "peakRssMiB": None, "exitCodes": {}, "status": "running", "failureReason": None}
    total = 0.0; peak = 0; cpu_total = 0.0; fp = {}
    for name, cmd in steps:
        rc, dt, pk, cs = monitored(cmd, log, env, a.out, total, fp)
        total += dt; peak = max(peak, pk); cpu_total += cs
        rec["exitCodes"][name] = rc
        rec[{"preprocess": "preprocessSeconds", "encode": "encodeSeconds", "layer": "layerSeconds"}[name]] = round(dt, 3)
        if rc != 0:
            rec["status"] = "failed"; rec["failureReason"] = f"{name} exit {rc}, see {log}"; break
    rec["cpuSecondsSampled"] = round(cpu_total, 1); rec["avgCoresBusy"] = round(cpu_total / total, 2) if total > 0 else None
    rec["timeToFirstPreviewSeconds"] = round(fp["t"], 3) if "t" in fp else (round(total, 3) if rec["status"] == "running" and os.path.exists(os.path.join(a.out, "layer.json")) else None)
    rec["totalSeconds"] = round(total, 3); rec["peakRssMiB"] = round(peak / 2**20, 1)
    n, b = tree_stats(a.out)
    rec["tileCount"] = n; rec["outputBytes"] = b
    rec["layerJson"] = os.path.exists(os.path.join(a.out, "layer.json"))
    if rec["status"] == "running":
        rec["status"] = "ok" if (n > 0 and rec["layerJson"]) else "failed"
        if rec["status"] == "failed": rec["failureReason"] = f"tiles={n} layer.json={rec['layerJson']}"
    with open(a.results, "a", encoding="utf-8") as f: f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(json.dumps(rec, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    main()

