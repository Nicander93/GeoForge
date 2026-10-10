# IFC → 3D Tiles 1.1 首个 Spike 报告

> 日期：2026-10-10（Asia/Shanghai）
> 分支：`feat/ifc-spike`，基于 GeoForge `master` `9a580f3`
> 计划：IFC 路线与 Spike 计划（IfcOpenShell 外部进程 + 新的 3D Tiles 1.1 写出）

## 结论

Spike 的目标已经达到：一份带自定义属性集的 IFC 文件，可以转成单瓦片的 3D Tiles 1.1，在 Cesium 里点选某个构件后，读到的 GlobalId、类名、名称、楼层和自定义属性值都和交换包里的记录一致。两个校验器对三份输出都没有报错误。现有的 OSGB、FBX、OBJ 转换路径没有改动。

这次实现全部放在 `tools/ifc/` 的 Python 脚本里，Processor、协议和桌面界面都还没有接入，所以用户在桌面端还不能选 `.ifc` 文件转换。

## 做了什么

整条链路分两步，中间用交换包隔开：

1. `exchange.py`：用 IfcOpenShell 打开 IFC，按世界坐标（`use-world-coords`）对每个 `IfcElement` 三角化，写出交换包：
   - `geometry.bin`：float32 顶点坐标和法线、uint8 RGBA 颜色。每个三角形的三个角各占一个顶点，按平面着色，不用索引缓冲。坐标单位是米，Z 轴朝上，减去了模型包围盒底面中心 `origin`，这样 float32 在远离原点的项目里也能保持毫米级精度。
   - `manifest.json`：每个构件的 `globalId`、`ifcClass`、`name`、`storey`、在 `geometry.bin` 里的顶点范围，以及全部属性集和数量集。属性按“属性集名.属性名”展开，每个值都带 `dataType`（string / number / integer / boolean）、原始 IFC 类型（如 `IfcLabel`、`IfcReal`、`IfcQuantityLength`）和单位。实例上的属性会覆盖类型对象上的同名属性。枚举值、列表值、范围值、表格值和引用值这几种复杂属性，第一版统一转成文字保存。
   - 坐标信息：IFC4 的 `IfcMapConversion` + `IfcProjectedCRS`，或者 IFC2X3 的 `ePSet_MapConversion` / `ePSet_ProjectedCRS`，用 IfcOpenShell 自带的换算函数算出“局部米制坐标 → 投影坐标”的 4×4 仿射矩阵 `localToMap`；只有 `IfcSite` 经纬度时记为 `site-reference`；都没有时记为 `local`。
   - 默认跳过 `IfcOpeningElement` 等开洞实体、`IfcVirtualElement` 和 `IfcSpace`（空间会把真实构件包住），`--include-spaces` 可以把空间加回来。
2. `tiles.py`：只读交换包，不依赖 IfcOpenShell，写出：
   - `content.glb`：一个网格，不透明和半透明（`alphaMode: BLEND`）各一个图元。每个顶点带 `_FEATURE_ID_0`，值是构件在属性表里的行号，通过 `EXT_mesh_features` 关联到属性表。
   - `EXT_structural_metadata`：一个类 `ifc_element`、一张属性表，每个构件一行。固定字段是 `GlobalId`、`IfcClass`、`Name`、`Storey`，其余每个 `Pset.Prop` 一列。列 ID 只能用字母、数字和下划线，所以 `GF_Custom.AssetCode` 的列 ID 是 `GF_Custom_AssetCode`，原名写在属性的 `name` 里，单位和 IFC 类型写在 `description` 里。
   - `tileset.json`：`asset.version` 为 `1.1`，只有一个根瓦片。`map-conversion` 模式下，用 pyproj 把投影坐标换成经纬度，再在原点附近按 10 米步长线性化，得到根瓦片的 ECEF `transform`；`site-reference` 模式下用 `IfcSite` 经纬度建 ENU 坐标系；`local` 模式不写 `transform`，由预览页套默认 ENU。

属性表里缺失值的处理：

| 列类型 | 条件 | 缺失值 |
| --- | --- | --- |
| `STRING` | 文字，或同一列里类型混杂 | `noData: ""`，Cesium 读出来是 `undefined` |
| `SCALAR FLOAT64` | 数字，或整数和小数混在一列 | `noData: -1.7976931348623157e308` |
| `SCALAR INT32` | 全部是 32 位范围内的整数 | `noData: -2147483648` |
| `BOOLEAN` | 布尔值且每个构件都有 | 不需要 |
| `SCALAR INT8` | 布尔值但有构件缺这个属性 | 1 / 0，`noData: -1`。规范不允许 `BOOLEAN` 带 `noData`，只能这样存 |

