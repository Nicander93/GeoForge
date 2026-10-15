import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

async function loadTypeScript(relativePath) {
  const filename = fileURLToPath(new URL(relativePath, import.meta.url));
  const source = await readFile(filename, 'utf8');
  const { outputText, diagnostics } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.equal(diagnostics?.length ?? 0, 0, `${relativePath} should transpile`);
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}

const errors = await loadTypeScript('../src/api/errorUtils.ts');
assert.equal(errors.friendlyError('xxx'), 'xxx');
assert.equal(errors.friendlyError(new Error('xxx')), 'xxx');
assert.equal(errors.friendlyError({ error: 'structured failure' }), 'structured failure');
assert.equal(errors.friendlyError({ detail: { message: 'nested' } }), 'nested');
assert.equal(errors.friendlyError({}), '发生未知错误，请查看任务日志。');

const forms = await loadTypeScript('../src/lib/formUtilsCore.ts');
const merge = await loadTypeScript('../src/lib/mergeTilesValidation.ts');
const clip = await loadTypeScript('../src/lib/clipTilesValidation.ts');
const drawing = await loadTypeScript('../src/lib/previewClipRegion.ts');
assert.deepEqual(drawing.drawnClipRegion('rectangle', [[0.001, 0.001], [0, 0]]), { type: 'rectangle', bounds: [0, 0, 0.001, 0.001] });
const drawnTriangle = [[0, 0], [0.001, 0], [0, 0.001]];
assert.deepEqual(drawing.drawnClipRegion('polygon', drawnTriangle), { type: 'Polygon', coordinates: [[...drawnTriangle, drawnTriangle[0]]] });
assert.equal(drawing.drawnClipRegion('polygon', drawnTriangle.toReversed()).type, 'Polygon');
assert.equal(drawing.drawnClipRegion('polygon', [[0, 0], [0.001, 0], [0.0002, 0.0002], [0, 0.001]]).type, 'Polygon');
assert.throws(() => drawing.drawnClipRegion('polygon', [[0,0],[0.001,0.001],[0,0.001],[0.001,0],[0,0.0005]]), /自交|面积/);
assert.throws(() => drawing.drawnClipRegion('polygon', [[0,0],[0.001,0],[0.001,0.001],[0.001,0],[0,0.001]]), /重复|自交/);
assert.throws(() => drawing.drawnClipRegion('polygon', [[0, 0], [0.001, 0.001], [0, 0.001], [0.001, 0]]));
assert.throws(() => drawing.drawnClipRegion('polygon', [...drawnTriangle, drawnTriangle[0]]), /重复/);
assert.throws(() => drawing.drawnClipRegion('rectangle', [[0, 0], [1, 1]]), /10 公里/);
assert.throws(() => drawing.drawnClipRegion('rectangle', [[179.999, 0], [-179.999, 0.001]]));
assert.throws(() => drawing.drawnClipRegion('rectangle', [[0, 81], [0.001, 81.001]]), /纬度/);
assert.throws(() => drawing.drawnClipRegion('rectangle', [[0, 0], [0, 0.001]]), /面积/);
assert.throws(() => drawing.drawnClipRegion('polygon', [[0, NaN], ...drawnTriangle]));
assert.throws(() => drawing.drawnClipRegion('polygon', Array(257).fill([0, 0])));
assert.equal(drawing.readDrawingMessage({ type: 'geoforge-region', mode: 'polygon', points: [[0, '0']], complete: true, active: true }), null);
assert.equal(drawing.readDrawingMessage({ type: 'geoforge-region', mode: 'polygon', points: [[0, Infinity]], complete: true, active: true }), null);
assert.equal(drawing.readDrawingMessage({ type: 'geoforge-region', mode: 'polygon', points: [], complete: 'yes', active: true }), null);
assert.equal(drawing.readDrawingMessage({ type: 'geoforge-region', mode: 'polygon', points: drawnTriangle, complete: true, active: 'yes' }), null);
assert.deepEqual(drawing.readDrawingMessage({ type: 'geoforge-region', mode: 'polygon', points: drawnTriangle, complete: true, active: true }).points, drawnTriangle);
assert.equal(drawing.readDrawingMessage({ type: 'geoforge-region', mode: 'polygon', points: drawnTriangle, complete: true, active: true, heights: [10] }), null);
assert.equal(drawing.readFlattenMessage({ type: 'geoforge-flatten-plane', regionKey: 'r', heightMeters: Infinity, initialHeightMeters: 0, hasUndo: false }), null);
assert.equal(drawing.readFlattenMessage({ type: 'geoforge-flatten-plane', regionKey: 'r', heightMeters: 10001, initialHeightMeters: 0, hasUndo: false }), null);
assert.equal(drawing.readFlattenMessage({ type: 'geoforge-flatten-plane', regionKey: 'r', heightMeters: '10', initialHeightMeters: 0, hasUndo: false }), null);
assert.equal(drawing.readFlattenMessage({ type: 'geoforge-flatten-plane', regionKey: 'r', heightMeters: -10, initialHeightMeters: 0, hasUndo: true }).heightMeters, -10);
const clipForm = { input: 'C:/data/a/tileset.json', output: 'D:/out/crop', name: '裁剪', mode: 'rectangle', bounds: ['-0.001', '-0.001', '0.001', '0.001'], geojson: '' };
assert.deepEqual(clip.clipTaskRequest(clipForm).options, { clip: { region: { type: 'rectangle', bounds: [-0.001, -0.001, 0.001, 0.001] } } });
assert.throws(() => clip.clipTaskRequest({ ...clipForm, output: 'C:/data/a/nested' }), /重叠/);
assert.throws(() => clip.clippingRegion({ ...clipForm, bounds: ['', '0', '1', '1'] }), /完整/);
assert.throws(() => clip.clippingRegion({ ...clipForm, bounds: ['1', '0', '0', '1'] }), /西经度/);
assert.throws(() => clip.clippingRegion({ ...clipForm, mode: 'polygon', geojson: '{' }));
const polygon = { type: 'Polygon', coordinates: [[[0, 0], [0.001, 0], [0, 0.001], [0, 0]]] };
assert.deepEqual(clip.clippingRegion({ ...clipForm, mode: 'polygon', geojson: JSON.stringify(polygon) }), polygon);
assert.deepEqual(clip.restoreClipRegion(clip.clippingRegion(clipForm)).bounds, clipForm.bounds);
assert.equal(clip.restoreClipRegion(polygon).mode, 'polygon');
const mergeForm = { inputs: ['C:/data/a/tileset.json', 'C:/data/b'], output: 'D:/out/merged', name: ' 合并 ' };
assert.equal(merge.validateMergeForm(mergeForm), null);
assert.equal(merge.validateMergeForm({ ...mergeForm, inputs: ['C:/data/a', 'c:\\data\\a\\tileset.json'] }), '输入列表包含重复的 Tileset。');
assert.equal(merge.validateMergeForm({ ...mergeForm, output: 'C:/data/b/nested/out' }), '成果目录不能与任何输入目录重叠。');
assert.equal(merge.validateMergeForm({ ...mergeForm, inputs: ['C:/data/a', ''] }), '请填写每份 Tileset 的路径。');
assert.equal(merge.validateMergeForm({ ...mergeForm, inputs: Array(65).fill('a') }), '请选择 2 到 64 份 Tileset。');
assert.deepEqual(merge.mergeTaskRequest(mergeForm), { operation: 'merge-tilesets', input: { path: 'C:/data/a/tileset.json' }, output: { path: 'D:/out/merged' }, taskName: '合并', options: { merge: { additionalInputs: ['C:/data/b'] } } });
assert.equal(forms.suggestOutputPath('C:\\data\\scene.osgb', '', '_tiles'), 'C:\\data\\scene.osgb_tiles');
assert.equal(forms.suggestOutputPath('/data/scene_tiles', '', '_tiles'), '/data/scene_tiles');
assert.equal(forms.suggestOutputPath('scene.osgb', 'D:\\out\\', '_process'), 'D:\\out\\scene.osgb_process');
assert.equal(forms.pathsEqual('C:\\DATA\\scene\\', 'c:/data/scene'), true);
assert.equal(forms.realProgressPercent({ completed: 1, total: 4 }), 25);
assert.equal(forms.realProgressPercent({ overall: 0.42, completed: 1, total: 4 }), 42);
assert.equal(forms.realProgressPercent({ overall: 42 }), 42);
const line = forms.formatTaskProgressLine('convert', { overall: 0.25, completed: 2, total: 8, unit: 'block' }, 'running');
assert.equal(line.pct, 25);
assert.ok(String(line.text).includes('转换'));
assert.ok(String(line.text).includes('2/8'));
assert.equal(forms.realProgressPercent({ completed: 0, total: 0 }), null);

