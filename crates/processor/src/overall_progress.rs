//! Weighted, monotonic overall progress across a task's stages.
//!
//! Emits a `plan` event once, then `progress` events that carry `overall`
//! (0.0..=1.0, never decreases). Optional `unit` / `phase` / `stagePercent`
//! describe the current stage's work units. When `total` is unknown, callers
//! set `indeterminate` and overall stays at the stage floor.

use crate::progress_throttle::ProgressThrottle;
use crate::protocol::{Emitter, ProgressDetail, Stage};
use serde_json::{json, Value};
use std::sync::{Arc, Mutex};

#[derive(Clone, Debug)]
pub struct PlanStage {
    pub stage: Stage,
    pub weight: u32,
}

struct State {
    plan: Vec<PlanStage>,
    current: Option<usize>,
    last_overall: f64,
    /// Sub-phase weights for the active stage (e.g. IFC open/index/tessellate/tiles).
    phase_weights: Vec<(String, u32)>,
    current_phase: Option<String>,
}

#[derive(Clone)]
pub struct OverallProgress {
    inner: Arc<Mutex<State>>,
    emitter: Arc<Emitter>,
    throttle: ProgressThrottle,
}

impl OverallProgress {
    pub fn new(emitter: Arc<Emitter>, plan: Vec<PlanStage>) -> Self {
        let throttle = ProgressThrottle::new(Arc::clone(&emitter));
        Self {
            inner: Arc::new(Mutex::new(State {
                plan,
                current: None,
                last_overall: 0.0,
                phase_weights: Vec::new(),
                current_phase: None,
            })),
            emitter,
            throttle,
        }
    }

    pub fn emit_plan(&self) {
        let stages: Vec<Value> = {
            let g = self.inner.lock().unwrap();
            g.plan
                .iter()
                .map(|s| {
                    json!({
                        "stage": s.stage.as_str(),
                        "weight": s.weight,
                    })
                })
                .collect()
        };
        self.emitter.plan(&stages);
    }

    /// Replace in-stage phase weights (clears the current phase).
    pub fn set_phase_weights(&self, weights: &[(&str, u32)]) {
        let mut g = self.inner.lock().unwrap();
        g.phase_weights = weights
            .iter()
            .map(|(name, w)| ((*name).to_string(), *w))
            .collect();
        g.current_phase = None;
    }

    pub fn set_phase(&self, phase: &str) {
        let mut g = self.inner.lock().unwrap();
        g.current_phase = Some(phase.to_string());
    }

    /// Advance to `stage` (must be in the plan). Overall jumps to that stage's floor.
    pub fn enter(&self, stage: Stage) {
        let mut g = self.inner.lock().unwrap();
        let idx = g
            .plan
            .iter()
            .position(|s| s.stage == stage)
            .unwrap_or_else(|| {
                // Unknown stage: keep current index so we still report something.
                g.current.unwrap_or(0)
            });
        g.current = Some(idx);
        g.phase_weights.clear();
        g.current_phase = None;
        let overall = stage_floor(&g.plan, idx);
        let overall = overall.max(g.last_overall);
        g.last_overall = overall;
        drop(g);
        self.emitter.progress_full(
            stage,
            ProgressDetail {
                completed: 0,
                total: 0,
                overall: Some(overall),
                stage_percent: Some(0.0),
                indeterminate: true,
                ..Default::default()
            },
        );
    }

    /// Report unit progress for the active stage (throttled).
    pub fn report(
        &self,
        completed: u64,
        total: u64,
        unit: Option<&str>,
        phase: Option<&str>,
        parallelism: Option<u32>,
        resource_wait: bool,
        indeterminate: bool,
    ) {
        if let Some(phase) = phase {
            self.set_phase(phase);
        }
        let (stage, overall, stage_percent, force_indet) = {
            let mut g = self.inner.lock().unwrap();
            let idx = g.current.unwrap_or(0);
            let stage = g.plan.get(idx).map(|s| s.stage).unwrap_or(Stage::Convert);
            let floor = stage_floor(&g.plan, idx);
            let weight_frac = stage_weight_frac(&g.plan, idx);

            let phase_frac = phase_progress(
                &g.phase_weights,
                g.current_phase.as_deref(),
                completed,
                total,
                indeterminate,
            );
            let stage_percent = phase_frac;
            let mut overall = floor + weight_frac * stage_percent;
            if overall < g.last_overall {
                overall = g.last_overall;
            }
            g.last_overall = overall;
            let indet = indeterminate || total == 0;
            (stage, overall, stage_percent, indet)
        };

        let detail = ProgressDetail {
            completed,
            total,
            parallelism,
            resource_wait,
            unit: unit.map(str::to_string),
            phase: phase.map(str::to_string),
            overall: Some(overall),
            stage_percent: Some(stage_percent),
            indeterminate: force_indet,
        };
        self.throttle.report(stage, detail);
    }

