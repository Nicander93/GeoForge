//! `convert-terrain`: DEM -> Cesium quantized-mesh with the CTB sidecar.
//!
//! inspect (GDAL/PROJ CRS, route) -> prepare (VRT, warp to EPSG:4326 when the
//! route is normalize, NoData, overview) -> tile -> layer.json -> validate ->
//! commit. The raster given to CTB never contains NoData, because CTB would
//! write it as 0 m.

pub mod crs;
pub mod inspect;
pub mod layer;
pub mod nodata;
pub mod preflight;
pub mod quantized_mesh;
pub mod runtime;
pub mod verify;

use crate::cancel::CancelFlag;
use crate::overall_progress::{plan_convert_terrain, OverallProgress, TERRAIN_PHASE_WEIGHTS};
use crate::path_policy;
use crate::protocol::{Emitter, Stage, TaskConfig};
use crate::stages::commit;
use crate::util::run_logged_env_result_with_stdout;
use crs::{CrsReport, Route, RouteDecision};
use geoforge_protocol::{MaxDepth, NoDataPolicy, OverviewMode, ResumePolicy, TerrainOptions, VerticalDatumMode};
use inspect::{DepthEstimate, RasterInfo, SourcePlan};
use nodata::{FootprintCounts, NoDataAction, RasterStats};
use runtime::TerrainRuntime;
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

/// Marks the frame gdalwarp adds around a reprojected DEM.
const WARP_NODATA: &str = "-32768";
/// Below this size CTB reads the full-resolution raster fast enough.
const OVERVIEW_MIN_PIXELS: u64 = 4096 * 4096;
/// CTB memory per thread when it reads overviews (or a raster below
/// OVERVIEW_MIN_PIXELS). V1.2 on LM: D4 peaked at 2174 MiB with 5 threads
/// and 2205 MiB with 20 (about 110 MiB per thread at 20), M high 1827 MiB
/// with 20; 256 keeps a 2x margin over that.
const CTB_MIB_PER_THREAD: u64 = 256;
/// CTB on a large raster without overviews reads full resolution; P0 saw
/// 0.5-0.7 GiB per thread, so this path keeps the old estimate.
const CTB_MIB_PER_THREAD_FULL_RES: u64 = 700;
const FINGERPRINT_FILE: &str = "terrain-fingerprint.json";
/// A direct (CTB-reprojected) run needs at least this many sample points.
const DIRECT_MIN_SAMPLES: usize = 100;
pub const REPORT_FILE: &str = "geoforge-terrain.json";

