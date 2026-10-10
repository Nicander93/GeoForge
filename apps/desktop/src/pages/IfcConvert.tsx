import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, friendlyError, isTauri, type ExecutionSettings } from '../api/desktop';
import type { CapabilitiesResponse } from '../api/types';
import { Alert } from '../components/Alert';
import { Drawer } from '../components/Drawer';
import { FormSection } from '../components/FormSection';
import { PageHeader } from '../components/PageHeader';
import { PathField } from '../components/PathField';
import { SubmitBar } from '../components/SubmitBar';
import { Switch } from '../components/Switch';
import {
  buildIfcOutputPath,
  buildIfcTaskOptions,
  ifcConvertValidationError,
  ifcOutputPathError,
  type IfcConvertForm,
  type IfcGeoreferenceMode,
} from '../lib/ifcConvert';

type FormState = IfcConvertForm & { outputParent: string; name: string };

const defaults: FormState = {
  input: '',
  output: '',
  outputParent: '',
  name: '',
  georeferenceMode: 'auto',
  longitude: '',
  latitude: '',
  height: '',
  sourceCrs: '',
  includeClasses: '',
  excludeClasses: '',
  keepEmptyColumns: false,
};

const georeferenceHints: Record<IfcGeoreferenceMode, string> = {
  auto: '优先用文件里的 IfcMapConversion，其次用 IfcSite 经纬度，都没有时保留本地坐标。',
  local: '不做地理定位，预览时放在默认位置。',
  anchor: '把 IFC 项目原点放到指定经纬度，X 朝东、Y 朝北。',
  crs: '用指定 CRS 代替文件中的 CRS；没有 IfcMapConversion 时把坐标当作该 CRS 的东、北、高。',
};

