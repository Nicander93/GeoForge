r"""Cancel / resume probe: start an engine, kill the whole process tree after N seconds,
inspect what is left (complete vs broken tiles, temp files), then resume
(A: --continue, B: -R) and compare with a clean reference output.
python cancel_resume.py --engine B --input data\M.tif --max 15 --kill-after 5 --ref out\bench-B-M-1 --out out\cancel-B-M
"""
import argparse, gzip, glob, hashlib, json, os, shutil, subprocess, sys, time
import psutil
sys.path.insert(0, os.path.dirname(__file__))
import qm_validate as Q
from run_engine import JAR, CTB

def cmd(engine, inp, out, mx, resume):
    if engine == "A":
        c = ["java", "-Xmx8g", "-Djava.awt.headless=true", "-jar", JAR, "-i", inp, "-o", out, "-max", str(mx), "-ncn"]
        return c + (["-c"] if resume else [])
    return [CTB, "-f", "Mesh", "-C", "-s", str(mx), "-e", "0", "-o", out] + (["-R"] if resume else []) + [inp]

def scan(d):
    files = glob.glob(os.path.join(d, "*", "*", "*.terrain")); bad = []
    for f in files:
        try:
            raw = open(f, "rb").read()
            if not raw: raise ValueError("empty")
            Q.decode(raw)
        except Exception as e: bad.append((os.path.relpath(f, d), str(e)[:80]))
    other = [os.path.relpath(p, d) for p in glob.glob(os.path.join(d, "**", "*"), recursive=True) if os.path.isfile(p) and not p.endswith(".terrain")]
    return dict(tiles=len(files), broken=len(bad), brokenExamples=bad[:5], nonTileFiles=len(other), nonTileExamples=other[:5])

def digest(d):
    m = {}
    for f in glob.glob(os.path.join(d, "*", "*", "*.terrain")):
        raw = open(f, "rb").read(); raw = gzip.decompress(raw) if raw[:2] == b"\x1f\x8b" else raw; m[os.path.relpath(f, d)] = hashlib.md5(raw).hexdigest()
    return m

ap = argparse.ArgumentParser(); ap.add_argument("--engine", required=True); ap.add_argument("--input", required=True); ap.add_argument("--max", type=int, required=True)
ap.add_argument("--kill-after", type=float, required=True); ap.add_argument("--ref", required=True); ap.add_argument("--out", required=True); ap.add_argument("--json")
a = ap.parse_args(); rep = dict(engine=a.engine, killAfterSeconds=a.kill_after)
if os.path.exists(a.out): shutil.rmtree(a.out)
os.makedirs(a.out); log = open(a.out + ".log", "wb")
p = subprocess.Popen(cmd(a.engine, a.input, a.out, a.max, False), stdout=log, stderr=subprocess.STDOUT)
time.sleep(a.kill_after)
pp = psutil.Process(p.pid); kids = pp.children(recursive=True)
for k in [pp] + kids:
    try: k.kill()
    except psutil.Error: pass
p.wait(); time.sleep(1)
rep["afterKill"] = scan(a.out); rep["afterKill"]["layerJson"] = os.path.exists(os.path.join(a.out, "layer.json"))
t0 = time.perf_counter(); rc = subprocess.call(cmd(a.engine, a.input, a.out, a.max, True), stdout=log, stderr=subprocess.STDOUT)
if a.engine == "B": subprocess.call([CTB, "-f", "Mesh", "-C", "-s", str(a.max), "-e", "0", "-o", a.out, "-l", a.input], stdout=log, stderr=subprocess.STDOUT)
rep["resume"] = dict(exit=rc, seconds=round(time.perf_counter() - t0, 2), **scan(a.out), layerJson=os.path.exists(os.path.join(a.out, "layer.json")))
ref = digest(a.ref); got = digest(a.out)
rep["vsReference"] = dict(refTiles=len(ref), gotTiles=len(got), missing=len(set(ref) - set(got)), extra=len(set(got) - set(ref)),
                         differentBytes=sum(1 for k in ref if k in got and ref[k] != got[k]))
s = json.dumps(rep, indent=1); print(s)
if a.json: open(a.json, "w").write(s)

