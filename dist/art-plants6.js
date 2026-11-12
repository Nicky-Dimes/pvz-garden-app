// art-plants6.js — PVZ Garden: the newer plants, part 3, in TRUE chibi style (docs/pvz-art-guide.md + docs/chibi-reference.js).
// Imitater, Power Lily, Chard Guard, Sun Bean, A.K.E.E., Gold Leaf, Toadstool, Strawburst, Bowling Bulb, Homing Thistle, Stallia,
// Phat Beet.
// Same contract as art-plants.js: PX.PLANT_ART[id] = function (g, stage, P, C) -> geometry, PX.PLANT_PAL[id] = palette.
// TRUE chibi: the head is the character (half-width about 8 / 9 / 10 by stage, bottom near row 26), each with its own silhouette
// built from 2-3 overlapping shapes, big glossy eyes set low and wide (PX.art.chibiEyes), a tiny mouth, blush, soft flat pastel
// fills with one soft shade, little base leaves; no long stems, no legs. All twelve are friendly. The core adds the bold outer
// edge. Walking = a hop on frame 1; arms:'up' = raised leaves and a little hop.
(function () {
  'use strict';
  if (!window.PX || !PX.art) return;
  const { INK, stroke, starPts } = PX;
  const A = PX.art, mixHex = A.mixHex;
  const ART = PX.PLANT_ART, PAL = PX.PLANT_PAL;
  const piece = (g, f) => PX.piece(g, f);
  // pick a value per stage
  const T = (s, a, b, c) => (s === 2 ? c : s === 1 ? b : a);
  const R = Math.round, PI = Math.PI, cos = Math.cos, sin = Math.sin, WHITE = '#ffffff';
  // head half-width by stage
  const SIZE = [8, 9, 10];
  // flat fill + one soft shade (small parts)
  const flat = C => [C[1], C[1], C[2]];
  const lt = (c, k) => mixHex(c, WHITE, k);
  const mix = (M, c, k) => M.map(x => mixHex(x, c, k));
  // a mask checked at fine-pixel precision
  const fm = fn => { fn.fine = true; return fn; };
  const inside = t => fm((x, y) => t.filled(x, y));
  const LEAF = ['#d2f4ac', '#8fd46e', '#68b058'];
  const GOLD = ['#fff6c0', '#ffd75a', '#e0a83a'];
  const topOf = g => { for (let fy = 0; fy < g.fh; fy++) for (let fx = 0; fx < g.fw; fx++) if (g.fget(fx, fy)) return Math.floor(fy / g.k); return 0; };
  // walking: a hop on frame 1; cheering: a smaller hop; idle frame 1: a tiny bob
  const hopOf = P => (P.walk && P.frame ? -1.5 : P.arms === 'up' ? -1 : P.frame ? 0.3 : 0);

  // ---------------- shared bits ----------------
  // soft shade for any silhouette drawn flat in Rm[1] on a piece layer: the mid-tone pixels whose neighbour (dx, dy) down-right
  // is outside the shape take Rm[2], so the crescent follows the whole outline of several overlapping shapes
  function shadeShape(t, Rm, dx, dy) {
    const k = t.k, ox = Math.max(1, R(dx * k)), oy = Math.max(1, R(dy * k)), W = t.fw, list = [];
    for (let fy = 0; fy < t.fh; fy++) for (let fx = 0; fx < W; fx++) if (t.a[fy * W + fx] === Rm[1] && t.fget(fx + ox, fy + oy) === null) list.push(fy * W + fx);
    for (const i of list) t.a[i] = Rm[2];
  }
  // a small soft highlight (only on the shape)
  const shine = (t, x, y, rx, ry, col, rot) => t.ell(x, y, rx, ry, col, rot == null ? -0.55 : rot, inside(t));
  // two round little base leaves on rows 27-30 (raised for a cheer, flat for arms out)
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
  // a leaf shape from (x, y): length len, angle ang (0 = right, negative = up), width fat * len
  const lf = (t, x, y, len, ang, col, fat) => t.ell(x + cos(ang) * len / 2, y + sin(ang) * len / 2, len / 2, len * (fat || 0.3), col, ang);
  // a petal from (x, y) along angle ang: length len, half width w, shaped by a profile of [along, width] pairs; bend curls the
  // tip sideways (art px at the tip, + = toward the petal's left-hand normal)
  function petal(t, x, y, len, ang, w, col, prof, bend) {
    const c = cos(ang), s = sin(ang), nx = -s, ny = c, b = bend || 0, pts = [];
    const at = (u, k) => [x + c * len * u + nx * (k * w + b * u * u), y + s * len * u + ny * (k * w + b * u * u)];
    for (const [u, k] of prof) pts.push(at(u, k));
    for (let i = prof.length - 2; i >= 0; i--) { const [u, k] = prof[i]; pts.push(at(u, -k)); }
    t.poly(pts, col);
  }
  const LANCET = [[0, 0.4], [0.2, 0.86], [0.42, 1], [0.64, 0.84], [0.82, 0.5], [0.93, 0.2], [1, 0]];
  const ROUNDP = [[0, 0.45], [0.18, 0.84], [0.4, 1], [0.62, 0.98], [0.8, 0.8], [0.92, 0.48], [0.98, 0.2], [1, 0]];
  // a sharp two-tone spike from (x, y): the half facing up-left is lit (c1), the other half shaded (c2)
  function spike(t, x, y, len, ang, w, c1, c2) {
    const c = cos(ang), s = sin(ang), nx = -s * w, ny = c * w, tip = [x + c * len, y + s * len], m = [x + c * len * 0.36, y + s * len * 0.36];
    const lit = nx + ny > 0 ? c1 : c2, dim = nx + ny > 0 ? c2 : c1;
    t.poly([[x - nx * 0.7, y - ny * 0.7], [m[0] - nx, m[1] - ny], tip, [x, y]], lit);
    t.poly([[x, y], tip, [m[0] + nx, m[1] + ny], [x + nx * 0.7, y + ny * 0.7]], dim);
  }
  // a little four-point sparkle (its own outlined piece)
  const sparkle = (g, x, y, s, col) => piece(g, t => t.poly(starPts(x, y, 1.9 * s, 0.6 * s, 4), col || '#fff6a0'));
  // a puffy cloud of 3 balls (smoke, frost)
  const puff = (g, x, y, s, Rm) => piece(g, t => { t.ell(x - 1.3 * s, y + 0.3 * s, 1.5 * s, 1.3 * s, Rm[1]); t.ell(x + 1.3 * s, y + 0.3 * s, 1.5 * s, 1.3 * s, Rm[1]); t.ell(x, y - 0.6 * s, 1.7 * s, 1.5 * s, Rm[1]); shadeShape(t, Rm, 0.5, 0.6); shine(t, x - 0.6 * s, y - 1.1 * s, 0.6 * s, 0.35 * s, Rm[0]); });
  // a soft see-through glow round (cx, cy) on the empty pixels only (no bold edge on it): rings = [[extra radius, rgba], ...]
  function glow(g, cx, cy, rx, ry, rings) {
    const k = g.k, ext = Math.max(...rings.map(q => q[0])), d = (x, y, e) => ((x - cx) / (rx + e)) ** 2 + ((y - cy) / (ry + e)) ** 2 <= 1;
    for (let fy = Math.floor((cy - ry - ext) * k); fy <= Math.ceil((cy + ry + ext) * k); fy++) for (let fx = Math.floor((cx - rx - ext) * k); fx <= Math.ceil((cx + rx + ext) * k); fx++) {
      if (g.fget(fx, fy) !== null || fx < 0 || fy < 0 || fx >= g.fw || fy >= g.fh) continue;
      const x = (fx + 0.5) / k, y = (fy + 0.5) / k, hit = rings.find(q => d(x, y, q[0]));
      if (hit) g.fset(fx, fy, hit[1]);
    }
  }
  // a cheeky lopsided smirk (rising to the front)
  function smirk(g, x, y) {
    stroke(g, [[x - 1.0, y + 0.1], [x + 0.2, y + 0.4], [x + 1.0, y + 0.1], [x + 1.5, y - 0.5]], 0.36, 0.36, INK);
    g.dot(x + 1.75, y - 0.75, INK);
  }

  // =====================================================================================================
  // Imitater -> Copy Spud -> Master Imitater
  // A pale grey-white potato (a soft lumpy oval, rounder on top, with a bump up front and little dimples) with a two-leaf sprout,
  // BIG curious eyes and a small "o" mouth. Stage 1 grows a third leaf and puffs a little cloud of copy-smoke; stage 2 a bud on
  // the sprout, two smoke puffs and a sparkle.
  PAL.imitater = { main: ['#fdfcf9', '#e6e4e0', '#c0bcb8'], leaf: LEAF, acc: ['#ffffff', '#f0f0f4', '#cdced8'], stem: '#72bb5a', root: '#a8865a', part: 'leafcrown' };
  ART.imitater = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, L = C.leaf, f = P.frame ? 1 : 0, r = SIZE[stage];
    const rx = r * 1.0, ry = r * 0.9, cx = 15.5, cy = 26.4 - ry + h;
    baseLeaves(g, P, L);
    // poofs of copy-smoke round its base
    if (stage >= 1) puff(g, cx - rx - 0.6, 26.6 - f * 0.4, T(stage, 0, 0.95, 1.05), C.acc);
    if (stage === 2) { puff(g, cx + rx + 0.9, 26.9 + f * 0.4, 0.85, C.acc); sparkle(g, cx + rx + 1.0, cy - ry * 0.7 - f, 0.7, '#ffffff'); }
    // the sprout: a short stem and two little leaves in a V (a third, and then a bud, as it grows)
    const sx = cx - 0.5, sy = cy - ry + 0.9, s = T(stage, 0.95, 1.05, 1.1), st = sy - 2.3 * s;
    if (stage === 2) piece(g, t => { t.ell(sx + 0.1, st - 1.2, 1.2, 1.5, '#ffd8e6'); t.ell(sx + 0.45, st - 1.0, 0.55, 0.85, '#ffb4cc', 0, inside(t)); });
    piece(g, t => stroke(t, [[sx, sy + 1], [sx + 0.1, st]], 0.55, 0.5, C.stem));
    if (stage >= 1) piece(g, t => lf(t, sx, sy - 0.5, 3.0 * s, -2.95, flat(L), 0.36));
    piece(g, t => lf(t, sx, st + 0.4, 4.4 * s, -2.35, flat(L), 0.33));
    piece(g, t => lf(t, sx + 0.1, st + 0.4, 4.6 * s, -0.78, flat(L), 0.33));
    // the body: a soft lumpy potato, rounder on top with a bump up front
    piece(g, t => {
      t.ell(cx, cy + ry * 0.08, rx, ry * 0.92, M[1]);
      t.ell(cx - rx * 0.12, cy - ry * 0.22, rx * 0.8, ry * 0.78, M[1]);
      t.ell(cx + rx * 0.5, cy - ry * 0.34, rx * 0.44, ry * 0.44, M[1]);
      shadeShape(t, M, rx * 0.14, ry * 0.16);
      shine(t, cx - rx * 0.45, cy - ry * 0.52, rx * 0.2, ry * 0.13, M[0]);
      // potato dimples, kept off the face
      for (const [dx, dy] of [[-0.74, -0.08], [-0.52, 0.6], [0.28, -0.74], [0.86, 0.52]]) t.ell(cx + dx * rx, cy + dy * ry, 0.5, 0.36, M[2], 0, inside(t));
    });
    const ex = cx + 0.8, ey = cy + ry * 0.16;
    eyes(g, ex, ey, r, P, { eye: { w: r * 0.52, h: r * 0.68, sp: r * 0.9 } });
    A.chibiMouth(g, ex + 0.1, ey + r * 0.54, P.mouth || 'o', 3.6);
    return { hx: R(cx), hy: R(cy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(cx), y: R(cy - ry * 0.55), w: R(rx * 1.7) } };
  };

  // =====================================================================================================
  // Power Lily -> Mega Lily -> Solar Lily
  // An orange lily: six long pointed petals (a pale stripe down each) round a butter-yellow face, two leaves at the base and a
  // soft warm glow. Stage 1 longer petals, two stamens curling up over the face and a wider glow; stage 2 three stamens, a second
  // row of petals behind and sparkles.
  PAL.powerlily = { main: ['#ffe2c2', '#ffac68', '#f2864e'], leaf: LEAF, acc: ['#fffbe0', '#ffe27e', '#f4bf56'], stem: '#72bb5a', root: '#a8865a', part: 'petals' };
  ART.powerlily = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, Y = C.acc, f = P.frame ? 1 : 0;
    const fr = T(stage, 6.0, 6.3, 6.6), reach = T(stage, 11.0, 11.8, 12.4), pw = T(stage, 2.5, 2.6, 2.7);
    const cx = 15.6, cy = 26.2 - fr - 2.6 + h, a0 = -PI / 2 + (f && !P.walk ? 0.04 : 0);
    piece(g, t => stroke(t, [[15.4, 28.6], [15.5, cy + fr - 1]], 0.95, 0.95, C.stem));
    if (stage >= 1) piece(g, t => { lf(t, 15.3, 26.4, 4.4, -2.55, flat(C.leaf), 0.34); lf(t, 15.7, 26.0, 4.4, -0.6, flat(C.leaf), 0.34); });
    if (stage === 2) for (let i = 0; i < 6; i++) { const a = a0 + PI / 6 + i * PI / 3, PB = mix(M, M[2], 0.35); piece(g, t => { petal(t, cx + cos(a) * fr * 0.4, cy + sin(a) * fr * 0.4, reach * 0.86 - fr * 0.4, a, pw * 0.92, PB[1], LANCET); shadeShape(t, PB, 0.5, 0.6); }); }
    for (let i = 0; i < 6; i++) {
      const a = a0 + i * PI / 3;
      piece(g, t => {
        petal(t, cx + cos(a) * fr * 0.4, cy + sin(a) * fr * 0.4, reach - fr * 0.4, a, pw, M[1], LANCET);
        shadeShape(t, M, 0.6, 0.7);
        // the pale stripe down the middle of the petal
        stroke(t, [[cx + cos(a) * fr * 1.05, cy + sin(a) * fr * 1.05], [cx + cos(a) * reach * 0.78, cy + sin(a) * reach * 0.78]], 0.34, 0.2, M[0]);
      });
    }
    baseLeaves(g, P, C.leaf);
    if (stage >= 1) for (const [dx, a, l] of T(stage, 0, [[-1.2, -2.1, 3.4], [1.6, -1.1, 3.4]], [[-1.6, -2.2, 3.6], [0.4, -1.62, 4.0], [2.4, -1.0, 3.6]])) piece(g, t => { // stamens curving up over the face
      const x0 = cx + dx * 0.5, y0 = cy - fr * 0.4, d = fr * 0.6 + l, x1 = x0 + cos(a) * d, y1 = y0 + sin(a) * d;
      stroke(t, [[x0, y0], [x0 + cos(a) * d * 0.6 + 0.3, y0 + sin(a) * d * 0.6], [x1, y1]], 0.34, 0.28, '#fff0a0');
      t.ell(x1, y1, 1.1, 0.7, '#e8823e', a + PI / 2);
    });
    piece(g, t => A.softBody(t, cx, cy, fr, fr * 0.96, Y));
    if (stage === 2) { sparkle(g, cx - reach + 0.6, cy - reach * 0.62 + f, 0.75); sparkle(g, cx + reach - 0.4, cy + reach * 0.1 - f, 0.7); }
    glow(g, cx, cy, reach * 0.9, reach * 0.9, stage === 0 ? [[1.2, 'rgba(255,236,140,0.34)']] : [[1.2, 'rgba(255,236,140,0.38)'], [2.6, 'rgba(255,236,140,0.2)']]);
    const ex = cx + 0.6, ey = cy + fr * 0.14;
    eyes(g, ex, ey, fr * 1.04, P);
    A.chibiMouth(g, ex + 0.1, ey + fr * 0.54, P.mouth || 'smile', 2.2);
    return { hx: R(cx), hy: R(cy), hr: R(fr + 1.5), top: topOf(g), ey: R(ey), hat: { x: R(cx), y: R(cy - fr + 1.2), w: R(fr * 1.9) } };
  };

  // =====================================================================================================
  // Chard Guard -> Chard Shield -> Chard Fortress
  // A round pale-green chard heart (the face) in front of big smooth chard leaves fanned UP and out behind it like a shield or a
  // peacock fan, each on a THICK pink-red stalk that shows between the head and the blade and runs on into the blade as its
  // midrib; calm level brows, friendly. Stage 0 three leaves, stage 1 four, stage 2 a full fan of five.
  PAL.chardguard = { main: ['#e6f9c8', '#aadd86', '#80be66'], leaf: LEAF, acc: ['#ffc4d2', '#ff7896', '#e2557a'], stem: '#72bb5a', root: '#a8865a', part: 'leafcrown' };
  const CHARD = [[0, 0.3], [0.12, 0.72], [0.3, 0.96], [0.52, 1], [0.72, 0.9], [0.88, 0.62], [0.97, 0.28], [1, 0]];
  // one chard leaf from (x, y) along angle a: a thick pink stalk out to d0, then a broad smooth blade of length bl with the pink
  // midrib running into it and two pairs of soft side veins
  function chardStalk(t, x, y, a, d0, RIB) {
    stroke(t, [[x, y], [x + cos(a) * (d0 + 0.6), y + sin(a) * (d0 + 0.6)]], 0.72, 0.62, RIB[1]);
    shadeShape(t, RIB, 0.35, 0.45);
  }
  function chardBlade(t, x, y, a, d0, bl, w, Lm, RIB) {
    const c = cos(a), s = sin(a), bx = x + c * d0, by = y + s * d0, nx = -s, ny = c;
    petal(t, bx, by, bl, a, w, Lm[1], CHARD);
    shadeShape(t, Lm, 0.6, 0.8);
    shine(t, bx + c * bl * 0.45 - nx * w * 0.45, by + s * bl * 0.45 - ny * w * 0.45, bl * 0.14, w * 0.18, Lm[0], a);
    for (const u of [0.4, 0.66]) for (const k of [-1, 1]) { const vx = bx + c * bl * u, vy = by + s * bl * u; stroke(t, [[vx, vy], [vx + c * w * 0.5 + nx * w * 0.62 * k, vy + s * w * 0.5 + ny * w * 0.62 * k]], 0.26, 0.18, RIB[1]); }
    stroke(t, [[bx - c * 0.4, by - s * 0.4], [bx + c * bl * 0.86, by + s * bl * 0.86]], 0.55, 0.26, RIB[1]);
  }
  ART.chardguard = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, Lm = mix(C.leaf, '#3e9446', 0.2), RIB = C.acc, f = P.frame ? 1 : 0, r = SIZE[stage] * 0.9;
    const rx = r * 0.98, ry = r * 0.92, hx = 15.6, hy = 26.3 - ry + h;
    // the fan (outer leaves first): each stalk shows ~2 px past the head's edge, each blade is as long as fits the canvas; it sways
    // a little as it walks and lifts for a cheer
    const sw = P.walk ? (f ? 0.06 : -0.06) : 0, up = P.arms === 'up' ? 0.12 : 0;
    const fan = T(stage, [[-2.3, 1], [-0.84, 1], [-1.57, 0.9]], [[-2.46, 1], [-0.68, 1], [-1.9, 1], [-1.24, 1]], [[-2.4, 1], [-0.74, 1], [-1.98, 1], [-1.16, 1], [-1.57, 0.9]]);
    const ox = hx, oy = hy + ry * 0.2, blen = T(stage, 7.6, 8.0, 8.4), w = T(stage, 3.3, 3.45, 3.6);
    const ang = a => a + (a < -1.6 ? -up - sw : a > -1.54 ? up + sw : sw * 0.5);
    const leaves = fan.map(([a0, k]) => {
      const a = ang(a0), c = cos(a), sn = sin(a);
      let d = 0; while (((ox + c * d - hx) / (rx + 0.4)) ** 2 + ((oy + sn * d - hy) / (ry + 0.4)) ** 2 < 1) d += 0.2;
      const d0 = d + 1.9, room = Math.min(sn < 0 ? (oy - 2.6) / -sn : 99, c < 0 ? (ox - 2.6) / -c : c > 0 ? (29.4 - ox) / c : 99) - d0;
      return [a, d0, Math.min(blen * k, room)];
    });
    for (const [a, d0] of leaves) piece(g, t => chardStalk(t, ox, oy, a, d0, RIB));
    for (const [a, d0, bl] of leaves) piece(g, t => chardBlade(t, ox, oy, a, d0, bl, w, Lm, RIB));
    baseLeaves(g, P, C.leaf);
    // the head: a smooth round chard heart
    piece(g, t => {
      t.ell(hx, hy, rx, ry, M[1]); t.ell(hx - 0.2, hy + ry * 0.22, rx * 1.0, ry * 0.78, M[1]);
      shadeShape(t, M, rx * 0.14, ry * 0.16);
      shine(t, hx - rx * 0.45, hy - ry * 0.45, rx * 0.2, ry * 0.12, M[0]);
    });
    const ex = hx + 0.8, ey = hy + ry * 0.16;
    eyes(g, ex, ey, r, P);
    if (!P.eyes) for (const k of [-1, 1]) { const x = ex + k * r * 0.43, y = ey - r * 0.32 - 1.0; stroke(g, [[x - r * 0.18, y + 0.1], [x + r * 0.18, y - 0.1]], 0.3, 0.3, INK); } // calm, level brows
    A.chibiMouth(g, ex + 0.1, ey + r * 0.52, P.mouth || 'smile', 2.2);
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - ry + 0.6), w: R(rx * 1.6) } };
  };

  // =====================================================================================================
  // Sun Bean -> Sunny Bean -> Solar Bean
  // A sunny yellow-orange kidney bean lying on its side (a big front lobe and a smaller back lobe with a wide soft dip between
  // them on top, a pale bean eye in the dip, a leaf sprouting from the back lobe) with a bold orange sun badge on its upper front
  // and a sunny smile. Stage 1 a second leaf, a bigger badge and a floating sun drop; stage 2 the biggest badge, soft rounded
  // sun-ray petals and a warm glow behind it, and sparkles.
  PAL.sunbean = { main: ['#fff6c4', '#ffd46c', '#f4ae4e'], leaf: LEAF, acc: ['#ffd6a0', '#ff9850', '#ec7a3c'], stem: '#72bb5a', root: '#a8865a', part: 'berry' };
  ART.sunbean = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, S = C.acc, f = P.frame ? 1 : 0, r = SIZE[stage] * 0.96;
    const rx = r * 1.2, ry = r * 0.94, hx = 15.6, hy = 26.4 - ry + h;
    const dx0 = hx - rx * 0.16, dy0 = hy - ry * 0.79;
    baseLeaves(g, P, C.leaf, { sp: 5.0 });
    if (stage === 2) { // soft rounded sun-ray petals behind it
      const RAY = ['#fffbe2', '#ffeea8', '#f6d27a'];
      for (let i = 0; i < 7; i++) { const a = -PI + 0.32 + i * (PI - 0.64) / 6, x = hx + cos(a) * rx * 0.8, y = hy + sin(a) * ry * 0.8; piece(g, t => { petal(t, x, y, ry * 0.2 + (i % 2 ? 2.2 : 2.8), a, 1.25, RAY[1], ROUNDP); shadeShape(t, RAY, 0.4, 0.5); }); }
    }
    if (stage === 1) piece(g, t => { const x = hx + rx + 1.2, y = hy - ry * 0.9 - f * 0.6; t.ell(x, y, 1.3, 1.3, GOLD[1]); shine(t, x - 0.4, y - 0.4, 0.5, 0.35, GOLD[0]); });
    // the leaf sprouting from the top of the back lobe
    const lx = hx - rx * 0.5, ly = hy - ry * 0.78;
    piece(g, t => {
      stroke(t, [[lx, ly + 1.4], [lx - 0.2, ly - 1.6]], 0.5, 0.45, C.stem);
      lf(t, lx - 0.2, ly - 1.4, T(stage, 4.0, 4.4, 4.8), -0.85, flat(C.leaf), 0.36);
      if (stage >= 1) lf(t, lx - 0.2, ly - 1.2, T(stage, 0, 3.4, 3.8), -2.5, flat(C.leaf), 0.36);
    });
    // the bean: a big front lobe, a smaller back lobe, a full round bottom and a soft dip between the lobes on top
    piece(g, t => {
      t.ell(hx + rx * 0.4, hy, rx * 0.6, ry, M[1]);
      t.ell(hx - rx * 0.46, hy + ry * 0.06, rx * 0.54, ry * 0.92, M[1]);
      t.ell(hx - 0.1, hy + ry * 0.3, rx * 0.96, ry * 0.7, M[1]);
      t.ell(dx0 + 0.3, dy0 - 1.2, rx * 0.34, 2.4, null);
      shadeShape(t, M, rx * 0.11, ry * 0.16);
      // a long glossy bean sheen and the pale bean eye (hilum) in the dip
      shine(t, hx - rx * 0.62, hy - ry * 0.12, rx * 0.12, ry * 0.3, M[0], 0.3);
      t.ell(dx0 + 0.2, dy0 + 1.6, 1.3, 0.55, lt(M[0], 0.4), 0, inside(t));
    });
    // the bold sun badge on the upper front: eight short chunky golden rays, an orange disc on top, outlined so it reads at
    // game size
    const sr = T(stage, 1.6, 1.7, 1.85), sx = hx + rx * 0.3, sy = hy - ry * 0.52, RY = mix(S, GOLD[1], 0.45);
    piece(g, t => { t.poly(starPts(sx, sy, sr + 1.25, sr * 0.95, 8, -PI / 2 + PI / 8), RY[1]); shadeShape(t, RY, 0.3, 0.4); });
    piece(g, t => {
      t.ell(sx, sy, sr, sr, S[1]);
      shadeShape(t, S, 0.3, 0.4);
      t.ell(sx - sr * 0.32, sy - sr * 0.34, sr * 0.38, sr * 0.28, S[0], -0.6);
    });
    if (stage === 2) { sparkle(g, hx - rx - 1.4, hy - ry * 0.4 + f * 0.5, 0.75, '#fff6c0'); sparkle(g, hx + rx + 1.2, hy - ry * 0.75 - f * 0.5, 0.8, '#fff6c0'); }
    if (stage === 2) glow(g, hx, hy, rx + 2.2, ry + 2.6, [[1.0, 'rgba(255,236,140,0.32)']]);
    const ex = hx + 1.0, ey = hy + ry * 0.26;
    eyes(g, ex, ey, r, P);
    A.chibiMouth(g, ex + 0.1, ey + r * 0.52, P.mouth || 'smile', 2.4);
    return { hx: R(hx), hy: R(hy), hr: R(rx * 0.9), top: topOf(g), ey: R(ey), hat: { x: R(hx + 1), y: R(hy - ry * 0.6), w: R(rx * 1.4) } };
  };

  // =====================================================================================================
  // A.K.E.E. -> Akee Bomber -> Akee Barrage
  // A red-orange akee pod: a round bottom whose top half splits into two big pointed lobes (a pear when closed) peeling open in a
  // V, cream inside, with a big shiny black seed nestled in the opening like a hat; a cheeky smirk. Stage 1 a third lobe behind
  // and a glint; stage 2 four lobes opening wide, a bigger seed and two glints.
  PAL.akee = { main: ['#ffc6aa', '#ff8060', '#e2624e'], leaf: LEAF, acc: ['#fffdf0', '#fff0c4', '#ead09a'], stem: '#72bb5a', root: '#a8865a', part: 'basket' };
  const SEED = ['#7a6e84', '#3e3548', '#2c2534'];
  const LOBE = [[0, 0.72], [0.22, 0.98], [0.46, 0.94], [0.68, 0.72], [0.86, 0.4], [1, 0]];
  function seed(t, x, y, sr) { t.ell(x, y, sr, sr * 0.94, SEED[1]); shadeShape(t, SEED, sr * 0.2, sr * 0.22); t.ell(x - sr * 0.36, y - sr * 0.36, sr * 0.34, sr * 0.26, WHITE, -0.6); t.ell(x + sr * 0.42, y + sr * 0.38, sr * 0.14, sr * 0.12, SEED[0]); }
  // one lobe of the split pod from (x, y) along angle a, its tip curling a little outward, its cream lining along the edge facing
  // the middle (side -1 left, 1 right)
  function akeeLobe(t, x, y, len, a, w, M, Cr, side) {
    const bend = side * 0.7, ix = sin(a) * side, iy = -cos(a) * side;
    petal(t, x, y, len, a, w, M[1], LOBE, bend);
    shadeShape(t, M, 0.5, 0.7);
    petal(t, x + ix * w * 0.52 + cos(a) * len * 0.16, y + iy * w * 0.52 + sin(a) * len * 0.16, len * 0.8, a, w * 0.4, Cr[1], LOBE, bend);
  }
  ART.akee = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, Cr = C.acc, f = P.frame ? 1 : 0, r = SIZE[stage];
    const rx = r * 1.0, ry = r * 0.84, hx = 15.6, hy = 26.4 - ry + h;
    const ly = hy - ry * 0.52, ll = ry * 0.9 + T(stage, 1.4, 1.8, 2.0), lw = rx * 0.5, sr = T(stage, 2.6, 2.9, 3.1), sy = hy - ry - 0.6;
    baseLeaves(g, P, C.leaf);
    const backs = T(stage, [], [[0.3, 0]], [[-1.2, -0.24], [1.8, 0.24]]);
    for (const [dx, da] of backs) piece(g, t => akeeLobe(t, hx + dx, ly, ll * 0.92, -PI / 2 + da, lw * 0.9, mix(M, M[2], 0.25), Cr, da < 0 ? -1 : 1));
    piece(g, t => { t.ell(hx + 0.2, sy + 1.6, rx * 0.44, 2.6, Cr[1]); shadeShape(t, Cr, 0.4, 0.6); });
    piece(g, t => { t.ell(hx, hy, rx, ry, M[1]); shadeShape(t, M, rx * 0.14, ry * 0.17); });
    // the two big lobes peeling open
    for (const k of [-1, 1]) piece(g, t => akeeLobe(t, hx + k * rx * 0.4 + 0.2, ly, ll, -PI / 2 + k * T(stage, 0.48, 0.54, 0.62), lw, M, Cr, k));
    shine(g, hx - rx * 0.56, hy - ry * 0.02, rx * 0.15, ry * 0.11, M[0]);
    piece(g, t => seed(t, hx + 0.2, sy - sr * 0.35, sr));
    if (stage >= 1) sparkle(g, hx + sr + 3.2, sy - sr - 1.4 - f * 0.5, 0.6, '#ffffff');
    if (stage === 2) sparkle(g, hx - sr - 3.6, sy - 0.4 + f * 0.5, 0.55, '#ffffff');
    const ex = hx + 0.8, ey = hy + ry * 0.18;
    eyes(g, ex, ey, r, P);
    if (P.mouth) A.chibiMouth(g, ex + 0.2, ey + r * 0.5, P.mouth, 2.2);
    else smirk(g, ex, ey + r * 0.5);
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(sy + 1.2), w: R(rx * 1.4) } };
  };

  // =====================================================================================================
  // Gold Leaf -> Golden Leaf -> Treasure Leaf
  // A shiny golden leaf (a round body narrowing to a pointed tip, leaning forward a touch) with a centre vein and side veins above
  // the face, little base leaves and twinkling sparkles. Stage 1 a second gold leaf behind; stage 2 three leaves and more sparkles.
  PAL.goldleaf = { main: ['#fff7cc', '#ffd660', '#eaaa3e'], leaf: LEAF, acc: ['#fffbe0', '#ffe68a', '#f2c25a'], stem: '#72bb5a', root: '#a8865a', part: 'leafcrown' };
  // a leaf outline: bottom at (cx, by), half width w, height hh, the tip leaning by lean; a round bottom (widest at um of the
  // height) narrowing to a sharp tip
  function leafPts(cx, by, w, hh, lean) {
    const n = 26, um = 0.36, L = [], Rr = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, ww = u < um ? w * Math.sqrt(Math.max(0, 1 - ((u - um) / um) ** 2)) : w * Math.pow(cos(PI / 2 * (u - um) / (1 - um)), 1.25), x = cx + lean * u * u, y = by - hh * u;
      L.push([x - ww, y]); Rr.push([x + ww, y]);
    }
    return L.concat(Rr.reverse());
  }
  ART.goldleaf = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, f = P.frame ? 1 : 0, r = SIZE[stage];
    const w = r * 0.98, hh = r * 1.86, cx = 15.6, by = 25.9 + h, lean = 1.2;
    const hy = by - hh * 0.4;
    piece(g, t => stroke(t, [[cx, by - 1.0], [cx - 0.1, 28.4]], 0.75, 0.65, C.stem)); // a little stem nub between the base leaves
    baseLeaves(g, P, C.leaf);
    // smaller gold leaves behind (stage 1: one, stage 2: two)
    const back = T(stage, [], [[-2.6, -0.78]], [[-2.8, -0.8], [3.2, 0.74]]);
    for (const [dx, rot] of back) piece(g, t => {
      const s = 0.7, bx = cx + dx, bb = by - 2.4, BM = mix(M, M[2], 0.25), pts = leafPts(0, 0, w * 0.44, hh * s, 0.5 * Math.sign(dx)).map(([x, y]) => [bx + x * cos(rot) - y * sin(rot), bb + x * sin(rot) + y * cos(rot)]);
      t.poly(pts, BM[1]); shadeShape(t, BM, 0.5, 0.6);
    });
    // the gold leaf body
    piece(g, t => {
      t.poly(leafPts(cx, by, w, hh, lean), M[1]);
      shadeShape(t, M, w * 0.14, hh * 0.07);
      shine(t, cx - w * 0.5, hy - hh * 0.12, w * 0.18, hh * 0.08, M[0], -0.9);
      // a bold darker-gold centre vein from near the tip down to just above the eyes, two pairs of side veins
      const vx = u => cx + lean * u * u, vy = u => by - hh * u, VC = mixHex(M[2], '#b87a28', 0.42), ue = (by - (hy + r * 0.06 - r * 0.32 - 1.0)) / hh;
      stroke(t, [[vx(0.9), vy(0.9)], [vx(0.74), vy(0.74)], [vx(ue), vy(ue)]], 0.32, 0.48, VC);
      for (const [u, l] of [[ue + 0.06, 2.8], [ue + 0.2, 2.0]]) for (const k of [-1, 1]) stroke(t, [[vx(u), vy(u)], [vx(u) + k * l, vy(u) - l * 0.72]], 0.36, 0.24, VC);
      // glints
      t.dots([[cx - w * 0.62, hy + 1.2], [cx - w * 0.62, hy + 1.7], [cx - w * 0.66, hy + 2.2]], WHITE);
    });
    for (const [x, y] of T(stage, [[cx + w + 1.6, by - hh * 0.72 - f]], [[cx + w + 1.6, by - hh * 0.72 - f], [cx - w - 1.6, by - hh * 0.3 + f]], [[cx + w + 2.2, by - hh * 0.74 - f], [cx - w - 2.6, by - hh * 0.36 + f], [cx + w + 1.4, by - hh * 0.24 + f]])) sparkle(g, x, y, 0.75, WHITE);
    const ex = cx + 0.8, ey = hy + r * 0.06;
    eyes(g, ex, ey, r, P, { eye: { col: '#4a3222' } });
    A.chibiMouth(g, ex + 0.1, ey + r * 0.52, P.mouth || 'smile', 2.2);
    return { hx: R(cx), hy: R(hy), hr: R(w), top: topOf(g), ey: R(ey), hat: { x: R(cx + 0.4), y: R(hy - hh * 0.36), w: R(w * 1.3) } };
  };

  // =====================================================================================================
  // mushrooms: a big round stalk (the face) that flares into the ground, a dome cap sitting on top of it
  function stalk(g, cx, cy, rx, ry, Rm, P) {
    const sq = P.walk && !P.frame ? 0.4 : 0;
    piece(g, t => { t.ell(cx, 28.5, rx + 0.9 + sq, 1.4, Rm[1]); t.ell(cx, cy, rx + sq * 0.5, ry, Rm[1]); t.ell(cx, cy + ry * 0.3, rx * 0.96 + sq * 0.5, ry * 0.72, Rm[1]); shadeShape(t, Rm, rx * 0.15, ry * 0.15); });
  }
  // Toadstool -> Toad Chomp -> Toad King
  // A chubby mushroom: a big round red cap with white spots and a curled-under rim, a cream stalk flaring to the ground, the face on
  // the stalk with a playful tongue poking out. Stage 1 a bigger cap with more spots and a little leaf resting on top; stage 2 a
  // little gold crown and a baby toadstool friend beside it.
  PAL.toadstool = { main: ['#ffcac6', '#ff7672', '#e0585e'], leaf: LEAF, acc: ['#fffaf0', '#f8ecd8', '#dccab0'], stem: '#72bb5a', root: '#a8865a', part: 'cap' };
  ART.toadstool = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, S = C.acc, sx = 15.6;
    const srx = T(stage, 6.0, 6.5, 6.9), sry = T(stage, 5.4, 5.8, 6.1), sy = 28.9 - sry + h, stop = sy - sry;
    const crx = T(stage, 9.4, 10.3, 11.0), cry = T(stage, 6.8, 7.4, 7.9), cby = stop + 2.3, cx = sx - 0.2;
    stalk(g, sx, sy, srx, sry, S, P);
    piece(g, t => {
      t.ell(cx, cby - 0.2, crx, cry, M[1], 0, (x, y) => y <= cby);
      t.ell(cx - crx * 0.05, cby - cry * 0.42, crx * 0.82, cry * 0.66, M[1]);
      t.ell(cx, cby, crx - 0.7, 1.45, M[1]);
      shadeShape(t, M, crx * 0.1, cry * 0.18);
      const sp = T(stage, [[-0.5, -0.52, 1.7], [0.3, -0.8, 1.3], [0.62, -0.3, 1.5], [-0.12, -0.2, 0.9], [-0.86, -0.12, 1.0]],
        [[-0.52, -0.55, 1.8], [0.26, -0.82, 1.4], [0.62, -0.36, 1.6], [-0.1, -0.24, 1.0], [-0.88, -0.14, 1.1], [0.9, -0.06, 0.9]],
        [[-0.52, -0.56, 1.9], [0.24, -0.84, 1.5], [0.6, -0.4, 1.7], [-0.12, -0.26, 1.1], [-0.88, -0.16, 1.2], [0.92, -0.08, 1.0], [-0.24, -0.86, 0.9]]);
      for (const [dx, dy, rr] of sp) t.ell(cx + dx * crx, cby + dy * cry * 1.1, rr, rr * 0.88, '#fffaf2', 0, inside(t));
      shine(t, cx - crx * 0.62, cby - cry * 0.72, crx * 0.14, cry * 0.1, M[0], -0.7);
    });
    if (stage === 1) piece(g, t => { const x = cx + crx * 0.3, y = cby - cry * 0.96; lf(t, x - 1.6, y + 0.5, 4.0, -0.42, flat(C.leaf), 0.34); stroke(t, [[x - 1.6, y + 0.6], [x - 2.4, y + 1.0]], 0.26, 0.22, C.stem); });
    if (stage === 2) piece(g, t => { // the king's little gold crown
      const x = cx + 0.2, y = cby - cry * 1.08 + 1.1, k = 1.25;
      t.poly([[x - 2.6 * k, y + 0.8], [x - 2.9 * k, y - 1.8 * k], [x - 1.4 * k, y - 0.5 * k], [x, y - 2.8 * k], [x + 1.4 * k, y - 0.5 * k], [x + 2.9 * k, y - 1.8 * k], [x + 2.6 * k, y + 0.8]], GOLD[1]);
      shadeShape(t, GOLD, 0.4, 0.5);
      t.ell(x, y - 0.2, 0.7, 0.7, '#ff7a90');
    });
    if (stage === 2) { // a baby toadstool friend
      const bx = sx - 10.4, bb = 28.7;
      piece(g, t => { t.ell(bx, bb - 0.2, 2.6, 0.9, S[1]); t.ell(bx, bb - 1.6, 1.9, 1.8, S[1]); shadeShape(t, S, 0.4, 0.4); });
      piece(g, t => { t.ell(bx - 0.1, bb - 3.2, 3.2, 2.5, M[1], 0, (x, y) => y <= bb - 3.0); t.ell(bx - 0.1, bb - 3.0, 2.8, 0.8, M[1]); shadeShape(t, M, 0.5, 0.6); t.ell(bx - 1.1, bb - 4.4, 0.7, 0.6, '#fffaf2', 0, inside(t)); t.ell(bx + 1.2, bb - 3.9, 0.55, 0.5, '#fffaf2', 0, inside(t)); });
      A.chibiEyes(g, bx + 0.4, bb - 1.6, { sp: 1.7, w: 1.0, h: 1.3, mood: P.eyes === 'happy' || P.eyes === 'closed' ? P.eyes : P.eyes === 'blink' ? 'blink' : undefined });
    }
    const ex = sx + 0.9, ey = sy + sry * 0.14, er = srx * 1.0;
    eyes(g, ex, ey, er, P);
    const my = ey + er * 0.5, tongue = P.mouth == null || P.mouth === 'smile' || P.mouth === 'open';
    A.chibiMouth(g, ex + 0.1, my, P.mouth === 'open' ? 'open' : P.mouth || 'smile', 2.2);
    if (tongue) { // the tongue poking out, a little to the front
      piece(g, t => t.ell(ex + 0.55, my + (P.mouth === 'open' ? 1.6 : 1.15), 0.95, 1.05, '#ff9ab0'));
      stroke(g, [[ex + 0.55, my + (P.mouth === 'open' ? 1.2 : 0.75)], [ex + 0.55, my + (P.mouth === 'open' ? 2.0 : 1.6)]], 0.14, 0.14, '#e8708a');
    }
    return { hx: R(sx), hy: R(cby - cry * 0.4), hr: R(crx * 0.8), top: topOf(g), ey: R(ey), hat: { x: R(cx), y: R(cby - cry * 0.62), w: R(crx * 1.5) } };
  };

  // =====================================================================================================
  // Strawburst -> Berry Blast -> Strawberry Boom
  // A red strawberry (wide round shoulders tapering to a soft point) with little yellow seeds round the face, a star of pointed
  // green leaves with a short curly stem on top, BIG round rosy cheeks. Stage 1 a bigger crown with a leaf on the stem and juicy
  // pink sparkles; stage 2 a little white blossom on the crown.
  PAL.strawburst = { main: ['#ffc4c6', '#ff707e', '#e05066'], leaf: LEAF, acc: ['#fff8c0', '#ffe066', '#e8b440'], stem: '#72bb5a', root: '#a8865a', part: 'berry' };
  ART.strawburst = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, L = C.leaf, Sd = C.acc, f = P.frame ? 1 : 0, r = SIZE[stage];
    const rx = r * 1.04, ry = r * 0.9, hx = 15.6, hy = 26.0 - ry + h;
    baseLeaves(g, P, L, { sp: 4.6 });
    if (stage >= 1) { sparkle(g, hx - rx - 1.4, hy - ry * 0.3 + f * 0.5, 0.7, '#ffd0d8'); sparkle(g, hx + rx + 1.4, hy + ry * 0.2 - f * 0.5, 0.6, '#ffd0d8'); }
    // the berry: wide round shoulders, a tapering lower half and a soft point
    piece(g, t => {
      t.ell(hx, hy - ry * 0.1, rx, ry * 0.84, M[1]);
      t.ell(hx, hy + ry * 0.24, rx * 0.84, ry * 0.76, M[1]);
      t.ell(hx + 0.2, hy + ry * 0.6, rx * 0.46, ry * 0.42, M[1]);
      shadeShape(t, M, rx * 0.14, ry * 0.16);
      shine(t, hx - rx * 0.5, hy - ry * 0.4, rx * 0.18, ry * 0.12, M[0]);
    });
    // little yellow seeds round the face (tiny teardrops)
    for (const [u, v] of [[-0.48, -0.5], [0.08, -0.56], [0.62, -0.46], [-0.84, -0.06], [0.9, 0.06], [-0.72, 0.42], [0.82, 0.5], [-0.4, 0.8], [0.14, 0.94], [0.56, 0.8]]) {
      const x = hx + u * rx, y = hy + v * ry;
      if (!g.filled(x - 0.6, y) || !g.filled(x + 1.0, y) || !g.filled(x, y + 1.0)) continue;
      g.dots([[x, y], [x + 0.5, y]], Sd[1]); g.dot(x + 0.25, y + 0.5, Sd[2]);
    }
    // the crown: a star of pointed leaves drooping over the shoulders, a short curly stem
    const ky = hy - ry * 0.9, kx = hx - 0.2, ks = T(stage, 1, 1.12, 1.2);
    if (stage === 2) piece(g, t => { const x = kx + 3.0, y = ky - 3.4; for (let i = 0; i < 5; i++) { const a = -PI / 2 + i * 2 * PI / 5; t.ell(x + cos(a) * 1.1, y + sin(a) * 1.1, 1.0, 0.8, '#fffaf6', a); } t.ell(x, y, 0.6, 0.6, GOLD[1]); });
    piece(g, t => {
      stroke(t, [[kx, ky + 0.6], [kx + 0.2, ky - 1.9 * ks], [kx + 1.1, ky - 2.8 * ks]], 0.6, 0.48, C.stem);
      if (stage >= 1) lf(t, kx + 0.2, ky - 1.5 * ks, 2.8, -2.6, flat(L), 0.36);
    });
    piece(g, t => {
      for (const [a, l] of [[PI - 0.28, 5.0], [PI + 0.45, 4.2], [-PI / 2 - 0.15, 3.2], [-0.5, 4.2], [0.26, 5.0], [PI / 2 - 0.15, 2.8]]) petal(t, kx, ky + 0.2, l * ks, a, 1.05 * ks, L[1], LANCET);
      t.ell(kx, ky + 0.2, 1.5 * ks, 1.0, L[1]);
      shadeShape(t, L, 0.4, 0.6);
      shine(t, kx - 1.4, ky - 0.3, 0.9, 0.35, L[0], 0);
    });
    const ex = hx + 0.8, ey = hy + ry * 0.12;
    eyes(g, ex, ey, r, P, { bl: { w: 1.9, h: 1.05, col: '#ffb4c0' } });
    A.chibiMouth(g, ex + 0.1, ey + r * 0.5, P.mouth || 'smile', 2.2);
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(ky + 0.6), w: R(rx * 1.5) } };
  };

  // =====================================================================================================
  // Bowling Bulb -> Bowling Duo -> Bowling Champ
  // A round glossy purple onion bulb (a bowling ball with a soft onion point on top) with a green sprout tuft, three bowling-ball
  // finger holes and a happy face. Stage 1 a little buddy bulb rolls along beside it (the duo); stage 2 a taller tuft and a gold
  // star glint.
  PAL.bowlingbulb = { main: ['#ecdeff', '#b496ec', '#8e72d2'], leaf: LEAF, acc: ['#9682c8', '#523e80', '#44346c'], stem: '#72bb5a', root: '#a8865a', part: 'bulb' };
  ART.bowlingbulb = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, L = C.leaf, Hc = C.acc, f = P.frame ? 1 : 0, r = SIZE[stage];
    const rx = r * 1.02, ry = r * 0.96, hx = 15.6, hy = 26.3 - ry + h, tipY = hy - ry - r * 0.24;
    baseLeaves(g, P, L);
    // the sprout tuft
    const bl = T(stage, [[-1.2, -2.1, 3.0], [0, -1.6, 3.6], [1.2, -1.05, 3.0]], [[-1.5, -2.2, 3.2], [-0.5, -1.8, 3.9], [0.6, -1.35, 3.9], [1.5, -0.95, 3.0]], [[-1.8, -2.3, 3.2], [-0.8, -1.95, 3.9], [0.2, -1.6, 4.2], [1.1, -1.25, 3.8], [1.9, -0.9, 3.0]]);
    piece(g, t => { for (const [dx, a, l] of bl) spike(t, hx + 0.2 + dx, tipY + 1.4, l, a, 0.85, L[1], L[2]); });
    // the bulb: a round ball with a soft onion point on top
    piece(g, t => {
      t.poly([[hx - 2.8, hy - ry * 0.8], [hx - 0.7, tipY + 0.9], [hx + 0.2, tipY], [hx + 1.1, tipY + 0.9], [hx + 3.0, hy - ry * 0.8]], M[1]);
      t.ell(hx, hy, rx, ry, M[1]);
      shadeShape(t, M, rx * 0.15, ry * 0.16);
      shine(t, hx - rx * 0.62, hy - ry * 0.28, rx * 0.18, ry * 0.12, M[0], -1.0);
      t.dots([[hx - rx * 0.5, hy - ry * 0.56], [hx - rx * 0.5 + 0.5, hy - ry * 0.56]], WHITE);
      // onion layer lines curving down the sides
      for (const k of [-0.7, 0.86]) { const pts = []; for (let v = -0.5; v <= 0.66; v += 0.12) pts.push([hx + k * rx * Math.sqrt(1 - v * v), hy + v * ry]); stroke(t, pts, 0.2, 0.2, mixHex(M[1], M[2], 0.7)); }
    });
    // the three finger holes: two side by side, the thumb hole lower at the back
    for (const [dx, dy] of [[-0.06, -0.66], [0.34, -0.55], [-0.46, -0.42]]) {
      const x = hx + dx * r, y = hy + dy * r, hr = 1.25 * r / 9;
      piece(g, t => { t.ell(x, y, hr, hr * 0.9, Hc[1]); t.ell(x + 0.1, y + hr * 0.62, hr * 0.8, hr * 0.42, Hc[0], 0, inside(t)); });
    }
    if (stage === 2) sparkle(g, hx + rx + 1.0, hy - ry * 0.75 - f * 0.5, 0.8, GOLD[1]);
    if (stage >= 1) { // the duo's little buddy bulb rolling along beside it
      const br = 3.0, bx = hx - rx - 0.6, by = 28.5 - br * 0.95 + (P.walk && f ? -0.8 : 0);
      piece(g, t => { spike(t, bx + 0.1, by - br + 0.7, 1.9, -1.95, 0.5, L[1], L[2]); spike(t, bx + 0.5, by - br + 0.7, 1.7, -1.2, 0.5, L[1], L[2]); });
      piece(g, t => { t.ell(bx, by, br, br * 0.95, M[1]); shadeShape(t, M, 0.5, 0.6); shine(t, bx - 1.1, by - 1.0, 0.7, 0.4, M[0]); for (const [dx, dy] of [[-0.9, -1.4], [0.3, -1.7]]) t.ell(bx + dx, by + dy, 0.48, 0.42, Hc[1]); });
      A.chibiEyes(g, bx + 0.5, by + 0.5, { sp: 2.0, w: 1.1, h: 1.4, mood: P.eyes === 'happy' || P.eyes === 'closed' || P.eyes === 'blink' ? P.eyes : undefined });
    }
    const ex = hx + 0.8, ey = hy + ry * 0.18;
    eyes(g, ex, ey, r, P);
    A.chibiMouth(g, ex + 0.1, ey + r * 0.5, P.mouth || 'smile', 2.4);
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - ry + 1.2), w: R(rx * 1.4) } };
  };

  // =====================================================================================================
  // Homing Thistle -> Seeker Thistle -> Star Thistle
  // A green spiny bulb (round, narrowing to a neck, a few short spines on its sides and a collar of little pointed bracts) with
  // the face, crowned with a BIG purple spiky thistle puff fanning out like a brush. Stage 1 a fuller, taller puff and a homing
  // thorn zipping beside it; stage 2 the fullest puff with a gold star in it and two thorns.
  PAL.homingthistle = { main: ['#e2f6bc', '#a2d47a', '#7ab460'], leaf: LEAF, acc: ['#f8e0ff', '#c98ef0', '#a26ad4'], stem: '#72bb5a', root: '#a8865a', part: 'spikes' };
  ART.homingthistle = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, Pu = C.acc, f = P.frame ? 1 : 0, r = SIZE[stage];
    const rx = r * 0.92, ry = r * 0.8, hx = 15.6, hy = 26.4 - ry + h, ny = hy - ry * 0.9;
    baseLeaves(g, P, C.leaf);
    if (stage >= 1) for (const [x, y, d] of [[hx + rx + 2.8, hy - ry * 0.7 - f * 0.5, 1], [hx - rx - 3.0, hy - ry * 0.1 + f * 0.5, -1]].slice(0, stage)) { // homing thorns
      piece(g, t => { spike(t, x - d * 1.6, y, 3.4, d > 0 ? 0 : PI, 0.7, Pu[1], Pu[2]); t.ell(x - d * 1.6, y, 0.9, 0.9, M[1]); });
      stroke(g, [[x - d * 2.8, y - 0.5], [x - d * 4.4, y - 0.3]], 0.2, 0.14, '#ffffff');
      stroke(g, [[x - d * 2.8, y + 0.6], [x - d * 4.0, y + 0.8]], 0.2, 0.14, '#ffffff');
    }
    // the puff: a back row of darker spikes, a front row of lighter ones fanning out from the neck (longest in the middle)
    const n = T(stage, 10, 12, 14), len = T(stage, 7.0, 7.8, 8.4), PB = mix(Pu, Pu[2], 0.3), wig = P.walk && f ? 0.08 : 0;
    for (const [row, Rm, k] of [[0, PB, 0.94], [1, Pu, 0.86]]) piece(g, t => {
      const m = n - row;
      for (let i = 0; i < m; i++) {
        const u = (i + row * 0.5) / (n - 1), a = -PI + 0.3 + u * (PI - 0.6) + wig, mid = 1 - Math.abs(u - 0.5) * 0.66;
        spike(t, hx + 0.2 + cos(a) * 2.4, ny + 0.6 + sin(a) * 1.0, len * k * mid, a, 1.2, Rm[1], Rm[2]);
        if (row) t.ell(hx + 0.2 + cos(a) * (2.4 + len * k * mid * 0.86), ny + 0.6 + sin(a) * (1.0 + len * k * mid * 0.86), 0.5, 0.5, Rm[0], 0, inside(t));
      }
      t.ell(hx + 0.2, ny - 0.6, rx * 0.46, 2.3, Rm[1]);
      if (row) shine(t, hx - 1.4, ny - 1.6, 1.0, 0.45, Rm[0], -0.3);
    });
    if (stage === 2) piece(g, t => { const x = hx + 2.8, y = ny - 3.4; t.poly(starPts(x, y, 2.7, 1.2, 5), GOLD[1]); shadeShape(t, GOLD, 0.4, 0.5); shine(t, x - 0.6, y - 0.5, 0.5, 0.35, GOLD[0]); });
    // short spines on the bulb's sides
    piece(g, t => {
      for (const k of [-1, 1]) for (const v of [-0.1, 0.35]) { const a = k > 0 ? v : PI - v, x = hx + cos(a) * rx * 0.9, y = hy + sin(a) * ry * 0.92; spike(t, x, y, 2.0, a + k * 0.3, 0.75, M[1], M[2]); }
    });
    // the bulb: round, narrowing a little to the neck
    piece(g, t => {
      t.ell(hx, hy + ry * 0.05, rx, ry * 0.95, M[1]); t.ell(hx, hy - ry * 0.4, rx * 0.74, ry * 0.62, M[1]);
      shadeShape(t, M, rx * 0.14, ry * 0.17);
      shine(t, hx - rx * 0.5, hy - ry * 0.34, rx * 0.18, ry * 0.12, M[0]);
    });
    // a collar of little pointed bracts round the neck, cupping the puff
    piece(g, t => { for (let i = 0; i < 5; i++) { const a = -PI + 0.62 + i * (PI - 1.24) / 4; spike(t, hx + 0.2 + cos(a) * rx * 0.5, ny + 2.2 + sin(a) * 0.4, 2.3, a, 0.9, M[1], M[2]); } });
    const ex = hx + 0.8, ey = hy + ry * 0.22;
    eyes(g, ex, ey, r * 0.96, P);
    A.chibiMouth(g, ex + 0.1, ey + r * 0.48, P.mouth || 'smile', 2.2);
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(ny + 0.6), w: R(rx * 1.4) } };
  };

  // =====================================================================================================
  // Stallia -> Frost Stallia -> Blizzard Stallia
  // A pale icy flower: five broad frosty blue petals with white frosted tips round a snowy white face, mint-teal leaves at the
  // base and ice sparkles. Stage 1 little ice crystals on the petal tips, more sparkles and a frosty glow; stage 2 a second row
  // of petals behind.
  PAL.stallia = { main: ['#f2fbff', '#9ccff4', '#68a2da'], leaf: ['#d6f6ee', '#92d8c6', '#64b4a6'], acc: ['#ffffff', '#f0f7fd', '#c4dbf0'], stem: '#64b4a6', root: '#8a9aa8', part: 'petals' };
  ART.stallia = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, Fc = C.acc, f = P.frame ? 1 : 0;
    const fr = T(stage, 7.2, 7.8, 8.4), reach = T(stage, 10.9, 11.6, 12.2), pw = T(stage, 4.1, 4.4, 4.7);
    const cx = 15.6, cy = 26.2 - fr - 1.6 + h, a0 = -PI / 2 + (f && !P.walk ? 0.05 : 0);
    piece(g, t => stroke(t, [[15.4, 28.6], [15.5, cy + fr - 1]], 0.95, 0.95, C.stem));
    if (stage === 2) for (let i = 0; i < 5; i++) { const a = a0 + PI / 5 + i * 2 * PI / 5, PB = mix(M, M[2], 0.3); piece(g, t => { petal(t, cx, cy, reach * 0.92, a, pw * 0.85, PB[1], ROUNDP); shadeShape(t, PB, 0.5, 0.6); }); }
    for (let i = 0; i < 5; i++) {
      const a = a0 + i * 2 * PI / 5;
      piece(g, t => {
        petal(t, cx, cy, reach, a, pw, M[1], ROUNDP);
        shadeShape(t, M, 0.6, 0.7);
        // the frosted white tip (a soft curved edge) and a faint centre line
        t.ell(cx + cos(a) * reach * 1.02, cy + sin(a) * reach * 1.02, reach * 0.24, pw * 1.15, M[0], a, inside(t));
        stroke(t, [[cx + cos(a) * fr * 1.1, cy + sin(a) * fr * 1.1], [cx + cos(a) * reach * 0.6, cy + sin(a) * reach * 0.6]], 0.2, 0.16, lt(M[0], 0.3));
      });
      if (stage >= 1) piece(g, t => spike(t, cx + cos(a) * (reach - 1.4), cy + sin(a) * (reach - 1.4), 2.6, a, 1.0, WHITE, M[1])); // an ice crystal on the tip
    }
    baseLeaves(g, P, C.leaf);
    piece(g, t => A.softBody(t, cx, cy, fr, fr * 0.96, Fc));
    // ice sparkles (they twinkle with the frame)
    const sp = T(stage, [[cx + reach + 0.6, cy - reach * 0.5], [cx - reach - 0.4, cy + 1.4]], [[cx + reach + 0.8, cy - reach * 0.55], [cx - reach - 0.8, cy + 1.2], [cx - reach * 0.6, cy - reach - 0.2]],
      [[cx + reach + 0.6, cy - reach * 0.6], [cx - reach - 0.6, cy + 1.6], [cx - reach * 0.7, cy - reach - 0.2], [cx + reach * 0.85, cy + reach * 0.5]]);
    sp.forEach(([x, y], i) => sparkle(g, Math.max(1.6, Math.min(30.2, x)), Math.max(1.6, y), (i + f) % 2 ? 0.62 : 0.78, '#f4fcff'));
    if (stage >= 1) glow(g, cx, cy, reach, reach, [[1.2, 'rgba(200,236,255,0.4)']]);
    const ex = cx + 0.7, ey = cy + fr * 0.16;
    eyes(g, ex, ey, fr, P);
    A.chibiMouth(g, ex + 0.1, ey + fr * 0.5, P.mouth || 'smile', 2.2);
    return { hx: R(cx), hy: R(cy), hr: R(fr + 1.5), top: topOf(g), ey: R(ey), hat: { x: R(cx), y: R(cy - fr + 1.2), w: R(fr * 1.9) } };
  };

  // =====================================================================================================
  // Phat Beet -> Beet Box -> Beet Drop
  // A round magenta beet (a full round body with a little curly root tail) under a big leafy green top on magenta stalks, a happy
  // face and sound-wave arcs pulsing out on both sides. Stage 1 four leaves and two arcs a side; stage 2 five leaves, three arcs
  // and a floating music note.
  PAL.phatbeet = { main: ['#ffd2ec', '#e676b6', '#c45698'], leaf: LEAF, acc: ['#fff6fd', '#fbe4f4', '#e2bcd8'], stem: '#e070a8', root: '#c45698', part: 'bulb' };
  ART.phatbeet = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, L = C.leaf, Wv = C.acc, f = P.frame ? 1 : 0, r = SIZE[stage];
    const rx = r * 1.02, ry = r * 0.9, hx = 15.6, hy = 26.2 - ry + h, ty = hy - ry + 0.8;
    // sound waves pulsing out on both sides (they grow a little on frame 1)
    const nw = T(stage, 1, 2, 3);
    for (let i = 0; i < nw; i++) for (const k of [-1, 1]) {
      const rr = rx + 1.6 + i * 1.35 + f * 0.4, pts = [], sp = 0.5 - i * 0.06;
      for (let a = -sp; a <= sp + 0.01; a += 0.1) pts.push([hx + k * cos(a) * rr, hy + 0.6 + sin(a) * rr * 1.05]);
      stroke(g, pts, 0.32, 0.32, Wv[1]);
    }
    if (stage === 2) piece(g, t => { const x = hx + rx + 2.4, y = hy - ry - 0.6 - f * 0.6; t.ell(x, y + 2.2, 1.0, 0.8, Wv[1], -0.4); stroke(t, [[x + 0.8, y + 2.0], [x + 0.8, y - 0.6], [x + 2.0, y + 0.4]], 0.32, 0.3, Wv[1]); });
    // the leafy top: big leaves on magenta stalks
    const lv = T(stage, [[-2.3, 6.4], [-1.52, 7.4], [-0.8, 6.4]], [[-2.5, 6.4], [-1.88, 7.6], [-1.2, 7.8], [-0.6, 6.4]], [[-2.65, 6.0], [-2.08, 6.9], [-1.55, 7.2], [-1.02, 6.9], [-0.45, 6.0]]);
    for (const [a, l] of lv) piece(g, t => {
      const x0 = hx + 0.2, y0 = ty + 0.6;
      stroke(t, [[x0, y0], [x0 + cos(a) * l * 0.4, y0 + sin(a) * l * 0.4]], 0.5, 0.42, C.stem);
      t.ell(x0 + cos(a) * l * 0.64, y0 + sin(a) * l * 0.64, l * 0.38, l * 0.25, L[1], a);
      shadeShape(t, L, 0.5, 0.6);
      stroke(t, [[x0 + cos(a) * l * 0.38, y0 + sin(a) * l * 0.38], [x0 + cos(a) * l * 0.9, y0 + sin(a) * l * 0.9]], 0.22, 0.16, C.stem);
    });
    baseLeaves(g, P, L);
    // the little curly root tail
    piece(g, t => stroke(t, [[hx + 1.2, hy + ry - 1.2], [hx + 2.4, hy + ry + 0.9], [hx + 3.8, hy + ry + 1.3], [hx + 4.6, hy + ry + 0.6]], 0.6, 0.28, M[1]));
    // the round beet
    piece(g, t => {
      t.ell(hx, hy, rx, ry, M[1]); t.ell(hx + 0.4, hy + ry * 0.25, rx * 0.88, ry * 0.78, M[1]);
      t.ell(hx + 0.2, ty - 0.2, 2.2, 1.2, M[1]);
      shadeShape(t, M, rx * 0.15, ry * 0.16);
      shine(t, hx - rx * 0.48, hy - ry * 0.48, rx * 0.2, ry * 0.12, M[0]);
      // faint beet rings on the sides
      for (const [k, v0, v1] of [[-0.8, -0.1, 0.6], [0.9, 0.0, 0.55]]) { const pts = []; for (let v = v0; v <= v1; v += 0.1) pts.push([hx + k * rx * Math.sqrt(1 - v * v), hy + v * ry]); stroke(t, pts, 0.2, 0.2, mixHex(M[1], M[2], 0.7)); }
    });
    const ex = hx + 0.8, ey = hy + ry * 0.18;
    eyes(g, ex, ey, r, P);
    A.chibiMouth(g, ex + 0.1, ey + r * 0.5, P.mouth || 'smile', 2.6);
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - ry + 1.2), w: R(rx * 1.5) } };
  };
})();
