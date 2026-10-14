//! `convert-terrain`: DEM -> Cesium quantized-mesh with the CTB sidecar.
//!
//! inspect -> prepare (VRT, warp to EPSG:4326, NoData, overview) -> tile ->
//! layer.json -> validate -> commit. The raster given to CTB never contains
//! NoData, because CTB would write it as 0 m.

pub mod inspect;
pub mod layer;
pub mod nodata;
pub mod quantized_mesh;
pub mod runtime;
pub mod verify;

use crate::cancel::CancelFlag;
use crate::overall_progress::{plan_convert_terrain, OverallProgress, TERRAIN_PHASE_WEIGHTS};
use crate::path_policy;
use crate::protocol::{Emitter, Stage, TaskConfig};
use crate::stages::commit;
use crate::util::run_logged_env_result_with_stdout;
use geoforge_protocol::{
    MaxDepth, NoDataPolicy, OverviewMode, ProjectionMode, ResumePolicy, TerrainOptions, VerticalDatumMode,
};
use inspect::{RasterInfo, SourcePlan};
use nodata::{NoDataAction, RasterStats};
use runtime::TerrainRuntime;
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

/// Marks the frame gdalwarp adds around a reprojected DEM.
const WARP_NODATA: &str = "-32768";
/// Below this size CTB reads the full-resolution raster fast enough.
const OVERVIEW_MIN_PIXELS: u64 = 4096 * 4096;
/// P0 measured 0.5–0.7 GiB per CTB thread with overviews; not a guarantee.
const CTB_MIB_PER_THREAD: u64 = 700;
const FINGERPRINT_FILE: &str = "terrain-fingerprint.json";
pub const REPORT_FILE: &str = "geoforge-terrain.json";

pub fn run(config: &TaskConfig, emitter: &Arc<Emitter>, cancel: &CancelFlag) -> Result<PathBuf, String> {
    let task_options = config.terrain_options()?;
    let options = task_options.terrain;
    options.validate()?;
    let runtime = runtime::locate(&runtime::default_root()).into_ready()?;
    run_with_runtime(config, &options, &runtime, emitter, cancel)
}