/// CTB thread count limited by CPU workers and the memory budget.
fn ctb_threads(cpu_workers: u32, memory_budget_mib: u64, reads_overviews: bool) -> (u32, u64) {
    let per_thread = if reads_overviews { CTB_MIB_PER_THREAD } else { CTB_MIB_PER_THREAD_FULL_RES };
    let by_memory = (memory_budget_mib / per_thread).clamp(1, u32::MAX as u64) as u32;
    (cpu_workers.min(by_memory).max(1), per_thread)
}

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
    emitter.log(&format!("[terrain] execution options: {}", exec_opts.describe_resolution(&budget.resolved)));
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
    let source_crs = infos
        .iter()
        .map(|info| tools.crs(options.crs_override.as_deref(), info, info.bounds()))
        .collect::<Result<Vec<_>, _>>()?;
    let plan = inspect::plan_sources(&infos, &source_crs, options.crs_override.is_none())?;
    let accept_ballpark = options.preprocess.accept_ballpark_transform;
    for source in &source_crs {
        crs::check_transform(source, accept_ballpark)?;
    }
    // Uniform sources: one more call for the combined extent, whose WGS 84
    // box and operation drive the route, layer.json bounds and sampling.
    // Mixed sources are each warped with their own operation.
    let (crs, route) = if plan.uniform {
        let crs = tools.crs(options.crs_override.as_deref(), &infos[0], union_bounds(&infos))?;
        crs::check_transform(&crs, accept_ballpark)?;
        let route = crs::choose_route(options.projection_mode(), &crs);
        (crs, route)
    } else {
        (source_crs[0].clone(), RouteDecision { route: Route::Normalize, reason: "heterogeneous-sources" })
    };
    let extent = data_extent(&plan, &crs, &source_crs)?;
    emitter.log(&format!(
        "[terrain] CRS {}; operation to WGS 84: {}; route {:?} ({})",
        crs.label(),
        crs.selected().and_then(|op| op.name.as_deref()).unwrap_or("?"),
        route.route,
        route.reason
    ));
    for source in source_crs.iter().filter(|crs| crs.selected().is_some_and(|op| op.ballpark)) {
        emitter.warning(
            "TERRAIN_TRANSFORM_BALLPARK",
            &format!("{} 到 WGS 84 使用近似操作（无基准转换，精度未知），已按任务设置接受", source.label()),
        );
    }
    report_sources(emitter, &infos, &source_crs, &plan);
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
    let input = PrepareInput { infos: &infos, source_crs: &source_crs, plan: &plan, crs: &crs, route: &route, extent };
    let prepared = prepare(&tools, options, &input, &work)?;
    commit::write_checkpoint(&temp, commit::Checkpoint::Converted)?;
    check_cancel(cancel)?;

    let reads_overviews = prepared.overview_built || prepared.info.has_overviews || prepared.info.width * prepared.info.height <= OVERVIEW_MIN_PIXELS;
    let (threads, per_thread) = ctb_threads(budget.cpu_workers(), budget.memory_budget_mib(), reads_overviews);
    emitter.log(&format!("[terrain] CTB threads {threads} (~{per_thread} MiB each, overviews {reads_overviews})"));
    let depth = inspect::auto_max_depth(prepared.wgs84_bounds[3] - prepared.wgs84_bounds[1], prepared.info.height);
    let max_depth = match options.tiling.max_depth {
        MaxDepth::Level(level) => level,
        MaxDepth::Auto => depth.level,
    };
    emitter.log(&format!(
        "[terrain] source pixel ≈{:.3} m ({:.3e}° latitude); suggested maxDepth {}, using {max_depth}",
        depth.pixel_ground_metres, depth.pixel_latitude_degrees, depth.level
    ));
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
    // ctb-tile reads its arguments in the ANSI code page on Windows, so it
    // runs inside `staged` with ASCII-only relative paths.
    let ctb_input = ctb_relative_input(&tools, &prepared.ctb_input, &work)?;
    let here = Path::new(".");
    tools.run_ctb(&ctb_args(&runtime.tool("ctb-tile"), &ctb_input, here, &settings, resumed, false), &staged)?;
    check_cancel(cancel)?;

    overall.report(0, 0, None, Some("layer"), None, false, true);
    tools.run_ctb(&ctb_args(&runtime.tool("ctb-tile"), &ctb_input, here, &settings, false, true), &staged)?;
    let layer_path = staged.join("layer.json");
    let mut layer_json: Value = std::fs::read_to_string(&layer_path)
        .map_err(|error| format!("terrain validation: layer.json missing: {error}"))
        .and_then(|text| serde_json::from_str(&text).map_err(|error| format!("terrain validation: layer.json: {error}")))?;
    let files = layer::list_tiles(&staged)?;
    let mut summary = layer::normalize(&mut layer_json, &files)?;
    // CTB writes the root-tile extent here; Cesium uses it for the data extent.
    layer_json["bounds"] = json!(prepared.wgs84_bounds);
    summary.bounds = prepared.wgs84_bounds;
    std::fs::write(&layer_path, serde_json::to_string_pretty(&layer_json).unwrap())
        .map_err(|error| error.to_string())?;
    overall.complete_current();

    overall.enter(Stage::Validate);
    emitter.stage(Stage::Validate, "Checking terrain tiles");
    commit::write_checkpoint(&temp, commit::Checkpoint::Validating)?;
    let validation = validate(&tools, &staged, &summary, &prepared, cancel)?;
    commit::write_checkpoint(&temp, commit::Checkpoint::Validated)?;
    overall.complete_current();

    let report = build_report(
        options,
        &ReportInput { infos: &infos, source_crs: &source_crs, crs: &crs, route: &route, plan: &plan, depth: &depth },
        &prepared,
        &summary,
        &settings,
        runtime,
        &validation,
    );
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
        check_source_file(path)?;
        let canonical = path_policy::normalize_path(path).map_err(|error| format!("terrain input: {error}"))?;
        if paths.contains(&canonical) {
            return Err(format!("terrain input: 源文件重复：{}", path.display()));
        }
        paths.push(canonical);
    }
    Ok(paths)
}

