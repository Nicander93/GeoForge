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
        "version": 2,
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

/// Run one of the runtime's GDAL tools with the runtime's own data folders.
fn gdal(runtime: &Path, tool: &str, args: &[&str]) {
    let bin = runtime.join("bin");
    let status = Command::new(bin.join(format!("{tool}{}", std::env::consts::EXE_SUFFIX)))
        .args(args)
        .env("PATH", &bin)
        .env("GDAL_DATA", runtime.join("share/gdal"))
        .env("PROJ_DATA", runtime.join("share/proj"))
        .env("PROJ_NETWORK", "OFF")
        .stdout(Stdio::null())
        .status()
        .expect("start gdal tool");
    assert!(status.success(), "{tool} {args:?}");
}

/// Copy of `source` with a different CRS and extent but the same pixels:
/// a NoData-free DEM in any CRS without reprojecting (and so without a frame).
fn relabel(runtime: &Path, source: &Path, out: &Path, srs: &str, ullr: [f64; 4]) {
    let ullr: Vec<String> = ullr.iter().map(|v| v.to_string()).collect();
    let mut args = vec!["-q", "-a_srs", srs, "-a_ullr"];
    args.extend(ullr.iter().map(String::as_str));
    args.extend([source.to_str().unwrap(), out.to_str().unwrap()]);
    gdal(runtime, "gdal_translate", &args);
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
    // CTB used to sample half a cell north-west of each vertex (0.29 m on D0).
    let clean = &report["validation"]["sampleBreakdown"]["clean"];
    assert!(clean["rmseM"].as_f64().unwrap() < 0.1, "{clean}");
    assert!(no_leftovers(&root));

    // A second run must not overwrite the committed output.
    let again = run(&task, &runtime, None);
    assert_eq!(again.error_code(), Some("PATH_OUTPUT_EXISTS"));
}

/// Deepest-level tiles whose whole rectangle lies at least `margin` degrees
/// inside `bounds`, decoded.
fn inner_tiles(output: &Path, level: u32, bounds: [f64; 4], margin: f64) -> Vec<((u32, u32), processor::stages::terrain::quantized_mesh::QuantizedMeshTile)> {
    let size = 180.0 / f64::from(1u32 << level);
    let mut tiles = Vec::new();
    for column in fs::read_dir(output.join(level.to_string())).unwrap() {
        let column = column.unwrap();
        let x: u32 = column.file_name().to_string_lossy().parse().unwrap();
        for file in fs::read_dir(column.path()).unwrap() {
            let path = file.unwrap().path();
            let y: u32 = path.file_stem().unwrap().to_string_lossy().parse().unwrap();
            let (west, south) = (-180.0 + f64::from(x) * size, -90.0 + f64::from(y) * size);
            if west >= bounds[0] + margin && south >= bounds[1] + margin && west + size <= bounds[2] - margin && south + size <= bounds[3] - margin {
                let tile = processor::stages::terrain::quantized_mesh::decode(&fs::read(&path).unwrap()).unwrap();
                tiles.push(((x, y), tile));
            }
        }
    }
    tiles.sort_by_key(|(key, _)| *key);
    tiles
}

