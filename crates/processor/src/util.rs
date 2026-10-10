//! Shared helpers: tool paths, subprocess with cancel + log events.

use crate::cancel::CancelFlag;
use crate::protocol::Emitter;
use std::collections::VecDeque;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::{Arc, OnceLock};
use std::thread;

const MAX_DISPLAY_LINE_BYTES: usize = 64 * 1024;
const DEFAULT_PROCESS_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(6 * 60 * 60);
const MAX_PROCESS_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(24 * 60 * 60);

#[derive(Debug, Clone)]
pub struct ToolPaths {
    pub repo_root: PathBuf,
    pub runtime_root: PathBuf,
    pub convert_bin: PathBuf,
    /// Release TopRebuild CLI (`top_rebuild`). Override: `GEOFORGE_TOP_REBUILD`.
    pub top_rebuild: PathBuf,
    /// Python baseline script. Used only when `GEOFORGE_REBUILD_ENGINE=python`.
    pub rebuild_py: PathBuf,
    pub texture_py: PathBuf,
    /// Packaged texture tool (geoforge-texture.exe). Override: `GEOFORGE_TEXTURE`.
    pub texture_bin: PathBuf,
    pub basisu: PathBuf,
    pub python: PathBuf,
    /// IFC → 3D Tiles 1.1 tool (`geoforge-ifc` or tools/ifc/cli.py in development).
    pub ifc_tool: IfcTool,
    pub packaged: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum IfcTool {
    /// Frozen PyInstaller build or an explicit `GEOFORGE_IFC_TOOL`.
    Executable(PathBuf),
    /// Development checkout: `GEOFORGE_IFC_PYTHON tools/ifc/cli.py`.
    Script { python: PathBuf, script: PathBuf },
    Missing { searched: Vec<PathBuf> },
}

impl IfcTool {
    /// Program and leading arguments; the subcommand follows.
    pub fn command_prefix(&self) -> Option<Vec<String>> {
        match self {
            Self::Executable(path) => Some(vec![path.to_string_lossy().into_owned()]),
            Self::Script { python, script } => Some(vec![
                python.to_string_lossy().into_owned(),
                script.to_string_lossy().into_owned(),
            ]),
            Self::Missing { .. } => None,
        }
    }

    pub fn missing_message(&self, packaged: bool) -> String {
        let searched = match self {
            Self::Missing { searched } => searched
                .iter()
                .map(|path| path.display().to_string())
                .collect::<Vec<_>>()
                .join("、"),
            _ => String::new(),
        };
        if packaged {
            format!("组件缺失，请修复安装（IFC 转换组件 geoforge-ifc 未找到：{searched}）")
        } else {
            format!(
                "找不到 IFC 转换组件（查过 {searched}）。开发环境请把 GEOFORGE_IFC_PYTHON 设为已安装 tools/ifc/requirements.txt 的 Python，\
                 或运行 apps/desktop/scripts/prepare-ifc.ps1 生成 geoforge-ifc，也可以用 GEOFORGE_IFC_TOOL 指定可执行文件。"
            )
        }
    }
}

pub fn tool_paths() -> &'static ToolPaths {
    static PATHS: OnceLock<ToolPaths> = OnceLock::new();
    PATHS.get_or_init(|| {
        let packaged = std::env::var("GEOFORGE_PACKAGED").ok().as_deref() == Some("1")
            || std::env::var("GEOFORGE_RUNTIME_ROOT").is_ok();
        let source_root = discover_repo_root();
        let runtime_root = resolve_runtime_root(&source_root);
        // Release binaries embed CARGO_MANIFEST_DIR. Never let an installed
        // app discover optional tools from a source checkout that happens to
        // exist on the same machine.
        let repo_root = if packaged {
            runtime_root.clone()
        } else {
            source_root
        };
        let convert_bin = resolve_3dtile(&repo_root, &runtime_root);
        let top_rebuild = resolve_top_rebuild(&repo_root, &runtime_root);
        let rebuild_py = std::env::var("GEOFORGE_REBUILD_TOP")
            .map(PathBuf::from)
            .unwrap_or_else(|_| resolve_rebuild_py(&repo_root));
        let texture_py = if packaged {
            runtime_root.join("texture").join("run.py")
        } else {
            repo_root.join("tools/texture_ktx2/run.py")
        };
        let texture_bin = resolve_texture_bin(&runtime_root);
        let basisu = resolve_basisu(&runtime_root, &repo_root, packaged);
        let ifc_tool = resolve_ifc_tool(
            std::env::var_os("GEOFORGE_IFC_TOOL").map(PathBuf::from),
            std::env::var_os("GEOFORGE_IFC_PYTHON").map(PathBuf::from),
            &runtime_root,
            &repo_root,
            std::env::current_exe().ok().as_deref().and_then(Path::parent),
            packaged,
        );
        let python = std::env::var("GEOFORGE_PYTHON")
            .map(PathBuf::from)
            .unwrap_or_else(|_| {
                if cfg!(windows) {
                    PathBuf::from("python")
                } else {
                    PathBuf::from("python3")
                }
            });
        ToolPaths {
            repo_root,
            runtime_root,
            convert_bin,
            top_rebuild,
            rebuild_py,
            texture_py,
            texture_bin,
            basisu,
            python,
            ifc_tool,
            packaged,
        }
    })
}

