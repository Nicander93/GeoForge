# 地形 V1.2 输入与坐标系合同（T12.0）

本文固定 V1.2 的任务参数、处理器行为、错误码和测试用例。后面的 T12.1～T12.4 都以这里为准，改动合同要先改本文。

## 1. 基线

- master：`adc760e`（PR #9 gzip 资源服务、PR #10 V1.1 均已合并）。
- 分支：`feat/terrain-v12-crs`，从上面的 master 拉出。
- #9 已经在 master 里，所以 V1.3 预览不再被 gzip 问题挡住；本阶段不做正式预览。
- P0 文档（`docs/terrain/p0/`）不改。

## 2. V1.1 里和本计划冲突的行为

| V1.1 行为 | 问题 | V1.2 处理 |
| --- | --- | --- |
| `crsOverride` 只接受 `EPSG:<数字>`，由 `parse_epsg()` 判断 | 有效的 WKT、无编号 WKT 都进不来 | 接受任意定义文本，由运行时里的 GDAL/PROJ 判断是否有效（T12.1） |
| `inspect.rs` 用 `KNOWN_GEOGRAPHIC = [4326, 4490]`、WKT 前缀、最后一个 `ID["EPSG"]` 判断坐标系 | 实际上是一份白名单，复合 CRS、轴序都处理不了 | 删除，改用 `gf-dem-tool crs`（GDAL/OSR + PROJ）的结果（T12.1） |
| `projectionMode=auto` 实际等于 `normalize` | 计划要求 auto 能选直读 | 实现路线判断（T12.1） |
| gdalwarp 由 GDAL 自己挑坐标操作 | 可能悄悄用上近似（ballpark）变换 | 先查操作，再用 `-ct` 把选中的操作钉死，加 `-novshift`（T12.1） |
| `auto_max_depth` 把像元大小当成经纬度 | 投影数据的 `10`（米）会被当成 10° | 按数据的 WGS 84 纬度跨度 / 行数换算（T12.1） |
| warp 外框和源内 NoData 混在一起，外框也要求选 NoData 策略 | 计划要求两者分开 | T12.2 |
| 多文件要求同 CRS、同分辨率 | 计划允许不同 CRS 先各自转换 | T12.2 |
| 只有后端，没有桌面入口 | — | T12.3 |

## 3. 任务参数（`convert-terrain`，`terrain.version = 2`）

仍然用现有的 `convert-terrain` 和 JSONL 任务协议，不新开任务类型。

版本迁移：

- 处理器同时接受 `version` 1 和 2，其他值报 `TERRAIN_CONFIG_INVALID`。
- 两个版本的字段完全相同，唯一区别是**没写 `preprocess.projectionMode` 时的默认值**：version 1 仍是 `normalize`（保持 V1.1 的含义），version 2 是 `auto`。
- 任务写回 JSON 时，没写的 `projectionMode` 仍然不写，避免把默认值固化进旧任务。
- `processor capabilities --json` 的 `terrain.optionsVersion` 报 2。

新增和改变含义的字段：

| 字段 | 类型 / 默认 | 含义 |
| --- | --- | --- |
| `crsOverride` | 字符串，可空 | 用户指定的**源**坐标系：`EPSG:xxxx`、WKT、PROJJSON，或写明 `+datum`/`+ellps` 的 PROJ 字符串。只重新解释源数据里的坐标数字，**不做坐标变换**。空串或超过 16 KiB 直接拒绝；能否用由 GDAL/PROJ 判断。 |
| `preprocess.projectionMode` | `auto` / `normalize`，见上 | `auto`：已验证的路线让 CTB 直读，其余用 GDAL 规范化；`normalize`：除 WGS 84 经纬度外一律先 warp 到 EPSG:4326，用于排障。 |
| `preprocess.acceptBallparkTransform` | 布尔，默认 `false` | 到 WGS 84 只有 PROJ 近似操作（不做基准转换、精度未知）时，必须为 `true` 才继续，例如北京 54、西安 80。CGCS2000 不需要。见 §5。 |

其他字段（`verticalDatum`、`noData`、`tiling`、`execution`）含义不变。

## 4. 处理器的坐标系流程

1. 每个源跑一次 `gf-dem-tool crs raster:<路径> --bounds …`（有 `crsOverride` 时用用户的定义），拿到名称、authority、类型、轴、单位、到 EPSG:4326 的候选操作和数据的经纬度范围。
2. 合并范围再跑一次，得到整体的操作、外包框和内框。
3. `check_transform`：不是地理或投影坐标系 → `TERRAIN_CRS_INVALID`；精度最高的操作缺格网、或范围换算失败 → `TERRAIN_TRANSFORM_UNAVAILABLE`；只有近似操作且未接受 → `TERRAIN_TRANSFORM_LOW_ACCURACY`。
4. `choose_route` 返回 `direct` / `normalize` 和机器可读的 `reason`，写进日志和 `geoforge-terrain.json` 的 `route`。拒绝统一在第 3 步发生。

`reason` 取值：

| reason | 路线 |
| --- | --- |
| `source-is-wgs84-geographic` | direct（不需要重投影） |
| `compound-crs` | normalize（只在 gdalwarp 里能保证 `-novshift`） |
| `normalize-requested` | normalize |
| `geographic-not-wgs84` | normalize（例如 EPSG:4490） |
| `no-operation` | normalize |
| `grid-based-datum-shift` | normalize |
| `validated-projection-method` | direct（目前只有 Transverse Mercator，依据见 `03-v12-crs-validation.md`） |
| `projection-method-not-validated-for-direct` | normalize（例如 Web Mercator） |

