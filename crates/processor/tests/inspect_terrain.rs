//! `inspect-terrain` through the processor binary. Same environment rules as
//! convert_terrain.rs: only the missing-runtime test runs without
//! GEOFORGE_TERRAIN_RUNTIME and GEOFORGE_TERRAIN_DATA.

use serde_json::Value;
use std::path::{Path, PathBuf};
use std::process::Command;

fn inspect(runtime: &Path, paths: &[PathBuf], extra: &[&str]) -> (i32, Value) {
    let mut command = Command::new(env!("CARGO_BIN_EXE_processor"));
    command.arg("inspect-terrain").env("GEOFORGE_TERRAIN_RUNTIME", runtime);
    for path in paths {
        command.arg("--path").arg(path);
    }
    let output = command.args(extra).output().expect("start processor");
    let result = serde_json::from_slice(&output.stdout).expect("one JSON document on stdout");
    (output.status.code().unwrap_or(-1), result)
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

#[test]
fn missing_runtime_is_reported_as_json() {
    let root = std::env::temp_dir().join(format!("geoforge-inspect-missing-{}", std::process::id()));
    let (code, result) = inspect(&root.join("no-runtime"), &[root.join("dem.tif")], &[]);
    assert_eq!(code, 1);
    assert_eq!(result["valid"], false);
    assert_eq!(result["errors"][0]["code"], "TERRAIN_RUNTIME_MISSING", "{result:#}");
}

#[test]
fn wgs84_source_is_described_and_planned() {
    let Some((runtime, data)) = real_env() else { return };
    let (code, result) = inspect(&runtime, &[data.join("D0.tif")], &[]);
    assert_eq!(code, 0, "{result:#}");
    let source = &result["sources"][0];
    assert_eq!(source["driver"], "GTiff");
    assert_eq!(source["dimensions"], serde_json::json!([2000, 2000]));
    assert_eq!(source["bandCount"], 1);
    assert_eq!(source["noData"]["declared"], -9999.0);
    assert_eq!(source["noData"]["sourceHoles"]["state"], "computed");
    assert!(source["bounds"]["wgs84"].is_array());
    let plan = &result["plan"];
    assert_eq!(plan["route"], "direct");
    assert_eq!(plan["verticalDatumStatus"], "confirmation-required");
    assert!(plan["recommendedMaxDepth"].as_u64().unwrap() > 10, "{plan:#}");
}

#[test]
fn projected_source_follows_projection_mode() {
    let Some((runtime, data)) = real_env() else { return };
    let (_, auto) = inspect(&runtime, &[data.join("D1.tif")], &[]);
    assert_eq!(auto["plan"]["route"], "normalize", "{auto:#}");
    assert_eq!(auto["plan"]["routeReason"], "auto-normalizes");
    assert!(auto["plan"]["crsLabel"].as_str().unwrap().contains("4547"), "{}", auto["plan"]["crsLabel"]);
    let (_, direct) = inspect(&runtime, &[data.join("D1.tif")], &["--projection-mode", "direct"]);
    assert_eq!(direct["plan"]["route"], "direct", "{direct:#}");
}

#[test]
fn source_holes_are_counted() {
    let Some((runtime, data)) = real_env() else { return };
    let (_, result) = inspect(&runtime, &[data.join("D2.tif")], &[]);
    assert!(result["sources"][0]["noData"]["sourceHoles"]["value"].as_u64().unwrap() > 0, "{result:#}");
    assert!(result["plan"]["sourceHoles"]["value"].as_u64().unwrap() > 0);
}

const NODATA_ONLY_AUX: &str = "<PAMDataset><PAMRasterBand band=\"1\"><NoDataValue>-9999</NoDataValue></PAMRasterBand></PAMDataset>";

fn gdal_translate(runtime: &Path, args: &[&str]) {
    let bin = runtime.join("bin");
    let status = Command::new(bin.join(format!("gdal_translate{}", std::env::consts::EXE_SUFFIX)))
        .args(args)
        .env("PATH", &bin)
        .env("GDAL_DATA", runtime.join("share/gdal"))
        .env("PROJ_DATA", runtime.join("share/proj"))
        .status()
        .expect("start gdal_translate");
    assert!(status.success(), "gdal_translate {args:?}");
}

/// The desktop form asks `inspect-terrain` first: NoData that only the
/// `.aux.xml` sidecar declares must show up there, holes counted.
#[test]
fn nodata_in_pam_sidecar_is_seen() {
    let Some((runtime, data)) = real_env() else { return };
    let dir = std::env::temp_dir().join(format!("geoforge-inspect-pam-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    let d2 = data.join("D2.tif");
    let bare = dir.join("D2-bare.tif");
    gdal_translate(&runtime, &["-q", "-a_nodata", "none", d2.to_str().unwrap(), bare.to_str().unwrap()]);
    let (_, result) = inspect(&runtime, &[bare.clone()], &[]);
    assert!(result["sources"][0]["noData"]["declared"].is_null(), "{result:#}");

    std::fs::write(dir.join("D2-bare.tif.aux.xml"), NODATA_ONLY_AUX).unwrap();
    let baseline = dir.join("D2-baseline.tif");
    gdal_translate(&runtime, &["-q", "-co", "PROFILE=BASELINE", d2.to_str().unwrap(), baseline.to_str().unwrap()]);
    let (code, result) = inspect(&runtime, &[bare.clone(), baseline.clone()], &[]);
    assert_eq!(code, 0, "{result:#}");
    for (index, path) in [bare, baseline].iter().enumerate() {
        let source = &result["sources"][index];
        assert_eq!(source["path"], serde_json::json!(path));
        assert!(!source["noData"]["declared"].is_null(), "{source:#}");
        assert_eq!(source["noData"]["sourceHoles"]["value"], 70108, "{source:#}");
    }
    assert_eq!(result["plan"]["sourceHoles"]["value"], 2 * 70108);
    let mut names: Vec<_> = std::fs::read_dir(&dir).unwrap().map(|e| e.unwrap().file_name().into_string().unwrap()).collect();
    names.sort();
    assert_eq!(names, ["D2-bare.tif", "D2-bare.tif.aux.xml", "D2-baseline.tif", "D2-baseline.tif.aux.xml"]);
    std::fs::remove_dir_all(&dir).unwrap();
}

#[test]
fn a_bad_source_is_named_and_the_others_still_described() {
    let Some((runtime, data)) = real_env() else { return };
    let missing = data.join("does-not-exist.tif");
    let (code, result) = inspect(&runtime, &[data.join("D0.tif"), missing], &[]);
    assert_eq!(code, 1);
    assert_eq!(result["valid"], false);
    assert_eq!(result["sources"][0]["driver"], "GTiff");
    assert_eq!(result["sources"][1]["error"]["code"], "PATH_INPUT_NOT_FOUND", "{result:#}");
    assert!(result["plan"].is_null());
}
