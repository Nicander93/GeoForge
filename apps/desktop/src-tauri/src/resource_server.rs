//! Local read-only artifact HTTP server bound to 127.0.0.1.
//! Serves only registered artifact roots; path-traversal safe; CORS for Cesium.

use crate::artifact_store::ArtifactStore;
use axum::body::Body;
use axum::extract::{Path as AxumPath, Request, State};
use axum::http::{header, HeaderMap, HeaderValue, Method, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use std::collections::HashMap;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::oneshot;
use tower_http::cors::{Any, CorsLayer};

#[derive(Clone)]
struct ServerState {
  roots: Arc<parking_lot::RwLock<HashMap<String, PathBuf>>>,
}

pub struct ResourceServerHandle {
  pub port: u16,
  pub base_url: String,
  shutdown: Option<oneshot::Sender<()>>,
}

impl ResourceServerHandle {
  /// Base URL of an artifact root, for Cesium terrain (`CesiumTerrainProvider`
  /// requests `layer.json` and tiles relative to it).
  pub fn artifact_base_url(&self, artifact_id: &str) -> String {
    format!("{}/artifacts/{}/", self.base_url.trim_end_matches('/'), artifact_id)
  }

  pub fn preview_url(&self, artifact_id: &str) -> String {
    format!(
      "{}/artifacts/{}/tileset.json",
      self.base_url.trim_end_matches('/'),
      artifact_id
    )
  }
}

impl Drop for ResourceServerHandle {
  fn drop(&mut self) {
    if let Some(tx) = self.shutdown.take() {
      let _ = tx.send(());
    }
  }
}

/// Bind `127.0.0.1:preferred_port` (0 = ephemeral). Spawns the axum server on a tokio runtime.
pub async fn start_resource_server(
  roots: Arc<parking_lot::RwLock<HashMap<String, PathBuf>>>,
  preferred_port: u16,
) -> Result<ResourceServerHandle, String> {
  let state = ServerState { roots };
  let cors = CorsLayer::new()
    .allow_origin(Any)
    .allow_methods([Method::GET, Method::HEAD, Method::OPTIONS])
    .allow_headers(Any);

  let app = Router::new()
    .route("/health", get(|| async { "ok" }))
    .route(
      "/artifacts/:id/*path",
      get(serve_artifact).head(serve_artifact),
    )
    // No path: the artifact's entry file, tileset.json or else layer.json.
    .route(
      "/artifacts/:id/",
      get(serve_entry).head(serve_entry),
    )
    .route(
      "/artifacts/:id",
      get(serve_entry).head(serve_entry),
    )
    .layer(cors)
    .with_state(state);

  let addr = SocketAddr::from(([127, 0, 0, 1], preferred_port));
  let listener = tokio::net::TcpListener::bind(addr)
    .await
    .map_err(|e| format!("bind resource server failed: {e}"))?;
  let port = listener
    .local_addr()
    .map_err(|e| e.to_string())?
    .port();
  let base_url = format!("http://127.0.0.1:{port}");
  let (tx, rx) = oneshot::channel::<()>();

  tokio::spawn(async move {
    let server = axum::serve(listener, app).with_graceful_shutdown(async {
      let _ = rx.await;
    });
    if let Err(e) = server.await {
      log::error!("resource server error: {e}");
    }
  });

  log::info!("artifact resource server listening on {base_url}");
  Ok(ResourceServerHandle {
    port,
    base_url,
    shutdown: Some(tx),
  })
}

async fn serve_entry(State(state): State<ServerState>, AxumPath(id): AxumPath<String>, req: Request) -> Response {
  serve_artifact_inner(state, id, String::new(), req).await
}

async fn serve_artifact(
  State(state): State<ServerState>,
  AxumPath((id, path)): AxumPath<(String, String)>,
  req: Request,
) -> Response {
  serve_artifact_inner(state, id, path, req).await
}

async fn serve_artifact_inner(
  state: ServerState,
  id: String,
  path: String,
  req: Request,
) -> Response {
  let root = {
    let map = state.roots.read();
    match map.get(&id) {
      Some(p) => p.clone(),
      None => {
        return (StatusCode::NOT_FOUND, format!("artifact not found: {id}")).into_response();
      }
    }
  };

  let file = match ArtifactStore::resolve_file(&root, &path) {
    Ok(p) => p,
    Err(e) => {
      let status = if e.contains("traversal") {
        StatusCode::BAD_REQUEST
      } else {
        StatusCode::NOT_FOUND
      };
      return (status, e).into_response();
    }
  };

  let meta = match tokio::fs::metadata(&file).await {
    Ok(m) => m,
    Err(e) => return (StatusCode::NOT_FOUND, e.to_string()).into_response(),
  };
  let len = meta.len();
  let is_terrain = has_extension(&file, "terrain");
  let mime = if is_terrain {
    TERRAIN_MIME.to_string()
  } else {
    mime_guess::from_path(&file)
      .first_or_octet_stream()
      .essence_str()
      .to_string()
  };

  // CTB writes gzip-compressed `.terrain` files. The bytes on disk are the
  // encoded entity, so they are sent as-is with Content-Encoding and the
  // length of the compressed file. Byte ranges over a gzip stream mean
  // nothing to Cesium, so these tiles always answer 200 with the full body.
  if is_terrain {
    return match tokio::fs::read(&file).await {
      Ok(buf) => terrain_response(&mime, buf),
      Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };
  }

  let range_header = req
    .headers()
    .get(header::RANGE)
    .and_then(|v| v.to_str().ok())
    .map(|s| s.to_string());

  if let Some(range) = range_header {
    if let Some((start, end)) = parse_bytes_range(&range, len) {
      let to_read = end - start + 1;
      match read_range(&file, start, to_read).await {
        Ok(buf) => {
          let mut headers = HeaderMap::new();
          headers.insert(
            header::CONTENT_TYPE,
            HeaderValue::from_str(&mime).unwrap_or(HeaderValue::from_static("application/octet-stream")),
          );
          headers.insert(
            header::CONTENT_LENGTH,
            HeaderValue::from_str(&to_read.to_string()).unwrap(),
          );
          headers.insert(
            header::CONTENT_RANGE,
            HeaderValue::from_str(&format!("bytes {start}-{end}/{len}")).unwrap(),
          );
          headers.insert(header::ACCEPT_RANGES, HeaderValue::from_static("bytes"));
          return Response::builder()
            .status(StatusCode::PARTIAL_CONTENT)
            .body(Body::from(buf))
            .map(|mut r| {
              *r.headers_mut() = headers;
              r
            })
            .unwrap_or_else(|_| StatusCode::INTERNAL_SERVER_ERROR.into_response());
        }
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
      }
    }
  }

  match tokio::fs::read(&file).await {
    Ok(buf) => {
      let mut headers = HeaderMap::new();
      headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_str(&mime).unwrap_or(HeaderValue::from_static("application/octet-stream")),
      );
      headers.insert(
        header::CONTENT_LENGTH,
        HeaderValue::from_str(&len.to_string()).unwrap(),
      );
      headers.insert(header::ACCEPT_RANGES, HeaderValue::from_static("bytes"));
      Response::builder()
        .status(StatusCode::OK)
        .body(Body::from(buf))
        .map(|mut r| {
          *r.headers_mut() = headers;
          r
        })
        .unwrap_or_else(|_| StatusCode::INTERNAL_SERVER_ERROR.into_response())
    }
    Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
  }
}