fn check_source_file(path: &Path) -> Result<(), String> {
    let metadata = std::fs::symlink_metadata(path).map_err(|_| format!("terrain input does not exist: {}", path.display()))?;
    if metadata.file_type().is_symlink() {
        return Err(format!("terrain input: 不接受符号链接作为源文件：{}", path.display()));
    }
    if !metadata.is_file() {
        return Err(format!("terrain input: 源路径必须是文件：{}", path.display()));
    }
    let extension = path.extension().and_then(|e| e.to_str()).unwrap_or_default().to_ascii_lowercase();
    if !matches!(extension.as_str(), "tif" | "tiff" | "asc" | "vrt") {
        return Err(format!("terrain input: 只支持 .tif/.tiff/.asc/.vrt：{}", path.display()));
    }
    Ok(())
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
    /// The raster CTB reads, before overviews (EPSG:4326 when warped,
    /// otherwise the source CRS).
    info: RasterInfo,
    warped: bool,
    /// [west, south, east, north] of the data in WGS 84.
    wgs84_bounds: [f64; 4],
    /// Box that certainly lies inside the data, shrunk by one pixel.
    inside: [f64; 4],
    /// Raster in the source CRS used for the sample comparison, and the
    /// pipeline file that maps lon/lat into it (none for WGS 84 sources).
    sample_raster: PathBuf,
    sample_pipeline: Option<PathBuf>,
    source_no_data: u64,
    counts: FootprintCounts,
    before: RasterStats,
    after: RasterStats,
    action: NoDataAction,
    filled: u64,
    auxiliary: u64,
    /// Set when auxiliary heights cover a large area between sources.
    auxiliary_warning: Option<String>,
    overview_built: bool,
}

struct PrepareInput<'a> {
    infos: &'a [RasterInfo],
    source_crs: &'a [CrsReport],
    plan: &'a SourcePlan,
    /// Combined CRS for uniform sources, the first source's otherwise.
    crs: &'a CrsReport,
    route: &'a RouteDecision,
    /// WGS 84 outer and inner box of the data.
    extent: ([f64; 4], [f64; 4]),
}

/// Outer box: what layer.json declares. Inner box: inside the data on every
/// side, bounds the strict height check. For mixed sources both are hulls of
/// the per-source boxes, so the inner box can include gaps between sources.
fn data_extent(plan: &SourcePlan, crs: &CrsReport, sources: &[CrsReport]) -> Result<([f64; 4], [f64; 4]), String> {
    let list: Vec<&CrsReport> = if plan.uniform { vec![crs] } else { sources.iter().collect() };
    let mut outer = [f64::INFINITY, f64::INFINITY, f64::NEG_INFINITY, f64::NEG_INFINITY];
    let mut inner = outer;
    for crs in list {
        let operation = crs.selected().ok_or("terrain transform unavailable: no operation")?;
        let box_outer = operation.wgs84_bounds.ok_or("terrain transform unavailable: no WGS 84 extent")?;
        let box_inner = operation.wgs84_inner_bounds.unwrap_or(box_outer);
        for (hull, b) in [(&mut outer, box_outer), (&mut inner, box_inner)] {
            *hull = [hull[0].min(b[0]), hull[1].min(b[1]), hull[2].max(b[2]), hull[3].max(b[3])];
        }
    }
    Ok((outer, inner))
}

