#!/usr/bin/env node
// ai_ingest.js — PVZ Garden: turn a sliced ChatGPT sheet (JSON from pvz-garden/_ai-slice.html) into game art (dev tool).
//   node tools/ai_ingest.js <sheet-NN.json> [--out pvz-garden/art-v2-ai-NN.js]
// Writes one art file that registers every sprite with PX.v2ai.add(kind, id, stage, { pal, rle, eyes }):
//  - pal: the sprite's colours; rle: 64 (bosses 96) run-length rows over letter symbols ('.' = empty, "<n><sym>" = a run)
//  - eyes: boxes [x, y, w, h] of the plant's eyes (dark iris + pure-white shine), only when the plant's original art has eyes
//    (Chomper and the other eyeless plants never get blink / mood overlays on their teeth)
// The file is added to pvz-garden/index.html after art-v2-ai.js if it isn't listed yet. Also copies a sprite preview into the JSON.
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..'), SRC = path.join(ROOT, 'pvz-garden');
const inFile = process.argv[2]; if (!inFile) { console.log('usage: node tools/ai_ingest.js sheet-NN.json [--out file]'); process.exit(2); }
const J = JSON.parse(fs.readFileSync(inFile, 'utf8'));
const oi = process.argv.indexOf('--out'), outFile = oi > 0 ? process.argv[oi + 1] : path.join(SRC, `art-v2-ai-${String(J.sheet).padStart(2, '0')}.js`);
const SYM = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', IN = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const OUT = '#29243d', WHITE = '#ffffff';
const lum = h => { const n = parseInt(h.slice(1), 16); return (0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255; };

// which plants have eyes in their original art (the costume fitter's own finder, via PX.dressGeom(...).all)
function eyedPlants() {
  const fake = () => { const c = { width: 0, height: 0 }; c.getContext = () => ({ fillRect() {}, clearRect() {}, drawImage() {}, getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData() {}, createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), save() {}, restore() {}, translate() {}, scale() {}, measureText: () => ({ width: 1 }), fillText() {} }); return c; };
  const sb = { console: { log() {}, warn() {}, error() {} }, document: { createElement: fake }, navigator: {}, Math, JSON, Map, Set, WeakMap, Array, Object, Number, String, Boolean, Error, parseInt, parseFloat, isNaN, isFinite, Uint8ClampedArray, Uint32Array, Float32Array };
  sb.window = sb; vm.createContext(sb);
  const html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  const order = [...html.matchAll(/src="(art-[A-Za-z0-9-]+\.js)"/g)].map(m => m[1]).filter(f => !/^art-(hd-|v2-)/.test(f));
  for (const f of ['pixel.js', ...order, 'data.js']) vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), sb, { filename: f });
  return (id, st) => { try { return sb.PX.hires(() => sb.PX.dressGeom({ species: id, stage: st }, {})).all.length > 0; } catch (e) { return true; } };
}
const hasEyes = J.items.some(i => i.kind === 'plant') ? eyedPlants() : () => false;

