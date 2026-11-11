// art-v2-zombies-a.js — PVZ Garden v2 pixel art: the shared zombie body + the MASTER zombies (Basic, Conehead).
// Logical 64x64 grid, feet on row 62, centred on column 32, FACING RIGHT (the game mirrors them to walk left).
// Poses (the engine's P): idle {} | walk A {walk, frame 0} | walk B {walk, frame 1} | bite {mouth 'open'} | hurt {eyes 'sad', mouth 'o'}.
// Cute, silly, toy-like: huge googly eyes, a goofy open mouth, never gross (family rule). Matches references/01 (Zombie, Conehead).
(function () {
  'use strict';
  const V = PX.v2, { ell, poly, rect, px, piece, cel, round, line, bres, ramp, mix, OUT, WHITE } = V;
  const ART = PX.ZOMBIE_ART2;
  const Z = PX.v2Z = {};

  Z.SKIN = ['#eef6d2', '#c9d9a6', '#9db887', '#6b8f78', '#43615a'];
  Z.JACKET = ['#d39a6c', '#b0784e', '#8c5838', '#613c27', '#3e251a'];
  Z.SHIRT = ['#ffffff', '#f6f4ec', '#e2ddd0', '#b9b2a3', '#8a8474'];
  Z.TIE = ['#ffb0a0', '#f56050', '#d8323c', '#a21f31', '#6a1426'];
  Z.PANTS = ['#a8c8ff', '#6f94e6', '#4c6fc4', '#344f98', '#22356a'];
  Z.SHOES = ['#b07c5a', '#86593c', '#64402a', '#452b1d', '#2c1a11'];
  Z.HAIR = ['#a8664a', '#86503a', '#66392b', '#4a281f', '#311a14'];
  Z.EYE = { whiteCol: '#fdf8cf', whiteSh: '#dcd08f', pupilCol: '#2a1f2e' };

  // the pose's leg / arm / head offsets
  function poseOf(P) {
    const walk = !!P.walk, f = P.frame ? 1 : 0, bite = P.mouth === 'open' || P.mouth === 'grin', hurt = P.eyes === 'sad';
    return {
      walk, f, bite, hurt,
      // feet x (front, back) relative to the hips, and how high a foot lifts
      legs: walk ? (f ? { fx: 2, bx: -2, lift: 2 } : { fx: 7, bx: -6, lift: 0 }) : { fx: 3, bx: -3, lift: 0 },
      bob: walk && f ? -1 : 0, lean: bite ? 2 : hurt ? -2 : 0, armUp: hurt ? -5 : bite ? -1 : 0, armReach: bite ? 3 : walk && !f ? 1 : 0,
    };
  }

  // the whole zombie. o = { skin, jacket, shirt, tie, pants, shoes, hair (ramps or null), bodyW (half-width of the torso), headR,
  //   noTie, noJacket (shirt only), tank (a wider build), head(g, H) / front(g, H) / back(g, H) hooks for headgear and props,
  //   mouthW, eyeR }  ->  returns H (head geometry in logical px) for hooks
  function body(g, P, o) {
    o = o || {}; const p = poseOf(P);
    const SK = o.skin || Z.SKIN, JK = o.jacket || Z.JACKET, SH = o.shirt || Z.SHIRT, TI = o.tie || Z.TIE, PA = o.pants || Z.PANTS, SO = o.shoes || Z.SHOES;
    const hipY = 49 + p.bob, hipX = 31, footY = 60;
    const bw = o.bodyW || 8, hr = o.headR || 12;
    const hx = 32 + p.lean, hy = 25 + p.bob + (p.hurt ? 1 : 0);
    const H = { hx, hy, rx: hr, ry: hr - 1, top: hy - hr, p };
    if (o.back) o.back(g, H);
    // --- the back leg, then the back arm (behind the body)
    const leg = (x0, y0, x1, y1, lift, R, shoe) => {
      piece(g, t => { line(t, [[x0, y0], [x1, y1 - 3 - lift]], 2.6, R[2]); cel(t, R, { s: [2, 1], h: [1, 1] }); });
      piece(g, t => { ell(t, x1 + 2, y1 - 2 - lift, 4.2, 2.6, SO[2]); rect(t, x1 - 2, y1 - 2 - lift, 8, 2, SO[2]); cel(t, SO, { s: [1, 1], h: [1, 1], spec: [x1 + 1, y1 - 4 - lift, 1.2, 0.6] }); });
    };
    leg(hipX - 2, hipY, hipX + p.legs.bx, footY, p.walk && p.f ? 0 : 0, mix(PA[2], '#000000', 0) && PA.map(c => mix(c, '#1a1530', 0.18)), SO);
    // back arm: from the far shoulder, forward and down (the hand near the hip, in front)
    const sY = 38 + p.bob;
    piece(g, t => { line(t, [[hipX - 3, sY], [hipX + 4 + p.armReach, sY + 7 + p.armUp]], 2.4, JK.map(c => mix(c, '#1a1530', 0.18))[2]); cel(t, JK.map(c => mix(c, '#1a1530', 0.18)), { s: [1, 2], h: [1, 1] }); });
    piece(g, t => { ell(t, hipX + 6 + p.armReach, sY + 8 + p.armUp, 2.6, 2.4, SK[3]); cel(t, SK, { only: SK[3], noHi: true }); });
    // --- the front leg (over the back one, under the coat's hem)
    leg(hipX + 2, hipY, hipX + 2 + p.legs.fx, footY, p.walk && p.f ? 2 : 0, PA, SO);
    // --- the torso: a coat over a white shirt and a red tie, hunched forward, a ragged hem
    const tx0 = hipX - bw, tx1 = hipX + bw + 1, ty0 = 36 + p.bob, ty1 = hipY + 2;
    piece(g, t => {
      poly(t, [[tx0 + 1, ty0 + 1], [tx1 + 1, ty0], [tx1 + 2, ty1 - 1], [tx0, ty1]], o.noJacket ? SH[2] : JK[2]);
      // ragged hem: three little notches
      if (!o.noJacket) for (const nx of [tx0 + 3, tx0 + 7, tx1 - 3]) px(t, [[nx, ty1], [nx, ty1 - 1]], null);
      cel(t, o.noJacket ? SH : JK, { s: [3, 2], h: [2, 2] });
      if (!o.noJacket) { // the open front: shirt + tie
        poly(t, [[hipX + 1, ty0 + 1], [hipX + 6, ty0 + 1], [hipX + 4, ty1 - 3], [hipX + 2, ty1 - 3]], SH[2]);
        px(t, [[hipX + 1, ty0 + 2], [hipX + 1, ty0 + 3], [hipX + 6, ty0 + 2]], SH[1]);
        for (let y = ty0 + 2; y < ty1 - 4; y++) { const w = y < ty0 + 4 ? 1 : 2; for (let i = 0; i < w; i++) t.fset(hipX + 3 + i, y, y < ty0 + 4 ? TI[3] : i ? TI[3] : TI[2]); }
        px(t, [[hipX + 2, ty0 + 2], [hipX + 4, ty0 + 2]], TI[1]);
        // lapels: a darker crease each side of the opening
        bres(t, hipX, ty0 + 2, hipX + 1, ty1 - 4, JK[3]); bres(t, hipX + 7, ty0 + 2, hipX + 5, ty1 - 4, JK[3]);
      }
    });
    if (o.belly) o.belly(g, H);
    // --- the head: a big round head, a fuller back of the skull, a chin pushed forward, an ear, a few hair strands
    piece(g, t => {
      ell(t, hx, hy, hr, hr - 1, SK[2]);
      ell(t, hx - 2, hy - 2, hr - 1, hr - 2, SK[2]);
      ell(t, hx + 4, hy + 7, hr * 0.55, hr * 0.42, SK[2]); // jaw
      round(t, SK, { cx: hx - 1, cy: hy - 1, rx: hr + 1, ry: hr, spec: [-0.45, -0.6, 0.18, 0.12], band: [0.62, 0.26, -0.05] });
      // forehead creases + a stitch, the brow ridge shadow under which the eyes sit
      bres(t, hx - 6, hy - 7, hx - 2, hy - 8, SK[3]);
    });
    piece(g, t => { ell(t, hx - hr + 1, hy + 2, 2.4, 3.2, SK[2]); cel(t, SK, { s: [1, 1], h: [1, 1] }); px(t, [[hx - hr + 1, hy + 2], [hx - hr + 1, hy + 3]], SK[4]); });
    if (o.hair !== null) piece(g, t => { const HR = o.hair || Z.HAIR; for (const [x0, y0, x1, y1] of [[hx - 6, hy - hr + 2, hx - 9, hy - hr - 3], [hx - 2, hy - hr + 1, hx - 2, hy - hr - 4], [hx + 2, hy - hr + 1, hx + 5, hy - hr - 3], [hx - 4, hy - hr + 1, hx - 7, hy - hr - 4]]) line(t, [[x0, y0], [(x0 + x1) / 2 + 1, (y0 + y1) / 2], [x1, y1]], 0.6, HR[2]); }, { outline: false });
    // the eyes: two huge googly eyes, the front one bigger; pupils look ahead (wild when hurt)
    const er = o.eyeR || 5, eyeY = hy - 1;
    const look = p.hurt ? [-0.6, -0.5] : p.bite ? [0.7, 0.2] : [0.5, 0.15];
    V.eye(g, hx - 3 - er + 1, eyeY - er, er * 2 - 1, er * 2, p.hurt ? undefined : P.eyes, -1, Object.assign({ white: true, look, pupil: 2 }, Z.EYE));
    V.eye(g, hx + 6 - er, eyeY - er - 1, er * 2 + 1, er * 2 + 2, p.hurt ? undefined : P.eyes, 1, Object.assign({ white: true, look, pupil: 3 }, Z.EYE));
    // sockets: a cool shadow under each eye
    for (const [x, w] of [[hx - 3 - er + 1, er * 2 - 1], [hx + 6 - er, er * 2 + 1]]) for (let i = 1; i < w - 1; i++) { const y = eyeY + er + (x > hx ? 1 : 0); if (g.fget(x + i, y) === SK[2] || g.fget(x + i, y) === SK[1] || g.fget(x + i, y) === SK[3]) g.fset(x + i, y, SK[3]); }
    // the mouth: goofy and open (wider when it bites), a couple of square teeth, one missing
    const mw = (o.mouthW || 8) + (p.bite ? 2 : 0), mx = hx + 5, my = hy + 6, mh = p.bite ? 6 : 4;
    if (P.mouth === 'o' || p.hurt) { ell(g, mx, my + 1, 2.2, 2.4, '#7a2236'); V.ring(g, mx, my + 1, 2.2, 2.4, OUT); }
    else {
      for (let j = 0; j < mh; j++) for (let i = 0; i < mw; i++) { const edge = j === 0 || j === mh - 1 || i === 0 || i === mw - 1; g.fset(mx - Math.floor(mw / 2) + i, my + j - (j === mh - 1 && (i === 0 || i === mw - 1) ? 1 : 0), edge ? OUT : j >= mh - 2 ? '#c9475e' : '#7a2236'); }
      const tx = mx - Math.floor(mw / 2) + 1; px(g, [[tx, my + 1], [tx + 1, my + 1], [tx + 3, my + 1], [tx + 4, my + 1]].filter(([x]) => x < mx + Math.floor(mw / 2) - 1), WHITE);
      if (mw >= 7) px(g, [[tx + 3, my + 2]], '#e8e2d2');
    }
    // the front arm last: reaching forward at shoulder height (the zombie pose), green hand with chunky fingers
    const ax0 = hipX + 4, ay0 = sY + 1, ax1 = hipX + 14 + p.armReach, ay1 = sY + 3 + p.armUp;
    piece(g, t => { line(t, [[ax0, ay0], [ax1, ay1]], 2.6, (o.sleeve || JK)[2]); cel(t, o.sleeve || JK, { s: [1, 2], h: [1, 1] }); });
    piece(g, t => {
      ell(t, ax1 + 3, ay1 + 1, 3, 2.8, SK[2]);
      rect(t, ax1 + 4, ay1 + 2, 3, 2, SK[2]); // fingers
      cel(t, SK, { s: [1, 1], h: [1, 1] });
      px(t, [[ax1 + 5, ay1 + 3], [ax1 + 6, ay1 + 1]], SK[3]);
    });
    if (o.head) o.head(g, H);
    if (o.front) o.front(g, H);
    return H;
  }
  Z.body = body; Z.poseOf = poseOf;

  // ===================== BASIC ZOMBIE =====================
  ART.basic = function (g, P, L) { body(g, P || {}, {}); };

  // ===================== CONEHEAD =====================
  // a big orange traffic cone with two white stripes, sitting firmly on the head, tipped back a little
  Z.CONE = ['#ffd2a0', '#ffa04a', '#f2701e', '#c24d16', '#7e2f12'];
  Z.cone = function (g, H, o) {
    o = o || {}; const C = o.R || Z.CONE, cx = H.hx - 1, base = H.top + 3, h = o.h || 13, w = o.w || 10, tip = [cx - 2, base - h];
    piece(g, t => {
      poly(t, [[cx - w, base], [cx + w, base], [tip[0] + 2, tip[1]], [tip[0] - 1, tip[1]]], C[2]);
      cel(t, C, { s: [3, 1], h: [2, 1], spec: [cx - w * 0.45, base - h * 0.45, 1, 3] });
      // two white stripes (shaded like the cone)
      for (const f of [0.34, 0.66]) { const y = Math.round(base - h * f); for (let x = cx - w; x <= cx + w; x++) for (let j = 0; j < 2; j++) { const c = t.fget(x, y + j); if (c && c !== OUT) t.fset(x, y + j, c === C[3] || c === C[4] ? '#d8d2c8' : '#fbf8f0'); } }
    });
    // the square base rim, wider than the cone
    piece(g, t => { rect(t, cx - w - 2, base - 1, 2 * w + 5, 3, C[3]); cel(t, C, { only: C[3], s: [1, 1], h: [1, 1] }); px(t, [[cx - w - 1, base - 1], [cx - w, base - 1]], C[1]); });
  };
  ART.conehead = function (g, P, L) { body(g, P || {}, { head: (gg, H) => Z.cone(gg, H) }); };
})();
