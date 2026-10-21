"""Record what a PyInstaller onedir build ships and copy its license texts.

Run it with the same Python that ran PyInstaller (the build venv), right after
the build:

    python tools/licenses/python_bundle.py --name geoforge-ifc \
        --work tools/ifc/build/pyinstaller/geoforge-ifc \
        --dist tools/ifc/dist/geoforge-ifc

It reads COLLECT-00.toc and PYZ-00.toc from the PyInstaller work directory,
maps every shipped file back to the Python distribution, the Python runtime or
a bundled native library it came from, and writes <dist>/licenses/:

    manifest.json              components, versions, licenses, shipped files
    <component>/...            license files copied from the installed
                               distribution (dist-info), the Python install,
                               or tools/licenses/texts/ for texts the wheels
                               do not carry

Only files that are really in the onedir are listed. A shipped native file
that cannot be attributed makes the script fail.
"""
from __future__ import annotations

import argparse
import ast
import ctypes
import fnmatch
import importlib.metadata as md
import json
import os
import re
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TEXTS = HERE / "texts"
LICENSE_NAME = re.compile(r"(licen[cs]e|copying|notice|authors|patents)", re.I)
NATIVE = (".dll", ".pyd", ".exe")

# Native libraries that wheels bundle (delvewheel *.libs folders or package
# directories) and that carry no license file of their own in the wheel.
# name pattern -> (component, upstream, license, texts)
BUNDLED_NATIVE = [
    ("libcurl-*.dll", "curl", "https://curl.se/", "curl", ["vcpkg/curl/copyright"]),
    ("sqlite3-*.dll", "SQLite", "https://sqlite.org/", "blessing (public domain)", ["vcpkg/sqlite3/copyright"]),
    ("tiff-*.dll", "LibTIFF", "https://libtiff.gitlab.io/libtiff/", "libtiff", ["vcpkg/tiff/copyright"]),
    ("jpeg62-*.dll", "libjpeg-turbo", "https://libjpeg-turbo.org/", "IJG AND BSD-3-Clause AND Zlib", ["vcpkg/libjpeg-turbo/copyright"]),
    ("liblzma-*.dll", "XZ Utils (liblzma)", "https://tukaani.org/xz/", "0BSD", ["vcpkg/liblzma/copyright"]),
    ("zlib1-*.dll", "zlib", "https://zlib.net/", "Zlib", ["vcpkg/zlib/copyright"]),
    ("proj_*.dll", "PROJ", "https://proj.org/", "MIT", []),          # pyproj ships LICENSE_proj
    ("geos-*.dll", "GEOS", "https://libgeos.org/", "LGPL-2.1-only", []),  # shapely ships LICENSE_GEOS
    ("geos_c-*.dll", "GEOS", "https://libgeos.org/", "LGPL-2.1-only", []),
    ("libscipy_openblas*.dll", "OpenBLAS (scipy-openblas)", "https://github.com/OpenMathLib/OpenBLAS", "BSD-3-Clause", []),  # numpy LICENSE.txt
    ("msvcp140-*.dll", "Microsoft Visual C++ runtime (copies bundled by wheels)", "", "LicenseRef-Microsoft-VC-Redist", []),
    ("TK*.dll", "Open CASCADE Technology", "https://dev.opencascade.org/", "LGPL-2.1-only WITH OCCT-exception-1.0", ["occt/LICENSE_LGPL_21.txt", "occt/OCCT_LGPL_EXCEPTION.txt"]),
    ("boost_*.dll", "Boost", "https://www.boost.org/", "BSL-1.0", ["vcpkg/boost-headers/copyright"]),
    ("manifold.dll", "Manifold", "https://github.com/elalish/manifold", "Apache-2.0", ["manifold/LICENSE"]),
]
# Distributions whose wheel has no license file: texts from upstream.
DIST_TEXTS = {
    "ifcopenshell": ("LGPL-3.0-or-later", "https://ifcopenshell.org/", ["ifcopenshell/COPYING.LESSER", "ifcopenshell/COPYING"]),
}
MS_RUNTIME = re.compile(r"^(ucrtbase\.dll|api-ms-win-.*\.dll|vcruntime140(_1|_threads)?\.dll|msvcp140(_\d|_atomic_wait|_codecvt_ids)?\.dll|concrt140\.dll|vccorlib140\.dll)$", re.I)


def file_version(path: Path) -> str:
    if os.name != "nt":
        return ""
    ver = ctypes.windll.version
    size = ver.GetFileVersionInfoSizeW(str(path), None)
    if not size:
        return ""
    buf = ctypes.create_string_buffer(size)
    if not ver.GetFileVersionInfoW(str(path), 0, size, buf):
        return ""
    ptr = ctypes.c_void_p()
    length = ctypes.c_uint()
    if not ver.VerQueryValueW(buf, "\\", ctypes.byref(ptr), ctypes.byref(length)):
        return ""
    words = ctypes.cast(ptr, ctypes.POINTER(ctypes.c_uint32 * 13)).contents
    ms, ls = words[4], words[5]
    return f"{ms >> 16}.{ms & 0xFFFF}.{ls >> 16}.{ls & 0xFFFF}"


