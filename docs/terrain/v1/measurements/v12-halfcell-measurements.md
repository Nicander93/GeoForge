# V1.2 实测记录（自动生成）

由 `tools/terrain-bench/measure_terrain.py` 生成，机器：LM。原始数据见同目录 `v12-halfcell-measurements.json`。

| 用例 | 退出码 | 路线 | CTB 线程 | 总耗时 s | gdalwarp s | gdaladdo s | ctb-tile s | 峰值提交内存 MiB | 层级 | 瓦片 | 输出 MB | RMSE m | 无洞非陡崖 RMSE m（点数） | P95 m | 最大误差 m | 相邻边界差 m | 源内洞 / 范围外 / 填补 | 粗层级下塌顶点 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| D0 | 0 | direct（source-is-wgs84-geographic） | 8 | 3.40 | 未测 | 未测 | 1.71 | 450 | 15 | 1944 | 0.74 | 0.040 | 0.040（1249） | 0.081 | 0.164 | 0.026 | 0 / 0 / 0 | 451 |
| D1-auto | 0 | normalize（auto-normalizes） | 8 | 5.60 | 0.81 | 未测 | 1.61 | 282 | 15 | 1866 | 0.63 | 0.021 | 0.021（1744） | 0.043 | 0.064 | 0.017 | 0 / 6596 / 0 | 245 |
| D1-direct | 0 | direct（validated-projection-method） | 8 | 15.75 | 未测 | 未测 | 13.85 | 307 | 15 | 1866 | 0.63 | 0.015 | 0.015（1764） | 0.033 | 0.056 | 0.020 | 0 / 0 / 0 | 2956 |
| D2-constant | 0 | direct（source-is-wgs84-geographic） | 8 | 1.92 | 未测 | 未测 | 0.61 | 80 | 15 | 517 | 0.39 | 0.366 | 0.015（539） | 1.157 | 1.157 | 1.026 | 70108 / 0 / 70108 | 0 |
| D3 | 0 | direct（source-is-wgs84-geographic） | 8 | 2.69 | 未测 | 未测 | 1.01 | 226 | 15 | 1017 | 0.48 | 0.041 | 0.041（1456） | 0.080 | 0.145 | 0.026 | 0 / 0 / 0 | 76 |
| M-high | 0 | direct（source-is-wgs84-geographic） | 8 | 13.50 | 未测 | 2.01 | 7.13 | 1779 | 15 | 7418 | 2.98 | 0.016 | 0.016（1850） | 0.032 | 0.071 | 0.027 | 0 / 0 / 0 | 128 |
| D4 | 0 | direct（source-is-wgs84-geographic） | 8 | 181.90 | 未测 | 17.16 | 128.93 | 2193 | 15 | 64507 | 14.23 | 0.017 | 0.017（1965） | 0.035 | 0.063 | 0.027 | 0 / 0 / 0 | 0 |

## 源文件

| 用例 | 文件 | 字节 | SHA-256 |
|---|---|---|---|
| D0 | D0.tif | 5715488 | `737bb13128d7bfcda53facf77899ed1de997794be510f5dae04945fd3b634da9` |
| D1-auto | D1.tif | 5100050 | `f765b30f0d95259c1ea69fcf3b4d0339f2f493c4a8b1fbfe83952e0db69fed87` |
| D1-direct | D1.tif | 5100050 | `f765b30f0d95259c1ea69fcf3b4d0339f2f493c4a8b1fbfe83952e0db69fed87` |
| D2-constant | D2.tif | 193690 | `cba430e9c3ec71fde12f3973afedd87e37de1a1081f810315356b1bf0a856fb1` |
| D3 | D3_a.tif | 1438129 | `f90a6cd01e62f4a7dcc72195a5a452a49cca92737c2b25ccf547bba367e41f69` |
| D3 | D3_b.tif | 1435446 | `850c467eacb5aca7a04b04ade6be068782a4a1ec24e91e38abb9f75e04ea7367` |
| M-high | M.tif | 74756212 | `636a61410f34084906aacb11eff6be2859059c3a7599f369665fd6dc9d49aab2` |
| D4 | D4.tif | 701635127 | `802d5b7b5bcb5ed2045096cbcdd75fde249957ab60225b4d8e41d209eec132f5` |

## CRS 与变换

| 用例 | 源 CRS | 选定操作 | 基准转换 | 精度 m | 格网 |
|---|---|---|---|---|---|
| D0 | EPSG:4326 | Null geographic offset from WGS 84 to WGS 84 | 无 | 0.00 | 无 |
| D1-auto | EPSG:4547 | Inverse of 3-degree Gauss-Kruger CM 114E + CGCS2000 to WGS 84 (GeoForge, null geocentric translation) | cgcs2000-null-geocentric-translation | 1.00 | 无 |
| D1-direct | EPSG:4547 | Inverse of 3-degree Gauss-Kruger CM 114E + CGCS2000 to WGS 84 (GeoForge, null geocentric translation) | cgcs2000-null-geocentric-translation | 1.00 | 无 |
| D2-constant | EPSG:4326 | Null geographic offset from WGS 84 to WGS 84 | 无 | 0.00 | 无 |
| D3 | EPSG:4326 | Null geographic offset from WGS 84 to WGS 84 | 无 | 0.00 | 无 |
| M-high | EPSG:4326 | Null geographic offset from WGS 84 to WGS 84 | 无 | 0.00 | 无 |
| D4 | EPSG:4326 | Null geographic offset from WGS 84 to WGS 84 | 无 | 0.00 | 无 |

## 粗层级下塌顶点（按层级）

规则：数据范围内、高度低于有效区最低高程 1 m 以上的顶点。只统计，不判定通过与否（V1.4 处理）。

| 用例 | 层级:下塌/范围内顶点 |
|---|---|
| D0 | 5:1/1, 6:4/4, 7:1/3, 8:0/85, 9:37/213, 10:112/661, 11:0/1192, 12:296/2095, 13:0/3626, 14:0/9285, 15:0/21435 |
| D1-auto | 5:1/1, 6:1/2, 8:0/25, 9:20/160, 10:34/413, 11:0/973, 12:158/2451, 13:2/4453, 14:2/7398, 15:27/18189 |
| D1-direct | 5:1/1, 6:1/2, 8:0/25, 9:20/160, 10:34/516, 11:0/973, 12:158/2451, 13:226/5009, 14:122/11002, 15:2394/21471 |
| D2-constant | 5:0/1, 6:0/1, 8:0/4, 9:0/51, 10:0/210, 11:0/656, 12:0/1900, 13:0/4036, 14:0/8212, 15:0/20175 |
| D3 | 6:1/1, 7:1/6, 8:0/58, 9:0/130, 10:74/393, 11:0/587, 12:0/1599, 13:0/3485, 14:0/5298, 15:0/13938 |
| M-high | 4:1/1, 5:3/5, 6:5/31, 7:7/98, 8:37/422, 9:75/1184, 10:0/2309, 11:0/5167, 12:0/10879, 13:0/22389, 14:0/43626, 15:0/107725 |
| D4 | 3:0/1, 4:0/4, 5:0/16, 6:0/49, 7:0/25, 8:0/589, 9:0/2337, 10:0/5565, 11:0/13850, 12:0/30925, 13:0/69335, 14:0/141314, 15:0/377428 |