const modelScan = await loadTypeScript('../src/lib/modelScanGate.ts');
const readyScan = {
  scannedPath: 'C:\\Models\\building.obj',
  currentPath: 'c:/models/building.obj',
  debouncedPath: 'C:/models/building.obj',
  scannedTextureRoots: ['C:/Models/Textures'],
  textureRoots: ['c:\\models\\textures'],
  scanPending: false,
  scanValid: true,
  scannedFormat: 'obj',
  selectedFormat: 'obj',
};
assert.equal(modelScan.modelScanMatchesCurrentInput(readyScan), true);
assert.equal(modelScan.canSubmitModelScan(readyScan), true);
assert.equal(modelScan.modelScanMatchesCurrentInput({ ...readyScan, currentPath: 'C:/Models/changed.obj' }), false);
assert.equal(modelScan.modelScanMatchesCurrentInput({ ...readyScan, debouncedPath: 'C:/Models/old.obj' }), false);
assert.equal(modelScan.modelScanMatchesCurrentInput({ ...readyScan, textureRoots: [] }), false);
assert.equal(modelScan.canSubmitModelScan({ ...readyScan, scanPending: true }), false);
assert.equal(modelScan.canSubmitModelScan({ ...readyScan, scanValid: false }), false);
assert.equal(modelScan.canSubmitModelScan({ ...readyScan, selectedFormat: 'fbx' }), false);

