# Smoke test of the terrain runtime as it ships (T14.3).
#
#   powershell -File tools/terrain-runtime/smoke-terrain-runtime.ps1 -RuntimeRoot <...\resources\runtime> [-Work <dir>] [-Report <file.json>]
#
# <RuntimeRoot> is the packaged runtime folder: bin\processor.exe and terrain\.
# PATH is cut down to the Windows system folders and every GDAL/PROJ/conda/
# Python variable is removed, so a DLL or data file that only exists on the
# build machine makes the smoke fail instead of being picked up silently.
# Steps:
#   1. every terrain\bin\*.exe starts (a missing DLL shows up as 0xC0000135)
#   2. processor capabilities: terrain.ready (this also checks every file
#      hash in terrain\manifest.json and the CTB patch set)
#   3. a 64 x 64 DEM made with the shipped gdal_translate is tiled by
#      processor run (convert-terrain) and layer.json plus tiles exist
#   4. licenses: NOTICE-terrain.txt, sbom.spdx.json and one licenses\ folder
#      per component listed in the manifest

param(
  [Parameter(Mandatory = $true)][string]$RuntimeRoot,
  [string]$Work = "",
  [string]$Report = ""
)

$ErrorActionPreference = "Stop"
# The processor writes UTF-8; Windows PowerShell would decode it with the OEM code page.
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$RuntimeRoot = (Resolve-Path $RuntimeRoot).Path
$Terrain = Join-Path $RuntimeRoot "terrain"
$Processor = Join-Path $RuntimeRoot "bin\processor.exe"
if (-not $Work) { $Work = Join-Path ([IO.Path]::GetTempPath()) ("geoforge-terrain-smoke-" + [guid]::NewGuid().ToString("N")) }
New-Item -ItemType Directory -Force $Work | Out-Null
$result = [ordered]@{ runtimeRoot = $RuntimeRoot; machine = $env:COMPUTERNAME; os = (Get-CimInstance Win32_OperatingSystem).Caption; steps = [ordered]@{} }

function Fail([string]$Message) {
  $result.ok = $false
  $result.error = $Message
  if ($Report) { $result | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 $Report }
  throw $Message
}

# --- isolated environment ----------------------------------------------------
$env:PATH = "$env:SystemRoot\System32;$env:SystemRoot;$env:SystemRoot\System32\Wbem"
foreach ($name in @("GDAL_DATA", "GDAL_DRIVER_PATH", "PROJ_LIB", "PROJ_DATA", "CONDA_PREFIX", "CONDA_DEFAULT_ENV",
    "PYTHONHOME", "PYTHONPATH", "JAVA_HOME", "GEOFORGE_TERRAIN_RUNTIME", "GEOFORGE_TERRAIN_DATA")) {
  Remove-Item "Env:$name" -ErrorAction SilentlyContinue
}
$env:GEOFORGE_RUNTIME_ROOT = $RuntimeRoot
$result.path = $env:PATH

foreach ($required in @($Processor, (Join-Path $Terrain "manifest.json"), (Join-Path $Terrain "share\proj\proj.db"), (Join-Path $Terrain "share\gdal"))) {
  if (-not (Test-Path -LiteralPath $required)) { Fail "missing $required" }
}

# --- 1. every shipped executable starts --------------------------------------
$starts = @()
foreach ($exe in Get-ChildItem (Join-Path $Terrain "bin") -Filter *.exe) {
  $output = & $exe.FullName --version 2>&1 | Out-String
  $code = $LASTEXITCODE
  $starts += [ordered]@{ exe = $exe.Name; exitCode = $code; output = $output.Trim() }
  if ($code -eq -1073741515) { Fail "$($exe.Name): a DLL is missing (0xC0000135)" }
  if ($code -lt 0) { Fail "$($exe.Name) crashed on start (exit $code)" }
}
$result.steps.executables = $starts

# --- 2. processor sees a ready terrain runtime -------------------------------
$capabilities = (& $Processor capabilities --json | Out-String) | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { Fail "processor capabilities failed ($LASTEXITCODE)" }
$terrainCap = $capabilities.terrain
$result.steps.capabilities = $terrainCap
if (-not $terrainCap.ready) { Fail ("terrain runtime not ready: " + ($terrainCap | ConvertTo-Json -Compress)) }
if ($terrainCap.root -and -not ([IO.Path]::GetFullPath($terrainCap.root)).StartsWith($RuntimeRoot, [StringComparison]::OrdinalIgnoreCase)) {
  Fail "processor uses a terrain runtime outside the package: $($terrainCap.root)"
}

