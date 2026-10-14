// Capture P0 terrain preview: screenshot + network log + Cesium sampleTerrainMostDetailed.
// node capture.mjs --url "http://127.0.0.1:8765/?run=B-D0&..." --out shot.png --json result.json
import { createRequire } from "node:module";
const require = createRequire(process.env.PW_NODE_MODULES ? process.env.PW_NODE_MODULES + "/" : import.meta.url);
const { chromium } = require("playwright");
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, s) => (v.startsWith("--") && a.push([v.slice(2), s[i + 1]]), a), []));
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const net = [];
page.on("response", async r => { const u = r.url(); if (u.includes("/tiles/")) net.push({ url: u.replace(/^https?:\/\/[^/]+/, ""), status: r.status(), headers: r.headers() }); });
page.on("requestfailed", r => net.push({ url: r.url(), failed: r.failure()?.errorText }));
const consoleMsgs = []; page.on("console", m => { if (m.type() === "error" || m.type() === "warning") consoleMsgs.push(m.text().slice(0, 400)); });
await page.goto(args.url);
await page.waitForFunction(() => window.p0 && window.p0.ready, null, { timeout: 120000 });
await page.screenshot({ path: args.out });
const p0 = await page.evaluate(() => window.p0);
const fs = await import("node:fs");
const terrain = net.filter(n => n.url && n.url.endsWith(".terrain") || (n.url || "").includes(".terrain?"));
const summary = { url: args.url, p0, consoleErrors: consoleMsgs, requests: net.length,
  terrainRequests: terrain.length, terrainStatus: terrain.reduce((a, n) => (a[n.status ?? "failed"] = (a[n.status ?? "failed"] || 0) + 1, a), {}),
  sampleHeaders: { layer: net.find(n => (n.url || "").includes("layer.json"))?.headers, terrain: terrain.find(n => n.status === 200)?.headers } };
fs.writeFileSync(args.json, JSON.stringify({ summary, network: net }, null, 1));
console.log(JSON.stringify(summary, null, 1));
await browser.close();
