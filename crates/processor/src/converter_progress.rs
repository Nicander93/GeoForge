//! Parse `_3dtile` OSGB stderr lines for block-level progress.
//!
//! The converter must keep stdout closed on Windows (OSG crash); progress is
//! only available on stderr as env_logger text. Matching is best-effort: if
//! the format drifts, callers fall back to indeterminate progress.

use regex::Regex;
use std::sync::OnceLock;

#[derive(Debug, Clone, Default)]
pub struct ConverterBlockProgress {
    pub blocks: Option<u64>,
    pub reused: u64,
    pub to_process: Option<u64>,
    pub completed: u64,
    pub failed: u64,
    pub all_already_done: bool,
    pub saw_config: bool,
}

impl ConverterBlockProgress {
    /// Units finished toward the original block count (reused + completed + failed).
    pub fn units_done(&self) -> u64 {
        if self.all_already_done {
            return self.blocks.unwrap_or(self.reused);
        }
        self.reused + self.completed + self.failed
    }

    pub fn total(&self) -> Option<u64> {
        self.blocks.or(self.to_process.map(|p| p + self.reused))
    }

    /// Returns true when this line changed progress state.
    pub fn ingest_line(&mut self, line: &str) -> bool {
        // Strip common env_logger prefix: "INFO: 2026-... - message" or "INFO - message"
        let msg = strip_log_prefix(line);

        if let Some(caps) = config_re().captures(msg) {
            let blocks: u64 = caps.name("blocks").and_then(|m| m.as_str().parse().ok()).unwrap_or(0);
            let reused: u64 = caps.name("reused").and_then(|m| m.as_str().parse().ok()).unwrap_or(0);
            let to_process: u64 = caps
                .name("to_process")
                .and_then(|m| m.as_str().parse().ok())
                .unwrap_or(blocks.saturating_sub(reused));
            self.blocks = Some(blocks);
            self.reused = reused;
            self.to_process = Some(to_process);
            self.saw_config = true;
            self.all_already_done = to_process == 0 && blocks > 0;
            return true;
        }

        if msg.contains("All blocks already completed") {
            self.all_already_done = true;
            if self.blocks.is_none() && self.reused > 0 {
                self.blocks = Some(self.reused);
            }
            return true;
        }

        if completed_re().is_match(msg) {
            self.completed += 1;
            return true;
        }
        if failed_re().is_match(msg) {
            self.failed += 1;
            return true;
        }
        false
    }
}

fn strip_log_prefix(line: &str) -> &str {
    // "INFO: 2026-10-10 12:00:00 - message" (geoforge-converter format)
    if let Some(idx) = line.find(" - ") {
        let head = &line[..idx];
        if head.contains("INFO") || head.contains("WARN") || head.contains("ERROR") || head.contains("DEBUG") {
            return &line[idx + 3..];
        }
    }
    // "INFO - message"
    for level in ["INFO: ", "WARN: ", "ERROR: ", "DEBUG: ", "INFO ", "WARN ", "ERROR ", "DEBUG "] {
        if let Some(rest) = line.strip_prefix(level) {
            return rest;
        }
    }
    // "[stderr] INFO: ..." may already be stripped by caller
    line
}

fn config_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(
            r"OSGB conversion config:\s*blocks=(?P<blocks>\d+)\s*,\s*reused=(?P<reused>\d+)\s*,\s*to_process=(?P<to_process>\d+)",
        )
        .expect("config regex")
    })
}

fn completed_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"Block\s+\S+\s+completed successfully").expect("completed regex"))
}

fn failed_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"Block\s+\S+\s+failed:").expect("failed regex"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_config_and_blocks() {
        let mut p = ConverterBlockProgress::default();
        assert!(p.ingest_line(
            "INFO: 2026-10-10 12:00:00 - OSGB conversion config: blocks=10, reused=2, to_process=8, threads=4, queue_capacity=8, max_lvl=20, texture_compress=false, meshopt=false, draco=false, unlit=false, resume=true"
        ));
        assert_eq!(p.blocks, Some(10));
        assert_eq!(p.reused, 2);
        assert_eq!(p.to_process, Some(8));
        assert_eq!(p.units_done(), 2);

        assert!(p.ingest_line("INFO: 2026-10-10 12:00:01 - Block Tile_+0_+0 completed successfully"));
        assert_eq!(p.completed, 1);
        assert_eq!(p.units_done(), 3);
        assert_eq!(p.total(), Some(10));

        assert!(p.ingest_line("ERROR: 2026-10-10 12:00:02 - Block Tile_+1_+0 failed: boom"));
        assert_eq!(p.failed, 1);
        assert_eq!(p.units_done(), 4);
    }

    #[test]
    fn all_already_completed() {
        let mut p = ConverterBlockProgress::default();
        assert!(p.ingest_line(
            "INFO: x - OSGB conversion config: blocks=5, reused=5, to_process=0, threads=1, queue_capacity=4, max_lvl=20, texture_compress=false, meshopt=false, draco=false, unlit=false, resume=true"
        ));
        assert!(p.all_already_done);
        assert_eq!(p.units_done(), 5);
        assert!(p.ingest_line("INFO: x - All blocks already completed, building root tileset"));
        assert_eq!(p.units_done(), 5);
    }
}
