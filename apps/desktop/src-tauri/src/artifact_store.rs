//! Artifact registry — roots served by the local resource HTTP server.

use crate::db::now_secs;
use parking_lot::Mutex;
use rusqlite::{params, Connection, OptionalExtension};
use serde::Deserialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use uuid::Uuid;

#[derive(Debug, Clone, Deserialize)]
pub struct ArtifactRecord {
  pub id: String,
  pub task_id: Option<String>,
  pub path: String,
  pub kind: String,
  pub label: String,
  pub created_at: f64,
  pub available: bool,
  pub has_tileset: bool,
  /// `layer.json` exists: a Cesium terrain (quantized-mesh) output.
  pub has_layer: bool,
}

/// Entry file of an artifact root: `tileset.json` for 3D Tiles (unchanged),
/// `layer.json` for terrain. `None` when neither exists.
pub fn entry_file(root: &Path) -> Option<&'static str> {
  if root.join(TILESET_ENTRY).is_file() {
    Some(TILESET_ENTRY)
  } else if root.join(TERRAIN_ENTRY).is_file() {
    Some(TERRAIN_ENTRY)
  } else {
    None
  }
}

pub const TILESET_ENTRY: &str = "tileset.json";
pub const TERRAIN_ENTRY: &str = "layer.json";
pub const TERRAIN_REPORT: &str = "geoforge-terrain.json";

fn number(value: &serde_json::Value) -> Option<f64> {
  value.as_f64().filter(|v| v.is_finite())
}

/// Summary of `geoforge-terrain.json` for the results list and the preview:
/// extent, levels, accuracy and NoData policy, as written by the processor.
/// The DEM is never read again. `None` when the report is missing; a report
/// that cannot be parsed yields `{"reportError": ...}`.
pub fn terrain_summary(root: &Path) -> Option<serde_json::Value> {
  let text = std::fs::read_to_string(root.join(TERRAIN_REPORT)).ok()?;
  let report: serde_json::Value = match serde_json::from_str(&text) {
    Ok(value) => value,
    Err(error) => return Some(serde_json::json!({ "reportError": format!("{TERRAIN_REPORT} 无法解析：{error}") })),
  };
  let bounds: Option<Vec<f64>> = report["dataBounds"]
    .as_array()
    .map(|items| items.iter().filter_map(number).collect())
    .filter(|items: &Vec<f64>| items.len() == 4);
  let area_km2 = bounds.as_ref().map(|b| {
    // Spherical zone area between two latitudes, scaled by the longitude span.
    const R_KM: f64 = 6371.0088;
    let (west, south, east, north) = (b[0], b[1], b[2], b[3]);
    let lat = |deg: f64| deg.to_radians().sin();
    R_KM * R_KM * (east - west).abs().to_radians() * (lat(north) - lat(south)).abs()
  });
  let validation = &report["validation"];
  let no_data = &report["noData"];
  Some(serde_json::json!({
    "reportVersion": report["version"],
    "bounds": bounds,
    "areaKm2": area_km2,
    "maxDepth": report["tiling"]["maxDepth"],
    "maxDepthAuto": report["tiling"]["maxDepthAuto"],
    "meshQuality": report["tiling"]["meshQuality"],
    "tiles": validation["tiles"],
    "heightMinM": report["heights"]["min"],
    "heightMaxM": report["heights"]["max"],
    "sampleRmseM": validation["sampleRmseM"],
    "sampleCleanRmseM": validation["sampleBreakdown"]["clean"]["rmseM"],
    "sampleP95M": validation["sampleP95M"],
    "maxEdgeGapM": validation["maxEdgeGapM"],
    "noDataPolicy": no_data["policy"],
    "sourceHoleCount": no_data["sourceHoleCount"],
    "filledCount": no_data["filledCount"],
    "crsName": report["crs"]["name"],
    "crsAuthority": report["crs"]["authority"],
    "route": report["route"]["effective"],
    "verticalDatumMode": report["verticalDatum"]["mode"],
    "verticalConverted": report["verticalDatum"]["converted"],
    "verticalNote": report["verticalDatum"]["note"],
  }))
}