/// Order: `GEOFORGE_IFC_TOOL` → runtime/ifc → next to processor →
/// `GEOFORGE_IFC_PYTHON` + tools/ifc/cli.py (source checkouts only).
fn resolve_ifc_tool(
    override_tool: Option<PathBuf>,
    dev_python: Option<PathBuf>,
    runtime_root: &Path,
    repo_root: &Path,
    exe_dir: Option<&Path>,
    packaged: bool,
) -> IfcTool {
    if let Some(path) = override_tool {
        return IfcTool::Executable(path);
    }
    let mut searched = sibling_bins(&runtime_root.join("ifc"), "geoforge-ifc");
    if let Some(dir) = exe_dir {
        searched.extend(sibling_bins(dir, "geoforge-ifc"));
    }
    if let Some(path) = first_existing(searched.clone()) {
        return IfcTool::Executable(path);
    }
    if !packaged {
        let script = repo_root.join("tools").join("ifc").join("cli.py");
        if let Some(python) = dev_python {
            if script.is_file() {
                return IfcTool::Script { python, script };
            }
        }
        searched.push(script);
    }
    IfcTool::Missing { searched }
}

fn resolve_runtime_root(repo_root: &Path) -> PathBuf {
    if let Ok(p) = std::env::var("GEOFORGE_RUNTIME_ROOT") {
        return PathBuf::from(p);
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let bundled = dir.join("resources").join("runtime");
            if bundled.is_dir() {
                return bundled;
            }
            // processor next to app; runtime under resources/
            let alt = dir.join("runtime");
            if alt.is_dir() {
                return alt;
            }
        }
    }
    repo_root.join("dist").join("runtime")
}

fn resolve_texture_bin(runtime_root: &Path) -> PathBuf {
    if let Ok(p) = std::env::var("GEOFORGE_TEXTURE") {
        return PathBuf::from(p);
    }
    for name in ["geoforge-texture.exe", "geoforge-texture"] {
        let c = runtime_root.join("texture").join(name);
        if c.is_file() {
            return c;
        }
    }
    PathBuf::from("geoforge-texture")
}

fn resolve_basisu(runtime_root: &Path, repo_root: &Path, packaged: bool) -> PathBuf {
    if let Ok(p) = std::env::var("GEOFORGE_BASISU") {
        return PathBuf::from(p);
    }
    let mut candidates = vec![
        runtime_root.join("texture").join("basisu.exe"),
        runtime_root.join("texture").join("basisu"),
    ];
    if !packaged {
        candidates.push(repo_root.join("vcpkg_installed/x64-windows/tools/basisu/basisu.exe"));
    }
    for c in candidates {
        if c.is_file() {
            return c;
        }
    }
    PathBuf::from("basisu")
}