const modelValidation = await loadTypeScript('../src/lib/modelConvertValidation.ts');
assert.equal(modelValidation.buildModelOutputPath('C:\\models\\building.fbx', 'C:\\Users\\PC\\Desktop\\', 'test-id'), 'C:\\Users\\PC\\Desktop\\building_tiles_test-id');
assert.equal(modelValidation.buildModelOutputPath('/models/city.obj', '/output', 'test-id'), '/output/city_tiles_test-id');
assert.equal(modelValidation.buildModelOutputPath('C:\\models\\building.fbx', '', 'test-id'), '');
const selectedExistingParent = modelValidation.buildModelOutputPath('D:\\models\\building.fbx', 'C:\\Users\\PC\\Desktop\\新建文件夹', 'test-id');
assert.equal(selectedExistingParent, 'C:\\Users\\PC\\Desktop\\新建文件夹\\building_tiles_test-id');
assert.equal(modelValidation.modelOutputPathError('D:\\models\\building.fbx', selectedExistingParent), null);
assert.match(modelValidation.modelOutputPathError('D:\\models\\building.fbx', 'D:\\models\\building_tiles_test-id'), /不能位于模型文件所在目录内/);
const validModelForm = {
  input: 'C:/models/building.fbx',
  output: 'C:/results/building_tiles_test-id',
  format: 'fbx',
  unit: 'fromMetadata',
  axes: 'fromMetadata',
  georeferenceMode: 'local',
  longitude: '',
  latitude: '',
  height: '',
  sourceCrs: '',
  originX: '0',
  originY: '0',
  originZ: '0',
  projectedGeoreferenceSupported: true,
};
assert.equal(modelValidation.modelConvertValidationError(validModelForm), null);
assert.match(modelValidation.modelConvertValidationError({ ...validModelForm, output: 'c:\\MODELS\\building.fbx\\' }), /不能与模型文件相同/);
assert.match(modelValidation.modelConvertValidationError({ ...validModelForm, output: 'C:/models/tiles' }), /不能位于模型文件所在目录内/);
assert.match(modelValidation.modelConvertValidationError({ ...validModelForm, output: 'C:/models' }), /不能位于模型文件所在目录内/);
assert.match(modelValidation.modelConvertValidationError({ ...validModelForm, output: 'C:/' }), /不能包含模型文件所在目录/);
assert.equal(modelValidation.modelConvertValidationError({ ...validModelForm, output: 'C:/models-other/tiles' }), null);
assert.match(modelValidation.modelConvertValidationError({ ...validModelForm, format: 'obj' }), /明确选择/);
assert.match(modelValidation.modelConvertValidationError({ ...validModelForm, georeferenceMode: 'anchor', longitude: '181', latitude: '0', height: '0' }), /经度范围/);
assert.match(modelValidation.modelConvertValidationError({ ...validModelForm, georeferenceMode: 'anchor', longitude: 'NaN', latitude: '0', height: '0' }), /有效的经度/);
assert.match(modelValidation.modelConvertValidationError({ ...validModelForm, georeferenceMode: 'projected' }), /源 CRS/);
assert.match(modelValidation.modelConvertValidationError({ ...validModelForm, georeferenceMode: 'projected', sourceCrs: 'EPSG:4547', projectedGeoreferenceSupported: false }), /不支持/);
assert.match(modelValidation.modelConvertValidationError({ ...validModelForm, georeferenceMode: 'projected', sourceCrs: 'EPSG:4547', originX: 'Infinity' }), /有限数值/);

