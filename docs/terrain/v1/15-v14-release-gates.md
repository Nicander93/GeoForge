# 地形 V1.4 T14.4：全量验收与发布 Gate（G1～G9）

> 基线：`master@9f44b1a`（#19、#20、#21 已合并）。分支 `feat/terrain-v14-acceptance`。
> 本文只汇总证据，给出判定建议。**不是 Release Ready 声明。** 发布、打 Tag、建 Release 都由维护者决定，本 PR 一样都不做。

## 0. 结论

**判定建议：No-Go（证据不足，暂不能发布）。**

这次验收没有发现新的正确性缺陷：G1、G2、G4、G6 判 PASS。但 G3、G5、G7、G8、G9 都有 NOT TESTED 的项。按计划，G1～G8 中任何一项不是 PASS，都不能判 Go，也不能判 Conditional Go。补齐 §4 列出的证据后才能重新判定。

最主要的缺口：

1. 没有在洁净 Windows 上安装、切片、离线预览过（G5、Q15）。目前只在 GitHub 的 Windows Server 2025 runner 上做过静默安装和烟测，那台机器装有大量开发工具，不算洁净环境。
2. 打包后的桌面程序在 V1.4 没有做真实窗口 E2E（G8）。
3. 系统盘写满时能否受控失败没有实测（G3）。
4. 换引擎补丁后断点续跑会被拒绝，这一点只有单元测试，没有实测（G7）。
5. 没有 ≥10 GB 的真实数据（G9）。

## 1. 测试环境

