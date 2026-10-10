//! `convert-ifc`: run the external IFC tool and parse its JSON lines.
//!
//! The tool (tools/ifc) writes one JSON object per stdout line, each tagged
//! `"geoforgeIfc": 1`. Stage, progress and warning events are forwarded to the
//! task emitter; the final summary becomes metrics and `ifc-report.json`.

use crate::cancel::CancelFlag;
use crate::progress_throttle::ProgressThrottle;
use crate::protocol::{Emitter, Stage};
use crate::util::{run_logged_env_result_with_stdout, IfcTool};
use geoforge_protocol::{IfcGeoreferenceOptions, IfcTaskOptions, IfcTilingMode};
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

const TOOL_PROTOCOL_VERSION: u64 = 1;
pub const REPORT_FILE: &str = "ifc-report.json";

#[derive(Debug, Default)]
struct ToolOutput {
    summary: Option<Value>,
    error: Option<String>,
}

pub struct IfcConvertRequest<'a> {
    pub input: &'a Path,
    pub tiles_dir: &'a Path,
    pub exchange_dir: &'a Path,
    pub options: &'a IfcTaskOptions,
    pub threads: u32,
}

/// Run the tool and return its summary. The tileset lands in `tiles_dir`.
pub fn run_ifc_convert(
    emitter: &Arc<Emitter>,
    cancel: &CancelFlag,
    tool: &IfcTool,
    packaged: bool,
    request: &IfcConvertRequest<'_>,
) -> Result<Value, String> {
    let Some(mut command) = tool.command_prefix() else {
        return Err(tool.missing_message(packaged));
    };
    command.extend(build_tool_args(request));
    emitter.stage(Stage::Convert, "IFC → 3D Tiles 1.1");
    emitter.metric("ifc.threads", json!(request.threads));

    let output = Arc::new(Mutex::new(ToolOutput::default()));
    let progress = ProgressThrottle::new(Arc::clone(emitter));
    let handler = {
        let emitter = Arc::clone(emitter);
        let output = Arc::clone(&output);
        let progress = progress.clone();
        let threads = request.threads;
        Box::new(move |line: &str| {
            handle_tool_line(&emitter, &progress, threads, &output, line);
        })
    };
    // ASCII JSON already avoids code page issues; UTF-8 keeps tracebacks readable.
    let env = [
        ("PYTHONUNBUFFERED", PathBuf::from("1")),
        ("PYTHONIOENCODING", PathBuf::from("utf-8")),
    ];
    let started = std::time::Instant::now();
    let result = run_logged_env_result_with_stdout(emitter, cancel, &command, None, &env, handler)?;
    progress.force_flush(Stage::Convert);
    emitter.metric("ifc.elapsedMs", json!(started.elapsed().as_millis()));
    if let Some(bytes) = result.peak_memory_bytes {
        emitter.metric("ifc.peakMemoryBytes", json!(bytes));
    }
    if cancel.is_cancelled() {
        return Err("cancelled".into());
    }

    let output = std::mem::take(&mut *output.lock().map_err(|_| "IFC tool output lock poisoned")?);
    if result.exit_code != 0 {
        let detail = output
            .error
            .filter(|message| !message.trim().is_empty())
            .or_else(|| (!result.stderr_tail.is_empty()).then(|| result.stderr_tail.clone()))
            .unwrap_or_else(|| "工具没有输出错误信息".into());
        return Err(format!(
            "IFC 转换失败（exit {}）：{detail}",
            result.exit_code
        ));
    }
    let summary = output
        .summary
        .ok_or_else(|| "IFC 转换失败：工具正常退出但没有输出结果摘要".to_string())?;
    if !request.tiles_dir.join("tileset.json").is_file() {
        return Err(format!(
            "IFC 转换失败：输出目录缺少 tileset.json（{}）",
            request.tiles_dir.display()
        ));
    }
    report_summary(emitter, &summary);
    Ok(summary)
}

