#!/usr/bin/env node
// Isolated smoke test for art-hd-loader.js; does not need the entire game.
//   node tools/test_art_hd_loader.js
// 1. stable canvases, async repaint, stage selection, sheet dimensions, variant fallback (ChatGPT's original checks)
// 2. pose mapping: every pose the scenes really request -> the frame it must show (Phase 2 corrections)
// 3. the real draw path: the right cell of the sheet is drawn for knocked-out plants, hit zombies and sleeping plants
// 4. registered sheets start loading at once; canvases say hdPending until their sheet settles; 'pvz-hd-art' announces it
'use strict';
const assert = require('assert'), fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.resolve(__dirname, '../pvz-garden');
const art = fs.readFileSync(path.join(root, 'art-hd-loader.js'), 'utf8');
const images = [];
class FakeImage {
  constructor() { this.naturalWidth = 1024; this.naturalHeight = 512; images.push(this); }
  set src(v) { this.uri = v; }
}
function createCanvas() {
  const calls = [];
  const x = { calls, clearRect: (...a) => calls.push(['clear', ...a]),
    drawImage: (...a) => calls.push(['draw', ...a]), imageSmoothingEnabled: false,
    imageSmoothingQuality: 'low' };
  return { width: 0, height: 0, getContext: () => x };
}
const base = createCanvas(); base.width = 64; base.height = 64; base.k = 2;
const PX = { sprig: () => base };
const sb = { console, document: { createElement: () => createCanvas() }, PX,
  Image: FakeImage, PVZ_HD_MANIFEST: { plants: { sunflower: { 0: 'img/hd/plants/sunflower/stage-0.png' } },
    zombies: { basic: 'img/hd/zombies/basic.png' } }, Map, Set, Object, Math, String };
const events = [];
sb.CustomEvent = class { constructor(type, o) { this.type = type; this.detail = (o || {}).detail; } };
sb.dispatchEvent = e => { events.push([e.type, e.detail && e.detail.src, e.detail && e.detail.state]); return true; };
sb.window = sb;
vm.createContext(sb); vm.runInContext(art, sb, { filename: 'art-hd-loader.js' });

// ---------- 1. the original pilot checks ----------
assert.equal(images.length, 2, 'both registered sheets start loading at once (preload)');
const first = sb.PX.sprig({ species: 'sunflower', stage: 0 }, {});
assert.equal(first.width, 256); assert.equal(first.height, 256); assert.equal(first.k, 8);
assert.strictEqual(sb.PX.sprig({ species: 'sunflower', stage: 0 }, {}), first);
assert.equal(images.length, 2, 'no second request for a sheet already loading');
assert.strictEqual(first.hdPending, true, 'code art meanwhile, marked pending');
const before = first.getContext('2d').calls.length;
images[0].onload();
assert(first.getContext('2d').calls.length > before, 'cached canvas must repaint in-place');
assert.strictEqual(first.hdPending, false, 'no longer pending once the sheet is painted');
assert.strictEqual(first.hdArt, true, 'marked as illustrated art once painted (PX.blit draws it smoothly)');
assert(first.hdv >= 2, 'repaint counter bumped (tint caches refresh)');
assert.deepStrictEqual(events[0], ['pvz-hd-art', 'img/hd/plants/sunflower/stage-0.png', 'loaded'], 'the arrival is announced');
assert.strictEqual(sb.PX.sprig({ species: 'sunflower', stage: 0 }, {}), first, 'scene-held reference must remain stable');
assert.strictEqual(sb.PX.sprig({ species: 'sunflower', stage: 0, skin: 'gold' }, {}), base, 'variants must fall back');
assert.strictEqual(sb.PX.sprig({ species: 'sunflower', stage: 1 }, {}), base, 'unregistered stage must fall back');
const zombie = sb.PX.sprig({ zombie: 'basic' }, { walk: true, frame: 1 });
assert.equal(zombie.k, 8); assert.equal(images.length, 2); assert.strictEqual(zombie.hdPending, true); images[1].naturalWidth = 768; images[1].onload();
assert.strictEqual(zombie.hdPending, false);
assert.equal(sb.PVZ_HD.stats().loaded, 2);
console.log('PASS: stable canvas, async repaint, manifest stage selection, image dimensions, variant fallback');