const textureCaps = await loadTypeScript('../src/lib/textureCaps.ts');
const unavailableCaps = {
  textureModes: [
    { mode: 'ktx2-etc1s', supported: false },
    { mode: 'ktx2-uastc', supported: false },
  ],
  postprocessBasisu: { available: false },
};
const availableCaps = {
  textureModes: [
    { mode: 'ktx2-etc1s', supported: true },
    { mode: 'ktx2-uastc', supported: true, processTileset: { supported: true } },
  ],
  postprocessBasisu: { available: false },
};
assert.equal(textureCaps.textureModeEnabled(null, 'keep'), true);
assert.equal(textureCaps.textureModeEnabled(null, 'ktx2-etc1s'), false);
assert.equal(textureCaps.textureModeEnabled(unavailableCaps, 'ktx2-uastc'), false);
assert.equal(textureCaps.textureModeEnabled(availableCaps, 'ktx2-etc1s'), true);
assert.equal(textureCaps.textureModeEnabled(availableCaps, 'ktx2-uastc', true), true);

const ifc = await loadTypeScript('../src/lib/ifcConvert.ts');
const ifcForm = {
  input: 'D:\\bim\\tower.ifc',
  output: 'E:\\out\\tower_tiles_x',
  georeferenceMode: 'auto',
  longitude: '',
  latitude: '',
  height: '',
  sourceCrs: '',
  includeClasses: '',
  excludeClasses: '',
  keepEmptyColumns: false,
  tilingMode: 'adaptive',
  maxFeaturesPerTile: '',
  maxTrianglesPerTile: '',
  quantizeGeometry: true,
  writeGlobalIdIndex: false,
};
assert.equal(ifc.buildIfcOutputPath('D:\\bim\\Tower.IFC', 'E:\\out\\', 'x'), 'E:\\out\\Tower_tiles_x');
assert.equal(ifc.buildIfcOutputPath('', '/out', 'x'), '');
assert.equal(ifc.ifcConvertValidationError(ifcForm), null);
assert.match(ifc.ifcConvertValidationError({ ...ifcForm, input: 'D:\\bim\\tower.fbx' }), /\.ifc/);
assert.match(ifc.ifcConvertValidationError({ ...ifcForm, output: 'D:\\bim\\tiles' }), /所在目录内/);
assert.match(ifc.ifcConvertValidationError({ ...ifcForm, output: 'D:\\' }), /包含/);
assert.match(ifc.ifcConvertValidationError({ ...ifcForm, georeferenceMode: 'anchor', longitude: '200', latitude: '0', height: '0' }), /经度范围/);
assert.match(ifc.ifcConvertValidationError({ ...ifcForm, georeferenceMode: 'anchor', longitude: '1' }), /有效的经度/);
assert.match(ifc.ifcConvertValidationError({ ...ifcForm, georeferenceMode: 'crs', sourceCrs: ' ' }), /CRS/);
assert.match(ifc.ifcConvertValidationError({ ...ifcForm, includeClasses: 'IfcWall, Wall' }), /“Wall”不是 IFC 类名/);
assert.match(ifc.ifcConvertValidationError({ ...ifcForm, includeClasses: 'IfcWall', excludeClasses: 'ifcwall' }), /同时/);
assert.deepEqual(ifc.parseIfcClassList(' IfcWall,IfcSlab；IfcWall  IfcDoor '), ['IfcWall', 'IfcSlab', 'IfcDoor']);
assert.deepEqual(ifc.buildIfcTaskOptions(ifcForm), {
  version: 1,
  georeference: { mode: 'auto' },
  includeClasses: [],
  excludeClasses: [],
  dropEmptyColumns: true,
  tiling: { mode: 'adaptive', maxFeaturesPerTile: 2000, maxTrianglesPerTile: 250000 },
  quantizeGeometry: true,
  writeGlobalIdIndex: false,
});
assert.match(ifc.ifcConvertValidationError({ ...ifcForm, maxFeaturesPerTile: '0' }), /构件数上限/);
assert.match(ifc.ifcConvertValidationError({ ...ifcForm, maxFeaturesPerTile: '12.5' }), /构件数上限/);
assert.match(ifc.ifcConvertValidationError({ ...ifcForm, maxTrianglesPerTile: '999' }), /三角形上限/);
assert.equal(ifc.ifcConvertValidationError({ ...ifcForm, tilingMode: 'single', maxTrianglesPerTile: '999' }), null, 'single mode ignores the budgets');
assert.deepEqual(
  ifc.buildIfcTaskOptions({ ...ifcForm, maxFeaturesPerTile: ' 500 ', maxTrianglesPerTile: '80000', quantizeGeometry: false, writeGlobalIdIndex: true }).tiling,
  { mode: 'adaptive', maxFeaturesPerTile: 500, maxTrianglesPerTile: 80000 },
);
assert.deepEqual(ifc.buildIfcTaskOptions({ ...ifcForm, tilingMode: 'single', maxFeaturesPerTile: '5' }).tiling, { mode: 'single' });
assert.deepEqual(
  ifc.buildIfcTaskOptions(
    { ...ifcForm, georeferenceMode: 'anchor', longitude: '114.1', latitude: '22.3', height: '5', excludeClasses: 'IfcSpace', keepEmptyColumns: true },
    { resourceMode: 'custom', cpuWorkers: 4 },
  ),
  {
    version: 1,
    georeference: { mode: 'anchor', longitudeDeg: 114.1, latitudeDeg: 22.3, ellipsoidHeightM: 5 },
    includeClasses: [],
    excludeClasses: ['IfcSpace'],
    dropEmptyColumns: false,
    tiling: { mode: 'adaptive', maxFeaturesPerTile: 2000, maxTrianglesPerTile: 250000 },
    quantizeGeometry: true,
    writeGlobalIdIndex: false,
    execution: { cpuWorkers: 4 },
  },
);
assert.deepEqual(ifc.buildIfcTaskOptions({ ...ifcForm, georeferenceMode: 'crs', sourceCrs: ' EPSG:2326 ' }, { resourceMode: 'auto', cpuWorkers: 4 }).georeference, { mode: 'crs', sourceCrs: 'EPSG:2326' });

