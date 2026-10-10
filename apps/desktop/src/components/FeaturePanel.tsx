import { X } from '@phosphor-icons/react';
import {
  groupFeatureProperties,
  hiddenFacetCount,
  toggleHiddenFacet,
  type FeatureProperty,
  type HiddenFacets,
} from '../lib/featureProperties';

export interface FeatureFacets {
  features: number;
  metadata: boolean;
  fields: Record<string, Array<[string, number]>>;
}

type Props = {
  facets: FeatureFacets | null;
  properties: FeatureProperty[] | null;
  hidden: HiddenFacets;
  onHiddenChange: (hidden: HiddenFacets) => void;
  onClose: () => void;
};

const facetLabels: Record<string, string> = { IfcClass: 'IFC 类', Storey: '楼层' };

export function FeaturePanel({ facets, properties, hidden, onHiddenChange, onClose }: Props) {
  const grouped = properties ? groupFeatureProperties(properties) : null;
  const facetFields = Object.entries(facets?.fields || {});
  return (
    <aside className="info-panel feature-panel" aria-label="构件属性">
      <div className="inspector-head">
        <h2>构件属性</h2>
        <button className="btn btn-ghost btn-sm" type="button" aria-label="关闭构件属性" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      {facets && !facets.metadata ? (
        <p className="muted feature-panel__note">已加载的瓦片没有 EXT_structural_metadata 属性表，无法查看构件属性。</p>
      ) : null}
      {facetFields.length ? (
        <section className="feature-panel__filters">
          <div className="feature-panel__row">
            <h3>显示</h3>
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              disabled={!hiddenFacetCount(hidden)}
              onClick={() => onHiddenChange({})}
            >
              全部显示
            </button>
          </div>
          {facetFields.map(([field, values]) => (
            <fieldset key={field} className="feature-facet">
              <legend>{facetLabels[field] || field}</legend>
              {values.map(([value, count]) => (
                <label key={value} className="feature-facet__item">
                  <input
                    type="checkbox"
                    checked={!(hidden[field] || []).includes(value)}
                    onChange={() => onHiddenChange(toggleHiddenFacet(hidden, field, value))}
                  />
                  <span title={value || '（无）'}>{value || '（无）'}</span>
                  <span className="muted">{count}</span>
                </label>
              ))}
            </fieldset>
          ))}
          <p className="field-hint">按已加载的瓦片统计，共 {facets?.features ?? 0} 个构件。</p>
        </section>
      ) : null}
      {grouped ? (
        <section className="feature-panel__selected">
          <div className="summary-box">
            <dl>
              {grouped.header.map((entry) => (
                <FeatureEntry key={entry.name} name={entry.name} value={entry.value} />
              ))}
            </dl>
          </div>
          {grouped.groups.map((group) => (
            <details key={group.name} className="feature-group" open>
              <summary>
                {group.name} <span className="muted">{group.entries.length}</span>
              </summary>
              <dl>
                {group.entries.map((entry) => (
                  <FeatureEntry key={entry.name} name={entry.name} value={entry.value} />
                ))}
              </dl>
            </details>
          ))}
        </section>
      ) : facets?.metadata !== false ? (
        <p className="muted feature-panel__note">点击模型中的构件查看属性。</p>
      ) : null}
    </aside>
  );
}

function FeatureEntry({ name, value }: { name: string; value: string }) {
  return (
    <>
      <dt title={name}>{name}</dt>
      <dd title={value}>{value}</dd>
    </>
  );
}