// ---------- 2. pose mapping ----------
// [the pose a scene requests, the frame it must show, where it comes from]
const PLANT = [
  [{}, 'idle', 'standing still'],
  [{ frame: 0, mouth: 'smile' }, 'idle', 'Garden / Survival idle'],
  [{ frame: 1 }, 'idle', 'Almanac / menu idle animation'],
  [{ eyes: 'blink' }, 'blink', 'a blink'],
  [{ frame: 0, mouth: 'smile', eyes: 'blink' }, 'blink', 'Survival blink'],
  [{ walk: true, frame: 0, mouth: 'smile' }, 'walk0', 'Garden walk'],
  [{ walk: true, frame: 1, mouth: 'smile' }, 'walk1', 'Garden walk'],
  [{ walk: true, frame: 1, mouth: 'smile', eyes: 'blink' }, 'walk1', 'blinking while walking keeps the walk cycle'],
  [{ walk: true, frame: 0, mouth: 'smile', eyes: 'blink' }, 'walk0', 'blinking while walking keeps the walk cycle'],
  [{ walk: true, frame: 0, eyes: 'happy', mouth: 'open' }, 'walk0', 'happy mood while walking keeps walking'],
  [{ walk: true, frame: 1, eyes: 'sad', mouth: 'flat' }, 'walk1', 'sad mood while walking keeps walking'],
  [{ walk: true, frame: 0, eyes: 'closed', mouth: 'o' }, 'walk0', 'a tired racer keeps running'],
  [{ walk: true, frame: 1, eyes: 'happy', mouth: 'grin' }, 'walk1', 'a boosted racer keeps running'],
  [{ walk: true, frame: 0, eyes: 'sad', mouth: 'o' }, 'hurt', 'a racer stumbles'],
  [{ walk: true, frame: 1, arms: 'up', eyes: 'happy', mouth: 'open' }, 'cheer', 'cheering on the move / victory lap'],
  [{ walk: true, frame: 0, arms: 'up' }, 'walk0', 'climbing'],
  [{ arms: 'paddle', frame: 1 }, 'walk1', 'swimming / travelling'],
  [{ arms: 'out', flap: true, frame: 0 }, 'walk0', 'flying (race)'],
  [{ arms: 'up', flap: true, frame: 1, mouth: 'open' }, 'walk1', 'fluttering down'],
  [{ arms: 'out', flap: false, frame: 1, mouth: 'open' }, 'cheer', 'dropped from a finger'],
  [{ eyes: 'closed', mouth: 'o' }, 'knocked', 'knocked out (Survival), fainted or beaten (Battle)'],
  [{ frame: 0, eyes: 'closed', mouth: 'o' }, 'knocked', 'knocked out in Survival'],
  [{ frame: 0, mouth: 'o', eyes: 'closed', sleep: 1 }, 'blink', 'asleep in the Garden: never "knocked"'],
  [{ eyes: 'closed', mouth: 'o', sleep: 1 }, 'blink', 'evolving cocoon / resting in the house'],
  [{ eyes: 'closed', mouth: 'flat' }, 'blink', 'asleep in a battle (status)'],
  [{ eyes: 'sad', mouth: 'o' }, 'hurt', 'Battle hit / stunned'],
  [{ eyes: 'sad', mouth: 'flat' }, 'hurt', 'Battle low HP / sad mood'],
  [{ eyes: 'sad' }, 'hurt', 'Almanac sad'],
  [{ frame: 0, mouth: 'o' }, 'hurt', 'Survival hit'],
  [{ frame: 0, mouth: 'o', eyes: 'blink' }, 'hurt', 'Survival hit during a blink'],
  [{ arms: 'up', eyes: 'happy', mouth: 'open', frame: 0 }, 'cheer', 'Battle victory'],
  [{ arms: 'up', eyes: 'happy', mouth: 'open', frame: 1 }, 'cheer', 'Battle victory'],
  [{ arms: 'up', eyes: 'happy', mouth: 'smile', frame: 1 }, 'cheer', 'race finish (not first)'],
  [{ eyes: 'happy', mouth: 'open' }, 'cheer', 'happy (menus, Garden mood)'],
  [{ eyes: 'happy' }, 'cheer', 'happy (Almanac)'],
  [{ arms: 'up', eyes: 'brave', mouth: 'grin' }, 'cheer', 'Battle support move'],
  [{ arms: 'out', mouth: 'open', eyes: 'brave' }, 'attack', 'Battle attack'],
  [{ eyes: 'brave', mouth: 'o' }, 'attack', 'bracing for a Zomboss charge'],
  [{ eyes: 'brave' }, 'attack', 'battle stance'],
  [{ eyes: 'brave', mouth: 'grin' }, 'attack', 'battle stance'],
  [{ frame: 1, mouth: 'grin' }, 'attack', 'race countdown'],
  [{ arms: 'out', mouth: 'o', frame: 0 }, 'cheer', 'held up by a finger'],
  [{ arms: 'hold', mouth: 'open' }, 'idle', 'eating (no flicker between frames)'],
  [{ arms: 'hold', mouth: 'smile' }, 'idle', 'eating'],
];
const ZOMBIE = [
  [{}, 'idle', 'standing'],
  [{ eyes: 'blink' }, 'idle', 'a blink (zombies have no blink frame)'],
  [{ walk: true, frame: 0 }, 'walk0', 'Garden raid / Survival walk'],
  [{ walk: true, frame: 1, eyes: 'blink' }, 'walk1', 'blinking while walking keeps the walk cycle'],
  [{ walk: true, frame: 1, mouth: 'open' }, 'bite', 'biting'],
  [{ arms: 'out', mouth: 'open', eyes: 'brave' }, 'bite', 'Battle attack'],
  [{ mouth: 'open', arms: 'up' }, 'bite', 'Battle entrance roar'],
  [{ eyes: 'sad', mouth: 'o' }, 'hurt', 'Battle hit: "sad" wins over the mouth'],
  [{ walk: true, frame: 0, eyes: 'sad', mouth: 'o' }, 'hurt', 'hit while walking'],
  [{ eyes: 'sad', mouth: 'flat' }, 'hurt', 'Battle low HP'],
  [{ eyes: 'closed', mouth: 'o' }, 'hurt', 'Battle defeat (beaten)'],
  [{ arms: 'up', eyes: 'happy', mouth: 'open', frame: 1 }, 'bite', 'Battle victory (a roar)'],
  [{ eyes: 'closed', mouth: 'flat' }, 'idle', 'asleep in a battle (status)'],
];
const bad = [];
for (const [P, want, where] of PLANT) { const got = sb.PVZ_HD.poseFor(P, false); if (got !== want) bad.push(`plant ${JSON.stringify(P)} (${where}): ${got}, expected ${want}`); }
for (const [P, want, where] of ZOMBIE) { const got = sb.PVZ_HD.poseFor(P, true); if (got !== want) bad.push(`zombie ${JSON.stringify(P)} (${where}): ${got}, expected ${want}`); }
assert.deepStrictEqual(bad, [], 'pose mapping:\n  ' + bad.join('\n  '));
console.log(`PASS: pose mapping (${PLANT.length} plant poses, ${ZOMBIE.length} zombie poses, incl. Battle victory and defeat)`);

