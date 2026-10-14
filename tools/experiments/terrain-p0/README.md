# terrain-p0 实验脚本（仅用于 P0 预研）

所有输出写到仓库外的工作目录，默认 `D:\work\terrain-p0`，可用环境变量 `TERRAIN_P0_WORK` 修改。

## Windows 复现步骤

1. 准备工具（只装在工作目录内），见 `docs/terrain/p0/00-baseline.md`。
2. 获取源码：
   ```powershell
   cd $env:TERRAIN_P0_WORK\src
   git clone https://github.com/Gaia3D/mago-3d-terrainer.git; git -C mago-3d-terrainer checkout v1.14.2-release
   git clone -b master-quantized-mesh https://github.com/ahuarte47/cesium-terrain-builder.git ctb; git -C ctb checkout 776b60308c89383462a91d152a190fcd667b74f7
   ```
3. 构建：`scripts\build-mago.ps1`、`scripts\build-ctb.ps1`
4. 生成数据：`python scripts\gen_datasets.py --out <WORK>\data`（D4：加 `--only D4`；M：`gdal_translate -srcwin 0 0 8000 8000 D4.tif M.tif`）；投影数据预处理：`scripts\prewarp.ps1 -In data\D1.tif -Out data\D1_4326.tif`
5. 试运行与校验：`scripts\run-smoke.ps1`、`scripts\validate-smoke.ps1`、`python scripts\nodata_probe.py out\A-D2 out\B-D2`
6. 预览：`python preview\serve.py --tiles-root <WORK>\out --cesium <Cesium Build\Cesium> --port 18765`，然后在 `apps/desktop` 目录（提供 playwright）运行 `preview\capture-runs.ps1`
7. 基准：`scripts\bench.ps1`
8. 清单：`python scripts\make_manifest.py --data <WORK>\data --out docs\terrain\p0\03-dataset-manifest.json`

## 清理

只删除自建工作目录：`Remove-Item -Recurse -Force D:\work\terrain-p0`（会删掉工具、数据和输出）。

## 目录

- `scripts/` 环境、构建、数据生成、运行、校验、监测
- `preview/` P0 专用 Cesium 页面和本地服务（不是 GeoForge 正式界面）
- `cases/` 样本说明
- `results/` 小型结构化结果和关键日志
