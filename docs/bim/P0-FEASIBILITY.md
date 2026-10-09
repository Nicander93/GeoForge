# MicroStation / Revit → 3D Tiles 插件：P0 可行性调查

> 状态：P0 调查结论。本文只记录调查结果和后续计划，没有实现任何产品代码。
> 调查日期：2026-10-09（Asia/Shanghai）
> 代码基线：GeoForge `master` `9a580f3`，geoforge-converter `master` `057ed75`
> 任务书：《GeoForge：MicroStation / Revit → 3D Tiles 插件技术方案（探索与实施版 V1）》第 5 节 P0
> 用户优先级：先做 MicroStation 插件，V8i（SELECTseries）和 CONNECT Edition（CE）两个版本都要考虑；Revit 放在后面。

## 0. 结论摘要

1. **宿主环境目前受阻，Gate P0 没有通过。** 用户的 Windows 电脑（LM）上没有安装 Bentley 或 Revit 软件，也没有 SDK。用户手里虽然有 MicroStation 安装包，但这份安装没有有效许可证，按约定**不用于开发和测试**。用户也没有 Bentley Developer Network（BDN）账号。所以“在至少一个宿主版本里导出一个带身份标识的三角网格”这一步目前无法验证。本文中所有涉及宿主的结论，都只来自文档和社区资料，没有经过实测。
2. **V8i 和 CE 是两套不同的技术栈，不能共用一个 DLL。** V8i 是 32 位程序，原生开发要用 Visual Studio 2005（VC++ 8.0），托管插件运行在 .NET 3.5 上，而且 V8i 的 .NET API 里没有 `PolyfaceHeader` 这类网格对象。CE（包括 MicroStation 2023/2024/2025/2026）是 64 位程序，托管 API 是 `Bentley.DgnPlatformNET`，可以用 `ElementGraphicsProcessor` + `FacetOptions` 直接拿到三角网格、UV 和材质。V8i 产品支持已在 2022-01-01 结束。
3. **建议先做 CE 适配器（MicroStation 2024 或更新版本优先），V8i 放到以后。** 只有在拿到合法授权的 V8i 环境、并且确实有客户必须在 V8i 里导出时，才单独做 V8i 适配器。CE 本身就能打开 V8 格式的 DGN 文件，所以 V8i 时代的图纸可以先用 CE 适配器处理。
4. **没有 SDK 也能做托管插件，但只限 CE 的托管 API。** Bentley 官方教程在构建 Add-in 时引用的就是 MicroStation 安装目录里的 `ustation.dll`、`Bentley.DgnPlatformNET.dll` 等程序集，不需要 SDK。原生 C++ 插件离不开 SDK 里的头文件和库。不管走哪条路，都需要一份**合法授权**的 MicroStation 来编译、加载和测试。
5. **现有转换器不支持 3D Tiles 1.1 的构件元数据。** FBX/OBJ 路径输出的是 3D Tiles 1.0 的 b3dm，带 `_BATCHID` 和 batch table，每个 FBX 节点实例对应一个 batch ID，属性全部是字符串，没有 `EXT_mesh_features` 和 `EXT_structural_metadata`。`top_rebuild` 生成的代理瓦片不带 batch ID。BIM 路径需要新写一个 3D Tiles 1.1 的写出模块。
6. **现在能做的下一步不依赖任何宿主软件：** 先起草 Exchange Package 规范，做一个合成的测试样本，在 processor 里写一个 `import-bim` 原型，输出带 Feature ID 和元数据的 3D Tiles 1.1，再用 CesiumJS 做拾取测试。

标注约定：

- **已验证**：有官方或社区原文作依据，或者在本仓库代码里直接看到。
- **推断**：根据资料或经验推出来的，但没有原文直接写明，也没有实测。
- **未验证**：需要在宿主环境里实测才能确认。
- **受许可限制**：需要合法许可证、BDN 会员资格，或者受 EULA 约束。

## 1. 环境与阻塞情况

### 1.1 用户 Windows 电脑（LM）现状（2026-10-09 由上级代理检查）

| 项目 | 状态 |
|---|---|
| 硬件 | i5-14600KF，32 GB 内存 |
| 编译工具 | 只有 Visual Studio 2026 Build Tools（18.6）；Windows SDK 10.0.26100；CUDA 13.1 |
| Bentley / MicroStation | 用户有安装包，但没有有效许可证。按约定**不用于开发和测试** |
| Revit | 没有安装 |
| Bentley SDK、BDN 账号 | 都没有 |
| Bentley 相关环境变量 | 没有 |

结论：**宿主侧的 Gate P0 受阻，要等用户拿到合法许可证。** 本文没有任何“宿主内测试通过”的结论。

### 1.2 合法获取 MicroStation 的途径