fn prepare(tools: &Tools, options: &TerrainOptions, input: &PrepareInput, work: &Path) -> Result<Prepared, String> {
    let (infos, plan, crs) = (input.infos, input.plan, input.crs);
    let operation = crs.selected().ok_or("terrain transform unavailable: no operation")?;
    let pipeline = operation.pipeline.clone().ok_or("terrain transform unavailable: no pipeline")?;
    let mut current = infos[0].path.clone();
    if options.crs_override.is_some() || (plan.uniform && infos.len() > 1) {
        let paths: Vec<&Path> = if plan.uniform { infos.iter().map(|info| info.path.as_path()).collect() } else { vec![&infos[0].path] };
        current = build_source_vrt(tools, options, crs, &paths, &work.join("sources.vrt"))?;
    }

    // Sampling compares against the merged (or, for mixed sources, the
    // first) source in its own CRS.
    let sample_raster = current.clone();
    let sample_pipeline = if crs.is_wgs84_geographic() {
        None
    } else {
        let file = work.join("sample-pipeline.txt");
        std::fs::write(&file, &pipeline).map_err(|error| error.to_string())?;
        Some(file)
    };
    let warp = input.route.route == Route::Normalize;
    let mut source_no_data = 0;
    let mut coverage = None;
    let counts = if warp {
        let (warped, cover) = if plan.uniform {
            if plan.nodata.is_some() {
                source_no_data = tools.stats(&current)?.no_data_count;
            }
            let ct = operation.ct_pipeline.clone().ok_or("terrain transform unavailable: no pipeline")?;
            warp_with_coverage(tools, &current, &ct, plan.nodata, None, work, "normalized-4326")?
        } else {
            warp_each_source(tools, options, input, work, &mut source_no_data)?
        };
        current = warped;
        let value = tools.run_json(&[
            tools.runtime.tool("gf-dem-tool"),
            "footprint".into(),
            path_arg(&current),
            path_arg(&cover),
            "count".into(),
        ])?;
        coverage = Some(cover);
        serde_json::from_value(value).map_err(|error| format!("terrain tool failed: footprint output: {error}"))?
    } else {
        let stats = tools.stats(&current)?;
        source_no_data = stats.no_data_count;
        FootprintCounts::from_stats(&stats)
    };
    tools.emitter.log(&format!(
        "[terrain] NoData: {} inside the source footprint, {} outside it (reprojection frame)",
        counts.source_hole_count, counts.outside_count
    ));

    let before = tools.stats(&current)?;
    let action = nodata::decide(&options.no_data, &counts)?;
    let mut filled = 0;
    let mut auxiliary = 0;
    let mut auxiliary_warning = None;
    let needs_fill = counts.source_hole_count + counts.outside_count > 0;
    if let Some(cover) = coverage.filter(|_| needs_fill) {
        let out = work.join("filled.tif");
        let mut args = vec![tools.runtime.tool("gf-dem-tool"), "footprint".into(), path_arg(&current), path_arg(&cover), path_arg(&out)];
        match action {
            NoDataAction::Nothing => args.push("none".into()),
            NoDataAction::FillConstant(value) => args.extend(["constant".into(), value.to_string()]),
            NoDataAction::Interpolate(max_search) => args.extend(["interpolate".into(), max_search.to_string()]),
        }
        let result = tools.run_json(&args)?;
        check_remaining(&result, "remainingHoleCount", &action)?;
        if result.get("auxiliaryMissingCount").and_then(Value::as_u64).unwrap_or(1) > 0 {
            return Err("terrain nodata fill failed: 数据范围外有像元无法得到辅助高程".into());
        }
        filled = result.get("filledHoleCount").and_then(Value::as_u64).unwrap_or(0);
        auxiliary = result.get("auxiliaryCount").and_then(Value::as_u64).unwrap_or(0);
        if let Some(text) = nodata::auxiliary_warning(infos.len(), auxiliary, &counts) {
            tools.emitter.log(&format!("[terrain] quality warning: {text}"));
            tools.emitter.warning("TERRAIN_AUXILIARY_EXTRAPOLATION", &text);
            auxiliary_warning = Some(text);
        }
        current = out;
    } else if let NoDataAction::FillConstant(_) | NoDataAction::Interpolate(_) = action {
        let out = work.join("filled.tif");
        let (command, value) = match action {
            NoDataAction::FillConstant(value) => ("fill-constant", value.to_string()),
            NoDataAction::Interpolate(max_search) => ("fill-interpolate", max_search.to_string()),
            NoDataAction::Nothing => unreachable!(),
        };
        let result = tools.run_json(&[tools.runtime.tool("gf-dem-tool"), command.into(), path_arg(&current), path_arg(&out), value])?;
        check_remaining(&result, "remainingNoDataCount", &action)?;
        filled = result.get("filledCount").and_then(Value::as_u64).unwrap_or(0);
        current = out;
    }
    let after = tools.stats(&current)?;
    // The guarantee the whole stage exists for.
    if after.no_data_count != 0 {
        return Err(format!("terrain nodata fill failed: 切片输入仍有 {} 个 NoData 像元", after.no_data_count));
    }

    let mut info = tools.inspect(&current)?;
    let ctb_info = info.clone();
    let (outer, inner) = input.extent;
    // One source pixel in degrees; longitude degrees shrink with latitude.
    let py = (outer[3] - outer[1]) / infos[0].height.max(1) as f64;
    let px = py / ((outer[1] + outer[3]) / 2.0).to_radians().cos().max(0.01);
    let inside = [inner[0] + px, inner[1] + py, inner[2] - px, inner[3] - py];
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
        info: ctb_info,
        warped: warp,
        wgs84_bounds: outer,
        inside,
        sample_raster,
        sample_pipeline,
        source_no_data,
        counts,
        before,
        after,
        action,
        filled,
        auxiliary,
        auxiliary_warning,
        overview_built,
    })
}

