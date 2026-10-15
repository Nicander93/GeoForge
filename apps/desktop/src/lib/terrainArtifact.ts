import type { Artifact, TerrainSummary } from '../api/types';

export function isTerrainArtifact(artifact: Pick<Artifact, 'kind'>): boolean {
  return artifact.kind === 'terrain';
}

const NODATA_POLICIES: Record<string, string> = {
  'none-required': '源数据无空洞',
  interpolate: '插值填补',
  'explicit-constant': '固定值填补',
};

export function noDataPolicyLabel(policy?: string | null): string {
  if (!policy) return '未记录';
  return NODATA_POLICIES[policy] || policy;
}

function fixed(value: number | null | undefined, digits: number): string | null {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : null;
}

export function formatArea(km2?: number | null): string {
  if (typeof km2 !== 'number' || !Number.isFinite(km2)) return '面积未知';
  return km2 >= 100 ? `${Math.round(km2).toLocaleString('zh-CN')} km²` : `${km2.toFixed(km2 >= 1 ? 1 : 3)} km²`;
}

/** One-line summary for the results list, from geoforge-terrain.json. */
export function terrainSummaryLine(summary?: TerrainSummary | null): string {
  if (!summary) return '没有成果报告（geoforge-terrain.json）';
  if (summary.reportError) return summary.reportError;
  const parts = [formatArea(summary.areaKm2)];
  if (typeof summary.maxDepth === 'number') parts.push(`层级 0–${summary.maxDepth}`);
  if (typeof summary.tiles === 'number') parts.push(`${summary.tiles.toLocaleString('zh-CN')} 个瓦片`);
  const rmse = fixed(summary.sampleRmseM, 2);
  if (rmse) parts.push(`采样 RMSE ${rmse} m`);
  parts.push(`NoData：${noDataPolicyLabel(summary.noDataPolicy)}`);
  return parts.join(' · ');
}

export function boundsText(bounds?: number[] | null): string {
  if (!bounds || bounds.length !== 4) return '—';
  const [w, s, e, n] = bounds.map((v) => v.toFixed(5));
  return `经度 ${w}° – ${e}°，纬度 ${s}° – ${n}°`;
}

/** Query string for terrain-preview.html. */
export function terrainFrameSrc(terrainUrl: string, summary?: TerrainSummary | null): string {
  const params = new URLSearchParams();
  params.set('terrain', terrainUrl);
  if (summary?.bounds && summary.bounds.length === 4) params.set('bounds', summary.bounds.join(','));
  if (typeof summary?.heightMinM === 'number') params.set('hmin', String(summary.heightMinM));
  if (typeof summary?.heightMaxM === 'number') params.set('hmax', String(summary.heightMaxM));
  return `/terrain-preview.html?${params.toString()}`;
}

/** Windows extended-length prefix (\\?\) is noise for users. */
export function displayPath(path?: string | null): string {
  return (path || '').replace(/^\\\\\?\\/, '');
}
