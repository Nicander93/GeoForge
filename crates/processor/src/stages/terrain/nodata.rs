//! NoData decision. The tiler writes NoData as 0 m, so the raster handed to
//! CTB must contain no NoData pixel at all; this module decides how to get
//! there or refuses.

use geoforge_protocol::NoDataPolicy;
use serde::Deserialize;

/// Output of `gf-dem-tool stats`.
#[derive(Debug, Clone, Copy, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RasterStats {
    pub valid_count: u64,
    pub no_data_count: u64,
    pub zero_count: u64,
    pub min: Option<f64>,
    pub max: Option<f64>,
}

impl RasterStats {
    pub fn no_data_ratio(&self) -> f64 {
        let total = self.valid_count + self.no_data_count;
        if total == 0 {
            0.0
        } else {
            self.no_data_count as f64 / total as f64
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum NoDataAction {
    Nothing,
    FillConstant(f64),
    Interpolate(u32),
}

/// Pixels of the tiling grid that need a height, split by origin. Only
/// `holes` (NoData inside the source footprint) is the user's decision;
/// `outside` comes from reprojecting onto a rectangle and gets auxiliary
/// heights instead (see `gf-dem-footprint.cpp`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FootprintCounts {
    pub valid_count: u64,
    pub source_hole_count: u64,
    pub outside_count: u64,
}

impl FootprintCounts {
    /// Without reprojection every NoData pixel lies inside the source.
    pub fn from_stats(stats: &RasterStats) -> Self {
        FootprintCounts { valid_count: stats.valid_count, source_hole_count: stats.no_data_count, outside_count: 0 }
    }
}

pub fn decide(policy: &NoDataPolicy, counts: &FootprintCounts) -> Result<NoDataAction, String> {
    if counts.valid_count == 0 {
        return Err("terrain input: 没有任何有效高程像元".into());
    }
    if counts.source_hole_count == 0 {
        return Ok(NoDataAction::Nothing);
    }
    let count = counts.source_hole_count;
    let percent = count as f64 / (counts.valid_count + count) as f64 * 100.0;
    let origin = format!("源数据范围内有 {count} 个 NoData 像元（占范围内的 {percent:.2}%）");
    match policy {
        NoDataPolicy::Unresolved => Err(format!(
            "terrain nodata policy required: {origin}。切片引擎会把它们写成 0 m，请在任务中选择填补方式（常数或邻域插值）"
        )),
        NoDataPolicy::NoneRequired => Err(format!(
            "terrain nodata policy required: 任务声明无须填补，但{origin}"
        )),
        NoDataPolicy::ExplicitConstant { value_meters } => Ok(NoDataAction::FillConstant(*value_meters)),
        NoDataPolicy::Interpolate { max_search_pixels } => Ok(NoDataAction::Interpolate(*max_search_pixels)),
    }
}

/// What happens when IDW extension fills a large area between several
/// sources. V1.4 默认 `Fail`；阈值和动作都集中在这里，待产品决定后只改
/// `AuxiliaryGapPolicy::default()` 一处即可。
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum AuxiliaryGapMode {
    /// 阻断任务（V1.4 默认）。
    Fail,
    /// 继续出图，但在报告里写入警告。
    Warn,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct AuxiliaryGapPolicy {
    /// 辅助像元占切片范围的比例达到此值即触发。
    pub max_ratio: f64,
    pub mode: AuxiliaryGapMode,
}

/// V1.4 初值：5%，阻断。
pub const AUXILIARY_GAP_RATIO: f64 = 0.05;

impl Default for AuxiliaryGapPolicy {
    fn default() -> Self {
        Self { max_ratio: AUXILIARY_GAP_RATIO, mode: AuxiliaryGapMode::Fail }
    }
}

/// Outcome of the gap check. The ratio is always recorded in the report.
#[derive(Debug, Clone, PartialEq)]
pub enum AuxiliaryGapVerdict {
    Ok,
    Warn(String),
    Fail(String),
}

pub fn auxiliary_ratio(auxiliary: u64, counts: &FootprintCounts) -> f64 {
    let total = counts.valid_count + counts.source_hole_count + counts.outside_count;
    if total == 0 { 0.0 } else { auxiliary as f64 / total as f64 }
}

/// One source only gets a thin reprojection rim, so it never trips this gate.
pub fn check_auxiliary_gap(
    policy: &AuxiliaryGapPolicy,
    source_count: usize,
    auxiliary: u64,
    counts: &FootprintCounts,
) -> AuxiliaryGapVerdict {
    let ratio = auxiliary_ratio(auxiliary, counts);
    if source_count < 2 || auxiliary == 0 || ratio < policy.max_ratio {
        return AuxiliaryGapVerdict::Ok;
    }
    let text = format!(
        "多个源之间有 {auxiliary} 个像元（占切片范围 {:.1}%）不在任何源的覆盖范围内。外推会在三维场景里显示成假地形；请拆成独立地形任务或先准备连续 DEM（阈值 {:.0}%）",
        ratio * 100.0,
        policy.max_ratio * 100.0
    );
    match policy.mode {
        AuxiliaryGapMode::Fail => AuxiliaryGapVerdict::Fail(text),
        AuxiliaryGapMode::Warn => AuxiliaryGapVerdict::Warn(text),
    }
}

pub fn policy_name(policy: &NoDataPolicy) -> &'static str {
    match policy {
        NoDataPolicy::Unresolved => "unresolved",
        NoDataPolicy::NoneRequired => "none-required",
        NoDataPolicy::ExplicitConstant { .. } => "explicit-constant",
        NoDataPolicy::Interpolate { .. } => "interpolate",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn auxiliary_gap_default_fails_only_for_large_gaps_between_sources() {
        let policy = AuxiliaryGapPolicy::default();
        assert_eq!(policy.mode, AuxiliaryGapMode::Fail);
        assert_eq!(policy.max_ratio, 0.05);
        let grid = FootprintCounts { valid_count: 900, source_hole_count: 0, outside_count: 100 };
        match check_auxiliary_gap(&policy, 2, 100, &grid) {
            AuxiliaryGapVerdict::Fail(text) => assert!(text.contains("10.0%"), "{text}"),
            other => panic!("{other:?}"),
        }
        // A single source's reprojection rim never trips.
        assert_eq!(check_auxiliary_gap(&policy, 1, 100, &grid), AuxiliaryGapVerdict::Ok);
        // Below 5% stays quiet.
        let small = FootprintCounts { valid_count: 960, source_hole_count: 0, outside_count: 40 };
        assert_eq!(check_auxiliary_gap(&policy, 3, 40, &small), AuxiliaryGapVerdict::Ok);
        assert_eq!(check_auxiliary_gap(&policy, 2, 0, &grid), AuxiliaryGapVerdict::Ok);
    }

    #[test]
    fn auxiliary_gap_policy_threshold_and_mode_are_configurable() {
        let grid = FootprintCounts { valid_count: 900, source_hole_count: 0, outside_count: 100 };
        let warn = AuxiliaryGapPolicy { max_ratio: 0.05, mode: AuxiliaryGapMode::Warn };
        assert!(matches!(check_auxiliary_gap(&warn, 2, 100, &grid), AuxiliaryGapVerdict::Warn(_)));
        let loose = AuxiliaryGapPolicy { max_ratio: 0.2, mode: AuxiliaryGapMode::Fail };
        assert_eq!(check_auxiliary_gap(&loose, 2, 100, &grid), AuxiliaryGapVerdict::Ok);
        assert!((auxiliary_ratio(100, &grid) - 0.1).abs() < 1e-12);
    }

    fn counts(holes: u64, outside: u64) -> FootprintCounts {
        FootprintCounts { valid_count: 100 - holes, source_hole_count: holes, outside_count: outside }
    }

    #[test]
    fn holes_without_a_policy_fail_instead_of_becoming_zero() {
        let error = decide(&NoDataPolicy::Unresolved, &counts(4, 0)).unwrap_err();
        assert!(error.starts_with("terrain nodata policy required"));
        assert!(error.contains("4 个"));
    }

    #[test]
    fn legal_zero_heights_need_no_decision() {
        let stats = RasterStats { valid_count: 100, no_data_count: 0, zero_count: 5, min: Some(0.0), max: Some(10.0) };
        let counts = FootprintCounts::from_stats(&stats);
        assert_eq!(decide(&NoDataPolicy::Unresolved, &counts).unwrap(), NoDataAction::Nothing);
        assert_eq!(decide(&NoDataPolicy::NoneRequired, &counts).unwrap(), NoDataAction::Nothing);
    }

    #[test]
    fn none_required_is_checked_against_the_data() {
        assert!(decide(&NoDataPolicy::NoneRequired, &counts(1, 0)).is_err());
    }

    #[test]
    fn reprojection_frame_alone_needs_no_decision() {
        assert_eq!(decide(&NoDataPolicy::Unresolved, &counts(0, 3000)).unwrap(), NoDataAction::Nothing);
        assert_eq!(decide(&NoDataPolicy::NoneRequired, &counts(0, 3000)).unwrap(), NoDataAction::Nothing);
        // A real hole still asks, however large the frame is.
        assert!(decide(&NoDataPolicy::Unresolved, &counts(1, 3000)).is_err());
    }

    #[test]
    fn explicit_policies_map_to_actions() {
        let constant = NoDataPolicy::ExplicitConstant { value_meters: 0.0 };
        assert_eq!(decide(&constant, &counts(3, 0)).unwrap(), NoDataAction::FillConstant(0.0));
        let interpolate = NoDataPolicy::Interpolate { max_search_pixels: 20 };
        assert_eq!(decide(&interpolate, &counts(3, 0)).unwrap(), NoDataAction::Interpolate(20));
    }

    #[test]
    fn raster_without_valid_pixels_fails() {
        let empty = FootprintCounts { valid_count: 0, source_hole_count: 100, outside_count: 0 };
        assert!(decide(&NoDataPolicy::ExplicitConstant { value_meters: 1.0 }, &empty).is_err());
    }
}