function createOutputId(): string {
  return `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
}

export function IfcConvert() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(defaults);
  const [outputId, setOutputId] = useState(createOutputId);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [capabilities, setCapabilities] = useState<CapabilitiesResponse | null>(null);
  const [execution, setExecution] = useState<ExecutionSettings | null>(null);
  const output = buildIfcOutputPath(form.input, form.outputParent, outputId);
  const formError = ifcConvertValidationError({ ...form, output });
  const toolMissing = capabilities?.ifc?.ready === false;

  useEffect(() => {
    void api
      .capabilities()
      .then(setCapabilities)
      .catch(() => setCapabilities(null));
    void api
      .getSettings()
      .then((settings) => setExecution(settings.execution || null))
      .catch(() => setExecution(null));
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  async function pick(kind: 'input' | 'outputParent') {
    try {
      const path = kind === 'input' ? await api.selectIfcFile() : await api.selectOutputDirectory();
      if (!path) return;
      update(kind, path);
      if (kind === 'outputParent') setOutputId(createOutputId());
    } catch (reason) {
      setError(friendlyError(reason));
    }
  }

  async function submit() {
    setError(null);
    if (toolMissing) return setError(capabilities?.ifc?.reason || '找不到 IFC 转换组件。');
    if (formError) return setError(formError);
    setSubmitting(true);
    try {
      const result = await api.createTask({
        operation: 'convert-ifc',
        input: { path: form.input.trim() },
        output: { path: output },
        taskName: form.name.trim() || undefined,
        options: buildIfcTaskOptions({ ...form, output }, execution),
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
        title="IFC 转换"
        description="将 IFC 建筑模型转换为带构件属性的 3D Tiles 1.1。"
        actions={
          <button className="btn" type="button" onClick={() => setAdvancedOpen(true)}>
            高级设置
          </button>
        }
      />
      <div className="page-form">
        {error ? <Alert kind="error">{error}</Alert> : null}
        {toolMissing ? (
          <Alert kind="warn">{capabilities?.ifc?.reason || '找不到 IFC 转换组件，请修复安装。'}</Alert>
        ) : null}
        <FormSection title="数据" description="已用 IFC2X3 和 IFC4 样例验证。">
          <PathField
            label="IFC 文件"
            value={form.input}
            placeholder="例如 D:\\bim\\building.ifc"
            onChange={(value) => update('input', value)}
            onPick={isTauri() ? () => void pick('input') : undefined}
            pickLabel="选择文件"
          />
        </FormSection>
        <FormSection title="定位" description={georeferenceHints[form.georeferenceMode]} columns={3}>
          <div className="field">
            <label htmlFor="ifc-georef">定位模式</label>
            <select
              id="ifc-georef"
              className="select"
              value={form.georeferenceMode}
              onChange={(event) => update('georeferenceMode', event.target.value as IfcGeoreferenceMode)}
            >
              <option value="auto">自动（读取文件定位）</option>
              <option value="local">保留本地坐标</option>
              <option value="anchor">WGS84 锚点放置</option>
              <option value="crs">指定 CRS</option>
            </select>
          </div>
          {form.georeferenceMode === 'anchor' ? (
            <div className="form-grid cols-3 span-all">
              <div className="field">
                <label htmlFor="ifc-lon">经度</label>
                <input id="ifc-lon" className="input" placeholder="经度" value={form.longitude}
                  onChange={(event) => update('longitude', event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="ifc-lat">纬度</label>
                <input id="ifc-lat" className="input" placeholder="纬度" value={form.latitude}
                  onChange={(event) => update('latitude', event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="ifc-height">椭球高（米）</label>
                <input id="ifc-height" className="input" placeholder="椭球高（米）" value={form.height}
                  onChange={(event) => update('height', event.target.value)} />
              </div>
            </div>
          ) : null}
          {form.georeferenceMode === 'crs' ? (
            <div className="field span-2">
              <label htmlFor="ifc-crs">CRS</label>
              <input id="ifc-crs" className="input" placeholder="EPSG:4547" value={form.sourceCrs}
                onChange={(event) => update('sourceCrs', event.target.value)} />
            </div>
          ) : null}
        </FormSection>
        <FormSection title="输出" description="自动生成新的成果目录。">
          <PathField
            label="保存位置（已有文件夹）"
            value={form.outputParent}
            onChange={(value) => update('outputParent', value)}
            onPick={isTauri() ? () => void pick('outputParent') : undefined}
            pickLabel="选择文件夹"
            error={ifcOutputPathError(form.input, output)}
            hint={
              output
                ? `将新建成果目录：${output}。不会覆盖已有目录。`
                : '请选择保存位置，应用会在其中新建成果目录。'
            }
          />
        </FormSection>
        <Drawer title="高级设置" open={advancedOpen} onClose={() => setAdvancedOpen(false)}>
          <section className="drawer-group">
            <h3>构件过滤</h3>
            <p className="field-hint">多个类名用逗号或空格分隔；子类一并生效，例如 IfcWall 包含 IfcWallStandardCase。</p>
            <div className="field">
              <label htmlFor="ifc-include">仅转换这些类</label>
              <input id="ifc-include" className="input" placeholder="留空表示全部，例如 IfcWall, IfcSlab"
                value={form.includeClasses} onChange={(event) => update('includeClasses', event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="ifc-exclude">排除这些类</label>
              <input id="ifc-exclude" className="input" placeholder="例如 IfcFurnishingElement"
                value={form.excludeClasses} onChange={(event) => update('excludeClasses', event.target.value)} />
            </div>
          </section>
          <section className="drawer-group">
            <h3>属性表</h3>
            <Switch id="ifc-keep-empty" checked={form.keepEmptyColumns}
              onChange={(checked) => update('keepEmptyColumns', checked)}>
              保留全为空的属性列
            </Switch>
            <p className="field-hint">保留时这些属性只出现在属性定义里，不占数据空间。</p>
          </section>
          <div className="field">
            <label htmlFor="ifc-name">任务名</label>
            <input id="ifc-name" className="input" placeholder="可选，自动命名" value={form.name}
              onChange={(event) => update('name', event.target.value)} />
          </div>
        </Drawer>
        <SubmitBar
          onReset={() => {
            setForm(defaults);
            setOutputId(createOutputId());
            setError(null);
          }}
          primaryLabel={submitting ? '提交中…' : '开始转换'}
          onPrimary={() => void submit()}
          primaryDisabled={submitting || Boolean(formError) || toolMissing}
          hint={formError || '3D Tiles 1.1 · 每个构件一个要素，属性写入 EXT_structural_metadata'}
        />
      </div>
    </div>
  );
}
