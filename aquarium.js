// aquarium.js — PVZ Garden: My Aquarium, the sixth tab. A saltwater tank the child decorates and fills with fish won in races,
// battles and Survival, bought in the Shop (its Aquarium tab) or found in gumballs.
// Scene: PS.scenes.aquarium = { mount, show, hide, frame }. Data: D.AQUA (data.js). Save + rules: state.js aqua* (PS.S.aqua).
// Art: art-aqua.js (PX.aquaSprite / aquaBackdrop / aquaSandOf) filled in by art-fish.js, art-fish2.js, art-aquadecor.js and
// art-aquaworld.js. Drawn like the other scenes: a world in art pixels on a SCENE_K buffer, scaled up to the screen.
// Fish swim on their own (each kind has a swim style in D.AQUA.FISH[kind].swim); tap a fish to say hello (the puffer puffs up),
// tap the chest or clam to open it, Feed drops flakes they chase. Drag a fish or a decoration to move it (a long press picks it
// up too): fish swim off again after a moment; decorations stay where they're dropped (x across, and how far back on the sand).
// Decorate: tap the sand to add a decoration, tap one to swap or put it away, and pick the backdrop and sand.
// Feed: tap or swipe the water to sprinkle food; a fish that has eaten a few flakes is full for a while, and food nobody eats
// turns into gunk on the sand. The tank gets dirty over time (algae on the glass, ST.aquaDirtTick); Clean: rub the glass and the
// sand. The cleanup crew helps (D.AQUA.FISH[kind].clean): snails crawl the glass eating algae, crabs / shrimp / the sea star
// eat leftovers and gunk, tangs nibble algae.
// Just for fun: hold the water and fish follow your finger; double-tap a fish for a trick; pop bubbles; the chest and the clam
// give coins once a day; a Snorkel Zombie visits now and then (tap it to scare it off); lights on/off (glowing things glow);
// the happy-tank hearts say what would make the tank happier; rename fish in their card.
// Styles are injected below (prefix .aq-).
(function () {
  'use strict';
  const { D } = PS, ST = PS.state;
  const K = PX.SCENE_K;
  const rand = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v)), pick = a => a[Math.floor(Math.random() * a.length)];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const snd = n => { try { PX.Sound.play(n); } catch (e) { /* sound is optional */ } };
  const AQ = () => D.AQUA;
  const an = name => (/^[aeiou]/i.test(name) ? 'An ' : 'A ') + name; // "An Octopus!", "A Clownfish!"
  // tuning (art px and seconds). worldW: about how many art px fit across (the zoom follows the screen width).
  const T = { worldW: 150, zMin: 2, zMax: 7, lid: 5, sandK: 0.18, flakeFall: 5.5, flakeLife: 7, maxFlakes: 45, dirtTickSec: 60, bubbleEvery: 1.4, maxBubbles: 40, maxParts: 50, labelSec: 2.4, puffSec: 2.6, openSec: 2.8 };
  // dragging: how far (screen px) a finger moves before it's a drag, and how long a still press takes to pick something up
  const DRAG = { move: 8, holdMs: 320 };

  let root = null, cv = null, ctx = null, buf = null, bx = null, bgC = null, bgx = null, barPlay = null, barDeco = null, barTool = null, countEl = null;
  let W = 0, H = 0, DPR = 1, Z = 3, ww = 0, wh = 0, sizeKey = '', bgKey = '', t = 0, visible = false, mode = 'play';
  const L = { sandTop: 0, floorBack: 0, floorFront: 0, top: 0, barTop: 0, playTop: 0 };
  let actors = [], flakes = [], bubbles = [], parts = [], fishKey = '', bubbleT = 0, press = null, drag = null;
  let dirtDirty = false, dirtSavedAt = 0, dirtTickAt = 0, squeakT = 0, fedNow = false;
  let lastTap = null, visitor = null, nextVisitorAt = 0, floaters = [], zzzT = 0, heartsEl = null, lightBtn = null;
  const night = () => !!aq().lightsOff;
  const decorFx = new WeakMap(); // a decoration on the sand -> until when it shows its "open" frame (tapped)

  // ================================================================
  // Save helpers (state.js keeps the rules; this is the view)
  // ================================================================
  const aq = () => (ST.aqua ? ST.aqua() : { fish: [], decor: {}, items: [], backdrop: 'reef', sand: 'white', own: { backdrop: { reef: 1 }, sand: { white: 1 } }, seen: {} });
  const fishInfo = kind => AQ().FISH[kind] || { name: 'Fish', rarity: 'common', swim: 'swim', fact: '' };
  const decorInfo = id => AQ().DECOR[id] || { name: 'Decoration', rarity: 'common' };
  const rarityName = r => ((AQ().RARITY || {})[r] || {}).name || r;
  const tankFish = () => aq().fish.filter(f => f.tank);

  // ================================================================
  // Layout
  // ================================================================
  function layout() {
    const r = root.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return false;
    DPR = Math.min(3, window.devicePixelRatio || 1); W = r.width; H = r.height;
    Z = clamp(Math.floor(W / T.worldW * DPR) / DPR, T.zMin, T.zMax);
    ww = Math.ceil(W / Z); wh = Math.ceil(H / Z);
    // (measured from the Feed / Decorate row, so the sand doesn't move when the decorating row with its hint shows instead)
    if (!barPlay.hidden && barPlay.offsetTop) L.playTop = barPlay.offsetTop;
    const barTop = (L.playTop || barDeco.offsetTop || H - 60) / Z;
    L.barTop = barTop;
    L.top = T.lid + 3;
    // the sand: the bottom quarter, but its front spots must stay above the buttons so the decorations show and can be tapped
    const sandH = clamp(Math.round(wh * T.sandK), 24, 40);
    // (deep enough to arrange things front to back: decorations stand anywhere between floorBack and floorFront)
    L.sandTop = Math.round(clamp(Math.min(wh - sandH, barTop - 28), wh * 0.45, wh - 18));
    L.floorBack = L.sandTop + 4; L.floorFront = Math.round(Math.max(L.floorBack + 8, Math.min(L.sandTop + 26, barTop - 2, wh - 2)));
    buf.width = ww * K; buf.height = wh * K;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    bgKey = '';
    for (const a of actors) placeInBand(a, true);
    return true;
  }
  function checkSize() {
    const key = root.clientWidth + 'x' + root.clientHeight + ':' + barPlay.offsetTop + ':' + barDeco.offsetTop + ':' + (window.devicePixelRatio || 1);
    if (key !== sizeKey || !ww) { sizeKey = key; layout(); }
  }
  // the decorations on the sand: it.x = share of the tank width, it.d = depth (0 = at the back of the sand, 1 = at the front)
  const items = () => aq().items || [];
  const depthOfY = y => clamp((y - L.floorBack) / Math.max(1, L.floorFront - L.floorBack), 0, 1);
  // where a decoration stands (bottom-centre), kept inside the glass; while it's dragged, where the finger has it
  function itemXY(it, w) {
    const g = drag && drag.it === it ? drag : it;
    return { x: Math.round(clamp(g.x * ww, w / 2 + 2, ww - w / 2 - 2)), y: Math.round(L.floorBack + g.d * (L.floorFront - L.floorBack)) };
  }

  // ================================================================
  // The painted background: backdrop + sand (redrawn when the size, backdrop or sand changes)
  // ================================================================
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const sandY = x => L.sandTop + Math.round(Math.sin(x * 0.09) * 1.2 + Math.sin(x * 0.23 + 1) * 0.6);
  function paintBg() {
    const A = aq(), key = ww + 'x' + wh + ':' + L.sandTop + ':' + A.backdrop + ':' + A.sand;
    if (key === bgKey) return; bgKey = key;
    bgC.width = ww * K; bgC.height = wh * K;
    bgx.setTransform(K, 0, 0, K, 0, 0); bgx.imageSmoothingEnabled = false;
    const bd = PX.aquaBackdrop(A.backdrop, ww, wh);
    if (bd) bgx.drawImage(bd, 0, 0, ww, wh); else { bgx.fillStyle = '#4fb8e2'; bgx.fillRect(0, 0, ww, wh); }
    const S = PX.aquaSandOf(A.sand), R = S.ramp, dots = S.dots && S.dots.length ? S.dots : [R[0]];
    for (let x = 0; x < ww; x++) {
      const y0 = sandY(x);
      bgx.fillStyle = R[1]; bgx.fillRect(x, y0, 1, wh - y0);
      bgx.fillStyle = R[0]; bgx.fillRect(x, y0, 1, 1);
      // the back edge of the sand sits in the water's shade: a few dithered darker rows
      bgx.fillStyle = R[2]; for (let y = y0 + 1; y < y0 + 5; y++) if (hash(x, y) < 0.55 - (y - y0) * 0.12) bgx.fillRect(x, y, 1, 1);
      for (let y = y0 + 2; y < wh; y++) {
        const h = hash(x * 3 + 7, y * 5 + 1);
        if (h < 0.035) { bgx.fillStyle = dots[Math.floor(h * 1000) % dots.length]; bgx.fillRect(x, y, 1, 1); }
        else if (h > 0.993) { bgx.fillStyle = R[2]; bgx.fillRect(x, y, 2, 1); }
      }
    }
  }

  // ================================================================
  // Fish
  // ================================================================
  const CRAWL = { crawl: 1 }, BOTTOM = { bottom: 1, cruise: 1 };
  function spriteOf(a, f) { return PX.aquaSprite('fish', a.puffT > 0 && PX.FISH_ART[a.kind + ':puffed'] ? a.kind + ':puffed' : a.kind, f); }
  function sizeOf(a) { const c = PX.aquaSprite('fish', a.kind, 0); return { w: PX.artW(c), h: PX.artH(c) }; }
  // the band a fish lives in
  function bandOf(a) {
    const top = L.top + a.h / 2 + 2, bot = L.sandTop - a.h / 2 + 2;
    if (CRAWL[a.swim]) return { x0: a.w / 2 + 3, x1: ww - a.w / 2 - 3, y0: L.floorBack - a.h / 2 + 1, y1: L.floorFront - a.h / 2 };
    if (BOTTOM[a.swim]) return { x0: a.w / 2 + 3, x1: ww - a.w / 2 - 3, y0: Math.max(top, bot - (L.sandTop - L.top) * 0.35), y1: bot };
    if (a.swim === 'glass') return { x0: a.w / 2 + 3, x1: ww - a.w / 2 - 3, y0: Math.max(top, L.sandTop - (L.sandTop - L.top) * 0.55), y1: L.floorBack - a.h / 2 };
    // snails crawl the front glass, anywhere from the lid down to the sand
    if (a.swim === 'snail') return { x0: a.w / 2 + 2, x1: ww - a.w / 2 - 2, y0: L.top + a.h / 2 + 1, y1: L.floorFront - a.h / 2 };
    return { x0: a.w / 2 + 3, x1: ww - a.w / 2 - 3, y0: top, y1: Math.max(top + 4, bot - 2) };
  }
  function placeInBand(a, keepX) {
    const b = bandOf(a);
    if (!keepX) a.x = rand(b.x0, b.x1); else a.x = clamp(a.x, b.x0, b.x1);
    a.y = CRAWL[a.swim] ? rand(b.y0, b.y1) : keepX ? clamp(a.y, b.y0, b.y1) : rand(b.y0, b.y1);
    if (a.swim === 'snail' && !keepX) a.y = rand(b.y0, b.y1);
    a.tx = a.x; a.ty = a.y;
  }
  function makeActor(f) {
    const I = fishInfo(f.kind);
    const a = { id: f.id, kind: f.kind, name: f.name, swim: I.swim || 'swim', x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, face: Math.random() < 0.5 ? 1 : -1, wait: rand(0, 1.5),
      ph: rand(0, 10), z: Math.random(), puffT: 0, happyT: 0, labelT: 0, pulse: rand(0, 2), clean: I.clean || null, bites: 0, full: 0, say: '', sayT: 0, munch: 0, target: null, nibble: null };
    Object.assign(a, sizeOf(a));
    a.sp = I.spd || (CRAWL[a.swim] ? 4 : a.swim === 'glass' ? 2 : a.swim === 'snail' ? 3 : a.swim === 'hover' ? 4.5 : a.swim === 'jelly' ? 4 : a.w <= 20 ? 15 : a.w <= 28 ? 11 : 8);
    placeInBand(a);
    return a;
  }
  // keep the swimmers in step with the save (new fish appear, fish sent to the Fish Room leave); positions are kept
  function syncFish() {
    const list = tankFish(), key = list.map(f => f.id + ':' + f.kind + ':' + f.name).join('|');
    if (key === fishKey) return; fishKey = key;
    const old = new Map(actors.map(a => [a.id, a]));
    actors = list.map(f => { const a = old.get(f.id); if (a) { a.name = f.name; return a; } return makeActor(f); });
    actors.sort((p, q) => p.z - q.z);
    refreshCount();
  }
  const near = (a, x, y, r) => Math.abs(a.x - x) < r && Math.abs(a.y - y) < r;
  function anemoneSpot() {
    for (const it of items()) if (decorInfo(it.id).hide) { const c = PX.aquaSprite('decor', it.id, 0), p = itemXY(it, PX.artW(c)); return { x: p.x, y: p.y - PX.artH(c) * 0.55, w: PX.artW(c) }; }
    return null;
  }
  function newTarget(a) {
    const b = bandOf(a);
    // a grazer (the tangs) sometimes swims over to nibble some algae
    a.nibble = null;
    if (a.clean === 'graze' && Math.random() < 0.4) { const A = dirt().algae; if (A.length) { const p = pick(A), q = algaeXY(p); a.tx = clamp(q.x, b.x0, b.x1); a.ty = clamp(q.y, b.y0, b.y1); a.nibble = p; return; } }
    if (a.swim === 'hide' && Math.random() < 0.6) { const s = anemoneSpot(); if (s) { a.tx = clamp(s.x + rand(-s.w / 3, s.w / 3), b.x0, b.x1); a.ty = clamp(s.y + rand(-3, 3), b.y0, b.y1); return; } }
    if (a.swim === 'school') { const lead = actors.find(o => o !== a && o.kind === a.kind && o.lead); if (lead) { a.tx = clamp(lead.x - lead.face * rand(6, 14), b.x0, b.x1); a.ty = clamp(lead.y + rand(-6, 6), b.y0, b.y1); return; } a.lead = true; }
    // long swims across the tank, with the odd short hop
    const far = Math.random() < 0.7;
    a.tx = far ? (a.x < ww / 2 ? rand(ww * 0.55, b.x1) : rand(b.x0, ww * 0.45)) : clamp(a.x + rand(-30, 30), b.x0, b.x1);
    a.ty = CRAWL[a.swim] ? a.y : rand(b.y0, b.y1);
    a.tx = clamp(a.tx, b.x0, b.x1);
  }
  function nearestFlake(a) {
    if (a.full > 0) return null; // (full up: no more snacks for a while)
    let best = null, bd = 1e9;
    for (const f of flakes) {
      if (f.eaten) continue;
      if (CRAWL[a.swim] || a.swim === 'glass') { if (!f.down) continue; } else if (f.down) continue;
      const d = Math.abs(f.x - a.x) + Math.abs(f.y - a.y); if (d < bd) { bd = d; best = f; }
    }
    return bd < 160 ? best : null;
  }
  function updateFish(a, dt) {
    a.puffT = Math.max(0, a.puffT - dt); a.happyT = Math.max(0, a.happyT - dt); a.labelT = Math.max(0, a.labelT - dt); a.full = Math.max(0, a.full - dt); a.sayT = Math.max(0, a.sayT - dt);
    a.trickT = Math.max(0, (a.trickT || 0) - dt);
    if (a.held || a.trickT > 0) return; // (in a child's fingers, or doing a trick)
    const b = bandOf(a);
    if (a.swim === 'snail') { updateSnail(a, b, dt); return; }
    // a finger held on the water: swimmers nearby come to see it
    if (lureOn() && FOLLOW(a) && Math.abs(a.x - press.x) + Math.abs(a.y - press.y) < 120) {
      if (a.lox == null) { a.lox = rand(-12, 12); a.loy = rand(-7, 7); }
      a.tx = clamp(press.x + a.lox, b.x0, b.x1); a.ty = clamp(press.y + a.loy, b.y0, b.y1); a.wait = 0; a.nibble = null;
      steer(a, b, a.sp * 1.4, dt); return;
    }
    a.lox = null;
    // the Snorkel Zombie is passing: swimmers dart out of its way
    if (visitor && FOLLOW(a) && Math.abs(a.x - visitor.x) < 26 && Math.abs(a.y - (visitor.y - 14)) < 26) {
      a.tx = clamp(a.x + Math.sign(a.x - visitor.x || 1) * 40, b.x0, b.x1); a.ty = clamp(a.y + rand(-10, 10), b.y0, b.y1); a.wait = 0; a.nibble = null;
      steer(a, b, a.sp * 1.8, dt); return;
    }
    const food = nearestFlake(a), job = !food && a.clean === 'sand' ? nearestGunk(a) : (a.job = null);
    let sp = a.sp;
    if (a.puffT > 0) sp *= 0.25;
    if (night()) sp *= 0.45; // (sleepy with the lights off)
    if (a.swim === 'jelly') {
      // a jelly squeezes upward, then drifts down; it wanders slowly side to side
      a.pulse -= dt; if (a.pulse <= 0) { a.pulse = rand(1.4, 2.2); a.vy = -rand(7, 11); }
      a.vy = Math.min(3, a.vy + 6 * dt); a.y = clamp(a.y + a.vy * dt, b.y0, b.y1);
      if (Math.abs(a.tx - a.x) < 3 || a.wait <= 0) { a.tx = rand(b.x0, b.x1); a.wait = rand(4, 9); } a.wait -= dt;
      a.x = clamp(a.x + Math.sign(a.tx - a.x) * 2.2 * dt, b.x0, b.x1); a.face = 1;
      return;
    }
    if (food) {
      a.tx = food.x; a.ty = CRAWL[a.swim] ? a.y : food.y; sp *= 1.6; a.wait = 0;
      if (near(a, food.x, food.y, Math.max(3, a.w * 0.35))) {
        food.eaten = true; a.happyT = 0.6; heart(a.x, a.y - a.h / 2);
        if (++a.bites >= AQ().FULL.bites) { a.bites = 0; a.full = AQ().FULL.sec; a.say = 'Yum!'; a.sayT = 1.6; }
      }
    } else if (job) {
      // the cleanup crew on the sand: walk over to the gunk and munch it up
      const q = gunkXY(job); a.tx = clamp(q.x, b.x0, b.x1); a.ty = CRAWL[a.swim] ? clamp(q.y - a.h / 2, b.y0, b.y1) : b.y1; a.wait = 0;
      if (Math.abs(q.x - a.x) < 4 && a.y + a.h / 2 >= L.floorBack - 5) { a.munch += dt; if (a.munch > 0.8) { eatGunk(job); a.munch = 0; a.happyT = 0.6; heart(a.x, a.y - a.h / 2); } return; }
    } else if (a.wait > 0) {
      a.wait -= dt; a.vx *= 0.94; a.vy *= 0.94; a.x += a.vx * dt; a.y += a.vy * dt;
      // a grazer at its algae nibbles it away
      if (a.nibble && dirt().algae.includes(a.nibble)) { a.nibble.hp -= AQ().DIRT.graze * dt; if (a.nibble.hp <= 0) { const q = algaeXY(a.nibble); wipeAlgae(a.nibble); heart(q.x, q.y - 3); a.nibble = null; } }
      return;
    } else if (Math.abs(a.tx - a.x) < 3 && Math.abs(a.ty - a.y) < 3) {
      if (a.nibble && dirt().algae.includes(a.nibble)) a.wait = 1.8;
      else { newTarget(a); if (night()) a.wait = rand(1.5, 4); else if (Math.random() < (CRAWL[a.swim] || a.swim === 'glass' ? 0.6 : 0.3)) a.wait = rand(0.6, 2.6); }
    }
    const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 10);
    const wantX = dx / d * sp * k, wantY = dy / d * sp * k * (a.swim === 'hover' ? 0.8 : 0.6);
    const turn = Math.min(1, dt * (a.swim === 'hover' ? 1.2 : 2.2));
    a.vx += (wantX - a.vx) * turn; a.vy += (wantY - a.vy) * turn;
    a.x = clamp(a.x + a.vx * dt, b.x0, b.x1); a.y = clamp(a.y + a.vy * dt, b.y0, b.y1);
    if (a.swim !== 'glass') { if (a.vx > 1.2) a.face = 1; else if (a.vx < -1.2) a.face = -1; }
  }
  // which fish come to a finger or dart away from a visitor (swimmers; walkers, snails and jellies carry on)
  const FOLLOW = a => !CRAWL[a.swim] && a.swim !== 'snail' && a.swim !== 'glass' && a.swim !== 'jelly' && !a.held;
  const lureOn = () => !!(press && press.lure && (press.lureMoved || t - press.lure > 0.12));
  function steer(a, b, sp, dt) {
    const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 8), turn = Math.min(1, dt * 3);
    a.vx += (dx / d * sp * k - a.vx) * turn; a.vy += (dy / d * sp * k * 0.8 - a.vy) * turn;
    a.x = clamp(a.x + a.vx * dt, b.x0, b.x1); a.y = clamp(a.y + a.vy * dt, b.y0, b.y1);
    if (a.vx > 1.2) a.face = 1; else if (a.vx < -1.2) a.face = -1;
  }
  // a snail on the glass: off to the nearest algae nobody else is cleaning, then munch until it's gone
  function updateSnail(a, b, dt) {
    const A = dirt().algae;
    if (a.target && !A.includes(a.target)) { a.target = null; a.munch = 0; }
    if (a.target && a.munch > 0) {
      a.vx = a.vy = 0; a.target.hp -= AQ().DIRT.eat * dt;
      if (a.target.hp <= 0) { const q = algaeXY(a.target); wipeAlgae(a.target); heart(q.x, q.y - 3); a.target = null; a.munch = 0; a.happyT = 0.6; }
      return;
    }
    if (!a.target) {
      let best = null, bd = 1e9;
      for (const p of A) { if (actors.some(o => o !== a && o.target === p)) continue; const q = algaeXY(p), d = Math.abs(q.x - a.x) + Math.abs(q.y - a.y); if (d < bd) { bd = d; best = p; } }
      a.target = best;
      if (!best) {
        // nothing to clean: a slow wander with long rests
        if (a.wait > 0) { a.wait -= dt; a.vx = a.vy = 0; return; }
        if (Math.abs(a.tx - a.x) < 2 && Math.abs(a.ty - a.y) < 2) { a.tx = rand(b.x0, b.x1); a.ty = rand(b.y0, b.y1); a.wait = rand(2, 6); return; }
      }
    }
    if (a.target) { const q = algaeXY(a.target); a.tx = clamp(q.x, b.x0, b.x1); a.ty = clamp(q.y, b.y0, b.y1); if (Math.abs(a.tx - a.x) < 1.5 && Math.abs(a.ty - a.y) < 1.5) { a.munch = 1; return; } }
    const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy) || 1, sp = Math.min(a.sp, d / Math.max(dt, 0.001));
    a.vx = dx / d * sp; a.vy = dy / d * sp; a.x = clamp(a.x + a.vx * dt, b.x0, b.x1); a.y = clamp(a.y + a.vy * dt, b.y0, b.y1);
    if (a.vx > 0.3) a.face = 1; else if (a.vx < -0.3) a.face = -1;
  }
  function nearestGunk(a) {
    let best = null, bd = 1e9;
    for (const g of dirt().gunk) { if (actors.some(o => o !== a && o.job === g)) continue; const q = gunkXY(g), d = Math.abs(q.x - a.x) + Math.abs(q.y - a.y) * 0.5; if (d < bd) { bd = d; best = g; } }
    a.job = best; return best;
  }
  function drawFish(a) {
    const moving = Math.abs(a.vx) + Math.abs(a.vy) > 1.5;
    const rate = a.swim === 'jelly' ? 0 : CRAWL[a.swim] || a.swim === 'snail' ? (moving || a.munch > 0 ? 3 : 0.5) : a.swim === 'glass' ? 0.8 : moving ? 4 : 1.6;
    const f = a.swim === 'jelly' ? (a.vy < -2 ? 1 : 0) : Math.floor(t * rate + a.ph) % 2;
    const c = spriteOf(a, f), w = PX.artW(c), h = PX.artH(c);
    const bob = CRAWL[a.swim] || a.swim === 'glass' || a.swim === 'snail' ? 0 : Math.round(Math.sin(t * 1.6 + a.ph) * (a.swim === 'hover' ? 1.6 : 0.8));
    let hop = a.happyT > 0 ? -Math.round(Math.sin((0.6 - a.happyT) / 0.6 * Math.PI) * 2) : 0, face = a.face;
    // a trick: a big happy jump, flipping round and round (a spin, the pixel way)
    if (a.trickT > 0) { const p = 1 - a.trickT; hop = -Math.round(Math.sin(p * Math.PI) * 10); if (Math.floor(p * 8) % 2) face = -face; }
    PX.blit(bx, c, a.x, a.y + bob + hop, face < 0, Math.floor(w / 2), Math.floor(h / 2));
  }

  // ================================================================
  // Flakes, bubbles, sparkles
  // ================================================================
  const FLAKE_COLS = ['#f08a4b', '#f6c453', '#8fd06a', '#e86a6a', '#c98a52'];
  // a pinch of food where the finger is (feeding mode)
  function sprinkle(x, y) {
    if (flakes.length >= T.maxFlakes) return;
    if (!fedNow) { fedNow = true; try { if (ST.aquaFed) ST.aquaFed(); } catch (e) { /* optional */ } }
    const yy = clamp(y, L.top + 1, L.sandTop - 6);
    for (let i = 0; i < 5 && flakes.length < T.maxFlakes; i++) flakes.push({ x: clamp(x + rand(-4, 4), 4, ww - 4), y: yy + rand(-2, 2), vy: rand(0.7, 1.2) * T.flakeFall, ph: rand(0, 6), col: pick(FLAKE_COLS), life: T.flakeLife, down: false, eaten: false });
    snd('tick');
  }
  function updateFlakes(dt) {
    for (const f of flakes) {
      if (!f.down) { f.y += f.vy * dt; f.x += Math.sin(t * 2 + f.ph) * 3 * dt; if (f.y >= sandY(Math.round(f.x)) + 2) { f.y = sandY(Math.round(f.x)) + 2; f.down = true; } }
      else {
        f.life -= dt;
        // food nobody ate sinks into the sand as gunk (the crew, or a rub in Clean, tidies it up)
        if (f.life <= 0 && !f.eaten && Math.random() < 0.45 && ST.aquaAddGunk && ST.aquaAddGunk(f.x / Math.max(1, ww), Math.random() * 0.7)) dirtChanged();
      }
    }
    flakes = flakes.filter(f => !f.eaten && f.life > 0);
  }
  function bubble(x, y, big) { if (bubbles.length < T.maxBubbles) bubbles.push({ x, y, r: big ? rand(1.2, 2) : rand(0.6, 1.1), vy: rand(10, 18), ph: rand(0, 6) }); }
  function updateBubbles(dt) {
    bubbleT -= dt;
    if (bubbleT <= 0) { bubbleT = rand(0.6, 1.2) * T.bubbleEvery; bubble(rand(8, ww - 8), L.sandTop + 2, Math.random() < 0.3); }
    // bubblers (the volcano, the diver's helmet) puff while they're on their bubbling frame
    for (const it of items()) {
      if (decorInfo(it.id).anim !== 'bubbles' || decorFrame(it) !== 1 || Math.random() >= dt * 9) continue;
      const c = PX.aquaSprite('decor', it.id, 0), p = itemXY(it, PX.artW(c)); bubble(p.x + rand(-2, 2), p.y - PX.artH(c) + 2, Math.random() < 0.4);
    }
    for (const b of bubbles) { b.y -= b.vy * dt; b.x += Math.sin(t * 3 + b.ph) * 4 * dt; }
    bubbles = bubbles.filter(b => b.y > L.top);
  }
  function heart(x, y) { if (parts.length < T.maxParts) parts.push({ x, y, vy: -9, life: 1, type: 'heart' }); }
  function sparkle(x, y) { for (let i = 0; i < 5 && parts.length < T.maxParts; i++) parts.push({ x: x + rand(-6, 6), y: y + rand(-6, 2), vy: -rand(3, 8), life: rand(0.6, 1.1), type: 'spark' }); }
  function updateParts(dt) { for (const p of parts) { p.y += p.vy * dt; p.life -= dt; } parts = parts.filter(p => p.life > 0); }
  const HEART = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
  function drawParts() {
    for (const p of parts) {
      bx.globalAlpha = Math.min(1, p.life * 2);
      if (p.type === 'heart') { bx.fillStyle = '#ff7aa0'; const x0 = Math.round(p.x - 3), y0 = Math.round(p.y - 3); for (let r = 0; r < HEART.length; r++) for (let c = 0; c < 7; c++) if (HEART[r][c] === '#') bx.fillRect(x0 + c * 0.5 + 1.75, y0 + r * 0.5, 0.5, 0.5); }
      else { bx.fillStyle = '#fffbe0'; bx.fillRect(Math.round(p.x * 2) / 2, Math.round(p.y * 2) / 2, 1, 0.5); bx.fillRect(Math.round(p.x * 2) / 2 + 0.25, Math.round(p.y * 2) / 2 - 0.25, 0.5, 1); }
    }
    bx.globalAlpha = 1;
  }

  // ================================================================
  // Dirt: algae on the front glass and gunk on the sand (kept in the save: ST.aquaDirt(); this view wipes them out of its lists)
  // ================================================================
  const dirt = () => (ST.aquaDirt ? ST.aquaDirt() : { algae: [], gunk: [] });
  const algaeXY = p => ({ x: p.x * ww, y: L.top + 2 + p.y * Math.max(10, L.sandTop - L.top - 6) });
  const algaeR = p => 2.5 + p.r * 4; // (radius, art px)
  const gunkXY = g => ({ x: g.x * ww, y: L.floorBack + g.d * (L.floorFront - L.floorBack) });
  function dirtChanged() { dirtDirty = true; }
  function wipeAlgae(p) { const A = dirt().algae, i = A.indexOf(p); if (i >= 0) A.splice(i, 1); dirtChanged(); }
  function eatGunk(g) { const G = dirt().gunk, i = G.indexOf(g); if (i >= 0) G.splice(i, 1); dirtChanged(); }
  const isClean = () => { const d = dirt(); return !d.algae.length && !d.gunk.length; };
  // cleaning mode: a finger rubs the glass (algae) and vacuums the sand (gunk); dist = art px rubbed
  function rub(x, y, dist) {
    const Dd = AQ().DIRT, d = dirt(); let wiped = 0, scrubbed = false;
    for (const p of d.algae.slice()) {
      const q = algaeXY(p), r = algaeR(p) + 5;
      if (Math.abs(q.x - x) < r && Math.abs(q.y - y) < r) { scrubbed = true; p.hp -= dist * Dd.rub; if (p.hp <= 0) { wipeAlgae(p); sparkle(q.x, q.y); wiped++; } }
    }
    if (y >= L.sandTop - 6) for (const g of d.gunk.slice()) { const q = gunkXY(g); if (Math.abs(q.x - x) < 9 && Math.abs(q.y - y) < 12) { eatGunk(g); bubble(q.x, q.y - 2, false); bubble(q.x + 1, q.y - 4, false); wiped++; } }
    if (wiped) snd('pop'); else if (scrubbed && t - squeakT > 0.18) { squeakT = t; snd('tick'); }
    if (wiped) { refreshCount(); if (isClean()) celebrate(); }
  }
  function celebrate() {
    snd('level'); PS.ui.toast('Sparkling clean! The fish love it!', 2600);
    for (const a of actors) { a.happyT = 0.6; heart(a.x, a.y - a.h / 2); }
    for (let i = 0; i < 6; i++) sparkle(rand(10, ww - 10), rand(L.top + 10, L.sandTop - 10));
  }
  // an algae patch: a few overlapping soft greens with darker speckles, drawn once per shape and size
  const algaeCache = new Map();
  function algaeSprite(seed, size) {
    const key = (seed % 24) + ':' + size; if (algaeCache.has(key)) return algaeCache.get(key);
    const k = 2, n = size * k, c = document.createElement('canvas'); c.width = n; c.height = n; c.k = k;
    const g = c.getContext('2d'); let sd = (seed % 24) * 7919 + 17; const rnd = () => ((sd = (sd * 9301 + 49297) % 233280) / 233280);
    const cols = ['#8fd06a', '#6fb24e', '#a9df84', '#7cc25c'], blobs = 3 + Math.floor(rnd() * 3);
    for (let b = 0; b < blobs; b++) {
      const cx = n / 2 + (rnd() - 0.5) * n * 0.4, cy = n / 2 + (rnd() - 0.5) * n * 0.4, rr = n * (0.17 + rnd() * 0.15);
      g.fillStyle = cols[b % cols.length];
      for (let y = -rr; y <= rr; y++) for (let x = -rr; x <= rr; x++) if (x * x + y * y <= rr * rr * (0.72 + rnd() * 0.28)) g.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1);
    }
    g.fillStyle = '#4f8a3a'; for (let i = 0; i < size * 1.5; i++) { const a = rnd() * 6.283, r = rnd() * n * 0.28; g.fillRect(Math.round(n / 2 + Math.cos(a) * r), Math.round(n / 2 + Math.sin(a) * r), 1, 1); }
    algaeCache.set(key, c); return c;
  }
  function drawGunk() {
    for (const gk of dirt().gunk) {
      const q = gunkXY(gk), x = Math.round(q.x * 2) / 2, y = Math.round(q.y * 2) / 2, v = Math.floor(gk.x * 1000) % 3;
      bx.fillStyle = '#7d6c3e'; bx.fillRect(x - 1, y - 0.5, 2, 1); bx.fillStyle = '#9c8a52'; bx.fillRect(x - 0.5 + v * 0.5, y - 1, 1, 0.5); bx.fillStyle = '#5f5530'; bx.fillRect(x + 0.5, y, 1, 0.5);
    }
  }
  // the water gets a little cloudy as the dirt builds up
  function drawMurk() {
    const d = dirt(), a = Math.min(0.24, d.algae.length * AQ().DIRT.murk + d.gunk.length * 0.005); if (a <= 0.005) return;
    bx.globalAlpha = a; bx.fillStyle = '#6e8c46'; bx.fillRect(0, T.lid, ww, wh - T.lid); bx.globalAlpha = 1;
  }
  function drawAlgae() {
    for (const p of dirt().algae) {
      const q = algaeXY(p), size = Math.round(algaeR(p) * 2) + 2, c = algaeSprite(Math.floor(p.x * 997 + p.y * 1999), size);
      bx.globalAlpha = 0.35 + 0.6 * clamp(p.hp, 0, 1); bx.drawImage(c, Math.round(q.x - size / 2), Math.round(q.y - size / 2), size, size);
    }
    bx.globalAlpha = 1;
  }
  // the tool under the finger: a sponge while cleaning, a little food shaker while feeding
  function drawTool() {
    if (!press || (press.tool !== 'clean' && press.tool !== 'feed')) return;
    const x = Math.round(press.x), y = Math.round(press.y);
    if (press.tool === 'clean') {
      bx.fillStyle = '#c99a3a'; bx.fillRect(x - 5, y - 3.5, 10, 7.5); bx.fillStyle = '#ffe17a'; bx.fillRect(x - 4.5, y - 1, 9, 4); bx.fillStyle = '#6fbf5a'; bx.fillRect(x - 4.5, y - 3, 9, 2);
      bx.fillStyle = '#e6be52'; bx.fillRect(x - 3, y + 0.5, 1, 1); bx.fillRect(x + 1, y + 1.5, 1, 1); bx.fillRect(x + 2.5, y, 1, 1);
    } else {
      bx.fillStyle = '#5a4a6a'; bx.fillRect(x - 3, y - 9, 6, 9); bx.fillStyle = '#fff8e8'; bx.fillRect(x - 2.5, y - 6, 5, 5.5); bx.fillStyle = '#f08a4b'; bx.fillRect(x - 3, y - 9, 6, 2.5);
      bx.fillStyle = '#f6c453'; bx.fillRect(x - 1.5, y - 4.5, 3, 2);
    }
  }

  // ================================================================
  // Just for fun: floating words, popping bubbles, tricks, daily treasure, the Snorkel Zombie visitor, lights off
  // ================================================================
  function floater(text, x, y, col) { if (floaters.length < 12) floaters.push({ text, x, y, life: 1.7, col: col || '#ffffff' }); }
  function popBubble(i) { const b = bubbles[i]; bubbles.splice(i, 1); parts.push({ x: b.x, y: b.y, vy: -4, life: 0.5, type: 'spark' }); snd('tick'); }
  function trick(a) { a.trickT = 1; a.labelT = 0; a.wait = 0; for (let k = 0; k < 2; k++) heart(a.x + rand(-4, 4), a.y - a.h / 2); sparkle(a.x, a.y); snd('pop'); }
  // the chest / the clam: coins once a day each ('come back tomorrow' after that)
  function treasure(kind, x, y) {
    const n = ST.aquaTreasure ? ST.aquaTreasure(kind) : 0;
    if (n) { floater(kind === 'clam' ? `A pearl! +${n} coins` : `Treasure! +${n} coins`, x, y, '#ffe066'); snd('level'); sparkle(x, y + 3); sparkle(x, y + 3); }
    else floater(kind === 'clam' ? 'No pearl yet: come back tomorrow!' : 'Empty: come back tomorrow!', x, y, '#e8f2ff');
  }
  const treasureKind = id => (id === 'chest' || id === 'goldtreasure' ? 'chest' : id === 'clam' ? 'clam' : null);
  // the Snorkel Zombie: swims across now and then; tap it and it flees (and pays a few coins)
  function spawnVisitor() {
    if (visitor || !ww) return;
    const dir = Math.random() < 0.5 ? 1 : -1;
    visitor = { x: dir > 0 ? -14 : ww + 14, y: rand(L.top + 40, Math.max(L.top + 42, L.sandTop - 8)), dir, sp: 8, scared: false, bubT: 0 };
  }
  function updateVisitor(dt) {
    if (!visitor) { if (mode === 'play' && !night() && t > nextVisitorAt) spawnVisitor(); return; }
    const v = visitor; v.x += v.dir * (v.scared ? 36 : v.sp) * dt; v.bubT -= dt;
    if (v.bubT <= 0) { v.bubT = v.scared ? 0.12 : 0.7; bubble(v.x + v.dir * 3, v.y - 30, false); }
    if (v.x < -24 || v.x > ww + 24) { visitor = null; const r = AQ().FUN.visitorSec; nextVisitorAt = t + rand(r[0], r[1]); }
  }
  const visitorHit = (x, y) => visitor && !visitor.scared && Math.abs(x - visitor.x) < 11 && y > visitor.y - 32 && y < visitor.y + 1;
  function scare() {
    const v = visitor; v.scared = true; v.dir = v.x < ww / 2 ? -1 : 1;
    const n = ST.aquaScare ? ST.aquaScare() : 0;
    floater('Eek!', v.x, v.y - 34, '#ffffff'); if (n) floater(`+${n} coins`, v.x, v.y - 26, '#ffe066');
    for (const a of actors) { a.happyT = 0.6; if (Math.random() < 0.5) heart(a.x, a.y - a.h / 2); }
    snd('pop');
  }
  function drawVisitor() {
    if (!visitor) return;
    const v = visitor, c = PX.sprig({ zombie: 'snorkel' }, { walk: true, frame: Math.floor(t * (v.scared ? 8 : 3)) % 2 });
    PX.blit(bx, c, v.x, v.y + Math.round(Math.sin(t * 2.2) * 1.5), v.dir < 0, PX.SPRIG_AX, PX.SPRIG_AY);
  }
  // lights off: the water goes dark blue, glowing fish and decorations shine, little plankton twinkle, sleepy fish say z
  function drawNight() {
    bx.fillStyle = 'rgba(14,20,62,0.58)'; bx.fillRect(0, T.lid, ww, wh - T.lid);
    const G = AQ().FUN.glow; bx.globalCompositeOperation = 'lighter';
    const glow = (x, y, r, col) => { const g = bx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col + '88'); g.addColorStop(1, col + '00'); bx.fillStyle = g; bx.fillRect(x - r, y - r, r * 2, r * 2); };
    for (const a of actors) if (G[a.kind]) glow(a.x, a.y, Math.max(a.w, a.h) * 0.9, G[a.kind]);
    for (const it of items()) if (G[it.id]) { const c = PX.aquaSprite('decor', it.id, 0), w = PX.artW(c), h = PX.artH(c), p = itemXY(it, w); glow(p.x, p.y - h / 2, Math.max(w, h) * 0.8, G[it.id]); }
    for (let i = 0; i < 16; i++) {
      const x = (i * 53 + Math.sin(t * 0.3 + i) * 12 + t * 2) % ww, y = L.top + 6 + ((i * 37 + t * (1 + i % 3)) % Math.max(10, L.sandTop - L.top - 8));
      bx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 3 + i * 1.7); bx.fillStyle = ['#9ff6ff', '#ffb8ec', '#c8ff9a'][i % 3]; bx.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, 0.5, 0.5);
    }
    bx.globalAlpha = 1; bx.globalCompositeOperation = 'source-over';
  }

  // ================================================================
  // Decorations
  // ================================================================
  // which frame a decoration shows: swaying ones rock gently; the chest and clam open when tapped (and now and then)
  function decorFrame(it) {
    const I = decorInfo(it.id), ph = it.x * 7.3 + it.d * 3.1, until = decorFx.get(it) || 0;
    if (I.anim === 'sway') return Math.floor(t * 0.9 + ph) % 2;
    if (I.anim === 'open') return until > t ? 1 : (Math.floor(t / 9 + ph) % 4 === 0 && (t % 9) < 1.6 ? 1 : 0);
    if (I.anim === 'bubbles') return Math.floor(t / 2.5 + ph) % 2;
    return 0;
  }
  function drawItem(it) {
    const c = PX.aquaSprite('decor', it.id, decorFrame(it)), w = PX.artW(c), p = itemXY(it, w), lifted = drag && drag.it === it;
    // a soft shadow on the sand (while it's carried, the shadow shows where it will land)
    bx.fillStyle = lifted ? 'rgba(34,32,52,.24)' : 'rgba(34,32,52,.14)'; const sw = Math.round(w * 0.7); bx.fillRect(Math.round(p.x - sw / 2), p.y - 1, sw, 2);
    PX.blit(bx, c, p.x, p.y - (lifted ? 3 : 0));
    // treasure waiting today: a twinkle above the chest or the clam
    const tk = treasureKind(it.id);
    if (tk && !lifted && ST.aquaTreasureReady && ST.aquaTreasureReady(tk) && Math.floor(t * 2 + it.x * 5) % 3 === 0) {
      const sx = p.x + Math.round(PX.artW(c) * 0.25), sy = p.y - PX.artH(c) - 2; bx.fillStyle = '#fff6b0'; bx.fillRect(sx - 1.5, sy, 4, 1); bx.fillRect(sx, sy - 1.5, 1, 4); bx.fillStyle = '#ffffff'; bx.fillRect(sx, sy, 1, 1);
    }
  }
  // everything in the tank, back to front: decorations by how far back they stand, fish by their depth (a fish in a child's
  // fingers, or a decoration being carried, comes to the front)
  function drawList() {
    const list = [];
    for (const it of items()) list.push({ kind: 'decor', it, z: drag && drag.it === it ? 1.02 : it.d });
    for (const a of actors) list.push({ kind: 'fish', a, z: a.held ? 1.01 : a.swim === 'snail' ? 1.5 : a.z });
    return list.sort((p, q) => p.z - q.z);
  }
  // decorating: the sand glows where things can go, and every decoration gets a dotted outline
  function drawDecoMarks() {
    const pulse = 0.55 + Math.sin(t * 3) * 0.2;
    bx.globalAlpha = 0.14 * pulse * 2; bx.fillStyle = '#ffffff'; bx.fillRect(2, L.floorBack - 2, ww - 4, Math.max(3, L.floorFront - L.floorBack + 3));
    bx.globalAlpha = pulse; for (let x = 3; x < ww - 3; x += 3) { bx.fillRect(x, L.floorBack - 3, 2, 0.5); bx.fillRect(x, L.floorFront + 1, 2, 0.5); }
    for (const it of items()) {
      const c = PX.aquaSprite('decor', it.id, 0), w = PX.artW(c), h = PX.artH(c), p = itemXY(it, w);
      const x0 = Math.round(p.x - w / 2) - 1, y0 = p.y - h - 1, x1 = x0 + w + 2, y1 = p.y + 1;
      for (let x = x0; x <= x1; x += 2) { bx.fillRect(x, y0, 1, 0.5); bx.fillRect(x, y1, 1, 0.5); }
      for (let y = y0; y <= y1; y += 2) { bx.fillRect(x0, y, 0.5, 1); bx.fillRect(x1, y, 0.5, 1); }
    }
    bx.globalAlpha = 1;
  }

  // ================================================================
  // Drawing
  // ================================================================
  function drawRays() {
    bx.fillStyle = '#ffffff';
    for (let i = 0; i < 5; i++) {
      const x = ww * (0.1 + i * 0.21) + Math.sin(t * 0.25 + i * 1.7) * 10, w = 9 + (i % 3) * 5, lean = 26 + i * 4;
      bx.globalAlpha = 0.05 + 0.025 * Math.sin(t * 0.6 + i * 2.1);
      bx.beginPath(); bx.moveTo(x, L.top - 2); bx.lineTo(x + w, L.top - 2); bx.lineTo(x + w + lean, L.sandTop); bx.lineTo(x + lean - w * 0.4, L.sandTop); bx.closePath(); bx.fill();
    }
    // light dancing on the sand
    bx.globalAlpha = 0.22;
    for (let i = 0; i < 14; i++) { const x = (i * 37 + Math.sin(t * 0.7 + i) * 9 + t * 3) % ww, y = L.sandTop + 3 + (i * 7) % Math.max(4, wh - L.sandTop - 6); bx.fillRect(Math.round(x), Math.round(y), 2 + (i % 3), 0.5); }
    bx.globalAlpha = 1;
  }
  function drawFlakesBubbles() {
    for (const f of flakes) { bx.globalAlpha = f.down ? Math.min(1, f.life / 2) : 1; bx.fillStyle = f.col; bx.fillRect(Math.round(f.x * 2) / 2, Math.round(f.y * 2) / 2, 1, 0.5); }
    bx.globalAlpha = 1;
    for (const b of bubbles) {
      const x = b.x, y = b.y, r = b.r;
      bx.fillStyle = 'rgba(255,255,255,.55)';
      for (let a = 0; a < 6.283; a += 0.9 / r) bx.fillRect(Math.round((x + Math.cos(a) * r) * 2) / 2, Math.round((y + Math.sin(a) * r) * 2) / 2, 0.5, 0.5);
      bx.fillStyle = 'rgba(255,255,255,.9)'; bx.fillRect(Math.round((x - r * 0.4) * 2) / 2, Math.round((y - r * 0.4) * 2) / 2, 0.5, 0.5);
    }
  }
  // the glass: a lid with its light along the top, soft side edges and a couple of faint reflections
  function drawGlass() {
    bx.fillStyle = '#3c4a6a'; bx.fillRect(0, 0, ww, T.lid);
    bx.fillStyle = '#566890'; bx.fillRect(0, T.lid - 2, ww, 1);
    if (!night()) { bx.fillStyle = '#fff4c8'; bx.fillRect(Math.round(ww * 0.2), T.lid - 1, Math.round(ww * 0.6), 1); bx.globalAlpha = 0.18; bx.fillStyle = '#fffbe6'; bx.fillRect(0, T.lid, ww, 2); bx.globalAlpha = 1; }
    bx.fillStyle = 'rgba(255,255,255,.22)'; bx.fillRect(0, T.lid, 1, wh); bx.fillRect(ww - 1, T.lid, 1, wh);
    bx.fillStyle = 'rgba(255,255,255,.05)';
    bx.beginPath(); bx.moveTo(ww * 0.62, T.lid); bx.lineTo(ww * 0.68, T.lid); bx.lineTo(ww * 0.5, wh); bx.lineTo(ww * 0.44, wh); bx.closePath(); bx.fill();
    bx.beginPath(); bx.moveTo(ww * 0.71, T.lid); bx.lineTo(ww * 0.73, T.lid); bx.lineTo(ww * 0.55, wh); bx.lineTo(ww * 0.53, wh); bx.closePath(); bx.fill();
  }
  function render() {
    paintBg();
    bx.setTransform(K, 0, 0, K, 0, 0); bx.imageSmoothingEnabled = false;
    bx.drawImage(bgC, 0, 0, ww, wh);
    if (!night()) drawRays();
    if (mode === 'deco') drawDecoMarks();
    drawGunk();
    for (const o of drawList()) { if (o.kind === 'fish') { if (o.a.swim !== 'snail' || o.a.held) drawFish(o.a); } else drawItem(o.it); }
    drawVisitor();
    drawFlakesBubbles();
    drawParts();
    drawMurk();
    drawAlgae();
    for (const a of actors) if (a.swim === 'snail' && !a.held) drawFish(a);
    if (night()) drawNight();
    if (lureOn()) { bx.globalAlpha = 0.5 + Math.sin(t * 8) * 0.2; bx.fillStyle = '#ffffff'; const r = 5 + Math.sin(t * 6) * 1.5; for (let a = 0; a < 6.283; a += 0.4) bx.fillRect(Math.round((press.x + Math.cos(a) * r) * 2) / 2, Math.round((press.y + Math.sin(a) * r) * 2) / 2, 0.5, 0.5); bx.globalAlpha = 1; }
    drawTool();
    drawGlass();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, 0, 0, ww * Z * DPR, wh * Z * DPR);
    // names over fish that were just tapped, crisp at screen resolution
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.font = '800 14px "Nunito", sans-serif';
    for (const a of actors) {
      if (a.labelT <= 0 && a.sayT <= 0) continue;
      const x = a.x * Z, y = (a.y - a.h / 2 - 3) * Z, s = a.sayT > 0 ? a.say : a.name ? `${a.name} the ${fishInfo(a.kind).name}` : fishInfo(a.kind).name;
      ctx.globalAlpha = Math.min(1, Math.max(a.labelT, a.sayT) * 2); ctx.lineWidth = 4; ctx.strokeStyle = '#2a3550'; ctx.strokeText(s, x, y); ctx.fillStyle = '#ffffff'; ctx.fillText(s, x, y);
    }
    for (const f of floaters) { ctx.globalAlpha = Math.min(1, f.life * 1.5); ctx.lineWidth = 4; ctx.strokeStyle = '#2a3550'; ctx.strokeText(f.text, f.x * Z, f.y * Z); ctx.fillStyle = f.col; ctx.fillText(f.text, f.x * Z, f.y * Z); }
    ctx.globalAlpha = 1;
  }

  // ================================================================
  // Touch: tap to say hello / open things; drag (or long-press) to pick up a fish or a decoration and move it
  // ================================================================
  function worldOf(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / Z, y: (e.clientY - r.top) / Z }; }
  // the front-most thing under the finger (the same order things are drawn, backwards)
  function hitAt(x, y) {
    const list = drawList();
    for (let i = list.length - 1; i >= 0; i--) {
      const o = list[i];
      if (o.kind === 'fish') { const a = o.a; if (Math.abs(x - a.x) <= a.w / 2 + 2 && Math.abs(y - a.y) <= a.h / 2 + 2) return o; continue; }
      const c = PX.aquaSprite('decor', o.it.id, 0), w = PX.artW(c), h = PX.artH(c), p = itemXY(o.it, w);
      if (x >= p.x - w / 2 - 1 && x <= p.x + w / 2 + 1 && y >= p.y - h - 1 && y <= p.y + 2) return o;
    }
    return null;
  }
  function onDown(e) {
    if (!ww) return;
    // a new touch always starts fresh: an iPad can lose a finger's "up" (a call, a pop-up), which would otherwise leave
    // something stuck in the air and every later touch ignored
    if (press) { if (e.pointerId === press.id) return; dropPress(); }
    try { if (PX.Sound.unlock) PX.Sound.unlock(); } catch (err) { /* optional */ }
    const p = worldOf(e);
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
    // feeding and cleaning: the finger is the food shaker / the sponge (nothing gets picked up)
    if (mode === 'feed' || mode === 'clean') {
      press = { id: e.pointerId, x0: p.x, y0: p.y, x: p.x, y: p.y, hit: null, drag: false, timer: 0, tool: mode, last: t };
      if (mode === 'feed') sprinkle(p.x, p.y); else rub(p.x, p.y, 6);
      return;
    }
    if (mode === 'play') {
      // the visitor first (it's in front), then a bubble right under the finger
      if (visitorHit(p.x, p.y)) { scare(); press = { id: e.pointerId, x0: p.x, y0: p.y, x: p.x, y: p.y, hit: null, drag: false, timer: 0, tool: 'none' }; return; }
      const bi = bubbles.findIndex(b => Math.hypot(b.x - p.x, b.y - p.y) < b.r + 2.5);
      if (bi >= 0) { popBubble(bi); press = { id: e.pointerId, x0: p.x, y0: p.y, x: p.x, y: p.y, hit: null, drag: false, timer: 0, tool: 'none' }; return; }
    }
    press = { id: e.pointerId, x0: p.x, y0: p.y, x: p.x, y: p.y, hit: hitAt(p.x, p.y), drag: false, timer: 0 };
    // nothing under the finger: hold it there and the fish come to see (a quick tap still makes a bubble)
    if (!press.hit && mode === 'play') press.lure = t;
    // a still press picks things up too
    if (press.hit) press.timer = setTimeout(() => { if (press && !press.drag) startDrag(); }, DRAG.holdMs);
  }
  function startDrag() {
    // (the grab point is where the finger first touched, so the thing stays under the finger the way it was picked up)
    const h = press.hit; press.drag = true; snd('tick');
    if (h.kind === 'fish') { const a = h.a; a.held = true; a.ox = a.x - press.x0; a.oy = a.y - press.y0; a.happyT = 0.6; a.labelT = T.labelSec; a.vx = a.vy = 0; }
    else { const c = PX.aquaSprite('decor', h.it.id, 0), p = itemXY(h.it, PX.artW(c)); drag = { it: h.it, x: h.it.x, d: h.it.d, ox: p.x - press.x0, oy: p.y - press.y0 }; }
  }
  function onMove(e) {
    if (!press || e.pointerId !== press.id) return;
    const p = worldOf(e);
    if (press.tool) {
      const dist = Math.hypot(p.x - press.x, p.y - press.y); press.x = p.x; press.y = p.y;
      if (press.tool === 'clean') rub(p.x, p.y, dist); else if (press.tool === 'feed' && t - press.last > 0.09) { press.last = t; sprinkle(p.x, p.y); }
      return;
    }
    press.x = p.x; press.y = p.y;
    if (press.lure && Math.hypot(p.x - press.x0, p.y - press.y0) > 3) press.lureMoved = true;
    if (!press.drag && press.hit && Math.hypot(p.x - press.x0, p.y - press.y0) * Z > DRAG.move) { clearTimeout(press.timer); startDrag(); }
    if (press.drag) carry(p);
  }
  // the carried fish or decoration follows the finger
  function carry(p) {
    const h = press.hit;
    if (h.kind === 'fish') {
      // anywhere in the water (walkers stay on the sand); it turns to face the way it's carried
      const a = h.a, b = bandOf(a), nx = clamp(p.x + a.ox, b.x0, b.x1);
      if (nx > a.x + 0.3) a.face = 1; else if (nx < a.x - 0.3) a.face = -1;
      a.x = nx; a.y = clamp(p.y + a.oy, CRAWL[a.swim] ? b.y0 : L.top + a.h / 2, b.y1);
    } else { drag.x = clamp((p.x + drag.ox) / Math.max(1, ww), 0, 1); drag.d = depthOfY(p.y + drag.oy); }
  }
  function onUp(e) {
    if (!press || e.pointerId !== press.id) return;
    clearTimeout(press.timer);
    if (press.tool) { press = null; return; }
    if (press.lure) { const pr = press; press = null; if (!pr.lureMoved && t - pr.lure < 0.25) bubble(pr.x0, pr.y0, true); return; }
    if (press.drag) carry(worldOf(e)); // (lands exactly where the finger lifts, even after a quick flick)
    const pr = press; press = null;
    if (!pr.drag) { tap(pr.x0, pr.y0, pr.hit); return; }
    if (pr.hit.kind === 'fish') {
      // let go: it stays put for a moment, then swims off again
      const a = pr.hit.a, b = bandOf(a); a.held = false; a.y = clamp(a.y, b.y0, b.y1); a.tx = a.x; a.ty = a.y; a.wait = rand(2, 3.5);
      for (let k = 0; k < 3; k++) bubble(a.x + rand(-3, 3), a.y - a.h / 2, false);
    } else {
      const it = drag.it, i = items().indexOf(it), x = drag.x, d = drag.d; drag = null;
      if (i >= 0) ST.aquaMoveItem(i, x, d);
      const c = PX.aquaSprite('decor', it.id, 0), p = itemXY(it, PX.artW(c)); for (let k = 0; k < 4; k++) bubble(p.x + rand(-4, 4), p.y - 2, false);
    }
    snd('pop');
  }
  function onCancel(e) { if (press && e.pointerId === press.id) dropPress(); }
  // forget the current touch: a carried fish swims on from where it is, a carried decoration goes back where it was
  function dropPress() {
    if (!press) return;
    clearTimeout(press.timer);
    if (press.hit && press.hit.kind === 'fish') { const a = press.hit.a; a.held = false; a.tx = a.x; a.ty = a.y; }
    drag = null; press = null;
  }
  function tap(x, y, hit) {
    if (mode === 'deco') {
      if (hit && hit.kind === 'decor') { snd('tick'); pickItem(items().indexOf(hit.it)); return; }
      if (y >= L.sandTop - 4) { snd('tick'); pickAdd(clamp(x / Math.max(1, ww), 0, 1), depthOfY(y)); return; }
      if (hit && hit.kind === 'fish') { hello(hit.a); return; }
      PS.ui.toast('Tap the sand to add a decoration. Drag things to move them.', 2400); return;
    }
    if (hit && hit.kind === 'fish') {
      // two quick taps on the same fish: a trick!
      if (lastTap && lastTap.a === hit.a && t - lastTap.t < 0.45) { trick(hit.a); lastTap = null; } else { hello(hit.a); lastTap = { a: hit.a, t }; }
      return;
    }
    if (hit && hit.kind === 'decor') {
      const it = hit.it, I = decorInfo(it.id), c = PX.aquaSprite('decor', it.id, 0), w = PX.artW(c), h = PX.artH(c), p = itemXY(it, w);
      if (I.anim === 'open') { decorFx.set(it, t + T.openSec); sparkle(p.x, p.y - h * 0.6); snd('pop'); }
      if (treasureKind(it.id)) treasure(treasureKind(it.id), p.x, p.y - h - 2);
      else if (I.anim === 'bubbles') { for (let k = 0; k < 6; k++) bubble(p.x + rand(-2, 2), p.y - h + 2 - k * 2, true); snd('tick'); }
      else { for (let k = 0; k < 3; k++) bubble(p.x + rand(-w / 3, w / 3), p.y - h * 0.6, false); }
      return;
    }
    bubble(x, y, true);
  }
  function hello(a) {
    a.labelT = T.labelSec; a.happyT = 0.6; a.wait = 0;
    if (PX.FISH_ART[a.kind + ':puffed']) { a.puffT = T.puffSec; snd('pop'); } else { heart(a.x, a.y - a.h / 2); snd('tick'); }
  }

  // ================================================================
  // Menus
  // ================================================================
  const spriteHtml = '<canvas class="px"></canvas>';
  function drawInto(c, src) { if (!c || !src) return; PS.ui.fitCanvas(c, src); PS.ui.paint(c, src); }
  function refreshHearts() {
    if (!heartsEl || !ST.aquaHappy) return;
    const h = ST.aquaHappy(); heartsEl.textContent = '♥'.repeat(h.hearts) + '♡'.repeat(5 - h.hearts); heartsEl.dataset.tip = h.tips[0] || '';
  }
  function refreshCount() {
    if (!countEl) return;
    refreshHearts();
    if (lightBtn) { lightBtn.textContent = night() ? '☀' : '☾'; lightBtn.setAttribute('aria-label', night() ? 'Turn the lights on' : 'Turn the lights off'); }
    if (mode === 'deco') { countEl.textContent = 'Tap the sand to add a decoration · drag things to move them'; return; }
    if (mode === 'feed') { countEl.textContent = 'Tap or swipe the water to sprinkle food'; return; }
    const d = dirt(), messy = d.algae.length + d.gunk.length;
    if (barPlay) { const cb = barPlay.querySelector('[data-aq="clean"]'); if (cb) cb.classList.toggle('dirty', d.algae.length >= 6 || d.gunk.length >= 6); }
    if (mode === 'clean') { countEl.textContent = messy ? 'Rub the glass and the sand to clean them' : 'Sparkling clean!'; return; }
    const A = aq(), n = A.fish.filter(f => f.tank).length;
    countEl.textContent = `${n} of ${AQ().TANK.maxFish} fish swimming${A.fish.length > n ? ` · ${A.fish.length - n} in the Fish Room` : ''}`;
  }
  function setMode(m) {
    if (m === 'feed') fedNow = false;
    mode = m; barPlay.hidden = m !== 'play'; barDeco.hidden = m !== 'deco'; barTool.hidden = m !== 'feed' && m !== 'clean'; sizeKey = '';
    const box = root.querySelector('.aq'); box.classList.toggle('deco', m === 'deco'); box.classList.toggle('tool', m === 'feed' || m === 'clean');
    refreshCount();
  }
  // decorations you own, as buttons (n = how many are left to put out); onPick(id)
  function decorButtons(box, cur, onPick) {
    const A = aq(), owned = Object.keys(A.decor || {}).filter(id => (A.decor[id] || 0) > 0 && AQ().DECOR[id]);
    for (const id of owned) {
      const I = decorInfo(id), free = ST.aquaFree(id);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'aq-opt' + (id === cur ? ' on' : '');
      b.innerHTML = `${spriteHtml}<span><b>${esc(I.name)}</b><small>${id === cur ? 'This one' : free > 0 ? `${free} to put out` : 'All out already'}</small></span>`;
      drawInto(b.querySelector('canvas'), PX.aquaSprite('decor', id, 0));
      if (free <= 0 && id !== cur) b.disabled = true;
      b.onclick = () => onPick(id);
      box.appendChild(b);
    }
    return owned.length;
  }
  const shopBtn = { label: 'Get more in the Shop', onClick: () => { setMode('play'); PS.ui.go('shop', { tab: 'aquarium' }); } };
  // a tap on the sand while decorating: put a decoration right there
  function pickAdd(x, d) {
    if (items().length >= AQ().TANK.items) { PS.ui.toast(`The sand is full (${AQ().TANK.items} decorations). Tap one to put it away first.`, 2800); return; }
    PS.ui.modal({
      eyebrow: 'Decorate', title: 'Put a decoration here',
      html: `<p class="aq-pnote">You can drag it anywhere afterwards.</p><div class="sbox-frame"><div class="sbox aq-grid"></div></div>`,
      buttons: [shopBtn, { label: 'Done', kind: 'primary' }],
      mount(card, close) {
        const n = decorButtons(card.querySelector('.aq-grid'), null, id => { if (ST.aquaPlaceAt(id, x, d) < 0) PS.ui.toast('That one is already out.', 1800); else snd('pop'); close(); });
        if (!n) card.querySelector('.aq-pnote').textContent = 'You have no decorations yet. Buy them in the Shop, or win them in races, battles and gumballs.';
      },
    });
  }
  // a tap on a decoration while decorating: swap it for another one, or put it away
  function pickItem(i) {
    const it = items()[i]; if (!it) return;
    PS.ui.modal({
      eyebrow: 'Decorate', title: esc(decorInfo(it.id).name), sprite: PX.aquaSprite('decor', it.id, 0),
      html: `<p class="aq-pnote">Drag it to move it. Or swap it for another decoration:</p><div class="sbox-frame"><div class="sbox aq-grid"></div></div>`,
      buttons: [{ label: 'Put it away', kind: 'danger', onClick: () => { ST.aquaRemoveItem(items().indexOf(it)); snd('pop'); } }, { label: 'Done', kind: 'primary' }],
      mount(card, close) { decorButtons(card.querySelector('.aq-grid'), it.id, id => { if (id !== it.id) ST.aquaSwapItem(items().indexOf(it), id); snd('pop'); close(); }); },
    });
  }
  // backdrops and sand: what you own, and what's in the Shop
  function pickLook(kind) {
    const A = aq(), table = kind === 'backdrop' ? AQ().BACKDROPS : AQ().SANDS, own = (A.own || {})[kind] || {}, cur = A[kind];
    PS.ui.modal({
      eyebrow: 'Decorate', title: kind === 'backdrop' ? 'Choose a backdrop' : 'Choose the sand',
      html: `<div class="sbox-frame"><div class="sbox aq-grid"></div></div>`,
      buttons: [{ label: 'Done', kind: 'primary' }],
      mount(card, close) {
        const box = card.querySelector('.aq-grid');
        for (const [id, I] of Object.entries(table)) {
          const have = !!own[id];
          const b = document.createElement('button'); b.type = 'button'; b.className = 'aq-opt' + (id === cur ? ' on' : '');
          b.innerHTML = `${spriteHtml}<span><b>${esc(I.name)}</b><small>${id === cur ? 'Using now' : have ? 'Tap to use' : I.price ? `In the Shop · ${I.price.toLocaleString()} coins` : 'A special prize'}</small></span>`;
          drawInto(b.querySelector('canvas'), PX.item(kind, id));
          if (!have) b.disabled = true;
          b.onclick = () => { ST.aquaSet(kind, id); snd('pop'); close(); };
          box.appendChild(b);
        }
      },
    });
  }
  // My Fish: the tank and the Fish Room side by side (tap to move across), like the garden house
  function myFish() {
    PS.ui.modal({
      eyebrow: 'My Aquarium', title: 'My fish', buttons: [{ label: 'Fish Guide', onClick: () => { setTimeout(fishGuide, 0); } }, { label: 'Done', kind: 'primary' }],
      html: `<p class="aq-intro">Tap a fish to move it across. Up to ${AQ().TANK.maxFish} fish can swim in the tank; the rest wait in the Fish Room. Tap ⓘ to meet a fish.</p><div class="aq-cols sb-host"><section class="aq-col" data-col="tank"></section><section class="aq-col room" data-col="room"></section></div>`,
      mount(card, close) {
        const cols = { tank: card.querySelector('[data-col="tank"]'), room: card.querySelector('[data-col="room"]') };
        const render = () => {
          const all = aq().fish;
          for (const inTank of [true, false]) {
            const col = cols[inTank ? 'tank' : 'room'], old = col.querySelector('.aq-list'), keep = old ? old.scrollTop : 0;
            const list = all.filter(f => !!f.tank === inTank);
            col.innerHTML = `<h3 class="aq-hh">${inTank ? 'In the tank' : 'Fish Room'}<small>${inTank ? `${list.length} of ${AQ().TANK.maxFish}` : list.length}</small></h3><div class="sbox-frame"><div class="sbox aq-list"></div></div>`;
            const box = col.querySelector('.aq-list');
            if (!list.length) { const p = document.createElement('p'); p.className = 'aq-none'; p.textContent = inTank ? 'The tank is empty.' : 'Nobody is waiting.'; box.appendChild(p); }
            for (const f of list) {
              const I = fishInfo(f.kind), row = document.createElement('div'); row.className = 'aq-row';
              row.innerHTML = `<button type="button" class="aq-item">${spriteHtml}<span><b>${esc(f.name)}</b><small>${esc(I.name)}</small></span><i>${inTank ? '→' : '←'}</i></button><button type="button" class="aq-info" aria-label="About ${esc(f.name)}">ⓘ</button>`;
              drawInto(row.querySelector('canvas'), PX.aquaSprite('fish', f.kind, 0));
              row.querySelector('.aq-item').onclick = () => {
                const r = ST.aquaMove(f.id, !inTank);
                if (!r.ok) { PS.ui.toast(r.reason === 'full' ? `The tank is full (${AQ().TANK.maxFish} fish). Move someone to the Fish Room first.` : 'That fish can\'t move right now.', 2600); snd('tick'); return; }
                snd('pop'); render();
              };
              row.querySelector('.aq-info').onclick = () => { close(); setTimeout(() => fishCard(f.id), 0); };
              box.appendChild(row);
            }
            box.scrollTop = keep;
          }
        };
        render();
      },
    });
  }
  function fishCard(id) {
    const f = aq().fish.find(x => x.id === id); if (!f) return;
    const I = fishInfo(f.kind);
    PS.ui.modal({
      eyebrow: `${rarityName(I.rarity)} · ${esc(I.name)}`, title: esc(f.name), sprite: PX.aquaSprite('fish', f.kind, 0),
      html: `<p>${esc(I.fact || '')}</p>${f.src ? `<p class="aq-src">Got it from: ${esc(f.src)}</p>` : ''}`,
      buttons: [{ label: 'Rename', onClick: () => { setTimeout(() => renameFish(f.id), 0); } }, { label: 'Let it go', kind: 'danger', onClick: () => { setTimeout(() => letGo(f), 0); } }, { label: 'Back to My fish', onClick: () => { setTimeout(myFish, 0); } }, { label: 'OK', kind: 'primary' }],
    });
  }
  function renameFish(id) {
    const f = aq().fish.find(x => x.id === id); if (!f) return;
    let inp = null;
    const save = () => { const n = inp && ST.aquaRename(f.id, inp.value); if (n) { PS.ui.toast(`Say hi to ${n}!`, 1800); snd('pop'); } else PS.ui.toast('Type a name first.', 1600); };
    PS.ui.modal({
      eyebrow: esc(fishInfo(f.kind).name), title: 'A new name', sprite: PX.aquaSprite('fish', f.kind, 0), row: true,
      html: `<input class="aq-namein" type="text" maxlength="12" autocomplete="off" autocapitalize="words" enterkeyhint="done" value="${esc(f.name)}" aria-label="Fish name">`,
      buttons: [{ label: 'Cancel' }, { label: 'Save', kind: 'primary', onClick: () => save() }],
      mount(card, close) {
        inp = card.querySelector('.aq-namein');
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { save(); close(); } });
        setTimeout(() => { try { inp.focus(); inp.select(); } catch (e) { /* the child taps it */ } }, 60);
      },
    });
  }
  function letGo(f) {
    const I = fishInfo(f.kind), coins = ST.aquaReleaseValue ? ST.aquaReleaseValue(f) : 0;
    PS.ui.modal({
      eyebrow: 'Let it go?', title: `Say goodbye to ${esc(f.name)}?`, sprite: PX.aquaSprite('fish', f.kind, 0),
      html: `<p>${esc(f.name)} the ${esc(I.name)} swims back to the ocean${coins ? `, and the pet shop gives you <b>${coins.toLocaleString()} coins</b>` : ''}. You can't undo this.</p>`, row: true,
      buttons: [{ label: 'Keep it' }, { label: 'Let it go', kind: 'danger', onClick: () => { const got = ST.aquaRelease(f.id); if (got != null) { snd('pop'); PS.ui.toast(`Bye bye, ${f.name}!${got ? ` +${got} coins` : ''}`, 2200); } } }],
    });
  }
  // every species: what you have, and where to get the rest
  function fishGuide() {
    const A = aq(), have = {}; for (const f of A.fish) have[f.kind] = (have[f.kind] || 0) + 1;
    const order = ['common', 'rare', 'epic', 'legendary'], fishIds = Object.keys(AQ().FISH).filter(k => !k.includes(':'));
    const got = fishIds.filter(k => have[k] || (A.seen || {})[k]).length;
    PS.ui.modal({
      eyebrow: 'My Aquarium', title: 'Fish Guide', buttons: [{ label: 'Done', kind: 'primary' }],
      html: `<p>You've found <b>${got} of ${fishIds.length}</b> kinds of fish.</p><div class="sbox-frame"><div class="sbox aq-guide"></div></div>`,
      mount(card) {
        const box = card.querySelector('.aq-guide');
        for (const r of order) {
          const ids = fishIds.filter(k => fishInfo(k).rarity === r); if (!ids.length) continue;
          const h = document.createElement('h3'); h.className = 'aq-gh r-' + r; h.textContent = rarityName(r); box.appendChild(h);
          const grid = document.createElement('div'); grid.className = 'aq-ggrid'; box.appendChild(grid);
          for (const k of ids) {
            const I = fishInfo(k), n = have[k] || 0, el = document.createElement('div'); el.className = 'aq-gitem' + (n ? '' : ' no');
            el.innerHTML = `${spriteHtml}<b>${esc(I.name)}</b><small>${n ? `You have ${n}` : I.price ? `Shop · ${I.price.toLocaleString()}` : 'Prize: Survival or Mega gumball'}</small>`;
            drawInto(el.querySelector('canvas'), PX.aquaSprite('fish', k, 0));
            grid.appendChild(el);
          }
        }
      },
    });
  }
  // a prize arrived (a win, a gumball, the shop): one card, waits until the player is back on a menu
  function announce(p) {
    const items = (p && p.items) || []; if (!items.length) return;
    if (!visible) markBadge(true);
    if (p.quiet) return; // (the shop and the gumball machine show their own reveal)
    const first = items[0], fish = items.filter(x => x.type === 'fish'), names = items.map(x => x.type === 'fish' ? fishInfo(x.kind).name : x.type === 'decor' ? decorInfo(x.id).name : ((x.type === 'backdrop' ? AQ().BACKDROPS : AQ().SANDS)[x.id] || {}).name || '');
    const room = fish.some(x => x.fish && !x.fish.tank), coins = items.filter(x => x.type === 'coins').reduce((a, x) => a + (x.n || 0), 0);
    if (coins && items.length === 1) return; // the fish room was full: the prize became coins (the caller says so)
    PS.ui.modal({
      eyebrow: p.src ? `For your aquarium · ${esc(p.src)}` : 'For your aquarium',
      title: fish.length > 1 ? 'New fish!' : `${esc(an(names[0]))}!`,
      sprite: first.type === 'fish' ? PX.aquaSprite('fish', first.kind, 0) : PX.item(first.type, first.type === 'decor' || first.type === 'backdrop' || first.type === 'sand' ? first.id : first.kind),
      html: `<p>${fish.length ? `<b>${esc(names.join(', '))}</b> ${room ? 'is waiting in the Fish Room (the tank is full).' : (fish.length > 1 ? 'are' : 'is') + ' swimming in your aquarium!'}` : `<b>${esc(names.join(', '))}</b> is ready to put in your aquarium. Tap Decorate in My Aquarium.`}</p>`,
      buttons: [{ label: 'See my aquarium', kind: 'primary', onClick: () => { PS.ui.go('aquarium'); } }, { label: 'OK' }],
    });
  }
  function markBadge(on) { const b = document.querySelector('[data-go="aquarium"] .badge'); if (b) b.hidden = !on; }

  // ================================================================
  // Scene
  // ================================================================
  function mount(el) {
    root = el; injectCSS();
    root.innerHTML = `<div class="aq">
      <canvas class="aq-cv" aria-label="Your aquarium. Tap a fish to say hello."></canvas>
      <div class="aq-top"><div class="aq-name"><b class="px-title">My Aquarium</b><button type="button" class="aq-hearts" data-aq="hearts" aria-label="How happy your tank is"></button><small class="aq-count"></small></div></div>
      <button type="button" class="aq-light" data-aq="lights" aria-label="Turn the lights off">☾</button>
      <div class="aq-bar" data-bar="play">
        <button type="button" class="btn primary" data-aq="feed">Feed</button>
        <button type="button" class="btn" data-aq="clean">Clean</button>
        <button type="button" class="btn" data-aq="fish">My Fish</button>
        <button type="button" class="btn" data-aq="deco">Decorate</button>
        <button type="button" class="btn go" data-aq="shop">Shop</button>
      </div>
      <div class="aq-bar" data-bar="deco" hidden>
        <button type="button" class="btn" data-aq="backdrop">Backdrop</button>
        <button type="button" class="btn" data-aq="sand">Sand</button>
        <button type="button" class="btn primary" data-aq="done">Done</button>
      </div>
      <div class="aq-bar" data-bar="tool" hidden>
        <button type="button" class="btn primary" data-aq="done">Done</button>
      </div>
    </div>`;
    cv = root.querySelector('.aq-cv'); ctx = cv.getContext('2d');
    buf = document.createElement('canvas'); bx = buf.getContext('2d');
    bgC = document.createElement('canvas'); bgx = bgC.getContext('2d');
    barPlay = root.querySelector('[data-bar="play"]'); barDeco = root.querySelector('[data-bar="deco"]'); barTool = root.querySelector('[data-bar="tool"]'); countEl = root.querySelector('.aq-count'); heartsEl = root.querySelector('.aq-hearts'); lightBtn = root.querySelector('.aq-light');
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onCancel);
    cv.addEventListener('lostpointercapture', onCancel);
    root.querySelector('.aq').addEventListener('click', e => {
      const b = e.target.closest('[data-aq]'); if (!b) return;
      const k = b.dataset.aq; snd('tick');
      if (k === 'feed') { if (!actors.length) PS.ui.toast('No fish in the tank yet. Win some, buy some in the Shop, or try a gumball!', 2600); else setMode('feed'); }
      else if (k === 'clean') setMode('clean');
      else if (k === 'hearts') { const tip = heartsEl.dataset.tip; PS.ui.toast(tip || 'Your tank is super happy! ♥', 2600); }
      else if (k === 'lights') { ST.aquaLights(night()); refreshCount(); if (night()) for (const a of actors) if (FOLLOW(a) && Math.random() < 0.5) { a.say = 'z z'; a.sayT = 1.2; } }
      else if (k === 'fish') myFish();
      else if (k === 'deco') setMode('deco');
      else if (k === 'done') setMode('play');
      else if (k === 'shop') PS.ui.go('shop', { tab: 'aquarium' });
      else if (k === 'backdrop' || k === 'sand') pickLook(k);
    });
  }
  function show() {
    visible = true; sizeKey = ''; fishKey = '';
    markBadge(false);
    try { if (ST.aquaSeenAll) ST.aquaSeenAll(); } catch (e) { /* optional */ }
    if (ST.aquaWelcome && ST.aquaWelcome()) {
      PS.ui.modal({ eyebrow: 'Welcome!', title: 'Your very own aquarium', sprite: PX.aquaSprite('fish', 'clownfish', 0),
        html: `<p>Here are two Clownfish and an Anemone to start (Clownfish love to hide in it). Win races, battles and Survival, buy fish and decorations in the Shop, or find them in gumballs. Drag fish and decorations to move them, and tap <b>Decorate</b> to make the tank yours!</p>`,
        buttons: [{ label: 'Hooray!', kind: 'primary' }] });
    }
    // time has passed since the last visit: some algae has grown (and the crew ate some); everyone gets a free snail once
    try { if (ST.aquaDirtTick) ST.aquaDirtTick(Date.now()); dirtTickAt = t; } catch (e) { console.error(e); }
    try { if (ST.aquaCrewGift && aq().welcomed) ST.aquaCrewGift(); } catch (e) { console.error(e); }
    // once: what's new to try (players who just got the welcome card skip it)
    const A = aq();
    if ((A.news || 0) < 2) {
      const fresh = A.fish.length <= 3; A.news = 2; PS.save();
      if (!fresh) PS.ui.modal({ eyebrow: 'My Aquarium', title: 'New things to try!', sprite: PX.aquaSprite('fish', 'puffer', 0),
        html: `<ul class="aq-news"><li><b>Feed</b>: tap the water to sprinkle food.</li><li><b>Clean</b>: rub the glass and the sand. Snails, crabs and shrimp help!</li><li><b>Hold your finger</b> in the water and the fish swim over.</li><li><b>Double-tap</b> a fish for a trick.</li><li><b>Pop</b> the bubbles.</li><li>The <b>treasure chest</b> and the <b>giant clam</b> hide coins every day.</li><li>Turn the <b>lights</b> off (☾) to see things glow.</li><li>Watch out for a sneaky <b>Snorkel Zombie</b>... tap it!</li><li>The <b>hearts</b> show how happy your tank is. Tap them for a tip.</li><li>Tap ⓘ in <b>My Fish</b> to rename a fish.</li></ul>`,
        buttons: [{ label: 'Let\'s go!', kind: 'primary' }] });
    }
    if (!nextVisitorAt || nextVisitorAt < t) nextVisitorAt = t + rand(25, 60);
    syncFish(); refreshCount();
  }
  function saveDirt() { if (dirtDirty) { dirtDirty = false; dirtSavedAt = t; PS.save(); } }
  function hide() { visible = false; dropPress(); setMode('play'); flakes = []; visitor = null; floaters = []; saveDirt(); }
  function frame(dt) {
    if (!visible || !root) return;
    checkSize(); if (!ww) return;
    t += dt;
    syncFish();
    for (const a of actors) {
      updateFish(a, dt);
      // walkers on the sand go in front of or behind the decorations by how far forward they are
      if (CRAWL[a.swim] || a.swim === 'glass') a.z = depthOfY(a.y + a.h / 2);
    }
    updateFlakes(dt); updateBubbles(dt); updateParts(dt); updateVisitor(dt);
    for (const f of floaters) { f.y -= 7 * dt; f.life -= dt; } floaters = floaters.filter(f => f.life > 0);
    // lights off: now and then a resting fish snores
    if (night() && t - zzzT > 3.5) { zzzT = t; const r = actors.filter(x => FOLLOW(x) && x.wait > 0); if (r.length) { const a = pick(r); a.say = 'z z'; a.sayT = 1.4; } }
    if (t - dirtTickAt > T.dirtTickSec) { dirtTickAt = t; try { if (ST.aquaDirtTick && ST.aquaDirtTick(Date.now())) refreshCount(); } catch (e) { console.error(e); } }
    if (dirtDirty && t - dirtSavedAt > 4) { saveDirt(); refreshCount(); }
    render();
  }
  // the save changed (a fish moved, a decoration placed, a prize): redraw what depends on it
  if (PS.on) {
    PS.on('aqua:change', () => { fishKey = ''; bgKey = ''; refreshCount(); });
    PS.on('aqua:new', p => { fishKey = ''; refreshCount(); announce(p); });
    PS.on('reset', () => { actors = []; fishKey = ''; bgKey = ''; dirtDirty = false; });
  }

  const CSS = `
.aq{position:absolute;inset:0;overflow:hidden;background:#2a7cc0}
.aq-cv{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;image-rendering:pixelated;image-rendering:crisp-edges}
.aq-top{position:absolute;left:10px;right:10px;top:12px;display:flex;justify-content:center;pointer-events:none}
.aq-name{display:flex;flex-direction:column;align-items:center;gap:1px;background:rgba(255,253,244,.88);border:2px solid var(--line);border-radius:14px;padding:4px 14px 5px;box-shadow:0 2px 0 rgba(42,53,80,.25)}
.aq-name b{font-size:20px;line-height:1.1}
.aq-hearts{pointer-events:auto;border:0;background:none;padding:0 4px;font:800 15px/1 var(--f-ui);color:#ff6f9c;letter-spacing:1px;text-shadow:0 1px 0 #fff}
.aq-light{position:absolute;top:12px;right:12px;width:40px;height:40px;border-radius:50%;border:2px solid var(--line);border-bottom-width:4px;background:rgba(255,253,244,.92);font:800 20px/1 var(--f-ui);color:#4a5a8a;display:grid;place-items:center;padding:0}
.aq-news{margin:0;padding-left:18px;display:grid;gap:4px;font-size:14px}
.aq-namein{width:100%;font:700 20px var(--f-ui);padding:10px 12px;border:2px solid var(--line);border-radius:12px;background:#fff;color:var(--ink);text-align:center}
.aq-name small{font:700 12px var(--f-ui);color:var(--ink-soft)}
.aq-bar{position:absolute;left:0;right:0;bottom:10px;display:flex;justify-content:center;align-items:center;gap:8px;flex-wrap:wrap;padding:0 10px}
.aq-bar[hidden]{display:none}
.aq-bar{gap:6px}
.aq-bar .btn{padding:9px 11px;font-size:15.5px;min-height:46px;position:relative}
.aq-bar .btn.dirty::after{content:'';position:absolute;top:-4px;right:-4px;width:12px;height:12px;border-radius:50%;background:#7cc25c;border:2px solid #fff3c8}
.aq.deco .aq-name small{color:#2f6aa8}
.aq-pnote{margin:0 0 6px}
.aq-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;align-content:start}
.aq-opt{display:grid;grid-template-columns:44px 1fr;align-items:center;gap:6px;text-align:left;background:var(--panel);border:2px solid var(--line);border-bottom-width:4px;border-radius:12px;padding:5px 7px;min-width:0}
.aq-opt.on{border-color:var(--sun-edge);background:#fff6d2}
.aq-opt[disabled]{opacity:.5}
.aq-opt canvas{width:44px;height:40px;object-fit:contain}
.aq-opt b{display:block;font:700 14px var(--f-ui);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.aq-opt small{display:block;font-size:12px;color:var(--ink-soft)}
.aq-x{display:grid;place-items:center;width:44px;height:40px;font:800 26px var(--f-ui);color:#c05050}
.aq-intro{margin:0 0 6px}
.aq-cols{display:flex;gap:8px;margin-top:4px}
.aq-col{flex:1 1 0;min-width:0;background:var(--field);border:2px solid var(--line);border-radius:14px;padding:6px 5px 5px;display:flex;flex-direction:column}
.aq-col.room{background:#e4eef8}
.aq-col .sbox-frame{flex:0 1 auto;min-height:0;margin:0 -4px 0 0;--sb-gut:18px}
.aq-hh{font-family:var(--f-px);font-weight:400;font-size:15px;line-height:1.1;margin:0 2px 5px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:0 4px}
.aq-hh small{font:700 11.5px var(--f-ui);color:var(--ink-soft);white-space:nowrap}
.aq-list{display:grid;gap:5px;align-content:start}
.aq-row{display:grid;grid-template-columns:1fr 26px;gap:3px;align-items:stretch}
.aq-item{display:grid;grid-template-columns:30px 1fr 10px;align-items:center;gap:4px;text-align:left;background:var(--panel);border:2px solid var(--line);border-bottom-width:3px;border-radius:11px;padding:3px 4px;min-width:0}
.aq-item canvas{width:30px;height:24px;object-fit:contain}
.aq-item span{min-width:0}
.aq-item b{display:block;font:700 13.5px var(--f-ui);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.aq-item small{display:block;font-size:11.5px;color:var(--ink-soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.aq-item i{font-style:normal;font-weight:700;color:var(--ink-soft);font-size:13px}
.aq-info{border:2px solid var(--line);border-bottom-width:3px;border-radius:11px;background:var(--panel);font:800 14px var(--f-ui);color:var(--ink-soft);padding:0}
.aq-none{font-size:12.5px;color:var(--ink-soft);margin:4px 2px}
.aq-src{font-size:13px;color:var(--ink-soft)}
.aq-gh{font-family:var(--f-px);font-weight:400;font-size:16px;margin:8px 2px 4px}
.aq-gh.r-rare{color:#2f78c0}.aq-gh.r-epic{color:#8a52c8}.aq-gh.r-legendary{color:#c08a10}
.aq-ggrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:6px}
.aq-gitem{display:flex;flex-direction:column;align-items:center;gap:2px;text-align:center;background:var(--panel);border:2px solid var(--line);border-radius:12px;padding:6px 4px}
.aq-gitem canvas{width:56px;height:42px;object-fit:contain}
.aq-gitem b{font:700 12.5px var(--f-ui);line-height:1.15}
.aq-gitem small{font-size:11px;color:var(--ink-soft);line-height:1.2}
.aq-gitem.no canvas{filter:brightness(0) opacity(.28)}
@media (max-width:560px){.aq-bar .btn{padding:8px 10px;font-size:14.5px;min-height:42px}.aq-name b{font-size:17px}}
`;
  function injectCSS() { if (document.getElementById('aq-style')) return; const st = document.createElement('style'); st.id = 'aq-style'; st.textContent = CSS; document.head.appendChild(st); }

  PS.scenes.aquarium = { mount, show, hide, frame };
  window.__aquarium = { get actors() { return actors; }, sprinkle, rub, dirt, setMode, spawnVisitor, trick, get visitor() { return visitor; }, renameFish, fishCard, myFish, fishGuide, pickAdd, pickItem, pickLook, itemXY, get L() { return L; }, get Z() { return Z; }, get press() { return press; } };
})();