#[test]
fn edge_apron_keeps_data_heights_and_does_not_deepen_edge_droop() {
    let Some((runtime, data)) = real_env() else { return };
    let root = scratch("apron");
    let with = root.join("with");
    let without = root.join("without");
    let d1 = data.join("D1.tif");
    let result = run(&task(&root, "terrain-apron", &[d1.clone()], &with, json!({}), json!({})), &runtime, None);
    assert_eq!(result.code, 0, "{:#?}", result.events);
    let off = json!({ "preprocess": { "edgeApron": "off" } });
    let result = run(&task(&root, "terrain-noapron", &[d1], &without, off, json!({})), &runtime, None);
    assert_eq!(result.code, 0, "{:#?}", result.events);
    let (a, b) = (report(&with), report(&without));

    // The synthetic band is labelled and the data pixels are proven unchanged.
    assert_eq!(a["apron"]["enabled"], true);
    assert_eq!(a["apron"]["innerMismatchCount"], 0);
    assert!(a["apron"]["syntheticPixelCount"].as_u64().unwrap() > 0);
    assert!(a["apron"]["note"].as_str().unwrap().contains("不是真实地形"));
    assert_eq!(b["apron"]["enabled"], false);
    assert_eq!(a["heights"], b["heights"]);
    assert_eq!(a["dataBounds"], b["dataBounds"]);
    // Tiles against the source DEM: as accurate as without the apron.
    let rmse = |r: &Value| r["validation"]["sampleRmseM"].as_f64().unwrap();
    assert!(rmse(&a) <= rmse(&b) + 0.005, "{} vs {}", rmse(&a), rmse(&b));

    // Deepest-level tiles inside the data. Every vertex height is a sample of
    // the same, unchanged DEM. CTB copies the vertex choice along each border
    // from the neighbouring tile (crack prevention), so the first ring of
    // tiles next to the edge may pick other DEM samples; everything further in
    // is bit-for-bit the same.
    let level = a["tiling"]["maxDepth"].as_u64().unwrap() as u32;
    let bounds: Vec<f64> = a["dataBounds"].as_array().unwrap().iter().map(|v| v.as_f64().unwrap()).collect();
    let bounds = [bounds[0], bounds[1], bounds[2], bounds[3]];
    let margin = 2.0 * a["tiling"]["sourcePixelLatitudeDegrees"].as_f64().unwrap();
    let (inner_a, inner_b) = (inner_tiles(&with, level, bounds, margin), inner_tiles(&without, level, bounds, margin));
    assert!(inner_a.len() > 100, "{}", inner_a.len());
    assert_eq!(inner_a.len(), inner_b.len());
    let keys: std::collections::HashSet<(u32, u32)> = inner_a.iter().map(|(key, _)| *key).collect();
    let mut changed = 0;
    for ((key_a, ta), (key_b, tb)) in inner_a.iter().zip(&inner_b) {
        assert_eq!(key_a, key_b);
        if ta.u == tb.u && ta.v == tb.v && ta.h == tb.h && ta.min_height == tb.min_height {
            continue;
        }
        changed += 1;
        let (x, y) = *key_a;
        let ring = [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)].iter().any(|key| !keys.contains(key));
        assert!(ring, "tile {key_a:?} away from the edge changed");
        let step = |t: &processor::stages::terrain::quantized_mesh::QuantizedMeshTile| f64::from(t.max_height - t.min_height) / 32767.0;
        let heights: std::collections::HashMap<(u16, u16), f64> = (0..tb.u.len()).map(|i| ((tb.u[i], tb.v[i]), tb.height(i))).collect();
        for i in 0..ta.u.len() {
            if let Some(other) = heights.get(&(ta.u[i], ta.v[i])) {
                assert!((ta.height(i) - other).abs() <= step(ta) + step(tb) + 1e-6, "tile {key_a:?}: same DEM sample, different height");
            }
        }
    }
    assert!(changed * 5 < inner_a.len(), "{changed} of {} inner tiles changed", inner_a.len());

    // Coarse-level edge droop: never more sunken vertices than without the apron.
    let sunken = |r: &Value| -> std::collections::BTreeMap<u64, u64> {
        r["validation"]["edgeSunkenByLevel"].as_array().unwrap().iter().map(|l| (l["level"].as_u64().unwrap(), l["sunken"].as_u64().unwrap())).collect()
    };
    let (sa, sb) = (sunken(&a), sunken(&b));
    for (level, count) in &sa {
        assert!(*count <= sb.get(level).copied().unwrap_or(0), "level {level}: {count} sunken with apron, {:?} without", sb.get(level));
    }
    assert!(no_leftovers(&root));
}

const ACCEPT_BALLPARK: &str = "acceptBallparkTransform";

fn timed(task: &Path, runtime: &Path) -> (Run, f64) {
    let start = std::time::Instant::now();
    let result = run(task, runtime, None);
    (result, start.elapsed().as_secs_f64())
}

