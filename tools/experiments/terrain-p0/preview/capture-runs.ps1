# Capture Cesium previews for given runs (server must be running: serve.py --port 18765).
param([string]$Runs = 'A-D0,B-D0', [string]$Port = '18765', [string]$Bbox = '113.9,30.4,114.1,30.6', [string]$Dem = 'data\D0.tif', [string]$Truth = 'geo',
      [string]$Pts = '113.95,30.45;114.0,30.5;114.05,30.55;113.92,30.58;114.08,30.42', [string]$CloseLon = '114.0', [string]$CloseLat = '30.5')
. "$PSScriptRoot\..\scripts\env.ps1"
if (-not $env:PW_NODE_MODULES) { $env:PW_NODE_MODULES = 'D:/code/GeoForge-ifc/apps/desktop/node_modules' }
New-Item -ItemType Directory -Force "$W\shots" | Out-Null
foreach ($r in $Runs.Split(',')) {
  foreach ($v in @(@('overview', '0', '2'), @('close-wire', '1', '2'))) {
    $u = "http://127.0.0.1:$Port/?run=$r&bbox=$Bbox&view=$($v[0].Split('-')[0])&wire=$($v[1])&exag=$($v[2])&contour=50&lon=$CloseLon&lat=$CloseLat&pts=$Pts"
    node "$PSScriptRoot\capture.mjs" --url $u --out "$W\shots\$r-$($v[0]).png" --json "$W\shots\$r-$($v[0]).json" | Out-Null
    "$r $($v[0]) exit=$LASTEXITCODE"
  }
  python "$PSScriptRoot\..\scripts\cesium_samples_check.py" "$W\shots\$r-overview.json" --dem "$W\$Dem" --truth $Truth > "$W\shots\$r-samples.json"
}