def dist_license(d) -> str:
    expr = d.metadata.get("License-Expression")
    if expr:
        return expr
    text = (d.metadata.get("License") or "").strip().splitlines()
    if text and len(text[0]) <= 60:
        return text[0]
    classifiers = [c.split("::")[-1].strip() for c in d.metadata.get_all("Classifier") or [] if c.startswith("License ::")]
    return "; ".join(classifiers) or "see license files"


def load_toc(path: Path):
    return ast.literal_eval(path.read_text(encoding="utf-8"))


def norm(p: str) -> str:
    return os.path.normcase(os.path.abspath(p))


def tls_backend(path: Path) -> str:
    data = path.read_bytes()
    found = [name for name in ("Schannel", "OpenSSL", "BoringSSL", "wolfSSL", "mbedTLS", "GnuTLS", "rustls")
             if name.encode() in data]
    return ", ".join(found) or "none found"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", required=True)
    ap.add_argument("--work", required=True, type=Path)
    ap.add_argument("--dist", required=True, type=Path)
    args = ap.parse_args()

    collect = load_toc(args.work / "COLLECT-00.toc")
    entries = [e for e in collect[0] if isinstance(e, tuple)] if isinstance(collect, tuple) else collect
    pyz = load_toc(args.work / "PYZ-00.toc")
    pyz_entries = pyz[1] if isinstance(pyz, tuple) else pyz

    # source path -> (destination inside the onedir, kind)
    shipped = []
    for dest, src, kind in entries:
        if not src:
            continue
        rel = dest.replace("\\", "/")
        if kind != "EXECUTABLE":
            rel = "_internal/" + rel
        shipped.append((rel, src, kind))
    repo = norm(str(HERE.parent.parent))
    for mod, src, kind in pyz_entries:
        # The tool's own modules are GeoForge code, covered by GeoForge's LICENSE.
        if src and os.path.isfile(src) and not (norm(src).startswith(repo) and "site-packages" not in norm(src)):
            shipped.append(("_internal/PYZ:" + mod, src, "PYMODULE"))

    owner = {}
    dists = {}
    for d in md.distributions():
        name = d.metadata["Name"]
        root = Path(d.locate_file(""))
        for f in d.files or []:
            owner[norm(str(root / f))] = name
        dists[name] = d

    base = Path(sys.base_prefix)
    out = args.dist / "licenses"
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    components = {}

    def comp(key, **kw):
        c = components.setdefault(key, {"name": key, "files": [], "licenseFiles": [], **kw})
        return c

    def copy_text(c, src: Path, sub: str):
        dst = out / c["dir"] / sub
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dst)
        rel = f"{c['dir']}/{sub}"
        if rel not in c["licenseFiles"]:
            c["licenseFiles"].append(rel)

    unattributed = []
    py_modules = set()
    for rel, src, kind in shipped:
        n = norm(src)
        leaf = os.path.basename(src)
        dist = owner.get(n)
        bundled = next((b for b in BUNDLED_NATIVE if fnmatch.fnmatch(leaf.lower(), b[0].lower())), None)
        if bundled and leaf.lower().endswith(NATIVE):
            key, home, lic, texts = bundled[1], bundled[2], bundled[3], bundled[4]
            c = comp(key, dir="native/" + re.sub(r"[^A-Za-z0-9.+-]+", "-", key).strip("-").lower(),
                     homepage=home, license=lic, kind="native library bundled by a wheel",
                     version="", via=dist or "")
            v = file_version(Path(src))
            if v and v not in c["version"].split(", "):
                c["version"] = ", ".join(x for x in [c["version"], v] if x)
            if key == "curl":
                c["tlsBackend"] = tls_backend(Path(src))
            for t in texts:
                copy_text(c, TEXTS / t, t.split("/")[-1])
            c["files"].append(rel)
            continue
        if dist:
            d = dists[dist]
            c = comp(dist, dir="python/" + dist.lower(), kind="Python distribution", version=d.version,
                     license=dist_license(d),
                     homepage=d.metadata.get("Home-page") or next((u.split(",", 1)[1].strip() for u in d.metadata.get_all("Project-URL") or []), ""))
            if not rel.startswith("_internal/PYZ:"):
                c["files"].append(rel)
            else:
                c.setdefault("modules", 0)
                c["modules"] += 1
            continue
        if MS_RUNTIME.match(leaf):
            key = "Microsoft Universal C Runtime" if leaf.lower().startswith(("ucrtbase", "api-ms-win-")) else "Microsoft Visual C++ runtime"
            c = comp(key, dir="", kind="Microsoft redistributable", version="",
                     license="LicenseRef-Microsoft-Redistributable", homepage="")
            c["files"].append(rel)
            continue
        if n.startswith(norm(str(base))) or rel.startswith("_internal/PYZ:") or kind in ("PYMODULE", "PYSOURCE", "DATA") and "site-packages" not in n:
            c = comp("Python", dir="python-runtime", kind="Python runtime",
                     version=sys.version.split()[0], license="PSF-2.0", homepage="https://www.python.org/")
            if not rel.startswith("_internal/PYZ:"):
                c["files"].append(rel)
            if leaf.lower().endswith(".pyd"):
                py_modules.add(leaf.split(".")[0].lower())
            continue
        if kind in ("EXECUTABLE",) or leaf in ("base_library.zip",):
            continue  # the PyInstaller bootloader exe and stdlib archive: tool itself / Python
        if leaf.lower().endswith(NATIVE):
            unattributed.append(rel)

    # Texts for Python distributions.
    for name, c in components.items():
        if c.get("kind") != "Python distribution":
            continue
        d = dists[name]
        for f in d.files or []:
            s = str(f)
            if ".dist-info" in s and LICENSE_NAME.search(os.path.basename(s)):
                sub = s.split(".dist-info/", 1)[1]
                copy_text(c, Path(d.locate_file(f)), sub)
        if name.lower() in DIST_TEXTS:
            lic, home, texts = DIST_TEXTS[name.lower()]
            c["license"] = lic
            c["homepage"] = c["homepage"] or home
            for t in texts:
                copy_text(c, TEXTS / t, t.split("/")[-1])
        if not c["licenseFiles"]:
            unattributed.append(f"(no license text) Python distribution {name} {d.version}")

    # Python runtime and the libraries it bundles.
    py = components.get("Python")
    if py:
        py["version"] = sys.version.split()[0]
        lic = base / "LICENSE.txt"
        if lic.is_file():
            copy_text(py, lic, "LICENSE.txt")
        minor = "%d.%d" % sys.version_info[:2]
        rst = TEXTS / "python" / f"license-{minor}.rst"
        if not rst.is_file():
            raise SystemExit(f"missing {rst}; add Doc/license.rst of CPython {minor}")
        copy_text(py, rst, "license.rst")
        extras = {}
        if "_ssl" in py_modules or "_hashlib" in py_modules:
            import ssl
            extras["OpenSSL"] = ssl.OPENSSL_VERSION
        if "_sqlite3" in py_modules:
            import sqlite3
            extras["SQLite"] = sqlite3.sqlite_version
            copy_text(py, TEXTS / "vcpkg/sqlite3/copyright", "sqlite3-copyright")
        if "_bz2" in py_modules:
            extras["bzip2"] = "included (see LICENSE.txt)"
        if "_lzma" in py_modules:
            import lzma  # noqa: F401
            extras["XZ Utils (liblzma)"] = "statically linked into _lzma.pyd"
            copy_text(py, TEXTS / "vcpkg/liblzma/copyright", "liblzma-copyright")
        if "_ctypes" in py_modules:
            ffi = next((p for p in (args.dist / "_internal").glob("libffi*.dll")), None)
            extras["libffi"] = (file_version(ffi) or ffi.name) if ffi else "statically linked"
        if "_decimal" in py_modules:
            extras["libmpdec (mpdecimal)"] = "statically linked into _decimal.pyd"
        if "pyexpat" in py_modules:
            import pyexpat
            extras["expat"] = pyexpat.EXPAT_VERSION
        extras["zlib"] = __import__("zlib").ZLIB_RUNTIME_VERSION
        py["bundled"] = extras

    # Native libraries whose license text ships inside the wheel that bundles them.
    in_wheel = {"GEOS": ("shapely", "LICENSE_GEOS"), "PROJ": ("pyproj", "LICENSE_proj"),
                "OpenBLAS (scipy-openblas)": ("numpy", "LICENSE.txt")}
    for key, (dist_name, hint) in in_wheel.items():
        c = components.get(key)
        host = components.get(dist_name)
        if c and not c["licenseFiles"] and host:
            c["licenseFiles"] = [f for f in host["licenseFiles"] if f.endswith(hint)]
    if "GEOS" in components:
        try:
            import shapely
            components["GEOS"]["version"] = shapely.geos_version_string
        except Exception:  # noqa: BLE001 - version is informative only
            pass
    for c in components.values():
        if c.get("kind") == "native library bundled by a wheel" and not c["licenseFiles"] and not c["name"].startswith("Microsoft"):
            unattributed.append(f"(no license text) {c['name']}")

    for c in components.values():
        if c.get("kind") == "Microsoft redistributable":
            c["fileVersions"] = {f: file_version(args.dist / f) for f in c["files"]}

    if unattributed:
        raise SystemExit("cannot attribute shipped files:\n  " + "\n  ".join(unattributed))

    # Every shipped native file must exist in the onedir (sanity check).
    for c in components.values():
        for f in c["files"]:
            if not (args.dist / f).exists():
                raise SystemExit(f"{f} listed by PyInstaller but missing from {args.dist}")

    manifest = {"tool": args.name, "python": sys.version.split()[0],
                "components": sorted(components.values(), key=lambda c: c["name"].lower())}
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"{args.name}: {len(components)} components, licenses in {out}")
    for c in manifest["components"]:
        extra = f" TLS={c['tlsBackend']}" if "tlsBackend" in c else ""
        print(f"  {c['name']} {c.get('version','')} [{c.get('license','')}] files={len(c['files'])} modules={c.get('modules', 0)} texts={len(c['licenseFiles'])}{extra}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
