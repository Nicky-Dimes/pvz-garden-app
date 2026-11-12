// art-plants10.js — PVZ Garden: the fifth wave, batch B: twelve more plants in TRUE chibi style (see docs/pvz-art-guide.md and
// docs/chibi-reference.js). Pomegranate-pult, Bombegranate, Dartichoke, Rotobaga, Lava Guava, Blooming Heart, Hot Date, Pea-nut,
// Sap-fling, Escape Root, Tile Turnip, Thyme Warp.
// Same contract as art-plants7.js: PX.PLANT_ART[id] = function (g, stage, P, C) -> geometry, PX.PLANT_PAL[id] = palette.
// The head is the character (half-width about 8 / 9 / 10 by stage, its bottom near row 26), each with its own silhouette built
// from 2-3 overlapping shapes, big glossy eyes set low and wide, a tiny mouth, blush, flat pastel fills with one soft shade and
// little base leaves (or a dirt mound, or a glowing power tile); no long stems, no legs. All twelve are friendly: even the three
// bombs are cheeky and happy, never mad. The core adds the bold outer edge. Walking = a hop on frame 1; arms:'up' = raised leaves
// and a little hop.
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
  const HEART = ['#ffe0ea', '#ff7c9e', '#e25c82'];
  const FIRE = ['#fff4b8', '#ffae52', '#f07c46'];
  const RUBY = ['#ffe4ec', '#ff6286', '#d84066'];
  const PUFF = ['#ffffff', '#f4f2f6', '#d6d2de'];
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
  // recolour the fine pixels of colour `from` on layer t where test(x, y) holds (art coordinates of the pixel centre)
  function recolor(t, from, to, test) {
    const k = t.k, W = t.fw;
    for (let i = 0; i < t.a.length; i++) if (t.a[i] === from && test((i % W + 0.5) / k, (Math.floor(i / W) + 0.5) / k)) t.a[i] = to;
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
  // BIG glossy eyes + blush (art director v3 ratios), sized from r (about the face's radius); o: mood default, eye / blush overrides
  function eyes(g, ex, ey, r, P, o) {
    o = o || {};
    A.chibiEyes(g, ex, ey, Object.assign({ sp: r * 0.86, w: r * 0.48, h: r * 0.64, mood: P.eyes || o.mood }, o.eye));
    if (o.blush !== false) A.blush(g, ex - 0.2, ey + r * 0.42, Object.assign({ sp: r }, o.bl));
  }
  // two little lash flicks at the outer top corner of an open eye at x (side -1 back / 1 front; sizes as eyes())
  function lash(g, x, ey, r, s) {
    const rx = r * 0.24, ry = r * 0.32;
    stroke(g, [[x + s * rx * 0.62, ey - ry * 0.8], [x + s * (rx * 0.62 + 0.7), ey - ry * 0.8 - 0.8]], 0.26, 0.26, INK);
    stroke(g, [[x + s * rx * 0.92, ey - ry * 0.42], [x + s * (rx * 0.92 + 0.85), ey - ry * 0.42 - 0.45]], 0.26, 0.26, INK);
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
  // the outermost drawn x on row y walking out from cx (side -1 left / 1 right)
  function edgeX(g, y, cx, side) { let x = cx; while (g.filled(x + side * 0.5, y) && Math.abs(x - cx) < 16) x += side * 0.5; return x; }
  // a soft see-through glow round (x, y), squashed by sq (only on empty pixels, so the bold edge skips it); rgb = 'r,g,b'
  function glow(g, x, y, gr, rgb, a, sq) {
    const k = g.k; sq = sq || 1;
    for (let fy = Math.floor((y - (gr + 1.4) * sq) * k); fy <= Math.ceil((y + (gr + 1.4) * sq) * k); fy++) for (let fx = Math.floor((x - gr - 1.4) * k); fx <= Math.ceil((x + gr + 1.4) * k); fx++) {
      if (g.fget(fx, fy) !== null) continue;
      const d = Math.hypot((fx + 0.5) / k - x, ((fy + 0.5) / k - y) / sq);
      if (d <= gr) g.fset(fx, fy, `rgba(${rgb},${a})`); else if (d <= gr + 1.3) g.fset(fx, fy, `rgba(${rgb},${(a / 2).toFixed(2)})`);
    }
  }
  // a puffy cloud of dust: three overlapping balls; s = size
  function puff(t, x, y, s, col) { for (const [dx, dy, k] of [[-0.95, 0.3, 0.8], [0.95, 0.35, 0.75], [0, -0.3, 1.0]]) t.ell(x + dx * s, y + dy * s, k * s, k * s * 0.9, col); }
  const puffPiece = (g, x, y, s, Pf) => piece(g, t => { puff(t, x, y, s, Pf[1]); shadeShape(t, Pf, 0.3, 0.4); t.ell(x - s * 0.3, y - s * 0.55, s * 0.32, s * 0.2, Pf[0], -0.4, inside(t)); });
  // a soft round steam cloud, like a cloud icon: a big round middle bump between two smaller ones on a wide soft base, snapped to
  // the fine grid (so it always rasterises as a rounded cloud, never a pointed mound); s = size, about 3 s wide and 2 s tall
  const steamPiece = (g, x0, y0, s, Pf) => piece(g, t => {
    const x = R(x0 * 2) / 2, y = R(y0 * 2) / 2;
    for (const [dx, dy, kx, ky] of [[-0.85, 0.12, 0.64, 0.62], [0.05, -0.22, 0.88, 0.86], [0.92, 0.1, 0.6, 0.58], [0, 0.36, 1.38, 0.5]]) t.ell(x + dx * s, y + dy * s, kx * s, ky * s, Pf[1]);
    shadeShape(t, Pf, 0.2, 0.45); t.ell(x - s * 0.25, y - s * 0.55, s * 0.36, s * 0.2, Pf[0], -0.3, inside(t));
  });
  // a little swirl of time / wind: a spiral curling in (dir 1 clockwise, -1 the other way)
  function swirl(g, x, y, r, col, dir) {
    const pts = []; for (let i = 0; i <= 16; i++) { const a = dir * i * 0.5 - PI / 2, rr = r * (1 - i / 19); pts.push([x + cos(a) * rr, y + sin(a) * rr]); }
    piece(g, t => stroke(t, pts, 0.3, 0.22, col));
  }
  // a little flame from its base (x, y): height fh, half-width fw, the tip leaning over by lean (x fh); it flickers on frame f. A
  // round belly low down, then sides sweeping in (concave) to a tip that rolls over in a curl, a flick licking up its back side
  // (big flames only) and a yellow core low inside
  function flame(t, x, y, fh, fw, f, lean, F) {
    const ln = lean + (f ? 0.14 : -0.06), prof = u => u < 0.34 ? Math.sqrt(Math.max(0, 1 - ((0.34 - u) / 0.34) ** 2)) : Math.pow(1 - (u - 0.34) / 0.66, 1.5);
    const at = (u, sd, k) => [x + ln * fh * u * u + sd * fw * k * prof(u), y - fh * k * u];
    const shape = k => { const pts = []; for (let i = 0; i <= 16; i++) pts.push(at(i / 16, -1, k)); for (let i = 16; i >= 0; i--) pts.push(at(i / 16, 1, k)); return pts; };
    t.poly(shape(1), F[1]);
    const sd = ln >= 0 ? 1 : -1;
    if (fh > 6) { const [ax, ay] = at(0.22, -sd, 1), [bx, by] = at(0.5, -sd, 1); t.poly([[ax + sd * 0.5, ay], [ax - sd * fw * 0.5, by - fh * 0.12], [bx + sd * 0.4, by + 0.2]], F[1]); }
    // the curl at the tip rolls over to the front
    const [tx, ty] = at(1, 0, 1);
    stroke(t, [[tx - sd * 0.1, ty + 0.45], [tx + sd * 0.75, ty + 0.1], [tx + sd * 1.15, ty + 0.85]], 0.36, 0.28, F[1]);
    shadeShape(t, F, 0.35, 0.4);
    t.poly(shape(0.58).map(([px, py]) => [px, py - fh * 0.05]), F[0]);
  }
  // a short chunky snout tube from (x0, y0) along angle a: len long, half-thickness th, flaring by fl at the opening
  function tube(t, x0, y0, a, len, th, fl, col) {
    const c = cos(a), s = sin(a), nx = -s, ny = c;
    t.poly([[x0 + nx * th, y0 + ny * th], [x0 + c * len + nx * th * fl, y0 + s * len + ny * th * fl], [x0 + c * len - nx * th * fl, y0 + s * len - ny * th * fl], [x0 - nx * th, y0 - ny * th]], col);
  }
  // a snout's muzzle at (x, y) facing along a, like the Peashooter's: a pale lip rw deep and rh across, one small round dark hole
  const muzzle = (g, x, y, a, rw, rh, lip, hole) => piece(g, t => { t.ell(x, y, rw, rh, lip, a); t.ell(x + cos(a) * 0.12, y + sin(a) * 0.12, rw * 0.7, Math.min(rh * 0.55, 1.1), hole, a); });
  // a fat propeller blade from the hub (x, y) out to (x + dx, y + dy) on the spinning disc: narrow at the hub and widest (half width
  // w) at its round tip; its width is squashed a little in y too (0.75), so blades pointing back stay low and the disc reads flat
  function propBlade(t, x, y, dx, dy, w, col) {
    const len = Math.hypot(dx, dy), c = dx / len, s = dy / len, q = 0.75, m = Math.max(0.6, len - w * Math.sqrt(c * c + q * q * s * s));
    const nx = -s * w, ny = c * w * q, pts = [];
    for (const [u, k] of [[0, 0.3], [0.45, 0.62], [1, 1]]) pts.push([x + c * m * u + nx * k, y + s * m * u + ny * k]);
    for (const [u, k] of [[1, 1], [0.45, 0.62], [0, 0.3]]) pts.push([x + c * m * u - nx * k, y + s * m * u - ny * k]);
    t.poly(pts, col); t.ell(x + c * m, y + s * m, w, w * q, col);
  }
  // the opening of a snout at (x, y) facing along a: a pale lip ring round a dark hole
  function opening(g, x, y, a, rh, Rm, open, rw) {
    rw = rw || 1.0;
    piece(g, t => {
      t.ell(x, y, rw, rh, Rm[0], a);
      t.ell(x + cos(a) * 0.2, y + sin(a) * 0.2, rw * 0.6, rh * 0.68, open ? lt(Rm[0], 0.2) : mixHex(Rm[2], HOLE, 0.6), a);
    });
  }
  // a leafy catapult arm (pts from the body out to the cup) and its scoop at (cupX, cupY), cw half-wide; ammo() draws what's in it
  function pultArm(g, AR, CR, pts, cupX, cupY, cw, ammo) {
    piece(g, t => { stroke(t, pts, 1.0, 0.8, AR[1]); shadeShape(t, AR, 0.3, 0.4); });
    if (ammo) ammo();
    piece(g, t => {
      t.ell(cupX, cupY, cw, cw * 0.58, CR[1], 0, fm((x, y) => y >= cupY - 0.25));
      // the scoop's curled-up back lip
      t.ell(cupX - cw + 0.5, cupY - 0.7, 1.1, 1.6, CR[1], -0.45);
      shadeShape(t, CR, 0.5, 0.6);
      t.ell(cupX - cw * 0.25, cupY + 0.55, cw * 0.32, 0.3, CR[0], 0, inside(t));
    });
  }
  // a pomegranate's crown-shaped calyx: a short neck (half-width w) rising from inside the head (by) to the valleys at vy, then
  // n pointed sepals flaring out to their tips at ty; returns the tips (Royal Pomegranate gilds them)
  function calyx(t, cx, by, w, vy, ty, n, col) {
    const tips = [], pts = [[cx - w, by], [cx - w, vy + 0.5]];
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1) * 2 - 1, x = cx + k * w * 1.6, y = ty - (1 - Math.abs(k)) * 0.4;
      if (i) pts.push([cx + (k - 1 / (n - 1)) * w * 1.3, vy]);
      pts.push([x, y]); tips.push([x, y]);
    }
    pts.push([cx + w, vy + 0.5], [cx + w, by]);
    t.poly(pts, col);
    return tips;
  }
  // the calyx as its own piece with a soft shade and its dark opening between the sepals
  function crownPiece(g, cx, top, w, nh, sh, K) {
    let tips = [];
    piece(g, t => { tips = calyx(t, cx, top + 1.2, w, top - nh, top - nh - sh, 5, K[1]); shadeShape(t, K, 0.4, 0.5); t.ell(cx, top - nh + 0.1, w * 0.9, 0.55, mixHex(K[2], HOLE, 0.35), 0, inside(t)); });
    return tips;
  }

  // =====================================================================================================
  // Pomegranate-pult -> Pom-Pom-pult -> Royal Pomegranate
  // A round rosy-red pomegranate head wearing its little crown-shaped calyx on top, with a leafy catapult arm at the back holding
  // a cup heaped with glossy ruby seeds. Stage 1: a leaf behind the crown and a bigger heap; stage 2: gold-tipped crown points,
  // the biggest heap and a royal sparkle.
  PAL.pomegranatepult = { main: ['#ffd8dc', '#f48c98', '#d86a7a'], leaf: LEAF, acc: RUBY, stem: '#62ac50', root: '#8a6a3a', part: 'pomcrown' };
  // a glossy ruby seed (aril): its own little outlined piece with a shine
  function aril(g, x, y, s, Rb) { piece(g, t => { t.ell(x, y, s * 0.9, s, Rb[1], 0.35); shadeShape(t, Rb, 0.3, 0.35); }); g.dot(x - s * 0.3, y - s * 0.42, WHITE); }
  ART.pomegranatepult = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, L = C.leaf, f = P.frame ? 1 : 0;
    const r = T(stage, 8, 9, 9.8), rx = r * 1.02, ry = r * 0.92, hx = T(stage, 18.0, 18.5, 19.2), hy = 26.3 - ry + h;
    const cupX = hx - rx - T(stage, 2.4, 2.7, 2.8), cupY = hy - ry * 0.55 - (P.arms === 'up' ? 0.8 : 0), cw = T(stage, 3.2, 3.5, 3.6);
    baseLeaves(g, P, L, { cx: hx - 0.8 });
    const seeds = T(stage, [[-1.3, -0.8], [1.1, -0.8], [-0.1, -2.2]], [[-2.0, -0.7], [0, -0.8], [2.0, -0.7], [-1.0, -2.2], [1.0, -2.2]],
      [[-2.2, -0.7], [0, -0.8], [2.2, -0.7], [-1.1, -2.3], [1.1, -2.3], [0, -3.8]]);
    pultArm(g, L, L, [[hx - rx * 0.4, hy + ry * 0.4], [hx - rx - 0.3, hy - ry * 0.05], [cupX + 0.8, cupY + 1.0]], cupX, cupY, cw,
      () => { for (const [dx, dy] of seeds) aril(g, cupX + dx, cupY + dy - (P.walk && f ? 0.4 : 0), T(stage, 1.05, 1.1, 1.15), C.acc); });
    // the crown-shaped calyx on top (a leaf tucked behind it from stage 1)
    const kx = hx - 0.3, top = hy - ry, K = mix(M, '#a8405a', 0.22);
    if (stage >= 1) piece(g, t => { pointLeaf(t, kx - 1.4, top + 0.2, T(stage, 0, 4.4, 5.0), -PI + 0.45, 1.45, L[1]); shadeShape(t, L, 0.4, 0.5); });
    const tips = crownPiece(g, kx, top, T(stage, 2.0, 2.2, 2.3), T(stage, 1.1, 1.2, 1.1), T(stage, 2.2, 2.4, 2.1), K);
    if (stage === 2) for (const [x, y] of tips) piece(g, t => { t.ell(x, y, 0.8, 0.8, GOLD[1]); shadeShape(t, GOLD, 0.3, 0.3); });
    piece(g, t => { // the pomegranate: round, a touch fuller low down
      t.ell(hx, hy, rx, ry, M[1]); t.ell(hx - 0.15, hy + ry * 0.18, rx, ry * 0.82, M[1]);
      shadeShape(t, M, rx * 0.14, ry * 0.16);
      shine(t, hx - rx * 0.45, hy - ry * 0.48, rx * 0.2, ry * 0.13, M[0]);
    });
    // two faint ribs down the back of the skin (pomegranates are softly faceted), clear of the face
    for (const k of [0.45, 0.85]) { const y = hy + (k - 0.5) * ry * 1.2, x = edgeX(g, y, hx, -1); stroke(g, [[x + 0.6, y - 0.9], [x + 1.1, y], [x + 0.7, y + 0.9]], 0.21, 0.21, M[2]); }
    if (stage === 2) sparkle(g, Math.min(hx + rx + 0.9, 28.6), hy - ry * 0.9 + (f ? -0.4 : 0), 0.65, '#fff6a0');
    const ex = hx + 0.8, ey = hy + ry * 0.16;
    eyes(g, ex, ey, r, P);
    A.chibiMouth(g, ex + 0.1, ey + r * 0.5, P.mouth || 'smile', 2.2);
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - ry + 1.4), w: R(rx * 1.4) } };
  };

  // =====================================================================================================
  // Bombegranate -> Bombegranate Blast -> Mega Bombegranate
  // A rounder, deeper red pomegranate (a big glossy bomb shine) with the crown calyx on top and a little fuse cord curling out
  // of it to a sparkly spark, a cheeky happy grin (never mad). The spark grows by stage: stage 1 adds a second star and two flying
  // sparks; stage 2 the biggest spark, more flying sparks and a warm glow.
  PAL.bombegranate = { main: ['#ffc6cc', '#ea6676', '#c84c60'], leaf: LEAF, acc: ['#fffce6', '#ffd85e', '#f29a3e'], stem: '#62ac50', root: '#8a6a3a', part: 'pomcrown' };
  ART.bombegranate = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, L = C.leaf, S = C.acc, f = P.frame ? 1 : 0;
    const r = T(stage, 8, 8.8, 9.4), rx = r * 1.04, ry = r * 0.98, hx = 15.4, hy = 26.4 - ry + h;
    baseLeaves(g, P, L);
    const kx = hx - 0.4, top = hy - ry, nh = T(stage, 1.0, 1.1, 1.2), K = mix(M, '#8a2a44', 0.2);
    // the fuse: a little cord curling up out of the crown
    const fl = T(stage, 3.0, 2.8, 2.4), fx = kx + 0.2, fy = top - nh;
    const fuse = [[fx, fy], [fx + 0.3, fy - fl * 0.6], [fx + 1.3, fy - fl], [fx + T(stage, 2.2, 2.8, 3.4), fy - fl * T(stage, 0.9, 0.75, 0.55)]];
    piece(g, t => stroke(t, fuse, 0.45, 0.38, '#ecd4a6'));
    crownPiece(g, kx, top, T(stage, 1.8, 2.0, 2.2), nh, T(stage, 2.0, 2.2, 2.4), K);
    piece(g, t => { // the round bomb of a pomegranate
      t.ell(hx, hy, rx, ry, M[1]); t.ell(hx - 0.1, hy + ry * 0.12, rx * 0.99, ry * 0.88, M[1]);
      shadeShape(t, M, rx * 0.14, ry * 0.15);
      shine(t, hx - rx * 0.46, hy - ry * 0.46, rx * 0.24, ry * 0.15, M[0]);
      t.ell(hx - rx * 0.66, hy - ry * 0.16, 0.45, 0.45, M[0], 0, inside(t));
    });
    // the sparkly spark at the tip of the fuse (it twinkles round a step on frame 1)
    const [sx0, sy0] = fuse[3], sx = sx0 + 0.3, sy = sy0 - 0.2, so = T(stage, 1.9, 2.2, 2.4), rot = f ? PI / 4 : 0;
    if (stage === 2) glow(g, sx, sy, so + 0.6, '255,214,110', 0.45);
    piece(g, t => {
      t.poly(starPts(sx, sy, so, so * 0.36, 4, -PI / 2 + rot), S[1]);
      if (stage >= 1) t.poly(starPts(sx, sy, so * 0.66, so * 0.26, 4, -PI / 4 + rot), S[1]);
      shadeShape(t, S, 0.3, 0.3);
      t.ell(sx, sy, so * 0.3, so * 0.3, S[0]);
    });
    const flyers = T(stage, [], [[sx + 2.6, sy + 1.0, 0.5], [sx - 2.4, sy - 0.8, 0.45]], [[sx + 3.2, sy + 1.4, 0.6], [sx - 2.8, sy - 0.6, 0.55], [sx + 2.4, sy - 1.6, 0.45], [sx - 3.4, sy + 1.8, 0.4]]);
    flyers.forEach(([x, y, s], i) => sparkle(g, Math.max(2.2 + 1.9 * s, Math.min(x, 29.8 - 1.9 * s)), Math.max(2.6 + 1.9 * s, y + ((i + f) % 2 ? -0.4 : 0)), s, i % 2 ? '#ffffff' : '#ffe27a'));
    const ex = hx + 0.8, ey = hy + ry * 0.16;
    eyes(g, ex, ey, r, P);
    const mx = ex + 0.1, my = ey + r * 0.46;
    if (P.mouth) A.chibiMouth(g, mx, my, P.mouth, 2.2);
    else { // the cheeky grin: a wide D with a little pink tongue, its corners tucked up
      const w = 1.45;
      g.ell(mx, my - 0.3, w + 0.36, 1.6, INK, 0, fm((x, y) => y >= my - 0.3));
      g.ell(mx, my - 0.3, w, 1.24, '#e8707e', 0, fm((x, y) => y >= my + 0.1));
      g.ell(mx + 0.35, my + 0.65, 0.72, 0.42, '#ffb0bc', 0, fm((x, y) => g.get(x, y) === '#e8707e'));
      for (const sd of [-1, 1]) stroke(g, [[mx + sd * (w + 0.05), my - 0.15], [mx + sd * (w + 0.5), my - 0.6]], 0.28, 0.28, INK);
    }
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - ry + 1.4), w: R(rx * 1.4) } };
  };

  // =====================================================================================================
  // Dartichoke -> Dartichoke Volley -> Royal Dartichoke
  // An artichoke head: a round green bud ringed with plump pointed leaf scales (purple tips) peeking out round its top, more scales
  // layered over its crown, and a slim dart-leaf (purple point, two fletching leaves) held ready at its front. Each stage adds a row
  // of scales and a dart: two darts fanned at stage 1, three at stage 2 with a royal sparkle on the top scale.
  PAL.dartichoke = { main: ['#e6f6c6', '#acd88c', '#86b86e'], leaf: LEAF, acc: ['#f2e2ff', '#b892e6', '#9272ca'], stem: '#62ac50', root: '#8a6a3a', part: 'artichoke' };
  // an artichoke scale: a plump bract from its base (x, y) along angle a, round at the base and tapering to a sharp purple tip
  function bract(g, x, y, a, len, w, Mc, Pu) {
    const c = cos(a), s = sin(a), nx = -s * w, ny = c * w, pts = [];
    const prof = [[0, 0.55], [0.12, 0.92], [0.3, 1], [0.5, 0.86], [0.72, 0.52], [0.9, 0.18], [1, 0]];
    for (const [u, k] of prof) pts.push([x + c * len * u + nx * k, y + s * len * u + ny * k]);
    for (let i = prof.length - 2; i >= 0; i--) { const [u, k] = prof[i]; pts.push([x + c * len * u - nx * k, y + s * len * u - ny * k]); }
    piece(g, t => {
      t.poly(pts, Mc[1]);
      recolor(t, Mc[1], Pu[1], (px, py) => ((px - x) * c + (py - y) * s) / len > 0.66);
      shadeShape(t, Mc, 0.4, 0.5); shadeShape(t, Pu, 0.4, 0.5);
    });
    // a pale midrib
    for (let k = 0.2; k < 0.6; k += 0.07) { const px = x + c * len * k, py = y + s * len * k; if (g.get(px, py) === Mc[1]) g.dot(px, py, Mc[0]); }
  }
  // the dart-leaf: a slim pointed leaf from its tail (x, y) along a, with a purple point and two little fletching leaves
  function dart(g, x, y, a, len, L, Pu) {
    const c = cos(a), s = sin(a);
    piece(g, t => { for (const sd of [-1, 1]) pointLeaf(t, x + c * 0.9, y + s * 0.9, 2.0, a + PI + sd * 0.6, 0.8, L[1]); shadeShape(t, L, 0.3, 0.3); });
    piece(g, t => {
      pointLeaf(t, x, y, len, a, 1.25, L[1]);
      recolor(t, L[1], Pu[1], (px, py) => ((px - x) * c + (py - y) * s) / len > 0.6);
      shadeShape(t, L, 0.3, 0.35); shadeShape(t, Pu, 0.3, 0.35);
    });
    vein(g, x, y, len * 0.75, a, L[0]);
  }
  ART.dartichoke = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, L = C.leaf, Pu = C.acc, f = P.frame ? 1 : 0;
    const r = T(stage, 8, 8.8, 9.6), rx = r, ry = r * 0.95, hx = 15.2, hy = 26.3 - ry + h;
    const MB = mix(M, '#3e7a4a', 0.2);
    baseLeaves(g, P, L);
    // the back ring of scales poking out round the top (more and longer by stage)
    const n = T(stage, 5, 6, 7), bl = r * 0.5 + T(stage, 2.4, 2.7, 3.0);
    for (let i = 0; i < n; i++) { const a = -PI + 0.25 + i * (PI - 0.5) / (n - 1); bract(g, hx + cos(a) * rx * 0.55, hy + sin(a) * ry * 0.55, a, bl, 2.3, MB, Pu); }
    piece(g, t => { // the round bud
      t.ell(hx, hy, rx, ry, M[1]); t.ell(hx - 0.1, hy + ry * 0.2, rx * 0.98, ry * 0.8, M[1]);
      shadeShape(t, M, rx * 0.13, ry * 0.15);
    });
    // rows of scales layered over the crown, back row first (one row, two from stage 1, three at stage 2), all above the eyes
    const rows = T(stage, [[[-0.46, -0.3, 0.72], [0.04, -0.36, 0.78], [0.52, -0.28, 0.68]]],
      [[[-0.58, -0.48, 0.62], [-0.18, -0.58, 0.66], [0.24, -0.58, 0.66], [0.62, -0.46, 0.6]], [[-0.38, -0.26, 0.62], [0.1, -0.3, 0.66], [0.56, -0.22, 0.56]]],
      [[[-0.64, -0.56, 0.56], [-0.26, -0.68, 0.6], [0.14, -0.7, 0.62], [0.52, -0.6, 0.58]], [[-0.46, -0.4, 0.58], [-0.06, -0.46, 0.62], [0.36, -0.42, 0.6]], [[-0.26, -0.24, 0.56], [0.2, -0.26, 0.58]]]);
    for (const row of rows) for (const [kx, ky, kl] of row) bract(g, hx + kx * rx, hy + ky * ry, -PI / 2 + kx * 0.8, r * kl, T(stage, 2.1, 2.1, 2.05), M, Pu);
    // the dart-leaves held ready at its front, pointing up and away (they pull back on frame 1)
    const tx = hx + rx - 0.3 - (P.walk && f ? 0.4 : 0), ty = hy + ry * 0.7, dl = T(stage, 5.8, 5.6, 5.4);
    for (const a of T(stage, [-0.95], [-1.15, -0.55], [-1.25, -0.82, -0.38])) dart(g, tx, ty, a, dl, L, Pu);
    if (stage === 2) sparkle(g, hx + 0.4, Math.max(2.2, hy - ry - 3.4 - (f ? 0.4 : 0)), 0.75, '#fff6a0');
    const ex = hx + 0.8, ey = hy + ry * 0.18;
    eyes(g, ex, ey, r, P);
    A.chibiMouth(g, ex + 0.1, ey + r * 0.5, P.mouth || 'smile', 2.2);
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - ry + 1.2), w: R(rx * 1.4) } };
  };

  // =====================================================================================================
  // Rotobaga -> Rotobaga Twister -> Mega Rotobaga
  // A round rutabaga, lavender-purple on top and cream below, with a leafy propeller whirling on a little stalk on its head and
  // four short snouts poking out at 45 degrees (two lilac ones up, two cream ones down) so it can shoot every way. Stage 1: a
  // three-blade propeller with a spin arc at each side; stage 2: four blades and a double ring of spin arcs.
  PAL.rotobaga = { main: ['#ecdefa', '#bc9ae4', '#9a7ac8'], leaf: LEAF, acc: ['#fffbec', '#f8ecce', '#dcc8a2'], stem: '#62ac50', root: '#8a6a3a', part: 'snout' };
  ART.rotobaga = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, Cr = C.acc, L = C.leaf, f = P.frame ? 1 : 0;
    const r = T(stage, 7.6, 8.4, 8.7), rx = r * 1.04, ry = r * 0.96, hx = 15.5, hy = 26.7 - ry + h, top = hy - ry;
    // (the base leaves tuck in under the body, clear of the two lower snouts)
    baseLeaves(g, P, L, { sp: 3.0, len: 3.5, y: 29.1 });
    // the leafy propeller: fat rounded blades round a hub on a 2 px stalk, seen from above (squashed about 0.5 in y, so it reads as
    // a spinning disc; 2, 3, then 4 blades, set so no blade points straight back and pokes out of the top); a step on frame 1
    const ux = hx - 0.3, uy = top - 3.75, n = T(stage, 2, 3, 4), bl = T(stage, 5.8, 6.3, 6.4), bw = T(stage, 1.6, 1.7, 1.75), sq = T(stage, 0.5, 0.5, 0.45);
    const spin = (n === 3 ? PI / 6 : n === 4 ? 3 * PI / 16 : 0.35) + (f ? PI / n / 2 : 0);
    const blades = []; for (let i = 0; i < n; i++) { const a = spin + i * 2 * PI / n; blades.push([cos(a) * bl, sin(a) * bl * sq]); }
    piece(g, t => stroke(t, [[ux, top + 1.4], [ux, uy]], 0.62, 0.55, C.stem));
    piece(g, t => {
      for (const [dx, dy] of blades) propBlade(t, ux, uy, dx, dy, bw, L[1]);
      shadeShape(t, L, 0.35, 0.45);
    });
    for (const [dx, dy] of blades) vein(g, ux, uy, Math.hypot(dx, dy) * 0.9, Math.atan2(dy, dx), L[2]);
    // the hub: a little knob on top of the blades
    piece(g, t => { t.ell(ux, uy, 1.15, 0.78, L[2]); t.ell(ux - 0.35, uy - 0.25, 0.42, 0.28, L[0]); });
    // spin lines: long pale-blue arcs just outside the blade-tip path, round the far side of the disc (stage 1) and a second, wider
    // ring outside it (stage 2), all of it above the head line and clear of the snouts
    const arcs = T(stage, [], [[-1.3, -0.15, 1.5]], [[-1.3, -0.1, 1.5], [-0.95, 0.05, 2.9]]);
    for (const [a0, a1, gap] of arcs) for (const sd of [-1, 1]) {
      const rr = bl + gap, pts = [];
      for (let i = 0; i <= 10; i++) { const a = a0 + (a1 - a0) * i / 10, x = ux + sd * cos(a) * rr, y = uy + sin(a) * rr * sq; if (y >= 3.2 + Math.min(0, h)) pts.push([Math.max(1.4, Math.min(x, 30.6)), y]); }
      piece(g, t => stroke(t, pts, 0.34, 0.3, '#c4e2ff'));
    }
    // the body: purple on top, cream below
    const split = x => top + ry * 0.62 + 0.45 * sin((x - hx) * 1.2);
    const inBody = (x, y) => ((x - hx) / rx) ** 2 + ((y - hy) / ry) ** 2 < 1 || ((x - hx + 0.1) / (rx * 0.98)) ** 2 + ((y - hy - ry * 0.18) / (ry * 0.82)) ** 2 < 1;
    piece(g, t => {
      t.ell(hx, hy, rx, ry, Cr[1]); t.ell(hx - 0.1, hy + ry * 0.18, rx * 0.98, ry * 0.82, Cr[1]);
      recolor(t, Cr[1], M[1], (x, y) => y < split(x) && (x - hx) ** 2 / (rx * rx) + (y - hy) ** 2 / (ry * ry) < 1.1);
      shadeShape(t, M, rx * 0.13, ry * 0.15); shadeShape(t, Cr, rx * 0.13, ry * 0.15);
      shine(t, hx - rx * 0.45, hy - ry * 0.55, rx * 0.2, ry * 0.12, M[0]);
    });
    // the four snouts at a true 45 degrees, each its own piece over the body so it keeps a clean edge: a chunky tube poking 3.2 px
    // clear of the outline, lighter lilac up top and cream below (matching the half it grows from), a pale lip and one round hole;
    // the lower pair sits 1.5 px higher up the sides (still at 45 degrees), so their muzzles stay clear of the base leaves
    const th = r * 0.21, TL = [lt(M[0], 0.35), lt(M[1], 0.34), lt(M[2], 0.12)];
    for (const a of [-PI / 4, -3 * PI / 4, PI / 4, 3 * PI / 4]) {
      const up = a > 0 ? 1.5 : 0, pa = a - (cos(a) > 0 ? 1 : -1) * PI / 2, ox = hx + cos(pa) * up, oy = hy + sin(pa) * up;
      let d = 0; while (inBody(ox + cos(a) * d, oy + sin(a) * d)) d += 0.1;
      const X = a < 0 ? TL : Cr, b = d - 0.7, len = 3.9, x = ox + cos(a) * (b + len), y = oy + sin(a) * (b + len);
      piece(g, t => { tube(t, ox + cos(a) * b, oy + sin(a) * b, a, len, th, 1, X[1]); shadeShape(t, X, 0.35, 0.45); });
      muzzle(g, x, y, a, 0.85, th + 0.15, lt(X[1], 0.55), mixHex(X[2], HOLE, P.mouth === 'open' ? 0.55 : 0.75));
    }
    const ex = hx + 0.8, ey = hy + ry * 0.16;
    // (the blush sits right under the eyes, clear of the lower snouts)
    eyes(g, ex, ey, r, P, { bl: { sp: r * 0.86 } });
    A.chibiMouth(g, ex + 0.1, ey + r * 0.5, P.mouth || 'smile', 2.1);
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(top + 1.2), w: R(rx * 1.4) } };
  };

  // =====================================================================================================
  // Lava Guava -> Lava Guava Blast -> Volcano Guava
  // A round speckled green guava whose top has cracked open in a jagged zigzag, showing glowing orange-pink lava bulging inside,
  // little steam puffs rising and a guava leaf at the back; happy. The glow grows by stage: stage 1 a wider crack, a lava drip and
  // two puffs; stage 2 the widest crater, two drips, three puffs and a big warm glow.
  PAL.lavaguava = { main: ['#eef8cc', '#bfe090', '#9ac274'], leaf: LEAF, acc: ['#fff2c4', '#ff9c70', '#ee6e6c'], stem: '#62ac50', root: '#8a6a3a', part: 'flame' };
  ART.lavaguava = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, L = C.leaf, Lv = C.acc, f = P.frame ? 1 : 0;
    // (the stage-2 guava sits a touch lower, to leave room for its steam under row 2)
    const r = T(stage, 8, 8.8, 9.6), rx = r * 1.04, ry = r * 0.94, hx = 15.5, hy = T(stage, 26.3, 26.3, 27.0) - ry + h, top = hy - ry;
    const cx = hx - 0.3, cw = rx * T(stage, 0.56, 0.62, 0.68), cd = T(stage, 3.0, 3.4, 3.8), bulge = T(stage, 1.3, 1.7, 2.1);
    // the jagged crack across the top: a zigzag, deepest in the middle
    const nz = T(stage, 6, 6, 8), zig = [];
    for (let i = 0; i <= nz; i++) { const u = i / nz; zig.push([cx - cw + u * 2 * cw, top + 0.5 + cd * sin(PI * u) * (i % 2 ? 1 : 0.6)]); }
    const zy = x => { if (x <= zig[0][0] || x >= zig[nz][0]) return -99; for (let i = 1; i <= nz; i++) if (x <= zig[i][0]) { const [x0, y0] = zig[i - 1], [x1, y1] = zig[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return -99; };
    baseLeaves(g, P, L);
    // a guava leaf at the back
    piece(g, t => { pointLeaf(t, hx - rx * 0.45, top + 2.0, T(stage, 4.4, 4.8, 5.2), -PI + 0.5, 1.6, L[1]); shadeShape(t, L, 0.4, 0.5); });
    vein(g, hx - rx * 0.45, top + 2.0, T(stage, 4.4, 4.8, 5.2), -PI + 0.5, L[2]);
    // the lava bulging up in the crater (under the cracked skin), a bright core and bubbles
    piece(g, t => {
      t.ell(cx, top + cd * 0.55, cw * 0.98, cd * 0.55 + bulge, Lv[1], 0, fm((x, y) => y <= Math.max(zy(x + 0.25), top + 0.5) + 0.4));
      shadeShape(t, Lv, 0.3, 0.4);
      t.ell(cx - 0.4, top + cd * 0.3 - bulge * 0.3, cw * 0.62, (cd * 0.5 + bulge) * 0.5, lt(Lv[1], 0.45), 0, inside(t));
      t.ell(cx - 0.6, top + cd * 0.22 - bulge * 0.35, cw * 0.36, (cd * 0.5 + bulge) * 0.3, Lv[0], 0, inside(t));
      for (const [kx, ky, br] of T(stage, [[0.45, 0.1, 0.5]], [[0.5, 0.05, 0.55], [-0.55, 0.3, 0.45]], [[0.5, 0.0, 0.65], [-0.55, 0.25, 0.5], [0.05, -0.4, 0.45]])) {
        const x = cx + kx * cw, y = top + cd * 0.4 + ky * (cd + bulge) - (f ? 0.2 : 0);
        t.ell(x, y, br, br, Lv[0], 0, inside(t)); t.dot(x - br * 0.3, y - br * 0.3, WHITE);
      }
    });
    piece(g, t => { // the guava, its top cracked open
      const keep = fm((x, y) => y + 0.25 >= zy(x + 0.25));
      t.ell(hx, hy, rx, ry, M[1], 0, keep); t.ell(hx - 0.1, hy + ry * 0.18, rx * 0.98, ry * 0.82, M[1], 0, keep);
      shadeShape(t, M, rx * 0.14, ry * 0.15);
      shine(t, hx - rx * 0.62, hy - ry * 0.3, rx * 0.14, ry * 0.18, M[0], -0.25);
      // soft guava speckles
      for (const [kx, ky] of [[-0.7, 0.2], [-0.45, 0.62], [0.72, -0.05], [0.6, 0.66], [-0.15, 0.86], [-0.78, -0.25]]) t.ell(hx + kx * rx, hy + ky * ry, 0.42, 0.36, lt(M[1], 0.45), 0, inside(t));
    });
    // little cracks running down from the crater
    if (stage >= 1) for (const i of [1, nz - 1]) { const [x, y] = zig[i]; stroke(g, [[x, y + 0.3], [x + (i < 2 ? -0.4 : 0.4), y + 1.2], [x + (i < 2 ? -0.2 : 0.2), y + 1.9]], 0.22, 0.2, M[2]); }
    // lava drips over the rim
    for (const [i, dl] of T(stage, [], [[2, 2.0]], [[2, 2.2], [nz - 2, 1.8]])) {
      const [x] = zig[i], y = zy(x) - 0.2;
      piece(g, t => { stroke(t, [[x, y], [x + 0.1, y + dl]], 0.7, 0.55, Lv[1]); t.ell(x + 0.1, y + dl + 0.3, 0.85, 0.95, Lv[1]); shadeShape(t, Lv, 0.3, 0.35); });
      g.dot(x - 0.3, y + 0.6, Lv[0]);
    }
    // steam puffs drifting up: big enough to be soft round clouds (s 1.4+), off-centre at different heights (so two never pair up
    // into a bow), each kept 1 px clear above the lava and the skin under it and none above row 2; the stage-2 crater is so wide
    // that its steam rises off the rims (they drift up a little on frame 1)
    const lavaTop = x => { const u = (x - cx) / (cw * 0.98); return Math.abs(u) >= 1 ? 99 : top + cd * 0.55 - (cd * 0.55 + bulge) * Math.sqrt(1 - u * u); };
    const skinTop = x => { const u = (x - hx) / rx; return Math.abs(u) >= 1 ? 99 : hy - ry * Math.sqrt(1 - u * u); };
    for (const [dx, dy, s] of T(stage, [[-2.4, -3.6, 1.6]], [[-3.5, -3.8, 1.6], [5.6, -2.6, 1.4]], [[-5.4, -3.4, 1.5], [4.2, -3.4, 1.5], [8.6, -0.6, 1.4]])) {
      const x = cx + dx; let lim = 99; for (let xx = x - 1.1 * s; xx <= x + 1.1 * s; xx += 0.2) lim = Math.min(lim, lavaTop(xx), skinTop(xx));
      steamPiece(g, x, Math.max(2.5 + 1.1 * s + Math.min(0, h) * 0.67, Math.min(top - bulge * 0.5 + dy, lim - 2.0 - 0.86 * s) - (f ? 0.3 : 0)), s, PUFF);
    }
    glow(g, cx, top + 0.4, cw * 0.8 + T(stage, 1.0, 1.5, 2.0), '255,140,100', T(stage, 0.34, 0.44, 0.54), 0.75);
    const ex = hx + 0.8, ey = hy + ry * 0.16;
    eyes(g, ex, ey, r, P);
    A.chibiMouth(g, ex + 0.1, ey + r * 0.5, P.mouth || 'smile', 2.2);
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(top + 2.2), w: R(rx * 1.4) } };
  };

  // =====================================================================================================
  // Blooming Heart -> Double Heart -> Royal Heart
  // A pink flower whose face is a plump pale-pink heart, with deep pink heart-shaped petals round its sides (lobes outward, the
  // heart's top kept clear), little hearts floating round it. Stage 1: bigger petals and two heart buds on curly stems over its
  // head; stage 2: a big heart bloom (a deep pink heart with an even row of round petal scallops and a pink heart inside it,
  // behind the face), the buds open into hearts and three floating hearts.
  PAL.bloomingheart = { main: ['#ffe2ee', '#ff9cc0', '#e87aa2'], leaf: LEAF, acc: HEART, stem: '#62ac50', root: '#8a6a3a', part: 'heartbloom' };
  // a plump heart for a face: two round lobes and a soft rounded point (s = size; about 2.24 s wide, 1.94 s tall)
  function bigHeart(t, x, y, s, col) {
    t.ell(x - 0.5 * s, y - 0.28 * s, 0.62 * s, 0.6 * s, col); t.ell(x + 0.5 * s, y - 0.28 * s, 0.62 * s, 0.6 * s, col);
    t.poly([[x - 1.1 * s, y - 0.12 * s], [x + 1.1 * s, y - 0.12 * s], [x + 0.32 * s, y + 0.86 * s], [x - 0.32 * s, y + 0.86 * s]], col);
    t.ell(x, y + 0.8 * s, 0.42 * s, 0.26 * s, col);
  }
  // a heart-shaped petal from the hub (cx, cy) along angle a: two round lobes at the far end and a point at the hub
  function heartPetal(t, cx, cy, a, len, w, col) {
    const c = cos(a), s = sin(a), px = -s, py = c, m = len - w * 0.62;
    for (const k of [1, -1]) t.ell(cx + c * m + px * w * 0.56 * k, cy + s * m + py * w * 0.56 * k, w * 0.62, w * 0.6, col, a);
    t.poly([[cx + c * len * 0.1, cy + s * len * 0.1], [cx + c * (m + 0.2) + px * w * 1.12, cy + s * (m + 0.2) + py * w * 1.12], [cx + c * (m + 0.2) - px * w * 1.12, cy + s * (m + 0.2) - py * w * 1.12]], col);
  }
  // a heart-shaped petal of size s centred at (x, y), its lobes out along angle a and its point in toward the middle
  function heartOut(t, x, y, a, s, col) {
    const c = cos(a), sn = sin(a), p = (lx, ly) => [x + c * ly - sn * lx, y + sn * ly + c * lx];
    for (const k of [-1, 1]) { const [cx, cy] = p(k * 0.62 * s, 0.32 * s); t.ell(cx, cy, 0.72 * s, 0.7 * s, col); }
    t.poly([p(-1.3 * s, 0.1 * s), p(1.3 * s, 0.1 * s), p(0, -1.2 * s)], col);
  }
  ART.bloomingheart = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, L = C.leaf, f = P.frame ? 1 : 0;
    const r = T(stage, 7.0, 7.6, 8.2), s = r / 1.12, hx = 15.6, hy = 26.2 - 1.06 * s + h;
    const FC = [lt(M[0], 0.5), lt(M[1], 0.62), lt(M[2], 0.3)], MB = mix(M, '#d0507e', 0.32);
    // stage 2: the big heart bloom, a deep pink heart with an even row of round petal scallops along its whole upper curve and a
    // pink heart inside it, behind the face (its point tucked behind the leaves); the classic heart curve x = 16 sin^3 t,
    // y = -(13 cos t - 5 cos 2t - 2 cos 3t - cos 4t)
    let bloomTop = 99;
    if (stage === 2) {
      const k = 0.72 + (P.walk && f ? 0.02 : 0), y0 = hy - 1.5 + 11.9 * (0.72 - k);
      const at = (u, q) => [hx + q * 16 * sin(u) ** 3, y0 + q * -(13 * cos(u) - 5 * cos(2 * u) - 2 * cos(3 * u) - cos(4 * u))];
      const curve = q => { const pts = []; for (let i = 0; i < 96; i++) pts.push(at(i * 2 * PI / 96, q)); return pts; };
      // (4 scallops each side, evenly spaced by arc length from the notch to the widest point, so the notch stays a notch)
      const arc = [[0, 0]]; for (let i = 1; i <= 120; i++) { const u = i / 120 * PI / 2, [x0, y0b] = at(u - PI / 240, k), [x1, y1] = at(u, k); arc.push([u, arc[i - 1][1] + Math.hypot(x1 - x0, y1 - y0b)]); }
      const len = arc[120][1], bumps = [];
      for (let j = 0; j < 4; j++) { const want = (j + 0.5) / 4 * len, u = arc.find(q => q[1] >= want)[0]; for (const sd of [-1, 1]) bumps.push(at(sd * u, k)); }
      piece(g, t => {
        t.poly(curve(k * 0.95), MB[1]);
        for (const [x, y] of bumps) t.ell(x, y, 1.6, 1.6, MB[1]);
        shadeShape(t, MB, 0.6, 0.7);
      });
      piece(g, t => { t.poly(curve(k * 0.8).map(([x, y]) => [x, y + 0.8]), M[1]); shadeShape(t, M, 0.5, 0.6); t.ell(hx - 6.0, y0 - 5.4, 1.4, 0.7, M[0], -0.6, inside(t)); });
      bloomTop = Math.min(...bumps.map(q => q[1])) - 1.6;
    }
    baseLeaves(g, P, L);
    // the heart petals (stages 0-1), deeper pink so the pale heart face pops: small hearts round its sides, lobes outward, each its
    // own piece with its point just tucked behind the face, so the face's two top lobes and the notch stay clear against the sky
    // (none over the top, none within 50 degrees of straight down, where the leaves are)
    if (stage < 2) {
      const fg = new PX.Grid(g.w, g.h, g.k); bigHeart(fg, hx, hy, s, FC[1]);
      const ps = T(stage, 1.8, 2.05, 0), sw = P.walk && f ? 0.06 : 0;
      for (const a0 of T(stage, [-0.78, -0.13, 0.5], [-0.8, -0.14, 0.52], [])) for (const sd of [-1, 1]) {
        const a = sd > 0 ? a0 + sw : PI - a0 - sw;
        let d = 0; while (fg.filled(hx + cos(a) * d, hy + sin(a) * d) && d < 16) d += 0.1;
        const D = d + ps * 1.2 - 0.9;
        piece(g, t => { heartOut(t, hx + cos(a) * D, hy + sin(a) * D, a, ps, MB[1]); shadeShape(t, MB, 0.4, 0.5); t.ell(hx + cos(a) * (D + ps * 0.3) - 0.3, hy + sin(a) * (D + ps * 0.3) - 0.5, 0.45, 0.3, MB[0], -0.5, inside(t)); });
      }
    }
    // two heart buds on visible curly stems over its head (stage 1); at stage 2 they've opened into big hearts
    if (stage >= 1) for (const sd of [-1, 1]) {
      const bx = hx + sd * 2.7 + 0.3, by = hy - 0.88 * s - T(stage, 0, 3.4, 2.8) + (f ? sd * 0.3 : 0);
      piece(g, t => stroke(t, [[hx + sd * 0.9, hy - 0.6 * s], [hx + sd * 1.9, hy - 0.86 * s - 0.6], [bx, by + 1.6]], 0.38, 0.32, C.stem));
      if (stage === 1) { piece(g, t => { t.ell(bx - sd * 0.2, by + 1.45, 1.2, 0.55, L[1], sd * 0.3); shadeShape(t, L, 0.2, 0.3); }); heartPiece(g, bx, by, 1.35, C.acc); }
      else heartPiece(g, bx, by - 0.4, 1.3, C.acc);
    }
    piece(g, t => { // the heart face
      bigHeart(t, hx, hy, s, FC[1]);
      shadeShape(t, FC, 0.6, 0.7);
      t.ell(hx - 0.55 * s, hy - 0.45 * s, 0.22 * s, 0.13 * s, FC[0], -0.55, inside(t));
    });
    // little hearts floating round it
    // (above the side petals; at stage 2 the upper one floats over the bloom's right shoulder and the sparkle over its left one,
    // both well clear of it)
    const hearts = T(stage, [[hx + 9.8, hy - s * 1.45, 1.0]], [[hx + 10.8, hy - s * 1.55, 1.05], [hx - 10.8, hy - s * 1.25, 0.9]],
      [[hx + 9.9, Math.min(hy - s * 1.75, bloomTop - 2.6), 1.1], [hx - s * 1.5 - 1.4, hy + s * 0.5, 0.9], [hx + s * 1.5 + 1.2, hy + s * 0.55, 0.85]]);
    hearts.forEach(([x, y, k], i) => heartPiece(g, Math.max(1.4 + 1.3 * k, Math.min(x, 30.4 - 1.3 * k)), Math.max(2.6 + k, y + ((i + f) % 2 ? -0.5 : 0)), k, C.acc));
    if (stage === 2) sparkle(g, hx - 9.6, Math.max(3.6, bloomTop - 2.8) + (f ? -0.4 : 0), 0.7, '#ffffff');
    const ex = hx + 0.6, ey = hy + s * 0.12;
    eyes(g, ex, ey, r, P, { bl: { col: '#ff86a8' } });
    A.chibiMouth(g, ex + 0.1, ey + r * 0.48, P.mouth || 'smile', 2.1);
    return { hx: R(hx), hy: R(hy), hr: R(r), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - 0.88 * s + 1.4), w: R(r * 1.5) } };
  };

  // =====================================================================================================
  // Hot Date -> Hotter Date -> Hottest Date
  // A glossy brown date fruit (a plump oval, a little taller than wide, with a long shine and a few soft wrinkles), a tiny tan cap
  // on top with a curling flame on it, and a charming friendly WINK: the back eye open with lashes, the front one shut in a happy
  // arc with a twinkle beside it, and a sweet smile. The flame is big and grows by stage; stage 1 adds a flick up its back, stage 2
  // two side flames and embers.
  PAL.hotdate = { main: ['#f2cdb6', '#c6825f', '#a2624a'], leaf: LEAF, acc: FIRE, stem: '#62ac50', root: '#8a6a3a', part: 'flame' };
  ART.hotdate = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, L = C.leaf, F = C.acc, f = P.frame ? 1 : 0;
    // (the date sits a touch low and the stage-2 date is a little trimmed, so its big flame stays at or below row 2)
    const r = T(stage, 7.6, 8.3, 8.4), rx = r * 0.92, ry = r * 1.08, hx = 15.5, hy = 27.3 - ry + h, top = hy - ry;
    baseLeaves(g, P, L);
    piece(g, t => { // the glossy date
      t.ell(hx, hy, rx, ry, M[1], -0.06); t.ell(hx - 0.1, hy + ry * 0.2, rx * 0.97, ry * 0.8, M[1], -0.06);
      shadeShape(t, M, rx * 0.14, ry * 0.14);
      // a long glossy shine down its upper back, and a small one
      t.ell(hx - rx * 0.55, hy - ry * 0.28, rx * 0.15, ry * 0.32, M[0], 0.32, inside(t));
      t.ell(hx - rx * 0.3, hy - ry * 0.7, 0.5, 0.42, M[0], 0, inside(t));
    });
    // the flame on the cap is the signature, so it is BIG and sits in front, its round foot resting on the cap so the yellow core
    // and the rolled tip curl always show; it steps up every stage (a flick up its back from stage 1, two side flames on the
    // shoulders at stage 2)
    const fh = T(stage, 5.8, 7.0, 7.2), fw = T(stage, 2.0, 2.6, 3.0);
    if (stage === 2) for (const sd of [-1, 1]) piece(g, t => flame(t, hx - 0.3 + sd * 2.8, top + 1.2, 3.6, 1.35, f ? 0 : 1, sd * 0.3, F));
    piece(g, t => flame(t, hx - 0.3, top + 1.25, fh, fw, f, 0.22, F));
    // a few soft wrinkles on its sides
    for (const [kx, ky, sd] of [[-0.84, 0.3, -1], [-0.7, 0.66, -1], [0.82, 0.5, 1]]) { const x = hx + kx * rx, y = hy + ky * ry; stroke(g, [[x, y - 0.6], [x + sd * 0.35, y], [x, y + 0.6]], 0.2, 0.2, M[2]); }
    piece(g, t => { // the little tan cap the flame sits on
      for (const a of [PI - 0.3, -0.3, PI / 2 + 0.7, PI / 2 - 0.7]) t.ell(hx - 0.3 + cos(a) * 1.1, top + 0.9 + sin(a) * 0.6, 1.2, 0.7, '#f0d49a', a);
      shadeShape(t, ['#fff0c8', '#f0d49a', '#cfae72'], 0.3, 0.4);
    });
    // embers (stage 2)
    if (stage === 2) for (const [x, y] of f ? [[hx + 3.6, top - 2.2], [hx - 4.4, top - 0.6]] : [[hx + 4.2, top - 0.8], [hx - 3.6, top - 2.6]]) piece(g, t => t.ell(x, y, 0.55, 0.55, F[1]));
    const ex = hx + 0.8, ey = hy + ry * 0.14, sp = r * 0.86, ew = r * 0.48, eh = r * 0.64;
    if (P.eyes) eyes(g, ex, ey, r, P);
    else { // the charming wink: the back eye open with lashes, the front one closed in a happy arc, a twinkle beside it
      A.chibiEyes(g, ex - sp, ey, { one: true, sp, w: ew, h: eh });
      A.chibiEyes(g, ex, ey, { one: true, sp, w: ew, h: eh, mood: 'happy' });
      lash(g, ex - sp / 2, ey, r, -1);
      A.blush(g, ex - 0.2, ey + r * 0.42, { sp: r });
      sparkle(g, Math.min(hx + rx + 1.5, 29.6), ey - eh * 0.75 - (f ? 0.3 : 0), 0.7, '#fff6a0');
    }
    A.chibiMouth(g, ex + 0.1, ey + r * 0.5, P.mouth || 'smile', 2.3);
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(top + 1.6), w: R(rx * 1.4) } };
  };

  // =====================================================================================================
  // Pea-nut -> Pea-nut Shooter -> Pea-nut Fortress
  // A sturdy tan peanut shell, Wall-nut sized: a big lower lobe with the face, a slightly smaller upper one and a soft waist, a net
  // of shallow shell dimples, big white Wall-nut eyes and a tiny smile; out of a hatch in the top of its shell pokes a round little
  // green pea with a snout. Stage 1: a bigger pea with a leaf tuft; stage 2: the top lobe wears a helmet-like shell crest (a
  // darker shell dome with a brim and a ridged crest fin) the pea peeks out of.
  PAL.peanut = { main: ['#faeacc', '#e6c896', '#c8a470'], leaf: LEAF, acc: ['#dcf6b4', '#a2d876', '#7cba5a'], stem: '#62ac50', root: '#8a6a3a', part: 'shell' };
  ART.peanut = function (g, stage, P, C) {
    const hop = P.walk && P.frame ? -1 : P.arms === 'up' ? -0.6 : 0, sq = P.walk && !P.frame ? 0.35 : 0;
    const M = C.main, Pe = C.acc, L = C.leaf;
    const rx = T(stage, 9.0, 9.4, 9.8) + sq, H = T(stage, 19.0, 20.6, 22.0) - sq, hx = 15.5, bot = 30.4 + hop, top = bot - H;
    // two lobes: a big lower one with the face, a slightly smaller upper one, and a soft waist between them
    const rl = H * 0.31, ru = H * 0.28, ly = bot - rl, uy = top + ru, ux = hx - 0.4, urx = rx * 0.95, wy = (ly - rl * 0.7 + uy + ru * 0.66) / 2;
    // little leaves peeking out from under the shell
    baseLeaves(g, P, L, { sp: 8.6, len: 3.4, y: 29.2 });
    const px = ux + 1.0, pr = T(stage, 2.6, 2.9, 3.1), hole = top + 1.0, py = hole - pr * 0.62;
    // the pea's leaf tuft (stage 1+), behind everything
    if (stage >= 1) piece(g, t => { pointLeaf(t, px - pr * 0.5, py - pr * 0.3, T(stage, 0, 3.4, 3.8), -PI + 0.6, 1.2, L[1]); shadeShape(t, L, 0.3, 0.4); });
    piece(g, t => {
      t.ell(hx, ly, rx, rl, M[1]); t.ell(ux, uy, urx, ru, M[1]); t.ell(hx - 0.25, wy, rx * 0.76, 2.4, M[1]);
      shadeShape(t, M, rx * 0.14, rl * 0.16);
      shine(t, ux - urx * 0.45, uy - ru * 0.42, urx * 0.2, ru * 0.15, M[0]);
      shine(t, hx - rx * 0.6, ly - rl * 0.2, rx * 0.1, rl * 0.18, M[0], 0);
    });
    // the shell's net of shallow dimples in staggered rows (clear of the face) and a crease at the waist
    const ex = hx + 1.1, ey = ly - rl * 0.24, ew = T(stage, 4.3, 4.5, 4.7), eh = T(stage, 4.9, 5.1, 5.3), sp = T(stage, 6.3, 6.5, 6.8);
    const face = (x, y) => x > ex - sp / 2 - ew / 2 - 1.0 && x < ex + sp / 2 + ew / 2 + 1.0 && y > ey - eh / 2 - 1.2 && y < ey + eh / 2 + 2.4;
    const NET = mixHex(M[1], M[2], 0.85);
    for (const [cy, rr, cxx, wx] of [[uy, ru, ux, urx], [ly, rl, hx, rx]]) for (const [v, off] of [[-0.62, 0], [-0.28, 1.2], [0.06, 0], [0.4, 1.2], [0.72, 0]]) {
      const y = cy + v * rr;
      for (let x = cxx - wx + 1.4 + off; x < cxx + wx - 1.0; x += 2.4) {
        if (face(x, y) || g.get(x - 0.6, y) !== M[1] || g.get(x + 0.6, y) !== M[1] || g.get(x, y + 0.7) !== M[1]) continue;
        // a little cell of the shell's net: a soft dent with a darker lower rim
        g.ell(x, y, 0.7, 0.45, mixHex(M[1], M[2], 0.35), 0, fm((xx, yy) => g.get(xx, yy) === M[1]));
        stroke(g, [[x - 0.6, y + 0.15], [x, y + 0.45], [x + 0.6, y + 0.15]], 0.17, 0.17, NET);
      }
    }
    for (const sd of [-1, 1]) { const x = edgeX(g, wy, hx, sd); stroke(g, [[x - sd * 0.3, wy - 0.5], [x - sd * 1.3, wy], [x - sd * 0.3, wy + 0.5]], 0.2, 0.2, M[2]); }
    // stage 2: a helmet-like shell crest over the top lobe: a darker shell dome with a brim and a ridged crest fin behind the pea
    if (stage === 2) {
      const HM = mix(M, '#9a6a44', 0.34), cb = uy + ru * 0.18;
      piece(g, t => {
        t.ell(ux - 2.6, top + 0.3, 3.2, 2.2, HM[1], 0, fm((x, y) => y <= top + 1.6));
        t.ell(ux, uy, urx + 0.45, ru + 0.45, HM[1], 0, fm((x, y) => y <= cb));
        shadeShape(t, HM, 0.5, 0.6);
        shine(t, ux - urx * 0.42, uy - ru * 0.5, urx * 0.2, 0.55, HM[0]);
      });
      piece(g, t => { t.ell(ux, cb, urx + 1.1, 0.95, HM[1]); shadeShape(t, HM, 0.4, 0.5); });
      for (const dx of [-4.0, -2.6, -1.2]) stroke(g, [[ux + dx, top - 1.3], [ux + dx + 0.4, top + 0.6]], 0.2, 0.2, HM[2]);
    }
    // the hatch in the top of the shell and the round little pea peeking out of it, its snout pointing forward
    piece(g, t => t.ell(px, hole, pr + 0.6, 0.95, mixHex(M[2], HOLE, 0.45)));
    const th = pr * 0.44, x0 = px + pr * 0.45, x1 = px + pr + 2.0;
    piece(g, t => {
      t.poly([[x0, py - th], [x1, py - th * 1.18], [x1, py + th * 1.18], [x0, py + th]], Pe[1]);
      t.ell(px, py, pr, pr * 0.96, Pe[1], 0, fm((x, y) => y <= hole + 0.15));
      shadeShape(t, Pe, 0.3, 0.4);
      shine(t, px - pr * 0.4, py - pr * 0.45, pr * 0.3, pr * 0.2, Pe[0]);
    });
    opening(g, x1 - 0.05, py, 0, th * 1.18 + 0.15, Pe, P.mouth === 'open', 1.25);
    // big white Wall-nut eyes on the lower lobe, a tiny smile
    A.chibiEyes(g, ex, ey, { white: true, sp, w: ew, h: eh, look: [0.5, 0.15], mood: P.eyes });
    A.blush(g, ex, ey + eh * 0.66, { sp: sp + 2.6 });
    A.chibiMouth(g, ex + 0.1, ey + eh * 0.74, P.mouth === 'open' ? 'smile' : P.mouth || 'smile', 2.0);
    return { hx: R(hx), hy: R(uy), hr: R(rx), top: topOf(g), ey: R(ey), front: R(x1 + 1), hat: { x: R(ux), y: R(top + 1.4), w: R(urx * 1.5) } };
  };

  // =====================================================================================================
  // Sap-fling -> Sap-flinger -> Mega Sap-fling
  // A cute pinecone head (an egg tapering to a pointier top, its outline scalloped by round scale tips, big overlapping brown
  // scales from its crown down both sides to eye level round a smooth face, a tuft of pine needles) with a drip of golden amber
  // sap running down its crown, and a twig flinger at the back holding a glossy sap ball in a pinecone-scale cup. More sap by
  // stage: two drips and a bigger ball at stage 1; a sap puddle on top, two fat drips and the biggest, dripping ball at stage 2.
  PAL.sapfling = { main: ['#f4dcc0', '#cc9c72', '#a87a56'], leaf: LEAF, acc: ['#fff6c8', '#ffc852', '#e89a3a'], stem: '#62ac50', root: '#8a6a3a', part: 'sapcone' };
  const TWIG = ['#e4c49e', '#a8825c', '#86623e'];
  // a drip of amber sap from (x, y): a little blob on the rim, a thin neck running down dl, and a fat round drop at the end
  function sapDrip(g, x, y, dl, S) {
    piece(g, t => {
      t.ell(x, y, 1.45, 0.95, S[1]); stroke(t, [[x, y], [x + 0.05, y + dl]], 0.62, 0.5, S[1]); t.ell(x + 0.05, y + dl + 0.5, 1.1, 1.25, S[1]);
      shadeShape(t, S, 0.3, 0.35);
    });
    g.dot(x - 0.3, y + dl + 0.15, WHITE); g.dot(x - 0.45, y - 0.25, S[0]);
  }
  ART.sapfling = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, L = C.leaf, S = C.acc, f = P.frame ? 1 : 0;
    const r = T(stage, 8, 9, 10), rx = r * 0.98, ry = r * 1.0, hx = T(stage, 18.0, 18.5, 19.1), hy = 26.3 - ry + h, top = hy - ry;
    const cupX = hx - rx - T(stage, 2.4, 2.7, 2.8), cupY = hy - ry * 0.5 - (P.arms === 'up' ? 0.8 : 0), cw = T(stage, 3.0, 3.3, 3.4);
    baseLeaves(g, P, L, { cx: hx - 0.8 });
    // the twig flinger with a sap ball in its scale cup
    const br = T(stage, 1.9, 2.3, 2.6);
    pultArm(g, TWIG, M, [[hx - rx * 0.4, hy + ry * 0.4], [hx - rx - 0.3, hy - ry * 0.05], [cupX + 0.8, cupY + 1.0]], cupX, cupY, cw, () => {
      const bx = cupX + 0.2, by = cupY - br * 0.62 - (P.walk && f ? 0.4 : 0);
      piece(g, t => { A.softBody(t, bx, by, br, br * 0.95, S, { shade: 0.2 }); });
      g.ell(bx - br * 0.38, by - br * 0.42, br * 0.26, br * 0.18, WHITE, -0.5);
    });
    if (stage === 2) sapDrip(g, cupX + 1.4, cupY + 0.9, 1.4, S);
    // a little needle leaf on the twig
    piece(g, t => pointLeaf(t, hx - rx - 0.2, hy - ry * 0.02, 2.6, -2.0, 0.6, L[1]));
    // the pine-needle tuft on top
    const nd = T(stage, [-2.15, -1.57, -1.0], [-2.3, -1.85, -1.3, -0.85], [-2.45, -2.0, -1.57, -1.15, -0.7]);
    piece(g, t => { for (const a of nd) stroke(t, [[hx - 0.3, top + 1.4], [hx - 0.3 + cos(a) * T(stage, 3.2, 3.5, 3.8), top + 1.4 + sin(a) * T(stage, 3.2, 3.5, 3.8)]], 0.5, 0.3, L[1]); shadeShape(t, L, 0.25, 0.3); });
    // the pinecone: an egg tapering to a narrower, pointier top. edge[] keeps its distance from (hx, hy) along each angle, and
    // rowOf(j, yMax, dr0, gap) walks scale row j (dr0 + 1.8 j px in from that edge) out from the crown down each side, a scale
    // every gap px (odd rows staggered by half a step), to yMax
    const A0 = -PI - 0.3, edge = [], step = 3.0, at = (a, dr) => { const d = edge[Math.max(0, Math.min(edge.length - 1, R((a - A0) / 0.02)))] - dr; return [hx + cos(a) * d, hy + sin(a) * d]; };
    const rowOf = (j, yMax, dr0, gap) => {
      const out = [], dr = dr0 + j * 1.8;
      for (const sd of [-1, 1]) {
        let acc = j % 2 ? gap / 2 : sd < 0 ? gap : 0, [px, py] = at(-PI / 2, dr);
        for (let a = -PI / 2; Math.abs(a + PI / 2) < PI / 2 + 0.3; a += sd * 0.02) {
          const [x, y] = at(a, dr);
          acc += Math.hypot(x - px, y - py); px = x; py = y;
          if (y > yMax) break;
          if (acc >= gap) { acc -= gap; out.push([a, x, y]); }
        }
      }
      return out;
    };
    const ex = hx + 0.8, ey = hy + ry * 0.2, sp = r * 0.86, ew = r * 0.48, eh = r * 0.64;
    let cone = null, outer = [];
    piece(g, t => {
      cone = t;
      t.ell(hx, hy + ry * 0.08, rx, ry * 0.92, M[1]); t.ell(hx - 0.15, hy - ry * 0.42, rx * 0.62, ry * 0.58, M[1]); t.ell(hx - 0.15, top + 1.8, rx * 0.3, 2.0, M[1]);
      for (let a = A0; a <= 0.3; a += 0.02) { let d = 0; while (t.filled(hx + cos(a) * d, hy + sin(a) * d) && d < 16) d += 0.1; edge.push(d); }
      // the outline scallops: a round nub (r 1.6) poking 1 px out under each outer-row scale, on down the sides (the chin stays smooth)
      outer = rowOf(0, hy + ry * 0.45, 0.45, 3.0);
      for (const [a, x, y] of outer) if (Math.abs(a + PI / 2) > 0.4) t.ell(x, y, 1.6, 1.6, M[1]);
      shadeShape(t, M, rx * 0.13, ry * 0.14);
      shine(t, hx - rx * 0.45, hy - ry * 0.4, rx * 0.17, ry * 0.12, M[0]);
    });
    // big bold overlapping scales, each its own piece (a lighter tan top and a darker brown lower crescent), in 2 (then 3) staggered
    // rows from the crown down both sides to eye level, the lower rows first so the upper ones overlap them like shingles; the face
    // patch stays smooth (a scale's box may not reach the eyes or anything under them, plus half a pixel)
    const nearFace = (x, y) => x + 1.5 > ex - sp / 2 - ew / 2 - 0.5 && x - 1.5 < ex + sp / 2 + ew / 2 + 0.5 && y + 1.2 > ey - eh / 2 - 0.6;
    const SC = [lt(M[1], 0.5), mixHex(M[1], M[0], 0.62), mixHex(M[2], '#5e3e26', 0.5)];
    // (the outer row sits right on the scallops, a touch bigger, so its scales make the bumpy outline; it leaves the very tip bare
    // for the needle tuft)
    for (let j = T(stage, 2, 3, 3) - 1; j >= 0; j--) for (const [a, x, y] of j ? rowOf(j, ey, 0.45, step) : outer) {
      if (y > ey || nearFace(x, y) || (!j && Math.abs(a + PI / 2) < 0.3) || (j && (!cone.filled(x - 1.2, y) || !cone.filled(x + 1.2, y) || !cone.filled(x, y + 1.0)))) continue;
      const w = j ? 1.35 : 1.5, hh = j ? 1.05 : 1.15;
      piece(g, t => { t.ell(x, y, w, hh, SC[1]); shadeShape(t, SC, 0.3, 0.75); });
    }
    // sap: drips running down the crown (and a little puddle on top at stage 2)
    if (stage === 2) piece(g, t => { t.ell(hx - 0.1, top + 2.2, 2.6, 1.0, S[1]); shadeShape(t, S, 0.3, 0.3); t.ell(hx - 1.0, top + 1.9, 0.7, 0.3, S[0], 0, inside(t)); });
    for (const [kx, y0, dl] of T(stage, [[0.4, 2.0, 1.6]], [[0.42, 2.0, 1.8], [-0.46, 2.8, 1.2]], [[0.48, 2.4, 1.9], [-0.52, 3.0, 1.4]]))
      sapDrip(g, hx + kx * rx, top + y0, dl, S);
    eyes(g, ex, ey, r, P);
    A.chibiMouth(g, ex + 0.1, ey + r * 0.48, P.mouth || 'smile', 2.2);
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(top + 1.8), w: R(rx * 1.3) } };
  };

  // =====================================================================================================
  // Escape Root -> Quick Root -> Great Root
  // A pale cream parsnip root peeking happily out of a little dirt mound: round shoulders with soft brown growth rings, a leafy
  // top of pointed parsnip leaves (3, 4, then 5). Dust puffs by stage: two little puffs at the mound's ends at stage 1, four
  // bigger ones and a few pebbles at stage 2.
  PAL.escaperoot = { main: ['#fffaf0', '#f4e4c4', '#d6be98'], leaf: LEAF, acc: ['#ecd0a8', '#c49a72', '#a07a56'], stem: '#62ac50', root: '#8a6a3a', part: 'leafcrown' };
  const DUST = ['#fdf6ea', '#efe0c6', '#d8c2a0'];
  ART.escaperoot = function (g, stage, P, C) {
    const hop = P.walk && P.frame ? -1.2 : P.arms === 'up' ? -0.8 : 0, M = C.main, L = C.leaf, D = C.acc, f = P.frame ? 1 : 0;
    // (the root stands 2.3 px proud of the mound so its eyes, blush and smile all clear the dirt by a pixel; its tapering tail runs
    // on down into the mound)
    const rx = T(stage, 7.4, 8.3, 9.1), ry = T(stage, 7.6, 8.4, 9.2), cx = 16, cy = 27.0 - ry + hop, top = cy - ry;
    const mrx = T(stage, 11.6, 12.8, 13.8), mtop = T(stage, 26.6, 26.2, 25.8);
    // the leafy top: pointed parsnip leaves fanned up from a little crown
    const lv = T(stage, [-2.2, -1.57, -0.94], [-2.4, -1.85, -1.3, -0.75], [-2.55, -2.05, -1.57, -1.1, -0.6]), ll = T(stage, 5.8, 6.4, 6.9);
    lv.forEach((a0, i) => piece(g, t => {
      const a = a0 + (P.walk && f ? 0.08 : 0), len = ll - (Math.abs(a0 + PI / 2) > 0.8 ? 0.8 : 0), Lc = i % 2 ? mix(L, '#3e8a48', 0.12) : L;
      pointLeaf(t, cx - 0.2, top + 1.6, len, a, T(stage, 2.0, 2.1, 2.2), Lc[1]); shadeShape(t, Lc, 0.4, 0.5);
    }));
    lv.forEach(a => vein(g, cx - 0.2, top + 1.6, ll - (Math.abs(a + PI / 2) > 0.8 ? 0.8 : 0), a + (P.walk && f ? 0.08 : 0), L[2]));
    // grass leaves at the mound's ends (stage 1+)
    if (stage >= 1) for (const [x, a] of [[cx - mrx + 3.4, PI + 0.75], [cx + mrx - 3, -0.75]]) piece(g, t => t.ell(x + cos(a) * 1.8, mtop + 2.1 + sin(a) * 1.8, 2.4, 1.15, flat(L), a));
    piece(g, t => { // the parsnip's round shoulders and its tail going down into the dirt
      t.ell(cx, cy, rx, ry, M[1]); t.ell(cx - 0.2, cy - ry * 0.2, rx * 1.03, ry * 0.72, M[1]); t.ell(cx - 0.1, cy + ry * 0.75, rx * 0.86, ry * 0.55, M[1]);
      shadeShape(t, M, rx * 0.14, ry * 0.15);
      shine(t, cx - rx * 0.48, cy - ry * 0.5, rx * 0.2, ry * 0.12, M[0]);
    });
    // soft brown growth rings: one right across the top, short curves at the sides lower down
    const RG = mixHex(M[2], '#a07a56', 0.35);
    { const pts = []; for (let x = cx - rx * 0.62; x <= cx + rx * 0.62; x += 0.4) pts.push([x, cy - ry * 0.56 + 0.5 * (1 - ((x - cx) / (rx * 0.62)) ** 2)]); stroke(g, pts, 0.2, 0.2, RG); }
    for (const [side, k, len] of [[-1, 0.0, 2.2], [-1, 0.45, 1.8], [1, 0.62, 1.8], [1, -0.08, 1.6]]) {
      const y = cy + k * ry, x = edgeX(g, y, cx, side);
      stroke(g, [[x - side * 0.25, y - 0.2], [x - side * len * 0.5, y + 0.25], [x - side * len, y + 0.35]], 0.2, 0.2, RG);
    }
    // the dirt mound in front, with a few lighter clods (and pebbles at stage 2)
    piece(g, t => {
      t.ell(16, 31.4, mrx, 31.4 - mtop, D[1], 0, fm((x, y) => y <= 30.8)); t.ell(12.6, 31.4, mrx * 0.62, 31.4 - mtop + 0.7, D[1], 0, fm((x, y) => y <= 30.8));
      shadeShape(t, D, 1.0, 1.0);
      for (const [x, y] of [[16 - mrx + 4, mtop + 2.6], [16 + 3.2, mtop + 3.2], [16 + mrx - 4.4, mtop + 2.4]]) t.ell(x, y, 0.75, 0.5, D[0], 0, inside(t));
    });
    if (stage === 2) for (const [x, y, s] of [[16 - 5.6, 29.6, 0.8], [16 + 6.4, 29.0, 0.7]]) piece(g, t => { t.ell(x, y, s * 1.2, s, '#d8d0c8'); t.dot(x - 0.3, y - 0.3, WHITE); });
    // dust puffs at the mound's ends (they billow out on frame 1)
    for (const [sd, dy, s] of T(stage, [], [[-1, 0, 1.0], [1, 0.3, 0.9]], [[-1, 0, 1.2], [1, 0.2, 1.1], [-1, -2.4, 0.8], [1, -2.2, 0.75]])) {
      const x = 16 + sd * (mrx - 1.6 - (dy ? 1.4 : 0) + (f ? 0.4 : 0)), y = mtop + 0.6 + dy;
      puffPiece(g, Math.max(2.2 + 1.75 * s, Math.min(x, 29.8 - 1.75 * s)), y, s, DUST);
    }
    const ex = cx + 1, ey = cy + ry * 0.12, r = (rx + ry) / 2;
    eyes(g, ex, ey, r * 0.98, P);
    A.chibiMouth(g, ex + 0.1, ey + r * 0.46, P.mouth || 'smile', 2.2);
    return { hx: R(cx), hy: R(cy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(cx), y: R(top + 1.6), w: R(rx * 1.4) } };
  };

  // =====================================================================================================
  // Tile Turnip -> Power Turnip -> Mega Turnip
  // A white turnip blushing magenta-purple over its top, a little root tip underneath and a leafy crown of long turnip leaves (3,
  // 4, then 5) on purple stalks, standing on a glowing golden power tile (a small square tile seen from a little above, an inset
  // border and a soft glow). The tile glows brighter by stage; stage 2 adds light rays and sparkles.
  PAL.tileturnip = { main: ['#f8dcf2', '#da94d4', '#ba74b8'], leaf: LEAF, acc: ['#ffffff', '#f6f2fa', '#d8d0e6'], stem: '#62ac50', root: '#8a6a3a', part: 'leafcrown' };
  ART.tileturnip = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, W = C.acc, L = C.leaf, f = P.frame ? 1 : 0;
    const r = T(stage, 7.6, 8.4, 9.2), rx = r * 1.06, ry = r * 0.9, hx = 15.6, hy = 26.4 - ry + h, top = hy - ry;
    // the power tile: its top face (a trapezoid seen from a little above), its front edge and an inset border
    const wb = T(stage, 7.6, 8.2, 8.8), wf = wb + 1.8, ty0 = 26.0, ty1 = 29.6, ty2 = 30.7, tcx = 15.6;
    piece(g, t => {
      t.poly([[tcx - wb, ty0], [tcx + wb, ty0], [tcx + wf, ty1], [tcx - wf, ty1]], GOLD[1]);
      t.poly([[tcx - wf, ty1], [tcx + wf, ty1], [tcx + wf - 0.2, ty2], [tcx - wf + 0.2, ty2]], GOLD[2]);
      const ib = wb - 1.3, iff = wf - 1.6, iy0 = ty0 + 0.7, iy1 = ty1 - 0.65;
      t.poly([[tcx - ib, iy0], [tcx + ib, iy0], [tcx + iff, iy1], [tcx - iff, iy1]], lt(GOLD[1], 0.45));
      t.poly([[tcx - ib + 0.55, iy0 + 0.4], [tcx + ib - 0.55, iy0 + 0.4], [tcx + iff - 0.7, iy1 - 0.4], [tcx - iff + 0.7, iy1 - 0.4]], GOLD[1]);
      t.ell(tcx - wf + 1.6, ty1 + 0.6, 1.0, 0.3, GOLD[0]);
    });
    // a little glowing power mark either side of the turnip
    for (const sd of [-1, 1]) { const x = tcx + sd * (wb - 1.1), y = (ty0 + ty1) / 2 + 0.6; piece(g, t => t.poly([[x, y - 1.0], [x + 0.8, y], [x, y + 1.0], [x - 0.8, y]], stage ? '#fffbe8' : GOLD[0])); }
    // leafy crown: long turnip leaves on purple stalks, fanned up (they sway on frame 1)
    const lv = T(stage, [-2.15, -1.57, -1.0], [-2.35, -1.85, -1.3, -0.8], [-2.5, -2.05, -1.57, -1.1, -0.65]), ll = T(stage, 5.2, 5.8, 6.2);
    const kx = hx - 0.3, ky = top + 1.2;
    lv.forEach((a0, i) => {
      const a = a0 + (P.walk && f ? 0.08 : 0), len = ll - (Math.abs(a0 + PI / 2) > 0.8 ? 0.7 : 0), sx = kx + cos(a) * 1.6, sy = ky + sin(a) * 1.6, Lc = i % 2 ? mix(L, '#3e8a48', 0.12) : L;
      piece(g, t => { stroke(t, [[kx, ky + 0.6], [sx, sy]], 0.42, 0.38, M[1]); pointLeaf(t, sx, sy, len - 1.4, a, T(stage, 1.8, 1.9, 2.0), Lc[1]); shadeShape(t, Lc, 0.4, 0.5); });
      vein(g, sx, sy, len - 1.4, a, L[2]);
    });
    piece(g, t => { // the turnip: a wide round bulb tapering to a little root tip, magenta-purple over its top
      t.ell(hx, hy, rx, ry, W[1]); t.ell(hx - 0.1, hy + ry * 0.2, rx * 0.94, ry * 0.8, W[1]);
      t.poly([[hx - 2.4, hy + ry * 0.7], [hx + 2.2, hy + ry * 0.7], [hx - 0.1, hy + ry + 1.9]], W[1]);
      recolor(t, W[1], M[1], (x, y) => y < top + ry * 0.66 + 0.5 * sin((x - hx) * 1.1 + 0.6));
      shadeShape(t, M, rx * 0.13, ry * 0.15); shadeShape(t, W, rx * 0.13, ry * 0.15);
      shine(t, hx - rx * 0.46, hy - ry * 0.56, rx * 0.2, ry * 0.12, M[0]);
    });
    piece(g, t => stroke(t, [[hx - 0.1, hy + ry + 1.6], [hx + 0.1, hy + ry + 2.6]], 0.3, 0.2, W[2]));
    // the glow: soft see-through light round the tile, brighter by stage; rays and sparkles at stage 2
    if (stage === 2) for (const sd of [-1, 1]) { const x = tcx + sd * (wb + 0.2); for (let fy = Math.floor((ty0 - 6) * g.k); fy < ty0 * g.k; fy++) for (let fx = Math.floor((x - 0.6) * g.k); fx <= Math.ceil((x + 0.6) * g.k); fx++) if (g.fget(fx, fy) === null) g.fset(fx, fy, `rgba(255,230,120,${(0.5 * (fy / g.k - ty0 + 6) / 6).toFixed(2)})`); }
    glow(g, tcx, (ty0 + ty2) / 2, wf + T(stage, 0.5, 1.0, 1.5), '255,222,100', T(stage, 0.38, 0.5, 0.62), 0.34);
    if (stage >= 1) sparkle(g, tcx + wf + 0.4, ty0 - 1.6 - (f ? 0.4 : 0), 0.6, '#fffbe0');
    if (stage === 2) sparkle(g, tcx - wf - 0.2, ty0 - 2.4 + (f ? 0.4 : 0), 0.65, '#fff6a0');
    const ex = hx + 0.8, ey = hy + ry * 0.18;
    eyes(g, ex, ey, r, P);
    A.chibiMouth(g, ex + 0.1, ey + r * 0.5, P.mouth || 'smile', 2.2);
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(top + 1.4), w: R(rx * 1.4) } };
  };

  // =====================================================================================================
  // Thyme Warp -> Thyme Twister -> Thyme Master
  // A little herb sprig plant: a round soft-green head with woody thyme sprigs of tiny paired leaves sprouting from its top, a gold
  // pocket watch (a cream clock face with two hands) dangling on a chain from a sprig curling out to the back, and swirly time
  // sparkles. Stage 1: more sprigs, a bigger watch and two swirls; stage 2: the most sprigs, three swirls and a tiny hourglass.
  PAL.thymewarp = { main: ['#eaf6dc', '#bedea8', '#9ac28a'], leaf: ['#c8eca0', '#80c264', '#5ea256'], acc: GOLD, stem: '#7e8a56', root: '#8a6a3a', part: 'clock' };
  ART.thymewarp = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, L = C.leaf, G = C.acc, f = P.frame ? 1 : 0;
    const r = T(stage, 8, 8.8, 9.4), rx = r * 1.02, ry = r * 0.95, hx = 15.9, hy = 26.3 - ry + h, top = hy - ry;
    baseLeaves(g, P, L);
    // the woody sprigs, each lined with tiny paired leaves and a leaf at its tip
    const sprigs = T(stage, [[-2.3, 5.0], [-1.57, 5.8], [-0.85, 5.0]], [[-2.45, 5.2], [-1.85, 5.7], [-1.3, 5.7], [-0.7, 5.2]], [[-2.6, 4.6], [-2.1, 4.9], [-1.57, 4.8], [-1.05, 4.9], [-0.55, 4.6]]);
    const sx0 = hx - 0.2, sy0 = top + 1.4;
    // (each sprig its own piece, the outer ones first, so they stay apart instead of merging into one clump)
    const order = sprigs.map((q, i) => i).sort((i, j) => Math.abs(sprigs[j][0] + PI / 2) - Math.abs(sprigs[i][0] + PI / 2));
    for (const i of order) piece(g, t => {
      const [a0, len] = sprigs[i], a = a0 + (P.walk && f ? 0.07 : 0), pts = []; for (let k = 0; k <= 4; k++) { const u = k / 4; pts.push([sx0 + cos(a) * len * u + sin(u * PI) * 0.3, sy0 + sin(a) * len * u]); }
      stroke(t, pts, 0.36, 0.26, C.stem);
      // tiny thyme leaves stepping up the sprig on alternate sides, one at the tip
      [0.42, 0.58, 0.74, 0.88].forEach((u, j) => { const b = a + (j % 2 ? 1 : -1) * 1.1, x = sx0 + cos(a) * len * u, y = sy0 + sin(a) * len * u; t.ell(x + cos(b) * 0.85, y + sin(b) * 0.85, 0.85, 0.5, L[1], b); });
      t.ell(sx0 + cos(a) * (len + 0.5), sy0 + sin(a) * (len + 0.5), 0.95, 0.58, L[1], a);
      shadeShape(t, L, 0.25, 0.3);
    });
    // the sprig curling out to the back that holds the watch, and its chain
    const wr = T(stage, 2.6, 3.0, 3.3), wx = Math.max(2.5 + wr, hx - rx - 1.0), wy = hy - ry * 0.05 + (P.walk && f ? 0.4 : 0), hookX = wx + 0.1, hookY = top + 0.4;
    piece(g, t => { stroke(t, [[sx0 - 0.6, sy0 + 0.4], [hx - rx * 0.6, top - 1.0], [hookX - 0.2, hookY - 0.8], [hookX, hookY]], 0.34, 0.26, C.stem); t.ell(hx - rx * 0.6, top - 1.6, 0.85, 0.5, L[1], -2.2); t.ell(hx - rx * 0.35, top - 1.0, 0.85, 0.5, L[1], -1.0); });
    piece(g, t => { // the round soft-green head, a few tiny thyme leaves on its crown
      A.softBody(t, hx, hy, rx, ry, M);
      for (const [kx, ky, a] of [[-0.56, -0.84, -2.4], [0.5, -0.86, -0.7]]) t.ell(hx + kx * rx, hy + ky * ry, 0.95, 0.55, L[1], a);
    });
    piece(g, t => stroke(t, [[hookX, hookY + 0.2], [hookX - 0.1, (hookY + wy - wr) / 2], [wx, wy - wr - 0.8]], 0.2, 0.2, G[2]));
    piece(g, t => { // the pocket watch: a gold case with a knob and ring on top, a cream face
      t.ell(wx, wy - wr - 0.75, 0.7, 0.55, G[1]);
      t.ell(wx, wy, wr, wr, G[1]);
      shadeShape(t, G, 0.35, 0.4);
      t.ell(wx, wy, wr - 0.75, wr - 0.75, '#fffaf0');
      t.ell(wx - wr * 0.5, wy - wr * 0.55, 0.45, 0.3, G[0], -0.6, fm((x, y) => t.get(x, y) === G[1]));
    });
    // its face: four hour dots, two hands and a centre pin
    for (const a of [0, PI / 2, PI, -PI / 2]) g.dot(wx + cos(a) * (wr - 1.3), wy + sin(a) * (wr - 1.3), G[2]);
    stroke(g, [[wx, wy], [wx, wy - (wr - 1.35)]], 0.18, 0.18, INK);
    stroke(g, [[wx, wy], [wx + (wr - 1.6) * 0.85, wy + (wr - 1.6) * 0.3]], 0.18, 0.18, INK);
    g.dot(wx, wy, '#e2605a');
    // swirly time sparkles (and the tiny hourglass at stage 2)
    const sw = T(stage, [[hx + rx + 1.9, hy - ry * 0.55, 1.5, 1]], [[hx + rx + 2.0, hy - ry * 0.6, 1.6, 1], [hx + rx + 1.4, hy + ry * 0.45, 1.25, -1]], [[hx + rx + 1.6, hy + ry * 0.4, 1.4, -1], [hx - rx - 0.6, top - 1.8, 1.25, 1], [hx + 4.6, top - 2.6, 1.15, -1]]);
    sw.forEach(([x, y, s, d], i) => swirl(g, Math.min(x, 30.2 - s), y + ((i + f) % 2 ? -0.4 : 0), s, i % 2 ? '#9ee6d4' : '#cbb6f2', d));
    if (stage === 2) {
      const gx = Math.min(hx + rx + 2.0, 28.4), gy = hy - ry * 0.55 - (f ? 0.3 : 0);
      piece(g, t => { // two glass bulbs meeting at a waist, sand in the bottom one
        t.poly([[gx - 1.4, gy - 2.1], [gx + 1.4, gy - 2.1], [gx + 0.25, gy], [gx + 1.4, gy + 2.1], [gx - 1.4, gy + 2.1], [gx - 0.25, gy]], '#dff4ff');
        t.poly([[gx - 1.0, gy + 2.1], [gx + 1.0, gy + 2.1], [gx, gy + 0.9]], G[1]);
        t.poly([[gx - 0.55, gy - 1.2], [gx + 0.55, gy - 1.2], [gx, gy - 0.4]], G[1]);
      });
      for (const dy of [-2.5, 2.5]) piece(g, t => { t.ell(gx, gy + dy, 1.8, 0.55, G[1]); shadeShape(t, G, 0.3, 0.3); });
    }
    const ex = hx + 0.8, ey = hy + ry * 0.16;
    eyes(g, ex, ey, r, P);
    A.chibiMouth(g, ex + 0.1, ey + r * 0.5, P.mouth || 'smile', 2.2);
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(top + 1.4), w: R(rx * 1.4) } };
  };
})();
