// art-world.js — PVZ Garden world art. Loaded after pixel.js and art-core.js.
// Style: TRUE chibi stickers (docs/pvz-art-guide.md, docs/chibi-reference.js): round chunky shapes built from 2-3 overlapping
// ellipses / polys, flat pastel fills with ONE soft shade crescent (lower right) and a small highlight, a thin piece outline
// plus a bold outer ring (g.outerLine()), big glossy chibi eyes (PX.art.chibiEyes) and blush on anything with a face.
//   PX.ELEMENT_SPRITE[el](g, f)   catchable element creatures, Grid(18, 18), facing right, frame 0 rest / 1 bob / 2 blink or squish
//   PX.ELEMENT_ICON[el](g)        7x7 type icons (the 11 elements + plant)
//   PX.ELEMENT_CORE(g, el)        13x13 glowing element orb with the element's symbol
//   PX.ELEMENT_SHARD(g, el)       9x9 crystal shard in the element colour
//   PX.FUSION_ICON[id](g)         16x16 fusion item icons
//   PX.PVZ_PROP[kind]             { w, h, draw(g, theme) } garden props, anchor bottom-centre; theme 'day' | 'night' | 'desert' | 'sea'
//                                 (new: flowerpot, flowerpot_gold, flowerpot_bloom, zgrave; sizes and plant spot in section 5)
//   PX.PVZ_HOME[kind]             { w, h, door: [dx, dy], win: [[dx, dy], ...], draw(g, theme) } rest houses; door/win offsets
//                                 are from the bottom-centre anchor (floor(w / 2), h), like PX.HOMES
//   PX.crazyDave(frame)           24 x 34 Crazy Dave (frame 0 / 1 wave), anchor bottom-centre (12, 34); see section 7
//   PX.worldArt                   cached canvas builders for all of the above (sprite, icon, core, shard, fusion, prop, home)
(function () {
  'use strict';
  if (!window.PX || !PX.Grid) return;
  const { Grid, INK, stroke, starPts } = PX;
  const mixHex = (PX.art && PX.art.mixHex) || PX.mixHex || (a => a);
  const WHITE = '#ffffff';

  // ---------------- helpers ----------------
  const piece = (G, draw) => { const t = new Grid(G.w, G.h); t.dither = G.dither; draw(t); t.outline(); G.merge(t); return G; };
  const each = (g, fn) => { for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) fn(x, y, g.get(x, y)); };
  // a water-drop silhouette: round bottom with straight sides tangent to it, tip `tipH` above the top
  function drop(t, cx, cy, rx, ry, tipH, lean, col) {
    const D = ry + tipH, c = Math.min(0.95, ry / D), s = Math.sqrt(1 - c * c);
    t.ell(cx, cy, rx, ry, col);
    if (tipH > 0) t.poly([[cx + lean, cy - D], [cx + rx * s + 0.05, cy - ry * c], [cx, cy + 0.5], [cx - rx * s - 0.05, cy - ry * c]], col);
  }

  // ---------------- chibi kit (see docs/chibi-reference.js) ----------------
  // Flat pastel fills with ONE soft shade crescent on the lower right and a small highlight up-left; 1-fine-pixel piece
  // outlines plus a bold outer ring (g.outerLine()); big glossy chibi eyes and blush on anything with a face.
  const AR = PX.art || {};
  const flat = R => [R[1], R[1], R[2]];
  const IN = g => { const m = (x, y) => g.filled(x, y); m.fine = true; return m; };
  // softShade: the chibi crescent shade for ANY silhouette already drawn on t (softBody does it for ellipses): every filled
  // pixel outside the ellipse (cx, cy, rx, ry) nudged up-left becomes R[2]; o.only = recolour just that colour; o.hl = highlight
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
  // a rounded rectangle (corner radius r)
  function rrect(t, x0, y0, x1, y1, r, col) {
    const pts = [], arc = (cx, cy, a0) => { for (let i = 0; i <= 6; i++) { const a = a0 + i * Math.PI / 12; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
    arc(x1 - r, y0 + r, -Math.PI / 2); arc(x1 - r, y1 - r, 0); arc(x0 + r, y1 - r, Math.PI / 2); arc(x0 + r, y0 + r, Math.PI);
    return t.poly(pts, col);
  }
  // a little chibi face: big glossy eyes (blink on frame 2 unless o.mood), blush, a tiny mouth. s = the body's radius.
  function cface(g, cx, cy, s, f, o) {
    o = o || {};
    const mood = o.mood !== undefined ? o.mood : f === 2 ? 'blink' : undefined;
    if (AR.chibiEyes) AR.chibiEyes(g, cx, cy, { sp: o.sp || s * 0.86, w: o.w || Math.max(2, s * 0.48), h: o.h || Math.max(2.6, s * 0.64), mood, col: o.col, white: o.white, look: o.look, one: o.one });
    if (o.blush !== false && AR.blush) AR.blush(g, cx + (o.bx || 0), cy + (o.by || s * 0.42), { sp: o.bsp || s * 1.04, w: o.bw || 1.0, h: 0.6, col: o.blushCol });
    if (o.mouth !== null && AR.chibiMouth) AR.chibiMouth(g, cx + (o.mx || 0.1), cy + (o.my || s * 0.5), o.mouth || 'smile', o.mw || 1.5);
  }
  // a 4-point twinkle in fine pixels on empty space (drawn after the outer line so it floats free)
  function twinkleF(g, x, y, c, big) {
    const put = (a, b, col) => { const fx = Math.floor((x + a) * g.k), fy = Math.floor((y + b) * g.k); if (!g.fget(fx, fy)) g.fset(fx, fy, col); };
    put(0, 0, '#ffffff'); for (const [a, b] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) put(a, b, c);
    if (big) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(a, b, c);
  }
  const fdot = (g, x, y, c) => { const fx = Math.floor(x * g.k), fy = Math.floor(y * g.k); if (!g.fget(fx, fy)) g.fset(fx, fy, c); };
  // pastel creature colours [light, mid, shade]
  const CP = {
    fire: ['#fff3cc', '#ffb88c', '#f4937a'], fireCore: '#ffe7a6',
    water: ['#f2fcff', '#a8e2f8', '#80c2ea'],
    ice: ['#ffffff', '#dcf5fd', '#afdcf0'],
    electric: ['#fffde6', '#ffe88a', '#f5c766'],
    laser: ['#fff0f4', '#ffb0c2', '#ef88a2'],
    poison: ['#fbeaff', '#e2adf2', '#c58bdb'], ooze: '#c8f08c',
    magic: ['#fff6fc', '#ffc8e8', '#f59fcf'],
    dark: ['#dcdcfa', '#a9aee6', '#878dcc'],
    rock: ['#f7f3ec', '#dbd3c6', '#b7ad9f'],
    robot: ['#f6f9ff', '#d4ddef', '#abb8d2'],
    normal: ['#ffffff', '#fbf4e6', '#e6d8bc'],
  };

  // =====================================================================================================
  // 1) Element creatures (18x18, facing right; f 0 rest, 1 bob / sway, 2 blink / squish). Round chibi blobs with big eyes.
  // =====================================================================================================
  const SPR = {};
  // Fire: a round peach flame-blob with three soft flame tips licking backward and a warm butter glow on its tummy
  SPR.fire = function (g, f) {
    const R = CP.fire, up = f === 1 ? -1 : 0, sw = f === 1 ? 0.8 : 0, cx = 9, cy = 11.3 + up, r = 5.1;
    piece(g, t => {
      drop(t, cx - 0.6, cy - 0.8, 4.3, 4.1, 5.4, -1.8 + sw, R[1]);
      drop(t, cx - 4.1, cy + 0.2, 1.9, 1.9, 3.2, -1.6 + sw, R[1]);
      drop(t, cx + 3.5, cy - 0.6, 1.8, 1.8, 2.4, -0.6 + sw * 0.6, R[1]);
      t.ell(cx, cy, r, r * 0.98, R[1]);
      softShade(t, cx, cy - 1.6, r + 0.5, r + 2.6, R);
    });
    g.ell(cx + 0.7, cy + 1.6, 3.3, 2.5, CP.fireCore, 0, IN(g));
    cface(g, cx + 0.9, cy + 0.5, r, f, { blushCol: '#ff9c8e' });
    g.outerLine();
    for (const [x, y, c] of f === 1 ? [[2.4, 4.2, '#ffb88c'], [15.6, 3.4, '#ffd08a'], [16, 9, '#ffb88c']] : [[1.8, 6, '#ffb88c'], [15.2, 2.8, '#ffd08a'], [16.4, 10.4, '#ffb88c']]) { fdot(g, x, y, c); fdot(g, x + 0.5, y, c); fdot(g, x, y + 0.5, c); fdot(g, x + 0.5, y + 0.5, '#fff3cc'); }
  };
  // Water: a glassy baby-blue droplet that squishes flat and grins when it lands
  SPR.water = function (g, f) {
    const R = CP.water, sq = f === 2, up = f === 1 ? -1 : 0;
    const cx = 9, rx = sq ? 6.1 : 5.3, ry = sq ? 4.3 : 5.1, cy = 16.3 - ry + up;
    piece(g, t => { drop(t, cx, cy, rx, ry, sq ? 3.4 : 5.2, f === 1 ? -1.3 : -0.5, R[1]); softShade(t, cx, cy - 1.6, rx + 0.4, ry + 2.6, R, { hl: false }); });
    g.ell(cx - rx * 0.56, cy - ry * 0.42, 0.75, 1.5, '#ffffff', 0.45, IN(g));
    g.dot(cx - rx * 0.3, cy - ry * 0.95, '#ffffff');
    cface(g, cx + 0.9, cy + 0.6, Math.min(rx, ry + 0.3), f, { mood: sq ? 'happy' : f === 2 ? 'blink' : undefined, mouth: sq ? 'open' : 'smile' });
    g.outerLine();
    for (const [x, y] of f === 1 ? [[2.4, 11], [15.8, 8]] : sq ? [[1.4, 14.6], [16.4, 14.6]] : [[2.2, 12.6], [15.8, 10.4]]) { fdot(g, x, y, '#a8e2f8'); fdot(g, x, y + 0.5, '#a8e2f8'); fdot(g, x + 0.5, y + 0.5, '#80c2ea'); fdot(g, x + 0.5, y, '#ffffff'); }
  };
  // Ice: a chubby rounded ice cube with a snow cap and a frosty shine
  SPR.ice = function (g, f) {
    const R = CP.ice, up = f === 1 ? -1 : 0, x0 = 3.6, x1 = 14.6, y0 = 5.6 + up, y1 = 16.4 + up;
    piece(g, t => { rrect(t, x0, y0, x1, y1, 2.8, R[1]); softShade(t, 9.1, 11 + up, 6.4, 6.2, R, { hl: false }); });
    piece(g, t => { t.ell(8.6, y0 + 0.4, 3.4, 1.5, '#ffffff'); t.ell(6, y0 + 0.9, 1.7, 1.2, '#ffffff'); t.ell(11.3, y0 + 0.8, 1.6, 1.1, '#ffffff'); t.ell(12.4, y0 + 1.9, 0.6, 0.9, '#ffffff'); });
    PX.stroke(g, [[x0 + 1.4, y0 + 3.6], [x0 + 1.4, y0 + 5.6]], 0.36, 0.36, '#ffffff');
    g.dot(x0 + 1.25, y0 + 2.6, '#ffffff');
    cface(g, 10, 11.9 + up, 5.4, f, { blushCol: '#ffbfd0' });
    g.outerLine();
    if (f === 1) { twinkleF(g, 16.2, 3, '#bfe8fa', true); twinkleF(g, 1.6, 12.6, '#bfe8fa'); } else { twinkleF(g, 1.8, 3.6, '#bfe8fa', true); twinkleF(g, 16.4, 12, '#bfe8fa'); }
  };
  // Electric: a wide butter-yellow spark-bug: an oval body, a zigzag lightning tail, two little see-through wings, a bolt tuft
  SPR.electric = function (g, f) {
    const R = CP.electric, up = f === 1 ? -1 : 0, cx = 9.8, cy = 11.8 + up, fl = f === 1, WG = ['#ffffff', '#e8f6ff', '#c4e2f6'];
    piece(g, t => t.ell(cx - 3.9, cy - 4.4, 1.4, 2.5, flat(WG), fl ? -1.1 : -0.6)); piece(g, t => t.ell(cx - 0.9, cy - 5.5, 1.3, 2.3, flat(WG), fl ? -0.4 : 0.05));
    piece(g, t => t.poly([[cx - 4.2, cy - 1.2], [cx - 6.8, cy - 2.8 + up * 0.5], [cx - 6, cy - 0.4], [cx - 8.6, cy + 0.2 - up * 0.5], [cx - 6.2, cy + 1.2], [cx - 7.2, cy + 3.2], [cx - 3.8, cy + 1.6]], '#ffd866'));
    piece(g, t => { const y = cy - 4.4; t.poly([[cx + 1.4, y + 1.2], [cx + 3.3, y - 1.6], [cx + 2.5, y - 1.5], [cx + 4.1, y - 3.8], [cx + 1, y - 0.8], [cx + 1.9, y - 0.9], [cx + 0.4, y + 0.9]], '#ffd866'); });
    piece(g, t => soft(t, cx, cy, 5.8, 4.7, R));
    g.ell(cx - 0.4, cy + 2.4, 3.2, 1.4, '#fff6c8', 0, IN(g));
    cface(g, cx + 1, cy + 0.2, 5, f, { blushCol: '#ffa486', bw: 1.15 });
    g.outerLine();
    for (const [x, y] of f === 1 ? [[16.8, 6.4], [1.4, 15], [15.6, 16.4]] : [[16.8, 8], [1.6, 15.6], [15, 2.2]]) twinkleF(g, x, y, '#ffe060');
  };
  // Laser: a chubby pink gem with a bright table facet; frame 1 catches the light
  SPR.laser = function (g, f) {
    const R = CP.laser, up = f === 1 ? -1 : 0, cx = 9, top = 2.6 + up, m1 = 6.6 + up, m2 = 11.6 + up, bot = 16.6 + up;
    piece(g, t => {
      t.poly([[cx - 3.2, top], [cx + 3.2, top], [cx + 6.2, m1], [cx + 5.4, m2], [cx, bot], [cx - 5.4, m2], [cx - 6.2, m1]], R[1]);
      for (const [x, y] of [[cx - 3.2, top + 0.9], [cx + 3.2, top + 0.9], [cx + 5.5, m1], [cx - 5.5, m1]]) t.ell(x, y, 0.95, 0.95, R[1]);
      softShade(t, cx, 9.6 + up, 6.6, 7.6, R, { hl: false });
      t.poly([[cx - 2.9, top + 0.3], [cx + 2.9, top + 0.3], [cx + 4.4, m1 - 0.6], [cx - 4.4, m1 - 0.6]], f === 1 ? '#fff6f8' : R[0]);
    });
    PX.stroke(g, [[cx - 4.4, m1 - 0.4], [cx + 4.6, m1 - 0.4]], 0.22, 0.22, '#e6849c');
    g.dot(cx - 2.2, top + 1, '#ffffff'); g.dot(cx - 1.7, top + 1, '#ffffff'); g.dot(cx - 2.2, top + 1.5, '#ffffff');
    cface(g, cx + 0.9, 10.2 + up, 5.2, f, { blushCol: '#ff8fae' });
    g.outerLine();
    (f === 1 ? [[1.8, 2.6], [16.2, 5.6], [1.6, 14.6]] : [[2.2, 5], [16, 2.6], [16, 14]]).forEach(([x, y], i) => twinkleF(g, x, y, '#ffc0d0', !i));
  };
  // Poison: a wobbly lilac slime with a curly top, lime goo spots and a bubble floating off
  SPR.poison = function (g, f) {
    const R = CP.poison, sq = f === 2, up = f === 1 ? 1 : 0;
    const cx = 9, rx = sq ? 7.1 : 6.2, ry = sq ? 4.2 : 5.1, by = 16.6 - up, cy = by - ry;
    piece(g, t => {
      t.ell(cx, cy, rx, ry, R[1]); t.ell(cx, by - 1.2, rx + 0.4, 1.3, R[1]);
      drop(t, cx - 0.6, cy - ry + 1.6, 1.6, 1.4, sq ? 1.6 : 2.6, f === 1 ? -1.8 : -1.2, R[1]);
      t.ell(cx + rx - 0.9, by - 0.6, 0.8, 1.6, R[1]);
      softShade(t, cx, cy, rx + 0.4, ry + 1.4, R);
    });
    g.ell(cx - rx * 0.62, cy + 1.4, 1.0, 0.8, CP.ooze, 0, IN(g)); g.ell(cx - rx * 0.3, cy - ry * 0.55, 0.7, 0.6, CP.ooze, 0, IN(g));
    cface(g, cx + 0.9, cy + 0.9, Math.min(5.2, rx), f, { blushCol: '#f49ad8', mouth: sq ? 'open' : 'smile' });
    g.outerLine();
    const bub = (x, y, r) => { piece(g, t => t.ell(x, y, r, r, '#f4fbe8')); g.dot(x - r * 0.45, y - r * 0.45, '#ffffff'); };
    bub(15.4, f === 1 ? 2.4 : 3.4, 1.2); bub(2.6, f === 1 ? 4.6 : 5.6, 0.8);
  };
  // Magic: a squishy pink star with rounded tips and twinkles
  SPR.magic = function (g, f) {
    const R = CP.magic, up = f === 1 ? -1 : 0, cx = 9, cy = 10.4 + up, rot = -Math.PI / 2 + (f === 1 ? 0.16 : 0);
    piece(g, t => {
      t.poly(starPts(cx, cy, 6.6, 3.9, 5, rot), R[1]);
      for (let i = 0; i < 5; i++) { const a = rot + i * 2 * Math.PI / 5; t.ell(cx + Math.cos(a) * 6.1, cy + Math.sin(a) * 6.1, 1.45, 1.45, R[1]); }
      t.ell(cx, cy + 0.4, 4.4, 4.2, R[1]);
      softShade(t, cx, cy, 6.6, 6.8, R);
    });
    cface(g, cx + 0.7, cy + 1, 4.8, f, { blushCol: '#ff8cc2' });
    g.outerLine();
    if (f === 1) { twinkleF(g, 16.2, 2.2, '#ffe680', true); twinkleF(g, 1.6, 13.6, '#ffc8e8'); twinkleF(g, 2, 2.4, '#ffe680'); }
    else { twinkleF(g, 1.8, 2.2, '#ffe680', true); twinkleF(g, 16.2, 13.8, '#ffc8e8'); twinkleF(g, 16, 2.8, '#ffe680'); }
  };
  // Dark: a sleepy-cute periwinkle ghost with a curly tail and a tiny moon charm
  SPR.dark = function (g, f) {
    const R = CP.dark, up = f === 1 ? -1 : 0, s = f === 1 ? 0.8 : 0, cx = 9.8, cy = 8.4 + up, r = 5.4;
    piece(g, t => {
      t.ell(cx, cy, r, r * 0.98, R[1]);
      t.poly([[cx + r - 0.2, cy + 0.2], [cx + r - 0.6, cy + 3.6], [cx + 2.4, cy + 6.4], [cx - 1.6, cy + 7.4], [cx - 5.2, cy + 6.8 - s], [cx - 7.6, cy + 5 - s * 1.6], [cx - 6.4, cy + 3.8 - s], [cx - 4.6, cy + 3.6], [cx - r + 0.2, cy + 0.6]], R[1]);
      t.ell(cx - 7.2, cy + 4.3 - s * 1.6, 1.2, 1.1, R[1]);
      t.ell(cx + 4.6, cy + 3.6, 1.5, 1.2, R[1], -0.5);
      softShade(t, cx, cy + 1.4, r + 0.6, r + 2.2, R);
    });
    cface(g, cx + 0.8, cy + 1, r, f, { blushCol: '#f0a6d0' });
    g.outerLine();
    const mx = 2.6, my = f === 1 ? 2.6 : 3.4, M = new Grid(g.w, g.h); M.ell(mx, my, 1.7, 1.7, '#fff1a8'); M.ell(mx + 0.9, my - 0.6, 1.45, 1.45, null); M.outline();
    for (let i = 0; i < M.a.length; i++) if (M.a[i] && !g.a[i]) g.a[i] = M.a[i];
    twinkleF(g, f === 1 ? 16.4 : 16.8, f === 1 ? 2 : 3.2, '#d8c8ff', true); fdot(g, 16.2, 16.2, '#c8c0f0');
  };
  // Rock: a round grey pebble with a mossy cap and a tiny sprout; hops on frame 1, squishes on frame 2
  SPR.rock = function (g, f) {
    const R = CP.rock, hop = f === 1 ? 1.6 : 0, sq = f === 2;
    const cx = 9, rx = sq ? 7.1 : 6.3, ry = sq ? 4.3 : 5.0, cy = 16.4 - ry - hop;
    piece(g, t => soft(t, cx, cy, rx, ry, R));
    piece(g, t => { t.ell(cx - 1.4, cy - ry + 1.3, 3.4, 1.5, ['#d6f2b4', '#bfe69a', '#a2d27e'], -0.12, (x, y) => y <= cy - ry + 1.6 + (x - cx) * 0.1); });
    piece(g, t => { PX.stroke(t, [[cx - 1.2, cy - ry + 0.6], [cx - 0.8, cy - ry - 1.2]], 0.42, 0.42, '#8fcf6e'); t.ell(cx - 2.1, cy - ry - 1.6, 1.3, 0.7, '#a6dc80', 0.5); t.ell(cx + 0.4, cy - ry - 1.8, 1.3, 0.7, '#a6dc80', -0.5); });
    g.dots([[cx - 3.6, cy + 1.6], [cx + 3.2, cy + 2.4], [cx - 2.4, cy + 2.8]], R[2]);
    cface(g, cx + 0.9, cy + 0.7, Math.min(5, ry + 0.4), f, { mood: sq ? 'happy' : undefined, mouth: sq ? 'open' : 'smile' });
    g.outerLine();
    if (f === 1) { fdot(g, 3, 17, '#d8d0c4'); fdot(g, 3.5, 17, '#d8d0c4'); fdot(g, 14.5, 17, '#d8d0c4'); fdot(g, 15, 17, '#d8d0c4'); }
  };
  // Robot: a wide TV-box head with a screen face and cyan eyes, ear bolts, an antenna bulb that lights up, on a tiny round body
  SPR.robot = function (g, f) {
    const R = CP.robot, up = f === 1 ? -1 : 0, cx = 9, cy = 9.6 + up, lit = f === 1, S = '#55648e', BOLT = flat(['#fff', '#b8c4dc', '#97a4c0']);
    piece(g, t => soft(t, cx, 14.8 + up * 0.5, 3.6, 2.4, ['#eef3fb', '#bfcae0', '#9eabc6']));
    piece(g, t => PX.stroke(t, [[cx + 0.4, cy - 3.8], [cx + 1.2, cy - 6.4]], 0.42, 0.42, '#9aa6c0'));
    piece(g, t => t.ell(cx + 1.3, cy - 7, 1.4, 1.4, lit ? ['#ffffff', '#fff6a8', '#ffe070'] : ['#fff2c4', '#ffd47a', '#f2b45a']));
    piece(g, t => { t.ell(cx - 6, cy + 0.2, 1.2, 1.6, BOLT); t.ell(cx + 6, cy + 0.2, 1.2, 1.6, BOLT); });
    piece(g, t => { rrect(t, cx - 5.8, cy - 4.4, cx + 5.8, cy + 4.2, 2.9, R[1]); softShade(t, cx, cy, 6, 4.6, R); });
    piece(g, t => rrect(t, cx - 3.9, cy - 2.3, cx + 4.7, cy + 2.4, 1.6, S));
    cface(g, cx + 0.6, cy + 0.1, 4.4, f, { col: '#8ef4ff', blush: false, mouth: null, sp: 3.6, w: 1.8, h: 2.3 });
    g.dots([[cx + 0.1, cy + 1.7], [cx + 0.6, cy + 1.9], [cx + 1.1, cy + 1.7]], '#8ef4ff');
    g.dot(cx - 3.2, cy - 1.6, '#8a9ac0'); g.dot(cx - 2.7, cy - 1.6, '#8a9ac0');
    AR.blush && AR.blush(g, cx + 0.6, cy + 3.3, { sp: 9.4, w: 1, h: 0.55 });
    g.outerLine();
    if (lit) { twinkleF(g, cx + 3.6, cy - 7.8, '#fff27a'); twinkleF(g, cx - 1.4, cy - 7.4, '#fff27a'); }
  };
  // Normal: a fluffy cream cloud-puff
  SPR.normal = function (g, f) {
    const R = CP.normal, up = f === 1 ? -1 : 0, sq = f === 2 ? 1 : 0, cy = 10.8 + up + sq * 0.6;
    piece(g, t => {
      for (const [x, y, r] of [[9, cy + 0.8, 4.8], [4.6, cy + 1.6, 2.9], [6.4, cy - 2.4, 3], [10.6, cy - 3, 3.2], [13.8, cy - 0.4, 2.8], [13.6, cy + 2.6, 2.6], [5.6, cy + 3.4, 2.4], [9.8, cy + 3.6, 2.6]]) t.ell(x, y, r + sq * 0.35, r - sq * 0.3, R[1]);
      softShade(t, 9.2, cy + 0.4, 7.2, 6.6, R);
    });
    cface(g, 10, cy + 1, 5.2, f, {});
    g.outerLine();
  };

  // =====================================================================================================
  // 2) Type icons 7x7 and the symbols they share with the core orbs
  // =====================================================================================================
  // pastel type colours [light, mid, shade] (a touch stronger than the creatures so tiny icons read)
  const TC = {
    fire: ['#ffe2b0', '#ffa070', '#ec7c5e'], water: ['#e6f8ff', '#82d0f4', '#5aaee0'], ice: ['#ffffff', '#c6ecfb', '#92cdea'],
    electric: ['#fffbd8', '#ffd955', '#f0b440'], laser: ['#ffe8ee', '#ff8fa8', '#e66a88'], poison: ['#f6e2ff', '#cc90e8', '#a86ec8'],
    magic: ['#fff2fa', '#ffaad8', '#ec82bc'], dark: ['#dcdcfa', '#9196da', '#6f74be'], rock: ['#f4efe6', '#cbc2b4', '#a59a8a'],
    robot: ['#f4f7ff', '#c0cbe0', '#98a5c2'], normal: ['#ffffff', '#f3eada', '#d6c6a6'], plant: ['#e2f8c4', '#9edc78', '#72ba56'],
  };
  // SYMBOL[el](t, cx, cy, s, col): the element's symbol, about 5.4 * s art px across, centred on (cx, cy)
  const SYMBOL = {
    fire(t, x, y, s, c) { drop(t, x - 0.1 * s, y + 0.75 * s, 1.95 * s, 1.85 * s, 2.1 * s, -0.7 * s, c); drop(t, x + 1.45 * s, y + 0.9 * s, 0.95 * s, 0.95 * s, 1.2 * s, -0.1 * s, c); },
    water(t, x, y, s, c) { drop(t, x, y + 0.85 * s, 2.0 * s, 1.9 * s, 2.3 * s, 0, c); },
    ice(t, x, y, s, c) { t.poly(starPts(x, y, 2.8 * s, 1.35 * s, 6, -Math.PI / 2), c); t.ell(x, y, 1.5 * s, 1.5 * s, c); },
    electric(t, x, y, s, c) { t.poly([[0.7, -2.8], [-1.8, 0.4], [-0.2, 0.4], [-0.9, 2.8], [1.9, -0.6], [0.3, -0.6], [1.4, -2.8]].map(([a, b]) => [x + a * s, y + b * s]), c); },
    laser(t, x, y, s, c) { t.poly([[-1.5, -2.1], [1.5, -2.1], [2.7, -0.7], [0, 2.7], [-2.7, -0.7]].map(([a, b]) => [x + a * s, y + b * s]), c); },
    poison(t, x, y, s, c) { t.ell(x - 0.5 * s, y + 0.7 * s, 2.0 * s, 1.85 * s, c); t.ell(x + 1.55 * s, y - 1.45 * s, 0.95 * s, 0.95 * s, c); t.ell(x + 0.1 * s, y - 2.15 * s, 0.6 * s, 0.6 * s, c); },
    magic(t, x, y, s, c) { t.poly(starPts(x, y + 0.25 * s, 3.0 * s, 1.4 * s, 5), c); },
    dark(t, x, y, s, c) { t.ell(x, y, 2.6 * s, 2.6 * s, c); t.ell(x + 1.35 * s, y - 0.95 * s, 2.05 * s, 2.05 * s, null); },
    rock(t, x, y, s, c) { t.ell(x - 0.3 * s, y + 0.6 * s, 2.5 * s, 1.85 * s, c); t.ell(x + 0.9 * s, y - 0.5 * s, 1.5 * s, 1.35 * s, c); },
    robot(t, x, y, s, c) { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; t.ell(x + Math.cos(a) * 2.25 * s, y + Math.sin(a) * 2.25 * s, 0.62 * s, 0.62 * s, c); } t.ell(x, y, 2.15 * s, 2.15 * s, c); t.ell(x, y, 0.75 * s, 0.75 * s, null); },
    normal(t, x, y, s, c) { t.ell(x - 1.2 * s, y + 0.6 * s, 1.5 * s, 1.4 * s, c); t.ell(x + 1.2 * s, y + 0.6 * s, 1.5 * s, 1.4 * s, c); t.ell(x, y - 0.5 * s, 1.75 * s, 1.65 * s, c); },
    plant(t, x, y, s, c) { t.ell(x + 0.35 * s, y - 0.35 * s, 2.9 * s, 1.55 * s, c, -0.75); PX.stroke(t, [[x - 1.7 * s, y + 1.7 * s], [x - 2.5 * s, y + 2.6 * s]], 0.45 * s, 0.45 * s, c); },
  };
  const ELEMENT_ICON = {};
  for (const id of Object.keys(TC)) ELEMENT_ICON[id] = function (g) {
    const R = TC[id];
    piece(g, t => { SYMBOL[id](t, 3.5, 3.5, 0.92, R[1]); softShade(t, 3.5, 3.5, 2.7, 2.7, R); });
    g.outerLine();
  };

  // =====================================================================================================
  // 3) Element core orb (13x13) and shard (9x9)
  // =====================================================================================================
  const orbRamp = el => TC[el] || TC.normal;
  function ELEMENT_CORE(g, el) {
    const B = orbRamp(el), R = el === 'normal' || el === 'ice' || el === 'robot' || el === 'rock' ? [B[0], mixHex(B[1], B[2], 0.35), mixHex(B[2], INK, 0.12)] : B;
    piece(g, t => soft(t, 6.5, 6.5, 5.3, 5.3, R, { shade: 0.2, hl: false }));
    // the symbol in white over a soft shadow
    const sym = SYMBOL[el] || SYMBOL.normal, sh = new Grid(g.w, g.h), wt = new Grid(g.w, g.h);
    sym(sh, 7, 7.1, 0.98, mixHex(R[2], INK, 0.12)); sym(wt, 6.5, 6.6, 0.98, WHITE);
    for (let i = 0; i < g.a.length; i++) { if (sh.a[i] && g.a[i] && g.a[i] !== INK) g.a[i] = sh.a[i]; }
    for (let i = 0; i < g.a.length; i++) { if (wt.a[i] && g.a[i] && g.a[i] !== INK) g.a[i] = wt.a[i]; }
    g.ell(3.6, 3.4, 1.1, 0.7, WHITE, -0.7, IN(g));
    g.outerLine();
  }
  function ELEMENT_SHARD(g, el) {
    const R = orbRamp(el);
    piece(g, t => { t.poly([[2.2, 7.8], [1.6, 4.6], [4.4, 1.2], [7.2, 3.4], [6.6, 7.4], [4.6, 8.2]], R[1]); t.ell(4.4, 7.4, 2.4, 0.9, R[1]); });
    each(g, (x, y, c) => { if (!c || c === INK) return; const k = x + 0.5 - 4.4; if (k < -0.6) g.set(x, y, R[0]); else if (k > 1.0) g.set(x, y, R[2]); });
    g.dot(2.6, 4.6, WHITE); g.dot(3.1, 4.1, WHITE); g.dot(2.6, 5.1, WHITE);
    g.outerLine();
    fdot(g, 8.2, 0.8, mixHex(R[0], WHITE, 0.4));
  }

  // =====================================================================================================
  // 4) Fusion item icons (16x16): chunky toy-like costume pieces
  // =====================================================================================================
  const FUS = {};
  const GOLD = ['#fff6c8', '#ffd866', '#f0b44a'];
  FUS.army = function (g) { // a round olive helmet with a big brim and a gold star
    const O = ['#eef2c0', '#bcc77c', '#98a45c'];
    piece(g, t => t.ell(8.4, 12.6, 7.2, 1.7, flat(['#c8d28a', '#a8b46a', '#8a964e'])));
    piece(g, t => soft(t, 7.8, 11.6, 6.2, 7.6, O, { mask: (x, y) => y <= 11.8 }));
    piece(g, t => t.poly(starPts(7.4, 7.6, 2.5, 1.1, 5), GOLD[1]));
    g.dot(6.9, 7, WHITE);
    g.outerLine();
  };
  FUS.knight = function (g) { // a rounded steel helm with a visor slit and a fluffy pink plume
    const S = ['#ffffff', '#d6dde9', '#abb5ca'], PL = ['#ffe0e4', '#ff9aa6', '#ec7488'];
    piece(g, t => { t.ell(4.6, 4.2, 3.6, 2.4, PL[1], -0.5); t.ell(2.6, 6.4, 2.2, 1.9, PL[1], -1.1); softShade(t, 4, 4.6, 4, 3, PL); });
    piece(g, t => { rrect(t, 3.6, 4.4, 13.6, 14.8, 4.2, S[1]); softShade(t, 8.6, 9.6, 5.2, 5.4, S); });
    piece(g, t => rrect(t, 6.4, 8.6, 13.4, 10.4, 0.9, '#6c7896'));
    PX.stroke(g, [[9, 11.6], [9, 14]], 0.3, 0.3, S[2]); g.dots([[11, 12.4], [12, 12.4], [11, 13.4], [12, 13.4]], S[2]);
    g.outerLine();
  };
  FUS.pirate = function (g) { // a plum tricorn with gold trim and a tiny white skull
    const H = ['#a49cc0', '#7f78a2', '#635d86'];
    piece(g, t => { t.poly([[0.8, 12.2], [2.6, 7.4], [5.6, 4.8], [8, 4.2], [10.4, 4.8], [13.4, 7.4], [15.2, 12.2], [12.4, 10.8], [8, 10.2], [3.6, 10.8]], H[1]); softShade(t, 8, 8, 7.4, 4.6, H); });
    piece(g, t => t.poly([[0.8, 12.2], [3.6, 10.8], [8, 10.2], [12.4, 10.8], [15.2, 12.2], [12.4, 12.4], [8, 11.8], [3.6, 12.4]], GOLD[1]));
    piece(g, t => { t.ell(8, 7.4, 1.9, 1.7, '#ffffff'); t.ell(8, 9, 1.1, 0.7, '#ffffff'); });
    g.dots([[7.4, 7.4], [8.6, 7.4]], INK); g.dot(8, 8.2, INK);
    g.outerLine();
  };
  FUS.cowboy = function (g) { // a tan cowboy hat with a curled brim and a pink band
    const B = ['#fbe6c4', '#e6b884', '#c99666'];
    piece(g, t => { t.ell(8, 11.8, 7.2, 2.2, B[1]); t.ell(1.4, 10.2, 1.3, 1.9, B[1], -0.3); t.ell(14.6, 10.2, 1.3, 1.9, B[1], 0.3); softShade(t, 8, 11, 7.6, 2.6, B, { hl: false }); });
    piece(g, t => { t.poly([[4.2, 11], [4.4, 6.4], [5.6, 3.8], [8, 4.6], [10.4, 3.8], [11.6, 6.4], [11.8, 11]], B[1]); softShade(t, 8, 7.4, 4.2, 4.2, B); });
    for (let x = 4; x <= 12; x++) for (const y of [8.6, 9.6]) if (g.filled(x, y)) g.set(x, y, y < 9 ? '#ff9ab4' : '#ef7f9e');
    g.dots([[7.6, 9], [8.1, 9], [7.6, 9.5], [8.1, 9.5]], GOLD[1]);
    g.outerLine();
  };
  FUS.wizard = function (g) { // a lilac wizard hat with a floppy tip, a gold band and stars
    const P = ['#f0e4ff', '#bb9cee', '#9a7cd2'];
    piece(g, t => { t.poly([[3, 12.4], [13, 12.4], [10.8, 6], [12.2, 3.6], [14.8, 2.6], [11.6, 1.8], [9, 3.2], [6.6, 6.2]], P[1]); t.ell(14.4, 2.8, 1, 1, '#fff27a'); softShade(t, 8, 7.6, 5, 5.6, P); });
    piece(g, t => soft(t, 8, 13.1, 7.3, 1.9, ['#dcc8ff', '#a888e0', '#8a6cc4'], { hl: false }));
    for (let x = 4; x <= 12; x++) if (g.filled(x, 11.5)) g.set(x, 11.5, GOLD[1]);
    piece(g, t => t.poly(starPts(8.2, 8, 1.9, 0.85, 5), GOLD[1]));
    g.dots([[10.6, 5.2], [6, 10.2]], '#fff6c8');
    g.outerLine();
  };
  FUS.crown = function (g) { // a chunky gold crown with round tips and candy-coloured gems
    piece(g, t => { t.poly([[2, 13.4], [2, 5.6], [5.2, 9], [8, 3.6], [10.8, 9], [14, 5.6], [14, 13.4]], GOLD[1]); for (const [x, y] of [[2.2, 4.8], [8, 3], [13.8, 4.8]]) t.ell(x, y, 1.35, 1.35, GOLD[1]); softShade(t, 8, 9, 6.4, 5.4, GOLD); });
    piece(g, t => rrect(t, 1.8, 10.6, 14.2, 13.6, 0.8, '#f8c45a'));
    piece(g, t => { t.ell(5, 12.1, 1.1, 1.0, '#ff8fa8'); t.ell(8, 12.1, 1.1, 1.0, '#7fd0f4'); t.ell(11, 12.1, 1.1, 1.0, '#ff8fa8'); });
    g.dots([[4.7, 11.8], [7.7, 11.8], [10.7, 11.8], [1.8, 4.4], [7.6, 2.6], [13.4, 4.4]], WHITE);
    g.outerLine();
  };
  FUS.ninja = function (g) { // a periwinkle headband ring with a steel plate on the front and two ribbon tails at the back
    const C = ['#c4ccf2', '#8c98d2', '#6e7ab6'];
    piece(g, t => { PX.stroke(t, [[3.4, 8.6], [2, 10.6], [1.6, 13.6]], 1.0, 0.8, C[1]); PX.stroke(t, [[4.2, 9.4], [4.6, 12], [5.8, 14.2]], 0.95, 0.75, C[2]); });
    piece(g, t => { t.ell(8.6, 8.2, 6.6, 3.8, C[1]); t.ell(8.6, 7.0, 5.0, 2.0, null); softShade(t, 8.6, 8.2, 6.8, 4, C, { hl: false }); });
    piece(g, t => { rrect(t, 6.2, 8.4, 11.6, 12.4, 1.1, '#e4e9f2'); softShade(t, 8.9, 10.4, 2.9, 2.1, ['#ffffff', '#e4e9f2', '#bcc6d8']); });
    g.ell(8.9, 10.4, 1.1, 1.1, '#7884a8', 0, IN(g)); g.dot(8.7, 10.2, '#c8d0e4');
    piece(g, t => t.ell(3.4, 8.8, 1.7, 1.5, C[1]));
    g.outerLine();
  };
  FUS.space = function (g) { // a round glass space bubble with a white collar and a little antenna
    const GL = ['#ffffff', '#d6f2fc', '#aedcf0'];
    piece(g, t => t.ell(12.4, 1.6, 1, 1, '#ff8fa8')); piece(g, t => PX.stroke(t, [[12.2, 2.4], [11.4, 4.2]], 0.32, 0.32, '#a8b4c8'));
    piece(g, t => soft(t, 8, 7.4, 6.2, 5.9, GL, { hl: false }));
    g.ell(8.6, 8, 3.8, 3.4, '#c2e6f6', 0, IN(g));
    PX.stroke(g, [[4.6, 5.6], [5.6, 4.2], [7.2, 3.4]], 0.45, 0.45, WHITE); g.dot(4.4, 7, WHITE);
    piece(g, t => soft(t, 8, 13.4, 6.4, 2.1, ['#ffffff', '#e4e8f0', '#bcc4d4'], { hl: false }));
    g.dots([[5, 13.2], [5.5, 13.2]], '#ff8fa8'); g.dots([[10.5, 13.2], [11, 13.2]], '#7fd0f4');
    g.outerLine();
  };
  FUS.extrashooter = function (g) { // a spare pea-shooter head on a little grey mount
    const PG = ['#e4f8c4', '#a4de7c', '#80c260'], MT = ['#f4f7ff', '#c4cde0', '#a0abc4'];
    piece(g, t => { rrect(t, 3.4, 11.6, 10.6, 15, 1.2, MT[1]); softShade(t, 7, 13.3, 3.8, 1.9, MT, { hl: false }); });
    piece(g, t => t.ell(3.4, 3.6, 2.2, 1.2, flat(['#c4f0a0', '#8fd068', '#6fb04e']), -0.8));
    piece(g, t => { t.ell(11.6, 7.6, 2.8, 2.1, PG[1]); t.ell(12.2, 8.3, 2.5, 1.1, PG[2], 0, IN(t)); });
    piece(g, t => soft(t, 7, 7.4, 4.6, 4.2, PG));
    piece(g, t => { t.ell(14, 7.6, 1.3, 2.2, PG[0]); t.ell(14.2, 7.6, 0.75, 1.5, '#5e8a4a'); });
    AR.chibiEyes && AR.chibiEyes(g, 8.3, 8.1, { sp: 3.7, w: 2.1, h: 2.8 });
    AR.blush && AR.blush(g, 8, 9.4, { sp: 4.4, w: 0.8, h: 0.5 });
    g.outerLine();
  };
  FUS.catapult = function (g) { // a wooden toy catapult on a cart with donut wheels, a cabbage in the basket
    const W = ['#f6dcb6', '#e0b080', '#c28f62'];
    piece(g, t => PX.stroke(t, [[6, 12.4], [8, 8], [10, 12.4]], 0.6, 0.6, W[2]));
    piece(g, t => PX.stroke(t, [[13, 11], [8, 7.6], [4.2, 4.8]], 0.75, 0.6, W[1]));
    piece(g, t => t.ell(3.6, 4.4, 2.8, 1.6, W[1], 0, (x, y) => y >= 3.8));
    piece(g, t => soft(t, 3.6, 2.8, 1.9, 1.7, ['#e6fac8', '#a6de80', '#86c264'], { hl: false }));
    piece(g, t => { rrect(t, 1, 11.6, 15, 13.6, 0.8, W[1]); softShade(t, 8, 12.6, 7, 1.2, W, { hl: false }); });
    piece(g, t => { t.ell(4, 14, 1.8, 1.8, '#ff9ab4'); t.ell(12, 14, 1.8, 1.8, '#ff9ab4'); });
    g.ell(4, 14, 0.7, 0.7, '#fff0f4'); g.ell(12, 14, 0.7, 0.7, '#fff0f4');
    g.outerLine();
  };
  FUS.jetpack = function (g) { // two candy-pink rockets with white tanks and soft flames
    const T = ['#ffe0e6', '#ff9cae', '#ec788e'], MT = ['#ffffff', '#e2e6f0', '#bcc4d4'];
    piece(g, t => { drop(t, 4.5, 12.6, 1.5, 1.3, 0, 0, '#ffd27a'); t.poly([[3, 12], [6, 12], [4.5, 15.6]], '#ffd27a'); t.poly([[10, 12], [13, 12], [11.5, 15.6]], '#ffd27a'); });
    g.ell(4.5, 13, 0.7, 1.2, '#fff6c8', 0, IN(g)); g.ell(11.5, 13, 0.7, 1.2, '#fff6c8', 0, IN(g));
    piece(g, t => { rrect(t, 6.2, 5, 9.8, 11, 0.8, MT[1]); softShade(t, 8, 8, 2, 3, MT, { hl: false }); });
    piece(g, t => { rrect(t, 2, 3, 7, 12.2, 2.4, T[1]); softShade(t, 4.5, 7.6, 2.6, 4.6, T); });
    piece(g, t => { rrect(t, 9, 3, 14, 12.2, 2.4, T[1]); softShade(t, 11.5, 7.6, 2.6, 4.6, T); });
    for (const x of [2, 9]) for (let i = 0; i < 5; i++) if (g.filled(x + i, 9)) g.set(x + i, 9, MT[1]);
    g.outerLine();
  };
  FUS.halloween = function (g) { // a round jack-o'-lantern with a happy carved face, a stem and a curly leaf
    const P = ['#ffe2b8', '#ffb070', '#ef9058'];
    piece(g, t => PX.stroke(t, [[8, 4.8], [8.4, 2.6], [9.6, 1.6]], 0.85, 0.7, '#b6926a'));
    piece(g, t => t.ell(11.6, 2.8, 2.1, 1.1, flat(['#c4f0a0', '#9ad874', '#78bc58']), -0.4));
    piece(g, t => { t.ell(4.6, 9.6, 3.8, 4.8, P[1]); t.ell(11.4, 9.6, 3.8, 4.8, P[1]); t.ell(8, 9.6, 4.4, 5.4, P[1]); softShade(t, 8, 9.6, 7.4, 5.4, P); });
    for (const x of [5.4, 10.6]) PX.stroke(g, [[x, 5.6], [x - (x < 8 ? 0.6 : -0.6), 9.6], [x, 13.6]], 0.22, 0.22, P[2]);
    const hole = '#8a4a3a', glow = '#ffe27a';
    for (const ex of [5.6, 10.4]) { g.poly([[ex - 1.5, 9.4], [ex + 1.5, 9.4], [ex, 7.2]], hole); g.poly([[ex - 0.8, 9.1], [ex + 0.8, 9.1], [ex, 7.9]], glow); }
    g.poly([[4.4, 11], [11.6, 11], [10.4, 13], [5.6, 13]], hole); g.poly([[5.4, 11.4], [10.6, 11.4], [9.8, 12.5], [6.2, 12.5]], glow);
    g.outerLine();
  };

  // =====================================================================================================
  // 5) Garden props: PX.PVZ_PROP[kind] = { w, h, draw(g, theme) }, anchor bottom-centre (floor(w / 2), h)
  //    Chunky toy-like shapes with a soft shade crescent and a bold outer line. Night = a soft blue tint.
  //    New props for the garden features:
  //      flowerpot       16 x 10  a pastel terracotta pot a plant stands IN. Soil top centred 8 px above the anchor; stand the
  //                               plant with its own anchor (16, 31) at (potX, potY - 7) so its base leaves rest on the rim.
  //      flowerpot_gold  16 x 10  the fancy gold pot (same shape and plant spot)
  //      flowerpot_bloom 10 x 10  the old decorative pot with a flower in it (for scenery)
  //      zgrave          16 x 18  a zombie gravestone with a broken-open dirt mound in front; zombies rise from the mound,
  //                               whose centre is about 3 px above the anchor.
  // =====================================================================================================
  const P = {};
  const nt = (R, th, k) => (th === 'night' ? R.map(c => mixHex(c, '#7f88cc', k == null ? 0.22 : k)) : R);
  const WOOD = ['#fbe4c8', '#e6b88e', '#c99870'];
  const STONE = ['#f4f2fb', '#d2cde2', '#aea8c4'];
  // a tiny 4-petal flower in fine pixels
  function flower4(g, x, y, col) { g.dots([[x - 0.5, y], [x + 0.5, y], [x, y - 0.5], [x, y + 0.5]], col); g.dot(x, y, '#ffe680'); }
  // "RIP" in fine-pixel strokes, centred on (x, y)
  function rip(g, x, y, col) {
    const L = pts => { for (let i = 1; i < pts.length; i++) PX.stroke(g, [pts[i - 1], pts[i]], 0.2, 0.2, col); };
    L([[x - 2.2, y + 0.9], [x - 2.2, y - 0.9], [x - 1.5, y - 0.9], [x - 1.3, y - 0.4], [x - 1.6, y], [x - 2.2, y], [x - 1.3, y + 0.9]]);
    L([[x, y - 0.9], [x, y + 0.9]]);
    L([[x + 1.3, y + 0.9], [x + 1.3, y - 0.9], [x + 2.0, y - 0.9], [x + 2.2, y - 0.45], [x + 2.0, y], [x + 1.3, y]]);
  }
  P.picketfence = { w: 30, h: 14, draw(g, th) {
    const W = nt(['#ffffff', '#fbf6ee', '#e2d8ce'], th);
    piece(g, t => { rrect(t, 0.4, 4.8, 29.6, 6.6, 0.7, W[1]); rrect(t, 0.4, 9.4, 29.6, 11.2, 0.7, W[1]); softShade(t, 15, 8, 16, 3.6, W, { hl: false }); });
    for (let i = 0; i < 5; i++) { const x = 1.6 + i * 6; piece(g, t => { rrect(t, x, 3.4, x + 2.8, 12.8, 0.7, W[1]); t.poly([[x, 3.8], [x + 1.4, 1.2], [x + 2.8, 3.8]], W[1]); t.ell(x + 1.4, 1.9, 0.75, 0.75, W[1]); softShade(t, x + 1.4, 7.6, 1.8, 6.2, W); }); }
    g.outerLine();
  } };
  P.hedge = { w: 24, h: 14, draw(g, th) {
    const L = nt(th === 'desert' ? ['#f0f4c8', '#cad68c', '#a8b66e'] : ['#e0f8c4', '#a2da7c', '#80be60'], th);
    piece(g, t => { rrect(t, 1, 5, 23, 12.8, 2.4, L[1]); for (const [x, y, r] of [[4.6, 5.8, 3.4], [9.8, 4.6, 3.8], [15, 4.7, 3.7], [19.6, 5.9, 3.2]]) t.ell(x, y, r, r * 0.92, L[1]); softShade(t, 12, 8, 12, 6, L); });
    if (th !== 'desert') for (const [x, y] of [[6, 8.4], [13.6, 6.6], [18.4, 9.6], [9.6, 10.6]]) flower4(g, x, y, th === 'night' ? '#e6d8ff' : '#ffc4d8');
    g.outerLine();
  } };
  P.mailbox = { w: 10, h: 18, draw(g, th) {
    const B = nt(['#eef8ff', '#acd6f4', '#88b8e2'], th), WD = nt(WOOD, th), FL = nt(['#ffdce0', '#ff9eaa', '#ec7c8c'], th);
    piece(g, t => { rrect(t, 3.9, 9, 6.1, 16.8, 0.6, WD[1]); softShade(t, 5, 13, 1.4, 4.4, WD, { hl: false }); });
    piece(g, t => { PX.stroke(t, [[7.9, 7.6], [7.9, 2.8]], 0.42, 0.42, '#c9b8c8'); t.poly([[8.1, 1.6], [9.4, 1.8], [9.4, 3.8], [8.1, 3.8]], FL[1]); });
    piece(g, t => { rrect(t, 0.9, 4.8, 8.5, 10.4, 0.9, B[1]); t.ell(4.7, 5.2, 3.8, 2.7, B[1], 0, (x, y) => y <= 5.3); softShade(t, 4.7, 6.8, 4.2, 4.2, B); });
    PX.stroke(g, [[2.4, 9.2], [7, 9.2]], 0.22, 0.22, B[2]);
    g.ell(4.2, 6.8, 0.65, 0.6, '#ff9eb4'); g.ell(5.2, 6.8, 0.65, 0.6, '#ff9eb4'); g.poly([[3.6, 7], [5.8, 7], [4.7, 8.3]], '#ff9eb4');
    g.outerLine();
  } };
  P.gnome = { w: 10, h: 14, draw(g, th) {
    const RD = nt(['#ffd8e0', '#ff9eb0', '#ec7c94'], th), BL = nt(['#e4f2ff', '#a2ccf2', '#80aade'], th), SK = nt(['#fff4ea', '#ffdcc2', '#f2bc9e'], th);
    piece(g, t => { t.ell(3.4, 12.8, 1.5, 0.9, '#c49a7a'); t.ell(6.6, 12.8, 1.5, 0.9, '#c49a7a'); });
    piece(g, t => soft(t, 5, 11, 3.1, 2.2, BL, { hl: false }));
    piece(g, t => { t.poly([[1.6, 6.2], [8.4, 6.2], [5.6, 1.6], [3.6, 0.9]], RD[1]); t.ell(3.7, 1.4, 0.9, 0.8, RD[1]); t.ell(5, 6.0, 3.5, 1.1, RD[1]); softShade(t, 5, 4.4, 3.6, 3.4, RD); });
    piece(g, t => soft(t, 5, 7.8, 2.8, 2.1, SK, { hl: false }));
    piece(g, t => { t.ell(5, 9.9, 2.6, 1.6, '#ffffff'); t.poly([[2.8, 9.8], [7.2, 9.8], [5, 12.6]], '#ffffff'); t.ell(3, 8.9, 0.9, 1, '#ffffff'); t.ell(7, 8.9, 0.9, 1, '#ffffff'); });
    AR.chibiEyes && AR.chibiEyes(g, 5.4, 7.8, { sp: 2.6, w: 1.3, h: 1.7 });
    AR.blush && AR.blush(g, 5.4, 8.7, { sp: 3.8, w: 0.6, h: 0.4 });
    g.outerLine();
  } };
  // a pink toy mower like a baby stroller: a big pleated hood at the back, a round cream tub, a push handle, donut wheels
  P.lawnmower = { w: 20, h: 12, draw(g, th) {
    const PK = nt(['#ffeaf2', '#ffb2c9', '#f090ad'], th), CR = nt(['#ffffff', '#fff6ec', '#eedccc'], th), WH = nt(['#ffffff', '#f4f0fa', '#d2c8e0'], th);
    piece(g, t => { PX.stroke(t, [[5, 6], [2.8, 3], [2, 1.8]], 0.5, 0.5, '#c4b4d0'); t.ell(1.8, 1.5, 1.2, 1.0, PK[1]); });
    piece(g, t => { t.ell(11.6, 6.8, 7.4, 3.2, CR[1], 0, (x, y) => y >= 5.4); rrect(t, 4.4, 5.2, 18.8, 8.4, 1.4, CR[1]); softShade(t, 11.6, 7, 7.6, 2.6, CR, { hl: false }); });
    piece(g, t => { t.ell(9.8, 6.2, 5.6, 5.4, PK[1], 0, (x, y) => y <= 6.0 && x <= 13.2); softShade(t, 9.8, 4, 5.2, 3.6, PK); });
    for (const a of [-2.55, -2.05, -1.55, -1.08]) PX.stroke(g, [[9.8 + Math.cos(a) * 1.4, 6 + Math.sin(a) * 1.4], [9.8 + Math.cos(a) * 5.3, 6 + Math.sin(a) * 5.1]], 0.2, 0.2, PK[2]);
    for (let x = 5.2; x <= 18; x += 1.4) g.ell(x, 5.85, 0.45, 0.4, '#ffffff', 0, IN(g));
    g.ell(17.8, 6.7, 0.65, 0.7, '#fff2a0', 0, IN(g));
    g.ell(14.6, 7, 0.5, 0.45, '#ff9eb8', 0, IN(g)); g.ell(15.5, 7, 0.5, 0.45, '#ff9eb8', 0, IN(g)); g.poly([[14.15, 7.15], [15.95, 7.15], [15.05, 8.1]], '#ff9eb8');
    piece(g, t => { t.ell(7, 9.5, 1.9, 1.9, WH[1]); t.ell(15.6, 9.5, 1.9, 1.9, WH[1]); });
    g.ell(7, 9.5, 0.75, 0.75, PK[1]); g.ell(15.6, 9.5, 0.75, 0.75, PK[1]);
    g.outerLine();
  } };
  function potArt(g, th, gold) {
    const T = nt(gold ? ['#fff8d6', '#ffd970', '#efb852'] : ['#ffe6d2', '#f6b293', '#e09276'], th), S = nt(['#c9a28c', '#a98270', '#8f6c5a'], th);
    piece(g, t => { t.poly([[2.6, 4.4], [13.4, 4.4], [12.3, 8.4], [3.7, 8.4]], T[1]); t.ell(8, 8.2, 4.5, 0.9, T[1]); softShade(t, 8, 6.2, 6, 3.2, T, { hl: false }); });
    piece(g, t => { rrect(t, 1.1, 2.6, 14.9, 5, 1.1, T[1]); t.ell(8, 2.5, 6.9, 1.6, T[1]); softShade(t, 8, 3, 7.4, 2, T, { hl: false }); });
    g.ell(8, 2.45, 5.5, 0.95, S[1]); g.ell(7.4, 2.2, 3.4, 0.45, S[0], 0, IN(g));
    if (gold) {
      for (let x = 2.4; x <= 13.8; x += 1.9) g.ell(x, 4.2, 0.5, 0.4, T[0], 0, IN(g));
      piece(g, t => { t.ell(7.4, 6.3, 0.8, 0.75, '#ff9eb8'); t.ell(8.6, 6.3, 0.8, 0.75, '#ff9eb8'); t.poly([[6.6, 6.5], [9.4, 6.5], [8, 8]], '#ff9eb8'); });
      g.dot(7.3, 6.1, WHITE);
      for (const x of [4.6, 11.4]) g.ell(x, 6.4, 0.5, 0.5, '#8fd6f4', 0, IN(g));
    } else for (let x = 4.4; x <= 12; x += 1.85) g.dot(x, 6.6, T[0]);
    g.outerLine();
    if (gold) { twinkleF(g, 0.8, 6.8, '#ffe680'); twinkleF(g, 15.2, 7.8, '#ffe680'); }
  }
  P.flowerpot = { w: 16, h: 10, draw(g, th) { potArt(g, th, false); } };
  P.flowerpot_gold = { w: 16, h: 10, draw(g, th) { potArt(g, th, true); } };
  P.flowerpot_bloom = { w: 10, h: 10, draw(g, th) {
    const T = nt(['#ffe6d2', '#f6b293', '#e09276'], th), L = nt(['#e0f8c4', '#a2da7c', '#80be60'], th);
    const FL = th === 'night' ? ['#ffffff', '#e2d4fa', '#c2aeea'] : th === 'sea' ? ['#fff0e4', '#ffb898', '#f0947a'] : ['#fff0f4', '#ffb2c8', '#f08eaa'];
    piece(g, t => { t.ell(3, 4.4, 1.9, 1.0, flat(L), 0.5); t.ell(7, 4.4, 1.9, 1.0, flat(L), -0.5); });
    piece(g, t => { for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; t.ell(5 + Math.cos(a) * 1.35, 2.4 + Math.sin(a) * 1.2, 1.05, 0.95, FL[1]); } softShade(t, 5, 2.4, 2.4, 2.2, FL, { hl: false }); });
    g.ell(5, 2.5, 0.75, 0.7, '#ffe27a');
    piece(g, t => { t.poly([[2.2, 6.2], [7.8, 6.2], [7, 9.2], [3, 9.2]], T[1]); softShade(t, 5, 7.6, 3, 1.8, T, { hl: false }); });
    piece(g, t => rrect(t, 1.2, 5, 8.8, 6.8, 0.7, T[1]));
    g.outerLine();
  } };
  P.zgrave = { w: 16, h: 18, draw(g, th) {
    const S = nt(['#f2f0fa', '#cfc9e0', '#aca5c4'], th), M = nt(['#e0c2aa', '#c09a80', '#a27e66'], th);
    piece(g, t => { rrect(t, 3, 5, 13, 15.2, 1.4, S[1]); t.ell(8, 5.6, 5, 4.4, S[1], 0, (x, y) => y <= 6); softShade(t, 8, 9, 5.6, 6.6, S); });
    piece(g, t => { t.ell(5.4, 2.4, 2.4, 1.3, ['#e2f6c8', '#b2e08c', '#92c870'], -0.3); t.ell(7.6, 1.7, 1.6, 0.9, ['#e2f6c8', '#b2e08c', '#92c870'], 0.1); });
    rip(g, 8, 7.6, S[2]);
    PX.stroke(g, [[11.4, 9.4], [10.4, 10.8], [11.2, 12], [10.4, 13.2]], 0.22, 0.22, S[2]);
    piece(g, t => { t.ell(8, 15.6, 7.3, 1.9, M[1]); t.ell(3.6, 15.0, 2.6, 1.6, M[1]); t.ell(12.6, 14.8, 2.8, 1.7, M[1]); softShade(t, 8, 15.2, 7.4, 2.2, M, { hl: false }); });
    PX.stroke(g, [[4.2, 15.2], [5.8, 14.8], [6.8, 15.6], [8.6, 14.8], [9.8, 15.4], [11.6, 14.6]], 0.3, 0.3, '#7e5e50');
    piece(g, t => { t.ell(1.6, 16.6, 0.9, 0.7, M[1]); t.ell(14.6, 16.4, 1.0, 0.75, M[1]); t.ell(13.2, 12.6, 0.7, 0.6, M[1]); });
    g.outerLine();
    if (th === 'night') { twinkleF(g, 1.4, 6, '#c8b8f8'); twinkleF(g, 15, 4.4, '#c8b8f8'); }
  } };
  P.gravestone = { w: 12, h: 16, draw(g, th) {
    const S = nt(STONE, th), L = nt(['#e2f6c8', '#b2e08c', '#92c870'], th);
    piece(g, t => { rrect(t, 1.4, 5.6, 10.6, 14.8, 1.2, S[1]); t.ell(6, 6.2, 4.6, 4.8, S[1], 0, (x, y) => y <= 6.4); softShade(t, 6, 8.8, 5, 6.4, S); });
    piece(g, t => { t.ell(3.6, 2.6, 2.1, 1.2, L, -0.4); t.ell(5.6, 1.9, 1.4, 0.8, L, 0); });
    rip(g, 6, 7.4, S[2]);
    PX.stroke(g, [[3.4, 10.6], [8.6, 10.6]], 0.2, 0.2, S[2]); PX.stroke(g, [[4.2, 12], [7.8, 12]], 0.2, 0.2, S[2]);
    piece(g, t => { t.ell(2, 14.6, 1.6, 0.9, L[1], -0.4); t.ell(10.2, 14.6, 1.6, 0.9, L[1], 0.4); });
    flower4(g, 9.6, 13.4, th === 'night' ? '#e6d8ff' : '#ffc4d8');
    g.outerLine();
  } };
  P.gravestone2 = { w: 10, h: 13, draw(g, th) { // a chubby stone cross
    const S = nt(['#f0eef6', '#cbc6d8', '#a8a2bc'], th), L = nt(['#e2f6c8', '#b2e08c', '#92c870'], th);
    piece(g, t => { rrect(t, 3.6, 1.2, 6.4, 12.2, 1.1, S[1]); rrect(t, 1, 3.6, 9, 6.4, 1.1, S[1]); softShade(t, 5, 6.4, 4.2, 5.6, S); });
    PX.stroke(g, [[5.9, 7.4], [5.3, 8.6], [5.8, 9.6]], 0.2, 0.2, S[2]);
    piece(g, t => { t.ell(3.2, 11.8, 1.8, 0.9, L[1], -0.3); t.ell(6.8, 11.9, 1.8, 0.9, L[1], 0.3); });
    g.outerLine();
  } };
  P.deadtree = { w: 26, h: 34, draw(g, th) {
    const T = nt(th === 'desert' ? ['#f6ead8', '#d8bf9e', '#bba182'] : ['#f2e4e0', '#ccb2ac', '#a99090'], th);
    piece(g, t => {
      PX.stroke(t, [[13, 32.4], [13.2, 26], [12.6, 20], [13.4, 13], [13, 8]], 3.2, 1.5, T[1]);
      t.ell(13, 31.6, 5.6, 1.9, T[1]);
      PX.stroke(t, [[12.6, 22.6], [8.6, 19.2], [5.4, 18.8], [3.6, 16.2], [4.4, 13.8]], 1.6, 0.95, T[1]); t.ell(5.4, 13.6, 1.3, 1.3, T[1]);
      PX.stroke(t, [[13.6, 19], [17.6, 15.4], [20.8, 15.6], [22.6, 13]], 1.5, 0.95, T[1]); t.ell(21.8, 12.2, 1.3, 1.3, T[1]);
      PX.stroke(t, [[13, 10], [10.4, 6.6], [10.8, 3.8], [12.8, 2.8]], 1.2, 0.85, T[1]);
      PX.stroke(t, [[13.6, 12], [16.6, 8.4], [18.6, 8]], 1.1, 0.8, T[1]);
      softShade(t, 13, 18, 11, 15, T);
    });
    g.ell(13.2, 24.4, 1.4, 1.9, nt(['#8a6e80'], th)[0], 0, IN(g));
    if (th === 'night') g.dots([[12.7, 24.2], [13.7, 24.2]], '#fff27a');
    g.outerLine();
    if (th === 'night') { twinkleF(g, 3, 5, '#d0c0ff'); twinkleF(g, 22, 4, '#d0c0ff'); }
  } };
  P.ironfence = { w: 28, h: 16, draw(g, th) {
    const I = nt(['#e4e2f4', '#aaa8cc', '#8886ae'], th);
    piece(g, t => { rrect(t, 0.4, 5.4, 27.6, 6.8, 0.6, I[1]); rrect(t, 0.4, 12, 27.6, 13.4, 0.6, I[1]); });
    for (const x of [4, 9, 14, 19, 24]) piece(g, t => { rrect(t, x - 0.75, 3, x + 0.75, 14.8, 0.6, I[1]); t.ell(x, 2.4, 1.35, 1.35, I[1]); softShade(t, x, 8, 1.4, 6.4, I); });
    for (const x of [6.5, 11.5, 16.5, 21.5]) piece(g, t => { t.ell(x, 9.4, 1.3, 1.3, I[1]); t.ell(x, 9.4, 0.55, 0.55, null); });
    g.outerLine();
  } };
  P.poolchair = { w: 22, h: 12, draw(g) {
    const FR = ['#ffffff', '#e6e8f2', '#c2c6d6'];
    piece(g, t => { rrect(t, 7.4, 8.2, 8.8, 10.8, 0.5, FR[1]); rrect(t, 18.4, 8.2, 19.8, 10.8, 0.5, FR[1]); rrect(t, 3.6, 6.4, 5, 10.8, 0.5, FR[1]); });
    piece(g, t => { rrect(t, 6, 6, 21, 8.6, 1.2, '#fff'); PX.stroke(t, [[2.6, 1.6], [6.8, 6.8]], 1.25, 1.25, '#fff'); });
    each(g, (x, y, c) => { if (c !== '#fff') return; const k = Math.floor((x + (y < 6 ? (6 - y) : 0)) / 2) % 2; g.set(x, y, k ? '#ffffff' : y >= 8 || x >= 20 ? '#86c6ec' : '#aedcf6'); });
    g.outerLine();
  } };
  P.poolladder = { w: 10, h: 16, draw(g) {
    const C = ['#ffffff', '#dfe4ee', '#b8c0d2'];
    piece(g, t => {
      for (const x0 of [1.6, 5.6]) PX.stroke(t, [[x0, 15.2], [x0, 4.4], [x0 + 0.5, 2.6], [x0 + 1.7, 1.7], [x0 + 2.7, 2.5], [x0 + 2.9, 3.6]], 0.6, 0.6, C[1]);
      for (const y of [7, 10, 13]) rrect(t, 1.8, y - 0.5, 5.4, y + 0.5, 0.4, C[1]);
      softShade(t, 4.6, 8, 4, 7, C, { hl: false });
    });
    g.outerLine();
  } };
  P.lifering = { w: 12, h: 12, draw(g) {
    piece(g, t => { t.ell(6, 6, 5.2, 5.2, '#fff'); t.ell(6, 6, 2.2, 2.2, null); });
    each(g, (x, y, c) => { if (c !== '#fff') return; const a = Math.atan2(y + 0.5 - 6, x + 0.5 - 6), band = Math.floor((a + Math.PI + Math.PI / 8) / (Math.PI / 4)) % 2; g.set(x, y, band ? '#ff9eb0' : '#ffffff'); });
    softShade(g, 6, 6, 5.4, 5.4, ['#ffffff', '#ffffff', '#e6dce6'], { only: '#ffffff', hl: false });
    softShade(g, 6, 6, 5.4, 5.4, ['#ffd0da', '#ff9eb0', '#ec7c94'], { only: '#ff9eb0', hl: false });
    g.dots([[3, 3], [3.5, 2.5], [2.5, 3.5]], WHITE);
    g.outerLine();
  } };
  // a toy cannon: a round slate-blue barrel on a little wooden cart with donut wheels, a fuse at the back
  P.cannon = { w: 20, h: 14, draw(g, th) {
    const IR = nt(['#eef0fb', '#b2bade', '#9099c2'], th), WD = nt(WOOD, th), DW = nt(['#ffe6ee', '#ffb4c6', '#f092aa'], th);
    piece(g, t => PX.stroke(t, [[2.8, 7.2], [1.6, 5.6], [1.8, 4.2]], 0.32, 0.32, '#c8a888'));
    piece(g, t => { t.poly([[3, 8.6], [12.4, 8.6], [11.6, 11.6], [3.8, 11.6]], WD[1]); softShade(t, 7.6, 10, 4.8, 1.8, WD, { hl: false }); });
    piece(g, t => { PX.stroke(t, [[4.6, 7.6], [15, 4.6]], 2.9, 2.4, IR[1]); t.ell(3.6, 7.8, 2.2, 2.2, IR[1]); softShade(t, 9.4, 6, 8, 4, IR, { rot: -0.28 }); });
    piece(g, t => { t.ell(16.2, 4.2, 1.5, 2.6, IR[0], -0.28); t.ell(16.5, 4.1, 0.75, 1.6, '#6a6f96', -0.28); });
    piece(g, t => { t.ell(5.6, 11.4, 2.2, 2.2, DW[1]); t.ell(12, 11.4, 2.2, 2.2, DW[1]); });
    g.ell(5.6, 11.4, 0.8, 0.8, '#fff3f6'); g.ell(12, 11.4, 0.8, 0.8, '#fff3f6');
    g.outerLine();
    twinkleF(g, 1.4, 3.2, '#ffd27a', true);
  } };
  P.treasure = { w: 16, h: 12, draw(g, th) {
    const WD = nt(['#f8d8be', '#dda482', '#c08466'], th);
    piece(g, t => { for (const [x, y] of [[4.4, 3.6], [7, 3.2], [9.6, 3.4], [11.8, 3.9]]) t.ell(x, y, 1.6, 1.0, GOLD[1]); softShade(t, 8, 3.4, 5, 1.4, GOLD, { hl: false }); });
    piece(g, t => { t.ell(8, 5.4, 6.6, 3.4, WD[1], 0, (x, y) => y <= 5.6); t.rect(1.4, 4.4, 13.2, 1.4, WD[1]); softShade(t, 8, 4.4, 6.6, 2.6, WD); });
    piece(g, t => { rrect(t, 1.4, 5.8, 14.6, 11.2, 1.1, WD[1]); softShade(t, 8, 8.4, 7, 3, WD, { hl: false }); });
    for (const x of [3.4, 12.6]) { const m = (xx, yy) => g.filled(xx, yy) && yy >= 2.4; m.fine = true; g.ell(x, 7, 0.7, 5, GOLD[1], 0, m); }
    piece(g, t => { t.ell(8, 7.6, 1.3, 1.3, GOLD[1]); });
    g.ell(7.6, 7.3, 0.4, 0.4, '#ff9eb8'); g.ell(8.4, 7.3, 0.4, 0.4, '#ff9eb8'); g.poly([[7.2, 7.5], [8.8, 7.5], [8, 8.4]], '#ff9eb8');
    g.dots([[5, 3.4], [8.6, 3]], WHITE);
    g.outerLine();
  } };
  P.barrel = { w: 12, h: 14, draw(g, th) {
    const WD = nt(['#fbe0c2', '#e2ae84', '#c69068'], th), HP = nt(['#eceaf6', '#bcb8d4', '#9a96b8'], th);
    piece(g, t => { t.ell(6, 7.4, 5, 6.4, WD[1], 0, (x, y) => y >= 1.2 && y <= 13.2); softShade(t, 6, 7.4, 5.2, 6.4, WD); });
    g.ell(6, 1.8, 3.7, 0.9, WD[0], 0, IN(g));
    for (const y of [3.8, 10.6]) { const m = (x, yy) => g.filled(x, yy) && Math.abs(yy - y) < 0.65; m.fine = true; g.ell(6, y, 6, 1, HP[1], 0, m); }
    for (const x of [4, 8]) PX.stroke(g, [[x, 4.6], [x + (x < 6 ? -0.3 : 0.3), 7.4], [x, 9.8]], 0.18, 0.18, WD[2]);
    g.outerLine();
  } };
  P.obelisk = { w: 10, h: 30, draw(g, th) {
    const S = nt(['#fff6e2', '#f2d9aa', '#d9bb88'], th, 0.3), GD = nt(GOLD, th, 0.2);
    piece(g, t => { rrect(t, 1, 25.6, 9, 28.8, 0.8, S[1]); softShade(t, 5, 27.2, 4.2, 1.8, S, { hl: false }); });
    piece(g, t => { t.poly([[2.4, 26], [3.2, 5.2], [6.8, 5.2], [7.6, 26]], S[1]); softShade(t, 5, 15.6, 2.8, 11, S); });
    piece(g, t => { t.poly([[2.9, 5.6], [5, 1.1], [7.1, 5.6]], GD[1]); softShade(t, 5, 3.6, 1.8, 2.4, GD, { hl: false }); });
    const B = '#86bfe2';
    g.ell(5, 9, 1.1, 0.7, B); g.dot(5, 9, '#ffffff');
    PX.stroke(g, [[5, 12.4], [5, 15.6]], 0.3, 0.3, B); g.ell(5, 12, 0.7, 0.8, B); g.ell(5, 12, 0.3, 0.35, S[1]); PX.stroke(g, [[4, 13.4], [6, 13.4]], 0.3, 0.3, B);
    for (const y of [18.4, 20.6, 22.8]) PX.stroke(g, [[4.1, y], [5.9, y]], 0.25, 0.25, '#e0a8b8');
    g.outerLine();
    if (th === 'night') twinkleF(g, 5, 0.6, '#fff6c8');
  } };
  // a chibi pharaoh coffin: a big round striped headdress round a sleepy face, a small tapered body
  P.sarcophagus = { w: 12, h: 20, draw(g, th) {
    const GD = nt(GOLD, th, 0.2), BL = nt(['#e2f2ff', '#94c8ee', '#74a8d8'], th, 0.2), SK = nt(['#fff2dc', '#ffdcae', '#f0c08c'], th, 0.2);
    piece(g, t => { t.poly([[2.6, 11], [9.4, 11], [8.6, 19.2], [3.4, 19.2]], GD[1]); softShade(t, 6, 15, 3.6, 4.6, GD, { hl: false }); });
    piece(g, t => { t.ell(6, 6.6, 5.2, 5.6, GD[1]); t.poly([[1.2, 7], [10.8, 7], [10.4, 11.6], [1.6, 11.6]], GD[1]); });
    each(g, (x, y, c) => { if (c === GD[1] && y <= 11 && (x <= 2 || x >= 9 || y <= 2) && y % 2 === 1) g.set(x, y, BL[1]); });
    piece(g, t => soft(t, 6, 7.4, 3.2, 3.4, SK, { hl: false }));
    AR.chibiEyes && AR.chibiEyes(g, 6.4, 7.5, { sp: 2.9, w: 1.4, h: 1.8, mood: 'closed' });
    AR.blush && AR.blush(g, 6.4, 8.5, { sp: 4, w: 0.6, h: 0.4 });
    piece(g, t => { rrect(t, 3, 11.4, 9, 13, 0.6, BL[1]); });
    for (let x = 3.5; x <= 8.5; x += 1) g.dot(x, 12.2, GD[0]);
    PX.stroke(g, [[6, 13.8], [6, 18.4]], 0.3, 0.3, BL[1]);
    g.outerLine();
  } };
  P.urn = { w: 10, h: 12, draw(g, th) {
    const C = nt(['#ffe2cc', '#f4ad8a', '#de8c6c'], th, 0.2);
    piece(g, t => { PX.stroke(t, [[2.6, 4], [1, 5], [1.4, 7]], 0.5, 0.5, C[1]); PX.stroke(t, [[7.4, 4], [9, 5], [8.6, 7]], 0.5, 0.5, C[1]); });
    piece(g, t => { t.ell(5, 7.4, 3.9, 3.5, C[1]); rrect(t, 3.2, 2.4, 6.8, 5.6, 0.6, C[1]); t.ell(5, 2.4, 2.6, 0.9, C[1]); rrect(t, 3.4, 9.8, 6.6, 11, 0.4, C[1]); softShade(t, 5, 6.6, 3.9, 4.6, C); });
    const m = (x, y) => g.filled(x, y) && y >= 6.6 && y <= 8; m.fine = true; g.ell(5, 7.3, 4, 1, '#94c8ee', 0, m);
    for (const x of [2.6, 4.2, 5.8, 7.4]) g.dot(x, 7.2, WHITE);
    g.ell(5, 2.2, 1.6, 0.4, C[2], 0, IN(g));
    g.outerLine();
  } };
  P.pyramid = { w: 40, h: 26, draw(g, th) {
    const S = nt(['#fff4dc', '#f2d8a6', '#dcbc88'], th, 0.3), GD = nt(GOLD, th, 0.2);
    piece(g, t => { t.poly([[1, 25.2], [18.6, 2], [21.4, 2], [39, 25.2]], S[1]); t.ell(20, 2.6, 1.6, 1.2, S[1]); });
    each(g, (x, y, c) => { if (c !== S[1]) return; if (x + 0.5 > 20 + (y - 2) * 0.18) g.set(x, y, S[2]); });
    for (let y = 6; y < 25; y += 4) { const half = (y - 2) * 0.77; PX.stroke(g, [[20 - half + 1.2, y], [20 + half - 1.2, y]], 0.16, 0.16, mixHex(S[2], S[1], 0.3)); }
    each(g, (x, y, c) => { if ((c === S[1] || c === S[2]) && y <= 6) g.set(x, y, x + 0.5 > 20 + (y - 2) * 0.18 ? GD[2] : GD[1]); });
    piece(g, t => { rrect(t, 17.4, 19.6, 22.6, 25.2, 2.4, '#a88a76'); });
    if (th === 'night') g.dots([[19.4, 22.4], [20.6, 22.4]], '#fff27a');
    g.outerLine();
    twinkleF(g, 19.2, 1.2, '#fff6c8');
  } };
  P.brainsign = { w: 14, h: 18, draw(g, th) {
    const W = nt(WOOD, th), BR = nt(['#ffe6ee', '#ffb8cc', '#f096ae'], th);
    piece(g, t => { rrect(t, 6, 8, 8, 17, 0.6, W[2]); });
    piece(g, t => { t.poly([[1, 2.6], [13, 1.4], [13.3, 8.4], [1.3, 9.2]], W[1]); softShade(t, 7, 5.4, 6.4, 4, W); });
    piece(g, t => { t.ell(4.4, 5.2, 1.5, 1.4, BR[1]); t.ell(6.2, 4.4, 1.6, 1.4, BR[1]); t.ell(6, 6.2, 1.8, 1.3, BR[1]); t.ell(3.6, 6.4, 1.2, 1.0, BR[1]); softShade(t, 5, 5.4, 2.6, 2, BR, { hl: false }); });
    PX.stroke(g, [[4.6, 4.6], [5.4, 5.4], [4.8, 6.2]], 0.18, 0.18, BR[2]); PX.stroke(g, [[6.6, 4.2], [6.2, 5.2]], 0.18, 0.18, BR[2]);
    piece(g, t => { PX.stroke(t, [[8.6, 5.4], [11, 5.2]], 0.55, 0.55, '#ff9a8a'); t.poly([[10.6, 3.8], [12.6, 5.2], [10.8, 6.6]], '#ff9a8a'); });
    g.outerLine();
  } };
  // fruit trees (the game hangs fruit on the canopy: keep the slots covered)
  P.spookytree = { w: 30, h: 38, draw(g, th) {
    const LV = nt(['#f2e6ff', '#cfb6f2', '#ad94da'], th), TR = nt(['#eadad8', '#bea2a8', '#9c8288'], th);
    piece(g, t => {
      PX.stroke(t, [[15, 37], [14.2, 32], [16.4, 27], [14.6, 22], [15.6, 18]], 2.8, 1.6, TR[1]);
      t.ell(15, 36.4, 4.6, 1.5, TR[1]);
      PX.stroke(t, [[14.6, 24.6], [10.8, 22], [9.4, 19.4]], 1.1, 0.8, TR[1]); PX.stroke(t, [[15.6, 21.4], [19.8, 20], [21, 17.4]], 1.1, 0.8, TR[1]);
      softShade(t, 15, 28, 3.6, 9, TR, { hl: false });
    });
    piece(g, t => {
      for (const [x, y, rx, ry] of [[15, 12.4, 9.4, 7.4], [6.8, 16, 5.6, 4.6], [23.2, 15.6, 5.6, 4.6], [11.6, 6.4, 5.8, 4.6], [19.4, 6.8, 5.2, 4.2]]) t.ell(x, y, rx, ry, LV[1]);
      softShade(t, 15, 12, 13, 9, LV);
    });
    for (const [x, y, c] of [[9.6, 10, LV[0]], [20.6, 12.6, LV[0]], [6, 15, LV[0]], [16, 5, LV[0]]]) g.ell(x, y, 1.2, 0.8, c, -0.4, IN(g));
    g.outerLine();
    if (th === 'night') for (const [x, y] of [[2.4, 4.6], [27, 3], [1.6, 25], [28, 24]]) twinkleF(g, x, y, '#d8c8ff');
  } };
  P.datepalm = { w: 30, h: 38, draw(g, th) {
    const TR = nt(['#fbe4c4', '#e2b886', '#c69a6a'], th), LV = nt(['#dcf6c4', '#9ed67c', '#7cba60'], th);
    for (let i = 7; i >= 0; i--) { const k = i / 8; piece(g, t => t.ell(14.4 + 2.6 * k * k, 34.6 - k * 24.4, 2.5 - k * 0.5, 2.0, flat(TR))); }
    const cx = 16.4, cy = 10;
    const fr = [[[cx, cy], [11, 8.6], [6, 10.6], [2.6, 15]], [[cx, cy], [21.6, 8.6], [26, 10.8], [28.2, 15]], [[cx, cy], [12.2, 5.6], [7.2, 4.6], [3.4, 6.6]], [[cx, cy], [20.4, 5.2], [24.8, 4.6], [27.6, 7]],
      [[cx, cy], [14.6, 4], [12.6, 1.6]], [[cx, cy], [18.4, 3.6], [21, 1.6]]];
    for (const f of fr) piece(g, t => { PX.stroke(t, f, 2.0, 0.8, LV[1]); softShade(t, (f[0][0] + f[f.length - 1][0]) / 2, (f[0][1] + f[f.length - 1][1]) / 2 - 1, 7, 3, LV, { hl: false }); });
    piece(g, t => { for (const [x, y] of [[14.6, 12], [16.4, 12.6], [18.2, 12]]) t.ell(x, y, 1.1, 1.2, ['#ffd8b8', '#e9a07a', '#cf8462']); });
    g.outerLine();
  } };

  // =====================================================================================================
  // 6) Rest houses: PX.PVZ_HOME[kind] = { w, h, door, win, draw(g, theme) } (door / win offsets from the bottom-centre anchor)
  //    (the gardens now draw PX.pvzHouse; these chunky toy houses stay for anything that still asks for them)
  // =====================================================================================================
  const H = {};
  // a toy house: a soft rounded body, a chunky roof, round-topped windows, a rounded door. o: body/roof ramps, roof shape, extras
  function toyHouse(g, th, o) {
    const W = g.w, Hh = g.h, B = nt(o.wall, th, 0.18), R = nt(o.roof, th, 0.18), GL = th === 'night' ? ['#fffbe0', '#fff1a0', '#f6d470'] : ['#ffffff', '#cdeefa', '#a6d6ee'];
    if (o.behind) o.behind(g, B, R);
    piece(g, t => { rrect(t, o.x0, o.wy, W - o.x0, Hh - 0.8, 1.6, B[1]); softShade(t, W / 2, (o.wy + Hh) / 2, W / 2 - o.x0 + 1, (Hh - o.wy) / 2 + 1, B); });
    piece(g, t => {
      if (o.roofKind === 'flat') { rrect(t, o.x0 - 2, o.ry, W - o.x0 + 2, o.wy + 2, 1.4, R[1]); }
      else { t.poly([[o.x0 - 3, o.wy + 2], [W / 2, o.ry], [W - o.x0 + 3, o.wy + 2]], R[1]); t.ell(W / 2, o.ry + 1, 1.6, 1.4, R[1]); for (const x of [o.x0 - 2.4, W - o.x0 + 2.4]) t.ell(x, o.wy + 1.4, 1.2, 1.0, R[1]); }
      softShade(t, W / 2, (o.ry + o.wy) / 2 + 1, W / 2 - o.x0 + 3, (o.wy - o.ry) / 2 + 2, R);
    });
    for (const [wx, wy, ww, wh] of o.wins) piece(g, t => { rrect(t, wx, wy, wx + ww, wy + wh, Math.min(ww, wh) * 0.45, GL[1]); });
    for (const [wx, wy, ww, wh] of o.wins) { g.ell(wx + ww * 0.32, wy + wh * 0.3, ww * 0.18, wh * 0.16, GL[0], -0.5, IN(g)); PX.stroke(g, [[wx + ww / 2, wy + 0.4], [wx + ww / 2, wy + wh - 0.4]], 0.22, 0.22, '#ffffff'); }
    const [dx, dw, dh] = o.door, dy = Hh - 0.8 - dh;
    piece(g, t => { rrect(t, dx, dy, dx + dw, Hh - 0.8, 0.6, o.doorCol); t.ell(dx + dw / 2, dy + 0.4, dw / 2, dw * 0.45, o.doorCol, 0, (x, y) => y <= dy + 0.6); });
    g.ell(dx + dw * 0.75, dy + dh * 0.55, 0.45, 0.45, '#ffe27a', 0, IN(g));
    if (o.extra) o.extra(g, B, R);
    g.outerLine();
  }
  H.davehouse = { w: 44, h: 40, door: [0, -2], win: [[-12, -13], [12, -13], [0, -28]], draw(g, th) {
    toyHouse(g, th, { wall: ['#fff8e4', '#f6e2b6', '#dec698'], roof: ['#e6ecff', '#a8b4dc', '#8894c0'], x0: 5, wy: 18, ry: 3.6, doorCol: '#f29a8a', door: [19, 6.4, 10],
      wins: [[7.6, 22.4, 6, 7], [30.4, 22.4, 6, 7], [19.6, 9.2, 4.8, 5]],
      behind: (g2) => piece(g2, t => { rrect(t, 30, 4.6, 35, 14, 0.8, '#f2a898'); softShade(t, 32.5, 9, 2.6, 5, ['#ffd8ce', '#f2a898', '#dc8a7e'], { hl: false }); }),
      extra: (g2) => { for (const x of [7.6, 30.4]) piece(g2, t => rrect(t, x - 0.6, 29.6, x + 6.6, 31.4, 0.6, '#ffc4d4')); } });
  } };
  H.shed = { w: 34, h: 34, door: [0, 0], win: [[0, -23], [-10, -13]], draw(g, th) {
    toyHouse(g, th, { wall: ['#fff0dc', '#f2cfa2', '#d8b080'], roof: ['#ffe0dc', '#f4a8a0', '#de8a86'], x0: 4, wy: 14, ry: 3.6, doorCol: '#a6dc86', door: [12, 10, 14],
      wins: [[14.6, 7.6, 4.8, 4.6], [5.6, 17.6, 5, 5]] });
  } };
  H.crypt = { w: 38, h: 32, door: [0, -5], win: [[0, -23]], draw(g, th) {
    toyHouse(g, th, { wall: STONE, roof: ['#ece8f8', '#bdb6d6', '#9c94ba'], x0: 5, wy: 12, ry: 3.4, doorCol: '#a48cc8', door: [15, 8, 13],
      wins: [[17, 6.4, 4, 4]], extra: (g2, B) => { for (const x of [7.4, 28.6]) piece(g2, t => rrect(t, x, 14, x + 2.2, 30.6, 0.6, B[0])); } });
  } };
  H.pirateshack = { w: 34, h: 36, door: [0, -4], win: [[8, -14]], draw(g, th) {
    toyHouse(g, th, { wall: ['#fbe2c4', '#e2b488', '#c6966c'], roof: ['#fff6d4', '#f2d88a', '#dcbc6c'], x0: 5, wy: 15, ry: 3, doorCol: '#b8907a', door: [14, 7, 13],
      wins: [[23.4, 19.4, 4.4, 4.4]], extra: (g2) => { piece(g2, t => { rrect(t, 16.4, 0.6, 17.4, 4.4, 0.4, '#c49a7a'); t.poly([[17.4, 0.8], [21.4, 1.8], [17.4, 2.9]], '#ff9eb0'); }); } });
  } };
  H.tomb = { w: 40, h: 32, door: [0, 0], win: [[-12, -20], [12, -20]], draw(g, th) {
    toyHouse(g, th, { wall: ['#fff6e2', '#f2d9aa', '#d9bb88'], roof: ['#fff6c8', '#ffd866', '#f0b44a'], roofKind: 'flat', x0: 4, wy: 6, ry: 2, doorCol: '#a88a76', door: [15, 10, 16],
      wins: [[6.4, 10, 3, 4], [30.6, 10, 3, 4]], extra: (g2) => { for (const x of [8.4, 28.4]) piece(g2, t => rrect(t, x, 15, x + 3.2, 31, 0.8, '#fbe8c0')); } });
  } };

  // =====================================================================================================
  // 7) Crazy Dave: PX.crazyDave(frame) -> canvas, 24 x 34 art px (hi-res, k = 2), facing right, anchor bottom-centre (12, 34).
  //    Frame 0 / 1 = a cheerful wave (the front hand swings). Chibi: a huge round head under an upside-down saucepan (handle
  //    sticking out the front), wild hair tufts, a big fluffy beard round a happy open mouth, big friendly eyes, a tiny body.
  // =====================================================================================================
  function drawDave(g, f) {
    const SK = ['#fff3ea', '#ffdac4', '#f3bca2'], BE = ['#ecc8a8', '#cfa07e', '#b08466'], PAN = ['#ffffff', '#dbe1ec', '#b1bbce'];
    const SH = ['#ffe6dc', '#f6ae9e', '#e08e84'], JE = ['#e4eeff', '#a4bce8', '#8098cc'], SHOE = ['#d8c4b8', '#b49c94', '#94807a'];
    piece(g, t => { t.ell(10.2, 30.6, 1.7, 2.1, flat(JE)); t.ell(14.2, 30.6, 1.7, 2.1, flat(JE)); });
    piece(g, t => { t.ell(9.8, 32.4, 2.2, 1.05, flat(SHOE)); t.ell(14.8, 32.4, 2.2, 1.05, flat(SHOE)); });
    piece(g, t => { PX.stroke(t, [[8.4, 24.6], [6.6, 27.6]], 1.25, 1.15, SH[2]); t.ell(6.4, 28.2, 1.3, 1.3, flat(SK)); });
    piece(g, t => soft(t, 12.2, 26.6, 4.9, 4.4, SH));
    piece(g, t => { rrect(t, 9.4, 26.4, 15, 30.8, 1.2, JE[1]); softShade(t, 12.2, 28.6, 3, 2.4, JE, { hl: false }); });
    g.dots([[10.4, 27.2], [14, 27.2]], '#ffe27a');
    const hy = f ? 17.8 : 19.6, hx = f ? 20.8 : 20.2;
    piece(g, t => { PX.stroke(t, [[15.6, 25], [18.4, 23], [hx - 0.4, hy + 1.2]], 1.25, 1.15, SH[1]); t.ell(hx, hy, 1.6, 1.6, flat(SK)); t.ell(hx - 1.2, hy - 1.1, 0.55, 0.85, flat(SK), -0.4); });
    piece(g, t => { // wild hair spikes poking out under the pan, mostly at the back
      for (const [bx, by, tx, ty, w] of [[4.6, 8.4, 0.9, 7.2, 1.7], [4, 11.2, 0.8, 11.8, 1.6], [4.4, 13.8, 1.4, 16, 1.4], [19.4, 8.4, 22.6, 9.4, 1.4], [19.8, 11, 22.4, 13, 1.2]]) {
        const a = Math.atan2(ty - by, tx - bx) + Math.PI / 2; t.poly([[bx + Math.cos(a) * w, by + Math.sin(a) * w], [tx, ty], [bx - Math.cos(a) * w, by - Math.sin(a) * w]], BE[1]);
      }
    });
    piece(g, t => soft(t, 12, 13.8, 9.4, 8.9, SK));
    piece(g, t => { // a scruffy beard hugging the jaw, curving up round the mouth, with sideburns and tufts along the bottom
      t.ell(12.6, 19.2, 8.6, 4.9, BE[1]);
      for (const [x, y, rx] of [[6.4, 21.6, 1.8], [9.4, 23, 2], [12.8, 23.5, 2.1], [16.2, 23, 2], [19, 21.4, 1.7]]) t.ell(x, y, rx, 1.5, BE[1]);
      t.ell(5.0, 15.6, 1.0, 2.4, BE[1], 0.15); t.ell(20.2, 15.8, 1.2, 2.8, BE[1], -0.15);
      t.ell(14.4, 16.4, 4.6, 2.9, null);
      softShade(t, 12.6, 20.4, 8.6, 3.6, BE, { hl: false });
    });
    AR.chibiMouth && AR.chibiMouth(g, 14.8, 17.6, 'open', 3);
    AR.chibiEyes && AR.chibiEyes(g, 14, 12.6, { sp: 7, w: 4, h: 5.2, mood: f ? 'happy' : undefined });
    AR.blush && AR.blush(g, 14, 15.6, { sp: 9.2, w: 1.3, h: 0.7 });
    piece(g, t => { PX.stroke(t, [[19, 6.6], [22.2, 5.6]], 0.85, 0.8, '#aeb8cc'); t.ell(22.3, 5.6, 0.85, 0.85, '#aeb8cc'); });
    piece(g, t => { rrect(t, 4, 1.4, 19.6, 7, 2, PAN[1]); softShade(t, 11.8, 4.2, 8, 3, PAN); });
    piece(g, t => { rrect(t, 2.8, 6, 20.8, 8.2, 1.1, PAN[1]); softShade(t, 11.8, 7.1, 9, 1.4, PAN, { hl: false }); });
    PX.stroke(g, [[5.6, 3], [7.6, 2.4]], 0.3, 0.3, '#ffffff');
    g.outerLine();
  }
  const daveCache = {};
  PX.crazyDave = function (frame) {
    const f = frame ? 1 : 0; if (daveCache[f]) return daveCache[f];
    const g = new Grid(24, 34);
    try { drawDave(g, f); } catch (e) { console.error('PX.crazyDave', e); }
    return (daveCache[f] = g.canvas());
  };

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
