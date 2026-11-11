#!/usr/bin/env node
// hd_art_render.mjs — PVZ Garden: turns the illustrated character SVGs into transparent 256 x 256 PNG frames (dev tool, never shipped).
//   node tools/hd_art_render.mjs [filter]      e.g.  node tools/hd_art_render.mjs sunflower/stage-0
// Renders every pvz-garden/art-source/hd/**/<pose>.svg (or those whose path contains `filter`) to <pose>.png next to it with
// headless Chrome (transparent background, 1:1), then checks each frame: 256 x 256 RGBA, a transparent border (the silhouette is
// inside the frame), and the feet / base on the anchor line (lowest opaque row 244..252, centred within 128 ± 40).
// Nothing is downloaded: it uses the Chrome already installed for the screenshot tools.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'pvz-garden', 'art-source', 'hd');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const filter = process.argv[2] || '';

export function readPng(buf) { // RGBA8 only (what Chrome writes)
  if (buf.readUInt32BE(12) !== 0x49484452) throw new Error('not a PNG');
  const W = buf.readUInt32BE(16), H = buf.readUInt32BE(20), ct = buf[25];
  if (buf[24] !== 8 || ct !== 6) throw new Error(`expected 8-bit RGBA, got depth ${buf[24]} colour type ${ct}`);
  const idat = []; for (let i = 8; i < buf.length;) { const len = buf.readUInt32BE(i), t = buf.toString('latin1', i + 4, i + 8); if (t === 'IDAT') idat.push(buf.slice(i + 8, i + 8 + len)); i += 12 + len; }
  const raw = zlib.inflateSync(Buffer.concat(idat)), st = W * 4, out = Buffer.alloc(W * H * 4); let prev = Buffer.alloc(st), p = 0;
  for (let y = 0; y < H; y++) {
    const f = raw[p++], line = Buffer.from(raw.slice(p, p + st)); p += st;
    for (let x = 0; x < st; x++) { const a = x >= 4 ? line[x - 4] : 0, b = prev[x], c = x >= 4 ? prev[x - 4] : 0;
      if (f === 1) line[x] = (line[x] + a) & 255; else if (f === 2) line[x] = (line[x] + b) & 255; else if (f === 3) line[x] = (line[x] + ((a + b) >> 1)) & 255;
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); line[x] = (line[x] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255; } }
    line.copy(out, y * st); prev = line;
  }
  return { W, H, px: out };
}
function check(file) {
  const { W, H, px } = readPng(fs.readFileSync(file)), A = (x, y) => px[(y * W + x) * 4 + 3], probs = [];
  if (W !== 256 || H !== 256) probs.push(`size ${W}x${H}`);
  for (let i = 0; i < W; i++) { if (A(i, 0) > 8 || A(i, H - 1) > 8) { probs.push('touches the top/bottom edge'); break; } }
  for (let i = 0; i < H; i++) { if (A(0, i) > 8 || A(W - 1, i) > 8) { probs.push('touches a side edge'); break; } }
  let low = -1, minX = W, maxX = -1, top = H;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (A(x, y) > 128) { low = Math.max(low, y); top = Math.min(top, y); if (y >= low - 3) { /* bottom rows */ } }
  for (let y = Math.max(0, low - 3); y <= low; y++) for (let x = 0; x < W; x++) if (A(x, y) > 128) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
  if (low < 244 || low > 252) probs.push(`lowest row ${low} (want 244-252)`);
  const mid = (minX + maxX) / 2; if (Math.abs(mid - 128) > 40) probs.push(`base centred at x=${mid} (want near 128)`);
  return { probs, low, top, height: low - top + 1, mid };
}
function* svgs(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) { if (!e.name.startsWith('_')) yield* svgs(p); } else if (e.name.endsWith('.svg')) yield p; } }

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] || '')) {
  let n = 0, bad = 0;
  for (const svg of svgs(SRC)) {
    if (filter && !svg.includes(filter)) continue;
    const png = svg.replace(/\.svg$/, '.png');
    execFileSync(CHROME, ['--headless', '--disable-gpu', '--hide-scrollbars', '--default-background-color=00000000', '--window-size=256,256', '--force-device-scale-factor=1', `--screenshot=${png}`, 'file://' + svg], { stdio: 'ignore' });
    const r = check(png); n++;
    const rel = path.relative(SRC, png);
    if (r.probs.length) { bad++; console.log(`  ✗ ${rel}: ${r.probs.join('; ')}`); } else console.log(`  ✓ ${rel}  height ${r.height}px, base row ${r.low}, centre x ${r.mid}`);
  }
  console.log(n ? `${n} frame(s) rendered${bad ? `, ${bad} with problems` : ', all inside the frame and on the anchor line'}` : 'no SVG files found');
  process.exit(bad ? 1 : 0);
}