fn check_remaining(result: &Value, key: &str, action: &NoDataAction) -> Result<(), String> {
    let remaining = result.get(key).and_then(Value::as_u64).unwrap_or(u64::MAX);
    if remaining == 0 {
        return Ok(());
    }
    match action {
        NoDataAction::Interpolate(max_search) => Err(format!(
            "terrain nodata fill failed: 邻域插值后仍有 {remaining} 个像元离有效数据超过 {max_search} 像元；\
             孔洞过大，请改用常数填补或先修补数据"
        )),
        _ => Err(format!("terrain nodata fill failed: 仍有 {remaining} 个源内 NoData 像元")),
    }
}

/// VRT over `paths`, labelled with the user's CRS (GDAL's normalised WKT,
/// read from a file so a long WKT stays off the command line) when given.
fn build_source_vrt(tools: &Tools, options: &TerrainOptions, crs: &CrsReport, paths: &[&Path], vrt: &Path) -> Result<PathBuf, String> {
    let mut args = vec![tools.runtime.tool("gdalbuildvrt")];
    if options.crs_override.is_some() {
        let wkt = crs.wkt.as_deref().ok_or("terrain crs invalid: GDAL returned no WKT")?;
        let file = vrt.with_extension("wkt");
        std::fs::write(&file, wkt).map_err(|error| error.to_string())?;
        args.extend(["-a_srs".into(), path_arg(&file)]);
    }
    args.push(path_arg(vrt));
    args.extend(paths.iter().map(|path| path_arg(path)));
    tools.run(&args)?;
    Ok(vrt.to_path_buf())
}

/// Warp `source` to EPSG:4326 with the checked operation, plus a coverage
/// raster on exactly the same grid whose alpha band marks where source
/// pixels land (source NoData ignored, nearest resampling). `pixel_degrees`
/// pins a common grid (with -tap) for mixed sources.
fn warp_with_coverage(
    tools: &Tools,
    source: &Path,
    ct: &str,
    nodata: Option<f64>,
    pixel_degrees: Option<f64>,
    work: &Path,
    name: &str,
) -> Result<(PathBuf, PathBuf), String> {
    let warped = work.join(format!("{name}.tif"));
    // -ct pins the operation that was checked; -novshift keeps heights
    // untouched even for a compound source CRS.
    let mut args = vec![tools.runtime.tool("gdalwarp"), "-ct".into(), ct.to_string(), "-novshift".into()];
    if let Some(nodata) = nodata {
        args.extend(["-srcnodata".into(), format_nodata(nodata)]);
    }
    if let Some(pixel) = pixel_degrees {
        args.extend(["-tr".into(), pixel.to_string(), pixel.to_string(), "-tap".into()]);
    }
    args.extend(
        [
            "-t_srs", "EPSG:4326", "-r", "bilinear", "-ot", "Float32", "-dstnodata", WARP_NODATA,
            "-of", "GTiff", "-co", "TILED=YES", "-co", "COMPRESS=DEFLATE", "-co", "PREDICTOR=3",
            "-co", "BIGTIFF=IF_SAFER", "-multi", "-wo", "NUM_THREADS=ALL_CPUS",
        ]
        .map(String::from),
    );
    args.push(path_arg(source));
    args.push(path_arg(&warped));
    tools.run(&args)?;

    let info = tools.inspect(&warped)?;
    let (min_x, min_y, max_x, max_y) = info.bounds();
    let coverage = work.join(format!("{name}-coverage.tif"));
    let mut args = vec![tools.runtime.tool("gdalwarp"), "-ct".into(), ct.to_string(), "-novshift".into()];
    args.extend(["-srcnodata", "None", "-dstalpha", "-r", "near", "-ot", "Byte", "-t_srs", "EPSG:4326", "-te"].map(String::from));
    args.extend([min_x, min_y, max_x, max_y].map(|value| value.to_string()));
    args.extend(["-ts".into(), info.width.to_string(), info.height.to_string()]);
    args.extend(["-of", "GTiff", "-co", "TILED=YES", "-co", "COMPRESS=DEFLATE"].map(String::from));
    args.push(path_arg(source));
    args.push(path_arg(&coverage));
    tools.run(&args)?;
    Ok((warped, coverage))
}

