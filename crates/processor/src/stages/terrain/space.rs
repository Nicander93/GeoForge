//! Disk space for terrain tasks (T14.4, G3).
//!
//! Before any work starts the task estimates how much room its temporary
//! files and tiles need on the output disk, warns with `LOW_DISK_SPACE` like
//! the other task types, and stops when the space is clearly insufficient.
//! A tool that fails while the disk is (nearly) full is reported as
//! "out of disk space" instead of the tool's own, often vague, message.

use super::inspect::RasterInfo;
use crate::protocol::Emitter;
use serde_json::json;
use std::path::Path;

const MIB: u64 = 1024 * 1024;

/// A tool failure with less than this free next to its files is treated as
/// "disk full", whatever the tool printed (gdaladdo only says
/// "Overview building failed").
pub const NEAR_FULL_BYTES: u64 = 128 * MIB;

/// Test hook: pretend the output disk has this many bytes free.
const FREE_OVERRIDE_ENV: &str = "GEOFORGE_TERRAIN_FREE_BYTES_OVERRIDE";

/// What the task will write, decided before it starts.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Workload {
    /// Sum of width x height x 4 bytes (Float32) over the sources.
    pub raw_bytes: u64,
    /// Reprojected copy of the DEM (normalize route or mixed sources).
    pub normalize: bool,
    /// Filled mosaic of several sources.
    pub fills: bool,
    /// Overviews built in the work folder.
    pub overview: bool,
}

impl Workload {
    pub fn from_sources(infos: &[RasterInfo], normalize: bool, overview_auto: bool, overview_min_pixels: u64) -> Self {
        let raw_bytes = infos.iter().map(|info| info.width.saturating_mul(info.height).saturating_mul(4)).sum();
        let pixels: u64 = infos.iter().map(|info| info.width.saturating_mul(info.height)).sum();
        Self {
            raw_bytes,
            normalize,
            // A NoData tag alone does not mean a filled copy: D4 carries one but
            // has no NoData pixels and peaked at 613 MiB. Single-source fills are
            // only known after the scan; a disk that runs out then is reported
            // as TERRAIN_DISK_FULL.
            fills: infos.len() > 1,
            overview: overview_auto && pixels > overview_min_pixels && !infos.iter().all(|info| info.has_overviews),
        }
    }

