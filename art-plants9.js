// art-plants9.js — PVZ Garden: the fifth wave, batch A: twelve more plants in TRUE chibi style (see docs/pvz-art-guide.md and
// docs/chibi-reference.js).
// Dandelion, Holly Barrier, Witch Hazel, Caulipower, Shrinking Violet, Goo Peashooter, Electric Peashooter, Solar Tomato,
// Cold Snapdragon, Shine Vine, Sling Pea, Apple Mortar.
// Same contract as art-plants7.js: PX.PLANT_ART[id] = function (g, stage, P, C) -> geometry, PX.PLANT_PAL[id] = palette.
// The head is the character (half-width about 8 / 9 / 10 by stage, its bottom near row 26), each with its own silhouette built
// from 2-3 overlapping shapes, big glossy eyes set low and wide, a tiny mouth (the two pea shooters have none: the snout is the
// mouth), blush, flat pastel fills with one soft shade and little base leaves (Holly Barrier, a wall, sits right on the ground);
// no long stems, no legs. All twelve are friendly, even the fighters. The core adds the bold outer edge.
// Walking = a hop on frame 1; arms:'up' = raised leaves and a little hop.
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
  // keep a floating bit (parachute, sparkle, puff) inside the 32 px frame
  const clampX = (x, m) => Math.max(m, Math.min(32 - m, x));
  const LEAF = ['#c2f09a', '#86d066', '#5aa856'];
  const GOLD = ['#fff6c0', '#ffd75a', '#e0a83a'];
  const FROST = ['#ffffff', '#f2faff', '#c4e0f2'];
  const TIE = ['#ff8f8f', '#f26f78'];
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
  function lashes(g, ex, ey, r, P) {
    const m = P.eyes;
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
  // a pointed leaf from its base (x, y): length len, angle ang (0 = right, negative = up), half width w
  function pointLeaf(t, x, y, len, ang, w, col) {
    const c = cos(ang), s = sin(ang), nx = -s * w, ny = c * w, pts = [];
    const prof = [[0, 0.3], [0.18, 0.82], [0.42, 1], [0.66, 0.82], [0.86, 0.42], [1, 0]];
    for (const [u, k] of prof) pts.push([x + c * len * u + nx * k, y + s * len * u + ny * k]);
    for (let i = prof.length - 2; i >= 0; i--) { const [u, k] = prof[i]; pts.push([x + c * len * u - nx * k, y + s * len * u - ny * k]); }
    t.poly(pts, col);
  }
  // a thin vein from (x, y) along ang, only on pixels of colour on (or any drawn pixel)
  function vein(g, x, y, len, ang, col, on, k0, k1) {
    for (let k = k0 || 0.15; k < (k1 || 0.85); k += 0.04) { const px = x + cos(ang) * len * k, py = y + sin(ang) * len * k; if (on ? g.get(px, py) === on : g.filled(px, py)) g.dot(px, py, col); }
  }
  // a soft see-through glow round (cx, cy) on empty pixels only, so the bold edge skips it (draw it last)
  function glow(g, cx, cy, r, rgb, a) {
    const k = g.k, r2 = r + 1.3;
    for (let fy = Math.max(0, Math.floor((cy - r2) * k)); fy <= Math.min(g.fh - 1, Math.ceil((cy + r2) * k)); fy++) for (let fx = Math.max(0, Math.floor((cx - r2) * k)); fx <= Math.min(g.fw - 1, Math.ceil((cx + r2) * k)); fx++) {
      if (g.fget(fx, fy) !== null) continue;
      const d = Math.hypot((fx + 0.5) / k - cx, (fy + 0.5) / k - cy);
      if (d <= r) g.fset(fx, fy, `rgba(${rgb},${a})`); else if (d <= r2) g.fset(fx, fy, `rgba(${rgb},${(a / 2).toFixed(2)})`);
    }
  }
  // paint a shape drawn on a scratch layer onto g only over the pixels whose colour passes ok (a pattern on a body: no outline)
  function paintOn(g, draw, ok) { const t = new PX.Grid(g.w, g.h, g.k); draw(t); for (let i = 0; i < t.a.length; i++) if (t.a[i] !== null && ok(g.a[i])) g.a[i] = t.a[i]; }
  // a spiral of points curling round (ox, oy) from angle a0 (sd 1 = clockwise on screen, -1 = anticlockwise)
  function spiral(ox, oy, a0, r0, sd, n) { const pts = []; for (let i = 0; i <= (n || 10); i++) { const a = a0 + sd * i * 0.55, rr = r0 * (1 - i * 0.07); pts.push([ox + cos(a) * rr, oy + sin(a) * rr]); } return pts; }

  // ---------------- the pea family (Goo / Electric Peashooter) ----------------
  // the reference Peashooter v3 head: only slightly oval, fuller at the back, a SHORT chunky snout tube in the same piece. o.crest
  // draws what grows at the back of the head (behind it); o.lip / o.hole colour the opening. Returns the head geometry.
  function peaHead(g, stage, P, C, o) {
    o = o || {};
    const M = C.main, r = T(stage, 8, 9, 10), rx = r * 1.06, ry = r * 0.95, rot = -0.06, hx = 14, hy = 26 - ry + hopOf(P) + 0.3;
    baseLeaves(g, P, C.leaf, { cx: 15.2, sp: 4.0, len: 4.3 });
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
  // the pea family's red bow tie (drawn after anything on the head, like the reference)
  const bowTie = (g, by) => piece(g, t => { t.poly([[14.8, by], [11.7, by - 1.5], [11.7, by + 1.5]], TIE[0]); t.poly([[14.8, by], [17.9, by - 1.5], [17.9, by + 1.5]], TIE[0]); t.ell(14.8, by, 0.95, 0.95, TIE[1]); });
  const peaGeom = (g, H) => ({ hx: R(H.hx), hy: R(H.hy), hr: H.r, top: topOf(g), ey: R(H.ey), front: R(H.ox + H.rw), hat: { x: R(H.hx - 0.4), y: R(H.hy - H.ry + 1.4), w: R(H.rx * 1.5) } });
  // a lightning bolt from its narrow base (x, y) to its tip, len long along ang, w wide
  const BOLT = [[0.55, 0], [0.05, 0.56], [0.44, 0.56], [0.25, 1], [0.95, 0.4], [0.58, 0.4], [0.82, 0]];
  function bolt(t, x, y, len, ang, w, col) {
    const c = cos(ang), s = sin(ang);
    t.poly(BOLT.map(([u, v]) => { const al = v * len, sd = (u - 0.5) * w; return [x + c * al - s * sd, y + s * al + c * sd]; }), col);
  }
  // a little zigzag spark (its own outlined piece)
  const zap = (g, x, y, s, col) => piece(g, t => stroke(t, [[x - 1.1 * s, y - 1.2 * s], [x + 0.3 * s, y - 0.3 * s], [x - 0.4 * s, y + 0.2 * s], [x + 1.1 * s, y + 1.2 * s]], 0.34 * s, 0.3 * s, col));

  // =====================================================================================================
  // Dandelion -> Dande-Blast -> Mega Dandelion
  // A round fluffy WHITE seed puff (a soft scalloped cloud edge, faint seed dots round its crown) with the face on it, on a short
  // green stem and base leaves; little seed parachutes drift off it, one per stage. Stage 2 wears a small yellow dandelion flower
  // on top.
  PAL.dandelion = { main: ['#ffffff', '#f5f6fc', '#d6d9ec'], leaf: LEAF, acc: ['#fff6c0', '#ffd84a', '#f0b232'], stem: '#62ac50', root: '#8a6a3a', part: 'puffball' };
  const PUFF = ['#ffffff', '#fbfbff', '#d8dcec'];
  // one seed parachute: a white tuft on a thin stalk with a seed at the bottom, tilted by tl
  function parachute(g, x, y, s, tl) {
    const c = cos(tl), sn = sin(tl), at = (u, v) => [x + u * c - v * sn, y + u * sn + v * c];
    piece(g, t => {
      stroke(t, [at(0, 0.4 * s), at(0, 2.5 * s)], 0.2, 0.2, '#e8e0cc');
      const [sx, sy] = at(0, 2.9 * s); t.ell(sx, sy, 0.45 * s, 0.7 * s, '#c49a6c', tl);
    });
    piece(g, t => { t.ell(x, y, 1.75 * s, 1.1 * s, PUFF[1], tl, fm((px, py) => -(px - x) * sn + (py - y) * c <= 0.35 * s)); shadeShape(t, PUFF, 0.3, 0.4); });
    for (const k of [-0.9, 0, 0.9]) { const [px, py] = at(k * s, -0.25 * s); g.dot(px, py, PUFF[2]); }
  }
  ART.dandelion = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, f = P.frame ? 1 : 0;
    const r = T(stage, 7.6, 8.4, 9.2), ry = r * 0.96, hx = 15.4, hy = 25.4 - r + h;
    baseLeaves(g, P, C.leaf);
    stem(g, 15.6, 28.6, hy + ry - 1, C.stem);
    // the seed parachutes drifting off (behind the puff); they float up and sideways on frame 1
    const paras = T(stage, [[hx + r + 3.0, hy - r * 0.55, 0.36]], [[hx + r + 2.9, hy - r * 0.62, 0.36], [hx - r - 2.6, hy - r * 0.02, -0.3]],
      [[hx + r + 2.6, hy - r * 0.66, 0.36], [hx - r - 2.4, hy + r * 0.02, -0.3], [hx - r * 0.5 - 2.0, hy - r - 2.3, -0.15]]);
    const ps = T(stage, 0.95, 1, 1.05);
    paras.forEach(([x, y, tl], i) => { const d = (i + f) % 2 ? 1 : 0; parachute(g, clampX(x + d * 0.4, 2.2 * ps), y - d * 0.6, ps, tl); });
    // the puff: a soft cloud with a scalloped edge of little fluffy bumps
    const n = T(stage, 13, 14, 15), br = T(stage, 1.55, 1.65, 1.75);
    piece(g, t => {
      t.ell(hx, hy, r, ry, M[1]);
      for (let i = 0; i < n; i++) { const a = i * 2 * PI / n - PI / 2 + 0.12; t.ell(hx + cos(a) * (r - 0.35), hy + sin(a) * (ry - 0.35), br, br * 0.92, M[1]); }
      shadeShape(t, M, r * 0.13, ry * 0.15);
      shine(t, hx - r * 0.42, hy - ry * 0.5, r * 0.22, ry * 0.14, lt(M[0], 0.6));
    });
    // faint seed dots round the crown and sides (clear of the face)
    const ex = hx + 0.8, ey = hy + ry * 0.16, SD = mixHex(M[1], M[2], 0.7);
    for (let i = 0; i < n; i++) {
      const a = i * 2 * PI / n - PI / 2 + 0.12 + PI / n;
      for (const k of [0.52, 0.76]) {
        const x = hx + cos(a) * r * k, y = hy + sin(a) * ry * k;
        if (Math.abs(x - ex) < r * 0.86 && y > ey - r * 0.52) continue;
        g.ell(x, y, 0.42, 0.42, SD, 0, inside(g));
      }
    }
    // stage 2: a small yellow dandelion flower on top
    if (stage === 2) piece(g, t => {
      const x = hx - 1.2, y = hy - ry - 0.4, Y = C.acc;
      for (let i = 0; i < 10; i++) { const a = i * PI / 5 + 0.2; t.ell(x + cos(a) * 1.75, y + sin(a) * 1.5, 1.2, 0.75, Y[1], a); }
      t.ell(x, y, 1.6, 1.4, Y[1]);
      shadeShape(t, Y, 0.35, 0.45);
      t.ell(x - 0.5, y - 0.5, 0.6, 0.4, Y[0], -0.5, inside(t));
    });
    eyes(g, ex, ey, r, P);
    A.chibiMouth(g, ex + 0.1, ey + r * 0.5, P.mouth || 'smile', 2.2);
    return { hx: R(hx), hy: R(hy), hr: R(r), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - ry + 1.2), w: R(r * 1.5) } };
  };

  // =====================================================================================================
  // Holly Barrier -> Holly Fortress -> Holly Glacier
  // A wide, chunky, round holly bush (a wall: it sits right on the ground) crowned with big glossy dark holly leaves fanned up and
  // out from its top like the sprig on a Christmas pudding, bright red berry clusters sitting where they meet, big eyes and a
  // happy smile. It grows by stage: a small sprig and one cluster; a bigger ruff, two clusters, frosted tips and two icicles;
  // a full crown, a snowy cap, three clusters, four icicles and frost sparkles.
  PAL.hollybarrier = { main: ['#caeeb8', '#6cba78', '#4e9c66'], leaf: ['#a8dca0', '#3f9a5c', '#2e7a4a'], acc: ['#ffc4ca', '#f25c68', '#d24658'], stem: '#5a9a52', root: '#8a6a3a', part: 'holly' };
  const ICICLE = ['#ffffff', '#d4f0fc', '#a2d2ec'];
  // a holly leaf from its base (x, y): length len along ang, half width w; the classic wavy edge, three sharp points down each
  // side with deep scooped notches between them, and a sharp tip
  const HOLLY = [[0, 0.3], [0.16, 1.0], [0.21, 0.55], [0.31, 0.3], [0.41, 0.55], [0.46, 1.0], [0.51, 0.55], [0.61, 0.3], [0.71, 0.5], [0.76, 0.9], [0.82, 0.45], [0.89, 0.25], [1, 0]];
  function hollyLeaf(t, x, y, len, ang, w, col) {
    const c = cos(ang), s = sin(ang), nx = -s * w, ny = c * w, pts = [];
    for (const [u, k] of HOLLY) pts.push([x + c * len * u + nx * k, y + s * len * u + ny * k]);
    for (let i = HOLLY.length - 2; i >= 0; i--) { const [u, k] = HOLLY[i]; pts.push([x + c * len * u - nx * k, y + s * len * u - ny * k]); }
    t.poly(pts, col);
  }
  // a cluster of n round berries centred on (x, y), each its own piece so they read as separate berries
  function berries(g, x, y, s, Rb, n) {
    for (const [dx, dy] of [[-0.85, 0.45], [0.85, 0.45], [0, -0.75], [0, 1.2]].slice(0, n || 3)) piece(g, t => {
      const bx = x + dx * s, by = y + dy * s;
      t.ell(bx, by, s, s * 0.95, Rb[1]); shadeShape(t, Rb, 0.3, 0.35); t.ell(bx - s * 0.36, by - s * 0.38, s * 0.34, s * 0.26, Rb[0], -0.5, inside(t));
    });
  }
  ART.hollybarrier = function (g, stage, P, C) {
    const hop = P.walk && P.frame ? -1 : P.arms === 'up' ? -0.6 : 0, sq = P.walk && !P.frame ? 0.35 : 0;
    const M = C.main, Lh = C.leaf, f = P.frame ? 1 : 0, sway = P.walk || P.arms === 'up' ? (f ? 0.06 : -0.04) : 0;
    const rx = T(stage, 9.6, 10.2, 10.8) + sq, ry = T(stage, 8.0, 8.8, 9.6) - sq, hx = 15.5, hy = 30.2 - ry + hop;
    // the bush: round with a fuller, flatter bottom, so it sits sturdy on the ground
    piece(g, t => {
      t.ell(hx, hy, rx, ry, M[1]);
      t.ell(hx, hy + ry * 0.3, rx * 1.03, ry * 0.7, M[1]);
      shadeShape(t, M, rx * 0.12, ry * 0.14);
      shine(t, hx - rx * 0.5, hy - ry * 0.3, rx * 0.16, ry * 0.11, M[0]);
    });
    // a few bold leaf shapes in the shade colour down the bush's sides, so it reads as a bush of leaves (clear of the face)
    const BL = mixHex(M[1], M[2], 0.8);
    for (const [kx, ky, a, l] of [[-0.5, -0.12, PI + 0.4, 4.6], [-0.46, 0.5, PI - 0.45, 4.4], [0.7, 0.52, -0.5, 3.4]]) {
      const x = hx + kx * rx, y = hy + ky * ry;
      paintOn(g, t => pointLeaf(t, x, y, l, a, l * 0.3, BL), c => c === M[1]);
    }
    // the holly crown: big prickly leaves fanned up and out from near the top centre (their roots spread a little apart, so the
    // fan is wide and each leaf's points show), side ones first so the middle ones lie on top; each has a pale centre vein, a
    // white gloss streak and (stage 1+) a frosted tip
    const n = T(stage, 5, 6, 7), ll = T(stage, 5.4, 6.0, 6.5), lw = T(stage, 2.3, 2.5, 2.6), spread = T(stage, 1.1, 1.32, 1.48), ws = T(stage, 2.2, 3.0, 3.6);
    const cx = hx - 0.2, cy = hy - ry + T(stage, 2.6, 2.6, 2.8), VN = mixHex(Lh[1], Lh[0], 0.75), Lh2 = [Lh[0], mixHex(Lh[1], Lh[0], 0.22), Lh[2]];
    const lv = [];
    for (let i = 0; i < n; i++) { const u = i / (n - 1) * 2 - 1, a = -PI / 2 + u * spread + sway * (i % 2 ? 1 : -1); lv.push({ i, u, a, x: cx + u * ws + cos(a) * 0.8, y: cy + u * u * 1.1 + sin(a) * 0.8, len: ll * (1 - Math.abs(u) * 0.1) }); }
    const byU = lv.slice().sort((p, q) => Math.abs(q.u) - Math.abs(p.u));
    for (const Lf of byU) {
      // (neighbours take turns between two holly greens, so each leaf reads on its own)
      const { x, y } = Lf, c = cos(Lf.a), s = sin(Lf.a), Lc = Lf.i % 2 ? Lh2 : Lh, up = -s * -0.6 + c * -0.8 > 0 ? 1 : -1;
      piece(g, t => {
        hollyLeaf(t, x, y, Lf.len, Lf.a, lw, Lc[1]);
        shadeShape(t, Lc, 0.4, 0.5);
        // the white gloss streak along the leaf's upper (lit) half
        const gx = x + c * Lf.len * 0.5 - s * lw * 0.42 * up, gy = y + s * Lf.len * 0.5 + c * lw * 0.42 * up;
        t.ell(gx, gy, Lf.len * 0.22, 0.36, WHITE, Lf.a, fm((xx, yy) => t.get(xx, yy) === Lc[1]));
        if (stage >= 1) t.ell(x + c * Lf.len * 0.97, y + s * Lf.len * 0.97, 0.95, 0.8, FROST[1], Lf.a, inside(t));
      });
      vein(g, x, y, Lf.len, Lf.a, VN, Lc[1], 0.1, 0.86);
    }
    // stage 2: a snowy cap resting on the crown: soft lumps of snow in the gaps between the upper leaves, so every leaf still shows
    if (stage === 2) piece(g, t => {
      for (const [u, k, sz] of [[-0.5, 0.62, 1.05], [-0.17, 0.72, 1.15], [0.17, 0.72, 1.15], [0.5, 0.62, 1.05]]) {
        const a = -PI / 2 + u * spread, d = ll * k + 0.8;
        t.ell(cx + u * ws + cos(a) * d, cy + u * u * 1.1 + sin(a) * d, sz * 1.2, sz, FROST[1], a + PI / 2);
      }
      shadeShape(t, FROST, 0.35, 0.45);
    });
    // the icicles hanging off the outer leaves (from the tips, then from their lower points too), big enough to read
    const ic = T(stage, [], [[lv[0], 1, 3.4], [lv[n - 1], 1, 3.4]], [[lv[0], 1, 3.8], [lv[0], 0.5, 2.8], [lv[n - 1], 1, 3.8], [lv[n - 1], 0.5, 2.8]]);
    for (const [Lf, u, len] of ic) {
      const c = cos(Lf.a), s = sin(Lf.a), sd = c < 0 ? -1 : 1, low = u < 1 ? lw * 0.85 * sd : 0;
      const x = Lf.x + c * Lf.len * u * 0.96 - s * low, y = Lf.y + s * Lf.len * u * 0.96 + c * low + 0.3;
      piece(g, t => {
        t.poly([[x - 1.2, y - 0.2], [x + 1.2, y - 0.2], [x + sd * 0.15, y + len + f * 0.25]], ICICLE[1]);
        shadeShape(t, ICICLE, 0.3, 0.4);
        t.ell(x - 0.4, y + len * 0.3, 0.26, len * 0.26, WHITE, 0.08, inside(t));
      });
    }
    // the bright red berry clusters, sitting on the leaves where they meet
    const bs = T(stage, 1.08, 1.12, 1.18);
    const bc = T(stage, [[cx, cy + 0.2]], [[cx - 1.9, cy + 0.5], [cx + 1.9, cy + 0.3]], [[cx - 2.3, cy + 0.9], [cx + 2.3, cy + 0.7], [cx, cy - 1.2]]);
    for (const [x, y] of bc) berries(g, x, y, bs, C.acc, 3);
    if (stage === 2) for (const [x, y, s] of f ? [[hx + rx + 1.4, hy - ry * 0.5, 0.75], [hx - rx - 1.2, hy - ry * 0.9, 0.65]] : [[hx + rx + 1.2, hy - ry * 0.9, 0.75], [hx - rx - 1.4, hy - ry * 0.4, 0.65]]) sparkle(g, clampX(x, 1.6), y, s, '#e8f8ff');
    const ex = hx + 1.0, ey = hy + ry * 0.2, er = T(stage, 8.2, 8.7, 9.2);
    eyes(g, ex, ey, er, P);
    A.chibiMouth(g, ex + 0.1, ey + er * 0.5, P.mouth || 'smile', 2.4);
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - ry + 1.6), w: R(rx * 1.5) } };
  };

  // =====================================================================================================
  // Witch Hazel -> Hazel Witch -> Grand Witch Hazel
  // A sunny flower: a warm amber face ringed with thin, wavy, ribbon-like yellow petals, wearing a little purple pointed witch hat
  // whose tip flops back; eyes with lashes and a sweet smile. Stage 1: a bigger hat with a starry pink band; stage 2: the
  // grandest hat with a gold buckle, a star on its tip and magic sparkles.
  PAL.witchhazel = { main: ['#fff8c4', '#ffe066', '#f4be44'], leaf: LEAF, acc: ['#ecdcff', '#a888e2', '#8466c6'], stem: '#62ac50', root: '#8a6a3a', part: 'witchhat' };
  const HAZEL_FACE = ['#ffeed4', '#ffcc8e', '#f0aa6c'], HAT_BAND = ['#ffe0f2', '#ff9fd0', '#e67cb4'];
  ART.witchhazel = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, Hc = C.acc, f = P.frame ? 1 : 0;
    // (the face sits low, its bottom near row 26, so no long stem shows under it)
    const fr = T(stage, 6.0, 6.5, 7.0), pr = fr + T(stage, 3.0, 3.3, 3.6), hx = 15.5, hy = 25.8 - fr + h;
    baseLeaves(g, P, C.leaf);
    stem(g, 15.6, 28.6, hy + fr, C.stem);
    // the ribbon petals: thin wavy strips round the face with rounded tips (they sway on frame 1); none hang straight down, where
    // they would read as little legs, and the lower ones are short
    const n = T(stage, 11, 12, 13), sw = f ? 0.1 : 0;
    piece(g, t => {
      for (let i = 0; i < n; i++) {
        const a = -PI / 2 + 0.13 + i * 2 * PI / n + sw, ph = i * 1.7, pts = [];
        if (sin(a) > 0.5) continue;
        const len = (pr - fr + 1.0 - (i % 2 ? 0.5 : 0)) * (sin(a) > 0.15 ? 0.75 : 1);
        for (let k = 0; k <= 8; k++) { const u = k / 8, d = fr - 1.0 + u * len, off = sin(u * PI * 1.6 + ph) * 0.45 * u; pts.push([hx + cos(a) * d - sin(a) * off, hy + sin(a) * d + cos(a) * off]); }
        stroke(t, pts, 0.95, 0.72, M[1]);
      }
      shadeShape(t, M, 0.45, 0.55);
    });
    piece(g, t => A.softBody(t, hx, hy, fr, fr * 0.97, HAZEL_FACE));
    // the witch hat: a cone leaning back with its tip flopped over, a band and a wide brim
    const by = hy - fr + 1.0, hh = T(stage, 5.4, 6.2, 6.9), bw = fr * T(stage, 1.1, 1.16, 1.22);
    const tipX = hx - T(stage, 2.4, 2.8, 3.2), tipY = by - hh;
    piece(g, t => {
      t.poly([[hx - fr * 0.62, by], [hx + fr * 0.66, by], [hx + fr * 0.14, by - hh * 0.6], [tipX + 0.9, tipY + 0.5], [tipX - 0.2, tipY], [hx - fr * 0.42, by - hh * 0.5]], Hc[1]);
      t.ell(tipX - 0.1, tipY + 0.15, 0.6, 0.55, Hc[1]);
      t.ell(hx, by - 0.8, fr * 0.6, 1.0, Hc[1], 0, inside(t));
      // the band
      if (stage >= 1) t.poly([[hx - fr * 0.7, by - 0.2], [hx + fr * 0.72, by - 0.2], [hx + fr * 0.6, by - 1.7], [hx - fr * 0.6, by - 1.7]], HAT_BAND[1]);
      t.ell(hx + 0.1, by + 0.1, bw, T(stage, 1.0, 1.1, 1.2), Hc[1]);
      shadeShape(t, Hc, 0.4, 0.5);
      shadeShape(t, HAT_BAND, 0.3, 0.4);
      t.ell(hx - fr * 0.3, by - hh * 0.32, 0.4, hh * 0.18, Hc[0], 0.3, fm((x, y) => t.get(x, y) === Hc[1]));
    });
    if (stage === 0) stroke(g, [[hx - fr * 0.56, by - 1.1], [hx + fr * 0.56, by - 1.1]], 0.3, 0.3, HAT_BAND[1]);
    // little gold stars on the band (stage 1+), a buckle and a star on the tip (stage 2)
    if (stage >= 1) for (const dx of stage === 2 ? [-fr * 0.42] : [-fr * 0.3, fr * 0.32]) g.poly(starPts(hx + dx, by - 0.95, 0.85, 0.36, 5), GOLD[1]);
    if (stage === 2) {
      piece(g, t => { t.poly([[hx + 0.6, by - 2.0], [hx + 3.0, by - 2.0], [hx + 3.0, by + 0.1], [hx + 0.6, by + 0.1]], GOLD[1]); t.poly([[hx + 1.3, by - 1.4], [hx + 2.3, by - 1.4], [hx + 2.3, by - 0.5], [hx + 1.3, by - 0.5]], HAT_BAND[1]); });
      piece(g, t => t.poly(starPts(tipX - 0.4, tipY - 0.2, 1.5, 0.65, 5), GOLD[1]));
    }
    if (stage >= 1) {
      const sp = T(stage, 0, [[hx + pr + 1.4, hy - fr * 0.6, 0.65]], [[hx + pr + 1.2, hy - fr * 0.8, 0.7], [hx - pr - 1.2, hy - fr * 0.1, 0.6], [hx + pr + 0.6, hy + fr * 0.7, 0.5]]);
      sp.forEach(([x, y, s], i) => sparkle(g, clampX(x, 1.8), y + ((i + f) % 2 ? -0.4 : 0), s, i % 2 ? '#ffffff' : '#e8d4ff'));
    }
    const ex = hx + 0.6, ey = hy + fr * 0.16, er = fr * 1.08;
    eyes(g, ex, ey, er, P);
    lashes(g, ex, ey, er, P);
    A.chibiMouth(g, ex + 0.1, ey + er * 0.5, P.mouth || 'smile', 2.1);
    return { hx: R(hx), hy: R(hy), hr: R(pr), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(by), w: R(bw * 1.4) } };
  };

  // =====================================================================================================
  // Caulipower -> Cauli-Brain -> Cauli-Genius
  // A cauliflower head: a crown of big round cream florets packed over the top of a smooth round face, each floret shaded on its
  // own so the creases between them read as cute brain folds, cupped by big green leaves that rise up both sides of the head,
  // with purple psychic sparkles. Six florets at stage 0, seven at stage 1, eight and a soft lilac glow at stage 2.
  PAL.caulipower = { main: ['#fffcf0', '#f8edcc', '#dfcca0'], leaf: ['#c8eea4', '#7cc666', '#58a456'], acc: ['#f6e6ff', '#c9a2f6', '#a27ed8'], stem: '#62ac50', root: '#8a6a3a', part: 'brainglow' };
  // the florets (in units of r from the head's centre): the back row first, so the front row overlaps it
  const FLORETS = [
    [[-0.42, -0.88], [0.2, -0.92], [-0.82, -0.42], [-0.3, -0.6], [0.28, -0.6], [0.8, -0.44]],
    [[-0.5, -0.86], [0.04, -0.98], [0.56, -0.84], [-0.84, -0.42], [-0.3, -0.6], [0.28, -0.6], [0.82, -0.44]],
    [[-0.66, -0.78], [-0.2, -0.98], [0.3, -0.98], [0.74, -0.76], [-0.88, -0.38], [-0.32, -0.6], [0.3, -0.6], [0.86, -0.4]],
  ];
  ART.caulipower = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, L = C.leaf, Pu = C.acc, f = P.frame ? 1 : 0;
    const r = T(stage, 8.0, 8.8, 9.6), rx = r * 1.04, ry = r * 0.92, hx = 15.4, hy = 25.8 - ry + h;
    const up = P.arms === 'up' ? 0.3 : P.walk && f ? 0.08 : 0, VN = mixHex(L[1], L[0], 0.6);
    // the big leaves behind the head, rooted either side of the stem and rising up its sides to above eye level (stage 2 adds a
    // wider pair behind them); each is cut short if it would reach the frame's edge
    const back = T(stage, [[0.78, 1.45]], [[0.76, 1.5]], [[1.14, 1.15], [0.74, 1.52]]);
    const bl = (s, a0, k) => { const a = s * (a0 + up * 0.4), x = hx + s * 3; return { x, a: -PI / 2 + a, len: Math.min(r * k, (s < 0 ? x - 1.8 : 30.2 - x) / Math.abs(sin(a))) }; };
    for (const [a0, k] of back) for (const s of [-1, 1]) { const B = bl(s, a0, k); piece(g, t => { pointLeaf(t, B.x, 28.2, B.len, B.a, r * 0.36, L[1]); shadeShape(t, L, 0.4, 0.5); }); vein(g, B.x, 28.2, B.len, B.a, VN, L[1], 0.2, 0.85); }
    // the head: a smooth round face and the floret crown, each floret ringed in a deeper cream (the creases), with its own cream
    // crescent low-right, a tiny highlight and a couple of little curd arcs
    const ex = hx + 0.8, ey = hy + ry * 0.2, er = r * 0.96, CR = mixHex(M[2], '#000000', 0.13), rr = r * T(stage, 0.46, 0.46, 0.45);
    const safe = (x, y) => !(Math.abs(x - ex) < er * 0.9 && y > ey - er * 0.42);
    piece(g, t => {
      t.ell(hx, hy, rx, ry, M[1]);
      t.ell(hx - 0.2, hy + ry * 0.2, rx * 0.98, ry * 0.8, M[1]);
      shadeShape(t, M, rx * 0.13, ry * 0.15);
      for (const [kx, ky] of FLORETS[stage]) {
        const x = hx + kx * r, y = hy + ky * r, a = rr, b = rr * 0.92;
        t.ell(x, y, a, b, CR);
        t.ell(x, y, a - 0.5, b - 0.5, M[2]);
        t.ell(x - a * 0.14, y - b * 0.16, a * 0.8, b * 0.78, M[1]);
        t.ell(x - a * 0.42, y - b * 0.44, a * 0.22, b * 0.15, M[0], -0.5);
        for (const [dx, dy, q] of [[0.18, 0.12, 0.34], [-0.34, 0.3, 0.26]]) for (let c = 0.5; c <= PI - 0.5; c += 0.3) {
          const px = x + dx * a + cos(c) * q * a, py = y + dy * b + sin(c) * q * b * 0.8;
          if (safe(px, py) && t.get(px, py) === M[1]) t.dot(px, py, M[2]);
        }
      }
    });
    // big leaves in front, cupping the bottom of the head (clear of the face)
    for (const s of [-1, 1]) piece(g, t => { const a = -PI / 2 + s * (1.2 + up * 0.6), x = hx + s * 0.6, y = 28.6; pointLeaf(t, x, y, r * 0.98, a, r * 0.34, L[1]); shadeShape(t, L, 0.4, 0.5); });
    for (const s of [-1, 1]) vein(g, hx + s * 0.6, 28.6, r * 0.98, -PI / 2 + s * (1.2 + up * 0.6), VN, L[1], 0.25, 0.85);
    // the purple psychic sparkles (round the crown)
    const sp = T(stage, [[hx + rx + 2.2, hy - ry * 1.25, 0.75]], [[hx + rx + 2.2, hy - ry * 1.3, 0.8], [hx - rx - 2.0, hy - ry * 1.25, 0.65], [hx + rx + 2.4, hy - ry * 0.2, 0.55]],
      [[hx + rx + 2.0, hy - ry * 1.32, 0.85], [hx - rx - 2.0, hy - ry * 1.25, 0.7], [hx + rx * 0.66, hy - ry * 1.3, 0.6], [hx + rx + 2.4, hy - ry * 0.2, 0.55]]);
    sp.forEach(([x, y, s], i) => sparkle(g, clampX(x, 1.8), y + ((i + f) % 2 ? -0.4 : 0), s, i % 2 ? '#f4e6ff' : Pu[1]));
    eyes(g, ex, ey, er, P);
    A.chibiMouth(g, ex + 0.1, ey + er * 0.5, P.mouth || 'smile', 2.2);
    // stage 2: a soft lilac glow round the crown (on the lawn round it, so it reads purple)
    if (stage === 2) glow(g, hx, hy - ry * 0.3, r * 1.32, '190,140,255', 0.45);
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - r * 1.1), w: R(rx * 1.5) } };
  };

  // =====================================================================================================
  // Shrinking Violet -> Shy Violet -> Royal Violet
  // A shy purple violet: five rounded petals (two up, two out to the sides, a broad one below) round a pale yellow face with shy
  // eyes, lashes, rosy cheeks and a tiny smile, holding a tiny leaf up by its cheek. Stage 1: bigger with dark nectar lines on the
  // lower petals and a sparkle; stage 2: the biggest, with a tiny gold crown.
  PAL.shrinkingviolet = { main: ['#f0e2ff', '#b994ee', '#9674d4'], leaf: LEAF, acc: ['#fffce6', '#fff0b0', '#f0d888'], stem: '#62ac50', root: '#8a6a3a', part: 'petals' };
  ART.shrinkingviolet = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, Fc = C.acc, L = C.leaf, f = P.frame ? 1 : 0;
    const fr = T(stage, 5.3, 5.8, 6.3), pd = fr * 0.98, pw = fr * 0.8, ph = fr * 0.7, hx = 15.5, hy = 27.4 - pd - pw + h;
    baseLeaves(g, P, L);
    stem(g, 15.6, 28.6, hy + fr, C.stem);
    // the petals: the two upper ones a deeper purple and behind, then the side ones, then the broad bottom one
    const MU = mix(M, '#6a48a8', 0.12);
    const pets = [[-PI / 2 - 0.62, 1.04, MU], [-PI / 2 + 0.62, 1.04, MU], [PI - 0.3, 0.92, M], [0.3, 0.92, M], [PI / 2, 1.0, M]];
    for (const [a, s, Pm] of pets) piece(g, t => {
      t.ell(hx + cos(a) * pd * s, hy + sin(a) * pd * s, pw * s, ph * s, Pm[1], a);
      shadeShape(t, Pm, 0.45, 0.55);
      t.ell(hx + cos(a) * pd * s * 1.15 - 0.5, hy + sin(a) * pd * s * 1.15 - 0.5, pw * 0.3, ph * 0.2, Pm[0], a, inside(t));
    });
    // stage 1+: dark nectar lines on the side and bottom petals
    if (stage >= 1) {
      const NL = mixHex(M[2], '#5a3a8a', 0.45);
      for (const [a] of pets.slice(2)) for (const d of [-0.28, 0, 0.28]) {
        const b = a + d, l = d ? 1.6 : 2.2;
        stroke(g, [[hx + cos(b) * (fr + 0.4), hy + sin(b) * (fr + 0.4)], [hx + cos(b) * (fr + 0.4 + l), hy + sin(b) * (fr + 0.4 + l)]], 0.2, 0.18, NL);
      }
    }
    piece(g, t => A.softBody(t, hx, hy, fr, fr * 0.96, Fc));
    // stage 2: a tiny gold crown on top of the face
    if (stage === 2) {
      const x = hx + 0.2, y = hy - fr + 0.6;
      piece(g, t => {
        t.poly([[x - 2.4, y], [x - 2.7, y - 2.4], [x - 1.2, y - 1.2], [x, y - 2.9], [x + 1.2, y - 1.2], [x + 2.7, y - 2.4], [x + 2.4, y]], GOLD[1]);
        for (const dx of [-2.7, 0, 2.7]) t.ell(x + dx, y - (dx ? 2.5 : 3.0), 0.5, 0.5, GOLD[1]);
        shadeShape(t, GOLD, 0.3, 0.4);
      });
      g.ell(x, y - 0.9, 0.55, 0.5, '#ff8fb4');
    }
    // the tiny leaf it holds up by its cheek (higher for a cheer)
    const lu = P.arms === 'up' ? -fr * 0.7 : 0, lx = hx + fr + 1.4, ly = hy + fr * 0.62 + lu;
    piece(g, t => { stroke(t, [[16.8, 28.0], [lx + 0.6, hy + fr * 1.15 + lu * 0.5], [lx + 0.2, ly + 0.6]], 0.4, 0.38, C.stem); pointLeaf(t, lx + 0.2, ly + 0.8, T(stage, 3.2, 3.4, 3.6), -1.75 + (P.walk && f ? 0.15 : 0), 1.25, L[1]); shadeShape(t, L, 0.3, 0.4); });
    if (stage >= 1) {
      const sp = T(stage, 0, [[hx - pd - pw + 0.4, hy - fr * 0.9, 0.65]], [[hx - pd - pw + 0.2, hy - fr * 1.0, 0.7], [hx + pd + pw - 0.4, hy - fr * 1.1, 0.6]]);
      sp.forEach(([x, y, s], i) => sparkle(g, clampX(x, 1.8), y + ((i + f) % 2 ? -0.4 : 0), s, i % 2 ? '#ffffff' : '#ffd6f0'));
    }
    const ex = hx + 0.5, ey = hy + fr * 0.16, er = fr * 1.12;
    eyes(g, ex, ey, er, P, { bl: { col: '#ff9cbc', w: 1.6, h: 0.9 } });
    lashes(g, ex, ey, er, P);
    A.chibiMouth(g, ex + 0.1, ey + er * 0.48, P.mouth || 'smile', 1.7);
    return { hx: R(hx), hy: R(hy), hr: R(pd + pw * 0.6), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - fr + 0.8), w: R(fr * 1.6) } };
  };

  // =====================================================================================================
  // Goo Peashooter -> Goo Repeater -> Goo Gatling
  // The reference Peashooter in soft purple with lime-green goo: a glossy goo cap over the top of its head with round drips
  // (down the back and one between the eyes, never on them), a goo-coated snout lip with a drip hanging off it, the leaf tuft
  // at the back and the family's red bow tie. Stage 1: a second tuft, a bigger cap with more drips and a floating goo bubble;
  // stage 2: the gatling's 4-barrel snout, the biggest drippy cap and two bubbles.
  PAL.goopeashooter = { main: ['#f2e2ff', '#c9a6ee', '#a884d6'], leaf: ['#dcf8a8', '#a2d862', '#7cb84c'], acc: ['#f2ffc8', '#b8ea5c', '#8cc63e'], stem: '#72bb5a', root: '#a8865a', part: 'goo' };
  ART.goopeashooter = function (g, stage, P, C) {
    const G = C.acc, L = C.leaf, f = P.frame ? 1 : 0, open = P.mouth === 'open';
    const H = peaHead(g, stage, P, C, {
      hole: open ? G[1] : null,
      crest: (hx, hy, r, rx, ry) => piece(g, t => { t.ell(hx - rx * 0.6, hy - ry * 0.86, 3.3, 1.65, flat(L), -0.95); if (stage >= 1) t.ell(hx - rx * 0.92, hy - ry * 0.34, 3.1, 1.55, flat(L), -0.3); }),
    });
    const { hx, hy, rx, ry, r } = H;
    // the goo cap: hugging the top of the head (a touch bigger, so the goo has thickness) with a wavy lower edge and round drips
    const capY = hy - ry * T(stage, 0.4, 0.36, 0.32), wav = x => sin(x * 1.5) * 0.45;
    const drips = T(stage, [[-0.8, 3.0], [0.06, 1.3]], [[-0.8, 3.4], [-0.98, 1.8], [0.06, 1.5]], [[-0.8, 3.6], [-0.98, 2.0], [0.06, 1.6], [0.76, 2.0]]);
    piece(g, t => {
      t.ell(hx - 0.2, hy - 0.1, rx + 0.55, ry + 0.55, G[1], -0.06, fm((x, y) => y <= capY + wav(x)));
      for (const [kx, len] of drips) {
        const x = hx + kx * rx, y0 = Math.max(capY - 0.6, hy - ry * Math.sqrt(Math.max(0, 1 - kx * kx)) + 0.4), l = len + (f && kx < 0 ? 0.4 : 0);
        stroke(t, [[x, y0], [x, y0 + l]], 0.62, 0.55, G[1]); t.ell(x, y0 + l + 0.2, 0.9, 1.0, G[1]);
      }
      shadeShape(t, G, 0.4, 0.5);
      shine(t, hx - rx * 0.45, hy - ry * 0.78, 1.2, 0.45, G[0], -0.35);
      t.dot(hx + rx * 0.1, hy - ry * 0.86, G[0]);
    });
    // goo on the snout: a blob over the lip and a drip hanging off it
    piece(g, t => {
      t.ell(H.ox - 0.1, H.sy - H.rh * 0.98, H.rw * 0.9, H.rh * 0.32, G[1]);
      const dl = T(stage, 1.2, 1.5, 1.9) + f * 0.4;
      stroke(t, [[H.ox + 0.4, H.sy + H.rh - 0.4], [H.ox + 0.4, H.sy + H.rh + dl]], 0.5, 0.45, G[1]); t.ell(H.ox + 0.4, H.sy + H.rh + dl + 0.2, 0.75, 0.85, G[1]);
      shadeShape(t, G, 0.3, 0.4);
    });
    // floating goo bubbles (stage 1+)
    const bub = T(stage, [], [[hx - rx - 1.6, hy - ry * 0.95, 1.1]], [[hx - rx - 1.8, hy - ry * 0.9, 1.2], [hx + rx + 3.4, hy - ry * 0.95, 0.95]]);
    bub.forEach(([x, y, s], i) => piece(g, t => { const yy = y + ((i + f) % 2 ? -0.5 : 0), xx = clampX(x, 1.6 + s); t.ell(xx, yy, s, s, G[1]); shadeShape(t, G, 0.3, 0.35); t.ell(xx - s * 0.35, yy - s * 0.38, s * 0.3, s * 0.22, G[0], -0.5, inside(t)); }));
    bowTie(g, hy + ry * 0.95);
    eyes(g, H.ex, H.ey, r, P);
    return peaGeom(g, H);
  };

  // =====================================================================================================
  // Electric Peashooter -> Electric Repeater -> Electric Gatling
  // The reference Peashooter in baby blue, with yellow lightning bolts for its leaf crest, a crackly snout (a yellow lip and a
  // zigzag crack along the tube) and the family's red bow tie; sparks crackle round it by stage. Stage 1: two bolts and two
  // sparks; stage 2: three bolts, the 4-barrel snout and more sparks.
  PAL.electricpeashooter = { main: ['#e6f4ff', '#a2cdf6', '#7eaae2'], leaf: LEAF, acc: ['#fffbd0', '#ffe45a', '#f2bc3a'], stem: '#72bb5a', root: '#a8865a', part: 'bolt' };
  ART.electricpeashooter = function (g, stage, P, C) {
    const Y = C.acc, f = P.frame ? 1 : 0, open = P.mouth === 'open';
    const crest = T(stage, [[-0.62, -0.8, 6.0, -2.3]], [[-0.5, -0.84, 6.0, -2.0], [-0.84, -0.4, 5.0, -2.55]], [[-0.1, -0.9, 5.4, -1.7], [-0.52, -0.82, 6.0, -2.12], [-0.82, -0.42, 4.5, -2.45]]);
    const H = peaHead(g, stage, P, C, {
      lip: Y[1], hole: open ? '#fffbd0' : null,
      crest: (hx, hy, r, rx, ry) => crest.forEach(([kx, ky, len, a], i) => piece(g, t => {
        const x = hx + kx * rx, y = hy + ky * ry, w = T(stage, 3.6, 3.8, 4.0) * (i === 1 && stage === 2 ? 1.06 : 1);
        bolt(t, x, y, len * (P.walk && f ? 1.05 : 1), a + (i % 2 ? -0.05 : 0.05) * f, w, Y[1]);
        shadeShape(t, Y, 0.35, 0.45);
      })),
    });
    const { hx, hy, ry, r, sy, th, x0, x1 } = H;
    // the crackle along the snout tube
    stroke(g, [[x0 + 1.2, sy - th * 0.15], [x0 + 1.9, sy + th * 0.35], [x0 + 2.6, sy - th * 0.3], [x1 - 0.6, sy + th * 0.2]], 0.24, 0.22, Y[2]);
    // the sparks
    const sp = T(stage, [[H.ox + 2.2, sy - H.rh - 1.4, 0.75]], [[H.ox + 2.2, sy - H.rh - 1.4, 0.8], [H.ox + 2.0, sy + H.rh + 1.6, 0.7]],
      [[H.ox + 2.3, sy - H.rh - 1.5, 0.85], [H.ox + 2.1, sy + H.rh + 1.7, 0.75], [hx - H.rx - 1.4, hy + ry * 0.2, 0.7], [hx + 1.0, hy - ry - 2.2, 0.65]]);
    sp.forEach(([x, y, s], i) => zap(g, clampX(x, 2.3), y + ((i + f) % 2 ? -0.5 : 0), s * ((i + f) % 2 ? 0.85 : 1), Y[1]));
    bowTie(g, hy + ry * 0.95);
    eyes(g, H.ex, H.ey, r, P);
    return peaGeom(g, H);
  };

  // =====================================================================================================
  // Solar Tomato -> Sun Tomato -> Mega Solar Tomato
  // A round shiny red tomato (soft lobes, a big glossy highlight) with a green star-shaped sepal crown and a stem nub on top, cool
  // sunglasses pushed UP onto the crown (its big glossy eyes stay in view below them) and a little sun behind it: a pale disc
  // with four rays over the top at stage 0, six at stage 1, a whole ring of rays and a warm glow at stage 2.
  PAL.solartomato = { main: ['#ffe0d4', '#ff907a', '#ec6c5e'], leaf: ['#c8f0a0', '#78c460', '#58a250'], acc: ['#fff6c4', '#ffd75a', '#f4b03a'], stem: '#5a9a48', root: '#8a6a3a', part: 'shades' };
  const SHADES = ['#9a88d2', '#57478a', '#45386e'];
  ART.solartomato = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, L = C.leaf, S = C.acc, f = P.frame ? 1 : 0;
    const r = T(stage, 8.0, 8.8, 9.6), rx = r * 1.08, ry = r * 0.92, hx = 15.4, hy = 26.2 - ry + h;
    const edge = a => 1 / Math.sqrt((cos(a) / rx) ** 2 + (sin(a) / ry) ** 2);
    // a little sun behind the tomato: a pale sunny disc peeking out round it with rays fanned off it, none straight up behind the
    // stem (they turn a little on frame 1): four over the top, then six, then a whole ring
    const turn = f ? 0.07 : 0, rl = T(stage, 2.6, 2.9, 3.2), wb = T(stage, 1.05, 1.1, 1.15), hr = T(stage, 1.0, 1.2, 1.4), SUN = lt(S[1], 0.45);
    const rays = stage === 2 ? Array.from({ length: 12 }, (_, i) => -PI / 2 + PI / 12 + i * PI / 6) : T(stage, [-1.05, -0.45, 0.45, 1.05], [-1.5, -0.95, -0.42, 0.42, 0.95, 1.5]).map(d => -PI / 2 + d);
    piece(g, t => {
      t.ell(hx, hy - 0.2, rx + hr, ry + hr, SUN);
      rays.forEach((a0, i) => {
        const a = a0 + turn;
        if (sin(a) > 0.45) return;
        const d = edge(a) + hr + 0.4, cs = cos(a), sn = sin(a), room = Math.abs(cs) > 0.1 ? (cs < 0 ? hx - 1.4 : 30.6 - hx) / Math.abs(cs) - d : 99, l = Math.min(rl * (i % 2 ? 0.82 : 1), room);
        t.poly([[hx + cs * (d - 1) - sn * wb, hy + sn * (d - 1) + cs * wb], [hx + cs * (d + l), hy + sn * (d + l)], [hx + cs * (d - 1) + sn * wb, hy + sn * (d - 1) - cs * wb]], S[1]);
        t.ell(hx + cs * (d + l - 0.35), hy + sn * (d + l - 0.35), 0.45, 0.45, S[1]);
      });
      shadeShape(t, S, 0.3, 0.4);
    });
    baseLeaves(g, P, L);
    // the tomato: a wide round body with two soft lobes underneath
    piece(g, t => {
      t.ell(hx, hy, rx, ry, M[1]);
      for (const s of [-1, 1]) t.ell(hx + s * rx * 0.42, hy + ry * 0.14, rx * 0.62, ry * 0.84, M[1]);
      shadeShape(t, M, rx * 0.12, ry * 0.15);
      shine(t, hx - rx * 0.5, hy - ry * 0.32, rx * 0.2, ry * 0.15, M[0]);
      t.ell(hx - rx * 0.66, hy - ry * 0.04, 0.4, 0.4, M[0], 0, inside(t));
    });
    // the star-shaped sepal crown and the stem nub
    const sx = hx - 0.3, sy = hy - ry + 1.2, sl = T(stage, 3.6, 4.0, 4.4);
    piece(g, t => {
      for (const [a, k] of [[PI - 0.3, 1], [PI + 0.42, 0.95], [-PI / 2 - 0.5, 0.78], [-PI / 2 + 0.5, 0.78], [-0.42, 0.95], [0.3, 1]]) pointLeaf(t, sx, sy, sl * k, a, 1.05, L[1]);
      t.ell(sx, sy, 1.6, 1.1, L[1]);
      shadeShape(t, L, 0.35, 0.45);
    });
    piece(g, t => stroke(t, [[sx, sy], [sx + 0.1, sy - 1.8], [sx + 0.9, sy - 2.6]], 0.55, 0.42, C.stem));
    // the cool shades pushed up onto the crown: two dark lenses in a gold frame on a bar, a bold white glint and a warm sunny
    // reflection on each, kept well above the eyes
    const gy = sy + 1.2, gx = hx + 0.5, lw = T(stage, 2.0, 2.15, 2.3), lh = T(stage, 1.15, 1.25, 1.35), FR = GOLD;
    piece(g, t => {
      stroke(t, [[gx - lw * 2.3, gy + 0.6], [gx - lw * 2.0, gy - 0.4], [gx + lw * 2.05, gy - 0.4], [gx + lw * 2.35, gy + 0.6]], 0.42, 0.42, FR[1]);
      for (const s of [-1, 1]) t.ell(gx + s * lw * 1.12, gy + 0.15, lw + 0.45, lh + 0.42, FR[1], -s * 0.08);
      shadeShape(t, FR, 0.3, 0.4);
      for (const s of [-1, 1]) t.ell(gx + s * lw * 1.12, gy + 0.15, lw, lh, SHADES[1], -s * 0.08);
      shadeShape(t, SHADES, 0.35, 0.45);
      for (const s of [-1, 1]) { const x = gx + s * lw * 1.12; stroke(t, [[x - lw * 0.6, gy + 0.55], [x - lw * 0.05, gy - lh * 0.5]], 0.3, 0.3, '#f4eeff'); t.dot(x + lw * 0.45, gy + lh * 0.4, '#ffb48a'); }
    });
    const ex = hx + 0.8, ey = hy + ry * 0.22, er = r * 0.98;
    eyes(g, ex, ey, er, P);
    A.chibiMouth(g, ex + 0.1, ey + er * 0.5, P.mouth || 'smile', 2.3);
    if (stage === 2) glow(g, hx, hy, Math.max(rx, ry) + rl + 0.4, '255,214,110', 0.28);
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(gy - 0.4), w: R(rx * 1.5) } };
  };

  // =====================================================================================================
  // Cold Snapdragon -> Cold Dragon -> Blizzard Dragon
  // An icy blue dragon-flower head facing right, built like the Snapdragon: a round skull with a short snout, a round nose (two
  // nostrils) and a pale underside, a happy smile with one clear white fang, two big glossy eyes and big white frosty horns swept
  // back. Its signature, like the Snapdragon's orange frill: a bold scalloped frill of deep icy-blue crystal fins with white
  // frosted tips running from the top of the skull down the back of the head, outside its outline. A frosty breath puff floats
  // up just off its nose. Brave and cheerful, never mad. The frill, horns and breath grow by stage; stage 1 adds a snowflake,
  // stage 2 two more.
  PAL.coldsnapdragon = { main: ['#eef9ff', '#a6d8f4', '#80b8e2'], leaf: ['#d4f4e0', '#90d6ac', '#68b68c'], acc: ['#d8f4ff', '#4fb0e0', '#3a8cc4'], stem: '#68b68c', root: '#6a8a9a', part: 'jaws' };
  const HORN = ['#ffffff', '#f4faff', '#b4d8f0'], HORN_BASE = '#94c6e8';
  // an icy crystal shard from its base (x, y), len long along ang, half width w
  function shard(t, x, y, len, ang, w, col) { const c = cos(ang), s = sin(ang), Q = (u, v) => [x + c * len * u - s * w * v, y + s * len * u + c * w * v]; t.poly([Q(0, -0.7), Q(0.6, -1), Q(1, 0), Q(0.6, 1), Q(0, 0.7)], col); }
  // a tiny six-armed snowflake
  const flake = (g, x, y, s) => piece(g, t => { for (let i = 0; i < 3; i++) { const a = i * PI / 3 + 0.3; stroke(t, [[x - cos(a) * s, y - sin(a) * s], [x + cos(a) * s, y + sin(a) * s]], 0.22, 0.22, WHITE); } });
  // the frill fins by stage: [angle round the head, length] from the top of the skull down the back, long and short in turn
  const FROST_FINS = [
    [[-2.0, 3.8], [-2.42, 4.4], [-2.84, 4.0], [-3.26, 3.0]],
    [[-1.95, 4.0], [-2.29, 5.0], [-2.63, 4.4], [-2.97, 4.6], [-3.31, 3.2]],
    [[-1.9, 4.4], [-2.18, 5.8], [-2.46, 5.0], [-2.74, 5.6], [-3.02, 4.6], [-3.3, 3.4]],
  ];
  ART.coldsnapdragon = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, Ic = C.acc, f = P.frame ? 1 : 0, open = P.mouth === 'open' || P.mouth === 'grin' || P.mouth === 'o';
    const r = T(stage, 7.2, 7.9, 8.6), hx = T(stage, 13.0, 12.9, 13.2), hy = 26.0 - r * 0.92 + h, drop = open ? r * 0.2 : 0, sway = P.walk && f ? 0.07 : 0;
    baseLeaves(g, P, C.leaf, { cx: 15.0 });
    stem(g, 14.4, 28.6, hy + r * 0.8, C.stem);
    // the icy frill: each crystal fin its own piece (nape first, so the upper ones lie over it), rooted just inside the skull so
    // the head's edge covers its base; a pale facet line and a white frosted tip. A fin pointing back is cut short so its tip
    // stays inside the frame.
    const fw = T(stage, 1.7, 1.85, 2.0);
    for (const [a0, l0] of FROST_FINS[stage].slice().reverse()) {
      const a = a0 + sway, x = hx + cos(a) * r * 0.8, y = hy + sin(a) * r * 0.74, L = cos(a) < -0.2 ? Math.min(l0 + r * 0.2, (x - 2.0) / -cos(a)) : l0 + r * 0.2;
      piece(g, t => {
        shard(t, x, y, L, a, fw, Ic[1]);
        shadeShape(t, Ic, 0.4, 0.5);
        stroke(t, [[x + cos(a) * L * 0.35, y + sin(a) * L * 0.35], [x + cos(a) * L * 0.72, y + sin(a) * L * 0.72]], 0.24, 0.2, Ic[0]);
        t.ell(x + cos(a) * L * 0.95, y + sin(a) * L * 0.95, L * 0.13, fw * 0.5, WHITE, a, inside(t));
      });
    }
    // two big white frosty horns swept back off the top of the skull: a light-blue shade side and a deeper icy band at the base
    const hk = T(stage, 1, 1.12, 1.25);
    for (const [ka, da, L, W] of [[-1.98, -0.22, 6.6, 2.1], [-1.5, -0.42, 6.0, 1.95]]) {
      const bx = hx + cos(ka) * r * 0.74, by = hy + sin(ka) * r * 0.7, a = ka + da, c = cos(a), s = sin(a), l = L * hk, w = W * hk;
      // (v runs across the horn, sh picks its side away from the light; the tip bends back a little)
      const sh = 0.6 * s - 0.8 * c > 0 ? -1 : 1, E = (u, v) => [bx + c * l * u - s * w * v * sh - u * u * hk, by + s * l * u + c * w * v * sh + u * u * 0.3];
      piece(g, t => {
        t.poly([E(0, -1), E(0.45, -0.8), E(0.8, -0.4), E(1, 0), E(0.8, 0.36), E(0.45, 0.7), E(0, 1)], HORN[1]);
        t.poly([E(0, 0.12), E(0.45, 0.08), E(0.8, 0.02), E(1, 0), E(0.8, 0.36), E(0.45, 0.7), E(0, 1)], HORN[2]);
        t.poly([E(0, -1), E(0.42, -0.84), E(0.42, 0.72), E(0, 1)], HORN_BASE);
        t.ell(...E(0.58, -0.42), l * 0.16, 0.32, WHITE, a, inside(t));
      });
    }
    // the head: a round skull, fuller at the back, a short snout, a round nose and the jaw below it, all one piece; the snout's
    // underside and the jaw are pale (it drops open for a roar)
    const sx = hx + r * 0.8, sy = hy + r * 0.26, my = hy + r * 0.6, cut = open ? fm((x, y) => y < my - 0.3) : null;
    if (open) piece(g, t => { t.poly([[hx + r * 0.42, my - 0.4], [hx + r * 1.42, my - 0.6], [hx + r * 1.36, my + 0.5 + drop], [hx + r * 0.5, my + 0.6 + drop]], '#c25a74'); t.ell(hx + r * 0.9, my + drop * 0.7 + 0.2, r * 0.26, 0.55, '#ff9aae'); });
    piece(g, t => {
      t.ell(hx, hy, r, r * 0.92, M[1]);
      t.ell(hx - r * 0.16, hy + r * 0.1, r * 0.88, r * 0.82, M[1]);
      t.ell(sx, sy, r * 0.62, r * 0.4, M[1], -0.05, cut);
      t.ell(hx + r * 1.24, hy + r * 0.16, r * 0.28, r * 0.27, M[1], 0, cut);
      t.ell(hx + r * 0.84, hy + r * 0.64 + drop, r * 0.58, r * 0.26, M[1], 0.04, open ? fm((x, y) => y > my + 0.2 + drop * 0.5) : null);
      shadeShape(t, M, r * 0.12, r * 0.13);
      // the pale underside: the bottom of the snout and the jaw
      t.ell(hx + r * 0.88, my + drop * 0.5 + 0.2, r * 0.6, r * 0.24, M[0], 0.04, fm((x, y) => t.get(x, y) === M[1] && (!open || y > my)));
      shine(t, hx - r * 0.45, hy - r * 0.48, r * 0.2, r * 0.13, M[0]);
      t.ell(sx + r * 0.05, sy - r * 0.22, r * 0.22, 0.3, M[0], -0.1, inside(t));
    });
    g.ell(hx + r * 1.34, hy + r * 0.04, 0.42, 0.3, M[2]);
    g.ell(hx + r * 1.08, hy + r * 0.0, 0.36, 0.26, M[2]);
    // the happy smile along the bottom of the snout, curling up at the cheek, with one clear white fang over the lip (open: two)
    const front = hx + r * 1.52;
    if (!open) {
      stroke(g, [[hx + r * 0.36, my - 1.1], [hx + r * 0.46, my - 0.3], [hx + r * 0.9, my + 0.05], [hx + r * 1.42, my - 0.25]], 0.3, 0.3, INK);
      piece(g, t => t.poly([[hx + r * 0.98, my + 0.25], [hx + r * 1.2, my + 0.2], [hx + r * 1.1, my + 1.35]], WHITE));
    } else for (const u of [0.62, 1.12]) piece(g, t => t.poly([[hx + r * u - 0.5, my - 0.45], [hx + r * u + 0.5, my - 0.5], [hx + r * u, my + 0.6]], WHITE));
    // the frosty breath puff floating up just off the nose (a clear gap from it), bigger by stage; snowflakes from stage 1
    const bs = T(stage, 0.95, 1.1, 1.25), na = -1.05 - f * 0.08, nd = r * 0.28 + 1.0 + 1.75 * bs;
    const bx = Math.min(hx + r * 1.24 + cos(na) * nd, 29.6 - 1.9 * bs), byy = hy + r * 0.16 + sin(na) * nd;
    piece(g, t => { for (const [dx, dy, k] of [[-1.0, 0.35, 0.85], [0.95, 0.4, 0.85], [0, -0.45, 1.1]]) t.ell(bx + dx * bs, byy + dy * bs, k * bs * 1.1, k * bs, FROST[1]); shadeShape(t, FROST, 0.3, 0.4); });
    if (stage >= 1) flake(g, clampX(bx + 1.6, 2.4), byy - 2.7 * bs - f * 0.3, 1.0);
    if (stage === 2) { flake(g, clampX(bx + 1.6, 3), byy + 2.9 * bs + f * 0.3, 0.85); flake(g, clampX(hx - r - 2.6, 2.6), hy + r * 0.5 + f * 0.3, 0.85); }
    const ex = hx + 0.1, ey = hy - r * 0.02;
    eyes(g, ex, ey, r, P, { eye: { sp: r * 0.82 } });
    return { hx: R(hx + 1), hy: R(hy), hr: R(r), top: topOf(g), ey: R(ey), front: R(front), hat: { x: R(hx - 0.3), y: R(hy - r * 0.92 + 1.4), w: R(r * 1.4) } };
  };

  // =====================================================================================================
  // Shine Vine -> Bright Vine -> Radiant Vine
  // A round leafy bud head (two wrapped leaves meeting in a little curled tip on top) with a deep green vine spiralling round it:
  // up from a base leaf behind the bud's back, then in front over its crown and diagonally down its front side to a curl, a
  // bright lime-yellow glowing line down its middle. Its signature: big warm yellow light flowers on the vine that glow like
  // little lamps, each with a clear halo. One flower at stage 0, three at stage 1, five and a second vine strand at stage 2.
  PAL.shinevine = { main: ['#e6fac8', '#a2dc80', '#7cbc66'], leaf: LEAF, acc: ['#f2ff7a', '#6cc048', '#4e9c3a'], stem: '#62ac50', root: '#8a6a3a', part: 'vine' };
  const LIGHT = ['#ffffff', '#fffbd2', '#ffe14a'], LAMP = '#fff27a';
  // a vine strand: deep green, shaded, with its glowing core line
  const vineStrand = (g, pts, V, r0, r1) => piece(g, t => { stroke(t, pts, r0, r1, V[1]); shadeShape(t, V, 0.3, 0.35); stroke(t, pts, 0.2, 0.18, V[0]); });
  ART.shinevine = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, V = C.acc, L = C.leaf, f = P.frame ? 1 : 0;
    const r = T(stage, 7.8, 8.6, 9.4), rx = r, ry = r * 0.95, hx = 15.4, hy = 26.2 - ry + h, vw = P.walk && f ? 0.3 : 0;
    baseLeaves(g, P, L);
    // stage 2: a second, thinner strand off the left base leaf, out low behind the bud to hang a lamp
    if (stage === 2) piece(g, t => { stroke(t, [[hx - 4.4, 28.0], [hx - rx * 0.8, hy + ry * 1.0], [hx - rx - 0.6, hy + ry * 0.8]], 0.45, 0.4, V[1]); shadeShape(t, V, 0.3, 0.35); });
    // the vine's back half: up from the left base leaf, behind the bud along its back edge (only its outer side shows)
    vineStrand(g, [[hx - 4.0, 28.2], [hx - rx * 0.84, hy + ry * 0.78], [hx - rx - 0.35, hy + ry * 0.2 - vw], [hx - rx - 0.25, hy - ry * 0.3], [hx - rx * 0.78, hy - ry * 0.74]], V, 0.62, 0.6);
    // the bud: two wrapped leaves meeting in a little pointed tip that curls forward
    piece(g, t => {
      t.ell(hx, hy, rx, ry, M[1]);
      t.ell(hx - 0.2, hy + ry * 0.2, rx * 0.98, ry * 0.8, M[1]);
      t.poly([[hx - 2.6, hy - ry + 1.6], [hx - 0.8, hy - ry - 1.0], [hx + 1.2, hy - ry - 2.6], [hx + 1.0, hy - ry - 0.6], [hx + 2.6, hy - ry + 1.6]], M[1]);
      shadeShape(t, M, rx * 0.13, ry * 0.15);
      shine(t, hx - rx * 0.5, hy - ry * 0.25, rx * 0.16, ry * 0.11, M[0]);
    });
    // the seam where the two leaves wrap round (down the back side, clear of the face)
    stroke(g, [[hx + 0.7, hy - ry - 0.4], [hx - rx * 0.4, hy - ry * 0.62], [hx - rx * 0.74, hy - ry * 0.1], [hx - rx * 0.8, hy + ry * 0.4]], 0.22, 0.22, mixHex(M[1], M[2], 0.8));
    // the light flowers on the vine (crown first; none over the eyes) and their warm halo on the bud
    const s0 = T(stage, 1.4, 1.5, 1.6);
    // (spread round the spiral: the crown, the front curl, the back, then the front shoulder and the second strand's end)
    const CURL = [hx + rx + 0.7, hy + ry * 0.2 + vw * 0.5], BACK = [hx - rx - 0.3, hy - ry * 0.05], CROWN = [hx - rx * 0.3, hy - ry * 0.88];
    const fl = T(stage, [[...CROWN, 1]], [[...CROWN, 1], [...CURL, 0.94], [...BACK, 0.92]],
      [[...CROWN, 1], [...CURL, 0.92], [...BACK, 0.9], [hx + rx * 0.8, hy - ry * 0.52, 0.9], [hx - rx - 0.6, hy + ry * 0.8, 0.86]]).map(([x, y, k]) => [x, y, s0 * k]);
    const HALO = mixHex(M[1], '#fff27a', 0.5);
    for (const [x, y, s] of fl) g.ell(x, y, 2.5 * s, 2.35 * s, HALO, 0, fm((xx, yy) => { const c = g.get(xx, yy); return c === M[0] || c === M[1] || c === M[2]; }));
    // the vine's front half: in front over the crown and diagonally down the front side, ending in a curl past the bud's edge
    const front = [[hx - rx * 0.9, hy - ry * 0.56], [hx - rx * 0.55, hy - ry * 0.86], [hx - 0.1, hy - ry * 0.93], [hx + rx * 0.5, hy - ry * 0.72], [hx + rx * 0.86, hy - ry * 0.32], [hx + rx * 0.98, hy + ry * 0.1 + vw * 0.5], [hx + rx + 0.1, hy + ry * 0.42 + vw], ...spiral(hx + rx + 1.3, hy + ry * 0.66 + vw, -PI + 0.3, 1.5, -1, 9)];
    vineStrand(g, front, V, 0.62, 0.42);
    // two little leaves on the vine
    for (const [x, y, a] of [[hx - rx * 0.66, hy - ry * 0.8, -2.2], [hx + rx * 0.7, hy - ry * 0.58, -0.6]]) piece(g, t => { pointLeaf(t, x, y, 2.6, a, 1.0, L[1]); shadeShape(t, L, 0.3, 0.35); });
    // the flowers: five round warm petals, a glowing heart and a white glint (they twinkle on frame 1)
    fl.forEach(([x, y, s], i) => piece(g, t => {
      const tw = (i + f) % 2 ? 0.3 : 0;
      for (let k = 0; k < 5; k++) { const a = -PI / 2 + tw + k * 2 * PI / 5; t.ell(x + cos(a) * 0.95 * s, y + sin(a) * 0.95 * s, 0.85 * s, 0.7 * s, LIGHT[1], a); }
      shadeShape(t, LIGHT, 0.3, 0.35);
      t.ell(x, y, 0.66 * s, 0.62 * s, LAMP); t.ell(x - 0.25 * s, y - 0.25 * s, 0.24 * s, 0.2 * s, LIGHT[0]);
    }));
    const ex = hx + 0.8, ey = hy + ry * 0.2, er = r * 0.96;
    eyes(g, ex, ey, er, P);
    A.chibiMouth(g, ex + 0.1, ey + er * 0.5, P.mouth || 'smile', 2.2);
    // the lamps' glow on the lawn round them
    for (const [x, y, s] of fl) glow(g, x, y, 2.3 * s + 0.8, '255,236,110', 0.5);
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - ry + 1.2), w: R(rx * 1.5) } };
  };

  // =====================================================================================================
  // Sling Pea -> Sling Repeater -> Mega Sling Pea
  // A wide pale pea-pod bean (the face) with a pointed tip at the back, split open along its top in a lens-shaped seam that shows
  // the dark green inside, bright green peas sitting half-sunk in it (one, two, then three), holding up a big Y-shaped twig
  // slingshot in a short leaf hand at its front side: a bold red-pink band and a bright pea loaded in it. The slingshot grows by
  // stage.
  PAL.slingpea = { main: ['#f8fcdc', '#d6ec98', '#b0cc6c'], leaf: LEAF, acc: ['#d6f5a8', '#8fd85a', '#68b844'], stem: '#62ac50', root: '#8a6a3a', part: 'slingshot' };
  const TWIG = ['#f0d4a8', '#c09264', '#9a7046'], SLING = ['#ff9cb4', '#ff5c84', '#e04470'], SEAM = '#4e8a3e';
  ART.slingpea = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, Pe = C.acc, L = C.leaf, f = P.frame ? 1 : 0;
    const r = T(stage, 7.6, 8.2, 8.8), rx = r * 1.2, ry = r * 0.8, hx = T(stage, 13.8, 14.1, 14.5), hy = 26.3 - ry + h, rot = -0.06;
    // (the pointed back tip is cut short if it would end less than 2 px from the frame's edge, so its outline stays clear of it)
    const tip = Math.min(T(stage, 2.2, 2.0, 1.7), hx - rx - 2.3);
    baseLeaves(g, P, L, { cx: 15.0 });
    stem(g, 15, 28.6, hy + ry - 1, C.stem);
    // the pod: a wide bean with a pointed tip at the back, all one piece
    piece(g, t => {
      t.ell(hx, hy, rx, ry, M[1], rot);
      t.ell(hx - rx * 0.1, hy + ry * 0.2, rx * 0.92, ry * 0.8, M[1], rot);
      stroke(t, [[hx - rx * 0.8, hy + ry * 0.12], [hx - rx - 1.0, hy + ry * 0.14], [hx - rx - tip * 0.82, hy + ry * 0.02], [hx - rx - tip, hy - ry * 0.14]], 1.3, 0.3, M[1]);
      shadeShape(t, M, rx * 0.1, ry * 0.15);
      shine(t, hx - rx * 0.6, hy + ry * 0.02, rx * 0.13, ry * 0.12, M[0]);
    });
    // the open seam along the top: a lens showing the dark inside, its far wall catching a little light
    const podTop = x => hy - ry * Math.sqrt(Math.max(0, 1 - ((x - hx) / rx) ** 2)) - (x - hx) * 0.06;
    const xa = hx - rx * 0.78, xb = hx + rx * 0.6, th = T(stage, 2.2, 2.4, 2.6), lu = x => (x - xa) / (xb - xa);
    const yU = x => podTop(x) + 0.6, yL = x => yU(x) + th * sin(PI * Math.max(0, Math.min(1, lu(x))));
    piece(g, t => {
      const up = [], lo = [];
      for (let i = 0; i <= 12; i++) { const x = xa + (xb - xa) * i / 12; up.push([x, yU(x)]); lo.push([x, yL(x)]); }
      t.poly(up.concat(lo.reverse()), SEAM);
      for (let x = xa + 0.6; x < xb - 0.6; x += 0.25) t.dot(x, yU(x) + 0.3, mixHex(SEAM, M[1], 0.4));
    });
    // the peas sitting half-sunk in it: each its own piece with a white shine, its lower half hidden behind the pod's front lip
    const pr = T(stage, 2.0, 2.15, 2.3), peas = T(stage, [-0.1], [-0.34, 0.12], [-0.46, -0.08, 0.3]);
    peas.forEach((kx, i) => piece(g, t => {
      const x = hx + kx * rx, y = yU(x) + th * 0.3 + ((i + f) % 2 && P.walk ? -0.4 : 0);
      t.ell(x, y, pr, pr * 0.95, Pe[1], 0, fm((xx, yy) => yy <= yL(xx) - 0.1));
      shadeShape(t, Pe, 0.35, 0.4);
      t.ell(x - pr * 0.38, y - pr * 0.42, pr * 0.34, pr * 0.24, WHITE, -0.5, inside(t));
    }));
    // the slingshot held up at the pod's front (higher for a cheer): a chunky twig handle rising past the pod's front edge to a
    // wide Y fork well clear of the face, a bold red-pink band across its prongs and a bright pea loaded between them (above
    // the fork, so the whole Y shows)
    const k = T(stage, 0.95, 1.02, 1.08), lift = P.arms === 'up' ? -1.6 : P.walk && f ? -0.4 : 0;
    const jx = hx + rx + 0.4, jy = hy - ry * 0.5 + lift, sb = hy + ry * 0.55 + lift;
    const ax = jx - 2.7 * k, bx = jx + 2.7 * k, ty = jy - 4.6 * k, px = jx + 0.05, py = ty + 1.5 * k;
    piece(g, t => {
      stroke(t, [[jx - 0.3, sb], [jx, jy + 0.4]], 0.86 * k, 0.8 * k, TWIG[1]);
      stroke(t, [[jx, jy + 0.6], [jx - 2.2 * k, jy - 1.3 * k], [ax, ty]], 0.72 * k, 0.6 * k, TWIG[1]);
      stroke(t, [[jx, jy + 0.6], [jx + 2.2 * k, jy - 1.2 * k], [bx, ty + 0.2]], 0.72 * k, 0.6 * k, TWIG[1]);
      shadeShape(t, TWIG, 0.3, 0.4);
      t.ell(jx - 0.45 * k, (sb + jy) / 2, 0.22, (sb - jy) * 0.28, TWIG[0], 0, fm((x, y) => t.get(x, y) === TWIG[1]));
    });
    piece(g, t => { stroke(t, [[ax + 0.1, ty + 0.3], [px - 1.3, py + 1.3 * k], [px, py + 1.95 * k], [px + 1.3, py + 1.3 * k], [bx - 0.1, ty + 0.5]], 0.5, 0.5, SLING[1]); shadeShape(t, SLING, 0.25, 0.3); });
    piece(g, t => { t.ell(px, py, 1.62 * k, 1.55 * k, Pe[1]); shadeShape(t, Pe, 0.3, 0.35); t.ell(px - 0.55, py - 0.6, 0.5, 0.36, WHITE, -0.5, inside(t)); });
    // the short leaf hand gripping the handle low at the pod's front side
    piece(g, t => { t.ell(jx - 0.2, sb - 0.9, 1.9, 1.25, L[1], -0.55); t.ell(jx + 1.0, sb - 1.9, 0.75, 0.6, L[1], -0.55); shadeShape(t, L, 0.3, 0.35); });
    const ex = hx + 0.6, ey = hy + ry * 0.22, er = r * 0.96;
    eyes(g, ex, ey, er, P);
    A.chibiMouth(g, ex + 0.1, ey + er * 0.5, P.mouth || 'smile', 2.2);
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), front: R(bx + 0.7), hat: { x: R(hx), y: R(hy - ry + 1.2), w: R(rx * 1.3) } };
  };

  // =====================================================================================================
  // Apple Mortar -> Apple Cannon -> Apple Artillery
  // A shiny red apple (two soft shoulders with a dimple between them, a little brown stem and a leaf) with a stubby steel mortar
  // tube standing at its back, aiming up and a little back, an apple sitting ready in its mouth. The tube grows by
  // stage: a band at stage 1, two bands and rivets at stage 2.
  PAL.applemortar = { main: ['#ffdadc', '#f4767e', '#d65a68'], leaf: LEAF, acc: ['#f2f5fa', '#bcc6d6', '#929eb4'], stem: '#62ac50', root: '#8a6a3a', part: 'basket' };
  const APPLE_STEM = '#a8784c';
  ART.applemortar = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, S = C.acc, L = C.leaf, f = P.frame ? 1 : 0;
    const r = T(stage, 8.0, 8.8, 9.6), rx = r * 1.04, ry = r * 0.94, hx = T(stage, 18.2, 18.5, 18.8), hy = 26.2 - ry + h;
    baseLeaves(g, P, L, { cx: 17.2 });
    stem(g, 17.8, 28.6, hy + ry - 1, C.stem);
    // the mortar tube: standing at the apple's back edge (so most of it shows), aiming up and a little back
    const tr = T(stage, 2.2, 2.5, 2.8), tl = T(stage, 7.4, 8.0, 8.6), ta = -PI / 2 - 0.36 + (P.walk && f ? 0.05 : 0);
    const ca = cos(ta), sa = sin(ta), bx = hx - rx * 0.88, by = hy + ry * 0.3, mx = bx + ca * tl, my = by + sa * tl;
    // (u along the tube from its base, v across it: negative v is its outer, lit side)
    const at = (u, v) => [bx + ca * u - sa * v, by + sa * u + ca * v];
    piece(g, t => {
      stroke(t, [[bx, by], [mx, my]], tr, tr * 1.08, S[1]);
      shadeShape(t, S, 0.5, 0.6);
      // a steel band (stage 1+) and a second one (stage 2)
      for (const u of T(stage, [], [0.62], [0.5, 0.74])) t.poly([at(tl * u - 0.5, -tr * 1.2), at(tl * u + 0.5, -tr * 1.2), at(tl * u + 0.5, tr * 1.2), at(tl * u - 0.5, tr * 1.2)], mixHex(S[1], S[2], 0.7));
      t.ell(mx, my, 1.0, tr * 1.08 + 0.5, S[0], ta);
      t.ell(mx + ca * 0.25, my + sa * 0.25, 0.55, tr * 0.86, mixHex(S[2], HOLE, 0.55), ta);
      const [lx, ly] = at(tl * 0.36, -tr * 0.5); t.ell(lx, ly, tl * 0.14, 0.32, S[0], ta, inside(t));
    });
    if (stage === 2) for (const u of [0.5, 0.74]) for (const v of [-0.35, -0.8]) { const [x, y] = at(tl * u, tr * v); g.dot(x, y, S[0]); }
    // the apple sitting ready in its mouth
    const as = T(stage, 1.6, 1.75, 1.9), apx = mx + ca * 1.0, apy = my + sa * 1.0 - (P.arms === 'up' ? 0.6 : 0);
    piece(g, t => { t.ell(apx - as * 0.35, apy, as * 0.7, as * 0.82, M[1]); t.ell(apx + as * 0.35, apy, as * 0.7, as * 0.82, M[1]); t.ell(apx, apy + as * 0.2, as * 0.85, as * 0.72, M[1]); shadeShape(t, M, 0.35, 0.4); t.ell(apx - as * 0.45, apy - as * 0.3, as * 0.22, as * 0.15, M[0], -0.5, inside(t)); });
    piece(g, t => { stroke(t, [[apx, apy - as * 0.6], [apx + 0.3, apy - as - 0.6]], 0.3, 0.3, APPLE_STEM); t.ell(apx + 1.0, apy - as - 0.4, 0.8, 0.45, L[1], -0.4); });
    // the apple: two soft shoulders with a dimple between them
    piece(g, t => {
      t.ell(hx, hy + ry * 0.06, rx, ry * 0.94, M[1]);
      for (const s of [-1, 1]) t.ell(hx + s * rx * 0.42, hy - ry * 0.3, rx * 0.62, ry * 0.62, M[1]);
      shadeShape(t, M, rx * 0.12, ry * 0.15);
      shine(t, hx - rx * 0.5, hy - ry * 0.36, rx * 0.19, ry * 0.14, M[0]);
      t.ell(hx - rx * 0.68, hy - ry * 0.06, 0.38, 0.38, M[0], 0, inside(t));
    });
    // the dimple, stem and leaf
    const la = -0.42 + (P.walk && f ? -0.12 : 0), ll = T(stage, 3.8, 4.1, 4.4);
    stroke(g, [[hx - 1.4, hy - ry * 0.86], [hx - 0.2, hy - ry * 0.74], [hx + 1.2, hy - ry * 0.86]], 0.22, 0.22, M[2]);
    piece(g, t => stroke(t, [[hx - 0.1, hy - ry * 0.78], [hx + 0.1, hy - ry - 1.2], [hx + 0.7, hy - ry - 2.2]], 0.48, 0.38, APPLE_STEM));
    piece(g, t => { pointLeaf(t, hx + 0.3, hy - ry - 1.2, ll, la, 1.35, L[1]); shadeShape(t, L, 0.3, 0.4); });
    vein(g, hx + 0.3, hy - ry - 1.2, ll, la, L[2], L[1], 0.2, 0.8);
    const ex = hx + 0.8, ey = hy + ry * 0.22, er = r * 0.98;
    eyes(g, ex, ey, er, P);
    A.chibiMouth(g, ex + 0.1, ey + er * 0.5, P.mouth || 'smile', 2.2);
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - ry + 1.4), w: R(rx * 1.4) } };
  };
})();
