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

/// `source_no_data` is the NoData count of the inputs before warping, so the
/// message can tell the user whether holes came from the data or from the
/// reprojection frame around it.
pub fn decide(policy: &NoDataPolicy, prepared: &RasterStats, source_no_data: u64, warped: bool) -> Result<NoDataAction, String> {
    if prepared.valid_count == 0 {
        return Err("terrain input: 没有任何有效高程像元".into());
    }
    if prepared.no_data_count == 0 {
        return Ok(NoDataAction::Nothing);
    }
    let count = prepared.no_data_count;
    let percent = prepared.no_data_ratio() * 100.0;
    let origin = if warped && source_no_data == 0 {
        format!("源数据本身没有 NoData，{count} 个 NoData 像元（{percent:.2}%）是重投影后在数据外围产生的")
    } else if warped {
        format!("源数据有 {source_no_data} 个 NoData 像元，重投影后共 {count} 个（{percent:.2}%，含数据外围）")
    } else {
        format!("发现 {count} 个 NoData 像元（{percent:.2}%）")
    };
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

    fn stats(no_data: u64) -> RasterStats {
        RasterStats { valid_count: 100 - no_data, no_data_count: no_data, zero_count: 5, min: Some(0.0), max: Some(10.0) }
    }

    #[test]
    fn holes_without_a_policy_fail_instead_of_becoming_zero() {
        let error = decide(&NoDataPolicy::Unresolved, &stats(4), 4, false).unwrap_err();
        assert!(error.starts_with("terrain nodata policy required"));
        assert!(error.contains("4 个"));
    }

    #[test]
    fn legal_zero_heights_need_no_decision() {
        // zero_count is 5 here: zeros are valid heights, not NoData.
        assert_eq!(decide(&NoDataPolicy::Unresolved, &stats(0), 0, false).unwrap(), NoDataAction::Nothing);
        assert_eq!(decide(&NoDataPolicy::NoneRequired, &stats(0), 0, false).unwrap(), NoDataAction::Nothing);
    }

    #[test]
    fn none_required_is_checked_against_the_data() {
        assert!(decide(&NoDataPolicy::NoneRequired, &stats(1), 1, false).is_err());
    }

    #[test]
    fn warp_frame_is_reported_separately() {
        let error = decide(&NoDataPolicy::Unresolved, &stats(30), 0, true).unwrap_err();
        assert!(error.contains("重投影后在数据外围产生"));
    }

    #[test]
    fn explicit_policies_map_to_actions() {
        let constant = NoDataPolicy::ExplicitConstant { value_meters: 0.0 };
        assert_eq!(decide(&constant, &stats(3), 3, false).unwrap(), NoDataAction::FillConstant(0.0));
        let interpolate = NoDataPolicy::Interpolate { max_search_pixels: 20 };
        assert_eq!(decide(&interpolate, &stats(3), 3, false).unwrap(), NoDataAction::Interpolate(20));
    }

    #[test]
    fn raster_without_valid_pixels_fails() {
        let empty = RasterStats { valid_count: 0, no_data_count: 100, ..stats(0) };
        assert!(decide(&NoDataPolicy::ExplicitConstant { value_meters: 1.0 }, &empty, 100, false).is_err());
    }
}
