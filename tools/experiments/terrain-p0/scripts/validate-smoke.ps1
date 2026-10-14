# Validate all smoke outputs with qm_validate.py; writes val\<engine>-<dataset>.json
. "$PSScriptRoot\env.ps1"; Set-Location $W; New-Item -ItemType Directory -Force val | Out-Null
$cases = @{ D0 = @(@('data\D0.tif'), 'geo'); D1 = @(@('data\D1.tif'), 'proj'); D2 = @(@('data\D2.tif'), 'd2'); D3 = @(@('data\D3_a.tif', 'data\D3_b.tif'), 'geo') }
foreach ($id in 'D0','D1','D2','D3') { foreach ($eng in 'A','B') {
  $dems = @(); foreach ($f in $cases[$id][0]) { $dems += '--dem'; $dems += $f }
  if (Test-Path "out\$eng-$id\layer.json") { python "$PSScriptRoot\qm_validate.py" --tiles "out\$eng-$id" @dems --truth $cases[$id][1] --json "val\$eng-$id.json" | Out-Null }
} }
