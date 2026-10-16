//! Locate and check the bundled terrain runtime (`runtime/terrain`).
//!
//! The runtime is a self-contained folder built by
//! `tools/terrain-runtime/build-terrain-runtime.ps1`. Child processes get
//! their own PATH/GDAL_DATA/PROJ_DATA so a GDAL installed on the host is
//! never picked up, and the processor's own environment is left alone.

use serde::Deserialize;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::io::Read;
use std::path::{Path, PathBuf};

pub const CTB_COMMIT: &str = "776b60308c89383462a91d152a190fcd667b74f7";
/// Version 2 added `crs` and lon/lat sampling through a pipeline.
/// Version 5: `sample` also reports local relief and nearby NoData, and the
/// runtime's CTB carries `patches/ctb-half-cell.patch`.
pub const MIN_DEM_TOOL_VERSION: u32 = 7;

/// The GeoForge patch set applied to CTB, in order, exactly as
/// `build-terrain-runtime.ps1` applies it (`$CtbPatches`). A runtime is only
/// compatible when its manifest records the same names and content hashes,
/// and the set hash is part of the resume fingerprint, so tiles built with a
/// different CTB are never mixed into a resumed task.
pub const CTB_PATCHES: &[(&str, &str)] =
    &[
    ("ctb-half-cell.patch", include_str!("../../../../../tools/terrain-runtime/patches/ctb-half-cell.patch")),
    ("ctb-edge-mask.patch", include_str!("../../../../../tools/terrain-runtime/patches/ctb-edge-mask.patch")),
];

/// SHA-256 of a patch with line endings normalised to LF, so a CRLF checkout
/// on Windows hashes the same as the repository content.
pub fn patch_sha256(content: &str) -> String {
    hex(&Sha256::digest(content.replace("\r\n", "\n").as_bytes()))
}

/// SHA-256 over `"<name>:<sha256>\n"` of every patch, in order. The build
/// script computes the same value into `ctbPatchSetSha256`.
pub fn patch_set_sha256<'a>(patches: impl IntoIterator<Item = (&'a str, String)>) -> String {
    let mut hasher = Sha256::new();
    for (name, sha) in patches {
        hasher.update(format!("{name}:{sha}\n").as_bytes());
    }
    hex(&hasher.finalize())
}

