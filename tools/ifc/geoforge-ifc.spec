# PyInstaller spec for the geoforge-ifc onedir build.
#
#   python -m PyInstaller --noconfirm --clean tools/ifc/geoforge-ifc.spec \
#       --distpath tools/ifc/dist --workpath tools/ifc/build
#
# The result is dist/geoforge-ifc/geoforge-ifc(.exe) plus _internal/. The
# processor looks for it in <runtime>/ifc/. IfcOpenShell (LGPL-3.0-or-later)
# stays a separate set of files in _internal/, so it can be replaced.
#
# CGAL is GPL-3.0-or-later, so no CGAL code may ship. IfcOpenShell builds CGAL
# into its cgal and cgal-simple geometry kernels and into the svgfill plugin
# (CGAL arrangements, only used for SVG floor plans). None of them is shipped.
# The tool meshes with the OpenCASCADE kernel (exchange.py passes
# geometry_library="opencascade"), which does not load these files.
EXCLUDED_BINARIES = ("*cgal*", "ifcopenshell_geometry_svgfill*")


def is_excluded(name):
    base = os.path.basename(name).lower()
    return any(fnmatch.fnmatch(base, pattern) for pattern in EXCLUDED_BINARIES)

import fnmatch
import glob
import os

from PyInstaller.utils.hooks import collect_data_files, collect_submodules, get_package_paths

tool_dir = SPECPATH

# IfcOpenShell 0.9 loads its schema, geometry kernel and mapping plugins at
# runtime from its own package directory, so import analysis misses most of
# them. Ship every shared library of the package in place.
ifcopenshell_dir = get_package_paths("ifcopenshell")[1]
ifcopenshell_binaries = [
    (path, "ifcopenshell")
    for pattern in ("*.so", "*.so.*", "*.dll", "*.pyd", "*.dylib")
    for path in glob.glob(os.path.join(ifcopenshell_dir, pattern))
    if not is_excluded(path)
]

# cli.py imports these lazily per command; the fixture command needs the
# IfcOpenShell API modules it authors with.
hiddenimports = ["exchange", "tiles", "tiling", "fixture", "synthetic", "ifcopenshell.ifcopenshell_wrapper"]
for package in ("aggregate", "context", "geometry", "georeference", "project", "pset", "root",
                "spatial", "style", "unit"):
    hiddenimports += collect_submodules(f"ifcopenshell.api.{package}")
# Derived attributes are evaluated by generated rule modules, imported by name.
hiddenimports += collect_submodules("ifcopenshell.express.rules")

analysis = Analysis(
    [f"{tool_dir}/cli.py"],
    pathex=[tool_dir],
    binaries=ifcopenshell_binaries,
    # Schema definitions and pset templates are read from package data at runtime.
    # ifcopenshell.express regenerates express_parser.py into its package
    # directory when the file is missing, which would write into the install
    # folder at runtime. Ship the source file as data so that never happens.
    datas=collect_data_files("ifcopenshell")
    + [(os.path.join(ifcopenshell_dir, "express", "express_parser.py"), "ifcopenshell/express")],
    hiddenimports=hiddenimports,
    # shapely and lark are IfcOpenShell dependencies and must stay.
    excludes=["tkinter", "matplotlib", "IPython", "pytest", "bpy", "mathutils"],
    noarchive=False,
)
# collect_data_files and import analysis can still pick the excluded libraries
# up; drop them from every list that ends up in the onedir.
analysis.binaries = [entry for entry in analysis.binaries if not is_excluded(entry[0])]
analysis.datas = [entry for entry in analysis.datas if not is_excluded(entry[0])]
pyz = PYZ(analysis.pure)
exe = EXE(
    pyz,
    analysis.scripts,
    [],
    exclude_binaries=True,
    name="geoforge-ifc",
    console=True,
    upx=False,
)
coll = COLLECT(exe, analysis.binaries, analysis.datas, name="geoforge-ifc", upx=False)
