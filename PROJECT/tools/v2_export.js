#!/usr/bin/env node
// v2_export.js — PVZ Garden: export the v2 pixel art (art-v2-*.js) to sprite sheets and check every frame (dev tool, never shipped).
//   node tools/v2_export.js [--only id,id] [--kinds plants,zombies,bosses] [--no-write]
// Writes pvz-garden/art-export/ (dev only: the build never copies it):
//   plants/<id>/stage-<0|1|2>.png  1024x512 = 4x2 frames of 256x256 (idle blink walkA walkB / cheer attack hurt knockedOut)
//   zombies/<id>.png               768x512  = 3x2 frames (idle walkA walkB / bite hurt / empty)
//   bosses/<id>.png                768x384  = 2 frames of 384x384
//   index.json                     every sheet, its frames' measured bounds and the check results
// Each logical pixel (the 64x64 grid; bosses 96x96) becomes a 4x4 block. Checks per frame: the art isn't empty, nothing touches the
// frame edge, every 4x4 block is one colour, pixels are fully opaque or fully clear, the base sits on the anchor line (lowest row
// 61-62 logical = 244-251 px; zombies / bosses 60-94 for bosses) and is centred near x = 32 (128 px). A failure prints and exits 1.
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path'), zlib = require('zlib');
const ROOT = path.join(__dirname, '..'), SRC = path.join(ROOT, 'pvz-garden'), OUT = path.join(SRC, 'art-export');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const ONLY = (arg('--only') || '').split(',').filter(Boolean), KINDS = (arg('--kinds') || 'plants,zombies,bosses').split(','), WRITE = !process.argv.includes('--no-write');

// ---------- the game's art in a sandbox (no browser: Grids are read directly) ----------
function fakeCanvas() {
  const c = { width: 0, height: 0 }; const g = { fillStyle: '#000', globalAlpha: 1, imageSmoothingEnabled: false, fillRect() {}, clearRect() {}, drawImage() {}, putImageData() {}, save() {}, restore() {}, translate() {}, scale() {}, beginPath() {}, rect() {}, fill() {}, arc() {}, moveTo() {}, lineTo() {}, closePath() {}, stroke() {},
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }), getImageData: (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }), measureText: () => ({ width: 10 }), fillText() {}, strokeText() {}, setTransform() {} };
  c.getContext = () => g; return c;
}
const sb = { console: { log() {}, warn() {}, error: (...a) => console.error('  (art)', ...a.map(x => (x && x.message) || String(x))) }, document: { createElement: () => fakeCanvas() }, navigator: {},
  Math, JSON, Map, Set, WeakMap, Array, Object, Number, String, Boolean, Error, parseInt, parseFloat, isNaN, isFinite, Uint8ClampedArray, Uint32Array, Float32Array };
sb.window = sb; sb.self = sb; vm.createContext(sb);
const html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
const order = [...html.matchAll(/src="(art-[A-Za-z0-9-]+\.js)"/g)].map(m => m[1]).filter(f => !/art-hd-/.test(f));
for (const f of ['pixel.js', ...order, 'data.js']) vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), sb, { filename: f });
const PX = sb.PX, D = sb.PSDATA;

