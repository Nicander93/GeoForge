# Build candidate B (CTB quantized-mesh fork) with MSVC + conda-forge GDAL. Usage: pwsh build-ctb.ps1
. "$PSScriptRoot\env.ps1"
$src = Join-Path $W 'src\ctb'; $bld = Join-Path $W 'build\ctb'
New-Item -ItemType Directory -Force $bld | Out-Null
$vc = & "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe" -products * -latest -property installationPath
$vcvars = Join-Path $vc 'VC\Auxiliary\Build\vcvars64.bat'
$cfg = "cmake -S `"$src`" -B `"$bld`" -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_POLICY_VERSION_MINIMUM=3.5 -DCMAKE_PREFIX_PATH=`"$E\Library`" -DCMAKE_INSTALL_PREFIX=`"$W\install\ctb`""
cmd /c "`"$vcvars`" >nul && $cfg && cmake --build `"$bld`" && cmake --install `"$bld`""
exit $LASTEXITCODE
