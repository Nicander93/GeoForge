# Common environment for terrain P0 experiments. Dot-source: . .\env.ps1
param([string]$WorkDir = $(if ($env:TERRAIN_P0_WORK) { $env:TERRAIN_P0_WORK } else { 'D:\work\terrain-p0' }))
$global:W = $WorkDir
$global:E = Join-Path $W 'tools\env'
$env:PATH = "$E;$E\Library\bin;$E\Scripts;" + $env:PATH
$env:JAVA_HOME = "$E\Library"
$env:GDAL_DATA = "$E\Library\share\gdal"
$env:PROJ_DATA = "$E\Library\share\proj"
$env:GRADLE_USER_HOME = Join-Path $W 'tools\gradle-home'
