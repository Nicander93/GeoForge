# 地形 V1 基线

记录 `feat/terrain-v1` 开工前 master 的状态，后面每个里程碑都拿它对比。

## 代码版本

- master：`899848a`（P0 PR #8 合并后）
- 工作区：LM 上的 `D:\code\GeoForge-terrain-v1`，分支 `feat/terrain-v1`
- 工具链：rustc 1.98.1，node 24.11

## 构建与测试

都在 LM 上跑，日志在 `D:\work\terrain-v1\logs`。

| 命令 | 结果 |
| --- | --- |
| `cargo build` | 通过 |
| `cargo test -p protocol` | 21 通过 |
| `cargo test -p processor --lib` | 164 通过 |
| `cargo test`（整个 workspace） | 通过 |
| `npm ci` / `npm test` / `npm run build` | 通过 |
| `npm run prepare:sidecars` 后 `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml --lib` | 23 通过 |

注意三点：

- Tauri 测试依赖 sidecar，要先跑 `npm run prepare:sidecars`，否则编译不过。
- `apps/desktop/dist` 在版本库里，`npm run build` 会改动它。基线跑完已经用 `git checkout` 还原，后续提交不带 dist。
- 仓库本身没有做过 `cargo fmt`，`cargo fmt --check` 在 master 上就有大量差异，CI 也不跑它。V1 不顺手全量格式化，免得 diff 失真。

## P0 结论（沿用）

- CTB 用 fork 的 `776b60308c89383462a91d152a190fcd667b74f7`，作为独立进程调用。
- 切片：`ctb-tile -f Mesh -C -c N -g q -s maxz -e 0 -o dir`，元数据另跑一次加 `-l`。
- CTB 写出的 layer.json 用的是 `schema` 字段而不是 `scheme`，`bounds` 固定为 `[0,-90,180,90]`，都需要我们自己改写。
- CTB 把 NoData 当 0 m 写进网格，所以 NoData 必须在进 CTB 之前处理完。

## 地形服务端现状

master 的资源服务器把 `.terrain` 当普通文件给出，不带 `Content-Encoding: gzip`，Cesium 拿到的是压缩字节，解析失败。这个问题单独在 PR #9（`fix/terrain-gzip-resource`）里修。