pub fn command_available(command: &Path) -> bool {
    if command.is_file() {
        return true;
    }
    if command.components().count() != 1 {
        return false;
    }
    let Some(search_path) = std::env::var_os("PATH") else {
        return false;
    };
    std::env::split_paths(&search_path).any(|dir| {
        let candidate = dir.join(command);
        if candidate.is_file() {
            return true;
        }
        #[cfg(windows)]
        if command.extension().is_none() && candidate.with_extension("exe").is_file() {
            return true;
        }
        false
    })
}

/// Console-subsystem tools should stay invisible when launched by the desktop
/// app. Redirected stdin/stdout/stderr and Job Object control keep working.
pub fn hide_console_window(command: &mut Command) {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    #[cfg(not(windows))]
    let _ = command;
}

fn rebuild_markers(root: &Path) -> bool {
    root.join("tools/experiments/rebuild_top_py").is_dir()
        || root.join("tools/rebuild_top").is_dir()
}

fn resolve_rebuild_py(repo_root: &Path) -> PathBuf {
    let primary = repo_root.join("tools/experiments/rebuild_top_py/rebuild_top.py");
    if primary.is_file() {
        return primary;
    }
    // One-release fallback for checkouts that still have the old path.
    let legacy = repo_root.join("tools/rebuild_top/rebuild_top.py");
    if legacy.is_file() {
        return legacy;
    }
    primary
}

fn first_existing(cands: impl IntoIterator<Item = PathBuf>) -> Option<PathBuf> {
    cands.into_iter().find(|p| p.is_file())
}

fn bin_names(stem: &str) -> [String; 2] {
    [stem.to_string(), format!("{stem}.exe")]
}

fn sibling_bins(dir: &Path, stem: &str) -> Vec<PathBuf> {
    bin_names(stem)
        .into_iter()
        .map(|name| dir.join(name))
        .collect()
}

fn profile_bins(root: &Path, stem: &str) -> Vec<PathBuf> {
    let mut out = Vec::new();
    for profile in ["release", "debug"] {
        for name in bin_names(stem) {
            out.push(root.join("target").join(profile).join(name));
        }
    }
    out
}

/// Order: `GEOFORGE_3DTILE` → runtime/converter → next to processor → PATH.
fn resolve_3dtile(_repo_root: &Path, runtime_root: &Path) -> PathBuf {
    if let Ok(p) = std::env::var("GEOFORGE_3DTILE") {
        return PathBuf::from(p);
    }
    if let Some(p) = first_existing([
        runtime_root.join("converter").join("_3dtile.exe"),
        runtime_root.join("converter").join("_3dtile"),
    ]) {
        return p;
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            if let Some(p) = first_existing(sibling_bins(dir, "_3dtile")) {
                return p;
            }
        }
    }
    PathBuf::from("_3dtile")
}

/// Order: `GEOFORGE_TOP_REBUILD` → runtime/bin → next to processor → repo target → PATH.
fn resolve_top_rebuild(repo_root: &Path, runtime_root: &Path) -> PathBuf {
    if let Ok(p) = std::env::var("GEOFORGE_TOP_REBUILD") {
        return PathBuf::from(p);
    }
    if let Some(p) = first_existing([
        runtime_root.join("bin").join("top_rebuild.exe"),
        runtime_root.join("bin").join("top_rebuild"),
    ]) {
        return p;
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            if let Some(p) = first_existing(sibling_bins(dir, "top_rebuild")) {
                return p;
            }
        }
    }
    if let Some(p) = first_existing(profile_bins(repo_root, "top_rebuild")) {
        return p;
    }
    PathBuf::from("top_rebuild")
}

fn discover_repo_root() -> PathBuf {
    if let Ok(p) = std::env::var("GEOFORGE_REPO_ROOT") {
        return PathBuf::from(p);
    }
    let start = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    if let Some(root) = start.parent().and_then(|p| p.parent()) {
        if rebuild_markers(root) {
            return root.to_path_buf();
        }
    }
    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    for anc in cwd.ancestors() {
        if rebuild_markers(anc) && anc.join("apps").is_dir() {
            return anc.to_path_buf();
        }
    }
    cwd
}

