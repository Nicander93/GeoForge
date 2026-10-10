//! Real `convert-ifc` run through tools/ifc. Needs a Python with
//! tools/ifc/requirements.txt, so it only runs when GEOFORGE_IFC_PYTHON is set.

use serde_json::{json, Value};
use std::fs;
use std::path::Path;
use std::process::Command;

#[test]
fn converts_the_fixture_into_a_committed_tileset() {
    let Some(python) = std::env::var_os("GEOFORGE_IFC_PYTHON") else {
        eprintln!("skipped: set GEOFORGE_IFC_PYTHON to run the real IFC conversion");
        return;
    };
    let repo = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let root = std::env::temp_dir().join(format!("geoforge-convert-ifc-{}", std::process::id()));
    let _ = fs::remove_dir_all(&root);
    fs::create_dir_all(root.join("model")).unwrap();
    fs::create_dir_all(root.join("out")).unwrap();
    let input = root.join("model").join("fixture.ifc");
    let status = Command::new(&python)
        .arg(repo.join("tools/ifc/cli.py"))
        .args(["fixture".as_ref(), input.as_os_str()])
        .status()
        .expect("run fixture generator");
    assert!(status.success());

    let output = root.join("out").join("fixture_tiles");
    let task = root.join("task.json");
    fs::write(
        &task,
        json!({
            "schemaVersion": 1,
            "taskId": "ifc-real",
            "operation": "convert-ifc",
            "input": { "path": input },
            "output": { "path": output },
            "options": { "version": 1, "excludeClasses": ["IfcWindow"] }
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
    let metric = |name: &str| {
        events
            .iter()
            .find(|event| event["type"] == "metric" && event["name"] == name)
            .map(|event| event["value"].clone())
    };
    assert_eq!(metric("ifc.elements"), Some(json!(6)));
    assert_eq!(metric("ifc.skipped.excludedByClass"), Some(json!(1)));
    assert!(events
        .iter()
        .any(|event| event["type"] == "progress" && event["stage"] == "convert"));

    let tileset: Value =
        serde_json::from_slice(&fs::read(output.join("tileset.json")).unwrap()).unwrap();
    assert_eq!(tileset["asset"]["version"], "1.1");
    assert!(output.join("content.glb").is_file());
    let report: Value =
        serde_json::from_slice(&fs::read(output.join("ifc-report.json")).unwrap()).unwrap();
    assert_eq!(report["classes"], json!({ "IfcWall": 4, "IfcSlab": 2 }));
    assert!(report.get("exchange").is_none());
    let _ = fs::remove_dir_all(root);
}
