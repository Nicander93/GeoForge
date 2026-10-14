# 01 开源许可审查（工程合规清单，不是法律意见）

| 组件 | 版本 | 许可 | 分发时的工程义务（初步） | 状态 |
|---|---|---|---|---|
| mago 3DTerrainer | v1.14.2-release | MPL-2.0（仓库 `LICENSE`） | 文件级弱 copyleft：分发 JAR 时须告知 MPL 覆盖文件的源码获取方式；若修改了 mago 的源文件，修改后的这些文件须按 MPL 公开。GeoForge 自己的代码通过命令行调用，不因此变成 MPL | 源码验证 |
| mago 的传递依赖 | 154 个 Maven 构件（JAR 内统计） | 混合：GeoTools（LGPL-2.1）、Eclipse ImageN、Jackson/Log4j/Guava/Commons（Apache-2.0）、JTS（EPL-2.0/EDL）、proj4j（Apache-2.0）、DuckDB/SQLite 原生库等 | LGPL 组件需允许用户替换（以独立 JAR 方式分发最稳妥，shadow 单一 JAR 需要评估）；Apache 组件需保留 NOTICE。shadow JAR 中 63 个同名 LICENSE/NOTICE 互相覆盖，**当前 JAR 不能直接视为合规分发物**，V1 需要生成完整第三方许可清单 | 部分验证，逐项清单未完成 |
| EPSG 数据（`gt-epsg-hsql`） | GeoTools 34 | EPSG 数据库使用条款 | 需随附 EPSG 使用条款 | 文档推断，待复核 |
| 内置大地水准面 EGM96/2008/84 | JAR 内 `geoid/` | 来源为 NGA 公开数据 | 需确认来源说明；不使用时可裁掉 | 待复核 |
| JDK 21 | Zulu 21.0.10（P0）；正式可选 Temurin 等 | GPLv2 + Classpath Exception | 可随应用分发运行时；须附 OpenJDK 许可文件 | 文档 |
| CTB quantized-mesh 分支 | 776b603 | Apache-2.0（`LICENSE.md`） | 保留 LICENSE，修改需标注 | 源码验证 |
| GDAL | 3.10.3 | MIT/X 风格 | 保留版权声明；GDAL 依赖库（libtiff、zlib、libcurl、sqlite、geos 等）各自许可需逐项列出，conda-forge 构建可能带入 LGPL 组件，需改用可控的最小构建 | 待逐项 |
| PROJ | 9.7.1 | MIT | 保留版权声明；`proj.db` 含 EPSG 数据 | 文档 |
| terrain-codec / martini / quantized-mesh | 91aa7d2 | MIT OR Apache-2.0 | 与 GeoForge Apache-2.0 兼容 | 文档（README、Cargo.toml） |
| CesiumJS | 1.125.0 | Apache-2.0 | GeoForge 已在使用 | 已有 |
| CTOD / EMODnet QMGC | — | — / GPLv3 | 仅参考，不进入 V1 | 未深入 |

P0 没有采购商业许可，也没有改变仓库许可证。
