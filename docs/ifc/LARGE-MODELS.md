# 大模型转换

这一页说明 IFC 转换在第三阶段为大模型做的改动：交换数据怎样流式写盘、瓦片怎样划分、几何怎样压缩，以及改动前后的测试数据。使用方法和任务协议见 [README.md](README.md)。

## 处理流程

转换分两步，中间通过交换目录传递数据（格式 `geoforge-ifc-exchange`，版本 2）：

1. `exchange.py` 用 IfcOpenShell 的几何迭代器三角化构件，线程数取自 Processor 传入的 `--threads`。每处理完一个构件就把它写进交换目录，不在内存里攒全部几何：
   - `geometry.bin`：每个构件最多两个带索引的网格（不透明、半透明）。法线取面法线，同一构件内坐标、法线和颜色都相同的角点合并成一个顶点，例如一个长方体从 36 个顶点减到 24 个。坐标是相对构件包围盒最小角的 float32，包围盒本身用 float64 记录，所以远离项目原点的构件也能保持毫米级精度。
   - `elements.jsonl`：每行一个构件的 GlobalId、IFC 类、名称、楼层和带类型的属性。
   - `elements.npy`：每个构件一行，记录包围盒、三角形数、顶点数，以及在上面两个文件里的偏移。
   - `manifest.json`：来源、定位、全模型包围盒、各类和各楼层的构件数，以及每个属性列的统计（类型、取值范围、有值的构件数）。
2. `tiles.py` 只读交换目录，不依赖 IfcOpenShell。它用 `np.memmap` 按需读取几何，先用 `tiling.py` 划分瓦片，再用多个线程分别写出各瓦片的 glTF。

多个构件共用同一个表示时（`IfcMappedItem`、类型几何），几何迭代器给出的几何 ID 相同。`exchange.py` 按这个 ID 缓存已经三角化的网格，后面的构件只做坐标变换，不再三角化。合成模型里约九成构件命中这个缓存，Clinic 样例约三成，Schependomlaan 没有共享几何。

## 瓦片划分

`tiling.py` 生成显式的瓦片树（不用隐式分块），所有瓦片的 `refine` 都是 `ADD`：

- 每个构件整件放进且只放进一个瓦片，不切分构件。
- 一个节点的构件数和三角形数都在上限内时，它就是叶子瓦片。
- 否则，节点先留下相对自身较大的构件：包围盒对角线不小于节点对角线 1/4 的构件按从大到小排列，在上限内尽量留下。剩下的构件按中心点的中位数分到子节点。切分轴取最长轴，以及长度至少为最长轴一半的其他轴，最多分成 8 份；只要份数够分摊上限就停止，所以略超上限的节点只分成 2 个子节点。
- 结果是大楼板、外墙留在靠近根的瓦片里，家具、灯具这类小构件在叶子瓦片里。
- 瓦片的 `geometricError` 取它下面所有构件中最大的包围盒对角线，也就是子瓦片还没加载时屏幕上缺少的最大尺寸。叶子瓦片为 0。`tileset.json` 顶层的 `geometricError` 是全模型包围盒的对角线。
- 构件排序以 GlobalId 为准，输入顺序和线程数不影响结果，同一个文件每次转换得到相同的瓦片。

每个瓦片的要素编号从 0 开始，属性表只有本瓦片的构件。所有瓦片使用同一个 schema 和同一个类，所以同名属性在各瓦片里类型一致，预览面板的点选和按 IfcClass、Storey 筛选在所有瓦片上都能用。`tileset.json` 的 `extras.geoforge` 记录全模型的构件数和各类、各楼层的计数，面板用它显示还没加载的瓦片里的类和楼层。需要按 GlobalId 找构件时，可以打开 `writeGlobalIdIndex` 生成 `index.json`。

属性表的编码也针对大模型做了调整：整数列按全模型取值范围选 INT8、INT16 或 INT32，字符串偏移按本瓦片的数据量选 UINT8、UINT16 或 UINT32；某个瓦片里没有任何值的可选列不写入这个瓦片。schema 超过 32 KB 且有多个瓦片时写成单独的 `schema.json`，避免每个瓦片重复一份。

## 几何压缩

默认使用 `KHR_mesh_quantization`：位置存为 16 位整数，每个瓦片一个统一缩放，坐标误差不超过瓦片最长边的 1/65535；法线存为 8 位。设 `quantizeGeometry: false` 时改回 float32。

以下两项没有做：

- `EXT_meshopt_compression`：需要额外引入 meshoptimizer 编码器，冻结工具也要随之增加依赖。这一阶段先用量化，合成模型的成果体积已约减半。是否值得再加，可以等真实大模型的数据再决定。
- `EXT_mesh_gpu_instancing`：共享几何在转换时已经复用，但写进 glTF 时每个构件仍是独立的网格。用实例化要把每个实例的要素编号和属性对上（需要 `EXT_instance_features`），这一阶段没有验证 Cesium 对这种组合的拾取和筛选，所以没有采用。

## 测试数据

