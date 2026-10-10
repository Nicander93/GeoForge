# IFC 转换

GeoForge 可以把 IFC 文件转成单瓦片的 3D Tiles 1.1。每个有几何的构件是一个 Feature（`EXT_mesh_features`），GlobalId、IFC 类、名称、楼层和全部属性集、数量集（包括自定义属性集）写进 `EXT_structural_metadata` 属性表。转换由 Processor 的 `convert-ifc` 操作调起独立的 IFC 工具进程完成，工具基于 IfcOpenShell。

Spike 阶段的实现细节和测试数据见 [SPIKE-REPORT.md](SPIKE-REPORT.md)。

## 在桌面端使用

1. 在“工具”页打开“IFC 转换”。
2. 选择 `.ifc` 文件和保存位置。应用会在保存位置里新建 `<文件名>_tiles_<编号>` 目录，不会覆盖已有目录。保存位置不能在 IFC 文件所在目录内，也不能包含这个目录，这和 FBX / OBJ 转换的规则一样。
3. 选择定位模式：

   | 模式 | 做法 |
   | --- | --- |
   | 自动（默认） | 先找 `IfcMapConversion`（IFC2X3 里是 `ePSet_MapConversion`），按其中的 CRS 定位；没有时用 `IfcSite` 的经纬度近似定位；都没有时保留本地坐标 |
   | 保留本地坐标 | 不写地理变换，预览页把模型放在默认位置 |
   | WGS84 锚点放置 | 把 IFC 项目原点放到填写的经度、纬度和椭球高，X 朝东、Y 朝北、Z 朝上 |
   | 指定 CRS | 用填写的 CRS（如 `EPSG:4547`）代替文件里的 CRS。文件有 MapConversion 时仍用它的偏移和旋转；没有时把 IFC 坐标直接当作该 CRS 的东、北、高 |

4. 需要时打开“高级设置”：
   - “仅转换这些类”“排除这些类”：多个类名用逗号或空格分隔，按 IfcOpenShell 的 `is_a` 判断，子类一并生效，例如排除 `IfcWall` 也会排除 `IfcWallStandardCase`。同一个类不能同时出现在两边。文件 schema 里不存在的类名会被忽略，并在任务日志里给出警告。
   - “保留全为空的属性列”：默认关闭，所有构件都没有值的属性不写进瓦片。打开后这些属性只出现在 schema 的类定义里，属性表里没有对应的列，不占数据空间。
   - 任务名。
5. 点“开始转换”后跳到任务页，进度、日志和失败原因与其他任务一样显示。转换线程数沿用“设置”里的资源配置（自定义模式下的 CPU 并发数）。

成果目录里有：

| 文件 | 内容 |
| --- | --- |
| `tileset.json` | `asset.version` 为 `1.1`，只有一个根瓦片 |
| `content.glb` | 全部构件，不透明和半透明各一个图元 |
| `ifc-report.json` | 转换摘要：schema、构件数、各类数量、楼层列表、跳过的构件、属性列数、定位方式和警告 |

### 预览里查看构件属性

在“预览与编辑”打开成果，点工具栏的“属性”：

- 点击模型里的构件，构件高亮成黄色，右侧显示 GlobalId、IfcClass、Name、Storey，其余属性按名称里的第一个点分组，例如 `Pset_WallCommon.FireRating` 显示在 `Pset_WallCommon` 组的 `FireRating` 下。名称里没有点的属性放在“其他属性”组。没有值的属性不显示。
- “显示”区按 IFC 类和楼层列出已加载瓦片里的构件数，取消勾选即可隐藏对应构件，“全部显示”恢复。关闭面板时会恢复全部显示。

这个面板不只用于 IFC 成果：任何带 `EXT_structural_metadata` 属性表的 3D Tiles 1.1 数据都能点选查看属性；属性表里有 `IfcClass` 或 `Storey` 列时才出现对应的筛选。属性显示名取自 schema 里属性的 `name`，没有 `name` 时显示列 ID。

## 任务协议

`operation` 为 `convert-ifc`，`input.path` 是 `.ifc` 文件，`output.path` 是新的成果目录。`options` 对应 `crates/protocol` 里的 `IfcTaskOptions`，未知字段会被拒绝：

