//! Structural and height checks on the finished tile set. Every tile is
//! decoded; heights inside the data extent are compared with the DEM range
//! and sampled DEM values, and neighbouring tiles at the deepest level are
//! compared along their shared edge.

use super::layer::{LayerSummary, TileKey};
use super::quantized_mesh::{decode, QuantizedMeshTile, QUANTIZED_MAX};
use std::collections::HashMap;
use std::path::Path;

pub const CTB_GRID_CELLS: f64 = 64.0;

#[derive(Debug, Clone, PartialEq, Default)]
pub struct VerifyReport {
    pub tiles: usize,
    pub vertices_inside: u64,
    pub vertices_outside: u64,
    /// Inside the data but within two grid cells of its edge (not height-checked).
    pub vertices_edge_band: u64,
    pub min_height_inside: Option<f64>,
    pub max_height_inside: Option<f64>,
    pub max_edge_gap_m: f64,
    pub edge_pairs: usize,
}

/// Lon/lat of a vertex in a geodetic TMS tile.
pub fn vertex_lon_lat(key: TileKey, u: u16, v: u16) -> (f64, f64) {
    let (z, x, y) = key;
    let size = 180.0 / f64::from(1u32 << z);
    let lon = -180.0 + (x as f64 + u as f64 / QUANTIZED_MAX as f64) * size;
    let lat = -90.0 + (y as f64 + v as f64 / QUANTIZED_MAX as f64) * size;
    (lon, lat)
}

/// `inside` is the data extent shrunk by one pixel: vertices there must lie
/// within the DEM height range (plus `tolerance`). Outside it CTB fills the
/// cesium-friendly tiles with 0 m, which is display only and counted apart.
pub fn verify_tiles(
    staged: &Path,
    layer: &LayerSummary,
    inside: [f64; 4],
    height_range: (f64, f64),
    tolerance: f64,
    mut check_cancel: impl FnMut() -> Result<(), String>,
) -> Result<(VerifyReport, Vec<(f64, f64, f64)>), String> {
    let mut report = VerifyReport { tiles: layer.files.len(), ..Default::default() };
    let mut deepest: HashMap<(u32, u32), QuantizedMeshTile> = HashMap::new();
    let mut samples = Vec::new();
    let (low, high) = (height_range.0 - tolerance, height_range.1 + tolerance);

    for (index, key) in layer.files.iter().enumerate() {
        if index % 256 == 0 {
            check_cancel()?;
        }
        let (z, x, y) = *key;
        let path = staged.join(z.to_string()).join(x.to_string()).join(format!("{y}.terrain"));
        let bytes = std::fs::read(&path).map_err(|error| format!("terrain validation: {}: {error}", path.display()))?;
        let tile = decode(&bytes).map_err(|error| format!("terrain validation: tile {z}/{x}/{y}: {error}"))?;
        if tile.triangle_count == 0 {
            return Err(format!("terrain validation: tile {z}/{x}/{y} has no triangles"));
        }
        // CTB meshes come from a 65x65 height grid per tile (vertex u steps
        // of 512 measured on P0 output). On coarse levels a cell near the
        // data edge mixes in the 0 m outside the data, so the strict check
        // starts two grid cells inside the edge.
        let margin = 2.0 * 180.0 / f64::from(1u32 << z) / CTB_GRID_CELLS;
        let strict = [inside[0] + margin, inside[1] + margin, inside[2] - margin, inside[3] - margin];
        for i in 0..tile.u.len() {
            let (lon, lat) = vertex_lon_lat(*key, tile.u[i], tile.v[i]);
            let height = tile.height(i);
            if lon < inside[0] || lon > inside[2] || lat < inside[1] || lat > inside[3] {
                report.vertices_outside += 1;
                continue;
            }
            if lon < strict[0] || lon > strict[2] || lat < strict[1] || lat > strict[3] {
                report.vertices_edge_band += 1;
                continue;
            }
            report.vertices_inside += 1;
            report.min_height_inside = Some(report.min_height_inside.map_or(height, |m| m.min(height)));
            report.max_height_inside = Some(report.max_height_inside.map_or(height, |m| m.max(height)));
            if height < low || height > high {
                return Err(format!(
                    "terrain validation: tile {z}/{x}/{y} has a vertex at {height:.2} m inside the data extent, \
                     outside the DEM range {:.2}..{:.2} m",
                    height_range.0, height_range.1
                ));
            }
            if z == layer.max_zoom && i % 7 == 0 {
                samples.push((lon, lat, height));
            }
        }
        if z == layer.max_zoom {
            deepest.insert((x, y), tile);
        }
    }

    for ((x, y), tile) in &deepest {
        if let Some(east) = deepest.get(&(x + 1, *y)) {
            report.max_edge_gap_m = report.max_edge_gap_m.max(edge_gap(tile, &tile.east, east, &east.west, |t, i| t.v[i]));
            report.edge_pairs += 1;
        }
        if let Some(north) = deepest.get(&(*x, y + 1)) {
            report.max_edge_gap_m = report.max_edge_gap_m.max(edge_gap(tile, &tile.north, north, &north.south, |t, i| t.u[i]));
            report.edge_pairs += 1;
        }
    }
    Ok((report, thin(samples, 2_000)))
}

