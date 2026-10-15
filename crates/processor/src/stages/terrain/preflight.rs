//! Checks for the desktop form: `inspect_inputs` describes the DEMs before a
//! task exists, `check_task` re-validates a submitted task without trusting
//! the form. Neither writes next to the inputs (a source with a GDAL PAM
//! sidecar is read through a VRT in a temporary folder).

use super::crs::{self, CrsReport, Route, RouteDecision};
use super::inspect::{self, RasterInfo};
use super::runtime::{self, TerrainRuntime};
use super::{check_source_file, data_extent, union_bounds, validate_output, validate_source_paths, PamViews, Tools};
use crate::pipeline::error_code_for_message;
use crate::protocol::{Emitter, TaskConfig};
use crate::CancelFlag;
use geoforge_protocol::ProjectionMode;
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use std::sync::Arc;

pub const INSPECT_VERSION: u32 = 1;

/// Above this many pixels the NoData count stays `not-computed` so the form
/// answers quickly; the task counts it anyway.
const STATS_MAX_PIXELS: u64 = 64 * 1024 * 1024;

pub struct InspectRequest {
    pub paths: Vec<PathBuf>,
    pub crs_override: Option<String>,
    pub accept_ballpark: bool,
    pub projection_mode: ProjectionMode,
}

pub fn inspect_inputs(request: &InspectRequest) -> Value {
    match runtime::locate(&runtime::default_root()).into_ready() {
        Ok(runtime) => inspect_with_runtime(request, &runtime),
        Err(message) => result(Vec::new(), None, vec![error_json(&message, None)]),
    }
}

pub fn inspect_with_runtime(request: &InspectRequest, runtime: &TerrainRuntime) -> Value {
    let emitter = Arc::new(Emitter::quiet("inspect-terrain"));
    let cancel = CancelFlag::new();
    let tools = Tools { runtime, emitter: &emitter, cancel: &cancel };
    let mut sources = Vec::new();
    let mut errors = Vec::new();
    let mut readable = Vec::new();
    let views = PamViews::new("inspect");
    for (index, path) in request.paths.iter().enumerate() {
        let (source, read) = inspect_source(&tools, request, path, &views, index);
        if let Some(error) = source.get("error").filter(|error| !error.is_null()) {
            errors.push(error.clone());
        }
        sources.push(source);
        readable.extend(read);
    }
    if !errors.is_empty() || readable.is_empty() {
        return result(sources, None, errors);
    }
    let (infos, source_crs): (Vec<RasterInfo>, Vec<CrsReport>) = readable.into_iter().unzip();
    match plan(&tools, request, &infos, &source_crs, &sources) {
        Ok(plan) => result(sources, Some(plan), Vec::new()),
        Err(message) => result(sources, None, vec![error_json(&message, None)]),
    }
}

/// Re-check of a submitted convert-terrain task: options, source files and
/// the output folder, by the same rules the task applies.
pub fn check_task(config: &TaskConfig) -> Result<(), String> {
    let options = config.terrain_options()?.terrain;
    options.validate()?;
    let sources = validate_source_paths(config, &options)?;
    validate_output(&sources, config)?;
    Ok(())
}

fn result(sources: Vec<Value>, plan: Option<Value>, errors: Vec<Value>) -> Value {
    json!({
        "version": INSPECT_VERSION,
        "valid": errors.is_empty() && plan.is_some(),
        "sources": sources,
        "plan": plan,
        "errors": errors,
    })
}

fn error_json(message: &str, path: Option<&Path>) -> Value {
    json!({ "code": error_code_for_message(message), "message": message, "path": path })
}

/// One source as the form shows it, plus what the plan needs when it could
/// be read. A source that fails a check still carries what was learned.
fn inspect_source(
    tools: &Tools,
    request: &InspectRequest,
    path: &Path,
    views: &PamViews,
    index: usize,
) -> (Value, Option<(RasterInfo, CrsReport)>) {
    let failed = |message: String| (json!({ "path": path, "error": error_json(&message, Some(path)) }), None);
    if let Err(message) = check_source_file(path) {
        return failed(message);
    }
    let info = match tools.inspect_source(path, views, index) {
        Ok(info) => info,
        Err(message) => return failed(message),
    };
    if let Err(message) = inspect::check_single(&info, request.crs_override.is_none()) {
        return failed(message);
    }
    let crs = match tools.crs(request.crs_override.as_deref(), &info, info.bounds()) {
        Ok(crs) => crs,
        Err(message) => return failed(message),
    };
    let (min_x, min_y, max_x, max_y) = info.bounds();
    let mut source = json!({
        "path": path,
        "driver": info.driver,
        "dimensions": [info.width, info.height],
        "bandCount": info.band_count,
        "dataType": info.data_type,
        "pixelSize": [info.pixel_size().0.abs(), info.pixel_size().1.abs()],
        "crs": crs::report_json(&crs, request.crs_override.is_some(), request.accept_ballpark),
        "bounds": { "source": [min_x, min_y, max_x, max_y], "wgs84": crs.selected().and_then(|op| op.wgs84_bounds) },
        "noData": { "declared": info.nodata.map(declared_nodata), "sourceHoles": source_holes(tools, &info) },
        "overviews": info.has_overviews,
        "error": null,
    });
    if let Err(message) = crs::check_transform(&crs, request.accept_ballpark) {
        source["error"] = error_json(&message, Some(path));
        return (source, None);
    }
    (source, Some((info, crs)))
}

