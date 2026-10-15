"""Real-window end-to-end run of the terrain page on Windows.

Drives the built desktop app through tauri-driver + msedgedriver (WebDriver),
picks the DEM in the native file dialog by typing its path, inspects,
confirms the vertical datum, submits and waits for the task to succeed.

--scenario d1 (default): D1 with its own CRS.
--scenario crs-nodata: a DEM without a CRS and with NoData holes (make one
with `gdal_translate -of VRT D2.tif D2-nocrs.vrt` and delete its <SRS> line;
NoData stays declared in the VRT). The page must name the missing CRS; the run types
EPSG:4326 as the source CRS, picks "interpolate" for the holes, and the
report must show the user CRS and filled holes.

    python apps/desktop/scripts/terrain-desktop-e2e.py --app <geoforge-desktop.exe> \
        --tauri-driver <tauri-driver.exe> --edge-driver <msedgedriver.exe> \
        --processor <processor.exe> --runtime <runtime/terrain> --dem <D1.tif> --work <empty folder>

Screenshots and a result.json land in --work.
"""

import argparse
import base64
import json
import os
import subprocess
import time
import urllib.request
from pathlib import Path

DRIVER = "http://127.0.0.1:4444"


def call(method, path, body=None):
    data = None if body is None else json.dumps(body).encode()
    request = urllib.request.Request(DRIVER + path, data=data, method=method, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.loads(response.read() or b"{}").get("value")


class Window:
    def __init__(self, app: Path, shots: Path):
        caps = {"capabilities": {"alwaysMatch": {"browserName": "wry", "tauri:options": {"application": str(app)}}}}
        self.session = call("POST", "/session", caps)["sessionId"]
        self.shots = shots

    def run(self, script, *args):
        return call("POST", f"/session/{self.session}/execute/sync", {"script": script, "args": list(args)})

    def find(self, xpath):
        found = call("POST", f"/session/{self.session}/element", {"using": "xpath", "value": xpath})
        return next(iter(found.values()))

    def click(self, xpath):
        call("POST", f"/session/{self.session}/element/{self.find(xpath)}/click", {})

    def type(self, xpath, text):
        element = self.find(xpath)
        call("POST", f"/session/{self.session}/element/{element}/clear", {})
        call("POST", f"/session/{self.session}/element/{element}/value", {"text": text})

    def text(self):
        return self.run("return document.body.innerText")

    def wait_text(self, needle, timeout=60):
        deadline = time.time() + timeout
        while time.time() < deadline:
            if needle in self.text():
                return
            time.sleep(0.5)
        raise TimeoutError(f"page never showed {needle!r}")

    def screenshot(self, name):
        png = call("GET", f"/session/{self.session}/screenshot")
        (self.shots / f"{name}.png").write_bytes(base64.b64decode(png))

    def close(self):
        call("DELETE", f"/session/{self.session}")


FRAME_STATE = """
const frame = document.querySelector('iframe[title="Cesium 地形预览"]');
const win = frame && frame.contentWindow;
const gf = win && win.__geoforgeTerrain;
if (!gf) return null;
const urls = win.performance.getEntriesByType('resource').map((e) => e.name);
return {
  tilesLoaded: gf.viewer.scene.globe.tilesLoaded,
  provider: !!gf.provider,
  requests: urls.length,
  external: urls.filter((u) => !/^(https?:\\/\\/(127\\.0\\.0\\.1|localhost|tauri\\.localhost)[:/]|tauri:|blob:|data:)/.test(u)),
};
"""


def wait_tiles(window, timeout=120):
    deadline = time.time() + timeout
    state = None
    while time.time() < deadline:
        state = window.run(FRAME_STATE)
        if state and state["provider"] and state["tilesLoaded"] and "加载完成" in window.text():
            time.sleep(2)
            return window.run(FRAME_STATE)
        time.sleep(0.5)
    raise TimeoutError(f"terrain tiles never finished loading: {state}")


def preview_terrain(window, result, step):
    """V1.3: open the finished task in the terrain preview, overview then edge close-up."""
    window.click("//button[normalize-space()='预览地形']")
    window.wait_text("地形信息", timeout=30)
    overview = wait_tiles(window)
    step("terrain preview loaded")
    window.screenshot("e2e-4-terrain-overview")
    window.click("//button[normalize-space()='数据边缘近景']")
    time.sleep(1)
    edge = wait_tiles(window)
    window.screenshot("e2e-5-terrain-edge")
    step("edge close-up loaded")
    external = sorted(set(overview["external"] + edge["external"]))
    assert not external, f"preview fetched non-local resources: {external}"
    result["preview"] = {"requests": edge["requests"], "externalRequests": external}
    window.click("//a[contains(., '成果')]")
    window.wait_text("Cesium 地形", timeout=30)
    window.screenshot("e2e-6-results")
    result["resultsText"] = window.text()[-1500:]


def type_into_file_dialog(title, path):
    """The native dialog is outside WebDriver. Find its file name box and Open
    button with UI Automation (control ids 1148 and 1), then set the text and
    click with window messages; this needs no keyboard focus."""
    script = f"""
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
$root = [System.Windows.Automation.AutomationElement]::RootElement
$dialog = $null
for ($i = 0; $i -lt 80 -and -not $dialog; $i++) {{
  Start-Sleep -Milliseconds 250
  $dialog = $root.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition) |
    Where-Object {{ $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::Window -and $_.Current.Name -like '{title}*' }} | Select-Object -First 1
}}
if (-not $dialog) {{ throw 'file dialog not found' }}
$all = $dialog.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
$edit = $all | Where-Object {{ $_.Current.AutomationId -eq '1148' -and $_.Current.ClassName -eq 'Edit' }} | Select-Object -First 1
$open = $all | Where-Object {{ $_.Current.AutomationId -eq '1' -and $_.Current.ClassName -eq 'Button' }} | Select-Object -First 1
if (-not $edit -or -not $open) {{ throw 'file name box or Open button not found' }}
Add-Type -Namespace Win32 -Name User32 -MemberDefinition '[DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr SendMessage(IntPtr hWnd, uint msg, IntPtr wParam, string lParam);'
[Win32.User32]::SendMessage([IntPtr]$edit.Current.NativeWindowHandle, 0x000C, [IntPtr]::Zero, '{path}') | Out-Null
Start-Sleep -Milliseconds 300
[Win32.User32]::SendMessage([IntPtr]$open.Current.NativeWindowHandle, 0x00F5, [IntPtr]::Zero, $null) | Out-Null
"""
    subprocess.run(["powershell", "-NoProfile", "-Command", script], check=True)


def main():
    parser = argparse.ArgumentParser()
    for name in ("app", "tauri-driver", "edge-driver", "processor", "runtime", "dem", "work"):
        parser.add_argument(f"--{name}", type=Path, required=True)
    parser.add_argument("--scenario", choices=("d1", "crs-nodata"), default="d1")
    parser.add_argument("--crs", default="EPSG:4326", help="source CRS typed in the crs-nodata scenario")
    args = parser.parse_args()
    args.work.mkdir(parents=True, exist_ok=True)
    output_parent = args.work / "out"
    output_parent.mkdir(exist_ok=True)
    env = dict(os.environ, GEOFORGE_DATA_DIR=str(args.work / "data"), GEOFORGE_PROCESSOR=str(args.processor),
               GEOFORGE_TERRAIN_RUNTIME=str(args.runtime))
    driver = subprocess.Popen([str(args.tauri_driver), "--native-driver", str(args.edge_driver)], env=env)
    result = {"steps": []}
    started = time.time()
    try:
        time.sleep(2)
        window = Window(args.app, args.work)
        step = lambda name: result["steps"].append({"step": name, "seconds": round(time.time() - started, 1)})
        window.wait_text("工具")
        window.click("//a[contains(., '地形切片')]")
        window.wait_text("添加 DEM 文件")
        step("terrain page open")
        window.click("//button[normalize-space()='添加 DEM 文件']")
        type_into_file_dialog("选择 DEM 文件", str(args.dem))
        if args.scenario == "d1":
            window.wait_text("EPSG:4547")
            window.wait_text("推荐最大层级")
            step("D1 picked and inspected")
            window.screenshot("e2e-1-inspected")
        else:
            window.wait_text("没有坐标系")
            step("CRS-less DEM picked; missing CRS named")
            window.screenshot("e2e-crs-1-missing")
            window.type("//textarea[@id='terrain-crs']", args.crs)
            window.click("//button[normalize-space()='应用']")
            window.wait_text("用户指定，应用于全部源文件")
            window.wait_text("NoData 空洞")
            step("CRS override applied; NoData decision asked")
            window.screenshot("e2e-crs-2-override")
            window.click("//select[@id='terrain-nodata']/option[@value='interpolate']")
            window.type("//input[@id='terrain-search']", "100")
        window.click("//select[@id='terrain-vertical']/option[@value='unknown']")
        window.click("//label[contains(., '我知道高程将按原值写入')]")
        window.type("//label[contains(., '保存位置')]/following::input[1]", str(output_parent))
        window.wait_text("将新建成果目录")
        window.screenshot("e2e-2-ready" if args.scenario == "d1" else "e2e-crs-3-ready")
        window.click("//button[normalize-space()='开始切片']")
        window.wait_text("地形成果", timeout=300)
        step("task succeeded")
        window.screenshot("e2e-3-task-done" if args.scenario == "d1" else "e2e-crs-4-task-done")
        result["pageText"] = window.text()[-2000:]
        if args.scenario == "d1":
            preview_terrain(window, result, step)
        window.close()
    finally:
        driver.terminate()
    outputs = [path for path in output_parent.iterdir() if (path / "layer.json").is_file()]
    result["outputs"] = [str(path) for path in outputs]
    if outputs:
        report = json.loads((outputs[0] / "geoforge-terrain.json").read_text(encoding="utf-8"))
        result["route"] = report["route"]
        result["tiles"] = report["validation"]["tiles"]
        result["sampleRmseM"] = report["validation"]["sampleRmseM"]
        result["crs"] = {k: report["crs"].get(k) for k in ("authority", "name", "userSpecified")}
        result["noData"] = {k: report["noData"].get(k) for k in ("policy", "sourceHoleCount", "filledHoleCount", "remainingNoDataCount")}
        if args.scenario == "crs-nodata":
            assert report["crs"]["userSpecified"] is True, report["crs"]
            assert report["noData"]["policy"] == "interpolate" and report["noData"]["filledHoleCount"] > 0, report["noData"]
    (args.work / f"result-{args.scenario}.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in result.items() if k != "pageText"}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
