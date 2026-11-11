#!/usr/bin/env node
// check_art_ids.js — a quick art check for just the ids you're working on (check_pvz.js checks everything, but takes minutes).
//   node tools/check_art_ids.js plants=dandelion,hollybarrier zombies=troglobite parts=puffball items=viking maps=poolside
// plants: every stage x poses, elements, items, skins, and fused both ways with one plant of every fusion part.
// zombies: poses x skins. parts: that part fused onto 12 different bodies. items: the costume on 12 bodies + its icon.
// fish / decor / backdrops / sands: the aquarium art (art-aqua.js registries) draws without errors, both frames.
// trainers: the Poké Garden people (PX.TRAINER_ART) draw without errors, both frames.
// maps: the garden map's theme exists (PX.GARDEN_MAPS) and its race scenery (PX.RACE_MAPS), and the home facade draws.
// explore: Explore mode's overworld art (art-explore.js) for these themes (or explore=all): every tile kind x frame, the Poké
//   Center / Poké Mart / shrine, and (once per run) the 8 heroes and the NPCs in every direction and step, and the bag icons.
//   e.g.  GAME=poke-garden node tools/check_art_ids.js explore=forest,marsh   (plants=chespin,xerneas also draws Explore lines)
// Prints every error (art that throws, or that PX.sprig had to replace with a fallback) and "OK" when clean.
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const SRC = path.join(__dirname, '..', process.env.GAME || 'pvz-garden');
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');
const html = read('index.html');
const ART_FILES = [...html.matchAll(/src="((?:pixel|art-[A-Za-z0-9-]+)\.js)"/g)].map(m => m[1]);
function fakeCanvas() {
  const c = { width: 0, height: 0 };
  const g = { fillStyle: '#000', globalAlpha: 1, imageSmoothingEnabled: false, fillRect() {}, clearRect() {}, drawImage() {}, putImageData() {}, save() {}, restore() {}, translate() {}, scale() {}, beginPath() {}, rect() {}, clip() {}, setTransform() {},
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }), getImageData: (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }), measureText: () => ({ width: 10 }), fillText() {}, strokeText() {} };
  c.getContext = () => g;
  return c;
}
const errors = [];
const sb = { console: { log() {}, warn() {}, error: (...a) => errors.push(a.map(x => (x && x.stack) || String(x)).join(' ')) }, document: { createElement: () => fakeCanvas() }, navigator: {},
  Math, JSON, Map, Set, WeakMap, Array, Object, Number, String, Boolean, Error, parseInt, parseFloat, isNaN, isFinite, Uint8ClampedArray, Uint32Array, Float32Array };