# --- 3. tile a small DEM -----------------------------------------------------
$src = Join-Path $Work "src"
New-Item -ItemType Directory -Force $src | Out-Null
$asc = Join-Path $src "dem.asc"
$lines = @("ncols 64", "nrows 64", "xllcorner 114.0", "yllcorner 30.4", "cellsize 0.001", "NODATA_value -9999")
for ($y = 0; $y -lt 64; $y++) {
  $row = for ($x = 0; $x -lt 64; $x++) { [math]::Round(100 + 40 * [math]::Sin($x / 9.0) + 30 * [math]::Cos($y / 7.0), 2) }
  $lines += ($row -join " ")
}
Set-Content -Encoding ASCII $asc $lines
$dem = Join-Path $src "dem.tif"
$env:GDAL_DATA = Join-Path $Terrain "share\gdal"
$env:PROJ_DATA = Join-Path $Terrain "share\proj"
& (Join-Path $Terrain "bin\gdal_translate.exe") -q -a_srs EPSG:4326 -of GTiff $asc $dem
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $dem)) { Fail "gdal_translate could not write the smoke DEM ($LASTEXITCODE)" }
Remove-Item Env:GDAL_DATA, Env:PROJ_DATA

$out = Join-Path $Work "out"
$task = Join-Path $Work "task.json"
[ordered]@{
  schemaVersion = 1
  taskId = "terrain-smoke"
  operation = "convert-terrain"
  input = @{ path = $dem }
  output = @{ path = $out }
  options = @{
    terrain = @{ version = 2; sources = @($dem); verticalDatum = @{ mode = "unknown"; acknowledged = $true }; tiling = @{ maxDepth = 12 } }
    execution = @{}
  }
} | ConvertTo-Json -Depth 6 | ForEach-Object { [IO.File]::WriteAllText($task, $_, (New-Object Text.UTF8Encoding $false)) }
$watch = [Diagnostics.Stopwatch]::StartNew()
# Native stderr must not turn into a terminating error in Windows PowerShell.
$ErrorActionPreference = "Continue"
$events = & $Processor run --task $task 2>$null
$ErrorActionPreference = "Stop"
$code = $LASTEXITCODE
$watch.Stop()
$errors = @($events | ForEach-Object { try { $_ | ConvertFrom-Json } catch { $null } } | Where-Object { $_ -and $_.type -eq "error" })
$tiles = @(Get-ChildItem -Recurse -File $out -Filter *.terrain -ErrorAction SilentlyContinue).Count
$result.steps.convert = [ordered]@{ exitCode = $code; seconds = [math]::Round($watch.Elapsed.TotalSeconds, 2); tiles = $tiles; errors = $errors }
if ($code -ne 0) { Fail ("convert-terrain failed ($code): " + ($errors | ConvertTo-Json -Compress -Depth 4)) }
if (-not (Test-Path (Join-Path $out "layer.json")) -or $tiles -eq 0) { Fail "convert-terrain wrote no layer.json or no tiles" }

# --- 4. licenses ship with the runtime ---------------------------------------
$manifest = Get-Content (Join-Path $Terrain "manifest.json") -Raw | ConvertFrom-Json
$missingLicenses = @()
foreach ($component in $manifest.components) {
  $dir = Join-Path $Terrain "licenses\$($component.name)"
  if (-not (Test-Path $dir) -or -not (Get-ChildItem -File -Recurse $dir)) { $missingLicenses += $component.name }
}
foreach ($file in @("NOTICE-terrain.txt", "sbom.spdx.json")) {
  if (-not (Test-Path (Join-Path $Terrain $file))) { $missingLicenses += $file }
}
$result.steps.licenses = [ordered]@{ components = $manifest.components.Count; missing = $missingLicenses }
if ($missingLicenses.Count -gt 0) { Fail ("license files missing: " + ($missingLicenses -join ", ")) }

$result.ok = $true
if ($Report) { $result | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 $Report }
Write-Host ("terrain smoke passed: {0} executables, {1} tiles in {2} s, {3} components with licenses" -f $starts.Count, $tiles, $result.steps.convert.seconds, $manifest.components.Count)
