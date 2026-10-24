// art-plants12.js — PVZ Garden: the seventh wave, twelve more plants in TRUE chibi style (docs/pvz-art-guide.md and
// docs/chibi-reference.js): Jack O' Lantern, Ghost Pepper, Iceweed, Tiger Grass, Blockoli, Buttercup, Hocus Crocus, Snap Pea,
// Shadow Peashooter, Aloe, Grapeshot and Meteor Flower.
// Same contract as art-plants10.js: PX.PLANT_ART[id] = function (g, stage, P, C) -> geometry, PX.PLANT_PAL[id] = palette.
// The head is the character (about 8 / 9 / 10 art px by stage, its bottom near row 26), each with its own silhouette, big
// glossy eyes set low and wide, a tiny mouth, blush, flat pastel fills with one soft shade, rooted on little base leaves (Ghost
// Pepper floats, like Electric Currant); no long stems, no legs. All twelve are friendly: Jack O' Lantern's carved face grins,
// Ghost Pepper says "boo" with a smile. The core adds the bold outer edge. Walking = a hop on frame 1; arms:'up' = raised leaves.
(function () {
  'use strict';
  if (!window.PX || !PX.art) return;
  const { INK, stroke, starPts } = PX;
  const A = PX.art, mixHex = A.mixHex;
  const ART = PX.PLANT_ART, PAL = PX.PLANT_PAL;
  const piece = (g, f) => PX.piece(g, f);
  const T = (s, a, b, c) => (s === 2 ? c : s === 1 ? b : a);
  const R = Math.round, PI = Math.PI, cos = Math.cos, sin = Math.sin;
  const WHITE = '#ffffff', HOLE = '#2b2129';
  const flat = C => [C[1], C[1], C[2]];
  const LEAF = ['#c2f09a', '#86d066', '#5aa856'];
  const FIRE = ['#fff4b8', '#ffae52', '#f07c46'];
  const fm = fn => { fn.fine = true; return fn; };
  const inside = t => fm((x, y) => t.filled(x, y));
  const clampX = (x, m) => Math.max(m, Math.min(32 - m, x));
  const topOf = g => { for (let fy = 0; fy < g.fh; fy++) for (let fx = 0; fx < g.fw; fx++) if (g.fget(fx, fy)) return Math.floor(fy / g.k); return 0; };
  const hopOf = P => (P.walk && P.frame ? -1.5 : P.arms === 'up' ? -1 : P.frame ? 0.3 : 0);

  // ---------------- shared bits (as art-plants10.js) ----------------
  // soft shade for a flat R[1] silhouette on a piece layer: mid pixels whose neighbour (dx, dy) down-right is outside go R[2]
  function shadeShape(t, Rm, dx, dy) {
    const k = t.k, ox = Math.max(1, R(dx * k)), oy = Math.max(1, R(dy * k)), W = t.fw, list = [];
    for (let fy = 0; fy < t.fh; fy++) for (let fx = 0; fx < W; fx++) if (t.a[fy * W + fx] === Rm[1] && t.fget(fx + ox, fy + oy) === null) list.push(fy * W + fx);
    for (const i of list) t.a[i] = Rm[2];
  }
  const shine = (t, x, y, rx, ry, col, rot) => t.ell(x, y, rx, ry, col, rot == null ? -0.55 : rot, inside(t));
  function baseLeaves(g, P, L, o) {
    o = o || {};
    const cx = o.cx == null ? 15.4 : o.cx, sp = o.sp == null ? 4.2 : o.sp, len = o.len || 4.4, y = o.y || 28.7;
    const a = P.arms === 'up' ? -0.5 : P.arms === 'out' || P.arms === 'paddle' ? 0.04 : 0.22, ly = P.arms === 'up' ? y - 0.5 : y;
    piece(g, t => { t.ell(cx - sp, ly, len, 1.9, flat(L), -a); t.ell(cx + sp, ly, len, 1.9, flat(L), a); });
  }
  const stem = (g, x, y0, y1, col, r) => piece(g, t => stroke(t, [[x, y0], [x, y1]], r || 0.95, r || 0.95, col));
  // BIG glossy eyes + blush (art director v3 ratios) for a face of radius r
  function eyes(g, ex, ey, r, P, o) {
    o = o || {};
    A.chibiEyes(g, ex, ey, Object.assign({ sp: r * 0.86, w: r * 0.48, h: r * 0.64, mood: P.eyes || o.mood }, o.eye));
    if (o.blush !== false) A.blush(g, ex - 0.2, ey + r * 0.42, Object.assign({ sp: r }, o.bl));
  }
  // a pointed leaf / blade from its base (x, y): length len, angle ang (0 = right, negative = up), half width w
  function pointLeaf(t, x, y, len, ang, w, col) {
    const c = cos(ang), s = sin(ang), nx = -s * w, ny = c * w, pts = [];
    const prof = [[0, 0.3], [0.18, 0.82], [0.42, 1], [0.66, 0.82], [0.86, 0.42], [1, 0]];
    for (const [u, k] of prof) pts.push([x + c * len * u + nx * k, y + s * len * u + ny * k]);
    for (let i = prof.length - 2; i >= 0; i--) { const [u, k] = prof[i]; pts.push([x + c * len * u - nx * k, y + s * len * u - ny * k]); }
    t.poly(pts, col);
  }
  // a little four-point sparkle (its own outlined piece)
  const sparkle = (g, x, y, s, col) => piece(g, t => t.poly(starPts(x, y, 1.9 * s, 0.6 * s, 4), col || '#fff6a0'));
  // a soft see-through glow round (x, y) on empty pixels only (the bold edge skips it); rgb = 'r,g,b'
  function glow(g, x, y, gr, rgb, a) {
    const k = g.k;
    for (let fy = Math.floor((y - gr - 1.4) * k); fy <= Math.ceil((y + gr + 1.4) * k); fy++) for (let fx = Math.floor((x - gr - 1.4) * k); fx <= Math.ceil((x + gr + 1.4) * k); fx++) {
      if (fx < 0 || fy < 0 || fx >= g.fw || fy >= g.fh || g.fget(fx, fy) !== null) continue;
      const d = Math.hypot((fx + 0.5) / k - x, (fy + 0.5) / k - y);
      if (d <= gr) g.fset(fx, fy, `rgba(${rgb},${a})`); else if (d <= gr + 1.3) g.fset(fx, fy, `rgba(${rgb},${(a / 2).toFixed(2)})`);
    }
  }
  // a little flame from its base (x, y): height fh, half-width fw, its tip leaning by lean (x fh); F = [core, mid, shade]
  function flame(t, x, y, fh, fw, lean, F) {
    const tx = x + lean * fh, ty = y - fh;
    t.ell(x, y - fw * 0.85, fw, fw * 0.92, F[1]);
    t.poly([[x - fw * 0.98, y - fw * 0.95], [x - fw * 0.62, y - fh * 0.5], [tx, ty], [x + fw * 0.72, y - fh * 0.48], [x + fw * 0.98, y - fw * 0.95]], F[1]);
    shadeShape(t, F, 0.35, 0.4);
    t.ell(x + 0.1, y - fw * 0.72, fw * 0.52, fw * 0.55, F[0]);
    t.poly([[x - fw * 0.45, y - fw * 0.8], [x + lean * fh * 0.45, y - fh * 0.55], [x + fw * 0.5, y - fw * 0.8]], F[0]);
  }
  const flamePiece = (g, x, y, fh, fw, lean, F) => piece(g, t => flame(t, x, y, fh, fw, lean, F));
  // a soft round ground shadow (see-through, so the bold edge skips it) for the floaters
  function groundShadow(g, x, y, rx) {
    const k = g.k;
    for (let fy = Math.floor((y - 1.2) * k); fy <= Math.ceil((y + 1.2) * k); fy++) for (let fx = Math.floor((x - rx) * k); fx <= Math.ceil((x + rx) * k); fx++) {
      if (fx < 0 || fy < 0 || fx >= g.fw || fy >= g.fh || g.fget(fx, fy) !== null) continue;
      if ((((fx + 0.5) / k - x) / rx) ** 2 + (((fy + 0.5) / k - y) / 0.95) ** 2 <= 1) g.fset(fx, fy, 'rgba(80,60,110,0.22)');
    }
  }

  // =====================================================================================================
  // Jack O' Lantern -> Jack O' Flame -> Jack O' Inferno
  // A plump orange pumpkin (three soft lobes, gentle ribs, a green stem with a curly vine) with a glowing CARVED face (the carved
  // face is the face, like Pumpkin): two round-cornered triangle eyes and a big happy grin with two square teeth, all lit warm
  // yellow from inside, plus rosy cheeks. Fire flickers out of the top behind the stem: one flame at stage 0, a bigger flame and a
  // little one at stage 1, a crown of three flames and embers at stage 2. Halloween-y, cheeky, never mad.
  PAL.jackolantern = { main: ['#ffdcae', '#ffa654', '#e8813e'], leaf: LEAF, acc: FIRE, stem: '#7e9c4c', root: '#8a6a3a', part: 'pumpkin' };
  ART.jackolantern = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, F = C.acc, f = P.frame ? 1 : 0;
    const r = T(stage, 8, 8.8, 9.4), rx = r * 1.15, ry = r * 0.9, hx = 15.5, hy = 26.7 - ry + h, top = hy - ry;
    baseLeaves(g, P, C.leaf, { sp: 5.2, len: 4.0 });
    // the fire out of the top (behind the stem and the pumpkin's crown)
    const fl = T(stage, [[-0.4, 7.4, 3.1, 0.12]], [[-0.3, 7.8, 3.4, 0.14], [4.0, 5.2, 2.2, 0.3]], [[-0.2, 7.2, 3.5, 0.1], [-4.6, 5.4, 2.3, -0.25], [4.4, 5.6, 2.3, 0.28]]);
    fl.forEach(([dx, fh, fw, lean], i) => flamePiece(g, hx + dx, top - 0.4 + Math.abs(dx) * 0.4, fh * (1 + ((i + f) % 2 ? 0.08 : 0)), fw, lean + ((i + f) % 2 ? 0.05 : -0.04), F));
    piece(g, t => { // the pumpkin: three soft lobes
      t.ell(hx - rx * 0.43, hy + 0.35, rx * 0.6, ry * 0.94, M[1], 0.05);
      t.ell(hx + rx * 0.43, hy + 0.35, rx * 0.6, ry * 0.94, M[1], -0.05);
      t.ell(hx, hy, rx * 0.62, ry, M[1]);
      shadeShape(t, M, rx * 0.11, ry * 0.12);
      shine(t, hx - rx * 0.55, hy - ry * 0.45, 1.5, 0.75, M[0], -0.6);
    });
    // gentle ribs between the lobes
    for (const k of [-1, 1]) { const x = hx + k * rx * 0.24; stroke(g, [[x + k * 0.2, top + 1.2], [x + k * 0.6, hy], [x + k * 0.2, hy + ry - 1.2]], 0.2, 0.2, M[2]); }
    // the stem and its curly vine + leaf
    piece(g, t => { t.poly([[hx - 1.0, top + 1.2], [hx - 0.7, top - 1.6], [hx + 0.9, top - 1.9], [hx + 1.0, top + 1.2]], '#8aa456'); t.ell(hx + 0.1, top - 1.8, 0.95, 0.5, '#a8c070'); });
    if (stage >= 1) {
      piece(g, t => stroke(t, [[hx + 0.9, top - 0.6], [hx + 2.6, top - 1.6], [hx + 3.4, top - 0.4], [hx + 2.6, top + 0.2]], 0.32, 0.28, '#7cb850'));
      piece(g, t => { pointLeaf(t, hx - 0.8, top + 0.2, 4.2, PI + 0.35, 1.5, C.leaf[1]); shadeShape(t, C.leaf, 0.3, 0.4); });
    }
    // the carved face, lit from inside
    const ex = hx + 0.8, ey = hy + ry * 0.02, sp = r * 0.92, ew = r * 0.3, eh = r * 0.32, RIM = '#7a3e22', G1 = '#ffd45e', G2 = '#fff6c0';
    const shut = P.eyes === 'closed' || P.eyes === 'happy' || P.eyes === 'blink' || P.eyes === 'sleepy';
    for (const s of [-1, 1]) {
      const x = ex + s * sp / 2;
      if (shut) { stroke(g, [[x - ew, ey + eh * 0.5], [x, ey - eh * 0.45], [x + ew, ey + eh * 0.5]], 0.6, 0.6, RIM); stroke(g, [[x - ew * 0.8, ey + eh * 0.4], [x, ey - eh * 0.3], [x + ew * 0.8, ey + eh * 0.4]], 0.32, 0.32, G1); continue; }
      // a round-cornered triangle, point up
      const tri = (k, c) => { g.poly([[x - ew * k, ey + eh * k], [x + ew * k, ey + eh * k], [x + 0.1, ey - eh * 1.15 * k]], c); g.ell(x - ew * k * 0.72, ey + eh * k * 0.72, 0.55 * k, 0.5 * k, c); g.ell(x + ew * k * 0.72, ey + eh * k * 0.72, 0.55 * k, 0.5 * k, c); };
      tri(1.22, RIM); tri(0.92, G1);
      g.ell(x + 0.1, ey + eh * 0.35, ew * 0.45, eh * 0.3, G2);
      if (P.eyes === 'mad' || P.eyes === 'brave') stroke(g, [[x - ew * 1.2, ey - eh * (s < 0 ? 1.7 : 1.1)], [x + ew * 1.2, ey - eh * (s < 0 ? 1.1 : 1.7)]], 0.42, 0.42, RIM);
    }
    const open = P.mouth === 'open' || P.mouth === 'grin', my = hy + ry * 0.42, mw = r * 0.58, md = open ? 2.6 : 1.9;
    const grin = (k, dy, c) => { const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10 * 2 - 1; pts.push([ex + u * mw * k, my - 0.3 + dy + u * u * -0.8 * k]); } for (let i = 10; i >= 0; i--) { const u = i / 10 * 2 - 1; pts.push([ex + u * mw * k * 0.9, my - 0.3 + dy + (1 - u * u) * md * k - u * u * 0.4]); } g.poly(pts, c); };
    grin(1.14, -0.25, RIM); grin(0.92, 0, G1);
    g.ell(ex, my + md * 0.45, mw * 0.4, md * 0.22, G2);
    for (const s of [-0.38, 0.32]) g.poly([[ex + s * mw - 0.5, my - 0.55], [ex + s * mw + 0.5, my - 0.55], [ex + s * mw + 0.5, my + 0.45], [ex + s * mw - 0.5, my + 0.45]], M[1]);
    A.blush(g, ex - 0.2, ey + r * 0.38, { sp: r * 1.25, col: '#ff8a6a' });
    // embers (stage 2)
    if (stage === 2) for (const [x, y] of f ? [[hx + 6.4, top - 3.4], [hx - 6.6, top - 1.4]] : [[hx + 6.8, top - 1.6], [hx - 6.0, top - 3.6]]) piece(g, t => t.ell(x, y, 0.55, 0.55, F[1]));
    return { hx: R(hx), hy: R(hy), hr: R(r), top: R(top - 1), ey: R(ey), hat: { x: R(hx), y: R(top + 1.6), w: R(rx * 1.4) } };
  };

  // =====================================================================================================
  // Ghost Pepper -> Boo Pepper -> Phantom Pepper
  // A little white ghost shaped like a pepper: a round head that tapers into a curly ghost tail (the pepper's tip), a green pepper
  // cap of round leaves and a curly stem on top, two stubby ghost arms, big eyes and an "o" mouth going BOO (with a smile when
  // it's happy), lilac cheeks. It floats over a soft shadow and bobs. Purple ghost-flame wisps swirl round it from stage 1; at
  // stage 2 it glows softly.
  PAL.ghostpepper = { main: ['#ffffff', '#f0e8fb', '#c8b6e6'], leaf: ['#d2f4ac', '#8fd46e', '#5ea84e'], acc: ['#f6e6ff', '#c690f0', '#9c66d8'], stem: '#62ac50', root: '#8a6a3a', part: 'flame' };
  ART.ghostpepper = function (g, stage, P, C) {
    const f = P.frame ? 1 : 0, M = C.main, W = C.acc, L = C.leaf;
    const bob = P.walk && f ? -1.5 : P.arms === 'up' ? -1 : f ? -0.6 : 0;
    const r = T(stage, 7.4, 8.2, 9.0), hx = 15.0, hy = 27.0 - r * 1.42 + bob;
    groundShadow(g, 15.4, 30.3, T(stage, 4.2, 4.8, 5.4));
    if (stage === 2) glow(g, hx + 0.4, hy + r * 0.3, r + 2.2, '200,150,240', 0.18);
    const sw = f ? 0.25 : -0.15;
    piece(g, t => { // the ghost body: a round head tapering into a curly pepper-tip tail, and two stubby arms
      t.ell(hx, hy, r, r * 0.95, M[1]);
      t.poly([[hx - r * 0.98, hy + 0.2], [hx + r * 0.98, hy + 0.2], [hx + r * 0.72, hy + r * 0.85], [hx + r * 0.25, hy + r * 1.28], [hx - r * (0.35 + sw * 0.4), hy + r * 1.55], [hx - r * 0.72, hy + r * 1.22], [hx - r * 0.92, hy + r * 0.7]], M[1]);
      t.ell(hx - r * (0.62 + sw * 0.3), hy + r * 1.42, 1.25, 0.95, M[1], 0.4);
      const up = P.arms === 'up';
      t.ell(hx + r * 0.98, hy + r * (up ? 0.05 : 0.5), 1.5, 1.1, M[1], up ? -0.9 : 0.5);
      t.ell(hx - r * 0.98, hy + r * (up ? 0.05 : 0.5), 1.5, 1.1, M[1], up ? 0.9 : -0.5);
      shadeShape(t, M, r * 0.12, r * 0.12);
      shine(t, hx - r * 0.5, hy - r * 0.55, 1.4, 0.7, WHITE, -0.6);
    });
    // the pepper cap: round green leaves over the crown and a curly stem
    const cy = hy - r * 0.8;
    piece(g, t => { for (const [a, k] of [[-2.5, 0.95], [-1.95, 1], [-1.2, 1], [-0.65, 0.95]]) t.ell(hx + cos(a) * r * 0.52, cy + 0.9 + sin(a) * 0.9, 2.1 * k, 1.2 * k, L[1], a + PI / 2); shadeShape(t, L, 0.3, 0.4); });
    piece(g, t => stroke(t, [[hx - 0.2, cy - 0.2], [hx + 0.3, cy - 2.2], [hx + 1.6, cy - 3.0], [hx + 2.4, cy - 2.2]], 0.42, 0.34, C.stem));
    // purple ghost-flame wisps
    const wisps = T(stage, [], [[hx + r + 3.0, hy - r * 0.55, 3.0], [hx - r - 2.4, hy + r * 0.4, 2.6]], [[hx + r + 3.2, hy - r * 0.6, 3.4], [hx - r - 2.6, hy + r * 0.25, 3.0], [hx + r + 2.6, hy + r * 0.9, 2.6]]);
    wisps.forEach(([x, y, s], i) => flamePiece(g, clampX(x, 2.2), y + 1.2 + ((i + f) % 2 ? -0.5 : 0), s, s * 0.42, (i % 2 ? -0.18 : 0.18), W));
    const ex = hx + 0.7, ey = hy + r * 0.12;
    eyes(g, ex, ey, r, P, { bl: { col: '#e8a6e6' } });
    A.chibiMouth(g, ex + 0.1, ey + r * 0.5, P.mouth || (P.eyes === 'happy' ? 'smile' : 'o'), 2.2);
    return { hx: R(hx), hy: R(hy), hr: R(r), top: R(cy - 3), ey: R(ey), hat: { x: R(hx), y: R(hy - r * 0.95 + 1.4), w: R(r * 1.5) } };
  };

  // =====================================================================================================
  // Iceweed -> Frostweed -> Blizzard Weed
  // A round icy-blue bulb with a happy face, in a spiky fan of pointed frosty leaves (5 / 7 / 9 by stage) with white frost
  // tips; little icy base leaves. Snowflake sparkles drift round it; stage 2 wears a crown of ice crystals.
  PAL.iceweed = { main: ['#f4fdff', '#c4ebfa', '#94cde8'], leaf: ['#e6faff', '#a2daf0', '#72b8dc'], acc: ['#ffffff', '#e2f6ff', '#acdcf2'], stem: '#7fb6c8', root: '#8a6a3a', part: 'holly' };
  function snowflake(g, x, y, s, col) {
    piece(g, t => { for (let i = 0; i < 3; i++) { const a = i * PI / 3; stroke(t, [[x - cos(a) * s, y - sin(a) * s], [x + cos(a) * s, y + sin(a) * s]], 0.3, 0.3, col); } t.ell(x, y, 0.5, 0.5, col); });
  }
  ART.iceweed = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, L = C.leaf, f = P.frame ? 1 : 0;
    const r = T(stage, 7.2, 8.0, 8.8), hx = 15.5, hy = 26.6 - r * 0.95 + h;
    baseLeaves(g, P, L, { sp: 4.6, len: 4.0 });
    // the fan of frosty leaves behind the bulb
    const n = T(stage, 5, 7, 9), len = T(stage, 8.0, 9.4, 10.4), sway = P.walk && f ? 0.06 : 0;
    piece(g, t => {
      for (let i = 0; i < n; i++) { const a = -PI + 0.32 + i * (PI - 0.64) / (n - 1) + sway, l = len * (1 - Math.abs(i - (n - 1) / 2) / n * 0.5); pointLeaf(t, hx + cos(a) * r * 0.3, hy + sin(a) * r * 0.25, l + r * 0.6, a, T(stage, 1.7, 1.8, 1.9), L[1]); }
      shadeShape(t, L, 0.35, 0.45);
      // white frost tips
      for (let i = 0; i < n; i++) { const a = -PI + 0.32 + i * (PI - 0.64) / (n - 1) + sway, l = len * (1 - Math.abs(i - (n - 1) / 2) / n * 0.5) + r * 0.6, x = hx + cos(a) * r * 0.3 + cos(a) * l * 0.86, y = hy + sin(a) * r * 0.25 + sin(a) * l * 0.86; t.ell(x, y, 0.85, 0.85, WHITE, 0, inside(t)); }
    });
    piece(g, t => { A.softBody(t, hx, hy, r * 1.02, r * 0.95, M); });
    // a frosty swirl on its crown
    stroke(g, [[hx - r * 0.45, hy - r * 0.62], [hx - r * 0.1, hy - r * 0.78], [hx + r * 0.2, hy - r * 0.6]], 0.24, 0.24, WHITE);
    if (stage === 2) piece(g, t => { for (const [dx, hh] of [[-3, 3.2], [0, 4.4], [3, 3.2]]) t.poly([[hx + dx - 1.1, hy - r * 0.86 + 0.6], [hx + dx, hy - r * 0.86 - hh], [hx + dx + 1.1, hy - r * 0.86 + 0.6]], C.acc[1]); shadeShape(t, C.acc, 0.3, 0.3); });
    const flakes = T(stage, [[hx + r + 3.2, hy - r * 0.9, 1.1]], [[hx + r + 3.4, hy - r * 1.0, 1.2], [hx - r - 3.0, hy - r * 0.2, 1.0]], [[hx + r + 3.6, hy - r * 1.05, 1.3], [hx - r - 3.2, hy - r * 0.3, 1.1], [hx + r + 2.8, hy + r * 0.5, 0.95]]);
    flakes.forEach(([x, y, s], i) => snowflake(g, clampX(x, 2.4), y + ((i + f) % 2 ? -0.5 : 0), s, '#f2fbff'));
    const ex = hx + 0.7, ey = hy + r * 0.16;
    eyes(g, ex, ey, r, P, { bl: { col: '#ffb8d0' } });
    A.chibiMouth(g, ex + 0.1, ey + r * 0.5, P.mouth || 'smile', 2.1);
    return { hx: R(hx), hy: R(hy), hr: R(r), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - r * 0.95 + 1.4), w: R(r * 1.5) } };
  };

  // =====================================================================================================
  // Tiger Grass -> Tiger Thicket -> Royal Tiger Grass
  // A round orange tiger-cub face (dark tiger stripes on the forehead and cheeks, two round ears with pink insides, a cream muzzle
  // and a cat mouth) peeking out of a fan of tall green grass blades with dark stripes; a grass tuft round its base. More and
  // taller blades by stage; stage 2 has a little gold crown of thorns.
  PAL.tigergrass = { main: ['#fff0c8', '#ffc464', '#ec9a3e'], leaf: ['#d2f4ac', '#8fd46e', '#5ea84e'], acc: ['#fff8e6', '#fbecd0', '#e0c8a0'], stem: '#62ac50', root: '#8a6a3a', part: 'spikes' };
  const STRIPE = '#7a4e34';
  ART.tigergrass = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, L = C.leaf, f = P.frame ? 1 : 0;
    const r = T(stage, 7.6, 8.4, 9.2), rx = r * 1.04, ry = r * 0.92, hx = 15.4, hy = 26.4 - ry + h;
    // the fan of tall grass blades (behind)
    const n = T(stage, 5, 7, 9), sway = P.walk && f ? 0.05 : f ? 0.02 : 0;
    piece(g, t => {
      for (let i = 0; i < n; i++) { const u = i / (n - 1) * 2 - 1, mid = 1 - Math.abs(u); pointLeaf(t, hx + u * 7.4, 28 + h, T(stage, 15, 17.5, 19.5) * (0.82 + mid * 0.18), -PI / 2 + u * 0.42 + sway, 1.4, L[1]); }
      shadeShape(t, L, 0.35, 0.45);
    });
    // dark stripes across the blades
    for (let i = 0; i < n; i++) { const v = i / (n - 1) * 2 - 1, a = -PI / 2 + v * 0.42 + sway, l = T(stage, 15, 17.5, 19.5) * (0.82 + (1 - Math.abs(v)) * 0.18); for (const u of [0.6, 0.76]) { const x = hx + v * 7.4 + cos(a) * l * u, y = 28 + h + sin(a) * l * u, nx = -sin(a), ny = cos(a); stroke(g, [[x - nx * 0.9, y - ny * 0.9], [x + nx * 0.9, y + ny * 0.9]], 0.24, 0.24, '#4e8a40'); } }
    // the ears
    for (const s of [-1, 1]) piece(g, t => { const x = hx + s * rx * 0.62 - 0.3, y = hy - ry * 0.78; t.ell(x, y, 2.2, 2.1, M[1]); shadeShape(t, M, 0.3, 0.35); t.ell(x + 0.1, y + 0.2, 1.1, 1.0, '#ffb6c2', 0, inside(t)); });
    piece(g, t => { A.softBody(t, hx, hy, rx, ry, M); });
    // tiger stripes (forehead + cheeks), only on the face
    const onFace = fm((x, y) => ((x - hx) / rx) ** 2 + ((y - hy) / ry) ** 2 < 0.92);
    const st = (pts, w) => { const u = new PX.Grid(g.w, g.h, g.k); stroke(u, pts, w, 0.12, STRIPE); for (let i = 0; i < u.a.length; i++) if (u.a[i] && onFace((i % g.fw + 0.5) / g.k, (Math.floor(i / g.fw) + 0.5) / g.k)) g.a[i] = STRIPE; };
    st([[hx + 0.4, hy - ry], [hx + 0.5, hy - ry * 0.55]], 0.62); st([[hx - 2.2, hy - ry * 0.96], [hx - 1.6, hy - ry * 0.6]], 0.5); st([[hx + 3.0, hy - ry * 0.92], [hx + 2.6, hy - ry * 0.58]], 0.5);
    for (const s of [-1, 1]) { st([[hx + s * rx, hy + ry * 0.05], [hx + s * rx * 0.66, hy + ry * 0.12]], 0.5); st([[hx + s * rx, hy + ry * 0.36], [hx + s * rx * 0.7, hy + ry * 0.38]], 0.45); }
    // the cream muzzle
    const ex = hx + 0.7, ey = hy + ry * 0.12;
    piece(g, t => { t.ell(ex - 1.1, ey + r * 0.5, 1.9, 1.35, C.acc[1]); t.ell(ex + 1.3, ey + r * 0.5, 1.9, 1.35, C.acc[1]); });
    g.ell(ex + 0.1, ey + r * 0.32, 0.75, 0.5, '#e87a8a');
    eyes(g, ex, ey - 0.4, r, P, { blush: false });
    A.chibiMouth(g, ex + 0.1, ey + r * 0.5, P.mouth === 'open' ? 'open' : 'cat', 2.2);
    // a grass tuft round its base (in front)
    piece(g, t => { for (const [x, a, l] of [[10.2, -2.3, 4.0], [12.0, -1.95, 4.8], [19.6, -1.2, 4.8], [21.2, -0.85, 4.0]]) pointLeaf(t, x, 30.6, l, a, 1.2, L[1]); shadeShape(t, L, 0.3, 0.4); });
    if (stage === 2) piece(g, t => { const y = hy - ry - 0.2; t.poly([[hx - 3.2, y + 1.4], [hx - 3.0, y - 1.6], [hx - 1.6, y - 0.2], [hx, y - 2.4], [hx + 1.6, y - 0.2], [hx + 3.0, y - 1.6], [hx + 3.2, y + 1.4]], '#ffd75a'); shadeShape(t, ['#fff6c0', '#ffd75a', '#e0a83a'], 0.3, 0.4); });
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: R(hy - ry - 2), ey: R(ey), hat: { x: R(hx), y: R(hy - ry + 1.4), w: R(rx * 1.5) } };
  };

  // =====================================================================================================
  // Blockoli -> Big Blockoli -> Blockoli Fortress
  // A sturdy broccoli: a big bushy cloud of dark-green florets (round bumps with little bud dots) on top of a chunky pale-green
  // stalk that carries the face, on two base leaves. Stage 1 sprouts two little side florets; stage 2 holds up a leafy shield.
  PAL.blockoli = { main: ['#f2fbdc', '#cbe9a4', '#a0cc7e'], leaf: LEAF, acc: ['#bfe896', '#70ba5c', '#4f9c4c'], stem: '#62ac50', root: '#8a6a3a', part: 'shell' };
  ART.blockoli = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, B = C.acc, f = P.frame ? 1 : 0;
    const r = T(stage, 8, 9, 10), rx = r * 0.86, ry = r * 0.72, cx = 15.5, cy = 29.6 - ry + h, top = cy - ry;
    baseLeaves(g, P, C.leaf, { sp: 5.0 });
    // side florets on little branches (stage 1+)
    if (stage >= 1) for (const s of [-1, 1]) {
      const bx = cx + s * (rx + 1.8), by = cy - ry * 0.25 - (f && s > 0 ? 0.4 : 0);
      piece(g, t => stroke(t, [[cx + s * rx * 0.6, cy], [bx, by + 1]], 0.8, 0.7, M[1]));
      piece(g, t => { for (const [dx, dy, k] of [[-1, 0, 1], [1, 0, 1], [0, -1.1, 1.05]]) t.ell(bx + dx, by + dy, 1.5 * k, 1.4 * k, B[1]); shadeShape(t, B, 0.3, 0.35); });
    }
    // the stalk with the face
    piece(g, t => { A.softBody(t, cx, cy, rx, ry, M); });
    // the floret cloud on top
    const fr = r * 0.42, bumps = [[-1.15, 0.45], [1.15, 0.45], [-0.62, -0.25], [0.62, -0.25], [0, -0.75], [0, 0.35]];
    if (stage === 2) bumps.push([-1.55, -0.2], [1.55, -0.2]);
    const fy = top - fr * 0.35;
    piece(g, t => {
      for (const [dx, dy] of bumps) t.ell(cx + dx * fr * 1.12, fy + dy * fr * 1.12, fr, fr * 0.94, B[1]);
      shadeShape(t, B, 0.45, 0.5);
      for (const [dx, dy] of bumps) t.ell(cx + dx * fr * 1.12 - fr * 0.35, fy + dy * fr * 1.12 - fr * 0.4, fr * 0.3, fr * 0.2, B[0], -0.5, inside(t));
    });
    // little bud dots on the florets
    for (const [dx, dy] of bumps) for (const [a, b] of [[0.3, 0.2], [-0.15, 0.45], [0.5, -0.2]]) { const x = cx + dx * fr * 1.12 + a * fr, y = fy + dy * fr * 1.12 + b * fr; if (g.get(x, y) === B[1]) g.dot(x, y, B[2]); }
    const ex = cx + 0.6, ey = cy + ry * 0.1;
    eyes(g, ex, ey, r * 0.82, P);
    A.chibiMouth(g, ex + 0.1, ey + r * 0.4, P.mouth || 'smile', 2.1);
    // the leafy shield (stage 2): a broad rounded leaf with a vein, held up at its side
    if (stage === 2) {
      const sx = 25.6, sy = 24.6 + h;
      piece(g, t => { t.poly([[sx - 3.4, sy - 3.6], [sx + 3.4, sy - 3.6], [sx + 3.4, sy + 0.6], [sx, sy + 4.4], [sx - 3.4, sy + 0.6]], C.leaf[1]); shadeShape(t, C.leaf, 0.4, 0.5); shine(t, sx - 1.8, sy - 2.4, 1.0, 0.5, C.leaf[0]); });
      stroke(g, [[sx, sy - 3.2], [sx, sy + 3.4]], 0.22, 0.22, C.leaf[2]);
      for (const k of [-1, 1]) stroke(g, [[sx, sy - 0.6], [sx + k * 2.2, sy - 2.2]], 0.2, 0.2, C.leaf[2]);
    }
    return { hx: R(cx), hy: R(cy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(cx), y: R(fy - fr * 0.6), w: R(fr * 3.2) } };
  };

  // =====================================================================================================
  // Buttercup -> Golden Buttercup -> Buttercup Bouquet
  // A glossy butter-yellow cup flower: five round, shiny petals cupped round a warm cream face (two up behind it, three cupping
  // its sides and chin), each with a white gloss streak; smile and blush. Stage 1 gets a ring of extra petals and a bud on its
  // own stem; stage 2 is a little bouquet: two small buttercups on stems either side.
  PAL.buttercup = { main: ['#fffbd2', '#ffe45c', '#f2c03c'], leaf: LEAF, acc: ['#fff4d0', '#ffda8e', '#e8b964'], stem: '#62ac50', root: '#8a6a3a', part: 'petals' };
  function cupFlower(g, x, y, pr, M, back) {
    piece(g, t => { for (const a of back ? [-2.2, -1.57, -0.94] : [-2.5, -1.57, -0.64, 0.5, 2.64]) t.ell(x + cos(a) * pr * 0.9, y + sin(a) * pr * 0.9, pr * 0.72, pr * 0.62, M[1], a); shadeShape(t, M, 0.35, 0.4); });
  }
  ART.buttercup = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, FC = C.acc, f = P.frame ? 1 : 0;
    const fr = T(stage, 6.2, 6.8, 7.4), pr = fr * 1.0, hx = 15.5, hy = 26.2 - fr - pr * 0.5 + h;
    baseLeaves(g, P, C.leaf);
    stem(g, 15.6, 28.6, hy + fr, C.stem);
    // an extra ring of petals peeking out behind (stage 1+)
    if (stage >= 1) piece(g, t => { for (const a of [-2.85, -1.95, -1.2, -0.3]) t.ell(hx + cos(a) * pr * 1.45, hy + sin(a) * pr * 1.3, pr * 0.5, pr * 0.42, mixHex(M[1], '#ffc040', 0.25), a); shadeShape(t, [M[0], mixHex(M[1], '#ffc040', 0.25), M[2]], 0.3, 0.35); });
    cupFlower(g, hx, hy, pr, M, true);
    cupFlower(g, hx, hy + 0.6, pr, M, false);
    // gloss streaks on the petals
    for (const a of [-2.5, -1.57, -0.64, 2.64, -2.2]) { const x = hx + cos(a) * pr * 1.15, y = hy + 0.4 + sin(a) * pr * 1.12; if (g.get(x, y) === M[1]) { g.dot(x - 0.3, y - 0.2, WHITE); g.dot(x + 0.2, y - 0.4, WHITE); } }
    piece(g, t => { A.softBody(t, hx, hy + 0.3, fr, fr * 0.96, FC); });
    // the little side buttercups (stage 2) and the bud (stage 1)
    if (stage === 2) for (const s of [-1, 1]) {
      const x = hx + s * 10.6, y = 23.4 + h - (f && s > 0 ? 0.4 : 0);
      piece(g, t => stroke(t, [[hx + s * 3, 28.4], [x - s * 0.6, y + 2.4]], 0.4, 0.34, C.stem));
      piece(g, t => { for (let i = 0; i < 5; i++) { const a = -PI / 2 + i * 2 * PI / 5; t.ell(x + cos(a) * 1.7, y + sin(a) * 1.7, 1.55, 1.35, M[1], a); } shadeShape(t, M, 0.3, 0.35); });
      piece(g, t => t.ell(x, y, 1.0, 1.0, '#f2a83c'));
    } else if (stage === 1) {
      const x = hx - 10.4, y = 22.6 + h + (f ? -0.4 : 0);
      piece(g, t => stroke(t, [[hx - 2.6, 28.4], [x + 0.4, y + 1.6]], 0.38, 0.32, C.stem));
      piece(g, t => { t.ell(x, y, 1.6, 2.1, M[1], 0.2); shadeShape(t, M, 0.3, 0.35); });
      piece(g, t => { t.ell(x - 0.9, y + 1.6, 1.1, 0.6, C.leaf[1], -0.5); t.ell(x + 0.9, y + 1.6, 1.1, 0.6, C.leaf[1], 0.5); });
    }
    const ex = hx + 0.6, ey = hy + fr * 0.2;
    eyes(g, ex, ey, fr * 1.04, P, { eye: { col: '#4a2c22' }, bl: { col: '#ff9a7a' } });
    A.chibiMouth(g, ex + 0.1, ey + fr * 0.5, P.mouth || 'smile', 2.1);
    return { hx: R(hx), hy: R(hy), hr: R(fr + pr * 0.6), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - fr + 1.2), w: R(fr * 1.6) } };
  };

  // =====================================================================================================
  // Hocus Crocus -> Hocus Pocus -> Crocus Wizard
  // A lilac crocus: tall pointed violet petals rising round a pale lilac face like a wizard's hood (three up behind it, two
  // cupping its cheeks), three orange stamens peeking over its head, big eyes with lashes and a smile. Stage 1 holds a little
  // star wand on a leaf; stage 2's middle petal grows into a tall pointy wizard-hat tip with gold stars, and sparkles float round it.
  PAL.hocuscrocus = { main: ['#f0e2ff', '#b98ce8', '#956acc'], leaf: LEAF, acc: ['#fff0c0', '#ffb84c', '#ee8a34'], stem: '#62ac50', root: '#8a6a3a', part: 'witchhat' };
  const FACE_L = ['#fdf8ff', '#ece0fa', '#cfbcec'];
  ART.hocuscrocus = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, f = P.frame ? 1 : 0;
    const fr = T(stage, 6.8, 7.4, 8.0), hx = 15.4, hy = 26.4 - fr + h;
    baseLeaves(g, P, C.leaf);
    // the stamens (behind the petals)
    piece(g, t => { for (const dx of [-1.6, 0, 1.6]) { const x = hx + dx, y0 = hy - fr * 0.6, y1 = hy - fr - T(stage, 1.2, 1.4, 1.2) + Math.abs(dx) * 0.4; stroke(t, [[x, y0], [x + dx * 0.25, y1]], 0.32, 0.32, C.acc[1]); t.ell(x + dx * 0.25, y1 - 0.5, 0.75, 1.0, C.acc[1]); } });
    // the tall back petals
    const pl = T(stage, 14.0, 15.4, 16.2);
    piece(g, t => {
      pointLeaf(t, hx - 1.2, hy + 2, pl * 0.95, -PI / 2 - 0.5, 2.7, M[1]);
      pointLeaf(t, hx + 1.4, hy + 2, pl * 0.95, -PI / 2 + 0.5, 2.7, M[1]);
      if (stage < 2) pointLeaf(t, hx + 0.1, hy + 2, pl, -PI / 2, 2.6, M[1]);
      shadeShape(t, M, 0.45, 0.5);
    });
    // stage 2: the middle petal is a tall pointy wizard hat tip with gold stars
    if (stage === 2) {
      piece(g, t => { pointLeaf(t, hx + 0.2, hy - fr * 0.4, 13.0, -PI / 2 - 0.08 + (f ? 0.04 : 0), 3.6, mixHex(M[1], '#7a54c0', 0.3)); shadeShape(t, [M[0], mixHex(M[1], '#7a54c0', 0.3), M[2]], 0.4, 0.5); });
      for (const [x, y, s] of [[hx - 0.4, hy - fr - 3.2, 0.8], [hx + 0.6, hy - fr - 7.4, 0.62]]) piece(g, t => t.poly(starPts(x, y, 1.5 * s * 1.3, 0.62 * s * 1.3, 5), '#ffe066'));
    }
    piece(g, t => { A.softBody(t, hx, hy, fr, fr * 0.95, FACE_L); });
    // the two front petals cupping the cheeks
    piece(g, t => { pointLeaf(t, hx - fr * 0.4, hy + fr * 0.95, fr * 1.25, -PI / 2 - 1.05, 2.4, M[1]); pointLeaf(t, hx + fr * 0.45, hy + fr * 0.95, fr * 1.25, -PI / 2 + 1.05, 2.4, M[1]); shadeShape(t, M, 0.35, 0.4); });
    // the star wand on a leaf (stage 1)
    if (stage === 1) {
      const wx = hx + fr + 3.6, wy = hy - 1.6 + (f ? -0.5 : 0);
      piece(g, t => { pointLeaf(t, hx + fr * 0.7, hy + fr * 0.7, 4.4, -0.55, 1.3, C.leaf[1]); shadeShape(t, C.leaf, 0.3, 0.4); });
      piece(g, t => stroke(t, [[wx - 1.6, wy + 4.2], [wx, wy]], 0.3, 0.3, '#a4744e'));
      piece(g, t => t.poly(starPts(wx, wy - 0.4, 2.0, 0.85, 5), '#ffe066'));
    }
    const sparks = T(stage, [], [[hx - fr - 3.0, hy - fr * 0.6, 0.6]], [[hx - fr - 3.2, hy - fr * 0.4, 0.7], [hx + fr + 3.2, hy - fr * 0.9, 0.75], [hx + fr + 2.4, hy + fr * 0.6, 0.55]]);
    sparks.forEach(([x, y, s], i) => sparkle(g, clampX(x, 2.2), y + ((i + f) % 2 ? -0.4 : 0), s, '#fff6a0'));
    const ex = hx + 0.6, ey = hy + fr * 0.18, sp = fr * 0.86;
    eyes(g, ex, ey, fr, P, { bl: { col: '#f7a2c8' } });
    if (!P.eyes || P.eyes === 'brave' || P.eyes === 'sad') for (const s of [-1, 1]) { const x = ex + s * sp / 2, rx = fr * 0.24, ry = fr * 0.32; stroke(g, [[x + s * rx * 0.62, ey - ry * 0.8], [x + s * (rx * 0.62 + 0.7), ey - ry * 0.8 - 0.8]], 0.26, 0.26, INK); }
    A.chibiMouth(g, ex + 0.1, ey + fr * 0.5, P.mouth || 'smile', 2.0);
    return { hx: R(hx), hy: R(hy), hr: R(fr), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - fr + 1.2), w: R(fr * 1.5) } };
  };

  // =====================================================================================================
  // Snap Pea -> Super Snap Pea -> Mega Snap Pea
  // A plump green pea-pod head (a little wider than tall, a pod seam along its back) with a BIG snappy mouth at the front - white
  // teeth top and bottom, a pink tongue - and big eyes above it; a curly tendril on top, base leaves. Stage 1 adds a second
  // tendril and a bigger grin; stage 2 shows two peas peeking out of the open seam on its back, like a crown.
  PAL.snappea = { main: ['#eafccf', '#a8dd7a', '#7ebd5e'], leaf: LEAF, acc: ['#d8f8b0', '#96d466', '#6cb24e'], stem: '#62ac50', root: '#8a6a3a', part: 'jaws' };
  ART.snappea = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, f = P.frame ? 1 : 0;
    const r = T(stage, 8, 9, 10), rx = r * 1.14, ry = r * 0.9, hx = 15.2, hy = 26.2 - ry + h;
    baseLeaves(g, P, C.leaf);
    stem(g, 15.2, 28.6, hy + ry - 1, C.stem);
    // tendrils on top
    const curls = T(stage, [[-0.2, 1]], [[-0.25, 1], [-0.6, -1]], [[-0.3, 1], [-0.68, -1]]);
    curls.forEach(([kx, d]) => { const x = hx + kx * rx, y = hy - ry * 0.92; piece(g, t => stroke(t, [[x, y + 0.6], [x - d * 0.4, y - 2.0], [x + d * 1.0, y - 3.4], [x + d * 2.0, y - 2.6], [x + d * 1.3, y - 1.8]], 0.36, 0.3, C.stem)); });
    // stage 2: two peas peeking from the seam on its back
    if (stage === 2) piece(g, t => { for (const dx of [-3.4, -0.6]) { t.ell(hx + dx, hy - ry * 0.86, 1.8, 1.7, C.acc[1]); } shadeShape(t, C.acc, 0.3, 0.35); });
    const open = P.mouth === 'open' || P.mouth === 'grin', mx0 = hx + rx * 0.05, my = hy + ry * 0.42, mh = open ? 3.2 : T(stage, 2.2, 2.5, 2.7);
    piece(g, t => { // the pod
      t.ell(hx - rx * 0.14, hy - ry * 0.06, rx * 0.86, ry * 0.9, M[1], -0.08);
      t.ell(hx, hy, rx, ry, M[1], -0.05);
      shadeShape(t, M, rx * 0.12, ry * 0.13);
      shine(t, hx - rx * 0.5, hy - ry * 0.55, 1.6, 0.7, M[0], -0.5);
    });
    // the pod seam along its back
    stroke(g, [[hx - rx * 0.86, hy - ry * 0.12], [hx - rx * 0.6, hy - ry * 0.7], [hx - rx * 0.1, hy - ry * 0.98]], 0.22, 0.22, M[2]);
    // the big mouth at the front: a wide wedge opening to the right edge of the pod
    const mxR = hx + rx * 0.98, mouth = [[mx0, my], [hx + rx * 0.45, my - mh * 0.5], [mxR, my - mh * 0.62], [mxR, my + mh * 0.62], [hx + rx * 0.45, my + mh * 0.62]];
    g.poly(mouth.map(([x, y]) => [x - 0.35, y + (y < my ? -0.35 : y > my ? 0.35 : 0)]), INK);
    g.poly(mouth, '#7a3a4a');
    g.ell(hx + rx * 0.62, my + mh * 0.3, mh * 0.9, mh * 0.32, '#ff8fa6');
    // white teeth along the top and the bottom
    for (let i = 0; i < 3; i++) {
      const x = hx + rx * (0.42 + i * 0.2), yt = my - mh * (0.5 + i * 0.04), yb = my + mh * (0.55 + i * 0.03);
      g.poly([[x - 0.75, yt], [x + 0.75, yt], [x, yt + 1.1]], WHITE);
      if (i > 0) g.poly([[x - 0.7, yb], [x + 0.7, yb], [x, yb - 1.0]], WHITE);
    }
    const ex = hx - 0.4, ey = hy - ry * 0.1;
    eyes(g, ex, ey, r * 0.92, P, { blush: false });
    A.blush(g, ex - 0.6, ey + r * 0.5, { sp: r * 0.9 });
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), front: R(mxR), hat: { x: R(hx - 0.6), y: R(hy - ry + 1.4), w: R(rx * 1.4) } };
  };

  // =====================================================================================================
  // Shadow Peashooter -> Shadow Repeater -> Shadow Gatling
  // The reference Peashooter in soft violet with dark purple crest leaves, a deep-plum snout opening and a little magenta bow tie;
  // wisps of shadow drift off it (2 from stage 1) and a soft purple glow at stage 2; a tiny crescent moon floats by at stage 2.
  PAL.shadowpeashooter = { main: ['#ebe0ff', '#ab8edc', '#8668c0'], leaf: ['#cdb4ee', '#7e5eba', '#60469c'], acc: ['#f0e2ff', '#a678e0', '#7c52c0'], stem: '#7a62a8', root: '#8a6a3a', part: 'snout' };
  function peaHead(g, stage, P, C, o) {
    o = o || {};
    const M = C.main, r = T(stage, 8, 9, 10), rx = r * 1.06, ry = r * 0.95, rot = -0.06, hx = 14, hy = 26 - ry + hopOf(P) + 0.3;
    baseLeaves(g, P, o.leaf || LEAF, { cx: 15.2, sp: 4.0, len: 4.3 });
    stem(g, 15, 28.6, hy + ry - 1, C.stem);
    if (o.crest) o.crest(hx, hy, r, rx, ry);
    const tl = 2.0, th = r * 0.36, fl = 1.2, sy = hy + r * 0.08, x0 = hx + rx * 0.7, x1 = hx + rx + tl;
    piece(g, t => {
      t.poly([[x0, sy - th], [x1, sy - th * fl], [x1, sy + th * fl], [x0, sy + th]], M[1]);
      A.softBody(t, hx - rx * 0.14, hy - ry * 0.1, rx * 0.86, ry * 0.86, M, { rot, hl: false });
      A.softBody(t, hx, hy, rx, ry, M, { rot });
      t.poly([[x0 + 1, sy + th * 0.35], [x1, sy + th * fl * 0.35], [x1, sy + th * fl], [x0 + 1, sy + th]], M[2], x => x > hx + rx - 0.8);
      t.ell((x0 + x1) / 2 + 0.8, sy - th * 0.55, (x1 - x0) * 0.25, th * 0.18, M[0], 0, x => x > hx + rx - 0.4);
    });
    const rw = stage === 2 ? 2.0 : 1.6, rh = th * fl, ox = x1 - 0.1 + (stage === 2 ? 0.3 : 0), hole = o.hole || mixHex(M[2], HOLE, 0.6);
    piece(g, t => {
      t.ell(ox, sy, rw, rh, o.lip || M[0]);
      if (stage < 2) t.ell(ox + rw * 0.15, sy + 0.05, rw * 0.58, rh * 0.7, hole);
      else for (const [dx, dy] of [[-0.45, -0.42], [0.65, -0.42], [-0.45, 0.46], [0.65, 0.46]]) t.ell(ox + dx, sy + dy * rh, 0.5, rh * 0.25, hole);
    });
    return { r, rx, ry, hx, hy, sy, th, x0, x1, ox, rw, rh, ex: hx + 0.8, ey: hy + ry * 0.16 };
  }
  ART.shadowpeashooter = function (g, stage, P, C) {
    const L = C.leaf, W = C.acc, f = P.frame ? 1 : 0;
    if (stage === 2) glow(g, 15, 18, 11, '170,120,230', 0.14);
    const H = peaHead(g, stage, P, C, {
      leaf: ['#d6c4f2', '#9a80cc', '#7a62ae'], hole: '#3a2450',
      crest: (hx, hy, r, rx, ry) => piece(g, t => { t.ell(hx - rx * 0.6, hy - ry * 0.86, 3.3, 1.65, flat(L), -0.95); if (stage >= 1) t.ell(hx - rx * 0.92, hy - ry * 0.34, 3.1, 1.55, flat(L), -0.3); if (stage === 2) t.ell(hx - rx * 0.18, hy - ry * 1.02, 2.6, 1.3, flat(L), -1.35); }),
    });
    const { hx, hy, rx, ry, r } = H;
    // shadow wisps drifting off its back
    const wisps = T(stage, [], [[hx - rx - 2.4, hy - ry * 0.2, 2.8], [hx + rx * 0.2, hy - ry - 2.2, 2.4]], [[hx - rx - 2.6, hy - ry * 0.25, 3.2], [hx + rx * 0.25, hy - ry - 2.4, 2.8], [hx - rx - 1.6, hy + ry * 0.75, 2.4]]);
    wisps.forEach(([x, y, s], i) => flamePiece(g, clampX(x, 2.2), y + 1.2 + ((i + f) % 2 ? -0.5 : 0), s, s * 0.4, -0.2, W));
    if (stage === 2) piece(g, t => { const x = H.ox + 3.0, y = hy - ry - 0.6 + (f ? -0.4 : 0); t.ell(x, y, 1.9, 1.9, '#fff2a8'); t.ell(x + 1.0, y - 0.5, 1.6, 1.6, null); });
    const by = hy + ry * 0.95;
    piece(g, t => { t.poly([[14.8, by], [11.7, by - 1.5], [11.7, by + 1.5]], '#f08ac0'); t.poly([[14.8, by], [17.9, by - 1.5], [17.9, by + 1.5]], '#f08ac0'); t.ell(14.8, by, 0.95, 0.95, '#d8609e'); });
    eyes(g, H.ex, H.ey, r, P, { eye: { col: '#3e2458' }, bl: { col: '#f0a0d8' } });
    return { hx: R(hx), hy: R(hy), hr: r, top: topOf(g), ey: R(H.ey), front: R(H.ox + H.rw), hat: { x: R(hx - 0.4), y: R(hy - ry + 1.4), w: R(rx * 1.5) } };
  };

  // =====================================================================================================
  // Aloe -> Aloe Vera -> Royal Aloe
  // A plump pale-teal aloe heart with the face, in a rosette of thick pointed aloe leaves (with little white speckles) fanning out
  // behind it; a cool water drop twinkles on a leaf. More and longer leaves by stage; stage 2 sends up a flower spike of little
  // orange tube flowers.
  PAL.aloe = { main: ['#f6fff8', '#d6f2e0', '#a6d6ba'], leaf: ['#cfeedd', '#78c29a', '#4f9c7a'], acc: ['#fff0c8', '#ffb45a', '#f08a46'], stem: '#5eae88', root: '#8a6a3a', part: 'leafcrown' };
  ART.aloe = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, L = C.leaf, f = P.frame ? 1 : 0;
    const r = T(stage, 6.8, 7.4, 8.0), hx = 15.5, hy = 26.8 - r * 0.95 + h;
    // the flower spike (stage 2), behind everything
    if (stage === 2) {
      const sx = hx - 2.6, top = 3.6 + (f ? -0.3 : 0);
      piece(g, t => stroke(t, [[sx + 1, hy], [sx, top + 4]], 0.45, 0.4, L[2]));
      piece(g, t => { for (const [dx, dy, a] of [[0, 0, 0], [-1.2, 1.3, -0.4], [1.2, 1.4, 0.4], [-1.0, 3.0, -0.3], [1.1, 3.1, 0.3], [0, 4.6, 0]]) t.ell(sx + dx, top + dy, 0.75, 1.5, C.acc[1], a); shadeShape(t, C.acc, 0.25, 0.3); });
    }
    // the rosette of thick pointed leaves
    const leaves = T(stage, [[-2.8, 11.5], [-2.15, 15.0], [-0.99, 15.0], [-0.34, 11.5]], [[-2.85, 12.4], [-2.25, 16.0], [-1.57, 16.4], [-0.89, 16.0], [-0.29, 12.4]], [[-2.9, 13.0], [-2.35, 16.6], [-1.9, 17.6], [-1.24, 17.6], [-0.79, 16.6], [-0.24, 13.0]]);
    const bx0 = hx, by0 = hy + r * 0.55;
    piece(g, t => {
      for (const [a, l] of leaves) pointLeaf(t, bx0 + cos(a) * 1.2, by0, l, a + (P.walk && f ? 0.04 : 0), 3.3, L[1]);
      shadeShape(t, L, 0.45, 0.5);
      // a pale juicy stripe down the middle of each leaf
      for (const [a, l] of leaves) { const a2 = a + (P.walk && f ? 0.04 : 0); for (let u = 0.45; u < 0.86; u += 0.04) { const x = bx0 + cos(a2) * (1.2 + l * u), y = by0 + sin(a2) * l * u; if (t.get(x, y) === L[1]) t.dot(x, y, L[0]); } }
    });
    // white speckles on the leaves
    for (const [a, l] of leaves) for (const u of [0.62, 0.76, 0.9]) { const x = bx0 + cos(a) * (1.2 + l * u) + sin(a) * 0.6, y = by0 + sin(a) * l * u - cos(a) * 0.6; if (g.get(x, y) === L[1]) g.dot(x, y, '#f2fff6'); }
    baseLeaves(g, P, L, { sp: 5.2, len: 4.4 });
    piece(g, t => { A.softBody(t, hx, hy, r * 1.04, r * 0.95, M); });
    // the water drop on a leaf
    const [da, dl] = leaves[leaves.length - 1], dx = Math.min(29.4, bx0 + cos(da) * (1.2 + dl * 0.86)), dy = by0 + sin(da) * dl * 0.86 - 1.6 + (f ? -0.2 : 0);
    piece(g, t => { t.ell(dx, dy + 0.3, 0.9, 0.95, '#c8eeff'); t.poly([[dx - 0.75, dy + 0.1], [dx, dy - 1.4], [dx + 0.75, dy + 0.1]], '#c8eeff'); });
    g.dot(dx - 0.25, dy, WHITE);
    const ex = hx + 0.7, ey = hy + r * 0.16;
    eyes(g, ex, ey, r, P);
    A.chibiMouth(g, ex + 0.1, ey + r * 0.5, P.mouth || 'smile', 2.1);
    return { hx: R(hx), hy: R(hy), hr: R(r), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - r * 0.95 + 1.4), w: R(r * 1.5) } };
  };

  // =====================================================================================================
  // Grapeshot -> Grapeshot Bunch -> Mega Grapeshot
  // A bunch of round purple grapes (5 / 7 / 9 behind) with the biggest grape in front carrying the face, under a woody stem, a big
  // round vine leaf and a curly tendril. Stage 2's stem has a little lit fuse spark (it goes POP!).
  PAL.grapeshot = { main: ['#eedcff', '#b68ce6', '#9068c8'], leaf: ['#d2f4ac', '#8fd46e', '#5ea84e'], acc: FIRE, stem: '#9a7452', root: '#8a6a3a', part: 'berry' };
  ART.grapeshot = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, f = P.frame ? 1 : 0;
    const fr = T(stage, 6.4, 7.0, 7.3), gr = fr * 0.5, hx = 15.4, hy = 26.6 - fr + h;
    baseLeaves(g, P, C.leaf, { sp: 4.8 });
    // the grapes behind the face grape, rows narrowing down to it
    const back = T(stage, [[-1.15, -0.55], [1.15, -0.55], [-0.58, -1.2], [0.58, -1.2], [0, -0.9]], [[-1.4, -0.4], [1.4, -0.4], [-0.9, -1.05], [0.9, -1.05], [-0.3, -1.35], [0.45, -1.4], [0, -0.85]],
      [[-1.55, 0.4], [1.55, 0.4], [-1.4, -0.3], [1.4, -0.3], [-0.95, -0.95], [0.95, -0.95], [-0.42, -1.35], [0.48, -1.35], [0, -0.9]]);
    const KY = 0.85, gy0 = hy - fr * 0.2, top = gy0 + Math.min(...back.map(b => b[1])) * fr * KY - gr * 1.15;
    // the stem, the vine leaf and the tendril on top
    const sx = hx - 0.4, sy = top + 0.8;
    piece(g, t => { t.poly([[sx - 0.6, sy + 1.4], [sx - 0.3, sy - 2.2], [sx + 0.7, sy - 2.4], [sx + 0.7, sy + 1.4]], C.stem); });
    piece(g, t => { const lx = sx + 3.2, ly = sy - 1.4 + (f ? -0.3 : 0); for (const [dx, dy, k] of [[0, 0, 1], [-1.1, -1.0, 0.8], [1.2, -0.9, 0.8], [1.6, 0.5, 0.7]]) t.ell(lx + dx, ly + dy, 2.1 * k, 1.8 * k, C.leaf[1]); shadeShape(t, C.leaf, 0.3, 0.4); });
    stroke(g, [[sx + 3.2, sy - 1.2], [sx + 4.6, sy - 2.4]], 0.18, 0.18, C.leaf[2]);
    piece(g, t => stroke(t, [[sx - 0.4, sy - 1.6], [sx - 2.2, sy - 2.8], [sx - 3.2, sy - 1.8], [sx - 2.4, sy - 1.0]], 0.3, 0.26, '#7cb850'));
    const fuse = stage === 2 ? [hx - fr * 1.32, top + gr * 1.3] : null;
    for (const [kx, ky] of back) piece(g, t => { const x = hx + kx * fr * 0.95, y = gy0 + ky * fr * KY; t.ell(x, y, gr * 1.2, gr * 1.15, M[1]); shadeShape(t, M, 0.35, 0.4); shine(t, x - gr * 0.45, y - gr * 0.45, gr * 0.32, gr * 0.22, M[0]); });
    if (fuse) { const [x, y] = fuse; piece(g, t => stroke(t, [[x + 0.6, y + 0.8], [x - 0.6, y - 1.4], [x - 1.6, y - 2.0]], 0.3, 0.3, '#c8b090')); flamePiece(g, x - 1.7, y - 1.6, 2.6 + f * 0.4, 1.0, -0.1, C.acc); }
    piece(g, t => { A.softBody(t, hx, hy, fr, fr * 0.96, M); });
    const ex = hx + 0.6, ey = hy + fr * 0.16;
    eyes(g, ex, ey, fr * 1.06, P, { bl: { col: '#ff9ac8' } });
    A.chibiMouth(g, ex + 0.1, ey + fr * 0.52, P.mouth || 'smile', 2.1);
    return { hx: R(hx), hy: R(hy), hr: R(fr + 1), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(top + 1.6), w: R(fr * 1.7) } };
  };

  // =====================================================================================================
  // Meteor Flower -> Comet Flower -> Galaxy Flower
  // A pink-magenta flower: six round petals speckled with tiny stars round a warm cream face; little meteor rocks with fiery tails
  // whizz round it (1 / 2 / 3 by stage). Stage 2's petals are a deeper violet with a second, pointy star-shaped ring behind them,
  // and sparkles twinkle round it.
  PAL.meteorflower = { main: ['#ffe2f4', '#f490d0', '#d86cb0'], leaf: LEAF, acc: ['#e6e0f2', '#a49cc0', '#7e76a0'], stem: '#62ac50', root: '#8a6a3a', part: 'star' };
  const MFACE = ['#fff8ec', '#ffe9c6', '#efc99a'];
  function meteorRock(g, x, y, s, ang, Rk, f) {
    const c = cos(ang), sn = sin(ang);
    const L0 = (5.6 + f * 0.6) * s, w = 2.3 * s, nx = sn, ny = c, tail = (k, col) => { t0.ell(x, y, w * k, w * k, col); t0.poly([[x + nx * w * k, y + ny * w * k], [x + c * L0 * k, y - sn * L0 * k], [x - nx * w * k, y - ny * w * k]], col); };
    let t0;
    piece(g, t => { t0 = t; tail(1, FIRE[1]); shadeShape(t, FIRE, 0.3, 0.35); tail(0.62, FIRE[0]); });
    piece(g, t => { t.ell(x - c * 0.2, y + sn * 0.2, 1.5 * s, 1.45 * s, Rk[1]); shadeShape(t, Rk, 0.3, 0.35); t.ell(x - 0.4 * s, y + 0.3 * s, 0.45 * s, 0.4 * s, Rk[2], 0, inside(t)); t.ell(x + 0.5 * s, y - 0.4 * s, 0.35 * s, 0.3 * s, Rk[2], 0, inside(t)); });
  }
  ART.meteorflower = function (g, stage, P, C) {
    const h = hopOf(P), f = P.frame ? 1 : 0;
    const M = stage === 2 ? ['#f2e2ff', '#c48ae8', '#a068cc'] : C.main;
    const fr = T(stage, 5.8, 6.4, 6.8), pr = T(stage, 9.2, 9.8, 10.2), hx = 15.5, hy = 26.2 - pr * 0.85 + h;
    baseLeaves(g, P, C.leaf);
    stem(g, 15.6, 28.6, hy + fr, C.stem);
    // stage 2: a pointy star ring behind the petals
    if (stage === 2) piece(g, t => { t.poly(starPts(hx, hy, pr + 1.4, pr * 0.62, 6, -PI / 2 + PI / 6), '#ffe27a'); shadeShape(t, ['#fff6c0', '#ffe27a', '#f0b84a'], 0.35, 0.45); });
    piece(g, t => { for (let i = 0; i < 6; i++) { const a = -PI / 2 + i * PI / 3 + (P.walk && f ? 0.05 : 0); t.ell(hx + cos(a) * (pr - 2.9), hy + sin(a) * (pr - 2.9), 3.1, 2.6, M[1], a); } shadeShape(t, M, 0.4, 0.45); });
    // tiny star speckles on the petals
    for (let i = 0; i < 6; i++) { const a = -PI / 2 + i * PI / 3 + 0.25, x = hx + cos(a) * (pr - 2.0), y = hy + sin(a) * (pr - 2.0); if (g.get(x, y) === M[1]) g.dots([[x, y - 0.5], [x - 0.5, y], [x, y], [x + 0.5, y], [x, y + 0.5]], '#fffbe0'); }
    piece(g, t => { A.softBody(t, hx, hy, fr, fr * 0.96, MFACE); });
    const rocks = T(stage, [[hx + pr + 0.4, hy - pr * 0.72, 1.0, 0.75]], [[hx + pr + 0.5, hy - pr * 0.78, 1.0, 0.75], [hx - pr - 0.2, hy - pr * 0.15, 0.9, 2.4]],
      [[hx + pr + 0.4, hy - pr * 0.82, 1.05, 0.75], [hx - pr - 0.2, hy - pr * 0.1, 0.9, 2.4], [hx + pr + 0.6, hy + pr * 0.5, 0.8, 0.9]]);
    rocks.forEach(([x, y, s, a], i) => meteorRock(g, clampX(x, 2.4), Math.max(5.4, y + ((i + f) % 2 ? -0.5 : 0)), s, a, C.acc, f));
    if (stage === 2) for (const [x, y, s] of [[hx - pr - 1.2, hy - pr * 0.9, 0.7], [hx + 1, hy - pr - 2.4, 0.6]]) sparkle(g, clampX(x, 2.2), Math.max(2.6, y), s, '#fff6a0');
    const ex = hx + 0.5, ey = hy + fr * 0.2;
    eyes(g, ex, ey, fr * 1.08, P, { eye: { col: '#4a2c3a' }, bl: { col: '#ff9ab8' } });
    A.chibiMouth(g, ex + 0.1, ey + fr * 0.52, P.mouth || 'smile', 2.0);
    return { hx: R(hx), hy: R(hy), hr: R(pr), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - fr + 1.0), w: R(fr * 1.6) } };
  };
})();
