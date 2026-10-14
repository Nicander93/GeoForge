# Build candidate A (mago 3DTerrainer v1.14.2-release) shadow JAR with the work-dir JDK 21.
. "$PSScriptRoot\env.ps1"
Set-Location (Join-Path $W 'src\mago-3d-terrainer')
git checkout -q v1.14.2-release
cmd /c "gradlew.bat --no-daemon :mago-terrainer:shadowJar -x test"
exit $LASTEXITCODE
