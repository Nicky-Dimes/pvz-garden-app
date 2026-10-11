// art-world3.js — PVZ Garden: 4 more garden maps (Pool Party, Foggy Night, Rooftop, Candy Land), their props, houses and race scenery.
// Loaded after art-world2.js and before data.js / garden.js / race.js. Adds (the same contract as art-world2.js):
//   PX.PVZ_PROP[kind]          new garden props { w, h, draw(g, theme) }, anchor bottom-centre (floor(w / 2), h)
//   PX.pvzHouse(F)             wrapped again: new facade kinds 'poolhouse' | 'cottage' | 'attic' | 'gingerbread'
//                              (74 x 70 like the old house; .meta = { door: [x, y], win: [[x, y]...] })
//   PX.GARDEN_TREE_SLOTS[kind] where 3 fruit hang on each new fruit tree (share of sprite width / height from the base)
//   PX.GARDEN_GLOWS[kind]      night glow for the new lit props: [x share, y share from the bottom, radius, 'r,g,b']
//   PX.GARDEN_MAPS[id]         the 4 maps (same schema as THM in garden.js)
//   PX.RACE_MAPS[id]           race scenery for the 4 maps (same keys as TH in race.js)
// Recipe hooks these maps lean on beyond art-world2's: garden.js mountShape 'town' (a skyline of houses with lit windows),
// rooftiles (the lawn drawn as clay roof tiles) and mist (soft fog drifting over the yard); race.js far2 'town'.
// Style: TRUE chibi stickers like art-world.js (docs/pvz-art-guide.md): round chunky shapes, flat pastel fills with one soft
// shade crescent and a small highlight, thin piece outlines plus a bold outer ring (g.outerLine()).
(function () {
  'use strict';
  if (!window.PX || !PX.Grid) return;
  const { Grid, INK } = PX;
  const AR = PX.art || {};
  const mixHex = AR.mixHex || PX.mixHex || (a => a);
  const WHITE = '#ffffff', EYE = '#2b2129';

  // ---------------- helpers (the same kit as art-world2.js) ----------------
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
  // stripes and swirls: recolour what is already drawn on t wherever band(x, y) says so; col may map the old colour
  // (so a stripe keeps the soft shade: c => c === R[2] ? stripeShade : stripe)
  function bands(t, band, col) {
    const K = t.k || 1;
    for (let fy = 0; fy < t.fh; fy++) for (let fx = 0; fx < t.fw; fx++) {
      const i = fy * t.fw + fx, c = t.a[i]; if (!c || c === INK) continue;
      if (band((fx + 0.5) / K, (fy + 0.5) / K)) t.a[i] = typeof col === 'function' ? col(c) : col;
    }
  }
  // night: a soft blue tint (like art-world.js)
  const nt = (R, th, k) => (th === 'night' ? R.map(c => mixHex(c, '#7f88cc', k == null ? 0.18 : k)) : R);
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
  // a donut wheel (two pieces: tyre and hub)
  function wheel(g, x, y, r, R, hub) { piece(g, t => soft(t, x, y, r, r, R, { hl: false })); g.ell(x, y, r * 0.4, r * 0.4, hub || R[0]); }
  // one round-bottomed roof shingle seam, centred on (x, y) (rows of these make a tiled roof)
  const arc = (x, y, w, d) => { const pts = []; for (let a = 0; a <= Math.PI + 0.01; a += Math.PI / 6) pts.push([x - Math.cos(a) * w, y - d + Math.sin(a) * d]); return pts; };
  // a soft puff of smoke rising up and to the right: see-through round clouds that shrink as they rise. Drawn AFTER the
  // outer line, so no ink rings it (outlined puffs read as a stack of balls)
  const smoke = (g, x, y, r, n) => { [[0, 0, 1], [r * 0.8, -r * 1.85, 0.68], [r * 1.3, -r * 3.1, 0.44]].slice(0, n || 3).forEach(([dx, dy, k]) => { const R = r * k; g.ell(x + dx, y + dy, R, R * 0.86, 'rgba(250,248,255,0.72)'); g.ell(x + dx - R * 0.22, y + dy - R * 0.18, R * 0.6, R * 0.5, 'rgba(255,255,255,0.92)'); }); };
  // a candy cane's hook: from the top of the shaft (x0, y0) over a half circle of radius r (dir +1 hooks right, -1 left)
  const caneHook = (x0, y0, r, dir) => { const pts = []; for (let i = 0; i <= 10; i++) { const a = dir > 0 ? -Math.PI + i * Math.PI / 10 : -i * Math.PI / 10; pts.push([x0 + dir * r + Math.cos(a) * r, y0 + Math.sin(a) * r]); } pts.push([x0 + dir * r * 2, y0 + 1.6]); return pts; };
  // a little lollipop / peppermint swirl inside a disc already drawn on g
  // a small glossy eye (about 4 x 5 fine px) for tiny creatures: chibiEyes' shine never shrinks below 0.6 px, so on an eye
  // under 2 px wide it swallows the eye. A solid dark oval with a 2 x 2 shine inside it (put x on a whole fine pixel)
  const smallEye = (g, x, y, w, h) => { g.ell(x, y, w / 2, h / 2, EYE); const fx = Math.round((x - w / 2) * g.k) + 1, fy = Math.round((y - h / 2) * g.k) + 1; for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) g.fset(fx + a, fy + b, WHITE); };
  const swirl = (g, x, y, r, col, th) => { const pts = []; for (let a = 0; a < 9; a += 0.35) pts.push([x + Math.cos(a) * a / 9 * r * 0.85, y + Math.sin(a) * a / 9 * r * 0.85]); lineIn(g, pts, th || 0.24, col); };

  const P = {};
  const WOOD = ['#fbe4c8', '#e6b88e', '#c99870'];
  const IRON = ['#eceaf6', '#bcb8d4', '#9a96b8'];
  const SILVER = ['#fbfcff', '#dde4f0', '#b8c2d6'];
  const WHITE3 = ['#ffffff', '#f2f4fa', '#d6dae8'];
  const SUGAR = ['#ffffff', '#ffffff', '#e8dcea'];
  const POOLB = ['#e8f8ff', '#a8def6', '#86c0e4'];
  const AQUA = ['#e4fbf8', '#9ee2dc', '#78c6c2'];
  const PINK = ['#ffe2ea', '#ffa8bc', '#ec86a0'];
  const LEMON = ['#fffae0', '#ffe27a', '#f0c060'];
  const PEACH = ['#fff2e8', '#ffc4a4', '#f2a488'];
  const LILAC = ['#f4ecff', '#cbb6f2', '#a894da'];
  const MINT = ['#eafff4', '#b4ecd2', '#8ed0b4'];
  const LEAF = ['#e2f6c4', '#a8dc88', '#84c06e'];
  const LEAF2 = ['#d8f0bc', '#8ccc76', '#6eb062'];
  const TERRA = ['#ffe2d0', '#f4ac8c', '#d88a70'];
  const BRICK = ['#ffdcd2', '#f0a496', '#d08478'];
  const RUBBER = ['#e8e6f4', '#aeaac8', '#8c88aa'];
  const DOVE = ['#f6f2fc', '#cfc8e4', '#aca2c8'];
  const ORANGE = ['#fff0dc', '#ffbc74', '#f09c58'];
  const CHERRY = ['#ffd4dc', '#ff8ea4', '#e46c86'];

  // =====================================================================================================
  // Pool Party
  // =====================================================================================================
  // a pool cleaner (the Pool Party mower): a baby-blue scrubber on donut wheels, a curly hose behind, bubbles in front
  P.poolcleaner = { w: 21, h: 13, draw(g, th) {
    const B = nt(POOLB, th), W = nt(WHITE3, th), H = nt(LILAC, th);
    piece(g, t => line(t, [[4.4, 6.4], [2.2, 5.2], [1.4, 3.2], [2.4, 1.4], [4.6, 1.2], [5.8, 2.4]], 0.6, H[1]));
    piece(g, t => { box(t, 2.4, 3.4, 16.2, 10.8, 3.2, B[1]); softShade(t, 9.3, 7, 6.8, 3.7, B); });
    piece(g, t => t.ell(9.4, 3.7, 4.6, 1.5, W[0]));
    lineIn(g, [[2.6, 7.8], [16, 7.8]], 0.45, W[0]);
    // the scrubber at the front with its bristle slots
    piece(g, t => { box(t, 14.4, 5.4, 19.8, 10.9, 1.6, W[1]); softShade(t, 17.1, 8.1, 2.7, 2.7, W, { hl: false }); });
    for (const x of [15.9, 17.3, 18.7]) lineIn(g, [[x, 6.6], [x, 9.8]], 0.2, W[2]);
    wheel(g, 6.2, 10.7, 2.1, nt(RUBBER, th)); wheel(g, 12.4, 10.7, 2.1, nt(RUBBER, th));
    piece(g, t => { t.ell(19.4, 3, 1.1, 1.1, '#e8fbff'); t.ell(17.8, 1.2, 0.7, 0.7, '#e8fbff'); });
    g.outerLine();
  } };
  // a diving board: a chunky stand with a curly hand rail, the springy board pointing out over the pool (to the right)
  P.divingboard = { w: 26, h: 17, draw(g, th) {
    const S = nt(['#f6faff', '#d8e4f4', '#b6c6de'], th), B = nt(AQUA, th), R = nt(IRON, th);
    piece(g, t => line(t, [[2.2, 16.4], [2.2, 7.4], [3, 5.2], [5.4, 4.6]], 0.45, R[1]));
    piece(g, t => { box(t, 3.4, 8.4, 10.8, 16.6, 1.2, S[1]); softShade(t, 7.1, 12.5, 3.7, 4.1, S, { hl: false }); });
    for (const y of [11, 13.8]) lineIn(g, [[3.8, y], [10.4, y]], 0.22, S[2]);
    piece(g, t => line(t, [[10.4, 9.6], [14, 7.8]], 0.5, R[1]));
    piece(g, t => { PX.stroke(t, [[4.2, 7.4], [14, 7.2], [20.6, 6.6], [24.8, 5.6]], 1.25, 1.05, B[1]); softShade(t, 14.5, 6.8, 10.6, 1.4, B, { hl: false }); });
    lineIn(g, [[5.2, 6.9], [14, 6.7], [20.6, 6.1], [24.2, 5.2]], 0.28, B[0]);
    g.outerLine();
  } };
  // a striped deck chair (front view): canvas back and seat on a wooden frame with arm rests
  P.deckchair = { w: 15, h: 16, draw(g, th) {
    const W = nt(WOOD, th), C = nt(['#e6f8ff', '#9fd8f2', '#7cbcde'], th), S = nt(WHITE3, th);
    piece(g, t => { line(t, [[3, 15.6], [4.2, 10.4]], 0.5, W[2]); line(t, [[12, 15.6], [10.8, 10.4]], 0.5, W[2]); });
    piece(g, t => {
      box(t, 3, 2.2, 12, 10.6, 1.4, C[1]); box(t, 1.8, 9.4, 13.2, 12.6, 1.2, C[1]); softShade(t, 7.5, 7.4, 5, 5.4, C, { hl: false });
      bands(t, x => (Math.floor((x - 1.2) / 1.5) & 1) === 1, c => (c === C[2] ? S[2] : S[0]));
    });
    piece(g, t => { box(t, 2.2, 1.2, 12.8, 2.8, 0.7, W[1]); box(t, 0.8, 8.2, 3.6, 9.6, 0.6, W[1]); box(t, 11.4, 8.2, 14.2, 9.6, 0.6, W[1]); });
    g.outerLine();
  } };
  // a big sunny umbrella of yellow and white panels over a little round table with a glass of lemonade
  P.poolumbrella = { w: 23, h: 28, draw(g, th) {
    const Y = nt(LEMON, th), W = nt(WHITE3, th), T = nt(AQUA, th);
    piece(g, t => box(t, 10.8, 8, 12.2, 27.6, 0.5, W[2]));
    piece(g, t => t.ell(11.5, 27, 3.4, 0.8, W[1]));
    piece(g, t => { t.ell(11.5, 20.8, 6, 1.6, W[1]); softShade(t, 11.5, 20.8, 6, 1.6, W, { hl: false }); });
    piece(g, t => { box(t, 14, 16.8, 16, 20.2, 0.5, '#f4fcff'); bands(t, (x, y) => y > 17.8, '#fff0a0'); });
    line(g, [[15.4, 17], [16.6, 15.2]], 0.2, '#ffa8bc');
    // the canopy: a dome whose panels fan out from the top, a scalloped edge
    piece(g, t => {
      t.ell(11.5, 11, 10.8, 8, Y[1], 0, (x, y) => y <= 11);
      for (let x = 1.6; x < 22; x += 3.3) t.ell(x, 11.2, 1.75, 1.5, Y[1]);
      softShade(t, 11.5, 8, 10.8, 5, Y, { hl: false });
      bands(t, (x, y) => (Math.floor((Math.atan2(x - 11.5, 15 - y) + 1.6) / 0.42) & 1) === 1, c => (c === Y[2] ? W[2] : W[0]));
    });
    piece(g, t => soft(t, 11.5, 2.6, 1.3, 1.3, T, { hl: false }));
    g.outerLine();
  } };
  // a yellow ducky pool ring lying on the grass, the duck's happy head at the front
  P.duckyring = { w: 18, h: 12, draw(g, th) {
    const Y = nt(LEMON, th), O = nt(ORANGE, th);
    piece(g, t => t.poly([[0.8, 6.6], [2.6, 4.2], [3.8, 6.8]], Y[1]));
    piece(g, t => { t.ell(7.4, 8.4, 6.6, 3.2, Y[1]); t.ell(7.4, 8, 2.8, 1.2, null); softShade(t, 7.4, 8.4, 6.6, 3.2, Y); });
    piece(g, t => soft(t, 12.4, 4.4, 3.2, 3.1, Y));
    piece(g, t => { t.ell(15.9, 5.3, 1.3, 0.8, O[1]); });
    // a big glossy eye on a thin dark backing, so the shine sits inside the eye instead of swallowing it
    g.ell(13.4, 4.2, 1.15, 1.4, EYE);
    if (AR.chibiEyes) AR.chibiEyes(g, 13.4, 4.2, { one: true, sp: 0, w: 1.8, h: 2.3 });
    if (AR.blush) AR.blush(g, 13.9, 6, { one: true, sp: 0, w: 0.65, h: 0.38 });
    g.outerLine();
  } };
  // a pink flamingo pool float: a fat ring, a curvy neck and a round head with a happy face
  P.flamingo = { w: 18, h: 18, draw(g, th) {
    const PK = nt(PINK, th), B = nt(['#fff6ee', '#ffd8b8', '#f2b48e'], th);
    piece(g, t => { t.poly([[0.8, 11.2], [3.6, 9.4], [4.4, 12.4]], PK[1]); t.poly([[1, 13.8], [3.6, 11.4], [4.6, 13.8]], PK[1]); });
    piece(g, t => { t.ell(8, 13.6, 7, 3.4, PK[1]); t.ell(8, 13.2, 2.9, 1.25, null); softShade(t, 8, 13.6, 7, 3.4, PK); });
    piece(g, t => { PX.stroke(t, [[11.6, 12.4], [13.6, 9.6], [13.4, 7], [11.8, 5]], 1.3, 1, PK[1]); soft(t, 12.4, 4, 2.7, 2.6, PK); });
    piece(g, t => t.poly([[14.4, 3.4], [17.4, 4.6], [16.6, 6.4], [14.6, 5.4]], B[1]));
    g.ell(16.8, 5.4, 1, 1.5, '#7a6a84', 0.3, IN(g));
    if (AR.chibiEyes) AR.chibiEyes(g, 12.8, 3.6, { one: true, sp: 0, w: 1.3, h: 1.6, mood: 'happy' });
    if (AR.blush) AR.blush(g, 13.1, 5, { one: true, sp: 0, w: 0.7, h: 0.4 });
    g.outerLine();
  } };
  // a palm in a big white planter with an aqua band like the pool tiles (a fruit tree)
  P.poolpalm = { w: 28, h: 40, draw(g, th) {
    const TR = nt(['#f8ead4', '#e2c6a0', '#c4a47e'], th), L = nt(LEAF, th), L2 = nt(LEAF2, th), PT = nt(WHITE3, th), BAND = nt(AQUA, th);
    for (let i = 8; i >= 0; i--) { const k = i / 9; piece(g, t => t.ell(13.4 + 2.4 * k * k, 33 - k * 21, 2.4 - k * 0.5, 1.8, flat(TR))); }
    const cx = 15.6, cy = 12;
    const fr = [[[cx, cy], [10.4, 10.6], [5.6, 12.6], [2.2, 17.2], L2], [[cx, cy], [20.6, 10.6], [24.6, 12.8], [26.6, 17.4], L2], [[cx, cy], [11.4, 7.2], [6.6, 6], [2.6, 7.8], L],
      [[cx, cy], [19.6, 6.8], [23.6, 6], [26.4, 8.4], L], [[cx, cy], [14, 5.2], [12.2, 1.8], null, L], [[cx, cy], [17.4, 4.8], [19.6, 1.8], null, L]];
    for (const f of fr) { const R = f.pop(), pts = f.filter(Boolean); piece(g, t => PX.stroke(t, pts, 2.1, 0.8, R[1])); lineIn(g, pts, 0.22, R[0]); }
    piece(g, t => { box(t, 6.6, 31.4, 21.4, 39.6, 2.2, PT[1]); box(t, 5.6, 30.2, 22.4, 33, 1.2, PT[0]); softShade(t, 14, 35.4, 7.4, 4.2, PT, { hl: false }); });
    lineIn(g, [[6.8, 35.4], [21.2, 35.4]], 0.75, BAND[1]);
    for (let x = 8.6; x < 21; x += 2.4) g.dot(x, 35.4, BAND[0]);
    g.outerLine();
  } };

  // =====================================================================================================
  // Foggy Night (cute, not scary: warm lanterns, a sleepy owl, curly trees)
  // =====================================================================================================
  // a curly shepherd's-hook post with a round paper lantern glowing on the end (glows at night)
  P.hooklantern = { w: 13, h: 27, draw(g, th) {
    const I = nt(['#f0ecfa', '#c4bce0', '#a49cc8'], th, 0.1), LA = ['#fffbe8', '#ffdc96', '#f6b476'], CAP = nt(['#ece6f6', '#b0a6cc', '#8e84ae'], th, 0.1);
    piece(g, t => { t.ell(3.4, 26.3, 2.6, 0.8, I[1]); line(t, [[3.4, 26.4], [3.4, 5.4], [4, 3], [6, 1.4], [8.4, 1.4], [10, 2.6], [10.2, 4.2]], 0.5, I[1]); line(t, [[3.4, 11], [2, 10.2], [1.6, 9], [2.4, 8.4]], 0.32, I[1]); });
    piece(g, t => line(t, [[10.2, 4.2], [10.2, 6.6]], 0.2, CAP[2]));
    piece(g, t => soft(t, 10, 10.4, 2.7, 3.3, LA));
    for (const dx of [-1.25, 0, 1.25]) { const pts = []; for (let y = 7.6; y <= 13.2; y += 0.5) pts.push([10 + dx * Math.sqrt(Math.max(0, 1 - ((y - 10.4) / 3.3) ** 2)), y]); lineIn(g, pts, 0.15, LA[2]); }
    piece(g, t => { box(t, 8.6, 6.4, 11.4, 7.6, 0.4, CAP[1]); box(t, 8.8, 13.2, 11.2, 14.4, 0.4, CAP[1]); });
    piece(g, t => line(t, [[10, 14.4], [10, 16.2]], 0.25, '#ffb2c8'));
    g.outerLine();
    twinkleF(g, 12.4, 8, '#ffe2a0');
  } };
  // a clump of lantern flowers: arching stems, each ending in a drooping glowing bulb (glows at night)
  P.lanternflowers = { w: 17, h: 18, draw(g, th) {
    const L = nt(['#d8f4e8', '#8ccfb4', '#6cb29a'], th), ST = nt(['#c8ecd8', '#7ab89c', '#5e9c84'], th);
    const BL = [['#fffde8', '#fff0a8', '#f6d27a'], ['#effff8', '#c4f6e0', '#96dcc0'], ['#fff6fc', '#ffd4ec', '#f2acd0']];
    const stems = [[[8, 16], [6.6, 9.6], [4.4, 5.4], [2.8, 4.6]], [[8.6, 16], [9, 7.4], [10.6, 3.4], [12.6, 2.6]], [[8.8, 16], [12, 11], [14.2, 8.6]]];
    for (const s of stems) piece(g, t => line(t, s, 0.36, ST[1]));
    [[2.8, 7.2], [13, 5.2], [14.4, 11.2]].forEach(([x, y], i) => { piece(g, t => soft(t, x, y, 2, 2.4, BL[i])); piece(g, t => t.ell(x, y - 2.3, 1.1, 0.6, ST[1])); });
    piece(g, t => { t.ell(5.4, 16.4, 3.4, 1.2, L[1], -0.3); t.ell(11.6, 16.4, 3.4, 1.2, L[1], 0.3); t.ell(8.5, 15.6, 2, 1.6, L[1]); });
    g.outerLine();
  } };
  // a cute bare tree whose branches roll up into curls (a fruit tree). Every curl keeps clear of the others: where two
  // crossed, the dark gaps between them made a little ghost face in the crown
  P.curlytree = { w: 28, h: 38, draw(g, th) {
    const TR = nt(['#f6e6f2', '#d2b2cc', '#ae90aa'], th, 0.1);
    // a branch running to e, then rolling up into a curl of radius r (dir +1 rolls over to the left, -1 to the right)
    const curl = (e, r, a0, dir) => { const cx = e[0] - Math.cos(a0) * r, cy = e[1] - Math.sin(a0) * r, pts = []; for (let i = 0; i <= 16; i++) { const a = a0 + dir * i * 0.42, rr = r * (1 - i / 22); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } return pts; };
    // four branches fanning out (no centre branch: its curl ran into the upper-left one)
    const BR = [[[[13.6, 25], [9.4, 21.4], [6.2, 16.6]], 2.6, Math.PI / 2, 1], [[[14.4, 24.6], [18.6, 21], [21.8, 16.2]], 2.6, Math.PI / 2, -1],
      [[[13.8, 20], [11.6, 13.4], [8.8, 8.8]], 2.5, Math.PI / 2, 1], [[[14.2, 20], [16.4, 13.4], [19.2, 8.8]], 2.5, Math.PI / 2, -1]];
    piece(g, t => {
      PX.stroke(t, [[14, 37.2], [14, 30], [13.4, 24], [14, 18.6]], 2.6, 1.6, TR[1]);
      t.ell(14, 37, 5, 1.3, TR[1]); t.ell(10.4, 36.6, 1.8, 1, TR[1]); t.ell(17.6, 36.6, 1.8, 1, TR[1]);
      for (const [pts, r, a0, dir] of BR) { PX.stroke(t, pts, 1.15, 0.75, TR[1]); PX.stroke(t, curl(pts[pts.length - 1], r, a0, dir), 0.75, 0.45, TR[1]); }
      softShade(t, 14, 22, 11, 15, TR, { hl: false });
    });
    for (const pts of [[[13.2, 34], [13.6, 30]], [[14.8, 28.6], [14.6, 25.6]]]) lineIn(g, pts, 0.18, TR[2]);
    // a few tiny glowing buds along the branches
    for (const [x, y] of [[8.2, 19.6], [20, 19.4], [10.9, 12.2], [17.3, 11.2]]) piece(g, t => t.ell(x, y, 0.75, 0.75, '#dff8f0'));
    g.outerLine();
  } };
  // a sleepy-cute owl on a tree stump: ear tufts, big glossy eyes on pale discs, a tiny beak. The discs are cream, not white:
  // white discs swallowed the eyes' white shine, which broke each eye into squint / wink marks
  P.owlstump = { w: 15, h: 20, draw(g, th) {
    const S = nt(['#f6e2cc', '#d8b08e', '#b88e70'], th, 0.12), O = nt(DOVE, th, 0.08), BE = nt(['#f4ecdc', '#f8f2e8', '#ddd4ec'], th, 0.05), OR = ORANGE;
    piece(g, t => { box(t, 2.4, 12.6, 12.6, 19.4, 1.4, S[1]); t.ell(1.8, 19, 1.6, 0.8, S[1]); t.ell(13.2, 19, 1.6, 0.8, S[1]); softShade(t, 7.5, 16, 5, 3.4, S, { hl: false }); });
    piece(g, t => t.ell(7.5, 12.8, 5.1, 1.5, S[0]));
    g.ell(7.5, 12.8, 2.8, 0.75, S[1], 0, IN(g)); g.ell(7.5, 12.8, 1.2, 0.35, S[0], 0, IN(g));
    for (const x of [4.6, 7.4, 10.4]) lineIn(g, [[x, 14.6], [x, 18.8]], 0.18, S[2]);
    piece(g, t => { t.ell(3.1, 8.8, 1.4, 2.6, O[2], 0.3); t.ell(11.9, 8.8, 1.4, 2.6, O[2], -0.3); });
    piece(g, t => { t.poly([[3.2, 4.8], [3.6, 1.4], [6, 3.6]], O[1]); t.poly([[11.8, 4.8], [11.4, 1.4], [9, 3.6]], O[1]); soft(t, 7.5, 7.6, 4.8, 4.9, O); });
    g.ell(7.5, 10.4, 2.8, 1.9, BE[1], 0, IN(g));
    // the discs stay a little wider than the eyes so a cream rim shows all round each one
    // (eye centres on whole fine pixels, so both shines come out the same clean shape)
    for (const x of [5.5, 9.5]) g.ell(x, 7, 2.3, 2.4, BE[0], 0, IN(g));
    // a thin dark backing round each eye keeps the big shine inside one solid dark oval
    for (const x of [5.5, 9.5]) g.ell(x, 7, 1.47, 1.72, EYE);
    if (AR.chibiEyes) AR.chibiEyes(g, 7.5, 7, { sp: 4, w: 2.5, h: 3 });
    g.poly([[6.9, 8.9], [8.1, 8.9], [7.5, 10]], OR[1]);
    if (AR.blush) AR.blush(g, 7.5, 9.5, { sp: 6.6, w: 0.7, h: 0.4 });
    piece(g, t => { t.ell(6, 12.3, 0.8, 0.5, OR[1]); t.ell(9, 12.3, 0.8, 0.5, OR[1]); });
    g.outerLine();
  } };
  // a little pile of pastel pumpkins (no faces) with a curly vine
  P.pumpkins = { w: 19, h: 12, draw(g, th) {
    const PU = [nt(['#fff0dc', '#ffc890', '#f2a46c'], th, 0.12), nt(['#ffeee6', '#ffbca4', '#ec9a84'], th, 0.12), nt(['#fffbe6', '#fbe4a8', '#e8c47e'], th, 0.12)];
    const ST = nt(['#e6f4c8', '#9cc87a', '#7aa862'], th, 0.12);
    const pk = (x, y, rx, ry, R) => {
      piece(g, t => { t.ell(x - rx * 0.42, y, rx * 0.62, ry, R[1]); t.ell(x + rx * 0.42, y, rx * 0.62, ry, R[1]); t.ell(x, y, rx * 0.6, ry * 1.03, R[1]); softShade(t, x, y, rx, ry, R); });
      for (const d of [-0.42, 0.42]) { const pts = []; for (let yy = y - ry + 0.7; yy <= y + ry - 0.7; yy += 0.5) pts.push([x + d * rx * (0.55 + 0.45 * Math.sqrt(Math.max(0, 1 - ((yy - y) / ry) ** 2))), yy]); lineIn(g, pts, 0.16, R[2]); }
      piece(g, t => line(t, [[x, y - ry + 0.4], [x + 0.6, y - ry - 1.2]], 0.45, ST[2]));
    };
    pk(9.6, 6.6, 4.8, 3.8, PU[0]);
    piece(g, t => t.ell(13.6, 3.2, 1.9, 1, ST[1], -0.5));
    pk(4.4, 8.6, 3.4, 2.7, PU[1]);
    pk(14.8, 8.8, 3.4, 2.6, PU[2]);
    line(g, [[10.6, 2.4], [11.6, 1.2], [12.8, 1.6], [12.4, 2.6]], 0.18, ST[2]);
    g.outerLine();
  } };
  // a wooden signpost with two arrows: a star painted on one, a moon on the other
  P.signpost = { w: 15, h: 21, draw(g, th) {
    const W = nt(WOOD, th, 0.14), W2 = nt(['#f6e6d4', '#d8b898', '#b89878'], th, 0.14), PA = '#fff2b0';
    piece(g, t => { box(t, 6.6, 2.4, 8.4, 20.6, 0.6, W[2]); t.ell(7.5, 20.4, 2.6, 0.8, W[2]); });
    piece(g, t => { t.poly([[1.6, 4], [11.4, 4], [13.8, 6.2], [11.4, 8.4], [1.6, 8.4]], W[1]); softShade(t, 7.5, 6.2, 6, 2.2, W, { hl: false }); });
    piece(g, t => { t.poly([[13.2, 10], [3.6, 10], [1.2, 12.2], [3.6, 14.4], [13.2, 14.4]], W2[1]); softShade(t, 7.5, 12.2, 6, 2.2, W2, { hl: false }); });
    g.poly(PX.starPts(6.6, 6.2, 1.8, 0.8, 5), PA);
    g.ell(8, 12.2, 1.6, 1.6, PA); g.ell(8.8, 11.6, 1.35, 1.35, W2[1]);
    for (const [x, y] of [[2.6, 6.2], [12.2, 12.2]]) g.dot(x, y, W[2]);
    g.outerLine();
  } };

  // =====================================================================================================
  // Rooftop
  // =====================================================================================================
  // a roof cleaner (the Rooftop mower): a little coral cart with a push handle and a big fluffy brush roller in front
  P.roofcleaner = { w: 21, h: 13, draw(g, th) {
    const R = nt(['#ffe4e2', '#ffaaa4', '#ec8a86'], th), BR = nt(LEMON, th), M = nt(IRON, th);
    piece(g, t => { line(t, [[3.6, 5], [1.6, 1.8]], 0.45, M[1]); line(t, [[0.8, 1.7], [2.8, 1.1]], 0.55, '#9a90b0'); });
    piece(g, t => line(t, [[13.4, 7.6], [16.6, 7.6]], 0.35, M[1]));
    piece(g, t => { box(t, 2.4, 4.4, 13.6, 10.2, 2, R[1]); softShade(t, 8, 7.3, 5.6, 2.9, R); });
    lineIn(g, [[2.6, 7.6], [13.4, 7.6]], 0.4, R[0]);
    piece(g, t => soft(t, 16.6, 7.6, 3.8, 4, BR));
    for (let a = 0.3; a < 6.28; a += 0.7) lineIn(g, [[16.6 + Math.cos(a) * 1.3, 7.6 + Math.sin(a) * 1.4], [16.6 + Math.cos(a) * 3.3, 7.6 + Math.sin(a) * 3.5]], 0.16, BR[2]);
    g.ell(16.6, 7.6, 0.9, 0.9, M[1], 0, IN(g));
    wheel(g, 5.4, 10.7, 2.1, nt(RUBBER, th)); wheel(g, 11, 10.7, 2.1, nt(RUBBER, th));
    g.outerLine();
    twinkleF(g, 20.2, 2.4, '#fff3a0');
  } };
  // a brick chimney with a cap and a soft puff of smoke
  P.chimney = { w: 13, h: 25, draw(g, th) {
    const B = nt(BRICK, th), C = nt(['#fff4ee', '#e8d8d4', '#c8b4b0'], th);
    piece(g, t => { box(t, 2.6, 13, 10.4, 24.6, 0.8, B[1]); softShade(t, 6.5, 18.8, 3.9, 5.8, B, { hl: false }); });
    for (let y = 15.6, r = 0; y < 24.4; y += 2.4, r++) { lineIn(g, [[2.6, y], [10.4, y]], 0.18, B[2]); for (let x = 3.2 + (r % 2) * 1.8; x < 10.2; x += 3.6) lineIn(g, [[x, y - 2.2], [x, y - 0.2]], 0.18, B[2]); }
    piece(g, t => { box(t, 1.4, 11.4, 11.6, 14, 0.8, C[1]); softShade(t, 6.5, 12.7, 5, 1.3, C, { hl: false }); });
    g.ell(6.5, 11.9, 3, 0.55, '#a89cb4', 0, IN(g));
    g.outerLine();
    smoke(g, 5.6, 8, 2.1);
  } };
  // a TV antenna on a little base plate (thin guy wires), a pigeon resting on the top bar
  P.antenna = { w: 17, h: 27, draw(g, th) {
    const M = nt(IRON, th), BD = nt(DOVE, th);
    for (const x of [5.6, 11.4]) line(g, [[8.5, 17], [x, 24.8]], 0.15, M[2]);
    piece(g, t => { box(t, 5, 24.8, 12, 26.8, 0.8, M[1]); line(t, [[8.5, 25], [8.5, 3.4]], 0.45, M[1]); });
    for (const [y, hw] of [[6, 7], [10, 5.6], [14, 4.2]]) piece(g, t => { line(t, [[8.5 - hw, y + 0.6], [8.5 + hw, y - 0.6]], 0.36, M[1]); t.ell(8.5 - hw, y + 0.6, 0.6, 0.6, M[1]); t.ell(8.5 + hw, y - 0.6, 0.6, 0.6, M[1]); });
    piece(g, t => soft(t, 8.5, 2.6, 1.2, 1.2, nt(PINK, th), { hl: false }));
    piece(g, t => { soft(t, 3.6, 4.6, 1.9, 1.5, BD); t.ell(4.9, 3.2, 1.15, 1.05, BD[1]); });
    g.dot(5.2, 3, EYE); g.ell(6.2, 3.5, 0.5, 0.3, ORANGE[1]);
    g.outerLine();
  } };
  // a terracotta flower trough full of blooms
  P.flowerbox = { w: 21, h: 11, draw(g, th) {
    const T = nt(TERRA, th), L = nt(LEAF, th);
    piece(g, t => { for (const [x, y, a] of [[2.6, 4.6, -0.5], [6.4, 4, 0.4], [10.6, 4.4, -0.4], [14.6, 4, 0.5], [18.4, 4.6, 0.4]]) t.ell(x, y, 1.8, 0.9, L[1], a); });
    blossom(g, 4.4, 3, 1.9, nt(PINK, th)); blossom(g, 8.6, 2.4, 2, nt(LEMON, th), '#ffb870'); blossom(g, 12.8, 2.8, 1.9, nt(LILAC, th)); blossom(g, 16.8, 2.4, 2, nt(PEACH, th));
    piece(g, t => { box(t, 1.6, 5.6, 19.4, 10.8, 1.6, T[1]); softShade(t, 10.5, 8.2, 8.8, 2.6, T, { hl: false }); });
    piece(g, t => box(t, 0.8, 4.8, 20.2, 6.8, 0.8, T[0]));
    for (const x of [6.2, 10.5, 14.8]) { g.ell(x, 8.6, 0.8, 0.7, T[0], 0, IN(g)); }
    g.outerLine();
  } };
  // a weathervane: a golden rooster on an arrow over the compass cross
  P.weathervane = { w: 15, h: 26, draw(g, th) {
    const M = nt(IRON, th), GD = nt(['#fff6c8', '#ffd866', '#f0b44a'], th, 0.1);
    piece(g, t => { t.ell(7.5, 25.3, 2.8, 0.9, M[1]); box(t, 6.8, 8.4, 8.2, 25.4, 0.5, M[1]); });
    piece(g, t => { line(t, [[2, 14.4], [13, 14.4]], 0.35, M[1]); t.ell(2, 14.4, 0.7, 0.7, M[1]); t.ell(13, 14.4, 0.7, 0.7, M[1]); });
    piece(g, t => soft(t, 7.5, 14.4, 1.1, 1.1, GD, { hl: false }));
    piece(g, t => { line(t, [[2, 9.6], [12, 9.6]], 0.32, GD[1]); t.poly([[11.6, 8], [14.4, 9.6], [11.6, 11.2]], GD[1]); t.poly([[0.6, 8.2], [3.2, 9.6], [0.6, 11], [1.8, 9.6]], GD[1]); });
    piece(g, t => {
      t.poly([[3, 2.4], [5.6, 4.4], [4.6, 7.4], [2.6, 6]], GD[1]); soft(t, 7.4, 6.2, 3, 2.3, GD); soft(t, 9.9, 3.6, 1.6, 1.6, GD, { hl: false });
      line(t, [[7, 8.2], [7.2, 9.4]], 0.3, GD[2]); line(t, [[8.4, 8.2], [8.2, 9.4]], 0.3, GD[2]);
    });
    piece(g, t => { t.ell(9.7, 1.7, 0.8, 0.65, '#ffa8b4'); t.ell(10.6, 2.1, 0.6, 0.5, '#ffa8b4'); });
    g.poly([[11.3, 3.4], [12.6, 3.8], [11.3, 4.3]], ORANGE[1]); g.dot(10.3, 3.4, EYE);
    g.outerLine();
  } };
  // a wooden rain barrel: a downpipe dripping into it, water on top, a little tap
  P.rainbarrel = { w: 15, h: 17, draw(g, th) {
    const W = nt(WOOD, th), M = nt(IRON, th), WA = nt(['#e8fbff', '#9adcf2', '#74c2e6'], th);
    piece(g, t => line(t, [[2.2, 0.6], [2.2, 2.4], [4.4, 4.2], [5.6, 4.2]], 0.6, M[1]));
    piece(g, t => t.ell(6.4, 3.2, 0.6, 0.8, WA[1]));
    piece(g, t => { box(t, 2, 6, 13, 16.6, 2.4, W[1]); softShade(t, 7.5, 11.3, 5.5, 5.3, W); });
    for (const x of [4.6, 7.5, 10.4]) lineIn(g, [[x, 7.4], [x, 16]], 0.18, W[2]);
    for (const y of [8.6, 14]) lineIn(g, [[1.8, y], [13.2, y]], 0.45, M[1]);
    piece(g, t => t.ell(7.5, 6.2, 5.5, 1.6, W[0]));
    g.ell(7.5, 6.3, 4.4, 1.05, WA[1], 0, IN(g)); g.ell(6.4, 6, 1.2, 0.35, WA[0], 0, IN(g));
    piece(g, t => box(t, 11.8, 11.2, 14.6, 12.6, 0.5, M[1]));
    g.outerLine();
  } };
  // a round turbine roof vent
  P.roofvent = { w: 11, h: 12, draw(g, th) {
    const M = nt(SILVER, th);
    piece(g, t => { box(t, 3, 7.6, 8, 11.6, 0.6, M[1]); t.ell(5.5, 11.3, 3.8, 0.8, M[1]); });
    piece(g, t => soft(t, 5.5, 5.8, 4.4, 4, M));
    for (const k of [-1.6, 0, 1.6]) { const pts = []; for (let y = 2.2; y <= 9.4; y += 0.5) pts.push([5.5 + k * Math.sqrt(Math.max(0, 1 - ((y - 5.8) / 4) ** 2)) * 1.4 + (y - 5.8) * 0.45, y]); lineIn(g, pts, 0.18, M[2]); }
    piece(g, t => soft(t, 5.5, 1.6, 1, 0.8, M, { hl: false }));
    g.outerLine();
  } };
  // two plump pigeons having a chat, beak to beak. They stand far enough apart that the heads, eyes and beaks never touch:
  // close together the two heads fused into one grey lump that read as a rock at yard size
  P.pigeons = { w: 22, h: 10, draw(g, th) {
    const B = nt(DOVE, th), N = nt(['#e8fff6', '#a8e6d0', '#86ccb4'], th);
    const bird = (x, s) => {
      piece(g, t => { t.ell(x - 0.6, 9.3, 0.6, 0.45, ORANGE[1]); t.ell(x + 0.8, 9.3, 0.6, 0.45, ORANGE[1]); });
      piece(g, t => { t.poly([[x - s * 2.6, 6], [x - s * 4.8, 4.6], [x - s * 3.9, 7.8]], B[2]); soft(t, x, 6.6, 3.4, 2.6, B); });
      // a teal collar band round the neck, just under the head
      lineIn(g, [[x - s * 0.5, 5.2], [x + s * 0.9, 6.3], [x + s * 2.4, 6.6], [x + s * 3.3, 6]], 0.48, N[1]);
      piece(g, t => soft(t, x + s * 2.1, 3.5, 2.2, 2.1, B, { hl: false }));
      g.poly([[x + s * 3.9, 3.4], [x + s * 5, 3.9], [x + s * 3.9, 4.4]], ORANGE[1]);
      smallEye(g, x + s * 2.3, 3.25, 2, 2.4);
      // (a fine pixel below the eye: touching it, the blush read as a tear)
      if (AR.blush) AR.blush(g, x + s * 2.1, 5.25, { one: true, sp: 0, w: 0.8, h: 0.3 });
    };
    bird(5.2, 1); bird(16.8, -1);
    g.outerLine();
  } };
  // a round tree with pink blossoms in a wooden planter box (a fruit tree for the roof garden)
  P.plantertree = { w: 28, h: 38, draw(g, th) {
    const W = nt(WOOD, th), TR = nt(['#f2dccc', '#ceaa90', '#ae8c74'], th), L = nt(['#e6f8c8', '#a6dc84', '#82c06a'], th), L2 = nt(LEAF2, th);
    piece(g, t => { box(t, 12.6, 18, 15.4, 31.4, 0.8, TR[1]); line(t, [[14, 24], [10.6, 20.6]], 0.8, TR[1]); });
    piece(g, t => { for (const [x, y, r] of [[6.6, 17, 5], [21.4, 17, 5], [14, 18.6, 5.6]]) t.ell(x, y, r, r * 0.84, L2[1]); softShade(t, 14, 17, 12, 4.6, L2, { hl: false }); });
    piece(g, t => { for (const [x, y, rx, ry] of [[14, 10.6, 10.4, 8.4], [7, 12.4, 5.8, 4.8], [21, 12.4, 5.8, 4.8], [10.4, 5, 5.2, 4.2], [17.6, 5.2, 5.2, 4]]) t.ell(x, y, rx, ry, L[1]); softShade(t, 14, 10.6, 13, 9, L); });
    for (const [x, y] of [[8.4, 8.6], [19.6, 10], [13.4, 3.8], [5.4, 15.4], [22.4, 15]]) blossom(g, x, y, 1.3, nt(PINK, th));
    piece(g, t => { box(t, 6.6, 30, 21.4, 37.6, 1.2, W[1]); softShade(t, 14, 33.8, 7.4, 3.8, W, { hl: false }); });
    piece(g, t => box(t, 5.8, 29, 22.2, 31, 0.8, W[0]));
    for (const y of [33.4, 35.8]) lineIn(g, [[7, y], [21, y]], 0.18, W[2]);
    for (const x of [8.4, 19.6]) lineIn(g, [[x, 31.2], [x, 37.2]], 0.3, W[2]);
    g.outerLine();
  } };

  // =====================================================================================================
  // Candy Land
  // =====================================================================================================
  // a little candy car (the Candy Land mower): a pink car with icing on top, a cherry, frosted donut wheels
  P.candycar = { w: 21, h: 13, draw(g, th) {
    const PK = nt(['#ffeaf2', '#ffb8d2', '#f094b8'], th), DO = nt(['#fbe6c8', '#e2b484', '#c49464'], th), FR = nt(['#fff0f8', '#ffc4e0', '#f0a0c8'], th);
    piece(g, t => { line(t, [[10.6, 2.6], [11.8, 0.6]], 0.25, '#7ab88a'); soft(t, 10.2, 3, 1.5, 1.4, CHERRY); });
    piece(g, t => { box(t, 2.2, 5, 18.6, 10.4, 2.6, PK[1]); box(t, 5.4, 3.4, 14.6, 6.8, 2, PK[1]); softShade(t, 10.4, 7.2, 8, 3.2, PK); });
    piece(g, t => box(t, 7.2, 4.2, 12.8, 6.2, 0.8, '#d8f4ff'));
    g.dots([[7.8, 4.6], [8.3, 4.6], [7.8, 5.1]], WHITE);
    lineIn(g, [[2.6, 6.8], [18.2, 6.8]], 0.55, WHITE);
    for (const x of [4.4, 8.2, 12.8, 16.6]) g.ell(x, 7.7, 0.55, 0.85, WHITE, 0, IN(g));
    for (const [x, y, c] of [[6.4, 9, '#9fd0ff'], [10.4, 8.8, '#fff08a'], [14.6, 9.2, '#a8e88a']]) lineIn(g, [[x - 0.4, y], [x + 0.4, y + 0.3]], 0.22, c);
    for (const x of [6, 14.8]) {
      piece(g, t => soft(t, x, 10.6, 2.3, 2.3, DO, { hl: false }));
      g.ell(x, 10.3, 1.9, 1.6, FR[1], 0, IN(g)); g.ell(x, 10.6, 0.7, 0.7, DO[2], 0, IN(g));
      for (const [dx, dy, c] of [[-1, -0.6, '#fff08a'], [0.9, -0.8, '#9fd0ff'], [1.1, 0.6, '#ffffff']]) g.dot(x + dx, 10.4 + dy, c);
    }
    piece(g, t => soft(t, 18.4, 8, 0.9, 0.9, ['#fffbe0', '#fff3a0', '#f2d870'], { hl: false }));
    g.outerLine();
  } };
  // a cotton candy tree: fluffy pink and lilac candy floss on a striped candy stick (a fruit tree)
  P.cottoncandytree = { w: 28, h: 40, draw(g, th) {
    const ST = nt(WHITE3, th), PK = nt(['#fff2f8', '#ffc6e0', '#f2a4c8'], th), LI = nt(['#f8f0ff', '#dccafa', '#bea8ea'], th);
    piece(g, t => { box(t, 12.8, 19, 15.2, 38.6, 1, ST[1]); t.ell(14, 38.6, 4.2, 1.2, ST[0]); });
    for (let y = 21; y < 38; y += 2.4) lineIn(g, [[12.4, y + 0.9], [15.6, y - 0.6]], 0.42, PK[1]);
    piece(g, t => { for (const [x, y, r] of [[6.6, 17, 5], [21.4, 16.6, 5.2], [14, 18.8, 5.4]]) t.ell(x, y, r, r * 0.84, LI[1]); softShade(t, 14, 17, 12, 4.6, LI, { hl: false }); });
    piece(g, t => { for (const [x, y, rx, ry] of [[14, 10.6, 10.4, 8.4], [6.8, 12, 6, 5], [21.2, 11.6, 6, 5], [10.2, 4.8, 5.4, 4.4], [17.8, 5, 5.2, 4.2]]) t.ell(x, y, rx, ry, PK[1]); softShade(t, 14, 10.6, 13, 9, PK); });
    for (const [x, y] of [[9, 9.6], [18.6, 8.4], [14.4, 14.6]]) { const pts = []; for (let a = 0; a < 5.4; a += 0.4) pts.push([x + Math.cos(a) * (0.3 + a * 0.3), y + Math.sin(a) * (0.3 + a * 0.26)]); lineIn(g, pts, 0.16, PK[2]); }
    for (const [x, y, c] of [[6.6, 6.6, '#fff08a'], [12, 3.6, '#9fd0ff'], [20.8, 5, '#a8e88a'], [5.2, 13.4, '#9fd0ff'], [23.4, 13, '#fff08a'], [16.6, 11.6, '#c9a2f0'], [11, 16.6, '#a8e88a'], [19.4, 15.8, '#ffffff']]) lineIn(g, [[x - 0.45, y], [x + 0.45, y + 0.35]], 0.22, c);
    g.outerLine();
    twinkleF(g, 1.6, 4, '#ffd4ec'); twinkleF(g, 26.4, 8, '#ffd4ec', true);
  } };
  // a bush of little swirly lollipops on a mound of mint frosting
  P.lollibush = { w: 19, h: 15, draw(g, th) {
    const ST = nt(WHITE3, th), M = nt(MINT, th);
    const pops = [[4.4, 6.6, 2.6, PINK], [9.5, 3.9, 2.9, LEMON], [14.6, 6.4, 2.6, LILAC], [6.6, 10.2, 2.4, AQUA], [12.6, 10.4, 2.4, PEACH]];
    for (const [x, y] of pops) piece(g, t => line(t, [[9.5, 14], [x, y]], 0.32, ST[1]));
    for (const [x, y, r, R] of pops) { piece(g, t => soft(t, x, y, r, r, nt(R, th))); swirl(g, x, y, r, WHITE, 0.22); }
    piece(g, t => { t.ell(9.5, 13.8, 6.6, 1.2, M[1]); t.ell(5.8, 13.4, 2.8, 1.3, M[1]); t.ell(13.2, 13.4, 2.8, 1.3, M[1]); softShade(t, 9.5, 13.6, 7, 1.4, M, { hl: false }); });
    g.outerLine();
  } };
  // a big wrapped peppermint and a little mint candy
  P.peppermints = { w: 18, h: 12, draw(g, th) {
    const W = nt(SUGAR, th), RD = nt(['#ffd4dc', '#ff9cb0', '#e87c94'], th), MN = nt(['#e4fff2', '#a8ecc8', '#84d0ac'], th), WR = nt(['#f6fdff', '#d8f0fa', '#b4dcee'], th);
    // a pinwheel candy: white with curved coloured wedges, keeping the soft shade
    const mint = (x, y, r, C) => piece(g, t => {
      t.ell(x, y, r, r, W[1]); softShade(t, x, y, r, r, W, { hl: false });
      bands(t, (xx, yy) => { const d = Math.hypot(xx - x, yy - y), a = Math.atan2(yy - y, xx - x) + d * 0.32; return Math.floor((a + 8 * Math.PI) / (Math.PI / 4)) % 2 === 0; }, c => (c === W[2] ? C[2] : C[1]));
      t.ell(x - r * 0.4, y - r * 0.45, r * 0.22, r * 0.14, WHITE, -0.55);
    });
    piece(g, t => { t.poly([[1.2, 3.8], [4.6, 6.2], [1.2, 8.6], [2.2, 6.2]], WR[1]); t.poly([[16, 3.8], [12.6, 6.2], [16, 8.6], [15, 6.2]], WR[1]); });
    mint(8.6, 6.2, 4.6, RD);
    mint(14.8, 9.2, 2.6, MN);
    g.outerLine();
  } };
  // two crossed candy canes (pink and mint stripes) tied with a ribbon bow
  P.candycanes = { w: 15, h: 23, draw(g, th) {
    const W = nt(SUGAR, th), RIB = nt(['#ffe8f0', '#ffb2c8', '#ec90ac'], th);
    const cane = (b, top, dir, C) => piece(g, t => {
      PX.stroke(t, [b, top], 1.05, 1.05, W[1]); PX.stroke(t, caneHook(top[0], top[1], 2, dir), 1.05, 1.05, W[1]);
      bands(t, (x, y) => (Math.floor((x * dir + y * 0.9) / 1.25) & 1) === 1, C[1]);
    });
    cane([11.6, 22.2], [5.6, 6.2], -1, nt(MINT, th));
    cane([3.4, 22.2], [9.4, 6.2], 1, nt(PINK, th));
    piece(g, t => { t.ell(5.6, 11.4, 1.9, 1.3, RIB[1], 0.4); t.ell(9.4, 11.4, 1.9, 1.3, RIB[1], -0.4); line(t, [[7, 12], [5.8, 14.6]], 0.45, RIB[1]); line(t, [[8, 12], [9.2, 14.6]], 0.45, RIB[1]); });
    piece(g, t => soft(t, 7.5, 11.6, 1, 1, RIB, { hl: false }));
    g.outerLine();
  } };
  // a lemonade stand: a striped awning, a jug and two glasses on the counter, a big lemon slice on the front
  P.lemonadestand = { w: 23, h: 24, draw(g, th) {
    const W = nt(WOOD, th), WH = nt(WHITE3, th), Y = nt(LEMON, th), GL = '#f4fcff';
    for (const x of [3.4, 19.6]) piece(g, t => box(t, x - 0.8, 6, x + 0.8, 14, 0.4, W[2]));
    piece(g, t => { box(t, 4.8, 8.2, 9.2, 13, 1, GL); line(t, [[9, 9.2], [10.4, 9.8], [9.4, 11.8]], 0.3, GL); bands(t, (x, y) => y > 9.8 && x < 9.1, Y[1]); });
    for (const x of [13.4, 16.8]) { piece(g, t => { box(t, x - 1, 10.2, x + 1, 13, 0.4, GL); bands(t, (xx, yy) => yy > 11, Y[1]); }); line(g, [[x + 0.3, 10.4], [x + 1, 8.8]], 0.18, '#ffa8bc'); }
    piece(g, t => { box(t, 1.8, 13, 21.2, 23.6, 1.2, WH[1]); softShade(t, 11.5, 18.3, 9.7, 5.3, WH, { hl: false }); });
    piece(g, t => box(t, 1, 12.4, 22, 14.4, 0.8, W[1]));
    piece(g, t => t.ell(11.5, 18.9, 3.6, 3.6, Y[2]));
    g.ell(11.5, 18.9, 3, 3, WHITE, 0, IN(g)); g.ell(11.5, 18.9, 2.5, 2.5, Y[1], 0, IN(g));
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.3; lineIn(g, [[11.5, 18.9], [11.5 + Math.cos(a) * 2.6, 18.9 + Math.sin(a) * 2.6]], 0.15, WHITE); }
    piece(g, t => {
      box(t, 0.6, 2.4, 22.4, 6.4, 0.8, Y[1]); for (let x = 1.8; x < 22; x += 2.4) t.ell(x, 6.4, 1.2, 1.2, Y[1]);
      softShade(t, 11.5, 4.6, 11, 2.6, Y, { hl: false });
      bands(t, x => (Math.floor((x - 0.6) / 2.4) & 1) === 1, c => (c === Y[2] ? WH[2] : WH[0]));
    });
    g.outerLine();
  } };
  // three marshmallows (white, pink, mint), one stacked on top
  P.marshmallows = { w: 15, h: 11, draw(g, th) {
    const cols = [nt(['#ffffff', '#fbf6fa', '#e4d8e6'], th), nt(['#fff4f8', '#ffd4e6', '#f2b4cc'], th), nt(['#f6fff8', '#d4f6e4', '#acdcc6'], th)];
    const mm = (x, y, R) => { piece(g, t => { box(t, x - 2.6, y - 2.2, x + 2.6, y + 2.2, 1.4, R[1]); softShade(t, x, y, 2.6, 2.2, R, { hl: false }); }); piece(g, t => t.ell(x, y - 1.5, 2.2, 0.75, R[0])); };
    mm(4.4, 8.4, cols[0]); mm(10.6, 8.4, cols[1]); mm(7.5, 4.2, cols[2]);
    g.outerLine();
  } };

  // =====================================================================================================
  // Houses: new facade kinds for PX.pvzHouse(F). Same 74 x 70 canvas and footprint as the old house (the bottom row is the
  // ground, the door sits at x 37 near the bottom; the left 12 px are cut off by the edge of the yard).
  // F: kind, wall / roof / door / porch ramps [light, mid, shade], trim, glass, plus extras per kind (stripe, flag, brick...).
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
    K.knob = (x, y) => K.P(t => soft(t, x, y, 0.8, 0.8, ['#fff6c4', '#ffdc72', '#eaae46'], { hl: false }));
    // (K.after: see-through bits such as smoke, drawn once the bold outer line is on)
    K.after = [];
    K.done = door => { g.outerLine(); for (const f of K.after) f(); const c = g.canvas(); c.meta = { door, win }; return c; };
    return K;
  }

  // the Pool House: a white board cabana under a striped canvas roof (stripes fanning out from the peak, a scalloped valance),
  // a porthole window, a towel on a rail, a life ring by the door, a pennant on top
  HOUSE.poolhouse = F => {
    const K = houseKit(F), { g, P, R3, win } = K, wall = R3(F.wall), roof = R3(F.roof), door = R3(F.door), porch = R3(F.porch), st = K.pa(F.stripe || '#ffffff');
    const stS = mixHex(st, roof[2], 0.45);
    // the wooden deck
    P(t => { box(t, 2, 63.4, 72, 68.6, 1.2, porch[1]); softShade(t, 37, 66, 35, 2.6, porch, { hl: false }); });
    for (let x = 7; x < 70; x += 6) line(g, [[x, 64.2], [x, 68]], 0.2, porch[2]);
    P(t => { line(t, [[37, 12], [37, 1.6]], 0.45, '#c8c4d8'); t.poly([[37.4, 1.2], [45, 3.6], [37.4, 6]], K.pa(F.flag || '#ffb2c8')); });
    // the cabana walls
    P(t => { box(t, 8, 30, 66, 64, 1.4, (x, y) => (x > 64.4 ? wall[2] : wall[1])); softShade(t, 37, 47, 29, 17, wall, { hl: false }); });
    for (let x = 12; x < 64; x += 4) lineIn(g, [[x, 31], [x, 63.4]], 0.18, mixHex(wall[1], wall[2], 0.55));
    // the striped canvas roof
    P(t => {
      t.poly([[3, 31], [71, 31], [55, 10.4], [19, 10.4]], roof[1]); t.ell(37, 11, 18, 4.6, roof[1], 0, (x, y) => y <= 11);
      softShade(t, 37, 20, 34, 12, roof);
      bands(t, (x, y) => (Math.floor((x - 37) / (y + 14) * 9 + 40.5) & 1) === 1, c => (c === roof[2] ? stS : st));
    });
    P(t => { for (let i = 0, x = 4.4; x < 71; x += 4.4, i++) t.ell(x, 31.8, 2.3, 2, i % 2 ? st : roof[1]); });
    lineIn(g, [[3.4, 31.2], [70.6, 31.2]], 0.45, roof[2]);
    // a porthole window, a square one with a towel rail under the porthole
    K.port(19.6, 43.6, 5.4);
    K.pane(48.4, 38.4, 13, 11, 1.8);
    P(t => box(t, 12, 51.4, 27, 52.6, 0.5, '#d8d4e4'));
    P(t => { box(t, 15, 52, 22.6, 61.2, 0.9, K.pa(F.towel || '#9fdcf0')); bands(t, (x, y) => (y > 55 && y < 56.2) || (y > 57.4 && y < 58.6), WHITE); });
    // the door with its own little porthole
    P(t => { box(t, 29.6, 40.6, 44.4, 64.4, 3, door[1]); softShade(t, 37, 52, 7, 11, door, { hl: false }); });
    K.port(37, 47.4, 3.2);
    K.knob(41.6, 55);
    // a life ring on the wall
    P(t => { t.ell(56.4, 56, 4, 4, WHITE); t.ell(56.4, 56, 1.8, 1.8, null); });
    for (const a of [0.4, 2, 3.6, 5.2]) g.ell(56.4 + Math.cos(a) * 2.9, 56 + Math.sin(a) * 2.9, 0.95, 0.95, K.pa('#ffa8bc'), 0, IN(g));
    P(t => box(t, 28, 64, 46, 66.8, 1.2, porch[0]));
    return K.done([37, 68]);
  };

  // the Night Cottage: soft plaster walls under a big round-shingled roof, a dormer, warm lit windows with flower boxes, a
  // round-topped door with a crescent-moon window, a lantern, and a chimney puffing smoke
  HOUSE.cottage = F => {
    const K = houseKit(F), { g, P, R3, win } = K, wall = R3(F.wall), roof = R3(F.roof), door = R3(F.door), porch = R3(F.porch);
    const beam = R3(F.beam || ['#f2dcc8', '#c8a084', '#a8826a']), brick = R3(F.brick || BRICK), seam = mixHex(roof[2], '#5a4a72', 0.22);
    P(t => { t.ell(37, 67.6, 33, 2, porch[1]); softShade(t, 37, 67.4, 33, 2, porch, { hl: false }); });
    // the chimney and its smoke
    K.after.push(() => smoke(g, 55.2, 5.4, 2.2, 2));
    P(t => { box(t, 51.6, 10, 60.4, 28, 0.8, brick[1]); softShade(t, 56, 19, 4.4, 9, brick, { hl: false }); });
    for (let y = 13, r = 0; y < 27; y += 2.6, r++) { lineIn(g, [[51.6, y], [60.4, y]], 0.18, brick[2]); for (let x = 53.4 + (r % 2) * 2; x < 60; x += 4) lineIn(g, [[x, y - 2.4], [x, y - 0.2]], 0.18, brick[2]); }
    P(t => box(t, 50.4, 8.6, 61.6, 11.4, 0.8, brick[0]));
    // the walls with timber beams
    P(t => { box(t, 9, 34, 65, 64.2, 1.4, (x, y) => (x > 63.4 ? wall[2] : wall[1])); softShade(t, 37, 49, 28, 15, wall, { hl: false }); });
    lineIn(g, [[9.4, 37], [64.6, 37]], 1, beam[1]);
    for (const x of [10.4, 63.6]) lineIn(g, [[x, 36.4], [x, 63.6]], 0.9, beam[1]);
    // the roof: rows of round shingles and a scalloped eave
    P(t => {
      t.poly([[2, 37], [72, 37], [57, 12], [17, 12]], roof[1]); t.ell(37, 13, 20, 5.4, roof[1], 0, (x, y) => y <= 13);
      for (let x = 4.4; x < 71; x += 4.4) t.ell(x, 37.4, 2.2, 1.9, roof[1]);
      softShade(t, 37, 24, 34, 13, roof);
    });
    for (let y = 16.6, r = 0; y < 36; y += 4, r++) { const hw = 20 + (y - 12) * 0.62; for (let x = 37 - hw + 2 + (r % 2) * 2.2; x < 37 + hw - 1; x += 4.4) lineIn(g, arc(x, y, 2.2, 1.6), 0.24, seam); }
    // a dormer with a round window
    P(t => { box(t, 30.6, 19, 43.4, 30, 1, wall[1]); softShade(t, 37, 24.5, 6.4, 5.5, wall, { hl: false }); });
    P(t => { line(t, [[29, 21], [37, 14.6], [45, 21]], 1.2, roof[2]); });
    K.port(37, 24.8, 3.8);
    // lit windows with flower boxes
    for (const x of [12.6, 49.4]) {
      K.pane(x, 41.4, 12, 10.6, 4.4);
      for (let i = 0; i < 4; i++) blossom(g, x + 1.6 + i * 2.9, 52, 1.25, i % 2 ? PEACH : PINK);
      P(t => box(t, x - 0.8, 52.8, x + 12.8, 55.2, 0.8, beam[1]));
    }
    // the round-topped door with a crescent moon window, a lantern beside it
    P(t => { box(t, 29.4, 42, 44.6, 64.4, 7.4, door[1]); softShade(t, 37, 53, 7, 11, door, { hl: false }); });
    for (const x of [33, 37, 41]) lineIn(g, [[x, 43], [x, 63.8]], 0.2, door[2]);
    P(t => t.ell(37, 48.4, 2.6, 2.6, K.glass));
    g.ell(38.3, 47.6, 2.1, 2.1, door[1], 0, IN(g));
    win.push([36, 48]);
    K.knob(41.4, 55);
    P(t => { line(t, [[45, 42.4], [47.2, 42.4], [47.2, 43.4]], 0.3, '#8a8098'); box(t, 45.8, 43.6, 48.6, 47.8, 0.8, '#ffe9a0'); box(t, 45.4, 43.2, 49, 44.2, 0.4, '#8a8098'); });
    win.push([47, 46]);
    P(t => box(t, 28, 64, 46, 66.8, 1.2, porch[0]));
    return K.done([37, 67]);
  };

  // the Attic: the top of a house poking up on the roof garden: a big tiled roof, a front gable with a big round dormer
  // window over the door, a chimney with a TV antenna, little windows in the knee walls either side
  HOUSE.attic = F => {
    const K = houseKit(F), { g, P, R3 } = K, wall = R3(F.wall), roof = R3(F.roof), door = R3(F.door), porch = R3(F.porch), brick = R3(F.brick || BRICK), M = R3(IRON), seam = mixHex(roof[2], '#6a4a52', 0.2);
    // the chimney and its antenna
    P(t => { line(t, [[16, 12], [16, 1.4]], 0.35, M[1]); for (const [y, hw] of [[3, 4.4], [5.6, 3.4], [8.2, 2.4]]) line(t, [[16 - hw, y], [16 + hw, y]], 0.3, M[1]); });
    P(t => { box(t, 12, 13, 20, 34, 0.8, brick[1]); softShade(t, 16, 23, 4, 10, brick, { hl: false }); });
    for (let y = 16, r = 0; y < 33; y += 2.6, r++) { lineIn(g, [[12, y], [20, y]], 0.18, brick[2]); for (let x = 13.6 + (r % 2) * 2; x < 19.6; x += 4) lineIn(g, [[x, y - 2.4], [x, y - 0.2]], 0.18, brick[2]); }
    P(t => box(t, 11, 11.4, 21, 14.2, 0.8, brick[0]));
    // the big tiled roof and its gutter
    P(t => { t.poly([[1, 55], [37, 8], [73, 55]], roof[1]); t.ell(37, 9.8, 3.4, 2.6, roof[1]); softShade(t, 37, 36, 30, 20, roof); });
    for (let y = 16, r = 0; y < 55; y += 4.2, r++) { const hw = (y - 8.6) * (36 / 46.4); for (let x = 37 - hw + 2.2 + (r % 2) * 2.2; x < 37 + hw - 1.6; x += 4.4) lineIn(g, arc(x, y, 2.2, 1.6), 0.24, seam); }
    P(t => { box(t, 0.4, 54, 73.6, 56.6, 1, M[0]); });
    // the knee walls either side, with a small window each
    P(t => { box(t, 5, 56, 24, 64.4, 1, wall[1]); box(t, 50, 56, 69, 64.4, 1, wall[1]); softShade(t, 37, 60, 32, 4.4, wall, { hl: false }); });
    K.pane(9, 57.2, 10, 6.6, 1.2); K.pane(55, 57.2, 10, 6.6, 1.2);
    // the front gable: white boards from the ground up to its point, its own little roof edge
    P(t => { t.poly([[23, 64.4], [23, 32], [37, 18.4], [51, 32], [51, 64.4]], wall[1]); softShade(t, 37, 44, 14, 20, wall, { hl: false }); });
    for (let x = 26.4; x < 50; x += 3.4) lineIn(g, [[x, 20], [x, 64]], 0.18, mixHex(wall[1], wall[2], 0.55));
    P(t => line(t, [[21, 34], [37, 16.6], [53, 34]], 1.3, K.trim));
    // the round dormer window with cross bars
    K.port(37, 33.4, 6.6);
    line(g, [[37, 28.4], [37, 38.4]], 0.45, K.trim); line(g, [[32, 33.4], [42, 33.4]], 0.45, K.trim);
    // the door
    P(t => { box(t, 30.6, 44.4, 43.4, 64.4, 6, door[1]); softShade(t, 37, 54, 6, 10, door, { hl: false }); });
    for (const y of [51, 57.6]) lineIn(g, [[31.4, y], [42.6, y]], 0.25, door[2]);
    K.knob(41, 55);
    P(t => box(t, 29, 64, 45, 67, 1.2, porch[1]));
    return K.done([37, 67]);
  };

  // the Gingerbread House: gingerbread walls with piped icing, a pink frosted roof with icing drips and candy buttons, a
  // peppermint window, a chocolate-bar door between candy-cane posts, gumdrops along the foot, a lollipop
  HOUSE.gingerbread = F => {
    const K = houseKit(F), { g, P, R3, win } = K, wall = R3(F.wall), roof = R3(F.roof), door = R3(F.door), porch = R3(F.porch), ic = K.pa(F.icing || '#ffffff');
    const CANDY = ['#ffa8c4', '#9fe0c8', '#fff08a', '#c9a8f4', '#9fd0ff'].map(K.pa), red = K.pa('#ffa0b8');
    const ramp = c => [mixHex(c, '#ffffff', 0.45), c, mixHex(c, '#6a4a6a', 0.18)];
    P(t => { t.ell(37, 67.6, 34, 2.2, porch[1]); softShade(t, 37, 67.4, 34, 2.2, porch, { hl: false }); });
    // the peppermint-stick chimney with a cherry
    P(t => { line(t, [[54.6, 6], [55.6, 3.6]], 0.25, '#7ab88a'); soft(t, 54.4, 6.8, 1.8, 1.7, CHERRY, { hl: false }); });
    P(t => { box(t, 51, 8.6, 58, 24, 1, WHITE); bands(t, (x, y) => (Math.floor((x + y) / 1.6) & 1) === 1, red); });
    // the walls, with a wavy line of piped icing near the foot
    P(t => { box(t, 9, 33, 65, 64.2, 1.6, (x, y) => (x > 63.4 ? wall[2] : wall[1])); softShade(t, 37, 48, 28, 15, wall, { hl: false }); });
    { const pts = []; for (let x = 9.6; x <= 64.4; x += 0.5) pts.push([x, 60.6 + Math.sin(x * 0.9) * 0.8]); lineIn(g, pts, 0.4, ic); }
    for (let x = 12; x < 64; x += 4) g.ell(x, 35.6, 0.55, 0.55, ic, 0, IN(g));
    // the frosted roof, icing along its edges dripping off the eave, candy buttons
    P(t => { t.poly([[1.4, 36.4], [37, 5], [72.6, 36.4]], roof[1]); t.ell(37, 6.6, 3, 2.4, roof[1]); softShade(t, 37, 24, 30, 14, roof); });
    for (let y = 15, r = 0; y < 34; y += 5, r++) { const hw = (y - 5) * (35.6 / 31.4) - 3; let i = r; for (let x = 37 - hw + (r % 2) * 2.4; x <= 37 + hw; x += 4.8, i++) { if (Math.abs(x - 37) < 6.4 && y > 15 && y < 30) continue; g.ell(x, y, 1.15, 1.15, CANDY[i % CANDY.length], 0, IN(g)); g.dot(x - 0.4, y - 0.5, WHITE); } }
    P(t => { line(t, [[1.6, 35.6], [37, 4.4], [72.4, 35.6]], 1.05, ic); box(t, 1, 35, 73, 37.6, 1.2, ic); for (const [x, len] of [[5, 2.6], [10.4, 1.4], [15.6, 3], [21.4, 1.6], [27, 2.4], [47, 2.4], [52.6, 1.6], [58.4, 3], [63.6, 1.4], [69, 2.6]]) t.ell(x, 37.4 + len / 2, 0.9, len / 2 + 0.5, ic); });
    // a peppermint round window in the gable
    P(t => { t.ell(37, 22, 5, 5, WHITE); bands(t, (x, y) => { const d = Math.hypot(x - 37, y - 22), a = Math.atan2(y - 22, x - 37) + d * 0.25; return (Math.floor((a + 8 * Math.PI) / (Math.PI / 5)) & 1) === 1; }, red); });
    P(t => t.ell(37, 22, 3.2, 3.2, K.glass));
    K.shine(35.6, 20.6); win.push([37, 22]);
    // windows with thick icing frames and drips under them
    for (const x of [12.4, 49.6]) {
      K.pane(x, 40, 12, 10.6, 2.4);
      P(t => { box(t, x - 0.8, 50.2, x + 12.8, 52.4, 1, ic); for (const d of [2, 6, 10]) t.ell(x + d, 52.8, 0.7, 1, ic); });
    }
    // the chocolate-bar door between candy-cane posts
    P(t => { box(t, 29.6, 42, 44.4, 64.4, 6.6, door[1]); softShade(t, 37, 53, 7, 11, door, { hl: false }); });
    for (const y of [48.6, 54.2, 59.6]) lineIn(g, [[30, y], [44, y]], 0.3, door[2]);
    lineIn(g, [[37, 43], [37, 64]], 0.3, door[2]);
    for (const [x, dir] of [[26.6, 1], [47.4, -1]]) P(t => {
      PX.stroke(t, [[x, 64.4], [x, 44]], 0.9, 0.9, WHITE); PX.stroke(t, caneHook(x, 44, 1.8, dir), 0.9, 0.9, WHITE);
      bands(t, (xx, yy) => (Math.floor((xx * dir + yy * 0.9) / 1.2) & 1) === 1, red);
    });
    P(t => soft(t, 41.6, 54.8, 1, 1, ramp(CANDY[2]), { hl: false }));
    // gumdrops along the foot of the wall, a lollipop by the house
    for (const [x, c] of [[12.4, 0], [17.2, 1], [22, 3], [52, 4], [56.8, 0], [61.6, 2]]) P(t => { const R = ramp(CANDY[c]); t.ell(x, 63.8, 2.1, 2.6, R[1], 0, (xx, yy) => yy <= 63.8); box(t, x - 2.1, 62.8, x + 2.1, 64.4, 0.6, R[1]); softShade(t, x, 62.6, 2.1, 1.8, R, { hl: false }); });
    P(t => line(t, [[69.6, 64.4], [69.6, 50.4]], 0.45, WHITE));
    P(t => soft(t, 69.6, 48, 3, 3, ramp(CANDY[3])));
    swirl(g, 69.6, 48, 3, WHITE, 0.3);
    return K.done([37, 67]);
  };

  // =====================================================================================================
  // Registration
  // =====================================================================================================
  PX.PVZ_PROP = PX.PVZ_PROP || {};
  Object.assign(PX.PVZ_PROP, P);
  // the new facade kinds go through their own painters; anything else goes on to art-world2.js / the old house
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
    poolpalm: [[-0.12, -0.66], [0.08, -0.62], [0.28, -0.68]],
    curlytree: [[-0.3, -0.5], [0, -0.64], [0.3, -0.52]],
    plantertree: [[-0.27, -0.52], [0, -0.78], [0.27, -0.54]],
    cottoncandytree: [[-0.27, -0.55], [0, -0.8], [0.27, -0.57]],
  });
  // night glows for the lit props: [x share, height share from the bottom, radius, 'r,g,b'] (like GLOWS in garden.js). The curly
  // tree's sits on the trunk just under the fork: up in the empty fork it showed as a pale wisp between the branches
  PX.GARDEN_GLOWS = Object.assign(PX.GARDEN_GLOWS || {}, {
    hooklantern: [0.77, 0.62, 8, '255,214,150'], lanternflowers: [0.5, 0.6, 7, '220,255,230'], curlytree: [0.5, 0.46, 5, '210,250,240'],
  });

  // =====================================================================================================
  // The 4 garden maps (same keys as THM in garden.js; garden.js softens every colour with its pastelize pass)
  // Yard layout rules (garden.js): x share 0.04-0.58 (further right is the shore); props left of x share 0.27 only stand in
  // the gaps between the lanes (y share 0.31-0.36, 0.49-0.535, 0.665-0.70, 0.835-0.89), clear of the flower pots
  // =====================================================================================================
  const cluster = (fx, fy, items) => items.map(([k, dx, dy]) => [k, Math.round((fx + (dx || 0)) * 1000) / 1000, Math.round((fy + (dy || 0)) * 1000) / 1000]);
  const yard = (...cl) => [].concat(...cl);
  const M = {};
  // a sunny backyard: the water is a tiled swimming pool (pool: true) with a lane rope and floats (style 'pool')
  M.poolside = {
    style: 'pool', pool: true,
    sky: ['#5ebdf2', '#7ccaf5', '#9ed8f8', '#c4e9fb'], skyN: ['#1a1d48', '#222a5a', '#2c366c', '#3a4580'],
    far: ['#a2d888', '#7cbe68'], farDots: ['#76bc62', '#98d282', '#5ea454'], near: ['#86ce72', '#5eae56'], nearDots: ['#58a64c', '#7cc468'],
    lawn: ['#86d05e', '#5aa04a'], grass: ['#9ada6a', '#86d05e', '#7ac655', '#6db84c'], blade: '#52a03e', bladeHi: '#b8ec8c', shade: '#64aa48', mow: '#7cc858',
    dots: ['#ffffff', '#fbf236', '#9fd8ff', '#f7b6c8'], dotC: '#5fcde4', sand: '#eef8fc', wet: '#b0e2f2', sandEdge: '#86c4dc',
    water: ['#b4f4fc', '#7ae0f6', '#5ccaee', '#4cb8e6'], foam: '#ffffff', hl: '#e6fbff', cloud: ['#ffffff', '#dfeafc', '#bccdf0'],
    path: null, night: [20, 18, 64, 0.36], dim: 0, tree: 'poolpalm', deco: 'meadow', decoK: 0.6, fish: '40,120,190', dock: ['#f6fbff', '#d2e6f2', '#aac8de'],
    tiles: ['#96dc64', '#88d25a', '#6cbc46', '#62b03e'], fence: 'picket', mower: 'poolcleaner',
    facade: { kind: 'poolhouse', wall: ['#ffffff', '#f2f8fc', '#d2e0ec'], roof: ['#e0f8ff', '#86d4f0', '#64b6da'], stripe: '#ffffff', door: ['#ffe2ea', '#ffb2c4', '#e890a8'], porch: ['#f8e0c4', '#e2ba96', '#c49a76'], trim: '#ffffff', glass: '#a8e0f8', flag: '#ffb2c8', towel: '#ffc8a0' },
    props: yard(
      cluster(0.3, 0.255, [['poolumbrella', 0, 0], ['deckchair', 0.06, 0.012]]),
      cluster(0.29, 0.785, [['flamingo', 0, 0], ['beachball', 0.06, 0.01]]),
      cluster(0.21, 0.06, [['hedge', 0, 0], ['duckyring', 0.06, 0.012]]),
      cluster(0.5, 0.05, [['hedge', 0, 0], ['bush', 0.06, 0.02]]),
      cluster(0.62, 0.25, [['divingboard', 0, 0]]),
      cluster(0.36, 0.34, [['deckchair', 0, 0], ['deckchair', 0.05, 0.004]]),
      cluster(0.53, 0.46, [['poolladder', 0, 0], ['lifering', -0.05, 0.012]]),
      cluster(0.37, 0.64, [['poolumbrella', 0, 0], ['duckyring', 0.06, 0.01]]),
      cluster(0.62, 0.8, [['divingboard', 0, 0]]),
      cluster(0.42, 0.97, [['hedge', 0, 0], ['flowerpot_bloom', 0.06, 0.004]]),
      cluster(0.1, 0.335, [['beachball', 0, 0], ['lifering', 0.05, 0.008]]),
      cluster(0.13, 0.515, [['duckyring', 0, 0], ['bush', 0.06, 0.008]]),
      cluster(0.16, 0.86, [['flamingo', 0, 0], ['beachball', 0.06, 0.006]])),
    home: ['poolhouse', 0.42, 0.72],
    fruitTrees: [['poolpalm', 0.46, 0.56], ['poolpalm', 0.1, 0.69]],
  };
  // a misty night lawn (always a little dim, the big moon out), mist drifting over it, a spooky-cute pond with floating lanterns
  M.foggynight = {
    style: 'moonlit', bigMoon: true, mist: true,
    sky: ['#38387a', '#4a468a', '#605898', '#7a6aa4'], skyN: ['#121230', '#1a1a42', '#242452', '#302c60'],
    mount: ['#7474aa', '#5c5c94', '#46467e'], snow: '#bcb8e6', mountAmp: 20, mountShape: 'peak',
    far: ['#40507a', '#303e62'], farDots: ['#2e4c62', '#3e6274', '#1e3646'], near: ['#36606a', '#264a54'], nearDots: ['#20444c', '#2e5860'],
    lawn: ['#5a9088', '#3e726c'], grass: ['#6a9c94', '#5e9088', '#548680', '#4a7a74'], blade: '#3a6a64', bladeHi: '#9ae4d4', shade: '#46746e', mow: '#5e9088',
    dots: ['#c9a2f0', '#9fd8ff', '#fff6c9', '#ffb2c8'], dotC: '#ffffff', sand: '#aaa6c8', wet: '#8682aa', sandEdge: '#6e6a92',
    water: ['#94a4d8', '#7282c0', '#5a68a6', '#48548e'], foam: '#dce4f6', hl: '#bcc8f0', cloud: ['#9c90cc', '#8274b4', '#6a5e9c'],
    path: null, night: [24, 18, 60, 0.3], dim: 0.18, tree: 'curlytree', deco: 'moonlit', fish: '20,20,60', dock: ['#aa9caa', '#7e7080', '#5c5060'],
    tiles: ['#70a49c', '#6a9c94', '#56867e', '#507e78'], fence: 'iron', mower: 'lawnmower',
    facade: { kind: 'cottage', wall: ['#fdf4e6', '#f0dcc8', '#d2b8a4'], roof: ['#d4d4f8', '#a2a8e2', '#8086c6'], door: ['#f2d8bc', '#cc9e7c', '#a87e62'], porch: ['#e6e0ec', '#c4bccc', '#a49cb0'], trim: '#fff6ec', glass: '#ffe9a0', lit: true },
    props: yard(
      cluster(0.3, 0.255, [['hooklantern', 0, 0], ['pumpkins', 0.05, 0.012]]),
      cluster(0.29, 0.785, [['owlstump', 0, 0], ['lanternflowers', 0.05, 0.012]]),
      cluster(0.21, 0.06, [['signpost', 0, 0], ['pumpkins', 0.05, 0.012]]),
      cluster(0.5, 0.05, [['curlytree', 0, 0], ['gravestone2', 0.06, 0.02]]),
      cluster(0.48, 0.25, [['lanternflowers', 0, 0], ['glowshroom', 0.05, -0.01]]),
      cluster(0.36, 0.34, [['owlstump', 0, 0], ['mushrooms', 0.05, 0.012]]),
      cluster(0.53, 0.46, [['hooklantern', 0, 0], ['pumpkins', -0.05, 0.01]]),
      cluster(0.37, 0.64, [['gravestone', 0, 0], ['lanternflowers', 0.045, 0.01]]),
      cluster(0.54, 0.8, [['curlytree', 0, 0], ['hooklantern', -0.06, 0.008]]),
      cluster(0.42, 0.97, [['pumpkins', 0, 0], ['signpost', 0.06, 0.004]]),
      cluster(0.1, 0.335, [['lanternflowers', 0, 0], ['mushrooms', 0.05, 0.008]]),
      cluster(0.13, 0.515, [['pumpkins', 0, 0], ['glowshroom', 0.05, 0.008]]),
      cluster(0.16, 0.86, [['hooklantern', 0, 0], ['fern', 0.05, 0.006]])),
    home: ['cottage', 0.42, 0.72],
    fruitTrees: [['curlytree', 0.46, 0.57], ['curlytree', 0.1, 0.69]],
  };
  // a garden on a town roof: the lawn is clay roof tiles (rooftiles), a town skyline on the horizon (mountShape 'town': mount =
  // the houses, snow = their lit windows), the rain barrel pond on the right
  M.rooftop = {
    style: 'meadow', rooftiles: true,
    sky: ['#68c2f2', '#86cef5', '#a8dcf8', '#cce9fb'], skyN: ['#1a1d48', '#222a5a', '#2c366c', '#3a4580'],
    mount: ['#f0eefa', '#cecce6', '#aeaccc'], snow: '#fff2b4', mountAmp: 28, mountShape: 'town',
    far: ['#a6d68c', '#80bc6e'], farDots: ['#76b864', '#98cc80', '#5ea056'], near: ['#94cc80', '#6eb064'], nearDots: ['#5ea656', '#80c06c'],
    lawn: ['#f4b090', '#d4866a'], grass: ['#f8c0a2', '#f4b494', '#eca688', '#e2987c'], blade: '#72b456', bladeHi: '#c4ec9c', shade: '#d48a6e', mow: '#f0aa8a',
    dots: ['#ffffff', '#ffd27a', '#ffb2c8', '#c9a2f0'], dotC: '#f08a60', sand: '#eeeaf2', wet: '#cac4d6', sandEdge: '#aaa2ba',
    water: ['#b4ecf8', '#86d6f0', '#68c2e8', '#56b0dc'], foam: '#ffffff', hl: '#e2f8fd', cloud: ['#ffffff', '#dfeafc', '#bccdf0'],
    path: null, night: [20, 18, 64, 0.36], dim: 0, tree: 'plantertree', deco: 'meadow', decoK: 0.18, fish: '30,70,120', dock: ['#eeeaf2', '#c8c0d2', '#a69eb4'],
    tiles: ['#f8c4a6', '#f4ba9c', '#e8a68a', '#e29e82'], fence: 'iron', mower: 'roofcleaner',
    facade: { kind: 'attic', wall: ['#fffaf0', '#f6e8d0', '#dcc8a8'], roof: ['#ffd2c0', '#f4a68c', '#d88670'], door: ['#e2f4ff', '#a6cdec', '#82aad0'], porch: ['#f2e2d4', '#d8c0aa', '#bca28c'], trim: '#ffffff', glass: '#bfe8fa', brick: ['#ffdcd2', '#e8a092', '#c88274'] },
    props: yard(
      cluster(0.3, 0.255, [['chimney', 0, 0], ['antenna', 0.05, 0.012]]),
      cluster(0.29, 0.785, [['flowerbox', 0, 0], ['pigeons', 0.07, 0.01]]),
      cluster(0.21, 0.06, [['antenna', 0, 0], ['roofvent', 0.05, 0.012]]),
      cluster(0.5, 0.05, [['chimney', 0, 0], ['weathervane', 0.06, 0.02]]),
      cluster(0.62, 0.25, [['rainbarrel', 0, 0]]),
      cluster(0.36, 0.34, [['flowerbox', 0, 0], ['roofvent', 0.06, 0.012]]),
      cluster(0.53, 0.46, [['weathervane', 0, 0], ['pigeons', -0.06, 0.01]]),
      cluster(0.37, 0.64, [['chimney', 0, 0], ['flowerbox', 0.06, 0.006]]),
      cluster(0.62, 0.8, [['rainbarrel', 0, 0], ['roofvent', -0.06, 0.008]]),
      cluster(0.42, 0.97, [['flowerbox', 0, 0], ['pigeons', 0.07, 0.004]]),
      cluster(0.1, 0.335, [['roofvent', 0, 0], ['flowerpot_bloom', 0.05, 0.008]]),
      cluster(0.13, 0.515, [['pigeons', 0, 0], ['roofvent', 0.06, 0.008]]),
      cluster(0.16, 0.86, [['flowerbox', 0, 0], ['roofvent', 0.07, 0.006]])),
    home: ['attic', 0.42, 0.72],
    fruitTrees: [['plantertree', 0.46, 0.57], ['plantertree', 0.1, 0.69]],
  };
  // pastel pink and mint candy ground, whipped-cream peaks, gumdrop and lollipop hills, a fizzy lemonade lake
  M.candyland = {
    style: 'candy', fizz: true,
    sky: ['#ffb0d0', '#ffc2da', '#ffd4e4', '#ffeee8'], skyN: ['#2a1c4a', '#38245c', '#482c6c', '#5a347a'],
    mount: ['#fff6fa', '#ffd2e4', '#f4a8c8'], snow: '#ffffff', mountAmp: 22, mountShape: 'drop',
    far: ['#c2f0da', '#9cdcc0'], farDots: ['#ff9ec6', '#c4a8f4', '#fff09a'], near: ['#ffd2e4', '#f4aecc'], nearDots: ['#ff94c0', '#8fd0ff'],
    lawn: ['#ffd4e6', '#f0a4c6'], grass: ['#ffe2ee', '#ffd4e6', '#f6c8de', '#eebcd4'], blade: '#94dcbc', bladeHi: '#e8fff4', shade: '#eab0ca', mow: '#ffcce0',
    dots: ['#fff08a', '#9fd0ff', '#a8e88a', '#c9a2f0'], dotC: '#ffffff', sand: '#fff2c8', wet: '#f6dca0', sandEdge: '#e8c888',
    water: ['#fffcd6', '#fff29e', '#ffe676', '#f8d862'], foam: '#ffffff', hl: '#fffdf0', cloud: ['#ffffff', '#fff0f6', '#f6d4e6'],
    path: null, night: [40, 20, 70, 0.32], dim: 0, tree: 'cottoncandytree', deco: 'candy', fish: '190,130,40', dock: ['#fff2f8', '#f6c8dc', '#e0a4c0'],
    tiles: ['#ffdcea', '#ffd2e4', '#c2f0da', '#b6e8d0'], fence: 'picket', mower: 'candycar',
    facade: { kind: 'gingerbread', wall: ['#f8dcc0', '#e2ac80', '#c48c60'], roof: ['#ffe4f0', '#ffb8d4', '#ec94b8'], door: ['#c89878', '#9c6c50', '#7a5040'], porch: ['#ffffff', '#f6eef6', '#dcd0e0'], trim: '#ffffff', glass: '#c8f0ff', icing: '#ffffff' },
    props: yard(
      cluster(0.3, 0.255, [['lollitree', 0, 0], ['peppermints', 0.06, 0.012]]),
      cluster(0.29, 0.785, [['candycanes', 0, 0], ['marshmallows', 0.05, 0.01]]),
      cluster(0.21, 0.06, [['lollibush', 0, 0], ['gumdrops', 0.06, 0.012]]),
      cluster(0.5, 0.05, [['cottoncandytree', 0, 0], ['candycanes', 0.06, 0.02]]),
      cluster(0.62, 0.25, [['lemonadestand', 0, 0]]),
      cluster(0.36, 0.34, [['cupcake', 0, 0], ['peppermints', 0.05, 0.012]]),
      cluster(0.53, 0.46, [['lollibush', 0, 0], ['marshmallows', -0.06, 0.01]]),
      cluster(0.37, 0.64, [['candycanes', 0, 0], ['gumdrops', 0.05, 0.01]]),
      cluster(0.54, 0.8, [['lollitree', 0, 0], ['peppermints', -0.06, 0.008]]),
      cluster(0.42, 0.97, [['marshmallows', 0, 0], ['lollibush', 0.06, 0.004]]),
      cluster(0.1, 0.335, [['peppermints', 0, 0], ['donut', 0.06, 0.008]]),
      cluster(0.13, 0.515, [['gumdrops', 0, 0], ['candycane', 0.05, 0.008]]),
      cluster(0.16, 0.86, [['lollibush', 0, 0], ['icecream', 0.06, 0.006]])),
    home: ['gingerbread', 0.42, 0.72],
    fruitTrees: [['cottoncandytree', 0.46, 0.57], ['lollitree', 0.1, 0.69]],
  };
  PX.GARDEN_MAPS = Object.assign(PX.GARDEN_MAPS || {}, M);

  // =====================================================================================================
  // Race scenery for the 4 maps (same keys as TH in race.js). far2 'town' (race.js) is a skyline: far2C = [house, edge, window].
  // props: [kind, weight, glows at night?].
  // =====================================================================================================
  const RM = {};
  const SUNNY = { cloud: ['#ffffff', '#f4f8ff', '#dce6f8'], puff: ['#ffffff', '#e2eafb', '#a8badf'] };
  RM.poolside = Object.assign({}, SUNNY, { prop: 'day', sky: ['#8ad2f6', '#a4dcf7', '#c0e8f9', '#e2f6fc'], far: 'hills', farC: ['#bce4a6', '#96ca8c'], nearC: ['#9cd88e', '#78bc78', '#a8e09a', '#82c482'],
    far2: 'canopy', far2C: ['#d4eed2', '#b8dec4', '#9ccaa8'], near: 'trees', birds: true, fence: 'wood',
    top: ['#addf83', '#9cd273', '#86c066', '#f4d6b0'], soil: ['#ecc9a0', '#dcb48a'], soilDot: '#f6dcbc', tuft: '#86c066', dots: ['#ffffff', '#fff2a6'],
    water: ['#eefcff', '#8ee2f4', '#5cc8ec', '#ffffff'], rock: ['#e8f8fc', '#b4dcec', '#f6fcff', '#ffffff', '#9fe0f0'],
    crowd: ['el:water', 'el:electric', 'el:normal', 'el:magic'],
    props: [['divingboard', 1], ['deckchair', 2], ['poolumbrella', 2], ['duckyring', 2], ['flamingo', 1], ['hedge', 2], ['poolpalm', 1], ['lifering', 1], ['poolladder', 1]] });
  RM.foggynight = { prop: 'night', dark: true, fireflies: true, fence: 'rope',
    sky: ['#3a3a76', '#484686', '#5a5494', '#6e66a4'], far2: 'mountains', far2C: ['#6c6ca4', '#5a5a92', '#a8a6d6', '#4c4c82'], far: 'hills', farC: ['#566896', '#465684'],
    near: 'clouds', nearC: ['#bcb8e0', '#dcd8f2', '#9e9acc'],
    top: ['#8cc4b8', '#7cb4aa', '#5e948c', '#9a96c4'], soil: ['#8a86bc', '#7a76ac'], soilDot: '#a8a4d4', tuft: '#5e948c', dots: ['#d8c2ff', '#fff2b0'],
    water: ['#dcd8ff', '#9a9ae0', '#7c80cc', '#ffffff'], rock: ['#b8b4d8', '#9c98c0', '#d0ccea', '#e6e4f4', '#8fe0c8'],
    cloud: ['#8a88d0', '#a4a2e0', '#7472bc'], puff: ['#c4c0e6', '#a8a4d6', '#8c88c0'], crowd: ['el:dark', 'el:poison', 'el:magic', 'el:ice'],
    props: [['hooklantern', 2, 1], ['lanternflowers', 2, 1], ['curlytree', 1], ['owlstump', 1], ['pumpkins', 2], ['signpost', 1], ['gravestone', 1], ['glowshroom', 1, 1]] };
  RM.rooftop = Object.assign({}, SUNNY, { prop: 'day', birds: true, fence: null,
    sky: ['#94d0f4', '#acdaf6', '#c6e6f8', '#e6f4fb'], far2: 'town', far2C: ['#ecebf8', '#b4b0d4', '#fff4c0'], near: 'trees', nearC: ['#9cd48a', '#78b878', '#a8dc96', '#84c282'],
    top: ['#f8c0a4', '#f0b094', '#d88c74', '#f4c8b0'], soil: ['#f2dccc', '#e2c6b2'], soilDot: '#fff0e4', tuft: '#86c066', dots: ['#ffffff', '#ffd27a'],
    water: ['#e8fbff', '#a2dcf4', '#80c8ec', '#ffffff'], rock: ['#f6c0b2', '#dc9a8c', '#fcd8ce', '#fff0ea', '#a8dc90'],
    crowd: ['el:normal', 'el:electric', 'el:rock', 'el:fire'],
    props: [['chimney', 3], ['antenna', 2], ['flowerbox', 2], ['weathervane', 1], ['rainbarrel', 1], ['roofvent', 2], ['pigeons', 1], ['plantertree', 1]] });
  RM.candyland = Object.assign({}, SUNNY, { prop: 'day', sky: ['#ffc4dc', '#ffd2e4', '#ffe0ec', '#fff2ea'], far: 'gumdrops', farC: ['#ffa6cc', '#c8b0f4', '#a8e8c4', '#fff0a0'], nearC: ['#b4ecd4', '#8ed0b6'],
    far2: 'softserve', far2C: ['#fff4f8', '#ffc4da', '#fff0c0'], fence: 'cane', birds: true,
    top: ['#ffe4ef', '#d4f4e4', '#f2bcd4', '#ffeef4'], soil: ['#f6d2a8', '#ecc092'], soilDot: '#fff4e0', tuft: null, dots: ['#fff08a', '#9fd0ff', '#a8e88a', '#ff9ec4'], sprinkles: true,
    water: ['#fffbe0', '#ffe88a', '#f6d060', '#ffffff'], rock: ['#ffc4da', '#ec9cbe', '#ffe4ee', '#ffffff', '#ffffff'], stripes: true,
    cloud: ['#ffffff', '#fff2f8', '#f6d4e6'], puff: ['#ffffff', '#ffe2f0', '#e6a8c8'], crowd: ['el:magic', 'el:normal', 'el:water', 'el:fire'],
    props: [['cottoncandytree', 1], ['lollibush', 2], ['peppermints', 2], ['candycanes', 2], ['lemonadestand', 1], ['marshmallows', 2], ['lollitree', 1], ['cupcake', 1], ['gumdrops', 1]] });
  PX.RACE_MAPS = Object.assign(PX.RACE_MAPS || {}, RM);

})();