// ---------- 3. the real draw path draws the right sheet cell ----------
const cell = c => { const d = c.getContext('2d').calls.filter(x => x[0] === 'draw').pop(); return [d[2], d[3]]; }; // source x, y of the last draw
assert.deepStrictEqual(cell(sb.PX.sprig({ species: 'sunflower', stage: 0 }, { eyes: 'closed', mouth: 'o' })), [768, 256], 'knocked-out plant: 8th cell');
assert.deepStrictEqual(cell(sb.PX.sprig({ species: 'sunflower', stage: 0 }, { eyes: 'closed', mouth: 'o', sleep: 1 })), [256, 0], 'sleeping plant: blink cell');
assert.deepStrictEqual(cell(sb.PX.sprig({ species: 'sunflower', stage: 0 }, { walk: true, frame: 1, eyes: 'blink' })), [768, 0], 'blinking walker: walk1 cell');
assert.deepStrictEqual(cell(sb.PX.sprig({ species: 'sunflower', stage: 0 }, { arms: 'up', eyes: 'happy', mouth: 'open', frame: 1 })), [0, 256], 'victory: cheer cell');
assert.deepStrictEqual(cell(sb.PX.sprig({ zombie: 'basic' }, { eyes: 'sad', mouth: 'o' })), [256, 256], 'hit zombie: hurt cell');
assert.deepStrictEqual(cell(sb.PX.sprig({ zombie: 'basic' }, { walk: true, frame: 1, mouth: 'open' })), [0, 256], 'biting zombie: bite cell');
console.log('PASS: the right sheet cells are drawn (knocked, sleeping, walking blink, victory, zombie hurt and bite)');

