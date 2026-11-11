#!/usr/bin/env node
// check_pvz.js — pre-publish checks for PVZ Garden. tools/build_pvz.py runs it before every build and stops if it fails.
// Run by hand:  node tools/check_pvz.js
//   1. every game script parses
//   2. content tables only point at things that exist (moves, plants, zombies, elements, items, unlocks, leagues…)
//   3. every plant (each stage, element, fusion, skin), zombie, Zomboss, element sprite, seed packet and icon draws without errors
//   4. new, current and damaged saves load without losing progress; migration is repeatable
//   5. backup codes survive a round trip; the rules (planting, elements, fusion, gumballs, unlocks) run on a loaded save
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const SRC = path.join(__dirname, '..', 'pvz-garden');
let failures = 0;
const fail = msg => { failures++; console.log('  ✗ ' + msg); };
const ok = msg => console.log('  ✓ ' + msg);
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');
// art files in the order index.html loads them (the v2 files depend on that order: kit -> runtime -> sprite sheets); any art file
// index.html doesn't list is added after, alphabetically (the "index.html does not load" check below reports it anyway)
const ART_FILES = (() => {
  const all = fs.readdirSync(SRC).filter(f => /^art-.*\.js$/.test(f)), listed = [...fs.readFileSync(path.join(SRC, 'index.html'), 'utf8').matchAll(/src="(art-[A-Za-z0-9-]+\.js)"/g)].map(m => m[1]).filter(f => all.includes(f));
  return ['pixel.js', ...listed, ...all.filter(f => !listed.includes(f)).sort()];
})();

// ---------- 1. syntax ----------
console.log('Scripts');
const scripts = fs.readdirSync(SRC).filter(f => f.endsWith('.js') && !f.startsWith('_'));
let parsed = 0;
for (const f of scripts) { try { new vm.Script(read(f), { filename: f }); parsed++; } catch (e) { fail(`${f}: ${e.message}`); } }
if (parsed === scripts.length) ok(`${parsed} scripts parse`);
const html = read('index.html');
for (const f of scripts) if (f !== 'version.js' && !html.includes(`src="${f}"`)) fail(`index.html does not load ${f}`);
if (failures) { console.log(`\n${failures} problem(s) found.`); process.exit(1); }

// ---------- sandboxes ----------
function fakeCanvas() {
  const c = { width: 0, height: 0 };
  const g = { fillStyle: '#000', globalAlpha: 1, imageSmoothingEnabled: false, fillRect() {}, clearRect() {}, drawImage() {}, putImageData() {}, save() {}, restore() {}, translate() {}, scale() {}, beginPath() {}, rect() {}, clip() {}, setTransform() {},
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }), getImageData: (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }), measureText: () => ({ width: 10 }), fillText() {}, strokeText() {} };
  c.getContext = () => g;
  return c;
}
function artSandbox() {
  const errors = [];
  const sb = { console: { log() {}, warn() {}, error: (...a) => errors.push(a.map(x => (x && x.stack) || String(x)).join(' ')) }, document: { createElement: () => fakeCanvas() }, navigator: {},
    Math, JSON, Map, Set, WeakMap, Array, Object, Number, String, Boolean, Error, parseInt, parseFloat, isNaN, isFinite, Uint8ClampedArray, Uint32Array, Float32Array };
  sb.window = sb; sb.self = sb;
  vm.createContext(sb);
  for (const f of ART_FILES.concat(['data.js'])) vm.runInContext(read(f), sb, { filename: f });
  return { PX: sb.PX, D: sb.PSDATA, errors };
}
function stateSandbox(store, slot) {
  const events = [];
  const sb = {
    console: { log() {}, warn() {}, error() {} }, Math, JSON, Date, Object, Array, Set, Map, WeakMap, Number, String, Boolean, Error, Promise, parseInt, parseFloat, isNaN, isFinite, URLSearchParams,
    Uint8Array, Uint8ClampedArray, Blob, Response, TextEncoder, TextDecoder, CompressionStream, DecompressionStream, btoa, atob,
    localStorage: {
      getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; },
      key: i => Object.keys(store)[i] || null, get length() { return Object.keys(store).length; },
    },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    location: { search: slot ? '?save=' + slot : '', href: 'http://localhost/', reload() {} },
    setInterval: () => 0, setTimeout: () => 0, clearTimeout() {},
    document: { addEventListener() {} }, navigator: {},
  };
  sb.window = sb; sb.self = sb; sb.addEventListener = () => {};
  vm.createContext(sb);
  for (const f of ['data.js', 'state.js', 'battle.js']) vm.runInContext(read(f), sb, { filename: f });
  sb.PS.on('save:failed', () => events.push('save:failed'));
  return { PS: sb.PS, D: sb.PSDATA, battle: sb.__battle, events };
}

