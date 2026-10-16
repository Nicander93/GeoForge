/** Form rules and the convert-terrain request (crates/protocol TerrainOptions v2). */
import type { ExecutionSettings } from '../api/desktop';
import type { TerrainCrsInfo, TerrainInspectResult, TerrainSourceInfo } from '../api/types';

export const TERRAIN_OPTIONS_VERSION = 2;
export const TERRAIN_MAX_SOURCES = 256;
export const TERRAIN_MAX_DEPTH = 22;
export const TERRAIN_MAX_SEARCH_PIXELS = 1000;
const FILL_RANGE = [-12000, 9000] as const;
const CRS_MAX_CHARS = 16 * 1024;
const DEM_EXTENSION = /\.(tif|tiff|asc|vrt)$/i;

export type VerticalDatumMode = '' | 'ellipsoidal' | 'orthometric-known' | 'unknown';
export type NoDataChoice = '' | 'interpolate' | 'explicit-constant';
export type ProjectionChoice = 'auto' | 'normalize';

export interface TerrainForm {
  sources: string[];
  output: string;
  crsOverride: string;
  acceptBallpark: boolean;
  verticalMode: VerticalDatumMode;
  verticalAcknowledged: boolean;
  noDataMode: NoDataChoice;
  noDataValue: string;
  maxSearchPixels: string;
  /** Empty means "auto". */
  maxDepth: string;
  meshQuality: 'balanced' | 'high';
  projectionMode: ProjectionChoice;
  overview: 'auto' | 'off';
  normals: boolean;
}

export function emptyTerrainForm(): TerrainForm {
  return {
    sources: [],
    output: '',
    crsOverride: '',
    acceptBallpark: false,
    verticalMode: '',
    verticalAcknowledged: false,
    noDataMode: '',
    noDataValue: '',
    maxSearchPixels: '50',
    maxDepth: '',
    meshQuality: 'balanced',
    projectionMode: 'auto',
    overview: 'auto',
    normals: false,
  };
}

const normalize = (path: string) => path.trim().replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
const directoryOf = (path: string) => normalize(path).replace(/\/[^/]+$/, '');

/** Picked files appended in order; the same file twice is kept once. */
export function addTerrainSources(current: string[], picked: string[]): string[] {
  const seen = new Set(current.map(normalize));
  const added = picked.map((path) => path.trim()).filter((path) => {
    if (!path || seen.has(normalize(path))) return false;
    seen.add(normalize(path));
    return true;
  });
  return [...current, ...added];
}

export function buildTerrainOutputPath(firstSource: string, outputParent: string, outputId: string): string {
  const fileName = firstSource.trim().split(/[/\\]/).pop() || '';
  const parent = outputParent.trim();
  if (!fileName || !parent || !outputId) return '';
  const stem = fileName.replace(DEM_EXTENSION, '');
  const separator = parent.includes('\\') ? '\\' : '/';
  return `${parent.replace(/[/\\]+$/, '')}${separator}${stem}_terrain_${outputId}`;
}

export function terrainOutputPathError(sources: string[], output: string): string | null {
  const target = normalize(output);
  if (!target) return null;
  for (const directory of new Set(sources.map(directoryOf))) {
    if (!directory) continue;
    if (target === directory || target.startsWith(`${directory}/`)) {
      return `成果目录不能位于源文件所在目录 ${directory} 内。请选择其他保存位置。`;
    }
    if (directory.startsWith(`${target}/`)) {
      return `成果目录不能包含源文件所在目录 ${directory}。请选择其他保存位置。`;
    }
  }
  return null;
}

/** Undefined while the count is unknown: the user must decide then too. */
export function terrainSourceHoles(inspection: TerrainInspectResult | null): number | undefined {
  const count = inspection?.plan?.sourceHoles;
  if (!count || count.state !== 'computed' || count.value === null) return undefined;
  return count.value;
}

export function noDataPolicyNeeded(inspection: TerrainInspectResult | null): boolean {
  return terrainSourceHoles(inspection) !== 0;
}

export function lowAccuracyTransform(inspection: TerrainInspectResult | null): boolean {
  return Boolean(inspection?.errors.some((error) => error.code === 'TERRAIN_TRANSFORM_LOW_ACCURACY'));
}

