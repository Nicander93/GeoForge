import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';

// The IFC spike needs Python with tools/ifc/requirements.txt installed. CI does
// not provide it yet, so the test is opt-in instead of passing without data.
const python = process.env.GEOFORGE_IFC_PYTHON;
const cli = resolve('../../tools/ifc/cli.py');
const southWallGlobalId = '0$hZgVeZ1MpxRkA$6n9RpZ';

test.describe.configure({ timeout: 120000 });

test('Cesium picks an IFC element and reads its GlobalId and custom properties', async ({ page }) => {
  test.skip(!python, 'Set GEOFORGE_IFC_PYTHON to a Python with tools/ifc/requirements.txt installed');
  const work = mkdtempSync(join(tmpdir(), 'geoforge-ifc-'));
  execFileSync(python, [cli, 'fixture', join(work, 'fixture.ifc')], { stdio: 'pipe' });
  execFileSync(python, [cli, 'convert', join(work, 'fixture.ifc'), work], { stdio: 'pipe' });
  const tilesDir = join(work, 'tiles');
  const manifest = JSON.parse(readFileSync(join(work, 'exchange', 'manifest.json'), 'utf8'));
  const elements = new Map(manifest.elements.map((element) => [element.globalId, element]));

  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.route((url) => url.pathname.startsWith('/ifc/'), async (route) => {
    const relative = decodeURIComponent(new URL(route.request().url()).pathname.slice('/ifc/'.length));
    const file = resolve(tilesDir, relative);
    if (!file.startsWith(tilesDir + sep)) return route.fulfill({ status: 403 });
    try {
      await route.fulfill({ body: await readFile(file), contentType: file.endsWith('.json') ? 'application/json' : 'model/gltf-binary' });
    } catch { await route.fulfill({ status: 404 }); }
  });

  await page.goto(`/cesium-preview.html?tileset=${encodeURIComponent('/ifc/tileset.json')}`);
  await expect.poll(() => page.evaluate(() => Boolean(window.__geoforgePreview?.tileset)), { timeout: 60000 }).toBe(true);

  // Look from the south at close range, then sample picks over the canvas.
  const picked = await page.evaluate(async () => {
    const { viewer, tileset } = window.__geoforgePreview;
    const sphere = tileset.boundingSphere;
    viewer.camera.viewBoundingSphere(sphere, new Cesium.HeadingPitchRange(0, -0.35, sphere.radius * 2.2));
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    for (let i = 0; i < 30 && !tileset.tilesLoaded; i++) await new Promise((r) => setTimeout(r, 200));
    viewer.render();
    const canvas = viewer.scene.canvas;
    const found = {};
    for (let y = 0.1; y < 0.95; y += 0.05) {
      for (let x = 0.05; x < 0.95; x += 0.03) {
        const feature = viewer.scene.pick(new Cesium.Cartesian2(canvas.clientWidth * x, canvas.clientHeight * y));
        if (!(feature instanceof Cesium.Cesium3DTileFeature)) continue;
        const globalId = feature.getProperty('GlobalId');
        if (found[globalId]) continue;
        const properties = {};
        for (const id of feature.getPropertyIds()) properties[id] = feature.getProperty(id) ?? null;
        found[globalId] = { properties, position: [x, y] };
      }
    }
    return found;
  });

  const pickedIds = Object.keys(picked);
  expect(pickedIds.length).toBeGreaterThan(0);
  for (const globalId of pickedIds) {
    const element = elements.get(globalId);
    expect(element, `picked GlobalId ${globalId} is in the manifest`).toBeTruthy();
    const { properties } = picked[globalId];
    expect(properties.IfcClass).toBe(element.ifcClass);
    expect(properties.Name).toBe(element.name);
    expect(properties.Storey).toBe(element.storey);
  }

  expect(pickedIds).toContain(southWallGlobalId);
  const southWall = elements.get(southWallGlobalId);
  const southProperties = picked[southWallGlobalId].properties;
  expect(southProperties.GF_Custom_AssetCode).toBe(southWall.properties['GF_Custom.AssetCode'].value);
  expect(southProperties.GF_Custom_DesignLoad).toBe(southWall.properties['GF_Custom.DesignLoad'].value);
  expect(southProperties.GF_Custom_InstallYear).toBe(southWall.properties['GF_Custom.InstallYear'].value);
  // Sparse booleans are stored as INT8 1/0 because BOOLEAN columns cannot carry noData.
  expect(southProperties.GF_Custom_Inspected).toBe(1);
  expect(southProperties.Pset_WallCommon_FireRating).toBe('REI60');

  // Highlight the picked wall so the attached screenshot shows which feature was read.
  const [x, y] = picked[southWallGlobalId].position;
  await page.evaluate(([px, py]) => {
    const { viewer } = window.__geoforgePreview;
    const canvas = viewer.scene.canvas;
    const feature = viewer.scene.pick(new Cesium.Cartesian2(canvas.clientWidth * px, canvas.clientHeight * py));
    feature.color = Cesium.Color.YELLOW;
    viewer.render();
  }, [x, y]);
  const screenshot = await page.screenshot();
  await test.info().attach('ifc-picked-feature', { body: screenshot, contentType: 'image/png' });
  if (process.env.GEOFORGE_IFC_SCREENSHOT) writeFileSync(process.env.GEOFORGE_IFC_SCREENSHOT, screenshot);
  await test.info().attach('picked-features', { body: JSON.stringify(picked, null, 2), contentType: 'application/json' });
  expect(errors).toEqual([]);
});
