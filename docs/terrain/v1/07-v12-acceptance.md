# V1.2 T12.4：测试、回归、实测与阶段验收

本文汇总 V1.2（T12.0～T12.4）的测试结果、实测数据和 Gate V1.2 清单的逐项结论。凡是没有测量的内容一律写“未测”；未达标的项目不写成“已支持”。

## 1. PR 与依赖

| PR | 内容 | base |
|---|---|---|
| #11 | T12.0/T12.1：通用 CRS 解析与 auto 路线 | master（已含 #9 gzip、#10 V1.1，合并提交 adc760e） |
| #12 | CGCS2000 显式零参数地心平移 | #11 |
| #13 | T12.2：覆盖范围与 NoData 分类、多源、VRT、中文路径；auto 默认 normalize | #12 |
| #14 | T12.3：桌面地形切片页与 `inspect-terrain` | #13 |
| 本 PR | T12.4：验收测试、实测脚本、实测记录与本文 | #14 |

所有 PR 均未合并，也没有任何提交进入 master。`docs/terrain/p0/` 在整条分支链上没有改动（`git diff adc760e -- docs/terrain/p0` 为空）。

## 2. 本 PR 的改动

- **processor**：每次调用外部工具后发出 `terrain.toolSeconds` 指标（工具名、gf-dem-tool 子命令、耗时），用于分项计时。任务行为不变。
- **集成测试**：M 的取消/续跑测试新增断言：overview、取消、续跑结束后，源数据目录中每个文件的名称、大小和修改时间都与运行前一致。
- **实测脚本** `tools/terrain-bench/measure_terrain.py`：
  - 逐个用例运行 `processor run`，用 Windows 作业对象记录整棵进程树（含 gdalwarp、ctb-tile 等子进程）的峰值提交内存。
  - 输出 `docs/terrain/v1/measurements/*.json` 与 `*.md`。
  - 粗层级下塌顶点由脚本自行解码 quantized-mesh 统计。
- **真实窗口端到端脚本** `apps/desktop/scripts/terrain-desktop-e2e.py`：
  - 通过 tauri-driver 与 msedgedriver 驱动打包好的桌面程序。
  - 原生文件对话框不在 WebDriver 控制范围内，脚本用 UI Automation 找到文件名框和“打开”按钮，再发窗口消息填入路径并点击，效果等同用户操作。
- **任务页**：地形任务不再显示“查看成果”按钮。成果页只列 3D Tiles 成果，地形成果管理属于 V1.3，因此该按钮对地形任务是错误入口。任务详情中的 `layer.json` 路径和“打开文件夹”保持不变。

## 3. 自动测试（LM，Windows，带 runtime 与 P0 数据）

命令按计划 §7.4 执行。设置 `GEOFORGE_TERRAIN_RUNTIME=D:\work\terrain-v1\runtime-v12b` 与 `GEOFORGE_TERRAIN_DATA=D:\work\terrain-p0\data` 后，真实 runtime 用例全部实际运行，没有跳过。

| 层 | 命令 | 结果 |
|---|---|---|
| protocol | `cargo test -p geoforge-protocol` | 见 PR 描述 |
| processor 单测 | `cargo test -p processor --lib` | 见 PR 描述 |
| processor 集成 | `cargo test -p processor --test convert_terrain -- --test-threads=1`；`--test inspect_terrain` | 见 PR 描述 |
| 整个 workspace | `cargo test` | 见 PR 描述 |
| GUI 单测 | `npm test` | 见 PR 描述 |
| 前端构建 | `npm run build` | 见 PR 描述 |
| GUI（模拟 invoke） | `npm run test:ui` | 见 PR 描述 |
| Tauri 命令 | `npm run prepare:sidecars` 后 `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml --lib --locked` | 见 PR 描述 |
| 真实窗口 E2E | `terrain-desktop-e2e.py`（§5） | 通过，1 次 |

CI 没有地形 runtime，`convert_terrain` 与 `inspect_terrain` 中依赖 runtime 的用例在 CI 上会跳过。上表中这两项的结论来自 LM 实机运行，不是来自 CI。

计划 §7.1 的覆盖对照：

