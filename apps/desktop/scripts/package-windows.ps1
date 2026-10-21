# Single Windows packaging entry (T09).
# Fails if any required component is missing.
# Usage: powershell -File apps/desktop/scripts/package-windows.ps1 [-SkipBuild] [-SkipTextureBundle] [-SkipIfcBundle] [-ConverterZip path]
#        [-IfcPythonCommand py] [-TexturePythonCommand py]
#        [-TerrainRuntime dir | -TerrainCondaEnv env -TerrainCtbSource ctb -TerrainBuildTools prefix]
# The terrain runtime (CTB + GDAL/PROJ, tools/terrain-runtime) is a required
# component. Either pass a runtime built by build-terrain-runtime.ps1
# (-TerrainRuntime, default dist\runtime\terrain) or the three build inputs,
# in which case it is built into dist\runtime\terrain first.
# The texture tool is built with PyInstaller. Without -TexturePythonCommand the
# IFC build venv (tools/ifc/build/venv, which has PyInstaller) is used when it
# exists, otherwise "python", which then needs PyInstaller installed.

param(
  [switch]$SkipBuild,
  [switch]$SkipTextureBundle,
  [switch]$SkipIfcBundle,
  [string]$ConverterZip = "",
  [string]$IfcPythonCommand = "python",
  [string]$TexturePythonCommand = "",
  [string]$TerrainRuntime = "",
  [string]$TerrainCondaEnv = "",
  [string]$TerrainCtbSource = "",
  [string]$TerrainBuildTools = "",
  [string]$NoticesPythonCommand = "python"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$AppDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$RuntimeDir = Join-Path $RepoRoot "dist\runtime"
$BundleDir = Join-Path $AppDir "src-tauri\resources\runtime"

Write-Host "=== GeoForge Windows package ==="

# 1) Converter Release + product runtime
$prepArgs = @("-File", (Join-Path $PSScriptRoot "prepare-runtime.ps1"), "-OutDir", $RuntimeDir)
if ($SkipBuild) { $prepArgs += "-SkipBuild" }
if ($ConverterZip) { $prepArgs += @("-ConverterZip", $ConverterZip) }
# Same PowerShell as this script, so it also runs where only 5.1 is installed.
& (Get-Process -Id $PID).Path @prepArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 2) Stage into Tauri resources. Clear the generated staging directory first
# so files from an older converter/runtime cannot survive into this package.
if (Test-Path -LiteralPath $BundleDir) {
  Remove-Item -LiteralPath $BundleDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $BundleDir | Out-Null
Copy-Item -Recurse -Force (Join-Path $RuntimeDir "*") $BundleDir

# 2b) Terrain runtime (required). The processor finds it at runtime/terrain.
$TerrainDst = Join-Path $BundleDir "terrain"
if (-not $TerrainRuntime) { $TerrainRuntime = Join-Path $RuntimeDir "terrain" }
if ($TerrainCondaEnv -or $TerrainCtbSource -or $TerrainBuildTools) {
  if (-not ($TerrainCondaEnv -and $TerrainCtbSource -and $TerrainBuildTools)) {
    Write-Error "-TerrainCondaEnv, -TerrainCtbSource and -TerrainBuildTools go together"
  }
  & (Get-Process -Id $PID).Path -NoProfile -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "tools\terrain-runtime\build-terrain-runtime.ps1") `
    -CondaEnv $TerrainCondaEnv -CtbSource $TerrainCtbSource -BuildTools $TerrainBuildTools -OutDir $TerrainRuntime
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
if (-not (Test-Path -LiteralPath (Join-Path $TerrainRuntime "manifest.json"))) {
  Write-Error "Terrain runtime missing at $TerrainRuntime. Build it with tools/terrain-runtime/build-terrain-runtime.ps1 or pass -TerrainRuntime / -TerrainCondaEnv."
}
if (Test-Path -LiteralPath $TerrainDst) { Remove-Item -LiteralPath $TerrainDst -Recurse -Force }
Copy-Item -Recurse -Force $TerrainRuntime $TerrainDst

# 3) IFC tool (PyInstaller onedir), before the texture tool so its venv can be reused. The processor looks for runtime/ifc/geoforge-ifc.exe.
$IfcSrc = Join-Path $RepoRoot "tools\ifc\dist\geoforge-ifc"
$IfcDst = Join-Path $BundleDir "ifc"
if (-not $SkipIfcBundle -and -not (Test-Path (Join-Path $IfcSrc "geoforge-ifc.exe"))) {
  & (Join-Path $PSScriptRoot "prepare-ifc.ps1") -PythonCommand $IfcPythonCommand
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
if (-not $SkipIfcBundle -and (Test-Path $IfcSrc)) {
  New-Item -ItemType Directory -Force -Path $IfcDst | Out-Null
  Copy-Item -Recurse -Force (Join-Path $IfcSrc "*") $IfcDst
}

# 3b) Texture tool (optional skip if not built yet)
$TextureSrc = Join-Path $RepoRoot "tools\texture_ktx2\dist\geoforge-texture"
$TextureDst = Join-Path $BundleDir "texture"
if (-not $SkipTextureBundle -and -not (Test-Path (Join-Path $TextureSrc "geoforge-texture.exe"))) {
  $texturePython = $TexturePythonCommand
  if (-not $texturePython) {
    $ifcVenvPython = Join-Path $RepoRoot "tools\ifc\build\venv\Scripts\python.exe"
    if (Test-Path -LiteralPath $ifcVenvPython -PathType Leaf) { $texturePython = $ifcVenvPython } else { $texturePython = "python" }
  }
  Write-Host "Texture tool PyInstaller python: $texturePython"
  & (Join-Path $PSScriptRoot "prepare-texture.ps1") -PythonCommand $texturePython
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
if (Test-Path $TextureSrc) {
  New-Item -ItemType Directory -Force -Path $TextureDst | Out-Null
  Copy-Item -Recurse -Force (Join-Path $TextureSrc "*") $TextureDst
  # Ensure MSVC CRT and zstd.dll sit beside basisu.exe (direct launch / 0xc0000135 packaging fix).
  $crtNames = @(
    "concrt140.dll",
    "msvcp140.dll",
    "msvcp140_1.dll",
    "msvcp140_2.dll",
    "msvcp140_atomic_wait.dll",
    "msvcp140_codecvt_ids.dll",
    "vccorlib140.dll",
    "vcruntime140.dll",
    "vcruntime140_1.dll",
    "vcruntime140_threads.dll",
    "zstd.dll"
  )
  $crtSrcDirs = @(
    (Join-Path $BundleDir "bin"),
    (Join-Path $BundleDir "converter")
  )
  foreach ($name in $crtNames) {
    $dest = Join-Path $TextureDst $name
    if (Test-Path -LiteralPath $dest -PathType Leaf) { continue }
    foreach ($srcDir in $crtSrcDirs) {
      $src = Join-Path $srcDir $name
      if (Test-Path -LiteralPath $src -PathType Leaf) {
        Copy-Item -LiteralPath $src -Destination $dest -Force
        break
      }
    }
  }
} elseif (-not $SkipTextureBundle) {
  Write-Warning "geoforge-texture bundle missing at $TextureSrc - packaging will fail checklist"
}

# 4) Sidecars
Push-Location $AppDir
npm run prepare:sidecars
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
npm run prepare:cesium
Pop-Location

# 4b) License notices (installed to <install>/licenses via tauri.conf.json).
$NoticesDir = Join-Path $AppDir "src-tauri\resources\notices"
$appVersion = (Get-Content -Raw (Join-Path $AppDir "src-tauri\tauri.conf.json") | ConvertFrom-Json).version
& $NoticesPythonCommand (Join-Path $RepoRoot "tools\licenses\collect_notices.py") --runtime $BundleDir --out $NoticesDir --version $appVersion --strict
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 5) Manifest checklist
$required = @(
  (Join-Path $BundleDir "converter\_3dtile.exe"),
  (Join-Path $BundleDir "converter\osgPlugins-3.6.5"),
  (Join-Path $BundleDir "converter\gdal"),
  (Join-Path $BundleDir "converter\proj"),
  (Join-Path $BundleDir "converter\msvcp140.dll"),
  (Join-Path $BundleDir "converter\msvcp140_2.dll"),
  (Join-Path $BundleDir "converter\vcruntime140.dll"),
  (Join-Path $BundleDir "converter\vcruntime140_1.dll"),
  (Join-Path $BundleDir "bin\processor.exe"),
  (Join-Path $BundleDir "bin\top_rebuild.exe"),
  (Join-Path $BundleDir "bin\msvcp140.dll"),
  (Join-Path $BundleDir "bin\msvcp140_2.dll"),
  (Join-Path $BundleDir "bin\vcruntime140.dll"),
  (Join-Path $BundleDir "bin\vcruntime140_1.dll"),
  (Join-Path $BundleDir "terrain\manifest.json"),
  (Join-Path $BundleDir "terrain\sbom.spdx.json"),
  (Join-Path $BundleDir "terrain\NOTICE-terrain.txt"),
  (Join-Path $BundleDir "terrain\licenses\cesium-terrain-builder"),
  (Join-Path $BundleDir "terrain\bin\ctb-tile.exe"),
  (Join-Path $BundleDir "terrain\bin\gf-dem-tool.exe"),
  (Join-Path $BundleDir "terrain\bin\gdalinfo.exe"),
  (Join-Path $BundleDir "terrain\bin\gdalwarp.exe"),
  (Join-Path $BundleDir "terrain\bin\gdalbuildvrt.exe"),
  (Join-Path $BundleDir "terrain\bin\gdaladdo.exe"),
  (Join-Path $BundleDir "terrain\bin\gdal_translate.exe"),
  (Join-Path $BundleDir "terrain\share\proj\proj.db"),
  (Join-Path $BundleDir "terrain\share\gdal"),
  (Join-Path $NoticesDir "LICENSE"),
  (Join-Path $NoticesDir "NOTICE"),
  (Join-Path $NoticesDir "THIRD-PARTY-NOTICES.txt"),
  (Join-Path $NoticesDir "LGPL-SOURCE-OFFER.txt")
)
$missing = @()
foreach ($r in $required) {
  if (-not (Test-Path $r)) { $missing += $r }
}
if (-not $SkipTextureBundle) {
  $tex = Get-ChildItem -Recurse $TextureDst -Filter "geoforge-texture.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $tex) { $missing += "resources/runtime/texture/geoforge-texture.exe" }
  if (-not (Test-Path (Join-Path $TextureDst "basisu.exe"))) { $missing += "resources/runtime/texture/basisu.exe" }
  if (-not (Test-Path (Join-Path $TextureDst "licenses\manifest.json"))) { $missing += "resources/runtime/texture/licenses/manifest.json" }
  foreach ($dll in @("msvcp140.dll", "msvcp140_2.dll", "vcruntime140.dll", "vcruntime140_1.dll", "zstd.dll")) {
    if (-not (Test-Path (Join-Path $TextureDst $dll))) {
      $missing += ("resources/runtime/texture/" + $dll)
    }
  }
}
if (-not $SkipIfcBundle) {
  if (-not (Test-Path (Join-Path $IfcDst "geoforge-ifc.exe"))) { $missing += "resources/runtime/ifc/geoforge-ifc.exe" }
  if (-not (Test-Path (Join-Path $IfcDst "_internal\ifcopenshell"))) { $missing += "resources/runtime/ifc/_internal/ifcopenshell" }
  if (-not (Test-Path (Join-Path $IfcDst "licenses\manifest.json"))) { $missing += "resources/runtime/ifc/licenses/manifest.json" }
  # CGAL is GPL and must never ship (geoforge-ifc.spec drops it).
  $cgal = @(Get-ChildItem -LiteralPath $IfcDst -Recurse -File | Where-Object { $_.Name -like "*cgal*" -or $_.Name -like "ifcopenshell_geometry_svgfill*" })
  if ($cgal.Count -gt 0) { $missing += ("CGAL must not ship: " + ($cgal.Name -join ", ")) }
}
if ($missing.Count -gt 0) {
  Write-Error ("Missing required package files:`n - " + ($missing -join "`n - "))
}

# 5b) Terrain smoke on the staged runtime: system-only PATH, every terrain
# executable starts, processor reports terrain ready (file hashes and CTB
# patch set checked), a small DEM is tiled, licenses are present.
& (Get-Process -Id $PID).Path -NoProfile -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "tools\terrain-runtime\smoke-terrain-runtime.ps1") `
  -RuntimeRoot $BundleDir -Report (Join-Path $RepoRoot "dist\terrain-smoke-staged.json")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 6) Tauri NSIS
Push-Location $AppDir
npm run tauri -- build --bundles nsis
$code = $LASTEXITCODE
Pop-Location
if ($code -ne 0) { exit $code }

$NsisDir = Join-Path $AppDir "src-tauri\target\release\bundle\nsis"
Write-Host "Package build finished."
if (Test-Path $NsisDir) {
  $exes = Get-ChildItem $NsisDir -Filter *.exe -File -ErrorAction SilentlyContinue
  if ($exes) {
    foreach ($exe in $exes) {
      Write-Host ("NSIS_INSTALLER=" + $exe.FullName)
      Write-Host ("NSIS_SIZE_BYTES=" + $exe.Length)
    }
  } else {
    Write-Warning "NSIS dir exists but no .exe found: $NsisDir"
  }
} else {
  Write-Warning "NSIS output dir missing: $NsisDir"
}