```json
{
  "version": 1,
  "georeference": { "mode": "anchor", "longitudeDeg": 114.17, "latitudeDeg": 22.3, "ellipsoidHeightM": 5 },
  "includeClasses": [],
  "excludeClasses": ["IfcFurnishingElement"],
  "dropEmptyColumns": true,
  "execution": { "cpuWorkers": 4 }
}
```

- `version` 必填，目前只接受 `1`。
- `georeference.mode` 为 `auto`（默认）、`local`、`anchor`（需要 `longitudeDeg`、`latitudeDeg`、`ellipsoidHeightM`）或 `crs`（需要 `sourceCrs`）。
- `dropEmptyColumns` 默认 `true`。
- `execution` 与其他操作相同，IFC 只用其中的 CPU 并发数作为三角化线程数。

Processor 的阶段依次是 `scan`（检查输入和路径）、`convert`（运行 IFC 工具）、`validate`（现有的 tileset 校验）、`commit`。IFC 不会调用 `top_rebuild`，因为它会丢掉 Feature ID。失败时的错误码：

| 错误码 | 含义 |
| --- | --- |
| `IFC_CONFIG_INVALID` | `options` 不符合上面的格式，或类名、锚点取值不合法 |
| `IFC_INPUT_INVALID` | 输入不是存在的 `.ifc` 文件 |
| `IFC_TOOL_MISSING` | 找不到 IFC 工具 |
| `IFC_CONVERT_FAILED` | IFC 工具运行失败，错误信息取自工具输出 |

转换成功时会输出 `ifc.elements`、`ifc.skipped.withoutGeometry`、`ifc.skipped.excludedByClass`、`ifc.columns`、`ifc.columns.empty`、`ifc.georeference` 等指标。工具给出的警告（如 `IFC_NO_GEOREFERENCE`、`IFC_SITE_REFERENCE_APPROXIMATE`、`IFC_CRS_OVERRIDDEN`、`IFC_UNKNOWN_CLASS`、`IFC_ELEMENTS_WITHOUT_GEOMETRY`）写进任务日志和 `ifc-report.json`。

### Processor 和 IFC 工具之间的约定

Processor 这样调用工具：

```text
geoforge-ifc convert <输入.ifc> <暂存目录> --exchange-dir <临时目录> --progress jsonl --threads <N> --georef <模式> ...
```

加上 `--progress jsonl` 后，工具在标准输出上每行写一个 JSON 对象，都带 `"geoforgeIfc": 1` 和 `event` 字段，`event` 为 `stage`、`progress`、`warning`、`summary` 或 `error`。Processor 解析这些行，其他输出当作普通日志。进度在每个阶段内最多每 0.25 秒输出一次。取消任务时 Processor 结束工具进程，临时目录随之清理。

## 找到 IFC 工具的顺序

1. 环境变量 `GEOFORGE_IFC_TOOL` 指定的可执行文件。
2. 运行时目录下的 `ifc/geoforge-ifc(.exe)`，安装包里就是 `resources/runtime/ifc/`。
3. 与 `processor` 同目录的 `geoforge-ifc(.exe)`。
4. 仅限源码目录（非安装包）：环境变量 `GEOFORGE_IFC_PYTHON` 指向的 Python 加 `tools/ifc/cli.py`。

都找不到时任务失败，错误码 `IFC_TOOL_MISSING`。安装包里提示“组件缺失，请修复安装”，开发环境会列出查过的路径和上面几个环境变量。`processor capabilities --json` 的 `ifc` 字段给出 `ready`、`kind`（`executable` / `script` / `missing`）、路径和原因，桌面端据此在转换页显示提示并禁用“开始转换”。

## 开发环境

```bash
uv venv --python 3.12 .venv-ifc
uv pip install -p .venv-ifc -r tools/ifc/requirements.txt
export GEOFORGE_IFC_PYTHON=$PWD/.venv-ifc/bin/python      # Windows: $env:GEOFORGE_IFC_PYTHON = "$PWD\.venv-ifc\Scripts\python.exe"

python -m unittest discover -s tools/ifc/tests             # 用上面的 Python 运行
cargo test --workspace --locked                            # convert_ifc 集成测试在设置了 GEOFORGE_IFC_PYTHON 时才运行
cd apps/desktop
npm run test:e2e -- tests/e2e/ifc-feature-pick.spec.mjs tests/e2e/ifc-property-panel.spec.mjs
```

