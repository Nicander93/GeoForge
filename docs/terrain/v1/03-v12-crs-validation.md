# 地形 V1.2 坐标系验证（T12.1）

记录通用坐标系解析、坐标操作门禁、`auto` 路线和实测结果。所有数字都来自 2026-10-15 在 LM 上的实际运行，日志在 `D:\work\terrain-v1\logs\v12-it-all.txt`；没测的项写“未测”。

## 1. 实现

- `tools/terrain-runtime/gf-dem-crs.cpp`：`gf-dem-tool crs <定义> --bounds …`。GDAL/OSR（`OSRSetFromUserInputEx`，禁止网络和文件访问）解析定义，输出 WKT2、PROJJSON、名称、authority、类型、轴、单位；PROJ（`proj_create_operations`）列出到 EPSG:4326 的候选操作，标出精度、是否近似、所需格网，并把数据四条边各取 65 个点换算成经纬度外包框和内框。
  - 排序时假设所有格网都在，排第一的操作缺格网就不选，不回退。
  - 同时输出两条管线：`pipeline`（东/北进、经/纬出，用于采样）和 `ctPipeline`（坐标系自身轴序，交给 `gdalwarp -ct`）。第一版只给了前者，D1 的 warp 结果跑到了 (4°E, 139°N)，被校验阶段拦下（“2 declared tiles are missing”）后才改成两条。
- `gf-dem-tool sample <栅格> <点> @<管线文件>`：经纬度点先按管线反算到栅格坐标系再采样。
- `gf-dem-tool --version` 报 2；处理器要求运行时清单 `demToolVersion >= 2`。运行时仍是 138 个文件、107.9 MiB，没有新增 DLL（`gf-dem-tool.exe` 多链接了 conda 环境里已有的 `proj.lib`）。
- 处理器 `stages/terrain/crs.rs`：解析上面的输出、`check_transform` 门禁、`choose_route` 路线判断、报告字段。`inspect.rs` 里的 EPSG 特例全部删除。
- normalize 路线：`gdalwarp -ct <ctPipeline> -novshift …`。用户覆盖 CRS 时，把 GDAL 规范化后的 WKT 写进工作目录，再 `gdalbuildvrt -a_srs <文件>`。
- direct 路线：不 warp，NoData 在源格网上处理，CTB 自己重投影。层级、`layer.json` 的 `bounds`、校验内框都用 `crs` 返回的经纬度范围。
- 采样校验一律对比**源坐标系下、填补之前的原始 DEM**，所以两条路线的误差可以直接比较。direct 路线另有一道门槛：采样点不少于 100 个，且 P95 误差不超过 `1 m + 高程跨度 × 1%`（与顶点高程范围检查同一个限值），否则任务失败并提示改用 `normalize`。
- `maxDepth=auto`：源像元按“WGS 84 纬度跨度 / 行数”换算成度，再取第一个 CTB 格距（瓦片高度 / 64）不粗于它的层级。报告里写出像元的度数、约合米数和建议层级。

## 2. 坐标操作实测

`proj.db` 来自 PROJ 9.7.1，运行时不带任何格网。

| 源 CRS | 选中的操作 | 精度 | 近似 |
| --- | --- | --- | --- |
| EPSG:4326 | Null geographic offset | 0 m | 否 |
| EPSG:4490 CGCS2000 | Ballpark geographic offset | 未声明 | **是** |
| EPSG:4547 / 4549 / 4498（CGCS2000 GK） | 反算 GK + Ballpark | 未声明 | **是** |
| EPSG:3857 | 反算 Pseudo-Mercator | 未声明（纯换算） | 否 |
| EPSG:32650 / 32750（UTM） | 反算 UTM | 未声明（纯换算） | 否 |
| EPSG:2436 北京 54（CM 117E，数据在 30.5°N） | 反算 GK + Ballpark | 未声明 | **是** |
| EPSG:2383 西安 80 | 反算 GK + Ballpark | 未声明 | **是** |
| EPSG:4267 NAD27（数据在俄克拉何马） | 无：最优的 “NAD27 to WGS 84 (67)” 需要 `us_noaa_conus.tif` | — | — |

> 更新：CGCS2000 已改用显式转换，不再需要确认，见 `04-v12-cgcs2000.md`。下面是 T12.1 时的记录。

CGCS2000、北京 54、西安 80 在 `proj.db` 里都没有到 WGS 84 的正式变换，只有近似操作。按计划“近似变换默认失败”，这三类数据都必须在任务里设置 `acceptBallparkTransform=true`。CGCS2000 是国内最常见的情况，桌面端（T12.3）需要把这一步做成明确的确认，而不是藏在高级设置里。北京 54 的 “Beijing 1954 to WGS 84 (3)”（15 m）只适用于珠江口海域，数据在 30.5°N 时不会被选中。

## 3. D1 直读与规范化对照

D1：2000×2000，10 m，EPSG:4547，无 NoData，高程 100.35～692.42 m。两次运行用同一运行时、`maxDepth=15`、`meshQuality=balanced`（`-g 1`）、同一台机器；normalize 路线的 warp 外框用 400 m 常数填补（外框的正式处理在 T12.2）。误差是最高层顶点与原始 D1 双线性采样的差。