/// D1 is CGCS2000 / 3-degree GK CM 114E. It converts to WGS 84 through
/// GeoForge's explicit CGCS2000 operation (no ballpark acceptance); auto
/// lets CTB read it directly. Normalize warps onto a rectangle; the frame
/// around the data is outside the source footprint, needs no NoData policy
/// and gets auxiliary heights.
#[test]
fn d1_projected_input_routes_and_comparison() {
    let Some((runtime, data)) = real_env() else { return };
    let root = scratch("d1");
    let source = data.join("D1.tif");

    let direct_out = root.join("direct");
    let direct = json!({ "preprocess": { "projectionMode": "direct" }, "tiling": { "maxDepth": 15 } });
    let (result, direct_secs) = timed(&task(&root, "terrain-d1b", &[source.clone()], &direct_out, direct, json!({})), &runtime);
    assert_eq!(result.code, 0, "{:#?}", result.events);
    assert!(!result.has_warning("TERRAIN_TRANSFORM_BALLPARK"));
    let direct = report(&direct_out);
    assert_eq!(direct["route"]["effective"], "direct");
    assert_eq!(direct["crs"]["authority"], "EPSG:4547");
    assert_eq!(direct["crs"]["transform"]["ballpark"], false);
    assert_eq!(direct["crs"]["transform"]["accuracyM"], 1.0);
    assert_eq!(direct["crs"]["transform"]["datumShift"]["name"], "cgcs2000-null-geocentric-translation");
    assert_eq!(direct["crs"]["warpedTo"], Value::Null);
    assert_eq!(direct["noData"]["filledCount"], 0);
    assert_eq!(direct["tiling"]["suggestedMaxDepth"], 15);
    let min = direct["validation"]["minHeightInsideM"].as_f64().unwrap();
    assert!(min > 90.0, "D1 lies between 100 and 693 m, got {min}");

    let normalized_out = root.join("normalized");
    // No projectionMode: auto, which normalizes.
    let normalize = json!({ "tiling": { "maxDepth": 15 } });
    let (result, normalize_secs) = timed(&task(&root, "terrain-d1d", &[source], &normalized_out, normalize, json!({})), &runtime);
    assert_eq!(result.code, 0, "{:#?}", result.events);
    let normalized = report(&normalized_out);
    assert_eq!(normalized["route"]["effective"], "normalize");
    assert_eq!(normalized["route"]["reason"], "auto-normalizes");
    assert_eq!(normalized["crs"]["warpedTo"], "EPSG:4326");
    assert_eq!(normalized["noData"]["sourceNoDataCount"], 0);
    assert_eq!(normalized["noData"]["sourceHoleCount"], 0);
    assert_eq!(normalized["noData"]["filledHoleCount"], 0);
    assert!(normalized["noData"]["outsideFootprintCount"].as_u64().unwrap() > 0);
    assert_eq!(normalized["noData"]["auxiliaryCount"], normalized["noData"]["outsideFootprintCount"]);
    assert_eq!(normalized["noData"]["auxiliaryMethod"], "idw-extension");
    assert_eq!(normalized["noData"]["remainingNoDataCount"], 0);
    // Auxiliary heights extend D1 outward; none may sink to 0 m.
    let min = normalized["validation"]["minHeightInsideM"].as_f64().unwrap();
    assert!(min > 90.0, "D1 lies between 100 and 693 m, got {min}");
    assert!(normalized["heights"]["min"].as_f64().unwrap() > 50.0, "{}", normalized["heights"]);

    // Both are measured against the original D1 in EPSG:4547.
    let summary = |name: &str, report: &Value, secs: f64, out: &Path| {
        json!({
            "route": name, "seconds": secs, "bytes": dir_bytes(out),
            "tiles": report["validation"]["tiles"], "samples": report["validation"]["sampleCount"],
            "rmseM": report["validation"]["sampleRmseM"], "p95M": report["validation"]["sampleP95M"],
            "maxAbsM": report["validation"]["sampleMaxAbsM"], "maxEdgeGapM": report["validation"]["maxEdgeGapM"],
            "edgeBandVertices": report["validation"]["verticesEdgeBand"], "bounds": report["dataBounds"],
        })
    };
    println!(
        "D1-COMPARISON {}",
        json!([summary("direct", &direct, direct_secs, &direct_out), summary("normalize", &normalized, normalize_secs, &normalized_out)])
    );
    let rmse = |report: &Value| report["validation"]["sampleRmseM"].as_f64().unwrap();
    assert!(rmse(&direct) <= rmse(&normalized) * 1.25 + 0.05, "direct {} vs normalize {}", rmse(&direct), rmse(&normalized));
}

fn dir_bytes(dir: &Path) -> u64 {
    let mut total = 0;
    let mut stack = vec![dir.to_path_buf()];
    while let Some(current) = stack.pop() {
        for entry in fs::read_dir(&current).unwrap() {
            let entry = entry.unwrap();
            if entry.file_type().unwrap().is_dir() {
                stack.push(entry.path());
            } else {
                total += entry.metadata().unwrap().len();
            }
        }
    }
    total
}

