//! `convert-terrain` through the processor binary.
//!
//! The missing-runtime test always runs. The others need the packaged
//! terrain runtime and the P0 samples, so they only run when
//! GEOFORGE_TERRAIN_RUNTIME (runtime/terrain folder) and
//! GEOFORGE_TERRAIN_DATA (folder with D0.tif … M.tif) are set.

use serde_json::{json, Value};
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

struct Run {
    code: i32,
    events: Vec<Value>,
}

impl Run {
    fn error_code(&self) -> Option<&str> {
        self.events.iter().find(|e| e["type"] == "error").and_then(|e| e["code"].as_str())
    }

    fn error_message(&self) -> &str {
        self.events.iter().find(|e| e["type"] == "error").and_then(|e| e["message"].as_str()).unwrap_or("")
    }

    fn has_log(&self, needle: &str) -> bool {
        self.events.iter().any(|e| e["type"] == "log" && e["message"].as_str().is_some_and(|m| m.contains(needle)))
    }

    fn has_warning(&self, code: &str) -> bool {
        self.events.iter().any(|e| e["type"] == "warning" && e["code"] == code)
    }
}

fn scratch(name: &str) -> PathBuf {
    let root = std::env::temp_dir().join(format!("geoforge-terrain-{name}-{}", std::process::id()));
    let _ = fs::remove_dir_all(&root);
    fs::create_dir_all(&root).unwrap();
    root
}

fn task(root: &Path, task_id: &str, sources: &[PathBuf], output: &Path, terrain: Value, execution: Value) -> PathBuf {
    let mut terrain_options = json!({
        "version": 1,
        "sources": sources,
        "verticalDatum": { "mode": "unknown", "acknowledged": true }
    });
    for (key, value) in terrain.as_object().unwrap() {
        terrain_options[key] = value.clone();
    }
    let path = root.join(format!("{task_id}.json"));
    fs::write(
        &path,
        json!({
            "schemaVersion": 1,
            "taskId": task_id,
            "operation": "convert-terrain",
            "input": { "path": sources[0] },
            "output": { "path": output },
            "options": { "terrain": terrain_options, "execution": execution }
        })
        .to_string(),
    )
    .unwrap();
    path
}

/// Run the processor; `cancel_when` sends "cancel" on stdin once a log or
/// stage message contains that text.
fn run(task: &Path, runtime: &Path, cancel_when: Option<&str>) -> Run {
    let mut child = Command::new(env!("CARGO_BIN_EXE_processor"))
        .args(["run".as_ref(), "--task".as_ref(), task.as_os_str()])
        .env("GEOFORGE_TERRAIN_RUNTIME", runtime)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .expect("start processor");
    let mut stdin = child.stdin.take();
    let mut events = Vec::new();
    for line in BufReader::new(child.stdout.take().unwrap()).lines() {
        let event: Value = serde_json::from_str(&line.unwrap()).expect("JSONL event");
        if let (Some(needle), Some(message)) = (cancel_when, event["message"].as_str()) {
            if message.contains(needle) {
                // Give CTB time to write some tiles before cancelling.
                std::thread::sleep(std::time::Duration::from_millis(500));
                if let Some(mut pipe) = stdin.take() {
                    let _ = pipe.write_all(b"cancel\n");
                }
            }
        }
        events.push(event);
    }
    let code = child.wait().unwrap().code().unwrap_or(-1);
    Run { code, events }
}

fn real_env() -> Option<(PathBuf, PathBuf)> {
    match (std::env::var_os("GEOFORGE_TERRAIN_RUNTIME"), std::env::var_os("GEOFORGE_TERRAIN_DATA")) {
        (Some(runtime), Some(data)) => Some((runtime.into(), data.into())),
        _ => {
            eprintln!("skipped: set GEOFORGE_TERRAIN_RUNTIME and GEOFORGE_TERRAIN_DATA");
            None
        }
    }
}

fn report(output: &Path) -> Value {
    serde_json::from_str(&fs::read_to_string(output.join("geoforge-terrain.json")).unwrap()).unwrap()
}

fn no_leftovers(root: &Path) -> bool {
    fs::read_dir(root).unwrap().all(|entry| !entry.unwrap().file_name().to_string_lossy().starts_with(".geoforge-task-"))
}

