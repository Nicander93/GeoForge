# Build the self-contained Windows IFC tool (PyInstaller onedir geoforge-ifc).
# Output: tools/ifc/dist/geoforge-ifc/geoforge-ifc.exe + _internal/.
# package-windows.ps1 copies that directory to resources/runtime/ifc/.
#
# Usage: pwsh -File apps/desktop/scripts/prepare-ifc.ps1 [-PythonCommand py] [-SkipSmoke]
# PythonCommand must be Python 3.12; the build runs in tools/ifc/build/venv.
param(
  [string]$PythonCommand = "python",
  [switch]$SkipSmoke
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$IfcRoot = Join-Path $RepoRoot "tools\ifc"
$BuildRoot = Join-Path $IfcRoot "build"
$DistRoot = Join-Path $IfcRoot "dist"
$Venv = Join-Path $BuildRoot "venv"
$VenvPython = Join-Path $Venv "Scripts\python.exe"
$Exe = Join-Path $DistRoot "geoforge-ifc\geoforge-ifc.exe"

$version = & $PythonCommand -c "import sys; print('%d.%d' % sys.version_info[:2])"
if ($LASTEXITCODE -ne 0) { throw "Cannot run $PythonCommand" }
if ($version -ne "3.12") { throw "prepare-ifc.ps1 needs Python 3.12, got $version from $PythonCommand" }

if (-not (Test-Path -LiteralPath $VenvPython -PathType Leaf)) {
  & $PythonCommand -m venv $Venv
  if ($LASTEXITCODE -ne 0) { throw "venv creation failed with exit code $LASTEXITCODE" }
}
& $VenvPython -m pip install --disable-pip-version-check -r (Join-Path $IfcRoot "requirements.txt") pyinstaller==6.16.0
if ($LASTEXITCODE -ne 0) { throw "pip install failed with exit code $LASTEXITCODE" }

& $VenvPython -m PyInstaller `
  --noconfirm `
  --clean `
  --distpath $DistRoot `
  --workpath (Join-Path $BuildRoot "pyinstaller") `
  (Join-Path $IfcRoot "geoforge-ifc.spec")
if ($LASTEXITCODE -ne 0) { throw "PyInstaller failed with exit code $LASTEXITCODE" }
if (-not (Test-Path -LiteralPath $Exe -PathType Leaf)) { throw "geoforge-ifc.exe missing: $Exe" }

if (-not $SkipSmoke) {
  # Fixture -> 3D Tiles with JSON lines progress, the same way the processor runs it.
  $smoke = Join-Path ([IO.Path]::GetTempPath()) ("geoforge-ifc-smoke-" + [Guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $smoke | Out-Null
  try {
    $fixture = Join-Path $smoke "fixture.ifc"
    & $Exe fixture $fixture | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "geoforge-ifc fixture failed with exit code $LASTEXITCODE" }
    $lines = & $Exe convert $fixture (Join-Path $smoke "tiles") --exchange-dir (Join-Path $smoke "exchange") --progress jsonl
    if ($LASTEXITCODE -ne 0) { throw "geoforge-ifc convert failed with exit code $LASTEXITCODE" }
    $summary = $lines | Where-Object { $_ -like '*"event": "summary"*' } | Select-Object -Last 1
    if (-not $summary) { throw "geoforge-ifc convert printed no summary line" }
    if (-not (Test-Path -LiteralPath (Join-Path $smoke "tiles\tileset.json") -PathType Leaf)) {
      throw "geoforge-ifc convert wrote no tileset.json"
    }
    Write-Host "geoforge-ifc smoke: $summary"
  } finally {
    Remove-Item -LiteralPath $smoke -Recurse -Force -ErrorAction SilentlyContinue
  }
}
Write-Host "IFC component ready: $(Split-Path -Parent $Exe)"
