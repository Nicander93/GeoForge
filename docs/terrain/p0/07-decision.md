# 07 选型结论

## 事实表

标记：**实测通过** / **源码验证** / **文档声称** / **未验证** / **实测失败**。

| 能力 | A mago v1.14.2 | B CTB 776b603 | C terrain-codec 91aa7d2 |
|---|---|---|---|
| Windows x64 原生构建 | 实测通过（JDK21+Gradle，JAR 228 MB） | 实测通过（MSVC+CMake+GDAL，约 9 s） | 实测通过（cargo，探针） |
| 合法 Quantized-Mesh | 实测通过（未压缩） | 实测通过（gzip） | 实测通过（探针，未压缩） |
| Cesium 真实加载 | 实测通过 | 实测通过（需 Content-Encoding） | 未做 Cesium 预览（结构已通过） |
| EPSG:4326 高程正确 | 实测通过 | 实测通过 | 实测通过（解析曲面） |
| 投影坐标（EPSG:4547） | **实测失败**（静默出 0 m；预先 warp 后通过） | 实测通过 | 不适用（无 GDAL） |
| NoData | 实测：写成 **0 m** | 实测：写成 **0 m** | 探针在范围外写 0.0 |
| 多文件 | 实测通过（多 `-i`） | 实测通过（需 VRT） | 无 |
| 相邻边线 | 实测：最大差约 0.03 m | 实测：约 0.03 m（陡坎附近可达 0.96 m） | 探针 0.02 m |
| 并发 | 源码验证单线程；实测忙核 ≈1.1 | 实测 1–8 线程近线性 | 无调度 |
| 取消续跑 | **实测失败**：`--continue` 未补齐瓦片 | 实测通过：`-R` 与参考字节一致 | 无 |
| 打包路径 | jlink 精简 JRE 47.7 MiB + JAR + 仍需 GDAL | 小 exe + 最小 GDAL/PROJ | 需自研全链路 |
| 许可 | MPL-2.0 + 传递依赖（JAR 内 LICENSE 互相覆盖） | Apache-2.0 + GDAL 依赖 | MIT OR Apache-2.0 |
| `--modify` / 局部更新 | 文档声称 Experimental；**未验证** | 无对等能力 | 无 |

## 统一测试（摘要）

| 指标 | A | B 默认 | B `-g 0.25` |
|---|---|---|---|
| M 中位总耗时 | 106.8 s | 12.6 s | 12.8 s |
| M 峰值内存 | ≈1.1 GB | ≈5.2 GB | ≈5.2 GB |
| M 控制点 RMSE | 0.29 m | 1.06 m | 0.38 m |
| D4 总耗时 / 峰值内存 | 587 s / 1.3 GB | 156 s / **17 GB** | — |
| D4 + overview | 920 s / 1.2 GB（无收益） | **84 s / 2.5 GB** | — |
| Cesium 预览 | 通过 | 通过（gzip 头必需） | — |

详细数字见 `05-benchmark.md`、`04-format-and-preview.md`。

## 结论：**Conditional Go（有条件推荐）**

**推荐主引擎：候选 B（CTB quantized-mesh 分支，固定 commit 776b603）。第二备选：候选 A（mago），仅作对照与特殊场景后备。不在本次把 C 写成已完成的自研切片器。**

### 选择理由（证据）

1. **正确性**：B 直接读取投影坐标正确；A 必须预先 warp，否则静默失败（硬性风险）。两者合成数据水平误差均在一个像元内，边线基本贴合。
2. **可交付性**：B 在 Windows 上 MSVC 构建简单；运行时是「最小 GDAL + 小程序」。A 需要 JRE（jlink 已证 48 MB 可行）但仍绕不开 GDAL 预处理，且 shadow JAR 许可文件互相覆盖，分发前要整理。
3. **性能**：同精度下 B 明显更快；加 overview 后 D4 内存从 17 GB 降到 2.5 GB，具备产品化路径。A 单线程，大文件只能堆时间。
4. **扩展性**：两者都不是为局部高精度融合设计的；`--modify` 未验证，**不承诺**。V2 局部重切片应走「独立编码器 + 受影响瓦片重算」，C 的编解码库可作为该路径的组件，而不是 V1 的批量引擎。

### 阻断条件（不满足则不能开 V1 编码）