pub fn run_with_runtime(
    config: &TaskConfig,
    options: &TerrainOptions,
    runtime: &TerrainRuntime,
    emitter: &Arc<Emitter>,
    cancel: &CancelFlag,
) -> Result<PathBuf, String> {
    let exec_opts = config.execution_options()?;
    let budget = crate::ResourceBudget::new(&exec_opts);
    let threads = budget.cpu_workers().min((budget.memory_budget_mib() / CTB_MIB_PER_THREAD).max(1) as u32).max(1);
    emitter.log(&format!(
        "[terrain] execution options: {}; CTB threads {threads} (≈{CTB_MIB_PER_THREAD} MiB each)",
        exec_opts.describe_resolution(&budget.resolved)
    ));

    let overall = OverallProgress::new(Arc::clone(emitter), plan_convert_terrain());
    overall.emit_plan();
    overall.enter(Stage::Scan);
    emitter.stage(Stage::Scan, "Inspecting DEM sources");

    let sources = validate_source_paths(config, options)?;
    let final_out = validate_output(&sources, config)?;
    runtime.verify_files()?;
    let tools = Tools { runtime, emitter, cancel };
    let infos = sources
        .iter()
        .map(|path| tools.inspect(path))
        .collect::<Result<Vec<_>, _>>()?;
    let crs_override = options.crs_override.as_deref().and_then(geoforge_protocol::parse_epsg);
    let plan = inspect::plan_sources(&infos, crs_override)?;
    if options.preprocess.projection_mode == ProjectionMode::Auto {
        emitter.log("[terrain] projectionMode=auto: the direct CTB reprojection path is not validated yet; using normalize");
    }
    report_sources(emitter, &infos, &plan);
    check_cancel(cancel)?;
    overall.complete_current();

    let (temp, resumed) = prepare_temp(&final_out, config, options, runtime, &sources, exec_opts.resume_policy, emitter)?;
    let retain = matches!(exec_opts.resume_policy, ResumePolicy::RetainOnFailure | ResumePolicy::Resume);
    let mut temp_guard = commit::TempGuard::new(temp.clone()).with_retain_on_failure(retain);
    let work = temp.join("work");
    let staged = temp.join("staged");
    reset_dir(&work)?;
    std::fs::create_dir_all(&staged).map_err(|error| error.to_string())?;

    overall.enter(Stage::Convert);
    overall.set_phase_weights(TERRAIN_PHASE_WEIGHTS);
    overall.report(0, 0, None, Some("prepare"), None, false, true);
    emitter.stage(Stage::Convert, "Preparing DEM");
    let prepared = prepare(&tools, options, &infos, &plan, &work)?;
    commit::write_checkpoint(&temp, commit::Checkpoint::Converted)?;
    check_cancel(cancel)?;

    let max_depth = match options.tiling.max_depth {
        MaxDepth::Level(level) => level,
        MaxDepth::Auto => inspect::auto_max_depth(prepared.info.pixel_size().0.abs()),
    };
    if resumed {
        let removed = remove_broken_tiles(&staged)?;
        emitter.log(&format!("[terrain] resuming with ctb-tile -R; removed {removed} unfinished tiles"));
    }
    overall.report(0, 0, None, Some("tile"), Some(threads), false, true);
    emitter.stage(Stage::Convert, &format!("Tiling to level {max_depth} with CTB"));
    let settings = CtbSettings {
        max_depth,
        mesh_factor: options.tiling.mesh_quality.ctb_factor(),
        normals: options.tiling.normals,
        threads,
    };
    tools.run_ctb(&ctb_args(&runtime.tool("ctb-tile"), &prepared.ctb_input, &staged, &settings, resumed, false))?;
    check_cancel(cancel)?;

    overall.report(0, 0, None, Some("layer"), None, false, true);
    tools.run_ctb(&ctb_args(&runtime.tool("ctb-tile"), &prepared.ctb_input, &staged, &settings, false, true))?;
    let layer_path = staged.join("layer.json");
    let mut layer_json: Value = std::fs::read_to_string(&layer_path)
        .map_err(|error| format!("terrain validation: layer.json missing: {error}"))
        .and_then(|text| serde_json::from_str(&text).map_err(|error| format!("terrain validation: layer.json: {error}")))?;
    let files = layer::list_tiles(&staged)?;
    let mut summary = layer::normalize(&mut layer_json, &files)?;
    let (min_x, min_y, max_x, max_y) = prepared.info.bounds();
    // CTB writes the root-tile extent here; Cesium uses it for the data extent.
    layer_json["bounds"] = json!([min_x, min_y, max_x, max_y]);
    summary.bounds = [min_x, min_y, max_x, max_y];
    std::fs::write(&layer_path, serde_json::to_string_pretty(&layer_json).unwrap())
        .map_err(|error| error.to_string())?;
    overall.complete_current();

    overall.enter(Stage::Validate);
    emitter.stage(Stage::Validate, "Checking terrain tiles");
    commit::write_checkpoint(&temp, commit::Checkpoint::Validating)?;
    let validation = validate(&tools, &staged, &summary, &prepared, cancel)?;
    commit::write_checkpoint(&temp, commit::Checkpoint::Validated)?;
    overall.complete_current();

    let report = build_report(options, &infos, &plan, &prepared, &summary, &settings, runtime, &validation);
    std::fs::write(staged.join(REPORT_FILE), serde_json::to_string_pretty(&report).unwrap())
        .map_err(|error| error.to_string())?;
    check_cancel(cancel)?;

    overall.enter(Stage::Commit);
    commit::write_checkpoint(&temp, commit::Checkpoint::Committing)?;
    commit::commit_rename(emitter, &staged, &temp, &final_out, Some(&mut temp_guard))?;
    overall.finish();
    emitter.metric("output.bytes", json!(crate::pipeline::directory_size_bytes(&final_out)));
    commit::cleanup_temp(&temp);
    Ok(final_out)
}

