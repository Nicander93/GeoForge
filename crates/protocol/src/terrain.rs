//! Options for the `convert-terrain` operation (DEM -> Cesium quantized-mesh).
//!
//! The task keeps `TaskConfig` v1: `input.path` is the first source and
//! `options.terrain.sources` lists every source, the first one included.

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Bumped whenever a `convert-terrain` option changes meaning. Version 1
/// tasks are still accepted; see `TerrainOptions::projection_mode`.
pub const TERRAIN_OPTIONS_VERSION: u32 = 2;
pub const TERRAIN_OPTIONS_MIN_VERSION: u32 = 1;
/// A WKT2 definition of a projected CRS is a few KiB; this keeps the
/// definition well inside the Windows command-line limit.
pub const TERRAIN_CRS_MAX_CHARS: usize = 16 * 1024;
pub const TERRAIN_MAX_SOURCES: usize = 256;
pub const TERRAIN_MAX_DEPTH: u8 = 22;
pub const TERRAIN_MAX_SEARCH_PIXELS: u32 = 1_000;
/// Fill values outside this range are almost certainly a unit or sign mistake.
pub const TERRAIN_FILL_MIN_METERS: f64 = -12_000.0;
pub const TERRAIN_FILL_MAX_METERS: f64 = 9_000.0;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TerrainTaskOptions {
    pub terrain: TerrainOptions,
    /// Shared resource settings, read through `ExecutionOptions::parse`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub execution: Option<Value>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TerrainOptions {
    pub version: u32,
    pub sources: Vec<String>,
    /// Source CRS stated by the user: `EPSG:<code>`, WKT, PROJJSON or a PROJ
    /// string naming its datum/ellipsoid. It only says what the stored
    /// coordinates mean; nothing is transformed by it. GDAL/PROJ in the
    /// terrain runtime decides whether it is valid.
    #[serde(default)]
    pub crs_override: Option<String>,
    /// Required: the processor never assumes what the heights are relative to.
    pub vertical_datum: VerticalDatumOptions,
    #[serde(default)]
    pub no_data: NoDataPolicy,
    #[serde(default)]
    pub preprocess: TerrainPreprocessOptions,
    #[serde(default)]
    pub tiling: TerrainTilingOptions,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct VerticalDatumOptions {
    pub mode: VerticalDatumMode,
    /// The user accepted that heights are written unchanged.
    #[serde(default)]
    pub acknowledged: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum VerticalDatumMode {
    /// Heights are already ellipsoidal (what Cesium expects).
    Ellipsoidal,
    /// Orthometric/normal heights with a known datum, written without conversion.
    OrthometricKnown,
    Unknown,
}

/// How NoData pixels become heights. `Unresolved` is the default on purpose:
/// a task with NoData pixels and no decision fails instead of writing 0 m.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
#[serde(tag = "mode", rename_all = "kebab-case", deny_unknown_fields)]
pub enum NoDataPolicy {
    #[default]
    Unresolved,
    /// The user states there is nothing to fill; any NoData pixel fails the task.
    NoneRequired,
    ExplicitConstant {
        #[serde(rename = "valueMeters")]
        value_meters: f64,
    },
    /// GDAL inverse-distance fill; pixels farther than this from valid data fail the task.
    Interpolate {
        #[serde(rename = "maxSearchPixels")]
        max_search_pixels: u32,
    },
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TerrainPreprocessOptions {
    /// Absent means the version default, see `TerrainOptions::projection_mode`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub projection_mode: Option<ProjectionMode>,
    #[serde(default)]
    pub overview: OverviewMode,
    /// PROJ only knows a "ballpark" operation to WGS 84 for some datums
    /// (CGCS2000, Beijing 1954, Xian 1980 …): no datum shift, accuracy
    /// unknown. Such tasks fail unless the user accepts that explicitly.
    #[serde(default)]
    pub accept_ballpark_transform: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ProjectionMode {
    /// Warp every input that is not already WGS 84 geographic to EPSG:4326
    /// with GDAL before tiling.
    Normalize,
    /// GeoForge picks. Since T12.2 this normalizes everything that is not
    /// WGS 84 geographic (D1 evidence: docs/terrain/v1/05-v12-nodata-footprint.md).
    Auto,
    /// 已停用（V1.4 产品决定）：投影坐标数据一律先规范化到 WGS 84。
    /// 只为给旧任务一个明确的错误而保留解析，`validate` 会拒绝它。
    Direct,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum OverviewMode {
    #[default]
    Auto,
    Off,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TerrainTilingOptions {
    #[serde(default)]
    pub max_depth: MaxDepth,
    #[serde(default)]
    pub mesh_quality: MeshQuality,
    #[serde(default)]
    pub normals: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(untagged)]
pub enum MaxDepth {
    #[default]
    #[serde(with = "auto_literal")]
    Auto,
    Level(u8),
}

mod auto_literal {
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S: Serializer>(serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str("auto")
    }

    pub fn deserialize<'de, D: Deserializer<'de>>(deserializer: D) -> Result<(), D::Error> {
        let value = String::deserialize(deserializer)?;
        if value == "auto" {
            Ok(())
        } else {
            Err(serde::de::Error::custom("expected \"auto\" or a level number"))
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum MeshQuality {
    Fast,
    #[default]
    Balanced,
    High,
}

impl MeshQuality {
    /// CTB `-g` factor. `balanced` is the CTB default and `high` the value P0
    /// measured (M sample, RMSE about 0.38 m); `fast` is not measured yet.
    pub fn ctb_factor(self) -> f64 {
        match self {
            MeshQuality::Fast => 4.0,
            MeshQuality::Balanced => 1.0,
            MeshQuality::High => 0.25,
        }
    }
}

impl TerrainOptions {
    /// Version 1 tasks always normalized, so an absent field keeps that
    /// meaning; version 2 defaults to `auto`.
    pub fn projection_mode(&self) -> ProjectionMode {
        match self.preprocess.projection_mode {
            Some(mode) => mode,
            None if self.version == 1 => ProjectionMode::Normalize,
            None => ProjectionMode::Auto,
        }
    }

    pub fn validate(&self) -> Result<(), String> {
        if !(TERRAIN_OPTIONS_MIN_VERSION..=TERRAIN_OPTIONS_VERSION).contains(&self.version) {
            return Err(format!(
                "unsupported convert-terrain options version {}; expected {TERRAIN_OPTIONS_MIN_VERSION}..{TERRAIN_OPTIONS_VERSION}",
                self.version
            ));
        }
        if self.preprocess.projection_mode == Some(ProjectionMode::Direct) {
            return Err("invalid convert-terrain options: projectionMode=direct 已停用；投影坐标数据一律规范化到 WGS 84 后切片，请去掉该字段或改为 auto/normalize".into());
        }
        if self.sources.is_empty() {
            return Err("invalid convert-terrain options: terrain.sources is empty".into());
        }
        if self.sources.len() > TERRAIN_MAX_SOURCES {
            return Err(format!(
                "invalid convert-terrain options: at most {TERRAIN_MAX_SOURCES} sources"
            ));
        }
        if self.sources.iter().any(|source| source.trim().is_empty()) {
            return Err("invalid convert-terrain options: empty source path".into());
        }
        if let Some(crs) = &self.crs_override {
            if crs.trim().is_empty() {
                return Err("invalid convert-terrain options: crsOverride is empty".into());
            }
            if crs.len() > TERRAIN_CRS_MAX_CHARS {
                return Err(format!(
                    "invalid convert-terrain options: crsOverride is longer than {TERRAIN_CRS_MAX_CHARS} characters"
                ));
            }
        }
        if self.vertical_datum.mode != VerticalDatumMode::Ellipsoidal && !self.vertical_datum.acknowledged {
            return Err(
                "terrain vertical datum is not ellipsoidal: heights are written unchanged, \
                 so verticalDatum.acknowledged must be true"
                    .into(),
            );
        }
        match self.no_data {
            NoDataPolicy::ExplicitConstant { value_meters } => {
                if !value_meters.is_finite()
                    || !(TERRAIN_FILL_MIN_METERS..=TERRAIN_FILL_MAX_METERS).contains(&value_meters)
                {
                    return Err(format!(
                        "invalid convert-terrain options: noData.valueMeters must be between \
                         {TERRAIN_FILL_MIN_METERS} and {TERRAIN_FILL_MAX_METERS}"
                    ));
                }
            }
            NoDataPolicy::Interpolate { max_search_pixels } => {
                if !(1..=TERRAIN_MAX_SEARCH_PIXELS).contains(&max_search_pixels) {
                    return Err(format!(
                        "invalid convert-terrain options: noData.maxSearchPixels must be between 1 and {TERRAIN_MAX_SEARCH_PIXELS}"
                    ));
                }
            }
            NoDataPolicy::Unresolved | NoDataPolicy::NoneRequired => {}
        }
        if let MaxDepth::Level(level) = self.tiling.max_depth {
            if level > TERRAIN_MAX_DEPTH {
                return Err(format!(
                    "invalid convert-terrain options: tiling.maxDepth must be at most {TERRAIN_MAX_DEPTH}"
                ));
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn parse(value: Value) -> Result<TerrainTaskOptions, serde_json::Error> {
        serde_json::from_value(value)
    }

    fn minimal() -> Value {
        json!({
            "terrain": {
                "version": 2,
                "sources": ["D:/dem/a.tif"],
                "verticalDatum": { "mode": "ellipsoidal" }
            }
        })
    }

    #[test]
    fn defaults_leave_nodata_unresolved() {
        let options = parse(minimal()).unwrap().terrain;
        assert_eq!(options.no_data, NoDataPolicy::Unresolved);
        assert_eq!(options.projection_mode(), ProjectionMode::Auto);
        assert!(!options.preprocess.accept_ballpark_transform);
        assert_eq!(options.preprocess.overview, OverviewMode::Auto);
        assert_eq!(options.tiling.max_depth, MaxDepth::Auto);
        assert_eq!(options.tiling.mesh_quality, MeshQuality::Balanced);
        options.validate().unwrap();
    }

    #[test]
    fn parses_the_plan_example() {
        let options = parse(json!({
            "terrain": {
                "version": 1,
                "sources": ["D:/dem/dem1.tif", "D:/dem/dem2.tif"],
                "crsOverride": null,
                "verticalDatum": { "mode": "unknown", "acknowledged": true },
                "noData": { "mode": "explicit-constant", "valueMeters": 300.0 },
                "preprocess": { "projectionMode": "auto", "overview": "auto" },
                "tiling": { "maxDepth": "auto", "meshQuality": "balanced", "normals": false }
            },
            "execution": { "cpuWorkers": "auto", "memoryBudgetMiB": 4096, "resumePolicy": "off" }
        }))
        .unwrap()
        .terrain;
        assert_eq!(options.no_data, NoDataPolicy::ExplicitConstant { value_meters: 300.0 });
        assert_eq!(options.projection_mode(), ProjectionMode::Auto);
        options.validate().unwrap();
    }

    #[test]
    fn version_1_tasks_keep_normalizing_by_default() {
        let mut value = minimal();
        value["terrain"]["version"] = json!(1);
        let options = parse(value.clone()).unwrap().terrain;
        options.validate().unwrap();
        assert_eq!(options.projection_mode(), ProjectionMode::Normalize);
        value["terrain"]["preprocess"] = json!({ "projectionMode": "auto" });
        assert_eq!(parse(value.clone()).unwrap().terrain.projection_mode(), ProjectionMode::Auto);
        value["terrain"]["preprocess"] = json!({ "projectionMode": "direct" });
        let error = parse(value).unwrap().terrain.validate().unwrap_err();
        assert!(error.contains("projectionMode=direct"), "{error}");
        // An absent mode stays absent when the task is written back.
        let written = serde_json::to_value(parse(minimal()).unwrap().terrain).unwrap();
        assert!(written["preprocess"].get("projectionMode").is_none());
    }

    #[test]
    fn unknown_versions_are_rejected() {
        for version in [0, 3] {
            let mut value = minimal();
            value["terrain"]["version"] = json!(version);
            assert!(parse(value).unwrap().terrain.validate().unwrap_err().contains("version"));
        }
    }

    #[test]
    fn zero_is_a_legal_fill_value() {
        let mut value = minimal();
        value["terrain"]["noData"] = json!({ "mode": "explicit-constant", "valueMeters": 0.0 });
        parse(value).unwrap().terrain.validate().unwrap();
    }

    #[test]
    fn rejects_out_of_range_fill_and_search() {
        let mut value = minimal();
        value["terrain"]["noData"] = json!({ "mode": "explicit-constant", "valueMeters": -99999.0 });
        assert!(parse(value.clone()).unwrap().terrain.validate().is_err());
        value["terrain"]["noData"] = json!({ "mode": "interpolate", "maxSearchPixels": 0 });
        assert!(parse(value).unwrap().terrain.validate().is_err());
    }

    #[test]
    fn non_ellipsoidal_heights_need_acknowledgement() {
        let mut value = minimal();
        value["terrain"]["verticalDatum"] = json!({ "mode": "unknown" });
        let error = parse(value.clone()).unwrap().terrain.validate().unwrap_err();
        assert!(error.contains("acknowledged"));
        value["terrain"]["verticalDatum"] = json!({ "mode": "orthometric-known", "acknowledged": true });
        parse(value).unwrap().terrain.validate().unwrap();
    }

    #[test]
    fn missing_vertical_datum_and_unknown_fields_are_rejected() {
        let mut value = minimal();
        value["terrain"].as_object_mut().unwrap().remove("verticalDatum");
        assert!(parse(value).is_err());
        let mut value = minimal();
        value["terrain"]["noData"] = json!({ "mode": "fill-zero" });
        assert!(parse(value).is_err());
        let mut value = minimal();
        value["terrain"]["extra"] = json!(1);
        assert!(parse(value).is_err());
    }

    #[test]
    fn max_depth_accepts_auto_or_level() {
        let mut value = minimal();
        value["terrain"]["tiling"] = json!({ "maxDepth": 14 });
        assert_eq!(parse(value.clone()).unwrap().terrain.tiling.max_depth, MaxDepth::Level(14));
        value["terrain"]["tiling"] = json!({ "maxDepth": 30 });
        assert!(parse(value.clone()).unwrap().terrain.validate().is_err());
        value["terrain"]["tiling"] = json!({ "maxDepth": "deep" });
        assert!(parse(value).is_err());
        assert_eq!(serde_json::to_value(MaxDepth::Auto).unwrap(), json!("auto"));
    }

    #[test]
    fn crs_override_accepts_any_definition_text_but_not_empty_or_huge() {
        // Whether the text is a usable CRS is GDAL/PROJ's call in the processor.
        for crs in ["EPSG:4547", "GEOGCRS[\"x\"]", "+proj=longlat +datum=WGS84"] {
            let mut value = minimal();
            value["terrain"]["crsOverride"] = json!(crs);
            parse(value).unwrap().terrain.validate().unwrap();
        }
        for crs in ["  ".to_string(), "x".repeat(TERRAIN_CRS_MAX_CHARS + 1)] {
            let mut value = minimal();
            value["terrain"]["crsOverride"] = json!(crs);
            assert!(parse(value).unwrap().terrain.validate().is_err());
        }
    }

    #[test]
    fn mesh_quality_maps_to_fixed_ctb_factors() {
        assert_eq!(MeshQuality::High.ctb_factor(), 0.25);
        assert_eq!(MeshQuality::Balanced.ctb_factor(), 1.0);
        assert_eq!(MeshQuality::Fast.ctb_factor(), 4.0);
    }
}
