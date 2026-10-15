//! Read DEM metadata with `gdalinfo -json` and decide whether the sources can
//! be combined. The CRS itself comes from `crs.rs` (GDAL/PROJ); the checks
//! here are pure functions so they are unit tested without GDAL.

use super::crs::CrsReport;
use serde_json::Value;
use std::path::PathBuf;

/// Drivers opened in V1. Others stay closed until the packaged driver set is tested.
const SUPPORTED_DRIVERS: &[&str] = &["GTiff", "AAIGrid", "VRT"];

#[derive(Debug, Clone, PartialEq)]
pub struct RasterInfo {
    /// What the runtime tools read: the user's file, or a PAM view of it.
    pub path: PathBuf,
    /// The user's file, for reports and messages.
    pub origin: PathBuf,
    pub driver: String,
    pub width: u64,
    pub height: u64,
    pub band_count: usize,
    pub data_type: String,
    pub nodata: Option<f64>,
    pub geo_transform: [f64; 6],
    pub wkt: String,
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
        has_overviews: first_band
            .and_then(|band| band.get("overviews"))
            .and_then(Value::as_array)
            .is_some_and(|items| !items.is_empty()),
        wkt,
        origin: path.clone(),
        path,
    })
}

#[derive(Debug, Clone, PartialEq)]
pub struct SourcePlan {
    /// Same CRS, pixel size and NoData value: the sources can be stacked in
    /// one VRT before anything else. Otherwise each source is warped to
    /// EPSG:4326 on a common grid first.
    pub uniform: bool,
    /// Index pairs whose extents overlap. gdalbuildvrt takes the later source.
    pub overlaps: Vec<(usize, usize)>,
    pub nodata: Option<f64>,
}

/// `crs[i]` is the CRS of `sources[i]` (the override for all of them when
/// `crs_from_file` is false).
pub fn plan_sources(sources: &[RasterInfo], crs: &[CrsReport], crs_from_file: bool) -> Result<SourcePlan, String> {
    let first = sources.first().ok_or("terrain input: no sources")?;
    for source in sources {
        check_single(source, crs_from_file)?;
    }
    let uniform = sources.iter().zip(crs).skip(1).all(|(source, source_crs)| {
        same_crs(&crs[0], source_crs)
            && close(first.pixel_size().0, source.pixel_size().0)
            && close(first.pixel_size().1, source.pixel_size().1)
            && same_nodata(first.nodata, source.nodata)
    });
    check_vertical(sources, crs)?;

    for (source, crs) in sources.iter().zip(crs) {
        check_extent(source, crs.is_geographic())?;
    }

    // Compared in WGS 84 so sources in different CRSs are comparable.
    let wgs84: Vec<Option<(f64, f64, f64, f64)>> = crs
        .iter()
        .map(|crs| crs.selected().and_then(|op| op.wgs84_bounds).map(|b| (b[0], b[1], b[2], b[3])))
        .collect();
    let mut overlaps = Vec::new();
    for i in 0..sources.len() {
        for j in i + 1..sources.len() {
            let pair = match (wgs84[i], wgs84[j]) {
                (Some(a), Some(b)) => (a, b),
                _ => (sources[i].bounds(), sources[j].bounds()),
            };
            if overlap(pair.0, pair.1) {
                overlaps.push((i, j));
            }
        }
    }
    Ok(SourcePlan {
        uniform,
        overlaps,
        nodata: first.nodata,
    })
}

/// Heights are written unchanged, so sources whose vertical reference differs
/// (one compound CRS with EGM96, one without …) cannot be merged.
fn check_vertical(sources: &[RasterInfo], crs: &[CrsReport]) -> Result<(), String> {
    for (index, source_crs) in crs.iter().enumerate().skip(1) {
        if source_crs.vertical_name != crs[0].vertical_name {
            let name = |value: &Option<String>| value.clone().unwrap_or_else(|| "未声明".into());
            return Err(format!(
                "terrain input mixed datum: {} 的高程基准是 {}，{} 是 {}；V1 不做高程基准转换，不能合并",
                sources[0].origin.display(),
                name(&crs[0].vertical_name),
                sources[index].origin.display(),
                name(&source_crs.vertical_name)
            ));
        }
    }
    Ok(())
}

