// chibi-reference.js — the GOLD STANDARD for PVZ Garden characters (not loaded by the game; copy its approach).
// Chibi = super-deformed: the head IS the character (1.3–2 heads tall), round and at least as wide as tall, big glossy eyes set
// LOW and wide, tiny mouth (or none), soft blush, stubby simple body, bold clean outline, flat pastel colours with ONE soft shade
// (ramp [mid, mid, shade]) plus a small highlight. No long stems, no thin limbs, no texture noise, no small clutter.
// Plants: head bottom sits on art row ~25–26, two little round base leaves on rows 27–30, a stem of at most 2–3 px (often hidden).
// Head size by stage: about 8 / 9 / 10 art px across the half-width (stage 2 may add a costume part or extra head; stay in 32x32).
// NOT ONE CIRCLE FOR EVERYTHING, but subtle: each character gets its own silhouette (a slightly oval, gently leaning Peashooter, an egg Wall-nut, beans, pears
// (Squash), squashed domes (mushroom caps), stars, hearts... Combine 2–3 overlapping ellipses/polys so shapes feel organic.
// Eyes (art director, v3 — BIGGER than the first draft; small eyes read as creepy beads): PX.art.chibiEyes(g, cx, cy,
// { sp: r*0.86, w: r*0.48, h: r*0.64, mood: P.eyes }) where cx is shifted ~0.8 px toward the front (sprites face right) and cy is
// a little BELOW the head centre (hy + 0.16 ry). Each eye is about a third of the head's height. Blush: PX.art.blush(g, cx, cy + r*0.42, { sp: r*1.0 }).
// Walking = a hop (lift the whole plant 1–2 px on frame 1) and/or a squash; arms:'up' = leaves raised / a bigger hop.
(function () {
  'use strict';
  const D = {};
  const flat = R => [R[1], R[1], R[2]];                    // flat fill + one soft shade on the lower right
  const piece = (g, f) => PX.piece(g, f);

  // ---- Peashooter (Repeater, Gatling Pea) ----  (v3, approved by the art director)
  // Head: only SLIGHTLY oval (1.06 x 0.95) plus a small overlapping bulge at the upper back, so the skull is a touch fuller behind
  // and the silhouette has a soft profile — measured outside-to-outside it is only ~7% wider than tall. NOT a circle, NOT stretched.
  // Snout: a SHORT, CHUNKY tube that is part of the head piece (no line where it joins), sticking out only ~2 px past the head,
  // half-height 0.36 r, flaring very gently (x1.2) to the opening: a pale lip ring (half-width 1.6) round a dark hole. Total reach
  // past the head ~3.5 px. Keep these ratios when you scale it; a longer or thinner tube reads as a weird neck between head and mouth.
  // Eyes: BIG (w 0.48 r, h 0.64 r), wide (sp 0.86 r), a little below centre (hy + 0.16 ry), shifted 0.8 px toward the snout.
  // Stage 2 (Gatling Pea): olive army helmet + a 4-barrel muzzle (four little holes in the lip).
  D.peashooter = function (g, stage, P, C) {
    const A = PX.art, M = C.main, L = C.leaf, r = [8, 9, 10][stage], rx = r * 1.06, ry = r * 0.95, rot = -0.06;
    const hop = P.walk && P.frame ? -1.5 : P.arms === 'up' ? -1 : 0, hx = 14, hy = 26 - ry + hop + 0.3;
    piece(g, t => { t.ell(11.2, 28.7, 4.3, 1.9, flat(L), -0.22); t.ell(19.2, 28.7, 4.3, 1.9, flat(L), 0.22); });   // base leaves
    piece(g, t => PX.stroke(t, [[15, 28.6], [14.8, hy + ry - 1]], 0.95, 0.95, C.stem));                           // tiny stem
    piece(g, t => { t.ell(hx - rx * 0.6, hy - ry * 0.86, 3.3, 1.65, flat(L), -0.95); if (stage >= 1) t.ell(hx - rx * 0.92, hy - ry * 0.34, 3.1, 1.55, flat(L), -0.3); });
    const tl = 2.0, th = r * 0.36, fl = 1.2, sy = hy + r * 0.08, x0 = hx + rx * 0.7, x1 = hx + rx + tl;
    piece(g, t => { // head + snout tube in ONE piece
      t.poly([[x0, sy - th], [x1, sy - th * fl], [x1, sy + th * fl], [x0, sy + th]], M[1]);                        // the tube
      A.softBody(t, hx - rx * 0.14, hy - ry * 0.1, rx * 0.86, ry * 0.86, M, { rot, hl: false });                   // fuller back of the head
      A.softBody(t, hx, hy, rx, ry, M, { rot });
      t.poly([[x0 + 1, sy + th * 0.35], [x1, sy + th * fl * 0.35], [x1, sy + th * fl], [x0 + 1, sy + th]], M[2], x => x > hx + rx - 0.8); // tube underside shade
      t.ell((x0 + x1) / 2 + 0.8, sy - th * 0.55, (x1 - x0) * 0.25, th * 0.18, M[0], 0, x => x > hx + rx - 0.4);                       // tube glint
    });
    const rw = stage === 2 ? 2.0 : 1.6, rh = th * fl, ox = x1 - 0.1 + (stage === 2 ? 0.3 : 0), hole = PX.mixHex(M[2], '#2b2129', 0.6);                       // the opening
    piece(g, t => {
      t.ell(ox, sy, rw, rh, M[0]);
      if (stage < 2) t.ell(ox + rw * 0.15, sy + 0.05, rw * 0.58, rh * 0.7, hole);
      else for (const [dx, dy] of [[-0.45, -0.42], [0.65, -0.42], [-0.45, 0.46], [0.65, 0.46]]) t.ell(ox + dx, sy + dy * rh, 0.5, rh * 0.25, hole); // 4 barrels
    });
    if (stage === 2) piece(g, t => PX.art.armyHelmet(t, hx - 0.3, Math.round(hy - ry * 0.42), rx * 0.95));
    piece(g, t => { const by = hy + ry * 0.95; t.poly([[14.8, by], [11.7, by - 1.5], [11.7, by + 1.5]], '#ff8f8f'); t.poly([[14.8, by], [17.9, by - 1.5], [17.9, by + 1.5]], '#ff8f8f'); t.ell(14.8, by, 0.95, 0.95, '#f26f78'); }); // bow tie
    if (stage === 2) PX.art.armyHelmetDetails(g, hx - 0.3, Math.round(hy - ry * 0.42), rx * 0.95);
    const ex = hx + 0.8, ey = hy + ry * 0.16;
    A.chibiEyes(g, ex, ey, { sp: r * 0.86, w: r * 0.48, h: r * 0.64, mood: P.eyes });
    A.blush(g, ex - 0.2, ey + r * 0.42, { sp: r * 1.0 });
    return { hx: Math.round(hx), hy: Math.round(hy), hr: r, top: Math.round(hy - ry), ey: Math.round(ey), front: Math.round(ox + rw) };
  };

  // ---- Sunflower ----
  D.sunflower = function (g, stage, P, C) {
    const A = PX.art, hop = P.walk && P.frame ? -1.5 : P.arms === 'up' ? -1 : 0;
    const fr = 6.8, pr = 9.4, hx = 15.5, hy = 26 - pr + hop + 0.4, PET = ['#fff3b0', '#ffe07a', '#f2be52'], FACE = ['#f6cf98', '#e8b07a', '#c98d58'];
    piece(g, t => { t.ell(11.4, 28.7, 4.4, 1.9, flat(C.leaf), -0.22); t.ell(19.8, 28.7, 4.4, 1.9, flat(C.leaf), 0.22); });
    piece(g, t => PX.stroke(t, [[15.6, 28.6], [15.5, hy + fr]], 0.95, 0.95, C.stem));
    piece(g, t => { for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; t.ell(hx + Math.cos(a) * (pr - 1.9), hy + Math.sin(a) * (pr - 1.9), 2.5, 2.0, flat(PET), a); } });
    piece(g, t => A.softBody(t, hx, hy, fr, fr, FACE));
    const ex = hx + 0.5, ey = hy + 0.2;                                     // eyes BIG like Peashooter's (w 0.48, h 0.64 of the face radius)
    A.chibiEyes(g, ex, ey, { sp: fr * 0.84, w: fr * 0.46, h: fr * 0.62, mood: P.eyes, col: '#4a2c22' });
    A.chibiMouth(g, ex, ey + 3.3, P.mouth || 'smile', 2.2);
    A.blush(g, ex, ey + 2.5, { sp: 7.6, w: 1.1, h: 0.7 });
    return { hx: Math.round(hx), hy: Math.round(hy), hr: Math.round(pr), top: Math.round(hy - pr), ey: Math.round(ey) };
  };

  // ---- Wall-nut ----
  D.wallnut = function (g, stage, P, C) {
    const A = PX.art, hop = P.walk && P.frame ? -1 : 0, rx = [8.6, 8.8, 9.4][stage], ry = [9.6, 11.6, 13][stage];
    const hx = 15.5, hy = 30.4 - ry + hop, N = ['#f6dcae', '#e6bd86', '#c99a62'];
    piece(g, t => A.softBody(t, hx, hy, rx, ry, N));
    PX.stroke(g, [[hx - 2.5, hy - ry + 2.2], [hx - 1.2, hy - ry + 3.4], [hx - 1.8, hy - ry + 4.6]], 0.3, 0.3, '#a87c4c'); // a little crack
    const ex = hx + 1.2, ey = hy - ry * 0.08;
    A.chibiEyes(g, ex, ey, { white: true, sp: 6.4, w: 4.4, h: 5, look: [0.5, -0.1], mood: P.eyes });
    A.blush(g, ex, ey + 3.6, { sp: 9 });
    return { hx: Math.round(hx), hy: Math.round(hy), hr: Math.round(rx), top: Math.round(hy - ry), ey: Math.round(ey) };
  };

  // ---- Zombie (basic) ----
  D.zombie = function (g, P) {
    const A = PX.art, f = P.walk ? (P.frame ? 1 : 0) : 0;
    const SK = ['#dcebc8', '#c2d8ac', '#9fbc8a'], COAT = ['#caa07a', '#ad835e', '#8b6644'], PANTS = ['#9aa0c4', '#8189b0', '#646c94'];
    // legs + shoes (stubby), one steps forward on frame 1
    piece(g, t => { t.ell(12.6 - f * 0.6, 28.4, 1.9, 2.4, flat(PANTS)); t.ell(17.8 + f * 0.6, 28.4, 1.9, 2.4, flat(PANTS)); });
    piece(g, t => { t.ell(12.4 - f * 0.8, 30.3, 2.4, 1.2, ['#6e5a5e', '#6e5a5e', '#4e3e42']); t.ell(18.6 + f * 0.8, 30.3, 2.4, 1.2, ['#6e5a5e', '#6e5a5e', '#4e3e42']); });
    piece(g, t => PX.stroke(t, [[12.5, 22.5], [10.2, 25.2]], 1.3, 1.3, COAT[2]));                  // back arm (a nub)
    piece(g, t => A.softBody(t, 15.2, 24, 5.6, 4.6, COAT, { hl: false }));                            // body: an egg
    piece(g, t => { t.poly([[13.4, 19.8], [17, 19.8], [15.2, 24.2]], '#fbf6ee'); });                 // shirt
    piece(g, t => t.poly([[15.2, 20.6], [16.1, 22.4], [15.2, 25], [14.3, 22.4]], '#f07a7a'));         // red tie
    piece(g, t => { PX.stroke(t, [[18.6, 21.6], [25, 21.2]], 1.45, 1.35, COAT[1]); t.ell(26.2, 21.2, 1.7, 1.6, flat(SK)); }); // arm reaching forward
    piece(g, t => A.softBody(t, 16.6, 11.2, 10, 9.2, SK));                                           // the BIG head
    for (const [a, b] of [[[13, 2.4], [12.2, 0.6]], [[15.4, 2], [15.6, 0.3]], [[17.6, 2.2], [18.6, 0.8]]]) PX.stroke(g, [a, b], 0.32, 0.32, '#3a2d34'); // hair strands
    piece(g, t => t.poly([[11.4, 4.2], [15.4, 3.4], [15.9, 6.4], [11.9, 7.2]], '#ffc8d8'));            // pink sticky note
    PX.stroke(g, [[12.4, 5.2], [14.8, 4.7]], 0.25, 0.25, '#e890b0');
    A.chibiEyes(g, 18.8, 11.6, { white: true, sp: 6.6, w: 5.2, h: 5.6, look: [0.55, 0.25], mood: P.eyes });
    A.chibiMouth(g, 20.4, 17, P.mouth === 'open' ? 'open' : 'flat', 2.6);
    g.dots([[20.3, 17.3], [20.8, 17.3]], '#ffffff');                                                    // one tooth
    return g;
  };
  PX.CHIBI_DEMO = D;
})();