const featureProps = await loadTypeScript('../src/lib/featureProperties.ts');
const grouped = featureProps.groupFeatureProperties([
  { id: 'Storey', name: 'Storey', value: '1F' },
  { id: 'GlobalId', name: 'GlobalId', value: '0$hZgVeZ1MpxRkA$6n9RpZ' },
  { id: 'Pset_WallCommon_FireRating', name: 'Pset_WallCommon.FireRating', value: 'REI60' },
  { id: 'GF_Custom_DesignLoad', name: 'GF_Custom.DesignLoad', value: 12.300000000000001 },
  { id: 'GF_Custom_Note', name: 'GF_Custom.Note', value: '' },
  { id: 'GF_Custom_Inspected', name: 'GF_Custom.Inspected', value: 1 },
  { id: 'height', name: 'height', value: 3 },
  { id: 'Name', name: 'Name', value: 'South wall' },
  { id: 'Qto_WallBaseQuantities_Length', name: 'Qto_WallBaseQuantities.Length', value: null },
]);
assert.deepEqual(grouped.header, [
  { name: 'GlobalId', value: '0$hZgVeZ1MpxRkA$6n9RpZ' },
  { name: 'Name', value: 'South wall' },
  { name: 'Storey', value: '1F' },
]);
assert.deepEqual(grouped.groups, [
  { name: 'GF_Custom', entries: [{ name: 'DesignLoad', value: '12.3' }, { name: 'Inspected', value: '1' }] },
  { name: 'Pset_WallCommon', entries: [{ name: 'FireRating', value: 'REI60' }] },
  { name: featureProps.OTHER_GROUP, entries: [{ name: 'height', value: '3' }] },
]);
assert.equal(featureProps.formatPropertyValue([1, 2.5]), '1, 2.5');
let hidden = featureProps.toggleHiddenFacet({}, 'IfcClass', 'IfcWindow');
hidden = featureProps.toggleHiddenFacet(hidden, 'Storey', '');
assert.deepEqual(hidden, { IfcClass: ['IfcWindow'], Storey: [''] });
assert.equal(featureProps.hiddenFacetCount(hidden), 2);
assert.deepEqual(featureProps.toggleHiddenFacet(hidden, 'IfcClass', 'IfcWindow'), { Storey: [''] });

