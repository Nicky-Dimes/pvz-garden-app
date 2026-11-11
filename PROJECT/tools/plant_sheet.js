#!/usr/bin/env node
// plant_sheet.js — a one-page picture of every PVZ Garden plant at all three stages, with names and how each is unlocked.
//   node tools/plant_sheet.js            -> writes pvz-plant-sheet.html (self-contained: the sprites are embedded as one PNG)
// Re-run it after changing any plant art. Uses tools/render_sheet.js to draw the sprites.
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..'), SRC = path.join(ROOT, 'pvz-garden'), OUT = path.join(ROOT, 'pvz-plant-sheet.html');
const S = 4, CELL = 32 * S;

const sb = { console, Math, JSON, Object, Array };
sb.window = sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(SRC, 'data.js'), 'utf8'), sb);
const D = sb.PSDATA;

// plant order: starters first, then in the order they're unlocked through the game
const unlockOf = {};
for (const [k, sp] of Object.entries(D.UNLOCKS)) if (sp !== 'starter') unlockOf[sp] = k;
const order = D.STARTERS.concat(Object.keys(D.PLANTS).filter(k => !D.STARTERS.includes(k)));

const RACE_NAMES = Object.fromEntries(D.RACES.map(r => [r.id, r.name]));
Object.assign(RACE_NAMES, { desert: 'Egypt Sand Sprint', rooftop: 'Rooftop Rally', jungle: 'Jurassic Marsh', volcano: 'Lava Rock Run', snowy: 'Frostbite Caves', starlight: 'Far Future Skyway' });
const BOSS_NAMES = { gargantuar: 'Gargantuar', zombot: 'Zombot', plankwalker: 'Plank Walker', sphinx: 'Sphinx-inator', frostmammoth: 'Frost Mammoth', darkdragon: 'Dark Dragon', tomorrowtron: 'Zombot Tomorrow-tron' };
function howToGet(sp) {
  if (D.STARTERS.includes(sp)) return 'Starter plant (pick one at the start; win the first race and first league for the others)';
  const key = unlockOf[sp]; if (!key) return '?';
  const [kind, id] = key.split(':');
  if (kind === 'race') { const [r, t] = id.split('-'); return `Win ${RACE_NAMES[r] || r} (${D.RACE_TIERS[+t].name})`; }
  if (kind === 'league') { const L = D.LEAGUES.find(l => l.id === id); return `Clear the ${L ? L.name : id}`; }
  if (kind === 'cup') { const L = D.PLANT_LEAGUES.find(l => l.id === id); return `Win the ${L ? L.name : id} (plant battles)`; }
  if (kind === 'boss') return `Beat the Zomboss ${BOSS_NAMES[id] || id}`;
  return key;
}

// draw the sprite grid: one row per plant, three stages per row
const script = `sheet.scale = ${S}; sheet.gap = 0; sheet.bg = '#f3ead2';
for (const sp of ${JSON.stringify(order)}) { for (let st = 0; st < 3; st++) sheet.add(PX.sprig({ species: sp, stage: st }, { eyes: 'happy', mouth: 'open' })); sheet.row(); }`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pvz-sheet-')), js = path.join(tmp, 's.js'), png = path.join(tmp, 's.png');
fs.writeFileSync(js, script);
execFileSync(process.execPath, [path.join(__dirname, 'render_sheet.js'), png, js], { stdio: 'inherit' });
const img = 'data:image/png;base64,' + fs.readFileSync(png).toString('base64');
fs.rmSync(tmp, { recursive: true, force: true });

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const typeName = el => (D.ELEMENT_INFO[el] ? D.ELEMENT_INFO[el].name : el === 'plant' ? 'Plant' : el);
const rows = order.map((sp, i) => {
  const P = D.PLANTS[sp];
  const cells = [0, 1, 2].map(st => `<figure><div class="spr" style="background-position:-${st * CELL}px -${i * CELL}px"></div><figcaption>${esc(P.names[st])}</figcaption></figure>`).join('');
  return `<article><header><h2>${i + 1}. ${esc(P.names[0])}</h2><p class="meta">${esc(typeName(P.el))} type · ${esc(P.role)}</p><p>${esc(P.blurb || '')}</p><p class="how">${esc(howToGet(sp))}</p></header><div class="stages">${cells}</div></article>`;
}).join('\n');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>PVZ Garden Plants</title>
<style>
:root{--bg:#cfe8b8;--card:#fbf3dc;--ink:#2b2416;--sub:#6b5b3a;--edge:#8a6234;--band:#5cb43a;--how:#2f6a1e}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#1d2a18;--card:#2b281f;--ink:#f3ead2;--sub:#c9b88f;--edge:#5a4024;--band:#3f8a2a;--how:#9fdc7a}}
:root[data-theme="dark"]{--bg:#1d2a18;--card:#2b281f;--ink:#f3ead2;--sub:#c9b88f;--edge:#5a4024;--band:#3f8a2a;--how:#9fdc7a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.4 -apple-system,system-ui,sans-serif;padding:16px}
h1{margin:0 0 4px;font-size:24px}.lead{margin:0 0 16px;color:var(--sub)}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,430px),1fr));gap:12px}
article{background:var(--card);border-top:6px solid var(--band);border-bottom:4px solid var(--edge);border-radius:14px;padding:12px}
h2{margin:0;font-size:17px}.meta{margin:2px 0;color:var(--sub);font-size:13px;text-transform:capitalize}article p{margin:2px 0}
.how{color:var(--how);font-weight:600;font-size:13px}
.stages{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}figure{margin:0;text-align:center;width:${CELL}px}
.spr{width:${CELL}px;height:${CELL}px;background-image:url(${img});background-repeat:no-repeat;image-rendering:pixelated;border-radius:8px}
figcaption{font-size:12px;color:var(--sub)}
</style></head><body>
<h1>PVZ Garden: all ${order.length} plants</h1>
<p class="lead">Each plant has three stages (it evolves twice). Starters first. The green line on each card says how to unlock it; after that it is for sale in the shop.</p>
<main>
${rows}
</main></body></html>`;
fs.writeFileSync(OUT, html);
console.log(`wrote ${path.relative(ROOT, OUT)} (${order.length} plants, ${(html.length / 1024).toFixed(0)} KB)`);