// ---------- 2. content tables ----------
console.log('Content');
const { PX, D, errors: artErrors } = artSandbox();
{
  const bad = [];
  const mv = (id, where) => { if (!D.MOVES[id]) bad.push(`missing move "${id}" (${where})`); };
  for (const m of Object.values(D.MOVES)) if (!D.ELEMENTS[m.el]) bad.push(`move ${m.name}: unknown type ${m.el}`);
  for (const [k, E] of Object.entries(D.ELEMENTS)) for (const s of E.strong) if (!D.ELEMENTS[s]) bad.push(`type ${k}: strong vs unknown "${s}"`);
  for (const [k, R] of Object.entries(D.ROLES)) { if (R.moves.length !== 3) bad.push(`role ${k}: needs moves for 3 stages`); R.moves.forEach((st, i) => { if (st.length !== 2) bad.push(`role ${k} stage ${i}: needs 2 moves`); st.forEach(m => mv(m, 'role ' + k)); }); }
  const parts = new Set(PX.PART_IDS || []);
  for (const [k, P] of Object.entries(D.PLANTS)) {
    if (!PX.PLANT_ART[k]) bad.push(`plant ${k}: no art`);
    if (!PX.PLANT_PAL[k]) bad.push(`plant ${k}: no colours`);
    if (P.names.length !== 3 || P.sig.length !== 3) bad.push(`plant ${k}: needs 3 stage names and 3 signature moves`);
    P.sig.forEach(m => mv(m, 'plant ' + k));
    if (!D.ELEMENTS[P.el]) bad.push(`plant ${k}: unknown type ${P.el}`);
    if (!D.ROLES[P.role]) bad.push(`plant ${k}: unknown role ${P.role}`);
    if (!parts.has(P.part)) bad.push(`plant ${k}: fusion part "${P.part}" isn't drawn by art-core.js`);
    if (!(P.price > 0)) bad.push(`plant ${k}: needs a price`);
    for (const st of Object.keys(P.bias)) if (!D.STATS.includes(st)) bad.push(`plant ${k}: bias for unknown stat ${st}`);
    for (const sg of Object.keys(P.race)) if (!D.RACE_STAT[sg]) bad.push(`plant ${k}: race bonus for unknown segment ${sg}`);
  }
  for (const s of D.STARTERS) if (!D.PLANTS[s]) bad.push(`starter ${s} doesn't exist`);
  // every plant that isn't a starter is unlocked by exactly one reward
  const unlockOf = {};
  for (const [key, sp] of Object.entries(D.UNLOCKS)) {
    // (a reward can also be a garden map: 'map:<id>')
    if (typeof sp === 'string' && sp.startsWith('map:')) { if (!(D.GARDEN_MAPS || {})[sp.slice(4)]) bad.push(`unlock ${key}: map "${sp.slice(4)}" doesn't exist`); continue; }
    if (sp !== 'starter' && !D.PLANTS[sp]) bad.push(`unlock ${key}: plant "${sp}" doesn't exist`);
    if (sp !== 'starter') { if (unlockOf[sp]) bad.push(`plant ${sp} is unlocked twice (${unlockOf[sp]} and ${key})`); unlockOf[sp] = key; }
    const [kind, id] = key.split(':');
    if (kind === 'league' && !D.LEAGUES.some(l => l.id === id)) bad.push(`unlock ${key}: league doesn't exist`);
    if (kind === 'cup' && !D.PLANT_LEAGUES.some(l => l.id === id)) bad.push(`unlock ${key}: cup doesn't exist`);
    if (kind === 'race' && !/-[012]$/.test(id)) bad.push(`unlock ${key}: needs a tier`);
  }
  // legendary plants are won in Survival (D.SURVIVAL rewards)
  for (const M of D.SURVIVAL || []) { if (!D.PLANTS[M.reward]) bad.push(`survival ${M.id}: plant ${M.reward} doesn't exist`); else if (unlockOf[M.reward]) bad.push(`plant ${M.reward} is unlocked twice`); else unlockOf[M.reward] = 'survival:' + M.id;
    if (!(D.GARDEN_MAPS || {})[M.map]) bad.push(`survival ${M.id}: map ${M.map} doesn't exist`); for (const z of M.pool) if (!D.ZOMBIES[z]) bad.push(`survival ${M.id}: zombie ${z} doesn't exist`); if (M.unlock && !D.SURVIVAL.some(x => x.id === M.unlock)) bad.push(`survival ${M.id}: unlock doesn't exist`); }
  for (const k of Object.keys(D.PLANTS)) if (!D.STARTERS.includes(k) && !unlockOf[k]) bad.push(`plant ${k} can never be unlocked`);
  if (Object.values(D.UNLOCKS).filter(x => x === 'starter').length < D.STARTERS.length - 1) bad.push('not enough rewards give the other starter plants');
  for (const [k, E] of Object.entries(D.ELEMENT_INFO)) { if (!D.ELEMENTS[k]) bad.push(`element ${k}: not a battle type`); if (E.moves.length !== 3) bad.push(`element ${k}: needs 3 moves`); E.moves.forEach(m => mv(m, 'element ' + k)); }
  for (const [a, list] of Object.entries(D.AREA_ELEMENTS)) { if (!D.AREAS[a]) bad.push(`AREA_ELEMENTS: unknown garden ${a}`); for (const [el, where, time] of list) { if (!D.ELEMENT_INFO[el]) bad.push(`${a}: unknown element ${el}`); if (!['land', 'coast', 'water', 'air'].includes(where)) bad.push(`${a}: bad place ${where}`); if (!['day', 'night', 'any'].includes(time)) bad.push(`${a}: bad time ${time}`); } }
  for (const el of Object.keys(D.ELEMENT_INFO)) if (!Object.values(D.AREA_ELEMENTS).some(list => list.some(x => x[0] === el))) bad.push(`element ${el} never appears in any garden`);
  for (const a of D.AREA_ORDER) if (!D.AREA_ELEMENTS[a]) bad.push(`garden ${a} has no element sprites`);
  for (const [k, I] of Object.entries(D.FUSION_ITEMS)) { mv(I.move, 'item ' + k); if (!D.ELEMENTS[I.el]) bad.push(`item ${k}: unknown type`); if (!(PX.ITEM_FX_IDS || []).includes(k)) bad.push(`item ${k}: no look in art-core.js`); if (!/\{stage\}|\{pre\}/.test(I.form)) bad.push(`item ${k}: form name needs {stage} or {pre}`); }
  { // every Zomboss in battle.js has art (BOSS_ART ids are read from the BOSSES table's source)
    const src = read('battle.js'), ids = [...src.slice(src.indexOf('const BOSSES = ['), src.indexOf('const BOSS_PRIZE')).matchAll(/\{ id: '([a-z]+)'/g)].map(m => m[1]);
    for (const id of ids) if (!(PX.BOSS_ART && PX.BOSS_ART[id])) bad.push(`Zomboss ${id}: no art`);
  }
  for (const [k, Z] of Object.entries(D.ZOMBIES)) { Z.moves.forEach(m => mv(m, 'zombie ' + k)); Z.el.forEach(e => { if (!D.ELEMENTS[e]) bad.push(`zombie ${k}: unknown type ${e}`); }); if (!PX.ZOMBIE_ART[k]) bad.push(`zombie ${k}: no art`); }
  for (const L of D.LEAGUES) { if (L.unlock && !D.LEAGUES.some(x => x.id === L.unlock)) bad.push(`league ${L.id}: unlock doesn't exist`); for (const o of L.opponents) if (!D.ZOMBIES[o.zombie]) bad.push(`league ${L.id}: zombie ${o.zombie} doesn't exist`); }
  for (const L of D.PLANT_LEAGUES) { if (L.unlock && !D.PLANT_LEAGUES.some(x => x.id === L.unlock)) bad.push(`cup ${L.id}: unlock doesn't exist`); for (const o of L.opponents) { if (!D.PLANTS[o.species]) bad.push(`cup ${L.id}: plant ${o.species} doesn't exist`); if (o.element && !D.ELEMENT_INFO[o.element]) bad.push(`cup ${L.id}: element ${o.element}`); if (o.fuse && o.fuse.item && !D.FUSION_ITEMS[o.fuse.item]) bad.push(`cup ${L.id}: item ${o.fuse.item}`); if (o.fuse && o.fuse.with && !D.PLANTS[o.fuse.with]) bad.push(`cup ${L.id}: fuse plant ${o.fuse.with}`); } }
  for (const R of D.RACES) { if (R.unlock && !D.RACES.some(x => x.id === R.unlock.race)) bad.push(`race ${R.id}: unlock race doesn't exist`); if (!D.AREAS[R.area]) bad.push(`race ${R.id}: unknown garden`); }
  for (const [k, e] of Object.entries(D.SEEDS)) { if (e.skin && !D.SKINS[e.skin]) bad.push(`seed ${k}: skin "${e.skin}" missing from SKINS`); if (e.hatchWith && e.hatchWith !== 'random' && !D.ELEMENT_INFO[e.hatchWith]) bad.push(`seed ${k}: element ${e.hatchWith}`); }
  for (const k of Object.keys(D.SKINS)) if (!(PX.SKIN_LIST || []).includes(k)) bad.push(`skin ${k}: not drawn by art-core.js`);
  for (const list of ['SHOP_SEEDS', 'SPECIAL_SEEDS']) for (const id of D[list] || []) if (!D.SEEDS[id] || id === 'normal') bad.push(`${list}: seed "${id}" doesn't exist`);
  const PRIZES = ['coins', 'fruit', 'goldfruit', 'shard', 'core', 'seed', 'fitem', 'specialseed', 'goldenseed', 'rainbowseed', 'aqua'];
  for (const [t, g] of Object.entries(D.GUMBALL)) for (const [p, w] of g.prizes) { if (!PRIZES.includes(p)) bad.push(`gumball ${t}: unknown prize "${p}"`); if (!(w > 0)) bad.push(`gumball ${t}: prize ${p} has no weight`); }
  for (const f of Object.values(D.FRUITS)) for (const st of Object.keys(f.gives)) if (!D.STATS.includes(st)) bad.push(`fruit ${f.name}: unknown stat ${st}`);
  // battle animations: every move named in battle.js's animation tables exists, and every style has a case in animMove
  {
    const src = read('battle.js'), a = src.indexOf('const ANIM = {'), b = src.indexOf('function animOf(');
    const tables = a > 0 && b > a ? src.slice(a, b) : '';
    if (!tables) bad.push('battle.js: animation tables not found');
    const moveTable = tables.slice(0, Math.max(0, tables.indexOf('const SUPPORT = {')));
    for (const m of moveTable.matchAll(/\b([a-z0-9]+): \{ s: '/g)) if (!D.MOVES[m[1]]) bad.push(`battle animation for unknown move "${m[1]}"`);
    for (const m of tables.matchAll(/'([a-z0-9]+)'/g)) if (/^(z|b)?[a-z0-9]+$/.test(m[1]) && tables.includes(`['${m[1]}'`) && !D.MOVES[m[1]]) bad.push(`battle support animation for unknown move "${m[1]}"`);
    const body = src.slice(src.indexOf('function animMove('), src.indexOf('function animSupport('));
    for (const st of new Set([...tables.matchAll(/s: '([a-z]+)'/g)].map(m => m[1]))) if (!['shield', 'suns', 'hex', 'disco', 'power'].includes(st) && !body.includes(`case '${st}'`)) bad.push(`battle animation style "${st}" has no case in animMove`);
  }
  for (const [role, list] of Object.entries(D.BONUS_MOVES)) { if (!D.ROLES[role]) bad.push(`BONUS_MOVES: unknown kind of plant ${role}`); if (list.length !== 4) bad.push(`BONUS_MOVES.${role}: needs 4 moves`); list.forEach(m => mv(m, 'level-up ' + role)); }
  for (const r of Object.keys(D.ROLES)) if (!D.BONUS_MOVES[r]) bad.push(`BONUS_MOVES: no level-up moves for ${r}`);
  [].concat(...D.PLANT_TYPE_MOVES, D.SPARE_MOVES, D.STRONG_SPARES, ...Object.values(D.ALT_ATTACKS)).forEach(m => mv(m, 'level-up spare'));
  if (D.LEVEL_MOVES.length !== 6 || D.LEVEL_MOVES.some((v, i) => i && v <= D.LEVEL_MOVES[i - 1])) bad.push('LEVEL_MOVES must be 6 rising levels');
  // My Aquarium
  {
    const A = D.AQUA, swims = ['swim', 'school', 'hide', 'bottom', 'cruise', 'hover', 'jelly', 'crawl', 'glass', 'snail'], anims = [null, 'sway', 'open', 'bubbles'], cleans = [null, 'glass', 'sand', 'graze'];
    for (const [k, F] of Object.entries(A.FISH)) {
      if (!A.RARITY[F.rarity]) bad.push(`aquarium fish ${k}: unknown rarity ${F.rarity}`);
      if (!swims.includes(F.swim)) bad.push(`aquarium fish ${k}: unknown swim style ${F.swim}`);
      if (F.rarity === 'legendary' ? F.price : !(F.price > 0)) bad.push(`aquarium fish ${k}: legendary fish are prizes only (price 0); the others need a price`);
      if (!F.fact) bad.push(`aquarium fish ${k}: needs a fun fact`);
      if (!cleans.includes(F.clean == null ? null : F.clean)) bad.push(`aquarium fish ${k}: unknown cleaning job ${F.clean}`);
    }
    for (const [k, I] of Object.entries(A.DECOR)) { if (!A.RARITY[I.rarity]) bad.push(`aquarium decoration ${k}: unknown rarity`); if (!anims.includes(I.anim)) bad.push(`aquarium decoration ${k}: unknown anim ${I.anim}`); if (I.rarity === 'legendary' ? I.price : !(I.price > 0)) bad.push(`aquarium decoration ${k}: price`); }
    for (const k of A.WELCOME.fish) if (!A.FISH[k]) bad.push(`aquarium welcome gift: no fish ${k}`);
    for (const k of A.WELCOME.decor) if (!A.DECOR[k]) bad.push(`aquarium welcome gift: no decoration ${k}`);
    for (const it of A.WELCOME.at || []) if (!A.WELCOME.decor.includes(it.id) || !(it.x >= 0 && it.x <= 1 && it.d >= 0 && it.d <= 1)) bad.push(`aquarium welcome spot for ${it.id}`);
    if (!(A.TANK.items > 0)) bad.push('aquarium: TANK.items (decorations on the sand) must be set');
    if (!Object.values(A.BACKDROPS).some(b => b.free) || !Object.values(A.SANDS).some(b => b.free)) bad.push('aquarium: needs a free backdrop and a free sand');
    for (const r of Object.keys(A.PRIZE.odds.small)) if (!Object.values(A.FISH).some(F => F.rarity === r)) bad.push(`aquarium prizes: no ${r} fish to win`);
    if (A.NAMES.length < A.TANK.maxFish) bad.push('aquarium: needs more fish names');
    for (const k of ['perHour', 'cleanerK', 'awayEat', 'maxAlgae', 'maxGunk', 'rub', 'eat', 'graze', 'murk']) if (!(A.DIRT[k] > 0)) bad.push(`aquarium DIRT.${k} must be set`);
    if (!Object.values(A.FISH).some(F => F.clean === 'glass' && F.price > 0)) bad.push('aquarium: the shop needs a glass cleaner (a snail)');
    if (!A.FISH.turbosnail) bad.push('aquarium: the cleanup crew gift needs the Turbo Snail');
    if (!(A.FULL.bites > 0 && A.FULL.sec > 0)) bad.push('aquarium FULL must be set');
    for (const k of ['chest', 'pearl', 'visitorSec', 'scare']) if (!(Array.isArray(A.FUN[k]) && A.FUN[k][0] > 0 && A.FUN[k][1] >= A.FUN[k][0])) bad.push(`aquarium FUN.${k} must be [min, max]`);
    for (const k of Object.keys(A.FUN.glow)) if (!A.FISH[k] && !A.DECOR[k]) bad.push(`aquarium FUN.glow: ${k} is not a fish or decoration`);
    if (!D.ZOMBIES.snorkel) bad.push('aquarium: the visitor needs the Snorkel Zombie');
  }
  bad.forEach(fail);
  if (!bad.length) ok(`${Object.keys(D.PLANTS).length} plants, ${Object.keys(D.ZOMBIES).length} zombies, ${Object.keys(D.MOVES).length} moves, ${Object.keys(D.ELEMENT_INFO).length} elements, ${Object.keys(D.FUSION_ITEMS).length} fusion items, ${D.LEAGUES.length + D.PLANT_LEAGUES.length} leagues: all references exist`);
}

// ---------- 3. art ----------
console.log('Art');
{
  const bad = [];
  let n = 0;
  const draw = (L, P) => PX.buildPlant(L, P || {}).a.join('|');
  const PART_REPS = [...new Set(Object.values(D.PLANTS).map(P => P.part))].map(p => Object.keys(D.PLANTS).find(id => D.PLANTS[id].part === p));
  const FUSE_BODIES = ['peashooter', 'wallnut', 'chomper', 'puffshroom', 'lilypad', 'squash'].filter(id => D.PLANTS[id]);
  const poses = [{}, { eyes: 'happy', mouth: 'open', arms: 'up' }, { eyes: 'blink' }, { walk: true, frame: 1 }, { arms: 'out' }, { arms: 'paddle', frame: 1 }, { eyes: 'closed', mouth: 'o' }, { eyes: 'sad', mouth: 'flat' }, { eyes: 'brave', mouth: 'grin' }, { arms: 'hold' }];
  for (const sp of Object.keys(D.PLANTS)) for (let st = 0; st < 3; st++) {
    let plain = null;
    try { plain = draw({ species: sp, stage: st }); n++; } catch (e) { bad.push(`${sp} stage ${st}: ${e.message}`); continue; }
    for (const P of poses) { try { draw({ species: sp, stage: st }, P); n++; } catch (e) { bad.push(`${sp} stage ${st} pose ${JSON.stringify(P)}: ${e.message}`); } }
    for (const el of Object.keys(D.ELEMENT_INFO)) { try { const a = draw({ species: sp, stage: st, element: el }); n++; if (a === plain && el !== 'normal') bad.push(`${sp}: element ${el} doesn't change the look`); } catch (e) { bad.push(`${sp} ${el}: ${e.message}`); } }
    for (const it of Object.keys(D.FUSION_ITEMS)) { try { const a = draw({ species: sp, stage: st, fuse: { item: it } }); n++; if (a === plain) bad.push(`${sp} stage ${st}: item ${it} doesn't show`); } catch (e) { bad.push(`${sp} + ${it}: ${e.message}`); } }
    // fused with one plant of every fusion part (each part draws its own way), and as the partner on a few different bodies
    for (const other of PART_REPS) { try { draw({ species: sp, stage: st, fuse: { with: other } }); n++; } catch (e) { bad.push(`${sp} + ${other}: ${e.message}`); } }
    for (const body of FUSE_BODIES) { try { draw({ species: body, stage: st, fuse: { with: sp } }); n++; } catch (e) { bad.push(`${body} + ${sp}: ${e.message}`); } }
    for (const sk of Object.keys(D.SKINS)) { try { const a = draw({ species: sp, stage: st, skin: sk }); n++; if (a === plain) bad.push(`${sp}: skin ${sk} doesn't change it`); } catch (e) { bad.push(`${sp} skin ${sk}: ${e.message}`); } }
    try { draw({ species: sp, stage: st, shiny: true, element: 'fire', fuse: { item: 'crown' }, skin: 'gold' }); n++; } catch (e) { bad.push(`${sp} everything at once: ${e.message}`); }
  }
  for (const z of Object.keys(D.ZOMBIES)) for (const P of poses.concat([{ arms: 'up' }])) for (const sk of [null, 'gold', 'crystal', 'galaxy', 'rainbow']) { try { PX.buildZombie(sk ? { zombie: z, skin: sk } : { zombie: z }, P); n++; } catch (e) { bad.push(`zombie ${z}: ${e.message}`); } }
  for (const b of Object.keys(PX.BOSS_ART || {})) for (const f of [0, 1]) { try { PX.critter(b, f); n++; } catch (e) { bad.push(`zomboss ${b}: ${e.message}`); } }
  for (const el of Object.keys(D.ELEMENT_INFO)) { for (const f of [0, 1, 2]) { try { PX.critter('el:' + el, f); PX.critterSwim('el:' + el, f); n += 2; } catch (e) { bad.push(`element sprite ${el}: ${e.message}`); } } for (const k of ['core', 'shard', 'element', 'shard:0', 'shard:1', 'shard:2', 'shard:3']) { const [kind, part] = k.split(':'); try { PX.item(kind, part == null ? el : el + ':' + part); n++; } catch (e) { bad.push(`${k} icon ${el}: ${e.message}`); } } }
  try { PX.item('element', 'plant'); n++; } catch (e) { bad.push('plant type icon: ' + e.message); }
  for (const sp of Object.keys(D.PLANTS)) for (const k of Object.keys(D.SEEDS)) { try { PX.item('egg', k + ':' + sp); n++; } catch (e) { bad.push(`seed packet ${k}:${sp}: ${e.message}`); } }
  for (const k of Object.keys(D.FUSION_ITEMS)) { try { PX.item('fitem', k); n++; } catch (e) { bad.push(`fusion icon ${k}: ${e.message}`); } }
  for (const k of Object.keys(D.FRUITS)) { try { PX.item('fruit', k); n++; } catch (e) { bad.push(`fruit icon ${k}: ${e.message}`); } }
  // the corner house in each of its three styles
  for (const kind of ['house', 'cabin', 'temple']) { try { const c = PX.pvzHouse({ kind, wall: ['#ffffff', '#cccccc', '#888888'], roof: ['#e0705a', '#b84a3a', '#86302a'], trim: '#ffffff', glass: '#8fd3f0', door: ['#b8603a', '#8a4428'], porch: ['#e4b27a', '#b8743a'], found: ['#c4c4cc', '#8e8e9c'], box: true, shutter: '#5cb43a' }); if (!c.meta || !c.meta.door) bad.push(`house ${kind}: no door position`); n++; } catch (e) { bad.push(`house ${kind}: ${e.message}`); } }
  // garden props and houses named in garden.js
  const garden = read('garden.js'), props = new Set();
  for (const m of garden.matchAll(/\['([a-z0-9]+)', 0?\.\d+, 0?\.?\d*\]/g)) props.add(m[1]);
  for (const m of garden.matchAll(/(?:tree|home): \['?([a-z]+)'?/g)) props.add(m[1]);
  for (const k of props) { if (k === 'gumball') continue; const known = (PX.PVZ_PROP && PX.PVZ_PROP[k]) || (PX.PVZ_HOME && PX.PVZ_HOME[k]) || ['bigtree', 'tree', 'palm', 'bush', 'bench', 'rock', 'flowerbed', 'umbrella', 'shells', 'rockpool', 'driftwood', 'glowshroom', 'lantern', 'mushrooms', 'fern', 'glowtree', 'sandcastle', 'crystal'].includes(k); if (!known) bad.push(`garden prop "${k}" has no art`); else { try { PX.prop(k, 'day'); PX.prop(k, 'night'); n += 2; } catch (e) { bad.push(`prop ${k}: ${e.message}`); } } }
  // My Aquarium: every fish (and puffed-up pufferfish), decoration, backdrop and sand, both frames, plus their shop icons
  for (const k of Object.keys(D.AQUA.FISH).concat(Object.keys(PX.FISH_ART || {}).filter(k => k.includes(':')))) { if (!PX.FISH_ART[k]) bad.push(`aquarium fish ${k} has no art`); for (const f of [0, 1]) { try { PX.aquaSprite('fish', k, f); n++; } catch (e) { bad.push(`aquarium fish ${k}: ${e.message}`); } } }
  for (const k of Object.keys(D.AQUA.DECOR)) { if (!PX.DECOR_ART[k]) bad.push(`aquarium decoration ${k} has no art`); for (const f of [0, 1]) { try { PX.aquaSprite('decor', k, f); n++; } catch (e) { bad.push(`aquarium decoration ${k}: ${e.message}`); } } }
  for (const k of Object.keys(D.AQUA.BACKDROPS)) { if (!PX.AQUA_BACKDROP[k]) bad.push(`aquarium backdrop ${k} has no art`); for (const [w, h] of [[150, 230], [240, 135]]) { try { PX.aquaBackdrop(k, w, h); n++; } catch (e) { bad.push(`aquarium backdrop ${k}: ${e.message}`); } } }
  for (const k of Object.keys(D.AQUA.SANDS)) if (!PX.AQUA_SAND[k]) bad.push(`aquarium sand ${k} has no colours`);
  for (const [kind, tbl] of [['fish', D.AQUA.FISH], ['decor', D.AQUA.DECOR], ['backdrop', D.AQUA.BACKDROPS], ['sand', D.AQUA.SANDS]]) for (const k of Object.keys(tbl)) { try { PX.item(kind, k); n++; } catch (e) { bad.push(`aquarium ${kind} icon ${k}: ${e.message}`); } }
  artErrors.forEach(e => bad.push('drawing error: ' + e.split('\n')[0]));
  bad.slice(0, 25).forEach(fail); if (bad.length > 25) fail(`…and ${bad.length - 25} more art problems`);
  if (!bad.length) ok(`${n.toLocaleString()} plants, zombies, sprites, seed packets and icons draw cleanly`);
}

// ---------- 3b. illustrated art (art-hd-manifest.js) ----------
// Only sprite sheets registered in the manifest ship. Each must exist with exactly that spelling, be a PNG / WebP with
// transparency and have exactly the sheet size art-hd-loader.js expects (tools/art_hd_check.js has the rules).
console.log('Illustrated art');
{
  const r = require('./art_hd_check.js').check(SRC, { plants: new Set(Object.keys(D.PLANTS)), zombies: new Set(Object.keys(D.ZOMBIES)) });
  r.problems.forEach(fail);
  if (!r.problems.length) ok(r.refs.length ? `${r.refs.length} registered sprite sheet${r.refs.length === 1 ? '' : 's'} valid, ${r.files.length} image file${r.files.length === 1 ? '' : 's'} to ship` : 'no sprite sheets registered yet: the code art is used everywhere');
  r.notes.forEach(note => console.log('  · ' + note));
}

// ---------- 4. saves ----------
(async () => {
  console.log('Saves');
  const stats = (a, b, c, d, e) => ({ swim: { lv: a, xp: 3 }, fly: { lv: b, xp: 0 }, run: { lv: c, xp: 1 }, power: { lv: d, xp: 0 }, stamina: { lv: e, xp: 2 } });
  const plant = (id, name, extra) => Object.assign({ id, name, species: 'peashooter', area: 'frontyard', born: 1, kind: 'normal', look: {}, stats: stats(3, 1, 2, 4, 5), stage: 0,
    infused: { fire: 2 }, element: 'fire', fuse: null, happy: 80, energy: 100, record: { races: 3, raceWins: 1, battles: 2, battleWins: 2 } }, extra || {});
  const v1 = () => ({ v: 1, created: 1, coins: 1234, area: 'graveyard', activeId: 's1', clockOffset: 0, starter: 'peashooter',
    sprouts: [plant('s1', 'Pip'), plant('s2', 'Wren', { species: 'chomper', stage: 2, look: { skin: 'gold' }, fuse: { item: 'knight' }, infused: {}, element: null, moveset: ['biggulp', 'shieldbash'] }),
      plant('s3', 'Sunny', { species: 'sunflower', stage: 1, fuse: { with: 'peashooter', stage: 1 } })],
    eggs: [{ id: 'e1', kind: 'golden', species: 'wallnut', source: 'test', area: 'frontyard', taps: 2 }], pouch: ['fire', 'ice'], shards: { magic: 2 }, fruits: { apple: 2, goldfruit: 1 }, fitems: { crown: 1 },
    unlocked: { peashooter: 1, sunflower: 2, chomper: 3, wallnut: 4 }, prefs: { raceVs: 'plants' },
    progress: { races: { 'frontyard-0': { runs: 4, wins: 2, best: 41.2 } }, leagues: { lawn: { beaten: [true, true, false], cleared: false } }, cups: {}, rewards: { 'race:frontyard-0': 1 },
      raceExtra: { series: { 'desert-0': { runs: 3, wins: 1, best: 44.2 } }, trials: { 'frontyard-0': { best: 40.1, m: 2, runs: 3, g: [0, 10, 25, 1100], dt: 0.25, len: 1100, sid: 's1' } },
        daily: { day: '2026-09-27', best: 1, runs: 2, egg: false, total: 5, wins: 2 }, hint: { item: 2 } },
      battleExtra: { bosses: { gargantuar: { wins: 1, tries: 2, best: 3 } }, tower: { best: 7, runs: 2, run: { sid: 's1', floor: 3, hp: 0.6, pot: 120, seed: 42, snack: 'apple', snackUsed: false, started: 1, fighting: 3 } },
        friend: { day: '2026-9-27', paid: 9, played: 1 }, snack: 'apple', seen: { 'boss:gargantuar': true, tower: true } } },
    seen: { 'g:pet': true }, bestTier: 1, totals: { races: 4, raceWins: 2, battles: 2, battleWins: 2, coinsEarned: 2000, gumballs: 3, sold: 0, fusions: 2 },
    garden: { trees: { frontyard: [{ kind: 'apple', readyAt: 0 }] }, ground: { frontyard: [{ kind: 'apple', fx: 0.3, fy: 0.5 }] } } });
  const KEY = 'pvzg:save:v1:fx';
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const load = store => stateSandbox(store, 'fx');

  // a) a brand-new game: no plants, picks a starter, its seed packet grows
  {
    const store = {}, { PS } = load(store);
    if (PS.S.coins !== 1000) fail(`a new game should start with 1,000 coins (has ${PS.S.coins})`);
    PS.state.pickStarter('chomper'); const e = PS.S.eggs[0], s = e && PS.state.hatchEgg(e.id);
    if (!s || s.species !== 'chomper' || !PS.state.isUnlocked('chomper') || PS.state.isUnlocked('peashooter')) fail('new game: the starter pick did not work'); else ok('new game: starter picked and planted');
  }
  // b) a current save keeps every field, including data owned by the race/battle/garden screens; loading twice changes nothing
  {
    const s = v1(), store = { [KEY]: JSON.stringify(s) };
    const a = load(store), S = a.PS.S;
    const kept = !a.PS.loadNote && S.coins === 1234 && same(S.progress.raceExtra, s.progress.raceExtra) && same(S.progress.battleExtra, s.progress.battleExtra) && same(S.garden, s.garden)
      && same(S.pouch, s.pouch) && same(S.shards, s.shards) && same(S.fitems, s.fitems) && same(S.unlocked, s.unlocked) && S.sprouts[1].look.skin === 'gold' && S.sprouts[1].fuse.item === 'knight' && S.sprouts[2].fuse.with === 'peashooter';
    if (!kept) fail('current save: something was lost or changed while loading'); else ok('current save loads with nothing lost');
    a.PS.saveNow(); const first = store[KEY];
    const b = load(store); b.PS.saveNow();
    if (store[KEY] !== first) fail('loading a save twice changes it (migration is not repeatable)'); else ok('migration is repeatable');
    if (!store['pvzg:snap:v1:' + KEY]) fail('no automatic daily backup was made'); else ok('automatic daily backup made on load');
    if (Object.keys(store).some(k => /solunar|pocket-sprout/.test(k))) fail('PVZ Garden wrote to a Solunar Sprouts storage key'); else ok('storage keys never touch Solunar Sprouts saves');
  }
  // b2) the Backyard Pool garden was removed (2026-10-01): plants, seeds and the current garden there move to the Front Yard
  {
    const s = v1(); s.area = 'backyard'; s.sprouts[1].area = 'backyard'; s.eggs[0].area = 'backyard';
    const { PS } = load({ [KEY]: JSON.stringify(s) });
    if (PS.S.area !== 'frontyard' || PS.S.sprouts[1].area !== 'frontyard' || PS.S.eggs[0].area !== 'frontyard') fail('things in the old Backyard Pool did not move to the Front Yard'); else ok('old Backyard Pool plants and seeds move to the Front Yard');
  }
  // c) a damaged save is repaired, not wiped, and the original is kept
  {
    const s = v1(); s.sprouts.unshift(null); s.sprouts[1].stats.power = 7; s.sprouts[1].species = 'nosuchplant'; s.sprouts[2].fuse = 'oops'; s.eggs = { oops: 1 }; s.coins = 'lots'; s.pouch.push('nosuch'); s.shards = 'x';
    const store = { [KEY]: JSON.stringify(s) }, { PS } = load(store);
    if (!PS.loadNote || PS.loadNote.kind !== 'repaired') fail('damaged save: not reported as repaired');
    else if (PS.S.sprouts.length !== 3 || PS.S.sprouts[0].name !== 'Pip' || PS.S.sprouts[0].species !== 'peashooter' || PS.S.sprouts[0].stats.power.lv !== 0 || !Array.isArray(PS.S.eggs) || PS.S.pouch.includes('nosuch')) fail('damaged save: good parts were not kept');
    else if (!store['pvzg:rescue:v1:' + KEY]) fail('damaged save: original copy not kept');
    else ok('damaged save is repaired; a copy of the original is kept');
  }
  // d) an unreadable save falls back to the newest automatic backup; e) with no backup it starts fresh but keeps the text
  {
    const good = v1(), store = { [KEY]: '{"v":1,"coins":9', ['pvzg:snap:v1:' + KEY]: JSON.stringify({ list: [{ at: Date.now() - 86400000, raw: JSON.stringify(good) }] }) };
    const { PS } = load(store);
    if (!PS.loadNote || PS.loadNote.kind !== 'snapshot' || PS.S.coins !== 1234) fail('unreadable save: automatic backup not used'); else ok('unreadable save comes back from the automatic backup');
    const store2 = { [KEY]: 'not json at all' }, b = load(store2);
    if (!b.PS.loadNote || b.PS.loadNote.kind !== 'fresh' || !store2['pvzg:rescue:v1:' + KEY]) fail('unreadable save with no backup: original not kept'); else ok('unreadable save with no backup: new game, original kept');
  }
  // f) replacing a game from a backup code sticks; g) backup codes round-trip into a new player
  {
    const store = { [KEY]: JSON.stringify(v1()) }, { PS } = load(store);
    const code = await PS.backup.exportBackup('player'), obj = await PS.backup.decodeBackup(code);
    if (!/^PVZGARDEN1/.test(code)) fail('backup codes should start with PVZGARDEN1');
    obj.save.coins = 4242; PS.backup.importBackup(obj, 'replace'); PS.saveNow();
    const after = JSON.parse(store[KEY]).coins;
    if (after !== 4242) fail(`restore by "Replace": the old game was written back (coins ${after})`); else ok('"Replace" restore sticks');
  }
  {
    const store = { [KEY]: JSON.stringify(v1()) }, { PS } = load(store);
    const code = await PS.backup.exportBackup('player');
    const names = PS.backup.importBackup(await PS.backup.decodeBackup(code), 'new');
    const pl = JSON.parse(store['pvzg:players:v1']).list.find(p => p.name === names[0]);
    const copy = pl && JSON.parse(store['pvzg:save:v1:' + pl.id]);
    if (!copy || copy.coins !== 1234 || copy.sprouts.length !== 3) fail('backup code did not restore as a new player'); else ok(`backup code round-trips (${code.length} characters)`);
  }
  // h) the rules run on a loaded save: elements, fusion, moves, gumballs, buying, unlocks, battles
  {
    const store = { [KEY]: JSON.stringify(v1()) }, { PS, events, battle } = load(store);
    const st = PS.state, s = st.get('s1');
    try {
      st.absorb(s, 'ice'); if (s.element !== 'ice' || !/^Frost /.test(st.formInfo(s).name)) fail(`giving an Ice core should make a Frost plant (got ${st.formInfo(s).name})`);
      st.addShard('magic', 1); if (!PS.S.pouch.includes('magic')) fail('3 shards should make a core');
      const learned = st.learnedMoves(s), best = st.bestMoves(s);
      if (!best.length || best.length > st.MAX_MOVES || best.some(id => !learned.includes(id))) fail('best moves must be up to 4 learned moves');
      const pick = learned.slice(-2).concat(['nosuchmove']); st.setMoves(s, pick); const now = st.movesOf(s);
      if (!pick.slice(0, 2).every(id => now.includes(id)) || now.includes('nosuchmove')) fail('chosen battle moves are not used as picked');
      st.setMoves(s, st.defaultMoves(s)); if (s.moveset) fail('picking the usual moves should switch back to automatic');
      for (const id of learned) { const f = st.moveFit(s, id); if (!(f.score >= 0) || typeof f.why !== 'string') fail('moveFit gave a bad answer for ' + id); }
      PS.S.coins = 100000;
      if (st.fusePlants('s1', 's2')) fail('a fused plant must not fuse again');
      const n0 = PS.S.sprouts.length, e = st.addEgg('normal', 'test', 'wallnut'), w = st.hatchEgg(e.id), f = st.fusePlants('s1', w.id);
      if (!f || PS.S.sprouts.length !== n0 || f.fuse.with !== 'wallnut' || !st.elementsOf(f).includes('rock')) fail('plant + plant fusion did not make one fused plant');
      const e2 = st.addEgg('normal', 'test', 'cactus'), c = st.hatchEgg(e2.id); if (!st.fuseItem(c.id, 'crown') || st.formInfo(c).name !== 'King Cactus') fail('plant + item fusion did not work');
      for (let i = 0; i < 60; i++) { st.gumball('small'); st.gumball('mega'); }
      if (st.buy('seed', 'doomshroom')) fail('a locked plant was sold in the shop');
      if (!st.buy('seed', 'wallnut') || !st.buy('fitem', 'army') || !st.buy('special', 'ghost')) fail('buying unlocked seeds, items or special seeds failed');
      const r = st.reward('league:lawn', 'test'); if (!r || !D.STARTERS.includes(r.species)) fail('the Front Lawn League should unlock a starter');
      if (st.reward('league:lawn', 'test')) fail('a reward must only pay once');
      const rr = st.finishRace(s.id ? st.active() : s, 'frontyard', 1, 0, 40); if (!rr.firstWin || !st.isUnlocked('wallnut')) fail('winning the Front Yard Dash (Pro) should unlock the Wall-nut');
      for (const eg of PS.S.eggs.slice()) st.hatchEgg(eg.id);
      const E = battle.engine; for (const L of D.LEAGUES.concat(D.PLANT_LEAGUES)) for (let i = 0; i < 3; i++) E.sim(st.active(), L.id, i, 2);
      for (const B of E.BOSSES) E.simBoss(st.active(), B.id, 2); E.simTower(st.active(), 2);
      // My Aquarium: the welcome gift, buying, prizes, moving fish, decorating, letting a fish go, and a damaged aquarium repaired
      {
        const A0 = st.aqua(); if (!st.aquaWelcome() || st.aquaWelcome() || A0.fish.length < 2 || !A0.items.some(it => it.id === 'anemone')) fail('aquarium: the welcome gift should come once, with fish and an anemone on the sand');
        if (!st.aquaBuy('fish', 'bluetang').ok || st.aquaBuy('fish', 'goldclown').ok || !st.aquaBuy('decor', 'chest').ok || !st.aquaBuy('backdrop', 'deep').ok || st.aquaBuy('backdrop', 'deep').ok) fail('aquarium: buying fish, decorations and backdrops (and not prize-only ones or twice) went wrong');
        for (let i = 0; i < 30; i++) { st.aquaPrize('test', i % 2 === 0); st.aquaWin('survival'); }
        const A = st.aqua(), T = D.AQUA.TANK;
        if (A.fish.filter(f => f.tank).length > T.maxFish || A.fish.length > T.maxOwn) fail('aquarium: the tank or Fish Room went over its limit');
        const room = A.fish.find(f => !f.tank), swimmer = A.fish.find(f => f.tank);
        if (room && st.aquaMove(room.id, true).ok && A.fish.filter(f => f.tank).length > T.maxFish) fail('aquarium: moved a fish into a full tank');
        if (swimmer && (!st.aquaMove(swimmer.id, false).ok || swimmer.tank)) fail('aquarium: moving a fish to the Fish Room failed');
        const before = A.fish.length, coins0 = PS.S.coins, got = st.aquaRelease(A.fish[0].id); if (A.fish.length !== before - 1 || PS.S.coins !== coins0 + got) fail('aquarium: letting a fish go should pay and remove it');
        // decorations: put one out, move it, swap it, put it away; never more out than owned, never past the limit
        const n0 = A.items.length, chest = A.items.findIndex(it => it.id === 'chest');
        if (chest >= 0 && !st.aquaRemoveItem(chest)) fail('aquarium: putting a decoration away failed');
        const at = st.aquaPlaceAt('chest', 0.5, 0.5); if (at < 0 && A.items.length < T.items) fail('aquarium: putting a decoration out failed');
        if (at >= 0 && (!st.aquaMoveItem(at, 2, -1) || A.items[at].x !== 1 || A.items[at].d !== 0)) fail('aquarium: moving a decoration should keep it on the sand');
        if (st.aquaPlaceAt('chest', 0.5, 0.5) >= 0 && st.aquaFree('chest') < 0) fail('aquarium: a decoration was put out more times than owned');
        if (st.aquaPlaceAt('nosuchthing', 0.5, 0.5) >= 0 || st.aquaMoveItem(999, 0.5, 0.5)) fail('aquarium: bad decoration moves should be refused');
        void n0;
        const placed = {}; for (const it of A.items) placed[it.id] = (placed[it.id] || 0) + 1; for (const [id, n] of Object.entries(placed)) if (n > (A.decor[id] || 0)) fail(`aquarium: ${id} is out more times than owned`);
        if (A.items.length > T.items) fail('aquarium: too many decorations on the sand');
        // a damaged aquarium is repaired, and the first version's 8 sand spots become free positions
        const junk = st.aquaClean({ fish: [{ kind: 'nosuchfish' }, { kind: 'clownfish', id: 'a' }, { kind: 'clownfish', id: 'a', tank: true }, 7], decor: { brain: 1, bogus: 3 }, slots: ['brain', 'brain', 'bogus', null, null, 'brain'], backdrop: 'atlantis', own: 'x' }, []);
        if (junk.fish.length !== 2 || junk.fish[0].id === junk.fish[1].id || junk.decor.bogus || junk.items.length !== 1 || junk.items[0].id !== 'brain' || junk.items[0].x !== 0.14 || junk.backdrop !== 'reef') fail('aquarium: a damaged aquarium should be repaired (and old sand spots kept)');
        // dirt: a tank starts a little dirty, algae grows with time (slower with a cleanup crew), and bad dirt is repaired
        const dirt = st.aquaDirt(); if (!dirt.algae.length || !dirt.gunk.length) fail('aquarium: a tank should start with a little dirt to try cleaning');
        dirt.algae.length = 0; dirt.gunk.length = 0; dirt.t = 1e12; dirt.carry = 0;
        const grew = st.aquaDirtTick(1e12 + 5 * 3600000); if (!(grew >= 1) || dirt.algae.length > D.AQUA.DIRT.maxAlgae) fail(`aquarium: algae should grow over 5 hours (grew ${grew})`);
        st.aquaDirtTick(1e12 + 500 * 3600000); if (dirt.algae.length > D.AQUA.DIRT.maxAlgae) fail('aquarium: algae must stop at its limit');
        for (let i = 0; i < 40; i++) st.aquaAddGunk(Math.random(), Math.random()); if (dirt.gunk.length > D.AQUA.DIRT.maxGunk) fail('aquarium: gunk must stop at its limit');
        if (!st.aquaCrewGift() || st.aquaCrewGift()) fail('aquarium: the cleanup crew gift should come once');
        // just for fun: daily treasure (once a day each), renaming (cleaned up), the hearts, the lights
        const c0 = PS.S.coins, t1 = st.aquaTreasure('chest'), t2 = st.aquaTreasure('chest'), p1 = st.aquaTreasure('clam');
        if (!(t1 > 0) || t2 !== 0 || !(p1 > 0) || PS.S.coins !== c0 + t1 + p1 || st.aquaTreasureReady('chest')) fail('aquarium: the chest and the clam should pay once a day each');
        const fid = st.aqua().fish[0].id;
        if (st.aquaRename(fid, '  <b>Sir Bubbles the Great</b> ') !== 'bSir Bubbles' || st.aquaRename(fid, '<<>>') !== null || st.aquaRename('nobody', 'X') !== null) fail('aquarium: renaming should clean up the name and refuse empty ones');
        const hp = st.aquaHappy(); if (!(hp.hearts >= 0 && hp.hearts <= 5) || hp.tips.length !== 5 - hp.hearts) fail('aquarium: the happy-tank hearts should come with a tip for every empty heart');
        st.aquaFed(); if (st.aquaHappy().hearts < hp.hearts) fail('aquarium: feeding should not lose a heart');
        if (st.aquaLights(false) !== false || !st.aqua().lightsOff || st.aquaLights(true) !== true) fail('aquarium: the lights switch');
        if (st.aquaScare() <= 0) fail('aquarium: scaring the visitor should pay a few coins');
        const junk3 = st.aquaClean({ fish: [], dirt: { algae: [{ x: 0.5, y: 0.5 }, { x: 'a' }, 5], gunk: [{ x: 2, d: -1 }, null], t: 'x' } }, []);
        if (!junk3.dirt || junk3.dirt.algae.length !== 1 || junk3.dirt.algae[0].hp !== 1 || junk3.dirt.gunk.length !== 1 || junk3.dirt.gunk[0].x !== 1 || junk3.dirt.gunk[0].d !== 0) fail('aquarium: damaged dirt should be repaired');
        const junk2 = st.aquaClean({ fish: [], decor: { brain: 2 }, items: [{ id: 'brain', x: 9, d: 'x' }, { id: 'brain', x: 0.2, d: 0.3 }, { id: 'brain', x: 0.4, d: 0.3 }, { id: 'zzz' }] }, []);
        if (junk2.items.length !== 2 || junk2.items[0].x !== 1 || junk2.items[0].d !== 0.5) fail('aquarium: decoration positions should be repaired');
      }
      if (events.includes('save:failed')) fail('saving failed during the rules check');
      ok(`rules run on a loaded save (${PS.S.sprouts.length} plants after planting every seed; every league, cup, Zomboss and the Tower can be fought; the aquarium works)`);
    } catch (err) { fail('rules check crashed: ' + err.stack); }
  }
  console.log(failures ? `\n${failures} problem(s) found.` : '\nAll checks passed.');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.log('  ✗ checks crashed: ' + e.stack); process.exit(1); });
