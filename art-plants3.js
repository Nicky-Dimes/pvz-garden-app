// art-plants3.js — PVZ Garden plant species art, batch 3 (see the SPECIES ART CONTRACT at the top of art-core.js).
// Magnet-shroom, Hypno-shroom, Doom-shroom, Iceberg Lettuce, Bonk Choy, Lightning Reed, Laser Bean, Garlic, Snapdragon,
// Marigold, Pumpkin, Coconut Cannon, Bloomerang, Electric Blueberry, Infi-nut.
// Same idiom as art-plants.js: PX.PLANT_PAL[id] + PX.PLANT_ART[id](g, stage, P, C) -> geom. Art faces RIGHT, 32x32, feet at y 28-31.
(function () {
  'use strict';
  const { INK, stroke, starPts, Grid } = PX;
  const { face, mouth, feet, leaf, baseLeaves, stemTo, piece, mixHex } = PX.art;
  const ART = PX.PLANT_ART, PAL = PX.PLANT_PAL;
  const T = (stage, a, b, c) => (stage === 2 ? c : stage === 1 ? b : a); // pick a value per stage
  const R = Math.round;
  const WHITE = '#ffffff', SHINE = '#3f4aa0', YEL = '#fff27a';
  const LEAF = ['#a6ec70', '#5cb43a', '#2f7a4a'];
  const GOLD = ['#fffbd0', '#f6c83a', '#b87818'], SILVER = ['#ffffff', '#c8d0e0', '#7a8498'], RED = ['#ff8a90', '#e0303e', '#901c30'];
  const GLOW = ['#fffbd0', '#fbf236', '#c8b020'], METAL = ['#eef2fa', '#a8b4c8', '#5e6a80'];
  const CROWN = '#ffd23a';
  const bob = P => (P.frame && !P.walk ? 0.4 : 0);
  const lt = (c, k) => mixHex(c, '#ffffff', k), dk = (c, k) => mixHex(c, INK, k);
  const topOf = g => { for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.get(x, y)) return y; return 0; };
  const onFill = (g, pts, col) => { for (const [x, y] of pts) if (g.filled(x, y)) g.set(x, y, col); };
  const onEmpty = (g, pts, col) => { for (const [x, y] of pts) if (!g.get(x, y)) g.set(x, y, col); };
  const isOf = (g, x, y, ramp) => ramp.indexOf(g.get(x, y)) >= 0;
  function linePts(x0, y0, x1, y1) {
    x0 = R(x0); y0 = R(y0); x1 = R(x1); y1 = R(y1);
    const out = [], dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
    for (;;) { out.push([x0, y0]); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
    return out;
  }
  const pathPts = pts => { const o = []; for (let i = 1; i < pts.length; i++) o.push(...linePts(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1])); return o; };
  const rotAbout = (cx, cy, a) => ([x, y]) => { const c = Math.cos(a), s = Math.sin(a), dx = x - cx, dy = y - cy; return [cx + dx * c - dy * s, cy + dx * s + dy * c]; };
  // re-shade everything drawn on t inside an ellipse with a 3-tone ramp (gives poly / stroke shapes the house shading)
  const shadeAll = (t, cx, cy, rx, ry, ramp, rot) => t.ell(cx, cy, rx, ry, ramp, rot || 0, (x, y) => t.filled(x, y));
  const withEyes = (P, e) => (P.eyes ? P : Object.assign({}, P, { eyes: e }));
  // a zigzag lightning bolt, top at (x, y), about 6s tall
  const boltPts = (x, y, s) => [[x, y], [x + 2.4 * s, y], [x + 1.1 * s, y + 2.3 * s], [x + 2.8 * s, y + 2.3 * s], [x - 0.4 * s, y + 6 * s], [x + 0.5 * s, y + 3.3 * s], [x - 1.1 * s, y + 3.3 * s]];
  const bolt = (t, x, y, s, col, rot) => t.poly(rot ? boltPts(x, y, s).map(rotAbout(x + s, y + 3 * s, rot)) : boltPts(x, y, s), col || YEL);
  // a little crown, bottom-centre (x, y), half-width w, height h
  const crown = (t, x, y, w, h, col) => t.poly([[x - w, y + 0.6], [x - w, y - h + 0.8], [x - w / 2, y - h * 0.4], [x, y - h], [x + w / 2, y - h * 0.4], [x + w, y - h + 0.8], [x + w, y + 0.6]], col || CROWN);
  const jewels = (g, x, y, w) => { onFill(g, [[R(x), R(y - 1)]], '#e0303e'); onFill(g, [[R(x - w + 1), R(y)], [R(x + w - 1), R(y)]], '#4fc4ee'); };
  // the leaf pose for wide bodies: like baseLeaves, but the two leaves start at cx -/+ half so they show beside the body
  function sideLeaves(g, cx, half, y, P, ramp, len) {
    const a = P && P.arms, ang = a === 'up' ? 0.95 : a === 'out' ? 0.15 : -0.35;
    leaf(g, cx - half, y, len, Math.PI + ang, ramp); leaf(g, cx + half, y, len, -ang, ramp);
  }
  const sparkle = (g, x, y, col) => { onEmpty(g, [[x, y]], WHITE); onEmpty(g, [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]], col || YEL); };

  // =====================================================================================================
  // Magnet-shroom -> Gold Magnet -> Mega Magnet
  // A purple-blue cap (C.main) on a pale stalk with the face; a horseshoe magnet stands on the cap (gold at stage 1, big + crackles at 2).
  PAL.magnetshroom = { main: ['#b4b8ff', '#6c6ce0', '#3c3a9a'], leaf: LEAF, acc: ['#fdfaff', '#e2dcf4', '#a49ccc'], stem: '#3f8a3a', root: '#7a5a2a', part: 'magnet' };
  function magnet(g, mx, my, s, ang, body) {
    const a = 2.5 * s, r = 1.15 * s, h = 4.2 * s, Rt = rotAbout(mx, my, ang);
    const U = [[mx - a, my - h], [mx - a, my - 1.2 * s], [mx - a * 0.6, my + 0.3 * s], [mx, my + 0.7 * s], [mx + a * 0.6, my + 0.3 * s], [mx + a, my - 1.2 * s], [mx + a, my - h]].map(Rt);
    piece(g, t => {
      stroke(t, U, r, r, body[1]);
      shadeAll(t, mx - 0.5, my - h * 0.5, a + r + 1, h * 0.5 + r + 1.5, body, ang);
      for (const sx of [-1, 1]) { const [x, y] = Rt([mx + sx * a, my - h + 0.3 * s]); t.ell(x, y, r + 0.15, 1.15 * s, SILVER, ang); }
    });
    return { tipL: Rt([mx - a, my - h - r]), tipR: Rt([mx + a, my - h - r]) };
  }
  ART.magnetshroom = function (g, stage, P, C) {
    const b = bob(P);
    const sw = T(stage, 3.8, 4.4, 5), sh = T(stage, 4, 4.8, 5.4), sy = T(stage, 24.8, 24, 23.6) + b;
    const cw = T(stage, 7.2, 8.4, 9.4), ch = T(stage, 5, 6.2, 6.6), cb = T(stage, 21.4, 20.2, 19.4) + b, capTop = cb - ch;
    sideLeaves(g, 16, sw - 1.5, 27, P, C.leaf, T(stage, 4.5, 5, 5.5));
    feet(g, 16, P, C.root, T(stage, 2.6, 3, 3.2));
    piece(g, t => t.ell(16, sy, sw, sh, C.acc));
    piece(g, t => t.ell(16, cb, cw, ch, C.main, 0, (x, y) => y <= cb));
    const s = T(stage, 1, 1.25, 1.5), M = magnet(g, 16.5, capTop + 1.1, s, 0.15, stage === 1 ? GOLD : RED);
    if (stage === 2) { // lightning crackles off the magnet tips
      const f = P.frame ? 1 : 0;
      piece(g, t => { bolt(t, M.tipL[0] - 3.2, M.tipL[1] - 1 + f, 0.42, YEL, -0.5); bolt(t, M.tipR[0] + 1.6, M.tipR[1] - f, 0.42, YEL, 0.5); });
    }
    g.outline();
    // light spots on the cap
    const spots = [[16 - cw * 0.55, cb - ch * 0.45], [16 + cw * 0.45, cb - ch * 0.5], [16 - cw * 0.12, cb - ch * 0.2]];
    for (const [x, y] of spots) for (const [dx, dy] of [[0, 0], [1, 0]]) { const X = R(x) + dx, Y = R(y) + dy; if (isOf(g, X, Y, C.main)) g.set(X, Y, lt(C.main[0], 0.35)); }
    const ey = Math.floor(cb) + 2, ex = T(stage, 14, 15, 15);
    face(g, ex, ey, P, { gap: 3, mouth: [ex, ey + 3, 5], cheeks: [ex - 1, ex + 5, ey + 3] });
    return { hx: 16, hy: R((capTop + ey + 4) / 2), hr: R(cw * 0.8), top: topOf(g), ey, hat: { x: 16, y: R(capTop + 1.5), w: R(cw * 1.1) } };
  };

  // =====================================================================================================
  // Hypno-shroom -> Swirl-shroom -> Hypno King
  // A tall mushroom: a bell cap with a three-colour spiral (C.main base + green + purple), a pale stalk with dreamy eyes.
  PAL.hypnoshroom = { main: ['#ffc8ee', '#f07ad0', '#b03c98'], leaf: LEAF, acc: ['#fffaf2', '#eae0f4', '#b0a2cc'], stem: '#3f8a3a', root: '#7a5a2a', part: 'swirl' };
  const SW_G = ['#dcffb0', '#8ee05a', '#3e9a46'], SW_P = ['#dcbcff', '#a066e0', '#5e2e9e'];
  // paint a 3-arm spiral over the pixels own(x, y), centres = [[cx, cy], ...] (nearest wins); shading from the ellipse (ex, ey, rx, ry)
  function swirl(g, own, centres, bw, cols, spin, ex, ey, rx, ry) {
    const n = cols.length;
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      if (!own(x, y)) continue;
      let best = 1e9, c = centres[0];
      for (const q of centres) { const d = (x + 0.5 - q[0]) ** 2 + (y + 0.5 - q[1]) ** 2; if (d < best) { best = d; c = q; } }
      const dx = x + 0.5 - c[0], dy = y + 0.5 - c[1], r = Math.hypot(dx, dy), a = Math.atan2(dy, dx) + spin;
      const band = ((Math.floor(r / bw - n * a / (2 * Math.PI)) % n) + n) % n;
      const nx = (x + 0.5 - ex) / rx, ny = (y + 0.5 - ey) / ry, d = nx * 0.55 + ny * 0.85;
      g.set(x, y, cols[band][d < -0.42 ? 0 : d > 0.55 ? 2 : 1]);
    }
  }
  function dreamyEyes(g, x, y, gap) { // heavy-lidded, pink-glinting eyes
    for (const a of [x, x + gap]) { g.px([[a - 1, y + 1], [a, y + 1], [a + 1, y + 1], [a + 2, y + 1], [a, y + 2], [a + 1, y + 2]], INK); g.set(a + 1, y + 2, '#e050c0'); }
  }
  ART.hypnoshroom = function (g, stage, P, C) {
    const b = bob(P);
    const sw = T(stage, 3.5, 4, 4.5), sh = T(stage, 4.6, 5, 5.4), sy = T(stage, 24.4, 24, 23.6) + b;
    const cw = T(stage, 6.2, 7.2, 8.2), ch = T(stage, 8.6, 10.8, 12.4), cb = T(stage, 20.2, 19.4, 18.8) + b, capTop = cb - ch;
    sideLeaves(g, 16, sw - 1.5, 27, P, C.leaf, T(stage, 4.5, 5, 5.5));
    feet(g, 16, P, C.root, T(stage, 2.6, 3, 3.2));
    piece(g, t => t.ell(16, sy, sw, sh, C.acc));
    const cap = new Grid(32, 32);
    cap.ell(16, cb, cw, ch, C.main, 0, (x, y) => y <= cb);
    cap.ell(16, cb - 1.1, cw + 1.1, 1.5, C.main);
    cap.outline(); g.merge(cap);
    if (stage === 2) piece(g, t => crown(t, 16, capTop + 1.2, 2.6, 3, CROWN));
    g.outline();
    const own = (x, y) => cap.filled(x, y) && g.get(x, y) === cap.get(x, y);
    const spin = P.frame ? 1.05 : 0, cy = cb - ch * 0.5;
    const centres = stage === 2 ? [[16 - cw * 0.28, cb - ch * 0.3], [16 + cw * 0.22, cb - ch * 0.66]] : [[16.3, cb - ch * 0.45]];
    swirl(g, own, centres, T(stage, 1.25, 1.6, 1.45), [C.main, SW_G, SW_P], spin, 16, cy, cw, ch * 0.62);
    if (stage === 2) jewels(g, 16, capTop + 1.2, 2.6);
    const ey = Math.floor(cb + 0.4) + 2, ex = T(stage, 14, 14, 15);
    if (P.eyes) face(g, ex, ey, P, { gap: 3, mouth: [ex, ey + 3, 5], cheeks: [ex - 1, ex + 5, ey + 3] });
    else { dreamyEyes(g, ex, ey, 3); mouth(g, ex, ey + 3, 5, P.mouth); onFill(g, [[ex - 1, ey + 3], [ex + 5, ey + 3]], '#f4a3b8'); }
    return { hx: 16, hy: R((capTop + ey + 4) / 2), hr: R(cw * 0.8), top: topOf(g), ey, hat: { x: 16, y: R(capTop + 1.5), w: 8 } };
  };

  // =====================================================================================================
  // Doom-shroom -> Gloom Doom -> Mega Doom
  // A round dark cap (C.main) with glowing violet veins, a short pale stalk with a grumpy face. Stage 1 glowing spots; stage 2 a lit fuse sprout.
  PAL.doomshroom = { main: ['#7c6cb0', '#3e3270', '#221a42'], leaf: ['#9ad070', '#4f9a4a', '#2a5e3e'], acc: ['#f6d8ff', '#c870f4', '#7a34b8'], stem: '#3a6a3a', root: '#5a4030', part: 'cap' };
  const DOOM_VEINS = [
    [[-0.55, 0.62], [-0.6, 0.15], [-0.35, -0.2], [-0.45, -0.6]], [[-0.6, 0.15], [-0.88, -0.05]],
    [[0.15, 0.62], [0.1, 0.12], [0.32, -0.25], [0.2, -0.7]], [[0.1, 0.12], [-0.12, -0.18]], [[0.32, -0.25], [0.62, -0.38]],
    [[0.66, 0.55], [0.78, 0.15]],
  ];
  ART.doomshroom = function (g, stage, P, C) {
    const b = bob(P);
    const cw = T(stage, 7, 8.4, 10), ch = T(stage, 5.6, 7, 7.8), cy = T(stage, 18, 15.8, 14.9) + b, cb = cy + ch * 0.62;
    const sw = T(stage, 4.2, 4.8, 5.4), sh = T(stage, 3.6, 4, 4.6), sy = T(stage, 25.2, 24.8, 24.2) + b;
    const stalk = [lt(C.main[0], 0.55), lt(C.main[0], 0.3), C.main[0]];
    sideLeaves(g, 16, sw - 1.5, 27, P, C.leaf, T(stage, 4.5, 5, 5.5));
    feet(g, 16, P, C.root, T(stage, 2.8, 3.1, 3.4));
    piece(g, t => t.ell(16, sy, sw, sh, stalk));
    if (stage === 2) { // fuse sprout
      const x = 16.5, y = cy - ch + 1;
      piece(g, t => { stroke(t, [[x, y + 1], [x + 0.2, y - 1.6], [x + 1.6, y - 2.6]], 0.8, 0.6, C.leaf[1]); leaf(t, x, y - 0.6, 3.2, -2.5, C.leaf, 0.38); });
    }
    piece(g, t => t.ell(16, cy, cw, ch, C.main, 0, (x, y) => y <= cb));
    if (stage === 2) { // the spark on the fuse tip
      const x = 18.4, y = cy - ch - 0.9, f = P.frame ? 0.3 : 0;
      piece(g, t => { t.poly(starPts(x, y, 1.9 + f, 0.85, 4, f ? 0 : -Math.PI / 4), '#ff9a2a'); });
    }
    g.outline();
    // glowing veins (and spots from stage 1)
    const capPx = (x, y) => isOf(g, x, y, C.main);
    const vein = C.acc[1];
    for (const path of DOOM_VEINS) for (const [x, y] of pathPts(path.map(([u, v]) => [16 + u * cw, cy + v * ch]))) if (capPx(x, y)) g.set(x, y, vein);
    if (stage >= 1) for (const [u, v, r] of [[-0.25, -0.62, 1.2], [0.52, 0.18, 1.3], [-0.78, 0.36, 1], [0.5, -0.66, 1]]) {
      const X = 16 + u * cw, Y = cy + v * ch;
      g.ell(X, Y, r * T(stage, 1, 1, 1.2), r * T(stage, 1, 1, 1.2), C.acc[1], 0, capPx);
      onFill(g, [[R(X - 0.5), R(Y - 0.5)]], C.acc[0]);
    }
    if (stage === 2) { const x = 18, y = R(cy - ch - 0.9); onFill(g, [[x, y]], YEL); onFill(g, [[x + 1, y]], WHITE); }
    const ey = Math.floor(cb) + 2, ex = T(stage, 14, 14, 14);
    const PE = withEyes(P, 'brave');
    face(g, ex, ey, PE, { gap: 4, mouth: P.mouth ? [ex + 1, ey + 3, 4] : null, cheeks: null });
    if (!P.mouth) g.px([[ex + 1, ey + 4], [ex + 2, ey + 3], [ex + 3, ey + 3], [ex + 4, ey + 4]], INK); // frown
    return { hx: 16, hy: R(cy), hr: R(cw * 0.85), top: topOf(g), ey, hat: { x: 16, y: R(cy - ch + 1.5), w: R(cw * 1.1) } };
  };

  // =====================================================================================================
  // Iceberg Lettuce -> Frost Lettuce -> Glacier Lettuce
  // A round icy head (C.main) cupped by layered leaves (C.leaf), frost glints; stage 1 icicles; stage 2 an ice crown.
  PAL.iceberg = { main: ['#eafff2', '#a6e6d2', '#5aa6b0'], leaf: ['#d4f8c8', '#86d2a4', '#3e8c80'], acc: ['#e8fcff', '#8ad8f8', '#3a8ac8'], stem: '#3e8c80', root: '#6a5a4a', part: 'cap' };
  ART.iceberg = function (g, stage, P, C) {
    const b = bob(P);
    const r = T(stage, 6.3, 7, 7.6), hx = 15.5, hy = T(stage, 19.6, 17.8, 16.6) + b;
    sideLeaves(g, 16, r * 0.45, 26.4, P, C.leaf, T(stage, 5, 5.5, 6));
    feet(g, 16, P, C.root, T(stage, 2.8, 3.1, 3.4));
    // outer leaves behind the head
    piece(g, t => {
      t.ell(hx - r * 0.72, hy + r * 0.32, r * 0.62, r * 0.55, C.leaf, -0.6);
      t.ell(hx + r * 0.72, hy + r * 0.32, r * 0.62, r * 0.55, C.leaf, 0.6);
      t.ell(hx - r * 0.35, hy - r * 0.72, r * 0.5, r * 0.32, C.leaf, -0.4);
    });
    if (stage >= 1) piece(g, t => { // icicles hanging from the outer leaves
      for (const [x, y, h] of [[hx - r - 0.2, hy + r * 0.62, 3.2], [hx - r * 0.55, hy + r * 0.86, 2.4], [hx + r + 0.4, hy + r * 0.62, 3.2], [hx + r * 0.6, hy + r * 0.86, 2.2]]) t.poly([[x - 1.1, y - 0.5], [x + 1.1, y - 0.5], [x, y + h]], C.acc[1]);
    });
    if (stage === 2) piece(g, t => { // ice crown
      for (const [dx, hh, w] of [[-3.4, 3.2, 1.2], [3.4, 3.2, 1.2], [-1.6, 4.4, 1.3], [1.8, 4.2, 1.3], [0, 5.4, 1.4]]) { const x = hx + dx, y = hy - r + 1.6; t.poly([[x - w, y], [x - w * 0.8, y - hh * 0.55], [x, y - hh], [x + w * 0.8, y - hh * 0.55], [x + w, y]], C.acc[1]); }
      shadeAll(t, hx, hy - r - 1, 5, 4, C.acc);
    });
    piece(g, t => t.ell(hx, hy, r, r * 0.95, C.main));
    // front leaves cupping the bottom of the head
    piece(g, t => {
      t.ell(hx - r * 0.64, hy + r * 0.52, r * 0.52, r * 0.34, C.leaf, 0.55);
      t.ell(hx + r * 0.66, hy + r * 0.52, r * 0.52, r * 0.34, C.leaf, -0.55);
    });
    g.outline();
    // leaf-layer lines on the head
    const headPx = (x, y) => isOf(g, x, y, C.main);
    for (const path of [[[hx - r * 0.85, hy + 0.5], [hx - r * 0.65, hy - r * 0.45], [hx - r * 0.1, hy - r * 0.8]], [[hx + r * 0.25, hy - r * 0.85], [hx + r * 0.8, hy - r * 0.35], [hx + r * 0.88, hy + 0.5]]])
      for (const [x, y] of pathPts(path)) if (headPx(x, y)) g.set(x, y, C.main[2]);
    // frost glints
    for (const [x, y] of [[hx - r * 0.55, hy - r * 0.35], [hx + r * 0.75, hy + r * 0.62], [hx - r * 0.95, hy + r * 0.45]]) onFill(g, [[R(x), R(y)]], WHITE);
    sparkle(g, R(hx + r + 1.5), R(hy - r * 0.55), '#a8e4fa');
    if (stage === 2) jewels(g, hx, hy - r + 1, 3);
    const ex = R(hx - 1.5), ey = R(hy - 2.2);
    face(g, ex, ey, P, { gap: 4, mouth: [ex + 1, ey + 4, 4], cheeks: [ex - 1, ex + 6, ey + 3] });
    return { hx: R(hx), hy: R(hy), hr: R(r), top: topOf(g), ey, hat: { x: R(hx), y: R(hy - r + 1.5), w: 9 } };
  };

  // =====================================================================================================
  // Bonk Choy -> Bonk Champ -> Bonk King
  // A pale bok-choy stalk body with a leafy top (C.main) and big leafy fists; the front fist punches forward on frame 1.
  // Stage 1 a sweatband; stage 2 a crown and bigger fists.
  PAL.bonkchoy = { main: ['#b4ec70', '#55b43c', '#2a6e34'], leaf: LEAF, acc: ['#e0303e', '#e0303e', '#901c30'], stem: '#3f8a3a', root: '#7a5a2a', part: 'brows' };
  ART.bonkchoy = function (g, stage, P, C) {
    const b = bob(P);
    const bw = T(stage, 4.6, 5.1, 5.6), bh = T(stage, 6, 6.8, 7.4), hx = 14, hy = T(stage, 21, 19.8, 19) + b, fr = T(stage, 2.4, 2.8, 3.4);
    const body = [lt(C.main[0], 0.82), lt(C.main[0], 0.56), lt(C.main[1], 0.4)];
    const A = P.arms, punch = P.frame && !A;
    let back, front;
    if (A === 'up') { back = [hx - bw - 1.6, hy - bh * 0.7]; front = [hx + bw + 1.8, hy - bh * 0.7]; }
    else if (A === 'out') { back = [hx - bw - 3.2, hy - 0.5]; front = [hx + bw + 3.4, hy - 0.5]; }
    else if (A === 'down') { back = [hx - bw - 1.2, hy + bh * 0.45]; front = [hx + bw + 1.4, hy + bh * 0.45]; }
    else { back = [hx - bw - 1.2, hy + 2]; front = punch ? [hx + bw + 4.6, hy + 1.2] : [hx + bw + 1.6, hy + 2.6]; }
    const fist = (t, [x, y]) => { t.ell(x, y, fr, fr * 0.92, C.main); };
    feet(g, 15, P, C.root, T(stage, 2.6, 3, 3.2));
    // back arm + fist, leafy top
    piece(g, t => { stroke(t, [[hx - bw * 0.6, hy - 0.5], back], 0.9, 0.9, body[2]); fist(t, back); });
    piece(g, t => { const y = hy - bh + 1.5, L = T(stage, 4.6, 5.4, 6.2); leaf(t, hx - 1.4, y, L, -Math.PI / 2 - 0.6, C.main, 0.36); leaf(t, hx + 1.6, y, L * 0.9, -Math.PI / 2 + 0.55, C.main, 0.36); leaf(t, hx, y - 0.5, L * 1.1, -Math.PI / 2 - 0.05, C.main, 0.36); });
    piece(g, t => t.ell(hx, hy, bw, bh, body));
    if (stage === 2) piece(g, t => crown(t, hx, hy - bh + 1.2, 3, 3.2, CROWN));
    piece(g, t => { stroke(t, [[hx + bw * 0.6, hy - 0.5], front], 0.9, 0.9, body[2]); fist(t, front); });
    g.outline();
    // knuckle lines + stalk ridges
    for (const [x, y] of [front, back]) { const X = R(x + fr * 0.35), Y = R(y - fr * 0.3); onFill(g, [[X, Y], [X, Y + 1]], C.main[2]); onFill(g, [[X - 1, Y + R(fr)], [X, Y + R(fr)]].filter(([u, v]) => isOf(g, u, v, C.main)), C.main[2]); }
    for (const dx of [-2, 1]) for (let y = R(hy + 2.5); y <= R(hy + bh - 1.2); y++) if (isOf(g, R(hx + dx), y, body)) g.set(R(hx + dx), y, lt(C.main[1], 0.45));
    const ex = R(hx - 1.6), ey = R(hy - bh * 0.32);
    if (stage >= 1) { // sweatband
      for (let x = R(hx - bw - 1); x <= hx + bw + 1; x++) for (const y of [ey - 4, ey - 3]) if (isOf(g, x, y, body) || isOf(g, x, y, C.main)) g.set(x, y, y === ey - 4 ? '#ff6a70' : '#e0303e');
      const x0 = R(hx - bw) - 1; onEmpty(g, [[x0, ey - 3], [x0 - 1, ey - 2], [x0 - 1, ey - 1]], '#e0303e');
    }
    if (stage === 2) jewels(g, hx, hy - bh + 1.2, 3);
    face(g, ex, ey, Object.assign({}, P, { eyes: P.eyes || 'brave', mouth: P.mouth || 'flat' }), { gap: 3, mouth: [ex, ey + 4, 5], cheeks: [ex - 1, ex + 5, ey + 3] });
    return { hx: R(hx), hy: R(hy - bh * 0.3), hr: R(bw + 0.5), top: topOf(g), ey, hat: { x: R(hx), y: R(hy - bh + 1.2), w: 8 }, front: R(front[0] + fr) };
  };

  // =====================================================================================================
  // Lightning Reed -> Storm Reed -> Thunder Reed
  // A slender reed stalk and a brown cattail head (C.main) with the face and little lightning tufts; stage 1 a second reed;
  // stage 2 a storm cloud above striking the reed tip.
  PAL.lightningreed = { main: ['#ecc088', '#b47a48', '#704428'], leaf: ['#b8e070', '#6aa83a', '#3a6e30'], acc: GLOW, stem: '#4f8a3a', root: '#7a5a2a', part: 'bolt' };
  function cattail(g, x, y, rx, ry, C, spike) {
    stemTo(g, [[x, y - ry + 1], [x + 0.4, y - ry - spike]], C.stem, 0.55);
    piece(g, t => { stroke(t, [[x, y - ry + rx], [x, y + ry - rx]], rx, rx, C.main[1]); shadeAll(t, x, y, rx + 0.5, ry + 0.5, C.main); });
  }
  ART.lightningreed = function (g, stage, P, C) {
    const b = bob(P), f = P.frame ? 1 : 0;
    const rx = T(stage, 3.1, 3.4, 3.7), ry = T(stage, 5.8, 6.6, 6.6), hx = T(stage, 16, 17, 16.5), hy = T(stage, 17.6, 14.6, 18.4) + b;
    feet(g, 16, P, C.root, T(stage, 2.6, 3, 3.2));
    // tall grass blade behind
    piece(g, t => stroke(t, [[17, 28], [19.6, 24], [21.4, T(stage, 20, 18, 19)]], 0.6, 0.3, C.leaf[1]));
    if (stage >= 1) { // the second, smaller reed
      stemTo(g, [[15, 28], [11, 24], [9.6, 21.5]], C.stem, 0.6);
      cattail(g, 9.6, 18.2, 2.3, 3.5, C, 1.6);
    }
    stemTo(g, [[16, 29], [16, hy + ry + 1], [hx, hy + ry - 1]], C.stem, 0.8);
    baseLeaves(g, 16, 27.4, P, C.leaf, T(stage, 5, 5.5, 6));
    cattail(g, hx, hy, rx, ry, C, T(stage, 2, 2, 2.4));
    // lightning tufts on the head
    piece(g, t => { bolt(t, hx - rx - 1.8, hy - ry + 0.4 + f * 0.5, 0.62, YEL, -0.55); bolt(t, hx + rx - 0.2, hy - ry - f * 0.5, 0.62, YEL, 0.5); });
    if (stage === 2) { // storm cloud + strike
      piece(g, t => { const cl = ['#ffffff', '#c4c8dc', '#7a7e9a']; t.ell(12.4, 7.2, 2.6, 1.7, cl); t.ell(15.8, 6.7, 3.2, 1.8, cl); t.ell(19.4, 7.3, 2.5, 1.6, cl); });
      piece(g, t => bolt(t, 16.2, 8.4, 0.42, YEL));
    }
    g.outline();
    // fuzzy texture on the cattail
    for (const [dx, dy] of [[-1, -2], [1, 2], [-2, 1], [2, -3], [0, 4]]) { const x = R(hx + dx), y = R(hy + dy); if (isOf(g, x, y, C.main)) g.set(x, y, C.main[0]); }
    if (stage >= 1) { const x = 9, y = 17; g.set(x, y, INK); g.set(x, y + 1, INK); g.set(x + 2, y, INK); g.set(x + 2, y + 1, INK); }
    const ex = R(hx - 1.5), ey = R(hy - 2.2);
    face(g, ex, ey, P, { gap: 3, mouth: [ex, ey + 4, 5], cheeks: [ex - 1, ex + 5, ey + 3] });
    return { hx: R(hx), hy: R(hy), hr: R(ry - 1), top: topOf(g), ey, hat: { x: R(hx), y: R(hy - ry + 1.5), w: 7 } };
  };

  // =====================================================================================================
  // Laser Bean -> Beam Bean -> Mega Laser Bean
  // A bumpy green bean-pod head (C.main) on a stem; a red lens over the front eye (a full visor band at stage 1+);
  // stage 2 a laser-cannon snout pointing right.
  PAL.laserbean = { main: ['#c8f078', '#7cc84a', '#3e8a3a'], leaf: LEAF, acc: ['#ffc0d0', '#ff4a6a', '#b0183e'], stem: '#3f8a3a', root: '#7a5a2a', part: 'beam' };
  ART.laserbean = function (g, stage, P, C) {
    const b = bob(P);
    const rx = T(stage, 6.6, 7.3, 7.8), ry = T(stage, 4.4, 4.9, 5.3), hx = T(stage, 14.6, 14.6, 13.8), hy = T(stage, 17.2, 13.8, 11) + b;
    stemTo(g, [[15.5, 29], [15.5, hy + ry + 1.5], [hx + 0.5, hy + ry - 0.5]], C.stem, T(stage, 0.8, 0.9, 1));
    baseLeaves(g, 16, 27.6, P, C.leaf, T(stage, 5, 6, 6.5));
    feet(g, 16, P, C.root, T(stage, 2.6, 3, 3.2));
    if (stage === 2) piece(g, t => { // laser cannon
      const y = hy + 1.2, x0 = hx + rx - 2, x1 = hx + rx + 5.4;
      t.rect(R(x0), R(y - 1.6), R(x1 - x0), 4, METAL[1]); shadeAll(t, x0 + 3, y, 6, 2.6, METAL);
      t.ell(x1, y + 0.4, 1.3, 2.6, ['#ff9aaa', '#e0303e', '#901c30']);
    });
    piece(g, t => {
      stroke(t, [[hx - rx + ry, hy + 1], [hx, hy - 0.2], [hx + rx - ry, hy + 0.6]], ry, ry, C.main[1]);
      for (const dx of [-0.48, 0, 0.46]) t.ell(hx + rx * dx, hy - ry * 0.42 + Math.abs(dx) * 1.4, ry * 0.6, ry * 0.6, C.main[1]);
      t.poly([[hx - rx + 0.8, hy - 1.4], [hx - rx - 1.8, hy - 2.6], [hx - rx + 0.6, hy + 1.2]], C.main[1]); // pod tip
      shadeAll(t, hx, hy - 0.6, rx + 1.5, ry + 1.4, C.main);
    });
    g.outline();
    // seam line along the pod
    for (const [x, y] of pathPts([[hx - rx + 1.2, hy + 0.8], [hx - 2.5, hy + ry * 0.62]])) if (isOf(g, x, y, C.main)) g.set(x, y, C.main[2]);
    const ex = R(hx - 0.8), ey = R(hy - 2.6), lx = ex + 4;
    // the laser lens: a red-rimmed monocle over the front eye (a visor band across the forehead holds it from stage 1)
    const x0 = lx - 1, x1 = lx + 2;
    if (stage >= 1) for (let x = R(hx - rx); x < x0; x++) if (g.filled(x, ey - 1)) g.set(x, ey - 1, METAL[2]);
    for (let y = ey - 1; y <= ey + 3; y++) for (let x = x0; x <= x1; x++) {
      const eY = y === ey - 1 || y === ey + 3, eX = x === x0 || x === x1;
      if (eY && eX) continue; // rounded corners
      g.set(x, y, eY || eX ? (y < ey + 1 ? '#ff6a78' : '#c0203a') : '#ffc0cc');
    }
    face(g, ex, ey, P, { gap: 4, mouth: stage === 2 ? null : [ex + 1, ey + 4, 4], cheeks: [ex - 1, ex - 1, ey + 3] });
    for (let y = ey - 1; y <= ey + 3; y++) for (let x = x0 + 1; x < x1; x++) { const c = g.get(x, y); if (c === WHITE) g.set(x, y, '#fff0f4'); else if (c === SHINE) g.set(x, y, '#e0203e'); }
    if (stage === 2) { // muzzle glow
      const mx = R(hx + rx + 5.4), my = R(hy + 1.6);
      g.set(mx, my, P.mouth === 'open' ? WHITE : '#ffc0d0'); if (P.mouth === 'open') onEmpty(g, [[mx + 2, my], [mx + 3, my]], '#ff4a6a');
    }
    return { hx: R(hx), hy: R(hy), hr: R(ry + 0.5), top: topOf(g), ey, hat: { x: R(hx), y: R(hy - ry), w: 9 }, front: R(hx + rx + (stage === 2 ? 6 : 0)) };
  };

  // =====================================================================================================
  // Garlic -> Stinky Garlic -> Mega Garlic
  // A white segmented bulb (C.main) with a pointy top and root feet; stage 1 green stink puffs; stage 2 a crown of cloves.
  PAL.garlic = { main: ['#ffffff', '#f0ecdc', '#c4baa0'], leaf: ['#c8f094', '#8ad04a', '#4a8a2a'], acc: ['#ecdcf6', '#c4a0dc', '#8a64a8'], stem: '#8ab04a', root: '#c8ac80', part: 'bulb' };
  const STINK = ['#f2ffc8', '#c0ec7a', '#78b048'];
  ART.garlic = function (g, stage, P, C) {
    const b = bob(P), f = P.frame ? 1 : 0;
    const rx = T(stage, 5.6, 6.4, 7.4), ry = T(stage, 5, 5.8, 7), hx = 15.5, hy = T(stage, 22, 20.6, 19.8) + b, tip = T(stage, 5.6, 6.6, 7.6);
    baseLeaves(g, 16, 27.4, P, C.leaf, T(stage, 4.5, 5, 5.5));
    feet(g, 16, P, C.root, T(stage, 2.8, 3.2, 3.6));
    if (stage >= 1) piece(g, t => { // stink puffs
      const x = hx - rx - 2.4, y = hy - 3 - f;
      t.ell(x, y, 1.7, 1.5, STINK); t.ell(x + 1.6, y - 1, 1.5, 1.4, STINK); t.ell(x + 0.6, y - 2.2, 1.4, 1.2, STINK);
      const x2 = hx + rx + 1, y2 = hy - ry - 1.6 + f;
      t.ell(x2, y2, 1.5, 1.3, STINK); t.ell(x2 - 1.4, y2 - 0.8, 1.3, 1.2, STINK); t.ell(x2 - 0.4, y2 - 1.9, 1.2, 1.1, STINK);
    });
    if (stage === 2) piece(g, t => { // crown of cloves behind the top
      for (const [a, len] of [[-2.4, 4.2], [-1.95, 5], [-1.2, 5], [-0.75, 4.2]]) { const x = hx + Math.cos(a) * 3.2, y = hy - ry + 0.8 + Math.sin(a) * 2.6; t.ell(x + Math.cos(a) * len * 0.35, y + Math.sin(a) * len * 0.35, len * 0.5, 1.5, C.main, a); }
    });
    piece(g, t => {
      t.ell(hx, hy, rx, ry, C.main[1]);
      t.poly([[hx - rx * 0.86, hy - ry * 0.4], [hx - rx * 0.5, hy - ry * 0.95], [hx - 1.3, hy - ry - tip * 0.45], [hx + 0.3, hy - ry - tip], [hx + 1.6, hy - ry - tip * 0.45], [hx + rx * 0.5, hy - ry * 0.95], [hx + rx * 0.86, hy - ry * 0.4]], C.main[1]);
      shadeAll(t, hx, hy - tip * 0.4, rx + 0.5, ry + tip * 0.55, C.main);
    });
    g.outline();
    // clove segment lines (light lilac streaks)
    const bulbPx = (x, y) => isOf(g, x, y, C.main);
    for (const s of [-1, 1]) for (const [x, y] of pathPts([[hx + s * 0.6 + 0.3, hy - ry - tip * 0.55], [hx + s * rx * 0.62, hy - ry * 0.35], [hx + s * rx * 0.66, hy + ry * 0.55]])) if (bulbPx(x, y)) g.set(x, y, mixHex(C.main[2], C.acc[1], 0.45));
    const ex = R(hx - 1.5), ey = R(hy - 1.8);
    face(g, ex, ey, P, { gap: 3, mouth: [ex, ey + 4, 5], cheeks: [ex - 1, ex + 5, ey + 3] });
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey, hat: { x: R(hx), y: R(hy - ry + 1), w: 9 } };
  };

  // =====================================================================================================
  // Snapdragon -> Dragon Snap -> Inferno Dragon
  // A dragon-headed flower: a pink snout head (C.main) with jaws, little horns and eyes, on a leafy stem.
  // Stage 1 back spikes; stage 2 a second head and a puff of fire from the front one.
  PAL.snapdragon = { main: ['#ffb8e4', '#e0609e', '#9a2e6e'], leaf: LEAF, acc: ['#fff4c0', '#f8c84a', '#c07a20'], stem: '#3f8a3a', root: '#7a5a2a', part: 'spikes' };
  const MOUTH_IN = '#5a1a3a';
  // recolour the pixels of t that fall inside a polygon (no new pixels)
  const paintIn = (t, pts, col) => { const m = new Grid(32, 32); m.poly(pts, 1); for (let i = 0; i < m.a.length; i++) if (m.a[i] && t.a[i] !== null) t.a[i] = col; };
  // a dragon head in profile facing right: round skull, long snout with a nose bump, cream underjaw, swept-back cream horns
  function dragonHead(g, x, y, s, C, P, o) {
    const open = !!o.open, drop = open ? Math.max(1, R(1.4 * s)) : 0;
    const CREAM = C.acc.map(c => lt(c, 0.25));
    if (o.spikes) piece(g, t => { // leafy frill down the back of the head
      for (const [a, len] of [[-2.0, 3.4], [-2.55, 3.8], [-3.05, 3.4], [-3.55, 2.8]]) { const r = 3.1 * s; t.poly([[x + Math.cos(a - 0.3) * r, y + Math.sin(a - 0.3) * r], [x + Math.cos(a + 0.3) * r, y + Math.sin(a + 0.3) * r], [x + Math.cos(a) * (r + len * s), y + Math.sin(a) * (r + len * s)]], LEAF[1]); }
      shadeAll(t, x - 2.5 * s, y - 2 * s, 5 * s, 5 * s, LEAF);
    });
    piece(g, t => { // two swept-back horns
      t.poly([[x - 1.6 * s, y - 2.4 * s], [x - 4.8 * s, y - 5.2 * s], [x - 0.4 * s, y - 3.3 * s]], CREAM[1]);
      t.poly([[x + 0.4 * s, y - 3 * s], [x - 1.4 * s, y - 6.4 * s], [x + 1.8 * s, y - 3 * s]], CREAM[1]);
      shadeAll(t, x - 1.6 * s, y - 4.6 * s, 3.6 * s, 2.6 * s, CREAM);
    });
    piece(g, t => { // cream underjaw (drops when the mouth opens)
      t.ell(x + 4 * s, y + 2.4 * s + drop, 3.9 * s, 1.35 * s, CREAM, -0.05);
    });
    piece(g, t => { // skull + snout + nose bump
      t.ell(x, y, 3.5 * s, 3.3 * s, C.main[1]);
      t.ell(x + 4.4 * s, y + 0.5 * s, 4.3 * s, 2 * s, C.main[1]);
      t.ell(x + 7.6 * s, y - 0.5 * s, 1.3 * s, 1.2 * s, C.main[1]);
      shadeAll(t, x + 2 * s, y - 0.2 * s, 6.6 * s, 4.2 * s, C.main);
      if (open) paintIn(t, [[x + 1.2 * s, y + 1.4 * s], [x + 9.4 * s, y + 0.9 * s], [x + 9.4 * s, y + 5 * s], [x + 1.2 * s, y + 2.6 * s]], MOUTH_IN);
    });
    return { tip: [x + 8.6 * s, y + 0.5 * s], jaw: y + 2.2 * s, open, drop, CREAM };
  }
  function dragonDetails(g, x, y, s, H, C) {
    onFill(g, [[R(x + 7.6 * s), R(y - 0.9 * s)]], C.main[2]); // nostril
    const x0 = R(x + 1.4 * s), x1 = R(H.tip[0] - 0.5), my = R(y + 1.7 * s);
    if (H.open) { // fangs along the top and bottom of the open mouth
      for (let xx = x0 + 1; xx <= x1; xx += 2) {
        for (let yy = my - 2; yy <= my + 1; yy++) if (g.get(xx, yy) === MOUTH_IN) { g.set(xx, yy, WHITE); break; }
        for (let yy = my + 4 + H.drop; yy >= my; yy--) if (g.get(xx + 1, yy) === MOUTH_IN) { g.set(xx + 1, yy, WHITE); break; }
      }
    } else { // closed: a long grinning mouth line with two fangs poking down
      for (let xx = x0; xx <= x1; xx++) if (g.filled(xx, my)) g.set(xx, my, INK);
      onFill(g, [[x0 - 1, my - 1]], INK);
      for (const fx of [R(x + 4 * s), R(x + 6.6 * s)]) onFill(g, [[fx, my + 1]], WHITE);
    }
    // scale ridge: a few lighter dots along the snout
    onFill(g, [[R(x + 3 * s), R(y - 1.2 * s)], [R(x + 5 * s), R(y - 0.9 * s)]], C.main[0]);
  }
  function dragonEye(g, x, y, P, brave) { // one big profile eye with a brow
    const e = P.eyes;
    if (e === 'happy' || e === 'closed' || e === 'blink') { g.px([[x - 1, y + 1], [x, y + 1], [x + 1, y + 1]], INK); if (e === 'happy') g.px([[x - 1, y], [x + 1, y]], INK); return; }
    // white eye with an ink rim and a pupil looking forward
    g.px([[x - 1, y], [x - 1, y + 1], [x, y + 2], [x + 1, y + 2]], INK);
    g.px([[x, y], [x + 1, y], [x, y + 1]], WHITE);
    g.px([[x + 1, y + 1], [x + 2, y + 1], [x + 2, y]], INK);
    if (brave || e === 'brave') g.px([[x - 1, y - 2], [x, y - 1], [x + 1, y - 1], [x + 2, y - 1]], INK);
    else g.px([[x, y - 1], [x + 1, y - 1]], INK);
    if (e === 'sad') g.px([[x + 2, y - 2], [x + 1, y - 1], [x, y - 1]], INK);
  }
  ART.snapdragon = function (g, stage, P, C) {
    const b = bob(P), f = P.frame ? 1 : 0;
    const s = T(stage, 1.1, 1.24, 1.34), hx = T(stage, 11.6, 11.2, 11.4), hy = T(stage, 16.2, 13.4, 12.4) + b;
    const open = P.mouth === 'open' || stage === 2;
    stemTo(g, [[15.5, 29], [16.6, 25], [hx + 1.5, hy + 3.4 * s]], C.stem, T(stage, 0.8, 0.9, 1));
    piece(g, t => { leaf(t, 15.8, 24, T(stage, 4.4, 5, 5.4), -2.6, LEAF, 0.32); leaf(t, 16.2, 22.6 - stage, T(stage, 4, 4.6, 5), -0.5, LEAF, 0.32); });
    baseLeaves(g, 16, 27.6, P, C.leaf, T(stage, 5, 6, 6.5));
    feet(g, 16, P, C.root, T(stage, 2.6, 3, 3.2));
    let H2 = null; const x2 = 5.6, y2 = 21.2, s2 = 0.78;
    if (stage === 2) { // a second, smaller head on a side stem
      stemTo(g, [[15.6, 26.5], [11, 25.4], [x2 + 1, y2 + 2.4]], C.stem, 0.8);
      H2 = dragonHead(g, x2, y2, s2, C, P, { open: P.mouth === 'open', spikes: false });
    }
    const H = dragonHead(g, hx, hy, s, C, P, { open, spikes: stage >= 1 });
    if (stage === 2) piece(g, t => { // fire breath
      const x = H.tip[0] + 0.4, y = H.jaw + 0.6;
      t.poly([[x, y - 1.4], [x + 3 + f, y - 3.4], [x + 2.6, y - 1.6], [x + 6.4 - f, y - 2.6], [x + 4.8, y - 0.4], [x + 6.8, y + 1 + f], [x + 3.6, y + 1.8], [x + 4.4 + f, y + 3.6], [x + 0.6, y + 1.6]], '#f2742a');
    });
    if (stage === 1) piece(g, t => { const x = R(H.tip[0] - 0.5), y = R(hy - 2.4 * s) - f; t.ell(x + 1, y, 1.2, 1, ['#ffffff', '#dfe4ee', '#a8b0c0']); t.ell(x + 2.6, y - 1.6, 0.9, 0.8, ['#ffffff', '#dfe4ee', '#a8b0c0']); }); // smoke puffs
    g.outline();
    if (stage === 2) { const x = R(H.tip[0] + 1.6), y = R(H.jaw + 0.6); onFill(g, [[x, y], [x + 1, y], [x + 1, y - 1], [x + 2, y], [x, y + 1], [x + 1, y + 1]], '#ffd27a'); onFill(g, [[x, y]], YEL); }
    dragonDetails(g, hx, hy, s, H, C);
    if (H2) { dragonDetails(g, x2, y2, s2, H2, C); dragonEye(g, R(x2 + 0.2), R(y2 - 1.8), P, false); }
    const ex = R(hx + 0.4), ey = R(hy - 1.9 * s);
    dragonEye(g, ex, ey, P, stage >= 1);
    // a pink cheek blush under the eye
    onFill(g, [[ex + 1, ey + 4]], '#ff9ac8');
    return { hx: R(hx + 1), hy: R(hy), hr: R(3.5 * s), top: topOf(g), ey, hat: { x: R(hx), y: R(hy - 3 * s), w: 8 }, front: R(H.tip[0]) };
  };

  // =====================================================================================================
  // Marigold -> Gold Bloom -> Golden Marigold
  // A small ruffled orange flower (two layers of little petals, C.main) round a warm face; stage 1 a sparkling coin; stage 2 golden + crown.
  PAL.marigold = { main: ['#ffd27a', '#f8962a', '#c0561c'], leaf: LEAF, acc: ['#fff6b8', '#fcd650', '#d09a28'], stem: '#3f8a3a', root: '#7a5a2a', part: 'petals', fuseLeaf: ['#ffd27a', '#f8962a', '#c0561c'] };
  ART.marigold = function (g, stage, P, C) {
    const b = bob(P), f = P.frame ? 1 : 0;
    const r = T(stage, 3.3, 3.7, 4.1), hx = 15.5, hy = T(stage, 17.2, 15, 13.6) + b;
    const M = stage === 2 ? C.main.map((c, i) => mixHex(c, GOLD[i], 0.5)) : C.main;
    stemTo(g, [[16, 29], [16, hy + 5], [hx, hy + 2]], C.stem, T(stage, 0.9, 1, 1.1));
    baseLeaves(g, 16, T(stage, 25.5, 24.5, 24), P, C.leaf, T(stage, 5, 6, 6.5));
    feet(g, 16, P, C.root, 3);
    if (stage >= 1) { // a coin on a little side stem
      const cx = T(stage, 0, 24.6, 25), cy = T(stage, 0, 20.4, 18.6) - f * 0.5;
      piece(g, t => t.ell(cx, cy, 2.2, 2.4, GOLD));
    }
    const n1 = T(stage, 14, 15, 16), n2 = T(stage, 11, 12, 12), sp = f ? 0.12 : 0;
    piece(g, t => { for (let i = 0; i < n1; i++) { const a = i * Math.PI * 2 / n1 + sp; t.ell(hx + Math.cos(a) * (r + 1.9), hy + Math.sin(a) * (r + 1.9), 1.6, 1.4, [M[1], M[1], M[2]], a); } });
    piece(g, t => { for (let i = 0; i < n2; i++) { const a = i * Math.PI * 2 / n2 + 0.3 - sp; t.ell(hx + Math.cos(a) * (r + 0.6), hy + Math.sin(a) * (r + 0.6), 1.5, 1.3, [M[0], M[0], M[1]], a); } });
    piece(g, t => t.ell(hx, hy, r, r * 0.95, C.acc));
    if (stage === 2) piece(g, t => crown(t, hx, hy - r - 1, 3.2, 3.6, CROWN));
    g.outline();
    if (stage >= 1) { const cx = R(T(stage, 0, 24.6, 25)), cy = R(T(stage, 0, 20.4, 18.6) - f * 0.5); onFill(g, [[cx, cy - 1], [cx, cy], [cx, cy + 1]], GOLD[2]); sparkle(g, cx + 3, cy - 3); }
    if (stage === 2) { jewels(g, hx, hy - r - 1, 3.2); sparkle(g, R(hx - r - 4), R(hy - r - 1)); }
    const ex = R(hx - 2), ey = R(hy - 2);
    face(g, ex, ey, P, { gap: 3, mouth: [ex, ey + 4, 5], cheeks: [ex - 1, ex + 5, ey + 3] });
    return { hx: R(hx), hy: R(hy), hr: R(r + 1), top: topOf(g), ey, hat: { x: R(hx), y: R(hy - r - 1), w: 8 } };
  };

  // =====================================================================================================
  // Pumpkin -> Jack-o'-Lantern -> Pumpkin King
  // A ridged orange pumpkin (C.main) with a green stem; a cute face at stage 0, a glowing carved face from stage 1
  // (the eyes pose changes the carved shapes); stage 2 a crown and curly vines.
  PAL.pumpkin = { main: ['#ffc070', '#f7862a', '#b84a18'], leaf: LEAF, acc: GLOW, stem: '#4a7a2a', root: '#7a5a2a', part: 'pumpkin' };
  const CARVE_EYES = {
    up: [[2, 0], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2]],
    down: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [1, 1], [2, 1], [3, 1], [2, 2]],
    happy: [[1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [3, 1], [4, 1], [0, 2], [4, 2]],
    closed: [[0, 1], [4, 1], [1, 2], [2, 2], [3, 2]],
    slit: [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2]],
  };
  const CARVE_MOUTH = {
    grin: [[0, 0], [1, 0], [8, 0], [7, 0], [0, 1], [1, 1], [2, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [1, 2], [2, 2], [3, 2], [4, 2], [6, 2], [7, 2], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3]],
    open: [[2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3]],
    o: [[3, 1], [4, 1], [5, 1], [3, 2], [4, 2], [5, 2]],
    flat: [[1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2]],
  };
  function carve(g, x, y, pts, f) {
    const set = new Set(pts.map(([a, b]) => a + ',' + b));
    for (const [a, b] of pts) g.set(x + a, y + b, set.has(a + ',' + (b - 1)) ? (f ? '#fffbd0' : YEL) : '#e89a20');
  }
  ART.pumpkin = function (g, stage, P, C) {
    const b = bob(P), f = P.frame ? 1 : 0;
    const w = T(stage, 6.8, 7.8, 8.8), h = T(stage, 5.2, 7, 8.2), hx = 16, hy = 27.6 - h + b;
    feet(g, 16, P, C.root, T(stage, 3, 3.4, 3.8));
    baseLeaves(g, 16, 26.6, P, C.leaf, T(stage, 5, 5.5, 6));
    if (stage === 2) piece(g, t => { for (const s of [-1, 1]) leaf(t, hx + s * (w - 1.5), hy + h * 0.55, 4.4, s > 0 ? -0.35 : Math.PI + 0.35, C.leaf, 0.42); });
    // stem + leaf
    piece(g, t => { stroke(t, [[hx, hy - h + 1.5], [hx + 0.3, hy - h - 1.6], [hx + 1.8, hy - h - T(stage, 3, 3.6, 3.6)]], T(stage, 1.2, 1.3, 1.4), 0.8, C.stem); shadeAll(t, hx, hy - h - 1, 2.5, 3, [lt(C.stem, 0.3), C.stem, dk(C.stem, 0.35)]); });
    piece(g, t => leaf(t, hx - 0.5, hy - h + 0.6, T(stage, 4.6, 5.2, 5.6), -2.75, C.leaf, 0.36));
    piece(g, t => {
      t.ell(hx - w * 0.6, hy + 0.3, w * 0.42, h * 0.9, C.main); t.ell(hx + w * 0.6, hy + 0.3, w * 0.42, h * 0.9, C.main);
      t.ell(hx - w * 0.3, hy, w * 0.45, h, C.main); t.ell(hx + w * 0.3, hy, w * 0.45, h, C.main);
      t.ell(hx, hy - 0.2, w * 0.36, h * 1.02, C.main);
    });
    if (stage === 2) piece(g, t => crown(t, hx - 0.5, hy - h + 1.6, 4, 4.2, CROWN));
    g.outline();
    // ridges
    const body = (x, y) => isOf(g, x, y, C.main);
    const fy = R(hy - 1.6);
    for (const dx of [-0.2, 0.2, -0.56, 0.56]) for (let y = R(hy - h + 1.5); y <= R(hy + h - 1.5); y++) {
      if (stage === 0 && Math.abs(dx) < 0.3 && y >= fy - 1 && y <= fy + 5) continue; // keep the cute face clear
      const k = (y - hy) / h, x = R(hx + dx * w * (1 - 0.15 * k * k)); if (body(x, y)) g.set(x, y, C.main[2]);
    }
    if (stage === 2) {
      jewels(g, hx - 0.5, hy - h + 1.6, 4);
      for (const s of [-1, 1]) { // curly vine tendrils (thin, drawn after the outline)
        const pts = [], cx = hx + s * (w + 2.6), cy = hy - h * 0.15;
        for (let i = 0; i <= 14; i++) { const k = i / 14, a = Math.PI / 2 + s * (Math.PI * 0.5 + k * Math.PI * 2.3), rr = 2.6 * (1 - k * 0.65); pts.push([cx + Math.cos(a) * rr * s * -1, cy + Math.sin(a) * rr]); }
        onEmpty(g, pathPts([[hx + s * (w + 1), hy + h * 0.45]].concat(pts)), C.leaf[2]);
      }
    }
    if (stage === 0) {
      const ex = R(hx - 2), ey = R(hy - 1.6);
      face(g, ex, ey, P, { gap: 4, mouth: [ex + 1, ey + 4, 4], cheeks: [ex - 1, ex + 6, ey + 3] });
      return { hx: R(hx), hy: R(hy), hr: R(h), top: topOf(g), ey, hat: { x: R(hx), y: R(hy - h + 1), w: 9 } };
    }
    const e = P.eyes, ey = R(hy - h * 0.45), ex = R(hx - 5.5);
    const shape = e === 'happy' ? 'happy' : e === 'closed' ? 'closed' : e === 'blink' || e === 'sleepy' ? 'slit' : e === 'sad' ? 'down' : 'up';
    carve(g, ex, ey, CARVE_EYES[shape], f); carve(g, ex + 6, ey, CARVE_EYES[shape], f);
    if (e === 'brave') { g.px([[ex, ey - 1], [ex + 1, ey - 1], [ex + 10, ey - 1], [ex + 9, ey - 1]], dk(C.main[2], 0.3)); }
    const m = P.mouth, ms = m === 'open' ? 'open' : m === 'o' ? 'o' : m === 'flat' ? 'flat' : 'grin';
    carve(g, R(hx - 4), ey + 4, CARVE_MOUTH[ms], f);
    return { hx: R(hx), hy: R(hy), hr: R(h), top: topOf(g), ey, hat: { x: R(hx), y: R(hy - h + 1), w: 9 } };
  };

  // =====================================================================================================
  // Coconut Cannon -> Coco Mortar -> Coco Battleship
  // A coconut shell (C.main) cannon pointing right on a nest of palm leaves, the face on the round breech;
  // stage 1 a bigger mortar aimed up; stage 2 two barrels and a captain hat.
  PAL.coconut = { main: ['#dca878', '#a46a40', '#643a22'], leaf: ['#b4ec70', '#5cb43a', '#2f7a4a'], acc: ['#fff6e0', '#e8d6b0', '#b09870'], stem: '#3f8a3a', root: '#7a5a2a', part: 'shell' };
  function barrel(g, x, y, ang, len, r, C) {
    const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
    piece(g, t => { stroke(t, [[x, y], [ex, ey]], r, r, C.main[1]); shadeAll(t, (x + ex) / 2, (y + ey) / 2, len / 2 + r + 1, r + 1.6, C.main, ang); });
    const bx = x + Math.cos(ang) * len * 0.62, by = y + Math.sin(ang) * len * 0.62;
    piece(g, t => t.ell(bx, by, 1, r + 0.3, [C.main[0], C.main[1], C.main[2]], ang));
    piece(g, t => t.ell(ex, ey, 1.6, r + 0.6, C.acc, ang));
    return [ex, ey];
  }
  ART.coconut = function (g, stage, P, C) {
    const b = bob(P);
    const cr = T(stage, 5, 5.8, 6.5), cx = T(stage, 12.5, 12.5, 11.8), cy = T(stage, 20, 19.4, 19) + b, f = P.frame ? 1 : 0;
    feet(g, 15, P, C.root, T(stage, 3, 3.4, 3.6));
    // palm-leaf nest
    piece(g, t => { for (const [a, L] of [[-2.7, 7], [-0.35, 7.5], [-2.95, 5.5], [-0.15, 6]]) leaf(t, 15, 27.2, L, a, C.leaf, 0.24); });
    baseLeaves(g, 15, 27, P, C.leaf, T(stage, 5.5, 6, 6.5));
    // palm tuft on the head (behind)
    if (stage === 2) { // battleship mast + pennant (behind)
      const x = cx - 3.6;
      piece(g, t => { t.rect(R(x), 5, 1, R(cy - 5), '#8f563b'); t.poly([[x, 4.6], [x - 5.5 + f, 6 + f * 0.5], [x, 7.6]], '#e0303e'); });
    }
    if (stage < 2) piece(g, t => { const x = cx - 1, y = cy - cr + 1; leaf(t, x, y, 4.6, -2.2, C.leaf, 0.3); leaf(t, x, y, 4.2, -1.3, C.leaf, 0.3); leaf(t, x - 0.5, y, 3.6, -2.9, C.leaf, 0.3); });
    const bars = stage === 2 ? [[cx + 1.4, cy - 2.8, -0.5, 11.6, 2.5], [cx + 1.4, cy + 2.4, 0, 12.4, 2.5]] : [[cx + 1, cy - 0.6, T(stage, -0.2, -0.72, 0), T(stage, 10.8, 10.2, 0), T(stage, 2.6, 3.2, 0)]];
    const ends = bars.map(([x, y, a, l, r]) => barrel(g, x, y, a, l, r, C));
    piece(g, t => t.ell(cx, cy, cr, cr * 0.95, C.main));
    if (stage === 2) { // captain hat
      const x = cx - 0.5, y = cy - cr + 1.6;
      piece(g, t => { t.ell(x, y - 1.4, 4.4, 2.2, ['#ffffff', '#eef2fa', '#a8b4c8']); t.rect(R(x - 4), R(y - 1), 8, 2, '#2e3a78'); });
      piece(g, t => t.ell(x + 3.4, y + 1.3, 3, 0.9, '#222034'));
    }
    g.outline();
    // muzzle holes
    for (const [x, y] of ends) { const X = R(x), Y = R(y); onFill(g, [[X, Y], [X, Y - 1], [X, Y + 1]], '#3a2216'); if (P.mouth === 'open') onFill(g, [[X, Y]], '#fff6e0'); }
    // coconut fibre
    for (const [dx, dy] of [[-3, 2], [-1, 3], [2, 3], [-4, -1], [3, -2]]) { const x = R(cx + dx), y = R(cy + dy); if (isOf(g, x, y, C.main)) { g.set(x, y, C.main[2]); if (isOf(g, x + 1, y - 1, C.main)) g.set(x + 1, y - 1, C.main[2]); } }
    if (stage === 2) { const x = R(cx - 0.5), y = R(cy - cr + 1.6); onFill(g, [[x, y - 1], [x, y]], '#f6c83a'); }
    const ex = R(cx - 2.5), ey = R(cy - 1.2);
    face(g, ex, ey, P, { gap: 3, mouth: [ex, ey + 4, 5], cheeks: [ex - 1, ex + 5, ey + 3] });
    return { hx: R(cx), hy: R(cy), hr: R(cr), top: topOf(g), ey, hat: { x: R(cx - 0.5), y: R(cy - cr + 1.2), w: 9 }, front: R(Math.max(...ends.map(e => e[0]))) };
  };

  // =====================================================================================================
  // Bloomerang -> Double Bloomerang -> Mega Bloomerang
  // A flower whose petals are a V-shaped boomerang (C.main) behind a warm face; stage 1 two boomerangs; stage 2 big with a gold rim.
  PAL.bloomerang = { main: ['#ffd08a', '#ec9440', '#a8562a'], leaf: LEAF, acc: ['#fff8d8', '#fcd890', '#d0a050'], stem: '#3f8a3a', root: '#7a5a2a', part: 'boomerang' };
  function boomerang(g, x, y, arm, ang, wid, ramp) {
    piece(g, t => {
      for (const s of [-1, 1]) { const a = ang + s * 0.8; stroke(t, [[x, y], [x + Math.cos(a) * arm * 0.6, y + Math.sin(a) * arm * 0.6], [x + Math.cos(a + s * 0.06) * arm, y + Math.sin(a + s * 0.06) * arm]], wid, wid * 0.85, ramp[1]); }
      shadeAll(t, x + Math.cos(ang) * arm * 0.35, y + Math.sin(ang) * arm * 0.35, arm + 1, arm * 0.8 + 1, ramp);
    });
  }
  ART.bloomerang = function (g, stage, P, C) {
    const b = bob(P), f = P.frame ? 1 : 0;
    const r = T(stage, 3, 3.3, 3.8), hx = 15.5, hy = T(stage, 15.4, 12.4, 11.4) + b, arm = T(stage, 9, 9.8, 11), wid = T(stage, 1.7, 1.8, 2.2);
    stemTo(g, [[16, 29], [16, hy + 5], [hx, hy + 2]], C.stem, T(stage, 0.9, 1, 1.1));
    piece(g, t => { leaf(t, 16, 23 - stage * 0.5, T(stage, 4, 4.6, 5), -0.55, C.leaf, 0.32); });
    baseLeaves(g, 16, T(stage, 26, 25.5, 25), P, C.leaf, T(stage, 5, 6, 6.5));
    feet(g, 16, P, C.root, 3);
    const tilt = f ? 0.1 : 0;
    if (stage >= 1) boomerang(g, hx, hy - r - 0.6, arm * 0.85, Math.PI / 2 - tilt, wid * 0.9, C.main.map(c => dk(c, 0.14)));
    boomerang(g, hx, hy + r + 1, arm, -Math.PI / 2 + tilt, wid, C.main);
    piece(g, t => t.ell(hx, hy, r, r * 0.95, C.acc));
    g.outline();
    if (stage === 2) { // gold rim along the petal edges
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
        if (!isOf(g, x, y, C.main)) continue;
        if ([[0, -1], [-1, 0], [1, 0]].some(([dx, dy]) => g.get(x + dx, y + dy) === INK) && y < hy - 1) g.set(x, y, (x + y) % 3 ? '#ffd23a' : '#fffbd0');
      }
    }
    const ex = R(hx - 2), ey = R(hy - 2);
    face(g, ex, ey, P, { gap: 3, mouth: [ex, ey + 4, 5], cheeks: [ex - 1, ex + 5, ey + 3] });
    return { hx: R(hx), hy: R(hy), hr: R(r + 1), top: topOf(g), ey, hat: { x: R(hx), y: R(hy - r + 0.5), w: 8 } };
  };

  // =====================================================================================================
  // Electric Blueberry -> Shock Berry -> Thunder Berry
  // A round blue berry (C.main) with a crown-shaped calyx and sparks; stage 1 a cluster of berries; stage 2 a lightning-bolt halo.
  PAL.blueberry = { main: ['#a4bcff', '#4a5ae0', '#2a2c8e'], leaf: LEAF, acc: GLOW, stem: '#3f8a3a', root: '#7a5a2a', part: 'berry' };
  function berry(g, x, y, r, C) {
    piece(g, t => t.ell(x, y, r, r * 0.95, C.main));
    const k = r / 5;
    piece(g, t => t.poly([[x - 2.4 * k - 0.4, y - r + 1.3], [x - 2.6 * k - 0.6, y - r - 1.2 * k - 0.6], [x - 1.1 * k, y - r + 0.2], [x + 0.2, y - r - 1.8 * k - 0.6], [x + 1.4 * k, y - r + 0.2], [x + 2.8 * k + 0.6, y - r - 1.2 * k - 0.6], [x + 2.6 * k + 0.4, y - r + 1.3]], mixHex(C.main[1], '#7a3aa8', 0.45)));
  }
  ART.blueberry = function (g, stage, P, C) {
    const b = bob(P), f = P.frame ? 1 : 0;
    const r = T(stage, 5, 5.4, 5.8), hx = T(stage, 15.5, 16.5, 16), hy = T(stage, 18, 14.8, 16) + b;
    stemTo(g, [[16, 29], [16, hy + r + 1], [hx, hy + r - 1]], C.stem, T(stage, 0.9, 1, 1));
    baseLeaves(g, 16, 27.2, P, C.leaf, T(stage, 5, 6, 6.5));
    feet(g, 16, P, C.root, 3);
    if (stage === 2) { // lightning halo: a glowing ring with bolts at its ends
      const y = hy - r - 2.6 - f * 0.4;
      piece(g, t => { t.ell(hx + 0.3, y, 5.6, 1.7, GLOW); t.ell(hx + 0.3, y, 3.6, 0.7, null); bolt(t, hx - 6.6, y - 0.6, 0.5, YEL, -0.5); bolt(t, hx + 5.6, y - 1, 0.5, YEL, 0.5); });
    }
    if (stage >= 1) { // the cluster
      stemTo(g, [[16, 25], [12, 22], [10, 20.5]], C.stem, 0.7);
      berry(g, 9.4, 19.4, 2.9, C);
      stemTo(g, [[15, 24], [12.5, 17], [11.6, 13.5]], C.stem, 0.6);
      berry(g, T(stage, 0, 10.6, 9.8), T(stage, 0, 12.4, 12), 2.5, C);
    }
    berry(g, hx, hy, r, C);
    g.outline();
    // dusty bloom glints
    for (const [dx, dy] of [[-0.5, -0.45], [-0.62, -0.2]]) onFill(g, [[R(hx + dx * r), R(hy + dy * r)]], lt(C.main[0], 0.5));
    // sparks
    const sp = f ? [[hx + r + 2, hy - 2], [hx - r - 2, hy + 3]] : [[hx + r + 1.5, hy + 2], [hx - r - 1.5, hy - 2]];
    if (stage < 2) for (const [x, y] of sp) sparkle(g, R(x), R(y));
    const ex = R(hx - 1.5), ey = R(hy - 1.8);
    face(g, ex, ey, P, { gap: 4, mouth: [ex + 1, ey + 4, 4], cheeks: [ex - 1, ex + 6, ey + 3] });
    return { hx: R(hx), hy: R(hy), hr: R(r), top: topOf(g), ey, hat: { x: R(hx), y: R(hy - r + 1), w: 9 } };
  };

  // =====================================================================================================
  // Infi-nut -> Infi-Shield -> Infi-Fortress
  // A futuristic nut (C.main) segmented into glowing hexagons, with a dark visor and glowing eyes; stage 1 energy shield arcs;
  // stage 2 a tall fortress shape with battlements and an antenna.
  PAL.infinut = { main: ['#b8c8ff', '#6a72e8', '#3a3a9e'], leaf: ['#a8ecff', '#4ab4e0', '#2a6aa8'], acc: ['#e8ffff', '#7af0ff', '#2ab0d8'], stem: '#2a6aa8', root: '#4a4a7a', part: 'shell' };
  function hexLines(g, own, s, ox, oy, col) {
    const w = s * Math.sqrt(3), hh = s * 1.5;
    const cell = (x, y) => {
      let best = 1e9, id = 0; const j0 = Math.floor((y - oy) / hh);
      for (let j = j0 - 1; j <= j0 + 2; j++) { const off = (j & 1) ? w / 2 : 0, i0 = Math.floor((x - ox - off) / w); for (let i = i0 - 1; i <= i0 + 2; i++) { const d = (x - ox - off - i * w) ** 2 + (y - oy - j * hh) ** 2; if (d < best) { best = d; id = j * 1000 + i; } } }
      return id;
    };
    const hit = [];
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { if (!own(x, y)) continue; const c = cell(x + 0.5, y + 0.5); if (cell(x + 1.5, y + 0.5) !== c || cell(x + 0.5, y + 1.5) !== c) hit.push([x, y]); }
    for (const [x, y] of hit) g.set(x, y, col);
  }
  ART.infinut = function (g, stage, P, C) {
    const b = bob(P), f = P.frame ? 1 : 0;
    const rx = T(stage, 6, 6.8, 7.4), ry = T(stage, 8, 9.4, 8.2), hx = 16, hy = T(stage, 19.8, 17.8, 19.6) + b;
    baseLeaves(g, 16, 27.4, P, C.leaf, T(stage, 4.5, 5, 5.5));
    feet(g, 16, P, C.root, T(stage, 3, 3.4, 3.8));
    if (stage === 2) { // antenna
      stemTo(g, [[hx + 0.5, hy - ry - 1], [hx + 0.5, 6.6]], '#5e6a80', 0.5);
      piece(g, t => t.ell(hx + 0.5, 6, 1.2, 1.2, f ? ['#ffffff', '#ff6a80', '#b0183e'] : C.acc));
    }
    if (stage === 1) piece(g, t => { // shield arcs
      for (const s of [-1, 1]) { const pts = []; for (let i = 0; i <= 10; i++) { const a = (i / 10 - 0.5) * 1.9; pts.push([hx + s * Math.cos(a) * (rx + 2.6 + f * 0.4), hy + Math.sin(a) * (ry + 0.6)]); } stroke(t, pts, 0.55, 0.55, C.acc[1]); }
    });
    const body = new Grid(32, 32);
    if (stage === 2) { // fortress: rounded base + square tower + battlements
      body.ell(hx, hy + 1.2, rx, ry - 1.2, C.main[1]);
      body.rect(R(hx - rx + 1), R(hy - ry + 1), R(2 * rx - 2), R(ry), C.main[1]);
      const yb = R(hy - ry - 1.6);
      for (const [x, w] of [[R(hx - rx + 1), 3], [R(hx - 2), 4], [R(hx + rx - 4), 3]]) body.rect(x, yb, w, 3, C.main[1]);
      shadeAll(body, hx, hy - 1, rx + 1, ry + 2, C.main);
    } else body.ell(hx, hy, rx, ry, C.main);
    body.outline(); g.merge(body);
    g.outline();
    const own = (x, y) => body.filled(x, y) && g.get(x, y) === body.get(x, y);
    hexLines(g, own, T(stage, 2.6, 2.8, 2.9), hx + 0.5, hy - 0.5, lt(C.main[0], 0.45));
    // visor with glowing eyes
    const ex = R(hx - 1.5), ey = R(hy - T(stage, 2.6, 3, 4.6));
    const vx0 = R(hx - rx + 1), vx1 = R(hx + rx - 1);
    for (let y = ey - 1; y <= ey + 3; y++) for (let x = vx0; x <= vx1; x++) if (own(x, y) || g.get(x, y) === lt(C.main[0], 0.45)) g.set(x, y, y === ey - 1 ? '#4a4a8e' : '#26244e');
    const tmp = new Grid(32, 32);
    face(tmp, ex, ey, P, { gap: 4 });
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const c = tmp.get(x, y); if (!c) continue;
      const inV = y >= ey - 1 && y <= ey + 3 && x >= vx0 && x <= vx1;
      g.set(x, y, !inV ? c : c === INK ? C.acc[1] : c === WHITE ? WHITE : C.acc[0]);
    }
    mouth(g, ex + 1, ey + 5, 4, P.mouth);
    return { hx, hy: R(hy), hr: R(rx), top: topOf(g), ey, hat: stage === 2 ? { x: hx, y: R(hy - ry - 0.6), w: 10 } : { x: hx, y: R(hy - ry + 1.5), w: 9 } };
  };
})();