| 途径 | 内容 | 适用性 | 依据 |
|---|---|---|---|
| 官方免费试用 | Bentley 官网可以申请 MicroStation 试用。产品激活说明里写明：试用模式只有在产品**从未激活过**的电脑上才会进入，到期后必须激活才能继续用。SELECT 协议（2026-04-01 生效）第 4.6 条规定，评估副本每个站点一份，只能内部评估，最长 30 天 | 适合做 P1 端到端验证，但 30 天比较紧，需要先把不依赖宿主的部分准备好。试用提供的是哪个版本（推断是当前版本，例如 2025/2026，不是 CE U17）、试用期内能不能加载自定义 Add-in，都**未验证**，需要试用时确认 | [Free Trials](https://www.bentley.com/software/free-trials-deals/)、[KB0019112 产品激活模式](https://bentleysystems.service-now.com/community?id=kb_article_view&sysparm_article=KB0019112)、[SELECT Program Agreement](https://www.bentley.com/en/legal/select-program-agreement/) |
| Bentley Education（学生/教师） | 经过资格认证的学生和教师可以免费使用 MicroStation，**只能用于教育目的** | 只有用户本人符合资格时才能用。拿它开发产品插件是否算“教育目的”，需要向 Bentley Education 确认，不能用于商业项目（受许可限制） | [Bentley Education](https://www.bentley.com/education/)、[Education FAQ](https://www.bentley.com/education/help/)、[KB0050176 产品清单](https://bentleysystems.service-now.com/community?id=kb_article_view&sysparm_article=KB0050176) |
| 雇主或客户的 SELECT 订阅 + BDN SELECT | SDK 只对 BDN 会员开放。BDN 至少需要一份挂在公司（企业、LLC 等法律实体）名下的 Bentley 产品 SELECT 订阅；个人不能单独申请 SDK。也可以买 BDN Commercial，但需要经过评估，没有法律实体的申请多半会被拒 | 这是拿到 SDK 和完整开发授权最正规的路径。需要用户所在单位，或者合作客户愿意提供 | [KB0012465 FAQ](https://bentleysystems.service-now.com/community?id=kb_article_view&sysparm_article=KB0012465)、[KB0012644 SDK 要求](https://bentleysystems.service-now.com/community?id=kb_article_view&sysparm_article=KB0012644)、[KB0018646 SDK 下载权限](https://bentleysystems.service-now.com/community?id=kb_article_view&sysparm_article=KB0018646)、[Bentley 开发者页面](https://www.bentley.com/en/support/software-developers/) |
| V8i | V8 产品支持已于 2022-01-01 结束，Bentley 建议开发者迁移到 CONNECT。V8i SS10（08.11.09.931）是最后一个版本，与 SS4 SDK 最终版兼容 | 新授权**推断**已经买不到。只有用户或客户本来就有合法授权的 V8i 环境时才考虑 | [KB0012597 SDK Releases](https://bentleysystems.service-now.com/community?id=kb_article&sysparm_article=KB0012597) |

### 1.3 阻塞清单（用户需要准备的东西）

1. **一份合法的 MicroStation 运行环境**（受许可限制）。优先选 MicroStation 2024 或更新版本，其次是 CE U17。可以用官方试用、雇主或客户的 SELECT 授权，或者符合条件的教育授权。
2. **如果要做 V8i 适配器**：一份合法的 V8i SS4/SS10 环境，以及真正需要 V8i 导出的业务场景。
3. **如果要走原生 C++ 或 SDK 文档路线**：BDN 会员资格（BDN SELECT 或 BDN Commercial），用来下载对应版本的 MicroStation SDK。只做 CE 托管插件时，这一项不是必需的（见第 4 节）。
4. **编译工具组件**（不需要许可证，可以现在就装），在 VS 2026 Build Tools 里补装：
   - `.NET 桌面生成工具` 工作负载（`Microsoft.VisualStudio.Workload.ManagedDesktopBuildTools`）
   - `.NET Framework 4.8 targeting pack`（`Microsoft.Net.Component.4.8.TargetingPack`），用于 MicroStation 2024/2025/2026
   - `.NET Framework 4.6.2 targeting pack`（`Microsoft.Net.Component.4.6.2.TargetingPack`），用于 CE U13–U17
   - `.NET Framework 3.5 development tools`（`Microsoft.Net.Component.3.5.DeveloperTools`），以后做 V8i 托管插件时才需要，Windows 上还要另外启用 .NET 3.5 运行时
   - 如果以后要写原生 C++：`MSVC v142 (14.29)` 或 `MSVC v143 (14.44)` 工具集，具体对应关系见第 2.3 节
   - 组件 ID 依据：[VS 2026 Build Tools 组件 ID 列表](https://github.com/MicrosoftDocs/visualstudio-docs/blob/main/docs/install/includes/vs-2026/workload-component-id-vs-build-tools.md)
5. **一份可以公开的小型 DGN 测试样本**，用来做 P1 验证。样本里要有 Level、Cell、Reference、Item Type 和带纹理的材质，坐标系最好是 CGCS2000 投影，并给出 3 个控制点。不能用真实客户模型（受许可限制）。

## 2. V8i 与 CE 对比

### 2.1 版本与命名

| 名称 | 版本号 | 发布时间 | 说明 | 依据 |
|---|---|---|---|---|
| MicroStation V8i | 08.11.05 | 2008-11 | 引入地理坐标（intrinsic geo-coordination） | [KB0108530 History](https://bentleysystems.service-now.com/community?id=kb_article&sysparm_article=KB0108530) |
| V8i SELECTseries 3 | 08.11.09 | 2012-04 | 引入 Item Sets、支持 IFC | 同上 |
| V8i SELECTseries 4 | 08.11.09.8xx | 2016-03 | 通过 Windows 10 认证 | 同上 |
| V8i SELECTseries 10 | 08.11.09.931 | 2019-05 | 最后一个 V8i 版本，与 SS4 SDK 最终版兼容 | [KB0012597](https://bentleysystems.service-now.com/community?id=kb_article&sysparm_article=KB0012597) |
| MicroStation CONNECT Edition | 10.00–10.17 | 2015-09 起 | 第一个 64 位版本；引入 Item Types | [KB0108530](https://bentleysystems.service-now.com/community?id=kb_article&sysparm_article=KB0108530)、[LA Solutions Item Types](https://www.la-solutions.org/CONNECT/ItemTypes/ItemTypes.htm) |
| CE Update 17.2 | 10.17.02.x | 2022–2023 | CE 编号体系下的最后一个 Update | KB0012597 |
| MicroStation 2023 | 23.00.x | 2023-06 | 改用年份命名：2023 = 23.00；第二个大版本叫“2023 Update 1” = 23.01 | [Bentley Lifecycle Policy](https://www.bentley.com/en/support/bentley-lifecycle-policy/)、KB0108530 |
| MicroStation 2024 | 24.00.x | 2024-07 | 加入 Python 集成 | KB0108530 |
| MicroStation 2025 | 25.00.x | 2025-07 | SDK 改用 VS2022 和 C++20；可以挂接 3D Tiles 作为参考（基于 Cesium Native） | [2025 SDK 公告](https://bentleysystems.service-now.com/community?id=community_blog&sys_id=8d506b1e87432a105d587556cebb3590)、[Cesium 博客](https://cesium.com/blog/2025/09/15/microstation-advances-infrastructure-design-with-3d-tiles/) |
| MicroStation 2026 | 26.00.x | 2026 | 2026 SDK（26.00.02.16）于 2026-08-25 发布 | [2026 SDK 公告](https://bentleysystems.service-now.com/community?id=community_blog&sys_id=3a529e578772cb10416dcbb7dabb3558) |

说明：

- 用户说的“CE”，从 API 角度看可以包括 CE U13–U17 和 MicroStation 2023–2026。它们都使用 CONNECT 一代的 `DgnPlatformNET` / MicroStationAPI，只是每个大版本的编译器和 .NET 要求不同（**推断**：同一份源码可以按版本分别编译）。Bentley 要求在 Visual Studio 版本变化或出现 Breaking Changes 时重新编译（已验证，见各版本 SDK 公告）。
- 生命周期：2023 年以前发布的 CE 版本，支持期**至少**到 2025-12-31（已验证，Lifecycle Policy）。所以到 2026-10，CE U17 很可能已经不在支持期内（推断）。MicroStation 2023 及以后的大版本，支持期至少到发布年份往后第三年的年底（已验证，[KB0108156 2023 FAQ](https://bentleysystems.service-now.com/community?id=kb_article&sysparm_article=KB0108156)）。
- MicroStation 2025 起可以**挂接** 3D Tiles 作为参考数据，例如 Google Photorealistic 3D Tiles，但官方资料里**没有**看到“导出 3D Tiles”的功能（已验证到 Cesium 博客这一层）。这个功能以后可以用来在 MicroStation 里反过来查看 GeoForge 的输出（推断，未验证）。

### 2.2 位数与运行时

| 项目 | V8i（SS3/SS4/SS10） | CE U13–U17 | MicroStation 2024 | MicroStation 2025/2026 |
|---|---|---|---|---|
| 位数 | 32 位（已验证：[EnvisionCAD](https://envisioncad.com/microstation-connect-edition-the-top-five-things-you-need-to-know/)；KB0012597 中 V8i SDK 均标为 32-bit） | 64 位（已验证，KB0012597 标为 x64） | 64 位 | 64 位 |
| .NET 运行时 | 需要 .NET Framework 3.5 SP1。即便是 SS4（08.11.09.829），在 Windows 10 上也要先启用 .NET 3.5（已验证：[KB0040082](https://bentleysystems.service-now.com/community?id=kb_article_view&sysparm_article=KB0040082)）。托管 Add-in 因此应当面向 .NET 3.5 / CLR 2.0（推断，要在实机 `ustation.exe.config` 上确认） | 4.6.2（U13 起，已验证：KB0012597、[LA Solutions](https://www.la-solutions.org/CONNECT/DgnPlatformNet/DotNetDevelopmentEnvironment.htm)） | 4.8（已验证：[2024 SDK 公告 KB0041433](https://bentleysystems.service-now.com/community?id=kb_article_view&sysparm_article=KB0041433)） | 4.8（已验证：2025/2026 SDK 公告） |
| 内存 | 32 位地址空间，大模型导出时容易内存不够（推断）。插件只能流式写盘，重活必须放到进程外 | 64 位 | 64 位 | 64 位 |

### 2.3 SDK 与编译器

| 版本 | SDK | 官方要求的编译器 | VS 2026 Build Tools 能不能用 | 依据 |
|---|---|---|---|---|
| V8i SS4/SS10 | MicroStation V8i SDK 32-bit，最终版 08.11.09.867（2017-02-27） | VS2005，VC++ 8.0（MSVCRT 8.0），SP1 | **原生 C++ 不行**。VC8 和现在的 MSVC 二进制不兼容，VS 2026 也装不了 VC8 工具集。只能单独准备 VS2005 SP1 环境（推断：在 Win11 上安装和使用都有风险）。**托管 C# 可以**：VS 2026 支持面向 .NET Framework 3.5 SP1 | [KB0012597](https://bentleysystems.service-now.com/community?id=kb_article&sysparm_article=KB0012597)、[LA Solutions VS 版本表](https://la-solutions.org/CONNECT/MicroStationAPI/VizStudio.htm)、[VS 2026 兼容性](https://learn.microsoft.com/en-us/visualstudio/releases/2026/compatibility) |
| CE U12–U16.0 | CE SDK x64 | VS2017（14.1） | 可以在 VS 2026 里装 v141（14.16）工具集（已验证） | KB0012597、[MSVC 14.30–14.43 进入 VS2026](https://devblogs.microsoft.com/cppblog/msvc-build-tools-versions-14-30-14-43-now-available-in-visual-studio-2026/) |
| CE U16.1–U17.2 | CE SDK x64，最后一版 10.17.02.09（2023-03-07） | VS2019（14.2，`_MSC_VER` 1920+），.NET 4.6.2 | 可以装 v142（14.29）工具集（已验证组件存在）。Bentley 官方没有把 VS2026 列为支持环境（受许可/支持限制） | KB0012597、KB0012644 |
| MicroStation 2023 | 2023 SDK（23.00.x） | 公告原文没能读到。**推断**为 VS2019 | 同上（推断） | [2023 SDK 公告线索](https://bentleysystems.service-now.com/csp?id=community_question&sys_id=a7c1b1501b310690f3fc5287624bcbdd)（页面需要脚本渲染，正文未读到） |
| MicroStation 2024 | 2024 SDK 24.00.00.114（2024-08-12） | 默认 VS2019 Professional；.NET 4.8。Bentley 博客说 2024 “now supports VS2022” | 可以装 v142 或 v143（推断） | [KB0041433](https://bentleysystems.service-now.com/community?id=kb_article_view&sysparm_article=KB0041433)、[KB0012770](https://bentleysystems.service-now.com/community?id=kb_article_view&sysparm_article=KB0012770) |
| MicroStation 2025 | 2025 SDK 25.00.00.23（2025-08-01） | VS2022 17.14，原生 v14.3（`_MSC_VER` 1930+），C++20；托管 .NET 4.8。**明确支持 Build Tools 版本** | VS 2026 可以装 v143（14.44）（已验证组件存在）。Bentley 没有声明支持 VS2026 自带的 v145 工具集；按微软的说法 v140–v145 二进制兼容（[微软说明](https://learn.microsoft.com/en-us/cpp/porting/binary-compat-2015-2017?view=msvc-170)），但仍建议使用 Bentley 指定的 v143 | [2025 SDK 公告](https://bentleysystems.service-now.com/community?id=community_blog&sys_id=8d506b1e87432a105d587556cebb3590) |
| MicroStation 2026 | 2026 SDK 26.00.02.16（2026-08-25） | 同 2025（VS2022、v14.3、.NET 4.8、支持 Build Tools） | 同上 | [2026 SDK 公告](https://bentleysystems.service-now.com/community?id=community_blog&sys_id=3a529e578772cb10416dcbb7dabb3558) |

SDK 获取方式（已验证，受许可限制）：要有 BDN 合同，还要在 Bentley 账号上拿到 “Download SDKs and APIs” 和 “Download” 两个角色，然后到 Software Downloads 页面把 Deliverable Type 筛选为 SDK 再下载（[KB0018646](https://bentleysystems.service-now.com/community?id=kb_article_view&sysparm_article=KB0018646)）。个人不能单独加入（[KB0012465](https://bentleysystems.service-now.com/community?id=kb_article_view&sysparm_article=KB0012465)）。

### 2.4 编程模型与 API 能力

| 能力 | V8i | CE / 2023–2026 |
|---|---|---|
| 托管插件形式 | `Bentley.MicroStation.AddIn` 派生类，搭配 `AddInAttribute(MdlTaskId=..., KeyinTree=...)` 和 key-in XML；引用 `ustation.dll`、`Bentley.MicroStation.dll`、`Bentley.Interop.MicroStationDGN.dll`（COM 对象模型）、`Bentley.MicroStation.Interfaces.1.0.dll`、`Bentley.General.1.0.dll`（已验证：[KB0026656](https://bentleysystems.service-now.com/community?id=kb_article&sysparm_article=KB0026656) 是 XM 版的示例，V8i 沿用同一套机制，属于推断） | `Bentley.MstnPlatformNET.AddIn` 派生类（在 `ustation.dll` 里）；主要 API 在 `Bentley.DgnPlatformNET.dll`、`Bentley.GeometryNET`、`Bentley.ECObjects`（已验证：[KB0012768](https://bentleysystems.service-now.com/community?id=kb_article&sysparm_article=KB0012768)、[LA Solutions](https://www.la-solutions.org/CONNECT/DgnPlatformNet/DotNetDevelopmentEnvironment.htm)） |
| 原生插件 | MDL（C）和 MicroStationAPI（C++），用 VS2005 编译；`.ma` 资源仍要用 bmake 编译（已验证：[LA Solutions Build Tools](https://www.la-solutions.org/CONNECT/MicroStationAPI/CompareBMakeAndVizStudio.htm)） | MicroStationAPI / DgnPlatform C++。CE 已不支持纯 MDL 字节码（已验证：LA Solutions VS 版本页） |
| 三角网格 | V8i 的 .NET API **没有** `PolyfaceHeader`（已验证：社区专家在 [CONNECT C# 纹理坐标帖](https://bentleysystems.service-now.com/community?id=community_question&sys_id=a5a4b0354775ca9088c56642846d43c2) 里明确说过）。原生方面，社区资料提到 V8i 的 MicroStationAPI 有 `IElementGraphicsProcessor::_ProcessFacets` 和 `IFacetOptions`，MDL 有 `mdlMesh_getPolyfaceArraysDirect` 之类的函数（**未验证**，只有搜索摘要，没读到原帖或官方文档）。COM 对象模型没有通用的实体/曲面三角化接口（推断） | 托管：继承 `ElementGraphicsProcessor`，重写 `ProcessAsFacets` 返回 true，在 `ProcessFacets(PolyfaceHeader meshData, bool filled)` 里接收网格；用 `GetFacetOptions()` 返回 `FacetOptions`（`ChordTolerance`、`AngleTolerance`、`MaxPerFace=3`、`NormalsRequired`、`ParamsRequired`）；调用入口是 `ElementGraphicsOutput.Process(element, processor)`（已验证：[CONNECT C# ElementGraphicsProcessor 帖](https://bentleysystems.service-now.com/community?id=community_question&sys_id=e8e39c3197f10a50afb952800153af4a)、纹理坐标帖）。原生：`IElementGraphicsProcessor::_ProcessFacets/_ProcessAsFacets/_AnnounceTransform/_AnnounceElemDisplayParams/_GetFacetOptionsP`（已验证：[MicroStation Python API 参考](https://developer.bentley.com/documentation/microstation-python-api/apireference/MSPyDgnPlatformModule/IElementGraphicsProcessor)，Python API 封装的是同一套原生接口，适用于 2024 及以后；CE U17 是否同名属于推断）；Mesh 概念见 [Mesh API Overview](https://developer.bentley.com/documentation/microstation-python-api/pdf/20-MicrostationPython_Mesh_API_Overview.pdf) |
| UV 与纹理 | 未验证 | `PolyfaceHeader.Parameter` 可以拿到 UV，`DisplayableElement.GetElementDisplayParameters(true).Material` → `GetSettings().GetMaps()` → `MaterialMapLayer.FileName`，再用 `MaterialManager.FindTexture` 找到纹理文件（已验证：纹理坐标帖）。**已知风险**：同一个帖子反映直接用 `Parameter` 得到的 UV 比例不对，还要结合材质的 MapUnits/MapMode 换算，帖子最终没有解决（已验证存在这个问题，解法未验证） |
| Element ID | 每个元素有一个 64 位 Element ID，在单个 DGN 文件内唯一；V8i COM 里是 `Element.ID`（DLong 类型）（已验证：[LA Solutions Element ID](https://www.la-solutions.org/CONNECT/MVBA/MVBA-ElementID.htm)） | 同样是 64 位、文件内唯一；托管 API 有 `Element.ElementId`，VBA 有 `ID64`（已验证：同上和 ElementGraphicsProcessor 帖）。跨文件或引用模型时不唯一，`componentKey` 要组合“文件 / 模型 / 引用路径 / 元素 ID”（推断，和任务书第 3.2 节一致） |
| Level | COM `Element.Level`（推断，常用 API，未查原文） | `Element.LevelId` 加 LevelCache；Python API 的 `LevelHandle` 有显示、透明度等属性（已验证存在 LevelHandle 接口） |
| 属性 | Tags/Tag Sets；V8i 已经有 EC Schemas 和 XAttributes，但**没有 Item Types**（已验证：[LA Solutions Item Types](https://www.la-solutions.org/CONNECT/ItemTypes/ItemTypes.htm)、[Bentley Medium：用 Item Types 替代 Tag Sets](https://medium.com/like-v8i-youll-love-connect/like-v8i-youll-love-connect-part-6-1f00ed431420)）。COM 可以读 Tag（[LA Solutions Tag Data](https://www.la-solutions.org/CONNECT/MVBA/MVBA-TagDataOverview.htm)）。V8i 读 EC 和 XAttribute 的托管接口**未验证** | Item Types（ECClass 的受限子集）：用 `CustomItemHost` 或 `DgnECManager.FindInstances` 查询，`IDgnECInstance` 可以枚举 `IECPropertyValue`；单元内部的元素要设置 `SearchPublicChildren`；读取元素的全部 EC 属性用 `DgnECManager.Manager.GetElementProperties(el, ECQueryProcessFlags.SearchAllClasses)`（已验证：[LA Solutions Item Instance Collector](https://www.la-solutions.org/CONNECT/DgnPlatformNet/ItemInstanceCollector.htm)、[Bentley SDK 示例：读取元素全部属性](https://docs.bentley.com/LiveContent/web/OpenRoads%20Designer%20SDK-v2026/Help/en/topics/SDKConcepts/get_all_properties_of_element.html)） |
| 引用附件 | COM 的 Attachments 集合（推断） | `DgnAttachment`：`GetTransformToParent`、`GetAttachFullFileSpec`、`GetElementId`（已验证：[Python API DgnAttachment](https://developer.bentley.com/documentation/microstation-python-api/apireference/MSPyDgnPlatformModule/DgnAttachment)）；托管 API 的引用操作见 [LA Solutions Reference Manager](https://www.la-solutions.org/CONNECT/DgnPlatformNet/ReferenceManager.htm) |
| 地理坐标系（GCS） | V8i 引入了地理坐标功能（已验证：KB0108530）。API 名称和用法**未验证** | 托管：`Bentley.GeoCoordinatesNET.DgnGCS.FromModel(model, true)`，可以取 `DisplayName`、`Units`（已验证：[Bentley SDK 示例：Get DGN Coordinate system](https://docs.bentley.com/LiveContent/web/OpenRoads%20Designer%20SDK-v2026/Help/en/topics/SDKConcepts/get_dgn_coordinate_system.html)）。原生 / Python 还能拿 `GetEPSGCode`、`GetWellKnownText(WktFlavor, ...)`，以及垂直基准相关接口（已验证：[Python API DgnGCS](https://developer.bentley.com/documentation/microstation-python-api/apireference/MSPyDgnPlatformModule/DgnGCS)）。托管 API 里是否有同名的 EPSG/WKT 方法属于推断 |
| 部署和加载 | DLL 放到 `mdlapps`，或者用 `MS_ADDINPATH` 指定目录，然后 `mdl load <程序集名>`（已验证：KB0026656） | 同样是 `mdlapps` 或 `MS_ADDINPATH`；依赖的程序集用 `MS_ADDIN_DEPENDENCYPATH` 指定；命令表 XML 作为嵌入资源，`LogicalName` 必须写成 `CommandTable.xml`；MdlTaskId 不超过 15 个字符（已验证：LA Solutions 开发环境页、[Assembly Locations](https://www.la-solutions.org/CONNECT/DgnPlatformNet/AssemblyLocations.htm)） |

### 2.5 一套代码能不能同时支持 V8i 和 CE

- **宿主无关的核心可以共享**（推断，属于架构判断）：Exchange Package 的写出、数据模型、校验、单位和坐标元数据、分块写盘，这些都不依赖宿主 API。
- **适配器必须分开**（推断，依据是 2.2–2.4 节已验证的差异）：
  - CE 适配器：C#，`net462`（面向 CE U13–U17）和 `net48`（面向 2024–2026）各编一份，每个 MicroStation 大版本单独编译和打包。
  - V8i 适配器：32 位进程、.NET 3.5，网格只能走原生 MDL/MicroStationAPI（VS2005），或者通过 P/Invoke 调用 MDL 的 C 函数。它和 CE 适配器几乎没有能共用的宿主代码。
- **共享核心的语言选择**：如果要让 V8i 适配器也能用同一个 C# 核心，核心就只能面向 .NET 3.5 和 C# 低版本语法，代价很高。更实际的做法是把 **Exchange Package 文件格式本身**作为共享契约：CE 适配器里放一份 C# 写出库；V8i 以后如果要做，再写一个最小的写出实现，或者只输出中间 JSON/二进制，由进程外工具转换（推断）。
- **V8i 的替代方案**：MicroStation 2023 FAQ 写明 V8 DGN 格式没有变化（已验证，[KB0108156](https://bentleysystems.service-now.com/community?id=kb_article&sysparm_article=KB0108156)），CE 可以直接打开 V8i 时代的 DGN。如果客户只是“手上有 V8i 图纸”，而不是“只能在 V8i 里操作”，用 CE 适配器就够了（推断）。

## 3. 版本矩阵（只是调查对象，不代表已支持）

| 宿主版本 | 位数 | 插件框架 | 官方编译器 | SDK 获取 | 本机可运行实例 | 编译 / 测试可行性 | 许可限制 |
|---|---|---|---|---|---|---|---|
| MicroStation V8i SS4/SS10 | 32 | .NET 3.5 托管 / VC8 原生 | VS2005 SP1 | BDN（历史版本，现在能否下载未验证） | 无 | 托管可以用 VS2026 编译（推断）；原生需要 VS2005；测试受阻 | 产品支持已结束；需要合法授权 |
| CE U17.x | 64 | .NET 4.6.2 | VS2019（v142） | BDN | 无 | 托管可以用 VS2026 + 4.6.2 targeting pack 编译（推断）；测试受阻 | 需要合法授权；2026 年时可能已过支持期 |
| MicroStation 2023 | 64 | .NET 4.8（推断） | VS2019（推断） | BDN | 无 | 同上 | 需要合法授权 |
| MicroStation 2024 | 64 | .NET 4.8 | VS2019，也支持 VS2022 | BDN | 无 | 托管：VS2026 + 4.8 targeting pack（推断） | 需要合法授权 |
| MicroStation 2025 | 64 | .NET 4.8 | VS2022 v143，支持 Build Tools | BDN | 无 | 同上；原生可以装 v143（推断可行） | 需要合法授权 |
| MicroStation 2026 | 64 | .NET 4.8 | VS2022 v143，支持 Build Tools | BDN | 无 | 同上 | 需要合法授权 |
| Revit 2024 | 64 | .NET Framework 4.8 | — | Revit SDK 随产品提供（未核实下载条件） | 无 | 未开始 | 需要 Autodesk 授权 |
| Revit 2025 / 2026 | 64 | .NET 8（`net8.0-windows`，VS 17.8+） | — | 同上 | 无 | 未开始 | 需要 Autodesk 授权 |
| Revit 2027 | 64 | .NET 10 | — | 同上 | 无 | 未开始 | 需要 Autodesk 授权 |

Revit 依据：[Autodesk：从 .NET 4.8 迁移到 .NET 8](https://help.autodesk.com/cloudhelp/2026/ENU/Revit-API/files/Revit_API_Developers_Guide/Introduction/Getting_Started/Using_the_Autodesk_Revit_API/Revit_API_Revit_API_Developers_Guide_Introduction_Getting_Started_Using_the_Autodesk_Revit_API_NET8_Update_html.html)（Revit 2025 及以后基于 .NET 8）、[Autodesk：Revit 2027 迁移到 .NET 10](https://help.autodesk.com/cloudhelp/2027/ENU/Revit-WhatsNew/files/GUID-8D7A4715-EAF8-4BD1-BE78-061F900D0BCE.htm)。Revit 不在本轮重点范围内，只列出了运行时差异。

## 4. 没有 SDK 时的托管插件路线

背景：用户没有 BDN 账号，所以拿不到 SDK。这一节评估只引用 MicroStation 安装目录里自带的程序集，能做到什么程度。

### 4.1 CE / 2023–2026

- **可以编译**（已验证）：Bentley 官方的 Add-in 教程（以 MicroStation 2026 为例）在 Visual Studio 里通过 “Browse” 直接引用 `…\MicroStation\ustation.dll`、`Bentley.DgnPlatformNET.dll`、`Bentley.DgnDisplayNet.dll`、`Assemblies\Bentley.Interop.MicroStationDGN.dll`、`Assemblies\Bentley.MicroStation.dll`、`Assemblies\ECFramework\Bentley.ECObjects.Interop3.dll` 等，输出到 `Mdlapps` 目录，整个过程没有用到 SDK（[KB0012768](https://bentleysystems.service-now.com/community?id=kb_article&sysparm_article=KB0012768)；[KB0012770](https://bentleysystems.service-now.com/community?id=kb_article_view&sysparm_article=KB0012770) 的前置条件里虽然列了 SDK，但它说的是要拿到软件和 SDK 需要加入 BDN）。LA Solutions 也只要求引用安装目录里的程序集（[链接](https://www.la-solutions.org/CONNECT/DgnPlatformNet/DotNetDevelopmentEnvironment.htm)）。
- **托管 API 能拿到的数据**（来源见 2.4 节）：

| 能力 | 托管 API 能否做到 | 依据 |
|---|---|---|
| 遍历模型元素 | 可以：`DgnModel.GetElements()` / `GetGraphicElements()` | 已验证 |
| 三角网格 | 可以：`ElementGraphicsProcessor.ProcessFacets(PolyfaceHeader, bool)` + `FacetOptions` | 已验证（社区帖）。社区专家也说过这些托管 API “相对缺少测试”，ProcessTextString 曾经有不回调的缺陷，所以每类元素都要实测 |
| UV、材质、纹理文件 | 可以拿到，但 UV 比例换算有已知问题 | 已验证存在问题 |
| Element ID | 可以：`Element.ElementId` | 已验证 |
| Level | 可以（推断，常用 API） | 推断 |
| Item Types / EC 属性 | 可以：`DgnECManager`、`CustomItemHost`、`IDgnECInstance` | 已验证 |
| 引用附件 | 可以：`DgnAttachment` 系列 | 已验证（托管 API 示例） |
| GCS | 可以：`DgnGCS.FromModel` | 已验证（名称和单位）；EPSG/WKT 的托管方法属于推断 |
| 进度和取消 | 托管 UI 和消息中心可以用 | 推断 |

- **需要原生 SDK 的部分**：
  - 托管 API 缺失或有缺陷时，需要用原生 C++ 或 C++/CLI 封装补上（例如社区建议的 ProcessTextString 的变通办法）。这需要 SDK 里的头文件和 `.lib`，而这些不在安装目录里（推断）。
  - 托管 API 的完整参考文档（CHM/HTML）随 SDK 发放。没有 SDK 时，只能参考公开的 [MicroStation Python API 文档](https://developer.bentley.com/documentation/microstation-python-api/)（它封装的是同一套原生接口，可以作为对照）、docs.bentley.com 上的 SDK 概念示例，以及社区帖子。
  - 原生插件的 bmake 和 `.mki` 规则也只在 SDK 里有。
- **运行和测试仍然需要合法授权的 MicroStation**：插件只能在 MicroStation 进程里加载（已验证：“AddIn 总是 DLL，运行在 MicroStation 的地址空间里”，LA Solutions）。没有授权，就既不能加载也不能测试。

### 4.2 V8i

- 托管插件同样可以引用安装目录里的 `ustation.dll`、`Bentley.MicroStation.dll`、`Bentley.Interop.MicroStationDGN.dll` 等，面向 .NET 3.5 编译（推断，依据是 KB0026656 的 XM 示例和 KB0040082 的 .NET 3.5 要求）。
- 能做的：用 COM 对象模型遍历元素、读取 `Element.ID`、Level、Tags，以及单元的子元素（推断，Tag 和 ID 已验证）。
- 做不到或风险很大的：**通用三角化**。V8i 的 .NET API 里没有 `PolyfaceHeader`（已验证）。剩下的办法，一是通过 P/Invoke 调用 V8i 导出的 MDL C 函数，但函数签名需要 SDK 头文件或文档才能准确写出，没有 SDK 时只能靠社区资料，容易出错（推断，未验证）；二是用 V8i 自带的 OBJ/FBX 导出命令作为纯几何基线，但会丢失构件身份（推断，和任务书的结论一致）。
- **结论**：没有 SDK 时，V8i 只能做到“读属性 + 网格质量不稳定”，不值得作为第一个目标。

### 4.3 许可注意事项（受许可限制）

- **不能再分发 Bentley 的 DLL**：插件项目引用 Bentley 程序集时，要把 Copy Local 设为 False（已验证：[VSToolsForMicroStationCONNECTEdition](https://github.com/JeaminW/VSToolsForMicroStationCONNECTEdition) 默认就这样设置），运行时由宿主提供。Bentley 的 DLL、SDK 和运行库都不能提交到公开仓库，也不能放进 GeoForge 的安装包（任务书第 4.1 节、第 7 节要求）。
- **不能反编译**：Bentley EULA 禁止对软件做 decode、reverse engineer、reverse compile（[EULA](https://www.bentley.com/legal/eula/) “LIMITATIONS ON REVERSE ENGINEERING”）。所以不能用 ILSpy 之类的工具去翻 `Bentley.DgnPlatformNET.dll` 的实现来补文档。只能依靠公开文档、SDK 文档（有 BDN 时）和社区资料。
- **开源许可兼容性**：Bentley EULA 不允许把 Bentley 软件放进要求公开源码或免费再分发的许可证（GPL/LGPL/AGPL 等）之下（已验证，EULA 原文）。GeoForge 使用 Apache-2.0。插件源码本身可以开源，但只能**引用**宿主程序集，不能包含它们（推断，建议在发布插件前请法务确认）。
- **自用与对外分发**：用合法授权的 MicroStation 加上安装目录里的程序集开发内部插件，是 Bentley 文档描述的常规用法（已验证教程路线）。对外分发插件，以及以后是否需要 BDN Commercial，要另外确认（受许可限制，未验证）。

### 4.4 VS 2026 Build Tools 面向旧版 .NET Framework

- VS 2026 支持面向 .NET Framework 4.8.1、4.8、4.7.2、4.7.1、4.7、4.6.2 和 3.5 SP1（已验证：[VS 2026 兼容性](https://learn.microsoft.com/en-us/visualstudio/releases/2026/compatibility)）。
- Build Tools 里对应的组件（已验证组件存在：[组件 ID 列表](https://github.com/MicrosoftDocs/visualstudio-docs/blob/main/docs/install/includes/vs-2026/workload-component-id-vs-build-tools.md)）：

| 目标宿主 | 目标框架 | 需要安装的组件 |
|---|---|---|
| CE U13–U17 | .NET Framework 4.6.2 | `Microsoft.VisualStudio.Workload.ManagedDesktopBuildTools` + `Microsoft.Net.Component.4.6.2.TargetingPack` |
| MicroStation 2023（推断）/2024/2025/2026 | .NET Framework 4.8 | 同上工作负载 + `Microsoft.Net.Component.4.8.TargetingPack`（工作负载里默认推荐） |
| V8i（以后再做） | .NET Framework 3.5 SP1（推断） | `Microsoft.Net.Component.3.5.DeveloperTools`，并在 Windows 上启用 .NET Framework 3.5 运行时（Windows 新版本里 3.5 改为独立安装包，见 [.NET 博客](https://devblogs.microsoft.com/dotnet/dotnet-framework-3-5-moves-to-standalone-deployment-in-new-versions-of-windows/)） |

- 这些组件现在就可以装，不需要 Bentley 许可证。但没有宿主程序集，就编译不出能用的插件（推断）。

## 5. GeoForge 与 geoforge-converter 代码审计

### 5.1 调用路径（`convert-model`）

1. 协议：`crates/protocol/src/lib.rs` 里的 `ModelTaskOptions`（第 36 行起）。`ModelFormat` 只有 `Fbx` 和 `Obj`（第 62 行）；`ModelOutputFormat` 只有 `"3dtiles-1.0"`（第 278–280 行）；`ModelTiling` 只有 `Single`（第 291 行），默认 `lod: false`。坐标模式 `GeoReferenceOptions` 有 `Local`、`Anchor`（经纬度、椭球高、pivot、HPR）和 `Projected`（`sourceCrs`、`axisMapping`、`originOffset`）三种（第 176 行起）。
2. Processor：`crates/processor/src/pipeline.rs` 的 `run_convert_model`（第 70 行起）先校验扩展名和路径，再把选项序列化成 `model-config.json`（加上 `version: 1`），然后调用 `stages::convert::run_model_convert`（`crates/processor/src/stages/convert.rs` 第 155 行，通过 `--model-config` 把配置传给 `_3dtile`）。之后依次执行 `stages::model_anchor::apply`（只处理 Anchor 模式，替换转换器 v0.2.4 的放置结果）、`validate::validate_tileset_dir_cancellable`、`commit_rename`。**`convert-model` 不会调用 `top_rebuild`**，rebuild 只在 `convert-osgb` 和 `process-tileset` 里出现（同文件第 395 行、第 461–494 行）。
3. 预检查：`crates/processor/src/stages/model.rs` 的 `scan_model_with_roots` 只检查文件、MTL 和纹理引用，不解析网格。
4. 转换器：`geoforge-converter/src/main.rs` 的 `convert_model_cmd`（第 670 行起）。Projected 模式调用 `fbx::convert_fbx_projected`，其他模式调用 `fbx::convert_fbx`。如果传了 LOD 参数，只打警告并忽略（第 789–791 行）。

### 5.2 瓦片格式与构件 ID（已验证，读代码确认）

- **输出 3D Tiles 1.0 + b3dm**：`src/FBXPipeline.cpp` 的 `FBXPipeline::createB3DM`（第 2042 行）先用 tinygltf 生成 GLB，再包成 b3dm；tileset 的 `asset.version` 是 `"1.0"`（第 2241–2242 行），`refine` 是 `REPLACE`。
- **Batch ID 的粒度是“FBX 节点实例”**：`appendGeometryToModel`（第 473 行）给每个 `InstanceRef`（网格 + 变换索引）分配一个递增的 `batchIdCounter`，按材质合并网格时，把每个顶点的 `_BATCHID` 写成 FLOAT 类型的 SCALAR accessor（第 1206–1211 行、第 1842 行）。Draco 压缩时也会把 `_BATCHID` 带上（第 1853 行）。
- **Batch table 内容**：`name` 数组加上节点属性的并集，所有值都按字符串存，缺失的填空字符串（第 2059–2098 行）。属性来自 `src/fbx.cpp` 的 `FBXLoader::collectNodeAttrs`（第 650 行），也就是 ufbx 节点 props 里每个属性的 `value_str`（推断：数值型 props 的 `value_str` 多半是空字符串，所以数字和布尔属性基本会丢失，需要用样本验证）。Feature table 只写 `BATCH_LENGTH`。
- **Batch ID 在每个瓦片内从 0 开始**：`createB3DM` 里的 `batchIdCounter = 0`，同一个构件在不同瓦片里的 ID 互不相关，只能靠 `name` 字符串去对应。
- **一个 FBX 节点可能有多个 batch ID**：一个节点里如果有多个材质分片（`processMesh` 里每个 part 是一个独立的 `MeshInstanceInfo`，见 `fbx.cpp` 第 840–870 行、第 1125–1150 行），每个分片会各自得到一个 batch ID，`name` 相同。八叉树按分片包围盒中心分配瓦片（`buildOctree`，第 393–458 行），所以同一个节点的不同分片可能落到不同瓦片里（推断，由代码逻辑推出，需要样本验证）。
- **没有 3D Tiles 1.1 支持**：两个仓库里都搜不到 `EXT_mesh_features`、`EXT_structural_metadata`、`_FEATURE_ID`。转换器只写 `KHR_draco_mesh_compression`、`KHR_materials_unlit`、`KHR_texture_basisu`。
- **HLOD 没有实现**：`settings.enableLOD = false; // HLOD not yet implemented`（第 2542 行）。中间节点没有内容，只有叶子节点有内容。

### 5.3 坐标处理

- Projected 模式：`ProjectedCoordinateContext`（`FBXPipeline.cpp` 第 36–68 行）支持 `EPSG:<code>` 或 WKT。它先用 PROJ（`coordinate_transformer.cpp`）把源坐标转到局部 ENU，顶点以 float 形式存放 ENU 坐标，tileset 根节点写入 ENU→ECEF 的 `transform`（第 2310–2322 行）。这和任务书第 4.3 节“局部原点 + transform 保护精度”的思路一致。北东轴顺序通过 `NorthEastHeight` 交换。
- Anchor 模式：转换器 v0.2.4 会把包围盒中心加到锚点上，而且忽略 pivot 和 HPR。processor 用 `model_anchor::apply` 重写根节点 transform 来修正（`crates/processor/src/stages/model_anchor.rs` 第 14–40 行的注释和实现）。
- 高程：`coordinate_transformer.cpp` 有 EGM96 大地水准面改正的开关（`GeoidConfig`），模型路径默认是 `Disabled`（第 24 行）。所以 Projected 模式下的高程按什么基准解释，要在 BIM 协议里明确写出来（推断）。

### 5.4 `top_rebuild` 对 Feature ID 的影响（已验证）

- 代理瓦片的 GLB 只写 `POSITION`、`NORMAL`、`TEXCOORD_0`（`crates/top_rebuild/src/glb.rs` 第 499–522 行），b3dm 的 feature table 固定是 `{"BATCH_LENGTH":0}`（`crates/top_rebuild/src/b3dm.rs` 第 104–106 行，`write_unbatched_b3dm`）。
- 结论：如果对 BIM 输出跑 `process-tileset` 的 rebuild，**上层代理瓦片会失去构件身份**，只有叶子瓦片保留。另外 `adapter.rs` 只处理 b3dm 输入（测试数据都是 `.b3dm`），能不能读取 3D Tiles 1.1 的 `.glb` 内容未验证。BIM 路径在 V1 阶段应当关闭 HLOD，这和任务书第 3.1 节一致。

### 5.5 校验器与 CesiumJS

- `crates/processor/src/stages/validate.rs`：`asset.version` 只要不为空就通过（第 139–144 行），所以 `"1.1"` 不会被拒。tileset 级别的 `extensionsRequired` 只允许 `3DTILES_content_gltf` 和 `KHR_*`（第 149–171 行）；`contents[]`（多内容）和 `implicitTiling` 会被拒绝（第 191–205 行）。GLB 的 `extensionsRequired` 只拦截 `KHR_draco_mesh_compression`（第 626–637 行）。`EXT_mesh_features` 和 `EXT_structural_metadata` 一般只写在 glTF 的 `extensionsUsed` 里，不会触发拒绝（推断，需要用样本跑一遍校验器确认）。
- CesiumJS：1.97（2022-09-01）开始支持 `EXT_structural_metadata`、`EXT_mesh_features`、`EXT_instance_features`（已验证：[CesiumJS 1.97 release](https://github.com/CesiumGS/cesium/releases/tag/1.97)）。桌面端依赖 `cesium 1.125.0`（`apps/desktop/package.json` 第 33 行），e2e 查看器依赖 `cesium ^1.127.0`（`tests/e2e/3dtiles-viewer/package.json`），版本都满足要求。e2e 查看器里已经有 `useFeaturePicking.ts`，用 `Cesium3DTileFeature.getPropertyIds/getProperty` 读取属性，可以直接用来做拾取测试（推断：Cesium 对 structural metadata 也通过同一个 Feature 接口暴露属性，需要实测）。
- 3D Tiles 版本：任务书要求以 3D Tiles 1.1 作为发布契约，不承诺 2.0（[CesiumGS/3d-tiles](https://github.com/CesiumGS/3d-tiles)）。

### 5.6 可复用模块与需要改造的位置

| 模块 | 可以复用 | 需要新建或改造 |
|---|---|---|
| `crates/protocol` | 坐标模式定义（`GeoReferenceOptions`）、任务外壳、错误码 | 新建 `import-bim` 操作及其选项类型。不改 `convert-model` 的语义 |
| `crates/processor` | 路径策略、temp→validate→commit 流程、取消、进度、资源预算 | 新增 BIM 导入阶段；校验器补充对 1.1 元数据的检查 |
| geoforge-converter（C++） | PROJ 坐标转换、tinygltf、Draco、KTX2 | 现有 FBX 管线的 batch 模型（每个实例一个 ID、全是字符串、每个瓦片重新编号）不适合直接改成 1.1。建议新写一个 1.1 写出模块，放在哪里由 P1 决定 |
| `top_rebuild` | 暂时不用于 BIM | 如果以后要支持，代理瓦片需要保留 Feature ID 和元数据，属于 P5 之后的工作 |
| e2e 查看器 | 拾取 composable | 增加 1.1 样本和断言 |

## 6. 交换格式技术与许可证（P0 第 5 项）

| 技术 | 许可证 | 备注 |
|---|---|---|
| glTF 2.0 / GLB | Khronos 规范，免版税（推断，常识） | 方案 A 的网格承载格式 |
| tinygltf | MIT（已验证，GitHub API） | 转换器已经内置 v2.9.7 |
| ufbx | GitHub 没有识别出 SPDX；仓库声明为 MIT/Unlicense 双许可（推断，需要人工看 LICENSE） | 转换器的 FBX 解析器 |
| FlatBuffers | Apache-2.0（已验证） | 方案 B 的候选二进制编码 |
| SQLite | 公有领域（推断，常识） | 方案 B 的候选元数据容器 |
| CesiumGS/3d-tiles-validator | Apache-2.0（已验证） | 输出校验 |
| CesiumGS/3d-tiles-tools | Apache-2.0（已验证） | 格式转换和检查 |
| KhronosGroup/glTF-Validator | Apache-2.0（已验证） | GLB 校验 |
| Cesium Native | Apache-2.0（已验证） | MicroStation 2025 挂接 3D Tiles 用的就是它 |

这些许可证都和 GeoForge 的 Apache-2.0 兼容（推断）。Bentley 和 Autodesk 的 SDK 及运行库都不能进入仓库（受许可限制）。

## 7. 建议

### 7.1 现在可以做、不依赖宿主软件的部分（建议作为下一步）

按顺序：

1. **`docs/bim/EXCHANGE-PROTOCOL.md` 草案（v0）**：先写任务书第 3.2 节列出的逻辑字段，包括 `componentKey` 的组成规则（文件 / 模型 / 引用路径 / Element ID）、属性类型（字符串、数字、布尔、空值、单位、来源）、`sourceCrs`（EPSG 或 WKT）、垂直基准、`unitScale`、双精度 `transform`。承载方式先选方案 A（GLB 分块 + JSON 清单），这样可以复用 tinygltf，P1 再和方案 B 比较。
2. **合成测试样本**：用脚本生成，不依赖任何宿主软件。内容覆盖任务书第 6 节：两个 Level、至少 5 个属性各不相同的构件、同名但来源不同的属性、中文属性值、一个重复实例、一个旋转加镜像的实例、一个跨瓦片的构件、纯色、透明和贴图三种材质、一组 CGCS2000 投影坐标（具体 EPSG，例如 3-degree Gauss-Kruger CM 114E 对应的 EPSG:4547，用前需要核对）和 3 个控制点。
3. **processor `import-bim` 原型**：读取上面的交换包，输出单瓦片的 3D Tiles 1.1，`asset.version` 写 `"1.1"`，内容是 GLB，带 `EXT_mesh_features`（每个顶点一个 feature ID）和 `EXT_structural_metadata`（property table，schema 写在 tileset 或 glTF 里）。V1 关闭 HLOD 和简化。用 Rust 实现（P2 决定是否迁到 converter），不改动现有 OSGB/FBX/OBJ 路径。
4. **校验与拾取测试**：先用 3d-tiles-validator 和 glTF-Validator 跑输出；再在 e2e 查看器（CesiumJS 1.127+）里写 Playwright 用例，断言拾取到的构件能读出 `componentKey`、Level 和属性，并按 Level 筛选显示。
5. 所有内容都放在独立分支和独立 PR 里，不改变 `convert-model` 的语义。

做完这几步，就具备了 P1 所需的“Exchange → 3D Tiles 1.1 → Cesium 拾取”闭环，以后有了宿主环境，只需要把合成样本换成宿主导出的真实数据。

### 7.2 有了合法宿主环境之后的适配器顺序

1. **CE 适配器（第一个）**：C# 托管 Add-in，优先面向 MicroStation 2024/2025/2026（.NET 4.8），其次是 CE U17（.NET 4.6.2）。第一步只做 `ElementGraphicsProcessor` 导出网格、Element ID、Level、Item Types、GCS，写出交换包，在 30 天试用期内完成 P1 验证。UV 比例换算、引用模型变换、参数化单元要单独列测试项。
2. **视需要补原生 C++ 部分**：托管 API 覆盖不了的地方（UV 映射、某些实体类型），在拿到 BDN 和 SDK 之后再用 C++ 补，编译器按 2.3 节表格选择。
3. **V8i 适配器（最后，而且要满足前提）**：只有在合法授权的 V8i 环境存在，并且有必须在 V8i 里导出的业务场景时才做。在那之前，V8i 图纸先交给 CE 适配器处理。
4. **Revit 适配器**：放在 P4，复用同一个 Exchange 协议。

### 7.3 Gate P0 结论

- 宿主侧：**未通过，受阻**。原因是没有合法授权的 MicroStation 或 Revit，也没有 SDK 和 BDN。
- 代码侧：已经确认现有能力和需要补的空白（见第 5 节）。
- 下一步：先做第 7.1 节的宿主无关工作，同时由用户推进第 1.3 节的阻塞清单。

## 附录：待补事项

- geoforge-converter 仓库根目录**没有 LICENSE 文件**（上游 fanvanzh/3dtiles 的许可证见 `docs/UPSTREAM.md`）。如果要把 BIM 写出模块放进 converter，需要先补上许可证声明。
