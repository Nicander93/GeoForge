# T5 benchmark on dataset M (8000x8000 crop of D4, 0.00005 deg) and D4 (24000x24000).
# Writes results-bench.jsonl in WORK_DIR. Each run starts from an empty output dir.
param([int]$Reps = 3, [switch]$SkipD4, [switch]$OnlyD4)
. "$PSScriptRoot\env.ps1"; Set-Location $W
$R = "$W\results-bench.jsonl"
function Run($eng, $in, $out, $max, $id, $tag, [string[]]$more) {
  python "$PSScriptRoot\run_engine.py" --engine $eng --input $in --out $out --max $max --dataset-id $id --tag $tag --results $R @more | Out-Null
  "$(Get-Date -Format s) done $tag $out exit=$LASTEXITCODE"
}
if (-not $OnlyD4) {
  for ($i = 1; $i -le $Reps; $i++) {
    Run A data\M.tif out\bench-A-M-$i 15 M "A-default-rep$i" @('--heap', '8g')
    Run B data\M.tif out\bench-B-M-$i 15 M "B-default-rep$i" @()
    Run B data\M.tif out\bench-Bq-M-$i 15 M "B-g0.25-rep$i" @('--qfactor', '0.25')
  }
  foreach ($c in 1, 2, 4, 8) { Run B data\M.tif out\bench-B-M-c$c 15 M "B-threads$c" @('--workers', "$c") }
  foreach ($c in 1, 4) { Run A data\M.tif out\bench-A-M-c$c 15 M "A-activeprocs$c" @('--workers', "$c") }
}
if (-not $SkipD4) {
  Run A data\D4.tif out\bench-A-D4 15 D4 "A-default-D4-single" @('--heap', '16g')
  Run B data\D4.tif out\bench-B-D4 15 D4 "B-default-D4-single" @()
}
