// survival.js — PVZ Garden: Survival. Defend a small lawn from waves of zombies with the plants you've raised, like the
// original game. Drag plants from the tray onto fixed spots (up to the map's limit), press and hold one to move it or put it
// back on the tray, drag fruit onto a plant to heal it, tap a plant and then a zombie to choose its target. Plants never walk:
// shooters fire down their row, lobbers also reach the rows next to theirs, zappers and mushrooms hit what's near, brawlers
// bite the zombie in front of them, helpers heal, boomers blast what comes close. Each row has one lawn mower; a zombie that
// reaches the house in a row with no mower left wins the match. Every map can be won (it isn't endless); the first win of a
// map gives its legendary plant. Damage comes from the battle engine (window.__battle.engine) with the garden's zombie-attack
// feel (garden.js "zombie attacks"): same formula, projectiles, recoil, lunges, hit flashes, dizzy stars and tip-over deaths.
// Owns PS.scenes.survival. CSS is injected from here (classes prefixed .sv-). Saves PS.S.progress.survival[mapId] = { wins, best }.
// Balance check from the console: __survival.sim('lawn', 20) plays 20 matches headless with the auto-planted team.
(function () {
  'use strict';
  const D = PS.D, ST = PS.state;
  const { clamp, rand, pick } = PS.util;
  const lerp = (a, b, k) => a + (b - a) * k;
  const INK = PX.INK, K = PX.SCENE_K;
  const esc = v => ST.esc(v);
  const engine = () => window.__battle && window.__battle.engine;
  const lastSnd = {};
  // (many plants fire at once: the same sound at most every 60 ms)
  const snd = n => { if (M && M.sim) return; const now = performance.now(); if (now - (lastSnd[n] || 0) < 60) return; lastSnd[n] = now; try { PX.Sound.play(n); } catch (e) { /* audio optional */ } };
  const buzz = ms => { if (M && M.sim) return; try { PX.buzz(ms); } catch (e) { /* optional */ } };
  const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // ---------------- tuning ----------------
  // Medium difficulty for any save: zombie levels follow your own team (average total level of your strongest `cap` plants
  // x the map's k), and each wave sends as many zombies as that team could beat in a set time (teamRate below), so a big
  // strong team meets a big horde and three little plants meet a handful (in fewer rows). Checked with __survival.sim.
  const SV = {
    rows: 5,
    setup: 15,                 // "Get ready!" countdown (starts when the first plant goes down)
    firstWave: 2.5, waveBreak: 3.5, bigBreak: 5,
    // each wave holds as many zombies as your team could beat in this many seconds of fighting (first .. last normal wave)
    waveSec: [19, 32],
    bigMult: 1.6,              // the last wave is a huge flag wave
    // how much each kind of plant counts toward that (shooters hit zombies all the way down the row; brawlers only up close)
    roleW: { shooter: 1.25, lobber: 1.25, zap: 1, spore: 0.9, melee: 0.5, bomb: 0.6, wall: 0.3, support: 0.25 },
    kFlat: 0.7,                // and x (0.7 / map k)^kFlat: maps with tougher zombies (a higher k) send a few fewer of them
    maxWave: 24, maxBig: 36,   // more than this on the lawn at once gets hard to follow: the extra goes into their health instead
    nearly: 0.25,              // the next wave comes when no more than this share of the current one is still walking...
    waveTimeout: 24,           // ...or this long after its last zombie came in
    spawnSec: 18, bigSpawnSec: 13, // a wave walks in over about this many seconds (a zombie every 0.8 .. 3 s)
    koMs: 30000, dmgK: 0.55, typeK: 0.5, cd: 1.7, heal: 0.16,
    zSpeed: 5.6, bossSpeed: 0.55, bossLv: 1.35, bossHp: 2.6,
    gap: 13, bossGap: 20,      // a biting zombie stands this far from the plant (so both stay visible)
    holdMs: 280,
  };
  // reach in lawn tiles for the plants that hit "what's near" (shooters and lobbers reach any distance)
  const REACH = { zap: 2.6, spore: 2.2, support: 2.6 };
  const HEAD = [20, 25, 29]; // how tall a plant is at each stage (for bars, emotes and floaters)
  // the column a plant likes best when the game plants it for you (shooters at the back, brawlers up front)
  const LIKES = { lobber: 0, shooter: 1, support: 2, zap: 3, spore: 4, melee: 5, bomb: 5, wall: 6 };

  // ---------------- module state ----------------
  let root, hubEl, playEl, cv, ctx, buf, bx, bgC, bgx, fenceC, fcx, hudEl, waveEl, barEl, flagsEl, capEl, trayEl, rosterEl, fruitEl, banEl, tipEl, overEl, ghostEl, gctx;
  let visible = false, mounted = false, W = 0, H = 0, DPR = 1, Z = 2, t = 0, zid = 0, bgKey = '', uiT = 0, sizeKey = '';
  const L = { ww: 0, wh: 0, cellW: 24, laneH: 28, gx0: 18, gy0: 100, pathW: 10, topW: 30 };
  let M = null;                     // the match on the lawn (null on the map picker)
  let COLS = 8;                     // 8 columns, or 7 when that lets a phone show everything bigger (picked as a match starts)
  let press = null, drag = null, trayPress = null;
  const lastPtr = { x: 0, y: 0 };
  const laneY = r => L.gy0 + (r + 1) * L.laneH - 3; // feet line of a lane
  const colX = c => L.gx0 + (c + 0.5) * L.cellW;
  const gridX1 = () => L.gx0 + COLS * L.cellW;
  const nowMs = () => (M && M.sim ? M.simMs : Date.now());
  const isKO = s => !!s.ko && nowMs() < (s.recoverUntil || 0);

  // ---------------- sprites (guarded: some art is still being drawn, so nothing may crash) ----------------
  const sprCache = new Map();
  function blob(w, h, col) { const g = new PX.Grid(w, h); g.ell(w / 2, h / 2, w / 2 - 1, h / 2 - 1, col || PX.RAMPS.slate); g.outline(); return g.canvas(); }
  function spr(key, make, fb) {
    let c = sprCache.get(key); if (c) return c;
    try { c = make(); } catch (e) { c = null; }
    if (!c || !c.width) { try { c = fb(); } catch (e) { c = blob(10, 10); } }
    sprCache.set(key, c); return c;
  }
  const propSpr = (kind, theme) => spr('p:' + kind + ':' + theme, () => PX.prop(kind, theme), () => blob(14, 12));
  const houseSpr = F => spr('h:' + JSON.stringify(F), () => PX.pvzHouse(F), () => blob(60, 50, PX.RAMPS.peach));
  const fruitSpr = k => spr('f:' + k, () => PX.item('fruit', k), () => PX.fruit('round'));
  const zSpr = (look, f, open) => spr('z:' + JSON.stringify(look) + f + (open ? 1 : 0), () => PX.sprig(look, { walk: true, frame: f, mouth: open ? 'open' : undefined }), () => blob(14, 24, PX.RAMPS.moss));
  const bossSpr = (id, f) => spr('b:' + id + ':' + f, () => PX.critter(id, f), () => blob(36, 40, PX.RAMPS.slate));
  const fxSpr = k => { try { return window.__battle && window.__battle.aspr ? window.__battle.aspr(k) : null; } catch (e) { return null; } };
  let arrowC = null;
  function arrowSprite() {
    if (arrowC) return arrowC;
    const g = new PX.Grid(9, 7); g.poly([[1, 1], [8, 1], [4.5, 6]], '#ffcc44'); g.outline(); g.px([[3, 2], [4, 2]], '#fff27a');
    return (arrowC = g.canvas());
  }
  let lockC = null;
  function lockIcon() { // (the same little padlock as the Battle screen)
    if (lockC) return lockC;
    try {
      const g = new PX.Grid(10, 12), P = f => PX.piece(g, f);
      P(t2 => { PX.stroke(t2, [[2.8, 6], [2.8, 3.4], [5, 1.4], [7.2, 3.4], [7.2, 6]], 0.62, 0.62, '#cdd0e4'); });
      P(t2 => { t2.poly([[1, 5.6], [9, 5.6], [9, 11], [1, 11]], '#ffe39a'); t2.poly([[1, 9.6], [9, 9.6], [9, 11], [1, 11]], '#f4c86e'); });
      g.ell(5, 7.6, 0.8, 0.8, INK); g.outerLine(); lockC = g.canvas();
    } catch (e) { lockC = blob(10, 12, PX.RAMPS.sun); }
    return lockC;
  }
  // a frozen (chilled) copy of a zombie sprite: same size, washed with icy blue
  const iceCache = new WeakMap();
  function icy(c) {
    let o = iceCache.get(c); if (o) return o;
    o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const x = o.getContext('2d');
    x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(150,210,255,0.5)'; x.fillRect(0, 0, o.width, o.height);
    PX.keepK(c, o); iceCache.set(c, o); return o;
  }

  // ---------------- colours & noise (for the painted lawn) ----------------
  const U32 = new Map();
  function u32(c) {
    let v = U32.get(c); if (v != null) return v;
    const n = parseInt(String(c).slice(1, 7), 16) || 0; v = (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255)) >>> 0;
    U32.set(c, v); return v;
  }
  function mix(a, b, k) {
    const p = parseInt(String(a).slice(1, 7), 16) || 0, q = parseInt(String(b).slice(1, 7), 16) || 0, ch = (n, s) => (n >> s) & 255;
    return '#' + [16, 8, 0].map(s => Math.round(lerp(ch(p, s), ch(q, s), k)).toString(16).padStart(2, '0')).join('');
  }
  const hash2 = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const bayer = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
  function vnoise(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  // ---------------- the map's look ----------------
  // Garden map palettes come from garden.js (PS.gardenMaps); a map that isn't drawn yet borrows the Front Yard's.
  const FALLBACK_TH = {
    sky: ['#7cc8f0', '#94d2f2', '#ade0f6', '#c8ebf9'], far: ['#b0dc98', '#8cc47a'], near: ['#9cd486', '#74b864'], lawn: ['#94d46e', '#6aa858'],
    grass: ['#a2dc78', '#94d46e', '#88cc64', '#7cc05a'], tiles: ['#a0dc78', '#94d46c', '#7cc458', '#72b850'], cloud: ['#ffffff', '#e4eefc', '#c8d6f2'],
    fence: 'picket', mower: 'lawnmower', night: [20, 18, 64, 0.36], dim: 0, props: [],
    facade: { kind: 'house', wall: ['#fbf0d4', '#ecdcb4', '#cdb88e'], roof: ['#e0705a', '#b84a3a', '#86302a'], trim: '#ffffff', glass: '#8fd3f0', door: ['#b8603a', '#8a4428'], porch: ['#e4b27a', '#b8743a'], found: ['#c4c4cc', '#8e8e9c'], box: true, shutter: '#5cb43a' },
  };
  function themeFor(map) {
    const G = PS.gardenMaps || {};
    const th = G[map.map] || G.frontyard || FALLBACK_TH;
    const theme = (D.GARDEN_MAPS[map.map] && D.GARDEN_MAPS[map.map].theme) || (G[map.map] ? 'day' : 'day');
    return { th: Object.assign({}, FALLBACK_TH, th), theme: G[map.map] ? theme : 'day' };
  }

  // ---------------- progress ----------------
  function progress() {
    const P = PS.S.progress;
    if (!P.survival || typeof P.survival !== 'object' || Array.isArray(P.survival)) P.survival = {};
    return P.survival;
  }
  const winsOf = id => { const p = progress()[id]; return (p && p.wins) || 0; };
  // (a testing tool can open a map without winning the one before: progress.survival[id] = { open: true })
  const mapOpen = m => !m.unlock || winsOf(m.unlock) > 0 || !!(progress()[m.id] && progress()[m.id].open);

  // ================================================================
  // The match
  // ================================================================
  // plants: the sprouts that may play (the save's own, or copies for the headless sim)
  function newMatch(map, plants, sim) {
    const { th, theme } = themeFor(map);
    const owned = plants.slice().sort((a, b) => ST.totalLevels(b) - ST.totalLevels(a) || String(a.name).localeCompare(String(b.name)));
    const nTeam = Math.max(1, Math.min(map.cap, owned.length));
    const top = owned.slice(0, nTeam), lv = top.reduce((a, s) => a + ST.totalLevels(s), 0) / Math.max(1, top.length);
    // a small team (fewer real fighters than rows) only has to guard the middle rows; the others are bare dirt, like the first
    // levels of the original. Helpers don't count as fighters, defenders count half.
    const fight = top.reduce((a, s) => a + (roleOf(s) === 'support' ? 0 : roleOf(s) === 'wall' ? 0.5 : 1), 0);
    const lanes = fight >= 5 ? [0, 1, 2, 3, 4] : fight >= 3 ? [1, 2, 3] : [2];
    const m = {
      map, th, theme, sim: !!sim, simMs: Date.now(), plants: owned, top, order: owned.map(s => s.id), cap: map.cap, nTeam, lv: Math.max(1, lv), lanes,
      phase: 'setup', paused: false, t: 0, setupT: SV.setup, counting: false,
      units: [], zs: [], shots: [], parts: [], floaters: [], hp: new Map(), fought: new Set(), kills: {}, everKO: new Set(),
      mowers: [0, 1, 2, 3, 4].map(r => ({ lane: r, st: lanes.includes(r) ? 'ready' : 'none', x: 0, v: 0 })),
      waves: [], wi: -1, pending: 0, breakT: 0, spawnQ: [], nextAt: 0, lastSpawnT: 0, total: 0, resolved: 0, killed: 0, kos: 0, mowed: 0,
      sel: null, flash: 0, banT: 0, endT: 0, granted: false, res: null, warned: 0, props: [],
    };
    return m;
  }
  // How fast your team beats zombies (zombies per second): each of your strongest plants' damage per second against a
  // plain zombie of this level, weighted by how much of the lawn its kind of attack covers.
  function teamRate(zl) {
    const E = engine(); let kr = 0;
    try {
      const Z0 = E.makeFighter(ST.makeZombie('basic', Math.max(2, Math.round(zl))), 'o', 1, null, true);
      for (const s of M.top) {
        const F = E.makeFighter(s, 'p'), mv = bestMove(F).m, role = roleOf(s);
        const tm = E.typeMult(mv.el, Z0.els) || 1, dmg = E.baseDamage(F, Z0, mv) * (mv.fx.hits || 1) / tm * (1 + (tm - 1) * SV.typeK) * SV.dmgK;
        kr += dmg / (cdOf(F) * (role === 'bomb' ? 2.6 : 1)) * (SV.roleW[role] || 0.8) / Math.max(1, Z0.max);
      }
    } catch (e) { kr = M.nTeam * 0.05; }
    return Math.max(0.02, kr);
  }
  // Each wave: as many zombies as your team beats in waveSec seconds (+1), the last one x1.6 with a Flag Zombie up front and
  // the map's Zombosses. Levels: your team's average x the map's k, a little random, a little tougher wave by wave.
  function planWaves() {
    const map = M.map, Wn = map.waves, out = [], bag = [];
    const laneOf = () => { if (!bag.length) { const a = M.lanes.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } bag.push(...a); } return bag.pop(); };
    // (a Flag Zombie only ever leads the huge last wave, as in the original)
    const pool0 = (map.pool || []).filter(k => k !== 'flag'), pool = pool0.length ? pool0 : ['basic'], rate = teamRate(M.lv * map.k);
    M.rate = rate;
    for (let w = 0; w < Wn; w++) {
      const big = w === Wn - 1, k = Wn > 1 ? w / (Wn - 1) : 1;
      const secs = big ? SV.waveSec[1] * SV.bigMult : SV.waveSec[0] + (SV.waveSec[1] - SV.waveSec[0]) * k;
      const want = Math.round(rate * secs * Math.pow(0.7 / map.k, SV.kFlat)) + 1, cap = big ? SV.maxBig : SV.maxWave;
      const n = Math.min(want, cap), hpK = want / n, list = [];
      // early waves use the first (gentler) kinds of the pool; later ones the whole pool
      const kinds = pool.slice(0, Math.max(2, Math.ceil(pool.length * (0.35 + 0.65 * k))));
      for (let i = 0; i < n; i++) list.push({ kind: pick(kinds), lv: Math.max(2, Math.round(M.lv * map.k * rand(0.9, 1.1) * (0.92 + 0.16 * k))), lane: laneOf(), hpK });
      if (big && D.ZOMBIES.flag) list[0].kind = 'flag';
      const E = engine();
      if (big && map.boss && E && E.BOSSES && E.BOSSES.some(B => B.id === map.boss)) list.splice(Math.min(list.length, 3), 0, { boss: map.boss, lv: M.lv * map.k * SV.bossLv, lane: M.lanes[Math.floor(M.lanes.length / 2)] });
      out.push({ list, big, n: list.length });
    }
    M.waves = out; M.total = out.reduce((a, w) => a + w.n, 0);
  }

  // ---------------- plants on the lawn ----------------
  const unitOf = s => M && M.units.find(u => u.s === s);
  const unitAtSpot = (r, c) => M.units.find(u => u.r === r && u.c === c);
  const roleOf = s => (D.PLANTS[s.species] || {}).role || 'shooter';
  function makeUnit(s, r, c) {
    const E = engine(); let F;
    try { F = E.makeFighter(s, 'p'); } catch (e) { F = { max: 60, hp: 60, atk: 12, def: 10, spd: 10, lv: 1, els: ['plant'], moves: ['seedspit'] }; }
    const keep = M.hp.get(s.id), max = F.max, hp = keep && keep.hp > 0 ? clamp(keep.hp, 1, max) : max;
    return { s, F, hp, max, r, c, x: colX(c), y: laneY(r), role: roleOf(s), cd: rand(0.4, 1.2), pick: null, tgt: null, dead: 0, lift: false,
      hitT: 0, lungeT: 0, kickT: 0, hopT: 0.35, cheerT: 0, blinkT: rand(1, 4), ph: Math.random() * 6, emote: null, emoteT: 0, bitten: 0, onT: 0, look: null, lookT: 0, face: 1, tooFar: 0 };
  }
  function saveHp(u) { M.hp.set(u.s.id, { hp: u.hp, max: u.max }); }
  function plantAt(s, r, c) {
    if (!M.lanes.includes(r) || c < 0 || c >= COLS) return false;
    const u0 = unitOf(s), other = unitAtSpot(r, c);
    if (u0) return moveUnit(u0, r, c);
    if (isKO(s)) { tip(`${s.name} is resting. Back soon!`); return false; }
    if (other) { benchUnit(other, true); }
    else if (M.units.length >= M.cap) { tip(`Only ${M.cap} plants fit on this lawn. Drag one back to the tray first.`); snd('miss'); return false; }
    const u = makeUnit(s, r, c); M.units.push(u);
    puff(u.x, u.y, 'dust', 8, '#9a7a52'); emote(u, 'sparkle', 0.9); snd('plant');
    if (M.phase === 'setup' && !M.counting) { M.counting = true; M.setupT = SV.setup; }
    trayDirty = true; return true;
  }
  function moveUnit(u, r, c) {
    if (!M.lanes.includes(r) || c < 0 || c >= COLS) return false;
    const other = unitAtSpot(r, c);
    if (other === u) return false;
    if (other) { other.r = u.r; other.c = u.c; other.x = colX(other.c); other.y = laneY(other.r); other.hopT = 0.35; }
    u.r = r; u.c = c; u.x = colX(c); u.y = laneY(r); u.hopT = 0.35; u.pick = null;
    puff(u.x, u.y, 'dust', 6, '#9a7a52'); snd('plant');
    return true;
  }
  function benchUnit(u, quiet) {
    saveHp(u); M.units = M.units.filter(o => o !== u);
    if (M.sel === u) M.sel = null;
    if (!quiet) { puff(u.x, u.y - 8, 'spark', 6, '#ffffff'); snd('pop'); }
    trayDirty = true;
  }
  // knocked out: dizzy stars, then off to the house to rest for 30 seconds, exactly like a garden attack
  function knockOut(u) {
    const s = u.s;
    M.units = M.units.filter(o => o !== u); M.hp.set(s.id, { hp: 0, max: u.max }); M.kos++; M.everKO.add(s.id);
    if (M.log) M.log.push(`${Math.round(M.t)}s KO ${s.species} r${u.r}c${u.c}`);
    if (M.sel === u) M.sel = null;
    s.ko = true; s.recoverUntil = nowMs() + SV.koMs;
    if (!M.sim) { s.home = true; delete s.pot; delete s.potArea; PS.save(); }
    puff(u.x, u.y - 8, 'dust', 12, '#d8d0c0'); puff(u.x, u.y - 14, 'spark', 6, '#fff6a8');
    trayDirty = true;
  }
  // the game plants your best plants for you, the way a good gardener would: something that shoots in every row first (at
  // the back), then a blocker (brawler, defender or boomer) in front of it, helpers in the middle rows, the rest where it's thin
  const RANGED = ['shooter', 'lobber', 'zap', 'spore'], BLOCK = ['melee', 'wall', 'bomb'];
  function autoPlace() {
    const free = () => M.cap - M.units.length;
    if (free() <= 0) return 0;
    const avail = M.plants.filter(s => !unitOf(s) && !isKO(s));
    if (!avail.length) return 0;
    const centre = M.lanes.slice().sort((a, b) => Math.abs(a - 2) - Math.abs(b - 2));
    const spotFor = (s, r) => {
      const want = Math.round((LIKES[roleOf(s)] != null ? LIKES[roleOf(s)] : 2) * (COLS - 1) / 7);
      for (let d = 0; d < COLS; d++) for (const c of [want - d, want + d]) if (c >= 0 && c < COLS - 1 && !unitAtSpot(r, c)) return c;
      return -1;
    };
    let n = 0;
    const put = (s, r) => { if (!s || free() <= 0) return false; const c = spotFor(s, r); if (c < 0) return false; if (plantAt(s, r, c)) { avail.splice(avail.indexOf(s), 1); n++; return true; } return false; };
    const of = roles => avail.filter(s => roles.includes(roleOf(s)));
    const has = (r, roles) => M.units.some(u => u.r === r && !u.dead && roles.includes(u.role));
    const count = r => M.units.filter(u => u.r === r).length;
    // 1) something that can hit zombies from afar in every row (a blocker if there's nothing else)
    for (const r of centre) if (!has(r, RANGED)) { if (!put(of(RANGED)[0], r) && !has(r, BLOCK)) put(of(BLOCK)[0], r); }
    // 2) a blocker in front, in the rows that have none
    for (const r of centre) if (!has(r, BLOCK)) put(of(BLOCK)[0], r);
    // 3) helpers in the middle rows (they heal everyone near them)
    for (const s of of(['support'])) put(s, centre.slice().sort((a, b) => count(a) - count(b))[0]);
    // 4) everything else wherever there are fewest plants
    while (free() > 0 && avail.length) { const r = centre.slice().sort((a, b) => count(a) - count(b))[0]; if (!put(avail[0], r)) avail.shift(); }
    return n;
  }

  // ---------------- zombies ----------------
  function bossFighter(id, lv) {
    const E = engine(), F = E.makeBoss(id), B = F.boss, Lb = Math.max(4, Math.round(lv));
    // a Zombosses grown to your team's size (makeBoss alone is tuned for its own league), with lots of HP
    F.lv = Lb; F.atk = Math.round((12 + 0.44 * Lb) * B.atkK); F.def = Math.round((10 + 0.4 * Lb) * B.defK); F.spd = Math.round((10 + 0.4 * Lb) * B.spdK);
    F.max = F.hp = Math.round((40 + 2 * Lb) * B.hpK * SV.bossHp);
    return F;
  }
  function makeZ(q) {
    const E = engine(); let F, look = null;
    if (q.boss) F = bossFighter(q.boss, q.lv);
    else { const zs = ST.makeZombie(q.kind, q.lv); F = E.makeFighter(zs, 'o', 1, null, true); try { look = ST.lookOf(zs); } catch (e) { look = { zombie: 'basic' }; } }
    if (q.hpK > 1) F.max = F.hp = Math.round(F.max * q.hpK);
    const sp = q.boss ? SV.zSpeed * SV.bossSpeed : SV.zSpeed * clamp(0.8 + ((F.spd || 20) - 20) / 140, 0.7, 1.5);
    return { id: 'z' + zid++, F, kind: q.kind, look, boss: q.boss || null, name: q.boss ? (F.boss && F.boss.name) || 'Zombosses' : F.name, lane: q.lane,
      x: L.ww + rand(6, 14) + (q.boss ? 10 : 0), y: laneY(q.lane) + (q.boss ? 0 : Math.round(rand(-1.4, 1.4))), hp: F.max, max: F.max,
      cd: rand(0.5, 1.4), sp, ph: Math.random() * 2, hitT: 0, chomp: 0, dead: 0, fly: null, kb: 0, slowT: 0, seen: false };
  }
  const liveZ = () => M.zs.filter(z => !z.dead && !z.fly);
  const cdOf = F => SV.cd * clamp(36 / (18 + (F.spd || 20) * 0.6), 0.55, 1.45);
  function bestMove(F) { // -> { id, m } (the same pick as the garden: its strongest attack)
    let best = null, bid = null, bs = -1;
    for (const id of F.moves || []) { const m = D.MOVES[id]; if (!m || !(m.pow > 0)) continue; const sc = m.pow * (m.fx.hits || 1) * ((F.els || []).includes(m.el) ? 1.25 : 1) * (m.acc || 1); if (sc > bs) { bs = sc; best = m; bid = id; } }
    return best ? { id: bid, m: best } : { id: 'seedspit', m: D.MOVES.seedspit || { name: 'Bonk', el: 'normal', pow: 30, acc: 1, fx: {} } };
  }
  // the battle's damage, toned down for the lawn (SV.dmgK, as in the garden). Element match-ups count half as much here
  // (x0.875 / x1.25 instead of x0.75 / x1.5), so no map is out of reach for a team of ordinary plants.
  function hitFor(a, d, mv) {
    const E = engine(); let n = 1;
    try { const tm = E.typeMult(mv.el, d.els || ['normal']) || 1; n = E.baseDamage(a, d, mv) * (mv.fx.hits || 1) / tm * (1 + (tm - 1) * SV.typeK); } catch (e) { n = mv.pow * 0.4; }
    return Math.max(1, Math.round(n * SV.dmgK * rand(0.85, 1.15)));
  }
  // the battle's move styles, toned down for the lawn: what flies (its real sprite) and how
  const lawnFx = (role, id) => {
    const B = window.__battle, A = B && B.animOf ? B.animOf(id) : null, sty = A && A.s;
    if (role === 'melee' || role === 'wall') return { kind: 'melee' };
    if (role === 'bomb') return { kind: 'boom' };
    if (sty === 'shot' || sty === 'missile' || sty === 'boomer' || sty === 'magnet') return { kind: 'shot', o: A.o || (sty === 'missile' ? 'missile' : sty === 'boomer' ? 'boomer' : sty === 'magnet' ? 'magnet' : 'pea'), n: Math.min(3, A.n || 1) };
    if (sty === 'lob') return { kind: 'lob', o: A.o || 'cabbage', n: Math.min(2, A.n || 1) };
    if (sty === 'flame') return { kind: 'shot', o: 'fireball', n: 3, spread: true };
    if (sty === 'zap' || sty === 'beam' || sty === 'eclipse') return { kind: sty === 'zap' ? 'zap' : 'beam' };
    return role === 'lobber' ? { kind: 'lob', o: 'cabbage', n: 1 } : role === 'zap' ? { kind: 'zap' } : role === 'spore' ? { kind: 'puff' } : { kind: 'shot', o: 'pea', n: 1 };
  };

  // who a plant can hit. picked: the player chose this zombie (shooters and lobbers then reach any row)
  function canHit(u, z, picked) {
    if (!z || z.dead || z.fly || z.x > L.ww - 3) return false;
    const dl = Math.abs(z.lane - u.r), dx = z.x - u.x, cw = L.cellW;
    switch (u.role) {
      case 'shooter': return (dl === 0 || picked) && dx > -cw * 0.5;
      case 'lobber': return (dl <= 1 || picked) && dx > -cw * 0.5;
      case 'zap': case 'spore': case 'support': { const R = REACH[u.role] * cw * (picked ? 1.3 : 1); return (dl <= 1 || picked) && dx > -cw * 0.6 && Math.hypot(dx, dl * L.laneH) <= R; }
      case 'bomb': return dl <= 1 && dx > -cw * 0.6 && dx < cw * 1.25;
      default: return dl === 0 && dx > -cw * 0.45 && dx < cw * 0.95;
    }
  }
  // own row first, then the zombie closest to the house
  function autoTarget(u) {
    let best = null, bs = 1e9;
    for (const z of M.zs) { if (!canHit(u, z, false)) continue; const sc = (z.lane === u.r ? 0 : 1000) + z.x; if (sc < bs) { bs = sc; best = z; } }
    return best;
  }
  function updateUnit(u, dt) {
    u.hitT = Math.max(0, u.hitT - dt); u.lungeT = Math.max(0, u.lungeT - dt); u.kickT = Math.max(0, u.kickT - dt); u.hopT = Math.max(0, u.hopT - dt);
    u.cheerT = Math.max(0, u.cheerT - dt); u.tooFar = Math.max(0, u.tooFar - dt);
    if (u.emoteT > 0 && (u.emoteT -= dt) <= 0) u.emote = null;
    if ((u.blinkT -= dt) < -0.14) u.blinkT = rand(2, 5);
    if (u.dead) { if ((u.dead += dt) > 0.9) knockOut(u); return; }
    if (M.phase !== 'fight' || u.lift) return;
    u.cd -= dt; if (u.bitten > 0) u.bitten -= dt;
    if ((u.onT += dt) > 2) M.fought.add(u.s.id);
    // a helper heals a hurt friend nearby first
    if (u.role === 'support' && u.cd <= 0) {
      const R = REACH.support * L.cellW;
      const hurt = M.units.filter(o => !o.dead && !o.lift && o.hp < o.max * 0.75 && Math.hypot(o.x - u.x, o.y - u.y) <= R).sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
      if (hurt) {
        const n = Math.max(2, Math.round(hurt.max * SV.heal)); hurt.hp = Math.min(hurt.max, hurt.hp + n); saveHp(hurt);
        floater(`+${n}`, '#3f9a3a', hurt.x, headY(hurt) - 2); puff(hurt.x, hurt.y - 12, 'spark', 6, '#c8ff9a'); heartUp(hurt.x, hurt.y - 18);
        u.cd = cdOf(u.F) * 1.2; u.cheerT = 0.4; M.fought.add(u.s.id); return;
      }
    }
    if (u.pick && (u.pick.dead || u.pick.fly)) u.pick = null;
    let tg = null;
    if (u.pick) { if (canHit(u, u.pick, true)) tg = u.pick; else if (!u.tooFar) { u.tooFar = 3; floater('Too far!', '#a2477a', u.x, headY(u) - 8); } }
    if (!tg) tg = autoTarget(u);
    u.tgt = tg;
    if (!tg) return;
    u.face = tg.x >= u.x - 2 ? 1 : -1;
    if (u.cd > 0) return;
    attack(u, tg);
  }
  function attack(u, tg) {
    const BM = bestMove(u.F), mv = BM.m, dmg = hitFor(u.F, tg.F, mv), bomb = u.role === 'bomb', fx = lawnFx(u.role, BM.id), ice = mv.el === 'ice';
    u.cd = cdOf(u.F) * (bomb ? 2.6 : 1); M.fought.add(u.s.id);
    const col = (D.ELEMENTS[mv.el] || D.ELEMENTS.normal).color;
    if (fx.kind === 'melee' || fx.kind === 'boom') { // up close: a little lunge and a bonk (a boomer goes boom on everything near)
      u.lungeT = 0.3; u.hopT = bomb ? 0.35 : 0;
      if (bomb) {
        for (const z of liveZ()) if (Math.abs(z.lane - tg.lane) <= 1 && Math.abs(z.x - tg.x) < L.cellW * 1.6) hurtZ(z, z === tg ? dmg : Math.round(dmg * 0.6), col, u);
        puff(tg.x, tg.y - 10, 'spark', 16, '#ffd27a'); puff(tg.x, tg.y - 6, 'dust', 10, '#9a8a7a'); snd('boom'); M.flash = 0.12; buzz(30);
      } else { hurtZ(tg, dmg, col, u, ice); puff(tg.x - 4, tg.y - 12, 'spark', 5, '#ffffff'); snd('snap'); }
      return;
    }
    // ranged: its real projectile(s), a little recoil, the damage shared between them
    const n = fx.kind === 'shot' || fx.kind === 'lob' ? fx.n || 1 : 1, sp = fx.o ? fxSpr(fx.o) : null, sx = u.x + u.face * 7, sy = u.y - 14, d = Math.hypot(tg.x - sx, tg.y - 12 - sy);
    for (let i = 0; i < n; i++) {
      const kind = fx.kind === 'shot' ? 'pea' : fx.kind;
      M.shots.push({ kind, spr: sp, x: sx, y: sy, x0: sx, y0: sy + (fx.spread ? (i - 1) * 2 : 0), tg, t: -i * 0.1, dur: kind === 'lob' ? 0.75 : kind === 'zap' || kind === 'beam' ? 0.16 : Math.max(0.18, d / 150),
        dmg: Math.max(1, Math.round(dmg / n)), col, from: u, ice, spin: kind === 'lob' || fx.o === 'boomer' });
    }
    u.kickT = 0.14;
    snd(fx.kind === 'zap' || fx.kind === 'beam' ? 'zap' : fx.kind === 'lob' ? 'whoosh' : 'pop');
  }
  function updateShots(dt) {
    for (const sh of M.shots) {
      sh.t += dt; if (sh.t < 0) continue;
      const k = Math.min(1, sh.t / sh.dur), tg = sh.tg, tx = tg.x, ty = tg.y - (tg.boss ? 22 : 12);
      sh.x = lerp(sh.x0, tx, k); sh.y = lerp(sh.y0, ty, k) - (sh.kind === 'lob' ? Math.sin(k * Math.PI) * 24 : 0);
      if (k >= 1) {
        sh.done = true;
        if (!tg.dead && !tg.fly) { hurtZ(tg, sh.dmg, sh.col, sh.from, sh.ice); puff(tx, ty, 'spark', sh.kind === 'lob' ? 8 : 5, sh.col); if (sh.kind === 'lob') puff(tx, tg.y, 'dust', 4, '#c8b89a'); }
      }
    }
    M.shots = M.shots.filter(s => !s.done);
  }
  function hurtZ(z, n, col, from, ice) {
    if (z.dead || z.fly) return;
    z.hp -= n; z.hitT = 0.15; z.kb = z.boss ? 0.08 : 0.2;
    if (ice) z.slowT = 2.5;
    floater(String(n), col || '#ffffff', z.x + rand(-3, 3), z.y - (z.boss ? 44 : 28));
    if (z.hp <= 0) {
      z.hp = 0; z.dead = 0.001; M.killed++; M.resolved++;
      if (from && from.s) M.kills[from.s.id] = (M.kills[from.s.id] || 0) + 1;
      puff(z.x, z.y - 6, 'dust', 12, '#d8d0c0'); puff(z.x, z.y - 14, 'spark', 8, '#fff6a8'); snd('pop'); buzz(12);
      for (const u of M.units) if (u.pick === z) u.pick = null;
    }
  }
  function updateZombie(z, dt) {
    if (z.fly) { z.fly.vy += 260 * dt; z.x += z.fly.vx * dt; z.y += z.fly.vy * dt * 0.35; z.fly.h += z.fly.vh * dt; z.fly.vh -= 300 * dt; z.fly.a += z.fly.va * dt; z.fly.life -= dt; return; }
    if (z.dead) { z.dead += dt; return; }
    z.cd -= dt; z.hitT = Math.max(0, z.hitT - dt); z.chomp = Math.max(0, z.chomp - dt); z.kb = Math.max(0, z.kb - dt); z.slowT = Math.max(0, z.slowT - dt);
    // the first plant in front of it in its row
    const gap = z.boss ? SV.bossGap : SV.gap;
    let food = null;
    for (const u of M.units) if (!u.dead && !u.lift && u.r === z.lane && u.x < z.x + 3 && z.x - u.x <= gap + 1 && (!food || u.x > food.x)) food = u;
    if (food) {
      if (z.cd <= 0) { // chomp!
        // (every zombie bites the same way, like the original; a Zombosses uses its own attacks)
        const ms = z.boss ? (z.F.moves || []).filter(id => D.MOVES[id] && D.MOVES[id].pow > 0) : [], mv = D.MOVES[ms.length ? pick(ms) : 'zbite'] || D.MOVES.zbite || { el: 'normal', pow: 40, acc: 1, fx: {} };
        hurtP(food, hitFor(z.F, food.F, mv)); z.cd = cdOf(z.F) * 1.15 * (z.slowT > 0 ? 1.4 : 1); z.chomp = 0.35; snd('munch');
        if (z.boss) { for (const u of M.units) if (u !== food && !u.dead && !u.lift && Math.abs(u.r - z.lane) <= 1 && Math.abs(u.x - z.x) < L.cellW * 1.3) hurtP(u, Math.round(hitFor(z.F, u.F, mv) * 0.5)); M.flash = 0.12; buzz(40); }
      }
      return;
    }
    z.x -= z.sp * (z.slowT > 0 ? 0.5 : 1) * dt;
    if (!z.seen && z.x < L.ww - 4) { z.seen = true; warnEmptyRow(z); }
    const m = M.mowers[z.lane];
    if (m.st === 'ready' && z.x <= L.gx0 - 2) fireMower(m);
    else if (m.st !== 'ready' && m.st !== 'go' && z.x <= 5) lose(z);
  }
  function hurtP(u, n) {
    if (u.dead) return;
    u.hp -= n; u.hitT = 0.15; u.bitten = 1.5; M.fought.add(u.s.id);
    floater(String(n), '#e5535f', u.x + rand(-3, 3), headY(u) - 4);
    if (Math.random() < 0.3) emote(u, 'swirl', 0.8);
    if (u.hp <= 0) {
      u.hp = 0; u.dead = 0.001; emote(u, 'zz', 1.2); puff(u.x, u.y - 10, 'spark', 10, '#fff27a'); floater('Knocked out!', '#a2477a', u.x, headY(u) - 12); snd('thud');
      if (M.sel === u) M.sel = null;
    }
    saveHp(u);
  }
  // fruit: Plant Food and Golden Fruit heal fully, a Heart Apple or Hearty Root half, any other fruit a third (as in the garden)
  function feedFruit(s, k) {
    const u = unitOf(s), h = M.hp.get(s.id);
    if (!ST.useFruit(k)) return false;
    try { ST.feed(s, k); } catch (e) { console.error(e); }
    const part = k === 'plantfood' || k === 'goldfruit' ? 1 : k === 'apple' || k === 'heartyroot' ? 0.5 : 0.34;
    if (u && !u.dead) {
      const before = u.hp; u.hp = Math.min(u.max, u.hp + Math.round(u.max * part)); saveHp(u);
      floater(u.hp > before ? `+${u.hp - before}` : 'Full!', '#3f9a3a', u.x, headY(u) - 4);
      heartUp(u.x, u.y - 22); puff(u.x, u.y - 12, 'spark', 8, '#c8ff9a'); emote(u, 'heart', 1); u.cheerT = 0.6;
    } else {
      // (a plant on the tray: it heals too, ready for when it goes back on the lawn)
      if (h) { h.hp = Math.min(h.max, h.hp + Math.round(h.max * part)); if (h.hp >= h.max) M.hp.delete(s.id); }
      tip(`${s.name} ate the ${(D.FRUITS[k] || {}).name || 'fruit'}${h ? ' and feels better' : ''}. Yum!`, 2);
    }
    snd('munch'); trayDirty = true;
    return true;
  }
  // a zombie walks into a row nobody can hit it in: say so (twice per match at most)
  function warnEmptyRow(z) {
    if (M.sim || M.warned >= 2 || z.boss) return;
    if (M.units.some(u => !u.dead && (u.r === z.lane || (u.role === 'lobber' && Math.abs(u.r - z.lane) <= 1)) && u.role !== 'support')) return;
    M.warned++; tip('A zombie is coming down an empty row! Drag a plant there.', 3.2); snd('coo');
  }

  // ---------------- lawn mowers ----------------
  function fireMower(m) {
    m.st = 'go'; m.x = L.gx0 - 7; m.v = 30; M.mowed++;
    if (M.log) M.log.push(`${Math.round(M.t)}s mower r${m.lane} w${M.wi + 1}`);
    if (!M.sim) { tip('Lawn mower to the rescue!', 2.4); snd('whoosh'); buzz(30); }
  }
  function knockAway(z) {
    z.fly = { vx: rand(110, 160), vy: -rand(40, 90), h: 0, vh: rand(80, 120), a: 0, va: rand(8, 14), life: 2 }; M.resolved++;
    puff(z.x, z.y - 10, 'spark', 10, '#ffffff'); snd('snap'); buzz(15);
    for (const u of M.units) if (u.pick === z) u.pick = null;
  }
  function updateMowers(dt) {
    for (const m of M.mowers) {
      if (m.st !== 'go') continue;
      m.v = Math.min(170, m.v + 260 * dt); m.x += m.v * dt;
      if (!M.sim && Math.random() < dt * 30) puff(m.x - 8, m.y || laneY(m.lane), 'dust', 1, '#7cc858');
      for (const z of M.zs) if (!z.dead && !z.fly && z.lane === m.lane && z.x <= m.x + 10 && z.x >= m.x - 30) knockAway(z);
      if (m.x > L.ww + 26) m.st = 'gone';
    }
  }

  // ---------------- waves ----------------
  function startFight() {
    if (!M || M.phase !== 'setup') return;
    planWaves();
    M.phase = 'fight'; M.breakT = SV.firstWave; M.pending = 0; M.sel = M.sel || null;
    banner('Here come the zombies!', `Wave 1 of ${M.waves.length}`, null, [], 2.6);
    snd('groan'); buzz(40);
  }
  function scheduleWave(i) {
    M.pending = i; const big = M.waves[i].big;
    M.breakT = big ? SV.bigBreak : SV.waveBreak;
    if (big) { banner('A huge wave of zombies is coming!', M.map.boss ? 'Final wave! A Zombosses is with them!' : 'Final wave!', null, [], SV.bigBreak, true); snd('groan'); M.flash = 0.15; buzz(60); }
    else { banner(`Wave ${i + 1} of ${M.waves.length}`, i === 1 ? 'More zombies are coming!' : 'Keep it up!', null, [], 2.6); snd('groan'); }
  }
  function beginWave(i) {
    M.wi = i; M.spawnQ = M.waves[i].list.slice(); M.nextAt = 0.3;
  }
  function updateWaves(dt) {
    if (M.breakT > 0) { M.breakT -= dt; if (M.breakT <= 0) beginWave(M.pending); return; }
    if (M.spawnQ.length) {
      M.nextAt -= dt;
      if (M.nextAt <= 0) {
        const q = M.spawnQ.shift(), z = makeZ(q); M.zs.push(z); M.lastSpawnT = M.t;
        const Wv = M.waves[M.wi];
        M.nextAt = rand(0.75, 1.25) * (Wv.big ? clamp(SV.bigSpawnSec / Wv.n, 0.5, 1.4) : clamp(SV.spawnSec / Wv.n, 0.8, 3));
        if (z.boss) { banner(`${z.name} is here!`, 'Everyone, fight together!', null, [], 3, true); snd('boom'); M.flash = 0.2; buzz(60); }
        else if (Math.random() < 0.3) snd('groan');
      }
      return;
    }
    const alive = liveZ().length;
    if (M.wi < M.waves.length - 1) {
      // the next wave comes when this one is nearly beaten, or after a while anyway
      if (alive <= Math.floor(M.waves[M.wi].n * SV.nearly) || M.t - M.lastSpawnT > SV.waveTimeout) scheduleWave(M.wi + 1);
    } else if (!alive) win();
  }

  // ---------------- win / lose ----------------
  function win() {
    M.phase = 'win'; M.endT = 3.2; M.sel = null;
    for (const u of M.units) { u.cheerT = 3; u.hopT = 0.35; emote(u, pick(['heart', 'sparkle']), 2); }
    if (M.sim) return;
    grant();
    banner('You won!', `${M.map.name} is safe!`, null, [], 3.2);
    snd('level'); buzz(50);
    for (let i = 0; i < 40; i++) M.parts.push({ x: rand(0, L.ww), y: rand(L.gy0 - 60, L.gy0 - 10), vx: rand(-12, 12), vy: rand(-30, 0), life: rand(1.4, 2.6), type: 'confetti', color: pick(['#f07a84', '#fbf236', '#99e550', '#5fcde4', '#c9a2f0', '#ffffff']), grav: true });
  }
  function lose(z) {
    if (M.phase !== 'fight') return;
    M.phase = 'lose'; M.endT = 2.4; M.sel = null; M.loseZ = z;
    if (M.sim) return;
    for (const u of M.units) emote(u, '!', 2);
    banner('Oh no!', 'The zombies got to the house!', null, [], 2.4, true);
    snd('groan'); buzz(80);
    PS.S.totals.survivalLosses = (PS.S.totals.survivalLosses || 0) + 1; PS.save();
  }
  // the prize is paid once, the moment the last zombie falls (so closing the app can't lose it)
  function grant() {
    if (M.granted || M.sim) return; M.granted = true;
    const map = M.map, P = progress(), p = P[map.id] = Object.assign({ wins: 0, best: null }, P[map.id]);
    const first = !p.wins, secs = Math.round(M.t);
    p.wins++; if (!p.best || secs < p.best) p.best = secs;
    let coins = 0; try { coins = ST.addCoins(map.coins, 'survival'); } catch (e) { console.error(e); }
    const xp = Math.round(10 + map.coins / 10), rows = [];
    for (const id of M.fought) {
      const s = PS.S.sprouts.find(x => x.id === id); if (!s) continue;
      const kills = M.kills[id] || 0, gives = { power: Math.round(xp * 1.2) + Math.min(20, kills), stamina: xp };
      try { ST.gain(s, gives); } catch (e) { console.error(e); }
      rows.push({ s, gives, kills });
    }
    let legend = null;
    if (first && D.PLANTS[map.reward]) { try { legend = ST.unlockSpecies(map.reward, 'Won in ' + map.name); } catch (e) { console.error(e); } }
    PS.S.totals.survivalWins = (PS.S.totals.survivalWins || 0) + 1;
    PS.save();
    M.res = { coins, rows: rows.sort((a, b) => b.kills - a.kills), legend, first, secs };
  }

  // ---------------- one step of the match ----------------
  let trayDirty = false;
  function update(dt) {
    M.t += dt; if (M.sim) M.simMs += dt * 1000;
    M.flash = Math.max(0, M.flash - dt);
    if (M.banT > 0 && (M.banT -= dt) <= 0) banner(null);
    for (const u of M.units.slice()) updateUnit(u, dt);
    if (M.phase === 'setup') {
      if (M.counting && (M.setupT -= dt) <= 0) startFight();
    } else if (M.phase === 'fight') {
      updateWaves(dt);
      for (const z of M.zs) updateZombie(z, dt);
      updateShots(dt);
    } else {
      for (const z of M.zs) if (z.fly || z.dead) updateZombie(z, dt);
      else if (M.phase === 'lose' && z === M.loseZ) z.x -= z.sp * dt;
      updateShots(dt);
      if (M.endT > 0 && (M.endT -= dt) <= 0 && !M.sim) showEndCard();
    }
    updateMowers(dt);
    M.zs = M.zs.filter(z => !(z.dead > 1.2) && !(z.fly && z.fly.life <= 0));
  }

  // ================================================================
  // Layout & drawing
  // ================================================================
  function layout() {
    const r = root.getBoundingClientRect();
    if (r.width < 10 || r.height < 10 || !hudEl) return false;
    DPR = Math.min(3, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    const hudB = hudEl.offsetTop + hudEl.offsetHeight + 2, trayT = trayEl.offsetTop - 2;
    // the zoom: as big as fits (a whole number of screen pixels per art pixel), the lawn's columns across the width
    const needW = 30 + COLS * 21, needH = SV.rows * 21 + 16;
    const zw = Math.floor(W / needW * DPR) / DPR, zh = Math.floor(Math.max(40, trayT - hudB) / needH * DPR) / DPR;
    Z = Math.max(1 / DPR, Math.min(zw, zh, 6));
    L.ww = Math.ceil(W / Z); L.wh = Math.ceil(H / Z);
    L.cellW = clamp(Math.floor((L.ww - 18 - 12) / COLS), 20, 28);
    L.gx0 = 18 + Math.floor(Math.max(0, L.ww - 30 - COLS * L.cellW) * 0.3);
    const top = hudB / Z + 14, bot = trayT / Z - 2;
    L.topW = hudB / Z;
    L.laneH = clamp(Math.floor((bot - top) / SV.rows), 20, 30);
    L.gy0 = Math.round(Math.max(top, bot - SV.rows * L.laneH));
    L.pathW = 10;
    buf.width = L.ww * K; buf.height = L.wh * K;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    if (M) {
      // keep everything in its row and column on the new lawn
      for (const u of M.units) { u.x = colX(u.c); u.y = laneY(u.r); }
      for (const z of M.zs) z.y = laneY(z.lane);
    }
    bgKey = '';
    return true;
  }
  function checkSize() {
    if (!root || !hudEl) return;
    const key = root.clientWidth + 'x' + root.clientHeight + ':' + hudEl.offsetHeight + ':' + trayEl.offsetTop + ':' + (window.devicePixelRatio || 1);
    if (key !== sizeKey || !L.ww) { sizeKey = key; layout(); }
  }

  // ---- the painted lawn: sky, hills, the back fence, the checkered rows, a stone path down the left, the sidewalk on the right ----
  function paintBg() {
    const th = M.th, w = L.ww, h = L.wh;
    const key = M.map.id + w + 'x' + h + ':' + L.gy0 + ':' + L.cellW + ':' + L.laneH + ':' + M.lanes.join('');
    if (key === bgKey) return; bgKey = key;
    bgC.width = w; bgC.height = h; fenceC.width = w; fenceC.height = h;
    const img = bgx.createImageData(w, h), P = new Uint32Array(img.data.buffer);
    const R = (x, y, rw, rh, c) => { const v = typeof c === 'number' ? c : u32(c); for (let yy = Math.max(0, Math.round(y)); yy < Math.min(h, Math.round(y + rh)); yy++) for (let xx = Math.max(0, Math.round(x)); xx < Math.min(w, Math.round(x + rw)); xx++) P[yy * w + xx] = v; };
    const gy0 = L.gy0, gy1 = gy0 + SV.rows * L.laneH, gx0 = L.gx0, gx1 = gridX1(), seed = D.SURVIVAL.indexOf(M.map) * 97 + 11;
    // the horizon sits well above the lawn, so the back yard (hills, trees, the house) fills the space under the top bar
    const hz = Math.round(clamp(gy0 - clamp((gy0 - L.topW) * 0.5, 60, 120), L.topW + 18, gy0 - 26));
    // sky: four bands, dithered into each other
    const S = (th.sky || FALLBACK_TH.sky).map(u32);
    for (let y = 0; y < Math.min(h, hz + 10); y++) { const k = clamp(y / Math.max(1, hz), 0, 0.999) * 3, i = Math.floor(k), f = k - i; for (let x = 0; x < w; x++) P[y * w + x] = bayer(x, y) < f ? S[Math.min(3, i + 1)] : S[i]; }
    // the sun (or the moon on a night map), softly glowing
    {
      const night = M.theme === 'night' || !!th.bigMoon, cx = Math.round(w * 0.8), cy = Math.round(clamp(hz * 0.42, L.topW + 14, hz - 16)), R0 = night ? 9 : 8;
      const core = night ? ['#fffbe6', '#f4ecc8', '#d9cfa0'] : ['#fffbe0', '#fff27a', '#f6c83a'], halo = u32(mix((th.sky || FALLBACK_TH.sky)[1], '#ffffff', night ? 0.18 : 0.4));
      for (let y = -R0 - 6; y <= R0 + 6; y++) for (let x = -R0 - 6; x <= R0 + 6; x++) {
        const d = Math.hypot(x, y), X = cx + x, Y = cy + y; if (X < 0 || X >= w || Y < 0 || Y >= h) continue;
        if (d <= R0) P[Y * w + X] = u32(d > R0 - 1.2 ? core[2] : (night && hash2(x, y, seed) > 0.9) ? core[2] : (x + y < -R0 * 0.6 ? core[0] : core[1]));
        else if (d <= R0 + 5 && bayer(X, Y) < (R0 + 5 - d) / 6) P[Y * w + X] = halo;
      }
    }
    // a few soft clouds
    const C = th.cloud || FALLBACK_TH.cloud;
    for (let i = 0; i < 3; i++) {
      const cx = Math.round(w * (0.2 + 0.32 * i + hash2(i, 1, seed) * 0.1)), cy = Math.round(Math.max(8, hz * (0.25 + 0.4 * hash2(i, 2, seed))));
      for (const [dx, dy, rr] of [[-7, 1, 4], [0, -1, 6], [7, 1, 4.5], [3, 2, 4]]) for (let y = -rr; y <= rr; y++) for (let x = -rr * 1.4; x <= rr * 1.4; x++) {
        if ((x / 1.4) * (x / 1.4) + y * y > rr * rr) continue;
        const X = cx + dx + Math.round(x), Y = cy + dy + y; if (X < 0 || X >= w || Y < 0 || Y >= hz) continue;
        P[Y * w + X] = u32(y > rr * 0.35 ? C[1] : C[0]);
      }
    }
    // far and near hills, then the back yard behind the fence
    const hill = (base, amp, f, ph, fill, edge) => {
      const fu = u32(fill), eu = u32(edge), lu = u32(mix(fill, '#ffffff', 0.14));
      for (let x = 0; x < w; x++) {
        const tp = Math.round(base - Math.sin(x * f + ph) * amp - Math.sin(x * f * 2.3 + ph * 2) * amp * 0.4);
        if (tp >= 0 && tp < h) P[tp * w + x] = eu;
        for (let y = Math.max(0, tp + 1); y < gy0 && y < h; y++) P[y * w + x] = y - tp === 1 || (y - tp === 2 && ((x + y) & 1)) ? lu : fu;
      }
    };
    const far = th.far || FALLBACK_TH.far, near = th.near || FALLBACK_TH.near, lawn = th.lawn || FALLBACK_TH.lawn, grass = th.grass || FALLBACK_TH.grass;
    // far mountains (peaks, spires or pyramids, in the map's colours)
    if (th.mount) {
      const Mt = th.mount, amp = Math.min(th.mountAmp || 18, Math.max(8, hz - L.topW - 4)), base = hz - 2, sh = th.mountShape;
      const tri = v => 1 - 2 * Math.abs(v - Math.floor(v) - 0.5);
      const hgt = i => sh === 'pyramid' ? Math.max(0, 1 - Math.abs(((i / 58 + 0.2) % 1) - 0.5) * 2.7) : sh === 'spire' ? 0.62 * Math.pow(tri(i / 44 + 0.3), 1.7) + 0.38 * Math.pow(tri(i / 17 + 0.1), 2.2) : 0.66 * Math.pow(tri(i / 74 + 0.15), 1.3) + 0.34 * Math.pow(tri(i / 31 + 0.55), 1.5);
      for (let i = 0; i < w; i++) {
        const tp = Math.round(base - amp * hgt(i)), sl = hgt(i - 1) - hgt(i + 1);
        if (sh === 'pyramid' && tp >= base - 1) continue;
        for (let y = Math.max(0, tp); y < hz + 6 && y < h; y++) {
          let c = sl < -0.01 ? Mt[2] : sl > 0.01 ? Mt[0] : Mt[1];
          if (th.snow && y - tp < 3 && sh !== 'pyramid' && tp < base - amp * 0.55) c = th.snow;
          P[y * w + i] = u32(c);
        }
      }
    }
    hill(hz - 3, 5, 0.05, 1 + seed, far[0], far[1]);
    hill(hz + 7, 3, 0.08, 3 + seed, near[0], near[1]);
    const G = grass.map(u32), dots = (th.dots || ['#ffffff', '#fbf236', '#f7b6c8']).map(u32), hedge = u32(mix(lawn[1], INK, 0.12));
    for (let y = hz + 12; y < gy0; y++) for (let x = 0; x < w; x++) {
      let c = G[bayer(x, y) < vnoise(x * 0.2, y * 0.2, seed) * 0.8 ? 1 : 2];
      if (y >= gy0 - 4) c = (x + y) & 1 && y === gy0 - 4 ? G[3] : hedge;
      else if (hash2(x, y, seed + 3) > 0.985) c = dots[Math.floor(hash2(y, x, seed) * dots.length)];
      else if (hash2(x, y, seed + 5) > 0.95) c = G[3];
      P[y * w + x] = c;
    }
    // the rows: light and dark squares (deck planks on the pirate ship); a row zombies don't use is bare dirt
    const TL = (th.tiles || grass).map(u32), DIRT = ['#d2a878', '#c09464', '#ae8456', '#9c7448'].map(u32);
    const seamU = th.planks ? u32(mix(th.tiles[3], INK, 0.4)) : 0, nailU = th.planks ? u32('#5a3a22') : 0;
    for (let r = 0; r < SV.rows; r++) {
      const on = M.lanes.includes(r), y0 = gy0 + r * L.laneH;
      for (let y = y0; y < y0 + L.laneH && y < h; y++) for (let x = gx0; x < gx1 && x < w; x++) {
        const c = Math.floor((x - gx0) / L.cellW), ly = y - y0, dark = ((r + c) & 1) === 1, v = vnoise(x * 0.14, y * 0.16, seed) * 0.85 + 0.05;
        let col;
        if (!on) col = DIRT[(dark ? 1 : 0) + (bayer(x, y) < v ? 1 : 0) + (hash2(x, y, seed) > 0.97 ? 1 : 0)];
        else {
          col = TL[(dark ? 2 : 0) + (bayer(x, y) < v ? 1 : 0)];
          if (th.planks) { const row = Math.floor(ly / 4), lx = (x - gx0 + (row % 3) * 6 + 64) % (L.cellW * 2); if (ly % 4 === 3 || lx === 0) col = seamU; else if (lx === 2 && ly % 4 === 1) col = nailU; }
          else if (ly === 0 && ((x + y) & 1)) col = TL[dark ? 3 : 1];
        }
        P[y * w + x] = col;
      }
      // soft markers on the plant spots
      if (on) for (let c = 0; c < COLS; c++) {
        const cx = colX(c), cy = laneY(r) + 1, dark = ((r + c) & 1) === 1, base = th.tiles ? th.tiles[dark ? 2 : 0] : grass[1];
        const lite = u32(mix(base, '#ffffff', 0.22)), rim = u32(mix(base, INK, 0.12));
        for (let y = -3; y <= 3; y++) for (let x = -8; x <= 8; x++) {
          const d = (x / 7.5) * (x / 7.5) + (y / 2.6) * (y / 2.6), X = Math.round(cx + x), Y = cy + y;
          if (X < 0 || X >= w || Y < 0 || Y >= h) continue;
          if (d <= 1 && (d < 0.55 || ((X + Y) & 1))) P[Y * w + X] = d > 0.75 && y > 0 ? rim : lite;
        }
      }
    }
    // left: the stone path from the house past the mowers; right: the sidewalk the zombies come up; below: a hedge line
    const F = th.facade || FALLBACK_TH.facade, stone = F.kind === 'cabin' ? [th.tiles[1], th.tiles[3]] : F.kind === 'temple' ? ['#f8ecc8', '#c8a868'] : ['#d6d6de', '#a4a4b4'];
    const slab = (x, y, sw, sh) => { R(x, y, sw, sh, INK); R(x + 1, y + 1, sw - 2, sh - 2, stone[0]); R(x + 1, y + sh - 2, sw - 2, 1, stone[1]); R(x + sw - 2, y + 1, 1, sh - 2, stone[1]); };
    for (let y = gy0 - 4, k = 0; y < h; y += 9, k++) { slab(0, y, L.pathW - 1, 9); if (k % 2) slab(-4, y, 7, 9); }
    R(L.pathW - 1, gy0, gx0 - L.pathW + 1, h - gy0, lawn[1]);
    for (let y = gy0; y < h; y++) for (let x = L.pathW - 1; x < gx0; x++) if (bayer(x, y) < 0.3) P[y * w + x] = G[3];
    R(gx1, gy0 - 2, w - gx1, h - gy0 + 2, lawn[1]);
    for (let y = gy0 - 4, k = 0; y < h; y += 9, k++) for (let x = gx1 + 3 + (k % 2) * 4; x < w + 9; x += 9) slab(x, y, 9, 9);
    R(gx0, gy1, gx1 - gx0, h - gy1, lawn[1]);
    for (let y = gy1; y < h; y++) for (let x = gx0; x < gx1; x++) if (bayer(x, y) < 0.45) P[y * w + x] = G[3];
    R(gx0, gy1, gx1 - gx0, 1, mix(lawn[1], INK, 0.3));
    R(gx0 - 1, gy0, 1, gy1 - gy0, mix(lawn[1], INK, 0.25));
    R(gx1, gy0, 1, gy1 - gy0, mix(lawn[1], INK, 0.25));
    bgx.putImageData(img, 0, 0);
    paintFence(th, w, h, gy0);
  }
  // the back fence (drawn over the props behind it)
  function paintFence(th, w, h, gy0) {
    fcx.clearRect(0, 0, w, h);
    const R = (x, y, rw, rh, c) => { fcx.fillStyle = c; fcx.fillRect(Math.round(x), Math.round(y), Math.round(rw), Math.round(rh)); };
    const fx0 = 56, fx1 = w, fy = gy0 - 1, len = fx1 - fx0;
    if (th.fence === 'iron') {
      R(fx0, fy + 1, len, 1, 'rgba(10,8,30,0.3)');
      for (const ry of [fy - 7, fy - 2]) R(fx0, ry, len, 1, '#2a2a40');
      for (let x = fx0 + 1; x < fx1; x += 3) { R(x, fy - 9, 1, 10, '#3e3e58'); R(x, fy - 11, 1, 2, '#8a8aaa'); }
      for (let x = fx0 + 2; x < fx1; x += 24) { R(x - 1, fy - 12, 3, 13, '#2a2a40'); R(x - 1, fy - 13, 3, 1, '#8a8aaa'); R(x, fy - 12, 1, 12, '#5a5a78'); }
    } else if (th.fence === 'rail') {
      R(fx0, fy + 1, len, 1, 'rgba(34,32,52,0.2)');
      for (let x = fx0 + 2; x < fx1; x += 10) { R(x - 1, fy - 8, 4, 9, INK); R(x, fy - 8, 2, 9, '#7a5030'); R(x, fy - 8, 1, 9, '#9c6a3c'); }
      R(fx0, fy - 10, len, 3, INK); R(fx0, fy - 9, len, 1, '#b07c46');
    } else if (th.fence === 'stone') {
      R(fx0, fy - 6, len, 8, INK); R(fx0, fy - 5, len, 6, '#e8cc88'); R(fx0, fy - 5, len, 1, '#fbecc4'); R(fx0, fy - 2, len, 1, '#c8a868'); R(fx0, fy + 2, len, 1, 'rgba(34,32,52,0.2)');
      for (let x = fx0 + 3; x < fx1; x += 7) { R(x, fy - 4, 1, 2, '#c8a868'); R(x + 3, fy - 1, 1, 2, '#c8a868'); }
    } else {
      R(fx0, fy + 1, len, 1, 'rgba(34,32,52,0.2)');
      for (const ry of [fy - 6, fy - 2]) { R(fx0, ry, len, 1, '#e4dcc8'); R(fx0, ry + 1, len, 1, '#b8ae98'); }
      for (let x = fx0 + 1; x < fx1 - 2; x += 5) { R(x - 1, fy - 8, 5, 9, INK); R(x, fy - 9, 3, 1, INK); R(x + 1, fy - 10, 1, 1, INK); R(x, fy - 8, 3, 8, '#fdfaf2'); R(x + 1, fy - 9, 1, 1, '#fdfaf2'); R(x + 2, fy - 7, 1, 7, '#d8d0bc'); }
    }
  }
  // the map's own props stand in the back yard, behind the fence
  // (a tree and three props in a row behind the fence; where exactly is worked out as it's drawn)
  function pickProps() {
    const th = M.th, kinds = (th.props || []).map(p => p[0]).filter(k => k !== 'gumball' && k !== 'flowerpot_bloom' && k !== 'pyramid'), out = [], seen = new Set();
    for (const k of kinds) { if (seen.has(k)) continue; seen.add(k); out.push(k); if (out.length >= 3) break; }
    const slots = [0.08, 0.36, 0.64, 0.94];
    M.props = out.map((k, i) => ({ kind: k, at: slots[i < 2 ? i : i + 1] }));
    if (th.tree) M.props.push({ kind: th.tree, at: slots[2], tree: true });
  }
  function drawProps() {
    const x0 = 64, x1 = L.ww - 6;
    for (const p of M.props) {
      const c = propSpr(p.kind, M.theme), x = Math.round(x0 + (x1 - x0) * p.at), y = L.gy0 - (p.tree ? 8 : 6);
      if (p.tree) shadow(x, y, Math.round(PX.artW(c) * 0.5));
      PX.blit(bx, c, x, y);
    }
  }

  // ---- drawing helpers (world px, buffer at SCENE_K) ----
  function shadow(x, y, w) { const X = Math.round(x - w / 2), Y = Math.round(y); bx.fillStyle = 'rgba(34,32,52,.2)'; bx.fillRect(X + 1, Y - 2, w - 2, 1); bx.fillRect(X, Y - 1, w, 2); bx.fillRect(X + 1, Y + 1, w - 2, 1); }
  function bar(x, y, w, k, col) { const X = Math.round(x - w / 2), Y = Math.round(y); bx.fillStyle = INK; bx.fillRect(X - 1, Y - 1, w + 2, 4); bx.fillStyle = '#fbf6e8'; bx.fillRect(X, Y, w, 2); bx.fillStyle = k > 0.5 ? col : k > 0.25 ? '#f6c83a' : '#e5535f'; bx.fillRect(X, Y, Math.max(1, Math.round(w * k)), 2); }
  function ring(x, y, rx, ry, col) { bx.fillStyle = col; for (let a = 0; a < 6.283; a += 0.12) bx.fillRect(Math.round(x + Math.cos(a) * rx), Math.round(y + Math.sin(a) * ry), 1, 1); }
  const fxAt = (c, x, y) => bx.drawImage(c, x, y, PX.artW(c), PX.artH(c));
  const headY = u => u.y - HEAD[u.s.stage | 0];
  function emote(u, e, dur) { u.emote = e; u.emoteT = dur || 1.4; }
  function puff(x, y, type, n, color) {
    if (!M || M.sim) return;
    for (let i = 0; i < n; i++) { const a = rand(0, Math.PI * 2), sp = rand(10, 38); M.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 16, life: rand(0.6, 1.1), type, color, grav: true }); }
  }
  function heartUp(x, y) { if (M && !M.sim) M.parts.push({ x: x + rand(-3, 3), y, vx: rand(-3, 3), vy: -16, life: 1.1, type: 'heart' }); }
  function floater(text, color, x, y) { if (M && !M.sim) M.floaters.push({ text, color: color || '#5b4630', x, y, life: 1.5 }); }
  function lookOf(u) { if (!u.look || t > u.lookT) { try { u.look = ST.lookOf(u.s); } catch (e) { u.look = { species: 'peashooter', stage: 0 }; } u.lookT = t + 1.2; } return u.look; }
  function pose(u) {
    const S = { frame: 0, mouth: 'smile' };
    if (u.blinkT < 0) S.eyes = 'blink';
    if (u.cheerT > 0) { S.arms = 'up'; S.eyes = 'happy'; S.mouth = 'open'; }
    if (u.hitT > 0) S.mouth = 'o';
    if (u.dead) { S.eyes = 'closed'; S.mouth = 'o'; delete S.arms; }
    return S;
  }
  function drawUnit(u, ghost) {
    const look = lookOf(u), c = PX.sprig(look, ghost ? {} : pose(u)), flip = u.face < 0;
    if (ghost) { bx.save(); bx.globalAlpha = 0.45; PX.blit(bx, c, u.gx, u.gy, false, PX.SPRIG_AX, PX.SPRIG_AY); bx.restore(); return; }
    if (u.lift) { bx.save(); bx.globalAlpha = 0.25; PX.blit(bx, c, u.x, u.y, flip, PX.SPRIG_AX, PX.SPRIG_AY); bx.restore(); return; }
    const hopY = u.hopT > 0 ? Math.round(Math.sin((1 - u.hopT / 0.35) * Math.PI) * 4) : 0;
    const breathe = !hopY && !u.dead && Math.floor(t * 1.4 + u.ph) % 2 ? 1 : 0;
    const lx = (u.lungeT > 0 ? u.face * 5 * Math.sin(Math.PI * (1 - u.lungeT / 0.3)) : 0) - (u.kickT > 0 ? u.face * 1.5 : 0);
    // (bitten: a 1px shiver and a white flash)
    const shake = u.hitT > 0 ? (Math.floor(u.hitT * 40) % 2 ? 1 : -1) : 0;
    shadow(u.x, u.y, 13);
    const X = u.x + Math.round(lx) + shake, Y = u.y - hopY - breathe;
    if (u.dead) { // wobbles, dizzy, then pops off to rest
      const k = clamp(u.dead / 0.9, 0, 1);
      bx.save(); bx.globalAlpha = k > 0.75 ? 1 - (k - 0.75) * 4 : 1; bx.translate(Math.round(u.x), Math.round(u.y)); bx.rotate(Math.sin(u.dead * 14) * 0.12);
      PX.blit(bx, c, 0, 0, flip, PX.SPRIG_AX, PX.SPRIG_AY); bx.restore(); return;
    }
    PX.blit(bx, c, X, Y, flip, PX.SPRIG_AX, PX.SPRIG_AY);
    if (u.hitT > 0) { bx.save(); bx.globalAlpha = 0.4; bx.globalCompositeOperation = 'lighter'; PX.blit(bx, c, X, Y, flip, PX.SPRIG_AX, PX.SPRIG_AY); bx.restore(); }
  }
  function drawZombie(z) {
    const f = Math.floor(t * (z.slowT > 0 ? 1.5 : 3) + z.ph) % 2;
    let c = z.boss ? bossSpr(z.boss, f) : zSpr(z.look || { zombie: 'basic' }, f, z.chomp > 0);
    if (z.slowT > 0) c = icy(c);
    const h = PX.artH(c), flip = true; // (zombie art faces right; they walk left)
    if (z.fly) {
      bx.save(); bx.globalAlpha = clamp(1 - z.fly.h / 260, 0, 1); bx.translate(Math.round(z.x), Math.round(z.y - z.fly.h - h / 2)); bx.rotate(z.fly.a);
      bx.drawImage(c, -PX.artW(c) / 2, -h / 2, PX.artW(c), h); bx.restore(); return;
    }
    if (z.dead) { // tips over backwards, then fades away
      const k = clamp(z.dead / 0.28, 0, 1), fa = clamp(1 - (z.dead - 0.35) / 0.4, 0, 1); if (fa <= 0) return;
      shadow(z.x, z.y, z.boss ? 26 : 11);
      bx.save(); bx.globalAlpha = fa; bx.translate(Math.round(z.x), Math.round(z.y)); bx.rotate(k * k * 1.45);
      bx.scale(-1, 1); bx.drawImage(c, -PX.artW(c) / 2, -h, PX.artW(c), h); bx.restore(); return;
    }
    const lean = (z.kb > 0 ? 2.2 * (z.kb / 0.2) : 0) - (z.chomp > 0 ? 1.5 : 0); // knocked back / leaning in to bite
    shadow(z.x, z.y, z.boss ? 26 : 11);
    PX.blit(bx, c, z.x + lean, z.y, flip);
    if (z.hitT > 0) { bx.save(); bx.globalAlpha = 0.55; bx.globalCompositeOperation = 'lighter'; PX.blit(bx, c, z.x + lean, z.y, flip); bx.restore(); }
    if (z.slowT > 0 && Math.floor(t * 4 + z.ph) % 3 === 0) { bx.fillStyle = '#e8f8ff'; bx.fillRect(Math.round(z.x + rand(-5, 5)), Math.round(z.y - rand(6, 22)), 1, 1); }
  }
  function drawShots() {
    for (const sh of M.shots) {
      const X = Math.round(sh.x), Y = Math.round(sh.y);
      if (sh.kind === 'zap') { bx.fillStyle = '#fff6a0'; const n = 6; for (let i = 0; i <= n; i++) { const k = i / n; bx.fillRect(Math.round(lerp(sh.x0, sh.tg.x, k)) + (i % 2 ? 1 : -1), Math.round(lerp(sh.y0, sh.tg.y - 12, k)), 2, 2); } continue; }
      if (sh.t < 0) continue;
      if (sh.kind === 'beam') { bx.fillStyle = 'rgba(255,240,250,.85)'; const n = 10; for (let i = 0; i <= n; i++) { const k = i / n; bx.fillRect(Math.round(lerp(sh.x0, sh.tg.x, k)), Math.round(lerp(sh.y0, sh.tg.y - 12, k)) - 1, 2, 3); } bx.fillStyle = sh.col; for (let i = 0; i <= n; i++) { const k = i / n; bx.fillRect(Math.round(lerp(sh.x0, sh.tg.x, k)), Math.round(lerp(sh.y0, sh.tg.y - 12, k)), 2, 1); } continue; }
      if (sh.spr) { // the battle's own little sprite (pea, cabbage, star...), spinning if it's lobbed
        const w = PX.artW(sh.spr), h = PX.artH(sh.spr);
        if (sh.kind === 'lob') shadow(X, Math.round(lerp(sh.y0 + 14, sh.tg.y, Math.min(1, sh.t / sh.dur))), 6);
        bx.save(); bx.translate(X, Y); if (sh.spin) bx.rotate(Math.floor(sh.t * 16) * Math.PI / 2); else if (sh.tg.x < sh.x0) bx.scale(-1, 1);
        bx.drawImage(sh.spr, -w / 2, -h / 2, w, h); bx.restore(); continue;
      }
      const rr = sh.kind === 'lob' ? 3 : sh.kind === 'puff' ? 2.5 : 2;
      bx.fillStyle = INK; bx.beginPath(); bx.arc(X, Y, rr + 1, 0, 6.283); bx.fill();
      bx.fillStyle = sh.kind === 'puff' ? '#e6c8ff' : sh.col; bx.beginPath(); bx.arc(X, Y, rr, 0, 6.283); bx.fill();
      bx.fillStyle = '#ffffff'; bx.fillRect(X - 1, Y - 1, 1, 1);
    }
  }
  function drawParticles(dt) {
    for (const p of M.parts) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.grav) p.vy += (p.type === 'confetti' ? 30 : 70) * dt;
      if (p.life < 0.25 && Math.floor(t * 20) % 2) continue;
      const X = Math.round(p.x), Y = Math.round(p.y);
      try {
        if (p.type === 'heart') fxAt(PX.fx('heart'), X - 3, Y - 3);
        else if (p.type === 'spark') fxAt(PX.fx('spark', p.color), X - 1, Y - 1);
        else if (p.type === 'confetti') { p.vx = Math.sin(t * 5 + p.y * 0.2) * 10; bx.fillStyle = p.color; if (Math.floor(t * 8 + p.x) % 2) bx.fillRect(X, Y, 2, 1); else bx.fillRect(X, Y, 1, 2); }
        else { bx.fillStyle = p.color; bx.fillRect(X, Y, 1, 1); }
      } catch (e) { p.life = 0; }
    }
    M.parts = M.parts.filter(p => p.life > 0);
  }
  function render(dt) {
    if (!M || !L.ww) return;
    const th = M.th;
    paintBg();
    bx.setTransform(K, 0, 0, K, 0, 0); bx.imageSmoothingEnabled = false;
    bx.drawImage(bgC, 0, 0);
    drawProps();
    bx.drawImage(fenceC, 0, 0);
    PX.blit(bx, houseSpr(th.facade || FALLBACK_TH.facade), 22, L.gy0 + 3);
    // mowers waiting at the end of each row (and the ones out on a run)
    const mc = propSpr(th.mower || 'lawnmower', M.theme);
    for (const m of M.mowers) {
      if (m.st === 'ready') PX.blit(bx, mc, L.gx0 - 7, laneY(m.lane) + 1);
      else if (m.st === 'go') PX.blit(bx, mc, m.x, laneY(m.lane) + 1 + Math.round(Math.sin(t * 40)));
    }
    // while carrying a plant: the free spots glow, and the plant shows faintly where it will land
    if (drag && drag.src !== 'fruit') {
      bx.fillStyle = 'rgba(255,255,255,0.22)';
      for (const r of M.lanes) for (let c = 0; c < COLS; c++) if (!unitAtSpot(r, c)) { const x = Math.round(colX(c)), y = laneY(r) + 1; bx.fillRect(x - 6, y - 2, 13, 4); bx.fillRect(x - 4, y - 3, 9, 6); }
      if (drag.hover) ring(colX(drag.hover.c), laneY(drag.hover.r) + 1, 9 + Math.sin(t * 8) * 0.6, 3.6, drag.hoverOk ? '#fff27a' : '#e5535f');
    }
    if (M.sel && !M.sel.dead && M.phase === 'fight') ring(M.sel.x, M.sel.y + 1, 10 + Math.sin(t * 6), 4, '#fff27a');
    // everything stands in front of whatever is above it
    const list = [];
    for (const u of M.units) list.push({ y: u.y, x: u.x, fn: () => drawUnit(u) });
    for (const z of M.zs) list.push({ y: z.y + 0.1, x: z.x, fn: () => drawZombie(z) });
    list.sort((a, b) => a.y - b.y || a.x - b.x).forEach(o => o.fn());
    if (drag && drag.hover && drag.hoverOk && drag.s) { const g = { s: drag.s, gx: colX(drag.hover.c), gy: laneY(drag.hover.r), look: null, lookT: 0 }; drawUnit(g, true); }
    // night maps (and night time) get a gentle tint
    const na = (th.dim || 0) + ((th.night ? th.night[3] : 0.3) - (th.dim || 0) * 0.5) * (PS.clock && PS.clock.night ? PS.clock.night() : 0) * 0.6;
    if (na > 0.01) { const [cr, cg, cb] = th.night || [20, 18, 64]; bx.fillStyle = `rgba(${cr},${cg},${cb},${na})`; bx.fillRect(0, 0, L.ww, L.wh); }
    drawShots();
    // health bars, dizzy stars, the chosen target, emotes
    for (const u of M.units) {
      if (u.lift) continue;
      if (u.dead) { const hy = headY(u) - 4; for (let i = 0; i < 3; i++) { const a = t * 7 + i * 2.1; bx.fillStyle = i % 2 ? '#fff6a8' : '#ffd84a'; bx.fillRect(Math.round(u.x + Math.cos(a) * 6), Math.round(hy + Math.sin(a) * 2), 2, 2); } continue; }
      if (u.hp < u.max) bar(u.x, headY(u) - 6, 14, u.hp / u.max, '#7ad070');
      if (u.emote) PX.blit(bx, PX.emote(u.emote), u.x + 3, headY(u) - (u.hp < u.max ? 7 : 1), false, 2, 13);
    }
    for (const z of M.zs) if (!z.dead && !z.fly && z.x < L.ww) bar(z.x, z.y - (z.boss ? 52 : 33), z.boss ? 28 : 14, z.hp / z.max, '#e88a5a');
    if (M.sel && M.sel.pick && !M.sel.pick.dead && !M.sel.pick.fly) { const z = M.sel.pick; PX.blit(bx, arrowSprite(), z.x, z.y - (z.boss ? 56 : 37) - (Math.floor(t * 4) % 2)); }
    drawParticles(dt);
    if (M.flash > 0) { bx.fillStyle = `rgba(255,255,255,${M.flash * 2})`; bx.fillRect(0, 0, L.ww, L.wh); }

    // present, then crisp numbers at screen resolution
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = (th.lawn || FALLBACK_TH.lawn)[1]; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(buf, 0, 0, L.ww * Z * DPR, L.wh * Z * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.font = '800 15px "Nunito", sans-serif';
    const topY = hudEl.offsetTop + hudEl.offsetHeight + 14;
    for (const f of M.floaters) {
      f.life -= dt; f.y -= 10 * dt;
      if (f.life < 0.3 && Math.floor(t * 20) % 2) continue;
      const X = Math.round(clamp(f.x * Z, 24, W - 24)), Y = Math.round(clamp(f.y * Z, topY, H - 20));
      ctx.lineWidth = 4; ctx.strokeStyle = '#fff8e6'; ctx.strokeText(f.text, X, Y); ctx.fillStyle = f.color; ctx.fillText(f.text, X, Y);
    }
    M.floaters = M.floaters.filter(f => f.life > 0);
  }

  // ================================================================
  // Screen: the map picker
  // ================================================================
  const chev = d => `<svg viewBox="0 0 9 9" width="18" height="18" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true"><path d="${d < 0 ? 'M6 1h1v1H6v1H5v1H4v1h1v1h1v1h1v1H6V7H5V6H4V5H3V4h1V3h1V2h1z' : 'M2 1h1v1h1v1h1v1h1v1H5v1H4v1H3v1H2V7h1V6h1V5h1V4H4V3H3V2H2z'}"/></svg>`;
  function renderHub() {
    const P = progress(), innerW = Math.max(180, Math.min(560, (hubEl.clientWidth || 360) - 24 - 28 - 4));
    const card = m => {
      const pl = D.PLANTS[m.reward], p = P[m.id] || {}, open = mapOpen(m), won = (p.wins || 0) > 0, lockName = (D.SURVIVAL.find(x => x.id === m.unlock) || {}).name || '';
      return `<section class="panel sv-map${open ? '' : ' locked'}">
        <canvas class="sv-prev" data-prev="${m.id}" data-nosnap aria-hidden="true"></canvas>
        <div class="sv-mrow">
          <div class="sv-minfo"><b class="px-title sv-mname">${esc(m.name)}</b><small>${m.waves} waves · ${m.cap} plants${m.boss ? ' · Zombosses!' : ''}</small></div>
          <div class="sv-prize${won ? ' won' : ''}"><canvas class="px" width="32" height="32" data-prize="${m.reward}"></canvas><span><small>${won ? 'Won!' : 'Legendary prize'}</small><b>${pl ? esc(pl.name) : '???'}</b></span></div>
        </div>
        <div class="sv-mfoot">${open
          ? `<span>${won ? `Won ${p.wins} time${p.wins === 1 ? '' : 's'}${p.best ? ' · Best ' + fmtTime(p.best) : ''}` : 'Not won yet'}</span><button class="btn go" type="button" data-play="${m.id}">Play</button>`
          : `<span class="sv-lock"><canvas class="px" data-lock></canvas>Win ${esc(lockName)} to open</span>`}</div>
      </section>`;
    };
    const have = PS.S.sprouts.length;
    hubEl.innerHTML = `<div class="sv-top"><button class="sv-back" type="button" aria-label="Back to Battle">${chev(-1)}</button><h1 class="px-title">Survival</h1></div>
      <p class="sv-intro">Defend the lawn with the plants you've raised! Drag them onto the grass, heal them with fruit, and beat every wave to win a <b>legendary plant</b>.</p>
      ${have ? '' : '<div class="panel sv-empty"><p>Grow a plant in the Garden first, then come back to defend the lawn.</p></div>'}
      ${D.SURVIVAL.map(card).join('')}`;
    hubEl.querySelector('.sv-back').onclick = () => { snd('tick'); PS.ui.go('battle'); };
    hubEl.querySelectorAll('[data-play]').forEach(b => { b.onclick = () => { PX.Sound.unlock(); snd('pop'); startMatch(b.dataset.play); }; });
    hubEl.querySelectorAll('canvas[data-prize]').forEach(c => { try { PS.ui.drawSproutTo(c, { species: c.dataset.prize, stage: 0 }, { eyes: 'happy' }); } catch (e) { /* art still coming */ } });
    hubEl.querySelectorAll('canvas[data-lock]').forEach(c => { try { const s = lockIcon(); PS.ui.fitCanvas(c, s); PS.ui.paint(c, s); } catch (e) { /* optional */ } });
    hubEl.querySelectorAll('canvas[data-prev]').forEach(c => { try { paintPreview(c, D.SURVIVAL.find(m => m.id === c.dataset.prev), Math.floor(innerW / 2)); } catch (e) { console.error(e); } });
  }
  // a little picture of the lawn: its sky and house, the checkered rows, some of its zombies (art px, drawn 2x)
  function paintPreview(c, map, aw) {
    const ah = 50, { th, theme } = themeFor(map);
    c.width = aw * 2; c.height = ah * 2; c.style.width = aw * 2 + 'px'; c.style.height = ah * 2 + 'px';
    const x = c.getContext('2d'); x.setTransform(2, 0, 0, 2, 0, 0); x.imageSmoothingEnabled = false;
    const R = (px, py, w, h, col) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
    const sky = th.sky || FALLBACK_TH.sky, lawnTop = 20, tw = 9, lh = 6, gx = 14;
    for (let i = 0; i < 4; i++) R(0, i * 4, aw, 4, sky[i]);
    R(0, 14, aw, 6, (th.far || FALLBACK_TH.far)[0]);
    R(0, 17, aw, 3, (th.near || FALLBACK_TH.near)[0]);
    R(0, lawnTop, aw, ah - lawnTop, (th.lawn || FALLBACK_TH.lawn)[1]);
    const tiles = th.tiles || FALLBACK_TH.tiles;
    for (let r = 0; r < 5; r++) for (let cc = 0; gx + cc * tw < aw - 8; cc++) R(gx + cc * tw, lawnTop + 1 + r * lh, tw, lh, tiles[((r + cc) & 1) ? 2 : 0]);
    R(0, lawnTop, 6, ah - lawnTop, '#c8c8d2');
    R(gx, lawnTop, aw - gx - 8, 1, 'rgba(34,32,52,0.25)');
    const half = (s, px, py, flip) => { const w = PX.artW(s) / 2, h = PX.artH(s) / 2; x.save(); x.translate(Math.round(px), Math.round(py)); if (flip) x.scale(-1, 1); x.drawImage(s, -Math.round(w / 2), -Math.round(h), Math.round(w), Math.round(h)); x.restore(); };
    half(houseSpr(th.facade || FALLBACK_TH.facade), 12, lawnTop + 2);
    for (let px = 34; px < aw; px += 3) R(px, lawnTop - 3, 1, 3, th.fence === 'iron' ? '#3e3e58' : th.fence === 'rail' ? '#9c6a3c' : th.fence === 'stone' ? '#e8cc88' : '#fdfaf2');
    const kinds = (map.pool || ['basic']).slice(0, 3);
    kinds.forEach((k, i) => { const s = zSpr({ zombie: D.ZOMBIES[k] ? k : 'basic' }, 0, false); half(s, aw - 14 - i * 15, lawnTop + 7 + ((i * 2 + 1) % 5) * lh, true); });
    if (map.boss) half(bossSpr(map.boss, 0), aw - 40 - kinds.length * 4, lawnTop + 4 + 4 * lh, true);
  }

  // ================================================================
  // Screen: playing
  // ================================================================
  function startMatch(id) {
    const map = D.SURVIVAL.find(m => m.id === id);
    if (!map || !mapOpen(map)) return;
    if (!PS.S.sprouts.length) { PS.ui.toast('Grow a plant in the Garden first!'); return; }
    if (!engine()) { PS.ui.toast('Battles are still loading. Try again in a moment.'); return; }
    // 7 columns when that makes everything bigger on this screen (phones), otherwise 8
    const rw = root.clientWidth || 375, dpr = Math.min(3, window.devicePixelRatio || 1), zOf = n => Math.floor(rw / (30 + n * 21) * dpr) / dpr;
    COLS = zOf(7) > zOf(8) + 0.01 ? 7 : 8;
    M = newMatch(map, PS.S.sprouts, false);
    pickProps();
    hubEl.hidden = true; playEl.hidden = false; overEl.hidden = true; overEl.innerHTML = '';
    PS.ui.chrome(false); PS.ui.hold(true);
    sizeKey = ''; checkSize();
    renderTray(); updateHud();
    setupBanner();
    snd('go');
  }
  // leave the lawn (after the results, or quitting): back to the map picker with the app's bars and pop-ups
  function endMatch() {
    cancelDrag();
    M = null; banner(null); tip(null);
    if (playEl) { playEl.hidden = true; overEl.hidden = true; overEl.innerHTML = ''; }
    if (hubEl) { hubEl.hidden = false; renderHub(); }
    PS.ui.chrome(true); PS.ui.hold(false);
  }
  function setupBanner() {
    if (!M || M.phase !== 'setup') return;
    const n = M.counting ? Math.max(0, Math.ceil(M.setupT)) : null;
    banner('Get ready! Place your plants', M.units.length ? `Up to ${M.cap} plants. Zombies come from the right!` : 'Drag plants from the tray onto the lawn', n, [
      { label: 'Plant for me', kind: '', fn: () => { const k = autoPlace(); if (!k) tip(M.units.length >= M.cap ? 'The lawn is full!' : 'No plants are free right now.'); renderTray(); setupBanner(); } },
      { label: 'Start!', kind: 'go', fn: () => { if (!M.units.length) { tip('Put a plant on the lawn first!'); snd('miss'); return; } startFight(); } },
    ], 0);
  }
  // the message box under the top bar. buttons: [{label, kind, fn}]; dur: seconds (0 = stays)
  let banSig = '';
  function banner(title, sub, big, buttons, dur, warn) {
    if (!banEl || (M && M.sim)) return;
    if (M) M.banT = dur || 0;
    const sig = [title, sub, big != null, (buttons || []).map(b => b.label).join('|'), warn].join('#');
    if (sig === banSig) { const i = banEl.querySelector('i'); if (i && big != null && i.textContent !== String(big)) i.textContent = big; return; }
    banSig = sig;
    banEl.hidden = !title;
    if (!title) return;
    banEl.classList.toggle('warn', !!warn);
    banEl.style.top = (hudEl.offsetTop + hudEl.offsetHeight + 8) + 'px';
    banEl.innerHTML = `<b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}${big != null ? `<i>${big}</i>` : ''}${buttons && buttons.length ? '<div class="sv-bbtns"></div>' : ''}`;
    const box = banEl.querySelector('.sv-bbtns');
    for (const b of buttons || []) { const el = document.createElement('button'); el.type = 'button'; el.className = 'btn ' + (b.kind || ''); el.textContent = b.label; el.onclick = e => { e.stopPropagation(); PX.Sound.unlock(); snd('pop'); b.fn(); }; box.appendChild(el); }
  }
  // a small note just above the tray (the app's toasts wait while a match is on)
  let tipT = 0;
  function tip(msg, sec) {
    if (!tipEl) return;
    if (!msg) { tipEl.style.opacity = 0; tipT = 0; return; }
    if (M && M.sim) return;
    tipEl.textContent = msg; tipEl.style.opacity = 1; tipT = sec || 2.4;
    tipEl.style.bottom = (H - trayEl.offsetTop + 8) + 'px';
  }
  function updateHud() {
    if (!M) return;
    const n = M.waves.length || M.map.waves, wi = M.phase === 'setup' ? 0 : Math.max(0, M.wi === -1 ? 0 : (M.breakT > 0 ? M.pending : M.wi));
    const label = M.phase === 'setup' ? `${M.map.name}` : `Wave ${Math.min(n, wi + 1)} of ${n}`;
    if (waveEl.textContent !== label) waveEl.textContent = label;
    const k = M.total ? M.resolved / M.total : 0;
    barEl.style.width = Math.round(k * 100) + '%';
    const fk = M.waves.length ? (() => { let acc = 0; return M.waves.map(w => (acc += w.n) / M.total); })() : [];
    const fs = fk.map((x, i) => `${Math.round(x * 1000) / 10}%${M.waves[i].big ? 'b' : ''}`).join(',');
    if (flagsEl.dataset.f !== fs) {
      flagsEl.dataset.f = fs;
      flagsEl.innerHTML = fk.map((x, i) => `<i class="sv-flag${M.waves[i].big ? ' big' : ''}" style="left:${Math.round(x * 1000) / 10}%"></i>`).join('');
    }
    flagsEl.querySelectorAll('.sv-flag').forEach((f, i) => f.classList.toggle('on', k >= fk[i] - 0.001));
    capEl.querySelector('b').textContent = `${M.units.length}/${M.cap}`;
    capEl.classList.toggle('full', M.units.length >= M.cap);
  }

  // ---------------- the tray: your plants and your fruit ----------------
  let cards = new Map();
  function renderTray() {
    if (!M || M.sim) return;
    trayDirty = false; cards = new Map();
    rosterEl.innerHTML = '';
    for (const id of M.order) {
      const s = PS.S.sprouts.find(x => x.id === id); if (!s) continue;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'sv-card'; b.dataset.id = id;
      b.innerHTML = `<canvas class="px" width="32" height="32"></canvas><i class="sv-lv">${ST.totalLevels(s)}</i><b>${esc(s.name)}</b><span class="sv-hp"><i></i></span><em class="sv-ko"></em>`;
      try { PS.ui.drawSproutTo(b.querySelector('canvas'), s); } catch (e) { /* art still coming */ }
      rosterEl.appendChild(b); cards.set(id, { el: b, s, hp: b.querySelector('.sv-hp'), bar: b.querySelector('.sv-hp i'), ko: b.querySelector('.sv-ko'), st: '' });
    }
    renderFruit();
    updateTray();
  }
  function renderFruit() {
    if (!fruitEl) return;
    const fr = Object.entries(PS.S.fruits || {}).filter(([k, n]) => n > 0 && D.FRUITS[k]);
    fruitEl.innerHTML = fr.length ? '' : '<span class="sv-none">No fruit. Pick some from the trees in the Garden.</span>';
    for (const [k, n] of fr) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'sv-fr'; b.dataset.fruit = k; b.setAttribute('aria-label', D.FRUITS[k].name);
      b.innerHTML = `<canvas class="px"></canvas><i class="n">${n}</i>`;
      try { const s = fruitSpr(k), c = b.querySelector('canvas'); PS.ui.fitCanvas(c, s); PS.ui.paint(c, s); } catch (e) { /* optional */ }
      fruitEl.appendChild(b);
    }
  }
  function updateTray() {
    if (!M) return;
    for (const [id, cd] of cards) {
      const s = cd.s, u = unitOf(s), ko = isKO(s), h = u ? { hp: u.hp, max: u.max } : M.hp.get(id);
      const st = ko ? 'ko' : u ? 'on' : '';
      if (st !== cd.st) { cd.st = st; cd.el.classList.toggle('ko', ko); cd.el.classList.toggle('on', !!u && !ko); }
      if (ko) { const left = Math.max(0, Math.ceil(((s.recoverUntil || 0) - nowMs()) / 1000)); const txt = `0:${String(left).padStart(2, '0')}`; if (cd.ko.textContent !== txt) cd.ko.textContent = txt; }
      const showHp = !ko && h && (h.hp < h.max || M.fought.has(id));
      cd.hp.style.visibility = showHp ? 'visible' : 'hidden';
      if (showHp) cd.bar.style.width = Math.round(clamp(h.hp / h.max, 0, 1) * 100) + '%';
      cd.bar.style.background = h && h.hp / h.max < 0.3 ? '#e5535f' : h && h.hp / h.max < 0.6 ? '#f6c83a' : '#7ad070';
    }
  }
  // plants that finished resting can play again (at full health)
  function checkRecovered() {
    for (const s of M.plants) if (s.ko && !isKO(s) && M.hp.has(s.id) && M.hp.get(s.id).hp <= 0) { M.hp.delete(s.id); tip(`${s.name} is rested and ready!`, 2.2); snd('coo'); }
  }

  // ---------------- input ----------------
  function toWorld(cx, cy) { const r = cv.getBoundingClientRect(); return { x: (cx - r.left) / Z, y: (cy - r.top) / Z }; }
  function unitAt(p) {
    let best = null, bd = 1e9;
    for (const u of M.units) { if (u.dead || u.lift) continue; const hy = u.y - 10, d = Math.hypot((p.x - u.x) * 1.1, p.y - hy); if (Math.abs(p.x - u.x) < L.cellW * 0.55 && p.y > u.y - 28 && p.y < u.y + 4 && d < bd) { bd = d; best = u; } }
    return best;
  }
  function zombieAt(p) {
    let b = null, bd = 1e9;
    for (const z of M.zs) { if (z.dead || z.fly) continue; const d = Math.hypot(p.x - z.x, p.y - (z.y - (z.boss ? 22 : 12))); if (d < (z.boss ? 24 : 13) && d < bd) { bd = d; b = z; } }
    return b;
  }
  function cellAt(p) {
    const c = Math.floor((p.x - L.gx0) / L.cellW), r = Math.floor((p.y - L.gy0) / L.laneH);
    if (c < 0 || c >= COLS || r < 0 || r >= SV.rows) return null;
    return { r, c };
  }
  const playable = () => M && !M.paused && (M.phase === 'setup' || M.phase === 'fight');
  function onDown(e) {
    if (!visible || !playable() || (e.button != null && e.button > 0) || drag || press) return;
    PX.Sound.unlock();
    lastPtr.x = e.clientX; lastPtr.y = e.clientY;
    const p = toWorld(e.clientX, e.clientY);
    const z = M.phase === 'fight' ? zombieAt(p) : null;
    if (z && M.sel && !M.sel.dead) { // send the chosen plant after this zombie
      const u = M.sel; u.pick = z; u.tooFar = 0; emote(u, '!', 1); floater('Get it!', '#5b4630', u.x, headY(u) - 6); snd('pop'); buzz(8); return;
    }
    const u = unitAt(p);
    if (u) { press = { u, pid: e.pointerId, sx: e.clientX, sy: e.clientY, timer: setTimeout(() => { if (press && press.u === u) liftUnit(); }, SV.holdMs) }; return; }
    if (z) { tip('Tap one of your plants first, then a zombie'); snd('pop'); return; }
    if (M.sel) { M.sel = null; snd('tick'); }
  }
  function liftUnit() {
    const pr = press; if (!pr) return; clearTimeout(pr.timer); press = null;
    if (!playable() || pr.u.dead) return;
    startDrag('unit', pr.u.s, pr.pid, pr.u);
  }
  function tapUnit(u) {
    M.sel = M.sel === u ? null : u; u.hopT = 0.35;
    emote(u, M.sel ? 'sparkle' : 'note', 0.8); snd(M.sel ? 'coo' : 'tick');
    if (M.sel) { floater(u.s.name, '#3f7a2e', u.x, headY(u) - 10); if (M.phase === 'fight' && !M.tipSel) { M.tipSel = true; tip('Now tap a zombie for it to go after'); } }
  }
  function onMove(e) {
    if (!visible) return;
    const mine = (press && press.pid === e.pointerId) || (drag && drag.pid === e.pointerId) || (trayPress && trayPress.pid === e.pointerId);
    if (!mine) return;
    lastPtr.x = e.clientX; lastPtr.y = e.clientY;
    if (press && press.pid === e.pointerId && Math.hypot(e.clientX - press.sx, e.clientY - press.sy) > 9) liftUnit();
    if (trayPress && trayPress.pid === e.pointerId && !drag) trayPressMove(e);
    if (drag && drag.pid === e.pointerId) moveDrag(e.clientX, e.clientY);
  }
  function onUp(e, cancelled) {
    if (press && press.pid === e.pointerId) { const pr = press; clearTimeout(pr.timer); press = null; if (!cancelled && M && M.units.includes(pr.u)) tapUnit(pr.u); }
    if (trayPress && trayPress.pid === e.pointerId) trayUp(e, cancelled);
    if (drag && drag.pid === e.pointerId) endDrag(e.clientX, e.clientY, cancelled);
  }
  // the tray: a tap explains, a drag up (or a press and hold) picks the plant or fruit up; sideways scrolls the tray
  function onTrayDown(e) {
    if (!visible || !playable() || drag || trayPress || (e.button != null && e.button > 0)) return;
    const el = e.target.closest('.sv-card,.sv-fr'); if (!el) return;
    PX.Sound.unlock();
    lastPtr.x = e.clientX; lastPtr.y = e.clientY;
    const tp = { el, kind: el.classList.contains('sv-fr') ? 'fruit' : 'card', id: el.dataset.id || el.dataset.fruit, pid: e.pointerId, x0: e.clientX, y0: e.clientY, mouse: e.pointerType === 'mouse' };
    tp.timer = setTimeout(() => { if (trayPress === tp && !drag) beginTrayDrag(); }, 320);
    trayPress = tp;
  }
  function trayPressMove(e) {
    const tp = trayPress, dx = e.clientX - tp.x0, dy = e.clientY - tp.y0;
    if (tp.mouse ? Math.hypot(dx, dy) > 6 : (dy < -7 && Math.abs(dy) > Math.abs(dx))) beginTrayDrag();
    else if (!tp.mouse && Math.abs(dx) > 9) { clearTimeout(tp.timer); trayPress = null; } // (it's a scroll)
  }
  function trayUp(e, cancelled) {
    const tp = trayPress; clearTimeout(tp.timer); trayPress = null;
    if (cancelled || drag || Math.hypot(e.clientX - tp.x0, e.clientY - tp.y0) > 8 || !M) return;
    snd('tick');
    if (tp.kind === 'fruit') { const f = D.FRUITS[tp.id]; if (f) tip(`${f.name}: drag it onto a plant to heal it`); return; }
    const s = PS.S.sprouts.find(x => x.id === tp.id); if (!s) return;
    const u = unitOf(s);
    if (isKO(s)) tip(`${s.name} is resting after a knock-out. Back in ${Math.max(1, Math.ceil(((s.recoverUntil || 0) - nowMs()) / 1000))} seconds.`);
    else if (u) tapUnit(u);
    else tip(`Drag ${s.name} onto the lawn`);
  }
  function beginTrayDrag() {
    const tp = trayPress; if (!tp) return; clearTimeout(tp.timer); trayPress = null;
    if (!playable()) return;
    if (tp.kind === 'fruit') { if ((PS.S.fruits[tp.id] || 0) > 0) startDrag('fruit', null, tp.pid, null, tp.id, tp.el); return; }
    const s = PS.S.sprouts.find(x => x.id === tp.id); if (!s) return;
    if (isKO(s)) { tip(`${s.name} is resting. Back soon!`); snd('miss'); return; }
    const u = unitOf(s);
    startDrag(u ? 'unit' : 'card', s, tp.pid, u, null, tp.el);
  }
  function startDrag(src, s, pid, u, fruit, el) {
    drag = { src, s, pid, u, fruit, el, hover: null, hoverOk: false, overTray: false, target: null };
    if (u) { u.lift = true; if (M.sel === u) M.sel = null; }
    if (el) el.classList.add('lift');
    // the picked-up plant (or fruit) follows the finger, at the lawn's size
    let c = null;
    try { c = fruit ? fruitSpr(fruit) : PX.sprig(ST.lookOf(s), { arms: 'out', mouth: 'o' }); } catch (e) { c = blob(16, 16); }
    ghostEl.width = c.width; ghostEl.height = c.height;
    const sc = fruit ? Math.max(2, Z * 1.6) : Z;
    ghostEl.style.width = PX.artW(c) * sc + 'px'; ghostEl.style.height = PX.artH(c) * sc + 'px';
    gctx.imageSmoothingEnabled = false; gctx.clearRect(0, 0, c.width, c.height); gctx.drawImage(c, 0, 0);
    drag.gw = PX.artW(c) * sc; drag.gh = PX.artH(c) * sc;
    snd('pop'); buzz(8);
    moveDrag(lastPtr.x, lastPtr.y);
  }
  const LIFT = 22; // a carried plant floats this far above the finger (CSS px) so you can see where it goes
  function moveDrag(cx, cy) {
    if (!drag) return;
    const rr = root.getBoundingClientRect(), tr = trayEl.getBoundingClientRect();
    drag.overTray = cy >= tr.top - 4;
    if (drag.src === 'fruit') {
      ghostEl.style.transform = `translate(${Math.round(cx - rr.left - drag.gw / 2)}px,${Math.round(cy - rr.top - drag.gh - 14)}px)`;
      const p = toWorld(cx, cy - 22);
      let best = null, bd = 16;
      for (const u of M.units) { if (u.dead) continue; const d = Math.hypot(p.x - u.x, p.y - (u.y - 10)); if (d < bd) { bd = d; best = u; } }
      drag.target = best;
      const card = drag.overTray ? document.elementFromPoint(cx, cy) : null, ce = card && card.closest && card.closest('.sv-card');
      drag.cardTarget = ce && !ce.classList.contains('ko') ? ce.dataset.id : null;
      for (const cd of cards.values()) cd.el.classList.toggle('feed', cd.el.dataset.id === drag.cardTarget);
      return;
    }
    // a plant: its feet land where the ghost's feet are
    ghostEl.style.transform = `translate(${Math.round(cx - rr.left - drag.gw / 2)}px,${Math.round(cy - rr.top - LIFT - drag.gh + drag.gh / 32)}px)`;
    const cell = drag.overTray ? null : cellAt(toWorld(cx, cy - LIFT));
    drag.hover = cell;
    const s = drag.s, onLawn = !!unitOf(s);
    drag.hoverOk = !!cell && M.lanes.includes(cell.r) && (onLawn || !!unitAtSpot(cell.r, cell.c) || M.units.length < M.cap);
  }
  function endDrag(cx, cy, cancelled) {
    const d = drag; if (!d) return;
    moveDrag(cx, cy);
    cleanupDrag();
    if (cancelled || !M || !playable()) return;
    if (d.src === 'fruit') {
      const s = d.target ? d.target.s : d.cardTarget ? PS.S.sprouts.find(x => x.id === d.cardTarget) : null;
      if (s && !isKO(s)) { feedFruit(s, d.fruit); renderFruit(); }
      return;
    }
    const u = unitOf(d.s);
    if (d.overTray) { if (u) benchUnit(u); renderTray(); return; }
    if (!d.hover) return;
    if (!M.lanes.includes(d.hover.r)) { tip('Zombies don\'t come down the dirt rows. Plant on the grass!'); snd('miss'); return; }
    if (plantAt(d.s, d.hover.r, d.hover.c)) renderTray();
    if (M.phase === 'setup') setupBanner();
  }
  function cleanupDrag() {
    const d = drag; drag = null;
    if (!d) return;
    if (d.u) d.u.lift = false;
    if (d.el) d.el.classList.remove('lift');
    for (const cd of cards.values()) cd.el.classList.remove('feed');
    if (ghostEl) ghostEl.style.transform = 'translate(-999px,-999px)';
  }
  function cancelDrag() { if (press) { clearTimeout(press.timer); press = null; } if (trayPress) { clearTimeout(trayPress.timer); trayPress = null; } cleanupDrag(); }

  // ---------------- pause, quit, results ----------------
  function pause() {
    if (!M || M.paused || (M.phase !== 'setup' && M.phase !== 'fight')) return;
    M.paused = true; cancelDrag(); snd('tick');
    overCard(`<div class="eyebrow">${esc(M.map.name)}</div><h1>Paused</h1><p>The zombies are waiting. Take your time!</p>`, [
      { label: 'Keep playing', kind: 'primary', fn: resume },
      { label: 'Quit match', kind: 'danger', fn: askQuit },
    ]);
  }
  function resume() { if (!M) return; M.paused = false; overEl.hidden = true; overEl.innerHTML = ''; }
  function askQuit() {
    overCard(`<h1>Quit this match?</h1><p>You won't get a prize this time. Plants that were knocked out keep resting.</p>`, [
      { label: 'Keep playing', kind: 'primary', fn: resume },
      { label: 'Quit', kind: 'danger', fn: () => { if (M) { PS.S.totals.survivalQuits = (PS.S.totals.survivalQuits || 0) + 1; PS.save(); } endMatch(); } },
    ]);
  }
  // a card over the lawn (the app's pop-ups wait while a match is on, so the lawn has its own)
  function overCard(html, buttons, cls) {
    overEl.hidden = false;
    overEl.innerHTML = `<div class="card modal-card sv-card-over ${cls || ''}">${html}<div class="modal-btns sv-obtns"></div></div>`;
    const box = overEl.querySelector('.sv-obtns');
    for (const b of buttons) { const el = document.createElement('button'); el.type = 'button'; el.className = 'btn wide ' + (b.kind || ''); el.textContent = b.label; el.onclick = () => { PX.Sound.unlock(); snd('pop'); b.fn(); }; box.appendChild(el); }
    return overEl.querySelector('.card');
  }
  function showEndCard() {
    if (!M) return;
    banner(null); cancelDrag();
    if (M.phase === 'win') {
      const r = M.res || { coins: 0, rows: [], legend: null, secs: Math.round(M.t) }, P = D.PLANTS[M.map.reward];
      const leg = r.legend && P ? `<div class="sv-legend"><div class="sv-rays"></div><canvas class="px" width="32" height="32" data-leg="${M.map.reward}"></canvas>
        <b>Legendary plant unlocked!</b><span class="px-title">${esc(P.name)}</span><small>Its seed packet is waiting in the Garden.</small></div>` : '';
      const rows = r.rows.map(x => `<div class="sv-xp"><canvas class="px" width="32" height="32" data-xp="${x.s.id}"></canvas><span><b>${esc(x.s.name)}</b><small>+${x.gives.power} Power${x.kills ? ` · ${x.kills} zombie${x.kills === 1 ? '' : 's'}` : ''}</small></span></div>`).join('');
      const stam = r.rows.length ? r.rows[0].gives.stamina : 0;
      const el = overCard(`<div class="eyebrow">${esc(M.map.name)}</div><h1>Lawn defended!</h1>${leg}
        <div class="sv-coins"><canvas class="px" data-coin></canvas><b>+${r.coins} coins</b><small>${fmtTime(r.secs)} · ${M.killed} zombies</small></div>
        ${rows ? `<div class="label">Your plants got stronger</div><p class="sv-xpnote">Everyone who fought: +${stam} Stamina, and Power for every zombie they beat</p><div class="sv-xps">${rows}</div>` : ''}`, [
        { label: 'Done', kind: 'primary', fn: endMatch },
        { label: 'Play again', kind: '', fn: () => { const id = M.map.id; endMatch(); startMatch(id); } },
      ], 'sv-win');
      el.querySelectorAll('canvas[data-xp]').forEach(c => { const s = PS.S.sprouts.find(x => x.id === c.dataset.xp); if (s) try { PS.ui.drawSproutTo(c, s, { eyes: 'happy', mouth: 'open' }); } catch (e) { /* art */ } });
      el.querySelectorAll('canvas[data-leg]').forEach(c => { try { PS.ui.drawSproutTo(c, { species: c.dataset.leg, stage: 0 }, { eyes: 'happy', mouth: 'open', arms: 'up' }); } catch (e) { /* art */ } });
      el.querySelectorAll('canvas[data-coin]').forEach(c => { try { const s = PX.item('coin'); PS.ui.fitCanvas(c, s); PS.ui.paint(c, s); } catch (e) { /* art */ } });
      if (r.legend) snd('evolve');
    } else {
      const beat = Math.max(0, M.wi), n = M.waves.length;
      overCard(`<div class="eyebrow">${esc(M.map.name)}</div><h1>The zombies got to the house!</h1>
        <p>${beat ? `You beat ${beat} of ${n} waves. So close!` : 'Those zombies were sneaky!'} Try again!</p>
        <p class="sv-tipline"><b>Tip:</b> put a plant in every grassy row, and drag fruit onto plants that get hurt.</p>`, [
        { label: 'Try again', kind: 'primary', fn: () => { const id = M.map.id; endMatch(); startMatch(id); } },
        { label: 'Back', kind: '', fn: endMatch },
      ]);
    }
    M.phase = 'done';
  }

  // ================================================================
  // CSS
  // ================================================================
  const CSS = `
.sv-root{position:absolute;inset:0;overflow:hidden;background:var(--ground)}
.sv-hub{position:absolute;inset:0;overflow-y:auto;-webkit-overflow-scrolling:touch;touch-action:pan-y;padding:12px 12px 24px}
.sv-top{display:flex;align-items:center;gap:10px;margin:2px 2px 8px}
.sv-top h1{font-size:28px;margin:0;color:var(--ink);flex:1}
.sv-back{flex:0 0 auto;width:44px;height:44px;border-radius:14px;background:var(--panel);border:2px solid var(--edge);border-bottom-width:4px;display:grid;place-items:center;padding:0;color:var(--ink)}
.sv-back:active{transform:translateY(2px);border-bottom-width:2px;margin-top:2px}
.sv-intro{font-size:15px;line-height:1.4;color:var(--ink);margin:0 4px 12px;background:rgba(251,243,220,.92);border-radius:14px;padding:8px 12px}
.sv-empty{padding:12px 14px;margin-bottom:12px}.sv-empty p{margin:0}
.sv-map{padding:10px 12px 12px;margin-bottom:12px}
.sv-prev{display:block;max-width:100%;border-radius:10px;border:2px solid var(--line);margin:0 auto 8px;image-rendering:pixelated;image-rendering:crisp-edges;background:var(--slot)}
.sv-mrow{display:flex;gap:8px;align-items:center;justify-content:space-between}
.sv-minfo{min-width:0}
.sv-mname{display:block;font-size:20px;color:var(--ink)}
.sv-minfo small{display:block;font-size:14px;font-weight:700;color:var(--ink);margin-top:2px}
.sv-prize{flex:0 0 auto;display:flex;align-items:center;gap:4px;background:linear-gradient(180deg,#fff1bf,#ffe08a);border:2px solid var(--sun-edge);border-radius:12px;padding:1px 8px 1px 1px;max-width:52%}
.sv-prize canvas{width:40px;height:40px;flex:0 0 auto}
.sv-prize span{min-width:0}
.sv-prize small{display:block;font-size:12px;color:#6a4a10;font-weight:800;line-height:1.1}
.sv-prize b{display:block;font-size:14px;color:#4a3210;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sv-prize.won{background:linear-gradient(180deg,#e8f8dc,#bfe8a4);border-color:var(--accent)}
.sv-prize.won small{color:var(--accent-edge)}
.sv-mfoot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;min-height:40px}
.sv-mfoot>span{font-size:14px;font-weight:700;color:var(--ink-soft)}
.sv-mfoot .btn{padding:8px 26px;font-size:17px}
.sv-lock{display:flex;align-items:center;gap:6px}
.sv-lock canvas{width:14px;height:16px}
.sv-map.locked .sv-prev{filter:grayscale(1) brightness(.92);opacity:.6}
.sv-map.locked .sv-prize{filter:saturate(.3);opacity:.75}
.sv-play{position:absolute;inset:0}
.sv-cv{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;image-rendering:pixelated;image-rendering:crisp-edges}
.sv-hud{position:absolute;left:8px;right:8px;top:calc(6px + env(safe-area-inset-top,0px));display:flex;align-items:center;gap:6px;z-index:4;pointer-events:none}
.sv-hud>*{pointer-events:auto}
.sv-pause{flex:0 0 auto;width:44px;height:44px;border-radius:14px;background:var(--panel);border:2px solid var(--edge);border-bottom-width:4px;display:grid;place-items:center;padding:0;color:var(--ink)}
.sv-pause:active{transform:translateY(2px);border-bottom-width:2px}
.sv-meter{flex:1 1 auto;min-width:0;background:var(--panel);border:2px solid var(--line);border-bottom:4px solid var(--edge);border-radius:14px;padding:3px 12px 6px}
.sv-meter b{display:block;font-family:var(--f-px);font-weight:400;font-size:15px;line-height:1.15;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.02em}
.sv-mbar{position:relative;height:11px;border-radius:7px;background:#6a5442;border:2px solid #3a2d34;margin:4px 4px 0}
.sv-mbar>i{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:5px;background:linear-gradient(#b8f080,#5cb43a);transition:width .4s}
.sv-flags{position:absolute;inset:0}
.sv-flag{position:absolute;bottom:-1px;width:8px;height:15px;transform:translateX(-4px);background:linear-gradient(90deg,#3a2d34 0 2px,transparent 2px),linear-gradient(#e5535f,#e5535f) 2px 0/6px 6px no-repeat}
.sv-flag.big{height:18px;width:10px;transform:translateX(-5px);background:linear-gradient(90deg,#3a2d34 0 2px,transparent 2px),linear-gradient(#e5535f,#e5535f) 2px 0/8px 8px no-repeat}
.sv-flag.on{filter:saturate(.2) brightness(1.2)}
.sv-cap{flex:0 0 auto;background:var(--panel);border:2px solid var(--line);border-bottom:4px solid var(--edge);border-radius:14px;padding:2px 9px 4px;text-align:center;min-width:56px}
.sv-cap b{display:block;font-family:var(--f-px);font-weight:400;font-size:19px;line-height:1.05}
.sv-cap small{display:block;font-size:12px;font-weight:800;color:var(--ink-soft);line-height:1}
.sv-cap.full b{color:var(--accent-edge)}
.sv-tray{position:absolute;left:6px;right:6px;bottom:calc(6px + env(safe-area-inset-bottom,0px));padding:4px 6px 5px;z-index:4;display:grid;gap:2px}
.sv-roster{display:flex;gap:6px;overflow-x:auto;overflow-y:hidden;touch-action:pan-x;scrollbar-width:none;padding:3px 2px 4px;overscroll-behavior-x:contain}
.sv-roster::-webkit-scrollbar,.sv-fruits::-webkit-scrollbar{display:none}
.sv-card{flex:0 0 auto;position:relative;width:60px;display:flex;flex-direction:column;align-items:center;border-radius:12px;background:var(--field);border:2px solid var(--line);border-bottom-width:4px;padding:1px 2px 3px;touch-action:pan-x;-webkit-touch-callout:none;cursor:grab;color:var(--ink)}
.sv-card canvas{width:38px;height:38px;pointer-events:none;display:block}
.sv-card b{font-size:12px;line-height:1.15;font-weight:800;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}
.sv-card .sv-lv{position:absolute;top:1px;right:1px;min-width:18px;height:15px;border-radius:8px;background:var(--ink);color:var(--panel);font:800 11px/15px var(--f-ui);font-style:normal;text-align:center;padding:0 3px;pointer-events:none}
.sv-hp{display:block;width:44px;height:5px;border-radius:3px;background:#f0e2bc;border:1px solid #3a2d34;overflow:hidden;margin-top:2px;pointer-events:none}
.sv-hp i{display:block;height:100%;width:100%;background:#7ad070}
.sv-card.on{background:#e4f6d6;border-color:var(--accent);box-shadow:inset 0 0 0 2px #99e550}
.sv-card.ko{background:var(--slot)}
.sv-card.ko canvas{filter:grayscale(1) brightness(1.05);opacity:.55}
.sv-card.ko b{color:var(--ink-soft)}
.sv-ko{display:none;position:absolute;left:0;right:0;top:12px;text-align:center;font:800 14px var(--f-ui);font-style:normal;color:#fff;text-shadow:0 0 2px #3a2d34,0 1px 0 #3a2d34,1px 0 0 #3a2d34,-1px 0 0 #3a2d34,0 -1px 0 #3a2d34;pointer-events:none}
.sv-card.ko .sv-ko{display:block}
.sv-card.lift{opacity:.35}
.sv-card.feed{transform:scale(1.08);border-color:var(--sun-edge);background:#fff4c2}
.sv-fruitrow{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:6px}
.sv-rl{font-size:12.5px;font-weight:800;text-transform:uppercase;color:var(--ink-soft);letter-spacing:.04em;padding-left:2px}
.sv-fruits{display:flex;gap:7px;overflow-x:auto;overflow-y:hidden;touch-action:pan-x;scrollbar-width:none;min-height:40px;align-items:center;padding:2px 8px 4px 2px;overscroll-behavior-x:contain}
.sv-fr{flex:0 0 auto;position:relative;width:38px;height:38px;border-radius:12px;background:var(--field);border:2px solid var(--line);border-bottom-width:4px;display:grid;place-items:center;padding:0;touch-action:pan-x;cursor:grab;-webkit-touch-callout:none}
.sv-fr canvas{pointer-events:none;display:block}
.sv-fr .n{position:absolute;right:-5px;bottom:-6px;min-width:18px;height:18px;border-radius:9px;background:var(--ink);color:var(--panel);font:700 12px/18px var(--f-ui);font-style:normal;text-align:center;padding:0 4px;pointer-events:none}
.sv-fr.lift{opacity:.35}
.sv-none{font-size:13px;color:var(--ink-soft);font-weight:600;white-space:nowrap}
.sv-ghost{position:absolute;left:0;top:0;pointer-events:none;z-index:30;transform:translate(-999px,-999px);image-rendering:pixelated;image-rendering:crisp-edges;filter:drop-shadow(0 4px 0 rgba(34,32,52,.25))}
.sv-ban{position:absolute;left:50%;top:70px;transform:translateX(-50%);z-index:6;pointer-events:none;text-align:center;background:#f4ffe6;border:3px solid #3a2d34;border-bottom-width:5px;border-radius:18px;padding:5px 14px 7px;width:max-content;min-width:200px;max-width:calc(100% - 20px);box-shadow:0 6px 0 rgba(58,45,52,.18);animation:svBan .3s ease-out}
.sv-ban b{display:block;font-family:var(--f-px);font-weight:400;font-size:19px;line-height:1.15;color:#3f7a2e;letter-spacing:.02em}
.sv-ban span{display:block;font:700 13.5px var(--f-ui);color:#5b4630;margin-top:1px}
.sv-ban i{display:block;font-style:normal;font-family:var(--f-px);font-size:36px;line-height:1;color:#e5535f;margin-top:2px}
.sv-ban.warn{background:#fff0e6}.sv-ban.warn b{color:#c0303e}
.sv-bbtns{display:flex;gap:8px;justify-content:center;margin-top:6px;pointer-events:auto}
.sv-bbtns .btn{padding:7px 14px;font-size:15.5px}
@keyframes svBan{from{transform:translate(-50%,-12px);opacity:0}to{transform:translateX(-50%);opacity:1}}
.sv-tip{position:absolute;left:50%;transform:translateX(-50%);bottom:150px;z-index:7;background:#2e4a1c;color:#fbf3dc;border:2px solid #1c3010;border-radius:12px;padding:6px 12px;font:700 14px var(--f-ui);text-align:center;width:max-content;max-width:calc(100% - 28px);opacity:0;transition:opacity .25s;pointer-events:none;text-wrap:balance}
.sv-over{position:absolute;inset:0;z-index:20;background:rgba(14,26,10,.55);display:flex;align-items:center;justify-content:center;padding:16px}
.sv-card-over{max-height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;touch-action:pan-y;overscroll-behavior:contain;text-align:center}
.sv-card-over h1{font-size:28px}
.sv-card-over p{font-size:15px}
.sv-obtns{display:grid;gap:8px;margin-top:12px}
.sv-tipline{font-size:14px!important;color:var(--ink-soft)}
.sv-legend{position:relative;overflow:hidden;border-radius:16px;background:radial-gradient(circle at 50% 40%,#fffbe0,#ffd86a);border:3px solid var(--sun-edge);padding:10px 10px 12px;margin:6px 0 10px;display:flex;flex-direction:column;align-items:center}
.sv-rays{position:absolute;left:50%;top:40%;width:420px;height:420px;margin:-210px 0 0 -210px;background:repeating-conic-gradient(rgba(255,255,255,.55) 0 10deg,transparent 10deg 20deg);animation:svSpin 9s linear infinite;pointer-events:none}
.sv-legend canvas{position:relative;width:96px;height:96px;animation:svPop .6s cubic-bezier(.3,1.6,.5,1)}
.sv-legend b{position:relative;font:800 13px var(--f-ui);text-transform:uppercase;letter-spacing:.06em;color:#8a4a10}
.sv-legend span{position:relative;font-size:26px;color:#4a3210}
.sv-legend small{position:relative;font-size:13px;font-weight:700;color:#6a4a10}
@keyframes svSpin{to{transform:rotate(360deg)}}
@keyframes svPop{from{transform:scale(.2)}to{transform:scale(1)}}
.sv-coins{display:flex;align-items:center;justify-content:center;gap:8px;background:#fff3c8;border:2px solid var(--sun-edge);border-radius:12px;padding:6px 10px;margin:4px 0 10px;flex-wrap:wrap}
.sv-coins canvas{width:20px;height:20px}
.sv-coins b{font-size:18px;color:#4a3210}
.sv-coins small{font-size:13px;font-weight:700;color:#6a4a10}
.sv-xps{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:4px;margin-top:4px;text-align:left}
.sv-xpnote{font-size:13px!important;color:var(--ink-soft);margin:2px 0 4px!important;line-height:1.3!important}
.sv-xp{display:flex;align-items:center;gap:6px;background:var(--field);border:2px solid var(--line);border-radius:12px;padding:1px 8px 1px 2px}
.sv-xp canvas{width:34px;height:34px;flex:0 0 auto}
.sv-xp span{min-width:0}
.sv-xp b{display:block;font-size:14px;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sv-xp small{display:block;font-size:12.5px;color:var(--ink-soft);font-weight:700;line-height:1.2}
@media (prefers-reduced-motion: reduce){.sv-rays{animation:none}.sv-ban{animation:none}}
`;
  function injectCSS() { if (document.getElementById('sv-style')) return; const st = document.createElement('style'); st.id = 'sv-style'; st.textContent = CSS; document.head.appendChild(st); }

  // ================================================================
  // Scene
  // ================================================================
  function mount(el) {
    root = el; injectCSS(); root.classList.add('sv-root');
    root.innerHTML = `
      <div class="sv-hub"></div>
      <div class="sv-play" hidden>
        <canvas class="sv-cv" aria-label="The lawn. Drag your plants onto it to stop the zombies."></canvas>
        <div class="sv-hud">
          <button class="sv-pause" type="button" aria-label="Pause"><svg viewBox="0 0 8 8" width="16" height="16" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true"><path d="M1 1h2v6H1zM5 1h2v6H5z"/></svg></button>
          <div class="sv-meter"><b class="sv-wave"></b><div class="sv-mbar"><i></i><span class="sv-flags"></span></div></div>
          <div class="sv-cap"><b>0/0</b><small>Plants</small></div>
        </div>
        <div class="sv-ban" hidden></div>
        <div class="sv-tip"></div>
        <footer class="panel sv-tray">
          <div class="sv-roster"></div>
          <div class="sv-fruitrow"><span class="sv-rl">Fruit</span><div class="sv-fruits"></div></div>
        </footer>
        <canvas class="sv-ghost" width="16" height="16" data-nosnap></canvas>
        <div class="sv-over" hidden></div>
      </div>`;
    const q = s => root.querySelector(s);
    hubEl = q('.sv-hub'); playEl = q('.sv-play'); cv = q('.sv-cv'); ctx = cv.getContext('2d');
    buf = document.createElement('canvas'); bx = buf.getContext('2d');
    bgC = document.createElement('canvas'); bgx = bgC.getContext('2d');
    fenceC = document.createElement('canvas'); fcx = fenceC.getContext('2d');
    hudEl = q('.sv-hud'); waveEl = q('.sv-wave'); barEl = q('.sv-mbar>i'); flagsEl = q('.sv-flags'); capEl = q('.sv-cap');
    trayEl = q('.sv-tray'); rosterEl = q('.sv-roster'); fruitEl = q('.sv-fruits'); banEl = q('.sv-ban'); tipEl = q('.sv-tip'); overEl = q('.sv-over');
    ghostEl = q('.sv-ghost'); gctx = ghostEl.getContext('2d');
    q('.sv-pause').addEventListener('click', () => { PX.Sound.unlock(); pause(); });
    capEl.addEventListener('click', () => { if (M) tip(`Up to ${M.cap} plants fit on this lawn. Drag one back to the tray to swap it.`); });
    cv.addEventListener('pointerdown', onDown);
    for (const s of [rosterEl, fruitEl]) {
      s.addEventListener('pointerdown', onTrayDown);
      s.addEventListener('touchmove', e => { if (drag) e.preventDefault(); }, { passive: false });
    }
    for (const ev of ['gesturestart', 'gesturechange']) cv.addEventListener(ev, e => e.preventDefault());
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', e => onUp(e, false));
    window.addEventListener('pointercancel', e => onUp(e, true));
    window.addEventListener('resize', () => { if (visible && !M) renderHub(); });
    // the app went to the background mid-match: pause, so nothing happens while nobody's looking
    document.addEventListener('visibilitychange', () => { if (document.hidden && visible && M && !window.__survival.testing) pause(); });
    PS.on('pouch', () => { if (M && visible) renderFruit(); });
    PS.on('reset', () => { if (M) endMatch(); });
    mounted = true;
  }
  function show() {
    visible = true;
    if (!M) { playEl.hidden = true; hubEl.hidden = false; renderHub(); PS.ui.chrome(true); }
  }
  function hide() {
    visible = false;
    // leaving the screen mid-match (it shouldn't happen: the bars are hidden) ends it, so the app never stays frozen
    if (M) endMatch(); else { cancelDrag(); PS.ui.chrome(true); PS.ui.hold(false); }
  }
  function frame(dt, tt) {
    if (!visible || !M) return;
    t = tt;
    try {
      checkSize(); if (!L.ww) return;
      if (!M.paused) update(Math.min(dt, 0.05));
      if (!M) return;
      if (trayDirty) renderTray();
      render(M.paused ? 0 : dt);
      if (tipT > 0 && (tipT -= dt) <= 0) tip(null);
      if ((uiT -= dt) <= 0) {
        uiT = 0.2;
        updateHud(); updateTray(); checkRecovered();
        if (M.phase === 'setup') setupBanner();
      }
    } catch (e) { console.error(e); }
  }
  PS.scenes = PS.scenes || {};
  PS.scenes.survival = { mount, show, hide, frame };

  // ---------------- headless balance check (console only) ----------------
  // __survival.sim('lawn', 20) -> win rate etc. with your own plants; opts.team: sprouts to use instead; opts.smart: re-plant
  // rested plants and fill gaps as the match goes (an attentive player); opts.lv: give every plant this total level.
  function sim(mapId, n, opts) {
    opts = opts || {};
    if (M && !M.sim) return 'Finish the match on screen first';
    const map = D.SURVIVAL.find(m => m.id === mapId) || D.SURVIVAL[0], keep = Object.assign({}, L);
    const keepCols = COLS, keepSV = Object.assign({}, SV); COLS = opts.cols || 8; Object.assign(SV, opts.sv || {});
    Object.assign(L, { ww: COLS * 24 + 33, wh: 400, cellW: 24, laneH: 28, gx0: 18, gy0: 170 });
    const out = { map: map.id, n: n || 20, rate: 0, wins: 0, mowers: 0, kos: 0, secs: 0, wavesBeaten: 0, zombies: 0, zLv: 0, teamLv: 0, lanes: 0 };
    try {
      for (let i = 0; i < out.n; i++) {
        let team = Array.isArray(opts.team) && typeof opts.team[0] === 'string'
          ? opts.team.map((sp, k) => Object.assign(ST.makePlantNPC({ species: sp, stage: opts.lv >= 60 ? 2 : opts.lv >= 15 ? 1 : 0, lv: opts.lv || 20 }), { id: 'sim' + k, npc: false }))
          : JSON.parse(JSON.stringify(opts.team || PS.S.sprouts));
        for (const s of team) { delete s.ko; delete s.recoverUntil; }
        if (opts.lv && !(Array.isArray(opts.team) && typeof opts.team[0] === 'string')) team = team.map(s => { const c = ST.makePlantNPC({ species: s.species, stage: s.stage, lv: opts.lv }); c.id = s.id; c.npc = false; return c; });
        M = newMatch(map, team, true);
        if (opts.detail) M.log = [];
        autoPlace(); startFight();
        if (M.log) M.log.push('team ' + M.units.map(u => `${u.s.species}r${u.r}c${u.c}`).join(' '));
        let steps = 0, fill = 0;
        while (M.phase === 'fight' && steps++ < 20 * 60 * 20) { update(0.05); if (opts.smart && (fill += 0.05) > 2) { fill = 0; autoPlace(); } }
        out.wins += M.phase === 'win' ? 1 : 0; out.mowers += M.mowed; out.kos += M.kos; out.secs += M.t; out.wavesBeaten += M.phase === 'win' ? M.waves.length : Math.max(0, M.wi);
        if (M.log) { M.log.push(M.phase + ' wave ' + (M.wi + 1)); (out.detail = out.detail || []).push(M.log.join(' | ')); }
        out.zombies += M.total; out.rate += M.rate || 0; out.zLv += M.waves[0] ? M.waves[0].list[0].lv : 0; out.teamLv += M.lv; out.lanes += M.lanes.length;
      }
    } finally { M = null; Object.assign(L, keep); COLS = keepCols; Object.assign(SV, keepSV); }
    const N = out.n, r1 = v => Math.round(v * 10) / 10;
    return { detail: out.detail, map: out.map, winRate: r1(out.wins / N * 100) + '%', mowersUsed: r1(out.mowers / N), knockOuts: r1(out.kos / N), minutes: r1(out.secs / N / 60), wavesBeaten: r1(out.wavesBeaten / N), zombies: r1(out.zombies / N), teamLv: r1(out.teamLv / N), firstZombieLv: r1(out.zLv / N), lanes: r1(out.lanes / N), rate: Math.round(out.rate / N * 1000) / 1000 };
  }
  window.__survival = { sim, testing: false, get M() { return M; }, L, SV, autoPlace: () => { if (M) { const n = autoPlace(); renderTray(); return n; } return 0; }, win: () => { if (M && M.phase === 'fight') { for (const z of M.zs) z.dead = z.dead || 0.001; M.spawnQ = []; M.wi = M.waves.length - 1; M.breakT = 0; } } };
})();
