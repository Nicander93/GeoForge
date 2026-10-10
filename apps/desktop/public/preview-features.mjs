/**
 * Feature picking, properties and IfcClass/Storey visibility for 3D Tiles 1.1
 * content with EXT_mesh_features + EXT_structural_metadata. Works for any such
 * tileset; IFC output just happens to carry the IfcClass and Storey columns.
 */
const FACET_FIELDS = ['IfcClass', 'Storey'];

/** Display names live in the metadata class. Cesium 1.125 only reaches it
 * through the private property table of the content's feature table
 * (ModelFeature.featureTable for plain models). Fall back to the ids. */
function propertyNames(feature) {
  try {
    const table = feature.content?.batchTable ?? feature.featureTable;
    return table?._propertyTable?.class?.properties || {};
  } catch {
    return {};
  }
}

export function featureProperties(feature) {
  const definitions = propertyNames(feature);
  return feature.getPropertyIds().map((id) => {
    const value = feature.getProperty(id);
    return {
      id,
      name: definitions[id]?.name || id,
      value: value === undefined ? null : ArrayBuffer.isView(value) ? Array.from(value) : value,
    };
  });
}

/** Whole-model counts written by GeoForge's IFC converter (tileset.json
 * extras.geoforge), so classes in tiles that are not loaded yet can be hidden too. */
export function tilesetFacets(tileset) {
  const extras = tileset?.extras?.geoforge;
  if (!extras || typeof extras !== 'object' || !extras.facets) return null;
  const fields = {};
  for (const field of FACET_FIELDS) {
    const entries = extras.facets[field];
    if (!Array.isArray(entries)) continue;
    const valid = entries.filter(
      (entry) => Array.isArray(entry) && typeof entry[0] === 'string' && Number.isFinite(entry[1]),
    );
    if (valid.length) fields[field] = valid.map(([value, count]) => [value, count]);
  }
  return Number.isFinite(extras.elements) ? { features: extras.elements, fields } : null;
}

function facetKey(value) {
  return value === undefined || value === null ? '' : String(value);
}

/** hidden: { IfcClass: ['IfcWindow'], Storey: [''] } */
export function featureVisible(feature, hidden) {
  for (const field of FACET_FIELDS) {
    const values = hidden[field];
    if (values?.length && values.includes(facetKey(feature.getProperty(field)))) return false;
  }
  return true;
}

function forEachContentFeature(tileset, visit) {
  const stack = tileset?.root ? [tileset.root] : [];
  while (stack.length) {
    const tile = stack.pop();
    const content = tile.contentReady ? tile.content : null;
    if (content) forEachFeature(content, visit);
    for (const child of tile.children || []) stack.push(child);
  }
}

function forEachFeature(content, visit) {
  const contents = content.innerContents?.length ? content.innerContents : [content];
  for (const inner of contents) {
    for (let i = 0; i < (inner.featuresLength || 0); i++) visit(inner.getFeature(i));
  }
}

export function installFeatureInspector(Cesium, viewer, getTileset, notify) {
  let enabled = false;
  let hidden = {};
  let selected = null;
  let facetTimer = 0;
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);

  function clearSelection() {
    if (!selected) return;
    try {
      selected.feature.color = selected.color;
    } catch {
      /* the tile was unloaded */
    }
    selected = null;
  }

  function sendFacets() {
    facetTimer = 0;
    const counts = Object.fromEntries(FACET_FIELDS.map((field) => [field, new Map()]));
    let features = 0;
    let metadata = false;
    forEachContentFeature(getTileset(), (feature) => {
      features++;
      const ids = feature.getPropertyIds();
      if (ids.length) metadata = true;
      for (const field of FACET_FIELDS) {
        if (!ids.includes(field)) continue;
        const key = facetKey(feature.getProperty(field));
        counts[field].set(key, (counts[field].get(key) || 0) + 1);
      }
    });
    const loaded = Object.fromEntries(
      FACET_FIELDS.filter((field) => counts[field].size).map((field) => [
        field,
        [...counts[field]].sort((a, b) => a[0].localeCompare(b[0])),
      ]),
    );
    const whole = tilesetFacets(getTileset());
    notify({
      type: 'geoforge-feature-facets',
      scope: whole ? 'tileset' : 'loaded',
      features: whole ? whole.features : features,
      loaded: features,
      metadata,
      fields: whole ? whole.fields : loaded,
    });
  }

  function scheduleFacets() {
    if (enabled && !facetTimer) facetTimer = setTimeout(sendFacets, 150);
  }

  function applyFilter(content) {
    const apply = (feature) => {
      feature.show = !enabled || featureVisible(feature, hidden);
    };
    if (content) forEachFeature(content, apply);
    else forEachContentFeature(getTileset(), apply);
    viewer.scene.requestRender();
  }

  let removeTileLoad = null;
  function watchTiles() {
    const tileset = getTileset();
    if (removeTileLoad || !tileset) return;
    removeTileLoad = tileset.tileLoad.addEventListener((tile) => {
      if (!enabled) return;
      applyFilter(tile.content);
      scheduleFacets();
    });
  }

  handler.setInputAction((event) => {
    if (!enabled) return;
    const picked = viewer.scene.pick(event.position);
    clearSelection();
    if (picked instanceof Cesium.Cesium3DTileFeature) {
      selected = { feature: picked, color: Cesium.Color.clone(picked.color) };
      picked.color = Cesium.Color.YELLOW;
      notify({ type: 'geoforge-feature-picked', properties: featureProperties(picked) });
    } else {
      notify({ type: 'geoforge-feature-picked', properties: null });
    }
    viewer.scene.requestRender();
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  function command(data) {
    if (data.type !== 'geoforge-features') return;
    if (data.action === 'enable') {
      enabled = true;
      watchTiles();
      sendFacets();
    } else if (data.action === 'disable') {
      enabled = false;
      hidden = {};
      clearSelection();
      applyFilter();
    } else if (data.action === 'filter') {
      hidden = data.hidden && typeof data.hidden === 'object' ? data.hidden : {};
      applyFilter();
    } else if (data.action === 'clear-selection') {
      clearSelection();
      viewer.scene.requestRender();
    }
  }

  return {
    command,
    destroy() {
      clearTimeout(facetTimer);
      removeTileLoad?.();
      handler.destroy();
    },
  };
}