/// Run command; stream stdout/stderr lines as log events; honour cancel.
pub fn run_logged(
    emitter: &Arc<Emitter>,
    cancel: &CancelFlag,
    cmd: &[String],
    cwd: Option<&Path>,
) -> Result<i32, String> {
    Ok(run_logged_env_result(emitter, cancel, cmd, cwd, &[])?.exit_code)
}

pub fn run_logged_env(
    emitter: &Arc<Emitter>,
    cancel: &CancelFlag,
    cmd: &[String],
    cwd: Option<&Path>,
    extra_env: &[(&str, PathBuf)],
) -> Result<i32, String> {
    Ok(run_logged_env_result(emitter, cancel, cmd, cwd, extra_env)?.exit_code)
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CommandResult {
    pub exit_code: i32,
    pub stderr_tail: String,
    pub peak_memory_bytes: Option<u64>,
}

/// Read a stream without allowing one unterminated line to grow without
/// bound. Chunks emitted with `truncated = true` are display fragments; the
/// caller still retains the complete process exit status and stderr tail.
fn for_each_bounded_line<R: Read, F>(mut reader: R, mut handle: F) -> std::io::Result<()>
where
    F: FnMut(Vec<u8>, bool),
{
    let mut pending = Vec::new();
    let mut buffer = [0_u8; 8192];
    loop {
        let count = reader.read(&mut buffer)?;
        if count == 0 {
            break;
        }
        pending.extend_from_slice(&buffer[..count]);
        loop {
            let Some(newline) = pending.iter().position(|byte| *byte == b'\n') else {
                break;
            };
            let rest = pending.split_off(newline + 1);
            let line = std::mem::replace(&mut pending, rest);
            handle(line, false);
        }
        while pending.len() > MAX_DISPLAY_LINE_BYTES {
            let chunk = pending.drain(..MAX_DISPLAY_LINE_BYTES).collect();
            handle(chunk, true);
        }
    }
    if !pending.is_empty() {
        handle(pending, false);
    }
    Ok(())
}

/// Run a command while retaining a bounded diagnostic tail from stderr.
pub fn run_logged_env_result(
    emitter: &Arc<Emitter>,
    cancel: &CancelFlag,
    cmd: &[String],
    cwd: Option<&Path>,
    extra_env: &[(&str, PathBuf)],
) -> Result<CommandResult, String> {
    run_logged_env_result_with_timeout(
        emitter,
        cancel,
        cmd,
        cwd,
        extra_env,
        configured_process_timeout(),
        None,
    )
}

/// Receives each stdout line of a tool that reports through stdout.
pub type StdoutHandler = Box<dyn FnMut(&str) + Send>;

/// Like [`run_logged_env_result`], but pipes stdout to `on_stdout` instead of
/// discarding it. Only for tools with a line protocol on stdout; `_3dtile`
/// must keep stdout closed (see below).
pub fn run_logged_env_result_with_stdout(
    emitter: &Arc<Emitter>,
    cancel: &CancelFlag,
    cmd: &[String],
    cwd: Option<&Path>,
    extra_env: &[(&str, PathBuf)],
    on_stdout: StdoutHandler,
) -> Result<CommandResult, String> {
    run_logged_env_result_with_timeout(
        emitter,
        cancel,
        cmd,
        cwd,
        extra_env,
        configured_process_timeout(),
        Some(on_stdout),
    )
}

fn configured_process_timeout() -> std::time::Duration {
    std::env::var("GEOFORGE_PROCESS_TIMEOUT_SECS")
        .ok()
        .and_then(|value| value.parse::<u64>().ok())
        .filter(|seconds| *seconds > 0)
        .map(std::time::Duration::from_secs)
        .map(|timeout| timeout.min(MAX_PROCESS_TIMEOUT))
        .unwrap_or(DEFAULT_PROCESS_TIMEOUT)
}

fn run_logged_env_result_with_timeout(
    emitter: &Arc<Emitter>,
    cancel: &CancelFlag,
    cmd: &[String],
    cwd: Option<&Path>,
    extra_env: &[(&str, PathBuf)],
    timeout: std::time::Duration,
    on_stdout: Option<StdoutHandler>,
) -> Result<CommandResult, String> {
    if cmd.is_empty() {
        return Err("cannot run an empty command".into());
    }
    emitter.log(&format!("$ {}", cmd.join(" ")));
    let mut command = Command::new(&cmd[0]);
    if cmd.len() > 1 {
        command.args(&cmd[1..]);
    }
    if let Some(c) = cwd {
        command.current_dir(c);
    }
    for (k, v) in extra_env {
        emitter.log(&format!("[env] {}={}", k, v.display()));
        command.env(k, v);
    }
    // `_3dtile`/OSG prints plugin dumps from many threads to stdout; piping that
    // race-crashes on Windows (0xC0000005). Keep stderr only (rustc env_logger).
    command
        .stdout(if on_stdout.is_some() { Stdio::piped() } else { Stdio::null() })
        .stderr(Stdio::piped())
        .stdin(Stdio::null());
    hide_console_window(&mut command);

    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        unsafe {
            command.pre_exec(|| {
                libc_setpgid();
                Ok(())
            });
        }
    }

    let mut child = command.spawn().map_err(|e| format!("spawn failed: {e}"))?;
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    let t_out = thread::spawn(move || {
        let (Some(out), Some(mut handle)) = (stdout, on_stdout) else {
            return;
        };
        let _ = for_each_bounded_line(out, |bytes, _truncated| {
            let line = String::from_utf8_lossy(&bytes);
            handle(line.trim_end_matches(['\r', '\n']));
        });
    });
    let stderr_tail = Arc::new(std::sync::Mutex::new(VecDeque::<String>::new()));
    let tail_for_thread = Arc::clone(&stderr_tail);
    let e2 = Arc::clone(emitter);
    let t_err = thread::spawn(move || {
        if let Some(err) = stderr {
            let result = for_each_bounded_line(err, |bytes, truncated| {
                let mut line = String::from_utf8_lossy(&bytes)
                    .trim_end_matches(['\r', '\n'])
                    .to_string();
                if truncated {
                    line.push_str(" …<line truncated>");
                }
                if let Ok(mut tail) = tail_for_thread.lock() {
                    tail.push_back(line.clone());
                    while tail.len() > 100
                        || tail.iter().map(|item| item.len() + 1).sum::<usize>() > 64 * 1024
                    {
                        tail.pop_front();
                    }
                }
                eprintln!("{line}");
                e2.log(&format!("[stderr] {line}"));
            });
            if let Err(error) = result {
                let line = format!("<stderr read failed: {error}>");
                if let Ok(mut tail) = tail_for_thread.lock() {
                    tail.push_back(line.clone());
                }
                e2.log(&line);
            }
        }
    });

    let mut peak_memory_bytes = 0u64;
    let mut wait_error = None;
    let process_started = std::time::Instant::now();
    let mut timed_out = false;
    loop {
        if let Some(bytes) = process_peak_memory_bytes(child.id()) {
            peak_memory_bytes = peak_memory_bytes.max(bytes);
        }
        if cancel.is_cancelled() {
            terminate_child(&mut child);
            break;
        }
        match child.try_wait() {
            Ok(Some(_)) => break,
            Ok(None) => {
                let elapsed = process_started.elapsed();
                if elapsed >= timeout {
                    timed_out = true;
                    emitter.log(&format!(
                        "[process] timed out after {} seconds; terminating child",
                        timeout.as_secs()
                    ));
                    terminate_child(&mut child);
                    break;
                }
                thread::sleep(
                    std::time::Duration::from_millis(100).min(timeout.saturating_sub(elapsed)),
                );
            }
            Err(e) => {
                terminate_child(&mut child);
                wait_error = Some(format!("wait error: {e}"));
                break;
            }
        }
    }

    let _ = t_out.join();
    let _ = t_err.join();
    let status = child.wait().map_err(|e| e.to_string())?;
    if let Some(error) = wait_error {
        return Err(error);
    }
    let exit_code = if timed_out {
        124
    } else if cancel.is_cancelled() {
        130
    } else {
        status.code().unwrap_or(1)
    };
    let mut stderr_tail = stderr_tail
        .lock()
        .map(|tail| tail.iter().cloned().collect::<Vec<_>>().join("\n"))
        .unwrap_or_default();
    if timed_out {
        if !stderr_tail.is_empty() {
            stderr_tail.push('\n');
        }
        stderr_tail.push_str(&format!(
            "process timed out after {} seconds",
            timeout.as_secs()
        ));
    }
    Ok(CommandResult {
        exit_code,
        stderr_tail,
        peak_memory_bytes: (peak_memory_bytes > 0).then_some(peak_memory_bytes),
    })
}

