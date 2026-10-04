// art-zombies3.js — PVZ Garden: 16 more zombies (PvZ 1 and PvZ 2 worlds) in the TRUE chibi style.
// Same contract and kit as art-zombies2.js: PX.ZOMBIE_ART[kind] = function (g, P, L) on a 32x32 grid facing right, feet on
// rows 29-31, built with PX.ZKIT (exported by art-zombies.js). Riders and flyers (Zomboni, bobsled, dolphin, seagull, jetpack)
// draw the zombie on its own grid and lay it over the scene a few pixels up (rider() / shiftMerge()); Bungee hangs upside
// down and is drawn by hand.
(function () {
  'use strict';
  if (!window.PX || !PX.ZKIT) return;
  const { INK, stroke, Grid } = PX;
  const A = PX.art, mixHex = PX.mixHex;
  const K = PX.ZKIT;
  const { zombie, handOver, blob, recol, thin, rrect, note, zEyes, piece, flat, R3, SKIN, COAT, METAL, GOLD, WOOD, W } = K;
  const ZA = PX.ZOMBIE_ART;
  const FLAME = R3('#ffaa4a', 0.12), FLAME2 = R3('#ffe27a', 0.1);
  // a ramp a shade darker (the far arm, leg or wing)
  const dk = R => R.map(c => mixHex(c, '#4a3646', 0.15));

  // ---------------- riders: the zombie on its own grid, laid over the vehicle dx, dy art px away ----------------
  function shiftMerge(g, t, dx, dy) {
    const k = g.k || 1, ox = Math.round(dx * k), oy = Math.round(dy * k);
    for (let fy = 0; fy < t.fh; fy++) for (let fx = 0; fx < t.fw; fx++) {
      const v = t.a[fy * t.fw + fx]; if (v == null) continue;
      const x = fx + ox, y = fy + oy; if (x < 0 || y < 0 || x >= g.fw || y >= g.fh) continue;
      g.a[y * g.fw + x] = v;
    }
  }
  function rider(g, P, o, dx, dy) {
    const t = new Grid(g.w, g.h, g.k), G = zombie(t, P, o);
    shiftMerge(g, t, dx, dy);
    const sh = p => [p[0] + dx, p[1] + dy];
    return Object.assign({}, G, { hand: sh(G.hand), hand2: sh(G.hand2), hx: G.hx + dx, hy: G.hy + dy, top: G.top + dy, ex: G.ex + dx, ey: G.ey + dy, mx: G.mx + dx, my: G.my + dy });
  }
  // a hand (on top of a steering wheel, a fin...)
  const handAt = (g, p, s, R) => piece(g, t => t.ell(p[0], p[1], 1.7 * s, 1.6 * s, flat(R || SKIN)));
  // the same flame upside down (a jet): the round end at the top, the tip pointing down
  function flameDown(g, x, y, sc, f) {
    const sw = f ? 0.5 : -0.4, L = f ? 4.2 : 3.6;
    piece(g, t => blob(t, [[x, y, 1.55 * sc, 1.5 * sc], { p: [[x - 1.5 * sc, y + 0.3 * sc], [x + sw * sc, y + L * sc], [x + 1.5 * sc, y + 0.3 * sc]] }], FLAME, { hl: false, d: [0.5, 0.5] }));
    piece(g, t => blob(t, [[x, y - 0.1 * sc, 0.85 * sc, 0.8 * sc], { p: [[x - 0.8 * sc, y], [x + sw * 0.6 * sc, y + (L - 1.6) * sc], [x + 0.8 * sc, y]] }], FLAME2, { hl: false }));
  }
  // a round flame (a teardrop with a yellow heart) whose tip sways with the frame
  function flame(g, x, y, sc, f) {
    const sw = f ? 0.7 : -0.4;
    piece(g, t => blob(t, [[x, y, 2 * sc, 2 * sc], { p: [[x - 1.9 * sc, y - 0.4 * sc], [x + sw * sc, y - 5 * sc], [x + 1.9 * sc, y - 0.4 * sc]] }], FLAME, { hl: false, d: [0.6, 0.6] }));
    piece(g, t => blob(t, [[x + 0.2 * sc, y + 0.4 * sc, 1.1 * sc, 1.1 * sc], { p: [[x - 0.9 * sc, y + 0.2 * sc], [x + sw * 0.6 * sc, y - 2.6 * sc], [x + 1.2 * sc, y + 0.2 * sc]] }], FLAME2, { hl: false }));
  }

  // =====================================================================================================
  // PLANT-HEAD ZOMBIES
  // =====================================================================================================
  // ---------------- Peashooter Zombie: a zombie body wearing a big Peashooter head (snout and leaf tuft) ----------------
  const PEA = ['#eefcd0', '#b2e78a', '#8ccd6c'], PLEAF = ['#d2f4ac', '#8fd46e', '#68b058'];
  ZA.peashooterzombie = (g, P) => zombie(g, P, {
    hw: 0.9, hh: 0.96, hair: false, face: false, edx: -1.8, edy: 0.2,
    mid0(g, G) { // the leaf tuft at the back of the head (behind it)
      const { hx, hy, hrx, hry } = G;
      piece(g, t => { t.ell(hx - hrx * 0.64, hy - hry * 0.84, 4.4, 2.1, flat(PLEAF), -0.95); t.ell(hx - hrx * 1.02, hy - hry * 0.34, 3.8, 1.9, flat(PLEAF), -0.35); });
    },
    head(t, G) { // the pea head (a wide oval, fuller at the back) and its short chunky snout, in one piece
      const { hx, hy, hrx, hry } = G, th = hry * 0.36, sy = hy + hry * 0.12, x0 = hx + hrx * 0.7, x1 = hx + hrx + 2.4;
      blob(t, [[hx - hrx * 0.14, hy - hry * 0.1, hrx * 0.86, hry * 0.86], [hx, hy, hrx, hry], { p: [[x0, sy - th], [x1, sy - th * 1.18], [x1, sy + th * 1.18], [x0, sy + th]] }], PEA,
        { d: [hrx * 0.12, hry * 0.14], hl: [hx - hrx * 0.5, hy - hry * 0.52, 1.6, 0.9] });
      G.snout = [x1, sy, th * 1.18];
    },
    hat(g, G) { // googly zombie eyes, and the snout's opening (the snout is its mouth: it opens wide to chomp)
      zEyes(g, G, G.P);
      const [x1, sy, rh] = G.snout, open = G.P.mouth === 'open' || G.P.mouth === 'o' || G.P.mouth === 'grin';
      piece(g, t => t.ell(x1 - 0.1, sy, 1.7, rh, PEA[0]));
      piece(g, t => t.ell(x1 + 0.2, sy + 0.05, open ? 1.35 : 1, rh * (open ? 0.8 : 0.62), mixHex(PEA[2], '#2b2129', open ? 0.5 : 0.6)));
      if (open) g.dots([[x1 - 0.2, sy - rh * 0.4], [x1 + 0.3, sy - rh * 0.4]], W);
    },
  });

  // ---------------- Wall-nut Zombie: a zombie body wearing a big Wall-nut head ----------------
  const NUT = ['#fdebcb', '#efcb99', '#d8ab76'], NUTCK = mixHex('#d8ab76', '#7a5232', 0.45);
  ZA.wallnutzombie = (g, P) => zombie(g, P, {
    s: 0.96, hw: 0.94, hh: 1.12, hdy: 0.4, hair: false, edy: 0.6,
    head(t, G) { // a light-brown egg, fuller at the bottom
      const { hx, hy, hrx, hry } = G;
      blob(t, [[hx, hy, hrx, hry], [hx + 0.2, hy + hry * 0.3, hrx * 1.03, hry * 0.68]], NUT, { d: [hrx * 0.15, hry * 0.15], hl: [hx - hrx * 0.42, hy - hry * 0.52, hrx * 0.24, hry * 0.12] });
    },
    hat(g, G) { // two little cracks
      const { hx, hy, hrx, hry } = G;
      stroke(g, [[hx + 1.4, hy - hry + 1.8], [hx + 2.6, hy - hry + 3], [hx + 2, hy - hry + 4.2]], 0.3, 0.3, NUTCK);
      stroke(g, [[hx - hrx + 2, hy + hry * 0.46], [hx - hrx + 3.2, hy + hry * 0.56], [hx - hrx + 2.8, hy + hry * 0.7]], 0.3, 0.3, NUTCK);
    },
    note: [-4.6, -5.2, -0.25, 0.9],
  });

  // =====================================================================================================
  // DARK AGES
  // =====================================================================================================
  // ---------------- Peasant: a plain brown tunic with a rope belt, and a floppy straw hat ----------------
  const TUNIC = R3('#c09a74'), ROPE = R3('#f2dca8'), STRAWP = R3('#f6d98a', 0.18);
  ZA.peasant = (g, P) => zombie(g, P, {
    s: 0.96, head: 'pear', hair: false, coat: TUNIC, sleeve: TUNIC, shirt: false, pants: R3('#a8a49a'), shoe: R3('#9a7a5e'),
    body(t, G) { // a long tunic with a ragged hem over the knees
      const { X, U, s } = G, hem = [];
      for (let i = 0; i <= 8; i++) hem.push([X(21 - i * 1.45), U(28.2 + (i % 2) * 0.9)]);
      blob(t, [[X(15.2), U(24.1), 5.6 * s, 4.6 * s], { p: [[X(9.8), U(24)], [X(20.6), U(24)], [X(21.4), U(28.4)]].concat(hem) }], TUNIC, { hl: false });
    },
    torso(g, G) { // the neck opening, a stitched patch and a rope belt with a dangling end
      const { X, U, s } = G;
      piece(g, t => t.ell(X(15.4), U(19.8), 2.2 * s, 1.1 * s, G.SK[1]));
      piece(g, t => t.poly(rrect(X(16.8), U(21.6), 2.6 * s, 2.4 * s, 0.4), '#dcc29c'));
      g.dots([[X(17.1), U(21.9)], [X(18.9), U(21.9)], [X(17.1), U(23.6)], [X(18.9), U(23.6)]], TUNIC[2]);
      piece(g, t => t.poly(rrect(X(9.8), U(25.4), 10.8 * s, 1.2 * s, 0.5), ROPE[1]));
      piece(g, t => stroke(t, [[X(13.2), U(26.2)], [X(12.8), U(27.8)]], 0.4, 0.36, ROPE[1]));
    },
    hat(g, G) { // a floppy straw hat: a low round crown, a wide drooping brim with a frayed edge
      const { hx, top, S } = G, cx = hx - 0.8 * S, b = top + 3.6 * S;
      piece(g, t => blob(t, [[cx, b - 1.6 * S, 5.2 * S, 3.1 * S]], STRAWP, { mask: (x, y) => y < b + 0.2, hl: [cx - 2 * S, b - 3.6 * S, 1.2, 0.6] }));
      piece(g, t => blob(t, [[cx, b + 0.3, 10.2 * S, 1.7 * S], [cx - 9.2 * S, b + 1.2 * S, 1.7 * S, 1.3 * S], [cx + 9.2 * S, b + 1.1 * S, 1.7 * S, 1.3 * S]], STRAWP, { hl: false, d: [0.5, 0.6] }));
      // weave lines on the crown and straw ends poking out of the brim
      for (const y of [b - 3.2 * S, b - 1.4 * S]) thin(g, [[cx - 3.6 * S, y], [cx + 3.6 * S, y - 0.2]], STRAWP[2], 0.2);
      for (const [a, c] of [[-10.6, 1.6], [-7, 2], [-3, 2.2], [2.6, 2.2], [6.6, 2], [10.4, 1.4]]) thin(g, [[cx + a * S, b + 1.4 * S], [cx + (a + 0.3) * S, b + c * S + 0.6]], STRAWP[2], 0.22);
    },
    note: 'hat', noteAfterHat: true, hatNote: G => [G.hx + 0.4 * G.S, G.top + 1 * G.S, 0.2, 0.72],
  });

  // ---------------- Jester: a two-colour jester hat with bells, a diamond suit and a ruffle collar ----------------
  const JLIL = R3('#b896ec'), JCOR = R3('#ff9a9a'), RUFF = R3('#fbf8ff');
  ZA.jester = (g, P) => zombie(g, P, {
    s: 0.9, head: 'round', hair: false, coat: JLIL, sleeve: JCOR, shirt: false, pants: JLIL, shoe: JCOR,
    body(t, G) { // the harlequin diamonds
      const { X, U, s } = G, d = 2.7 * s;
      blob(t, [[X(15.2), U(24.1), 5.6 * s, 4.6 * s]], JLIL, { hl: false });
      recol(t, JLIL, (x, y) => (Math.floor((x - y) / d) + Math.floor((x + y) / d)) % 2 === 0, (x, y, v) => (v === JLIL[2] ? JCOR[2] : JCOR[1]));
    },
    mid0(g, G) { // a pointy ruffle collar, two colours
      const { X, U, s } = G;
      for (let i = 0; i < 6; i++) { const x = X(11.2 + i * 1.7); piece(g, t => t.poly([[x - 1.2 * s, U(19.8)], [x + 1.2 * s, U(19.8)], [x, U(22.8)]], i % 2 ? JLIL[1] : JCOR[1])); }
    },
    hat(g, G) { // a cap split in two colours, two floppy points with gold bells
      const { hx, hy, hrx, hry, ex, ey, S, P } = G, w = P.frame ? 0.5 : 0, brow = ey - 3.4 * S;
      const top = hy - hry, tip1 = [hx - hrx - 2.4, top + 6 + w], tip2 = [hx + hrx + 1.8, top + 5 - w];
      piece(g, t => stroke(t, [[hx - 2.6 * S, top + 1.2], [hx - hrx * 0.7, top - 1.3], [hx - hrx - 2.2, top - 0.2], [hx - hrx - 3, top + 3.2], tip1], 2.6 * S, 0.8 * S, JCOR[1]));
      piece(g, t => stroke(t, [[hx + 1.6 * S, top + 0.8], [hx + hrx * 0.5, top - 1.6], [hx + hrx + 1.4, top - 0.4], [hx + hrx + 2.4, top + 2.6], tip2], 2.6 * S, 0.8 * S, JLIL[1]));
      piece(g, t => {
        blob(t, [[hx - 0.2, hy - 0.6, hrx + 0.6, hry + 0.3]], JLIL, { hl: false, mask: (x, y) => y < brow - (x - hx) * 0.06 });
        recol(t, JLIL, (x, y) => x < hx - 0.8 + (y - hy) * 0.15, (x, y, v) => (v === JLIL[2] ? JCOR[2] : JCOR[1]));
      });
      piece(g, t => t.poly(rrect(hx - hrx * 0.98, brow - 1.1, hrx * 2.02, 1.6, 0.7), GOLD[1])); // the band
      for (const [x, y] of [tip1, tip2]) { piece(g, t => blob(t, [[x, y + 1.2, 1.5, 1.5]], GOLD, { hl: false })); g.dots([[x - 0.6, y + 0.6]], W); g.dots([[x - 0.3, y + 1.8], [x + 0.3, y + 1.8]], '#c8902a'); }
    },
    note: 'hat', noteAfterHat: true, hatNote: G => [G.hx - 0.6 * G.S, G.hy - 6.2 * G.S, -0.15, 0.75],
  });

  // =====================================================================================================
  // ROOF / POOL / PVZ1
  // =====================================================================================================
  // ---------------- Ladder Zombie: a tough fella in overalls, a moustache, carrying a tall wooden ladder ----------------
  const OVERALL = R3('#7c9ad8'), TANK = R3('#fbfaf4'), LADW = R3('#e0ae72'), MUST = R3('#b48a6e', 0.25);
  ZA.ladder = (g, P) => zombie(g, Object.assign({}, P, { eyes: P.eyes || 'brave' }), {
    dx: -2, head: 'box', holdArms: true, coat: TANK, sleeve: 'bare', shirt: false, pants: OVERALL, shoe: R3('#a07a58'), armR: 1.6,
    torso(g, G) { // the overall bib and straps with two buttons
      const { X, U, s } = G;
      piece(g, t => { t.poly([[X(12.4), U(22.6)], [X(18.6), U(22.6)], [X(19.4), U(28.4)], [X(11.4), U(28.4)]], OVERALL[1]); t.poly([[X(12.4), U(19.6)], [X(13.6), U(19.6)], [X(13.8), U(23)], [X(12.6), U(23)]], OVERALL[1]); t.poly([[X(17.2), U(19.6)], [X(18.4), U(19.6)], [X(18.4), U(23)], [X(17.2), U(23)]], OVERALL[1]); });
      for (const x of [13.2, 17.8]) piece(g, t => t.ell(X(x), U(23.2), 0.55 * s, 0.55 * s, GOLD[1]));
      piece(g, t => t.poly(rrect(X(14), U(24.2), 3 * s, 2 * s, 0.4), OVERALL[2]));
    },
    mid(g, G) { // a big bushy moustache
      const { mx, my, S } = G;
      piece(g, t => { stroke(t, [[mx - 0.2, my - 1.2 * S], [mx - 1.7 * S, my - 1.2 * S], [mx - 2.6 * S, my - 1.9 * S]], 0.75 * S, 0.4 * S, MUST[1]); stroke(t, [[mx + 0.2, my - 1.3 * S], [mx + 1.8 * S, my - 1.3 * S], [mx + 2.7 * S, my - 2 * S]], 0.75 * S, 0.4 * S, MUST[1]); });
    },
    front(g, G) { // the ladder: two rails and five rungs, leaning a little
      const top = 4.2 + G.bob * 0.6, bot = 31.2 + G.bob * 0.6, lean = 1.2, xa = 22.4, xb = 29.2;
      const at = (x, y) => [x + lean * (bot - y) / (bot - top), y];
      piece(g, t => {
        for (let i = 0; i < 6; i++) { const y = top + 2.2 + i * 4.4; stroke(t, [at(xa, y), at(xb, y)], 0.6, 0.6, LADW[1]); }
        stroke(t, [at(xa, top), at(xa, bot)], 0.78, 0.78, LADW[1]); stroke(t, [at(xb, top), at(xb, bot)], 0.78, 0.78, LADW[1]);
      });
      for (const x of [xa, xb]) thin(g, [at(x - 0.3, top + 0.6), at(x - 0.3, bot - 0.6)], LADW[0], 0.2);
      for (let i = 0; i < 6; i++) { const y = top + 2.2 + i * 4.4; thin(g, [at(xa + 0.8, y + 0.35), at(xb - 0.8, y + 0.35)], LADW[2], 0.18); }
      handOver(g, G, 1); handOver(g, G, 2);
    },
  });

  // ---------------- Bungee Zombie: hanging upside down from a stripy bungee cord, arms reaching down to grab ----------------
  const CORD = ['#ffffff', '#ff8ab0', '#e0688e'], HARN = R3('#ffd466', 0.16), BPANTS = R3('#a0aad8'), SOLE = '#ece2de', SHIRTC = ['#fbf6ee', '#fbf6ee', '#e4dccc'];
  // googly eyes for an upside-down face: happy and closed swap, and the brows go UNDER the eyes
  function flipEyes(g, ex, ey, o, mood) {
    const m = mood === 'happy' ? 'closed' : mood === 'closed' ? 'happy' : mood === 'blink' ? 'blink' : null;
    A.chibiEyes(g, ex, ey, Object.assign({}, o, { mood: m }));
    if (mood !== 'sad' && mood !== 'brave' && mood !== 'mad') return;
    const rx = o.w / 2, ry = o.h / 2, th = Math.max(0.42, o.w * 0.15) * (mood === 'mad' ? 1.5 : 1), by = ey + ry + 0.9;
    [ex - o.sp / 2, ex + o.sp / 2].forEach((x, i) => {
      const k = i === 0 ? 1 : -1;
      const pts = mood === 'sad' ? [[x - k * rx, by - 0.6], [x + k * rx * 0.9, by + 0.4]] : [[x - k * rx * 1.05, by + 0.4], [x + k * rx * 0.95, by - (mood === 'mad' ? 1.1 : 0.6)]];
      stroke(g, pts, th, th, INK);
    });
  }
  // an open hand reaching down: a round palm with three little fingers
  const grabHand = (t, x, y, R, dir) => { t.ell(x, y, 1.6, 1.5, flat(R)); for (const [a, c] of [[-1, 1.1], [0, 1.5], [1, 1.1]]) t.ell(x + a + dir * 0.4, y + c, 0.55, 0.75, R[1], -dir * 0.3); };
  // a white shirt cuff where the sleeve meets the hand
  const cuff = (t, x, y) => t.ell(x, y, 1.3, 0.8, SHIRTC);
  ZA.bungee = (g, P) => {
    const f = P.walk && P.frame ? 1 : 0, b = f ? 0.8 : 0, S = 0.92, w = f ? 0.6 : 0;
    const hx = 16.2, hy = 21.2 + b, hrx = 8.8, hry = 7.9, by = 10.6 + b;
    const CO = COAT, SH = K.SHOE;
    // the landing target on the ground
    piece(g, t => { t.ell(16, 30.2, 10.4, 1.6, '#f27c84'); t.ell(16, 30.2, 7.4, 1.15, W); t.ell(16, 30.2, 4.4, 0.7, '#f27c84'); });
    // the cord, from the harness up off the top (it stretches on the down frame)
    piece(g, t => stroke(t, [[15.5 - w * 0.4, -1], [15.8, by - 3.4]], 1.15, 1.15, CORD[1]));
    for (let y = -0.4 + (f ? 0.8 : 0); y < by - 4; y += 1.6) thin(g, [[14.8, y], [16.6, y + 0.8]], CORD[0], 0.26);
    // two stubby legs kicking up close to the cord, knees a little bent, shoe soles facing up
    for (const [hip, knee, ank, R, sR, dir] of [[[13.2, by - 3.4], [11.6, by - 5.8], [12 - w * 0.4, by - 7.8], dk(BPANTS), dk(SH), -1], [[18, by - 3.4], [19.8, by - 5.6], [19.4 + w * 0.4, by - 7.6], BPANTS, SH, 1]]) {
      piece(g, t => {
        stroke(t, [hip, knee, ank], 1.55, 1.4, R[1]);
        const cx = ank[0] + 0.6, cy = ank[1] - 0.7;
        t.ell(cx, cy, 2.3, 1.2, flat(sR), dir * 0.12);
        recol(t, flat(sR), (x, y) => y < cy - 0.5, SOLE);
      });
    }
    // the back arm reaching down behind the head
    piece(g, t => { stroke(t, [[11.8, by + 2.4], [7.6, by + 6.4], [4.8 - w * 0.4, 23.4 + b]], 1.35, 1.25, CO[2]); cuff(t, 4.6 - w * 0.4, 23.8 + b); grabHand(t, 4.3 - w * 0.4, 25.4 + b, dk(SKIN), -1); });
    // the body, upside down: the coat, the shirt opening and the tie point up
    piece(g, t => blob(t, [[15.4, by, 5, 4.2]], CO, { hl: false }));
    piece(g, t => { t.poly([[13.4, by + 4.2], [17.4, by + 4.2], [15.4, by - 0.4]], K.SHIRT); });
    piece(g, t => { t.poly([[15.4, by + 3.4], [16.2, by + 1.6], [15.4, by - 0.9], [14.6, by + 1.6]], K.TIE[1]); t.ell(15.4, by + 3.2, 0.7, 0.55, K.TIE[2]); });
    // the harness belt round the waist (now at the top) with a ring for the cord
    piece(g, t => t.poly(rrect(10.6, by - 3.2, 9.6, 1.4, 0.6), HARN[1]));
    piece(g, t => { t.ell(15.8, by - 3.6, 1.2, 1.2, METAL[1]); t.ell(15.8, by - 3.6, 0.5, 0.5, null); });
    // the head, upside down: the chin up top, the crown (its hair and sticky note) at the bottom
    const sh = [[hx - hrx * 0.04, hy + hry * 0.05, hrx * 0.97, hry * 0.95], [hx + hrx * 0.2, hy - hry * 0.34, hrx * 0.72, hry * 0.62]];
    piece(g, t => blob(t, sh, SKIN, { d: [hrx * 0.12, hry * 0.14], hl: [hx - hrx * 0.5, hy - hry * 0.3, 1.5, 0.85] }));
    const bot = sh[0][1] + sh[0][3];
    for (const [a, c] of [[[-3.4, 0.9], [-4.4, -0.9]], [[-1, 0.5], [-0.8, -1.3]], [[1.2, 0.8], [2.4, -0.6]]]) {
      const p0 = [hx + a[0] * S, bot - a[1] * S], p1 = [hx + c[0] * S, bot - c[1] * S];
      thin(g, [p0, [(p0[0] + p1[0]) / 2 + 0.3 * S, (p0[1] + p1[1]) / 2], p1], INK, 0.3);
    }
    const ex = hx + 2.2 * S, ey = hy - 0.6;
    flipEyes(g, ex, ey, { white: true, sp: 6.6 * S, w: 5.2 * S, h: 5.6 * S, look: [0.5, 0.7] }, P.eyes);
    const mx = hx + 3.9 * S, my = hy - 5.6 * S, m = P.mouth;
    if (m === 'open' || m === 'grin' || m === 'o') { g.ell(mx, my - 0.2, 1.55, 1.15, INK); g.ell(mx, my - 0.15, 1.15, 0.8, '#e8707e'); g.ell(mx, my - 0.5, 0.65, 0.4, '#ffb0bc'); g.dots([[mx - 0.2, my + 0.5], [mx + 0.3, my + 0.5]], W); }
    else { const ww = 2.6 * S; thin(g, [[mx - ww / 2, my - 0.1], [mx - ww / 6, my + 0.15], [mx + ww / 6, my - 0.15], [mx + ww / 2, my + 0.1]], INK, 0.34); g.dots([[mx + 0.1, my - 0.9], [mx + 0.6, my - 0.9], [mx + 0.1, my - 0.4]], W); }
    note(g, hx - hrx * 0.32, hy + hry * 0.56, 0.92, 0.2);
    // the front arm reaching down past the cheek toward the target
    piece(g, t => { stroke(t, [[19.4, by + 2.6], [24.6, by + 6.4], [27.4 + w * 0.4, 23.4 + b]], 1.35, 1.25, CO[1]); cuff(t, 27.6 + w * 0.4, 23.8 + b); grabHand(t, 27.9 + w * 0.4, 25.4 + b, SKIN, 1); });
    return { hx, hy };
  };

  // =====================================================================================================
  // RIDERS
  // =====================================================================================================
  // ---------------- Zomboni: a zombie driving a little ice-resurfacing machine with a big front roller ----------------
  const ZBODY = R3('#9ccaf2'), ZTANK = R3('#f4f8fc'), ICEC = ['#f8feff', '#d8f2fc', '#b0dcf0'], TYRE = R3('#857a94', 0.22);
  ZA.zomboni = (g, P) => {
    const f = P.walk && P.frame ? 1 : 0, d = f ? -0.5 : 0;
    // the shiny ice trail it leaves behind
    piece(g, t => blob(t, [{ p: rrect(0.2, 29.4, 13, 2.2, 1) }], ICEC, { hl: false, d: [0.4, 0.5] }));
    for (const [x, y] of (f ? [[2.6, 30.2], [8.4, 30.4]] : [[4.8, 30.4], [10.6, 30.2]])) g.dots([[x, y], [x + 0.5, y], [x + 0.5, y - 0.5]], W);
    // the exhaust pipe at the back, puffing
    const y0 = 19 + d;
    piece(g, t => t.poly(rrect(2.6, y0 - 3.4, 1.6, 4, 0.6), METAL[2]));
    for (const [x, y, r] of (f ? [[3.2, y0 - 5.6, 1.15], [1.2, y0 - 8, 0.85]] : [[3.8, y0 - 5.4, 1]])) piece(g, t => blob(t, [[x, y, r, r * 0.92]], ['#ffffff', '#f2f4fa', '#d8dce8'], { hl: false }));
    // the driver
    const G = rider(g, Object.assign({}, P, { walk: false, arms: 'hold' }), { s: 0.76, dx: -4.4, legs: 'none', noBackArm: true, head: 'wide' }, 0, -7.6 + d);
    // the machine: a low seat box at the back, a tall white tank at the front, a big Z badge on the side
    piece(g, t => { blob(t, [{ p: rrect(1.6, y0, 22, 9.6, 2.2) }, { p: rrect(15.4, y0 - 4.6, 9.4, 12, 2.2) }], ZBODY, { hl: false, d: [1, 0.9] });
      recol(t, ZBODY, (x, y) => x > 15.6 && y < y0 + 3, (x, y, v) => (v === ZBODY[2] ? ZTANK[2] : ZTANK[1])); });
    // a heap of fresh snow on the tank and a snowflake on its side
    piece(g, t => blob(t, [[17.6, y0 - 4.6, 2.2, 1.3], [20.2, y0 - 5.2, 2.6, 1.6], [23, y0 - 4.6, 2, 1.2]], ICEC, { hl: false }));
    const sx = 20.2, sy = y0 - 0.6;
    for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3 + Math.PI / 2; thin(g, [[sx - Math.cos(a) * 1.8, sy - Math.sin(a) * 1.8], [sx + Math.cos(a) * 1.8, sy + Math.sin(a) * 1.8]], '#7cb8e8', 0.26); }
    piece(g, t => blob(t, [[9.4, y0 + 4.8, 2.9, 2.9]], R3('#fbfbff'), { hl: false }));
    thin(g, [[8.2, y0 + 3.6], [10.6, y0 + 3.6], [8.2, y0 + 6], [10.6, y0 + 6]], '#f07a7a', 0.36);
    // the back wheel and the big striped roller at the front
    piece(g, t => blob(t, [[6.4, 28.6, 2.6, 2.6]], TYRE, { hl: false }));
    piece(g, t => t.ell(6.4, 28.6, 1, 1, METAL[1]));
    const rx = 25.8, ry = 26.2 + d * 0.4;
    piece(g, t => blob(t, [[rx, ry, 5, 5]], METAL, { hl: [rx - 2.2, ry - 2.6, 1.4, 0.8] }));
    piece(g, t => { t.ell(rx, ry, 3, 3, '#9ccaf2'); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + (f ? Math.PI / 4 : 0); stroke(t, [[rx, ry], [rx + Math.cos(a) * 2.8, ry + Math.sin(a) * 2.8]], 0.5, 0.5, W); } });
    piece(g, t => t.ell(rx, ry, 1.2, 1.2, flat(METAL)));
    // the steering wheel in the driver's hands
    const h1 = G.hand, h2 = G.hand2, wx = (h1[0] + h2[0]) / 2 + 0.8, wy = (h1[1] + h2[1]) / 2;
    piece(g, t => stroke(t, [[16.2, wy + 2.2], [wx, wy]], 0.4, 0.4, METAL[2]));
    piece(g, t => { t.ell(wx, wy, 2, 1.1, '#6a7490', -1.1); t.ell(wx, wy, 1.2, 0.45, null, -1.1); });
    handAt(g, h2, G.s, dk(SKIN)); handAt(g, h1, G.s);
    return G;
  };

  // ---------------- Bobsled: a zombie in a helmet and goggles, sliding in a red bobsled ----------------
  const SLED = R3('#f27c84', 0.18), HELM = R3('#8cb8f2'), LENS = R3('#ffc46a', 0.12);
  ZA.bobsled = (g, P) => {
    const f = P.walk && P.frame ? 1 : 0, d = f ? -0.5 : 0;
    // the runners, curling up at the front
    piece(g, t => { stroke(t, [[2, 29.8], [26, 29.8], [29.2, 28.8], [30.2, 26.6], [29.2, 25.6]], 0.55, 0.55, METAL[1]); for (const x of [6.4, 21.6]) stroke(t, [[x, 27], [x, 29.8]], 0.45, 0.45, METAL[2]); });
    // the slider
    const G = rider(g, Object.assign({}, P, { walk: false, arms: 'hold' }), {
      s: 0.78, dx: -3.6, legs: 'none', head: 'round', hair: false, coat: R3('#f4f4fa'), shirt: false, sleeve: R3('#f27c84'),
      hat(g, G) { // a round helmet with a stripe, goggles pushed up on it
        const { hx, hy, hrx, hry, ey, S } = G, brow = ey - 3.4 * S;
        piece(g, t => { blob(t, [[hx - 0.3, hy - 0.6, hrx + 0.7, hry + 0.3]], HELM, { mask: (x, y) => y < brow - (x - hx) * 0.08, hl: [hx - hrx * 0.5, hy - hry * 0.75, 1.3, 0.6] });
          recol(t, HELM, (x, y) => Math.abs(x - (hx - 0.6 + (y - hy) * 0.3)) < 0.9, (x, y, v) => (v === HELM[2] ? '#d4dcea' : W)); });
        const gy = brow - 1.4;
        piece(g, t => stroke(t, [[hx - hrx * 1.02, gy + 0.6], [hx + hrx * 0.9, gy - 0.4]], 0.6, 0.6, '#6a7490'));
        for (const dx of [0.6, 5.4]) piece(g, t => blob(t, [[hx + dx * S, gy - 0.2 - dx * 0.04, 2 * S, 1.6 * S]], LENS, { hl: false }));
        for (const dx of [0.6, 5.4]) g.dots([[hx + dx * S - 0.8, gy - 0.8], [hx + dx * S - 0.3, gy - 1.1]], W);
      },
      note: [-5.4, -2.6, 0.3, 0.8], noteAfterHat: true,
    }, 0, -6.6 + d);
    // the sled: a long tub, the nose curving up at the front, a white racing stripe and a number
    const y0 = 19.4 + d;
    piece(g, t => { blob(t, [{ p: [[1.2, y0 + 1], [2.4, y0], [21, y0], [26.6, y0 - 1.6], [30.4, y0 - 3], [31, y0 - 0.6], [29.4, y0 + 4.4], [26.2, y0 + 7.6], [3.6, y0 + 7.6], [1.2, y0 + 6]] }], SLED, { hl: false, d: [0.9, 0.9] });
      recol(t, SLED, (x, y) => Math.abs(y - (y0 + 3 - Math.max(0, x - 22) * 0.36)) < 0.75, (x, y, v) => (v === SLED[2] ? '#e4dcea' : W)); });
    piece(g, t => blob(t, [[9.4, y0 + 5.2, 1.9, 1.7]], R3('#fbfbff'), { hl: false }));
    piece(g, t => t.poly(PX.starPts(9.4, y0 + 5.3, 1.4, 0.62, 5), '#ffd466'));
    // the slider's hands grip the rim
    handAt(g, [G.hand2[0] - 0.4, y0 + 0.2], G.s, dk(SKIN)); handAt(g, [G.hand[0] + 0.6, y0 + 0.4], G.s);
    if (f) for (const [x, y] of [[0.8, 26.6], [1.6, 28.6]]) thin(g, [[x, y], [x + 1.8, y]], '#e8f6ff', 0.24);
    return G;
  };

  // ---------------- Dolphin Rider: an old-time striped swimsuit and a snorkel mask, riding a cute dolphin ----------------
  const DOLPH = R3('#94b8e2', 0.18), DBELLY = ['#ffffff', '#f2f6fb', '#d0dcea'], WAVE = R3('#a8dcf4', 0.12), SUIT = R3('#ff9a8a'), SUITW = R3('#fbfaf4'), DMASK = R3('#ffb84a', 0.16);
  ZA.dolphinrider = (g, P) => {
    const f = P.walk && P.frame ? 1 : 0, d = f ? -0.8 : 0, cy = 25.8 + d;
    // the tail flukes, raised at the back, and the dorsal fin behind the rider
    piece(g, t => blob(t, [{ p: [[6.4, cy - 1], [2.6, cy - 6], [0.6, cy - 6.2], [2.6, cy - 3.4], [1.2, cy], [5.6, cy + 1]] }], dk(DOLPH), { hl: false }));
    piece(g, t => blob(t, [{ p: [[4.8, cy - 2.6], [5.6, cy - 7.2], [7.8, cy - 6.6], [9.6, cy - 3]] }], DOLPH, { hl: false }));
    // the rider: a coral-and-white striped swimsuit, a snorkel mask with big googly eyes, a snorkel tube
    const G = rider(g, Object.assign({}, P, { walk: false }), {
      s: 0.8, dx: -2, legs: 'none', head: 'egg', hair: false, coat: SUITW, sleeve: SUIT, shirt: false,
      body(t, G) { const { X, U, s } = G; blob(t, [[X(15.2), U(24.1), 5.4 * s, 4.6 * s]], SUITW, { hl: false }); recol(t, SUITW, (x, y) => Math.floor((y - U(19.4)) / (1.3 * s)) % 2 === 0, (x, y, v) => (v === SUITW[2] ? SUIT[2] : SUIT[1])); },
      back(g, G) { const { hx, hy, hrx, hry, S } = G; piece(g, t => stroke(t, [[hx - hrx * 0.3, hy + hry * 0.5], [hx - hrx * 0.95, hy + hry * 0.1], [hx - hrx * 1.02, hy - hry * 0.4], [hx - hrx * 0.9, hy - hry * 0.78]], 0.9 * S, 0.9 * S, '#ffd65a')); piece(g, t => t.ell(hx - hrx * 0.88, hy - hry * 0.84, 1.1 * S, 0.8 * S, flat(R3('#ffaa5a')))); },
      hat(g, G) { // a mask with a thin frame, so the big glossy eyes fill the glass
        const { ex, ey, hx, hrx } = G, sp = 5.8, ew = 4.6, eh = 5, x0 = ex - sp / 2 - ew / 2 - 0.5, x1 = ex + sp / 2 + ew / 2 + 0.5, y0 = ey - eh / 2 - 0.5, y1 = ey + eh / 2 + 0.5;
        piece(g, t => stroke(t, [[x0 - 0.6, ey - 0.4], [hx - hrx * 0.98, ey - 0.8]], 0.6, 0.6, DMASK[2]));
        piece(g, t => { blob(t, [{ p: rrect(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2, 2.2) }], DMASK, { hl: false, d: [0.5, 0.5] }); t.poly(rrect(x0, y0, x1 - x0, y1 - y0, 1.6), '#dcf6ff'); });
        zEyes(g, G, G.P, { sp, w: ew, h: eh });
        g.dots([[x0 + 0.6, y0 + 0.6], [x0 + 1.1, y0 + 0.6], [x0 + 0.6, y0 + 1.1]], W);
      },
      note: [-3.6, -6.8, -0.2, 0.8],
    }, 0, -6.6 + d);
    // the dolphin: a plump grey-blue body, a white belly, a rounded head and a short beak
    piece(g, t => { blob(t, [[15, cy, 11.4, 4.4], [24.4, cy - 1.4, 5.6, 4.6], { p: [[4, cy - 1.6], [10, cy - 3.8], [10, cy + 3.8], [4.4, cy + 1.4]] }, [28.6, cy + 0.6, 2.8, 1.5, 0.15]], DOLPH, { hl: [22, cy - 4.4, 1.6, 0.7] });
      recol(t, DOLPH, (x, y) => y > cy + 1.4 - Math.max(0, x - 20) * 0.12 && x > 6, (x, y, v) => (v === DOLPH[2] ? DBELLY[2] : DBELLY[1])); });
    // the rider's seat on the dolphin's back, and the leg over its side: hip, knee, a bare foot
    const lx = G.hx;
    piece(g, t => t.ell(lx - 1.2, cy - 4.2, 4.2, 1.5, flat(SUIT)));
    piece(g, t => { stroke(t, [[lx + 0.6, cy - 4], [lx + 2.6, cy - 2.6]], 1.5, 1.4, SUIT[1]); });
    piece(g, t => { stroke(t, [[lx + 2.6, cy - 2.6], [lx + 3, cy - 0.2]], 1.15, 1.05, SKIN[1]); t.ell(lx + 3.9, cy + 0.6, 1.8, 1, flat(SKIN), 0.15); });
    // the flipper, a happy eye, a smile and a blush
    piece(g, t => blob(t, [[19.2, cy + 2.4, 2.6, 1.2, 0.6]], dk(DOLPH), { hl: false }));
    A.chibiEyes(g, 25.2, cy - 2, { sp: 0, one: true, w: 3, h: 3.6, mood: P.eyes === 'happy' || P.eyes === 'closed' ? P.eyes : null });
    thin(g, [[26.4, cy + 1.4], [28, cy + 1.9], [30, cy + 1.4]], DOLPH[2], 0.26);
    g.ell(26.4, cy + 0.4, 1, 0.55, '#ffb3c2');
    // the water: a wavy band with foam (the dolphin's tummy dips into it)
    const wv = f ? Math.PI / 3 : 0, sh = [];
    for (let i = 0; i < 7; i++) sh.push([i * 5.4, 28.8 + Math.sin(i * 1.3 + wv) * 0.5, 3.2, 1.5]);
    sh.push({ p: [[0, 29], [32, 29], [32, 32], [0, 32]] });
    piece(g, t => blob(t, sh, WAVE, { hl: false, d: [0.4, 0.4] }));
    for (const [x, y] of (f ? [[4, 29.6], [15, 30.2], [25, 29.8]] : [[2, 30.2], [11, 29.6], [21, 30.2], [29, 29.8]])) g.dots([[x, y], [x + 0.5, y], [x + 1, y], [x + 0.5, y - 0.5]], W);
    return G;
  };

  // =====================================================================================================
  // ANCIENT EGYPT
  // =====================================================================================================
  // ---------------- Camel Zombie: carries the head piece of a camel costume (a painted cut-out on a pole) ----------------
  const LINEN = R3('#f6eedc'), CAMEL = R3('#ecc890', 0.18);
  ZA.camel = (g, P) => zombie(g, P, {
    s: 0.9, dx: -3.4, head: 'egg', holdArms: true, coat: LINEN, sleeve: LINEN, shirt: false, pants: R3('#d8c8a8'), shoe: R3('#c8a070'),
    torso(g, G) { // a gold collar and a blue sash belt
      const { X, U, s } = G;
      piece(g, t => { t.ell(X(15.4), U(20.6), 4.6 * s, 1.9 * s, GOLD[1], 0, (x, y) => y > U(19.6)); recol(t, [GOLD[1]], (x, y) => y > U(21.4), '#7c9ae8'); });
      piece(g, t => t.poly(rrect(X(10), U(25.2), 10.6 * s, 1.3 * s, 0.5), '#7c9ae8'));
    },
    hat(g, G) { // a few hair strands and a blue-and-gold headband
      K.hairStrands(g, G);
      const { hx, hrx, ey, S } = G, y = ey - 4.6 * S;
      piece(g, t => blob(t, [{ p: [[hx - hrx * 1.02, y - 0.2], [hx + hrx * 0.9, y - 1.4], [hx + hrx * 0.94, y + 0.4], [hx - hrx * 1.02, y + 1.6]] }], R3('#7c9ae8'), { hl: false, mask: (x, yy) => g.filled(x, yy) }));
      recol(g, R3('#7c9ae8'), (x, yy) => Math.abs(yy - (y + 0.7 - (x - hx) * 0.08)) < 0.3, GOLD[1]);
      piece(g, t => t.ell(hx + 2.6 * S, y - 0.2, 0.9 * S, 0.9 * S, flat(GOLD)));
    },
    note: [-4.4, -5.8, -0.25, 0.85], noteAfterHat: true,
    front(g, G) { // the camel cut-out: a long curved neck and a goofy camel head, held up on its pole
      const [hx, hy0] = G.hand, hy = Math.max(17.2, hy0), ph = [Math.min(24.4, hx + 1.1), hy];
      piece(g, t => stroke(t, [[ph[0], 30.6], [ph[0], hy - 2]], 0.5, 0.5, WOOD[1]));
      const nk = [[ph[0] - 0.2, hy + 1.6], [ph[0] + 2.6, hy - 5], [ph[0] + 3.2, hy - 10.4]], cx = ph[0] + 4.7, cy = hy - 12.4;
      piece(g, t => {
        blob(t, [{ p: nk.map(([x, y]) => [x - 1.7, y]).concat(nk.slice().reverse().map(([x, y]) => [x + 1.7, y])) }, [cx, cy, 3.5, 2.8, 0.25], [cx + 2.8, cy + 1.6, 2.1, 1.85, 0.2]], CAMEL, { hl: [cx - 1.6, cy - 1.6, 1, 0.5] });
      });
      // an ear, a fuzzy tuft, a glossy eye, a blush, a nostril and a big smile
      piece(g, t => blob(t, [[cx - 2.6, cy - 2.4, 0.9, 1.4, -0.5]], CAMEL, { hl: false }));
      piece(g, t => blob(t, [[cx - 0.8, cy - 2.8, 1.3, 0.9], [cx + 0.6, cy - 3, 1.1, 0.8]], R3('#c89a68'), { hl: false }));
      const em = G.P.eyes;
      A.chibiEyes(g, cx + 0.4, cy - 0.3, { sp: 0, one: true, w: 2.2, h: 2.6, mood: em === 'happy' || em === 'closed' || em === 'sleepy' || em === 'blink' ? em : null });
      g.ell(cx + 2.2, cy + 1.3, 0.95, 0.55, '#ffb3c2', 0, (x, y) => g.filled(x, y));
      g.dots([[cx + 4.1, cy + 0.8], [cx + 4.6, cy + 0.8]], CAMEL[2]);
      thin(g, [[cx + 2, cy + 2.4], [cx + 3.4, cy + 2.9], [cx + 4.8, cy + 2.4]], '#9a6a48', 0.24);
      handOver(g, G, 1); handOver(g, G, 2);
    },
  });

  // ---------------- Explorer: a pith helmet, a moustache, khaki and a lit torch ----------------
  const EXHELM = R3('#e6c48a', 0.2), EXKH = R3('#cdb07c'), TORCHW = R3('#b07a52');
  ZA.explorer = (g, P) => zombie(g, P, {
    s: 0.94, head: 'wide', hair: false, coat: EXKH, sleeve: EXKH, shirt: '#f6eedc', tie: false, pants: R3('#9a8a6a'), shoe: R3('#8a6248'),
    mid0(g, G) { const { X, U } = G; piece(g, t => blob(t, [{ p: [[X(12), U(19.4)], [X(19), U(19.4)], [X(15.6), U(22.6)]] }], R3('#f28a80'), { hl: false })); }, // a red neckerchief
    torso(g, G) { // two chest pockets and a belt
      const { X, U, s } = G;
      for (const x of [11.6, 17.4]) { piece(g, t => t.poly(rrect(X(x), U(22.4), 2.4 * s, 2.2 * s, 0.4), EXKH[2])); g.dots([[X(x + 1.2), U(22.8)]], GOLD[1]); }
      piece(g, t => t.poly(rrect(X(9.8), U(25.6), 10.8 * s, 1.2 * s, 0.4), '#8a6248'));
    },
    mid(g, G) { const { mx, my, S } = G; piece(g, t => blob(t, [[mx - 1.05 * S, my - 1.2 * S, 1.4 * S, 0.62 * S, 0.25], [mx + 1.05 * S, my - 1.3 * S, 1.3 * S, 0.6 * S, -0.25]], R3('#b89272', 0.25), { hl: false })); },
    hat(g, G) { // the pith helmet: a tall dome, a band, a wide brim and a little knob
      const { hx, top, S } = G, b = top + 4.4 * S;
      piece(g, t => blob(t, [[hx - 0.8 * S, b - 1 * S, 7.4 * S, 6 * S]], EXHELM, { mask: (x, y) => y < b, hl: [hx - 3.8 * S, b - 4.8 * S, 1.4, 0.7] }));
      recol(g, EXHELM, (x, y) => y > b - 1.7 * S && y < b - 0.6 * S, '#e8786e');
      piece(g, t => blob(t, [[hx - 0.6 * S, b + 0.3, 10.6 * S, 1.7 * S]], EXHELM, { hl: false }));
      piece(g, t => t.ell(hx - 0.8 * S, b - 7 * S, 0.9 * S, 0.7 * S, flat(EXHELM)));
    },
    note: 'hat', noteAfterHat: true, hatNote: G => [G.hx - 3 * G.S, G.top + 0.8 * G.S, -0.2, 0.8],
    front(g, G) { // the torch: a wooden handle, a cloth wrap and a big friendly flame
      const [hx, hy] = G.hand, x0 = hx + 0.2, tp = hy - 5.6;
      piece(g, t => stroke(t, [[x0 - 0.8, hy + 3.4], [x0 + 0.4, tp]], 0.55, 0.7, TORCHW[1]));
      piece(g, t => blob(t, [{ p: rrect(x0 - 0.9, tp - 1.6, 2.6, 2.4, 0.6) }], R3('#e8dcc0'), { hl: false }));
      flame(g, x0 + 0.4, tp - 3.2, 1.25, G.P.frame);
      handOver(g, G, 1);
    },
  });

  // =====================================================================================================
  // PIRATE SEAS
  // =====================================================================================================
  // ---------------- Seagull Zombie: a little pirate carried through the air by a big seagull ----------------
  const GULL = ['#ffffff', '#f6f8fb', '#d4dce8'], GWING = ['#ffffff', '#e8eef6', '#c4cedc'], GBEAK = R3('#ffb84a');
  ZA.seagull = (g, P) => {
    const f = P.walk && P.frame ? 1 : 0, d = f ? -1 : 0, lift = -0.6;
    const t0 = new Grid(g.w, g.h, g.k);
    const G = zombie(t0, Object.assign({}, P, { walk: false }), {
      s: 0.88, head: 'peanut', hair: false, coat: R3('#fbfaf4'), shirt: false, sleeve: R3('#fbfaf4'), pants: R3('#b08a68'),
      body(t, G) { const { X, U, s } = G, SHC = R3('#fbfaf4'), ST = R3('#8cacec'); blob(t, [[X(15.2), U(24.1), 5.6 * s, 4.6 * s]], SHC, { hl: false }); recol(t, SHC, (x, y) => Math.floor((y - U(19)) / (1.3 * s)) % 2 === 1, (x, y, v) => (v === SHC[2] ? ST[2] : ST[1])); },
      hat(g, G) { // a teal bandana with its knot and tails at the back, and a gold earring
        const { hx, hy, hrx, hry, ey, S } = G, BD = R3('#6ccabc');
        piece(g, t => blob(t, [[hx - 0.2, hy - 0.8, hrx + 0.5, hry + 0.2]], BD, { hl: false, mask: (x, y) => y < ey - 3.2 * S - (x - hx) * 0.08 }));
        piece(g, t => { t.ell(hx - hrx - 0.3, ey - 3.6 * S, 1.3, 1.1, flat(BD)); t.ell(hx - hrx - 1.2, ey - 1.8 * S, 1.4, 0.7, flat(BD), 1.1); });
        piece(g, t => t.ell(hx - hrx * 0.62, hy + hry * 0.46, 0.7 * S, 0.7 * S, flat(GOLD)));
      },
      note: [-4.8, -4.2, -0.25, 0.8], noteAfterHat: true,
    });
    shiftMerge(g, t0, 0, d + lift);
    // the seagull: wings spread wide in a big M (up on one frame, level on the other), its feet gripping the bandana
    const bx = 15.4, by = 4.4;
    const wing = (dir, R) => { // a broad wing from the shoulder out to a tip, the tip feathers a darker grey
      const sx = bx + dir * 1.4, tip = f ? [bx + dir * 14.6, by + 2.6] : [bx + dir * 14, by - 3.7], el = f ? [bx + dir * 7.2, by - 1.2] : [bx + dir * 6.4, by - 3.7];
      piece(g, t => { blob(t, [{ p: [[sx, by - 1.6], el, tip, [el[0] + dir * 1.2, el[1] + 3.6], [sx, by + 2.2]] }], R, { hl: false }); recol(t, R, x => dir * (x - bx) > Math.abs(tip[0] - bx) - 3.4, (x, y, v) => (v === R[2] ? '#8a94a8' : '#a8b2c4')); });
    };
    wing(-1, dk(GWING)); wing(1, GWING);
    // its round body sits low over the bandana, the head turned to the front
    piece(g, t => blob(t, [[bx, by + 0.4, 5.2, 3.1], { p: [[bx - 3.6, by - 1.2], [bx - 8, by], [bx - 3.6, by + 2.4]] }, [bx + 4.6, by - 1.2, 2.8, 2.7]], GULL, { hl: false }));
    piece(g, t => blob(t, [{ p: [[bx + 6.8, by - 2.1], [bx + 10.4, by - 1], [bx + 7, by + 0.2]] }], GBEAK, { hl: false }));
    g.dot(bx + 8.8, by - 0.9, '#e8783a');
    A.chibiEyes(g, bx + 5.2, by - 1.9, { sp: 0, one: true, w: 2.1, h: 2.5, mood: P.eyes === 'happy' || P.eyes === 'closed' ? P.eyes : null });
    g.ell(bx + 5.4, by + 0.2, 0.9, 0.5, '#ffb3c2');
    // orange feet gripping the top of the bandana
    for (const x of [bx - 1.6, bx + 1.4]) piece(g, t => { stroke(t, [[x, by + 2.6], [x + 0.2, by + 3.6]], 0.36, 0.36, GBEAK[1]); for (const a of [-0.7, 0, 0.7]) t.ell(x + 0.2 + a, by + 4, 0.45, 0.6, GBEAK[1]); });
    return G;
  };

  // ---------------- Swashbuckler: swings in on a rope, striped shirt, bandana, eye patch, moustache, a little cutlass ----------------
  const SBAND = R3('#b48ae6'), SSTR = R3('#ff8a8a'), BLADE = ['#ffffff', '#e4eaf2', '#b8c2d2'];
  ZA.swashbuckler = (g, P) => zombie(g, P, {
    s: 0.94, head: 'box', hair: false, coat: R3('#fbfaf4'), shirt: false, sleeve: R3('#fbfaf4'), pants: R3('#7a86b8'), shoe: R3('#6a5a6e'), noBackArm: true,
    body(t, G) { // red and white stripes and a gold sash
      const { X, U, s } = G, SH = R3('#fbfaf4');
      blob(t, [[X(15.2), U(24.1), 5.6 * s, 4.6 * s]], SH, { hl: false });
      recol(t, SH, (x, y) => Math.floor((y - U(19)) / (1.3 * s)) % 2 === 1, (x, y, v) => (v === SH[2] ? SSTR[2] : SSTR[1]));
      recol(t, SH.concat(SSTR), (x, y) => y > U(25.6) && y < U(27.1), (x, y, v) => (v === SH[2] || v === SSTR[2] ? GOLD[2] : GOLD[1]));
    },
    back(g, G) { // the rope it swings on, held high in the back hand
      const { X, U, s } = G, sw = G.P.frame ? 0.6 : 0, hand = [X(4.8) - sw, U(15.4)];
      piece(g, t => stroke(t, [[hand[0] - 2.6 - sw * 2, -1], hand, [hand[0] + 0.2, hand[1] + 3]], 0.5, 0.5, '#d8b07a'));
      piece(g, t => { stroke(t, [[X(12.6), U(21.4)], [hand[0] + 0.6, hand[1] + 1.2]], 1.45 * s, 1.35 * s, R3(mixHex('#fbfaf4', '#4a3646', 0.15))[1]); t.ell(hand[0] + 0.2, hand[1], 1.7 * s, 1.6 * s, flat(dk(SKIN))); });
      thin(g, [[hand[0] - 1.2, hand[1] - 0.6], [hand[0] + 1.4, hand[1] + 0.2]], '#d8b07a', 0.3);
    },
    hat(g, G) {
      const { hx, hy, hrx, hry, ex, ey, S } = G;
      piece(g, t => blob(t, [[hx - 0.2, hy - 0.8, hrx + 0.5, hry + 0.2]], SBAND, { hl: false, mask: (x, y) => y < ey - 3.2 * S - (x - hx) * 0.08 }));
      recol(g, SBAND, (x, y) => Math.abs(y - (ey - 4 * S - (x - hx) * 0.08)) < 0.45, GOLD[1]);
      piece(g, t => { t.ell(hx - hrx - 0.4, ey - 3.6 * S, 1.5, 1.3, flat(SBAND)); t.ell(hx - hrx - 1.4, ey - 1.6 * S, 1.6, 0.8, flat(SBAND), 1.1); t.ell(hx - hrx - 2.2, ey - 3 * S, 1.5, 0.75, flat(SBAND), 0.4); });
      const sp = 6.6 * S, px = ex - sp / 2;
      thin(g, [[hx - hrx * 0.94, ey - 3.4 * S], [px, ey], [ex + sp / 2 + 1, ey - 4.2 * S]], INK, 0.32);
      piece(g, t => t.ell(px, ey + 0.2, 2.6 * S, 2.7 * S, ['#4a3a48', '#4a3a48', '#3a2d34']));
    },
    mid(g, G) { // a curly moustache
      const { mx, my, S } = G, M = R3('#b08a7a', 0.25);
      piece(g, t => { stroke(t, [[mx - 0.2, my - 1.2 * S], [mx - 1.6 * S, my - 1.3 * S], [mx - 2.3 * S, my - 2 * S]], 0.5 * S, 0.3 * S, M[1]); stroke(t, [[mx + 0.2, my - 1.2 * S], [mx + 1.8 * S, my - 1.3 * S], [mx + 2.5 * S, my - 2 * S]], 0.5 * S, 0.3 * S, M[1]); });
    },
    mouthOpt: { tooth: GOLD[1] }, note: 'hat', noteAfterHat: true, hatNote: G => [G.hx - 3.2 * G.S, G.hy - 6.6 * G.S, -0.2, 0.8],
    front(g, G) { // the cutlass: a gold guard and a curved blade pointing up and forward
      const [hx, hy] = G.hand, s = G.s, up = G.P.frame ? 0.6 : 0;
      const b0 = [hx + 0.4, hy - 0.8], b1 = [hx + 2.6, hy - 5 - up], b2 = [hx + 3.2, hy - 8.4 - up];
      piece(g, t => stroke(t, [b0, b1, b2], 0.85, 0.5, BLADE[1]));
      thin(g, [[b0[0] - 0.4, b0[1] - 0.4], [b1[0] - 0.5, b1[1]], [b2[0] - 0.3, b2[1] + 0.6]], W, 0.2);
      piece(g, t => stroke(t, [[hx - 1.6, hy - 0.2], [hx + 2, hy - 1.4]], 0.5, 0.5, GOLD[1]));
      handOver(g, G, 1);
      void s;
    },
  });

  // =====================================================================================================
  // WILD WEST / FAR FUTURE / NEON MIXTAPE
  // =====================================================================================================
  // ---------------- Poncho Zombie: a colourful striped poncho with a fringe, and a cowboy hat ----------------
  const PSTR = [R3('#ff9a8a'), R3('#ffd27a'), R3('#7ccfc0'), R3('#b8a0ec')], PHAT = R3('#d8b07c');
  ZA.poncho = (g, P) => zombie(g, P, {
    s: 0.94, head: 'egg', hair: false, coat: R3('#fbf2e2'), shirt: false, sleeve: R3('#f6e6c8'), pants: R3('#86a8e0'), shoe: R3('#a87850'),
    hat(g, G) { // a sandy cowboy hat with a stripy band, the brim curled up at the ends
      const { hx, top, S } = G, cx = hx - 0.8 * S, b = top + 3.6 * S;
      piece(g, t => blob(t, [[cx, b - 2.8 * S, 5 * S, 3.6 * S], { p: [[cx - 4.6 * S, b - 2.6 * S], [cx + 4.6 * S, b - 2.6 * S], [cx + 4.6 * S, b], [cx - 4.6 * S, b]] }], PHAT, { mask: (x, y) => y < b + 0.2, hl: false }));
      thin(g, [[cx - 1.6 * S, b - 5.6 * S], [cx, b - 4.8 * S], [cx + 1.6 * S, b - 5.6 * S]], PHAT[2], 0.26);
      recol(g, PHAT, (x, y) => y > b - 1.6 * S && y < b - 0.6 * S, (x, y) => (Math.floor(x * 1.2) % 2 ? '#ff9a8a' : '#7ccfc0'));
      piece(g, t => blob(t, [[cx, b + 0.2, 9.8 * S, 1.5 * S], [cx - 9.2 * S, b - 0.8 * S, 1.4 * S, 1.2 * S], [cx + 9.2 * S, b - 0.8 * S, 1.4 * S, 1.2 * S]], PHAT, { hl: false, d: [0.5, 0.6] }));
    },
    note: 'hat', noteAfterHat: true, hatNote: G => [G.hx + 0.4 * G.S, G.top + 0.6 * G.S, 0.2, 0.7],
    front(g, G) { // the poncho, over the shoulders and arms (the front hand pokes out): wide stripes and a tassel fringe
      const { X, U, s } = G, B = PSTR[0], hs = G.headShapes || [];
      const inHead = (x, y) => hs.some(e => e.length && ((x - e[0]) / (e[2] + 0.5)) ** 2 + ((y - e[1]) / (e[3] + 0.5)) ** 2 <= 1);
      for (let i = 0; i < 8; i++) piece(g, t => t.ell(X(9 + i * 1.85), U(28.2), 0.5 * s, 0.85 * s, PSTR[i % 4][1]));
      piece(g, t => {
        blob(t, [{ p: [[X(11.6), U(19.4)], [X(19.6), U(19.4)], [X(23.2), U(26.6)], [X(22.2), U(27.8)], [X(8.8), U(27.8)], [X(7.8), U(26.6)]] }], B, { hl: false, mask: (x, y) => !inHead(x, y) });
        recol(t, B, () => true, (x, y, v) => { const u = (y - U(19.6)) / (2 * s), i = Math.floor(u), R = PSTR[((i % 4) + 4) % 4]; return u - i > 0.82 ? '#fffaf0' : (v === B[2] ? R[2] : R[1]); });
      });
    },
  });

  // ---------------- Jetpack Zombie: a silver space suit, round goggles and a jetpack with little flames ----------------
  const SILV = ['#f6f9ff', '#d6e0f2', '#aab6cc'], JCY = R3('#8af0ff', 0.14), TANKC = R3('#c4d0e4');
  ZA.jetpack = (g, P) => {
    const f = P.walk && P.frame ? 1 : 0, d = (f ? -1 : 0) - 1.9;
    const t0 = new Grid(g.w, g.h, g.k);
    const G = zombie(t0, Object.assign({}, P, { walk: false }), {
      s: 0.9, head: 'round', hair: false, coat: SILV, sleeve: SILV, shirt: false, pants: SILV, shoe: R3('#8a9ab8'),
      back(g, G) { // the jetpack: two big round-topped tanks, a nozzle under each
        const { X, U, s } = G;
        for (const [x, R] of [[4.6, dk(TANKC)], [8.6, TANKC]]) {
          piece(g, t => blob(t, [{ p: rrect(X(x) - 1.8 * s, U(15.6), 3.6 * s, 11.2 * s, 1.7 * s) }], R, { hl: false }));
          piece(g, t => t.poly([[X(x) - 1.1 * s, U(26.6)], [X(x) + 1.1 * s, U(26.6)], [X(x) + 1.5 * s, U(28.2)], [X(x) - 1.5 * s, U(28.2)]], '#6a7490'));
        }
        piece(g, t => t.poly(rrect(X(8.6) - 0.6 * s, U(17.6), 1.2 * s, 2.4 * s, 0.4), '#ff9ab8'));
        g.dot(X(8.6), U(16.4), W);
      },
      torso(g, G) { // a cyan chest light and a belt
        const { X, U, s } = G;
        piece(g, t => t.poly(rrect(X(10), U(25.2), 10.8 * s, 1.3 * s, 0.5), '#8a9ab8'));
        piece(g, t => t.ell(X(15.4), U(22.4), 1.3 * s, 1.3 * s, flat(JCY)));
        g.dot(X(15), U(22), W);
      },
      hat(g, G) { // a silver cap with a cyan fin, and round goggles over the eyes
        const { hx, hy, hrx, hry, ex, ey, S } = G, sp = 6.6 * S;
        piece(g, t => blob(t, [[hx - 0.3, hy - 0.6, hrx + 0.5, hry + 0.2]], SILV, { mask: (x, y) => y < ey - 3.8 * S - (x - hx) * 0.05, hl: [hx - 4, hy - hry * 0.72, 1.4, 0.7] }));
        piece(g, t => blob(t, [{ p: [[hx - 3.4, hy - hry + 0.4], [hx - 1.6, hy - hry - 1.6], [hx + 0.8, hy - hry - 1.3], [hx + 1.4, hy - hry + 0.6]] }], JCY, { hl: false }));
        piece(g, t => stroke(t, [[hx - hrx * 0.98, ey - 0.6], [ex - sp / 2 - 2.6 * S, ey - 0.4]], 0.6 * S, 0.6 * S, '#6a7490'));
        for (const x of [ex - sp / 2, ex + sp / 2]) piece(g, t => { t.ell(x, ey, 3.3 * S, 3.4 * S, '#8a9ab8'); t.ell(x, ey, 2.7 * S, 2.8 * S, '#d8faff'); });
        zEyes(g, G, G.P, { w: 4.6 * S, h: 5 * S });
        thin(g, [[ex - 0.6 * S, ey - 0.6], [ex + 0.6 * S, ey - 0.6]], '#8a9ab8', 0.4);
      },
      note: [-5.6, -3.4, 0.3, 0.8], noteAfterHat: true,
    });
    // one round flame under each nozzle (behind it, clear of the boots), then the zombie, hovering (higher on the up frame)
    for (const x of [G.X(4.6), G.X(8.6)]) flameDown(g, x, G.U(28.2) + d + 0.6, 0.9, f);
    shiftMerge(g, t0, 0, d);
    G.hand = [G.hand[0], G.hand[1] + d];
    return G;
  };

  // ---------------- Arcade Zombie: a sweatband and a neon jacket, pushing a bright arcade cabinet ----------------
  const CAB = R3('#a88ae8', 0.2), NEONP = '#ff8ad0', NEONC = '#8af0ff';
  ZA.arcade = (g, P) => zombie(g, Object.assign({}, P, { arms: P.arms || 'hold' }), {
    s: 0.88, dx: -4.6, head: 'wide', coat: R3('#7cd8d0'), sleeve: R3('#7cd8d0'), shirt: '#fbf6ee', tie: false, pants: R3('#8a7ac8'), shoe: R3('#f4f4fa'),
    torso(g, G) { const { X, U } = G; thin(g, [[X(11.4), U(22)], [X(12.6), U(23.2)], [X(11.6), U(24.2)], [X(12.8), U(25.4)]], NEONP, 0.36); },
    hat(g, G) { // a pink sweatband
      const { hx, hy, hrx, hry, ey, S } = G, y = ey - 4.4 * S;
      piece(g, t => blob(t, [{ p: [[hx - hrx * 1.02, y - 0.4], [hx + hrx * 0.9, y - 1.8], [hx + hrx * 0.94, y + 0.4], [hx - hrx * 1.02, y + 1.8]] }], R3(NEONP), { hl: false, mask: (x, yy) => g.filled(x, yy) }));
      void hy; void hry;
    },
    note: [-3.4, -6.6, -0.2, 0.85], noteAfterHat: true,
    front(g, G) { // the cabinet: a glowing marquee, a screen with a pixel critter, a control ledge with a joystick, a coin door
      const x0 = 19.6, y0 = 6.4 + G.bob * 0.4, w = 11.1, h = 31 - y0, on = G.P.frame;
      piece(g, t => blob(t, [{ p: rrect(x0, y0 + 2.6, w, h - 2.6, 1) }], CAB, { hl: false, d: [1, 0.8] }));
      piece(g, t => blob(t, [{ p: rrect(x0 - 0.5, y0, w + 1, 3.4, 1) }], R3(on ? '#ffb4e4' : '#ff9ad8'), { hl: false }));
      for (let i = 0; i < 4; i++) g.dots([[x0 + 2 + i * 2.4, y0 + 1.6], [x0 + 2.5 + i * 2.4, y0 + 1.6]], i % 2 ? '#fffbe0' : NEONC);
      piece(g, t => t.poly(rrect(x0 + 1.4, y0 + 4.6, w - 2.8, 7.2, 1), '#3c3a5c'));
      // the critter on the screen: a little pixel ghost that hops
      const cx = x0 + w / 2 - 0.2, cy = y0 + 8.4 - (on ? 0.6 : 0);
      for (const [a, b] of [[-1, -1.5], [-0.5, -1.5], [0, -1.5], [0.5, -1.5], [-1.5, -1], [-1, -1], [-0.5, -1], [0, -1], [0.5, -1], [1, -1], [-1.5, -0.5], [0, -0.5], [1, -0.5], [-1.5, 0], [-1, 0], [-0.5, 0], [0, 0], [0.5, 0], [1, 0], [-1.5, 0.5], [-1, 0.5], [-0.5, 0.5], [0, 0.5], [0.5, 0.5], [1, 0.5], [-1.5, 1], [-0.5, 1], [0.5, 1]]) g.dot(cx + a, cy + b, '#9af27a');
      g.dots([[cx - 1, cy - 0.5], [cx + 0.5, cy - 0.5]], W);
      for (const [a, b] of [[-3.2, -2.6], [3, 1.6], [2.6, -2.2]]) g.dot(cx + a, cy + b, '#fffbe0');
      // the control ledge, joystick and buttons
      piece(g, t => blob(t, [{ p: rrect(x0 - 0.8, y0 + 12.6, w + 1.6, 2.6, 0.8) }], R3('#7c64c8'), { hl: false }));
      piece(g, t => stroke(t, [[x0 + 3, y0 + 12.8], [x0 + 3 + (on ? 0.6 : -0.4), y0 + 10.6]], 0.3, 0.3, '#6a6480'));
      piece(g, t => t.ell(x0 + 3 + (on ? 0.6 : -0.4), y0 + 10.2, 1, 1, flat(R3('#ff7a8a'))));
      for (const [a, c] of [[6.6, '#ffe27a'], [8.6, NEONC]]) piece(g, t => t.ell(x0 + a, y0 + 13.6, 0.75, 0.6, c));
      // the coin door and neon side stripes
      piece(g, t => t.poly(rrect(x0 + w / 2 - 2, y0 + 17.6, 4, 4.4, 0.6), CAB[2]));
      for (const a of [-0.8, 0.8]) thin(g, [[x0 + w / 2 + a, y0 + 18.6], [x0 + w / 2 + a, y0 + 19.8]], '#ff7a8a', 0.26);
      thin(g, [[x0 + 0.9, y0 + 16.4], [x0 + 0.9, 30]], NEONP, 0.3); thin(g, [[x0 + w - 0.9, y0 + 16.4], [x0 + w - 0.9, 30]], NEONC, 0.3);
      handOver(g, G, 1); handOver(g, G, 2);
    },
  });
})();
