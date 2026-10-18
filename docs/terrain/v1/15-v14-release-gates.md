# 地形 V1.4 T14.4：全量验收与发布 Gate（G1～G9）

> 基线：`master@9f44b1a`（#19、#20、#21 已合并）。分支 `feat/terrain-v14-acceptance`。
> 本文只汇总证据，给出判定建议。**不是 Release Ready 声明。** 发布、打 Tag、建 Release 都由维护者决定，本 PR 一样都不做。

## 0. 结论

**判定建议：No-Go（证据不足，暂不能发布）。**

这次验收没有发现新的正确性缺陷：G1、G2、G3、G4、G6、G7 判 PASS（G3 在本 PR 补上磁盘预检后复测通过）。G5、G8、G9 仍有 NOT TESTED 的项。按计划，G1～G8 中任何一项不是 PASS，都不能判 Go，也不能判 Conditional Go。补齐 §4 列出的证据后才能重新判定。

最主要的缺口：

1. 没有在洁净 Windows 上安装、切片、离线预览过（G5、Q15）。候选包只在 GitHub runner 和开发机 LM 上装过，都不是洁净环境。
2. 候选包在 LM 上的真实窗口 E2E 通过（切片、取消一次、离线预览），但安装态没有做 OSGB、IFC、模型的回归；而且候选包是在本 PR 的磁盘预检改动之前构建的，合并后需要重新出候选包（G8）。
3. 没有 ≥10 GB 的真实数据（G9）。

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
| Rust 全工作区，接真实运行时 | `cargo test --release --workspace`（设置 `GEOFORGE_TERRAIN_RUNTIME=runtime-v22`、`GEOFORGE_TERRAIN_DATA`） | 加入磁盘预检后在 LM 上重跑，全部通过：processor lib 223、protocol 32、convert_terrain 26（新增磁盘预检两项）、inspect_terrain 6、clip 8、flatten 5、merge 4，其余测试二进制也都通过；0 失败 |
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
| **G3 内存/空间** | PASS | `13-v14-performance.md`：overview 策略、1～8 线程、4 GiB 预算、峰值内存，D4 约 2.3 GiB，没有 OOM。**本 PR 新增地形磁盘预检（§3.1）**：按源数据大小和选项估算临时文件和成果所需空间，明显不够时在写入前失败（`TERRAIN_DISK_SPACE_INSUFFICIENT`），偏少时和其他任务一样发 `LOW_DISK_SPACE`；处理中途写满时报 `TERRAIN_DISK_FULL`，中文说明磁盘空间不足。真实写满复测：留 400 MiB 时 0.5 s 内拒绝、什么都没写；留 750 MiB 时发警告并成功；跳过预检硬跑到写满时 gdaladdo 失败，报 `TERRAIN_DISK_FULL`。三种情况都没有残留，源文件 SHA-256 不变 | 估算按 LM 上 D0～D4、M 的实测定的，偏保守；单源 NoData 填补要扫描后才知道，没算进预检（届时写满会报 `TERRAIN_DISK_FULL`）。CTB 阶段的真实写满没有复现到（只有单元测试）。估算系数和阈值属于产品参数，可再调 |
| **G4 坐标/高程** | PASS | `03-v12-crs-validation.md` 的代表 CRS 矩阵（4490、4549、4498、3857、32650、32750、2436、2383）和失败码；`04-v12-cgcs2000.md`；convert_terrain 里的坏 CRS、低精度转换、复合 CRS 用例；报告里写 `accuracyKind: "estimate"`，垂直基准没转换时给出提示 | V1.4 起投影数据一律规范化，**代表 CRS 矩阵是 V1.2 测的，没有在 V1.4 重跑**；CGCS2000 的实际位置精度没有控制点可测（仍是估计值）；北京 54 / 西安 80 只有换标签的样本 |
| **G5 运行时/许可证** | NOT TESTED | 补丁身份：清单 `ctbPatchSetSha256`，处理器和烟测都核对；安装包带齐运行时（runner 上安装后的烟测）；NOTICE、SBOM、34 个组件的许可证；不含 GPL（`14-v14-installer-and-licenses.md`）；LGPL/MPL 方案已由用户在 2026-10-16 批准 | **洁净 Windows 没有测过**；法务没有审核（用户批准的是方案，不是法务结论） |
| **G6 边缘质量** | PASS | `11-v14-edge-decision.md`；本次 runtime-v22 实测见下表 | D1-auto 在 14、15 级还剩 38 个靠近边缘或在斜框外的低点，和 #19 时相同，粗层级已经没有；direct 路线已停用；EDGE-SLOPE-CLIFF 剩下的面采样偏差都在跨断崖的三角形里，属于网格简化本身 |
| **G7 任务韧性** | PASS | convert_terrain：取消后续跑与完整运行一致、参数或辅助文件变化时重新开始。**补丁集变化的端到端实测（§3.2）**：(A) 用 runtime-v22 跑 M，在 CTB 阶段强杀，再用补丁集不同的真实运行时（runtime-hc）续跑：拒绝运行，旧工作目录保留，没有输出；换回 runtime-v22 正常续跑。(B) 手改工作目录指纹里的补丁集后续跑：`TERRAIN_RESUME_RESET`，从头完整跑完。本 PR 把补丁集不匹配的错误码从 `TERRAIN_RUNTIME_MISSING` 改成 `TERRAIN_RUNTIME_INCOMPATIBLE`，并用新处理器重跑了 A/A'/B。桌面层取消一次见 G8 | — |
| **G8 全量回归/候选包** | NOT TESTED（地形部分已通过） | §2 所有自动测试通过。**候选包真实窗口 E2E（§3.3）**：在 LM 上把候选包静默安装到 `D:\work\terrain-v1\gf-install`，用匹配 WebView2 155.0.4283.45 的 msedgedriver 跑 `terrain-desktop-e2e.py --cancel-once`：选 D1、检查、开始后取消一次（状态“已取消”，输出目录为空），再次开始并成功（1866 块瓦片，RMSE 0.021 m），预览总览和边缘近景都加载完成，`externalRequests: []` | 安装态没有做 OSGB、IFC、模型的回归；候选包早于本 PR 的磁盘预检改动，需要重新出包后再验；LM 是开发机，不是洁净环境；死代理只是附加防线，没有做正向对照证明它生效，离线判断以请求审计为准 |
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