fn build_tool_args(request: &IfcConvertRequest<'_>) -> Vec<String> {
    let options = request.options;
    let mut args = vec![
        "convert".to_string(),
        path_arg(request.input),
        path_arg(request.tiles_dir),
        "--exchange-dir".into(),
        path_arg(request.exchange_dir),
        "--progress".into(),
        "jsonl".into(),
        "--threads".into(),
        request.threads.max(1).to_string(),
    ];
    match &options.georeference {
        IfcGeoreferenceOptions::Auto => args.extend(["--georef".into(), "auto".into()]),
        IfcGeoreferenceOptions::Local => args.extend(["--georef".into(), "local".into()]),
        IfcGeoreferenceOptions::Anchor {
            longitude_deg,
            latitude_deg,
            ellipsoid_height_m,
        } => args.extend([
            "--georef".into(),
            "anchor".into(),
            format!("--anchor-lon={longitude_deg}"),
            format!("--anchor-lat={latitude_deg}"),
            format!("--anchor-height={ellipsoid_height_m}"),
        ]),
        IfcGeoreferenceOptions::Crs { source_crs } => args.extend([
            "--georef".into(),
            "crs".into(),
            format!("--crs={}", source_crs.trim()),
        ]),
    }
    for name in &options.include_classes {
        args.push(format!("--include-class={name}"));
    }
    for name in &options.exclude_classes {
        args.push(format!("--exclude-class={name}"));
    }
    if !options.drop_empty_columns {
        args.push("--keep-empty-columns".into());
    }
    let tiling = &options.tiling;
    let mode = match tiling.mode {
        IfcTilingMode::Adaptive => "adaptive",
        IfcTilingMode::Single => "single",
    };
    args.extend([
        format!("--tiling={mode}"),
        format!("--max-features-per-tile={}", tiling.max_features_per_tile),
        format!("--max-triangles-per-tile={}", tiling.max_triangles_per_tile),
    ]);
    if !options.quantize_geometry {
        args.push("--no-quantize".into());
    }
    if options.write_global_id_index {
        args.push("--index".into());
    }
    args
}

fn handle_tool_line(
    emitter: &Emitter,
    progress: &ProgressThrottle,
    threads: u32,
    output: &Mutex<ToolOutput>,
    line: &str,
) {
    let event = serde_json::from_str::<Value>(line).ok().filter(|value| {
        value.get("geoforgeIfc").and_then(Value::as_u64) == Some(TOOL_PROTOCOL_VERSION)
    });
    let Some(event) = event else {
        if !line.trim().is_empty() {
            emitter.log(&format!("[ifc] {line}"));
        }
        return;
    };
    let text = |key: &str| {
        event
            .get(key)
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string()
    };
    match event
        .get("event")
        .and_then(Value::as_str)
        .unwrap_or_default()
    {
        "stage" => {
            progress.force_flush(Stage::Convert);
            emitter.stage(
                Stage::Convert,
                &format!("IFC {}: {}", text("stage"), text("message")),
            );
        }
        "progress" => {
            let completed = event.get("completed").and_then(Value::as_u64).unwrap_or(0);
            let total = event.get("total").and_then(Value::as_u64).unwrap_or(0);
            progress.report(Stage::Convert, completed, total, Some(threads), false);
        }
        "warning" => emitter.warning(&text("code"), &text("message")),
        "summary" => {
            if let Ok(mut output) = output.lock() {
                output.summary = event.get("summary").cloned();
            }
        }
        "error" => {
            if let Ok(mut output) = output.lock() {
                output.error = Some(text("message"));
            }
        }
        other => emitter.log(&format!("[ifc] unknown event {other}: {line}")),
    }
}

