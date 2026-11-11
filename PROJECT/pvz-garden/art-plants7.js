// art-plants7.js — PVZ Garden: twelve more plants in TRUE chibi style (see docs/pvz-art-guide.md and docs/chibi-reference.js).
// Spore-shroom, Intensive Carrot, Primal Peashooter, Primal Wall-nut, Perfume-shroom, Nightshade, Dusk Lobber, Grimrose,
// Sweet Potato, Wasabi Whip, Missile Toe, Kiwibeast.
// Same contract as art-plants4.js: PX.PLANT_ART[id] = function (g, stage, P, C) -> geometry, PX.PLANT_PAL[id] = palette.
// The head is the character (half-width about 8 / 9 / 10 by stage, its bottom near row 26), each with its own silhouette built
// from 2-3 overlapping shapes, big glossy eyes set low and wide, a tiny mouth, blush, flat pastel fills with one soft shade and
// little base leaves (mushroom stalks flare to the ground instead); no long stems, no legs. All twelve are friendly, even the
// dark ones. The core adds the bold outer edge. Walking = a hop on frame 1; arms:'up' = raised leaves and a little hop.
(function () {
  'use strict';
  if (!window.PX || !PX.art) return;
  const { INK, stroke, starPts } = PX;
  const A = PX.art, mixHex = A.mixHex;
  const ART = PX.PLANT_ART, PAL = PX.PLANT_PAL;
  const piece = (g, f) => PX.piece(g, f);
  // pick a value per stage
  const T = (s, a, b, c) => (s === 2 ? c : s === 1 ? b : a);
  const R = Math.round, PI = Math.PI, cos = Math.cos, sin = Math.sin;
  const WHITE = '#ffffff', HOLE = '#2b2129';
  // flat fill + one soft shade
  const flat = C => [C[1], C[1], C[2]];
  const lt = (c, k) => mixHex(c, WHITE, k);
  const mix = (M, c, k) => M.map(x => mixHex(x, c, k));
  const LEAF = ['#c2f09a', '#86d066', '#5aa856'];
  const GOLD = ['#fff6c0', '#ffd75a', '#e0a83a'];
  const HEART = ['#ffe0ea', '#ff9ab4', '#e8789a'];
  // a mask checked at fine-pixel precision
  const fm = fn => { fn.fine = true; return fn; };
  const inside = t => fm((x, y) => t.filled(x, y));
  const topOf = g => { for (let fy = 0; fy < g.fh; fy++) for (let fx = 0; fx < g.fw; fx++) if (g.fget(fx, fy)) return Math.floor(fy / g.k); return 0; };
  // walking: a hop on frame 1; cheering: a smaller hop; idle frame 1: a tiny bob
  const hopOf = P => (P.walk && P.frame ? -1.5 : P.arms === 'up' ? -1 : P.frame ? 0.3 : 0);

  // ---------------- shared bits ----------------
  // soft shade for any silhouette drawn flat in R[1] on a piece layer: the mid-tone pixels whose neighbour (dx, dy) down-right
  // is outside the shape take R[2], so the crescent follows the whole outline of several overlapping shapes
  function shadeShape(t, Rm, dx, dy) {
    const k = t.k, ox = Math.max(1, R(dx * k)), oy = Math.max(1, R(dy * k)), W = t.fw, list = [];
    for (let fy = 0; fy < t.fh; fy++) for (let fx = 0; fx < W; fx++) if (t.a[fy * W + fx] === Rm[1] && t.fget(fx + ox, fy + oy) === null) list.push(fy * W + fx);
    for (const i of list) t.a[i] = Rm[2];
  }
  // a small soft highlight (only on the shape)
  const shine = (t, x, y, rx, ry, col, rot) => t.ell(x, y, rx, ry, col, rot == null ? -0.55 : rot, inside(t));
  // two round little base leaves on rows 27-30 (raised for a cheer)
  function baseLeaves(g, P, L, o) {
    o = o || {};
    const cx = o.cx == null ? 15.4 : o.cx, sp = o.sp == null ? 4.2 : o.sp, len = o.len || 4.4, y = o.y || 28.7;
    const a = P.arms === 'up' ? -0.5 : P.arms === 'out' || P.arms === 'paddle' ? 0.04 : 0.22, ly = P.arms === 'up' ? y - 0.5 : y;
    piece(g, t => { t.ell(cx - sp, ly, len, 1.9, flat(L), -a); t.ell(cx + sp, ly, len, 1.9, flat(L), a); });
  }
  const stem = (g, x, y0, y1, col, r) => piece(g, t => stroke(t, [[x, y0], [x, y1]], r || 0.95, r || 0.95, col));
  // BIG glossy eyes + blush (art director v3 ratios), sized from r (about the face's radius); o: mood default, eye / blush overrides
  function eyes(g, ex, ey, r, P, o) {
    o = o || {};
    A.chibiEyes(g, ex, ey, Object.assign({ sp: r * 0.86, w: r * 0.48, h: r * 0.64, mood: P.eyes || o.mood }, o.eye));
    if (o.blush !== false) A.blush(g, ex - 0.2, ey + r * 0.42, Object.assign({ sp: r }, o.bl));
  }
  // two little lash flicks at the outer top corner of each open eye (sizes as eyes())
  function lashes(g, ex, ey, r, P, o) {
    const m = P.eyes || (o && o.mood);
    if (m === 'happy' || m === 'closed' || m === 'blink') return;
    const sp = r * 0.86, rx = r * 0.24, ry = r * 0.32;
    for (const s of [-1, 1]) {
      const x = ex + s * sp / 2;
      stroke(g, [[x + s * rx * 0.62, ey - ry * 0.8], [x + s * (rx * 0.62 + 0.7), ey - ry * 0.8 - 0.8]], 0.26, 0.26, INK);
      stroke(g, [[x + s * rx * 0.92, ey - ry * 0.42], [x + s * (rx * 0.92 + 0.85), ey - ry * 0.42 - 0.45]], 0.26, 0.26, INK);
    }
  }
  // a little four-point sparkle (its own outlined piece)
  const sparkle = (g, x, y, s, col) => piece(g, t => t.poly(starPts(x, y, 1.9 * s, 0.6 * s, 4), col || '#fff6a0'));
  // a little heart (s = size, about 2.3 s wide)
  function heart(t, x, y, s, col) {
    t.ell(x - 0.62 * s, y - 0.32 * s, 0.72 * s, 0.7 * s, col); t.ell(x + 0.62 * s, y - 0.32 * s, 0.72 * s, 0.7 * s, col);
    t.poly([[x - 1.3 * s, y - 0.1 * s], [x + 1.3 * s, y - 0.1 * s], [x, y + 1.2 * s]], col);
  }
  // (never smaller than about 2.3 px across, or it reads as a gem)
  const heartPiece = (g, x, y, s0, H) => { const s = Math.max(s0, 0.98); piece(g, t => { heart(t, x, y, s, H[1]); shadeShape(t, H, 0.35, 0.45); t.ell(x - 0.6 * s, y - 0.45 * s, 0.3 * s, 0.22 * s, H[0], -0.5, inside(t)); }); };
  // a pointed leaf from its base (x, y): length len, angle ang (0 = right, negative = up), half width w
  function pointLeaf(t, x, y, len, ang, w, col) {
    const c = cos(ang), s = sin(ang), nx = -s * w, ny = c * w, pts = [];
    const prof = [[0, 0.3], [0.18, 0.82], [0.42, 1], [0.66, 0.82], [0.86, 0.42], [1, 0]];
    for (const [u, k] of prof) pts.push([x + c * len * u + nx * k, y + s * len * u + ny * k]);
    for (let i = prof.length - 2; i >= 0; i--) { const [u, k] = prof[i]; pts.push([x + c * len * u - nx * k, y + s * len * u - ny * k]); }
    t.poly(pts, col);
  }
  // a thin vein from (x, y) along ang, only on drawn pixels of g
  function vein(g, x, y, len, ang, col) { for (let k = 0.15; k < 0.85; k += 0.05) { const px = x + cos(ang) * len * k, py = y + sin(ang) * len * k; if (g.filled(px, py)) g.dot(px, py, col); } }
  // a heart-shaped leaf from the hub (cx, cy) along angle a: two round lobes + a point
  function heartLeaf(t, cx, cy, a, len, w, col) {
    const c = cos(a), s = sin(a), px = -s, py = c, m = len - w * 0.62;
    for (const k of [1, -1]) t.ell(cx + c * m + px * w * 0.56 * k, cy + s * m + py * w * 0.56 * k, w * 0.62, w * 0.6, col, a);
    t.poly([[cx + c * len * 0.1, cy + s * len * 0.1], [cx + c * (m + 0.2) + px * w * 1.12, cy + s * (m + 0.2) + py * w * 1.12], [cx + c * (m + 0.2) - px * w * 1.12, cy + s * (m + 0.2) - py * w * 1.12]], col);
  }
  // the outermost drawn x on row y walking out from cx (side -1 left / 1 right)
  function edgeX(g, y, cx, side) { let x = cx; while (g.filled(x + side * 0.5, y) && Math.abs(x - cx) < 16) x += side * 0.5; return x; }

  // ---------------- mushrooms ----------------
  // a big round stalk (the face) that flares into the ground; it squashes a little as it lands
  function stalk(g, cx, cy, rx, ry, Rm, P) {
    const sq = P.walk && !P.frame ? 0.4 : 0;
    piece(g, t => { t.ell(cx, 28.5, rx + 0.9 + sq, 1.4, Rm[1]); t.ell(cx, cy, rx + sq * 0.5, ry, Rm[1]); t.ell(cx, cy + ry * 0.3, rx * 0.96 + sq * 0.5, ry * 0.72, Rm[1]); shadeShape(t, Rm, rx * 0.15, ry * 0.15); });
  }
  // a squashed dome: a wide flat-bottomed ellipse plus a smaller rounder crown, bottom edge at by
  function dome(t, cx, by, rx, ry, Rm, o) {
    o = o || {};
    t.ell(cx, by - 0.3, rx, ry, Rm[1], 0, fm((x, y) => y <= by));
    t.ell(cx - rx * 0.06, by - ry * 0.5, rx * 0.74, ry * 0.72, Rm[1]);
    // the rounded rim underneath
    t.ell(cx, by, rx - 0.9, 1.25, Rm[1]);
    shadeShape(t, Rm, rx * 0.12, ry * 0.2);
    if (o.hl !== false) shine(t, cx - rx * 0.45, by - ry * 0.7, rx * 0.2, ry * 0.13, Rm[0]);
  }
  // the top of a dome() at column x
  const domeTop = (cx, by, rx, ry, x) => { const d = x - cx, a = Math.abs(d) < rx ? by - 0.3 - ry * Math.sqrt(1 - (d / rx) ** 2) : by, e = x - (cx - rx * 0.06), b = Math.abs(e) < rx * 0.74 ? by - ry * 0.5 - ry * 0.72 * Math.sqrt(1 - (e / (rx * 0.74)) ** 2) : by; return Math.min(a, b); };
  const spot = (t, x, y, r, col) => t.ell(x, y, r, r * 0.86, col, 0, inside(t));

  // =====================================================================================================
  // Spore-shroom -> Spore Cloud -> Spore Storm
  // A tan-brown mushroom: a puffy dome cap covered in round raised spore bumps, with round spore pods peeking up along its crown,
  // over a chubby cream stalk that flares to the ground, big round glossy eyes. Stage 1 lets a few spores float off;
  // stage 2 has a bigger, bumpier cap and a little cloud of spores.
  PAL.sporeshroom = { main: ['#f8e4c8', '#dab28a', '#ba8e68'], leaf: LEAF, acc: ['#fffbf2', '#f6eadb', '#dac6aa'], stem: '#62ac50', root: '#8a6a3a', part: 'cap' };
  const POD = ['#fffaf0', '#f4e2c2', '#dcbc94'];
  ART.sporeshroom = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, f = P.frame ? 1 : 0, sx = 15.4;
    const srx = T(stage, 5.6, 6.0, 6.4), sry = T(stage, 5.0, 5.4, 5.8), sy = 28.8 - sry + h, stop = sy - sry;
    const crx = T(stage, 8.4, 9.4, 10.2), cry = T(stage, 6.0, 6.8, 7.4), cby = stop + 1.8, cx = sx - 0.2;
    // spores drifting off (behind the cap)
    const drift = T(stage, [], [[cx - crx - 1.2, cby - 3.6 - f * 0.6, 1.1], [cx + crx + 1.0, cby - 5.6 + f * 0.6, 0.9]],
      [[cx - crx - 1.4, cby - 3.8 - f * 0.6, 1.2], [cx + crx + 1.2, cby - 6.0 + f * 0.6, 1.0], [cx - crx + 1.4, cby - cry - 3.4 + f * 0.5, 0.9], [cx + crx - 0.6, cby - cry - 2.6 - f * 0.5, 1.1]]);
    for (const [x, y, r] of drift) piece(g, t => { t.ell(x, y, r, r * 0.92, flat(POD)); t.dot(x - r * 0.35, y - r * 0.35, POD[0]); });
    stalk(g, sx, sy, srx, sry, C.acc, P);
    // round spore pods sitting on the crown of the cap (behind it, so only their round tops peek out)
    const pods = T(stage, [[-0.55, 2.1], [0.02, 2.5], [0.56, 2.0]], [[-0.64, 2.2], [-0.2, 2.6], [0.26, 2.5], [0.68, 2.0]], [[-0.7, 2.3], [-0.32, 2.7], [0.1, 2.9], [0.5, 2.6], [0.82, 2.1]]);
    for (const [kx, pr] of pods) piece(g, t => { const x = cx + kx * crx, y = domeTop(cx, cby, crx, cry, x) + pr * 0.3; t.ell(x, y, pr, pr * 0.92, POD[1]); shadeShape(t, POD, 0.35, 0.45); t.ell(x - pr * 0.35, y - pr * 0.42, pr * 0.3, pr * 0.2, POD[0], -0.5, inside(t)); });
    piece(g, t => dome(t, cx, cby, crx, cry, M));
    // raised spore bumps all over the cap: a pale bump with a soft shade under it
    const dots = T(stage, [[-0.55, -2.6, 1.2], [0.0, -4.2, 1.05], [0.5, -2.4, 1.0], [-0.12, -1.0, 0.75], [0.74, -0.9, 0.6]],
      [[-0.56, -2.8, 1.3], [-0.04, -4.8, 1.15], [0.48, -2.9, 1.1], [-0.18, -1.1, 0.85], [0.76, -1.0, 0.7], [-0.82, -1.0, 0.6]],
      [[-0.56, -3.0, 1.4], [-0.06, -5.4, 1.25], [0.46, -3.2, 1.2], [-0.2, -1.2, 0.9], [0.78, -1.1, 0.75], [-0.84, -1.0, 0.65], [0.2, -6.4, 0.7]]);
    for (const [kx, dy, r] of dots) {
      const x = cx + kx * crx, y = cby + dy * (cry / 6);
      g.ell(x + 0.3, y + 0.35, r, r * 0.9, M[2], 0, inside(g));
      g.ell(x, y, r, r * 0.9, POD[1], 0, inside(g));
      g.dot(x - r * 0.35, y - r * 0.4, POD[0]);
    }
    const ex = sx + 0.9, ey = sy + sry * 0.14, er = srx * 1.12;
    eyes(g, ex, ey, er, P);
    A.chibiMouth(g, ex + 0.1, ey + er * 0.5, P.mouth || 'smile', 2);
    const top = domeTop(cx, cby, crx, cry, cx);
    return { hx: R(cx), hy: R(cby - cry * 0.4), hr: R(crx * 0.8), top: topOf(g), ey: R(ey), hat: { x: R(cx), y: R(top + 2.0), w: R(crx * 1.5) } };
  };

  // =====================================================================================================
  // Intensive Carrot -> Doctor Carrot -> Super Carrot
  // A chunky orange carrot, a little taller than wide, widest near the top and narrowing to a rounded tip that shows between its
  // base leaves, ridge lines curving across its lower half, a bushy feathery leaf top, a kind face and pink heart sparkles (it heals). Stage 1: a fuller leaf top and two hearts;
  // stage 2: the bushiest top, four hearts and twinkles.
  PAL.intensivecarrot = { main: ['#ffe6c4', '#ffb478', '#f29058'], leaf: LEAF, acc: HEART, stem: '#62ac50', root: '#8a6a3a', part: 'leafcrown' };
  ART.intensivecarrot = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, L = C.leaf, f = P.frame ? 1 : 0, cx = 15.6;
    // (about 9% taller than wide: w = half-width, the round top's centre at cy, the tip at tipY)
    const r = T(stage, 8.0, 8.8, 9.4), w = r * 0.98, tipY = 29.7 + h, top = tipY - w * 2 * 1.09, rx = w, ry = w * 0.92, cy = top + ry, ty = top + 1.0;
    // the bushy leaf top: feathery fronds of round leaflets fanned up
    const fr = T(stage, [[-2.35, 5.0], [-1.57, 5.6], [-0.8, 5.0]], [[-2.55, 5.0], [-1.95, 5.6], [-1.2, 5.6], [-0.6, 5.0]],
      [[-2.75, 5.0], [-2.2, 5.6], [-1.57, 5.8], [-0.95, 5.6], [-0.4, 5.0]]);
    piece(g, t => {
      for (const [a0, len] of fr) {
        const a = a0 + (P.walk && f ? 0.08 : 0);
        stroke(t, [[cx, ty + 1], [cx + cos(a) * len * 0.6, ty + sin(a) * len * 0.6]], 0.6, 0.5, L[1]);
        for (const [k, rr] of [[0.34, 1.25], [0.58, 1.5], [0.8, 1.45], [0.98, 1.1]]) t.ell(cx + cos(a) * len * k, ty + sin(a) * len * k, rr * 1.15, rr, L[1], a);
      }
      shadeShape(t, L, 0.45, 0.55);
      for (const [a0, len] of fr) shine(t, cx + cos(a0) * len * 0.62 - 0.4, ty + sin(a0) * len * 0.62 - 0.3, 0.6, 0.35, L[0]);
    });
    // the base leaves sit behind the carrot, so its rounded tip shows between them
    baseLeaves(g, P, L, { sp: 4.8 });
    // the carrot: a round top, a chunky middle and a taper down to a rounded tip
    piece(g, t => {
      t.ell(cx, cy, rx, ry, M[1]);
      t.ell(cx - 0.15, cy + w * 0.42, w * 0.84, w * 0.7, M[1]);
      t.poly([[cx - w * 0.78, cy + w * 0.45], [cx + w * 0.78, cy + w * 0.45], [cx + 1.3, tipY - 0.9], [cx - 1.5, tipY - 0.9]], M[1]);
      t.ell(cx - 0.1, tipY - 1.0, 1.45, 1.0, M[1]);
      shadeShape(t, M, rx * 0.14, ry * 0.16);
      shine(t, cx - rx * 0.45, cy - ry * 0.5, rx * 0.2, ry * 0.13, M[0]);
    });
    // ridge lines curving across the lower half, two on each side (clear of the face)
    for (const [side, k, len] of [[-1, 0.3, 2.4], [-1, 0.8, 2.0], [1, 0.22, 2.2], [1, 0.74, 2.0]]) {
      const y = cy + k * w, x = edgeX(g, y, cx, side);
      stroke(g, [[x - side * 0.25, y - 0.15], [x - side * len * 0.5, y + 0.3], [x - side * len, y + 0.45]], 0.21, 0.21, M[2]);
    }
    // the heart sparkles
    const hearts = T(stage, [[cx + rx + 1.0, cy - ry * 0.55, 1.1]], [[cx + rx + 1.2, cy - ry * 0.5, 1.15], [cx - rx - 1.4, cy - ry * 0.1, 0.85]],
      [[cx + rx + 1.3, cy - ry * 0.5, 1.25], [cx - rx - 1.6, cy - ry * 0.05, 0.95], [cx + rx + 1.6, cy + ry * 0.35, 0.8], [cx - rx - 0.8, cy - ry - 0.6, 0.75]]);
    hearts.forEach(([x, y, s], i) => heartPiece(g, Math.max(1.4 + 1.2 * s, Math.min(x, 30.2 - 1.2 * s)), y + ((i + f) % 2 ? -0.5 : 0), s, C.acc));
    if (stage >= 1) sparkle(g, cx + rx + 0.4, cy + ry * 0.4 - f * 0.4, 0.6, '#ffffff');
    if (stage === 2) sparkle(g, cx - rx - 0.6, cy + ry * 0.55 + f * 0.4, 0.7, '#fff6a0');
    const ex = cx + 0.8, ey = cy + ry * 0.2, er = r * 0.95;
    eyes(g, ex, ey, er, P);
    A.chibiMouth(g, ex + 0.1, ey + er * 0.5, P.mouth || 'smile', 2.2);
    return { hx: R(cx), hy: R(cy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(cx), y: R(top + 1.4), w: R(rx * 1.5) } };
  };

  // =====================================================================================================
  // Primal Peashooter -> Primal Repeater -> Primal Gatling
  // A chunky moss-green pea head, fuller at the back, with a rocky stone-grey snout (a short chunky tube with chips and a rough
  // lip) and a big mane of pointed prehistoric fern fronds round the back of its head; no bow tie. Stage 1 grows a fuller mane;
  // stage 2 the biggest mane, a darker stone band round the snout and four barrel holes in its lip.
  PAL.primalpeashooter = { main: ['#e4f2b6', '#b0cd78', '#8aad5e'], leaf: ['#c6e89a', '#7eba60', '#5c9652'], acc: ['#f4f1ea', '#c8c2b6', '#9e988c'], stem: '#5c9652', root: '#8a6a3a', part: 'snout' };
  ART.primalpeashooter = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, L = C.leaf, S = C.acc;
    const r = T(stage, 8.0, 8.8, 9.6), rx = r * 1.1, ry = r * 0.96, hx = T(stage, 14.2, 14.4, 14.7), hy = 26 - ry + h + 0.3;
    baseLeaves(g, P, L, { cx: 15.0 });
    stem(g, 15, 28.6, hy + ry - 1, C.stem);
    // the mane: pointed fern fronds fanned round the back of the head, two greens taking turns
    const fronds = T(stage, [-1.4, -2.05, -2.7, 2.9], [-1.3, -1.86, -2.42, -2.98, 2.72], [-1.2, -1.7, -2.2, -2.7, -3.2, 2.6]);
    const L2 = mix(L, '#3e7a48', 0.16), VN = mixHex(L[2], '#3e6a40', 0.35);
    // (drawn back to front, so the upper fronds overlap the lower ones)
    const fds = fronds.map((a, i) => ({ a, i, len: T(stage, 6.4, 6.8, 7.0) - (a > 0 || a < -2.9 ? 1.2 : 0), x: hx + cos(a) * rx * 0.72, y: hy + sin(a) * ry * 0.72 }));
    for (const F of fds.slice().reverse()) {
      const Lc = F.i % 2 ? L2 : L;
      piece(g, t => { pointLeaf(t, F.x, F.y, F.len, F.a, T(stage, 2.2, 2.35, 2.5), Lc[1]); shadeShape(t, Lc, 0.45, 0.55); shine(t, F.x + cos(F.a) * F.len * 0.4 - 0.4, F.y + sin(F.a) * F.len * 0.4 - 0.4, 0.8, 0.35, Lc[0], F.a); });
      vein(g, F.x, F.y, F.len, F.a, VN);
      // little side veins
      for (const k of [0.35, 0.6]) for (const sd of [-1, 1]) { const bx0 = F.x + cos(F.a) * F.len * k, by0 = F.y + sin(F.a) * F.len * k, a2 = F.a + sd * 0.75; for (const u of [0.5, 1.0]) { const px = bx0 + cos(a2) * u, py = by0 + sin(a2) * u; if (g.get(px, py) === Lc[1]) g.dot(px, py, VN); } }
    }
    piece(g, t => { // the head: a chunky oval, fuller at the back
      A.softBody(t, hx - rx * 0.16, hy - ry * 0.06, rx * 0.86, ry * 0.88, M, { rot: -0.05, hl: false });
      A.softBody(t, hx, hy, rx, ry, M, { rot: -0.05 });
    });
    // the stone snout: a short chunky rocky tube growing out of the front of the head, flaring to a rough lip
    const th = r * 0.4, fl = 1.22, tl = 2.3, sy = hy + r * 0.1, x0 = hx + rx * 0.6, x1 = hx + rx + tl;
    const out = fm((x, y) => !PX.inEll(x + 0.25, y + 0.25, hx, hy, rx - 0.6, ry - 0.6, -0.05).in);
    piece(g, t => {
      t.poly([[x0, sy - th], [x0 + 1.0, sy - th * 1.14], [x0 + 2.0, sy - th * 1.02], [x1 - 0.9, sy - th * fl + 0.25], [x1, sy - th * fl], [x1, sy + th * fl], [x1 - 0.7, sy + th * fl - 0.05], [x1 - 1.6, sy + th * 1.14], [x0 + 0.6, sy + th * 1.04], [x0, sy + th]], S[1]);
      // a chip knocked out of its top edge
      t.ell(x0 + 2.6, sy - th * 1.1, 0.65, 0.5, null);
      for (let i = 0; i < t.a.length; i++) if (t.a[i] && !out((i % t.fw) / t.k, Math.floor(i / t.fw) / t.k)) t.a[i] = null;
      shadeShape(t, S, 0.5, 0.7);
      t.ell((x0 + x1) / 2 + 0.9, sy - th * 0.62, 1.1, 0.35, S[0], 0, inside(t));
      if (stage === 2) t.ell(x1 - 1.5, sy, 0.75, th * 1.3, mix(S, '#6e665c', 0.25)[1], 0, inside(t));
    });
    // a crack and two little pores on the tube
    stroke(g, [[x1 - 2.2, sy + th * 0.15], [x1 - 1.6, sy + th * 0.5], [x1 - 1.9, sy + th * 0.85]], 0.24, 0.22, S[2]);
    for (const [dx, dy] of [[-1.2, -0.3], [-0.6, 0.55]]) if (g.get(x1 + dx - 1.0, sy + dy * th) === S[1]) g.dot(x1 + dx - 1.0, sy + dy * th, S[2]);
    const rw = 1.75, rh = th * fl, ox = x1 - 0.1;
    piece(g, t => {
      t.ell(ox, sy, rw, rh, S[0]);
      t.ell(ox + 0.7, sy - rh + 0.2, 0.7, 0.55, null);
      const hole = P.mouth === 'open' ? lt(S[0], 0.2) : mixHex(S[2], HOLE, 0.6);
      if (stage < 2) t.ell(ox + rw * 0.18, sy + 0.1, rw * 0.56, rh * 0.68, hole);
      else for (const [dx, dy] of [[-0.45, -0.42], [0.65, -0.42], [-0.45, 0.46], [0.65, 0.46]]) t.ell(ox + dx, sy + dy * rh, 0.5, rh * 0.25, hole);
    });
    const ex = hx + 0.8, ey = hy + ry * 0.16;
    eyes(g, ex, ey, r, P);
    return { hx: R(hx), hy: R(hy), hr: r, top: topOf(g), ey: R(ey), front: R(ox + rw), hat: { x: R(hx - 0.4), y: R(hy - ry + 1.4), w: R(rx * 1.5) } };
  };

  // =====================================================================================================
  // Primal Wall-nut -> Primal Tall-nut -> Primal Giga-nut
  // A big tall boulder of a nut (broader at the base than the Wall-nut, with chips knocked out of its outline, grey stone faces
  // where it chipped and a bold crack or two) under a fluffy blanket of green moss with a scalloped edge and tufts poking up over
  // the top; big white eyes with pupils set a little low and looking forward, short level brows, no mouth. Stage 1 is taller with a fern fiddlehead in the moss;
  // stage 2 the tallest, with more moss and a little flower.
  PAL.primalwallnut = { main: ['#f6e0b8', '#e0b888', '#bf9464'], leaf: ['#d8f2a4', '#9ccc6c', '#74aa54'], acc: ['#f4efe6', '#d8cfc0', '#b0a594'], stem: '#72bb5a', root: '#a8865a', part: 'shell' };
  ART.primalwallnut = function (g, stage, P, C) {
    const hop = P.walk && P.frame ? -1 : P.arms === 'up' ? -0.6 : 0, sq = P.walk && !P.frame ? 0.35 : 0;
    const M = C.main, Mo = C.leaf, S = C.acc, f = P.frame ? 1 : 0;
    const rx = T(stage, 9.2, 9.6, 10.2) + sq, ry = T(stage, 10.0, 11.2, 12.2) - sq, hx = 15.5, hy = 30.4 - ry + hop;
    const chips = T(stage, [[0.93, -0.42, 1.5], [-0.97, 0.38, 1.3]], [[0.93, -0.45, 1.6], [-0.97, 0.36, 1.4], [0.9, 0.62, 1.1]], [[0.93, -0.46, 1.7], [-0.97, 0.34, 1.5], [0.9, 0.62, 1.2], [-0.62, -0.8, 1.1]]);
    piece(g, t => {
      t.ell(hx, hy, rx * 0.96, ry, M[1]);
      t.ell(hx + 0.2, hy + ry * 0.34, rx * 1.04, ry * 0.64, M[1]);
      // chips knocked out of the outline
      for (const [kx, ky, cr] of chips) t.ell(hx + kx * rx * 1.02, hy + ky * ry, cr, cr * 0.9, null);
      shadeShape(t, M, rx * 0.15, ry * 0.12);
      shine(t, hx - rx * 0.45, hy - ry * 0.45, rx * 0.2, ry * 0.11, M[0]);
      // pale grey stone faces where it chipped
      for (const [kx, ky, cr] of chips) t.ell(hx + kx * rx * 1.02, hy + ky * ry, cr + 1.0, cr * 0.9 + 0.9, S[1], 0, inside(t));
    });
    // one bold crack (two from stage 1), kept clear of the face
    const CK = mixHex(M[2], '#7a5232', 0.4);
    const crack = pts => stroke(g, pts.map(([a, b]) => [hx + a * rx, hy + b * ry]), 0.38, 0.32, CK);
    crack([[-0.8, 0.5], [-0.66, 0.62], [-0.74, 0.76], [-0.62, 0.86]]);
    if (stage >= 1) crack([[0.52, 0.68], [0.4, 0.78], [0.48, 0.9]]);
    // the moss cap: a fluffy green blanket over the top with a wavy, drippy edge and tufts poking above the nut
    const mtop = hy - ry, mdep = T(stage, 3.2, 3.6, 4.2);
    if (stage >= 1) piece(g, t => { // a fern sprout curling out of the moss
      const x = hx - rx * 0.42, y = mtop + 1.6;
      stroke(t, [[x, y + 1], [x - 0.4, y - 1.8], [x + 0.5, y - 3.0], [x + 1.4, y - 2.6], [x + 1.1, y - 1.9]], 0.55, 0.45, Mo[2]);
      for (const [k, s] of [[0.3, -1], [0.55, 1], [0.78, -1]]) A.leaf(t, x - 0.2, y - 3.0 * k, 1.9, s < 0 ? PI + 0.4 : -0.4, Mo[1], 0.42);
    });
    // (the nut's own outline, so the moss blanket stays on it)
    const onNut = (x, y) => PX.inEll(x + 0.25, y + 0.25, hx, hy, rx * 0.96 - 0.4, ry - 0.4, 0).in;
    piece(g, t => {
      t.ell(hx - 0.2, mtop + 1.6, rx * 0.9, mdep, Mo[1], 0, fm((x, y) => onNut(x, y) && y <= mtop + mdep));
      // a soft scalloped lower edge of little moss tufts
      for (let i = 0; i <= 6; i++) { const x = hx - rx * 0.78 + i * rx * 1.56 / 6, y = mtop + mdep - 0.2 + (i % 2 ? 0.7 : 0) - Math.abs(i - 3) * 0.35; if (onNut(x, y - 0.6)) t.ell(x, y, 1.35, 1.15, Mo[1]); }
      // fluffy tufts poking up over the top of the nut
      for (const [kx, ky, rr] of T(stage, [[-0.5, 0.9, 1.6], [-0.05, 0.25, 1.9], [0.42, 0.8, 1.5]], [[-0.55, 1.0, 1.6], [-0.15, 0.2, 2.0], [0.28, 0.35, 1.8], [0.58, 1.2, 1.3]], [[-0.6, 1.1, 1.7], [-0.25, 0.25, 2.0], [0.15, 0.0, 2.1], [0.5, 0.6, 1.8]]))
        t.ell(hx + kx * rx, mtop + ky, rr, rr * 0.86, Mo[1]);
      shadeShape(t, Mo, 0.5, 0.6);
      shine(t, hx - rx * 0.4, mtop + 0.8, 1.4, 0.55, Mo[0], -0.2);
      // a few soft moss speckles
      for (const [kx, ky] of [[-0.45, 2.0], [0.1, 1.4], [0.42, 2.4], [-0.15, 2.8]]) { t.dot(hx + kx * rx, mtop + ky, Mo[2]); t.dot(hx + kx * rx + 0.5, mtop + ky - 0.5, Mo[0]); }
    });
    if (stage === 2) piece(g, t => { const x = hx + rx * 0.42, y = mtop + 0.6; for (let i = 0; i < 5; i++) { const a = -PI / 2 + i * 2 * PI / 5; t.ell(x + cos(a) * 1.0, y + sin(a) * 1.0, 0.9, 0.7, '#fff4f8', a); } t.ell(x, y, 0.55, 0.55, GOLD[1]); });
    // big white eyes a little below the middle, looking forward (a touch bigger than the Wall-nut's)
    const ex = hx + 1.2, ey = hy + ry * 0.16;
    const ew = T(stage, 4.5, 4.7, 4.9), eh = T(stage, 5.1, 5.3, 5.6), sp = T(stage, 6.6, 6.8, 7.2);
    A.chibiEyes(g, ex, ey, { white: true, sp, w: ew, h: eh, look: [0.5, 0.25], mood: P.eyes });
    // short level brows in a soft brown, 1 px above the eyes (the sad and brave moods bring their own)
    if (!P.eyes || P.eyes === 'blink' || P.eyes === 'sleepy') for (const d of [-1, 1]) { const x = ex + d * sp / 2, y = ey - eh / 2 - 1.0; stroke(g, [[x - 1.0, y], [x + 1.0, y]], 0.3, 0.3, M[2]); }
    A.blush(g, ex, ey + eh * 0.72, { sp: sp + 2.6 });
    void f;
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(mtop + 2.6), w: R(rx * 1.6) } };
  };

  // =====================================================================================================
  // Perfume-shroom -> Sweet-shroom -> Charm-shroom
  // A lilac-pink mushroom whose dome cap carries a little gold perfume-spray top (a collar and a nozzle puffing pink mist) with a
  // squeeze bulb hanging off the back on a tube, pretty sparkles, a cream stalk flaring to the ground, eyes with lashes.
  // Stage 1: a bigger bulb with a tassel and more mist; stage 2: a ribbon bow, heart spots and lots of sparkles.
  PAL.perfumeshroom = { main: ['#ffecf8', '#f6c0e4', '#dc9cc8'], leaf: LEAF, acc: ['#fffaf4', '#f8ecdc', '#dcc8b0'], stem: '#62ac50', root: '#8a6a3a', part: 'cap' };
  const BULB = ['#ffe2ee', '#ffa6c6', '#ea82a8'], MIST = ['#fff4fa', '#ffe0ee', '#f8c2da'];
  ART.perfumeshroom = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, f = P.frame ? 1 : 0, sx = 15.2;
    const srx = T(stage, 5.4, 5.8, 6.2), sry = T(stage, 5.0, 5.4, 5.8), sy = 28.8 - sry + h, stop = sy - sry;
    const crx = T(stage, 8.2, 9.2, 10.0), cry = T(stage, 5.0, 5.6, 6.2), cby = stop + 1.8, cx = sx - 0.2;
    const tx = cx + 0.8, ty = domeTop(cx, cby, crx, cry, tx) + 1.0, s = T(stage, 1.0, 1.08, 1.15);
    // the squeeze bulb on its tube, resting on the back of the cap
    const bx = cx - T(stage, 4.2, 4.8, 5.4), br = T(stage, 2.0, 2.3, 2.6), by = domeTop(cx, cby, crx, cry, bx) - br * 0.55;
    // the bulb's gold tassel (longer from stage 1)
    piece(g, t => { const l = T(stage, 0.8, 1.2, 1.4); stroke(t, [[bx - br * 0.85, by + 0.2], [bx - br - l, by + 0.4 + l]], 0.3, 0.3, GOLD[2]); t.ell(bx - br - l - 0.2, by + 0.9 + l, 0.7, 0.85, GOLD[1]); });
    stalk(g, sx, sy, srx, sry, C.acc, P);
    piece(g, t => {
      dome(t, cx, cby, crx, cry, M);
      const sp = lt(M[0], 0.5);
      if (stage < 2) for (const [dx, dy, r] of T(stage, [[-4.6, -1.6, 1.1], [4.4, -1.4, 0.9]], [[-5.2, -1.8, 1.2], [4.8, -1.6, 1.0], [-1.6, -0.7, 0.7]], 0)) spot(t, sx + dx, cby + dy, r, sp);
      else for (const [dx, dy] of [[-5.4, -2.0], [5.0, -1.8], [-1.8, -0.9]]) heart(t, sx + dx, cby + dy, 0.75, sp);
    });
    // the little tube from the pump head to the bulb
    piece(g, t => stroke(t, [[tx - 0.8, ty - 2.6 * s], [tx - 2.0 * s, ty - 3.6 * s], [bx + br * 0.9, by - br * 0.9], [bx + br * 0.3, by - br * 0.6]], 0.42, 0.42, '#f2b2d0'));
    piece(g, t => A.softBody(t, bx, by, br, br * 1.06, BULB));
    // the gold spray top: a collar, a round pump head and a nozzle pointing forward
    piece(g, t => {
      t.poly([[tx - 1.9 * s, ty + 0.5], [tx + 1.9 * s, ty + 0.5], [tx + 1.6 * s, ty - 1.6 * s], [tx - 1.6 * s, ty - 1.6 * s]], GOLD[1]);
      t.ell(tx, ty + 0.5, 1.9 * s, 0.7, GOLD[1]);
      t.ell(tx, ty - 2.5 * s, 1.5 * s, 1.25 * s, GOLD[1]);
      t.poly([[tx + 0.8, ty - 3.1 * s], [tx + 3.4 * s, ty - 3.0 * s], [tx + 3.4 * s, ty - 2.0 * s], [tx + 0.8, ty - 1.9 * s]], GOLD[1]);
      shadeShape(t, GOLD, 0.4, 0.5);
      t.ell(tx - 0.8 * s, ty - 0.6, 0.35, 0.7, GOLD[0], 0, inside(t));
      t.ell(tx - 0.5 * s, ty - 2.9 * s, 0.5, 0.35, GOLD[0], -0.4, inside(t));
    });
    // a little dark nozzle hole and a puff of pink mist out of it, sparkles round it
    g.ell(tx + 3.3 * s, ty - 2.5 * s, 0.3, 0.38, mixHex(GOLD[2], HOLE, 0.5));
    const mx = Math.min(tx + 6.0 * s + f * 0.3, 28.6), my = ty - 2.8 * s - f * 0.3, ms = T(stage, 0.8, 0.9, 1.0);
    piece(g, t => { for (const [dx, dy, k] of [[-1.1, 0.3, 0.9], [1.0, 0.35, 0.85], [0, -0.45, 1.1]]) t.ell(mx + dx * ms, my + dy * ms, k * ms * 1.1, k * ms, MIST[1]); shadeShape(t, MIST, 0.3, 0.4); });
    const sp = T(stage, [[mx + 1.6, my - 2.4, 0.6]], [[mx + 1.6, my - 2.6, 0.65], [cx - crx - 1.0, cby - 3.2, 0.6]], [[mx + 1.4, my - 2.8, 0.7], [cx - crx - 1.2, cby - 3.4, 0.65], [mx - 0.6, my + 3.2, 0.55], [cx + crx + 1.0, cby + 1.2, 0.5]]);
    sp.forEach(([x, y, s], i) => sparkle(g, Math.min(x, 29.6), y + ((i + f) % 2 ? -0.4 : 0), s, i % 2 ? '#ffffff' : '#ffd6ec'));
    if (stage === 2) piece(g, t => { const x = bx + 0.2, y = by - br - 0.4; t.ell(x - 1.0, y, 1.1, 0.75, '#ff8fb4', 0.35); t.ell(x + 1.0, y, 1.1, 0.75, '#ff8fb4', -0.35); t.ell(x, y, 0.5, 0.5, '#ec6a96'); });
    const ex = sx + 0.9, ey = sy + sry * 0.14, er = srx * 1.04;
    eyes(g, ex, ey, er, P);
    lashes(g, ex, ey, er, P);
    A.chibiMouth(g, ex + 0.1, ey + er * 0.5, P.mouth || 'smile', 2);
    return { hx: R(cx), hy: R(cby - cry * 0.4), hr: R(crx * 0.8), top: topOf(g), ey: R(ey), hat: { x: R(cx), y: R(cby - cry + 1.4), w: R(crx * 1.5) } };
  };

  // =====================================================================================================
  // Nightshade -> Night Bloom -> Midnight Shade
  // A purple flower bud closed into a hood: a back petal with a soft point leaning back and two front petals wrapping round and
  // overlapping above the face, the dark inside of the hood framing a softly glowing pale face peeking out, on purple leaves.
  // Stage 1: a curl on the tip and pointed sepals; stage 2: a little glowing star hanging off the curl and night sparkles.
  PAL.nightshade = { main: ['#cfb8ee', '#9a7cce', '#7c5eb2'], leaf: ['#d6c2f2', '#a68ad8', '#8468bc'], acc: ['#fffbff', '#f4ecff', '#d6c8f4'], stem: '#8468bc', root: '#6a5a8a', part: 'petals' };
  ART.nightshade = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, L = C.leaf, F = C.acc, f = P.frame ? 1 : 0, bx = 15.6;
    const r = T(stage, 8.0, 8.8, 9.6), rx = r * 0.98, ry = r * 0.9, hy = 26.2 - ry + h;
    const tipX = bx - T(stage, 1.2, 1.6, 2.0), tipY = hy - ry - T(stage, 3.4, 3.6, 3.2);
    const fx = bx + 0.6, fy = hy + ry * 0.24, frx = rx * 0.72, fry = ry * 0.64;
    const MB = mix(M, '#5a3e96', 0.18);
    baseLeaves(g, P, L);
    // stage 1+: pointed sepals cupping the bud from below
    if (stage >= 1) piece(g, t => { for (const s of [-1, 1]) pointLeaf(t, bx + s * 1.2, hy + ry * 0.86, 4.4, PI / 2 - s * 1.42, 1.35, L[1]); shadeShape(t, L, 0.4, 0.5); });
    // the back petal: the bud's soft point, leaning back
    piece(g, t => {
      t.poly([[bx - rx * 0.8, hy - ry * 0.2], [bx - rx * 0.55, hy - ry * 0.9], [tipX - 0.8, tipY + 1.8], [tipX, tipY], [tipX + 1.1, tipY + 1.1], [bx + rx * 0.35, hy - ry * 1.0], [bx + rx * 0.8, hy - ry * 0.2]], MB[1]);
      t.ell(bx, hy, rx * 0.9, ry * 0.9, MB[1]);
      shadeShape(t, MB, 0.5, 0.6);
    });
    if (stage >= 1) piece(g, t => stroke(t, [[tipX + 0.2, tipY + 0.6], [tipX - 1.2, tipY - 0.4], [tipX - 1.6, tipY - 1.6], [tipX - 0.8, tipY - 2.2]], 0.5, 0.35, MB[1]));
    // stage 2: a little glowing star hanging off the curl
    if (stage === 2) piece(g, t => { const x = tipX - 3.4, y = tipY - 0.2 - f * 0.3; stroke(t, [[tipX - 1.4, tipY - 1.2], [x + 0.4, y - 1.2]], 0.2, 0.2, '#c8b4ec'); t.poly(starPts(x, y, 1.9, 0.85, 5), '#fff4b0'); t.ell(x, y, 0.5, 0.5, '#ffffff'); });
    // two front petals wrapping round the bud, overlapping above the face: they make the hood
    const DARK = mixHex(M[2], '#4a3a7a', 0.45), GLOW = mixHex(DARK, F[1], 0.5);
    for (const s of [-1, 1]) piece(g, t => {
      t.ell(bx + s * rx * 0.24, hy + ry * 0.06, rx * 0.78, ry * 0.98, M[1], s * 0.12);
      t.poly([[bx + s * rx * 0.9, hy + ry * 0.1], [bx - s * 0.2, hy - ry * 0.7], [tipX + 0.4 + s * 0.3, tipY + 2.6], [bx + s * rx * 0.6, hy - ry * 0.7]], M[1]);
      shadeShape(t, M, rx * 0.12, ry * 0.14);
      if (s < 0) shine(t, bx - rx * 0.55, hy - ry * 0.4, rx * 0.15, ry * 0.2, M[0], -0.9);
    });
    // the bud's round bottom, the dark inside of the hood, a soft glow ring, then the glowing face
    piece(g, t => {
      t.ell(bx, hy + ry * 0.3, rx * 1.02, ry * 0.7, M[1], 0, fm((x, y) => y >= hy + ry * 0.05));
      t.ell(fx, fy - 0.2, frx + 1.2, fry + 1.2, DARK);
      shadeShape(t, M, rx * 0.12, ry * 0.14);
      t.ell(fx, fy, frx + 0.55, fry + 0.55, GLOW, 0, inside(t));
      t.ell(fx, fy, frx, fry, F[1], 0, inside(t));
      t.ell(fx + frx * 0.18, fy + fry * 0.2, frx * 0.95, fry * 0.9, F[2], 0, fm((x, y) => t.get(x, y) === F[1] && !PX.inEll(x + 0.25, y + 0.25, fx - 0.5, fy - 0.6, frx, fry, 0).in));
      t.ell(fx - 0.4, fy - 0.3, frx * 0.6, fry * 0.55, F[0], 0, fm((x, y) => t.get(x, y) === F[1]));
    });
    if (stage === 2) for (const [x, y, s] of f ? [[bx - rx - 2.6, hy - ry * 0.9, 0.7], [bx + rx + 2.4, hy - ry * 0.3, 0.6]] : [[bx + rx + 2.2, hy - ry * 1.0, 0.7], [bx - rx - 2.4, hy - ry * 0.2, 0.6]]) sparkle(g, x, y, s, '#f4ecff');
    const ex = fx + 0.2, ey = fy + fry * 0.1, er = frx * 1.12;
    eyes(g, ex, ey, er, P);
    A.chibiMouth(g, ex + 0.1, ey + er * 0.52, P.mouth || 'smile', 2);
    return { hx: R(bx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(bx - 0.4), y: R(hy - ry + 1.4), w: R(rx * 1.5) } };
  };

  // =====================================================================================================
  // Dusk Lobber -> Twilight Lobber -> Midnight Lobber
  // A purple mushroom whose cap is a deep hollow cup (a ribbed bowl with a thick rim, tipped back a little like a catapult)
  // holding a dark glowing spore ball with pink glow spots; the pale stalk with the face flares to the ground. Stage 1: a bigger
  // ball and glow; stage 2: light spots round the bowl and two little spores floating up.
  PAL.dusklobber = { main: ['#ecdffc', '#c0a2ec', '#9c80d2'], leaf: LEAF, acc: ['#fdfaff', '#efe6f8', '#cbbce0'], stem: '#62ac50', root: '#8a6a3a', part: 'cap' };
  const SPORE = ['#a084d4', '#6e52aa', '#543c8e'], SPOT = ['#fff0fc', '#ffb8ee'];
  ART.dusklobber = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, f = P.frame ? 1 : 0, sx = 15.4;
    const srx = T(stage, 5.6, 6.0, 6.4), sry = T(stage, 5.0, 5.4, 5.8), sy = 28.8 - sry + h, stop = sy - sry;
    const crx = T(stage, 8.6, 9.6, 10.4), cry = T(stage, 5.4, 6.0, 6.5), rimH = T(stage, 2.2, 2.4, 2.6), cx = sx - 0.3, rimY = stop - T(stage, 2.4, 2.8, 3.0), rot = -0.12;
    const v = (x, y) => -(x - cx) * sin(rot) + (y - rimY) * cos(rot);
    const br = T(stage, 3.0, 3.5, 3.9), bcx = cx - 1.0, bcy = rimY - br * 0.38;
    stalk(g, sx, sy, srx, sry, C.acc, P);
    const IN = mixHex(M[2], '#4a3672', 0.4);
    piece(g, t => { // the deep bowl, its back rim and the hollow inside
      t.ell(cx, rimY, crx, cry, M[1], rot, fm((x, y) => v(x + 0.25, y + 0.25) >= 0));
      t.ell(cx, rimY, crx, rimH, M[1], rot);
      shadeShape(t, M, crx * 0.1, cry * 0.2);
      shine(t, cx - crx * 0.55, rimY + cry * 0.32, crx * 0.15, 0.6, M[0], 0.35);
      t.ell(cx, rimY + 0.2, crx - 1.5, rimH - 0.8, IN, rot);
      // soft ribs curving down the outside of the bowl
      for (const k of [-0.5, 0, 0.5]) for (let u = 0.25; u < 0.9; u += 0.08) { const x = cx + k * crx * (1 - u * 0.35), y = rimY + rimH * 0.6 + u * cry * 0.75 * Math.sqrt(1 - k * k * 0.6); if (t.get(x, y) === M[1]) t.dot(x, y, mixHex(M[1], M[2], 0.55)); }
      if (stage === 2) for (const [kx, ky, rr] of [[-0.68, 0.42, 0.85], [-0.25, 0.68, 0.75], [0.25, 0.66, 0.8], [0.66, 0.38, 0.6]]) spot(t, cx + kx * crx, rimY + ky * cry, rr, lt(M[0], 0.5));
    });
    // the dark glowing spore ball sitting in the bowl
    piece(g, t => {
      A.softBody(t, bcx, bcy, br, br * 0.96, SPORE, { hl: false });
      for (const [kx, ky, rr] of [[-0.42, -0.25, 0.6], [0.36, -0.48, 0.48], [0.46, 0.22, 0.55], [-0.08, 0.3, 0.42]]) { const x = bcx + kx * br, y = bcy + ky * br, q = rr * (br / 3); t.ell(x, y, q, q, SPOT[1], 0, inside(t)); t.dot(x - q * 0.3, y - q * 0.3, SPOT[0]); }
      t.ell(bcx - br * 0.45, bcy - br * 0.55, br * 0.22, br * 0.14, '#f4e8ff', -0.55, inside(t));
    });
    // the front lip of the rim, over the ball
    piece(g, t => {
      t.ell(cx, rimY, crx, rimH, M[1], rot, fm((x, y) => v(x + 0.25, y + 0.25) >= -0.1 && !PX.inEll(x + 0.25, y + 0.25, cx, rimY + 0.2, crx - 1.5, rimH - 0.8, rot).in));
      shadeShape(t, M, 0.4, 0.5);
      t.ell(cx - crx * 0.5, rimY + rimH * 0.55, crx * 0.18, 0.3, M[0], rot, inside(t));
    });
    // (one high above the ball, one off to the side lower down, so they never pair up like ears)
    if (stage === 2) for (const [x, y, rr] of [[bcx + br * 0.6 + 0.4, bcy - br - 3.0 - f * 0.5, 0.95], [bcx - br - 3.4, bcy - br * 0.9 + f * 0.5, 0.75]]) piece(g, t => { t.ell(x, y, rr, rr, SPORE[1]); t.dot(x - 0.3, y - 0.3, SPOT[1]); });
    // a soft see-through glow round the spore ball (only on empty pixels, so the bold edge skips it)
    { const k = g.k, gr = br + T(stage, 1.4, 1.7, 2.0) + f * 0.2;
      for (let fy = Math.floor((bcy - gr - 1.6) * k); fy <= Math.ceil((bcy + gr) * k); fy++) for (let fx = Math.floor((bcx - gr - 1.6) * k); fx <= Math.ceil((bcx + gr + 1.6) * k); fx++) {
        if (g.fget(fx, fy) !== null) continue; const x = (fx + 0.5) / k, y = (fy + 0.5) / k, d = Math.hypot(x - bcx, y - bcy);
        if (d <= gr) g.fset(fx, fy, 'rgba(214,168,255,0.42)'); else if (d <= gr + 1.3) g.fset(fx, fy, 'rgba(214,168,255,0.2)');
      } }
    const ex = sx + 0.9, ey = sy + sry * 0.16, er = srx;
    eyes(g, ex, ey, er, P);
    A.chibiMouth(g, ex + 0.1, ey + er * 0.5, P.mouth || 'smile', 2);
    return { hx: R(cx), hy: R(rimY), hr: R(crx * 0.8), top: topOf(g), ey: R(ey), hat: { x: R(cx), y: R(rimY + 0.8), w: R(crx * 1.5) } };
  };

  // =====================================================================================================
  // Grimrose -> Thorn Rose -> Royal Grimrose
  // A plum-red rose bloom: a ring of rounded darker petals peeking out all round it (a scalloped silhouette), the rose's swirl on
  // top of the head and curved petal edges down its sides, a curly thorny vine climbing up behind it, a face with lashes and a
  // sly little smile. Stage 1 adds a second vine and an inner ring of petals; stage 2 a rosebud on the vine.
  PAL.grimrose = { main: ['#f8cadc', '#d87e9e', '#b45e80'], leaf: ['#c2e8a4', '#72b66a', '#50945a'], acc: ['#fce0ea', '#e898b4', '#c47494'], stem: '#5a9a52', root: '#8a6a3a', part: 'petals' };
  ART.grimrose = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, L = C.leaf, f = P.frame ? 1 : 0;
    const r = T(stage, 7.8, 8.6, 9.4), rx = r * 1.02, ry = r * 0.94, hx = 15.8, hy = 26.2 - ry + h;
    const PB = mix(M, M[2], 0.32), VINE = L[2];
    // the curly thorny vines behind the bloom: a path climbing up one side that ends in a curl
    function vine(s, top, bud) {
      const x0 = hx + s * 2.2, pts = [[x0, 28.4], [hx + s * (rx + 1.0), hy + ry * 0.55], [hx + s * (rx + 2.0), hy - ry * 0.1], [hx + s * (rx + 1.6), top]];
      const ox = hx + s * (rx + 0.4), oy = top - 0.4;
      for (let i = 0; i <= 14; i++) { const a = (s > 0 ? 0 : PI) - s * i * 0.42, rr = 1.6 - i * 0.075; pts.push([ox + cos(a) * rr * (s > 0 ? 1 : 1), oy + sin(a) * rr]); }
      piece(g, t => {
        stroke(t, pts, 0.55, 0.32, VINE);
        // little thorns on the outer side of the vine
        for (const k of [1.4, 2.4]) { const i = Math.floor(k), p = pts[i], q = pts[i + 1], tx = (p[0] + q[0]) / 2, ty2 = (p[1] + q[1]) / 2; t.poly([[tx, ty2 - 0.55], [tx + s * 1.3, ty2 - 0.2], [tx, ty2 + 0.5]], VINE); }
        pointLeaf(t, pts[1][0] + s * 0.2, pts[1][1] + 0.6, 3.4, s > 0 ? -0.35 : PI + 0.35, 1.15, L[1]);
        shadeShape(t, L, 0.3, 0.4);
      });
      if (bud) piece(g, t => { const x = ox, y = oy - 2.4; t.ell(x, y, 1.3, 1.5, M[1]); pointLeaf(t, x - 0.2, y + 1.6, 1.6, -PI / 2 - 0.6, 0.6, L[1]); pointLeaf(t, x + 0.2, y + 1.6, 1.6, -PI / 2 + 0.6, 0.6, L[1]); shadeShape(t, M, 0.3, 0.4); });
    }
    baseLeaves(g, P, L);
    vine(-1, hy - ry - T(stage, 0.6, 1.2, 0.2) - f * 0.3, stage === 2);
    if (stage >= 1) vine(1, hy - ry * 0.55 + f * 0.3, false);
    // rounded back petals peeking out all round the bloom except underneath (a scalloped silhouette): an outer ring in the darker
    // plum, a second ring of rose petals inside it from stage 1
    const n = T(stage, 7, 8, 9), a0 = -PI - 0.75, a1 = 0.75;
    piece(g, t => {
      for (let i = 0; i < n; i++) { const a = a0 + i * (a1 - a0) / (n - 1); t.ell(hx + cos(a) * rx * 0.8, hy + sin(a) * ry * 0.8 - 0.2, r * 0.42, r * 0.36, PB[1], a); }
      shadeShape(t, PB, 0.5, 0.6);
    });
    piece(g, t => { // the bloom
      t.ell(hx, hy, rx, ry, M[1]); t.ell(hx - 0.2, hy + ry * 0.2, rx * 0.98, ry * 0.8, M[1]);
      if (stage >= 1) for (let i = 0; i < n - 1; i++) { const a = a0 + 0.2 + (i + 0.5) * (a1 - a0 - 0.4) / (n - 1); t.ell(hx + cos(a) * rx * 0.86, hy + sin(a) * ry * 0.86 - 0.1, r * 0.3, r * 0.26, M[1], a); }
      shadeShape(t, M, rx * 0.13, ry * 0.15);
      shine(t, hx - rx * 0.52, hy - ry * 0.32, rx * 0.15, ry * 0.12, M[0]);
    });
    // curved petal edges down both sides of the bloom (layered petals), clear of the eyes
    for (const sd of [-1, 1]) {
      const arc = []; for (let i = 0; i <= 8; i++) { const a = -PI / 2 - sd * (0.55 + i * 0.12); arc.push([hx + 0.3 + cos(a) * rx * 0.8, hy + 0.2 + sin(a) * ry * 0.78]); }
      for (const [x, y] of arc) if (g.get(x, y) === M[1]) g.dot(x, y, mixHex(M[1], M[2], 0.7));
    }
    // the rose's swirl on top of the head and the inner petal edge round it
    { const ox = hx - 0.2, oy = hy - ry * 0.6, pts = [];
      for (let i = 0; i <= 18; i++) { const a = -PI * 0.15 + i * 0.5, rr = 2.6 - i * 0.12; pts.push([ox + cos(a) * rr * 1.25, oy + sin(a) * rr * 0.8]); }
      stroke(g, pts, 0.3, 0.26, mixHex(M[2], '#7a3a58', 0.3));
      const arc = []; for (let i = 0; i <= 10; i++) { const a = PI * 0.9 - i * PI * 0.08; arc.push([hx + cos(a) * rx * 0.62, hy - ry * 0.18 - sin(a) * ry * 0.18]); }
      stroke(g, arc, 0.22, 0.22, mixHex(M[1], M[2], 0.6)); }
    const ex = hx + 0.8, ey = hy + ry * 0.2, er = r;
    eyes(g, ex, ey, er, P);
    lashes(g, ex, ey, er, P);
    const my = ey + er * 0.5;
    if (P.mouth) A.chibiMouth(g, ex + 0.1, my, P.mouth, 2.2);
    else stroke(g, [[ex - 1.1, my - 0.1], [ex - 0.4, my + 0.4], [ex + 0.5, my + 0.35], [ex + 1.2, my - 0.35]], 0.34, 0.34, INK);
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - ry + 1.2), w: R(rx * 1.5) } };
  };

  // =====================================================================================================
  // Sweet Potato -> Sugar Spud -> Candy Yam
  // A big plump purple-pink sweet potato leaning a little (a spindle tapering up into its sprout and down to a root tip with a
  // curly rootlet at the back) with a sprout of heart-shaped leaves, faint skin lines, big sparkly eyes, rosy cheeks and a sweet
  // smile. Stage 1: three leaves and a floating heart; stage 2: a pink morning-glory flower in the sprout and two hearts.
  PAL.sweetpotato = { main: ['#f6dcf4', '#d8a0d8', '#b47eb8'], leaf: LEAF, acc: HEART, stem: '#62ac50', root: '#8a6a3a', part: 'shell' };
  ART.sweetpotato = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, L = C.leaf, f = P.frame ? 1 : 0;
    const r = T(stage, 8.0, 8.8, 9.6), rx = r * 1.1, ry = r * 0.9, hx = 15.4, hy = 26.4 - ry + h, rot = -0.22;
    const nx = hx + rx * 0.42, ny = hy - ry * 0.92;
    baseLeaves(g, P, L, { sp: 4.8 });
    // the sprout: big heart-shaped leaves on little stems from the tapered top
    const lv = T(stage, [[-2.25, 4.8], [-0.9, 5.0]], [[-2.4, 5.0], [-1.6, 5.8], [-0.75, 5.0]], [[-2.5, 5.2], [-1.65, 6.0], [-0.7, 5.2]]);
    piece(g, t => { for (const [a0, len] of lv) { const a = a0 + (P.walk && f ? 0.08 : 0); stroke(t, [[nx, ny + 0.6], [nx + cos(a) * len * 0.35, ny + sin(a) * len * 0.35]], 0.42, 0.42, C.stem); heartLeaf(t, nx, ny + 0.4, a, len, T(stage, 2.2, 2.4, 2.5), L[1]); } shadeShape(t, L, 0.4, 0.5); });
    for (const [a, len] of lv) vein(g, nx, ny + 0.4, len, a, L[2]);
    if (stage === 2) piece(g, t => { // a pink morning-glory flower among the leaves
      const x = nx - 4.2, y = ny - 3.4;
      for (let i = 0; i < 5; i++) { const a = -PI / 2 + i * 2 * PI / 5; t.ell(x + cos(a) * 1.15, y + sin(a) * 1.15, 1.3, 1.1, '#ffb6d6', a); }
      shadeShape(t, ['#ffe8f2', '#ffb6d6', '#f28cba'], 0.4, 0.5);
      t.ell(x, y, 0.9, 0.9, '#ffe8f2', 0, inside(t)); t.ell(x, y, 0.4, 0.4, GOLD[1], 0, inside(t));
    });
    piece(g, t => { // the potato: a plump spindle leaning a little, tapering up into the sprout and down to a root tip at the back
      t.ell(hx, hy, rx, ry, M[1], rot);
      t.ell(hx - rx * 0.1, hy + ry * 0.18, rx * 0.92, ry * 0.8, M[1], rot);
      t.ell(nx - 0.6, ny + 2.0, rx * 0.42, ry * 0.46, M[1], rot - 0.5);
      t.ell(hx - rx * 0.72, hy + ry * 0.48, rx * 0.4, ry * 0.36, M[1], rot - 0.4);
      stroke(t, [[hx - rx * 0.9, hy + ry * 0.62], [hx - rx - 1.1, hy + ry * 0.86], [hx - rx - 1.9, hy + ry * 1.0]], 0.9, 0.3, M[1]);
      shadeShape(t, M, rx * 0.12, ry * 0.16);
      shine(t, hx - rx * 0.48, hy - ry * 0.36, rx * 0.17, ry * 0.12, M[0]);
    });
    // a thin rootlet curling off the root tip
    piece(g, t => stroke(t, [[hx - rx - 1.6, hy + ry * 0.96], [hx - rx - 2.6, hy + ry * 1.1], [hx - rx - 3.0, hy + ry * 0.92]], 0.28, 0.22, M[2]));
    // faint skin lines
    for (const [kx, ky, w] of [[-0.82, -0.05, 1.6], [-0.66, 0.5, 1.4], [0.74, 0.55, 1.4], [0.4, -0.62, 1.2]]) {
      const x = hx + kx * rx, y = hy + ky * ry;
      stroke(g, [[x - w / 2, y - 0.15], [x, y + 0.2], [x + w / 2, y - 0.15]], 0.22, 0.22, mixHex(M[1], M[2], 0.8));
    }
    const hearts = T(stage, [], [[hx + rx + 1.4, hy - ry * 0.4, 0.95]], [[hx + rx + 1.6, hy - ry * 0.35, 1.0], [hx - rx - 1.4, hy - ry * 0.9, 0.8]]);
    hearts.forEach(([x, y, s], i) => heartPiece(g, Math.min(x, 30.2 - 1.2 * s), y + ((i + f) % 2 ? -0.5 : 0), s, C.acc));
    const ex = hx + 0.9, ey = hy + ry * 0.18, er = r * 0.98;
    eyes(g, ex, ey, er, P, { eye: { w: er * 0.5, h: er * 0.66 }, bl: { col: '#ff9cbc', w: 1.9, h: 1.0 } });
    A.chibiMouth(g, ex + 0.1, ey + er * 0.52, P.mouth || 'smile', 2.4);
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - ry + 1.4), w: R(rx * 1.4) } };
  };

  // =====================================================================================================
  // Wasabi Whip -> Wasabi Lash -> Wasabi Storm
  // A pale green wasabi root (a plump knobbly body with little leaf-scar rings) with a tuft of round heart-shaped wasabi leaves
  // on top and long whip-like leafy tendrils twirling up out of it with curls at their tips: two whips, then three, then four.
  // A cheeky spicy grin; stage 2 adds little heat wiggles.
  PAL.wasabiwhip = { main: ['#f4fbe0', '#d4ebae', '#accf86'], leaf: ['#c8f2a2', '#7ccc60', '#58a650'], acc: ['#ffffff', '#ff9eac', '#e87888'], stem: '#68b058', root: '#8a6a3a', part: 'leafcrown' };
  ART.wasabiwhip = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, L = C.leaf, f = P.frame ? 1 : 0;
    const r = T(stage, 8.0, 8.8, 9.6), rx = r * 1.02, ry = r * 0.9, hx = 15.6, hy = 26.3 - ry + h;
    baseLeaves(g, P, L);
    // the whips: long leafy tendrils rising high off the top in an S like a twirled ribbon, a leaf partway up and a curl at the
    // tip; they swish on frame 1. Cubic paths as offsets from the top centre [p0, p1, p2, p3, base width]; ky squashes them so
    // the tallest stage stays in the frame.
    const top = hy - ry, wy = top + 2.0, sw = f ? 0.7 : 0, ky = T(stage, 0.86, 0.68, 0.52);
    const W = T(stage, [[[-0.4, 0], [-1.6, -6.4], [-6.4 - sw, -5.2], [-6.8 - sw, -10.0], 0.85], [[0.6, 0], [1.8, -6.0], [6.4 + sw, -5.0], [7.0 + sw, -9.4], 0.8]],
      [[[-0.5, 0], [-1.8, -7.0], [-7.0 - sw, -5.6], [-7.4 - sw, -10.8], 0.9], [[0.1, 0], [0.4, -6.0], [-1.6, -8.0], [0.6, -11.6], 0.75], [[0.7, 0], [2.0, -6.4], [7.0 + sw, -5.4], [7.6 + sw, -10.2], 0.85]],
      [[[-0.6, 0], [-2.0, -7.2], [-7.6 - sw, -5.8], [-8.4 - sw, -11.0], 0.95], [[-0.1, 0], [-0.4, -6.4], [-3.6, -9.0], [-2.4, -12.6], 0.8], [[0.4, 0], [1.2, -6.4], [4.2, -8.6], [3.4, -12.4], 0.8], [[0.8, 0], [2.2, -6.6], [7.6 + sw, -5.6], [8.6 + sw, -10.8], 0.9]]);
    W.forEach(([p0, p1, p2, p3, w], i) => {
      const pts = [], at = u => { const v = 1 - u; return [hx + v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0], wy + ky * (v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1])]; };
      for (let k = 0; k <= 16; k++) pts.push(at(k / 16));
      // the curl at the tip rolls outward
      const [ax, ay] = pts[15], [bx2, by2] = pts[16], a = Math.atan2(by2 - ay, bx2 - ax), sd = p3[0] < p0[0] ? -1 : 1, ox = bx2 + cos(a + sd * PI / 2) * 1.1, oy = by2 + sin(a + sd * PI / 2) * 1.1;
      for (let k = 1; k <= 8; k++) { const b = a - sd * PI / 2 + sd * k * 0.6, rr = 1.1 - k * 0.07; pts.push([ox + cos(b) * rr, oy + sin(b) * rr]); }
      const Lc = i % 2 ? mix(L, '#3e8a48', 0.14) : L, [mx, my] = at(0.42), [nx2, ny2] = at(0.47), ma = Math.atan2(ny2 - my, nx2 - mx);
      piece(g, t => { stroke(t, pts, w, 0.28, Lc[1]); pointLeaf(t, mx, my, 3.0, ma - sd * 0.9, 1.1, Lc[1]); shadeShape(t, Lc, 0.3, 0.4); });
    });
    piece(g, t => { // the root: a plump body with soft knobs at its sides
      t.ell(hx, hy, rx, ry, M[1]); t.ell(hx - 0.2, hy + ry * 0.24, rx * 0.98, ry * 0.76, M[1]);
      for (const [kx, ky, kr] of [[-0.92, 0.3, 1.9], [0.9, 0.52, 1.7], [-0.96, -0.25, 1.4]]) t.ell(hx + kx * rx, hy + ky * ry, kr, kr * 0.9, M[1]);
      shadeShape(t, M, rx * 0.14, ry * 0.16);
      shine(t, hx - rx * 0.46, hy - ry * 0.45, rx * 0.2, ry * 0.13, M[0]);
    });
    // round wasabi leaves on short stalks sprouting from the top (the signature heart leaves)
    const crown = T(stage, [[-0.6, -2.0, 4.6], [0.8, -1.15, 4.6]], [[-0.8, -2.15, 4.8], [0.1, -1.6, 5.4], [1.0, -1.0, 4.8]], [[-0.8, -2.2, 5.0], [0.1, -1.62, 5.8], [1.0, -0.98, 5.0]]);
    piece(g, t => {
      for (const [dx, a, len] of crown) { const x = hx + dx, y = top + 1.4; stroke(t, [[x, y + 0.4], [x + cos(a) * 1.8, y + sin(a) * 1.8]], 0.45, 0.45, L[1]); heartLeaf(t, x, y, a, len, T(stage, 2.2, 2.4, 2.5), L[1]); }
      shadeShape(t, L, 0.35, 0.45);
      for (const [dx, a, len] of crown) shine(t, hx + dx + cos(a) * len * 0.62 - 0.5, top + 1.4 + sin(a) * len * 0.62 - 0.4, 0.65, 0.4, L[0]);
    });
    for (const [dx, a, len] of crown) vein(g, hx + dx, top + 1.4, len, a, L[2]);
    // little leaf-scar rings (clear of the face)
    for (const [kx, ky] of [[-0.82, -0.1], [-0.7, 0.55], [0.82, 0.15], [0.72, 0.72], [-0.3, 0.92], [0.22, -0.72], [-0.2, -0.8]]) {
      const x = hx + kx * rx, y = hy + ky * ry;
      stroke(g, [[x - 0.7, y - 0.2], [x, y + 0.25], [x + 0.7, y - 0.2]], 0.22, 0.22, M[2]);
    }
    if (stage === 2) for (const [x, y] of [[hx - rx - 2.4, hy - 1 + f * 0.4], [hx + rx + 2.2, hy - 2.4 - f * 0.4]]) {
      const pts = []; for (let i = 0; i <= 8; i++) pts.push([x + sin(i * 0.9 + f) * 0.55, y - i * 0.45]);
      piece(g, t => stroke(t, pts, 0.32, 0.32, '#c8f2a2'));
    }
    const ex = hx + 0.8, ey = hy + ry * 0.14, er = r * 0.96, my = ey + er * 0.5;
    eyes(g, ex, ey, er, P);
    if (P.mouth && P.mouth !== 'grin') A.chibiMouth(g, ex + 0.1, my, P.mouth, 2.2);
    else { // the spicy grin: a wide D with a row of white teeth and a pink tongue
      const mx = ex + 0.1, w = 1.75, y0 = my - 0.5;
      g.ell(mx, y0, w + 0.36, 1.95, INK, 0, fm((x, y) => y >= y0));
      g.ell(mx, y0, w, 1.6, '#e8707e', 0, fm((x, y) => y >= y0 + 0.4));
      g.ell(mx, y0, w, 1.6, WHITE, 0, fm((x, y) => y >= y0 + 0.4 && y < y0 + 0.85));
      g.ell(mx + 0.3, y0 + 1.5, 0.8, 0.42, '#ffb0bc', 0, fm((x, y) => g.get(x, y) === '#e8707e'));
      // the corners turn up into a cheeky grin
      for (const sd of [-1, 1]) stroke(g, [[mx + sd * (w + 0.1), y0 + 0.2], [mx + sd * (w + 0.55), y0 - 0.3]], 0.3, 0.3, INK);
    }
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - ry + 1.2), w: R(rx * 1.5) } };
  };

  // =====================================================================================================
  // Missile Toe -> Missile Twig -> Missile Branch
  // A mistletoe sprig: a big round pearly-white berry (the face) under a fan of dark green pointed leaves, a tight bunch of little
  // berries where the leaves meet, a red ribbon bow on top and frosty sparkles. Stage 1: more leaves and berries; stage 2:
  // frosted leaf tips, one more berry and lots of frost sparkles.
  PAL.missiletoe = { main: ['#ffffff', '#f3f3fa', '#d0d1e8'], leaf: ['#b4dea4', '#68a86c', '#4a8a5a'], acc: ['#ffccd2', '#f47482', '#d65464'], stem: '#5a8e52', root: '#8a6a3a', part: 'berry' };
  ART.missiletoe = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, L = C.leaf, Rb = C.acc, f = P.frame ? 1 : 0;
    const r = T(stage, 7.6, 8.3, 9.0), hx = 15.4, hy = 26.2 - r * 0.94 + h, jx = hx + 0.6, jy = hy - r * 0.9;
    baseLeaves(g, P, L);
    // pointed leaves fanned out behind
    const lv = T(stage, [[-2.55, 8.6], [-0.6, 8.6]], [[-2.75, 8.8], [-2.15, 7.4], [-1.0, 7.4], [-0.4, 8.8]], [[-2.85, 9.2], [-2.25, 8.0], [-1.57, 6.4], [-0.9, 8.0], [-0.3, 9.2]]);
    lv.forEach(([a, len], i) => piece(g, t => {
      const Lc = i % 2 ? mix(L, '#2e6a44', 0.15) : L;
      pointLeaf(t, jx, jy + 1.2, len, a, T(stage, 2.0, 2.1, 2.2), Lc[1]);
      shadeShape(t, Lc, 0.4, 0.5);
      if (stage === 2) t.ell(jx + cos(a) * len * 0.92, jy + 1.2 + sin(a) * len * 0.92, 1.6, 1.4, '#f4fbff', a, inside(t));
    }));
    lv.forEach(([a, len]) => vein(g, jx, jy + 1.2, len, a, L[2]));
    piece(g, t => A.softBody(t, hx, hy, r, r * 0.94, M));
    // a tight bunch of little berries in front of the big one's crown, where the leaves meet (a clump, so they never read as ears)
    const small = T(stage, [[jx - 2.0, jy + 1.5, 1.9], [jx + 1.2, jy + 1.9, 1.7]],
      [[jx - 2.3, jy + 1.5, 2.0], [jx + 1.5, jy + 1.9, 1.8], [jx - 0.5, jy + 2.6, 1.6]],
      [[jx - 2.6, jy + 1.4, 2.1], [jx + 1.7, jy + 1.8, 1.9], [jx - 0.6, jy + 2.6, 1.7], [jx + 3.6, jy + 0.6, 1.5]]);
    for (const [x, y, s] of small) piece(g, t => { A.softBody(t, x, y, s, s * 0.96, M, { shade: 0.26 }); t.dot(x + s * 0.45, y + s * 0.5, '#b6a8bc'); });
    // the red ribbon bow on top
    piece(g, t => {
      const x = jx, y = jy + 0.4;
      t.poly([[x, y], [x - 1.2, y + 2.2], [x - 0.3, y + 2.4]], Rb[1]); t.poly([[x, y], [x + 1.4, y + 2.1], [x + 0.5, y + 2.4]], Rb[1]);
      t.ell(x - 1.6, y - 0.5, 1.6, 1.05, Rb[1], 0.35); t.ell(x + 1.6, y - 0.5, 1.6, 1.05, Rb[1], -0.35);
      shadeShape(t, Rb, 0.35, 0.45);
      t.ell(x - 1.9, y - 0.8, 0.5, 0.3, Rb[0], 0.35, inside(t));
    });
    piece(g, t => t.ell(jx, jy + 0.3, 0.75, 0.8, Rb[2]));
    // frost sparkles
    const fr = T(stage, [[hx + r + 2.4, hy - 2.6]], [[hx + r + 2.4, hy - 2.8], [hx - r - 2.4, hy + 1.2]], [[hx + r + 2.6, hy - 3.2], [hx - r - 2.6, hy + 1.0], [hx - r - 1.0, hy - r - 1.4], [hx + r + 2.0, hy + r * 0.6]]);
    fr.forEach(([x, y], i) => sparkle(g, Math.max(2.0, Math.min(x, 29.6)), y + ((i + f) % 2 ? -0.5 : 0), i % 2 ? 0.8 : 0.95, i % 2 ? '#d8f0ff' : '#ffffff'));
    const ex = hx + 0.8, ey = hy + r * 0.16;
    eyes(g, ex, ey, r, P);
    A.chibiMouth(g, ex + 0.1, ey + r * 0.5, P.mouth || 'smile', 2.2);
    return { hx: R(hx), hy: R(hy), hr: R(r), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - r * 0.94 + 1.6), w: R(r * 1.5) } };
  };

  // =====================================================================================================
  // Kiwibeast -> Kiwi Brute -> Kiwi King
  // A round fuzzy brown kiwi fruit with soft fur tufts round its back and top, its front cut open to bright green flesh round a
  // pale core, a ring of tiny black seeds round the face, a leaf tuft on top and a cute little fang. Stage 1 is fuzzier with a
  // third leaf; stage 2 the fluffiest, with bigger fur tufts and a swept-up cowlick.
  PAL.kiwibeast = { main: ['#ecd6b4', '#c9a47c', '#a6805c'], leaf: LEAF, acc: ['#effcc2', '#afe066', '#86c04c'], stem: '#62ac50', root: '#8a6a3a', part: 'jaws' };
  const CORE = ['#fdfeec', '#f4f9d2', '#dde8a8'];
  ART.kiwibeast = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, Fl = C.acc, L = C.leaf, f = P.frame ? 1 : 0;
    const r = T(stage, 8.0, 8.8, 9.6), rx = r * 1.06, ry = r * 0.95, hx = 15.2, hy = 26.2 - ry + h;
    baseLeaves(g, P, L);
    // the leaf tuft on top (behind)
    piece(g, t => {
      const x = hx - 0.6, y = hy - ry + 0.6;
      A.leaf(t, x, y + 0.4, T(stage, 3.8, 4.2, 4.4), -2.2, flat(L), 0.36); A.leaf(t, x + 0.4, y + 0.4, T(stage, 4.0, 4.4, 4.6), -1.0, flat(L), 0.36);
      if (stage >= 1) A.leaf(t, x, y + 0.2, 3.8, -1.62, flat(L), 0.34);
    });
    // the fuzzy body: a round kiwi with fluffy fur tufts round its back and top
    const tufts = T(stage, 9, 11, 13), tr = T(stage, 1.2, 1.35, 1.6);
    piece(g, t => {
      t.ell(hx, hy, rx, ry, M[1]); t.ell(hx - rx * 0.1, hy + ry * 0.16, rx * 0.96, ry * 0.84, M[1]);
      for (let i = 0; i < tufts; i++) { const a = -0.55 - i * (PI * 1.32) / (tufts - 1), big = stage === 2 && i > 1 && i < 7 ? 1.25 : 1; t.ell(hx + cos(a) * rx * 0.97, hy + sin(a) * ry * 0.97, tr * big, tr * big * 0.9, M[1]); }
      shadeShape(t, M, rx * 0.12, ry * 0.14);
      shine(t, hx - rx * 0.5, hy - ry * 0.5, rx * 0.17, ry * 0.12, M[0]);
      // tiny fuzz specks
      for (const [kx, ky] of [[-0.78, -0.2], [-0.6, -0.62], [-0.86, 0.32], [-0.2, -0.84], [0.3, -0.8], [-0.58, 0.7]]) t.dot(hx + kx * rx, hy + ky * ry, M[2]);
    });
    if (stage === 2) piece(g, t => { // a fluffy cowlick of three swept tufts on top
      for (const [dx, a, len] of [[-2.6, -2.1, 3.0], [-0.6, -1.75, 3.4], [1.4, -1.35, 2.8]]) { const x = hx + dx, y = hy - ry + 1.4; t.poly([[x - 1.2, y + 0.6], [x + 1.2, y + 0.6], [x + cos(a) * len, y + sin(a) * len]], M[1]); t.ell(x, y + 0.4, 1.3, 1.0, M[1]); }
      shadeShape(t, M, 0.4, 0.5);
    });
    // the cut-open front: bright green flesh round a pale core
    const fx = hx + 1.0, fy = hy + ry * 0.12, frx = rx * 0.84, fry = ry * 0.84;
    piece(g, t => {
      t.ell(fx, fy, frx, fry, Fl[1]);
      shadeShape(t, Fl, 0.5, 0.6);
      t.ell(fx - 0.1, fy, frx * 0.72, fry * 0.7, CORE[1], 0, inside(t));
      t.ell(fx - frx * 0.4, fy - fry * 0.62, frx * 0.2, fry * 0.08, Fl[0], -0.4, fm((x, y) => t.get(x, y) === Fl[1]));
    });
    const ex = fx - 0.1, ey = fy + fry * 0.02, er = r * 0.92;
    const sp = er * 0.86, ew = er * 0.48, eh = er * 0.64;
    // a ring of tiny black seeds round the face, on the green just outside the pale core (not under the eyes)
    const nS = T(stage, 20, 22, 24);
    for (let i = 0; i < nS; i++) {
      // (staggered in and out so it reads as seeds, not the ticks of a clock)
      const a = i * 2 * PI / nS + 0.1 + (i % 3) * 0.06, k = i % 2 ? 0.76 : 0.85, x = fx - 0.1 + cos(a) * frx * k, y = fy + sin(a) * fry * k;
      if ([-1, 1].some(s => Math.abs(x - (ex + s * sp / 2)) < ew / 2 + 0.5 && Math.abs(y - ey) < eh / 2 + 0.5)) continue;
      g.dot(x, y, '#3a2d34'); if (i % 3 === 0) g.dot(x + cos(a) * 0.5, y + sin(a) * 0.5, '#3a2d34');
    }
    eyes(g, ex, ey, er, P);
    const my = ey + er * 0.48;
    A.chibiMouth(g, ex + 0.1, my, P.mouth || 'smile', 2.2);
    // a cute little fang
    if (!P.mouth || P.mouth === 'smile' || P.mouth === 'open') piece(g, t => t.poly([[ex + 0.35, my + 0.3], [ex + 1.15, my + 0.15], [ex + 0.85, my + 1.15]], WHITE));
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - ry + 1.2), w: R(rx * 1.5) } };
  };
})();