/// JSON has no NaN; a NaN NoData value is sent as the string "nan".
fn declared_nodata(value: f64) -> Value {
    if value.is_nan() {
        return json!("nan");
    }
    json!(value)
}

/// Without a declared NoData value there is nothing to count.
fn source_holes(tools: &Tools, info: &RasterInfo) -> Value {
    if info.nodata.is_none() {
        return json!({ "state": "computed", "value": 0 });
    }
    if info.width * info.height > STATS_MAX_PIXELS {
        return json!({ "state": "not-computed", "value": null });
    }
    match tools.stats(&info.path) {
        Ok(stats) => json!({ "state": "computed", "value": stats.no_data_count }),
        Err(_) => json!({ "state": "not-computed", "value": null }),
    }
}

fn plan(tools: &Tools, request: &InspectRequest, infos: &[RasterInfo], source_crs: &[CrsReport], sources: &[Value]) -> Result<Value, String> {
    let plan = inspect::plan_sources(infos, source_crs, request.crs_override.is_none())?;
    let (crs, route) = if plan.uniform {
        let crs = tools.crs(request.crs_override.as_deref(), &infos[0], union_bounds(infos))?;
        crs::check_transform(&crs, request.accept_ballpark)?;
        let route = crs::choose_route(request.projection_mode, &crs);
        (crs, route)
    } else {
        (source_crs[0].clone(), RouteDecision { route: Route::Normalize, reason: "heterogeneous-sources" })
    };
    let (outer, _) = data_extent(&plan, &crs, source_crs)?;
    // The finest source pixel in latitude degrees decides the level.
    let pixel = infos
        .iter()
        .zip(source_crs)
        .filter_map(|(info, crs)| crs.selected()?.wgs84_bounds.map(|b| (b[3] - b[1]) / info.height.max(1) as f64))
        .fold(f64::INFINITY, f64::min);
    let depth = inspect::auto_max_depth(if pixel.is_finite() { pixel } else { 0.0 }, 1);
    let holes: Vec<Option<u64>> = sources.iter().map(|source| source.pointer("/noData/sourceHoles/value").and_then(Value::as_u64)).collect();
    let source_holes = if holes.iter().all(Option::is_some) {
        json!({ "state": "computed", "value": holes.iter().flatten().sum::<u64>() })
    } else {
        json!({ "state": "not-computed", "value": null })
    };
    Ok(json!({
        "targetGrid": "geodetic-tms",
        "projectionMode": request.projection_mode,
        "route": match route.route { Route::Direct => "direct", Route::Normalize => "normalize" },
        "routeReason": route.reason,
        "uniform": plan.uniform,
        "overlaps": plan.overlaps,
        "crs": crs::report_json(&crs, request.crs_override.is_some(), request.accept_ballpark),
        "crsLabel": crs.label(),
        "wgs84Bounds": outer,
        "recommendedMaxDepth": depth.level,
        "pixelGroundMetres": depth.pixel_ground_metres,
        "sourceHoles": source_holes,
        "verticalName": crs.vertical_name,
        "verticalDatumStatus": "confirmation-required",
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn task(root: &Path, output: &Path, vertical: Value) -> TaskConfig {
        let source = root.join("dem.tif");
        serde_json::from_value(json!({
            "schemaVersion": 1,
            "taskId": "task-preflight0",
            "operation": "convert-terrain",
            "input": { "path": source },
            "output": { "path": output },
            "options": { "terrain": { "version": 2, "sources": [source], "verticalDatum": vertical } },
        }))
        .unwrap()
    }

    #[test]
    fn submit_check_applies_the_task_rules() {
        let root = std::env::temp_dir().join(format!("geoforge-preflight-{}", std::process::id()));
        let sources = root.join("src");
        std::fs::create_dir_all(&sources).unwrap();
        std::fs::write(sources.join("dem.tif"), b"not read").unwrap();
        let acknowledged = json!({ "mode": "unknown", "acknowledged": true });

        assert!(check_task(&task(&sources, &root.join("out"), acknowledged.clone())).is_ok());
        let inside = check_task(&task(&sources, &sources.join("out"), acknowledged.clone())).unwrap_err();
        assert!(inside.contains("must not be inside input data root"), "{inside}");
        let unacknowledged = check_task(&task(&sources, &root.join("out"), json!({ "mode": "unknown" }))).unwrap_err();
        assert!(unacknowledged.starts_with("terrain vertical datum"), "{unacknowledged}");
        let missing = check_task(&task(&root.join("nowhere"), &root.join("out"), acknowledged)).unwrap_err();
        assert!(missing.starts_with("terrain input does not exist"), "{missing}");
        let _ = std::fs::remove_dir_all(&root);
    }
}