/// Representative CRSs on relabelled copies of D0/D1 (same pixels, new
/// CRS and extent, so there is no NoData). Each must tile, take the expected
/// route and match the source within the D1-measured error.
#[test]
fn crs_matrix_tiles_with_expected_routes() {
    let Some((runtime, data)) = real_env() else { return };
    let root = scratch("crs-matrix");
    let d0 = data.join("D0.tif");
    let d1 = data.join("D1.tif");
    // (name, base, srs, ullr, ballpark, expected route)
    let gk = [490000.0, 3390000.0, 510000.0, 3370000.0];
    let cases: &[(&str, &Path, &str, [f64; 4], bool, &str)] = &[
        ("cgcs2000-geographic", &d0, "EPSG:4490", [113.9, 30.6, 114.1, 30.4], false, "normalize"),
        ("cgcs2000-3deg-cm120", &d1, "EPSG:4549", gk, false, "direct"),
        ("cgcs2000-6deg-zone20", &d1, "EPSG:4498", [20490000.0, 3390000.0, 20510000.0, 3370000.0], false, "direct"),
        ("cgcs2000-3deg-cm135", &d1, "EPSG:4554", gk, false, "direct"),
        ("web-mercator", &d1, "EPSG:3857", [12690000.0, 3580000.0, 12710000.0, 3560000.0], false, "normalize"),
        ("utm-50n", &d1, "EPSG:32650", gk, false, "direct"),
        ("utm-50s", &d1, "EPSG:32750", [490000.0, 6630000.0, 510000.0, 6610000.0], false, "direct"),
        ("beijing54-cm117", &d1, "EPSG:2436", gk, true, "direct"),
        ("xian80-cm114", &d1, "EPSG:2383", gk, true, "direct"),
    ];
    // Sources live apart from the outputs (an output inside a source folder is refused).
    let sources = root.join("src");
    fs::create_dir_all(&sources).unwrap();
    let mut rows = Vec::new();
    for (name, base, srs, ullr, ballpark, expected) in cases {
        let source = sources.join(format!("{name}.tif"));
        relabel(&runtime, base, &source, srs, *ullr);
        let output = root.join(format!("out-{name}"));
        // Explicit direct: the matrix checks which CRSs CTB may read itself.
        let options = json!({
            "preprocess": { "projectionMode": "direct", ACCEPT_BALLPARK: *ballpark },
            "tiling": { "maxDepth": 13 },
            "noData": { "mode": "explicit-constant", "valueMeters": 300.0 }
        });
        let (result, secs) = timed(&task(&root, &format!("terrain-{name}"), &[source], &output, options, json!({})), &runtime);
        assert_eq!(result.code, 0, "{name}: {:#?}", result.events);
        let report = report(&output);
        assert_eq!(report["route"]["effective"], *expected, "{name}: {}", report["route"]);
        assert_eq!(report["crs"]["authority"], *srs, "{name}");
        assert_eq!(report["crs"]["transform"]["ballpark"], *ballpark, "{name}");
        let cgcs2000 = name.starts_with("cgcs2000");
        assert_eq!(report["crs"]["transform"]["datumShift"].is_object(), cgcs2000, "{name}");
        let rmse = report["validation"]["sampleRmseM"].as_f64().unwrap();
        assert!(rmse < 5.0, "{name}: sample RMSE {rmse} m");
        rows.push(json!({
            "case": name, "srs": srs, "route": report["route"], "seconds": secs,
            "transform": report["crs"]["transform"]["name"], "accuracyM": report["crs"]["transform"]["accuracyM"],
            "rmseM": rmse, "p95M": report["validation"]["sampleP95M"], "maxAbsM": report["validation"]["sampleMaxAbsM"],
            "bounds": report["dataBounds"], "suggestedMaxDepth": report["tiling"]["suggestedMaxDepth"],
        }));
    }
    println!("CRS-MATRIX {}", Value::Array(rows));
}

/// A WKT whose root ID was removed is still a valid CRS.
#[test]
fn wkt_override_without_authority_is_accepted() {
    let Some((runtime, data)) = real_env() else { return };
    let root = scratch("wkt");
    let wkt = r#"PROJCRS["CGCS2000 / 3-degree Gauss-Kruger CM 114E",BASEGEOGCRS["China Geodetic Coordinate System 2000",DATUM["China 2000",ELLIPSOID["CGCS2000",6378137,298.257222101,LENGTHUNIT["metre",1]]],PRIMEM["Greenwich",0,ANGLEUNIT["degree",0.0174532925199433]]],CONVERSION["Gauss-Kruger CM 114E",METHOD["Transverse Mercator",ID["EPSG",9807]],PARAMETER["Latitude of natural origin",0,ANGLEUNIT["degree",0.0174532925199433]],PARAMETER["Longitude of natural origin",114,ANGLEUNIT["degree",0.0174532925199433]],PARAMETER["Scale factor at natural origin",1,SCALEUNIT["unity",1]],PARAMETER["False easting",500000,LENGTHUNIT["metre",1]],PARAMETER["False northing",0,LENGTHUNIT["metre",1]]],CS[Cartesian,2],AXIS["northing (X)",north,ORDER[1],LENGTHUNIT["metre",1]],AXIS["easting (Y)",east,ORDER[2],LENGTHUNIT["metre",1]]]"#;
    let output = root.join("out");
    // CGCS2000 is recognised by its datum, not by an EPSG code.
    let options = json!({ "crsOverride": wkt, "tiling": { "maxDepth": 13 } });
    let result = run(&task(&root, "terrain-wkt", &[data.join("D1.tif")], &output, options, json!({})), &runtime, None);
    assert_eq!(result.code, 0, "{:#?}", result.events);
    let report = report(&output);
    assert_eq!(report["crs"]["userSpecified"], true);
    assert_eq!(report["crs"]["transform"]["datumShift"]["name"], "cgcs2000-null-geocentric-translation");
    assert_eq!(report["route"]["effective"], "normalize");
    assert!(report["validation"]["sampleRmseM"].as_f64().unwrap() < 5.0);
}

