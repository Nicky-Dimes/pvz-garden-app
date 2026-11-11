#!/usr/bin/env node
// pvz_art_inventory.js — Phase 1 of the PVZ Garden pixel-art overhaul: an inventory of every piece of art the game draws today.
// Writes docs/pvz-art-asset-manifest.json (schema pvz-garden-art/v2), generated from the game source itself. Every id comes
// from the game's own tables (data.js, the PX art registries, and tables in the scene files read as text); none is typed in here.
//   node tools/pvz_art_inventory.js                  read the working tree of pvz-garden/
//   node tools/pvz_art_inventory.js --ref HEAD       read a git commit of pvz-garden/ instead (a clean baseline while files change)
//   node tools/pvz_art_inventory.js --out <file>     write somewhere else          --dry-run   print the counts, write nothing
// How: pixel.js, the art-*.js files (index.html order, without the illustrated-art loader) and data.js run in a sandbox with a
// small software canvas (the approach of tools/render_sheet.js), so the current code art can be measured: the occupied box
// (alpha > 0) of every plant look and zombie in the idle pose, and of every Zomboss frame. Read-only on pvz-garden/. No dependencies.
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path'), cp = require('child_process');

const ROOT = path.join(__dirname, '..'), GAME = path.join(ROOT, 'pvz-garden');
const argv = process.argv.slice(2), argOf = k => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? argv[i + 1] : null; };
const REF = argOf('--ref'), DRY = argv.includes('--dry-run');
const OUT = path.resolve(argOf('--out') || path.join(ROOT, 'docs', 'pvz-art-asset-manifest.json'));
const FALLBACK_BUILD = '2026.10.24-1500-e28fee'; // the published build of branch main (pvz-garden-app/version.js)
const T0 = Date.now();
const warnings = [];
const warn = m => { warnings.push(m); console.log('  ! ' + m); };

// ---------------- the source: working tree, or a git commit (--ref) ----------------
const git = (...a) => cp.execFileSync('git', ['-C', GAME, ...a], { encoding: 'utf8', maxBuffer: 256 << 20, stdio: ['ignore', 'pipe', 'ignore'] });
const srcCache = new Map();
function src(f) {
  if (!srcCache.has(f)) srcCache.set(f, REF ? git('show', `${REF}:${f}`) : fs.readFileSync(path.join(GAME, f), 'utf8'));
  return srcCache.get(f);
}
const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const lineStarts = new Map();
function lineOfIdx(f, idx) {
  if (idx == null || idx < 0) return null;
  let ls = lineStarts.get(f);
  if (!ls) { ls = [0]; const t = src(f); for (let i = 0; i < t.length; i++) if (t.charCodeAt(i) === 10) ls.push(i + 1); lineStarts.set(f, ls); }
  let lo = 0, hi = ls.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (ls[m] <= idx) lo = m; else hi = m - 1; }
  return lo + 1;
}
// first match of re in file f, optionally only between the markers from .. to: { line, idx, m } or null
function find(f, re, from, to) {
  let t; try { t = src(f); } catch (e) { return null; }
  let a = 0, b = t.length;
  if (from) { a = t.indexOf(from); if (a < 0) return null; }
  if (to) { const e = t.indexOf(to, a + 1); if (e >= 0) b = e; }
  const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'); r.lastIndex = a;
  const m = r.exec(t); if (!m || m.index >= b) return null;
  return { line: lineOfIdx(f, m.index), idx: m.index, m };
}
const markerLine = (f, marker) => { const h = find(f, new RegExp(esc(marker))); return h ? h.line : null; };
const at = (f, line, what) => `${f}${line ? ':' + line : ''} ${what}`;
const fnRef = (f, name) => { const h = find(f, new RegExp(`function ${esc(name)}\\(`)); return h ? `${f}:${h.line} ${name}()` : null; };
// a key in an object literal / a method / an assignment, searched between two markers
const keyLine = (f, id, from, to) => { const h = find(f, new RegExp(`(?:^|[ \\t{,(])['"]?${esc(id)}['"]?[ \\t]*(?::|\\()`, 'm'), from, to); return h ? h.line : null; };
// evaluate a table that sits between two markers of a source file (a literal, or code that only needs ctx)
function sliceEval(f, start, end, expr, ctx) {
  const t = src(f), a = t.indexOf(start), b = a < 0 ? -1 : t.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error(`${f}: could not find "${start}" … "${end}"`);
  return { value: vm.runInNewContext(t.slice(a, b) + `\n;(${expr});`, Object.assign({}, ctx || {}), { filename: f, timeout: 5000 }), line: lineOfIdx(f, a) };
}
function trySlice(label, fn, fallback) { try { return fn(); } catch (e) { warn(`${label}: ${e.message}`); return fallback; } }

// ---------------- a tiny software canvas (from tools/render_sheet.js) ----------------
const colorCache = new Map();
function parseColor(c) {
  if (typeof c !== 'string') return [0, 0, 0, 255];
  let v = colorCache.get(c); if (v) return v;
  const s = c.trim(); let m;
  if ((m = /^#([0-9a-f]{6})$/i.exec(s))) { const n = parseInt(m[1], 16); v = [n >> 16 & 255, n >> 8 & 255, n & 255, 255]; }
  else if ((m = /^#([0-9a-f]{3})$/i.exec(s))) v = [...m[1]].map(h => parseInt(h + h, 16)).concat([255]);
  else if ((m = /^rgba?\(([^)]+)\)$/i.exec(s))) { const p = m[1].split(',').map(x => parseFloat(x)); v = [p[0] | 0, p[1] | 0, p[2] | 0, Math.round((p[3] == null ? 1 : p[3]) * 255)]; }
  else if (s === 'white') v = [255, 255, 255, 255]; else if (s === 'black') v = [0, 0, 0, 255]; else v = [255, 0, 255, 255];
  colorCache.set(c, v); return v;
}
class Canvas {
  constructor() { this._w = 0; this._h = 0; this.data = new Uint8ClampedArray(0); this._ctx = null; this.style = {}; this.dataset = {}; }
  get width() { return this._w; } set width(v) { this._w = v | 0; this.data = new Uint8ClampedArray(this._w * this._h * 4); }
  get height() { return this._h; } set height(v) { this._h = v | 0; this.data = new Uint8ClampedArray(this._w * this._h * 4); }
  getContext() { return this._ctx || (this._ctx = new Ctx(this)); }
}
class Ctx {
  constructor(c) { this.canvas = c; this.fillStyle = '#000'; this.strokeStyle = '#000'; this.globalAlpha = 1; this.imageSmoothingEnabled = false; this.globalCompositeOperation = 'source-over'; this.filter = 'none'; this._t = [1, 0, 0, 1, 0, 0]; this._stack = []; }
  _blend(i, r, g, b, a) {
    const d = this.canvas.data, op = this.globalCompositeOperation;
    if (op === 'source-in') { const da = d[i + 3] / 255; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = Math.round(a * da); return; }
    if (op === 'destination-out') { d[i + 3] = Math.round(d[i + 3] * (1 - a / 255)); return; }
    const sa = a / 255, da = d[i + 3] / 255, oa = sa + da * (1 - sa);
    if (oa <= 0) { d[i + 3] = 0; return; }
    d[i] = Math.round((r * sa + d[i] * da * (1 - sa)) / oa); d[i + 1] = Math.round((g * sa + d[i + 1] * da * (1 - sa)) / oa); d[i + 2] = Math.round((b * sa + d[i + 2] * da * (1 - sa)) / oa); d[i + 3] = Math.round(oa * 255);
  }
  fillRect(x, y, w, h) {
    const [r, g, b, a0] = parseColor(this.fillStyle), a = Math.round(a0 * this.globalAlpha), W = this.canvas.width, H = this.canvas.height;
    x += this._t[4]; y += this._t[5];
    const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y)), x1 = Math.min(W, Math.round(x + w)), y1 = Math.min(H, Math.round(y + h));
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) this._blend((yy * W + xx) * 4, r, g, b, a);
  }
  clearRect(x, y, w, h) { const W = this.canvas.width, H = this.canvas.height; for (let yy = Math.max(0, y | 0); yy < Math.min(H, y + h); yy++) for (let xx = Math.max(0, x | 0); xx < Math.min(W, x + w); xx++) this.canvas.data.fill(0, (yy * W + xx) * 4, (yy * W + xx) * 4 + 4); }
  drawImage(srcC, ...a) {
    let sx = 0, sy = 0, sw = srcC.width, sh = srcC.height, dx, dy, dw, dh;
    if (a.length === 2) { [dx, dy] = a; dw = sw; dh = sh; } else if (a.length === 4) { [dx, dy, dw, dh] = a; } else { [sx, sy, sw, sh, dx, dy, dw, dh] = a; }
    const flip = this._t[0] < 0; dx = flip ? this._t[4] - dx : dx + this._t[4]; dy += this._t[5]; const W = this.canvas.width, H = this.canvas.height, sd = srcC.data;
    if (!sd || !sw || !sh) return;
    for (let y = 0; y < Math.round(dh); y++) for (let x = 0; x < Math.round(dw); x++) {
      const tx = flip ? Math.round(dx) - 1 - x : Math.round(dx) + x, ty = Math.round(dy) + y; if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
      const ux = Math.floor(sx + x * sw / dw), uy = Math.floor(sy + y * sh / dh); if (ux < 0 || uy < 0 || ux >= srcC.width || uy >= srcC.height) continue;
      const si = (uy * srcC.width + ux) * 4; if (!sd[si + 3]) continue;
      this._blend((ty * W + tx) * 4, sd[si], sd[si + 1], sd[si + 2], Math.round(sd[si + 3] * this.globalAlpha));
    }
  }
  getImageData(x, y, w, h) { const out = new Uint8ClampedArray(w * h * 4), W = this.canvas.width; for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const s = ((y + yy) * W + x + xx) * 4, d = (yy * w + xx) * 4; for (let k = 0; k < 4; k++) out[d + k] = this.canvas.data[s + k] || 0; } return { width: w, height: h, data: out }; }
  putImageData(img, x, y) { const W = this.canvas.width; for (let yy = 0; yy < img.height; yy++) for (let xx = 0; xx < img.width; xx++) { const d = ((y + yy) * W + x + xx) * 4, s = (yy * img.width + xx) * 4; for (let k = 0; k < 4; k++) this.canvas.data[d + k] = img.data[s + k]; } }
  createImageData(w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; }
  save() { this._stack.push([this._t.slice(), this.globalAlpha, this.globalCompositeOperation, this.fillStyle]); }
  restore() { const s = this._stack.pop(); if (s) [this._t, this.globalAlpha, this.globalCompositeOperation, this.fillStyle] = s; }
  translate(x, y) { this._t[4] += x; this._t[5] += y; }
  scale(x) { if (x < 0) this._t[0] = -this._t[0]; }
  setTransform(a, b, c, d, e, f) { this._t = [a == null ? 1 : a, 0, 0, 1, e || 0, f || 0]; }
  rotate() {} beginPath() {} rect() {} clip() {} moveTo() {} lineTo() {} arcTo() {} closePath() {} fill() {} stroke() {} arc() {} ellipse() {} quadraticCurveTo() {} bezierCurveTo() {}
  createLinearGradient() { return { addColorStop() {} }; } createRadialGradient() { return { addColorStop() {} }; }
  measureText() { return { width: 10 }; } fillText() {} strokeText() {}
}
// occupied box (alpha > 0) in canvas pixels
function bounds(c) {
  const d = c.data, W = c.width, H = c.height; let x0 = W, y0 = H, x1 = -1, y1 = -1, n = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3]) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { minX: x0, maxX: x1, minY: y0, maxY: y1, w: x1 - x0 + 1, h: y1 - y0 + 1, opaquePx: n };
}
// the current code canvas in logical px of the 64-grid scale (= fine px: 2 per art px). k = the canvas's own .k (1 = chunky)
function dims(c, kOverride) {
  if (!c || !c.width) return null;
  const k = kOverride || c.k || 1, aw = c.width / k, ah = c.height / k;
  return { nativeW: Math.round(aw * 2), nativeH: Math.round(ah * 2), currentCanvas: { w: c.width, h: c.height, k, artW: aw, artH: ah } };
}

