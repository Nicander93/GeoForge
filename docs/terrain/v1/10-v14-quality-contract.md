# 地形 V1.4：质量契约（草案）

> 状态：随 PR-A（T14.0 / T14.1）提交的检测口径；**不是**已发布产品的精度承诺。  
> 基线：`master@4556d64`；机器 LM（Windows 11，i5-14600KF，20 逻辑核，约 32 GiB RAM）。

## 环境与结论分层

| 结论类型 | 含义 | 本 PR |
|---|---|---|
| **CI 通过** | GitHub Actions `build-and-test` / `product` 绿 | 以 PR checks 为准 |
| **真实 Runtime 测试通过** | 本机设置 `GEOFORGE_TERRAIN_RUNTIME` + `GEOFORGE_TERRAIN_DATA` 后跑通集成测试 | PR-A 在 LM 上对 D0 / EDGE-PLATEAU 等实测 |
| **安装包运行通过** | 洁净 Windows + NSIS 安装后切片/预览 | **NOT TESTED**（属 T14.3 / PR-C） |

三者不得互相代替。

## 合成真值样本

| ID | 内容 | 锁定项 |
|---|---|---|
| **EDGE-PLATEAU** | 恒定 500 m 矩形 DEM，EPSG:4326，200×200，像元 0.001°，范围 `[114.0,29.9]–[114.2,30.1]` | 生成器 `tools/terrain-bench/make_edge_plateau.py`；期望高程 500 m；有效掩膜=整幅 |

生成：

```text
python tools/terrain-bench/make_edge_plateau.py --gdal-translate <runtime>/bin/gdal_translate.exe --out <data>/EDGE-PLATEAU.tif
```

## 边缘下塌判定（硬门槛草案）

对 EDGE-PLATEAU，在**独立解码的 `.terrain` 网格**上：

1. **顶点**：数据范围内（严格落在 `dataBounds` 内）任意层级顶点相对 500 m 的偏差 ≤ **0.5 m**。  
2. **表面抽样**：在数据范围向内收缩 2 个 CTB 格（与现有 `verify` 的 edge-band 同口径）后的规则 lon/lat 网格上，对每级瓦片做三角形重心插值，抽样高程相对 500 m 的偏差 ≤ **0.5 m**。  
3. **范围外**：允许 0 m 台阶；预览过渡带不得写入瓦片。

对真实样例 D0/D1/M：沿用 `measure_terrain.py` 的 `edgeCollapse`（范围内、低于 `minHeightInsideM - 1 m` 的顶点数）作回归；修复后不得差于基线，且粗层级下塌应显著下降。

## 接缝与内区

- 最深层邻接缝 `maxEdgeGapM`：不得出现 V1.3 实验边带引入的 0.46 m / 1.46 m 级退化。  
- `clean` RMSE：同机同参数下相对半格距修复后基线无不可接受回退（具体上限待同条件复测写入；未复测前标 **NOT TESTED** 上限）。  

## 多源大缺口

现有 `TERRAIN_AUXILIARY_EXTRAPOLATION` 警告在辅助像元占比 ≥ 5% 时触发。V1.4 改为**默认失败优先**（见实现与 `11-v14-edge-decision.md`）；限度以该 5% 为初值，可按样本再调，调前不得静默交付假地形。

## 反例（禁止用这些宣称修复）

- 只改预览过渡、扩大排除带、缩小 `dataBounds`、放宽报告阈值。  
- 只证明输入 DEM 像元未改、却不解码输出瓦片。

## 补充（#19 第二轮）

- 下塌回归门槛：`edge_plateau_d0_does_not_droop_on_coarse_levels` 和 `edge_slope_cliff_keeps_heights_and_cliff` 用旧运行时（runtime-v12c）跑必须失败，用新运行时跑必须通过。两项都已在 LM 上实际验证。
- 多源缺口门槛：由 `AuxiliaryGapPolicy::default()` 决定，当前是 5%、Fail。改阈值或改成只警告，都只需要改这一处。报告里始终记录 `auxiliaryRatio` 和 `auxiliaryGapPolicy`。
- 已知限制：direct 路线下，斜框投影数据的边缘仍会下塌（D1-direct 的 12、13 级）。auto 路线不受影响。是否修复待产品决定。

## 补充（#19 第三轮，用户决定）

- 投影坐标数据一律规范化，`projectionMode=direct` 在任务校验时被拒绝；WGS 84 经纬度数据仍直接切片。
- NoData 分四类处理：单 DEM 空洞由用户选择；重投影外框自动处理；多 DEM 窄缝在面积 ≤ 5% 且宽度 ≤ 8 像元时自动补并记录；明显空白一律阻断（`TERRAIN_SOURCE_GAP_BLOCKED`）。所有自动生成的高程都在报告 `noData.autoFilled` 里记录来源和范围。详见 `12-v14-nodata-rules.md`。
- 上一轮的 `AuxiliaryGapPolicy`（只看面积、可改成只警告）已被 `SourceGapPolicy` 取代：明显空白不能改成只警告。