/// Largest height difference between `a`'s edge vertices and `b`'s edge,
/// interpolated linearly along the shared border.
fn edge_gap(
    a: &QuantizedMeshTile,
    a_edge: &[u32],
    b: &QuantizedMeshTile,
    b_edge: &[u32],
    along: impl Fn(&QuantizedMeshTile, usize) -> u16,
) -> f64 {
    let mut line: Vec<(u16, f64)> = b_edge.iter().map(|i| (along(b, *i as usize), b.height(*i as usize))).collect();
    line.sort_by_key(|(position, _)| *position);
    if line.is_empty() {
        return 0.0;
    }
    let mut gap: f64 = 0.0;
    for index in a_edge {
        let position = along(a, *index as usize);
        let height = a.height(*index as usize);
        let at = line.partition_point(|(p, _)| *p < position);
        let other = if at == 0 {
            line[0].1
        } else if at == line.len() {
            line[line.len() - 1].1
        } else {
            let (p0, h0) = line[at - 1];
            let (p1, h1) = line[at];
            if p1 == p0 {
                h1
            } else {
                h0 + (h1 - h0) * (position - p0) as f64 / (p1 - p0) as f64
            }
        };
        gap = gap.max((height - other).abs());
    }
    gap
}

fn thin<T>(items: Vec<T>, limit: usize) -> Vec<T> {
    if items.len() <= limit {
        return items;
    }
    let step = items.len().div_ceil(limit);
    items.into_iter().step_by(step).collect()
}

#[derive(Debug, Clone, PartialEq)]
pub struct SampleReport {
    pub count: usize,
    pub rmse_m: f64,
    pub p95_m: f64,
    pub max_abs_m: f64,
}

/// Compare mesh vertex heights with DEM values at the same position
/// (`None` where the DEM has no value there).
pub fn compare_samples(vertices: &[(f64, f64, f64)], dem: &[Option<f64>]) -> Option<SampleReport> {
    let diffs: Vec<f64> = vertices
        .iter()
        .zip(dem)
        .filter_map(|((_, _, mesh), dem)| dem.map(|dem| mesh - dem))
        .collect();
    if diffs.is_empty() {
        return None;
    }
    let rmse = (diffs.iter().map(|d| d * d).sum::<f64>() / diffs.len() as f64).sqrt();
    let mut abs: Vec<f64> = diffs.iter().map(|d| d.abs()).collect();
    abs.sort_by(f64::total_cmp);
    let p95 = abs[((abs.len() as f64 * 0.95).ceil() as usize).clamp(1, abs.len()) - 1];
    Some(SampleReport { count: diffs.len(), rmse_m: rmse, p95_m: p95, max_abs_m: *abs.last().unwrap() })
}

#[cfg(test)]
mod tests {
    use super::super::quantized_mesh::tests::encode_square;
    use super::*;
    use std::collections::BTreeSet;

    fn write(dir: &Path, key: TileKey, bytes: Vec<u8>) {
        let path = dir.join(key.0.to_string()).join(key.1.to_string()).join(format!("{}.terrain", key.2));
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(path, bytes).unwrap();
    }

    fn summary(files: &[TileKey], max_zoom: u8) -> LayerSummary {
        LayerSummary {
            declared_tiles: files.len(),
            files: files.iter().copied().collect::<BTreeSet<_>>(),
            undeclared_files: 0,
            max_zoom,
            bounds: [-180.0, -90.0, 180.0, 90.0],
        }
    }