#[cfg(unix)]
fn process_peak_memory_bytes(pid: u32) -> Option<u64> {
    let text = std::fs::read_to_string(format!("/proc/{pid}/status")).ok()?;
    text.lines()
        .find_map(|line| line.strip_prefix("VmHWM:"))
        .or_else(|| text.lines().find_map(|line| line.strip_prefix("VmRSS:")))
        .and_then(|value| value.split_whitespace().next())
        .and_then(|value| value.parse::<u64>().ok())
        .map(|kilobytes| kilobytes.saturating_mul(1024))
}

#[cfg(windows)]
fn process_peak_memory_bytes(pid: u32) -> Option<u64> {
    #[repr(C)]
    struct ProcessMemoryCounters {
        cb: u32,
        page_fault_count: u32,
        peak_working_set_size: usize,
        working_set_size: usize,
        quota_peak_paged_pool_usage: usize,
        quota_paged_pool_usage: usize,
        quota_peak_non_paged_pool_usage: usize,
        quota_non_paged_pool_usage: usize,
        pagefile_usage: usize,
        peak_pagefile_usage: usize,
    }
    #[link(name = "psapi")]
    extern "system" {
        fn OpenProcess(access: u32, inherit_handle: i32, process_id: u32) -> *mut std::ffi::c_void;
        fn GetProcessMemoryInfo(
            process: *mut std::ffi::c_void,
            counters: *mut ProcessMemoryCounters,
            size: u32,
        ) -> i32;
        fn CloseHandle(handle: *mut std::ffi::c_void) -> i32;
    }
    const PROCESS_QUERY_INFORMATION: u32 = 0x0400;
    const PROCESS_VM_READ: u32 = 0x0010;
    unsafe {
        let handle = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, 0, pid);
        if handle.is_null() {
            return None;
        }
        let mut counters = ProcessMemoryCounters {
            cb: std::mem::size_of::<ProcessMemoryCounters>() as u32,
            page_fault_count: 0,
            peak_working_set_size: 0,
            working_set_size: 0,
            quota_peak_paged_pool_usage: 0,
            quota_paged_pool_usage: 0,
            quota_peak_non_paged_pool_usage: 0,
            quota_non_paged_pool_usage: 0,
            pagefile_usage: 0,
            peak_pagefile_usage: 0,
        };
        let ok = GetProcessMemoryInfo(
            handle,
            &mut counters,
            std::mem::size_of::<ProcessMemoryCounters>() as u32,
        );
        let value = (ok != 0).then_some(counters.peak_working_set_size as u64);
        let _ = CloseHandle(handle);
        value
    }
}