    /// Mark the active stage finished (overall advances to the next floor).
    pub fn complete_current(&self) {
        let (stage, overall) = {
            let mut g = self.inner.lock().unwrap();
            let idx = g.current.unwrap_or(0);
            let stage = g.plan.get(idx).map(|s| s.stage).unwrap_or(Stage::Done);
            let overall = stage_floor(&g.plan, idx + 1).max(g.last_overall);
            g.last_overall = overall;
            g.current_phase = None;
            (stage, overall)
        };
        self.throttle.force_flush(stage);
        self.emitter.progress_full(
            stage,
            ProgressDetail {
                completed: 1,
                total: 1,
                overall: Some(overall),
                stage_percent: Some(1.0),
                indeterminate: false,
                ..Default::default()
            },
        );
    }

    /// Force overall to 1.0 (task succeeded).
    pub fn finish(&self) {
        let mut g = self.inner.lock().unwrap();
        g.last_overall = 1.0;
        let stage = g
            .current
            .and_then(|i| g.plan.get(i))
            .map(|s| s.stage)
            .unwrap_or(Stage::Done);
        drop(g);
        self.emitter.progress_full(
            stage,
            ProgressDetail {
                completed: 1,
                total: 1,
                overall: Some(1.0),
                stage_percent: Some(1.0),
                ..Default::default()
            },
        );
    }

    pub fn emitter(&self) -> &Arc<Emitter> {
        &self.emitter
    }
}

fn total_weight(plan: &[PlanStage]) -> f64 {
    plan.iter().map(|s| s.weight as f64).sum::<f64>().max(1.0)
}

fn stage_floor(plan: &[PlanStage], idx: usize) -> f64 {
    let tw = total_weight(plan);
    plan.iter().take(idx).map(|s| s.weight as f64).sum::<f64>() / tw
}

fn stage_weight_frac(plan: &[PlanStage], idx: usize) -> f64 {
    let tw = total_weight(plan);
    plan.get(idx).map(|s| s.weight as f64 / tw).unwrap_or(0.0)
}

/// Progress within the current stage, accounting for optional sub-phases.
fn phase_progress(
    phases: &[(String, u32)],
    current: Option<&str>,
    completed: u64,
    total: u64,
    indeterminate: bool,
) -> f64 {
    if phases.is_empty() {
        if indeterminate || total == 0 {
            return 0.0;
        }
        return (completed as f64 / total as f64).clamp(0.0, 1.0);
    }
    let tw: f64 = phases.iter().map(|(_, w)| *w as f64).sum::<f64>().max(1.0);
    let Some(name) = current else {
        return 0.0;
    };
    let mut floor = 0.0;
    for (phase, weight) in phases {
        let frac = *weight as f64 / tw;
        if phase == name {
            let within = if indeterminate || total == 0 {
                0.0
            } else {
                (completed as f64 / total as f64).clamp(0.0, 1.0)
            };
            return floor + frac * within;
        }
        floor += frac;
    }
    // Unknown phase name: treat as start of stage.
    0.0
}

/// Default plans for each operation (initial weights from product research).
pub fn plan_convert_osgb(rebuild: bool, texture: bool) -> Vec<PlanStage> {
    let mut p = vec![PlanStage {
        stage: Stage::Scan,
        weight: 2,
    }];
    p.push(PlanStage {
        stage: Stage::Convert,
        weight: 70,
    });
    if rebuild {
        p.push(PlanStage {
            stage: Stage::Rebuild,
            weight: 20,
        });
    }
    if texture {
        p.push(PlanStage {
            stage: Stage::Texture,
            weight: 8,
        });
    }
    p.push(PlanStage {
        stage: Stage::Validate,
        weight: 4,
    });
    p.push(PlanStage {
        stage: Stage::Commit,
        weight: 1,
    });
    p
}

