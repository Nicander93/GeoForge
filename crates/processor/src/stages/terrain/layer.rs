//! Normalise CTB's `layer.json` and check that `available` matches the tiles
//! on disk.

use serde_json::{json, Value};
use std::collections::BTreeSet;
use std::path::Path;

pub type TileKey = (u8, u32, u32);

#[derive(Debug, Clone, PartialEq)]
pub struct LayerSummary {
    pub declared_tiles: usize,
    pub files: BTreeSet<TileKey>,
    /// Files outside every `available` range; Cesium never requests them.
    pub undeclared_files: usize,
    pub max_zoom: u8,
    pub bounds: [f64; 4],
}

/// Every `z/x/y.terrain` below `dir`.
pub fn list_tiles(dir: &Path) -> Result<BTreeSet<TileKey>, String> {
    let mut tiles = BTreeSet::new();
    let read = |path: &Path| std::fs::read_dir(path).map_err(|error| format!("{}: {error}", path.display()));
    for z_entry in read(dir)? {
        let z_entry = z_entry.map_err(|error| error.to_string())?;
        let Some(z) = number::<u8>(&z_entry.file_name().to_string_lossy()) else { continue };
        if !z_entry.path().is_dir() {
            continue;
        }
        for x_entry in read(&z_entry.path())? {
            let x_entry = x_entry.map_err(|error| error.to_string())?;
            let Some(x) = number::<u32>(&x_entry.file_name().to_string_lossy()) else { continue };
            for y_entry in read(&x_entry.path())? {
                let y_entry = y_entry.map_err(|error| error.to_string())?;
                let name = y_entry.file_name().to_string_lossy().into_owned();
                if let Some(y) = name.strip_suffix(".terrain").and_then(number::<u32>) {
                    tiles.insert((z, x, y));
                }
            }
        }
    }
    Ok(tiles)
}

fn number<T: std::str::FromStr>(text: &str) -> Option<T> {
    text.chars().all(|c| c.is_ascii_digit()).then(|| text.parse().ok()).flatten()
}

