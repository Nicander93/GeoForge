# IFC 转换 Spike 工具

把 IFC 文件转成单瓦片的 3D Tiles 1.1，构件的 GlobalId、类名、名称、楼层和全部属性集（包括自定义属性集）都写进瓦片，Cesium 里点选构件就能读到。这是 Spike 阶段的 Python 实现，还没有接入 Processor 和桌面端。

## 安装

需要 Python 3.10 或更高版本：

```bash
python -m venv .venv
.venv/bin/pip install -r tools/ifc/requirements.txt    # Windows: .venv\Scripts\pip
```

## 用法

```bash
# 生成测试用的 IFC4 小模型（带 GF_Custom 自定义属性集和 HK1980 坐标）
python tools/ifc/cli.py fixture out/fixture.ifc

# IFC → 交换包 → 3D Tiles 1.1，输出到 out/fixture/exchange 和 out/fixture/tiles
python tools/ifc/cli.py convert out/fixture.ifc out/fixture

# 也可以分两步跑
python tools/ifc/cli.py export model.ifc out/model/exchange
python tools/ifc/cli.py tiles out/model/exchange out/model/tiles
```

## 文件

| 文件 | 作用 |
| --- | --- |
| `fixture.py` | 用 IfcOpenShell 生成测试模型，GlobalId 固定，可重复生成 |
| `exchange.py` | 读 IFC、三角化、导出属性和坐标信息，写交换包 `manifest.json` + `geometry.bin` |
| `tiles.py` | 只读交换包，写 `tileset.json` + `content.glb`（`EXT_mesh_features` + `EXT_structural_metadata`），不依赖 IfcOpenShell |
| `cli.py` | 命令行入口 |
| `tests/test_spike.py` | 单元测试：`python -m unittest discover -s tools/ifc/tests` |

桌面端的 Cesium 点选测试在 `apps/desktop/tests/e2e/ifc-feature-pick.spec.mjs`，需要设置 `GEOFORGE_IFC_PYTHON` 指向装好依赖的 Python 才会运行，否则跳过。

结论、限制和下一步见 [Spike 报告](../../docs/ifc/SPIKE-REPORT.md)。
