//! Rate-limited progress reporting to avoid overwhelming the UI with updates.

use crate::protocol::{Emitter, ProgressDetail, Stage};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

const MIN_UPDATE_INTERVAL: Duration = Duration::from_millis(400);

#[derive(Clone)]
pub struct ProgressThrottle {
    inner: Arc<Mutex<Inner>>,
    emitter: Arc<Emitter>,
}

struct Inner {
    last_update: Instant,
    last_detail: ProgressDetail,
    pending_update: bool,
    last_stage: Stage,
}

impl ProgressThrottle {
    pub fn new(emitter: Arc<Emitter>) -> Self {
        Self {
            inner: Arc::new(Mutex::new(Inner {
                last_update: Instant::now() - MIN_UPDATE_INTERVAL,
                last_detail: ProgressDetail::default(),
                pending_update: false,
                last_stage: Stage::Scan,
            })),
            emitter,
        }
    }

    pub fn report(&self, stage: Stage, detail: ProgressDetail) {
        let mut inner = self.inner.lock().unwrap();
        let now = Instant::now();
        let elapsed = now.duration_since(inner.last_update);

        let changed = detail.completed != inner.last_detail.completed
            || detail.total != inner.last_detail.total
            || detail.phase != inner.last_detail.phase
            || detail.overall != inner.last_detail.overall
            || detail.indeterminate != inner.last_detail.indeterminate;

        if (changed || inner.pending_update) && elapsed >= MIN_UPDATE_INTERVAL {
            inner.last_update = now;
            inner.last_detail = detail.clone();
            inner.last_stage = stage;
            inner.pending_update = false;
            drop(inner);
            self.emitter.progress_full(stage, detail);
        } else if changed {
            inner.last_detail = detail;
            inner.last_stage = stage;
            inner.pending_update = true;
        }
    }

    /// Backward-compatible helper used by older call sites.
    pub fn report_simple(
        &self,
        stage: Stage,
        completed: u64,
        total: u64,
        parallelism: Option<u32>,
        resource_wait: bool,
    ) {
        self.report(
            stage,
            ProgressDetail {
                completed,
                total,
                parallelism,
                resource_wait,
                indeterminate: total == 0,
                ..Default::default()
            },
        );
    }

    pub fn force_flush(&self, stage: Stage) {
        let mut inner = self.inner.lock().unwrap();
        if inner.pending_update {
            let detail = inner.last_detail.clone();
            inner.last_update = Instant::now();
            inner.pending_update = false;
            drop(inner);
            self.emitter.progress_full(stage, detail);
        }
    }
}
