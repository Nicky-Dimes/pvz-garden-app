// art-plants3.js — PVZ Garden plant species art, batch 3 (see docs/pvz-art-guide.md and the SPECIES ART CONTRACT in art-core.js).
// Magnet-shroom, Hypno-shroom, Doom-shroom, Iceberg Lettuce, Bonk Choy, Lightning Reed, Laser Bean, Garlic, Snapdragon,
// Marigold, Pumpkin, Coconut Cannon, Bloomerang, Electric Blueberry, Infi-nut.
// TRUE chibi (docs/chibi-reference.js): the head IS the character (half-width about 8 / 9 / 10 by stage, bottom near row 26),
// each with its own silhouette built from 2-3 overlapping shapes; big glossy eyes set low and wide; a tiny mouth or none;
// soft blush; flat pastel fills with one soft lower-right shade and a small highlight; little base leaves, a mushroom foot or
// a projector base underneath (rows 27-30). The core adds the bold outer line. Art faces RIGHT on a 32x32 grid.
(function () {
  'use strict';
  const { INK, stroke, starPts, Grid } = PX;
  const A = PX.art, piece = A.piece, mixHex = A.mixHex;
  const ART = PX.PLANT_ART, PAL = PX.PLANT_PAL;
  const T = (stage, a, b, c) => (stage === 2 ? c : stage === 1 ? b : a); // pick a value per stage
  const R = Math.round;
  const WHITE = '#ffffff', EYE = A.EYE_INK || '#2b2129';
  const flat = Rm => [Rm[1], Rm[1], Rm[2]]; // flat fill + one soft shade (small parts)
  const LEAF = ['#dcf7b4', '#9edb78', '#6fb85e'];
  const GOLD = ['#fff6c8', '#ffd66e', '#e2a84a'], SILVER = ['#ffffff', '#eceef4', '#bcc3d2'], METAL = ['#f4f6fb', '#c9cfdc', '#959db0'];
  const CROWN = ['#fff6c8', '#ffd25a', '#e8a63e'], SPARK = ['#fffbe0', '#fff07a', '#f2c84a'], FIRE = ['#fff2b0', '#ffb45e', '#f2804a'];
  const BLUSH = '#ffb3c2';
  // whole-plant motion: the plant hops on walk frame 1 and gives a little hop when it cheers
  const hopOf = P => (P.walk && P.frame ? -1.5 : P.arms === 'up' ? -1 : 0);
  // the mad plants (Doom-shroom, Coconut Cannon) stay mad unless they blink, sleep or are sad
  const madMood = e => (e === 'sad' || e === 'blink' || e === 'closed' || e === 'sleepy' ? e : 'mad');
  const madMouth = m => (m === 'open' || m === 'grin' ? 'grin' : m === 'o' ? 'o' : 'frown');
  const plain = (C, id) => C.main === PAL[id].main; // true when no element has recoloured the plant
  const topOf = g => { for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.get(x, y)) return y; return 0; };

  // ---------------- soft chibi shapes ----------------
  // a shape part: ['e', cx, cy, rx, ry, rot] ellipse | ['p', pts] polygon | ['s', pts, r0, r1] thick stroke
  function mark(m, p, col) {
    if (p[0] === 'e') m.ell(p[1], p[2], p[3], p[4], col, p[5] || 0);
    else if (p[0] === 'p') m.poly(p[1], col);
    else if (p[0] === 's') stroke(m, p[1], p[2], p[3] == null ? p[2] : p[3], col);
  }
  // blob(t, parts, ramp, o): the union of the parts filled flat ramp[1], with a soft ramp[2] crescent along its lower-right edge
  // (pixels whose down-right neighbour is outside the shape) and an optional small ramp[0] highlight. o.cut = parts to
  // subtract, o.shade = crescent depth in art px, o.hl = [cx, cy, rx, ry] of the body the highlight belongs to. Returns the mask.
  function blob(t, parts, Rm, o) {
    o = o || {};
    const m = new Grid(t.w, t.h, t.k), K = t.k, W = m.fw, H = m.fh;
    for (const p of parts) mark(m, p, 1);
    if (o.cut) for (const p of o.cut) mark(m, p, null);
    const d = o.shade == null ? 1.3 : o.shade, ox = Math.max(1, R(d * K)), oy = Math.max(1, R(d * 1.15 * K));
    for (let fy = 0; fy < H; fy++) for (let fx = 0; fx < W; fx++) if (m.a[fy * W + fx] !== null) t.fset(fx, fy, m.fget(fx + ox, fy + oy) === null ? Rm[2] : Rm[1]);
    if (o.hl) { const [x, y, rx, ry] = o.hl, inside = (a, b) => m.get(a, b) !== null; inside.fine = true; t.ell(x - rx * 0.4, y - ry * 0.48, Math.max(0.6, rx * 0.24), Math.max(0.45, ry * 0.14), Rm[0], -0.55, inside); }
    return m;
  }
  const inMask = m => { const f = (x, y) => m.get(x, y) !== null; f.fine = true; return f; };
  // two little round base leaves (rows 27-30); they lift a touch when the plant cheers
  function baseLeaves(g, C, P, o) {
    o = o || {};
    const cx = o.cx == null ? 15.4 : o.cx, sp = o.sp == null ? 4.2 : o.sp, rx = o.rx || 4.4, y = o.y || 28.7, up = P.arms === 'up' ? 0.3 : 0;
    piece(g, t => { t.ell(cx - sp, y - up, rx, 1.9, flat(C.leaf), -0.22 - up); t.ell(cx + sp, y - up, rx, 1.9, flat(C.leaf), 0.22 + up); });
  }
  const tinyStem = (g, C, x, y1) => piece(g, t => stroke(t, [[x + 0.2, 28.6], [x, y1]], 0.95, 0.95, C.stem));
  const star4 = (t, x, y, s, col) => t.poly(starPts(x, y, s, s * 0.4, 4), col);
  const boltPts = (x, y, s) => [[x, y], [x + 2.6 * s, y], [x + 1.2 * s, y + 2.4 * s], [x + 3 * s, y + 2.4 * s], [x - 0.4 * s, y + 6.2 * s], [x + 0.5 * s, y + 3.4 * s], [x - 1.2 * s, y + 3.4 * s]];
  const rot = (cx, cy, a) => ([x, y]) => { const c = Math.cos(a), s = Math.sin(a), dx = x - cx, dy = y - cy; return [cx + dx * c - dy * s, cy + dx * s + dy * c]; };
  const bolt = (t, x, y, s, col, a) => t.poly(a ? boltPts(x, y, s).map(rot(x + s, y + 3 * s, a)) : boltPts(x, y, s), col || SPARK[1]);
  const crownPts = (x, y, w, h) => [[x - w, y + 0.6], [x - w, y - h + 0.8], [x - w / 2, y - h * 0.38], [x, y - h], [x + w / 2, y - h * 0.38], [x + w, y - h + 0.8], [x + w, y + 0.6]];
  function crown(g, x, y, w, h) { // a chunky gold crown, bottom centre (x, y), with three jewels
    piece(g, t => blob(t, [['p', crownPts(x, y, w, h)]], CROWN, { shade: 0.7 }));
    piece(g, t => { t.ell(x, y - h * 0.32, 0.75, 0.75, '#ff7a8a'); t.ell(x - w * 0.62, y - h * 0.12, 0.6, 0.6, '#7ad4f6'); t.ell(x + w * 0.62, y - h * 0.12, 0.6, 0.6, '#7ad4f6'); });
  }
  // the standard friendly eyes (art director v3): fr = the face radius
  const eyesFor = (g, ex, ey, fr, P, o) => A.chibiEyes(g, ex, ey, Object.assign({ sp: fr * 0.86, w: fr * 0.48, h: fr * 0.64, mood: P.eyes }, o || {}));
  const blush = (g, x, y, sp, o) => A.blush(g, x, y, Object.assign({ sp }, o || {}));
  // brows for custom eyes (left / right eye centre, eye half-size): 'brave' slants down to the middle, 'sad' up
  function brows(g, xs, cy, rx, ry, mood) {
    if (mood !== 'brave' && mood !== 'sad' && mood !== 'mad') return;
    const th = Math.max(0.42, rx * 0.3), by = cy - ry - 0.9;
    xs.forEach((ex, i) => {
      const s = xs.length > 1 && i === 0 ? 1 : -1;
      const pts = mood === 'sad' ? [[ex - s * rx, by + 0.6], [ex + s * rx * 0.9, by - 0.4]] : [[ex - s * rx * 1.05, by - 0.4], [ex + s * rx * 0.95, by + (mood === 'mad' ? 1.1 : 0.6)]];
      stroke(g, pts, mood === 'mad' ? th * 1.5 : th, mood === 'mad' ? th * 1.5 : th, INK);
    });
  }

  // =====================================================================================================
  // Magnet-shroom -> Gold Magnet -> Mega Magnet
  // A plump lilac mushroom stalk (the face) flaring into its foot, with a big horseshoe magnet (C.main, arms up, silver tips)
  // sitting on its head like a cap. Stage 1 the magnet turns gold; stage 2 it is huge and crackles.
  PAL.magnetshroom = { main: ['#ffd0d0', '#f48a90', '#d8646e'], leaf: LEAF, acc: ['#fdf8ff', '#e8dcfa', '#c6b4e8'], stem: '#6fb85e', root: '#7a5a2a', part: 'magnet' };
  // the horseshoe magnet: a chunky U (arms up, flat ends) with silver tips. cx = centre, by = outer bottom, ro / ri = outer /
  // inner radius of the bend, h = height from the bottom to the arm tops
  function magnetU(g, cx, by, ro, ri, h, body) {
    const cy = by - ro, ty = by - h, U = [[cx - ro, ty]];
    for (let i = 0; i <= 16; i++) { const an = Math.PI - i * Math.PI / 16; U.push([cx + Math.cos(an) * ro, cy + Math.sin(an) * ro]); }
    U.push([cx + ro, ty], [cx + ri, ty]);
    for (let i = 0; i <= 16; i++) { const an = i * Math.PI / 16; U.push([cx + Math.cos(an) * ri, cy + Math.sin(an) * ri]); }
    U.push([cx - ri, ty]);
    piece(g, t => blob(t, [['p', U]], body, { shade: (ro - ri) * 0.32 }));
    const th = Math.max(1.6, (ro - ri) * 0.62); // silver tips
    piece(g, t => { for (const s of [-1, 1]) blob(t, [['p', [[cx + s * ri, ty], [cx + s * ro, ty], [cx + s * ro, ty + th], [cx + s * ri, ty + th]]]], SILVER, { shade: 0.5 }); });
    // shines: a soft streak down the outside of the left arm, glints on the tips
    stroke(g, [[cx - ro + (ro - ri) * 0.3, ty + th + 1], [cx - ro + (ro - ri) * 0.3, cy + 0.2]], 0.32, 0.32, body[0]);
    for (const s of [-1, 1]) g.dots([[cx + s * (ri + ro) / 2 - (ro - ri) * 0.25, ty + 0.6], [cx + s * (ri + ro) / 2 - (ro - ri) * 0.25 + 0.5, ty + 0.6]], WHITE);
    return { tl: [cx - (ro + ri) / 2, ty], tr: [cx + (ro + ri) / 2, ty] };
  }
  // a mushroom stalk: a plump barrel (the face lives here) flaring a little into its foot on the ground (rows 27-30)
  function stalk(g, hx, top, w, Rm, hop) {
    const bot = 27 + hop, cy = (top + bot) / 2, h = (bot - top) / 2;
    piece(g, t => blob(t, [['e', hx, cy, w, h], ['e', hx, cy + h * 0.3, w * 1.06, h * 0.72], ['e', hx, 28.4 + hop, w + 0.9, 1.9]], Rm));
    return { cy, h, bot };
  }
  ART.magnetshroom = function (g, stage, P, C) {
    const r = T(stage, 8, 9, 10), hop = hopOf(P), f = P.frame ? 1 : 0;
    const rx = r * 0.86, ry = r * 0.8, hx = 15.6, hy = 26.8 - ry + hop, top = hy - ry;
    // the stalk body (a small fuller bulge low at the back) + its flared foot, one shape so there's no seam
    piece(g, t => blob(t, [['e', hx, hy, rx, ry], ['e', hx - rx * 0.1, hy + ry * 0.3, rx * 0.96, ry * 0.7], ['e', hx, 28.4 + hop, rx + 0.6, 1.9]], C.acc, { hl: [hx, hy, rx, ry] }));
    // the magnet cap: a big U whose bottom sinks into the top of the head
    const ro = rx * 0.9, ri = ro * 0.42, h = T(stage, 8.2, 9, 8.8), by = top + 2.6;
    // stage 0 red; from stage 1 (Gold Magnet) it's gold (unless an element recolours it), stage 2 bigger with sparkles + crackles
    const M = stage >= 1 && plain(C, 'magnetshroom') ? GOLD : C.main;
    const tips = magnetU(g, hx + 0.2, by, ro, ri, h, M);
    if (stage >= 1) piece(g, t => { star4(t, tips.tr[0] + 3.4, tips.tr[1] + 1.4 - f * 0.5, 1.7, SPARK[0]); if (stage === 2) star4(t, tips.tl[0] - 3.6, tips.tl[1] + 3.4 + f * 0.5, 1.4, SPARK[0]); });
    if (stage === 2) piece(g, t => { bolt(t, tips.tl[0] - 4.2, tips.tl[1] + 0.6 + f * 0.4, 0.42, SPARK[1], -0.6); bolt(t, tips.tr[0] + 2.6, tips.tr[1] + 0.4 - f * 0.4, 0.42, SPARK[1], 0.6); });
    const fr = r * 0.92, ex = hx + 0.8, ey = hy + ry * 0.16;
    eyesFor(g, ex, ey, fr, P);
    A.chibiMouth(g, ex, ey + fr * 0.5, P.mouth, 2);
    blush(g, ex - 0.2, ey + fr * 0.42, fr);
    return { hx: R(hx), hy: R(hy - 1), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(top + 1.6), w: R(ri * 2 + 2) } };
  };

  // =====================================================================================================
  // Hypno-shroom -> Swirl-shroom -> Hypno King
  // A squashed-dome cap striped in pastel rainbow arches, on a white stalk with big swirly hypno eyes and no mouth.
  // Stage 1 a bigger, spotted cap; stage 2 a crown.
  PAL.hypnoshroom = { main: ['#ffe4f4', '#f8b4dc', '#e08cc0'], leaf: LEAF, acc: ['#ffffff', '#f6f2fa', '#d8cfe6'], stem: '#6fb85e', root: '#7a5a2a', part: 'swirl' };
  const RAINBOW = ['#ffb8cc', '#ffd2a4', '#fff0a6', '#c6f0b4', '#b6dcff', '#d8c4ff'];
  // a big swirl eye: white with an ink ring and a spiral inside (cx, cy = eye centre)
  function swirlEye(g, cx, cy, rx, ry, col) {
    g.ell(cx, cy, rx + 0.35, ry + 0.35, INK); g.ell(cx, cy, rx, ry, WHITE);
    // a bold spiral (about 0.45 art px thick) so it still reads at game size
    const rm = Math.min(rx, ry) - 0.45, turns = 2.6 * Math.PI, pts = [];
    for (let th = 0.5; th <= turns; th += 0.18) { const rr = rm * th / turns; pts.push([cx + Math.cos(th) * rr * rx / Math.min(rx, ry), cy + Math.sin(th) * rr * ry / Math.min(rx, ry)]); }
    stroke(g, pts, 0.24, 0.3, col);
  }
  ART.hypnoshroom = function (g, stage, P, C) {
    const hop = hopOf(P), f = P.frame ? 1 : 0;
    const cw = T(stage, 9.2, 10.2, 11.2), ch = T(stage, 6.6, 7.4, 8.2), cb = T(stage, 16.2, 15.6, 15) + hop, capTop = cb - ch;
    const sw = T(stage, 6.4, 7, 7.6), sTop = cb - 1.5, S = stalk(g, 15.6, sTop, sw, C.acc, hop);
    // the cap: a squashed dome with a soft lip, then rainbow arches painted over it
    const cap = new Grid(32, 32);
    const m = blob(cap, [['e', 15.6, cb, cw, ch], ['e', 15.6, cb - 0.2, cw + 0.4, 1.7]], flat(C.main), { cut: [['p', [[0, cb + 1.5], [32, cb + 1.5], [32, 32], [0, 32]]]] });
    const cols = (plain(C, 'hypnoshroom') ? RAINBOW : RAINBOW.map(c => mixHex(c, C.main[1], 0.55))).slice(0, T(stage, 5, 6, 6));
    const K = cap.k, n = cols.length, ccx = 15.6, ccy = cb + 1.2, twist = 0;
    for (let fy = 0; fy < cap.fh; fy++) for (let fx = 0; fx < cap.fw; fx++) {
      if (m.fget(fx, fy) === null) continue;
      const x = (fx + 0.5) / K, y = (fy + 0.5) / K, nx = (x - ccx) / (cw + 0.4), ny = (y - ccy) / (ch + 1.2), q = Math.hypot(nx, ny);
      const i = Math.min(n - 1, Math.max(0, Math.floor((1 - q) * n * 1.15 + twist * Math.atan2(ny, nx))));
      const shade = m.fget(fx + 3, fy + 3) === null;
      cap.fset(fx, fy, shade ? mixHex(cols[i], '#8a6aa8', 0.16) : cols[i]);
    }
    cap.ell(15.6 - cw * 0.45, capTop + ch * 0.36, Math.max(0.6, cw * 0.2), 0.7, WHITE, -0.6, inMask(m));
    if (stage >= 1) for (const [u, v, s] of [[-0.5, 0.48, 1], [0.42, 0.62, 0.9], [0.08, 0.86, 0.75]]) cap.ell(15.6 + u * cw, cb - v * ch, s, s * 0.85, '#fffdf8', 0, inMask(m));
    cap.outline(); g.merge(cap);
    if (stage === 2) crown(g, 15.6, capTop + 1.2, 3.4, 3.8);
    // swirl eyes (lines for happy / closed / blink), no mouth
    const ex = 16.5, ey = S.cy + S.h * 0.2, sp = sw * 0.98, erx = T(stage, 2.2, 2.4, 2.6), ery = erx * 1.1;
    if (P.eyes === 'happy' || P.eyes === 'closed' || P.eyes === 'blink' || P.eyes === 'sleepy') A.chibiEyes(g, ex, ey, { sp, w: erx * 2, h: ery * 2, mood: P.eyes });
    else { for (const x of [ex - sp / 2, ex + sp / 2]) swirlEye(g, x, ey, erx, ery, f ? '#b04ab8' : EYE); brows(g, [ex - sp / 2, ex + sp / 2], ey, erx, ery, P.eyes); }
    blush(g, ex - 0.2, ey + ery + 0.9, sp + 1.6, { w: 1.3, h: 0.7 });
    return { hx: 16, hy: R(cb - 1), hr: R(cw * 0.85), top: topOf(g), ey: R(ey), hat: { x: 16, y: R(capTop + 1.8), w: R(cw) } };
  };

  // =====================================================================================================
  // Doom-shroom -> Gloom Doom -> Mega Doom
  // A big round charcoal "bomb" cap (C.main) with soft spots, over a grey stalk with a MAD face and red eyes.
  // Stage 1 the spots glow; stage 2 a lit fuse sprouts from the top.
  PAL.doomshroom = { main: ['#7a6f8a', '#5a5068', '#3e3648'], leaf: ['#c4ec9a', '#86c66a', '#5a9c52'], acc: ['#f4f2f6', '#d2ced9', '#aaa4b6'], stem: '#5a9c52', root: '#5a4030', part: 'cap' };
  ART.doomshroom = function (g, stage, P, C) {
    const hop = hopOf(P), f = P.frame ? 1 : 0;
    const cw = T(stage, 9.2, 10.2, 11.2), ch = T(stage, 5.6, 6.2, 6.8), cb = T(stage, 17, 16.6, 16.2) + hop, cy = cb - ch * 0.42, capTop = cy - ch;
    const sw = T(stage, 6.4, 7, 7.6), sTop = cb - 1.5, S = stalk(g, 15.6, sTop, sw, C.acc, hop);
    if (stage === 2) { // the fuse: a curly sprout from the top of the cap, with a spark
      piece(g, t => stroke(t, [[16.2, capTop + 1.6], [16.6, capTop - 0.6], [18, capTop - 1.6], [19.2, capTop - 1.6]], 0.6, 0.6, '#c8b08a'));
      piece(g, t => { t.poly(starPts(20, capTop - 1.8, 1.9 + f * 0.3, 0.85, 6, f ? 0 : 0.5), FIRE[1]); t.ell(20, capTop - 1.8, 0.8, 0.8, SPARK[1]); });
    }
    const cap = new Grid(32, 32);
    const m = blob(cap, [['e', 15.6, cy, cw, ch], ['e', 15.6, cb - 0.5, cw * 0.93, 1.4]], C.main, { cut: [['p', [[0, cb + 0.7], [32, cb + 0.7], [32, 32], [0, 32]]]], hl: [15.6, cy, cw, ch] });
    // soft spots (stage 1+ they glow pink-violet)
    const glow = stage >= 1, sc = T(stage, 1, 1.1, 1.2), SPOT = plain(C, 'doomshroom') ? '#e2a0d4' : mixHex(C.main[0], WHITE, 0.35);
    for (const [u, v, s] of [[-0.52, -0.42, 1.6], [0.36, -0.62, 1.25], [0.62, 0.06, 1.35], [-0.12, 0.08, 1]]) {
      const x = 15.6 + u * cw, y = cy + v * ch;
      cap.ell(x, y, s * sc, s * sc * 0.88, SPOT, 0, inMask(m));
      if (glow) cap.ell(x - 0.2, y - 0.2, s * sc * 0.5, s * sc * 0.42, '#ffdcf4', 0, inMask(m)); // they glow from stage 1
    }
    cap.outline(); g.merge(cap);
    const r = T(stage, 8, 9, 10), eh = r * 0.58, ex = 16.5, ey = cb + 2.7 + eh / 2; // low enough that the thick V brows clear the cap
    eyesFor(g, ex, ey, r, P, { sp: sw * 0.9, w: r * 0.44, h: eh, mood: madMood(P.eyes), col: '#e8384e' });
    A.chibiMouth(g, ex, ey + eh / 2 + 0.9, madMouth(P.mouth), 2.4);
    return { hx: 16, hy: R(cy + 1), hr: R(cw * 0.85), top: topOf(g), ey: R(ey), hat: { x: 16, y: R(capTop + 1.6), w: R(cw * 1.1) } };
  };

  // =====================================================================================================
  // Iceberg Lettuce -> Frost Lettuce -> Glacier Lettuce
  // A round, icy-pale lettuce head (C.main) sitting in a rosette of scalloped minty leaves (behind it: round the top, out at the
  // sides and under it), big round eyes and no mouth, on a frosty puddle. Stage 1 frost crystals; stage 2 an ice crown.
  PAL.iceberg = { main: ['#ffffff', '#def5fa', '#b4dcec'], leaf: ['#f0fcf2', '#c2ecd2', '#94d2b8'], acc: ['#ffffff', '#d2effc', '#a2d4ee'], stem: '#94d2b8', root: '#6a5a4a', part: 'cap' };
  const ICE = ['#ffffff', '#d6f2ff', '#9ed0f0'];
  ART.iceberg = function (g, stage, P, C) {
    const r = T(stage, 8, 9, 10), hop = hopOf(P), f = P.frame ? 1 : 0;
    const rx = r * 1.02, ry = r * 0.95, hx = 15.6, hy = 26.6 - ry + hop;
    piece(g, t => blob(t, [['e', 15.6, 29.1, r + 2.2, 1.75]], C.acc, { shade: 0.6 })); // the frosty puddle stays on the ground
    stroke(g, [[15.6 - r * 0.7, 28.7], [15.6 - r * 0.3, 28.5]], 0.28, 0.28, WHITE); g.dots([[15.6 + r * 0.55, 28.8], [15.6 + r * 0.55 + 0.5, 28.8]], WHITE);
    if (stage === 2) piece(g, t => { // the ice crown: crystal shards standing up behind the head
      for (const [dx, h, w] of [[-4.6, 4.2, 1.5], [-2.2, 5.6, 1.6], [0.4, 6.6, 1.8], [3, 5.4, 1.6], [5.2, 3.8, 1.4]]) blob(t, [['p', [[hx + dx - w, hy - ry + 2.4], [hx + dx - w * 0.7, hy - ry + 2.4 - h * 0.6], [hx + dx + 0.2, hy - ry + 2.4 - h], [hx + dx + w * 0.8, hy - ry + 2.4 - h * 0.55], [hx + dx + w, hy - ry + 2.4]]]], ICE, { shade: 0.6 });
    });
    // the leafy rosette behind the head: scallops round the top, two big frilly leaves out at the sides, a ruffle underneath
    piece(g, t => {
      const parts = [];
      for (let i = 0; i <= 6; i++) { const a = -Math.PI + 0.3 + i * (Math.PI - 0.6) / 6; parts.push(['e', hx + Math.cos(a) * rx * 0.92, hy + Math.sin(a) * ry * 0.9, r * 0.34, r * 0.3]); }
      for (const s of [-1, 1]) { parts.push(['e', hx + s * rx * 0.86, hy + ry * 0.36, rx * 0.36, ry * 0.5, s * 0.5]); for (const k of [0, 1, 2]) parts.push(['e', hx + s * (rx * 1.06 + k * 0.1), hy + ry * (0.05 + k * 0.32), r * 0.2, r * 0.2]); }
      for (let i = 0; i <= 6; i++) parts.push(['e', hx - rx * 0.78 + i * rx * 0.26, hy + ry * 0.94 + (i % 2) * 0.35, r * 0.2, r * 0.18]);
      blob(t, parts, C.leaf, { shade: 0.8 });
    });
    piece(g, t => blob(t, [['e', hx, hy, rx, ry], ['e', hx - rx * 0.14, hy + ry * 0.12, rx * 0.9, ry * 0.86]], C.main, { hl: [hx, hy, rx, ry] }));
    for (const s of [-1, 1]) stroke(g, [[hx + s * rx * 0.66, hy + ry * 0.7], [hx + s * rx * 0.86, hy + ry * 0.3], [hx + s * rx * 0.84, hy - ry * 0.05]], 0.24, 0.24, C.main[2]); // soft leaf veins on the sides
    if (stage >= 1) piece(g, t => { star4(t, hx - rx - 1.2, hy - ry * 0.35 + f * 0.5, 1.6, ICE[0]); star4(t, hx + rx + 1, hy - ry * 0.75 - f * 0.5, 1.3, ICE[0]); });
    const ex = hx + 0.8, ey = hy + ry * 0.12;
    eyesFor(g, ex, ey, r, P);
    blush(g, ex - 0.2, ey + r * 0.42, r);
    return { hx: R(hx), hy: R(hy), hr: r, top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - ry + 1.6), w: R(rx * 1.3) } };
  };

  // =====================================================================================================
  // Bonk Choy -> Bonk Champ -> Bonk King
  // A pale bok-choy bulb (the head) with a crest of big round green leaves, HUGE leafy fists (C.main), one squinty eye and
  // buck teeth. The front fist punches on frame 1. Stage 1 a red sweatband; stage 2 a crown and even bigger fists.
  PAL.bonkchoy = { main: ['#dcf7b8', '#98d878', '#6cb65e'], leaf: LEAF, acc: ['#ffffff', '#f3f9e8', '#d2e6be'], stem: '#6fb85e', root: '#7a5a2a', part: 'brows' };
  function leafyFist(g, x, y, fr, M) {
    piece(g, t => blob(t, [['e', x, y, fr, fr * 0.9], ['e', x + fr * 0.2, y - fr * 0.55, fr * 0.72, fr * 0.5]], M, { shade: fr * 0.3, hl: [x, y, fr, fr] }));
    // knuckle creases + a leaf vein
    for (const dx of [-0.3, 0.12, 0.52]) stroke(g, [[x + dx * fr, y - fr * 0.92], [x + dx * fr + 0.1, y - fr * 0.58]], 0.24, 0.24, M[2]);
    stroke(g, [[x - fr * 0.55, y + fr * 0.35], [x + fr * 0.35, y + fr * 0.1]], 0.22, 0.22, M[0]);
  }
  function buckTeeth(g, mx, my, open) {
    if (open) A.chibiMouth(g, mx, my, 'open', 2.8); else stroke(g, [[mx - 1.4, my - 0.25], [mx, my + 0.12], [mx + 1.4, my - 0.25]], 0.36, 0.36, INK);
    const K = g.k, fx = R(mx * K) - 2, fy = R((my + (open ? -0.35 : 0.05)) * K);
    for (let i = 0; i < 5; i++) for (const j of [1, 2]) g.fset(fx + i, fy + j, i === 2 ? INK : WHITE);
    for (let j = 1; j <= 2; j++) { g.fset(fx - 1, fy + j, INK); g.fset(fx + 5, fy + j, INK); }
    for (let i = 0; i < 5; i++) g.fset(fx + i, fy + 3, INK);
  }
  ART.bonkchoy = function (g, stage, P, C) {
    const r = T(stage, 8, 9, 10), hop = hopOf(P), f = P.frame ? 1 : 0;
    const rx = r * 0.8, ry = r * 0.8, hx = T(stage, 15, 14.6, 14.2), hy = 26.6 - ry + hop, fr = T(stage, 3.3, 3.7, 4.1);
    const Ar = P.arms, punch = P.frame && !P.walk && !Ar;
    let back, front;
    if (Ar === 'up') { back = [hx - rx - 0.6, hy - ry * 0.6]; front = [hx + rx + 0.9, hy - ry * 0.6]; }
    else if (Ar === 'out') { back = [hx - rx - 1.8, hy - 0.4]; front = [hx + rx + 2.4, hy - 0.4]; }
    else if (P.walk) { back = [hx - rx - 0.8, hy + (f ? 0.4 : 1.6)]; front = [hx + rx + (f ? 2.4 : 1.6), hy + (f ? 0.6 : 2.8)]; }
    else { back = [hx - rx - 0.8, hy + 1.8]; front = punch ? [hx + rx + 3.4, hy + 1.2] : [hx + rx + 1.4, hy + 3.2]; }
    baseLeaves(g, C, P, { cx: hx + 0.6 });
    // the leafy crest behind the top of the head
    const ly = hy - ry * 0.5, L = r * 0.62;
    piece(g, t => blob(t, [['e', hx - rx * 0.5, ly - L * 0.42, L * 0.44, L * 0.66, -0.55], ['e', hx + rx * 0.52, ly - L * 0.38, L * 0.42, L * 0.62, 0.55], ['e', hx + 0.3, ly - L * 0.62, L * 0.48, L * 0.74, 0.05]], C.main, { shade: 0.9 }));
    for (const [a, l] of [[-0.55, 0.8], [0.55, 0.75], [0.05, 0.95]]) { const x0 = hx + Math.sin(a) * 1.2 + (a > 0.2 ? rx * 0.3 : a < -0.2 ? -rx * 0.28 : 0.3), y0 = ly; stroke(g, [[x0, y0 - 0.5], [x0 + Math.sin(a) * L * l, y0 - Math.cos(a) * L * l * 1.15]], 0.24, 0.24, C.main[0]); }
    piece(g, t => stroke(t, [[hx - rx * 0.7, hy + 1.2], back], 0.85, 0.85, C.acc[2]));
    leafyFist(g, back[0], back[1], fr * 0.92, C.main);
    piece(g, t => blob(t, [['e', hx, hy, rx, ry], ['e', hx, hy + ry * 0.3, rx * 1.05, ry * 0.72]], C.acc, { hl: [hx, hy, rx, ry] }));
    for (const dx of [-0.38, 0.1]) stroke(g, [[hx + dx * rx, hy + ry * 0.55], [hx + dx * rx - 0.1, hy + ry * 0.92]], 0.24, 0.24, C.acc[2]); // stalk ribs
    if (stage >= 1) { // the sweatband (and its tails flying out the back)
      const by = hy - ry * 0.42;
      piece(g, t => { blob(t, [['e', hx, hy, rx + 0.2, ry + 0.2]], ['#ffb0b4', '#ff8088', '#e86070'], { cut: [['p', [[0, 0], [32, 0], [32, by - 0.9], [0, by - 0.9]]], ['p', [[0, by + 1.1], [32, by + 1.1], [32, 32], [0, 32]]]], shade: 0.5 }); blob(t, [['e', hx - rx - 1.2, by + 0.2 + f * 0.3, 1.8, 0.8, 0.35], ['e', hx - rx - 1, by + 1.6 - f * 0.3, 1.6, 0.7, 0.8]], ['#ffb0b4', '#ff8088', '#e86070'], { shade: 0.4 }); });
    }
    if (stage === 2) crown(g, hx + 0.3, hy - ry + 1.4, 3.4, 3.8);
    piece(g, t => stroke(t, [[hx + rx * 0.7, hy + 1.6], front], 0.85, 0.85, C.acc[2]));
    leafyFist(g, front[0], front[1], fr, C.main);
    // face: one squinty eye (the back one) and one round eye, buck teeth
    const fa = rx * 1.06, ex = hx + 0.8, ey = hy + ry * 0.14, sp = fa * 0.86, w = fa * 0.48, h = fa * 0.64, e = P.eyes;
    if (e === 'happy' || e === 'closed' || e === 'blink' || e === 'sleepy' || e === 'sad') eyesFor(g, ex, ey, fa, P);
    else {
      A.chibiEyes(g, ex, ey, { one: true, sp, w, h, mood: e === 'brave' ? 'brave' : undefined });
      const x = ex - sp / 2; stroke(g, [[x - w * 0.55, ey - 0.5], [x + w * 0.55, ey + 0.2]], 0.5, 0.5, INK); stroke(g, [[x - w * 0.3, ey + 0.9], [x + w * 0.35, ey + 0.95]], 0.3, 0.3, INK);
    }
    buckTeeth(g, ex + 0.3, ey + fa * 0.5, P.mouth === 'open' || P.mouth === 'grin');
    blush(g, ex - 0.2, ey + fa * 0.42, fa);
    return { hx: R(hx), hy: R(hy), hr: R(rx + 0.5), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - ry + 1.4), w: R(rx * 1.4) }, front: R(front[0] + fr) };
  };

  // =====================================================================================================
  // Lightning Reed -> Storm Reed -> Thunder Reed
  // A glowing mint-green teardrop bulb (C.main) whose tip curls back, with a glowing core, eyes only (no mouth), on a tiny reed
  // between base leaves. Stage 1 a second little bulb; stage 2 a third bulb and crackling bolts.
  PAL.lightningreed = { main: ['#f4fff8', '#b2f4d2', '#80dab0'], leaf: LEAF, acc: SPARK, stem: '#6fb85e', root: '#7a5a2a', part: 'bolt' };
  function reedBulb(g, x, y, rx, ry, lean, th, M, core, masks) {
    const tip = [x - lean, y - ry - th];
    piece(g, t => {
      const m = blob(t, [['e', x, y, rx, ry], ['e', x, y + ry * 0.2, rx * 1.03, ry * 0.8], ['p', [[x - rx * 0.8, y - ry * 0.42], [x - rx * 0.35, y - ry * 0.9], [tip[0] - 0.2, tip[1] + 0.4], [tip[0] + 0.9, tip[1] + 0.9], [x + rx * 0.3, y - ry * 0.92], [x + rx * 0.72, y - ry * 0.55]]], ['s', [[tip[0] + 0.3, tip[1] + 0.8], [tip[0] - 0.4, tip[1] - 0.2], [tip[0] - 1.6, tip[1] - 0.1], [tip[0] - 2.1, tip[1] + 0.8]], Math.max(0.55, rx * 0.11), Math.max(0.45, rx * 0.08)]], M, { hl: [x, y, rx, ry] });
      if (core) t.ell(x - rx * 0.12, y - ry * 0.05, rx * 0.56, ry * 0.52, mixHex(M[0], M[1], 0.35), 0, inMask(m)); // the glowing core
      if (masks) masks.push(m);
    });
    return tip;
  }
  // a soft see-through glow round the shapes in masks: a 0.55 ring about 1.2 px out and a fainter 0.28 ring ~1 px further
  // (drawn last, on empty pixels only; the engine's bold edge skips see-through pixels)
  function softGlow(g, masks, rgb) {
    const K = g.k, W = g.fw, H = g.fh, d1 = 1.2 * K, d2 = 2.2 * K, n = Math.ceil(d2), inAny = (fx, fy) => masks.some(m => m.fget(fx, fy) !== null);
    for (let fy = 0; fy < H; fy++) for (let fx = 0; fx < W; fx++) {
      if (g.a[fy * W + fx] !== null || inAny(fx, fy)) continue;
      let best = 1e9;
      for (let j = -n; j <= n && best > 0; j++) for (let i = -n; i <= n; i++) { const d = i * i + j * j; if (d < best && inAny(fx + i, fy + j)) best = d; }
      best = Math.sqrt(best);
      if (best <= d1 + 1) g.a[fy * W + fx] = `rgba(${rgb},0.55)`; else if (best <= d2 + 1) g.a[fy * W + fx] = `rgba(${rgb},0.28)`;
    }
  }
  ART.lightningreed = function (g, stage, P, C) {
    const hop = hopOf(P), f = P.frame ? 1 : 0;
    const rx = T(stage, 7.4, 8.2, 9), ry = rx * 0.92, hx = T(stage, 16, 16.6, 17), hy = 26.4 - ry + hop, th = T(stage, 4, 4.4, 4.2), lean = T(stage, 1.2, 1.5, 1.8);
    baseLeaves(g, C, P, { cx: hx - 0.4 });
    const masks = [];
    if (stage >= 1) { piece(g, t => stroke(t, [[hx - 2.6, 27.6], [hx - 6, 25.4], [hx - 8.6, 24.2 + hop]], 0.6, 0.6, C.stem)); reedBulb(g, hx - 9.6, 21.6 + hop, 2.9, 2.8, 0.6, 2, C.main, false, masks); }
    if (stage === 2) { piece(g, t => stroke(t, [[hx - 3.2, 26.6], [hx - 6.6, 19.2], [hx - 8.2, 15.6 + hop]], 0.55, 0.55, C.stem)); reedBulb(g, hx - 8.6, 13.2 + hop, 2.4, 2.4, 0.5, 1.7, C.main, false, masks); }
    tinyStem(g, C, hx - 0.4, hy + ry - 1);
    const tip = reedBulb(g, hx, hy, rx, ry, lean, th, C.main, true, masks);
    // sparkles around the glowing bulb (and bolts crackling off the tip at stage 2)
    piece(g, t => { star4(t, hx + rx + 1.2, hy - ry * 0.55 - f * 0.6, 1.5, SPARK[0]); if (stage >= 1) star4(t, tip[0] - 3.6, tip[1] + 2.4 + f * 0.6, 1.2, SPARK[0]); });
    if (stage === 2) piece(g, t => { bolt(t, tip[0] + 2, tip[1] - 1.6 + f * 0.4, 0.42, SPARK[1], 0.5); bolt(t, hx + rx - 0.6, hy - ry - 0.6 - f * 0.4, 0.4, SPARK[1], 0.3); });
    const ex = hx + 0.8, ey = hy + ry * 0.18, r = rx;
    eyesFor(g, ex, ey, r, P); // eyes only, like the real one
    blush(g, ex - 0.2, ey + r * 0.42, r);
    // the soft glow (halo) round the bulbs: pale mint (or a pale tint of its element's colour)
    const gc = plain(C, 'lightningreed') ? 0xd6ffe8 : parseInt(mixHex(C.main[1], WHITE, 0.45).slice(1), 16);
    softGlow(g, masks, `${gc >> 16 & 255},${gc >> 8 & 255},${gc & 255}`);
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx + 0.4), y: R(hy - ry + 1.6), w: R(rx * 1.3) } };
  };

  // =====================================================================================================
  // Laser Bean -> Beam Bean -> Mega Laser Bean
  // An upright green kidney bean (C.main) leaning forward with a dent on its back, an antenna on top with a glowing red ball, friendly red
  // eyes and no mouth. Stage 1 a leaf on the antenna; stage 2 signal rings round the antenna ball.
  PAL.laserbean = { main: ['#f0fcd0', '#b8e48e', '#8cc870'], leaf: LEAF, acc: ['#ffd6dc', '#ff8090', '#e2586c'], stem: '#6fb85e', root: '#7a5a2a', part: 'beam' };
  ART.laserbean = function (g, stage, P, C) {
    const r = T(stage, 8, 9, 10), hop = hopOf(P), f = P.frame ? 1 : 0;
    const ry = r * 0.92, rx = ry * 0.9, lean = 0.12, hx = 15.4, hy = 26.6 - ry + hop, top = hy - ry, L = T(stage, 2, 2.8, 3.4), br = T(stage, 1.3, 1.5, 1.7);
    baseLeaves(g, C, P);
    tinyStem(g, C, 15.2, hy + ry - 1);
    // the antenna (behind the bean), from the top of the leaning bean
    const ax = hx + ry * lean + 0.4, bx = ax + 0.8, by = top - L + 0.6;
    piece(g, t => stroke(t, [[ax, top + 1.6], [ax + 0.3, top - L * 0.5], [bx, by]], 0.5, 0.45, '#a9b2c4'));
    if (stage >= 1) piece(g, t => blob(t, [['e', ax - 1.4, top - L * 0.4, 1.5, 0.75, -0.5]], C.leaf, { shade: 0.4 }));
    // an upright kidney bean leaning a little forward: fuller low at the front, a gentle dent on its back edge
    piece(g, t => blob(t, [['e', hx, hy, rx, ry, lean], ['e', hx + rx * 0.12, hy + ry * 0.28, rx * 0.94, ry * 0.7, lean]], C.main, { cut: [['e', hx - rx * 1.08, hy + ry * 0.1, rx * 0.3, ry * 0.4, lean]], hl: [hx, hy, rx, ry] }));
    piece(g, t => blob(t, [['e', bx, by, br, br]], C.acc, { shade: 0.5 }));
    g.dot(bx - br * 0.4, by - br * 0.4, WHITE); g.dot(bx - br * 0.4 + 0.5, by - br * 0.4, WHITE);
    if (stage === 2) for (const s of [-1, 1]) for (const k of [1, 2]) { const rr = br + 0.9 * k + f * 0.3, pts = []; for (let a = -0.6; a <= 0.6; a += 0.2) pts.push([bx + s * Math.cos(a) * rr, by + Math.sin(a) * rr]); stroke(g, pts, 0.26, 0.26, k === 1 ? C.acc[1] : C.acc[0]); }
    const fr = (rx + ry) / 2, ex = hx + 1, ey = hy + ry * 0.16;
    eyesFor(g, ex, ey, fr, P, { col: '#e6404e' }); // red eyes, no mouth
    blush(g, ex - 0.2, ey + fr * 0.42, fr);
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx + 0.6), y: R(top + 1.4), w: R(rx * 1.5) }, front: R(hx + rx + 1) };
  };

  // =====================================================================================================
  // Garlic -> Stinky Garlic -> Mega Garlic
  // A cream garlic bulb (C.main) with a pointed top and soft clove lines, on base leaves; one big eye, one squint and a wobbly
  // grimace. Stage 1 stink wafts; stage 2 side cloves, a green sprout and more stink.
  PAL.garlic = { main: ['#ffffff', '#faf3e4', '#e0d0b4'], leaf: LEAF, acc: ['#f6ecfc', '#dcc6ee', '#bea4d2'], stem: '#8ed06a', root: '#dcc49e', part: 'bulb' };
  const STINK = ['#eef8c8', '#c6e48a', '#a2c86a'];
  ART.garlic = function (g, stage, P, C) {
    const r = T(stage, 8, 9, 10), hop = hopOf(P), f = P.frame ? 1 : 0;
    const rx = r * 0.98, ry = r * 0.86, hx = 15.6, hy = 26.6 - ry + hop, tip = T(stage, 3, 3.6, 3.4), M = C.main;
    baseLeaves(g, C, P);
    if (stage === 2) { // side cloves behind, and a green sprout from the tip
      piece(g, t => blob(t, [['e', hx - rx * 0.78, hy + ry * 0.4, rx * 0.42, ry * 0.52, -0.35], ['e', hx + rx * 0.8, hy + ry * 0.42, rx * 0.4, ry * 0.5, 0.35]], M, { shade: 0.8 }));
      piece(g, t => blob(t, [['e', hx - 1, hy - ry - tip - 0.8, 2, 0.85, -0.75], ['e', hx + 1.7, hy - ry - tip - 0.7, 1.9, 0.8, 0.65]], C.leaf, { shade: 0.4 }));
    }
    piece(g, t => blob(t, [['e', hx, hy, rx, ry], ['e', hx, hy + ry * 0.26, rx * 1.03, ry * 0.74], ['p', [[hx - rx * 0.72, hy - ry * 0.5], [hx - rx * 0.3, hy - ry * 0.96], [hx - 0.7, hy - ry - tip * 0.55], [hx + 0.4, hy - ry - tip], [hx + 1.2, hy - ry - tip * 0.5], [hx + rx * 0.32, hy - ry * 0.96], [hx + rx * 0.74, hy - ry * 0.5]]]], M, { hl: [hx, hy, rx, ry] }));
    for (const s of [-1, 1]) stroke(g, [[hx + 0.4 + s * 0.6, hy - ry - tip * 0.4], [hx + s * rx * 0.55, hy - ry * 0.45], [hx + s * rx * 0.66, hy + ry * 0.35]], 0.24, 0.24, C.acc[1]); // clove lines
    if (stage >= 1) { // wavy stink wafts rising beside it
      const waft = (x, y, h, ph) => { const pts = []; for (let i = 0; i <= 8; i++) pts.push([x + Math.sin(i * 0.9 + ph) * 0.8, y - i * h / 8]); return pts; };
      piece(g, t => { stroke(t, waft(hx + rx + 1.4, hy + 1, 6, f * 1.6), 0.45, 0.32, STINK[1]); if (stage === 2) { stroke(t, waft(hx - rx - 1.6, hy + 1.4, 5.4, f * 1.6 + 1), 0.45, 0.32, STINK[1]); stroke(t, waft(hx + rx + 3.4, hy - 1.4, 4.4, f * 1.6 + 2), 0.4, 0.3, STINK[1]); } });
    }
    // face: one big eye (front), one squint (back), a wobbly little grimace
    const fr = ry * 1.05, ex = hx + 0.8, ey = hy + ry * 0.16, sp = fr * 0.86, e = P.eyes;
    if (e === 'happy' || e === 'closed' || e === 'blink' || e === 'sleepy') eyesFor(g, ex, ey, fr, P);
    else {
      A.chibiEyes(g, ex, ey - 0.2, { one: true, sp, w: fr * 0.52, h: fr * 0.7, mood: e === 'brave' || e === 'sad' ? e : undefined });
      const x = ex - sp / 2, w = fr * 0.46; stroke(g, [[x - w * 0.5, ey + 0.1], [x, ey - 0.35], [x + w * 0.5, ey + 0.1]], 0.45, 0.45, INK); stroke(g, [[x - w * 0.35, ey + 0.9], [x + w * 0.35, ey + 0.9]], 0.28, 0.28, INK);
    }
    const my = ey + fr * 0.52;
    if (P.mouth) A.chibiMouth(g, ex, my, P.mouth, 2.2);
    else stroke(g, [[ex - 1.2, my], [ex - 0.6, my - 0.35], [ex, my], [ex + 0.6, my - 0.35], [ex + 1.2, my]], 0.3, 0.3, INK);
    blush(g, ex - 0.2, ey + fr * 0.42, fr);
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - ry + 1.4), w: R(rx * 1.2) } };
  };

  // =====================================================================================================
  // Snapdragon -> Dragon Snap -> Inferno Dragon
  // A yellow-green chibi dragon head in profile (C.main): a big round skull and a short snout, cream horns swept back, an
  // orange frill (C.acc), one big yellow eye. Stage 1 a bigger frill and a puff of smoke; stage 2 it breathes fire.
  PAL.snapdragon = { main: ['#fcffdc', '#dcf09c', '#b6d676'], leaf: LEAF, acc: ['#ffe8c4', '#ffba7a', '#f2925c'], stem: '#6fb85e', root: '#7a5a2a', part: 'spikes' };
  const HORN = ['#fffef6', '#f8f0d8', '#dcc9a2'];
  function dragonEye(g, x, y, w, h, P) {
    const e = P.eyes;
    if (e === 'happy' || e === 'closed' || e === 'blink' || e === 'sleepy') { A.chibiEyes(g, x, y, { one: true, sp: 0, w, h, mood: e }); return; }
    g.ell(x, y, w / 2 + 0.35, h / 2 + 0.35, INK); g.ell(x, y, w / 2, h / 2, '#ffe25e');
    g.ell(x + w * 0.08, y + h * 0.06, w * 0.34, h * 0.38, EYE); // a big glossy pupil
    g.ell(x - w * 0.1, y - h * 0.14, Math.max(0.6, w * 0.17), Math.max(0.7, h * 0.15), WHITE); g.dot(x + w * 0.2, y + h * 0.24, WHITE);
    brows(g, [x], y, w / 2, h / 2, e);
  }
  ART.snapdragon = function (g, stage, P, C) {
    const hop = hopOf(P), f = P.frame ? 1 : 0, sr = T(stage, 6.4, 7.1, 7.8);
    const hx = T(stage, 12.8, 12.4, 12.4), hy = 26.2 - sr * 0.95 + hop, M = C.main, open = P.mouth === 'open' || P.mouth === 'grin' || stage === 2, drop = open ? sr * 0.2 : 0;
    baseLeaves(g, C, P, { cx: 14.8 });
    tinyStem(g, C, 14.6, hy + sr - 1);
    // the frill: broad rounded orange fins fanning round the back of the head
    const fins = T(stage, [-1.9, -2.45, -3.0], [-1.75, -2.25, -2.75, -3.25], [-1.6, -2.03, -2.46, -2.89, -3.3]), fl = sr * T(stage, 0.44, 0.47, 0.44);
    piece(g, t => blob(t, fins.map(an => ['e', hx + Math.cos(an) * (sr * 0.82 + fl * 0.32), hy + Math.sin(an) * (sr * 0.82 + fl * 0.32), fl, sr * 0.3, an]), C.acc, { shade: 0.7 }));
    // two short cream horns swept back off the top of the skull
    piece(g, t => blob(t, [['p', [[hx - sr * 0.08, hy - sr * 0.76], [hx - sr * 0.52, hy - sr * 1.32], [hx - sr * 0.86, hy - sr * 1.42], [hx - sr * 0.5, hy - sr * 0.86]]], ['p', [[hx + sr * 0.42, hy - sr * 0.78], [hx + sr * 0.16, hy - sr * 1.3], [hx - sr * 0.14, hy - sr * 1.42], [hx + sr * 0.06, hy - sr * 0.88]]]], HORN, { shade: 0.5 }));
    // the underjaw (drops open when it roars / breathes fire)
    piece(g, t => blob(t, [['e', hx + sr * 0.8, hy + sr * 0.66 + drop, sr * 0.56, sr * 0.26, 0.04]], C.acc.map(c => mixHex(c, '#fffaf0', 0.55)), { shade: 0.5 }));
    const mx0 = hx + sr * 0.42, mx1 = hx + sr * 1.38, my = hy + sr * 0.5;
    if (open) piece(g, t => t.poly([[mx0, my - 0.2], [mx1 + 0.3, my - 0.6], [mx1, my + 0.4 + drop], [mx0 + 0.4, my + 0.7 + drop]], '#b4506a'));
    // skull (fuller at the back) + a short snout + nose, in one shape
    piece(g, t => blob(t, [['e', hx, hy, sr, sr * 0.95], ['e', hx - sr * 0.2, hy + sr * 0.12, sr * 0.86, sr * 0.84], ['e', hx + sr * 0.8, hy + sr * 0.28, sr * 0.62, sr * 0.44, -0.05], ['e', hx + sr * 1.26, hy + sr * 0.14, sr * 0.28, sr * 0.26]], M, { hl: [hx, hy, sr, sr], cut: open ? [['p', [[mx0, my - 0.2], [mx1 + 1.4, my - 0.7], [mx1 + 1.4, my + 4], [mx0, my + 4]]]] : null }));
    g.ell(hx + sr * 1.34, hy + sr * 0.02, 0.45, 0.32, M[2]); // nostril
    if (open) { // fangs hanging into the open mouth + a tongue
      for (const u of [0.22, 0.68]) { const x = mx0 + (mx1 - mx0) * u, yy = my - 0.2 - (mx1 - mx0) * u * 0.04; piece(g, t => t.poly([[x - 0.55, yy - 0.1], [x + 0.55, yy - 0.1], [x, yy + 1.1]], WHITE)); }
      g.ell(hx + sr * 0.86, my + drop * 0.7 + 0.2, sr * 0.26, 0.5, '#ff9aae', 0, (x, y) => g.get(x, y) === '#b4506a');
    } else { stroke(g, [[mx0, my - 0.3], [mx0 + 0.5, my + 0.1], [mx1 - 0.5, my - 0.15], [mx1, my - 0.5]], 0.3, 0.3, INK); piece(g, t => t.poly([[mx0 + 1.6, my], [mx0 + 2.6, my - 0.08], [mx0 + 2, my + 1]], WHITE)); }
    if (stage === 1) for (const [dx, dy, rr] of [[0.6, 0, 1.15], [3.4, -1.4, 0.85]]) piece(g, t => blob(t, [['e', hx + sr * 1.5 + dx, hy - sr * 0.22 + dy - f * 0.4, rr, rr * 0.9]], ['#ffffff', '#f2f2f8', '#d4d6e2'], { shade: 0.4 })); // two little smoke puffs in front of the nose
    if (stage === 2) { // fire breath
      const x = mx1 + 0.6, y = my + drop * 0.4;
      piece(g, t => blob(t, [['p', [[x - 0.4, y - 1.2], [x + 2.2 + f * 0.8, y - 3.2], [x + 2.6, y - 1.4], [x + 4.9 - f * 0.5, y - 2.4], [x + 4.3, y - 0.2], [x + 5.8, y + 0.9 + f * 0.5], [x + 3.6, y + 1.7], [x + 4 + f * 0.5, y + 3.3], [x + 0.4, y + 1.6]]]], FIRE, { shade: 0.6 }));
      piece(g, t => t.poly([[x + 0.4, y - 0.6], [x + 2.8, y - 1.4], [x + 2.4, y - 0.2], [x + 4.2, y + 0.4], [x + 1.8, y + 1], [x + 0.6, y + 0.8]], '#fff4a0'));
    }
    const ex = hx + sr * 0.34, ey = hy - sr * 0.02, w = sr * 0.56, h = sr * 0.7;
    dragonEye(g, ex, ey, w, h, P);
    blush(g, ex + sr * 0.26, ey + h * 0.6 + 0.6, 0, { one: true, w: 1.3, h: 0.7 });
    return { hx: R(hx + 1), hy: R(hy), hr: R(sr), top: topOf(g), ey: R(ey), hat: { x: R(hx + 0.3), y: R(hy - sr + 1.4), w: R(sr * 1.3) }, front: R(mx1 + 1) };
  };

  // =====================================================================================================
  // Marigold -> Gold Bloom -> Golden Marigold
  // White ruffled petals (C.main) round a big yellow-orange face (C.acc) with a smile. Stage 1 a second ring of petals and a
  // coin on a side stem; stage 2 gold-rimmed petals and two coins.
  PAL.marigold = { main: ['#ffffff', '#fffcf4', '#e8e0d0'], leaf: LEAF, acc: ['#fff0bc', '#ffd070', '#f6a852'], stem: '#6fb85e', root: '#7a5a2a', part: 'petals', fuseLeaf: ['#fff0bc', '#ffd070', '#f6a852'] };
  function coin(g, x, y, s) {
    piece(g, t => blob(t, [['e', x, y, 2.2 * s, 2.3 * s]], GOLD, { shade: 0.6 }));
    g.ell(x, y, 1.3 * s, 1.45 * s, GOLD[2], 0, (a, b) => g.filled(a, b)); g.ell(x, y, 0.95 * s, 1.1 * s, GOLD[1], 0, (a, b) => g.filled(a, b));
    g.dots([[x - 1.2 * s, y - 1.2 * s], [x - 0.7 * s, y - 1.6 * s]], WHITE);
  }
  ART.marigold = function (g, stage, P, C) {
    const hop = hopOf(P), f = P.frame ? 1 : 0, spin = f ? 0.11 : 0;
    const fr = T(stage, 5.6, 6.2, 6.8), pr = fr + T(stage, 2.9, 3.1, 3.3), hx = 15.5, hy = 26.6 - pr + hop;
    baseLeaves(g, C, P);
    if (stage >= 1) { piece(g, t => stroke(t, [[16.4, 27.6], [20.4, 26.6], [23.4, 24.6 + hop]], 0.55, 0.55, C.stem)); coin(g, 24.6, 22.4 + hop - f * 0.4, 1); }
    if (stage === 2) { piece(g, t => stroke(t, [[14.6, 27.6], [10.4, 26.8], [7.8, 25 + hop]], 0.55, 0.55, C.stem)); coin(g, 6.6, 22.8 + hop + f * 0.4, 0.9); }
    tinyStem(g, C, 15.4, hy + fr);
    const n = T(stage, 12, 14, 16), ring = (rad, pl, pw, off, col, sh) => piece(g, t => blob(t, Array.from({ length: n }, (_, i) => { const a = i * Math.PI * 2 / n + off; return ['e', hx + Math.cos(a) * rad, hy + Math.sin(a) * rad * 0.98, pl, pw, a]; }), col, { shade: sh }));
    if (stage === 2) ring(pr - 1.7, 2.45, 2.05, spin, plain(C, 'marigold') ? GOLD : C.main, 0.8); // gold rims peeking out
    ring(pr - (stage === 2 ? 2.2 : 1.9), 2.35, 1.95, spin, C.main, 0.8);
    if (stage >= 1) ring(fr + 0.5, 1.9, 1.6, Math.PI / n - spin, C.main.map(c => mixHex(c, C.acc[0], 0.3)), 0.5);
    piece(g, t => blob(t, [['e', hx, hy, fr, fr * 0.96]], C.acc, { hl: [hx, hy, fr, fr] }));
    const ex = hx + 0.7, ey = hy + fr * 0.14;
    eyesFor(g, ex, ey, fr, P, { col: '#4a2c22' });
    A.chibiMouth(g, ex, ey + fr * 0.5, P.mouth || 'smile', 2.2);
    blush(g, ex - 0.1, ey + fr * 0.42, fr * 1.04, { w: 1.2, h: 0.7 });
    return { hx: R(hx), hy: R(hy), hr: R(pr), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - fr + 1), w: R(fr * 1.6) } };
  };

  // =====================================================================================================
  // Pumpkin -> Jack-o'-Lantern -> Pumpkin King
  // A squat, ribbed orange pumpkin (C.main) whose face is CARVED: glowing eyes and a toothy grin (the carving follows the
  // pose), a stubby stem with a leaf and a curly tendril. Stage 1 bigger with a brighter glow; stage 2 a crown.
  PAL.pumpkin = { main: ['#ffe8c4', '#ffb87c', '#f2945e'], leaf: LEAF, acc: ['#fffbe0', '#fff2a0', '#ffd25e'], stem: '#8ea65a', root: '#7a5a2a', part: 'pumpkin' };
  // carved shapes (polygons around a centre, in units of s)
  function carveEye(cx, cy, s, kind, left) {
    const k = left ? 1 : -1, P = pts => pts.map(([x, y]) => [cx + x * s, cy + y * s]);
    switch (kind) {
      case 'happy': return P([[-1.9, 1], [0, -1.3], [1.9, 1], [1.05, 1.25], [0, 0.05], [-1.05, 1.25]]);
      case 'slit': return P([[-1.8, 0.4], [0, -0.15], [1.8, 0.4], [0, 0.95]]);
      case 'brave': return P([[-1.8 * k, -1.3], [1.8 * k, -0.1], [0.2 * k, 1.5]]);
      case 'sad': return P([[-1.8 * k, -0.1], [1.8 * k, -1.3], [-0.2 * k, 1.5]]);
      default: return P([[-1.75, 1.3], [1.75, 1.3], [0.15, -1.65]]);
    }
  }
  function carveMouth(cx, cy, s, kind) {
    const P = pts => pts.map(([x, y]) => [cx + x * s, cy + y * s]), arc = (x0, x1, y0, sag, n) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n, x = x0 + (x1 - x0) * u; return [x, y0 + Math.sin(u * Math.PI) * sag]; });
    switch (kind) {
      case 'open': return { shape: P(arc(-3.4, 3.4, -0.9, 0.9, 10).concat(arc(3.4, -3.4, -0.9, 3.2, 10).slice(1))), teeth: [] };
      case 'o': return { shape: P(Array.from({ length: 12 }, (_, i) => [Math.cos(i * Math.PI / 6) * 1.2, 0.6 + Math.sin(i * Math.PI / 6) * 1.3])), teeth: [] };
      case 'flat': return { shape: P([[-3, 0.3], [3, 0.3], [2.8, 1.1], [-2.8, 1.1]]), teeth: [] };
      case 'grin': return { shape: P(arc(-3.8, 3.8, -0.6, 0.5, 10).concat(arc(3.8, -3.8, -0.6, 2.6, 10).slice(1))), teeth: [[-2.2, -0.4, 0.7, 1.1], [0, -0.2, 0.7, 1.1], [2.2, -0.4, 0.7, 1.1], [-1.1, 1.8, 0.6, 0.9], [1.1, 1.8, 0.6, 0.9]].map(([x, y, w, h]) => P([[x - w, y], [x + w, y], [x + w, y + h], [x - w, y + h]])) };
      default: return { shape: P(arc(-3.6, 3.6, -0.7, 0.8, 10).concat(arc(3.6, -3.6, -0.7, 2.8, 10).slice(1))), teeth: [P([[-1.7, -0.4], [-0.5, -0.2], [-0.5, 0.9], [-1.7, 0.7]]), P([[0.7, -0.2], [1.9, -0.4], [1.9, 0.7], [0.7, 0.9]])] };
    }
  }
  ART.pumpkin = function (g, stage, P, C) {
    const hop = hopOf(P), f = P.frame ? 1 : 0;
    const W = T(stage, 9.4, 10.2, 11), H = T(stage, 7.2, 7.9, 8.6), hx = 15.6, hy = 28.8 - H + hop, M = C.main, sc = W / 9.4, up = P.arms === 'up' ? 0.4 : 0;
    piece(g, t => blob(t, [['e', hx - W - 0.2, 27.6 - up, 3, 1.45, -0.35 - up], ['e', hx + W + 0.2, 27.6 - up, 3, 1.45, 0.35 + up]], C.leaf, { shade: 0.5 })); // leaves peeking out behind
    // stubby stem, a leaf and a curly tendril
    const st = [hx, hy - H + 1.2], stH = T(stage, 2.6, 3, 3.2), STEM = [mixHex(C.stem, WHITE, 0.3), C.stem, mixHex(C.stem, INK, 0.25)];
    piece(g, t => blob(t, [['e', st[0] - 3.2, st[1] - 0.8, 2.8, 1.3, -0.35]], C.leaf, { shade: 0.5 }));
    piece(g, t => blob(t, [['s', [[st[0], st[1] + 0.6], [st[0] + 0.3, st[1] - stH * 0.6], [st[0] + 1.6, st[1] - stH]], T(stage, 1.15, 1.25, 1.35), 0.9]], STEM, { shade: 0.5 }));
    { const pts = [], cx = st[0] + 3.4, cy = st[1] - 1.4; for (let i = 0; i <= 14; i++) { const a = Math.PI * 1.1 - i * 0.42, rr = 1.6 - i * 0.07; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } piece(g, t => stroke(t, [[st[0] + 1.2, st[1] - 0.6]].concat(pts), 0.32, 0.28, C.leaf[2])); }
    // the ribbed shell: the outer lobes, then the front three as one shape
    piece(g, t => blob(t, [['e', hx - W * 0.58, hy + 0.4, W * 0.44, H * 0.9], ['e', hx + W * 0.58, hy + 0.4, W * 0.44, H * 0.9]], M, { shade: 1 }));
    piece(g, t => blob(t, [['e', hx, hy, W * 0.5, H], ['e', hx - W * 0.28, hy + 0.2, W * 0.42, H * 0.97], ['e', hx + W * 0.28, hy + 0.2, W * 0.42, H * 0.97]], M, { hl: [hx - W * 0.2, hy, W * 0.5, H] }));
    for (const s of [-1, 1]) { const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10, y = hy - H * 0.86 + u * H * 1.72; pts.push([hx + s * W * (0.2 + 0.07 * Math.sin(u * Math.PI)), y]); } stroke(g, pts, 0.24, 0.24, M[2]); }
    if (stage === 2) crown(g, hx + 0.6, hy - H + 1.2, 3.6, 3.8);
    // the carving: glowing inside, a warm cut edge round it
    const e = P.eyes, kind = e === 'happy' ? 'happy' : e === 'closed' || e === 'blink' || e === 'sleepy' ? 'slit' : e === 'brave' ? 'brave' : e === 'sad' ? 'sad' : 'tri';
    const fx = hx + 0.8, fy = hy + 0.3, es = sc * T(stage, 1, 1.05, 1.1), mo = carveMouth(fx, fy + 3 * sc, es, P.mouth === 'open' ? 'open' : P.mouth === 'o' ? 'o' : P.mouth === 'flat' ? 'flat' : P.mouth === 'grin' ? 'grin' : 'smile');
    const cut = new Grid(32, 32);
    cut.poly(carveEye(fx - 3.2 * sc, fy - 1.4 * sc, es, kind, true), 1); cut.poly(carveEye(fx + 3.2 * sc, fy - 1.4 * sc, es, kind, false), 1);
    cut.poly(mo.shape, 1); for (const tp of mo.teeth) cut.poly(tp, null);
    const rim = mixHex(M[2], INK, 0.35), glowTop = stage >= 1 ? '#fffbd6' : '#fff3a8', glowLow = f ? '#ffe070' : '#ffd25e';
    for (let y = 0; y < g.fh; y++) for (let x = 0; x < g.fw; x++) {
      if (!cut.fget(x, y) || !g.ffilled(x, y)) continue;
      g.fset(x, y, cut.fget(x, y - 2) && cut.fget(x, y - 1) ? glowLow : glowTop);
    }
    for (let y = 0; y < g.fh; y++) for (let x = 0; x < g.fw; x++) {
      if (cut.fget(x, y) || !g.ffilled(x, y)) continue;
      if (cut.fget(x - 1, y) || cut.fget(x + 1, y) || cut.fget(x, y - 1) || cut.fget(x, y + 1)) g.fset(x, y, rim);
    }
    return { hx: R(hx), hy: R(hy), hr: R(H + 1), top: topOf(g), ey: R(fy - 1.4 * sc), hat: { x: R(hx + 0.6), y: R(hy - H + 1.2), w: R(W * 0.9) } };
  };

  // =====================================================================================================
  // Coconut Cannon -> Coco Mortar -> Coco Battleship
  // A coconut barrel cannon (C.main) on splayed palm leaves: a cream muzzle at the front, a lit fuse sparking at the back,
  // MAD eyes and no mouth. Stage 1 a mortar tilted up with an iron band; stage 2 two bands and a mast with a pennant.
  PAL.coconut = { main: ['#f6dcbc', '#d6ac84', '#b88a64'], leaf: ['#dcf6b4', '#9ad676', '#70b25e'], acc: ['#ffffff', '#fdf5e6', '#e6d4b8'], stem: '#70b25e', root: '#7a5a2a', part: 'shell' };
  ART.coconut = function (g, stage, P, C) {
    const hop = hopOf(P), f = P.frame ? 1 : 0;
    const rx = T(stage, 8.6, 9.4, 10.2), ry = T(stage, 7, 7.9, 8.2), hx = T(stage, 14, 13.6, 13.4), hy = 26.6 - ry + hop, ang = T(stage, 0, -0.2, -0.06), Rt = rot(hx, hy, ang);
    // palm leaves splayed underneath
    const frond = (x, y, len, a, w) => { const c = Math.cos(a), s2 = Math.sin(a); return ['p', [[x, y - w * 0.6], [x + c * len * 0.5 - s2 * w, y + s2 * len * 0.5 - w], [x + c * len, y + s2 * len], [x + c * len * 0.5 + s2 * w * 0.4, y + s2 * len * 0.5 + w * 0.7], [x, y + w * 0.6]]]; };
    piece(g, t => blob(t, [frond(hx - 1, 28.6, 9, Math.PI + 0.32, 1.6), frond(hx - 0.5, 29.3, 7, Math.PI + 0.05, 1.4), frond(hx + 1.5, 29.3, 7.4, -0.05, 1.4), frond(hx + 2, 28.6, 9, -0.32, 1.6)], C.leaf, { shade: 0.5 }));
    if (stage === 2) { // mast + pennant behind
      piece(g, t => stroke(t, [[hx - 1.6, hy - ry + 2], [hx - 1.9, hy - ry - 5.2]], 0.5, 0.45, '#b88a64'));
      piece(g, t => blob(t, [['p', [[hx - 2, hy - ry - 5.4], [hx - 7.4 + f, hy - ry - 4.4 + f * 0.4], [hx - 2, hy - ry - 2.8]]]], ['#ffd0d4', '#ff9098', '#e8707c'], { shade: 0.4 }));
    }
    // the fuse at the back, with its spark
    const F0 = Rt([hx - rx * 0.7, hy - ry * 0.62]), F1 = [F0[0] - 1, F0[1] - 1.7], F2 = [F0[0] - 1.3, F0[1] - 3.4];
    piece(g, t => stroke(t, [F0, F1, F2], 0.55, 0.5, '#c8aa80'));
    piece(g, t => { t.poly(starPts(F2[0] - 0.2, F2[1] - 0.6, 2.2 + f * 0.4, 0.95, 6, f ? 0 : 0.5), FIRE[1]); t.ell(F2[0] - 0.2, F2[1] - 0.6, 0.85, 0.85, SPARK[1]); });
    // the coconut barrel (tapering to the front) + its cream muzzle and dark bore
    const fc = Rt([hx + rx * 0.42, hy]);
    piece(g, t => blob(t, [['e', hx, hy, rx, ry, ang], ['e', fc[0], fc[1], rx * 0.66, ry * 0.84, ang]], C.main, { hl: [hx, hy, rx, ry] }));
    const bands = T(stage, [], [0.7], [0.62, 0.84]);
    for (const u of bands) { const c = Rt([hx + rx * u, hy]), hh = ry * Math.sqrt(Math.max(0, 1 - u * u)) * (u > 0.2 ? 0.96 : 1); piece(g, t => blob(t, [['e', c[0], c[1], 0.95, hh + 0.35, ang]], METAL, { shade: 0.5 })); }
    const mz = Rt([hx + rx * 1.02, hy]), mr = ry * 0.62;
    piece(g, t => { blob(t, [['e', mz[0], mz[1], 1.8, mr, ang]], C.acc, { shade: 0.5 }); });
    g.ell(mz[0] + 0.45, mz[1], 1.05, mr * 0.66, P.mouth === 'open' ? '#ffd27a' : '#6a4a3c', ang);
    // a few soft coconut-fibre strokes on top
    for (const [u, v] of [[-0.35, -0.82], [-0.05, -0.9], [0.25, -0.86]]) { const a = Rt([hx + rx * u, hy + ry * v]), b = Rt([hx + rx * u + 0.9, hy + ry * v + 0.7]); stroke(g, [a, b], 0.22, 0.22, C.main[2]); }
    const ec = Rt([hx - rx * 0.12, hy + ry * 0.12]), r = ry * 1.1;
    eyesFor(g, ec[0], ec[1], r * 0.92, P, { mood: madMood(P.eyes) }); // mad, no mouth
    return { hx: R(hx), hy: R(hy), hr: R(ry + 0.5), top: topOf(g), ey: R(ec[1]), hat: { x: R(hx - 1), y: R(hy - ry + 1.4), w: R(rx * 1.1) }, front: R(mz[0] + 1.8) };
  };

  // =====================================================================================================
  // Bloomerang -> Double Bloomerang -> Mega Bloomerang
  // A round green face bulb (C.acc) with four separate boomerang petals (chunky Vs pointing out at the diagonals, white C.main
  // and yellow) set like a pinwheel; they spin a little on frame 1. Stage 1 bigger boomerangs; stage 2 a second set behind.
  PAL.bloomerang = { main: ['#ffffff', '#fff8e2', '#eedcb0'], leaf: LEAF, acc: ['#f0fcd6', '#c2ea9c', '#96ce76'], stem: '#6fb85e', root: '#7a5a2a', part: 'boomerang' };
  const BOOM_Y = ['#fffbe6', '#ffe48c', '#f4c460'];
  ART.bloomerang = function (g, stage, P, C) {
    const hop = hopOf(P), f = P.frame ? 1 : 0, spin = f ? 0.16 : 0;
    const fr = T(stage, 5.4, 6, 6.6), pr = fr + T(stage, 4.4, 4.8, 5.2), pw = T(stage, 1.3, 1.45, 1.6), hx = 15.5, hy = 26.4 - (pr * 0.7 + pw) + hop;
    baseLeaves(g, C, P);
    tinyStem(g, C, 15.4, hy + fr);
    const yel = plain(C, 'bloomerang') ? BOOM_Y : C.main.map(c => mixHex(c, '#ffe48c', 0.35));
    // each boomerang: a chunky V whose elbow points outward, arms reaching back toward the face (gaps between neighbours)
    const boom = (th, rad, w, inner, spread) => ['s', [[hx + Math.cos(th - spread) * inner, hy + Math.sin(th - spread) * inner], [hx + Math.cos(th) * rad, hy + Math.sin(th) * rad], [hx + Math.cos(th + spread) * inner, hy + Math.sin(th + spread) * inner]], w, w];
    if (stage === 2) for (let i = 0; i < 4; i++) piece(g, t => blob(t, [boom(-Math.PI / 2 + i * Math.PI / 2 + spin * 0.5, pr * 0.9, pw * 0.75, fr + 2.4, 0.2)], (i % 2 ? yel : C.main).map(c => mixHex(c, '#d8c08a', 0.22)), { shade: 0.5 })); // small ones out in the gaps
    for (let i = 0; i < 4; i++) piece(g, t => blob(t, [boom(-3 * Math.PI / 4 + i * Math.PI / 2 + spin, pr, pw, fr - 0.3, 0.38)], i % 2 ? yel : C.main, { shade: 0.6 }));
    piece(g, t => blob(t, [['e', hx, hy, fr, fr * 0.95], ['e', hx, hy + fr * 0.2, fr * 1.02, fr * 0.78]], C.acc, { hl: [hx, hy, fr, fr] }));
    const ex = hx + 0.7, ey = hy + fr * 0.12;
    eyesFor(g, ex, ey, fr, P);
    A.chibiMouth(g, ex, ey + fr * 0.5, P.mouth, 2);
    blush(g, ex - 0.1, ey + fr * 0.42, fr * 1.04, { w: 1.2, h: 0.7 });
    return { hx: R(hx), hy: R(hy), hr: R(fr + 2), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - fr + 1), w: R(fr * 1.6) } };
  };

  // =====================================================================================================
  // Electric Blueberry -> Shock Berry -> Thunder Berry
  // A glossy round blueberry (C.main) with a little star calyx on top, a sweet face, sparks crackling round it.
  // Stage 1 two small berries join it; stage 2 big lightning bolts spark off its head.
  PAL.blueberry = { main: ['#e6ecff', '#aabafa', '#8496e8'], leaf: LEAF, acc: SPARK, stem: '#6fb85e', root: '#7a5a2a', part: 'berry' };
  function berryBody(g, x, y, rx, ry, M, small) {
    piece(g, t => blob(t, [['e', x, y, rx, ry], ['e', x - rx * 0.06, y + ry * 0.14, rx * 1.02, ry * 0.86]], M, { hl: [x, y, rx, ry], shade: small ? 0.8 : 1.3 }));
    const cal = mixHex(M[2], '#6a4aa8', 0.45), cs = rx / 8;
    piece(g, t => t.poly(starPts(x + 0.3, y - ry + 1.1 * cs, 2.6 * cs, 1.1 * cs, 5).map(([a, b]) => [a, y - ry + 1.1 * cs + (b - (y - ry + 1.1 * cs)) * 0.62]), cal));
    if (!small) g.ell(x - rx * 0.5, y - ry * 0.1, 0.5, 1.1, M[0], -0.3, (a, b) => g.filled(a, b)); // a second gloss streak
  }
  ART.blueberry = function (g, stage, P, C) {
    const hop = hopOf(P), f = P.frame ? 1 : 0;
    const r = T(stage, 7.8, 8.6, 9.4), rx = r, ry = r * 0.92, hx = T(stage, 15.6, 16.4, 16.4), hy = 26.6 - ry + hop;
    baseLeaves(g, C, P);
    tinyStem(g, C, hx - 0.2, hy + ry - 1);
    const SM = C.main.map(c => mixHex(c, '#6c70c8', 0.12));
    if (stage >= 1) { berryBody(g, hx - rx - 0.6, hy + ry * 0.38, 3.4, 3.2, SM, true); berryBody(g, hx - rx * 0.62, hy - ry * 0.72, 3, 2.8, SM, true); }
    if (stage === 2) piece(g, t => { bolt(t, hx - 4.6, hy - ry - 5.2 + f * 0.4, 0.75, SPARK[1], -0.35); bolt(t, hx + 3.2, hy - ry - 5.4 - f * 0.4, 0.75, SPARK[1], 0.35); }); // big bolts sparking off its head
    berryBody(g, hx, hy, rx, ry, C.main, false);
    // sparks crackling round it (they hop about with the frame)
    piece(g, t => { if (f) { bolt(t, hx + rx + 0.8, hy - ry * 0.6, 0.45, SPARK[1], 0.4); bolt(t, hx - rx - 3.4, hy - 1.8, 0.4, SPARK[1], -0.4); } else { bolt(t, hx + rx + 0.4, hy - 0.4, 0.45, SPARK[1], 0.25); bolt(t, hx - rx - 3.2, hy - ry * 0.75, 0.4, SPARK[1], -0.3); } });
    const ex = hx + 0.8, ey = hy + ry * 0.16;
    eyesFor(g, ex, ey, r, P);
    A.chibiMouth(g, ex, ey + r * 0.5, P.mouth, 2.1);
    blush(g, ex - 0.2, ey + r * 0.42, r);
    return { hx: R(hx), hy: R(hy), hr: R(r), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - ry + 1.6), w: R(rx * 1.3) } };
  };

  // =====================================================================================================
  // Infi-nut -> Infi-Shield -> Infi-Fortress
  // A BLUE / CYAN hologram of a Wall-nut (C.main): an egg-shaped nut with scan lines and a bright rim, beamed up from a little
  // metal projector, soft white eyes and an infinity mark. Stage 1 a second ring on the projector; stage 2 taller, a brighter
  // projector with lights, a thick scan band and little hologram sparkles.
  PAL.infinut = { main: ['#f2fdff', '#b6ecfb', '#86d2ee'], leaf: ['#dcf8ff', '#a2e4f8', '#72c8e8'], acc: ['#ffffff', '#d6f8ff', '#92e2f6'], stem: '#959db0', root: '#959db0', part: 'shell' };
  ART.infinut = function (g, stage, P, C) {
    const hop = hopOf(P), f = P.frame ? 1 : 0;
    const rx = T(stage, 7.4, 7.9, 8.4), ry = T(stage, 8.2, 9.2, 9.8), hx = 15.6, hy = 26 - ry + hop, M = C.main;
    // the projector (stays on the ground) and its soft beam
    piece(g, t => blob(t, [['p', [[hx - rx * 0.5, 28], [hx + rx * 0.5, 28], [hx + rx * 0.8, hy + ry * 0.6], [hx - rx * 0.8, hy + ry * 0.6]]]], C.acc.map(c => mixHex(c, WHITE, 0.4)), { shade: 0.4 }));
    // the projector grows with the stages: stage 1 adds a second ring underneath, stage 2 glows brighter with little lights
    if (stage >= 1) piece(g, t => blob(t, [['e', hx, 30, rx * 0.98, 1.3]], METAL.map(c => mixHex(c, '#8a92a8', 0.18)), { shade: 0.5 }));
    piece(g, t => blob(t, [['e', hx, 29, rx * 0.86, 1.8], ['e', hx, 28.1, rx * 0.64, 1.2]], stage === 2 ? METAL.map(c => mixHex(c, '#e8fbff', 0.3)) : METAL, { shade: 0.5 }));
    g.ell(hx, 27.9, rx * T(stage, 0.42, 0.48, 0.56), T(stage, 0.5, 0.55, 0.65), stage === 2 ? C.acc[1] : C.acc[2]);
    if (stage === 2) { g.ell(hx - rx * 0.55, 29.4, 0.45, 0.4, '#ff8a9a'); g.ell(hx + rx * 0.55, 29.4, 0.45, 0.4, f ? '#ffe27a' : '#8ae8a0'); }
    // the hologram nut
    const m = blob(new Grid(32, 32), [['e', hx, hy, rx, ry], ['e', hx, hy + ry * 0.28, rx * 1.04, ry * 0.72]], M);
    piece(g, t => blob(t, [['e', hx, hy, rx, ry], ['e', hx, hy + ry * 0.28, rx * 1.04, ry * 0.72]], M, { hl: [hx, hy, rx, ry] }));
    const ex = hx + 1.1, ey = hy + ry * 0.04, K = g.k, eyeZone = (x, y) => Math.abs(x - ex) < rx * 0.62 && Math.abs(y - ey) < 3.4;
    for (let y = R(hy - ry + 2 + f), n = 0; y < hy + ry - 1; y += 2, n++) for (let fx = 0; fx < g.fw; fx++) { const x = fx / K; if (m.get(x, y) !== null && g.ffilled(fx, y * K) && !eyeZone(x, y)) { g.fset(fx, y * K, n % 2 ? C.acc[1] : mixHex(M[1], WHITE, 0.45)); if (stage === 2 && n === 4 && g.ffilled(fx, y * K + 1)) g.fset(fx, y * K + 1, C.acc[1]); } } // scan lines (stage 2: one thick band)
    for (let fy = 0; fy < g.fh; fy++) for (let fx = 0; fx < g.fw; fx++) { if (!g.ffilled(fx, fy) || m.fget(fx, fy) === null) continue; const x = fx / K, y = fy / K; if (x < hx - 1 && y < hy + ry * 0.2 && g.fget(fx - 1, fy) === INK) g.fset(fx, fy, WHITE); } // bright rim, lit side
    // an infinity mark on the forehead
    { const cx = hx + 0.6, cy = hy - ry * 0.55, pts = []; for (let i = 0; i <= 24; i++) { const a = i * Math.PI / 12; pts.push([cx + Math.sin(a) * 1.7, cy + Math.sin(a) * Math.cos(a) * 1.1]); } stroke(g, pts, 0.24, 0.24, WHITE); }
    A.chibiEyes(g, ex, ey, { white: true, sp: rx * 0.86, w: rx * 0.56, h: rx * 0.66, look: [0.5, -0.1], mood: P.eyes, col: '#2a6a8c' });
    blush(g, ex, ey + rx * 0.48, rx * 1.16, { col: '#ffc4d4' });
    if (stage === 2) piece(g, t => { star4(t, hx - rx - 1.8, hy - ry * 0.3 + f * 0.5, 1.15, C.acc[1]); star4(t, hx + rx + 1.6, hy - ry * 0.55 - f * 0.5, 1, C.acc[1]); star4(t, hx + rx + 2, hy + ry * 0.3 + f * 0.4, 0.9, C.acc[1]); }); // tiny hologram sparkles
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - ry + 1.6), w: R(rx * 1.4) } };
  };
})();