fn report_summary(emitter: &Emitter, summary: &Value) {
    let number = |pointer: &str| summary.pointer(pointer).cloned().unwrap_or(json!(0));
    emitter.metric("ifc.elements", number("/elements"));
    emitter.metric(
        "ifc.skipped.withoutGeometry",
        number("/skipped/withoutGeometry"),
    );
    emitter.metric(
        "ifc.skipped.excludedByClass",
        number("/skipped/excludedByClass"),
    );
    emitter.metric("ifc.columns", number("/columns/total"));
    emitter.metric("ifc.columns.empty", number("/columns/empty"));
    emitter.metric("ifc.triangles", number("/geometry/triangles"));
    emitter.metric("ifc.contentBytes", number("/geometry/contentBytes"));
    emitter.metric("ifc.tiles", number("/tiling/tiles"));
    emitter.metric("ifc.tileContents", number("/tiling/contents"));
    emitter.metric("ifc.tileDepth", number("/tiling/depth"));
    for (name, key) in [
        ("ifc.geometryReuse", "geometryReuse"),
        ("ifc.phases", "phases"),
    ] {
        emitter.metric(name, summary.get(key).cloned().unwrap_or(Value::Null));
    }
    emitter.metric(
        "ifc.georeference",
        summary.get("georeference").cloned().unwrap_or(Value::Null),
    );
    emitter.log(&format!(
        "[ifc] {} 个构件，{} 个三角形，{} 个属性列，跳过 {} 个无几何构件、{} 个被类过滤的构件",
        number("/elements"),
        number("/triangles"),
        number("/columns/total"),
        number("/skipped/withoutGeometry"),
        number("/skipped/excludedByClass"),
    ));
    let mode = summary.pointer("/tiling/mode").and_then(Value::as_str);
    emitter.log(&format!(
        "[ifc] 分块方式 {}：{} 个瓦片（{} 个有内容），深度 {}，单个瓦片最多 {} 个构件",
        mode.unwrap_or("-"),
        number("/tiling/tiles"),
        number("/tiling/contents"),
        number("/tiling/depth"),
        number("/tiling/maxFeaturesPerTile"),
    ));
}

/// The exchange package stays in the task's temporary directory, so the
/// report must not point users at it.
pub fn write_report(tiles_dir: &Path, summary: &Value) -> Result<(), String> {
    let mut report = summary.clone();
    if let Some(object) = report.as_object_mut() {
        object.remove("exchange");
        object.remove("tiles");
    }
    let bytes = serde_json::to_vec_pretty(&report).map_err(|error| error.to_string())?;
    std::fs::write(tiles_dir.join(REPORT_FILE), bytes)
        .map_err(|error| format!("cannot write {REPORT_FILE}: {error}"))
}