impl ArtifactRecord {
  pub fn entry_file(&self) -> Option<&'static str> {
    if self.has_tileset {
      Some(TILESET_ENTRY)
    } else if self.has_layer {
      Some(TERRAIN_ENTRY)
    } else {
      None
    }
  }

  pub fn is_terrain(&self) -> bool {
    self.kind == "terrain"
  }

  /// `available`: the root exists. `status` says why a registered artifact
  /// cannot be previewed, so the list can explain instead of hiding it.
  pub fn status(&self) -> &'static str {
    if !self.available {
      "missing"
    } else if self.entry_file().is_none() {
      "incomplete"
    } else {
      "ok"
    }
  }

  pub fn to_json_value(&self) -> serde_json::Value {
    let terrain = if self.is_terrain() && self.available {
      terrain_summary(Path::new(&self.path))
    } else {
      None
    };
    serde_json::json!({
      "entryFile": self.entry_file(),
      "previewable": self.status() == "ok",
      "status": self.status(),
      "hasLayer": self.has_layer,
      "terrain": terrain,
      "id": self.id,
      "taskId": self.task_id,
      "path": self.path,
      "kind": self.kind,
      "label": self.label,
      "createdAt": self.created_at,
      "created_at": self.created_at,
      "available": self.available,
      "has_tileset": self.has_tileset,
      "hasTileset": self.has_tileset,
    })
  }
}

fn make_artifact(
  id: String,
  task_id: Option<String>,
  path: String,
  kind: String,
  label: String,
  created_at: f64,
) -> ArtifactRecord {
  let root = PathBuf::from(&path);
  let available = root.exists();
  let has_tileset = root.join(TILESET_ENTRY).is_file();
  let has_layer = root.join(TERRAIN_ENTRY).is_file();
  // Rows written before terrain was registered may carry the old default.
  let kind = if kind.is_empty() || (kind == "3dtiles" && !has_tileset && has_layer) {
    if has_layer && !has_tileset { "terrain".to_string() } else { "3dtiles".to_string() }
  } else {
    kind
  };
  ArtifactRecord {
    id,
    task_id,
    path,
    kind,
    label,
    created_at,
    available,
    has_tileset,
    has_layer,
  }
}

#[derive(Clone)]
pub struct ArtifactStore {
  conn: Arc<Mutex<Connection>>,
  roots: Arc<parking_lot::RwLock<HashMap<String, PathBuf>>>,
}

impl ArtifactStore {
  pub fn new(conn: Arc<Mutex<Connection>>) -> Self {
    let store = Self {
      conn,
      roots: Arc::new(parking_lot::RwLock::new(HashMap::new())),
    };
    let _ = store.reload_index();
    store
  }

  pub fn roots_handle(&self) -> Arc<parking_lot::RwLock<HashMap<String, PathBuf>>> {
    self.roots.clone()
  }

  pub fn reload_index(&self) -> Result<(), String> {
    let list = self.list_raw()?;
    let mut map = self.roots.write();
    map.clear();
    for a in list {
      if let Ok(canon) = PathBuf::from(&a.path).canonicalize() {
        map.insert(a.id, canon);
      } else {
        map.insert(a.id, PathBuf::from(a.path));
      }
    }
    Ok(())
  }

