//! P0 cost probe for candidate C (reearth/terrain-codec). Not a full tiler.
use std::{fs, path::PathBuf, time::Instant};
use terrain_codec::quantized_mesh::TileBounds;
use terrain_codec::terrain::{encode_terrain_from_fn, TerrainOptions};
fn truth(lon: f64, lat: f64) -> f64 {
    600.0 + 250.0 * ((lon - 113.9) * 40.0).sin() * ((lat - 30.4) * 35.0).cos()
        + 80.0 * ((lon + lat) * 90.0).sin() + 300.0 * (lat - 30.4)
}
fn main() {
    let out = PathBuf::from(std::env::args().nth(1).unwrap_or_else(|| r"D:\work\terrain-p0\out\C-D0".into()));
    let maxz: u32 = std::env::args().nth(2).and_then(|s| s.parse().ok()).unwrap_or(12);
    let (w, s, e, n) = (113.9, 30.4, 114.1, 30.6); let grid = 65u32; let t0 = Instant::now();
    let mut available = vec![]; let mut count = 0usize;
    for z in 0..=maxz {
        let size = 180.0 / f64::from(1u32 << z);
        let (mut x0, mut x1) = (((w + 180.0) / size).floor() as u32, ((e + 180.0) / size).floor() as u32);
        let (mut y0, mut y1) = (((s + 90.0) / size).floor() as u32, ((n + 90.0) / size).floor() as u32);
        if z == 0 { x0 = 0; x1 = 1; y0 = 0; y1 = 0; }
        available.push(serde_json::json!([{ "startX": x0, "startY": y0, "endX": x1, "endY": y1 }]));
        for x in x0..=x1 { for y in y0..=y1 {
            let b = TileBounds { west: -180.0 + x as f64 * size, south: -90.0 + y as f64 * size,
                east: -180.0 + (x + 1) as f64 * size, north: -90.0 + (y + 1) as f64 * size };
            let step_x = (b.east - b.west) / (grid - 1) as f64; let step_y = (b.north - b.south) / (grid - 1) as f64;
            let opts = TerrainOptions { max_error: 1.0, compression_level: 0, ..Default::default() };
            let bytes = encode_terrain_from_fn(grid, &b, |gx, gy| {
                let lon = b.west + gx as f64 * step_x; let lat = b.north - gy as f64 * step_y;
                if lon < w || lon > e || lat < s || lat > n { 0.0 } else { truth(lon, lat) }
            }, &opts);
            let dir = out.join(z.to_string()).join(x.to_string()); fs::create_dir_all(&dir).unwrap();
            fs::write(dir.join(format!("{y}.terrain")), bytes).unwrap(); count += 1;
        }}
    }
    let layer = serde_json::json!({ "tilejson": "2.1.0", "format": "quantized-mesh-1.0", "version": "1.0.0",
        "scheme": "tms", "projection": "EPSG:4326", "tiles": ["{z}/{x}/{y}.terrain"], "bounds": [w, s, e, n],
        "minzoom": 0, "maxzoom": maxz, "available": available });
    fs::write(out.join("layer.json"), serde_json::to_string_pretty(&layer).unwrap()).unwrap();
    eprintln!("tiles={count} maxz={maxz} seconds={:.3}", t0.elapsed().as_secs_f64());
}
