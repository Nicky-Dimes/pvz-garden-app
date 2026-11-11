#!/usr/bin/env node
// render_sheet.js — draw PVZ Garden pixel art to a PNG without a browser (for checking art by eye).
//   node tools/render_sheet.js <out.png> <script.js>
// The script runs with PX, PSDATA and `sheet` in scope. Call sheet.add(canvas, label?) for each sprite, sheet.row() to start a new row,
// sheet.scale = n (default 4), sheet.bg = '#rrggbb' (default a light checker). Labels are drawn as small tick marks only (no fonts).
// Loads pvz-garden/pixel.js, art-*.js and data.js into a sandbox with a tiny software canvas (fillRect / drawImage / image data).
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path'), zlib = require('zlib');
const SRC = path.join(__dirname, '..', process.env.GAME || 'pvz-garden');

function parseColor(c) {
  if (typeof c !== 'string') return [0, 0, 0, 255];
  c = c.trim();
  let m;
  if ((m = /^#([0-9a-f]{6})$/i.exec(c))) { const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255, 255]; }
  if ((m = /^#([0-9a-f]{3})$/i.exec(c))) { return [...m[1]].map(h => parseInt(h + h, 16)).concat([255]); }
  if ((m = /^rgba?\(([^)]+)\)$/i.exec(c))) { const p = m[1].split(',').map(s => parseFloat(s)); return [p[0] | 0, p[1] | 0, p[2] | 0, Math.round((p[3] == null ? 1 : p[3]) * 255)]; }
  if (c === 'white') return [255, 255, 255, 255];
  if (c === 'black') return [0, 0, 0, 255];
  return [255, 0, 255, 255];
}
class Canvas {
  constructor() { this._w = 0; this._h = 0; this.data = new Uint8ClampedArray(0); this._ctx = null; }
  get width() { return this._w; } set width(v) { this._w = v | 0; this.data = new Uint8ClampedArray(this._w * this._h * 4); }
  get height() { return this._h; } set height(v) { this._h = v | 0; this.data = new Uint8ClampedArray(this._w * this._h * 4); }
  getContext() { return this._ctx || (this._ctx = new Ctx(this)); }
}
class Ctx {
  constructor(c) { this.canvas = c; this.fillStyle = '#000'; this.globalAlpha = 1; this.imageSmoothingEnabled = false; this.globalCompositeOperation = 'source-over'; this._t = [1, 0, 0, 1, 0, 0]; this._stack = []; }
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
  drawImage(src, ...a) {
    let sx = 0, sy = 0, sw = src.width, sh = src.height, dx, dy, dw, dh;
    if (a.length === 2) { [dx, dy] = a; dw = sw; dh = sh; } else if (a.length === 4) { [dx, dy, dw, dh] = a; } else { [sx, sy, sw, sh, dx, dy, dw, dh] = a; }
    const flip = this._t[0] < 0; dx = flip ? this._t[4] - dx : dx + this._t[4]; dy += this._t[5]; const W = this.canvas.width, H = this.canvas.height, sd = src.data;
    if (!sd || !sw || !sh) return;
    for (let y = 0; y < Math.round(dh); y++) for (let x = 0; x < Math.round(dw); x++) {
      const tx = flip ? Math.round(dx) - 1 - x : Math.round(dx) + x, ty = Math.round(dy) + y; if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
      const ux = Math.floor(sx + x * sw / dw), uy = Math.floor(sy + y * sh / dh); if (ux < 0 || uy < 0 || ux >= src.width || uy >= src.height) continue;
      const si = (uy * src.width + ux) * 4; if (!sd[si + 3]) continue;
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
  beginPath() {} rect() {} clip() {} moveTo() {} lineTo() {} arcTo() {} closePath() {} fill() {} stroke() {} arc() {}
  measureText() { return { width: 10 }; } fillText() {} strokeText() {}
}

function png(w, h, rgba) {
  const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
  const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const [out, script] = process.argv.slice(2);
if (!out || !script) { console.log('usage: node tools/render_sheet.js out.png script.js'); process.exit(1); }
const errors = [];
const sb = { console: { log: (...a) => console.log(...a), warn() {}, error: (...a) => { errors.push(a.map(x => (x && x.stack) || String(x)).join(' ')); console.error(...a); } },
  document: { createElement: () => new Canvas(), head: { appendChild() {} }, getElementById: () => null }, navigator: {},
  Math, JSON, Map, Set, WeakMap, Array, Object, Number, String, Boolean, Error, parseInt, parseFloat, isNaN, isFinite, Uint8ClampedArray, Uint8Array, Uint32Array, Float32Array, Date };
sb.window = sb; sb.self = sb;
vm.createContext(sb);
// (the art files in the game's own order, from index.html, so later files can replace earlier art; alphabetical if there's no page)
const pageOrder = (() => { try { return [...fs.readFileSync(path.join(SRC, 'index.html'), 'utf8').matchAll(/src="(art-[A-Za-z0-9-]+\.js)"/g)].map(m => m[1]); } catch (e) { return null; } })();
const files = ['pixel.js', ...(pageOrder && pageOrder.length ? pageOrder : fs.readdirSync(SRC).filter(f => /^art-.*\.js$/.test(f)).sort()), 'data.js'];
// (an art file someone is halfway through writing is skipped with a warning, so it can't stop everyone else's renders)
// RENDER_SKIP=art-a.js,art-b.js leaves those files out (e.g. to render the art they replace, for a before/after)
const SKIP = (process.env.RENDER_SKIP || '').split(',').filter(Boolean);
for (const f of files) if (!SKIP.includes(f) && fs.existsSync(path.join(SRC, f))) { try { vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), sb, { filename: f }); } catch (e) { if (f === 'pixel.js' || f === 'data.js' || f === 'art-core.js') throw e; console.error(`(skipped ${f}: ${e.message})`); } }
// extra scripts (e.g. a reference or work-in-progress art file): RENDER_EXTRA=path1,path2 node tools/render_sheet.js ...
for (const f of (process.env.RENDER_EXTRA || '').split(',').filter(Boolean)) vm.runInContext(fs.readFileSync(f, 'utf8'), sb, { filename: f });
const items = [[]];
const sheet = { scale: 4, bg: null, gap: 4, add(c, label) { if (c) items[items.length - 1].push({ c, label }); }, row() { if (items[items.length - 1].length) items.push([]); } };
sb.sheet = sheet;
vm.runInContext(fs.readFileSync(script, 'utf8'), sb, { filename: script });
const S = sheet.scale, G = sheet.gap, sc = c => Math.max(1, Math.round(S / (c.k || 1))); // hi-res canvases (c.k) draw at the same size, with their extra detail
let W = 0, H = G; const rows = items.filter(r => r.length).map(r => { const rw = r.reduce((a, it) => a + it.c.width * sc(it.c) + G, G), rh = Math.max(...r.map(it => it.c.height * sc(it.c))) + G; W = Math.max(W, rw); H += rh; return { r, rh }; });
const img = new Uint8ClampedArray(W * H * 4);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, bgc = sheet.bg ? parseColor(sheet.bg) : (((x >> 3) + (y >> 3)) & 1 ? [214, 230, 205, 255] : [232, 242, 226, 255]); img.set(bgc, i); }
let oy = G;
for (const { r, rh } of rows) {
  let ox = G;
  for (const { c } of r) {
    const d = c.data, s1 = sc(c), top = oy + rh - G - c.height * s1;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const si = (y * c.width + x) * 4; const a = d[si + 3] / 255; if (!a) continue; for (let yy = 0; yy < s1; yy++) for (let xx = 0; xx < s1; xx++) { const i = ((top + y * s1 + yy) * W + ox + x * s1 + xx) * 4; for (let k = 0; k < 3; k++) img[i + k] = Math.round(d[si + k] * a + img[i + k] * (1 - a)); } }
    ox += c.width * s1 + G;
  }
  oy += rh;
}
fs.writeFileSync(out, png(W, H, img));
console.log(`wrote ${out} (${W}x${H})${errors.length ? ', ' + errors.length + ' errors' : ''}`);
if (errors.length) process.exit(2);