pub fn plan_convert_ifc() -> Vec<PlanStage> {
    vec![
        PlanStage {
            stage: Stage::Scan,
            weight: 1,
        },
        PlanStage {
            stage: Stage::Convert,
            weight: 85,
        },
        PlanStage {
            stage: Stage::Validate,
            weight: 4,
        },
        PlanStage {
            stage: Stage::Commit,
            weight: 1,
        },
    ]
}

/// IFC sub-phases inside the Convert stage.
pub const IFC_PHASE_WEIGHTS: &[(&str, u32)] = &[
    ("open", 10),
    ("index", 4),
    ("tessellate", 55),
    ("tiles", 25),
];

pub fn plan_convert_model() -> Vec<PlanStage> {
    vec![
        PlanStage {
            stage: Stage::Scan,
            weight: 2,
        },
        PlanStage {
            stage: Stage::Convert,
            weight: 85,
        },
        PlanStage {
            stage: Stage::Validate,
            weight: 4,
        },
        PlanStage {
            stage: Stage::Commit,
            weight: 1,
        },
    ]
}

pub fn plan_process_tileset(rebuild: bool, texture: bool) -> Vec<PlanStage> {
    let mut p = Vec::new();
    if rebuild {
        p.push(PlanStage {
            stage: Stage::Rebuild,
            weight: 70,
        });
    }
    if texture {
        p.push(PlanStage {
            stage: Stage::Texture,
            weight: 20,
        });
    }
    p.push(PlanStage {
        stage: Stage::Validate,
        weight: 8,
    });
    p.push(PlanStage {
        stage: Stage::Commit,
        weight: 2,
    });
    p
}

pub fn plan_merge() -> Vec<PlanStage> {
    vec![
        PlanStage {
            stage: Stage::Scan,
            weight: 5,
        },
        PlanStage {
            stage: Stage::Merge,
            weight: 80,
        },
        PlanStage {
            stage: Stage::Validate,
            weight: 13,
        },
        PlanStage {
            stage: Stage::Commit,
            weight: 2,
        },
    ]
}

pub fn plan_clip(flatten: bool) -> Vec<PlanStage> {
    vec![
        PlanStage {
            stage: Stage::Scan,
            weight: 5,
        },
        PlanStage {
            stage: if flatten {
                Stage::Flatten
            } else {
                Stage::Clip
            },
            weight: 85,
        },
        PlanStage {
            stage: Stage::Validate,
            weight: 8,
        },
        PlanStage {
            stage: Stage::Commit,
            weight: 2,
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn overall_monotonic_across_phases() {
        let emitter = Arc::new(Emitter::new("t1"));
        let overall = OverallProgress::new(emitter, plan_convert_ifc());
        overall.emit_plan();
        overall.enter(Stage::Scan);
        overall.complete_current();
        overall.enter(Stage::Convert);
        overall.set_phase_weights(IFC_PHASE_WEIGHTS);

        overall.report(50, 100, Some("element"), Some("tessellate"), None, false, false);
        let mid = {
            let g = overall.inner.lock().unwrap();
            g.last_overall
        };
        assert!(mid > 0.0 && mid < 1.0);

        // Finishing tessellate then starting tiles must not decrease overall.
        overall.report(100, 100, Some("element"), Some("tessellate"), None, false, false);
        let after_tess = {
            let g = overall.inner.lock().unwrap();
            g.last_overall
        };
        assert!(after_tess >= mid);

        overall.report(0, 10, Some("tile"), Some("tiles"), None, false, false);
        let at_tiles_start = {
            let g = overall.inner.lock().unwrap();
            g.last_overall
        };
        assert!(
            at_tiles_start >= after_tess - 1e-9,
            "tiles start jumped backwards: {at_tiles_start} < {after_tess}"
        );
    }

    #[test]
    fn stage_floor_math() {
        let plan = plan_convert_osgb(true, true);
        // scan=2 convert=70 rebuild=20 texture=8 validate=4 commit=1 → total 105
        assert!((stage_floor(&plan, 0) - 0.0).abs() < 1e-9);
        assert!((stage_floor(&plan, 1) - 2.0 / 105.0).abs() < 1e-9);
        assert!((stage_floor(&plan, 2) - 72.0 / 105.0).abs() < 1e-9);
    }
}
