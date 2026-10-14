# 02 Windows x64 构建与最小样本试运行

全部在 LM（Windows 11 实机）上完成，没有使用 Docker 或 WSL。

## 候选 A：mago（实测通过）

```powershell
. tools\experiments\terrain-p0\scripts\env.ps1      # JDK 21 = conda-forge Zulu 21.0.10，GRADLE_USER_HOME 在工作目录
cd $W\src\mago-3d-terrainer; git checkout v1.14.2-release
.\gradlew.bat --no-daemon :mago-terrainer:shadowJar -x test
```

- 首次构建 412 秒（含下载 Gradle 9.1 与依赖），成功；日志 `results/mago-build.log`。
- 产物 `mago-terrainer/dist/mago-3d-terrainer-1.14.2-release.jar`，**228 MB**。其中内置大地水准面约 80 MB，DuckDB 多平台原生库约 71 MB（由 `gt-geoparquet` 引入，地形切片用不到），SQLite 原生库约 12 MB。可通过裁剪依赖明显减小。
- shadow 合并时 `duplicatesStrategy = INCLUDE`，各依赖的 `META-INF/LICENSE`、`NOTICE` 同名互相覆盖（JAR 中 63 个同名文件），分发时需另行整理许可文件，见 01-licenses。
- 运行：`java -Xmx8g -Djava.awt.headless=true -jar mago-3d-terrainer-1.14.2-release.jar -i <tif> -o <out> -max 14 [-ncn]`。注意 `-j` 不是“同时生成 layer.json”，而是“只为已有目录重新生成 layer.json”，误用会抛空指针（试运行中踩到一次，已记录）。
- 应用内置 Java 运行时（jlink）探针：见本文末“待补”。

## 候选 B：CTB（实测通过）

```powershell
powershell -File tools\experiments\terrain-p0\scripts\build-ctb.ps1
```

- MSVC（VS Build Tools 18）+ Ninja + conda-forge GDAL 3.10.3，Release，用时约 9 秒，成功；日志 `results/ctb-build-1.log`。
- 需要两处兼容处理：CMake 4 不再接受 `cmake_minimum_required(VERSION 2.6)`，配置时加 `-DCMAKE_POLICY_VERSION_MINIMUM=3.5`；`ctb.dll` 安装在 `lib\`，需要和 `ctb-tile.exe` 放在一起（或加入 PATH）才能运行。没有修改上游源码。
- 运行时依赖：`ctb.dll`、GDAL 及其依赖 DLL（conda 环境 `Library\bin`）、`GDAL_DATA`、`PROJ_DATA`（proj.db）。
- 运行：`ctb-tile -f Mesh -C -s 14 -e 0 -o <out> <tif|vrt>`，再用同样参数加 `-l` 生成 layer.json。

## 最小样本结果（D0–D3，maxDepth 14，默认参数，无法线）

| 运行 | 状态 | 耗时 s | 峰值内存 MiB | 瓦片数 | 输出字节 |
|---|---|---|---|---|---|
| A-D0 | 通过 | 7.66 | 608 | 1244 | 2,241,380 |
| B-D0 | 通过 | 0.85 | 571 | 538 | 304,228 |
| A-D1（EPSG:4547 直接输入） | **实测失败**：退出码 0，但重投影失败，高程全为 0 | 5.80 | 374 | 1208 | 1,424,157 |
| B-D1（EPSG:4547 直接输入） | 通过 | 6.20 | 202 | 540 | 259,619 |
| A-D1w（先 gdalwarp 到 4326） | 通过 | 7.87 | 474 | 1208 | 2,211,039 |
| B-D1w | 通过 | 0.84 | 402 | 540 | 260,057 |
| A-D2 | 通过（NoData 写成 0 m，见 04） | 5.18 | 501 | 680 | 1,558,146 |
| B-D2 | 通过（NoData 写成 0 m） | 0.42 | 未可靠测得（进程过短，采样到 2 MiB） | 156 | 133,337 |
| A-D3（两文件直接输入） | 通过 | 6.03 | 527 | 889 | 1,782,738 |
| B-D3（gdalbuildvrt 后输入） | 通过 | 0.86 | 208 | 295 | 201,644 |

原始记录：`results/results-smoke.jsonl`。小样本耗时主要是启动开销，不代表吞吐，吞吐见 05。

A 的瓦片数多于 B，是因为 A 在数据四周多生成一圈填充瓦片，并且三角形更多（D0：A 213,264 个，B 105,979 个）。

## 待补（本阶段推送时尚未完成）

- A 的 jlink 精简运行时体积与启动时间。
- 候选 C 在 Windows 上的编码探针。
