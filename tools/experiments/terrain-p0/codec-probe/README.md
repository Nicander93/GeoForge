# terrain-codec 成本探针（候选 C）

固定上游 `reearth/terrain-codec` commit `91aa7d2eee0defe2a51edb53d89161816cbfc537`。
这不是完整切片器：只演示「解析高程函数 → martini RTIN → quantized-mesh 文件 + layer.json」。

```powershell
cd tools\experiments\terrain-p0\codec-probe
cargo build --release
.\target\release\terrain-codec-probe.exe D:\work\terrain-p0\out\C-D0 12
```

Windows 实测：release 构建约 13 s；D0 曲面 maxDepth 12 生成 77 瓦片约 0.086 s；`qm_validate.py` 通过（控制点 RMSE 约 0.42 m）。
