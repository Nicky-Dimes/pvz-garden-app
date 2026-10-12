// aquarium.js — PVZ Garden: My Aquarium, the sixth tab. A saltwater tank the child decorates and fills with fish won in races,
// battles and Survival, bought in the Shop (its Aquarium tab) or found in gumballs.
// Scene: PS.scenes.aquarium = { mount, show, hide, frame }. Data: D.AQUA (data.js). Save + rules: state.js aqua* (PS.S.aqua).
// Art: art-aqua.js (PX.aquaSprite / aquaBackdrop / aquaSandOf) filled in by art-fish.js, art-fish2.js, art-aquadecor.js and
// art-aquaworld.js. Drawn like the other scenes: a world in art pixels on a SCENE_K buffer, scaled up to the screen.
// Fish swim on their own (each kind has a swim style in D.AQUA.FISH[kind].swim); tap a fish to say hello (the puffer puffs up),
// tap the chest or clam to open it, Feed drops flakes they chase. Decorate puts decorations on the sand spots and picks the
// backdrop and sand. Styles are injected below (prefix .aq-).
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
  const T = { worldW: 150, zMin: 2, zMax: 7, lid: 5, sandK: 0.18, flakeFall: 5.5, flakeLife: 7, bubbleEvery: 1.4, maxBubbles: 40, maxParts: 50, labelSec: 2.4, puffSec: 2.6, openSec: 2.8 };
  // back-row and front-row sand spots (share of the tank width); front spots leave the middle open for swimming
  const SPOTS = [{ x: 0.14, row: 0 }, { x: 0.38, row: 0 }, { x: 0.62, row: 0 }, { x: 0.86, row: 0 }, { x: 0.07, row: 1 }, { x: 0.29, row: 1 }, { x: 0.71, row: 1 }, { x: 0.93, row: 1 }];

  let root = null, cv = null, ctx = null, buf = null, bx = null, bgC = null, bgx = null, barPlay = null, barDeco = null, countEl = null;
  let W = 0, H = 0, DPR = 1, Z = 3, ww = 0, wh = 0, sizeKey = '', bgKey = '', t = 0, visible = false, mode = 'play';
  const L = { sandTop: 0, floorBack: 0, floorFront: 0, top: 0, barTop: 0, playTop: 0 };
  let actors = [], flakes = [], bubbles = [], parts = [], fishKey = '', bubbleT = 0, decorFx = {};

  // ================================================================
  // Save helpers (state.js keeps the rules; this is the view)
  // ================================================================
  const aq = () => (ST.aqua ? ST.aqua() : { fish: [], decor: {}, slots: [], backdrop: 'reef', sand: 'white', own: { backdrop: { reef: 1 }, sand: { white: 1 } }, seen: {} });
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
    L.sandTop = Math.round(clamp(Math.min(wh - sandH, barTop - 16), wh * 0.45, wh - 18));
    L.floorBack = L.sandTop + 4; L.floorFront = Math.round(Math.min(L.sandTop + 13, barTop - 1, wh - 2));
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
  // where a spot's decoration stands (bottom-centre), kept inside the glass
  function spotXY(i, w) {
    const S = SPOTS[i], x = clamp(Math.round(S.x * ww), Math.ceil((w || 0) / 2) + 3, ww - Math.ceil((w || 0) / 2) - 3);
    return { x, y: S.row ? L.floorFront : L.floorBack };
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
    return { x0: a.w / 2 + 3, x1: ww - a.w / 2 - 3, y0: top, y1: Math.max(top + 4, bot - 2) };
  }
  function placeInBand(a, keepX) {
    const b = bandOf(a);
    if (!keepX) a.x = rand(b.x0, b.x1); else a.x = clamp(a.x, b.x0, b.x1);
    a.y = CRAWL[a.swim] ? rand(b.y0, b.y1) : keepX ? clamp(a.y, b.y0, b.y1) : rand(b.y0, b.y1);
    a.tx = a.x; a.ty = a.y;
  }
  function makeActor(f) {
    const I = fishInfo(f.kind);
    const a = { id: f.id, kind: f.kind, name: f.name, swim: I.swim || 'swim', x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, face: Math.random() < 0.5 ? 1 : -1, wait: rand(0, 1.5),
      ph: rand(0, 10), z: Math.random(), puffT: 0, happyT: 0, labelT: 0, pulse: rand(0, 2) };
    Object.assign(a, sizeOf(a));
    a.sp = I.spd || (CRAWL[a.swim] ? 4 : a.swim === 'glass' ? 2 : a.swim === 'hover' ? 4.5 : a.swim === 'jelly' ? 4 : a.w <= 20 ? 15 : a.w <= 28 ? 11 : 8);
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
    const S = aq().slots || [];
    for (let i = 0; i < S.length; i++) if (S[i] && decorInfo(S[i]).hide) { const c = PX.aquaSprite('decor', S[i], 0), p = spotXY(i, PX.artW(c)); return { x: p.x, y: p.y - PX.artH(c) * 0.55, w: PX.artW(c) }; }
    return null;
  }
  function newTarget(a) {
    const b = bandOf(a);
    if (a.swim === 'hide' && Math.random() < 0.6) { const s = anemoneSpot(); if (s) { a.tx = clamp(s.x + rand(-s.w / 3, s.w / 3), b.x0, b.x1); a.ty = clamp(s.y + rand(-3, 3), b.y0, b.y1); return; } }
    if (a.swim === 'school') { const lead = actors.find(o => o !== a && o.kind === a.kind && o.lead); if (lead) { a.tx = clamp(lead.x - lead.face * rand(6, 14), b.x0, b.x1); a.ty = clamp(lead.y + rand(-6, 6), b.y0, b.y1); return; } a.lead = true; }
    // long swims across the tank, with the odd short hop
    const far = Math.random() < 0.7;
    a.tx = far ? (a.x < ww / 2 ? rand(ww * 0.55, b.x1) : rand(b.x0, ww * 0.45)) : clamp(a.x + rand(-30, 30), b.x0, b.x1);
    a.ty = CRAWL[a.swim] ? a.y : rand(b.y0, b.y1);
    a.tx = clamp(a.tx, b.x0, b.x1);
  }
  function nearestFlake(a) {
    let best = null, bd = 1e9;
    for (const f of flakes) {
      if (f.eaten) continue;
      if (CRAWL[a.swim] || a.swim === 'glass') { if (!f.down) continue; } else if (f.down) continue;
      const d = Math.abs(f.x - a.x) + Math.abs(f.y - a.y); if (d < bd) { bd = d; best = f; }
    }
    return bd < 160 ? best : null;
  }
  function updateFish(a, dt) {
    a.puffT = Math.max(0, a.puffT - dt); a.happyT = Math.max(0, a.happyT - dt); a.labelT = Math.max(0, a.labelT - dt);
    const b = bandOf(a), food = nearestFlake(a);
    let sp = a.sp;
    if (a.puffT > 0) sp *= 0.25;
    if (a.swim === 'jelly') {
      // a jelly squeezes upward, then drifts down; it wanders slowly side to side
      a.pulse -= dt; if (a.pulse <= 0) { a.pulse = rand(1.4, 2.2); a.vy = -rand(7, 11); }
      a.vy = Math.min(3, a.vy + 6 * dt); a.y = clamp(a.y + a.vy * dt, b.y0, b.y1);
      if (Math.abs(a.tx - a.x) < 3 || a.wait <= 0) { a.tx = rand(b.x0, b.x1); a.wait = rand(4, 9); } a.wait -= dt;
      a.x = clamp(a.x + Math.sign(a.tx - a.x) * 2.2 * dt, b.x0, b.x1); a.face = 1;
      return;
    }
    if (food) { a.tx = food.x; a.ty = CRAWL[a.swim] ? a.y : food.y; sp *= 1.6; a.wait = 0; if (near(a, food.x, food.y, Math.max(3, a.w * 0.35))) { food.eaten = true; a.happyT = 0.6; heart(a.x, a.y - a.h / 2); } }
    else if (a.wait > 0) { a.wait -= dt; a.vx *= 0.94; a.vy *= 0.94; a.x += a.vx * dt; a.y += a.vy * dt; return; }
    else if (Math.abs(a.tx - a.x) < 3 && Math.abs(a.ty - a.y) < 3) { newTarget(a); if (Math.random() < (CRAWL[a.swim] || a.swim === 'glass' ? 0.6 : 0.3)) a.wait = rand(0.6, 2.6); }
    const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 10);
    const wantX = dx / d * sp * k, wantY = dy / d * sp * k * (a.swim === 'hover' ? 0.8 : 0.6);
    const turn = Math.min(1, dt * (a.swim === 'hover' ? 1.2 : 2.2));
    a.vx += (wantX - a.vx) * turn; a.vy += (wantY - a.vy) * turn;
    a.x = clamp(a.x + a.vx * dt, b.x0, b.x1); a.y = clamp(a.y + a.vy * dt, b.y0, b.y1);
    if (a.swim !== 'glass') { if (a.vx > 1.2) a.face = 1; else if (a.vx < -1.2) a.face = -1; }
  }
  function drawFish(a) {
    const moving = Math.abs(a.vx) + Math.abs(a.vy) > 1.5;
    const rate = a.swim === 'jelly' ? 0 : CRAWL[a.swim] ? (moving ? 3 : 0.5) : a.swim === 'glass' ? 0.8 : moving ? 4 : 1.6;
    const f = a.swim === 'jelly' ? (a.vy < -2 ? 1 : 0) : Math.floor(t * rate + a.ph) % 2;
    const c = spriteOf(a, f), w = PX.artW(c), h = PX.artH(c);
    const bob = CRAWL[a.swim] || a.swim === 'glass' ? 0 : Math.round(Math.sin(t * 1.6 + a.ph) * (a.swim === 'hover' ? 1.6 : 0.8));
    const hop = a.happyT > 0 ? -Math.round(Math.sin((0.6 - a.happyT) / 0.6 * Math.PI) * 2) : 0;
    PX.blit(bx, c, a.x, a.y + bob + hop, a.face < 0, Math.floor(w / 2), Math.floor(h / 2));
  }

  // ================================================================
  // Flakes, bubbles, sparkles
  // ================================================================
  const FLAKE_COLS = ['#f08a4b', '#f6c453', '#8fd06a', '#e86a6a', '#c98a52'];
  function feed() {
    if (flakes.length > 6) { PS.ui.toast('Let them finish their snack first!', 1600); return; }
    if (!actors.length) { PS.ui.toast('No fish in the tank yet. Win some, buy some in the Shop, or try a gumball!', 2600); return; }
    const n = AQ().TANK.flakes || 14, x0 = rand(ww * 0.2, ww * 0.8);
    for (let i = 0; i < n; i++) flakes.push({ x: clamp(x0 + rand(-ww * 0.18, ww * 0.18), 6, ww - 6), y: L.top + rand(-2, 4), vy: rand(0.7, 1.2) * T.flakeFall, ph: rand(0, 6), col: pick(FLAKE_COLS), life: T.flakeLife, down: false, eaten: false });
    snd('pop');
    try { ST.aquaFed && ST.aquaFed(); } catch (e) { /* optional */ }
  }
  function updateFlakes(dt) {
    for (const f of flakes) {
      if (!f.down) { f.y += f.vy * dt; f.x += Math.sin(t * 2 + f.ph) * 3 * dt; if (f.y >= sandY(Math.round(f.x)) + 2) { f.y = sandY(Math.round(f.x)) + 2; f.down = true; } }
      else f.life -= dt;
    }
    flakes = flakes.filter(f => !f.eaten && f.life > 0);
  }
  function bubble(x, y, big) { if (bubbles.length < T.maxBubbles) bubbles.push({ x, y, r: big ? rand(1.2, 2) : rand(0.6, 1.1), vy: rand(10, 18), ph: rand(0, 6) }); }
  function updateBubbles(dt) {
    bubbleT -= dt;
    if (bubbleT <= 0) { bubbleT = rand(0.6, 1.2) * T.bubbleEvery; bubble(rand(8, ww - 8), L.sandTop + 2, Math.random() < 0.3); }
    // bubblers (the volcano, the diver's helmet) puff while they're on their bubbling frame
    const S = aq().slots || [];
    for (let i = 0; i < S.length; i++) {
      const id = S[i]; if (!id || decorInfo(id).anim !== 'bubbles') continue;
      if (decorFrame(i, id) === 1 && Math.random() < dt * 9) { const c = PX.aquaSprite('decor', id, 0), p = spotXY(i, PX.artW(c)); bubble(p.x + rand(-2, 2), p.y - PX.artH(c) + 2, Math.random() < 0.4); }
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
  // Decorations
  // ================================================================
  // which frame a spot's decoration shows: swaying ones rock gently; the chest and clam open when tapped (and now and then)
  function decorFrame(i, id) {
    const I = decorInfo(id), fx = decorFx[i];
    if (I.anim === 'sway') return Math.floor(t * 0.9 + i * 0.37) % 2;
    if (I.anim === 'open') return fx && fx.until > t ? 1 : (Math.floor(t / 9 + i * 0.29) % 4 === 0 && (t % 9) < 1.6 ? 1 : 0);
    if (I.anim === 'bubbles') return Math.floor(t / 2.5 + i * 0.41) % 2;
    return 0;
  }
  function drawDecor(row) {
    const S = aq().slots || [];
    for (let i = 0; i < SPOTS.length; i++) {
      if (SPOTS[i].row !== row || !S[i]) continue;
      const c = PX.aquaSprite('decor', S[i], decorFrame(i, S[i])), p = spotXY(i, PX.artW(c));
      // a soft shadow on the sand
      bx.fillStyle = 'rgba(34,32,52,.14)'; const sw = Math.round(PX.artW(c) * 0.7); bx.fillRect(Math.round(p.x - sw / 2), p.y - 1, sw, 2);
      PX.blit(bx, c, p.x, p.y);
    }
  }
  function drawSpotMarks() {
    const S = aq().slots || [];
    for (let i = 0; i < SPOTS.length; i++) {
      const id = S[i], c = id ? PX.aquaSprite('decor', id, 0) : null, w = c ? PX.artW(c) : 12, h = c ? PX.artH(c) : 10, p = spotXY(i, w);
      const pulse = 0.7 + Math.sin(t * 4 + i) * 0.25;
      bx.globalAlpha = pulse; bx.fillStyle = '#ffffff';
      if (!id) {
        // an empty spot: a soft glowing bubble on the sand with a bold plus
        const cx = p.x, cy = p.y - 6;
        bx.globalAlpha = 0.35 * pulse; bx.beginPath(); bx.ellipse(cx, cy, 8, 6, 0, 0, Math.PI * 2); bx.fill();
        bx.globalAlpha = pulse;
        for (let a = 0; a < 6.283; a += 0.3) bx.fillRect(Math.round(cx + Math.cos(a) * 8), Math.round(cy + Math.sin(a) * 6), 1, 1);
        bx.fillStyle = '#2a3550'; bx.fillRect(cx - 3.5, cy - 1.5, 8, 3); bx.fillRect(cx - 1.5, cy - 3.5, 3, 8);
        bx.fillStyle = '#ffffff'; bx.fillRect(cx - 3, cy - 1, 7, 2); bx.fillRect(cx - 1, cy - 3, 2, 7);
      } else {
        const x0 = Math.round(p.x - w / 2) - 1, y0 = p.y - h - 1, x1 = x0 + w + 2, y1 = p.y + 1;
        for (let x = x0; x <= x1; x += 2) { bx.fillRect(x, y0, 1, 1); bx.fillRect(x, y1, 1, 1); }
        for (let y = y0; y <= y1; y += 2) { bx.fillRect(x0, y, 1, 1); bx.fillRect(x1, y, 1, 1); }
      }
      bx.globalAlpha = 1;
    }
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
    bx.fillStyle = '#fff4c8'; bx.fillRect(Math.round(ww * 0.2), T.lid - 1, Math.round(ww * 0.6), 1);
    bx.globalAlpha = 0.18; bx.fillStyle = '#fffbe6'; bx.fillRect(0, T.lid, ww, 2); bx.globalAlpha = 1;
    bx.fillStyle = 'rgba(255,255,255,.22)'; bx.fillRect(0, T.lid, 1, wh); bx.fillRect(ww - 1, T.lid, 1, wh);
    bx.fillStyle = 'rgba(255,255,255,.05)';
    bx.beginPath(); bx.moveTo(ww * 0.62, T.lid); bx.lineTo(ww * 0.68, T.lid); bx.lineTo(ww * 0.5, wh); bx.lineTo(ww * 0.44, wh); bx.closePath(); bx.fill();
    bx.beginPath(); bx.moveTo(ww * 0.71, T.lid); bx.lineTo(ww * 0.73, T.lid); bx.lineTo(ww * 0.55, wh); bx.lineTo(ww * 0.53, wh); bx.closePath(); bx.fill();
  }
  function render() {
    paintBg();
    bx.setTransform(K, 0, 0, K, 0, 0); bx.imageSmoothingEnabled = false;
    bx.drawImage(bgC, 0, 0, ww, wh);
    drawRays();
    drawDecor(0);
    for (const a of actors) drawFish(a);
    drawDecor(1);
    drawFlakesBubbles();
    drawParts();
    if (mode === 'deco') drawSpotMarks();
    drawGlass();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, 0, 0, ww * Z * DPR, wh * Z * DPR);
    // names over fish that were just tapped, crisp at screen resolution
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.font = '800 14px "Nunito", sans-serif';
    for (const a of actors) {
      if (a.labelT <= 0) continue;
      const x = a.x * Z, y = (a.y - a.h / 2 - 3) * Z, s = a.name ? `${a.name} the ${fishInfo(a.kind).name}` : fishInfo(a.kind).name;
      ctx.globalAlpha = Math.min(1, a.labelT * 2); ctx.lineWidth = 4; ctx.strokeStyle = '#2a3550'; ctx.strokeText(s, x, y); ctx.fillStyle = '#ffffff'; ctx.fillText(s, x, y);
    }
    ctx.globalAlpha = 1;
  }

  // ================================================================
  // Taps
  // ================================================================
  function onTap(e) {
    if (!ww) return;
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / Z, y = (e.clientY - r.top) / Z;
    if (mode === 'deco') {
      const S = aq().slots || [];
      let best = -1, bd = 1e9;
      for (let i = 0; i < SPOTS.length; i++) {
        const id = S[i], c = id ? PX.aquaSprite('decor', id, 0) : null, w = c ? PX.artW(c) : 16, h = c ? PX.artH(c) : 12, p = spotXY(i, w);
        if (x >= p.x - w / 2 - 3 && x <= p.x + w / 2 + 3 && y >= p.y - h - 3 && y <= p.y + 4) { const d = Math.abs(x - p.x) + Math.abs(y - (p.y - h / 2)); if (d < bd) { bd = d; best = i; } }
      }
      if (best >= 0) { snd('tick'); pickDecor(best); }
      return;
    }
    // the fish nearest the front under the finger
    for (let i = actors.length - 1; i >= 0; i--) {
      const a = actors[i];
      if (Math.abs(x - a.x) <= a.w / 2 + 2 && Math.abs(y - a.y) <= a.h / 2 + 2) { hello(a); return; }
    }
    const S = aq().slots || [];
    for (let i = 0; i < SPOTS.length; i++) {
      const id = S[i]; if (!id) continue;
      const c = PX.aquaSprite('decor', id, 0), w = PX.artW(c), h = PX.artH(c), p = spotXY(i, w);
      if (x >= p.x - w / 2 && x <= p.x + w / 2 && y >= p.y - h && y <= p.y) {
        const I = decorInfo(id);
        if (I.anim === 'open') { decorFx[i] = { until: t + T.openSec }; sparkle(p.x, p.y - h * 0.6); snd('pop'); }
        else if (I.anim === 'bubbles') { for (let k = 0; k < 6; k++) bubble(p.x + rand(-2, 2), p.y - h + 2 - k * 2, true); snd('tick'); }
        else { for (let k = 0; k < 3; k++) bubble(p.x + rand(-w / 3, w / 3), p.y - h * 0.6, false); }
        return;
      }
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
  function refreshCount() {
    if (!countEl) return;
    if (mode === 'deco') { countEl.textContent = 'Tap a glowing spot on the sand to decorate it'; return; }
    const A = aq(), n = A.fish.filter(f => f.tank).length;
    countEl.textContent = `${n} of ${AQ().TANK.maxFish} fish swimming${A.fish.length > n ? ` · ${A.fish.length - n} in the Fish Room` : ''}`;
  }
  function setMode(m) {
    mode = m; barPlay.hidden = m !== 'play'; barDeco.hidden = m !== 'deco'; sizeKey = '';
    root.querySelector('.aq').classList.toggle('deco', m === 'deco');
    refreshCount();
  }
  // the decoration picker for one sand spot
  function pickDecor(i) {
    const A = aq(), cur = (A.slots || [])[i], owned = Object.keys(A.decor || {}).filter(id => (A.decor[id] || 0) > 0 && AQ().DECOR[id]);
    PS.ui.modal({
      eyebrow: 'Decorate', title: SPOTS[i].row ? 'A spot at the front' : 'A spot at the back',
      html: `<p>${owned.length ? 'Pick a decoration for this spot.' : 'You have no decorations yet. Buy them in the Shop, or win them in races, battles and gumballs.'}</p><div class="sbox-frame"><div class="sbox aq-grid"></div></div>`,
      buttons: [{ label: 'Get more in the Shop', onClick: () => { setMode('play'); PS.ui.go('shop', { tab: 'aquarium' }); } }, { label: 'Done', kind: 'primary' }],
      mount(card, close) {
        const box = card.querySelector('.aq-grid');
        if (cur) {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'aq-opt aq-empty';
          b.innerHTML = '<span class="aq-x">×</span><span><b>Empty this spot</b><small>Takes the decoration away (you keep it)</small></span>';
          b.onclick = () => { ST.aquaPlace(i, null); snd('pop'); close(); };
          box.appendChild(b);
        }
        for (const id of owned) {
          const I = decorInfo(id), free = ST.aquaFree(id) + (id === cur ? 1 : 0);
          const b = document.createElement('button'); b.type = 'button'; b.className = 'aq-opt' + (id === cur ? ' on' : '');
          b.innerHTML = `${spriteHtml}<span><b>${esc(I.name)}</b><small>${id === cur ? 'Here now' : free > 0 ? `${free} to place` : 'All placed'}</small></span>`;
          drawInto(b.querySelector('canvas'), PX.aquaSprite('decor', id, 0));
          if (free <= 0 && id !== cur) b.disabled = true;
          b.onclick = () => { if (id !== cur) ST.aquaPlace(i, id); snd('pop'); close(); };
          box.appendChild(b);
        }
      },
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
      buttons: [{ label: 'Let it go', kind: 'danger', onClick: () => { setTimeout(() => letGo(f), 0); } }, { label: 'Back to My fish', onClick: () => { setTimeout(myFish, 0); } }, { label: 'OK', kind: 'primary' }],
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
      <div class="aq-top"><div class="aq-name"><b class="px-title">My Aquarium</b><small class="aq-count"></small></div></div>
      <div class="aq-bar" data-bar="play">
        <button type="button" class="btn primary" data-aq="feed">Feed</button>
        <button type="button" class="btn" data-aq="fish">My Fish</button>
        <button type="button" class="btn" data-aq="deco">Decorate</button>
        <button type="button" class="btn go" data-aq="shop">Shop</button>
      </div>
      <div class="aq-bar" data-bar="deco" hidden>
        <button type="button" class="btn" data-aq="backdrop">Backdrop</button>
        <button type="button" class="btn" data-aq="sand">Sand</button>
        <button type="button" class="btn primary" data-aq="done">Done</button>
      </div>
    </div>`;
    cv = root.querySelector('.aq-cv'); ctx = cv.getContext('2d');
    buf = document.createElement('canvas'); bx = buf.getContext('2d');
    bgC = document.createElement('canvas'); bgx = bgC.getContext('2d');
    barPlay = root.querySelector('[data-bar="play"]'); barDeco = root.querySelector('[data-bar="deco"]'); countEl = root.querySelector('.aq-count');
    cv.addEventListener('pointerdown', e => { PX.Sound.unlock && PX.Sound.unlock(); onTap(e); });
    root.querySelector('.aq').addEventListener('click', e => {
      const b = e.target.closest('[data-aq]'); if (!b) return;
      const k = b.dataset.aq; snd('tick');
      if (k === 'feed') feed();
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
        html: `<p>Here are two Clownfish and an Anemone to start (Clownfish love to hide in it). Win races, battles and Survival, buy fish and decorations in the Shop, or find them in gumballs. Tap <b>Decorate</b> to make the tank yours!</p>`,
        buttons: [{ label: 'Hooray!', kind: 'primary' }] });
    }
    syncFish(); refreshCount();
  }
  function hide() { visible = false; setMode('play'); flakes = []; }
  function frame(dt) {
    if (!visible || !root) return;
    checkSize(); if (!ww) return;
    t += dt;
    syncFish();
    for (const a of actors) updateFish(a, dt);
    updateFlakes(dt); updateBubbles(dt); updateParts(dt);
    render();
  }
  // the save changed (a fish moved, a decoration placed, a prize): redraw what depends on it
  if (PS.on) {
    PS.on('aqua:change', () => { fishKey = ''; bgKey = ''; refreshCount(); });
    PS.on('aqua:new', p => { fishKey = ''; refreshCount(); announce(p); });
    PS.on('reset', () => { actors = []; fishKey = ''; bgKey = ''; });
  }

  const CSS = `
.aq{position:absolute;inset:0;overflow:hidden;background:#2a7cc0}
.aq-cv{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;image-rendering:pixelated;image-rendering:crisp-edges}
.aq-top{position:absolute;left:10px;right:10px;top:12px;display:flex;justify-content:center;pointer-events:none}
.aq-name{display:flex;flex-direction:column;align-items:center;gap:1px;background:rgba(255,253,244,.88);border:2px solid var(--line);border-radius:14px;padding:4px 14px 5px;box-shadow:0 2px 0 rgba(42,53,80,.25)}
.aq-name b{font-size:20px;line-height:1.1}
.aq-name small{font:700 12px var(--f-ui);color:var(--ink-soft)}
.aq-bar{position:absolute;left:0;right:0;bottom:10px;display:flex;justify-content:center;align-items:center;gap:8px;flex-wrap:wrap;padding:0 10px}
.aq-bar[hidden]{display:none}
.aq-bar .btn{padding:9px 14px;font-size:16px;min-height:46px}
.aq.deco .aq-name small{color:#2f6aa8}
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
  window.__aquarium = { get actors() { return actors; }, feed, setMode, myFish, fishGuide, pickDecor, pickLook, get L() { return L; } };
})();