| 类型 | 覆盖用例 |
|---|---|
| protocol | `terrain.version` 1/2 兼容、`projectionMode` 三值、CRS 覆盖长度、NoData 策略与取值范围、垂直基准确认 |
| processor 单测 | CRS 报告解析、无 authority WKT、路线选择、footprint 分类、多源方案、路径策略、`check_task` 复检 |
| processor 集成 | D0、D1（direct 与 normalize 对照）、D2、D3、M 取消/续跑；CRS 矩阵（4490、CGCS2000 3°/6°、3857、UTM 50N/50S、北京54、西安80）；NAD27 缺格网反例；复合 CRS；混合 CRS；中文路径与 VRT |
| GUI 单测 | 请求体、阻断原因、多选去重、成果路径、0 m 填充 |
| GUI（模拟） | 添加 DEM → 识别 → 指定 CRS → 高程确认 → NoData → 提交 → 任务中心；取消检查；单个文件出错 |
| GUI（真实窗口） | §5 |
| 退化 | OSGB、模型、IFC、3D Tiles 合并/裁剪/压平、设置、成果页的 UI 测试与 processor 测试全部通过 |

## 4. 实测

运行方式：

```powershell
python tools/terrain-bench/measure_terrain.py --processor target/release/processor.exe `
  --runtime D:/work/terrain-v1/runtime-v12b --data D:/work/terrain-p0/data `
  --work D:/work/terrain-v1/bench --out docs/terrain/v1/measurements
```

完整记录见 `measurements/v12-measurements.md`（V1.2）与 `measurements/v11-baseline.md`（V1.1，即 adc760e，同一机器同一脚本）。两份记录包含源文件 SHA-256、CRS 与所选操作、分项耗时、内存、瓦片和误差。

数据均来自 LM（i5-14600KF / 31.8 GB / NVMe），release 构建，每个用例只跑 1 次。

### 4.1 V1.2 与 V1.1（同机、同脚本、同参数）

| 用例 | V1.1 总耗时 s | V1.2 总耗时 s | V1.1 峰值提交内存 MiB | V1.2 峰值提交内存 MiB | 瓦片 | RMSE m（两版相同） |
|---|---|---|---|---|---|---|
| D0 | 3.96 | 4.86 | 185 | 314 | 1944 | 0.291 |
| D3 | 2.54 | 3.02 | 161 | 162 | 1017 | 0.290 |
| M（high） | 20.51 | 20.93 | 1722 | 1723 | 7418 | 0.287 |
| D4（balanced，自动 overview） | 265.3 | 298.4（第一次完整运行为 270.2） | 2175 | 2174 | 64507 | 0.288 |

- 瓦片数和误差两版一致。输出大小差 1 至 3 KB，来自报告文件变长。
- V1.2 比 V1.1 慢 0.4 至 0.9 s，主要是 T12.2 新增的源 NoData 统计（`gf-dem-tool stats`）与 CRS 报告。D4 上该统计约 13 s。
- D4 的两次 V1.2 运行相差 28 s（约 10%），说明单次测量的波动不小于这个量级。因此 D4 上 V1.2 相对 V1.1 的差别（+2% 至 +12%）不能定论。未做多次重复。
- D0 峰值提交内存的增加（185 → 314 MiB）原因未查明。

### 4.2 V1.2 各用例

| 用例 | 路线 | 总耗时 s | gdalwarp s | gdaladdo s | ctb-tile s | 峰值 MiB | RMSE / P95 / 最大 m | 相邻边界差 m | 源内洞 / 范围外 / 填补 |
|---|---|---|---|---|---|---|---|---|---|
| D0 | direct（WGS 84） | 4.86 | — | — | 2.32 | 314 | 0.291 / 0.432 / 0.509 | 0.026 | 0 / 0 / 0 |
| D1 auto | normalize（auto-normalizes） | 6.95 | 0.81 | — | 2.12 | 196 | 0.116 / 0.186 / 0.230 | 0.016 | 0 / 6557 / 0 |
| D1 direct | direct（validated-projection-method） | 24.58 | — | — | 21.92 | 250 | 0.113 / 0.195 / 0.250 | 0.017 | 0 / 0 / 0 |
| D2 固定 150 m | direct | 2.17 | — | — | 0.71 | 60 | 45.788 / 149.068 / 149.068 | 0.948 | 70108 / 0 / 70108 |
| D3 两源 | direct | 3.02 | — | — | 1.21 | 162 | 0.290 / 0.436 / 0.497 | 0.025 | 0 / 0 / 0 |
| M high | direct | 20.93 | — | 2.02 | 12.74 | 1723 | 0.287 / 0.425 / 0.472 | 0.024 | 0 / 0 / 0 |
| D4 | direct | 298.40 | — | 28.11 | 220.24 | 2174 | 0.288 / 0.423 / 0.467 | 0.025 | 0 / 0 / 0 |
| M high，20 线程 | direct | 19.90 | — | 2.01 | 11.80 | 1827 | 同 M | 同 M | 同 M |
| D4，20 线程 | direct | 199.17 | — | 28.01 | 128.00 | 2205 | 同 D4 | 同 D4 | 同 D4 |

“—”表示这一步没有执行。总耗时包含重投影、overview、统计与校验在内的整条处理链。