// The iframe module only needs Cesium when installed, so its helpers run here.
const inspector = await import('../public/preview-features.mjs');
const mockFeature = (values, names = {}) => ({
  content: { batchTable: { _propertyTable: { class: { properties: names } } } },
  getPropertyIds: () => Object.keys(values),
  getProperty: (id) => values[id],
});
assert.equal(inspector.featureVisible(mockFeature({ IfcClass: 'IfcWall', Storey: '1F' }), hidden), true);
assert.deepEqual(
  inspector.tilesetFacets({ extras: { geoforge: { elements: 3, facets: { IfcClass: [['IfcSlab', 1], ['IfcWall', 2]], Storey: [['1F', 3], ['bad']] } } } }),
  { features: 3, fields: { IfcClass: [['IfcSlab', 1], ['IfcWall', 2]], Storey: [['1F', 3]] } },
);
assert.equal(inspector.tilesetFacets({ asset: { version: '1.1' } }), null, 'other tilesets fall back to loaded tiles');
assert.equal(inspector.featureVisible(mockFeature({ IfcClass: 'IfcWindow', Storey: '1F' }), hidden), false);
assert.equal(inspector.featureVisible(mockFeature({ IfcClass: 'IfcWall' }), hidden), false, 'no storey counts as the empty value');
assert.equal(inspector.featureVisible(mockFeature({ IfcClass: 'IfcWall', Storey: '2F' }), { IfcClass: ['IfcWall'] }), false);
assert.deepEqual(
  inspector.featureProperties(mockFeature({ GF_Custom_Code: 'A-1', Missing: undefined, Vec: new Float32Array([1, 2]) }, { GF_Custom_Code: { name: 'GF_Custom.Code' } })),
  [
    { id: 'GF_Custom_Code', name: 'GF_Custom.Code', value: 'A-1' },
    { id: 'Missing', name: 'Missing', value: null },
    { id: 'Vec', name: 'Vec', value: [1, 2] },
  ],
);

console.log('desktop pure-function tests passed');

