// arcade.js — PVZ Garden: the Arcade tab (PS.scenes.arcade). Three short PvZ-style mini-games for young kids on a touch screen:
//   Wall-nut Bowling  drag to a row, let go: the nut rolls, bonks zombies and bounces diagonally for combos (Explode-o-nuts go BOOM)
//   Whack-a-Zombie    zombies pop out of holes: tap to bonk them, never the Sunflower; it speeds up
//   Vasebreaker       tap vases: sun, coins, plants (tap a lawn square to plant them) or a zombie that walks; mowers save a row once
// and four more that open one by one (2 stars in the game before opens the next; the hub celebrates it once, PS.S.arcade.unl):
//   Sun Catcher       drag the Sunflower's pot: catch falling sun (combos), dodge the cones / buckets a zombie throws
//   Plant Pairs       seed-packet memory cards (12, then 16 with zombie cards that shuffle two hidden ones)
//   Beghouled         match-3 plant tiles: popped plants shoot peas along their row at zombies walking in
//   Pea Gallery       a fair stall: tap the zombie cut-outs (not the Sunflowers or gnomes); balloons and Gargantuars for big points
// Every game: 3-2-1 countdown, a score, 1-3 stars, a best score per game (optional PS.S.arcade = { <game id>: { best, stars, plays,
// prize }, unl: { <game id>: time } }, made on the first finished game), a few coins every time and a fusion item for the first 3 stars.
// Art: PX.sprig plants / zombies, PX.prop('gravestone' | 'lawnmower'), and art-arcade.js (vases, holes, the mallet, the sun).
// Music: 'arcade' on the hub, 'bowling' / 'whack' / 'vase' in a game (audio.js; everything is guarded).
// CSS is injected from here (classes .ar-*); results use the shared .pv-res kit. Wide screens: pv-wide-arcade (set at load).
(function () {
  'use strict';
  if (!window.PS || !window.PX) return;
  const D = PS.D, ST = PS.state, INK = PX.INK || '#3a2d34';
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const RM = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
  const F_UI = '"Nunito", ui-rounded, "SF Pro Rounded", system-ui, sans-serif', F_PX = '"Luckiest Guy", "Nunito", sans-serif';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const snd = (n, o) => { try { PX.Sound.play(n, o); } catch (e) { /* audio optional */ } };
  const music = id => { try { if (PX.Music && PX.Music.play) PX.Music.play(id); } catch (e) { /* music optional */ } };
  const jingle = id => { try { if (PX.Music && PX.Music.jingle) { PX.Music.jingle(id); return true; } } catch (e) { /* optional */ } return false; };
  // the hub track: the shell picks it (app.js music(): 'arcade' on this tab), or straight from audio.js
  const hubMusic = () => { try { if (PS.ui.music) { PS.ui.music(); return; } } catch (e) { /* optional */ } music('arcade'); };
  const seeZ = id => { try { if (id && ST && ST.seeZombie) ST.seeZombie(id); } catch (e) { /* optional */ } };
  const save = () => { try { PS.save(); } catch (e) { /* optional */ } };

  // ---------------- the games ----------------
  // stars: score for 1 / 2 / 3 stars (Vasebreaker's stars come from winning and the mowers left). prize: the first 3 stars' item.
  const GAMES = [
    { id: 'bowl', name: 'Wall-nut Bowling', short: 'Bowling', track: 'bowling', col: '#f08a3a', dk: '#a24e12', sec: 70, stars: [200, 450, 750], prize: 'knight',
      how: 'Touch a row, let go to bowl!', blurb: 'Roll nuts, bonk zombies!' },
    { id: 'whack', name: 'Whack-a-Zombie', short: 'Whack', track: 'whack', col: '#9a62e0', dk: '#5a2e9a', sec: 60, stars: [250, 550, 900], prize: 'viking',
      how: 'Bonk zombies. Not the Sunflower!', blurb: 'Bonk! Bonk! Bonk!' },
    { id: 'vase', name: 'Vasebreaker', short: 'Vases', track: 'vase', col: '#3aaed0', dk: '#17688a', sec: 0, stars: null, prize: 'wizard',
      how: 'Tap a vase. Tap grass to plant!', blurb: 'What is inside?' },
    // the new games open one by one: 2 stars in the game before (after) opens the next
    { id: 'sun', name: 'Sun Catcher', short: 'Sun', track: 'whack', col: '#f2b622', dk: '#a06a08', sec: 60, stars: [400, 900, 1700], prize: 'sunglasses', after: 'vase',
      how: 'Drag to catch the sun!', blurb: 'Catch sun, dodge cones!' },
    { id: 'pairs', name: 'Plant Pairs', short: 'Pairs', track: 'vase', col: '#4cbf7a', dk: '#1f7a48', sec: 90, stars: [150, 300, 600], prize: 'flowercrown', after: 'sun',
      how: 'Find two the same!', blurb: 'Flip cards, find pairs!' },
    { id: 'match', name: 'Beghouled', short: 'Beghouled', track: 'arcade', col: '#e8608a', dk: '#9a2a50', sec: 90, stars: [2500, 4500, 8500], prize: 'crown', after: 'pairs',
      how: 'Swap two plants to put 2 the same side by side!', blurb: 'Match 2 plants!' },
    { id: 'gallery', name: 'Pea Gallery', short: 'Gallery', track: 'bowling', col: '#e8504a', dk: '#982620', sec: 60, stars: [250, 550, 1050], prize: 'cowboy', after: 'match', multi: true,
      how: 'Tap the zombies!', blurb: 'Splat zombies, not friends!' },
  ];
  GAMES[0].countIn = true; GAMES[1].multi = true;
  const GBY = {}; GAMES.forEach(g => { GBY[g.id] = g; });
  const BLANK = { best: 0, stars: 0, plays: 0 };
  const XY = [0, 0], RC = [0, 0, 0, 0]; // scratch results for the layout helpers (no new arrays every frame)
  const rec = id => { const A = PS.S && PS.S.arcade, r = A && typeof A === 'object' ? A[id] : null; return r && typeof r === 'object' ? r : BLANK; };
  function recW(id) {
    let A = PS.S.arcade; if (!A || typeof A !== 'object' || Array.isArray(A)) A = PS.S.arcade = {};
    let r = A[id]; if (!r || typeof r !== 'object') r = A[id] = { best: 0, stars: 0, plays: 0 };
    r.best = Math.max(0, +r.best || 0); r.stars = clamp(+r.stars || 0, 0, 3); r.plays = Math.max(0, +r.plays || 0);
    return r;
  }

  // ---------------- sprites (made once, cached under fixed keys; guarded: missing art never crashes a game) ----------------
  const SPR = new Map();
  function sprC(key, make) {
    if (SPR.has(key)) return SPR.get(key);
    let c = null; try { c = make(); } catch (e) { console.error('arcade art', key, e); }
    if (c && !c.width) c = null;
    SPR.set(key, c); return c;
  }
  const zSpr = (kind, f, open) => sprC('z:' + kind + f + (open ? 'o' : ''), () => PX.sprig({ zombie: D.ZOMBIES[kind] ? kind : 'basic' }, { walk: true, frame: f, mouth: open ? 'open' : undefined }));
  const POSES = { idle: {}, blink: { eyes: 'blink' }, happy: { eyes: 'happy', mouth: 'open', arms: 'up' }, sad: { eyes: 'sad', mouth: 'o' }, walk0: { walk: true, frame: 0 }, walk1: { walk: true, frame: 1 } };
  const pSpr = (sp, pose) => sprC('p:' + sp + ':' + pose, () => PX.sprig({ species: D.PLANTS[sp] ? sp : 'peashooter', stage: 0 }, POSES[pose] || {}));
  const art = (k, a, b) => sprC('a:' + k + (a || '') + (b == null ? '' : b), () => (PX.arcade && PX.arcade[k] ? PX.arcade[k](a, b) : null));
  const prop = k => sprC('prop:' + k, () => PX.prop(k, 'day'));
  const coinIc = () => sprC('coin', () => (PS.ui.icon ? PS.ui.icon('coin') : null));
  // the Explode-o-nut: a Wall-nut blushing hot red
  function boomNut(pose) {
    return sprC('boomnut:' + pose, () => {
      const c = pSpr('wallnut', pose); if (!c) return null;
      const o = document.createElement('canvas'); o.width = c.width; o.height = c.height;
      const x = o.getContext('2d'); x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = 0.5; x.fillStyle = '#ff3a2a'; x.fillRect(0, 0, o.width, o.height);
      return PX.keepK ? PX.keepK(c, o) : (o.k = c.k, o);
    });
  }
  const aw = c => (c ? (PX.artW ? PX.artW(c) : c.width) : 0), ah = c => (c ? (PX.artH ? PX.artH(c) : c.height) : 0);

  // ---------------- scene state ----------------
  let root = null, hubEl = null, playEl = null, cv = null, ctx = null, hudEl = null, resEl = null, quitEl = null, pauseEl = null, tipEl = null;
  let modalRoot = null;
  let visible = false, G = null, W = 0, H = 0, DPR = 1, sizeKey = '', sizeT = 0, bgC = null, bgKey = '', errRun = 0, uiT = 0, ptrId = null, lastDown = 0;

  // ---------------- drawing helpers (CSS px; the canvas transform is the device-pixel ratio) ----------------
  function blit(c, x, y, s, ax, ay, flip) {
    if (!c) return;
    const w = aw(c) * s, h = ah(c) * s, X = x - (ax == null ? aw(c) / 2 : ax) * s, Y = y - (ay == null ? ah(c) : ay) * s;
    if (flip) { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(c, -(w - (x - X)), Y, w, h); ctx.restore(); }
    else ctx.drawImage(c, X, Y, w, h);
  }
  // rotated / squashed / faded copy round its anchor
  function blitR(c, x, y, s, ax, ay, rot, sx, sy, alpha, flip) {
    if (!c) return;
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale((flip ? -1 : 1) * (sx || 1), sy || 1); if (alpha != null && alpha < 1) ctx.globalAlpha = Math.max(0, alpha);
    ctx.drawImage(c, -(ax == null ? aw(c) / 2 : ax) * s, -(ay == null ? ah(c) : ay) * s, aw(c) * s, ah(c) * s); ctx.restore();
  }
  function shadow(x, y, w) { ctx.fillStyle = 'rgba(30,40,20,.22)'; ctx.beginPath(); ctx.ellipse(x, y, w / 2, Math.max(2, w * 0.14), 0, 0, 6.2832); ctx.fill(); }
  function bigText(text, x, y, size, col, al) {
    ctx.font = `${size}px ${F_PX}`; ctx.textAlign = al || 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(4, size * 0.16); ctx.strokeStyle = INK; ctx.strokeText(text, x, y); ctx.fillStyle = col; ctx.fillText(text, x, y);
  }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function note(text, x, y) { // a plain sentence on a solid label (for young readers)
    ctx.font = `800 16px ${F_UI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = Math.ceil(ctx.measureText(text).width) + 24; rr(x - w / 2, y - 16, w, 32, 12); ctx.fillStyle = 'rgba(255,250,236,.95)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = '#3d2a14'; ctx.fillText(text, x, y + 1);
  }

  // ---------------- particles + floating words (no per-frame allocation: dead ones are dropped in place) ----------------
  function part(g, c, x, y, vx, vy, life, s, o) {
    if (!c || g.parts.length > 90) return;
    g.parts.push({ c, x, y, vx, vy, gr: o && o.gr != null ? o.gr : 900, life, life0: life, s, rot: 0, vr: o && o.vr || rand(-8, 8) });
  }
  function floatText(g, text, x, y, col, size) { if (g.floats.length > 12) g.floats.shift(); g.floats.push({ text, x, y, col: col || '#fff27a', size: size || 28, t: 0 }); }
  function stepFx(g, dt) {
    let n = 0;
    for (const p of g.parts) { p.life -= dt; p.vy += p.gr * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; if (p.life > 0) g.parts[n++] = p; }
    g.parts.length = n; n = 0;
    for (const f of g.floats) { f.t += dt; if (f.t < 1.0) g.floats[n++] = f; }
    g.floats.length = n;
    if (g.shake > 0) g.shake = Math.max(0, g.shake - dt);
  }
  function drawFx(g) {
    for (const p of g.parts) blitR(p.c, p.x, p.y, p.s, null, ah(p.c) / 2, p.rot, 1, 1, Math.min(1, p.life / Math.min(0.3, p.life0)));
    for (const f of g.floats) { ctx.globalAlpha = f.t > 0.7 ? (1 - f.t) / 0.3 : 1; bigText(f.text, f.x, f.y - f.t * 34, f.size, f.col); ctx.globalAlpha = 1; }
  }
  function sparks(g, x, y, n, col) {
    const s = sprC('spark:' + col, () => PX.fx('bigspark', col));
    for (let i = 0; i < n; i++) { const a = i / n * 6.2832 + rand(-0.2, 0.2), v = rand(120, 260); part(g, s, x, y, Math.cos(a) * v, Math.sin(a) * v - 60, rand(0.35, 0.6), g.Z * 0.9, { gr: 300 }); }
  }
  function boomFx(g, x, y) {
    const a = sprC('spark:#ffb03a', () => PX.fx('bigspark', '#ffb03a')), b = sprC('spark:#fff27a', () => PX.fx('bigspark', '#fff27a'));
    for (let i = 0; i < 22; i++) { const t = rand(0, 6.2832), v = rand(150, 420); part(g, i % 2 ? a : b, x, y, Math.cos(t) * v, Math.sin(t) * v - 80, rand(0.4, 0.8), g.Z * 1.4, { gr: 200 }); }
    g.flash = 0.25; g.shake = RM ? 0 : 0.3; snd('boom'); PX.buzz && PX.buzz(30);
  }

  // =====================================================================
  // Wall-nut Bowling
  // =====================================================================
  // Rows are lanes; positions along a lane are shares of the lane (fx 0 = the red start line, 1 = the far right edge) so a resize
  // never moves anything off its row. A nut that hits a zombie bounces diagonally into the next row: every extra bonk is worth more.
  const BOWL = {
    init(g) {
      g.N = 0; g.nuts = []; g.zs = []; g.aim = -1; g.reload = 0; g.queued = -1; g.spawnT = 1.2; g.nutCount = 0; g.next = 'nut'; g.bestCombo = 0;
      g.hearts = g.maxHearts = 3;
    },
    layout(g) {
      const top = hudBottom() + 10, bot = H - 12, avail = Math.max(120, bot - top);
      if (!g.N) g.N = avail / 5 >= 62 && W >= 300 ? 5 : 3;
      const N = g.N;
      g.laneH = Math.max(40, Math.min(avail / N, Math.max(68, W / 6), 150));
      g.lawnY = top + Math.max(0, avail - N * g.laneH) * 0.5;
      g.startX = Math.round(Math.max(64, g.laneH * 1.2));
      g.Z = g.laneH / 30;
      g.A = Math.max(2.5, (W - g.startX) / g.laneH); // the lane's length in lane heights
      if (g.aim < 0 || g.aim >= N) g.aim = Math.floor(N / 2);
    },
    bg(g, x) { // x = a 1-art-px context for the painted backdrop (art px = g.Z CSS px)
      const Z = g.Z, w = Math.ceil(W / Z), h = Math.ceil(H / Z), ly = g.lawnY / Z, lh = g.laneH / Z, sx = g.startX / Z, N = g.N;
      paintSky(x, w, ly);
      for (let r = 0; r < N; r++) for (let c = 0; c * 15 < w; c++) { x.fillStyle = (r + c) % 2 ? '#94d46e' : '#a6de7c'; x.fillRect(c * 15, Math.round(ly + r * lh), 15, Math.ceil(lh)); }
      x.fillStyle = 'rgba(255,255,255,.18)'; for (let r = 1; r < N; r++) x.fillRect(0, Math.round(ly + r * lh), w, 1);
      paintPath(x, w, h, ly + N * lh);
      // the bowling area behind the red line: a mown strip, then the line itself
      x.fillStyle = 'rgba(255,255,255,.14)'; x.fillRect(0, Math.round(ly), Math.round(sx), Math.round(N * lh));
      for (let y = Math.round(ly); y < ly + N * lh; y += 4) { x.fillStyle = '#e8505a'; x.fillRect(Math.round(sx) - 1, y, 2, 3); }
    },
    update(g, dt) {
      const N = g.N, p = clamp(g.t / g.def.sec, 0, 1);
      if (g.reload > 0) g.reload -= dt;
      if (g.reload <= 0 && g.queued >= 0) { const l = g.queued; g.queued = -1; BOWL.bowl(g, l); }
      // zombies shamble in, faster and tougher as the minute goes by
      if (g.st === 'play' && (g.spawnT -= dt) <= 0) {
        g.spawnT = lerp(2.3, 0.95, p) * rand(0.8, 1.2);
        const u = Math.random(), kind = p > 0.45 && u < 0.18 ? 'buckethead' : p > 0.15 && u < 0.45 ? 'conehead' : 'basic';
        let lane = Math.floor(Math.random() * N); if (g.zs.length && Math.random() < 0.3) lane = g.zs[g.zs.length - 1].lane; // little groups make combos
        const z = { lane, fx: 1.04 + rand(0, 0.05), kind, hp: kind === 'buckethead' ? 3 : kind === 'conehead' ? 2 : 1, sp: rand(0.05, 0.066) * (1 + 0.45 * p), ph: Math.random() * 2, hitT: 0, kb: 0, dead: 0 };
        g.zs.push(z); seeZ(kind);
        if (Math.random() < 0.35) snd('zombie-step');
      }
      for (const z of g.zs) {
        if (z.dead) { z.dead += dt; continue; }
        if (z.hitT > 0) z.hitT -= dt;
        if (z.kb > 0) { z.fx += z.kb * dt * 0.5; z.kb = Math.max(0, z.kb - dt * 1.2); }
        z.fx -= z.sp * dt;
        if (z.fx <= -0.02) { // got past the line: a heart is lost
          z.dead = 0.01; z.ate = true; g.hearts--; g.shake = RM ? 0 : 0.35; snd('brains'); snd('bump');
          floatText(g, 'Oh no!', g.startX + 30, laneMid(g, z.lane) - g.laneH * 0.3, '#ff9aa0', 26);
          if (g.hearts <= 0) endGame(g, 'out');
        }
      }
      // nuts roll; a hit bonks the zombie and sends the nut off diagonally (bouncing off the top and bottom rows)
      for (const n of g.nuts) {
        if (n.gone) continue;
        n.fx += n.vx * dt; n.fy += n.vy * dt; n.rot += n.vx * g.A * dt * 2.4;
        if (n.fy < 0) { n.fy = -n.fy; n.vy = Math.abs(n.vy); snd('bump', { pitch: 1.3 }); }
        if (n.fy > N - 1) { n.fy = 2 * (N - 1) - n.fy; n.vy = -Math.abs(n.vy); snd('bump', { pitch: 1.3 }); }
        if (n.fx > 1.12) { n.gone = true; if (n.hits >= 2) g.bestCombo = Math.max(g.bestCombo, n.hits); continue; }
        for (const z of g.zs) {
          if (z.dead || z === n.last || z.fx > 1.0) continue;
          if (Math.abs(z.lane - n.fy) > 0.42 || Math.abs(z.fx - n.fx) * g.A > 0.5) continue;
          BOWL.hit(g, n, z); if (n.gone) break;
        }
      }
      if (g.nuts.length > 6) g.nuts = g.nuts.filter(n => !n.gone);
      if (g.zs.length > 24) g.zs = g.zs.filter(z => !(z.dead > 1.2));
    },
    hit(g, n, z) {
      const x = zX(g, z.fx), y = laneMid(g, z.lane);
      if (n.kind === 'boom') { // Explode-o-nut: everything in a 3-row circle goes BOOM
        n.gone = true; boomFx(g, x, y); let k = 0;
        for (const q of g.zs) if (!q.dead && Math.abs(q.lane - z.lane) <= 1.01 && Math.abs(q.fx - z.fx) * g.A <= 1.7) { q.dead = 0.01; q.boom = true; k++; g.score += 15; }
        floatText(g, k > 1 ? `BOOM! +${k * 15}` : '+15', x, y - g.laneH * 0.5, '#ffb03a', 30);
        if (k >= 3) snd('cheer');
        return;
      }
      n.hits++; n.last = z;
      const combo = n.hits;
      z.hp--; z.hitT = 0.18;
      snd('bonk', { pitch: 1 + 0.12 * Math.min(6, combo - 1) });
      if (z.hp <= 0) { z.dead = 0.01; z.dir = n.vy >= 0 ? 1 : -1; g.score += 10 * combo; floatText(g, combo > 1 ? `×${combo}! +${10 * combo}` : '+10', x, y - g.laneH * 0.55, combo > 2 ? '#ffd23a' : combo > 1 ? '#8fe3ff' : '#ffffff', combo > 1 ? 30 : 26); }
      else { z.kb = 0.4; if (z.hp === 1) z.kind = 'basic'; g.score += 5; floatText(g, 'Bonk!', x, y - g.laneH * 0.55, '#ffffff', 24); }
      if (combo >= 3) snd('cheer', { pitch: 1 + 0.08 * Math.min(6, combo - 3), streak: combo });
      sparks(g, x - g.laneH * 0.2, y - g.laneH * 0.2, 6, combo > 1 ? '#fff27a' : '#ffffff');
      // the bounce: a straight nut picks a side (towards more zombies ahead), a bouncing nut flips
      if (!n.vy) {
        const N = g.N, up = z.lane > 0, down = z.lane < N - 1;
        let dir = up && down ? (aheadIn(g, z.lane - 1, n.fx) > aheadIn(g, z.lane + 1, n.fx) ? -1 : aheadIn(g, z.lane + 1, n.fx) > aheadIn(g, z.lane - 1, n.fx) ? 1 : (Math.random() < 0.5 ? -1 : 1)) : up ? -1 : 1;
        n.vy = dir * 2.6;
      } else n.vy = -n.vy;
    },
    bowl(g, lane) {
      if (g.st !== 'play') return;
      if (g.reload > 0) { g.queued = lane; return; }
      const kind = g.next;
      g.nuts.push({ fx: -0.02, fy: lane, vx: 7.5 / g.A, vy: 0, rot: 0, hits: 0, last: null, kind, gone: false });
      g.nutCount++; g.reload = 0.55;
      g.next = g.nutCount % 6 === 5 || (g.t > 12 && Math.random() < 0.08) ? 'boom' : 'nut';
      snd('bowl');
      g.hintDone = true;
    },
    down(g, x, y) { if (y >= g.lawnY - g.laneH * 0.4) { g.aiming = true; g.aim = laneAt(g, y); } },
    move(g, x, y) { if (g.aiming) g.aim = laneAt(g, y); },
    up(g, x, y, cancel) { if (!g.aiming) return; g.aiming = false; if (!cancel) BOWL.bowl(g, g.aim); },
    draw(g) {
      const Z = g.Z, N = g.N, t = g.t;
      if (g.aiming || g.st === 'count') { ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(0, g.lawnY + g.aim * g.laneH, W, g.laneH); }
      // row by row (back rows first) so a nut bouncing down passes in front of the zombies above it
      for (let r = 0; r < N; r++) {
        for (const z of g.zs) if (z.lane === r) BOWL.drawZ(g, z, t);
        for (const n of g.nuts) if (!n.gone && Math.round(n.fy) === r) BOWL.drawNut(g, n);
      }
      // the next nut waits behind the line (bobbing), in the row you're touching
      const ready = g.reload <= 0 && g.st === 'play' || g.st === 'count', nx = g.startX * 0.48, ny = laneMid(g, g.aim) + g.laneH * 0.32;
      const c = g.next === 'boom' ? boomNut(ready ? 'idle' : 'blink') : pSpr('wallnut', ready ? 'idle' : 'blink');
      shadow(nx, ny, 16 * Z);
      blitR(c, nx, ny - (ready && !RM ? Math.abs(Math.sin(t * 5)) * 3 : 0), Z * 0.9, 16, 31, 0, 1, 1, ready ? 1 : 0.55);
      if (g.next === 'boom' && ready) bigText('BOOM', nx, ny - 26 * Z, Math.round(13 + Z * 2), '#ffb03a');
      if (!g.hintDone && g.st === 'play' && g.t > 0.3) note(g.def.how, W / 2, g.lawnY + N * g.laneH + 26);
    },
    drawZ(g, z, t) {
      const Z = g.Z, x = zX(g, z.fx), y = laneMid(g, z.lane) + g.laneH * 0.36;
      if (z.dead) {
        if (z.ate) { const a = 1 - z.dead / 0.6; if (a <= 0) return; blitR(zSpr(z.kind, 0), x - z.dead * 60, y, Z, 16, 31, 0, 1, 1, a, true); return; }
        const k = clamp(z.dead / 0.3, 0, 1), fa = clamp(1 - (z.dead - 0.45) / 0.4, 0, 1); if (fa <= 0) return;
        blitR(zSpr(z.kind, 0), x + k * 14, y - (z.boom ? Math.sin(k * 3.1) * 30 : 0), Z, 16, 31, k * k * 1.5 * (z.dir || 1) * (z.boom ? 2 : 1), 1, 1, fa, true); return;
      }
      const f = Math.floor(t * 3 + z.ph) % 2, sh = z.hitT > 0 ? (Math.floor(z.hitT * 40) % 2 ? 2 : -2) : 0;
      shadow(x, y, 13 * Z);
      blitR(zSpr(z.kind, f), x + sh, y, Z, 16, 31, z.kb > 0 ? 0.18 : 0, 1, 1, 1, true);
    },
    drawNut(g, n) {
      const Z = g.Z, x = zX(g, n.fx), y = laneMid(g, n.fy) + g.laneH * 0.36;
      shadow(x, y, 16 * Z);
      const c = n.kind === 'boom' ? boomNut('idle') : pSpr('wallnut', n.hits ? 'happy' : 'idle');
      blitR(c, x, y - 10.5 * Z, Z * 0.9, 16, 21, n.rot, 1, 1, 1);
    },
    starsOf(g) { return starsByScore(g.def, g.score); },
  };
  const laneMid = (g, l) => g.lawnY + (l + 0.5) * g.laneH;
  const laneAt = (g, y) => clamp(Math.floor((y - g.lawnY) / g.laneH), 0, g.N - 1);
  const zX = (g, fx) => g.startX + fx * (W - g.startX);
  const aheadIn = (g, lane, fx) => { let k = 0; for (const z of g.zs) if (!z.dead && z.lane === lane && z.fx > fx) k++; return k; };

  // =====================================================================
  // Whack-a-Zombie
  // =====================================================================
  const WHACK = {
    init(g) { g.holes = []; g.spawnT = 0.6; g.streak = 0; g.bestStreak = 0; g.mallets = []; g.hearts = g.maxHearts = 3; g.cols = 0; },
    layout(g) {
      const top = hudBottom() + 12, bot = H - 14, avail = Math.max(160, bot - top);
      if (!g.cols) { const wide = W >= avail * 1.15; g.cols = wide ? 4 : 3; g.rows = wide ? 3 : avail > W * 1.25 ? 4 : 3; g.holes = new Array(g.cols * g.rows).fill(null); }
      g.cw = Math.min(W / g.cols, 280); g.ch = Math.min(avail / g.rows, g.cw * 1.2, 300);
      g.gx = (W - g.cw * g.cols) / 2; g.gy = top + (avail - g.ch * g.rows) * 0.5;
      g.Z = Math.min(g.cw / 27, g.ch / 31);
    },
    holeXY(g, i) { const c = i % g.cols, r = Math.floor(i / g.cols); XY[0] = g.gx + (c + 0.5) * g.cw; XY[1] = g.gy + (r + 0.78) * g.ch; return XY; }, // (one shared array: read it at once)
    bg(g, x) {
      const Z = g.Z, w = Math.ceil(W / Z), h = Math.ceil(H / Z), gy = g.gy / Z;
      paintSky(x, w, Math.max(14, gy - 6));
      for (let yy = Math.round(Math.max(14, gy - 6)); yy < h; yy += 12) for (let xx = 0; xx < w; xx += 12) { x.fillStyle = ((xx + yy) / 12) % 2 ? '#94d46e' : '#a6de7c'; x.fillRect(xx, yy, 12, 12); }
      // little grass tufts scattered on the lawn
      x.fillStyle = '#7cc05a'; for (let i = 0; i < 40; i++) { const X = Math.floor((i * 53.7 % 1) * w), Y = Math.floor(gy + 4 + (i * 0.618 % 1) * (h - gy - 8)); x.fillRect(X, Y, 1, 2); x.fillRect(X + 2, Y - 1, 1, 3); x.fillRect(X + 4, Y, 1, 2); }
    },
    update(g, dt) {
      const p = clamp(g.t / g.def.sec, 0, 1);
      for (const m of g.mallets) m.t += dt;
      if (g.mallets.length && g.mallets[0].t > 0.3) g.mallets.shift();
      let up = 0;
      for (let i = 0; i < g.holes.length; i++) {
        const m = g.holes[i]; if (!m) continue;
        m.t += dt; if (m.hitT > 0) m.hitT -= dt;
        if (m.st === 'up') { m.rise = Math.min(1, m.rise + dt / 0.14); if (m.t > m.upFor) { m.st = 'down'; if (m.kind !== 'sunflower') { if (g.streak >= 3) floatText(g, 'Missed!', ...WHACK.holeXY(g, i).map((v, j) => (j ? v - g.ch * 0.6 : v)), '#d8d0e6', 20); g.streak = 0; } } up++; }
        else { m.rise -= dt / (m.st === 'bonk' ? 0.32 : 0.18); if (m.st === 'bonk' && m.t < 0.22) m.rise = Math.max(m.rise, 0.85); if (m.rise <= 0) g.holes[i] = null; }
      }
      if (g.st !== 'play') return;
      const maxUp = 2 + Math.floor(p * 3);
      if ((g.spawnT -= dt) <= 0 && up < maxUp) {
        g.spawnT = lerp(0.95, 0.42, p) * rand(0.75, 1.2);
        const free = []; for (let i = 0; i < g.holes.length; i++) if (!g.holes[i] && i !== g.lastHole) free.push(i);
        if (free.length) {
          const i = pick(free), u = Math.random();
          const kind = u < 0.17 ? 'sunflower' : u < 0.27 ? 'imp' : p > 0.4 && u < 0.36 ? 'buckethead' : p > 0.1 && u < 0.5 ? 'conehead' : 'basic';
          const upFor = lerp(1.8, 0.9, p) * (kind === 'imp' ? 0.7 : kind === 'sunflower' ? 1.2 : 1);
          g.holes[i] = { kind, st: 'up', t: 0, rise: 0, upFor, hp: kind === 'buckethead' ? 3 : kind === 'conehead' ? 2 : 1, hitT: 0, look: kind };
          g.lastHole = i;
          if (kind !== 'sunflower') { seeZ(kind); snd('pop', { pitch: 0.8 }); } else snd('pop', { pitch: 1.3 });
        }
      }
    },
    down(g, x, y) {
      if (g.st !== 'play') return;
      g.mallets.push({ x, y, t: 0 }); if (g.mallets.length > 4) g.mallets.shift();
      // which hole: the cell under the finger (generous: the whole cell)
      const c = Math.floor((x - g.gx) / g.cw), r = Math.floor((y - g.gy) / g.ch);
      let i = c >= 0 && c < g.cols && r >= 0 && r < g.rows ? r * g.cols + c : -1;
      // a tap just above a cell's zombie (its head pokes into the cell above) counts too
      if ((i < 0 || !g.holes[i] || g.holes[i].st !== 'up') && r + 1 < g.rows && c >= 0 && c < g.cols) { const j = (r + 1) * g.cols + c, m = g.holes[j]; if (m && m.st === 'up' && y > g.gy + (r + 1) * g.ch - g.ch * 0.25) i = j; }
      const m = i >= 0 ? g.holes[i] : null;
      if (!m || m.st !== 'up' || m.rise < 0.3) { snd('tick'); return; }
      const [hx, hy] = WHACK.holeXY(g, i), top = hy - g.ch * 0.75;
      if (m.kind === 'sunflower') { // oops: never bonk a friend
        m.st = 'down'; m.sad = true; m.t = 0; g.hearts--; g.streak = 0; g.shake = RM ? 0 : 0.3;
        snd('bump'); floatText(g, 'Oops!', hx, top, '#ff9aa0', 28);
        if (g.hearts <= 0) endGame(g, 'out');
        return;
      }
      m.hp--; m.hitT = 0.15; sparks(g, hx, top + g.ch * 0.2, 6, '#ffffff');
      if (m.hp > 0) { m.look = 'basic'; m.t = Math.min(m.t, m.upFor - 0.5); g.score += 5; snd('bonk'); floatText(g, 'Bonk!', hx, top, '#ffffff', 24); return; }
      g.streak++; g.bestStreak = Math.max(g.bestStreak, g.streak);
      const pts = (m.kind === 'imp' ? 20 : 10) + Math.min(6, Math.floor(g.streak / 5) * 2);
      g.score += pts; m.st = 'bonk'; m.t = 0;
      snd('whack', { pitch: 1 + 0.06 * Math.min(8, g.streak - 1) });
      floatText(g, '+' + pts, hx, top, m.kind === 'imp' ? '#ffd23a' : '#ffffff', 26);
      if (g.streak % 5 === 0) { g.score += 25; floatText(g, `${g.streak} in a row! +25`, W / 2, g.gy - 4 + 20, '#8fe3ff', 26); snd('cheer', { pitch: 1 + 0.05 * Math.min(6, g.streak / 5), streak: g.streak }); }
    },
    move() {}, up() {},
    draw(g) {
      const Z = g.Z, t = g.t, back = art('hole', 'back'), front = art('hole', 'front');
      for (let i = 0; i < g.holes.length; i++) {
        const [hx, hy] = WHACK.holeXY(g, i), m = g.holes[i];
        blit(back, hx, hy + 6 * Z, Z, 12, 12);
        if (m && m.rise > 0) {
          const k = RM ? (m.rise > 0.5 ? 1 : 0) : 1 - Math.pow(1 - clamp(m.rise, 0, 1), 2);
          // the character is clipped at the hole's middle line, so it rises out of the dirt
          ctx.save(); ctx.beginPath(); ctx.rect(hx - g.cw / 2, hy - g.ch * 1.3, g.cw, g.ch * 1.3); ctx.ellipse(hx, hy, 8.0 * Z, 2.8 * Z, 0, 0, 6.2832); ctx.clip();
          const yy = hy + (1 - k) * 30 * Z + 4 * Z, sh = m.hitT > 0 ? (Math.floor(m.hitT * 40) % 2 ? 2 : -2) : 0;
          if (m.kind === 'sunflower') blitR(pSpr('sunflower', m.sad ? 'sad' : Math.floor(t * 1.2 + i) % 5 ? 'happy' : 'blink'), hx + sh, yy, Z, 16, 31, 0, 1, 1);
          else {
            const bonk = m.st === 'bonk', sq = bonk ? 1 - 0.25 * clamp(1 - m.t / 0.2, 0, 1) : 1;
            blitR(zSpr(m.look, bonk ? 0 : Math.floor(t * 4 + i) % 2, !bonk && m.t > 0.2), hx + sh, yy, Z, 16, 31, bonk ? Math.sin(m.t * 30) * 0.12 : Math.sin(t * 5 + i) * 0.05, 1 / sq, sq, 1, true);
          }
          ctx.restore();
          if (m.st === 'bonk' && m.t < 0.5) { const s = sprC('dizzy', () => PX.fx('spark', '#fff27a')); for (let k2 = 0; k2 < 3; k2++) { const a = t * 8 + k2 * 2.1; blit(s, hx + Math.cos(a) * 9 * Z, hy - 20 * Z + Math.sin(a) * 3 * Z, Z); } }
        }
        blit(front, hx, hy + 6 * Z, Z, 12, 12);
      }
      // the mallet swings down where you tapped
      const ml = art('mallet');
      for (const m of g.mallets) { const k = clamp(m.t / 0.1, 0, 1), a = m.t > 0.2 ? 1 - (m.t - 0.2) / 0.1 : 1; blitR(ml, m.x, m.y, g.Z * 0.85, 7, 7, lerp(-0.9, 0.35, k), 1, 1, a); }
      if (g.t < 4 && g.st === 'play') note(g.def.how, W / 2, Math.min(H - 30, g.gy + g.rows * g.ch + 20));
    },
    starsOf(g) { return starsByScore(g.def, g.score); },
  };

  // =====================================================================
  // Vasebreaker
  // =====================================================================
  // A lawn with a block of vases on the right. Tap a vase: sun or coins (tap them), a plant (it jumps into your tray: tap it, then
  // tap the grass) or a zombie that walks left. Peashooters shoot, Wall-nuts block, Cherry Bombs go boom. Each row's mower saves it
  // once. Break every vase and stop every zombie to win. Kind rules: while you have no plant to fight with, a zombie vase swaps
  // its insides with a plant vase, so nobody ever faces a zombie empty-handed.
  const PLANTS = { peashooter: { hp: 8 }, wallnut: { hp: 40 }, cherrybomb: { hp: 99 } };
  const VASE = {
    init(g) {
      g.R = 0; g.zs = []; g.peas = []; g.picks = []; g.hand = []; g.sel = -1; g.drag = null; g.mowers = []; g.runs = []; g.broken = 0; g.defeated = 0; g.coinsFound = 0;
    },
    layout(g) {
      const top = hudBottom() + 8, trayH = Math.min(104, Math.max(84, H * 0.11)), avail = Math.max(150, H - top - trayH - 10);
      if (!g.R) VASE.setup(g, avail);
      const R = g.R, C = g.C;
      g.cell = Math.max(36, Math.min((W - 10) / (C + 0.75), avail / R, 132));
      g.lx = (W - g.cell * (C + 0.75)) / 2 + g.cell * 0.75; g.ly = top + (avail - R * g.cell) * 0.7;
      g.Z = g.cell / 30; g.trayY = H - trayH; g.trayH = trayH;
    },
    setup(g, avail) {
      g.R = avail / 5 >= 46 ? 5 : 3; g.C = W < 560 ? 6 : W < 900 ? 8 : 9;
      const R = g.R, C = g.C, VC = 3;
      g.grid = []; for (let r = 0; r < R; r++) { const row = []; for (let c = 0; c < C; c++) row.push({ vase: null, plant: null }); g.grid.push(row); }
      g.mowers = new Array(R).fill(true);
      // what's inside (5 rows: 15 vases = 4 zombies, 5 plants, 6 goodies; 3 rows: 9 vases = 2 zombies, 3 plants, 4 goodies)
      const n = R * VC, nz = R === 5 ? 4 : 2, plants = R === 5 ? ['peashooter', 'peashooter', 'peashooter', 'wallnut', 'cherrybomb'] : ['peashooter', 'peashooter', 'cherrybomb'];
      const cells = []; for (let r = 0; r < R; r++) for (let c = C - VC; c < C; c++) cells.push([r, c]);
      cells.sort(() => Math.random() - 0.5);
      let i = 0;
      const put = (inside, kind) => { const [r, c] = cells[i++]; g.grid[r][c].vase = { kind, inside, wob: Math.random() * 6 }; };
      plants.forEach((sp, j) => put({ t: 'plant', sp }, j < 3 ? 'leaf' : 'clay'));
      for (let j = 0; j < nz; j++) put({ t: 'zombie', kind: j % 2 && R === 5 ? 'conehead' : 'basic' }, 'clay');
      const goods = n - plants.length - nz;
      for (let j = 0; j < goods; j++) put({ t: j % 2 ? 'coin' : 'sun' }, j < 2 ? 'gold' : 'clay');
      g.vases = n;
    },
    bg(g, x) {
      const Z = g.Z, w = Math.ceil(W / Z), h = Math.ceil(H / Z), cs = g.cell / Z, lx = g.lx / Z, ly = g.ly / Z, R = g.R, C = g.C;
      paintSky(x, w, ly);
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { x.fillStyle = (r + c) % 2 ? '#94d46e' : '#a6de7c'; x.fillRect(Math.round(lx + c * cs), Math.round(ly + r * cs), Math.ceil(cs), Math.ceil(cs)); }
      // the vase block's grass is a touch darker (that's where the surprises are)
      x.fillStyle = 'rgba(40,80,30,.12)'; x.fillRect(Math.round(lx + (C - 3) * cs), Math.round(ly), Math.ceil(3 * cs), Math.ceil(R * cs));
      // the path the mowers wait on
      x.fillStyle = '#d8cbb4'; x.fillRect(0, Math.round(ly), Math.round(lx), Math.ceil(R * cs)); x.fillStyle = '#c4b49a'; x.fillRect(Math.round(lx) - 1, Math.round(ly), 1, Math.ceil(R * cs));
      paintPath(x, w, h, ly + R * cs);
    },
    cellXY(g, r, c) { XY[0] = g.lx + (c + 0.5) * g.cell; XY[1] = g.ly + (r + 0.5) * g.cell; return XY; },
    hasDefence(g) { if (g.hand.length) return true; for (const row of g.grid) for (const k of row) if (k.plant && k.plant.sp !== 'cherrybomb') return true; return false; },
    smash(g, r, c) {
      const k = g.grid[r][c], v = k.vase; if (!v) return;
      // kind rule: no zombie while you have nothing to fight it with (swap with an unbroken plant vase, if there is one)
      if (v.inside.t === 'zombie' && !VASE.hasDefence(g)) {
        outer: for (const row of g.grid) for (const o of row) if (o.vase && o.vase.inside.t === 'plant') { const tmp = o.vase.inside; o.vase.inside = v.inside; v.inside = tmp; break outer; }
      }
      k.vase = null; g.broken++; g.score += 10;
      const [x, y] = VASE.cellXY(g, r, c);
      snd('smash');
      for (let i = 0; i < 6; i++) part(g, art('shard', v.kind, i % 3), x, y, rand(-160, 160), rand(-320, -140), rand(0.5, 0.8), g.Z, { gr: 900 });
      const ins = v.inside;
      if (ins.t === 'zombie') {
        const z = { r, x: c + 0.5, kind: ins.kind, look: ins.kind, hp: ins.kind === 'conehead' ? 11 : 6, sp: 0.23, ph: Math.random() * 2, eat: null, chompT: 0, rise: 0, hitT: 0, dead: 0 };
        g.zs.push(z); seeZ(ins.kind); snd('brains'); floatText(g, 'A zombie!', x, y - g.cell * 0.6, '#c8f0a0', 22);
      } else if (ins.t === 'plant') {
        if (g.hand.length >= 5) { g.picks.push({ kind: 'sun', x, y, t: 0, y0: y }); return; }
        g.picks.push({ kind: 'seed', sp: ins.sp, x, y, t: 0, x0: x, y0: y }); snd('pop', { pitch: 1.4 });
      } else g.picks.push({ kind: ins.t, x, y, t: 0, y0: y });
    },
    trayRect(g, i) { const n = Math.max(g.hand.length, 1), w = Math.min(76, (W - 24) / 5 - 8), gap = 8, x0 = W / 2 - (n * (w + gap) - gap) / 2; RC[0] = x0 + i * (w + gap); RC[1] = g.trayY + 8; RC[2] = w; RC[3] = g.trayH - 16; return RC; },
    cellAt(g, x, y) { const c = Math.floor((x - g.lx) / g.cell), r = Math.floor((y - g.ly) / g.cell); return r >= 0 && r < g.R && c >= 0 && c < g.C ? [r, c] : null; },
    canPlant(g, r, c) { const k = g.grid[r][c]; return !k.vase && !k.plant && !g.zs.some(z => !z.dead && z.r === r && Math.abs(z.x - (c + 0.5)) < 0.6); },
    plant(g, i, r, c) {
      const sp = g.hand[i]; if (!sp || !VASE.canPlant(g, r, c)) return false;
      g.hand.splice(i, 1); g.sel = g.hand.length ? 0 : -1; // (the next plant is ready: tap grass again, or tap another card)
      g.grid[r][c].plant = { sp, hp: PLANTS[sp].hp, cool: 0.4, t: 0, hitT: 0 };
      snd('plant'); const [x, y] = VASE.cellXY(g, r, c); sparks(g, x, y + g.cell * 0.3, 5, '#c8f0a0');
      return true;
    },
    down(g, x, y) {
      if (g.st !== 'play') return;
      // the tray: pick a plant (and maybe drag it)
      for (let i = 0; i < g.hand.length; i++) { const [tx, ty, tw, th] = VASE.trayRect(g, i); if (x >= tx - 4 && x <= tx + tw + 4 && y >= ty - 6 && y <= ty + th + 6) { g.sel = i; g.drag = { i, x, y, moved: false }; snd('select'); return; } }
      // a sun or coin
      for (const p of g.picks) if ((p.kind === 'sun' || p.kind === 'coin') && !p.got && Math.hypot(p.x - x, p.y - y) < Math.max(34, g.cell * 0.55)) { VASE.collect(g, p); return; }
      const rc = VASE.cellAt(g, x, y); if (!rc) return;
      const [r, c] = rc, k = g.grid[r][c];
      if (k.vase) { VASE.smash(g, r, c); return; }
      if (g.hand.length) {
        const i = g.sel >= 0 ? g.sel : g.hand.length === 1 ? 0 : -1;
        if (i < 0) { floatText(g, 'Tap a plant first!', W / 2, g.trayY - 20, '#ffffff', 20); return; }
        if (!VASE.plant(g, i, r, c)) snd('bump');
      }
    },
    move(g, x, y) { if (g.drag) { g.drag.x = x; g.drag.y = y; if (y < g.trayY - 6) g.drag.moved = true; } },
    up(g, x, y, cancel) {
      const d = g.drag; g.drag = null; if (!d || cancel || !d.moved) return;
      const rc = VASE.cellAt(g, x, y); if (rc && VASE.plant(g, d.i, rc[0], rc[1])) return;
      snd('back');
    },
    collect(g, p) {
      p.got = true; p.t = 0; p.x0 = p.x; p.y0 = p.y;
      if (p.kind === 'sun') { g.score += 15; snd('sun'); floatText(g, '+15', p.x, p.y - 20, '#fff27a', 22); }
      else { g.score += 10; g.coinsFound++; snd('coin'); floatText(g, '+1 coin', p.x, p.y - 20, '#ffd23a', 22); }
    },
    update(g, dt) {
      const R = g.R;
      for (const v of g.picks) {
        v.t += dt;
        if (v.kind === 'seed') { if (v.t >= 0.55 && !v.done) { v.done = true; g.hand.push(v.sp); if (g.hand.length === 1) g.sel = 0; } }
        else if (!v.got && v.t > 5) VASE.collect(g, v); // nobody tapped it: it collects itself
      }
      let n = 0; for (const v of g.picks) if (!(v.done || (v.got && v.t > 0.6))) g.picks[n++] = v; g.picks.length = n;
      for (let r = 0; r < R; r++) for (let c = 0; c < g.C; c++) {
        const k = g.grid[r][c], pl = k.plant; if (!pl) continue;
        pl.t += dt; if (pl.hitT > 0) pl.hitT -= dt;
        if (pl.sp === 'cherrybomb') {
          if (pl.t > 1.0) { // BOOM: a 3 x 3 blast
            k.plant = null; const [x, y] = VASE.cellXY(g, r, c); boomFx(g, x, y);
            for (const z of g.zs) if (!z.dead && Math.abs(z.r - r) <= 1 && Math.abs(z.x - (c + 0.5)) <= 1.6) { z.dead = 0.01; z.boom = true; VASE.defeat(g, z); }
          }
          continue;
        }
        if (pl.sp === 'peashooter' && (pl.cool -= dt) <= 0) {
          if (zAhead(g, r, c)) { pl.cool = 1.3; pl.shotT = 0.15; g.peas.push({ r, x: c + 0.85, gone: false }); snd('pop', { pitch: 1.6 }); }
          else pl.cool = 0.2;
        }
        if (pl.shotT > 0) pl.shotT -= dt;
      }
      for (const p of g.peas) {
        if (p.gone) continue;
        p.x += 5 * dt; if (p.x > g.C + 0.5) { p.gone = true; continue; }
        for (const z of g.zs) if (!z.dead && z.rise >= 1 && z.r === p.r && Math.abs(z.x - p.x) < 0.3) {
          p.gone = true; z.hp--; z.hitT = 0.12; snd('bonk', { pitch: 1.5 });
          if (z.kind === 'conehead' && z.hp <= 6) z.look = 'basic';
          if (z.hp <= 0) { z.dead = 0.01; VASE.defeat(g, z); }
          break;
        }
      }
      if (g.peas.length > 10) { let m = 0; for (const p of g.peas) if (!p.gone) g.peas[m++] = p; g.peas.length = m; }
      for (const z of g.zs) {
        if (z.dead) { z.dead += dt; continue; }
        if (z.hitT > 0) z.hitT -= dt;
        if (z.rise < 1) { z.rise = Math.min(1, z.rise + dt / 0.6); continue; }
        // eating the plant in front of it?
        const c = Math.floor(z.x - 0.45), k = c >= 0 && c < g.C ? g.grid[z.r][c] : null;
        if (k && k.plant && k.plant.sp !== 'cherrybomb' && z.x - (c + 0.5) < 0.62) {
          k.plant.hp -= 2 * dt; k.plant.hitT = 0.1; z.eat = true;
          if ((z.chompT -= dt) <= 0) { z.chompT = 0.7; snd('chomp'); }
          if (k.plant.hp <= 0) { k.plant = null; snd('bump'); z.eat = false; }
          continue;
        }
        z.eat = false; z.x -= z.sp * dt;
        if (z.x < -0.25) { // reached the house's path: the row's mower, or the game is over
          if (g.mowers[z.r]) { g.mowers[z.r] = false; g.runs.push({ r: z.r, x: -0.5 }); snd('whoosh'); floatText(g, 'Mower!', g.lx + g.cell, g.ly + (z.r + 0.2) * g.cell, '#ffffff', 24); }
          else if (z.x < -0.55) { endGame(g, 'lose'); return; }
        }
      }
      for (const m of g.runs) {
        if (m.x > g.C + 1) continue;
        m.x += 7 * dt;
        for (const z of g.zs) if (!z.dead && z.r === m.r && Math.abs(z.x - m.x) < 0.5) { z.dead = 0.01; z.mowed = true; VASE.defeat(g, z); }
      }
      if (g.zs.length > 10) g.zs = g.zs.filter(z => !(z.dead > 1.2));
      // done: every vase broken and every zombie stopped (and nothing left lying around)
      if (g.st === 'play' && g.broken >= g.vases && !zAlive(g) && !picksLeft(g)) endGame(g, 'win');
    },
    defeat(g, z) { g.defeated++; g.score += 25; const [x, y] = VASE.cellXY(g, z.r, 0); floatText(g, '+25', g.lx + z.x * g.cell, y - g.cell * 0.6, '#ffffff', 24); void x; },
    draw(g) {
      const Z = g.Z, t = g.t, cs = g.cell;
      // the mowers waiting on the path (and the ones out on a run)
      const mc = prop('lawnmower');
      for (let r = 0; r < g.R; r++) if (g.mowers[r]) blit(mc, g.lx - cs * 0.38, g.ly + (r + 0.86) * cs, Z);
      // which squares a plant can go on (while one is picked)
      if ((g.sel >= 0 || g.drag) && g.hand.length) {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.18 + 0.08 * Math.sin(t * 6)).toFixed(3) + ')';
        for (let r = 0; r < g.R; r++) for (let c = 0; c < g.C; c++) if (VASE.canPlant(g, r, c)) ctx.fillRect(g.lx + c * cs + 3, g.ly + r * cs + 3, cs - 6, cs - 6);
      }
      for (let r = 0; r < g.R; r++) {
        for (let c = 0; c < g.C; c++) {
          const k = g.grid[r][c], [x, y] = VASE.cellXY(g, r, c), fy = y + cs * 0.42;
          if (k.vase) { const w = RM ? 0 : Math.max(0, Math.sin(t * 1.3 + k.vase.wob) - 0.93) * 3; blitR(art('vase', k.vase.kind), x, fy, Z * 1.15, 9, 21, Math.sin(t * 30) * 0.06 * w, 1, 1); }
          if (k.plant) {
            const pl = k.plant, sh = pl.hitT > 0 ? (Math.floor(t * 40) % 2 ? 1.5 : -1.5) : 0;
            shadow(x, fy, 14 * Z);
            if (pl.sp === 'cherrybomb') { const s = 1 + pl.t * 0.25 + Math.sin(pl.t * 40) * 0.04; blitR(pSpr('cherrybomb', 'idle'), x + sh, fy, Z * 0.95, 16, 31, 0, s, s); }
            else blitR(pSpr(pl.sp, pl.shotT > 0 ? 'happy' : Math.floor(t * 0.8 + c) % 6 ? 'idle' : 'blink'), x + sh, fy, Z * 0.95, 16, 31, 0, 1, pl.shotT > 0 ? 0.92 : 1 + 0.02 * Math.sin(t * 3 + c));
          }
        }
        for (const z of g.zs) if (z.r === r) VASE.drawZ(g, z, t);
        for (const m of g.runs) if (m.r === r && m.x <= g.C + 1) blit(mc, g.lx + m.x * cs, g.ly + (r + 0.86) * cs, Z);
      }
      // peas
      ctx.fillStyle = '#86d64a'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      for (const p of g.peas) if (!p.gone) { ctx.beginPath(); ctx.arc(g.lx + p.x * cs, g.ly + (p.r + 0.38) * cs, Math.max(4, cs * 0.09), 0, 6.2832); ctx.fill(); ctx.stroke(); }
      // sun, coins and seeds flying to the tray
      for (const v of g.picks) {
        if (v.kind === 'seed') { const k = clamp(v.t / 0.55, 0, 1), [tx, ty, tw] = VASE.trayRect(g, g.hand.length); blitR(pSpr(v.sp, 'happy'), lerp(v.x0, tx + tw / 2, k), lerp(v.y0, ty + 40, k) - Math.sin(k * 3.14) * 60, Z * 0.95, 16, 31, 0, 1, 1); continue; }
        const c = v.kind === 'sun' ? art('sun') : coinIc(), bob = Math.sin(v.t * 4) * 3, s = v.kind === 'sun' ? Z * 1.6 : Z * 2;
        if (v.got) { const k = clamp(v.t / 0.5, 0, 1); blitR(c, lerp(v.x0, 60, k), lerp(v.y0, 30, k), s, null, null, 0, 1, 1, 1 - k * 0.6); }
        else blitR(c, v.x, Math.min(v.y0 + v.t * 40, v.y0 + 22) + bob, s, null, null, v.kind === 'sun' ? v.t * 0.8 : 0, 1, 1);
      }
      VASE.drawTray(g);
      if (g.st === 'play' && g.broken === 0 && g.t > 0.4) note(g.def.how, W / 2, Math.max(hudBottom() + 22, g.ly - 22));
    },
    drawZ(g, z, t) {
      const Z = g.Z, x = g.lx + z.x * g.cell, y = g.ly + (z.r + 0.92) * g.cell;
      if (z.dead) {
        const k = clamp(z.dead / 0.3, 0, 1), fa = clamp(1 - (z.dead - 0.45) / 0.4, 0, 1); if (fa <= 0) return;
        blitR(zSpr(z.look, 0), x + (z.mowed ? z.dead * 300 : 0), y - (z.boom || z.mowed ? Math.sin(k * 3.1) * 40 : 0), Z, 16, 31, k * k * 1.4 * (z.boom || z.mowed ? 3 : 1), 1, 1, fa, true); return;
      }
      if (z.rise < 1) { // climbing out of the broken vase
        ctx.save(); ctx.beginPath(); ctx.rect(x - g.cell, y - g.cell * 1.6, g.cell * 2, g.cell * 1.6 - 2); ctx.clip();
        blitR(zSpr(z.look, 0), x, y + (1 - z.rise) * 26 * Z, Z, 16, 31, 0, 1, 1, 1, true); ctx.restore(); return;
      }
      const f = z.eat ? Math.floor(t * 5) % 2 : Math.floor(t * 2.5 + z.ph) % 2, sh = z.hitT > 0 ? 1.5 : 0;
      shadow(x, y, 13 * Z);
      blitR(zSpr(z.look, f, z.eat && f === 1), x + sh, y, Z, 16, 31, z.eat ? -0.08 : 0, 1, 1, 1, true);
    },
    drawTray(g) {
      ctx.fillStyle = 'rgba(78,50,24,.92)'; ctx.fillRect(0, g.trayY, W, g.trayH); ctx.fillStyle = '#b0824c'; ctx.fillRect(0, g.trayY, W, 4);
      if (!g.hand.length) {
        ctx.font = `800 16px ${F_UI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f6e6c4';
        ctx.fillText(g.broken ? 'Plants from vases land here.' : 'Break a vase!', W / 2, g.trayY + g.trayH / 2 + 2); return;
      }
      for (let i = 0; i < g.hand.length; i++) {
        const [x, y, w, h] = VASE.trayRect(g, i), on = i === g.sel, d = g.drag && g.drag.i === i && g.drag.moved;
        rr(x, y - (on ? 4 : 0), w, h, 10); ctx.fillStyle = on ? '#fff3a6' : '#fbf3dc'; ctx.fill(); ctx.lineWidth = on ? 4 : 2; ctx.strokeStyle = on ? '#e0a020' : INK; ctx.stroke();
        if (!d) blitR(pSpr(g.hand[i], on ? 'happy' : 'idle'), x + w / 2, y + h - 6 - (on ? 4 : 0), Math.min(w / 30, (h - 6) / 28), 16, 31, 0, 1, 1);
      }
      if (g.drag && g.drag.moved) blitR(pSpr(g.hand[g.drag.i], 'happy'), g.drag.x, g.drag.y + 10, g.Z, 16, 31, 0, 1, 1, 0.85);
    },
    starsOf(g) { if (g.outcome !== 'win') return 0; const used = g.mowers.filter(m => !m).length; return used === 0 ? 3 : used <= 2 ? 2 : 1; },
  };
  function zAhead(g, r, c) { for (const z of g.zs) if (!z.dead && z.rise >= 1 && z.r === r && z.x > c + 0.3 && z.x < g.C + 0.2) return true; return false; }
  function zAlive(g) { for (const z of g.zs) if (!z.dead) return true; return false; }
  function picksLeft(g) { for (const v of g.picks) if (!v.got && v.kind !== 'seed') return true; return false; }
  // ---------------- little painters for the new games' backdrops (1 art px, no smoothing) ----------------
  function puff(x, cx, cy, r, col) { x.fillStyle = col; for (let dy = -Math.floor(r); dy <= r; dy++) { const hw = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy))); x.fillRect(Math.round(cx - hw), Math.round(cy + dy), hw * 2, 1); } }
  function cloud(x, cx, cy, s) { puff(x, cx, cy, s, '#ffffff'); puff(x, cx - s * 1.1, cy + s * 0.35, s * 0.7, '#ffffff'); puff(x, cx + s * 1.2, cy + s * 0.3, s * 0.8, '#ffffff'); }
  // a strip drawn in front of the sprites (made on a resize only)
  function strip(w, h, paint) { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); const x = c.getContext('2d'); x.imageSmoothingEnabled = false; paint(x, c.width, c.height); return c; }
  function shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // =====================================================================
  // Sun Catcher
  // =====================================================================
  // A Sunflower in a flower pot slides along the bottom (touch and drag anywhere): catch the falling sun (a big sun is worth more),
  // dodge the cones and buckets a zombie behind the hedge throws down (it shakes and shouts "!" first). Catches in a row make a
  // combo (x2 from 5, x3 from 10); a sun that hits the grass ends it. Two sun showers sweep across the sky.
  const SUNC = {
    init(g) {
      g.items = []; g.px = -1; g.tx = -1; g.lean = 0; g.spawnT = 0.5; g.lastX = -1; g.hazT = 2; g.combo = 0; g.bestCombo = 0; g.caught = 0;
      g.hearts = g.maxHearts = 3; g.happyT = 0; g.sadT = 0; g.showers = 0; g.showerN = 0; g.showerDir = 1; g.bk = 'sun';
      g.thr = { x: 0.3, dir: 1, look: 'conehead', windT: 0, backT: 0 }; seeZ('conehead'); seeZ('basic');
    },
    layout(g) {
      const top = hudBottom() + 4;
      g.Z = clamp(Math.min(W / 140, H / 200), 1.6, 4.2);
      g.groundY = H - Math.max(12, 5 * g.Z);
      g.roofY = top + 30 * g.Z;           // the zombie's feet, behind the hedge
      g.catchY = g.groundY - 24 * g.Z;    // the Sunflower's face
      g.reach = 15 * g.Z;
      const m = 13 * g.Z;
      if (g.px < 0) { g.px = g.tx = W / 2; }
      g.px = clamp(g.px, m, W - m); g.tx = clamp(g.tx, m, W - m);
      g.hedgeC = strip(Math.ceil(W / g.Z) + 2, 15, (x, w) => {
        x.fillStyle = '#5ea844'; x.fillRect(0, 6, w, 9);
        for (let i = 0; i < w + 6; i += 6) puff(x, i, 6, 3.6, '#6cb84e');
        for (let i = 3; i < w + 6; i += 6) puff(x, i, 7, 3.0, '#7cc85a');
        x.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 1; i < w; i += 6) x.fillRect(i, 3, 2, 1);
        x.fillStyle = '#4e9a3a'; x.fillRect(0, 14, w, 1);
      });
    },
    bg(g, x) {
      const Z = g.Z, w = Math.ceil(W / Z), h = Math.ceil(H / Z), gy = g.groundY / Z, ry = g.roofY / Z;
      const S = ['#7ec6ee', '#92d0f0', '#a8daf4', '#bee4f6', '#d2ecf8', '#e4f4fa'];
      for (let i = 0; i < 6; i++) { x.fillStyle = S[i]; x.fillRect(0, Math.round(h * i / 6), w, Math.ceil(h / 6) + 1); }
      for (let i = 0; i < 4; i++) cloud(x, ((i * 0.31 + 0.12) % 1) * w, ry + 12 + ((i * 0.57) % 1) * Math.max(8, gy - ry - 60), 4 + (i % 2) * 2);
      const ly = Math.round(gy - 4);
      for (let c = 0; c * 8 < w; c++) { x.fillStyle = c % 2 ? '#94d46e' : '#a6de7c'; x.fillRect(c * 8, ly, 8, h - ly); }
      x.fillStyle = '#7cc05a'; x.fillRect(0, ly, w, 1);
    },
    update(g, dt) {
      const p = clamp(g.t / g.def.sec, 0, 1), Z = g.Z, T = g.thr;
      // the pot slides to the finger (quick but smooth) and leans the way it goes
      const prev = g.px; g.px += (g.tx - g.px) * Math.min(1, dt * 14);
      g.lean = dt > 0 ? clamp((g.px - prev) / dt / 1600, -0.22, 0.22) : 0;
      if (g.happyT > 0) g.happyT -= dt; if (g.sadT > 0) g.sadT -= dt;
      if (g.st === 'play') {
        // the zombie behind the hedge wanders towards the pot, winds up ("!") and throws its cone or bucket
        if (T.windT > 0) {
          if ((T.windT -= dt) <= 0) {
            T.windT = 0; const kind = T.look === 'buckethead' ? 'bucket' : 'cone';
            g.items.push({ kind, x: T.x * W, y: g.roofY - 20 * Z, vy: (g.catchY - g.roofY + 20 * Z) / (lerp(2.3, 1.6, p)), t: 0, rot: 0, st: 0, vx: 0 });
            T.look = 'basic'; T.backT = 1.1; g.hazT = lerp(5.0, 2.7, p) * rand(0.85, 1.2); snd('whoosh');
          }
        } else {
          const want = clamp(g.px / W + Math.sin(g.t * 0.9) * 0.18, 0.08, 0.92);
          T.dir = want > T.x + 0.02 ? 1 : want < T.x - 0.02 ? -1 : T.dir;
          if (Math.abs(want - T.x) > 0.02) T.x = clamp(T.x + T.dir * dt * (0.07 + 0.08 * p), 0.06, 0.94);
          if (T.backT > 0 && (T.backT -= dt) <= 0) { T.look = p > 0.3 && Math.random() < 0.5 ? 'buckethead' : 'conehead'; seeZ(T.look); }
          if (g.t > 4 && T.backT <= 0 && (g.hazT -= dt) <= 0) { T.windT = 0.75; snd('brains'); }
        }
        // the sun: a steady drizzle near the last one (so a little finger can reach it), big ones now and then, two showers
        if (g.showers < 2 && g.t > 20 + g.showers * 20) { g.showers++; g.showerN = 7; g.showerDir = g.px < W / 2 ? 1 : -1; g.spawnT = 0.6; banner('Sun shower!'); snd('cheer'); }
        if ((g.spawnT -= dt) <= 0) {
          const shower = g.showerN > 0, m = 16 * Z;
          let x;
          if (shower) { g.showerN--; x = g.lastX + g.showerDir * Math.min(W * 0.11, 90); if (x < m || x > W - m) { g.showerDir *= -1; x = g.lastX + g.showerDir * Math.min(W * 0.11, 90); } g.spawnT = 0.3; }
          else { x = g.lastX < 0 ? W / 2 : g.lastX + rand(-0.4, 0.4) * Math.min(W, 640); g.spawnT = lerp(0.9, 0.55, p) * rand(0.85, 1.2); }
          x = clamp(x, m, W - m); g.lastX = x;
          const big = !shower && Math.random() < 0.15;
          g.items.push({ kind: big ? 'big' : 'sun', x, y: g.roofY - 22 * Z, vy: (g.catchY - g.roofY + 22 * Z) / (lerp(2.6, 1.75, p) * (big ? 1.2 : 1)), t: 0, rot: 0, st: 0, vx: 0 });
        }
      }
      // falling things: caught by the flower, or they land on the grass
      let n = 0;
      for (const it of g.items) {
        it.t += dt;
        if (it.st === 0) {
          it.y += it.vy * dt; it.rot += dt * (it.kind === 'cone' || it.kind === 'bucket' ? 4 : 0.8);
          const r = (it.kind === 'big' ? 12 : 7.5) * Z;
          const haz = it.kind === 'cone' || it.kind === 'bucket'; // (a cone has to hit the flower itself; a sun only has to come close)
          if (g.st === 'play' && it.y >= g.catchY - r && it.y <= g.catchY + 12 * Z && Math.abs(it.x - g.px) < (haz ? g.reach * 0.6 + r * 0.3 : g.reach + r * 0.7) && !(haz && g.sadT > 0)) SUNC.grab(g, it);
          else if (it.y > g.groundY - 5 * Z) {
            it.st = 2; it.t = 0; it.y = g.groundY - 5 * Z;
            if (it.kind === 'sun' || it.kind === 'big') { if (g.st === 'play' && g.combo >= 3) floatText(g, 'Missed!', it.x, it.y - 30, '#e6f2ff', 20); if (g.st === 'play') g.combo = 0; }
            else snd('bump', { pitch: 0.8 });
          }
        } else if (it.st === 3) { it.vy += 1500 * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rot += dt * 9; }
        if (!(it.st === 1 && it.t > 0.3) && !(it.st === 2 && it.t > 0.7) && !(it.st === 3 && it.t > 1.0)) g.items[n++] = it;
      }
      g.items.length = n;
    },
    grab(g, it) {
      const Z = g.Z;
      if (it.kind === 'cone' || it.kind === 'bucket') { // ouch: it bounces off the flower
        it.st = 3; it.t = 0; it.vx = (it.x < g.px ? -1 : 1) * 260; it.vy = -520;
        g.hearts--; g.combo = 0; g.sadT = 1.3; // (blinks: nothing else can hit it for a moment) g.shake = RM ? 0 : 0.3; snd('bonk'); snd('bump');
        floatText(g, 'Ouch!', g.px, g.catchY - 30 * Z, '#ff9aa0', 30); PX.buzz && PX.buzz(25);
        if (g.hearts <= 0) endGame(g, 'out');
        return;
      }
      it.st = 1; it.t = 0;
      g.combo++; g.bestCombo = Math.max(g.bestCombo, g.combo); g.caught++;
      const mult = g.combo >= 10 ? 3 : g.combo >= 5 ? 2 : 1, pts = (it.kind === 'big' ? 25 : 10) * mult;
      g.score += pts; g.happyT = 0.35;
      snd('sun', { pitch: 1 + 0.04 * Math.min(10, g.combo) });
      floatText(g, '+' + pts, it.x, g.catchY - 36 * Z, mult > 1 ? '#ffd23a' : '#fff27a', it.kind === 'big' ? 32 : 26);
      if (g.combo === 5 || g.combo === 10 || (g.combo > 10 && g.combo % 10 === 0)) {
        floatText(g, g.combo === 5 ? 'Combo x2!' : g.combo === 10 ? 'Combo x3!' : `${g.combo} in a row!`, W / 2, g.roofY + 50, '#8fe3ff', 32);
        snd('cheer', { pitch: 1 + 0.05 * Math.min(6, g.combo / 5), streak: g.combo });
      }
      sparks(g, it.x, it.y, it.kind === 'big' ? 9 : 5, '#fff27a');
      g.hintDone = true;
    },
    down(g, x) { g.dragging = true; g.tx = clamp(x, 13 * g.Z, W - 13 * g.Z); },
    move(g, x) { if (g.dragging) g.tx = clamp(x, 13 * g.Z, W - 13 * g.Z); },
    up(g) { g.dragging = false; },
    draw(g) {
      const Z = g.Z, t = g.t, T = g.thr, sun = art('sun');
      // the zombie behind the hedge (it faces the way it walks; it shakes before a throw)
      const wind = T.windT > 0, zx = T.x * W + (wind && !RM ? Math.sin(t * 40) * 2 : 0);
      blitR(zSpr(T.look, wind ? 0 : Math.floor(t * 3) % 2, wind), zx, g.roofY, Z, 16, 31, wind ? -0.1 : 0, 1, 1, 1, T.dir < 0);
      if (wind) bigText('!', zx + 10 * Z, g.roofY - 30 * Z, Math.round(18 + 6 * Z), '#ff6b7a');
      blit(g.hedgeC, 0, g.roofY - 11 * Z, Z, 0, 0);
      // a shadow on the grass under each cone / bucket on its way down (so you can see where it lands)
      for (const it of g.items) if (it.st === 0 && (it.kind === 'cone' || it.kind === 'bucket')) { const k = clamp((it.y - g.roofY) / (g.groundY - g.roofY), 0, 1); ctx.fillStyle = `rgba(60,30,40,${(0.12 + 0.25 * k).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(it.x, g.groundY - 2 * Z, (5 + 7 * k) * Z, (1.4 + 1.6 * k) * Z, 0, 0, 6.2832); ctx.fill(); }
      // the Sunflower in its pot
      const px = g.px, gy = g.groundY, sad = g.sadT > 0;
      const pose = sad ? 'sad' : g.happyT > 0 ? 'happy' : Math.floor(t * 0.7) % 5 === 4 ? 'blink' : 'idle';
      shadow(px, gy, 22 * Z);
      const blink = sad && !RM && Math.floor(t * 12) % 2 ? 0.45 : 1;
      blitR(pSpr('sunflower', pose), px + (sad && !RM ? Math.sin(t * 40) * 2 : 0), gy - 8 * Z, Z, 16, 31, g.lean * 0.8, 1, g.happyT > 0 && !RM ? 1.06 : 1, blink);
      blitR(art('pot'), px, gy, Z, 13, 15, g.lean * 0.3, 1, 1, 1);
      // the falling things
      for (const it of g.items) {
        if (it.kind === 'sun' || it.kind === 'big') {
          const s = (it.kind === 'big' ? 2.2 : 1.45) * Z;
          if (it.st === 1) { const k = clamp(it.t / 0.3, 0, 1); blitR(sun, lerp(it.x, px, k), lerp(it.y, g.catchY, k), s * (1 - k * 0.8), 8, 8, it.rot, 1, 1, 1 - k); continue; }
          if (it.kind === 'big' && it.st === 0) { ctx.globalAlpha = 0.28 + 0.12 * Math.sin(t * 8); ctx.fillStyle = '#fff6a0'; ctx.beginPath(); ctx.arc(it.x, it.y, 13 * Z, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1; }
          blitR(sun, it.x + (it.st === 0 && !RM ? Math.sin(it.t * 3 + it.x) * 2 : 0), it.y, s, 8, 8, it.rot, 1, 1, it.st === 2 ? 1 - it.t / 0.7 : 1);
        } else blitR(art(it.kind), it.x, it.y, Z * 1.3, it.kind === 'cone' ? 7 : 8, it.kind === 'cone' ? 8 : 7.5, it.rot, 1, 1, it.st === 2 ? 1 - it.t / 0.7 : 1);
      }
      if (!g.hintDone && g.st === 'play' && g.t > 0.3) note(g.def.how, W / 2, (g.roofY + g.catchY) / 2);
    },
    starsOf(g) { return starsByScore(g.def, g.score); },
    extra(g) { return g.bestCombo >= 3 ? `Best combo: <b>${g.bestCombo}</b> in a row` : `Sun caught: <b>${g.caught}</b>`; },
  };
  function banner(text) { try { if (PS.ui.fx && PS.ui.fx.banner) PS.ui.fx.banner(text, { tone: 'info', ms: 900 }); else if (G) floatText(G, text, W / 2, H * 0.35, '#ffd23a', 36); } catch (e) { /* optional */ } }

  // =====================================================================
  // Plant Pairs
  // =====================================================================
  // Seed-packet cards, face down: flip two, find the same plant twice. Board 1 is 12 cards (6 pairs); then 16-card boards with
  // two zombie cards: flip one and it shuffles two hidden cards around (then gets bonked away). Every board shows its cards for a
  // moment first ("Look!"). Pairs in a row score more; a cleared board gives a bonus and deals the next one. 90 seconds.
  const PAIR_SP = ['peashooter', 'sunflower', 'wallnut', 'cherrybomb', 'snowpea', 'chomper', 'puffshroom', 'repeater', 'squash', 'potatomine', 'marigold', 'jalapeno', 'cactus', 'starfruit', 'torchwood', 'kernelpult', 'cabbagepult', 'iceberglettuce'];
  const PAIRS = {
    init(g) { g.cards = []; g.boards = 0; g.found = 0; g.streak = 0; g.bestStreak = 0; g.open = []; g.waitT = 0; g.lockT = 0; g.peekT = 0; g.nextT = 0; g.zq = null; g.cols = 0; g.bk = 'pairs'; },
    deal(g) {
      const big = g.boards >= 1, land = W > (H - hudBottom()) * 1.05;
      const cols = big ? 4 : land ? 4 : 3, rows = big ? 4 : land ? 3 : 4, nZ = big ? 2 : 0, nP = (cols * rows - nZ) / 2;
      const pool = shuffleArr(PAIR_SP.filter(s => D.PLANTS[s])), list = [];
      for (let i = 0; i < nP; i++) { const s = pool[i % pool.length]; list.push(s, s); }
      for (let i = 0; i < nZ; i++) list.push(i ? 'z:conehead' : 'z:basic');
      shuffleArr(list);
      g.cols = cols; g.rows = rows; g.boards++;
      g.cards = list.map((s, i) => ({ sp: s, z: s.indexOf('z:') === 0 ? s.slice(2) : null, slot: i, f: 1, face: true, done: 0, x: -1, y: -1, shake: 0, delay: i * 0.03 }));
      g.peekT = g.boards === 1 ? 2.4 : 1.8; g.open.length = 0; g.waitT = 0; g.zq = null;
      for (const c of g.cards) if (c.z) seeZ(c.z);
      if (W) { PAIRS.layout(g); paintBg(); }
    },
    layout(g) {
      const top = hudBottom() + 10, avail = Math.max(160, H - top - 14);
      if (!g.cols) PAIRS.deal(g);
      const gap = Math.max(8, Math.min(14, W * 0.012));
      g.cw = Math.min((W - 20 - gap * (g.cols - 1)) / g.cols, ((avail - gap * (g.rows - 1)) / g.rows) * 24 / 30, 170);
      g.chh = g.cw * 30 / 24; g.gap = gap;
      g.gx = (W - (g.cw * g.cols + gap * (g.cols - 1))) / 2; g.gy = top + (avail - (g.chh * g.rows + gap * (g.rows - 1))) / 2;
      g.Z = g.cw / 24;
    },
    slotXY(g, s) { XY[0] = g.gx + (s % g.cols) * (g.cw + g.gap) + g.cw / 2; XY[1] = g.gy + Math.floor(s / g.cols) * (g.chh + g.gap) + g.chh / 2; return XY; },
    bg(g, x) {
      const Z = g.Z, w = Math.ceil(W / Z), h = Math.ceil(H / Z);
      for (let yy = 0; yy < h; yy += 12) for (let xx = 0; xx < w; xx += 12) { x.fillStyle = ((xx + yy) / 12) % 2 ? '#94d46e' : '#a6de7c'; x.fillRect(xx, yy, 12, 12); }
      // a gingham picnic blanket under the cards
      const bx = Math.round(g.gx / Z - 5), by = Math.round(g.gy / Z - 5), bw = Math.round((g.cw * g.cols + g.gap * (g.cols - 1)) / Z + 10), bh = Math.round((g.chh * g.rows + g.gap * (g.rows - 1)) / Z + 10);
      x.fillStyle = 'rgba(40,70,20,.22)'; x.fillRect(bx + 2, by + 3, bw, bh);
      x.fillStyle = '#fff4ea'; x.fillRect(bx, by, bw, bh);
      x.fillStyle = 'rgba(232,90,100,.30)'; for (let i = 0; i < bw; i += 8) x.fillRect(bx + i, by, 4, bh); for (let j = 0; j < bh; j += 8) x.fillRect(bx, by + j, bw, 4);
      x.fillStyle = '#e8505a'; x.fillRect(bx, by, bw, 1); x.fillRect(bx, by + bh - 1, bw, 1); x.fillRect(bx, by, 1, bh); x.fillRect(bx + bw - 1, by, 1, bh);
    },
    update(g, dt) {
      const k = 1 - Math.exp(-dt * 12);
      let left = 0;
      for (const c of g.cards) {
        if (c.delay > 0 && dt > 0) { c.delay -= dt; continue; }
        const [tx, ty] = PAIRS.slotXY(g, c.slot);
        if (c.x < 0) { c.x = W / 2; c.y = H + g.chh; }
        c.x += (tx - c.x) * k; c.y += (ty - c.y) * k;
        const want = c.face ? 1 : 0; c.f += clamp(want - c.f, -dt / 0.16, dt / 0.16);
        if (c.shake > 0) c.shake -= dt;
        if (c.done > 0) c.done += dt; else left++;
      }
      if (g.st !== 'play') return;
      if (g.peekT > 0 && (g.peekT -= dt) <= 0) { for (const c of g.cards) c.face = false; snd('select', { pitch: 0.9 }); }
      if (g.lockT > 0) g.lockT -= dt;
      if (g.waitT > 0 && (g.waitT -= dt) <= 0) { for (const c of g.open) c.face = false; g.open.length = 0; }
      if (g.zq && (g.zq.t += dt) > 0.75) PAIRS.zTrick(g);
      let n = 0, pairsLeft = 0; for (const c of g.cards) { if (!(c.done > 0.75)) g.cards[n++] = c; if (!c.done && !c.z) pairsLeft++; } g.cards.length = n;
      // every pair found: the zombie cards nobody turned over get bonked away by themselves
      if (!pairsLeft && left && !g.zq) for (const c of g.cards) if (!c.done && c.z) { c.face = true; c.done = 0.001; c.bonk = true; const [x, y] = PAIRS.slotXY(g, c.slot); sparks(g, x, y, 6, '#ffffff'); snd('bonk'); }
      if (!left && !g.nextT && g.cards.length === 0) {
        g.nextT = 0.9; const bonus = 30 + 10 * Math.min(3, g.boards); g.score += bonus;
        floatText(g, `Board clear! +${bonus}`, W / 2, H * 0.42, '#ffd23a', 34); snd('cheer', { streak: 6 });
      }
      if (g.nextT > 0 && (g.nextT -= dt) <= 0) { g.nextT = 0; PAIRS.deal(g); }
    },
    zTrick(g) {
      const zc = g.zq.card; g.zq = null;
      const pool = []; for (const c of g.cards) if (!c.done && !c.face && !c.z) pool.push(c);
      if (pool.length >= 2) {
        const a = pool.splice(Math.floor(Math.random() * pool.length), 1)[0], b = pick(pool), s = a.slot;
        a.slot = b.slot; b.slot = s; a.shake = b.shake = 0.5; snd('whoosh');
        floatText(g, 'Shuffled!', W / 2, Math.max(hudBottom() + 30, g.gy - 14), '#c8b4ec', 28);
      }
      zc.done = 0.001; zc.bonk = true; g.score += 5; snd('bonk');
      const [x, y] = PAIRS.slotXY(g, zc.slot); sparks(g, x, y, 6, '#ffffff');
    },
    cardAt(g, x, y) {
      for (const c of g.cards) { if (c.done) continue; const [cx, cy] = PAIRS.slotXY(g, c.slot); if (Math.abs(x - cx) <= (g.cw + g.gap) / 2 && Math.abs(y - cy) <= (g.chh + g.gap) / 2) return c; }
      return null;
    },
    down(g, x, y) {
      if (g.st !== 'play' || g.lockT > 0 || g.peekT > 0 || g.nextT > 0 || g.zq) return;
      const hit = PAIRS.cardAt(g, x, y);
      if (!hit || hit.face) return;
      if (g.waitT > 0) { for (const c of g.open) c.face = false; g.open.length = 0; g.waitT = 0; } // (a tap during the "no match" pause turns them back now)
      hit.face = true; snd('select', { pitch: 1.15 }); g.hintDone = true;
      if (hit.z) { // a zombie card: it will shuffle two hidden cards
        seeZ(hit.z); snd('brains'); hit.shake = 0.7; g.zq = { card: hit, t: 0 }; g.streak = 0;
        for (const c of g.open) c.face = false; g.open.length = 0;
        const [x2, y2] = PAIRS.slotXY(g, hit.slot); floatText(g, 'A zombie!', x2, y2 - g.chh * 0.6, '#c8f0a0', 24);
        return;
      }
      g.open.push(hit);
      if (g.open.length < 2) return;
      const a = g.open[0], b = g.open[1];
      if (a.sp === b.sp) {
        a.done = b.done = 0.001; g.open.length = 0;
        g.found++; g.streak++; g.bestStreak = Math.max(g.bestStreak, g.streak);
        const pts = 10 + Math.min(4, g.streak - 1) * 5; g.score += pts;
        const [ax, ay] = PAIRS.slotXY(g, a.slot), mx = ax, my = ay, [bx, by] = PAIRS.slotXY(g, b.slot);
        floatText(g, '+' + pts, (mx + bx) / 2, (my + by) / 2 - g.chh * 0.3, g.streak > 1 ? '#ffd23a' : '#ffffff', 30);
        sparks(g, mx, my, 5, '#fff27a'); sparks(g, bx, by, 5, '#fff27a');
        snd('coin', { pitch: 1 + 0.08 * Math.min(5, g.streak - 1) });
        try { if (PX.Cry && PX.Cry.play) PX.Cry.play(a.sp, { stage: 0 }); } catch (e) { /* optional */ }
        if (g.streak >= 3) snd('cheer', { streak: g.streak });
      } else { g.waitT = 0.9; g.streak = 0; a.shake = b.shake = 0.3; snd('back'); }
    },
    move() {}, up() {},
    draw(g) {
      const Z = g.Z, t = g.t;
      for (const c of g.cards) {
        if (c.delay > 0 && g.st === 'count') continue;
        if (c.x < 0) continue;
        const sx = Math.max(0.02, Math.abs(Math.cos(c.f * Math.PI))), faceUp = c.f >= 0.5;
        const pop = c.done ? clamp(c.done / 0.3, 0, 1) : 0, sc = 1 + (RM ? 0 : 0.14 * Math.sin(pop * Math.PI)), al = c.done > 0.4 ? clamp(1 - (c.done - 0.4) / 0.35, 0, 1) : 1;
        const x = c.x + (c.shake > 0 && !RM ? Math.sin(t * 50 + c.slot) * 3 : 0), y = c.y - (c.done && !RM ? Math.sin(pop * Math.PI) * 10 : 0);
        const card = art('packet', faceUp ? (c.z ? 'zombie' : 'face') : 'back');
        blitR(card, x, y, Z * sc, 12, 15, 0, sx, 1, al);
        if (faceUp) {
          const ps = Z * 0.66 * sc;
          if (c.z) blitR(zSpr(c.z, 0, !c.bonk), x, y + 11 * Z * sc, ps, 16, 31, c.bonk ? 0.3 : 0, sx, 1, al, true);
          else blitR(pSpr(c.sp, c.done ? 'happy' : Math.floor(t * 0.8 + c.slot) % 5 === 4 ? 'blink' : 'idle'), x, y + 11 * Z * sc, ps, 16, 31, 0, sx, 1, al);
        }
      }
      if (g.st === 'play' && g.peekT > 0) note('Look! Remember them!', W / 2, Math.max(hudBottom() + 22, g.gy - 20));
      else if (g.st === 'play' && !g.found && g.boards === 1 && g.t > 0.3) note(g.def.how, W / 2, Math.max(hudBottom() + 22, g.gy - 20));
    },
    starsOf(g) { return starsByScore(g.def, g.score); },
    extra(g) { return `Pairs found: <b>${g.found}</b>` + (g.bestStreak >= 3 ? ` &middot; ${g.bestStreak} in a row!` : ''); },
  };

  // =====================================================================
  // Beghouled
  // =====================================================================
  // A board of plant tiles (6 x 6; 5 x 5 if the screen is tiny): swap two neighbours (tap one then the other, or drag) to line up
  // RUN (2) or more of a kind. They pop and every popped plant shoots a pea along its row at the zombies walking in from the right;
  // Cherry Bombs also go boom in that row, Wall-nuts push the row's zombies back, Snow Peas slow them, Sunflowers give extra
  // points. A zombie that walks off the left of the board costs a heart. New tiles fall in (chains score more); a board with no
  // move left reshuffles itself. After a few quiet seconds two tiles wiggle as a hint.
  const BEG = ['peashooter', 'sunflower', 'wallnut', 'cherrybomb', 'snowpea', 'chomper'];
  const BEG_COL = { peashooter: '#c6efa4', sunflower: '#ffe896', wallnut: '#efd2a8', cherrybomb: '#ffb8b4', snowpea: '#c0e6ff', chomper: '#e2c4f8' };
  const MV = [0, 0];
  const RUN = 2; // (how many in a line pop: the family asked for 2, so even little ones find matches)
  const MATCH = {
    init(g) { g.N = 0; g.b = null; g.zs = []; g.peas = []; g.sel = -1; g.press = null; g.phase = 'idle'; g.phT = 0; g.cascade = 0; g.idleT = 0; g.hint = -1; g.hint2 = -1; g.hearts = g.maxHearts = 3; g.spawnT = 2.2; g.defeated = 0; g.shufT = 0; g.bk = 'match'; },
    layout(g) {
      const top = hudBottom() + 8, avail = Math.max(160, H - top - 12);
      if (!g.N) { const ts6 = Math.min((W - 16) / 7.3, avail / 6.4); g.N = ts6 >= 46 ? 6 : 5; g.K = g.N === 6 ? 6 : 5; g.mark = new Uint8Array(g.N * g.N); MATCH.fill(g); }
      const N = g.N;
      g.ts = Math.min((W - 16) / (N + 1.3), avail / (N + 0.4), 112);
      g.bx = (W - g.ts * (N + 1.3)) / 2 + g.ts * 0.3; g.by = top + (avail - g.ts * N) / 2;
      g.Z = g.ts / 34;
    },
    rnd(g) { return BEG[Math.floor(Math.random() * g.K)]; },
    fill(g) {
      const N = g.N; g.b = new Array(N * N);
      do {
        for (let i = 0; i < N * N; i++) { let k; do { k = MATCH.rnd(g); } while (MATCH.makesRun(g, i, k)); g.b[i] = { k, oy: 0, vy: 0, sx: 0, sy: 0, pop: 0 }; }
      } while (!MATCH.findMove(g));
    },
    makesRun(g, i, k) { // would tile i of kind k finish a line of RUN with the tiles to its left or above?
      const N = g.N, b = g.b, c = i % N, r = (i / N) | 0; let h = c >= RUN - 1, v = r >= RUN - 1;
      for (let q = 1; q < RUN; q++) { if (h && b[i - q].k !== k) h = false; if (v && b[i - q * N].k !== k) v = false; }
      return h || v;
    },
    runAt(g, i) {
      const N = g.N, b = g.b, k = b[i].k, c = i % N, r = (i / N) | 0; let h = 1, v = 1;
      for (let q = c - 1; q >= 0 && b[r * N + q].k === k; q--) h++;
      for (let q = c + 1; q < N && b[r * N + q].k === k; q++) h++;
      for (let q = r - 1; q >= 0 && b[q * N + c].k === k; q--) v++;
      for (let q = r + 1; q < N && b[q * N + c].k === k; q++) v++;
      return h >= RUN || v >= RUN;
    },
    findMove(g) {
      const N = g.N, b = g.b;
      for (let i = 0; i < N * N; i++) for (let d = 0; d < 2; d++) {
        const j = d ? i + N : i + 1; if ((!d && i % N === N - 1) || j >= N * N) continue;
        const t = b[i].k; b[i].k = b[j].k; b[j].k = t; const ok = MATCH.runAt(g, i) || MATCH.runAt(g, j); b[j].k = b[i].k; b[i].k = t;
        if (ok) { MV[0] = i; MV[1] = j; return MV; }
      }
      return null;
    },
    findRuns(g) { // marks every tile in a line of 3+; returns how many, and g.longest
      const N = g.N, b = g.b, m = g.mark; m.fill(0); g.longest = 0;
      for (let r = 0; r < N; r++) { let s = 0; for (let c = 1; c <= N; c++) { if (c < N && b[r * N + c].k === b[r * N + s].k) continue; if (c - s >= RUN) { for (let q = s; q < c; q++) m[r * N + q] = 1; g.longest = Math.max(g.longest, c - s); } s = c; } }
      for (let c = 0; c < N; c++) { let s = 0; for (let r = 1; r <= N; r++) { if (r < N && b[r * N + c].k === b[s * N + c].k) continue; if (r - s >= RUN) { for (let q = s; q < r; q++) m[q * N + c] = 1; g.longest = Math.max(g.longest, r - s); } s = r; } }
      let n = 0; for (let i = 0; i < N * N; i++) if (m[i]) n++;
      return n;
    },
    adj(g, i, j) { const N = g.N; return (Math.abs(i - j) === 1 && ((i / N) | 0) === ((j / N) | 0)) || Math.abs(i - j) === N; },
    swapTiles(g, i, j) {
      const b = g.b, N = g.N, t = b[i]; b[i] = b[j]; b[j] = t;
      const dc = (j % N) - (i % N), dr = ((j / N) | 0) - ((i / N) | 0);
      b[i].sx = dc; b[i].sy = dr; b[j].sx = -dc; b[j].sy = -dr;
    },
    trySwap(g, i, j) {
      if (g.phase !== 'idle' || g.st !== 'play') return;
      g.sel = -1; g.idleT = 0; g.hint = -1; g.hintDone = true;
      MATCH.swapTiles(g, i, j);
      if (MATCH.runAt(g, i) || MATCH.runAt(g, j)) { g.cascade = 0; g.phase = 'swap'; g.phT = 0.16; snd('select'); }
      else { g.phase = 'back'; g.phT = 0.16; g.bi = i; g.bj = j; }
    },
    resolve(g) {
      const n = MATCH.findRuns(g);
      if (!n) {
        g.phase = 'idle';
        if (!MATCH.findMove(g)) MATCH.reshuffle(g);
        return;
      }
      g.cascade++;
      const N = g.N, b = g.b, m = g.mark, Z = g.Z, mult = Math.min(3, g.cascade); // (pairs chain a lot: the chain bonus stops at x3)
      let rowsBoom = 0, rowsNut = 0;
      for (let i = 0; i < N * N; i++) {
        if (!m[i]) continue;
        const tl = b[i], r = (i / N) | 0, c = i % N, x = g.bx + (c + 0.5) * g.ts, y = g.by + (r + 0.5) * g.ts;
        tl.pop = 0.001;
        let pts = 10 * mult;
        if (tl.k === 'sunflower') { pts += 5; part(g, art('sun'), x, y, rand(-30, 30), -260, 0.7, Z * 1.3, { gr: 120 }); }
        g.score += pts;
        if (tl.k === 'cherrybomb') rowsBoom |= 1 << r;
        else if (tl.k === 'wallnut') rowsNut |= 1 << r;
        g.peas.push({ r, x: c + 0.6, dmg: tl.k === 'peashooter' || tl.k === 'chomper' ? 2 : 1, slow: tl.k === 'snowpea', gone: false });
        sparks(g, x, y, 3, '#ffffff');
      }
      for (let r = 0; r < N; r++) {
        if (rowsBoom & (1 << r)) { // Cherry Bombs: a boom along the row
          let k = 0; for (const z of g.zs) if (!z.dead && z.r === r && z.x < N + 0.6) { MATCH.hurt(g, z, 5); k++; }
          const sp = sprC('spark:#ffb03a', () => PX.fx('bigspark', '#ffb03a'));
          for (let q = 0; q < 10; q++) part(g, sp, g.bx + rand(0, N) * g.ts, g.by + (r + 0.5) * g.ts, rand(-120, 120), rand(-260, -60), rand(0.4, 0.7), Z * 1.2, { gr: 400 });
          snd('boom'); g.shake = RM ? 0 : 0.18; if (k) floatText(g, 'BOOM!', g.bx + N * g.ts * 0.6, g.by + (r + 0.2) * g.ts, '#ffb03a', 30);
        }
        if (rowsNut & (1 << r)) for (const z of g.zs) if (!z.dead && z.r === r) { z.kb = 1.6; snd('bonk', { pitch: 0.8 }); }
      }
      const cx = W / 2, cy = Math.max(hudBottom() + 40, g.by - 10);
      if (g.longest >= 5) { g.score += 50; floatText(g, 'WOW! +50', cx, cy + 40, '#ffd23a', 36); snd('cheer', { streak: 8 }); }
      else if (g.longest === 4) { g.score += 20; floatText(g, 'Great! +20', cx, cy + 40, '#8fe3ff', 32); snd('cheer', { streak: 4 }); }
      if (g.cascade >= 2) { floatText(g, `Chain x${g.cascade}!`, cx, cy + 80, '#c8f0a0', 30); }
      snd('pop', { pitch: 1 + 0.1 * Math.min(5, g.cascade - 1) });
      g.phase = 'pop'; g.phT = 0.26;
    },
    collapse(g) {
      const N = g.N, b = g.b;
      for (let c = 0; c < N; c++) {
        let w = N - 1;
        for (let r = N - 1; r >= 0; r--) { const tl = b[r * N + c]; if (tl.pop) continue; if (w !== r) { b[w * N + c] = tl; tl.oy -= (w - r); } w--; }
        const gone = w + 1;
        for (let r = w; r >= 0; r--) { // (new tiles avoid matching the settled tile to their left and the one below, so the board doesn't clear itself)
          let k = MATCH.rnd(g);
          for (let tries = 0; tries < 8 && ((c > 0 && b[r * N + c - 1] && b[r * N + c - 1].k === k) || (r + 1 < N && b[(r + 1) * N + c] && b[(r + 1) * N + c].k === k)); tries++) k = MATCH.rnd(g);
          b[r * N + c] = { k, oy: -gone, vy: 0, sx: 0, sy: 0, pop: 0 };
        }
      }
      g.phase = 'fall';
    },
    reshuffle(g) {
      const N = g.N, b = g.b, ks = b.map(t => t.k);
      for (let tries = 0; tries < 60; tries++) {
        shuffleArr(ks); for (let i = 0; i < N * N; i++) b[i].k = ks[i];
        if (!MATCH.findRuns(g) && MATCH.findMove(g)) break;
        if (tries === 59) { MATCH.fill(g); }
      }
      g.shufT = 0.6; banner('Shuffle!'); snd('whoosh');
    },
    hurt(g, z, dmg) {
      z.hp -= dmg; z.hitT = 0.15;
      if ((z.kind === 'buckethead' || z.kind === 'conehead') && z.hp <= 3) z.look = 'basic';
      if (z.hp <= 0) {
        z.dead = 0.01; g.defeated++; g.score += 30;
        floatText(g, '+30', g.bx + z.x * g.ts, g.by + (z.r + 0.1) * g.ts, '#ffffff', 26); snd('whack', { pitch: 1.1 });
      }
    },
    update(g, dt) {
      const N = g.N, b = g.b, p = clamp(g.t / g.def.sec, 0, 1);
      let settled = true;
      for (let i = 0; i < N * N; i++) {
        const tl = b[i];
        if (tl.sx) tl.sx = tl.sx > 0 ? Math.max(0, tl.sx - dt * 7) : Math.min(0, tl.sx + dt * 7);
        if (tl.sy) tl.sy = tl.sy > 0 ? Math.max(0, tl.sy - dt * 7) : Math.min(0, tl.sy + dt * 7);
        if (tl.oy < 0) { tl.vy += dt * 45; tl.oy = Math.min(0, tl.oy + tl.vy * dt); if (!tl.oy) tl.vy = 0; settled = false; }
        if (tl.pop > 0) tl.pop += dt;
      }
      if (g.shufT > 0) g.shufT -= dt;
      if (g.phT > 0) g.phT -= dt;
      if (g.phase === 'swap' && g.phT <= 0) MATCH.resolve(g);
      else if (g.phase === 'back' && g.phT <= 0) { MATCH.swapTiles(g, g.bi, g.bj); g.phase = 'unswap'; g.phT = 0.16; snd('bump'); }
      else if (g.phase === 'unswap' && g.phT <= 0) g.phase = 'idle';
      else if (g.phase === 'pop' && g.phT <= 0) MATCH.collapse(g);
      else if (g.phase === 'fall' && settled) MATCH.resolve(g);
      if (g.phase === 'idle' && g.st === 'play') {
        g.idleT += dt;
        if (g.idleT > 5 && g.hint < 0) { const mv = MATCH.findMove(g); if (mv) { g.hint = mv[0]; g.hint2 = mv[1]; } }
      }
      // zombies walk in from the right, one row at a time, more and tougher as the clock runs
      if (g.st === 'play' && (g.spawnT -= dt) <= 0) {
        let alive = 0; for (const z of g.zs) if (!z.dead) alive++;
        if (alive < 2 + Math.floor(p * 2.6)) {
          const u = Math.random(), kind = p > 0.45 && u < 0.25 ? 'buckethead' : p > 0.15 && u < 0.55 ? 'conehead' : 'basic';
          let r = Math.floor(Math.random() * N); for (let q = 0; q < N && g.zs.some(z => !z.dead && z.r === r && z.x > N - 0.5); q++) r = (r + 1) % N;
          g.zs.push({ r, x: N + 0.9, kind, look: kind, hp: kind === 'buckethead' ? 8 : kind === 'conehead' ? 5 : 3, sp: (N + 1) / lerp(34, 22, p), slowT: 0, hitT: 0, kb: 0, dead: 0, ph: Math.random() * 2 });
          seeZ(kind); if (Math.random() < 0.5) snd('zombie-step');
        }
        g.spawnT = lerp(6.0, 3.6, p) * rand(0.85, 1.2);
      }
      for (const z of g.zs) {
        if (z.dead) { z.dead += dt; continue; }
        if (z.hitT > 0) z.hitT -= dt; if (z.slowT > 0) z.slowT -= dt;
        if (z.kb > 0) { z.x = Math.min(N + 0.9, z.x + z.kb * dt); z.kb = Math.max(0, z.kb - dt * 3); }
        z.x -= z.sp * (z.slowT > 0 ? 0.5 : 1) * dt;
        if (z.x < -0.2 && g.st === 'play') {
          z.dead = 0.01; z.ate = true; g.hearts--; g.shake = RM ? 0 : 0.35; snd('brains'); snd('bump');
          floatText(g, 'Oh no!', g.bx + g.ts * 0.6, g.by + (z.r + 0.2) * g.ts, '#ff9aa0', 26);
          if (g.hearts <= 0) endGame(g, 'out');
        }
      }
      for (const pe of g.peas) {
        if (pe.gone) continue;
        pe.x += 9 * dt; if (pe.x > N + 1.3) { pe.gone = true; continue; }
        for (const z of g.zs) if (!z.dead && z.r === pe.r && z.x < N + 0.7 && Math.abs(z.x - pe.x) < 0.35) {
          pe.gone = true; snd('bonk', { pitch: 1.5 }); if (pe.slow) z.slowT = 4;
          MATCH.hurt(g, z, pe.dmg); break;
        }
      }
      if (g.peas.length > 30) { let m = 0; for (const pe of g.peas) if (!pe.gone) g.peas[m++] = pe; g.peas.length = m; }
      if (g.zs.length > 14) g.zs = g.zs.filter(z => !(z.dead > 1.2));
    },
    tileAt(g, x, y) { const c = Math.floor((x - g.bx) / g.ts), r = Math.floor((y - g.by) / g.ts); return c >= 0 && c < g.N && r >= 0 && r < g.N ? r * g.N + c : -1; },
    down(g, x, y) { if (g.st !== 'play') return; const i = MATCH.tileAt(g, x, y); if (i < 0) { g.sel = -1; return; } g.press = { i, x, y }; },
    move(g, x, y) {
      const P = g.press; if (!P || g.phase !== 'idle') return;
      const dx = x - P.x, dy = y - P.y; if (Math.max(Math.abs(dx), Math.abs(dy)) < g.ts * 0.35) return;
      const N = g.N, c = P.i % N, r = (P.i / N) | 0; let j = -1;
      if (Math.abs(dx) > Math.abs(dy)) { if (dx > 0 && c < N - 1) j = P.i + 1; else if (dx < 0 && c > 0) j = P.i - 1; }
      else if (dy > 0 && r < N - 1) j = P.i + N; else if (dy < 0 && r > 0) j = P.i - N;
      g.press = null; if (j >= 0) MATCH.trySwap(g, P.i, j);
    },
    up(g, x, y, cancel) {
      const P = g.press; g.press = null; if (!P || cancel) return;
      if (g.phase !== 'idle') { g.sel = P.i; return; }
      if (g.sel >= 0 && g.sel !== P.i && MATCH.adj(g, g.sel, P.i)) { MATCH.trySwap(g, g.sel, P.i); return; }
      g.sel = g.sel === P.i ? -1 : P.i; snd('select', { pitch: 1.2 });
    },
    draw(g) {
      const N = g.N, ts = g.ts, Z = g.Z, t = g.t, b = g.b;
      ctx.save(); ctx.beginPath(); ctx.rect(g.bx - 4, g.by - 4, N * ts + 8, N * ts + 8); ctx.clip();
      for (let i = 0; i < N * N; i++) {
        const tl = b[i], c = i % N, r = (i / N) | 0;
        const x = g.bx + (c + tl.sx + 0.5) * ts, y = g.by + (r + tl.sy + tl.oy + 0.5) * ts;
        if (y < g.by - ts * 0.6) continue;
        const sel = i === g.sel, hint = (i === g.hint || i === g.hint2) && !RM, pk = tl.pop > 0 ? clamp(tl.pop / 0.26, 0, 1) : 0;
        const s = (1 + pk * 0.5) * (sel && !RM ? 1 + 0.05 * Math.sin(t * 10) : 1), al = 1 - pk;
        if (al <= 0) continue;
        ctx.globalAlpha = al;
        const hw = ts * 0.46 * s;
        rr(x - hw, y - hw, hw * 2, hw * 2, ts * 0.18); ctx.fillStyle = sel ? '#fff7c4' : BEG_COL[tl.k]; ctx.fill();
        ctx.lineWidth = sel ? 4 : 2; ctx.strokeStyle = sel ? '#e0a020' : 'rgba(58,45,52,.55)'; ctx.stroke();
        const rot = hint ? Math.sin(t * 14) * 0.18 : g.shufT > 0 && !RM ? Math.sin(t * 30 + i) * 0.15 : 0;
        blitR(pSpr(tl.k, pk || sel ? 'happy' : 'idle'), x, y + ts * 0.42 * s, Z * 0.98 * s, 16, 31, rot, 1, 1, al);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      // peas
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      for (const pe of g.peas) if (!pe.gone) { ctx.fillStyle = pe.slow ? '#9edcff' : '#86d64a'; ctx.beginPath(); ctx.arc(g.bx + pe.x * ts, g.by + (pe.r + 0.42) * ts, Math.max(4, ts * 0.1), 0, 6.2832); ctx.fill(); ctx.stroke(); }
      // zombies walk over the board, row by row
      for (let r = 0; r < N; r++) for (const z of g.zs) if (z.r === r) MATCH.drawZ(g, z, t);
      if (g.st === 'play' && !g.hintDone && g.t > 0.3) note(g.def.how, W / 2, Math.max(hudBottom() + 22, g.by - 22));
    },
    drawZ(g, z, t) {
      const Z = g.Z, x = g.bx + z.x * g.ts, y = g.by + (z.r + 0.94) * g.ts;
      if (z.dead) {
        const k = clamp(z.dead / 0.3, 0, 1), fa = clamp(1 - (z.dead - 0.4) / 0.4, 0, 1); if (fa <= 0) return;
        if (z.ate) { blitR(zSpr(z.look, 0), x - z.dead * 80, y, Z, 16, 31, 0, 1, 1, fa, true); return; }
        blitR(zSpr(z.look, 0), x + k * 12, y, Z, 16, 31, k * k * 1.4, 1, 1, fa, true); return;
      }
      const f = Math.floor(t * 2.5 + z.ph) % 2, sh = z.hitT > 0 ? (Math.floor(z.hitT * 40) % 2 ? 2 : -2) : 0;
      shadow(x, y, 13 * Z);
      blitR(zSpr(z.look, f), x + sh, y, Z, 16, 31, z.kb > 0 ? 0.15 : 0, 1, 1, 1, true);
      if (z.slowT > 0) { ctx.globalAlpha = 0.28; ctx.fillStyle = '#9edcff'; ctx.beginPath(); ctx.ellipse(x, y - 14 * Z, 10 * Z, 15 * Z, 0, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1; }
    },
    bg(g, x) {
      const Z = g.Z, w = Math.ceil(W / Z), h = Math.ceil(H / Z), ts = g.ts / Z, bx = g.bx / Z, by = g.by / Z, N = g.N;
      paintSky(x, w, Math.max(14, by - 2));
      for (let r = 0; r < N; r++) for (let c = -2; bx + c * ts < w; c++) { x.fillStyle = (r + c + 8) % 2 ? '#94d46e' : '#a6de7c'; x.fillRect(Math.round(bx + c * ts), Math.round(by + r * ts), Math.ceil(ts), Math.ceil(ts)); }
      x.fillStyle = 'rgba(60,40,20,.22)'; x.fillRect(Math.round(bx - 1), Math.round(by - 1), Math.round(N * ts + 2), Math.round(N * ts + 2));
      x.fillStyle = '#d8cbb4'; x.fillRect(0, Math.round(by), Math.round(bx - 1), Math.ceil(N * ts)); // the path to the house: don't let them reach it
      for (let y = Math.round(by); y < by + N * ts; y += 4) { x.fillStyle = '#e8505a'; x.fillRect(Math.round(bx) - 2, y, 1, 2); }
      paintPath(x, w, h, by + N * ts);
    },
    starsOf(g) { return starsByScore(g.def, g.score); },
    extra(g) { return `Zombies stopped: <b>${g.defeated}</b>`; },
  };

  // =====================================================================
  // Pea Gallery
  // =====================================================================
  // A fair stall: cut-out targets slide along three rails (the middle one the other way). Tap a zombie: the Peashooter on the
  // counter spits a pea and SPLAT, it flips down. Buckets need two peas, a Gargantuar three (big points); a Balloon Zombie floats
  // over the top now and then (pop it!). Sunflowers and garden gnomes are friends: a pea on them costs 10 points. 60 seconds.
  const GAL_ORDER = [-1, 2, 1, 0];
  const GAL = {
    init(g) { g.tg = []; g.shots = []; g.tierT = [0.2, 0.9, 0.5]; g.railY = [0, 0, 0]; g.balT = 8; g.garg = 0; g.streak = 0; g.bestStreak = 0; g.splats = 0; g.shootT = 0; g.aimL = false; g.bk = 'gal'; },
    layout(g) {
      const top = hudBottom() + 4;
      g.awnY = top; g.awnH = Math.max(30, Math.min(64, H * 0.065));
      g.cntH = Math.max(76, Math.min(150, H * 0.15)); g.cntY = H - g.cntH;
      const span = (g.cntY - (g.awnY + g.awnH)) / 3.35;
      g.Z = clamp(Math.min(span / 34, W / 140), 1.5, 3.4);
      const a = g.awnY + g.awnH;
      g.balY = a + span * 0.75; g.railY[0] = a + span * 1.4; g.railY[1] = a + span * 2.4; g.railY[2] = g.cntY + 2 * g.Z;
      const Z = g.Z;
      g.railC = strip(Math.ceil(W / Z) + 2, 8, (x, w) => {
        x.fillStyle = INK; x.fillRect(0, 0, w, 8); x.fillStyle = '#d89a58'; x.fillRect(0, 1, w, 6); x.fillStyle = '#f0bc7c'; x.fillRect(0, 1, w, 2);
        x.fillStyle = '#b07440'; x.fillRect(0, 6, w, 1); for (let i = 6; i < w; i += 16) { x.fillStyle = '#8a5a30'; x.fillRect(i, 3, 1, 1); }
      });
      g.cntC = strip(Math.ceil(W / Z) + 2, Math.ceil(g.cntH / Z) + 2, (x, w, h) => {
        x.fillStyle = INK; x.fillRect(0, 0, w, h); x.fillStyle = '#c4884c'; x.fillRect(0, 1, w, h - 1);
        x.fillStyle = '#e8b070'; x.fillRect(0, 1, w, 5); x.fillStyle = '#f6cc90'; x.fillRect(0, 1, w, 1); x.fillStyle = INK; x.fillRect(0, 6, w, 1);
        for (let i = 10; i < w; i += 14) { x.fillStyle = '#a8703c'; x.fillRect(i, 7, 1, h); }
        // a string of bunting along the counter
        for (let i = 0; i < w; i += 10) { const c = ['#ff8e9a', '#ffd23a', '#8fd46a', '#8fc8ff'][(i / 10) % 4]; for (let j = 0; j < 6; j++) { x.fillStyle = c; x.fillRect(i + 1 + j / 2, 7 + j, Math.max(1, 8 - j), 1); } }
      });
    },
    bg(g, x) {
      const Z = g.Z, w = Math.ceil(W / Z), h = Math.ceil(H / Z), aE = Math.round((g.awnY + g.awnH) / Z);
      for (let i = 0; i < w; i += 8) { x.fillStyle = (i / 8) % 2 ? '#f3d9b0' : '#f8e6c6'; x.fillRect(i, 0, 8, h); }
      x.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 26; i++) { const X = Math.floor((i * 0.379 % 1) * w), Y = aE + 6 + Math.floor((i * 0.618 % 1) * Math.max(10, h - aE - 20)); x.fillRect(X, Y - 1, 1, 3); x.fillRect(X - 1, Y, 3, 1); }
      for (const ry of g.railY) { x.fillStyle = 'rgba(90,50,20,.22)'; x.fillRect(0, Math.round(ry / Z) - 3, w, 2); }
      // the striped awning with a scalloped edge
      for (let i = 0; i < w; i += 8) { const c = (i / 8) % 2 ? '#fff6ea' : '#e8504a'; x.fillStyle = c; x.fillRect(i, 0, 8, aE); puff(x, i + 4, aE, 4, c); }
      x.fillStyle = 'rgba(90,30,20,.18)'; x.fillRect(0, aE + 4, w, 2);
    },
    spawn(g, tier) {
      const p = clamp(g.t / g.def.sec, 0, 1), dir = tier === 1 ? -1 : 1, u = Math.random();
      let kind = 'z', zk = null;
      if (u < 0.13) kind = 'sun'; else if (u < 0.25) kind = 'gnome';
      else { const v = Math.random(); zk = p > 0.3 && v < 0.2 ? 'buckethead' : p > 0.08 && v < 0.45 ? 'conehead' : v > 0.88 ? 'imp' : 'basic'; }
      if (tier === 2 && g.garg < 2 && g.t > 18 + g.garg * 20 && Math.random() < 0.4) { kind = 'z'; zk = 'gargantuar'; g.garg++; }
      const T = lerp(7, 4.4, p) * (tier === 1 ? 0.88 : 1) * (zk === 'imp' ? 0.75 : zk === 'gargantuar' ? 1.35 : 1), m = 30 * g.Z;
      g.tg.push({ tier, x: dir > 0 ? -m : W + m, dir, kind, zk, look: zk, hp: zk === 'buckethead' ? 2 : zk === 'gargantuar' ? 3 : 1, v: (W + 2 * m) / T, hitT: 0, down: 0, up: 0, sad: 0, ph: Math.random() * 6, fall: 0, fy: 0 });
      if (zk) seeZ(zk);
    },
    update(g, dt) {
      const p = clamp(g.t / g.def.sec, 0, 1), Z = g.Z;
      if (g.shootT > 0) g.shootT -= dt;
      if (g.st === 'play') {
        for (let i = 0; i < 3; i++) if ((g.tierT[i] -= dt) <= 0) { GAL.spawn(g, i); g.tierT[i] = lerp(2.1, 1.25, p) * rand(0.8, 1.25) * (g.tg.length && g.tg[g.tg.length - 1].zk === 'gargantuar' ? 1.6 : 1); }
        if ((g.balT -= dt) <= 0) {
          g.balT = rand(8, 12); const dir = Math.random() < 0.5 ? 1 : -1, m = 30 * Z;
          g.tg.push({ tier: -1, x: dir > 0 ? -m : W + m, dir, kind: 'z', zk: 'balloon', look: 'balloon', hp: 1, v: (W + 2 * m) / 6.5, hitT: 0, down: 0, up: 1, sad: 0, ph: Math.random() * 6, fall: 0, fy: 0 });
          seeZ('balloon'); snd('whoosh', { pitch: 1.3 });
        }
      }
      let n = 0;
      for (const t of g.tg) {
        t.x += t.dir * t.v * dt * (t.down ? 0.3 : 1);
        if (t.up < 1) t.up = Math.min(1, t.up + dt / 0.25);
        if (t.hitT > 0) t.hitT -= dt; if (t.sad > 0) t.sad -= dt;
        if (t.down) t.down += dt;
        if (t.fall) { t.fall += dt; t.fy += (t.fall * 900) * dt; }
        const m = 40 * Z, gone = (t.dir > 0 ? t.x > W + m : t.x < -m) || t.down > 0.8 || t.fy > H;
        if (!gone) g.tg[n++] = t;
      }
      g.tg.length = n;
      n = 0; for (const s of g.shots) { s.t += dt; if (s.t < 0.16) g.shots[n++] = s; } g.shots.length = n;
    },
    ty(g, t) { return t.tier < 0 ? g.balY + Math.sin(g.t * 2 + t.ph) * 3 * g.Z + t.fy : g.railY[t.tier]; },
    scale(g, t) { return g.Z * (t.zk === 'gargantuar' ? 1.3 : t.kind === 'gnome' ? 1.9 : 1); },
    hits(g, t, x, y) {
      if (t.down || t.fall || t.up < 0.5) return false;
      const s = t.kind === 'gnome' ? g.Z * 1.3 : GAL.scale(g, t), by = GAL.ty(g, t) - (t.tier < 0 ? 0 : 3 * g.Z);
      return Math.abs(x - t.x) < 12 * s + 12 && y < by + 8 && y > by - 30 * s - 12;
    },
    down(g, x, y) {
      if (g.st !== 'play') return;
      if (g.shots.length > 5) g.shots.shift();
      g.shots.push({ x, y, t: 0 }); g.shootT = 0.15; g.aimL = x < W / 2; snd('pop', { pitch: 1.5 });
      let hit = null;
      for (let o = 0; o < GAL_ORDER.length && !hit; o++) for (const t of g.tg) if (t.tier === GAL_ORDER[o] && GAL.hits(g, t, x, y)) { hit = t; break; }
      g.hintDone = true;
      if (!hit) { g.streak = 0; return; }
      const Z = g.Z, top = GAL.ty(g, hit) - 30 * GAL.scale(g, hit);
      if (hit.kind !== 'z') { // a friend!
        hit.hitT = 0.4; hit.sad = 1.0; g.score = Math.max(0, g.score - 10); g.streak = 0; snd('bump');
        floatText(g, 'Oops! -10', hit.x, top, '#ff9aa0', 26); g.shake = RM ? 0 : 0.15; return;
      }
      part(g, art('splat'), x, y, 0, 0, 0.45, Z * 1.3, { gr: 0, vr: 0.01 });
      hit.hp--; hit.hitT = 0.15;
      if (hit.hp > 0) { if (hit.zk === 'buckethead') hit.look = 'basic'; g.score += 5; snd('bonk'); floatText(g, 'Bonk!', hit.x, top, '#ffffff', 24); return; }
      if (hit.tier < 0) { hit.fall = 0.001; snd('pop', { pitch: 0.7 }); } else hit.down = 0.001;
      g.splats++; g.streak++; g.bestStreak = Math.max(g.bestStreak, g.streak);
      const pts = hit.zk === 'gargantuar' ? 60 : hit.zk === 'balloon' ? 40 : hit.zk === 'imp' || hit.zk === 'buckethead' ? 20 : hit.zk === 'conehead' ? 15 : 10;
      g.score += pts; snd('whack', { pitch: 1 + 0.05 * Math.min(8, g.streak - 1) });
      floatText(g, '+' + pts, hit.x, top, pts >= 40 ? '#ffd23a' : '#ffffff', pts >= 40 ? 34 : 26);
      sparks(g, x, y, pts >= 40 ? 10 : 5, '#c8f0a0');
      if (g.streak % 5 === 0) { g.score += 25; floatText(g, `${g.streak} in a row! +25`, W / 2, g.awnY + g.awnH + 24, '#8fe3ff', 28); snd('cheer', { pitch: 1 + 0.05 * Math.min(6, g.streak / 5), streak: g.streak }); }
    },
    move() {}, up() {},
    drawT(g, t) {
      const Z = g.Z, s = GAL.scale(g, t), y = GAL.ty(g, t), t2 = g.t;
      const k = t.down ? clamp(1 - t.down / 0.22, 0.04, 1) : RM ? 1 : 1 - Math.pow(1 - t.up, 2);
      const al = t.down > 0.5 ? clamp(1 - (t.down - 0.5) / 0.3, 0, 1) : 1, sh = t.hitT > 0 ? (Math.floor(t.hitT * 40) % 2 ? 2 : -2) : 0;
      if (al <= 0) return;
      ctx.globalAlpha = al;
      if (t.tier >= 0) { ctx.fillStyle = '#a8743c'; ctx.fillRect(t.x - 1.5 * Z, y - 12 * Z * k, 3 * Z, 12 * Z * k + 4 * Z); }
      ctx.globalAlpha = 1;
      const wob = RM ? 0 : Math.sin(t2 * 6 + t.ph) * 0.05;
      if (t.kind === 'z') blitR(zSpr(t.look, t.tier < 0 ? 0 : Math.floor(t2 * 3 + t.ph) % 2, t.down > 0 || t.fall > 0), t.x + sh, y - 3 * Z, s, 16, 31, t.fall ? t.fall * 4 : wob, 1, k, al, t.dir < 0);
      else if (t.kind === 'sun') blitR(pSpr('sunflower', t.sad > 0 ? 'sad' : 'happy'), t.x + sh, y - 3 * Z, s, 16, 31, wob, 1, k, al);
      else blitR(prop('gnome'), t.x + sh, y - 3 * Z, s, 5, 14, t.sad > 0 ? Math.sin(t2 * 30) * 0.2 : wob, 1, k, al, t.dir < 0);
    },
    draw(g) {
      const Z = g.Z;
      for (let tier = 0; tier < 3; tier++) {
        for (const t of g.tg) if (t.tier === tier) GAL.drawT(g, t);
        if (tier < 2) blit(g.railC, 0, g.railY[tier] - 4 * Z, Z, 0, 0);
      }
      blit(g.cntC, 0, g.cntY, Z, 0, 0);
      for (const t of g.tg) if (t.tier < 0) GAL.drawT(g, t);
      // the Peashooter on the counter (it turns to the side you tap)
      const px = W / 2, py = H - 6, ps = Z * 1.25;
      shadow(px, py, 18 * Z);
      blitR(pSpr('peashooter', g.shootT > 0 ? 'happy' : 'idle'), px, py, ps, 16, 31, 0, g.shootT > 0 && !RM ? 1.06 : 1, g.shootT > 0 && !RM ? 0.94 : 1, 1, g.aimL);
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.fillStyle = '#86d64a';
      for (const s of g.shots) { const k = clamp(s.t / 0.12, 0, 1); if (k >= 1) continue; const sx = px + (g.aimL ? -12 : 12) * ps, sy = py - 20 * ps; ctx.beginPath(); ctx.arc(lerp(sx, s.x, k), lerp(sy, s.y, k), Math.max(5, 3 * Z), 0, 6.2832); ctx.fill(); ctx.stroke(); }
      if (g.st === 'play' && !g.hintDone && g.t > 0.3) note(g.def.how, W / 2, g.cntY - 22);
      else if (g.st === 'play' && g.t < 6 && g.t > 0.3) note('Not the friends!', W / 2, g.cntY - 22);
    },
    starsOf(g) { return starsByScore(g.def, g.score); },
    extra(g) { return `Zombies splatted: <b>${g.splats}</b>` + (g.bestStreak >= 5 ? ` &middot; ${g.bestStreak} in a row!` : ''); },
  };
  const MODS = { bowl: BOWL, whack: WHACK, vase: VASE, sun: SUNC, pairs: PAIRS, match: MATCH, gallery: GAL };

  // ---------------- shared backdrop bits (drawn at 1 art px into the cached background) ----------------
  function paintSky(x, w, to) {
    to = Math.max(0, Math.round(to));
    const S = ['#86ccf0', '#9ed6f2', '#b6e2f6', '#cdebf8']; for (let i = 0; i < 4; i++) { x.fillStyle = S[i]; x.fillRect(0, Math.round(to * i / 4), w, Math.ceil(to / 4) + 1); }
    if (to < 18) return;
    // a soft hill line and the white picket fence along the back of the yard
    x.fillStyle = '#b0dc98'; for (let i = 0; i < w; i += 2) { const hh = Math.round(4 + Math.sin(i * 0.07) * 3); x.fillRect(i, to - 10 - hh, 2, hh + 10); }
    x.fillStyle = '#ffffff'; x.fillRect(0, to - 9, w, 2); x.fillRect(0, to - 5, w, 2);
    for (let i = 2; i < w; i += 7) { x.fillStyle = '#ffffff'; x.fillRect(i, to - 12, 3, 12); x.fillStyle = '#e2d8ce'; x.fillRect(i + 2, to - 11, 1, 11); }
    x.fillStyle = '#7cc05a'; x.fillRect(0, to - 1, w, 1);
  }
  function paintPath(x, w, h, from) {
    from = Math.round(from); if (from >= h) return;
    x.fillStyle = '#e6dccb'; x.fillRect(0, from, w, h - from);
    x.fillStyle = '#d2c4ac'; for (let i = 0; i < w; i += 10) x.fillRect(i, from + 2, 1, h);
    for (let j = from + 9; j < h; j += 9) x.fillRect(0, j, w, 1);
    x.fillStyle = '#7cc05a'; x.fillRect(0, from, w, 1);
  }
  function paintBg() {
    const g = G, key = g.def.id + W + 'x' + H + ':' + g.Z.toFixed(3) + (g.R || g.N || g.cols || 0) + ':' + (g.rows || 0) + ':' + hudBottom();
    if (key === bgKey) return; bgKey = key;
    const w = Math.ceil(W / g.Z), h = Math.ceil(H / g.Z);
    const lo = document.createElement('canvas'); lo.width = w; lo.height = h;
    const x = lo.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = '#a6de7c'; x.fillRect(0, 0, w, h);
    try { g.mod.bg(g, x); } catch (e) { console.error('arcade bg', e); }
    bgC = lo;
  }

  // =====================================================================
  // Running a game: countdown, play, the end stamp, results
  // =====================================================================
  function hudBottom() { return hudEl && !hudEl.hidden ? hudEl.offsetTop + hudEl.offsetHeight : 64; }
  function start(id, force) {
    const def = GBY[id]; if (!def || (!force && !isOpen(def))) return;
    if (!root) { try { PS.ui.go('arcade'); } catch (e) { /* ignore */ } }
    if (!root || !hubEl) return;
    const go = () => {
      try {
        G = { def, mod: MODS[id], st: 'count', t: 0, countT: 3.4, endT: 0, score: 0, hearts: 0, maxHearts: 0, parts: [], floats: [], shake: 0, flash: 0, paused: false, stamp: null, goBanner: false, Z: 2 };
        G.mod.init(G);
        hubEl.hidden = true; playEl.hidden = false; resEl.hidden = true; quitEl.hidden = true; pauseEl.hidden = true;
        playEl.style.setProperty('--mode', def.col); playEl.style.setProperty('--mode-dk', def.dk);
        PS.ui.chrome(false); PS.ui.hold(true);
        buildHud(); sizeKey = ''; bgKey = ''; checkSize();
        music(def.track);
      } catch (e) { console.error('arcade start', e); G = null; showHub(); PS.ui.toast('Oops! That game could not start.'); }
    };
    snd('go');
    try { if (PS.ui.wipe) { PS.ui.wipe('arcade', go); return; } } catch (e) { /* optional */ }
    go();
  }
  function endGame(g, outcome) {
    if (g.st === 'end' || g.st === 'done') return;
    g.st = 'end'; g.endT = 0; g.outcome = outcome;
    const timeUp = outcome === 'time', win = outcome === 'win';
    g.stamp = { text: win ? 'You win!' : outcome === 'lose' ? 'Oh no!' : timeUp ? 'Time!' : 'Game over!', col: win || timeUp ? '#ffd23a' : '#a9d2f5', t: 0 };
    snd(win ? 'level' : timeUp ? 'chime' : 'bump');
    if (g.drag) g.drag = null; g.aiming = false;
  }
  function update(dt) {
    const g = G;
    stepFx(g, dt); if (g.flash > 0) g.flash -= dt;
    if (g.stamp) g.stamp.t += dt;
    if (g.st === 'count') {
      const prev = Math.ceil(g.countT); g.countT -= dt; const now = Math.ceil(g.countT);
      if (now !== prev && now >= 1 && now <= 3) snd('countdown');
      if (g.countT <= 0) {
        g.st = 'play'; g.goT = 0.7; snd('go');
        try { if (PS.ui.fx && PS.ui.fx.banner) { PS.ui.fx.banner('GO!', { tone: 'go', ms: 650 }); g.goBanner = true; } } catch (e) { /* optional */ }
      }
      g.mod.update(g, 0);
      return;
    }
    if (g.goT > 0) g.goT -= dt;
    if (g.st === 'play') {
      g.t += dt;
      if (g.def.sec && g.t >= g.def.sec) { endGame(g, 'time'); }
      else if (!g.def.sec && g.t > 360) endGame(g, 'time'); // (Vasebreaker: a safety stop after 6 minutes)
      if (g.def.sec && !g.fast && g.t > g.def.sec * 0.75) { g.fast = true; try { if (PX.Music && PX.Music.tempo) PX.Music.tempo(1.08); } catch (e) { /* optional */ } }
    }
    g.mod.update(g, dt);
    if (g.st === 'end' && (g.endT += dt) > 1.4) { g.st = 'done'; try { showResults(g); } catch (e) { console.error('arcade results', e); bail(); } }
  }
  function render() {
    const g = G;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.imageSmoothingEnabled = false;
    if (g.shake > 0) ctx.translate(Math.round(Math.sin(g.t * 70) * 4 * g.shake / 0.3), 0);
    if (bgC) ctx.drawImage(bgC, 0, 0, bgC.width * g.Z, bgC.height * g.Z); else { ctx.fillStyle = '#a6de7c'; ctx.fillRect(0, 0, W, H); }
    g.mod.draw(g);
    drawFx(g);
    if (g.flash > 0) { ctx.fillStyle = `rgba(255,250,220,${(g.flash / 0.25 * 0.5).toFixed(3)})`; ctx.fillRect(-8, 0, W + 16, H); }
    const cy = H * 0.45;
    if (g.st === 'count') {
      const n = Math.ceil(g.countT);
      if (n >= 4) { bigText(g.def.name, W / 2, cy - 30, Math.min(44, W / 11), '#ffd23a'); note(g.def.how, W / 2, cy + 22); }
      else { const k = 1 - (g.countT - (n - 1)); bigText(String(n), W / 2, cy, Math.round(96 * (RM ? 1 : 1.3 - 0.3 * clamp(k * 3, 0, 1))), '#ffd23a'); }
    } else if (g.goT > 0 && !g.goBanner) { ctx.globalAlpha = Math.min(1, g.goT * 2); bigText('GO!', W / 2, cy, 96, '#99e550'); ctx.globalAlpha = 1; }
    if (g.stamp) {
      const s = g.stamp, k = RM ? 1 : Math.min(1, s.t / 0.22), sc = 1 + 0.8 * (1 - k) * (1 - k);
      ctx.save(); ctx.translate(W / 2, cy); ctx.rotate(-0.1); ctx.scale(sc, sc); ctx.globalAlpha = Math.min(1, 0.3 + k);
      ctx.font = `60px ${F_PX}`; const w = Math.ceil(ctx.measureText(s.text).width) + 44, h = 84;
      rr(-w / 2, -h / 2, w, h, 16); ctx.fillStyle = 'rgba(26,27,31,0.62)'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = s.col; ctx.stroke();
      bigText(s.text, 0, 4, 60, s.col); ctx.restore();
    }
  }

  // ---------------- HUD ----------------
  const SVG_STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.8l3.1 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.6l-6.4 3.6 1.5-7.1L1.7 9.2l7.2-.8z"/></svg>';
  const SVG_LOCKOPEN = '<svg class="ar-lk" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 9.6-2" fill="none" stroke="#3a2d34" stroke-width="2.6" stroke-linecap="round"/><rect x="3.5" y="10" width="17" height="12" rx="3.5" fill="#ffd04a" stroke="#3a2d34" stroke-width="2"/><circle cx="12" cy="15.5" r="1.8" fill="#3a2d34"/></svg>';
  const SVG_HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.2s-8.6-5.3-9.9-10.6C1.2 6.9 3.6 3.6 7.1 3.6c2.1 0 3.8 1.2 4.9 2.9 1.1-1.7 2.8-2.9 4.9-2.9 3.5 0 5.9 3.3 5 7-1.3 5.3-9.9 10.6-9.9 10.6z"/></svg>';
  let hudScore = null, hudBar = null, hudHearts = null, hudCnt = null, lastHud = '';
  function buildHud() {
    const g = G;
    hudEl.innerHTML = `<button class="ar-x" type="button" aria-label="Leave the game">×</button>
      <div class="ar-sc"><b>0</b><small>Score</small></div>
      <div class="ar-mid">${g.def.sec ? '<div class="ar-bar"><i></i></div>' : '<div class="ar-cnt"></div>'}</div>
      <div class="ar-hearts">${g.maxHearts ? SVG_HEART.repeat(g.maxHearts) : ''}</div>`;
    hudScore = hudEl.querySelector('.ar-sc b'); hudBar = hudEl.querySelector('.ar-bar i'); hudHearts = hudEl.querySelectorAll('.ar-hearts svg'); hudCnt = hudEl.querySelector('.ar-cnt');
    hudEl.querySelector('.ar-x').addEventListener('click', () => { PX.Sound.unlock(); snd('pop'); askQuit(); });
    lastHud = '';
  }
  function updateHud() {
    const g = G, left = g.def.sec ? clamp(1 - g.t / g.def.sec, 0, 1) : 0;
    const key = g.score + ':' + Math.round(left * 200) + ':' + g.hearts + ':' + (g.vases ? g.vases - g.broken : '');
    if (key === lastHud) return; lastHud = key;
    hudScore.textContent = g.score;
    if (hudBar) { hudBar.style.width = (left * 100).toFixed(1) + '%'; hudBar.parentNode.classList.toggle('low', left < 0.2); }
    if (hudCnt) hudCnt.innerHTML = `${esc(String(g.vases - g.broken))}<small> vases left</small>`;
    hudHearts.forEach((h, i) => h.classList.toggle('off', i >= g.hearts));
  }

  // ---------------- pause / leave ----------------
  function askQuit() {
    if (!G || G.st === 'done') return;
    G.paused = true; quitEl.hidden = false; pauseEl.hidden = true; releasePtr(true);
  }
  function pauseGame() { if (!G || G.st === 'done' || G.paused) return; G.paused = true; pauseEl.hidden = false; releasePtr(true); }
  function resumeGame() { if (!G) return; G.paused = false; quitEl.hidden = true; pauseEl.hidden = true; }
  function leaveGame() { quitEl.hidden = true; pauseEl.hidden = true; G = null; showHub(); }
  function bail() { G = null; showHub(); PS.ui.toast('Oops! That game had a hiccup.'); }

  // ---------------- results (the shared .pv-res window) ----------------
  function starsByScore(def, s) { const S = def.stars; return s >= S[2] ? 3 : s >= S[1] ? 2 : s >= S[0] ? 1 : 0; }
  const resTile = (icon, value, label, cls) => `<div class="pv-res-tile${cls ? ' ' + cls : ''}">${icon ? `<canvas class="px" data-rt="${icon}"></canvas>` : ''}<b class="num">${value}</b><small>${label}</small></div>`;
  function showResults(g) {
    const def = g.def, score = Math.round(g.score), stars = clamp(g.mod.starsOf(g) | 0, 0, 3);
    const r = recW(def.id), prevBest = r.best, newBest = score > prevBest;
    r.plays++; if (newBest) r.best = score; r.stars = Math.max(r.stars, stars); r.last = Date.now();
    const coins = 5 + stars * 5 + (g.coinsFound || 0);
    let got = 0; try { got = ST.addCoins(coins, 'arcade'); } catch (e) { got = 0; }
    let prize = null;
    if (stars === 3 && !r.prize && D.FUSION_ITEMS && D.FUSION_ITEMS[def.prize]) { try { if (ST.addItem(def.prize)) { prize = def.prize; r.prize = Date.now(); } } catch (e) { prize = null; } }
    save();
    const opened = unlockedNow(); // (2 stars here may open the next game: marked now so it's celebrated once)
    const win = def.id === 'vase' ? g.outcome === 'win' : stars > 0;
    const title = def.id === 'vase' ? (win ? (stars === 3 ? 'Perfect!' : 'You did it!') : 'Oh no!') : stars === 3 ? 'Amazing!' : stars === 2 ? 'Great job!' : stars === 1 ? 'Nice!' : 'Good try!';
    const tiles = [resTile(null, `<span data-count="${score}">${score}</span>`, newBest && prevBest > 0 ? 'New best!' : 'Score'),
      resTile(null, String(Math.max(score, prevBest)), 'Best'),
      resTile('coin', `<span data-coins="${got}">+${got}</span>`, 'Coins')];
    if (prize) tiles.push(resTile('fitem', 'Item!', esc(D.FUSION_ITEMS[prize].name), 'ar-prizetile'));
    let next = '';
    if (def.stars && stars < 3) next = `Get <b>${def.stars[stars]}</b> for ${stars + 1} star${stars ? 's' : ''}!`;
    else if (def.id === 'vase' && !win) next = 'Plant a Peashooter in each zombie’s row!';
    else if (def.id === 'vase' && stars < 3) next = 'Keep every mower for 3 stars!';
    else if (!r.prize) next = '';
    const extra = g.mod.extra ? g.mod.extra(g) : def.id === 'bowl' && g.bestCombo >= 2 ? `Best combo: <b>×${g.bestCombo}</b>` : def.id === 'whack' && g.bestStreak >= 3 ? `Bonks in a row: <b>${g.bestStreak}</b>` : def.id === 'vase' ? `Zombies stopped: <b>${g.defeated}</b>` : '';
    resEl.className = 'ar-res pv-res';
    resEl.innerHTML = `<div class="pv-res-win ar-reswin" role="dialog" aria-label="${esc(def.name)} results">
      <div class="eyebrow">${esc(def.name)}</div>
      <div class="pv-res-title${win ? '' : ' lose'}">${title}</div>
      <div class="pv-res-hero ar-bigstars">${[0, 1, 2].map(i => `<span class="ar-bstar${i < stars ? ' on' : ''}" style="animation-delay:${(0.35 + i * 0.32).toFixed(2)}s">${SVG_STAR}</span>`).join('')}</div>
      <div class="pv-res-tiles">${tiles.join('')}</div>
      ${extra ? `<p class="ar-note">${extra}</p>` : ''}
      ${next ? `<p class="ar-note">${next}</p>` : ''}
      ${opened.length ? `<p class="ar-note ar-opened">${SVG_LOCKOPEN}<span>New game: <b>${esc(opened.map(o => o.name).join(', '))}</b>!</span></p>` : ''}
      <div class="pv-res-btns"><button class="btn go ar-again" type="button">Play again</button><button class="btn ar-back" type="button">Back</button></div>
    </div>`;
    resEl.querySelectorAll('canvas[data-rt]').forEach(c => {
      try {
        const src = c.dataset.rt === 'coin' ? coinIc() : PX.item('fitem', prize); if (!src) return;
        c.width = src.width; c.height = src.height; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0);
      } catch (e) { /* art optional */ }
    });
    resEl.hidden = false;
    resEl.querySelector('.ar-back').onclick = () => { PX.Sound.unlock(); snd('pop'); G = null; showHub(); };
    resEl.querySelector('.ar-again').onclick = () => { PX.Sound.unlock(); G = null; resEl.hidden = true; start(def.id); };
    PS.ui.chrome(true); PS.ui.hold(false);
    // the stars pop in one by one (each with a ding), the score rolls up, the coins fly to the coin pill
    if (!jingle(win ? 'victory' : 'lose')) snd(win ? 'level' : 'coo');
    for (let i = 0; i < stars; i++) setTimeout(() => { if (resEl && !resEl.hidden) snd('star', { pitch: 1 + i * 0.12 }); }, 350 + i * 320);
    try {
      const cu = resEl.querySelector('[data-count]'); if (cu && PS.ui.fx && PS.ui.fx.countUp && score > 0) PS.ui.fx.countUp(cu, 0, score, 700);
      const cc = resEl.querySelector('[data-coins]'); if (cc && got > 0 && PS.ui.fx && PS.ui.fx.coinsFly) setTimeout(() => { try { if (cc.isConnected) PS.ui.fx.coinsFly(cc, 6); } catch (e) { /* optional */ } }, 500);
    } catch (e) { /* optional */ }
    // a new best (after the first game) and the first 3 stars get the big celebration
    if (PS.ui.celebrate && ((newBest && prevBest > 0) || prize)) {
      const icon = gameIcon(def.id);
      let item = null; try { item = prize ? PX.item('fitem', prize) : null; } catch (e) { item = null; }
      setTimeout(() => {
        try {
          PS.ui.celebrate({ kind: prize ? 'item' : 'best', title: prize ? '3 stars!' : 'New best!', sub: prize ? `You won a ${D.FUSION_ITEMS[prize].name}! Fuse it in the Shop.` : `${def.name}: ${score}`,
            icon: item || icon, jingle: prize ? 'item' : 'star', button: 'Yay!' });
        } catch (e) { /* optional */ }
      }, 1500);
    }
    celebrateUnlocks(opened, 1550);
  }

  // ---------------- the hub: three arcade cabinets ----------------
  function previewOf(id) {
    return sprC('pre:' + id, () => {
      const w = 72, h = 30, k = 2, c = document.createElement('canvas'); c.width = w * k; c.height = h * k;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.setTransform(k, 0, 0, k, 0, 0);
      // a little lawn
      for (let r = 0; r < 3; r++) for (let q = 0; q < 8; q++) { x.fillStyle = (r + q) % 2 ? '#94d46e' : '#a6de7c'; x.fillRect(q * 9, 6 + r * 8, 9, 8); }
      x.fillStyle = '#86ccf0'; x.fillRect(0, 0, w, 6);
      const put = (s, X, Y, sc, flip) => { if (!s) return; const W2 = aw(s) * sc, H2 = ah(s) * sc; x.save(); x.translate(X, Y); if (flip) x.scale(-1, 1); x.drawImage(s, -W2 / 2, -H2, W2, H2); x.restore(); };
      if (id === 'bowl') { x.fillStyle = '#e8505a'; x.fillRect(14, 6, 1, 24); put(pSpr('wallnut', 'happy'), 9, 29, 0.6); put(boomNut('idle'), 26, 21, 0.5); put(zSpr('conehead', 0), 44, 29, 0.7, true); put(zSpr('basic', 1), 61, 22, 0.6, true); }
      else if (id === 'whack') {
        put(art('hole', 'back'), 18, 30, 0.8); put(zSpr('basic', 0), 18, 28, 0.7, true); put(art('hole', 'front'), 18, 30, 0.8);
        put(art('hole', 'back'), 50, 30, 0.8); put(pSpr('sunflower', 'happy'), 50, 27, 0.6); put(art('hole', 'front'), 50, 30, 0.8);
        put(art('mallet'), 32, 18, 0.7);
      } else if (id === 'vase') { put(art('vase', 'clay'), 34, 29, 0.85); put(art('vase', 'leaf'), 48, 29, 0.85); put(art('vase', 'gold'), 62, 29, 0.85); put(pSpr('peashooter', 'happy'), 12, 29, 0.6); put(art('sun'), 22, 12, 0.6); }
      else if (id === 'sun') {
        x.fillStyle = '#a8daf4'; x.fillRect(0, 0, w, 26); x.fillStyle = '#cdebf8'; x.fillRect(0, 13, w, 13);
        put(zSpr('conehead', 0, true), 58, 13, 0.45, true); x.fillStyle = '#6cb84e'; x.fillRect(46, 9, 26, 4);
        put(art('sun'), 14, 12, 0.7); put(art('sun'), 38, 8, 0.55); put(art('sun'), 24, 21, 0.9); put(art('cone'), 52, 20, 0.5);
        put(pSpr('sunflower', 'happy'), 34, 26, 0.55); put(art('pot'), 34, 30, 0.55);
      } else if (id === 'pairs') {
        x.fillStyle = '#fff4ea'; x.fillRect(4, 1, 64, 29); x.fillStyle = 'rgba(232,90,100,.3)'; for (let i = 4; i < 68; i += 6) x.fillRect(i, 1, 3, 29); for (let j = 1; j < 30; j += 6) x.fillRect(4, j, 64, 3);
        const sp = ['sunflower', null, 'peashooter', null, 'sunflower', null];
        for (let i = 0; i < 6; i++) { const X = 10 + i * 10.4, Y = 28.5; put(art('packet', sp[i] ? 'face' : 'back'), X, Y, 0.42); if (sp[i]) put(pSpr(sp[i], 'happy'), X, Y - 4, 0.3); }
      } else if (id === 'match') {
        const K = ['peashooter', 'sunflower', 'cherrybomb', 'snowpea', 'wallnut', 'chomper'];
        for (let r = 0; r < 3; r++) for (let q = 0; q < 6; q++) { const k = K[(q * 2 + r * 3 + (q > 2 ? 1 : 0)) % 6]; x.fillStyle = BEG_COL[k]; x.fillRect(2 + q * 9 + 0.5, 2 + r * 9 + 0.5, 8, 8); put(pSpr(k, 'idle'), 6.5 + q * 9, 10 + r * 9, 0.26); }
        put(zSpr('basic', 1), 64, 20, 0.6, true);
      } else if (id === 'gallery') {
        for (let i = 0; i < w; i += 6) { x.fillStyle = (i / 6) % 2 ? '#f3d9b0' : '#f8e6c6'; x.fillRect(i, 0, 6, h); }
        put(zSpr('basic', 0), 14, 17, 0.45); put(prop('gnome'), 34, 17, 0.75); put(zSpr('conehead', 0), 56, 17, 0.45, true);
        x.fillStyle = '#d89a58'; x.fillRect(0, 16, w, 3); x.fillStyle = INK; x.fillRect(0, 15, w, 1);
        put(pSpr('sunflower', 'happy'), 24, 30, 0.45); put(zSpr('buckethead', 1), 48, 30, 0.45, true);
        for (let i = 0; i < w; i += 6) { x.fillStyle = (i / 6) % 2 ? '#fff6ea' : '#e8504a'; x.fillRect(i, 0, 6, 4); }
      }
      return c;
    });
  }
  // a locked cabinet's screen: the game's picture gone dark (a silhouette), with a padlock on top
  function lockedPreview(id) {
    return sprC('lockpre:' + id, () => {
      const s = previewOf(id); if (!s) return null;
      const c = document.createElement('canvas'); c.width = s.width; c.height = s.height;
      const x = c.getContext('2d'); x.drawImage(s, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(30,24,46,.84)'; x.fillRect(0, 0, c.width, c.height);
      return c;
    });
  }
  // ---------------- unlocking: the new games open one by one (2 stars in the game before opens the next) ----------------
  const isOpen = gm => !gm.after || (rec(gm.after).stars | 0) >= 2 || (rec(gm.id).plays | 0) > 0;
  function unlockedNow() { // new games that are open but were never celebrated: mark them (once, saved) and return them
    const out = [];
    for (const gm of GAMES) {
      if (!gm.after || !isOpen(gm)) continue;
      const A = PS.S && PS.S.arcade, U = A && A.unl && typeof A.unl === 'object' ? A.unl : null;
      if (U && U[gm.id]) continue;
      if (!PS.S.arcade || typeof PS.S.arcade !== 'object' || Array.isArray(PS.S.arcade)) PS.S.arcade = {};
      const B = PS.S.arcade; if (!B.unl || typeof B.unl !== 'object' || Array.isArray(B.unl)) B.unl = {};
      B.unl[gm.id] = Date.now(); out.push(gm);
    }
    if (out.length) save();
    return out;
  }
  function celebrateUnlocks(list, delay) {
    if (!list || !list.length || !PS.ui.celebrate) return;
    setTimeout(() => {
      for (const gm of list) {
        try { PS.ui.celebrate({ kind: 'unlock', eyebrow: 'New game unlocked!', title: gm.name, sub: gm.blurb, icon: previewOf(gm.id) || gameIcon(gm.id), jingle: 'unlock', button: 'Yay!' }); } catch (e) { /* optional */ }
      }
    }, delay || 0);
  }
  function gameIcon(id) {
    return id === 'bowl' ? pSpr('wallnut', 'happy') : id === 'whack' ? art('mallet') : id === 'vase' ? art('vase', 'gold') : id === 'sun' ? art('sun')
      : id === 'pairs' ? art('packet', 'back') : id === 'match' ? pSpr('cherrybomb', 'happy') : pSpr('peashooter', 'happy');
  }
  function lockedTap(b) {
    const gm = GBY[b.dataset.g], prev = gm && GBY[gm.after];
    snd('bump'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
    try { if (prev) PS.ui.toast(`Get 2 stars in ${prev.name} first!`); } catch (e) { /* optional */ }
  }
  function renderHub() {
    let total = 0; GAMES.forEach(gm => { total += rec(gm.id).stars | 0; });
    const most = GAMES.length * 3;
    let newest = null; GAMES.forEach(gm => { if (gm.after && isOpen(gm)) newest = gm; });
    if (newest && rec(newest.id).plays) newest = null;
    hubEl.innerHTML = `<div class="ar-head"><h1 class="ar-title">Arcade</h1><div class="ar-total" aria-label="${total} of ${most} stars">${SVG_STAR}<b>${total}</b><small>/${most}</small></div></div>
      <div class="ar-cabs">${GAMES.map(gm => {
        const r = rec(gm.id);
        if (!isOpen(gm)) {
          const prev = GBY[gm.after], ps = Math.min(2, rec(gm.after).stars | 0);
          return `<button class="ar-cab locked" type="button" data-g="${gm.id}" data-lock="1" aria-label="${esc(gm.name)} is locked. Get 2 stars in ${esc(prev.name)} to open it.">
          <span class="ar-marq">${esc(gm.name)}</span>
          <span class="ar-screen"><canvas data-pre="${gm.id}" data-dark="1" data-nosnap></canvas><canvas class="ar-lockic" data-padlock="1" data-nosnap></canvas></span>
          <span class="ar-info"><span class="ar-meter" aria-hidden="true">${[0, 1].map(i => `<i class="${i < ps ? 'on' : ''}">${SVG_STAR}</i>`).join('')}</span>
          <span class="ar-best ar-locktx">Get 2${SVG_STAR} in <b>${esc(prev.name)}</b> to unlock</span></span>
        </button>`;
        }
        return `<button class="ar-cab" type="button" data-g="${gm.id}" style="--c:${gm.col};--cd:${gm.dk}" aria-label="Play ${esc(gm.name)}">
          ${gm === newest ? '<span class="ar-new">NEW!</span>' : ''}<span class="ar-marq">${esc(gm.name)}</span>
          <span class="ar-screen"><canvas data-pre="${gm.id}" data-nosnap></canvas></span>
          <span class="ar-info"><span class="ar-stars">${[0, 1, 2].map(i => `<i class="${i < r.stars ? 'on' : ''}">${SVG_STAR}</i>`).join('')}</span>
          <span class="ar-best">${r.best ? `Best <b>${r.best}</b>` : esc(gm.blurb)}</span><span class="ar-playb">Play</span></span>
        </button>`;
      }).join('')}</div>
      <p class="ar-foot">Coins every game. 3 stars wins a prize. 2 stars opens a new game!</p>`;
    hubEl.querySelectorAll('canvas[data-pre]').forEach(c => { const s = c.dataset.dark ? lockedPreview(c.dataset.pre) : previewOf(c.dataset.pre); if (!s) return; c.width = s.width; c.height = s.height; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(s, 0, 0); });
    hubEl.querySelectorAll('canvas[data-padlock]').forEach(c => { const s = art('padlock'); if (!s) return; c.width = s.width; c.height = s.height; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(s, 0, 0); });
    hubEl.querySelectorAll('.ar-cab').forEach(b => { b.onclick = () => { PX.Sound.unlock(); if (b.dataset.lock) { lockedTap(b); return; } snd('select'); start(b.dataset.g); }; });
  }
  function showHub() {
    releasePtr(true);
    playEl.hidden = true; resEl.hidden = true; quitEl.hidden = true; pauseEl.hidden = true; hubEl.hidden = false;
    PS.ui.chrome(true); PS.ui.hold(false);
    renderHub(); hubMusic();
    celebrateUnlocks(unlockedNow(), 350); // (an old save that already has 2 stars: its new game is celebrated on the first visit)
  }

  // ---------------- input ----------------
  const PT = { x: 0, y: 0 };
  function pt(e) { const r = cv.getBoundingClientRect(); PT.x = e.clientX - r.left; PT.y = e.clientY - r.top; return PT; }
  function releasePtr(cancel) { if (ptrId != null && G) { try { G.mod.up(G, PT.x, PT.y, cancel); } catch (e) { /* ignore */ } } ptrId = null; }
  function onDown(e) {
    if (!G || G.paused || G.st === 'done') return;
    PX.Sound.unlock(); e.preventDefault();
    // a new first touch clears a touch the iPad lost (pointerup never came)
    if (e.isPrimary && ptrId != null) releasePtr(true);
    const p = pt(e); lastDown = performance.now();
    if (G.st !== 'play' && G.st !== 'count') return;
    if (ptrId == null) ptrId = e.pointerId;
    else if (!G.def.multi) return;
    if (G.st === 'count' && !G.def.countIn) return;
    G.mod.down(G, p.x, p.y);
    if (G.def.multi) ptrId = null; // whack / gallery: every finger is its own tap
  }
  function onMove(e) { if (!G || e.pointerId !== ptrId) return; const p = pt(e); G.mod.move(G, p.x, p.y); }
  function onUp(e, cancel) { if (!G || e.pointerId !== ptrId) return; const p = pt(e); ptrId = null; if (G.st === 'play' || G.st === 'count') G.mod.up(G, p.x, p.y, cancel); }

  // ---------------- size ----------------
  function checkSize() {
    if (!G || !cv) return;
    const r = cv.getBoundingClientRect(), dpr = Math.min(3, window.devicePixelRatio || 1);
    const key = Math.round(r.width) + 'x' + Math.round(r.height) + ':' + dpr + ':' + hudBottom();
    if (key === sizeKey || r.width < 10 || r.height < 10) return;
    sizeKey = key; W = r.width; H = r.height; DPR = dpr;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    G.mod.layout(G); paintBg();
  }

  // ---------------- CSS ----------------
  const CSS = `
  #scr-arcade{--mode:#9a62e0;--mode-dk:#5a2e9a;--bg1:#4a2c80;--bg2:#24163f}
  .ar-root{position:absolute;inset:0;overflow:hidden}
  .ar-hub{position:absolute;inset:0;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;padding:12px 14px 28px;display:flex;flex-direction:column;

    background:radial-gradient(circle at 20% 12%,rgba(255,255,255,.08) 0 2px,transparent 3px) 0 0/26px 26px,radial-gradient(circle at 70% 60%,rgba(255,210,58,.10) 0 2px,transparent 3px) 0 0/34px 34px,linear-gradient(var(--bg1),var(--bg2))}
  .ar-hub>*{flex:0 0 auto}
  .ar-hub::before,.ar-hub::after{content:"";flex:1 1 0;max-height:60px}
  .ar-head{display:flex;align-items:center;justify-content:center;gap:12px;margin:2px 0 12px}
  .ar-title{margin:0;font:400 42px/1 var(--f-px);color:#ffd23a;letter-spacing:.02em;text-shadow:3px 0 ${INK},-3px 0 ${INK},0 3px ${INK},0 -3px ${INK},3px 3px ${INK},-3px 3px ${INK},3px -3px ${INK},-3px -3px ${INK},0 6px rgba(0,0,0,.35)}
  .ar-total{display:flex;align-items:center;gap:3px;background:rgba(0,0,0,.35);border:2px solid rgba(255,255,255,.25);border-radius:999px;padding:4px 12px 4px 8px;color:#fff;font:900 20px/1 var(--f-ui)}
  .ar-total svg{width:24px;height:24px;fill:#ffd23a;stroke:${INK};stroke-width:1.6}
  .ar-total small{font-size:14px;opacity:.8}
  .ar-cabs{display:flex;flex-wrap:wrap;justify-content:center;gap:14px;width:100%;max-width:540px;margin:0 auto}
  .ar-cabs>.ar-cab{flex:0 0 100%;position:relative}
  @media (min-width:600px){.ar-cabs{max-width:860px}.ar-cabs>.ar-cab{flex-basis:calc(50% - 7px)}}
  @media (min-width:1000px) and (min-aspect-ratio:1/1){.ar-cabs{max-width:1180px}.ar-cabs>.ar-cab{flex-basis:calc(25% - 10.5px)}}
  @media (min-width:600px) and (min-height:900px){.ar-marq{font-size:30px;padding:12px 8px 9px}.ar-best{font-size:18px}.ar-best b{font-size:22px}.ar-playb{min-height:56px;font-size:26px;min-width:100px}}
  .ar-cab{appearance:none;-webkit-appearance:none;display:grid;grid-template-columns:minmax(0,1fr);gap:8px;width:100%;min-width:0;text-align:center;cursor:pointer;color:#fff;font:inherit;
    background:linear-gradient(var(--c),var(--cd));border:3px solid ${INK};border-radius:20px 20px 14px 14px;padding:0 10px 12px;box-shadow:0 6px 0 rgba(0,0,0,.4),inset 0 2px 0 rgba(255,255,255,.35)}
  .ar-cab:active{transform:translateY(3px);box-shadow:0 3px 0 rgba(0,0,0,.4),inset 0 2px 0 rgba(255,255,255,.35)}
  .ar-cab:focus-visible{outline:3px solid #fff;outline-offset:3px}
  .ar-marq{display:block;margin:0 -10px;padding:9px 8px 7px;background:#2b1d44;border-bottom:3px solid ${INK};border-radius:17px 17px 0 0;
    font:400 24px/1.05 var(--f-px);color:#ffe27a;letter-spacing:.02em;text-shadow:0 0 10px rgba(255,210,58,.75),0 2px 0 ${INK}}
  .ar-screen{display:block;background:#18241a;border:3px solid ${INK};border-radius:12px;padding:5px;box-shadow:inset 0 0 0 3px rgba(255,255,255,.08)}
  .ar-screen canvas{display:block;width:100%;height:auto;aspect-ratio:72/30;image-rendering:pixelated;border-radius:6px}
  .ar-info{display:flex;align-items:center;gap:8px}
  .ar-stars{display:flex;gap:1px}
  .ar-stars i{display:block;width:26px;height:26px}
  .ar-stars svg,.ar-bstar svg{width:100%;height:100%;fill:rgba(0,0,0,.28);stroke:${INK};stroke-width:1.6}
  .ar-stars i.on svg{fill:#ffd23a}
  .ar-best{flex:1;min-width:0;font:800 15px/1.15 var(--f-ui);color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.4);text-align:left}
  .ar-best b{font-size:19px}
  .ar-playb{min-height:48px;min-width:84px;display:grid;place-items:center;background:#ffd23a;color:#4a3210;border:2px solid ${INK};border-bottom-width:5px;border-radius:14px;font:400 22px/1 var(--f-px);padding:4px 12px 0}
  .ar-cab.locked{background:linear-gradient(#948da4,#5a546c);cursor:default}
  .ar-cab.locked .ar-marq{color:#d6cfe4;text-shadow:0 2px 0 ${INK};background:#3a3446}
  .ar-cab.locked.shake{animation:arShake .4s}
  .ar-screen{position:relative}
  .ar-screen canvas.ar-lockic{position:absolute;left:50%;top:50%;width:auto;height:64%;aspect-ratio:16/18;border-radius:0;transform:translate(-50%,-50%);image-rendering:pixelated;filter:drop-shadow(0 3px 0 rgba(0,0,0,.35))}
  .ar-meter{display:flex;gap:1px;flex:0 0 auto;background:rgba(0,0,0,.28);border-radius:999px;padding:3px 7px}
  .ar-meter i{display:block;width:24px;height:24px}
  .ar-meter svg{width:100%;height:100%;fill:rgba(255,255,255,.22);stroke:${INK};stroke-width:1.6}
  .ar-meter i.on svg{fill:#ffd23a}
  .ar-locktx{font-size:14px;line-height:1.2}
  .ar-locktx svg{display:inline-block;width:16px;height:16px;vertical-align:-2px;margin:0 1px;fill:#ffd23a;stroke:${INK};stroke-width:2}
  .ar-locktx b{font-size:inherit;color:#ffe27a}
  .ar-new{position:absolute;top:-10px;right:-8px;z-index:2;background:#ff4d6d;color:#fff;font:400 20px/1 var(--f-px);letter-spacing:.03em;padding:7px 10px 4px;border:2px solid ${INK};border-radius:10px;transform:rotate(8deg);box-shadow:0 3px 0 rgba(0,0,0,.35);text-shadow:0 2px 0 ${INK};animation:arNew 1.4s ease-in-out infinite}
  .ar-opened{display:flex;align-items:center;justify-content:center;gap:6px}
  .ar-lk{width:24px;height:24px;flex:0 0 auto}
  @keyframes arShake{0%,100%{transform:none}20%{transform:translateX(-7px) rotate(-1.5deg)}40%{transform:translateX(6px) rotate(1.5deg)}60%{transform:translateX(-4px)}80%{transform:translateX(3px)}}
  @keyframes arNew{0%,100%{transform:rotate(8deg) scale(1)}50%{transform:rotate(4deg) scale(1.1)}}
  .ar-foot{margin:14px auto 0;max-width:520px;text-align:center;color:#e8dcff;font:700 15px var(--f-ui)}
  .ar-play{position:absolute;inset:0;background:#a6de7c}
  .ar-cv{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
  .ar-hud{position:absolute;left:8px;right:8px;top:8px;display:flex;align-items:center;gap:8px;pointer-events:none;z-index:2}
  .ar-hud>*{pointer-events:auto}
  .ar-x{width:48px;height:48px;flex:0 0 auto;border-radius:14px;border:2px solid ${INK};border-bottom-width:4px;background:#fbf3dc;color:${INK};font:900 30px/1 var(--f-ui);padding:0;cursor:pointer}
  .ar-sc{min-width:84px;display:grid;justify-items:center;background:rgba(251,243,220,.96);border:2px solid ${INK};border-radius:12px;padding:3px 10px 2px}
  .ar-sc b{font:900 24px/1 var(--f-ui);color:${INK};font-variant-numeric:tabular-nums}
  .ar-sc small{font:800 11px/1.1 var(--f-ui);color:#6a5032;text-transform:uppercase;letter-spacing:.05em}
  .ar-mid{flex:1;min-width:0}
  .ar-bar{height:16px;border:2px solid ${INK};border-radius:9px;background:rgba(255,255,255,.85);overflow:hidden}
  .ar-bar i{display:block;height:100%;width:100%;background:linear-gradient(#b2ec7a,#5cb43a);transition:width .25s linear}
  .ar-bar.low i{background:linear-gradient(#ffb0a0,#e8505a)}
  .ar-cnt{display:inline-block;background:rgba(251,243,220,.96);border:2px solid ${INK};border-radius:12px;padding:6px 10px;font:900 20px/1 var(--f-ui);color:${INK}}
  .ar-cnt small{font-size:14px;font-weight:800;color:#6a5032}
  .ar-hearts{display:flex;gap:2px}
  .ar-hearts svg{width:30px;height:30px;fill:#ff6b7a;stroke:${INK};stroke-width:1.8;transition:transform .2s}
  .ar-hearts svg.off{fill:rgba(255,255,255,.55);transform:scale(.82)}
  .ar-ov{z-index:5}
  .ar-ov .card{text-align:center}
  .ar-ov h1{margin:4px 0 12px;font:400 30px/1.1 var(--f-px);color:var(--ink)}
  .ar-ov .ar-btns{display:grid;grid-template-columns:1fr 1.3fr;gap:10px}
  .ar-ov .btn{min-height:52px}
  html body .ar-res.pv-res[hidden]{display:none!important}
  :where(.ar-res.pv-res){position:absolute;inset:0;z-index:6;display:flex;align-items:center;justify-content:center;padding:14px;background:rgba(14,10,30,.68)}
  :where(.ar-res .pv-res-win){width:100%;max-width:440px;max-height:100%;overflow-y:auto;background:var(--panel,#fbf3dc);border:3px solid ${INK};border-radius:16px;padding:14px 14px 12px;text-align:center}
  :where(.ar-res .pv-res-title){font:400 44px/1.05 var(--f-px);color:#ffd23a;margin:2px 0 6px;text-shadow:3px 0 ${INK},-3px 0 ${INK},0 3px ${INK},0 -3px ${INK},3px 3px ${INK},-3px 3px ${INK},3px -3px ${INK},-3px -3px ${INK}}
  :where(.ar-res .pv-res-title.lose){color:#a9d2f5}
  :where(.ar-res .pv-res-hero){display:flex;align-items:flex-end;justify-content:center;gap:8px;margin:0 auto 8px}
  :where(.ar-res .pv-res-tiles){display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:8px 0 4px}
  :where(.ar-res .pv-res-tile){flex:1 1 0;min-width:84px;max-width:170px;display:grid;justify-items:center;align-content:start;gap:3px;background:var(--slot,#f0e2bc);border:2px solid ${INK};border-radius:12px;padding:7px 6px 6px}
  :where(.ar-res .pv-res-tile canvas){width:32px;height:32px}
  :where(.ar-res .pv-res-tile b){font:900 26px/1 var(--f-ui);color:${INK}}
  :where(.ar-res .pv-res-tile small){font:800 13px/1.2 var(--f-ui);color:#6a5032}
  :where(.ar-res .pv-res-btns){display:flex;gap:10px;margin-top:14px}
  :where(.ar-res .pv-res-btns .btn){flex:1 1 0;min-height:52px;font-size:18px}
  :where(.ar-res .pv-res-btns .btn.go){flex-grow:1.5}
  html body .ar-reswin .eyebrow{text-align:center}
  html body .ar-bigstars{gap:6px;min-height:96px}
  html body .ar-bigstars::before{display:none}
  .ar-bstar{display:block;width:76px;height:76px}
  .ar-bstar:nth-child(2){width:92px;height:92px;margin-bottom:10px}
  .ar-bstar.on svg{fill:#ffd23a;animation:arStar .45s cubic-bezier(.3,1.6,.5,1) both;animation-delay:inherit}
  html body .ar-reswin .pv-res-tile canvas{object-fit:contain;image-rendering:pixelated}
  html body .ar-reswin .ar-prizetile{background:#fff6cc}
  .ar-note{margin:8px 0 0;font:700 16px/1.3 var(--f-ui);color:var(--ink);text-align:center}
  .ar-note b{color:var(--accent-edge,#2a7424)}
  @keyframes arStar{0%{transform:scale(.2) rotate(-40deg);fill:rgba(0,0,0,.28)}60%{fill:#ffd23a}100%{transform:none;fill:#ffd23a}}
  @media (prefers-reduced-motion: reduce){.ar-bstar.on svg{animation:none}.ar-bar i{transition:none}.ar-cab:active{transform:none}.ar-new,.ar-cab.locked.shake{animation:none}}
  `;
  function injectCSS() {
    if (document.getElementById('ar-style')) return;
    const st = document.createElement('style'); st.id = 'ar-style'; st.textContent = CSS; document.head.appendChild(st);
  }

  // ---------------- scene ----------------
  function mount(el) {
    injectCSS();
    root = el;
    root.innerHTML = `<div class="ar-root">
      <div class="ar-hub"></div>
      <div class="ar-play" hidden>
        <canvas class="ar-cv" aria-label="The game"></canvas>
        <div class="ar-hud"></div>
        <div class="overlay ar-ov ar-quit" hidden><div class="card"><h1>Leave the game?</h1><div class="ar-btns"><button class="btn danger ar-leave" type="button">Leave</button><button class="btn go ar-stay" type="button">Keep playing</button></div></div></div>
        <div class="overlay ar-ov ar-pause" hidden><div class="card"><h1>Paused</h1><button class="btn go wide ar-resume" type="button">Keep playing</button></div></div>
        <div class="ar-res" hidden></div>
      </div></div>`;
    const q = s => root.querySelector(s);
    modalRoot = document.getElementById('modalRoot');
    hubEl = q('.ar-hub'); playEl = q('.ar-play'); cv = q('.ar-cv'); ctx = cv.getContext('2d'); hudEl = q('.ar-hud'); resEl = q('.ar-res'); quitEl = q('.ar-quit'); pauseEl = q('.ar-pause');
    q('.ar-leave').addEventListener('click', () => { snd('pop'); leaveGame(); });
    q('.ar-stay').addEventListener('click', () => { PX.Sound.unlock(); snd('pop'); resumeGame(); });
    q('.ar-resume').addEventListener('click', () => { PX.Sound.unlock(); snd('pop'); resumeGame(); });
    cv.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', e => onUp(e, false));
    window.addEventListener('pointercancel', e => onUp(e, true));
    for (const ev of ['gesturestart', 'gesturechange']) cv.addEventListener(ev, e => e.preventDefault());
    cv.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    document.addEventListener('visibilitychange', () => { if (document.hidden && visible && G && G.st !== 'done') pauseGame(); });
    window.addEventListener('resize', () => { sizeT = 0; });
    try { PS.on('reset', () => { if (G) { G = null; if (visible) showHub(); } }); } catch (e) { /* optional */ }
  }
  function show() {
    visible = true;
    if (!G) showHub();
  }
  function hide() {
    visible = false;
    // leaving the tab mid-game (the bars are hidden, so it shouldn't happen) just ends it: nothing is saved, nothing stays frozen
    if (G) { G = null; releasePtr(true); }
    if (playEl) { playEl.hidden = true; hubEl.hidden = false; }
    PS.ui.chrome(true); PS.ui.hold(false);
  }
  function frame(dt) {
    if (!visible || !G || !cv) return;
    try {
      if ((sizeT -= dt) <= 0) { sizeT = 0.25; checkSize(); }
      if (!W) return;
      // (a pop-up on top, e.g. an evolution that was already on its way: the game waits under it)
      const busy = modalRoot && modalRoot.firstElementChild;
      if (!G.paused && !busy && G.st !== 'done') update(Math.min(dt, 0.05));
      if (!G) return;
      render();
      if ((uiT -= dt) <= 0) { uiT = 0.1; updateHud(); }
      errRun = 0;
    } catch (e) {
      console.error(e);
      if (++errRun > 15) { errRun = 0; bail(); }
    }
  }
  PS.scenes = PS.scenes || {};
  PS.scenes.arcade = { mount, show, hide, frame };
  // the Arcade lays out for any screen: let it use the whole width on an iPad (app.css)
  try { document.documentElement.classList.add('pv-wide-arcade'); } catch (e) { /* optional */ }
  // test hooks (browser console): __arcade.start('bowl'), __arcade.game, __arcade.end()
  // __arcade.sim(sec, bot) runs the game loop off-screen (bot(g, dt) plays) until the end stamp: { score, stars, t }
  window.__arcade = { start: id => start(id, true), get game() { return G; }, end: () => { if (G) endGame(G, G.def.id === 'vase' ? 'win' : 'time'); }, GAMES, MODS, isOpen: id => isOpen(GBY[id]), hub: () => { if (visible && !G) renderHub(); },
    sim(sec, bot) { const g = G; if (!g || !W) return null; const dt = 1 / 40; for (let i = 0; i < sec * 40 && G === g && g.st !== 'end' && g.st !== 'done'; i++) { if (bot && g.st === 'play') bot(g, dt); update(dt); } return { score: g.score, stars: g.mod.starsOf(g), t: +g.t.toFixed(1), st: g.st, hearts: g.hearts }; },
    get size() { return { W, H }; } };
})();
