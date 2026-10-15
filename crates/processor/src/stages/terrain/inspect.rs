//! Read DEM metadata with `gdalinfo -json` and decide whether the sources can
//! be combined. The checks are pure functions so they are unit tested
//! without GDAL.

use serde_json::Value;
use std::path::PathBuf;

/// Drivers opened in V1. Others stay closed until the packaged driver set is tested.
const SUPPORTED_DRIVERS: &[&str] = &["GTiff", "AAIGrid"];
pub const WGS84: u32 = 4326;
/// WGS 84 and CGCS2000 geographic.
const KNOWN_GEOGRAPHIC: &[u32] = &[4326, 4490];

#[derive(Debug, Clone, PartialEq)]
pub struct RasterInfo {
    pub path: PathBuf,
    pub driver: String,
    pub width: u64,
    pub height: u64,
    pub band_count: usize,
    pub data_type: String,
    pub nodata: Option<f64>,
    pub geo_transform: [f64; 6],
    pub wkt: String,
    pub epsg: Option<u32>,
    pub geographic: bool,
    pub has_overviews: bool,
}

impl RasterInfo {
    pub fn pixel_size(&self) -> (f64, f64) {
        (self.geo_transform[1], self.geo_transform[5])
    }

    /// (min_x, min_y, max_x, max_y) in the raster CRS.
    pub fn bounds(&self) -> (f64, f64, f64, f64) {
        let t = &self.geo_transform;
        let x2 = t[0] + t[1] * self.width as f64;
        let y2 = t[3] + t[5] * self.height as f64;
        (t[0].min(x2), t[3].min(y2), t[0].max(x2), t[3].max(y2))
    }
}

pub fn parse_gdalinfo(path: PathBuf, value: &Value) -> Result<RasterInfo, String> {
    let bad = |what: &str| format!("terrain input unreadable: {} ({what})", path.display());
    let size = value.get("size").and_then(Value::as_array).ok_or_else(|| bad("no size"))?;
    let width = size.first().and_then(Value::as_u64).ok_or_else(|| bad("no width"))?;
    let height = size.get(1).and_then(Value::as_u64).ok_or_else(|| bad("no height"))?;
    let bands = value.get("bands").and_then(Value::as_array).cloned().unwrap_or_default();
    let first_band = bands.first();
    let nodata = first_band.and_then(|band| band.get("noDataValue")).and_then(|nodata| match nodata {
        Value::Number(number) => number.as_f64(),
        Value::String(text) if text.eq_ignore_ascii_case("nan") => Some(f64::NAN),
        Value::String(text) => text.parse().ok(),
        _ => None,
    });
    let mut geo_transform = [0.0; 6];
    let transform = value.get("geoTransform").and_then(Value::as_array);
    match transform {
        Some(items) if items.len() == 6 => {
            for (slot, item) in geo_transform.iter_mut().zip(items) {
                *slot = item.as_f64().ok_or_else(|| bad("bad geoTransform"))?;
            }
        }
        _ => return Err(format!("terrain input has no georeferencing: {}", path.display())),
    }
    let wkt = value
        .pointer("/coordinateSystem/wkt")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string();
    Ok(RasterInfo {
        driver: value.get("driverShortName").and_then(Value::as_str).unwrap_or_default().to_string(),
        width,
        height,
        band_count: bands.len(),
        data_type: first_band
            .and_then(|band| band.get("type"))
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string(),
        nodata,
        geo_transform,
        epsg: top_level_epsg(&wkt),
        geographic: wkt.trim_start().starts_with("GEOGCRS") || wkt.trim_start().starts_with("GEOGCS"),
        has_overviews: first_band
            .and_then(|band| band.get("overviews"))
            .and_then(Value::as_array)
            .is_some_and(|items| !items.is_empty()),
        wkt,
        path,
    })
}