#[test]
fn bad_crs_definitions_fail_with_specific_codes() {
    let Some((runtime, data)) = real_env() else { return };
    let root = scratch("bad-crs");
    let d0 = data.join("D0.tif");
    let cases = [
        ("EPSG:999999", "TERRAIN_CRS_INVALID"),
        ("GEOGCRS[broken", "TERRAIN_CRS_INVALID"),
        ("+proj=longlat", "TERRAIN_CRS_INVALID"),
        ("+proj=pipeline +step +proj=unitconvert", "TERRAIN_CRS_INVALID"),
        // Height-only CRS: not a horizontal CRS for a DEM.
        ("EPSG:5773", "TERRAIN_CRS_INVALID"),
        // Lon/lat numbers declared as metres.
        ("EPSG:32650", "TERRAIN_CRS_INVALID"),
    ];
    for (index, (crs, code)) in cases.iter().enumerate() {
        let output = root.join(format!("out{index}"));
        let options = json!({ "crsOverride": crs, "preprocess": { ACCEPT_BALLPARK: true } });
        let result = run(&task(&root, &format!("terrain-bad{index}"), &[d0.clone()], &output, options, json!({})), &runtime, None);
        assert_eq!(result.error_code(), Some(*code), "{crs}: {:#?}", result.events);
        assert!(!output.exists());
    }

    // NAD27 in Oklahoma: the best operation needs a NOAA grid the runtime
    // does not ship, and the task must not fall back to a worse one.
    fs::create_dir_all(root.join("src")).unwrap();
    let nad27 = root.join("src").join("nad27.tif");
    relabel(&runtime, &d0, &nad27, "EPSG:4267", [-100.1, 35.1, -99.9, 34.9]);
    let options = json!({ "preprocess": { ACCEPT_BALLPARK: true } });
    let result = run(&task(&root, "terrain-nad27", &[nad27], &root.join("nad27-out"), options, json!({})), &runtime, None);
    assert_eq!(result.error_code(), Some("TERRAIN_TRANSFORM_UNAVAILABLE"), "{:#?}", result.events);
    assert!(result.error_message().contains("us_noaa"), "{}", result.error_message());
    assert!(no_leftovers(&root));
}

/// Beijing 1954 and Xi'an 1980 still have only PROJ's ballpark offset to
/// WGS 84: without an explicit acceptance the task stops.
#[test]
fn beijing54_and_xian80_still_need_acceptance() {
    let Some((runtime, data)) = real_env() else { return };
    let root = scratch("legacy-datum");
    let sources = root.join("src");
    fs::create_dir_all(&sources).unwrap();
    let gk = [490000.0, 3390000.0, 510000.0, 3370000.0];
    for (name, srs) in [("beijing54", "EPSG:2436"), ("xian80", "EPSG:2383")] {
        let source = sources.join(format!("{name}.tif"));
        relabel(&runtime, &data.join("D1.tif"), &source, srs, gk);
        let output = root.join(name);
        let result = run(&task(&root, &format!("terrain-{name}"), &[source], &output, json!({}), json!({})), &runtime, None);
        assert_eq!(result.error_code(), Some("TERRAIN_TRANSFORM_LOW_ACCURACY"), "{name}: {:#?}", result.events);
        assert!(!output.exists());
    }
    assert!(no_leftovers(&root));
}

/// Compound CRS: the vertical part is reported and never applied.
#[test]
fn compound_crs_keeps_heights_unchanged() {
    let Some((runtime, data)) = real_env() else { return };
    let root = scratch("compound");
    let output = root.join("out");
    let options = json!({ "crsOverride": "EPSG:4326+5773", "tiling": { "maxDepth": 13 } });
    let result = run(&task(&root, "terrain-compound", &[data.join("D0.tif")], &output, options, json!({})), &runtime, None);
    assert_eq!(result.code, 0, "{:#?}", result.events);
    let report = report(&output);
    assert_eq!(report["crs"]["type"], "compound");
    assert_eq!(report["crs"]["verticalName"], "EGM96 height");
    assert_eq!(report["crs"]["transform"]["verticalTransformed"], false);
    assert_eq!(report["route"]["reason"], "compound-crs");
    let min = report["validation"]["minHeightInsideM"].as_f64().unwrap();
    assert!(min > 250.0, "D0 heights start near 275 m, got {min}");
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
    // The half-cell shift put cliff and hole-edge vertices on the wrong
    // pixels: RMSE was 45.8 m before the CTB patch.
    let validation = &report["validation"];
    assert!(validation["sampleRmseM"].as_f64().unwrap() < 2.0, "{validation:#}");
    assert!(validation["sampleBreakdown"]["clean"]["rmseM"].as_f64().unwrap() < 0.1);
    assert!(validation["sampleBreakdown"]["steep"]["count"].as_u64().unwrap() > 0, "D2 has a 300 m cliff");
    assert!(validation["sampleBreakdown"]["nearNoData"]["count"].as_u64().unwrap() > 0);
}

