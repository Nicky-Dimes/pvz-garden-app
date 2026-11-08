// art-v2-ai.js — PVZ Garden: characters made from the family's ChatGPT art (the approved 16-bit pixel style), Nov 2026.
// tools/ai_ingest.js turns each sliced ChatGPT sheet into art-v2-ai-NN.js, which calls PX.v2ai.add(kind, id, stage, data) with a
// 64x64 (Zombosses 96x96) indexed pixel sprite: data = { pal: ['#hex', ...], rle: [row strings], eyes: [[x, y, w, h], ...] }.
// Each sprite is ONE pose (idle). The other poses are made here from it, the way the engine animates pictures:
//   walk B: a 2-px hop · cheer: hop + happy ^ ^ eyes · blink / sleep / knocked out: closed eyes (KO also slumps 3 px)
//   hurt: sad eyes, 1 px lower · attack: a determined squint, a 1-px recoil.
// Element / fusion recolours shift the hue of the sprite's main colours toward the engine palette (C.main).
// The sprite registers as PX.PLANT_ART2 / ZOMBIE_ART2 / BOSS_ART2, so the existing v2 dispatch (art-core.js) uses it with the
// costume system on top; looks without a ChatGPT sprite keep their code art.
(function () {
  'use strict';
  const V = PX.v2, OUT = PX.INK, WHITE = '#ffffff', EYE = '#24183a';
  const CH = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'; // palette symbols (letters only: digits are run lengths)
  const store = { plant: {}, zombie: {}, boss: {} };
  // rows are run-length coded: "<count><char>" for runs of 3+, a plain char otherwise ('.' = empty)
  function unrle(s) { let out = '', n = ''; for (const ch of s) { if (ch >= '0' && ch <= '9') { n += ch; continue; } out += n ? ch.repeat(+n) : ch; n = ''; } return out; }
  function decode(d) {
    if (d._grid) return d._grid;
    const rows = d.rle.map(unrle), N = rows.length, a = new Array(N * N).fill(null);
    rows.forEach((r, y) => { for (let x = 0; x < N && x < r.length; x++) { const c = r[x]; if (c !== '.') a[y * N + x] = d.pal[CH.indexOf(c)]; } });
    return (d._grid = { N, a });
  }
  const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const lum = h => { const [r, g, b] = hexRgb(h); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
  // the colour most used in a ring round a box (the skin an eye sits in)
  function skinAround(a, N, x, y, w, h) {
    const cnt = new Map();
    for (let j = y - 1; j <= y + h; j++) for (let i = x - 1; i <= x + w; i++) { if (i >= x && i < x + w && j >= y && j < y + h) continue; const c = a[j * N + i]; if (!c || c === OUT || c === EYE || c === WHITE) continue; cnt.set(c, (cnt.get(c) || 0) + 1); }
    let best = null, bn = 0; for (const [c, k] of cnt) if (k > bn) { best = c; bn = k; } return best;
  }
  // repaint one eye (box x, y, w, h) for a mood
  function eyeMood(a, N, [x, y, w, h], mood, side) {
    const skin = skinAround(a, N, x, y, w, h); if (!skin) return;
    const set = (i, j, c) => { if (i >= 0 && j >= 0 && i < N && j < N) a[j * N + i] = c; };
    const clear = () => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { const c = a[j * N + i]; if (c === EYE || c === WHITE || (c && lum(c) < 0.3 && c !== OUT)) set(i, j, skin); } };
    if (mood === 'blink' || mood === 'closed' || mood === 'sleepy') { clear(); const yy = y + Math.round(h * 0.55); for (let i = 0; i < w; i++) set(x + i, yy + (i > 0 && i < w - 1 ? 1 : 0), OUT); return; }
    if (mood === 'happy') { clear(); const yy = y + Math.round(h * 0.6); for (let i = 0; i < w; i++) set(x + i, yy - (i > 0 && i < w - 1 ? 1 : 0) - (w > 4 && i > 1 && i < w - 2 ? 1 : 0), OUT); return; }
    if (mood === 'sad' || mood === 'brave' || mood === 'mad') { // a lid cuts the top of the eye on a slant
      const cut = mood === 'mad' ? Math.ceil(h * 0.5) : Math.ceil(h * 0.34);
      for (let i = 0; i < w; i++) {
        const f = side > 0 ? i / Math.max(1, w - 1) : 1 - i / Math.max(1, w - 1); // 0 at the inner side, 1 at the outer side
        const c = mood === 'sad' ? Math.round(cut * f) : Math.round(cut * (1 - f));
        for (let j = 0; j < c; j++) if (a[(y + j) * N + x + i] && a[(y + j) * N + x + i] !== OUT) set(x + i, y + j, skin);
        set(x + i, y + Math.max(0, c - 1), OUT);
      }
    }
  }
  // the pose, applied to a copy of the idle sprite
  function posed(d, P, kind) {
    const { N, a: a0 } = decode(d), a = a0.slice();
    const eyes = d.eyes || [], cx = eyes.length ? eyes.reduce((s, e) => s + e[0] + e[2] / 2, 0) / eyes.length : N / 2;
    const mood = P.sleep ? 'closed' : P.eyes;
    if (mood && mood !== 'sleepy-no') eyes.forEach(e => eyeMood(a, N, e, mood === 'closed' && P.mouth === 'o' && !P.sleep ? 'closed' : mood, e[0] + e[2] / 2 >= cx ? 1 : -1));
    let dx = 0, dy = 0;
    if (kind === 'zombie') { // a shuffle: a 1-px bob on the second step, lean in to bite, rock back when hit
      if (P.walk && P.frame) dy = -1;
      if (P.mouth === 'open' || P.mouth === 'grin') dx = 1;
      if (P.eyes === 'sad') dx = -1;
    } else if (kind !== 'boss') {
      if (P.walk && P.frame) dy = -2;
      if (P.arms === 'up') dy = -2;
      if (P.eyes === 'sad') dy = 1;
      if (P.arms === 'out' || (P.mouth === 'open' && P.eyes === 'brave')) dx = -1;
      if (P.eyes === 'closed' && P.mouth === 'o' && !P.sleep) dy = 3; // knocked out: slumped
    } else if (P.f) dy = -1;
    if (!dx && !dy) return { N, a };
    // hops and recoils move the whole sprite; a sink (hurt, knocked out) moves only the part above the base, which stays put
    let low = -1; for (let y = N - 1; y >= 0 && low < 0; y--) for (let x = 0; x < N; x++) if (a[y * N + x]) { low = y; break; }
    const keep = dy > 0 ? low - 8 : N, b = new Array(N * N).fill(null);
    if (dy > 0) for (let y = keep; y < N; y++) for (let x = 0; x < N; x++) b[y * N + x] = a[y * N + x];
    for (let y = 0; y < Math.min(keep, N); y++) for (let x = 0; x < N; x++) { const c = a[y * N + x]; if (!c) continue; const X = x + dx, Y = y + dy; if (X >= 0 && X < N && Y >= 0 && Y < N - 1) b[Y * N + X] = c; }
    return { N, a: b };
  }
  // element / fusion recolour: the sprite's main hue family moves to the engine palette's main colour
  function tint(a, C) {
    if (!C || !C.__v2tint || !C.main) return a;
    const to = V.hex2hsl(V.richMid(C.main)), hues = new Map();
    for (const c of a) { if (!c || c === OUT || c === WHITE || c === EYE) continue; const [h, s] = V.hex2hsl(c); if (s < 0.25) continue; const k = Math.round(h / 20); hues.set(k, (hues.get(k) || 0) + 1); }
    let main = 0, bn = 0; for (const [k, n] of hues) if (n > bn) { main = k * 20; bn = n; }
    const cache = new Map();
    return a.map(c => {
      if (!c || c === OUT || c === WHITE || c === EYE) return c; if (cache.has(c)) return cache.get(c);
      const [h, s, l] = V.hex2hsl(c), d = Math.abs(((h - main + 540) % 360) - 180);
      const v = d < 50 && s >= 0.2 ? V.hsl2hex(to[0] + (((h - main + 540) % 360) - 180) * 0.5, Math.min(1, (s + to[1]) / 2 + 0.05), l) : c;
      cache.set(c, v); return v;
    });
  }
  // geometry for costumes (logical px): the head is the widest part of the upper body; eyes from the data
  function geomOf(d) {
    if (d._geo) return d._geo;
    const { N, a } = decode(d); let top = N, bot = -1, x0 = N, x1 = -1;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (a[y * N + x]) { top = Math.min(top, y); bot = Math.max(bot, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
    const eyes = d.eyes || [];
    const ey = eyes.length ? Math.round(eyes.reduce((s, e) => s + e[1] + e[3] / 2, 0) / eyes.length) : Math.round(top + (bot - top) * 0.32);
    let l = x1, r = x0; for (let x = 0; x < N; x++) if (a[ey * N + x]) { l = Math.min(l, x); r = Math.max(r, x); }
    const hr = Math.max(6, (r - l + 1) / 2), hx = (l + r + 1) / 2, hy = Math.min(ey + 1, top + hr);
    return (d._geo = { hx, hy, hr, ey, front: x1 + 1 });
  }
  function draw(g, d, P, C, kind) {
    const { N, a } = posed(d, P || {}, kind), b = tint(a, C);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const c = b[y * N + x]; if (c) g.fset(x, y, c); }
  }
  function add(kind, id, stage, data) {
    if (kind === 'plant') {
      const s = store.plant[id] = store.plant[id] || {}; s[stage] = data;
      const prev = PX.PLANT_ART2[id] && !PX.PLANT_ART2[id].ai ? PX.PLANT_ART2[id] : null, old = () => PX.PLANT_ART[id];
      const fn = function (g, st, P, C) {
        const d = s[st];
        if (!d) { const f = prev || old(); return f ? f(g, st, P, C) : V.geo(g, { hx: 32, hy: 32, hr: 12, ey: 32 }); }
        draw(g, d, P, C, 'plant');
        const G = geomOf(d); return V.geo(g, { hx: G.hx, hy: G.hy, hr: G.hr, ey: G.ey, front: G.front });
      };
      fn.ai = true; PX.PLANT_ART2[id] = fn;
    } else if (kind === 'zombie') {
      store.zombie[id] = data; const fn = (g, P) => draw(g, data, P || {}, null, 'zombie'); fn.ai = true; PX.ZOMBIE_ART2[id] = fn;
    } else if (kind === 'boss') {
      store.boss[id] = data; PX.BOSS_ART2[id] = { w: 48, h: 48, ai: true, draw(g, f) { draw(g, data, { f }, null, 'boss'); } };
    }
  }
  PX.v2ai = { add, store, decode, geomOf };
})();
