"""Write GeoForge's license notices for the Windows installer.

    python tools/licenses/collect_notices.py \
        --runtime apps/desktop/src-tauri/resources/runtime \
        --out apps/desktop/src-tauri/resources/notices

Run it after the runtime has been staged (package-windows.ps1 does this right
before the Tauri build). The installer copies --out to <install>/licenses/.

Output:
    LICENSE, NOTICE                GeoForge itself (Apache-2.0)
    THIRD-PARTY-NOTICES.txt        every third-party component that ships
    LGPL-SOURCE-OFFER.txt          source code for LGPL- and MPL-licensed parts
    rust/<crate>-<ver>/            license files of the Rust crates compiled
                                   into geoforge-desktop, processor, top_rebuild
    npm/<package>-<ver>/           license files of the npm packages bundled
                                   into the user interface
    inventory.json                 the same data, machine readable

The Python tools, the texture tool's native helpers, the terrain runtime and
the converter keep their own license folders inside resources/runtime; the
notices point to them. Every .exe, .dll and .pyd in the staged runtime must be
claimed by one of the sections, otherwise the script fails (--strict) or
lists it under "unaccounted files".
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
LICENSE_FILE = re.compile(r"^(licen[cs]e|copying|notice|unlicense|copyright|authors|patents)", re.I)
NATIVE = (".exe", ".dll", ".pyd")
CRT = re.compile(r"^(msvcp140.*|vcruntime140.*|concrt140|vccorlib140)\.dll$", re.I)
COPYLEFT = re.compile(r"LGPL|MPL|OSGPL|EPL|CDDL", re.I)


def rel(path: Path, base: Path) -> str:
    return path.relative_to(base).as_posix()


def copy_license_files(src_dir: Path, dst_dir: Path, base: Path) -> list[str]:
    out = []
    for f in sorted(src_dir.iterdir()) if src_dir.is_dir() else []:
        if f.is_file() and LICENSE_FILE.match(f.name):
            dst_dir.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(f, dst_dir / f.name)
            out.append(rel(dst_dir / f.name, base))
    return out


# ---------------------------------------------------------------- Rust
def rust_crates(out: Path, notes: list[str]) -> list[dict]:
    roots = [(REPO / "Cargo.toml", {"processor", "top_rebuild"}),
             (REPO / "apps/desktop/src-tauri/Cargo.toml", {"geoforge-desktop"})]
    crates = {}
    for manifest, names in roots:
        meta = json.loads(subprocess.check_output(
            ["cargo", "metadata", "--format-version", "1", "--locked",
             "--filter-platform", "x86_64-pc-windows-msvc", "--manifest-path", str(manifest)],
            text=True, encoding="utf-8"))
        pkgs = {p["id"]: p for p in meta["packages"]}
        nodes = {n["id"]: n for n in meta["resolve"]["nodes"]}
        queue = [p["id"] for p in meta["packages"] if p["name"] in names and p["source"] is None]
        if len(queue) != len(names):
            raise SystemExit(f"cannot find {names} in {manifest}")
        seen = set()
        while queue:
            pid = queue.pop()
            if pid in seen:
                continue
            # Procedural macros run inside the compiler and are not part of the
            # binaries; neither are the crates only they depend on.
            if any("proc-macro" in t["kind"] for t in pkgs[pid]["targets"]):
                continue
            seen.add(pid)
            for dep in nodes[pid]["deps"]:
                if any(k["kind"] is None for k in dep["dep_kinds"]):
                    queue.append(dep["pkg"])
        for pid in seen:
            p = pkgs[pid]
            if p["source"] is None:
                continue  # GeoForge's own workspace crates
            crates[(p["name"], p["version"])] = p
    rows = []
    for (name, ver), p in sorted(crates.items()):
        dst = out / "rust" / f"{name}-{ver}"
        texts = copy_license_files(Path(p["manifest_path"]).parent, dst, out)
        if not texts:
            notes.append(f"Rust crate {name} {ver} ({p.get('license')}) ships no license file; its license is given by its SPDX expression.")
        rows.append({"name": name, "version": ver, "license": p.get("license") or p.get("license_file") or "",
                     "homepage": p.get("repository") or p.get("homepage") or f"https://crates.io/crates/{name}",
                     "licenseFiles": texts})
    return rows


# ---------------------------------------------------------------- npm
# Production dependencies in package-lock.json that put no code into the app.
NPM_NOT_SHIPPED = {
    "node_modules/loose-envify": "browserify transform used by react at build time",
    "node_modules/js-tokens": "dependency of loose-envify only",
    "node_modules/commander": "used only by the topojson-client command-line tools",
    "node_modules/@cesium/widgets/node_modules/@cesium/engine":
        "the prebuilt Cesium.js of cesium 1.125.0 is built from @cesium/engine 13.1.0",
}


def npm_packages(out: Path, notes: list[str], skipped: list[dict]) -> list[dict]:
    app = REPO / "apps/desktop"
    lock = json.loads((app / "package-lock.json").read_text(encoding="utf-8"))
    rows = []
    for key, info in sorted(lock.get("packages", {}).items()):
        if not key or info.get("dev") or info.get("link"):
            continue
        name_in_key = key.split("node_modules/")[-1]
        reason = NPM_NOT_SHIPPED.get(key)
        if not reason and (name_in_key.startswith("@types/") or name_in_key == "undici-types"):
            reason = "TypeScript type declarations only"
        if reason:
            skipped.append({"package": name_in_key, "version": info.get("version"), "reason": reason})
            continue
        pkg_dir = app / key
        if not (pkg_dir / "package.json").is_file():
            continue  # optional package for another platform, not installed
        pj = json.loads((pkg_dir / "package.json").read_text(encoding="utf-8"))
        name, ver = pj["name"], pj["version"]
        safe = name.replace("/", "__")
        texts = copy_license_files(pkg_dir, out / "npm" / f"{safe}-{ver}", out)
        lic = pj.get("license") or info.get("license") or ""
        if isinstance(lic, dict):
            lic = lic.get("type", "")
        if not texts:
            notes.append(f"npm package {name} {ver} ({lic}) ships no license file; its license is given by its SPDX expression.")
        repo = pj.get("repository")
        if isinstance(repo, dict):
            repo = repo.get("url")
        rows.append({"name": name, "version": ver, "license": lic,
                     "homepage": pj.get("homepage") or repo or f"https://www.npmjs.com/package/{name}",
                     "licenseFiles": texts})
    return rows


# ---------------------------------------------------------------- runtime parts
def python_tool(runtime: Path, tool: str) -> dict | None:
    manifest = runtime / tool / "licenses" / "manifest.json"
    if not manifest.is_file():
        return None
    return json.loads(manifest.read_text(encoding="utf-8"))


def vcpkg_ports(folder: Path) -> list[dict]:
    rows = []
    for port in sorted(p for p in folder.iterdir() if p.is_dir()) if folder.is_dir() else []:
        spdx = port / "vcpkg.spdx.json"
        info = {"name": port.name, "version": "", "license": "", "homepage": "", "source": ""}
        if spdx.is_file():
            pk = json.loads(spdx.read_text(encoding="utf-8"))["packages"]
            info.update(version=pk[0].get("versionInfo", ""), license=pk[0].get("licenseConcluded", ""),
                        homepage=pk[0].get("homepage", ""),
                        source=" ".join(p.get("downloadLocation", "") for p in pk[2:] if p.get("downloadLocation") not in (None, "NONE", "NOASSERTION")))
        if info["license"] in ("", "NOASSERTION", "LicenseRef-vcpkg-null"):
            # vcpkg leaves it empty for these ports; named from their copyright file.
            info["license"] = {"basisu": "Apache-2.0"}.get(port.name, "see license file")
        if " OR " in info["license"] and "GPL" in info["license"]:
            info["election"] = "used under the non-GPL alternative of " + info["license"]
        info["licenseFiles"] = [f.name for f in port.iterdir() if f.name != "vcpkg.spdx.json"]
        rows.append(info)
    return rows


def terrain_components(runtime: Path) -> list[dict]:
    notice = runtime / "terrain" / "NOTICE-terrain.txt"
    rows = []
    if not notice.is_file():
        return rows
    for line in notice.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^(\S+) (\S+) - (.+?) - (https?://\S+)$", line.strip())
        if m:
            rows.append({"name": m[1], "version": m[2], "license": m[3], "source": m[4]})
    return rows


def file_version(path: Path) -> str:
    if os.name != "nt":
        return ""
    import ctypes
    ver = ctypes.windll.version
    size = ver.GetFileVersionInfoSizeW(str(path), None)
    if not size:
        return ""
    buf = ctypes.create_string_buffer(size)
    ver.GetFileVersionInfoW(str(path), 0, size, buf)
    ptr, length = ctypes.c_void_p(), ctypes.c_uint()
    if not ver.VerQueryValueW(buf, "\\", ctypes.byref(ptr), ctypes.byref(length)):
        return ""
    w = ctypes.cast(ptr, ctypes.POINTER(ctypes.c_uint32 * 13)).contents
    return f"{w[4] >> 16}.{w[4] & 0xFFFF}.{w[5] >> 16}.{w[5] & 0xFFFF}"


# ---------------------------------------------------------------- main
def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--runtime", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--version", default="")
    ap.add_argument("--strict", action="store_true")
    args = ap.parse_args()
    runtime, out = args.runtime.resolve(), args.out.resolve()
    if out.exists():
        for child in out.iterdir():
            if child.name != ".gitkeep":
                shutil.rmtree(child) if child.is_dir() else child.unlink()
    out.mkdir(parents=True, exist_ok=True)
    notes: list[str] = []

    for name in ("LICENSE", "NOTICE"):
        shutil.copyfile(REPO / name, out / name)

    rust = rust_crates(out, notes)
    npm_skipped: list[dict] = []
    npm = npm_packages(out, notes, npm_skipped)
    ifc = python_tool(runtime, "ifc")
    texture = python_tool(runtime, "texture")
    texture_native = vcpkg_ports(runtime / "texture" / "licenses" / "vcpkg")
    terrain = terrain_components(runtime)
    converter_dir = runtime / "converter"
    converter_manifest = {}
    if (converter_dir / "manifest.json").is_file():
        converter_manifest = json.loads((converter_dir / "manifest.json").read_text(encoding="utf-8-sig"))
    converter_notices = (converter_dir / "THIRD-PARTY-NOTICES.txt").is_file()
    if converter_dir.is_dir() and not converter_notices:
        notes.append("The bundled converter " + str(converter_manifest.get("version", "")) +
                     " does not carry THIRD-PARTY-NOTICES.txt. geoforge-converter 0.2.6 adds it; pin 0.2.6 before release.")

    # ---- account for every native file in the runtime
    claimed: dict[str, str] = {}
    native = [p for p in runtime.rglob("*") if p.is_file() and p.suffix.lower() in NATIVE]
    for tool, manifest in (("ifc", ifc), ("texture", texture)):
        for c in (manifest or {}).get("components", []):
            for f in c["files"]:
                claimed[f"{tool}/{f}"] = c["name"]
        if manifest:
            claimed[f"{tool}/geoforge-{tool}.exe"] = "GeoForge"
    for port in texture_native:
        for f in {"basisu": ["basisu.exe"], "zstd": ["zstd.dll"]}.get(port["name"], []):
            claimed[f"texture/{f}"] = port["name"]
    crt_files = []
    for p in native:
        r = rel(p, runtime)
        top = r.split("/", 1)[0]
        if r in claimed:
            continue
        if top == "converter":
            claimed[r] = "geoforge-converter"
        elif top == "terrain":
            claimed[r] = "terrain runtime"
        elif r in ("bin/processor.exe", "bin/top_rebuild.exe"):
            claimed[r] = "GeoForge"
        elif CRT.match(p.name) and "/_internal/" not in f"/{r}":
            claimed[r] = "Microsoft Visual C++ runtime"
            crt_files.append((r, file_version(p)))
    unaccounted = sorted(rel(p, runtime) for p in native if rel(p, runtime) not in claimed)
    if unaccounted and args.strict:
        raise SystemExit("unaccounted runtime files:\n  " + "\n  ".join(unaccounted))

    # ---- THIRD-PARTY-NOTICES.txt
    L: list[str] = []
    A = L.append
    A(f"GeoForge 3D {args.version} - third-party notices".strip())
    A("=" * 60)
    A("")
    A("GeoForge 3D is licensed under the Apache License, Version 2.0 (LICENSE in this")
    A("folder); NOTICE describes its origin. The installation also contains the")
    A("third-party software listed below, and only that software. Paths are relative")
    A("to the installation folder. Source code for the LGPL- and MPL-licensed parts is")
    A("described in LGPL-SOURCE-OFFER.txt.")
    A("")
    A("Contents")
    A("  1. Rust crates compiled into geoforge-desktop.exe, processor.exe and top_rebuild.exe")
    A("  2. JavaScript packages bundled into the user interface (geoforge-desktop.exe)")
    A("  3. IFC tool (resources/runtime/ifc)")
    A("  4. Texture tool (resources/runtime/texture)")
    A("  5. Terrain runtime (resources/runtime/terrain)")
    A("  6. Model converter (resources/runtime/converter)")
    A("  7. Microsoft Visual C++ runtime")
    A("")

    def table(rows, base_path, keys=("name", "version", "license")):
        for r in rows:
            A(f"{r['name']} {r.get('version', '')}".rstrip())
            A(f"  License:  {r.get('license') or 'see license files'}")
            if r.get("homepage"):
                A(f"  Homepage: {r['homepage']}")
            if r.get("source"):
                A(f"  Source:   {r['source']}")
            if r.get("licenseFiles"):
                A("  Text:     " + ", ".join(f"{base_path}{t}" for t in r["licenseFiles"]))
            A("")

    A("1. Rust crates")
    A("--------------")
    A(f"{len(rust)} crates. License texts: licenses/rust/<crate>-<version>/.")
    A("")
    for r in rust:
        A(f"{r['name']} {r['version']} | {r['license']} | {r['homepage']}")
    A("")
    A("2. JavaScript packages")
    A("----------------------")
    A(f"{len(npm)} packages. License texts: licenses/npm/<package>-<version>/.")
    A("The CesiumJS LICENSE.md, which also lists the third-party code inside CesiumJS, is in")
    A("licenses/npm/cesium-<version>/. The CesiumJS moon texture (Assets/Textures/moonSmall.jpg)")
    A("is not included, and the viewer does not draw the moon.")
    A("")
    for r in npm:
        A(f"{r['name']} {r['version']} | {r['license']} | {r['homepage']}")
    A("")
    for num, title, tool, manifest in ((3, "IFC tool", "ifc", ifc), (4, "Texture tool", "texture", texture)):
        A(f"{num}. {title}")
        A("-" * (len(title) + 3))
        if not manifest:
            A("(not included in this build)")
            A("")
            continue
        A(f"resources/runtime/{tool}/geoforge-{tool}.exe is GeoForge code packaged with PyInstaller")
        A(f"(GPL-2.0-or-later with the PyInstaller bootloader exception, which allows")
        A(f"distributing the bundled program under its own license). It contains:")
        A("")
        for c in manifest["components"]:
            A(f"{c['name']} {c.get('version', '')}".rstrip())
            A(f"  License:  {c.get('license') or 'see license files'}")
            if c.get("homepage"):
                A(f"  Homepage: {c['homepage']}")
            if c.get("via"):
                A(f"  Bundled by the {c['via']} wheel")
            if c.get("tlsBackend"):
                A(f"  TLS:      {c['tlsBackend']} (Windows built-in; no OpenSSL in this library)")
            if c.get("bundled"):
                A("  Includes: " + "; ".join(f"{k} {v}" for k, v in c["bundled"].items()))
            files = c["files"]
            if files:
                shown = ", ".join(files[:6]) + (f", and {len(files) - 6} more" if len(files) > 6 else "")
                A(f"  Files:    {shown}")
            if c.get("fileVersions"):
                vs = sorted({v for v in c["fileVersions"].values() if v})
                if vs:
                    A("  Versions: " + ", ".join(vs))
            if c["licenseFiles"]:
                A("  Text:     " + ", ".join(f"resources/runtime/{tool}/licenses/{t}" for t in c["licenseFiles"]))
            elif c["name"].startswith("Microsoft"):
                A("  Terms:    Microsoft redistributable files, distributed under the Microsoft")
                A("            Visual Studio / Windows SDK license terms for distributable code.")
            A("")
        if tool == "texture":
            for p in texture_native:
                A(f"{p['name']} {p['version']}")
                A(f"  License:  {p['license']}")
                if p.get("election"):
                    A(f"  Election: {p['election']}")
                if p["homepage"]:
                    A(f"  Homepage: {p['homepage']}")
                if p["source"]:
                    A(f"  Source:   {p['source']}")
                A("  Text:     " + ", ".join(f"resources/runtime/texture/licenses/vcpkg/{p['name']}/{t}" for t in p["licenseFiles"]))
                A("")
    A("5. Terrain runtime")
    A("------------------")
    A("Listed in resources/runtime/terrain/NOTICE-terrain.txt and sbom.spdx.json; license")
    A("texts in resources/runtime/terrain/licenses/.")
    A("")
    for t in terrain:
        A(f"{t['name']} {t['version']} | {t['license']} | {t['source']}")
    A("")
    A("6. Model converter")
    A("------------------")
    A(f"geoforge-converter {converter_manifest.get('version', '')}, Apache-2.0, a modified version of")
    A("fanvanzh/3dtiles (https://github.com/Nicander93/geoforge-converter).")
    if converter_notices:
        A("Its third-party components and license texts are listed in")
        A("resources/runtime/converter/THIRD-PARTY-NOTICES.txt and resources/runtime/converter/licenses/.")
    else:
        present = sorted(rel(p, runtime) for p in converter_dir.rglob("*")
                         if p.is_file() and LICENSE_FILE.match(p.name)) if converter_dir.is_dir() else []
        A("This converter build does not yet carry its own third-party notices. License")
        A("files present: " + (", ".join(f"resources/runtime/{p}" for p in present) or "none"))
    A("")
    A("7. Microsoft Visual C++ runtime")
    A("-------------------------------")
    A("Microsoft Visual C++ Redistributable files, distributed as Distributable Code under")
    A("the Microsoft Visual Studio license terms:")
    for r, v in sorted(crt_files):
        A(f"  resources/runtime/{r} {v}".rstrip())
    A("")
    if notes or unaccounted:
        A("Notes")
        A("-----")
        for n in notes:
            A(f"* {n}")
        for u in unaccounted:
            A(f"* Unaccounted file: resources/runtime/{u}")
        A("")
    (out / "THIRD-PARTY-NOTICES.txt").write_text("\n".join(L), encoding="utf-8")

    # ---- LGPL-SOURCE-OFFER.txt
    offer = []
    def add_offer(name, version, license, files, source, note="", static=False):
        offer.append({"name": name, "version": version, "license": license, "files": files,
                      "source": source, "note": note, "static": static})
    for tool, manifest in (("ifc", ifc), ("texture", texture)):
        for c in (manifest or {}).get("components", []):
            if COPYLEFT.search(c.get("license") or ""):
                src = {
                    "ifcopenshell": "https://github.com/IfcOpenShell/IfcOpenShell/tree/ifcopenshell-python-" + c.get("version", ""),
                    "Open CASCADE Technology": "https://github.com/Open-Cascade-SAS/OCCT/tree/V" + "_".join(c.get("version", "").split(".")[:3]),
                    "GEOS": "https://download.osgeo.org/geos/geos-" + c.get("version", "").split("-")[0] + ".tar.bz2",
                    "certifi": "https://github.com/certifi/python-certifi/tree/" + c.get("version", ""),
                }.get(c["name"], c.get("homepage", ""))
                add_offer(c["name"], c.get("version", ""), c["license"],
                          [f"resources/runtime/{tool}/{f}" for f in c["files"][:4]] + ([f"and {len(c['files']) - 4} more"] if len(c["files"]) > 4 else []),
                          src)
    for t in terrain:
        if COPYLEFT.search(t["license"]):
            add_offer(t["name"], t["version"], t["license"], ["resources/runtime/terrain/"], t["source"],
                      "conda-forge package; its recipe and source URL are in the package's info/ folder and on https://github.com/conda-forge")
    for r in rust + npm:
        if COPYLEFT.search(r["license"]) and not re.search(r"\bOR\b", r["license"]):
            add_offer(r["name"], r["version"], r["license"], [], r["homepage"],
                      "unmodified; its source files are the published package", static=True)
    O: list[str] = []
    B = O.append
    B(f"GeoForge 3D {args.version} - source code for LGPL- and MPL-licensed components".replace("  ", " "))
    B("=" * 60)
    B("")
    B("The components below are used unmodified. Unless marked as compiled in, they are")
    B("shipped as separate files (DLLs, Python packages or data files) that GeoForge")
    B("loads at run time, so you may replace them with compatible versions of your own.")
    B("Reverse engineering for the purpose of debugging such modifications is permitted.")
    B("Components marked as compiled in are MPL-2.0 Rust crates linked into a GeoForge")
    B("executable; MPL-2.0 applies to their own source files, which are available")
    B("unmodified at the listed location.")
    B("")
    B("Written offer: for at least three years after we distribute this version of")
    B("GeoForge 3D, we will give anyone who asks the complete corresponding source code")
    B("of these components, as used in this version, at no charge beyond the cost of")
    B("physically performing the distribution. To ask for it, open an issue at")
    B("https://github.com/Nicander93/GeoForge/issues and name this version.")
    B("")
    for o in offer:
        B(f"{o['name']} {o['version']}".rstrip())
        B(f"  License: {o['license']}")
        B(f"  Source:  {o['source']}")
        if o["static"]:
            B("  Use:     compiled into a GeoForge executable")
        if o["files"]:
            B("  Files:   " + ", ".join(o["files"]))
        if o["note"]:
            B(f"  Note:    {o['note']}")
        B("")
    B("The model converter (resources/runtime/converter) has its own source offer in")
    B("resources/runtime/converter/LGPL-SOURCE-OFFER.txt" + ("." if (converter_dir / "LGPL-SOURCE-OFFER.txt").is_file()
      else " starting with geoforge-converter 0.2.6; the converter in this build predates it."))
    (out / "LGPL-SOURCE-OFFER.txt").write_text("\n".join(O), encoding="utf-8")

    inv = {"version": args.version, "generated": dt.datetime.now().astimezone().isoformat(timespec="seconds"),
           "rust": rust, "npm": npm, "npmNotShipped": npm_skipped, "ifc": ifc, "texture": texture, "textureNative": texture_native,
           "terrain": terrain, "converter": {"version": converter_manifest.get("version"), "hasNotices": converter_notices},
           "msvcRuntime": crt_files, "lgplOrMpl": offer, "notes": notes, "unaccounted": unaccounted}
    (out / "inventory.json").write_text(json.dumps(inv, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"notices: rust={len(rust)} npm={len(npm)} ifc={len((ifc or {}).get('components', []))} "
          f"texture={len((texture or {}).get('components', []))}+{len(texture_native)} terrain={len(terrain)} "
          f"lgpl/mpl={len(offer)} notes={len(notes)} unaccounted={len(unaccounted)} -> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
