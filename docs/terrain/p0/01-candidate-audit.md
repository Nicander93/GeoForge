# 01 候选源码与工程审查

标记说明：**实测通过**＝在 LM（Windows）上运行验证；**源码验证**＝读过对应代码；**文档声称**＝只见于 README/MANUAL；**未验证**；**实测失败**。

## 固定版本

| 候选 | 仓库 | 固定版本 |
|---|---|---|
| A mago 3DTerrainer | Gaia3D/mago-3d-terrainer | tag `v1.14.2-release` = `d122bafcf9abca1dc4ad3cdf14dbfb8d84d44a92`（当时 main 为 4733ae8，多一个提交，未使用） |
| B CTB quantized-mesh 分支 | ahuarte47/cesium-terrain-builder `master-quantized-mesh` | `776b60308c89383462a91d152a190fcd667b74f7`（2026-08-18） |
| C terrain-codec | reearth/terrain-codec | `91aa7d2eee0defe2a51edb53d89161816cbfc537`（Rust workspace 0.6.0） |

## 候选 A：mago 3DTerrainer（Java 21）

源码路径相对 `mago-terrainer/src/main/java/com/gaia3d/`。

| 能力 | 结论 | 证据 |
|---|---|---|
| 输入格式 | GeoTIFF（GeoTools `gt-geotiff`），可重复 `-i` 或目录 | 源码验证：`terrain/tile/geotiff/GeoTiffCoverageStore.java`；实测通过（D0–D3） |
| 重投影 / CRS | 通过 GeoTools `Resample` 转到 EPSG:4326，**插值固定为最近邻**；失败时只记日志并 **返回未重投影的原始栅格继续处理** | 源码验证：`terrain/tile/geotiff/RasterStandardizer.java` 第 407–432 行 `resample()` 的 `catch` 分支 `return sourceCoverage`；**实测失败**：D1（EPSG:4547）报 `CannotReprojectException`，进程退出码 0，输出全部高程为 0 m 的瓦片（见 `results/run-A-D1.log`、`results/A-D1.json`） |
| 垂直基准 | 默认把输入当椭球高；`-g` 可加 EGM96/EGM2008/EGM84 或自定义 GeoTIFF 大地水准面 | 源码验证：`command/GlobalOptions.java` 第 167–181、427–441 行。P0 未启用任何大地水准面改正，见 03 |
| NoData | 读 GeoTIFF NoData 或 `-nv`（默认 -9999）；重投影背景值设为 NoData；**最终网格中 NoData 位置被写成 0 m** | 源码验证：`TerrainElevationData.java`、`RasterStandardizer.java`；实测：D2 孔洞内 109 个顶点全部为 0 m（`results/nodata-D2.json`） |
| 四叉树 / 层级 | 地理坐标 TMS（根层 2×1）；按深度循环，每层重新加载对应分辨率栅格 | 源码验证：`terrain/tile/generation/TerrainTilesetGenerator.java` 第 531 行起 `generateAvailableTileMeshes()` |
| LOD 简化 | 自研半边结构，按误差逐次细分三角形；`-is` 强度 | 源码验证：`terrain/structure/TerrainMesh.java`、`GeographicTerrainTile.refineMeshInitial`；实测：`-is 1/2/8` 只改变跨数据边界瓦片，内部瓦片完全相同（见 05） |
| Quantized-Mesh 编码 | 未压缩写出 `.terrain`；可选 `octvertexnormals`（默认开启，`-ncn` 关闭） | 实测通过：独立解码器解析全部瓦片无错误；首字节非 gzip |
| layer.json / available | 生成前先写 layer.json，`scheme: tms`；available 的范围 **向四周多扩一格，第 0、1 层超出地理坐标瓦片网格**（例如第 0 层 endX=2、endY=1） | 实测：每个输出有 16 个越界声明；另有约 300+ 个文件未在 available 中声明（数据外圈填充瓦片）。Cesium 加载未报错 |
| 边缘处理 | 每批瓦片范围 `expand1()` 后统一建网，相邻瓦片边线一致 | 源码验证：`TerrainTilesetGenerator.java` 第 583 行；实测相邻瓦片边线最大高差 0.02–0.03 m |
| 并发 | **单线程**：只记录 `availableProcessors`，主循环是普通 for 循环，没有线程池 | 源码验证：`command/GlobalOptions.java` 第 54 行仅用于日志；实测平均占用约 1.1 个核心（05） |
| 取消 | 无专门的取消接口；只能结束进程 | 源码验证 |
| `--continue` / `--modify` | 两者都标注 “Experimental”；代码入口为 `continueAvailableTileMeshes()`（第 413 行）和 `generateModifiedAvailableTileMeshes()`（第 281 行） | **未验证**，P0 不承诺 |
| sidecar 适配 | 纯命令行，无 HTTP 服务；标准输出为 log4j 文本日志，含 `[Tile][深度/最大深度][批次/总批次]`，可解析进度 | 实测 |

