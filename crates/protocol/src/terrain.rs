//! Options for the `convert-terrain` operation (DEM -> Cesium quantized-mesh).
//!
//! The task keeps `TaskConfig` v1: `input.path` is the first source and
//! `options.terrain.sources` lists every source, the first one included.

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Bumped whenever a `convert-terrain` option changes meaning.
pub const TERRAIN_OPTIONS_VERSION: u32 = 1;
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
    /// "EPSG:<code>", used only when the user states the source CRS.
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
    #[serde(default)]
    pub projection_mode: ProjectionMode,
    #[serde(default)]
    pub overview: OverviewMode,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum ProjectionMode {
    /// Warp every non-EPSG:4326 input to EPSG:4326 before tiling (P0 rule).
    #[default]
    Normalize,
    /// Reserved for letting CTB reproject validated inputs directly. Until the
    /// direct path has its comparison tests it resolves to `Normalize`.
    Auto,
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
    pub fn validate(&self) -> Result<(), String> {
        if self.version != TERRAIN_OPTIONS_VERSION {
            return Err(format!(
                "unsupported convert-terrain options version {}; expected {TERRAIN_OPTIONS_VERSION}",
                self.version
            ));
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
            if parse_epsg(crs).is_none() {
                return Err(format!(
                    "invalid convert-terrain options: crsOverride must look like EPSG:4547, got {crs}"
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

/// "EPSG:4547" -> 4547.
pub fn parse_epsg(value: &str) -> Option<u32> {
    let code = value.trim().strip_prefix("EPSG:").or_else(|| value.trim().strip_prefix("epsg:"))?;
    code.parse().ok().filter(|code| *code > 0)
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
                "version": 1,
                "sources": ["D:/dem/a.tif"],
                "verticalDatum": { "mode": "ellipsoidal" }
            }
        })
    }

    #[test]
    fn defaults_leave_nodata_unresolved() {
        let options = parse(minimal()).unwrap().terrain;
        assert_eq!(options.no_data, NoDataPolicy::Unresolved);
        assert_eq!(options.preprocess.projection_mode, ProjectionMode::Normalize);
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
        assert_eq!(options.preprocess.projection_mode, ProjectionMode::Auto);
        options.validate().unwrap();
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
    fn crs_override_must_be_epsg() {
        assert_eq!(parse_epsg("EPSG:4547"), Some(4547));
        assert_eq!(parse_epsg("4547"), None);
        let mut value = minimal();
        value["terrain"]["crsOverride"] = json!("+proj=longlat");
        assert!(parse(value).unwrap().terrain.validate().is_err());
    }

    #[test]
    fn mesh_quality_maps_to_fixed_ctb_factors() {
        assert_eq!(MeshQuality::High.ctb_factor(), 0.25);
        assert_eq!(MeshQuality::Balanced.ctb_factor(), 1.0);
        assert_eq!(MeshQuality::Fast.ctb_factor(), 4.0);
    }
}
