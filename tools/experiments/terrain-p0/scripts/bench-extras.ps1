# T5 extras: overviews, B memory with fewer threads on D4, cancel/resume, determinism.
. "$PSScriptRoot\env.ps1"; Set-Location $W
$R = "$W\results-bench.jsonl"
# 1) overview effect (external .ovr so the source file hash is unchanged)
foreach ($ds in 'M', 'D4') {
  $sw = [Diagnostics.Stopwatch]::StartNew(); gdaladdo -q -ro -r average --config COMPRESS_OVERVIEW DEFLATE "data\$ds.tif" 2 4 8 16 32 64
  "$(Get-Date -Format s) overview $ds seconds=$([math]::Round($sw.Elapsed.TotalSeconds,2)) ovrBytes=$((Get-Item "data\$ds.tif.ovr").Length)"
  python "$PSScriptRoot\run_engine.py" --engine B --input "data\$ds.tif" --out "out\bench-B-$ds-ovr" --max 15 --dataset-id $ds --tag "B-default-with-ovr" --results $R | Out-Null
  python "$PSScriptRoot\run_engine.py" --engine A --input "data\$ds.tif" --out "out\bench-A-$ds-ovr" --max 15 --dataset-id $ds --tag "A-default-with-ovr" --results $R @(if ($ds -eq 'D4') { '--heap'; '16g' }) | Out-Null
  Rename-Item "data\$ds.tif.ovr" "$ds.tif.ovr.off"
  "$(Get-Date -Format s) done overview runs $ds"
}
# 2) B on D4 with 8 threads (memory)
python "$PSScriptRoot\run_engine.py" --engine B --input data\D4.tif --out out\bench-B-D4-c8 --max 15 --workers 8 --dataset-id D4 --tag "B-threads8-D4" --results $R | Out-Null
"$(Get-Date -Format s) done B D4 c8"
# 3) cancel / resume
New-Item -ItemType Directory -Force val | Out-Null
python "$PSScriptRoot\cancel_resume.py" --engine B --input data\M.tif --max 15 --kill-after 6 --ref out\bench-B-M-1 --out out\cancel-B-M --json val\cancel-B-M.json | Out-Null
python "$PSScriptRoot\cancel_resume.py" --engine A --input data\M.tif --max 15 --kill-after 60 --ref out\bench-A-M-1 --out out\cancel-A-M --json val\cancel-A-M.json | Out-Null
"$(Get-Date -Format s) done cancel"
