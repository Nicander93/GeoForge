import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';

// Full path: processor convert-ifc with the real tools/ifc, then the preview
// page's property panel. Opt-in like ifc-feature-pick.spec.mjs.
const python = process.env.GEOFORGE_IFC_PYTHON;
const repo = resolve('../..');
const cli = join(repo, 'tools/ifc/cli.py');
const processor = join(repo, 'target/debug', process.platform === 'win32' ? 'processor.exe' : 'processor');
const southWallGlobalId = '0$hZgVeZ1MpxRkA$6n9RpZ';

test.describe.configure({ timeout: 180000 });

function convertFixture() {
  const work = mkdtempSync(join(tmpdir(), 'geoforge-ifc-panel-'));
  mkdirSync(join(work, 'model'));
  mkdirSync(join(work, 'out'));
  const input = join(work, 'model', 'fixture.ifc');
  execFileSync(python, [cli, 'fixture', input], { stdio: 'pipe' });
  execFileSync(python, [cli, 'export', input, join(work, 'exchange')], { stdio: 'pipe' });
  const output = join(work, 'out', 'tiles');
  const task = join(work, 'task.json');
  writeFileSync(task, JSON.stringify({
    schemaVersion: 1,
    taskId: 'ifc-panel',
    operation: 'convert-ifc',
    input: { path: input },
    output: { path: output },
    options: { version: 1 },
  }));
  const events = execFileSync(processor, ['run', '--task', task], { env: { ...process.env, GEOFORGE_IFC_PYTHON: python } })
    .toString()
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  expect(events.at(-1)).toMatchObject({ type: 'result' });
  const manifest = JSON.parse(readFileSync(join(work, 'exchange', 'manifest.json'), 'utf8'));
  return { output, elements: new Map(manifest.elements.map((element) => [element.globalId, element])) };
}

test('property panel shows and filters IFC elements converted by the processor', async ({ page }) => {
  test.skip(!python, 'Set GEOFORGE_IFC_PYTHON to a Python with tools/ifc/requirements.txt installed');
  const { output, elements } = convertFixture();
  const southWall = elements.get(southWallGlobalId);

  await page.addInitScript(() => {
    const artifact = { id: 'ifc', label: 'IFC fixture', path: '/ifc', has_tileset: true, available: true };
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
  const classes = panel.getByRole('group', { name: 'IFC 类' });
  await expect(classes).toContainText('IfcWall');
  await expect(panel.getByRole('group', { name: '楼层' })).toContainText('1F');

  const iframe = page.frames().find((frame) => frame.url().includes('cesium-preview.html'));
  const findWall = () => iframe.evaluate(async (globalId) => {
    const { viewer, tileset } = window.__geoforgePreview;
    const sphere = tileset.boundingSphere;
    viewer.camera.viewBoundingSphere(sphere, new Cesium.HeadingPitchRange(0, -0.35, sphere.radius * 2.2));
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    viewer.render();
    const canvas = viewer.scene.canvas;
    for (let y = 0.1; y < 0.95; y += 0.05) {
      for (let x = 0.05; x < 0.95; x += 0.03) {
        const position = new Cesium.Cartesian2(canvas.clientWidth * x, canvas.clientHeight * y);
        const feature = viewer.scene.pick(position);
        if (feature instanceof Cesium.Cesium3DTileFeature && feature.getProperty('GlobalId') === globalId) {
          return { x: position.x, y: position.y };
        }
      }
    }
    return null;
  }, southWallGlobalId);
  const wall = await findWall();
  expect(wall, 'south wall is pickable').not.toBeNull();
  await page.frameLocator('iframe.preview-frame').locator('canvas').first().click({ position: wall });

  const header = panel.locator('.summary-box');
  for (const value of [southWallGlobalId, southWall.ifcClass, southWall.name, southWall.storey]) {
    await expect(header).toContainText(value);
  }
  const custom = panel.locator('details.feature-group').filter({ has: page.locator('summary', { hasText: /^GF_Custom/ }) });
  await expect(custom).toContainText('AssetCode');
  await expect(custom).toContainText(String(southWall.properties['GF_Custom.AssetCode'].value));
  await expect(custom).toContainText('InstallYear');
  const common = panel.locator('details.feature-group').filter({ has: page.locator('summary', { hasText: /^Pset_WallCommon/ }) });
  await expect(common).toContainText('FireRating');
  await expect(common).toContainText('REI60');
  const screenshot = await page.screenshot();
  await test.info().attach('ifc-property-panel', { body: screenshot, contentType: 'image/png' });
  if (process.env.GEOFORGE_IFC_PANEL_SCREENSHOT) writeFileSync(process.env.GEOFORGE_IFC_PANEL_SCREENSHOT, screenshot);

  await classes.getByLabel('IfcWall').uncheck();
  await expect.poll(findWall).toBeNull();
  await panel.getByRole('button', { name: '全部显示', exact: true }).click();
  await expect.poll(findWall).not.toBeNull();
  expect(errors).toEqual([]);
});
