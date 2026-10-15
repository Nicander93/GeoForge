import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle,
  Clock,
  Buildings,
  Cube,
  Image,
  Mountains,
  Stack,
  Scissors,
  XCircle,
  ArrowClockwise,
  HourglassHigh,
} from '@phosphor-icons/react';
import { api, friendlyError, isActiveStatus, isDoneStatus } from '../api/desktop';
import type { Task, TaskStatus, TaskProgressDetail } from '../api/types';
import { Alert } from '../components/Alert';
import { EmptyState } from '../components/EmptyState';
import { StageStepper } from '../components/StageStepper';
import { StatusBadge } from '../components/StatusBadge';
import { useTasks } from '../hooks/useTasks';
import { cloneOutputPath, formatTaskProgressLine } from '../lib/formUtils';
import { terrainWarnings } from '../lib/terrainForm';

type StatusFilter = 'all' | 'active' | 'done' | 'failed';

const statusFilter: Record<StatusFilter, (t: Task) => boolean> = {
  all: () => true,
  active: (t) => t.status === 'running' || t.status === 'queued' || t.status === 'cancelling',
  done: (t) => t.status === 'completed' || t.status === 'succeeded',
  failed: (t) => t.status === 'failed' || t.status === 'cancelled' || t.status === 'interrupted',
};

function opLabel(op?: string): string {
  if (op === 'clip-tileset') return '范围裁剪';
  if (op === 'flatten-tileset') return '区域压平';
  if (op === 'merge-tilesets') return '3D Tiles 合并';
  if (op === 'convert-osgb') return 'OSGB 转换';
  if (op === 'convert-model') return '通用模型转换';
  if (op === 'convert-ifc') return 'IFC 转换';
  if (op === 'convert-terrain') return '地形切片';
  if (op === 'process-tileset') return 'Tiles 处理';
  return op || '—';
}

function TaskIcon({ operation }: { operation?: string }) {
  if (operation === 'convert-osgb') return <Stack size={18} />;
  if (operation === 'convert-model') return <Cube size={18} />;
  if (operation === 'convert-ifc') return <Buildings size={18} />;
  if (operation === 'convert-terrain') return <Mountains size={18} />;
  if (operation === 'process-tileset') return <Cube size={18} />;
  if (operation === 'merge-tilesets') return <Stack size={18} />;
  if (operation === 'clip-tileset') return <Scissors size={18} />;
  if (operation === 'flatten-tileset') return <Scissors size={18} />;
  return <Image size={18} />;
}

function fmtTime(v?: string | number) {
  if (v == null || v === '') return '—';
  const d = typeof v === 'number' ? new Date(v * (v < 1e12 ? 1000 : 1)) : new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
}

function statusLine(t: Task): { text: string; pct: number | null } {
  if (t.status === 'failed') {
    const reason = t.error || t.message;
    return { text: reason ? `失败 · ${reason}` : '失败', pct: null };
  }
  if (t.status === 'cancelled') return { text: '已取消', pct: null };
  if (t.status === 'interrupted') return { text: '已中断', pct: null };
  if (t.status === 'queued') return { text: '排队中', pct: null };
  if (t.status === 'completed' || t.status === 'succeeded') return { text: '已完成', pct: 100 };
  return formatTaskProgressLine(t.stage, t.progress, t.status);
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'running' || status === 'cancelling') return <Clock size={16} />;
  if (status === 'queued') return <Clock size={16} />;
  if (status === 'completed' || status === 'succeeded')
    return <CheckCircle size={16} color="var(--success)" />;
  if (status === 'failed' || status === 'cancelled' || status === 'interrupted') {
    return <XCircle size={16} color="var(--danger)" />;
  }
  return null;
}