**CRS 与 datum shift**：D1 使用 GeoForge 定义的 CGCS2000 → WGS 84 零参数地心平移（`cgcs2000-null-geocentric-translation`），标称精度 1 m，不需要格网。其余用例均为 WGS 84，不发生任何变换。

**观察与未解释项**：

1. **线程数**：默认资源下 CTB 只用 5 个线程，由 `CTB_MIB_PER_THREAD = 700` 和自动内存预算决定，V1.1 起就是这样。D4 指定 20 线程后 ctb-tile 从 220 s 降到 128 s，峰值提交内存几乎不变（2174 → 2205 MiB），说明开启 overview 后 700 MiB/线程 的估计偏保守。是否调整这个值属于产品决策，见 §8。
2. **与 P0 的差距**：P0 报告 D4 “B + overview” 为 84.1 s，而本机本次 20 线程为 199 s，其中 ctb-tile 128 s。差距原因未查明，可能来自 P0 的 overview 参数、CTB 参数或 gzip 输出差异，均未验证。V1.1 本次同样是 265 s，所以这个差距不是 V1.2 引入的。
3. **D2 误差偏大**：D2 用 150 m 常数填补 70108 个源内洞后，RMSE 45.8 m、最大误差 149 m。推测原因是填补区与有效区交界处的三角形跨越了 150 m 平台，未验证。这个结果说明常数填补会在交界处制造大误差，与页面风险提示一致。
4. **D1 两条路线**：D1 direct 耗时约为 normalize 的 3.5 倍，误差相当。这就是 auto 默认 normalize 的依据（`05-v12-nodata-footprint.md` §7）。

### 4.3 粗层级边缘下塌（V1.4 跟踪，不判通过）

统计规则：顶点位于 `dataBounds` 内，且高度比有效区最低高程低 1 m 以上。按层级统计的结果见 `measurements/v12-measurements.md`。

- D0、D3、M、D1 在粗层级（M 为第 4 至 10 层，D0 为第 5 至 13 层）都有下塌顶点，例如 D0 第 13 层 300/4587。最高几层基本为 0。
- D4 各层均为 0。
- D1 direct 在第 14、15 层有 1000 至 2883 个，其中包括投影外框内 CTB 写入的 0 m 点。`dataBounds` 是投影矩形的经纬度外接框，含有不属于源数据的角落，因此这一列对 direct 路线偏高。
- 该问题 **V1.2 未解决**，留到 V1.4 处理，V1.4 发布 Gate 保持阻断。

### 4.4 未测

- ≥10 GB 的真实 DEM。最大样本 D4 为 702 MB 压缩、2.15 GiB 未压缩。因此不做任何“支持百 GB”或耗时承诺。
- 重复多次后的中位数，本轮每个用例只跑 1 次。
- 不同纬度下 `maxDepth=auto` 的表现：样本都在北纬 30° 附近，只有单元测试覆盖了公式。
- 工作集意义上的峰值 RSS：本轮记录的是作业对象的峰值提交内存。

## 5. 真实窗口端到端（LM）

```powershell
python apps/desktop/scripts/terrain-desktop-e2e.py `
  --app apps/desktop/src-tauri/target/debug/geoforge-desktop.exe `
  --tauri-driver $env:USERPROFILE\.cargo\bin\tauri-driver.exe --edge-driver <与 WebView2 同版本的 msedgedriver.exe> `
  --processor target/release/processor.exe --runtime D:\work\terrain-v1\runtime-v12b `
  --dem D:\work\terrain-p0\data\D1.tif --work D:\work\terrain-v1\e2e\run1
```

- 环境：桌面程序由 `npm run tauri:check`（debug，无安装包）构建；WebView2 版本 155.0.4283.45；任务数据库隔离在 `--work\data`。
- 过程：
  1. 工具页 → 地形切片。
  2. 点“添加 DEM 文件”，在原生对话框中选择 D1.tif。
  3. 自动检查显示 EPSG:4547 与推荐层级。
  4. 选择“不清楚”，勾选按原值写入的确认，填写保存位置，开始切片。
  5. 任务页显示“已完成”，以及 `layer.json` 与 `geoforge-terrain.json` 的路径。
- 结果：
  - 成功，从打开页面到任务完成 43.9 s，其中约 30 s 花在脚本用 UI Automation 查找对话框。
  - 成果为 1866 个瓦片，路线 normalize（auto-normalizes），RMSE 0.116 m，与命令行运行一致。
- 截图：`img/v12-e2e-1-inspected.png`、`img/v12-e2e-2-ready.png`、`img/v12-e2e-3-task-done.png`。
- 这次运行没有覆盖：
  - 指定源 CRS：D1 自带 CRS。
  - NoData 决策：D1 没有源内洞。
  - 在真实窗口中取消检查或取消任务。
  - 点击“打开文件夹”：会弹出资源管理器，未点击。

  这几项只在模拟 invoke 的 UI 测试和 processor 集成测试中覆盖。