/// Mixed CRS, pixel size or NoData value: every source is warped with its
/// own operation onto one grid (the finest source pixel), then stacked in
/// VRTs; later sources win where they overlap, as gdalbuildvrt does.
fn warp_each_source(
    tools: &Tools,
    options: &TerrainOptions,
    input: &PrepareInput,
    work: &Path,
    source_no_data: &mut u64,
) -> Result<(PathBuf, PathBuf), String> {
    let pixel_degrees = input
        .infos
        .iter()
        .zip(input.source_crs)
        .filter_map(|(info, crs)| {
            let bounds = crs.selected()?.wgs84_bounds?;
            Some((bounds[3] - bounds[1]) / info.height.max(1) as f64)
        })
        .fold(f64::INFINITY, f64::min);
    if !pixel_degrees.is_finite() || pixel_degrees <= 0.0 {
        return Err("terrain transform unavailable: 无法确定统一的经纬度格网".into());
    }
    tools.emitter.log(&format!(
        "[terrain] sources differ in CRS, pixel size or NoData; warping each to EPSG:4326 at {pixel_degrees:.3e} degrees"
    ));
    let mut dems = Vec::new();
    let mut coverages = Vec::new();
    for (index, (info, crs)) in input.infos.iter().zip(input.source_crs).enumerate() {
        let mut source = info.path.clone();
        if options.crs_override.is_some() {
            source = build_source_vrt(tools, options, crs, &[&info.path], &work.join(format!("source-{index}.vrt")))?;
        }
        if info.nodata.is_some() {
            *source_no_data += tools.stats(&source)?.no_data_count;
        }
        let ct = crs.selected().and_then(|op| op.ct_pipeline.clone()).ok_or("terrain transform unavailable: no pipeline")?;
        let name = format!("warped-{index}");
        let (dem, coverage) = warp_with_coverage(tools, &source, &ct, info.nodata, Some(pixel_degrees), work, &name)?;
        dems.push(dem);
        coverages.push(coverage);
    }
    let stack = |out: PathBuf, band: Option<&str>, inputs: &[PathBuf]| -> Result<PathBuf, String> {
        let mut args = vec![tools.runtime.tool("gdalbuildvrt"), "-resolution".into(), "highest".into()];
        if let Some(band) = band {
            args.extend(["-b".into(), band.into()]);
        }
        args.push(path_arg(&out));
        args.extend(inputs.iter().map(|path| path_arg(path)));
        tools.run(&args)?;
        Ok(out)
    };
    let dem = stack(work.join("normalized-4326.vrt"), None, &dems)?;
    let coverage = stack(work.join("normalized-4326-coverage.vrt"), Some("2"), &coverages)?;
    Ok((dem, coverage))
}

