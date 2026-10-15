# V1.2 源覆盖范围、NoData 分类与异构输入（T12.2）

状态：已实现（运行时 gf-dem-tool 4）。依赖 `04-v12-cgcs2000.md`。

## 1. 要解决的问题

投影坐标系的 DEM 规范化到 EPSG:4326 时，结果是一个经纬度矩形，源数据的四边形落在里面，四周多出一圈“重投影外框”。T12.1 把外框和源数据自身的 NoData 混在一起：D1 本身没有 NoData，normalize 却要求用户选 NoData 填补方式。按计划已定的规则：

- 外框算“源覆盖范围外”，不是源 NoData，不需要用户决定；
- 但 CTB 构网仍然需要那里有值：不能是 0，也不能忽略。

## 2. 做法

normalize 路线（含异构源）：

1. 用选中的操作（`-ct`）把 DEM warp 到 EPSG:4326（双线性）。
2. 用同一个 `-ct`、同一个 `-te`/`-ts` 再 warp 一份覆盖栅格：`-srcnodata None -dstalpha -r near -ot Byte`，只看 alpha 波段，表示“这个像元有没有落在源栅格范围内”。
3. `gf-dem-tool footprint <warped> <coverage> count` 分类：
   - 有效：有高程值；
   - 源内空洞：NoData 且 alpha>0，即源数据自己的 NoData；
   - 范围外：NoData 且 alpha=0，即外框或多源之间的空隙。
4. 只按“源内空洞”数量走原来的 NoData 决策（`nodata::decide`）：没有空洞就不需要策略；有空洞仍然必须选常数或插值，绝不悄悄变 0。
5. `gf-dem-tool footprint … <out.tif> none|constant <m>|interpolate <px>` 写出切片输入：空洞按用户策略填；范围外的像元从有效高程向外做反距离外推（GDALFillNodata，不限距离），作为辅助值。
6. 切片输入再统计一次，NoData 必须为 0，否则失败。

direct 路线与 WGS 84 源不重投影，没有外框，行为不变。

辅助值只为让 CTB 有东西构网，不是真实地形：报告写 `auxiliaryMethod: "idw-extension"` 和说明；严格高程校验的“内框”取坐标系换算出的数据内框（两条路线一致），不包含外框。

## 3. 异构源

多个源的坐标系、像元大小或 NoData 值不同时，T12.1 直接报错；现在：

- `plan_sources` 返回 `uniform=false`，路线固定为 normalize，原因 `heterogeneous-sources`；
- 每个源用自己的 `ctPipeline` 和 NoData 单独 warp，统一用最细源像元的纬度步长（`-tr` + `-tap`）对齐格网，各自生成覆盖栅格；
- 用 `gdalbuildvrt` 叠成 DEM 和覆盖两个 VRT，重叠处列表中靠后的源优先（与同质多源一致）；
- 每个源都单独做转换检查；高程基准名不同（例如一个复合 CRS 带 EGM96、一个不带）报 `TERRAIN_INPUT_MIXED_DATUM`，因为 V1 不做高程基准转换；
- 重叠判断改用各源的 WGS 84 范围；
- 采样对照只用第一个源（已知限制）。

另外支持 VRT 作为输入（驱动 `VRT`，扩展名 `.vrt`）。

## 4. 中文与空格路径

实测发现两处问题并已修复：

- gf-dem-tool 在 Windows 上收到的 argv 是 ANSI 代码页，GDAL 需要 UTF-8：改为用 `GetCommandLineW` 取参数转成 UTF-8，读文件也走 UTF-16 路径（`gf-dem-path.h`）。
- ctb-tile 同样按 ANSI 读参数，且我们不改 CTB：处理器让它在 `staged` 目录里运行，输出写 `.`，输入用 `..\work\…` 相对路径（文件名都是 ASCII）；用户自己的文件先包一层 VRT 放进 work。

## 5. 实测（LM，Windows，运行时 runtime-v12b，2026-10-15）

D1（EPSG:4547，无 NoData），`maxDepth=15`，都不设 NoData 策略、不设接受近似变换：

| 指标 | direct | normalize（T12.2） | normalize（T12.1，400 m 常数填外框） |
| --- | --- | --- | --- |
| 耗时 | 24.2 s | 5.8 s | 6.1 s |
| 瓦片 | 1866 | 1866 | 1866 |
| 输出字节 | 626,119 | 632,973 | 676,132 |
| 采样点 | 1852 | 1744 | 1121 |
| RMSE | 0.113 m | 0.116 m | 0.117 m |
| P95 | 0.195 m | 0.186 m | 0.186 m |
| 最大误差 | 0.250 m | 0.230 m | 0.231 m |
| 边缘带顶点 | 8243 | 7579 | 18334 |
| 声明范围 | 数据范围 | 与 direct 相同 | 外框矩形 |

- normalize 报告：`sourceHoleCount=0`，`outsideFootprintCount=6557`（占切片输入 0.17%），全部为辅助值，`remainingNoDataCount=0`，高程最小 100.35 m，没有像元变成 0 m。
- T12.1 列是当时的记录（PR #11），不是这次重跑。normalize 现在声明真实数据范围、采样内框与 direct 一致，所以采样点更多、边缘带顶点更少。
- 耗时是单次运行；峰值内存未测。

其他实机用例（`tests/convert_terrain.rs`）：

- D2 换标签成 EPSG:4547 后 normalize：不设策略时报 `TERRAIN_NODATA_POLICY_REQUIRED`，消息只谈源数据范围内的空洞；用 150 m 常数后 `sourceHoleCount=69132`（全部按常数填）、`outsideFootprintCount=663`（全部辅助值）。源文件 NoData 是 70,108 个，重采样到新格网后数量不同，属正常。
- 混合坐标系：D0 西半部（EPSG:4326）+ D0 东部 warp 成 UTM 50N（45 m）：走 `heterogeneous-sources`，通过，RMSE < 5 m。
- 中文加空格路径：GeoTIFF 与 VRT 输入都通过。
- 北京 54 / 西安 80、CRS 测试集、取消续跑等原有用例全部通过。

## 6. 没做到的和风险

- 辅助值的形状会影响数据边缘一两个格距内的网格，边缘下塌仍按计划只跟踪不修复，是 V1.4 的发布阻断项。
- 异构源只对照第一个源采样；其余源的精度靠各自的转换检查，没有逐源采样，未验证。
- 多源之间的空隙也会被填辅助值；如果空隙很大，瓦片里会有一片外推出来的假地形。报告有计数，但没有单独警告。
- 真实工程数据（多源、不同分带）没有测。

## 7. 决定：auto 默认 normalize

维护者根据 §5 的 D1 数据决定：`projectionMode=auto` 对所有非 WGS 84 经纬度的输入走 normalize（报告原因 `auto-normalizes`），`direct` 保留为显式选项。

依据（D1，同一台机器，单次运行）：

- normalize 5.8 s，direct 24.2 s；
- RMSE 0.116 m 对 0.113 m，P95 0.186 m 对 0.195 m，最大误差 0.230 m 对 0.250 m，差别在 1 cm 量级；
- normalize 的边缘带顶点更少（7579 对 8243），输出大 1.1%（632,973 B 对 626,119 B）；
- T12.2 以后 normalize 的外框不需要用户选 NoData 策略，direct 原来的主要好处没有了；
- normalize 用 `-ct` 钉死选中的坐标操作，direct 由 CTB 自己选操作，只能靠采样门槛兜底。

只有一份 D1 样本；其他投影、其他地区的耗时对比未测。