pub(crate) fn check_single(source: &RasterInfo, crs_from_file: bool) -> Result<(), String> {
    let name = source.origin.display();
    if !SUPPORTED_DRIVERS.contains(&source.driver.as_str()) {
        return Err(format!(
            "terrain input: {name} 的格式 {} 暂不支持（V1.2 支持 GeoTIFF/BigTIFF、ASC 与 VRT）",
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
    if source.wkt.trim().is_empty() && crs_from_file {
        return Err(format!(
            "terrain crs missing: {name} 没有坐标系；请在任务中明确指定源坐标系（不会自动猜测）"
        ));
    }
    Ok(())
}

fn check_extent(source: &RasterInfo, geographic: bool) -> Result<(), String> {
    let (min_x, min_y, max_x, max_y) = source.bounds();
    let name = source.origin.display();
    if geographic {
        if min_x < -180.0 - 1e-6 || max_x > 180.0 + 1e-6 || min_y < -90.0 - 1e-6 || max_y > 90.0 + 1e-6 {
            return Err(format!(
                "terrain crs mismatch: {name} 按经纬度解释时范围是 ({min_x:.3}, {min_y:.3})–({max_x:.3}, {max_y:.3})，\
                 超出经纬度取值，可能是投影坐标被当作了经纬度"
            ));
        }
    } else {
        // Projected metres rarely look like a small lon/lat box with sub-0.01 pixels.
        let pixel = source.pixel_size().0.abs();
        let looks_like_degrees =
            min_x >= -180.0 && max_x <= 180.0 && min_y >= -90.0 && max_y <= 90.0 && pixel < 0.01;
        if looks_like_degrees {
            return Err(format!(
                "terrain crs mismatch: {name} 按投影坐标解释，但范围和像元大小像经纬度；请核对坐标系"
            ));
        }
    }
    Ok(())
}

/// Same authority code, or the same WKT as normalised by GDAL.
fn same_crs(a: &CrsReport, b: &CrsReport) -> bool {
    match (&a.authority, &b.authority) {
        (Some(x), Some(y)) => x == y,
        _ => a.wkt.is_some() && a.wkt == b.wkt,
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

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct DepthEstimate {
    pub level: u8,
    /// Source pixel height expressed as latitude degrees.
    pub pixel_latitude_degrees: f64,
    /// The same in metres along the meridian (≈111.32 km per degree).
    pub pixel_ground_metres: f64,
}

/// First level whose height grid is at least as fine as the source pixels.
/// Geodetic level z tiles are 180 / 2^z degrees tall and CTB samples 64
/// cells across a tile. The source pixel is measured on the WGS 84 extent of
/// the data (`lat_span` degrees over `rows` pixels), so metres and degrees
/// cannot be mixed up: a 10 m projected pixel is about 9e-5 degrees.
pub fn auto_max_depth(lat_span: f64, rows: u64) -> DepthEstimate {
    let pixel = if rows > 0 { lat_span / rows as f64 } else { 0.0 };
    let level = if pixel > 0.0 {
        let level = (180.0 / (super::verify::CTB_GRID_CELLS * pixel)).log2().ceil();
        level.clamp(0.0, geoforge_protocol::TERRAIN_MAX_DEPTH as f64) as u8
    } else {
        0
    };
    DepthEstimate { level, pixel_latitude_degrees: pixel, pixel_ground_metres: pixel * 111_320.0 }
}

#[cfg(test)]
mod tests {
    use super::super::crs::{parse_report, tests::d1_report};
    use super::*;
    use serde_json::json;

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

    fn crs_4547() -> CrsReport {
        parse_report(&d1_report()).unwrap()
    }

    fn crs_4326() -> CrsReport {
        parse_report(&json!({
            "ok": true, "name": "WGS 84", "authority": "EPSG:4326", "type": "geographic",
            "horizontalType": "geographic", "wkt": "GEOGCRS[\"WGS 84\"]"
        }))
        .unwrap()
    }

    fn geographic(x: f64, nodata: Option<f64>) -> RasterInfo {
        parse_gdalinfo(format!("{x}.tif").into(), &gdalinfo("GEOGCRS", [x, 0.001, 0.0, 30.0, 0.0, -0.001], nodata)).unwrap()
    }

    fn projected(wkt: &str) -> RasterInfo {
        parse_gdalinfo("p.tif".into(), &gdalinfo(wkt, [500000.0, 10.0, 0.0, 3400000.0, 0.0, -10.0], None)).unwrap()
    }

    #[test]
    fn reads_nodata_and_bounds() {
        let info = parse_gdalinfo("a.tif".into(), &gdalinfo("PROJCRS", [500000.0, 10.0, 0.0, 3400000.0, 0.0, -10.0], Some(-9999.0))).unwrap();
        assert_eq!(info.nodata, Some(-9999.0));
        assert_eq!(info.bounds(), (500000.0, 3399000.0, 501000.0, 3400000.0));
        let nan = parse_gdalinfo("b.tif".into(), &json!({
            "driverShortName": "GTiff", "size": [1, 1], "geoTransform": [0, 1, 0, 0, 0, -1],
            "coordinateSystem": { "wkt": "GEOGCRS" }, "bands": [{ "type": "Float32", "noDataValue": "nan" }]
        })).unwrap();
        assert!(nan.nodata.unwrap().is_nan());
    }

    #[test]
    fn missing_crs_fails_unless_the_user_states_it() {
        let info = parse_gdalinfo("a.tif".into(), &gdalinfo("", [114.0, 0.001, 0.0, 30.0, 0.0, -0.001], None)).unwrap();
        let error = plan_sources(&[info.clone()], &[crs_4326()], true).unwrap_err();
        assert!(error.starts_with("terrain crs missing"));
        plan_sources(&[info], &[crs_4326()], false).unwrap();
    }

    #[test]
    fn projected_coordinates_declared_as_degrees_are_rejected() {
        let info = projected("");
        assert!(plan_sources(&[info.clone()], &[crs_4326()], false).unwrap_err().starts_with("terrain crs mismatch"));
        plan_sources(&[info], &[crs_4547()], false).unwrap();
        let degrees = parse_gdalinfo("d.tif".into(), &gdalinfo("PROJCRS", [114.0, 0.001, 0.0, 30.0, 0.0, -0.001], None)).unwrap();
        assert!(plan_sources(&[degrees.clone()], &[crs_4547()], true).unwrap_err().starts_with("terrain crs mismatch"));
        // The same check applies to a CRS the user states.
        assert!(plan_sources(&[degrees], &[crs_4547()], false).unwrap_err().starts_with("terrain crs mismatch"));
    }

    #[test]
    fn mixed_crs_resolution_or_nodata_make_the_plan_non_uniform() {
        let both = [crs_4326(), crs_4326()];
        assert!(plan_sources(&[geographic(114.0, None), geographic(114.1, None)], &both, true).unwrap().uniform);
        let plan = plan_sources(&[geographic(114.0, None), projected("PROJCRS")], &[crs_4326(), crs_4547()], true).unwrap();
        assert!(!plan.uniform);
        let mut coarse = geographic(114.1, None);
        coarse.geo_transform[1] = 0.002;
        assert!(!plan_sources(&[geographic(114.0, None), coarse], &both, true).unwrap().uniform);
        assert!(!plan_sources(&[geographic(114.0, Some(-9999.0)), geographic(114.1, None)], &both, true).unwrap().uniform);
    }

    #[test]
    fn different_vertical_references_are_rejected() {
        let mut compound = crs_4326();
        compound.vertical_name = Some("EGM96 height".into());
        let error = plan_sources(&[geographic(114.0, None), geographic(114.1, None)], &[crs_4326(), compound], true).unwrap_err();
        assert!(error.starts_with("terrain input mixed datum"), "{error}");
    }

    #[test]
    fn same_crs_without_authority_compares_normalised_wkt() {
        let mut a = crs_4547();
        a.authority = None;
        let mut b = a.clone();
        assert!(same_crs(&a, &b));
        b.wkt = Some("PROJCRS[\"other\"]".into());
        assert!(!same_crs(&a, &b));
    }

    #[test]
    fn adjacent_sources_do_not_overlap_but_shifted_ones_do() {
        let both = [crs_4326(), crs_4326()];
        let plan = plan_sources(&[geographic(114.0, None), geographic(114.1, None)], &both, true).unwrap();
        assert!(plan.overlaps.is_empty());
        let plan = plan_sources(&[geographic(114.0, None), geographic(114.05, None)], &both, true).unwrap();
        assert_eq!(plan.overlaps, vec![(0, 1)]);
    }

    #[test]
    fn rejects_unsupported_driver_and_multiband() {
        let mut info = geographic(114.0, None);
        info.driver = "HFA".into();
        assert!(plan_sources(&[info], &[crs_4326()], true).unwrap_err().contains("暂不支持"));
        let mut info = geographic(114.0, None);
        info.band_count = 3;
        assert!(plan_sources(&[info], &[crs_4326()], true).unwrap_err().contains("单波段"));
    }

    #[test]
    fn auto_depth_is_measured_in_latitude_degrees() {
        // 1 arc-second pixels land on level 14.
        assert_eq!(auto_max_depth(1.0, 3600).level, 14);
        assert_eq!(auto_max_depth(1.0, 1).level, 2);
        assert_eq!(auto_max_depth(10.0, 1).level, 0);
        assert_eq!(auto_max_depth(1.0, 1_000_000_000).level, geoforge_protocol::TERRAIN_MAX_DEPTH);
        assert_eq!(auto_max_depth(0.0, 10).level, 0);
        // D1: 2000 rows of 10 m span 0.18045° of latitude, about 10 m per pixel, level 15.
        let d1 = auto_max_depth(30.630416772171198 - 30.449970114994422, 2000);
        assert!((d1.pixel_ground_metres - 10.04).abs() < 0.05, "{d1:?}");
        assert_eq!(d1.level, 15);
    }
}
