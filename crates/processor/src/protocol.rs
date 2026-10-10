//! Processor runtime protocol: re-exports geoforge-protocol + stdout JSONL Emitter.

pub use geoforge_protocol::{
    PathRef, Stage, TaskConfig, EXIT_CANCELLED, EXIT_FAILED, EXIT_OK, SCHEMA_VERSION,
};

use serde_json::{json, Value};
use std::io::{self, Write};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;


/// Fields for a `progress` JSONL event (optional keys omitted when unset).
#[derive(Clone, Debug, Default)]
pub struct ProgressDetail {
    pub completed: u64,
    pub total: u64,
    pub parallelism: Option<u32>,
    pub resource_wait: bool,
    pub unit: Option<String>,
    pub phase: Option<String>,
    /// 0.0..=1.0 task-wide progress.
    pub overall: Option<f64>,
    /// 0.0..=1.0 progress within the current stage.
    pub stage_percent: Option<f64>,
    pub indeterminate: bool,
}

/// Thread-safe JSONL event emitter (stdout only).
pub struct Emitter {
    task_id: String,
    seq: AtomicU64,
    out: Mutex<io::Stdout>,
}

impl Emitter {
    pub fn new(task_id: impl Into<String>) -> Self {
        Self {
            task_id: task_id.into(),
            seq: AtomicU64::new(0),
            out: Mutex::new(io::stdout()),
        }
    }

    fn next_seq(&self) -> u64 {
        self.seq.fetch_add(1, Ordering::SeqCst) + 1
    }

    fn emit(&self, mut event: Value) {
        let seq = self.next_seq();
        if let Some(obj) = event.as_object_mut() {
            obj.insert("schemaVersion".into(), json!(SCHEMA_VERSION));
            obj.insert("taskId".into(), json!(self.task_id));
            obj.insert("seq".into(), json!(seq));
        }
        if let Ok(mut guard) = self.out.lock() {
            let _ = writeln!(guard, "{}", event);
            let _ = guard.flush();
        }
    }

    pub fn stage(&self, stage: Stage, message: &str) {
        self.emit(json!({
            "type": "stage",
            "stage": stage.as_str(),
            "message": message,
        }));
    }

    pub fn stage_extra(&self, stage: Stage, message: &str, extra: Value) {
        let mut ev = json!({
            "type": "stage",
            "stage": stage.as_str(),
            "message": message,
        });
        if let (Some(dst), Some(src)) = (ev.as_object_mut(), extra.as_object()) {
            for (k, v) in src {
                dst.insert(k.clone(), v.clone());
            }
        }
        self.emit(ev);
    }

    pub fn progress(&self, stage: Stage, completed: u64, total: u64) {
        self.emit(json!({
            "type": "progress",
            "stage": stage.as_str(),
            "completed": completed,
            "total": total,
        }));
    }

    pub fn progress_with_detail(&self, stage: Stage, completed: u64, total: u64, parallelism: Option<u32>, resource_wait: bool) {
        self.progress_full(
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

    pub fn plan(&self, stages: &[serde_json::Value]) {
        self.emit(json!({
            "type": "plan",
            "stages": stages,
        }));
    }

    pub fn progress_full(&self, stage: Stage, detail: ProgressDetail) {
        let mut ev = json!({
            "type": "progress",
            "stage": stage.as_str(),
            "completed": detail.completed,
            "total": detail.total,
        });
        if let Some(obj) = ev.as_object_mut() {
            if let Some(p) = detail.parallelism {
                obj.insert("parallelism".into(), json!(p));
            }
            if detail.resource_wait {
                obj.insert("resourceWait".into(), json!(true));
            }
            if let Some(unit) = detail.unit {
                obj.insert("unit".into(), json!(unit));
            }
            if let Some(phase) = detail.phase {
                obj.insert("phase".into(), json!(phase));
            }
            if let Some(overall) = detail.overall {
                obj.insert("overall".into(), json!(overall));
            }
            if let Some(sp) = detail.stage_percent {
                obj.insert("stagePercent".into(), json!(sp));
            }
            if detail.indeterminate {
                obj.insert("indeterminate".into(), json!(true));
            }
        }
        self.emit(ev);
    }

    pub fn log(&self, message: &str) {
        self.emit(json!({
            "type": "log",
            "message": message,
        }));
    }

    pub fn warning(&self, code: &str, message: &str) {
        self.emit(json!({
            "type": "warning",
            "code": code,
            "message": message,
        }));
    }

    pub fn metric(&self, name: &str, value: Value) {
        self.emit(json!({
            "type": "metric",
            "name": name,
            "value": value,
        }));
    }

    pub fn error(&self, code: &str, message: &str) {
        self.emit(json!({
            "type": "error",
            "code": code,
            "message": message,
        }));
    }

    pub fn result(&self, path: &str) {
        self.emit(json!({
            "type": "result",
            "path": path,
        }));
    }
}
