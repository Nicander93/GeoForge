/** Grouping and filtering for the 3D Tiles feature property panel. */

export interface FeatureProperty {
  id: string;
  name: string;
  value: unknown;
}

export interface PropertyGroup {
  name: string;
  entries: Array<{ name: string; value: string }>;
}

export type HiddenFacets = Record<string, string[]>;

/** Columns shown at the top of the panel, in this order. */
const HEADER_FIELDS = ['GlobalId', 'IfcClass', 'Name', 'Storey'] as const;
export const OTHER_GROUP = '其他属性';

export function formatPropertyValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(10)));
  }
  if (Array.isArray(value)) return value.map(formatPropertyValue).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Split metadata properties into the header fields and groups. A name such as
 * `Pset_WallCommon.FireRating` becomes group `Pset_WallCommon`, entry
 * `FireRating`; names without a dot go to the other group. Empty values are
 * left out because sparse property sets leave most cells empty.
 */
export function groupFeatureProperties(properties: FeatureProperty[]): {
  header: Array<{ name: string; value: string }>;
  groups: PropertyGroup[];
} {
  const headerValues = new Map<string, string>();
  const groups = new Map<string, PropertyGroup['entries']>();
  for (const property of properties) {
    const value = formatPropertyValue(property.value);
    if ((HEADER_FIELDS as readonly string[]).includes(property.name)) {
      headerValues.set(property.name, value);
      continue;
    }
    if (!value) continue;
    const dot = property.name.indexOf('.');
    const group = dot > 0 ? property.name.slice(0, dot) : OTHER_GROUP;
    const name = dot > 0 ? property.name.slice(dot + 1) : property.name;
    const entries = groups.get(group) || [];
    entries.push({ name, value });
    groups.set(group, entries);
  }
  const header = HEADER_FIELDS.filter((field) => headerValues.has(field)).map((field) => ({
    name: field,
    value: headerValues.get(field) || '—',
  }));
  const ordered = [...groups.entries()]
    .sort(([a], [b]) => (a === OTHER_GROUP ? 1 : b === OTHER_GROUP ? -1 : a.localeCompare(b)))
    .map(([name, entries]) => ({ name, entries }));
  return { header, groups: ordered };
}

export function toggleHiddenFacet(hidden: HiddenFacets, field: string, value: string): HiddenFacets {
  const current = hidden[field] || [];
  const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
  const result = { ...hidden, [field]: next };
  if (!next.length) delete result[field];
  return result;
}

export function hiddenFacetCount(hidden: HiddenFacets): number {
  return Object.values(hidden).reduce((sum, values) => sum + values.length, 0);
}
