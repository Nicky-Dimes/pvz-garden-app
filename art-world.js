// art-world.js — PVZ Garden world art. Loaded after pixel.js and art-core.js.
// Style matches pixel.js: DawnBringer-ish colours, 1px ink (#222034) outline, 3-tone [light, mid, dark] shading.
//   PX.ELEMENT_SPRITE[el](g, f)   catchable element creatures, Grid(18, 18), facing right, frame 0 rest / 1 bob / 2 blink or squish
//   PX.ELEMENT_ICON[el](g)        7x7 type icons (the 11 elements + plant)
//   PX.ELEMENT_CORE(g, el)        13x13 glowing element orb with the element's symbol
//   PX.ELEMENT_SHARD(g, el)       9x9 crystal shard in the element colour
//   PX.FUSION_ICON[id](g)         16x16 fusion item icons
//   PX.PVZ_PROP[kind]             { w, h, draw(g, theme) } garden props, anchor bottom-centre; theme 'day' | 'night' | 'desert' | 'sea'
//   PX.PVZ_HOME[kind]             { w, h, door: [dx, dy], win: [[dx, dy], ...], draw(g, theme) } rest houses; door/win offsets
//                                 are from the bottom-centre anchor (floor(w / 2), h), like PX.HOMES
//   PX.worldArt                   cached canvas builders for all of the above (sprite, icon, core, shard, fusion, prop, home)
(function () {
  'use strict';
  if (!window.PX || !PX.Grid) return;
  const { Grid, INK, stroke, line, starPts } = PX;
  const mixHex = (PX.art && PX.art.mixHex) || PX.mixHex || (a => a);
  const EL = PX.EL_PAL || {};
  const WHITE = '#ffffff';
  const elMain = (el, fb) => (EL[el] && EL[el].main) || fb;

  // ---------------- helpers ----------------
  const piece = (G, draw) => { const t = new Grid(G.w, G.h); t.dither = G.dither; draw(t); t.outline(); G.merge(t); return G; };
  const fil = (g, pts, c) => { for (const [x, y] of pts) if (g.filled(x, y)) g.set(x, y, c); return g; };
  const emp = (g, pts, c) => { for (const [x, y] of pts) if (!g.get(x, y)) g.set(x, y, c); return g; };
  const shadeIn = (g, cx, cy, rx, ry, R, rot) => g.ell(cx, cy, rx, ry, R, rot || 0, (x, y) => g.filled(x, y));
  const each = (g, fn) => { for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) fn(x, y, g.get(x, y)); };
  // recolour pixels of colour `from` (default R[1]) next to the outline: lit on the top / left edge, shaded on the bottom / right edge
  function bevel(g, R, from, noTop) {
    from = from || R[1]; const out = [];
    each(g, (x, y, c) => {
      if (c !== from) return;
      if (g.get(x - 1, y) === INK || (!noTop && g.get(x, y - 1) === INK)) out.push([x, y, R[0]]);
      else if (g.get(x + 1, y) === INK || g.get(x, y + 1) === INK) out.push([x, y, R[2]]);
    });
    for (const [x, y, c] of out) g.set(x, y, c);
    return g;
  }
  // a water-drop silhouette: round bottom with straight sides tangent to it, tip `tipH` above the top
  function drop(t, cx, cy, rx, ry, tipH, lean, col) {
    const D = ry + tipH, c = Math.min(0.95, ry / D), s = Math.sqrt(1 - c * c);
    t.ell(cx, cy, rx, ry, col);
    t.poly([[cx + lean, cy - D], [cx + rx * s + 0.05, cy - ry * c], [cx, cy + 0.5], [cx - rx * s - 0.05, cy - ry * c]], col);
  }
  const hsh = (x, y, s) => { let h = Math.imul(x + 31 * (s || 0), 374761393) ^ Math.imul(y + 7, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  // leafy texture (same idea as pixel.js foliage): small lit leaves with a shadow under them
  function foliage(g, R, dens, s) {
    const inR = c => c === R[0] || c === R[1] || c === R[2], out = [];
    for (let y = 1; y < g.h - 1; y++) for (let x = 1; x < g.w - 1; x++) {
      const c = g.get(x, y); if (!inR(c) || hsh(x, y, s) > dens) continue;
      if (!inR(g.get(x, y + 1)) || !inR(g.get(x - 1, y)) || !inR(g.get(x + 1, y)) || !inR(g.get(x, y - 1))) continue;
      const i = R.indexOf(c);
      out.push([x, y, R[Math.max(0, i - 1)]], [x, y + 1, R[Math.min(2, i + 1)]], [x + 1, y + 1, R[Math.min(2, i + 1)]]);
    }
    for (const [x, y, c] of out) if (inR(g.get(x, y))) g.set(x, y, c);
  }
  function bark(g, cols, dark, s) { each(g, (x, y, c) => { if (cols.includes(c) && hsh(x, y >> 2, s) < 0.2 && g.get(x - 1, y) !== INK) g.set(x, y, dark); }); }
  // theme colours
  const LEAF = { day: ['#99e550', '#6abe30', '#37946e'], night: ['#52c7a8', '#2f8078', '#1f5452'], desert: ['#c3d66a', '#8f974a', '#4b692f'], sea: ['#9ce07a', '#4fae5a', '#2f7a4a'] };
  const leafOf = th => LEAF[th] || LEAF.day;
  const dim = (c, th, k) => (th === 'night' ? mixHex(c, '#2c2c66', k == null ? 0.22 : k) : c);
  const dimR = (R, th, k) => R.map(c => dim(c, th, k));
  const glass = th => (th === 'night' ? ['#fffbd0', '#fff27a', '#f6c83a'] : ['#e8f8ff', '#9fd8ff', '#5f98d0']);
  const tufts = (g, pts, th) => emp(g, pts, leafOf(th)[1]);
  // little critter faces (same as pixel.js living plants): 1x2 eyes, a 4-wide smile, cheeks
  const eyes = (g, x1, x2, y, blink, col) => { const c = col || INK; for (const x of [x1, x2]) { if (blink) g.set(x, y + 1, c); else { g.set(x, y, c); g.set(x, y + 1, c); } } };
  const smile = (g, x, y, w, col) => { const c = col || INK; g.set(x, y, c); for (let i = 1; i < w - 1; i++) g.set(x + i, y + 1, c); g.set(x + w - 1, y, c); };
  const cheeks = (g, x1, x2, y, c) => fil(g, [[x1, y], [x2, y]], c || '#f4a3b8');
  const twinkle = (g, x, y, c, core) => { emp(g, [[x, y]], core || WHITE); emp(g, [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]], c); };
  const LEAFG = ['#a6ec70', '#5cb43a', '#2f7a4a'];

  // =====================================================================================================
  // 1) Element creatures (18x18, facing right; f 0 rest, 1 bob / sway, 2 blink / squish)
  // =====================================================================================================
  const SPR = {};
  // Fire: an ember wisp, a flame-shaped blob with a warm glowing core
  SPR.fire = function (g, f) {
    const R = elMain('fire', ['#ffd27a', '#f2742a', '#b8321e']), b = f === 1 ? -1 : 0, s = f === 1 ? 1 : 0, cx = 9, cy = 11 + b, lo = f === 2 ? 1 : 0;
    piece(g, t => {
      t.ell(cx, cy, 5.2, 4.6, R[1]);
      t.poly([[cx - 5, cy + 0.6], [cx - 5.8 - s, cy - 5.2 + s + lo], [cx - 2.8, cy - 2.4], [cx - 2.4 - s, cy - 9 + lo * 1.4], [cx + 1, cy - 3.6], [cx + 3.4 - s, cy - 6.6 + lo], [cx + 5, cy - 1.4], [cx + 5.2, cy + 1]], R[1]);
      shadeIn(t, cx, cy - 2, 6.6, 8, R);
    });
    g.ell(cx + 1, cy + 0.6, 3.8, 3.1, ['#fffbd0', '#ffe27a', '#ffb84a'], 0, (x, y) => g.filled(x, y));
    fil(g, [[cx - 4, cy - 3], [cx - 3, cy - 5 - s], [cx - 2, cy - 7 - s]], '#ffd27a');
    emp(g, f === 1 ? [[3, 1], [15, 3], [16, 8]] : [[2, 3], [15, 2], [1, 8]], '#ffb35a');
    emp(g, f === 1 ? [[1, 5]] : [[16, 5]], '#ffd27a');
    const ey = cy - 1; eyes(g, 9, 12, ey, f === 2); smile(g, 9, ey + 3, 4); cheeks(g, 8, 13, ey + 3, '#ff8a6a');
  };
  // Water: a droplet that squishes when it lands
  SPR.water = function (g, f) {
    const R = elMain('water', ['#c4f6ff', '#4fc4ee', '#2a6fc0']), sq = f === 2, b = f === 1 ? -1 : 0;
    const cx = 9, rx = sq ? 5.8 : 5, ry = sq ? 4.2 : 5, cy = 16.4 - ry + b;
    piece(g, t => { drop(t, cx, cy, rx, ry, sq ? 3.8 : 4.8, f === 1 ? -1.2 : -0.4, R[1]); shadeIn(t, cx, cy - 2, rx + 0.6, ry + 4, R); });
    const c0 = Math.round(cy);
    fil(g, [[cx - 4, c0 - 1], [cx - 4, c0], [cx - 3, c0 - 2], [cx - 2, c0 - 4]], WHITE);
    const ey = c0 - 1; eyes(g, 10, 13, ey, sq); smile(g, 10, ey + 3, 4); cheeks(g, 9, 14, ey + 3);
    emp(g, f === 1 ? [[2, 12], [16, 9]] : sq ? [[1, 15], [17, 15]] : [[2, 13], [16, 11]], '#9ee8ff');
  };
  // Ice: a chilly ice-cube buddy with a frosty shine
  SPR.ice = function (g, f) {
    const R = elMain('ice', ['#f4fcff', '#a8e4fa', '#5aa2d8']), b = f === 1 ? -1 : 0, x0 = 4, x1 = 14, y0 = 5 + b, y1 = 16 + b;
    piece(g, t => t.poly([[x0, y0 + 1.6], [x0 + 1.6, y0], [x1 - 1.6, y0], [x1, y0 + 1.6], [x1, y1 - 1.6], [x1 - 1.6, y1], [x0 + 1.6, y1], [x0, y1 - 1.6]], R[1]));
    bevel(g, R);
    // a second, inner bevel so the cube reads as thick glass
    each(g, (x, y, c) => { if (c !== R[1]) return; if (g.get(x + 1, y) === R[2] || g.get(x, y + 1) === R[2]) g.set(x, y, '#8ed2f0'); });
    fil(g, [[x0 + 1, y0 + 1], [x0 + 2, y0 + 1], [x0 + 1, y0 + 2], [x0 + 3, y0 + 1]], WHITE);
    fil(g, [[x1 - 3, y1 - 3], [x1 - 2, y1 - 4]], '#e8f8ff');
    // snow on top
    fil(g, [[x0 + 4, y0], [x0 + 5, y0], [x0 + 6, y0], [x0 + 7, y0], [x0 + 5, y0 + 1], [x0 + 6, y0 + 1]], WHITE);
    const ey = y0 + 4; eyes(g, 9, 12, ey, f === 2); smile(g, 9, ey + 3, 4); cheeks(g, 8, 13, ey + 3, '#f7b6c8');
    if (f === 1) { twinkle(g, 16, 3, '#a8e4fa'); twinkle(g, 1, 13, '#a8e4fa'); } else { twinkle(g, 2, 3, '#a8e4fa'); emp(g, [[16, 12]], '#c8f0ff'); }
  };
  // Electric: a round yellow spark bug with buzzing wings, antennae and a zigzag lightning tail
  SPR.electric = function (g, f) {
    const R = elMain('electric', ['#fffbb0', '#f8dc2c', '#c08a10']), b = f === 1 ? -1 : 0, up = f === 1, WG = ['#ffffff', '#e8f6ff', '#a8c8e8'];
    piece(g, t => { t.ell(6.4, 4.8 + b, 2.9, 1.5, WG, up ? 1.2 : 0.6); t.ell(8.6, 3.8 + b, 2.5, 1.3, WG, up ? 1.5 : 0.95); });
    // zigzag lightning tail
    piece(g, t => { const z = up ? [[6, 10], [4, 6], [3, 12], [1, 8]] : [[6, 10], [4, 7], [3, 12], [1, 9]]; for (let i = 1; i < z.length; i++) line(t, z[i - 1][0], z[i - 1][1] + b, z[i][0], z[i][1] + b, '#fff27a'); });
    piece(g, t => t.ell(10.6, 9.8 + b, 4.6, 4.4, R));
    g.px([[12, 3 + b], [13, 2 + b], [14, 4 + b], [15, 3 + b]], INK); g.set(13, 1 + b, '#fff27a'); g.set(16, 2 + b, '#fff27a');
    fil(g, [[8, 7 + b], [9, 6 + b], [8, 8 + b]], '#fffbe0');
    const ey = 8 + b; eyes(g, 10, 13, ey, f === 2); smile(g, 10, ey + 3, 4); cheeks(g, 9, 14, ey + 3, '#ffb35a');
    emp(g, f === 1 ? [[17, 7], [15, 16], [1, 3]] : [[17, 9], [14, 16], [2, 5]], '#fff27a');
  };
  // Laser: a floating red-pink prism crystal; frame 1 turns a facet to the light
  SPR.laser = function (g, f) {
    const R = elMain('laser', ['#ffc0d0', '#ff4a6a', '#b0183e']), b = f === 1 ? -1 : 0, sp = f === 1 ? 1 : 0;
    const top = 0.8 + b, m1 = 5 + b, m2 = 12 + b, bot = 16.6 + b;
    piece(g, t => t.poly([[9, top], [13.8, m1], [13.8, m2], [9, bot], [4.2, m2], [4.2, m1]], R[1]));
    const T = ['#fff2f6', R[0], R[1], R[2], '#78102c'];
    each(g, (x, y, c) => {
      if (!c || c === INK) return;
      const face = x <= 5 + sp ? 0 : x >= 12 + sp ? 2 : 1, cap = y + 0.5 < m1 ? -1 : y + 0.5 > m2 ? 1 : 0;
      g.set(x, y, T[Math.max(0, Math.min(4, face + 1 + cap))]);
    });
    fil(g, [[5, 6 + b], [5, 7 + b], [7, 3 + b], [6, 4 + b]], WHITE);
    const ey = 8 + b; eyes(g, 8, 11, ey, f === 2); smile(g, 8, ey + 3, 4); cheeks(g, 7, 12, ey + 3, '#ffe0ea');
    const gl = f === 1 ? [[2, 2], [16, 6], [1, 14], [16, 15]] : [[2, 5], [16, 3], [2, 15], [15, 13]];
    gl.forEach(([x, y], i) => (i % 2 ? emp(g, [[x, y]], '#ff8aa4') : twinkle(g, x, y, '#ffc0d0')));
  };
  // Poison: a purple bubbly blob that drips, with soap bubbles floating off it
  SPR.poison = function (g, f) {
    const R = elMain('poison', ['#e8c0ff', '#a45ad8', '#5e2a8e']), sq = f === 2, up = f === 1, BUB = ['#ffffff', '#f2e0ff', '#c89af0'];
    const cx = 9, rx = sq ? 7 : 6, ry = sq ? 4 : 4.8, cy = 14.6 - ry - (up ? 1 : 0), bot = cy + ry;
    piece(g, t => { t.ell(cx, cy, rx, ry, R[1]); shadeIn(t, cx, cy + 1, rx + 0.5, ry + 2.6, R); });
    // goo drips running off the bottom (no outline, so they read as liquid, not legs)
    const drip = (x, l) => {
      let y = g.h - 1; while (y > 0 && g.get(x, y) !== INK) y--;
      g.set(x, y, R[1]); for (let i = 1; i <= l; i++) g.set(x, y + i, R[2]);
      g.set(x, y + l + 1, INK); if (l > 1) { g.set(x + 1, y + l, R[2]); g.set(x + 1, y + l + 1, INK); g.set(x, y + l, R[1]); }
    };
    drip(12, sq ? 1 : up ? 3 : 2);
    if (!sq) { const y = up ? 15 : 16; g.set(6, y, R[1]); g.set(6, y + 1, INK); g.set(5, y, INK); g.set(7, y, INK); g.set(6, y - 1, INK); }
    // floating bubbles (rings with a glint)
    const bub = (x, y, r) => { piece(g, t => t.ell(x, y, r, r, BUB[1])); g.set(Math.floor(x - r * 0.4), Math.floor(y - r * 0.4), WHITE); };
    bub(3.4, up ? 2.6 : 3.6, 1.6); bub(14.4, up ? 1.4 : 2.2, 1.1);
    if (up) bub(9.6, 1.4, 0.8);
    g.ell(5.8, cy + 1.6, 1.3, 1.2, R[0], 0, (x, y) => g.filled(x, y)); fil(g, [[5, Math.round(cy) + 1]], WHITE);
    g.ell(8, cy - ry + 1.6, 0.9, 0.8, R[0], 0, (x, y) => g.filled(x, y));
    fil(g, [[5, Math.round(cy - ry) + 2], [6, Math.round(cy - ry) + 1]], '#f4e0ff');
    const ey = Math.round(cy) - 1; eyes(g, 10, 13, ey, sq); smile(g, 10, ey + 3, 4); cheeks(g, 9, 14, ey + 3, '#f0a0e8');
  };
  // Magic: a little pink-gold star with twinkles
  SPR.magic = function (g, f) {
    const R = ['#fff4a8', '#ffa8dc', '#c8509e'], b = f === 1 ? -1 : 0, rot = -Math.PI / 2 + (f === 1 ? 0.14 : 0);
    piece(g, t => { t.poly(starPts(9, 9.8 + b, 8, 4.3, 5, rot), R[1]); shadeIn(t, 8.4, 9 + b, 8.4, 8.4, R); });
    g.ell(10.2, 10.4 + b, 2.6, 2.2, '#ffc8ea', 0, (x, y) => g.get(x, y) === R[1]);
    fil(g, [[8, 3 + b], [9, 3 + b], [8, 4 + b], [3, 8 + b], [4, 8 + b]], '#fffbe0');
    const ey = 9 + b; eyes(g, 9, 12, ey, f === 2); smile(g, 9, ey + 3, 4); cheeks(g, 8, 13, ey + 3, '#ff6ab4');
    if (f === 1) { twinkle(g, 16, 2, '#fff27a'); twinkle(g, 1, 13, '#ffa8dc'); emp(g, [[2, 2], [16, 15]], '#fff27a'); }
    else { twinkle(g, 2, 2, '#fff27a'); twinkle(g, 16, 14, '#ffa8dc'); emp(g, [[16, 3], [1, 15]], '#fff27a'); }
  };
  // Dark: a shadow wisp with a curling tail and glowing yellow eyes
  SPR.dark = function (g, f) {
    const R = elMain('dark', ['#9a8ab8', '#56487a', '#2c2448']), b = f === 1 ? -1 : 0, s = f === 1 ? 1 : 0;
    piece(g, t => {
      t.ell(10, 7.6 + b, 5.4, 5.2, R[1]);
      t.poly([[15.4, 8 + b], [15, 11 + b], [12.6, 13.6 + b], [9, 14.8 + b], [5.6, 15.6 + b - s], [1.8 - s, 14.4 + b - s * 2], [4.4, 12.8 + b], [4.6, 8 + b]], R[1]);
      shadeIn(t, 10, 9 + b, 7, 8, R);
    });
    fil(g, [[7, 4 + b], [8, 3 + b], [6, 5 + b]], '#b8a8d8');
    const ey = 6 + b;
    for (const x of [10, 13]) { if (f === 2) { g.set(x, ey + 1, '#ffe24a'); } else { g.set(x, ey, '#fffbd0'); g.set(x, ey + 1, '#ffe24a'); } }
    smile(g, 10, ey + 3, 4); cheeks(g, 9, 14, ey + 3, '#9a6aa8');
    emp(g, f === 1 ? [[1, 8], [3, 4], [16, 15]] : [[2, 9], [1, 5], [16, 14]], '#74649a');
    twinkle(g, f === 1 ? 16 : 17, f === 1 ? 2 : 3, '#c9a2f0', '#f0e2ff');
  };
  // Rock: a grey pebble buddy with stubby feet; hops on frame 1, squishes on frame 2
  SPR.rock = function (g, f) {
    const R = elMain('rock', ['#ddd6ca', '#a0968a', '#645c54']), hop = f === 1 ? 2 : 0, sq = f === 2;
    const cx = 9, rx = sq ? 7 : 6.2, ry = sq ? 4 : 4.8, cy = 15.6 - ry - hop, fy = 16.2 - hop * 0.5;
    g.ell(5.8, fy, 1.7, 1, R[2]); g.ell(12.4, fy, 1.7, 1, R[2]);
    piece(g, t => t.ell(cx, cy, rx, ry, R));
    g.outline();
    const top = Math.ceil(cy - ry + 0.2);
    fil(g, [[6, top], [7, top], [8, top], [7, top + 1], [5, top + 1]], '#6abe30'); fil(g, [[7, top]], '#99e550');
    const c0 = Math.round(cy);
    fil(g, [[4, c0 + 1], [6, c0 + 3], [13, c0 + 3], [4, c0 - 1], [5, c0]], R[2]);
    fil(g, [[5, c0 - 2], [6, c0 - 3], [10, c0 - 3]], '#f2ece2');
    const ey = c0 - 1; eyes(g, 10, 13, ey, sq); smile(g, 10, ey + 3, 4); cheeks(g, 9, 14, ey + 3);
    if (f === 1) emp(g, [[3, 16], [15, 16]], '#c8bca8');
  };
  // Robot: a tiny round gear-bot with a visor and an antenna light; frame 1 turns the gear and lights the bulb
  SPR.robot = function (g, f) {
    const R = elMain('robot', ['#eef2fa', '#a8b4c8', '#5e6a80']), cx = 9, cy = 10.6, sp = f === 1 ? Math.PI / 8 : 0;
    piece(g, t => t.rect(9, 3, 1, 3, R[2]));
    piece(g, t => t.ell(9.5, 2.4, 1.4, 1.4, f === 1 ? ['#ffffff', '#fff27a', '#f6c83a'] : ['#ffe08a', '#f6b83a', '#c8781c']));
    piece(g, t => {
      t.ell(cx, cy, 4.6, 4.4, R[1]);
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + sp; t.ell(cx + Math.cos(a) * 4.9, cy + Math.sin(a) * 4.7, 1.15, 1.15, R[1]); }
      shadeIn(t, cx, cy, 6.2, 6, R);
    });
    g.ell(10.6, cy - 0.6, 3.2, 1.9, '#2c3448', 0, (x, y) => g.filled(x, y));
    const ey = Math.round(cy) - 2;
    if (f === 2) g.px([[9, ey + 1], [10, ey + 1], [12, ey + 1], [13, ey + 1]].filter(([x, y]) => g.get(x, y) === '#2c3448'), '#7ff0ff');
    else { g.px([[9, ey], [9, ey + 1], [12, ey], [12, ey + 1]], '#7ff0ff'); g.px([[9, ey], [12, ey]], '#e0ffff'); }
    smile(g, 9, ey + 4, 4);
    fil(g, [[5, Math.round(cy) - 2], [6, Math.round(cy) - 3]], WHITE);
    fil(g, [[6, Math.round(cy) + 2], [12, Math.round(cy) + 4]], R[2]);
    if (f === 1) emp(g, [[12, 1], [7, 1]], '#fff27a');
  };
  // Normal: a fluffy white puff with little feet
  SPR.normal = function (g, f) {
    const R = elMain('normal', ['#fffaf0', '#ece0cc', '#b4a48c']), hop = f === 1 ? 1 : 0, sq = f === 2 ? 1 : 0;
    const cy = 9.6 - hop + sq * 0.8, fy = 16 - hop * 0.6;
    g.ell(6.6, fy, 1.6, 0.9, '#c8b49a'); g.ell(11.6, fy, 1.6, 0.9, '#c8b49a');
    piece(g, t => {
      for (const [x, y, r] of [[9, cy + 0.6, 4.6], [4.8, cy + 1, 2.6], [6.4, cy - 2.6, 2.7], [10.4, cy - 3.4, 2.9], [13.6, cy - 0.8, 2.5], [13.4, cy + 2.6, 2.3], [5.4, cy + 3.2, 2.2], [9.6, cy + 3.4, 2.4]]) t.ell(x, y, r + sq * 0.35, r - sq * 0.3, R[1]);
      shadeIn(t, 9, cy, 7.6, 7.2, R);
    });
    g.outline();
    const c0 = Math.round(cy);
    fil(g, [[6, c0 - 4], [7, c0 - 5], [10, c0 - 5], [11, c0 - 6], [4, c0]], WHITE);
    fil(g, [[5, c0 + 3], [8, c0 + 4]], R[2]);
    const ey = c0 - 1; eyes(g, 10, 13, ey, f === 2); smile(g, 10, ey + 3, 4); cheeks(g, 9, 14, ey + 3);
  };

  // =====================================================================================================
  // 2) Type icons 7x7 (k = ink outline)
  // =====================================================================================================
  const ICONS = {
    fire: [['..k....', '.kbk.k.', '.kbakbk', 'kbbaabk', 'kbaaabk', 'kcbaack', '.kkkkk.'], { a: '#ffe27a', b: '#f2742a', c: '#b8321e' }],
    water: [['...k...', '..kak..', '.kaabk.', 'kawabck', 'kaabbck', '.kbbck.', '..kkk..'], { a: '#c4f6ff', b: '#4fc4ee', c: '#2a6fc0', w: WHITE }],
    ice: [['k..k..k', '.kkakk.', '.kawak.', 'kaw.wak', '.kawak.', '.kkakk.', 'k..k..k'], { a: '#8ed2f0', w: WHITE }],
    electric: [['...kkkk', '..kaabk', '.kabbk.', 'kabbbbk', 'kkkbbk.', '..kbk..', '..kk...'], { a: '#fffbb0', b: '#f8dc2c', c: '#c08a10' }],
    laser: [['...k...', '..kwk..', '.kabbk.', 'kaabbck', '.kbbck.', '..kck..', '...k...'], { a: '#ffc0d0', b: '#ff4a6a', c: '#b0183e', w: '#fff2f6' }],
    poison: [['....kk.', '...kwbk', '.kkkbck', 'kwbbkk.', 'kbbbck.', 'kbbcck.', '.kkkk..'], { b: '#a45ad8', c: '#5e2a8e', w: '#e8c0ff' }],
    magic: [['...k...', '..kak..', 'kkkabkk', 'kaabbbk', '.kbbck.', '.kbkck.', '.kk.kk.'], { a: '#fff4a8', b: '#ffa8dc', c: '#c8509e' }],
    dark: [['..kkk..', '.kaak.y', 'kaak...', 'kabk...', 'kabbk.k', '.kcbbck', '..kkkk.'], { a: '#9a8ab8', b: '#56487a', c: '#2c2448', y: '#ffe24a' }],
    rock: [['.......', '..kkk..', '.kaabk.', 'kaaabbk', 'kabbbck', 'kbbbcck', '.kkkkk.'], { a: '#ddd6ca', b: '#a0968a', c: '#645c54' }],
    robot: [['...y...', '.kkkkk.', 'kaaaabk', 'kaeaebk', 'kabbbck', 'kbkkkck', '.kkkkk.'], { a: '#eef2fa', b: '#a8b4c8', c: '#5e6a80', e: '#2c3448', y: '#ffd23a' }],
    normal: [['..kkk..', '.kaaak.', 'kawaabk', 'kaaaabk', 'kaaabbk', '.kbbbk.', '..kkk..'], { a: '#f6eedc', b: '#c8b49a', w: WHITE }],
    plant: [['....kkk', '..kkLLk', '.kLLLek', 'kLLeeEk', 'kLeeEk.', 'keEEk..', 'kkkk...'], { L: '#99e550', e: '#6abe30', E: '#37946e' }],
  };
  const ELEMENT_ICON = {};
  for (const id of Object.keys(ICONS)) ELEMENT_ICON[id] = function (g) { const [rows, map] = ICONS[id]; g.str(rows, 0, 0, Object.assign({ k: INK, '.': null }, map)); };

  // =====================================================================================================
  // 3) Element core orb (13x13) and shard (9x9)
  // =====================================================================================================
  const PLANT_RAMP = ['#b8f070', '#6cc84a', '#2f8a3e'];
  const orbRamp = el => (el === 'plant' ? PLANT_RAMP : elMain(el, ['#eef2fa', '#a8b4c8', '#5e6a80']));
  // symbols: '#' symbol colour, '+' accent; drawn with a 1px drop shadow in the orb's dark tone
  const SYM = {
    fire: [['..#..', '.##.#', '.####', '##+##', '#+++#', '.###.'], '#fffbe0', '#ffb84a'],
    water: [['..#..', '..#..', '.###.', '#+###', '#####', '.###.'], '#ffffff', '#b8ecff'],
    ice: [['#.#.#', '.###.', '##+##', '.###.', '#.#.#'], '#ffffff', '#c8f0ff'],
    electric: [['..##.', '.##..', '#####', '..##.', '.##..', '.#...'], '#ffffff', '#ffffff'],
    laser: [['....#.', '...#+#', '...##.', '..##..', '.##...', '##....'], '#ffffff', '#fff27a'],
    poison: [['..#..', '..#..', '.###.', '##.##', '#.###', '.###.'], '#c8f878', '#c8f878'],
    magic: [['..#..', '.###.', '##+##', '.###.', '.#.#.'], '#fff27a', '#ffffff'],
    dark: [['..###', '.##..', '##...', '##...', '.##..', '..###'], '#ffe24a', '#ffe24a'],
    rock: [['..###.', '.####+', '####++', '.###+.'], '#f4f0e8', '#c8c0b4'],
    robot: [['..#.#..', '.#####.', '###.###', '.#...#.', '###.###', '.#####.', '..#.#..'], '#ffffff', '#ffffff'],
    normal: [['...##..', '.#####.', '#######', '#######', '.#####.'], '#ffffff', '#ffffff'],
    plant: [['...##', '.####', '####.', '###..', '#....'], '#ffffff', '#e2ffc8'],
  };
  const SHADOW = { fire: '#b8321e', water: '#2a6fc0', ice: '#3a7ab8', electric: '#a8700c', laser: '#8a1030', poison: '#3e1a62', magic: '#a8449e', dark: '#1a1430', rock: '#4e4840', robot: '#4a5468', normal: '#9a8a72', plant: '#2f6a2e' };
  function ELEMENT_CORE(g, el) {
    const B = orbRamp(el), R = [mixHex(B[0], B[1], 0.35), mixHex(B[1], B[2], 0.12), B[2]], d = g.dither;
    g.dither = false; g.ell(6.5, 6.5, 5.6, 5.6, R); g.outline(); g.dither = d;
    // a soft glow ring just inside the rim
    each(g, (x, y, c) => { if (!c || c === INK) return; const r = Math.hypot(x + 0.5 - 6.5, y + 0.5 - 6.5); if (r > 4.1 && r < 5.2 && (x + y) % 2 === 0 && x + y < 13) g.set(x, y, mixHex(c, WHITE, 0.35)); });
    const s = SYM[el] || SYM.normal, rows = s[0], sw = rows[0].length, sh = rows.length, ox = Math.floor(6.5 - sw / 2), oy = Math.floor(6.5 - sh / 2);
    const on = (i, j) => { const ch = (rows[j] || '')[i]; return ch === '#' || ch === '+'; };
    const ol = SHADOW[el] || R[2];
    rows.forEach((row, j) => { for (let i = 0; i < sw; i++) if (on(i, j)) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]]) if (!on(i + a, j + b) && g.filled(ox + i + a, oy + j + b)) g.set(ox + i + a, oy + j + b, ol); });
    rows.forEach((row, j) => { for (let i = 0; i < sw; i++) if (on(i, j)) g.set(ox + i, oy + j, row[i] === '+' ? s[2] : s[1]); });
    g.px([[3, 2], [2, 3], [4, 2]].filter(([x, y]) => g.filled(x, y) && g.get(x, y) !== ol), WHITE);
  }
  function ELEMENT_SHARD(g, el) {
    const R = orbRamp(el);
    piece(g, t => t.poly([[2, 8.4], [1.2, 4.6], [4.4, 0.6], [7.6, 3], [6.8, 7.8], [4.6, 8.6]], R[1]));
    // facets: a lit left face, a mid centre ridge, a shaded right face
    each(g, (x, y, c) => { if (!c || c === INK) return; const k = (x + 0.5) - (4.4 + (y + 0.5 - 0.6) * 0.02); g.set(x, y, k < -0.6 ? R[0] : k > 1.2 ? R[2] : R[1]); });
    fil(g, [[2, 5], [3, 3], [3, 4]], WHITE);
    fil(g, [[4, 2]], mixHex(R[0], WHITE, 0.5));
    emp(g, [[8, 0], [0, 1]], mixHex(R[0], WHITE, 0.4));
  }

  // =====================================================================================================
  // 4) Fusion item icons (16x16)
  // =====================================================================================================
  const FUS = {};
  FUS.army = function (g) {
    const R = ['#a4b05e', '#6e7c34', '#414c1e'];
    piece(g, t => { t.ell(8, 11.4, 6.6, 8.4, R, 0, (x, y) => y <= 11.4); });
    piece(g, t => t.rect(1, 11, 14, 3, R[1]));
    each(g, (x, y, c) => { if (!c || c === INK || y < 11) return; g.set(x, y, y === 11 ? R[0] : y === 13 ? R[2] : R[1]); });
    for (let x = 2; x < 14; x++) if (g.filled(x, 10)) g.set(x, 10, '#5a3a22');
    g.poly(starPts(8, 6.8, 2.7, 1.15, 5), '#fff27a'); g.set(7, 6, '#ffffff');
    fil(g, [[4, 7], [12, 8], [5, 9], [11, 5], [3, 9], [13, 9]], R[2]); fil(g, [[4, 5], [5, 4], [3, 7], [6, 3]], '#c8d48a');
  };
  FUS.knight = function (g) {
    const S = ['#f4f8ff', '#b8c4d8', '#6a7690'], P = ['#ff9aa0', '#e0303e', '#901c30'];
    piece(g, t => { stroke(t, [[9, 4.6], [7, 2], [4, 1.4], [1.8, 3.4], [1.4, 6]], 1.7, 0.9, P[1]); shadeIn(t, 5, 3, 5, 4, P); });
    piece(g, t => { t.ell(8.6, 7.6, 5.2, 4.6, S[1], 0, (x, y) => y <= 8); t.rect(4, 8, 10, 7, S[1]); });
    each(g, (x, y, c) => { if (c !== S[1]) return; g.set(x, y, x <= 5 ? S[0] : x >= 12 ? S[2] : S[1]); });
    for (let x = 5; x <= 13; x++) if (x !== 9 && g.filled(x, 8)) g.set(x, 8, INK);
    for (let y = 9; y <= 13; y++) if (g.filled(9, y)) g.set(9, y, S[0]);
    g.px([[11, 11], [12, 11], [11, 12], [12, 12]].filter(([x, y]) => g.filled(x, y)), '#4a5468');
    fil(g, [[6, 5], [6, 4], [7, 4]], WHITE); fil(g, [[5, 10], [5, 13]], '#8a96b0');
  };
  FUS.pirate = function (g) {
    const H = ['#5a4a66', '#3a3044', '#241c2c'], GD = '#f6c83a';
    piece(g, t => t.poly([[0.6, 12.4], [2, 8], [5, 5.2], [8, 4], [11, 5.2], [14, 8], [15.4, 12.4], [12.6, 11.4], [10.2, 10.6], [8, 10.4], [5.8, 10.6], [3.4, 11.4]], H[1]));
    shadeIn(g, 7, 7, 8, 6, H);
    each(g, (x, y, c) => { if (c && c !== INK && g.get(x, y - 1) === INK) g.set(x, y, GD); });
    piece(g, t => t.ell(8, 7.6, 1.8, 1.8, ['#ff8a90', '#d24552', '#8a2433']));
    g.set(8, 7, '#fff27a'); g.set(7, 7, GD);
    fil(g, [[3, 10], [13, 10], [5, 9]], H[2]);
  };
  FUS.cowboy = function (g) {
    const B = ['#e4b27a', '#b07a40', '#6a4422'];
    piece(g, t => { t.poly([[4.2, 10.6], [4.4, 6.4], [5.4, 4], [8, 3.4], [10.6, 4], [11.6, 6.4], [11.8, 10.6]], B[1]); shadeIn(t, 7, 6, 6, 6, B); });
    piece(g, t => { t.ell(8, 11.6, 7, 1.9, B[1]); t.ell(1.4, 10.2, 1.3, 1.8, B[1], -0.3); t.ell(14.6, 10.2, 1.3, 1.8, B[1], 0.3); shadeIn(t, 8, 10.6, 8, 3, B); });
    for (let x = 4; x <= 11; x++) for (const y of [8, 9]) if (g.filled(x, y)) g.set(x, y, y === 8 ? '#e0303e' : '#a01c34');
    fil(g, [[7, 8], [7, 9]], '#fff27a');
    fil(g, [[8, 4], [8, 5]], B[2]); fil(g, [[6, 4], [5, 5], [5, 6]], '#f4d0a0'); fil(g, [[3, 11], [4, 11], [2, 10]], '#f4d0a0');
  };
  FUS.wizard = function (g) {
    const P = ['#b088f0', '#7a44c8', '#4a2478'];
    piece(g, t => { t.poly([[3, 12.6], [13, 12.6], [10.6, 5.4], [11.8, 3], [14.6, 1.8], [10.2, 1.6], [7.4, 5.2]], P[1]); shadeIn(t, 7, 6, 8, 8, P); });
    piece(g, t => t.ell(8, 13, 7.4, 1.9, ['#9a6ad0', '#5e3a8e', '#3a1e60']));
    for (let x = 4; x <= 12; x++) if (g.filled(x, 11)) g.set(x, 11, '#f6c83a');
    twinkle(g, 7, 8, '#fff27a', '#ffffff'); g.set(7, 8, '#fff27a'); g.px([[6, 8], [8, 8], [7, 7], [7, 9]].filter(([x, y]) => g.filled(x, y)), '#fff27a');
    fil(g, [[10, 6], [5, 10], [11, 9], [9, 4]], '#fff27a'); fil(g, [[14, 2]], '#fff27a');
  };
  FUS.crown = function (g) {
    const G2 = ['#fffbd0', '#f6c83a', '#b87818'];
    piece(g, t => { t.poly([[2, 13], [2, 5.4], [5, 8.6], [8, 3.4], [11, 8.6], [14, 5.4], [14, 13]], G2[1]); t.ell(2.2, 4.4, 1.2, 1.2, G2[1]); t.ell(8, 2.6, 1.3, 1.3, G2[1]); t.ell(13.8, 4.4, 1.2, 1.2, G2[1]); });
    each(g, (x, y, c) => { if (c !== G2[1]) return; g.set(x, y, x <= 3 ? G2[0] : x >= 12 ? G2[2] : y >= 10 ? G2[2] : G2[1]); });
    for (let x = 2; x <= 13; x++) if (g.filled(x, 10)) g.set(x, 10, '#c8901c');
    fil(g, [[5, 11], [6, 11], [5, 12]], '#e0303e'); fil(g, [[7, 11], [8, 11]], '#4fc4ee'); fil(g, [[10, 11], [11, 11], [10, 12]], '#e0303e');
    fil(g, [[8, 7], [8, 8]], '#4fc4ee'); fil(g, [[2, 4], [8, 2], [13, 4], [3, 7], [7, 5]], WHITE);
  };
  FUS.ninja = function (g) {
    const C = ['#6a6080', '#3a3044', '#241c2c'];
    // a cloth band with a metal plate, tied in a knot on the left with two fluttering ribbon tails
    piece(g, t => stroke(t, [[4.6, 9.4], [5.4, 12], [7, 14.2]], 0.8, 0.7, C[2]));
    piece(g, t => stroke(t, [[3.4, 9], [1.8, 11.2], [1.4, 14]], 0.9, 0.75, C[1]));
    g.px([[1, 14], [7, 14]].filter(([x, y]) => g.filled(x, y)), INK);
    piece(g, t => { for (let x = 4; x <= 15; x++) { const y = Math.round(5.4 + 0.035 * (x - 10) * (x - 10)); t.rect(x, y, 1, 4, C[1]); } });
    each(g, (x, y, c) => { if (c === C[1] && g.get(x, y - 1) === INK && x > 3) g.set(x, y, C[0]); });
    piece(g, t => t.ell(4.2, 8.4, 1.8, 1.7, C[1]));
    piece(g, t => t.rect(8, 5, 6, 4, '#c8d0dc'));
    g.px([[8, 5], [9, 5], [10, 5], [11, 5], [12, 5], [8, 6]], '#eef2fa'); g.px([[13, 6], [13, 7], [13, 8], [12, 8]], '#808ca0');
    g.px([[10, 6], [9, 7], [11, 7], [10, 8]], '#4a5468'); g.set(10, 7, '#808ca0');
    fil(g, [[4, 7], [2, 10], [2, 11], [1, 12]], C[0]);
  };
  FUS.space = function (g) {
    const GL = ['#e8fbff', '#a8dcf4', '#5e9ad0'], CO = ['#ffffff', '#d8dce8', '#8c93a8'];
    piece(g, t => t.ell(8, 7, 6.4, 6.2, GL));
    g.ell(8.6, 7.6, 4, 3.6, '#4a6aa8', 0, (x, y) => g.filled(x, y));
    g.ell(9.2, 8.2, 2.6, 2.2, '#3a5490', 0, (x, y) => g.filled(x, y));
    fil(g, [[4, 4], [5, 3], [4, 5], [6, 3], [3, 6]], WHITE); fil(g, [[7, 6], [11, 9]], '#c8e8ff'); fil(g, [[10, 7]], '#ffffff');
    piece(g, t => { t.ell(8, 13.4, 6, 2.2, CO); });
    g.px([[5, 13], [6, 13]], '#e0303e'); g.px([[10, 13], [11, 13]], '#4fc4ee');
    piece(g, t => t.rect(13, 1, 1, 3, '#8c93a8')); g.set(13, 0, '#e0303e');
  };
  FUS.extrashooter = function (g) {
    const PG = ['#b8f070', '#6cc84a', '#2f8a3e'], MT = ['#e8ecf4', '#a8b4c8', '#5e6a80'];
    piece(g, t => { t.poly([[3, 15.4], [4.4, 11.4], [9.6, 11.4], [11, 15.4]], MT[1]); });
    bevel(g, MT);
    piece(g, t => t.ell(3, 3.4, 2.2, 1.1, LEAFG, -0.8));
    piece(g, t => { t.ell(6.6, 7.2, 4.4, 4.2, PG); t.ell(11, 7.4, 2.8, 2, PG); });
    piece(g, t => t.ell(13.6, 7.4, 1.3, 2.4, PG));
    for (let y = 6; y <= 8; y++) if (g.filled(14, y)) g.set(14, y, '#1f4a2a');
    g.px([[7, 6], [7, 7]], INK); g.set(4, 5, '#e8ffc8'); g.set(5, 4, '#e8ffc8'); g.set(6, 9, '#f4a3b8');
    g.px([[6, 13], [7, 13], [8, 13]].filter(([x, y]) => g.filled(x, y)), MT[2]);
  };
  FUS.catapult = function (g) {
    const W = ['#e4b27a', '#b07a40', '#6a4422'];
    piece(g, t => { stroke(t, [[6, 12.6], [8, 7.6], [10, 12.6]], 0.6, 0.6, W[2]); });
    piece(g, t => stroke(t, [[13, 11], [8, 7.4], [4, 4.4]], 0.75, 0.6, W[1]));
    piece(g, t => { t.ell(3.4, 3.8, 3, 1.9, ['#d9a066', '#a8743a', '#6a4422'], 0, (x, y) => y >= 3.2); });
    piece(g, t => t.ell(3.4, 2.4, 1.7, 1.6, ['#c6f48a', '#6cc84a', '#2f8a3e']));
    piece(g, t => t.rect(1, 12, 14, 2, W[1]));
    piece(g, t => { t.ell(3.6, 14.2, 1.6, 1.6, ['#c48a5c', '#8f563b', '#5a3322']); t.ell(12.4, 14.2, 1.6, 1.6, ['#c48a5c', '#8f563b', '#5a3322']); });
    g.px([[3, 14], [12, 14]], '#f0d0a0');
    for (let x = 1; x < 15; x++) { if (g.get(x, 12) === W[1]) g.set(x, 12, W[0]); if (g.get(x, 13) === W[1] && x % 4 === 2) g.set(x, 13, W[2]); }
    fil(g, [[2, 4], [4, 4]], '#8f563b'); g.set(2, 2, '#e8ffc8'); g.set(8, 7, '#fff27a');
  };
  FUS.jetpack = function (g) {
    const T = ['#ff9aa0', '#e0303e', '#901c30'], MT = ['#e8ecf4', '#a8b4c8', '#5e6a80'];
    piece(g, t => { t.poly([[3.4, 11.6], [5.6, 11.6], [5, 15.2], [4.5, 13.8], [4, 15.4]], '#ffb35a'); t.poly([[10.4, 11.6], [12.6, 11.6], [12, 15.4], [11.5, 13.8], [11, 15.2]], '#ffb35a'); });
    g.px([[4, 12], [5, 12], [11, 12], [12, 12], [4, 13], [12, 13]].filter(([x, y]) => g.filled(x, y)), '#fff27a');
    piece(g, t => t.rect(6, 5, 4, 6, MT[1]));
    piece(g, t => { t.rect(2, 4, 5, 7, T[1]); t.ell(4.5, 4, 2.5, 2.2, T[1], 0, (x, y) => y <= 4.5); });
    piece(g, t => { t.rect(9, 4, 5, 7, T[1]); t.ell(11.5, 4, 2.5, 2.2, T[1], 0, (x, y) => y <= 4.5); });
    piece(g, t => { t.rect(3, 11, 3, 1, MT[2]); t.rect(10, 11, 3, 1, MT[2]); });
    each(g, (x, y, c) => { if (c !== T[1]) return; const lx = x < 8 ? x - 2 : x - 9; g.set(x, y, lx === 0 ? T[0] : lx >= 4 ? T[2] : T[1]); });
    for (const y of [6, 9]) for (let x = 2; x < 15; x++) if (g.filled(x, y) && (g.get(x, y) === T[1] || g.get(x, y) === T[0] || g.get(x, y) === T[2])) g.set(x, y, MT[1]);
    fil(g, [[3, 3], [10, 3], [3, 4], [10, 4]], '#ffd0d4'); fil(g, [[7, 7], [8, 7]], '#fff27a');
  };
  FUS.halloween = function (g) {
    const P = ['#ffc47a', '#f7922e', '#c8581c'];
    piece(g, t => { t.rect(7, 1, 2, 4, '#6a4422'); });
    piece(g, t => t.ell(11, 3, 2.2, 1.1, LEAFG, -0.4));
    piece(g, t => { t.ell(4.6, 9.4, 3.8, 5, P[1]); t.ell(11.4, 9.4, 3.8, 5, P[1]); t.ell(8, 9.4, 4.4, 5.6, P[1]); shadeIn(t, 8, 9, 7.6, 6.4, P); });
    for (let y = 5; y < 15; y++) for (const x of [5, 11]) if (g.filled(x, y) && y > 5 && y < 14) g.set(x, y, mixHex(g.get(x, y), P[2], 0.5));
    const hole = '#5a2a10', glow = ['#fff6b0', '#ffd23a'];
    // carved eyes (triangles) and a jagged grin, glowing inside
    for (const [x, y] of [[4, 8], [5, 8], [6, 8], [5, 7], [9, 8], [10, 8], [11, 8], [10, 7]]) g.set(x, y, glow[1]);
    g.set(5, 7, glow[0]); g.set(10, 7, glow[0]);
    for (let x = 4; x <= 11; x++) { g.set(x, 11, glow[1]); if (x % 2 === 0) g.set(x, 12, glow[1]); else g.set(x, 10, glow[0]); }
    g.px([[4, 10], [11, 10], [3, 11], [12, 11]].filter(([x, y]) => g.filled(x, y)), hole);
    g.set(7, 1, '#8f6a42'); fil(g, [[3, 6], [4, 5]], '#ffe4b8');
  };

  // =====================================================================================================
  // 5) Garden props: PX.PVZ_PROP[kind] = { w, h, draw(g, theme) }, anchor bottom-centre
  // =====================================================================================================
  const P = {};
  P.picketfence = { w: 30, h: 14, draw(g, th) {
    const W = th === 'night' ? ['#e4e6f8', '#b4b8d4', '#7a7e9e'] : ['#ffffff', '#eceff6', '#b4bccc'];
    g.rect(0, 5, 30, 2, W[1]); g.rect(0, 10, 30, 2, W[1]);
    for (let i = 0; i < 5; i++) { const x = 1 + i * 6; g.rect(x, 3, 3, 10, W[1]); g.poly([[x - 0.01, 3.2], [x + 1.5, 0.6], [x + 3.01, 3.2]], W[1]); }
    g.outline();
    for (let x = 0; x < 30; x++) { if (g.get(x, 6) === W[1]) g.set(x, 6, W[2]); if (g.get(x, 11) === W[1]) g.set(x, 11, W[2]); }
    for (let i = 0; i < 5; i++) { const x = 1 + i * 6; for (let y = 1; y < 13; y++) { if (g.filled(x, y)) g.set(x, y, W[0]); if (g.filled(x + 1, y) && y >= 3) g.set(x + 1, y, W[1]); if (g.filled(x + 2, y)) g.set(x + 2, y, W[2]); } }
    fil(g, [[8, 12], [20, 12], [26, 9]], W[2]);
    tufts(g, [[0, 13], [5, 13], [11, 13], [17, 13], [23, 13], [29, 13], [4, 12], [16, 12]], th);
  } };
  P.hedge = { w: 24, h: 14, draw(g, th) {
    const L = th === 'night' ? ['#52c7a8', '#2f8078', '#1f5452'] : th === 'desert' ? ['#c3d66a', '#8f974a', '#4b692f'] : ['#86c46a', '#3e8948', '#21523a'];
    g.dither = false;
    g.rect(1, 3, 22, 10, L[1]);
    for (let x = 2.4; x < 22; x += 3.6) g.ell(x, 3.4, 2, 1.4, L[1]);
    g.set(1, 12, null); g.set(22, 12, null);
    g.outline();
    each(g, (x, y, c) => { if (c !== L[1]) return; if (y <= 4) g.set(x, y, L[0]); else if (y >= 11 || x >= 21) g.set(x, y, L[2]); });
    foliage(g, L, 0.13, 11);
    fil(g, [[4, 3], [11, 2], [18, 3]], mixHex(L[0], WHITE, 0.4));
    if (th !== 'desert') fil(g, [[6, 7], [15, 9], [19, 6]], th === 'night' ? '#c9a2f0' : '#f7b6c8');
  } };
  P.mailbox = { w: 10, h: 18, draw(g, th) {
    const B = ['#9fd8ff', '#639bff', '#3f55b8'], WD = ['#c48a5c', '#8f563b', '#5a3322'];
    piece(g, t => t.rect(4, 9, 2, 8, WD[1]));
    for (let y = 9; y < 17; y++) { if (g.get(4, y) === WD[1]) g.set(4, y, WD[0]); }
    piece(g, t => { t.rect(1, 5, 8, 5, B[1]); t.ell(5, 5.4, 4, 2.8, B[1], 0, (x, y) => y <= 5.5); });
    bevel(g, B);
    for (let y = 4; y < 10; y++) if (g.filled(2, y)) g.set(2, y, B[2]);
    piece(g, t => { t.rect(7, 1, 1, 5, '#d24552'); t.rect(7, 1, 2, 2, '#d24552'); });
    g.px([[7, 1], [7, 2]], '#ff8a90'); fil(g, [[4, 7], [5, 7]], '#2a3a90');
    tufts(g, [[3, 17], [6, 17], [2, 16], [7, 16]], th);
  } };
  P.gnome = { w: 10, h: 14, draw(g) {
    const RD = ['#ff8a90', '#e0303e', '#901c30'], BL = ['#9fd8ff', '#639bff', '#3f55b8'];
    g.rect(2, 12, 2, 1, '#5a3322'); g.rect(6, 12, 2, 1, '#5a3322');
    g.rect(2, 9, 6, 3, BL[1]); g.px([[1, 9], [1, 10], [8, 9], [8, 10]], BL[1]);
    g.poly([[2, 8], [8.2, 8], [5.4, 12]], '#f4f0ea');
    g.rect(3, 6, 5, 2, '#f6d2ad');
    g.poly([[1.6, 6.2], [8.6, 6.2], [6.4, 2.6], [3.6, 0.4]], RD[1]);
    g.outline();
    each(g, (x, y, c) => { if (c !== RD[1]) return; if (y === 5 || x >= 7) g.set(x, y, RD[2]); else if (x <= 3 && y >= 2) g.set(x, y, RD[0]); });
    g.px([[5, 6], [7, 6]], INK); g.set(8, 7, '#f07a84'); g.set(8, 6, '#f6d2ad'); g.set(4, 7, '#f4a3b8');
    g.px([[4, 9], [5, 10], [6, 9]], '#ffffff'); g.px([[6, 10], [5, 11]], '#d8d0c8');
    g.px([[2, 10], [7, 10]], '#8f563b'); g.px([[1, 10], [8, 10]], '#f6d2ad'); g.px([[2, 11], [7, 11]], BL[2]);
    g.px([[4, 3], [5, 2]].filter(([x, y]) => g.filled(x, y)), '#ffb0b4');
  } };
  P.lawnmower = { w: 20, h: 12, draw(g, th) {
    const RD = ['#ff8a90', '#e0303e', '#901c30'], MT = ['#e8ecf4', '#a8b4c8', '#5e6a80'], TY = ['#6a6e86', '#3e4058', '#262838'];
    piece(g, t => stroke(t, [[6, 6], [3.4, 3.2], [1.6, 1.6]], 0.55, 0.55, MT[2]));
    piece(g, t => t.ell(1.6, 1.6, 1.2, 1.1, '#3a3044'));
    piece(g, t => t.rect(10, 1, 3, 2, '#4e4e5c'));
    piece(g, t => { t.rect(3, 6, 15, 3, MT[1]); t.ell(11, 6.6, 6, 3.6, RD, 0, (x, y) => y <= 6.6); });
    for (let x = 3; x < 18; x++) { if (g.get(x, 6) === MT[1]) g.set(x, 6, MT[0]); if (g.get(x, 8) === MT[1]) g.set(x, 8, MT[2]); }
    piece(g, t => { t.ell(5.6, 9.4, 2, 2, TY); t.ell(15, 9.4, 2, 2, TY); });
    g.px([[5, 9], [15, 9]], '#c8d0dc');
    fil(g, [[8, 4], [9, 4], [8, 5]], '#ffc0c4'); fil(g, [[17, 6]], '#fff27a');
    emp(g, [[0, 11], [19, 10], [18, 11]], leafOf(th)[1]); emp(g, [[1, 10]], leafOf(th)[0]);
  } };
  P.flowerpot = { w: 10, h: 10, draw(g, th) {
    const TC = ['#f5a86a', '#df7126', '#96461c'], L = leafOf(th);
    if (th === 'desert') {
      piece(g, t => { t.ell(5, 3.6, 2, 3, ['#9ce07a', '#4fae5a', '#2f7a4a']); t.ell(2.4, 3.6, 1, 1.4, ['#9ce07a', '#4fae5a', '#2f7a4a']); });
      g.px([[4, 3], [5, 2], [6, 4]].filter(([x, y]) => g.filled(x, y)), WHITE); g.set(5, 0, '#f07aa0'); g.set(4, 0, '#ffd0e0');
    } else {
      const FL = th === 'night' ? ['#ffffff', '#d8c8f8', '#9a88d0'] : th === 'sea' ? ['#ffd0b0', '#ff8a5a', '#c04a3a'] : ['#ffd0dc', '#f07aa0', '#b8406a'];
      piece(g, t => { t.ell(2.8, 4, 1.8, 0.9, L, 0.5); t.ell(7.2, 4, 1.8, 0.9, L, -0.5); t.rect(4, 2, 2, 3, L[2]); });
      piece(g, t => { for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; t.ell(5 + Math.cos(a) * 1.3, 2.4 + Math.sin(a) * 1.1, 1, 0.9, FL[1]); } });
      g.px([[4, 2], [5, 2]], '#fbf236'); fil(g, [[3, 1], [3, 2]], FL[0]);
    }
    piece(g, t => { t.poly([[2, 6], [8, 6], [7.2, 9.6], [2.8, 9.6]], TC[1]); t.rect(1, 5, 8, 2, TC[1]); });
    bevel(g, TC);
    for (let x = 1; x < 9; x++) if (g.get(x, 6) && g.get(x, 6) !== INK && g.get(x, 7) && g.get(x, 7) !== INK) g.set(x, 7, TC[2]);
    fil(g, [[2, 5], [3, 5]], '#ffd0a8');
  } };
  P.gravestone = { w: 12, h: 16, draw(g, th) {
    const S = th === 'night' ? ['#c4c8e0', '#9094b4', '#5e6282'] : ['#dfe2e8', '#a8adb8', '#6e7484'];
    piece(g, t => { t.rect(1, 6, 10, 9, S[1]); t.ell(6, 6.4, 5, 5, S[1], 0, (x, y) => y <= 6.5); });
    bevel(g, S);
    const k = S[2];
    // "RIP" as a few engraved pixels
    g.px([[2, 5], [3, 5], [2, 6], [4, 6], [2, 7], [3, 7], [2, 8], [4, 8]], k);
    g.px([[6, 5], [6, 6], [6, 7], [6, 8]], k);
    g.px([[8, 5], [9, 5], [8, 6], [9, 6], [8, 7], [8, 8]], k);
    g.px([[3, 10], [4, 10], [5, 10], [6, 10], [7, 10], [8, 10]], mixHex(S[1], S[2], 0.5));
    fil(g, [[9, 3], [8, 4], [9, 12], [8, 13]], k);
    const L = leafOf(th);
    fil(g, [[2, 3], [3, 2], [2, 4]], L[1]); fil(g, [[3, 3]], L[0]);
    tufts(g, [[0, 15], [1, 15], [10, 15], [11, 15], [0, 14], [11, 14], [3, 15], [8, 15]], th);
    g.px([[1, 14], [2, 14], [9, 14], [10, 14]].filter(([x, y]) => g.filled(x, y)), L[1]);
  } };
  P.gravestone2 = { w: 10, h: 13, draw(g, th) {
    const S = th === 'night' ? ['#b4b0d0', '#848098', '#56526e'] : ['#d4cfc6', '#a39d92', '#6e685e'];
    piece(g, t => { t.rect(1, 2, 8, 10, S[1]); t.set(8, 2, null); t.set(7, 2, null); t.set(8, 3, null); });
    bevel(g, S);
    g.px([[3, 5], [4, 5], [5, 5], [6, 5], [3, 7], [4, 7], [5, 7]], S[2]);
    fil(g, [[6, 9], [7, 10], [2, 3]], S[2]);
    const L = leafOf(th);
    tufts(g, [[0, 12], [9, 12], [2, 12], [7, 12], [0, 11]], th);
    fil(g, [[1, 11], [2, 11], [8, 11]], L[1]); fil(g, [[1, 10]], L[0]);
  } };
  P.deadtree = { w: 26, h: 34, draw(g, th) {
    const T = th === 'night' ? ['#8a7ea8', '#584e78', '#352e50'] : th === 'desert' ? ['#c4a888', '#8a7058', '#5a4636'] : ['#a08c80', '#6e5a52', '#46363a'];
    g.dither = false;
    const br = (pts, r0, r1) => stroke(g, pts, r0, r1, T[1]);
    br([[12.6, 33.6], [13, 27], [12, 21], [13.4, 15], [12.6, 9], [13.6, 5]], 2.5, 0.8);
    br([[12.4, 22], [8.4, 18], [5.4, 18.4], [3, 15.6], [2.4, 13]], 1.4, 0.5);
    br([[5.6, 18.2], [4.8, 21.4], [2.6, 22.6]], 0.7, 0.45);
    br([[12.8, 16], [9.4, 11.6], [7, 7], [7.6, 3.6]], 1.2, 0.5);
    br([[8.6, 10.4], [5.4, 9.6], [3.8, 7]], 0.65, 0.45);
    br([[13.2, 19], [17, 15.4], [20.2, 16], [23, 12.6]], 1.4, 0.5);
    br([[20.4, 15.8], [22.6, 18.6], [24, 18.4]], 0.65, 0.45);
    br([[13.2, 12.6], [16.2, 8.6], [19.4, 7], [20.4, 4]], 1, 0.5);
    br([[13.4, 33.6], [16.6, 32.6], [18.6, 33.6]], 1, 0.6);
    br([[12, 33.6], [8.6, 32.8], [7, 33.6]], 1, 0.6);
    g.outline();
    each(g, (x, y, c) => { if (c !== T[1]) return; if (g.get(x - 1, y) === INK) g.set(x, y, T[0]); else if (g.get(x + 1, y) === INK) g.set(x, y, T[2]); });
    bark(g, [T[1]], T[2], 4);
    // a knot hole
    g.ell(13, 24.6, 1.2, 1.7, '#241c2c', 0, (x, y) => g.filled(x, y)); g.set(13, 23, T[2]);
    if (th === 'night') { emp(g, [[4, 5], [22, 3], [1, 19]], '#c9a2f0'); g.px([[12, 25], [14, 25]].filter(([x, y]) => g.get(x, y) === '#241c2c'), '#fff27a'); }
    tufts(g, [[5, 33], [20, 33], [6, 33], [19, 33]], th);
  } };
  P.ironfence = { w: 28, h: 16, draw(g, th) {
    const I = th === 'night' ? ['#9a9ec4', '#5c6088', '#3a3d5e'] : ['#9a9eb4', '#5c6074', '#3a3c4e'];
    const bars = [4, 9, 14, 19, 24];
    g.rect(0, 5, 28, 1, I[1]); g.rect(0, 12, 28, 1, I[1]);
    for (const x of bars) { g.rect(x, 3, 1, 12, I[1]); g.poly([[x - 1, 3.6], [x + 0.5, 0.6], [x + 2, 3.6]], I[1]); }
    g.outline();
    for (const x of bars) { for (let y = 1; y < 15; y++) if (g.get(x, y) === I[1] && (y < 4 || y % 3 === 0)) g.set(x, y, I[0]); g.set(x, 1, mixHex(I[0], WHITE, 0.4)); }
    // little rings between the bars
    for (const x of [6, 7, 11, 12, 16, 17, 21, 22]) { if (!g.get(x, 8) || g.get(x, 8) === INK) g.set(x, 8, I[1]); }
    tufts(g, [[0, 15], [2, 15], [7, 15], [11, 15], [17, 15], [21, 15], [26, 15], [27, 15]], th);
  } };
  P.poolchair = { w: 22, h: 12, draw(g) {
    const FR = ['#ffffff', '#d8dce8', '#8c93a8'], CU = ['#4fb8e8', '#ffffff'];
    piece(g, t => { t.rect(7, 8, 13, 1, FR[1]); t.rect(8, 9, 1, 2, FR[1]); t.rect(19, 9, 1, 2, FR[1]); t.rect(4, 6, 1, 5, FR[1]); });
    piece(g, t => { t.rect(6, 6, 15, 2, '#fff'); stroke(t, [[2.4, 1.6], [6.8, 6.6]], 1.05, 1.05, '#fff'); });
    each(g, (x, y, c) => { if (c !== '#fff') return; const k = Math.floor((x + (y < 6 ? (6 - y) : 0)) / 2) % 2; g.set(x, y, k ? CU[1] : (y === 7 || x >= 20 ? '#2a78b8' : CU[0])); });
    fil(g, [[2, 1], [3, 1]], '#c8eaff');
    g.px([[8, 10], [19, 10], [4, 10]], FR[2]);
  } };
  P.poolladder = { w: 10, h: 16, draw(g) {
    const C = ['#ffffff', '#c8d0dc', '#7a8698'];
    piece(g, t => {
      for (const x0 of [1.5, 5.5]) stroke(t, [[x0, 15.6], [x0, 4.4], [x0 + 0.5, 2.4], [x0 + 1.8, 1.5], [x0 + 2.8, 2.4], [x0 + 3, 3.6]], 0.55, 0.55, C[1]);
      for (const y of [7, 10, 13]) t.rect(2, y, 4, 1, C[1]);
    });
    each(g, (x, y, c) => { if (c !== C[1]) return; if (g.get(x - 1, y) === INK && g.get(x, y - 1) !== INK) g.set(x, y, C[0]); if (g.get(x + 1, y) === INK && g.get(x, y + 1) === INK) g.set(x, y, C[2]); });
    g.px([[1, 5], [5, 5], [2, 2], [6, 2]].filter(([x, y]) => g.filled(x, y)), C[0]);
    emp(g, [[0, 15], [7, 15]], '#9fd8ff');
  } };
  P.lifering = { w: 12, h: 12, draw(g) {
    const RD = ['#ff8a90', '#e0303e', '#901c30'], WH = ['#ffffff', '#eeecf4', '#b8bccc'];
    g.ell(6, 6, 5.4, 5.4, '#fff');
    each(g, (x, y, c) => { if (c && Math.hypot(x + 0.5 - 6, y + 0.5 - 6) < 2.4) g.set(x, y, null); });
    g.outline();
    each(g, (x, y, c) => {
      if (c !== '#fff') return;
      const dx = x + 0.5 - 6, dy = y + 0.5 - 6, a = Math.atan2(dy, dx), band = Math.floor((a + Math.PI + Math.PI / 8) / (Math.PI / 4)) % 2;
      const R2 = band ? RD : WH, r = Math.hypot(dx, dy), d = (dx * 0.55 + dy * 0.85) / Math.max(1, r);
      const inner = r < 3.6;
      g.set(x, y, (d < -0.45 && !inner) || (d > 0.45 && inner) ? R2[0] : (d > 0.45 && !inner) || (d < -0.45 && inner) ? R2[2] : R2[1]);
    });
    fil(g, [[3, 2], [2, 3]], WHITE);
  } };
  P.cannon = { w: 20, h: 14, draw(g) {
    const IR = ['#8a8ea8', '#4e5270', '#2e3048'], WD = ['#c48a5c', '#8f563b', '#5a3322'];
    piece(g, t => t.poly([[3, 8.4], [12, 8.4], [11, 12.4], [4, 12.4]], WD[1]));
    bevel(g, WD);
    piece(g, t => { stroke(t, [[4, 7.4], [16, 4.4]], 2.5, 1.9, IR[1]); t.ell(3, 7.6, 1.4, 1.4, IR[1]); shadeIn(t, 9, 5, 9, 4, IR, -0.25); });
    piece(g, t => t.ell(17, 4.2, 1.2, 2.4, IR, -0.25));
    g.px([[17, 3], [17, 4], [17, 5]].filter(([x, y]) => g.filled(x, y)), '#1a1a28');
    for (const [x, y] of [[9, 4], [9, 5], [9, 6], [9, 7], [10, 4], [10, 5], [10, 6]]) if (g.filled(x, y)) g.set(x, y, IR[2]);
    piece(g, t => t.ell(7.4, 11, 2.6, 2.6, WD));
    g.px([[7, 11], [7, 9], [7, 12], [5, 11], [9, 11]].filter(([x, y]) => g.filled(x, y)), WD[2]); g.set(7, 11, '#f6c83a');
    piece(g, t => t.ell(14.6, 11.8, 1.7, 1.7, IR)); piece(g, t => t.ell(18, 11.8, 1.7, 1.7, IR));
    g.px([[14, 11], [17, 11]].filter(([x, y]) => g.filled(x, y)), '#c8ccdc');
    fil(g, [[6, 5], [7, 5], [5, 6]], '#b8bcd4');
  } };
  P.treasure = { w: 16, h: 12, draw(g) {
    const WD = ['#c48a5c', '#8f563b', '#5a3322'], GD = ['#fffbd0', '#f6c83a', '#b87818'];
    piece(g, t => t.poly([[1.6, 5], [2.6, 0.6], [13.4, 0.6], [14.4, 5]], WD[1]));
    g.rect(4, 2, 8, 3, '#7a2a30'); g.rect(4, 2, 8, 1, '#5a1a24');
    for (let y = 1; y < 5; y++) for (const x of [2, 13]) if (g.filled(x, y)) g.set(x, y, '#d8a040');
    piece(g, t => t.ell(8, 5.8, 6.2, 2.6, GD, 0, (x, y) => y <= 6.2));
    piece(g, t => t.rect(1, 6, 14, 5, WD[1]));
    bevel(g, WD);
    for (let y = 6; y < 11; y++) for (const x of [1, 2, 13, 14]) if (g.filled(x, y)) g.set(x, y, x === 1 || x === 13 ? '#f6c83a' : '#c8901c');
    for (let x = 1; x < 15; x++) if (g.filled(x, 6)) g.set(x, 6, x % 2 ? '#a8703a' : WD[0]);
    piece(g, t => t.rect(7, 7, 2, 2, GD[1]));
    g.set(8, 8, INK); g.set(7, 7, GD[0]);
    fil(g, [[5, 4], [5, 3]], '#e0303e'); fil(g, [[11, 4]], '#4fc4ee'); fil(g, [[9, 3], [3, 5], [10, 5]], WHITE); fil(g, [[6, 5], [12, 5], [8, 4]], GD[2]);
    emp(g, [[15, 11], [0, 11]], '#f6c83a');
  } };
  P.barrel = { w: 12, h: 14, draw(g) {
    const WD = ['#d9a066', '#a8743a', '#6a4422'], MT = ['#c8d0dc', '#8c93a8', '#595a70'];
    piece(g, t => { t.ell(6, 7, 5, 6.4, WD[1]); t.rect(2, 1, 8, 12, WD[1]); });
    each(g, (x, y, c) => { if (c !== WD[1]) return; if (x <= 2) g.set(x, y, WD[0]); else if (x >= 9) g.set(x, y, WD[2]); else if (x === 4 || x === 7) g.set(x, y, '#946232'); });
    g.ell(6, 1.6, 3.6, 0.9, '#e8c08a', 0, (x, y) => g.filled(x, y)); g.px([[4, 1], [5, 1], [6, 1], [7, 1]].filter(([x, y]) => g.filled(x, y)), '#c89a60');
    for (const y of [3, 10]) for (let x = 0; x < 12; x++) if (g.filled(x, y)) g.set(x, y, x <= 2 ? MT[0] : x >= 9 ? MT[2] : MT[1]);
    fil(g, [[3, 5], [3, 6]], '#f0c890');
  } };
  P.obelisk = { w: 10, h: 30, draw(g, th) {
    const S = th === 'night' ? dimR(['#fbe8b8', '#e0c080', '#a8844a'], th, 0.3) : ['#fbe8b8', '#e0c080', '#a8844a'], GD = ['#fffbd0', '#f6c83a', '#b87818'];
    piece(g, t => t.rect(1, 26, 8, 3, S[2]));
    piece(g, t => t.poly([[2.2, 26.2], [3, 5], [7, 5], [7.8, 26.2]], S[1]));
    each(g, (x, y, c) => { if (c !== S[1]) return; if (g.get(x - 1, y) === INK) g.set(x, y, S[0]); else if (g.get(x + 1, y) === INK || x >= 6) g.set(x, y, S[2]); });
    piece(g, t => t.poly([[2.8, 5.2], [5, 0.6], [7.2, 5.2]], GD[1]));
    each(g, (x, y, c) => { if (c === GD[1] && x <= 4) g.set(x, y, GD[0]); });
    const k = '#7a5a2a';
    g.px([[4, 8], [5, 8], [4, 9], [4, 11], [5, 12], [4, 12], [5, 14], [4, 15], [5, 15], [4, 18], [4, 19], [5, 19], [4, 21], [5, 22], [4, 23]], k);
    g.px([[3, 26], [5, 27]].filter(([x, y]) => g.filled(x, y)), S[1]);
    if (th === 'night') g.set(5, 1, '#ffffff');
  } };
  P.sarcophagus = { w: 12, h: 20, draw(g) {
    const GD = ['#fffbd0', '#f6c83a', '#b87818'], BL = ['#6a9af0', '#3f55b8', '#24306e'];
    piece(g, t => t.poly([[3.4, 19.6], [2, 11], [1.6, 7.4], [2.4, 3], [6, 0.6], [9.6, 3], [10.4, 7.4], [10, 11], [8.6, 19.6]], GD[1]));
    each(g, (x, y, c) => { if (c !== GD[1]) return; if (g.get(x - 1, y) === INK) g.set(x, y, GD[0]); else if (g.get(x + 1, y) === INK) g.set(x, y, GD[2]); });
    // striped headdress
    each(g, (x, y, c) => { if (!c || c === INK) return; if (y >= 2 && y <= 9 && (x <= 3 || x >= 8) && y % 2 === 0) g.set(x, y, BL[1]); });
    g.rect(4, 3, 4, 5, '#f8d8a0'); g.px([[4, 3], [7, 3]], '#e8c080');
    g.px([[5, 5], [7, 5]], INK); g.px([[4, 5], [8, 5]].filter(([x, y]) => g.filled(x, y)), '#24306e');
    g.px([[5, 7], [6, 7]], '#c86a5a');
    for (let x = 3; x <= 8; x++) { g.set(x, 9, BL[1]); g.set(x, 10, x % 2 ? GD[1] : BL[0]); }
    g.px([[4, 11], [7, 11], [5, 12], [6, 12]], BL[2]);
    for (let y = 13; y <= 18; y++) if (g.filled(6, y)) g.set(6, y, y % 2 ? BL[1] : '#a8701c');
    g.px([[5, 14], [5, 16], [7, 15], [7, 17]].filter(([x, y]) => g.filled(x, y)), '#c8901c');
  } };
  P.urn = { w: 10, h: 12, draw(g) {
    const C = ['#f5a86a', '#d0703a', '#8a3e1c'];
    piece(g, t => { stroke(t, [[2.6, 3.6], [1, 4.8], [1.6, 7]], 0.5, 0.5, C[1]); stroke(t, [[7.4, 3.6], [9, 4.8], [8.4, 7]], 0.5, 0.5, C[1]); });
    piece(g, t => { t.ell(5, 7.2, 3.8, 3.6, C[1]); t.rect(3, 2, 4, 4, C[1]); t.ell(5, 2, 2.8, 1, C[1]); t.rect(3, 10, 4, 1, C[1]); });
    each(g, (x, y, c) => { if (c !== C[1]) return; if (x <= 2 || (x === 3 && y < 6)) g.set(x, y, C[0]); else if (x >= 7 || (x === 6 && y < 6)) g.set(x, y, C[2]); });
    for (let x = 1; x < 9; x++) { if (g.filled(x, 6)) g.set(x, 6, '#3a2a2a'); if (g.filled(x, 7)) g.set(x, 7, (x % 2) ? '#3a2a2a' : '#f2d49a'); if (g.filled(x, 8)) g.set(x, 8, '#3a2a2a'); }
    g.px([[4, 1], [5, 1]].filter(([x, y]) => g.filled(x, y)), '#5a2a14');
    fil(g, [[3, 4], [2, 9]], '#ffd0a8');
  } };
  P.pyramid = { w: 40, h: 26, draw(g, th) {
    const S = th === 'night' ? ['#c8b494', '#9a8466', '#6a5a46'] : ['#fbe4b0', '#e0c080', '#b08c50'], GD = ['#fffbd0', '#f6c83a', '#b87818'];
    g.poly([[0.6, 25.6], [20, 1], [39.4, 25.6]], S[1]);
    g.outline();
    // lit left face, shaded right face, split by a ridge from the tip down to the right of centre
    each(g, (x, y, c) => {
      if (c !== S[1]) return;
      const ridge = 20 + (y - 1) * (4.6 / 24.6), lit = x + 0.5 < ridge;
      let col = lit ? S[0] : S[2];
      if ((y - 2) % 3 === 0) col = lit ? S[1] : mixHex(S[2], INK, 0.2);
      else if (((x + (Math.floor((y - 2) / 3) % 2) * 3) % 6) === 0) col = lit ? S[1] : mixHex(S[2], INK, 0.15);
      g.set(x, y, col);
    });
    each(g, (x, y, c) => { if (c && c !== INK && y <= 5) g.set(x, y, x + 0.5 < 20 + (y - 1) * 0.19 ? GD[0] : GD[2]); });
    g.px([[19, 2], [19, 3]].filter(([x, y]) => g.filled(x, y)), WHITE);
    for (let y = 20; y <= 25; y++) for (let x = 17; x <= 21; x++) if (g.filled(x, y) && !(y === 20 && (x === 17 || x === 21))) g.set(x, y, '#3a2a24');
    g.px([[18, 20], [19, 20], [20, 20]].filter(([x, y]) => g.filled(x, y)), '#5a4232');
    if (th === 'night') g.px([[19, 23], [20, 23]], '#fff27a');
  } };
  P.brainsign = { w: 14, h: 18, draw(g, th) {
    const W = ['#ecc08a', '#c8904a', '#8f563b'];
    piece(g, t => t.rect(6, 8, 2, 9, '#8f563b'));
    for (let y = 8; y < 17; y++) if (g.get(6, y) === '#8f563b') g.set(6, y, '#b07a4a');
    piece(g, t => t.poly([[1, 2.6], [13, 1.2], [13.4, 8.2], [1.4, 9.2]], W[1]));
    bevel(g, W);
    const k = '#5a3322';
    g.px([[3, 3], [4, 3], [6, 3], [7, 3], [8, 2], [10, 2], [11, 2]].filter(([x, y]) => g.filled(x, y)), k);
    g.px([[3, 5], [4, 4], [5, 4], [7, 4], [8, 4]].filter(([x, y]) => g.filled(x, y)), k);
    // a wobbly hand-painted red arrow pointing right
    g.px([[3, 7], [4, 7], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6], [9, 5], [10, 7], [11, 6], [9, 4]].filter(([x, y]) => g.filled(x, y)), '#d24552');
    g.px([[2, 3], [12, 2], [12, 8], [2, 8]].filter(([x, y]) => g.filled(x, y)), '#45283c');
    tufts(g, [[5, 17], [8, 17], [4, 17], [9, 16]], th);
  } };
  // fruit trees for the spooky and desert gardens (fruit is drawn on top by the game, so the canopies leave room)
  P.spookytree = { w: 30, h: 38, draw(g, th) {
    g.dither = false;
    const LV = th === 'night' ? ['#9a7ad8', '#6a44a8', '#40246e'] : ['#c9a2f0', '#9a6ad0', '#5e3a8e'];
    const TR = th === 'night' ? ['#7a6290', '#4e3a64', '#2e2240'] : ['#8a6a7a', '#5e4252', '#3a2836'];
    stroke(g, [[15, 37.6], [14, 32], [16.6, 27], [14.2, 22], [15.6, 18]], 2.6, 1.4, TR[1]);
    stroke(g, [[13.4, 37.6], [10.6, 36.6], [9, 37.6]], 1, 0.6, TR[1]); stroke(g, [[16.4, 37.6], [19.4, 36.8], [21, 37.6]], 1, 0.6, TR[1]);
    stroke(g, [[14.4, 24], [10, 21.6], [8.6, 18.6]], 1, 0.5, TR[1]); stroke(g, [[15.6, 21], [20.4, 19.4], [21.6, 16.6]], 1, 0.5, TR[1]);
    g.ell(15, 12.4, 10, 7.6, LV); g.ell(6.6, 16, 5.6, 4.4, LV); g.ell(23.4, 15.4, 5.6, 4.6, LV); g.ell(12, 6, 6, 4.6, LV); g.ell(19.4, 6.6, 5, 4, LV);
    g.outline();
    foliage(g, LV, 0.05, 6); bark(g, [TR[1]], TR[2], 2);
    each(g, (x, y, c) => { if (c === TR[1] && g.get(x - 1, y) === INK) g.set(x, y, TR[0]); });
    // curly twig tips poking out of the canopy
    for (const [x, y] of [[2, 12], [1, 11], [1, 10], [2, 9], [27, 9], [28, 8], [28, 7], [27, 6], [15, 1], [16, 0], [17, 0]]) if (!g.get(x, y)) g.set(x, y, TR[2]);
    g.px([[9, 7], [10, 6], [14, 9], [5, 14], [21, 12], [18, 4]].filter(([x, y]) => g.filled(x, y)), LV[0]);
    g.px([[8, 6], [9, 5], [17, 3]].filter(([x, y]) => g.filled(x, y)), mixHex(LV[0], WHITE, 0.45));
    if (th === 'night') for (const [x, y] of [[3, 4], [26, 2], [1, 24], [28, 22]]) if (!g.get(x, y)) g.set(x, y, '#c9a2f0');
    g.px([[11, 37], [19, 37], [8, 36]].filter(([x, y]) => !g.get(x, y)), leafOf(th)[1]);
  } };
  P.datepalm = { w: 30, h: 38, draw(g, th) {
    const TR = th === 'night' ? ['#b08a66', '#7e5e42', '#4e3826'] : ['#e0b070', '#b07e44', '#76522c'];
    const LV = th === 'night' ? ['#6ad0a8', '#2f8f78', '#1f5a50'] : ['#b8d88a', '#76a85a', '#3e6a3a'];
    for (let i = 0; i <= 16; i++) { const t = i / 16; g.ell(14 + 2.6 * t * t, 37.4 - t * 27, 2.1 - t * 0.5, 1.4, TR); }
    const cx = 16.4, cy = 10;
    const fr = [[[cx, cy], [11, 9], [6, 11], [2.6, 15.6]], [[cx, cy], [21, 9], [25.6, 11], [28.4, 15.4]], [[cx, cy], [12, 6], [7, 5], [3, 7.6]], [[cx, cy], [20.6, 5.6], [25, 5], [28, 8]],
      [[cx, cy], [14, 4], [11, 1.6]], [[cx, cy], [18.6, 3.6], [21.6, 1.6]], [[cx, cy], [12.6, 11.6], [9.6, 15.6], [8.4, 19]], [[cx, cy], [20.4, 11.6], [23, 15.4], [23.6, 19]]];
    for (const f of fr) piece(g, t => stroke(t, f, 1.8, 0.6, LV[1]));
    for (const f of fr) for (let i = 1; i < f.length; i++) line(g, f[i - 1][0], f[i - 1][1] - 0.6, f[i][0], f[i][1] - 0.6, LV[0]);
    // serrated frond edges
    each(g, (x, y, c) => { if (c === LV[1] && g.get(x, y + 1) === INK && (x + y) % 3 === 0) g.set(x, y, LV[2]); });
    g.outline();
    // criss-cross trunk pattern
    each(g, (x, y, c) => { if ((c === TR[1] || c === TR[0]) && y > 12 && (y % 3 === 0 || (y % 3 === 1 && (x + y) % 4 === 0))) g.set(x, y, TR[2]); });
    g.set(Math.round(cx), cy, LV[2]);
    g.px([[11, 37], [21, 37], [10, 36]].filter(([x, y]) => !g.get(x, y)), th === 'desert' ? '#c8a860' : leafOf(th)[1]);
  } };

  // =====================================================================================================
  // 6) Rest houses: PX.PVZ_HOME[kind] = { w, h, door, win, draw(g, theme) }
  // =====================================================================================================
  const H = {};
  // window helper: a framed window with a cross bar; lit at night
  function win(g, x, y, w, h, th, frame) {
    const GL = glass(th), F = frame || '#ffffff';
    piece(g, t => t.rect(x, y, w, h, GL[1]));
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g.get(i, j) === GL[1] && (i === x || j === y)) g.set(i, j, GL[0]);
    const mx = x + Math.floor(w / 2), my = y + Math.floor(h / 2);
    for (let j = y; j < y + h; j++) g.set(mx, j, F); for (let i = x; i < x + w; i++) g.set(i, my, F);
    if (th !== 'night') { g.set(x, y, WHITE); g.set(x + 1, y, WHITE); }
  }
  H.davehouse = { w: 44, h: 40, door: [0, -2], win: [[-12, -13], [12, -13], [0, -28]], draw(g, th) {
    g.dither = false;
    const SD = ['#fff6d8', '#f2dca0', '#c8a868'], RF = ['#8c96b8', '#5e6888', '#3e4462'], BR = ['#e07a6a', '#b8473a', '#7a2a2a'], TR = '#ffffff';
    piece(g, t => t.rect(31, 5, 4, 9, BR[1]));
    each(g, (x, y, c) => { if (c === BR[1] && y % 2 === 0 && (x + (y >> 1)) % 2) g.set(x, y, BR[2]); });
    piece(g, t => t.rect(5, 17, 34, 23, SD[1]));
    each(g, (x, y, c) => { if (c !== SD[1]) return; if (y % 3 === 0) g.set(x, y, SD[2]); else if (x <= 6) g.set(x, y, SD[0]); else if (x >= 37) g.set(x, y, mixHex(SD[1], SD[2], 0.5)); });
    piece(g, t => t.poly([[1.4, 19], [22, 3.6], [42.6, 19]], RF[1]));
    each(g, (x, y, c) => { if (c !== RF[1]) return; if (y % 3 === 1) g.set(x, y, RF[2]); else if ((x + (y % 6 < 3 ? 0 : 2)) % 4 === 0) g.set(x, y, RF[2]); else if (x < 22 - (y - 3.6) * 0.3) g.set(x, y, mixHex(RF[1], RF[0], 0.5)); });
    each(g, (x, y, c) => { if (c && c !== INK && y >= 18 && y <= 18 && g.get(x, y + 1) === INK) g.set(x, y, RF[2]); });
    // attic window
    piece(g, t => t.ell(22, 12.4, 2.6, 2.6, glass(th)[1]));
    g.px([[22, 10], [22, 11], [22, 12], [22, 13], [22, 14], [20, 12], [21, 12], [23, 12], [24, 12]].filter(([x, y]) => g.get(x, y) === glass(th)[1]), TR);
    // side windows with green shutters and flower boxes
    for (const x0 of [7, 31]) {
      win(g, x0, 23, 6, 7, th);
      piece(g, t => { t.rect(x0 - 2, 23, 1, 7, '#3e8948'); t.rect(x0 + 7, 23, 1, 7, '#3e8948'); });
      piece(g, t => t.rect(x0 - 1, 31, 8, 2, '#a8653a'));
      g.px([[x0, 30], [x0 + 2, 30], [x0 + 4, 30], [x0 + 6, 30]].filter(([x, y]) => !g.get(x, y) || g.get(x, y) === INK), '#f07aa0');
      g.px([[x0 + 1, 30], [x0 + 5, 30]].filter(([x, y]) => !g.get(x, y) || g.get(x, y) === INK), '#6abe30');
    }
    // porch roof on two columns, a step and the front door
    piece(g, t => { t.rect(16, 27, 1, 11, TR); t.rect(27, 27, 1, 11, TR); });
    piece(g, t => t.poly([[13, 27.4], [15, 23.4], [29, 23.4], [31, 27.4]], RF[1]));
    each(g, (x, y, c) => { if (c === RF[1] && y === 26) g.set(x, y, RF[2]); if (c === RF[1] && y === 24) g.set(x, y, mixHex(RF[1], RF[0], 0.5)); });
    piece(g, t => t.rect(19, 28, 6, 10, '#c0443a'));
    each(g, (x, y, c) => { if (c !== '#c0443a') return; if (x === 19) g.set(x, y, '#e0605a'); else if (x === 24) g.set(x, y, '#8a2a2a'); });
    g.px([[20, 30], [21, 30], [22, 30], [23, 30], [20, 31], [23, 31]], glass(th)[1]); g.px([[21, 31], [22, 31]], glass(th)[0]);
    g.px([[23, 34]], '#fbf236'); g.px([[21, 34], [22, 34], [21, 35], [22, 35]], '#8a2a2a');
    piece(g, t => t.rect(13, 38, 18, 2, '#c8ccd8'));
    for (let x = 13; x < 31; x++) if (g.get(x, 38) === '#c8ccd8') g.set(x, 38, '#e8ecf4');
    const L = leafOf(th);
    piece(g, t => { t.ell(5, 37.4, 4.6, 3, L); t.ell(39, 37.4, 4.6, 3, L); });
    foliage(g, L, 0.18, 3);
    g.px([[4, 36], [39, 36], [6, 37]].filter(([x, y]) => g.filled(x, y)), th === 'night' ? '#c9a2f0' : '#f7b6c8');
  } };
  H.shed = { w: 34, h: 34, door: [0, 0], win: [[0, -23], [-10, -13]], draw(g, th) {
    g.dither = false;
    const WD = ['#ecc08a', '#c8904a', '#8f563b'], RF = ['#c86a5a', '#9a4038', '#6a2a28'], DR = ['#9cd06a', '#5a9a3e', '#36683a'];
    piece(g, t => t.rect(4, 14, 26, 20, WD[1]));
    each(g, (x, y, c) => { if (c !== WD[1]) return; if ((x - 4) % 4 === 3) g.set(x, y, WD[2]); else if (x <= 5) g.set(x, y, WD[0]); else if (x >= 27) g.set(x, y, mixHex(WD[1], WD[2], 0.5)); });
    piece(g, t => t.poly([[1, 16], [17, 3.6], [33, 16]], RF[1]));
    each(g, (x, y, c) => { if (c !== RF[1]) return; if (y % 3 === 0) g.set(x, y, RF[2]); else if (x < 17 - (y - 3.6) * 0.4) g.set(x, y, RF[0]); });
    win(g, 15, 8, 5, 5, th, '#8f563b');
    win(g, 5, 18, 5, 5, th, '#8f563b');
    piece(g, t => t.rect(4, 24, 7, 2, '#8f563b'));
    g.px([[5, 23], [7, 23], [9, 23]].filter(([x, y]) => !g.get(x, y) || g.get(x, y) === INK), th === 'night' ? '#c9a2f0' : '#f7b6c8'); g.px([[6, 23], [8, 23]].filter(([x, y]) => !g.get(x, y) || g.get(x, y) === INK), '#6abe30');
    // green double door with X braces
    piece(g, t => t.rect(12, 19, 11, 15, DR[1]));
    for (let y = 19; y < 34; y++) { if (g.get(17, y) === DR[1]) g.set(17, y, INK); }
    for (const x0 of [12, 18]) for (let i = 0; i < 15; i++) { const y = 19 + i, a = x0 + Math.round(i * 4 / 14), b = x0 + 4 - Math.round(i * 4 / 14); for (const x of [a, b]) if (g.get(x, y) === DR[1]) g.set(x, y, DR[0]); }
    for (let x = 12; x < 23; x++) for (const y of [19, 33]) if (g.get(x, y) === DR[1] || g.get(x, y) === DR[0]) g.set(x, y, DR[2]);
    g.px([[16, 26], [18, 26]], '#fbf236');
    // a shovel leaning on the wall
    piece(g, t => { t.rect(28, 20, 1, 9, '#a8653a'); t.rect(27, 19, 3, 1, '#a8653a'); });
    piece(g, t => t.poly([[26.6, 28.6], [30.4, 28.6], [30, 32.6], [28.5, 33.4], [27, 32.6]], '#a8b4c8'));
    g.px([[27, 29], [27, 30]].filter(([x, y]) => g.filled(x, y)), '#eef2fa');
    tufts(g, [[2, 33], [3, 33], [31, 33], [32, 33], [3, 32], [24, 33], [11, 33]], th);
  } };
  H.crypt = { w: 38, h: 32, door: [0, -5], win: [[0, -23]], draw(g, th) {
    g.dither = false;
    const S = th === 'night' ? ['#c4c8e0', '#9094b4', '#5e6282'] : ['#dfe2e8', '#a8adb8', '#6e7484'], DK = '#2c2448';
    piece(g, t => t.rect(2, 29, 34, 3, S[2]));
    piece(g, t => t.rect(4, 27, 30, 2, S[1]));
    piece(g, t => t.rect(5, 12, 28, 15, S[1]));
    each(g, (x, y, c) => { if (c !== S[1] || y > 26) return; if ((y - 12) % 4 === 3) g.set(x, y, S[2]); else if ((x + ((y - 12) >> 2) * 3) % 7 === 0) g.set(x, y, S[2]); });
    piece(g, t => t.poly([[2.6, 13.4], [19, 3.6], [35.4, 13.4]], S[1]));
    piece(g, t => t.rect(3, 12, 32, 2, S[0]));
    each(g, (x, y, c) => { if (c === S[1] && y < 12 && x < 19 - (y - 3.6) * 0.5) g.set(x, y, S[0]); });
    // round window with a moon glow
    piece(g, t => t.ell(19, 8.6, 2.4, 2.4, th === 'night' ? '#c9a2f0' : '#8a7ad0'));
    g.px([[18, 8], [18, 9], [19, 7]].filter(([x, y]) => g.filled(x, y)), th === 'night' ? '#fff27a' : '#e4d0ff');
    // columns
    for (const x0 of [7, 28]) { piece(g, t => { t.rect(x0, 15, 3, 12, S[0]); t.rect(x0 - 1, 14, 5, 1, S[0]); t.rect(x0 - 1, 26, 5, 1, S[0]); }); for (let y = 15; y < 26; y++) if (g.filled(x0 + 2, y)) g.set(x0 + 2, y, S[1]); }
    // arched door
    piece(g, t => { t.rect(15, 18, 8, 9, '#5e3a6e'); t.ell(19, 18.4, 4, 3.6, '#5e3a6e', 0, (x, y) => y <= 18.5); });
    for (let y = 14; y < 27; y++) { if (g.get(19, y) === '#5e3a6e') g.set(19, y, DK); if (g.get(15, y) === '#5e3a6e') g.set(15, y, '#7a4e8e'); }
    g.px([[17, 22], [21, 22]], '#f6c83a');
    // moss, cracks and little flowers
    const L = leafOf(th);
    fil(g, [[5, 26], [6, 26], [6, 25], [32, 26], [31, 26], [3, 13], [4, 13]], L[1]);
    fil(g, [[12, 16], [13, 17], [13, 18], [25, 21], [26, 22]], S[2]);
    emp(g, [[1, 31], [36, 31], [0, 31], [37, 31]], L[1]);
    g.px([[1, 30], [36, 30]].filter(([x, y]) => !g.get(x, y)), th === 'night' ? '#c9a2f0' : '#f7b6c8');
    if (th === 'night') { emp(g, [[2, 2], [35, 4]], '#c9a2f0'); g.px([[16, 20], [18, 20]].filter(([x, y]) => g.get(x, y) === '#5e3a6e'), '#ffe24a'); }
  } };
  H.pirateshack = { w: 34, h: 36, door: [0, -4], win: [[8, -14]], draw(g, th) {
    g.dither = false;
    const WD = ['#c89a6a', '#9a6a3e', '#6a4426'], ST = ['#fbe8a8', '#dcb85a', '#a8823a'];
    piece(g, t => { t.rect(5, 33, 2, 3, WD[2]); t.rect(27, 33, 2, 3, WD[2]); });
    piece(g, t => t.rect(2, 32, 30, 2, WD[1]));
    for (let x = 2; x < 32; x++) { if (g.get(x, 32) === WD[1]) g.set(x, 32, WD[0]); if (g.get(x, 33) === WD[1] && x % 5 === 0) g.set(x, 33, WD[2]); }
    piece(g, t => t.rect(5, 15, 24, 17, WD[1]));
    each(g, (x, y, c) => { if (c !== WD[1] || y < 15 || y > 31) return; if ((y - 15) % 3 === 2) g.set(x, y, WD[2]); else if ((x * 7 + y * 3) % 17 === 0) g.set(x, y, '#b0845a'); });
    // thatched roof with a ragged fringe
    piece(g, t => { t.poly([[0.6, 17.4], [17, 3], [33.4, 17.4]], ST[1]); for (let x = 1; x < 33; x += 2) t.rect(x, 17, 1, 1 + ((x * 5) % 3 === 0 ? 1 : 0), ST[1]); });
    each(g, (x, y, c) => { if (c !== ST[1]) return; if ((x + y * 2) % 5 === 0) g.set(x, y, ST[2]); else if (x < 17 - (y - 3) * 0.6 && (x + y) % 3 === 0) g.set(x, y, ST[0]); });
    piece(g, t => t.rect(16, 0, 1, 4, '#6a4426'));
    piece(g, t => t.poly([[17, 0.6], [21.4, 1.6], [17, 2.8]], '#e0303e'));
    // plank door
    piece(g, t => t.rect(14, 20, 7, 12, '#5a3a22'));
    each(g, (x, y, c) => { if (c === '#5a3a22' && (x === 16 || x === 18)) g.set(x, y, '#46301c'); });
    g.px([[19, 26]], '#f6c83a');
    // porthole window
    piece(g, t => t.ell(25.5, 21.5, 2.6, 2.6, '#c8901c'));
    g.ell(25.5, 21.5, 1.6, 1.6, glass(th)[1], 0, (x, y) => g.filled(x, y));
    g.px([[24, 20], [25, 20]].filter(([x, y]) => g.get(x, y) === glass(th)[1]), glass(th)[0]);
    // ship wheel decoration: rim, eight spokes with handles, a gold hub (the gaps fill with ink, like a real wheel's shadows)
    piece(g, t => {
      const cx = 9, cy = 22;
      each(t, (x, y) => { const r = Math.hypot(x - cx, y - cy); if (r >= 2.2 && r <= 3.3) t.set(x, y, '#b07a40'); });
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) for (let r = -4; r <= 4; r++) { const k = Math.abs(dx) + Math.abs(dy) === 2 ? 0.75 : 1, x = cx + Math.round(dx * r * k), y = cy + Math.round(dy * r * k); t.set(x, y, Math.abs(r) === 4 ? '#e0b070' : '#8f563b'); }
      t.set(cx, cy, '#f6c83a');
    });
    emp(g, [[0, 35], [1, 35], [32, 35], [33, 35]], '#e2c47e');
  } };
  H.tomb = { w: 40, h: 32, door: [0, 0], win: [[-12, -20], [12, -20]], draw(g, th) {
    g.dither = false;
    const S = th === 'night' ? ['#d8c8a4', '#a89878', '#76684e'] : ['#fbe8b8', '#e0c080', '#a8844a'], GD = ['#fffbd0', '#f6c83a', '#b87818'], BL = ['#6a9af0', '#3f55b8', '#24306e'];
    piece(g, t => t.poly([[2, 31.6], [5, 6], [35, 6], [38, 31.6]], S[1]));
    each(g, (x, y, c) => { if (c !== S[1]) return; if ((y - 6) % 4 === 3) g.set(x, y, S[2]); else if (x <= 5 + (31 - y) * 0.1) g.set(x, y, S[0]); else if (x >= 33) g.set(x, y, mixHex(S[1], S[2], 0.5)); });
    piece(g, t => t.rect(3, 2, 34, 4, S[0]));
    for (let x = 3; x < 37; x++) { if (g.filled(x, 4)) g.set(x, 4, x % 4 < 2 ? BL[1] : GD[1]); if (g.filled(x, 5)) g.set(x, 5, S[2]); }
    // winged sun disc above the door
    piece(g, t => { t.ell(20, 9.6, 2, 2, ['#ff9a7a', '#e0303e', '#901c30']); t.poly([[17.6, 9], [9.6, 8.4], [12, 10.6], [17.6, 10.6]], BL[1]); t.poly([[22.4, 9], [30.4, 8.4], [28, 10.6], [22.4, 10.6]], BL[1]); });
    g.px([[12, 9], [14, 9], [16, 9], [24, 9], [26, 9], [28, 9]].filter(([x, y]) => g.filled(x, y)), GD[1]);
    // columns with lotus capitals
    for (const x0 of [8, 28]) {
      piece(g, t => { t.rect(x0, 15, 4, 17, S[0]); t.ell(x0 + 2, 14, 3, 1.8, LEAFG); });
      for (let y = 15; y < 32; y++) { if (g.filled(x0 + 3, y)) g.set(x0 + 3, y, S[1]); if (y % 5 === 0) for (let x = x0; x < x0 + 4; x++) if (g.filled(x, y)) g.set(x, y, BL[1]); }
    }
    // dark doorway with a gold lintel
    piece(g, t => t.rect(15, 15, 10, 17, '#2a1c24'));
    for (let y = 15; y < 32; y++) for (let x = 15; x < 25; x++) if (g.get(x, y) === '#2a1c24' && y > 26 && (x + y) % 2) g.set(x, y, '#3a2a30');
    piece(g, t => t.rect(14, 13, 12, 2, GD[1]));
    for (let x = 14; x < 26; x++) if (g.get(x, 13) === GD[1]) g.set(x, 13, GD[0]);
    // two small lit slit windows high on the pylon
    for (const cx of [8, 32]) { piece(g, t => t.rect(cx - 1, 10, 2, 3, th === 'night' ? '#fff27a' : '#3a2a30')); }
    // hieroglyph dots
    g.px([[6, 18], [6, 20], [5, 23], [6, 25], [34, 18], [34, 21], [33, 24], [34, 27]].filter(([x, y]) => g.filled(x, y)), '#8a6a3a');
    emp(g, [[0, 31], [1, 31], [39, 31], [38, 31]], '#e2c47e');
  } };

  // =====================================================================================================
  // registration + cached canvas builders
  // =====================================================================================================
  PX.ELEMENT_SPRITE = SPR;
  PX.ELEMENT_ICON = ELEMENT_ICON;
  PX.ELEMENT_CORE = ELEMENT_CORE;
  PX.ELEMENT_SHARD = ELEMENT_SHARD;
  PX.FUSION_ICON = FUS;
  PX.PVZ_PROP = P;
  PX.PVZ_HOME = H;
  const cache = new Map();
  const build = (key, w, h, fn) => {
    let c = cache.get(key);
    if (!c) { const g = new Grid(w, h); try { fn(g); } catch (e) { console.error('PX.worldArt', key, e); } c = g.canvas(); cache.set(key, c); }
    return c;
  };
  PX.worldArt = {
    sprite: (el, f) => build('s:' + el + ':' + (f | 0), 18, 18, g => (SPR[el] || SPR.normal)(g, f | 0)),
    icon: el => build('i:' + el, 7, 7, g => (ELEMENT_ICON[el] || ELEMENT_ICON.normal)(g)),
    core: el => build('c:' + el, 13, 13, g => ELEMENT_CORE(g, el)),
    shard: el => build('h:' + el, 9, 9, g => ELEMENT_SHARD(g, el)),
    fusion: id => build('f:' + id, 16, 16, g => (FUS[id] || FUS.crown)(g)),
    prop: (kind, th) => { const D = P[kind]; return D ? build('p:' + kind + ':' + (th || 'day'), D.w, D.h, g => D.draw(g, th || 'day')) : null; },
    home: (kind, th) => { const D = H[kind]; return D ? build('o:' + kind + ':' + (th || 'day'), D.w, D.h, g => D.draw(g, th || 'day')) : null; },
    ELEMENTS: Object.keys(SPR), ICONS: Object.keys(ELEMENT_ICON), FUSIONS: Object.keys(FUS), PROPS: Object.keys(P), HOMES: Object.keys(H),
  };
})();