1. **NoData 不得写死为 0 m**（用户明确要求；见下节）。V1 必须在调用引擎前提供可配置填充值或保留空洞策略，并在成果中报告。
2. **资源服务必须正确处理 gzip `.terrain`**（加 `Content-Encoding`，或统一解压输出）。否则 B 的成果无法用现有预览通道加载。
3. **内存策略**：默认启用 overview；按可用内存限制线程数；启动前做磁盘预检。
4. **输入门禁**：投影坐标输入一律先规范化到 EPSG:4326（即便用 B，也便于统一元数据与校验）；A 若启用，warp 失败必须失败任务，禁止静默继续。
5. **许可**：列出 GDAL/PROJ/EPSG 与（若用 A）JRE、GeoTools 的 NOTICE；不直接分发未整理的 shadow JAR。

任一条件做不到，结论降为 **No-Go**，改评估 C 路线或继续排障，而不是带着已知缺陷开工。

## NoData / 空洞：业界与 V1 要求

### 业界

- **CesiumLab**（官方博客）：「对于 nodata 的处理，cesiumlab 把该位置使用高程 0 填充。」并要求用户正确指定 NoData 值。见 https://www.cnblogs.com/cesium1/p/10062892.html 。
- **Quantized-Mesh 规范**：无 NoData 字段；可选 `watermask` 只表示水体，不是空洞。
- **Cesium 社区**（2024，官方人员答复）：网格格式没有「此处无数据」标记；填最小高程会形成悬崖；裁剪平面或自行省略三角形是变通办法。https://community.cesium.com/t/quantizedmesh-nodata/29649
- **本 P0 候选 A/B**：实测均将 NoData 写成 0 m（与 CesiumLab 默认同类）。

### V1 必须做到（优先级高于「与 CesiumLab 默认一致」）

1. **可配置填充值**：用户指定常数、邻域填补或底图补齐；**默认不得是 0**（0 在海拔数百米地区会挖出假坑）。
2. **或保留为空洞**：不在 NoData 区域生成三角形 / 不输出对应瓦片，并处理边线与 `available`；验收时目视与采样证明无假悬崖。
3. **报告与校验**：记录策略与 NoData 比例；拒绝「未声明策略却出现大片 0 m」。
4. 实现位置优先在**预处理**（GDAL），不依赖切片引擎内置行为；引擎若仍写 0，则调用前必须已消掉 NoData。

完整说明见同目录讨论（本文件为准）；相关实测见 `04-format-and-preview.md` 的 NoData 节。

## 对 V1 的建议范围（不是任务列表）

- **首先支持**：GeoTIFF/BigTIFF、ASC；经 GDAL 可读的常见 DEM；多文件用 VRT。
- **CRS**：任意源 CRS，统一预处理到 EPSG:4326；垂直基准默认「按用户声明原样写出」，不自动套 EGM96；有转换格网时再开放选项。
- **体量**：本机证据支持「约 2 GiB 未压缩 + overview」在数分钟内完成；更大需再测。建议 V1 先标称「单机数十 GB 级需分块/预检」，不写死分钟数。
- **性能门禁（初值，可按真实数据调整）**：同机同数据，完整链路（含 overview）内存峰值可配置上限；线程可配；成果通过结构校验与抽样高程阈值。
- **UX**：任务前展示 CRS / NoData / 高程范围 / 建议 maxDepth；NoData 策略必选；进度复用现有总百分比。
- **不做**：完整融合、TIN 约束、土方、地形编辑器、Docker 交付。

## 对 V2 的影响

- A 的 `--modify` **未验证，不承诺**可作为局部更新基础。
- 局部高精度应保留：独立规范化高程 → 只重算受影响瓦片及祖先 → 边线接合检查。C 的 `encode_terrain` + `layer_json` 适合做「单瓦片编码器」组件。
- 非均匀最高 LOD、TIN 输入：当前 A/B 都不是现成方案，需在编码器层扩展。

## 失败样本（保留，不删除）

| 样本 | 现象 | 复现 |
|---|---|---|
| A-D1 | 投影输入静默出 0 m | `run_engine.py --engine A --input data\D1.tif --max 14`；日志 `results/run-A-D1.log`；校验 `results/A-D1.json` |
| B 无 gzip 头 | Cesium `Invalid typed array length` | `serve.py --gzip-mode none`；`results/preview/NEG-B-D0n-nogzipheader.json` |
| A `--continue` | 中断后不补齐 | `cancel_resume.py --engine A ...`；`results/cancel-A-M.json` |
| A/B NoData→0 | 孔洞顶点高度 0.00 | `nodata_probe.py`；`results/nodata-D2.json` |
