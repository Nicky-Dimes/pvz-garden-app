// art-world2.js — PVZ Garden: 8 more garden maps (looks a garden can wear), their props, houses and race scenery.
// Loaded after art-world.js (PX.PVZ_PROP exists) and before data.js / garden.js / race.js. Adds:
//   PX.PVZ_PROP[kind]          new garden props { w, h, draw(g, theme) }, anchor bottom-centre (floor(w / 2), h)
//   PX.pvzHouse(F)             wrapped: new facade kinds 'saloon' | 'igloo' | 'beachhut' | 'tent' | 'cave' | 'dome' | 'castle' | 'tourbus'
//                              (74 x 70 like the old house; .meta = { door: [x, y], win: [[x, y]...] })
//   PX.GARDEN_TREE_SLOTS[kind] where 3 fruit hang on each new fruit tree (share of sprite width / height from the base)
//   PX.GARDEN_GLOWS[kind]      night glow for the new lit props, same shape as GLOWS in garden.js: [x share, y share, radius, 'r,g,b']
//   PX.GARDEN_MAPS[id]         the 8 maps (same schema as THM in garden.js)
//   PX.RACE_MAPS[id]           race scenery for the 8 maps (same keys as TH in race.js)
// Style: TRUE chibi stickers like art-world.js (docs/pvz-art-guide.md): round chunky shapes, flat pastel fills with one soft
// shade crescent and a small highlight, thin piece outlines plus a bold outer ring (g.outerLine()).
(function () {
  'use strict';
  if (!window.PX || !PX.Grid) return;
  const { Grid, INK } = PX;
  const AR = PX.art || {};
  const mixHex = AR.mixHex || PX.mixHex || (a => a);
  const WHITE = '#ffffff';

  // ---------------- helpers (the same kit as art-world.js) ----------------
  const piece = (G, draw) => { const t = new Grid(G.w, G.h); t.dither = G.dither; draw(t); t.outline(); G.merge(t); return G; };
  const flat = R => [R[1], R[1], R[2]];
  const IN = g => { const m = (x, y) => g.filled(x, y); m.fine = true; return m; };
  // the chibi crescent shade for any silhouette already drawn on t (see art-world.js)
  function softShade(t, cx, cy, rx, ry, R, o) {
    o = o || {}; const k = o.shade == null ? 0.16 : o.shade, K = t.k || 1, sx = cx - rx * k, sy = cy - ry * k * 1.15;
    for (let fy = 0; fy < t.fh; fy++) for (let fx = 0; fx < t.fw; fx++) {
      const i = fy * t.fw + fx, c = t.a[i]; if (!c || c === INK || (o.only && c !== o.only)) continue;
      if (!PX.inEll((fx + 0.5) / K, (fy + 0.5) / K, sx, sy, rx * 1.02, ry * 1.02, o.rot || 0).in) t.a[i] = R[2];
    }
    if (o.hl !== false) t.ell(cx - rx * 0.42, cy - ry * 0.5, Math.max(0.6, rx * 0.22), Math.max(0.45, ry * 0.13), R[0], -0.55, IN(t));
    return t;
  }
  const soft = (t, cx, cy, rx, ry, R, o) => (AR.softBody ? AR.softBody(t, cx, cy, rx, ry, R, o) : t.ell(cx, cy, rx, ry, flat(R), (o && o.rot) || 0));
  // a rounded box from (x0, y0) to (x1, y1), corner radius r; col may be a function (x, y) -> colour
  function box(t, x0, y0, x1, y1, r, col) {
    const k = t.k || 1;
    for (let fy = Math.floor(y0 * k); fy < Math.ceil(y1 * k); fy++) for (let fx = Math.floor(x0 * k); fx < Math.ceil(x1 * k); fx++) {
      const px = (fx + 0.5) / k, py = (fy + 0.5) / k, cx = Math.min(Math.max(px, x0 + r), x1 - r), cy = Math.min(Math.max(py, y0 + r), y1 - r);
      if ((px - cx) ** 2 + (py - cy) ** 2 <= r * r) t.fset(fx, fy, typeof col === 'function' ? col(px, py) : col);
    }
    return t;
  }
  const line = (g, pts, r, col) => PX.stroke(g, pts, r, r, col);
  // only where something is already drawn (lines that stay inside a shape)
  const lineIn = (g, pts, r, col) => { const t = new Grid(g.w, g.h); PX.stroke(t, pts, r, r, col); for (let i = 0; i < g.a.length; i++) if (t.a[i] && g.a[i] && g.a[i] !== INK) g.a[i] = t.a[i]; };
  // night: a soft blue tint (like art-world.js)
  const nt = (R, th, k) => (th === 'night' ? R.map(c => mixHex(c, '#7f88cc', k == null ? 0.18 : k)) : R);
  // a little chibi face: big glossy eyes, blush, a tiny mouth (s = the body's radius)
  function cface(g, cx, cy, s, o) {
    o = o || {};
    if (AR.chibiEyes) AR.chibiEyes(g, cx, cy, { sp: o.sp || s * 0.86, w: o.w || Math.max(1.3, s * 0.42), h: o.h || Math.max(1.7, s * 0.56), mood: o.mood, col: o.col, white: o.white, look: o.look });
    if (o.blush !== false && AR.blush) AR.blush(g, cx, cy + (o.by || s * 0.42), { sp: o.bsp || s * 1.04, w: o.bw || 0.8, h: 0.5, col: o.blushCol });
    if (o.mouth !== null && AR.chibiMouth) AR.chibiMouth(g, cx + (o.mx || 0.1), cy + (o.my || s * 0.48), o.mouth || 'smile', o.mw || 1.4);
  }
  // a 4-point twinkle in fine pixels on empty space (after the outer line)
  function twinkleF(g, x, y, c, big) {
    const put = (a, b, col) => { const fx = Math.floor((x + a) * g.k), fy = Math.floor((y + b) * g.k); if (!g.fget(fx, fy)) g.fset(fx, fy, col); };
    put(0, 0, WHITE); for (const [a, b] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) put(a, b, c);
    if (big) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(a, b, c);
  }
  // a five-petal blossom (petals as one piece)
  function blossom(g, x, y, r, R, mid) {
    piece(g, t => { for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; t.ell(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.58, r * 0.56, r * 0.5, R[1]); } softShade(t, x, y, r, r, R, { hl: false }); });
    g.ell(x, y, r * 0.34, r * 0.32, mid || '#ffe27a');
  }
  // tiny 3x5 pixel letters for signs (art pixels; set colours whole art pixels, so draw on a filled board)
  const FONT = { S: ['111', '100', '111', '001', '111'], A: ['010', '101', '111', '101', '101'], L: ['100', '100', '100', '100', '111'], O: ['111', '101', '101', '101', '111'],
    N: ['101', '111', '111', '111', '101'], B: ['110', '101', '110', '101', '110'], C: ['111', '100', '100', '100', '111'], H: ['101', '101', '111', '101', '101'],
    U: ['101', '101', '101', '101', '111'], T: ['111', '010', '010', '010', '010'], R: ['110', '101', '110', '101', '101'], E: ['111', '100', '110', '100', '111'], F: ['111', '100', '110', '100', '100'], P: ['110', '101', '110', '100', '100'] };
  function letters(g, str, x, y, col, dx) {
    [...str].forEach((ch, i) => { const F = FONT[ch]; if (!F) return; F.forEach((row, yy) => { for (let xx = 0; xx < 3; xx++) if (row[xx] === '1') g.set(x + i * (dx || 4) + xx, y + yy, col); }); });
  }
  // fine-pixel letters (half-size 3x5 font: each 'pixel' is one fine pixel)
  function fineLetters(g, str, x, y, col) {
    [...str].forEach((ch, i) => { const F = FONT[ch]; if (!F) return; F.forEach((row, yy) => { for (let xx = 0; xx < 3; xx++) if (row[xx] === '1') g.dot(x + i * 2 + xx * 0.5, y + yy * 0.5, col); }); });
  }
  // a donut wheel (two pieces: tyre and hub)
  function wheel(g, x, y, r, R, hub) { piece(g, t => soft(t, x, y, r, r, R, { hl: false })); g.ell(x, y, r * 0.4, r * 0.4, hub || R[0]); }
  const tuft = (g, x, y, col) => { for (const [dx, h] of [[-1, 1.6], [0, 2.4], [1, 1.5]]) line(g, [[x + dx * 0.7, y], [x + dx * 1.1, y - h]], 0.32, col); };

  const P = {};
  const WOOD = ['#fbe4c8', '#e6b88e', '#c99870'];
  const WEST = ['#ffe6cc', '#f0bb8e', '#d69a72'];
  const IRON = ['#eceaf6', '#bcb8d4', '#9a96b8'];
  const CACTUS = ['#e2f6c4', '#a8d88a', '#84bc72'];
  const GOLD = ['#fff6c8', '#ffd866', '#f0b44a'];
  const SNOW = ['#ffffff', '#f0f6ff', '#cddcf0'];
  const ICE = ['#f4fcff', '#c8ecfa', '#98cee8'];
  const PINE = ['#dcf6e6', '#9cd6bc', '#78baa0'];

  // =====================================================================================================
  // Wild West
  // =====================================================================================================
  // a wooden mine cart full of rocks on two donut wheels (the Wild West mower); gold: the Lost City's gold cart full of gems
  function cartArt(g, th, gold) {
    const B = nt(gold ? GOLD : WEST, th), M = nt(gold ? ['#fff0d0', '#f2c060', '#d89c3a'] : IRON, th), RW = nt(gold ? ['#ffe8d8', '#e8a888', '#c88468'] : ['#e8e6f4', '#aeaac8', '#8c88aa'], th);
    if (gold) { piece(g, t => { for (const [x, y, c] of [[6.4, 3.4, '#9fe0f8'], [9.4, 2.6, '#ffb0c8'], [12.4, 3.2, '#b8f0a8'], [14.6, 3.8, '#d8b8ff']]) t.ell(x, y, 1.7, 1.4, c); }); for (const [x, y] of [[5.8, 2.9], [8.8, 2.1], [11.8, 2.7], [14, 3.3]]) g.dot(x, y, WHITE); }
    else piece(g, t => { for (const [x, y, r] of [[6.4, 3.6, 1.9], [9.6, 2.8, 2.2], [13, 3.4, 2], [15, 4.2, 1.4]]) t.ell(x, y, r, r * 0.8, '#d6d0e4'); softShade(t, 10.5, 3.4, 5.6, 1.8, ['#f2eefa', '#d6d0e4', '#b2aac8'], { hl: false }); });
    piece(g, t => { t.poly([[2.4, 4.2], [18.6, 4.2], [17, 10.2], [4, 10.2]], B[1]); softShade(t, 10.5, 7, 8.4, 3.4, B, { hl: false }); });
    piece(g, t => box(t, 1.6, 3.4, 19.4, 5.4, 0.9, M[1]));
    for (const x of [7, 14]) lineIn(g, [[x, 5.6], [x - (x < 10 ? 0.4 : -0.4), 10]], 0.4, M[1]);
    if (gold) { g.ell(10.5, 7.6, 1.2, 1.1, '#9fe0f8', 0, IN(g)); g.dot(10.2, 7.3, WHITE); }
    else for (const x of [4.6, 10.5, 16.2]) g.dot(x, 4.4, M[0]);
    wheel(g, 6.2, 10.6, 2.2, RW); wheel(g, 14.8, 10.6, 2.2, RW);
    g.outerLine();
    if (gold) { twinkleF(g, 3.4, 1.4, '#ffe680', true); twinkleF(g, 18, 1.6, '#ffe680'); }
  }
  P.minecart = { w: 21, h: 13, draw(g, th) { cartArt(g, th, false); } };
  P.minecart_gold = { w: 21, h: 13, draw(g, th) { cartArt(g, th, true); } };
  P.wagonwheel = { w: 15, h: 15, draw(g, th) {
    const W = nt(WEST, th), L = nt(['#eef8c8', '#c8dc8c', '#a8c070'], th);
    piece(g, t => {
      t.ell(7.5, 7.7, 6.6, 6.6, W[1]); t.ell(7.5, 7.7, 4.6, 4.6, null);
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.2; line(t, [[7.5, 7.7], [7.5 + Math.cos(a) * 5, 7.7 + Math.sin(a) * 5]], 0.5, W[1]); }
      softShade(t, 7.5, 7.7, 6.8, 6.8, W);
    });
    piece(g, t => soft(t, 7.5, 7.7, 1.8, 1.8, nt(IRON, th), { hl: false }));
    piece(g, t => { t.ell(3, 14.2, 2.2, 0.9, L[1]); t.ell(12.4, 14.3, 2, 0.8, L[1]); });
    g.outerLine();
  } };
  P.haybale = { w: 18, h: 12, draw(g, th) {
    const H = nt(['#fff8d2', '#f6de8c', '#e0c068'], th), TW = nt(['#ffd8c8', '#ec9c86', '#d07e6a'], th);
    piece(g, t => { box(t, 1, 3, 17, 11.6, 2.6, H[1]); for (const [x, y] of [[3.4, 3.2], [7, 2.6], [11, 2.8], [14.6, 3.3]]) t.ell(x, y, 1.6, 0.9, H[1]); softShade(t, 9, 7.2, 8.4, 4.8, H); });
    for (const [x, y, a] of [[3.6, 6, 0.4], [8, 5.4, -0.3], [12.6, 7, 0.2], [4.8, 9.2, -0.4], [10.4, 9.4, 0.5], [14.6, 9.6, -0.2], [6.4, 7.6, 0.1]]) lineIn(g, [[x - Math.cos(a), y - Math.sin(a)], [x + Math.cos(a), y + Math.sin(a)]], 0.2, H[2]);
    for (const x of [6, 12]) lineIn(g, [[x, 2], [x, 12]], 0.45, TW[1]);
    for (const [x, y] of [[2.6, 1.6], [15.4, 2]]) line(g, [[x, y + 1.2], [x + (x < 9 ? -0.8 : 0.8), y]], 0.25, H[1]);
    g.outerLine();
  } };
  // the flowering cactus: a big chubby saguaro with pink blossoms (a fruit tree: fruit hang on its arms)
  P.saguaro = { w: 26, h: 36, draw(g, th) {
    const C = nt(CACTUS, th), S = nt(['#fff4dc', '#f2dcb0', '#dcc090'], th), FL = nt(['#fff0f4', '#ffb2c8', '#f08eaa'], th);
    piece(g, t => { t.ell(13, 34.6, 8.4, 1.6, S[1]); t.ell(9, 34.2, 3, 1.4, S[1]); softShade(t, 13, 34.4, 8.6, 1.8, S, { hl: false }); });
    piece(g, t => {
      box(t, 9.4, 6.4, 16.6, 35, 3.6, C[1]);
      line(t, [[10.4, 23.4], [5.6, 23.4], [4.2, 21.6], [4.2, 12.6]], 2.2, C[1]); t.ell(4.2, 12.4, 2.2, 2.2, C[1]);
      line(t, [[15.6, 20], [20.4, 20], [21.8, 18.2], [21.8, 10.4]], 2.1, C[1]); t.ell(21.8, 10.2, 2.1, 2.1, C[1]);
      softShade(t, 13, 20, 10, 15, C);
    });
    for (const x of [11.2, 13, 14.8]) lineIn(g, [[x, 8.4], [x, 33.6]], 0.2, C[2]);
    lineIn(g, [[4.2, 13], [4.2, 21.6]], 0.2, C[2]); lineIn(g, [[21.8, 11], [21.8, 18.4]], 0.2, C[2]);
    for (const [x, y] of [[10.2, 12], [15.8, 15], [10.2, 26], [15.8, 29], [3.4, 16], [5, 19.6], [21, 13.6], [22.6, 16], [12, 19.4], [14, 23.6]]) g.dot(x, y, WHITE);
    blossom(g, 13, 6.2, 2.4, FL); blossom(g, 4.2, 10.4, 1.9, FL); blossom(g, 21.8, 8.2, 1.9, FL);
    g.outerLine();
  } };
  P.barrelcactus = { w: 13, h: 12, draw(g, th) {
    const C = nt(CACTUS, th), FL = nt(['#fff6e0', '#ffc896', '#f2a476'], th), S = nt(['#fff4dc', '#f2dcb0', '#dcc090'], th);
    piece(g, t => { t.ell(6.5, 11, 5.4, 1, S[1]); });
    piece(g, t => { t.ell(6.5, 7, 5, 4.4, C[1]); softShade(t, 6.5, 7, 5, 4.4, C); });
    for (const dx of [-2.6, 0, 2.6]) { const pts = []; for (let y = 3.2; y <= 10.8; y += 0.8) pts.push([6.5 + dx * Math.sqrt(Math.max(0, 1 - ((y - 7) / 4.4) ** 2)), y]); lineIn(g, pts, 0.18, C[2]); }
    for (const [x, y] of [[3.4, 6], [9.6, 6.4], [5.2, 9.4], [8, 9.2]]) g.dot(x, y, WHITE);
    blossom(g, 6.5, 2.6, 2.1, FL);
    g.outerLine();
  } };
  P.sheriffsign = { w: 14, h: 18, draw(g, th) {
    const W = nt(WEST, th);
    piece(g, t => box(t, 6, 8, 8, 17.4, 0.6, W[2]));
    piece(g, t => { box(t, 1, 1.4, 13, 9.4, 1.2, W[1]); softShade(t, 7, 5.4, 6.4, 4.2, W, { hl: false }); });
    lineIn(g, [[1.6, 5.4], [12.4, 5.4]], 0.18, W[2]);
    piece(g, t => { t.poly(PX.starPts(7, 5.5, 3.2, 1.45, 5), GOLD[1]); softShade(t, 7, 5.5, 3, 3, GOLD, { hl: false }); });
    g.ell(7, 5.6, 0.7, 0.7, GOLD[0]);
    for (const [x, y] of [[2, 2.4], [12, 2.4], [2, 8.4], [12, 8.4]]) g.dot(x, y, W[2]);
    g.outerLine();
    twinkleF(g, 12.6, 0.8, '#ffe680');
  } };

  // =====================================================================================================
  // Frostbite Caves
  // =====================================================================================================
  // a toy snowplow (the Frostbite mower): a baby-blue cab, a big butter-yellow blade in front, donut wheels
  P.snowplow = { w: 21, h: 13, draw(g, th) {
    const B = nt(['#e8f6ff', '#a8d6f4', '#86b6e0'], th), Y = nt(['#fffae0', '#ffe28a', '#f0c060'], th), RW = nt(['#e8e6f4', '#aeaac8', '#8c88aa'], th);
    piece(g, t => { box(t, 2.2, 5, 14.4, 10.4, 1.6, B[1]); box(t, 3.6, 1.4, 10.4, 6.6, 1.6, B[1]); softShade(t, 8, 6, 6.4, 4.6, B); });
    piece(g, t => box(t, 5, 2.6, 9.4, 5.2, 0.9, '#e4f8ff'));
    g.ell(6, 3.3, 0.5, 0.4, WHITE);
    piece(g, t => { t.ell(7, 0.9, 1.1, 0.8, '#ffb48a'); });
    // the blade: a curved scoop, hollow side forward
    piece(g, t => { const pts = []; for (let i = 0; i <= 14; i++) { const a = 2.0 + i * 2.28 / 14; pts.push([22 + Math.cos(a) * 5.6, 7.6 + Math.sin(a) * 5]); } for (let i = 14; i >= 0; i--) { const a = 2.1 + i * 2.08 / 14; pts.push([22 + Math.cos(a) * 3.6, 7.6 + Math.sin(a) * 4.2]); } t.poly(pts, Y[1]); softShade(t, 17.6, 7.6, 1.6, 4.6, Y, { hl: false }); });
    for (const y of [5.4, 9.8]) lineIn(g, [[15.6, y], [20.4, y]], 0.32, '#ffb48a');
    piece(g, t => box(t, 13.6, 6.6, 17, 8.4, 0.5, RW[1]));
    wheel(g, 5.4, 10.6, 2.2, RW); wheel(g, 11.6, 10.6, 2.2, RW);
    g.outerLine();
    for (const [x, y] of [[20.4, 12.4], [18.6, 12.6]]) g.dot(x, y, WHITE);
  } };
  P.snowman = { w: 15, h: 21, draw(g, th) {
    const S = nt(SNOW, th), SC = nt(['#ffe2ea', '#ffa8bc', '#ec86a0'], th), HAT = nt(['#e6f0ff', '#a8c4f0', '#86a2d8'], th), TW = nt(['#e8d0c0', '#b48c74', '#94705c'], th);
    piece(g, t => { line(t, [[3.4, 13.4], [1.2, 11], [0.8, 9.8]], 0.36, TW[1]); line(t, [[1.6, 11.6], [0.6, 12]], 0.3, TW[1]); line(t, [[11.6, 13.4], [13.8, 11], [14.2, 9.8]], 0.36, TW[1]); line(t, [[13.4, 11.6], [14.4, 12]], 0.3, TW[1]); });
    piece(g, t => soft(t, 7.5, 16.4, 5.4, 4.2, S));
    piece(g, t => soft(t, 7.5, 9, 5, 4.6, S));
    g.dots([[7.4, 15], [7.4, 17.4]], '#8a8098'); g.dots([[7.9, 15], [7.9, 17.4]], '#8a8098');
    piece(g, t => { box(t, 3, 11.6, 12, 13.6, 1, SC[1]); box(t, 9, 12.4, 11.2, 17, 0.8, SC[1]); });
    lineIn(g, [[9.4, 16.2], [10.8, 16.2]], 0.22, SC[0]);
    piece(g, t => { t.ell(7.5, 5.6, 4.6, 2.9, HAT[1], 0, (x, y) => y <= 5.8); box(t, 2.6, 4.8, 12.4, 6.6, 0.9, HAT[1]); softShade(t, 7.5, 4.6, 4.6, 2.6, HAT, { hl: false }); });
    piece(g, t => soft(t, 7.5, 2.2, 1.6, 1.5, nt(['#ffffff', '#fff4f6', '#f2d8e0'], th), { hl: false }));
    for (let x = 3.6; x <= 11.6; x += 1.6) g.dot(x, 5.6, HAT[0]);
    cface(g, 7.2, 8.7, 4.6, { col: '#5a5266', sp: 3.6, w: 1.5, h: 1.9, mouth: null, by: 1.6, bsp: 5.4 });
    piece(g, t => t.poly([[7.6, 9.6], [10.8, 10.2], [7.6, 10.9]], '#ffb070'));
    AR.chibiMouth && AR.chibiMouth(g, 7.2, 11, 'smile', 1.3);
    g.outerLine();
  } };
  // two chunky ice blocks (a little fish frozen in the big one, smiling)
  P.iceblock = { w: 16, h: 14, draw(g, th) {
    const I = nt(ICE, th), F = nt(['#ffe8d8', '#ffb898', '#f09a7c'], th);
    piece(g, t => { box(t, 9.4, 6.4, 15.4, 13.6, 1.6, I[1]); softShade(t, 12.4, 10, 3.2, 3.8, I, { hl: false }); });
    piece(g, t => { box(t, 0.8, 2.8, 11.2, 13.6, 2.2, I[1]); softShade(t, 6, 8.2, 5.4, 5.6, I, { hl: false }); });
    const fm = IN(g);
    g.ell(5.6, 8.6, 2.4, 1.6, F[1], 0, fm); g.poly([[7.6, 8.6], [9.4, 7.2], [9.4, 10]], F[1]); g.ell(5, 8.2, 1, 0.6, F[0], 0, fm);
    g.dot(4.3, 8.3, INK); g.dot(4.8, 8.3, INK);
    line(g, [[2.4, 4.6], [2.4, 6.6]], 0.3, WHITE); g.dot(2.3, 3.8, WHITE); line(g, [[10.6, 7.8], [10.6, 9]], 0.25, WHITE);
    piece(g, t => { t.ell(4.4, 3, 3, 1, WHITE); t.ell(7.6, 2.8, 2.4, 0.9, WHITE); t.ell(12.4, 6.6, 2.2, 0.8, WHITE); });
    g.outerLine();
    twinkleF(g, 14.6, 3.4, '#bfe8fa', true);
  } };
  // a frosty pine in three snowy tiers (a fruit tree)
  P.snowpine = { w: 26, h: 38, draw(g, th) {
    const L = nt(PINE, th), S = nt(SNOW, th), TR = nt(['#f0dcd0', '#c8a490', '#a88674'], th);
    piece(g, t => { box(t, 11.2, 30, 14.8, 37.4, 1, TR[1]); t.ell(13, 37, 4.4, 1.1, TR[1]); });
    // each tier: a soft triangle with a round bottom; snow lies on the shoulders that show under the tier above
    const tier = (y0, y1, hw, snowTo) => piece(g, t => {
      t.poly([[13 - hw, y1 - 1.8], [13, y0], [13 + hw, y1 - 1.8]], L[1]); box(t, 13 - hw, y1 - 3.8, 13 + hw, y1, 1.9, L[1]); t.ell(13, y0 + 0.8, 1.4, 1.2, L[1]);
      softShade(t, 13, (y0 + y1) / 2 + 1, hw * 0.8, (y1 - y0) * 0.6, L, { hl: false });
      const snowM = (x, y) => t.filled(x, y) && y < snowTo + Math.sin(x * 1.9) * 0.7; snowM.fine = true;
      t.ell(13, (y0 + y1) / 2, hw + 2, (y1 - y0), S[1], 0, snowM);
    });
    tier(16, 32, 11.4, 25.4); tier(8, 23.6, 8.6, 17.4); tier(1, 15, 6, 6.6);
    for (const [x, y] of [[6, 30], [19, 29.4], [9, 21], [17.4, 21.6], [11, 13], [15.4, 12.6]]) g.dot(x, y, L[0]);
    g.outerLine();
    for (const [x, y] of [[2.4, 10], [23.6, 6], [1.6, 24], [24.6, 20]]) twinkleF(g, x, y, '#cfeeff');
  } };
  P.snowbush = { w: 20, h: 12, draw(g, th) {
    const L = nt(PINE, th), S = nt(SNOW, th);
    piece(g, t => { box(t, 1, 5, 19, 11.6, 2.4, L[1]); for (const [x, y, r] of [[4.4, 5.6, 3.2], [9.4, 4.4, 3.6], [14.6, 4.8, 3.4], [17.4, 6.4, 2.4]]) t.ell(x, y, r, r * 0.9, L[1]); softShade(t, 10, 8, 10, 5, L, { hl: false }); });
    piece(g, t => { for (const [x, y, r] of [[4.4, 3.6, 2.6], [9.4, 2.4, 3], [14.6, 2.9, 2.8], [17.6, 4.8, 1.8]]) t.ell(x, y, r, r * 0.62, S[1]); softShade(t, 10, 3, 9, 2.4, S, { hl: false }); });
    for (const [x, y] of [[6, 8.4], [12.6, 9.2], [16, 8]]) { g.ell(x, y, 0.75, 0.75, '#ffb2c8', 0, IN(g)); g.dot(x - 0.3, y - 0.3, WHITE); }
    g.outerLine();
  } };
  P.sled = { w: 18, h: 10, draw(g, th) {
    const R = nt(['#ffe2e6', '#ffa6b4', '#ec8496'], th), RU = nt(IRON, th);
    piece(g, t => { line(t, [[1.6, 8.4], [14.6, 8.4], [16.4, 7.6], [17, 6], [16, 5]], 0.55, RU[1]); for (const x of [4.6, 11.4]) line(t, [[x, 8.2], [x, 5.4]], 0.45, RU[1]); });
    piece(g, t => { box(t, 2, 3.4, 15, 5.8, 1, R[1]); softShade(t, 8.5, 4.6, 6.6, 1.4, R, { hl: false }); });
    for (const x of [6.4, 10.8]) lineIn(g, [[x, 3.6], [x, 5.6]], 0.18, R[2]);
    piece(g, t => line(t, [[15, 4.2], [16.6, 2.6], [17.4, 1.4]], 0.3, '#e6c49e'));
    g.outerLine();
  } };



  // =====================================================================================================
  // Big Wave Beach
  // =====================================================================================================
  const SAND = ['#fff6e0', '#f6e0b4', '#e2c690'];
  // a little aqua jet-ski with a pink seat (the Big Wave mower), a splash behind it
  P.jetski = { w: 21, h: 12, draw(g, th) {
    const B = nt(['#e4fbf8', '#9ee2dc', '#78c6c2'], th), S = nt(['#ffe2ea', '#ffa8bc', '#ec86a0'], th), W = nt(['#ffffff', '#f4f6fa', '#d8dce8'], th);
    piece(g, t => { line(t, [[13.4, 6.4], [14.4, 2.8]], 0.42, '#b8b4cc'); line(t, [[12.6, 2.8], [16, 2.4]], 0.45, '#b8b4cc'); });
    piece(g, t => { t.poly([[2, 6], [15.6, 6], [20.6, 5.4], [18.6, 9.8], [15, 10.8], [3.6, 10.8], [1.6, 9.4]], B[1]); t.ell(3.4, 8.2, 2.2, 2.4, B[1]); softShade(t, 10.5, 7.8, 9.4, 3.2, B); });
    lineIn(g, [[3, 8.6], [17.6, 8.2]], 0.42, W[1]);
    piece(g, t => { box(t, 4.2, 3.6, 11, 6.6, 1.4, S[1]); softShade(t, 7.6, 5, 3.4, 1.4, S, { hl: false }); });
    piece(g, t => { t.poly([[15.6, 6], [17.4, 3.6], [19.4, 5.6]], '#d8f6ff'); });
    piece(g, t => { for (const [x, y, r] of [[1.2, 10.2, 1], [2.6, 11.2, 0.9], [0.8, 8.4, 0.7]]) t.ell(x, y, r, r, WHITE); });
    g.outerLine();
  } };
  // three surfboards stuck upright in the sand
  P.surfboards = { w: 18, h: 23, draw(g, th) {
    const S = nt(SAND, th);
    const boards = [[4.6, 11.2, -0.18, ['#fff2e6', '#ffc4a0', '#f2a682'], '#ffffff'], [13.6, 11.6, 0.16, ['#f4eaff', '#cdb4f4', '#ae96e0'], '#fff2a0'], [9, 10.2, 0, ['#e8fbff', '#9adcf4', '#7cc0e2'], '#ffb2c8']];
    for (const [x, y, rot, R, st] of boards) {
      piece(g, t => soft(t, x, y, 2.9, 9.4, nt(R, th), { rot }));
      const m = IN(g); g.ell(x, y, 0.55, 8.4, st, rot, (xx, yy) => m(xx, yy) && PX.inEll(xx, yy, x, y, 2.9, 9.4, rot).in);
    }
    piece(g, t => { t.ell(9, 21.4, 8.4, 1.6, S[1]); t.ell(4, 21, 3, 1.4, S[1]); t.ell(14.4, 21.2, 3.2, 1.4, S[1]); softShade(t, 9, 21.2, 8.6, 1.8, S, { hl: false }); });
    g.outerLine();
  } };
  // a white lifeguard chair on long legs, a pink cross on the back, a life ring on one leg
  P.lifeguard = { w: 18, h: 26, draw(g, th) {
    const W = nt(['#ffffff', '#f6f4fa', '#d8d4e4'], th), R = nt(['#ffe2ea', '#ffa8bc', '#ec86a0'], th);
    piece(g, t => {
      line(t, [[3.2, 25.4], [6, 12.4]], 0.62, W[1]); line(t, [[14.8, 25.4], [12, 12.4]], 0.62, W[1]);
      line(t, [[4.6, 19.4], [13.4, 19.4]], 0.5, W[1]); line(t, [[4.4, 22.6], [13.6, 22.6]], 0.45, W[1]);
      softShade(t, 9, 19, 6, 6, W, { hl: false });
    });
    piece(g, t => { box(t, 5.2, 2.6, 12.8, 11.6, 1.6, W[1]); softShade(t, 9, 7, 3.8, 4.4, W, { hl: false }); });
    piece(g, t => { box(t, 8.2, 4.2, 9.8, 9.6, 0.4, R[1]); box(t, 6.3, 6.1, 11.7, 7.7, 0.4, R[1]); });
    piece(g, t => { box(t, 3.6, 11, 14.4, 13, 0.8, R[1]); softShade(t, 9, 12, 5.4, 1, R, { hl: false }); });
    piece(g, t => { t.ell(13.6, 17.4, 2.6, 2.6, R[1]); t.ell(13.6, 17.4, 1.2, 1.2, null); });
    for (const a of [0.4, 2, 3.6, 5.2]) g.ell(13.6 + Math.cos(a) * 1.9, 17.4 + Math.sin(a) * 1.9, 0.55, 0.55, WHITE, 0, IN(g));
    g.outerLine();
  } };
  P.beachball = { w: 11, h: 11, draw(g, th) {
    const cols = nt(['#ffa8b4', '#ffffff', '#ffe27a', '#ffffff', '#9fd0ff', '#ffffff'], th);
    piece(g, t => { t.ell(5.5, 5.6, 4.6, 4.6, '#fff'); });
    for (let fy = 0; fy < g.fh; fy++) for (let fx = 0; fx < g.fw; fx++) { const c = g.fget(fx, fy); if (c !== '#fff') continue; const x = (fx + 0.5) / g.k, y = (fy + 0.5) / g.k, a = Math.atan2(y - 4.4, x - 6.6); g.fset(fx, fy, cols[Math.floor(((a + Math.PI) / (Math.PI * 2)) * 6 + 0.3) % 6]); }
    softShade(g, 5.5, 5.6, 4.6, 4.6, ['#ffffff', '#ffffff', '#e2dcec'], { only: '#ffffff', hl: false });
    g.ell(6.6, 4.4, 0.9, 0.9, '#ffffff', 0, IN(g));
    g.dots([[3, 3], [3.5, 2.5]], WHITE);
    g.outerLine();
  } };

  // =====================================================================================================
  // Lost City
  // =====================================================================================================
  const RUIN = ['#fff4dc', '#ecd6a8', '#cfb486'];
  const LEAF = ['#e2f6c4', '#a8dc88', '#84c06e'];
  // a smiling golden idol on a stone plinth, gems in its headdress
  P.idol = { w: 14, h: 22, draw(g, th) {
    const GD = nt(GOLD, th, 0.12), S = nt(RUIN, th);
    piece(g, t => { box(t, 1.6, 16, 12.4, 21.6, 1, S[1]); softShade(t, 7, 18.6, 5.4, 2.8, S, { hl: false }); });
    lineIn(g, [[2.2, 18.4], [11.8, 18.4]], 0.2, S[2]);
    piece(g, t => { box(t, 4, 11.6, 10, 16.6, 1.4, GD[1]); line(t, [[4.4, 13], [3, 14.6]], 0.6, GD[1]); line(t, [[9.6, 13], [11, 14.6]], 0.6, GD[1]); softShade(t, 7, 14, 3.4, 2.8, GD, { hl: false }); });
    piece(g, t => { t.poly([[2.4, 6.4], [3.6, 1.4], [5.6, 3.2], [7, 0.6], [8.4, 3.2], [10.4, 1.4], [11.6, 6.4]], GD[1]); softShade(t, 7, 4, 4.6, 3, GD, { hl: false }); });
    piece(g, t => soft(t, 7, 8.2, 4.6, 4, GD));
    for (const [x, y, c] of [[7, 2.6, '#ffa8c4'], [4.2, 3.6, '#9fe0f8'], [9.8, 3.6, '#9fe0f8']]) { g.ell(x, y, 0.75, 0.75, c, 0, IN(g)); g.dot(x - 0.3, y - 0.3, WHITE); }
    cface(g, 7.2, 8.4, 4.2, { mood: 'closed', sp: 3.6, w: 1.6, h: 1.8, blushCol: '#ffb08a', mw: 1.3 });
    g.outerLine();
    twinkleF(g, 1, 9, '#ffe680', true); twinkleF(g, 13, 5, '#ffe680');
  } };
  // a broken stone column wrapped in a vine, a gold band round it
  P.ruinpillar = { w: 12, h: 24, draw(g, th) {
    const S = nt(RUIN, th), L = nt(LEAF, th);
    piece(g, t => { box(t, 0.8, 20.6, 11.2, 23.6, 1, S[1]); softShade(t, 6, 22, 5.4, 1.6, S, { hl: false }); });
    piece(g, t => { t.poly([[2.4, 21], [2.4, 7.4], [4, 5.6], [5.4, 7.2], [7.2, 4.4], [8.4, 6.4], [9.6, 6], [9.6, 21]], S[1]); softShade(t, 6, 13, 3.6, 8.6, S); });
    for (const x of [4.2, 6, 7.8]) lineIn(g, [[x, 8.4], [x, 20.4]], 0.2, S[2]);
    lineIn(g, [[2, 12.4], [10, 12.4]], 0.7, nt(GOLD, th)[1]);
    piece(g, t => { const pts = []; for (let y = 6.6; y <= 21; y += 0.5) pts.push([6 + Math.sin(y * 0.8) * 3.6, y]); line(t, pts, 0.32, L[2]); });
    for (let y = 8; y <= 20; y += 2.4) { const x = 6 + Math.sin(y * 0.8) * 3.6; piece(g, t => t.ell(x + 0.9, y - 0.4, 1.1, 0.7, L[1], -0.5)); }
    g.outerLine();
  } };
  // two fallen carved blocks: one with a gold sun face
  P.ruinblock = { w: 19, h: 13, draw(g, th) {
    const S = nt(RUIN, th), L = nt(LEAF, th), GD = nt(GOLD, th, 0.12);
    piece(g, t => { box(t, 10.4, 5, 18.4, 12.6, 1.2, S[1]); softShade(t, 14.4, 8.8, 4, 3.8, S, { hl: false }); });
    lineIn(g, [[11, 8.6], [17.8, 8.6]], 0.2, S[2]);
    piece(g, t => { box(t, 0.8, 3, 11.4, 12.6, 1.4, S[1]); softShade(t, 6, 7.8, 5.2, 4.8, S); });
    piece(g, t => { t.poly(PX.starPts(6.1, 7.8, 3.4, 2.4, 8), GD[1]); });
    g.ell(6.1, 7.8, 1.8, 1.8, GD[0]);
    g.dots([[5.4, 7.6], [6.8, 7.6]], INK); line(g, [[5.4, 8.5], [6.1, 8.9], [6.8, 8.5]], 0.15, INK);
    piece(g, t => { t.ell(13.4, 4.6, 2.2, 1, L[1], 0.3); t.ell(16.2, 4.4, 1.8, 0.9, L[1], -0.3); t.ell(1.8, 12, 1.8, 0.9, L[1], -0.4); });
    g.outerLine();
  } };
  // a lush jungle tree with hanging vines (a fruit tree)
  P.jungletree = { w: 30, h: 38, draw(g, th) {
    const L = nt(['#e4f8c4', '#9cd67e', '#7cba66'], th), L2 = nt(['#d4f2c0', '#86c874', '#68ac60'], th), TR = nt(['#f6e0cc', '#d4aa88', '#b48c6e'], th);
    piece(g, t => { line(t, [[15, 37], [14.6, 30], [15.6, 22]], 2.6, TR[1]); t.ell(15, 36.6, 4.6, 1.4, TR[1]); line(t, [[14.8, 27], [11, 23]], 1, TR[1]); softShade(t, 15, 30, 3, 7, TR, { hl: false }); });
    piece(g, t => { for (const [x, y, r] of [[6.4, 17.6, 5.6], [23.6, 17, 5.6], [15, 19.4, 6.4]]) t.ell(x, y, r, r * 0.8, L2[1]); softShade(t, 15, 18, 13, 5, L2, { hl: false }); });
    piece(g, t => { for (const [x, y, rx, ry] of [[15, 11, 10.6, 8], [7.4, 12.6, 6, 5], [22.6, 12.4, 6, 5], [11, 5.4, 5.6, 4.4], [19, 5.6, 5.4, 4.2]]) t.ell(x, y, rx, ry, L[1]); softShade(t, 15, 11, 13.6, 9, L); });
    // vines hanging below the crown, a leaf at each end
    for (const [x0, y0, len] of [[3.4, 19, 6], [26.6, 18.6, 7]]) piece(g, t => {
      const pts = []; for (let y = y0; y <= y0 + len; y += 0.5) pts.push([x0 + Math.sin(y * 0.9) * 0.5, y]);
      line(t, pts, 0.32, L[1]); for (let y = y0 + 2; y <= y0 + len; y += 2.4) t.ell(x0 + (y % 4.8 < 2.4 ? 1 : -1), y, 1, 0.65, L[1], y % 4.8 < 2.4 ? 0.5 : -0.5);
    });
    for (const [x, y] of [[8.6, 8.4], [20.8, 9.6], [14, 3.4]]) blossom(g, x, y, 1.5, nt(['#fff0f4', '#ffb2c8', '#f08eaa'], th));
    g.outerLine();
  } };


  // =====================================================================================================
  // Jurassic Marsh
  // =====================================================================================================
  const BONE = ['#fffcf2', '#f4ead4', '#dccaa8'];
  const ROCK = ['#f2eef6', '#d4ccdc', '#b0a6bc'];
  const FERN = ['#e2f6c4', '#a2d884', '#7ebc6a'];
  // a stone-wheel log cart (the Jurassic mower): a log body, two big round stone wheels, a bone handle
  P.stonewheel = { w: 21, h: 14, draw(g, th) {
    const LG = nt(['#fbe2c8', '#dcae86', '#bc8e6a'], th), R = nt(ROCK, th), B = nt(BONE, th);
    piece(g, t => { line(t, [[4, 6.4], [1.4, 2.4]], 0.6, B[1]); t.ell(1.1, 2, 0.9, 0.9, B[1]); t.ell(2, 1.6, 0.9, 0.9, B[1]); });
    piece(g, t => { box(t, 3, 4.6, 18.6, 8.8, 2.1, LG[1]); softShade(t, 10.8, 6.6, 7.8, 2.2, LG, { hl: false }); });
    piece(g, t => { t.ell(18.4, 6.7, 1.6, 2.1, LG[0]); });
    g.ell(18.4, 6.7, 0.8, 1.1, LG[1], 0, IN(g));
    for (const x of [7, 11.4]) lineIn(g, [[x, 5.4], [x + 1.4, 5.4]], 0.18, LG[2]);
    piece(g, t => { t.ell(9.2, 3.8, 2.4, 1.2, nt(FERN, th)[1], -0.2); t.ell(12, 3.6, 2, 1, nt(FERN, th)[1], 0.3); });
    for (const x of [6, 15.4]) { piece(g, t => soft(t, x, 10.4, 3.2, 3.2, R)); g.ell(x, 10.4, 1, 1, R[2]); g.dot(x - 1.6, 9.2, WHITE); }
    g.outerLine();
  } };
  // a giant fern: big arching fronds with little leaflets
  P.bigfern = { w: 30, h: 22, draw(g, th) {
    const L = nt(FERN, th);
    // one frond: a fat tapered leaf arching out from the base, its edge softly scalloped, one midrib down the middle
    const frond = (a, len, R) => {
      const bx = 15, by = 21.4, pts = [];
      for (let i = 0; i <= 8; i++) { const u = i / 8, r = len * u, bend = a + (a < -Math.PI / 2 ? -1 : 1) * u * u * 0.45; pts.push([bx + Math.cos(bend) * r, by + Math.sin(bend) * r]); }
      piece(g, t => {
        PX.stroke(t, pts, 1.2, 0.7, R[1]);
        for (let i = 2; i < 8; i++) { const [x, y] = pts[i], [x2, y2] = pts[i + 1], ang = Math.atan2(y2 - y, x2 - x), w = 2.6 * Math.sin(Math.PI * (i + 0.5) / 9); for (const sd of [1, -1]) t.ell(x + Math.cos(ang + sd * 1.57) * w * 0.55, y + Math.sin(ang + sd * 1.57) * w * 0.55, w * 0.62, w * 0.62, R[1]); }
        softShade(t, bx + Math.cos(a) * len * 0.5, by + Math.sin(a) * len * 0.5 - 1, len * 0.55, len * 0.4, R, { hl: false });
      });
      lineIn(g, pts.slice(1, 7), 0.2, R[2]);
    };
    for (const [a, len] of [[-2.75, 13.4], [-0.39, 13.4]]) frond(a, len, nt(['#d8f0bc', '#8ccc76', '#6eb062'], th));
    for (const [a, len] of [[-2.15, 16], [-0.99, 16], [-1.57, 17.6]]) frond(a, len, L);
    g.outerLine();
  } };
  // two crossed cartoon dino bones in the grass, a little flower beside them
  P.dinobone = { w: 21, h: 12, draw(g, th) {
    const B = nt(BONE, th), L = nt(FERN, th);
    const bone = (x0, y0, x1, y1) => piece(g, t => { line(t, [[x0, y0], [x1, y1]], 1.05, B[1]); const a = Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2; for (const [x, y] of [[x0, y0], [x1, y1]]) for (const s of [-1, 1]) t.ell(x + Math.cos(a) * s * 1.1, y + Math.sin(a) * s * 1.1, 1.5, 1.5, B[1]); softShade(t, (x0 + x1) / 2, (y0 + y1) / 2, Math.abs(x1 - x0) / 2 + 2, Math.abs(y1 - y0) / 2 + 2, B, { hl: false }); });
    piece(g, t => { t.ell(10.5, 10.8, 9.4, 1.2, L[1]); });
    bone(3.4, 9, 16.6, 3.4); bone(3, 4, 17.4, 9.4);
    piece(g, t => { line(t, [[18.6, 10.6], [18.6, 7.6]], 0.3, L[2]); });
    blossom(g, 18.6, 6.8, 1.4, nt(['#fff6e0', '#ffc896', '#f2a476'], th));
    g.outerLine();
  } };
  // a twig nest with three pastel spotted dino eggs
  P.dinoegg = { w: 18, h: 13, draw(g, th) {
    const N = nt(['#f2dcc0', '#d2ae8a', '#b08c6c'], th);
    const eggs = [[5.4, 6.4, ['#f0fff2', '#bcecc4', '#98d4a8']], [12.6, 6.4, ['#f6f0ff', '#d4c4f4', '#b4a4e0']], [9, 5, ['#fff4ec', '#ffd2b8', '#f2b294']]];
    for (const [x, y, R] of eggs) { piece(g, t => soft(t, x, y, 3, 4, nt(R, th))); for (const [dx, dy] of [[-0.8, -1.4], [1, -0.2], [-0.4, 1.4]]) g.ell(x + dx, y + dy, 0.6, 0.55, nt(R, th)[2], 0, IN(g)); }
    piece(g, t => { t.ell(9, 10.9, 8.4, 1.9, N[1]); softShade(t, 9, 10.9, 8.4, 1.9, N, { hl: false }); });
    for (const [x0, x1, y] of [[2, 7, 9.6], [6, 12, 10.8], [10.4, 16, 9.4], [3.4, 9, 11.6], [9.6, 15, 11.8]]) lineIn(g, [[x0, y], [x1, y - 0.6]], 0.2, N[2]);
    g.outerLine();
  } };
  // a prehistoric tree fern: a scaly trunk and big arching fern fronds (a fruit tree)
  P.treefern = { w: 30, h: 40, draw(g, th) {
    const TR = nt(['#f2e2c8', '#cfae88', '#b08e6c'], th), L = nt(FERN, th), L2 = nt(['#d8f0bc', '#8ccc76', '#6eb062'], th);
    for (let i = 8; i >= 0; i--) { const k = i / 9; piece(g, t => t.ell(15 - 1.6 * k * k, 37.2 - k * 24, 2.7 - k * 0.6, 1.9, flat(TR))); }
    const cx = 13.8, cy = 11.4;
    // each frond: a tapered leaf with a scalloped edge and one soft midrib
    const frond = (pts, R) => {
      piece(g, t => { PX.stroke(t, pts, 2.3, 0.8, R[1]); for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], ang = Math.atan2(y1 - y0, x1 - x0); for (let u = 0.25; u < 1; u += 0.5) { const w = 2.2 - (i - 1 + u) * 0.45; for (const s of [1, -1]) t.ell(x0 + (x1 - x0) * u + Math.cos(ang + s * 1.57) * w, y0 + (y1 - y0) * u + Math.sin(ang + s * 1.57) * w, Math.max(0.5, w * 0.5), Math.max(0.5, w * 0.5), R[1]); } } });
      lineIn(g, pts, 0.2, R[2]);
    };
    for (const f of [[[cx, cy], [8, 10.4], [3.8, 13.4], [1.8, 18]], [[cx, cy], [19.6, 10.4], [24.6, 13], [27.2, 17.6]]]) frond(f, L2);
    for (const f of [[[cx, cy], [9, 6.4], [4.4, 5.6], [2, 8]], [[cx, cy], [18.6, 6.4], [23.4, 5.4], [26.4, 7.6]], [[cx, cy], [13.4, 5.6], [12.6, 1.6]]]) frond(f, L);
    piece(g, t => t.ell(cx, cy + 0.6, 2.6, 1.8, flat(TR)));
    g.outerLine();
  } };
  // a big glowing amber gem on a little rock: rounded facets, a bright shine
  P.amber = { w: 11, h: 13, draw(g, th) {
    const A = nt(['#fff4c8', '#ffc870', '#f0a24c'], th), R = nt(ROCK, th);
    piece(g, t => { t.ell(5.5, 11.4, 4.8, 1.6, R[1]); softShade(t, 5.5, 11.4, 4.8, 1.6, R, { hl: false }); });
    piece(g, t => { t.poly([[2.4, 10.6], [1.4, 6.4], [3, 2.4], [5.5, 1.2], [8, 2.4], [9.6, 6.4], [8.6, 10.6]], A[1]); softShade(t, 5.5, 6.2, 4, 4.8, A, { hl: false }); });
    const m = IN(g);
    g.poly([[3.4, 4.2], [5.5, 2.6], [7.6, 4.2], [7, 7.6], [4, 7.6]], A[0]);
    lineIn(g, [[1.6, 6.4], [3.4, 4.2]], 0.16, A[2]); lineIn(g, [[9.4, 6.4], [7.6, 4.2]], 0.16, A[2]); lineIn(g, [[4, 7.6], [3, 10.4]], 0.16, A[2]); lineIn(g, [[7, 7.6], [8, 10.4]], 0.16, A[2]);
    g.ell(4.4, 4.4, 0.8, 0.5, WHITE, -0.6, m); g.dot(6.6, 6.4, WHITE);
    g.outerLine();
    twinkleF(g, 10, 2, '#ffe680', true); twinkleF(g, 0.8, 4, '#ffe680');
  } };

  // =====================================================================================================
  // Far Future
  // =====================================================================================================
  const METAL = ['#fbfcff', '#dde4f0', '#b8c2d6'];
  const TEAL = ['#e6fbf8', '#a6e6de', '#80cac4'];
  const GLOWC = 'rgba(150,240,255,0.55)';
  // a hover saucer mower: a glass dome, a silver disc with little lights, a soft glow underneath
  P.hovermower = { w: 21, h: 13, draw(g, th) {
    const M = nt(METAL, th), T = nt(TEAL, th);
    piece(g, t => { line(t, [[10.5, 3], [10.5, 0.8]], 0.25, M[2]); });
    g.ell(10.5, 0.8, 0.7, 0.7, '#ffa8c4');
    piece(g, t => { t.ell(10.5, 5.6, 4.6, 3.6, '#d8f8ff', 0, (x, y) => y <= 5.8); });
    g.ell(9, 4, 1, 0.7, WHITE, -0.4, IN(g));
    piece(g, t => { t.ell(10.5, 7, 9.6, 2.6, M[1]); softShade(t, 10.5, 7, 9.6, 2.6, M, { hl: false }); });
    lineIn(g, [[1.6, 7.6], [19.4, 7.6]], 0.4, T[1]);
    for (const [x, c] of [[4, '#ffe27a'], [8, '#ffa8c4'], [13, '#ffe27a'], [17, '#ffa8c4']]) g.ell(x, 7.6, 0.55, 0.55, c, 0, IN(g));
    piece(g, t => { t.ell(10.5, 9.6, 4.6, 1.2, T[1]); });
    g.outerLine();
    for (let i = 0; i < 3; i++) g.ell(10.5, 11.2 + i * 0.6, 4.4 - i * 1.2, 0.5, GLOWC);
  } };
  // a friendly toy robot statue: a screen face with happy eyes, an antenna, a heart light on its tummy, wheels
  P.robot = { w: 14, h: 21, draw(g, th) {
    const M = nt(METAL, th), T = nt(TEAL, th);
    piece(g, t => { line(t, [[7, 4.4], [7, 1.6]], 0.3, M[2]); t.ell(7, 1.3, 1.1, 1.1, '#ffa8c4'); });
    piece(g, t => { line(t, [[3, 13], [1.2, 11]], 0.7, M[1]); line(t, [[11, 13], [12.8, 11]], 0.7, M[1]); t.ell(1, 10.6, 1, 1, M[1]); t.ell(13, 10.6, 1, 1, M[1]); });
    piece(g, t => { box(t, 3, 11.4, 11, 17.6, 1.6, M[1]); softShade(t, 7, 14.4, 4, 3.2, M, { hl: false }); });
    piece(g, t => { t.ell(6.3, 14.3, 0.9, 0.85, '#ffa8c4'); t.ell(7.7, 14.3, 0.9, 0.85, '#ffa8c4'); t.poly([[5.5, 14.6], [8.5, 14.6], [7, 16.2]], '#ffa8c4'); });
    piece(g, t => { box(t, 1.6, 4.2, 12.4, 11.8, 2.4, M[1]); softShade(t, 7, 8, 5.4, 3.8, M); });
    piece(g, t => box(t, 3, 5.6, 11, 10.4, 1.6, '#4e6a80'));
    for (const x of [5.2, 8.8]) line(g, [[x - 0.9, 8.4], [x, 7.4], [x + 0.9, 8.4]], 0.3, '#9ff6ee');
    g.ell(4.2, 9.4, 0.6, 0.35, '#ffa8c4'); g.ell(9.8, 9.4, 0.6, 0.35, '#ffa8c4');
    for (const x of [4.6, 9.4]) { piece(g, t => soft(t, x, 18.6, 1.9, 1.9, T, { hl: false })); g.ell(x, 18.6, 0.6, 0.6, T[0]); }
    g.outerLine();
  } };
  // a hologram pole: a slim silver post with an emitter ring, a see-through glowing star spinning above it
  P.holopole = { w: 11, h: 27, draw(g, th) {
    const M = nt(METAL, th), T = nt(TEAL, th);
    piece(g, t => { t.ell(5.5, 25.6, 3.6, 1.2, M[1]); box(t, 4.7, 13, 6.3, 25.6, 0.6, M[1]); softShade(t, 5.5, 20, 1.6, 7, M, { hl: false }); });
    piece(g, t => { t.ell(5.5, 13, 3.4, 1.2, T[1]); });
    g.ell(5.5, 12.8, 2.2, 0.6, '#e6fffc');
    g.outerLine();
    for (let y = 2; y < 12.4; y += 1) g.ell(5.5, y, 0.5 + (y - 2) * 0.28, 0.5, 'rgba(160,240,255,0.22)');
    g.poly(PX.starPts(5.5, 6.4, 3.6, 1.6, 5), 'rgba(170,250,255,0.62)');
    g.poly(PX.starPts(5.5, 6.4, 2, 0.9, 5), 'rgba(235,255,255,0.8)');
    for (const y of [4.4, 6.4, 8.4]) for (let x = 2; x < 9; x += 0.5) if (g.fget(Math.floor(x * 2), Math.floor(y * 2))) g.dot(x, y, 'rgba(120,220,255,0.7)');
  } };
  // a little satellite dish on a stand, a light blinking on its tip
  P.satdish = { w: 17, h: 17, draw(g, th) {
    const M = nt(METAL, th), T = nt(TEAL, th);
    piece(g, t => { t.poly([[5.4, 16.4], [7.4, 9.6], [9.6, 9.6], [11.6, 16.4]], M[2]); box(t, 4, 15.4, 13, 16.8, 0.6, M[1]); });
    piece(g, t => { t.ell(9, 7, 7, 3.2, M[1], -0.6); t.ell(9.6, 6.4, 5.4, 1.8, M[0], -0.6); softShade(t, 9, 7, 7, 3.2, M, { rot: -0.6, hl: false }); });
    piece(g, t => line(t, [[9.4, 6.6], [12.4, 2.8]], 0.3, M[2]));
    g.ell(12.6, 2.5, 1, 1, '#ffa8c4');
    lineIn(g, [[3.4, 9.4], [12.6, 3.6]], 0.3, T[1]);
    g.outerLine();
    twinkleF(g, 15, 1.6, '#ffc8dc');
  } };
  // a slim future lamp: a silver post with a glowing round light
  P.futurelamp = { w: 9, h: 25, draw(g, th) {
    const M = nt(METAL, th), T = nt(TEAL, th);
    piece(g, t => { t.ell(4.5, 23.8, 3.2, 1.1, M[1]); box(t, 3.8, 6, 5.2, 23.6, 0.6, M[1]); softShade(t, 4.5, 15, 1.4, 9, M, { hl: false }); });
    for (const y of [10, 15, 20]) lineIn(g, [[3.6, y], [5.4, y]], 0.35, T[1]);
    piece(g, t => { t.ell(4.5, 4, 3, 3, '#e6fffc'); t.ell(4.5, 4.4, 2.2, 2.2, '#b8f6f0'); });
    g.ell(3.6, 3, 0.8, 0.6, WHITE);
    piece(g, t => box(t, 2.2, 6.4, 6.8, 7.8, 0.6, M[1]));
    g.outerLine();
  } };
  // a round pastel tree with glowing light leaves on a ringed silver trunk, in a metal planter (a fruit tree)
  P.cybertree = { w: 28, h: 37, draw(g, th) {
    const M = nt(METAL, th), L = nt(['#eafcf6', '#a8e4d4', '#84c8bc'], th), L2 = nt(['#f2ecff', '#cbbcf4', '#a998e0'], th);
    piece(g, t => { box(t, 8, 30.6, 20, 36.6, 1.6, M[1]); softShade(t, 14, 33.6, 6, 3, M, { hl: false }); });
    lineIn(g, [[8.6, 32.6], [19.4, 32.6]], 0.35, nt(TEAL, th)[1]);
    piece(g, t => { box(t, 12.6, 18, 15.4, 31, 0.8, M[1]); });
    for (const y of [22, 25.6, 29]) lineIn(g, [[12.4, y], [15.6, y]], 0.3, nt(TEAL, th)[1]);
    piece(g, t => { for (const [x, y, r] of [[6.4, 16, 5], [21.6, 16, 5], [14, 17.6, 5.6]]) t.ell(x, y, r, r * 0.84, L2[1]); softShade(t, 14, 16, 12, 4.6, L2, { hl: false }); });
    piece(g, t => { for (const [x, y, rx, ry] of [[14, 10, 10, 8], [7.2, 11.4, 5.6, 4.6], [20.8, 11.4, 5.6, 4.6], [10.4, 4.6, 5, 4], [17.6, 4.8, 5, 3.8]]) t.ell(x, y, rx, ry, L[1]); softShade(t, 14, 10, 12.6, 8.4, L); });
    for (const [x, y, c] of [[8, 8, '#fff6a8'], [19.6, 9.6, '#ffc8e4'], [13, 3.6, '#fff6a8'], [4.6, 15.4, '#ffc8e4'], [23, 15, '#fff6a8'], [14.6, 14, '#c8f6ff']]) { g.ell(x, y, 0.7, 0.7, c, 0, IN(g)); g.dot(x - 0.2, y - 0.2, WHITE); }
    g.outerLine();
  } };


  // =====================================================================================================
  // Dark Ages
  // =====================================================================================================
  const CSTONE = ['#f6f4fc', '#d8d4e8', '#b4aecc'];
  const FLAME = ['#fffbe0', '#ffd27a', '#ffa868'];
  // a wooden hand cart with a load of hay and apples (the Dark Ages mower)
  P.cart = { w: 21, h: 14, draw(g, th) {
    const W = nt(WOOD, th), H = nt(['#fff8d2', '#f6de8c', '#e0c068'], th);
    piece(g, t => { line(t, [[4, 8], [0.8, 5.6]], 0.5, W[2]); line(t, [[4, 9.6], [0.8, 7.4]], 0.45, W[2]); });
    piece(g, t => { for (const [x, y, r] of [[7, 4.2, 2.6], [11, 3.4, 3], [15, 4.2, 2.6]]) t.ell(x, y, r, r * 0.8, H[1]); softShade(t, 11, 4, 6, 2, H, { hl: false }); });
    for (const [x, y] of [[8.6, 2.6], [13.6, 2.4], [11, 3.6]]) { piece(g, t => soft(t, x, y, 1.3, 1.2, nt(['#ffe2e2', '#ff9e9e', '#ec7c84'], th), { hl: false })); g.dot(x - 0.4, y - 0.4, WHITE); }
    piece(g, t => { box(t, 3.4, 5.2, 18.4, 10, 1, W[1]); softShade(t, 11, 7.6, 7.6, 2.6, W, { hl: false }); });
    lineIn(g, [[3.8, 7.6], [18, 7.6]], 0.18, W[2]);
    for (const x of [5.6, 16.2]) lineIn(g, [[x, 5.6], [x, 9.6]], 0.3, nt(IRON, th)[1]);
    piece(g, t => { t.ell(11, 10.4, 3.2, 3.2, W[1]); t.ell(11, 10.4, 2, 2, null); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; line(t, [[11, 10.4], [11 + Math.cos(a) * 2.6, 10.4 + Math.sin(a) * 2.6]], 0.36, W[1]); } softShade(t, 11, 10.4, 3.2, 3.2, W, { hl: false }); });
    g.ell(11, 10.4, 0.7, 0.7, nt(IRON, th)[1]);
    g.outerLine();
  } };
  // a standing torch: a wooden pole, an iron cup and a big soft flame (glows at night)
  P.torch = { w: 9, h: 24, draw(g, th) {
    const W = nt(WOOD, th), I = nt(IRON, th);
    piece(g, t => { box(t, 3.7, 9, 5.3, 23.6, 0.6, W[2]); t.ell(4.5, 23.4, 2.4, 0.8, W[2]); });
    piece(g, t => { t.poly([[1.6, 7], [7.4, 7], [6.4, 10.4], [2.6, 10.4]], I[1]); softShade(t, 4.5, 8.6, 2.6, 1.6, I, { hl: false }); });
    piece(g, t => { const pts = [[4.5, 0.4]]; for (let i = 0; i <= 10; i++) { const a = -0.3 + i * (Math.PI + 0.6) / 10; pts.push([4.5 + Math.cos(a) * 2.9, 5 + Math.sin(a) * 2.6]); } pts.push([1.8, 3.6]); t.poly(pts, FLAME[1]); softShade(t, 4.5, 4.6, 2.6, 2.6, FLAME, { hl: false }); });
    g.ell(4.6, 5.4, 1.3, 1.5, FLAME[0], 0, IN(g));
    g.outerLine();
    twinkleF(g, 1, 1.4, '#ffd27a'); twinkleF(g, 8, 3, '#ffe2a0');
  } };
  // a castle banner on a pole: a lilac pennant with gold trim and a crown, a swallowtail end
  P.banner = { w: 13, h: 27, draw(g, th) {
    const W = nt(WOOD, th), B = nt(['#f4ecff', '#cbb6f2', '#a894da'], th), GD = nt(GOLD, th, 0.12);
    piece(g, t => { box(t, 1.6, 3, 3, 26.6, 0.6, W[2]); t.ell(2.3, 26.4, 2, 0.7, W[2]); });
    piece(g, t => soft(t, 2.3, 2.2, 1.4, 1.4, GD, { hl: false }));
    piece(g, t => box(t, 2, 4.2, 12, 5.6, 0.6, W[1]));
    piece(g, t => { t.poly([[3.4, 5.4], [11.6, 5.4], [11.6, 19], [7.5, 16.6], [3.4, 19]], B[1]); softShade(t, 7.5, 11, 4.4, 7, B, { hl: false }); });
    lineIn(g, [[3.8, 6.4], [11.2, 6.4]], 0.35, GD[1]); lineIn(g, [[3.8, 17.8], [7.5, 15.6], [11.2, 17.8]], 0.35, GD[1]);
    piece(g, t => { t.poly([[5.2, 12.4], [5.2, 9], [6.4, 10.4], [7.5, 8.4], [8.6, 10.4], [9.8, 9], [9.8, 12.4]], GD[1]); });
    for (const x of [5.4, 7.5, 9.6]) g.dot(x, 8.6 + (x === 7.5 ? -0.4 : 0.4), '#ffa8c4');
    g.outerLine();
  } };
  // a little suit of armour on a stand: a round helmet with a pink plume, a chest plate, a heart shield
  P.armor = { w: 15, h: 23, draw(g, th) {
    const S = nt(['#ffffff', '#dfe3ef', '#b6bdd2'], th), W = nt(WOOD, th), PL = nt(['#ffe2ea', '#ffa8bc', '#ec86a0'], th);
    piece(g, t => { box(t, 3, 20.4, 11, 22.6, 0.8, W[1]); });
    piece(g, t => { box(t, 4.6, 16, 6.4, 20.8, 0.6, S[1]); box(t, 7.6, 16, 9.4, 20.8, 0.6, S[1]); });
    piece(g, t => { line(t, [[6.4, 2.6], [4, 0.8], [2, 1.6]], 0.9, PL[1]); t.ell(2, 2.4, 1.2, 1.4, PL[1]); });
    piece(g, t => { box(t, 3, 10, 11, 16.8, 2, S[1]); t.ell(2.8, 10.8, 1.8, 1.4, S[1]); t.ell(11.2, 10.8, 1.8, 1.4, S[1]); softShade(t, 7, 13, 4.4, 3.6, S, { hl: false }); });
    piece(g, t => soft(t, 7, 6.4, 4, 3.9, S));
    piece(g, t => box(t, 4.4, 5.8, 9.8, 7.2, 0.6, '#5e5a70'));
    g.dots([[5.6, 6.5], [7, 6.5], [8.4, 6.5]], '#8a86a0');
    { const SH = nt(['#e8f0ff', '#a8c4f0', '#86a2d8'], th); piece(g, t => { t.poly([[9.4, 11], [14, 11], [14, 15], [11.7, 17.4], [9.4, 15]], SH[1]); softShade(t, 11.7, 13.6, 2.4, 3, SH, { hl: false }); }); }
    piece(g, t => { t.ell(11.1, 13.2, 0.75, 0.7, PL[1]); t.ell(12.3, 13.2, 0.75, 0.7, PL[1]); t.poly([[10.4, 13.4], [13, 13.4], [11.7, 15]], PL[1]); });
    g.outerLine();
  } };
  // a round stone well with a little wooden roof and a bucket
  P.well = { w: 19, h: 21, draw(g, th) {
    const S = nt(CSTONE, th), W = nt(WOOD, th), R = nt(['#ffe2d8', '#f4a894', '#d88a78'], th);
    for (const x of [3.4, 15.6]) piece(g, t => box(t, x - 0.8, 4.6, x + 0.8, 14, 0.4, W[2]));
    piece(g, t => line(t, [[9.5, 6.6], [9.5, 10]], 0.18, '#c8b49a'));
    piece(g, t => { box(t, 7.8, 9.6, 11.2, 12.4, 0.8, W[1]); });
    piece(g, t => { t.poly([[0.6, 6], [9.5, 0.8], [18.4, 6]], R[1]); softShade(t, 9.5, 4, 7, 3, R, { hl: false }); });
    for (const x of [4, 7.6, 11.4, 15]) lineIn(g, [[9.5, 1.4], [x, 5.6]], 0.18, R[2]);
    piece(g, t => { box(t, 1.6, 12, 17.4, 20.6, 2.4, S[1]); t.ell(9.5, 12.4, 7.9, 1.8, S[1]); softShade(t, 9.5, 16, 7.8, 4.6, S); });
    g.ell(9.5, 12.3, 6, 1.1, '#6e86b8');
    for (const [x, y] of [[4.6, 15.6], [9.5, 15.6], [14.4, 15.6], [7, 18.4], [12, 18.4]]) lineIn(g, [[x - 2.2, y], [x + 2.2, y]], 0.18, S[2]);
    for (const [x, y] of [[7, 15.6], [12, 15.6], [4.6, 18.4], [9.5, 18.4], [14.4, 18.4]]) lineIn(g, [[x, y - 2.6], [x, y - 0.2]], 0.18, S[2]);
    g.outerLine();
  } };

  // =====================================================================================================
  // Neon Mixtape Tour
  // =====================================================================================================
  const NPINK = '#ff9ed8', NCYAN = '#8ff4ff', NPURP = '#c8a4ff', NYEL = '#fff3a0';
  const DARKP = ['#d8ccf2', '#a898d4', '#8676b8'];
  // a pastel boombox on little wheels (the Neon mower)
  P.boombox = { w: 21, h: 13, draw(g, th) {
    const B = ['#f4ecff', '#d4c0f6', '#b49ee2'];
    piece(g, t => { line(t, [[5.6, 3.6], [6.6, 1.2], [14.4, 1.2], [15.4, 3.6]], 0.5, '#b8b4cc'); });
    piece(g, t => { box(t, 1.6, 3, 19.4, 11, 2, B[1]); softShade(t, 10.5, 7, 8.6, 4, B); });
    for (const [x, c] of [[5.4, NPINK], [15.6, NCYAN]]) { piece(g, t => { t.ell(x, 7.2, 2.9, 2.9, c); }); g.ell(x, 7.2, 1.7, 1.7, '#7a6a9e'); g.ell(x, 7.2, 0.7, 0.7, c); g.dot(x - 1.4, 5.8, WHITE); }
    piece(g, t => box(t, 8.6, 5, 12.4, 8.2, 0.6, '#efe8ff'));
    g.ell(9.6, 6.6, 0.6, 0.6, '#9a88c4'); g.ell(11.4, 6.6, 0.6, 0.6, '#9a88c4');
    for (const [x, c] of [[9, NYEL], [10.5, NPINK], [12, NCYAN]]) g.ell(x, 9.6, 0.45, 0.45, c, 0, IN(g));
    for (const x of [5, 16]) { piece(g, t => t.ell(x, 11.6, 1.3, 1.3, '#8a7cb0')); }
    g.outerLine();
    twinkleF(g, 0.8, 1.4, NPINK); twinkleF(g, 20.2, 1.8, NCYAN);
  } };
  // a tall speaker stack with neon-rimmed cones (glows at night)
  P.speaker = { w: 14, h: 23, draw(g, th) {
    const D = DARKP;
    piece(g, t => { box(t, 1.4, 1, 12.6, 22.6, 1.8, D[1]); softShade(t, 7, 11, 5.4, 10.6, D); });
    for (const [y, r, c] of [[6.6, 3.6, NCYAN], [16, 4.4, NPINK]]) { piece(g, t => t.ell(7, y, r, r, c)); g.ell(7, y, r - 1.1, r - 1.1, '#6e5e96'); g.ell(7, y, (r - 1.1) * 0.42, (r - 1.1) * 0.42, c); g.dot(7 - r * 0.5, y - r * 0.5, WHITE); }
    for (const x of [3, 11]) g.ell(x, 2.6, 0.45, 0.45, NYEL, 0, IN(g));
    g.outerLine();
  } };
  // a disco ball hanging from a curved stand, sparkling
  P.discoball = { w: 15, h: 27, draw(g, th) {
    const M = ['#ffffff', '#e4e8f4', '#bcc4da'];
    piece(g, t => { t.ell(3.4, 26, 3, 0.9, '#b8b4cc'); line(t, [[3.4, 26], [3.4, 3.6], [4.6, 1.6], [7.4, 1], [10, 1.6], [10.6, 3]], 0.55, '#b8b4cc'); });
    piece(g, t => line(t, [[10.6, 3], [10.6, 6]], 0.2, '#9a96b0'));
    piece(g, t => soft(t, 10.6, 10.4, 4, 4, M));
    for (let fy = 0; fy < g.fh; fy++) for (let fx = 0; fx < g.fw; fx++) {
      const c = g.fget(fx, fy); if (!c || c === INK) continue; const x = (fx + 0.5) / 2, y = (fy + 0.5) / 2;
      if (Math.hypot(x - 10.6, y - 10.4) > 4) continue;
      const gx = Math.floor((x - 6.6) / 1.4), gy = Math.floor((y - 6.4) / 1.4), h = (gx * 7 + gy * 13) % 9;
      if ((x - 6.6) % 1.4 < 0.5 || (y - 6.4) % 1.4 < 0.5) g.fset(fx, fy, '#a8b0c8'); else if (h === 1) g.fset(fx, fy, NPINK); else if (h === 4) g.fset(fx, fy, NCYAN); else if (h === 7) g.fset(fx, fy, NYEL);
    }
    g.ell(9, 8.6, 1, 0.8, WHITE, -0.5, IN(g));
    g.outerLine();
    for (const [x, y, c] of [[14.2, 6, NPINK], [6.4, 12.6, NCYAN], [14, 15, NYEL], [7.4, 7, '#ffffff']]) twinkleF(g, x, y, c, true);
  } };
  // a palm with glowing neon fronds and a lilac trunk (a fruit tree)
  P.neonpalm = { w: 28, h: 42, draw(g, th) {
    const TR = ['#f4ecff', '#d4c4f2', '#b4a2de'];
    for (let i = 8; i >= 0; i--) { const k = i / 9; piece(g, t => t.ell(13.2 + 2.6 * k * k, 39 - k * 26, 2.4 - k * 0.4, 1.9, flat(TR))); }
    for (let i = 1; i < 9; i += 2) { const k = i / 9; g.ell(13.2 + 2.6 * k * k, 39 - k * 26, 1.6, 0.4, NCYAN, 0, IN(g)); }
    const cx = 15.6, cy = 12;
    const fr = [[[cx, cy], [10.4, 10.4], [5.4, 12.4], [2, 17], NPURP], [[cx, cy], [20.6, 10.4], [25, 12.6], [27, 17], NPURP], [[cx, cy], [11.4, 7], [6.4, 6], [2.4, 8], NPINK], [[cx, cy], [19.6, 6.6], [24, 6], [26.8, 8.6], NCYAN], [[cx, cy], [13.6, 5], [11.6, 1.6], null, NCYAN], [[cx, cy], [17.6, 4.6], [20, 1.6], null, NPINK]];
    for (const f of fr) { const c = f.pop(), pts = f.filter(Boolean); piece(g, t => PX.stroke(t, pts, 2, 0.8, c)); lineIn(g, pts, 0.25, '#ffffff'); }
    piece(g, t => { for (const [x, y] of [[14, 14.4], [16, 15], [17.6, 14.2]]) t.ell(x, y, 1, 1.1, NYEL); });
    g.outerLine();
    for (const [x, y, c] of [[2, 4, NPINK], [26, 3, NCYAN], [1, 22, NCYAN], [26.6, 21, NPINK]]) twinkleF(g, x, y, c, true);
  } };
  // a neon sign on a post: a glowing pink heart and a cyan music note
  P.neonsign = { w: 17, h: 21, draw(g, th) {
    const D = DARKP;
    piece(g, t => { box(t, 7.6, 12, 9.4, 20.6, 0.6, '#b8b4cc'); t.ell(8.5, 20.4, 2.4, 0.7, '#b8b4cc'); });
    piece(g, t => { box(t, 1, 1.4, 16, 13, 2, D[1]); softShade(t, 8.5, 7.2, 7.2, 5.6, D, { hl: false }); });
    const heart = [], n = 26; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, x = 16 * Math.pow(Math.sin(a), 3), y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); heart.push([5.6 + x * 0.17, 7 - y * 0.17]); }
    line(g, heart, 0.42, NPINK); line(g, heart, 0.18, '#ffe4f4');
    line(g, [[12.6, 9.6], [12.6, 4], [14.4, 4.8]], 0.38, NCYAN); g.ell(11.8, 9.8, 1.1, 0.8, NCYAN, -0.3);
    g.outerLine();
  } };

  // =====================================================================================================
  // Houses: new facade kinds for PX.pvzHouse(F). Same 74 x 70 canvas and footprint as the old house (the bottom row is the
  // ground, the door sits at x 37 near the bottom; the left 12 px are cut off by the edge of the yard).
  // F: kind, wall / roof / door / porch ramps [light, mid, shade], trim, glass, plus extras per kind (sign, stripe, flag...).
  // =====================================================================================================
  const HOUSE = {};
  function houseKit(F) {
    const g = new Grid(74, 70), win = [], lit = !!F.lit;
    const pa = c => mixHex(c, '#ffffff', 0.12), R3 = R => (R || ['#ffffff', '#dddddd', '#bbbbbb']).map(pa);
    const K = { g, win, P: draw => piece(g, draw), R3, pa, glass: lit ? '#ffe9a0' : pa(F.glass || '#bfe8fa'), trim: pa(F.trim || '#ffffff') };
    K.shine = (x, y) => { if (!lit) g.dots([[x, y], [x + 0.5, y], [x, y + 0.5], [x + 1, y], [x, y + 1]], WHITE); };
    // a rounded window: trim frame, glass, cross bars, a shine; its centre is a lit window at night
    K.pane = (x, y, w, h, r, bars) => {
      K.P(t => box(t, x, y, x + w, y + h, r, K.trim));
      K.P(t => box(t, x + 1.3, y + 1.3, x + w - 1.3, y + h - 1.3, Math.max(0.5, r - 1), K.glass));
      if (bars !== false) { line(g, [[x + w / 2, y + 1.5], [x + w / 2, y + h - 1.5]], 0.42, K.trim); line(g, [[x + 1.5, y + h / 2], [x + w - 1.5, y + h / 2]], 0.42, K.trim); }
      K.shine(x + 2.2, y + 2.2); win.push([Math.round(x + w / 2), Math.round(y + h / 2)]);
    };
    K.port = (cx, cy, r, ring) => { K.P(t => soft(t, cx, cy, r, r, [mixHex(ring || K.trim, '#ffffff', 0.3), ring || K.trim, mixHex(ring || K.trim, '#000000', 0.12)], { hl: false })); K.P(t => t.ell(cx, cy, r - 1.4, r - 1.4, K.glass)); K.shine(cx - r * 0.4, cy - r * 0.4); win.push([Math.round(cx), Math.round(cy)]); };
    K.done = door => { g.outerLine(); const c = g.canvas(); c.meta = { door, win }; return c; };
    return K;
  }

  // the Wild West saloon: a wooden false front with a SALOON sign, a balcony, a striped porch awning and swinging doors
  HOUSE.saloon = F => {
    const K = houseKit(F), { g, P, R3, win } = K, wall = R3(F.wall), roof = R3(F.roof), door = R3(F.door), porch = R3(F.porch), sign = R3(F.sign || ['#fff8e8', '#f6e6c8', '#dcc6a0']);
    // the boardwalk
    P(t => { box(t, 3, 63.6, 71, 68.4, 1.2, porch[1]); softShade(t, 37, 66, 34, 2.4, porch, { hl: false }); });
    for (let x = 8; x < 70; x += 6) line(g, [[x, 64.4], [x, 67.8]], 0.2, porch[2]);
    // the false front and the wall, one silhouette
    P(t => {
      box(t, 8, 22, 66, 64.4, 1.4, (x, y) => (x > 64.4 ? wall[2] : wall[1]));
      box(t, 12, 9.6, 62, 24, 1.6, wall[1]); box(t, 24, 3.6, 50, 12, 3.6, wall[1]);
      softShade(t, 37, 34, 30, 32, wall, { hl: false });
    });
    for (let y = 26; y < 63; y += 3.6) line(g, [[8.8, y], [65.2, y]], 0.18, mixHex(wall[1], wall[2], 0.6));
    for (const [x, y] of [[12.6, 10.4], [61.4, 10.4], [24.8, 4.6], [49.2, 4.6]]) g.dot(x, y, wall[0]);
    // the sign
    P(t => { box(t, 16, 12, 58, 21.4, 1.4, sign[1]); softShade(t, 37, 16.6, 21, 4.6, sign, { hl: false }); });
    letters(g, 'SALOON', 26, 14.2, roof[2]);
    P(t => { t.poly(PX.starPts(37, 8.2, 3, 1.35, 5), '#ffd866'); });
    g.ell(37, 8.3, 0.6, 0.6, '#fff6c8');
    // upstairs windows and the balcony rail
    K.pane(14, 25.6, 12, 9.4, 1.6); K.pane(48, 25.6, 12, 9.4, 1.6);
    P(t => { box(t, 6, 35.6, 68, 37.6, 0.9, porch[0]); box(t, 6, 40.6, 68, 41.8, 0.5, porch[1]); for (let x = 9; x < 67; x += 3.4) box(t, x - 0.5, 37, x + 0.5, 41, 0.3, porch[0]); });
    // the striped awning over the porch, with a scalloped edge
    P(t => {
      box(t, 3, 41.6, 71, 46.4, 1, roof[1]);
      for (let x = 4.8; x < 71; x += 4.4) t.ell(x, 46.4, 2.2, 1.5, roof[1]);
    });
    for (let x = 3; x < 71; x += 8.8) { const m = (xx, yy) => g.filled(xx, yy) && yy > 41.4 && yy < 48.2; m.fine = true; g.ell(x + 6.6, 45, 2.2, 4, K.trim, 0, m); }
    lineIn(g, [[3.6, 42.6], [70.4, 42.6]], 0.3, mixHex(roof[1], '#ffffff', 0.35));
    // porch posts
    for (const x of [6.4, 24, 50, 67.6]) P(t => { box(t, x - 1.1, 47.4, x + 1.1, 64, 0.6, porch[1]); });
    // windows downstairs, the swinging doors
    K.pane(11, 49, 11, 10.4, 1.6); K.pane(52, 49, 11, 10.4, 1.6);
    P(t => { box(t, 28, 48.4, 46, 64.6, 1.2, door[2]); });
    P(t => { box(t, 29.4, 52, 36.6, 61, 1.2, door[0]); });
    P(t => { box(t, 37.4, 52, 44.6, 61, 1.2, door[0]); });
    for (const x of [31.6, 33.4, 35.2, 39.6, 41.4, 43.2]) line(g, [[x, 53.2], [x, 59.8]], 0.18, door[1]);
    win.push([37, 50]);
    // steps
    P(t => box(t, 27, 64.2, 47, 66.8, 1.2, porch[0])); P(t => box(t, 25, 66.4, 49, 69, 1.2, porch[1]));
    return K.done([37, 68]);
  };

  // the Frostbite igloo: a big snow-brick dome with a round tunnel door, two round ice windows and a little flag
  HOUSE.igloo = F => {
    const K = houseKit(F), { g, P, R3, win } = K, wall = R3(F.wall), door = R3(F.door), porch = R3(F.porch || F.wall);
    P(t => { t.ell(37, 67.2, 35, 2.6, porch[1]); softShade(t, 37, 67, 35, 2.6, porch, { hl: false }); });
    // the flag on top
    P(t => { line(t, [[37, 28], [37, 15.4]], 0.5, '#c8b8a8'); t.poly([[37.4, 15], [45, 17.6], [37.4, 20.4]], F.flag || '#ffb2c8'); });
    g.ell(40.2, 17.7, 0.9, 0.9, WHITE);
    // the dome with its ice-brick courses
    P(t => { t.ell(37, 67, 34, 39, wall[1], 0, (x, y) => y <= 67); softShade(t, 37, 52, 34, 26, wall); });
    const course = [35, 42, 49, 56, 62], bl = mixHex(wall[2], '#8aa4cc', 0.3);
    for (const y of course) lineIn(g, [[3, y], [71, y]], 0.25, bl);
    course.concat([67]).forEach((y, i) => { const y0 = i ? course[i - 1] : 28; for (let x = 6 + (i % 2) * 5; x < 70; x += 10) lineIn(g, [[x, y0 + 0.5], [x, y - 0.5]], 0.25, bl); });
    K.port(19.6, 49, 4, wall[0]); K.port(54.4, 49, 4, wall[0]);
    // the tunnel and its doorway, icicles along the arch
    P(t => { t.ell(37, 67, 14.6, 18, wall[0], 0, (x, y) => y <= 67); softShade(t, 37, 60, 14.6, 10, [WHITE, wall[0], wall[1]], { hl: false }); });
    for (const y of [56, 62]) lineIn(g, [[22.6, y], [51.4, y]], 0.25, bl);
    P(t => { t.ell(37, 67.4, 8, 11.6, door[2], 0, (x, y) => y <= 67.4); t.ell(37, 67.4, 6.4, 9.6, door[1], 0, (x, y) => y <= 67.4); });
    for (const [x, len] of [[31.4, 2], [34, 3], [37, 2.4], [40, 3], [42.6, 2]]) { const y = 56.6 + Math.abs(x - 37) * 0.5; line(g, [[x, y], [x, y + len]], 0.42, '#e8f8ff'); }
    win.push([37, 61]);
    for (const [x, y] of [[10, 54], [63, 44], [27, 36]]) { g.dot(x, y, WHITE); g.dot(x + 0.5, y + 0.5, WHITE); }
    return K.done([37, 68]);
  };

  // the Big Wave beach hut: a straw roof with a fringe, bamboo walls on short stilts, a hatch window and a SURF sign
  HOUSE.beachhut = F => {
    const K = houseKit(F), { g, P, R3, win } = K, wall = R3(F.wall), roof = R3(F.roof), door = R3(F.door), porch = R3(F.porch);
    // stilts and the deck
    for (const x of [10, 30, 44, 64]) P(t => box(t, x - 1.3, 58, x + 1.3, 68.6, 0.6, porch[2]));
    P(t => { box(t, 5, 56.6, 69, 60.4, 1.2, porch[1]); softShade(t, 37, 58.4, 32, 1.8, porch, { hl: false }); });
    for (let x = 10; x < 68; x += 5) line(g, [[x, 57.2], [x, 59.8]], 0.18, porch[2]);
    // bamboo walls
    P(t => { box(t, 9, 30, 65, 57.4, 1.2, (x, y) => (x > 63.4 ? wall[2] : wall[1])); });
    for (let x = 12.4; x < 64; x += 3.4) { lineIn(g, [[x, 31], [x, 57]], 0.2, wall[2]); for (let y = 36; y < 57; y += 7) lineIn(g, [[x - 1.5, y + (x % 2)], [x + 1.5, y + (x % 2)]], 0.2, wall[2]); }
    // the straw roof: a big rounded thatch with a ragged fringe
    P(t => {
      t.poly([[2, 33.4], [72, 33.4], [56, 9], [18, 9]], roof[1]); t.ell(37, 9.6, 19, 5, roof[1]);
      for (let x = 3.6; x < 72; x += 3.6) t.poly([[x - 2, 33], [x + 2, 33], [x + 0.2, 37.4 + (x % 7.2 < 3.6 ? 1 : 0)]], roof[1]);
      softShade(t, 37, 20, 32, 15, roof);
    });
    for (let y = 14; y < 33; y += 4.6) { const hw = 19 + (y - 9) * 0.68; for (let x = 37 - hw + 2; x < 37 + hw - 2; x += 2.6) lineIn(g, [[x, y], [x + 0.8, y + 2.4]], 0.2, roof[2]); }
    P(t => { t.ell(37, 6.6, 3.6, 2.6, roof[0]); });
    // the SURF sign hung under the roof
    P(t => { box(t, 26, 38.6, 48, 46, 1.4, F.sign ? K.pa(F.sign) : '#9fe0f4'); });
    letters(g, 'SURF', 30, 40, WHITE);
    line(g, [[28, 38.6], [28, 36.4]], 0.25, '#b48c6e'); line(g, [[46, 38.6], [46, 36.4]], 0.25, '#b48c6e');
    // a hatch window (shutter propped open) and the door
    P(t => { t.poly([[11.6, 37.6], [24, 37.6], [26, 34], [13.6, 34]], wall[0]); });
    K.pane(12.6, 38.4, 11, 9.6, 1.2, false);
    K.pane(51, 38.4, 11, 9.6, 1.2, false);
    for (const x of [15.6, 54]) line(g, [[x, 39.8], [x + 5, 46.6]], 0.3, '#ffffff');
    P(t => box(t, 30.4, 47.6, 43.6, 57.2, 1.4, door[1]));
    for (let x = 32.4; x < 43; x += 2.2) lineIn(g, [[x, 48.4], [x, 56.6]], 0.22, door[2]);
    P(t => soft(t, 41.6, 52.6, 0.7, 0.7, ['#fff6c4', '#ffdc72', '#eaae46'], { hl: false }));
    win.push([37, 52]);
    // a short ladder down from the deck
    P(t => { line(t, [[32, 60], [31.2, 69]], 0.45, porch[1]); line(t, [[42, 60], [42.8, 69]], 0.45, porch[1]); for (const y of [62.6, 65.4, 68]) line(t, [[31.6, y], [42.4, y]], 0.4, porch[1]); });
    // a surfboard leaning on the wall
    P(t => soft(t, 67, 46, 2.6, 10, ['#fff2e6', '#ffc4a0', '#f2a682'], { rot: 0.12 }));
    lineIn(g, [[66, 37.4], [68.2, 54.6]], 0.3, WHITE);
    return K.done([37, 68]);
  };

  // the Lost City explorer camp: a big canvas tent with its door flaps tied open, a lantern, guy ropes and supply crates
  HOUSE.tent = F => {
    const K = houseKit(F), { g, P, R3, win } = K, wall = R3(F.wall), roof = R3(F.roof || F.wall), door = R3(F.door), porch = R3(F.porch);
    P(t => { t.ell(37, 67.4, 35, 2.4, porch[1]); softShade(t, 37, 67.2, 35, 2.4, porch, { hl: false }); });
    // the pole flag
    P(t => { line(t, [[37, 14], [37, 3]], 0.5, '#b48c6e'); t.poly([[37.4, 2.6], [45, 5], [37.4, 7.6]], F.flag || '#ffb2c8'); });
    // the tent: a big soft triangle (canvas), a darker side panel each side
    P(t => { t.poly([[3, 66.6], [37, 11], [71, 66.6]], wall[1]); t.ell(37, 12.6, 3, 2.4, wall[1]); softShade(t, 37, 46, 30, 24, wall); });
    lineIn(g, [[37, 13], [4.6, 66]], 0.3, wall[2]); lineIn(g, [[37, 13], [69.4, 66]], 0.3, wall[2]);
    for (const [a, b] of [[[20, 39], [20, 66]], [[54, 39], [54, 66]]]) lineIn(g, [a, b], 0.2, mixHex(wall[1], wall[2], 0.5));
    // a stripe of trim across the canvas
    lineIn(g, [[3, 60], [71, 60]], 0.9, roof[1]);
    // mesh windows on the side panels
    K.pane(11, 47, 9, 8, 1.2); K.pane(54, 47, 9, 8, 1.2);
    // the doorway with its flaps tied back
    P(t => { t.poly([[24, 66.6], [37, 24], [50, 66.6]], door[2]); });
    P(t => { t.poly([[37, 24], [24, 66.6], [29.4, 66.6], [31.4, 46]], wall[0]); softShade(t, 30, 50, 4, 14, [wall[0], wall[0], wall[1]], { hl: false }); });
    P(t => { t.poly([[37, 24], [50, 66.6], [44.6, 66.6], [42.6, 46]], wall[0]); softShade(t, 44, 50, 4, 14, [wall[0], wall[0], wall[1]], { hl: false }); });
    for (const x of [31.6, 42.4]) line(g, [[x - 1.4, 46], [x + 1.4, 46]], 0.45, roof[1]);
    // a hanging lantern at the door
    P(t => { line(t, [[37, 25], [37, 29.6]], 0.25, '#8a8098'); box(t, 34.8, 29.6, 39.2, 35, 1.2, '#ffe27a'); box(t, 34.4, 29, 39.6, 30.4, 0.6, '#b8b4cc'); });
    g.ell(36.4, 31.6, 0.6, 1, '#fff8c8');
    win.push([37, 32]);
    // guy ropes and pegs
    for (const [x0, y0, x1] of [[8, 58, 1.6], [66, 58, 72.4]]) { line(g, [[x0, y0], [x1, 66.4]], 0.2, '#c8b49a'); P(t => box(t, x1 - 0.7, 64.6, x1 + 0.7, 67.6, 0.3, '#b48c6e')); }
    // supply crates on the right
    P(t => { box(t, 56, 58.6, 66, 67.6, 1, porch[0]); softShade(t, 61, 63, 5, 4.6, [porch[0], porch[0], porch[1]], { hl: false }); });
    lineIn(g, [[56.6, 59.2], [65.4, 67]], 0.3, porch[2]); lineIn(g, [[65.4, 59.2], [56.6, 67]], 0.3, porch[2]);
    P(t => { box(t, 59, 52.4, 66, 58.8, 1, porch[0]); });
    lineIn(g, [[59.6, 55.6], [65.4, 55.6]], 0.3, porch[2]);
    return K.done([37, 67]);
  };

  // the Jurassic cave: a lumpy stone mound with a mossy top, a round dark doorway with a friendly bone over it, glowing holes
  HOUSE.cave = F => {
    const K = houseKit(F), { g, P, R3, win } = K, wall = R3(F.wall), roof = R3(F.roof), door = R3(F.door), porch = R3(F.porch || F.wall);
    P(t => { t.ell(37, 67.2, 35, 2.6, porch[1]); });
    P(t => {
      t.ell(37, 67, 34, 34, wall[1], 0, (x, y) => y <= 67);
      for (const [x, y, rx, ry] of [[21, 42, 15, 17], [53, 40, 16, 19], [37, 34, 17, 15], [48.6, 22, 5, 5]]) t.ell(x, y, rx, ry, wall[1]);
      softShade(t, 37, 46, 34, 26, wall);
    });
    // moss over the top
    const top = x => { let y = 99; for (let fy = 0; fy < g.fh; fy++) if (g.fget(Math.floor(x * 2), fy) && g.fget(Math.floor(x * 2), fy) !== INK) { y = fy / 2; break; } return y; };
    const tops = []; for (let x = 4; x <= 70; x += 0.5) tops.push([x, top(x)]);
    { const m = (x, y) => { const tt = tops[Math.max(0, Math.min(tops.length - 1, Math.round((x - 4) * 2)))]; return g.filled(x, y) && y < tt[1] + 4.6 + Math.sin(x * 0.9) * 1.4; }; m.fine = true; g.ell(37, 34, 40, 40, roof[1], 0, m); }
    { const m = (x, y) => { const tt = tops[Math.max(0, Math.min(tops.length - 1, Math.round((x - 4) * 2)))]; return g.filled(x, y) && y < tt[1] + 1.4 && x < 40; }; m.fine = true; g.ell(37, 34, 40, 40, roof[0], 0, m); }
    // stone cracks
    for (const pts of [[[14, 52], [17, 55], [16, 58]], [[58, 54], [61, 57]], [[44, 28], [47, 31]], [[26, 34], [28, 37], [27, 40]]]) lineIn(g, pts, 0.22, wall[2]);
    // the chimney hole and two round glowing windows
    P(t => t.ell(48.6, 18.6, 2.4, 1.2, door[2]));
    // a puff of smoke from the chimney hole
    P(t => { t.ell(50, 12.6, 2.6, 2.2, '#f8f4fa'); t.ell(52.6, 8.6, 2, 1.7, '#f8f4fa'); t.ell(54.6, 5.4, 1.4, 1.2, '#f8f4fa'); });
    K.port(21, 46, 3.6, wall[0]); K.port(55, 44, 3.8, wall[0]);
    // the doorway with a bone over it
    P(t => { t.ell(37, 67.6, 10, 15, door[2], 0, (x, y) => y <= 67.6); t.ell(37, 67.6, 8.2, 13, door[1], 0, (x, y) => y <= 67.6); });
    win.push([37, 60]);
    P(t => { line(t, [[30, 51], [44, 51]], 1, '#fbf4e2'); for (const x of [30, 44]) for (const s of [-1, 1]) t.ell(x, 51 + s * 1, 1.4, 1.4, '#fbf4e2'); });
    // ferns and pebbles at the foot
    for (const [x, s] of [[16, -1], [58, 1]]) piece(g, t => { for (const a of [-2.4, -1.9, -1.4, -0.9]) { const aa = s > 0 ? a : -Math.PI - a; t.ell(x + Math.cos(aa) * 3, 66 + Math.sin(aa) * 3, 3, 0.9, '#a2d884', aa); } });
    for (const [x, r] of [[24, 1.6], [50, 1.4], [63, 1.8]]) P(t => soft(t, x, 66.6, r * 1.4, r, [wall[0], wall[1], wall[2]], { hl: false }));
    return K.done([37, 67]);
  };

  // the Far Future space lab: a big white dome with a glass band, a round-topped glowing airlock door, an antenna dish
  HOUSE.dome = F => {
    const K = houseKit(F), { g, P, R3, win } = K, wall = R3(F.wall), roof = R3(F.roof), door = R3(F.door), porch = R3(F.porch), glow = F.glow || '#9ff6ee';
    // antenna and dish
    P(t => { box(t, 36.2, 10, 37.8, 26, 0.6, wall[2]); });
    P(t => { t.ell(41, 9, 6, 2.6, wall[1], -0.5); softShade(t, 41, 9, 6, 2.6, wall, { rot: -0.5, hl: false }); });
    P(t => line(t, [[41.6, 8.6], [45, 4.6]], 0.3, wall[2])); g.ell(45.2, 4.2, 1.1, 1.1, '#ffa8c4');
    // a little side module on the right
    P(t => { t.ell(63, 62, 10, 13, wall[1], 0, (x, y) => y <= 62); softShade(t, 63, 56, 10, 8, wall, { hl: false }); });
    K.port(63.6, 55, 2.8, roof[1]);
    // the main dome
    P(t => { t.ell(37, 62, 30, 38, wall[1], 0, (x, y) => y <= 62); softShade(t, 37, 46, 30, 24, wall); });
    // a glass band round the dome and a tinted stripe
    { const m = (x, y) => g.filled(x, y) && y > 34 && y < 40.6; m.fine = true; g.ell(37, 50, 40, 40, K.glass, 0, m); }
    { const m = (x, y) => g.filled(x, y) && y > 46 && y < 48.4; m.fine = true; g.ell(37, 50, 40, 40, roof[1], 0, m); }
    for (let x = 12; x < 64; x += 8) lineIn(g, [[x, 34.6], [x, 40.2]], 0.35, wall[0]);
    for (const x of [16, 32, 48]) g.dots([[x, 35.6], [x + 0.5, 35.6], [x, 36.1], [x + 1, 35.6]], WHITE);
    for (const x of [20, 36, 52]) win.push([x, 37]);
    // the base ring with lights
    P(t => { box(t, 3, 59, 71, 66.8, 2.4, porch[1]); softShade(t, 37, 63, 34, 3.6, porch, { hl: false }); });
    for (let x = 8; x < 68; x += 6) g.ell(x, 62.6, 0.8, 0.8, x % 12 < 6 ? glow : '#ffe27a', 0, IN(g));
    // the airlock: a round-topped door with a glowing frame and a window
    P(t => { box(t, 28, 41, 46, 66, 9, glow); });
    P(t => { box(t, 29.6, 42.6, 44.4, 66, 7.4, door[1]); softShade(t, 37, 54, 7, 11, door, { hl: false }); });
    lineIn(g, [[37, 43], [37, 65.6]], 0.3, door[2]);
    K.port(37, 50, 3, door[0]);
    // steps
    P(t => box(t, 27, 65.6, 47, 69, 1.4, porch[0]));
    return K.done([37, 68]);
  };

  // the Dark Ages castle gate: two round towers with pointy roofs and flags, a crenellated wall, an arched gate with a
  // portcullis, banners either side
  HOUSE.castle = F => {
    const K = houseKit(F), { g, P, R3, win } = K, wall = R3(F.wall), roof = R3(F.roof), door = R3(F.door), porch = R3(F.porch || F.wall), ban = R3(F.banner || ['#f4ecff', '#cbb6f2', '#a894da']), flag = F.flag || '#ffa8c4';
    const bricks = (x0, x1, y0, y1) => { const c = mixHex(wall[1], wall[2], 0.6); for (let y = y0, r = 0; y < y1; y += 4.4, r++) { lineIn(g, [[x0, y], [x1, y]], 0.2, c); for (let x = x0 + (r % 2 ? 3 : 0.6); x < x1; x += 6) lineIn(g, [[x, y - 4.2], [x, y - 0.2]], 0.2, c); } };
    // the wall between the towers with merlons on top
    P(t => { box(t, 14, 26, 60, 66.6, 0.8, (x, y) => (y > 64.6 ? wall[2] : wall[1])); for (let x = 15; x < 59; x += 6.4) box(t, x, 21.4, x + 4.2, 27, 0.8, wall[1]); softShade(t, 37, 44, 24, 24, wall, { hl: false }); });
    bricks(14.4, 59.6, 31, 66);
    // towers
    for (const cx of [11, 63]) {
      P(t => { box(t, cx - 9, 22, cx + 9, 66.6, 2.4, wall[1]); softShade(t, cx, 44, 9, 24, wall); });
      bricks(cx - 8.6, cx + 8.6, 27, 66);
      P(t => { t.poly([[cx - 11, 23.4], [cx, 3.4], [cx + 11, 23.4]], roof[1]); box(t, cx - 11, 21, cx + 11, 25, 1.6, roof[1]); softShade(t, cx, 16, 8, 8, roof, { hl: false }); });
      for (let x = cx - 9; x <= cx + 9; x += 3) lineIn(g, [[x, 24.2], [x, 24.2]], 0.5, roof[2]);
      P(t => { line(t, [[cx, 4], [cx, -0.4]], 0.32, '#b8a890'); t.poly([[cx + 0.4, -0.4], [cx + 6, 1.4], [cx + 0.4, 3.2]], flag); });
      K.pane(cx - 3, 34, 6, 9, 3, false);
    }
    // banners on the wall
    for (const bx of [24, 50]) {
      P(t => { t.poly([[bx - 3.6, 30], [bx + 3.6, 30], [bx + 3.6, 46], [bx, 43], [bx - 3.6, 46]], ban[1]); softShade(t, bx, 37, 3, 7, ban, { hl: false }); });
      lineIn(g, [[bx - 3.2, 31], [bx + 3.2, 31]], 0.4, '#ffd866');
      P(t => { t.ell(bx - 0.7, 36.4, 1, 0.9, flag); t.ell(bx + 0.7, 36.4, 1, 0.9, flag); t.poly([[bx - 1.6, 36.7], [bx + 1.6, 36.7], [bx, 38.8]], flag); });
    }
    // the gate: an arch of stones, a wooden door, a portcullis half raised
    P(t => { box(t, 27, 41, 47, 66.8, 10, wall[0]); });
    P(t => { box(t, 29.4, 43.4, 44.6, 66.8, 7.6, door[1]); softShade(t, 37, 56, 6, 10, door, { hl: false }); });
    for (const x of [33, 37, 41]) lineIn(g, [[x, 44], [x, 66.4]], 0.2, door[2]);
    { const m = (x, y) => g.filled(x, y) && y < 52 && x > 29.6 && x < 44.4 && PX.inEll(x, y, 37, 51, 7.4, 8).in; m.fine = true; for (let x = 31; x < 44; x += 2.4) g.ell(x, 47, 0.35, 6, '#6e6a80', 0, m); for (let y = 45; y < 52; y += 2.4) g.ell(37, y, 7.4, 0.35, '#6e6a80', 0, m); }
    P(t => soft(t, 40.6, 58, 0.8, 0.8, ['#fff6c4', '#ffdc72', '#eaae46'], { hl: false }));
    win.push([37, 56]);
    // the moat bridge
    P(t => { box(t, 26, 65.6, 48, 69.4, 1, porch[1]); softShade(t, 37, 67.4, 11, 1.8, porch, { hl: false }); });
    for (let x = 29; x < 47; x += 3) line(g, [[x, 66], [x, 69]], 0.18, porch[2]);
    return K.done([37, 68]);
  };

  // the Neon tour bus: a long pastel bus with a neon stripe, round windows, a TOUR sign and lights on the roof
  HOUSE.tourbus = F => {
    const K = houseKit(F), { g, P, R3, win } = K, wall = R3(F.wall), roof = R3(F.roof), door = R3(F.door), porch = R3(F.porch || F.wall), n1 = F.neon || NPINK, n2 = F.neon2 || NCYAN;
    // the roof sign and its bulbs
    P(t => { line(t, [[24, 30], [24, 24]], 0.5, '#b8b4cc'); line(t, [[50, 30], [50, 24]], 0.5, '#b8b4cc'); box(t, 18, 12, 56, 25, 2.2, roof[1]); softShade(t, 37, 18, 18, 6, roof, { hl: false }); });
    letters(g, 'TOUR', 30, 16, WHITE);
    for (let x = 20; x <= 54; x += 3.4) g.ell(x, 13.6, 0.6, 0.6, x % 6.8 < 3.4 ? NYEL : n1, 0, IN(g));
    for (let x = 20; x <= 54; x += 3.4) g.ell(x, 23.4, 0.6, 0.6, x % 6.8 < 3.4 ? n2 : NYEL, 0, IN(g));
    // the body
    P(t => { box(t, 3, 29, 71, 62.6, 6, (x, y) => (y > 60.4 ? wall[2] : wall[1])); softShade(t, 37, 44, 34, 18, wall); });
    // windscreen at the front (right)
    P(t => { box(t, 62, 33, 70.4, 47, 3.6, K.glass); });
    K.shine(64, 35); win.push([66, 40]);
    // the neon stripe along the side
    lineIn(g, [[3.4, 50], [70.6, 50]], 1.1, n1); lineIn(g, [[3.4, 53.2], [70.6, 53.2]], 0.6, n2);
    // round windows
    for (const x of [12, 22, 52]) K.port(x, 39.6, 4, roof[1]);
    // the door
    P(t => { box(t, 30.6, 33.6, 43.4, 62, 2, door[1]); });
    P(t => { box(t, 32.4, 35.4, 41.6, 47, 1.6, K.glass); });
    K.shine(33.6, 36.6); win.push([37, 41]);
    lineIn(g, [[37, 48], [37, 61.6]], 0.3, door[2]);
    // wheels and bumper
    P(t => box(t, 1.6, 58.4, 72.4, 62.4, 1.8, porch[1]));
    for (const x of [16, 58]) { P(t => soft(t, x, 63.6, 5, 5, ['#9a8cc2', '#7a6aa8', '#5e4e8e'], { hl: false })); g.ell(x, 63.6, 2.2, 2.2, '#e8e2f6'); g.ell(x, 63.6, 0.9, 0.9, n2); }
    // a step at the door, lights at the front
    P(t => box(t, 30, 64.6, 44, 68.4, 1.2, porch[0]));
    P(t => soft(t, 70.6, 55, 1.2, 1.6, ['#fffbe0', '#fff3a0', '#f2d870'], { hl: false }));
    return K.done([37, 67]);
  };

  // =====================================================================================================
  // Registration
  // =====================================================================================================
  PX.PVZ_PROP = PX.PVZ_PROP || {};
  Object.assign(PX.PVZ_PROP, P);
  // the new facade kinds go through their own painters; anything else is the old house
  {
    const base = PX.pvzHouse, cache = {};
    PX.pvzHouse = F => {
      if (!F || !HOUSE[F.kind]) return base ? base(F) : null;
      const key = JSON.stringify(F); if (cache[key]) return cache[key];
      let c = null;
      try { c = HOUSE[F.kind](F); } catch (e) { console.error('PX.pvzHouse', F.kind, e); c = base ? base(Object.assign({}, F, { kind: 'house' })) : null; }
      return (cache[key] = c);
    };
  }
  // where 3 fruit hang on each new fruit tree (share of sprite width / height from the bottom-centre)
  PX.GARDEN_TREE_SLOTS = Object.assign(PX.GARDEN_TREE_SLOTS || {}, {
    saguaro: [[-0.34, -0.53], [0, -0.67], [0.34, -0.6]],
    snowpine: [[-0.27, -0.3], [0, -0.68], [0.25, -0.48]],
    jungletree: [[-0.27, -0.45], [0, -0.74], [0.27, -0.47]],
    treefern: [[-0.12, -0.68], [0.06, -0.63], [0.24, -0.7]],
    cybertree: [[-0.28, -0.6], [0, -0.8], [0.28, -0.62]],
    neonpalm: [[-0.1, -0.68], [0.1, -0.64], [0.3, -0.7]],
  });
  // night glows for the lit props: [x share, height share from the bottom, radius, 'r,g,b'] (like GLOWS in garden.js)
  PX.GARDEN_GLOWS = Object.assign(PX.GARDEN_GLOWS || {}, {
    torch: [0.5, 0.8, 9, '255,200,120'], futurelamp: [0.5, 0.84, 8, '170,250,240'], holopole: [0.5, 0.78, 8, '160,240,255'],
    neonsign: [0.5, 0.66, 10, '255,160,220'], speaker: [0.5, 0.5, 8, '200,160,255'], discoball: [0.7, 0.62, 9, '255,240,210'],
    robot: [0.5, 0.62, 4, '160,250,240'], hovermower: [0.5, 0.15, 6, '150,240,255'], boombox: [0.5, 0.45, 5, '255,170,230'],
    idol: [0.5, 0.62, 6, '255,230,150'], amber: [0.5, 0.5, 4, '255,200,120'],
  });

  // =====================================================================================================
  // The 8 garden maps (same keys as THM in garden.js; garden.js softens every colour with its pastelize pass)
  //   style: scenery recipe ('meadow' | 'moonlit' | 'beach' | 'egypt' | 'candy' | 'pool'), deco: ground details,
  //   fence: 'picket' | 'iron' | 'rail' | 'stone' | null, mountShape: 'peak' | 'spire' | 'pyramid',
  //   props: [kind, x share, y share of the yard], fruitTrees: [kind, x share, y share]
  // =====================================================================================================
  // a little cluster of props round (fx, fy): items are [kind, dx, dy]. Yard layout rules (garden.js): x share 0.04-0.58
  // (further right is the shore); the 4 flower pots of each lane sit at x share below ~0.25 on lane rows near y share 0.22 /
  // 0.40 / 0.575 / 0.745 / 0.93, so props left of 0.27 only stand in the gaps (y share 0.31-0.36, 0.49-0.535, 0.665-0.70, 0.835-0.89)
  const cluster = (fx, fy, items) => items.map(([k, dx, dy]) => [k, Math.round((fx + (dx || 0)) * 1000) / 1000, Math.round((fy + (dy || 0)) * 1000) / 1000]);
  const yard = (...cl) => [].concat(...cl);
  const M = {};
  M.wildwest = {
    style: 'meadow',
    sky: ['#7cc6ee', '#9cd2f0', '#c4e0ee', '#f8dcb8'], skyN: ['#1e1c48', '#2a2456', '#3a2c62', '#583a6e'],
    mount: ['#f6b088', '#e08660', '#bc6a52'], snow: '#fcd4b0', mountAmp: 24, mountShape: 'peak',
    far: ['#f2c68c', '#d8a46c'], farDots: ['#a8b878', '#c6d296', '#8a9c62'], near: ['#f6d29c', '#dcae78'], nearDots: ['#aab878', '#c8d498'],
    lawn: ['#f4c494', '#d49c6c'], grass: ['#f8d0a4', '#f4c494', '#ecb886', '#e2ac7a'], blade: '#c08e5c', bladeHi: '#ffe8c8', shade: '#d8a070', mow: '#ecbc8a',
    dots: ['#ff9eb0', '#ffffff', '#ffd27a', '#c9a2f0'], dotC: '#e07a50', sand: '#f6e0b0', wet: '#d8ba82', sandEdge: '#c49e68',
    water: ['#a0e4f0', '#5cc8dc', '#3a9ec8', '#2c7cb0'], foam: '#ffffff', hl: '#d6f5fd', cloud: ['#ffffff', '#fbefe0', '#e8d2b8'],
    path: null, night: [40, 22, 60, 0.34], dim: 0, tree: 'saguaro', deco: 'egypt', fish: '30,60,100',
    tiles: ['#f6c89a', '#eebc8c', '#e2a878', '#d89e70'], fence: 'rail', mower: 'minecart',
    facade: { kind: 'saloon', wall: ['#ffe6cc', '#f0bb8e', '#d69a72'], roof: ['#ffd8d0', '#f4a094', '#d88076'], trim: '#fff8ec', glass: '#bfe8fa', door: ['#f6d0a8', '#d8a078', '#8a6458'], porch: ['#f2d4b4', '#d2a888', '#b48a6c'], sign: ['#fffaf0', '#fbecd2', '#e2caa4'] },
    props: yard(
      cluster(0.3, 0.255, [['saguaro', 0, 0], ['rock', 0.055, 0.01]]),
      cluster(0.29, 0.785, [['wagonwheel', 0, 0], ['barrelcactus', 0.055, 0.012]]),
      cluster(0.2, 0.06, [['sheriffsign', 0, 0], ['barrel', 0.05, 0.012]]),
      cluster(0.5, 0.05, [['saguaro', 0, 0], ['barrelcactus', 0.06, 0.02]]),
      cluster(0.49, 0.25, [['haybale', 0, 0], ['wagonwheel', 0.055, -0.01]]),
      cluster(0.36, 0.34, [['barrelcactus', 0, 0], ['rock', 0.04, 0.012]]),
      cluster(0.53, 0.45, [['saguaro', 0, 0], ['barrelcactus', -0.05, 0.015]]),
      cluster(0.36, 0.64, [['barrel', 0, 0], ['barrel', 0.03, 0.015]]),
      cluster(0.54, 0.8, [['rock', -0.04, 0.01], ['barrelcactus', 0.01, 0]]),
      cluster(0.42, 0.97, [['haybale', 0, 0], ['wagonwheel', 0.06, -0.008]]),
      cluster(0.1, 0.335, [['rock', 0, 0], ['barrelcactus', 0.05, 0.008]]),
      cluster(0.13, 0.515, [['barrel', 0, 0], ['haybale', 0.06, 0.005]]),
      cluster(0.16, 0.86, [['barrelcactus', 0, 0], ['rock', 0.05, 0.01]])),
    home: ['saloon', 0.42, 0.72],
    fruitTrees: [['saguaro', 0.46, 0.56], ['saguaro', 0.1, 0.69]],
  };
  M.frostbite = {
    style: 'moonlit',
    sky: ['#88ccf4', '#a4daf6', '#c4e8fa', '#e8f6fd'], skyN: ['#18204a', '#22305e', '#2c4072', '#3c5288'],
    mount: ['#f2f8ff', '#cfe0f4', '#a8c0e0'], snow: '#ffffff', mountAmp: 26, mountShape: 'peak',
    far: ['#eef6ff', '#c8daf0'], farDots: ['#7cb8a8', '#eef8ff', '#5e9a8c'], near: ['#f6faff', '#d2e0f2'], nearDots: ['#8cc4b4', '#b0dccc'],
    lawn: ['#eef5fe', '#bccfe8'], grass: ['#f4f8ff', '#eaf2fc', '#dce8f8', '#d2e2f4'], blade: '#d4e2f2', bladeHi: '#ffffff', shade: '#c8d8ec', mow: '#e8f0fa',
    dots: ['#ffffff', '#bfe6ff', '#ffc8dc', '#d8c8ff'], dotC: '#9fd0f0', sand: '#eef4fc', wet: '#c8dcf0', sandEdge: '#a8c0de',
    water: ['#e0f6fd', '#b8e4f6', '#96d0ec', '#80bee2'], foam: '#ffffff', hl: '#ffffff', cloud: ['#ffffff', '#eef4fc', '#d4e0f2'],
    path: null, night: [24, 30, 80, 0.34], dim: 0, tree: 'snowpine', deco: 'snow', fish: '60,100,150', dock: ['#f4fbff', '#c8e4f4', '#a4c8e4'],
    tiles: ['#eef5fe', '#e6f0fc', '#d6e6f8', '#cddff4'], fence: 'picket', mower: 'snowplow',
    facade: { kind: 'igloo', wall: ['#ffffff', '#eef6ff', '#c8dcf2'], door: ['#a8c4e8', '#7c98c8', '#5c78a8'], porch: ['#ffffff', '#f2f8ff', '#d4e2f4'], trim: '#e8f6ff', glass: '#a8e0f8', flag: '#ffb2c8' },
    props: yard(
      cluster(0.3, 0.255, [['snowpine', 0, 0], ['snowbush', 0.06, 0.012]]),
      cluster(0.29, 0.785, [['snowman', 0, 0], ['iceblock', 0.055, 0.01]]),
      cluster(0.21, 0.06, [['snowman', 0, 0], ['snowbush', 0.06, 0.012]]),
      cluster(0.5, 0.05, [['snowpine', 0, 0], ['snowpine', 0.06, 0.025]]),
      cluster(0.48, 0.25, [['iceblock', 0, 0], ['crystal', 0.05, -0.01]]),
      cluster(0.36, 0.34, [['sled', 0, 0], ['snowbush', 0.05, 0.012]]),
      cluster(0.53, 0.46, [['snowpine', 0, 0], ['snowman', -0.06, 0.01]]),
      cluster(0.37, 0.64, [['iceblock', 0, 0], ['crystal', 0.04, 0.012]]),
      cluster(0.54, 0.8, [['snowpine', 0, 0], ['rock', -0.05, 0.008]]),
      cluster(0.42, 0.97, [['snowman', 0, 0], ['sled', 0.06, 0.004]]),
      cluster(0.1, 0.335, [['snowbush', 0, 0], ['iceblock', 0.06, 0.008]]),
      cluster(0.13, 0.515, [['crystal', 0, 0], ['rock', 0.04, 0.008]]),
      cluster(0.16, 0.86, [['snowbush', 0, 0], ['snowman', 0.06, 0.006]])),
    home: ['igloo', 0.42, 0.72],
    fruitTrees: [['snowpine', 0.46, 0.56], ['snowpine', 0.1, 0.69]],
  };
  M.bigwave = {
    style: 'beach', surf: true, openSea: true,
    sky: ['#5ebff2', '#7ecdf5', '#a4dcf8', '#d0f0fc'], skyN: ['#14214a', '#1c2d5e', '#243a70', '#2f4a82'],
    far: ['#a8dc90', '#7cbc72'], farDots: ['#5f9a5e', '#88c07a', '#4f8a54'], near: ['#f8eab4', '#e2cc8a'], nearDots: ['#b8d488', '#e6f2b8'],
    lawn: ['#fbecbc', '#e6cc92'], grass: ['#fff4cc', '#fbecbc', '#f6e2ac', '#f0d89e'], blade: '#e6c886', bladeHi: '#fffbe6', shade: '#e6c886', mow: '#f6e2ac',
    dots: ['#ffb2c8', '#ffffff', '#ffc896', '#bfe6ff'], dotC: '#f08ab0', sand: '#fbe8b0', wet: '#e6cc92', sandEdge: '#dcc088',
    water: ['#9cf0f4', '#48d0e8', '#2aa0dc', '#1e7cc4'], foam: '#ffffff', hl: '#e0fbff', cloud: ['#ffffff', '#e6f2fc', '#c4d8f0'],
    path: null, night: [20, 24, 70, 0.34], dim: 0, tree: 'palm', deco: 'beach', fish: '20,70,130',
    tiles: ['#fff2c8', '#fbeabc', '#f2daa2', '#ecd298'], fence: null, mower: 'jetski',
    facade: { kind: 'beachhut', wall: ['#fff2d4', '#f2d49c', '#d8b47c'], roof: ['#fff6c8', '#f6dc8c', '#dcbc6a'], door: ['#ffe2ea', '#ffb2c4', '#e890a8'], porch: ['#f8dcc0', '#e0b694', '#c49674'], trim: '#ffffff', glass: '#a8e0f8', sign: '#8fd6ee' },
    props: yard(
      cluster(0.3, 0.255, [['surfboards', 0, 0], ['shells', 0.05, 0.012]]),
      cluster(0.29, 0.785, [['rockpool', 0, 0], ['beachball', 0.07, 0.006]]),
      cluster(0.21, 0.06, [['surfboards', 0, 0], ['beachball', 0.05, 0.015]]),
      cluster(0.5, 0.05, [['lifeguard', 0, 0], ['shells', 0.05, 0.02]]),
      cluster(0.48, 0.25, [['umbrella', 0, 0], ['beachball', 0.045, 0.01]]),
      cluster(0.36, 0.34, [['sandcastle', 0, 0], ['shells', 0.05, 0.012]]),
      cluster(0.53, 0.45, [['rockpool', 0, 0], ['rock', 0.04, -0.012]]),
      cluster(0.38, 0.64, [['umbrella', 0, 0], ['surfboards', 0.06, 0.006]]),
      cluster(0.54, 0.8, [['driftwood', 0, 0], ['shells', -0.05, 0.008]]),
      cluster(0.42, 0.97, [['sandcastle', 0, 0], ['beachball', 0.05, 0.006]]),
      cluster(0.1, 0.335, [['shells', 0, 0], ['rock', 0.05, 0.008]]),
      cluster(0.13, 0.515, [['beachball', 0, 0], ['surfboards', 0.06, 0.008]]),
      cluster(0.16, 0.86, [['umbrella', 0, 0], ['shells', 0.05, 0.006]])),
    home: ['beachhut', 0.14, 0.52],
    fruitTrees: [['palm', 0.47, 0.57], ['palm', 0.2, 0.69], ['palm', 0.3, 0.86]],
  };
  M.lostcity = {
    style: 'egypt',
    sky: ['#7ccae4', '#9ad6e4', '#bfe4e0', '#e6f2d6'], skyN: ['#14203e', '#1c2c4c', '#26385a', '#34486a'],
    mount: ['#ffcc44', '#e6a630', '#bc7e2c'], snow: '#ffeca0', mountAmp: 28, mountShape: 'steps',
    far: ['#8ccc84', '#6aac6c'], farDots: ['#3f8a4a', '#6cb860', '#4c9a50'], near: ['#9cd486', '#74b468'], nearDots: ['#5ea050', '#84c06c'],
    lawn: ['#94d070', '#5e9c4c'], grass: ['#a8dc7a', '#94d070', '#88c664', '#7cba5a'], blade: '#4e9a3e', bladeHi: '#c8f09c', shade: '#6aae50', mow: '#88c860',
    dots: ['#ffb2c8', '#fff27a', '#ffffff', '#ffa86a'], dotC: '#e8a020', sand: '#f4e2a8', wet: '#d8c080', sandEdge: '#c0a468',
    water: ['#e8f0b0', '#88d6c0', '#50acb4', '#38889e'], foam: '#ffffff', hl: '#f4ffd8', cloud: ['#ffffff', '#eef6e8', '#d0e2cc'],
    path: null, night: [20, 30, 50, 0.34], dim: 0, tree: 'jungletree', deco: 'egypt', fish: '20,70,80',
    tiles: ['#a4dc74', '#98d26a', '#80be58', '#76b450'], fence: 'stone', mower: 'minecart_gold',
    facade: { kind: 'tent', wall: ['#fbf4e0', '#ecdcb4', '#cfba8c'], roof: ['#ffd8c0', '#f2a888', '#d8886a'], door: ['#8a7a6a', '#6a5a50', '#4e4248'], porch: ['#f6e4c4', '#dcbe96', '#bc9c76'], trim: '#e8d6b0', glass: '#c8e8d8', flag: '#ffa8b4' },
    props: yard(
      cluster(0.3, 0.255, [['ruinpillar', 0, 0], ['bigfern', 0.06, 0.012]]),
      cluster(0.29, 0.785, [['urn', 0, 0], ['ruinblock', 0.06, 0.01]]),
      cluster(0.21, 0.06, [['idol', 0, 0], ['urn', 0.05, 0.012]]),
      cluster(0.5, 0.05, [['ruinpillar', 0, 0], ['bigfern', 0.06, 0.02]]),
      cluster(0.48, 0.25, [['jungletree', 0, 0], ['fern', 0.06, 0.01]]),
      cluster(0.36, 0.34, [['ruinblock', 0, 0], ['urn', 0.055, 0.008]]),
      cluster(0.53, 0.46, [['ruinpillar', 0, 0], ['ruinpillar', 0.035, 0.015]]),
      cluster(0.37, 0.64, [['treasure', 0, 0], ['rock', 0.04, 0.01]]),
      cluster(0.54, 0.8, [['idol', 0, 0], ['fern', -0.05, 0.008]]),
      cluster(0.42, 0.97, [['bigfern', 0, 0], ['ruinblock', 0.07, 0.004]]),
      cluster(0.1, 0.335, [['fern', 0, 0], ['urn', 0.05, 0.008]]),
      cluster(0.13, 0.515, [['ruinblock', 0, 0], ['bigfern', 0.07, 0.008]]),
      cluster(0.16, 0.86, [['ruinpillar', 0, 0], ['fern', 0.05, 0.006]])),
    home: ['tent', 0.5, 0.83],
    fruitTrees: [['jungletree', 0.46, 0.57], ['jungletree', 0.1, 0.69]],
  };
  M.jurassic = {
    style: 'meadow',
    sky: ['#9ed2c6', '#b4dcc4', '#cce4c0', '#e8eccc'], skyN: ['#14223a', '#1c2c44', '#263650', '#34445c'],
    mount: ['#cab0b8', '#a68c9c', '#826878'], snow: '#ffa070', mountAmp: 24, mountShape: 'volcano', steam: true,
    far: ['#7cb878', '#5c9a64'], farDots: ['#4c8a50', '#78b46a', '#3c7444'], near: ['#8cc47c', '#68a466'], nearDots: ['#4e8e4c', '#78b064'],
    lawn: ['#b0dc84', '#7cb85e'], grass: ['#bede96', '#b0dc84', '#a6d47a', '#9cca70'], blade: '#6aac52', bladeHi: '#d4f4ac', shade: '#8cc46c', mow: '#a8d47c',
    dots: ['#fff4c0', '#ffffff', '#ffe0e6', '#fff4c0'], dotC: '#f6c860', decoK: 0.5, sand: '#d8c49a', wet: '#b4a074', sandEdge: '#9c8a64',
    water: ['#bfe8c8', '#8fd0b0', '#6cb89c', '#56a08a'], foam: '#f0fff4', hl: '#dcf6e4', cloud: ['#f4fff0', '#dcecd8', '#bcd4bc'],
    path: null, night: [16, 30, 40, 0.36], dim: 0, tree: 'treefern', deco: 'meadow', fish: '20,50,40', dock: ['#dcc8a8', '#b0946e', '#8c7254'],
    tiles: ['#b0dc84', '#a6d47a', '#c8e6a0', '#bede96'], fence: 'rail', mower: 'stonewheel',
    facade: { kind: 'cave', wall: ['#f2eaf0', '#d6cad8', '#b4a6bc'], roof: ['#e2f6c4', '#a8d88a', '#84bc72'], door: ['#a8909a', '#6e5a6c', '#4e4050'], porch: ['#eae2ea', '#cfc4d2', '#b0a4b8'], trim: '#e8e0ec', glass: '#ffe9a0' },
    props: yard(
      cluster(0.3, 0.255, [['treefern', 0, 0], ['dinoegg', 0.065, 0.01]]),
      cluster(0.29, 0.785, [['bigfern', 0, 0], ['amber', 0.07, 0.008]]),
      cluster(0.21, 0.06, [['dinoegg', 0, 0], ['fern', 0.06, 0.012]]),
      cluster(0.5, 0.05, [['treefern', 0, 0], ['bigfern', 0.07, 0.02]]),
      cluster(0.48, 0.25, [['dinobone', 0, 0], ['rock', 0.06, 0.008]]),
      cluster(0.36, 0.34, [['bigfern', 0, 0], ['mushrooms', 0.06, 0.012]]),
      cluster(0.53, 0.46, [['treefern', 0, 0], ['amber', -0.05, 0.01]]),
      cluster(0.37, 0.64, [['dinoegg', 0, 0], ['bigfern', 0.07, 0.006]]),
      cluster(0.54, 0.8, [['dinobone', -0.03, 0.01], ['rock', 0.04, 0]]),
      cluster(0.42, 0.97, [['bigfern', 0, 0], ['mushrooms', 0.06, 0.004]]),
      cluster(0.1, 0.335, [['rock', 0, 0], ['fern', 0.05, 0.008]]),
      cluster(0.13, 0.515, [['amber', 0, 0], ['bigfern', 0.07, 0.008]]),
      cluster(0.16, 0.86, [['mushrooms', 0, 0], ['dinobone', 0.07, 0.006]])),
    home: ['cave', 0.42, 0.72],
    fruitTrees: [['treefern', 0.46, 0.57], ['treefern', 0.1, 0.69]],
  };
  M.farfuture = {
    style: 'candy', pool: true, fizz: true,
    sky: ['#98b0f0', '#b0bef4', '#cacef6', '#f0d8f2'], skyN: ['#120e38', '#1c1650', '#281e62', '#382a78'],
    mount: ['#dadef6', '#aab2e2', '#8a8ec6'], snow: '#9ff4ec', mountAmp: 26, mountShape: 'spire',
    far: ['#bcc6ea', '#9aa4d2'], farDots: ['#f2f4fc', '#9ff0e8', '#d4c4f8'], near: ['#ccd4ee', '#a8b2d8'], nearDots: ['#7ee8e0', '#ffa8d4'],
    lawn: ['#d8e2f0', '#9caac4'], grass: ['#e8eef8', '#dce4f0', '#d0daea', '#c4cee2'], blade: '#c4d0e4', bladeHi: '#f4f8ff', shade: '#aab6cc', mow: '#d4deec',
    dots: ['#6ee8e0', '#ff9ccc', '#ffe680', '#b49cff'], dotC: '#ffffff', sand: '#e4eaf6', wet: '#bcc8de', sandEdge: '#98a6c2',
    water: ['#c0fcf4', '#72e4e0', '#44c0d2', '#3498c0'], foam: '#ffffff', hl: '#e8fffc', cloud: ['#ffffff', '#eceafa', '#d0cce8'],
    path: null, night: [24, 20, 70, 0.32], dim: 0, tree: 'cybertree', deco: 'moonlit', fish: '40,80,140', dock: ['#f2f6fc', '#c8d2e4', '#a4b0c8'],
    tiles: ['#e2e8f4', '#d8e0ee', '#9edcd6', '#94d4ce'], fence: 'iron', mower: 'hovermower',
    facade: { kind: 'dome', wall: ['#ffffff', '#eef2fa', '#c8d2e4'], roof: ['#e6fbf8', '#a6e6de', '#80cac4'], door: ['#e6f0ff', '#b4c4e4', '#8ea2c8'], porch: ['#f2f4fa', '#d0d8e8', '#aab4ca'], trim: '#dde4f0', glass: '#b8f0f6', glow: '#9ff6ee' },
    props: yard(
      cluster(0.3, 0.255, [['futurelamp', 0, 0], ['robot', 0.045, 0.012]]),
      cluster(0.29, 0.785, [['holopole', 0, 0], ['satdish', 0.05, 0.01]]),
      cluster(0.21, 0.06, [['robot', 0, 0], ['futurelamp', 0.05, 0.01]]),
      cluster(0.5, 0.05, [['satdish', 0, 0], ['holopole', 0.06, 0.02]]),
      cluster(0.48, 0.25, [['cybertree', 0, 0], ['crystal', 0.06, 0.01]]),
      cluster(0.36, 0.34, [['holopole', 0, 0], ['robot', 0.05, 0.012]]),
      cluster(0.53, 0.46, [['futurelamp', 0, 0], ['satdish', -0.05, 0.012]]),
      cluster(0.37, 0.64, [['robot', 0, 0], ['crystal', 0.045, 0.01]]),
      cluster(0.54, 0.8, [['cybertree', 0, 0], ['futurelamp', -0.06, 0.008]]),
      cluster(0.42, 0.97, [['satdish', 0, 0], ['crystal', 0.05, 0.004]]),
      cluster(0.1, 0.335, [['futurelamp', 0, 0], ['crystal', 0.04, 0.008]]),
      cluster(0.13, 0.515, [['holopole', 0, 0], ['robot', 0.05, 0.008]]),
      cluster(0.16, 0.86, [['crystal', 0, 0], ['satdish', 0.05, 0.006]])),
    home: ['dome', 0.42, 0.72],
    fruitTrees: [['cybertree', 0.46, 0.57], ['cybertree', 0.1, 0.69]],
  };
  M.darkages = {
    style: 'moonlit', bigMoon: true,
    sky: ['#3a3270', '#4c4084', '#62508e', '#7c6098'], skyN: ['#100c2c', '#18143c', '#221c4c', '#2c245a'],
    mount: ['#6a6a9c', '#50508a', '#3a3a6a'], snow: '#a8a4d8', mountAmp: 24, mountShape: 'spire',
    far: ['#3c4a6c', '#2c3854'], farDots: ['#2c5a5a', '#3e7070', '#1c3a3a'], near: ['#3a5a66', '#2a4450'], nearDots: ['#28464e', '#36585e'],
    lawn: ['#8e8cb0', '#6a6890'], grass: ['#9c9abc', '#8e8cb0', '#8280a6', '#76749a'], blade: '#5a8a6a', bladeHi: '#9ad8b0', shade: '#76749a', mow: '#8e8cb0',
    dots: ['#c9a2f0', '#9fd8ff', '#fff6c9', '#ffb2c8'], dotC: '#ffffff', sand: '#9c98b8', wet: '#7a76a0', sandEdge: '#646088',
    water: ['#6878b0', '#4c5a94', '#38447a', '#2c3466'], foam: '#c4d0ec', hl: '#9aa8dc', cloud: ['#8a7ab8', '#6e60a0', '#585088'],
    path: null, night: [26, 16, 60, 0.3], dim: 0.16, tree: 'tree', deco: 'moonlit', fish: '10,10,40', dock: ['#9a8a8a', '#6e5e60', '#4e4044'],
    tiles: ['#a6a4c6', '#9e9cc0', '#8a88ae', '#8482a8'], fence: 'stone', mower: 'cart',
    facade: { kind: 'castle', wall: ['#f6f4fc', '#d8d4e8', '#b4aecc'], roof: ['#e8eeff', '#a8b8f0', '#8898d8'], door: ['#f2d8bc', '#cc9e7c', '#a87e62'], porch: ['#f2dcc4', '#d4b090', '#b49072'], trim: '#ecebf6', glass: '#ffe9a0', banner: ['#f4ecff', '#cbb6f2', '#a894da'], flag: '#ffa8c4', lit: true },
    props: yard(
      cluster(0.3, 0.255, [['banner', 0, 0], ['torch', 0.045, 0.006]]),
      cluster(0.29, 0.785, [['lantern', 0, 0], ['bush', 0.05, 0.012]]),
      cluster(0.21, 0.06, [['torch', 0, 0], ['banner', 0.04, 0.008]]),
      cluster(0.5, 0.05, [['well', 0, 0], ['bush', 0.06, 0.02]]),
      cluster(0.48, 0.25, [['armor', 0, 0], ['torch', 0.045, 0.006]]),
      cluster(0.36, 0.34, [['cart', 0, 0], ['rock', 0.055, 0.01]]),
      cluster(0.53, 0.46, [['banner', 0, 0], ['lantern', -0.045, 0.008]]),
      cluster(0.37, 0.64, [['bush', 0, 0], ['torch', 0.05, 0.006]]),
      cluster(0.54, 0.8, [['armor', 0, 0], ['banner', -0.045, 0.006]]),
      cluster(0.42, 0.97, [['well', 0, 0], ['torch', 0.06, 0.004]]),
      cluster(0.1, 0.335, [['bush', 0, 0], ['lantern', 0.05, 0.008]]),
      cluster(0.13, 0.515, [['rock', 0, 0], ['torch', 0.045, 0.008]]),
      cluster(0.16, 0.86, [['cart', 0, 0], ['bush', 0.065, 0.006]])),
    home: ['castle', 0.42, 0.72],
    fruitTrees: [['tree', 0.46, 0.57], ['tree', 0.1, 0.69]],
  };
  M.neon = {
    style: 'candy', bigMoon: true, fizz: true,
    sky: ['#3c2a78', '#5a3290', '#7c3c9c', '#a84aa4'], skyN: ['#140c34', '#20104a', '#2e1658', '#3e1c66'],
    far: ['#5a3c8c', '#442a74'], farDots: ['#ff9ed8', '#8ff4ff', '#fff3a0'], near: ['#4c3480', '#3a2668'], nearDots: ['#ff9ed8', '#8ff4ff'],
    lawn: ['#b496ea', '#8a6cc8'], grass: ['#b89cec', '#b496ea', '#a88ae2', '#9c80dc'], blade: '#a486e0', bladeHi: '#d8c6ff', shade: '#8a70cc', mow: '#ae90e6',
    dots: ['#ff9ed8', '#8ff4ff', '#fff3a0', '#c8a4ff'], dotC: '#ffffff', sand: '#b49ce4', wet: '#8a72c4', sandEdge: '#7058aa',
    water: ['#bffcff', '#6ee4f4', '#44b4e4', '#3488d0'], foam: '#ffffff', hl: '#e0fcff', cloud: ['#b48ce0', '#9a72cc', '#7c5cb4'],
    path: null, night: [30, 10, 60, 0.26], dim: 0.1, tree: 'neonpalm', deco: 'moonlit', decoK: 0.5, fish: '40,20,90', dock: ['#d8c8f4', '#a898d4', '#8676b8'],
    tiles: ['#b496ea', '#ae8fe4', '#9c80dc', '#967ad6'], fence: 'iron', mower: 'boombox',
    facade: { kind: 'tourbus', wall: ['#fff0fa', '#f6c8e8', '#e0a4cc'], roof: ['#ece4ff', '#c4b0f4', '#a490dc'], door: ['#f4ecff', '#d4c4f2', '#b4a2de'], porch: ['#efeaff', '#cfc6ec', '#ada2d2'], trim: '#ffffff', glass: '#bff4ff', neon: '#ff9ed8', neon2: '#8ff4ff', lit: true },
    props: yard(
      cluster(0.3, 0.255, [['speaker', 0, 0], ['glowshroom', 0.045, 0.012]]),
      cluster(0.29, 0.785, [['neonsign', 0, 0], ['boombox', 0.06, 0.01]]),
      cluster(0.21, 0.06, [['neonsign', 0, 0], ['boombox', 0.06, 0.012]]),
      cluster(0.5, 0.05, [['speaker', 0, 0], ['speaker', 0.045, 0.004]]),
      cluster(0.48, 0.25, [['discoball', 0, 0], ['crystal', 0.05, 0.01]]),
      cluster(0.36, 0.34, [['neonpalm', 0, 0], ['glowshroom', 0.05, 0.012]]),
      cluster(0.53, 0.46, [['speaker', 0, 0], ['boombox', -0.06, 0.01]]),
      cluster(0.37, 0.64, [['neonsign', 0, 0], ['crystal', 0.05, 0.01]]),
      cluster(0.54, 0.8, [['discoball', 0, 0], ['glowshroom', -0.05, 0.008]]),
      cluster(0.42, 0.97, [['speaker', 0, 0], ['neonsign', 0.06, 0.004]]),
      cluster(0.1, 0.335, [['glowshroom', 0, 0], ['boombox', 0.06, 0.008]]),
      cluster(0.13, 0.515, [['crystal', 0, 0], ['glowshroom', 0.045, 0.008]]),
      cluster(0.16, 0.86, [['boombox', 0, 0], ['crystal', 0.055, 0.006]])),
    home: ['tourbus', 0.42, 0.72],
    fruitTrees: [['neonpalm', 0.46, 0.57], ['neonpalm', 0.1, 0.69]],
  };
  PX.GARDEN_MAPS = Object.assign(PX.GARDEN_MAPS || {}, M);

  // =====================================================================================================
  // Race scenery for the 8 maps (same keys as TH in race.js). far: 'hills' | 'sea' | 'peaks' | 'gumdrops' | 'reef' | 'cloudsea';
  // far2: 'mountains' | 'aurora' | 'volcanoes' | 'canopy' | 'planets' | 'softserve' | 'reefs' | 'isles'; near: 'trees' | 'pines' |
  // 'clouds' | 'kelp' (else low bumps); fence: 'wood' | 'rope' | 'cane'. props: [kind, weight, glows at night?].
  // =====================================================================================================
  const RM = {};
  const SUNNY = { cloud: ['#ffffff', '#f4f8ff', '#dce6f8'], puff: ['#ffffff', '#e2eafb', '#a8badf'] };
  RM.wildwest = Object.assign({}, SUNNY, { prop: 'day', sky: ['#9ed4f2', '#b6dcf2', '#d4e4ee', '#f8e2c4'], far: 'hills', farC: ['#f6d4a0', '#e2b884'], nearC: ['#e8c08c', '#d4a472'],
    far2: 'mountains', far2C: ['#f6b48e', '#e2967a', '#fdd8bc', '#c87c66'], birds: true, fence: 'rope',
    top: ['#f8dcaa', '#f2d098', '#dcb07a', '#f2d0a0'], soil: ['#ecbc88', '#dca878'], soilDot: '#f8d4a8', tuft: '#c2a868', dots: ['#ff9eb0', '#ffd27a'],
    water: ['#e8fbff', '#9adcf0', '#74c4e6', '#ffffff'], rock: ['#f4c8a0', '#dca47c', '#fcdcc0', '#fff0dc', '#f0b890'],
    crowd: ['el:fire', 'el:rock', 'el:electric', 'el:normal'], props: [['barrelcactus', 3], ['saguaro', 1], ['haybale', 2], ['wagonwheel', 2], ['barrel', 1], ['sheriffsign', 0.5]] });
  RM.frostbite = Object.assign({}, SUNNY, { prop: 'day', snow: true, ice: true, sky: ['#9ccff4', '#b4daf6', '#cee6f8', '#ecf6fd'], far: 'peaks', farC: ['#e4f0fc', '#b8cee8'], nearC: ['#a4d6cc', '#82bcb0', '#bce6dc', '#94ccc0'],
    far2: 'aurora', near: 'pines', nearTop: '#ffffff',
    top: ['#ffffff', '#eef6ff', '#c4d8f0', '#dce8f8'], soil: ['#d4e4f6', '#bcd0ea'], soilDot: '#eaf2fc', tuft: null, dots: ['#bfe6ff', '#ffffff'],
    water: ['#f2fcff', '#b8e4f6', '#94d0ec', '#ffffff'], rock: ['#dcf4fc', '#acd8ee', '#f0fbff', '#ffffff', '#cfeeff'],
    crowd: ['el:ice', 'el:water', 'el:magic', 'el:normal'], props: [['snowpine', 2], ['snowman', 2], ['iceblock', 2], ['snowbush', 2], ['sled', 1], ['crystal', 1, 1]] });
  RM.bigwave = Object.assign({}, SUNNY, { prop: 'day', sky: ['#7ccef5', '#9cdaf7', '#bce6f9', '#e0f5fc'], far: 'sea', farC: ['#7cdcf4', '#c8eab8', '#ffffff', '#5ccaee', '#a8dca8'], nearC: ['#c8f4fa', '#94dcf0'],
    boat: true, birds: true, fence: 'rope',
    top: ['#fff0cc', '#fbe6bc', '#ecd4a0', '#f4ddb0'], soil: ['#f8e0b4', '#eecc9c'], soilDot: '#fff4dc', tuft: null, dots: ['#ffffff', '#ffc4d6'],
    water: ['#e8fdff', '#8ae6f4', '#5ccaee', '#ffffff'], rock: ['#f4d8ac', '#dcb888', '#fbe8c8', '#fff6e0', '#a8dc90'],
    crowd: ['el:water', 'el:electric', 'el:rock', 'el:fire'], props: [['palm', 2], ['surfboards', 2], ['umbrella', 2], ['sandcastle', 2], ['lifeguard', 1], ['beachball', 1], ['shells', 1]] });
  RM.lostcity = Object.assign({}, SUNNY, { prop: 'day', birds: true, parrots: true, vines: true, pyramids: true,
    sky: ['#9cd8e4', '#b4e0e2', '#cce8dc', '#e8f2d4'], far2: 'canopy', far2C: ['#a8dcb0', '#90cc9e', '#78b48a'], far: 'hills', farC: ['#94cc8c', '#74b07a'], nearC: ['#7cbc80', '#5ea06c', '#98d494', '#76b47c'], near: 'trees',
    top: ['#b0e080', '#a2d470', '#84bc60', '#c8a07a'], soil: ['#e2c890', '#d0b47c'], soilDot: '#f4e0b0', tuft: '#84bc60', dots: ['#ffb8c8', '#fff09a'],
    water: ['#f4f8d8', '#9adcc4', '#74c4ac', '#ffffff'], rock: ['#f6e2b0', '#dcc088', '#fcf0cc', '#fff8e4', '#a8dc88'], moss: true,
    cloud: ['#ffffff', '#eef6ea', '#d0e2cc'], crowd: ['el:rock', 'el:magic', 'el:fire', 'el:laser'],
    props: [['jungletree', 1], ['idol', 1, 1], ['ruinpillar', 2], ['ruinblock', 2], ['bigfern', 3], ['urn', 1], ['r:totem', 0.5]] });
  RM.jurassic = Object.assign({}, SUNNY, { prop: 'day', birds: true, steam: true, moss: true,
    sky: ['#a8d8cc', '#bce0cc', '#d0e8c8', '#e8eed4'], far2: 'volcanoes', far2C: ['#b49cb0', '#9a809a', '#ffb07a'], far: 'hills', farC: ['#88c286', '#6aa874'], nearC: ['#74b47a', '#5a9a68', '#8cca88', '#6cae76'], near: 'trees',
    top: ['#a4d47e', '#96c870', '#7cb05e', '#b49a70'], soil: ['#c8aa84', '#b49470'], soilDot: '#dcc4a0', tuft: '#7cb05e', dots: ['#ffb8c8', '#fff09a'],
    water: ['#e4f4dc', '#9cccac', '#7cb498', '#ffffff'], rock: ['#d6ccd8', '#b4a8bc', '#e8e0ea', '#f4f0f6', '#a2d884'],
    cloud: ['#f4fff0', '#e4f2e0', '#c8dcc8'], crowd: ['el:rock', 'el:poison', 'el:fire', 'el:water'],
    props: [['bigfern', 3], ['treefern', 1], ['dinobone', 2], ['dinoegg', 1], ['amber', 1, 1], ['r:fern', 2], ['rock', 1]] });
  RM.farfuture = Object.assign({}, SUNNY, { prop: 'day', sparkleFloor: true, birds: false, fence: null,
    sky: ['#b0c8f4', '#c2d4f6', '#d8def8', '#f2e8fa'], far2: 'planets', far: 'peaks', farC: ['#dce2f4', '#b8c0dc'], nearC: ['#e4eaf6', '#c4cce2'],
    top: ['#eef4fa', '#c8eae8', '#a8b8cc', '#dfe8f2'], soil: ['#d4dcec', '#bcc6dc'], soilDot: '#9ff6ee', tuft: null, dots: ['#9ff6ee', '#ffb2d8'],
    water: ['#e8fffc', '#9cf0ec', '#74dcdc', '#ffffff'], rock: ['#e6ecf6', '#c4cee2', '#f4f8fc', '#ffffff', '#9ff6ee'], ice: true,
    cloud: ['#ffffff', '#f0eefc', '#d8d4ee'], crowd: ['el:robot', 'el:laser', 'el:electric', 'el:magic'],
    props: [['robot', 2], ['holopole', 2, 1], ['satdish', 1], ['futurelamp', 2, 1], ['cybertree', 1]] });
  RM.darkages = { prop: 'night', dark: true, fireflies: true, fence: 'rope',
    sky: ['#3a3478', '#4a4088', '#5c4c96', '#6e5aa2'], far2: 'mountains', far2C: ['#5e5e98', '#4c4c86', '#a8a4d8', '#3e3e74'], far: 'peaks', farC: ['#4c5492', '#3c447e'], nearC: ['#4a7484', '#3a5e70', '#5a8a98', '#46707e'], near: 'pines',
    top: ['#8cbcac', '#7cac9e', '#5e8e86', '#9a96c4'], soil: ['#8a86bc', '#7a76ac'], soilDot: '#a8a4d4', tuft: '#5e8e86', dots: ['#d8c2ff', '#bfe8ff'],
    water: ['#d8d4ff', '#8890d8', '#6c74c4', '#ffffff'], rock: ['#b4b0d4', '#9894bc', '#ccc8e6', '#e2e0f2', '#8fe0c8'],
    cloud: ['#8a88d0', '#a4a2e0', '#7472bc'], puff: null, crowd: ['el:dark', 'el:magic', 'el:robot', 'el:poison'],
    props: [['torch', 2, 1], ['banner', 2], ['armor', 1], ['well', 1], ['tree', 1], ['lantern', 1, 1]] };
  RM.neon = { prop: 'night', dark: true, shooting: true, sparkleFloor: true, fence: null,
    sky: ['#34246e', '#4a2c86', '#663696', '#8a40a0'], far2: 'aurora', far: 'gumdrops', farC: ['#ff9ed8', '#8ff4ff', '#fff3a0', '#c8a4ff'], nearC: ['#6a4cac', '#563c98'],
    top: ['#d2b0f4', '#a488e0', '#7a62c4', '#c4a4ee'], soil: ['#7e66c0', '#6e56b0'], soilDot: '#ff9ed8', tuft: null, dots: ['#ff9ed8', '#8ff4ff', '#fff3a0'], sprinkles: true,
    water: ['#e0fcff', '#8ae8f6', '#5ccaee', '#ffffff'], rock: ['#c4a8f0', '#a488dc', '#dcc8fa', '#f0e6ff', '#ff9ed8'],
    cloud: ['#9a7cd4', '#b49ae4', '#7c60bc'], puff: null, crowd: ['el:electric', 'el:magic', 'el:laser', 'el:normal'],
    props: [['speaker', 2, 1], ['discoball', 1, 1], ['neonsign', 2, 1], ['neonpalm', 1, 1], ['boombox', 1, 1]] };
  PX.RACE_MAPS = Object.assign(PX.RACE_MAPS || {}, RM);

})();