fn check_cancel(cancel: &CancelFlag) -> Result<(), String> {
    if cancel.is_cancelled() {
        Err("cancelled".into())
    } else {
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Paths

fn validate_source_paths(config: &TaskConfig, options: &TerrainOptions) -> Result<Vec<PathBuf>, String> {
    let first = path_policy::normalize_path(Path::new(&options.sources[0]))?;
    if path_policy::normalize_path(Path::new(config.input_path()))? != first {
        return Err("terrain input: input.path must be the first entry of terrain.sources".into());
    }
    let mut paths = Vec::with_capacity(options.sources.len());
    for source in &options.sources {
        let path = Path::new(source);
        let metadata = std::fs::symlink_metadata(path)
            .map_err(|_| format!("terrain input does not exist: {}", path.display()))?;
        if metadata.file_type().is_symlink() {
            return Err(format!("terrain input: 不接受符号链接作为源文件：{}", path.display()));
        }
        if !metadata.is_file() {
            return Err(format!("terrain input: 源路径必须是文件：{}", path.display()));
        }
        let extension = path.extension().and_then(|e| e.to_str()).unwrap_or_default().to_ascii_lowercase();
        if !matches!(extension.as_str(), "tif" | "tiff" | "asc") {
            return Err(format!("terrain input: 只支持 .tif/.tiff/.asc：{}", path.display()));
        }
        let canonical = path_policy::normalize_path(path).map_err(|error| format!("terrain input: {error}"))?;
        if paths.contains(&canonical) {
            return Err(format!("terrain input: 源文件重复：{}", path.display()));
        }
        paths.push(canonical);
    }
    Ok(paths)
}

/// The output must not overlap any source folder and must not exist yet.
fn validate_output(sources: &[PathBuf], config: &TaskConfig) -> Result<PathBuf, String> {
    let mut parents: Vec<&Path> = sources.iter().filter_map(|path| path.parent()).collect();
    parents.sort();
    parents.dedup();
    let mut validated = None;
    for parent in parents {
        validated = Some(path_policy::validate_io_paths(parent, Path::new(config.output_path()), &config.task_id)?);
    }
    validated.map(|paths| paths.output).ok_or_else(|| "terrain input: no source folder".to_string())
}

fn reset_dir(dir: &Path) -> Result<(), String> {
    if dir.exists() {
        std::fs::remove_dir_all(dir).map_err(|error| format!("cannot clear {}: {error}", dir.display()))?;
    }
    std::fs::create_dir_all(dir).map_err(|error| format!("cannot create {}: {error}", dir.display()))
}

// ---------------------------------------------------------------------------
// Resume

/// Everything that changes the tiles. `-R` is only used when this matches
/// the previous attempt exactly.
pub fn fingerprint(options: &TerrainOptions, runtime: &TerrainRuntime, sources: &[PathBuf]) -> Result<Value, String> {
    let files = sources
        .iter()
        .map(|path| {
            let metadata = std::fs::metadata(path).map_err(|error| format!("{}: {error}", path.display()))?;
            let modified = metadata
                .modified()
                .ok()
                .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|duration| duration.as_nanos().to_string());
            Ok(json!({ "path": path, "bytes": metadata.len(), "modified": modified }))
        })
        .collect::<Result<Vec<_>, String>>()?;
    Ok(json!({
        "version": 1,
        "processor": env!("CARGO_PKG_VERSION"),
        "ctbCommit": runtime.manifest.ctb_commit,
        "gdalVersion": runtime.manifest.gdal_version,
        "demToolVersion": runtime.manifest.dem_tool_version,
        "options": options,
        "sources": files,
    }))
}

fn prepare_temp(
    final_out: &Path,
    config: &TaskConfig,
    options: &TerrainOptions,
    runtime: &TerrainRuntime,
    sources: &[PathBuf],
    policy: ResumePolicy,
    emitter: &Emitter,
) -> Result<(PathBuf, bool), String> {
    let current = fingerprint(options, runtime, sources)?;
    let temp = commit::temp_work_dir(final_out, &config.task_id);
    let mut resumed = false;
    if temp.exists() {
        if policy != ResumePolicy::Resume {
            return Err(format!(
                "temporary work directory already exists (refusing to overwrite): {} \
                 Use execution.resumePolicy='resume' to continue, or remove the directory.",
                temp.display()
            ));
        }
        let previous: Option<Value> = std::fs::read_to_string(temp.join(FINGERPRINT_FILE))
            .ok()
            .and_then(|text| serde_json::from_str(&text).ok());
        if previous.as_ref() == Some(&current) {
            resumed = true;
        } else {
            emitter.warning(
                "TERRAIN_RESUME_RESET",
                "源数据、参数或引擎版本与上次不同，不能续跑；已丢弃旧的工作目录并重新开始",
            );
            commit::cleanup_temp(&temp);
            if temp.exists() {
                return Err(format!(
                    "terrain resume: 旧工作目录不属于本任务，未删除：{}",
                    temp.display()
                ));
            }
        }
    }
    let temp = if resumed { temp } else { commit::prepare_temp(final_out, &config.task_id)? };
    std::fs::write(temp.join(FINGERPRINT_FILE), current.to_string()).map_err(|error| error.to_string())?;
    Ok((temp, resumed))
}

/// Tiles left by an interrupted run: CTB temp files and anything that does
/// not decode. `-R` keeps existing files, so these must go first.
fn remove_broken_tiles(staged: &Path) -> Result<usize, String> {
    let mut removed = 0;
    let mut stack = vec![staged.to_path_buf()];
    while let Some(dir) = stack.pop() {
        for entry in std::fs::read_dir(&dir).map_err(|error| error.to_string())? {
            let path = entry.map_err(|error| error.to_string())?.path();
            if path.is_dir() {
                stack.push(path);
                continue;
            }
            let name = path.file_name().and_then(|n| n.to_str()).unwrap_or_default();
            let broken = if name.ends_with(".terrain") {
                std::fs::read(&path).map(|bytes| quantized_mesh::decode(&bytes).is_err()).unwrap_or(true)
            } else {
                name.ends_with(".tmp")
            };
            if broken {
                std::fs::remove_file(&path).map_err(|error| error.to_string())?;
                removed += 1;
            }
        }
    }
    Ok(removed)
}

// ---------------------------------------------------------------------------
// Prepare

struct Prepared {
    ctb_input: PathBuf,
    info: RasterInfo,
    warped: bool,
    source_no_data: u64,
    before: RasterStats,
    after: RasterStats,
    action: NoDataAction,
    filled: u64,
    overview_built: bool,
}

fn prepare(tools: &Tools, options: &TerrainOptions, infos: &[RasterInfo], plan: &SourcePlan, work: &Path) -> Result<Prepared, String> {
    let override_srs = options.crs_override.clone();
    let mut current = infos[0].path.clone();
    if infos.len() > 1 || override_srs.is_some() {
        let vrt = work.join("sources.vrt");
        let mut args = vec![tools.runtime.tool("gdalbuildvrt")];
        if let Some(srs) = &override_srs {
            args.extend(["-a_srs".into(), srs.clone()]);
        }
        args.push(path_arg(&vrt));
        args.extend(infos.iter().map(|info| path_arg(&info.path)));
        tools.run(&args)?;
        current = vrt;
    }

    let source_no_data = if plan.nodata.is_some() { tools.stats(&current)?.no_data_count } else { 0 };
    if plan.needs_warp {
        let warped = work.join("normalized-4326.tif");
        let mut args = vec![tools.runtime.tool("gdalwarp")];
        if let Some(srs) = &override_srs {
            args.extend(["-s_srs".into(), srs.clone()]);
        }
        if let Some(nodata) = plan.nodata {
            args.extend(["-srcnodata".into(), format_nodata(nodata)]);
        }
        args.extend(
            [
                "-t_srs", "EPSG:4326", "-r", "bilinear", "-ot", "Float32", "-dstnodata", WARP_NODATA,
                "-of", "GTiff", "-co", "TILED=YES", "-co", "COMPRESS=DEFLATE", "-co", "PREDICTOR=3",
                "-co", "BIGTIFF=IF_SAFER", "-multi", "-wo", "NUM_THREADS=ALL_CPUS",
            ]
            .map(String::from),
        );
        args.push(path_arg(&current));
        args.push(path_arg(&warped));
        tools.run(&args)?;
        current = warped;
    }

    let before = tools.stats(&current)?;
    let action = nodata::decide(&options.no_data, &before, source_no_data, plan.needs_warp)?;
    let mut filled = 0;
    let after = match action {
        NoDataAction::Nothing => before,
        NoDataAction::FillConstant(value) => {
            let out = work.join("filled.tif");
            let result = tools.run_json(&[tools.runtime.tool("gf-dem-tool"), "fill-constant".into(), path_arg(&current), path_arg(&out), value.to_string()])?;
            filled = result.get("filledCount").and_then(Value::as_u64).unwrap_or(0);
            current = out;
            tools.stats(&current)?
        }
        NoDataAction::Interpolate(max_search) => {
            let out = work.join("filled.tif");
            let result = tools.run_json(&[tools.runtime.tool("gf-dem-tool"), "fill-interpolate".into(), path_arg(&current), path_arg(&out), max_search.to_string()])?;
            let remaining = result.get("remainingNoDataCount").and_then(Value::as_u64).unwrap_or(u64::MAX);
            if remaining > 0 {
                return Err(format!(
                    "terrain nodata fill failed: 邻域插值后仍有 {remaining} 个像元离有效数据超过 {max_search} 像元；\
                     孔洞过大，请改用常数填补或先修补数据"
                ));
            }
            filled = result.get("filledCount").and_then(Value::as_u64).unwrap_or(0);
            current = out;
            tools.stats(&current)?
        }
    };
    // The guarantee the whole stage exists for.
    if after.no_data_count != 0 {
        return Err(format!("terrain nodata fill failed: 切片输入仍有 {} 个 NoData 像元", after.no_data_count));
    }

    let mut info = tools.inspect(&current)?;
    let pixels = info.width * info.height;
    let mut overview_built = false;
    if options.preprocess.overview == OverviewMode::Auto && !info.has_overviews && pixels > OVERVIEW_MIN_PIXELS {
        // Never write overviews next to the user's file: wrap it in a VRT and
        // keep the .ovr in the work folder.
        if !current.starts_with(work) {
            let vrt = work.join("ctb-input.vrt");
            tools.run(&[tools.runtime.tool("gdalbuildvrt"), path_arg(&vrt), path_arg(&current)])?;
            current = vrt;
        }
        let mut args = vec![tools.runtime.tool("gdaladdo"), "-ro".into(), "-r".into(), "average".into()];
        args.extend(["--config".into(), "COMPRESS_OVERVIEW".into(), "DEFLATE".into()]);
        args.push(path_arg(&current));
        let mut factor = 2u64;
        while info.width.max(info.height) / factor >= 256 {
            args.push(factor.to_string());
            factor *= 2;
        }
        tools.run(&args)?;
        overview_built = true;
        info = tools.inspect(&current)?;
        if !info.has_overviews {
            return Err("terrain overview: gdaladdo 完成但 GDAL 没有读到 overview".into());
        }
    }
    Ok(Prepared {
        ctb_input: current,
        info,
        warped: plan.needs_warp,
        source_no_data,
        before,
        after,
        action,
        filled,
        overview_built,
    })
}

fn format_nodata(value: f64) -> String {
    if value.is_nan() {
        "nan".into()
    } else {
        value.to_string()
    }
}

fn path_arg(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

// ---------------------------------------------------------------------------
// CTB

#[derive(Debug, Clone, PartialEq)]
pub struct CtbSettings {
    pub max_depth: u8,
    pub mesh_factor: f64,
    pub normals: bool,
    pub threads: u32,
}

pub fn ctb_args(program: &str, input: &Path, out: &Path, settings: &CtbSettings, resume: bool, layer_only: bool) -> Vec<String> {
    let mut args = vec![
        program.to_string(),
        "-f".into(),
        "Mesh".into(),
        "-C".into(),
        "-c".into(),
        settings.threads.to_string(),
        "-g".into(),
        settings.mesh_factor.to_string(),
        "-s".into(),
        settings.max_depth.to_string(),
        "-e".into(),
        "0".into(),
        "-o".into(),
        path_arg(out),
    ];
    if settings.normals {
        args.push("-N".into());
    }
    if resume {
        args.push("-R".into());
    }
    if layer_only {
        args.push("-l".into());
    }
    args.push(path_arg(input));
    args
}

// ---------------------------------------------------------------------------
// Validate

struct Validation {
    verify: verify::VerifyReport,
    samples: Option<verify::SampleReport>,
}

fn validate(tools: &Tools, staged: &Path, summary: &layer::LayerSummary, prepared: &Prepared, cancel: &CancelFlag) -> Result<Validation, String> {
    let (min, max) = match (prepared.after.min, prepared.after.max) {
        (Some(min), Some(max)) => (min, max),
        _ => return Err("terrain validation: DEM has no valid heights".into()),
    };
    let (pixel_x, pixel_y) = prepared.info.pixel_size();
    let (min_x, min_y, max_x, max_y) = prepared.info.bounds();
    let inside = [min_x + pixel_x.abs(), min_y + pixel_y.abs(), max_x - pixel_x.abs(), max_y - pixel_y.abs()];
    // Quantisation is 1/32767 of a tile's height span, plus some slack for
    // averaged overview levels; a hidden 0 m on high ground still fails.
    let tolerance = 1.0 + (max - min) * 0.01;
    let (report, vertices) = verify::verify_tiles(staged, summary, inside, (min, max), tolerance, || check_cancel(cancel))?;

    let points = staged.parent().unwrap_or(staged).join("work").join("sample-points.txt");
    let text: String = vertices.iter().map(|(lon, lat, _)| format!("{lon:.10} {lat:.10}\n")).collect();
    std::fs::write(&points, text).map_err(|error| error.to_string())?;
    let sampled = tools.run_json(&[tools.runtime.tool("gf-dem-tool"), "sample".into(), path_arg(&prepared.ctb_input), path_arg(&points)])?;
    let dem: Vec<Option<f64>> = sampled
        .get("values")
        .and_then(Value::as_array)
        .map(|values| values.iter().map(Value::as_f64).collect())
        .unwrap_or_default();
    let samples = verify::compare_samples(&vertices, &dem);
    if let Some(samples) = &samples {
        tools.emitter.metric("terrain.sampleRmseM", json!(samples.rmse_m));
        tools.emitter.metric("terrain.sampleMaxAbsM", json!(samples.max_abs_m));
    }
    tools.emitter.metric("terrain.tiles", json!(report.tiles));
    tools.emitter.metric("terrain.maxEdgeGapM", json!(report.max_edge_gap_m));
    Ok(Validation { verify: report, samples })
}

// ---------------------------------------------------------------------------
// Report

#[allow(clippy::too_many_arguments)]
fn build_report(
    options: &TerrainOptions,
    infos: &[RasterInfo],
    plan: &SourcePlan,
    prepared: &Prepared,
    summary: &layer::LayerSummary,
    settings: &CtbSettings,
    runtime: &TerrainRuntime,
    validation: &Validation,
) -> Value {
    let fill_value = match options.no_data {
        NoDataPolicy::ExplicitConstant { value_meters } => json!(value_meters),
        _ => Value::Null,
    };
    let datum_note = match options.vertical_datum.mode {
        VerticalDatumMode::Ellipsoidal => "用户声明高程为椭球高，未做转换",
        VerticalDatumMode::OrthometricKnown | VerticalDatumMode::Unknown => "高程未进行垂直基准转换，按原值输出，可能与椭球高存在偏移",
    };
    json!({
        "version": 1,
        "sources": infos.iter().map(|info| json!({
            "path": info.path,
            "driver": info.driver,
            "size": [info.width, info.height],
            "epsg": info.epsg,
            "noDataValue": info.nodata.map(format_nodata),
        })).collect::<Vec<_>>(),
        "overlaps": plan.overlaps,
        "overlapRule": "列表中靠后的源覆盖靠前的源（gdalbuildvrt 顺序）",
        "crs": {
            "sourceEpsg": plan.epsg,
            "userSpecified": plan.crs_user_specified,
            "warpedTo": if prepared.warped { json!("EPSG:4326") } else { Value::Null },
        },
        "verticalDatum": {
            "mode": options.vertical_datum.mode,
            "acknowledged": options.vertical_datum.acknowledged,
            "converted": false,
            "note": datum_note,
        },
        "noData": {
            "policy": nodata::policy_name(&options.no_data),
            "sourceNoDataCount": prepared.source_no_data,
            "preparedNoDataCount": prepared.before.no_data_count,
            "preparedNoDataRatio": prepared.before.no_data_ratio(),
            "action": format!("{:?}", prepared.action),
            "fillValueMeters": fill_value,
            "filledCount": prepared.filled,
            "remainingNoDataCount": prepared.after.no_data_count,
            "validZeroCount": prepared.after.zero_count,
        },
        "heights": { "min": prepared.after.min, "max": prepared.after.max },
        "dataBounds": summary.bounds,
        "overviewBuilt": prepared.overview_built,
        "tiling": {
            "maxDepth": settings.max_depth,
            "meshQuality": options.tiling.mesh_quality,
            "ctbMeshFactor": settings.mesh_factor,
            "normals": settings.normals,
            "threads": settings.threads,
        },
        "runtime": {
            "ctbCommit": runtime.manifest.ctb_commit,
            "gdalVersion": runtime.manifest.gdal_version,
            "projVersion": runtime.manifest.proj_version,
        },
        "validation": {
            "tiles": validation.verify.tiles,
            "declaredTiles": summary.declared_tiles,
            "undeclaredFiles": summary.undeclared_files,
            "verticesInsideData": validation.verify.vertices_inside,
            "verticesOutsideData": validation.verify.vertices_outside,
            "verticesEdgeBand": validation.verify.vertices_edge_band,
            "edgeBandNote": "数据边缘两个网格内的顶点不做高程范围检查：粗层级会把边缘与数据外的 0 m 平均",
            "minHeightInsideM": validation.verify.min_height_inside,
            "maxHeightInsideM": validation.verify.max_height_inside,
            "outsideDataNote": "数据范围外的根瓦片区域由 CTB 填 0 m，只用于显示，不代表真实地形",
            "maxEdgeGapM": validation.verify.max_edge_gap_m,
            "edgePairs": validation.verify.edge_pairs,
            "sampleCount": validation.samples.as_ref().map(|s| s.count),
            "sampleRmseM": validation.samples.as_ref().map(|s| s.rmse_m),
            "sampleMaxAbsM": validation.samples.as_ref().map(|s| s.max_abs_m),
        },
    })
}

fn report_sources(emitter: &Emitter, infos: &[RasterInfo], plan: &SourcePlan) {
    for info in infos {
        emitter.log(&format!(
            "[terrain] {}: {} {}x{} {} EPSG:{} NoData={}",
            info.path.display(),
            info.driver,
            info.width,
            info.height,
            info.data_type,
            info.epsg.map(|code| code.to_string()).unwrap_or_else(|| "?".into()),
            info.nodata.map(format_nodata).unwrap_or_else(|| "none".into()),
        ));
    }
    for (a, b) in &plan.overlaps {
        emitter.warning(
            "TERRAIN_SOURCES_OVERLAP",
            &format!(
                "{} 与 {} 范围重叠，重叠处取后者",
                infos[*a].path.display(),
                infos[*b].path.display()
            ),
        );
    }
    emitter.metric("input.terrainSources", json!(infos.len()));
}

// ---------------------------------------------------------------------------
// Runtime tools

struct Tools<'a> {
    runtime: &'a TerrainRuntime,
    emitter: &'a Arc<Emitter>,
    cancel: &'a CancelFlag,
}

impl Tools<'_> {
    fn run_capture(&self, args: &[String]) -> Result<(i32, String, String), String> {
        let stdout = Arc::new(Mutex::new(String::new()));
        let sink = Arc::clone(&stdout);
        let env = self.runtime.child_env();
        let result = run_logged_env_result_with_stdout(
            self.emitter,
            self.cancel,
            args,
            None,
            &env,
            Box::new(move |line| {
                let mut text = sink.lock().unwrap();
                text.push_str(line);
                text.push('\n');
            }),
        )?;
        check_cancel(self.cancel)?;
        let text = stdout.lock().unwrap().clone();
        Ok((result.exit_code, text, result.stderr_tail))
    }

    fn run(&self, args: &[String]) -> Result<(), String> {
        let (code, _, stderr) = self.run_capture(args)?;
        if code != 0 {
            return Err(format!("terrain tool failed: {} exited with {code}: {}", tool_name(&args[0]), last_line(&stderr)));
        }
        Ok(())
    }

    fn run_ctb(&self, args: &[String]) -> Result<(), String> {
        let (code, _, stderr) = self.run_capture(args)?;
        if code != 0 {
            return Err(format!("terrain tiler failed: ctb-tile exited with {code}: {}", last_line(&stderr)));
        }
        Ok(())
    }

    /// For tools that print one JSON document on stdout (gdalinfo -json, gf-dem-tool).
    fn run_json(&self, args: &[String]) -> Result<Value, String> {
        let (code, stdout, stderr) = self.run_capture(args)?;
        let parsed: Option<Value> = serde_json::from_str(stdout.trim()).ok();
        match parsed {
            // gf-dem-tool exits 3 with a JSON body when interpolation leaves holes.
            Some(value) if code == 0 || code == 3 => Ok(value),
            Some(value) => Err(format!(
                "terrain tool failed: {} exited with {code}: {}",
                tool_name(&args[0]),
                value.get("error").and_then(Value::as_str).unwrap_or(last_line(&stderr))
            )),
            None => Err(format!(
                "terrain tool failed: {} exited with {code} without JSON output: {}",
                tool_name(&args[0]),
                last_line(&stderr)
            )),
        }
    }

    fn inspect(&self, path: &Path) -> Result<RasterInfo, String> {
        let value = self
            .run_json(&[self.runtime.tool("gdalinfo"), "-json".into(), path_arg(path)])
            .map_err(|error| format!("terrain input unreadable: {}: {error}", path.display()))?;
        inspect::parse_gdalinfo(path.to_path_buf(), &value)
    }

    fn stats(&self, path: &Path) -> Result<RasterStats, String> {
        let value = self.run_json(&[self.runtime.tool("gf-dem-tool"), "stats".into(), path_arg(path)])?;
        serde_json::from_value(value).map_err(|error| format!("terrain tool failed: stats output: {error}"))
    }
}

