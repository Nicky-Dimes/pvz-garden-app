// art-plants2.js — PVZ Garden plant art, part A2 (TRUE chibi; see docs/pvz-art-guide.md and docs/chibi-reference.js):
// Wall-nut, Snow Pea, Cherry Bomb, Potato Mine, Puff-shroom, Sun-shroom, Cabbage-pult, Kernel-pult, Squash, Jalapeno,
// Cactus, Spikeweed, Torchwood, Lily Pad, Tangle Kelp, Starfruit.
// Uses the chibi kit from art-plants.js (PX.art.chibi). Each species: PX.PLANT_PAL[id] + PX.PLANT_ART[id](g, stage, P, C) -> geom.
// Every body is its own slightly-off-round silhouette built from 2-3 soft overlapping shapes, flat pastel with one soft shade.
(function () {
  'use strict';
  const { INK, stroke, starPts } = PX;
  const A = PX.art, mix = PX.mixHex;
  const { soft, flat, pc, fine, hopOf, baseLeaves, stem, softify, polyIn, topOf, chibiFace, bowTie, LEAF2, T } = A.chibi;
  const ART = PX.PLANT_ART, PAL = PX.PLANT_PAL;
  const R = Math.round;
  const WHITE = '#ffffff';
  // a soft body from several overlapping ellipses [cx, cy, rx, ry, rot?, mask?]: one flat fill, one soft shade, a highlight
  function blobs(t, list, M, o) {
    const S = soft(M);
    for (const [x, y, rx, ry, rot, m] of list) t.ell(x, y, rx, ry, S[1], rot || 0, m);
    softify(t, S, o);
  }
  // a little 4-point twinkle
  function twinkle(g, x, y, s, col) { pc(g, t => t.poly(starPts(x, y, s, s * 0.36, 4), col || '#fff3a0')); }
  // a two-tone pointed shard (ice crystal, spike): from (x, y) along angle a
  function shard(t, x, y, len, a, w, A1, B1) {
    const c = Math.cos(a), s = Math.sin(a), px = -s * w, py = c * w, m = len * 0.38;
    const base = [x - c * 0.6, y - s * 0.6], tip = [x + c * len, y + s * len], w1 = [x + c * m + px, y + s * m + py], w2 = [x + c * m - px, y + s * m - py];
    t.poly([base, w1, tip], A1); t.poly([base, tip, w2], B1);
  }
  const ICE = ['#ffffff', '#e2f6ff', '#aedaf2'];
  const STEEL = ['#f2f5fa', '#c3cbd8', '#98a3b6'];
  const PINK = ['#ffe2ee', '#ffabcb', '#f08cb0'];
  const GOLD = ['#fff4b8', '#ffd95c', '#f0b440'];
  const CREAM = ['#fffaf0', '#f5e8d2', '#dfcbab'];
  const WOOD = ['#f5dab0', '#e0b582', '#c69664'];
  const WATER = ['#e4f8ff', '#a8e0f4', '#86c8e6'];

  // ================= Wall-nut -> Tall-nut -> Giga Tall-nut =================
  // A light-brown EGG (fuller at the bottom) with big white eyes with pupils and NO mouth. Tall-nut is taller with friendly
  // brows; Giga Tall-nut is the tallest, with a riveted steel band round its middle.
  PAL.wallnut = { main: ['#fdebcb', '#efcb99', '#d8ab76'], leaf: LEAF2, acc: STEEL, stem: '#72bb5a', root: '#a8865a' };
  ART.wallnut = function (g, stage, P, C) {
    const M = soft(C.main), hop = P.walk && P.frame ? -1 : 0, sq = P.walk && !P.frame ? 0.35 : 0;
    const rx = T(stage, 8.6, 8.9, 9.6) + sq, ry = T(stage, 9.6, 11.6, 13.2) - sq, hx = 15.5, hy = 30.4 - ry + hop;
    pc(g, t => blobs(t, [[hx, hy, rx, ry], [hx + 0.2, hy + ry * 0.3, rx * 1.03, ry * 0.68]], M, { a: rx * 0.15, b: ry * 0.15, hl: [hx - rx * 0.42, hy - ry * 0.5, rx * 0.24, ry * 0.13] }));
    const CK = mix(M[2], '#7a5232', 0.45);
    const crack = pts => PX.stroke(g, pts, 0.3, 0.3, CK);
    crack([[hx - 2.5, hy - ry + 2.2], [hx - 1.2, hy - ry + 3.4], [hx - 1.8, hy - ry + 4.6]]);
    if (stage >= 1) crack([[hx + rx - 2.4, hy + ry * 0.42], [hx + rx - 3.6, hy + ry * 0.52], [hx + rx - 3.2, hy + ry * 0.64]]);
    const by = hy + ry * 0.42;
    if (stage === 2) { // the steel band (drawn on its own piece so it gets a clean edge)
      pc(g, t => { blobs(t, [[hx + 0.2, hy + ry * 0.3, rx * 1.03 + 0.5, ry * 0.68 + 0.4]], STEEL, { a: 1.1, b: 0.6 }); for (let i = 0; i < t.a.length; i++) { const y = (i / t.fw | 0) / t.k; if (y < by - 1.3 || y > by + 1.3) t.a[i] = null; } });
      for (const dx of [-5.4, -1.8, 1.8, 5.4]) { g.ell(hx + dx, by, 0.5, 0.5, '#8a94a8'); g.dot(hx + dx - 0.3, by - 0.3, WHITE); }
    }
    const ex = hx + 1.2, ey = hy - ry * T(stage, 0.08, 0.16, 0.22);
    const ew = T(stage, 4.2, 4.4, 4.6), eh = T(stage, 4.8, 5, 5.3), sp = T(stage, 6.2, 6.4, 6.8);
    A.chibiEyes(g, ex, ey, { white: true, sp, w: ew, h: eh, look: [0.5, -0.1], mood: P.eyes });
    if (stage >= 1 && P.eyes !== 'brave' && P.eyes !== 'sad') { // friendly bushy brows on the tall ones
      const BR = mix(M[2], '#6a4428', 0.55);
      for (const d of [-1, 1]) { const x = ex + d * sp / 2; PX.stroke(g, [[x - 1.6, ey - eh / 2 - 0.6], [x - 0.3, ey - eh / 2 - 1.5], [x + 1.4, ey - eh / 2 - 1.1]], 0.5, 0.42, BR); }
    }
    A.blush(g, ex, ey + eh * 0.72, { sp: sp + 2.6 });
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey) };
  };

  // ================= Snow Pea -> Frost Repeater -> Blizzard Pea =================
  // An icy pale-blue Peashooter (the same chibi pea head) with ice crystals instead of the back leaf, the pea family's red
  // bow tie. Stage 1: three crystals. Stage 2: a snow pile on its head with little icicles.
  PAL.snowpea = { main: ['#f4fcff', '#c3e8fb', '#9ed0ef'], leaf: ['#d0f4e6', '#88d4bf', '#64b4a0'], stem: '#74c2aa', root: '#a8865a', part: 'snout' };
  ART.snowpea = function (g, stage, P, C) {
    // clear ice-crystal shards at the back of the head, about the size of the Peashooter's leaf tuft: [kx, ky, angle, length, half-width]
    const crystals = (g2, hx, hy, r, rx, ry) => {
      const list = stage === 0 ? [[-0.5, -0.66, -2.05, 5.6, 1.7], [-0.78, -0.3, -2.65, 4.8, 1.5]] : [[-0.3, -0.8, -1.75, 5, 1.6], [-0.56, -0.6, -2.2, 6, 1.8], [-0.8, -0.26, -2.72, 5, 1.55]];
      for (const [kx, ky, a, len, w] of list) pc(g2, t => shard(t, hx + kx * rx, hy + ky * ry, len, a, w, ICE[0], ICE[2]));
    };
    const H = A.peaHead(g, stage, P, C, { tuft: crystals });
    if (stage === 2) { // Blizzard Pea: a little crown of three ice crystals on top
      const x = H.hx + 0.4, y = H.hy - H.ry + 1.4;
      for (const [dx, len, a, w] of [[-3, 3.6, -1.95, 1.3], [3.2, 3.6, -1.19, 1.3], [0.1, 4.8, -1.57, 1.5]]) pc(g, t => shard(t, x + dx, y + Math.abs(dx) * 0.18, len, a, w, ICE[0], ICE[2]));
    }
    chibiFace(g, H.ex, H.ey, H.r, P, { mouth: false });
    return { hx: R(H.hx), hy: R(H.hy), hr: H.r, top: topOf(g), ey: R(H.ey), front: R(H.front) };
  };

  // ================= Cherry Bomb -> Cherry Blaster -> Mega Cherry =================
  // Two round red cherries (dimpled at the top like real cherries) joined by stems to a leaf; MAD faces with gritted teeth.
  // Stage 1: bigger, with a lit fuse spark. Stage 2: three cherries.
  PAL.cherrybomb = { main: ['#ffd0d0', '#ff8a90', '#ec6a74'], leaf: LEAF2, stem: '#6ea852', root: '#a8865a', part: 'cherries' };
  function spark(g, x, y, r, f) {
    pc(g, t => { t.poly(starPts(x, y, r, r * 0.45, 5, f ? -Math.PI / 2 + 0.3 : -Math.PI / 2), '#ffb45a'); t.poly(starPts(x, y, r * 0.55, r * 0.3, 5, f ? -Math.PI / 2 : -Math.PI / 2 + 0.3), '#fff2a0'); });
  }
  ART.cherrybomb = function (g, stage, P, C) {
    const M = soft(C.main), hop = hopOf(P), f = P.frame ? 1 : 0;
    // [x, y, r] back to front; the last one is the "main" cherry
    const L = T(stage, [[10.4, 24.6, 6], [21.4, 24.9, 6.1]], [[9.9, 23.9, 6.6], [22, 24.2, 6.7]], [[16.2, 15.6, 5.8], [9.8, 24.3, 6.2], [22.2, 24.5, 6.3]]).map(([x, y, r], i) => [x, y + hop * (i % 2 ? 1 : 0.7), r]);
    const jx = T(stage, 16, 16.2, 17), jy = T(stage, 12.4, 10.6, 8.8) + hop;
    for (const [x, y, r] of L) pc(g, t => stroke(t, [[x + 0.2, y - r * 0.72], [x + (jx - x) * 0.25, jy + (y - r - jy) * 0.5], [jx, jy]], 0.62, 0.55, C.stem));
    if (stage >= 1) { const sx = jx - T(stage, 0, 3.8, 4.8), sy = jy - T(stage, 0, 3.2, 1.8); pc(g, t => stroke(t, [[jx, jy], [jx - 1.2, jy - 1.6], [sx + 0.8, sy + 0.6]], 0.42, 0.42, '#b88a5a')); spark(g, sx, sy, T(stage, 0, 2.4, 2.3) + f * 0.3, f); }
    pc(g, t => { t.ell(jx + 2.6, jy - 1.1, 3.1, 1.55, flat(C.leaf), -0.42); stroke(t, [[jx + 0.2, jy - 0.1], [jx + 4.8, jy - 2.1]], 0.2, 0.2, soft(C.leaf)[2]); });
    for (const [x, y, r] of L) pc(g, t => blobs(t, [[x - r * 0.26, y - r * 0.05, r * 0.78, r * 0.82], [x + r * 0.26, y - r * 0.05, r * 0.78, r * 0.82], [x, y + r * 0.12, r * 0.95, r * 0.85]], M, { a: r * 0.16, b: r * 0.17, hl: [x - r * 0.45, y - r * 0.42, r * 0.22, r * 0.13] }));
    for (const [x, y, r] of L) chibiFace(g, x + 0.5, y + r * 0.06, r, P, { mad: true, grin: true, sp: r * 0.84, w: Math.max(2.4, r * 0.48), h: Math.max(3.2, r * 0.64), mw: 2.6 + (r - 6) * 0.3, my: y + r * 0.66 });
    const H = L[L.length - 1];
    return { hx: R(H[0]), hy: R(H[1]), hr: R(H[2]), top: topOf(g), ey: R(H[1] + H[2] * 0.12) };
  };

  // ================= Potato Mine -> Spud Mine -> Mega Mine =================
  // A lumpy potato peeking out of a dirt mound with an antenna (grey stalk, red ball that lights up on frame 1), big eyes and
  // a little smile. Stage 1: bigger, leaves on the mound. Stage 2: a red warning light on top.
  PAL.potatomine = { main: ['#fff2d2', '#f2d4a2', '#dcb57e'], leaf: LEAF2, acc: ['#e2c6a4', '#c7a482', '#a98866'], stem: '#72bb5a', root: '#a8865a' };
  ART.potatomine = function (g, stage, P, C) {
    const M = soft(C.main), D = soft(C.acc), f = P.frame ? 1 : 0, hop = P.walk && P.frame ? -1.2 : P.arms === 'up' ? -0.8 : 0;
    const rx = T(stage, 7.2, 8.4, 9.4), ry = T(stage, 6.6, 7.6, 8.6), cx = 16, cy = 29.2 - ry + hop;
    const mrx = T(stage, 11.6, 12.8, 14), mtop = T(stage, 26.6, 26.2, 25.8), ptop = cy - ry;
    const LIT = f ? ['#fff0e8', '#ffb4a8', '#ff8a80'] : ['#ffc4bc', '#ff7a76', '#e85a5e'];
    { // the antenna: a grey stalk and a red ball (it lights up on frame 1; Mega Mine's is bigger and glows)
      const ax = cx + 1, br = T(stage, 1.5, 1.6, 2.1), aTop = ptop - T(stage, 3.4, 4, 3.6);
      pc(g, t => stroke(t, [[ax, ptop + 1.2], [ax, aTop + br * 0.6]], 0.42, 0.42, '#a4acbc'));
      if (stage === 2) pc(g, t => t.ell(ax, aTop - 0.4, br + 0.9, br + 0.9, f ? '#ffe0da' : '#ffd0cc')); // glow halo
      pc(g, t => t.ell(ax, aTop - 0.4, br, br, flat(LIT)));
      g.ell(ax - br * 0.35, aTop - 0.4 - br * 0.38, br * 0.32, br * 0.26, WHITE);
      if (f) for (const [dx, dy] of [[-1, -0.3], [1, -0.3], [0, -1]]) { const d = br + (stage === 2 ? 2.4 : 1.4); g.dots([[ax + dx * d, aTop - 0.4 + dy * d], [ax + dx * (d + 0.5), aTop - 0.4 + dy * (d + 0.5)]], '#ff9a90'); }
    }
    // the potato: a lumpy oval (a bump up at the back)
    pc(g, t => blobs(t, [[cx, cy, rx, ry], [cx - rx * 0.32, cy - ry * 0.22, rx * 0.72, ry * 0.8]], M, { a: rx * 0.15, b: ry * 0.16, hl: [cx - rx * 0.45, cy - ry * 0.55, rx * 0.22, ry * 0.12] }));
    for (const [kx, ky] of [[-0.62, 0.05], [0.66, -0.42]]) g.ell(cx + kx * rx, cy + ky * ry, 0.6, 0.42, mix(M[2], '#8a6040', 0.3), 0, fine((x, y) => g.filled(x, y)));
    if (stage >= 1) for (const [x, a] of [[16 - mrx + 3.4, Math.PI + 0.75], [16 + mrx - 3, -0.75]]) pc(g, t => t.ell(x + Math.cos(a) * 1.8, mtop + 2.1 + Math.sin(a) * 1.8, 2.4, 1.15, flat(C.leaf), a));
    // the dirt mound in front
    pc(g, t => { blobs(t, [[16, 31.4, mrx, 31.4 - mtop, 0, (x, y) => y <= 30.8], [12.6, 31.4, mrx * 0.62, 31.4 - mtop + 0.7, 0, (x, y) => y <= 30.8]], D, { a: 1.2, b: 1.2 }); });
    for (const [x, y] of [[16 - mrx + 4, mtop + 2.6], [16 + 3.2, mtop + 3.2], [16 + mrx - 4.4, mtop + 2.4]]) g.ell(x, y, 0.75, 0.5, D[0], 0, fine((xx, yy) => g.filled(xx, yy)));
    const ex = cx + 1, ey = cy - ry * 0.06, r = (rx + ry) / 2;
    chibiFace(g, ex, ey, r, P, { my: ey + r * 0.46, mw: r * 0.28, by: r * 0.38 });
    return { hx: R(cx), hy: R(cy), hr: R(rx), top: topOf(g), ey: R(ey) };
  };

  // ================= Puff-shroom -> Fume-shroom -> Gloom-shroom =================
  // Puff: a small purple squashed-dome cap on a chubby cream stalk with the face and a tiny tube mouth. Fume: a wide cap and a
  // big trumpet funnel coming out of its face, MAD. Gloom: a round dark-purple bulb ringed with vent tubes, worried eyes.
  // Mushrooms have no feet: the stalk flares to the ground.
  PAL.puffshroom = { main: ['#f2e2ff', '#d2aef6', '#b28ee0'], acc: CREAM, leaf: LEAF2, stem: '#72bb5a', root: '#a8865a', part: 'cap' };
  // a chubby stalk (the face) flaring to the ground
  const stalk = (g, x, y, rx, ry, C2) => pc(g, t => blobs(t, [[x, y, rx, ry], [x + 0.2, 29.1, rx + 1.3, 1.7]], C2, { a: rx * 0.14, b: ry * 0.14 }));
  // a squashed-dome cap with a soft rim underneath and big light spots
  function cap(g, x, y, rx, ry, M, spots, lean) {
    pc(g, t => blobs(t, [[x, y, rx, ry, 0, (xx, yy) => yy <= y + ry * 0.2], [x - rx * 0.12 + (lean || 0), y - ry * 0.2, rx * 0.84, ry * 0.92, 0, (xx, yy) => yy <= y + ry * 0.2], [x, y + ry * 0.2, rx * 0.97, ry * 0.2]], M, { a: rx * 0.12, b: ry * 0.14, hl: [x - rx * 0.45, y - ry * 0.55, rx * 0.2, ry * 0.12] }));
    const SP = mix(soft(M)[0], WHITE, 0.45);
    for (const [kx, ky, s] of spots) g.ell(x + kx * rx, y + ky * ry, s, s * 0.82, SP, 0, fine((xx, yy) => g.filled(xx, yy)));
  }
  ART.puffshroom = function (g, stage, P, C) {
    const M = soft(C.main), K = soft(C.acc), hop = hopOf(P) * 0.8;
    if (stage === 0) {
      const sx = 15, sy = 25.2 + hop * 0.5, cx = 15, cy = 20.4 + hop;
      stalk(g, sx, sy, 5.8, 5, K);
      pc(g, t => { t.ell(sx + 5.9, sy + 2, 1.8, 1.25, K[1]); t.ell(sx + 7.4, sy + 2, 0.85, 1.55, K[0]); t.ell(sx + 7.7, sy + 2, 0.45, 0.9, '#8a6a7a'); }); // tiny tube mouth
      cap(g, cx, cy, 7.8, 6.2, M, [[-0.5, -0.45, 1.3], [0.22, -0.72, 1.0], [0.6, -0.15, 0.8]]);
      chibiFace(g, sx + 0.8, sy - 0.1, 5.4, P, { mouth: false, by: 2.1, bw: 1.2, bh: 0.7 });
      return { hx: R(cx), hy: R(cy), hr: 8, top: topOf(g), ey: R(sy - 0.1) };
    }
    if (stage === 1) { // Fume-shroom
      const sx = 14, sy = 24.6 + hop * 0.5, cx = 14.6, cy = 17.6 + hop, fy = sy + 2.4;
      stalk(g, sx, sy, 6.2, 5.4, K);
      pc(g, t => { // the funnel: a trumpet coming out of its face, flaring to the right
        t.poly([[sx + 4.2, fy - 1.9], [sx + 7.2, fy - 1.8], [sx + 9.4, fy - 3.2], [sx + 9.4, fy + 3.2], [sx + 7.2, fy + 1.9], [sx + 4.2, fy + 2]], M[1]);
        softify(t, M, { a: 0.6, b: 0.9 });
      });
      pc(g, t => { t.ell(sx + 9.6, fy, 1.3, 3.2, M[0]); t.ell(sx + 9.9, fy, 0.7, 2.2, mix(M[2], '#3a1c40', 0.55)); });
      cap(g, cx, cy, 10, 7.2, M, [[-0.55, -0.4, 1.5], [0.12, -0.74, 1.2], [0.58, -0.25, 1.0], [-0.12, -0.2, 0.7]]);
      chibiFace(g, sx - 0.2, sy - 0.5, 6.2, P, { mad: true, sp: 5, w: 2.9, h: 3.8, mx: sx - 0.8, my: sy + 2.4, mw: 2 });
      return { hx: R(cx), hy: R(cy), hr: 10, top: topOf(g), ey: R(sy - 0.5), front: R(sx + 11) };
    }
    // Gloom-shroom
    const GM = soft(M.map(c => mix(c, '#8a62c4', 0.28))), cx = 15.6, cy = 16 + hop, crx = 10.2, cry = 8.6, sx = 15.6, sy = 24.8 + hop * 0.4;
    const vents = [[-2.72, 0], [-1.96, 0], [-1.18, 0], [-0.42, 0]];
    for (const [a, len] of vents) pc(g, t => { // vent tubes round the cap: plain short cylinders with one dark opening
      const ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca, w = 1.2;
      const bx = cx + ca * (crx - 1.6), by = cy + sa * (cry - 1.6), ex = cx + ca * (crx + 2.7), ey = cy + sa * (cry + 2.7);
      t.poly([[bx + px * w, by + py * w], [ex + px * w, ey + py * w], [ex - px * w, ey - py * w], [bx - px * w, by - py * w]], GM[1]);
      softify(t, GM, { a: 0.5, b: 0.5 });
      t.ell(ex - ca * 0.5, ey - sa * 0.5, 0.92, 0.5, mix(GM[2], '#2a1838', 0.6), a + Math.PI / 2);
      void len;
    });
    stalk(g, sx, sy, 6.4, 5.2, K);
    pc(g, t => blobs(t, [[cx, cy, crx, cry, 0, (x, y) => y <= cy + 4.6], [cx - 1, cy - 0.8, crx * 0.86, cry * 0.92, 0, (x, y) => y <= cy + 4.6], [cx, cy + 4.6, crx * 0.78, 0.9]], GM, { a: 1.4, b: 1.3, hl: [cx - crx * 0.45, cy - cry * 0.52, 2.2, 1.1] }));
    const SP = mix(GM[0], WHITE, 0.4);
    for (const [kx, ky, s] of [[-0.55, -0.3, 1.5], [0.05, -0.6, 1.25], [0.55, -0.15, 1.0], [-0.2, 0.18, 0.8]]) g.ell(cx + kx * crx, cy + ky * cry, s, s * 0.85, SP, 0, fine((x, y) => g.filled(x, y)));
    chibiFace(g, sx + 0.8, sy - 0.1, 6.4, P, { mood: 'sad', sp: 5.4, w: 3, h: 4, my: sy + 2.9, mw: 1.9, by: 2.6, bsp: 6.8 });
    return { hx: R(cx), hy: R(cy), hr: R(crx), top: topOf(g), ey: R(sy - 0.4) };
  };

  // ================= Sun-shroom -> Big Sun-shroom -> Mega Sun-shroom =================
  // A sunny orange-yellow squashed-dome cap with brown spots on a cream stalk with the face (big eyes, smile). It starts tiny
  // and grows; stage 2 has sun rays round its cap. Little twinkles: it glows.
  PAL.sunshroom = { main: ['#fff6c8', '#ffd682', '#f6b860'], acc: CREAM, leaf: LEAF2, stem: '#72bb5a', root: '#a8865a', part: 'cap' };
  ART.sunshroom = function (g, stage, P, C) {
    const M = soft(C.main), K = soft(C.acc), hop = hopOf(P) * 0.8, f = P.frame ? 1 : 0;
    const srx = T(stage, 5, 5.8, 6.4), sry = T(stage, 4.4, 5, 5.4), sx = 15.5, sy = T(stage, 25.4, 24.8, 24.6) + hop * 0.5;
    const crx = T(stage, 6.6, 8.8, 10), cry = T(stage, 5.2, 6.6, 7.6), cx = 15.5, cy = T(stage, 21.8, 19.6, 17.8) + hop;
    if (stage === 2) pc(g, t => { // sun rays
      for (let i = 0; i < 7; i++) { const a = -Math.PI + 0.3 + i * (Math.PI - 0.6) / 6, r0x = crx - 1.2, r0y = cry - 1.2; t.poly([[cx + Math.cos(a - 0.2) * r0x, cy + Math.sin(a - 0.2) * r0y], [cx + Math.cos(a + 0.2) * r0x, cy + Math.sin(a + 0.2) * r0y], [cx + Math.cos(a) * (crx + 3.2), cy + Math.sin(a) * (cry + 3.2)]], '#ffe9a0'); }
      softify(t, ['#fff6d0', '#ffe9a0', '#ffd27a'], { a: 0.5, b: 0.5 });
    });
    stalk(g, sx, sy, srx, sry, K);
    cap(g, cx, cy, crx, cry, M, []);
    const SPOT = mix(soft(M)[2], '#c47a3a', 0.45);
    for (const [kx, ky, s] of T(stage, [[-0.45, -0.4, 1.0], [0.3, -0.62, 0.8]], [[-0.5, -0.4, 1.2], [0.2, -0.68, 1.0], [0.6, -0.2, 0.8]], [[-0.5, -0.38, 1.35], [0.12, -0.7, 1.1], [0.58, -0.28, 0.95], [-0.08, -0.15, 0.7]])) g.ell(cx + kx * crx, cy + ky * cry, s, s * 0.82, SPOT, 0, fine((x, y) => g.filled(x, y)));
    const tw = f ? [[cx - crx - 1.6, cy - cry * 0.6], [cx + crx + 1.4, cy + 0.6]] : [[cx + crx + 0.9, cy - cry * 0.9], [cx - crx - 1.2, cy + 1]];
    for (const [x, y] of tw) twinkle(g, x, y, stage === 2 ? 1.8 : 1.4);
    const ex = sx + 0.8, ey = sy + 0.1, r = srx;
    chibiFace(g, ex, ey, r, P, { sp: r * 0.84, w: r * 0.46, h: r * 0.6, my: ey + r * 0.48, mw: Math.max(1.6, r * 0.32), by: r * 0.4, bsp: r * 1.06, bw: Math.max(0.9, r * 0.2), bh: 0.6 });
    return { hx: R(cx), hy: R(cy), hr: R(crx), top: topOf(g), ey: R(ey) };
  };

  // ================= Cabbage-pult -> Melon-pult -> Winter Melon =================
  // A round leafy cabbage head (leafy "hair" on top) with a catapult arm from behind holding a cabbage in a leaf basket.
  // Melon-pult: a wide striped watermelon body, MAD, no mouth, lobbing a melon. Winter Melon: a frosty blue melon with icy
  // spikes and a frosty melon in the basket (friendly).
  PAL.cabbagepult = { main: ['#f0fcd2', '#c4ea96', '#a0d178'], leaf: LEAF2, acc: WOOD, stem: '#72bb5a', root: '#a8865a', part: 'basket' };
  // melon stripes that follow the curve of an ellipse body: c = stripe centres across (-1 .. 1), skip(x, y) keeps the face clear
  function stripes(g, cx, cy, rx, ry, col, c, skip, w) {
    for (let fy = R((cy - ry) * g.k); fy <= R((cy + ry) * g.k); fy++) for (let fx = R((cx - rx) * g.k); fx <= R((cx + rx) * g.k); fx++) {
      const x = (fx + 0.5) / g.k, y = (fy + 0.5) / g.k; if (!g.ffilled(fx, fy) || (skip && skip(x, y))) continue;
      const v = (y - cy) / ry; if (Math.abs(v) >= 1) continue;
      const s = (x - cx) / (rx * Math.sqrt(1 - v * v)); if (Math.abs(s) > 1) continue;
      for (const k of c) if (Math.abs(s - k) < (w || 0.085) * (1 + Math.abs(v) * 0.4)) g.fset(fx, fy, col);
    }
  }
  // the catapult arm + leaf basket (behind the body) and the ammo in it
  function pultArm(g, C, from, cupX, cupY, ammo) {
    const LF = soft(C.leaf);
    pc(g, t => { stroke(t, [from, [from[0] - 2.6, from[1] - 3.4], [cupX + 0.9, cupY + 1.2]], 0.95, 0.8, LF[1]); softify(t, LF, { a: 0.4, b: 0.4 }); });
    if (ammo) ammo();
    pc(g, t => {
      t.ell(cupX, cupY, 3.5, 2, LF[1], 0, (x, y) => y >= cupY - 0.3);
      t.ell(cupX - 3.2, cupY - 0.9, 1.5, 0.85, LF[1], -0.9); // the scoop's tip curls up at the back
      softify(t, LF, { a: 0.5, b: 0.6 });
    });
    PX.stroke(g, [[cupX - 2, cupY + 0.9], [cupX + 2.2, cupY + 0.9]], 0.2, 0.2, LF[2]);
  }
  ART.cabbagepult = function (g, stage, P, C) {
    const hop = hopOf(P), r = T(stage, 8, 9, 10), hx = T(stage, 18.2, 18.4, 18.6), rx = T(stage, r, r * 1.08, r * 1.06), ry = T(stage, r * 0.92, r * 0.88, r * 0.88), hy = 26.4 - ry + hop;
    const M = soft(stage === 1 ? C.main.map(c => mix(c, '#74c25c', 0.32)) : stage === 2 ? C.main.map(c => mix(c, '#a6e4f0', 0.5)) : C.main);
    const cupX = hx - rx - 2.6, cupY = hy - r * 0.68;
    baseLeaves(g, hx - 0.4, C.leaf, P);
    pultArm(g, C, [hx - rx * 0.4, hy + ry * 0.4], cupX, cupY, () => {
      const ar = T(stage, 2.6, 3.1, 3.3), ay = cupY - ar * 0.8 + 0.4, AM = soft(T(stage, M.map(c => mix(c, WHITE, 0.25)), M, M.map(c => mix(c, WHITE, 0.2))));
      pc(g, t => blobs(t, [[cupX, ay, ar * (stage ? 1.12 : 1), ar * 0.92]], AM, { a: 0.6, b: 0.6, hl: [cupX - ar * 0.4, ay - ar * 0.45, ar * 0.26, ar * 0.15] }));
      if (stage === 0) PX.stroke(g, [[cupX - 0.4, ay - ar * 0.8], [cupX + 0.3, ay], [cupX - 0.2, ay + ar * 0.7]], 0.18, 0.18, AM[2]);
      else stripes(g, cupX, ay, ar * 1.12, ar * 0.92, stage === 1 ? mix(AM[2], '#2e6a3a', 0.4) : mix(AM[2], '#5a9ab8', 0.3), [-0.5, 0, 0.5], null, 0.1);
      if (stage === 2) g.ell(cupX - 0.6, ay - ar * 0.7, ar * 0.7, 0.55, WHITE, 0, fine((x, y) => g.filled(x, y)));
    });
    if (stage === 2) for (const [a, len] of [[-2.2, 3.4], [-1.65, 4], [-1.1, 3.2]]) pc(g, t => shard(t, hx + Math.cos(a) * rx * 0.8, hy + Math.sin(a) * ry * 0.8, len, a, 1.3, ICE[0], ICE[2])); // icy spikes
    pc(g, t => blobs(t, [[hx, hy, rx, ry], [hx - rx * 0.1, hy + ry * 0.12, rx * 0.96, ry * 0.9]], M, { a: rx * 0.14, b: ry * 0.15, hl: [hx - rx * 0.45, hy - ry * 0.5, rx * 0.22, ry * 0.12] }));
    const ex = hx + 1.1, ey = hy + ry * 0.18, face = (x, y) => Math.abs(x - ex) < r * 0.62 && y > ey - r * 0.5 && y < ey + r * 0.55;
    if (stage === 0) { // leafy "hair": three curled leaves folding over the top
      for (const [kx, ky, a, s] of [[-0.55, -0.62, -0.5, 1], [0.05, -0.86, 0.1, 1.1], [0.58, -0.6, 0.55, 0.95]]) pc(g, t => { t.ell(hx + kx * rx, hy + ky * ry, 3.4 * s, 2.3 * s, flat(M.map(c => mix(c, '#9ad46e', 0.25))), a, (x, y) => y < hy - ry * 0.18); });
      for (const d of [-1, 1]) PX.stroke(g, [[hx + d * rx * 0.62, hy - ry * 0.1], [hx + d * rx * 0.74, hy + ry * 0.35], [hx + d * rx * 0.56, hy + ry * 0.7]], 0.2, 0.2, M[2]);
    } else {
      stripes(g, hx, hy, rx, ry, stage === 1 ? mix(M[2], '#2e6a3a', 0.4) : mix(M[2], '#5a9ab8', 0.25), [-0.74, -0.38, 0.38, 0.74], face, 0.085);
      if (stage === 2) { // frost along the top
        for (let i = 0; i < 9; i++) { const x = hx - rx * 0.8 + i * rx * 0.2, y = hy - ry * Math.sqrt(Math.max(0, 1 - ((x - hx) / rx) ** 2)) + 0.9; g.ell(x, y, 1.1, i % 2 ? 0.75 : 1.05, WHITE, 0, fine((xx, yy) => g.filled(xx, yy))); }
      }
    }
    if (stage === 1) chibiFace(g, ex, ey, r, P, { mad: true, mouth: false }); // Melon-pult: mad, no mouth
    else chibiFace(g, ex, ey, r, P, { my: ey + r * 0.4 });
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey) };
  };

  // ================= Kernel-pult -> Butter-pult -> Cob Cannon =================
  // A corn cob (rounded at the top) in green husk leaves with a big yellow mustache and a catapult arm with a kernel (stage 0)
  // or a pat of butter (stage 1). Cob Cannon: a big cob lying on a little wooden cart with donut wheels, MAD, no mouth.
  PAL.kernelpult = { main: ['#fffad8', '#fde892', '#f2cd66'], leaf: ['#d8f4b0', '#96d474', '#72b25e'], acc: WOOD, stem: '#72bb5a', root: '#a8865a', part: 'basket' };
  const BUTTER = ['#fffbe8', '#fff0a8', '#f2d470'];
  const MUST = ['#f6d468', '#f2c84b', '#d9a63a'];
  // soft kernel bumps (lighter ovals in staggered rows) inside the cob, skipping skip(x, y)
  function kernelBumps(g, x0, y0, x1, y1, M, skip, rot) {
    const c = Math.cos(rot || 0), s = Math.sin(rot || 0), K = mix(M[1], M[0], 0.7);
    for (let j = 0; j * 1.7 <= (y1 - y0); j++) for (let i = 0; i * 1.9 <= (x1 - x0); i++) {
      const u = x0 + i * 1.9 + (j % 2) * 0.95, v = y0 + j * 1.7, x = 16 + (u - 16) * c - (v - 16) * s, y = 16 + (u - 16) * s + (v - 16) * c;
      if (skip && skip(x, y)) continue;
      if (g.get(x, y) !== M[1] || g.get(x - 0.6, y) !== M[1] || g.get(x + 0.6, y) !== M[1]) continue;
      g.ell(x, y, 0.62, 0.5, K, rot || 0, fine((xx, yy) => g.get(xx, yy) === M[1]));
    }
  }
  ART.kernelpult = function (g, stage, P, C) {
    const M = soft(C.main), hop = hopOf(P);
    if (stage < 2) {
      const rx = T(stage, 7.4, 8.2, 0), ry = T(stage, 8.6, 9.6, 0), hx = 18, hy = 27.2 - ry + hop, r = rx * 1.12;
      const cupX = hx - rx - 3.2, cupY = hy - ry * 0.5;
      baseLeaves(g, hx - 0.6, C.leaf, P);
      pultArm(g, C, [hx - rx * 0.5, hy + ry * 0.35], cupX, cupY, () => {
        if (stage === 0) pc(g, t => blobs(t, [[cupX, cupY - 1.5, 1.9, 1.7], [cupX, cupY - 2.6, 1.3, 1.1]], M, { a: 0.5, b: 0.5, hl: [cupX - 0.7, cupY - 2.4, 0.5, 0.35] }));
        else { pc(g, t => { t.poly([[cupX - 2.8, cupY - 0.2], [cupX - 2.2, cupY - 3.4], [cupX + 2.4, cupY - 3.6], [cupX + 2.9, cupY - 0.2]], BUTTER[1]); softify(t, BUTTER, { a: 0.6, b: 0.6 }); }); g.ell(cupX - 1, cupY - 2.8, 1, 0.4, WHITE, 0, fine((x, y) => g.filled(x, y))); }
      });
      for (const d of [-1, 1]) pc(g, t => { const bx = hx + d * rx * 0.7, by = hy + ry * 0.7, a = d > 0 ? -0.75 : -Math.PI + 0.75; t.ell(bx + Math.cos(a) * 3.4, by + Math.sin(a) * 3.4, 3.8, 1.8, flat(C.leaf), a); stroke(t, [[bx, by], [bx + Math.cos(a) * 6, by + Math.sin(a) * 6]], 0.2, 0.2, soft(C.leaf)[2]); }); // husk leaves peeled back behind the cob
      pc(g, t => blobs(t, [[hx, hy + ry * 0.08, rx, ry * 0.92], [hx - 0.2, hy - ry * 0.3, rx * 0.84, ry * 0.7]], M, { a: rx * 0.14, b: ry * 0.13, hl: [hx - rx * 0.45, hy - ry * 0.62, rx * 0.2, ry * 0.11] }));
      const ex = hx + 1, ey = hy + ry * 0.05;
      for (const [kx, ky] of [[-0.42, -0.62], [0, -0.74], [0.4, -0.6], [-0.62, -0.3], [0.64, -0.26], [-0.22, -0.45], [0.2, -0.44]]) g.ell(hx + kx * rx, hy + ky * ry, 0.75, 0.6, mix(M[1], M[0], 0.75), 0, fine((x, y) => g.get(x, y) === M[1] || g.get(x, y) === M[2])); // a few soft kernels
      chibiFace(g, ex, ey, r, P, { mouth: false, by: r * 0.34, bsp: r * 1.22 });
      // the big yellow mustache
      const my = ey + r * 0.44;
      pc(g, t => { // two lobes, thin at the middle and at the tips, curling up at the ends
        for (const d of [-1, 1]) {
          const s2 = r * 0.45 / 3.6, pts = [[ex + d * 0.45, my - 0.2], [ex + d * 1.4 * s2, my + 0.25], [ex + d * 2.5 * s2, my + 0.2], [ex + d * 3.3 * s2, my - 0.3], [ex + d * 3.6 * s2, my - 0.95], [ex + d * 3.15 * s2, my - 1.25]];
          for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k <= 6; k++) { const u = (i + k / 6) / (pts.length - 1), w = 0.26 + Math.sin(Math.min(1, u * 1.35) * Math.PI) * 0.46; t.ell(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k / 6, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k / 6, w, w * 0.9, MUST[1]); }
        }
        softify(t, MUST, { a: 0.3, b: 0.4 });
      });
      if (P.mouth === 'open' || P.mouth === 'o') A.chibiMouth(g, ex, my + 1.5, P.mouth, 1.6);
      return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey) };
    }
    // Cob Cannon: a big cob lying on a cart, its muzzle tipped up to the right, husk peeled back at the end
    const ccx = 16.4, ccy = 15.6 + hop, crx = 11, cry = 5.9, ang = -0.32, ca = Math.cos(ang), sa = Math.sin(ang);
    for (const [len, a] of [[6.4, Math.PI + 0.35], [6.8, Math.PI - 0.15], [5.6, Math.PI + 0.85]]) pc(g, t => { const bx = ccx - ca * (crx - 2.4), by = ccy - sa * (crx - 2.4); t.ell(bx + Math.cos(a) * len * 0.45, by + Math.sin(a) * len * 0.45, len / 2, 1.8, flat(C.leaf), a); });
    pc(g, t => blobs(t, [[ccx, ccy, crx, cry, ang], [ccx + ca * 2, ccy + sa * 2 - 0.3, crx * 0.78, cry * 1.04, ang]], M, { a: 1.4, b: 1.2, hl: [ccx - 4, ccy - 4.2, 2.4, 0.8, ang] }));
    const mx = ccx + ca * (crx - 1.3), my = ccy + sa * (crx - 1.3);
    g.ell(mx, my, 1.1, 2.4, INK, ang); g.ell(mx + 0.15, my, 0.65, 1.8, '#8a6a3a', ang);
    const ex = ccx + 1.6, ey = ccy + 0.4;
    kernelBumps(g, ccx - crx, ccy - cry, ccx + crx, ccy + cry, M, (x, y) => Math.hypot(x - ex, y - ey) < 4.6 || Math.hypot(x - mx, y - my) < 2.6, ang);
    // the cart (in front of the cob's belly) and its two donut wheels
    pc(g, t => { blobs(t, [[16, 23.8, 10.2, 2.9], [16, 22.6, 9.6, 2.2]], soft(C.acc), { a: 0.9, b: 0.7 }); });
    PX.stroke(g, [[7.6, 24.2], [24.4, 24.2]], 0.2, 0.2, soft(C.acc)[2]);
    for (const x of [8.6, 23.4]) g.ell(x, 23.4, 0.45, 0.45, '#b08458');
    for (const wx of [10.6, 21.6]) {
      const wy = 27.6, ro = 3.3, ri = 1.15, DOUGH = ['#fde6bc', '#f0c88e', '#dcac70'], ICING = ['#ffe2ec', '#ffb0c8', '#f494b4'];
      pc(g, t => {
        const ring = fine((x, y) => Math.hypot(x - wx, y - wy) > ri);
        t.ell(wx, wy, ro, ro, DOUGH[1], 0, ring); softify(t, DOUGH, { a: 0.6, b: 0.6 });
        t.ell(wx, wy, ro - 0.5, ro - 0.5, ICING[1], 0, fine((x, y) => ring(x, y) && y < wy + 0.4 + Math.sin(x * 3.1) * 0.5 && t.filled(x, y)));
      });
      g.dots([[wx - 1.9, wy - 1.2], [wx + 0.6, wy - 2.3], [wx + 2, wy - 0.6]], '#8ad4f0'); g.dots([[wx - 0.6, wy - 2.4], [wx + 1.6, wy - 1.8]], '#fff27a');
    }
    chibiFace(g, ex, ey, 7.4, P, { mad: true, mouth: false, sp: 5.4, w: 3.1, h: 4.1 }); // mad, no mouth
    return { hx: R(ccx), hy: R(ccy), hr: 6, top: topOf(g), ey: R(ey), front: R(mx + 1) };
  };

  // ================= Squash -> Super Squash -> Mega Squash =================
  // A pale-green PEAR / gourd (big round bottom, smaller top) with a stubby curled stem, heavy MAD brows and a frown.
  // Stage 1: soft ridges. Stage 2: a red sweatband with tails.
  PAL.squash = { main: ['#ecfad2', '#bde39a', '#99c978'], leaf: LEAF2, acc: ['#ffcaca', '#ff8890', '#e66a74'], stem: '#6aa852', root: '#a8865a', part: 'brows' };
  ART.squash = function (g, stage, P, C) {
    const M = soft(C.main), hop = hopOf(P);
    const brx = T(stage, 8.4, 9.4, 10.4), bry = T(stage, 6.6, 7.2, 7.8), by = 30.2 - bry + hop, cx = 16;
    const trx = T(stage, 5.6, 6.2, 6.8), tr = T(stage, 5.4, 6, 6.6), ty = by - bry + 0.6, tx = cx - 0.6;
    pc(g, t => stroke(t, [[tx, ty - tr + 1], [tx - 0.6, ty - tr - 1.2], [tx + 0.4, ty - tr - 2.4], [tx + 1.8, ty - tr - 2.2]], 1.0, 0.7, C.stem));
    pc(g, t => blobs(t, [[cx, by, brx, bry], [tx, ty, trx, tr], [cx - 0.3, by - bry * 0.45, brx * 0.86, bry * 0.7]], M, { a: brx * 0.13, b: bry * 0.18, hl: [tx - trx * 0.42, ty - tr * 0.45, trx * 0.24, tr * 0.14] }));
    const ex = cx + 1, ey = by - bry * 0.12;
    if (stage >= 1) for (const d of [-1, 1]) PX.stroke(g, [[cx + d * brx * 0.55, by - bry * 0.55], [cx + d * brx * 0.7, by + bry * 0.05], [cx + d * brx * 0.52, by + bry * 0.72]], 0.24, 0.24, M[2]);
    if (stage === 2) { // sweatband round the top + its tails
      const hb = ty - tr * 0.1, BAND = soft(C.acc);
      pc(g, t => { stroke(t, [[tx - trx - 0.4, hb + 0.3], [tx - trx - 2.6, hb + 1.6], [tx - trx - 3.6, hb + 1.2]], 0.75, 0.55, BAND[1]); stroke(t, [[tx - trx - 0.4, hb + 0.6], [tx - trx - 2.2, hb + 3.2], [tx - trx - 3.2, hb + 3.6]], 0.75, 0.55, BAND[2]); });
      pc(g, t => { t.ell(tx, ty, trx + 0.45, tr + 0.4, BAND[1], 0, (x, y) => y >= hb - 0.9 && y <= hb + 0.9); softify(t, BAND, { a: 0.6, b: 0.5 }); });
    }
    chibiFace(g, ex, ey, bry * 1.1, P, { mad: true });
    return { hx: R(tx), hy: R(ty), hr: R(trx), top: topOf(g), ey: R(ey) };
  };

  // ================= Jalapeno -> Ghost Pepper -> Dragon Pepper =================
  // A chubby red chili TEARDROP (wide at the top, its tail curling at the bottom), a green calyx cap and a curly stem, MAD with
  // gritted teeth. Stage 1: pale and ghostly with wispy tails. Stage 2: little dragon horns and bat wings.
  PAL.jalapeno = { main: ['#ffd0c6', '#ff8c80', '#ec6c66'], leaf: LEAF2, stem: '#6aa852', root: '#a8865a', part: 'flame' };
  ART.jalapeno = function (g, stage, P, C) {
    const hop = hopOf(P), M = soft(C.main);
    const rx = T(stage, 6.2, 6.8, 7.4), ry = T(stage, 6.4, 7, 7.4), hx = 16.4, cy = T(stage, 16.2, 14.6, 14) + hop;
    const r = (rx + ry) / 2;
    baseLeaves(g, 16, C.leaf, P, { dx: 4.4 });
    if (stage === 1) for (const [x, y, h, lean] of [[hx - rx + 0.4, 27.4, 4.6, -1.2], [hx + rx - 0.2, 27, 3.8, 1]]) pc(g, t => { // two little heat licks round its base
      t.poly([[x - 1.3, y + 1], [x - 1.2, y - h * 0.4], [x + lean, y - h], [x + 0.5, y - h * 0.5], [x + 1.3, y - h * 0.3], [x + 1.2, y + 1]], '#ffad6a');
      t.poly([[x - 0.6, y + 1], [x - 0.5, y - h * 0.3], [x + lean * 0.6, y - h * 0.68], [x + 0.6, y - h * 0.2], [x + 0.6, y + 1]], '#ffe08a');
    });
    if (stage === 2) { // little bat wings behind
      const WG = soft(C.main.map(c => mix(c, '#b8404e', 0.3)));
      pc(g, t => { t.poly([[hx - 2, cy - 0.6], [hx - 8.6, cy - 6], [hx - 10.4, cy + 1], [hx - 8, cy - 0.2], [hx - 7.4, cy + 4], [hx - 5.2, cy + 1.6], [hx - 2.6, cy + 4.4]], WG[1]); softify(t, WG, { a: 0.6, b: 0.6 }); });
      pc(g, t => { t.poly([[hx + 3, cy - 2], [hx + 8.4, cy - 6.6], [hx + 9.4, cy - 1.4], [hx + 7, cy - 2]], WG[2]); });
    }
    // the chili: a round top and a tail that tapers and curls to the left
    pc(g, t => {
      const S = M;
      t.ell(hx, cy, rx, ry, S[1]); t.ell(hx - 0.6, cy + ry * 0.45, rx * 0.9, ry * 0.8, S[1]);
      stroke(t, [[hx - 0.4, cy + ry * 0.6], [hx - 0.6, cy + ry + 2.2], [hx - 2.6, 27.6], [hx - 5.6, 28.3], [hx - 7.4, 26.9]], rx * 0.78, 0.95, S[1]);
      softify(t, S, { a: rx * 0.15, b: ry * 0.15, hl: [hx - rx * 0.45, cy - ry * 0.5, rx * 0.22, ry * 0.12] });
    });
    if (stage === 2) for (const d of [-1, 1]) pc(g, t => { const x = hx + d * rx * 0.55; t.poly([[x - 1.2, cy - ry + 1.6], [x + 1.2, cy - ry + 1.6], [x + d * 1.6, cy - ry - 2.4]], '#fff2d0'); softify(t, ['#fffbe8', '#fff2d0', '#e8d4a8'], { a: 0.4, b: 0.4, only: '#fff2d0' }); });
    pc(g, t => { // calyx cap + curly stem
      const LF = soft(C.leaf), y0 = cy - ry + 0.6;
      stroke(t, [[hx + 0.2, y0], [hx + 0.4, y0 - 2], [hx + 1.8, y0 - 3], [hx + 2.8, y0 - 2.2], [hx + 2.2, y0 - 1.4]], 0.62, 0.45, C.stem);
      t.ell(hx, y0 + 0.2, rx * 0.6, 1.3, LF[1]);
      for (const dx of [-rx * 0.48, 0.2, rx * 0.5]) t.poly([[hx + dx - 1.1, y0 + 0.6], [hx + dx + 1.1, y0 + 0.6], [hx + dx * 1.1, y0 + 2.6]], LF[1]);
      softify(t, LF, { a: 0.5, b: 0.5, only: LF[1] });
    });
    const ex = hx + 0.8, ey = cy + ry * 0.12;
    chibiFace(g, ex, ey, r, P, { mad: true, grin: true, sp: r * 0.8, w: r * 0.46, h: r * 0.6, my: ey + r * 0.54, mw: r * 0.42 });
    return { hx: R(hx), hy: R(cy), hr: R(rx), top: topOf(g), ey: R(ey) };
  };

  // ================= Cactus -> Prickly Cactus -> Spike Cactus =================
  // A chubby green cactus pill with stubby arms, a pink flower on top, little cream spines and a short tube on its side it
  // shoots from. MAD (scowl + frown). Stage 1: two arms. Stage 2: a crown of three flowers.
  PAL.cactus = { main: ['#e2f6c6', '#a8da86', '#86bf6a'], leaf: LEAF2, acc: PINK, stem: '#72bb5a', root: '#a8865a', part: 'spikes' };
  function flower(g, x, y, pr, n, A1) {
    pc(g, t => { for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / n; t.ell(x + Math.cos(a) * pr, y + Math.sin(a) * pr, pr * 0.95, pr * 0.78, flat(A1), a); } });
    pc(g, t => t.ell(x, y, pr * 0.62, pr * 0.62, flat(GOLD)));
  }
  ART.cactus = function (g, stage, P, C) {
    const M = soft(C.main), hop = hopOf(P), up = P.arms === 'down' ? -1 : P.arms === 'up' ? 1.4 : 1;
    const rx = T(stage, 6.6, 7.4, 8), ry = T(stage, 8.2, 9.4, 10.4), hx = 15.6, hy = 30.3 - ry + hop;
    const arms = T(stage, [[-1, 0.3]], [[-1, 0.3], [1, -0.05]], [[-1, 0.3], [1, -0.05]]); // [side, y offset (x ry)]
    for (const [s, oy] of arms) pc(g, t => {
      const x0 = hx + s * rx * 0.6, y0 = hy + oy * ry, x1 = hx + s * (rx + 2.2), r0 = T(stage, 1.7, 1.85, 2);
      stroke(t, [[x0, y0], [x1, y0 + 0.2], [x1 + s * 0.3, y0 - up * 3.2]], r0, r0 * 0.95, M[1]); softify(t, M, { a: 0.6, b: 0.6 });
    });
    const tubeY = hy + ry * 0.38;
    pc(g, t => { t.ell(hx + rx + 0.6, tubeY, 1.8, 1.3, M[1]); softify(t, M, { a: 0.4, b: 0.4 }); }); // the little tube on its side
    pc(g, t => { t.ell(hx + rx + 2.1, tubeY, 0.75, 1.45, M[0]); t.ell(hx + rx + 2.3, tubeY, 0.38, 0.9, mix(M[2], '#2b2129', 0.5)); });
    pc(g, t => blobs(t, [[hx, hy - ry * 0.28, rx * 0.97, ry * 0.74], [hx, hy + ry * 0.24, rx * 1.03, ry * 0.76]], M, { a: rx * 0.15, b: ry * 0.12, hl: [hx - rx * 0.42, hy - ry * 0.62, rx * 0.22, ry * 0.1] }));
    const ex = hx + 0.8, ey = hy - ry * 0.02, r = rx * 1.04;
    // soft ridges with little cream spines
    for (const d of [-0.56, 0.62]) {
      const x = hx + d * rx;
      PX.stroke(g, [[x, hy - ry * 0.7], [x + d * 0.6, hy], [x, hy + ry * 0.75]], 0.2, 0.2, M[2]);
      for (let k = -2; k <= 2; k++) { const y = hy + k * ry * 0.32 + (d > 0 ? ry * 0.15 : 0); if (Math.abs(x - ex) < r * 0.55 && Math.abs(y - ey) < r * 0.5) continue; if (g.filled(x, y)) g.dots([[x - 0.25, y], [x + 0.3, y - 0.5]], '#fffbe6'); }
    }
    const ft = hy - ry + 0.4;
    if (stage < 2) flower(g, hx - 0.4, ft, T(stage, 1.5, 1.75, 0), 5, C.acc);
    else { flower(g, hx - 4.2, ft + 1.6, 1.4, 5, C.acc); flower(g, hx + 3.6, ft + 1.6, 1.4, 5, C.acc); flower(g, hx - 0.3, ft - 0.4, 2, 6, C.acc); }
    chibiFace(g, ex, ey, r, P, { mad: true, mw: r * 0.28 });
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), front: R(hx + rx + 3) };
  };

  // ================= Spikeweed -> Spikerock -> Spike Titan =================
  // A low, wide brown mound (a soft double hump) with chunky two-tone thorns and big eyes peeking out. Stage 1: grey rock
  // spikes. Stage 2: bigger spikes with shiny steel tips.
  PAL.spikeweed = { main: ['#f2e2c2', '#d9bc94', '#bea076'], leaf: LEAF2, acc: ['#fbefd8', '#e8cfa4', '#c9a878'], stem: '#72bb5a', root: '#a8865a', part: 'spikes' };
  ART.spikeweed = function (g, stage, P, C) {
    const M = soft(C.main), f = P.frame ? 1 : 0, hop = P.walk && P.frame ? -0.8 : P.arms === 'up' ? -0.6 : 0;
    const mrx = T(stage, 11, 12.4, 13.6), mry = T(stage, 6.4, 7, 7.6), base = 31 + hop, mtop = base - mry;
    const SPK = soft(T(stage, C.acc, C.acc.map(c => mix(c, '#c49a6a', 0.12)), ['#e6e2e2', '#b2adb2', '#8f8a90']));
    // spikes: [x, height, lean, half-width]
    const back = T(stage, [], [[10.4, 5.4, -0.8, 1.9], [16.6, 6.6, 0.2, 2.1], [22.6, 5.4, 0.9, 1.9]], [[9.4, 7, -1, 2.2], [15.6, 8.4, 0, 2.4], [21.6, 7.8, 0.8, 2.3], [26.6, 5.2, 1.6, 1.9]]);
    const front = T(stage,
      [[7.2, 3.6, -1.8, 1.7], [11, 4.8, -0.8, 1.9], [15, 5.6, -0.1, 2], [19, 5.4, 0.5, 2], [22.8, 4.6, 1.1, 1.9], [26, 3.4, 1.8, 1.6]],
      [[5.8, 4.2, -2.2, 1.9], [9.6, 6, -1.1, 2.2], [13.6, 7.2, -0.3, 2.3], [17.8, 7.4, 0.4, 2.3], [21.8, 6.4, 1, 2.2], [25.6, 4.6, 1.9, 2]],
      [[4.8, 5, -2.6, 2.1], [8.6, 7.4, -1.4, 2.4], [12.8, 9.2, -0.4, 2.6], [17.4, 9.6, 0.4, 2.6], [21.8, 8.4, 1.1, 2.4], [25.8, 6, 2, 2.2]]);
    const spike = (t, [x, h, lean, w], S, wob) => {
      const tx = x + lean, ty = mtop + 1.4 - h - wob, bY = mtop + 2.4;
      t.poly([[x - w, bY], [x, bY], [tx, ty]], S[0]); t.poly([[x, bY], [x + w, bY], [tx, ty]], S[2]);
      if (stage === 2) { const k = 0.3; t.poly([[tx + (x - w - tx) * k, ty + (bY - ty) * k], [tx + (x + w - tx) * k, ty + (bY - ty) * k], [tx, ty]], '#f4f8ff'); }
    };
    const wob = i => (P.walk && (i + f) % 2 ? 0.5 : 0);
    back.forEach((s, i) => pc(g, t => spike(t, s, SPK.map(c => mix(c, '#8a8090', 0.15)), wob(i + 1))));
    front.forEach((s, i) => pc(g, t => spike(t, s, SPK, wob(i))));
    pc(g, t => blobs(t, [[16, base, mrx, mry, 0, (x, y) => y <= base - 0.3], [13, base, mrx * 0.66, mry * 1.1, 0, (x, y) => y <= base - 0.3]], M, { a: 1.3, b: 1.3, hl: [10.4, mtop + 1.5, 1.6, 0.6] }));
    const ex = 17, ey = mtop + 2.7, r = mry;
    chibiFace(g, ex, ey, r, P, { sp: 6, w: 3.2, h: 4, mouth: P.mouth ? undefined : false, my: ey + 2.6, mw: 1.7, by: 2.2, bsp: 8.4, bw: 1.2, bh: 0.65 });
    return { hx: 17, hy: R(mtop + 2), hr: 6, top: topOf(g), ey: R(ey) };
  };

  // ================= Torchwood -> Blaze Wood -> Inferno Wood =================
  // A chunky tree stump (a rounded cylinder flaring into roots) with a light cut top ring and a fire burning on it (it flickers
  // with frame); a friendly face on the bark. Stage 1: taller, bigger fire. Stage 2: a blue-white hot core.
  PAL.torchwood = { main: ['#f3d7b0', '#dcb084', '#c29266'], leaf: LEAF2, stem: '#72bb5a', root: '#a8865a', part: 'flame' };
  function flamePts(x, base, w, h, f) {
    return [[x - w, base], [x - w * 0.98, base - h * 0.38], [x - w * 0.66, base - h * (0.66 + 0.08 * f)], [x - w * 0.36, base - h * 0.5], [x - w * 0.02, base - h * (1 - 0.08 * f)],
      [x + w * 0.3, base - h * 0.54], [x + w * 0.62, base - h * (0.64 + 0.1 * (1 - f))], [x + w * 0.92, base - h * 0.32], [x + w, base]];
  }
  ART.torchwood = function (g, stage, P, C) {
    const M = soft(C.main), f = P.frame ? 1 : 0, hop = hopOf(P) * 0.8;
    const rx = T(stage, 7.6, 8.2, 8.8), ry = T(stage, 6.8, 7.6, 8.2), cx = 16, cy = 29.4 - ry + hop, rimY = cy - ry * 0.82, fh = T(stage, 9, 10.6, 11.6), fw = rx - 0.4;
    const FIRE = stage === 2 ? ['#ffab6a', '#ffd46a', '#dff4ff'] : ['#ff9e6a', '#ffcc62', '#fff4c0'];
    // the flame first (the rim covers its base)
    pc(g, t => { t.poly(flamePts(cx, rimY + 0.6, fw, fh, f), FIRE[0]); });
    pc(g, t => { t.poly(flamePts(cx + 0.3, rimY + 0.6, fw * 0.66, fh * 0.68, 1 - f), FIRE[1]); t.poly(flamePts(cx + 0.4, rimY + 0.6, fw * 0.34, fh * 0.4, f), FIRE[2]); });
    // the stump: a rounded cylinder with a root flare
    pc(g, t => {
      t.ell(cx, cy, rx, ry, M[1]); t.poly([[cx - rx * 0.97, cy - ry * 0.55], [cx + rx * 0.97, cy - ry * 0.55], [cx + rx * 0.99, cy + ry * 0.6], [cx - rx * 0.99, cy + ry * 0.6]], M[1]);
      t.ell(cx, 29.6 + hop * 0.3, rx + 1.6, 1.6, M[1]); t.ell(cx - rx - 0.6, 29.2 + hop * 0.3, 2, 1.4, M[1], 0.3); t.ell(cx + rx + 0.6, 29.4 + hop * 0.3, 2, 1.3, M[1], -0.3);
      softify(t, M, { a: rx * 0.13, b: 1.2, hl: [cx - rx * 0.55, cy - ry * 0.25, 0.9, ry * 0.3, -0.15] });
    });
    const RIM = soft([mix(M[0], WHITE, 0.4), mix(M[0], WHITE, 0.15), M[1]]);
    pc(g, t => { t.ell(cx, rimY, rx - 0.5, 1.8, RIM[1]); t.ell(cx, rimY, rx * 0.5, 0.85, RIM[0]); });
    
    // bark lines + a knot
    for (const [x, y0, y1] of [[cx - rx * 0.62, rimY + 2.4, cy + ry * 0.7], [cx + rx * 0.68, rimY + 2.8, cy + ry * 0.35]]) PX.stroke(g, [[x, y0], [x + 0.3, (y0 + y1) / 2], [x - 0.1, y1]], 0.22, 0.22, M[2]);
    g.ell(cx - rx * 0.45, cy + ry * 0.62, 0.8, 0.55, M[2]);
    const ex = cx + 0.9, ey = cy + ry * 0.14, r = rx;
    chibiFace(g, ex, ey, r, P, {});
    return { hx: R(cx), hy: R(cy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(cx), y: R(rimY), w: 9 } };
  };

  // ================= Lily Pad -> Lotus Pad -> Lotus Queen =================
  // A wide flat lily pad (with its notch) floating on a little pool, a soft dome in the middle with big eyes and NO mouth.
  // Stage 0: a pink bud behind. Stage 1: a lotus blooming behind. Stage 2: a big two-layer lotus and a tiny gold crown.
  PAL.lilypad = { main: ['#e0f7bc', '#a6db80', '#86bf66'], leaf: LEAF2, acc: PINK, stem: '#72bb5a', root: '#a8865a', part: 'lily' };
  function petal(t, x, y, len, w, a, col) {
    const c = Math.cos(a), s = Math.sin(a), px = -s * w, py = c * w;
    t.ell(x + c * len * 0.5, y + s * len * 0.5, len * 0.5, w, col, a);
    t.poly([[x + c * len * 0.55 + px * 0.8, y + s * len * 0.55 + py * 0.8], [x + c * (len + 1.1), y + s * (len + 1.1)], [x + c * len * 0.55 - px * 0.8, y + s * len * 0.55 - py * 0.8]], col);
  }
  ART.lilypad = function (g, stage, P, C) {
    const M = soft(C.main), f = P.frame ? 1 : 0, b = P.walk ? f * -0.8 : P.arms === 'up' ? -0.6 : 0;
    const prx = T(stage, 11.4, 12.2, 13), pry = T(stage, 3, 3.3, 3.6), py = 28.3 + b, bx = 15.4, brx = T(stage, 6, 6.8, 7.4), bry = T(stage, 6.2, 7, 7.6), btop = py - bry;
    pc(g, t => { blobs(t, [[16, 30.2, prx + 1.8, 1.6]], WATER, { a: 0.8, b: 0.5 }); }); // the little pool
    g.dots([[16 - prx - 0.6 + f, 30.4], [16 - prx + 0.4 + f, 30.4], [16 + prx - 1 - f, 29.9], [16 + prx - f, 29.9]], WHITE);
    const PK = soft(C.acc);
    if (stage === 0) { // a bud on a stalk at the back
      pc(g, t => stroke(t, [[21.6, py - 1], [22.2, py - 4.4], [21.8, py - 7.4]], 0.6, 0.55, C.stem));
      pc(g, t => { t.ell(21.8, py - 9.2, 1.9, 2.4, PK[1]); t.poly([[20.1, py - 9.6], [23.5, py - 9.6], [22, py - 12.8]], PK[1]); softify(t, PK, { a: 0.5, b: 0.5 }); });
    } else { // a lotus behind the dome: back petals first, the nearest last
      const ly = btop + 3.6, layers = stage === 2 ? [[7, 9.6, 2.5, soft(PK.map(c => mix(c, WHITE, 0.4)))], [5, 7.6, 2.3, PK]] : [[5, 7.4, 2.2, PK]];
      for (const [n, len, w, PC] of layers) {
        const order = [...Array(n).keys()].sort((i, j) => Math.abs(j - (n - 1) / 2) - Math.abs(i - (n - 1) / 2));
        for (const i of order) pc(g, t => { const a = -Math.PI + 0.3 + i * (Math.PI - 0.6) / (n - 1); petal(t, bx + Math.cos(a) * 1.4, ly + Math.sin(a) * 0.6, len, w, a, PC[1]); softify(t, PC, { a: 0.5, b: 0.5 }); });
      }
    }
    const nx = 16 + prx - 4.6; // the pad's notch: a V cut into its front tip
    pc(g, t => blobs(t, [[16, py, prx, pry, 0, (x, y) => !(x > nx && Math.abs(y - py + 0.3) < (x - nx) * 0.6)], [13.6, py - 0.2, prx * 0.7, pry * 1.05]], M, { a: 1.2, b: 0.9 }));
    PX.stroke(g, [[16 - prx + 2.4, py + pry * 0.45], [16 - brx - 1.4, py + pry * 0.6]], 0.2, 0.2, M[2]); PX.stroke(g, [[bx + brx + 1.2, py + pry * 0.6], [nx - 0.6, py + pry * 0.45]], 0.2, 0.2, M[2]);
    pc(g, t => blobs(t, [[bx, py, brx, bry, 0, (x, y) => y <= py + 0.4], [bx - 0.6, py - bry * 0.12, brx * 0.86, bry * 0.92, 0, (x, y) => y <= py + 0.4]], M, { a: brx * 0.14, b: bry * 0.14, hl: [bx - brx * 0.45, btop + bry * 0.4, brx * 0.22, bry * 0.12] }));
    let top = btop;
    if (stage === 2) { // a tiny gold crown on the dome
      const x = bx - 0.2, y = btop + 0.9;
      pc(g, t => { t.poly([[x - 2.8, y + 0.4], [x - 3, y - 2.2], [x - 1.4, y - 1], [x, y - 3.2], [x + 1.4, y - 1], [x + 3, y - 2.2], [x + 2.8, y + 0.4]], GOLD[1]); softify(t, GOLD, { a: 0.5, b: 0.5, only: GOLD[1] }); });
      g.ell(x, y - 1, 0.6, 0.6, '#ff7e8a'); top = y - 3.2;
    }
    const ex = bx + 0.8, ey = btop + bry * 0.5, r = brx;
    chibiFace(g, ex, ey, r, P, { mouth: false, by: r * 0.4 });
    return { hx: R(bx), hy: R(btop + bry * 0.45), hr: R(brx), top: topOf(g), ey: R(ey), hat: { x: R(bx), y: R(top + 1.5), w: 8 } };
  };

  // ================= Tangle Kelp -> Snap Kelp -> Kraken Kelp =================
  // A lumpy clump of soft olive kelp in a little pool, wavy fronds swaying above it (frame), big glowing red eyes, no mouth
  // (friendly). Stage 1: taller, more fronds. Stage 2: the frond tips curl like tentacles.
  PAL.tanglekelp = { main: ['#e2e8b4', '#b8c584', '#98a868'], leaf: ['#cfe2ac', '#94b878', '#76985e'], stem: '#72bb5a', root: '#a8865a', part: 'swirl' };
  // a wavy kelp ribbon: wide in the middle, rounded tip; curl rolls the tip over like a tentacle
  function frond(t, x0, y0, h, amp, ph, w, col, curl, lean) {
    const pts = [];
    for (let i = 0; i <= 10; i++) { const k = i / 10; pts.push([x0 + (lean || 0) * k * k + Math.sin(k * 3.6 + ph) * amp * k, y0 - k * h]); }
    if (curl) {
      const [ex, ey] = pts[10], [px, py] = pts[9], dx = ex - px, dy = ey - py, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
      const rc = 1.4, cxp = ex - uy * rc * curl, cyp = ey + ux * rc * curl; let a = Math.atan2(ey - cyp, ex - cxp);
      for (let i = 1; i <= 6; i++) { a += 0.8 * curl; pts.push([cxp + Math.cos(a) * rc, cyp + Math.sin(a) * rc]); }
    }
    const n = pts.length - 1;
    for (let i = 0; i < n; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], seg = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.3));
      for (let s2 = 0; s2 <= seg; s2++) { const k = (i + s2 / seg) / n, r = w * (0.55 + Math.sin(Math.min(1, k * 1.15) * Math.PI) * 0.6) * (curl && k > 0.75 ? 0.75 : 1); t.ell(ax + (bx - ax) * s2 / seg, ay + (by - ay) * s2 / seg, Math.max(0.55, r), Math.max(0.55, r), col); }
    }
  }
  ART.tanglekelp = function (g, stage, P, C) {
    const M = soft(C.main), LF = soft(C.leaf), f = P.frame ? 1 : 0, sw = f * 0.8, hop = P.walk && P.frame ? -1 : P.arms === 'up' ? -0.8 : 0;
    const r = T(stage, 7.2, 8.2, 9.2), cx = 16, cy = 29.4 - r * 0.86 + hop, curl = stage === 2;
    pc(g, t => blobs(t, [[16, 30.2, r + 5, 1.6]], WATER, { a: 0.8, b: 0.5 }));
    g.dots([[16 - r - 3.6 + f, 30.4], [16 - r - 2.6 + f, 30.4], [16 + r + 2.6 - f, 29.9]], WHITE);
    // wavy strands sticking up behind: [x, height, sway, phase, lean]
    const fr = T(stage,
      [[13.2, 11.6, 1.5, 0, -3.8], [16, 13.6, 1.6, 1.8, 0], [18.8, 11.8, 1.5, 3.4, 3.8]],
      [[12.2, 13.4, 1.7, 0, -4.8], [14.8, 16.6, 1.8, 1.8, -1.4], [17.6, 16.2, 1.8, 3.4, 1.8], [20.2, 13, 1.7, 5, 5]],
      [[11.8, 14.6, 1.8, 0, -5.6], [14.6, 18.4, 1.9, 1.8, -1.6], [17.6, 18.6, 1.9, 3.4, 1.6], [20.6, 14.4, 1.8, 5, 5.6]]);
    fr.forEach(([x, h, amp, ph, lean], i) => pc(g, t => { frond(t, x, 28.8 + hop, h, amp, ph + sw, 1.15, LF[1], curl ? (lean <= 0 ? 1 : -1) : 0, lean); softify(t, i % 2 ? LF : soft(LF.map(c => mix(c, WHITE, 0.15))), { a: 0.5, b: 0.6 }); }));
    pc(g, t => blobs(t, [[cx, cy, r, r * 0.86], [cx - r * 0.4, cy + r * 0.2, r * 0.66, r * 0.66], [cx + r * 0.42, cy + r * 0.22, r * 0.62, r * 0.62]], M, { a: r * 0.14, b: r * 0.14, hl: [cx - r * 0.3, cy - r * 0.62, r * 0.2, r * 0.1] }));
    // kelp strands draping over its head and down its sides like hair (the face peeks out between them)
    for (const d of [-1, 1]) pc(g, t => {
      const pts = [[cx + d * r * 0.15, cy - r * 0.84], [cx + d * r * 0.72, cy - r * 0.55 + sw * 0.2], [cx + d * (r * 0.98 + sw * 0.3), cy + r * 0.1], [cx + d * (r * 0.92 - sw * 0.2), cy + r * 0.6], [cx + d * (r * 1.12), 29.6 + hop]];
      for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k <= 8; k++) { const u = (i + k / 8) / (pts.length - 1), w = 1.05 + Math.sin(u * Math.PI) * 0.55; t.ell(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k / 8, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k / 8, w, w, LF[1]); }
      softify(t, LF, { a: 0.5, b: 0.6 });
    });
    const ex = cx + 0.9, ey = cy + r * 0.08;
    chibiFace(g, ex, ey, r, P, { mouth: false, col: '#e0485e' });
    return { hx: R(cx), hy: R(cy), hr: R(r), top: topOf(g), ey: R(ey) };
  };

  // ================= Starfruit -> Star Burst -> Supernova Star =================
  // A chubby five-pointed star with rounded tips, a little green stem nub on top, big eyes and a smile; its side points are its
  // arms. Stage 1: bigger, with twinkles. Stage 2: a glowing second star behind it.
  PAL.starfruit = { main: ['#fff9cc', '#ffe27c', '#f5c656'], leaf: LEAF2, stem: '#72bb5a', root: '#a8865a', part: 'star' };
  function starBody(t, cx, cy, ro, armUp, col, rot) {
    const D = Math.PI / 180, ang = [-90, -18 - armUp, 54, 126, 198 + armUp].map(a => a * D + (rot || 0)), pts = [];
    for (let i = 0; i < 5; i++) { const a = ang[i], n = ang[(i + 1) % 5] + (i === 4 ? Math.PI * 2 : 0), m = (a + n) / 2; pts.push([cx + Math.cos(a) * ro * 0.9, cy + Math.sin(a) * ro * 0.9], [cx + Math.cos(m) * ro * 0.5, cy + Math.sin(m) * ro * 0.5]); }
    t.poly(pts, col);
    for (const a of ang) t.ell(cx + Math.cos(a) * ro * 0.75, cy + Math.sin(a) * ro * 0.75, ro * 0.21, ro * 0.21, col);
    t.ell(cx, cy + ro * 0.04, ro * 0.6, ro * 0.56, col);
    return ang.map(a => [cx + Math.cos(a) * ro * 0.96, cy + Math.sin(a) * ro * 0.96]);
  }
  ART.starfruit = function (g, stage, P, C) {
    const M = soft(C.main), hop = hopOf(P), f = P.frame ? 1 : 0;
    const ro = T(stage, 9.4, 10.4, 11.2), cx = 16, cy = 30.4 - ro * 0.78 + hop;
    const armUp = P.arms === 'up' ? 20 : P.arms === 'down' ? -14 : P.arms === 'out' ? 4 : 0;
    if (stage === 2) pc(g, t => { t.poly(starPts(cx, cy - 0.6, ro * 1.32, ro * 0.66, 5, -Math.PI / 2 + Math.PI / 5), '#fff3c0'); softify(t, ['#fffbe8', '#fff3c0', '#ffe49a'], { a: 0.8, b: 0.8 }); });
    let tips;
    pc(g, t => { tips = starBody(t, cx, cy, ro, armUp, M[1]); softify(t, M, { a: ro * 0.13, b: ro * 0.13, hl: [cx - ro * 0.42, cy - ro * 0.32, ro * 0.16, ro * 0.09] }); });
    const tp = tips[0];
    pc(g, t => { stroke(t, [[tp[0] - 0.2, tp[1] + 1], [tp[0] + 0.1, tp[1] - 1.2]], 0.7, 0.6, C.stem); t.ell(tp[0] + 1.5, tp[1] - 1.3, 1.5, 0.75, flat(C.leaf), -0.5); });
    if (stage >= 1) { const sp = f ? [[4.4, 9], [27.4, 12.6], [26.4, 24.4]] : [[5.4, 12.8], [27, 8.8], [5.6, 23.6]]; for (const [x, y] of sp) twinkle(g, x, y + (stage === 2 ? -1 : 0), stage === 2 && !f ? 1.9 : 1.5); }
    const ex = cx + 0.8, ey = cy + ro * 0.06, rf = ro * 0.6;
    chibiFace(g, ex, ey, rf, P, { bsp: rf * 1.1 });
    return { hx: R(cx), hy: R(cy), hr: R(ro * 0.6), top: topOf(g), ey: R(ey), hat: { x: R(tp[0]), y: R(tp[1] + 2.4), w: 6 } };
  };
})();