/// Fix the CTB fork's misspelt `schema` key, fill in the fields Cesium
/// needs, and fail when a declared tile is missing on disk.
pub fn normalize(layer: &mut Value, files: &BTreeSet<TileKey>) -> Result<LayerSummary, String> {
    let object = layer.as_object_mut().ok_or("terrain validation: layer.json is not an object")?;
    if let Some(value) = object.remove("schema") {
        object.entry("scheme").or_insert(value);
    }
    let scheme = object.get("scheme").and_then(Value::as_str).unwrap_or("tms");
    if scheme != "tms" {
        return Err(format!("terrain validation: layer.json scheme is {scheme}, expected tms"));
    }
    object.insert("scheme".into(), json!("tms"));
    let format = object.get("format").and_then(Value::as_str).unwrap_or_default();
    if format != "quantized-mesh-1.0" {
        return Err(format!("terrain validation: layer.json format is {format:?}, expected quantized-mesh-1.0"));
    }
    if object.get("projection").and_then(Value::as_str).unwrap_or("EPSG:4326") != "EPSG:4326" {
        return Err("terrain validation: layer.json projection must be EPSG:4326".into());
    }
    object.insert("projection".into(), json!("EPSG:4326"));
    let tiles_ok = object
        .get("tiles")
        .and_then(Value::as_array)
        .is_some_and(|tiles| tiles.iter().any(|t| t.as_str().is_some_and(|t| t.contains("{z}") && t.contains("{x}") && t.contains("{y}"))));
    if !tiles_ok {
        return Err("terrain validation: layer.json tiles template is missing {z}/{x}/{y}".into());
    }
    let bounds: Vec<f64> = object
        .get("bounds")
        .and_then(Value::as_array)
        .map(|items| items.iter().filter_map(Value::as_f64).collect())
        .unwrap_or_default();
    let bounds: [f64; 4] = bounds.try_into().map_err(|_| "terrain validation: layer.json bounds must have 4 numbers")?;

    let available = object
        .get("available")
        .and_then(Value::as_array)
        .ok_or("terrain validation: layer.json has no available list")?;
    let mut declared = BTreeSet::new();
    for (z, ranges) in available.iter().enumerate() {
        for range in ranges.as_array().into_iter().flatten() {
            let field = |name: &str| {
                range
                    .get(name)
                    .and_then(Value::as_u64)
                    .ok_or_else(|| format!("terrain validation: available[{z}] range lacks {name}"))
            };
            let (start_x, end_x, start_y, end_y) = (field("startX")?, field("endX")?, field("startY")?, field("endY")?);
            if end_x < start_x || end_y < start_y {
                return Err(format!("terrain validation: available[{z}] has an inverted range"));
            }
            for x in start_x..=end_x {
                for y in start_y..=end_y {
                    declared.insert((z as u8, x as u32, y as u32));
                }
            }
        }
    }
    if declared.is_empty() {
        return Err("terrain validation: layer.json declares no tiles".into());
    }
    let missing: Vec<_> = declared.difference(files).take(5).collect();
    if !missing.is_empty() {
        return Err(format!(
            "terrain validation: {} declared tiles are missing, e.g. {:?}",
            declared.difference(files).count(),
            missing
        ));
    }
    let max_zoom = declared.iter().map(|(z, _, _)| *z).max().unwrap_or(0);
    Ok(LayerSummary {
        declared_tiles: declared.len(),
        undeclared_files: files.difference(&declared).count(),
        files: files.clone(),
        max_zoom,
        bounds,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ctb_layer() -> Value {
        json!({
            "tilejson": "2.1.0",
            "format": "quantized-mesh-1.0",
            "version": "1.0.0",
            "schema": "tms",
            "tiles": ["{z}/{x}/{y}.terrain?v={version}"],
            "projection": "EPSG:4326",
            "bounds": [114.0, 30.0, 114.1, 30.1],
            "available": [
                [{ "startX": 0, "startY": 0, "endX": 1, "endY": 0 }],
                [{ "startX": 3, "startY": 1, "endX": 3, "endY": 1 }]
            ]
        })
    }

    fn files(keys: &[TileKey]) -> BTreeSet<TileKey> {
        keys.iter().copied().collect()
    }

    #[test]
    fn renames_schema_to_scheme() {
        let mut layer = ctb_layer();
        let summary = normalize(&mut layer, &files(&[(0, 0, 0), (0, 1, 0), (1, 3, 1)])).unwrap();
        assert_eq!(layer["scheme"], "tms");
        assert!(layer.get("schema").is_none());
        assert_eq!(summary.declared_tiles, 3);
        assert_eq!(summary.max_zoom, 1);
        assert_eq!(summary.undeclared_files, 0);
    }

    #[test]
    fn missing_declared_tile_fails_and_extra_files_are_counted() {
        let mut layer = ctb_layer();
        let error = normalize(&mut layer, &files(&[(0, 0, 0), (0, 1, 0)])).unwrap_err();
        assert!(error.contains("1 declared tiles are missing"));
        let mut layer = ctb_layer();
        let summary = normalize(&mut layer, &files(&[(0, 0, 0), (0, 1, 0), (1, 3, 1), (1, 2, 1)])).unwrap();
        assert_eq!(summary.undeclared_files, 1);
    }

    #[test]
    fn rejects_wrong_format_or_projection() {
        let mut layer = ctb_layer();
        layer["format"] = json!("heightmap-1.0");
        assert!(normalize(&mut layer, &files(&[])).is_err());
        let mut layer = ctb_layer();
        layer["projection"] = json!("EPSG:3857");
        assert!(normalize(&mut layer, &files(&[])).is_err());
    }

    #[test]
    fn lists_only_numeric_tile_paths() {
        let dir = tempfile::tempdir().unwrap();
        for rel in ["0/0/0.terrain", "0/1/0.terrain", "1/3/1.terrain", "1/3/x.terrain", "1/3/1.terrain.tmp", "tmp/0/0.terrain"] {
            let path = dir.path().join(rel);
            std::fs::create_dir_all(path.parent().unwrap()).unwrap();
            std::fs::write(path, b"").unwrap();
        }
        assert_eq!(list_tiles(dir.path()).unwrap(), files(&[(0, 0, 0), (0, 1, 0), (1, 3, 1)]));
    }
}
