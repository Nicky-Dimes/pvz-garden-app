// art-plants2.js — PVZ Garden plant species art, batch 2 (see the SPECIES ART CONTRACT at the top of art-core.js).
// Wall-nut, Snow Pea, Cherry Bomb, Potato Mine, Puff-shroom, Sun-shroom, Cabbage-pult, Kernel-pult, Squash, Jalapeno,
// Cactus, Spikeweed, Torchwood, Lily Pad, Tangle Kelp, Starfruit.
// Each species: PX.PLANT_PAL[id] (default colours) + PX.PLANT_ART[id](g, stage, P, C) -> geom. Art faces RIGHT, 32x32.
// Same idiom as art-plants.js: per-stage values via T(), piece() for separately outlined parts, g.outline(), detail pixels, face().
(function () {
  'use strict';
  const { INK, stroke, starPts, Grid } = PX;
  const { face, mouth, feet, leaf, baseLeaves, stemTo, piece, mixHex, under, LEAF } = PX.art;
  const ART = PX.PLANT_ART, PAL = PX.PLANT_PAL;
  const T = (stage, a, b, c) => (stage === 2 ? c : stage === 1 ? b : a); // pick a value per stage
  const R = Math.round;
  const WHITE = '#ffffff';
  const bob = P => (P.frame && !P.walk ? 0.4 : 0);
  const lighten = (c, k) => mixHex(c, WHITE, k), darken = (c, k) => mixHex(c, INK, k);
  const tint = (ramp, c, k) => ramp.map(x => mixHex(x, c, k));
  const rgbaOf = (hex, a) => { const n = parseInt(String(hex).slice(1, 7), 16); return isNaN(n) ? hex : `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  // paint detail pixels only where the plant already has colour (never on outline / empty)
  const dot = (g, list, col) => { for (const [x, y] of list) { const a = R(x), b = R(y); if (g.filled(a, b)) g.set(a, b, col); } };
  // one tone darker on a ramp (for stripes / grain drawn over a shaded shape)
  const deeper = (g, x, y, M) => { const c = g.get(x, y); if (!g.filled(x, y)) return; g.set(x, y, c === M[0] ? M[1] : c === M[1] ? M[2] : c === M[2] ? darken(M[2], 0.3) : c); };
  const scanTop = (t, x) => { for (let y = 0; y < t.h; y++) if (t.get(R(x), y) !== null) return y; return t.h; };
  const topOf = g => { for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.get(x, y) !== null) return y; return g.h; };
  // 3-tone shade everything already drawn on t inside an ellipse (gives poly / stroke shapes the ramp look)
  const shadeIn = (t, cx, cy, rx, ry, ramp, rot) => t.ell(cx, cy, rx, ry, ramp, rot || 0, (x, y) => t.filled(x, y));
  // superellipse (rounded box / capsule) with the engine's 3-tone shading + dither
  function blob(g, cx, cy, rx, ry, col, pw, mask) {
    pw = pw || 4;
    const ramp = Array.isArray(col), mn = Math.min(rx, ry), dw = ramp && mn >= 3.2 ? Math.min(0.1, 0.55 / mn) : 0;
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
      if (Math.pow(Math.abs(nx), pw) + Math.pow(Math.abs(ny), pw) > 1) continue;
      if (mask && !mask(x, y)) continue;
      if (!ramp) { g.set(x, y, col); continue; }
      const d = nx * 0.55 + ny * 0.85, odd = (x + y) & 1;
      let c = d < -0.42 ? col[0] : d > 0.55 ? col[2] : col[1];
      if (dw) { if (Math.abs(d + 0.42) < dw) c = odd ? col[0] : col[1]; else if (Math.abs(d - 0.55) < dw) c = odd ? col[1] : col[2]; }
      g.set(x, y, c);
    }
    return g;
  }
  // side leaf "arms" for body plants without a stem (only shown when a leaf pose is asked for)
  function sideArms(g, xl, xr, y, P, ramp, len) {
    const a = P.arms; if (!a) return;
    const r = a === 'up' ? -0.95 : a === 'out' ? -0.12 : a === 'hold' ? 0.3 : 0.75;
    piece(g, t => { leaf(t, xl, y, len, Math.PI - r, ramp, 0.3); leaf(t, xr, y, len, r, ramp, 0.3); });
  }
  // a little 4-point sparkle (no outline), used for glows
  function sparkle(g, x, y, big, c1, c2) {
    x = R(x); y = R(y);
    const arms = big ? [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [a, b] of arms) if (!g.get(x + a, y + b)) g.set(x + a, y + b, Math.abs(a) + Math.abs(b) > 1 ? c2 : c1);
    if (!g.filled(x, y)) g.set(x, y, WHITE);
  }
  const STEEL = ['#f4f8ff', '#a8b4c8', '#5e6a80'];
  const WOOD = ['#e2b478', '#ae7a42', '#6a4424'];
  const PINK = ['#ffe0f4', '#ff86d0', '#c4489a'];
  const GOLD = ['#fffbd0', '#f6c83a', '#b87818'];
  const CREAM = ['#fffbf0', '#f2e2c8', '#c4a684'];

  // ---------------- Wall-nut -> Tall-nut -> Giga Tall-nut ----------------
  // A big brown nut (C.main) on root feet with the face in the middle; a tall capsule with grain lines; then taller still with a
  // riveted steel band round the middle and bushy brave brows.
  PAL.wallnut = { main: ['#ecc48c', '#c48a4c', '#7a5228'], leaf: LEAF, acc: STEEL, stem: '#3f8a3a', root: '#6e4a26' };
  ART.wallnut = function (g, stage, P, C) {
    const b = bob(P), cx = 16, M = C.main;
    const rx = T(stage, 6.9, 6.5, 7.4), ry = T(stage, 8.5, 10.9, 12.9), cy = T(stage, 20.1, 17.9, 16) + b;
    feet(g, cx, P, C.root, T(stage, 3.4, 3.2, 3.8));
    sideArms(g, cx - rx + 0.6, cx + rx - 0.6, cy + T(stage, 2, 3, 4), P, C.leaf, 4.6);
    let bodyTop = 0;
    piece(g, t => {
      if (stage === 0) t.ell(cx, cy, rx, ry, M); else blob(t, cx, cy, rx, ry, M, stage === 1 ? 2.6 : 2.9);
      bodyTop = scanTop(t, cx);
    });
    const by = R(cy + 1.5); // Giga: steel band rows by..by+2
    if (stage === 2) piece(g, t => {
      blob(t, cx, cy, rx + 0.9, ry + 0.6, C.acc[0], 2.9, (x, y) => y === by);
      blob(t, cx, cy, rx + 0.9, ry + 0.6, C.acc[1], 2.9, (x, y) => y === by + 1);
      blob(t, cx, cy, rx + 0.9, ry + 0.6, C.acc[2], 2.9, (x, y) => y === by + 2);
    });
    g.outline();
    // shell texture: dark nicks + grain, light glint
    if (stage === 0) {
      dot(g, [[cx - 4, cy - 4], [cx - 4, cy - 3], [cx - 5, cy + 2], [cx - 4, cy + 3], [cx + 2, cy + 6], [cx + 3, cy + 6], [cx + 5, cy + 1], [cx - 1, cy - 7]], M[2]);
      dot(g, [[cx - 3, cy - 6], [cx - 2, cy - 7]], lighten(M[0], 0.5));
    } else {
      const rows = stage === 1 ? [cy - ry + 3, cy + 4, cy + 7.5] : [cy - ry + 3.5, cy + 6.5, cy + 9.5];
      rows.forEach((yy, i) => {
        const y = R(yy), x0 = i % 2 ? cx - rx + 1.5 : cx - rx + 2.5;
        for (let k = 0; k < 3; k++) deeper(g, R(x0 + k), y + (k === 2 ? 1 : 0), M);
        for (let k = 0; k < 2; k++) deeper(g, R(cx + rx - 3 - k), y + (i % 2) + (k ? 1 : 0), M);
      });
      dot(g, [[cx - 3, R(cy - ry + 2)], [cx - 2, R(cy - ry + 2)], [cx - 4, R(cy - ry + 3)]], lighten(M[0], 0.5));
    }
    if (stage === 2) { // rivets on the band
      for (let x = cx - 6; x <= cx + 6; x += 3) if (g.filled(x, by + 1)) { g.set(x, by + 1, WHITE); if (g.filled(x + 1, by + 2)) g.set(x + 1, by + 2, '#3e4658'); }
    }
    // cracks in the shell from all the blocking (Tall-nut one, Giga two): a dark zigzag with a lit lip on its left side
    if (stage >= 1) {
      const CK = darken(M[2], 0.35), lit = c => (c === M[2] ? M[1] : c === M[1] ? M[0] : c);
      const crack = pts => { for (const [x, y] of pts) if (g.filled(x, y)) g.set(x, y, CK); for (const [x, y] of pts) if (g.filled(x - 1, y) && g.get(x - 1, y) !== CK) g.set(x - 1, y, lit(g.get(x - 1, y))); };
      const t0 = R(cy - ry);
      if (stage === 1) crack([[cx + 4, t0 + 2], [cx + 4, t0 + 3], [cx + 3, t0 + 4], [cx + 4, t0 + 5]]);
      else { crack([[cx + 3, t0 + 1], [cx + 2, t0 + 2], [cx + 3, t0 + 3]]); crack([[cx - 4, by + 5], [cx - 3, by + 6], [cx - 3, by + 7], [cx - 4, by + 8]]); }
    }
    const ex = cx - 1, ey = R(cy - T(stage, 2.6, 3.6, 6));
    face(g, ex, ey, P, { gap: 4, mouth: [ex, ey + 4, 6], cheeks: [ex - 1, ex + 6, ey + 3] });
    if (stage === 2 && P.eyes !== 'sad') { // bushy brows: friendly arches (angled down only when a pose asks for 'brave')
      const bc = darken(M[2], 0.45), brave = P.eyes === 'brave';
      const L = brave ? [[ex - 2, ey - 3], [ex - 1, ey - 3], [ex, ey - 3], [ex - 2, ey - 2], [ex + 1, ey - 2]] : [[ex - 2, ey - 2], [ex - 1, ey - 3], [ex, ey - 3], [ex + 1, ey - 3], [ex + 2, ey - 2]];
      const Rr = brave ? [[ex + 7, ey - 3], [ex + 6, ey - 3], [ex + 5, ey - 3], [ex + 7, ey - 2], [ex + 4, ey - 2]] : [[ex + 3, ey - 2], [ex + 4, ey - 3], [ex + 5, ey - 3], [ex + 6, ey - 3], [ex + 7, ey - 2]];
      dot(g, L.concat(Rr), bc);
    }
    return { hx: cx, hy: ey + 2, hr: R(rx), top: topOf(g), ey, hat: { x: cx, y: bodyTop + 2, w: T(stage, 9, 8, 9) } };
  };

  // ---------------- Snow Pea -> Frost Repeater -> Blizzard Pea ----------------
  // An icy-blue pea head (C.main) with a snout, a crest of ice-crystal shards on the back of the head; stage 1 two big crystals
  // and brave eyes; stage 2 an icicle crown and a little snow cloud puffing behind.
  PAL.snowpea = { main: ['#e8fbff', '#8fd8f8', '#3f8fc8'], leaf: ['#a8f0dc', '#4cb8a8', '#2a7474'], stem: '#2f8a7a', root: '#7a5a2a', part: 'snout' };
  function shard(t, x, y, len, ang, w, A, B) {
    const c = Math.cos(ang), s = Math.sin(ang), px = -s * w, py = c * w, m = len * 0.4;
    const base = [x - c * 0.8, y - s * 0.8], tip = [x + c * len, y + s * len], w1 = [x + c * m + px, y + s * m + py], w2 = [x + c * m - px, y + s * m - py];
    t.poly([base, w1, tip], A); t.poly([base, tip, w2], B);
  }
  ART.snowpea = function (g, stage, P, C) {
    const hr = T(stage, 4.6, 5.4, 6), hx = 14, hy = T(stage, 16, 13, 12.6) + bob(P), sl = T(stage, 4, 5, 5.4), M = C.main;
    const ICE = [mixHex(M[0], WHITE, 0.7), M[0], M[1]], XT = [mixHex(M[0], WHITE, 0.4), M[2]];
    const f = P.frame ? 1 : 0;
    if (stage === 2) { // snow cloud puffing behind
      piece(g, t => { const CL = ['#ffffff', '#e2ecfa', '#98a8c0']; t.ell(3.6, 21.6, 2.6, 2, CL); t.ell(6.6, 20, 3, 2.7, CL); t.ell(9.2, 21.8, 2.3, 1.8, CL); t.rect(3, 22, 7, 2, CL[1]); });
    }
    stemTo(g, [[15.5, 29], [15.6, hy + hr + 2], [hx + 0.5, hy + hr - 0.5]], C.stem, T(stage, 0.8, 0.9, 1));
    baseLeaves(g, 16, 27.6, P, C.leaf, T(stage, 5, 6, 6.5));
    feet(g, 16, P, C.root, T(stage, 2.6, 3, 3.2));
    // ice-crystal crest on the back of the head (each shard outlined on its own): [angle, length, half-width]
    const crest = T(stage,
      [[-2.95, 3.6, 1.2], [-2.3, 4, 1.2], [-1.75, 3, 1]],
      [[-3.05, 4.6, 1.4], [-2.5, 5.6, 1.7], [-2.0, 4.4, 1.5], [2.75, 3.4, 1.1]],
      [[-3.0, 5, 1.4], [-2.45, 6.6, 1.9], [2.7, 4.4, 1.3], [-1.95, 4.2, 1.3]]);
    for (const [a, len, w] of crest) piece(g, t => shard(t, hx + Math.cos(a) * (hr - 1.4), hy + Math.sin(a) * (hr - 1.4), len, a, w, XT[0], XT[1]));
    // head + snout (same build as the peashooter)
    piece(g, t => { t.ell(hx, hy, hr, hr * 0.95, M); t.ell(hx + hr * 0.75 + 0.5, hy + 0.4, sl * 0.6, T(stage, 1.9, 2.2, 2.5), M); });
    const sx = R(hx + hr * 0.75 + sl * 0.6 + 0.6), sy = hy + 0.4, sr = T(stage, 2.1, 2.4, 2.8);
    piece(g, t => t.ell(sx, sy, 1.4, sr, M));
    if (stage === 2) piece(g, t => { // icicle crown
      const y = hy - hr + 1.6, x = hx + 0.5;
      for (const [dx, h] of [[-3.2, 2.4], [-1.6, 3.4], [0, 4.2], [1.6, 3.4], [3.1, 2.4]]) shard(t, x + dx, y - 0.2, h, -Math.PI / 2, 0.9, ICE[0], ICE[2]);
      t.ell(x, y, 4.2, 1.2, ICE);
    });
    g.outline();
    if (stage === 2) for (const [x, y] of [[3 + f, 26], [6, 27 - f], [8 - f, 26 + f], [4, 29 - f]]) if (!g.get(x, y)) g.set(x, y, '#5fb8e8');
    for (let yy = R(sy) - 1; yy <= R(sy) + 1; yy++) if (g.filled(sx, yy)) g.set(sx, yy, '#1f3a6a');
    if (P.mouth === 'open' && g.filled(sx, R(sy))) g.set(sx, R(sy), ICE[0]);
    const hl = [R(hx - hr * 0.5), R(hy - hr * 0.55)];
    if (stage < 2 && g.filled(hl[0], hl[1])) g.set(hl[0], hl[1], WHITE);
    const ex = R(hx - 1), ey = R(hy - (stage === 2 ? 0.5 : 1.5));
    face(g, ex, ey, P, { gap: 4, cheeks: [ex - 1, ex + 5, ey + 3] });
    return { hx: R(hx), hy: R(hy), hr: R(hr), top: topOf(g), ey, front: sx, hat: { x: R(hx), y: R(hy - hr + 1), w: 8 } };
  };

  // ---------------- Cherry Bomb -> Cherry Blaster -> Mega Cherry ----------------
  // Round red cherries (C.main) with angry faces, joined by stems to a leaf; stage 1 a lit spark on a fuse; stage 2 three cherries.
  PAL.cherrybomb = { main: ['#ff8a8a', '#e42a2e', '#901630'], leaf: LEAF, stem: '#3f8a3a', root: '#7a3a2a', part: 'cherries' };
  function spark(t, x, y, r, f) {
    t.poly(starPts(x, y, r, r * 0.42, 4, f ? -Math.PI / 4 : -Math.PI / 2), '#ffb02a');
    t.poly(starPts(x, y, r * 0.6, r * 0.3, 4, f ? -Math.PI / 2 : -Math.PI / 4), '#fff27a');
  }
  ART.cherrybomb = function (g, stage, P, C) {
    const b = bob(P), f = P.frame ? 1 : 0;
    const L = T(stage, [[11, 23.4, 4.5], [20.6, 24, 4.7]], [[10.4, 22.6, 5.3], [21.2, 23.4, 5.5]], [[16.2, 15.8, 4.6], [10, 23.4, 5.1], [21.8, 23.8, 5.3]]).map(([x, y, r]) => [x, y + b, r]);
    const jx = T(stage, 15.4, 15.8, 16.6), jy = T(stage, 12.6, 10.6, 8.8) + b;
    const spx = jx - T(stage, 0, 3.2, 3.8), spy = jy - T(stage, 0, 3.2, 2.6);
    feet(g, 16, P, C.root, T(stage, 4.6, 5.2, 5.8));
    for (const [x, y, r] of L) stemTo(g, [[x + 0.3, y - r + 1], [x + (jx - x) * 0.3, jy + (y - r - jy) * 0.45], [jx, jy]], C.stem, 0.6);
    if (stage >= 1) stemTo(g, [[jx, jy], [jx - 1.6, jy - 1], [spx + 0.6, spy + 0.8]], '#8a6a3a', 0.5); // fuse
    piece(g, t => { leaf(t, jx, jy, T(stage, 5, 6, 6.5), -0.35, C.leaf, 0.34); leaf(t, jx, jy, T(stage, 3.4, 4, 4.2), -0.9, C.leaf, 0.3); });
    if (stage >= 1) piece(g, t => spark(t, spx, spy, T(stage, 0, 2.6, 3) + f * 0.4, f));
    for (const [x, y, r] of L) piece(g, t => t.ell(x, y, r, r * 0.95, C.main));
    g.outline();
    if (stage >= 1) g.set(R(spx), R(spy), WHITE);
    const FP = P.mouth ? P : Object.assign({}, P, { mouth: 'grin' }); // angry cherries: slanted brows, gritted teeth
    L.forEach(([x, y, r]) => {
      dot(g, [[x - r * 0.5, y - r * 0.55], [x - r * 0.5 + 1, y - r * 0.55], [x - r * 0.5, y - r * 0.55 + 1]], lighten(C.main[0], 0.55));
      const ex = R(x - 1.2), ey = R(y - 1.4);
      PX.art.madFace(g, ex, ey, FP, { gap: 3, mouth: [ex, ey + 4, 5] });
    });
    const H = stage === 2 ? L[0] : L[L.length - 1];
    return { hx: R(H[0]), hy: R(H[1]), hr: R(H[2]), top: topOf(g), ey: R(H[1] - 1.6), hat: { x: R(H[0]), y: R(H[1] - H[2] + 1.2), w: 7 } };
  };

  // ---------------- Potato Mine -> Spud Mine -> Mega Mine ----------------
  // A potato (C.main) peeking out of a dirt mound with a wire antenna and a red tip that blinks on frame 1; stage 2 a riveted
  // steel plate on the front and a big red warning light.
  PAL.potatomine = { main: ['#f4d49a', '#cc9a5c', '#8a5c30'], leaf: LEAF, acc: ['#b08458', '#7c5434', '#4a3020'], stem: '#3f8a3a', root: '#7a5a2a' };
  ART.potatomine = function (g, stage, P, C) {
    const b = bob(P), f = P.frame ? 1 : 0, wk = P.walk ? (f ? -0.6 : 0.6) : 0, M = C.main;
    const rx = T(stage, 6.4, 7.8, 9.2), ry = T(stage, 5.8, 6.8, 7.8), cx = 16 + wk, cy = T(stage, 21.4, 20.4, 19.4) + b;
    const mrx = T(stage, 10.5, 12, 13.5), mtop = T(stage, 26, 25.6, 25.4);
    const ptop = cy - ry, ax = R(cx), aTop = T(stage, 12, 8.4, 0);
    const BALL = f ? ['#fff0e0', '#ff5a4a', '#c42a2a'] : ['#ff9a90', '#d02c30', '#8a1a24'];
    const PLATE = ['#c8d0dc', '#8c96a8', '#4e586c'];
    sideArms(g, cx - rx + 0.6, cx + rx - 0.6, cy + 0.6, P, C.leaf, 4.4);
    if (stage < 2) {
      for (let y = R(aTop); y < ptop + 1; y++) g.set(ax, y, '#8c93a8');
      piece(g, t => t.ell(ax + 0.5, aTop - 0.4, 1.6, 1.6, BALL));
    } else {
      piece(g, t => { t.rect(ax - 1, R(ptop - 2.6), 3, 3, STEEL[1]); });
      piece(g, t => t.ell(ax + 0.5, ptop - 4.2, 3.2, 3, BALL, 0, (x, y) => y <= ptop - 2.8));
    }
    piece(g, t => t.ell(cx, cy, rx, ry, M));
    const ply = R(cy + 4.2);
    if (stage === 2) piece(g, t => { t.dither = false; blob(t, cx + 0.4, ply + 0.5, 7, 2.2, PLATE, 5); });
    piece(g, t => {
      t.ell(16, 30.2, mrx, 30.2 - mtop, C.acc, 0, (x, y) => y <= 30);
    });
    g.outline();
    // potato eyes (spots) + glint
    dot(g, [[cx - rx + 2, cy - 1], [cx - rx + 3, cy + 1], [cx - 2, ptop + 1.6], [cx + rx - 2, cy + 1.5]], M[2]);
    dot(g, [[cx - rx * 0.5, ptop + 1.4], [cx - rx * 0.5 + 1, ptop + 1.4]], lighten(M[0], 0.5));
    // dirt clods
    dot(g, [[16 - mrx + 3, mtop + 2], [16 - mrx + 6, mtop + 3], [16 + mrx - 4, mtop + 2], [16 + 2, mtop + 4], [16 - 3, mtop + 4]], C.acc[0]);
    if (stage === 2) {
      for (const x of [cx - 5, cx - 1.6, cx + 2.4, cx + 5.8]) { const xx = R(x); if (g.filled(xx, ply)) { g.set(xx, ply, WHITE); if (g.filled(xx + 1, ply + 1)) g.set(xx + 1, ply + 1, PLATE[2]); } }
      dot(g, [[ax - 1, ptop - 5.4]], WHITE);
      if (f) for (const [x, y] of [[ax - 4, R(ptop - 6)], [ax + 5, R(ptop - 6)], [ax + 0, R(ptop - 9)], [ax - 5, R(ptop - 3)], [ax + 6, R(ptop - 3)]]) if (!g.get(x, y)) g.set(x, y, '#ffb0a0');
    } else {
      dot(g, [[ax, R(aTop - 1)]], WHITE);
      if (f) for (const [x, y] of [[ax - 2, R(aTop - 2.5)], [ax + 3, R(aTop - 2.5)], [ax + 3, R(aTop + 1)], [ax - 2, R(aTop + 1)]]) if (!g.get(x, y)) g.set(x, y, '#ffb0a0');
    }
    const ex = R(cx), ey = R(cy - T(stage, 2.6, 3, 4.2));
    face(g, ex, ey, P, { gap: 4, mouth: [ex, ey + 4, 6], cheeks: [ex - 1, ex + 6, ey + 3] });
    return { hx: R(cx), hy: R(cy), hr: R(ry), top: topOf(g), ey, hat: { x: R(cx), y: R(ptop + 1.6), w: 9 } };
  };

  // ---------------- Puff-shroom -> Fume-shroom -> Gloom-shroom ----------------
  // A purple spotted cap (C.main) on a pale stalk that has the face and a little cone snout; stage 1 a wide trumpet funnel;
  // stage 2 a bulbous dark-purple Gloom-shroom ringed with spouts.
  PAL.puffshroom = { main: ['#e2b4fa', '#9a5ad8', '#5a2e8a'], acc: CREAM, leaf: LEAF, stem: '#3f8a3a', root: '#7a5a2a', part: 'cap' };
  function spots(g, list, col) { for (const [x, y, w] of list) for (let i = 0; i < (w || 2); i++) { if (g.filled(R(x) + i, R(y))) g.set(R(x) + i, R(y), col); } }
  ART.puffshroom = function (g, stage, P, C) {
    const b = bob(P), M = C.main, SP = mixHex(M[0], WHITE, 0.6);
    PX.art.shroomFoot(g, 15.5, P, C.acc, T(stage, 4.2, 4.8, 5.2));
    let geo;
    if (stage === 0) {
      const sx = 14.6, sy = 24.4 + b, cy = sy - 5.8;
      sideArms(g, sx - 3.4, sx + 3.4, sy + 1.5, P, C.leaf, 4);
      piece(g, t => t.ell(sx, sy, 4.2, 4.6, C.acc));
      piece(g, t => { t.dither = false; t.poly([[17.4, sy + 0.2], [20.6, sy - 0.4], [22.4, sy - 1.2], [22.4, sy + 3], [20.6, sy + 2.2], [17.4, sy + 1.8]], M[1]); shadeIn(t, 20, sy + 0.6, 3.4, 2.6, M); });
      piece(g, t => t.ell(22.4, sy + 0.9, 1, 2.3, M));
      let capTop = 0;
      piece(g, t => { t.ell(sx - 0.2, cy + 0.8, 7, 5.8, M, 0, (x, y) => y <= cy + 1.6); capTop = scanTop(t, sx); });
      g.outline();
      spots(g, [[sx - 4, cy - 1], [sx, cy - 3], [sx + 3, cy - 0.5, 1], [sx - 2, cy + 1, 1]], SP);
      g.set(22, R(sy + 0.4), '#3a1a52'); g.set(22, R(sy + 1.4), '#3a1a52');
      const ex = 12, ey = R(sy - 3.2);
      face(g, ex, ey, P, { gap: 3, cheeks: [ex - 1, ex + 4, ey + 3] });
      geo = { hx: R(sx), hy: R(cy), hr: 6, ey, hat: { x: R(sx), y: capTop + 1, w: 9 } };
    } else if (stage === 1) {
      const sx = 14.5, sy = 23 + b, cy = sy - 7.2;
      sideArms(g, sx - 4, sx + 3, sy + 2, P, C.leaf, 4.6);
      piece(g, t => t.ell(sx, sy, 4.8, 5.6, C.acc));
      const fy = sy + 1.8; // the funnel (its mouth) sits just under the eyes
      piece(g, t => { t.poly([[18.2, fy - 1.4], [22, fy - 1.4], [26, fy - 4.2], [26, fy + 4.6], [22, fy + 2.2], [18.2, fy + 2.2]], M[1]); shadeIn(t, 21.5, fy + 0.3, 5.5, 5, M); });
      piece(g, t => t.ell(26, fy + 0.2, 1.3, 4.4, M));
      let capTop = 0;
      piece(g, t => { t.ell(sx - 0.3, cy + 0.8, 8.4, 6.8, M, 0, (x, y) => y <= cy + 1.6); capTop = scanTop(t, sx); });
      g.outline();
      for (let y = R(fy - 3); y <= R(fy + 3); y++) if (g.filled(26, y)) g.set(26, y, '#3a1a52');
      spots(g, [[sx - 6, cy - 0.5], [sx - 2, cy - 3.5, 3], [sx + 3, cy - 2], [sx + 5, cy + 0.5, 1], [sx - 4, cy + 1.5, 1]], SP);
      const ex = 11, ey = R(sy - 2); // (low enough that the cross brows sit clear of the cap's rim)
      PX.art.madFace(g, ex, ey, P, { gap: 3 }); // a cross Fume-shroom (its funnel is its mouth)
      geo = { hx: R(sx), hy: R(cy), hr: 7, ey, hat: { x: R(sx), y: capTop + 1, w: 10 } };
    } else {
      // Gloom-shroom: a bulbous dark cap ringed with trumpet spouts, on a stout pale stalk with the face
      const cx = 15.6, cy = 15.4 + b, rx = 9.2, ry = 7.4, DK = tint(M, INK, 0.3), sy = 23.6 + b;
      const SPOUT = [[-2.75, 2.6], [-2.05, 3], [-1.3, 3], [-0.6, 3], [0.05, 2.8]];
      const at = (a, k) => [cx + Math.cos(a) * (rx + k), cy + Math.sin(a) * (ry + k)];
      for (const [a, len] of SPOUT) piece(g, t => {
        const p0 = at(a, -2), p1 = at(a, len);
        stroke(t, [p0, p1], 1.1, 1.3, DK[1]);
        t.ell(p1[0], p1[1], 2.1, 1.2, DK, a + Math.PI / 2);
      });
      sideArms(g, cx - 4.4, cx + 4.4, sy + 1.6, P, C.leaf, 4.6);
      piece(g, t => t.ell(cx + 0.4, sy, 5.8, 5.4, C.acc));
      let capTop = 0;
      piece(g, t => { t.ell(cx, cy, rx, ry, DK, 0, (x, y) => y <= cy + 3.2); capTop = scanTop(t, cx); });
      g.outline();
      for (const [a, len] of SPOUT) { const [x, y] = at(a, len + 0.2); dot(g, [[x - 0.5, y - 0.5]], '#24102e'); }
      spots(g, [[cx - 6, cy - 1], [cx - 2, cy - 4.6, 3], [cx + 3, cy - 3], [cx + 6, cy + 0.4, 1], [cx - 4, cy + 2, 1], [cx + 1, cy + 1]], mixHex(DK[0], WHITE, 0.4));
      const ex = R(cx - 1), ey = R(cy + 5.6);
      face(g, ex, ey, P, { gap: 4, mouth: [ex, ey + 4, 6], cheeks: [ex - 1, ex + 6, ey + 3] });
      geo = { hx: R(cx), hy: R(cy), hr: R(ry), ey, hat: { x: R(cx), y: capTop + 1, w: 10 } };
    }
    geo.top = topOf(g);
    return geo;
  };

  // ---------------- Sun-shroom -> Big Sun-shroom -> Mega Sun-shroom ----------------
  // A sunny cap (C.main) with a little glow on a pale stalk with the face; stage 0 tiny; stage 2 sun-ray points round the cap.
  PAL.sunshroom = { main: ['#fff49a', '#fbbf3a', '#d0701e'], acc: CREAM, leaf: LEAF, stem: '#3f8a3a', root: '#7a5a2a', part: 'cap' };
  ART.sunshroom = function (g, stage, P, C) {
    const b = bob(P), f = P.frame ? 1 : 0, M = C.main;
    const sx = 15.5, srx = T(stage, 3.8, 4.4, 5), sry = T(stage, 4.4, 5, 5.6), sy = T(stage, 24.4, 23.8, 23.2) + b;
    const crx = T(stage, 5.8, 7.6, 8.8), cry = T(stage, 4.6, 6.2, 7), ccy = T(stage, 19.4, 17.6, 15.6) + b, cbot = ccy + 1;
    PX.art.shroomFoot(g, sx, P, C.acc, T(stage, 3.8, 4.4, 4.8));
    sideArms(g, sx - srx + 1, sx + srx - 1, sy + 1.5, P, C.leaf, T(stage, 3.6, 4.2, 4.8));
    if (stage === 2) for (let i = 0; i < 5; i++) piece(g, t => { // sun rays round the cap edge
      const a = -Math.PI + 0.32 + i * (Math.PI - 0.64) / 4, r0 = Math.hypot(Math.cos(a) * crx, Math.sin(a) * cry) - 1.4, r1 = r0 + 4.8;
      t.poly([[sx + Math.cos(a - 0.3) * r0, ccy + Math.sin(a - 0.3) * r0], [sx + Math.cos(a + 0.3) * r0, ccy + Math.sin(a + 0.3) * r0], [sx + Math.cos(a) * r1, ccy + Math.sin(a) * r1]], M[1]);
      shadeIn(t, sx, ccy, crx + 4, cry + 4, [M[0], lighten(M[1], 0.3), M[1]]);
    });
    piece(g, t => t.ell(sx, sy, srx, sry, C.acc));
    let capTop = 0;
    const CAP = new Grid(32, 32);
    piece(g, t => { t.ell(sx, ccy, crx, cry, M, 0, (x, y) => y <= cbot); capTop = scanTop(t, sx); CAP.merge(t); });
    g.outline();
    const top = topOf(g);
    spots(g, T(stage, [[sx - 3, ccy - 2], [sx + 1, ccy - 3.6, 1]], [[sx - 4, ccy - 2.5], [sx + 1, ccy - 4.4, 3], [sx + 4, ccy - 1, 1]], [[sx - 5, ccy - 2], [sx - 1, ccy - 5, 3], [sx + 4, ccy - 3], [sx + 6, ccy, 1]]), lighten(M[0], 0.6));
    // glow: tiny sparkles round the cap (twinkle with frame)
    const gl = f ? [[sx - crx - 2, ccy - cry + 1], [sx + crx + 1, ccy - 1]] : [[sx + crx, ccy - cry], [sx - crx - 1, ccy + 0.5]];
    for (const [x, y] of gl) sparkle(g, x, y, stage === 2, '#fff6a0', '#f8c43a');
    // the cap glows: a halo just outside its outline, see-through and speckled with bright dots that swap places on
    // frame 1 (so it shimmers); it shows on light and dark backgrounds alike
    const GL = mixHex(M[1], M[0], 0.45), h1 = rgbaOf(GL, 0.6), hi = lighten(M[0], 0.35), cb = R(cbot) + 1;
    for (let y = 0; y <= cb; y++) for (let x = 0; x < 32; x++) {
      if (g.get(x, y) !== null) continue;
      let d = 9;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (CAP.filled(x + dx, y + dy) && y + dy <= cbot) d = Math.min(d, Math.hypot(dx, dy));
      if (d <= 2.3) g.set(x, y, (x + y + f) % 3 === 0 ? hi : h1);
    }
    const ex = R(sx - T(stage, 1.5, 2, 2)), ey = R(cbot + 1.4);
    face(g, ex, ey, P, { gap: 3, mouth: [ex, ey + T(stage, 3, 4, 4), 5], cheeks: stage ? [ex - 1, ex + 4, ey + 3] : null });
    return { hx: R(sx), hy: R(ccy), hr: R(cry), top, ey, hat: { x: R(sx), y: capTop + 1, w: T(stage, 8, 9, 10) } };
  };

  // ---------------- Cabbage-pult -> Melon-pult -> Winter Melon ----------------
  // A round leafy cabbage body (C.main) with a wooden lever arm from behind holding a cup up over the head; stage 1 a striped
  // melon body lobbing a watermelon; stage 2 a frosty blue-green melon with a frosty melon in the cup.
  PAL.cabbagepult = { main: ['#dcf6a8', '#8ccc5a', '#438a44'], leaf: LEAF, acc: WOOD, stem: '#3f8a3a', root: '#7a5a2a', part: 'basket' };
  // the catapult arm: a leafy stalk from behind the body ending in a leaf scoop (its tip curls up at the back) holding the ammo
  function pultArm(g, pts, cupX, cupY, cupW, ammo, C) {
    const LF = C.leaf;
    piece(g, t => { stroke(t, pts, 0.95, 0.8, LF[1]); shadeIn(t, cupX + 2, cupY + 3, 4, 7, LF); });
    if (ammo) piece(g, ammo);
    piece(g, t => {
      t.ell(cupX, cupY, cupW, 2.1, LF, 0, (x, y) => y >= cupY - 0.6);
      t.poly([[cupX - cupW + 0.2, cupY + 0.6], [cupX - cupW + 1.8, cupY + 0.6], [cupX - cupW - 1.3, cupY - 2.4]], LF[0]);
      t.poly([[cupX + cupW - 1.2, cupY], [cupX + cupW + 0.2, cupY - 0.2], [cupX + cupW + 0.6, cupY - 1.6]], LF[1]);
    });
    for (let x = R(cupX - cupW + 2); x <= R(cupX + cupW - 2); x++) if (g.filled(x, R(cupY + 1))) g.set(x, R(cupY + 1), LF[2]); // the leaf's mid-rib
  }
  // melon stripes that follow the curve of an ellipse body
  function stripes(g, cx, cy, rx, ry, M, skip, k) {
    for (let y = R(cy - ry); y <= R(cy + ry); y++) for (let x = R(cx - rx); x <= R(cx + rx); x++) {
      if (!g.filled(x, y) || (skip && skip(x, y))) continue;
      const v = (y + 0.5 - cy) / ry; if (Math.abs(v) >= 1) continue;
      const s = (x + 0.5 - cx) / (rx * Math.sqrt(1 - v * v));
      if (Math.abs(s) > 1) continue;
      for (const c of (k || [-0.68, -0.22, 0.24, 0.7])) if (Math.abs(s - c) < 0.1) deeper(g, x, y, M);
    }
  }
  ART.cabbagepult = function (g, stage, P, C) {
    const b = bob(P), M = stage === 2 ? tint(C.main, '#a8f0ff', 0.4) : C.main;
    const cx = 17, rx = T(stage, 6.2, 7, 7.6), ry = T(stage, 5.6, 6.3, 7), cy = T(stage, 22.6, 21.8, 21.2) + b;
    const cupX = T(stage, 10, 9.4, 9), cupY = T(stage, 14.4, 11.8, 9.8) + b;
    const AM = stage === 0 ? tint(M, WHITE, 0.3) : stage === 1 ? tint(M, INK, 0.18) : tint(M, '#e8fcff', 0.25);
    const ar = T(stage, 2.3, 3, 3.6), ary = T(stage, 2.3, 2.5, 3);
    pultArm(g, [[cx - 3, cy + 2], [cx - 7.6, cy - 3], [cupX - 0.4, cupY + 1.4]], cupX, cupY, T(stage, 3, 3.6, 4.2), t => t.ell(cupX, cupY - ary + 0.6, ar, ary, AM), C);
    baseLeaves(g, cx - 1, 27.2, P, C.leaf, T(stage, 5.5, 6, 6.5));
    if (stage !== 1) feet(g, 16, P, C.root, T(stage, 3.2, 3.4, 3.6)); // (Melon-pult has no legs: it sits on its leaves)
    // outer leaves (cabbage layers) curling up behind the round body
    const OL = stage === 0 ? C.leaf : tint(C.leaf, INK, 0.1);
    piece(g, t => { t.dither = false; t.ell(cx - rx + 1.2, cy + 0.6, 2.6, ry * 0.86, OL, 0.42); });
    piece(g, t => { t.dither = false; t.ell(cx + rx - 1.2, cy + 0.6, 2.6, ry * 0.86, OL, -0.42); });
    let bodyTop = 0;
    piece(g, t => { t.dither = false; t.ell(cx, cy, rx - 0.6, ry, M); bodyTop = scanTop(t, cx + 1); });
    g.outline();
    const ex = R(cx - 2), ey = R(cy - 2.4);
    const inFace = (x, y) => x >= ex - 1 && x <= ex + 6 && y >= ey - 1 && y <= ey + 6;
    if (stage === 0) { // leaf veins
      for (let y = R(cy - ry + 2); y <= R(cy + ry - 1); y++) { const k = (y - (cy - ry)) / (2 * ry); for (const x of [R(cx - (rx - 1.6) * Math.sin(k * Math.PI) * 0.92), R(cx + (rx - 1.6) * Math.sin(k * Math.PI) * 0.92)]) if (!inFace(x, y) && g.filled(x, y)) g.set(x, y, lighten(M[0], 0.35)); }
      dot(g, [[cupX - 1, cupY - ary + 0.4], [cupX, cupY - ary + 1.2], [cupX + 1, cupY - ary + 0.4], [cupX, cupY - ary - 0.6]], AM[2]); // the little cabbage's leaf folds
    } else {
      stripes(g, cx, cy, rx - 0.6, ry, M, inFace);
      stripes(g, cupX, cupY - ary + 0.6, ar, ary, AM, (x, y) => y >= cupY - 0.5, [-0.5, 0, 0.5]);
    }
    if (stage === 2) { // frost on the tops
      for (let x = R(cx - rx); x <= R(cx + rx); x++) { if ((x + 1) % 3 === 0) continue; const y = scanTop({ h: 32, get: (a, bb) => (g.filled(a, bb) ? 1 : null) }, x); if (y < cy - 1) g.set(x, y, '#f4fcff'); }
      for (let x = R(cupX - ar); x <= R(cupX + ar); x++) { if (x % 3 === 0) continue; const y = scanTop({ h: 32, get: (a, bb) => (g.filled(a, bb) ? 1 : null) }, x); if (y < cupY - 1) g.set(x, y, '#f4fcff'); }
      dot(g, [[cx - 4, cy - 1], [cx + 5, cy + 2], [cx - 2, cy + 4]], '#f4fcff');
    }
    dot(g, [[cx - rx * 0.5, cy - ry * 0.6]], lighten(M[0], 0.5));
    if (stage === 1) PX.art.madFace(g, ex, ey + 1, P, { gap: 4 }); // Melon-pult: a scowl, no mouth
    else face(g, ex, ey, P, { gap: 4, mouth: [ex, ey + 4, 6], cheeks: [ex - 1, ex + 6, ey + 3] });
    return { hx: cx, hy: R(cy), hr: R(rx), top: topOf(g), ey, hat: { x: cx + 1, y: bodyTop + 1, w: 8 } };
  };

  // ---------------- Kernel-pult -> Butter-pult -> Cob Cannon ----------------
  // A corn cob (C.main) in green husk leaves with a face and a lever arm lobbing a kernel; stage 1 a butter pat; stage 2 a big cob
  // lying sideways like a cannon pointing right, on husk legs.
  PAL.kernelpult = { main: ['#fff8a8', '#f8d23a', '#c88e1c'], leaf: ['#c8f08a', '#78bc4a', '#3c7a34'], acc: WOOD, stem: '#3f8a3a', root: '#7a5a2a', part: 'basket' };
  const BUTTER = ['#fffbe0', '#fbe890', '#d0b050'];
  // kernel texture: a grid of darker gaps between kernels
  function kernels(g, x0, y0, x1, y1, M, skip) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g.filled(x, y) && !(skip && skip(x, y)) && (y % 2 === 1) && ((x + (y >> 1)) % 2 === 0)) { const c = g.get(x, y); if (c === M[0] || c === M[1] || c === M[2]) deeper(g, x, y, M); }
  }
  ART.kernelpult = function (g, stage, P, C) {
    const b = bob(P), M = C.main;
    if (stage < 2) {
      const cx = 16.5, rx = T(stage, 5.2, 5.8, 0), ry = T(stage, 7.6, 9, 0), cy = T(stage, 20, 18.4, 0) + b;
      const cupX = T(stage, 9.2, 8.4, 0), cupY = T(stage, 13.6, 10.8, 0) + b;
      pultArm(g, [[cx - 3, cy + 3], [cx - 8.2, cy - 2], [cupX - 0.2, cupY + 1.4]], cupX, cupY, T(stage, 2.8, 3.4, 0), stage === 0
        ? t => t.ell(cupX, cupY - 1.2, 1.8, 1.7, M)
        : t => blob(t, cupX, cupY - 1.6, 2.8, 1.9, BUTTER, 5), C);
      feet(g, 16, P, C.root, 3.2);
      baseLeaves(g, 16, 27.4, P, C.leaf, T(stage, 5, 5.6, 0));
      let bodyTop = 0;
      piece(g, t => { t.ell(cx, cy, rx, ry, M); bodyTop = scanTop(t, cx); });
      // husk leaves hugging the bottom of the cob
      piece(g, t => { leaf(t, cx - 1.4, 28.6, T(stage, 7.4, 8.4, 0), -2.05, C.leaf, 0.3); });
      piece(g, t => { leaf(t, cx + 1.4, 28.6, T(stage, 7.4, 8.4, 0), -1.1, C.leaf, 0.3); });
      g.outline();
      const ex = R(cx - 1.5), ey = R(cy - T(stage, 3.2, 3.8));
      kernels(g, R(cx - rx), R(cy - ry), R(cx + rx), R(cy + ry), M, (x, y) => x >= ex - 1 && x <= ex + 5 && y >= ey - 1 && y <= ey + 5);
      dot(g, [[cx - rx * 0.5, cy - ry * 0.65]], lighten(M[0], 0.5));
      if (stage === 1) dot(g, [[cupX - 2, cupY - 2.6], [cupX - 1, cupY - 2.6]], WHITE);
      face(g, ex, ey, P, { gap: 3, mouth: [ex, ey + 4, 5], cheeks: [ex - 1, ex + 4, ey + 3] });
      return { hx: R(cx), hy: R(cy - 2), hr: R(rx), top: topOf(g), ey, hat: { x: R(cx), y: bodyTop + 1, w: 7 } };
    }
    // Cob Cannon: a big cob lying sideways like a cannon (muzzle to the right), its husk peeled back at the breech, resting on a
    // bed of husk leaves (no legs)
    const ang = -0.3, ccx = 17.4, ccy = 20.4 + b, crx = 11.2, cry = 5.7, dy = 6.4;
    piece(g, t => { for (const [x, len, a] of [[15, 8, Math.PI - 0.12], [18, 8.6, 0.1], [16.4, 6, Math.PI + 0.3], [17.4, 6.4, -0.28]]) leaf(t, x, 28.2, len, a, C.leaf, 0.3); });
    let bodyTop = 0;
    piece(g, t => { t.ell(ccx, ccy, crx, cry, M, ang); bodyTop = scanTop(t, 15); });
    // husk leaves peeled back from the breech end
    for (const [x, y, len, a] of [[9.4, 17.4 + dy, 6.6, 2.65], [9.6, 14.6 + dy, 7.6, -2.6], [10.6, 13.6 + dy, 9.2, -1.92]]) piece(g, t => leaf(t, x, y, len, a, C.leaf, 0.28));
    g.outline();
    const mx = ccx + Math.cos(ang) * (crx - 1.1), my = ccy + Math.sin(ang) * (crx - 1.1);
    for (let y = R(my) - 2; y <= R(my) + 2; y++) for (let x = R(mx) - 1; x <= R(mx) + 1; x++) if (g.filled(x, y) && Math.hypot((x + 0.5 - mx) * 1.8, (y + 0.5 - my) / 1.4) < 2) g.set(x, y, '#5a3a10');
    const ex = 15, ey = R(ccy - 2.6);
    kernels(g, 6, 7, 28, 28, M, (x, y) => (x >= ex - 1 && x <= ex + 5 && y >= ey - 1 && y <= ey + 5) || Math.hypot(x - mx, y - my) < 2.5);
    dot(g, [[ccx - 2, ccy - 4.4], [ccx - 1, ccy - 4.6], [ccx + 3, ccy - 5.4]], lighten(M[0], 0.5));
    PX.art.madFace(g, ex, ey, P, { gap: 3 }); // Cob Cannon: cross eyes, no mouth
    return { hx: ex + 2, hy: R(ccy), hr: 5, top: topOf(g), ey, front: R(mx) + 1, hat: { x: 15, y: bodyTop + 1, w: 8 } };
  };

  // ---------------- Squash -> Super Squash -> Mega Squash ----------------
  // A green gourd (C.main), wider at the bottom, with a stubby stem and a grumpy brave face; stage 1 ridges; stage 2 a red headband.
  PAL.squash = { main: ['#b4e48e', '#64aa4c', '#2c6a3c'], leaf: LEAF, acc: ['#ff8a8a', '#e0303e', '#901c30'], stem: '#3f8a3a', root: '#7a5a2a', part: 'brows' };
  ART.squash = function (g, stage, P, C) {
    const b = bob(P), cx = 16, M = C.main;
    const brx = T(stage, 7, 8.2, 9.6), bry = T(stage, 5.2, 6, 7), bcy = T(stage, 23.4, 22.6, 21.6) + b;
    const trx = T(stage, 4.4, 5.2, 6.1), tr = T(stage, 5, 6.2, 7.2), tcy = T(stage, 17.6, 15, 13) + b;
    baseLeaves(g, 16, 27.4, P, C.leaf, T(stage, 5, 6, 6.5));
    feet(g, 16, P, C.root, T(stage, 3.2, 3.6, 4));
    const st = tcy - tr;
    piece(g, t => stroke(t, [[cx - 0.5, st + 1.2], [cx - 1, st - 0.8], [cx + 0.4, st - 2]], 1.05, 0.75, darken(C.stem, 0.15)));
    let bodyTop = 0;
    const B = new Grid(32, 32);
    piece(g, t => {
      t.ell(cx, bcy, brx, bry, M[1]); t.ell(cx, tcy, trx, tr, M[1]);
      shadeIn(t, cx - 0.5, (st + bcy + bry) / 2, brx * 1.05, (bcy + bry - st) / 2 + 0.5, M);
      bodyTop = scanTop(t, cx); B.merge(t);
    });
    const ey = R(bcy - bry + T(stage, 0.6, 0.6, 0.2)), ex = cx - 1;
    if (stage === 2) piece(g, t => { // red headband + tails
      const hb = ey - 4;
      for (let y = hb; y <= hb + 1; y++) for (let x = 0; x < 32; x++) if (B.get(x, y) || B.get(x - 1, y) || B.get(x + 1, y)) t.set(x, y, y === hb ? C.acc[0] : C.acc[1]);
      let xl = 31; for (let x = 0; x < 32; x++) if (B.get(x, hb)) { xl = x; break; }
      stroke(t, [[xl - 1, hb + 1], [xl - 3.5, hb + 2.6], [xl - 5.2, hb + 2.2]], 0.8, 0.6, C.acc[1]);
      stroke(t, [[xl - 1, hb + 1.4], [xl - 2.8, hb + 4.4], [xl - 4.4, hb + 5]], 0.8, 0.6, C.acc[2]);
    });
    g.outline();
    const inFace = (x, y) => x >= ex - 2 && x <= ex + 7 && y >= ey - 3 && y <= ey + 6;
    if (stage >= 1) { // ridges that follow the gourd
      for (let y = R(st) + 1; y <= R(bcy + bry) - 1; y++) {
        let x0 = -1, x1 = -1; for (let x = 0; x < 32; x++) if (B.get(x, y)) { if (x0 < 0) x0 = x; x1 = x; }
        if (x0 < 0) continue;
        const mid = (x0 + x1) / 2, hw = (x1 - x0) / 2;
        for (const k of [-0.6, -0.15, 0.32, 0.72]) { const x = R(mid + k * hw); if (!inFace(x, y) && g.get(x, y) !== C.acc[0] && g.get(x, y) !== C.acc[1]) deeper(g, x, y, M); }
      }
    }
    dot(g, [[cx - trx * 0.5, tcy - tr * 0.5], [cx - trx * 0.5, tcy - tr * 0.5 + 1]], lighten(M[0], 0.45));
    PX.art.madFace(g, ex, ey, P, { gap: 4, mouth: [ex, ey + 4, 6] }); // a grumpy squash
    return { hx: cx, hy: ey + 2, hr: R(brx * 0.8), top: topOf(g), ey, hat: { x: cx, y: bodyTop + 2, w: T(stage, 7, 8, 10) } };
  };

  // ---------------- Jalapeno -> Ghost Pepper -> Dragon Pepper ----------------
  // An upright red chili (C.main) with a curled pointy tip on root feet, a green calyx cap and angry eyes; stage 1 ghostly wisps
  // trailing off and paler highlights; stage 2 little dragon horns and tiny wings.
  PAL.jalapeno = { main: ['#ff9c84', '#e0322a', '#8e1a24'], leaf: LEAF, stem: '#3f8a3a', root: '#7a3a2a', part: 'flame' };
  ART.jalapeno = function (g, stage, P, C) {
    const b = bob(P), M = C.main;
    const r0 = T(stage, 4.1, 4.8, 5.3), top = T(stage, 14.6, 11.4, 9.4) + b, cx = 16.4, h = 28 - top;
    const path = [[cx, top + r0 * 0.7], [cx + 0.7, top + h * 0.36], [cx + 0.4, top + h * 0.64], [cx - 1.4, top + h * 0.88], [cx - 3.6, 28 + b * 0.5]];
    feet(g, 16, P, C.root, 3.2);
    sideArms(g, cx - r0 + 1.5, cx + r0 - 1, top + h * 0.5, P, C.leaf, 4.6);
    const WG = tint(M, INK, 0.22), HN = ['#fffbe0', '#f0dca0', '#b49a5c'];
    if (stage === 2) { // tiny bat wings on the back (the far one peeks out on the right)
      piece(g, t => { t.poly([[cx + 1.6, top + 5], [cx + 6.4, top + 0.8], [cx + 6.6, top + 4], [cx + 8, top + 5.2], [cx + 3, top + 9.4]], WG[2]); });
      piece(g, t => {
        t.poly([[cx - 2, top + 5], [cx - 9.4, top - 1.6], [cx - 11.4, top + 6.6], [cx - 8.4, top + 4.8], [cx - 7.8, top + 10.2], [cx - 5.4, top + 7.2], [cx - 2.6, top + 10.4]], WG[1]);
        stroke(t, [[cx - 2.4, top + 5], [cx - 9.4, top - 1.6]], 0.7, 0.5, WG[0]);
      });
    }
    piece(g, t => { stroke(t, path, r0, 0.6, M[1]); shadeIn(t, cx - 0.6, top + h / 2 - 1, r0 + 2, h / 2 + 2, M); });
    if (stage === 2) for (const s of [-1, 1]) piece(g, t => { // little dragon horns
      const x = cx + s * r0 * 0.6;
      t.poly([[x - 1.8, top + 0.8], [x + 1.8, top + 0.8], [x + s * 2.4, top - 4.4]], HN[1]); t.poly([[x, top + 0.8], [x + 1.8, top + 0.8], [x + s * 2.4, top - 4.4]], s > 0 ? HN[2] : HN[0]);
    });
    piece(g, t => { // calyx cap + stalk
      t.ell(cx, top + 0.4, r0 * 0.62, 1.3, C.leaf);
      for (const dx of [-r0 * 0.5, r0 * 0.45]) t.poly([[cx + dx - 1, top + 0.9], [cx + dx + 1, top + 0.9], [cx + dx * 1.2, top + 2.4]], C.leaf[1]);
      stroke(t, [[cx, top + 0.2], [cx + 0.2, top - 1.8], [cx + 1.8, top - 3]], 0.8, 0.6, C.stem);
    });
    g.outline();
    if (stage === 1) { // ghostly wisps behind
      const w = new Grid(32, 32), GH = '#ece6ff';
      stroke(w, [[cx - 3, 22.4], [cx - 6, 21.4], [cx - 8.6, 23.2], [cx - 11.2, 21.8]], 1.5, 0.5, GH);
      stroke(w, [[cx - 4.6, 26.4], [cx - 7.6, 27.4], [cx - 10, 26.2], [cx - 12.4, 27.2]], 1.3, 0.4, GH);
      stroke(w, [[cx + 3.6, 20], [cx + 6, 21.6], [cx + 8, 20.4]], 1.1, 0.4, GH);
      w.outline('#9a8cc8');
      for (const [x, y] of [[R(cx - 7), 22], [R(cx - 9), 27]]) if (w.get(x, y)) w.set(x, y, '#c4b8ec');
      under(g, w);
    }
    if (stage === 2) { // wing ribs
      const rb = new Grid(32, 32);
      for (const [x0, y0, x1, y1] of [[cx - 4.6, top + 3.4, cx - 10, top + 5.4], [cx - 4.6, top + 4.4, cx - 7.6, top + 8.6]]) PX.line(rb, R(x0), R(y0), R(x1), R(y1), 1);
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (rb.get(x, y) && g.get(x, y) === WG[1]) g.set(x, y, WG[2]);
    }
    const ex = R(cx - 1.4), ey = R(top + T(stage, 4, 4.4, 5));
    const hl = lighten(M[0], stage === 1 ? 0.7 : 0.45), hx0 = cx + 1.2 - r0 * 0.8;
    dot(g, [[hx0, ey + 5], [hx0, ey + 6], [hx0 + 0.3, ey + 7]], hl);
    if (stage === 1) dot(g, [[hx0 + 0.6, ey + 8], [hx0 + 1, ey + 10], [hx0 + 1.4, ey + 11], [hx0 - 0.6, top + 2]], hl);
    PX.art.madFace(g, ex, ey, P, { gap: 3, mouth: [ex, ey + 4, 5] }); // a fiery, cross pepper
    return { hx: R(cx), hy: ey + 1, hr: R(r0), top: topOf(g), ey, hat: { x: R(cx), y: R(top + 1), w: 7 } };
  };

  // ---------------- Cactus -> Prickly Cactus -> Spike Cactus ----------------
  // A green column cactus (C.main) with white spines, a pink flower on top and one arm raised (arms follow the leaf pose);
  // stage 1 taller with two arms; stage 2 more arms and a big flower crown.
  PAL.cactus = { main: ['#c8f294', '#6cbe4c', '#2e7a40'], leaf: LEAF, acc: PINK, stem: '#3f8a3a', root: '#7a5a2a', part: 'spikes' };
  function flower(t, x, y, pr, n, A, ctr) {
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / n; t.ell(x + Math.cos(a) * pr * 1.1, y + Math.sin(a) * pr * 1.1, pr, pr * 0.8, A, a); }
    t.ell(x, y, pr * 0.75, pr * 0.75, ctr || GOLD);
  }
  ART.cactus = function (g, stage, P, C) {
    const b = bob(P), cx = 16, M = C.main;
    const rx = T(stage, 4.6, 5, 5.5), ry = T(stage, 8.2, 10.2, 11.2), cy = T(stage, 20.4, 18.4, 17.6) + b;
    const a = P.arms, up = a === 'down' ? 1 : a === 'out' ? 0 : -1;
    feet(g, cx, P, C.root, 3);
    // arms: [side (-1 left, +1 right), y offset from centre, reach, rise]
    const arms = T(stage, [[-1, 1.4, 3.8, 4.6]], [[-1, 0.6, 4, 5], [1, 3.2, 3.6, 4]], [[-1, -0.6, 4.2, 5.4], [1, 2.4, 3.8, 4.6], [-1, 5.4, 3, 3]]);
    piece(g, t => {
      for (const [s, oy, reach, rise] of arms) {
        const x0 = cx + s * (rx - 1.5), y0 = cy + oy, x1 = cx + s * (rx + reach - 1.5), r = T(stage, 1.5, 1.6, 1.7);
        const pts = up === 0 ? [[x0, y0], [x1 + s * 1.5, y0 - 0.4]] : [[x0, y0], [x1, y0], [x1 + s * 0.2, y0 + up * rise]];
        stroke(t, pts, r, r * 0.9, M[1]);
        shadeIn(t, x1, y0 + up * rise / 2, reach + 1.5, rise / 2 + 2.5, M);
      }
    });
    let bodyTop = 0;
    piece(g, t => { blob(t, cx, cy, rx, ry, M, 2.4); bodyTop = scanTop(t, cx); });
    const ft = cy - ry;
    piece(g, t => {
      if (stage < 2) flower(t, cx - 0.5, ft + 0.2, T(stage, 1.3, 1.6, 0), 5, C.acc);
      else { flower(t, cx - 4, ft + 1.4, 1.3, 5, C.acc); flower(t, cx + 3.6, ft + 1.4, 1.3, 5, C.acc); flower(t, cx - 0.2, ft - 0.2, 1.85, 6, C.acc); }
    });
    g.outline();
    const top = topOf(g);
    const ex = R(cx - 1.5), ey = R(cy - ry + T(stage, 4.4, 5, 5.6));
    const inFace = (x, y) => x >= ex - 1 && x <= ex + 4 && y >= ey - 2 && y <= ey + 5;
    // ridges + spines
    for (let y = R(ft) + 3; y <= R(cy + ry) - 1; y++) for (const k of [-0.55, 0.55]) {
      const x = R(cx + k * rx - 0.5); if (inFace(x, y)) continue;
      deeper(g, x, y, M);
      if ((y + (k > 0 ? 1 : 0)) % 3 === 0 && g.filled(x, y)) g.set(x, y, '#fffbe8');
    }
    for (let y = R(ft) + 3; y <= R(cy + ry) - 2; y += 3) { // spines poking through the outline
      let x0 = -1, x1 = -1; for (let x = 0; x < 32; x++) if (g.filled(x, y) && Math.abs(x - cx) <= rx + 0.5) { if (x0 < 0) x0 = x; x1 = x; }
      if (x0 > 0 && g.get(x0 - 1, y) === INK && !g.get(x0 - 2, y)) g.set(x0 - 2, y, '#e8e8d8');
      if (x1 > 0 && g.get(x1 + 1, y + 1) === INK && !g.get(x1 + 2, y + 1)) g.set(x1 + 2, y + 1, '#e8e8d8');
    }
    PX.art.madFace(g, ex, ey, P, { gap: 3, mouth: [ex, ey + 4, 5] }); // a grumpy cactus
    return { hx: cx, hy: ey + 1, hr: R(rx), top, ey, hat: { x: cx, y: bodyTop + 1, w: 8 } };
  };

  // ---------------- Spikeweed -> Spikerock -> Spike Titan ----------------
  // A low mound (C.main) hugging the ground with sharp grey spikes and eyes peeking out; stage 1 dark rock spikes;
  // stage 2 bigger spikes with shining metal tips. Flat on the ground (no feet).
  PAL.spikeweed = { main: ['#c4cc74', '#80903e', '#4a5a28'], leaf: LEAF, acc: ['#eef2f8', '#aab4c4', '#646e84'], stem: '#3f8a3a', root: '#7a5a2a', part: 'spikes' };
  ART.spikeweed = function (g, stage, P, C) {
    const f = P.frame ? 1 : 0, b = P.walk ? (f ? -0.6 : 0) : bob(P) * 0.5, M = C.main;
    const mrx = T(stage, 9.6, 11.2, 12.6), mtop = T(stage, 24.8, 24, 23.4) + b, base = mtop + 2.2;
    const SPK = T(stage, C.acc, ['#c0b8b0', '#7c7470', '#463e42'], ['#b8b0ac', '#706a6c', '#3e383c']);
    const TIP = ['#ffffff', '#dce4f0', '#8c9aae'];
    // spikes: [x, height, lean, half-width]
    const back = T(stage, [], [[10, 6, -0.6, 1.8], [16, 7.4, 0, 2], [22, 6, 0.6, 1.8]], [[9, 8, -0.8, 2.1], [15, 9.4, 0, 2.2], [21, 9, 0.4, 2.2], [26, 6, 1.2, 1.8]]);
    const front = T(stage,
      [[6.8, 3.6, -2.6, 1.4], [9.6, 5, -1.4, 1.6], [13, 7, -0.5, 1.7], [16.6, 7.6, 0.2, 1.7], [20.2, 6.8, 0.8, 1.7], [23.4, 5, 1.6, 1.6], [26, 3.4, 2.6, 1.4]],
      [[5.6, 4.2, -2.8, 1.8], [8.8, 6.4, -1.4, 2], [12.8, 8, -0.4, 2.2], [17, 8.8, 0.3, 2.2], [21.2, 7.6, 1, 2.1], [24.8, 6, 1.8, 2], [27.6, 4, 2.8, 1.7]],
      [[4.6, 5, -3.2, 2], [7.8, 8, -1.8, 2.2], [11.8, 10.4, -0.6, 2.4], [16.4, 11.4, 0.2, 2.5], [21, 10.2, 1, 2.4], [25, 8, 1.8, 2.2], [28.2, 5, 3, 1.9]]);
    const spike = (t, [x, h, lean, w], S, wob) => {
      const tx = x + lean, ty = base - h - wob;
      t.poly([[x - w, base], [x, base], [tx, ty]], S[0]); t.poly([[x, base], [x + w, base], [tx, ty]], S[1]);
      if (stage === 2) { const k = 0.32; t.poly([[tx + (x - w - tx) * k, ty + (base - ty) * k], [tx + (x + w - tx) * k, ty + (base - ty) * k], [tx, ty]], TIP[1]); }
    };
    if (back.length) piece(g, t => back.forEach((s, i) => spike(t, s, tint(SPK, INK, 0.2), P.walk && (i + f) % 2 ? 0.6 : 0)));
    piece(g, t => front.forEach((s, i) => spike(t, s, SPK, P.walk && (i + f) % 2 ? 0.6 : 0)));
    piece(g, t => t.ell(16, 30.6, mrx, 30.6 - mtop, M, 0, (x, y) => y <= 30));
    g.outline();
    // mound texture
    dot(g, [[16 - mrx + 3, mtop + 3], [16 - mrx + 5, mtop + 4], [16 + mrx - 3, mtop + 3], [16 + mrx - 6, mtop + 4], [10, mtop + 5]], M[2]);
    dot(g, [[16 - mrx + 4, mtop + 1.6], [16 - mrx + 5, mtop + 1.6], [13, mtop + 1]], M[0]);
    if (stage === 2) for (const [x, h, lean] of front) { const tx = R(x + lean - 0.5), ty = R(base - h) + 1; if (g.filled(tx, ty)) g.set(tx, ty, WHITE); }
    const ex = 15, ey = R(mtop + 1.2);
    face(g, ex, ey, P, { gap: 4, mouth: P.mouth ? [ex, ey + 3, 6] : null });
    return { hx: 17, hy: ey + 1, hr: 5, top: topOf(g), ey, hat: { x: 17, y: R(mtop) + 1, w: 8 } };
  };

  // ---------------- Torchwood -> Blaze Wood -> Inferno Wood ----------------
  // A tree stump (C.main bark) with a face on the trunk and fixed flames rising from the cut top (they flicker with frame);
  // stage 1 taller with bigger flames; stage 2 a blue-white hot core and a ring of fire round the rim.
  PAL.torchwood = { main: ['#d29e6a', '#94603a', '#583420'], leaf: LEAF, stem: '#3f8a3a', root: '#6a4428', part: 'flame' };
  // a flame with three licking tongues; k scales it for the inner layers
  function flamePts(x, base, w, h, f) {
    return [[x - w, base], [x - w * 0.95, base - h * 0.4], [x - w * 0.62, base - h * (0.66 + 0.08 * f)], [x - w * 0.36, base - h * 0.48], [x - w * 0.04, base - h * (1 - 0.1 * f)],
      [x + w * 0.28, base - h * 0.52], [x + w * 0.6, base - h * (0.62 + 0.12 * (1 - f))], [x + w * 0.9, base - h * 0.32], [x + w, base]];
  }
  function flame(t, x, base, w, h, f, cols) {
    t.poly(flamePts(x, base, w, h, f), cols[0]);
    t.poly(flamePts(x + 0.2, base, w * 0.66, h * 0.7, 1 - f), cols[1]);
    t.poly(flamePts(x + 0.3, base, w * 0.34, h * 0.42, f), cols[2]);
  }
  ART.torchwood = function (g, stage, P, C) {
    const b = bob(P), f = P.frame ? 1 : 0, cx = 16, M = C.main;
    const rx = T(stage, 6, 6.5, 7), ry = T(stage, 6, 7.4, 8.4), cy = T(stage, 22.4, 21, 20) + b, rimY = cy - ry + 1.4;
    const RIM = [lighten(M[0], 0.5), lighten(M[0], 0.2), M[1]];
    const FIRE = stage === 2 ? ['#f7922e', '#ffd23a', '#d8f4ff'] : ['#f2742a', '#ffb02a', '#fff6b0'];
    feet(g, cx, P, C.root, T(stage, 3.6, 3.8, 4.2));
    sideArms(g, cx - rx + 1, cx + rx - 1, cy + 1, P, C.leaf, 4.6);
    const ring = (t, front) => { // ring of fire (stage 2): little tongues round an ellipse at the rim
      for (let i = 0; i < 10; i++) {
        const a = i * Math.PI / 5 + (f ? 0.3 : 0), x = cx + Math.cos(a) * (rx + 2.2), y = rimY + 1.2 + Math.sin(a) * 2.6;
        if ((Math.sin(a) >= 0) !== front) continue;
        t.poly([[x - 1.3, y + 0.6], [x + 1.3, y + 0.6], [x + 0.3, y - 2.6 - (i % 2)]], '#f7922e'); t.set(R(x), R(y - 0.4), '#ffd23a');
      }
    };
    if (stage === 2) piece(g, t => ring(t, false));
    piece(g, t => { blob(t, cx, cy, rx, ry, M, 3); t.ell(cx, cy + ry - 1.2, rx + 1.2, 2, M); });
    piece(g, t => t.ell(cx, rimY, rx - 0.7, 1.7, RIM));
    piece(g, t => flame(t, cx, rimY + 0.4, rx - 1.6, T(stage, 7, 9.4, 11.2), f, FIRE));
    if (stage === 2) piece(g, t => ring(t, true));
    g.outline();
    const top = topOf(g);
    if (stage === 2) dot(g, [[cx + 0.4, rimY - 2], [cx + 0.4, rimY - 3]], WHITE);
    // bark grain + knot
    const ex = cx - 1, ey = R(cy - T(stage, 1.4, 1.8, 2.2));
    const inFace = (x, y) => x >= ex - 1 && x <= ex + 6 && y >= ey - 2 && y <= ey + 5;
    for (const [x, y0, y1] of [[cx - rx + 2, rimY + 2.6, cy + ry - 2], [cx - 2, ey + 6, cy + ry - 1], [cx + rx - 2, rimY + 3, cy + 3], [cx + 3, rimY + 2.4, ey - 1]]) for (let y = R(y0); y <= R(y1); y++) if (!inFace(R(x), y)) deeper(g, R(x), y, M);
    dot(g, [[cx - rx + 3, cy + 3], [cx - rx + 4, cy + 3]], M[2]);
    face(g, ex, ey, P, { gap: 4, mouth: [ex, ey + 4, 6], cheeks: [ex - 1, ex + 6, ey + 3] });
    return { hx: cx, hy: ey + 1, hr: R(rx), top, ey, hat: { x: cx, y: R(rimY), w: 9 } };
  };

  // ---------------- Lily Pad -> Lotus Pad -> Lotus Queen ----------------
  // A wide flat lily pad (C.main) seen from the side with a little bump that has the face and a pink bud; stage 1 a lotus
  // blooming behind the bump; stage 2 a big lotus and a tiny crown. It floats: no feet, bottom near y 30.
  PAL.lilypad = { main: ['#bef08e', '#5eb43c', '#2c763a'], leaf: LEAF, acc: PINK, stem: '#3f8a3a', root: '#7a5a2a', part: 'lily' };
  // a pointed petal (two-tone, like a lotus petal) from (x, y) along angle a
  function petal(t, x, y, len, w, a, A) {
    const c = Math.cos(a), s = Math.sin(a), px = -s * w, py = c * w, m = len * 0.45;
    const base = [x, y], tip = [x + c * len, y + s * len], w1 = [x + c * m + px, y + s * m + py], w2 = [x + c * m - px, y + s * m - py];
    t.poly([base, w1, tip], A[0]); t.poly([base, tip, w2], A[1]);
  }
  ART.lilypad = function (g, stage, P, C) {
    const f = P.frame ? 1 : 0, b = P.walk ? f * 0.6 : bob(P), M = C.main;
    const prx = T(stage, 11.4, 12.4, 13.4), pry = T(stage, 3.2, 3.4, 3.6), py = 27.6 + b; // (seen a little from above, so its flat top shows)
    const bx = 15.5, brx = T(stage, 4.9, 5.6, 6), bry = T(stage, 6.4, 6.8, 7.2);
    const btop = py - bry;
    if (stage === 0) { // a pink bud on a stalk at the back of the pad
      stemTo(g, [[21.6, py - 0.5], [22.2, py - 4], [21.8, py - 7]], C.stem, 0.7);
      piece(g, t => { t.ell(21.8, py - 8.6, 1.9, 2.4, C.acc); t.poly([[20.1, py - 9], [23.5, py - 9], [22, py - 12.4]], C.acc[1]); });
      piece(g, t => { leaf(t, 21.8, py - 6.4, 2.6, -2.5, C.leaf, 0.4); leaf(t, 21.8, py - 6.4, 2.6, -0.6, C.leaf, 0.4); });
    } else { // a lotus blooming behind the bump: back petals first, the nearest last (each outlined)
      const ly = btop + 3.4, layers = stage === 2 ? [[6, 10.6, 2.8, tint(C.acc, WHITE, 0.35)], [5, 8.2, 2.6, C.acc]] : [[5, 8, 2.5, C.acc]];
      for (const [n, len, w, A] of layers) {
        const order = [...Array(n).keys()].sort((i, j) => Math.abs(j - (n - 1) / 2) - Math.abs(i - (n - 1) / 2));
        for (const i of order) piece(g, t => { const a = -Math.PI + 0.25 + i * (Math.PI - 0.5) / (n - 1); petal(t, bx + Math.cos(a) * 1.5, ly + Math.sin(a) * 0.8, len, w, a, A); });
      }
    }
    sideArms(g, bx - brx + 0.6, bx + brx - 0.6, btop + 4.5, P, C.leaf, 3.8);
    let headTop = 0;
    const nx = 16 + prx - 4.6; // the pad's notch: a V cut into its front tip
    piece(g, t => t.ell(16, py, prx, pry, M, 0, (x, y) => !(x + 0.5 > nx && Math.abs(y + 0.5 - py + 0.3) < (x + 0.5 - nx) * 0.7)));
    piece(g, t => { t.ell(bx, py, brx, bry, M, 0, (x, y) => y <= py); headTop = scanTop(t, bx); }); // the bump sits on the pad
    if (stage === 2) piece(g, t => t.poly([[bx - 2.6, headTop + 1.2], [bx - 2.6, headTop - 1.8], [bx - 1.3, headTop - 0.6], [bx, headTop - 2.6], [bx + 1.3, headTop - 0.6], [bx + 2.6, headTop - 1.8], [bx + 2.6, headTop + 1.2]], GOLD[1]));
    g.outline();
    const top = topOf(g);
    // pad rim + veins + a water glint
    for (let x = R(16 - prx + 2); x <= R(16 + prx - 2); x++) { const y = R(py + pry * 0.55); if (g.filled(x, y) && (x < bx - brx || x > bx + brx)) g.set(x, y, M[2]); }
    dot(g, [[6, R(py - 1)], [7, R(py - 1)], [25, R(py - 1)]], lighten(M[0], 0.5));
    dot(g, [[9, R(py)], [22, R(py)], [23, R(py) - 1]], M[2]);
    if (stage === 2) { dot(g, [[bx, headTop - 1]], '#e0303e'); dot(g, [[bx - 2, headTop], [bx + 2, headTop]], '#4fc4ee'); }
    const ex = R(bx - 1.5), ey = R(btop + 1.8);
    face(g, ex, ey, P, { gap: 3 }); // eyes only: the lily pad has no mouth
    // it floats: a see-through strip of pond water round the pad's underside, with a glint or two (they drift with frame)
    const WT = 'rgba(95,200,235,0.5)';
    for (let y = R(py); y < 32; y++) for (let x = 0; x < 32; x++) if (g.get(x, y) === null && ((x + 0.5 - 16) / (prx + 2.6)) ** 2 + ((y + 0.5 - (py + 1.6)) / 1.7) ** 2 <= 1) g.set(x, y, WT);
    for (const [x, y] of [[R(16 - prx - 1 + f), R(py + 1.6)], [R(16 + prx + 1 - f), R(py + 1)]]) if (g.get(x, y) === WT) g.set(x, y, '#e0fbff');
    return { hx: R(bx), hy: R(btop + 3), hr: R(brx), top, ey, hat: { x: R(bx), y: headTop + (stage === 2 ? -1 : 1), w: 7 } };
  };

  // ---------------- Tangle Kelp -> Snap Kelp -> Kraken Kelp ----------------
  // A bundle of wavy olive kelp fronds (C.main) swaying with frame, big eyes peeking from the middle; stage 1 taller with a
  // snapping toothy jaw; stage 2 curling tentacle fronds and a little crown.
  PAL.tanglekelp = { main: ['#c4d27a', '#869a3c', '#4a5a28'], leaf: ['#9cc070', '#5e8a40', '#30522a'], stem: '#3f8a3a', root: '#6a5a3a', part: 'swirl' };
  function frond(t, x0, y0, h, amp, ph, r0, col, curl, lean) {
    const pts = [];
    for (let i = 0; i <= 8; i++) { const k = i / 8; pts.push([x0 + (lean || 0) * k * k + Math.sin(k * 4 + ph) * amp * k, y0 - k * h]); }
    if (curl) { // the tip rolls into a little curl (tentacle)
      const [ex, ey] = pts[8], [px, py] = pts[7], dx = ex - px, dy = ey - py, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
      const rc = 1.7, cxp = ex - uy * rc * curl, cyp = ey + ux * rc * curl; let a = Math.atan2(ey - cyp, ex - cxp);
      for (let i = 1; i <= 7; i++) { a += 0.75 * curl; const r = rc * (1 - i * 0.06); pts.push([cxp + Math.cos(a) * r, cyp + Math.sin(a) * r]); }
    }
    stroke(t, pts, r0, 0.5, col);
  }
  ART.tanglekelp = function (g, stage, P, C) {
    const f = P.frame ? 1 : 0, sw = f * 0.9, M = C.main, LF = C.leaf;
    const cx = 16, rx = T(stage, 5.4, 6.2, 7), ry = T(stage, 4.8, 5.8, 6.4), cy = T(stage, 22.8, 21, 19.8);
    const curl = stage === 2;
    // back fronds fanning out of the bundle: [x, height, sway, phase, lean]
    const backF = T(stage,
      [[13.6, 13, 1.1, 0, -5], [15.4, 17, 1.1, 1.6, -1.6], [17, 16.4, 1.1, 3, 1.8], [18.6, 13.4, 1.1, 4.4, 5.2]],
      [[13, 17, 1.3, 0, -6.4], [14.8, 22, 1.3, 1.6, -2.4], [16.8, 23, 1.3, 3.1, 1.6], [18.8, 18, 1.3, 4.4, 6]],
      [[12.8, 18.4, 1.4, 0, -6.6], [14.6, 23, 1.4, 1.6, -2.8], [17, 24.6, 1.4, 3.1, 1.6], [19, 19.6, 1.4, 4.4, 6.2]]);
    backF.forEach(([x, h, amp, ph, lean], i) => piece(g, t => {
      frond(t, x, 30, h, amp, ph + sw, T(stage, 1.3, 1.5, 1.6), LF[1], curl ? (lean < 0 ? 1 : -1) : 0, lean);
      shadeIn(t, x + lean / 2, 30 - h / 2, 5 + Math.abs(lean) / 2, h / 2 + 2, i % 2 ? LF : tint(LF, WHITE, 0.12));
    }));
    let headTop = 0;
    piece(g, t => { t.ell(cx, cy, rx, ry, M); headTop = scanTop(t, cx); });
    // big eye whites (or lids when the eyes are shut)
    const shut = P.eyes === 'happy' || P.eyes === 'closed' || P.eyes === 'blink' || P.eyes === 'sleepy';
    const ex = R(cx - 2), ey = R(cy - T(stage, 2.4, 3.4, 3.8)), er = T(stage, 2, 2.2, 2.4);
    piece(g, t => t.ell(ex + 0.6, ey + 1.5, er, er + 0.2, shut ? M[0] : WHITE));
    piece(g, t => t.ell(ex + 4.9, ey + 1.5, er, er + 0.2, shut ? M[0] : WHITE));
    // short front fronds curling out round the lower body
    piece(g, t => frond(t, cx - 2.6, 30.6, T(stage, 7, 8, 9), 0.8, 2 + sw, 1.3, M[1], 0, -4.4));
    piece(g, t => frond(t, cx + 2.6, 30.6, T(stage, 7.6, 8.6, 9.6), 0.8, 4 + sw, 1.3, M[1], curl ? -1 : 0, 4.6));
    piece(g, t => t.ell(cx, 30.4, T(stage, 4, 4.6, 5.2), 1.5, ['#c8b494', '#8e7a5a', '#5a4a36'], 0, (x, y) => y <= 30));
    if (curl) piece(g, t => t.poly([[cx - 3, headTop + 1.2], [cx - 3, headTop - 1.8], [cx - 1.5, headTop - 0.4], [cx, headTop - 2.8], [cx + 1.5, headTop - 0.4], [cx + 3, headTop - 1.8], [cx + 3, headTop + 1.2]], GOLD[1]));
    g.outline();
    const top = topOf(g);
    if (curl) { dot(g, [[cx, headTop - 0.5]], '#e0303e'); dot(g, [[cx - 2, headTop], [cx + 2, headTop]], '#4fc4ee'); }
    dot(g, [[cx - rx * 0.6, cy + 1], [cx + rx * 0.65, cy + 1.5], [cx - rx * 0.3, cy + ry * 0.7]], M[2]);
    face(g, ex, ey, P, { gap: 4 });
    if (stage >= 1) { // snapping jaw with teeth
      const jy = ey + 5, x0 = R(cx - 3), x1 = R(cx + 4), open = P.mouth === 'open' || P.mouth === 'o';
      for (let x = x0; x <= x1; x++) {
        if (!g.filled(x, jy)) continue;
        g.set(x, jy, INK);
        if (open) { g.set(x, jy + 1, '#5a1a2a'); g.set(x, jy + 2, INK); if (x % 2) g.set(x, jy + 1, WHITE); }
        else if (g.filled(x, jy + 1) && (x % 2)) g.set(x, jy + 1, WHITE);
        if (g.filled(x, jy - 1) && !(x % 2)) g.set(x, jy - 1, WHITE);
      }
    } else if (P.mouth) mouth(g, ex, ey + 4, 6, P.mouth);
    return { hx: cx, hy: R(cy), hr: R(rx), top, ey, hat: { x: cx, y: headTop + (curl ? -1 : 1), w: 8 } };
  };

  // ---------------- Starfruit -> Star Burst -> Supernova Star ----------------
  // A five-pointed star fruit (C.main) on root feet with the face in the centre (its side points are its arms);
  // stage 1 bigger with sparkles; stage 2 a glowing second star behind and a sparkle crown.
  PAL.starfruit = { main: ['#fffaa8', '#f8d838', '#c8941c'], leaf: LEAF, stem: '#3f8a3a', root: '#7a5a2a', part: 'star' };
  function starShape(cx, cy, ro, ri, armUp, rot) {
    const D = Math.PI / 180, o = [-90, -18 - armUp, 54, 126, 198 + armUp].map(a => a * D + (rot || 0)), pts = [];
    for (let i = 0; i < 5; i++) {
      const a = o[i], n = o[(i + 1) % 5] + (i === 4 ? Math.PI * 2 : 0), m = (a + n) / 2;
      pts.push([cx + Math.cos(a) * ro, cy + Math.sin(a) * ro], [cx + Math.cos(m) * ri, cy + Math.sin(m) * ri]);
    }
    return { pts, outer: o.map(a => [cx + Math.cos(a) * ro, cy + Math.sin(a) * ro]) };
  }
  ART.starfruit = function (g, stage, P, C) {
    const b = bob(P), f = P.frame ? 1 : 0, cx = 16, M = C.main;
    const ro = T(stage, 8.4, 9.6, 10.8), ri = T(stage, 4.4, 5, 5.6), cy = T(stage, 20.4, 18.6, 17.6) + b;
    const armUp = P.arms === 'up' ? 22 : P.arms === 'down' ? -16 : P.arms === 'out' ? 4 : 0;
    const S = starShape(cx, cy, ro, ri, armUp);
    if (stage === 2) piece(g, t => { const B2 = starShape(cx, cy, 13, 7.6, 0, Math.PI / 5); t.poly(B2.pts, '#ffe27a'); shadeIn(t, cx, cy, 13, 13, ['#fff8d0', '#ffd860', '#f0a030']); });
    const bl = S.outer[3], br = S.outer[2];
    feet(g, cx, P, C.root, (br[0] - bl[0]) / 2);
    piece(g, t => { t.poly(S.pts, M[1]); shadeIn(t, cx - 0.5, cy - 0.5, ro * 0.95, ro * 0.95, M); });
    g.outline();
    const top = topOf(g);
    // ridges: a light line from the middle toward each point
    S.outer.forEach(([x, y], i) => {
      for (let k = 0.55; k <= 0.8; k += 0.12) { const px = R(cx + (x - cx) * k - 0.5), py = R(cy + (y - cy) * k - 0.5); if (g.filled(px, py)) g.set(px, py, i === 2 || i === 1 ? M[2] : lighten(M[0], 0.4)); }
    });
    if (stage === 2) {
      const tp = S.outer[0];
      for (const [x, y, big] of [[tp[0] - 5, tp[1] + 1, 0], [tp[0], tp[1] - 2.4, 1], [tp[0] + 5, tp[1] + 1, 0]]) sparkle(g, x, y, big, '#fff27a', '#f8b02a');
    }
    if (stage >= 1) {
      const sp = f ? [[4, 9], [27, 13], [26, 25]] : [[5, 13], [27, 9], [6, 24]];
      for (const [x, y] of sp) sparkle(g, x, y, stage === 2 && !f, '#fff27a', '#f8b02a');
    }
    const ex = R(cx - 2), ey = R(cy - 2);
    face(g, ex, ey, P, { gap: 3, mouth: [ex, ey + 4, 5], cheeks: [ex - 1, ex + 4, ey + 3] });
    const tp = S.outer[0];
    return { hx: cx, hy: R(cy), hr: R(ri + 1), top, ey, hat: { x: cx, y: R(tp[1] + 3.4), w: 6 } };
  };
})();
