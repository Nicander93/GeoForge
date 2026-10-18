"""Real-window regression of the installed desktop app for the non-terrain
converters (OSGB, IFC, FBX/OBJ model). Drives the app through tauri-driver like
terrain-desktop-e2e.py; paths are typed into the form fields (no file dialog).

Example (PowerShell):
  python desktop-regression-e2e.py --app <install>\\geoforge-desktop.exe `
    --tauri-driver tauri-driver.exe --edge-driver msedgedriver.exe --work D:\\work\\reg `
    --osgb <dir with Data/ and metadata.xml> --ifc model.ifc --model a.fbx --model b.obj
"""
import argparse
import importlib.util
import json
import os
import subprocess
import sys
import time
from pathlib import Path

_spec = importlib.util.spec_from_file_location("terrain_e2e", Path(__file__).with_name("terrain-desktop-e2e.py"))
terrain_e2e = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(terrain_e2e)
Window = terrain_e2e.Window

GO = "history.pushState({}, '', arguments[0]); window.dispatchEvent(new PopStateEvent('popstate'));"


FINAL = {"已完成": "succeeded", "失败": "failed", "已取消": "cancelled", "已中断": "failed"}


def wait_done(window, timeout, out):
    """After submit the app opens /processing?task=<id>; the detail panel for
    that task shows its status on the line after the task id. (Progress lines
    such as "已完成 0 块" and the filter tabs are ignored.)"""
    deadline = time.time() + timeout
    task = None
    while time.time() < deadline and not task:
        task = window.run("return new URLSearchParams(location.search).get('task')")
        if not task and "路径校验失败" in window.text():
            return "failed", window.text()
        time.sleep(0.5)
    while time.time() < deadline:
        text = window.text()
        lines = [line.strip() for line in text.split("\n")]
        hits = [i for i, line in enumerate(lines) if line == task]
        if hits:
            for line in lines[hits[-1] + 1: hits[-1] + 4]:
                if line in FINAL:
                    return FINAL[line], text
        time.sleep(1)
    return "timeout", window.text()


def replace_text(window, xpath, text):
    """WebDriver clear does not stick on a field React refills (the OSGB page
    proposes a result folder after the input is picked): select all, delete, type."""
    element = window.find(xpath)
    base = f"/session/{window.session}/element/{element}/value"
    terrain_e2e.call("POST", base, {"text": "\ue009a\ue009\ue017"})
    terrain_e2e.call("POST", base, {"text": text})
    value = window.run("return arguments[0].value", {"element-6066-11e4-a52e-4f735466cecf": element})
    if value != text:
        raise RuntimeError(f"field holds {value!r}, expected {text!r}")


def convert(window, args, kind, source, out_parent, result, index):
    route, placeholder = {
        "osgb": ("/osgb/convert", "含 Data/"),
        "ifc": ("/ifc/convert", "building.ifc"),
        "model": ("/model/convert", "building.fbx"),
    }[kind]
    name = f"{kind}-{index}-{Path(source).stem}".replace(" ", "_")
    started = time.time()
    window.run(GO, "/")
    time.sleep(0.5)
    window.run(GO, route)
    window.wait_text("开始转换", timeout=30)
    window.type(f"//input[contains(@placeholder, '{placeholder}')]", str(source))
    time.sleep(1.5)
    out = out_parent / name
    if kind != "osgb":
        out.mkdir(parents=True, exist_ok=True)  # an existing folder to create the result in
    # OSGB takes the result folder itself and refuses an existing one.
    out_label = "成果目录" if kind == "osgb" else "保存位置"
    replace_text(window, f"//label[contains(., '{out_label}')]/following::input[1]", str(out))
    time.sleep(1.5)
    if kind == "model" and Path(source).suffix.lower() == ".obj":
        # OBJ declares neither unit nor axes; the form asks for both.
        window.click("//select[@id='model-unit']/option[@value='meters']")
        window.click("//button[normalize-space()='高级设置']")
        time.sleep(0.5)
        window.click("//select[@id='model-axes']/option[@value='yUpRightHanded']")
        window.click("//button[@aria-label='关闭高级设置']")
        time.sleep(0.5)
    window.screenshot(f"reg-{index}-{kind}-ready")
    window.click("//button[normalize-space()='开始转换']")
    status, text = wait_done(window, args.timeout, out)
    window.screenshot(f"reg-{index}-{kind}-{status}")
    tilesets = [str(p) for p in out.rglob("tileset.json")] if out.exists() else []
    entry = {"kind": kind, "source": str(source), "status": status, "seconds": round(time.time() - started, 1),
             "tilesets": tilesets[:5], "tilesetCount": len(tilesets)}
    if status != "succeeded":
        entry["pageTail"] = text[-1200:]
    result["runs"].append(entry)
    print(json.dumps(entry, ensure_ascii=False), flush=True)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    for name in ("app", "tauri-driver", "edge-driver", "work"):
        parser.add_argument(f"--{name}", type=Path, required=True)
    parser.add_argument("--osgb", type=Path, action="append", default=[])
    parser.add_argument("--ifc", type=Path, action="append", default=[])
    parser.add_argument("--model", type=Path, action="append", default=[])
    parser.add_argument("--timeout", type=int, default=900)
    args = parser.parse_args()
    args.work.mkdir(parents=True, exist_ok=True)
    out_parent = args.work / "out"
    out_parent.mkdir(exist_ok=True)
    env = dict(os.environ, GEOFORGE_DATA_DIR=str(args.work / "data"))
    driver = subprocess.Popen([str(args.tauri_driver), "--native-driver", str(args.edge_driver)], env=env)
    result = {"runs": []}
    try:
        time.sleep(2)
        window = Window(args.app, args.work)
        window.wait_text("工具")
        index = 1
        for kind, items in (("osgb", args.osgb), ("ifc", args.ifc), ("model", args.model)):
            for source in items:
                try:
                    convert(window, args, kind, source, out_parent, result, index)
                except Exception as error:  # keep going; record the failure
                    window.screenshot(f"reg-{index}-{kind}-error")
                    result["runs"].append({"kind": kind, "source": str(source), "status": "error", "error": repr(error)[:800]})
                index += 1
        window.run(GO, "/results")
        time.sleep(2)
        window.screenshot("reg-9-results")
        window.close()
    finally:
        driver.terminate()
    (args.work / "result-regression.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    failed = [r for r in result["runs"] if r["status"] != "succeeded"]
    print(json.dumps({"runs": len(result["runs"]), "failed": len(failed)}, ensure_ascii=False))
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