#[cfg(not(any(unix, windows)))]
fn process_peak_memory_bytes(_pid: u32) -> Option<u64> {
    None
}

fn terminate_child(child: &mut std::process::Child) {
    #[cfg(unix)]
    {
        let pid = child.id() as i32;
        libc_kill(-pid, 15);
        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(8);
        while std::time::Instant::now() < deadline {
            if let Ok(Some(_)) = child.try_wait() {
                return;
            }
            thread::sleep(std::time::Duration::from_millis(200));
        }
        libc_kill(-pid, 9);
    }
    let _ = child.kill();
}

#[cfg(unix)]
fn libc_setpgid() {
    extern "C" {
        fn setpgid(pid: i32, pgid: i32) -> i32;
    }
    unsafe {
        let _ = setpgid(0, 0);
    }
}

#[cfg(unix)]
fn libc_kill(pid: i32, sig: i32) {
    extern "C" {
        fn kill(pid: i32, sig: i32) -> i32;
    }
    unsafe {
        let _ = kill(pid, sig);
    }
}

#[cfg(not(unix))]
#[allow(dead_code)]
fn libc_setpgid() {}
#[cfg(not(unix))]
#[allow(dead_code)]
fn libc_kill(_pid: i32, _sig: i32) {}

#[cfg(test)]
mod tests {
    use super::{
        bin_names, for_each_bounded_line, resolve_ifc_tool, run_logged_env_result,
        run_logged_env_result_with_stdout, run_logged_env_result_with_timeout, IfcTool,
        MAX_DISPLAY_LINE_BYTES,
    };
    use std::path::PathBuf;
    use crate::cancel::CancelFlag;
    use crate::protocol::Emitter;
    use std::sync::Arc;
    use std::thread;