/// `input` as a path relative to `staged` (a sibling of `work`), wrapped in
/// a VRT first when it lies outside `work` (the user's own file). All names
/// in `work` are ASCII.
fn ctb_relative_input(tools: &Tools, input: &Path, work: &Path) -> Result<PathBuf, String> {
    let mut input = input.to_path_buf();
    if !input.starts_with(work) {
        let vrt = work.join("ctb-source.vrt");
        tools.run(&[tools.runtime.tool("gdalbuildvrt"), path_arg(&vrt), path_arg(&input)])?;
        input = vrt;
    }
    let relative = input.strip_prefix(work).map_err(|_| "terrain tiler failed: CTB input outside the work folder".to_string())?;
    Ok(Path::new("..").join("work").join(relative))
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
    let inside = prepared.inside;
    // Quantisation is 1/32767 of a tile's height span, plus some slack for
    // averaged overview levels; a hidden 0 m on high ground still fails.
    let tolerance = 1.0 + (max - min) * 0.01;
    let (report, vertices) = verify::verify_tiles(staged, summary, inside, (min, max), tolerance, || check_cancel(cancel))?;

    let points = staged.parent().unwrap_or(staged).join("work").join("sample-points.txt");
    let text: String = vertices.iter().map(|(lon, lat, _)| format!("{lon:.10} {lat:.10}\n")).collect();
    std::fs::write(&points, text).map_err(|error| error.to_string())?;
    let mut args = vec![tools.runtime.tool("gf-dem-tool"), "sample".into(), path_arg(&prepared.sample_raster), path_arg(&points)];
    if let Some(pipeline) = &prepared.sample_pipeline {
        args.push(format!("@{}", path_arg(pipeline)));
    }
    let sampled = tools.run_json(&args)?;
    let dem: Vec<Option<f64>> = sampled
        .get("values")
        .and_then(Value::as_array)
        .map(|values| values.iter().map(Value::as_f64).collect())
        .unwrap_or_default();
    let samples = verify::compare_samples(&vertices, &dem);
    // CTB reprojected by itself: the samples are the only proof that it used
    // the right operation, so a direct run without them, or with gross
    // errors, fails rather than being reported as a success.
    if !prepared.warped && prepared.sample_pipeline.is_some() {
        match &samples {
            Some(s) if s.count >= DIRECT_MIN_SAMPLES && s.p95_m <= tolerance => {}
            Some(s) => {
                return Err(format!(
                    "terrain validation: CTB 直读结果与源 DEM 对不上（{} 个采样点，P95 {:.2} m，限值 {tolerance:.2} m）；\
                     请改用 projectionMode=normalize",
                    s.count, s.p95_m
                ))
            }
            None => return Err("terrain validation: CTB 直读结果没有可与源 DEM 对比的采样点；请改用 projectionMode=normalize".into()),
        }
    }
    if let Some(samples) = &samples {
        tools.emitter.metric("terrain.sampleRmseM", json!(samples.rmse_m));
        tools.emitter.metric("terrain.sampleMaxAbsM", json!(samples.max_abs_m));
        tools.emitter.metric("terrain.sampleP95M", json!(samples.p95_m));
    }
    tools.emitter.metric("terrain.tiles", json!(report.tiles));
    tools.emitter.metric("terrain.maxEdgeGapM", json!(report.max_edge_gap_m));
    Ok(Validation { verify: report, samples })
}

// ---------------------------------------------------------------------------
// Report

struct ReportInput<'a> {
    infos: &'a [RasterInfo],
    source_crs: &'a [CrsReport],
    crs: &'a CrsReport,
    route: &'a RouteDecision,
    plan: &'a SourcePlan,
    depth: &'a DepthEstimate,
}

fn build_report(
    options: &TerrainOptions,
    input: &ReportInput,
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
    let accepted = options.preprocess.accept_ballpark_transform;
    let mut crs_json = crs::report_json(input.crs, options.crs_override.is_some(), accepted);
    crs_json["warpedTo"] = if prepared.warped { json!("EPSG:4326") } else { Value::Null };
    json!({
        "version": 2,
        "sources": input.infos.iter().zip(input.source_crs).map(|(info, crs)| json!({
            "path": info.path,
            "driver": info.driver,
            "size": [info.width, info.height],
            "crsAuthority": crs.authority,
            "crsName": crs.name,
            "wgs84Bounds": crs.selected().and_then(|op| op.wgs84_bounds),
            "noDataValue": info.nodata.map(format_nodata),
        })).collect::<Vec<_>>(),
        "overlaps": input.plan.overlaps,
        "overlapRule": "列表中靠后的源覆盖靠前的源（gdalbuildvrt 顺序）",
        "crs": crs_json,
        "route": {
            "projectionMode": options.projection_mode(),
            "effective": match input.route.route { Route::Direct => "direct", Route::Normalize => "normalize" },
            "reason": input.route.reason,
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
            "sourceHoleCount": prepared.counts.source_hole_count,
            "outsideFootprintCount": prepared.counts.outside_count,
            "filledHoleCount": prepared.filled,
            "auxiliaryCount": prepared.auxiliary,
            "auxiliaryRatio": prepared.auxiliary as f64 / (prepared.counts.valid_count + prepared.counts.source_hole_count + prepared.counts.outside_count).max(1) as f64,
            "auxiliaryWarning": prepared.auxiliary_warning,
            "auxiliaryMethod": if prepared.auxiliary > 0 { json!("idw-extension") } else { Value::Null },
            "auxiliaryNote": if prepared.auxiliary > 0 { json!("源覆盖范围外（重投影外框）的像元是由有效高程反距离外推的辅助值，只供 CTB 构网，不是真实地形，不参与校验") } else { Value::Null },
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
            "maxDepthAuto": options.tiling.max_depth == MaxDepth::Auto,
            "suggestedMaxDepth": input.depth.level,
            "sourcePixelLatitudeDegrees": input.depth.pixel_latitude_degrees,
            "sourcePixelGroundMetres": input.depth.pixel_ground_metres,
            "maxDepthRule": "第一个 CTB 格距（瓦片高度 / 64）不粗于源像元的层级；源像元按 WGS 84 纬度跨度 / 行数计算",
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
            "sampleP95M": validation.samples.as_ref().map(|s| s.p95_m),
            "sampleReference": "最高层顶点与源坐标系下原始 DEM（填补前）双线性采样之差",
        },
    })
}

