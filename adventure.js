// adventure.js — P vs. Z Garden: Adventure. A scrolling world map down a winding garden path: Front Yard, Night, Pool, Fog, Roof,
// Pirate Seas, Sunstone Court and Dustrail, 5 short levels each (40 in all). Every level is a short lane-defense match on the
// Survival lawn (PS.survival.play in survival.js: the same rules, balance and touch handling), drawn with that world's garden.
// Stars per level: 1 = win, 2 = no plant knocked out, 3 = fast too. Stars open the gate to the next world (and its boss level
// must be beaten). First clears pay coins, the 2nd and 4th level of a world a seed packet, and the boss level at the end of each
// world (a Raid Chiefs wave) gives that world's plant with a big celebration. Pre-readers: big round level buttons with their
// stars under them, icons for the goals and prizes, one big Play button.
// Save (made the first time a level is played): PS.S.adventure = { stars: { levelId: 1..3 }, at: levelId, gates: { worldId: time } }.
// Owns PS.scenes.adventure (reached from the Battle hub). CSS is injected from here (classes prefixed .av-).
// Testing from the console: __adventure.levels, __adventure.play('day-1'), __adventure.give('day-1', 3), then __survival.win().
(function () {
  'use strict';
  if (!window.PS) return;
  const D = PS.D, ST = PS.state;
  const esc = v => ST.esc(v);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const snd = (n, o) => { try { PX.Sound.play(n, o); } catch (e) { /* audio optional */ } };
  const music = (fn, arg) => { try { const Mu = PX.Music; if (!Mu || typeof Mu[fn] !== 'function') return false; Mu[fn](arg); return true; } catch (e) { return false; } };
  const seeZ = id => { try { if (id && ST.seeZombie) ST.seeZombie(id); } catch (e) { /* optional */ } };
  const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  // the app's wipe (covers the screen, swaps scenes underneath, uncovers) when it has one; mid() always runs exactly once
  function wipe(kind, mid) {
    let done = false; const run = () => { if (!done) { done = true; try { mid(); } catch (e) { console.error(e); } } };
    try { if (PS.ui.wipe) return Promise.resolve(PS.ui.wipe(kind, run)).then(run, e => { console.error(e); run(); }); } catch (e) { console.error(e); }
    run(); return Promise.resolve();
  }

  // ================================================================
  // Worlds and levels
  // ================================================================
  // map: the garden map it's drawn with; sv: the Survival map whose zombies walk there; boss: the Raid Chiefs of its last level;
  // plant: the plant its boss level gives (a seed packet of it if you have it already)
  const WORLDS = [
    { id: 'day', name: 'Front Yard', map: 'frontyard', sv: 'lawn', boss: 'gargantuar', plant: 'wallnut' },
    { id: 'night', name: 'Night', map: 'graveyard', sv: 'night', boss: 'darkdragon', plant: 'puffshroom' },
    { id: 'pool', name: 'Pool', map: 'poolside', sv: 'pool', boss: 'sharktronic', plant: 'lilypad' },
    { id: 'fog', name: 'Fog', map: 'foggynight', sv: 'fog', boss: 'gondola', plant: 'plantern' },
    { id: 'roof', name: 'Roof', map: 'rooftop', sv: 'roof', boss: 'zombot', plant: 'cabbagepult' },
    { id: 'pirate', name: 'Pirate Seas', map: 'pirate', sv: 'pirate', boss: 'plankwalker', plant: 'coconut' },
    { id: 'egypt', name: 'Sunstone Court', map: 'egypt', sv: 'desert', boss: 'sphinx', plant: 'cactus' },
    { id: 'west', name: 'Dustrail', map: 'wildwest', sv: 'west', boss: 'warwagon', plant: 'spikeweed' },
  ];
  const PER = 5;        // levels per world (the last one is the boss level)
  const GATE = 7;       // stars needed for each gate: world 2 opens at 7, world 3 at 14, ... (out of 15 a world)
  const LEVELS = [];
  WORLDS.forEach((W, w) => {
    const sv = (D.SURVIVAL || []).find(m => m.id === W.sv) || {};
    const kinds = [...new Set(['basic'].concat(sv.pool || ['conehead']))].filter(k => k !== 'flag' && D.ZOMBIES[k]);
    W.levels = [];
    for (let j = 0; j < PER; j++) {
      const gi = w * PER + j, isBoss = j === PER - 1;
      const L = {
        id: `${W.id}-${j + 1}`, w, j, gi, isBoss, label: `${w + 1}-${j + 1}`, name: `${W.name} ${w + 1}-${j + 1}`, map: W.map, seed: 300 + gi,
        // short: 2 waves, then 3, the boss level 4 (the last wave of every level is the big flag wave)
        waves: isBoss ? 4 : j < 2 ? 2 : 3,
        // plants allowed on the lawn; the very first levels keep the zombies to one row, then three (like the original)
        cap: w === 0 ? [3, 5, 6, 8, 8][j] : Math.min(12, 6 + w + j),
        lanes: w === 0 && j === 0 ? [2] : w === 0 && j === 1 ? [1, 2, 3] : null,
        k: Math.round((sv.k || 0.6) * 0.9 * 100) / 100,
        // how many zombies (Survival's difficulty): 20% on the first level rising to 80% on the last, boss levels a bit more
        diff: Math.round((0.2 + 0.6 * gi / (WORLDS.length * PER - 1) + (isBoss ? 0.06 : 0)) * 100) / 100,
        pool: isBoss ? kinds : kinds.slice(0, Math.min(kinds.length, 2 + j)),
        boss: isBoss ? W.boss : null,
        xp: 10 + w * 3 + j,
        coins: (60 + w * 25 + j * 10) * (isBoss ? 2 : 1),
        packet: j === 1 || j === 3,
      };
      W.levels.push(L); LEVELS.push(L);
    }
  });
  const byId = id => LEVELS.find(L => L.id === id) || null;

  // ---------------- progress ----------------
  // (reads never create the save field; the first level played does)
  function A() {
    const S = PS.S;
    if (!S.adventure || typeof S.adventure !== 'object' || Array.isArray(S.adventure)) S.adventure = { stars: {}, at: null };
    const a = S.adventure;
    if (!a.stars || typeof a.stars !== 'object' || Array.isArray(a.stars)) a.stars = {};
    if (!a.gates || typeof a.gates !== 'object' || Array.isArray(a.gates)) a.gates = {};
    return a;
  }
  const starsOf = id => { const a = PS.S && PS.S.adventure; return clamp((a && a.stars && +a.stars[id]) || 0, 0, 3); };
  const totalStars = () => LEVELS.reduce((n, L) => n + starsOf(L.id), 0);
  const worldStars = w => WORLDS[w].levels.reduce((n, L) => n + starsOf(L.id), 0);
  const gateNeed = w => w * GATE;
  const bossBeaten = w => starsOf(WORLDS[w].levels[PER - 1].id) > 0;
  const worldOpen = w => w === 0 || (bossBeaten(w - 1) && totalStars() >= gateNeed(w));
  const levelOpen = L => worldOpen(L.w) && (L.j === 0 || starsOf(WORLDS[L.w].levels[L.j - 1].id) > 0);
  const nextLevel = () => LEVELS.find(L => levelOpen(L) && !starsOf(L.id)) || null;

  // ================================================================
  // Little pictures (inline SVG for the UI icons, canvases for the game art)
  // ================================================================
  const STAR = (on, size) => `<svg class="av-star${on ? ' on' : ''}" viewBox="0 0 24 24" width="${size || 20}" height="${size || 20}" aria-hidden="true"><path d="M12 1.8l3 6.6 7.2.7-5.4 4.8 1.6 7.1L12 17.3 5.6 21l1.6-7.1L1.8 9.1 9 8.4z" stroke-linejoin="round"/></svg>`;
  const LOCK = '<svg viewBox="0 0 16 16" width="26" height="26" aria-hidden="true"><path d="M5 7.5V5.2a3 3 0 0 1 6 0v2.3" fill="none" stroke="#3a2d34" stroke-width="2"/><rect x="2.8" y="7" width="10.4" height="7.6" rx="1.8" fill="#f6c83a" stroke="#3a2d34" stroke-width="1.5"/><rect x="7.2" y="9.4" width="1.6" height="2.8" rx=".8" fill="#3a2d34"/></svg>';
  const CHECK = '<svg viewBox="0 0 16 16" width="22" height="22" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.6" fill="none" stroke="#2f6a1a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const HEART = '<svg viewBox="0 0 16 16" width="22" height="22" aria-hidden="true"><path d="M8 14S1.5 10 1.5 5.6A3.3 3.3 0 0 1 8 4a3.3 3.3 0 0 1 6.5 1.6C14.5 10 8 14 8 14z" fill="#f07a84" stroke="#3a2d34" stroke-width="1.3" stroke-linejoin="round"/></svg>';
  const CLOCK = '<svg viewBox="0 0 16 16" width="22" height="22" aria-hidden="true"><circle cx="8" cy="8" r="6.4" fill="#fff" stroke="#3a2d34" stroke-width="1.8"/><path d="M8 4.4V8l2.6 1.6" fill="none" stroke="#3a2d34" stroke-width="1.7" stroke-linecap="round"/></svg>';
  const FLAG = '<svg viewBox="0 0 16 16" width="22" height="22" aria-hidden="true"><path d="M3.5 1.5v13" stroke="#3a2d34" stroke-width="2" stroke-linecap="round"/><path d="M4.5 2.5h8l-2 3 2 3h-8z" fill="#e5535f" stroke="#3a2d34" stroke-width="1.2" stroke-linejoin="round"/></svg>';
  const CHEV = '<svg viewBox="0 0 9 9" width="18" height="18" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true"><path d="M6 1h1v1H6v1H5v1H4v1h1v1h1v1h1v1H6V7H5V6H4V5H3V4h1V3h1V2h1z"/></svg>';
  const XMARK = '<svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
  const paintTo = (c, src) => { try { PS.ui.fitCanvas(c, src); PS.ui.paint(c, src); } catch (e) { /* art */ } };
  let starC = null;
  function starCanvas() { // (for the app's celebration tiles, which take a canvas)
    if (starC) return starC;
    const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
    g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 6.5 : 14.5; g.lineTo(16 + Math.cos(a) * r, 17 + Math.sin(a) * r); } g.closePath();
    g.fillStyle = '#fbd23a'; g.fill(); g.lineWidth = 2.5; g.lineJoin = 'round'; g.strokeStyle = '#3a2d34'; g.stroke();
    return (starC = c);
  }
  function drawLook(c, look, pose) { try { PS.ui.drawSproutTo(c, look, pose || {}); } catch (e) { /* art still coming */ } }
  function drawBoss(c, id) { try { paintTo(c, PX.critter(id, 0)); } catch (e) { /* art */ } }

  // ---------------- the painted world sections ----------------
  // each world is a strip of its garden's lawn (big checker squares), a winding path through its five levels, and its props
  const AW = 150, AH = 260, K = PX.SCENE_K || 2;
  const NODES = [[0.3, 0.17], [0.7, 0.32], [0.32, 0.49], [0.68, 0.65], [0.5, 0.83]];
  const FALLBACK = { tiles: ['#a0dc78', '#94d46c', '#7cc458', '#72b850'], lawn: ['#a2dc78', '#7cc05a'], props: [], night: [20, 18, 64, 0.36] };
  const themeOf = W => Object.assign({}, FALLBACK, (PS.gardenMaps || {})[W.map] || {});
  const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  // the path: a smooth curve from the top edge through the five levels to the bottom edge (Catmull-Rom, sampled)
  function pathPts() {
    const P = [[0.5, -0.04]].concat(NODES, [[0.5, 1.04]]).map(([x, y]) => [x * AW, y * AH]), out = [];
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      for (let s = 0; s < 1; s += 0.02) {
        const s2 = s * s, s3 = s2 * s, f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s2 + (-a + 3 * b - 3 * c + d) * s3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    return out;
  }
  let PATH = null;
  function paintWorld(c, W, w) {
    const th = themeOf(W), theme = (D.GARDEN_MAPS[W.map] || {}).theme || 'day', T = th.tiles || FALLBACK.tiles, seed = 17 + w * 31;
    c.width = AW * K; c.height = AH * K;
    const g = c.getContext('2d'); g.setTransform(K, 0, 0, K, 0, 0); g.imageSmoothingEnabled = false;
    // the lawn: big light and dark squares with a few darker tufts (deck planks on the pirate ship)
    const ts = 15;
    for (let y = 0; y < AH; y += ts) for (let x = 0; x < AW; x += ts) { g.fillStyle = ((x / ts + y / ts) & 1) ? T[2] : T[0]; g.fillRect(x, y, ts, ts); }
    if (th.planks) { g.fillStyle = 'rgba(58,45,52,.35)'; for (let y = 4; y < AH; y += 5) g.fillRect(0, y, AW, 1); }
    else for (let i = 0; i < 260; i++) { const x = Math.floor(hash(i, 1, seed) * AW), y = Math.floor(hash(i, 2, seed) * AH); g.fillStyle = hash(i, 3, seed) > 0.5 ? T[3] : T[1]; g.fillRect(x, y, 1, 2); g.fillRect(x + 1, y + 1, 1, 1); }
    // the path (a dirt trail; stepping stones at night; planks at sea)
    if (!PATH) PATH = pathPts();
    const night = theme === 'night', col = th.planks ? ['#8a5a30', '#c89058', '#e0b07a'] : night ? ['#6e6a80', '#b4b0c4', '#d4d0e0'] : ['#a4825a', '#e2c690', '#f2deb0'];
    for (const [r, cc] of [[8, col[0]], [6.4, col[1]]]) { g.fillStyle = cc; for (const [x, y] of PATH) { g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); } }
    g.fillStyle = col[2]; for (let i = 0; i < PATH.length; i += 9) { const [x, y] = PATH[i]; g.fillRect(Math.round(x - 2 + hash(i, 4, seed) * 4), Math.round(y - 1), 2, 1); }
    // props along the sides, away from the path
    const kinds = []; for (const p of th.props || []) { const k = p[0]; if (k && !kinds.includes(k) && k !== 'gumball' && k !== 'pyramid') kinds.push(k); }
    if (th.tree && !kinds.includes(th.tree)) kinds.unshift(th.tree);
    const slots = [[0.1, 0.1], [0.9, 0.2], [0.1, 0.36], [0.9, 0.45], [0.12, 0.62], [0.88, 0.78], [0.14, 0.93], [0.9, 0.98]];
    slots.forEach(([fx, fy], i) => {
      if (!kinds.length) return;
      const k = kinds[i % kinds.length]; let spr = null;
      try { spr = PX.prop(k, theme); } catch (e) { spr = null; }
      if (!spr) return;
      const x = fx * AW, y = fy * AH, near = PATH.some(([px, py]) => Math.abs(px - x) < 16 && Math.abs(py - y) < 10);
      if (near) return;
      g.fillStyle = 'rgba(34,32,52,.2)'; g.fillRect(Math.round(x - 6), Math.round(y - 1), 12, 2);
      try { PX.blit(g, spr, x, y); } catch (e) { /* art */ }
    });
    // night worlds are a little darker
    if (night) { const n = th.night || FALLBACK.night; g.fillStyle = `rgba(${n[0]},${n[1]},${n[2]},${(n[3] || 0.3) * 0.55})`; g.fillRect(0, 0, AW, AH); }
  }

  // ================================================================
  // Screen
  // ================================================================
  let root = null, scrollEl = null, sheetEl = null, resEl = null, topStars = null, visible = false, busy = false, painted = false;
  function mount(el) {
    root = el; injectCSS(); root.classList.add('av-root');
    root.innerHTML = `
      <div class="av-top"><button class="av-back" type="button" aria-label="Back to Battle">${CHEV}</button><h1 class="px-title">Adventure</h1>
        <span class="av-total" role="img" aria-label="Stars">${STAR(true, 26)}<b>0</b></span></div>
      <div class="sbox-frame sb-fill av-frame"><div class="sbox av-scroll"></div></div>
      <div class="av-sheet" hidden></div>
      <div class="av-res" hidden></div>`;
    scrollEl = root.querySelector('.av-scroll'); sheetEl = root.querySelector('.av-sheet'); resEl = root.querySelector('.av-res');
    topStars = root.querySelector('.av-total b');
    root.querySelector('.av-back').onclick = () => { snd('tick'); PS.ui.go('battle'); };
    sheetEl.addEventListener('click', e => { if (e.target === sheetEl) closeSheet(); });
    // the map: one section per world (painted once), level buttons placed on top
    scrollEl.innerHTML = WORLDS.map((W, w) => `<section class="av-world" data-w="${w}">
        <div class="av-sec"><canvas class="av-bg" data-nosnap aria-hidden="true"></canvas>
          <div class="av-sign"><small>World ${w + 1}</small><b>${esc(W.name)}</b></div>
          ${W.levels.map((L, j) => `<button class="av-node${L.isBoss ? ' boss' : ''}" type="button" data-lv="${L.id}" style="left:${NODES[j][0] * 100}%;top:${NODES[j][1] * 100}%"></button>`).join('')}
          <div class="av-gate" hidden></div>
        </div></section>`).join('') + '<div class="av-end"></div>';
    scrollEl.querySelectorAll('.av-node').forEach(b => { b.onclick = () => { PX.Sound.unlock(); tapNode(byId(b.dataset.lv)); }; });
    PS.on('reset', () => { if (visible) render(); });
    PS.on('sprout:update', () => { if (visible && !busy) placeMe(); });
  }
  function paintAll() {
    if (painted) return; painted = true;
    root.querySelectorAll('.av-world').forEach(sec => {
      const w = +sec.dataset.w, W = WORLDS[w], th = themeOf(W);
      // (the squares beside the column: the lawn's two colours, darkened like the painting on a night world)
      const T = th.tiles || FALLBACK.tiles, n = th.night || FALLBACK.night, nk = ((D.GARDEN_MAPS[W.map] || {}).theme === 'night') ? (n[3] || 0.3) * 0.55 : 0;
      const tint = hex => { const v = parseInt(String(hex).slice(1, 7), 16) || 0, c = [v >> 16, (v >> 8) & 255, v & 255].map((x, i) => Math.round(x * (1 - nk) + n[i] * nk)); return `rgb(${c.join(',')})`; };
      sec.style.setProperty('--t0', tint(T[0])); sec.style.setProperty('--t2', tint(T[2]));
      try { paintWorld(sec.querySelector('.av-bg'), W, w); } catch (e) { console.error(e); }
    });
  }
  // refresh every level button, gate and star count from the save
  function render() {
    if (!root) return;
    paintAll();
    const tot = totalStars(), next = nextLevel();
    topStars.textContent = tot;
    root.querySelectorAll('.av-world').forEach(sec => {
      const w = +sec.dataset.w, W = WORLDS[w], open = worldOpen(w);
      sec.classList.toggle('locked', !open);
      const gate = sec.querySelector('.av-gate');
      if (open) { gate.hidden = true; gate.innerHTML = ''; }
      else {
        const need = gateNeed(w), boss = WORLDS[w - 1].boss, beat = bossBeaten(w - 1);
        gate.hidden = false;
        gate.innerHTML = `<div class="av-gcard">${LOCK}<div class="av-gneed" role="img" aria-label="Stars needed: ${need}"><span class="${tot >= need ? 'ok' : ''}">${STAR(tot >= need, 26)}<b>${Math.min(tot, need)}/${need}</b></span>
          <span class="${beat ? 'ok' : ''}"><canvas class="px" data-gboss="${boss}"></canvas>${beat ? CHECK : ''}</span></div></div>`;
        gate.querySelectorAll('canvas[data-gboss]').forEach(c => drawBoss(c, c.dataset.gboss));
      }
      sec.querySelectorAll('.av-node').forEach(b => {
        const L = byId(b.dataset.lv), st = starsOf(L.id), op = open && levelOpen(L), cur = L === next;
        b.className = `av-node${L.isBoss ? ' boss' : ''}${st ? ' done' : ''}${op ? '' : ' locked'}${cur ? ' cur' : ''}`;
        b.setAttribute('aria-label', `Level ${L.label}${op ? '' : ', locked'}${st ? `, ${st} star${st === 1 ? '' : 's'}` : ''}`);
        const face = L.isBoss ? `<canvas class="px av-bossc" data-nboss="${L.boss}"></canvas>` : `<span class="av-num">${L.j + 1}</span>`;
        b.innerHTML = `${op ? face : LOCK}${op ? `<span class="av-stars">${[1, 2, 3].map(i => STAR(i <= st, 22)).join('')}</span>` : ''}${cur ? '<span class="av-tag">Play</span>' : ''}`;
        b.querySelectorAll('canvas[data-nboss]').forEach(c => drawBoss(c, c.dataset.nboss));
      });
    });
    placeMe();
  }
  // "you are here": your partner plant stands by the next level to play
  function placeMe() {
    if (!root) return;
    let me = root.querySelector('.av-me');
    const next = nextLevel(), s = PS.S.sprouts.find(x => x.id === PS.S.activeId) || PS.S.sprouts[0];
    if (!next || !s) { if (me) me.remove(); return; }
    const host = root.querySelector(`.av-world[data-w="${next.w}"] .av-sec`);
    if (!me) { me = document.createElement('canvas'); me.className = 'px av-me'; me.setAttribute('aria-hidden', 'true'); }
    if (me.parentNode !== host) host.appendChild(me);
    const [x, y] = NODES[next.j];
    me.style.left = (x < 0.5 ? x * 100 + 15 : x * 100 - 15) + '%'; me.style.top = (y * 100) + '%';
    drawLook(me, s, { eyes: 'happy', arms: 'up' });
  }
  // scroll so a level (or a world's gate) sits in the middle of the screen
  function scrollToLevel(L, smooth) {
    if (!L || !scrollEl) return;
    const b = scrollEl.querySelector(`[data-lv="${L.id}"]`); if (!b) return;
    const r = b.getBoundingClientRect(), sr = scrollEl.getBoundingClientRect();
    const top = scrollEl.scrollTop + (r.top - sr.top) - sr.height / 2 + r.height / 2;
    try { scrollEl.scrollTo({ top: Math.max(0, top), behavior: smooth && !reduced() ? 'smooth' : 'auto' }); } catch (e) { scrollEl.scrollTop = Math.max(0, top); }
  }

  // ---------------- a level's card ----------------
  function tapNode(L) {
    if (!L || busy) return;
    if (!worldOpen(L.w)) {
      snd('bump'); const need = gateNeed(L.w);
      toast(!bossBeaten(L.w - 1) ? `Beat the ${WORLDS[L.w - 1].name} boss first!` : `Get ${need} stars to open ${WORLDS[L.w].name}!`);
      return;
    }
    if (!levelOpen(L)) { snd('bump'); toast(`Beat level ${WORLDS[L.w].levels[L.j - 1].label} first!`); return; }
    snd('select'); openSheet(L);
  }
  function toast(msg) { try { if (PS.ui.fx && PS.ui.fx.banner) PS.ui.fx.banner(msg, { tone: 'info', ms: 2000 }); else PS.ui.toast(msg, 2200); } catch (e) { PS.ui.toast(msg, 2200); } }
  function openSheet(L) {
    const W = WORLDS[L.w], st = starsOf(L.id), first = !st, kinds = L.pool.slice(0, 5);
    const prize = first
      ? `<span class="av-pz"><canvas class="px" data-coin></canvas><b>${L.coins}</b></span>${L.packet ? '<span class="av-pz"><canvas class="px" data-packet></canvas></span>' : ''}${L.isBoss ? `<span class="av-pz av-pzp"><canvas class="px" data-plant="${W.plant}"></canvas></span>` : ''}`
      : `<span class="av-pz"><canvas class="px" data-coin></canvas><b>${Math.max(5, Math.round(L.coins * 0.2))}</b></span>`;
    sheetEl.innerHTML = `<div class="av-card" role="dialog" aria-label="Level ${L.label}">
        <button class="av-x" type="button" aria-label="Close">${XMARK}</button>
        <div class="av-lvl"><b>${L.label}</b><span>${esc(W.name)}</span></div>
        <div class="av-zs">${kinds.map(k => `<canvas class="px" data-z="${k}"></canvas>`).join('')}${L.boss ? `<canvas class="px av-zboss" data-boss="${L.boss}"></canvas>` : ''}</div>
        <div class="av-goals" role="img" aria-label="Stars: win, keep every plant safe, be fast">
          <span class="av-goal${st >= 1 ? ' on' : ''}">${STAR(st >= 1, 30)}${CHECK}</span>
          <span class="av-goal${st >= 2 ? ' on' : ''}">${STAR(st >= 2, 30)}${HEART}</span>
          <span class="av-goal${st >= 3 ? ' on' : ''}">${STAR(st >= 3, 30)}${CLOCK}</span></div>
        <div class="av-facts"><span role="img" aria-label="${L.cap} plants"><canvas class="px" data-mini="peashooter"></canvas><b>${L.cap}</b></span><span role="img" aria-label="${L.waves} waves">${FLAG}<b>${L.waves}</b></span>
          <span class="av-prize${first ? '' : ' again'}" role="img" aria-label="Prize">${prize}</span></div>
        <button class="btn go av-play" type="button">Play</button>
      </div>`;
    sheetEl.hidden = false;
    sheetEl.querySelector('.av-x').onclick = () => { snd('back'); closeSheet(); };
    sheetEl.querySelector('.av-play').onclick = () => { PX.Sound.unlock(); snd('pop'); startLevel(L); };
    sheetEl.querySelectorAll('canvas[data-z]').forEach(c => { seeZ(c.dataset.z); drawLook(c, { zombie: c.dataset.z }); });
    sheetEl.querySelectorAll('canvas[data-boss]').forEach(c => drawBoss(c, c.dataset.boss));
    sheetEl.querySelectorAll('canvas[data-coin]').forEach(c => { try { paintTo(c, PX.item('coin')); } catch (e) { /* art */ } });
    sheetEl.querySelectorAll('canvas[data-packet]').forEach(c => { try { paintTo(c, PX.item('seed', 'normal')); } catch (e) { /* art */ } });
    sheetEl.querySelectorAll('canvas[data-plant]').forEach(c => drawLook(c, { species: c.dataset.plant, stage: 0 }, { eyes: 'happy' }));
    sheetEl.querySelectorAll('canvas[data-mini]').forEach(c => { try { paintTo(c, PX.item('plant', c.dataset.mini)); } catch (e) { /* art */ } });
  }
  function closeSheet() { if (sheetEl) { sheetEl.hidden = true; sheetEl.innerHTML = ''; } }

  // ---------------- playing a level ----------------
  function startLevel(L) {
    if (busy || !L || !levelOpen(L)) return;
    if (!PS.S.sprouts.length) { PS.ui.toast('Grow a plant in the Garden first!'); return; }
    if (!PS.survival || !PS.survival.ready()) { PS.ui.toast('Almost ready! Try again in a moment.'); return; }
    busy = true; closeSheet(); hideResult();
    const a = A(); a.at = L.id; PS.save();
    const cfg = { id: 'adv-' + L.id, name: L.name, map: L.map, seed: L.seed, waves: L.waves, cap: L.cap, k: L.k, pool: L.pool, boss: L.boss, diff: L.diff, lanes: L.lanes, xp: L.xp };
    wipe(L.isBoss ? 'boss' : 'battle', () => {
      busy = false;
      if (!PS.survival.play(cfg, res => levelEnded(L, res))) PS.ui.toast('That level could not start. Please try again!');
    });
  }
  function levelEnded(L, res) {
    let out = null;
    try { out = res && !res.quit ? settle(L, res) : null; } catch (e) { console.error(e); }
    wipe('plain', () => { PS.ui.go('adventure', out ? { result: out } : { focus: L.id }); });
  }
  // stars and prizes for a finished level (paid the moment it ends, so closing the app can't lose them)
  function settle(L, res) {
    const W = WORLDS[L.w], before = starsOf(L.id), out = { L, res, before, stars: 0, goals: [false, false, false], coins: 0, packet: null, plant: null, opened: null };
    if (!res.win) return out;
    const fast = res.par ? res.secs <= res.par : false;
    out.goals = [true, (res.kos | 0) === 0, fast];
    out.stars = out.goals.filter(Boolean).length;
    const a = A();
    if (out.stars > before) a.stars[L.id] = out.stars;
    let coins = before ? Math.max(5, Math.round(L.coins * 0.2)) : L.coins;
    coins += Math.max(0, out.stars - before) * 10;
    try { out.coins = ST.addCoins(coins, 'adventure'); } catch (e) { console.error(e); }
    if (!before && L.packet) { try { out.packet = ST.addEgg('normal', `Adventure ${L.label}`); } catch (e) { console.error(e); } }
    if (!before && L.isBoss && D.PLANTS[W.plant]) { try { out.plant = ST.unlockSpecies(W.plant, `Adventure: ${W.name}`); } catch (e) { console.error(e); } }
    // a gate that opens now (announced once)
    for (let w = 1; w < WORLDS.length; w++) if (worldOpen(w) && !a.gates[WORLDS[w].id]) { a.gates[WORLDS[w].id] = Date.now(); if (!out.opened) out.opened = w; }
    PS.save();
    return out;
  }

  // ---------------- results on the map ----------------
  function hideResult() { if (resEl) { resEl.hidden = true; resEl.innerHTML = ''; resEl.className = 'av-res'; } }
  function showResult(o) {
    const L = o.L, W = WORLDS[L.w], res = o.res, win = !!res.win, nx = win ? LEVELS[L.gi + 1] : null, nextOk = !!(nx && levelOpen(nx));
    let html;
    if (win) {
      const title = L.isBoss ? `${W.name} saved!` : o.stars === 3 ? 'Perfect!' : 'Level clear!';
      const tiles = [`<div class="pv-res-tile"><canvas class="px" data-coin></canvas><b class="num" data-count="${o.coins}">+${o.coins}</b><small>Coins</small></div>`];
      if (o.packet) tiles.push(`<div class="pv-res-tile av-new"><canvas class="px" data-packet></canvas><b class="num">+1</b><small>Seed packet</small></div>`);
      if (o.plant) tiles.push(`<div class="pv-res-tile av-new"><canvas class="px" data-plant="${o.plant.species}"></canvas><b class="num">${o.plant.isNew ? 'New!' : '+1'}</b><small>${esc((D.PLANTS[o.plant.species] || {}).name || 'Plant')}</small></div>`);
      tiles.push(`<div class="pv-res-tile"><canvas class="px" data-zicon></canvas><b class="num">${res.killed | 0}</b><small>Zombies</small></div>`);
      const t = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
      html = `<div class="eyebrow">${esc(W.name)} ${L.label}</div><div class="pv-res-title">${title}</div>
        <div class="av-rstars" role="img" aria-label="${o.stars} of 3 stars">${[0, 1, 2].map(i => `<span class="av-rs" data-i="${i}">${STAR(false, 64)}</span>`).join('')}</div>
        <div class="av-rgoals"><span class="${o.goals[0] ? 'on' : ''}">${CHECK}</span><span class="${o.goals[1] ? 'on' : ''}">${HEART}</span><span class="${o.goals[2] ? 'on' : ''}">${CLOCK}<small>${t(res.secs | 0)}${res.par ? ' / ' + t(res.par) : ''}</small></span></div>
        <div class="pv-res-tiles">${tiles.join('')}</div>
        <div class="pv-res-btns"><button class="btn go" type="button" data-act="next">${nextOk ? 'Next' : 'Map'}</button><button class="btn" type="button" data-act="again">Again</button></div>`;
    } else {
      html = `<div class="eyebrow">${esc(W.name)} ${L.label}</div><div class="pv-res-title lose">So close!</div>
        ${res.loseLook ? '<div class="pv-res-hero"><canvas class="px" data-hero></canvas></div>' : ''}
        <div class="pv-res-tiles"><div class="pv-res-tile">${FLAG}<b class="num">${res.beat | 0}/${res.waves | 0}</b><small>Waves</small></div><div class="pv-res-tile"><canvas class="px" data-zicon></canvas><b class="num">${res.killed | 0}</b><small>Zombies</small></div></div>
        <p class="av-tipline">Tip: put a plant in every grassy row, and drag fruit onto hurt plants.</p>
        <div class="pv-res-btns"><button class="btn go" type="button" data-act="again">Try again</button><button class="btn" type="button" data-act="map">Map</button></div>`;
    }
    resEl.className = 'av-res pv-res'; resEl.hidden = false;
    resEl.innerHTML = `<div class="pv-res-win av-resw" role="dialog" aria-label="Results">${html}</div>`;
    const el = resEl.firstElementChild;
    const act = (k, fn) => { const b = el.querySelector(`[data-act="${k}"]`); if (b) b.onclick = () => { PX.Sound.unlock(); snd('pop'); fn(); }; };
    act('next', () => { hideResult(); if (nextOk) startLevel(nx); else afterResult(o); });
    act('again', () => { hideResult(); startLevel(L); });
    act('map', () => { hideResult(); afterResult(o); });
    el.querySelectorAll('canvas[data-coin]').forEach(c => { try { paintTo(c, PX.item('coin')); } catch (e) { /* art */ } });
    el.querySelectorAll('canvas[data-packet]').forEach(c => { try { paintTo(c, PX.item('seed', 'normal')); } catch (e) { /* art */ } });
    el.querySelectorAll('canvas[data-plant]').forEach(c => drawLook(c, { species: c.dataset.plant, stage: 0 }, { eyes: 'happy', mouth: 'open' }));
    el.querySelectorAll('canvas[data-zicon]').forEach(c => { try { paintTo(c, PS.ui.icon('battle')); } catch (e) { /* art */ } });
    el.querySelectorAll('canvas[data-hero]').forEach(c => drawLook(c, res.loseLook));
    const cu = el.querySelector('[data-count]');
    if (cu && PS.ui.fx && PS.ui.fx.countUp) { try { PS.ui.fx.countUp(cu, 0, +cu.dataset.count, 700, { prefix: '+' }); } catch (e) { /* optional */ } }
    if (!win) { music('jingle', 'lose'); return; }
    // the stars pop in one by one, each with a ping; the last one plays the star jingle (a world's boss: the victory one)
    const stars = el.querySelectorAll('.av-rs'), quick = reduced();
    for (let i = 0; i < o.stars; i++) {
      const go = () => { if (!resEl.contains(stars[i])) return; stars[i].classList.add('on'); stars[i].querySelector('svg').classList.add('on'); snd('star', { pitch: 1 + i * 0.12 });
        if (i === o.stars - 1) { if (!music('jingle', L.isBoss ? 'victory' : 'star')) snd('level'); afterStars(o, el); } };
      if (quick) go(); else setTimeout(go, 450 + i * 420);
    }
  }
  function afterStars(o, el) {
    try { if (o.coins && PS.ui.fx && PS.ui.fx.coinsFly) PS.ui.fx.coinsFly(el.querySelector('[data-coin]') || el, Math.min(10, 3 + Math.round(o.coins / 40))); } catch (e) { /* optional */ }
    const L = o.L, W = WORLDS[L.w];
    if (L.isBoss && !o.before && PS.ui.celebrate) {
      const nw = WORLDS[L.w + 1];
      try {
        PS.ui.celebrate({ kind: 'world', title: `${W.name} saved!`, sub: nw ? `Next stop: ${nw.name}!` : 'You finished the whole Adventure!', sprite: { species: W.plant, stage: 0 },
          zombie: null, jingle: 'victory', tiles: [{ icon: starCanvas(), value: worldStars(L.w), label: 'Stars' }], button: 'Yay!', hold: 900 });
      } catch (e) { console.error(e); }
    }
  }
  // back on the map: a gate that just opened gets its moment
  function afterResult(o) {
    render();
    if (o && o.opened != null) {
      const W = WORLDS[o.opened];
      music('jingle', 'unlock') || snd('level');
      toast(`${W.name} is open!`);
      scrollToLevel(W.levels[0], true);
    } else scrollToLevel(nextLevel() || o.L, true);
  }

  // ---------------- scene ----------------
  function show(params) {
    visible = true; busy = false;
    PS.ui.chrome(true); PS.ui.hold(false);
    music('tempo', 1); if (!music('play', 'adventure-map')) { try { if (PS.ui.music) PS.ui.music(); } catch (e) { /* optional */ } }
    closeSheet(); hideResult();
    render();
    const p = params || {};
    requestAnimationFrame(() => {
      if (!visible) return;
      if (p.result) { scrollToLevel(p.result.L); showResult(p.result); }
      else scrollToLevel(byId(p.focus) || nextLevel() || byId(PS.S.adventure && PS.S.adventure.at) || LEVELS[0]);
    });
  }
  function hide() { visible = false; closeSheet(); }
  PS.scenes = PS.scenes || {};
  PS.scenes.adventure = { mount, show, hide, frame() {} };
  PS.adventure = { worlds: WORLDS, levels: LEVELS, stars: totalStars, open: () => PS.ui.go('adventure') };
  // testing from the console (never used by the game)
  window.__adventure = {
    levels: LEVELS, worlds: WORLDS, total: totalStars, next: nextLevel,
    play: id => { const L = byId(id); if (L) startLevel(L); return !!L; },
    give: (id, n) => { const a = A(); if (id === 'all') LEVELS.forEach(L => { a.stars[L.id] = n || 3; }); else if (byId(id)) a.stars[id] = n || 3; PS.save(); if (visible) render(); return totalStars(); },
    result: (id, res) => { const L = byId(id); if (!L) return null; const o = settle(L, Object.assign({ win: true, secs: 50, par: 60, kos: 0, killed: 12, waves: L.waves, beat: L.waves }, res || {})); render(); showResult(o); return o; },
  };

  // ================================================================
  // CSS
  // ================================================================
  const CSS = `
.av-root{position:absolute;inset:0;overflow:hidden;display:flex;flex-direction:column;background:#7cc05a;--mode:#e08a2c;--mode-dk:#a4561a;--bg1:#a2dc78;--bg2:#5cb43a}
.av-top{flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:12px 14px 8px 12px;background:linear-gradient(#fbf3dc,#f1e4bf);border-bottom:3px solid #3a2d34;z-index:3}
.av-top h1{flex:1;margin:0;font-size:28px;color:var(--ink)}
.av-back{flex:0 0 auto;width:48px;height:48px;border-radius:14px;background:var(--panel);border:2px solid var(--edge);border-bottom-width:4px;display:grid;place-items:center;padding:0;color:var(--ink)}
.av-back:active{transform:translateY(2px);border-bottom-width:2px;margin-top:2px}
.av-total{display:flex;align-items:center;gap:4px;background:#fff8dc;border:2px solid #3a2d34;border-radius:20px;padding:3px 12px 3px 6px;box-shadow:0 3px 0 rgba(58,45,52,.2)}
.av-total b{font:900 22px/1 var(--f-ui);color:#3a2d34;font-variant-numeric:tabular-nums}
.av-frame{--sb-gut:0px}
.av-scroll{padding:0!important}
.av-scroll{container-type:inline-size}
/* the same big checker squares carry on beside the map's column on a wide screen (a plain colour where the browser can't) */
.av-world{position:relative}
.av-world::before{content:"";position:absolute;inset:0;background-color:var(--t0,#7cc05a);background-image:repeating-conic-gradient(var(--t2,#72b850) 0 25%,var(--t0,#7cc05a) 0 50%);background-size:120px 120px;background-size:calc(min(100cqw,600px) / 5) calc(min(100cqw,600px) / 5);background-position:50% 0}
.av-world.locked::before{filter:grayscale(.75) brightness(.8)}
.av-sec{position:relative;z-index:1;width:min(100%,600px);margin:0 auto}
.av-bg{display:block;width:100%;height:auto;image-rendering:pixelated;image-rendering:crisp-edges}
.av-world.locked .av-bg{filter:grayscale(.75) brightness(.8)}
.av-sign{position:absolute;left:50%;top:1.2%;transform:translateX(-50%);text-align:center;background:linear-gradient(#c8905a,#a4703e);border:3px solid #3a2d34;border-radius:10px;padding:4px 16px 6px;box-shadow:0 4px 0 rgba(58,45,52,.35);white-space:nowrap;pointer-events:none;z-index:1}
.av-sign small{display:block;font:900 13px/1.1 var(--f-ui);color:#ffe9b8;letter-spacing:.04em;text-transform:uppercase}
.av-sign b{display:block;font-family:var(--f-px);font-weight:400;font-size:21px;line-height:1.1;color:#fff;text-shadow:0 2px 0 #3a2d34}
.av-node{position:absolute;transform:translate(-50%,-50%);width:70px;height:70px;border-radius:50%;padding:0;border:4px solid #3a2d34;background:radial-gradient(circle at 36% 30%,#fff7c8,#f6c83a 62%,#c7861c);box-shadow:0 5px 0 rgba(58,45,52,.4);display:grid;place-items:center;color:#3a2d34;touch-action:manipulation;z-index:2;cursor:pointer}
.av-node:active{transform:translate(-50%,-46%)}
.av-num{font:900 34px/1 var(--f-ui);text-shadow:0 2px 0 rgba(255,255,255,.6)}
.av-node.done{background:radial-gradient(circle at 36% 30%,#ecffd8,#8ad45a 62%,#4f9a2e)}
.av-node.boss{width:92px;height:92px;background:radial-gradient(circle at 36% 30%,#ffe2dc,#f07a84 60%,#b03440)}
.av-node.boss.done{background:radial-gradient(circle at 36% 30%,#ecffd8,#8ad45a 62%,#4f9a2e)}
.av-bossc{width:70px;height:70px;object-fit:contain;image-rendering:pixelated}
.av-node.locked{background:#d6d0c2;border-color:#8a8274;box-shadow:0 4px 0 rgba(58,45,52,.25);cursor:default}
.av-node.locked svg{opacity:.85}
.av-node.cur{animation:avBob 1.2s ease-in-out infinite;box-shadow:0 5px 0 rgba(58,45,52,.4),0 0 0 6px rgba(255,255,255,.75)}
.av-stars{position:absolute;top:calc(100% + 1px);left:50%;transform:translateX(-50%);display:flex;gap:0;pointer-events:none;filter:drop-shadow(0 2px 0 rgba(58,45,52,.35))}
.av-star path{fill:#e8e2d0;stroke:#6e6658;stroke-width:1.6}
.av-star.on path{fill:#fbd23a;stroke:#3a2d34}
.av-tag{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:#5cb43a;color:#fff;font:900 17px/1 var(--f-ui);padding:7px 13px 8px;border-radius:12px;border:3px solid #3a2d34;white-space:nowrap;pointer-events:none;text-shadow:0 1px 0 #2f6a1a}
.av-tag::after{content:"";position:absolute;left:50%;top:100%;transform:translateX(-50%);border:7px solid transparent;border-top-color:#3a2d34}
.av-me{position:absolute;width:60px;height:60px;transform:translate(-50%,-62%);object-fit:contain;image-rendering:pixelated;pointer-events:none;z-index:1;animation:avHop 1.6s ease-in-out infinite}
.av-gate{position:absolute;inset:0;display:flex;align-items:flex-start;justify-content:center;padding-top:18%;z-index:3;background:linear-gradient(rgba(58,45,52,.0),rgba(58,45,52,.18))}
.av-gcard{display:flex;align-items:center;gap:12px;background:#fbf3dc;border:3px solid #3a2d34;border-radius:16px;padding:10px 16px;box-shadow:0 5px 0 rgba(58,45,52,.35)}
.av-gneed{display:flex;align-items:center;gap:12px}
.av-gneed>span{display:flex;align-items:center;gap:4px;font:900 22px/1 var(--f-ui);color:#3a2d34}
.av-gneed>span.ok b{color:#2f6a1a}
.av-gneed canvas{width:48px;height:48px;object-fit:contain;image-rendering:pixelated}
.av-end{height:40px}
.av-sheet{position:absolute;inset:0;z-index:20;background:rgba(30,24,30,.55);display:flex;align-items:flex-end;justify-content:center;padding:16px 12px calc(16px + env(safe-area-inset-bottom,0px))}
html body .av-sheet[hidden],html body .av-res[hidden]{display:none!important}
.av-card{position:relative;width:100%;max-width:440px;background:var(--panel,#fbf3dc);border:3px solid #3a2d34;border-radius:20px;padding:14px 16px 16px;box-shadow:0 6px 0 rgba(58,45,52,.3);animation:avUp .22s ease-out;text-align:center}
.av-x{position:absolute;right:-10px;top:-10px;width:48px;height:48px;border-radius:50%;background:#fff;border:3px solid #3a2d34;display:grid;place-items:center;padding:0;color:#3a2d34}
.av-lvl{display:flex;align-items:baseline;justify-content:center;gap:10px;margin:0 30px 6px}
.av-lvl b{font-family:var(--f-px);font-weight:400;font-size:40px;line-height:1;color:#3a2d34}
.av-lvl span{font:900 18px/1.1 var(--f-ui);color:var(--ink-soft)}
.av-zs{display:flex;justify-content:center;align-items:flex-end;gap:4px;min-height:64px;background:linear-gradient(#cfe9b8,#a8d488);border:2px solid #3a2d34;border-radius:14px;padding:4px 6px}
.av-zs canvas{width:46px;height:58px;object-fit:contain;image-rendering:pixelated}
.av-zs canvas.av-zboss{width:72px;height:72px}
.av-goals{display:flex;justify-content:center;gap:10px;margin:12px 0 8px}
.av-goal{display:flex;flex-direction:column;align-items:center;gap:2px;background:#fff;border:2px solid #b8ab8a;border-radius:14px;padding:6px 10px 4px;min-width:64px}
.av-goal.on{border-color:#c79b00;background:#fff6cc}
.av-facts{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:10px;margin:4px 0 12px}
.av-facts>span{display:flex;align-items:center;gap:5px;background:#fff;border:2px solid #b8ab8a;border-radius:12px;padding:4px 10px;min-height:44px}
.av-facts b{font:900 20px/1 var(--f-ui);color:#3a2d34}
.av-facts canvas{width:28px;height:28px;object-fit:contain}
.av-prize{background:linear-gradient(#fff6cc,#ffe48a)!important;border-color:#c79b00!important}
.av-prize.again{background:#fff!important;border-color:#b8ab8a!important}
.av-pz{display:flex;align-items:center;gap:3px}
.av-pz canvas{width:30px;height:30px}
.av-pzp canvas{width:40px;height:40px}
.av-play{width:100%;min-height:60px;font-size:24px}
.av-res{position:absolute;inset:0;z-index:30;background:rgba(30,24,30,.6);display:flex;align-items:center;justify-content:center;padding:16px}
.av-rstars{display:flex;justify-content:center;align-items:flex-end;gap:6px;margin:4px 0 6px}
.av-rs:nth-child(2) svg{width:80px;height:80px}
.av-rs svg{transform:scale(.9);transition:transform .25s cubic-bezier(.3,1.7,.5,1)}
.av-rs.on svg{transform:scale(1.08)}
.av-rgoals{display:flex;justify-content:center;gap:10px;margin-bottom:6px}
.av-rgoals>span{display:flex;align-items:center;gap:4px;border-radius:12px;padding:3px 8px;background:#eee8d8;opacity:.45}
.av-rgoals>span.on{opacity:1;background:#e4f6d6}
.av-rgoals small{font:800 13px/1 var(--f-ui);color:var(--ink)}
.av-resw .pv-res-tile canvas{width:32px;height:32px;object-fit:contain}
.av-resw .pv-res-tile svg{width:30px;height:30px}
.av-resw .pv-res-hero canvas{height:100px;width:auto;max-width:100%;object-fit:contain;image-rendering:pixelated}
.av-new{background:#fff4c2!important}
.av-tipline{font:700 14px/1.35 var(--f-ui);color:var(--ink-soft);margin:8px 0 0}
:where(.pv-res-win){position:relative;width:100%;max-width:440px;max-height:100%;overflow-y:auto;background:var(--panel,#fbf3dc);border:3px solid #3a2d34;border-radius:18px;padding:14px 16px 16px;text-align:center}
:where(.pv-res-title){font-family:var(--f-px);font-size:34px;line-height:1.1;color:#3f7a2e;margin:2px 0 8px}
:where(.pv-res-title.lose){color:#c0303e}
:where(.pv-res-hero){display:flex;justify-content:center;align-items:flex-end;min-height:100px;margin:0 auto 8px}
:where(.pv-res-tiles){display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:8px 0 4px}
:where(.pv-res-tile){flex:1 1 0;min-width:84px;max-width:160px;display:grid;justify-items:center;gap:2px;background:var(--field,#fff);border:2px solid #3a2d34;border-radius:12px;padding:7px 6px}
:where(.pv-res-tile) b{font:900 24px/1 var(--f-ui)}
:where(.pv-res-tile) small{font:800 13px/1.2 var(--f-ui);color:var(--ink-soft)}
:where(.pv-res-btns){display:flex;gap:10px;margin-top:14px}
:where(.pv-res-btns) .btn{flex:1 1 0;min-height:52px;font-size:18px}
@keyframes avBob{0%,100%{transform:translate(-50%,-50%)}50%{transform:translate(-50%,-58%)}}
@keyframes avHop{0%,100%{transform:translate(-50%,-62%)}50%{transform:translate(-50%,-70%)}}
@keyframes avUp{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}
@media (min-width:700px){.av-node{width:84px;height:84px}.av-node.boss{width:108px;height:108px}.av-num{font-size:40px}.av-bossc{width:84px;height:84px}.av-me{width:76px;height:76px}.av-card{max-width:520px}}
@media (prefers-reduced-motion: reduce){.av-node.cur,.av-me,.av-card{animation:none}.av-rs svg{transition:none}}
`;
  function injectCSS() { if (document.getElementById('av-style')) return; const st = document.createElement('style'); st.id = 'av-style'; st.textContent = CSS; document.head.appendChild(st); }
  // the map fills a wide iPad (its column of worlds stays centred): tell the app's layout
  try { document.documentElement.classList.add('pv-wide-adventure'); } catch (e) { /* not in a browser (art checks) */ }
})();