const terrain = await loadTypeScript('../src/lib/terrainForm.ts');
const terrainPlan = (holes) => ({
  version: 1,
  valid: true,
  sources: [{ path: 'D:/dem/a.tif', noData: { declared: -9999, sourceHoles: holes } }],
  plan: { recommendedMaxDepth: 15, sourceHoles: holes, route: 'normalize', routeReason: 'auto-normalizes' },
  errors: [],
});
const noHoles = terrainPlan({ state: 'computed', value: 0 });
const someHoles = terrainPlan({ state: 'computed', value: 12 });
const unknownHoles = terrainPlan({ state: 'not-computed', value: null });
const terrainForm = {
  ...terrain.emptyTerrainForm(),
  sources: ['D:/dem/a.tif'],
  output: 'E:/out/a_terrain_1',
  verticalMode: 'unknown',
  verticalAcknowledged: true,
};
assert.deepEqual(terrain.addTerrainSources(['D:\\dem\\a.tif'], ['d:/dem/A.tif', 'D:/dem/b.tif', 'D:/dem/b.tif', ' ']), ['D:\\dem\\a.tif', 'D:/dem/b.tif']);
assert.equal(terrain.buildTerrainOutputPath('D:\\dem\\中文 DEM.tif', 'E:\\out\\', 'x1'), 'E:\\out\\中文 DEM_terrain_x1');
assert.equal(terrain.buildTerrainOutputPath('', 'E:/out', 'x1'), '');
assert.match(terrain.terrainOutputPathError(['D:/dem/a.tif', 'F:/b/b.tif'], 'F:/b/out'), /位于源文件所在目录/);
assert.match(terrain.terrainOutputPathError(['D:/dem/sub/a.tif'], 'D:/dem'), /包含源文件所在目录/);
assert.equal(terrain.terrainOutputPathError(['D:/dem/a.tif'], 'E:/out/a'), null);
assert.deepEqual(terrain.terrainBlockers(terrainForm, noHoles, false), []);
assert.match(terrain.terrainBlockers({ ...terrainForm, sources: [] }, null, false)[0], /至少一个 DEM/);
assert.ok(terrain.terrainBlockers(terrainForm, noHoles, true).some((text) => /正在检查/.test(text)));
assert.ok(terrain.terrainBlockers(terrainForm, null, false).some((text) => /尚未检查/.test(text)));
assert.ok(terrain.terrainBlockers({ ...terrainForm, sources: ['D:/dem/a.png'] }, noHoles, false).some((text) => /不是 DEM/.test(text)));
const failedInspection = { ...noHoles, valid: false, plan: null, errors: [{ code: 'TERRAIN_CRS_MISSING', message: 'terrain crs missing: a.tif 没有坐标系' }] };
assert.ok(terrain.terrainBlockers(terrainForm, failedInspection, false).includes('a.tif 没有坐标系'));
assert.equal(terrain.terrainMessage('terrain transform low accuracy: x'), 'x');
assert.deepEqual(
  terrain.terrainWarnings('a\n[warning:TERRAIN_AUXILIARY_EXTRAPOLATION] 多个源之间外推\n[warning:TERRAIN_AUXILIARY_EXTRAPOLATION] 多个源之间外推\n[warning:OTHER] x'),
  [{ code: 'TERRAIN_AUXILIARY_EXTRAPOLATION', message: '多个源之间外推' }],
);
assert.deepEqual(terrain.terrainWarnings(''), []);
assert.ok(terrain.terrainBlockers({ ...terrainForm, verticalMode: '' }, noHoles, false).some((text) => /高程基准/.test(text)));
assert.ok(terrain.terrainBlockers({ ...terrainForm, verticalAcknowledged: false }, noHoles, false).some((text) => /勾选确认/.test(text)));
assert.deepEqual(terrain.terrainBlockers({ ...terrainForm, verticalMode: 'ellipsoidal', verticalAcknowledged: false }, noHoles, false), []);
assert.equal(terrain.noDataPolicyNeeded(noHoles), false);
assert.equal(terrain.noDataPolicyNeeded(someHoles), true);
assert.equal(terrain.noDataPolicyNeeded(unknownHoles), true);
assert.ok(terrain.terrainBlockers(terrainForm, someHoles, false).some((text) => /NoData/.test(text)));
assert.deepEqual(terrain.terrainBlockers({ ...terrainForm, noDataMode: 'explicit-constant', noDataValue: '0' }, someHoles, false), []);
assert.ok(terrain.terrainBlockers({ ...terrainForm, noDataMode: 'explicit-constant', noDataValue: '' }, someHoles, false).some((text) => /0 m 也是合法高程/.test(text)));
assert.ok(terrain.terrainBlockers({ ...terrainForm, noDataMode: 'interpolate', maxSearchPixels: '1001' }, someHoles, false).some((text) => /搜索半径/.test(text)));
assert.ok(terrain.terrainBlockers({ ...terrainForm, maxDepth: '23' }, noHoles, false).some((text) => /最大层级/.test(text)));
assert.ok(terrain.terrainBlockers({ ...terrainForm, maxDepth: '1.5' }, noHoles, false).some((text) => /最大层级/.test(text)));
assert.deepEqual(terrain.buildTerrainTaskOptions(terrainForm, noHoles, null), {
  terrain: {
    version: 2,
    sources: ['D:/dem/a.tif'],
    verticalDatum: { mode: 'unknown', acknowledged: true },
    noData: { mode: 'none-required' },
    preprocess: {},
    tiling: { maxDepth: 'auto', meshQuality: 'balanced', normals: false },
  },
});
const advanced = terrain.buildTerrainTaskOptions(
  { ...terrainForm, crsOverride: ' EPSG:4547 ', acceptBallpark: true, projectionMode: 'direct', overview: 'off', maxDepth: '14', meshQuality: 'high', normals: true, noDataMode: 'explicit-constant', noDataValue: '0' },
  someHoles,
  { resourceMode: 'custom', cpuWorkers: 4 },
);
assert.equal(advanced.terrain.crsOverride, 'EPSG:4547');
assert.deepEqual(advanced.terrain.noData, { mode: 'explicit-constant', valueMeters: 0 });
assert.deepEqual(advanced.terrain.preprocess, { projectionMode: 'direct', overview: 'off', acceptBallparkTransform: true });
assert.deepEqual(advanced.terrain.tiling, { maxDepth: 14, meshQuality: 'high', normals: true });
assert.deepEqual(advanced.execution, { cpuWorkers: 4 });
assert.deepEqual(terrain.buildTerrainTaskOptions({ ...terrainForm, noDataMode: 'interpolate', maxSearchPixels: '80' }, unknownHoles, null).terrain.noData, { mode: 'interpolate', maxSearchPixels: 80 });
assert.equal(terrain.lowAccuracyTransform({ ...failedInspection, errors: [{ code: 'TERRAIN_TRANSFORM_LOW_ACCURACY', message: 'x' }] }), true);
assert.equal(terrain.describeVertical(null), '未知（源文件未声明垂直基准）');
assert.equal(terrain.describeCrs({ name: 'CGCS2000 / 3-degree Gauss-Kruger CM 114E', authority: 'EPSG:4547', linearUnit: { name: 'metre' } }), 'CGCS2000 / 3-degree Gauss-Kruger CM 114E（EPSG:4547） · 单位 metre');
assert.match(terrain.describeRoute('normalize', 'auto-normalizes'), /先重投影/);
console.log('terrain form utils ok');