// ---------------- the art sandbox ----------------
const drawErrors = [];
const sb = {
  console: { log() {}, info() {}, warn() {}, error: (...a) => drawErrors.push(a.map(x => (x && x.message) || String(x)).join(' ').split('\n')[0]) },
  document: { createElement: () => new Canvas(), head: { appendChild() {} }, getElementById: () => null, addEventListener() {}, querySelector: () => null }, navigator: {},
  Math, JSON, Map, Set, WeakMap, Array, Object, Number, String, Boolean, Error, TypeError, RangeError, Symbol, Proxy, Reflect, Promise, Date,
  parseInt, parseFloat, isNaN, isFinite, Uint8ClampedArray, Uint8Array, Uint16Array, Uint32Array, Int32Array, Float32Array, Float64Array,
};
sb.window = sb; sb.self = sb;
vm.createContext(sb);
const page = [...src('index.html').matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
const LOAD = page.filter(f => f === 'pixel.js' || f === 'data.js' || (/^art-[\w-]+\.js$/.test(f) && !/^art-hd-/.test(f)));
// which file defines (or redefines) each id of the art registries, watched while the files load
const REGS = ['PLANT_ART', 'PLANT_PAL', 'ZOMBIE_ART', 'BOSS_ART', 'PLANT_ART2', 'ZOMBIE_ART2', 'BOSS_ART2', 'PVZ_PROP', 'PVZ_HOME', 'FUSION_ICON', 'ELEMENT_SPRITE', 'ELEMENT_ICON', 'FISH_ART', 'DECOR_ART', 'AQUA_BACKDROP', 'AQUA_SAND', 'GARDEN_MAPS', 'RACE_MAPS'];
const ALIAS = { PLANT_ART2: ['ART', 'PLANT_ART2'], ZOMBIE_ART2: ['ART', 'ZA', 'ZOMBIE_ART2'], BOSS_ART2: ['BA', 'BOSS_ART2'], PLANT_ART: ['ART', 'PA', 'PLANT_ART'], PLANT_PAL: ['PAL', 'PLANT_PAL'], ZOMBIE_ART: ['ZA', 'ZOMBIE_ART'], BOSS_ART: ['BA', 'BOSS_ART'], PVZ_PROP: ['P', 'PVZ_PROP'],
  PVZ_HOME: ['H', 'PVZ_HOME'], FUSION_ICON: ['FUS', 'FUSION_ICON'], ELEMENT_SPRITE: ['SPR', 'ELEMENT_SPRITE'], ELEMENT_ICON: ['ELEMENT_ICON'], FISH_ART: ['FA', 'FISH_ART'],
  DECOR_ART: ['D', 'DECOR_ART'], AQUA_BACKDROP: ['BD', 'AQUA_BACKDROP'], AQUA_SAND: ['SD', 'AQUA_SAND'], GARDEN_MAPS: ['M', 'GARDEN_MAPS'], RACE_MAPS: ['RM', 'RACE_MAPS'] };
const REG_DECL = { ELEMENT_ICON: 'const ELEMENT_ICON = {}', FUSION_ICON: 'const FUS = {}', ELEMENT_SPRITE: 'const SPR = {}' };
const defs = Object.fromEntries(REGS.map(r => [r, {}]));
const snap = () => Object.fromEntries(REGS.map(r => { const t = sb.PX && sb.PX[r]; return [r, t && typeof t === 'object' ? new Map(Object.entries(t)) : new Map()]; }));
const loaded = [];
for (const f of LOAD) {
  const before = snap();
  try { vm.runInContext(src(f), sb, { filename: f }); loaded.push(f); }
  catch (e) { if (['pixel.js', 'art-core.js', 'data.js'].includes(f)) throw e; warn(`skipped ${f}: ${e.message}`); continue; }
  const after = snap();
  for (const r of REGS) for (const [id, v] of after[r]) if (!before[r].has(id) || before[r].get(id) !== v) (defs[r][id] = defs[r][id] || []).push(f);
}
const PX = sb.PX, D = sb.PSDATA;
if (!PX || !D || !PX.buildPlant) throw new Error('the art sandbox did not load (pixel.js / art-core.js / data.js)');
function defRef(reg, id) {
  const files = defs[reg][id]; if (!files || !files.length) return null;
  const f = files[files.length - 1], a = ALIAS[reg].map(esc).join('|'), q = esc(id);
  const pats = [new RegExp(`(?:^|[^\\w.$\\n])(?:PX\\.)?(?:${a})\\.${q}\\s*=(?!=)`, 'm'), new RegExp(`(?:^|[^\\w.$\\n])(?:PX\\.)?(?:${a})\\[['"]${q}['"]\\]\\s*=(?!=)`, 'm')];
  let line = null;
  for (const p of pats) { const h = find(f, p); if (h) { line = h.line; break; } }
  if (line == null && REG_DECL[reg]) line = keyLine(f, id, REG_DECL[reg]) || markerLine(f, REG_DECL[reg]);
  if (line == null) line = keyLine(f, id);
  return { file: f, line, ref: at(f, line, `PX.${reg}.${id}`), also: files.slice(0, -1) };
}
const safeDraw = (label, fn) => { const n = drawErrors.length; try { const c = fn(); if (drawErrors.length > n) warn(`${label}: ${drawErrors.slice(n).join('; ')}`); return c; } catch (e) { warn(`${label}: ${e.message}`); return null; } };

// ---------------- engine facts (read from the loaded engine, not assumed) ----------------
const ENGINE = { artGrid: 32, K: PX.Grid.K, HI: PX.HI, SCENE_K: PX.SCENE_K, SPRIG_W: PX.SPRIG_W, SPRIG_H: PX.SPRIG_H, SPRIG_AX: PX.SPRIG_AX, SPRIG_AY: PX.SPRIG_AY, INK: PX.INK };
const LOG = { w: PX.SPRIG_W * PX.HI, h: PX.SPRIG_H * PX.HI, ax: PX.SPRIG_AX * PX.HI, ay: PX.SPRIG_AY * PX.HI }; // 64 x 64, anchor (32, 62)
const SCALE = 4, FRAME = LOG.w * SCALE; // 256
if (LOG.w !== 64 || LOG.h !== 64 || LOG.ax !== 32 || LOG.ay !== 62) warn(`engine grid is not 64x64 / anchor (32, 62): ${JSON.stringify(LOG)}`);

// ---------------- the manifest rows ----------------
const assets = [];
function row(type, entityId, o) {
  const r = { id: null, type, entityId, stage: null, pose: null, name: null, assetPath: null, sourceRef: null, nativeW: null, nativeH: null, frameW: null, frameH: null,
    anchorX: null, anchorY: null, renderScale: null, authoring: 'v1-code', runtime: 'code', verification: 'baseline', notes: '' };
  Object.assign(r, o || {});
  if (!r.id) r.id = [type, entityId].concat(r.stage != null ? ['s' + r.stage] : [], r.frame != null ? ['f' + r.frame] : r.pose ? [r.pose] : []).join(':');
  assets.push(r); return r;
}
const otherPath = (type, id) => `art-export/${type}/${id}.png`;
// a sprite-like asset measured from its current code canvas (bottom-centre anchor when the game blits it into a scene)
function measured(c, o) {
  const d = dims(c, o && o.k); if (!d) return { drawFailed: true }; // (the warning says why)
  const r = { nativeW: d.nativeW, nativeH: d.nativeH, frameW: d.nativeW * SCALE, frameH: d.nativeH * SCALE, renderScale: SCALE, currentCanvas: d.currentCanvas };
  if (o && o.anchor === 'bottom') { r.anchorX = 2 * Math.floor(d.currentCanvas.artW / 2); r.anchorY = d.nativeH; }
  return r;
}
const scene = { nativeW: null, nativeH: null, frameW: null, frameH: null, anchorX: null, anchorY: null, renderScale: null };

// unlock route of every plant (data.js UNLOCKS, Survival rewards, starters)
const unlockOf = {};
for (const s of D.STARTERS) unlockOf[s] = 'starter';
for (const [k, sp] of Object.entries(D.UNLOCKS)) if (typeof sp === 'string' && D.PLANTS[sp]) unlockOf[sp] = unlockOf[sp] || k;
for (const M of D.SURVIVAL || []) if (D.PLANTS[M.reward]) unlockOf[M.reward] = unlockOf[M.reward] || 'survival:' + M.id;

// ---------- plants: 3 stages x 8 poses ----------
const POSES = { plant: ['idle', 'blink', 'walkA', 'walkB', 'cheer', 'attack', 'hurt', 'knockedOut'], zombie: ['idle', 'walkA', 'walkB', 'bite', 'hurt'] };
const LOADER_POSE = { idle: 'idle', blink: 'blink', walkA: 'walk0', walkB: 'walk1', cheer: 'cheer', attack: 'attack', hurt: 'hurt', knockedOut: 'knocked', bite: 'bite' };
// a representative pose object each scene really asks for (see tools/test_art_hd_loader.js); verified below against the loader
const CODE_POSE = {
  plant: { idle: {}, blink: { eyes: 'blink' }, walkA: { walk: true, frame: 0, mouth: 'smile' }, walkB: { walk: true, frame: 1, mouth: 'smile' }, cheer: { arms: 'up', eyes: 'happy', mouth: 'open' },
    attack: { arms: 'out', mouth: 'open', eyes: 'brave' }, hurt: { eyes: 'sad', mouth: 'o' }, knockedOut: { eyes: 'closed', mouth: 'o' } },
  zombie: { idle: {}, walkA: { walk: true, frame: 0 }, walkB: { walk: true, frame: 1 }, bite: { arms: 'out', mouth: 'open', eyes: 'brave' }, hurt: { eyes: 'sad', mouth: 'o' } },
};
trySlice('art-hd-loader.js pose check', () => {
  const pick = sliceEval('art-hd-loader.js', 'function pickPlantPose(P)', 'function selected(', 'pickPose').value;
  for (const kind of ['plant', 'zombie']) for (const [pose, P] of Object.entries(CODE_POSE[kind])) { const got = pick(P, kind === 'zombie'); if (got !== LOADER_POSE[pose]) warn(`code pose for ${kind} ${pose} maps to loader frame "${got}"`); }
});
const cellOf = (i, cols, size) => ({ col: i % cols, row: Math.floor(i / cols), x: (i % cols) * size, y: Math.floor(i / cols) * size });
let plantLooks = 0;
for (const [id, P] of Object.entries(D.PLANTS)) {
  const v1 = defRef('PLANT_ART', id), v2 = defRef('PLANT_ART2', id), art = v2 || v1, palR = defRef('PLANT_PAL', id), data = find('data.js', new RegExp(`^[ \\t]*${esc(id)}: (?:PL|LG)\\(`, 'm'));
  if (!v1) warn(`plant ${id}: no PX.PLANT_ART entry (the code falls back to the Peashooter)`);
  for (let st = 0; st < 3; st++) {
    const c = safeDraw(`plant ${id} stage ${st}`, () => PX.hires(() => PX.buildPlant({ species: id, stage: st }, {}).canvas()));
    const b = c && bounds(c); plantLooks++;
    if (c && (c.width !== LOG.w || c.height !== LOG.h)) warn(`plant ${id} stage ${st}: canvas ${c.width}x${c.height}, expected ${LOG.w}x${LOG.h}`);
    POSES.plant.forEach((pose, i) => row('plant', id, {
      stage: st, pose, name: P.names[st], assetPath: `art-export/plants/${id}/stage-${st}.png`, sourceRef: art ? art.ref : null, authoring: v2 ? 'v2-code' : 'v1-code',
      nativeW: LOG.w, nativeH: LOG.h, frameW: FRAME, frameH: FRAME, anchorX: LOG.ax, anchorY: LOG.ay, renderScale: SCALE,
      notes: [P.legendary ? 'legendary hero plant (won in Survival)' : '', v2 && v1 ? `v2 art (PX.PLANT_ART2) is drawn; v1 code art: ${v1.ref}` : '', v1 && v1.also.length ? `v1 art also defined earlier in ${v1.also.join(', ')}` : ''].filter(Boolean).join('; '),
      speciesName: P.name, legendary: !!P.legendary, role: P.role, element: P.el, part: P.part, prize: P.prize || null, unlock: unlockOf[id] || null,
      cell: cellOf(i, 4, FRAME), loaderPose: LOADER_POSE[pose], codePose: CODE_POSE.plant[pose],
      currentBounds: b ? Object.assign({ pose: 'idle' }, b) : null,
      paletteRef: palR ? palR.ref : null, dataRef: data ? at('data.js', data.line, `D.PLANTS.${id}`) : null,
    }));
  }
}

// ---------- zombies: 5 poses ----------
for (const [id, Z] of Object.entries(D.ZOMBIES)) {
  const v1 = defRef('ZOMBIE_ART', id), v2 = defRef('ZOMBIE_ART2', id), art = v2 || v1, data = find('data.js', new RegExp(`^[ \\t]*${esc(id)}: Z\\(`, 'm'));
  if (!v1) warn(`zombie ${id}: no PX.ZOMBIE_ART entry (the code falls back to the basic zombie)`);
  const c = safeDraw(`zombie ${id}`, () => PX.hires(() => PX.buildZombie({ zombie: id }, {}).canvas()));
  const b = c && bounds(c);
  if (c && (c.width !== LOG.w || c.height !== LOG.h)) warn(`zombie ${id}: canvas ${c.width}x${c.height}, expected ${LOG.w}x${LOG.h}`);
  POSES.zombie.forEach((pose, i) => row('zombie', id, {
    pose, name: Z.name, assetPath: `art-export/zombies/${id}.png`, sourceRef: art ? art.ref : null, authoring: v2 ? 'v2-code' : 'v1-code',
    nativeW: LOG.w, nativeH: LOG.h, frameW: FRAME, frameH: FRAME, anchorX: LOG.ax, anchorY: LOG.ay, renderScale: SCALE,
    notes: [v2 && v1 ? `v2 art (PX.ZOMBIE_ART2) is drawn; v1 code art: ${v1.ref}` : '', v1 && v1.also.length ? `v1 art also defined earlier in ${v1.also.join(', ')}` : ''].filter(Boolean).join('; '),
    elements: Z.el, arcade: !!Z.arcade, cell: cellOf(i, 3, FRAME), loaderPose: LOADER_POSE[pose], codePose: CODE_POSE.zombie[pose],
    currentBounds: b ? Object.assign({ pose: 'idle' }, b) : null, dataRef: data ? at('data.js', data.line, `D.ZOMBIES.${id}`) : null,
  }));
}

// ---------- Zombosses: 2 frames, 96 x 96 logical ----------
const BOSSES = trySlice('battle.js BOSSES', () => sliceEval('battle.js', 'const BOSSES = [', 'const BOSS_PRIZE', 'BOSSES'), { value: [], line: null });
const bossIds = BOSSES.value.map(b => b.id);
const BOSS_LOG = 96, BOSS_FRAME = BOSS_LOG * SCALE, BOSS_ANCHOR = { x: BOSS_LOG / 2, y: BOSS_LOG - (LOG.h - LOG.ay) };
for (const B of BOSSES.value) {
  const A = PX.BOSS_ART && PX.BOSS_ART[B.id], v2 = defRef('BOSS_ART2', B.id), art = v2 || defRef('BOSS_ART', B.id), data = find('battle.js', new RegExp(`\\{ id: '${esc(B.id)}'`), 'const BOSSES = [');
  if (!A) warn(`Zomboss ${B.id}: no PX.BOSS_ART entry`);
  for (let f = 0; f < 2; f++) {
    const c = A ? safeDraw(`Zomboss ${B.id} frame ${f}`, () => PX.critter(B.id, f)) : null, b = c && bounds(c);
    if (c && (c.width !== BOSS_LOG || c.height !== BOSS_LOG)) warn(`Zomboss ${B.id}: canvas ${c.width}x${c.height}, expected ${BOSS_LOG}x${BOSS_LOG}`);
    row('boss', B.id, {
      frame: f, pose: 'frame' + f, name: B.name, assetPath: `art-export/bosses/${B.id}.png`, sourceRef: art ? art.ref : null, authoring: v2 ? 'v2-code' : 'v1-code',
      nativeW: BOSS_LOG, nativeH: BOSS_LOG, frameW: BOSS_FRAME, frameH: BOSS_FRAME, anchorX: BOSS_ANCHOR.x, anchorY: BOSS_ANCHOR.y, renderScale: SCALE,
      notes: 'anchor proposed with the characters\' 2-logical-px bottom margin; battle.js drawFighter() currently anchors Zombosses at the bottom edge (artH) and scales them by critScale()',
      title: B.title, arena: B.area, elements: B.els, codeArtSize: A ? { artW: A.w || 48, artH: A.h || 48 } : null, cell: cellOf(f, 2, BOSS_FRAME),
      currentBounds: b ? Object.assign({ frame: f }, b) : null, dataRef: data ? at('battle.js', data.line, `BOSSES ${B.id}`) : null,
    });
  }
}
const orphans = {
  PLANT_ART: Object.keys(PX.PLANT_ART).filter(k => !D.PLANTS[k]), ZOMBIE_ART: Object.keys(PX.ZOMBIE_ART).filter(k => !D.ZOMBIES[k]),
  BOSS_ART: Object.keys(PX.BOSS_ART || {}).filter(k => !bossIds.includes(k)), ITEM_FX_IDS: (PX.ITEM_FX_IDS || []).filter(k => !D.FUSION_ITEMS[k]),
};
for (const [k, list] of Object.entries(orphans)) if (list.length) warn(`${k} has art with no game data (never shown): ${list.join(', ')}`);

// ---------- costume layers ----------
const CORE = 'art-core.js', OVERLAY = { nativeW: LOG.w, nativeH: LOG.h, frameW: FRAME, frameH: FRAME, anchorX: null, anchorY: null, renderScale: SCALE };
const fitNote = 'head-anchored layer drawn into the 64x64 plant canvas; fitted once per plant look on its resting pose (art-core.js restGeom/shiftGeom, PX.dressGeom), then follows the head';
for (const [id, I] of Object.entries(D.FUSION_ITEMS)) {
  const icon = safeDraw(`fusion item icon ${id}`, () => PX.item('fitem', id)), iconR = defRef('FUSION_ICON', id), d = find('data.js', new RegExp(`^[ \\t]*${esc(id)}: FI\\(`, 'm'));
  if (!(PX.ITEM_FX_IDS || []).includes(id)) warn(`fusion item ${id}: no costume in art-core.js ITEM`);
  row('costume-item', id, Object.assign({}, OVERLAY, {
    name: I.name, assetPath: otherPath('costume-item', id), sourceRef: at(CORE, keyLine(CORE, id, 'const ITEM = {', 'const EL_FX = {'), `ITEM.${id}`), notes: fitNote,
    form: I.form, element: I.el, icon: Object.assign({ ref: iconR ? iconR.ref : null }, measured(icon)), dataRef: d ? at('data.js', d.line, `D.FUSION_ITEMS.${id}`) : null,
  }));
}
for (const id of PX.PART_IDS || []) {
  const users = Object.keys(D.PLANTS).filter(k => D.PLANTS[k].part === id);
  row('fusion-part', id, Object.assign({}, OVERLAY, {
    name: id, assetPath: otherPath('fusion-part', id), sourceRef: at(CORE, keyLine(CORE, id, 'const PART = {', 'const ITEM = {'), `PART.${id}`),
    notes: `${fitNote}; worn when a plant is fused with a partner whose D.PLANTS[].part is "${id}"${users.length ? '' : ' (no plant has this part: unreachable)'}`,
    partnerPlants: users,
  }));
}
// skins: data.js D.SKINS (+ the Halloween ones event.js adds at runtime) are drawn by art-core.js; pixel.js PX.SKIN_IDS are Solunar sprout skins
const evSkins = trySlice('event.js skins', () => { const h = find('event.js', /Object\.assign\(D\.SKINS, \{([^\n]*)\}\);/); return h ? { ids: [...h.m[1].matchAll(/(\w+): \{/g)].map(m => m[1]), line: h.line } : { ids: [], line: null }; }, { ids: [], line: null });
const seedSkin = {}; for (const [k, s] of Object.entries(D.SEEDS)) if (s.skin) (seedSkin[s.skin] = seedSkin[s.skin] || []).push(k);
const zombieSkin = {};
for (const L of (D.LEAGUES || []).concat(D.PLANT_LEAGUES || [])) for (const o of L.opponents || []) { const sk = (o.look && o.look.skin) || o.skin; if (sk) (zombieSkin[sk] = zombieSkin[sk] || new Set()).add(L.id); }
for (const id of Object.keys(D.SKINS)) {
  const line = id === 'rainbow' ? markerLine(CORE, 'const RBW') : keyLine(CORE, id, 'const SKIN = {', 'const RBW');
  const how = [seedSkin[id] ? `seed packets: ${seedSkin[id].join(', ')}` : '', zombieSkin[id] ? `league/cup opponents: ${[...zombieSkin[id]].join(', ')}` : ''].filter(Boolean).join('; ');
  row('skin', id, { name: D.SKINS[id].name, sourceRef: at(CORE, line, id === 'rainbow' ? 'RBW (rainbow skin)' : `SKIN.${id}`),
    notes: 'recolour/pattern treatment of the whole 64x64 plant or zombie canvas (art-core.js applySkin), not a separate image', table: 'D.SKINS', reachable: !!how, reachableHow: how || null });
}
for (const id of PX.SKIN_IDS || []) row('skin', id, { id: `skin:solunar:${id}`, name: id, sourceRef: at('pixel.js', keyLine('pixel.js', id, 'const SKINS = {', 'const SKIN_IDS'), `SKINS.${id} (Solunar sprout skin)`),
  notes: 'Solunar Sprouts body skin for the old PX.sprig sprout builder; PVZ plants and zombies never use it (art-core.js only routes looks without species/zombie to it)', table: 'PX.SKIN_IDS', reachable: false, reachableHow: null });
const HSKINS = (PX.eventArt && PX.eventArt.PLANT_SKINS) || [];
for (const id of HSKINS) row('halloween-costume', id, Object.assign({}, OVERLAY, {
  name: id, assetPath: otherPath('halloween-costume', id), sourceRef: at('art-event.js', keyLine('art-event.js', id, 'const PLANT_SKINS = {', 'const HSKIN_IDS'), `PLANT_SKINS.${id}`),
  notes: `${fitNote}; a Halloween value of look.skin (event.js:${evSkins.line || '?'} adds it to D.SKINS at runtime)`, inDataSkins: evSkins.ids.includes(id) }));
const ZCOST = trySlice('art-event.js ZCOST', () => { const t = src('art-event.js'), a = t.indexOf('const ZCOST = {'), b = t.indexOf('const zcache'); return [...t.slice(a, b).matchAll(/^ {4}(\w+)\(g/gm)].map(m => m[1]); }, []);
for (const id of ZCOST) row('halloween-zombie-costume', id, Object.assign({}, OVERLAY, { name: id, assetPath: otherPath('halloween-zombie-costume', id),
  sourceRef: at('art-event.js', keyLine('art-event.js', id, 'const ZCOST = {', 'const zcache'), `ZCOST.${id}`), notes: 'raid zombie costume layer (PX.eventZombie); PX.eventCostumes(kind) picks the ones that fit each zombie' }));

// ---------- elements ----------
const ELS = Object.keys(D.ELEMENT_INFO);
const EL_FX = trySlice('art-core.js EL_FX', () => { const t = src(CORE), a = t.indexOf('const EL_FX = {'), b = t.indexOf('function elDetails('); return [...t.slice(a, b).matchAll(/^ {4}(\w+)\(/gm)].map(m => m[1]); }, []);
for (const el of ELS) {
  const line = keyLine(CORE, el, 'const EL_FX = {', 'function elDetails('), empty = el === 'normal' && /normal\(\) \{\}/.test(src(CORE));
  if (!EL_FX.includes(el)) warn(`element ${el}: no topper in art-core.js EL_FX`);
  row('element-topper', el, Object.assign({}, OVERLAY, { name: D.ELEMENT_INFO[el].name, assetPath: otherPath('element-topper', el), sourceRef: at(CORE, line, `EL_FX.${el}`),
    notes: (empty ? 'EL_FX.normal draws nothing: a Normal plant is shown by its palette only (EL_PAL.normal). ' : '') + 'big topper above the head, or a small floating badge when the plant also wears a fusion; plus elDetails() sparkles and the EL_PAL recolour',
    paletteRef: at(CORE, keyLine(CORE, el, 'const EL_PAL = {', 'const PLANT_PAL'), `EL_PAL.${el}`) }));
  const sp = defRef('ELEMENT_SPRITE', el);
  for (let f = 0; f < 3; f++) {
    const c = safeDraw(`element creature ${el} ${f}`, () => PX.critter('el:' + el, f));
    row('element-creature', el, Object.assign({ frame: f, pose: 'frame' + f, name: D.ELEMENT_INFO[el].sprite, assetPath: otherPath('element-creature', `${el}-f${f}`), sourceRef: sp ? sp.ref : null,
      notes: 'garden visitor (PX.critter(\'el:' + el + '\', frame)); PX.critterSwim makes the swimming top-60% copy from it' }, measured(c, { anchor: 'bottom' })));
  }
  const sh = safeDraw(`shard ${el}`, () => PX.item('shard', el)), co = safeDraw(`core ${el}`, () => PX.item('core', el));
  row('shard', el, Object.assign({ name: `${D.ELEMENT_INFO[el].name} shard`, assetPath: otherPath('shard', el), sourceRef: at(CORE, markerLine(CORE, 'function shardGrid('), 'shardGrid() (PX.item \'shard\')'),
    notes: 'tiny copy of the element creature; also drawn as pieces \'shard\' <el>:0..3 (3 shards = 1 core)' }, measured(sh)));
  row('core', el, Object.assign({ name: `${D.ELEMENT_INFO[el].name} core`, assetPath: otherPath('core', el), sourceRef: at('art-world.js', markerLine('art-world.js', 'function ELEMENT_CORE'), 'ELEMENT_CORE() (PX.item \'core\')') }, measured(co)));
}
for (const el of Object.keys(D.ELEMENTS)) {
  const ic = safeDraw(`element icon ${el}`, () => PX.item('element', el)), r = defRef('ELEMENT_ICON', el);
  row('element-icon', el, Object.assign({ name: D.ELEMENTS[el].label, assetPath: otherPath('element-icon', el), sourceRef: r ? r.ref : null, notes: 'battle type badge (PX.item \'element\')' }, measured(ic)));
}

// ---------- fruit and seed packets ----------
const FRUIT2 = trySlice('art-core.js FRUIT2', () => { const t = src(CORE), a = t.indexOf('const FRUIT2 = {'), b = t.indexOf('function shardGrid('); return [...t.slice(a, b).matchAll(/^ {4}(\w+)\(g/gm)].map(m => m[1]); }, []);
for (const [id, F] of Object.entries(D.FRUITS)) {
  const c = safeDraw(`fruit ${id}`, () => PX.item('fruit', id)), mine = FRUIT2.includes(id);
  const line = mine ? keyLine(CORE, id, 'const FRUIT2 = {', 'function shardGrid(') : keyLine('pixel.js', id, 'const FRUIT_ART = {');
  row('fruit', id, Object.assign({ name: F.name, assetPath: otherPath('fruit', id), sourceRef: mine ? at(CORE, line, `FRUIT2.${id}`) : at('pixel.js', line, `FRUIT_ART.${id}`), notes: 'icon; also hangs on garden fruit trees and lies on the lawn' }, measured(c, { anchor: 'bottom' })));
}
const evSeed = find('event.js', /D\.SEEDS\.hjack = /);
for (const id of Object.keys(D.SEEDS).concat(evSeed && !D.SEEDS.hjack ? ['hjack'] : [])) {
  const c = safeDraw(`seed packet ${id}`, () => PX.item('egg', id + ':peashooter')), ev = id === 'hjack';
  row('seed-packet', id, Object.assign({ name: ev ? 'Jack-o\'-Lantern Seed Packet' : D.SEEDS[id].name, assetPath: otherPath('seed-packet', id),
    sourceRef: ev ? at('art-event.js', markerLine('art-event.js', 'function packet()'), 'packet() (Halloween)') : at(CORE, markerLine(CORE, 'function seedPacket('), 'seedPacket()'),
    notes: (ev ? `event packet: event.js:${evSeed.line} adds D.SEEDS.hjack at runtime. ` : '') + 'the window shows a half-size copy of the plant (art-core.js miniPlant), so it is derived from the plant art', skin: ev ? 'hjack' : D.SEEDS[id].skin || null }, measured(c)));
}

// ---------- battle effects ----------
const AN = trySlice('battle.js ANIM', () => sliceEval('battle.js', 'const ANIM = {', 'function animOf(', '({ ANIM, SUPPORT, ANIM_BY_EL })'), null);
if (AN) {
  const { ANIM, SUPPORT, ANIM_BY_EL } = AN.value, styles = {};
  const add = (s, mv, o, via) => { const e = styles[s] = styles[s] || { moves: new Set(), sprites: new Set(), via: new Set() }; if (mv) e.moves.add(mv); if (o) e.sprites.add(o); e.via.add(via); };
  for (const [mv, a] of Object.entries(ANIM)) add(a.s, mv, a.o, 'ANIM');
  for (const [s, list] of Object.entries(SUPPORT)) for (const mv of list) add(s, mv, null, 'SUPPORT');
  for (const [el, a] of Object.entries(ANIM_BY_EL)) add(a.s, null, a.o, 'ANIM_BY_EL.' + el);
  add('power', null, null, 'animOf() default for other non-damaging moves');
  for (const [s, e] of Object.entries(styles)) {
    const h = find('battle.js', new RegExp(`case '${esc(s)}'`), 'function animMove(', 'function animSupport(') || find('battle.js', new RegExp(`case '${esc(s)}'`), 'function animSupport(', '// debug: play one move');
    const dflt = !h && find('battle.js', /^[ \t]+default: fxPush\(\{ k: 'charge'/m, 'function animSupport(');
    row('effect-style', s, Object.assign({}, scene, { name: s, sourceRef: h ? at('battle.js', h.line, `case '${s}' (${h.idx > src('battle.js').indexOf('function animSupport(') ? 'animSupport' : 'animMove'})`) : dflt ? at('battle.js', dflt.line, 'animSupport() default branch') : at('battle.js', AN.line, 'ANIM'),
      notes: 'battle move animation style (code-drawn motion + the projectile sprites listed)', moves: e.moves.size, projectileSprites: [...e.sprites], definedVia: [...e.via] }));
  }
}
const ASPR = trySlice('battle.js aspr', () => { const t = src('battle.js'), a = t.indexOf('function aspr(k)'), b = t.indexOf('const ROT = {}', a); return [...new Set([...t.slice(a, b).matchAll(/case '([a-z0-9]+)'/g)].map(m => m[1]))]; }, []);
for (const id of ASPR) { const h = find('battle.js', new RegExp(`case '${esc(id)}'`), 'function aspr(k)', 'const ROT = {}');
  row('effect-sprite', id, Object.assign({}, scene, { name: id, assetPath: otherPath('effect-sprite', id), sourceRef: at('battle.js', h && h.line, `aspr('${id}')`), notes: 'projectile / effect sprite built inside battle.js (also used by the Garden raids and Survival); size set in the case' })); }

// ---------- garden themes, houses, props ----------
const THM = trySlice('garden.js THM', () => sliceEval('garden.js', 'const cluster = ', 'for (const [id, th] of Object.entries(PX.GARDEN_MAPS', 'THM', { PX, D, Math }), { value: {}, line: null });
const themeOf = id => THM.value[id] || (PX.GARDEN_MAPS || {})[id] || null;
const propKeys = new Set(Object.keys(PX.PVZ_PROP || {}).concat(Object.keys(PX.PVZ_HOME || {})));
// pixel.js prop() still draws ids that have no PVZ_PROP entry: its chibi PROP2 table, then the old Solunar switch
const PROP2 = trySlice('pixel.js PROP2', () => { const t = src('pixel.js'), a = t.indexOf('const PROP2 = {'), b = t.indexOf('function prop(kind, theme)', a); return [...t.slice(a, b).matchAll(/^ {4}([a-z0-9]+): \{ w:/gm)].map(m => m[1]); }, []);
const OLDPROP = trySlice('pixel.js prop()', () => { const t = src('pixel.js'), a = t.indexOf('function prop(kind, theme)'), b = t.indexOf('const artW = c =>', a); return [...t.slice(a, b).matchAll(/case '([a-z0-9]+)'/g)].map(m => m[1]); }, []);
const LEGACY = new Set(PROP2.concat(OLDPROP));
// the theme fields garden.js really draws as props: props / fruitTrees ([kind, x, y]), tree and mower (garden.js layout).
// (th.home[0] is only a label: the home is drawn by PX.pvzHouse(th.facade))
const propUse = {};
function walkProps(th, map) {
  const kinds = [th.tree, th.mower].concat((th.props || []).map(p => p && p[0]), (th.fruitTrees || []).map(p => p && p[0]));
  for (const v of kinds) if (typeof v === 'string' && (propKeys.has(v) || LEGACY.has(v))) (propUse[v] = propUse[v] || new Set()).add(map);
}
for (const id of D.MAP_ORDER) {
  const GM = D.GARDEN_MAPS[id], th = themeOf(id); if (th) walkProps(th, id);
  const own = THM.value[id] ? at('garden.js', keyLine('garden.js', id, 'const THM = {', 'for (const [id, th] of Object.entries(PX.GARDEN_MAPS'), `THM.${id}`) : (defRef('GARDEN_MAPS', id) || {}).ref;
  if (!th) warn(`garden map ${id}: no theme (garden.js THM / PX.GARDEN_MAPS)`);
  row('garden-theme', id, Object.assign({}, scene, { name: GM.name, sourceRef: own || null,
    notes: 'scene art, sized to the screen: sky, far hills, checker lawn, fence, pond, path, mowers, props and the corner house drawn in code',
    theme: GM.theme, style: th && th.style, fence: th && th.fence, mower: th && th.mower, tree: th && th.tree, home: GM.home, houseKind: th && th.facade && th.facade.kind,
    drawnBy: [fnRef('garden.js', 'paintSky'), fnRef('garden.js', 'paintLand'), fnRef('garden.js', 'drawWater'), fnRef('survival.js', 'paintBg'), fnRef('adventure.js', 'paintWorld')].filter(Boolean),
    dataRef: at('data.js', keyLine('data.js', id, 'const GARDEN_MAPS = {', 'const MAP_ORDER') || (find('data.js', new RegExp(`GARDEN_MAPS\\.${esc(id)} = `)) || {}).line, `D.GARDEN_MAPS.${id}`) }));
  if (th && th.facade) {
    const kind = th.facade.kind, c = safeDraw(`house ${id}`, () => PX.pvzHouse(th.facade));
    const wf = ['art-world2.js', 'art-world3.js'].map(f => [f, find(f, new RegExp(`HOUSE\\.${esc(kind)} = `))]).find(x => x[1]);
    row('house', id, Object.assign({ name: `${GM.name} house (${kind})`, assetPath: otherPath('house', id),
      sourceRef: wf ? at(wf[0], wf[1].line, `HOUSE.${kind} (PX.pvzHouse wrapper)`) : at(CORE, markerLine(CORE, 'PX.pvzHouse = function'), `PX.pvzHouse('${kind}')`),
      notes: 'the corner house of the garden, front facing (its door is the entrance; resting plants live in it); colours from the theme\'s facade', houseKind: kind }, measured(c, { anchor: 'bottom' })));
  }
}
// a prop is also used when a scene file names it in quotes (garden.js draws pots, graves and mowers itself, battle.js / race.js borrow some)
const SCENE_FILES = page.filter(f => /\.js$/.test(f) && !/^(art-|pixel\.js$|data\.js$|version\.js$|audio\.js$)/.test(f));
const sceneText = f => { const t = src(f); if (f !== 'garden.js') return t; const a = t.indexOf('const THM = {'), b = t.indexOf('for (const [id, th] of Object.entries(PX.GARDEN_MAPS', a); return a < 0 || b < 0 ? t : t.slice(0, a) + t.slice(b); };
const quotedIn = k => SCENE_FILES.filter(f => new RegExp(`['"]${esc(k)}['"]`).test(sceneText(f)));
const gaps = [];
for (const k of [...new Set([...propKeys, ...Object.keys(propUse)])].sort()) {
  const home = PX.PVZ_HOME && PX.PVZ_HOME[k], prop = PX.PVZ_PROP && PX.PVZ_PROP[k], r = prop ? defRef('PVZ_PROP', k) : home ? defRef('PVZ_HOME', k) : null;
  const c = safeDraw(`prop ${k}`, () => PX.prop(k, 'day'));
  const legacy = !prop && !home, in2 = PROP2.includes(k);
  const lline = legacy ? (in2 ? keyLine('pixel.js', k, 'const PROP2 = {', 'function prop(kind, theme)') : (find('pixel.js', new RegExp(`case '${esc(k)}'`), 'function prop(kind, theme)') || {}).line) : null;
  const themes = propUse[k] ? [...propUse[k]] : [], scenes = quotedIn(k), used = themes.length > 0 || scenes.length > 0;
  if (!used) gaps.push({ kind: 'unused-art', id: `prop:${k}`, detail: `${r ? r.ref : k} is drawn by the art code but no garden theme or scene file uses it` });
  row('prop', k, Object.assign({ name: k, assetPath: otherPath('prop', k), sourceRef: r ? r.ref : at('pixel.js', lline, `${in2 ? 'PROP2.' + k : `prop('${k}') switch`} (no PVZ_PROP entry)`),
    notes: [home ? 'rest house (PVZ_HOME): door / window positions in its entry' : '', legacy ? 'drawn by pixel.js prop() (no PVZ_PROP entry)' : '', used ? '' : 'NOT USED anywhere in the game', 'tinted per theme (PX.prop(kind, theme))'].filter(Boolean).join('; '),
    usedByThemes: themes, usedInScenes: scenes, reachable: used, kind: home ? 'home' : legacy ? 'legacy-prop' : 'prop' }, measured(c, { anchor: 'bottom' })));
}

// ---------- Survival and Adventure ----------
for (const M of D.SURVIVAL) {
  const d = find('data.js', new RegExp(`SV\\('${esc(M.id)}'`));
  row('survival-map', M.id, Object.assign({}, scene, { name: M.name, sourceRef: at('data.js', d && d.line, `D.SURVIVAL ${M.id}`),
    notes: 'lane-defense lawn drawn from the garden map theme (survival.js themeFor() reads PS.gardenMaps = garden.js THM)', gardenMap: M.map, boss: M.boss, rewardPlant: M.reward, waves: M.waves,
    drawnBy: [fnRef('survival.js', 'paintBg'), fnRef('survival.js', 'paintFence'), fnRef('survival.js', 'drawProps')].filter(Boolean) }));
}
const WORLDS = trySlice('adventure.js WORLDS', () => sliceEval('adventure.js', 'const WORLDS = [', 'const PER = ', 'WORLDS'), { value: [], line: null });
const PER = +((find('adventure.js', /const PER = (\d+)/) || { m: [0, 0] }).m[1]);
const AWH = find('adventure.js', /const AW = (\d+), AH = (\d+)/);
for (const W of WORLDS.value) row('adventure-world', W.id, { name: W.name, sourceRef: at('adventure.js', keyLine('adventure.js', W.id, 'const WORLDS = [', 'const PER = ') || find('adventure.js', new RegExp(`id: '${esc(W.id)}'`), 'const WORLDS = [').line, `WORLDS ${W.id}`),
  nativeW: AWH ? +AWH.m[1] * 2 : null, nativeH: AWH ? +AWH.m[2] * 2 : null, renderScale: null,
  notes: `world-map panel (adventure.js paintWorld, ${AWH ? AWH.m[1] + 'x' + AWH.m[2] : '?'} world px at SCENE_K); levels are Survival matches drawn with the world's garden map`,
  gardenMap: W.map, survivalMap: W.sv, boss: W.boss, rewardPlant: W.plant, levels: PER, drawnBy: [fnRef('adventure.js', 'paintWorld')].filter(Boolean) });

// ---------- Battle arenas (leagues and cups) ----------
const LEAGUE_AREA = trySlice('battle.js LEAGUE_AREA', () => sliceEval('battle.js', 'const LEAGUE_AREA = {', 'const FXEL = {', 'LEAGUE_AREA'), { value: {}, line: null });
const BTHEMES = trySlice('battle.js THEMES', () => { const t = src('battle.js'), a = t.indexOf('const THEMES = {'), b = t.indexOf('const SKY = {}', a); return [...new Set([...t.slice(a, b).matchAll(/^ {4}([a-z]+): \{ sky:|THEMES\.([a-z]+) = /gm)].map(m => m[1] || m[2]))]; }, []);
const arenaRef = a => { const h = find('battle.js', new RegExp(`^ {4}${esc(a)}: \\{|THEMES\\.${esc(a)} = `, 'm'), 'const THEMES = {', 'const SKY = {}'); return h ? at('battle.js', h.line, `THEMES.${a}`) : null; };
for (const [type, list] of [['battle-league', D.LEAGUES], ['plant-cup', D.PLANT_LEAGUES]]) for (const L of list) {
  const area = LEAGUE_AREA.value[L.id] || 'frontyard', known = BTHEMES.includes(area);
  if (!known) warn(`${type} ${L.id}: arena "${area}" has no battle.js THEMES entry (drawBg falls back to meadow)`);
  if (!LEAGUE_AREA.value[L.id]) gaps.push({ kind: 'fallback-art', id: `arena:${L.id}`, detail: `${type} "${L.id}" has no battle.js LEAGUE_AREA entry, so it borrows the frontyard arena (battle.js:${markerLine('battle.js', "launch({ mode: 'league'") || '?'})` });
  const d = find('data.js', new RegExp(`id: '${esc(L.id)}'`), type === 'battle-league' ? 'const LEAGUES = [' : 'const PLANT_LEAGUES = [');
  row(type, L.id, Object.assign({}, scene, { name: L.name, sourceRef: at('data.js', d && d.line, `${type === 'battle-league' ? 'D.LEAGUES' : 'D.PLANT_LEAGUES'} ${L.id}`),
    notes: `arena backdrop drawn in code by battle.js drawBg() from THEMES["${area}"] (LEAGUE_AREA["${L.id}"]${LEAGUE_AREA.value[L.id] ? '' : ' missing: launch() falls back to frontyard'})`,
    arena: area, arenaRef: arenaRef(area), opponents: (L.opponents || []).length, drawnBy: [fnRef('battle.js', 'drawBg')].filter(Boolean) }));
}

// ---------- Race scenery ----------
const RTH = trySlice('race.js TH', () => { const t = src('race.js'), a = t.indexOf('const TH = {'), b = t.indexOf('for (const [k, th] of Object.entries(PX.RACE_MAPS', a); return [...new Set([...t.slice(a, b).matchAll(/^ {4}([a-z]+): \{ prop:|TH\.([a-z]+) = /gm)].map(m => m[1] || m[2]))]; }, []);
const SERIES = trySlice('race.js series', () => sliceEval('race.js', 'const EXTRA_RACES = [', 'const PLANT_WIN_PRIZE', '[].concat(EXTRA_RACES, MORE_RACES, PLANT_RACES)', { PX: { RACE_MAPS: PX.RACE_MAPS } }).value, []);
const allRaces = D.RACES.concat(SERIES), raceUse = {};
for (const R of allRaces) (raceUse[R.area] = raceUse[R.area] || []).push(R.id);
for (const k of [...new Set([...RTH, ...Object.keys(PX.RACE_MAPS || {}), ...Object.keys(raceUse)])]) {
  const inRace = RTH.includes(k), rm = defRef('RACE_MAPS', k), h = inRace ? find('race.js', new RegExp(`^ {4}${esc(k)}: \\{ prop:|TH\\.${esc(k)} = `, 'm'), 'const TH = {') : null;
  if (!inRace && !rm) warn(`race scenery ${k}: used by ${raceUse[k]} but defined nowhere`);
  const fallback = !raceUse[k] && inRace;
  row('race-scenery', k, Object.assign({}, scene, { name: k, sourceRef: h ? at('race.js', h.line, `TH.${k}`) : rm ? rm.ref : null,
    notes: 'side-scrolling parallax course scenery (sky, far / near layers, track, water, props) drawn in code' + (fallback ? '; no race uses it while PX.RACE_MAPS is loaded (fallback scenery in race.js EXTRA_RACES)' : ''),
    usedByRaces: raceUse[k] || [], reachable: !fallback, drawnBy: [fnRef('race.js', 'drawWorld')].filter(Boolean) }));
}

// ---------- Arcade, trophies ----------
const GAMES = trySlice('arcade.js GAMES', () => sliceEval('arcade.js', 'const GAMES = [', 'const LV = {', 'GAMES').value, []);
const clawDef = trySlice('arcade.js CLAW_DEF', () => { const h = find('arcade.js', /const CLAW_DEF = (\{[^\n]*\});/); return vm.runInNewContext('(' + h.m[1] + ')'); }, null);
const MODS = trySlice('arcade.js MODS', () => Object.fromEntries([...find('arcade.js', /const MODS = \{([^}]*)\}/).m[1].matchAll(/(\w+): (\w+)/g)].map(m => [m[1], m[2]])), {});
for (const G of GAMES.concat(clawDef ? [clawDef] : [])) {
  const mod = MODS[G.id], decl = mod ? find('arcade.js', new RegExp(`const ${esc(mod)} = \\{`)) : null, dr = decl ? find('arcade.js', /^ {4}draw\(g\) \{/m, `const ${mod} = {`) : null;
  row('arcade-game', G.id, Object.assign({}, scene, { name: G.name, sourceRef: decl ? at('arcade.js', decl.line, `${mod} (game module)`) : null,
    notes: `board drawn in code: ${mod || '?'}.draw(g)${dr ? ' at arcade.js:' + dr.line : ''}, background via paintBg(); ${G.claw ? 'the Claw Machine cabinet is clawCab()' : 'Levels 1-3 (LV table)'}`,
    drawnBy: [fnRef('arcade.js', 'paintBg'), fnRef('arcade.js', 'render'), G.claw ? fnRef('arcade.js', 'clawCab') : null].filter(Boolean) }));
}
for (const k of Object.keys(PX.arcade || {}).filter(k => typeof PX.arcade[k] === 'function')) {
  const c = k === 'plush' ? null : safeDraw(`arcade sprite ${k}`, () => PX.arcade[k]()), h = find('art-arcade.js', new RegExp(`function ${esc(k)}\\(`));
  row('arcade-sprite', k, Object.assign({ name: k, assetPath: otherPath('arcade-sprite', k), sourceRef: at('art-arcade.js', h && h.line, `PX.arcade.${k}()`),
    notes: k === 'plush' ? 'plushie made from a plant / zombie sprite (derived art)' : k === 'vase' ? `vase kinds: ${(PX.arcade.KINDS || []).join(', ')}` : 'arcade game piece (default variant measured)' }, c && c.width ? measured(c, { anchor: 'bottom' }) : {}));
}
// every league, cup and Zomboss should have a trophy (battle.js trophies() lists them all; a missing one leaves a blank canvas)
for (const [pre, ids, what] of [['l-', D.LEAGUES.map(L => L.id), 'league'], ['c-', D.PLANT_LEAGUES.map(L => L.id), 'plant cup'], ['z-', bossIds, 'Zomboss']]) for (const id of ids)
  if (!(PX.TROPHY_IDS || []).includes(pre + id)) gaps.push({ kind: 'missing-art', id: `trophy:${pre}${id}`, detail: `${what} "${id}" has no trophy in art-trophies.js (PX.trophy returns null; battle.js:${markerLine('battle.js', "canvas[data-trophy]") || '?'} then leaves the canvas blank)` });
for (const id of PX.TROPHY_IDS || []) {
  const c = safeDraw(`trophy ${id}`, () => PX.trophy(id, 1)), m = measured(c, { k: 2 });
  row('trophy', id, Object.assign({ name: id, assetPath: otherPath('trophy', id), sourceRef: at('art-trophies.js', markerLine('art-trophies.js', 'const SPEC = {}'), `SPEC['${id}'] (${id[0] === 'l' ? 'league cup' : id[0] === 'c' ? 'plant cup pot' : 'Zomboss medal'})`),
    notes: 'PX.trophy(id, scale, { dim }) returns a new 24x24-art-px canvas (no .k tag) times a whole scale' }, m));
}

// ---------- My Aquarium ----------
const A = D.AQUA;
for (const [id, F] of Object.entries(A.FISH)) {
  const c = safeDraw(`fish ${id}`, () => PX.aquaSprite('fish', id, 0)), r = defRef('FISH_ART', id), d = find('data.js', new RegExp(`^[ \\t]*${esc(id)}: AF\\(`, 'm'), 'const AQUA = {');
  if (!r) warn(`fish ${id}: no PX.FISH_ART entry`);
  const variants = Object.keys(PX.FISH_ART || {}).filter(k => k.startsWith(id + ':'));
  row('fish', id, Object.assign({ name: F.name, assetPath: otherPath('fish', id), sourceRef: r ? r.ref : null, notes: `2 swim frames (PX.aquaSprite('fish', id, f))${variants.length ? '; extra looks: ' + variants.join(', ') : ''}`,
    rarity: F.rarity, swim: F.swim, frames: 2, dataRef: d ? at('data.js', d.line, `D.AQUA.FISH.${id}`) : null }, measured(c)));
}
for (const [id, I] of Object.entries(A.DECOR)) {
  const c = safeDraw(`decor ${id}`, () => PX.aquaSprite('decor', id, 0)), r = defRef('DECOR_ART', id);
  if (!r) warn(`aquarium decoration ${id}: no PX.DECOR_ART entry`);
  row('aqua-decor', id, Object.assign({ name: I.name, assetPath: otherPath('aqua-decor', id), sourceRef: r ? r.ref : null, notes: I.anim ? `animated (${I.anim}), 2 frames` : 'still', rarity: I.rarity }, measured(c, { anchor: 'bottom' })));
}
for (const [id, B] of Object.entries(A.BACKDROPS)) { const r = defRef('AQUA_BACKDROP', id);
  row('aqua-backdrop', id, Object.assign({}, scene, { name: B.name, sourceRef: r ? r.ref : null, notes: 'tank backdrop drawn to the tank size (PX.aquaBackdrop(id, w, h)); aquarium.js paintBg() / drawGlass()', drawnBy: [fnRef('aquarium.js', 'paintBg'), fnRef('aquarium.js', 'drawGlass')].filter(Boolean) })); }
for (const [id, S] of Object.entries(A.SANDS)) { const r = defRef('AQUA_SAND', id);
  row('aqua-sand', id, Object.assign({}, scene, { name: S.name, sourceRef: r ? r.ref : null, notes: 'sand colours (ramp + dots), painted by aquarium.js paintBg()' })); }

// ---------- characters outside the tables, Halloween items ----------
if (PX.crazyDave) for (let f = 0; f < 2; f++) { const c = safeDraw(`Crazy Dave ${f}`, () => PX.crazyDave(f));
  row('npc', 'crazydave', Object.assign({ frame: f, pose: 'frame' + f, name: 'Crazy Dave', assetPath: otherPath('npc', `crazydave-f${f}`), sourceRef: at('art-world.js', markerLine('art-world.js', 'PX.crazyDave = function'), 'PX.crazyDave(frame)'), notes: 'the rescue neighbour in Garden zombie raids' }, measured(c, { anchor: 'bottom' }))); }
if (PX.eventArt) for (const k of ['candy', 'bag', 'jack', 'packet', 'patch', 'grave', 'bat']) if (typeof PX.eventArt[k] === 'function') {
  const c = safeDraw(`event item ${k}`, () => PX.eventArt[k](0)), h = find('art-event.js', new RegExp(`function ${esc(k)}\\(`));
  row('event-item', k, Object.assign({ name: k, assetPath: otherPath('event-item', k), sourceRef: at('art-event.js', h && h.line, `${k}()`), notes: 'Halloween event art (PX.eventArt)' + (k === 'candy' ? '; 4 colours' : k === 'jack' ? '; lit / unlit' : k === 'bat' ? '; flapping frames' : '') }, measured(c, { anchor: 'bottom' })));
}

// ---------- UI ----------
const html = src('index.html');
const icon = trySlice('app.js icon()', () => { const t = src('app.js'), a = t.indexOf('function icon(kind) {'), b = t.indexOf('\n  function paint(', a); return vm.runInContext(`(function () {\n${t.slice(a, b)}\nreturn icon; })()`, sb); }, null);
const iconLine = markerLine('app.js', 'function icon(kind) {');
for (const m of html.matchAll(/<button data-go="(\w+)"[^>]*>.*?<span>([^<]+)<\/span>/g)) {
  const c = icon ? safeDraw(`nav icon ${m[1]}`, () => icon(m[1])) : null;
  row('ui-tab', m[1], Object.assign({ name: m[2], assetPath: otherPath('ui-tab', m[1]), sourceRef: at('app.js', iconLine, `icon('${m[1]}')`), notes: `nav button (index.html:${lineOfIdx('index.html', m.index)}); painted by app.js:${markerLine('app.js', "paint(b.querySelector('canvas'), icon(b.dataset.go))")}; colour --nav-c in app.css` }, measured(c)));
}
const cssOf = { garden: ['garden.js', 'g-style'], race: ['race.js', 'r-style'], battle: ['battle.js', 'b-style'], survival: ['survival.js', 'sv-style'], arcade: ['arcade.js', 'ar-style'], adventure: ['adventure.js', 'av-style'], shop: ['shop.js', 'sh-css'], sprouts: ['sprouts.js', 'sp-css'], aquarium: ['aquarium.js', 'aq-style'] };
for (const m of html.matchAll(/<section class="screen" id="(scr-\w+)" data-screen="(\w+)"/g)) {
  const [file, cssId] = cssOf[m[2]] || [m[2] + '.js', null], sc = find(file, new RegExp(`^[ \\t]+PS\\.scenes\\.${esc(m[2])} = `, 'm'));
  row('ui-screen', m[2], Object.assign({}, scene, { name: m[2], sourceRef: at(file, sc && sc.line, `PS.scenes.${m[2]}`),
    notes: `#${m[1]} (index.html:${lineOfIdx('index.html', m.index)}); scene CSS injected from ${file}${cssId ? ` (#${cssId}, line ${markerLine(file, cssId) || '?'})` : ''}; screen colours --mode/--bg1/--bg2 in app.css (#${m[1]})` }));
}
const chrome = [
  ['title-menu', 'Title screen / player select', 'menu.js', 'PS.ui.mainMenu = open', 'yard scene drawn by menu.js drawBg(); player cards look like seed packets; CSS injected at menu.js:17'],
  ['hud', 'Top bar (player chip, goal chip, clock and coin pills)', 'index.html', '<header id="hud">', 'pill icons painted by app.js icon(\'coin\'|\'sun\'|\'moon\')'],
  ['nav', 'Bottom tab bar', 'index.html', '<nav id="nav"', 'one column per tab (app.css --nav-n)'],
  ['modal', 'Pop-up cards (PS.ui.modal)', 'app.js', 'function modal(opts)', 'mint card on a darker backdrop with a round X close badge (app.css .modal-*, .overlay)'],
  ['toast', 'Toast message', 'index.html', 'id="toast"', ''],
  ['boot-splash', 'Loading splash', 'index.html', 'id="bootSplash"', 'inline SVG sun + inline styles in index.html'],
  ['celebrate', 'Celebration overlay (PS.ui.celebrate)', 'app.js', 'function celebrate(o)', 'rays, confetti, reward tiles'],
  ['wipe', 'Screen wipe transition (PS.ui.wipe)', 'app.js', 'function wipe(kind, mid)', ''],
  ['evolution', 'Evolution scene', 'app.js', 'function showEvolution(', 'sizes sprites with crispScale / hdFit (const evoWant)'],
];
for (const [id, name, file, marker, note] of chrome) row('ui-screen', id, Object.assign({}, scene, { name, sourceRef: at(file, markerLine(file, marker), marker.replace(/[<>"]/g, '')), notes: note }));

// ---------------- counts, checks, write ----------------
const counts = {};
for (const a of assets) { const c = counts[a.type] = counts[a.type] || { assets: 0, entities: new Set() }; c.assets++; c.entities.add(a.entityId + (a.table === 'PX.SKIN_IDS' ? ':solunar' : '')); }
for (const c of Object.values(counts)) c.entities = c.entities.size;
counts.plant.looks = plantLooks;
counts['adventure-world'].levels = WORLDS.value.length * PER;
counts.skin.reachable = assets.filter(a => a.type === 'skin' && a.reachable).length;
// how the current characters sit in their canvases (idle pose; every Zomboss frame): edges touched, sizes, the row the feet end on
function boundsSummary(type, size) {
  const rows = assets.filter(a => a.type === type && a.currentBounds && (type === 'boss' || a.pose === 'idle'));
  const stat = list => list.length ? { min: Math.min(...list), max: Math.max(...list), mean: +(list.reduce((x, y) => x + y, 0) / list.length).toFixed(1) } : null;
  const name = a => a.entityId + (a.stage != null ? ':s' + a.stage : '') + (a.frame != null ? ':f' + a.frame : '');
  const s = { canvas: `${size}x${size}`, measured: rows.length, width: stat(rows.map(a => a.currentBounds.w)), height: stat(rows.map(a => a.currentBounds.h)),
    touchTop: rows.filter(a => a.currentBounds.minY === 0).map(name), touchBottom: rows.filter(a => a.currentBounds.maxY === size - 1).map(name),
    touchLeft: rows.filter(a => a.currentBounds.minX === 0).map(name), touchRight: rows.filter(a => a.currentBounds.maxX === size - 1).map(name), lowestRow: {} };
  for (const a of rows) s.lowestRow[a.currentBounds.maxY] = (s.lowestRow[a.currentBounds.maxY] || 0) + 1;
  if (type === 'plant') s.heightByStage = [0, 1, 2].map(st => stat(rows.filter(a => a.stage === st).map(a => a.currentBounds.h)));
  return s;
}
const currentBoundsSummary = { plant: boundsSummary('plant', LOG.w), zombie: boundsSummary('zombie', LOG.w), boss: boundsSummary('boss', BOSS_LOG) };
for (const [k, list] of Object.entries(orphans)) for (const id of list) gaps.push({ kind: 'unused-art', id: `${k}:${id}`, detail: `PX.${k} has "${id}" but the game data has no such id` });
const BRIEF = { plant: 141, zombie: 81, boss: 12, 'costume-item': 26, 'garden-theme': 16, 'survival-map': 16, 'battle-league': 29, 'plant-cup': 11, fish: 31, 'aqua-decor': 22 };
const checks = Object.entries(BRIEF).map(([t, n]) => ({ type: t, expected: n, found: counts[t] ? counts[t].entities : 0, ok: !!counts[t] && counts[t].entities === n }));
checks.push({ type: 'adventure levels', expected: 40, found: WORLDS.value.length * PER, ok: WORLDS.value.length * PER === 40 });
checks.push({ type: 'plant rows (141 x 3 x 8)', expected: 141 * 3 * 8, found: counts.plant.assets, ok: counts.plant.assets === 141 * 3 * 8 });
checks.push({ type: 'zombie rows (81 x 5)', expected: 81 * 5, found: counts.zombie.assets, ok: counts.zombie.assets === 81 * 5 });
checks.push({ type: 'boss rows (12 x 2)', expected: 24, found: counts.boss.assets, ok: counts.boss.assets === 24 });

let head = null, branch = null, dirty = [], untracked = [];
try { head = git('rev-parse', '--short', REF || 'HEAD').trim(); branch = git('rev-parse', '--abbrev-ref', 'HEAD').trim(); } catch (e) { /* not a git folder */ }
if (!REF) try { for (const l of git('status', '--porcelain').split('\n').filter(Boolean)) { const f = l.slice(3); if (l.startsWith('??')) untracked.push(f); else dirty.push(f); } } catch (e) { /* no git */ }
const ver = (() => { try { const m = /PVZG_VERSION\s*=\s*'([^']+)'/.exec(src('version.js')); return m && m[1] !== 'dev' ? m[1] : null; } catch (e) { return null; } })();
const manifest = {
  schema: 'pvz-garden-art/v2',
  generated: new Date().toISOString(),
  sourceBuild: ver || FALLBACK_BUILD,
  source: { dir: 'pvz-garden', read: REF ? `git ${REF}` : 'working tree', gitHead: head, branch, modifiedTrackedFiles: dirty, untrackedFiles: untracked, scriptsLoaded: loaded,
    note: ver ? 'sourceBuild read from version.js' : 'version.js says "dev" (source), so sourceBuild is the published build of branch main' },
  grid: {
    engine: ENGINE,
    character: { logicalW: LOG.w, logicalH: LOG.h, frameW: FRAME, frameH: FRAME, renderScale: SCALE, anchorX: LOG.ax, anchorY: LOG.ay, frameBaseY: LOG.ay * SCALE, frameCenterX: LOG.ax * SCALE, facing: 'right',
      note: `the engine's fine grid: a ${PX.SPRIG_W}x${PX.SPRIG_H} art-px Grid at Grid.K = ${PX.Grid.K}; scenes blit sprites at SPRIG_AX/AY (${PX.SPRIG_AX}, ${PX.SPRIG_AY}) art px, so anchorY ${LOG.ay} is the TOP edge of logical row ${LOG.ay}: today's feet fill rows ${LOG.ay}-${LOG.h - 1} (see currentBoundsSummary.lowestRow)` },
    boss: { logicalW: BOSS_LOG, logicalH: BOSS_LOG, frameW: BOSS_FRAME, frameH: BOSS_FRAME, renderScale: SCALE, anchorX: BOSS_ANCHOR.x, anchorY: BOSS_ANCHOR.y, frames: 2, note: '48x48 art px BOSS_ART grids at K 2; anchor proposed (see boss rows)' },
    sheets: { plant: { w: 4 * FRAME, h: 2 * FRAME, cols: 4, rows: 2, poses: POSES.plant }, zombie: { w: 3 * FRAME, h: 2 * FRAME, cols: 3, rows: 2, poses: POSES.zombie, emptyCell: { col: 2, row: 1 } },
      boss: { w: 2 * BOSS_FRAME, h: BOSS_FRAME, cols: 2, rows: 1, frames: [0, 1] } },
    paths: { plant: 'art-export/plants/<id>/stage-<0|1|2>.png', zombie: 'art-export/zombies/<id>.png', boss: 'art-export/bosses/<id>.png', other: 'art-export/<type>/<id>.png (proposed; not fixed by the plan yet)', root: 'pvz-garden/art-export/ (dev only: tools/build_pvz.py ships only top-level .js/.css, icons/ and registered img/ sheets)' },
    sizeRule: 'nativeW/nativeH are logical px of the 64-grid (= fine px, 2 per art px). Characters and Zombosses use the decided sizes; every other sprite-like asset lists its CURRENT code canvas size in logical px (currentCanvas has the raw canvas, .k and art px), with frameW/H = native x 4 as a placeholder until Phase 2 fixes those formats. Scene-sized art (themes, arenas, tracks, boards, backdrops, screens) has null sizes.',
    loaderPoseNames: LOADER_POSE,
  },
  counts, checks, gaps, orphans, currentBoundsSummary, warnings,
  assets,
};
// one asset per line: small enough to diff, still plain JSON
const body = JSON.stringify(Object.assign({}, manifest, { assets: '@@ASSETS@@' }), null, 2);
const text = body.replace('"@@ASSETS@@"', '[\n' + assets.map(a => '    ' + JSON.stringify(a)).join(',\n') + '\n  ]') + '\n';
JSON.parse(text); // (valid JSON or stop)
console.log(`PVZ Garden art inventory (${REF ? 'git ' + REF : 'working tree'}${head ? ', HEAD ' + head : ''}${dirty.length ? ', ' + dirty.length + ' modified file(s)' : ''})`);
for (const [t, c] of Object.entries(counts)) console.log(`  ${t.padEnd(26)} ${String(c.assets).padStart(5)} assets  ${String(c.entities).padStart(4)} ids${c.looks ? `  (${c.looks} looks)` : ''}${c.levels ? `  (${c.levels} levels)` : ''}${c.reachable != null ? `  (${c.reachable} reachable)` : ''}`);
console.log(`  ${'TOTAL'.padEnd(26)} ${String(assets.length).padStart(5)} assets`);
for (const c of checks) console.log(`  ${c.ok ? '✓' : '✗'} ${c.type}: ${c.found}${c.ok ? '' : ' (brief says ' + c.expected + ')'}`);
for (const g of gaps) console.log(`  · ${g.kind}: ${g.id}`);
for (const [t, s] of Object.entries(currentBoundsSummary)) console.log(`  · ${t} idle bounds: height ${s.height ? s.height.min + '-' + s.height.max : '?'} px of ${s.canvas}; touching top ${s.touchTop.length}, bottom ${s.touchBottom.length}, left ${s.touchLeft.length}, right ${s.touchRight.length}`);
if (warnings.length) console.log(`  ${warnings.length} warning(s) above (also in the manifest)`);
if (!DRY) { fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, text); console.log(`wrote ${path.relative(ROOT, OUT)} (${(text.length / 1024).toFixed(0)} KB) in ${((Date.now() - T0) / 1000).toFixed(1)} s`); }
else console.log(`(dry run: nothing written, ${((Date.now() - T0) / 1000).toFixed(1)} s)`);
