# 05 瓶颈与改进路线

| 瓶颈 | 证据 | 改进 |
|---|---|---|
| B 无 overview 时内存随线程线性涨 | D4 默认约 17 GB；8 线程同类；加 overview 后 2.5 GB | V1 默认 `gdaladdo`；按可用内存限制 `-c`（约 0.6 GB/线程，无 overview 时更严） |
| A 单线程 | 源码无线程池；ActiveProcessorCount 无效；忙核 ≈1.1 | 无法在不改上游的情况下加速；只能靠降低 maxDepth / intensity |
| A 投影坐标静默失败 | D1 直接输入高程全 0 | 调用前强制 gdalwarp 到 EPSG:4326，并在失败时把退出码视为失败 |
| NoData → 0 m | A/B 实测；CesiumLab 同样填 0 | **V1 禁止写死 0**：可配置填充值或保留空洞（见 07） |
| B gzip 与现有资源服务不兼容 | 无 Content-Encoding 时 Cesium 解码失败 | 改 resource_server 或切片后解压 |
| A `--continue` 不可用 | 中断后续跑仍缺 5881 瓦片 | 不承诺；取消后重跑或自研进度 |
| A layer.json 低层越界声明 | 每输出 16 项 | Cesium 能加载；V1 校验时可重写 available |
| B layer.json 键名 `schema` | 源码写死 | 包装层改写成 `scheme` |
| 最大成功体量 | D4 未压缩 2.15 GiB 成功；更大未测 | 不推断 10–100 GB；下一步用真实 ≥10 GB DEM 再测 |
| 磁盘 | D 盘基准后仍余约 71 GB；瓦片与 temp 需预检 | V1 启动前按「源大小 × 系数 + overview」预检 |
