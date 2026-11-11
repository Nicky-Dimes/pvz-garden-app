// art-zombies2.js — PVZ Garden: the newer zombies (PvZ 2 worlds) and the newer Zombosses, in the TRUE chibi style.
// Same contract as art-zombies.js (PX.ZOMBIE_ART[kind] = function (g, P, L) on a 32x32 grid facing right, feet on rows 29-31;
// PX.BOSS_ART[id] = { w: 48, h: 48, draw(g, f) }) and the same kit (PX.ZKIT, exported by art-zombies.js).
(function () {
  'use strict';
  if (!window.PX || !PX.ZKIT) return;
  const { INK, stroke, Grid } = PX;
  const A = PX.art, mixHex = PX.mixHex;
  const K = PX.ZKIT;
  const { zombie, handOver, blob, recol, thin, rot, rrect, note, zEyes, zMouth, HEADS, piece, flat, R3, lerp2, SKIN, METAL, RED, GOLD, WOOD, CREAM, W } = K;
  const ZA = PX.ZOMBIE_ART, BA = PX.BOSS_ART;
  const NOTEC = K.NOTE;

  // ---------------- Prospector: a floppy miner's hat, a bushy beard and a stick of dynamite ----------------
  const FLANNEL = R3('#e88a7a'), FHAT = R3('#b8906a'), BEARD = ['#ffffff', '#e8e8ee', '#c4c4d0'], DYN = R3('#f26a6a');
  ZA.prospector = (g, P) => zombie(g, P, {
    s: 0.94, head: 'pear', hair: false, coat: FLANNEL, sleeve: FLANNEL, shirt: false, pants: R3('#9a88b0'), shoe: R3('#a07a58'),
    torso(g, G) { // suspenders
      const { X, U, s } = G;
      for (const x of [13.2, 17]) piece(g, t => t.poly([[X(x), U(19.6)], [X(x + 1.1), U(19.6)], [X(x + 0.9), U(27.4)], [X(x - 0.2), U(27.4)]], '#7a6a8a'));
      void s;
    },
    mid(g, G) { // a big fluffy beard under the mouth
      const { mx, my, S } = G;
      piece(g, t => blob(t, [[mx - 1.4 * S, my + 3.4 * S, 3.6 * S, 2.4 * S], [mx + 1.2 * S, my + 3 * S, 2.4 * S, 2 * S], [mx - 4.2 * S, my + 1.8 * S, 2 * S, 2.2 * S], [mx - 0.8 * S, my + 5 * S, 2 * S, 1.6 * S]], BEARD, { hl: false }));
      piece(g, t => blob(t, [[mx - 1.3 * S, my - 1.3 * S, 1.7 * S, 0.75 * S, 0.15], [mx + 1.3 * S, my - 1.4 * S, 1.6 * S, 0.7 * S, -0.15]], BEARD, { hl: false })); // a moustache
    },
    mouthOpt: { w: 2 },
    hat(g, G) {
      const { hx, top, S } = G, cx = hx - 0.8 * S, b = top + 4 * S;
      piece(g, t => blob(t, [[cx, b - 2.6 * S, 5.6 * S, 3.8 * S], [cx - 1, b - 4.6 * S, 3.6 * S, 2 * S]], FHAT, { mask: (x, y) => y < b + 0.3, hl: false }));
      thin(g, [[cx - 2 * S, b - 4.4 * S], [cx + 0.4 * S, b - 3.4 * S]], FHAT[2], 0.24);
      piece(g, t => blob(t, [{ p: [[cx - 9 * S, b + 1.6 * S], [cx - 6 * S, b - 0.8 * S], [cx + 6 * S, b - 0.8 * S], [cx + 9.4 * S, b + 1.2 * S], [cx + 6 * S, b + 1 * S], [cx - 6 * S, b + 1 * S]] }], FHAT, { hl: false }));
    },
    note: 'hat', noteAfterHat: true, hatNote: G => [G.hx + 0.6 * G.S, G.top + 1.2 * G.S, 0.2, 0.72],
    front(g, G) { // a stick of dynamite with a fizzing fuse
      const [hx, hy] = G.hand, s = G.s, x0 = hx - 0.9 * s, y0 = hy - 4.6 * s;
      piece(g, t => blob(t, [{ p: rrect(x0, y0, 2.2 * s, 6.2 * s, 0.8 * s) }], DYN, { hl: false }));
      recol(g, DYN, (x, y) => y > y0 + 1.6 * s && y < y0 + 2.4 * s, '#ffe9a0');
      thin(g, [[x0 + 1.1 * s, y0], [x0 + 1.6 * s, y0 - 1.2 * s], [x0 + 1.2 * s, y0 - 2 * s]], '#7a6a6a', 0.26);
      const sp = G.P.frame ? 1 : 0, cx = x0 + 1.2 * s, cy = y0 - 2.4 * s;
      piece(g, t => t.poly(PX.starPts(cx, cy, 1.5 + sp * 0.3, 0.7, 4, sp ? 0 : Math.PI / 4), '#ffd23a'));
      g.dot(cx, cy, W);
      handOver(g, G, 1);
    },
  });

  // ---------------- Pianist: pushes a little upright piano, wears a bowler hat and a bow tie ----------------
  const PIANO = R3('#b98a66'), BOWLER = R3('#7a6a88', 0.22);
  ZA.pianist = (g, P) => zombie(g, Object.assign({}, P, { arms: P.arms || 'hold' }), {
    dx: -2.4, head: 'egg', hair: false, coat: R3('#8a8aa8'), tie: false, sleeve: R3('#8a8aa8'),
    torso(g, G) { const { X, U, s } = G; piece(g, t => { t.poly([[X(15.4), U(20.6)], [X(12.8), U(19.4)], [X(12.8), U(21.8)]], RED[1]); t.poly([[X(15.4), U(20.6)], [X(18), U(19.4)], [X(18), U(21.8)]], RED[1]); t.ell(X(15.4), U(20.6), 0.8 * s, 0.8 * s, RED[2]); }); },
    hat(g, G) {
      const { hx, top, S } = G, cx = hx - 0.6 * S, b = top + 3.2 * S;
      piece(g, t => blob(t, [[cx, b - 1.8 * S, 4.8 * S, 3.6 * S]], BOWLER, { mask: (x, y) => y < b, hl: [cx - 2 * S, b - 4 * S, 1.2, 0.6] }));
      recol(g, BOWLER, (x, y) => y > b - 1.4 * S && y < b - 0.4 * S, '#c86a7a');
      piece(g, t => blob(t, [[cx, b + 0.1, 7.2 * S, 1.2 * S]], BOWLER, { hl: false }));
    },
    note: 'hat', noteAfterHat: true, hatNote: G => [G.hx + 0.2 * G.S, G.top + 0.2 * G.S, 0.2, 0.7],
    front(g, G) {
      const x0 = 16.8, y0 = 16.6 + G.bob * 0.4, w = 14.4, h = 12.4;
      // the piano body, a lid on top, the keyboard ledge and two little wheels
      for (const x of [x0 + 2.4, x0 + w - 2.4]) piece(g, t => t.ell(x, 30.2, 1.3, 1.2, flat(R3('#8a8aa8'))));
      piece(g, t => blob(t, [{ p: rrect(x0, y0, w, h, 1.4) }], PIANO, { hl: false, d: [1, 0.9] }));
      piece(g, t => t.poly(rrect(x0 - 0.6, y0 - 0.8, w + 1.2, 1.8, 0.8), PIANO[0]));
      piece(g, t => t.poly(rrect(x0 + 1.4, y0 + 4.4, w - 2.8, 3, 0.5), '#fffdf6'));
      for (let i = 1; i < 10; i++) { const x = x0 + 1.4 + i * (w - 2.8) / 10; thin(g, [[x, y0 + 4.6], [x, y0 + 7.2]], '#c8c0d0', 0.18); if (i % 3 !== 0) g.dots([[x, y0 + 4.6], [x, y0 + 5.1], [x, y0 + 5.6], [x + 0.5, y0 + 4.6], [x + 0.5, y0 + 5.1], [x + 0.5, y0 + 5.6]], '#5a4a5a'); }
      // carved panel and music notes floating up
      piece(g, t => t.poly(rrect(x0 + 2.6, y0 + 8.6, w - 5.2, 2.6, 0.8), PIANO[2]));
      const n = G.P.frame ? 1 : 0, note8 = (x, y) => { piece(g, tt => tt.ell(x, y, 0.85, 0.7, '#7a6a88')); thin(g, [[x + 0.7, y], [x + 0.7, y - 2.4], [x + 1.6, y - 1.8]], '#7a6a88', 0.26); };
      note8(x0 + 9 + n, y0 - 3.4 - n * 0.6); note8(x0 + 12.4 - n * 0.4, y0 - 6.4 + n * 0.4);
      handOver(g, G, 1); handOver(g, G, 2);
    },
  });

  // ---------------- Chicken Wrangler: a straw hat and a crate of zombie chickens ----------------
  const STRAW = R3('#f2d27a', 0.18), CRATE = R3('#d4a874'), HEN = ['#ffffff', '#eef2e6', '#c8d0bc'], COMB = R3('#ff7a7a'), BEAKC = R3('#ffc04a');
  // a little zombie-chicken head (white, red comb, yellow beak, one googly eye) facing right
  function henHead(g, x, y, sc, f) {
    sc = sc || 1;
    piece(g, t => blob(t, [[x - 0.6 * sc, y - 2.6 * sc, 1 * sc, 1 * sc], [x + 0.6 * sc, y - 2.8 * sc, 1 * sc, 1 * sc]], COMB, { hl: false }));
    piece(g, t => blob(t, [[x, y, 2.4 * sc, 2.3 * sc]], HEN, { hl: false }));
    piece(g, t => { t.poly([[x + 1.8 * sc, y - 0.4 * sc], [x + 3.8 * sc, y + 0.2 * sc + (f ? 0.6 : 0)], [x + 1.8 * sc, y + 0.9 * sc]], BEAKC[1]); });
    piece(g, t => t.ell(x + 1.4 * sc, y + 1.6 * sc, 0.6 * sc, 0.8 * sc, COMB[1]));
    A.chibiEyes(g, x - 0.2 * sc, y - 0.3 * sc, { white: true, one: true, sp: 1.8 * sc, w: 1.8 * sc, h: 2 * sc, look: [0.6, 0] });
  }
  ZA.chickenwrangler = (g, P) => zombie(g, P, {
    s: 0.94, head: 'wide', hair: false, holdArms: true, coat: R3('#a8c48a'), shirt: '#fbf6ee', tie: false, pants: R3('#86a8e0'), shoe: R3('#a87850'),
    mid0(g, G) { const { X, U } = G; piece(g, t => blob(t, [{ p: [[X(11.8), U(19.4)], [X(19.4), U(19.4)], [X(16), U(23)]] }], R3('#f2b47a'), { hl: false })); },
    hat(g, G) {
      const { hx, top, S } = G, cx = hx - 0.8 * S, b = top + 3.4 * S;
      piece(g, t => blob(t, [[cx, b - 2.6 * S, 4.8 * S, 3.4 * S]], STRAW, { mask: (x, y) => y < b + 0.2, hl: false }));
      recol(g, STRAW, (x, y) => y > b - 1.5 * S && y < b - 0.6 * S, '#e07a6a');
      piece(g, t => blob(t, [[cx, b + 0.2, 9.4 * S, 1.6 * S]], STRAW, { hl: false }));
      for (let i = -3; i <= 3; i++) g.dot(cx + i * 2.4 * S, b + 0.4, STRAW[2]);
    },
    note: 'hat', noteAfterHat: true, hatNote: G => [G.hx + 0.2 * G.S, G.top + 0.4 * G.S, 0.2, 0.7],
    front(g, G) { // the crate, with a zombie chicken poking its head out
      const s = G.s, x0 = G.hand2[0] - 2 * s, y0 = G.hand[1] - 0.8 * s, w = 9.8 * s, h = 7.2 * s;
      henHead(g, x0 + w * 0.5, y0 - 2 * s, 1.3 * s, G.P.frame);
      piece(g, t => blob(t, [{ p: rrect(x0, y0, w, h, 0.6 * s) }], CRATE, { hl: false }));
      for (const yy of [y0 + h * 0.36, y0 + h * 0.7]) thin(g, [[x0 + 0.5, yy], [x0 + w - 0.5, yy]], CRATE[2], 0.22);
      thin(g, [[x0 + 0.6, y0 + 0.6], [x0 + w - 0.6, y0 + h - 0.6]], CRATE[2], 0.22);
      handOver(g, G, 1); handOver(g, G, 2);
    },
  });

  // ---------------- Adventurer: a safari pith helmet, a khaki shirt and a coiled whip ----------------
  const PITH = R3('#f0dcae', 0.2), KHAKI = R3('#d8c08e');
  ZA.adventurer = (g, P) => zombie(g, P, {
    s: 0.94, head: 'peanut', hair: false, coat: KHAKI, sleeve: KHAKI, shirt: '#f6eedc', tie: R3('#e8946a'), pants: R3('#a89474'), shoe: R3('#9a7050'),
    torso(g, G) { const { X, U } = G; piece(g, t => t.poly([[X(17.6), U(19.6)], [X(18.8), U(19.6)], [X(13.4), U(27.6)], [X(12.2), U(27.6)]], '#8a6a50')); }, // backpack strap
    hat(g, G) {
      const { hx, hy, hrx, hry, top, S } = G, b = top + 4.4 * S;
      piece(g, t => blob(t, [[hx - 0.8 * S, b - 1.2 * S, 7.2 * S, 5.4 * S]], PITH, { mask: (x, y) => y < b, hl: [hx - 3.6 * S, b - 4.6 * S, 1.4, 0.7] }));
      recol(g, PITH, (x, y) => y > b - 1.6 * S && y < b - 0.6 * S, '#a87a5a');
      piece(g, t => blob(t, [[hx - 0.6 * S, b + 0.2, 10.4 * S, 1.6 * S]], PITH, { hl: false }));
      piece(g, t => t.ell(hx - 0.8 * S, b - 6.4 * S, 0.8 * S, 0.6 * S, flat(PITH)));
      void hy; void hrx; void hry;
    },
    note: 'hat', noteAfterHat: true, hatNote: G => [G.hx - 2.8 * G.S, G.top + 1 * G.S, -0.2, 0.8],
    front(g, G) { // the coiled whip
      const [hx, hy] = G.hand, s = G.s;
      const WH = R3('#a87452');
      piece(g, t => { t.ell(hx + 0.4 * s, hy + 3 * s, 2.8 * s, 2.2 * s, WH[1]); t.ell(hx + 0.4 * s, hy + 3 * s, 1.6 * s, 1.1 * s, null); });
      piece(g, t => stroke(t, [[hx + 2.8 * s, hy + 3.6 * s], [hx + 4 * s, hy + 5.6 * s], [hx + 3.2 * s, hy + 7.4 * s], [hx + 4.6 * s, hy + 8.4 * s]], 0.42, 0.3, WH[1]));
      handOver(g, G, 1);
    },
  });

  // ---------------- Excavator: a hard hat, a high-vis vest and a big shovel ----------------
  const HV = R3('#ffaa5a', 0.16), HHAT = R3('#ffd84a', 0.16);
  ZA.excavator = (g, P) => zombie(g, P, {
    s: 0.94, head: 'box', hair: false, coat: R3('#9aa0b8'), sleeve: R3('#9aa0b8'), shirt: false, pants: R3('#7c88b0'), shoe: R3('#a07a58'),
    torso(g, G) { // the orange vest with reflective stripes
      const { X, U, s } = G;
      piece(g, t => { blob(t, [{ p: [[X(11), U(20.6)], [X(13.6), U(19.6)], [X(15.4), U(23)], [X(17.2), U(19.6)], [X(19.8), U(20.6)], [X(20.4), U(26.6)], [X(10.4), U(26.6)]] }], HV, { hl: false });
        recol(t, HV, (x, y) => y > U(24) && y < U(25), (x, y, v) => (v === HV[2] ? '#d8dce4' : '#fbfbf6')); });
      void s;
    },
    back(g, G) { // the shovel, held upright with the blade high
      const [hx, hy] = G.hand, x = hx + 0.6, top = Math.max(5.6, hy - 10);
      piece(g, t => stroke(t, [[x, Math.min(30.4, hy + 6)], [x, top + 2]], 0.6, 0.6, WOOD[1]));
      piece(g, t => blob(t, [{ p: [[x - 2.8, top + 3], [x - 3, top - 1.6], [x, top - 4.2], [x + 3, top - 1.6], [x + 2.8, top + 3]] }], METAL, { d: [0.8, 0.6] }));
      thin(g, [[x, top - 3], [x, top + 2.4]], METAL[2], 0.24);
    },
    hat(g, G) {
      const { hx, hy, hrx, hry, ex, ey, S } = G, rim = ey - 3.6 * S;
      piece(g, t => blob(t, [[hx - 0.4, hy - 1.4, hrx + 0.4, hry - 0.2], { p: rrect(hx - hrx - 1.6, rim - 1, hrx * 2 + 4.2, 2, 1) }], HHAT, { mask: (x, y) => y < rim + 1, hl: [hx - hrx * 0.4, hy - hry * 0.75, 1.4, 0.7] }));
      piece(g, t => t.poly(rrect(hx - 1.6, hy - hry - 1.4, 2.2, rim - (hy - hry) + 0.6, 1), HHAT[0])); // the ridge
    },
    note: 'hat', noteAfterHat: true, hatNote: G => [G.hx - 4.6 * G.S, G.hy - 5.4 * G.S, -0.25, 0.8], front(g, G) { handOver(g, G, 1); },
  });

  // ---------------- Parasol: a frilly parasol held over the head ----------------
  const PARA = R3('#ffaacb', 0.16), FRILL = ['#ffffff', '#fff4f8', '#f2d2de'];
  ZA.parasol = (g, P) => zombie(g, P, {
    s: 0.86, head: 'egg', coat: R3('#c8a8e8'), sleeve: R3('#c8a8e8'), shirt: '#fbf6ff', tie: false, pants: R3('#a898c8'),
    back(g, G) { // the handle comes up from the front hand
      const [hx, hy] = G.hand; G.para = [hx + 0.4, hy];
    },
    front(g, G) {
      const [x, hy] = G.para, top = 1, cy = 7.4 + (G.P.frame ? 0.4 : 0);
      piece(g, t => stroke(t, [[x, hy + 1.6], [x, top + 1]], 0.4, 0.4, '#b89a7a'));
      piece(g, t => stroke(t, [[x, hy + 1.6], [x + 0.6, hy + 3], [x + 1.6, hy + 2.8]], 0.42, 0.42, '#b89a7a'));
      const cx = x - 6.6, rx = 12.4;
      // the canopy: a dome with a scalloped frill
      const sc = [];
      for (let i = 0; i < 7; i++) sc.push([cx - rx + 1.8 + i * (rx * 2 - 3.6) / 6, cy + 0.2, 1.9, 1.3]);
      piece(g, t => blob(t, sc, FRILL, { hl: false }));
      piece(g, t => { blob(t, [[cx, cy, rx, cy - top]], PARA, { mask: (xx, yy) => yy < cy + 0.3, hl: [cx - 5, top + 2.4, 2, 0.8] }); });
      for (const k of [-0.55, 0, 0.55]) thin(g, [[cx + k * rx * 0.2, top + 0.6], [cx + k * rx * 0.86, cy]], PARA[2], 0.22);
      piece(g, t => t.ell(cx, top - 0.2, 0.9, 0.9, flat(PARA)));
      handOver(g, G, 1);
    },
    hair: false,
  });

  // ---------------- Surfer: a surfboard under the arm, a flowery shirt ----------------
  const BOARD = R3('#7ad8e8', 0.16), ALOHA = R3('#ffb88a');
  ZA.surfer = (g, P) => zombie(g, P, {
    head: 'peanut', coat: ALOHA, sleeve: ALOHA, shirt: false, legs: 'short', pants: R3('#80b4f0'), shoe: R3('#ffd466'),
    body(t, G) { const { X, U, s } = G; blob(t, [[X(15.2), U(24.1), 5.6 * s, 4.6 * s]], ALOHA, { hl: false }); },
    torso(g, G) { // little flowers on the shirt
      const { X, U } = G;
      for (const [a, b] of [[12, 22], [16.8, 21], [14, 25.6], [18.6, 24.8]]) { const x = X(a), y = U(b); g.dots([[x, y - 0.5], [x - 0.5, y], [x + 0.5, y], [x, y + 0.5]], '#fff6f0'); g.dot(x, y, '#ffd466'); }
    },
    hat(g, G) { // sunglasses pushed up on the head
      const { hx, top, S } = G, y = top + 2.6 * S;
      piece(g, t => { t.ell(hx - 1.6 * S, y, 2 * S, 1.4 * S, '#6a7aa8'); t.ell(hx + 2.8 * S, y + 0.2, 2 * S, 1.4 * S, '#6a7aa8'); stroke(t, [[hx - 0.2 * S, y - 0.4], [hx + 1.2 * S, y - 0.4]], 0.32, 0.32, '#6a7aa8'); });
      g.dots([[hx - 2.4 * S, y - 0.5], [hx + 2 * S, y - 0.3]], W);
    },
    note: [-6.8, -5.4, 0.3, 0.85], noteAfterHat: true,
    mid(g, G) { // the board, carried flat under the front arm
      const { X, U, s } = G, cx = X(16.4), cy = U(22.6), a = -0.07;
      piece(g, t => { blob(t, [[cx, cy, 14.2 * s, 2 * s, a]], BOARD, { hl: false, d: [0.6, 0.8] });
        recol(t, BOARD, (x, y) => { const q = rot([[x, y]], cx, cy, -a)[0]; return Math.abs(q[1] - cy) < 0.45 * s; }, '#ff8aa8');
        recol(t, BOARD, (x, y) => { const q = rot([[x, y]], cx, cy, -a)[0]; return Math.abs(q[0] - (cx + 7 * s)) < 0.5 * s; }, '#fff6c0'); });
    },
  });

  // ---------------- Fisherman: a bucket hat, a yellow raincoat and a rod with a hook ----------------
  const RAIN = R3('#ffd85a', 0.16), BHAT = R3('#a8b890');
  ZA.fisherman = (g, P) => zombie(g, P, {
    s: 0.94, head: 'wide', hair: false, coat: RAIN, sleeve: RAIN, shirt: '#f4f4ee', tie: false, pants: R3('#7c9ac8'), shoe: R3('#7a6a8a'),
    torso(g, G) { const { X, U, s } = G; for (const y of [22.4, 24.8]) piece(g, t => t.ell(X(13.4), U(y), 0.6 * s, 0.6 * s, flat(R3('#c8a040')))); },
    hat(g, G) {
      const { hx, top, S } = G, b = top + 4 * S;
      piece(g, t => blob(t, [[hx - 0.6 * S, b - 2 * S, 6.4 * S, 3.6 * S], { p: [[hx - 8.4 * S, b + 1.2 * S], [hx - 6 * S, b - 1 * S], [hx + 5 * S, b - 1 * S], [hx + 7.6 * S, b + 1 * S]] }], BHAT, { mask: (x, y) => y < b + 1.4 * S, hl: false }));
      thin(g, [[hx - 6.2 * S, b - 0.6 * S], [hx + 5.2 * S, b - 0.6 * S]], BHAT[2], 0.24);
      piece(g, t => { t.ell(hx + 3.4 * S, b - 2.4 * S, 1 * S, 0.7 * S, '#ff9a6a'); }); // a fishing lure on the hat
    },
    note: 'hat', noteAfterHat: true, hatNote: G => [G.hx - 2.6 * G.S, G.top + 1.8 * G.S, -0.2, 0.75],
    front(g, G) {
      const [hx, hy] = G.hand, tip = [Math.min(30.6, hx + 4.4), 2.4], sw = G.P.frame ? 0.6 : 0;
      piece(g, t => stroke(t, [[hx - 1.6, hy + 2.4], tip], 0.5, 0.3, '#9a6a4a'));
      piece(g, t => t.ell(hx - 0.6, hy + 0.8, 1, 1, flat(METAL)));
      const end = [tip[0] + sw * 0.4, 13.4];
      thin(g, [tip, end], '#8a8aa0', 0.2);
      piece(g, t => stroke(t, [[end[0], end[1]], [end[0], end[1] + 1.6], [end[0] - 0.4, end[1] + 2.4], [end[0] - 1.4, end[1] + 2.2], [end[0] - 1.6, end[1] + 1.4]], 0.34, 0.3, METAL[1]));
      handOver(g, G, 1);
    },
  });

  // ---------------- Octo Zombie: a squishy pink octopus hugging its head ----------------
  const OCTO = R3('#e898d8', 0.16);
  ZA.octo = (g, P) => zombie(g, P, {
    s: 0.9, head: 'round', hair: false, coat: R3('#7cc8d8'), sleeve: R3('#7cc8d8'), shirt: false, pants: R3('#6c9cd8'), legs: 'short',
    body(t, G) { const { X, U, s } = G, C = R3('#7cc8d8'); blob(t, [[X(15.2), U(24.1), 5.6 * s, 4.6 * s]], C, { hl: false }); recol(t, C, (x, y) => Math.floor((y - U(19)) / (1.2 * s)) % 2 === 1, (x, y, v) => (v === C[2] ? '#c8d8e4' : '#f4fbff')); },
    hat(g, G) {
      const { hx, hy, hrx, hry, top, S, P } = G, w = P.frame ? 0.6 : 0, cx = hx - 1.2 * S, cy = top + 1.4 * S;
      // tentacles curling down the back and over the brow
      for (const [a, b, c, d] of [[-6.6, 0, -9.2, 6.4], [-4, 1.6, -6.4, 9.2], [3.6, 1.6, 6.4, 3.8], [5.8, 0.6, 9.2, 1.2]]) {
        piece(g, t => stroke(t, [[cx + a * S, cy + b * S], [cx + (a + c) / 2 * S - w, cy + (b + d) / 2 * S], [cx + c * S, cy + d * S + w]], 1.2 * S, 0.7 * S, OCTO[1]));
        g.dot(cx + c * S, cy + d * S + w, OCTO[0]);
      }
      piece(g, t => blob(t, [[cx, cy - 1.4 * S, 6 * S, 4.6 * S], [cx - 1.4 * S, cy - 2.6 * S, 4.4 * S, 3.6 * S]], OCTO));
      for (const [a, b] of [[-3, -3.6], [-0.4, -5], [2.4, -3.2]]) { piece(g, t => t.ell(cx + a * S, cy + b * S, 0.6 * S, 0.55 * S, OCTO[0])); }
      A.chibiEyes(g, cx + 1.4 * S, cy - 0.6 * S, { sp: 3.2 * S, w: 1.5 * S, h: 2 * S, mood: P.eyes === 'happy' ? 'happy' : null });
      A.chibiMouth(g, cx + 1.4 * S, cy + 1.3 * S, 'smile', 1.2 * S);
      void hy; void hrx; void hry;
    },
    note: 'hat', noteAfterHat: true, hatNote: G => [G.hx - 4.6 * G.S, G.top - 0.4 * G.S, -0.3, 0.7],
  });

  // ---------------- Jurassic Zombie (caveman): shaggy hair with a bone, a spotty fur tunic and a big club ----------------
  const CHAIR = R3('#9a6e58', 0.22), PELT = R3('#f2a860'), BONE = ['#ffffff', '#fbf6ea', '#d8ccb4'];
  const cavemanOpt = (big) => ({
    s: big ? 1 : 0.94, hs: big ? 1.04 : 1, head: 'pear', hair: false, sleeve: 'bare', shirt: false, coat: big ? R3('#d08a52') : PELT, pants: R3('#c49a6e'), legs: 'short', shoe: big ? R3('#9fbc8a') : R3('#b4cc9e'),
    body: big ? 'pear' : undefined,
    torso(g, G) { // a one-shoulder fur tunic with big spots
      const { X, U, s } = G, PE = big ? R3('#d08a52') : PELT;
      piece(g, t => { blob(t, [{ p: [[X(10.4), U(21.6)], [X(17.6), U(19.4)], [X(20.6), U(23)], [X(20.4), U(27.6)], [X(10), U(27.6)]] }], PE, { hl: false });
        for (const [a, b] of [[12.4, 23.4], [16.4, 22.2], [14.4, 25.8], [18.6, 25.4]]) t.ell(X(a), U(b), 0.9 * s, 0.75 * s, mixHex(PE[1], '#7a4a3a', 0.45), 0, (x, y) => t.filled(x, y)); });
    },
    hat(g, G) { // shaggy hair spikes and a bone
      const { hx, hy, hrx, hry, top, S } = G, sh = [];
      for (let i = 0; i < 6; i++) { const a = Math.PI * (1.02 + i * 0.16); sh.push({ p: [[hx + Math.cos(a - 0.2) * hrx * 0.86, hy + Math.sin(a - 0.2) * hry * 0.86], [hx + Math.cos(a) * hrx * 1.22, hy + Math.sin(a) * hry * 1.18], [hx + Math.cos(a + 0.2) * hrx * 0.86, hy + Math.sin(a + 0.2) * hry * 0.86]] }); }
      sh.push([hx - 1, hy - hry * 0.5, hrx * 0.86, hry * 0.48]);
      piece(g, t => blob(t, sh, CHAIR, { mask: (x, y) => y < hy - hry * 0.22 || x < hx - hrx * 0.6, hl: false }));
      const bx = hx - 0.6 * S, by = top - 0.2;
      piece(g, t => { stroke(t, [[bx - 2.6 * S, by + 0.6], [bx + 2.6 * S, by - 0.6]], 0.6 * S, 0.6 * S, BONE[1]); for (const [x, y] of [[bx - 2.8 * S, by + 0.6], [bx + 2.8 * S, by - 0.6]]) { t.ell(x, y - 0.6 * S, 0.8 * S, 0.8 * S, BONE[1]); t.ell(x, y + 0.6 * S, 0.8 * S, 0.8 * S, BONE[1]); } });
      if (big) { // a heavy brow
        const { ex, ey } = G; piece(g, t => blob(t, [[ex, ey - 3.4 * S, 5.4 * S, 1.1 * S, 0.06]], G.SK, { hl: false }));
      }
    },
    noteAfterHat: true, note: [-3.4, -4.4, -0.2, 0.85],
    front(g, G) { // the club: a fat knobbly log, held up
      const [hx, hy] = G.hand, s = G.s * (big ? 1.2 : 1), up = G.pose === 'up';
      const b0 = [hx - 0.4, hy + 1.6 * s], b1 = up ? [Math.min(27.6, hx + 1.4), Math.max(2.8, hy - 9 * s)] : [Math.min(27.4, hx + 3.4 * s), Math.max(2.8, hy - 7.6 * s)];
      piece(g, t => { stroke(t, [b0, lerp2(b0, b1, 0.5)], 0.8 * s, 1.4 * s, WOOD[1]); stroke(t, [lerp2(b0, b1, 0.45), b1], 1.5 * s, 2.3 * s, WOOD[1]); });
      piece(g, t => blob(t, [[b1[0], b1[1], 2.3 * s, 2.2 * s]], WOOD, { hl: false }));
      g.dots([[b1[0] - 0.6, b1[1] + 2.4 * s], [b1[0] + 0.6, b1[1] + 1.2]], WOOD[2]);
      handOver(g, G, 1);
    },
    mouthOpt: big ? { w: 3 } : {},
  });
  ZA.caveman = (g, P) => zombie(g, P, cavemanOpt(false));
  // ---------------- Jurassic Bully: a bigger, burlier caveman ----------------
  ZA.bully = (g, P) => zombie(g, Object.assign({}, P, { mouth: P.mouth || 'grin', eyes: P.eyes || 'brave' }), Object.assign(cavemanOpt(true), { armR: 1.9, handR: 2.1 }));

  // ---------------- Punk: a tall spiky mohawk, a studded jacket ----------------
  const MOHAWK = R3('#ff8ac8', 0.16), LEATHER = R3('#8a84a8', 0.22);
  ZA.punk = (g, P) => zombie(g, P, {
    s: 0.88, head: 'bean', hair: false, coat: LEATHER, sleeve: LEATHER, shirt: '#fbf6ee', tie: false, pants: R3('#80a0d8'), shoe: R3('#6a6080'),
    torso(g, G) { // studs on the jacket and a rip in the jeans
      const { X, U } = G;
      for (const [a, b] of [[11.8, 21.8], [12.2, 24], [18.4, 21.6]]) g.dots([[X(a), U(b)], [X(a) + 0.5, U(b)], [X(a), U(b) + 0.5], [X(a) + 0.5, U(b) + 0.5]], '#eef2f8');
      thin(g, [[X(13.8), U(21)], [X(15.6), U(23.2)], [X(16.4), U(21)]], '#4a4060', 0.24); // a lightning bolt on the shirt
    },
    mid0(g, G) { const { X, U, s } = G; piece(g, t => t.poly(rrect(X(11.6), U(19.2), 7.8 * s, 1.4 * s, 0.6), '#4a4060')); g.dots([[X(13), U(19.7)], [X(15.4), U(19.7)], [X(17.8), U(19.7)]], '#eef2f8'); },
    hat(g, G) { // the mohawk: a row of big rounded spikes along the top
      const { hx, hy, hrx, hry, S } = G, sh = [];
      // one solid crest along the top of the head with a jagged edge (5 big spikes)
      const pts = [], n = 5, a0 = Math.PI * 1.16, a1 = Math.PI * 1.86;
      for (let i = 0; i <= n * 2; i++) { const a = a0 + (a1 - a0) * i / (n * 2), r = i % 2 ? 1.04 : 1.0, ext = i % 2 ? 4.4 * S : 1.4 * S; pts.push([hx + Math.cos(a) * (hrx * r + ext), hy + Math.sin(a) * (hry * r + ext)]); }
      for (let i = 12; i >= 0; i--) { const a = a0 + (a1 - a0) * i / 12; pts.push([hx + Math.cos(a) * hrx * 0.62, hy + Math.sin(a) * hry * 0.62]); }
      sh.push({ p: pts });
      piece(g, t => blob(t, sh, MOHAWK, { hl: false }));
      // a shaved band and an earring
      piece(g, t => t.ell(hx - hrx * 0.62, hy + hry * 0.5, 0.7 * S, 0.7 * S, flat(METAL)));
    },
    note: [-6.4, -3.6, 0.35, 0.8], noteAfterHat: true,
  });

  // ---------------- Glitter Zombie: sparkly, with a big bow and a rainbow trail ----------------
  const RAINBOW = ['#ff9a9a', '#ffc47a', '#ffe98a', '#a8e89a', '#8ac8f8', '#c4a4f0'], SEQ = R3('#f6a8e0', 0.16);
  ZA.glitter = (g, P) => zombie(g, P, {
    head: 'egg', hair: false, coat: SEQ, sleeve: SEQ, shirt: false, pants: R3('#c4a4f0'), shoe: R3('#ff9ac8'),
    back(g, G) { // the rainbow trail swooshing behind
      const w = G.P.frame ? 0.6 : 0;
      RAINBOW.forEach((c, i) => {
        const y = 21.6 + i * 1.2;
        piece(g, t => stroke(t, [[0.6, y - 4 + w], [4.6, y - 2.2 - w * 0.5], [9, y - 0.4], [12.6, y + 0.6]], 0.62, 0.62, c));
      });
      for (const [x, y] of (G.P.frame ? [[2, 17], [6.4, 19], [1.4, 30]] : [[3.6, 16.6], [1, 21], [5, 30.4]])) { g.dots([[x, y - 0.5], [x - 0.5, y], [x, y], [x + 0.5, y], [x, y + 0.5]], '#fffbe0'); }
    },
    torso(g, G) { // sequins: a few sparkles
      const { X, U } = G;
      for (const [a, b] of [[12.2, 22.4], [17.6, 21.6], [14.6, 25.4], [19, 24.6], [11.6, 25.6]]) g.dots([[X(a), U(b)], [X(a) + 0.5, U(b) - 0.5]], '#fff6fc');
      piece(g, t => t.poly(PX.starPts(X(15.4), U(22.6), 1.7, 0.75, 5), '#ffe98a'));
    },
    hat(g, G) { // a big bow on top
      const { hx, top, S } = G, cx = hx + 0.6 * S, cy = top + 1.6 * S, BOW = R3('#ff8ac0', 0.16);
      piece(g, t => blob(t, [{ p: [[cx, cy], [cx - 4.4 * S, cy - 2.6 * S], [cx - 4.6 * S, cy + 1.8 * S]] }, { p: [[cx, cy], [cx + 4.4 * S, cy - 2.6 * S], [cx + 4.6 * S, cy + 1.8 * S]] }, [cx - 3.8 * S, cy - 0.4 * S, 1.2 * S, 2 * S], [cx + 3.8 * S, cy - 0.4 * S, 1.2 * S, 2 * S]], BOW, { hl: false }));
      piece(g, t => t.ell(cx, cy, 1.2 * S, 1.2 * S, flat(BOW)));
    },
    note: [-3.6, -4.4, -0.2, 0.85],
    post(g, G) { const { hx, hy, S } = G; for (const [a, b] of [[7.4, -5.6], [-7.8, 2.6]]) { const x = hx + a * S, y = hy + b * S; g.dots([[x, y - 0.5], [x - 0.5, y], [x, y], [x + 0.5, y], [x, y + 0.5]], '#fffbe0'); } },
  });

  // ---------------- Boombox Zombie: headphones and a giant boombox ----------------
  const BOX = R3('#a8b4d0'), SPK = ['#6a7490', '#4e5670', '#3a4058'];
  ZA.boombox = (g, P) => zombie(g, P, {
    head: 'wide', hair: false, holdArms: true, coat: R3('#ffb47a'), sleeve: R3('#ffb47a'), shirt: '#fbf6ee', tie: false, pants: R3('#7c8ab8'), shoe: R3('#f4f4fa'),
    hat(g, G) { // big headphones
      const { hx, hy, hrx, hry, S } = G;
      piece(g, t => stroke(t, [[hx - hrx * 0.62, hy - hry * 0.1], [hx - hrx * 0.5, hy - hry * 0.8], [hx, hy - hry * 1.08], [hx + hrx * 0.5, hy - hry * 0.86]], 0.75 * S, 0.75 * S, '#7a84a8'));
      piece(g, t => blob(t, [[hx - hrx * 0.64, hy + hry * 0.02, 2.2 * S, 2.8 * S]], R3('#ff8ab0'), { hl: false }));
      void hy;
    },
    note: [-2.6, -5.2, -0.2, 0.85], noteAfterHat: true,
    front(g, G) {
      const s = G.s, x0 = G.hand2[0] - 2.4 * s, y0 = G.hand[1] - 2.4 * s, w = 10.4 * s, h = 7.2 * s, bump = G.P.frame ? 0.25 : 0;
      piece(g, t => stroke(t, [[x0 + 2.4 * s, y0], [x0 + 2.8 * s, y0 - 1.6 * s], [x0 + w - 2.8 * s, y0 - 1.6 * s], [x0 + w - 2.4 * s, y0]], 0.45 * s, 0.45 * s, '#7a84a8')); // handle
      piece(g, t => blob(t, [{ p: rrect(x0, y0, w, h, 1.2 * s) }], BOX, { hl: false }));
      for (const cx of [x0 + 2.5 * s, x0 + w - 2.5 * s]) { piece(g, t => t.ell(cx, y0 + h * 0.56, (2.1 + bump) * s, (2.1 + bump) * s, flat(SPK))); piece(g, t => t.ell(cx, y0 + h * 0.56, 0.8 * s, 0.8 * s, '#a8b4d0')); }
      piece(g, t => t.poly(rrect(x0 + w / 2 - 1.2 * s, y0 + 1.2 * s, 2.4 * s, 1.4 * s, 0.3), '#8af0d8'));
      for (const [a, c] of [[-0.6, '#ff9ab8'], [0.6, '#ffe98a']]) piece(g, t => t.ell(x0 + w / 2 + a * s, y0 + h - 1.6 * s, 0.4 * s, 0.4 * s, c));
      // music notes
      const n = G.P.frame ? 1 : 0;
      const note8 = (x, y) => { piece(g, tt => tt.ell(x, y, 0.8, 0.65, '#8a7ab8')); thin(g, [[x + 0.6, y], [x + 0.6, y - 2.2], [x + 1.4, y - 1.6]], '#8a7ab8', 0.24); };
      note8(Math.min(29.4, x0 + w + 0.4 - n), y0 - 2.6 - n); note8(x0 + w - 2.4 + n * 0.6, y0 - 5 + n * 0.4);
      handOver(g, G, 1); handOver(g, G, 2);
    },
  });

  // ---------------- Wizard Zombie: a tall starry hat, a long beard and a magic staff ----------------
  const WIZ = R3('#a888e0', 0.2), WBEARD = ['#ffffff', '#f2f2f8', '#cfd0dc'];
  ZA.wizard = (g, P) => zombie(g, P, {
    s: 0.86, head: 'egg', hair: false, coat: WIZ, sleeve: WIZ, shirt: false, pants: WIZ, shoe: R3('#8a6ac8'), note: 'hat', noteAfterHat: true, hatNote: G => [G.hx + 1.4 * G.S, G.top + 1.2 * G.S, 0.25, 0.72],
    body(t, G) { const { X, U, s } = G; blob(t, [{ p: [[X(12), U(19.6)], [X(18.6), U(19.6)], [X(21.4), U(28.6)], [X(9.4), U(28.6)]] }], WIZ, { hl: false }); },
    back(g, G) { // the staff with a glowing orb
      const [hx, hy] = G.hand, x = hx + 0.5, top = Math.max(4, hy - 13), glow = G.P.frame;
      piece(g, t => stroke(t, [[x, Math.min(30.4, hy + 8)], [x, top + 1.4]], 0.6, 0.6, WOOD[1]));
      piece(g, t => { stroke(t, [[x, top + 1.6], [x - 1.4, top + 0.4], [x - 1, top - 1.6]], 0.45, 0.45, WOOD[1]); stroke(t, [[x, top + 1.6], [x + 1.4, top + 0.4], [x + 1, top - 1.6]], 0.45, 0.45, WOOD[1]); });
      piece(g, t => blob(t, [[x, top - 0.4, 1.9, 1.9]], glow ? R3('#ffe98a', 0.12) : R3('#8af0e8', 0.12), { hl: [x - 0.6, top - 1, 0.6, 0.5] }));
      for (const [a, b] of (glow ? [[-3, -2], [2.8, -3], [3, 1]] : [[-2.6, -3.2], [3.2, -1.6]])) g.dots([[x + a, top + b - 0.5], [x + a - 0.5, top + b], [x + a, top + b], [x + a + 0.5, top + b], [x + a, top + b + 0.5]], '#fffbe0');
    },
    mid(g, G) { // the long white beard over the robe
      const { mx, my, S } = G;
      piece(g, t => blob(t, [[mx - 1.8 * S, my + 3 * S, 4 * S, 2.4 * S], [mx - 1.2 * S, my + 5.6 * S, 2.8 * S, 2.2 * S], [mx - 0.8 * S, my + 7.8 * S, 1.6 * S, 1.6 * S], [mx - 5 * S, my + 1.2 * S, 1.8 * S, 2 * S]], WBEARD, { hl: false }));
      piece(g, t => blob(t, [[mx - 1.3 * S, my - 1.3 * S, 1.8 * S, 0.75 * S, 0.2], [mx + 1.3 * S, my - 1.4 * S, 1.6 * S, 0.7 * S, -0.2]], WBEARD, { hl: false }));
    },
    mouthOpt: { w: 2 },
    hat(g, G) { // the tall pointy hat with a floppy tip and stars
      const { hx, top, S } = G, cx = hx - 0.6 * S, b = top + 3.6 * S;
      piece(g, t => blob(t, [{ p: [[cx - 6 * S, b], [cx + 6 * S, b], [cx + 2.4 * S, b - 6 * S], [cx - 0.4 * S, b - 9.6 * S], [cx - 3.6 * S, Math.max(0.4, b - 11 * S)], [cx - 2.2 * S, b - 7.6 * S]] }], WIZ, { hl: false }));
      piece(g, t => blob(t, [[cx, b + 0.1, 9.2 * S, 1.6 * S]], WIZ, { hl: false }));
      for (const [a, c, r] of [[-1.6, -3.4, 1.2], [1.8, -5.6, 0.9], [-1.2, -7.6, 0.7]]) piece(g, t => t.poly(PX.starPts(cx + a * S, b + c * S, r * 1.4, r * 0.6, 5), '#ffe98a'));
    },
  });

  // ---------------- Shield Zombie: a future zombie behind a glowing energy shield ----------------
  const SUIT2 = R3('#c8d4e8'), GLOW = '#8af4ff';
  ZA.shieldbot = (g, P) => {
    const G = zombie(g, Object.assign({}, P, { arms: P.arms || 'hold' }), {
      head: 'round', hair: false, coat: SUIT2, sleeve: SUIT2, shirt: false, pants: R3('#a8b8d4'), shoe: R3('#8a9ab8'),
      torso(g, G) { const { X, U, s } = G; piece(g, t => t.ell(X(15.4), U(22.8), 1.4 * s, 1.4 * s, flat(R3(GLOW)))); },
      hat(g, G) { // a sleek visor band with an antenna nub
        const { hx, hy, hrx, hry, ex, ey, S } = G;
        piece(g, t => blob(t, [[hx - 0.3, hy - 0.6, hrx + 0.5, hry + 0.2]], SUIT2, { mask: (x, y) => y < ey - 3.4 * S - (x - hx) * 0.05, hl: [hx - 4, hy - hry * 0.7, 1.4, 0.7] }));
        piece(g, t => t.ell(hx - hrx * 0.62, hy - 0.2, 1.6 * S, 1.9 * S, flat(R3(GLOW))));
        piece(g, t => t.ell(hx - 1, hy - hry - 1.2, 1 * S, 1 * S, flat(R3(GLOW))));
        void ex;
      },
      note: 'hat', noteAfterHat: true, hatNote: G => [G.hx - 4.2 * G.S, G.hy - 5 * G.S, -0.25, 0.8],
    });
    // the energy shield: everything behind it is tinted see-through cyan, with a bright rim and hex lines
    const s = G.s, cx = G.X(24.8), cy = G.U(20.4) + (P.frame ? 0.3 : 0), rx = 6 * s, ry = 9.8 * s, k = g.k || 1;
    const inS = (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
    for (let fy = 0; fy < g.fh; fy++) for (let fx = 0; fx < g.fw; fx++) {
      const x = (fx + 0.5) / k, y = (fy + 0.5) / k; if (!inS(x, y)) continue;
      const v = g.fget(fx, fy); g.fset(fx, fy, v ? mixHex(v[0] === '#' ? v : '#ffffff', '#a8f8ff', v === INK ? 0.55 : 0.5) : '#c8faff');
    }
    for (let i = -2; i <= 2; i++) thin(g, [[cx - rx * 0.86, cy + i * ry * 0.34 - 1], [cx + rx * 0.86, cy + i * ry * 0.34 + 1]].map(([x, y]) => [x, y]), '#e8feff', 0.2);
    piece(g, t => { t.ell(cx, cy, rx, ry, GLOW); t.ell(cx, cy, rx - 0.7, ry - 0.7, null); });
    g.dots([[cx - rx * 0.5, cy - ry * 0.6], [cx - rx * 0.5, cy - ry * 0.6 + 0.5], [cx - rx * 0.4, cy - ry * 0.68]], W);
    handOver(g, G, 1);
    return G;
  };

  // ---------------- Brickhead: a big chunky brick on the head ----------------
  const BRICK = R3('#ec9a7a', 0.18);
  ZA.brickhead = (g, P) => zombie(g, P, {
    s: 0.9, head: 'wide', hair: false, note: 'hat', noteAfterHat: true, hatNote: G => [G.hx - 4 * G.S, Math.max(0.6, G.top - 2.6 * G.S) + 4.8 * G.S, -0.12, 0.8],
    hat(g, G) {
      const { hx, top, S } = G, x0 = hx - 8.4 * S, y0 = Math.max(0.6, top - 2.6 * S), w = 16 * S, h = 7.6 * S, a = -0.05;
      const C = [x0 + w / 2, y0 + h / 2];
      piece(g, t => blob(t, [{ p: rot(rrect(x0, y0, w, h, 1.2 * S), C[0], C[1], a) }], BRICK, { d: [1.2, 1] }));
      // the brick's two holes on top and a crack
      for (const dx of [-3.6, 3.2]) piece(g, t => t.ell(C[0] + dx * S, y0 + 1.8 * S + dx * a * S, 1.6 * S, 0.8 * S, BRICK[2]));
      thin(g, [[C[0] + 4.4 * S, y0 + h - 0.6], [C[0] + 3.4 * S, y0 + h - 2.4 * S], [C[0] + 4.6 * S, y0 + h - 3.6 * S]], BRICK[2], 0.24);
      g.dots([[x0 + 1.4 * S, y0 + 3.4 * S], [x0 + 1.4 * S, y0 + 3.9 * S]], BRICK[0]);
    },
  });

  // ---------------- Zombie Chicken: a tiny speedy zombie chicken ----------------
  ZA.chicken = (g, P) => {
    const walk = !!P.walk, f = walk && P.frame ? 1 : 0, bob = walk ? (f ? -1 : 0) : (P.arms === 'up' ? -1 : 0), A0 = P.arms;
    const cx = 15.4, cy = 22.6 + bob, FEATH = ['#fbfcf6', '#eef2e4', '#c4ceb4'];
    // stick legs and three-toed feet
    for (const [lx, d] of [[13.6, walk ? (f ? 1.4 : -1) : 0], [17, walk ? (f ? -1.4 : 1) : 0]]) {
      piece(g, t => stroke(t, [[lx, cy + 4], [lx + d * 0.5, 29.6]], 0.42, 0.42, BEAKC[1]));
      piece(g, t => { t.ell(lx + d * 0.5 + 0.6, 30.3, 1.6, 0.7, flat(BEAKC)); });
    }
    // tail feathers
    piece(g, t => blob(t, [[cx - 6.4, cy - 3.6, 1.6, 2.6, -0.5], [cx - 7.4, cy - 1.6, 1.5, 2.3, -0.9], [cx - 7, cy + 0.6, 1.4, 2, -1.3]], FEATH, { hl: false }));
    // the comb
    piece(g, t => blob(t, [[cx - 0.6, cy - 7.4, 1.6, 1.6], [cx + 1.6, cy - 7.8, 1.6, 1.7], [cx + 3.6, cy - 7, 1.4, 1.5]], COMB, { hl: false }));
    // the big round body-head
    piece(g, t => blob(t, [[cx, cy - 0.6, 7.2, 6.8], [cx + 1.4, cy + 1.6, 6, 5]], FEATH, { hl: [cx - 3, cy - 4.4, 1.4, 0.8] }));
    // the wing (flaps up when cheering / on the walk)
    const wy = A0 === 'up' || f ? -1.6 : 0;
    piece(g, t => blob(t, [[cx - 2.2, cy + 2 + wy, 3.4, 2.2, A0 === 'up' || f ? -0.7 : -0.2]], FEATH, { hl: false }));
    // beak and wattle
    const bx = cx + 6.6, by = cy - 0.4, open = P.mouth === 'open' || P.mouth === 'o';
    piece(g, t => { t.poly([[bx - 0.6, by - 1.3], [bx + 3, by - 0.2], [bx - 0.6, by + 0.6]], BEAKC[1]); if (open) t.poly([[bx - 0.6, by + 0.8], [bx + 2.4, by + 1.4], [bx - 0.6, by + 2]], BEAKC[2]); });
    piece(g, t => t.ell(bx - 0.2, by + (open ? 2.8 : 2), 1, 1.3, flat(COMB)));
    // googly eyes, the sticky note and a little stitch
    A.chibiEyes(g, cx + 2.6, cy - 2, { white: true, sp: 4.6, w: 3.8, h: 4.2, look: [0.55, 0.2], mood: P.eyes });
    note(g, cx - 3.4, cy - 4.6, 0.72, -0.3);
    K.stitch(g, [cx - 5.6, cy + 1.4], [cx - 4, cy + 3.6], FEATH[2]);
    return { hx: cx, hy: cy };
  };

  // =====================================================================================================
  // THE NEWER ZOMBOSSES: { w: 48, h: 48, draw(g, f) }, round toy-like machines, Dr. Zomboss aboard
  // =====================================================================================================
  const { drZ, drZWindow, capLeg, rivets, dk2, STEEL } = K;
  const sparkle = (g, x, y, c) => g.dots([[x, y - 0.5], [x - 0.5, y], [x, y], [x + 0.5, y], [x, y + 0.5]], c || '#fffbe0');
  // a little cowboy hat for Dr. Zomboss (centred over his head at cx, cy, scale sc)
  function zHat(g, cx, cy, sc, R) {
    R = R || R3('#c49468');
    piece(g, t => blob(t, [[cx - 0.6 * sc, cy - 4.6 * sc, 3.2 * sc, 2.4 * sc]], R, { hl: false, mask: (x, y) => y < cy - 3.4 * sc }));
    piece(g, t => blob(t, [[cx - 0.4 * sc, cy - 3.4 * sc, 6 * sc, 1 * sc], [cx - 5.8 * sc, cy - 4 * sc, 0.9 * sc, 0.8 * sc], [cx + 5 * sc, cy - 4 * sc, 0.9 * sc, 0.8 * sc]], R, { hl: false }));
  }

  // ---------------- War Wagon: a covered robot wagon with googly eyes and flaming wheels ----------------
  const CANVAS = ['#ffffff', '#fbf4e2', '#e2d4b4'], FLAME = R3('#ffaa4a', 0.12), FLAME2 = R3('#ffe27a', 0.1);
  function flames(g, x, y, f) { // a trail of round flame puffs behind a wheel
    const P = f ? [[-7.6, 1.4, 2.6], [-10.6, -0.6, 2], [-12.8, 1.8, 1.4], [-6.4, -2.6, 1.8]] : [[-7.2, 0.6, 2.4], [-10, 2, 1.9], [-12.4, -0.4, 1.5], [-6.8, -3, 1.6]];
    piece(g, t => blob(t, P.map(([a, b, r]) => [x + a, y + b, r, r * 0.9]), FLAME, { hl: false }));
    piece(g, t => blob(t, P.slice(0, 2).map(([a, b, r]) => [x + a + 0.4, y + b + 0.3, r * 0.55, r * 0.5]), FLAME2, { hl: false }));
  }
  function wheel(g, x, y, r, f, R) {
    piece(g, t => blob(t, [[x, y, r, r]], R, { hl: false }));
    piece(g, t => t.ell(x, y, r - 1.3, r - 1.3, R[0]));
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4 + (f ? Math.PI / 8 : 0); thin(g, [[x - Math.cos(a) * (r - 1.4), y - Math.sin(a) * (r - 1.4)], [x + Math.cos(a) * (r - 1.4), y + Math.sin(a) * (r - 1.4)]], R[2], 0.36); }
    piece(g, t => t.ell(x, y, 1.4, 1.4, flat(STEEL)));
  }
  BA.warwagon = { w: 48, h: 48, draw(g, f) {
    const d = f ? 0.5 : 0, WAG = R3('#c99a6a');
    flames(g, 12.4, 38.4, f); flames(g, 31.6, 38.4, !f);
    wheel(g, 12.4, 37.4, 6.6, f, WOOD);
    // the canvas hood with ribs, and the wagon box
    piece(g, t => blob(t, [[20.4, 18 + d, 15.6, 10.6]], CANVAS, { mask: (x, y) => y < 25.4 + d, hl: [12, 10.6 + d, 2.6, 1.2] }));
    for (const x of [11, 17.4, 23.6]) thin(g, [[x, 9.6 + d + Math.abs(x - 20) * 0.12], [x - 0.6, 24.6 + d]], CANVAS[2], 0.26);
    piece(g, t => blob(t, [{ p: rrect(3.4, 24 + d, 35.6, 9.6, 2.6) }], WAG, { hl: false }));
    for (const y of [27.4, 30.6]) thin(g, [[4.6, y + d], [37.6, y + d]], WAG[2], 0.24);
    piece(g, t => t.poly(PX.starPts(20, 28.8 + d, 2.4, 1.1, 5), GOLD[1]));
    // googly eyes on the front of the hood and a big grin on the box
    A.chibiEyes(g, 28.6, 16.6 + d, { white: true, sp: 6.8, w: 5.2, h: 5.6, look: [0.6, 0.2], mood: 'brave' });
    // the driver's bench and Dr. Zomboss in a cowboy hat
    piece(g, t => blob(t, [{ p: rrect(36.4, 25.4 + d, 8.6, 3, 1.2) }], WAG, { hl: false }));
    drZ(g, 41, 20 + d, 0.92, { body: true });
    zHat(g, 41, 20 + d, 0.92);
    wheel(g, 31.6, 37.4, 6.6, !f, WOOD);
  } };

  // ---------------- Aerostatic Gondola: a stripy robot balloon with a basket and propellers ----------------
  const BALLOON = R3('#f2c88a', 0.16), BTEAL = R3('#8ad8cc', 0.16), WICKER = R3('#d4aa74');
  BA.gondola = { w: 48, h: 48, draw(g, f) {
    const d = f ? 0.6 : 0;
    // the dangling crate on its rope
    thin(g, [[22.4, 38 + d], [22.4, 41 + d]], '#8a7a84', 0.24);
    piece(g, t => blob(t, [{ p: rrect(19.2, 40.6 + d, 6.4, 5.4, 0.8) }], R3('#c49468'), { hl: false }));
    thin(g, [[19.8, 41.2 + d], [25, 45.4 + d]], R3('#c49468')[2], 0.22);
    // the balloon with stripes, a band and googly eyes
    piece(g, t => {
      blob(t, [[22.6, 14.6 + d, 15.6, 13], [22.6, 21 + d, 11, 8.4]], BALLOON, { hl: [14.4, 6.6 + d, 3, 1.4] });
      recol(t, BALLOON, (x, y) => Math.floor((x - 22.6) / 4.2 + 100) % 2 === 1, (x, y, v) => (v === BALLOON[2] ? BTEAL[2] : v === BALLOON[0] ? BTEAL[0] : BTEAL[1]));
      recol(t, BALLOON.concat(BTEAL), (x, y) => Math.abs(y - (22.6 + d)) < 0.7, '#e88a7a');
    });
    A.chibiEyes(g, 26, 13.6 + d, { white: true, sp: 7.6, w: 5.6, h: 6, look: [0.55, 0.3], mood: 'brave' });
    // ropes to the basket
    for (const [a, b] of [[14.4, 15.4], [19.6, 19.4], [25.6, 25.8], [30.8, 29.4]]) thin(g, [[a, 26 + d], [b, 31 + d]], '#8a7a84', 0.22);
    // propellers on arms at each side (they spin)
    for (const [x, dir] of [[7.4, -1], [37.6, 1]]) {
      piece(g, t => stroke(t, [[x - dir * 3.6, 34 + d], [x, 34 + d]], 0.5, 0.5, STEEL[2]));
      piece(g, t => f ? blob(t, [[x, 31.6 + d, 0.9, 2.4], [x, 36.4 + d, 0.9, 2.4]], STEEL, { hl: false }) : blob(t, [[x, 34 + d, 0.9, 1.2], [x + dir * 0.4, 34 + d, 0.5, 3.6]], STEEL, { hl: false }));
      piece(g, t => t.ell(x, 34 + d, 0.9, 0.9, flat(GOLD)));
    }
    // Dr. Zomboss peeking over the basket rim
    drZ(g, 22.4, 27.4 + d, 0.95, { body: true });
    piece(g, t => blob(t, [{ p: rrect(12.6, 30.6 + d, 19.6, 8.4, 1.8) }], WICKER, { hl: false }));
    for (let i = 1; i < 6; i++) thin(g, [[12.6 + i * 3.3, 31.4 + d], [12.6 + i * 3.3, 38.2 + d]], WICKER[2], 0.2);
    thin(g, [[13.4, 34.8 + d], [31.4, 34.8 + d]], WICKER[2], 0.2);
    piece(g, t => t.poly(rrect(12, 30 + d, 20.8, 1.8, 0.9), WICKER[0]));
  } };

  // ---------------- Sharktronic Sub: a chubby robot shark submarine with a big toothy grin ----------------
  const SHARK = R3('#9cb8dc', 0.18), SBELLY = ['#ffffff', '#f4f8fc', '#d4dcea'], WAVE = R3('#9ad8f4', 0.14);
  BA.sharktronic = { w: 48, h: 48, draw(g, f) {
    const d = f ? 0.6 : 0, op = f ? 1 : 0;
    // tail and dorsal fin behind
    piece(g, t => blob(t, [{ p: [[9, 25 + d], [1.6, 15 + d], [4.4, 26 + d], [1.2, 37 + d], [9.6, 31 + d]] }], SHARK, { hl: false }));
    piece(g, t => blob(t, [{ p: [[15, 19 + d], [21.6, 7.6 + d], [24, 8.4 + d], [26, 19 + d]] }], SHARK, { hl: false }));
    // the periscope
    piece(g, t => t.poly(rrect(28.4, 8.6 + d, 1.6, 10, 0.6), STEEL[2]));
    piece(g, t => blob(t, [{ p: rrect(28.4, 7.2 + d, 4.6, 2.4, 1) }], STEEL, { hl: false }));
    piece(g, t => t.ell(33, 8.4 + d, 0.8, 1, '#a8e4ff'));
    // the big round body with a white belly
    piece(g, t => {
      blob(t, [[22, 28 + d, 15.6, 10.6], [33.4, 27.4 + d, 11, 9.6]], SHARK, { hl: [14, 20.6 + d, 3, 1.3] });
      recol(t, SHARK, (x, y) => y > 30.6 + d + (x - 30) * -0.04 && x > 13, (x, y, v) => (v === SHARK[2] ? SBELLY[2] : SBELLY[1]));
    });
    // gill lines, a pectoral fin, rivets
    for (const x of [26, 27.8]) thin(g, [[x, 25 + d], [x - 0.6, 29 + d]], SHARK[2], 0.26);
    piece(g, t => blob(t, [[22, 34 + d, 4.2, 2, 0.5]], SHARK, { hl: false }));
    rivets(g, [[9.6, 28 + d], [11.4, 33 + d], [30, 20 + d]], '#7a8ab0');
    // the porthole with Dr. Zomboss
    drZWindow(g, 16.6, 26.4 + d, 4.6, 4.2, 16.6, 26.8 + d, 0.82);
    // the mouth: a toothy grin that opens wide on frame 1
    const mx = 40.6, my = 30 + d;
    piece(g, t => blob(t, [{ p: [[mx - 9, my - 1 - op * 0.6], [mx + 4.6, my - 2.2 - op], [mx + 4.4, my + 1.6 + op * 2], [mx - 8, my + 1 + op]] }], ['#7a4a5a', '#7a4a5a', '#5a3242'], { hl: false }));
    for (let i = 0; i < 5; i++) { const x = mx - 7.4 + i * 2.6; piece(g, t => t.poly([[x - 1, my - 1.4 - op * 0.6 + i * -0.2], [x + 1, my - 1.5 - op * 0.6 + i * -0.2], [x, my + 0.2 - op * 0.4]], '#fffdf6')); }
    if (op) piece(g, t => blob(t, [[mx - 2, my + 2.2, 2.6, 0.9]], R3('#ff9aa8'), { hl: false }));
    // googly eyes
    A.chibiEyes(g, 35.6, 21.4 + d, { white: true, sp: 6.2, w: 4.6, h: 5, look: [0.6, 0.2], mood: 'brave' });
    // the sea: a wavy band of water with foam along the bottom
    const wv = f ? Math.PI / 3 : 0, sh = [];
    for (let i = 0; i < 9; i++) sh.push([i * 6, 40.6 + Math.sin(i * 1.3 + wv) * 0.6, 3.8, 2]);
    sh.push({ p: [[0, 41], [48, 41], [48, 48], [0, 48]] });
    piece(g, t => blob(t, sh, WAVE, { hl: false, d: [0.5, 0.5] }));
    for (const [x, y] of (f ? [[6, 41.6], [19, 42.2], [33, 41.4], [44, 42]] : [[3, 42], [14, 41.4], [28, 42.2], [40, 41.6]])) g.dots([[x, y], [x + 0.5, y], [x + 1, y], [x + 0.5, y - 0.5]], '#ffffff');
  } };

  // ---------------- Dinotronic Mechasaur: a chunky robot T-rex with a big head and tiny arms ----------------
  const DINO = R3('#8ccbb0', 0.18), PLATE = R3('#ffb47a', 0.16), DBELLY = R3('#e2f4ea');
  BA.mechasaur = { w: 48, h: 48, draw(g, f) {
    const d = f ? 0.5 : 0, roar = f ? 1 : 0;
    // the thick tail
    piece(g, t => blob(t, [{ p: [[12, 23 + d], [1, 19 + d], [1.6, 22 + d], [10, 33 + d]] }, [8, 26 + d, 5, 4.6]], dk2(DINO), { hl: false }));
    capLeg(g, 15.4, 33, 43.6, 3.2, dk2(DINO));
    // back plates
    piece(g, t => { for (const [x, y] of [[9.4, 21.4], [14, 18.4], [19, 17], [24, 17.6]]) t.ell(x, y + d, 2.2, 2.6, PLATE[1]); });
    // the body and its pale belly
    piece(g, t => blob(t, [[20.4, 28.6 + d, 12.4, 9.6]], DINO, { hl: false }));
    piece(g, t => blob(t, [[25.4, 31.4 + d, 6.6, 5.6]], DBELLY, { hl: false }));
    for (const y of [29.6, 32, 34.4]) thin(g, [[20.6, y + d], [30.6, y + d]], DBELLY[2], 0.2);
    capLeg(g, 27.4, 34, 43.6, 3.4, DINO);
    // the cockpit dome with Dr. Zomboss
    drZWindow(g, 16.6, 21.6 + d, 5, 4.6, 16.8, 22 + d * 1.6, 0.85);
    // the neck and the big blocky-round head with a jaw that opens to roar
    piece(g, t => stroke(t, [[28, 25 + d], [31.6, 18 + d]], 3.6, 3.4, DINO[1]));
    const hx = 35.4, hy = 13.4 + d;
    piece(g, t => blob(t, [[hx + 3.4, hy + 6 + roar * 1.4, 7.4, 2.6, roar * 0.18]], dk2(DINO), { hl: false })); // the lower jaw
    if (roar) piece(g, t => blob(t, [[hx + 4, hy + 4.4, 6.6, 1.8, 0.08]], ['#7a4a5a', '#7a4a5a', '#5a3242'], { hl: false }));
    for (let i = 0; i < 4; i++) piece(g, t => t.poly([[hx + 0.4 + i * 2.6, hy + 4.6 + roar * 1.4], [hx + 2 + i * 2.6, hy + 4.6 + roar * 1.4], [hx + 1.2 + i * 2.6, hy + 3.2 + roar * 1.4]], '#fffdf6'));
    piece(g, t => blob(t, [[hx, hy, 8.2, 6.6], [hx + 4.6, hy + 1.6, 6.4, 3.4]], DINO, { hl: [hx - 3.6, hy - 3.6, 1.6, 0.8] }));
    for (let i = 0; i < 4; i++) piece(g, t => t.poly([[hx + 1.4 + i * 2.6, hy + 4.2], [hx + 3 + i * 2.6, hy + 4.2], [hx + 2.2 + i * 2.6, hy + 5.6]], '#fffdf6'));
    g.dots([[hx + 10.2, hy], [hx + 10.2, hy + 0.5]], DINO[2]);
    A.chibiEyes(g, hx + 1.2, hy - 0.8, { white: true, sp: 5.4, w: 4, h: 4.4, look: [0.55, 0.2], mood: 'brave' });
    // a tiny arm
    piece(g, t => stroke(t, [[30.4, 26 + d], [33.4, 28 + d], [34.6, 27 + d]], 1.1, 0.9, DINO[1]));
    if (roar) for (const [a, b] of [[45.4, 12], [46.6, 16.4], [45, 21]]) thin(g, [[a, b + d], [a + 1.4, b + d - 0.4]], '#e8f6ff', 0.26);
  } };

  // ---------------- Multi-stage Masher: a robot stage with giant speakers, Dr. Zomboss on the decks ----------------
  const STAGE = R3('#c4a4f0', 0.18), SPKB = R3('#8a7ab0', 0.2), CONE2 = ['#5a4a72', '#4a3c60', '#3a2e4e'];
  BA.masher = { w: 48, h: 48, draw(g, f) {
    const pulse = f ? 0.5 : 0, N1 = f ? '#ff8ad8' : '#7af0ff', N2 = f ? '#7af0ff' : '#ffe27a';
    // little wheels and the stage platform with lights
    for (const x of [6, 18, 30, 42]) piece(g, t => t.ell(x, 44.4, 1.8, 1.8, flat(STEEL)));
    piece(g, t => blob(t, [{ p: rrect(1.6, 34.6, 44.8, 8.6, 2.4) }], STAGE, { hl: false }));
    for (let i = 0; i < 9; i++) piece(g, t => t.ell(5 + i * 4.75, 39.4, 0.8, 0.8, i % 2 ? N1 : N2));
    // Dr. Zomboss the DJ, behind his decks, with headphones
    drZ(g, 24, 18.4, 1.15, { body: true, mood: f ? 'happy' : 'brave' });
    piece(g, t => stroke(t, [[18.6, 17.8], [19.4, 12.4], [24.4, 10.4], [28.4, 12.6]], 0.6, 0.6, '#7a84a8'));
    piece(g, t => blob(t, [[19, 19, 1.8, 2.4]], R3(N1, 0.15), { hl: false }));
    // the DJ booth with two turntables and an equaliser screen
    piece(g, t => blob(t, [{ p: rrect(14.6, 24, 18.8, 10.8, 2) }], SPKB, { hl: false }));
    for (const x of [18.6, 29.4]) { piece(g, t => t.ell(x, 23.6, 3.2, 1.1, '#4a3c60')); piece(g, t => t.ell(x, 23.4, 0.7, 0.4, N2)); }
    piece(g, t => t.poly(rrect(16.8, 26.4, 14.4, 6.2, 1), '#3a3050'));
    const eq = f ? [3, 5, 2.4, 4.4, 3.4, 5.2] : [4.6, 2.6, 5, 3, 4.8, 2.2];
    eq.forEach((h, i) => piece(g, t => t.poly(rrect(18 + i * 2.1, 32 - h, 1.4, h, 0.4), i % 2 ? N1 : N2)));
    // the two giant speakers
    for (const x0 of [1.6, 34.4]) {
      piece(g, t => blob(t, [{ p: rrect(x0, 9.6, 12, 25.4, 2.6) }], SPKB, { hl: false }));
      const cx = x0 + 6;
      piece(g, t => t.ell(cx, 15.4, 2.6 + pulse * 0.6, 2.6 + pulse * 0.6, flat(CONE2)));
      piece(g, t => t.ell(cx, 15.4, 1, 1, SPKB[0]));
      piece(g, t => t.ell(cx, 26.6, 4.4 + pulse, 4.4 + pulse, flat(CONE2)));
      piece(g, t => t.ell(cx, 26.6, 1.8, 1.8, SPKB[1]));
      g.dots([[cx - 2.4, 24.4], [cx - 2, 24]], '#8a7ab0');
    }
    // music notes and sparkles
    const note8 = (x, y) => { piece(g, tt => tt.ell(x, y, 0.95, 0.75, N1)); thin(g, [[x + 0.75, y], [x + 0.75, y - 2.6], [x + 1.7, y - 1.9]], N1, 0.28); };
    if (f) { note8(15, 6.2); note8(31.4, 4.6); sparkle(g, 9, 4, '#fffbe0'); sparkle(g, 40, 3, '#fffbe0'); } else { note8(13.4, 4.4); note8(33, 6.4); sparkle(g, 6, 6.4, '#fffbe0'); sparkle(g, 43, 6, '#fffbe0'); }
  } };

  K.henHead = henHead;
})();
