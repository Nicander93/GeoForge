# Preprocess: warp a projected DEM to EPSG:4326 (bilinear, keep NoData) and time it.
param([Parameter(Mandatory)][string]$In, [Parameter(Mandatory)][string]$Out, [string]$Resampling = 'bilinear')
. "$PSScriptRoot\env.ps1"
$sw = [Diagnostics.Stopwatch]::StartNew()
gdalwarp -overwrite -t_srs EPSG:4326 -r $Resampling -srcnodata -9999 -dstnodata -9999 -wm 1024 -multi -wo NUM_THREADS=ALL_CPUS `
  -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=3 -co BIGTIFF=IF_SAFER $In $Out
"warpSeconds=$([math]::Round($sw.Elapsed.TotalSeconds,3)) exit=$LASTEXITCODE"
