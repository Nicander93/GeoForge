# 地形 V1 设计

V1 的目标是把 DEM（GeoTIFF）转成 Cesium 能直接加载的 quantized-mesh 地形，跑在本机，结果可验证、可续跑。本文写 V1.1 已经落地的部分，以及后面里程碑要遵守的约束。

## 1. 运行时

地形工具链不进主程序，作为独立运行时放在 `runtime/terrain` 下：

- `bin/ctb-tile.exe`：CTB fork，固定提交 `776b603`。
- `bin/gdal*.exe`：GDAL 3.10.3 / PROJ 9.7.1，来自 conda 环境，用 `tools/terrain-runtime/conda-win64.lock` 锁死 46 个包。
- `bin/gf-dem-tool.exe`：我们自己的小工具，做统计、NoData 填充、采样和坐标系解析（`crs`，V1.2 起），输出 JSON。版本 4 起处理器才接受（v3 加 CGCS2000 显式转换，v4 加 `footprint` 和 UTF-8 参数）。
- `manifest.json`：每个文件的 sha256，启动前校验。另带 `sbom.spdx.json`、`NOTICE-terrain.txt` 和各组件许可证。

构建脚本是 `tools/terrain-runtime/build-terrain-runtime.ps1`。它用 dumpbin 收集 DLL 依赖闭包，只拷实际用到的 DLL，最后在只含运行时 `bin` 的 PATH 下跑一遍冒烟测试，确认不依赖机器上的其他 GDAL。

当前体积 107.8 MiB / 138 个文件，其中 `icudt78.dll` 单个就有 33 MB。

子进程环境固定为：`GDAL_DATA`、`PROJ_DATA` 指向运行时，`PROJ_NETWORK=OFF`，`GDAL_DRIVER_PATH=disable`，`GDAL_PAM_ENABLED=NO`，PATH 只留运行时目录。开发时可以用 `GEOFORGE_TERRAIN_RUNTIME` 指定运行时位置。

## 2. 任务参数

任务类型 `convert-terrain`，参数定义在 `crates/protocol/src/terrain.rs`：

- `verticalDatum`：不是椭球高时必须显式确认，否则拒绝运行。V1 不做高程基准转换。
- `noData`：
  - `unresolved`（默认）：源数据里有 NoData 就报错，让用户选。
  - `none-required`：用户声明没有 NoData，运行时仍会检查。
  - `explicit-constant { valueMeters }`：填常数，范围 -12000..9000 m。
  - `interpolate { maxSearchPixels }`：用 GDAL FillNodata 插值，搜索半径 1..1000 像素。填完还有空洞就失败。
- `preprocess.projectionMode`：`auto`、`normalize` 或 `direct`。version 1 任务默认 `normalize`，version 2 默认 `auto`；auto 现在等同 normalize，`direct` 让 CTB 直读已验证的投影。规则见 `02-v12-input-crs-contract.md`。
- `crsOverride`：EPSG 编号、WKT、PROJJSON 或带椭球的 PROJ 串，由 GDAL/PROJ 判断是否有效；只重新解释坐标，不做变换。
- `preprocess.acceptBallparkTransform`：到 WGS 84 只有近似操作（北京 54、西安 80 等）时必须为 true。CGCS2000 用显式转换，不需要，见 `04-v12-cgcs2000.md`。
- `tiling.maxDepth`：`auto` 或 0..22。
- `mesh.quality`：对应 CTB 的 `-g`。`balanced`=1.0，`high`=0.25，`fast`=4.0（`fast` 的效果未验证）。

原则是不替用户做会改变高程的决定：NoData 绝不悄悄变成 0 m。

## 3. 流程

1. **检查源**：对每个文件跑 `gdalinfo -json` 和 `gf-dem-tool crs`，检查驱动、波段数、旋转、CRS 和到 WGS 84 的坐标操作，再决定走 direct 还是 normalize。多源的 CRS、像素大小或 NoData 不一致时按异构源处理（逐个 warp 后叠加，见 `05-v12-nodata-footprint.md`），高程基准不同则报错；有重叠时后面的源覆盖前面的，并写进报告。
2. **准备**：多源先拼 VRT；normalize 路线用 `gdalwarp -ct <选中的操作> -novshift` warp 到 EPSG:4326（`dstnodata=-32768`）；用覆盖栅格把 NoData 分成源内空洞和范围外；源内空洞按策略填充，范围外填辅助值；最后在工作目录里建金字塔（VRT + `gdaladdo -ro`），不改源文件。
3. **切片**：调用 CTB 生成网格，再跑一次 `-l` 生成元数据。
4. **整理**：改写 layer.json（`schema`→`scheme`，`bounds` 用真实范围），核对 `available` 和磁盘上的瓦片一一对应。
5. **校验**：解码每个瓦片（gzip + quantized-mesh 1.0），统计数据范围内外的顶点、高程范围、最大层级相邻瓦片的接缝，再抽样和源 DEM 对比。
6. **提交**：写 `geoforge-terrain.json` 报告，把结果目录换到输出位置。

## 4. 续跑

参数和源文件信息算一份指纹（JSON）。工作目录保留时，只有指纹完全相同才给 CTB 加 `-R` 续跑，任何参数变化都从头开始。

## 5. 校验口径

CTB 每块瓦片按 65×65 的高程格网采样（P0 输出里顶点 u 坐标步长 512，即 64 格）。粗层级上靠近数据边界的格点会混入外面的 0 m，所以“数据范围内不能有 0 m 顶点”这条检查从边界往里退两个格距才开始；边界带里的情况单独计数，写进报告。

这意味着粗层级远看时，数据边缘会有往 0 m 下垂的一圈。这是 CTB 的行为，V1.1 只做到如实报告。

`maxDepth=auto` 取第一个格距不粗于源像素的层级：`ceil(log2(180 / (64 × 像素度数)))`，像素度数按数据的 WGS 84 纬度跨度 / 行数计算，投影数据的米不会被当成度。1 角秒的数据得到 14 级，D1（10 m）得到 15 级。

## 6. 已知限制与待定

- **投影数据的外框**：V1.2 计划已定：外框按“源覆盖范围之外”处理（T12.2 实现）。T12.1 起 Transverse Mercator 投影在 auto 下由 CTB 直读，不产生外框；T12.2 起 normalize 的外框也不再需要 NoData 策略，见 `05-v12-nodata-footprint.md`。
- **许可证**：conda 环境里有 GPL 的 librttopo、lzo，以及 MPL 的 libspatialite。按依赖闭包，运行时没有带 librttopo、lzo 的 DLL，带了 `spatialite.dll`（MPL）和 `geos.dll`、`geos_c.dll`（LGPL）。需要确认能否接受 MPL 和 LGPL 动态链接分发。
- **体积**：107.8 MiB，ICU 数据占大头，后面看能否裁掉。
- **平台**：运行时目前只有 Windows，代码里可执行文件名带 `.exe`。
