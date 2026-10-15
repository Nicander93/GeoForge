# Build the Windows terrain runtime (CTB + minimal GDAL/PROJ) into one folder.
#
#   powershell -File tools/terrain-runtime/build-terrain-runtime.ps1 `
#     -CondaEnv D:\work\terrain-v1\env -CtbSource D:\work\terrain-p0\src\ctb `
#     -BuildTools D:\work\terrain-p0\tools\env [-OutDir dist\runtime\terrain]
#
# -CondaEnv   environment created from conda-win64.lock (see README.md). Every
#             package in it must match the lock, otherwise the build stops.
# -CtbSource  git checkout of ahuarte47/cesium-terrain-builder at the pinned commit.
# -BuildTools any prefix providing cmake.exe and ninja.exe (build only, not shipped).
#
# Output layout:
#   bin\        ctb-tile.exe, gdal*.exe, gf-dem-tool.exe and their DLL closure
#   share\gdal  GDAL_DATA
#   share\proj  proj.db (PROJ_DATA, no transformation grids)
#   licenses\   one folder per shipped component
#   manifest.json, sbom.spdx.json, NOTICE-terrain.txt

param(
  [Parameter(Mandatory = $true)][string]$CondaEnv,
  [Parameter(Mandatory = $true)][string]$CtbSource,
  [Parameter(Mandatory = $true)][string]$BuildTools,
  [string]$OutDir = "",
  [string]$BuildDir = ""
)

$ErrorActionPreference = "Stop"
$CtbCommit = "776b60308c89383462a91d152a190fcd667b74f7"
$Here = $PSScriptRoot
$RepoRoot = Resolve-Path (Join-Path $Here "..\..")
if (-not $OutDir) { $OutDir = Join-Path $RepoRoot "dist\runtime\terrain" }
if (-not $BuildDir) { $BuildDir = Join-Path ([System.IO.Path]::GetTempPath()) "geoforge-terrain-build" }
$OutDir = [System.IO.Path]::GetFullPath($OutDir)
$BuildDir = [System.IO.Path]::GetFullPath($BuildDir)
$Library = Join-Path $CondaEnv "Library"

# Tools the processor calls. Anything else from the conda env stays out.
$GdalTools = @("gdalinfo.exe", "gdalbuildvrt.exe", "gdalwarp.exe", "gdaladdo.exe", "gdal_translate.exe")

