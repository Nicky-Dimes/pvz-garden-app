#!/usr/bin/env node
// ai_process.js — PVZ Garden: turn every new ChatGPT result in the family's art folder into game sprites (dev tool).
//   node tools/ai_process.js "<art folder>" [--only 2,5] [--force]
// For each sheet-NN-result.png|jpg|jpeg|webp in the folder (new or changed since last time):
//   1. copies it to art-src/pvz-ai/ (kept with the project) and to pvz-garden/_ref/ai/ (dev-only, served to the slicer)
//   2. slices + converts it in headless Chrome (pvz-garden/_ai-slice.html via tools/shoot_poke.mjs; needs the preview server
//      on port 8770) -> art-src/pvz-ai/sliced/sheet-NN.json and a preview art-src/pvz-ai/sliced/sheet-NN.png
//   3. writes pvz-garden/art-v2-ai-NN.js (tools/ai_ingest.js), which index.html loads
// Then prints a summary. Run `node tools/v2_export.js` afterwards for the frame checks.
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process'), os = require('os');
const ROOT = path.join(__dirname, '..'), SRC = path.join(ROOT, 'pvz-garden'), KEEP = path.join(ROOT, 'art-src', 'pvz-ai'), SLICED = path.join(KEEP, 'sliced'), SERVE = path.join(SRC, '_ref', 'ai');
const DIR = process.argv[2]; if (!DIR) { console.log('usage: node tools/ai_process.js "<art folder>" [--only 2,5] [--force]'); process.exit(2); }
const oi = process.argv.indexOf('--only'), ONLY = oi > 0 ? process.argv[oi + 1].split(',').map(Number) : null, FORCE = process.argv.includes('--force');
for (const d of [KEEP, SLICED, SERVE]) fs.mkdirSync(d, { recursive: true });
const sha = f => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex').slice(0, 12);
// results: "sheet-07-result.png", "sheet 7.png", "Sheet 7.PNG", "sheet_07.webp"... (never the templates); newest file wins per sheet
const byN = new Map();
for (const f of fs.readdirSync(DIR)) {
  const m = /^sheet[\s_-]*0*(\d+)(?:[\s_-]*result)?\.(png|jpe?g|webp)$/i.exec(f); if (!m) continue;
  const file = path.join(DIR, f), t = fs.statSync(file).mtimeMs, n = +m[1], prev = byN.get(n);
  if (!prev || t > prev.t) byN.set(n, { file, n, ext: m[2].toLowerCase().replace('jpeg', 'jpg'), t });
}
const files = [...byN.values()];
if (!files.length) { console.log('no sheet-NN-result files in ' + DIR); process.exit(0); }
const done = [], skipped = [], failed = [];
for (const { file, n, ext } of files.sort((a, b) => a.n - b.n)) {
  if (ONLY && !ONLY.includes(n)) continue;
  const NN = String(n).padStart(2, '0'), keep = path.join(KEEP, `sheet-${NN}-result.${ext}`), json = path.join(SLICED, `sheet-${NN}.json`);
  if (!FORCE && fs.existsSync(keep) && fs.existsSync(json) && sha(keep) === sha(file)) { skipped.push(NN); continue; }
  fs.copyFileSync(file, keep);
  const served = path.join(SERVE, `sheet-${NN}.${ext}`); fs.copyFileSync(file, served);
  const plan = path.join(os.tmpdir(), `ai-slice-${NN}-${process.pid}.json`);
  fs.writeFileSync(plan, JSON.stringify({ url: `http://127.0.0.1:8770/_ai-slice.html?sheet=${n}&src=_ref/ai/sheet-${NN}.${ext}`, w: 1200, h: 2600, dpr: 1, out: SLICED, settle: 5000, timeout: 120000,
    steps: [{ js: "for (let i = 0; i < 120 && !window.RESULT; i++) await new Promise(r => setTimeout(r, 250)); return window.RESULT ? JSON.stringify(window.RESULT) : 'NO RESULT'" }, { shot: `sheet-${NN}.png` }] }));
  let out = '';
  try { out = execFileSync(process.execPath, [path.join(__dirname, 'shoot_poke.mjs'), plan], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); }
  catch (e) { failed.push(`${NN}: slicer failed (${String(e.message).slice(0, 120)})`); continue; }
  finally { try { fs.unlinkSync(plan); } catch (e) { /* ignore */ } }
  const line = out.split('\n').find(l => l.startsWith('js → {'));
  if (!line) { failed.push(`${NN}: no slice result`); continue; }
  fs.writeFileSync(json, line.slice(5).trim());
  try { const r = execFileSync(process.execPath, [path.join(__dirname, 'ai_ingest.js'), json], { encoding: 'utf8' }); done.push(`${NN}: ${r.trim()}`); }
  catch (e) { failed.push(`${NN}: ingest failed (${String(e.stderr || e.message).slice(0, 160)})`); }
}
console.log(`processed ${done.length}, unchanged ${skipped.length}${skipped.length ? ' (' + skipped.join(', ') + ')' : ''}, failed ${failed.length}`);
for (const d of done) console.log('  ✓ ' + d);
for (const f of failed) console.log('  ✗ ' + f);
console.log(`previews: ${path.relative(ROOT, SLICED)}/sheet-NN.png`);