#[test]
fn missing_runtime_fails_before_touching_anything() {
    let root = scratch("missing-runtime");
    let source = root.join("dem.tif");
    fs::write(&source, b"not used").unwrap();
    let output = root.join("out");
    let task = task(&root, "terrain-missing", &[source], &output, json!({}), json!({}));
    let result = run(&task, &root.join("no-runtime"), None);
    assert_eq!(result.code, 1);
    assert_eq!(result.error_code(), Some("TERRAIN_RUNTIME_MISSING"), "{:#?}", result.events);
    assert!(!output.exists());
    assert!(no_leftovers(&root));
}

#[test]
fn d0_wgs84_tiles_validates_and_reports() {
    let Some((runtime, data)) = real_env() else { return };
    let root = scratch("d0");
    let output = root.join("D0");
    let task = task(&root, "terrain-d0", &[data.join("D0.tif")], &output, json!({}), json!({}));
    let result = run(&task, &runtime, None);
    assert_eq!(result.code, 0, "{:#?}", result.events);
    let layer: Value = serde_json::from_str(&fs::read_to_string(output.join("layer.json")).unwrap()).unwrap();
    assert_eq!(layer["scheme"], "tms");
    assert!(layer.get("schema").is_none());
    let report = report(&output);
    assert_eq!(report["noData"]["remainingNoDataCount"], 0);
    assert_eq!(report["verticalDatum"]["converted"], false);
    let min = report["validation"]["minHeightInsideM"].as_f64().unwrap();
    assert!(min > 250.0, "D0 heights start near 275 m, got {min}");
    assert!(report["validation"]["sampleCount"].as_u64().unwrap() > 100);
    assert!(no_leftovers(&root));

    // A second run must not overwrite the committed output.
    let again = run(&task, &runtime, None);
    assert_eq!(again.error_code(), Some("PATH_OUTPUT_EXISTS"));
}

#[test]
fn d1_projected_input_is_warped_and_frame_needs_a_decision() {
    let Some((runtime, data)) = real_env() else { return };
    let root = scratch("d1");
    let output = root.join("D1");
    let source = data.join("D1.tif");
    let blocked = run(&task(&root, "terrain-d1a", &[source.clone()], &output, json!({}), json!({})), &runtime, None);
    assert_eq!(blocked.error_code(), Some("TERRAIN_NODATA_POLICY_REQUIRED"), "{:#?}", blocked.events);
    assert!(blocked.error_message().contains("重投影"));
    assert!(!output.exists());

    let filled = json!({ "noData": { "mode": "explicit-constant", "valueMeters": 400.0 } });
    let result = run(&task(&root, "terrain-d1b", &[source], &output, filled, json!({})), &runtime, None);
    assert_eq!(result.code, 0, "{:#?}", result.events);
    let report = report(&output);
    assert_eq!(report["crs"]["sourceEpsg"], 4547);
    assert_eq!(report["crs"]["warpedTo"], "EPSG:4326");
    assert_eq!(report["noData"]["sourceNoDataCount"], 0);
    assert!(report["noData"]["filledCount"].as_u64().unwrap() > 0);
    // Heights must survive the reprojection: D1 lies between 100 and 693 m.
    let min = report["validation"]["minHeightInsideM"].as_f64().unwrap();
    assert!(min > 90.0, "got {min}");
}

#[test]
fn d2_nodata_is_never_zero_filled_silently() {
    let Some((runtime, data)) = real_env() else { return };
    let root = scratch("d2");
    let output = root.join("D2");
    let source = data.join("D2.tif");

    let blocked = run(&task(&root, "terrain-d2a", &[source.clone()], &output, json!({}), json!({})), &runtime, None);
    assert_eq!(blocked.error_code(), Some("TERRAIN_NODATA_POLICY_REQUIRED"));
    let none = json!({ "noData": { "mode": "none-required" } });
    let blocked = run(&task(&root, "terrain-d2b", &[source.clone()], &output, none, json!({})), &runtime, None);
    assert_eq!(blocked.error_code(), Some("TERRAIN_NODATA_POLICY_REQUIRED"));
    // The missing north strip is far from valid data; a small search radius must refuse.
    let small = json!({ "noData": { "mode": "interpolate", "maxSearchPixels": 3 } });
    let blocked = run(&task(&root, "terrain-d2c", &[source.clone()], &output, small, json!({})), &runtime, None);
    assert_eq!(blocked.error_code(), Some("TERRAIN_NODATA_FILL_FAILED"), "{:#?}", blocked.events);
    assert!(!output.exists());
    assert!(no_leftovers(&root));

    let constant = json!({ "noData": { "mode": "explicit-constant", "valueMeters": 150.0 } });
    let result = run(&task(&root, "terrain-d2d", &[source], &output, constant, json!({})), &runtime, None);
    assert_eq!(result.code, 0, "{:#?}", result.events);
    let report = report(&output);
    assert_eq!(report["noData"]["policy"], "explicit-constant");
    assert!(report["noData"]["filledCount"].as_u64().unwrap() > 0);
    // Negative basin heights are kept; nothing became 0 m by accident.
    let min = report["validation"]["minHeightInsideM"].as_f64().unwrap();
    assert!(min < -50.0, "basin should stay negative, got {min}");
}