### 3.1 G3：真实磁盘写满（LM，D: 盘，没有管理员权限）

做法：没有管理员权限，建不了 VHD，也设不了配额，所以直接在 D: 上建一个占位文件，只留下指定的空间，然后把 D4 的输出写到 D:（工作目录在输出的上级目录里）。跑完后在 `finally` 里立刻删掉占位文件。**这是真实的写满，不是模拟。** 没有用 C: 系统盘，因为它只剩约 2.2 GB，又是用户正在用的系统盘。脚本 `C:\Users\PC\t144\g3.ps1` / `g3b.ps1`，结果在 `measurements/v14/t144-g3-diskfull.json`。

| 剩余空间 | 结果 | 阶段 | 错误 | 输出 / 工作目录残留 | 残留进程 | 源文件 |
|---|---|---|---|---|---|---|
| 400 MiB | 受控失败，退出码 1，34.6 s | 准备 DEM（overview） | `TERRAIN_PREPROCESS_FAILED`：gdaladdo exited with 100 | 无 / 无 | 无 | SHA-256 不变 |
| 750 MiB | 成功，303.9 s | — | — | — | 无 | 不变 |
| 1100 MiB | 成功 | — | — | — | 无 | 不变 |
| 2000 MiB | 成功 | — | — | — | 无 | 不变 |

### 3.1b G3：加入磁盘预检后复测（同一方法，结果在 `measurements/v14/t144-g3-precheck.json`）

| 剩余空间 | 结果 | 错误 / 警告 | 输出 / 工作目录残留 | 源文件 |
|---|---|---|---|---|
| 400 MiB | 退出码 1，0.5 s，停在“检查输入” | `TERRAIN_DISK_SPACE_INSUFFICIENT`：磁盘只剩 399 MiB，预计需要约 657 MiB | 无 / 无 | 不变 |
| 750 MiB | 成功，277.9 s | 警告 `LOW_DISK_SPACE` | — | 不变 |
| 400 MiB，用测试开关跳过预检 | 退出码 1，32.3 s，gdaladdo 写满 | `TERRAIN_DISK_FULL`（原来是 `TERRAIN_PREPROCESS_FAILED`） | 无 / 无 | 不变 |

D4 的估算：raw/50 + 64 MiB + overview raw/4 ≈ 657 MiB（实测峰值 613 MiB）。低于估算的 3/4 拒绝；低于 1.5 倍估算或低于共享阈值（默认 1 GiB）时警告。

### 3.2 G7：补丁集变化后不会错误续跑（LM，真实运行时）