所有构件都没有值（或都是空字符串）的列不写进瓦片，因为 glTF 不允许长度为 0 的 bufferView，这些属性仍然保留在 `manifest.json` 里。

## 命令和版本

```bash
python -m venv .venv
.venv/bin/pip install -r tools/ifc/requirements.txt
.venv/bin/python tools/ifc/cli.py fixture out/fixture.ifc
.venv/bin/python tools/ifc/cli.py convert out/fixture.ifc out/fixture
.venv/bin/python -m unittest discover -s tools/ifc/tests -v

# 校验（两个校验器都装在仓库外的临时目录，没有加进仓库依赖）
npx 3d-tiles-validator --tilesetFile out/fixture/tiles/tileset.json
# gltf-validator 的 npm 包没有命令行，用几行 Node 脚本调用它的 validateBytes 检查 content.glb

# Cesium 点选测试
cd apps/desktop
GEOFORGE_IFC_PYTHON=../../.venv/bin/python npx playwright test tests/e2e/ifc-feature-pick.spec.mjs
```

| 组件 | 版本 |
| --- | --- |
| Python | 3.13.5（盒子上的 Linux 环境） |
| ifcopenshell | 0.9.0（LGPL-3.0-or-later，独立 Python 进程，不链接进 GeoForge） |
| numpy / pyproj | 2.5.3 / 3.8.0 |
| 3d-tiles-validator | 0.6.1 |
| gltf-validator（npm） | 2.0.0-dev.3.10 |
| Cesium（桌面端预览页） | 1.125.0 |
| Playwright / Chromium headless | 1.63.0 / chromium-1243 |

## 测试数据

