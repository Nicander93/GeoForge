import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, friendlyError, isTauri, type ExecutionSettings } from '../api/desktop';
import type { CapabilitiesResponse, TerrainInspectResult } from '../api/types';
import { Alert } from '../components/Alert';
import { Drawer } from '../components/Drawer';
import { FormSection } from '../components/FormSection';
import { PageHeader } from '../components/PageHeader';
import { PathField } from '../components/PathField';
import { SubmitBar } from '../components/SubmitBar';
import { Switch } from '../components/Switch';
import {
  addTerrainSources,
  buildTerrainOutputPath,
  buildTerrainTaskOptions,
  describeBounds,
  describeCrs,
  describeNoData,
  describePixel,
  describeRoute,
  describeVertical,
  emptyTerrainForm,
  lowAccuracyTransform,
  noDataPolicyNeeded,
  terrainBlockers,
  terrainOutputPathError,
  terrainMessage,
  terrainSourceHoles,
  TERRAIN_MAX_DEPTH,
  type NoDataChoice,
  type TerrainForm,
  type VerticalDatumMode,
} from '../lib/terrainForm';

type FormState = TerrainForm & { outputParent: string; name: string };

const defaults: FormState = { ...emptyTerrainForm(), outputParent: '', name: '' };

function createOutputId(): string {
  return `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
}

function initialForm(params: URLSearchParams): FormState {
  return { ...defaults, sources: addTerrainSources([], params.getAll('input')) };
}

export function TerrainTile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<FormState>(() => initialForm(searchParams));
  const [outputId, setOutputId] = useState(createOutputId);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [capabilities, setCapabilities] = useState<CapabilitiesResponse | null>(null);
  const [execution, setExecution] = useState<ExecutionSettings | null>(null);
  const [crsDraft, setCrsDraft] = useState('');
  const [inspection, setInspection] = useState<TerrainInspectResult | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const inspectRequest = useRef(0);
  const [inspectNonce, setInspectNonce] = useState(0);
  const output = buildTerrainOutputPath(form.sources[0] || '', form.outputParent, outputId);
  const runtimeMissing = capabilities?.terrain?.ready === false;
  const blockers = terrainBlockers({ ...form, output }, inspection, inspecting);
  const plan = inspection?.plan || null;
  const holes = terrainSourceHoles(inspection);

  useEffect(() => {
    void api.capabilities().then(setCapabilities).catch(() => setCapabilities(null));
    void api
      .getSettings()
      .then((settings) => setExecution(settings.execution || null))
      .catch(() => setExecution(null));
  }, []);

  useEffect(() => {
    if (form.sources.length === 0 || !isTauri()) {
      setInspection(null);
      setInspecting(false);
      return;
    }
    const request = ++inspectRequest.current;
    setInspecting(true);
    setInspectError(null);
    void api
      .inspectTerrain({
        paths: form.sources,
        crsOverride: form.crsOverride || null,
        acceptBallpark: form.acceptBallpark,
        projectionMode: form.projectionMode,
      })
      .then((result) => {
        if (request === inspectRequest.current) setInspection(result);
      })
      .catch((reason) => {
        if (request !== inspectRequest.current) return;
        setInspection(null);
        setInspectError(friendlyError(reason));
      })
      .finally(() => {
        if (request === inspectRequest.current) setInspecting(false);
      });
  }, [form.sources, form.crsOverride, form.acceptBallpark, form.projectionMode, inspectNonce]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  async function cancelInspect() {
    inspectRequest.current += 1;
    setInspecting(false);
    setInspection(null);
    setInspectError('已取消 DEM 检查。点击“重新检查”或修改源文件后会再次检查。');
    await api.cancelTerrainInspect().catch(() => undefined);
  }

  async function pickSources() {
    try {
      const picked = await api.selectTerrainFiles();
      if (picked.length) update('sources', addTerrainSources(form.sources, picked));
    } catch (reason) {
      setError(friendlyError(reason));
    }
  }

  async function pickOutput() {
    try {
      const path = await api.selectOutputDirectory();
      if (!path) return;
      update('outputParent', path);
      setOutputId(createOutputId());
    } catch (reason) {
      setError(friendlyError(reason));
    }
  }

  function importWkt(file: File | undefined) {
    if (!file) return;
    void file.text().then((text) => setCrsDraft(text.trim()));
  }

  async function submit() {
    setError(null);
    if (runtimeMissing) return setError(capabilities?.terrain?.reason || '找不到地形组件，请修复安装。');
    if (blockers.length) return setError(blockers[0]);
    setSubmitting(true);
    try {
      const result = await api.createTask({
        operation: 'convert-terrain',
        input: { path: form.sources[0].trim() },
        output: { path: output },
        taskName: form.name.trim() || undefined,
        options: buildTerrainTaskOptions({ ...form, output }, inspection, execution),
      });
      const id = result.task?.id || result.id;
      if (id) navigate(`/processing?task=${encodeURIComponent(id)}`);
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="地形切片"
        description="将 DEM 切成 Cesium quantized-mesh 地形（layer.json + .terrain）。"
        actions={
          <button className="btn" type="button" onClick={() => setAdvancedOpen(true)}>
            高级设置
          </button>
        }
      />
      <div className="page-form">
        {error ? <Alert kind="error">{error}</Alert> : null}
        {runtimeMissing ? <Alert kind="warn">{capabilities?.terrain?.reason || '找不到地形组件，请修复安装。'}</Alert> : null}
        <FormSection title="数据" description="支持 GeoTIFF/BigTIFF、ASC 与 VRT，可一次添加多个相邻或重叠的文件；重叠处以列表中靠后的文件为准。">
          <div className="field">
            <div className="actions">
              <button className="btn" type="button" onClick={() => void pickSources()} disabled={!isTauri()}>
                添加 DEM 文件
              </button>
              {form.sources.length ? (
                <button className="btn btn-ghost" type="button" onClick={() => update('sources', [])}>
                  清空
                </button>
              ) : null}
              {inspecting ? (
                <>
                  <span className="muted" role="status">正在检查 DEM…</span>
                  <button className="btn btn-ghost" type="button" onClick={() => void cancelInspect()}>
                    取消检查
                  </button>
                </>
              ) : null}
              {!inspecting && form.sources.length ? (
                <button className="btn btn-ghost" type="button" onClick={() => setInspectNonce((nonce) => nonce + 1)}>
                  重新检查
                </button>
              ) : null}
            </div>
          </div>
          {inspectError ? <Alert kind="warn">{inspectError}</Alert> : null}
          {form.sources.length ? (
            <table className="table terrain-sources">
              <thead>
                <tr>
                  <th>文件</th>
                  <th>格式与尺寸</th>
                  <th>坐标系</th>
                  <th>范围（WGS 84）</th>
                  <th>NoData</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {form.sources.map((path, index) => {
                  const source = inspection?.sources[index];
                  return (
                    <tr key={path}>
                      <td style={{ wordBreak: 'break-all' }}>{path}</td>
                      {source?.error ? (
                        <td colSpan={4} className="terrain-source-error">
                          {terrainMessage(source.error.message)}（{source.error.code}）
                        </td>
                      ) : (
                        <>
                          <td>{source?.driver ? `${source.driver} · ${source.dataType} · ${describePixel(source)}` : '—'}</td>
                          <td>{source?.crs ? describeCrs(source.crs) : '—'}</td>
                          <td>{describeBounds(source?.bounds?.wgs84)}</td>
                          <td>{source?.noData ? describeNoData(source) : '—'}</td>
                        </>
                      )}
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          type="button"
                          aria-label={`移除 ${path}`}
                          onClick={() => update('sources', form.sources.filter((_, other) => other !== index))}
                        >
                          移除
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="field-hint">尚未添加 DEM 文件。</p>
          )}
          {plan ? (
            <p className="field-hint terrain-plan">
              处理方式：{describeRoute(plan.route, plan.routeReason)}；推荐最大层级 {plan.recommendedMaxDepth}
              （源像元约 {plan.pixelGroundMetres.toFixed(2)} m）；合并范围 {describeBounds(plan.wgs84Bounds)}。
            </p>
          ) : null}
        </FormSection>
        <FormSection title="坐标系" description="只说明源文件中的坐标是什么含义，不会改动像元坐标。留空时使用文件自带的坐标系。">
          <div className="field">
            <label htmlFor="terrain-crs">指定源坐标系</label>
            <textarea
              id="terrain-crs"
              className="input"
              rows={form.crsOverride || crsDraft.length > 60 ? 4 : 1}
              placeholder="例如 EPSG:4547，或粘贴 WKT"
              value={crsDraft}
              onChange={(event) => setCrsDraft(event.target.value)}
            />
            <div className="actions">
              <button className="btn btn-sm" type="button" disabled={crsDraft.trim() === form.crsOverride}
                onClick={() => update('crsOverride', crsDraft.trim())}>
                应用
              </button>
              <label className="btn btn-sm btn-ghost">
                导入 WKT/PRJ 文件
                <input type="file" accept=".prj,.wkt,.txt" hidden aria-label="导入 WKT 文件"
                  onChange={(event) => importWkt(event.target.files?.[0])} />
              </label>
              {form.crsOverride ? (
                <button className="btn btn-sm btn-ghost" type="button" onClick={() => { setCrsDraft(''); update('crsOverride', ''); }}>
                  改回文件坐标系
                </button>
              ) : null}
            </div>
            <p className="field-hint">
              {plan
                ? `生效坐标系：${describeCrs(plan.crs)}${plan.crs.conversionMethod ? ` · 投影方法 ${String(plan.crs.conversionMethod)}` : ''}${form.crsOverride ? '（用户指定，应用于全部源文件）' : ''}。`
                : '检查通过后显示生效坐标系的全称、投影分带与单位。'}
            </p>
          </div>
          {lowAccuracyTransform(inspection) || form.acceptBallpark ? (
            <Switch id="terrain-ballpark" checked={form.acceptBallpark} onChange={(checked) => update('acceptBallpark', checked)}>
              接受精度未知的坐标变换（不做基准转换，平面误差未知，可能达数十米以上）
            </Switch>
          ) : null}
        </FormSection>
        <FormSection title="高程" description="高程值按原样写入，不做任何垂直基准转换，也不会自动套用 EGM96。">
          <p className="field-hint">源文件声明的垂直基准：{describeVertical(plan?.verticalName)}</p>
          <div className="field">
            <label htmlFor="terrain-vertical">源高程的含义</label>
            <select id="terrain-vertical" className="select" value={form.verticalMode}
              onChange={(event) => update('verticalMode', event.target.value as VerticalDatumMode)}>
              <option value="">请选择</option>
              <option value="ellipsoidal">椭球高（与 Cesium 一致）</option>
              <option value="orthometric-known">正高/正常高（已知基准，如 1985 国家高程基准）</option>
              <option value="unknown">不清楚</option>
            </select>
          </div>
          {form.verticalMode && form.verticalMode !== 'ellipsoidal' ? (
            <Switch id="terrain-vertical-ack" checked={form.verticalAcknowledged}
              onChange={(checked) => update('verticalAcknowledged', checked)}>
              我知道高程将按原值写入；在 Cesium 中与椭球高相差一个大地水准面差距（国内可达数十米）
            </Switch>
          ) : null}
        </FormSection>
        {inspection?.valid && noDataPolicyNeeded(inspection) ? (
          <FormSection
            title="NoData 空洞"
            description={holes === undefined ? '源数据声明了 NoData，但空洞数未统计（文件较大）。请选择处理方式；没有空洞时不会改动数据。' : `源数据中有 ${holes.toLocaleString('zh-CN')} 个 NoData 像元，需要决定如何处理。`}
          >
            <div className="field">
              <label htmlFor="terrain-nodata">处理方式</label>
              <select id="terrain-nodata" className="select" value={form.noDataMode}
                onChange={(event) => update('noDataMode', event.target.value as NoDataChoice)}>
                <option value="">请选择</option>
                <option value="interpolate">由周边高程插值</option>
                <option value="explicit-constant">填充固定高程</option>
              </select>
            </div>
            {form.noDataMode === 'interpolate' ? (
              <div className="field">
                <label htmlFor="terrain-search">最大搜索半径（像元）</label>
                <input id="terrain-search" className="input" type="number" min={1} max={1000}
                  value={form.maxSearchPixels} onChange={(event) => update('maxSearchPixels', event.target.value)} />
                <p className="field-hint">插值结果是推测值，不是实测高程。离有效数据超过该半径的空洞会让任务失败，而不是被随意填补。</p>
              </div>
            ) : null}
            {form.noDataMode === 'explicit-constant' ? (
              <div className="field">
                <label htmlFor="terrain-fill">填充高程（米）</label>
                <input id="terrain-fill" className="input" placeholder="例如 0" value={form.noDataValue}
                  onChange={(event) => update('noDataValue', event.target.value)} />
                <p className="field-hint">0 m 是合法高程，会被当作真实地面写入。空洞较大时会出现明显的平台或陡坎。</p>
              </div>
            ) : null}
          </FormSection>
        ) : null}
        <FormSection title="切片" columns={2}>
          <div className="field">
            <label htmlFor="terrain-depth">最大层级</label>
            <input id="terrain-depth" className="input" type="number" min={0} max={TERRAIN_MAX_DEPTH}
              placeholder={plan ? `自动（推荐 ${plan.recommendedMaxDepth}）` : '自动'}
              value={form.maxDepth} onChange={(event) => update('maxDepth', event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="terrain-quality">网格质量</label>
            <select id="terrain-quality" className="select" value={form.meshQuality}
              onChange={(event) => update('meshQuality', event.target.value as 'balanced' | 'high')}>
              <option value="balanced">均衡</option>
              <option value="high">高（三角形更多，文件更大）</option>
            </select>
          </div>
        </FormSection>
        <FormSection title="输出" description="自动生成新的成果目录，内含 layer.json 和 geoforge-terrain.json 报告。">
          <PathField
            label="保存位置（已有文件夹）"
            value={form.outputParent}
            onChange={(value) => update('outputParent', value)}
            onPick={isTauri() ? () => void pickOutput() : undefined}
            pickLabel="选择文件夹"
            error={terrainOutputPathError(form.sources, output)}
            hint={output ? `将新建成果目录：${output}。不会覆盖已有目录。` : '请选择保存位置，应用会在其中新建成果目录。'}
          />
        </FormSection>
        {blockers.length ? (
          <Alert kind="info">
            <div className="terrain-blockers" aria-label="尚未满足的条件">
              {blockers.map((blocker) => (
                <div key={blocker}>· {blocker}</div>
              ))}
            </div>
          </Alert>
        ) : null}
        <Drawer title="高级设置" open={advancedOpen} onClose={() => setAdvancedOpen(false)}>
          <section className="drawer-group">
            <h3>预处理</h3>
            <p className="field-hint">投影坐标的 DEM 会先重投影到 WGS 84 再切片；WGS 84 经纬度数据直接切片。</p>
            <Switch id="terrain-overview" checked={form.overview === 'auto'}
              onChange={(checked) => update('overview', checked ? 'auto' : 'off')}>
              缺少金字塔时自动生成
            </Switch>
            <Switch id="terrain-normals" checked={form.normals} onChange={(checked) => update('normals', checked)}>
              输出顶点法线（Cesium 光照）
            </Switch>
          </section>
          <section className="drawer-group">
            <h3>资源</h3>
            <p className="field-hint">
              {execution?.resourceMode === 'custom'
                ? `使用设置中的自定义资源：CPU 线程 ${execution.cpuWorkers ?? '自动'}，内存 ${execution.memoryBudgetMiB ?? '自动'} MiB。`
                : '使用设置中的自动资源分配。线程与内存请在“设置”页修改。'}
            </p>
          </section>
          <div className="field">
            <label htmlFor="terrain-name">任务名</label>
            <input id="terrain-name" className="input" placeholder="可选，自动命名" value={form.name}
              onChange={(event) => update('name', event.target.value)} />
          </div>
        </Drawer>
        <SubmitBar
          onReset={() => {
            setForm(defaults);
            setCrsDraft('');
            setOutputId(createOutputId());
            setError(null);
          }}
          primaryLabel={submitting ? '提交中…' : '开始切片'}
          onPrimary={() => void submit()}
          primaryDisabled={submitting || blockers.length > 0 || runtimeMissing}
          hint={blockers[0] || 'quantized-mesh 1.0 · 地理格网（EPSG:4326 TMS）'}
        />
      </div>
    </div>
  );
}