fn report_sources(emitter: &Emitter, infos: &[RasterInfo], crs: &[CrsReport], plan: &SourcePlan) {
    for (info, crs) in infos.iter().zip(crs) {
        emitter.log(&format!(
            "[terrain] {}: {} {}x{} {} {} NoData={}",
            info.path.display(),
            info.driver,
            info.width,
            info.height,
            info.data_type,
            crs.label(),
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
        self.run_capture_in(args, None)
    }

    fn run_capture_in(&self, args: &[String], cwd: Option<&Path>) -> Result<(i32, String, String), String> {
        let stdout = Arc::new(Mutex::new(String::new()));
        let sink = Arc::clone(&stdout);
        let env = self.runtime.child_env();
        let started = std::time::Instant::now();
        let result = run_logged_env_result_with_stdout(
            self.emitter,
            self.cancel,
            args,
            cwd,
            &env,
            Box::new(move |line| {
                let mut text = sink.lock().unwrap();
                text.push_str(line);
                text.push('\n');
            }),
        )?;
        self.emitter.metric("terrain.toolSeconds", json!({
            "tool": tool_name(&args[0]),
            "command": args.get(1).filter(|_| tool_name(&args[0]) == "gf-dem-tool"),
            "seconds": started.elapsed().as_secs_f64(),
        }));
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

    fn run_ctb(&self, args: &[String], cwd: &Path) -> Result<(), String> {
        let (code, _, stderr) = self.run_capture_in(args, Some(cwd))?;
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

    /// CRS of `info` (or the user's definition) and its operation to WGS 84
    /// for the given extent in that CRS.
    fn crs(&self, crs_override: Option<&str>, info: &RasterInfo, bounds: (f64, f64, f64, f64)) -> Result<CrsReport, String> {
        let definition = match crs_override {
            Some(text) => text.to_string(),
            None => format!("raster:{}", path_arg(&info.path)),
        };
        let (code, stdout, stderr) = self.run_capture(&[
            self.runtime.tool("gf-dem-tool"),
            "crs".into(),
            definition,
            "--bounds".into(),
            bounds.0.to_string(),
            bounds.1.to_string(),
            bounds.2.to_string(),
            bounds.3.to_string(),
        ])?;
        let value: Value = serde_json::from_str(stdout.trim()).map_err(|_| {
            format!("terrain tool failed: gf-dem-tool crs exited with {code} without JSON output: {}", last_line(&stderr))
        })?;
        crs::parse_report(&value).map_err(|error| format!("{error}（{}）", info.path.display()))
    }

    fn stats(&self, path: &Path) -> Result<RasterStats, String> {
        let value = self.run_json(&[self.runtime.tool("gf-dem-tool"), "stats".into(), path_arg(path)])?;
        serde_json::from_value(value).map_err(|error| format!("terrain tool failed: stats output: {error}"))
    }
}

fn union_bounds(infos: &[RasterInfo]) -> (f64, f64, f64, f64) {
    infos.iter().map(RasterInfo::bounds).fold(
        (f64::INFINITY, f64::INFINITY, f64::NEG_INFINITY, f64::NEG_INFINITY),
        |a, b| (a.0.min(b.0), a.1.min(b.1), a.2.max(b.2), a.3.max(b.3)),
    )
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
    fn ctb_threads_follow_budget_and_overviews() {
        // Default budget (4096 MiB, 8 workers): overviews allow all 8.
        assert_eq!(ctb_threads(8, 4096, true), (8, 256));
        assert_eq!(ctb_threads(20, 4096, true), (16, 256));
        // Full-resolution reads keep the 700 MiB estimate.
        assert_eq!(ctb_threads(8, 4096, false), (5, 700));
        // A tiny budget still runs one thread.
        assert_eq!(ctb_threads(8, 100, true), (1, 256));
        assert_eq!(ctb_threads(0, 4096, true), (1, 256));
    }

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
            "version": 2, "sources": [source], "verticalDatum": { "mode": "ellipsoidal" }
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
