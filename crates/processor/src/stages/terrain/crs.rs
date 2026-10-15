//! Source CRS and the operation to WGS 84, as reported by `gf-dem-tool crs`
//! (GDAL/OSR parses the definition, PROJ lists the operations). Nothing here
//! guesses a CRS from strings: every CRS GDAL/PROJ understands is accepted,
//! and the only question is whether a reliable operation to EPSG:4326 exists
//! and which tiling route to take.

use geoforge_protocol::ProjectionMode;
use serde::Deserialize;
use serde_json::{json, Value};

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrsReport {
    pub name: Option<String>,
    /// `EPSG:4547` and the like; absent for a valid WKT without an ID.
    pub authority: Option<String>,
    /// projected / geographic / compound / geocentric / vertical / engineering / other.
    #[serde(rename = "type")]
    pub crs_type: String,
    pub horizontal_type: Option<String>,
    pub vertical_name: Option<String>,
    #[serde(default)]
    pub axes: Vec<Axis>,
    pub linear_unit: Option<Unit>,
    pub datum: Option<String>,
    pub wkt: Option<String>,
    #[serde(default)]
    pub projjson: Value,
    pub transform: Option<TransformReport>,
    pub transform_error: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct Axis {
    pub name: Option<String>,
    pub orientation: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Unit {
    pub name: Option<String>,
    pub to_metre: f64,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransformReport {
    pub candidate_count: usize,
    /// -1 when the best-ranked operation cannot be used (missing grid).
    pub selected_index: i32,
    pub selected: Option<Operation>,
    #[serde(default)]
    pub candidates: Vec<Operation>,
    #[serde(default)]
    pub vertical_ignored: bool,
    /// Datum shift GeoForge defines itself instead of PROJ's ballpark
    /// (`cgcs2000-null-geocentric-translation`).
    #[serde(default)]
    pub datum_shift: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Operation {
    pub name: Option<String>,
    /// Declared accuracy; null for pure conversions and for ballpark operations.
    pub accuracy_m: Option<f64>,
    pub ballpark: bool,
    pub instantiable: bool,
    #[serde(default)]
    pub grids: Vec<Grid>,
    /// East/north in, lon/lat degrees out (PROJ "normalized for visualization").
    pub pipeline: Option<String>,
    /// The same operation in the CRSs' authority axis order, for gdalwarp -ct.
    pub ct_pipeline: Option<String>,
    /// [west, south, east, north] of the transformed source extent.
    pub wgs84_bounds: Option<[f64; 4]>,
    /// The box that lies inside the transformed extent on every side.
    pub wgs84_inner_bounds: Option<[f64; 4]>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct Grid {
    pub name: Option<String>,
    pub available: bool,
}

pub fn parse_report(value: &Value) -> Result<CrsReport, String> {
    if value.get("ok").and_then(Value::as_bool) != Some(true) {
        let code = value.get("code").and_then(Value::as_str).unwrap_or("TERRAIN_CRS_INVALID");
        let message = value.get("error").and_then(Value::as_str).unwrap_or("unknown error");
        let prefix = if code == "TERRAIN_CRS_MISSING" { "terrain crs missing" } else { "terrain crs invalid" };
        return Err(format!("{prefix}: {message}"));
    }
    serde_json::from_value(value.clone()).map_err(|error| format!("terrain tool failed: crs output: {error}"))
}

impl CrsReport {
    pub fn is_geographic(&self) -> bool {
        self.horizontal_type.as_deref().unwrap_or(&self.crs_type) == "geographic"
    }

    pub fn is_projected(&self) -> bool {
        self.horizontal_type.as_deref().unwrap_or(&self.crs_type) == "projected"
    }

    pub fn selected(&self) -> Option<&Operation> {
        self.transform.as_ref().and_then(|transform| transform.selected.as_ref())
    }

    /// Projection method of a projected CRS, from PROJJSON (compound CRSs
    /// carry it on their first component).
    pub fn conversion_method(&self) -> Option<&str> {
        let projected = match self.projjson.get("type").and_then(Value::as_str) {
            Some("CompoundCRS") => self.projjson.pointer("/components/0")?,
            _ => &self.projjson,
        };
        projected.pointer("/conversion/method/name").and_then(Value::as_str)
    }

    /// The operation to WGS 84 is the identity (the source is WGS 84 lon/lat).
    pub fn is_wgs84_geographic(&self) -> bool {
        self.is_geographic()
            && self
                .selected()
                .is_some_and(|op| op.accuracy_m == Some(0.0) && !op.ballpark && op.grids.is_empty())
    }

    pub fn label(&self) -> String {
        let name = self.name.as_deref().unwrap_or("未命名坐标系");
        match &self.authority {
            Some(authority) => format!("{name}（{authority}）"),
            None => format!("{name}（无 EPSG 编号）"),
        }
    }
}

/// Refuse operations that would silently produce wrong positions.
pub fn check_transform(crs: &CrsReport, accept_ballpark: bool) -> Result<(), String> {
    let label = crs.label();
    if !(crs.is_geographic() || crs.is_projected()) {
        return Err(format!(
            "terrain crs invalid: {label} 是 {} 坐标系，不能作为 DEM 的水平坐标系",
            crs.crs_type
        ));
    }
    let Some(transform) = &crs.transform else {
        let reason = crs.transform_error.as_deref().unwrap_or("PROJ 没有返回坐标操作");
        return Err(format!("terrain transform unavailable: {label} 到 WGS 84 没有可用的坐标操作：{reason}"));
    };
    let Some(selected) = &transform.selected else {
        let best = transform.candidates.first();
        let missing: Vec<&str> = best
            .map(|op| op.grids.iter().filter(|grid| !grid.available).filter_map(|grid| grid.name.as_deref()).collect())
            .unwrap_or_default();
        let detail = match best {
            Some(op) if !missing.is_empty() => format!(
                "精度最高的操作“{}”需要格网 {}，运行时没有附带；不会自动退到精度更低的操作",
                op.name.as_deref().unwrap_or("?"),
                missing.join(", ")
            ),
            // The tool only leaves an instantiable best operation unselected
            // when the data extent does not transform (wrong CRS for the numbers).
            Some(op) if op.instantiable => {
                "数据范围换算到经纬度失败，坐标数值与该坐标系不匹配，请检查坐标系".to_string()
            }
            Some(op) => format!("操作“{}”无法在当前运行时执行", op.name.as_deref().unwrap_or("?")),
            None => "PROJ 没有找到任何操作".to_string(),
        };
        return Err(format!("terrain transform unavailable: {label} 到 WGS 84：{detail}"));
    };
    if selected.pipeline.is_none() || selected.ct_pipeline.is_none() || selected.wgs84_bounds.is_none() {
        return Err(format!(
            "terrain transform unavailable: {label} 的数据范围无法换算到经纬度，请检查坐标系是否与数据匹配"
        ));
    }
    if selected.ballpark && !accept_ballpark {
        return Err(format!(
            "terrain transform low accuracy: {label} 到 WGS 84 只有 PROJ 的近似操作（不做基准转换，精度未知）。\
             确认可以接受后在任务中设置 preprocess.acceptBallparkTransform=true"
        ));
    }
    Ok(())
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Route {
    /// CTB reads the source raster and reprojects it itself.
    Direct,
    /// GDAL warps to EPSG:4326 first.
    Normalize,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RouteDecision {
    pub route: Route,
    /// Machine-readable reason, written to the report and the log.
    pub reason: &'static str,
}

/// Projection methods whose CTB direct route matched the normalize route in
/// the D1 comparison (docs/terrain/v1/03-v12-crs-validation.md). A quality
/// gate for the shortcut, not a list of accepted CRSs: everything else is
/// normalized.
const DIRECT_VALIDATED_METHODS: &[&str] = &["Transverse Mercator"];

pub fn choose_route(mode: ProjectionMode, crs: &CrsReport) -> RouteDecision {
    // CTB would hand a compound CRS to the GDAL warper as is; gdalwarp with
    // -novshift is the place where heights are guaranteed to stay untouched.
    if crs.crs_type == "compound" {
        return RouteDecision { route: Route::Normalize, reason: "compound-crs" };
    }
    if crs.is_wgs84_geographic() {
        return RouteDecision { route: Route::Direct, reason: "source-is-wgs84-geographic" };
    }
    match mode {
        ProjectionMode::Normalize => return RouteDecision { route: Route::Normalize, reason: "normalize-requested" },
        // Normalize matched direct on D1 at a quarter of the time and needs no
        // decision for the reprojection frame since T12.2.
        ProjectionMode::Auto => return RouteDecision { route: Route::Normalize, reason: "auto-normalizes" },
        ProjectionMode::Direct => {}
    }
    if !crs.is_projected() {
        return RouteDecision { route: Route::Normalize, reason: "geographic-not-wgs84" };
    }
    let Some(selected) = crs.selected() else {
        return RouteDecision { route: Route::Normalize, reason: "no-operation" };
    };
    if !selected.grids.is_empty() {
        return RouteDecision { route: Route::Normalize, reason: "grid-based-datum-shift" };
    }
    match crs.conversion_method() {
        Some(method) if DIRECT_VALIDATED_METHODS.contains(&method) => {
            RouteDecision { route: Route::Direct, reason: "validated-projection-method" }
        }
        _ => RouteDecision { route: Route::Normalize, reason: "projection-method-not-validated-for-direct" },
    }
}

pub fn report_json(crs: &CrsReport, user_specified: bool, accepted_ballpark: bool) -> Value {
    let selected = crs.selected();
    json!({
        "name": crs.name,
        "authority": crs.authority,
        "type": crs.crs_type,
        "horizontalType": crs.horizontal_type,
        "verticalName": crs.vertical_name,
        "conversionMethod": crs.conversion_method(),
        "linearUnit": crs.linear_unit.as_ref().map(|unit| json!({ "name": unit.name, "toMetre": unit.to_metre })),
        "axes": crs.axes.iter().map(|axis| json!({ "name": axis.name, "orientation": axis.orientation })).collect::<Vec<_>>(),
        "axisOrderUsed": "east-north（GDAL traditional GIS order）",
        "userSpecified": user_specified,
        "wkt": crs.wkt,
        "transform": selected.map(|op| json!({
            "target": "EPSG:4326",
            "name": op.name,
            "accuracyM": op.accuracy_m,
            "ballpark": op.ballpark,
            "ballparkAccepted": op.ballpark && accepted_ballpark,
            "grids": op.grids.iter().map(|grid| grid.name.clone()).collect::<Vec<_>>(),
            "pipeline": op.pipeline,
            "verticalTransformed": false,
            "datumShift": crs.transform.as_ref().and_then(|transform| transform.datum_shift.as_deref()).map(datum_shift_json),
        })),
        "wgs84Bounds": selected.and_then(|op| op.wgs84_bounds),
    })
}

/// What the report says about a datum shift GeoForge defines itself.
fn datum_shift_json(name: &str) -> Value {
    match name {
        "cgcs2000-null-geocentric-translation" => json!({
            "name": name,
            "method": "EPSG:9603 Geocentric translations，三个平移量均为 0；CGCS2000 与 WGS 84 椭球差异经地心坐标严格换算",
            "definedBy": "GeoForge",
            "accuracyM": 1.0,
            "basis": "CGCS2000 定义为 ITRF97 2000.0 历元；与当前 WGS 84 的差异以 2000.0 以来的板块运动为主（中国大陆约 3.5 cm/a，至 2026 年约 0.9 m），见 docs/terrain/v1/04-v12-cgcs2000.md",
        }),
        _ => json!({ "name": name }),
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;

    /// `gf-dem-tool crs EPSG:4547 --bounds …` output (runtime v3).
    pub fn d1_report() -> Value {
        serde_json::from_str(include_str!("testdata/crs-4547.json")).unwrap()
    }

    fn report(value: Value) -> CrsReport {
        parse_report(&value).unwrap()
    }

    fn with_type(kind: &str, op: Value, projjson: Value) -> CrsReport {
        report(json!({
            "ok": true, "name": "X", "authority": null, "type": kind, "horizontalType": kind,
            "projjson": projjson,
            "transform": { "candidateCount": 1, "selectedIndex": 0, "selected": op, "candidates": [op] }
        }))
    }

    fn op(accuracy: Option<f64>, ballpark: bool) -> Value {
        json!({ "name": "op", "accuracyM": accuracy, "ballpark": ballpark, "instantiable": true, "grids": [],
                "pipeline": "+proj=noop", "ctPipeline": "+proj=noop", "wgs84Bounds": [1, 2, 3, 4], "wgs84InnerBounds": [1, 2, 3, 4] })
    }

    fn tm() -> Value {
        json!({ "type": "ProjectedCRS", "conversion": { "method": { "name": "Transverse Mercator" } } })
    }

    #[test]
    fn reads_the_d1_report() {
        let crs = report(d1_report());
        assert_eq!(crs.authority.as_deref(), Some("EPSG:4547"));
        assert!(crs.is_projected());
        assert_eq!(crs.conversion_method(), Some("Transverse Mercator"));
        assert_eq!(crs.linear_unit.as_ref().unwrap().to_metre, 1.0);
        let selected = crs.selected().unwrap();
        assert!(!selected.ballpark);
        assert_eq!(selected.accuracy_m, Some(1.0));
        assert_eq!(crs.transform.as_ref().unwrap().datum_shift.as_deref(), Some("cgcs2000-null-geocentric-translation"));
        assert!(!crs.is_wgs84_geographic());
        let bounds = selected.wgs84_bounds.unwrap();
        assert!((bounds[0] - 113.8957).abs() < 1e-3 && (bounds[3] - 30.6304).abs() < 1e-3, "{bounds:?}");
    }

    #[test]
    fn tool_errors_keep_their_code() {
        let missing = parse_report(&json!({ "ok": false, "code": "TERRAIN_CRS_MISSING", "error": "raster has no CRS" }));
        assert!(missing.unwrap_err().starts_with("terrain crs missing"));
        let invalid = parse_report(&json!({ "ok": false, "code": "TERRAIN_CRS_INVALID", "error": "crs not found: EPSG:999999" }));
        assert!(invalid.unwrap_err().starts_with("terrain crs invalid"));
    }

    #[test]
    fn cgcs2000_needs_no_ballpark_acceptance() {
        let crs = report(d1_report());
        check_transform(&crs, false).unwrap();
        let shift = &report_json(&crs, false, false)["transform"]["datumShift"];
        assert_eq!(shift["definedBy"], "GeoForge");
        assert_eq!(shift["accuracyM"], 1.0);
    }

    #[test]
    fn ballpark_needs_explicit_acceptance() {
        let crs = with_type("projected", op(None, true), tm());
        let error = check_transform(&crs, false).unwrap_err();
        assert!(error.starts_with("terrain transform low accuracy"), "{error}");
        check_transform(&crs, true).unwrap();
    }

    #[test]
    fn missing_grid_on_the_best_operation_refuses_without_fallback() {
        let best = json!({ "name": "NAD27 to WGS 84 (79)", "accuracyM": 5.0, "ballpark": false, "instantiable": false,
                           "grids": [{ "name": "us_noaa_conus.tif", "available": false }] });
        let crs = report(json!({
            "ok": true, "name": "NAD27", "authority": "EPSG:4267", "type": "geographic", "horizontalType": "geographic",
            "transform": { "candidateCount": 2, "selectedIndex": -1, "selected": null, "candidates": [best, op(Some(10.0), false)] }
        }));
        let error = check_transform(&crs, true).unwrap_err();
        assert!(error.starts_with("terrain transform unavailable") && error.contains("us_noaa_conus.tif"), "{error}");
    }

    #[test]
    fn vertical_or_engineering_crs_is_not_a_dem_crs() {
        let crs = with_type("vertical", op(Some(0.0), false), Value::Null);
        assert!(check_transform(&crs, true).unwrap_err().starts_with("terrain crs invalid"));
    }

    #[test]
    fn wkt_without_authority_is_fine() {
        let crs = with_type("projected", op(None, false), tm());
        assert!(crs.authority.is_none());
        check_transform(&crs, false).unwrap();
        assert!(crs.label().contains("无 EPSG"));
    }

    #[test]
    fn routes() {
        let wgs84 = with_type("geographic", op(Some(0.0), false), Value::Null);
        assert_eq!(choose_route(ProjectionMode::Normalize, &wgs84).route, Route::Direct);
        assert_eq!(choose_route(ProjectionMode::Auto, &wgs84).route, Route::Direct);

        let cgcs_geographic = with_type("geographic", op(None, true), Value::Null);
        assert_eq!(choose_route(ProjectionMode::Direct, &cgcs_geographic).reason, "geographic-not-wgs84");

        let gauss_kruger = report(d1_report());
        assert_eq!(choose_route(ProjectionMode::Direct, &gauss_kruger).route, Route::Direct);
        assert_eq!(choose_route(ProjectionMode::Auto, &gauss_kruger).reason, "auto-normalizes");
        assert_eq!(choose_route(ProjectionMode::Normalize, &gauss_kruger).route, Route::Normalize);

        let mercator = with_type(
            "projected",
            op(None, false),
            json!({ "type": "ProjectedCRS", "conversion": { "method": { "name": "Popular Visualisation Pseudo Mercator" } } }),
        );
        assert_eq!(
            choose_route(ProjectionMode::Direct, &mercator).reason,
            "projection-method-not-validated-for-direct"
        );

        let mut gridded = with_type("projected", op(Some(1.0), false), tm());
        gridded.transform.as_mut().unwrap().selected.as_mut().unwrap().grids =
            vec![Grid { name: Some("g.tif".into()), available: true }];
        assert_eq!(choose_route(ProjectionMode::Direct, &gridded).reason, "grid-based-datum-shift");

        let compound = with_type("compound", op(None, false), json!({ "type": "CompoundCRS", "components": [tm()] }));
        assert_eq!(choose_route(ProjectionMode::Direct, &compound).reason, "compound-crs");
    }
}