| 指标 | B1 direct | B2 normalize |
| --- | --- | --- |
| 总耗时（含 warp、校验） | 24.1 s | 6.1 s |
| 峰值内存 | 未测 | 未测 |
| 瓦片数 | 1866 | 1866 |
| 输出大小 | 625,308 B | 676,132 B |
| 采样点 | 1852 | 1121 |
| RMSE | 0.113 m | 0.117 m |
| P95 | 0.195 m | 0.186 m |
| 最大误差 | 0.250 m | 0.231 m |
| 最高层相邻瓦片最大高差 | 0.017 m | 0.019 m |
| 边缘带顶点（不做高程范围检查） | 8243 | 18334 |
| 经纬度范围 | 113.89569–114.10431°E，30.44997–30.63042°N | 113.89569–114.10435°E，30.44992–30.63042°N |

两次的耗时各跑过两遍（另一遍是 23.9 s / 6.0 s），量级一致。

结论：

- 精度上两条路线相当，direct 没有更差，高度没有归零，范围一致，所以 Transverse Mercator 进入“已验证直读”。
- direct 的耗时是 normalize 的约 4 倍。原因推测是 CTB 对每块瓦片单独做重投影，未验证。
- normalize 的采样点少、边缘带顶点多，是因为外框被 400 m 填补后，靠近数据边缘的格网被算进了边缘带。
- 目前 auto 对 Transverse Mercator 选 direct，主要好处是绕开 warp 外框（不需要 NoData 策略）。T12.2 把外框和源内 NoData 分开以后，normalize 不再有这个问题，到时要重新比较，很可能改成默认 normalize。这一点需要维护者决定。
- B3（外框单独分类）放在 T12.2 做，本表没有。

## 4. 代表坐标系矩阵

样本是把 D0（WGS 84）或 D1 的像元原样复制、只改坐标系和范围（`gdal_translate -a_srs -a_ullr`），所以没有 NoData，也不会引入重采样外框。`maxDepth=13`。

| 用例 | CRS | 路线 | reason | 耗时 | RMSE | P95 | 最大 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CGCS2000 地理 | EPSG:4490 | normalize | geographic-not-wgs84 | 4.2 s | 1.142 m | 1.664 m | 1.786 m |
| CGCS2000 3° CM 120E | EPSG:4549 | direct | validated-projection-method | 4.9 s | 0.464 m | 0.752 m | 0.807 m |
| CGCS2000 6° 第 20 带 | EPSG:4498 | direct | validated-projection-method | 4.7 s | 0.458 m | 0.747 m | 0.803 m |
| Web Mercator | EPSG:3857 | normalize | projection-method-not-validated-for-direct | 3.0 s | 0.523 m | 0.875 m | 0.923 m |
| UTM 50N | EPSG:32650 | direct | validated-projection-method | 2.8 s | 0.457 m | 0.753 m | 0.820 m |
| UTM 50S | EPSG:32750 | direct | validated-projection-method | 2.8 s | 0.453 m | 0.743 m | 0.799 m |
| 北京 54 CM 117E | EPSG:2436 | direct | validated-projection-method | 4.2 s | 0.459 m | 0.743 m | 0.801 m |
| 西安 80 CM 114E | EPSG:2383 | direct | validated-projection-method | 4.4 s | 0.456 m | 0.747 m | 0.807 m |

UTM 50S 的范围落在 30.46～30.64°S，假北距处理正确。所有用例的建议层级是 15（3857 是 16），实测用的是 13，所以误差比 D1 对照大。EPSG:4490 那一行误差偏大，是因为 normalize 做了一次双线性重采样，而样本本来就是 0.0001° 格网。

其他实机用例：

- 去掉根 `ID` 的 EPSG:4547 WKT 作为 `crsOverride`：通过，走 direct，RMSE < 5 m（测试断言）。
- `EPSG:999999`、残缺 WKT、`+proj=longlat`（没写椭球）、`+proj=pipeline …`、`EPSG:5773`（仅垂直）、把经纬度数字声明成 `EPSG:32650`：都报 `TERRAIN_CRS_INVALID`，没有输出和临时目录残留。
- NAD27：报 `TERRAIN_TRANSFORM_UNAVAILABLE`，消息里写出缺的 `us_noaa_conus.tif`。
- `EPSG:4326+5773` 复合 CRS：走 normalize（`compound-crs`），报告 `verticalName=EGM96 height`、`verticalTransformed=false`，最低高程仍在 250 m 以上，高程未被改正。
- D1 不设 `acceptBallparkTransform`：T12.1 时报 `TERRAIN_TRANSFORM_LOW_ACCURACY`；改用 CGCS2000 显式转换后可直接通过（`04-v12-cgcs2000.md`）。

## 5. 没做到的和风险

- 真实的北京 54 / 西安 80 工程数据、多分带真实 DEM 都没有，只用了换标签的样本。计划要求的“真实工程 DEM 人工验收”未做。
- 峰值内存未测。
- direct 路线里 CTB 自己选坐标操作，我们没法用 `-ct` 钉死。对上表这些只有一个候选操作的坐标系没有区别；有多个候选时以采样门槛兜底。
- 近似操作的实际偏差（例如 CGCS2000 与 WGS 84 之间）没有控制点数据可测，未验证。
- 粗层级边缘下塌没有处理，数量见报告的 `verticesEdgeBand`，仍是 V1.4 的发布阻断项。
- `spatialite.dll` 仍在构建脚本收集的依赖闭包里，这次没动。去掉它需要先查清是哪个 DLL 依赖它，可能要换不带 SpatiaLite 的 GDAL 构建，放到 V1.4 的许可证复核里做。
