// art-plants4.js — PVZ Garden: the newer plants, part 1 (see docs/pvz-art-guide.md and docs/chibi-reference.js for the look).
// Threepeater, Split Pea, Scaredy-shroom, Ice-shroom, Sea-shroom, Plantern, Blover, Cattail, Umbrella Leaf, Coffee Bean,
// Grave Buster, Spring Bean, Chili Bean, Pea Pod, Hot Potato.
// Same contract as art-plants.js: PX.PLANT_ART[id] = function (g, stage, P, C) -> geometry, PX.PLANT_PAL[id] = palette.
// TRUE chibi: the head is the character (half-width about 8 / 9 / 10 by stage, bottom near row 26), each with its own silhouette
// built from 2-3 overlapping shapes, big glossy eyes set low and wide (PX.art.chibiEyes), a tiny mouth, blush, soft flat pastel
// fills with one soft shade (PX.art.softBody / shadeShape below), little base leaves; no long stems, no legs. The core adds the
// bold outer edge. Walking = a hop on frame 1; arms:'up' = raised leaves and a little hop.
(function () {
  'use strict';
  if (!window.PX || !PX.art) return;
  const { INK, stroke, starPts } = PX;
  const A = PX.art, mixHex = A.mixHex;
  const ART = PX.PLANT_ART, PAL = PX.PLANT_PAL;
  const piece = (g, f) => PX.piece(g, f);
  const T = (s, a, b, c) => (s === 2 ? c : s === 1 ? b : a); // pick a value per stage
  const R = Math.round, PI = Math.PI, WHITE = '#ffffff', HOLE = '#2b2129';
  const flat = C => [C[1], C[1], C[2]]; // flat fill + one soft shade
  const lt = (c, k) => mixHex(c, WHITE, k), dk = (c, k) => mixHex(c, INK, k);
  const LEAF = ['#c2f09a', '#86d066', '#5aa856'];
  const BOW = ['#ff8f8f', '#f26f78'];
  const STEEL = ['#f6f8fc', '#c8d0de', '#929cb2'];
  const GOLD = ['#fff6c0', '#ffd75a', '#e0a83a'];
  const ICE = ['#ffffff', '#e4f8ff', '#a8d8f2'];
  const PUFF = ['#fbfff2', '#e2f6cc', '#b8dc9c'];
  const inside = t => { const f = (x, y) => t.filled(x, y); f.fine = true; return f; };
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
  // BIG glossy eyes + blush (art director v3 ratios), sized from r (about the head's radius); o: mood default, eye / blush overrides
  function eyes(g, ex, ey, r, P, o) {
    o = o || {};
    A.chibiEyes(g, ex, ey, Object.assign({ sp: r * 0.86, w: r * 0.48, h: r * 0.64, mood: P.eyes || o.mood }, o.eye));
    if (o.blush !== false) A.blush(g, ex - 0.2, ey + r * 0.42, Object.assign({ sp: r }, o.bl));
  }
  function bowTie(g, bx, by, s) {
    piece(g, t => { t.poly([[bx, by], [bx - 3.4 * s, by - 1.6 * s], [bx - 3.4 * s, by + 1.6 * s]], BOW[0]); t.poly([[bx, by], [bx + 3.4 * s, by - 1.6 * s], [bx + 3.4 * s, by + 1.6 * s]], BOW[0]); t.ell(bx, by, s, s, BOW[1]); });
  }
  // a little four-point sparkle (its own outlined piece)
  const sparkle = (g, x, y, s, col) => piece(g, t => t.poly(starPts(x, y, 1.9 * s, 0.6 * s, 4), col || '#fff6a0'));
  // a puffy cloud of 3 balls (steam, stink, foam)
  const puff = (g, x, y, s, Rm) => piece(g, t => { t.ell(x - 1.3 * s, y + 0.3 * s, 1.5 * s, 1.3 * s, Rm[1]); t.ell(x + 1.3 * s, y + 0.3 * s, 1.5 * s, 1.3 * s, Rm[1]); t.ell(x, y - 0.6 * s, 1.7 * s, 1.5 * s, Rm[1]); shadeShape(t, Rm, 0.5, 0.6); shine(t, x - 0.6 * s, y - 1.1 * s, 0.6 * s, 0.35 * s, Rm[0]); });

  // ---------------- the pea family's head (docs/chibi-reference.js Peashooter v3) ----------------
  // Only slightly oval (1.06 x 0.95) with a small bulge at the upper back, a SHORT chunky tube snout in the same piece (reach ~3.5
  // px, half-height 0.36 r, gentle flare) ending in a pale lip round a dark hole, leaf tufts at the back, a red bow tie, BIG eyes.
  // o: dir (1 right / -1 left), back (a second, smaller snout pointing up-back), tuft (0-2 back tufts), top (two leaves on top),
  //    gat (4-barrel gatling muzzle on the front snout), helmet, bow (false = none), s (size of the tufts / tube / bow),
  //    center (eyes centred), eyes (false = none), emin ([w, h] smallest eye size in art px), snout (false = hidden)
  function polyIf(t, pts, col, keep) { const u = new PX.Grid(t.w, t.h, t.k); u.poly(pts, col); for (let i = 0; i < u.a.length; i++) if (u.a[i] && t.a[i] && t.a[i] !== INK && keep((i % t.fw + 0.5) / t.k, Math.floor(i / t.fw + 0.5) / t.k)) t.a[i] = col; }
  function peaHead(g, P, hx, hy, r, C, o) {
    o = o || {};
    const M = C.main, L = C.leaf, d = o.dir || 1, rx = r * 1.06, ry = r * 0.95, s = o.s || Math.min(1, Math.max(0.55, r / 9)), snouts = o.snout === false ? [] : [d];
    if (o.tuft) piece(g, t => { t.ell(hx - d * rx * 0.6, hy - ry * 0.86, 3.3 * s, 1.65 * s, flat(L), -0.95 * d); if (o.tuft > 1) t.ell(hx - d * rx * 0.92, hy - ry * 0.34, 3.1 * s, 1.55 * s, flat(L), -0.3 * d); });
    if (o.top) piece(g, t => { const tx = hx + d * 1.4; t.ell(tx - 1.6 * s, hy - ry - 1.3 * s, 3.1 * s, 1.55 * s, flat(L), -2.05); t.ell(tx + 1.6 * s, hy - ry - 1.0 * s, 2.8 * s, 1.45 * s, flat(L), -1.1); });
    const tl = 2.0 * s, th = r * 0.36, fl = 1.2, sy = hy + r * 0.08;
    // the back snout (Split Pea): a little cannon aimed backwards over its shoulder: 0.8x, set high (hy - 0.2 r at the head's
    // edge), tilted 0.45 rad up-back so its opening faces up and back, with ~2 px of tube before the lip
    const bk = o.back ? (() => {
      const a = 0.45, ux = -d * Math.cos(a), uy = -Math.sin(a), vdx = -d * Math.sin(a), vdy = Math.cos(a), bth = th * 0.8;
      const Ex = hx - d * rx * 0.96, Ey = hy - r * 0.2, Bx = Ex - ux * rx * 0.5, By = Ey - uy * rx * 0.5, Xx = Ex + ux * 2.2, Xy = Ey + uy * 2.2;
      const at = (x, y, k) => [x + vdx * k, y + vdy * k];
      return { a, bth, Ex, Ey, Xx, Xy, vdx, vdy, at, pts: [at(Bx, By, -bth), at(Xx, Xy, -bth * fl), at(Xx, Xy, bth * fl), at(Bx, By, bth)] };
    })() : null;
    piece(g, t => { // head + snout tube(s) in ONE piece
      if (bk) t.poly(bk.pts, M[1]);
      for (const dd of snouts) { const x0 = hx + dd * rx * 0.7, x1 = hx + dd * (rx + tl); t.poly([[x0, sy - th], [x1, sy - th * fl], [x1, sy + th * fl], [x0, sy + th]], M[1]); }
      A.softBody(t, hx - d * rx * 0.14, hy - ry * 0.1, rx * 0.86, ry * 0.86, M, { rot: -0.06 * d, hl: false }); // fuller back of the head
      A.softBody(t, hx, hy, rx, ry, M, { rot: -0.06 * d });
      if (bk) polyIf(t, [bk.at(bk.Ex, bk.Ey, bk.bth * 0.35), bk.at(bk.Xx, bk.Xy, bk.bth * fl * 0.35), bk.at(bk.Xx, bk.Xy, bk.bth * fl), bk.at(bk.Ex, bk.Ey, bk.bth)], M[2], x => d * (hx - x) > rx - 0.6); // back tube underside shade
      for (const dd of snouts) {
        const x0 = hx + dd * rx * 0.7, x1 = hx + dd * (rx + tl), out = x => dd * (x - hx) > rx - 0.8;
        polyIf(t, [[x0 + dd, sy + th * 0.35], [x1, sy + th * fl * 0.35], [x1, sy + th * fl], [x0 + dd, sy + th]], M[2], out); // tube underside shade
        t.ell((x0 + x1) / 2 + dd * 0.8, sy - th * 0.55, Math.abs(x1 - x0) * 0.25, th * 0.18, M[0], 0, (x, y) => dd * (x - hx) > rx - 0.4 && t.filled(x, y)); // tube glint
      }
    });
    const rw = (o.gat ? 2.0 : 1.6) * s, rh = th * fl, hole = mixHex(M[2], HOLE, 0.6);
    if (bk) piece(g, t => { const rr = rh * 0.8, ww = 1.6 * s * 0.8, hx2 = bk.Xx - d * Math.cos(bk.a) * ww * 0.15, hy2 = bk.Xy - Math.sin(bk.a) * ww * 0.15; t.ell(bk.Xx, bk.Xy, ww, rr, M[0], d * bk.a); t.ell(hx2, hy2, ww * 0.58, rr * 0.7, P.mouth === 'open' ? lt(M[0], 0.2) : hole, d * bk.a); });
    for (const dd of snouts) {
      const ox = hx + dd * (rx + tl - 0.1 + (o.gat ? 0.3 * s : 0));
      piece(g, t => {
        t.ell(ox, sy, rw, rh, o.gat ? STEEL[1] : M[0]);
        if (!o.gat) t.ell(ox + dd * rw * 0.15, sy + 0.05, rw * 0.58, rh * 0.7, P.mouth === 'open' ? lt(M[0], 0.2) : hole);
        else for (const [dx, dy] of [[-0.45, -0.42], [0.65, -0.42], [-0.45, 0.46], [0.65, 0.46]]) t.ell(ox + dd * dx * s, sy + dy * rh, 0.5 * s, rh * 0.25, P.mouth === 'open' ? '#ffe46a' : HOLE); // 4 barrels
      });
    }
    const hb = R(hy - ry * 0.42), hw = rx * (bk ? 0.8 : 0.95), hcx = hx - 0.3 * d + (bk ? d * 1.2 : 0); // (set forward, clear of a back cannon)
    if (o.helmet) piece(g, t => A.armyHelmet(t, hcx, hb, hw));
    if (o.bow !== false) bowTie(g, hx + d * 0.8 * s, hy + ry * 0.95, 0.92 * s);
    if (o.helmet) A.armyHelmetDetails(g, hcx, hb, hw);
    const ex = hx + (o.center ? 0.4 : d * 0.8 * s), ey = hy + ry * 0.16;
    const em = o.emin || [0, 0];
    if (o.eyes !== false) { A.chibiEyes(g, ex, ey, { sp: Math.max(r * 0.86, em[0] * 1.55), w: Math.max(r * 0.48, em[0]), h: Math.max(r * 0.64, em[1]), mood: P.eyes }); A.blush(g, ex - 0.2 * d, ey + Math.max(r * 0.42, em[1] * 0.66), { sp: Math.max(r, em[0] * 1.9) }); }
    return { hx, hy, rx, ry, ex, ey, front: hx + d * (rx + tl + rw), helmTop: hb + 0.6 - (hw * 0.78 + 0.8) };
  }
  const peaGeom = (g, H, r) => ({ hx: R(H.hx), hy: R(H.hy), hr: R(H.rx), top: topOf(g), ey: R(H.ey), front: R(H.front),
    hat: { x: R(H.hx), y: R(H.helmTop != null && H.helmet ? H.helmTop + 2.4 : H.hy - H.ry * 0.5), w: R(H.rx * 1.8) }, r });

  // =====================================================================================================
  // Threepeater -> Triple Threat -> Tri-Gatling
  // Three oval pea heads on a branching stem: one up in the middle (behind) and two lower in front, every one with a snout, big
  // eyes and a bow tie. Stage 1 grows leaf tufts; stage 2 steel gatling rims and an army helmet on the middle head.
  PAL.threepeater = { main: ['#dcf8b0', '#9edc72', '#72bc5c'], leaf: LEAF, stem: '#62ac50', root: '#8a6a3a', part: 'snout' };
  ART.threepeater = function (g, stage, P, C) {
    const h = hopOf(P), rm = T(stage, 5.5, 6.0, 6.4), rs = T(stage, 3.9, 4.3, 4.6), s = T(stage, 0.62, 0.66, 0.7);
    // the lower heads sit low (the right one hides the left one's snout); the top one is the leader, high enough that its
    // whole face shows above them
    const sy = 25.9 - rs * 0.96 + h, my = sy - rs * 0.96 - rm * 0.2 - 2.6;
    const xl = T(stage, 9.6, 9.4, 9.2), xm = T(stage, 15.0, 14.8, 14.6), xr = T(stage, 19.2, 19.2, 19.2);
    baseLeaves(g, P, C.leaf);
    piece(g, t => { const c = C.stem; stroke(t, [[15.4, 28.6], [15.4, 26.2]], 0.95, 0.95, c); for (const [x, y] of [[xl + 0.8, sy + 2], [xr - 0.6, sy + 2], [xm, my + 3]]) stroke(t, [[15.4, 26.4], [x, y]], 0.8, 0.8, c); });
    const tuft = stage >= 1 ? 2 : 1, gat = stage === 2;
    const em = [2.4, 3.2];
    const Hm = peaHead(g, P, xm, my, rm, C, { s, tuft, gat, helmet: gat, bow: false, emin: em });
    peaHead(g, P, xl, sy, rs, C, { s, tuft: stage >= 1 ? 1 : 0, snout: false, bow: false, emin: em }); // (its snout is hidden behind the right head)
    const Hr = peaHead(g, P, xr, sy, rs, C, { s, gat, bow: false, emin: em });
    bowTie(g, 15.4, 26.5, 0.7); // one bow tie at the stem fork
    Hm.helmet = gat;
    const G = peaGeom(g, Hm, rm); G.front = R(Hr.front);
    if (!gat) G.hat.y = R(my - rm * 0.84 * 0.4);
    return G;
  };

  // =====================================================================================================
  // Split Pea -> Split Repeater -> Split Gatling
  // One pea head with a snout on BOTH sides: the reference snout in front and a smaller one set high at the back, aimed up
  // over its shoulder like a little cannon; a bow tie.
  // Stage 1 sprouts two leaves on top; stage 2 a 4-barrel gatling muzzle in front and an army helmet.
  PAL.splitpea = { main: ['#e6f8b0', '#b0de6c', '#84bc58'], leaf: LEAF, stem: '#62ac50', root: '#8a6a3a', part: 'snout' };
  ART.splitpea = function (g, stage, P, C) {
    const h = hopOf(P), r = T(stage, 7.0, 7.7, 8.3), ry = r * 0.84, hx = 15.6, hy = 26 - ry + h + 0.4, gat = stage === 2;
    baseLeaves(g, P, C.leaf);
    stem(g, 15.4, 28.6, hy + ry - 1, C.stem);
    const H = peaHead(g, P, hx, hy, r, C, { back: true, s: T(stage, 0.7, 0.74, 0.78), top: stage >= 1, gat, helmet: gat, center: true });
    H.helmet = gat;
    return peaGeom(g, H, r);
  };

  // =====================================================================================================
  // Pea Pod -> Pea Pod Duo -> Pea Pod Party
  // An open green pod (a boat-shaped shell with curled tips) with little pea heads peeking out: 1, then 2, then 4. A bow tie on
  // the pod and leaves at its tips.
  PAL.peapod = { main: ['#d2f2a8', '#90d26c', '#64aa58'], leaf: LEAF, acc: ['#ecfcc0', '#b8e884', '#88c264'], stem: '#62ac50', root: '#8a6a3a', part: 'snout' };
  ART.peapod = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, cx = 15.4, prx = T(stage, 9.2, 11.4, 13.2), pry = T(stage, 4.4, 4.6, 4.8), py = 24.4 + h;
    baseLeaves(g, P, C.leaf, { sp: 4.6 });
    stem(g, 15.4, 28.6, py + 2, C.stem);
    // leaves at the pod's back tip (and the front one at stage 2)
    piece(g, t => { t.ell(cx - prx + 0.6, py - 2.6, 3.4, 1.6, flat(C.leaf), -2.3); if (stage === 2) t.ell(cx + prx - 0.4, py - 2.4, 3, 1.5, flat(C.leaf), -0.75); });
    // the inside of the pod (behind the peas)
    piece(g, t => t.ell(cx, py - 0.4, prx - 0.6, pry + 0.4, flat([M[2], dk(M[1], 0.12), dk(M[2], 0.12)]), 0, (x, y) => y >= py - pry * 0.55));
    // the peas: [x, y, r]; the leader (hat, geometry) is the last
    const pc = { main: C.acc, leaf: C.leaf };
    const peas = T(stage, [[cx - 0.6, py - 4.6, 5.6]], [[cx - 5.6, py - 4.0, 4.6], [cx + 4.8, py - 4.6, 4.8]],
      [[cx - 0.4, py - 9.0, 4.7], [cx - 7.6, py - 3.6, 4.4], [cx + 6.4, py - 3.6, 4.4]]);
    let H = null, front = 0;
    for (const [x, y, r] of peas) { const h1 = peaHead(g, P, x, y, r, pc, { s: r / 9.5, tuft: 0, bow: false, snout: false, emin: [2.2, 3.0] }); front = Math.max(front, h1.hx + h1.rx); if (!H || h1.hy < H.hy) H = h1; } // the leader: the top pea
    // the front wall of the pod with its curled tips, covering the peas' chins
    piece(g, t => {
      t.ell(cx, py + 0.6, prx, pry, M[1], 0, (x, y) => y >= py - 0.4);
      t.ell(cx - prx + 1.4, py - 0.6, 2.6, 1.5, M[1], -0.7); t.ell(cx + prx - 1.4, py - 0.6, 2.6, 1.5, M[1], 0.7);
      shadeShape(t, M, 0.9, 1.2); shine(t, cx - prx * 0.55, py + 1.4, prx * 0.18, 0.5, M[0], 0);
    });
    // a dotted seam along the pod
    for (let x = cx - prx + 3; x <= cx + prx - 3; x += 2) g.dot(x, py + pry * 0.55 + 0.6, M[2]);
    bowTie(g, cx + 0.4, py + 1.3, 0.62);
    const G = { hx: R(H.hx), hy: R(H.hy), hr: R(H.rx), top: topOf(g), ey: R(H.ey), front: R(front) };
    G.hat = { x: R(H.hx), y: R(H.hy - H.ry * 0.5), w: Math.max(9, R(H.rx * 1.8)) };
    return G;
  };

  // =====================================================================================================
  // mushrooms: a big round stalk (the face) that flares into the ground, a squashed-dome cap sitting on top of it
  function stalk(g, cx, cy, rx, ry, Rm, P, foot) {
    const sq = P.walk && !P.frame ? 0.4 : 0;
    piece(g, t => { if (foot !== false) t.ell(cx, 28.5, rx + 0.9 + sq, 1.4, Rm[1]); t.ell(cx, cy, rx + sq * 0.5, ry, Rm[1]); t.ell(cx, cy + ry * 0.3, rx * 0.96 + sq * 0.5, ry * 0.72, Rm[1]); shadeShape(t, Rm, rx * 0.15, ry * 0.15); });
  }
  // a squashed dome: a wide flat-bottomed ellipse plus a smaller rounder crown, bottom edge at by. Returns the top y at x.
  function dome(t, cx, by, rx, ry, Rm, o) {
    o = o || {};
    t.ell(cx, by - 0.3, rx, ry, Rm[1], 0, (x, y) => y <= by);
    t.ell(cx - rx * 0.06, by - ry * 0.5, rx * 0.74, ry * 0.72, Rm[1]);
    t.ell(cx, by, rx - 0.9, 1.25, Rm[1]); // the rounded rim underneath
    shadeShape(t, Rm, rx * 0.12, ry * 0.2);
    if (o.hl !== false) shine(t, cx - rx * 0.45, by - ry * 0.7, rx * 0.2, ry * 0.13, Rm[0]);
  }
  const domeTop = (cx, by, rx, ry, x) => { const d = x - cx, a = Math.abs(d) < rx ? by - 0.3 - ry * Math.sqrt(1 - (d / rx) ** 2) : by, e = x - (cx - rx * 0.06), b = Math.abs(e) < rx * 0.74 ? by - ry * 0.5 - ry * 0.72 * Math.sqrt(1 - (e / (rx * 0.74)) ** 2) : by; return Math.min(a, b); };
  const spot = (t, x, y, r, col) => t.ell(x, y, r, r * 0.86, col, 0, inside(t));

  // Scaredy-shroom -> Shy-shroom -> Brave-shroom
  // A tall egg-shaped stalk with big worried eyes, a lilac spotted cap and a periscope tube for a snout. Stage 1 pulls its cap
  // down low and peeks out from under it; stage 2 is brave: no more worry, a bigger cap with more spots and a striped tube.
  PAL.scaredyshroom = { main: ['#f2e0ff', '#cba8f2', '#a080d2'], leaf: LEAF, acc: ['#fffcf4', '#f6ecdc', '#d8c4aa'], stem: '#62ac50', root: '#8a6a3a', part: 'cap' };
  ART.scaredyshroom = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, f = P.frame ? 1 : 0, sx = 15.0;
    const srx = T(stage, 5.2, 5.6, 6.0), sry = T(stage, 6.2, 6.8, 7.4), sy = 28.8 - sry + h, stop = sy - sry;
    const crx = T(stage, 8.2, 9.4, 10.0), cry = T(stage, 5.2, 6.2, 6.6), cby = stop + T(stage, 1.8, 3.6, 1.6);
    stalk(g, sx, sy, srx, sry, C.acc, P);
    const ex = sx + 0.9, ey = sy + sry * 0.14, er = srx * 1.02;
    // the periscope: a short chunky tube out of the side of the stalk at mouth height (clear of the eyes), bending up, the lens
    // at the top facing forward
    const my = ey + er * 0.45, bx = sx + srx - 1.0, kx = sx + srx + T(stage, 1.4, 1.3, 1.6), py = my - T(stage, 2.4, 2.2, 2.8);
    piece(g, t => { stroke(t, [[bx, my], [kx - 0.6, my], [kx, my - 0.6], [kx, py + 0.6]], 1.1, 1.1, M[1]); shadeShape(t, M, 0.35, 0.5); });
    if (stage === 2) for (const yy of [my - 1.0, py + 0.9]) g.ell(kx, yy, 1.05, 0.32, M[0], 0, inside(g));
    piece(g, t => { t.ell(kx + 0.5, py, 1.5, 1.3, M[1]); t.ell(kx + 1.5, py, 0.95, 1.85, M[0]); t.ell(kx + 1.75, py, 0.5, 1.2, P.mouth === 'open' ? '#fff0b0' : mixHex(M[2], HOLE, 0.5)); });
    const tx = kx + 2.4, ty = py;
    if (P.mouth === 'open' || P.mouth === 'o') piece(g, t => t.ell(tx + 1.2, ty - 0.2, 0.9, 0.9, '#eaffd8'));
    // the cap
    piece(g, t => {
      dome(t, sx - 0.2, cby, crx, cry, M);
      const sp = lt(M[0], 0.45);
      for (const [dx, dy, r] of T(stage, [[-4.4, -1.8, 1.4], [0.6, -3.8, 1.3], [4.4, -1.6, 1.1]], [[-5.4, -2, 1.6], [0.2, -4.4, 1.5], [5, -2.2, 1.3], [-2, -0.8, 0.8]], [[-5.8, -2, 1.7], [-0.4, -4.6, 1.6], [5.2, -2.6, 1.4], [-2.6, -0.8, 0.9], [2.6, -0.6, 0.8]])) spot(t, sx + dx, cby + dy, r, sp);
    });
    eyes(g, ex, ey, er, P, { mood: stage === 2 ? undefined : 'sad' });
    return { hx: R(sx), hy: R(cby - cry * 0.4), hr: R(crx * 0.8), top: topOf(g), ey: R(ey), front: R(tx + 1.4), hat: { x: R(sx), y: R(cby - cry * 0.6), w: R(crx * 1.5) } };
  };

  // Ice-shroom -> Frost-shroom -> Blizzard-shroom
  // A light-blue stalk with a frowny face under an icy blue dome cap crowned with chunky ice crystals. Stage 1 grows icicles
  // under the rim; stage 2 a tall crystal crown and snowflake sparkles.
  PAL.iceshroom = { main: ['#e6f8ff', '#a8dcf8', '#78b4e4'], leaf: ['#c8f0e8', '#86d0c4', '#58a8a4'], acc: ['#f6fcff', '#d6eefa', '#a6cae6'], stem: '#58a8a4', root: '#6a7a8a', part: 'cap' };
  ART.iceshroom = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, sx = 15.4, f = P.frame ? 1 : 0;
    const srx = T(stage, 5.8, 6.2, 6.6), sry = T(stage, 5.6, 6.0, 6.4), sy = 28.8 - sry + h, stop = sy - sry;
    const crx = T(stage, 8.6, 9.6, 10.4), cry = T(stage, 4.6, 5.2, 5.8), cby = stop + 1.8, cx = sx - 0.2;
    stalk(g, sx, sy, srx, sry, C.acc, P);
    piece(g, t => { dome(t, cx, cby, crx, cry, M); for (const [dx, dy] of [[-4.4, -1.6], [4, -1.2]]) spot(t, sx + dx, cby + dy, 0.8, lt(M[0], 0.6)); });
    // chunky crystals standing on the cap (their feet sink into it)
    const cr = T(stage, [[-4.0, 3.0, 1.6], [0.2, 4.4, 1.9], [4.2, 2.8, 1.6]],
      [[-6.0, 2.6, 1.4], [-2.8, 3.8, 1.7], [0.6, 5.0, 1.9], [3.9, 3.8, 1.7], [6.6, 2.4, 1.4]],
      [[-6.8, 2.8, 1.5], [-3.6, 4.6, 1.8], [0.4, 6.6, 2.2], [4.3, 4.4, 1.8], [7.2, 2.6, 1.5]]);
    for (const [dx, hh, w] of [...cr].sort((a, b) => a[1] - b[1])) piece(g, t => {
      const x = sx + dx, by = domeTop(cx, cby, crx, cry, x) + 1.4, lean = dx * 0.06;
      t.poly([[x - w, by], [x - w * 0.85 + lean, by - hh * 0.6], [x + lean * 2, by - hh], [x + w * 0.85 + lean, by - hh * 0.6], [x + w, by]], ICE[1]);
      t.poly([[x + lean * 2, by - hh], [x + w * 0.85 + lean, by - hh * 0.6], [x + w, by], [x + 0.3, by]], ICE[2]); // the shaded facet
    });
    if (stage >= 1) for (const [dx, l] of T(stage, 0, [[-5.8, 1.0], [-1.4, 0.6], [4.8, 1.2]], [[-6.6, 1.1], [-1.6, 0.7], [5.6, 1.3]])) piece(g, t => { const x = sx + dx, y = cby + 0.6; t.ell(x, y + 0.9 + l, 1.15, 1.25, ICE[1]); t.poly([[x - 1.1, y + 0.8 + l], [x + 1.1, y + 0.8 + l], [x + 0.6, y], [x - 0.6, y]], ICE[1]); shadeShape(t, ICE, 0.35, 0.45); }); // three round drips
    if (stage === 2) { sparkle(g, sx - crx - 0.6, cby - 4 + f, 0.8, '#ffffff'); sparkle(g, sx + crx + 0.8, cby - 6 - f, 0.9, '#ffffff'); sparkle(g, sx + crx + 1.4, sy + 1.4, 0.7, '#ffffff'); }
    const ex = sx + 0.9, ey = sy + sry * 0.16, er = srx * 0.98;
    eyes(g, ex, ey, er, P);
    A.chibiMouth(g, ex + 0.1, ey + er * 0.5, P.mouth || 'frown', 2.2);
    const crTop = Math.min(...cr.map(([dx, hh]) => domeTop(cx, cby, crx, cry, sx + dx) + 1.4 - hh));
    return { hx: R(sx), hy: R(cby - cry * 0.4), hr: R(crx * 0.8), top: topOf(g), ey: R(ey), hat: { x: R(sx), y: R(crTop + 2.6), w: R(crx * 1.5) } };
  };

  // Sea-shroom -> Tide-shroom -> Ocean-shroom
  // A small sea-green mushroom bobbing in a little puddle of water, tentacle roots curling out round its foot. Stage 1 has a
  // wavy band on the cap and bubbles; stage 2 a bigger cap with a pink starfish sitting on top.
  PAL.seashroom = { main: ['#d0f6dc', '#86d8ae', '#5cb48e'], leaf: LEAF, acc: ['#f8fff4', '#e2f4de', '#b8d4b8'], stem: '#62ac50', root: '#8a6a3a', part: 'cap' };
  const WATER = ['#eefcff', '#b4e8f8', '#86c8e8'];
  ART.seashroom = function (g, stage, P, C) {
    const f = P.frame ? 1 : 0, M = C.main, sx = 15.2, wy = 29.1;
    const h = P.walk ? (f ? -1.6 : 0) : P.arms === 'up' ? -1 : f ? 0.4 : 0; // bobs on the water, hops out of it when it walks
    const srx = T(stage, 5.4, 5.8, 6.2), sry = T(stage, 5.0, 5.4, 5.8), sy = wy + 0.4 - sry + h, stop = sy - sry;
    const crx = T(stage, 7.8, 8.8, 9.8), cry = T(stage, 4.4, 5.0, 5.6), cby = stop + 1.8, cx = sx - 0.2;
    // the puddle with a ripple ring
    piece(g, t => { t.ell(15.6, wy, 11 + f * 0.4, 2.3, WATER[1]); t.ell(15.6, wy - 0.3, 8.2 + f * 0.6, 1.25, WATER[0]); t.ell(15.6, wy - 0.3, 7.2 + f * 0.6, 0.75, WATER[1]); });
    // tentacle roots curling out of the foot
    piece(g, t => { const c = C.acc[2]; stroke(t, [[sx - 3, sy + sry - 1.4], [sx - 5.6, wy - 0.6], [sx - 7, wy - 1.8], [sx - 6.4, wy - 2.8]], 0.85, 0.55, c); stroke(t, [[sx + 3, sy + sry - 1.4], [sx + 5.8, wy - 0.4], [sx + 7.2, wy - 1.6], [sx + 6.6, wy - 2.6]], 0.85, 0.55, c); });
    stalk(g, sx, sy, srx, sry, C.acc, P, false);
    // a lip of water in front of the foot (it sits in the puddle)
    if (h >= 0) piece(g, t => { t.ell(15.6, wy + 0.3, 11 + f * 0.4, 2.0, WATER[1], 0, (x, y) => y >= wy); shine(t, 9.6, wy + 0.9, 1.4, 0.4, WATER[0], 0); });
    piece(g, t => {
      dome(t, cx, cby, crx, cry, M);
      if (stage === 1) { const pts = []; for (let i = 0; i <= 12; i++) { const x = sx - crx * 0.78 + i * crx * 1.56 / 12; pts.push([x, cby - cry * 0.4 + Math.sin(i * 1.25) * 0.55]); } stroke(t, pts, 0.55, 0.55, lt(M[0], 0.45)); }
      else for (const [dx, dy, r] of [[-4, -1.8, 1.3], [3.6, -2.2, 1.1], [0, -3.6, 0.9]]) spot(t, sx + dx, cby + dy * (cry / 5), r, lt(M[0], 0.45));
    });
    let top = cby - cry;
    if (stage === 2) { // a pink starfish resting on the cap
      const x = sx + 1.6, y = domeTop(cx, cby, crx, cry, sx + 1.6) - 0.4, SF = ['#ffe0d8', '#ffaa9a', '#ec8478'];
      piece(g, t => { t.poly(starPts(x, y, 3.2, 1.45, 5, -PI / 2 + 0.2), SF[1]); shadeShape(t, SF, 0.4, 0.5); for (const [a, b] of [[0, -1.6], [1.4, -0.4], [-1.4, -0.4], [0.9, 1.2], [-0.9, 1.2]]) t.dot(x + a, y + b, SF[0]); });
      top = y - 3;
    }
    if (stage >= 1) for (const [x, y, r] of [[sx + crx + 1.2, cby - 1.4 - f, 1.0], [sx + crx + 2.4, cby - 4 - f, 0.7], [sx - crx - 0.8, cby - 2.6 + f, 0.8]]) piece(g, t => { t.ell(x, y, r, r, WATER[0]); });
    const ex = sx + 0.9, ey = sy + sry * 0.14, er = srx * 1.15;
    eyes(g, ex, ey, er, P);
    A.chibiMouth(g, ex + 0.1, ey + er * 0.48, P.mouth || 'smile', 2);
    return { hx: R(sx), hy: R(cby - cry * 0.4), hr: R(crx * 0.8), top: topOf(g), ey: R(ey), hat: { x: R(sx), y: R(top + 2.2), w: R(crx * 1.5) } };
  };

  // =====================================================================================================
  // Plantern -> Glow Lantern -> Star Lantern
  // A round glowing butter-yellow lantern with a soft plum cap and base ring, leaves sprouting from the cap, the face in the glow
  // and a soft see-through halo. Stage 1 adds a handle loop, glow rays and a wider halo; stage 2 a gold star on top and sparkles.
  PAL.plantern = { main: ['#fffef0', '#ffec98', '#f6c866'], leaf: LEAF, acc: ['#d6c8e4', '#b4a2cc', '#9280b4'], stem: '#62ac50', root: '#8a6a3a', part: 'bulb' };
  ART.plantern = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, F = C.acc, f = P.frame ? 1 : 0, cx = 15.4;
    const rx = T(stage, 7.2, 8.0, 8.6), ry = T(stage, 6.6, 7.2, 7.8), cy = 27.0 - ry - 1.0 + h;
    const capY = cy - ry + 0.4, baseY = cy + ry - 0.2;
    baseLeaves(g, P, C.leaf);
    // leaves sprouting from the cap (+ a handle loop / a star)
    const ly = capY - 1.8;
    if (stage === 1) piece(g, t => { t.ell(cx, ly - 0.2, 2.8, 2.8, F[1]); t.ell(cx, ly - 0.2, 1.8, 1.8, null); });
    if (stage === 2) piece(g, t => { t.poly(starPts(cx, ly - 3.2, 3.4, 1.55, 5), GOLD[1]); shadeShape(t, GOLD, 0.4, 0.6); shine(t, cx - 0.8, ly - 3.8, 0.6, 0.4, GOLD[0]); });
    piece(g, t => { t.ell(cx - 2.4, ly, 3.3, 1.6, flat(C.leaf), -2.5); t.ell(cx + 2.4, ly + 0.2, 3.1, 1.5, flat(C.leaf), -0.65); });
    // glow rays round the lantern (stage 1+), they twinkle with the frame
    if (stage >= 1) for (let i = 0; i < 6; i++) { const a = PI + PI * (0.08 + i * 0.84 / 5), k = (i + f) % 2 ? 2.8 : 2.1; piece(g, t => t.ell(cx + Math.cos(a) * (rx + k), cy + 0.6 + Math.sin(a) * (ry + k), 1.05, 0.5, GOLD[1], a)); }
    // the glowing body: a round lantern a touch wider than tall, brightest in the middle
    piece(g, t => {
      t.ell(cx, cy, rx, ry, M[1]); t.ell(cx, cy + ry * 0.2, rx * 0.97, ry * 0.8, M[1]);
      shadeShape(t, M, rx * 0.12, ry * 0.14);
      t.ell(cx - 0.3, cy - 0.3, rx * 0.62, ry * 0.6, M[0], 0, inside(t));
      for (const s of [-1, 1]) for (let y = cy - ry * 0.6; y <= cy + ry * 0.6; y += 0.5) { const x = cx + s * rx * 0.78 * Math.sqrt(1 - ((y - cy) / ry) ** 2 * 0.9); if (t.filled(x, y)) t.dot(x, y, lt(F[0], 0.2)); } // two faint frame ribs
    });
    piece(g, t => { t.ell(cx, capY + 0.3, rx * 0.6, 1.9, F[1]); t.ell(cx, capY - 1.0, rx * 0.34, 1.2, F[1]); shadeShape(t, F, 0.5, 0.6); shine(t, cx - rx * 0.3, capY - 0.4, 1.0, 0.4, F[0], 0); });
    piece(g, t => { t.ell(cx, baseY + 0.2, rx * 0.58, 1.4, F[1]); shadeShape(t, F, 0.5, 0.6); });
    if (stage === 2) { sparkle(g, cx - rx - 2.6, cy - ry + 1.6 - f, 0.85); sparkle(g, cx + rx + 2.6, cy - 2.4 + f, 0.75); }
    // a soft warm see-through glow round the lantern (no bold edge on it), a fainter outer ring from stage 1
    { const k = g.k, d = (x, y, e) => ((x - cx) / (rx + e)) ** 2 + ((y - cy) / (ry + e)) ** 2 <= 1;
      for (let fy = Math.floor((cy - ry - 3.2) * k); fy <= Math.ceil((cy + ry + 3.2) * k); fy++) for (let fx = Math.floor((cx - rx - 3.2) * k); fx <= Math.ceil((cx + rx + 3.2) * k); fx++) {
        if (g.fget(fx, fy) !== null) continue; const x = (fx + 0.5) / k, y = (fy + 0.5) / k;
        if (d(x, y, 1.5)) g.fset(fx, fy, 'rgba(255,236,150,0.4)'); else if (stage >= 1 && d(x, y, 3.0)) g.fset(fx, fy, 'rgba(255,236,150,0.22)');
      } }
    const ex = cx + 0.8, ey = cy + ry * 0.14, er = ry * 0.98;
    eyes(g, ex, ey, er, P, { eye: { col: '#5a3a2a' } });
    A.chibiMouth(g, ex + 0.1, ey + er * 0.52, P.mouth || 'smile', 2.2);
    return { hx: R(cx), hy: R(cy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(cx), y: R(capY - 0.4), w: R(rx * 1.6) } };
  };

  // =====================================================================================================
  // Blover -> Big Blover -> Mega Blover
  // A clover fan: heart-shaped leaflets round a round pale face with an "o" mouth, on a little stem. Stage 0 three leaflets,
  // stage 1 four (lucky!), stage 2 four big ones and wind curls. The leaflets turn a little each frame, like a fan.
  PAL.blover = { main: ['#dcf8b4', '#9edc76', '#70ba60'], leaf: LEAF, acc: ['#fdfff0', '#f2f9d8', '#d2e6ae'], stem: '#62ac50', root: '#8a6a3a', part: 'petals' };
  function heartLeaf(t, cx, cy, a, len, w, col) { // a heart from the hub (cx, cy) along angle a: two round lobes + a point
    const c = Math.cos(a), s = Math.sin(a), px = -s, py = c, m = len - w * 0.62;
    for (const k of [1, -1]) t.ell(cx + c * m + px * w * 0.56 * k, cy + s * m + py * w * 0.56 * k, w * 0.62, w * 0.6, col, a);
    t.poly([[cx + c * len * 0.1, cy + s * len * 0.1], [cx + c * (m + 0.2) + px * w * 1.12, cy + s * (m + 0.2) + py * w * 1.12], [cx + c * (m + 0.2) - px * w * 1.12, cy + s * (m + 0.2) - py * w * 1.12]], col);
  }
  ART.blover = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, f = P.frame ? 1 : 0, cx = 15.4;
    const hr = T(stage, 4.8, 5.2, 5.6), len = T(stage, 9.6, 10.2, 11.2), w = T(stage, 4.0, 4.0, 4.5), cy = T(stage, 18.4, 17.4, 16.4) + h;
    const n = stage === 0 ? 3 : 4, a0 = (n === 3 ? -PI / 2 : -PI / 4) + (f ? 0.2 : 0) + (P.walk ? 0.3 : 0);
    baseLeaves(g, P, C.leaf);
    stem(g, 15.4, 28.6, cy + 2, C.stem, 0.9);
    if (stage === 2) for (const [x, y, s] of [[cx - 12.6, cy + 3 + f, -1], [cx + 12.8, cy - 4 - f, 1]]) piece(g, t => { const pts = []; for (let i = 0; i <= 10; i++) { const a = i * 0.55; pts.push([x + s * (Math.cos(a) * (2.4 - i * 0.18) - 1), y - Math.sin(a) * (2.4 - i * 0.18) + i * 0.15]); } stroke(t, pts, 0.55, 0.42, '#ffffff'); });
    piece(g, t => {
      for (let i = 0; i < n; i++) heartLeaf(t, cx, cy, a0 + i * 2 * PI / n, len, w, M[1]);
      shadeShape(t, M, 0.9, 1.1);
      for (let i = 0; i < n; i++) { const a = a0 + i * 2 * PI / n, m = len - w * 0.62; t.ell(cx + Math.cos(a) * m - Math.sin(a) * w * 0.5, cy + Math.sin(a) * m + Math.cos(a) * w * 0.5, w * 0.24, w * 0.14, M[0], a + 0.6, inside(t)); }
    });
    piece(g, t => { A.softBody(t, cx, cy, hr * 1.05, hr, C.acc); });
    const ex = cx + 0.6, ey = cy + hr * 0.16;
    eyes(g, ex, ey, hr, P);
    A.chibiMouth(g, ex, ey + hr * 0.56, P.mouth || 'o', 2.2);
    return { hx: R(cx), hy: R(cy), hr: R(hr + 1), top: topOf(g), ey: R(ey), hat: { x: R(cx), y: R(cy - hr + 0.6), w: R(hr * 2.4) } };
  };

  // =====================================================================================================
  // Cattail -> Cattail Archer -> Royal Cattail
  // A pink kitty head with chubby cheeks and pointy ears sitting on a lily pad: whiskers, a cat mouth, a long tail curling up
  // behind with a brown cattail spike on the end. Stage 1 the tail splits into two spikes; stage 2 three spikes, a gold tiara and
  // a flower on the pad.
  PAL.cattail = { main: ['#fff0f6', '#fcc4dc', '#e89cbe'], leaf: ['#c8f0a4', '#88d06c', '#5ea85c'], acc: ['#ecc49a', '#c8946a', '#a07250'], stem: '#62ac50', root: '#8a6a3a', part: 'spikes' };
  ART.cattail = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, f = P.frame ? 1 : 0, sp = C.acc;
    const rx = T(stage, 7.4, 8.2, 8.8), ry = T(stage, 6.6, 7.2, 7.8), hx = 16, hy = 27.6 - ry + h;
    // the lily pad (a flat oval with a notch at the front)
    piece(g, t => { t.ell(16, 29.2, 12, 2.3, flat(C.leaf), 0, (x, y) => !(x > 24 && Math.abs(y - 29.4) < (x - 24) * 0.45)); shine(t, 8.5, 28.7, 1.8, 0.5, C.leaf[0], 0); });
    if (stage === 2) piece(g, t => { for (let i = 0; i < 5; i++) { const a = -PI / 2 + i * 2 * PI / 5; t.ell(25.6 + Math.cos(a) * 1.1, 28.4 + Math.sin(a) * 0.9, 1.2, 0.9, '#fff0f6', a); } t.ell(25.6, 28.4, 0.6, 0.5, GOLD[1]); });
    // the tail: up from behind the head, curling forward, with spikes on its tip(s)
    const tx = hx - rx * 0.6, ty = hy + 2, tipX = T(stage, 6.4, 5.8, 5.6), tipY = hy - ry - T(stage, 0.4, 1.2, 1.6) - f * 0.4;
    piece(g, t => stroke(t, [[tx + 1, ty + 1.6], [tx - 3.2, ty - 0.6], [tipX - 0.6, hy - ry * 0.4], [tipX, tipY + 1.6]], 1.0, 0.75, M[1]));
    const spikes = T(stage, [[0, 0]], [[-1.6, 0.6], [1.6, -0.2]], [[-2.4, 1.0], [0.2, -0.6], [2.6, 0.8]]);
    for (const [dx, dy] of spikes) piece(g, t => {
      const x = tipX + dx, y = tipY + dy - 2.6, a = -PI / 2 + dx * 0.22;
      stroke(t, [[tipX, tipY + 1], [x, y + 2.2]], 0.45, 0.45, '#62ac50');
      t.ell(x, y, 1.45, 3.1, sp[1], a + PI / 2); t.poly([[x - 0.5, y - 2.8], [x + 0.5, y - 2.8], [x + dx * 0.15, y - 4.4]], sp[1]);
      shadeShape(t, sp, 0.5, 0.6);
    });
    // ears (behind the head)
    for (const s of [-1, 1]) piece(g, t => {
      const ex0 = hx + s * rx * 0.55, by = hy - ry * 0.5;
      t.poly([[ex0 - 3.0, by + 1], [ex0 + s * 0.9, hy - ry - 3.2], [ex0 + 3.0, by + 1]], M[1]);
      t.poly([[ex0 - 1.5, by + 0.4], [ex0 + s * 0.7, hy - ry - 1.5], [ex0 + 1.5, by + 0.4]], '#ffa8c4');
      shadeShape(t, M, 0.4, 0.5);
    });
    // the head: a round dome + chubby cheeks (only a little wider than tall)
    piece(g, t => { t.ell(hx, hy - 0.3, rx * 0.94, ry, M[1]); t.ell(hx, hy + ry * 0.28, rx, ry * 0.68, M[1]); shadeShape(t, M, rx * 0.15, ry * 0.16); shine(t, hx - rx * 0.42, hy - ry * 0.58, rx * 0.2, ry * 0.12, M[0]); });
    if (stage === 2) piece(g, t => { const y = hy - ry + 0.7; t.poly([[hx - 2.6, y + 0.8], [hx - 2.8, y - 1.6], [hx - 1.3, y - 0.4], [hx, y - 2.6], [hx + 1.3, y - 0.4], [hx + 2.8, y - 1.6], [hx + 2.6, y + 0.8]], GOLD[1]); shadeShape(t, GOLD, 0.4, 0.5); });
    if (stage === 2) g.ell(hx, hy - ry - 0.5, 0.55, 0.55, '#ff7a90');
    const ex = hx + 0.8, ey = hy + ry * 0.16, er = ry;
    eyes(g, ex, ey, er, P);
    A.chibiMouth(g, ex, ey + er * 0.5, P.mouth || 'cat', 2.2);
    // whiskers out on the cheeks
    for (const s of [-1, 1]) for (const k of [0, 1]) { const x0 = ex + s * (rx * 0.66), y0 = ey + er * 0.42 + k * 1.0; stroke(g, [[x0, y0], [x0 + s * 1.6, y0 - 0.4 + k * 0.7]], 0.2, 0.2, INK); }
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - ry + (stage === 2 ? -0.8 : 1.6)), w: R(rx * 1.6) } };
  };

  // =====================================================================================================
  // Umbrella Leaf -> Parasol Leaf -> Canopy Leaf
  // A big leafy umbrella over a pale-green onion-shaped face bulb. Stage 0 a canopy of three leaves; stage 1 a scalloped parasol
  // with ribs; stage 2 a wide two-tier canopy with a pink bud on top.
  PAL.umbrellaleaf = { main: ['#d0f4a8', '#8ed270', '#64ac5c'], leaf: LEAF, acc: ['#f6ffe2', '#dcf4b4', '#b0d68c'], stem: '#62ac50', root: '#8a6a3a', part: 'leafcrown' };
  ART.umbrellaleaf = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, f = P.frame ? 1 : 0, cx = 15.4;
    const br = T(stage, 6.0, 6.4, 6.8), bry = br * 0.9, by = 27.9 - bry + h;
    const crx = T(stage, 9.6, 11.4, 12.8), cry = T(stage, 5.2, 6.2, 6.8), rim = by - bry - 1.0 - (f && !P.walk ? 0.3 : 0);
    baseLeaves(g, P, C.leaf, { sp: 4.8 });
    piece(g, t => stroke(t, [[cx, by - bry + 1], [cx, rim - 2]], 0.9, 0.9, C.stem));
    if (stage === 0) { // three big leaves fanned out like an umbrella
      piece(g, t => { for (const a of [-2.55, -0.6, -PI / 2]) A.leaf(t, cx, rim + 0.6, crx * (a === -PI / 2 ? 1.05 : 1), a, M[1], 0.42); shadeShape(t, M, 0.8, 1.0); shine(t, cx - 4.6, rim - 2.4, 1.6, 0.6, M[0]); });
      for (const a of [-2.55, -0.6, -PI / 2]) for (let k = 1.4; k < crx * 0.85; k += 0.5) { const x = cx + Math.cos(a) * k, y = rim + 0.6 + Math.sin(a) * k; if (g.filled(x, y)) g.dot(x, y, M[2]); }
    } else {
      if (stage === 2) piece(g, t => { t.ell(cx, rim - cry - 2.4, 1.7, 2.2, '#ffd0e0'); t.poly([[cx - 1.4, rim - cry - 3.2], [cx, rim - cry - 5.4], [cx + 1.4, rim - cry - 3.2]], '#ffd0e0'); t.ell(cx + 0.5, rim - cry - 2.2, 0.8, 1.3, '#ffb0c8', 0, inside(t)); });
      const n = T(stage, 0, 6, 7), sw = crx * 2 / n;
      piece(g, t => {
        t.ell(cx, rim, crx, cry, M[1], 0, (x, y) => y <= rim);
        for (let i = 0; i < n; i++) t.ell(cx - crx + sw * (i + 0.5), rim - 0.1, sw * 0.52, 1.5, M[1], 0, (x, y) => y >= rim - 0.4);
        shadeShape(t, M, crx * 0.08, cry * 0.18);
        shine(t, cx - crx * 0.45, rim - cry * 0.65, crx * 0.18, cry * 0.13, M[0]);
      });
      for (let i = 1; i < n; i++) { const x1 = cx - crx + sw * i; for (let k = 0.15; k < 0.95; k += 0.04) { const x = cx + (x1 - cx) * k, y = rim - cry * Math.sqrt(Math.max(0, 1 - ((x - cx) / crx) ** 2)) * (1 - k) + 0.6 * k; if (g.filled(x, y)) g.dot(x, y, M[2]); } }
      if (stage === 2) piece(g, t => { t.ell(cx, rim - cry + 1.4, crx * 0.52, cry * 0.62, M[1], 0, (x, y) => y <= rim - cry + 1.6); t.ell(cx, rim - cry + 1.4, crx * 0.5, 1, M[1]); shadeShape(t, M, 0.8, 1.0); shine(t, cx - crx * 0.24, rim - cry - 1.6, 1.2, 0.5, M[0]); });
      else piece(g, t => t.ell(cx, rim - cry - 0.4, 0.9, 1.3, flat(C.leaf)));
    }
    // the face bulb: an onion shape (a round bottom + a soft point on top)
    piece(g, t => { t.ell(cx, by, br, bry, C.acc[1]); t.ell(cx, by + bry * 0.25, br * 1.02, bry * 0.75, C.acc[1]); t.poly([[cx - br * 0.45, by - bry * 0.7], [cx, by - bry - 1.4], [cx + br * 0.45, by - bry * 0.7]], C.acc[1]); shadeShape(t, C.acc, br * 0.15, bry * 0.16); shine(t, cx - br * 0.42, by - bry * 0.42, br * 0.22, bry * 0.14, C.acc[0]); });
    const ex = cx + 0.8, ey = by + bry * 0.16, er = br * 0.98;
    eyes(g, ex, ey, er, P);
    A.chibiMouth(g, ex, ey + er * 0.5, P.mouth || 'smile', 2);
    const top = topOf(g);
    return { hx: R(cx), hy: R(by), hr: R(br), top, ey: R(ey), hat: { x: R(cx), y: top + 3, w: R(crx * 1.2) } };
  };

  // =====================================================================================================

  // Coffee Bean -> Espresso Bean -> Mocha Bean
  // A floating brown coffee bean (an oval 1.1 wide to 1 tall, leaning a little, with the S-curved crease down its top) with big
  // white googly eyes, a tiny mouth and a tiny stem nub. Stage 1 zooms along with speed streaks; stage 2 adds a swirl of cream on top.
  PAL.coffeebean = { main: ['#f2d6b8', '#d2a880', '#ac805c'], leaf: LEAF, acc: ['#fffdf6', '#f8eedc', '#dcc8aa'], stem: '#62ac50', root: '#8a6a3a', part: 'berry' };
  ART.coffeebean = function (g, stage, P, C) {
    const f = P.frame ? 1 : 0, M = C.main;
    const lift = P.walk ? (f ? -1.8 : 0) : P.arms === 'up' ? -1.2 : f ? -0.8 : 0; // it floats: bobs up and down
    const rx = T(stage, 7.4, 8.1, 8.8), ry = rx / 1.1, cx = 15.6, cy = 27.8 - ry + lift;
    const ny = cy - ry + 0.4;
    if (stage >= 1) for (const [dy, l] of [[-2.6, 3.0], [0.4, 4.0], [3.2, 2.6]]) { const x1 = cx - rx - 0.8 - f * 0.6, y = cy + dy; piece(g, t => stroke(t, [[x1, y], [x1 - l, y + 0.15]], 0.55, 0.35, '#ffffff')); } // zoom! speed streaks
    piece(g, t => { // the bean: an oval about 1.1 wide to 1 tall, leaning a little forward
      t.ell(cx, cy, rx, ry, M[1], -0.16); t.ell(cx - rx * 0.12, cy + ry * 0.1, rx * 0.9, ry * 0.9, M[1], -0.1);
      shadeShape(t, M, rx * 0.15, ry * 0.16); shine(t, cx - rx * 0.5, cy - ry * 0.48, rx * 0.16, ry * 0.12, M[0]);
      // the signature S-curved crease: from the top centre curving down to just above the eyes, and on below the mouth
      const CR = mixHex(M[2], INK, 0.35), top = cy - ry * 0.98, sc = [];
      for (let i = 0; i <= 12; i++) { const k = i / 12; sc.push([cx + 0.6 + Math.sin(k * PI * 1.25 + 0.3) * -1.1, top + 0.3 + k * ry * 0.6]); }
      stroke(t, sc.map(([x, y]) => [x + 0.55, y + 0.1]), 0.28, 0.2, lt(M[0], 0.15)); // the raised light edge beside it
      stroke(t, sc, 0.45, 0.34, CR);
      stroke(t, [[cx + 1.9, cy + ry * 0.74], [cx + 1.1, cy + ry * 0.86], [cx + 0.1, cy + ry * 0.96]], 0.4, 0.3, CR);
    });
    piece(g, t => stroke(t, [[cx + 1.4, ny + 0.4], [cx + 1.8, ny - 1.0]], 0.6, 0.5, C.stem)); // a tiny stem nub
    if (stage === 2) piece(g, t => { // a cream swirl
      const y = ny - 0.6; t.ell(cx - 0.4, y + 0.4, 4.4, 1.7, C.acc[1]); t.ell(cx - 0.2, y - 1.0, 3.2, 1.4, C.acc[1]); t.ell(cx, y - 2.3, 2.0, 1.2, C.acc[1]); t.poly([[cx - 0.7, y - 2.9], [cx + 0.7, y - 2.9], [cx + 1.5, y - 4.4]], C.acc[1]);
      shadeShape(t, C.acc, 0.5, 0.6); shine(t, cx - 2, y - 0.4, 1, 0.4, WHITE, 0);
    });
    const ex = cx + 0.8, ey = cy + ry * 0.16;
    A.chibiEyes(g, ex, ey, { white: true, sp: rx * 0.8, w: rx * 0.55, h: ry * 0.68, look: [0.5, 0.1], mood: P.eyes });
    A.blush(g, ex, ey + ry * 0.48, { sp: rx * 1.16, w: 1.2, h: 0.7 });
    A.chibiMouth(g, ex + 0.2, ey + ry * 0.56, P.mouth || 'smile', 1.9);
    return { hx: R(cx), hy: R(cy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(cx), y: R(cy - ry * (stage === 2 ? 1.15 : 0.55)), w: R(rx * 1.6) } };
  };

  // =====================================================================================================
  // Grave Buster -> Grave Gobbler -> Tomb Crusher
  // A chunky lilac-grey tombstone wrapped in green vines, poking out of a dirt mound, with glowing yellow eyes in dark sockets and
  // a gobbling mouth. Stage 1 a toothy grin and a leaf sprout on top; stage 2 a crack, a flower on the vine and a big grin.
  PAL.gravebuster = { main: ['#e2deec', '#b8b2cc', '#928cae'], leaf: LEAF, acc: ['#fffbd0', '#ffe46a', '#f2b83a'], stem: '#62ac50', root: '#8a6a3a', part: 'jaws' };
  const DIRT = ['#ecd2ae', '#cfaa82', '#a8845e'];
  ART.gravebuster = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, cx = 15.4;
    const w = T(stage, 7.4, 8.2, 8.9), ht = T(stage, 15, 17, 19.4), bot = 28.4 + h * 0.6, top = bot - ht + h * 0.4;
    baseLeaves(g, P, C.leaf, { sp: 7.0, len: 3.6 });
    if (stage >= 1) piece(g, t => { t.ell(cx - 2.2, top - 0.6, 3.2, 1.5, flat(C.leaf), -2.2); t.ell(cx + 2.0, top - 0.4, 3.0, 1.4, flat(C.leaf), -0.9); });
    // the stone: an arch (a box with a round top), a bit wider at the bottom
    piece(g, t => {
      t.ell(cx, top + w * 0.9, w, w * 0.92, M[1]);
      t.poly([[cx - w, top + w * 0.9], [cx + w, top + w * 0.9], [cx + w + 0.5, bot], [cx - w - 0.5, bot]], M[1]);
      shadeShape(t, M, w * 0.15, 1.4); shine(t, cx - w * 0.5, top + w * 0.5, w * 0.22, 0.8, M[0]);
      if (stage === 2) stroke(t, [[cx + w * 0.55, top + 1.2], [cx + w * 0.3, top + 3.2], [cx + w * 0.6, top + 4.4], [cx + w * 0.4, top + 6]], 0.3, 0.3, M[2]); // a crack
    });
    // a vine climbing the left side and over the shoulder, with little leaves
    piece(g, t => {
      stroke(t, [[cx - w - 0.2, bot - 2], [cx - w + 0.4, top + w * 1.3], [cx - w * 0.55, top + w * 0.35], [cx - w * 0.05, top + 0.4]], 0.75, 0.6, C.leaf[1]);
      stroke(t, [[cx + w + 0.5, bot - 2.6], [cx + w * 0.7, bot - 1.4], [cx + w * 0.35, bot - 1.2]], 0.7, 0.6, C.leaf[1]);
      for (const [x, y, a] of [[cx - w * 0.82, top + w * 0.6, -2.4], [cx - w * 0.3, top + 1.2, -0.5], [cx - w - 0.2, bot - 4.6, -2.6], [cx + w + 0.3, bot - 2.8, -1.2]]) A.leaf(t, x, y, 2.7, a, C.leaf[1], 0.42);
      shadeShape(t, C.leaf, 0.4, 0.5);
    });
    if (stage === 2) piece(g, t => { const x = cx + w * 0.6, y = bot - 1.8; for (let i = 0; i < 5; i++) { const a = -PI / 2 + i * 2 * PI / 5; t.ell(x + Math.cos(a) * 1.0, y + Math.sin(a) * 1.0, 0.9, 0.7, '#ffe0ec', a); } t.ell(x, y, 0.55, 0.55, GOLD[1]); });
    // the dirt mound it pokes out of (in front of the stone's foot)
    piece(g, t => { t.ell(cx, 30.4, 10.2, 3.2, DIRT[1], 0, (x, y) => y <= 30.6); t.ell(cx - 3.4, 28.8, 3.6, 1.6, DIRT[1]); t.ell(cx + 4.6, 29.0, 3.0, 1.3, DIRT[1]); shadeShape(t, DIRT, 0.6, 0.8); shine(t, cx - 5.6, 28.6, 1.4, 0.45, DIRT[0], 0); for (const [x, y] of [[cx - 1.2, 29.6], [cx + 3.6, 30], [cx - 6, 30.2]]) t.ell(x, y, 0.45, 0.35, DIRT[2], 0, inside(t)); });
    // glowing eyes in dark sockets
    const ex = cx + 0.8, ey = top + ht * 0.47, er = w * 0.95, ew = er * 0.46, eh = er * 0.6, esp = er * 0.86, mood = P.eyes;
    if (!mood || mood === 'sad' || mood === 'brave' || mood === 'mad') for (const s of [-1, 1]) g.ell(ex + s * esp / 2, ey, ew / 2 + 0.6, eh / 2 + 0.6, '#5a4e6e');
    A.chibiEyes(g, ex, ey, { sp: esp, w: ew, h: eh, mood, col: C.acc[1] });
    if (!mood || mood === 'sad' || mood === 'brave') for (const s of [-1, 1]) g.ell(ex + s * esp / 2 + 0.25, ey + 0.5, ew * 0.22, eh * 0.16, C.acc[2], 0, (x, y) => g.get(x, y) === C.acc[1]);
    A.chibiMouth(g, ex, ey + er * 0.58, P.mouth || T(stage, 'smile', 'grin', 'grin'), T(stage, 2.4, 3.6, 4.2));
    return { hx: R(cx), hy: R(top + ht * 0.45), hr: R(w), top: topOf(g), ey: R(ey), hat: { x: R(cx), y: R(top + 2.4), w: R(w * 1.7) } };
  };

  // =====================================================================================================
  // Spring Bean -> Bounce Bean -> Super Spring
  // A green bean head with big worried eyes on a coiled spring (2, 3, then 4 ribbed coils) standing on little leaves. The spring
  // squashes as it lands and stretches as it hops. Stage 1 sprouts a leaf on top; stage 2 two leaves and a gold top coil.
  PAL.springbean = { main: ['#e2f8b0', '#ace078', '#7ebe5e'], leaf: LEAF, acc: ['#f2fadc', '#cfe8a6', '#a0c680'], stem: '#62ac50', root: '#8a6a3a', part: 'leafcrown' };
  ART.springbean = function (g, stage, P, C) {
    const f = P.frame ? 1 : 0, M = C.main, cx = 15.6, n = T(stage, 2, 3, 4);
    const gap = P.walk ? (f ? 2.7 : 1.6) : P.arms === 'up' ? 2.7 : f ? 2.0 : 2.2, lift = P.walk && f ? -0.8 : 0;
    const rx = T(stage, 6.8, 7.4, 8.0), ry = T(stage, 5.6, 6.1, 6.6);
    baseLeaves(g, P, C.leaf);
    const cy0 = 27.4 + lift, coilTop = cy0 - (n - 1) * gap, hy = coilTop - 0.5 - ry * 1.0;
    for (let i = 0; i < n; i++) { const y = cy0 - i * gap, Rc = stage === 2 && i === n - 1 ? GOLD : C.acc; piece(g, t => { t.ell(cx, y, 3.5, 1.3, Rc[1], (i % 2 ? 0.12 : -0.12)); shadeShape(t, Rc, 0.3, 0.6); t.ell(cx - 1.3, y - 0.5, 1.1, 0.3, Rc[0], 0, inside(t)); }); }
    if (stage >= 1) piece(g, t => { t.ell(cx + 0.4, hy - ry - 1.4, 3.2, 1.5, flat(C.leaf), -1.0); if (stage === 2) t.ell(cx - 2.6, hy - ry - 1.0, 2.8, 1.4, flat(C.leaf), -2.3); });
    piece(g, t => { // a bean: a gently wide oval + a fuller lower back, a soft dip on top
      t.ell(cx, hy, rx, ry, M[1]); t.ell(cx - rx * 0.22, hy + ry * 0.18, rx * 0.82, ry * 0.84, M[1]);
      t.ell(cx + rx * 0.18, hy - ry - 0.55, rx * 0.2, 0.95, null);
      shadeShape(t, M, rx * 0.15, ry * 0.17); shine(t, cx - rx * 0.45, hy - ry * 0.45, rx * 0.2, ry * 0.13, M[0]);
    });
    const ex = cx + 0.8, ey = hy + ry * 0.18, er = ry;
    eyes(g, ex, ey, er, P, { mood: 'sad', eye: { w: er * 0.52, h: er * 0.68, sp: er * 0.9 } });
    A.chibiMouth(g, ex + 0.1, ey + er * 0.6, P.mouth || 'o', 1.8);
    return { hx: R(cx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(cx), y: R(hy - ry * 0.55), w: R(rx * 1.7) } };
  };

  // =====================================================================================================
  // Chili Bean -> Hot Chili Bean -> Volcano Bean
  // A chili-red kidney bean (about 1.3 wide to 1 tall, sitting on two round cheeks with a dent and a pale bean eye in the middle
  // of its bottom edge) with a curly pig-tail stem on top, big eyes and a cheeky lopsided smirk. Stage 1 puffs
  // a couple of stinky clouds; stage 2 is bigger, its curl turns into a little flame and a stink cloud rises behind it.
  PAL.chilibean = { main: ['#ff9a8a', '#ec6a64', '#c84a4e'], leaf: LEAF, acc: ['#fff2c8', '#ffc078', '#f08a4a'], stem: '#62ac50', root: '#8a6a3a', part: 'flame' };
  ART.chilibean = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, f = P.frame ? 1 : 0, cx = 15.6;
    const r = T(stage, 7.6, 8.4, 9.2), rx = r * 1.18, ry = r * 0.84, cy = 26.2 - ry + h; // a kidney bean about 1.3-1.4 wide to 1 tall
    baseLeaves(g, P, C.leaf, { sp: 5.4 });
    if (stage >= 1) { puff(g, cx - rx + 0.6, cy - ry - 0.6 - f * 0.5, 1.1, PUFF); puff(g, cx + rx - 0.4, cy - ry - 1.6 + f * 0.5, 0.9, PUFF); }
    if (stage === 2) puff(g, cx - rx + 3.4, cy - ry - 4.0 - f * 0.5, 1.2, PUFF);
    const sx = cx - rx * 0.32, sy = cy - ry + 0.7; // the curly stem, a little back of the middle
    if (stage < 2) piece(g, t => { // a thin pig-tail: up from the bean, then a spiral that winds inwards
      const pts = [[sx, sy + 1.2], [sx - 0.2, sy - 1.4]], ox = sx + 1.5, oy = sy - 3.0;
      for (let i = 0; i <= 18; i++) { const a = PI + i * 0.36, rr = 1.7 - i * 0.065; pts.push([ox + Math.cos(a) * rr, oy + Math.sin(a) * rr]); }
      stroke(t, pts, 0.45, 0.36, C.stem);
    });
    else piece(g, t => { const F = C.acc; t.poly([[sx - 2.4, sy + 1], [sx - 2.4, sy - 1.8], [sx - 1, sy - 0.8], [sx - 0.2, sy - 4.6 - f * 0.6], [sx + 1.4, sy - 1.6], [sx + 2.8, sy - 3.2 + f * 0.6], [sx + 2.6, sy + 1]], F[1]); t.ell(sx, sy + 0.4, 2.4, 1.6, F[1]); shadeShape(t, F, 0.4, 0.6); t.ell(sx, sy, 1.2, 1.2, F[0], 0, inside(t)); });
    const dx0 = cx - 0.6, dy0 = cy + ry + 0.9, drx = r * 0.36, dry = 2.3;
    piece(g, t => { // the kidney: two round ends and a smooth top arc, sitting on two "cheeks", a clear dent in the middle of its bottom
      t.ell(cx - rx * 0.46, cy + 0.3, rx * 0.54, ry * 0.92, M[1]); t.ell(cx + rx * 0.44, cy + 0.1, rx * 0.56, ry * 0.96, M[1]); t.ell(cx, cy, rx * 0.72, ry, M[1]);
      t.ell(dx0, dy0, drx, dry, null); // the dent (bites ~1.4 px into the bottom edge)
      shadeShape(t, M, rx * 0.1, ry * 0.17); shine(t, cx - rx * 0.52, cy - ry * 0.42, rx * 0.13, ry * 0.12, M[0]);
      t.ell(dx0, dy0, drx + 0.7, dry + 0.55, lt(M[0], 0.5), 0, (x, y) => t.filled(x, y) && y > dy0 - dry - 0.6); // the pale bean eye (hilum) hugging the dent
    });
    const ex = cx + 1.2, ey = cy - ry * 0.04, er = r * 0.88;
    eyes(g, ex, ey, er, P, stage === 2 ? { bl: { col: '#ff9a8a' } } : undefined);
    const my = ey + er * 0.56;
    if (P.mouth) A.chibiMouth(g, ex + 0.2, my, P.mouth, 2.2);
    else { stroke(g, [[ex - 1.0, my + 0.1], [ex + 0.2, my + 0.4], [ex + 1.0, my + 0.1], [ex + 1.5, my - 0.5]], 0.36, 0.36, INK); g.dot(ex + 1.75, my - 0.75, INK); } // the cheeky smirk
    return { hx: R(cx), hy: R(cy), hr: R(ry + 1), top: topOf(g), ey: R(ey), hat: { x: R(cx + 0.6), y: R(cy - ry * 0.55), w: R(rx * 1.5) } };
  };

  // =====================================================================================================
  // Hot Potato -> Baked Potato -> Lava Potato
  // A lumpy warm potato (a big oval + two soft bumps) with sleepy half-lidded eyes, warm cheeks, a sprout and a little warm
  // twinkle. Stage 1 sits in crinkly foil with a melting pat of butter and steam; stage 2 is bigger with glowing lava cracks and
  // a flame on top.
  PAL.hotpotato = { main: ['#fae2ba', '#e8be8e', '#c89a6a'], leaf: LEAF, acc: ['#fff2c8', '#ffb46c', '#f2844e'], stem: '#62ac50', root: '#8a6a3a', part: 'flame' };
  ART.hotpotato = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, F = C.acc, f = P.frame ? 1 : 0, cx = 15.4;
    const rx = T(stage, 7.6, 8.4, 9.2), ry = T(stage, 6.6, 7.2, 7.8), cy = 26.8 - ry + h;
    baseLeaves(g, P, C.leaf);
    const ty = cy - ry + 0.4;
    if (stage === 0) piece(g, t => { t.ell(cx - 1.6, ty - 1.4, 2.6, 1.3, flat(C.leaf), -2.3); t.ell(cx + 1.2, ty - 1.6, 2.4, 1.2, flat(C.leaf), -0.8); });
    if (stage === 2) piece(g, t => { t.poly([[cx - 2.6, ty + 1.2], [cx - 2.6, ty - 1.6], [cx - 1, ty - 0.6], [cx, ty - 4.4 - f * 0.6], [cx + 1.2, ty - 1], [cx + 2.8, ty - 2.6 + f * 0.6], [cx + 2.8, ty + 1.2]], F[1]); shadeShape(t, F, 0.4, 0.6); t.ell(cx, ty, 1.2, 1.1, F[0], 0, inside(t)); });
    if (stage === 1) { puff(g, cx - rx - 0.2, ty - 0.4 - f * 0.5, 0.8, ['#ffffff', '#ffffff', '#dfe6ee']); puff(g, cx + rx + 0.6, ty - 2.2 + f * 0.5, 0.65, ['#ffffff', '#ffffff', '#dfe6ee']); }
    const cracks = [[[-0.96, -0.3], [-0.74, -0.12], [-0.82, 0.08]], [[0.94, -0.42], [0.74, -0.24], [0.84, -0.04]], [[0.1, -0.98], [0.26, -0.8], [0.12, -0.66]]]; // short glowing cracks, away from the face
    piece(g, t => { // a lumpy potato: a big oval + two soft bumps (only a little wider than tall)
      t.ell(cx, cy, rx, ry, M[1]); t.ell(cx - rx * 0.42, cy + ry * 0.22, rx * 0.6, ry * 0.78, M[1]); t.ell(cx + rx * 0.4, cy - ry * 0.12, rx * 0.6, ry * 0.84, M[1], 0.3);
      shadeShape(t, M, rx * 0.14, ry * 0.16); shine(t, cx - rx * 0.45, cy - ry * 0.52, rx * 0.2, ry * 0.12, M[0]);
      for (const [dx, dy] of [[-0.66, -0.12], [0.6, -0.5], [0.15, -0.78]]) t.ell(cx + dx * rx, cy + dy * ry, 0.45, 0.3, M[2], 0, inside(t)); // potato eyes
      if (stage === 2) for (const pts of cracks) stroke(t, pts.map(([a, b]) => [cx + a * rx, cy + b * ry]), 0.5, 0.36, F[2]);
    });
    if (stage === 2) for (const pts of cracks) stroke(g, pts.map(([a, b]) => [cx + a * rx, cy + b * ry]), 0.22, 0.16, '#fff0a0');
    if (stage === 0) { sparkle(g, cx - rx - 1.4, cy - ry + 1 + f, 0.7, '#ffd08a'); sparkle(g, cx + rx + 1.4, cy - 1.6 - f, 0.6, '#ffd08a'); }
    if (stage === 1) { // crinkly foil round the bottom, a pat of butter melting on top
      piece(g, t => {
        const fy = cy + ry * 0.56, n = 12, pts = [[cx - rx - 0.4, fy + 0.6]]; for (let i = 0; i <= n; i++) pts.push([cx - rx + i * rx * 2 / n, fy - 0.5 + (i % 2 ? 1.1 : 0) + (i % 4 === 1 ? 0.2 : 0)]); pts.push([cx + rx + 0.4, fy + 0.6], [cx + rx * 0.7, cy + ry + 0.4], [cx - rx * 0.7, cy + ry + 0.4]);
        t.poly(pts, STEEL[1]); t.ell(cx, cy + ry * 0.62, rx + 0.3, ry * 0.5, STEEL[1], 0, (x, y) => y >= fy + 0.5);
        shadeShape(t, STEEL, 0.8, 0.9);
        for (const [x, y] of [[cx - rx * 0.5, fy + 0.6], [cx + rx * 0.02, fy + 0.7], [cx + rx * 0.5, fy + 0.6]]) { t.dot(x, y, WHITE); t.dot(x + 0.5, y, WHITE); t.dot(x, y + 0.5, WHITE); } // bright foil glints
        for (const x of [-0.42, 0.18]) stroke(t, [[cx + x * rx, fy + 1.8], [cx + x * rx + 0.8, fy + 2.8], [cx + x * rx + 0.3, fy + 3.6]], 0.2, 0.2, STEEL[2]); // crinkles
      });
      piece(g, t => { t.poly([[cx - 2.6, ty + 0.4], [cx + 2.2, ty - 0.2], [cx + 2.6, ty + 1.6], [cx - 2.2, ty + 2.2]], '#fff0a0'); t.ell(cx + 1.8, ty + 2.4, 0.6, 1.0, '#fff0a0'); shadeShape(t, ['#fffad0', '#fff0a0', '#f2d466'], 0.4, 0.5); });
    }
    const ex = cx + 0.8, ey = cy + ry * (stage === 1 ? 0.02 : 0.16), er = ry;
    eyes(g, ex, ey, er, P, { mood: 'sleepy', blush: false });
    A.blush(g, ex - 0.2, ey + er * (stage === 1 ? 0.32 : 0.42), { sp: er, col: '#ffa890', w: 1.8, h: 0.9 });
    A.chibiMouth(g, ex + 0.1, ey + er * 0.5, P.mouth || 'smile', 2);
    return { hx: R(cx), hy: R(cy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(cx), y: R(cy - ry * 0.55 + (stage === 1 ? -1 : 0)), w: R(rx * 1.7) } };
  };
})();
