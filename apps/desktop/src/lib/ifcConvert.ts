/** Form rules and the convert-ifc request (crates/protocol IfcTaskOptions v1). */
import type { ExecutionSettings } from '../api/desktop';

const IFC_OPTIONS_VERSION = 1;

export type IfcGeoreferenceMode = 'auto' | 'local' | 'anchor' | 'crs';

export interface IfcConvertForm {
  input: string;
  output: string;
  georeferenceMode: IfcGeoreferenceMode;
  longitude: string;
  latitude: string;
  height: string;
  sourceCrs: string;
  includeClasses: string;
  excludeClasses: string;
  keepEmptyColumns: boolean;
}

const normalize = (path: string) => path.trim().replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();

export function buildIfcOutputPath(ifcFile: string, outputParent: string, outputId: string): string {
  const fileName = ifcFile.trim().split(/[/\\]/).pop() || '';
  const parent = outputParent.trim();
  if (!fileName || !parent || !outputId) return '';
  const stem = fileName.replace(/\.ifc$/i, '');
  const separator = parent.includes('\\') ? '\\' : '/';
  return `${parent.replace(/[/\\]+$/, '')}${separator}${stem}_tiles_${outputId}`;
}

export function ifcOutputPathError(ifcFile: string, output: string): string | null {
  if (!ifcFile.trim() || !output.trim()) return null;
  const directory = normalize(ifcFile).replace(/\/[^/]+$/, '');
  const target = normalize(output);
  if (directory && (target === directory || target.startsWith(`${directory}/`))) {
    return '成果目录不能位于 IFC 文件所在目录内。请选择其他保存位置。';
  }
  if (target && directory.startsWith(`${target}/`)) {
    return '成果目录不能包含 IFC 文件所在目录。请选择其他保存位置。';
  }
  return null;
}

/** Split "IfcWall, IfcSlab IfcDoor" into names; the processor checks them again. */
export function parseIfcClassList(text: string): string[] {
  const names = text.split(/[\s,，;；]+/).filter(Boolean);
  return [...new Map(names.map((name) => [name.toLowerCase(), name])).values()];
}

const IFC_CLASS = /^ifc[a-z0-9_]+$/i;

function finiteNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ifcConvertValidationError(form: IfcConvertForm): string | null {
  if (!form.input.trim() || !form.output.trim()) return '请选择 IFC 文件和保存位置。';
  if (!/\.ifc$/i.test(form.input.trim())) return '请选择扩展名为 .ifc 的文件。';
  const outputError = ifcOutputPathError(form.input, form.output);
  if (outputError) return outputError;
  if (form.georeferenceMode === 'anchor') {
    const longitude = finiteNumber(form.longitude);
    const latitude = finiteNumber(form.latitude);
    const height = finiteNumber(form.height);
    if (longitude === null || latitude === null || height === null) {
      return '锚点定位需要有效的经度、纬度和椭球高数值。';
    }
    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      return '锚点经度范围为 -180 至 180，纬度范围为 -90 至 90。';
    }
  }
  if (form.georeferenceMode === 'crs' && !form.sourceCrs.trim()) {
    return '指定 CRS 模式需要填写 CRS，例如 EPSG:4547。';
  }
  const include = parseIfcClassList(form.includeClasses);
  const exclude = parseIfcClassList(form.excludeClasses);
  const invalid = [...include, ...exclude].find((name) => !IFC_CLASS.test(name));
  if (invalid) return `“${invalid}”不是 IFC 类名，类名以 Ifc 开头，例如 IfcWall。`;
  const both = include.find((name) => exclude.some((other) => other.toLowerCase() === name.toLowerCase()));
  if (both) return `${both} 不能同时出现在“仅转换”和“排除”中。`;
  return null;
}

function georeference(form: IfcConvertForm): Record<string, unknown> {
  if (form.georeferenceMode === 'anchor') {
    return {
      mode: 'anchor',
      longitudeDeg: Number(form.longitude),
      latitudeDeg: Number(form.latitude),
      ellipsoidHeightM: Number(form.height),
    };
  }
  if (form.georeferenceMode === 'crs') return { mode: 'crs', sourceCrs: form.sourceCrs.trim() };
  return { mode: form.georeferenceMode };
}

export function buildIfcTaskOptions(form: IfcConvertForm, execution?: ExecutionSettings | null): Record<string, unknown> {
  const options: Record<string, unknown> = {
    version: IFC_OPTIONS_VERSION,
    georeference: georeference(form),
    includeClasses: parseIfcClassList(form.includeClasses),
    excludeClasses: parseIfcClassList(form.excludeClasses),
    dropEmptyColumns: !form.keepEmptyColumns,
  };
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