const NODATA_ONLY_AUX: &str = "<PAMDataset><PAMRasterBand band=\"1\"><NoDataValue>-9999</NoDataValue></PAMRasterBand></PAMDataset>";

/// NoData (and CRS, georeference) that only a `.aux.xml` sidecar declares is
/// what `gdalinfo` reports, so conversion must honour it too and never tile
/// the holes as heights. The sidecar and the source stay untouched.
#[test]
fn nodata_in_pam_sidecar_is_honoured() {
    let Some((runtime, data)) = real_env() else { return };
    let root = scratch("d2-pam");
    let src = root.join("src");
    fs::create_dir_all(&src).unwrap();
    let d2 = data.join("D2.tif");
    let bare = src.join("D2-bare.tif");
    gdal(&runtime, "gdal_translate", &["-q", "-a_nodata", "none", d2.to_str().unwrap(), bare.to_str().unwrap()]);
    fs::write(src.join("D2-bare.tif.aux.xml"), NODATA_ONLY_AUX).unwrap();
    // BASELINE GeoTIFF: CRS, geotransform and NoData all go to the sidecar.
    let baseline = src.join("D2-baseline.tif");
    gdal(&runtime, "gdal_translate", &["-q", "-co", "PROFILE=BASELINE", d2.to_str().unwrap(), baseline.to_str().unwrap()]);
    assert!(src.join("D2-baseline.tif.aux.xml").is_file());
    let before = folder_state(&src);
    let sidecar = fs::read(src.join("D2-baseline.tif.aux.xml")).unwrap();

    for (index, source) in [bare, baseline].into_iter().enumerate() {
        let output = root.join(format!("out-{index}"));
        let blocked = run(&task(&root, &format!("terrain-pam{index}a"), &[source.clone()], &output, json!({}), json!({})), &runtime, None);
        assert_eq!(blocked.error_code(), Some("TERRAIN_NODATA_POLICY_REQUIRED"), "{:#?}", blocked.events);
        let constant = json!({ "noData": { "mode": "explicit-constant", "valueMeters": 150.0 } });
        let result = run(&task(&root, &format!("terrain-pam{index}b"), &[source.clone()], &output, constant, json!({})), &runtime, None);
        assert_eq!(result.code, 0, "{:#?}", result.events);
        let report = report(&output);
        assert_eq!(report["sources"][0]["path"], json!(source));
        assert_eq!(report["noData"]["sourceHoleCount"], 70108, "{:#}", report["noData"]);
        assert_eq!(report["noData"]["remainingNoDataCount"], 0);
        let min = report["validation"]["minHeightInsideM"].as_f64().unwrap();
        assert!(min > -1000.0, "-9999 was tiled as a height: {min}");
    }
    assert_eq!(folder_state(&src), before);
    assert_eq!(fs::read(src.join("D2-baseline.tif.aux.xml")).unwrap(), sidecar);
    assert!(no_leftovers(&root));
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

/// Projected DEM with a real hole: the hole still needs a decision, the
/// frame does not, and the two counts are reported apart.
#[test]
fn projected_hole_and_frame_are_classified_apart() {
    let Some((runtime, data)) = real_env() else { return };
    let root = scratch("footprint");
    let sources = root.join("src");
    fs::create_dir_all(&sources).unwrap();
    // D2 has a NoData strip; relabelled into GK CM 114E it gains a frame when warped.
    let source = sources.join("d2-gk.tif");
    relabel(&runtime, &data.join("D2.tif"), &source, "EPSG:4547", [490000.0, 3390000.0, 510000.0, 3370000.0]);
    let base = json!({ "preprocess": { "projectionMode": "normalize" }, "tiling": { "maxDepth": 12 } });
    let blocked = run(&task(&root, "terrain-fp-a", &[source.clone()], &root.join("a"), base.clone(), json!({})), &runtime, None);
    assert_eq!(blocked.error_code(), Some("TERRAIN_NODATA_POLICY_REQUIRED"), "{:#?}", blocked.events);
    assert!(blocked.error_message().contains("源数据范围内"));

    let mut constant = base;
    constant["noData"] = json!({ "mode": "explicit-constant", "valueMeters": 150.0 });
    let output = root.join("out");
    let result = run(&task(&root, "terrain-fp-b", &[source], &output, constant, json!({})), &runtime, None);
    assert_eq!(result.code, 0, "{:#?}", result.events);
    let report = report(&output);
    let holes = report["noData"]["sourceHoleCount"].as_u64().unwrap();
    let outside = report["noData"]["outsideFootprintCount"].as_u64().unwrap();
    assert!(holes > 0 && outside > 0, "{}", report["noData"]);
    assert_eq!(report["noData"]["filledHoleCount"].as_u64().unwrap(), holes);
    assert_eq!(report["noData"]["auxiliaryCount"].as_u64().unwrap(), outside);
    assert_eq!(report["noData"]["remainingNoDataCount"], 0);
}

/// maxDepth=auto on a 10 m metric DEM at 70 N picks the same level as at
/// 30 N: the warp keeps the latitude resolution (gdalwarp's default square
/// pixel used to coarsen it to ~18 m and give 14).
#[test]
fn auto_max_depth_holds_at_high_latitude() {
    let Some((runtime, data)) = real_env() else { return };
    let root = scratch("lat70");
    let sources = root.join("src");
    fs::create_dir_all(&sources).unwrap();
    let source = sources.join("d1-utm50-70n.tif");
    relabel(&runtime, &data.join("D1.tif"), &source, "EPSG:32650", [490000.0, 7775000.0, 510000.0, 7755000.0]);
    let output = root.join("out");
    let result = run(&task(&root, "terrain-lat70", &[source], &output, json!({}), json!({})), &runtime, None);
    assert_eq!(result.code, 0, "{:#?}", result.events);
    let report = report(&output);
    assert_eq!(report["tiling"]["maxDepthAuto"], true);
    assert_eq!(report["tiling"]["maxDepth"], 15, "{}", report["tiling"]);
    assert!(report["validation"]["sampleP95M"].as_f64().unwrap() < 0.5, "{}", report["validation"]);
}

/// Sources in different CRSs and resolutions: each is warped with its own
/// operation onto one EPSG:4326 grid.
#[test]
fn mixed_crs_sources_are_warped_separately() {
    let Some((runtime, data)) = real_env() else { return };
    let root = scratch("mixed");
    let sources = root.join("src");
    fs::create_dir_all(&sources).unwrap();
    let west = sources.join("west-4326.tif");
    gdal(&runtime, "gdal_translate", &["-q", "-srcwin", "0", "0", "1300", "2000", data.join("D0.tif").to_str().unwrap(), west.to_str().unwrap()]);
    let east = sources.join("east-32650.tif");
    gdal(
        &runtime,
        "gdalwarp",
        // Target box well inside D0, so the UTM copy has no NoData frame of its own.
        &[
            "-q", "-t_srs", "EPSG:32650", "-tr", "45", "45", "-te_srs", "EPSG:4326", "-te", "114.02", "30.45", "114.08", "30.55",
            data.join("D0.tif").to_str().unwrap(), east.to_str().unwrap(),
        ],
    );
    let output = root.join("out");
    let options = json!({ "tiling": { "maxDepth": 12 }, "noData": { "mode": "interpolate", "maxSearchPixels": 50 } });
    let result = run(&task(&root, "terrain-mixed", &[west, east], &output, options, json!({})), &runtime, None);
    assert_eq!(result.code, 0, "{:#?}", result.events);
    let report = report(&output);
    assert_eq!(report["route"]["effective"], "normalize");
    assert_eq!(report["route"]["reason"], "heterogeneous-sources");
    assert_eq!(report["sources"][1]["crsAuthority"], "EPSG:32650");
    assert_eq!(report["noData"]["remainingNoDataCount"], 0);
    assert!(report["validation"]["sampleRmseM"].as_f64().unwrap() < 5.0, "{}", report["validation"]);
    // The two boxes leave a large uncovered area that gets extrapolated.
    let ratio = report["noData"]["auxiliaryRatio"].as_f64().unwrap();
    assert!(ratio >= 0.05, "auxiliaryRatio {ratio}");
    assert!(report["noData"]["auxiliaryWarning"].as_str().unwrap().contains("不是真实地形"));
    assert!(result.has_warning("TERRAIN_AUXILIARY_EXTRAPOLATION"));
    assert!(result.has_log("quality warning"));
}

/// Non-ASCII paths with spaces, and a VRT as input.
#[test]
fn chinese_path_and_vrt_input() {
    let Some((runtime, data)) = real_env() else { return };
    let root = scratch("路径 测试");
    let sources = root.join("源 数据");
    fs::create_dir_all(&sources).unwrap();
    let tif = sources.join("高程 D1.tif");
    fs::copy(data.join("D1.tif"), &tif).unwrap();
    let vrt = sources.join("合并 D1.vrt");
    gdal(&runtime, "gdalbuildvrt", &["-q", vrt.to_str().unwrap(), tif.to_str().unwrap()]);
    let options = json!({ "tiling": { "maxDepth": 12 } });
    for (name, source) in [("tif", &tif), ("vrt", &vrt)] {
        let output = root.join(format!("输出 {name}"));
        let result = run(&task(&root, &format!("terrain-path-{name}"), &[source.clone()], &output, options.clone(), json!({})), &runtime, None);
        assert_eq!(result.code, 0, "{name}: {:#?}", result.events);
        let report = report(&output);
        assert_eq!(report["route"]["effective"], "normalize", "{name}");
        assert!(report["validation"]["sampleRmseM"].as_f64().unwrap() < 5.0, "{name}");
    }
}

/// Cancel during CTB, resume with -R, and compare with an uninterrupted run.
/// A changed parameter must not resume.
#[test]
fn m_cancel_resume_matches_full_run_and_changed_options_restart() {
    let Some((runtime, data)) = real_env() else { return };
    let root = scratch("m");
    let source = data.join("M.tif");
    let data_before = folder_state(&data);
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
    // Overviews, cancels and resumes never write next to the source DEMs.
    assert_eq!(folder_state(&data), data_before);
}

/// Cancel, then change only the `.aux.xml` sidecar (its geotransform moves
/// the DEM ten pixels east): the resumed run must start over and tile the
/// moved DEM, not reuse the old tiles.
#[test]
fn sidecar_change_restarts_a_resumed_task() {
    let Some((runtime, data)) = real_env() else { return };
    let root = scratch("m-sidecar");
    let src = root.join("src");
    fs::create_dir_all(&src).unwrap();
    let source = src.join("M-baseline.tif");
    gdal(&runtime, "gdal_translate", &["-q", "-co", "PROFILE=BASELINE", data.join("M.tif").to_str().unwrap(), source.to_str().unwrap()]);
    let sidecar = src.join("M-baseline.tif.aux.xml");
    let original = fs::read_to_string(&sidecar).unwrap();
    assert!(original.contains("<GeoTransform>"), "{original}");

    let execution = json!({ "resumePolicy": "resume" });
    let output = root.join("out");
    let task_path = task(&root, "terrain-sidecar", &[source.clone()], &output, json!({ "tiling": { "maxDepth": 15 } }), execution);
    let cancelled = run(&task_path, &runtime, Some("Tiling to level"));
    assert_eq!(cancelled.code, 2, "{:#?}", cancelled.events);
    assert!(root.join(".geoforge-task-terrain-sidecar").is_dir());

    let start = original.find("<GeoTransform>").unwrap() + "<GeoTransform>".len();
    let end = original.find("</GeoTransform>").unwrap();
    let mut values: Vec<f64> = original[start..end].split(',').map(|v| v.trim().parse().unwrap()).collect();
    // Ten pixels east.
    values[0] += 10.0 * values[1];
    let moved: Vec<String> = values.iter().map(|v| format!("{v:.16e}")).collect();
    fs::write(&sidecar, format!("{}{}{}", &original[..start], moved.join(","), &original[end..])).unwrap();

    let finished = run(&task_path, &runtime, None);
    assert_eq!(finished.code, 0, "{:#?}", finished.events);
    assert!(finished.has_warning("TERRAIN_RESUME_RESET"));
    assert!(!finished.has_log("resuming with ctb-tile -R"));

    // The result equals a fresh run on the moved DEM and differs from the old one.
    let options = json!({ "tiling": { "maxDepth": 15 } });
    let fresh = root.join("fresh");
    assert_eq!(run(&task(&root, "terrain-sidecar-fresh", &[source.clone()], &fresh, options.clone(), json!({})), &runtime, None).code, 0);
    fs::write(&sidecar, &original).unwrap();
    let old = root.join("old");
    assert_eq!(run(&task(&root, "terrain-sidecar-old", &[source], &old, options, json!({})), &runtime, None).code, 0);
    let (resumed, fresh, old) = (terrain_tiles(&output), terrain_tiles(&fresh), terrain_tiles(&old));
    assert!(resumed == fresh, "resumed tiles differ from a fresh run on the changed sidecar");
    assert!(resumed != old, "resumed tiles still come from the old sidecar");
    assert!(no_leftovers(&root));
}

fn terrain_tiles(dir: &Path) -> Vec<(String, Vec<u8>)> {
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
}

/// Name, size and modification time of every file in `dir`.
fn folder_state(dir: &Path) -> Vec<(String, u64, std::time::SystemTime)> {
    let mut files: Vec<_> = fs::read_dir(dir)
        .unwrap()
        .map(|entry| {
            let entry = entry.unwrap();
            let metadata = entry.metadata().unwrap();
            (entry.file_name().to_string_lossy().into_owned(), metadata.len(), metadata.modified().unwrap())
        })
        .collect();
    files.sort();
    files
}