/// The CRS identifier is the last `ID["EPSG",n]` of a WKT2 string (nested
/// IDs belong to datums, units and axes and come first).
fn top_level_epsg(wkt: &str) -> Option<u32> {
    let trimmed = wkt.trim_end().strip_suffix(']')?.trim_end();
    let start = trimmed.rfind("ID[\"EPSG\",").or_else(|| trimmed.rfind("AUTHORITY[\"EPSG\",\""))?;
    let tail = &trimmed[start..];
    let digits: String = tail
        .chars()
        .skip_while(|c| !c.is_ascii_digit())
        .take_while(|c| c.is_ascii_digit())
        .collect();
    // Only accept it when nothing but closing brackets follows, i.e. it is the CRS's own ID.
    let rest = &tail[tail.find(&digits)? + digits.len()..];
    if rest.chars().all(|c| c == ']' || c == '"' || c.is_whitespace()) {
        digits.parse().ok()
    } else {
        None
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct SourcePlan {
    /// EPSG code the sources are read in; `None` when only a WKT is known.
    pub epsg: Option<u32>,
    pub crs_user_specified: bool,
    /// Every input that is not EPSG:4326 is warped first (P0 rule).
    pub needs_warp: bool,
    /// Index pairs whose extents overlap. gdalbuildvrt takes the later source.
    pub overlaps: Vec<(usize, usize)>,
    pub nodata: Option<f64>,
}

pub fn plan_sources(sources: &[RasterInfo], crs_override: Option<u32>) -> Result<SourcePlan, String> {
    let first = sources.first().ok_or("terrain input: no sources")?;
    for source in sources {
        check_single(source, crs_override)?;
    }
    for source in &sources[1..] {
        if crs_override.is_none() && !same_crs(first, source) {
            return Err(format!(
                "terrain input: {} 与 {} 坐标系不同；V1 只合并同一坐标系的数据，请先统一坐标系",
                first.path.display(),
                source.path.display()
            ));
        }
        if !close(first.pixel_size().0, source.pixel_size().0) || !close(first.pixel_size().1, source.pixel_size().1) {
            return Err(format!(
                "terrain input: {} 与 {} 像元大小不同；V1 只合并同一分辨率的数据",
                first.path.display(),
                source.path.display()
            ));
        }
        if !same_nodata(first.nodata, source.nodata) {
            return Err(format!(
                "terrain input: {} 与 {} 的 NoData 值不同",
                first.path.display(),
                source.path.display()
            ));
        }
    }

    let epsg = crs_override.or(first.epsg);
    // Without PROJ in the processor only well-known geographic codes are
    // recognised for an override; the projected-looks-like-degrees heuristic
    // is applied to CRSs read from the file only.
    let geographic = match crs_override {
        Some(code) => KNOWN_GEOGRAPHIC.contains(&code),
        None => first.geographic,
    };
    for source in sources {
        check_extent(source, geographic, crs_override.is_none())?;
    }

    let mut overlaps = Vec::new();
    for i in 0..sources.len() {
        for j in i + 1..sources.len() {
            if overlap(sources[i].bounds(), sources[j].bounds()) {
                overlaps.push((i, j));
            }
        }
    }
    Ok(SourcePlan {
        epsg,
        crs_user_specified: crs_override.is_some(),
        needs_warp: epsg != Some(WGS84),
        overlaps,
        nodata: first.nodata,
    })
}

fn check_single(source: &RasterInfo, crs_override: Option<u32>) -> Result<(), String> {
    let name = source.path.display();
    if !SUPPORTED_DRIVERS.contains(&source.driver.as_str()) {
        return Err(format!(
            "terrain input: {name} 的格式 {} 暂不支持（V1 支持 GeoTIFF/BigTIFF 与 ASC）",
            source.driver
        ));
    }
    if source.band_count != 1 {
        return Err(format!("terrain input: {name} 有 {} 个波段，DEM 必须是单波段", source.band_count));
    }
    if source.width == 0 || source.height == 0 {
        return Err(format!("terrain input: {name} 尺寸为 0"));
    }
    let t = &source.geo_transform;
    if t[2] != 0.0 || t[4] != 0.0 {
        return Err(format!("terrain input: {name} 带旋转的地理变换暂不支持"));
    }
    if t[1] <= 0.0 || t[5] == 0.0 {
        return Err(format!("terrain input: {name} 像元大小无效"));
    }
    if source.wkt.trim().is_empty() && crs_override.is_none() {
        return Err(format!(
            "terrain crs missing: {name} 没有坐标系；请在任务中明确指定源坐标系（不会自动猜测）"
        ));
    }
    Ok(())
}

fn check_extent(source: &RasterInfo, geographic: bool, crs_from_file: bool) -> Result<(), String> {
    let (min_x, min_y, max_x, max_y) = source.bounds();
    let name = source.path.display();
    if geographic {
        if min_x < -180.0 - 1e-6 || max_x > 180.0 + 1e-6 || min_y < -90.0 - 1e-6 || max_y > 90.0 + 1e-6 {
            return Err(format!(
                "terrain crs mismatch: {name} 按经纬度解释时范围是 ({min_x:.3}, {min_y:.3})–({max_x:.3}, {max_y:.3})，\
                 超出经纬度取值，可能是投影坐标被当作了经纬度"
            ));
        }
    } else if crs_from_file {
        // Projected metres rarely look like a small lon/lat box with sub-0.01 pixels.
        let pixel = source.pixel_size().0.abs();
        let looks_like_degrees =
            min_x >= -180.0 && max_x <= 180.0 && min_y >= -90.0 && max_y <= 90.0 && pixel < 0.01;
        if looks_like_degrees {
            return Err(format!(
                "terrain crs mismatch: {name} 声明为投影坐标，但范围和像元大小像经纬度；请核对坐标系"
            ));
        }
    }
    Ok(())
}

fn same_crs(a: &RasterInfo, b: &RasterInfo) -> bool {
    match (a.epsg, b.epsg) {
        (Some(x), Some(y)) => x == y,
        _ => a.wkt == b.wkt,
    }
}

fn same_nodata(a: Option<f64>, b: Option<f64>) -> bool {
    match (a, b) {
        (None, None) => true,
        (Some(x), Some(y)) => x == y || x.is_nan() && y.is_nan(),
        _ => false,
    }
}

fn close(a: f64, b: f64) -> bool {
    (a - b).abs() <= 1e-9 * a.abs().max(b.abs())
}

fn overlap(a: (f64, f64, f64, f64), b: (f64, f64, f64, f64)) -> bool {
    a.0 < b.2 && b.0 < a.2 && a.1 < b.3 && b.1 < a.3
}

/// First level whose height grid is at least as fine as the source pixels.
/// Geodetic level z tiles are 180 / 2^z degrees wide and CTB samples 64
/// cells across a tile. A heuristic until T12.1 measures it.
pub fn auto_max_depth(pixel_degrees: f64) -> u8 {
    if !(pixel_degrees > 0.0) {
        return 0;
    }
    let level = (180.0 / (super::verify::CTB_GRID_CELLS * pixel_degrees)).log2().ceil();
    level.clamp(0.0, geoforge_protocol::TERRAIN_MAX_DEPTH as f64) as u8
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    const WKT_4547: &str = r#"PROJCRS["CGCS2000 / 3-degree Gauss-Kruger CM 114E",BASEGEOGCRS["China Geodetic Coordinate System 2000",DATUM["China 2000",ELLIPSOID["CGCS2000",6378137,298.257222101,LENGTHUNIT["metre",1]]],PRIMEM["Greenwich",0,ANGLEUNIT["degree",0.0174532925199433]],ID["EPSG",4490]],CONVERSION["Gauss-Kruger CM 114E",METHOD["Transverse Mercator",ID["EPSG",9807]]],CS[Cartesian,2],AXIS["northing (X)",north,ORDER[1],LENGTHUNIT["metre",1]],USAGE[SCOPE["unknown"],AREA["China - 112.5E to 115.5E"],BBOX[21.52,112.5,45.45,115.5]],ID["EPSG",4547]]"#;
    const WKT_4326: &str = r#"GEOGCRS["WGS 84",DATUM["World Geodetic System 1984",ELLIPSOID["WGS 84",6378137,298.257223563,LENGTHUNIT["metre",1]]],CS[ellipsoidal,2],AXIS["geodetic latitude (Lat)",north,ORDER[1],ANGLEUNIT["degree",0.0174532925199433]],ID["EPSG",4326]]"#;

    fn gdalinfo(wkt: &str, transform: [f64; 6], nodata: Option<f64>) -> Value {
        let mut band = json!({ "band": 1, "type": "Float32", "overviews": [] });
        if let Some(value) = nodata {
            band["noDataValue"] = json!(value);
        }
        json!({
            "driverShortName": "GTiff",
            "size": [100, 100],
            "geoTransform": transform,
            "coordinateSystem": { "wkt": wkt },
            "bands": [band]
        })
    }

    fn geographic(x: f64, nodata: Option<f64>) -> RasterInfo {
        parse_gdalinfo(format!("{x}.tif").into(), &gdalinfo(WKT_4326, [x, 0.001, 0.0, 30.0, 0.0, -0.001], nodata)).unwrap()
    }

    #[test]
    fn reads_crs_nodata_and_bounds() {
        let info = parse_gdalinfo("a.tif".into(), &gdalinfo(WKT_4547, [500000.0, 10.0, 0.0, 3400000.0, 0.0, -10.0], Some(-9999.0))).unwrap();
        assert_eq!(info.epsg, Some(4547));
        assert!(!info.geographic);
        assert_eq!(info.nodata, Some(-9999.0));
        assert_eq!(info.bounds(), (500000.0, 3399000.0, 501000.0, 3400000.0));
        let nan = parse_gdalinfo("b.tif".into(), &json!({
            "driverShortName": "GTiff", "size": [1, 1], "geoTransform": [0, 1, 0, 0, 0, -1],
            "coordinateSystem": { "wkt": WKT_4326 }, "bands": [{ "type": "Float32", "noDataValue": "nan" }]
        })).unwrap();
        assert!(nan.nodata.unwrap().is_nan());
        assert_eq!(nan.epsg, Some(4326));
    }

    #[test]
    fn projected_input_is_warped_and_wgs84_is_not() {
        let projected = parse_gdalinfo("a.tif".into(), &gdalinfo(WKT_4547, [500000.0, 10.0, 0.0, 3400000.0, 0.0, -10.0], None)).unwrap();
        assert!(plan_sources(&[projected], None).unwrap().needs_warp);
        assert!(!plan_sources(&[geographic(114.0, None)], None).unwrap().needs_warp);
    }

    #[test]
    fn missing_crs_fails_unless_the_user_states_it() {
        let info = parse_gdalinfo("a.tif".into(), &gdalinfo("", [114.0, 0.001, 0.0, 30.0, 0.0, -0.001], None)).unwrap();
        let error = plan_sources(&[info.clone()], None).unwrap_err();
        assert!(error.starts_with("terrain crs missing"));
        let plan = plan_sources(&[info], Some(4326)).unwrap();
        assert!(plan.crs_user_specified);
        assert!(!plan.needs_warp);
    }

    #[test]
    fn projected_coordinates_declared_as_degrees_are_rejected() {
        let info = parse_gdalinfo("a.tif".into(), &gdalinfo("", [500000.0, 10.0, 0.0, 3400000.0, 0.0, -10.0], None)).unwrap();
        assert!(plan_sources(&[info.clone()], Some(4326)).unwrap_err().starts_with("terrain crs mismatch"));
        assert!(plan_sources(&[info], Some(4547)).unwrap().needs_warp);
        let degrees = parse_gdalinfo("d.tif".into(), &gdalinfo(WKT_4547, [114.0, 0.001, 0.0, 30.0, 0.0, -0.001], None)).unwrap();
        assert!(plan_sources(&[degrees], None).unwrap_err().starts_with("terrain crs mismatch"));
    }

    #[test]
    fn mixed_crs_resolution_or_nodata_are_rejected() {
        let projected = parse_gdalinfo("p.tif".into(), &gdalinfo(WKT_4547, [500000.0, 10.0, 0.0, 3400000.0, 0.0, -10.0], None)).unwrap();
        assert!(plan_sources(&[geographic(114.0, None), projected], None).unwrap_err().contains("坐标系不同"));
        let mut coarse = geographic(114.1, None);
        coarse.geo_transform[1] = 0.002;
        assert!(plan_sources(&[geographic(114.0, None), coarse], None).unwrap_err().contains("像元大小"));
        assert!(plan_sources(&[geographic(114.0, Some(-9999.0)), geographic(114.1, None)], None).unwrap_err().contains("NoData"));
    }

    #[test]
    fn adjacent_sources_do_not_overlap_but_shifted_ones_do() {
        let plan = plan_sources(&[geographic(114.0, None), geographic(114.1, None)], None).unwrap();
        assert!(plan.overlaps.is_empty());
        let plan = plan_sources(&[geographic(114.0, None), geographic(114.05, None)], None).unwrap();
        assert_eq!(plan.overlaps, vec![(0, 1)]);
    }

    #[test]
    fn rejects_unsupported_driver_and_multiband() {
        let mut info = geographic(114.0, None);
        info.driver = "HFA".into();
        assert!(plan_sources(&[info], None).unwrap_err().contains("暂不支持"));
        let mut info = geographic(114.0, None);
        info.band_count = 3;
        assert!(plan_sources(&[info], None).unwrap_err().contains("单波段"));
    }

    #[test]
    fn auto_depth_follows_pixel_size() {
        // ~30 m pixels (1 arc-second) land on level 14.
        assert_eq!(auto_max_depth(1.0 / 3600.0), 14);
        assert_eq!(auto_max_depth(1.0), 2);
        assert_eq!(auto_max_depth(10.0), 0);
        assert_eq!(auto_max_depth(1e-9), geoforge_protocol::TERRAIN_MAX_DEPTH);
        assert_eq!(auto_max_depth(0.0), 0);
    }
}