| 文件 | 来源 | 许可证 | 大小 | Schema | 说明 |
| --- | --- | --- | --- | --- | --- |
| `fixture.ifc`（生成） | `tools/ifc/fixture.py` | 本仓库 Apache-2.0 | 约 10 KB | IFC4 | 7 个构件、2 个楼层；`GF_Custom` 自定义属性集含文字、小数、整数、布尔和枚举值；`EPSG:2326`（HK1980 Grid）+ 旋转 30° 的 MapConversion；带一个半透明窗。这是单元测试和 e2e 的标准输入 |
| `Duplex_A_20110907.ifc` | [buildingsmart-community/Community-Sample-Test-Files](https://github.com/buildingsmart-community/Community-Sample-Test-Files/tree/main/IFC%202.3.0.1%20(IFC%202x3)/Duplex%20Apartment)（Git LFS） | CC BY 4.0 | 2,380,763 字节 | IFC2X3 | Revit 2011 导出；带 `PSet_Revit_*` 等非标准属性集；只有 `IfcSite` 经纬度 |
| `Building-Architecture.ifc` | [buildingSMART/Sample-Test-Files](https://github.com/buildingSMART/Sample-Test-Files/tree/main/IFC%204.0.2.1%20(IFC%204%20ADD2%20TC1)/Simple-Scene) | CC BY 4.0 | 142,325 字节 | IFC4 | 带 `IfcMapConversion` + `EPSG:32760`，项目单位毫米，`Scale = 0.001` |

两份下载样例没有放进仓库，只在本地验证用。SHA-256：Duplex `b347a2c8…c606ed`，Building-Architecture `8790a1e1…079e2e80`。

## 结果

| 输入 | 有几何的构件 | 无几何 | 属性表列数 | 坐标模式 | 转换耗时 | `content.glb` |
| --- | --- | --- | --- | --- | --- | --- |
| fixture | 7 | 0 | 13 | map-conversion（EPSG:2326） | 0.21 秒 | 14.8 KB |
| Building-Architecture | 11 | 2 | 16 | map-conversion（EPSG:32760） | 0.33 秒 | 113.7 KB |
| Duplex_A | 215 | 3 | 225 | site-reference（近似） | 1.0 秒 | 2.98 MB |

耗时是盒子上单次运行的数字，只能说明小模型很快，不能代表大文件的表现。

“无几何”的 5 个构件都是聚合体的父对象（`IfcRoof`、`IfcStair`、`IfcChimney`），几何在它们的子构件上，子构件各自有 Feature，父对象自身的属性目前不进瓦片。

校验结果：

- gltf-validator：三份 `content.glb` 都是 0 错误、0 警告。信息级提示只有两类：校验器不认识 `EXT_mesh_features` / `EXT_structural_metadata`，以及这两个扩展引用的 bufferView 被报为“可能未使用”。
- 3d-tiles-validator：三份 tileset 都是 0 错误、0 警告。这个校验器会检查 `EXT_structural_metadata` 的属性表结构；第一版曾因为全空的字符串列报 `METADATA_INVALID_LENGTH`，改成不写全空列后通过。

Cesium 点选：

- `ifc-feature-pick.spec.mjs` 通过。测试从南面近距离看模型，在画面上按网格调用 `scene.pick`，对每个点到的构件核对 `GlobalId`、`IfcClass`、`Name`、`Storey` 是否和 `manifest.json` 一致，再确认南墙被点到，且 `GF_Custom_AssetCode = GF-W-001`、`GF_Custom_DesignLoad = 12.5`、`GF_Custom_InstallYear = 2026`、`GF_Custom_Inspected = 1`、`Pset_WallCommon_FireRating = REI60`。最后把南墙高亮成黄色并截图，页面没有控制台错误。
- 没有设置 `GEOFORGE_IFC_PYTHON` 时这个测试会跳过，CI 目前就是这种情况。
- 另外手工用同样的方法看了两份下载样例：Duplex 点到 24 个构件、Building-Architecture 点到 3 个，读到的类名和名称都与交换包一致，没有页面错误。Duplex 落在芝加哥（41.874°N，87.639°W），和它 `IfcSite` 里的经纬度一致；Building-Architecture 落在 8.46°S、179.08°E，这是按样例里的 MapConversion 和 EPSG:32760 换算出来的位置，我没有找到独立的参考坐标来核对。这两份只是手工检查，没有写成自动测试。

现有测试：`cargo test --workspace --locked` 266 项全部通过；`npm test` 通过；`npm run test:e2e` 14 项通过，3 项需要真实转换数据的照旧跳过。

## 还没做或没验证的部分

- **接入产品**：还没有 Processor 操作（`import-ifc` 或 `convert-ifc`）、协议字段、桌面端文件选择和属性面板，也没有把 Python 和 IfcOpenShell 打包进安装包。
- **Windows 环境**：所有命令都只在盒子的 Linux 上跑过，没有在你的 Windows 电脑上验证。
- **LOD 和切分**：只输出一个瓦片，没有按楼层或空间切分，也没有 HLOD；`top_rebuild` 会丢 Feature ID，不能用于 IFC 输出。
- **材质和纹理**：只用 IFC 表面样式的漫反射颜色和透明度写顶点色，不读贴图、不处理 UV；没有样式的面统一用浅灰色。
- **大文件**：没有测过几十 MB 以上的模型。现在所有几何一次性读进内存再写出，每个三角形 3 个独立顶点，也没有 Draco 或 meshopt 压缩；大模型的内存和文件体积都会偏大。
- **坐标精度**：高度直接当作椭球高，没有大地水准面改正；投影在原点附近按 10 米步长线性化，单栋建筑范围内够用，对长距离的线性工程不够。`site-reference` 模式没有应用 `TrueNorth`，`IfcSite` 的经纬度对应场地原点，所以位置只是近似。`IfcMapConversionScaled` 的分轴比例因子由 IfcOpenShell 读取，但没有样例验证过。
- **属性**：复杂属性只存成文字；值没有换算到统一单位，单位只记在说明里；属性很多时（Duplex 有 225 列）所有列都放进瓦片，没有按需拆到旁边的 JSON；聚合父对象的属性不会传给子构件；字符串的 `noData` 是空串，真正的空字符串也会读成缺失。
- **Feature ID**：用 FLOAT 存，超过 1677 万个构件会失去精度，单瓦片场景下不会遇到。
- **IFC 版本**：只测过 IFC2X3 和 IFC4，没有测 IFC4X3 和 ifcZIP。

## 下一步建议

1. 在 Windows 上装 Python 和 `tools/ifc/requirements.txt`，用你手头的真实 IFC 跑一遍 `convert`，看构件数、属性和位置对不对。
2. 在 Processor 里新增 `import-ifc` 操作：Rust 侧调用 `tools/ifc/exchange.py` 生成交换包（外部进程，符合 LGPL 的要求），再用 Rust 重写 `tiles.py`。`tiles.py` 只依赖交换包格式，可以直接对照移植；投影换算可以复用 Processor 已有的坐标处理逻辑。然后接入 temp → validate → commit、取消和进度上报。
3. 桌面端加 `.ifc` 输入和点选后的属性面板，属性名用 schema 里的 `name` 显示。
4. 按楼层切分瓦片，加几何压缩，再找一份几十 MB 级的公开 IFC 测内存和耗时。