    /// Peak bytes on the output disk. Calibrated on LM (V1.4): D4
    /// (24000 x 24000 Float32, 2197 MiB raw, WGS 84, overviews) peaked at
    /// 613 MiB of temporary files and 13.5 MiB of tiles; M at 68 MiB.
    /// Compressed GTiff copies (warp, fill) are counted at 60 % of raw size.
    pub fn required_bytes(&self) -> u64 {
        let raw = self.raw_bytes;
        let mut need = raw / 50 + 64 * MIB;
        if self.normalize {
            need += raw / 5 * 3;
        }
        if self.fills {
            need += raw / 5 * 3;
        }
        if self.overview {
            need += raw / 4;
        }
        need
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Verdict {
    Enough,
    /// Emit LOW_DISK_SPACE and go on.
    Low,
    /// Stop before starting.
    Insufficient,
}

/// `threshold` is the LOW_DISK_SPACE threshold shared with the other task
/// types. Below 3/4 of the estimate the task cannot finish; below 1.5x (or
/// the threshold) it may.
pub fn verdict(free: u64, required: u64, threshold: u64) -> Verdict {
    if free < required / 4 * 3 {
        Verdict::Insufficient
    } else if free < threshold.max(required / 2 * 3) {
        Verdict::Low
    } else {
        Verdict::Enough
    }
}

/// Free bytes on the disk holding `path` (or its nearest existing parent).
pub fn free_bytes_near(path: &Path) -> Option<u64> {
    if let Some(value) = std::env::var(FREE_OVERRIDE_ENV).ok().and_then(|text| text.parse().ok()) {
        return Some(value);
    }
    path.ancestors().find(|dir| dir.exists()).and_then(crate::path_policy::available_space_bytes)
}

pub fn format_bytes(bytes: u64) -> String {
    if bytes >= 1024 * MIB {
        format!("{:.1} GiB", bytes as f64 / (1024 * MIB) as f64)
    } else {
        format!("{} MiB", bytes / MIB)
    }
}

/// Check before the task writes anything.
pub fn precheck(emitter: &Emitter, output: &Path, workload: &Workload) -> Result<(), String> {
    let required = workload.required_bytes();
    let parent = output.parent().unwrap_or(output);
    let Some(free) = free_bytes_near(parent) else {
        return Ok(());
    };
    emitter.metric(
        "terrain.diskEstimate",
        json!({ "freeBytes": free, "requiredBytes": required, "rawBytes": workload.raw_bytes,
                "normalize": workload.normalize, "fills": workload.fills, "overview": workload.overview }),
    );
    let threshold = crate::pipeline::low_disk_threshold_bytes();
    match verdict(free, required, threshold) {
        Verdict::Insufficient => Err(format!(
            "terrain disk space insufficient: 磁盘空间不足：输出目录所在磁盘只剩 {}，本任务预计需要约 {}（临时文件和成果）。请清理磁盘，或把输出目录换到空间更大的磁盘后重试。",
            format_bytes(free),
            format_bytes(required)
        )),
        Verdict::Low => {
            crate::pipeline::report_output_space(emitter, Some(free));
            if free >= threshold {
                // report_output_space only warns below the shared threshold.
                emitter.warning(
                    "LOW_DISK_SPACE",
                    &format!(
                        "output parent has {free} bytes free; this terrain task is estimated to need about {required} bytes"
                    ),
                );
            }
            Ok(())
        }
        Verdict::Enough => {
            crate::pipeline::report_output_space(emitter, Some(free));
            Ok(())
        }
    }
}

/// Texts that mean "no room" from Windows, GDAL and the C runtime.
pub fn looks_like_disk_full(text: &str) -> bool {
    let lower = text.to_ascii_lowercase();
    ["no space left", "not enough space", "disk full", "disk is full", "os error 112", "error 112", "insufficient disk", "free disk space"]
        .iter()
        .any(|pattern| lower.contains(pattern))
}

/// Turn a failure into the "out of disk space" error when the text says so
/// or the disk next to `probe` is nearly full.
pub fn classify_failure(message: String, probe: &[&Path]) -> String {
    if message.starts_with("terrain disk") {
        return message;
    }
    let free = probe.iter().find_map(|path| free_bytes_near(path));
    let full = looks_like_disk_full(&message) || free.is_some_and(|value| value < NEAR_FULL_BYTES);
    if !full {
        return message;
    }
    disk_full_message(&message, free)
}

pub fn disk_full_message(original: &str, free: Option<u64>) -> String {
    let left = free.map(|value| format!("（所在磁盘只剩 {}）", format_bytes(value))).unwrap_or_default();
    format!(
        "terrain disk full: 磁盘空间不足，处理中途写入失败{left}。已写入的临时文件会被清理；请清理磁盘，或把输出目录换到空间更大的磁盘后重试。（原始错误：{original}）"
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    const D4_RAW: u64 = 24000 * 24000 * 4;

    #[test]
    fn d4_estimate_covers_the_measured_peak_and_rejects_400_mib() {
        let d4 = Workload { raw_bytes: D4_RAW, normalize: false, fills: false, overview: true };
        let required = d4.required_bytes();
        // Measured on LM: 613 MiB temp + 13.5 MiB tiles; failed with 400 MiB free, passed with 750.
        assert!(required > 627 * MIB && required < 800 * MIB, "{}", format_bytes(required));
        assert_eq!(verdict(400 * MIB, required, 1024 * MIB), Verdict::Insufficient);
        assert_eq!(verdict(750 * MIB, required, 1024 * MIB), Verdict::Low);
        assert_eq!(verdict(2000 * MIB, required, 1024 * MIB), Verdict::Enough);
    }

    #[test]
    fn reprojection_and_fill_add_copies() {
        let base = Workload { raw_bytes: D4_RAW, normalize: false, fills: false, overview: false };
        let both = Workload { normalize: true, fills: true, ..base };
        assert!(both.required_bytes() > base.required_bytes() + D4_RAW);
    }

    #[test]
    fn low_warning_also_applies_above_the_shared_threshold() {
        let required = 4096 * MIB;
        assert_eq!(verdict(5000 * MIB, required, 1024 * MIB), Verdict::Low);
        assert_eq!(verdict(7000 * MIB, required, 1024 * MIB), Verdict::Enough);
    }

    #[test]
    fn disk_full_texts_are_recognised() {
        assert!(looks_like_disk_full("There is not enough space on the disk. (os error 112)"));
        assert!(looks_like_disk_full("ERROR 3: Free disk space available is 1024 bytes, whereas 8192 are at least necessary."));
        assert!(looks_like_disk_full("write failed: No space left on device"));
        assert!(!looks_like_disk_full("terrain tool failed: gdaladdo exited with 1: unsupported resampling"));
    }

    #[test]
    fn classify_wraps_disk_full_and_keeps_other_errors() {
        let wrapped = classify_failure("terrain tool failed: gdal_translate exited with 1: No space left on device".into(), &[]);
        assert!(wrapped.starts_with("terrain disk full: 磁盘空间不足"), "{wrapped}");
        assert!(wrapped.contains("No space left on device"));
        let kept = classify_failure("terrain tool failed: gdaladdo exited with 1: bad option".into(), &[]);
        assert!(kept.starts_with("terrain tool failed"));
        assert_eq!(classify_failure(wrapped.clone(), &[]), wrapped);
    }
}
