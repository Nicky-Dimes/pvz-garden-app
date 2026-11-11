#!/usr/bin/env node
// v2_sheet.js — render pose sheets of PVZ Garden v2 pixel art to a PNG for checking by eye (dev tool, never shipped).
//   node tools/v2_sheet.js <out.png> plants  id1,id2,...   [--scale 6] [--old]   one row per stage: the 8 poses
//   node tools/v2_sheet.js <out.png> zombies id1,id2,...                         one row per zombie: the 5 poses
//   node tools/v2_sheet.js <out.png> bosses  id1,id2,...                         one row: frame 1, frame 2 per boss
//   node tools/v2_sheet.js <out.png> compare plants id1,id2                      per stage: OLD idle | NEW idle .. (old art vs v2)
// Uses tools/render_sheet.js (no browser). --old draws the original art instead (PX.useV2(false)).
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { execFileSync } = require('child_process');
const [out, kindArg, ...rest] = process.argv.slice(2);
if (!out || !kindArg) { console.log('usage: node tools/v2_sheet.js out.png plants|zombies|bosses|compare [kind] id1,id2 [--scale n] [--old]'); process.exit(2); }
const compare = kindArg === 'compare', kind = compare ? rest.shift() : kindArg, ids = (rest.shift() || '').split(',').filter(Boolean);
const scale = (() => { const i = rest.indexOf('--scale'); return i >= 0 ? +rest[i + 1] : 6; })(), old = rest.includes('--old');
const script = `
sheet.scale = ${scale}; sheet.bg = '#e9f3d8'; sheet.gap = 6;
PX.useV2(${old ? 'false' : 'true'});
const PLANT = [{ frame: 0, mouth: 'smile' }, { frame: 0, mouth: 'smile', eyes: 'blink' }, { walk: true, frame: 0, mouth: 'smile' }, { walk: true, frame: 1, mouth: 'smile' },
  { arms: 'up', eyes: 'happy', mouth: 'open' }, { arms: 'out', mouth: 'open', eyes: 'brave' }, { eyes: 'sad', mouth: 'o' }, { eyes: 'closed', mouth: 'o' }];
const ZOMBIE = [{}, { walk: true, frame: 0 }, { walk: true, frame: 1 }, { walk: true, frame: 0, mouth: 'open' }, { eyes: 'sad', mouth: 'o' }];
const ids = ${JSON.stringify(ids)}, kind = ${JSON.stringify(kind)}, compare = ${compare};
const pl = (id, st, P, v2) => { PX.useV2(v2); try { return PX.hires(() => PX.buildPlant({ species: id, stage: st }, P).canvas()); } finally { PX.useV2(true); } };
const zb = (id, P, v2) => { PX.useV2(v2); try { return PX.hires(() => PX.buildZombie({ zombie: id }, P).canvas()); } finally { PX.useV2(true); } };
for (const id of ids) {
  if (kind === 'plants') for (let st = 0; st < 3; st++) {
    if (compare) { sheet.add(pl(id, st, PLANT[0], false)); sheet.add(pl(id, st, PLANT[0], true)); sheet.add(pl(id, st, PLANT[4], true)); sheet.add(pl(id, st, PLANT[5], true)); }
    else for (const P of PLANT) sheet.add(pl(id, st, P, ${old ? 'false' : 'true'}));
    sheet.row();
  }
  else if (kind === 'zombies') { if (compare) sheet.add(zb(id, {}, false)); for (const P of ZOMBIE) sheet.add(zb(id, P, ${old ? 'false' : 'true'})); sheet.row(); }
  else if (kind === 'bosses') { if (compare) { PX.useV2(false); sheet.add(PX.critter(id, 0)); PX.useV2(true); } sheet.add(PX.critter(id, 0)); sheet.add(PX.critter(id, 1)); sheet.row(); }
}`;
const tmp = path.join(os.tmpdir(), `v2sheet-${process.pid}.js`);
fs.writeFileSync(tmp, script);
try { process.stdout.write(execFileSync(process.execPath, [path.join(__dirname, 'render_sheet.js'), path.resolve(out), tmp], { encoding: 'utf8' })); }
finally { try { fs.unlinkSync(tmp); } catch (e) { /* ignore */ } }