fn tool_name(program: &str) -> &str {
    Path::new(program).file_stem().and_then(|s| s.to_str()).unwrap_or(program)
}

fn last_line(text: &str) -> &str {
    text.lines().rev().find(|line| !line.trim().is_empty()).unwrap_or("").trim()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ctb_command_uses_mesh_cesium_friendly_and_explicit_threads() {
        let settings = CtbSettings { max_depth: 14, mesh_factor: 0.25, normals: false, threads: 4 };
        let args = ctb_args("ctb-tile", Path::new("in.tif"), Path::new("out"), &settings, false, false);
        assert_eq!(args, ["ctb-tile", "-f", "Mesh", "-C", "-c", "4", "-g", "0.25", "-s", "14", "-e", "0", "-o", "out", "in.tif"]);
        let resumed = ctb_args("ctb-tile", Path::new("in.tif"), Path::new("out"), &CtbSettings { normals: true, ..settings }, true, true);
        assert!(resumed.ends_with(&["-N".to_string(), "-R".into(), "-l".into(), "in.tif".into()]));
    }

    #[test]
    fn broken_and_temporary_tiles_are_removed_before_resume() {
        let dir = tempfile::tempdir().unwrap();
        let good = dir.path().join("1/0/0.terrain");
        std::fs::create_dir_all(good.parent().unwrap()).unwrap();
        std::fs::write(&good, quantized_mesh::tests::encode_square(0.0, 1.0, [0; 4], true)).unwrap();
        std::fs::write(dir.path().join("1/0/1.terrain"), [0x1f, 0x8b, 1]).unwrap();
        std::fs::write(dir.path().join("1/0/2.terrain.tmp"), b"partial").unwrap();
        std::fs::write(dir.path().join("layer.json"), b"{}").unwrap();
        assert_eq!(remove_broken_tiles(dir.path()).unwrap(), 2);
        assert!(good.is_file());
        assert!(dir.path().join("layer.json").is_file());
    }

    #[test]
    fn fingerprint_changes_with_options_and_source_size() {
        let dir = tempfile::tempdir().unwrap();
        runtime::tests::fake_runtime(dir.path());
        let runtime = runtime::locate(dir.path()).into_ready().unwrap();
        let source = dir.path().join("a.tif");
        std::fs::write(&source, b"1234").unwrap();
        let options: TerrainOptions = serde_json::from_value(json!({
            "version": 1, "sources": [source], "verticalDatum": { "mode": "ellipsoidal" }
        }))
        .unwrap();
        let base = fingerprint(&options, &runtime, &[source.clone()]).unwrap();
        assert_eq!(base, fingerprint(&options, &runtime, &[source.clone()]).unwrap());
        let mut changed = options.clone();
        changed.tiling.mesh_quality = geoforge_protocol::MeshQuality::High;
        assert_ne!(base, fingerprint(&changed, &runtime, &[source.clone()]).unwrap());
        std::fs::write(&source, b"12345").unwrap();
        assert_ne!(base, fingerprint(&options, &runtime, &[source]).unwrap());
    }
}