## 候选 B：CTB quantized-mesh 分支（C++ / GDAL）

| 能力 | 结论 | 证据 |
|---|---|---|
| 输入格式 | 任何 GDAL 可读栅格，包括 VRT | 源码验证：`src/GDALTiler.cpp`；实测：GeoTIFF、VRT（D3） |
| 重投影 / CRS | 每个瓦片通过 GDAL warp（`GDALCreateGenImgProjTransformer2`）直接从源 CRS 取样，默认重采样 `average` | 源码验证：`src/GDALTiler.cpp` 第 324–377 行；实测通过：D1（EPSG:4547）直接读取，高程误差与预先 warp 一致 |
| 垂直基准 | 没有任何垂直基准处理，高程原样写出 | 源码验证 |
| NoData | warp 时设源/目标 NoData（没有 NoData 时用 -32768）；Mesh 生成阶段不识别 NoData，**最终写成 0 m** | 源码验证：`src/GDALTiler.cpp` 第 334–351 行；实测：D2 孔洞内 112 个顶点均为 0 m |
| LOD 简化 | `HeightFieldChunker`（Chunked LOD），`-g` 质量系数 | 源码验证：`src/HeightFieldChunker.hpp`、`src/MeshTiler.cpp`；实测 `-g 0.5/0.25` 有效 |
| Quantized-Mesh 编码 | gzip 压缩写出；`-N` 生成法线 | 源码验证：`src/MeshTile.cpp`、`src/CTBZOutputStream.cpp`；实测：全部瓦片为 gzip，独立解码通过 |
| layer.json | 需要第二次运行 `-l`；**键名写成 `"schema"`（应为 `scheme`）**；`bounds` 只保留两位小数且为整块根瓦片范围 | 源码验证：`tools/ctb-tile.cpp` 第 460–476 行；Cesium 因默认 tms 仍可加载 |
| 根瓦片 | `-C` 补齐缺失的根瓦片 | 源码验证：`tools/ctb-tile.cpp` 第 851 行；实测有 0/0/0 与 0/1/0 |
| 并发 | `-c` 线程数，默认 CPU 数；各线程共享迭代器（互斥） | 源码验证：`tools/ctb-tile.cpp` 第 250–270、818–834 行；实测平均约 7.4 个核心忙 |
| 续跑 | `-R` 不覆盖已存在文件 | 源码验证：`src/CTBFileTileSerializer.cpp` 第 99 行；未实测 |
| 取消 | 无，只能结束进程；线程是 detach 的 | 源码验证 |
| sidecar 适配 | 纯命令行；进度用 GDAL 终端进度条 | 实测 |

## 候选 C：terrain-codec（Rust，成本探针）

- 是编解码库，不是切片器：`martini`（RTIN 网格）、`quantized-mesh`（编解码）、`terrain-codec`（组合、法线、`layer_json.rs` 辅助结构）。三个 crate 合计约 5300 行 Rust，依赖只有 `flate2`、`serde`、`serde_json`（可选 `image`）。
- 网格输入要求 `2^n+1` 的规则高程格网（如 65×65），由调用方提供。
- 若作为 GeoForge 引擎，需要自研：GDAL/PROJ 读取与重投影、NoData 策略、金字塔与每层降采样、相邻瓦片共享边线（RTIN 天然按格网对齐，较容易）、available 统计、并发调度、取消与进度、续跑。估计这部分工作量远大于编解码本身。
- 成本探针（小型金字塔编码 + 独立解码）的运行情况见 02。