// ---------- 4. a sheet that fails to load: the code art stays, nothing waits forever ----------
{
  const imgs = []; const evs = [];
  class Img2 { constructor() { this.naturalWidth = 0; this.naturalHeight = 0; imgs.push(this); } set src(v) { this.uri = v; } }
  const b2 = createCanvas(); b2.width = 64; b2.height = 64; b2.k = 2;
  const s2 = { console: { warn() {} }, document: { createElement: () => createCanvas() }, PX: { sprig: () => b2 }, Image: Img2,
    PVZ_HD_MANIFEST: { plants: {}, zombies: { basic: 'img/hd/zombies/basic.png' } }, Map, Set, Object, Math, String,
    CustomEvent: sb.CustomEvent, dispatchEvent: e => { evs.push(e.detail.state); return true; } };
  s2.window = s2; vm.createContext(s2); vm.runInContext(art, s2, { filename: 'art-hd-loader.js' });
  const z = s2.PX.sprig({ zombie: 'basic' }, {});
  assert.strictEqual(z.hdPending, true);
  assert.strictEqual(z.hdArt, false, 'code art meanwhile: not marked as illustrated (stays crisp)');
  imgs[0].onerror();
  assert.strictEqual(z.hdPending, false, 'a failed sheet leaves the code art, not a pending mark');
  assert.deepStrictEqual(evs, ['failed']);
  assert.equal(s2.PVZ_HD.stats().failed, 1);
  // a wrong-sized sheet is refused the same way
  const imgs3 = []; class Img3 { constructor() { this.naturalWidth = 1000; this.naturalHeight = 512; imgs3.push(this); } set src(v) { this.uri = v; } }
  const s3 = Object.assign({}, s2, { Image: Img3, PVZ_HD_MANIFEST: { plants: { sunflower: { 1: 'img/hd/plants/sunflower/stage-1.png' } }, zombies: {} }, PX: { sprig: () => b2 } });
  s3.window = s3; vm.createContext(s3); vm.runInContext(art, s3, { filename: 'art-hd-loader.js' });
  const p3 = s3.PX.sprig({ species: 'sunflower', stage: 1 }, {}); imgs3[0].onload();
  assert.strictEqual(p3.hdPending, false); assert.equal(s3.PVZ_HD.stats().invalid, 1);
}
// with nothing registered, nothing loads and every call is the original
{
  const imgs = []; class Img4 { constructor() { imgs.push(this); } set src(v) {} }
  const s4 = { console, document: { createElement: () => createCanvas() }, PX: { sprig: (L, P) => base }, Image: Img4,
    PVZ_HD_MANIFEST: { plants: {}, zombies: {} }, Map, Set, Object, Math, String };
  s4.window = s4; vm.createContext(s4); vm.runInContext(art, s4, { filename: 'art-hd-loader.js' });
  assert.equal(imgs.length, 0, 'an empty manifest loads nothing');
  assert.strictEqual(s4.PX.sprig({ species: 'sunflower', stage: 0 }, { walk: true }), base, 'an empty manifest returns the original art');
}
console.log('PASS: preload, pending mark and arrival event; failed and wrong-sized sheets keep the code art; empty manifest = original');