pub fn expected_patch_set_sha256() -> String {
    patch_set_sha256(CTB_PATCHES.iter().map(|(name, content)| (*name, patch_sha256(content))))
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

const REQUIRED_TOOLS: &[&str] = &[
    "ctb-tile",
    "gdalinfo",
    "gdalbuildvrt",
    "gdalwarp",
    "gdaladdo",
    "gf-dem-tool",
];
const REQUIRED_DATA: &[&str] = &["share/gdal/gdalvrt.xsd", "share/proj/proj.db", "manifest.json"];

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeManifest {
    pub ctb_commit: String,
    pub gdal_version: String,
    pub proj_version: String,
    pub dem_tool_version: u32,
    /// Absent in runtimes built before the patch set was locked: those are
    /// not compatible and must be rebuilt.
    /// `ctbPatches` (names only) predates the lock and is kept for older
    /// readers; the locked list with hashes lives in `ctbPatchHashes`.
    #[serde(default, rename = "ctbPatchHashes")]
    pub ctb_patches: Vec<ManifestPatch>,
    #[serde(default)]
    pub ctb_patch_set_sha256: Option<String>,
    #[serde(default)]
    pub files: Vec<ManifestFile>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ManifestPatch {
    pub name: String,
    pub sha256: String,
}

impl RuntimeManifest {
    /// `None` when the runtime's CTB carries exactly `CTB_PATCHES`.
    fn patch_mismatch(&self) -> Option<String> {
        let expected = expected_patch_set_sha256();
        let names: Vec<&str> = self.ctb_patches.iter().map(|patch| patch.name.as_str()).collect();
        let wanted: Vec<&str> = CTB_PATCHES.iter().map(|(name, _)| *name).collect();
        let recomputed = patch_set_sha256(self.ctb_patches.iter().map(|patch| (patch.name.as_str(), patch.sha256.clone())));
        let recorded = self.ctb_patch_set_sha256.as_deref();
        if names == wanted && recorded == Some(expected.as_str()) && recomputed == expected {
            return None;
        }
        Some(format!(
            "CTB 补丁集 {}（{}…；清单中是 {}，{}…；请用当前 build-terrain-runtime.ps1 重新构建地形运行时）",
            wanted.join("+"),
            &expected[..12],
            if names.is_empty() { "未记录".to_string() } else { names.join("+") },
            recorded.map(|value| &value[..value.len().min(12)]).unwrap_or("无哈希")
        ))
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct ManifestFile {
    pub path: String,
    pub bytes: u64,
    pub sha256: String,
}

#[derive(Debug, Clone)]
pub struct TerrainRuntime {
    pub root: PathBuf,
    pub manifest: RuntimeManifest,
}

#[derive(Debug, Clone)]
pub enum RuntimeStatus {
    Ready(TerrainRuntime),
    Missing { root: PathBuf, missing: Vec<String> },
}

impl RuntimeStatus {
    pub fn into_ready(self) -> Result<TerrainRuntime, String> {
        match self {
            RuntimeStatus::Ready(runtime) => Ok(runtime),
            RuntimeStatus::Missing { root, missing } => Err(format!(
                "terrain runtime missing: 地形组件不完整，请修复安装（{}，缺少 {}）",
                root.display(),
                missing.join(", ")
            )),
        }
    }
}

pub fn default_root() -> PathBuf {
    std::env::var_os("GEOFORGE_TERRAIN_RUNTIME")
        .map(PathBuf::from)
        .unwrap_or_else(|| crate::util::tool_paths().runtime_root.join("terrain"))
}

pub fn locate(root: &Path) -> RuntimeStatus {
    let mut missing: Vec<String> = REQUIRED_TOOLS
        .iter()
        .map(|name| format!("bin/{name}{}", std::env::consts::EXE_SUFFIX))
        .chain(REQUIRED_DATA.iter().map(|path| path.to_string()))
        .filter(|rel| !root.join(rel).is_file())
        .collect();
    if !missing.is_empty() {
        return RuntimeStatus::Missing { root: root.to_path_buf(), missing };
    }
    let manifest = std::fs::read_to_string(root.join("manifest.json"))
        .map_err(|error| error.to_string())
        .and_then(|text| {
            // PowerShell writes UTF-8 with a BOM.
            serde_json::from_str::<RuntimeManifest>(text.trim_start_matches('\u{feff}'))
                .map_err(|error| error.to_string())
        });
    match manifest {
        Ok(manifest) if manifest.ctb_commit == CTB_COMMIT && manifest.dem_tool_version >= MIN_DEM_TOOL_VERSION => {
            match manifest.patch_mismatch() {
                None => RuntimeStatus::Ready(TerrainRuntime { root: root.to_path_buf(), manifest }),
                Some(problem) => {
                    missing.push(problem);
                    RuntimeStatus::Missing { root: root.to_path_buf(), missing }
                }
            }
        }
        Ok(manifest) if manifest.ctb_commit == CTB_COMMIT => {
            missing.push(format!(
                "gf-dem-tool {MIN_DEM_TOOL_VERSION}+（清单中是 {}，请重新构建地形运行时）",
                manifest.dem_tool_version
            ));
            RuntimeStatus::Missing { root: root.to_path_buf(), missing }
        }
        Ok(manifest) => {
            missing.push(format!("CTB {CTB_COMMIT}（清单中是 {}）", manifest.ctb_commit));
            RuntimeStatus::Missing { root: root.to_path_buf(), missing }
        }
        Err(error) => {
            missing.push(format!("readable manifest.json ({error})"));
            RuntimeStatus::Missing { root: root.to_path_buf(), missing }
        }
    }
}

impl TerrainRuntime {
    pub fn tool(&self, name: &str) -> String {
        self.root
            .join("bin")
            .join(format!("{name}{}", std::env::consts::EXE_SUFFIX))
            .to_string_lossy()
            .into_owned()
    }

    /// Environment for every runtime child process.
    pub fn child_env(&self) -> Vec<(&'static str, PathBuf)> {
        let mut env = vec![
            ("GDAL_DATA", self.root.join("share").join("gdal")),
            ("PROJ_DATA", self.root.join("share").join("proj")),
            ("PROJ_NETWORK", PathBuf::from("OFF")),
            // No plugin drivers and no .aux.xml next to the user's DEM.
            ("GDAL_DRIVER_PATH", PathBuf::from("disable")),
            ("GDAL_PAM_ENABLED", PathBuf::from("NO")),
            ("CPL_LOG_ERRORS", PathBuf::from("ON")),
        ];
        if cfg!(windows) {
            let system_root = std::env::var_os("SystemRoot")
                .map(PathBuf::from)
                .unwrap_or_else(|| PathBuf::from(r"C:\Windows"));
            let path = std::env::join_paths([
                self.root.join("bin"),
                system_root.join("System32"),
                system_root.clone(),
            ])
            .map(PathBuf::from)
            .unwrap_or_else(|_| self.root.join("bin"));
            env.push(("PATH", path));
        }
        env
    }

    /// Compare every shipped file with the manifest (size and SHA-256).
    pub fn verify_files(&self) -> Result<(), String> {
        if self.manifest.files.is_empty() {
            return Err("terrain runtime missing: manifest.json lists no files".into());
        }
        for file in &self.manifest.files {
            let path = self.root.join(&file.path);
            let actual = std::fs::metadata(&path).map(|meta| meta.len()).map_err(|error| {
                format!("terrain runtime missing: {} ({error})", file.path)
            })?;
            if actual != file.bytes {
                return Err(format!(
                    "terrain runtime missing: {} has {actual} bytes, manifest says {}",
                    file.path, file.bytes
                ));
            }
            if sha256_file(&path)? != file.sha256 {
                return Err(format!("terrain runtime missing: {} does not match manifest SHA-256", file.path));
            }
        }
        Ok(())
    }
}

fn sha256_file(path: &Path) -> Result<String, String> {
    let mut file = std::fs::File::open(path).map_err(|error| error.to_string())?;
    let mut hasher = Sha256::new();
    let mut buffer = vec![0u8; 1 << 16];
    loop {
        let count = file.read(&mut buffer).map_err(|error| error.to_string())?;
        if count == 0 {
            break;
        }
        hasher.update(&buffer[..count]);
    }
    Ok(hasher
        .finalize()
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect())
}

/// `terrain` entry of `processor capabilities --json`. Existence and manifest
/// only; hashes are checked when a task starts.
pub fn capability_json() -> Value {
    match locate(&default_root()) {
        RuntimeStatus::Ready(runtime) => json!({
            "ready": true,
            "root": runtime.root,
            "ctbCommit": runtime.manifest.ctb_commit,
            "gdalVersion": runtime.manifest.gdal_version,
            "projVersion": runtime.manifest.proj_version,
            "ctbPatchSetSha256": runtime.manifest.ctb_patch_set_sha256,
            "optionsVersion": geoforge_protocol::TERRAIN_OPTIONS_VERSION,
            "missing": [],
            "reason": Value::Null,
        }),
        RuntimeStatus::Missing { root, missing } => json!({
            "ready": false,
            "root": root,
            "ctbCommit": Value::Null,
            "gdalVersion": Value::Null,
            "projVersion": Value::Null,
            "optionsVersion": geoforge_protocol::TERRAIN_OPTIONS_VERSION,
            "missing": missing,
            "reason": "地形组件缺失，请修复安装",
        }),
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;

    /// A runtime folder with the required layout and a matching manifest.
    /// The "executables" are empty files; tests that need real tools are
    /// the integration tests in `tests/terrain_runtime.rs`.
    pub fn fake_runtime(root: &Path) {
        for name in REQUIRED_TOOLS {
            let path = root.join("bin").join(format!("{name}{}", std::env::consts::EXE_SUFFIX));
            std::fs::create_dir_all(path.parent().unwrap()).unwrap();
            std::fs::write(path, b"x").unwrap();
        }
        for rel in REQUIRED_DATA.iter().filter(|rel| **rel != "manifest.json") {
            let path = root.join(rel);
            std::fs::create_dir_all(path.parent().unwrap()).unwrap();
            std::fs::write(path, b"x").unwrap();
        }
        let hash = sha256_file(&root.join("share/proj/proj.db")).unwrap();
        std::fs::write(
            root.join("manifest.json"),
            json!({
                "ctbCommit": CTB_COMMIT,
                "gdalVersion": "3.10.3",
                "projVersion": "9.7.1",
                "demToolVersion": 7,
                "ctbPatches": CTB_PATCHES.iter().map(|(name, _)| *name).collect::<Vec<_>>(),
                "ctbPatchHashes": CTB_PATCHES.iter().map(|(name, content)| json!({ "name": name, "sha256": patch_sha256(content) })).collect::<Vec<_>>(),
                "ctbPatchSetSha256": expected_patch_set_sha256(),
                "files": [{ "path": "share/proj/proj.db", "bytes": 1, "sha256": hash }]
            })
            .to_string(),
        )
        .unwrap();
    }

    #[test]
    fn missing_runtime_lists_every_absent_file() {
        let dir = tempfile::tempdir().unwrap();
        let RuntimeStatus::Missing { missing, .. } = locate(dir.path()) else {
            panic!("empty folder must not be ready");
        };
        assert!(missing.iter().any(|item| item.starts_with("bin/ctb-tile")));
        assert!(missing.iter().any(|item| item == "share/proj/proj.db"));
        let error = locate(dir.path()).into_ready().unwrap_err();
        assert!(error.starts_with("terrain runtime missing"));
    }

    #[test]
    fn complete_runtime_is_ready_and_verifies() {
        let dir = tempfile::tempdir().unwrap();
        fake_runtime(dir.path());
        let runtime = locate(dir.path()).into_ready().unwrap();
        runtime.verify_files().unwrap();
        assert!(runtime.child_env().iter().any(|(key, _)| *key == "PROJ_DATA"));
    }

    #[test]
    fn tampered_file_or_wrong_ctb_commit_is_rejected() {
        let dir = tempfile::tempdir().unwrap();
        fake_runtime(dir.path());
        std::fs::write(dir.path().join("share/proj/proj.db"), b"y").unwrap();
        let runtime = locate(dir.path()).into_ready().unwrap();
        assert!(runtime.verify_files().unwrap_err().contains("SHA-256"));

        let manifest = std::fs::read_to_string(dir.path().join("manifest.json")).unwrap();
        std::fs::write(dir.path().join("manifest.json"), manifest.replace(CTB_COMMIT, "0000")).unwrap();
        assert!(matches!(locate(dir.path()), RuntimeStatus::Missing { .. }));
    }

    #[test]
    fn runtime_with_an_old_dem_tool_is_not_ready() {
        let dir = tempfile::tempdir().unwrap();
        fake_runtime(dir.path());
        let manifest = std::fs::read_to_string(dir.path().join("manifest.json")).unwrap();
        std::fs::write(dir.path().join("manifest.json"), manifest.replace("\"demToolVersion\":7", "\"demToolVersion\":6")).unwrap();
        let error = locate(dir.path()).into_ready().unwrap_err();
        assert!(error.contains("gf-dem-tool 7+"), "{error}");
    }

    #[test]
    fn patch_set_must_match_names_order_and_content() {
        let dir = tempfile::tempdir().unwrap();
        fake_runtime(dir.path());
        locate(dir.path()).into_ready().unwrap();
        let manifest = std::fs::read_to_string(dir.path().join("manifest.json")).unwrap();
        let expected = expected_patch_set_sha256();

        // Old runtime without the lock: not compatible.
        let mut value: Value = serde_json::from_str(&manifest).unwrap();
        // (shape written by the master-era build script: names only).
        value.as_object_mut().unwrap().remove("ctbPatchHashes");
        value.as_object_mut().unwrap().remove("ctbPatchSetSha256");
        value["ctbPatches"] = json!(["ctb-half-cell.patch", "ctb-edge-mask.patch"]);
        std::fs::write(dir.path().join("manifest.json"), value.to_string()).unwrap();
        let error = locate(dir.path()).into_ready().unwrap_err();
        assert!(error.contains("CTB 补丁集"), "{error}");

        // Same names, different content.
        let mut value: Value = serde_json::from_str(&manifest).unwrap();
        value["ctbPatchHashes"][0]["sha256"] = json!("00");
        std::fs::write(dir.path().join("manifest.json"), value.to_string()).unwrap();
        assert!(locate(dir.path()).into_ready().is_err());

        // Extra patch recorded.
        let mut value: Value = serde_json::from_str(&manifest).unwrap();
        value["ctbPatchHashes"].as_array_mut().unwrap().push(json!({ "name": "x.patch", "sha256": "00" }));
        value["ctbPatchSetSha256"] = json!(expected);
        std::fs::write(dir.path().join("manifest.json"), value.to_string()).unwrap();
        assert!(locate(dir.path()).into_ready().is_err());
    }

    #[test]
    fn patch_hash_ignores_line_endings_and_matches_the_build_script_rule() {
        assert_eq!(patch_sha256("a\r\nb\r\n"), patch_sha256("a\nb\n"));
        // sha256("") and the set rule "<name>:<sha>\n".
        assert_eq!(patch_sha256(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
        let one = patch_set_sha256([("a.patch", "00".to_string())]);
        assert_eq!(one, hex(&Sha256::digest(b"a.patch:00\n")));
    }

    /// The Rust list and the build script must name the same patches in the same order.
    #[test]
    fn build_script_applies_exactly_the_locked_patches() {
        let script = include_str!("../../../../../tools/terrain-runtime/build-terrain-runtime.ps1");
        let line = script.lines().find(|line| line.trim_start().starts_with("$CtbPatches = @(")).expect("$CtbPatches line");
        let names: Vec<&str> = line.split('"').skip(1).step_by(2).collect();
        let wanted: Vec<&str> = CTB_PATCHES.iter().map(|(name, _)| *name).collect();
        assert_eq!(names, wanted);
    }
}