sb.window = sb; sb.self = sb;
vm.createContext(sb);
// (another artist's file that is halfway written is skipped with a warning; your own file's errors still count)
for (const f of ART_FILES.concat(['data.js'])) { try { vm.runInContext(read(f), sb, { filename: f }); } catch (e) { if (f === 'pixel.js' || f === 'data.js' || f === 'art-core.js' || (process.env.MINE || '').split(',').includes(f)) throw e; console.log(`  (skipped ${f}: ${e.message})`); } }
// CHECK_EXTRA=path1,path2: extra art files (e.g. a work-in-progress outside the game folder), loaded after the game's own
for (const f of (process.env.CHECK_EXTRA || '').split(',').filter(Boolean)) vm.runInContext(fs.readFileSync(f, 'utf8'), sb, { filename: f });
const PX = sb.PX, D = sb.PSDATA;
const args = Object.fromEntries(process.argv.slice(2).map(a => a.split('=')).map(([k, v]) => [k, (v || '').split(',').filter(Boolean)]));
const bad = [];
let n = 0;
const draw = (L, P) => PX.buildPlant(L, P || {}).a.join('|');
const poses = [{}, { eyes: 'happy', mouth: 'open', arms: 'up' }, { eyes: 'blink' }, { walk: true, frame: 1 }, { arms: 'out' }, { arms: 'paddle', frame: 1 }, { eyes: 'closed', mouth: 'o' }, { eyes: 'sad', mouth: 'flat' }, { eyes: 'brave', mouth: 'grin' }, { arms: 'hold' }];
const partRep = {};
for (const [id, P] of Object.entries(D.PLANTS)) if (!partRep[P.part]) partRep[P.part] = id;
const bodies = ['peashooter', 'sunflower', 'wallnut', 'chomper', 'puffshroom', 'cactus', 'lilypad', 'cabbagepult', 'squash', 'snapdragon', 'kernelpult', 'bonkchoy'].filter(id => D.PLANTS[id]);
const tryIt = (label, fn) => { const e0 = errors.length; try { fn(); n++; } catch (e) { bad.push(label + ': ' + e.message); } if (errors.length > e0) bad.push(label + ': ' + errors.slice(e0).map(x => x.split('\n')[0]).join(' / ')); };
for (const sp of args.plants || []) {
  if (!D.PLANTS[sp]) { bad.push('plant ' + sp + ' is not in data.js'); continue; }
  // (no PX.PLANT_ART is fine for a Poké Garden species drawn by its sprite: art-core.js falls back to a stand-in chibi, drawn below)
  if (!PX.PLANT_ART[sp]) console.log(`  (${sp}: no chibi art of its own, so the stand-in chibi is drawn)`);
  else if (!PX.PLANT_PAL[sp]) bad.push('plant ' + sp + ': has PX.PLANT_ART but no PX.PLANT_PAL entry');
  for (let st = 0; st < 3; st++) {
    let plain = null;
    tryIt(`${sp} stage ${st}`, () => { plain = draw({ species: sp, stage: st }); });
    for (const P of poses) tryIt(`${sp} stage ${st} pose ${JSON.stringify(P)}`, () => draw({ species: sp, stage: st }, P));
    for (const el of Object.keys(D.ELEMENT_INFO)) tryIt(`${sp} ${st} element ${el}`, () => { if (draw({ species: sp, stage: st, element: el }) === plain && el !== 'normal') bad.push(`${sp}: element ${el} doesn't change the look`); });
    for (const it of Object.keys(D.FUSION_ITEMS)) tryIt(`${sp} ${st} + item ${it}`, () => { if (draw({ species: sp, stage: st, fuse: { item: it } }) === plain) bad.push(`${sp} stage ${st}: item ${it} doesn't show`); });
    for (const other of Object.values(partRep)) { tryIt(`${sp} ${st} + ${other}`, () => draw({ species: sp, stage: st, fuse: { with: other } })); tryIt(`${other} ${st} + ${sp}`, () => draw({ species: other, stage: st, fuse: { with: sp } })); }
    for (const sk of Object.keys(D.SKINS)) tryIt(`${sp} ${st} skin ${sk}`, () => draw({ species: sp, stage: st, skin: sk }));
    tryIt(`${sp} ${st} everything`, () => draw({ species: sp, stage: st, shiny: true, element: 'fire', fuse: { item: 'crown' }, skin: 'gold' }));
  }
  for (const k of Object.keys(D.SEEDS)) tryIt(`seed packet ${k}:${sp}`, () => PX.item('egg', k + ':' + sp));
  tryIt(`plant icon ${sp}`, () => PX.item('plant', sp));
}
for (const z of args.zombies || []) {
  if (!D.ZOMBIES[z]) { bad.push('zombie ' + z + ' is not in data.js'); continue; }
  if (!PX.ZOMBIE_ART[z]) bad.push('zombie ' + z + ': no PX.ZOMBIE_ART entry (it would draw as a basic zombie)');
  for (const P of poses.concat([{ arms: 'up' }])) for (const sk of [null, 'gold', 'crystal', 'galaxy', 'rainbow']) tryIt(`zombie ${z} ${JSON.stringify(P)} ${sk || ''}`, () => PX.buildZombie(sk ? { zombie: z, skin: sk } : { zombie: z }, P));
}
for (const part of args.parts || []) {
  const partner = Object.keys(D.PLANTS).find(id => D.PLANTS[id].part === part);
  if (!PX.PART_IDS.includes(part)) bad.push(`part ${part}: not in art-core.js PART`);
  if (!partner) { bad.push(`part ${part}: no plant in data.js uses it`); continue; }
  for (const b of bodies) for (let st = 0; st < 3; st++) for (const P of [{}, { walk: true, frame: 1 }, { arms: 'up' }]) tryIt(`${b} ${st} + ${partner} (${part})`, () => draw({ species: b, stage: st, fuse: { with: partner } }, P));
}
for (const it of args.items || []) {
  if (!D.FUSION_ITEMS[it]) { bad.push(`item ${it} is not in data.js`); continue; }
  if (!PX.ITEM_FX_IDS.includes(it)) bad.push(`item ${it}: not in art-core.js ITEM (no costume)`);
  if (!(PX.FUSION_ICON && PX.FUSION_ICON[it])) bad.push(`item ${it}: no PX.FUSION_ICON (shop icon)`);
  tryIt(`item icon ${it}`, () => PX.item('fitem', it));
  for (const b of bodies) for (let st = 0; st < 3; st++) for (const P of [{}, { walk: true, frame: 1 }, { arms: 'up' }]) tryIt(`${b} ${st} + item ${it}`, () => { const plain = draw({ species: b, stage: st }, P); if (draw({ species: b, stage: st, fuse: { item: it } }, P) === plain) bad.push(`${b} ${st}: item ${it} doesn't show`); });
}
for (const m of args.maps || []) {
  if (!D.GARDEN_MAPS[m]) { bad.push(`map ${m} is not in data.js GARDEN_MAPS`); continue; }
  if (!(PX.GARDEN_MAPS || {})[m]) bad.push(`map ${m}: no PX.GARDEN_MAPS theme`);
  if (!(PX.RACE_MAPS || {})[m]) bad.push(`map ${m}: no PX.RACE_MAPS race scenery`);
  const th = (PX.GARDEN_MAPS || {})[m];
  if (th && th.facade) tryIt(`map ${m} home facade`, () => { const c = PX.pvzHouse(th.facade); if (!c.meta || !c.meta.door) bad.push(`map ${m}: home has no door position`); });
  if (th) for (const pr of [].concat(th.props || []).map(p => Array.isArray(p) ? p[0] : p).filter(k => typeof k === 'string')) tryIt(`map ${m} prop ${pr}`, () => { PX.prop(pr, 'day'); PX.prop(pr, 'night'); });
}
// explore=<themes>|all (Poké Garden Explore mode; the themes, heroes and NPC kinds come from data.js EXPLORE and the spec)
if (args.explore) {
  const X = D.EXPLORE || {}, THEMES = [...new Set((X.AREAS || []).map(A => A.theme))];
  const themes = args.explore.includes('all') ? THEMES : args.explore;
  const KINDS = ['ground', 'path', 'grass', 'flowers', 'tree', 'rock', 'water', 'shore', 'fence', 'sign', 'bridge'], FRAMES = { grass: 2, flowers: 2, water: 4 };
  const isCanvas = (c, what) => { if (!c || !(c.width > 0) || !(c.height > 0)) bad.push(`${what}: no canvas (or a 0-size one)`); return c; };
  for (const fn of ['exploreTile', 'exploreBuilding', 'exploreHero', 'exploreNPC', 'exploreIcon']) if (typeof PX[fn] !== 'function') bad.push(`PX.${fn} is missing (art-explore.js)`);
  for (const th of themes) {
    if (!THEMES.includes(th)) bad.push(`explore theme ${th}: no EXPLORE area uses it`);
    if (typeof PX.exploreTile === 'function') for (const k of KINDS) for (let f = 0; f < (FRAMES[k] || 1); f++) tryIt(`explore tile ${th} ${k} ${f}`, () => isCanvas(PX.exploreTile(th, k, f), `explore tile ${th} ${k} ${f}`));
    if (typeof PX.exploreBuilding === 'function') for (const b of ['center', 'mart', 'shrine']) tryIt(`explore building ${b} ${th}`, () => { const c = isCanvas(PX.exploreBuilding(b, th), `building ${b} ${th}`);
      if (c && (!Array.isArray(c.door) || !Array.isArray(c.foot))) bad.push(`building ${b} ${th}: needs c.door [x, y] and c.foot [w, h]`); });
  }
  const DIRS = ['down', 'up', 'left', 'right'];
  if (typeof PX.exploreHero === 'function') for (const h of (X.HEROES || []).map(h => h.id)) for (const d of DIRS) for (let f = 0; f < 4; f++) tryIt(`hero ${h} ${d} ${f}`, () => isCanvas(PX.exploreHero(h, d, f), `hero ${h} ${d} ${f}`));
  const npcs = ['nurse', 'clerk', ...new Set((X.AREAS || []).flatMap(A => (A.trainers || []).map(T => T.cls)))];
  if (typeof PX.exploreNPC === 'function') for (const k of npcs) for (const d of DIRS) for (let f = 0; f < 4; f++) tryIt(`npc ${k} ${d} ${f}`, () => isCanvas(PX.exploreNPC(k, d, f), `npc ${k} ${d} ${f}`));
  if (typeof PX.exploreIcon === 'function') for (const k of ['pokeball', 'greatball', 'ultraball', 'potion', 'superpotion', 'revive', 'bag', 'map', 'center']) tryIt(`explore icon ${k}`, () => isCanvas(PX.exploreIcon(k), `explore icon ${k}`));
}
// aquarium: fish=a,b decor=c backdrops=d sands=e (each drawn straight, so a mistake shows its real error)
const aquaOne = (kind, A, id, run) => { if (!A) { bad.push(`${kind} ${id}: not drawn (no entry)`); return; } for (const f of [0, 1]) tryIt(`${kind} ${id} frame ${f}`, () => PX.hires(() => run(A, f))); };
for (const id of args.fish || []) aquaOne('fish', PX.FISH_ART[id], id, (A, f) => { if (!(A.w > 0 && A.h > 0)) throw new Error('needs w and h'); const g = new PX.Grid(A.w, A.h); A.draw(g, f); g.outerLine(); g.canvas(); });
for (const id of args.decor || []) aquaOne('decor', PX.DECOR_ART[id], id, (A, f) => { if (!(A.w > 0 && A.h > 0)) throw new Error('needs w and h'); const g = new PX.Grid(A.w, A.h); A.draw(g, f); g.outerLine(); g.canvas(); });
for (const id of args.backdrops || []) aquaOne('backdrop', PX.AQUA_BACKDROP[id], id, (A, f) => { if (!Array.isArray(A.water) || A.water.length < 3) throw new Error('needs water: [top, mid, deep]'); for (const [w, h] of [[240, 135], [320, 150], [200, 160]]) { const g = new PX.Grid(w, h); if (A.draw) A.draw(g, w, h, f); g.canvas(); } });
for (const id of args.sands || []) { const S = PX.AQUA_SAND[id]; if (!S || !Array.isArray(S.ramp) || S.ramp.length < 3) bad.push(`sand ${id}: needs ramp: [light, mid, dark]`); }
for (const k of ['fish', 'decor', 'backdrop', 'sand']) for (const id of args[k === 'backdrop' ? 'backdrops' : k === 'sand' ? 'sands' : k] || []) tryIt(`${k} icon ${id}`, () => PX.item(k, id));
// trainers=brock,misty (Poké Garden people, art-trainers.js): both frames drawn straight on the 24 x 34 grid, then through PX.trainer
for (const id of args.trainers || []) {
  const A = PX.TRAINER_ART && PX.TRAINER_ART[id]; if (!A) { bad.push(`trainer ${id}: not drawn (no PX.TRAINER_ART entry)`); continue; }
  for (const f of [0, 1]) tryIt(`trainer ${id} frame ${f}`, () => PX.hires(() => { const g = new PX.Grid(24, 34); A.draw(g, f); g.outerLine(); g.canvas(); }));
  for (const f of [0, 1]) tryIt(`trainer ${id} PX.trainer ${f}`, () => { if (!PX.trainer(id, f)) throw new Error('PX.trainer returned nothing'); });
}
errors.length && !bad.length && bad.push(...errors.map(e => 'drawing error: ' + e.split('\n')[0]));
bad.slice(0, 60).forEach(b => console.log('  ✗ ' + b));
if (bad.length > 60) console.log(`  …and ${bad.length - 60} more`);
console.log(bad.length ? `${bad.length} problem(s)` : `OK: ${n.toLocaleString()} drawings clean`);
process.exit(bad.length ? 1 : 0);