fn path_arg(path: &Path) -> String {
    let text = path.to_string_lossy();
    #[cfg(windows)]
    {
        if let Some(rest) = text.strip_prefix(r"\\?\UNC\") {
            return format!(r"\\{rest}");
        }
        if let Some(rest) = text.strip_prefix(r"\\?\") {
            return rest.to_string();
        }
    }
    text.into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn options(value: Value) -> IfcTaskOptions {
        serde_json::from_value(value).expect("valid ifc options")
    }

    fn args_for(options: &IfcTaskOptions) -> Vec<String> {
        build_tool_args(&IfcConvertRequest {
            input: Path::new("in.ifc"),
            tiles_dir: Path::new("staged"),
            exchange_dir: Path::new("exchange"),
            options,
            threads: 3,
        })
    }

    #[test]
    fn tool_args_start_with_the_convert_contract() {
        let args = args_for(&options(json!({ "version": 1 })));
        assert_eq!(
            args,
            [
                "convert",
                "in.ifc",
                "staged",
                "--exchange-dir",
                "exchange",
                "--progress",
                "jsonl",
                "--threads",
                "3",
                "--georef",
                "auto",
                "--tiling=adaptive",
                "--max-features-per-tile=2000",
                "--max-triangles-per-tile=250000",
            ]
        );
    }

    #[test]
    fn tool_args_carry_tiling_quantization_and_index() {
        let args = args_for(&options(json!({
            "version": 1,
            "tiling": { "mode": "single", "maxFeaturesPerTile": 300, "maxTrianglesPerTile": 5000 },
            "quantizeGeometry": false,
            "writeGlobalIdIndex": true
        })));
        assert!(args.ends_with(&[
            "--tiling=single".into(),
            "--max-features-per-tile=300".into(),
            "--max-triangles-per-tile=5000".into(),
            "--no-quantize".into(),
            "--index".into(),
        ]));
    }

    #[test]
    fn tool_args_carry_georeference_filters_and_empty_columns() {
        let anchor = args_for(&options(json!({
            "version": 1,
            "georeference": { "mode": "anchor", "longitudeDeg": -0.5, "latitudeDeg": 51.5, "ellipsoidHeightM": 12 },
            "includeClasses": ["IfcWall", "IfcSlab"],
            "excludeClasses": ["IfcWallStandardCase"],
            "dropEmptyColumns": false
        })));
        // `=` keeps argparse from reading a negative longitude as an option.
        for expected in [
            "anchor",
            "--anchor-lon=-0.5",
            "--anchor-lat=51.5",
            "--anchor-height=12",
            "--include-class=IfcWall",
            "--include-class=IfcSlab",
            "--exclude-class=IfcWallStandardCase",
            "--keep-empty-columns",
        ] {
            assert!(
                anchor.iter().any(|arg| arg == expected),
                "{expected} missing from {anchor:?}"
            );
        }

        let crs = args_for(&options(json!({
            "version": 1,
            "georeference": { "mode": "crs", "sourceCrs": " EPSG:2326 " }
        })));
        assert!(crs
            .windows(3)
            .any(|window| window == ["--georef", "crs", "--crs=EPSG:2326"]));
        let local = args_for(&options(
            json!({ "version": 1, "georeference": { "mode": "local" } }),
        ));
        assert!(local
            .windows(2)
            .any(|window| window == ["--georef", "local"]));
        assert!(!local.iter().any(|arg| arg == "--keep-empty-columns"));
    }

    #[test]
    fn tool_lines_fill_summary_and_error_and_ignore_foreign_json() {
        let emitter = Arc::new(Emitter::new("ifc-lines"));
        let progress = ProgressThrottle::new(Arc::clone(&emitter));
        let output = Mutex::new(ToolOutput::default());
        for line in [
            r#"{"geoforgeIfc": 1, "event": "progress", "stage": "tessellate", "completed": 2, "total": 4}"#,
            r#"{"geoforgeIfc": 2, "event": "summary", "summary": {"elements": 99}}"#,
            r#"{"event": "summary", "summary": {"elements": 98}}"#,
            "IfcOpenShell banner",
            r#"{"geoforgeIfc": 1, "event": "summary", "summary": {"elements": 7}}"#,
            r#"{"geoforgeIfc": 1, "event": "error", "message": "bad file"}"#,
        ] {
            handle_tool_line(&emitter, &progress, 1, &output, line);
        }
        let output = output.into_inner().unwrap();
        assert_eq!(output.summary, Some(json!({ "elements": 7 })));
        assert_eq!(output.error.as_deref(), Some("bad file"));
    }

    #[test]
    fn report_drops_temporary_paths() {
        let dir = std::env::temp_dir().join(format!("geoforge-ifc-report-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        write_report(
            &dir,
            &json!({ "elements": 3, "exchange": "/tmp/x", "tiles": "/tmp/y" }),
        )
        .unwrap();
        let report: Value =
            serde_json::from_slice(&std::fs::read(dir.join(REPORT_FILE)).unwrap()).unwrap();
        assert_eq!(report, json!({ "elements": 3 }));
        let _ = std::fs::remove_dir_all(dir);
    }
}