| 项 | 值 |
|---|---|
| 机器 | LM：Windows 11，i5-14600KF，20 逻辑核，32 GiB 内存；**开发机，不是洁净环境** |
| 处理器 | `master@9f44b1a` 用 release 构建（用 3c4f0c0 构建；两者的代码树相同，`git diff` 为空） |
| 地形运行时 | `D:\work\terrain-v1\runtime-v22`：用 LGPL conda 环境按 `build-terrain-runtime.ps1` 重新构建；CTB 776b603 打两个补丁，补丁集 `fae133b79d33c5d14b7ec97ab0173952b91fdc0b734f2f0bb852404f71521a7f`，gf-dem-tool 7，GDAL 3.10.3，PROJ 9.7.1 |
| 数据 | `D:\work\terrain-p0\data`：P0 样本 D0～D4、M，以及合成边缘样本（哈希见 `measurements/v14/t144-edge-bench.json` 的 `syntheticSha256`） |
| 候选安装包 | Release Windows 手动运行 [38916667930](https://github.com/Nicander93/GeoForge/actions/runs/38916667930)，分支 `feat/terrain-v14-acceptance`（= master 9f44b1a）。`GeoForge 3D_0.0.0-ci_x64-setup.exe` sha256 `00d700ae16d8ea47cc833b1c7626d64ffa5bf5e24a4187c91de2793c95031e82`。只上传 artifact，**没有建 Release，没有打 Tag** |

## 2. 本次运行的测试

| 测试 | 命令 | 结果 |
|---|---|---|
| Rust 全工作区，接真实运行时 | `cargo test --release --workspace`（设置 `GEOFORGE_TERRAIN_RUNTIME=runtime-v22`、`GEOFORGE_TERRAIN_DATA`） | 全部通过：processor lib 217、protocol 32、convert_terrain 24、inspect_terrain 6、clip 8、flatten 5、merge 4，其余测试二进制也都通过；0 失败 |
| 地形运行时烟测（LM，暂存的包） | `smoke-terrain-runtime.ps1` | 通过：7 个 exe、21 块瓦片、34 个组件的许可证齐全、补丁集一致 |
| 安装后烟测（GitHub runner） | release-windows.yml 的 NSIS 静默安装 + 烟测 | 安装前、安装后两次都通过，补丁集哈希相同 |
| 前端单元测试 | `npm test` | 通过 |
| 前端构建 | `npm run build`（tsc + vite） | 通过 |
| 坐标审计 | `npm run test:coordinates` | 第一次失败：LM 上没有 `_3dtile` 转换器（环境问题）。设置 `GEOFORGE_3DTILE` 指向现有转换器后通过 |
| Playwright E2E | `npm run test:e2e` | 通过 |
| Playwright UI | `npm run test:ui` | 第一次 19/20：地形表单用例期望里没有 `preprocess: {}`。这是 #19 去掉投影下拉框后测试没跟着更新，CI 不跑这一组。本 PR 已修正测试，修正后 20/20 通过 |
| 边缘与质量对照 | `tools/terrain-bench/v14_edge_bench.py`（before 和 after 都用 runtime-v22） | 见 §3 G6；原始数据 `measurements/v14/t144-edge-bench.json` |
| CI | Windows（build-and-test）、Product Core | 以本 PR 的 checks 为准 |

## 3. Gate

状态只用 `PASS / FAIL / BLOCKED / NOT TESTED / NOT APPLICABLE` 五种。“CI 通过”不能代替 FAIL 或 NOT TESTED。

| Gate | 状态 | 证据 | 剩余风险 / 缺口 |
|---|---|---|---|
| **G1 输入/NoData** | PASS | `12-v14-nodata-rules.md`（四类 NoData、L 形与混合 CRS 实测）；convert_terrain 24 项（缺策略中止、合法 0 和负值保留、`.aux.xml`/PAM、重投影外框）；本次 EDGE-GAP-WIDE 给出 `TERRAIN_OUTSIDE_SOURCES_ZERO`，EDGE-GAP-NARROW 给出 `TERRAIN_SOURCE_SEAM_FILLED` | 按用户决定，所有源之外的大片空白写 0 m 并发出警告，不阻断；它显示为 0 m 台阶，不会伪装成真地形 |
| **G2 输出/服务** | PASS | 处理器逐级解码校验每块瓦片和 `layer.json`（convert_terrain）；V1.3 真实窗口 E2E 结果 `externalRequests: []`（`09-v13-preview.md`）；本次 `test:ui` 里“real Cesium loads”和 gzip 头用例通过；clip、merge、flatten 回归通过 | 安装后的离线预览没有测过，归在 G5 / Q15 |
| **G3 内存/空间** | NOT TESTED | `13-v14-performance.md`：overview 策略、1～8 线程、4 GiB 预算、峰值提交内存和临时磁盘峰值；D4 峰值约 2.3 GiB，没有 OOM | **磁盘不够或系统盘写满时能否受控失败没有实测**；4 GiB 预算没有真正起到限制作用；LM 机器漂移让绝对耗时只能当量级参考 |
| **G4 坐标/高程** | PASS | `03-v12-crs-validation.md` 的代表 CRS 矩阵（4490、4549、4498、3857、32650、32750、2436、2383）和失败码；`04-v12-cgcs2000.md`；convert_terrain 里的坏 CRS、低精度转换、复合 CRS 用例；报告里写 `accuracyKind: "estimate"`，垂直基准没转换时给出提示 | V1.4 起投影数据一律规范化，**代表 CRS 矩阵是 V1.2 测的，没有在 V1.4 重跑**；CGCS2000 的实际位置精度没有控制点可测（仍是估计值）；北京 54 / 西安 80 只有换标签的样本 |
| **G5 运行时/许可证** | NOT TESTED | 补丁身份：清单 `ctbPatchSetSha256`，处理器和烟测都核对；安装包带齐运行时（runner 上安装后的烟测）；NOTICE、SBOM、34 个组件的许可证；不含 GPL（`14-v14-installer-and-licenses.md`）；LGPL/MPL 方案已由用户在 2026-10-16 批准 | **洁净 Windows 没有测过**；法务没有审核（用户批准的是方案，不是法务结论） |
| **G6 边缘质量** | PASS | `11-v14-edge-decision.md`；本次 runtime-v22 实测见下表 | D1-auto 在 14、15 级还剩 38 个靠近边缘或在斜框外的低点，和 #19 时相同，粗层级已经没有；direct 路线已停用；EDGE-SLOPE-CLIFF 剩下的面采样偏差都在跨断崖的三角形里，属于网格简化本身 |
| **G7 任务韧性** | NOT TESTED | convert_terrain：取消后续跑与完整运行一致、参数变化重新开始、辅助文件变化重新开始；强杀后用 `-R` 续跑（`13-v14-performance.md` §4） | **换了补丁的运行时会拒绝续跑，只有单元测试**，没有用另一个补丁集的运行时实测；桌面层的取消没有在真实窗口里测；崩溃后残留进程没有专门检查 |
| **G8 全量回归/候选包** | NOT TESTED | §2 所有自动测试通过；候选包 sha256 见 §1 | **打包后的桌面程序在 V1.4 没有做真实窗口 E2E**（`terrain-desktop-e2e.py` 上一次跑是在 V1.2/V1.3）；安装态没有做 OSGB、IFC、模型的回归 |
| **G9 大体量数据** | NOT TESTED | 最大样本 D4：669 MiB 文件，解压 2.15 GiB | 没有 ≥10 GB 的真实数据；**不得宣称“已验证 ≥10 GB”** |

### G6：本次边缘实测（runtime-v22，独立解码 `.terrain`）

| 用例 | 退出码 | 瓦片 | 真值检查：顶点不合格 | 真值检查：面采样不合格 | 范围内下塌顶点 | 最大接缝 m |
|---|---|---|---|---|---|---|
| EDGE-PLATEAU-D0 | 0 | 177 | 0/3551 | 0/190269 | 0 | 0 |
| EDGE-PLATEAU | 0 | 49 | 0/2091 | 0/123673 | 0 | 0 |
| EDGE-SLOPE-CLIFF | 0 | 177 | 0/8490（最大 0.025 m） | 12016/481596（都在跨断崖的三角形里） | —（陡坡样本不适用这个指标） | 0.019 |
| EDGE-ROTATED（EPSG:4547） | 0 | 157 | 0/3118 | 0/161278 | 0 | 0 |
| D0 | 0 | 1944 | — | — | 0 | 0.0264 |
| D1-auto | 0 | 1866 | — | — | 38（14、15 级） | 0.0164 |
| D2-constant | 0 | 517 | — | — | 0 | 1.026（与 #19 时相同） |
| D3 | 0 | 1017 | — | — | 0 | 0.0253 |
| M-high | 0 | 7418 | — | — | 0 | 0.0246 |
| D4 | 0 | 64507 | — | — | 0 | 0.0248 |
| D1-direct | 1，`TERRAIN_CONFIG_INVALID` | — | — | — | — | 按预期被拒绝（direct 已停用） |

## 4. 回归矩阵 Q01～Q16

| ID | 状态 | 证据 / 说明 |
|---|---|---|
| Q01 D0 WGS84 | PASS | §3 G6 表；convert_terrain |
| Q02 D1 EPSG:4547 | PASS | D1-auto 规范化；direct 按设计被拒绝；坐标操作记在报告里 |
| Q03 3°/6°、4490、3857、UTM、WKT | PASS（V1.2 证据） | `03-v12-crs-validation.md` §4；V1.4 没有重跑 |
| Q04 北京54、西安80、缺格网、无 CRS | PASS（V1.2 证据 + 自动测试） | NAD27 缺格网时报 `TERRAIN_TRANSFORM_UNAVAILABLE`；没有 CRS 时必须由用户指定；只有换标签的样本 |
| Q05 高程基准 | PASS | 复合 CRS 时 `verticalTransformed=false` 并给出提示；表单要求用户确认 |
| Q06 D2 NoData、负值、合法 0、陡崖 | PASS | convert_terrain；D2-constant；EDGE-SLOPE-CLIFF 的断崖保留 |
| Q07 `.aux.xml`、世界文件、VRT | PASS | convert_terrain（辅助文件改动后重新开始；不写源目录） |
| Q08 D3、多源 | PASS | D3；L 形与混合 CRS（`12-v14-nodata-rules.md`）；EDGE-GAP-* |
| Q09 粗层级边界、非轴对齐 | PASS | §3 G6 表 |
| Q10 D0/D1/M/D4 与 LAT-00～70 | PASS（LAT 是 V1.2 证据） | 本次 D0/D1/M/D4；LAT 见 `08-v12-pam-and-sampling.md` |
| Q11 `layer.json`、gzip、Range | PASS | convert_terrain；test:ui；clip/merge/flatten |
| Q12 M 取消、续跑、补丁变化 | NOT TESTED（补丁变化那一项） | 取消和续跑已实测；补丁变化只有单元测试 |
| Q13 D4 overview、线程、低内存 | PASS（受控失败那一项 NOT TESTED） | `13-v14-performance.md` |
| Q14 ≥10 GB | NOT TESTED | 没有数据 |
| Q15 洁净 Windows 安装 + 离线预览 | NOT TESTED | 只在 GitHub runner 上做了静默安装和烟测 |
| Q16 3D Tiles、OSGB、模型、IFC、纹理、任务列表 | PASS（开发构建） | Rust 全工作区、test:ui、test:e2e、test:coordinates；安装态没有测 |

## 5. 要转为 Go 或 Conditional Go 还需要的证据

1. 一台洁净 Windows 10/11（没有 conda、GDAL、Python、VS），安装上面的候选包，跑一次地形切片，并在断网状态下做 Cesium 预览，附截图和日志 → G5、Q15、G8。
2. 用打包后的桌面程序跑一次 `terrain-desktop-e2e.py`（真实窗口），并做一次任务取消 → G8、G7。
3. 用补丁集不同的运行时去续跑一个已中断的任务，确认被拒绝并重新开始 → G7、Q12。
4. 在一块很小的卷（例如 2 GiB 的 VHD）上输出 D4，确认受控失败、不留残余、源数据不受影响 → G3。
5. 如果有 ≥10 GB 的真实 DEM，就做完整实测；没有就保持 NOT TESTED，发布说明只写“Windows 基础地形切片” → G9（Conditional Go 的前提）。
6. 可选：在 V1.4 的规范化路线上重跑代表 CRS 矩阵 → G4 加固。

## 6. 本 PR 的改动

- 新增本文档。
- 新增 `measurements/v14/t144-edge-bench.json`（本次边缘与质量实测的原始数据）。
- 修正 `apps/desktop/tests/ui/compact-ui.spec.mjs` 的地形表单期望（加上 `preprocess: {}`）。产品代码没有改。