function eyeBoxes(grid, N) {
  // grow from every pure-white pixel over dark pixels (lum < 0.4) and white, within 5 px of the seed; keep eye-sized boxes
  const seen = new Set(), boxes = [];
  for (let k = 0; k < N * N; k++) {
    if (grid[k] !== WHITE || seen.has(k)) continue;
    const sx = k % N, sy = (k - sx) / N, st = [k], mine = new Set([k]); let dark = 0, iris = 0;
    while (st.length) { const j = st.pop(), x = j % N, y = (j - x) / N; for (const nb of [j - 1, j + 1, j - N, j + N]) { if (nb < 0 || nb >= N * N || mine.has(nb)) continue; const nx = nb % N, ny = (nb - nx) / N; if (Math.abs(nx - x) > 1 || Math.abs(nx - sx) > 5 || Math.abs(ny - sy) > 5) continue; const c = grid[nb]; if (!c) continue; if (c === WHITE || (lum(c) < 0.4)) { mine.add(nb); st.push(nb); if (c !== WHITE) dark++; if (c !== WHITE && c !== OUT) iris++; } } }
    for (const j of mine) if (grid[j] === WHITE) seen.add(j);
    if (iris < 3 || dark < 4) continue; // a real eye: a dark iris (not just outline) round the shine
    let x0 = N, y0 = N, x1 = -1, y1 = -1; for (const j of mine) { const x = j % N, y = (j - x) / N; if (grid[j] === OUT && ![j - 1, j + 1, j - N, j + N].some(n => grid[n] && grid[n] !== OUT && lum(grid[n]) < 0.4)) continue; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const w = x1 - x0 + 1, h = y1 - y0 + 1; if (w < 2 || h < 3 || w > 10 || h > 11) continue;
    boxes.push([x0, y0, w, h]);
  }
  // merge overlapping boxes
  const out = [];
  for (const b of boxes) { const o = out.find(q => b[0] < q[0] + q[2] && q[0] < b[0] + b[2] && b[1] < q[1] + q[3] && q[1] < b[1] + b[3]); if (o) { const x0 = Math.min(o[0], b[0]), y0 = Math.min(o[1], b[1]), x1 = Math.max(o[0] + o[2], b[0] + b[2]), y1 = Math.max(o[1] + o[3], b[1] + b[3]); o[0] = x0; o[1] = y0; o[2] = x1 - x0; o[3] = y1 - y0; } else out.push(b.slice()); }
  // real eyes come in pairs: a partner at about the same height, a few px apart, about the same size
  const cen = b => [b[0] + b[2] / 2, b[1] + b[3] / 2];
  return out.filter(b => out.some(o => { if (o === b) return false; const [x, y] = cen(b), [ox, oy] = cen(o), dx = Math.abs(ox - x); return Math.abs(oy - y) <= 3.5 && dx >= 2 && dx <= 16 && o[3] / b[3] > 0.5 && o[3] / b[3] < 2.0; }));
}
function rle(row) {
  let s = '', i = 0;
  while (i < row.length) { let j = i; while (j < row.length && row[j] === row[i]) j++; const n = j - i; s += n >= 3 ? n + row[i] : row[i].repeat(n); i = j; }
  return s;
}
const lines = [`// art-v2-ai-${String(J.sheet).padStart(2, '0')}.js — PVZ Garden: sprites from the family's ChatGPT sheet ${J.sheet} (generated by tools/ai_ingest.js; do not edit by hand).`,
  `// Source: art-src/pvz-ai/sheet-${String(J.sheet).padStart(2, '0')}-result.png, sliced by _ai-slice.html (scale ${J.scale.toFixed(3)}). Runtime: art-v2-ai.js.`, '(function () {', "  'use strict';", '  const A = PX.v2ai.add;'];
const report = [];
for (const it of J.items) {
  if (it.palette.length > SYM.length) { console.error(`${it.id}: ${it.palette.length} colours (max ${SYM.length})`); process.exit(1); }
  const N = it.N, grid = new Array(N * N).fill(null);
  it.rows.forEach((r, y) => { for (let x = 0; x < N; x++) { const c = r[x]; if (c !== '.') grid[y * N + x] = it.palette[IN.indexOf(c)]; } });
  const pal = [...new Set(grid.filter(Boolean))];
  const rows = []; for (let y = 0; y < N; y++) { let s = ''; for (let x = 0; x < N; x++) { const c = grid[y * N + x]; s += c ? SYM[pal.indexOf(c)] : '.'; } rows.push(rle(s)); }
  const eyes = it.kind === 'plant' && hasEyes(it.id, it.stage) ? eyeBoxes(grid, N).filter(b => b[1] < N * 0.8) : [];
  const data = { pal, rle: rows }; if (eyes.length) data.eyes = eyes;
  lines.push(`  A(${JSON.stringify(it.kind)}, ${JSON.stringify(it.id)}, ${it.stage == null ? 'null' : it.stage}, ${JSON.stringify(data)}); // ${it.name}`);
  report.push(`${it.name}: ${pal.length} colours, ${eyes.length} eye(s)`);
}
lines.push('})();', '');
fs.writeFileSync(outFile, lines.join('\n'));
const rel = path.basename(outFile), idx = path.join(SRC, 'index.html');
let html = fs.readFileSync(idx, 'utf8');
if (!html.includes(`src="${rel}"`)) {
  const anchor = '<script src="art-v2-ai.js"></script>\n';
  if (!html.includes(anchor)) html = html.replace('<script src="data.js"></script>', anchor + '<script src="data.js"></script>');
  const all = [...html.matchAll(/<script src="(art-v2-ai-\d+\.js)"><\/script>\n/g)].map(m => m[1]).concat([rel]).sort();
  html = html.replace(/<script src="art-v2-ai-\d+\.js"><\/script>\n/g, '').replace(anchor, anchor + all.map(f => `<script src="${f}"></script>\n`).join(''));
  fs.writeFileSync(idx, html);
}
console.log(`wrote ${path.relative(ROOT, outFile)} (${(fs.statSync(outFile).size / 1024).toFixed(1)} KB): ${report.join('; ')}`);