/** Processor messages start with a classifier prefix such as "terrain crs missing:". */
export interface TerrainWarning {
  code: string;
  message: string;
}

/** Terrain quality warnings the process manager wrote into the task log as `[warning:CODE] text`. */
export function terrainWarnings(log: string): TerrainWarning[] {
  const seen = new Set<string>();
  const warnings: TerrainWarning[] = [];
  for (const match of log.matchAll(/\[warning:(TERRAIN_[A-Z_]+)\]\s*(.*)/g)) {
    const key = `${match[1]} ${match[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    warnings.push({ code: match[1], message: match[2].trim() });
  }
  return warnings;
}

export function terrainMessage(message: string): string {
  return message.replace(/^terrain [a-z ]+:\s*/i, '');
}

function finiteNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function integerIn(value: string, low: number, high: number): number | null {
  const parsed = finiteNumber(value);
  if (parsed === null || !Number.isInteger(parsed) || parsed < low || parsed > high) return null;
  return parsed;
}

/**
 * Everything that keeps the task from being submitted, in form order. The
 * processor checks all of it again; this only keeps the user in the form.
 */
export function terrainBlockers(form: TerrainForm, inspection: TerrainInspectResult | null, inspecting: boolean): string[] {
  const blockers: string[] = [];
  if (form.sources.length === 0) return ['请添加至少一个 DEM 文件（.tif/.tiff/.asc/.vrt）。'];
  if (form.sources.length > TERRAIN_MAX_SOURCES) blockers.push(`一次最多 ${TERRAIN_MAX_SOURCES} 个源文件。`);
  const wrong = form.sources.find((path) => !DEM_EXTENSION.test(path.trim()));
  if (wrong) blockers.push(`${wrong} 不是 DEM 文件，只支持 .tif/.tiff/.asc/.vrt。`);
  if (form.crsOverride.length > CRS_MAX_CHARS) blockers.push('指定的坐标系定义超过 16384 个字符。');
  if (inspecting) {
    blockers.push('正在检查 DEM，请等待检查完成或取消检查。');
  } else if (!inspection) {
    blockers.push('DEM 尚未检查。');
  } else if (!inspection.valid) {
    const errors = inspection.errors.length > 0 ? inspection.errors : [{ message: 'DEM 检查未通过。' }];
    blockers.push(...errors.map((error) => terrainMessage(error.message)));
  }
  if (!form.output.trim()) blockers.push('请选择保存位置。');
  const outputError = terrainOutputPathError(form.sources, form.output);
  if (outputError) blockers.push(outputError);
  if (!form.verticalMode) blockers.push('请确认源高程的含义（高程基准）。');
  if (form.verticalMode && form.verticalMode !== 'ellipsoidal' && !form.verticalAcknowledged) {
    blockers.push('高程将按原值写入、不做转换，请勾选确认。');
  }
  if (inspection?.valid && noDataPolicyNeeded(inspection)) {
    if (!form.noDataMode) blockers.push('源数据有 NoData 空洞（或数量未统计），请选择处理方式。');
    if (form.noDataMode === 'explicit-constant') {
      const value = finiteNumber(form.noDataValue);
      if (value === null || value < FILL_RANGE[0] || value > FILL_RANGE[1]) {
        blockers.push('填充高程应为 -12000 至 9000 之间的数值（0 m 也是合法高程）。');
      }
    }
    if (form.noDataMode === 'interpolate' && integerIn(form.maxSearchPixels, 1, TERRAIN_MAX_SEARCH_PIXELS) === null) {
      blockers.push(`插值搜索半径应为 1 至 ${TERRAIN_MAX_SEARCH_PIXELS} 的整数像元。`);
    }
  }
  if (form.maxDepth.trim() && integerIn(form.maxDepth, 0, TERRAIN_MAX_DEPTH) === null) {
    blockers.push(`最大层级应为 0 至 ${TERRAIN_MAX_DEPTH} 的整数，留空为自动。`);
  }
  return blockers;
}

function noDataPolicy(form: TerrainForm, inspection: TerrainInspectResult | null): Record<string, unknown> {
  if (!noDataPolicyNeeded(inspection)) return { mode: 'none-required' };
  if (form.noDataMode === 'explicit-constant') return { mode: 'explicit-constant', valueMeters: Number(form.noDataValue) };
  if (form.noDataMode === 'interpolate') return { mode: 'interpolate', maxSearchPixels: Number(form.maxSearchPixels) };
  return { mode: 'unresolved' };
}

export function buildTerrainTaskOptions(
  form: TerrainForm,
  inspection: TerrainInspectResult | null,
  execution?: ExecutionSettings | null,
): Record<string, unknown> {
  const preprocess: Record<string, unknown> = {};
  if (form.projectionMode !== 'auto') preprocess.projectionMode = form.projectionMode;
  if (form.overview === 'off') preprocess.overview = 'off';
  if (form.acceptBallpark) preprocess.acceptBallparkTransform = true;
  const terrain: Record<string, unknown> = {
    version: TERRAIN_OPTIONS_VERSION,
    sources: form.sources.map((path) => path.trim()),
    verticalDatum: { mode: form.verticalMode, acknowledged: form.verticalAcknowledged },
    noData: noDataPolicy(form, inspection),
    preprocess,
    tiling: {
      maxDepth: form.maxDepth.trim() ? Number(form.maxDepth) : 'auto',
      meshQuality: form.meshQuality,
      normals: form.normals,
    },
  };
  if (form.crsOverride.trim()) terrain.crsOverride = form.crsOverride.trim();
  const options: Record<string, unknown> = { terrain };
  if (execution?.resourceMode === 'custom') {
    const custom = Object.fromEntries(
      (['cpuWorkers', 'memoryBudgetMiB', 'ioWorkers'] as const)
        .filter((key) => execution[key] !== undefined)
        .map((key) => [key, execution[key]]),
    );
    if (Object.keys(custom).length > 0) options.execution = custom;
  }
  return options;
}

export function describeCrs(crs: TerrainCrsInfo | undefined): string {
  if (!crs) return '未知';
  const name = crs.name || '未命名坐标系';
  const parts = [crs.authority ? `${name}（${crs.authority}）` : name];
  if (crs.linearUnit?.name) parts.push(`单位 ${crs.linearUnit.name}`);
  return parts.join(' · ');
}

export function describeVertical(name: string | null | undefined): string {
  return name ? name : '未知（源文件未声明垂直基准）';
}

export function describeNoData(source: TerrainSourceInfo): string {
  const declared = source.noData?.declared;
  if (declared === null || declared === undefined) return '未声明 NoData';
  const holes = source.noData?.sourceHoles;
  const count = holes?.state === 'computed' && holes.value !== null ? `${holes.value.toLocaleString('zh-CN')} 个空洞像元` : '空洞数未统计';
  return `NoData = ${declared} · ${count}`;
}

export function describeBounds(bounds: [number, number, number, number] | null | undefined): string {
  if (!bounds) return '—';
  const [west, south, east, north] = bounds;
  return `经度 ${west.toFixed(4)}～${east.toFixed(4)}，纬度 ${south.toFixed(4)}～${north.toFixed(4)}`;
}

export function describePixel(source: TerrainSourceInfo): string {
  if (!source.pixelSize || !source.dimensions) return '—';
  const unit = source.crs?.linearUnit?.name === 'metre' ? ' m' : source.crs?.type === 'geographic' ? '°' : '';
  const [x, y] = source.pixelSize;
  return `${source.dimensions[0]} × ${source.dimensions[1]} 像元，像元 ${Number(x.toPrecision(6))}${unit} × ${Number(y.toPrecision(6))}${unit}`;
}

const ROUTE_REASONS: Record<string, string> = {
  'auto-normalizes': '自动：先重投影到 WGS 84 经纬度',
  'normalize-requested': '指定先重投影到 WGS 84',
  'heterogeneous-sources': '多个源坐标系或像元不同，逐个重投影后合并',
  'source-is-wgs84-geographic': '源已是 WGS 84 经纬度',
  'compound-crs': '复合坐标系，保证高程不被改动',
  'geographic-not-wgs84': '源是非 WGS 84 的经纬度',
  'no-operation': '没有可用的坐标变换',
  'grid-based-datum-shift': '基准转换依赖格网',
};

export function describeRoute(route: string, reason: string): string {
  const label = route === 'direct' ? '直接切片' : '先重投影';
  return `${label}（${ROUTE_REASONS[reason] || reason}）`;
}