function Get-Sha256([string]$Path) {
  (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
}

# --- 1. The conda environment must be exactly the locked one -----------------
$lockLines = Get-Content (Join-Path $Here "conda-win64.lock") | Where-Object { $_ -match '^https://' }
$locked = @{}
foreach ($line in $lockLines) {
  $url, $md5 = $line.Split('#')
  $locked[$url] = $md5
}
$packages = @()
foreach ($metaFile in Get-ChildItem (Join-Path $CondaEnv "conda-meta") -Filter *.json) {
  $meta = Get-Content $metaFile.FullName -Raw | ConvertFrom-Json
  if (-not $locked.ContainsKey($meta.url)) { throw "package not in conda-win64.lock: $($meta.url)" }
  if ($locked[$meta.url] -ne $meta.md5) { throw "md5 mismatch for $($meta.url)" }
  $packages += $meta
}
if ($packages.Count -ne $locked.Count) {
  throw "environment has $($packages.Count) packages, lock has $($locked.Count); recreate it from the lock"
}
Write-Host "conda env matches lock ($($packages.Count) packages)"

# --- 2. CTB at the pinned commit ---------------------------------------------
$head = (git -C $CtbSource rev-parse HEAD).Trim()
if ($head -ne $CtbCommit) { throw "CTB checkout is at $head, expected $CtbCommit" }
if (git -C $CtbSource status --porcelain) { throw "CTB checkout has local changes" }

$vs = & "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe" -products * -latest -property installationPath
$vcvars = Join-Path $vs "VC\Auxiliary\Build\vcvars64.bat"
$ctbBuild = Join-Path $BuildDir "ctb"
$ctbInstall = Join-Path $BuildDir "ctb-install"
$toolBuild = Join-Path $BuildDir "gf-dem-tool"
if (Test-Path $BuildDir) { Remove-Item -Recurse -Force $BuildDir }
New-Item -ItemType Directory -Force $ctbBuild, $toolBuild | Out-Null

$pathForBuild = "$BuildTools\Library\bin;$BuildTools\Scripts;$BuildTools"
$configure = "cmake -S `"$CtbSource`" -B `"$ctbBuild`" -G Ninja -DCMAKE_BUILD_TYPE=Release " +
  "-DCMAKE_POLICY_VERSION_MINIMUM=3.5 -DCMAKE_PREFIX_PATH=`"$Library`" -DCMAKE_INSTALL_PREFIX=`"$ctbInstall`""
$build = "cmake --build `"$ctbBuild`" && cmake --install `"$ctbBuild`""
$compileTool = "cl /nologo /O2 /EHsc /std:c++17 /MD `"$Here\gf-dem-tool.cpp`" /I`"$Library\include`" " +
  "/Fe`"$toolBuild\gf-dem-tool.exe`" /Fo`"$toolBuild\\`" /link `"$Library\lib\gdal.lib`""
cmd /c "set `"PATH=$pathForBuild;%PATH%`" && `"$vcvars`" >nul && $configure && $build && $compileTool"
if ($LASTEXITCODE -ne 0) { throw "native build failed ($LASTEXITCODE)" }

# --- 3. Collect executables and their DLL closure ----------------------------
if (Test-Path $OutDir) { Remove-Item -Recurse -Force $OutDir }
$bin = Join-Path $OutDir "bin"
New-Item -ItemType Directory -Force $bin | Out-Null

$roots = @(
  (Join-Path $ctbInstall "bin\ctb-tile.exe"),
  (Join-Path $toolBuild "gf-dem-tool.exe")
) + ($GdalTools | ForEach-Object { Join-Path $Library "bin\$_" })
$searchDirs = @((Join-Path $ctbInstall "bin"), (Join-Path $ctbInstall "lib"), (Join-Path $Library "bin"), $CondaEnv)
$dumpbin = (cmd /c "`"$vcvars`" >nul && where dumpbin").Split("`n")[0].Trim()

function Get-Dependents([string]$Path) {
  & $dumpbin /nologo /dependents $Path | ForEach-Object { $_.Trim() } | Where-Object { $_ -match '\.dll$' }
}

$queue = New-Object System.Collections.Queue
$roots | ForEach-Object { $queue.Enqueue($_) }
$shipped = @{}
while ($queue.Count -gt 0) {
  $file = $queue.Dequeue()
  $name = Split-Path $file -Leaf
  if ($shipped.ContainsKey($name.ToLowerInvariant())) { continue }
  $shipped[$name.ToLowerInvariant()] = $file
  foreach ($dll in Get-Dependents $file) {
    if ($dll -match '^(api-ms-win-|ext-ms-)') { continue }
    $found = $searchDirs | ForEach-Object { Join-Path $_ $dll } | Where-Object { Test-Path $_ } | Select-Object -First 1
    # Not in the build tree or the env: a Windows system DLL.
    if ($found) { $queue.Enqueue($found) }
  }
}
foreach ($file in $shipped.Values) { Copy-Item -LiteralPath $file -Destination $bin }

New-Item -ItemType Directory -Force (Join-Path $OutDir "share\proj") | Out-Null
Copy-Item -Recurse (Join-Path $Library "share\gdal") (Join-Path $OutDir "share\gdal")
Copy-Item (Join-Path $Library "share\proj\proj.db") (Join-Path $OutDir "share\proj\proj.db")

# --- 4. Licenses, manifest, SBOM ---------------------------------------------
$licenses = Join-Path $OutDir "licenses"
New-Item -ItemType Directory -Force $licenses | Out-Null
$ownerOf = @{}
foreach ($meta in $packages) {
  foreach ($f in $meta.files) { $ownerOf[$f.Replace('/', '\').ToLowerInvariant()] = $meta }
}

$fileEntries = @()
$usedPackages = @{}
foreach ($item in Get-ChildItem -Recurse -File $OutDir) {
  $rel = $item.FullName.Substring($OutDir.Length + 1)
  $source = $shipped[$item.Name.ToLowerInvariant()]
  $owner = $null
  $candidates = @()
  if ($source -and $source.StartsWith($CondaEnv, [StringComparison]::OrdinalIgnoreCase)) {
    $candidates += $source.Substring($CondaEnv.Length + 1)
  } elseif ($rel.StartsWith("share\")) {
    $candidates += "Library\" + $rel
  }
  foreach ($c in $candidates) {
    if ($ownerOf.ContainsKey($c.ToLowerInvariant())) { $owner = $ownerOf[$c.ToLowerInvariant()] }
  }
  $component = if ($owner) { $owner.name } elseif ($item.Name -match '^(ctb|ctb-tile)\.') { "cesium-terrain-builder" } elseif ($item.Name -eq "gf-dem-tool.exe") { "geoforge" } else { "unknown" }
  if ($rel.StartsWith("licenses\")) { continue }
  if ($component -eq "unknown") { throw "cannot attribute shipped file to a package: $rel" }
  if ($owner) { $usedPackages[$owner.name] = $owner }
  $fileEntries += [ordered]@{ path = $rel.Replace('\', '/'); bytes = $item.Length; sha256 = Get-Sha256 $item.FullName; component = $component }
}

foreach ($meta in $usedPackages.Values) {
  $target = Join-Path $licenses $meta.name
  New-Item -ItemType Directory -Force $target | Out-Null
  $licenseDir = Join-Path $meta.extracted_package_dir "info\licenses"
  if (Test-Path $licenseDir) {
    Copy-Item -Recurse (Join-Path $licenseDir "*") $target
  } elseif ($meta.license -eq "blessing") {
    # SQLite is public domain and ships no license file; record that instead.
    "SQLite $($meta.version) is in the public domain (https://sqlite.org/copyright.html). Source: $($meta.url)" |
      Set-Content -Encoding UTF8 (Join-Path $target "PUBLIC-DOMAIN.txt")
  } else {
    throw "no license files for $($meta.name) in $licenseDir"
  }
}
New-Item -ItemType Directory -Force (Join-Path $licenses "cesium-terrain-builder") | Out-Null
Copy-Item (Join-Path $CtbSource "LICENSE.md") (Join-Path $licenses "cesium-terrain-builder\LICENSE.md")

$components = @(
  [ordered]@{ name = "cesium-terrain-builder"; version = $CtbCommit; license = "Apache-2.0"; source = "https://github.com/ahuarte47/cesium-terrain-builder/tree/$CtbCommit" }
) + ($usedPackages.Values | Sort-Object name | ForEach-Object {
  [ordered]@{ name = $_.name; version = "$($_.version)-$($_.build)"; license = $_.license; source = $_.url; sha256 = $_.sha256 }
})

$manifest = [ordered]@{
  schemaVersion = 1
  kind = "geoforge-terrain-runtime"
  ctbCommit = $CtbCommit
  gdalVersion = ($packages | Where-Object name -eq "libgdal-core").version
  projVersion = ($packages | Where-Object name -eq "proj").version
  demToolVersion = 1
  components = $components
  files = $fileEntries | Sort-Object { $_.path }
}
$manifest | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 (Join-Path $OutDir "manifest.json")

$sbom = [ordered]@{
  spdxVersion = "SPDX-2.3"
  dataLicense = "CC0-1.0"
  SPDXID = "SPDXRef-DOCUMENT"
  name = "geoforge-terrain-runtime"
  documentNamespace = "https://github.com/Nicander93/GeoForge/terrain-runtime/$CtbCommit"
  creationInfo = [ordered]@{ created = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"); creators = @("Tool: build-terrain-runtime.ps1") }
  packages = @($components | ForEach-Object {
    [ordered]@{
      SPDXID = "SPDXRef-" + ($_.name -replace '[^A-Za-z0-9.-]', '-')
      name = $_.name
      versionInfo = $_.version
      downloadLocation = $_.source
      licenseDeclared = $_.license
      licenseConcluded = "NOASSERTION"
      copyrightText = "NOASSERTION"
    }
  })
}
$sbom | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 (Join-Path $OutDir "sbom.spdx.json")

$notice = @("GeoForge terrain runtime third-party components", "")
foreach ($c in $components) { $notice += "$($c.name) $($c.version) - $($c.license) - $($c.source)" }
$notice += ""
$notice += "Full license texts are in the licenses folder next to this file."
$notice | Set-Content -Encoding UTF8 (Join-Path $OutDir "NOTICE-terrain.txt")

# --- 5. Smoke with a bare PATH so no host GDAL can be picked up ---------------
$env:PATH = "$env:SystemRoot\System32;$env:SystemRoot"
$env:GDAL_DATA = Join-Path $OutDir "share\gdal"
$env:PROJ_DATA = Join-Path $OutDir "share\proj"
$env:GDAL_DRIVER_PATH = "disable"
& (Join-Path $bin "gdalinfo.exe") --version
if ($LASTEXITCODE -ne 0) { throw "gdalinfo smoke failed" }
& (Join-Path $bin "gf-dem-tool.exe") --version
if ($LASTEXITCODE -ne 0) { throw "gf-dem-tool smoke failed" }
& (Join-Path $bin "ctb-tile.exe") --version
if ($LASTEXITCODE -ne 0) { throw "ctb-tile smoke failed" }

$size = (Get-ChildItem -Recurse -File $OutDir | Measure-Object Length -Sum).Sum
Write-Host ("terrain runtime: {0} files, {1:N1} MiB -> {2}" -f $fileEntries.Count, ($size / 1MB), $OutDir)