#[test]
fn d3_adjacent_sources_are_combined() {
    let Some((runtime, data)) = real_env() else { return };
    let root = scratch("d3");
    let output = root.join("D3");
    let sources = [data.join("D3_a.tif"), data.join("D3_b.tif")];
    let result = run(&task(&root, "terrain-d3", &sources, &output, json!({}), json!({})), &runtime, None);
    assert_eq!(result.code, 0, "{:#?}", result.events);
    let report = report(&output);
    assert_eq!(report["sources"].as_array().unwrap().len(), 2);
    assert!(report["overlaps"].as_array().unwrap().is_empty());
    assert!(report["validation"]["edgePairs"].as_u64().unwrap() > 0);
}

/// Cancel during CTB, resume with -R, and compare with an uninterrupted run.
/// A changed parameter must not resume.
#[test]
fn m_cancel_resume_matches_full_run_and_changed_options_restart() {
    let Some((runtime, data)) = real_env() else { return };
    let root = scratch("m");
    let source = data.join("M.tif");
    let execution = json!({ "resumePolicy": "resume" });
    let options = json!({ "tiling": { "maxDepth": 15 } });

    let full = root.join("full");
    let reference = run(&task(&root, "terrain-m-full", &[source.clone()], &full, options.clone(), json!({})), &runtime, None);
    assert_eq!(reference.code, 0, "{:#?}", reference.events);

    let resumed_out = root.join("resumed");
    let task_path = task(&root, "terrain-m", &[source.clone()], &resumed_out, options.clone(), execution.clone());
    let cancelled = run(&task_path, &runtime, Some("Tiling to level"));
    assert_eq!(cancelled.code, 2, "{:#?}", cancelled.events);
    assert_eq!(cancelled.error_code(), Some("CANCELLED"));
    assert!(!resumed_out.exists());
    assert!(root.join(".geoforge-task-terrain-m").is_dir(), "resume policy keeps the work folder");

    let finished = run(&task_path, &runtime, None);
    assert_eq!(finished.code, 0, "{:#?}", finished.events);
    assert!(finished.has_log("resuming with ctb-tile -R"));
    let tiles = |dir: &Path| -> Vec<(String, Vec<u8>)> {
        let mut out = Vec::new();
        let mut stack = vec![dir.to_path_buf()];
        while let Some(current) = stack.pop() {
            for entry in fs::read_dir(&current).unwrap() {
                let path = entry.unwrap().path();
                if path.is_dir() {
                    stack.push(path);
                } else if path.extension().is_some_and(|e| e == "terrain") {
                    out.push((path.strip_prefix(dir).unwrap().to_string_lossy().into_owned(), fs::read(&path).unwrap()));
                }
            }
        }
        out.sort();
        out
    };
    let (a, b) = (tiles(&full), tiles(&resumed_out));
    assert_eq!(a.len(), b.len());
    assert!(a == b, "resumed tiles differ from the uninterrupted run");

    // Same task id, different mesh quality: the old work folder must not be reused.
    let changed_out = root.join("changed");
    let changed_options = json!({ "tiling": { "maxDepth": 15, "meshQuality": "high" } });
    let changed_task = task(&root, "terrain-m2", &[source.clone()], &changed_out, options, execution.clone());
    let cancelled = run(&changed_task, &runtime, Some("Tiling to level"));
    assert_eq!(cancelled.code, 2);
    let changed_task = task(&root, "terrain-m2", &[source], &changed_out, changed_options, execution);
    let restarted = run(&changed_task, &runtime, None);
    assert_eq!(restarted.code, 0, "{:#?}", restarted.events);
    assert!(restarted.has_warning("TERRAIN_RESUME_RESET"));
    assert!(!restarted.has_log("resuming with ctb-tile -R"));
}