    #[test]
    fn vertex_position_follows_geodetic_tms() {
        assert_eq!(vertex_lon_lat((0, 0, 0), 0, 0), (-180.0, -90.0));
        assert_eq!(vertex_lon_lat((0, 1, 0), QUANTIZED_MAX, QUANTIZED_MAX), (180.0, 90.0));
        assert_eq!(vertex_lon_lat((1, 3, 1), 0, 0), (90.0, 0.0));
    }

    #[test]
    fn matching_neighbours_have_no_gap_and_heights_pass() {
        let dir = tempfile::tempdir().unwrap();
        // West tile east edge (vertices 1,2) = 100 and 200; east tile west edge (0,3) the same.
        write(dir.path(), (0, 0, 0), encode_square(100.0, 200.0, [0, 0, 32767, 32767], true));
        write(dir.path(), (0, 1, 0), encode_square(100.0, 200.0, [0, 0, 0, 32767], true));
        let (report, samples) = verify_tiles(dir.path(), &summary(&[(0, 0, 0), (0, 1, 0)], 0), [-200.0, -100.0, 200.0, 100.0], (100.0, 200.0), 0.5, || Ok(())).unwrap();
        assert_eq!(report.tiles, 2);
        assert_eq!(report.edge_pairs, 1);
        assert!(report.max_edge_gap_m < 0.01, "{}", report.max_edge_gap_m);
        assert!(!samples.is_empty());
    }

    #[test]
    fn edge_mismatch_is_measured() {
        let dir = tempfile::tempdir().unwrap();
        write(dir.path(), (0, 0, 0), encode_square(100.0, 200.0, [0, 0, 32767, 32767], false));
        write(dir.path(), (0, 1, 0), encode_square(100.0, 200.0, [0, 0, 0, 0], false));
        let (report, _) = verify_tiles(dir.path(), &summary(&[(0, 0, 0), (0, 1, 0)], 0), [-180.0, -90.0, 180.0, 90.0], (100.0, 200.0), 0.5, || Ok(())).unwrap();
        assert!((report.max_edge_gap_m - 100.0).abs() < 0.01);
    }

    #[test]
    fn hidden_zero_inside_the_extent_fails_but_outside_is_counted() {
        let dir = tempfile::tempdir().unwrap();
        // Heights 0..300: vertex 0 sits at 0 m.
        write(dir.path(), (0, 0, 0), encode_square(0.0, 300.0, [0, 32767, 32767, 32767], true));
        let layer = summary(&[(0, 0, 0)], 0);
        let error = verify_tiles(dir.path(), &layer, [-190.0, -100.0, 10.0, 100.0], (250.0, 300.0), 1.0, || Ok(())).unwrap_err();
        assert!(error.contains("outside the DEM range"));
        // Vertices 0 and 3 (lon -180) lie outside a box that starts at lon -100.
        let (report, _) = verify_tiles(dir.path(), &layer, [-100.0, -100.0, 10.0, 100.0], (250.0, 300.0), 1.0, || Ok(())).unwrap();
        assert_eq!(report.vertices_outside, 2);
        // Right at the data edge a 0 m vertex is edge band, not a failure.
        let (report, _) = verify_tiles(dir.path(), &layer, [-180.5, -100.0, 10.0, 100.0], (250.0, 300.0), 1.0, || Ok(())).unwrap();
        assert_eq!(report.vertices_edge_band, 2);
    }

    #[test]
    fn corrupt_tile_fails_validation() {
        let dir = tempfile::tempdir().unwrap();
        write(dir.path(), (0, 0, 0), vec![0x1f, 0x8b, 0, 0]);
        let error = verify_tiles(dir.path(), &summary(&[(0, 0, 0)], 0), [-180.0, -90.0, 180.0, 90.0], (0.0, 1.0), 0.0, || Ok(())).unwrap_err();
        assert!(error.starts_with("terrain validation: tile 0/0/0"));
    }

    #[test]
    fn sample_comparison_skips_missing_dem_values() {
        let report = compare_samples(&[(0.0, 0.0, 10.0), (0.0, 0.0, 12.0), (0.0, 0.0, 99.0)], &[Some(10.0), Some(10.0), None]).unwrap();
        assert_eq!(report.count, 2);
        assert!((report.max_abs_m - 2.0).abs() < 1e-9);
        assert!((report.rmse_m - 2.0f64.sqrt()).abs() < 1e-9);
        assert!((report.p95_m - 2.0).abs() < 1e-9);
    }
}