const view = await import('../public/terrain-view.mjs');
assert.deepEqual(view.parseBounds('114.2,30.5,114.3,30.6'), [114.2, 30.5, 114.3, 30.6]);
assert.equal(view.parseBounds('114.3,30.5,114.2,30.6'), null);
assert.equal(view.parseBounds('1,2,3'), null);
assert.equal(view.parseBounds(null), null);
assert.equal(view.parseBounds('0,-91,1,0'), null);
const pad = view.overviewRectangle([114.2, 30.5, 114.3, 30.6]);
assert.ok(pad[0] < 114.2 && pad[2] > 114.3 && pad[1] < 30.5 && pad[3] > 30.6);
assert.deepEqual(view.overviewRectangle([-180, -90, 180, 90]), [-180, -90, 180, 90]);
const edge = view.edgeView([114.2, 30.5, 114.3, 30.6], { min: -67, max: 360 }, 2);
assert.ok(edge.lon < 114.2 && edge.lon > 114.15, 'edge camera just west of the data');
assert.equal(edge.lat, 30.55);
assert.ok(edge.height > 720, 'above the exaggerated top');
assert.equal(edge.headingDeg, 90);
assert.equal(view.realHeight(720, 2), 360);
assert.equal(view.realHeight(720, 2, 100), 410);
assert.equal(view.realHeight(NaN, 2), null);
assert.equal(view.looksGzip(new Uint8Array([0x1f, 0x8b, 8])), true);
assert.equal(view.looksGzip(new Uint8Array([0, 0])), false);
assert.equal(
  view.firstTileUrl('http://127.0.0.1:9/artifacts/a/', { tiles: ['{z}/{x}/{y}.terrain?v={version}'], version: '1.2.0', available: [[{ startX: 1, startY: 0, endX: 1, endY: 0 }]] }),
  'http://127.0.0.1:9/artifacts/a/0/1/0.terrain?v=1.2.0',
);
assert.equal(view.firstTileUrl('http://h/artifacts/a', {}), 'http://h/artifacts/a/0/0/0.terrain?v=1.0.0');

const artifactLib = await loadTypeScript('../src/lib/terrainArtifact.ts');
assert.equal(artifactLib.isTerrainArtifact({ kind: 'terrain' }), true);
assert.equal(artifactLib.isTerrainArtifact({ kind: '3dtiles' }), false);
assert.equal(
  artifactLib.terrainSummaryLine({ areaKm2: 106.48, maxDepth: 15, tiles: 517, sampleRmseM: 0.366, noDataPolicy: 'explicit-constant' }),
  '106 km² · 层级 0–15 · 517 个瓦片 · 采样 RMSE 0.37 m · NoData：固定值填补',
);
assert.match(artifactLib.terrainSummaryLine(null), /geoforge-terrain\.json/);
assert.equal(artifactLib.terrainSummaryLine({ reportError: 'bad' }), 'bad');
assert.equal(artifactLib.noDataPolicyLabel('interpolate'), '插值填补');
assert.equal(
  artifactLib.terrainFrameSrc('http://127.0.0.1:9/artifacts/a/', { bounds: [1, 2, 3, 4], heightMinM: -5, heightMaxM: 10 }),
  '/terrain-preview.html?terrain=http%3A%2F%2F127.0.0.1%3A9%2Fartifacts%2Fa%2F&bounds=1%2C2%2C3%2C4&hmin=-5&hmax=10',
);
assert.equal(artifactLib.displayPath('\\\\?\\D:\\out\\t'), 'D:\\out\\t');
assert.equal(artifactLib.displayPath('/data/t'), '/data/t');
assert.deepEqual(view.rampColor(0, 0, 100), [43, 92, 138]);
assert.deepEqual(view.rampColor(100, 0, 100), [242, 239, 233]);
assert.deepEqual(view.rampColor(500, 0, 100), [242, 239, 233]);
assert.equal(view.taper(0), 1);
assert.equal(view.taper(1), 0);
assert.ok(Math.abs(view.taper(0.5) - 0.5) < 1e-12);
assert.ok(Math.abs(view.transitionWidthM([114.2, 30.5, 114.3, 30.6]) - 479.6) < 1);
assert.equal(view.transitionWidthM([114.2, 30.5, 114.201, 30.501]), 200);
assert.equal(view.transitionWidthM([100, 20, 110, 30]), 2000);
const ring = view.perimeterPoints([0, 0, 1, 1], 4);
assert.equal(ring.length, 16);
assert.deepEqual([ring[0].nx, ring[0].ny], [-1, -1]);
assert.deepEqual([ring[1].nx, ring[1].ny], [0, -1]);
const mesh = view.transitionMesh(ring, ring.map(() => 100), 1000, 4);
assert.equal(mesh.vertices.length, 16 * 5);
assert.equal(mesh.indices.length, 16 * 4 * 6);
// Ring 0 is the data edge at the edge height; the outer ring is 0 m and outside the data.
assert.ok(mesh.vertices.slice(0, 16).every((v) => v.height === 100 && v.lon >= 0 && v.lon <= 1 && v.lat >= 0 && v.lat <= 1));
assert.ok(mesh.vertices.slice(64).every((v) => v.height === 0 && (v.lon < 0 || v.lon > 1 || v.lat < 0 || v.lat > 1)));
console.log('terrain preview utils ok');