## 6. Gate V1.2 清单

| # | 条目 | 结论 | 依据与缺口 |
|---|---|---|---|
| 1 | 独立分支与审查 PR，依赖 #9/#10 状态明确，P0 文档未被覆盖 | ✅ 达成 | §1 |
| 2 | 标准 EPSG 与有效 WKT 通用解析，不靠白名单；无可靠操作时报错清晰 | ✅ 达成 | GDAL/PROJ 解析（`gf-dem-tool crs`）；`wkt_override_without_authority_is_accepted`、`bad_crs_definitions_fail_with_specific_codes`、NAD27 缺格网反例 |
| 3 | 代表性 CRS（4326、4490、CGCS2000 3°/6°、3857、UTM）有自动测试与真实切片；缺格网/基准问题有负面测试 | ✅ 达成（LM 实机） | `crs_matrix_tiles_with_expected_routes` 逐个实际切片；CI 上跳过 |
| 4 | D1 直读与规范化对照；auto 决策、路径与原因在报告和 UI 中可见 | ✅ 达成 | §4.2；报告 `route`，页面“处理方式”一行 |
| 5 | 重投影外框与源内 NoData 独立识别；只有真正的源内缺失才触发 NoData 决策；CTB 入口有缺失高程安全处理 | ✅ 达成 | D1：范围外 6557、源内 0，不要求决策；`projected_hole_and_frame_are_classified_apart`；D2 未选策略时拒绝 |
| 6 | 同 CRS 多文件正常；不同 CRS 多文件转换后正确镶嵌，或有清晰边界 | ✅ 达成 | D3；`mixed_crs_sources_are_warped_separately`；垂直基准不同时报 `TERRAIN_INPUT_MIXED_DATUM` |
| 7 | `maxDepth=auto` 正确处理米制投影数据 | ⚠ 部分 | D1（10 m 像元）推荐 15 层，与 WGS 84 的 D0 一致；单元测试覆盖公式。不同纬度没有实测样本 |
| 8 | 桌面完成输入、识别、源 CRS 指定、垂直基准确认、NoData、输出、提交、任务中心 | ⚠ 部分 | 全流程在模拟 invoke 的 UI 测试中通过。真实窗口只走通了“输入 → 识别 → 垂直基准 → 输出 → 提交 → 任务中心”，源 CRS 指定与 NoData 没有在真实窗口中操作（§5） |
| 9 | 取消、续跑、路径安全、Windows 中文路径；不改原始 DEM | ✅ 达成（处理器层） | M 取消/续跑与源目录不变断言、`chinese_path_and_vrt_input`、`check_task`。桌面层的任务取消没有在真实窗口中测试 |
| 10 | 旧功能自动化测试通过；真实 Windows 运行时端到端至少 1 次 | ✅ 达成 | §3、§5 |
| 11 | 源码、测试、错误示例、截图、实测表、局限性进入 `docs/terrain/v1/`；PR 描述含变更摘要与回归结果 | ✅ 达成 | 01～07 文档、`measurements/`、`img/` |

**结论**：11 项中 9 项达成、2 项部分达成（第 7、8 项）。按计划要求，V1.2 Gate **尚未完全通过**。要补齐，需要两件事：一个不同纬度的 DEM 样本实测；在真实窗口中补一次带 CRS 指定和 NoData 决策的运行，例如用去掉 CRS 的 D2 副本。

## 7. 跟踪到后续阶段

- **V1.3**：Cesium 正式预览与地形成果管理。目前成果页不列地形，任务页只给路径和“打开文件夹”。
- **V1.4**：粗层级边缘下塌（§4.3），发布 Gate 阻断。
- **性能**：≥10 GB 实测前不做规模与耗时承诺；P0 与本次 D4 的耗时差距原因待查（§4.2 第 2 条）。

## 8. 需要维护者决定

1. **指定坐标系作用范围**：目前作用于整个任务。是否要逐文件指定？需要的话要升协议 v3。
2. **EPSG 搜索**：没有离线搜索列表，目前只能输入编号或导入 WKT。是否要做？
3. **线程与内存设置**：沿用“设置”页的全局配置，本页只读显示。是否要按任务单独设置？
4. **`CTB_MIB_PER_THREAD = 700`**：开启 overview 后明显偏保守（D4 在 5 线程和 20 线程下峰值提交内存都约 2.2 GB，耗时 298 s 对 199 s）。是否按 overview 是否开启分别估算？本 PR 没有改动这个值。
