# Disk-full (os error 112) UI evidence — PR #31

## How 112 was mocked
1. Inject converter-style failure text:
   `convert exited 1: last converter output:` + `There is not enough space on the disk. (os error 112)`.
2. Processor `annotate_disk_full_if_needed` + `error_code_for_message` produce:
   - message starting with 「磁盘空间不足」 including output/staging path
   - `errorCode` = `DISK_FULL` (not `CONVERTER_EXIT_NONZERO`)
3. Desktop `apply_event` persists those fields on the task (see `disk_full_error_event_surfaces_code_and_chinese_message`).
4. `task-detail-ui.html` mirrors Processing.tsx task detail (说明 / 错误代码 / 建议).

## Files
- `task-detail.json` — UI-facing task payload
- `task-detail-ui.html` — static Processing-style panel
- `task-detail-ui.png` — screenshot of that panel

## Repro commands
```
cargo test -p processor --lib disk_full
cargo test -p processor --lib classifies_
cargo test -p processor --lib stages::convert
cd apps/desktop ; npm.cmd run prepare:sidecars
cd src-tauri ; cargo test --lib disk_full_error_event
```
