# V1.2 T12.3：桌面地形切片页

本文说明桌面端“地形切片”页的行为、页面与 processor 之间的检查接口，以及与计划不一致、需要维护者决定的地方。

## 1. 页面流程

入口在工具页“地形”分组，路由为 `/terrain/tile`。

1. **数据**：点“添加 DEM 文件”可多选 `.tif/.tiff/.asc/.vrt`，重复文件只保留一次。每次源文件、指定坐标系、投影处理方式或“接受低精度变换”发生变化，页面都会在后台调用一次检查。检查期间页面可以继续操作，也可以点“取消检查”。列表逐个文件显示格式、数据类型、像元数与像元大小、坐标系、WGS 84 范围和 NoData 状态。某个文件检查失败时，该行直接显示错误原因和错误码，其余文件照常显示。
2. **坐标系**：可以输入 `EPSG:xxxx`，粘贴 WKT，或导入 `.prj/.wkt/.txt` 文件，点“应用”后生效。检查通过后显示生效坐标系的全称（含分带）、EPSG 编号、单位和投影方法。页面明确说明：指定坐标系只说明坐标的含义，不会改动像元坐标。只有当检查报告 `TERRAIN_TRANSFORM_LOW_ACCURACY` 时，才出现“接受精度未知的坐标变换”开关。
3. **高程**：显示源文件声明的垂直基准，没有声明时显示“未知”。用户必须在“椭球高 / 正高或正常高（已知基准）/ 不清楚”中选一项。选后两项时还必须勾选“高程按原值写入”的确认。页面不会自动套用 EGM96。
4. **NoData 空洞**：只有检查确认有空洞，或空洞数未统计时，才出现这一节。选项为“由周边高程插值”（附最大搜索半径）和“填充固定高程”，两者都附有风险说明，并注明 0 m 是合法高程。确认无空洞时不提问，任务以 `none-required` 提交。
5. **切片**：最大层级留空表示自动，占位文字显示检查给出的推荐层级。网格质量可选“均衡”或“高”。
6. **高级设置**：投影处理（自动 / 总是先重投影 / 尽量直接切片）、缺少金字塔时自动生成、顶点法线和任务名。线程与内存沿用“设置”页的资源配置，这里只显示当前值。
7. **提交**：所有未满足的条件以列表形式显示在表单内，第一条同时显示在提交栏中。条件全部满足后才能点“开始切片”。提交成功后跳转到 `/processing?task=<id>`。
8. **完成**：任务页中，成功的地形任务会列出 `layer.json` 与 `geoforge-terrain.json` 的完整路径，并提供“打开文件夹”。Cesium 预览按计划留到 V1.3。

## 2. 检查接口 `processor inspect-terrain`

```
processor inspect-terrain --path <dem> [--path <dem> …] [--crs-override <定义>] [--accept-ballpark] [--projection-mode auto|normalize|direct]
```

- 标准输出只有一个 JSON 文档（JSONL 事件被静默），版本号为 `version: 1`。检查通过时退出码为 0，否则为 1。实现见 `crates/processor/src/stages/terrain/preflight.rs`，TS 类型见 `apps/desktop/src/api/types.ts` 的 `TerrainInspectResult`。
- `sources[]`：`path, driver, dimensions, bandCount, dataType, pixelSize, crs, bounds{source, wgs84}, noData{declared, sourceHoles{state, value}}, overviews, error`。`crs` 与成果报告中 `crs` 字段的结构相同（`crs::report_json`）。`declared` 为 NaN 时写作字符串 `"nan"`。
- `sourceHoles.state` 取 `computed` 或 `not-computed`。没有声明 NoData 时记为 `computed, 0`。超过 64 Mi 像元的文件不统计（记为 `not-computed`），任务执行时仍会统计。`estimated` 已在类型中预留，目前不会出现。
- `plan`：`targetGrid, projectionMode, route, routeReason, uniform, overlaps, crs, crsLabel, wgs84Bounds, recommendedMaxDepth, pixelGroundMetres, sourceHoles, verticalName, verticalDatumStatus`。路线和推荐层级与任务使用同一套函数（`plan_sources`、`check_transform`、`choose_route`、`auto_max_depth`）。多源时按最细的源像元推荐层级。
- 每条错误都带 `code`（与任务失败时的错误码一致）、`message`（指明文件和原因）和 `path`。地形组件缺失时返回 `TERRAIN_RUNTIME_MISSING`。

桌面端通过 Tauri 命令 `inspect_terrain_inputs` 在后台线程启动该子进程。新的检查会结束仍在运行的旧检查；`cancel_terrain_inspect` 结束当前检查。

## 3. 提交时复检

`submit_task` 收到 `convert-terrain` 时，不信任表单的结论，而是调用 `preflight::check_task`，用与任务完全相同的规则再检查一遍：选项（含版本、垂直基准确认、NoData 参数范围）、每个源文件（存在、非符号链接、扩展名、不重复）以及成果目录（不与任何源目录重叠、尚不存在）。

## 4. 测试

- GUI 单元测试：`scripts/test-form-utils.mjs` 覆盖 `lib/terrainForm.ts`，包括去重、成果路径、各项阻断条件、0 m 填充、请求体构造。
- UI 测试：`tests/ui/compact-ui.spec.mjs` 新增三项，分别覆盖完整流程与请求体、取消检查与单个文件出错、任务页成果路径与打开文件夹。另外把 `/terrain/tile` 加入 1366×768 与 1024×768 的无溢出检查。
- Rust：`crates/processor/tests/inspect_terrain.rs` 用真实 runtime 和 D0/D1/D2 检查输出。缺少 runtime 的用例总会运行。

## 5. 与计划的差异，需要维护者决定

1. **指定坐标系作用于整个任务，而不是单个文件**。协议 `TerrainOptions` 只有一个 `crsOverride`，页面因此按任务级处理，并在提示中写明“应用于全部源文件”。如需逐文件指定，需要先改协议（v3）。
2. **没有 EPSG 搜索列表**。目前只能输入编号、粘贴 WKT 或导入文件，名称、分带和单位在检查后显示。离线 EPSG 搜索需要随安装包附带 PROJ 数据库的查询接口，是否值得做请决定。
3. **线程与内存不在本页单独设置**，沿用“设置”页的全局资源配置，与 IFC、模型转换页一致。
4. **取消检查只结束 processor 子进程**。如果它已经启动了 gdalinfo 或 gf-dem-tool，这些孙进程会在当前调用结束后自行退出，不会被强制结束（未测其最长耗时）。