function rebuildHref(t: Task): string {
  if (t.operation === 'flatten-tileset') {
    const preview = t.options?.preview as { sourceArtifactId?: string } | undefined;
    const params = new URLSearchParams({ operation: 'flatten' });
    if (preview?.sourceArtifactId) params.set('artifact', preview.sourceArtifactId);
    return `/preview/tiles?${params}`;
  }
  const params = new URLSearchParams();
  if (t.input) params.set('input', t.input);
  if (t.output) params.set('output', cloneOutputPath(t.output));
  if (t.name) params.set('name', t.name);
  const q = params.toString();
  if (t.operation === 'merge-tilesets') {
    const merge = t.options?.merge as { additionalInputs?: string[] } | undefined;
    for (const input of merge?.additionalInputs || []) params.append('input', input);
    return `/tiles/merge?${params}`;
  }
  if (t.operation === 'clip-tileset') {
    const clip = t.options?.clip as { region?: unknown } | undefined;
    if (clip?.region) params.set('region', JSON.stringify(clip.region));
    return `/tiles/clip?${params}`;
  }
  if (t.operation === 'process-tileset') return `/tiles/process?${q}`;
  if (t.operation === 'convert-model') return `/model/convert?${q}`;
  if (t.operation === 'convert-ifc') return `/ifc/convert?${q}`;
  if (t.operation === 'convert-terrain') {
    const terrain = t.options?.terrain as { sources?: string[] } | undefined;
    const sources = new URLSearchParams();
    for (const source of terrain?.sources || []) sources.append('input', source);
    return `/terrain/tile?${sources}`;
  }
  return `/osgb/convert?${q}`;
}

function joinPath(directory: string, file: string): string {
  const separator = directory.includes('\\') ? '\\' : '/';
  return `${directory.replace(/[/\\]+$/, '')}${separator}${file}`;
}

function diagnosticPaths(t: Task): string[] {
  if (!t.progress || typeof t.progress !== 'object') return [];
  const progress = t.progress as Record<string, unknown>;
  return ['stderrLogPath', 'stdoutLogPath']
    .map((key) => progress[key])
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
}

