# 04 Quantized-Mesh 正确性与 Cesium 预览

## 检查方法

- `scripts/qm_validate.py`：按 Cesium quantized-mesh 1.0 规范**独立实现**的解码器，不调用任何候选的代码。检查 layer.json 与文件是否一致、每个瓦片的头、顶点量化范围（0–32767）、三角形索引、四条边的边缘索引是否真的在边上、扩展、尾部多余字节；把最高层每个顶点还原成经纬度和高度，与源 DEM（双线性）和解析真值比较；在 DEM 范围内随机取 3000 个控制点，按三角形重心插值（即 Cesium 实际渲染的表面）比较高程；比较最高层所有相邻瓦片共用边线的高度差。
- D2 额外用 300 m 陡坎检查水平位置：沿 40 条纬线找网格高度穿过陡坎中点的经度，与真值 114.25° 比较。
- `scripts/nodata_probe.py`：统计 NoData 区域里顶点的高度。
- 结果 JSON 在 `results/`。

## 结构检查

| 运行 | 解码错误 | gzip | available 越界 | 已声明但缺失 | 有文件未声明 | 备注 |
|---|---|---|---|---|---|---|
| A（D0–D3） | 0 | 否 | 每个输出 16 项 | 0 | 293–375 | layer.json 用 `scheme: tms`；声明范围在第 0、1 层越出瓦片网格 |
| B（D0–D3） | 0 | 是（全部） | 0 | 0 | 0 | layer.json 键名为 `schema`，缺 `scheme`；Cesium 默认 tms 所以能用 |

两者都有根层 0/0/0 和 0/1/0，Y 轴为 TMS（南起），Cesium 遍历正常。“验证器通过”只代表结构合法，不代表高程正确，见下表。

## 高程与水平精度（maxDepth 14，最高层）

单位：米。控制点为网格插值相对解析真值。

| 运行 | 顶点相对源 DEM RMSE / 最大 | 控制点 RMSE / P95 / 最大 | 相邻边线最大高差 | 结论 |
|---|---|---|---|---|
| A-D0 | 0.45 / 1.04 | 0.86 / 1.75 / 3.23 | 0.027 | 通过 |
| B-D0 | 0.57 / 0.97 | 1.88 / 3.49 / 5.39 | 0.025 | 通过（默认质量较低，见 05 的 `-g` 调整） |
| A-D1（投影坐标直接输入） | **425 / 692** | **423 / 595 / 674** | 0.0 | **硬性失败**：高程全为 0 m |
| B-D1（投影坐标直接输入） | 0.23 / 0.44 | 1.45 / 2.99 / 4.74 | 0.016 | 通过 |
| A-D1w（预先 warp） | 0.19 / 0.39 | 0.22 / 0.43 / 0.60 | 0.021 | 通过 |
| B-D1w | 0.22 / 0.43 | 1.44 / 2.99 / 4.74 | 0.014 | 通过 |
| A-D2 | 27.1 / 113 | 7.02 / 0.63 / 188 | 0.011 | 有效区通过；大误差集中在陡坎和 NoData 边缘 |
| B-D2 | 0.33 / 1.00 | 5.94 / 2.71 / 207 | 0.963 | 同上；有一处边线高差近 1 m（陡坎附近） |
| A-D3（两文件） | 0.44 / 1.03 | 0.84 / 1.71 / 3.34 | 0.027 | 通过，跨文件边界无缝 |
| B-D3（VRT） | 0.58 / 0.97 | 1.74 / 3.27 / 5.27 | 0.024 | 通过 |

D1 的真值在 EPSG:4547 中定义，比较时由 PROJ 把 WGS84 经纬度换到 CGCS2000 投影坐标（两者差异在厘米级，此处忽略）。

水平位置：D2 陡坎的平均偏移 A 为 **-4.8 m**（偏西），B 为 **+8.5 m**（偏东），源像元约 9.6 m，都在一个像元以内。A 的重投影固定用最近邻、B 的重采样默认 `average`，可能是偏移方向不同的原因，未进一步区分。D0 上的“平移搜索”受网格简化误差干扰，结果（最优偏移 2.5–10 m、RMSE 只下降约 0.1 m）不能当作水平误差，仅保留在 JSON 中。

## NoData

两个引擎都**不留空洞**，而是把 NoData 写成 0 m：D2 圆孔内 A 有 109 个、B 有 112 个顶点，北缘缺失条带 A 82 个、B 80 个，高度全部为 0.00 m（`results/nodata-D2.json`）。数据范围之外的填充瓦片也是 0 m。对于海拔几百米的地区，这会形成竖直的“坑”。V1 必须在切片前处理 NoData（填补、裁掉或用底图高程补齐），并在成果检查中报告 NoData 比例。

## Cesium 预览

- 临时页面 `preview/preview.html` + 本地服务 `preview/serve.py`（仅 P0 使用，不是 GeoForge 正式界面）。页面用 `Cesium.CesiumTerrainProvider.fromUrl`，不用 Cesium ion 底图，自动定位到数据范围，黄线标数据边界，可选线框、等高线（50 m）和地形夸张（仅诊断用）。`preview/capture.mjs` 用 Playwright Chromium 截图、记录网络请求，并在 Cesium 中调用 `sampleTerrainMostDetailed` 取 5 个固定控制点。
- 服务对 `.terrain` 返回 `Content-Type: application/vnd.quantized-mesh`；文件以 gzip 魔数开头时加 `Content-Encoding: gzip`。

| 运行 | layer.json | .terrain 请求 | Cesium 错误 | Cesium 采样相对源 DEM RMSE / 最大 |
|---|---|---|---|---|
| A-D0 / A-D0n（含法线） | 200 | 72–83 个，全部 200 | 0 | 0.98 / 1.57 m |
| B-D0 / B-D0n（含法线） | 200，`Content-Encoding: gzip` | 42–84 个，全部 200 | 0 | 1.68 / 3.23 m |

截图：`img/A-D0n-overview.png`（概览，等高线，夸张 2 倍）、`img/B-D0n-close-wire.png`（近景线框，可见瓦片边线），以及无法线版本。

### 反例：压缩字节没有 Content-Encoding

用 `serve.py --gzip-mode none` 提供 B 的 gzip 瓦片但不加 `Content-Encoding`，Cesium 报 `RangeError: Invalid typed array length: 2017542741`，根瓦片加载失败（`results/preview/NEG-B-D0n-nogzipheader.json`）。GeoForge 现有资源服务正是这种行为（不设 `Content-Encoding`，`.terrain` 为 `application/octet-stream`），所以**现有服务可以直接预览 A 的未压缩瓦片，但不能预览 B 的 gzip 瓦片**，除非改服务或改为输出未压缩瓦片。

另一个测试工具本身的问题：Python 默认监听队列只有 5，Windows 下 Cesium 并发请求时出现过一次 `ERR_CONNECTION_REFUSED`，已在 `serve.py` 把队列调到 256 后复测，全部 200。这不是候选的问题。
