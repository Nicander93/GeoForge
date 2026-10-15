// Camera and height helpers for the terrain preview. Plain JS so the preview
// page and the Node unit tests share it; no Cesium dependency.

const METRES_PER_DEGREE = 111320;

/** `w,s,e,n` in degrees, or null when missing or not a valid extent. */
export function parseBounds(value) {
  const parts = Array.isArray(value) ? value : String(value ?? '').split(',');
  if (parts.length !== 4) return null;
  const [w, s, e, n] = parts.map(Number);
  if (![w, s, e, n].every(Number.isFinite)) return null;
  if (w < -180 || e > 180 || s < -90 || n > 90 || w >= e || s >= n) return null;
  return [w, s, e, n];
}

/** Data extent with a margin on every side, clamped to the globe. */
export function overviewRectangle(bounds, margin = 0.15) {
  const [w, s, e, n] = bounds;
  const dx = (e - w) * margin;
  const dy = (n - s) * margin;
  return [Math.max(-180, w - dx), Math.max(-90, s - dy), Math.min(180, e + dx), Math.min(90, n + dy)];
}

/**
 * Close-up of the west data edge: just outside the data, looking east and
 * down across the edge, so a sunken or broken border is visible. Heights in
 * metres as displayed (multiplied by the exaggeration).
 */
export function edgeView(bounds, heights = {}, exaggeration = 1) {
  const [w, s, e, n] = bounds;
  const lat = (s + n) / 2;
  const spanM = Math.min(n - s, (e - w) * Math.cos((lat * Math.PI) / 180)) * METRES_PER_DEGREE;
  const distance = Math.min(Math.max(spanM * 0.1, 800), 4000);
  const top = Number.isFinite(heights.max) ? heights.max : 0;
  const lon = w - distance / (METRES_PER_DEGREE * Math.cos((lat * Math.PI) / 180));
  return { lon, lat, height: top * exaggeration + distance, headingDeg: 90, pitchDeg: -40 };
}

/** Height picked on an exaggerated globe, back in the output's metres. */
export function realHeight(pickedHeight, exaggeration = 1, relativeHeight = 0) {
  if (!Number.isFinite(pickedHeight)) return null;
  const factor = exaggeration > 0 ? exaggeration : 1;
  return (pickedHeight - relativeHeight) / factor + relativeHeight;
}

/** gzip member header: the bytes are still compressed. */
export function looksGzip(bytes) {
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

/** URL of the first level-0 tile declared in layer.json. */
export function firstTileUrl(baseUrl, layer) {
  const template = (layer.tiles && layer.tiles[0]) || '{z}/{x}/{y}.terrain?v={version}';
  const first = (layer.available && layer.available[0] && layer.available[0][0]) || { startX: 0, startY: 0 };
  const path = template
    .replace('{z}', '0')
    .replace('{x}', String(first.startX))
    .replace('{y}', String(first.startY))
    .replace('{version}', layer.version || '1.0.0');
  return new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).href;
}