const TERRAIN_MIME: &str = "application/vnd.quantized-mesh";

fn has_extension(path: &std::path::Path, extension: &str) -> bool {
  path
    .extension()
    .and_then(|value| value.to_str())
    .is_some_and(|value| value.eq_ignore_ascii_case(extension))
}

fn is_gzip(bytes: &[u8]) -> bool {
  bytes.starts_with(&[0x1f, 0x8b])
}

fn terrain_response(mime: &str, buf: Vec<u8>) -> Response {
  let mut headers = HeaderMap::new();
  headers.insert(
    header::CONTENT_TYPE,
    HeaderValue::from_str(mime).unwrap_or(HeaderValue::from_static("application/octet-stream")),
  );
  headers.insert(
    header::CONTENT_LENGTH,
    HeaderValue::from_str(&buf.len().to_string()).unwrap(),
  );
  if is_gzip(&buf) {
    headers.insert(header::CONTENT_ENCODING, HeaderValue::from_static("gzip"));
  }
  Response::builder()
    .status(StatusCode::OK)
    .body(Body::from(buf))
    .map(|mut r| {
      *r.headers_mut() = headers;
      r
    })
    .unwrap_or_else(|_| StatusCode::INTERNAL_SERVER_ERROR.into_response())
}

fn parse_bytes_range(header: &str, len: u64) -> Option<(u64, u64)> {
  // bytes=START-END or bytes=START-
  let s = header.strip_prefix("bytes=")?;
  let (start_s, end_s) = s.split_once('-')?;
  let start: u64 = start_s.parse().ok()?;
  let end: u64 = if end_s.is_empty() {
    len.saturating_sub(1)
  } else {
    end_s.parse().ok()?
  };
  if start > end || start >= len {
    return None;
  }
  Some((start, end.min(len.saturating_sub(1))))
}