脚本 `C:\Users\PC\t144\g7.py`，结果在 `measurements/v14/t144-g7-patchset-resume.json`。两个运行时都是在 LM 上用 LGPL 环境构建的真实运行时：runtime-v22 的补丁集是 `fae133b7…`（半像元 + 边缘掩膜），runtime-hc 的补丁集是 `b0ed3da9…`（只有半像元）。任务是 M-high-auto，`resumePolicy: resume`，在 overview 结束 3 秒后强杀整个进程树。

| 场景 | 第二次运行 | 结果 |
|---|---|---|
| A：用 runtime-hc 续跑 | 退出码 1，第一次是 `TERRAIN_RUNTIME_MISSING`；改码后重跑为 `TERRAIN_RUNTIME_INCOMPATIBLE`（消息列出期望的和清单中的补丁集；结果 `t144-g7-incompatible.json`） | 旧工作目录保留，没有输出 |
| A'：再用 runtime-v22 续跑 | 退出码 0，`resuming with ctb-tile -R; removed 1 unfinished tiles` | 正常完成 |
| B：手改工作目录指纹里的补丁集后，用 runtime-v22 续跑 | 退出码 0，警告 `TERRAIN_RESUME_RESET` | 丢弃旧目录，从头完整跑完 |

### 3.3 G8：候选包真实窗口 E2E（LM）

- 安装：`GeoForge 3D_0.0.0-ci_x64-setup.exe /S /D=D:\work\terrain-v1\gf-install`，退出码 0，sha256 与 §1 一致；非管理员。
- 驱动：msedgedriver 155.0.4283.45（与本机 WebView2 一致）；旧的 msedgedriver 启动即崩溃（0xC0000142），已弃用。
- 处理器和地形运行时都用安装目录里的（`processor.exe`、`resources\runtime\terrain`）；`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--proxy-server=127.0.0.1:9`（死代理，本机地址不走代理）。
- 脚本新增 `--cancel-once`：开始后在任务页点“取消任务”，等到“已取消”，再回到地形切片重新开始。
- 结果：取消后输出目录为空；第二次成功，route normalize，1866 块瓦片，RMSE 0.021 m；预览 225 个请求，`externalRequests: []`；边缘过渡开/关截图都有。截图 e2e-1～e2e-6、e2e-2c-cancelled。

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
| Q12 M 取消、续跑、补丁变化 | PASS | §3.2；桌面取消见 §3.3 |
| Q13 D4 overview、线程、低内存 | PASS | `13-v14-performance.md`；§3.1、§3.1b |
| Q14 ≥10 GB | NOT TESTED | 没有数据 |
| Q15 洁净 Windows 安装 + 离线预览 | NOT TESTED | 在 GitHub runner 和开发机 LM 上装过，LM 上离线预览通过；都不是洁净环境 |
| Q16 3D Tiles、OSGB、模型、IFC、纹理、任务列表 | PASS（开发构建） | Rust 全工作区、test:ui、test:e2e、test:coordinates；安装态没有测 |

## 5. 要转为 Go 或 Conditional Go 还需要的证据

1. 一台洁净 Windows 10/11（没有 conda、GDAL、Python、VS），安装上面的候选包，跑一次地形切片，并在断网状态下做 Cesium 预览，附截图和日志 → G5、Q15、G8。
2. 本 PR 合并后重新出候选包，在安装态再跑一次 `terrain-desktop-e2e.py --cancel-once`，并补做 OSGB、IFC、模型回归 → G8。
3. 如果有 ≥10 GB 的真实 DEM，就做完整实测；没有就保持 NOT TESTED，发布说明只写“Windows 基础地形切片” → G9（Conditional Go 的前提）。
4. 可选：在 V1.4 的规范化路线上重跑代表 CRS 矩阵 → G4 加固。

## 6. 本 PR 的改动

- 新增本文档。
- 新增 `measurements/v14/t144-edge-bench.json`（本次边缘与质量实测的原始数据）。
- 修正 `apps/desktop/tests/ui/compact-ui.spec.mjs` 的地形表单期望（加上 `preprocess: {}`）。
- 新增 `measurements/v14/t144-g3-diskfull.json`、`t144-g3-precheck.json`、`t144-g7-patchset-resume.json`、`t144-g7-incompatible.json`、`t144-g8-desktop-e2e.json`。
- 产品代码（用户已批准）：地形磁盘预检和写满提示（`stages/terrain/space.rs`，错误码 `TERRAIN_DISK_SPACE_INSUFFICIENT`、`TERRAIN_DISK_FULL`）；补丁集不匹配改用 `TERRAIN_RUNTIME_INCOMPATIBLE`；任务页给出对应建议。
- `terrain-desktop-e2e.py` 新增 `--cancel-once`。
