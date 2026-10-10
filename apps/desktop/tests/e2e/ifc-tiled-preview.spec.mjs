import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';

// A synthetic building split into many tiles: picking, the GlobalId index and
// the class/storey filter must agree across tiles. Opt-in like the other IFC specs.
const python = process.env.GEOFORGE_IFC_PYTHON;
const repo = resolve('../..');
const cli = join(repo, 'tools/ifc/cli.py');
const processor = join(repo, 'target/debug', process.platform === 'win32' ? 'processor.exe' : 'processor');

test.describe.configure({ timeout: 240000 });

function convertSynthetic() {
  const work = mkdtempSync(join(tmpdir(), 'geoforge-ifc-tiled-'));
  mkdirSync(join(work, 'model'));
  mkdirSync(join(work, 'out'));
  const input = join(work, 'model', 'synthetic.ifc');
  execFileSync(python, [cli, 'synthetic', input, '--elements', '600', '--storeys', '2'], { stdio: 'pipe' });
  execFileSync(python, [cli, 'export', input, join(work, 'exchange')], { stdio: 'pipe' });
  const output = join(work, 'out', 'tiles');
  const task = join(work, 'task.json');
  writeFileSync(task, JSON.stringify({
    schemaVersion: 1,
    taskId: 'ifc-tiled',
    operation: 'convert-ifc',
    input: { path: input },
    output: { path: output },
    options: { version: 1, tiling: { maxFeaturesPerTile: 60 }, writeGlobalIdIndex: true },
  }));
  const events = execFileSync(processor, ['run', '--task', task], { env: { ...process.env, GEOFORGE_IFC_PYTHON: python } })
    .toString()
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  expect(events.at(-1)).toMatchObject({ type: 'result' });
  const records = readFileSync(join(work, 'exchange', 'elements.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  return {
    output,
    elements: new Map(records.map((element) => [element.globalId, element])),
    index: JSON.parse(readFileSync(join(output, 'index.json'), 'utf8')),
    tileset: JSON.parse(readFileSync(join(output, 'tileset.json'), 'utf8')),
  };
}

test('picking and IfcClass/Storey filtering work across the tiles of a large IFC model', async ({ page }) => {
  test.skip(!python, 'Set GEOFORGE_IFC_PYTHON to a Python with tools/ifc/requirements.txt installed');
  const { output, elements, index, tileset } = convertSynthetic();
  expect(index.contents.length).toBeGreaterThan(5);
  const classes = Object.fromEntries(tileset.extras.geoforge.facets.IfcClass);

  await page.addInitScript(() => {
    const artifact = { id: 'ifc', label: 'IFC synthetic', path: '/ifc', has_tileset: true, available: true };
    window.__TAURI_INTERNALS__ = {
      invoke: async (command) => {
        if (command === 'list_artifacts') return { artifacts: [artifact] };
        if (command === 'get_preview_url') return { url: `${window.location.origin}/ifc/tileset.json`, path: '/ifc' };
        if (command === 'list_tasks') return { tasks: [] };
        if (command === 'get_settings') return { execution: { resourceMode: 'auto' } };
        return { ok: true };
      },
    };
  });
  await page.route((url) => url.pathname.startsWith('/ifc/'), async (route) => {
    const relative = decodeURIComponent(new URL(route.request().url()).pathname.slice('/ifc/'.length));
    const file = resolve(output, relative);
    if (!file.startsWith(output + sep)) return route.fulfill({ status: 403 });
    try {
      await route.fulfill({ body: await readFile(file), contentType: file.endsWith('.json') ? 'application/json' : 'model/gltf-binary' });
    } catch { await route.fulfill({ status: 404 }); }
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/preview/tiles?artifact=ifc');
  await expect(page.getByText('加载完成', { exact: true })).toBeVisible({ timeout: 60000 });
  await page.getByRole('button', { name: '属性', exact: true }).click();
  const panel = page.getByRole('complementary', { name: '构件属性' });
  // Counts come from tileset.json, so they cover tiles that are not loaded yet.
  await expect(panel).toContainText(`全模型共 ${elements.size} 个构件`);
  const classGroup = panel.getByRole('group', { name: 'IFC 类' });
  for (const name of Object.keys(classes)) await expect(classGroup).toContainText(name);
  await expect(panel.getByRole('group', { name: '楼层' })).toContainText('L01');

  const iframe = page.frames().find((frame) => frame.url().includes('cesium-preview.html'));
  // Move the camera, wait for tiles, then read every loaded feature with its tile.
  const look = (view) => iframe.evaluate(async ({ heading, pitch, range }) => {
    const { viewer, tileset } = window.__geoforgePreview;
    const sphere = tileset.boundingSphere;
    viewer.camera.viewBoundingSphere(sphere, new Cesium.HeadingPitchRange(heading, pitch, sphere.radius * range));
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    for (let i = 0; i < 100; i++) {
      viewer.render();
      await new Promise((r) => setTimeout(r, 100));
      if (tileset.tilesLoaded) break;
    }
    const features = [];
    const stack = [tileset.root];
    while (stack.length) {
      const tile = stack.pop();
      stack.push(...(tile.children || []));
      const content = tile.contentReady ? tile.content : null;
      for (let i = 0; i < (content?.featuresLength || 0); i++) {
        const feature = content.getFeature(i);
        features.push({
          url: content.url,
          featureId: feature.featureId,
          globalId: feature.getProperty('GlobalId'),
          ifcClass: feature.getProperty('IfcClass'),
          storey: feature.getProperty('Storey'),
          show: feature.show,
        });
      }
    }
    const canvas = viewer.scene.canvas;
    const picked = {};
    for (let y = 0.1; y < 0.95; y += 0.04) {
      for (let x = 0.05; x < 0.95; x += 0.03) {
        const feature = viewer.scene.pick(new Cesium.Cartesian2(canvas.clientWidth * x, canvas.clientHeight * y));
        if (feature instanceof Cesium.Cesium3DTileFeature) {
          picked[feature.getProperty('GlobalId')] = { url: feature.content.url, ifcClass: feature.getProperty('IfcClass') };
        }
      }
    }
    return { features, picked };
  }, view);

  const close = { heading: 0.6, pitch: -0.5, range: 0.9 };
  const far = { heading: 3.6, pitch: -0.3, range: 2.5 };
  const first = await look(close);
  const loadedTiles = new Set(first.features.map((feature) => feature.url));
  expect(loadedTiles.size).toBeGreaterThan(1);

  // Every loaded feature is where index.json says, with the exchange values.
  for (const feature of first.features) {
    const element = elements.get(feature.globalId);
    expect(element, `${feature.globalId} is in the exchange`).toBeTruthy();
    expect(feature.ifcClass).toBe(element.ifcClass);
    expect(feature.storey).toBe(element.storey);
    const [content, featureId] = index.elements[feature.globalId];
    expect(decodeURIComponent(new URL(feature.url).pathname).endsWith(`/${index.contents[content]}`)).toBe(true);
    expect(feature.featureId).toBe(featureId);
  }
  const pickedTiles = new Set(Object.values(first.picked).map((pick) => pick.url));
  expect(pickedTiles.size, 'picks hit more than one tile').toBeGreaterThan(1);
  for (const [globalId, pick] of Object.entries(first.picked)) expect(pick.ifcClass).toBe(elements.get(globalId).ifcClass);

  // Hide a storey and a class; tiles loaded afterwards must be filtered too.
  await panel.getByRole('group', { name: '楼层' }).getByLabel('L01').uncheck();
  await classGroup.getByLabel('IfcFurniture').uncheck();
  const hiddenNow = (feature) => feature.storey === 'L01' || feature.ifcClass === 'IfcFurniture';
  await expect.poll(async () => (await look(close)).features.every((feature) => feature.show === !hiddenNow(feature)), { timeout: 60000 }).toBe(true);
  const second = await look(far);
  expect(second.features.every((feature) => feature.show === !hiddenNow(feature))).toBe(true);
  expect(Object.values(second.picked).some((pick) => pick.ifcClass === 'IfcFurniture')).toBe(false);
  expect(Object.keys(second.picked).some((globalId) => elements.get(globalId).storey === 'L01')).toBe(false);
  const screenshot = await page.screenshot();
  await test.info().attach('ifc-tiled-filter', { body: screenshot, contentType: 'image/png' });
  if (process.env.GEOFORGE_IFC_TILED_SCREENSHOT) writeFileSync(process.env.GEOFORGE_IFC_TILED_SCREENSHOT, screenshot);

  await panel.getByRole('button', { name: '全部显示', exact: true }).click();
  await expect.poll(async () => (await look(far)).features.every((feature) => feature.show), { timeout: 60000 }).toBe(true);
  expect(errors).toEqual([]);
});
