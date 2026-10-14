# 00 基线与环境

## 仓库与分支

| 项目 | 值 |
|---|---|
| 计划中的基线 | `Nicander93/3dtiles` `master` `75069c813b9ae33b66776212fa7c0a932cefdfbd`（2026-10-09） |
| 仓库迁移 | 项目已迁移到 `Nicander93/GeoForge`，旧仓库 3dtiles 不再使用。迁移保留了完整历史，75069c8 是新仓库历史中的一个提交 |
| 执行时 HEAD | `Nicander93/GeoForge` `master` `86c8574bff1fe30e525730bb42dd0eb2f6bc7ed0`（2026-10-10，v0.1.7） |
| 研究分支 | `research/terrain-p0`，从 86c8574 创建 |
| 本地工作树 | `D:\code\GeoForge-terrain`（独立 worktree，不影响其他工作树） |

执行时没有发现已有的地形分支、地形模块或相关 Issue/PR。仓库里出现的 “terrain” 字样只在 `cesium-preview.html`、示例预览页和 e2e 查看器中，都是 Cesium 自带地形或椭球体的配置，不是地形切片功能。

## 第 1.3 节路径核对（只读）

| 路径 | 核对结果 |
|---|---|
| `crates/protocol/src/lib.rs` | `TaskConfig.operation` 为字符串；已有 `convert-osgb`、`convert-model`、`convert-ifc` 等操作和 `Stage` 枚举。P0 未修改 |
| `apps/desktop/src-tauri/src/artifact_store.rs` | 成果记录有 `kind` 字段（默认 `3dtiles`），但 `has_tileset` 只检查根目录 `tileset.json`。地形成果（`layer.json`）当前会被视为没有可预览入口 |
| `apps/desktop/src-tauri/src/resource_server.rs` | axum 本地服务，只监听 127.0.0.1，CORS 全开，支持 Range；MIME 用 `mime_guess` 推断，`.terrain` 会得到 `application/octet-stream`；**不设置 `Content-Encoding`**；`/artifacts/:id/` 默认返回 `tileset.json` |
| `apps/desktop/public/cesium-preview.html` | 只用 `Cesium3DTileset`，没有 `CesiumTerrainProvider` |
| `Nicander93/geoforge-converter` | 未改动，地形不放在这里 |

## 测试环境（Windows 实机 LM）

| 项目 | 值 |
|---|---|
| 系统 | Windows 11 专业版，内部版本 26200 |
| CPU | Intel Core i5-14600KF，20 个逻辑处理器 |
| 内存 | 31.8 GB |
| 磁盘 | ZHITAI TiPlus7100 1TB NVMe SSD；开始时 C: 剩余约 18 GB，D: 剩余约 75 GB |
| 编译器 | Visual Studio Build Tools 18（2026）MSVC，`vcvars64.bat` |
| CMake / Ninja | CMake 4.4.4（conda-forge），Ninja（conda-forge） |
| GDAL / PROJ | GDAL 3.10.3，PROJ 9.7.1（conda-forge，安装在工作目录内） |
| JDK | Azul Zulu OpenJDK 21.0.10（conda-forge `openjdk=21`） |
| Python | 3.12（同一 conda 环境，numpy 2.5、psutil） |
| Rust | rustc 1.98.1，`stable-x86_64-pc-windows-msvc` |
| CesiumJS | 1.125.0（仓库 `apps/desktop` 依赖中的构建产物） |
| 浏览器 | Playwright Chromium（仓库 e2e 已安装），SwiftShader 软件渲染 |

## 存储位置与约束

- 工作目录 `WORK_DIR = D:\work\terrain-p0`：`tools\`（micromamba、conda 环境、Gradle 缓存）、`src\`（三个候选源码）、`build\`、`install\`、`data\`（测试 DEM）、`out\`（瓦片与运行日志）、`val\`、`shots\`、`logs\`。
- 所有工具都装在工作目录内：未改动系统 PATH、全局代理、全局 Cargo 配置，未安装系统服务。C 盘只有 Gradle/Playwright 原有缓存。
- 大文件（TIFF、JAR、瓦片、日志全文）不入库；仓库只提交脚本、小型 JSON 结果、少量截图。

## 环境准备命令（摘要）

```powershell
mkdir D:\work\terrain-p0\tools; cd D:\work\terrain-p0\tools
Invoke-WebRequest https://github.com/mamba-org/micromamba-releases/releases/latest/download/micromamba-win-64 -OutFile micromamba.exe
$env:MAMBA_ROOT_PREFIX="D:\work\terrain-p0\tools\mamba"
.\micromamba.exe create -y -p D:\work\terrain-p0\tools\env -c conda-forge python=3.12 gdal=3.10 libgdal-core openjdk=21 cmake ninja numpy psutil
```

之后每个脚本通过 `tools/experiments/terrain-p0/scripts/env.ps1` 设置路径，`TERRAIN_P0_WORK` 环境变量可改工作目录。
