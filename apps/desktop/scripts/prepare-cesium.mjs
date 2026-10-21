import { access, cp, mkdir, readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const source = new URL('../node_modules/cesium/Build/Cesium/', import.meta.url);
const destination = new URL('../public/vendor/cesium/', import.meta.url);

// Copy the complete runtime: workers and assets resolve relative to CESIUM_BASE_URL.
await readFile(new URL('Cesium.js', source));
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
await cp(new URL('../node_modules/cesium/LICENSE.md', import.meta.url),
  new URL('LICENSE.md', destination));
// The moon texture has no clear redistribution terms. The previews destroy
// scene.moon, so the file is never requested; do not ship it.
const excluded = ['Assets/Textures/moonSmall.jpg'];
for (const relative of excluded) {
  const target = new URL(relative, destination);
  await rm(target, { force: true });
  const left = await access(target).then(() => true, () => false);
  if (left) throw new Error(`failed to remove ${fileURLToPath(target)}`);
}
console.log(`Cesium runtime ready: ${fileURLToPath(destination)}`);