// ---------- colours -> RGBA ----------
const cache = new Map();
function rgba(c) {
  if (c === null || c === undefined) return null; let v = cache.get(c); if (v) return v;
  let m; if ((m = /^#([0-9a-f]{6})$/i.exec(c))) { const n = parseInt(m[1], 16); v = [n >> 16 & 255, n >> 8 & 255, n & 255, 255]; }
  else if ((m = /^rgba?\(([^)]+)\)$/i.exec(c))) { const p = m[1].split(',').map(Number); v = [p[0] | 0, p[1] | 0, p[2] | 0, Math.round((p[3] == null ? 1 : p[3]) * 255)]; }
  else v = [255, 0, 255, 255];
  cache.set(c, v); return v;
}
// ---------- PNG ----------
const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function png(w, h, px) {
  const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- poses ----------
const PLANT = [['idle', { frame: 0, mouth: 'smile' }], ['blink', { frame: 0, mouth: 'smile', eyes: 'blink' }], ['walkA', { walk: true, frame: 0, mouth: 'smile' }], ['walkB', { walk: true, frame: 1, mouth: 'smile' }],
  ['cheer', { arms: 'up', eyes: 'happy', mouth: 'open' }], ['attack', { arms: 'out', mouth: 'open', eyes: 'brave' }], ['hurt', { eyes: 'sad', mouth: 'o' }], ['knockedOut', { eyes: 'closed', mouth: 'o' }]];
const ZOMBIE = [['idle', {}], ['walkA', { walk: true, frame: 0 }], ['walkB', { walk: true, frame: 1 }], ['bite', { walk: true, frame: 0, mouth: 'open' }], ['hurt', { eyes: 'sad', mouth: 'o' }]];
function posesFor(kind, id, stage, legacy) {
  const d = PX.v2ai && PX.v2ai.dataOf(kind === 'plant' ? { species: id, stage } : kind === 'zombie' ? { zombie: id } : { boss: id });
  if (!d || !d.clips) return legacy;
  return Object.entries(d.clips).flatMap(([clip, spec]) => spec.frames.map((frame, i) => [clip + '-' + i, { animClip: clip, animFrame: i }, frame.head]));
}

// ---------- frames ----------
const S = 4; // output pixels per logical pixel
function frameOf(grid) { // a Grid (k=2) -> { w, h, a: logical colours }
  return { w: grid.fw, h: grid.fh, a: grid.a.slice() };
}
function check(fr, kind, pose) {
  const W = fr.w, H = fr.h, probs = []; let x0 = W, x1 = -1, y0 = H, y1 = -1, semi = 0;
  const N = kind === 'boss' ? 96 : 64;
  if (W !== N || H !== N) probs.push(`canvas ${W}x${H} (want ${N}x${N})`);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = rgba(fr.a[y * W + x]); if (!v || v[3] === 0) continue; if (v[3] < 255) semi++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (x1 < 0) return { probs: ['empty frame'], bounds: null };
  if (x0 === 0 || y0 === 0 || x1 === W - 1 || y1 === H - 1) probs.push(`touches the frame edge (${x0},${y0})-(${x1},${y1})`);
  if (semi) probs.push(`${semi} semi-transparent px`);
  const base = kind === 'boss' ? [80, 94] : [61, 62]; if (pose === 'cheer' || pose === 'walkB') base[0] = 57;
  if (y1 < base[0] || y1 > base[1]) probs.push(`base row ${y1} (want ${base[0]}-${base[1]})`);
  // A serpent jaw or a gondola vine can be the lowest pixel. For bosses,
  // measure the lower-body support band rather than treating that tip as feet.
  const supportDepth = kind === 'boss' ? 12 : 4;
  let bx0 = W, bx1 = -1; for (let y = Math.max(0, y1 - supportDepth + 1); y <= y1; y++) for (let x = 0; x < W; x++) { const v = rgba(fr.a[y * W + x]); if (v && v[3]) { bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); } }
  const mid = (bx0 + bx1) / 2, cen = kind === 'boss' ? 48 : 32, tol = kind === 'boss' ? 20 : 10;
  if (Math.abs(mid - cen) > tol) probs.push(`base centred at x=${mid} (want ${cen} +- ${tol})`);
  return { probs, bounds: { x0, y0, x1, y1, height: y1 - y0 + 1, baseMid: mid, supportDepth } };
}
function sheet(frames, cols, rows, cell) { // frames: [frame|null] -> RGBA buffer
  const W = cols * cell * S, H = rows * cell * S, buf = Buffer.alloc(W * H * 4);
  frames.forEach((fr, i) => {
    if (!fr) return; const ox = (i % cols) * cell * S, oy = Math.floor(i / cols) * cell * S;
    for (let y = 0; y < fr.h; y++) for (let x = 0; x < fr.w; x++) {
      const v = rgba(fr.a[y * fr.w + x]); if (!v || !v[3]) continue;
      for (let j = 0; j < S; j++) for (let k = 0; k < S; k++) { const o = ((oy + y * S + j) * W + ox + x * S + k) * 4; buf[o] = v[0]; buf[o + 1] = v[1]; buf[o + 2] = v[2]; buf[o + 3] = 255; }
    }
  });
  return { W, H, buf };
}
function blockUniform({ W, H, buf }) { // every 4x4 block one colour (by construction, but verify what's written)
  for (let by = 0; by < H; by += S) for (let bx = 0; bx < W; bx += S) { const o0 = (by * W + bx) * 4; for (let j = 0; j < S; j++) for (let k = 0; k < S; k++) { const o = ((by + j) * W + bx + k) * 4; if (buf.readUInt32BE(o) !== buf.readUInt32BE(o0)) return false; } }
  return true;
}

// ---------- run ----------
const index = { generated: new Date().toISOString(), grid: { character: 64, boss: 96, scale: S, frame: 256, bossFrame: 384, anchor: { x: 128, y: 248 } }, plants: {}, zombies: {}, bosses: {} };
let failures = 0, sheets = 0, frames = 0;
const fail = (id, msg) => { failures++; console.log(`  ✗ ${id}: ${msg}`); };
const want = id => !ONLY.length || ONLY.includes(id);
const hires = fn => PX.hires(fn);
PX.useV2(true);
if (KINDS.includes('plants')) for (const id of Object.keys(PX.PLANT_ART2 || {}).filter(want)) {
  index.plants[id] = {};
  for (let st = 0; st < 3; st++) {
    const poses = posesFor('plant', id, st, PLANT), drawn = poses !== PLANT;
    const frs = poses.map(([pose, P]) => { const g = hires(() => PX.buildPlant({ species: id, stage: st }, P)); return frameOf(g); });
    const res = frs.map((fr, i) => { const r = check(fr, 'plant', poses[i][0]); r.probs.forEach(p => fail(`${id} stage ${st} ${poses[i][0]}`, p)); return { pose: poses[i][0], head: poses[i][2], ...r }; });
    if (drawn) validateClips('plant', id, st);
    const sh = sheet(frs, drawn ? 5 : 4, drawn ? Math.ceil(frs.length / 5) : 2, 64); if (!blockUniform(sh)) fail(`${id} stage ${st}`, 'a 4x4 block is not uniform');
    const rel = `plants/${id}/stage-${st}.png`; if (WRITE) { fs.mkdirSync(path.join(OUT, 'plants', id), { recursive: true }); fs.writeFileSync(path.join(OUT, rel), png(sh.W, sh.H, sh.buf)); }
    index.plants[id][st] = { file: rel, w: sh.W, h: sh.H, frames: res }; sheets++; frames += frs.length;
  }
}
if (KINDS.includes('zombies')) for (const id of Object.keys(PX.ZOMBIE_ART2 || {}).filter(want)) {
  const poses = posesFor('zombie', id, null, ZOMBIE), drawn = poses !== ZOMBIE;
  const frs = poses.map(([pose, P]) => frameOf(hires(() => PX.buildZombie({ zombie: id }, P))));
  const res = frs.map((fr, i) => { const r = check(fr, 'zombie', poses[i][0]); r.probs.forEach(p => fail(`${id} ${poses[i][0]}`, p)); return { pose: poses[i][0], head: poses[i][2], ...r }; });
  if (drawn) validateClips('zombie', id, null);
  const sh = sheet(drawn ? frs : frs.concat([null]), drawn ? 5 : 3, drawn ? Math.ceil(frs.length / 5) : 2, 64); if (!blockUniform(sh)) fail(id, 'a 4x4 block is not uniform');
  const rel = `zombies/${id}.png`; if (WRITE) { fs.mkdirSync(path.join(OUT, 'zombies'), { recursive: true }); fs.writeFileSync(path.join(OUT, rel), png(sh.W, sh.H, sh.buf)); }
  index.zombies[id] = { file: rel, w: sh.W, h: sh.H, frames: res }; sheets++; frames += frs.length;
}
if (KINDS.includes('bosses')) for (const id of Object.keys(PX.BOSS_ART2 || {}).filter(want)) {
  const B = PX.BOSS_ART2[id];
  const legacy = [['frame0', 0], ['frame1', 1]], poses = posesFor('boss', id, null, legacy), drawn = poses !== legacy;
  const frs = poses.map(([pose, f]) => frameOf(hires(() => { const b = new PX.Grid(B.w || 48, B.h || 48); B.draw(b, f); if (!B.ai) PX.v2.contour(b); return b; })));
  const res = frs.map((fr, i) => { const r = check(fr, 'boss'); r.probs.forEach(p => fail(`${id} ${poses[i][0]}`, p)); return { pose: poses[i][0], head: poses[i][2], ...r }; });
  if (drawn) validateClips('boss', id, null);
  const sh = sheet(frs, drawn ? 3 : 2, drawn ? Math.ceil(frs.length / 3) : 1, 96); if (!blockUniform(sh)) fail(id, 'a 4x4 block is not uniform');
  const rel = `bosses/${id}.png`; if (WRITE) { fs.mkdirSync(path.join(OUT, 'bosses'), { recursive: true }); fs.writeFileSync(path.join(OUT, rel), png(sh.W, sh.H, sh.buf)); }
  index.bosses[id] = { file: rel, w: sh.W, h: sh.H, frames: res }; sheets++; frames += frs.length;
}
if (WRITE) { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 1)); }
console.log(`${sheets} sheet(s), ${frames} frame(s) exported${WRITE ? ' to pvz-garden/art-export/' : ' (not written)'}: ${Object.keys(index.plants).length} plants, ${Object.keys(index.zombies).length} zombies, ${Object.keys(index.bosses).length} Zombosses; ${failures ? failures + ' problem(s)' : 'all frames pass'}`);
process.exit(failures ? 1 : 0);

