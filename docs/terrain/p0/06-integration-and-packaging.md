# 06 集成与打包预审（只是方案，P0 未改任何业务代码）

## 预备架构

```text
Desktop（React/Tauri）
  └─ process_manager：串行任务、取消、成果登记
       └─ Processor（Rust，JSONL 协议）
            ├─ 现有：convert-osgb / convert-model / convert-ifc …
            └─ V1 新增：convert-terrain
                 ├─ 输入检查（GDAL：CRS、范围、分辨率、NoData、类型、高程范围、垂直基准声明）
                 ├─ 预处理（gdalbuildvrt / gdalwarp 到 EPSG:4326 / NoData 处理 / 可选 overview）
                 ├─ Terrain Runtime（子进程 sidecar：切片引擎命令行）
                 └─ 成果校验（qm_validate 的 Rust 化：layer.json、结构、抽样高程）
```

- 新增独立的 `terrain` 运行时能力探测（引擎、GDAL、PROJ 数据是否就绪），与现有 IFC 工具探测并列。
- 成果登记新增 `kind=terrain`，以 `layer.json` 为入口；`has_tileset` 判断需扩展（现在只认 `tileset.json`）。
- 以上只是设计，任务 Schema 和协议都没有改。

## sidecar 还是 FFI

| 方式 | 失败隔离 | 日志/进度 | 取消 | 升级 | 结论 |
|---|---|---|---|---|---|
| 命令行 sidecar | 崩溃只影响子进程 | 解析 stdout（A 有 `[Tile][深度][批次]`，B 有 GDAL 进度条） | 结束整个进程树（现有 IFC 工具已有 Windows 进程树结束逻辑可复用） | 替换可执行文件即可 | **优先** |
| FFI（链接 GDAL/CTB 到 Processor） | 崩溃会带倒 Processor | 可以精细 | 需要引擎支持中断点（两个候选都没有） | 需要重新构建 Processor | 不建议 |

两个候选都没有取消接口，只能结束进程；中断后的残留与续跑行为见 05。

## 运行时与体积估算

| 项目 | 候选 A（mago） | 候选 B（CTB） |
|---|---|---|
| 主程序 | JAR 228 MB（未裁剪；大地水准面约 80 MB、DuckDB 原生库约 71 MB、SQLite 约 12 MB 与地形切片无关） | `ctb-tile.exe` + `ctb.dll` 不足 2 MB |
| 运行时 | Java 21 运行时（jlink 精简后体积见 05/本节下方实测） | GDAL 与依赖 DLL；conda-forge 的 `Library\bin` 全量很大，正式包应使用只含 GTiff/VRT 的最小 GDAL 构建 |
| 数据文件 | EPSG 库内置在 JAR | `GDAL_DATA`、`PROJ_DATA`（proj.db 约 9 MB，另加需要的转换格网） |
| 预处理 | **必须**另带 GDAL（gdalwarp），因为 A 读投影坐标会静默出错 | 自带 GDAL，预处理和切片共用 |
| 内存 | 单进程，Java 堆可控（`-Xmx`） | 每线程约 0.5–0.8 GB，**需要按可用内存限制线程数** |

结论：A 的实际交付是 “JRE + JAR + GDAL”，B 是 “GDAL + 小程序”。只要 V1 需要投影坐标输入（必然需要），GDAL 两条路线都绕不开，B 的增量更小。

## 本地资源服务的最小修改

GeoForge 现有 `resource_server.rs` 已满足：只监听 127.0.0.1、CORS、Range、路径穿越检查、查询参数（`?v=1.1.0`）不影响路径。需要补：

1. `.terrain` 返回 `Content-Type: application/vnd.quantized-mesh`（现为 `application/octet-stream`；Cesium 不依赖它，但应规范化）。
2. **gzip 瓦片**：读取前 2 字节，是 gzip 魔数就加 `Content-Encoding: gzip`，并且不对此类文件响应 Range。若选用 B，这是必需修改；也可以在切片后统一解压成原始瓦片，代价是体积增大（M：B 压缩后 2.0 MB，A 未压缩 8.3 MB，三角形数不同，不能直接换算）。
3. `/artifacts/:id/` 的默认文件现为 `tileset.json`，地形成果应能返回 `layer.json`。
4. 预览页新增 `CesiumTerrainProvider.fromUrl` 分支，与 `Cesium3DTileset` 分开。

文件名大小写：两个候选都只输出数字目录和 `.terrain` 小写扩展名，Windows 下不存在大小写问题。

## 可直接复用的现有能力

- 子进程启动、标准输出逐行解析、进度上报（`completed/total`）与总百分比进度条。
- Windows 进程树结束（为 IFC 工具修过 `cmd.exe`/`python.exe` 残留问题）。
- 资源预算（`cpu_workers` 自动检测）：B 的 `-c` 可直接映射，但要加内存上限。
- 路径安全、成果登记、临时目录与失败清理。

不能直接复用：成果入口识别（`tileset.json`）、预览页（只支持 3D Tiles）、gzip 响应头。

## 后续代码改动点（V1，不在 P0 做）

`crates/protocol`（新增 terrain 选项结构）、`crates/processor/src/pipeline.rs`（新 operation）、`artifact_store.rs`（kind 与入口）、`resource_server.rs`（MIME 与 gzip）、`public/cesium-preview.html`（地形预览）、`src/lib/tools.ts`（工具入口）、打包脚本（GDAL 最小运行时与许可文件）。
