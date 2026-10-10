# IFC 转换工具

把 IFC 文件转成单瓦片的 3D Tiles 1.1，构件的 GlobalId、类名、名称、楼层和全部属性集（包括自定义属性集）都写进瓦片。桌面端的“IFC 转换”通过 Processor 的 `convert-ifc` 操作调用这个工具；用法、打包和限制见 [docs/ifc/README.md](../../docs/ifc/README.md)。

## 安装

开发和测试用 Python 3.12：

```bash
uv venv --python 3.12 .venv-ifc
uv pip install -p .venv-ifc -r tools/ifc/requirements.txt
```

## 用法

```bash
# 生成测试用的 IFC4 小模型（带 GF_Custom 自定义属性集和 HK1980 坐标）
python tools/ifc/cli.py fixture out/fixture.ifc

# IFC → 交换包 → 3D Tiles 1.1，输出到 out/fixture/exchange 和 out/fixture/tiles
python tools/ifc/cli.py convert out/fixture.ifc out/fixture

# Processor 的调用方式：tileset 直接写到 TILES_DIR，标准输出为 JSON lines
python tools/ifc/cli.py convert model.ifc out/tiles --exchange-dir out/exchange --progress jsonl \
    --georef anchor --anchor-lon=114.17 --anchor-lat=22.3 --anchor-height=5 --exclude-class IfcFurnishingElement

# 也可以分两步跑
python tools/ifc/cli.py export model.ifc out/model/exchange
python tools/ifc/cli.py tiles out/model/exchange out/model/tiles
```

`python tools/ifc/cli.py convert --help` 列出全部参数。

## 文件

| 文件 | 作用 |
| --- | --- |
| `fixture.py` | 用 IfcOpenShell 生成测试模型，GlobalId 固定，可重复生成 |
| `exchange.py` | 读 IFC、按类过滤、三角化、导出属性和坐标信息，写交换包 `manifest.json` + `geometry.bin` |
| `tiles.py` | 只读交换包，写 `tileset.json` + `content.glb`（`EXT_mesh_features` + `EXT_structural_metadata`），不依赖 IfcOpenShell |
| `cli.py` | 命令行入口，JSON lines 进度和结果摘要 |
| `geoforge-ifc.spec` | PyInstaller onedir 打包配置，由 `apps/desktop/scripts/prepare-ifc.ps1` 使用 |
| `tests/` | 单元测试：`python -m unittest discover -s tools/ifc/tests` |
