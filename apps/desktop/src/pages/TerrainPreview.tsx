import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { X } from '@phosphor-icons/react';
import { api, friendlyError, isTauri } from '../api/desktop';
import type { Artifact, TerrainSummary } from '../api/types';
import { Alert } from '../components/Alert';
import { EmptyState } from '../components/EmptyState';
import {
  boundsText,
  displayPath,
  formatArea,
  isTerrainArtifact,
  noDataPolicyLabel,
  terrainFrameSrc,
} from '../lib/terrainArtifact';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';
type Shading = 'ramp' | 'contour' | 'none';

interface Pick {
  lon: number;
  lat: number;
  height: number | null;
  inside: boolean;
}

function metres(value?: number | null, digits = 2): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(digits)} m` : '—';
}

export function TerrainPreview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const artifactId = searchParams.get('artifact') || '';
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [terrainUrl, setTerrainUrl] = useState('');
  const [summary, setSummary] = useState<TerrainSummary | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [tilesIdle, setTilesIdle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exaggeration, setExaggeration] = useState(1);
  const [shading, setShading] = useState<Shading>('ramp');
  const [wireframe, setWireframe] = useState(false);
  const [infoOpen, setInfoOpen] = useState(true);
  const [pick, setPick] = useState<Pick | null>(null);
  const [frameKey, setFrameKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const terrainArtifacts = artifacts.filter(isTerrainArtifact);
  const selected = artifacts.find((a) => a.id === artifactId) || null;

  useEffect(() => {
    void (async () => {
      try {
        setArtifacts(await api.listArtifacts());
      } catch (e) {
        setError(friendlyError(e));
      }
    })();
  }, []);

  useEffect(() => {
    if (!artifactId) return;
    let cancelled = false;
    setTerrainUrl('');
    setError(null);
    setLoadState('loading');
    setTilesIdle(false);
    void (async () => {
      try {
        const res = await api.previewUrl(artifactId);
        if (cancelled) return;
        if (res.kind !== 'terrain') {
          setLoadState('error');
          setError('该成果不是地形成果，请在 3D Tiles 预览中打开。');
          return;
        }
        setSummary(res.terrain || null);
        setTerrainUrl(res.terrainUrl || res.url);
        setFrameKey((k) => k + 1);
      } catch (e) {
        if (cancelled) return;
        setLoadState('error');
        setError(friendlyError(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [artifactId]);

  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      if (ev.source !== iframeRef.current?.contentWindow || ev.origin !== window.location.origin) return;
      const data = ev.data || {};
      if (data.type === 'geoforge-terrain-loading') setLoadState('loading');
      if (data.type === 'geoforge-terrain-ready') setLoadState('ready');
      if (data.type === 'geoforge-terrain-idle') setTilesIdle(true);
      if (data.type === 'geoforge-terrain-error') {
        setLoadState('error');
        setError(String(data.message || '地形加载失败'));
      }
      if (data.type === 'geoforge-terrain-pick') setPick(data as Pick);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  function post(message: Record<string, unknown>) {
    iframeRef.current?.contentWindow?.postMessage(message, window.location.origin);
  }

  useEffect(() => {
    if (loadState === 'ready') post({ type: 'geoforge-terrain-style', exaggeration, shading, wireframe });
  }, [loadState, exaggeration, shading, wireframe]);

  function view(which: 'overview' | 'edge') {
    setTilesIdle(false);
    post({ type: 'geoforge-terrain-view', view: which });
  }

  const ready = loadState === 'ready';
  const statusText =
    loadState === 'loading' ? '加载中…' : ready ? (tilesIdle ? '加载完成' : '瓦片加载中…') : loadState === 'error' ? '加载失败' : '';

  return (
    <div className="preview-page">
      <div className="preview-toolbar">
        <span className="preview-toolbar__name" title={selected?.path}>
          {selected?.label || (artifactId ? artifactId : '未选择地形成果')}
        </span>
        <select
          className="select"
          style={{ maxWidth: 240 }}
          aria-label="选择地形成果"
          value={artifactId}
          onChange={(e) => setSearchParams(e.target.value ? { artifact: e.target.value } : {})}
        >
          <option value="">选择地形成果…</option>
          {terrainArtifacts.map((a) => (
            <option key={a.id} value={a.id} disabled={a.previewable === false}>
              {a.label || a.id}
              {a.previewable === false ? '（不可预览）' : ''}
            </option>
          ))}
        </select>
        <button className="btn btn-sm" type="button" disabled={!ready} onClick={() => view('overview')}>
          重置视角
        </button>
        <button className="btn btn-sm" type="button" disabled={!ready} onClick={() => view('edge')}>
          数据边缘近景
        </button>
        <label className="preview-toolbar__field" title="只改变显示，不改变成果">
          地形夸张
          <select
            className="select"
            aria-label="地形夸张"
            value={exaggeration}
            disabled={!ready}
            onChange={(e) => setExaggeration(Number(e.target.value))}
          >
            {[1, 2, 3, 5].map((v) => (
              <option key={v} value={v}>
                {v}×
              </option>
            ))}
          </select>
        </label>
        <label className="preview-toolbar__field">
          着色
          <select
            className="select"
            aria-label="着色"
            value={shading}
            disabled={!ready}
            onChange={(e) => setShading(e.target.value as Shading)}
          >
            <option value="ramp">高程着色</option>
            <option value="contour">等高线</option>
            <option value="none">无</option>
          </select>
        </label>
        <label className="preview-toolbar__field">
          <input type="checkbox" checked={wireframe} disabled={!ready} onChange={(e) => setWireframe(e.target.checked)} />
          线框
        </label>
        <div className="preview-toolbar__spacer" />
        <button className="btn btn-sm" type="button" disabled={!selected} onClick={() => setInfoOpen((v) => !v)}>
          {infoOpen ? '关闭信息' : '信息'}
        </button>
      </div>

      {error ? (
        <div style={{ marginBottom: 8 }}>
          <Alert kind="error">{error}</Alert>
        </div>
      ) : null}

      <div className={`preview-layout${infoOpen && selected ? ' with-panel' : ''}`}>
        <div className="preview-main">
          {!artifactId ? (
            terrainArtifacts.length ? (
              <div className="preview-empty">
                <p>从上方选择一个地形成果开始预览</p>
              </div>
            ) : (
              <EmptyState
                title="暂无地形成果"
                description="地形切片任务成功后，成果会自动登记到这里。"
              />
            )
          ) : (
            <>
              {statusText ? <div className="preview-status">{statusText}</div> : null}
              {terrainUrl ? (
                <iframe
                  key={`${frameKey}:${terrainUrl}`}
                  ref={iframeRef}
                  className="preview-frame"
                  title="Cesium 地形预览"
                  src={terrainFrameSrc(terrainUrl, summary)}
                />
              ) : null}
            </>
          )}
        </div>

        {infoOpen && selected ? (
          <aside className="info-panel">
            <div className="inspector-head">
              <h2>地形信息</h2>
              <button className="btn btn-ghost btn-sm" type="button" aria-label="关闭地形信息" onClick={() => setInfoOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="summary-box">
              <dl>
                <dt>成果</dt>
                <dd style={{ wordBreak: 'break-all' }}>{displayPath(selected.path)}</dd>
                <dt>范围</dt>
                <dd>
                  {boundsText(summary?.bounds)}
                  <br />
                  {formatArea(summary?.areaKm2)}
                </dd>
                <dt>层级 / 瓦片</dt>
                <dd>
                  0–{summary?.maxDepth ?? '—'}
                  {summary?.maxDepthAuto ? '（自动）' : ''} / {summary?.tiles ?? '—'}
                </dd>
                <dt>高程范围</dt>
                <dd>
                  {metres(summary?.heightMinM)} – {metres(summary?.heightMaxM)}
                </dd>
                <dt>采样误差</dt>
                <dd>
                  RMSE {metres(summary?.sampleRmseM, 3)}，P95 {metres(summary?.sampleP95M, 3)}
                  <br />
                  无洞非陡崖 RMSE {metres(summary?.sampleCleanRmseM, 3)}
                </dd>
                <dt>NoData</dt>
                <dd>
                  {noDataPolicyLabel(summary?.noDataPolicy)}
                  {typeof summary?.sourceHoleCount === 'number' && summary.sourceHoleCount > 0
                    ? `（源内空洞 ${summary.sourceHoleCount.toLocaleString('zh-CN')} 个像元）`
                    : ''}
                </dd>
                <dt>坐标系</dt>
                <dd>
                  {summary?.crsName || '—'}
                  {summary?.crsAuthority ? `（${summary.crsAuthority}）` : ''}
                </dd>
                <dt>高程基准</dt>
                <dd>{summary?.verticalConverted ? '已转换' : summary?.verticalNote || '未进行垂直基准转换'}</dd>
                <dt>鼠标处</dt>
                <dd>
                  {pick
                    ? `${pick.lon.toFixed(6)}°, ${pick.lat.toFixed(6)}°，${metres(pick.height)}${pick.inside ? '' : '（数据范围外）'}`
                    : '将鼠标移到地形上'}
                </dd>
              </dl>
            </div>
            <p className="muted" style={{ fontSize: 12 }}>
              离线预览：没有在线底图，颜色只表示高程。地形夸张只改变显示。数据范围外的 0 m 平面只用于显示。
            </p>
            {isTauri() ? (
              <button className="btn btn-sm" type="button" onClick={() => void api.openArtifactDirectory(selected.id).catch((e) => setError(friendlyError(e)))}>
                打开文件夹
              </button>
            ) : null}
            <Link className="btn btn-sm" to="/results" style={{ marginLeft: 8 }}>
              返回成果
            </Link>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
