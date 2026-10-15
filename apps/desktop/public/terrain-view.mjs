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

// ---------------------------------------------------------------------------
// Display-only edge transition. CTB tiles drop from the data edge straight to
// 0 m; the preview draws a separate sloping band outside the data instead of
// changing any tile. Nothing here touches the output.

const RAMP_STOPS = [[0, [43, 92, 138]], [0.25, [63, 143, 107]], [0.5, [185, 179, 92]], [0.75, [168, 112, 63]], [1, [242, 239, 233]]];

/** Same colours as the globe's elevation ramp. */
export function rampColor(height, min, max) {
  const t = max > min ? Math.min(Math.max((height - min) / (max - min), 0), 1) : 0;
  for (let i = 1; i < RAMP_STOPS.length; i += 1) {
    const [t1, c1] = RAMP_STOPS[i];
    if (t <= t1) {
      const [t0, c0] = RAMP_STOPS[i - 1];
      const f = (t - t0) / (t1 - t0);
      return c0.map((c, k) => Math.round(c + (c1[k] - c) * f));
    }
  }
  return RAMP_STOPS[RAMP_STOPS.length - 1][1].slice();
}

/** Band width: 5% of the shorter data side, 200 m to 2 km. */
export function transitionWidthM(bounds) {
  const [w, s, e, n] = bounds;
  const lat = (s + n) / 2;
  const spanM = Math.min(n - s, (e - w) * Math.cos((lat * Math.PI) / 180)) * METRES_PER_DEGREE;
  return Math.min(Math.max(spanM * 0.05, 200), 2000);
}

/**
 * Points around the data rectangle, counter-clockwise from the south-west
 * corner, `perSide` segments per side, each with its outward direction
 * (corners point diagonally so offset rings stay rectangular).
 */
export function perimeterPoints(bounds, perSide = 64) {
  const [w, s, e, n] = bounds;
  const points = [];
  const side = (x0, y0, x1, y1, nx, ny, cnx, cny) => {
    for (let i = 0; i < perSide; i += 1) {
      const f = i / perSide;
      const corner = i === 0;
      points.push({ lon: x0 + (x1 - x0) * f, lat: y0 + (y1 - y0) * f, nx: corner ? cnx : nx, ny: corner ? cny : ny });
    }
  };
  side(w, s, e, s, 0, -1, -1, -1);
  side(e, s, e, n, 1, 0, 1, -1);
  side(e, n, w, n, 0, 1, 1, 1);
  side(w, n, w, s, -1, 0, -1, 1);
  return points;
}

/** 1 at the data edge, 0 at the outer border, flat at both ends. */
export function taper(f) {
  if (f <= 0) return 1;
  if (f >= 1) return 0;
  return 0.5 * (1 + Math.cos(Math.PI * f));
}

/**
 * Closed band of `rings` + 1 offset rings around the data. `edgeHeights[i]`
 * is the terrain height at `points[i]`; ring k sits k/rings of `widthM`
 * outside and carries edgeHeights * taper(k/rings). Returns lon/lat/height
 * per vertex (real metres, not exaggerated) and triangle indices.
 */
export function transitionMesh(points, edgeHeights, widthM, rings = 12) {
  const count = points.length;
  const vertices = [];
  for (let k = 0; k <= rings; k += 1) {
    const d = (widthM * k) / rings;
    const weight = taper(k / rings);
    for (let i = 0; i < count; i += 1) {
      const p = points[i];
      const cos = Math.cos((p.lat * Math.PI) / 180);
      const h = Number.isFinite(edgeHeights[i]) ? edgeHeights[i] : 0;
      vertices.push({
        lon: p.lon + (p.nx * d) / (METRES_PER_DEGREE * Math.max(cos, 0.01)),
        lat: p.lat + (p.ny * d) / METRES_PER_DEGREE,
        height: h * weight,
      });
    }
  }
  const indices = [];
  for (let k = 0; k < rings; k += 1) {
    for (let i = 0; i < count; i += 1) {
      const a = k * count + i, b = k * count + ((i + 1) % count);
      const c = a + count, d = b + count;
      indices.push(a, c, b, b, c, d);
    }
  }
  return { vertices, indices };
}