## 5. 精度与基准的规则

- 轴序统一按 GDAL 的 GIS 传统顺序（东、北）。报告里同时给出坐标系自身的轴定义（`axes`）。
- 候选操作按“假设所有格网都已安装”的精度排序。排第一的操作缺格网时直接失败，**不退到精度更低的操作**。
- CGCS2000（含 4490 和各 3°/6° 高斯-克吕格）用 GeoForge 定义的显式转换（零参数地心平移，声明精度 1 m，是估计值不是实测，报告里 `accuracyKind: "estimate"`），不需要确认，报告里写 `datumShift`。依据见 `04-v12-cgcs2000.md`。
- 其余近似操作（PROJ 的 ballpark）默认失败。实测北京 54、西安 80 到 WGS 84 在当前 `proj.db` 里只有近似操作，要用户确认。确认后任务会发一条 `TERRAIN_TRANSFORM_BALLPARK` 警告，报告里 `ballparkAccepted=true`。
- 不做垂直基准转换：gdalwarp 加 `-novshift`；复合 CRS 只报告垂直部分（`verticalName`），并强制走 normalize。

## 6. 错误码

| 错误码 | 何时出现 |
| --- | --- |
| `TERRAIN_CRS_MISSING` | 文件没有坐标系且没有 `crsOverride` |
| `TERRAIN_CRS_INVALID` | GDAL/PROJ 解析不了；PROJ 管线、没写椭球的 PROJ 串；仅垂直坐标系；坐标数值和坐标系类型明显不符 |
| `TERRAIN_TRANSFORM_UNAVAILABLE` | 最优操作缺格网；数据范围换算不到经纬度 |
| `TERRAIN_TRANSFORM_LOW_ACCURACY` | 只有近似操作且未设置 `acceptBallparkTransform` |
| `TERRAIN_NODATA_POLICY_REQUIRED` | 不变；外框的处理在 T12.2 改 |
| `TERRAIN_INPUT_MIXED_DATUM` | 预留给 T12.2 多源不同基准 |
| `TERRAIN_RUNTIME_MISSING` | 不变；另外运行时里的 `gf-dem-tool` 版本低于 2 也报这个 |
| `TERRAIN_OUTPUT_EXISTS` | 计划里的名字；现有实现沿用 `PATH_OUTPUT_EXISTS`，不改名，免得影响其他任务 |

错误消息都带文件路径和可操作的修复建议。

## 7. 输入检查接口（T12.3 实现，字段先定）

`inspectTerrainInputs(paths, crsOverride?)` 返回每个源和整体规划两层。下面的字段在 T12.3 以处理器子命令的形式实现，桌面端只经过 `api` 层调用：

```json
{
  "valid": true,
  "sources": [{
    "path": "D:/dem/a.tif",
    "driver": "GTiff",
    "dimensions": [2000, 2000],
    "dataType": "Float32",
    "crs": {
      "name": "CGCS2000 / 3-degree Gauss-Kruger CM 114E",
      "authority": "EPSG:4547",
      "type": "projected",
      "axes": [{ "name": "Northing", "orientation": "north" }, { "name": "Easting", "orientation": "east" }],
      "linearUnit": "metre",
      "wkt": "..."
    },
    "bounds": { "source": [490000, 3370000, 510000, 3390000], "wgs84": [113.8957, 30.4500, 114.1043, 30.6304] },
    "pixelSize": [10, 10],
    "noData": { "declared": -9999, "sourceHoles": { "state": "not-computed", "value": null } },
    "warnings": []
  }],
  "plan": {
    "projectionMode": "auto",
    "route": "direct",
    "routeReason": "validated-projection-method",
    "transform": { "name": "... + CGCS2000 to WGS 84 (GeoForge, null geocentric translation)", "ballpark": false, "accuracyM": 1.0 },
    "recommendedMaxDepth": 15,
    "verticalDatumStatus": "confirmation-required"
  }
}
```

`wgs84` 是 D1 的真实值。需要整幅扫描的统计（源内 NoData 个数等）用 `{ "state": "not-computed" | "estimated" | "computed", "value": … }`，前端不能把没算的值显示成 0。

## 8. 测试用例

| 用例 | 层 | 状态 |
| --- | --- | --- |
| version 1/2 默认值、未知版本、`crsOverride` 文本长度 | protocol 单测 | T12.1 已加 |
| 解析 `gf-dem-tool crs` 输出、错误码前缀、近似操作门禁、缺格网不回退、仅垂直 CRS、无编号 WKT、路线判断 | processor 单测 | T12.1 已加 |
| D1 直读与规范化对照 | 集成（实机） | T12.1 已加 |
| 4490、4549、4498、3857、32650、32750、2436、2383 | 集成（实机） | T12.1 已加 |
| 无编号 WKT 覆盖；非法定义；NAD27 缺格网；复合 CRS 不改高程 | 集成（实机） | T12.1 已加 |
| 外框与源内 NoData 分开；多源不同 CRS | 集成 | T12.2 |
| 桌面表单、输入检查、任务提交 | GUI 单测 / E2E | T12.3 |
