# V1.4 T14.3 安装包、地形运行时打包与许可证清单

## 1. 地形运行时是安装包的必需组件

- `apps/desktop/scripts/package-windows.ps1`：
  - 新参数 `-TerrainRuntime <目录>`（默认 `dist\runtime\terrain`），或 `-TerrainCondaEnv`、`-TerrainCtbSource`、`-TerrainBuildTools` 三个一起给，先调用 `tools/terrain-runtime/build-terrain-runtime.ps1` 构建。
  - 找不到 `manifest.json` 就报错退出，不会打出没有地形功能的安装包。
  - 运行时复制到 `src-tauri/resources/runtime/terrain`，处理器默认在 `<runtime>/terrain` 找它。
  - 必需文件清单加入：`manifest.json`、`sbom.spdx.json`、`NOTICE-terrain.txt`、CTB 许可证目录、`ctb-tile.exe`、`gf-dem-tool.exe`、5 个 GDAL 工具、`share/proj/proj.db`、`share/gdal`。
  - 打 NSIS 之前，对暂存的运行时跑一次烟测（见第 3 节），失败就停。
- `.github/workflows/release-windows.yml`：
  - 新步骤“Build terrain runtime”：下载固定版本并校验 SHA-256 的 micromamba 2.9.0，按 `conda-win64.lock` 建环境（构建脚本会再核对每个包的 md5），另建一个只用于构建的 cmake 4.4.4 / ninja 1.13.2 环境，克隆 CTB 到固定提交，然后构建运行时。
  - 打包时把这个运行时传给 `package-windows.ps1`。
  - 新步骤：在 runner 上静默安装 NSIS 包（`/S /D=...`），对**安装后的**目录再跑一次烟测。
  - 上传的产物里多了 `terrain-sbom.spdx.json`、`terrain-manifest.json`、两份烟测报告。
  - 发布 Release 的步骤仍然只在推送 `v*.*.*` 标签时运行；手动运行（workflow_dispatch）只产出构建产物。

## 2. 许可证与依赖清单

运行时的 `manifest.json` 记录每个文件的 SHA-256 和所属组件，`sbom.spdx.json` 是 SPDX 清单，`NOTICE-terrain.txt` 列出组件、版本、许可证和来源地址，`licenses/<组件>/` 放每个组件自带的许可证文件。这些都由构建脚本生成，CI 里随运行时一起生成。

实际分发的 34 个组件（runtime-v20）：

| 组件 | 版本 | 许可证 |
|---|---|---|
| cesium-terrain-builder（带 2 个 GeoForge 补丁） | 776b603 | Apache-2.0 |
| libgdal-core | 3.10.3 | MIT |
| proj（含 proj.db，不含转换格网） | 9.7.1 | MIT |
| geos | 3.14.1 | LGPL-2.1-only |
| libspatialite | 5.1.0 lgpl 构建 | MPL-1.1（三重许可 MPL/GPL/LGPL，按 MPL/LGPL 使用） |
| freexl | 2.0.0 | MPL-1.1 |
| libiconv | 1.18 | LGPL-2.1-only |
| libarchive | 3.8.9 lgpl 构建 | BSD-2-Clause |
| libsqlite | 3.54.0 | 公有领域（blessing） |
| openssl | 3.6.5 | Apache-2.0 |
| xerces-c、lerc | | Apache-2.0 |
| libtiff | 4.7.2 | HPND |
| libcurl | 8.22.0 | curl |
| geotiff、icu、libdeflate、libexpat、libpsl、libxml2-16 | | MIT |
| blosc、libssh2、libwebp-base、pcre2、snappy、zstd | | BSD-3-Clause |
| lz4-c | | BSD-2-Clause |
| liblzma | | 0BSD |
| libzlib、minizip | | Zlib |
| libpng | | zlib-acknowledgement |
| libjpeg-turbo | | IJG AND BSD-3-Clause AND Zlib |
| bzip2 | | bzip2-1.0.6 |
| vc14_runtime | 14.51 | 微软 VC++ 可再发行组件许可 |

没有 GPL 组件。LGPL（geos、libiconv）和 MPL（spatialite、freexl）都是独立 DLL 动态链接，许可证文本随包分发，来源地址写在 NOTICE 里，用户可以替换这些 DLL。

## 3. spatialite 的决定

- **问题**：锁定的 `libspatialite-5.1.0-gpl_*` 是 conda-forge 的 GPL 变体，它把 librttopo（GPL-2.0-or-later）静态链进了 `spatialite.dll`（DLL 里有 `gaiaGetRtTopoErrorMsg` 等 RT Topology 符号，依赖闭包里却看不到 librttopo.dll）。分发这个 DLL 等于分发 GPL 代码。
- **为什么不能直接删掉**：`gdal.dll` 的导入表里有 `spatialite.dll`，删掉后 GDAL 起不来。去掉它要自己编一个不带 SpatiaLite 的 GDAL，工作量大，也离开了 conda-forge 的固定构建。
- **决定**：换成同版本的 `lgpl_he00dcc1_19` 构建。它的依赖和原来的 `gpl_h0cd62ae_119` 完全相同，只少了 librttopo；GDAL 只用到 SQLite/SpatiaLite 驱动，地形流程（GTiff、VRT）根本不用，不受影响。
- **同类问题**：`libarchive-3.8.9-gpl_*` 链了 lzo（GPL-2.0），一并换成 `lgpl_hb42df8c_1`，lock 里去掉 lzo 和 librttopo。
- **防回退**：构建脚本现在会检查：分发的包如果是 `gpl_` 构建或许可证是 GPL 就停；`spatialite.dll` 里有 RT Topology 符号也停。
- 是否接受 MPL/LGPL 动态链接分发，是产品/法务决定；本 PR 只保证没有 GPL，许可证文本齐全。

## 4. 烟测脚本

`tools/terrain-runtime/smoke-terrain-runtime.ps1 -RuntimeRoot <...\runtime>`：

1. PATH 只留 Windows 系统目录，清掉 GDAL/PROJ/conda/Python/JAVA 相关变量，避免偷用构建机上的 DLL 或数据。
2. `terrain\bin` 里每个 exe 都要能启动（缺 DLL 时是 0xC0000135）。
3. `processor capabilities`：地形运行时 ready（处理器会核对清单里每个文件的哈希和 CTB 补丁集），而且用的是包里的运行时。
4. 用包里的 `gdal_translate` 生成 64×64 DEM，`processor run` 跑 convert-terrain，检查 `layer.json` 和瓦片。
5. 清单里每个组件都有许可证目录，NOTICE 和 SBOM 都在。

## 5. 验证环境（实话实说）

- LM：开发机，不是洁净环境（装着 conda、VS、Python）。没有 Windows 沙盒或 Hyper-V，开启需要管理员权限和重启，没有做。在 LM 上用烟测脚本（系统 PATH）测了暂存的运行时，结果见 PR。
- GitHub windows-latest runner：每次都是新的虚拟机，但预装了很多工具，**不是洁净 Windows**。安装 E2E 在这里做：静默安装、对安装目录跑烟测。PATH 被烟测脚本裁到系统目录，能证明运行时不依赖构建机上的 DLL，但不能证明不依赖 runner 上 System32 里额外装的东西（例如 VC++ 运行库，运行时本身已带 `VCRUNTIME140.dll`、`MSVCP140.dll`）。
- 真正洁净的 Windows（新装系统或沙盒）：**未验证**。第二台物理机：**未验证**。
- 桌面应用界面里的地形任务（点按钮那一套）：**未验证**，烟测只走处理器命令行。