function validateClips(kind, id, stage) {
  const d = PX.v2ai.dataOf(kind === 'plant' ? { species: id, stage } : kind === 'zombie' ? { zombie: id } : { boss: id });
  const expected = kind === 'plant' ? { idle: 2, walk: 4, attack: 3, hurt: 1, knockedOut: 2, cheer: 2, sleep: 1 } : kind === 'zombie' ? { idle: 2, walk: 4, attack: 3, hurt: 1, fall: 3 } : { idle: 2, attack: 3, hurt: 1, defeated: 3 };
  const N = kind === 'boss' ? 96 : 64;
  const palette = JSON.stringify(d.clips.idle.frames[0].pal);
  for (const [clip, count] of Object.entries(expected)) {
    const c = d.clips[clip];
    if (!c || c.frames.length !== count) { fail(`${id} ${stage} ${clip}`, `want ${count} drawn frames`); continue; }
    if (!(c.fps > 0) || typeof c.loop !== 'boolean') fail(id, `${clip}: invalid timing`);
    const hashes = new Set();
    c.frames.forEach((f, i) => {
      const a = PX.v2ai.decode(f), h = f.head;
      if (a.N !== N || a.a.length !== N * N) fail(id, `${clip}-${i}: invalid decoded canvas`);
      if (!h || !['hx', 'hy', 'hr', 'ey', 'front'].every(k => Number.isFinite(h[k]) && h[k] >= 0 && h[k] < N)) fail(id, `${clip}-${i}: invalid head anchors`);
      if (JSON.stringify(f.pal) !== palette) fail(id, `${clip}-${i}: palette differs within character`);
      hashes.add(a.a.join('|'));
    });
    if (count > 1 && hashes.size !== count) fail(id, `${clip}: duplicate drawn frames`);
  }
}
