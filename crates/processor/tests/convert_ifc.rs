//! Real `convert-ifc` runs through tools/ifc. Needs a Python with
//! tools/ifc/requirements.txt, so they only run when GEOFORGE_IFC_PYTHON is set.

use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

struct Run {
    root: PathBuf,
    output: PathBuf,
    events: Vec<Value>,
}

impl Run {
    fn metric(&self, name: &str) -> Option<Value> {
        self.events
            .iter()
            .find(|event| event["type"] == "metric" && event["name"] == name)
            .map(|event| event["value"].clone())
    }
}

/// Generate an input with a tools/ifc command (`generator[0]` is fixture or
/// synthetic, the rest its options), then run the processor on it. None when
/// GEOFORGE_IFC_PYTHON is not set.
fn convert(name: &str, generator: &[&str], options: Value) -> Option<Run> {
    let Some(python) = std::env::var_os("GEOFORGE_IFC_PYTHON") else {
        eprintln!("skipped: set GEOFORGE_IFC_PYTHON to run the real IFC conversion");
        return None;
    };
    let repo = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let root = std::env::temp_dir().join(format!(
        "geoforge-convert-ifc-{name}-{}",
        std::process::id()
    ));
    let _ = fs::remove_dir_all(&root);
    fs::create_dir_all(root.join("model")).unwrap();
    fs::create_dir_all(root.join("out")).unwrap();
    let input = root.join("model").join(format!("{name}.ifc"));
    let status = Command::new(&python)
        .arg(repo.join("tools/ifc/cli.py"))
        .arg(generator[0])
        .arg(&input)
        .args(&generator[1..])
        .status()
        .expect("run IFC generator");
    assert!(status.success());

    let output = root.join("out").join(format!("{name}_tiles"));
    let task = root.join("task.json");
    fs::write(
        &task,
        json!({
            "schemaVersion": 1,
            "taskId": format!("ifc-{name}"),
            "operation": "convert-ifc",
            "input": { "path": input },
            "output": { "path": output },
            "options": options
        })
        .to_string(),
    )
    .unwrap();
    let run = Command::new(env!("CARGO_BIN_EXE_processor"))
        .args(["run".as_ref(), "--task".as_ref(), task.as_os_str()])
        .env("GEOFORGE_IFC_PYTHON", &python)
        .output()
        .expect("run processor");
    let events: Vec<Value> = String::from_utf8_lossy(&run.stdout)
        .lines()
        .map(|line| serde_json::from_str(line).expect("JSONL event"))
        .collect();
    assert!(run.status.success(), "{events:#?}");
    Some(Run {
        root,
        output,
        events,
    })
}

#[test]
fn converts_the_fixture_into_a_committed_tileset() {
    let Some(run) = convert(
        "fixture",
        &["fixture"],
        json!({ "version": 1, "excludeClasses": ["IfcWindow"] }),
    ) else {
        return;
    };
    assert_eq!(run.metric("ifc.elements"), Some(json!(6)));
    assert_eq!(run.metric("ifc.skipped.excludedByClass"), Some(json!(1)));
    assert_eq!(run.metric("ifc.tileContents"), Some(json!(1)));
    assert!(run
        .events
        .iter()
        .any(|event| event["type"] == "progress" && event["stage"] == "convert"));

    let tileset: Value =
        serde_json::from_slice(&fs::read(run.output.join("tileset.json")).unwrap()).unwrap();
    assert_eq!(tileset["asset"]["version"], "1.1");
    assert!(run.output.join("content.glb").is_file());
    let report: Value =
        serde_json::from_slice(&fs::read(run.output.join("ifc-report.json")).unwrap()).unwrap();
    assert_eq!(report["classes"], json!({ "IfcWall": 4, "IfcSlab": 2 }));
    assert!(report.get("exchange").is_none());
    let _ = fs::remove_dir_all(&run.root);
}

#[test]
fn splits_a_synthetic_building_into_validated_tiles() {
    let Some(run) = convert(
        "synthetic",
        &["synthetic", "--elements", "600", "--storeys", "2"],
        json!({
            "version": 1,
            "tiling": { "maxFeaturesPerTile": 100 },
            "writeGlobalIdIndex": true
        }),
    ) else {
        return;
    };
    let count = |name: &str| run.metric(name).and_then(|value| value.as_u64()).unwrap();
    let contents = count("ifc.tileContents");
    assert!(contents > 3, "{contents} tiles with content");
    let glbs = fs::read_dir(run.output.join("tiles")).unwrap().count() as u64;
    assert_eq!(glbs, contents);
    let index: Value =
        serde_json::from_slice(&fs::read(run.output.join("index.json")).unwrap()).unwrap();
    let indexed = index["elements"].as_object().unwrap().len() as u64;
    assert_eq!(indexed, count("ifc.elements"));
    let tileset: Value =
        serde_json::from_slice(&fs::read(run.output.join("tileset.json")).unwrap()).unwrap();
    assert_eq!(tileset["root"]["refine"], "ADD");
    let children = tileset["root"]["children"].as_array();
    assert!(children.is_some_and(|children| !children.is_empty()));
    let _ = fs::remove_dir_all(&run.root);
}
