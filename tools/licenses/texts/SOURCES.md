# Vendored license texts

`tools/licenses/python_bundle.py` copies these files into the IFC and texture
tools when the package it ships does not carry the license text itself. Every
file is an unmodified copy of the upstream file listed below. Do not edit them;
replace them with a newer upstream copy instead.

| File | Upstream | sha256 |
|---|---|---|
| `ifcopenshell/COPYING` | https://raw.githubusercontent.com/IfcOpenShell/IfcOpenShell/ifcopenshell-python-0.9.0/COPYING | `1b3782ccad7b8614100cda30d3faf42fc39f2e97932908c543005053b654ca68` |
| `ifcopenshell/COPYING.LESSER` | https://raw.githubusercontent.com/IfcOpenShell/IfcOpenShell/ifcopenshell-python-0.9.0/COPYING.LESSER | `e3a994d82e644b03a792a930f574002658412f62407f5fee083f2555c5f23118` |
| `occt/LICENSE_LGPL_21.txt` | https://raw.githubusercontent.com/Open-Cascade-SAS/OCCT/V7_8_1/LICENSE_LGPL_21.txt | `e237fa56668030e928551ddd60f05df5fe957f75eab874bbd017e085ed722e7c` |
| `occt/OCCT_LGPL_EXCEPTION.txt` | https://raw.githubusercontent.com/Open-Cascade-SAS/OCCT/V7_8_1/OCCT_LGPL_EXCEPTION.txt | `04580a884ea6cea294402649ff7b5cbb167d47462d1340a4ed33e550db10a81b` |
| `manifold/LICENSE` | https://raw.githubusercontent.com/elalish/manifold/master/LICENSE | `c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4` |
| `python/license-3.11.rst` | https://raw.githubusercontent.com/python/cpython/v3.11.9/Doc/license.rst | `2b734ec5975b21b29ae8b9756a00fc3dfe701abe51687cec4c98a21c51005bca` |
| `python/license-3.12.rst` | https://raw.githubusercontent.com/python/cpython/v3.12.10/Doc/license.rst | `341832873fd316a37927e79385093fbbfd40a467428480835fe435a80cadf4e5` |
| `vcpkg/boost-headers/copyright` | vcpkg `share/boost-headers/copyright`, boost 1.89.0 (Boost Software License 1.0) | `c9bff75738922193e67fa726fa225535870d2aa1059f91452c411736284ad566` |
| `vcpkg/curl/copyright` | vcpkg `share/curl/copyright`, curl 8.17.0 | `a32d1b4d1dc917e33f0d2a2de3384839a5f733df135b7b7910283ff7e19f7956` |
| `vcpkg/libjpeg-turbo/copyright` | vcpkg `share/libjpeg-turbo/copyright`, libjpeg-turbo 3.1.2 | `2189dc45a8fe96204069f8124caa53a148dfdc193f50f584c6ca7849a6072872` |
| `vcpkg/liblzma/copyright` | vcpkg `share/liblzma/copyright`, xz 5.8.1 | `616a3ad264ce29b8f1cb97e53037b139d406899ca8d1f799651e17bfa09830b8` |
| `vcpkg/sqlite3/copyright` | vcpkg `share/sqlite3/copyright`, SQLite 3.51.1 | `3cafdd9b568b924b234b91f4a24649d509f02643ae727eac6a4e33818288c9c4` |
| `vcpkg/tiff/copyright` | vcpkg `share/tiff/copyright`, libtiff 4.7.1 | `0e27c2382d7b8147972bbb746e04059a1152c8d0fda9d03ef1399d1a433c4ade` |
| `vcpkg/zlib/copyright` | vcpkg `share/zlib/copyright`, zlib 1.3.1 | `845efc77857d485d91fb3e0b884aaa929368c717ae8186b66fe1ed2495753243` |

The vcpkg files come from the geoforge-converter vcpkg tree (baseline
84bab45d415d22042bd0b9081aea57f362da3f35). The versions of these libraries
inside the pyproj wheel can differ slightly; the license of each project did
not change between those versions. `manifold/LICENSE` is the standard
Apache-2.0 text, byte-identical to GeoForge's own LICENSE.