  pub fn register(
    &self,
    path: &str,
    task_id: Option<&str>,
    kind: &str,
    label: &str,
  ) -> Result<ArtifactRecord, String> {
    let root = PathBuf::from(path);
    let canon = root.canonicalize().unwrap_or(root.clone());
    let path_str = canon.to_string_lossy().into_owned();

    // Re-register same path: update metadata, do not duplicate
    if let Ok(Some(existing)) = self.find_by_path(&path_str) {
      let id = existing.id.clone();
      let now = now_secs();
      let label = if label.is_empty() {
        existing.label.clone()
      } else {
        label.to_string()
      };
      let kind = if kind.is_empty() {
        existing.kind.clone()
      } else {
        kind.to_string()
      };
      {
        let conn = self.conn.lock();
        conn
          .execute(
            "UPDATE artifacts SET task_id = COALESCE(?1, task_id), kind = ?2, label = ?3, available = ?4 WHERE id = ?5",
            params![
              task_id,
              kind,
              label,
              if canon.exists() { 1 } else { 0 },
              id
            ],
          )
          .map_err(|e| e.to_string())?;
      }
      self.roots.write().insert(id.clone(), canon.clone());
      return Ok(make_artifact(
        id,
        task_id.map(|s| s.to_string()).or(existing.task_id),
        path_str,
        kind,
        label,
        existing.created_at.max(now),
      ));
    }

    let id = format!("art-{}", &Uuid::new_v4().to_string().replace('-', "")[..12]);
    let now = now_secs();
    let label = if label.is_empty() {
      canon
        .file_name()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| id.clone())
    } else {
      label.to_string()
    };
    let kind = if kind.is_empty() { "3dtiles" } else { kind };
    {
      let conn = self.conn.lock();
      conn
        .execute(
          r#"INSERT INTO artifacts (id, task_id, path, kind, label, created_at, available)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"#,
          params![
            id,
            task_id,
            path_str,
            kind,
            label,
            now,
            if canon.exists() { 1 } else { 0 }
          ],
        )
        .map_err(|e| e.to_string())?;
    }
    self.roots.write().insert(id.clone(), canon);
    Ok(make_artifact(
      id,
      task_id.map(|s| s.to_string()),
      path_str,
      kind.to_string(),
      label,
      now,
    ))
  }

  pub fn find_by_path(&self, path: &str) -> Result<Option<ArtifactRecord>, String> {
    let list = self.list_raw()?;
    let target = PathBuf::from(path);
    let target_canon = target.canonicalize().unwrap_or(target);
    Ok(list.into_iter().find(|a| {
      let p = PathBuf::from(&a.path);
      let c = p.canonicalize().unwrap_or(p);
      c == target_canon
    }))
  }

  pub fn get(&self, id: &str) -> Result<Option<ArtifactRecord>, String> {
    let conn = self.conn.lock();
    conn
      .query_row("SELECT * FROM artifacts WHERE id = ?1", params![id], |r| {
        Ok(make_artifact(
          r.get("id")?,
          r.get("task_id")?,
          r.get("path")?,
          r.get::<_, Option<String>>("kind")?.unwrap_or_default(),
          r.get::<_, Option<String>>("label")?.unwrap_or_default(),
          r.get::<_, Option<f64>>("created_at")?.unwrap_or(0.0),
        ))
      })
      .optional()
      .map_err(|e| e.to_string())
  }

  fn list_raw(&self) -> Result<Vec<ArtifactRecord>, String> {
    let conn = self.conn.lock();
    let mut stmt = conn
      .prepare("SELECT * FROM artifacts ORDER BY created_at DESC")
      .map_err(|e| e.to_string())?;
    let rows = stmt
      .query_map([], |r| {
        Ok(make_artifact(
          r.get("id")?,
          r.get("task_id")?,
          r.get("path")?,
          r.get::<_, Option<String>>("kind")?.unwrap_or_default(),
          r.get::<_, Option<String>>("label")?.unwrap_or_default(),
          r.get::<_, Option<f64>>("created_at")?.unwrap_or(0.0),
        ))
      })
      .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows {
      out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
  }

  pub fn list(&self) -> Result<Vec<serde_json::Value>, String> {
    Ok(
      self
        .list_raw()?
        .into_iter()
        .map(|a| a.to_json_value())
        .collect(),
    )
  }

  /// `rel` empty means the artifact's entry file (see [`entry_file`]).
  pub fn resolve_file(root: &Path, rel: &str) -> Result<PathBuf, String> {
    let rel = rel.trim_start_matches('/');
    let rel = if rel.is_empty() { entry_file(root).unwrap_or(TILESET_ENTRY) } else { rel };
    if rel.split('/').any(|p| p == "..") {
      return Err("path traversal rejected".into());
    }
    let root = root
      .canonicalize()
      .map_err(|e| format!("artifact root missing: {e}"))?;
    let target = root.join(rel);
    let target = target
      .canonicalize()
      .map_err(|e| format!("file not found: {rel} ({e})"))?;
    if !target.starts_with(&root) {
      return Err("path traversal rejected".into());
    }
    if !target.is_file() {
      return Err(format!("file not found: {rel}"));
    }
    Ok(target)
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::db::init_schema;

  fn store() -> ArtifactStore {
    let conn = Connection::open_in_memory().unwrap();
    init_schema(&conn).unwrap();
    ArtifactStore::new(Arc::new(Mutex::new(conn)))
  }

  fn temp_root(name: &str) -> PathBuf {
    let root = std::env::temp_dir().join(format!("geoforge-art-{name}-{}", Uuid::new_v4()));
    std::fs::create_dir_all(&root).unwrap();
    root
  }

  const REPORT: &str = r#"{"version":2,"dataBounds":[114.2,30.5,114.3,30.6],
    "tiling":{"maxDepth":15,"maxDepthAuto":true,"meshQuality":"balanced"},
    "heights":{"min":-67.6,"max":360.0},
    "validation":{"tiles":517,"sampleRmseM":0.366,"sampleP95M":1.157,"maxEdgeGapM":1.03,
      "sampleBreakdown":{"clean":{"rmseM":0.015}}},
    "noData":{"policy":"explicit-constant","sourceHoleCount":70108,"filledCount":70108},
    "crs":{"name":"WGS 84","authority":"EPSG:4326"},"route":{"effective":"direct"},
    "verticalDatum":{"mode":"unknown","converted":false,"note":"n"}}"#;

  #[test]
  fn terrain_artifact_is_previewable_through_layer_json() {
    let root = temp_root("terrain");
    std::fs::write(root.join("layer.json"), "{}").unwrap();
    std::fs::write(root.join(TERRAIN_REPORT), REPORT).unwrap();
    let store = store();
    let art = store.register(root.to_str().unwrap(), Some("task-1"), "terrain", "").unwrap();
    assert!(art.is_terrain());
    assert!(!art.has_tileset);
    assert_eq!(art.entry_file(), Some("layer.json"));
    let value = store.get(&art.id).unwrap().unwrap().to_json_value();
    assert_eq!(value["kind"], "terrain");
    assert_eq!(value["previewable"], true);
    assert_eq!(value["status"], "ok");
    assert_eq!(value["hasTileset"], false);
    assert_eq!(value["terrain"]["maxDepth"], 15);
    assert_eq!(value["terrain"]["tiles"], 517);
    assert_eq!(value["terrain"]["noDataPolicy"], "explicit-constant");
    assert_eq!(value["terrain"]["sampleCleanRmseM"], 0.015);
    let area = value["terrain"]["areaKm2"].as_f64().unwrap();
    assert!((area - 106.5).abs() < 0.5, "0.1° x 0.1° at 30.5° N is about 106.5 km², got {area}");
    let entry = ArtifactStore::resolve_file(&root, "").unwrap();
    assert!(entry.ends_with("layer.json"));

    // Moved or deleted by the user: still listed, with a status to explain it.
    std::fs::remove_dir_all(&root).unwrap();
    let value = store.get(&art.id).unwrap().unwrap().to_json_value();
    assert_eq!(value["available"], false);
    assert_eq!(value["status"], "missing");
    assert_eq!(value["previewable"], false);
    assert_eq!(value["kind"], "terrain");
  }

  #[test]
  fn terrain_artifact_survives_an_app_restart() {
    let root = temp_root("restart");
    std::fs::write(root.join("layer.json"), "{}").unwrap();
    std::fs::write(root.join(TERRAIN_REPORT), REPORT).unwrap();
    let db = std::env::temp_dir().join(format!("geoforge-art-restart-{}.sqlite", Uuid::new_v4()));
    let id = {
      let conn = Connection::open(&db).unwrap();
      init_schema(&conn).unwrap();
      let store = ArtifactStore::new(Arc::new(Mutex::new(conn)));
      store.register(root.to_str().unwrap(), Some("task-1"), "terrain", "").unwrap().id
    };
    // Same start-up as the app: open the database again and rebuild the index.
    let conn = Connection::open(&db).unwrap();
    init_schema(&conn).unwrap();
    let store = ArtifactStore::new(Arc::new(Mutex::new(conn)));
    store.reload_index().unwrap();
    let listed = store.list().unwrap();
    let value = listed.iter().find(|v| v["id"] == id.as_str()).expect("terrain artifact listed after restart");
    assert_eq!(value["kind"], "terrain");
    assert_eq!(value["entryFile"], "layer.json");
    assert_eq!(value["previewable"], true);
    assert_eq!(value["terrain"]["tiles"], 517);
    // The resource server resolves it again without a new task.
    assert!(store.roots_handle().read().contains_key(&id));
    let _ = std::fs::remove_dir_all(&root);
    let _ = std::fs::remove_file(&db);
  }

  #[test]
  fn tileset_entry_and_old_rows_are_unchanged() {
    let root = temp_root("both");
    std::fs::write(root.join("tileset.json"), "{}").unwrap();
    std::fs::write(root.join("layer.json"), "{}").unwrap();
    assert!(ArtifactStore::resolve_file(&root, "").unwrap().ends_with("tileset.json"));
    let store = store();
    let art = store.register(root.to_str().unwrap(), None, "", "").unwrap();
    assert_eq!(art.kind, "3dtiles");
    assert_eq!(art.entry_file(), Some("tileset.json"));

    // A terrain folder registered with the old default kind is shown as terrain.
    let terrain = temp_root("old");
    std::fs::write(terrain.join("layer.json"), "{}").unwrap();
    let old = store.register(terrain.to_str().unwrap(), None, "3dtiles", "").unwrap();
    assert_eq!(store.get(&old.id).unwrap().unwrap().kind, "terrain");

    // Neither entry: incomplete, not previewable.
    let empty = temp_root("empty");
    let none = store.register(empty.to_str().unwrap(), None, "terrain", "").unwrap();
    assert_eq!(none.status(), "incomplete");
    assert!(ArtifactStore::resolve_file(&empty, "").is_err());
    for dir in [root, terrain, empty] {
      let _ = std::fs::remove_dir_all(dir);
    }
  }

  #[test]
  fn broken_report_is_reported_not_hidden() {
    let root = temp_root("broken");
    std::fs::write(root.join("layer.json"), "{}").unwrap();
    std::fs::write(root.join(TERRAIN_REPORT), "{not json").unwrap();
    assert!(terrain_summary(&root).unwrap()["reportError"].as_str().unwrap().contains(TERRAIN_REPORT));
    std::fs::remove_file(root.join(TERRAIN_REPORT)).unwrap();
    assert!(terrain_summary(&root).is_none());
    let _ = std::fs::remove_dir_all(root);
  }
}
