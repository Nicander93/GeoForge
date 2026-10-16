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

/// How the footprint tool split the pixels outside every source
/// (`gf-dem-tool footprint … --gaps`, dem-tool 6). Extents are in the CRS of
/// the tiled raster (EPSG:4326), `[minX, minY, maxX, maxY]`.
#[derive(Debug, Clone, PartialEq, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct GapScan {
    pub gaps_classified: bool,
    /// Narrow NoData frame from reprojection, outside the hull of the data.
    pub border_count: u64,
    pub border_extent: Option<[f64; 4]>,
    /// Narrow seam pixels where sources meet (inside the hull, outside every
    /// source, at most 8 px wide by construction of the tool).
    pub gap_count: u64,
    pub gap_max_distance_px: f64,
    pub gap_extent: Option<[f64; 4]>,
    /// Set by the fill run.
    pub gap_filled_count: u64,
    /// Wide blank areas outside every source (an L-shape's missing corner,
    /// space between separated sources) and what connects to them: outside
    /// the data, written as 0 m, neither filled nor blocked (V1.4 用户决定).
    pub outside_data_count: u64,
    pub outside_data_extent: Option<[f64; 4]>,
}

impl GapScan {
    /// Upper bound of the gap width: twice the largest distance from a gap
    /// pixel to the nearest source pixel.
    pub fn gap_width_px(&self) -> f64 {
        2.0 * self.gap_max_distance_px
    }
}

/// Limits for filling seams between several DEMs (V1.4 产品决定). Wide
/// blank areas never reach this check: the tool classifies them as outside
/// the data. A seam over the area limit still blocks.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SourceGapPolicy {
    /// Gap pixels / all pixels of the tiling grid.
    pub max_area_ratio: f64,
    /// Upper bound of the gap width in pixels (see `GapScan::gap_width_px`).
    pub max_width_px: f64,
}

/// V1.4 初值：面积 5%，宽度 8 像元。
pub const SOURCE_GAP_MAX_AREA_RATIO: f64 = 0.05;
pub const SOURCE_GAP_MAX_WIDTH_PX: f64 = 8.0;

impl Default for SourceGapPolicy {
    fn default() -> Self {
        Self { max_area_ratio: SOURCE_GAP_MAX_AREA_RATIO, max_width_px: SOURCE_GAP_MAX_WIDTH_PX }
    }
}

pub fn grid_ratio(count: u64, counts: &FootprintCounts) -> f64 {
    let total = counts.valid_count + counts.source_hole_count + counts.outside_count;
    if total == 0 { 0.0 } else { count as f64 / total as f64 }
}

/// `Ok(true)`: a narrow seam that may be filled (and is recorded);
/// `Ok(false)`: no gap; `Err`: an obvious blank area, the task is blocked.
pub fn check_source_gap(policy: &SourceGapPolicy, scan: &GapScan, counts: &FootprintCounts) -> Result<bool, String> {
    if scan.gap_count == 0 {
        return Ok(false);
    }
    let ratio = grid_ratio(scan.gap_count, counts);
    let width = scan.gap_width_px();
    if ratio <= policy.max_area_ratio && width <= policy.max_width_px {
        return Ok(true);
    }
    Err(format!(
        "terrain source gap blocked: 多个 DEM 之间有 {} 个像元不在任何源的覆盖范围内（占切片范围 {:.2}%，最宽约 {:.0} 像元；\
         允许自动补缝的上限是 {:.0}% 且 {:.0} 像元）。这片空白会被外推成假地形，请先修补数据，或把这些 DEM 拆成独立的地形任务",
        scan.gap_count,
        ratio * 100.0,
        width,
        policy.max_area_ratio * 100.0,
        policy.max_width_px
    ))
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

    fn scan(gaps: u64, distance: f64) -> GapScan {
        GapScan { gaps_classified: true, gap_count: gaps, gap_max_distance_px: distance, ..GapScan::default() }
    }

    #[test]
    fn source_gaps_fill_only_when_narrow_and_small() {
        let policy = SourceGapPolicy::default();
        assert_eq!((policy.max_area_ratio, policy.max_width_px), (0.05, 8.0));
        let grid = FootprintCounts { valid_count: 9_000, source_hole_count: 0, outside_count: 1_000 };
        assert_eq!(check_source_gap(&policy, &scan(0, 0.0), &grid), Ok(false));
        // 1% of the grid, 4 px from data at most (8 px wide): a seam.
        assert_eq!(check_source_gap(&policy, &scan(100, 4.0), &grid), Ok(true));
        // Narrow but large in area: blocked.
        let error = check_source_gap(&policy, &scan(600, 1.0), &grid).unwrap_err();
        assert!(error.starts_with("terrain source gap blocked"), "{error}");
        assert!(error.contains("6.00%"), "{error}");
        // Small in area but wide: blocked.
        assert!(check_source_gap(&policy, &scan(100, 4.5), &grid).is_err());
    }

    #[test]
    fn source_gap_limits_are_one_struct() {
        let grid = FootprintCounts { valid_count: 9_000, source_hole_count: 0, outside_count: 1_000 };
        let loose = SourceGapPolicy { max_area_ratio: 0.1, max_width_px: 20.0 };
        assert_eq!(check_source_gap(&loose, &scan(600, 9.0), &grid), Ok(true));
        assert!((grid_ratio(100, &grid) - 0.01).abs() < 1e-12);
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