async fn read_range(path: &PathBuf, start: u64, len: u64) -> Result<Vec<u8>, String> {
  use tokio::io::{AsyncReadExt, AsyncSeekExt};
  let mut f = tokio::fs::File::open(path)
    .await
    .map_err(|e| e.to_string())?;
  f.seek(std::io::SeekFrom::Start(start))
    .await
    .map_err(|e| e.to_string())?;
  let mut buf = vec![0u8; len as usize];
  f.read_exact(&mut buf).await.map_err(|e| e.to_string())?;
  Ok(buf)
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::io::Write;

  // A gzip member header followed by an arbitrary payload is enough here:
  // the server must not decode or re-encode tile bytes.
  const GZIP_TILE: &[u8] = &[0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 1, 2, 3, 4];
  const RAW_TILE: &[u8] = &[9, 8, 7, 6, 5, 4, 3, 2, 1, 0];

  struct Fixture {
    root: PathBuf,
    base_url: String,
    _handle: ResourceServerHandle,
  }

  impl Drop for Fixture {
    fn drop(&mut self) {
      let _ = std::fs::remove_dir_all(&self.root);
    }
  }

  async fn start_fixture() -> Fixture {
    let root = std::env::temp_dir().join(format!("geoforge-rs-{}", uuid::Uuid::new_v4()));
    let write = |rel: &str, bytes: &[u8]| {
      let path = root.join(rel);
      std::fs::create_dir_all(path.parent().unwrap()).unwrap();
      std::fs::File::create(path).unwrap().write_all(bytes).unwrap();
    };
    write("layer.json", br#"{"tilejson":"2.1.0"}"#);
    write("0/0/0.terrain", GZIP_TILE);
    write("0/1/0.terrain", RAW_TILE);
    write("tileset.json", br#"{"asset":{"version":"1.1"}}"#);
    write("tiles/a.glb", &(0u8..100).collect::<Vec<_>>());

    let roots = Arc::new(parking_lot::RwLock::new(HashMap::from([("t".to_string(), root.clone())])));
    let handle = start_resource_server(roots, 0).await.unwrap();
    Fixture {
      root,
      base_url: handle.base_url.clone(),
      _handle: handle,
    }
  }

  fn header_value<'a>(response: &'a reqwest::Response, name: header::HeaderName) -> Option<&'a str> {
    response.headers().get(name).and_then(|value| value.to_str().ok())
  }

  #[tokio::test]
  async fn gzip_terrain_is_sent_with_content_encoding_and_without_ranges() {
    let fixture = start_fixture().await;
    let client = reqwest::Client::new();
    let url = format!("{}/artifacts/t/0/0/0.terrain?v=1.0.0", fixture.base_url);

    let response = client.get(&url).send().await.unwrap();
    assert_eq!(response.status(), 200);
    assert_eq!(header_value(&response, header::CONTENT_TYPE), Some(TERRAIN_MIME));
    assert_eq!(header_value(&response, header::CONTENT_ENCODING), Some("gzip"));
    assert_eq!(header_value(&response, header::CONTENT_LENGTH), Some("14"));
    assert_eq!(header_value(&response, header::ACCEPT_RANGES), None);
    assert_eq!(response.bytes().await.unwrap().as_ref(), GZIP_TILE);

    let ranged = client.get(&url).header(header::RANGE, "bytes=0-3").send().await.unwrap();
    assert_eq!(ranged.status(), 200);
    assert_eq!(header_value(&ranged, header::CONTENT_RANGE), None);
    assert_eq!(ranged.bytes().await.unwrap().as_ref(), GZIP_TILE);

    let head = client.head(&url).send().await.unwrap();
    assert_eq!(head.status(), 200);
    assert_eq!(header_value(&head, header::CONTENT_ENCODING), Some("gzip"));
    assert_eq!(header_value(&head, header::CONTENT_LENGTH), Some("14"));
    assert_eq!(header_value(&head, header::CONTENT_TYPE), Some(TERRAIN_MIME));
  }

  #[tokio::test]
  async fn uncompressed_terrain_has_no_content_encoding() {
    let fixture = start_fixture().await;
    let response = reqwest::get(format!("{}/artifacts/t/0/1/0.terrain", fixture.base_url))
      .await
      .unwrap();
    assert_eq!(response.status(), 200);
    assert_eq!(header_value(&response, header::CONTENT_TYPE), Some(TERRAIN_MIME));
    assert_eq!(header_value(&response, header::CONTENT_ENCODING), None);
    assert_eq!(response.bytes().await.unwrap().as_ref(), RAW_TILE);
  }

  #[tokio::test]
  async fn tileset_ranges_and_default_entry_are_unchanged() {
    let fixture = start_fixture().await;
    let client = reqwest::Client::new();

    let ranged = client
      .get(format!("{}/artifacts/t/tiles/a.glb", fixture.base_url))
      .header(header::RANGE, "bytes=10-19")
      .send()
      .await
      .unwrap();
    assert_eq!(ranged.status(), 206);
    assert_eq!(header_value(&ranged, header::CONTENT_RANGE), Some("bytes 10-19/100"));
    assert_eq!(header_value(&ranged, header::ACCEPT_RANGES), Some("bytes"));
    assert_eq!(header_value(&ranged, header::CONTENT_ENCODING), None);
    assert_eq!(ranged.bytes().await.unwrap().as_ref(), &(10u8..20).collect::<Vec<_>>()[..]);

    let entry = client.get(format!("{}/artifacts/t/", fixture.base_url)).send().await.unwrap();
    assert_eq!(entry.status(), 200);
    assert!(entry.text().await.unwrap().contains("asset"));
  }

  #[tokio::test]
  async fn terrain_only_artifact_defaults_to_layer_json() {
    let root = std::env::temp_dir().join(format!("geoforge-rs-terrain-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(root.join("0/0")).unwrap();
    std::fs::write(root.join("layer.json"), br#"{"tilejson":"2.1.0","format":"quantized-mesh-1.0"}"#).unwrap();
    std::fs::write(root.join("0/0/0.terrain"), GZIP_TILE).unwrap();
    let roots = Arc::new(parking_lot::RwLock::new(HashMap::from([("terrain".to_string(), root.clone())])));
    let handle = start_resource_server(roots, 0).await.unwrap();
    let client = reqwest::Client::new();
    for url in [handle.artifact_base_url("terrain"), format!("{}/artifacts/terrain", handle.base_url)] {
      let response = client.get(&url).send().await.unwrap();
      assert_eq!(response.status(), 200, "{url}");
      assert_eq!(header_value(&response, header::CONTENT_TYPE), Some("application/json"));
      assert!(response.text().await.unwrap().contains("quantized-mesh"));
      let head = client.head(&url).send().await.unwrap();
      assert_eq!(head.status(), 200);
    }
    // Relative tile URLs resolve against the base URL as Cesium does.
    let tile = client.get(format!("{}0/0/0.terrain?v=1.0.0", handle.artifact_base_url("terrain"))).send().await.unwrap();
    assert_eq!(header_value(&tile, header::CONTENT_ENCODING), Some("gzip"));
    let cors = client
      .get(format!("{}layer.json", handle.artifact_base_url("terrain")))
      .header(header::ORIGIN, "http://tauri.localhost")
      .send()
      .await
      .unwrap();
    assert_eq!(header_value(&cors, header::ACCESS_CONTROL_ALLOW_ORIGIN), Some("*"));
    drop(handle);
    let _ = std::fs::remove_dir_all(root);
  }

  #[tokio::test]
  async fn rejects_traversal_and_unknown_artifacts() {
    let fixture = start_fixture().await;
    let client = reqwest::Client::new();
    let traversal = client
      .get(format!("{}/artifacts/t/0/..%2F..%2Fsecret.terrain", fixture.base_url))
      .send()
      .await
      .unwrap();
    assert!(traversal.status().is_client_error());
    let unknown = client
      .get(format!("{}/artifacts/missing/0/0/0.terrain", fixture.base_url))
      .send()
      .await
      .unwrap();
    assert_eq!(unknown.status(), 404);
  }
}