Processor 的其余 IFC 测试用模拟工具，不需要 Python。桌面端的 `npm run test:ui` 里有 IFC 页面和属性面板的测试，属性面板用 `scripts/create-metadata-fixture.mjs` 生成的小数据集，也不需要 Python。

## 打包

安装包里放的是用 PyInstaller 冻结的 `geoforge-ifc` 目录（onedir），不需要用户另装 Python：

```powershell
# 需要 Python 3.12；脚本在 tools/ifc/build/venv 里安装依赖和 PyInstaller 6.16.0
pwsh -File apps/desktop/scripts/prepare-ifc.ps1 -PythonCommand py
```

脚本使用 `tools/ifc/geoforge-ifc.spec`，输出到 `tools/ifc/dist/geoforge-ifc/`（`geoforge-ifc.exe` 和 `_internal/`），然后用这个 exe 生成测试模型并转换一次作为冒烟检查。`package-windows.ps1` 在缺少这个目录时会先调用 `prepare-ifc.ps1`，再把它复制到 `apps/desktop/src-tauri/resources/runtime/ifc/`。Tauri 已经把整个 `resources/runtime/` 打进安装包，不需要再改 `tauri.conf.json`。`-SkipIfcBundle` 可以跳过 IFC 工具。

`release-windows.yml` 额外安装一个 Python 3.12（pip 缓存以 `tools/ifc/requirements.txt` 为键），原来给纹理工具用的 Python 3.11 仍是默认 Python。打包后的检查会确认 `runtime/ifc/geoforge-ifc.exe` 存在，并要求 `processor capabilities --json` 报告 `ifc.ready = true`、`kind = executable`。

spec 里有几处是 IfcOpenShell 0.9 需要的特殊处理：

- IfcOpenShell 运行时从自己的包目录加载 schema、几何映射和几何内核插件。PyInstaller 的依赖分析找不全这些库，所以 spec 把包目录下的全部动态库原样放到 `_internal/ifcopenshell/`，`cli.py` 在冻结环境里调用 `ifcopenshell.set_plugin_search_paths` 指向这个目录。
- `ifcopenshell.express` 缺少 `express_parser.py` 时会在包目录里重新生成它。安装目录通常不可写，所以这个文件作为数据文件一起打包。
- 派生属性靠 `ifcopenshell.express.rules` 下按名称导入的模块计算，spec 把它们列为隐藏导入。
- `shapely` 和 `lark` 是 IfcOpenShell 的依赖，不能排除。

IfcOpenShell 使用 LGPL-3.0-or-later 许可证。它保持为 `_internal/` 下单独的文件，在 GeoForge 之外的独立进程里运行，没有链接进 GeoForge 的程序。

在盒子的 Linux 上用 Python 3.12 构建过这个 spec，得到的目录约 335 MB；在只读安装目录、清空环境变量的条件下，冻结后的工具能生成测试模型，并转换测试模型和两份公开样例，Processor 通过运行时目录找到它并完成了一次 `convert-ifc` 任务。Windows 上的构建、打包和安装包还没有验证。

## 限制

- 只输出一个瓦片，没有按楼层或空间切分，也没有 LOD。大模型的全部几何一次性读进内存，每个三角形用 3 个独立顶点，没有几何压缩，内存占用和文件体积都会偏大。目前只测过几 MB 的样例。
- 只用 IFC 表面样式的颜色和透明度，不读贴图。
- 高度直接当作椭球高，没有大地水准面改正；投影坐标在原点附近线性化，适合单栋建筑的范围。只有 `IfcSite` 经纬度时定位是近似的，没有应用真北方向。
- 复杂属性（枚举、列表、范围、表格、引用）存成文字；属性值没有换算单位，单位写在 schema 属性的 `description` 里。布尔属性在有构件缺值时存成 1 / 0，面板里也显示为 1 / 0。
- 聚合体的父对象（如 `IfcRoof`、`IfcStair`）自身没有几何时不会成为 Feature，它的属性不会传给子构件。默认跳过 `IfcSpace`、开洞和虚拟构件。
- 属性面板的显示名从 Cesium 内部的属性表对象读取（对应 Cesium 1.125），升级 Cesium 时需要重新检查；读不到时退回显示列 ID。筛选和计数只覆盖已经加载的瓦片，对单瓦片的 IFC 成果就是全部构件。
- 只测过 IFC2X3 和 IFC4 文件，没有测过 IFC4X3 和 ifcZIP。