`tools/ifc/synthetic.py`（命令 `geoforge-ifc synthetic`）生成办公楼式的合成模型：每层一块大楼板、外墙、按 6 m 柱网排列的柱、梁、隔墙、门、窗、家具和灯具。家具、灯具、门窗、柱梁用类型几何（`IfcMappedItem`）重复使用，构件大小从整层楼板到小家具都有，GlobalId 由种子确定，每次生成的模型相同。楼层数默认按构件数估算，也可以用 `--storeys` 指定。

真实样例取自 [buildingsmart-community/Community-Sample-Test-Files](https://github.com/buildingsmart-community/Community-Sample-Test-Files)，该仓库说明提交的文件按 CC BY 4.0 发布。样例只在本地测试用，没有提交进仓库：

| 样例 | 大小 | schema |
| --- | --- | --- |
| `Clinic_Architectural.ifc` | 13 MB | IFC2X3，2586 个有几何的构件，217 个属性列 |
| `Schependomlaan.ifc` | 65 MB | IFC2X3，3505 个有几何的构件，6092 个属性列 |

## 性能对比

测试在盒子的 Linux 上进行（8 核，15 GB 内存），Python 3.12、IfcOpenShell 0.9.0，改动前后都用 `--threads 4`，各运行一次。“改动前”是 `48d1b53` 的 `tools/ifc`（单瓦片，不建索引，不量化），“改动后”是本分支的默认设置（自适应分块，每个瓦片最多 2000 个构件、250000 个三角形，量化）。时间是 `cli.py convert` 的总耗时，内存是进程树常驻内存的峰值（每 0.2 秒采样），体积是成果目录的总大小。两边的构件数和三角形数相同。

| 模型 | 构件 | 三角形 | 时间 前 → 后 | 内存峰值 前 → 后 | 成果体积 前 → 后 | 瓦片（有内容）/ 深度 |
| --- | ---: | ---: | --- | --- | --- | --- |
| 合成 10k | 10144 | 121728 | 4.4 s → 2.8 s | 257 MB → 228 MB | 12.6 MB → 6.5 MB | 13（9）/ 3 |
| 合成 50k | 50720 | 608640 | 21.6 s → 14.6 s | 1187 MB → 666 MB | 62.8 MB → 32.5 MB | 41（33）/ 3 |
| 合成 100k | 101440 | 1217280 | 43.1 s → 28.9 s | 2366 MB → 1251 MB | 125.6 MB → 64.9 MB | 73（65）/ 3 |
| Clinic | 2586 | 172065 | 8.0 s → 3.8 s | 617 MB → 389 MB | 20.2 MB → 12.4 MB | 3（3）/ 2 |
| Schependomlaan | 3505 | 258678 | 19.0 s → 15.8 s | 1407 MB → 827 MB | 149.3 MB → 89.0 MB | 3（3）/ 2 |

改动后的内存峰值里，IfcOpenShell 打开文件本身占了相当一部分：合成 100k 在 `open` 阶段结束时进程的内存峰值已到 648 MB，`tessellate` 阶段结束时为 1251 MB，`tiles` 阶段没有再增加（`ifc.phases` 指标里能看到每个阶段的耗时和截至该阶段的内存峰值）。Schependomlaan 的成果体积主要是属性表：它有 6092 个属性列，几何只有约 26 万个三角形，所以量化之后体积仍有 89 MB。

在 Cesium 里加载的对比用无头 Chromium（软件渲染）测得，相机看全楼，等到 `tilesLoaded`。这个视角下所有瓦片都会加载，所以加载时间没有变短；变化在于内存：

| 模型 | 加载时间 前 → 后 | JS 堆 前 → 后 | 瓦片集内存（`totalMemoryUsageInBytes`）前 → 后 |
| --- | --- | --- | --- |
| 合成 100k | 29.8 s → 30.9 s | 179 MB → 69 MB | 140 MB → 73 MB |
| Schependomlaan | 28.9 s → 25.0 s | 326 MB → 159 MB | 147 MB → 86 MB |

软件渲染下的时间只能作相对参考，桌面端用显卡时的加载时间还需要在 Windows 上实际看一次。分块的好处主要在相机靠近局部时：远处只加载上层的大构件，小构件所在的瓦片到近处才加载。

## 校验

在合成 10k、合成 100k、Clinic 和 Schependomlaan 的分块成果上运行了 gltf-validator 2.0.0-dev.3.10 和 3d-tiles-validator 0.6.1：

- gltf-validator：所有 glTF 没有错误和警告。信息级提示只有两类：`UNSUPPORTED_EXTENSION`（它不认识 `EXT_mesh_features` 和 `EXT_structural_metadata`）和 `UNUSED_OBJECT`（属性表的 bufferView 只被 `EXT_structural_metadata` 引用，它看不到这层引用）。
- 3d-tiles-validator 在默认输出上报一个 `INTERNAL_ERROR`：“The property table does not define property …”。原因是某个瓦片省略了 schema 里声明、但本瓦片没有值的可选数值属性。3D Tiles 规范允许省略非必需属性，这是校验器自身的问题。用工具的 `--dense-property-tables` 选项让每个瓦片写出全部有值的列后，合成 10k 和 Clinic 的成果通过校验，没有错误和警告。这个选项只用于校验，桌面端和协议里没有提供。
