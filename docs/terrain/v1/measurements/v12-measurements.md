# V1.2 实测记录（自动生成）

由 `tools/terrain-bench/measure_terrain.py` 生成，机器：LM，i5-14600KF（20 逻辑核）/ 31.8 GB / NVMe SSD / Windows 11；processor release 构建，各用例 1 次。原始数据见同目录 `v12-measurements.json`。

| 用例 | 退出码 | 路线 | CTB 线程 | 总耗时 s | gdalwarp s | gdaladdo s | ctb-tile s | 峰值提交内存 MiB | 层级 | 瓦片 | 输出 MB | RMSE m | P95 m | 最大误差 m | 相邻边界差 m | 源内洞 / 范围外 / 填补 | 粗层级下塌顶点 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| D0 | 0 | direct（source-is-wgs84-geographic） | 5 | 4.86 | 未测 | 未测 | 2.32 | 314 | 15 | 1944 | 0.74 | 0.291 | 0.432 | 0.509 | 0.026 | 0 / 0 / 0 | 939 |
| D1-auto | 0 | normalize（auto-normalizes） | 5 | 6.95 | 0.81 | 未测 | 2.12 | 196 | 15 | 1866 | 0.63 | 0.116 | 0.186 | 0.230 | 0.016 | 0 / 6557 / 0 | 556 |
| D1-direct | 0 | direct（validated-projection-method） | 5 | 24.58 | 未测 | 未测 | 21.92 | 250 | 15 | 1866 | 0.63 | 0.113 | 0.195 | 0.250 | 0.017 | 0 / 0 / 0 | 4539 |
| D2-constant | 0 | direct（source-is-wgs84-geographic） | 5 | 2.17 | 未测 | 未测 | 0.71 | 60 | 15 | 517 | 0.38 | 45.788 | 149.068 | 149.068 | 0.948 | 70108 / 0 / 70108 | 0 |
| D3 | 0 | direct（source-is-wgs84-geographic） | 5 | 3.02 | 未测 | 未测 | 1.21 | 162 | 15 | 1017 | 0.48 | 0.290 | 0.436 | 0.497 | 0.025 | 0 / 0 / 0 | 556 |
| M-high | 0 | direct（source-is-wgs84-geographic） | 5 | 20.93 | 未测 | 2.02 | 12.74 | 1723 | 15 | 7418 | 2.98 | 0.287 | 0.425 | 0.472 | 0.024 | 0 / 0 / 0 | 385 |
| D4 | 0 | direct（source-is-wgs84-geographic） | 5 | 298.40 | 未测 | 28.11 | 220.24 | 2174 | 15 | 64507 | 14.18 | 0.288 | 0.423 | 0.467 | 0.025 | 0 / 0 / 0 | 0 |
| M-high-t20 | 0 | direct（source-is-wgs84-geographic） | 20 | 19.90 | 未测 | 2.01 | 11.80 | 1827 | 15 | 7418 | 2.98 | 0.287 | 0.425 | 0.472 | 0.024 | 0 / 0 / 0 | 385 |
| D4-t20 | 0 | direct（source-is-wgs84-geographic） | 20 | 199.17 | 未测 | 28.01 | 128.00 | 2205 | 15 | 64507 | 14.18 | 0.288 | 0.423 | 0.467 | 0.025 | 0 / 0 / 0 | 0 |

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
| M-high-t20 | M.tif | 74756212 | `636a61410f34084906aacb11eff6be2859059c3a7599f369665fd6dc9d49aab2` |
| D4-t20 | D4.tif | 701635127 | `802d5b7b5bcb5ed2045096cbcdd75fde249957ab60225b4d8e41d209eec132f5` |

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
| M-high-t20 | EPSG:4326 | Null geographic offset from WGS 84 to WGS 84 | 无 | 0.00 | 无 |
| D4-t20 | EPSG:4326 | Null geographic offset from WGS 84 to WGS 84 | 无 | 0.00 | 无 |

## 粗层级下塌顶点（按层级）

规则：数据范围内、高度低于有效区最低高程 1 m 以上的顶点。只统计，不判定通过与否（V1.4 处理）。

| 用例 | 层级:下塌/范围内顶点 |
|---|---|
| D0 | 5:1/1, 6:3/4, 7:6/11, 8:15/53, 9:55/230, 10:112/661, 11:151/1609, 12:296/2095, 13:300/4587, 14:0/9719, 15:0/20534 |
| D1-auto | 5:1/1, 6:1/2, 8:7/34, 9:20/152, 10:90/425, 11:134/779, 12:268/1864, 13:2/4453, 14:9/9472, 15:24/18189 |
| D1-direct | 5:1/1, 6:1/2, 8:7/34, 9:20/152, 10:90/425, 11:134/938, 12:284/1816, 13:119/4453, 14:1000/10108, 15:2883/22558 |
| D2-constant | 5:0/1, 6:0/1, 9:0/46, 10:0/245, 11:0/738, 12:0/1482, 13:0/4899, 14:0/8801, 15:0/19681 |
| D3 | 6:1/1, 7:1/2, 8:16/46, 9:19/151, 10:74/301, 11:75/822, 12:75/1337, 13:295/2936, 14:0/7224, 15:0/13053 |
| M-high | 4:1/1, 5:3/5, 6:9/35, 7:18/97, 8:18/419, 9:112/1277, 10:224/2556, 11:0/4720, 12:0/9872, 13:0/22307, 14:0/47449, 15:0/113757 |
| D4 | 3:0/1, 4:0/4, 5:0/16, 6:0/49, 7:0/18, 8:0/549, 9:0/2054, 10:0/5569, 11:0/12271, 12:0/27705, 13:0/62887, 14:0/152932, 15:0/372598 |
| M-high-t20 | 4:1/1, 5:3/5, 6:9/35, 7:18/97, 8:18/419, 9:112/1277, 10:224/2556, 11:0/4720, 12:0/9872, 13:0/22307, 14:0/47449, 15:0/113757 |
| D4-t20 | 3:0/1, 4:0/4, 5:0/16, 6:0/49, 7:0/18, 8:0/549, 9:0/2054, 10:0/5569, 11:0/12271, 12:0/27705, 13:0/62887, 14:0/152932, 15:0/372598 |
