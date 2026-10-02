// art-zombies.js — PVZ Garden zombie + Zomboss art. Loaded after art-core.js.
// PX.ZOMBIE_ART[kind] = function (g, P, L): draw on a 32x32 PX.Grid. FACES RIGHT (screens flip it), feet on rows 29-31,
//   anchor bottom-centre (16, 31), a normal zombie is about 27 px tall. Every kind is the shared body (zombie()) plus its accessory.
//   P: walk + frame (0|1) legs alternate and arms bob; arms ('up' | 'out' | 'paddle' | default forward); eyes ('happy' | 'closed' |
//   'sad' | 'brave' | 'blink'); mouth ('open' | 'o' | 'flat' | 'grin' | default gappy one-tooth mouth).
// PX.BOSS_ART[id] = { w: 48, h: 48, draw(g, f) }: 48x48 Zombot sprites, facing right, anchor bottom-centre, f = animation frame 0|1.
// Style: chunky, cute, 1px ink outline (piece / outline), 3-tone ramps. Goofy, kid-friendly: no blood, no gore, no skulls.
(function () {
  'use strict';
  const { Grid, INK, stroke, line, starPts } = PX;
  const mixHex = PX.mixHex;
  const piece = (G, draw) => { const t = new Grid(G.w, G.h); draw(t); t.outline(); G.merge(t); return G; };
  const inside = t => (x, y) => t.filled(x, y);
  const shade = (t, cx, cy, rx, ry, R, rot) => t.ell(cx, cy, rx, ry, R, rot || 0, inside(t));
  const R3 = c => [mixHex(c, '#ffffff', 0.35), c, mixHex(c, INK, 0.4)];
  const dk = (R, k) => R.map(c => mixHex(c, INK, k));
  const rotP = (pts, cx, cy, a) => { const c = Math.cos(a), s = Math.sin(a); return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]); };
  const lerp2 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  const setIf = (t, list, c) => { for (const [x, y] of list) if (t.filled(x, y) || t.get(x, y) === INK) t.set(x, y, c); };
  const W = '#ffffff', MOUTH_IN = '#7a2440';

  // ---------------- palette ----------------
  const SKIN = ['#c6d6b4', '#8fa67e', '#596c50']; // grey-green zombie skin
  const SUIT = ['#a8825a', '#7a5636', '#4e3420'];
  const SHIRT = ['#ffffff', '#e6e2d2', '#b0aa94'];
  const TIE = ['#f06060', '#d03636', '#8a1e26'];
  const PANTS = ['#7c7a92', '#56546c', '#36344a'];
  const SHOE = ['#6a5850', '#3e302c', '#221a1a'];
  const METAL = ['#eef2f6', '#a9b4c0', '#5f6b7a'];
  const CONE = ['#ffb46a', '#f27a1e', '#b0480e'];
  const RED = ['#ff8a80', '#d8323a', '#8a1a26'];
  const GOLD = ['#fff2a0', '#f2c43a', '#b07a18'];
  const WOOD = ['#d8a86a', '#a8743e', '#6a4424'];
  const BLUE = ['#8ab4ff', '#3a64d0', '#22347a'];
  const FUR = ['#ffffff', '#e2ecf8', '#a4b4c8'];
  const BANDAGE = ['#fbf4dc', '#ddd0a8', '#a0906a'];

  // ---------------- face ----------------
  // Big front eye (3x3) + small back eye (2x2), dark rims, tiny pupils. G.e0/e1 = left column of small/big eye, G.by = big eye top row.
  function eyes(t, G, P, o) {
    o = o || {};
    const k = INK, e0 = G.e0, e1 = G.e1, by = G.by, sy = by + 1, ring = o.ring || G.SK[2], pupil = o.pupil || k, white = o.white || W;
    const kind = P.eyes, bigOn = !o.noBig, smallOn = !o.noSmall;
    if (kind === 'happy') { if (bigOn) setIf(t, [[e1, by + 2], [e1 + 1, by + 1], [e1 + 2, by + 2]], o.line || k); if (smallOn) setIf(t, [[e0 - 1, sy + 1], [e0, sy], [e0 + 1, sy + 1]], o.line || k); return; }
    if (kind === 'closed') { if (bigOn) setIf(t, [[e1, by], [e1 + 2, by], [e1 + 1, by + 1], [e1, by + 2], [e1 + 2, by + 2]], o.line || k); if (smallOn) setIf(t, [[e0 - 1, sy - 1], [e0 + 1, sy - 1], [e0, sy], [e0 - 1, sy + 1], [e0 + 1, sy + 1]], o.line || k); return; }
    if (kind === 'blink') { if (bigOn) setIf(t, [[e1, by + 2], [e1 + 1, by + 2], [e1 + 2, by + 2]], o.line || k); if (smallOn) setIf(t, [[e0, sy + 1], [e0 + 1, sy + 1]], o.line || k); return; }
    const big = [], small = [];
    for (let y = by; y < by + 3; y++) for (let x = e1; x < e1 + 3; x++) big.push([x, y]);
    for (let y = sy; y < sy + 2; y++) for (let x = e0; x < e0 + 2; x++) small.push([x, y]);
    const all = (bigOn ? big : []).concat(smallOn ? small : []), isE = new Set(all.map(([x, y]) => x + ',' + y));
    if (ring !== 'none') for (const [x, y] of all) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!isE.has((x + dx) + ',' + (y + dy)) && t.filled(x + dx, y + dy)) t.set(x + dx, y + dy, ring);
    t.px(all, white);
    if (bigOn) t.set(e1 + 2, by + 1, pupil);
    if (smallOn) t.set(e0 + 1, sy + 1, pupil);
    if (kind === 'sad') { if (bigOn) setIf(t, [[e1, by - 2], [e1 + 1, by - 2], [e1 + 2, by - 1]], k); if (smallOn) setIf(t, [[e0 + 1, sy - 2], [e0, sy - 1]], k); }
    if (kind === 'brave') { if (bigOn) setIf(t, [[e1, by - 1], [e1 + 1, by - 2], [e1 + 2, by - 2]], k); if (smallOn) setIf(t, [[e0 + 1, sy - 1], [e0, sy - 2]], k); }
  }
  function mouth(t, G, P, o) {
    o = o || {};
    const k = o.ink || INK, x = G.mx, y = G.my, tooth = o.tooth || W, R = o.inner || MOUTH_IN;
    switch (P.mouth) {
      case 'open': t.px([[x, y], [x + 2, y], [x + 4, y], [x, y + 1], [x + 4, y + 1], [x + 1, y + 2], [x + 2, y + 2], [x + 3, y + 2]], k); t.px([[x + 1, y], [x + 3, y]], tooth); t.px([[x + 1, y + 1], [x + 2, y + 1], [x + 3, y + 1]], R); break;
      case 'o': t.px([[x + 1, y], [x + 2, y], [x, y + 1], [x + 3, y + 1], [x + 1, y + 2], [x + 2, y + 2]], k); t.px([[x + 1, y + 1], [x + 2, y + 1]], R); break;
      case 'flat': t.px([[x, y + 1], [x + 1, y + 1], [x + 2, y + 1], [x + 3, y + 1], [x + 4, y + 1]], k); break;
      case 'grin': t.px([[x, y], [x + 3, y], [x + 5, y], [x + 1, y + 1], [x + 2, y + 1], [x + 3, y + 1], [x + 4, y + 1]], k); t.px([[x + 1, y], [x + 2, y], [x + 4, y]], tooth); break;
      default: t.px([[x, y], [x + 1, y], [x + 3, y], [x + 4, y], [x + 1, y + 1], [x + 2, y + 1], [x + 3, y + 1]], k); t.set(x + 2, y, tooth);
    }
  }

  // ---------------- the shared body ----------------
  // o: s (body scale, 1 = normal), hs (head scale), skin/suit/pants/shoe ramps, sleeve ('long' | 'short' | 'none'), arms (force a pose),
  //    holdArms (default pose becomes 'hold': hands close in front, for two-handed props), hdx/hdy (nudge head), eyeDy/mouthDy,
  //    bareFoot ('front' | 'back': that foot has lost its shoe), hook (front hand is a pirate hook),
  //    noShirt, hair (false = bald top), face (false = kind draws its own), eyeOpt/mouthOpt, legs ('pants' | 'shorts'),
  //    layer hooks (each gets (g, G)): back, torso (replaces the jacket; gets (t, G) inside a piece), head (replaces the head shape,
  //    (t, G)), mid0 (after torso), hat (after head), mid (before front arm), front (after front arm), post (paint details last).
  // Returns G: geometry for props (hx, hy, hr, ry, top, e0, e1, by, mx, my, hand, hand2, X, Y, s, waist...).
  function zombie(g, P, o) {
    P = P || {}; o = o || {};
    const s = o.s || 1, hs = o.hs || s, ox = 16 + (o.dx || 0);
    const X = x => ox + (x - 16) * s, Y = y => 31 - (31 - y) * s, T = ([x, y]) => [X(x), Y(y)];
    const SK = o.skin || SKIN, SU = o.suit || SUIT, PA = o.pants || PANTS, SH = o.shoe || SHOE;
    const walk = !!P.walk, f = P.frame ? 1 : 0;
    const hr = 5.6 * hs, ry = 5.4 * hs;
    const hx = X(16.5) + (o.hdx || 0), hy = Y(14.6) - ry + 0.2 + (o.hdy || 0);
    const by = Math.round(hy) - 2 + (o.eyeDy || 0), e0 = Math.round(hx) - 2;
    const G = { P, o, s, hs, X, Y, T, SK, SU, PA, SH, hx, hy, hr, ry, top: Math.ceil(hy - ry - 0.5), e0, e1: e0 + 3, by, mx: e0 + 1, my: by + 4 + (o.mouthDy || 0), walk, f };
    // ---- pose ----
    let A = o.arms || P.arms;
    if (!A && o.holdArms) A = 'hold';
    if (!A && o.defArms && !walk) A = o.defArms;
    const FS = [17.8, 16.3], BS = [14, 16], b = walk && f ? 1 : 0;
    let fa, ba;
    if (A === 'up') { fa = [FS, [22.8, 13.2], [24.8, 8.4]]; ba = [BS, [11.2, 12.4], [9.6, 8.2]]; }
    else if (A === 'out') { fa = [FS, [21.8, 18.6], [25.2, 21]]; ba = [BS, [10.4, 18.2], [7.2, 20.6]]; }
    else if (A === 'paddle') { if (f) { fa = [FS, [19.6, 21], [17.6, 24.2]]; ba = [BS, [17.6, 11.8], [22.4, 8.6]]; } else { fa = [FS, [22, 12.8], [25.6, 9.6]]; ba = [BS, [11.2, 19.6], [8.4, 22.2]]; } }
    else if (A === 'hold') { fa = [FS, [20.4, 20 - b], [22.8, 18.8 - b]]; ba = [BS, [18, 18.4 + b * 0.5], [21.8, 16 + b * 0.5]]; }
    else if (A === 'point') { fa = [FS, [23.2, 13.8], [26.4, 9.6]]; ba = [BS, [13, 20], [15.6, 22.4]]; }
    else { fa = [FS, [21.8, 16.4 - b], [25.8, 16.4 - b]]; ba = [BS, [19.2, 15.2 + b], [24.2, 14.4 + b]]; }
    G.pose = A || 'fwd'; G.fa = fa.map(T); G.ba = ba.map(T);
    const HB = [14, 23.4], HF = [17.4, 23.4];
    const fb = walk ? (f ? 18.2 : 12) : 13.2, ff = walk ? (f ? 14 : 20) : 18.8;
    G.waist = Y(23.6); G.chest = [X(17.6), Y(18)];
    const handOf = p => { const [, q, c] = p, d = Math.hypot(c[0] - q[0], c[1] - q[1]) || 1; return [c[0] + (c[0] - q[0]) / d * 0.7, c[1] + (c[1] - q[1]) / d * 0.7]; };
    G.hand = handOf(G.fa); G.hand2 = handOf(G.ba);
    // ---- parts ----
    const sleeve = o.sleeve || 'long';
    const drawArm = (t, p, SUc, SKc) => {
      const [a, q, c] = p, r = (o.armR || 1.75) * s, rs = Math.max(0.95, 1.05 * s);
      if (sleeve === 'none') {
        stroke(t, [a, q, c], Math.max(1.05, 1.3 * s), rs, SKc[1]);
        stroke(t, [a, q, c].map(v => [v[0] - 0.15, v[1] - 0.35]), Math.max(0.6, 0.8 * s), Math.max(0.5, 0.6 * s), SKc[0]);
      } else {
        const cuff = sleeve === 'short' ? lerp2(a, q, 0.6) : lerp2(q, c, 0.42);
        stroke(t, sleeve === 'short' ? [cuff, q, c] : [cuff, c], rs, rs * 0.92, SKc[1]);
        const sp = sleeve === 'short' ? [a, cuff] : [a, q, cuff];
        stroke(t, sp.map(v => [v[0], v[1] + 0.45]), r, r * 0.85, SUc[2]);
        stroke(t, sp.map(v => [v[0] - 0.1, v[1] - 0.3]), r * 0.84, r * 0.7, SUc[1]);
      }
      const h = handOf(p);
      if (o.hook && p === G.fa) { // a leather cuff and a curved silver hook pointing the way the arm reaches
        const [, q, c] = p, L = Math.hypot(c[0] - q[0], c[1] - q[1]) || 1, d = [(c[0] - q[0]) / L, (c[1] - q[1]) / L], n = [d[1], -d[0]];
        const at = (k, m) => [h[0] + d[0] * k + n[0] * m, h[1] + d[1] * k + n[1] * m];
        t.ell(h[0] - d[0] * 0.4, h[1] - d[1] * 0.4, 1.4, 1.4, WOOD);
        const pts = [at(0.8, 0), at(2, 0), at(2.9, 0.9), at(2.9, 2), at(2, 2.8)];
        for (let i = 0; i < pts.length - 1; i++) line(t, Math.round(pts[i][0]), Math.round(pts[i][1]), Math.round(pts[i + 1][0]), Math.round(pts[i + 1][1]), METAL[1]);
        t.set(Math.round(pts[1][0]), Math.round(pts[1][1]), METAL[0]);
        return;
      }
      t.ell(h[0], h[1], Math.max(1.15, 1.6 * s), Math.max(1.05, 1.4 * s), SKc);
    };
    const leg = (t, hip, fx, R, S) => {
      const h = T(hip), a = T([fx, 28.6]);
      stroke(t, [h, a], Math.max(1.1, 1.9 * s), Math.max(1, 1.6 * s), R[1]);
      shade(t, (h[0] + a[0]) / 2 - 0.5, (h[1] + a[1]) / 2 - 0.5, 3 * s + 0.5, 4 * s + 0.5, R);
      if (o.legs === 'shorts') { const k = lerp2(h, a, 0.5); stroke(t, [k, a], Math.max(0.95, 1.35 * s), Math.max(0.9, 1.25 * s), G.legSkin ? G.legSkin[1] : SK[1]); if (o.socks) stroke(t, [lerp2(k, a, 0.6), a], Math.max(0.95, 1.4 * s), Math.max(0.9, 1.3 * s), o.socks); }
      if (S === 'bare') { // lost a shoe: a bare grey-green foot with toes
        const F = R === PA ? SK : dk(SK, 0.14), fx0 = X(fx + 0.9), fy = Y(29.6);
        t.ell(fx0, fy, Math.max(1.6, 2.3 * s), Math.max(1.1, 1.25 * s), F);
        const tx = Math.round(fx0 + 1.6 * s), ty = Math.round(fy - 0.6);
        t.set(tx, ty, F[0]); t.set(tx + 1, ty, F[1]); t.set(tx - 1, ty, F[2]);
      } else t.ell(X(fx + 0.9), Y(29.6), Math.max(1.6, 2.4 * s), Math.max(1.1, 1.3 * s), S);
    };
    const jacket = (t, G) => {
      const Q = pts => pts.map(T);
      t.poly(Q([[12.2, 14.4], [19.2, 14.4], [20.6, 16.4], [21, 24.4], [10.6, 24.4], [10.8, 16.4]]), SU[1]);
      shade(t, X(15.2), Y(18.4), 6.6 * s, 7 * s, SU);
      if (!o.noShirt) {
        const SR = o.shirt || SHIRT;
        t.poly(Q([[15.6, 14.4], [20.4, 14.4], [20.9, 17.6], [18.6, 23.4]]), SR[1]); shade(t, G.X(17.4), G.Y(17), 3.4, 5, SR);
        for (let y = 0; y < 32; y++) for (let x = 1; x < 32; x++) if (SR.includes(t.get(x, y)) && SU.includes(t.get(x - 1, y))) t.set(x - 1, y, SU[2]);
        if (o.tie !== false) { // a 2px tie: knot on top, lit left / shaded right, pointed tip
          const TI = o.tie || TIE, tx = Math.round(X(17.8)), ty = Math.round(Y(15.2));
          t.px([[tx, ty], [tx + 1, ty]], TI[0]); t.set(tx + 1, ty, TI[1]);
          for (let y = ty + 1; y <= ty + 5; y++) { t.set(tx, y, TI[1]); t.set(tx + 1, y, TI[2]); }
          t.set(tx, ty + 1, TI[2]); t.set(tx + 1, ty + 1, TI[2]); // pinch under the knot
          t.set(tx, ty + 6, TI[2]);
        }
      }
      tear(t, SU);
    };
    // torn hem: nibble a few pixels off the bottom row of the jacket
    const tear = (t, R) => {
      let yb = -1; for (let y = 31; y >= 0 && yb < 0; y--) for (let x = 0; x < 32; x++) if (R.includes(t.get(x, y))) { yb = y; break; }
      if (yb < 0) return;
      for (let x = 1; x < 31; x++) if ((x * 5 + 2) % 7 === 0 && R.includes(t.get(x - 1, yb)) && R.includes(t.get(x, yb)) && R.includes(t.get(x + 1, yb))) t.set(x, yb, null);
    };
    G.tear = tear; G.jacket = jacket; G.drawArm = drawArm;
    const headShape = (t, G) => {
      t.ell(G.hx + 1.4 * hs, G.hy + 2.8 * hs, 3.8 * hs, 2.6 * hs, SK); // jaw juts forward
      t.ell(G.hx, G.hy, G.hr, G.ry, SK);
      const ex = Math.round(G.hx - G.hr * 0.55), ey = Math.round(G.hy + 0.6);
      t.px([[ex, ey - 1], [ex - 1, ey], [ex, ey + 1]], SK[2]);
    };
    // ---- draw, back to front ----
    if (o.back) o.back(g, G);
    if (!o.noBackArm) piece(g, t => drawArm(t, G.ba, dk(o.sleeveCol || SU, 0.22), dk(SK, 0.14)));
    if (o.legs !== 'none') { piece(g, t => leg(t, HB, fb, dk(PA, 0.22), o.bareFoot === 'back' ? 'bare' : SH)); piece(g, t => leg(t, HF, ff, PA, o.bareFoot === 'front' ? 'bare' : SH)); }
    if (o.belowTorso) o.belowTorso(g, G);
    piece(g, t => (o.torso || jacket)(t, G));
    if (o.mid0) o.mid0(g, G);
    piece(g, t => { (o.head || headShape)(t, G); if (o.face !== false) { eyes(t, G, P, o.eyeOpt); mouth(t, G, P, o.mouthOpt); } });
    if (o.hair !== false && !o.hat) { const x = Math.round(G.hx) - 1, y = G.top - 2; g.px([[x, y], [x - 1, y - 1], [x - 2, y - 1]], INK); g.px([[x - 3, y + 2], [x - 2, y + 2], [x - 2, y + 3]].filter(([a, c]) => g.filled(a, c)), G.SK[2]); }
    if (o.hat) o.hat(g, G);
    if (o.mid) o.mid(g, G);
    if (!o.noFrontArm) piece(g, t => drawArm(t, G.fa, o.sleeveCol || SU, SK));
    if (o.front) o.front(g, G);
    if (o.post) o.post(g, G);
    return G;
  }
  // redraw a hand on top (gripping a prop)
  function handOver(g, G, which) {
    const h = which === 2 ? G.hand2 : G.hand, SKc = which === 2 ? dk(G.SK, 0.14) : G.SK, s = G.s;
    piece(g, t => t.ell(h[0], h[1], Math.max(1.15, 1.6 * s), Math.max(1.05, 1.4 * s), SKc));
  }

  const ZA = PX.ZOMBIE_ART;
  const tufts = (t, cx, cy, rx, ry, R, n, from, to, r) => { for (let i = 0; i < n; i++) { const a = from + (to - from) * i / (n - 1); t.ell(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, r, r, R); } };

  // ---------------- Basic ----------------
  ZA.basic = (g, P) => zombie(g, P, { bareFoot: 'front' });

  // ---------------- Flag: a red flag on a pole in the front hand ----------------
  // the zombie flag: a tattered maroon banner with a big pink brain on it
  const FLAG = ['#e8505a', '#b02838', '#6a1424'], BRAIN = ['#ffd4e0', '#f490b0', '#b8507a'];
  // a 6x4 cartoon brain (two pink lobes with squiggly folds), top-left at x, y
  const brainAt = (g, x, y) => g.str(['.LLLL.', 'LmdmmL', 'mdmmdm', '.mmdm.'], x, y, { L: BRAIN[0], m: BRAIN[1], d: BRAIN[2] });
  ZA.flag = (g, P) => zombie(g, P, {
    front(g, G) {
      // the pole leans a little forward so the banner flies clear of the face
      const [hx, hy] = G.hand, top = Math.max(1, Math.round(hy - 15)), bx = hx + 0.4, b = [bx, Math.min(29.4, hy + 5)], tp = [Math.min(29.6, bx + 2.6), top];
      const x = Math.round(tp[0]), wav = P.frame ? 1 : 0, L = x - 9;
      piece(g, t => {
        t.poly([[x + 0.5, top], [L + 0.4, top + wav * 0.8], [L + 1.6, top + 2], [L, top + 3.6 - wav * 0.4], [L + 1.4, top + 4.6], [L + 0.4, top + 6.4 - wav * 0.6], [x + 0.5, top + 6]], FLAG[1]);
        shade(t, x - 4, top + 3, 6, 4.4, FLAG);
      });
      piece(g, t => line(t, Math.round(b[0]), Math.round(b[1]), x, top, WOOD[1]));
      brainAt(g, x - 7, top + 1);
      g.set(x, top - 1, GOLD[1]);
      handOver(g, G, 1);
    },
  });

  // ---------------- Conehead ----------------
  ZA.conehead = (g, P) => zombie(g, P, {
    hdy: 1, hat(g, G) {
      piece(g, t => {
        const cx = G.hx - 0.4, b = G.by - 0.4, a = -0.12;
        t.poly(rotP([[cx - 4.4, b], [cx + 4.4, b], [cx + 0.9, b - 7.6], [cx - 0.9, b - 7.6]], cx, b, a), CONE[1]);
        shade(t, cx - 0.6, b - 3.6, 5.6, 6.4, CONE, a);
        t.poly(rotP([[cx - 3.1, b - 2.6], [cx + 3.1, b - 2.6], [cx + 2.4, b - 4.5], [cx - 2.4, b - 4.5]], cx, b, a), '#fff2dc');
        t.poly(rotP([[cx - 6.2, b - 0.6], [cx + 6.2, b - 0.6], [cx + 6.2, b + 1], [cx - 6.2, b + 1]], cx, b, a), CONE[2]);
        t.poly(rotP([[cx - 6.2, b - 0.6], [cx + 6.2, b - 0.6], [cx + 6.2, b + 0.1], [cx - 6.2, b + 0.1]], cx, b, a), CONE[1]);
      });
    },
  });

  // ---------------- Buckethead ----------------
  ZA.buckethead = (g, P) => zombie(g, P, {
    hdy: 1, hat(g, G) {
      const cx = G.hx - 0.3, b = G.by + 0.2, a = -0.08, H = 7.6;
      // the wire handle hangs down the back of the head (behind the pail)
      piece(g, t => { const p = rotP([[cx - 4.6, b - 3.6], [cx - 6.6, b - 1.2], [cx - 5.6, b + 2]], cx, b, a); for (let i = 0; i < 2; i++) line(t, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1], METAL[2]); });
      piece(g, t => {
        t.poly(rotP([[cx - 5.8, b], [cx + 5.8, b], [cx + 4.4, b - H], [cx - 4.4, b - H]], cx, b, a), METAL[1]);
        shade(t, cx - 0.8, b - 4.2, 6.6, 7, METAL, a);
        t.poly(rotP([[cx - 6.4, b - 1.4], [cx + 6.4, b - 1.4], [cx + 6.4, b + 0.2], [cx - 6.4, b + 0.2]], cx, b, a), METAL[1]); // rolled rim
        t.poly(rotP([[cx - 6.4, b - 0.6], [cx + 6.4, b - 0.6], [cx + 6.4, b + 0.2], [cx - 6.4, b + 0.2]], cx, b, a), METAL[2]);
        t.poly(rotP([[cx - 4.8, b - H + 1.2], [cx + 4.8, b - H + 1.2], [cx + 4.8, b - H + 2], [cx - 4.8, b - H + 2]], cx, b, a), METAL[2]); // ridge near the base
        const hl = rotP([[cx - 2.8, b - 5], [cx - 2.8, b - 2.4]], cx, b, a); line(t, hl[0][0], hl[0][1], hl[1][0], hl[1][1], '#ffffff'); t.set(Math.round(hl[1][0]), Math.round(hl[1][1]), METAL[0]);
      });
      const d = rotP([[cx + 2.6, b - 4.4]], cx, b, a)[0]; g.set(Math.round(d[0]), Math.round(d[1]), METAL[2]); g.set(Math.round(d[0]) + 1, Math.round(d[1]) + 1, METAL[0]); // a little dent
    },
  });

  // ---------------- Newspaper: glasses, white hair tufts, an open newspaper held in front ----------------
  ZA.newspaper = (g, P) => zombie(g, P, {
    holdArms: true, hair: false, suit: ['#9a9a7a', '#6e6e52', '#454532'], tie: ['#9ad0ff', '#4a8ad8', '#2a4a8a'],
    hat(g, G) {
      piece(g, t => { t.ell(G.hx - G.hr + 0.6, G.hy - 0.4, 1.3, 1.8, ['#ffffff', '#e8e8f0', '#b4b4c4']); });
      g.px([[Math.round(G.hx) - 1, G.top - 2], [Math.round(G.hx), G.top - 3], [Math.round(G.hx) + 1, G.top - 2]], '#e8e8f0');
      // glasses
      const { e0, e1, by } = G, k = INK;
      g.px([[e0 - 1, by], [e0, by], [e0 + 1, by], [e0 + 2, by], [e1, by - 1], [e1 + 1, by - 1], [e1 + 2, by - 1], [e1 + 3, by], [e1 + 3, by + 1], [e1 + 3, by + 2], [e1 - 1, by], [e0 - 1, by + 1], [e0 - 1, by + 2], [e0 - 2, by]], k);
    },
    front(g, G) {
      const open = G.pose === 'hold';
      if (open) {
        const x0 = Math.round(G.hand[0]) - 1, y0 = Math.round(G.hand2[1]) - 3;
        piece(g, t => {
          t.poly([[x0, y0 + 1], [x0 + 9, y0], [x0 + 9.4, y0 + 12], [x0 + 0.4, y0 + 12.6]], '#f2eedc');
          shade(t, x0 + 3, y0 + 4, 8, 9, ['#ffffff', '#ece6d0', '#c4bca0']);
          for (let i = 0; i < 4; i++) for (let x = x0 + 1; x < x0 + 9; x++) if ((x + i) % 4 !== 0) t.set(x, y0 + 3 + i * 2 + (x > x0 + 4 ? 0 : 1), '#8c8a94');
          t.rect(x0 + 1, y0 + 2, 3, 1, '#4a4858');
          for (let y = y0 + 1; y < y0 + 12; y++) t.set(x0 + 5, y, '#c4bca0');
        });
        handOver(g, G, 1); handOver(g, G, 2);
      } else {
        const [hx, hy] = G.hand;
        piece(g, t => { t.poly([[hx - 1, hy - 4], [hx + 3, hy - 4.6], [hx + 3.4, hy + 1.6], [hx - 0.6, hy + 2]], '#f2eedc'); for (let y = Math.round(hy - 3); y < hy + 1; y += 2) t.rect(Math.round(hx), y, 2, 1, '#8c8a94'); });
        handOver(g, G, 1);
      }
    },
  });

  // ---------------- Screen Door: a mesh screen door held up as a shield ----------------
  ZA.screendoor = (g, P) => zombie(g, P, {
    holdArms: true,
    front(g, G) {
      const x0 = 20, y0 = 11 + (G.walk && G.f ? 1 : 0), w = 9, h = 17;
      piece(g, t => {
        t.rect(x0, y0, w, h, '#dcdce4');
        for (let y = y0 + 2; y < y0 + h - 2; y++) for (let x = x0 + 2; x < x0 + w - 2; x++) t.set(x, y, (x + y) % 2 ? '#6a7484' : '#8a94a4');
        for (let x = x0 + 2; x < x0 + w - 2; x++) t.set(x, y0 + 8, '#dcdce4');
        for (let y = y0; y < y0 + h; y++) { t.set(x0, y, '#f4f4f8'); t.set(x0 + w - 1, y, '#a4a4b4'); }
        for (let x = x0; x < x0 + w; x++) { t.set(x, y0, '#f4f4f8'); t.set(x, y0 + h - 1, '#a4a4b4'); }
        t.set(x0 + 2, y0 + 3, '#ffffff'); t.set(x0 + 3, y0 + 4, '#ffffff');
      });
      g.px([[x0 + w - 3, y0 + 8], [x0 + w - 3, y0 + 9]], GOLD[1]);
      if (G.pose === 'hold') { handOver(g, G, 1); handOver(g, G, 2); }
    },
  });

  // ---------------- Football: red helmet with a face guard, shoulder pads, red jersey ----------------
  ZA.football = (g, P) => zombie(g, P, {
    suit: RED, noShirt: true, pants: ['#f4f4f0', '#c8c8c4', '#8a8a90'], sleeve: 'short',
    torso(t, G) {
      const Q = pts => pts.map(G.T);
      t.poly(Q([[11.4, 14.4], [20, 14.4], [21.2, 16.4], [21.2, 24.4], [10.4, 24.4], [10.2, 16.4]]), RED[1]);
      shade(t, G.X(15.2), G.Y(18.4), 7, 7, RED);
      const nx = Math.round(G.X(14.6)), ny = Math.round(G.Y(19));
      t.px([[nx, ny], [nx + 1, ny], [nx + 1, ny + 1], [nx + 1, ny + 2], [nx + 1, ny + 3], [nx, ny + 3], [nx + 2, ny + 3]], '#ffffff');
      for (let x = 0; x < 32; x++) if (t.filled(x, Math.round(G.Y(23.6)))) t.set(x, Math.round(G.Y(23.6)), '#f4f4f0');
    },
    // big shoulder pads sit across the shoulders, behind the head
    mid0(g, G) { piece(g, t => { t.ell(G.X(15.4), G.Y(15), 6.4, 2.8, RED); t.ell(G.X(19.6), G.Y(15.6), 2.8, 2.6, RED); }); },
    hat(g, G) {
      piece(g, t => {
        t.ell(G.hx - 0.5, G.hy - 0.9, G.hr + 0.9, G.ry + 0.5, RED, 0, (x, y) => y <= G.by - 1 || (x < G.e0 - 1 && y <= G.hy + 3.6));
        t.ell(G.hx - G.hr * 0.45, G.hy + 0.6, 1.5, 1.5, ['#ffffff', '#dcdce4', '#9a9aa8']);
      });
      for (let x = 0; x < 32; x++) { const y = G.top; if (g.filled(x, y + 1) && g.get(x, y + 1) !== '#ffffff' && x > G.hx - 3 && x < G.hx + 3) g.set(x, y + 1, '#ffffff'); }
      // face guard: a light metal cage in front of the mouth (two bars + an upright), inked where it sticks out past the face
      const k = '#c8ccd8', kd = '#7a8296', xr = Math.round(G.hx + G.hr) + 1, ya = G.my - 1, yb = G.my + 2;
      for (let x = G.e1; x <= xr; x++) g.set(x, ya, k);
      for (let x = G.mx + 2; x <= xr; x++) g.set(x, yb, kd);
      for (let y = ya; y <= yb; y++) g.set(xr, y, y === ya ? k : kd);
      for (let x = G.e1; x <= xr + 1; x++) for (const y of [ya - 1, ya + 1]) if (!g.get(x, y)) g.set(x, y, INK);
      for (let y = ya - 1; y <= yb + 1; y++) if (!g.get(xr + 1, y)) g.set(xr + 1, y, INK);
      for (let x = G.mx + 2; x <= xr; x++) if (!g.get(x, yb + 1)) g.set(x, yb + 1, INK);
    },
  });

  // ---------------- Pole Vaulter: tank top, sweatband, a long pole ----------------
  ZA.polevault = (g, P) => zombie(g, P, {
    sleeve: 'none', noShirt: true, legs: 'shorts', socks: '#f4f4f0', pants: ['#7aa8ff', '#3a62c8', '#22387a'],
    torso(t, G) {
      const Q = pts => pts.map(G.T);
      // a short white track vest with a red racing stripe; the blue shorts show under it
      t.poly(Q([[12.6, 14.6], [14.4, 14.6], [15.6, 16.6], [17.6, 16.6], [18.6, 14.6], [19.6, 15], [20.2, 17.6], [20.6, 22.8], [11, 22.8], [11.4, 17.6]]), '#ecece4');
      shade(t, G.X(15.4), G.Y(18.2), 6.4, 6.4, ['#ffffff', '#e4e4dc', '#a8a8a4']);
      for (let x = 0; x < 32; x++) for (const yy of [18.6, 19.6]) if (t.filled(x, Math.round(G.Y(yy)))) t.set(x, Math.round(G.Y(yy)), yy < 19 ? '#e0303e' : '#a01c2e');
      t.ell(G.X(16), G.Y(15.4), 1.6, 1, G.SK[1]);
    },
    hat(g, G) {
      // a red sweatband with its knotted ends flying out behind
      const y = G.by - 2, xl = Math.round(G.hx - G.hr);
      for (let x = xl; x <= G.hx + G.hr; x++) if (g.filled(x, y)) g.set(x, y, x < G.hx - 1 ? '#a01c2e' : '#e0303e');
      const fl = G.walk && G.f ? 1 : 0;
      piece(g, t => { t.px([[xl - 1, y], [xl - 2, y - 1 + fl], [xl - 3, y - 1 + fl], [xl - 2, y + 1], [xl - 3, y + 2 - fl]], '#e0303e'); });
    },
    front(g, G) {
      const [hx, hy] = G.hand, [ax, ay] = G.hand2;
      let p0, p1;
      if (G.pose === 'fwd') { p0 = [1.4, hy + 4]; p1 = [30.6, hy - 3.2]; }
      else { p0 = [hx - 2.5, hy + 9]; p1 = [hx + 2.5, Math.max(1, hy - 12)]; }
      // the long red vaulting pole (with a white shine along its top edge)
      piece(g, t => stroke(t, [p0, p1], 0.7, 0.7, RED[1]));
      const vert = Math.abs(p1[1] - p0[1]) > Math.abs(p1[0] - p0[0]);
      line(g, p0[0] - (vert ? 0.5 : 0), p0[1] - (vert ? 0 : 0.5), p1[0] - (vert ? 0.5 : 0), p1[1] - (vert ? 0 : 0.5), '#f25a5a');
      void ax; void ay;
      handOver(g, G, 1); if (G.pose === 'fwd') handOver(g, G, 2);
    },
  });

  // ---------------- Disco: big afro, white disco suit ----------------
  ZA.disco = (g, P) => zombie(g, P, {
    hair: false, defArms: 'point', suit: ['#ffffff', '#e2e2ee', '#a4a4bc'], pants: ['#ffffff', '#dcdcea', '#9c9cb4'], shirt: ['#f0b4ff', '#c46ae8', '#7a34a0'], tie: false,
    shoe: ['#ffffff', '#d8d8e4', '#9a9ab0'], hdx: -0.5,
    back(g, G) {
      const AF = ['#8a5e46', '#4e3226', '#2a1a16'], cx = G.hx - 1.2, cy = G.hy - 2.8;
      piece(g, t => { t.ell(cx, cy, 7, 5.6, AF); tufts(t, cx, cy, 6.6, 5.2, AF, 11, -Math.PI * 1.05, Math.PI * 0.35, 1.7); });
      for (const [x, y] of [[-4, -3], [-1, -4], [2, -3], [-5, 0], [-2, -1]]) { const px = Math.round(cx + x), py = Math.round(cy + y); if (g.filled(px, py)) g.set(px, py, '#9a6e54'); }
    },
    hat(g, G) {
      const AF = ['#8a5e46', '#4e3226', '#2a1a16'];
      piece(g, t => { t.ell(G.hx - 0.4, G.top + 0.6, 5.4, 2.4, AF, 0, (x, y) => y <= G.by - 1); t.ell(G.hx - G.hr + 0.6, G.hy - 0.6, 2.2, 3.4, AF); });
      for (const [x, y] of [[-3, 0], [0, -1], [3, 0], [-5, 2]]) { const px = Math.round(G.hx + x), py = G.top + 1 + y; if (g.filled(px, py)) g.set(px, py, '#9a6e54'); }
    },
    post(g, G) { const x = Math.round(G.X(18.2)), y = Math.round(G.Y(17.6)); g.px([[x, y], [x + 1, y + 1], [x + 2, y]].filter(([a, b]) => g.filled(a, b)), GOLD[1]); },
  });

  // ---------------- Ducky Tube: a rubber-duck float ring round the waist ----------------
  const DUCK = ['#fff6a0', '#f6d02a', '#c49414'];
  ZA.duckytube = (g, P) => zombie(g, P, {
    belowTorso(g, G) { piece(g, t => t.ell(G.X(15.8), G.Y(22.2), 8.2, 2.9, DUCK, 0, (x, y) => y < G.Y(22.2))); },
    mid(g, G) {
      piece(g, t => { t.ell(G.X(15.8), G.Y(22.2), 8.2, 2.9, DUCK, 0, (x, y) => y >= G.Y(22.2) - 0.5); });
      const y = Math.round(G.Y(22.6)); for (const x of [10, 13, 18, 21]) if (g.filled(x, y)) g.set(x, y, '#fffbd0');
    },
    front(g, G) {
      const x = G.X(24.6), y = G.Y(19.4);
      piece(g, t => { t.ell(x, y, 2.4, 2.2, DUCK); });
      piece(g, t => { t.ell(x + 2.6, y + 0.6, 1.5, 0.8, ['#ffb060', '#f27a1e', '#b0480e']); });
      g.set(Math.round(x + 0.5), Math.round(y - 1), INK);
    },
  });

  // ---------------- Snorkel: a dive mask over the eyes and a snorkel tube ----------------
  ZA.snorkel = (g, P) => zombie(g, P, {
    hair: false, suit: ['#7ad0c8', '#2a9a94', '#18605e'], tie: false, shirt: ['#ffffff', '#e6e2d2', '#b0aa94'],
    back(g, G) {
      piece(g, t => { stroke(t, [[G.hx - 3.6, G.my + 1], [G.hx - 4.6, G.by], [G.hx - 4.4, G.top - 1], [G.hx - 3.4, G.top - 3]], 0.9, 0.9, '#f6c83a'); });
      g.px([[Math.round(G.hx - 3.6), G.top - 4], [Math.round(G.hx - 2.6), G.top - 4]], '#f27a1e');
    },
    hat(g, G) {
      const { e0, e1, by } = G;
      for (let x = Math.round(G.hx - G.hr); x < e0 - 1; x++) for (const y of [by + 1]) if (g.filled(x, y)) g.set(x, y, '#2a3a5a');
      const x0 = e0 - 2, x1 = e1 + 3, y0 = by - 1, y1 = by + 3;
      piece(g, t => { t.rect(x0, y0, x1 - x0 + 1, y1 - y0 + 1, '#3a6ab0'); t.px([[x0, y0], [x1, y0], [x0, y1], [x1, y1]], null); t.rect(x0 + 1, y0 + 1, x1 - x0 - 1, y1 - y0 - 1, '#bff0ff'); for (let x = x0 + 1; x < x1; x++) t.set(x, y0, '#5a8ad0'); });
      eyes(g, G, P, { ring: 'none' });
      g.set(e0 - 1, by, '#ffffff'); if (!P.eyes || P.eyes === 'sad' || P.eyes === 'brave') g.set(x1 - 1, y1 - 1, '#e8fcff');
    },
  });

  // ---------------- Balloon: holds a red balloon on a string ----------------
  ZA.balloon = (g, P) => zombie(g, P, {
    suit: ['#a4c0d8', '#6a88a8', '#405872'], tie: ['#ffe080', '#f2c43a', '#b07a18'],
    front(g, G) {
      const [hx, hy] = G.hand, bx = Math.min(27.4, hx + 1.2), byy = Math.max(5, hy - 11.5) + (P.frame ? 0.6 : 0);
      line(g, hx, hy - 1, bx, byy + 4.6, '#f4f4f0');
      piece(g, t => { t.ell(bx, byy, 3.4, 4, RED); t.poly([[bx - 0.8, byy + 4.6], [bx + 0.8, byy + 4.6], [bx, byy + 3.4]], RED[2]); });
      g.px([[Math.round(bx - 1.5), Math.round(byy - 2)], [Math.round(bx - 1.5), Math.round(byy - 1)]], '#ffd0d0');
      handOver(g, G, 1);
    },
  });

  // ---------------- Imp: a small, scrappy zombie ----------------
  ZA.imp = (g, P) => zombie(g, P, {
    s: 0.66, hs: 0.92, eyeDy: -1, sleeve: 'none', noShirt: true, pants: ['#c49464', '#8f603a', '#5a3a22'],
    torso(t, G) {
      const Q = pts => pts.map(G.T);
      t.poly(Q([[12.4, 14.4], [19.4, 14.4], [20.6, 17], [20.6, 24.6], [10.8, 24.6], [11, 17]]), '#ecece0');
      shade(t, G.X(15.2), G.Y(18.6), 5, 5, ['#ffffff', '#e2e0d0', '#a8a490']);
      for (let x = 0; x < 32; x++) if (t.filled(x, Math.round(G.Y(23.2)))) t.set(x, Math.round(G.Y(23.2)), '#8f603a');
      G.tear(t, ['#ffffff', '#e2e0d0', '#a8a490']);
    },
  });

  // ---------------- Yeti: a big white furry zombie ----------------
  ZA.yeti = (g, P) => zombie(g, P, {
    s: 1.1, hs: 1.06, skin: FUR, suit: FUR, pants: FUR, shoe: ['#d8e4f4', '#a4b4cc', '#6a7a94'], noShirt: true, hair: false, armR: 2.2, sleeveCol: FUR,
    torso(t, G) {
      t.ell(G.X(15.6), G.Y(19.6), 6 * G.s, 6.2 * G.s, FUR);
      tufts(t, G.X(15.6), G.Y(19.6), 5.8, 6, FUR, 9, 0.1, Math.PI - 0.1, 1.4);
      t.ell(G.X(17.4), G.Y(20), 2.6, 3.6, ['#e8f0fc', '#c8d8ec', '#9aaac4']);
    },
    head(t, G) {
      t.ell(G.hx, G.hy, G.hr, G.ry, FUR);
      tufts(t, G.hx, G.hy, G.hr - 0.4, G.ry - 0.4, FUR, 7, Math.PI * 0.7, Math.PI * 1.9, 1.5);
      t.ell(G.hx + 1.8, G.hy + 0.9, 3.8, 3.6, ['#c4dcf8', '#8eb0dc', '#5a7cb0']);
    },
    eyeOpt: { ring: '#5a78a8' }, mouthOpt: {},
  });

  // ---------------- Pirate: red bandana, eye patch, striped shirt ----------------
  ZA.pirate = (g, P) => zombie(g, P, {
    noShirt: true, suit: ['#f4f0e0', '#d8d2bc', '#9a9480'], pants: ['#8a6a4a', '#5a422c', '#36261a'],
    torso(t, G) {
      const Q = pts => pts.map(G.T);
      t.poly(Q([[12.2, 14.4], [19.2, 14.4], [20.6, 16.4], [21, 24.4], [10.6, 24.4], [10.8, 16.4]]), '#f4f0e0');
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (t.filled(x, y) && y % 2 === 0) t.set(x, y, '#3a5aa8');
      shade(t, G.X(15.2), G.Y(18.4), 6.6, 7, ['#ffffff', '#f4f0e0', '#c8c2ac'], 0);
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (t.filled(x, y) && y % 2 === 0) t.set(x, y, x > 18 ? '#2a4282' : '#3a5aa8');
      for (let x = 0; x < 32; x++) { const y = Math.round(G.Y(22.6)); if (t.filled(x, y)) t.set(x, y, '#4a3020'); }
      t.set(Math.round(G.X(17.6)), Math.round(G.Y(22.6)), GOLD[1]);
      G.tear(t, ['#f4f0e0', '#3a5aa8', '#2a4282', '#ffffff', '#c8c2ac']);
    },
    mouthOpt: { tooth: GOLD[1] }, hook: true,
    hat(g, G) {
      piece(g, t => {
        t.ell(G.hx - 0.3, G.hy - 0.6, G.hr + 0.5, G.ry + 0.1, RED, 0, (x, y) => y <= G.by - 0.5 - (x - G.hx) * 0.12);
        t.ell(G.hx - G.hr - 0.6, G.by - 0.6, 1.4, 1.2, RED);
        stroke(t, [[G.hx - G.hr - 0.8, G.by], [G.hx - G.hr - 2.4, G.by + 2.6]], 0.8, 0.6, RED[2]);
      });
      for (const [dx, dy] of [[-1, -3], [2, -4], [-3, -1], [3, -2]]) { const x = Math.round(G.hx + dx), y = G.top + 2 + dy + 2; if (g.filled(x, y)) g.set(x, y, '#ffffff'); }
      // eye patch over the small eye + strap
      const { e0, by } = G;
      g.rect(e0 - 1, by + 1, 3, 2, INK); g.set(e0, by + 3, INK);
      line(g, e0 - 1, by + 1, Math.round(G.hx - G.hr + 1), by - 1, INK); line(g, e0 + 1, by + 1, G.e1 + 2, by - 1, INK);
    },
  });

  // ---------------- Mummy: wrapped in bandages, one eye peeking out ----------------
  // bandage wraps: slanted bands with a dark seam line every few rows
  const wraps = (t, R, x0) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (t.filled(x, y)) { const k = (y * 2 + Math.floor((x - (x0 || 0)) / 2)) % 6; if (k === 0) t.set(x, y, R[2]); else if (k === 1 && t.get(x, y) !== R[2]) t.set(x, y, R[0]); } };
  ZA.mummy = (g, P) => zombie(g, P, {
    skin: BANDAGE, suit: BANDAGE, pants: BANDAGE, shoe: ['#d8c8a0', '#a8946a', '#6a5a3a'], noShirt: true, hair: false, sleeveCol: BANDAGE,
    torso(t, G) { G.jacket(t, G); wraps(t, BANDAGE); },
    head(t, G) {
      t.ell(G.hx + 1.4 * G.hs, G.hy + 2.8 * G.hs, 3.8, 2.6, BANDAGE); t.ell(G.hx, G.hy, G.hr, G.ry, BANDAGE); wraps(t, BANDAGE, 1);
      for (let y = G.by; y <= G.by + 2; y++) for (let x = G.e1 - 1; x <= G.e1 + 3; x++) if (t.filled(x, y)) t.set(x, y, SKIN[2]);
      for (let x = G.mx + 1; x <= G.mx + 3; x++) for (let y = G.my; y <= G.my + 1; y++) if (t.filled(x, y)) t.set(x, y, SKIN[1]);
    },
    eyeOpt: { noSmall: true, ring: SKIN[2] }, mouthOpt: {},
    post(g, G) {
      for (let x = 0; x < 32; x++) for (let y = 24; y < 29; y++) if (g.filled(x, y) && (y * 2 + Math.floor(x / 2)) % 6 === 0) g.set(x, y, BANDAGE[2]);
      const [hx, hy] = G.hand, sw = G.walk && G.f ? 0.8 : 0;
      piece(g, t => { stroke(t, [[hx - 1.6, hy + 0.6], [hx - 1.8 + sw, hy + 2.6], [hx - 1 + sw, hy + 4]], 0.55, 0.5, BANDAGE[1]); });
    },
  });

  // ---------------- Ra: Egyptian striped headdress, gold collar, holding a sun staff ----------------
  ZA.ra = (g, P) => zombie(g, P, {
    sleeve: 'none', noShirt: true, hair: false, pants: ['#ffffff', '#e8e2cc', '#b4ac90'], shoe: GOLD,
    torso(t, G) {
      const Q = pts => pts.map(G.T);
      t.poly(Q([[12.2, 14.4], [19.2, 14.4], [20.6, 16.4], [21, 24.4], [10.6, 24.4], [10.8, 16.4]]), '#f4f0e0');
      shade(t, G.X(15.2), G.Y(18.4), 6.6, 7, ['#ffffff', '#ece6d2', '#b4ac90']);
      t.ell(G.X(15.8), G.Y(15.4), 5.4, 2.8, GOLD, 0, (x, y) => t.filled(x, y));
      for (let x = 0; x < 32; x++) { const y = Math.round(G.Y(16.6)); if (t.filled(x, y)) t.set(x, y, x % 2 ? '#3a64d0' : GOLD[1]); }
      for (let x = 0; x < 32; x++) { const y = Math.round(G.Y(22.4)); if (t.filled(x, y)) t.set(x, y, GOLD[1]); }
    },
    back(g, G) {
      const [hx, hy] = G.hand, x = Math.round(hx + 0.4), top = Math.max(6, Math.round(hy - 10)), bot = Math.min(30, Math.round(hy + 10));
      piece(g, t => t.rect(x, top, 1, bot - top, WOOD[1]));
      piece(g, t => { t.poly(starPts(x + 0.5, top - 1.2, 4.8, 3, 8, P.frame ? -Math.PI / 8 : -Math.PI / 2), GOLD[1]); t.ell(x + 0.5, top - 1.2, 2.9, 2.9, ['#fffbd0', '#ffd23a', '#e8901c']); });
      g.set(x, top - 2, '#ffffff');
    },
    hat(g, G) {
      const S = ['#f2c43a', '#3a64d0'];
      piece(g, t => {
        t.ell(G.hx - 0.4, G.hy - 0.6, G.hr + 0.8, G.ry + 0.5, GOLD, 0, (x, y) => y <= G.by - 0.4 || x < G.e0 - 1);
        t.poly([[G.hx - G.hr - 0.6, G.hy - 1], [G.hx - 1.6, G.hy], [G.hx - 1.2, G.hy + 7.6], [G.hx - G.hr - 1.6, G.hy + 7.4]], GOLD[1]);
        for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (t.filled(x, y) && Math.floor(y / 2) % 2) t.set(x, y, x < G.hx - 2 ? '#22347a' : S[1]);
      });
      const y = G.by - 1; for (let x = Math.round(G.e0 - 1); x <= G.e1 + 3; x++) if (g.filled(x, y)) g.set(x, y, GOLD[1]);
      g.set(G.e1 + 2, y - 1, '#3a64d0'); g.set(G.e1 + 2, y - 2, GOLD[1]);
    },
    front(g, G) { const [hx, hy] = G.hand; g.px([[Math.round(hx - 2), Math.round(hy)], [Math.round(hx - 2), Math.round(hy) - 1]].filter(([x, y]) => g.filled(x, y)), GOLD[1]); },
  });

  // ---------------- Jack-in-the-Box: striped clown suit, a jack-in-the-box with a crank ----------------
  ZA.jackbox = (g, P) => zombie(g, P, {
    suit: ['#c89aff', '#8a52d0', '#52288a'], tie: ['#ffe080', '#f2c43a', '#b07a18'],
    post(g, G) { // bold stripes on the jacket and the front sleeve (shaded stripe colours keep the light from the top-left)
      const ST = { [G.SU[0]]: '#ffffff', [G.SU[1]]: '#f0e8ff', [G.SU[2]]: '#b8a0dc' };
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const c = g.get(x, y); if (ST[c] && x % 3 === 0) g.set(x, y, ST[c]); }
    },
    front(g, G) {
      const [hx, hy] = G.hand, x0 = Math.round(hx - 2.5), y0 = Math.round(hy + 1);
      piece(g, t => { t.rect(x0, y0, 6, 6, RED[1]); shade(t, x0 + 1.6, y0 + 1.6, 5.4, 5.4, RED); t.rect(x0 - 1, y0 - 1, 8, 2, GOLD[1]); t.rect(x0 - 1, y0, 8, 1, GOLD[2]); });
      g.poly(starPts(x0 + 3, y0 + 3.6, 2.2, 1, 5), GOLD[1]); g.set(x0 + 2, y0 + 3, GOLD[0]);
      // the crank turns: up on one frame, down on the other
      const cr = P.frame ? [[x0 + 6, y0 + 3], [x0 + 7, y0 + 3], [x0 + 7, y0 + 2], [x0 + 7, y0 + 1]] : [[x0 + 6, y0 + 3], [x0 + 7, y0 + 3], [x0 + 7, y0 + 4], [x0 + 7, y0 + 5]];
      piece(g, t => { t.px(cr, METAL[1]); t.set(cr[3][0], cr[3][1], RED[0]); });
      handOver(g, G, 1);
    },
  });

  // ---------------- Digger: miner's helmet with a lamp, pickaxe ----------------
  ZA.digger = (g, P) => zombie(g, P, {
    suit: ['#c8a070', '#94703e', '#5e4424'], tie: false, shirt: ['#d8c8a8', '#b4a07a', '#7a6a4a'], pants: ['#8a7aa0', '#5e5076', '#3a3050'],
    back(g, G) {
      const [hx, hy] = G.hand;
      piece(g, t => stroke(t, [[hx + 0.4, hy + 3.6], [hx + 0.4, Math.max(5, hy - 8)]], 0.7, 0.7, WOOD[1]));
      const top = Math.max(5, hy - 8);
      piece(g, t => { t.poly([[hx - 5, top + 2.4], [hx - 1, top - 0.8], [hx + 2, top - 0.8], [hx + 5.6, top + 2.4], [hx + 2, top + 0.8], [hx - 1, top + 0.8]], '#a9b4c0'); shade(t, hx, top, 5, 3, METAL); });
    },
    hat(g, G) {
      piece(g, t => {
        t.ell(G.hx - 0.3, G.hy - 1.6, G.hr + 0.6, G.ry - 0.4, GOLD, 0, (x, y) => y <= G.by - 0.6);
        t.rect(Math.round(G.hx - G.hr - 1), G.by - 1, Math.round(2 * G.hr + 3), 1, GOLD[2]);
      });
      const lx = G.hx + G.hr - 0.6, ly = G.by - 2.6;
      piece(g, t => { t.rect(Math.round(lx) - 2, Math.round(ly) - 1, 2, 3, '#5f6b7a'); t.ell(lx + 0.4, ly + 0.5, 1.5, 1.5, ['#ffffff', '#fff6a0', '#f2c43a']); });
      g.set(Math.round(lx), Math.round(ly), '#ffffff');
      if (P.frame) for (const [dx, dy] of [[2, 0], [3, -1], [3, 1], [4, 0]]) { const x = Math.round(lx) + dx, y = Math.round(ly) + dy; if (!g.get(x, y)) g.set(x, y, '#fff6a0'); }
      for (const [x, y] of [[G.e0 - 2, G.my + 1], [G.e1 + 1, G.my + 2], [G.e0, G.by + 4]]) if (g.filled(x, y)) g.set(x, y, '#6a5a3a');
    },
    front(g, G) { handOver(g, G, 1); },
  });

  // ---------------- Knight: a silver helmet with a visor slit and a red plume, chain mail ----------------
  ZA.knight = (g, P) => zombie(g, P, {
    hair: false, suit: ['#c8d0dc', '#8c96a8', '#545c70'], noShirt: true, pants: ['#8c96a8', '#5c6478', '#3a4052'], shoe: METAL,
    torso(t, G) { G.jacket(t, G); for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (t.filled(x, y) && (x + y) % 2 === 0 && (x * 3 + y) % 4 === 0) t.set(x, y, '#545c70'); for (let x = 0; x < 32; x++) { const y = Math.round(G.Y(22.6)); if (t.filled(x, y)) t.set(x, y, x % 4 === 1 ? GOLD[1] : '#5a3a22'); } },
    face: false,
    head(t, G) {
      t.ell(G.hx, G.hy - 0.3, G.hr + 0.4, G.ry + 0.4, METAL);
      t.rect(Math.round(G.hx - 0.5), G.by - 1, Math.round(G.hr + 1.5), 4, METAL[1]);
      shade(t, G.hx, G.hy, G.hr + 1.2, G.ry + 1.2, METAL);
      const y = G.by + 1;
      for (let x = Math.round(G.hx - 1); x <= G.hx + G.hr + 1; x++) if (t.filled(x, y)) { t.set(x, y, '#22202e'); }
      const P = G.P, k = P.eyes;
      const ex1 = G.e1 + 1, ex0 = G.e0 + 1;
      if (k === 'happy') t.px([[ex1, y], [ex0, y]], '#ffe24a');
      else if (k === 'closed' || k === 'blink') { t.px([[ex1, y], [ex1 + 1, y], [ex0, y]], '#5c6478'); }
      else { t.set(ex1, y, '#ffe24a'); t.set(ex1 + 1, y, '#ffe24a'); t.set(ex0, y, '#ffe24a'); }
      for (let x = Math.round(G.hx - 1); x <= G.hx + G.hr; x++) if (t.filled(x, y - 1) && t.filled(x, y - 2)) t.set(x, y - 1, METAL[2]);
      for (let yy = y + 2; yy <= y + 4; yy += 2) for (let x = Math.round(G.hx + 1.5); x <= G.hx + G.hr; x += 2) if (t.filled(x, yy)) t.set(x, yy, '#22202e');
      if (P.mouth === 'open' || P.mouth === 'o') for (let x = Math.round(G.hx + 1.5); x <= G.hx + G.hr; x++) if (t.filled(x, y + 3)) t.set(x, y + 3, '#22202e');
      const cx = Math.round(G.hx - 0.4); for (let yy = G.top; yy < y - 1; yy++) if (t.filled(cx, yy)) t.set(cx, yy, METAL[0]);
    },
    hat(g, G) {
      const w = P.frame ? 0.4 : 0;
      piece(g, t => { stroke(t, [[G.hx - 0.6, G.top - 0.2], [G.hx - 3, G.top - 2.6 - w], [G.hx - 6.4, G.top - 1.6 + w], [G.hx - 8.4, G.top + 1.6]], 1.6, 0.8, RED[1]); });
      for (const [dx, dy] of [[-2, -2], [-4, -2], [-6, -1]]) { const x = Math.round(G.hx + dx), y = Math.round(G.top + dy - w); if (g.filled(x, y)) g.set(x, y, RED[0]); }
    },
  });

  // ---------------- Cowboy: wide-brim hat, bandana, vest ----------------
  ZA.cowboy = (g, P) => zombie(g, P, {
    hdy: 1, suit: ['#c48a5c', '#8f563b', '#5a3322'], shirt: ['#ffffff', '#e8dcc4', '#b0a080'], tie: false, pants: ['#7aa0d8', '#3e64a8', '#26406e'], shoe: WOOD,
    sleeveCol: ['#f4ecd8', '#d8c8a4', '#a08a64'],
    mid(g, G) { // the red neckerchief, tied just under the jaw
      piece(g, t => { t.poly([[G.hx - 4.4, G.hy + 4.6], [G.hx + 4, G.hy + 4.8], [G.hx + 3.6, G.hy + 6.6], [G.hx + 2.6, G.hy + 10.4], [G.hx + 0.6, G.hy + 7], [G.hx - 4, G.hy + 6.8]], RED[1]); shade(t, G.hx - 1, G.hy + 5, 5.4, 5, RED); t.ell(G.hx - 4.2, G.hy + 6.4, 1.2, 1, RED); });
      for (const [dx, dy] of [[-2, 6], [2, 7], [2, 9]]) { const x = Math.round(G.hx + dx), y = Math.round(G.hy + dy); if (RED.includes(g.get(x, y))) g.set(x, y, '#ffffff'); }
    },
    hat(g, G) {
      const HAT = ['#d8a066', '#a06c3a', '#62401e'], cx = G.hx - 0.6, b = G.by - 0.6;
      piece(g, t => {
        t.ell(cx, b - 3, 4.4, 3.6, HAT, 0, (x, y) => y <= b);
        t.ell(cx, b - 0.2, 8.2, 1.5, HAT);
        t.poly([[cx - 8.6, b - 1.6], [cx - 6, b - 0.2], [cx - 8.2, b + 0.6]], HAT[1]); t.poly([[cx + 8.6, b - 1.6], [cx + 6, b - 0.2], [cx + 8.2, b + 0.6]], HAT[1]);
      });
      for (let x = Math.round(cx - 4); x <= cx + 4; x++) { const y = Math.round(b - 1.4); if (g.filled(x, y)) g.set(x, y, '#3a2416'); }
      const x = Math.round(cx), y = Math.round(b - 5.6); if (g.filled(x, y + 1)) g.set(x, y + 1, '#62401e');
    },
  });

  // ---------------- Robot: metal head, glowing visor, antenna ----------------
  const ROBO = ['#e8f0fa', '#9aaac0', '#566078'];
  ZA.robot = (g, P) => zombie(g, P, {
    hair: false, skin: ROBO, suit: ['#8aa0c0', '#566c90', '#34405c'], sleeveCol: ['#8aa0c0', '#566c90', '#34405c'], noShirt: true, pants: ['#7a88a4', '#4e5a76', '#323a50'], shoe: ['#9aaac0', '#566078', '#323a50'],
    face: false,
    torso(t, G) {
      G.jacket(t, G);
      t.rect(Math.round(G.X(15.4)), Math.round(G.Y(17.4)), 4, 3, '#2a3048');
      const c = P.frame ? '#ff5aa0' : '#5af0ff'; t.px([[Math.round(G.X(16)), Math.round(G.Y(18.4))], [Math.round(G.X(18)), Math.round(G.Y(18.4))]], c); t.set(Math.round(G.X(17)), Math.round(G.Y(18.4)), '#fff27a');
    },
    head(t, G) {
      t.poly([[G.hx - G.hr + 0.4, G.hy - G.ry + 1.4], [G.hx - G.hr + 1.6, G.hy - G.ry + 0.2], [G.hx + G.hr - 1.2, G.hy - G.ry + 0.2], [G.hx + G.hr + 0.4, G.hy - G.ry + 1.6], [G.hx + G.hr + 0.6, G.hy + G.ry - 1], [G.hx + G.hr - 1, G.hy + G.ry + 0.4], [G.hx - G.hr + 1.4, G.hy + G.ry + 0.4], [G.hx - G.hr + 0.2, G.hy + G.ry - 1.2]], ROBO[1]);
      shade(t, G.hx, G.hy, G.hr + 1.4, G.ry + 1.4, ROBO);
      const y0 = G.by - 1, x0 = G.e0 - 1, x1 = Math.round(G.hx + G.hr);
      for (let y = y0; y <= y0 + 4; y++) for (let x = x0; x <= x1; x++) if (t.filled(x, y)) t.set(x, y, '#1e2a40');
      const glow = '#5af0ff', P = G.P, k = P.eyes;
      const big = [[G.e1, G.by], [G.e1 + 1, G.by], [G.e1 + 2, G.by], [G.e1, G.by + 1], [G.e1 + 1, G.by + 1], [G.e1 + 2, G.by + 1]], sm = [[G.e0, G.by + 1], [G.e0 + 1, G.by + 1]];
      if (k === 'happy') t.px([[G.e1, G.by + 1], [G.e1 + 1, G.by], [G.e1 + 2, G.by + 1], [G.e0 - 0, G.by + 1], [G.e0 + 1, G.by]], glow);
      else if (k === 'closed') t.px([[G.e1, G.by], [G.e1 + 2, G.by], [G.e1 + 1, G.by + 1], [G.e1, G.by + 2], [G.e1 + 2, G.by + 2], [G.e0, G.by + 1], [G.e0 + 1, G.by + 2], [G.e0 + 1, G.by]], '#ff5a7a');
      else if (k === 'blink') t.px([[G.e1, G.by + 1], [G.e1 + 1, G.by + 1], [G.e1 + 2, G.by + 1], [G.e0, G.by + 1], [G.e0 + 1, G.by + 1]], glow);
      else { t.px(big.concat(sm), glow); t.set(G.e1 + 2, G.by + 1, '#ffffff'); if (k === 'brave') t.px([[G.e1, G.by], [G.e0 + 1, G.by + 1]], '#1e2a40'); if (k === 'sad') t.px([[G.e1 + 2, G.by], [G.e0, G.by + 1]], '#1e2a40'); }
      // mouth grille
      const my = G.my + 1;
      for (let x = G.mx; x <= G.mx + 4; x++) if (t.filled(x, my)) t.set(x, my, x % 2 ? '#323a50' : '#9aaac0');
      if (P.mouth === 'open' || P.mouth === 'o' || P.mouth === 'grin') for (let x = G.mx; x <= G.mx + 4; x++) if (t.filled(x, my + 1)) t.set(x, my + 1, '#323a50');
      t.set(Math.round(G.hx - G.hr + 1.6), Math.round(G.hy + 1), '#323a50'); t.set(Math.round(G.hx - G.hr + 1.6), Math.round(G.hy + 2), '#ffd23a');
    },
    hat(g, G) {
      const x = Math.round(G.hx - 1), top = G.top;
      g.rect(x, top - 4, 1, 4, '#566078');
      piece(g, t => t.ell(x + 0.5, top - 4.6, 1.4, 1.4, P.frame ? ['#ffd0e0', '#ff5aa0', '#a02a60'] : ['#e0ffff', '#5af0ff', '#2a90b0']));
    },
  });

  // ---------------- Gargantuar: a huge hunched zombie with a wooden pole ----------------
  const GSK = ['#bed2aa', '#87a174', '#53684a'];
  ZA.gargantuar = (g, P) => {
    const walk = !!P.walk, f = P.frame ? 1 : 0, A = P.arms, bob = walk && f ? 1 : 0;
    const SK = GSK, SKb = dk(GSK, 0.15), PA = ['#b0905e', '#7a5e34', '#4a361c'];
    // pose: hands (front hand h1, back hand h2) and the pole ends
    let h1, h2, e1, e2, p0, p1;
    if (A === 'up') { h1 = [24, 4.6]; e1 = [21.6, 9]; h2 = [9, 4.6]; e2 = [8.6, 9]; p0 = [1.6, 3.4]; p1 = [30.4, 3.4]; }
    else if (A === 'out') { h1 = [28.4, 18]; e1 = [24.6, 15.6]; h2 = [3.4, 18]; e2 = [6, 14.4]; p0 = [28.6, 29.4]; p1 = [28.6, 4]; }
    else if (A === 'paddle') { if (f) { h1 = [24.6, 23.6]; e1 = [19.6, 19.6]; h2 = [26.4, 6.6]; e2 = [20, 7.6]; p0 = [19, 29.6]; p1 = [30, 17.6]; } else { h1 = [27.4, 7]; e1 = [22.6, 8.6]; h2 = [5, 21]; e2 = [7.4, 15]; p0 = [24, 29]; p1 = [30.4, 1.4]; } }
    else { h1 = [24.6, 19.4 + bob]; e1 = [17.6, 18.6 + bob]; h2 = [20.4, 15.2 + bob]; e2 = [13, 14.6]; p0 = [30, 23.2 + bob]; p1 = [3.4, 1.2 + bob]; }
    const arm = (t, sh, el, h, R) => { stroke(t, [sh, el], 3.1, 2.6, R[1]); stroke(t, [el, h], 2.6, 2.3, R[1]); shade(t, (sh[0] + h[0]) / 2 - 1, (sh[1] + h[1]) / 2 - 1, 7, 7, R); t.ell(h[0], h[1], 2.6, 2.4, R); };
    const lb = walk ? (f ? 16.6 : 8.6) : 9.6, lf = walk ? (f ? 12.6 : 21) : 20;
    // the little imp riding on its back peeks over the hump (it ducks down when the arms go up)
    if (A !== 'up') {
      const ix = 13.4, iy = 3.2 + bob, IR = dk(SKIN, 0.06);
      piece(g, t => { t.ell(ix + 2.8, iy + 2.6, 1.1, 1, IR); t.ell(ix, iy, 2.7, 2.4, IR); });
      const x = Math.round(ix), y = Math.round(iy);
      g.px([[x - 1, y - 1], [x + 1, y - 1]], W); g.set(x + 1, y - 1, W); g.px([[x, y + 1], [x + 1, y + 1]], INK); g.set(x - 1, y, IR[2]);
      g.set(x, y - 4, INK); g.set(x - 1, y - 4, INK);
    }
    // back arm
    piece(g, t => arm(t, [10.6, 9.6 + bob], e2, h2, SKb));
    // legs + big bare feet
    for (const [hx, fx, R, FR] of [[10.6, lb, dk(PA, 0.2), SKb], [18.4, lf, PA, SK]]) piece(g, t => { stroke(t, [[hx, 21.6 + bob], [fx, 27.6]], 3.2, 2.8, R[1]); shade(t, (hx + fx) / 2 - 1, 23.6, 5, 5, R); t.ell(fx + 1.2, 29.4, 3.6, 1.6, FR); });
    // hunched body: huge shoulders, belly, ragged trousers with a rope belt
    piece(g, t => {
      t.ell(13.6, 13 + bob, 9.6, 7.8, SK);
      t.ell(16.4, 18 + bob, 7.4, 5, SK);
      t.poly([[5, 19.4 + bob], [24.4, 19.4 + bob], [25, 25.4], [4.6, 25.4]], PA[1]);
      t.ell(13, 20, 12, 7, PA, 0, (x, y) => PA.includes(t.get(x, y)));
      for (let x = 0; x < 32; x++) if (t.filled(x, 19 + bob)) t.set(x, 19 + bob, x % 3 ? '#c8a46a' : '#8a6a3a');
      for (const x of [7, 12, 17, 22]) t.set(x, 25, null);
      for (const [x, y] of [[9, 11], [11, 14], [19, 10], [7, 15], [15, 16]]) if (t.filled(x, y + bob)) t.set(x, y + bob, SK[2]);
      t.px([[17, 22], [18, 22], [17, 23]].map(([x, y]) => [x, y + bob]), '#a08048');
    });
    // pole (front of the shoulder, behind the head and the gripping hand)
    // a telephone pole: wood grain, and a cross-arm near the far end
    piece(g, t => { stroke(t, [p0, p1], 1.6, 1.4, WOOD[1]); const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), d = [(p1[0] - p0[0]) / L, (p1[1] - p0[1]) / L], n = [-d[1], d[0]], c = [p1[0] - d[0] * 3.4, p1[1] - d[1] * 3.4]; stroke(t, [[c[0] - n[0] * 3.4, c[1] - n[1] * 3.4], [c[0] + n[0] * 3.4, c[1] + n[1] * 3.4]], 0.7, 0.7, WOOD[2]); });
    for (let i = 1; i < 9; i++) { const k = i / 9, x = Math.round(p0[0] + (p1[0] - p0[0]) * k), y = Math.round(p0[1] + (p1[1] - p0[1]) * k); if (i % 3 === 0 && g.get(x, y) === WOOD[1]) g.set(x, y, WOOD[2]); }
    // small head, low and forward
    const hx = 22.4, hy = 10.2 + bob;
    const G = { hx, hy, hr: 4.4, ry: 4.2, SK, e0: 21, e1: 24, by: Math.round(hy) - 2, mx: 22, my: Math.round(hy) + 2 };
    piece(g, t => {
      t.ell(hx + 1.2, hy + 2.2, 3.6, 2.6, SK);
      t.ell(hx, hy, 4.4, 4.2, SK);
      eyes(t, G, P.eyes ? P : Object.assign({}, P, { eyes: 'brave' }), {}); mouth(t, G, P, {});
      t.px([[19, Math.round(hy)], [18, Math.round(hy) + 1], [19, Math.round(hy) + 2]], SK[2]);
    });
    const ht = Math.ceil(hy - 4.2 - 0.5); g.px([[21, ht - 2], [20, ht - 3], [23, ht - 2]], INK);
    // front arm grips the pole
    piece(g, t => arm(t, [16.4, 11 + bob], e1, h1, SK));
  };

  // =====================================================================================================
  // ZOMBOSSES: PX.BOSS_ART[id] = { w: 48, h: 48, draw(g, f) }. Facing right, feet on the bottom rows, f = frame 0|1.
  // =====================================================================================================
  const BA = PX.BOSS_ART = PX.BOSS_ART || {};
  const HAIR = ['#4a4060', '#2a2440', '#16121e'], COAT = ['#ffffff', '#e2e6f0', '#9aa4b8'];
  const STEEL = ['#dfe6ee', '#9aa6b4', '#58626e'], GUN = ['#8a94a4', '#545c6c', '#30343e'];
  const rivets = (g, pts, c) => { for (const [x, y] of pts) if (g.filled(Math.round(x), Math.round(y))) g.set(Math.round(x), Math.round(y), c || '#30343e'); };
  const fillIf = (g, test, c) => { for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.filled(x, y) && test(x, y, g.get(x, y))) g.set(x, y, typeof c === 'function' ? c(x, y) : c); };
  // Dr. Zomboss: a hand-placed 10x10 head (zombie-green face, black hair swept up and back, a gold monocle on the front eye,
  // a toothy mad grin), centred on cx, cy; optional white lab-coat shoulders with a red tie. Only the silhouette is inked, so
  // the face stays readable even when it is small (cockpit windows, the ship's stern, the dragon's saddle).
  const DRZ_HEAD = [
    '..H..H....',
    '.HHHHHH...',
    'HHHhHHHHB.',
    'HHHHBBAGGA',
    'HHHwkBGwwG',
    '.HAAAAGwkG',
    '.HCAAAAGGA',
    '..CkAAAAkA',
    '...Ckwkwk.',
    '....CCCC..',
  ];
  function drZ(g, cx, cy, o) {
    o = o || {};
    const x0 = Math.round(cx - 5), y0 = Math.round(cy - 5);
    if (o.body) piece(g, t => { t.ell(x0 + 4.6, y0 + 11.4, 4.8, 2.8, COAT); t.poly([[x0 + 5, y0 + 9.6], [x0 + 8, y0 + 9.6], [x0 + 6.5, y0 + 12.8]], '#f4f4f8'); t.poly([[x0 + 6, y0 + 10], [x0 + 7, y0 + 10], [x0 + 6.5, y0 + 12.6]], '#d8323a'); });
    const map = { H: HAIR[1], h: HAIR[0], A: SKIN[1], B: SKIN[0], C: SKIN[2], w: W, k: INK, G: GOLD[1] };
    piece(g, t => t.str(DRZ_HEAD, x0, y0, map));
    if (o.eye === 'glow') g.px([[x0 + 7, y0 + 4], [x0 + 8, y0 + 4], [x0 + 7, y0 + 5]], '#ff5a5a');
    g.set(x0 + 6, y0 + 7, GOLD[2]); // the monocle's chain
  }
  // Dr. Zomboss seen through a round window (cx, cy, rx, ry): glass behind, Zomboss clipped to the glass, a glint on top
  function drZWindow(g, cx, cy, rx, ry, zx, zy, o) {
    piece(g, t => t.ell(cx, cy, rx, ry, ['#e8fbff', '#9ad8f0', '#4a8ac0']));
    const t = new Grid(g.w, g.h); drZ(t, zx, zy, o);
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const c = t.get(x, y); if (c && ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 0.8) g.set(x, y, c); }
    const gx = Math.round(cx - rx * 0.55), gy = Math.round(cy - ry * 0.55); if (g.filled(gx, gy) && !HAIR.includes(g.get(gx, gy))) g.set(gx, gy, '#ffffff');
  }
  // a mechanical leg: hip -> knee -> foot, with a joint bolt and a flat foot
  function mechLeg(g, hip, knee, foot, R, w) {
    w = w || 2.6;
    piece(g, t => { stroke(t, [hip, knee], w, w * 0.85, R[1]); stroke(t, [knee, foot], w * 0.85, w * 0.75, R[1]); shade(t, (hip[0] + foot[0]) / 2 - 2, (hip[1] + foot[1]) / 2 - 2, 7, 10, R); });
    piece(g, t => t.ell(knee[0], knee[1], w * 0.9, w * 0.9, R));
    piece(g, t => { t.ell(foot[0] + 1.2, foot[1] + 0.6, w * 1.9, w * 0.8, R, 0, (x, y) => y <= foot[1] + 1.6); t.rect(Math.round(foot[0] + 1.2 - w * 1.9), Math.round(foot[1] + 0.6), Math.round(w * 3.8), 1, R[2]); });
  }

  // ---------------- Gargantuar (boss): telephone pole over the shoulder, an imp riding on its back ----------------
  BA.gargantuar = { w: 48, h: 48, draw(g, f) {
    const SK = GSK, SKb = dk(GSK, 0.15), PA = ['#b0905e', '#7a5e34', '#4a361c'], d = f ? 1 : 0;
    // back arm hangs down at the back
    piece(g, t => { stroke(t, [[13, 18 + d], [8, 27 + d], [9, 34 + d]], 4, 3.4, SKb[1]); shade(t, 9, 26, 6, 10, SKb); t.ell(9.6, 35 + d, 3.6, 3.2, SKb); });
    // legs + feet
    for (const [hx, fx, R, FR] of [[16, 13.6, dk(PA, 0.2), SKb], [28, 30.6, PA, SK]]) piece(g, t => { stroke(t, [[hx, 33], [fx, 42]], 5, 4.4, R[1]); shade(t, (hx + fx) / 2 - 1, 36, 7, 7, R); t.ell(fx + 1.6, 44.4, 5.6, 2.4, FR, 0, y => true); });
    // torso, belly, trousers
    piece(g, t => {
      t.ell(20.6, 21 + d, 14.4, 11.6, SK);
      t.ell(25, 27.4 + d, 10.6, 7.6, SK);
      t.poly([[6.6, 30 + d], [36, 30 + d], [37.4, 39.6], [5.8, 39.6]], PA[1]);
      t.ell(20, 33, 18, 10, PA, 0, (x, y) => PA.includes(t.get(x, y)));
      for (let x = 0; x < 48; x++) if (t.filled(x, 30 + d)) { t.set(x, 30 + d, x % 3 ? '#c8a46a' : '#8a6a3a'); t.set(x, 31 + d, x % 3 === 1 ? '#8a6a3a' : t.get(x, 31 + d)); }
      for (const x of [9, 15, 22, 29, 34]) { t.set(x, 39, null); t.set(x + 1, 39, null); }
      for (const [x, y] of [[12, 15], [16, 19], [28, 14], [10, 22], [21, 24], [31, 23]]) if (t.filled(x, y + d)) t.set(x, y + d, SK[2]);
      t.px([[23, 34], [24, 34], [23, 35], [24, 35]], '#a08048');
    });
    // the imp riding on the back, waving
    const ix = 10.6, iy = 8.4 + d, IG = { SK: SKIN, e0: 9, e1: 12, by: Math.round(iy) - 2, mx: 10, my: Math.round(iy) + 2 };
    piece(g, t => { const ah = f ? [[ix - 2, iy + 6], [ix - 5.6, iy + 1]] : [[ix - 2, iy + 6], [ix - 6.4, iy + 4.4]]; stroke(t, ah, 1.2, 1.1, SKIN[1]); t.ell(ah[1][0], ah[1][1], 1.5, 1.4, SKIN); });
    piece(g, t => { t.ell(ix, iy + 7, 3.8, 3.2, ['#ffffff', '#e2e0d0', '#a8a490']); t.rect(Math.round(ix - 3.6), Math.round(iy + 8.6), 8, 1, '#8f603a'); });
    piece(g, t => { t.ell(ix + 1.2, iy + 1.6, 3, 2.2, SKIN); t.ell(ix, iy, 4.2, 4, SKIN); eyes(t, IG, { eyes: f ? 'happy' : null }, {}); mouth(t, IG, { mouth: 'grin' }, {}); });
    g.px([[Math.round(ix) - 1, Math.round(iy) - 6], [Math.round(ix) - 2, Math.round(iy) - 7], [Math.round(ix) + 1, Math.round(iy) - 6]], INK);
    piece(g, t => { const ah = [[ix + 2.6, iy + 6], [ix + 6.4, iy + 7]]; stroke(t, ah, 1.2, 1.1, SKIN[1]); t.ell(ah[1][0], ah[1][1], 1.5, 1.4, SKIN); });
    // telephone pole: over the front shoulder, behind the head
    const p0 = [45.4, 37.6 + d], p1 = [20.4, 3 + d * 0.5]; // (the top end stays on the canvas, with its outline)
    piece(g, t => { stroke(t, [p0, p1], 2.4, 2.2, WOOD[1]); });
    for (let i = 1; i < 14; i++) { const k = i / 14, x = Math.round(p0[0] + (p1[0] - p0[0]) * k), y = Math.round(p0[1] + (p1[1] - p0[1]) * k); if (g.get(x + 1, y) === WOOD[1]) g.set(x + 1, y, WOOD[2]); if (g.get(x - 1, y) === WOOD[1]) g.set(x - 1, y, WOOD[0]); }
    piece(g, t => { t.rect(16, 6 + d, 10, 2, WOOD[2]); t.rect(16, 6 + d, 10, 1, WOOD[1]); });
    g.px([[16, 5 + d], [20, 5 + d], [25, 5 + d]], '#d8e4f0');
    // head: small, forward, fierce brows
    const hx = 35, hy = 17.4 + d, Gh = { hx, hy, hr: 6.4, ry: 6, SK, e0: 33, e1: 37, by: Math.round(hy) - 3, mx: 34, my: Math.round(hy) + 2 };
    piece(g, t => {
      t.ell(hx + 1.8, hy + 3.2, 5, 3.4, SK); t.ell(hx, hy, 6.4, 6, SK);
      const k = INK, e0 = 32, e1 = 36, by = Gh.by;
      // eyes: big front eye, small back eye, angry brows
      t.px([[e1, by], [e1 + 1, by], [e1 + 2, by], [e1 + 3, by], [e1, by + 1], [e1 + 1, by + 1], [e1 + 2, by + 1], [e1 + 3, by + 1], [e1, by + 2], [e1 + 1, by + 2], [e1 + 2, by + 2], [e1 + 3, by + 2], [e1 + 1, by + 3], [e1 + 2, by + 3]], W);
      t.set(e1 + 3, by + 1, k); t.set(e1 + 2, by + 1, k);
      t.px([[e0, by + 1], [e0 + 1, by + 1], [e0, by + 2], [e0 + 1, by + 2]], W); t.set(e0 + 1, by + 2, k);
      t.px([[e1 - 1, by - 1], [e1, by - 2], [e1 + 1, by - 2], [e1 + 2, by - 3], [e1 + 3, by - 3], [e0 + 2, by - 1], [e0 + 1, by - 1], [e0, by - 2]], k);
      for (const [x, y] of [[e1 - 1, by], [e1 - 1, by + 1], [e1 - 1, by + 2], [e1, by + 3], [e1 + 3, by + 3], [e1 + 4, by + 1], [e1 + 4, by + 2], [e0 - 1, by + 1], [e0 - 1, by + 2], [e0, by + 3], [e0 + 1, by + 3]]) if (t.filled(x, y)) t.set(x, y, SK[2]);
      const my = Gh.my + 2;
      t.px([[33, my], [34, my], [36, my], [37, my], [38, my], [39, my], [34, my + 1], [35, my + 1], [36, my + 1], [37, my + 1], [38, my + 1]], k); t.set(35, my, W); t.set(38, my + 1, W);
      t.px([[29, Math.round(hy)], [28, Math.round(hy) + 1], [29, Math.round(hy) + 2]], SK[2]);
    });
    g.px([[33, 10 + d], [32, 9 + d], [35, 10 + d], [36, 9 + d]], INK);
    // front arm grips the pole
    piece(g, t => { stroke(t, [[26, 18 + d], [28, 28 + d], [38.6, 29.6 + d]], 4.4, 3.8, SK[1]); shade(t, 29, 23, 9, 9, SK); t.ell(39.6, 29.8 + d, 3.8, 3.6, SK); });
    g.px([[38, 27 + d], [39, 27 + d], [40, 27 + d]].filter(([x, y]) => g.filled(x, y)), SK[2]);
  } };

  // ---------------- Zombot: a giant robot with a huge zombie-face head, glowing eyes, big claws; Zomboss in a cockpit window ----------------
  const ZMET = ['#c8d8b0', '#86a070', '#4c6044'];
  function claw(g, x, y, ang, open, R) {
    piece(g, t => {
      t.ell(x, y, 3, 3, R);
      const sp = open ? 0.75 : 0.3;
      for (const a of [ang - sp, ang + sp]) { const p1 = [x + Math.cos(a) * 3.4, y + Math.sin(a) * 3.4], p2 = [x + Math.cos(a) * 6.4 + Math.cos(ang) * 0.6, y + Math.sin(a) * 6.4 + Math.sin(ang) * 0.6]; stroke(t, [[x, y], p1, p2], 1.5, 0.7, R[1]); }
    });
  }
  BA.zombot = { w: 48, h: 48, draw(g, f) {
    const M = STEEL, d = f ? 1 : 0;
    // back arm + claw (behind)
    piece(g, t => { stroke(t, [[13, 28], [7, 33], [6, 39]], 2.6, 2.2, dk(M, 0.2)[1]); });
    claw(g, 6, 40, Math.PI / 2, f, dk(M, 0.2));
    // legs
    mechLeg(g, [17, 35], [14, 40], [13, 44], dk(M, 0.15), 3);
    mechLeg(g, [29, 35], [33, 40], [33, 44], M, 3);
    // body with a chest cockpit window
    piece(g, t => { t.poly([[12, 26], [35, 26], [37, 30], [35, 38], [13, 38], [11, 30]], M[1]); shade(t, 22, 30, 14, 10, M); });
    piece(g, t => t.ell(27.6, 31.8, 6.6, 5.8, GUN));
    drZWindow(g, 27.6, 31.8, 5.4, 4.8, 27.6, 32.2, { r: 3, body: true, compact: true });
    rivets(g, [[14, 28], [14, 35], [20, 28], [20, 35], [35, 30]]);
    fillIf(g, (x, y, c) => y === 37 && M.includes(c), M[2]);
    g.px([[16, 31], [17, 31], [18, 31]], f ? '#ff5a5a' : '#fff27a');
    // the giant zombie head
    const hx = 24, hy = 15 + d;
    piece(g, t => {
      t.ell(hx + 3, hy + 6.6, 11, 5, ZMET);
      t.ell(hx, hy, 14, 11, ZMET);
    });
    // jaw plate with teeth
    piece(g, t => { t.poly([[hx - 3, hy + 6], [hx + 14, hy + 5], [hx + 13, hy + 10.5], [hx - 1, hy + 11]], ZMET[2]); });
    fillIf(g, (x, y, c) => c === ZMET[2] && y >= hy + 6 && y <= hy + 7 && x > hx - 2, (x) => (x % 3 ? '#f4f4ea' : '#9aa090'));
    fillIf(g, (x, y, c) => c === ZMET[2] && y === Math.round(hy + 10) && x > hx, (x) => (x % 3 === 1 ? '#f4f4ea' : ZMET[2]));
    // eyes: one huge glowing eye, one smaller
    const EYE = f ? ['#fffbd0', '#ffd23a', '#e8701c'] : ['#ffe0e0', '#ff5a5a', '#a01a2a'];
    piece(g, t => t.ell(hx + 7, hy - 2, 4.2, 4.4, ['#ffffff', '#eef2f0', '#b8c0b8']));
    piece(g, t => t.ell(hx - 3, hy - 1, 3, 3.2, ['#ffffff', '#eef2f0', '#b8c0b8']));
    g.ell(hx + 8, hy - 1.6, 1.8, 1.8, EYE); g.ell(hx - 2.2, hy - 0.6, 1.2, 1.2, EYE);
    g.set(Math.round(hx + 8), Math.round(hy - 2), '#ffffff');
    // angry metal brows + rivets + a few wire hairs
    piece(g, t => { t.poly([[hx + 2, hy - 7], [hx + 12, hy - 9.4], [hx + 12.4, hy - 7.4], [hx + 3, hy - 5.4]], ZMET[2]); t.poly([[hx - 7, hy - 6.4], [hx - 0.6, hy - 5.4], [hx - 1, hy - 4], [hx - 7, hy - 4.8]], ZMET[2]); });
    rivets(g, [[hx - 10, hy - 2], [hx - 9, hy + 3], [hx - 6, hy - 8], [hx + 1, hy - 10], [hx + 9, hy + 3], [hx - 4, hy + 4]], '#4c6044');
    g.px([[hx - 2, hy - 12], [hx - 3, hy - 13], [hx, hy - 12], [hx + 1, hy - 13], [hx + 1, hy - 14], [hx - 5, hy - 11], [hx - 6, hy - 12]].map(([x, y]) => [Math.round(x), Math.round(y)]), INK);
    // ear bolt
    piece(g, t => t.ell(hx - 11, hy + 1, 2, 2.4, GUN));
    // front arm + big claw
    piece(g, t => { stroke(t, [[33, 28], [39, 33], [41, 27]], 2.8, 2.4, M[1]); shade(t, 38, 29, 6, 6, M); });
    piece(g, t => t.ell(39, 33, 2.4, 2.4, GUN));
    claw(g, 41.6, 25.6, -Math.PI / 2.6, f, M);
  } };

  // ---------------- Zombot Sphinx-inator: a stone sphinx robot with Zomboss's face carved in, gold and blue ----------------
  const SAND = ['#f6e2aa', '#d2b06e', '#8e6c3c'];
  BA.sphinx = { w: 48, h: 48, draw(g, f) {
    // tail
    piece(g, t => { stroke(t, [[8, 36], [3, 33], [2.4, 27], [4.6, 25]], 1.2, 1, SAND[1]); t.ell(4.8, 24.4, 1.6, 1.6, GOLD); });
    // body (lying), haunch, chest
    piece(g, t => { t.ell(18, 34.6, 14, 8, SAND); t.ell(9.6, 36.6, 7, 7.4, SAND); t.ell(28, 33, 8, 9, SAND); });
    // panel seams, rivets, a glowing vent
    fillIf(g, (x, y, c) => SAND.includes(c) && (x === 15 || x === 22) && y > 28 && y < 42, SAND[2]);
    fillIf(g, (x, y, c) => SAND.includes(c) && y === 37 && x > 4 && x < 33, SAND[2]);
    rivets(g, [[13, 30], [17, 30], [20, 34], [24, 34], [10, 40], [26, 40]], '#8e6c3c');
    for (const x of [17, 19]) g.set(x, 33, f ? '#5af0ff' : '#3a64d0');
    // back leg paw + front paws reaching forward
    piece(g, t => { t.ell(12.6, 43.4, 5, 2.2, SAND); });
    piece(g, t => { t.ell(36, 43, 9.4, 2.8, SAND); });
    piece(g, t => { t.ell(37.6, 40.4, 8.6, 2.6, SAND); });
    for (const [x, y] of [[44, 40], [44, 41], [42, 41], [44, 43], [44, 44], [42, 44]]) if (g.filled(x, y)) g.set(x, y, SAND[2]);
    // headdress (nemes): gold and blue stripes, flaps down to the chest
    const hx = 34, hy = 17;
    piece(g, t => {
      t.poly([[hx - 9, hy + 13], [hx - 8.6, hy - 3], [hx - 6, hy - 9.4], [hx + 4, hy - 10.4], [hx + 8, hy - 6], [hx + 9.4, hy + 3], [hx + 9.4, hy + 13], [hx + 5, hy + 13], [hx + 5.4, hy + 4], [hx - 4, hy + 4], [hx - 4.6, hy + 13]], GOLD[1]);
      for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (t.filled(x, y) && Math.floor((y - hy + 20) / 2) % 2) t.set(x, y, x < hx - 2 ? '#22347a' : '#3a64d0');
      shade(t, hx, hy - 2, 12, 14, GOLD, 0);
      for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (t.filled(x, y) && Math.floor((y - hy + 20) / 2) % 2) t.set(x, y, x < hx - 2 ? '#22347a' : '#3a64d0');
    });
    // the carved stone face of Dr. Zomboss
    piece(g, t => { t.ell(hx + 1.6, hy + 1, 5.6, 6.4, SAND); });
    piece(g, t => t.poly([[hx - 5.4, hy - 5], [hx - 2.6, hy - 9], [hx - 1, hy - 5.6], [hx + 1, hy - 10], [hx + 2.4, hy - 5.6], [hx + 5, hy - 8.4], [hx + 6, hy - 4], [hx - 4, hy - 3.4]], ['#7a6a5a', '#5a4a40', '#3a302a'][1]));
    piece(g, t => { t.rect(hx - 5, hy - 5, 13, 2, GOLD[1]); t.ell(hx + 2, hy - 6.4, 1.2, 1.6, ['#ff9a80', '#3a64d0', '#22347a']); });
    const k = INK, ex = hx + 3, ey = hy - 1, EYE = f ? '#5af0ff' : '#ff5a5a';
    g.px([[ex - 1, ey - 1], [ex, ey - 2], [ex + 1, ey - 2], [ex + 2, ey - 1], [ex + 2, ey], [ex + 2, ey + 1], [ex + 1, ey + 2], [ex, ey + 2], [ex - 1, ey + 1], [ex - 1, ey]], GOLD[1]);
    g.px([[ex, ey - 1], [ex + 1, ey - 1], [ex, ey], [ex + 1, ey], [ex, ey + 1], [ex + 1, ey + 1]], EYE); g.set(ex + 1, ey, '#ffffff');
    g.px([[ex - 1, ey + 2], [ex - 2, ey + 3]], GOLD[2]);
    g.px([[hx - 2, ey], [hx - 1, ey]], EYE); g.px([[hx - 3, ey - 2], [hx - 2, ey - 2], [hx - 1, ey - 1]], k);
    g.px([[hx - 2, hy + 3], [hx - 1, hy + 4], [hx, hy + 4], [hx + 1, hy + 4], [hx + 2, hy + 4], [hx + 3, hy + 4], [hx + 4, hy + 4], [hx + 5, hy + 3]], k);
    g.px([[hx, hy + 3], [hx + 2, hy + 3], [hx + 4, hy + 3]], '#fff8e0');
    // pharaoh beard
    piece(g, t => { t.poly([[hx + 1, hy + 6.6], [hx + 4, hy + 6.6], [hx + 3.4, hy + 11], [hx + 1.4, hy + 11]], GOLD[1]); });
    for (let y = hy + 7; y <= hy + 10; y += 2) for (let x = hx + 1; x <= hx + 4; x++) if (g.get(x, y) === GOLD[1]) g.set(x, y, '#3a64d0');
    // cracks in the stone
    g.px([[hx - 3, hy + 1], [hx - 2, hy + 2]].filter(([x, y]) => g.filled(x, y)), SAND[2]);
  } };

  // ---------------- Zombot Plank Walker: a pirate ship on mechanical legs, with a plank and a cannon ----------------
  BA.plankwalker = { w: 48, h: 48, draw(g, f) {
    const SHIP = ['#c8925a', '#946034', '#5e3a1e'], L = dk(GUN, 0.05);
    // legs (back pair darker), stepping
    const st = f ? 2 : -2;
    mechLeg(g, [12, 30], [8 - st * 0.5, 37], [9 - st, 44], dk(L, 0.2), 2);
    mechLeg(g, [30, 30], [34 - st * 0.5, 37], [33 - st, 44], dk(L, 0.2), 2);
    mechLeg(g, [18, 31], [14 + st * 0.5, 38], [15 + st, 44], L, 2.2);
    mechLeg(g, [35, 31], [39 + st * 0.5, 38], [39 + st, 44], L, 2.2);
    // mast + sail + flag
    piece(g, t => { t.rect(21, 3, 2, 18, SHIP[2]); t.rect(14, 5, 16, 1, SHIP[2]); });
    const bl = f ? 0.8 : 0;
    piece(g, t => { t.poly([[14.4, 6], [29.6, 6], [31.4 + bl, 9], [32 + bl, 12.6], [30.6, 15.6], [13.6, 15.6], [14.4 + bl, 12], [15 + bl, 9]], '#f4ecd6'); shade(t, 20, 9, 12, 8, ['#ffffff', '#f0e6cc', '#c4b48e']); });
    for (let y = 7; y <= 15; y++) for (const x of [18, 26]) if (g.filled(x, y)) g.set(x, y, '#d8ccac');
    // Zomboss's big red "Z" on the sail
    for (const [x, y] of [[19, 8], [20, 8], [21, 8], [22, 8], [23, 8], [24, 8], [25, 8], [24, 9], [23, 10], [22, 11], [21, 12], [20, 13], [19, 13], [20, 13], [21, 13], [22, 13], [23, 13], [24, 13], [25, 13], [25, 9], [19, 12], [20, 12], [22, 10], [23, 9]]) g.set(x, y, '#d8323a');
    piece(g, t => t.poly([[23, 1 + (f ? 0.6 : 0)], [29, 2], [28, 3.4 - (f ? 0.6 : 0)], [23, 4.4]], RED[1]));
    // hull: stern castle at the back (left), bow at the front (right)
    piece(g, t => {
      t.poly([[2, 14], [11, 14], [11, 19], [44.6, 19], [46, 16], [46.6, 19.6], [41, 31], [9, 31], [3, 24]], SHIP[1]);
      shade(t, 22, 22, 22, 12, SHIP);
      for (const y of [22, 25, 28]) for (let x = 0; x < 48; x++) if (t.filled(x, y)) t.set(x, y, SHIP[2]);
      for (let x = 0; x < 48; x++) if (t.filled(x, 19) && x > 10) t.set(x, 19, '#f2c43a');
    });
    // railing posts on the deck
    for (let x = 13; x < 44; x += 3) g.set(x, 18, SHIP[2]);
    for (let x = 12; x < 44; x++) if (!g.get(x, 17)) g.set(x, 17, INK);
    // portholes + the front cannon
    for (const x of [16, 24, 32]) { g.px([[x, 24], [x + 1, 24], [x, 25], [x + 1, 25]], '#222034'); g.set(x, 24, '#5af0ff'); }
    piece(g, t => { t.rect(38, 23, 7, 3, GUN[1]); t.ell(45, 24.5, 1.4, 2, GUN); });
    g.set(46, 24, INK); g.set(46, 25, INK);
    if (f) for (const [x, y] of [[47, 22], [47, 27]]) if (!g.get(x, y)) g.set(x, y, '#fff27a');
    // the plank sticking out over the front
    piece(g, t => { t.rect(36, 15, 12, 2, WOOD[1]); });
    for (let x = 37; x < 48; x += 3) if (g.filled(x, 15)) g.set(x, 15, WOOD[0]);
    // Dr. Zomboss on the stern castle
    drZ(g, 7, 9 + (f ? 1 : 0), { r: 3, body: true });
  } };

  // ---------------- Zombot Dark Dragon: a robot dragon with spiky wings and a glowing mouth ----------------
  const DRK = ['#9a88c4', '#5a4886', '#2e2450'];
  BA.darkdragon = { w: 48, h: 48, draw(g, f) {
    const d = f ? 1 : 0, MEM = ['#c070e0', '#7a3aa8', '#44206a'];
    // spiky wing (behind)
    piece(g, t => {
      t.poly([[22, 24], [16, 6 - d], [10, 9 - d], [6, 4 - d * 2], [4, 13], [1, 14 + d], [6, 20], [2, 24 + d], [12, 26]], MEM[1]);
      shade(t, 12, 14, 12, 12, MEM);
    });
    piece(g, t => { stroke(t, [[22, 24], [16, 6 - d]], 1.1, 0.6, DRK[2]); stroke(t, [[20, 24], [6, 4 - d * 2]], 0.9, 0.5, DRK[2]); stroke(t, [[18, 24], [1, 14 + d]], 0.9, 0.5, DRK[2]); });
    // tail with a spiky tip
    piece(g, t => { stroke(t, [[12, 34], [6, 38], [3, 34]], 2.4, 1, DRK[1]); t.poly([[3.4, 34], [0.6, 30], [5, 31.6]], DRK[0]); });
    // legs
    mechLeg(g, [14, 36], [11, 41], [12, 44], dk(DRK, 0.2), 2.6);
    mechLeg(g, [28, 36], [31, 41], [30, 44], DRK, 2.8);
    // body
    piece(g, t => { t.ell(21, 32, 12, 8, DRK); });
    fillIf(g, (x, y, c) => DRK.includes(c) && y === 33 && x > 12 && x < 32, DRK[2]);
    rivets(g, [[14, 30], [20, 28], [26, 29], [18, 36], [26, 36]], '#ff9aff');
    // back spikes
    piece(g, t => { for (const x of [11, 15, 19, 23]) t.poly([[x - 2, 25.6 - (x > 18 ? 0.6 : 0)], [x, 21 - (x === 15 ? 1 : 0)], [x + 2, 25.2 - (x > 18 ? 0.6 : 0)]], DRK[0]); });
    // neck + head with an open, glowing jaw
    piece(g, t => { stroke(t, [[28, 30], [33, 22], [35, 17]], 4, 3.2, DRK[1]); shade(t, 31, 23, 6, 8, DRK); });
    const hx = 37, hy = 14 + d, GLOW = f ? ['#ffffff', '#fff27a', '#ff8a2a'] : ['#ffe0ff', '#ff6ae0', '#b02ab0'];
    piece(g, t => { t.poly([[hx - 5, hy - 4], [hx + 3, hy - 4.6], [hx + 10.6, hy - 1], [hx + 10, hy + 1.4], [hx - 3, hy + 2]], DRK[1]); shade(t, hx + 2, hy - 2, 9, 5, DRK); });
    piece(g, t => { t.poly([[hx - 3, hy + 4.4], [hx + 9.4, hy + 5.6], [hx + 8, hy + 7.4], [hx - 3, hy + 7.4]], DRK[1]); shade(t, hx + 3, hy + 6, 8, 3, DRK); });
    piece(g, t => { t.poly([[hx - 3, hy + 1.6], [hx + 10, hy + 1.2], [hx + 9, hy + 5.4], [hx - 3, hy + 4.6]], GLOW[1]); shade(t, hx + 2, hy + 3, 8, 3, GLOW); });
    for (const x of [hx + 1, hx + 4, hx + 7]) { g.set(x, Math.round(hy + 2), '#ffffff'); g.set(x + 1, Math.round(hy + 5), '#ffffff'); }
    // breath sparks
    for (const [x, y] of (f ? [[47, 17], [46, 21], [45, 15]] : [[47, 19], [46, 16]])) if (!g.get(x, y)) g.set(x, y, GLOW[1]);
    // horns + glowing eye
    piece(g, t => { t.poly([[hx - 4, hy - 3], [hx - 9, hy - 8.6], [hx - 1.6, hy - 4.2]], DRK[0]); t.poly([[hx - 1, hy - 4], [hx - 3, hy - 9.6], [hx + 1.6, hy - 4.4]], DRK[0]); });
    g.px([[hx + 1, Math.round(hy - 2)], [hx + 2, Math.round(hy - 2)]], f ? '#ff5a5a' : '#fff27a'); g.set(hx + 2, Math.round(hy - 3), INK); g.set(hx + 1, Math.round(hy - 3), INK); g.set(hx + 3, Math.round(hy - 3), INK);
    g.set(hx + 9, Math.round(hy - 1), INK);
    // Dr. Zomboss in the saddle
    piece(g, t => { t.ell(23, 24.6, 4, 2, GOLD); });
    drZ(g, 23, 19 + d, { r: 2.8, body: true });
  } };

  // ---------------- Zombot Frost Mammoth: an icy robot mammoth with tusks and frost ----------------
  const ICE = ['#f0fbff', '#9fd2ee', '#4f86b8'];
  BA.frostmammoth = { w: 48, h: 48, draw(g, f) {
    const d = f ? 1 : 0, ICEd = dk(ICE, 0.18);
    // far legs
    for (const [x, x2] of [[10, 9], [26, 27]]) piece(g, t => { t.rect(x - 2, 32, 5, 11, ICEd[1]); shade(t, x, 37, 4, 8, ICEd); t.ell(x2 + 0.5, 43.4, 3.6, 1.8, dk(GUN, 0.1)); });
    // body + ice crystals on the back
    piece(g, t => { for (const [x, h] of [[8, 6], [13, 8], [18, 7], [23, 6]]) t.poly([[x - 2.2, 18], [x, 18 - h], [x + 2.2, 18]], ['#ffffff', '#c8f0ff', '#7ab8e0'][1]); });
    piece(g, t => { t.ell(19, 26, 15, 11, ICE); });
    fillIf(g, (x, y, c) => ICE.includes(c) && ((x + y) % 7 === 0) && y > 18, '#ffffff');
    fillIf(g, (x, y, c) => ICE.includes(c) && y === 30 && x > 5 && x < 33, ICE[2]);
    rivets(g, [[8, 28], [14, 31], [22, 31], [28, 28]], '#2f5a88');
    piece(g, t => { for (const [x, h] of [[18, 3], [21, 4.6], [24, 2.6]]) t.poly([[x - 1.2, 35.6], [x + 1.2, 35.6], [x, 35.6 + h]], '#e8f8ff'); });
    // near legs
    for (const [x, x2] of [[14, 14], [30, 31]]) piece(g, t => { t.rect(x - 2.6, 32, 6, 12, ICE[1]); shade(t, x, 37, 4, 8, ICE); t.ell(x2 + 0.5, 44, 4.2, 2, GUN); });
    // cockpit dome on the back with Dr. Zomboss
    piece(g, t => { t.rect(13, 13, 12, 3, GUN[1]); });
    drZWindow(g, 19, 11.6, 7, 6.4, 19.4, 11.4 + d, { r: 3.2, body: true, compact: true });
    // head, ear, trunk and tusks
    const hx = 36, hy = 20;
    piece(g, t => { t.ell(hx, hy, 8, 8, ICE); });
    piece(g, t => { t.ell(hx - 4, hy + 1.6, 4.4, 6.2, ICE); t.ell(hx - 3.6, hy + 2, 2.6, 4.2, ['#c8e8f8', '#7ab0d8', '#3e6e9e']); });
    const tr = f ? [[hx + 5, hy + 4], [hx + 8, hy + 10], [hx + 8.6, hy + 16], [hx + 11, hy + 18]] : [[hx + 5, hy + 4], [hx + 7.6, hy + 10], [hx + 7, hy + 16], [hx + 9.6, hy + 19]];
    piece(g, t => { stroke(t, tr, 3, 1.4, ICE[1]); shade(t, hx + 7, hy + 11, 4, 9, ICE); });
    for (let i = 1; i < 6; i++) { const y = hy + 6 + i * 2; for (let x = hx + 4; x < hx + 12; x++) if (g.get(x, y) && ICE.includes(g.get(x, y))) { g.set(x, y, ICE[2]); break; } }
    piece(g, t => { stroke(t, [[hx + 3, hy + 7], [hx + 9, hy + 10], [hx + 11.6, hy + 6]], 1.6, 0.8, '#fffbf0'); });
    g.px([[Math.round(hx + 9), Math.round(hy + 11)], [Math.round(hx + 10), Math.round(hy + 10)]].filter(([x, y]) => g.filled(x, y)), '#d8d0bc');
    // eye + brow + frosty helmet plate
    piece(g, t => { t.ell(hx + 1, hy - 6.6, 5.4, 2.2, GUN, 0, (x, y) => y <= hy - 5.4); });
    g.px([[hx + 3, hy - 2], [hx + 4, hy - 2], [hx + 3, hy - 1], [hx + 4, hy - 1]], f ? '#5af0ff' : '#ffffff'); g.set(hx + 4, hy - 1, INK); g.px([[hx + 2, hy - 4], [hx + 3, hy - 4], [hx + 4, hy - 3]], INK);
    // frost sparkles
    for (const [x, y] of (f ? [[3, 10], [44, 4], [30, 6], [46, 30]] : [[5, 6], [42, 8], [33, 3], [2, 20]])) if (!g.get(x, y)) { g.set(x, y, '#ffffff'); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!g.get(x + a, y + b)) g.set(x + a, y + b, '#9fd2ee'); }
  } };

  // ---------------- Zombot Tomorrow-tron: a futuristic robot with a laser cannon arm and neon lights ----------------
  const CHROME = ['#ffffff', '#c8d0e0', '#6a7490'];
  BA.tomorrowtron = { w: 48, h: 48, draw(g, f) {
    const NEON = f ? '#ff5ad8' : '#5af0ff', NEON2 = f ? '#5af0ff' : '#ff5ad8', d = f ? 1 : 0;
    // back arm
    piece(g, t => { stroke(t, [[16, 22], [10, 29], [11, 35]], 2.4, 2, dk(CHROME, 0.2)[1]); t.ell(11, 36, 2.6, 2.4, dk(CHROME, 0.2)); });
    // legs
    mechLeg(g, [19, 33], [15, 39], [15, 44], dk(CHROME, 0.18), 2.6);
    mechLeg(g, [27, 33], [31, 39], [31, 44], CHROME, 2.8);
    fillIf(g, (x, y, c) => (x === 31 || x === 15) && y > 34 && y < 43 && g.filled(x, y), NEON);
    // torso
    piece(g, t => { t.poly([[14, 19], [33, 19], [35, 23], [31, 35], [16, 35], [12, 23]], CHROME[1]); shade(t, 22, 24, 13, 12, CHROME); });
    fillIf(g, (x, y, c) => CHROME.includes(c) && (y === 27) && x > 13 && x < 34, NEON2);
    piece(g, t => t.ell(24, 23, 3, 3, f ? ['#ffffff', '#ff5ad8', '#a02a8a'] : ['#ffffff', '#5af0ff', '#2a90b0']));
    g.set(23, 22, '#ffffff');
    rivets(g, [[16, 21], [31, 21], [18, 33], [29, 33]], '#3a4058');
    // head: chrome dome with a glass cockpit, Dr. Zomboss inside, antennae with neon tips
    piece(g, t => { t.rect(21, 16, 6, 4, GUN[1]); });
    piece(g, t => { t.ell(24, 10 + d * 0.5, 8.4, 7, CHROME); });
    piece(g, t => t.ell(26, 10.4, 6.4, 5.4, GUN));
    drZWindow(g, 26, 10.4, 5.4, 4.6, 26, 10.4 + d * 0.6, { r: 2.9, body: true, compact: true });
    for (const [x, tip] of [[19, 1], [29, 2]]) { g.rect(x, tip + 1, 1, 3, GUN[1]); g.set(x, tip, NEON); if (!g.get(x - 1, tip)) g.set(x - 1, tip, INK); if (!g.get(x + 1, tip)) g.set(x + 1, tip, INK); if (!g.get(x, tip - 1)) g.set(x, tip - 1, INK); }
    fillIf(g, (x, y, c) => CHROME.includes(c) && y === 15 && x > 16 && x < 32, NEON2);
    // laser cannon arm
    piece(g, t => { stroke(t, [[31, 22], [35, 26]], 2.6, 2.4, CHROME[1]); });
    piece(g, t => { t.rect(33, 23, 11, 5, GUN[1]); shade(t, 37, 24, 8, 4, GUN); t.rect(44, 24, 2, 3, GUN[2]); });
    for (const x of [35, 37, 39]) for (let y = 23; y < 28; y++) if (g.filled(x, y)) g.set(x, y, NEON);
    piece(g, t => t.ell(46.4, 25.5, 1.2, 1.8, f ? ['#ffffff', '#ff5ad8', '#a02a8a'] : ['#ffffff', '#5af0ff', '#2a90b0']));
    if (f) for (const [x, y] of [[47, 22], [47, 29]]) if (!g.get(x, y)) g.set(x, y, '#ffffff');
  } };
})();