function progressText(t: Task, key: string): string | null {
  if (!t.progress || typeof t.progress !== 'object') return null;
  const value = (t.progress as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function failureSuggestion(code: string | null): string | null {
  if (!code) return null;
  if (code === 'PATH_OUTPUT_EXISTS') return '请更换一个尚不存在的成果目录。';
  if (code === 'PATH_OUTPUT_NOT_WRITABLE') return '请检查输出目录权限，或选择可写磁盘。';
  if (code === 'CONVERTER_EXIT_NONZERO')
    return '查看 stderr 诊断文件，确认输入数据和 converter 依赖。';
  if (code === 'TERRAIN_RUNTIME_MISSING') return '地形组件缺失，请修复安装后重试。';
  if (code === 'TERRAIN_NODATA_POLICY_REQUIRED') return '源数据有 NoData 空洞，请在地形切片页选择插值或固定高程后重新提交。';
  if (code === 'TERRAIN_NODATA_FILL_FAILED') return '有空洞离有效数据太远，请加大插值搜索半径或改用固定高程。';
  if (code === 'TERRAIN_TRANSFORM_LOW_ACCURACY') return '该坐标系到 WGS 84 只有精度未知的变换；确认可接受后在页面中勾选再提交。';
  if (code === 'TERRAIN_CRS_MISSING') return '源文件没有坐标系，请在地形切片页指定源坐标系。';
  if (code === 'TERRAIN_INPUT_MIXED_DATUM') return '多个源文件的坐标基准不同，请分开切片或先统一基准。';
  if (code === 'TASK_CANCELLED') return '任务已取消；原始输入和既有成果应保持不变。';
  return '请查看完整日志和诊断文件，再决定是否重试。';
}

export function Processing() {
  const { tasks, loading, error, refresh } = useTasks(2000);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('task'));
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [logText, setLogText] = useState('');
  const [logOpen, setLogOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const id = searchParams.get('task');
    if (id) setSelectedId(id);
  }, [searchParams]);

  const filtered = useMemo(() => {
    let list = tasks.filter(statusFilter[tab]);
    if (typeFilter !== 'all') {
      list = list.filter((t) => t.operation === typeFilter);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          (t.name || '').toLowerCase().includes(q) ||
          (t.operation || '').toLowerCase().includes(q) ||
          (t.input || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [tasks, tab, typeFilter, query]);

  const selected = selectedId ? tasks.find((t) => t.id === selectedId) || null : null;
  const selectedErrorCode = selected ? progressText(selected, 'errorCode') : null;
  const selectedFailedStage = selected ? progressText(selected, 'failedStage') : null;
  const selectedSuggestion = failureSuggestion(selectedErrorCode);

  useEffect(() => {
    if (!selected) {
      setLogText('');
      return;
    }
    if (selected.log) {
      setLogText(selected.log);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await api.getTaskLogs(selected.id);
        if (!cancelled) setLogText(data.log || (data.lines || []).join('\n'));
      } catch {
        if (!cancelled) setLogText('');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected?.id, selected?.log, selected?.updatedAt]);

  async function previewTerrain(id: string) {
    setActionError(null);
    try {
      const artifact = await api.ensureTerrainArtifact(id);
      navigate(`/preview/terrain?artifact=${encodeURIComponent(artifact.id)}`);
    } catch (reason) {
      setActionError(friendlyError(reason));
    }
  }

  async function openTerrain(id: string) {
    setActionError(null);
    try {
      await api.openTerrainOutput(id);
    } catch (reason) {
      setActionError(friendlyError(reason));
    }
  }

  async function cancel(id: string) {
    setActionError(null);
    setCancellingId(id);
    try {
      await api.cancelTask(id);
      await refresh();
    } catch (e) {
      setActionError(friendlyError(e));
    } finally {
      setCancellingId(null);
    }
  }

  function selectTask(id: string | null) {
    setSelectedId(id);
    setLogOpen(false);
    if (id) {
      setSearchParams({ task: id }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }

  function rowActions(t: Task) {
    if (isActiveStatus(t.status)) {
      return (
        <button
          className="btn btn-sm"
          type="button"
          disabled={cancellingId === t.id || t.status === 'cancelling'}
          onClick={(e) => {
            e.stopPropagation();
            void cancel(t.id);
          }}
        >
          {t.status === 'cancelling' || cancellingId === t.id ? '取消中…' : '取消'}
        </button>
      );
    }
    if (t.status === 'completed' || t.status === 'succeeded') {
      return (
        <div className="row wrap" style={{ gap: 6 }} onClick={(e) => e.stopPropagation()}>
          {(t.artifactId || t.output) && t.operation !== 'convert-terrain' ? (
            <Link className="btn btn-sm" to="/results">
              查看成果
            </Link>
          ) : null}
          {t.operation === 'convert-terrain' && t.status === 'succeeded' ? (
            <button className="btn btn-sm" type="button" onClick={() => void previewTerrain(t.id)}>
              预览地形
            </button>
          ) : null}
          <button className="btn btn-sm" type="button" onClick={() => navigate(rebuildHref(t))}>
            重新处理
          </button>
        </div>
      );
    }
    if (t.status === 'failed' || t.status === 'cancelled' || t.status === 'interrupted') {
      return (
        <div className="row wrap" style={{ gap: 6 }} onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-sm" type="button" onClick={() => selectTask(t.id)}>
            查看详情
          </button>
          <button className="btn btn-sm" type="button" onClick={() => navigate(rebuildHref(t))}>
            重新处理
          </button>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="page-header full-width">
        <div>
          <h1>任务</h1>
          <p>查看进度、取消任务或重新处理。</p>
        </div>
        <div className="search-wrap">
          <input
            className="input"
            placeholder="搜索任务…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="搜索任务"
            style={{ paddingLeft: 10 }}
          />
        </div>
      </div>

      {error ? (
        <div style={{ marginBottom: 12 }}>
          <Alert kind="warn">{error}</Alert>
        </div>
      ) : null}
      {actionError ? (
        <div style={{ marginBottom: 12 }}>
          <Alert kind="error">{actionError}</Alert>
        </div>
      ) : null}

      <div className="filter-row">
        <span className="filter-row__label">状态</span>
        <div className="tabs">
          {(
            [
              ['all', '全部'],
              ['active', '进行中'],
              ['done', '已完成'],
              ['failed', '失败'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={tab === id}
              className={`tab${tab === id ? ' active' : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="filter-row__label">类型</span>
        <select
          className="select"
          aria-label="任务类型"
          style={{ width: 160 }}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">全部</option>
          <option value="convert-osgb">OSGB 转换</option>
          <option value="convert-model">通用模型转换</option>
          <option value="convert-ifc">IFC 转换</option>
          <option value="convert-terrain">地形切片</option>
          <option value="process-tileset">Tiles 处理</option>
          <option value="merge-tilesets">3D Tiles 合并</option>
          <option value="clip-tileset">范围裁剪</option>
          <option value="flatten-tileset">区域压平</option>
        </select>
      </div>

      <div className="split-drawer">
        <div className="split-drawer__list">
          {loading && tasks.length === 0 ? (
            <div className="muted">加载中…</div>
          ) : filtered.length === 0 ? (
            tasks.length === 0 ? (
              <div>
                <EmptyState title="还没有任务" description="选择一个工具开始处理。" />
                <div style={{ marginTop: 12, textAlign: 'center' }}>
                  <Link className="btn btn-primary" to="/">
                    选择工具
                  </Link>
                </div>
              </div>
            ) : (
              <p className="muted">没有符合筛选条件的任务。</p>
            )
          ) : (
            <div className="task-table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>类型</th>
                    <th>状态</th>
                    <th>时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => {
                    const line = statusLine(t);
                    return (
                      <tr
                        key={t.id}
                        onClick={() => selectTask(t.id)}
                        style={{
                          cursor: 'pointer',
                          background: selected?.id === t.id ? 'var(--surface-selected)' : undefined,
                        }}
                      >
                        <td>
                          <div className="task-name">
                            <span className="task-name__icon" aria-hidden>
                              <TaskIcon operation={t.operation} />
                            </span>
                            <button
                              type="button"
                              title={t.name || t.id}
                              aria-expanded={selected?.id === t.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                selectTask(t.id);
                              }}
                            >
                              {t.name || t.operation || t.id}
                            </button>
                          </div>
                        </td>
                        <td className="muted">{opLabel(t.operation)}</td>
                        <td>
                          <div className="task-status-cell">
                            <span className="row" style={{ gap: 6 }}>
                              <StatusIcon status={t.status} />
                              <span>{line.text}</span>
                            </span>
                            {(t.status === 'running' || t.status === 'cancelling') && (
                              <div
                                className={`progress-bar${line.pct == null ? ' indeterminate' : ''}`}
                              >
                                <i style={{ width: `${line.pct ?? 40}%` }} />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="muted">{fmtTime(t.updatedAt || t.createdAt)}</td>
                        <td>{rowActions(t)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected ? (
          <aside className="split-drawer__panel">
            <div className="drawer-head">
              <div>
                <h2>{selected.name || selected.operation || selected.id}</h2>
                <div style={{ marginTop: 6 }}>
                  <StatusBadge status={selected.status as TaskStatus} />
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() => selectTask(null)}
              >
                关闭
              </button>
            </div>

            <div className="section-title">处理阶段</div>
            <StageStepper stages={selected.stages} orientation="horizontal" />

            {isActiveStatus(selected.status) && typeof selected.progress === 'object' && (
              <div
                className="summary-box"
                style={{ marginTop: 16, marginBottom: 16, background: 'var(--surface-hover)' }}
              >
                <dl>
                  {(selected.progress as TaskProgressDetail).completed !== undefined && (
                    <>
                      <dt>进度</dt>
                      <dd>
                        {(selected.progress as TaskProgressDetail).completed}
                        {(selected.progress as TaskProgressDetail).total !== undefined &&
                        (selected.progress as TaskProgressDetail).total! > 0
                          ? ` / ${(selected.progress as TaskProgressDetail).total}`
                          : ' 个单元'}
                      </dd>
                    </>
                  )}
                  {(selected.progress as TaskProgressDetail).parallelism !== undefined && (
                    <>
                      <dt>并行数</dt>
                      <dd>{(selected.progress as TaskProgressDetail).parallelism} worker(s)</dd>
                    </>
                  )}
                  {(selected.progress as TaskProgressDetail).resourceWait && (
                    <>
                      <dt>状态</dt>
                      <dd>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <HourglassHigh size={14} />
                          等待资源
                        </span>
                      </dd>
                    </>
                  )}
                </dl>
              </div>
            )}

            <div className="summary-box" style={{ marginTop: 16, marginBottom: 16 }}>
              <dl>
                <dt>操作</dt>
                <dd>{opLabel(selected.operation)}</dd>
                <dt>阶段</dt>
                <dd>{selected.stage || '—'}</dd>
                <dt>输入</dt>
                <dd>{selected.input || '—'}</dd>
                {selected.operation === 'clip-tileset' && (
                  <>
                    <dt>保留区域</dt>
                    <dd>
                      <pre>
                        {JSON.stringify(
                          (selected.options?.clip as { region?: unknown })?.region,
                          null,
                          2,
                        )}
                      </pre>
                    </dd>
                  </>
                )}
                {selected.operation === 'flatten-tileset' && (
                  <>
                    <dt>压平区域与高度</dt>
                    <dd>
                      <pre>{JSON.stringify(selected.options?.flatten, null, 2)}</pre>
                    </dd>
                    <dt>重新设置</dt>
                    <dd>重新创建会打开源模型预览，请重新绘制区域并拖动目标平面。</dd>
                  </>
                )}
                {selected.operation === 'merge-tilesets' && (
                  <>
                    <dt>其他输入</dt>
                    <dd>
                      {(
                        (selected.options?.merge as { additionalInputs?: string[] })
                          ?.additionalInputs || []
                      ).map((path, index) => (
                        <div key={index}>{path}</div>
                      ))}
                    </dd>
                  </>
                )}
                <dt>输出</dt>
                <dd>{selected.artifactPath || selected.output || '—'}</dd>
                {selected.operation === 'convert-terrain' &&
                (selected.status === 'succeeded' || selected.status === 'completed') ? (
                  <>
                    <dt>地形成果</dt>
                    <dd>
                      {['layer.json', 'geoforge-terrain.json'].map((file) => (
                        <div key={file} style={{ wordBreak: 'break-all' }}>
                          {joinPath(progressText(selected, 'path') || selected.output || '', file)}
                        </div>
                      ))}
                      <div className="row wrap" style={{ gap: 6, marginTop: 6 }}>
                        <button className="btn btn-sm btn-primary" type="button" onClick={() => void previewTerrain(selected.id)}>
                          预览地形
                        </button>
                        <button className="btn btn-sm" type="button" onClick={() => void openTerrain(selected.id)}>
                          打开文件夹
                        </button>
                      </div>
                    </dd>
                  </>
                ) : null}
                {selected.operation === 'convert-terrain' && terrainWarnings(logText || selected.log || '').length > 0 ? (
                  <>
                    <dt>质量警告</dt>
                    <dd>
                      {terrainWarnings(logText || selected.log || '').map((warning) => (
                        <Alert key={warning.code + warning.message} kind="warn">
                          {warning.message}（{warning.code}）
                        </Alert>
                      ))}
                    </dd>
                  </>
                ) : null}
                <dt>说明</dt>
                <dd>{selected.message || selected.error || '—'}</dd>
                {selectedErrorCode ? (
                  <>
                    <dt>错误代码</dt>
                    <dd>{selectedErrorCode}</dd>
                  </>
                ) : null}
                {selectedFailedStage ? (
                  <>
                    <dt>失败阶段</dt>
                    <dd>{selectedFailedStage}</dd>
                  </>
                ) : null}
                {selectedSuggestion && selected.status !== 'succeeded' ? (
                  <>
                    <dt>建议</dt>
                    <dd>{selectedSuggestion}</dd>
                  </>
                ) : null}
                {diagnosticPaths(selected).length ? (
                  <>
                    <dt>诊断日志</dt>
                    <dd>
                      {diagnosticPaths(selected).map((path) => (
                        <div key={path} style={{ wordBreak: 'break-all' }}>
                          {path}
                        </div>
                      ))}
                    </dd>
                  </>
                ) : null}
              </dl>
            </div>

            <details
              open={logOpen}
              onToggle={(e) => setLogOpen((e.target as HTMLDetailsElement).open)}
            >
              <summary className="muted" style={{ cursor: 'pointer' }}>
                执行日志
              </summary>
              <pre className="log-pre">{logText || selected.log || '（暂无日志）'}</pre>
            </details>

            <div className="actions">
              {isActiveStatus(selected.status) ? (
                <button
                  className="btn btn-danger"
                  type="button"
                  disabled={cancellingId === selected.id || selected.status === 'cancelling'}
                  onClick={() => void cancel(selected.id)}
                >
                  {selected.status === 'cancelling' || cancellingId === selected.id
                    ? '取消中…'
                    : '取消任务'}
                </button>
              ) : null}
              {(selected.status === 'failed' ||
                selected.status === 'cancelled' ||
                selected.status === 'interrupted') &&
              typeof selected.progress === 'object' &&
              (selected.progress as TaskProgressDetail).completed !== undefined &&
              (selected.progress as TaskProgressDetail).completed! > 0 ? (
                <button
                  className="btn"
                  type="button"
                  onClick={() => navigate(rebuildHref(selected))}
                  title="从断点恢复处理"
                >
                  <ArrowClockwise size={16} style={{ marginRight: 4 }} />
                  恢复处理
                </button>
              ) : null}
              {isDoneStatus(selected.status) ? (
                <button
                  className="btn"
                  type="button"
                  onClick={() => navigate(rebuildHref(selected))}
                >
                  重新处理
                </button>
              ) : null}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