    fn scratch(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("geoforge-util-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).expect("create scratch dir");
        dir
    }

    #[test]
    fn ifc_tool_prefers_override_then_runtime_then_dev_script() {
        let root = scratch("ifc-tool");
        let runtime = root.join("runtime");
        let repo = root.join("repo");
        std::fs::create_dir_all(repo.join("tools/ifc")).unwrap();
        std::fs::write(repo.join("tools/ifc/cli.py"), "").unwrap();
        let python = PathBuf::from("python3");

        let dev = resolve_ifc_tool(None, Some(python.clone()), &runtime, &repo, None, false);
        assert_eq!(dev, IfcTool::Script { python: python.clone(), script: repo.join("tools/ifc/cli.py") });
        assert_eq!(dev.command_prefix().unwrap()[0], "python3");

        std::fs::create_dir_all(runtime.join("ifc")).unwrap();
        let frozen = runtime.join("ifc").join(if cfg!(windows) { "geoforge-ifc.exe" } else { "geoforge-ifc" });
        std::fs::write(&frozen, "").unwrap();
        assert_eq!(
            resolve_ifc_tool(None, Some(python.clone()), &runtime, &repo, None, false),
            IfcTool::Executable(frozen)
        );

        let explicit = PathBuf::from("/opt/geoforge-ifc");
        assert_eq!(
            resolve_ifc_tool(Some(explicit.clone()), Some(python), &runtime, &repo, None, false),
            IfcTool::Executable(explicit)
        );
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn packaged_builds_never_fall_back_to_a_source_checkout() {
        let root = scratch("ifc-packaged");
        let repo = root.join("repo");
        std::fs::create_dir_all(repo.join("tools/ifc")).unwrap();
        std::fs::write(repo.join("tools/ifc/cli.py"), "").unwrap();
        let tool = resolve_ifc_tool(None, Some(PathBuf::from("python")), &root.join("runtime"), &repo, None, true);
        let IfcTool::Missing { searched } = &tool else {
            panic!("expected missing tool, got {tool:?}");
        };
        assert!(searched.iter().all(|path| !path.ends_with("cli.py")));
        assert!(tool.missing_message(true).contains("组件缺失"));
        assert!(tool.command_prefix().is_none());
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn missing_dev_tool_explains_how_to_provide_it() {
        let root = scratch("ifc-missing");
        let tool = resolve_ifc_tool(None, None, &root.join("runtime"), &root, None, false);
        let message = tool.missing_message(false);
        assert!(message.contains("GEOFORGE_IFC_PYTHON"));
        assert!(message.contains("prepare-ifc.ps1"));
        assert!(message.contains("cli.py"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn stdout_handler_receives_lines_when_requested() {
        let command = if cfg!(windows) {
            vec!["cmd".to_string(), "/C".to_string(), "echo first& echo second".to_string()]
        } else {
            vec!["sh".to_string(), "-c".to_string(), "echo first; echo second".to_string()]
        };
        let lines = Arc::new(std::sync::Mutex::new(Vec::new()));
        let sink = Arc::clone(&lines);
        let result = run_logged_env_result_with_stdout(
            &Arc::new(Emitter::new("util-stdout-test")),
            &CancelFlag::new(),
            &command,
            None,
            &[],
            Box::new(move |line| sink.lock().unwrap().push(line.trim().to_string())),
        )
        .expect("run stdout fixture");
        assert_eq!(result.exit_code, 0);
        assert_eq!(*lines.lock().unwrap(), ["first", "second"]);
    }

    #[test]
    fn bin_names_include_exe_suffix() {
        let names = bin_names("_3dtile");
        assert_eq!(names[0], "_3dtile");
        assert_eq!(names[1], "_3dtile.exe");
    }

    #[test]
    fn bounded_line_reader_splits_unterminated_output() {
        let input = vec![b'x'; MAX_DISPLAY_LINE_BYTES * 2 + 17];
        let mut chunks = Vec::new();
        for_each_bounded_line(input.as_slice(), |bytes, truncated| {
            chunks.push((bytes.len(), truncated));
        })
        .expect("read bounded fixture");
        assert_eq!(chunks.len(), 3);
        assert!(chunks
            .iter()
            .all(|(size, _)| *size <= MAX_DISPLAY_LINE_BYTES));
        assert!(chunks.iter().take(2).all(|(_, truncated)| *truncated));
    }

    #[test]
    fn command_result_preserves_nonzero_exit_and_stderr_tail() {
        let command = if cfg!(windows) {
            vec![
                "cmd".to_string(),
                "/C".to_string(),
                "echo converter diagnostic 1>&2 & exit /B 7".to_string(),
            ]
        } else {
            vec![
                "sh".to_string(),
                "-c".to_string(),
                "printf 'converter diagnostic' >&2; exit 7".to_string(),
            ]
        };
        let result = run_logged_env_result(
            &Arc::new(Emitter::new("util-test")),
            &CancelFlag::new(),
            &command,
            None,
            &[],
        )
        .expect("run controlled converter fixture");
        assert_eq!(result.exit_code, 7);
        assert!(result.stderr_tail.contains("converter diagnostic"));
    }

    #[test]
    fn command_timeout_terminates_child_and_returns_diagnostic() {
        let command = if cfg!(windows) {
            vec![
                "pwsh".to_string(),
                "-NoProfile".to_string(),
                "-Command".to_string(),
                "Start-Sleep -Seconds 10".to_string(),
            ]
        } else {
            vec!["sh".to_string(), "-c".to_string(), "sleep 10".to_string()]
        };
        let result = run_logged_env_result_with_timeout(
            &Arc::new(Emitter::new("util-timeout-test")),
            &CancelFlag::new(),
            &command,
            None,
            &[],
            std::time::Duration::from_millis(100),
            None,
        )
        .expect("run timeout fixture");

        assert_eq!(result.exit_code, 124);
        assert!(result.stderr_tail.contains("process timed out"));
    }

    #[test]
    fn command_cancel_terminates_child() {
        let command = if cfg!(windows) {
            vec![
                "pwsh".to_string(),
                "-NoProfile".to_string(),
                "-Command".to_string(),
                "Start-Sleep -Seconds 10".to_string(),
            ]
        } else {
            vec!["sh".to_string(), "-c".to_string(), "sleep 10".to_string()]
        };
        let cancel = CancelFlag::new();
        let request_cancel = cancel.clone();
        let requester = thread::spawn(move || {
            thread::sleep(std::time::Duration::from_millis(100));
            request_cancel.request();
        });
        let result = run_logged_env_result(
            &Arc::new(Emitter::new("util-cancel-test")),
            &cancel,
            &command,
            None,
            &[],
        )
        .expect("run cancellable fixture");
        requester.join().expect("cancel requester thread");

        assert_eq!(result.exit_code, 130);
    }
}
