# Smoke: run candidates A and B on D0-D3 with maxDepth 14 (default engine parameters).
param([string]$Engines = 'A,B', [int]$MaxDepth = 14, [string]$Tag = 'smoke')
. "$PSScriptRoot\env.ps1"; Set-Location $W
$cases = [ordered]@{ D0 = @('data\D0.tif'); D1 = @('data\D1.tif'); D2 = @('data\D2.tif'); D3 = @('data\D3_a.tif', 'data\D3_b.tif') }
foreach ($id in $cases.Keys) {
  foreach ($eng in $Engines.Split(',')) {
    $ins = @(); foreach ($f in $cases[$id]) { $ins += '--input'; $ins += $f }
    python "$PSScriptRoot\run_engine.py" --engine $eng @ins --out "out\$eng-$id" --max $MaxDepth --dataset-id $id --tag $Tag | Out-Null
  }
}
