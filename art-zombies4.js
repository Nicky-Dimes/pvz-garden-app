// art-zombies4.js — PVZ Garden: the sixth wave of zombies (16 more, from the PvZ 2 worlds) in the TRUE chibi style.
// Same contract and kit as art-zombies3.js: PX.ZOMBIE_ART[kind] = function (g, P, L) on a 32x32 grid facing right, feet on
// rows 29-31, built with PX.ZKIT (exported by art-zombies.js). Riders (dodo, plane, bug bot, mechanical bull) draw the zombie
// on its own grid and lay it over the mount a few pixels up (rider() / shiftMerge(), as in art-zombies3.js); 8-Bit is drawn by
// hand in chunky 2x2 art-pixel blocks; Disco-tron's laser beams are see-through rgba light, so the core's bold edge skips them.
(function () {
  'use strict';
  if (!window.PX || !PX.ZKIT) return;
  const { INK, stroke, Grid } = PX;
  const A = PX.art, mixHex = PX.mixHex;
  const K = PX.ZKIT;
  const { zombie, handOver, blob, recol, thin, rrect, zEyes, piece, flat, R3, SKIN, COAT, PANTS, SHOE, TIE, METAL, GOLD, WOOD, W } = K;
  const ZA = PX.ZOMBIE_ART;
  const FLAME = R3('#ffaa4a', 0.12), FLAME2 = R3('#ffe27a', 0.1);
  // a ramp a shade darker (the far leg, wing or arm)
  const dk = R => R.map(c => mixHex(c, '#4a3646', 0.15));
  const sparkle = (g, x, y, c) => g.dots([[x, y - 0.5], [x - 0.5, y], [x, y], [x + 0.5, y], [x, y + 0.5]], c || '#fffbe0');
  // a fluffy blob: an oval with a scalloped edge of little tufts between angles a0 and a1 (as the Yeti's)
  const fluff = (cx, cy, rx, ry, n, r, a0, a1) => { const sh = [[cx, cy, rx * 0.92, ry * 0.92]]; for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / (n - 1); sh.push([cx + Math.cos(a) * rx * 0.86, cy + Math.sin(a) * ry * 0.86, r, r]); } return sh; };

  // ---------------- riders: the zombie on its own grid, laid over the mount dx, dy art px away ----------------
  // (keep(x, y), in art px on g, can drop the rider's pixels where the mount covers them: the Bull Rider sits in front of its bull)
  function shiftMerge(g, t, dx, dy, keep) {
    const k = g.k || 1, ox = Math.round(dx * k), oy = Math.round(dy * k);
    for (let fy = 0; fy < t.fh; fy++) for (let fx = 0; fx < t.fw; fx++) {
      const v = t.a[fy * t.fw + fx]; if (v == null) continue;
      const x = fx + ox, y = fy + oy; if (x < 0 || y < 0 || x >= g.fw || y >= g.fh || (keep && !keep(x / k, y / k))) continue;
      g.a[y * g.fw + x] = v;
    }
  }
  function rider(g, P, o, dx, dy, keep) {
    const t = new Grid(g.w, g.h, g.k), G = zombie(t, P, o);
    shiftMerge(g, t, dx, dy, keep && ((x, y) => keep(x, y, G)));
    const sh = p => [p[0] + dx, p[1] + dy];
    return Object.assign({}, G, { hand: sh(G.hand), hand2: sh(G.hand2), hx: G.hx + dx, hy: G.hy + dy, top: G.top + dy, ex: G.ex + dx, ey: G.ey + dy, mx: G.mx + dx, my: G.my + dy });
  }
  // a hand (on a rim, a joystick...)
  const handAt = (g, p, s, R) => piece(g, t => t.ell(p[0], p[1], 1.7 * s, 1.6 * s, flat(R || SKIN)));
  // the art-zombies3 flame upside down (a rocket's): the round end at the top, the tip pointing down, swaying with the frame
  function flameDown(g, x, y, sc, f) {
    const sw = f ? 0.5 : -0.4, L = f ? 4.2 : 3.6;
    piece(g, t => blob(t, [[x, y, 1.55 * sc, 1.5 * sc], { p: [[x - 1.5 * sc, y + 0.3 * sc], [x + sw * sc, y + L * sc], [x + 1.5 * sc, y + 0.3 * sc]] }], FLAME, { hl: false, d: [0.5, 0.5] }));
    piece(g, t => blob(t, [[x, y - 0.1 * sc, 0.85 * sc, 0.8 * sc], { p: [[x - 0.8 * sc, y], [x + sw * 0.6 * sc, y + (L - 1.6) * sc], [x + 0.8 * sc, y]] }], FLAME2, { hl: false }));
  }
  // a little music note (an eighth note) at x, y
  const note8 = (g, x, y, c) => { piece(g, t => t.ell(x, y, 0.8, 0.65, c)); thin(g, [[x + 0.6, y], [x + 0.6, y - 2.2], [x + 1.4, y - 1.6]], c, 0.24); };

  // =====================================================================================================
  // FROSTBITE CAVES / JURASSIC MARSH
  // =====================================================================================================
  // ---------------- Troglobite: a shaggy caveman in a fur tunic, pushing a giant ice block ----------------
  const TPELT = R3('#c8966e'), THAIR = R3('#8a6a5e', 0.22), ICEB = ['#f6fdff', '#cdeefa', '#9fd2ea'], ICESIDE = '#b2dcf0', ICECRK = '#86b8d8';
  // a one-shoulder fur tunic with a zigzag hem and big spots (Troglobite and the Dodo Rider)
  function pelt(g, G, R) {
    const { X, U, s } = G, hem = [];
    for (let i = 0; i <= 8; i++) hem.push([X(21 - i * 1.4), U(27.4 + (i % 2) * 1.1)]);
    piece(g, t => {
      blob(t, [{ p: [[X(10), U(22)], [X(17.4), U(19.4)], [X(21), U(22.8)]].concat(hem) }], R, { hl: false });
      for (const [a, b] of [[12.4, 23.8], [16.4, 22.4], [14.6, 25.8], [18.8, 25]]) t.ell(X(a), U(b), 0.95 * s, 0.75 * s, mixHex(R[1], '#6a4a3a', 0.4), 0, (x, y) => t.filled(x, y));
    });
  }
  ZA.troglobite = (g, P) => zombie(g, Object.assign({}, P, { arms: P.arms || 'hold' }), {
    s: 0.9, dx: -4.4, head: 'pear', hair: false, sleeve: 'bare', shirt: false, coat: TPELT, pants: R3('#a8805e'), legs: 'short', shoe: R3('#b4cc9e'), body: 'pear',
    torso: (g, G) => pelt(g, G, TPELT),
    hat(g, G) { // a big shaggy mop of hair: spikes all round the crown and down the back, a jagged fringe above the eyes
      const { hx, hy, hrx, hry, ey, S } = G, sh = [];
      for (let i = 0; i < 7; i++) { const a = Math.PI * (0.92 + i * 0.155); sh.push({ p: [[hx + Math.cos(a - 0.19) * hrx * 0.84, hy + Math.sin(a - 0.19) * hry * 0.84], [hx + Math.cos(a) * hrx * 1.24, hy + Math.sin(a) * hry * 1.2], [hx + Math.cos(a + 0.19) * hrx * 0.84, hy + Math.sin(a + 0.19) * hry * 0.84]] }); }
      sh.push([hx - 0.6, hy - hry * 0.46, hrx * 0.92, hry * 0.54]);
      piece(g, t => blob(t, sh, THAIR, { mask: (x, y) => y < ey - 3.6 * S - (x - hx) * 0.05 || x < hx - hrx * 0.5, hl: [hx - hrx * 0.4, hy - hry * 0.86, 1.4, 0.6] }));
    },
    note: [-5.8, -1.8, -0.3, 0.85], noteAfterHat: true,
    front(g, G) { // the ice block: a chunky cube (as tall as it is wide, so it can't read as a glass of milk): a square front,
      // a pale top face leaning back, a deeper right side, a bright front-top edge, two frozen bubbles, one shine and a crack
      const x0 = 19.2, y0 = 21.6 + G.bob * 0.4, w = 9, y1 = 30.8, x1 = x0 + w, d = 2.2, dd = 2;
      piece(g, t => {
        t.poly([[x0 + 0.3, y0 + 0.2], [x0 + d, y0 - dd], [x1 + d, y0 - dd], [x1 + 0.2, y0 + 0.2]], ICEB[0]);
        t.poly([[x1 - 0.2, y0], [x1 + d, y0 - dd], [x1 + d, y1 - dd - 0.4], [x1 - 0.2, y1]], ICESIDE);
        blob(t, [{ p: rrect(x0, y0, w, y1 - y0, 0.8) }], ICEB, { hl: false, d: [0.6, 0.9] });
      });
      thin(g, [[x0 + 0.7, y0 + 0.35], [x1 - 0.3, y0 + 0.35]], W, 0.3);
      thin(g, [[x1 - 0.1, y0 + 0.6], [x1 - 0.1, y1 - 1]], ICEB[2], 0.24);
      for (const [a, b, r] of [[6.2, 3.4, 0.95], [3.8, 6, 0.6]]) { g.ell(x0 + a, y0 + b, r, r, ICEB[0]); g.dot(x0 + a - r * 0.4, y0 + b - r * 0.4, W); }
      thin(g, [[x0 + 1.3, y0 + 3.8], [x0 + 3.8, y0 + 1.5]], W, 0.32);
      thin(g, [[x1 - 1, y1 - 5], [x1 - 2.2, y1 - 3.9], [x1 - 1.8, y1 - 3.1], [x1 - 3, y1 - 2.2]], ICECRK, 0.24);
      handOver(g, G, 1); handOver(g, G, 2);
    },
  });

  // ---------------- Dodo Rider: a little caveman with a feather headband, riding a big, round, goofy dodo ----------------
  const DODO = R3('#a4b4d8', 0.2), DWING = R3('#8e9fc8', 0.2), DBELLY = ['#ffffff', '#eef2fa', '#cbd4e8'], DBEAK = R3('#f6d692', 0.2), DTIP = R3('#eaa86a', 0.2),
    DTAIL = ['#ffffff', '#fbfbf6', '#d8d8cc'], DFOOT = R3('#f6b25a', 0.2), LEAFB = R3('#8ccf7a'), FEATH = R3('#7cc8f0', 0.18);
  ZA.dodorider = (g, P) => {
    const f = P.walk && P.frame ? 1 : 0, d = f ? -1 : 0, cx = 13.2, cy = 22.4 + d, hx = cx + 10.4, hy = cy - 8.4;
    // stubby orange legs and three-toed feet (the front one lifts on the hop)
    for (const [lx, R, lift] of [[9.6, dk(DFOOT), 0], [16.2, DFOOT, f]]) {
      const fy = 30.2 - lift;
      piece(g, t => stroke(t, [[lx, cy + 4.6], [lx + 0.2, fy - 0.6]], 0.6, 0.55, R[1]));
      piece(g, t => { for (const a of [-1, 0, 1]) t.ell(lx + 0.9 + a * 0.95, fy + Math.abs(a) * 0.15, 0.75, 0.6, R[1]); });
    }
    // a curly white tail tuft
    piece(g, t => blob(t, [[cx - 9.4, cy - 3.2, 1.6, 2.4, -0.6], [cx - 10.2, cy - 1, 1.5, 2.1, -1], [cx - 9.8, cy + 1, 1.3, 1.8, -1.4]], DTAIL, { hl: false }));
    // the rider
    const G = rider(g, Object.assign({}, P, { walk: false, arms: P.arms || 'hold' }), {
      s: 0.7, dx: -4.4, legs: 'none', head: 'peanut', hair: false, sleeve: 'bare', shirt: false, coat: TPELT,
      torso: (g, G) => pelt(g, G, TPELT),
      hat(g, G) { // a leafy headband with a big pink feather stuck in at the back
        const { hx, hrx, ey, S } = G, y = ey - 4.4 * S;
        piece(g, t => blob(t, [[hx - hrx * 0.62, y - 3.2 * S, 1.2 * S, 3.4 * S, -0.4]], FEATH, { hl: false }));
        thin(g, [[hx - hrx * 0.5, y - 0.4], [hx - hrx * 0.74, y - 5.6 * S]], FEATH[2], 0.24);
        piece(g, t => blob(t, [{ p: [[hx - hrx * 1.02, y - 0.2], [hx + hrx * 0.9, y - 1.4], [hx + hrx * 0.94, y + 0.4], [hx - hrx * 1.02, y + 1.6]] }], LEAFB, { hl: false, mask: (x, yy) => g.filled(x, yy) }));
        for (const a of [-0.5, 0.1, 0.6]) g.dots([[hx + a * hrx, y - a * 0.7 + 0.2], [hx + a * hrx + 0.5, y - a * 0.7 + 0.2]], LEAFB[2]);
      },
      note: [-3, -6.6, -0.2, 0.85], noteAfterHat: true,
    }, 0, -8.4 + d);
    // the dodo: a big round body, a white bib, a short neck and a round head with a little tuft, all one shape
    piece(g, t => blob(t, [[hx - 1, hy - 3.9, 0.7, 1.5, -0.5], [hx + 0.4, hy - 4.3, 0.6, 1.4, 0.15]], DODO, { hl: false }));
    piece(g, t => {
      blob(t, [[cx, cy, 9.6, 6.6], [cx + 2.6, cy + 1.2, 8, 5.6], { p: [[cx + 4.4, cy - 4.4], [hx - 2.4, hy - 0.6], [hx + 1.4, hy + 2.2], [cx + 9.4, cy - 1.6]] }, [hx, hy, 4, 3.7]], DODO, { hl: [cx - 3.6, cy - 4.4, 1.8, 0.8], d: [1.3, 1.2] });
      recol(t, DODO, (x, y) => y > cy + 1.4 - (x - cx) * 0.3 && x > cx - 5, (x, y, v) => (v === DODO[2] ? DBELLY[2] : DBELLY[1]));
    });
    // the little wing (it flaps up on the hop)
    const wr = f ? -1.1 : -0.35, wy = f ? -1.2 : 0;
    piece(g, t => blob(t, [[cx - 2.6, cy + 0.6 + wy, 4, 2.4, wr], [cx - 5.6, cy + 1.4 + wy * 1.4, 1.6, 1.4, wr]], DWING, { hl: false }));
    // the rider's leg over its side: the pelt, a bare shin and foot
    const lx = G.hx;
    piece(g, t => stroke(t, [[lx - 0.6, cy - 5.4], [lx + 1.6, cy - 3.6]], 1.4, 1.3, TPELT[1]));
    piece(g, t => { stroke(t, [[lx + 1.6, cy - 3.6], [lx + 2.2, cy - 1.2]], 1, 0.95, SKIN[1]); t.ell(lx + 3, cy - 0.5, 1.6, 0.95, flat(R3('#b4cc9e')), 0.15); });
    // the big hooked beak, a goofy googly eye and a blush
    piece(g, t => blob(t, [[hx + 3.6, hy + 1, 3.2, 1.9, 0.15], [hx + 5.6, hy + 2.4, 1.3, 1.5, 0.3]], DBEAK, { hl: false }));
    recol(g, DBEAK, x => x > hx + 5, (x, y, v) => (v === DBEAK[2] ? DTIP[2] : DTIP[1]));
    thin(g, [[hx + 1.8, hy + 1.7], [hx + 4.8, hy + 2.1]], DBEAK[2], 0.24);
    g.dot(hx + 3.2, hy + 0.3, DBEAK[2]);
    A.chibiEyes(g, hx + 0.2, hy - 0.5, { white: true, one: true, sp: 0, w: 3, h: 3.4, look: [0.6, 0.3], mood: P.eyes === 'happy' || P.eyes === 'closed' ? P.eyes : null });
    g.ell(hx + 1.2, hy + 2.2, 1, 0.55, '#ffb3c2');
    // reins from the rider's hands to the beak
    if (G.pose === 'hold') { thin(g, [G.hand, [hx + 1.6, hy + 2.6]], '#9a6a4a', 0.28); handAt(g, G.hand2, G.s); handAt(g, G.hand, G.s); }
    return G;
  };

  // ---------------- Hunter Zombie: a fur trapper hat with ear flaps, a warm parka and a big snowball ----------------
  const PARKA = R3('#6cb6c8'), TFUR = ['#fffaf2', '#f2e4cc', '#d6c2a0'], THAT = R3('#a87c5c', 0.22), SNOW = ['#ffffff', '#f2f7fc', '#c6d8ea'], MITT = R3('#f2848a');
  ZA.snowhunter = (g, P) => zombie(g, P, {
    s: 0.94, head: 'wide', hair: false, coat: PARKA, sleeve: PARKA, shirt: false, pants: R3('#8a86a8'), shoe: R3('#9a7258'), handSkin: MITT,
    body(t, G) { const { X, U, s } = G; blob(t, [[X(15.2), U(24.3), 6 * s, 4.8 * s]], PARKA, { hl: false }); },
    mid0(g, G) { // a fluffy fur collar under the chin
      const { X, U, s } = G, sh = [];
      for (let i = 0; i < 6; i++) sh.push([X(11.2 + i * 1.6), U(19.9 + (i % 2) * 0.3), 1.3 * s, 1.1 * s]);
      piece(g, t => blob(t, sh, TFUR, { hl: false }));
    },
    torso(g, G) { // a zip, two toggles and a fur hem
      const { X, U, s } = G, sh = [];
      thin(g, [[X(15.6), U(20.6)], [X(15.6), U(27.2)]], PARKA[2], 0.3);
      for (const y of [22.4, 24.8]) piece(g, t => t.poly(rrect(X(16.2), U(y) - 0.4 * s, 1.8 * s, 0.8 * s, 0.35 * s), '#f2d8a0'));
      for (let i = 0; i < 7; i++) sh.push([X(10 + i * 1.75), U(28.1), 1.2 * s, 1 * s]);
      piece(g, t => blob(t, sh, TFUR, { hl: false }));
    },
    hat(g, G) { // the trapper hat: a fur ear flap down the side, a brown crown, a fluffy fur brim turned up across the brow
      const { hx, hy, hrx, hry, ex, ey, S } = G, brow = ey - 4.2 * S, fx = hx - 6.6 * S;
      piece(g, t => blob(t, [[fx, ey + 0.4 * S, 2.5 * S, 4 * S]], TFUR, { hl: false }));
      thin(g, [[fx + 0.2, ey + 4.3 * S], [fx - 0.4, ey + 6 * S]], THAT[2], 0.26);
      piece(g, t => blob(t, [[hx - 0.3, hy - 0.8, hrx + 0.6, hry + 0.3]], THAT, { mask: (x, y) => y < brow - (x - hx) * 0.04, hl: [hx - hrx * 0.4, hy - hry * 0.74, 1.6, 0.7] }));
      const sh = [{ p: [[hx - hrx * 0.7, brow - 1.4 * S], [hx + hrx + 0.8, brow - 2 * S], [hx + hrx + 1, brow + 0.6], [hx - hrx * 0.7, brow + 1]] }];
      for (let i = 0; i < 6; i++) sh.push([hx - hrx * 0.62 + i * 3.4 * S, brow - 1.6 * S - i * 0.1 * S, 1.6 * S, 1.3 * S]);
      piece(g, t => blob(t, sh, TFUR, { hl: false }));
      void ex;
    },
    note: [-3.4, -7.2, -0.2, 0.8], noteAfterHat: true,
    front(g, G) { // the snowball in the mitten, held up (kept clear of the eyes)
      const [hx, hy] = G.hand, S = G.S, r = 3.4;
      let bx = hx + 1.2; const by = hy - 2.2;
      if (by - r < G.ey + 2.8 * S && by + r > G.ey - 2.8 * S) bx = Math.max(bx, G.ex + 6.2 * S + r - 0.1);
      bx = Math.min(31.2 - r, bx);
      piece(g, t => blob(t, [[bx, by, r, r * 0.96]], SNOW, { hl: [bx - 1.3, by - 1.4, 1, 0.6] }));
      g.dots([[bx + 1.2, by + 1.3], [bx + 1.7, by + 0.6], [bx - 0.4, by + 2]], SNOW[2]);
      handOver(g, G, 1);
    },
  });

  // ---------------- Weasel Hoarder: a big fluffy fur coat, a fur hat, and a little cage of ice weasels ----------------
  const WCOAT = ['#f8e8d4', '#dfc29e', '#bc9a74'], WFUR = ['#ffffff', '#f6f4fa', '#d4d2e2'], WVEL = R3('#b48ae0'), CAGEC = R3('#e8c070', 0.2), WEAS = ['#f4fbff', '#cfe8fa', '#9cc4e4'];
  // a little ice weasel's face (pale blue-white, round ears, two glossy dots, a pink nose, a blue forehead stripe), facing right
  function weasel(g, x, y, sc) {
    piece(g, t => blob(t, [[x, y, 2.2 * sc, 1.9 * sc], [x - 1.4 * sc, y - 1.6 * sc, 0.8 * sc, 0.8 * sc], [x + 1.1 * sc, y - 1.7 * sc, 0.8 * sc, 0.8 * sc], [x + 1.7 * sc, y + 0.5 * sc, 1.1 * sc, 0.85 * sc]], WEAS, { hl: false }));
    thin(g, [[x - 0.2 * sc, y - 1.8 * sc], [x, y - 0.8 * sc]], '#78a8d8', 0.3);
    for (const ex of [x - 0.5 * sc, x + 1 * sc]) { g.ell(ex, y - 0.1 * sc, 0.5 * sc, 0.6 * sc, A.EYE_INK); g.dot(ex - 0.2 * sc, y - 0.4 * sc, W); }
    g.ell(x + 2.35 * sc, y + 0.3 * sc, 0.45 * sc, 0.4 * sc, '#ff8ab0');
    g.ell(x - 0.6 * sc, y + 0.9 * sc, 0.6 * sc, 0.35 * sc, '#ffb3c2');
  }
  ZA.weaselhoarder = (g, P) => zombie(g, P, {
    s: 0.94, head: 'egg', hair: false, holdArms: true, coat: WCOAT, sleeve: WCOAT, shirt: false, pants: R3('#8a86a8'), shoe: R3('#7a6a6e'), armR: 1.7,
    body(t, G) { const { X, U, s } = G; blob(t, fluff(X(15.2), U(24.4), 6.4 * s, 5 * s, 9, 1.7, Math.PI * 0.05, Math.PI * 0.95), WCOAT, { hl: false }); },
    mid0(g, G) { const { X, U, s } = G; piece(g, t => blob(t, fluff(X(15.2), U(20.2), 5.4 * s, 1.6 * s, 7, 1.3, Math.PI, Math.PI * 2), WFUR, { hl: false })); },
    hat(g, G) { // a round Russian fur hat: a tall lilac velvet dome with a seam, on a fluffy white band that curves round the head
      // (scalloped top and bottom, a little wider than the head) so it reads as fur, not a flat box or bandage
      const { hx, top, S } = G, cx = hx - 0.6 * S, by = top + 4.2 * S, bw = 8.6 * S, sag = 0.5 * S;
      const yb = x => by - sag * ((x - cx) / bw) ** 2;
      piece(g, t => blob(t, [[cx, by - 0.6 * S, 7.4 * S, 5 * S]], WVEL, { mask: (x, y) => y < by, hl: [cx - 2.8 * S, by - 4 * S, 1.5, 0.6] }));
      thin(g, [[cx + 0.6 * S, by - 5.4 * S], [cx + 1.6 * S, by - 3.6 * S], [cx + 1.9 * S, by - 1.6 * S]], WVEL[2], 0.24);
      const n = 8, up = [], dn = [], sh = [];
      for (let i = 0; i <= n; i++) { const x = cx - bw + i * 2 * bw / n; up.push([x, yb(x) - 0.8 * S]); dn.unshift([x, yb(x) + 0.8 * S]); }
      sh.push({ p: up.concat(dn) });
      for (let i = 0; i <= n; i++) { const x = cx - bw + i * 2 * bw / n, x2 = x + bw / n; sh.push([x, yb(x) - 0.9 * S, 1.05 * S, 0.85 * S]); if (i < n) sh.push([x2, yb(x2) + 0.9 * S, 1 * S, 0.8 * S]); }
      piece(g, t => blob(t, sh, WFUR, { hl: false, d: [0.6, 0.6] }));
    },
    note: [-5.2, -1.6, -0.25, 0.85], noteAfterHat: true,
    front(g, G) { // the cage, low in both hands (the back hand on its ring), or hanging by a handle from the front hand when the
      // arms move: a weasel popping out of the top at the front-right (kept clear of the zombie's face), another peeking
      // through the bars, a gold frame
      const s = G.s, f = G.P.frame ? 1 : 0, w = 9.8 * s, h = 8 * s, two = G.pose === 'hold';
      const x0 = two ? G.hand2[0] - 2.2 * s : Math.min(30.4 - w, G.hand[0] - w * 0.24), y0 = Math.min(31 - h, two ? G.hand[1] + 0.1 : Math.max(23.2, G.hand[1] + 1.4));
      const rx = x0 + w * 0.24, ry = y0 - 1.4, ring = () => piece(g, t => { t.ell(rx, ry, 1.2, 1.2, CAGEC[1]); t.ell(rx, ry, 0.5, 0.5, null); });
      if (two) ring();
      piece(g, t => blob(t, [{ p: rrect(x0, y0, w, h, 1) }], CAGEC, { hl: false }));
      piece(g, t => t.poly(rrect(x0 + 0.9, y0 + 1, w - 1.8, h - 2, 0.5), '#6e6488'));
      weasel(g, x0 + w * 0.42, y0 + h * 0.56, 1.05);
      for (let x = x0 + 2.1; x < x0 + w - 1; x += 1.9) thin(g, [[x, y0 + 0.9], [x, y0 + h - 0.9]], CAGEC[1], 0.32);
      if (two) { handOver(g, G, 1); handOver(g, G, 2); }
      // the popping weasel goes on after the hands (so a hand never hides its face), cut off at the cage's top bar; it ducks a
      // little on the frame the cage swings up, so it never rises into the zombie's face, and its nose stays inside the canvas
      const t = new Grid(g.w, g.h, g.k);
      weasel(t, Math.min(x0 + w * 0.56, 26.1), y0 - 1.4 + f * 0.4, 1.55);
      shiftMerge(g, t, 0, 0, (x, y) => y < y0 - 0.5);
      // hanging: the handle wire from the hand runs down in front of the popping weasel to the ring
      if (!two) { if (ry - G.hand[1] > 1.2) thin(g, [[G.hand[0], G.hand[1]], [rx, ry - 1]], CAGEC[2], 0.3); ring(); handOver(g, G, 1); }
    },
  });

  // =====================================================================================================
  // LOST CITY
  // =====================================================================================================
  // ---------------- Lost Pilot: an aviator in a leather cap, goggles and a flying scarf, in a tiny propeller plane ----------------
  const PLANE = R3('#ffd36e', 0.18), PWING = R3('#ffb84e', 0.18), PRED = R3('#f27c84', 0.18), LEATH = R3('#b8886a', 0.22), PSCARF = R3('#f27878'), PLENS = R3('#9ad8f8', 0.12), TYRE = R3('#857a94', 0.22);
  ZA.lostpilot = (g, P) => {
    const f = P.walk && P.frame ? 1 : 0, d = f ? -0.8 : 0, y0 = 19.4 + d;
    // the red tail fin with a star (behind the pilot)
    piece(g, t => blob(t, [{ p: [[1.4, y0 + 2.4], [1.8, y0 - 5.6], [3.8, y0 - 6.2], [7.4, y0 + 0.8]] }], PRED, { hl: false }));
    piece(g, t => t.poly(PX.starPts(3.4, y0 - 2.2, 1.4, 0.6, 5), '#fff4c0'));
    // the pilot
    const G = rider(g, Object.assign({}, P, { walk: false, arms: P.arms || 'hold' }), {
      s: 0.76, dx: -4, legs: 'none', head: 'round', hair: false, coat: LEATH, sleeve: LEATH, shirt: false,
      back(g, G) { // the scarf's long end flying out behind
        const { X, U, s } = G, w = f ? 0.8 : -0.3;
        piece(g, t => stroke(t, [[X(13), U(20)], [X(9), U(19) - w], [X(5), U(20.2) + w], [X(1.6), U(19) - w]], 1.15 * s, 0.75 * s, PSCARF[1]));
      },
      mid0(g, G) { const { X, U, s } = G; piece(g, t => blob(t, [[X(15.4), U(20.2), 5 * s, 1.8 * s]], PSCARF, { hl: false })); },
      hat(g, G) { // a leather flying cap over the crown, the back of the head and the ears; round goggles pushed up on it
        const { hx, hy, hrx, hry, ex, ey, S } = G, brow = ey - 3.6 * S, fx = ex - 3.3 * S - 5.6 * S;
        piece(g, t => blob(t, [[hx - 0.3, hy - 0.6, hrx + 0.5, hry + 0.2], [fx, ey + 1 * S, 2.4 * S, 3.8 * S]], LEATH, { mask: (x, y) => y < brow - (x - hx) * 0.06 || (x < fx + 2 * S && y < ey + 4.6 * S), hl: [hx - hrx * 0.4, hy - hry * 0.74, 1.4, 0.6] }));
        thin(g, [[hx - 1, hy - hry - 0.2], [hx + 0.4, brow - 0.4]], LEATH[2], 0.26);
        g.dots([[fx, ey + 2.6 * S], [fx + 0.5, ey + 2.6 * S]], GOLD[1]);
        const gy = brow - 1.6 * S;
        piece(g, t => stroke(t, [[hx - hrx * 1.02, gy + 0.8], [hx + hrx * 0.9, gy - 0.3]], 0.6, 0.6, '#7a6a6e'));
        for (const dx of [0.6, 5.2]) piece(g, t => { t.ell(hx + dx * S, gy - dx * 0.06, 2.1 * S, 1.9 * S, METAL[2]); t.ell(hx + dx * S, gy - dx * 0.06, 1.4 * S, 1.3 * S, PLENS[1]); });
        for (const dx of [0.6, 5.2]) g.dots([[hx + dx * S - 0.6, gy - 0.7], [hx + dx * S - 0.1, gy - 1]], W);
      },
      note: [-6.6, -3.8, -0.3, 0.75], noteAfterHat: true,
    }, 0, -6.8 + d);
    // the fuselage: a chubby body tapering to the tail, a red stripe, a red nose cowl, a leather cockpit rim
    piece(g, t => {
      blob(t, [{ p: [[2.2, y0 + 1.2], [6, y0 - 0.2], [22, y0 - 0.6], [25.4, y0 + 0.4], [27.4, y0 + 2.6], [27.4, y0 + 5.4], [25, y0 + 7.4], [9, y0 + 7], [2.6, y0 + 4]] }], PLANE, { hl: false, d: [0.9, 1] });
      recol(t, PLANE, (x, y) => Math.abs(y - (y0 + 2.6 + (x - 14) * 0.03)) < 0.55 && x < 24.6, (x, y, v) => (v === PLANE[2] ? PRED[2] : PRED[1]));
    });
    piece(g, t => blob(t, [[26.6, y0 + 3.6, 2.4, 3.7]], PRED, { hl: false }));
    piece(g, t => t.poly(rrect(7.4, y0 - 0.9, 10.6, 1.5, 0.7), LEATH[1]));
    // the propeller: up-and-down blades, or a spinning blur on the other frame, round a red spinner
    const px = 29.4, py = y0 + 3.6;
    if (f) piece(g, t => t.ell(px + 0.5, py, 1, 5.4, ['#ffffff', '#eef2f8', '#cfd6e2']));
    else piece(g, t => { t.ell(px + 0.5, py - 3, 0.8, 2.8, flat(METAL)); t.ell(px + 0.5, py + 3, 0.8, 2.8, flat(METAL)); });
    piece(g, t => blob(t, [[px, py, 1.4, 1.3], { p: [[px, py - 1.3], [px + 1.9, py], [px, py + 1.3]] }], PRED, { hl: false }));
    // the wing across the middle (a deeper yellow), wheels on little struts
    piece(g, t => blob(t, [[13.6, y0 + 4.8, 8.4, 1.9, 0.04]], PWING, { hl: [9, y0 + 4.2, 2, 0.5] }));
    for (const x of [10.4, 19.4]) {
      piece(g, t => stroke(t, [[x + 0.6, y0 + 6.6], [x, y0 + 9.4]], 0.4, 0.4, METAL[2]));
      piece(g, t => blob(t, [[x, y0 + 9.8, 1.8, 1.8]], TYRE, { hl: false }));
      piece(g, t => t.ell(x, y0 + 9.8, 0.7, 0.7, METAL[1]));
    }
    // the pilot's hands on the rim
    if (G.pose === 'hold') { handAt(g, [G.hand2[0] - 0.4, y0 - 0.3], G.s, dk(SKIN)); handAt(g, [G.hand[0] + 0.2, y0 - 0.2], G.s); }
    return G;
  };

  // ---------------- Turquoise Skull: a sparkly turquoise jewel skull mask from the Lost City, trimmed in gold ----------------
  const TURQ = R3('#5ccfc6', 0.2), TSOCK = '#e8fbf6', THOLE = '#285660';
  ZA.turquoiseskull = (g, P) => zombie(g, P, {
    s: 0.96, head: 'round', hair: false, face: false, tie: GOLD,
    hat(g, G) {
      const { hx, hy, hrx, hry, ex, ey, mx, my, S } = G, sp = 7.8 * S, Pz = G.P;
      // the mask: a turquoise skull a little bigger than the head, a narrower jaw at the front, mosaic cracks on the crown
      piece(g, t => blob(t, [[hx - 0.2, hy - 0.6, hrx + 0.6, hry * 0.92], [hx + 2 * S, hy + hry * 0.46, hrx * 0.66, hry * 0.56]], TURQ, { hl: [hx - hrx * 0.5, hy - hry * 0.62, 1.8, 0.9], d: [hrx * 0.12, hry * 0.12] }));
      for (const pts of [[[-6.4, -4], [-4.8, -3], [-5, -1.4]], [[-2.4, -7.6], [-1.2, -6.2], [-2.4, -5]], [[-8, 1.4], [-6.4, 2.2], [-6.8, 3.8]]]) thin(g, pts.map(([a, b]) => [hx + a * S, hy + b * S]), TURQ[2], 0.24);
      // a gold trim round the jaw and gold dots on the cheekbones
      const jaw = [];
      for (let i = 0; i <= 10; i++) { const a = Math.PI * (0.12 + 0.76 * i / 10); jaw.push([hx + 2 * S + Math.cos(a) * hrx * 0.58, hy + hry * 0.46 + Math.sin(a) * hry * 0.47]); }
      thin(g, jaw, GOLD[1], 0.42);
      for (const [a, b] of [[-5.6, 4.7], [7.4, 3.6]]) piece(g, t => t.ell(ex + a * S, ey + b * S, 0.75 * S, 0.75 * S, flat(GOLD)));
      // the eye sockets: solid dark holes about 1 px bigger than the googly eyes, flat-topped and a touch wider at the top (level,
      // never a scowl), with a turquoise bridge between, so the white eyes peek out of a skull instead of wearing round glasses.
      // The line moods (happy, closed, blink) keep a pale socket inside a dark rim so their ink lines still show
      const cx = ex - 0.4 * S, lines = Pz.eyes === 'happy' || Pz.eyes === 'closed' || Pz.eyes === 'blink';
      // one socket (o = -1 back, 1 front), shrunk by d all round: a level rounded top band over a round bottom
      const sock = (t, o, d, c) => { const x = cx + o * sp / 2; t.poly(rrect(Math.min(x - o * 3.25 * S, x + o * 3.85 * S) + d, ey - 3.9 * S + d, 7.1 * S - 2 * d, 3.7 * S, 1.8 * S - d), c); t.ell(x + o * 0.3 * S, ey + 0.3 * S, 3.4 * S - d, 3.55 * S - d, c); };
      piece(g, t => { for (const o of [-1, 1]) { sock(t, o, 0, THOLE); if (lines) sock(t, o, 0.8 * S, TSOCK); } });
      A.chibiEyes(g, cx, ey, { white: true, sp, w: 4.6 * S, h: 5 * S, look: [0.55, 0.25], mood: Pz.eyes });
      // an upside-down-heart nose hole in the V under the bridge, turquoise all round it (clear of the sockets and the teeth); a
      // row of teeth (they part when it opens its mouth)
      const nx = cx + 0.05 * S, ny = ey + 2.5 * S;
      piece(g, t => { t.poly([[nx - 1.25 * S, ny + 1.3 * S], [nx, ny], [nx + 1.25 * S, ny + 1.3 * S]], THOLE); t.ell(nx - 0.62 * S, ny + 1.35 * S, 0.66 * S, 0.62 * S, THOLE); t.ell(nx + 0.62 * S, ny + 1.35 * S, 0.66 * S, 0.62 * S, THOLE); });
      const open = Pz.mouth === 'open' || Pz.mouth === 'o' || Pz.mouth === 'grin', tw = 6.4 * S, tx = mx - tw / 2 - 0.4 * S, ty = my + (open ? 0.1 : 0.3) * S, th = open ? 3 : 1.9;
      if (open) {
        piece(g, t => t.poly(rrect(tx + 0.4, ty + 0.4, tw - 0.8, 2.6 * S, 0.8), '#3a2d34'));
        piece(g, t => t.poly(rrect(tx, ty - 0.2, tw, 1.2 * S, 0.4), '#fbfbf2'));
        piece(g, t => t.poly(rrect(tx + 0.6, ty + 2 * S, tw - 1.2, 1.1 * S, 0.4), '#fbfbf2'));
      } else {
        piece(g, t => t.poly(rrect(tx, ty, tw, 1.9 * S, 0.6 * S), '#fbfbf2'));
        thin(g, [[tx + 0.4, ty + 0.95 * S], [tx + tw - 0.4, ty + 0.95 * S]], '#c8d8d0', 0.22);
      }
      for (let i = 1; i < 5; i++) thin(g, [[tx + i * tw / 5, ty + 0.3], [tx + i * tw / 5, ty + th * S - 0.3]], '#c8d8d0', 0.22);
      // a gold jewel on the forehead
      const jx = hx + 1.6 * S, jy = hy - 5.6 * S;
      piece(g, t => t.poly([[jx, jy - 1.8 * S], [jx + 1.5 * S, jy], [jx, jy + 1.8 * S], [jx - 1.5 * S, jy]], GOLD[1]));
      piece(g, t => t.ell(jx, jy, 0.75 * S, 0.9 * S, '#9af4ec'));
    },
    note: [-7.8, -4.2, -0.3, 0.85], noteAfterHat: true,
    post(g, G) { const { hx, hy, S } = G; for (const [a, b] of [[8.8, -6.8], [-9.2, -5.6], [9.8, 2.4]]) sparkle(g, hx + a * S, hy + b * S, W); },
  });

  // =====================================================================================================
  // FAR FUTURE
  // =====================================================================================================
  // ---------------- Bug Bot Imp: a tiny imp at the controls of a round robot bug with buzzing wings and antennae ----------------
  const BUGC = R3('#8ad8b6', 0.2), WINGB = ['#ffffff', '#e6f7ff', '#b8dcf0'], BLENS = R3('#8af0ff', 0.14);
  ZA.bugbotimp = (g, P) => {
    const f = P.walk && P.frame ? 1 : 0, d = f ? -1 : 0, cx = 14.6, cy = 22.2 + d, bx = cx + 9.4, by = cy + 0.8;
    // the buzzing wings, behind everything (raised on one frame, swept back on the other)
    for (const [ox, R] of [[-0.8, dk(WINGB)], [0.8, WINGB]]) {
      const a = f ? 0.3 : 0.9, wc = f ? [6.6 + ox, cy - 5.6] : [6.8 + ox, cy - 8.4];
      piece(g, t => blob(t, [[wc[0], wc[1], 4.8, 2.1, a]], R, { hl: false }));
      thin(g, [[wc[0] - Math.cos(a) * 3.4, wc[1] - Math.sin(a) * 3.4], [wc[0] + Math.cos(a) * 3, wc[1] + Math.sin(a) * 3]], R[2], 0.22);
    }
    // the imp pilot, poking out of a hatch on top
    const G = rider(g, Object.assign({}, P, { walk: false, mouth: P.mouth || 'grin', arms: P.arms || 'hold' }), {
      s: 0.62, hs: 1.14, dx: -2.2, head: 'wide', sleeve: 'bare', shirt: false, coat: R3('#f6f2e8'), legs: 'none',
      mid0(g, G) { const { hx, hy, hrx, hry } = G; piece(g, t => blob(t, [[hx - hrx * 0.96, hy + hry * 0.02, 1.5, 1.8]], G.SK, { hl: false })); },
    }, 0, -9.4 + d);
    // the shell: a round dome with a seam, three glowing studs and a metal belly band
    piece(g, t => {
      blob(t, [[cx, cy, 9.6, 6.4], [cx + 1, cy + 1.6, 9, 5]], BUGC, { hl: [cx - 3.6, cy - 4.2, 2, 0.9], d: [1.2, 1.1] });
      recol(t, BUGC, (x, y) => y > cy + 3.2 - (x - cx) * 0.06, (x, y, v) => (v === BUGC[2] ? METAL[2] : METAL[1]));
    });
    thin(g, [[cx - 6.6, cy - 4.4], [cx - 2, cy - 1.4], [cx + 3.4, cy - 1.8]], BUGC[2], 0.3);
    for (const [a, b, c] of [[-5.6, -0.4, '#ff9ab8'], [4.4, -3.6, '#ffe27a'], [-1, 1.2, f ? '#8af0ff' : '#ff9ab8']]) piece(g, t => t.ell(cx + a, cy + b, 0.9, 0.9, flat(R3(c))));
    // the hatch rim the imp sits in
    piece(g, t => { t.ell(G.hx - 0.4, cy - 5.6, 5, 1.3, METAL[1]); t.ell(G.hx - 0.4, cy - 5.9, 3.9, 0.6, '#5a6680'); });
    // little metal legs, dangling
    for (const a of [-5, -0.6, 3.8]) piece(g, t => { stroke(t, [[cx + a, cy + 5.4], [cx + a - 0.6, cy + 7.4]], 0.4, 0.4, METAL[2]); t.ell(cx + a - 0.5, cy + 7.9, 0.85, 0.75, flat(METAL)); });
    // the head: metal, a big lens eye, a smile and two antennae with glowing tips
    for (const [p1, p2, c] of [[[bx - 1, by - 3.2], [bx - 1.8, by - 7.2], f ? '#ffe27a' : '#ff9ab8'], [[bx + 1.2, by - 3.2], [bx + 3.2, by - 6.6], f ? '#ff9ab8' : '#ffe27a']]) {
      piece(g, t => stroke(t, [p1, [(p1[0] + p2[0]) / 2 + 0.6, (p1[1] + p2[1]) / 2], p2], 0.32, 0.32, METAL[2]));
      piece(g, t => t.ell(p2[0], p2[1], 1.1, 1.1, flat(R3(c))));
    }
    piece(g, t => blob(t, [[bx, by, 4, 3.8]], METAL, { hl: [bx - 1.6, by - 2, 1, 0.5] }));
    piece(g, t => t.ell(bx + 0.8, by - 0.5, 2.4, 2.5, flat(BLENS)));
    A.chibiEyes(g, bx + 0.8, by - 0.5, { white: true, one: true, sp: 0, w: 3, h: 3.2, look: [0.6, 0.2], mood: P.eyes === 'happy' || P.eyes === 'closed' ? P.eyes : null });
    thin(g, [[bx + 1.2, by + 2.4], [bx + 2.2, by + 2.8], [bx + 3.2, by + 2.2]], '#6a7488', 0.26);
    // the joystick in the imp's hands
    if (G.pose === 'hold') {
      const jx = G.hand[0] + 0.4;
      piece(g, t => stroke(t, [[jx, cy - 5], [jx + 0.3, G.hand[1] - 1.2]], 0.35, 0.35, METAL[2]));
      piece(g, t => t.ell(jx + 0.3, G.hand[1] - 1.6, 0.9, 0.9, flat(R3('#ff7a8a'))));
      handAt(g, G.hand2, G.s); handAt(g, G.hand, G.s);
    }
    return G;
  };

  // ---------------- Mecha-Football: a shiny robot football player, a football helmet and a little rocket on its back ----------------
  const CHROME = ['#f8fbff', '#cfd8e6', '#9eaac0'], MHELM = R3('#6e94e8', 0.18), MGLOW = R3('#8af0ff', 0.14), RKT = ['#ffffff', '#f6f6fa', '#cdd0dc'];
  ZA.mechafootball = (g, P) => zombie(g, P, {
    s: 0.96, head: 'round', hair: false, coat: CHROME, sleeve: CHROME, handSkin: CHROME, shirt: false, pants: R3('#aab6ca'), shoe: R3('#7a88a8'), armR: 1.7, handR: 1.9,
    back(g, G) { // the rocket on its back: a red nose, red fins, a round window, a flame puffing out underneath
      const { X, U, s } = G, x = X(6.4), y0 = U(13.6), y1 = U(25);
      flameDown(g, x, y1 + 0.6, 0.85, G.P.frame ? 1 : 0);
      for (const dir of [-1, 1]) piece(g, t => blob(t, [{ p: [[x + dir * 1.6 * s, y1 - 3.6 * s], [x + dir * 3.4 * s, y1 + 0.4], [x + dir * 1.4 * s, y1]] }], PRED, { hl: false }));
      piece(g, t => {
        blob(t, [{ p: [[x - 1.9 * s, y1], [x - 1.9 * s, y0 + 3 * s], [x, y0], [x + 1.9 * s, y0 + 3 * s], [x + 1.9 * s, y1]] }], RKT, { hl: false });
        recol(t, RKT, (xx, y) => y < y0 + 2.6 * s, (xx, y, v) => (v === RKT[2] ? PRED[2] : PRED[1]));
      });
      piece(g, t => { t.ell(x, y0 + 5.2 * s, 1.1 * s, 1.1 * s, METAL[2]); t.ell(x, y0 + 5.2 * s, 0.7 * s, 0.7 * s, MGLOW[1]); });
    },
    body(t, G) { const { X, U, s } = G; blob(t, [[X(15.2), U(24.4), 6 * s, 4.4 * s], [X(15.2), U(21.6), 7 * s, 2.4 * s]], CHROME, { hl: false }); },
    mid0(g, G) { // big round shoulder pads with rivets
      const { X, U, s } = G;
      piece(g, t => blob(t, [[X(13.4), U(20.6), 4.8 * s, 2.3 * s], [X(19.2), U(20.8), 3.4 * s, 2.2 * s]], CHROME, { hl: [X(11.6), U(19.7), 1.4, 0.5] }));
      g.dots([[X(10.2), U(21.2)], [X(12.6), U(22)], [X(20.6), U(21.6)]], CHROME[2]);
    },
    torso(g, G) { // a glowing power core and panel seams
      const { X, U, s } = G;
      thin(g, [[X(11), U(25.6)], [X(19.6), U(25.6)]], CHROME[2], 0.26);
      piece(g, t => t.ell(X(15.4), U(23.6), 1.5 * s, 1.5 * s, flat(MGLOW)));
      g.dot(X(15), U(23.1), W);
    },
    hat(g, G) { // a shiny blue football helmet: a glowing stripe, a glowing bolt, a chrome face guard
      const { hx, hy, hrx, hry, ex, ey, S, mx, my } = G, sp = 6.6 * S;
      const open = (x, y) => y > ey - 3.5 * S && x > ex - sp / 2 - 3.3 * S + Math.max(0, y - (ey + 2.5 * S)) * -0.6;
      piece(g, t => {
        blob(t, [[hx - 0.3, hy - 0.5, hrx + 0.9, hry + 0.6]], MHELM, { mask: (x, y) => !open(x, y), hl: [hx - hrx * 0.45, hy - hry * 0.7, 1.8, 0.8] });
        recol(t, MHELM, (x, y) => Math.abs(x - (hx - 1 + (y - (hy - hry)) * 0.25)) < 0.9 * S && y < ey - 3, (x, y, v) => (v === MHELM[2] ? MGLOW[2] : MGLOW[1]));
      });
      piece(g, t => t.ell(ex - sp / 2 - 4.6 * S, ey + 1.2 * S, 1.4 * S, 1.4 * S, flat(MGLOW)));
      g.dot(ex - sp / 2 - 5 * S, ey + 0.8 * S, W);
      const gx = mx + 3.4 * S;
      piece(g, t => stroke(t, [[mx - 3.8 * S, my - 1.8 * S], [gx - 0.6, my - 1.8 * S], [gx, my - 1.2 * S], [gx, my + 1.6 * S], [gx - 0.6, my + 2.3 * S], [mx - 2.2 * S, my + 2.4 * S]], 0.36, 0.36, '#8a96b0'));
    },
    note: 'hat', noteAfterHat: true, hatNote: G => [G.hx - 4.6 * G.S, G.hy - 5 * G.S, -0.3, 0.8],
  });

  // =====================================================================================================
  // NEON MIXTAPE TOUR
  // =====================================================================================================
  // ---------------- Breakdancer: a stripy tracksuit, a backwards cap and big white sneakers, striking a pose ----------------
  const TRACK = R3('#6ea8f0'), BCAP = R3('#ffaa5a', 0.2), KICKS = ['#ffffff', '#f8f8fc', '#d4d8e4'];
  ZA.breakdancer = (g, P) => zombie(g, P, {
    s: 0.94, head: 'egg', hair: false, defArms: 'point', coat: TRACK, sleeve: TRACK, shirt: false, pants: TRACK, shoe: KICKS,
    torso(g, G) { // a white tee peeking out of the zip, two white stripes down the jacket
      const { X, U } = G;
      piece(g, t => t.poly([[X(13.4), U(19.6)], [X(17.4), U(19.6)], [X(15.4), U(22.4)]], '#fbf6ee'));
      thin(g, [[X(15.4), U(22.2)], [X(15.4), U(27.8)]], TRACK[2], 0.3);
      for (const [a, b] of [[11.4, 11], [19.4, 19.8]]) thin(g, [[X(a), U(20.6)], [X(b), U(27.6)]], W, 0.34);
    },
    hat(g, G) { // the cap on backwards: a flat bill sticking straight out behind at the rim (a slab with a darker underside, not a
      // pointy bandana knot), a blue button on top, the strap's little arch of forehead just above the brow
      const { hx, hy, hrx, hry, ex, ey, S } = G, rim = ey - 4.4 * S, rl = x => rim - (x - hx) * 0.05, bx = hx - hrx - 3.9 * S, by = rl(hx - hrx) - 0.9 * S;
      piece(g, t => { t.poly(rrect(bx, by, 5.2 * S, 1.45 * S, 0.65 * S), BCAP[1]); t.poly(rrect(bx + 0.3 * S, by + 0.95 * S, 4.9 * S, 0.5 * S, 0.25 * S), BCAP[2]); });
      piece(g, t => blob(t, [[hx - 0.3, hy - 0.8, hrx + 0.5, hry + 0.1]], BCAP, { mask: (x, y) => y < rl(x), hl: [hx - hrx * 0.4, hy - hry * 0.72, 1.6, 0.7] }));
      piece(g, t => t.ell(hx - 0.6, hy - hry - 0.5, 1.1 * S, 0.8 * S, flat(TRACK)));
      const ax = ex + 0.6 * S, ay = rl(ax);
      piece(g, t => t.ell(ax, ay, 1.2 * S, 1.25 * S, G.SK[1], 0, Object.assign((x, y) => y < ay, { fine: true })));
      thin(g, [[ax - 1.1 * S, ay - 0.55 * S], [ax + 1.1 * S, ay - 0.55 * S]], BCAP[2], 0.28);
    },
    note: [-3.6, -6.2, -0.2, 0.8], noteAfterHat: true,
    post(g, G) { // white stripes down the front sleeve and the trouser legs
      const [a, b] = G.fa, L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, n = [(b[1] - a[1]) / L * 0.75, -(b[0] - a[0]) / L * 0.75];
      thin(g, [[a[0] + n[0], a[1] + n[1]], [b[0] + n[0] * 0.8, b[1] + n[1] * 0.8]], W, 0.3);
      const { X, Y, U, s, walk, f } = G, st = walk ? (f ? -1 : 2) : 0, lift = walk && f ? 0.8 : 0;
      for (const [x, l] of [[12.6 - st + 1.2, 0], [17.8 + st + 1.2, lift]]) if (g.filled(X(x), Y(28.4) - l)) thin(g, [[X(x), U(27.2) - l * 0.5], [X(x), Y(29.4) - l]], W, 0.28);
      void s;
    },
  });

  // ---------------- MC Zom-B: a rapper with a cap, big headphones round the neck, a gold chain and a microphone ----------------
  const HOODIE = R3('#a68ae8'), MCCAP = R3('#ff8aa8', 0.18), PHONES = R3('#7cd8e8', 0.18), MICG = R3('#6a7088', 0.2), PBAND = '#3e5a72';
  // a headphone ear cup: a darker rim, the teal shell, the pink cushion in the middle and a little shine
  const phoneCup = (g, x, y, r, R) => { piece(g, t => { t.ell(x, y, r, r, R[2]); t.ell(x - 0.2, y - 0.2, r - 0.6, r - 0.6, R[1]); t.ell(x - 0.05, y + 0.05, r * 0.42, r * 0.42, '#ff8ad0'); }); g.dots([[x - r * 0.55, y - r * 0.45], [x - r * 0.55 + 0.5, y - r * 0.55]], W); };
  ZA.mczomb = (g, P) => zombie(g, P, {
    s: 0.94, head: 'peanut', hair: false, coat: HOODIE, sleeve: HOODIE, shirt: false, pants: R3('#6c7aa8'), shoe: R3('#f4f4fa'),
    torso(g, G) { // the hoodie pocket, its strings and a big gold chain with a Z
      const { X, U, s } = G;
      piece(g, t => t.poly(rrect(X(12), U(25), 6.8 * s, 2.4 * s, 0.8 * s), HOODIE[2]));
      for (const x of [14, 16.8]) thin(g, [[X(x), U(20.4)], [X(x + 0.2), U(23)]], '#fbf6ee', 0.28);
      for (let i = 0; i <= 8; i++) { const a = Math.PI * (0.08 + 0.84 * i / 8); g.dots([[X(15.4) + Math.cos(a) * 3.6 * s, U(20.4) + Math.sin(a) * 3 * s], [X(15.4) + Math.cos(a) * 3.6 * s + 0.5, U(20.4) + Math.sin(a) * 3 * s]], GOLD[1]); }
      piece(g, t => blob(t, [[X(15.4), U(24), 1.6 * s, 1.5 * s]], GOLD, { hl: false }));
      thin(g, [[X(14.8), U(23.4)], [X(16), U(23.4)], [X(14.8), U(24.6)], [X(16), U(24.6)]], '#c8902a', 0.24);
    },
    hat(g, G) { // a cap with a flat peak and a gold sticker on it
      const { hx, hy, hrx, hry, ey, S } = G, rim = ey - 4.2 * S;
      piece(g, t => blob(t, [[hx - 0.3, hy - 0.8, hrx + 0.5, hry + 0.1]], MCCAP, { mask: (x, y) => y < rim - (x - hx) * 0.08, hl: [hx - hrx * 0.4, hy - hry * 0.72, 1.6, 0.7] }));
      const py = rim - (hrx * 0.6) * 0.08;
      piece(g, t => blob(t, [{ p: [[hx + hrx * 0.1, py - 1.4 * S], [hx + hrx + 3 * S, py - 1.9 * S], [hx + hrx + 3 * S, py - 0.6 * S], [hx + hrx * 0.1, py + 0.3]] }], MCCAP, { hl: false }));
      piece(g, t => t.ell(hx + hrx + 1.2 * S, py - 1.1 * S, 0.8 * S, 0.45 * S, GOLD[1]));
      piece(g, t => t.ell(hx - 0.6, hy - hry - 0.5, 1 * S, 0.7 * S, flat(MCCAP)));
    },
    note: [-4, -5.4, -0.25, 0.8], noteAfterHat: true,
    mid(g, G) { // big headphones resting round the neck: a dark band under the chin across the collar and the back ear cup
      // (the front cup is drawn in front(), over the arm, so the arm can never hide it)
      const { X, U, s } = G;
      piece(g, t => stroke(t, [[X(11.6), U(21.4)], [X(13.2), U(22.6)], [X(15.6), U(23)], [X(18), U(22.6)], [X(19.8), U(21.8)]], 0.72 * s, 0.72 * s, PBAND));
      phoneCup(g, X(11.2), U(20.8), 2.3 * s, dk(PHONES));
    },
    front(g, G) { // the front ear cup, then the microphone held up by the mouth (tipped forward when it cheers), music notes on the beat
      phoneCup(g, G.X(20.4), G.U(21.6), 2.4 * G.s, PHONES);
      const [hx, hy] = G.hand, up = hy < G.my, f = G.P.frame ? 1 : 0;
      const top = up ? [hx + 1.6, hy - 3.4] : [hx - 1.2, hy - 3.6];
      piece(g, t => stroke(t, [[hx + (up ? 0 : 0.2), hy + 1.6], top], 0.62, 0.8, MICG[1]));
      const mh = [top[0] + (up ? 0.4 : -0.2), top[1] - 1];
      piece(g, t => blob(t, [[mh[0], mh[1], 1.65, 1.6]], METAL, { hl: false }));
      thin(g, [[mh[0] - 1, mh[1] - 0.2], [mh[0] + 1.1, mh[1] - 0.2]], METAL[2], 0.2); thin(g, [[mh[0], mh[1] - 1.3], [mh[0], mh[1] + 1.2]], METAL[2], 0.2);
      g.dot(mh[0] - 0.7, mh[1] - 0.8, W);
      handOver(g, G, 1);
      note8(g, 29.6 - f * 0.6, 4.4 - f * 0.6, '#8a7ab8'); note8(g, 25.6 + f * 0.6, 3.6 + f * 0.4, '#e86aa8');
    },
  });

  // ---------------- 8-Bit Zombie: a blocky video-game zombie built from chunky 2x2-art-pixel blocks, square eyes and all ----------------
  const BITC = { G: SKIN[1], g: SKIN[0], d: SKIN[2], C: COAT[1], c: COAT[2], S: '#fbf6ee', T: TIE[1], B: PANTS[1], N: SHOE[1], P: K.NOTE, p: '#f4a3b8' };
  const BIT_HEAD = [
    '................',
    '.....gggGGG.....',
    '....ggGGGGGG....',
    '...gGGGGGGGGd...',
    '...GGGGGGGGGd...',
    '...GGGGGGGGGd...',
    '...GGGGGGGGGd...',
    '...GGGGGGGGGd...',
    '....dddddddd....',
  ];
  const BIT_BODY = [
    '.....CCSSCC.....',
    '....CCCSTCCC....',
    '....CCCCTCCc....',
    '.....cccccc.....',
  ];
  ZA.eightbit = (g, P) => {
    const walk = !!P.walk, f = walk && P.frame ? 1 : 0, oy = 1 - f, eyes = P.eyes, m = P.mouth;
    const pose = P.arms || 'fwd', armUp = pose === 'up' || pose === 'point' || (pose === 'paddle' && !P.frame), armOut = pose === 'out' || (pose === 'paddle' && P.frame);
    // draw a block map (each letter one 2x2-art-pixel block) at block row r0
    const blocks = (t, rows, r0) => rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch !== '.') t.rect(i * 2, (r0 + j) * 2 + oy, 2, 2, BITC[ch]); } });
    const B = (t, bx, by, w, h, c, dy) => t.rect(bx * 2, by * 2 + oy + (dy || 0), w * 2, h * 2, c);
    // the back arm only shows when both arms go up
    if (pose === 'up' || (pose === 'paddle' && !P.frame)) { piece(g, t => { B(t, 2, 7, 1, 2, BITC.c); B(t, 1, 6, 1, 1, BITC.c); }); piece(g, t => B(t, 1, 4, 1, 2, BITC.d)); }
    // legs and shoes: a stride, then passing (the body bobs up a pixel and the front foot lifts)
    const legs = walk ? (f ? [[6, 0], [9, -1]] : [[5, 0], [10, 0]]) : [[6, 0], [9, 0]];
    piece(g, t => { for (const [x, l] of legs) t.rect(x * 2, 26 + l, 2, 3, BITC.B); });
    piece(g, t => { for (const [x, l] of legs) t.rect(x * 2, 29 + l, 4, 2, BITC.N); });
    piece(g, t => blocks(t, BIT_BODY, 9));
    piece(g, t => blocks(t, BIT_HEAD, 0));
    // two hair strands and the sticky note (a pink square with a darker corner)
    g.rect(13, oy + 1, 1, 2, INK); g.rect(16, oy, 1, 3, INK); g.rect(17, oy, 1, 1, INK);
    piece(g, t => { B(t, 5, 2, 2, 2, BITC.P); t.rect(12, 6 + oy, 2, 2, BITC.p); });
    // tall square eyes (white with a square pupil) or their moods, drawn in single art pixels
    const ey = 8 + oy;
    for (const x0 of [12, 18]) {
      const L = (pts, c) => { for (const [a, b] of pts) g.rect(x0 + a, ey + b, 1, 1, c || INK); };
      if (eyes === 'happy') L([[0, 3], [1, 2], [2, 2], [3, 3]]);
      else if (eyes === 'closed') L([[0, 2], [1, 3], [2, 3], [3, 2]]);
      else if (eyes === 'blink') g.rect(x0, ey + 3, 4, 1, INK);
      else if (eyes === 'sleepy') { piece(g, t => t.rect(x0, ey + 3, 4, 3, W)); g.rect(x0 + 2, ey + 3, 2, 2, A.EYE_INK); g.rect(x0, ey + 2, 4, 1, INK); }
      else { piece(g, t => t.rect(x0, ey, 4, 6, W)); g.rect(x0 + 2, ey + 2, 2, 3, A.EYE_INK); g.dot(x0 + 2, ey + 2, W); }
      const back = x0 === 12;
      if (eyes === 'brave' || eyes === 'mad') { L(back ? [[0, -2], [1, -2], [2, -1], [3, -1]] : [[0, -1], [1, -1], [2, -2], [3, -2]]); if (eyes === 'mad') L(back ? [[2, -2], [3, -2]] : [[0, -2], [1, -2]]); }
      if (eyes === 'sad') L(back ? [[0, -1], [1, -1], [2, -2], [3, -2]] : [[0, -2], [1, -2], [2, -1], [3, -1]]);
    }
    // the mouth, in single pixels: a wobbly line with one tooth by default
    const my = 15 + oy;
    if (m === 'open') { g.rect(19, my - 1, 4, 3, INK); g.rect(20, my + 1, 2, 1, '#e8707e'); }
    else if (m === 'o') g.rect(20, my - 1, 2, 2, INK);
    else if (m === 'grin') { g.rect(18, my - 1, 6, 3, INK); g.rect(19, my, 4, 1, W); }
    else if (m === 'smile') { g.rect(18, my - 1, 1, 1, INK); g.rect(19, my, 4, 1, INK); g.rect(23, my - 1, 1, 1, INK); }
    else if (m === 'frown') { g.rect(18, my + 1, 1, 1, INK); g.rect(19, my, 4, 1, INK); g.rect(23, my + 1, 1, 1, INK); }
    else { g.rect(18, my, 6, 1, INK); if (m !== 'flat') g.rect(20, my + 1, 1, 1, W); }
    // the front arm: reaching forward (it swings a pixel on the walk), up high, or down and out
    if (armUp) { piece(g, t => { B(t, 13, 7, 1, 3, BITC.C); B(t, 14, 6, 1, 1, BITC.C); }); piece(g, t => B(t, 14, 4, 1, 2, BITC.G)); }
    else if (armOut) { piece(g, t => B(t, 11, 11, 2, 1, BITC.C)); piece(g, t => B(t, 13, 11, 1, 2, BITC.G)); }
    else { const sw = walk ? (f ? -1 : 1) : 0; piece(g, t => B(t, 11, 10, 3, 1, BITC.C, sw > 0 ? 0 : sw)); piece(g, t => B(t, 14, 9, 1, 2, BITC.G, sw)); }
    return { hx: 16, hy: 11 };
  };

  // =====================================================================================================
  // DARK AGES / WILD WEST / PIRATE SEAS
  // =====================================================================================================
  // ---------------- Zombie King: a big gold crown, a red royal cape trimmed with white fur, and a scepter ----------------
  const KCAPE = R3('#f2707e', 0.2), ERM = ['#ffffff', '#fdfdff', '#dcdfea'], KROBE = R3('#9a8ae8'), KVEL = R3('#e85a6e', 0.2);
  // ermine: little dark tail tips on the white fur
  const ermDots = (g, pts) => { for (const [x, y] of pts) if (ERM.includes(g.get(x, y))) g.dots([[x, y], [x, y + 0.5]], '#5a4a58'); };
  ZA.kingzombie = (g, P) => zombie(g, P, {
    s: 0.92, head: 'pear', hair: false, coat: KROBE, sleeve: KROBE, shirt: false, pants: R3('#8a7ac8'), shoe: GOLD,
    back(g, G) { // the cape, from the shoulders down to the ground behind (it swishes on the walk), with a white fur hem
      const { X, U, Y } = G, w = G.f ? 0.9 : 0;
      piece(g, t => {
        blob(t, [{ p: [[X(11.4), U(19.2)], [X(18), U(19.4)], [X(17.6), Y(29.6)], [X(12.6), Y(30.8)], [X(3.4) - w, Y(30.6)], [X(5.2) - w * 0.5, U(25)], [X(8.4), U(21)]] }], KCAPE, { hl: false });
        recol(t, KCAPE, (x, y) => y > Y(28.9) + (x - X(10)) * 0.04, (x, y, v) => (v === KCAPE[2] ? ERM[2] : ERM[1]));
      });
      ermDots(g, [[X(5.4), Y(29.8)], [X(8.4), Y(29.9)], [X(11.4), Y(30.1)]]);
    },
    mid0(g, G) { // a fluffy ermine collar over the shoulders
      const { X, U, s } = G;
      piece(g, t => blob(t, [[X(11.6), U(20.2), 2.6 * s, 1.6 * s], [X(15.2), U(20.8), 3 * s, 1.6 * s], [X(18.8), U(20.4), 2.4 * s, 1.5 * s]], ERM, { hl: false }));
      ermDots(g, [[X(11), U(20.6)], [X(14.6), U(21.2)], [X(18.2), U(20.8)]]);
    },
    torso(g, G) { // a gold belt with a red jewel buckle and two gold buttons
      const { X, U, s } = G;
      piece(g, t => t.poly(rrect(X(9.8), U(25.4), 10.8 * s, 1.3 * s, 0.5), GOLD[1]));
      piece(g, t => t.ell(X(15.4), U(26), 1 * s, 0.9 * s, flat(R3('#f25a6a'))));
      g.dots([[X(15.4), U(22.6)], [X(15.9), U(22.6)], [X(15.4), U(24.2)], [X(15.9), U(24.2)]], GOLD[1]);
    },
    hat(g, G) { // the crown: red velvet inside, five gold points with pearl tips, a jewelled band
      const { hx, top, S } = G, cx = hx - 0.4 * S, b = top + 3.8 * S, w = 7.4 * S, h = 5.4 * S;
      piece(g, t => blob(t, [[cx, b - 2.6 * S, w * 0.86, 3.4 * S]], KVEL, { hl: false, mask: (x, y) => y < b - 1.6 * S }));
      const pts = [[cx - w, b]];
      for (let i = 0; i < 5; i++) { const x = cx - w + (i + 0.5) * (2 * w / 5); pts.push([x - w / 5 + 0.1, b - 2.2 * S], [x, b - h], [x + w / 5 - 0.1, b - 2.2 * S]); }
      pts.push([cx + w, b]);
      piece(g, t => blob(t, [{ p: pts }], GOLD, { hl: false, d: [0.6, 0.6] }));
      piece(g, t => blob(t, [{ p: rrect(cx - w - 0.6, b - 2.4 * S, 2 * w + 1.2, 2.6 * S, 0.8) }], GOLD, { hl: false }));
      for (const [a, c] of [[-0.55, '#7ca8f8'], [0, '#f25a6a'], [0.55, '#7cd88a']]) piece(g, t => t.ell(cx + a * w, b - 1.1 * S, 0.9 * S, 0.8 * S, c));
      for (let i = 0; i < 5; i++) piece(g, t => t.ell(cx - w + (i + 0.5) * (2 * w / 5), b - h - 0.2, 0.8 * S, 0.8 * S, flat(ERM)));
      g.dots([[cx - w + 1, b - 2 * S], [cx - w + 1.5, b - 2 * S]], W);
    },
    note: [-5.8, -1.6, -0.3, 0.85], noteAfterHat: true,
    front(g, G) { // the scepter: a gold rod, a round red jewel on top and a little gold cross
      const [hx, hy] = G.hand, x = hx + 0.3, top = Math.max(4.6, hy - 9.4);
      piece(g, t => stroke(t, [[x - 0.2, Math.min(30.4, hy + 3.4)], [x + 0.2, top + 1.4]], 0.5, 0.5, GOLD[1]));
      piece(g, t => blob(t, [[x + 0.2, top, 1.9, 1.8]], GOLD, { hl: false }));
      piece(g, t => t.ell(x + 0.2, top + 0.1, 1.1, 1.1, flat(R3('#f25a6a'))));
      piece(g, t => { t.poly(rrect(x - 0.2, top - 3.6, 0.8, 2.2, 0.2), GOLD[1]); t.poly(rrect(x - 0.7, top - 3, 1.8, 0.7, 0.2), GOLD[1]); });
      g.dot(x - 0.2, top - 0.4, W);
      handOver(g, G, 1);
    },
  });

  // ---------------- Bull Rider: a cowboy zombie hanging on to the rope of a chunky mechanical bull ----------------
  const MBULL = R3('#c8926e', 0.2), BMUZ = R3('#f8cbb8', 0.16), HORN = ['#ffffff', '#fbf2dc', '#d8c6a2'], BSTEEL = R3('#bcc6d6', 0.22), CHAT = R3('#c49468'), JEANS = R3('#86a8e0'), SADDLE = R3('#8a4e4e', 0.22);
  ZA.bullrider = (g, P) => {
    const f = P.walk && P.frame ? 1 : 0, d = f ? -0.8 : 0, cx = 14, cy = 22.6 + d, hx = cx + 11, hy = cy - 1.6;
    // the spring tail, boinging behind
    piece(g, t => { const pts = []; for (let i = 0; i <= 6; i++) pts.push([cx - 9.2 - i * 0.4, cy - 1.8 - i * 0.36 + (i % 2 ? 0.8 : -0.8) * (f ? 0.7 : 1)]); for (let i = 1; i < pts.length; i++) stroke(t, [pts[i - 1], pts[i]], 0.3, 0.3, BSTEEL[1]); });
    piece(g, t => blob(t, [[cx - 11.2, cy - 4.4, 1.2, 1.4]], R3('#8a6a5e', 0.22), { hl: false }));
    // four chunky piston legs with dark hooves (the far ones darker); they trot in pairs
    for (const [lx, R, ph] of [[cx - 6, dk(BSTEEL), 0], [cx + 4, dk(BSTEEL), 1], [cx - 3, BSTEEL, 1], [cx + 7, BSTEEL, 0]]) {
      const y1 = 29.6 - (f && ph ? 0.9 : 0);
      piece(g, t => blob(t, [{ p: rrect(lx - 1.2, cy + 1.4, 2.4, y1 - cy - 1.4, 1.1) }], R, { hl: false }));
      piece(g, t => t.ell(lx + 0.3, y1 + 0.6, 1.7, 0.95, flat(R3('#6e5a5e'))));
    }
    // two cream horns, then the bull: a round body, a short neck and a big head, all one shape
    for (const pts of [[[hx - 1.6, hy - 3], [hx - 3, hy - 4.8], [hx - 2.8, hy - 6.6]], [[hx + 1.2, hy - 3.2], [hx + 2.6, hy - 5.2], [hx + 2.4, hy - 7]]]) piece(g, t => stroke(t, pts, 1, 0.45, HORN[1]));
    piece(g, t => blob(t, [[cx, cy, 9.8, 5.4], { p: [[cx + 6.6, cy - 4.2], [hx - 2.4, hy - 3.4], [hx - 1, hy + 3.2], [cx + 8, cy + 3.6]] }, [hx, hy, 4.2, 3.9]], MBULL, { hl: [cx - 4, cy - 3.6, 2, 0.8], d: [1.3, 1.1] }));
    // mechanical bits: a bolted seam round the neck, hip joints and rivets
    thin(g, [[cx + 7.6, cy - 4.4], [cx + 8.4, cy - 1], [cx + 8.2, cy + 2.8]], MBULL[2], 0.3);
    for (const [x, y] of [[cx - 4.6, cy + 1.6], [cx + 5.4, cy + 1.8]]) { piece(g, t => t.ell(x, y, 1.5, 1.5, flat(BSTEEL))); g.dot(x - 0.4, y - 0.4, W); }
    g.dots([[cx - 7.6, cy - 1.6], [cx - 1.6, cy + 3.4], [cx + 2.4, cy + 3.6]], MBULL[2]);
    // the muzzle with nostrils and a gold nose ring, a little ear, a googly eye and a blush
    piece(g, t => blob(t, [[hx + 2.6, hy + 1.6, 2.6, 2.1]], BMUZ, { hl: false }));
    g.dots([[hx + 3.4, hy + 1], [hx + 4.2, hy + 1.4]], BMUZ[2]);
    piece(g, t => { t.ell(hx + 3.6, hy + 3.6, 1.1, 1, GOLD[1]); t.ell(hx + 3.6, hy + 3.6, 0.45, 0.4, null); });
    piece(g, t => blob(t, [[hx - 3.2, hy - 1.8, 1.7, 1, -0.5]], MBULL, { hl: false }));
    A.chibiEyes(g, hx + 0.2, hy - 0.8, { white: true, one: true, sp: 0, w: 2.8, h: 3.1, look: [0.6, 0.2], mood: P.eyes === 'happy' || P.eyes === 'closed' ? P.eyes : null });
    g.ell(hx + 0.4, hy + 1.8, 0.9, 0.5, '#ffb3c2');
    // the cowboy, sitting up in front of the bull: a wide-brim hat, a teal vest (so its body doesn't melt into the brown bull),
    // a red neckerchief. It sits high enough to show about 3 px of body above the saddle, which hides where it's cut off
    const sy = cy - 2.8, sk = (x, y, R) => y < sy || Math.abs(x - (R.hx - 1.4)) > 4.6;
    const G = rider(g, Object.assign({}, P, { walk: false, arms: P.arms || 'hold' }), {
      s: 0.72, hs: 0.9, dx: -2.6, legs: 'none', head: 'peanut', hair: false, coat: R3('#6cb6c8'), shirt: '#fbf6ee', tie: false, sleeve: R3('#fbf2e2'),
      mid0(g, G) { const { X, U } = G; piece(g, t => blob(t, [{ p: [[X(11.6), U(19.4)], [X(19.6), U(19.4)], [X(16.2), U(23.4)]] }], R3('#f27878'), { hl: false })); },
      hat(g, G) { // the cowboy hat: a dented crown, a dark band, the wide brim curled up at the ends
        const { hx, top, S } = G, cx = hx - 0.8 * S, b = top + 3.6 * S;
        piece(g, t => blob(t, [[cx, b - 2.8 * S, 5 * S, 3.6 * S], { p: [[cx - 4.6 * S, b - 2.6 * S], [cx + 4.6 * S, b - 2.6 * S], [cx + 4.6 * S, b], [cx - 4.6 * S, b]] }], CHAT, { mask: (x, y) => y < b + 0.2, hl: false }));
        thin(g, [[cx - 1.6 * S, b - 5.6 * S], [cx, b - 4.8 * S], [cx + 1.6 * S, b - 5.6 * S]], CHAT[2], 0.26);
        recol(g, CHAT, (x, y) => y > b - 1.6 * S && y < b - 0.6 * S, '#8a5a48');
        piece(g, t => blob(t, [[cx, b + 0.2, 9.8 * S, 1.5 * S], [cx - 9.2 * S, b - 0.8 * S, 1.4 * S, 1.2 * S], [cx + 9.2 * S, b - 0.8 * S, 1.4 * S, 1.2 * S]], CHAT, { hl: false, d: [0.5, 0.6] }));
      },
      note: 'hat', noteAfterHat: true, hatNote: G => [G.hx + 0.4 * G.S, G.top + 0.6 * G.S, 0.2, 0.7],
    }, 0, -7.7 + d, sk);
    // the saddle (a darker, redder leather with a light top edge, so rider, saddle and bull stay apart: a seat, a cantle behind and
    // a horn in front), and the cowboy's leg in jeans down the bull's side with a cowboy boot
    const sx = G.hx - 1.4;
    piece(g, t => blob(t, [[sx, sy, 4.6, 1.4], [sx + 4, sy - 0.9, 0.85, 1.05], [sx - 3.9, sy - 0.7, 0.9, 0.9]], SADDLE, { hl: false, d: [0.6, 0.6] }));
    thin(g, [[sx - 3.6, sy - 0.5], [sx - 2, sy - 0.9], [sx, sy - 1.05], [sx + 2, sy - 0.9], [sx + 3.3, sy - 0.6]], '#f2c6a8', 0.26);
    piece(g, t => stroke(t, [[sx + 1.4, sy], [sx + 3.4, cy - 2.2], [sx + 3.8, cy - 0.4]], 1.2, 1.05, JEANS[1]));
    piece(g, t => { t.ell(sx + 4.6, cy + 0.8, 1.9, 1.1, flat(R3('#a87850')), 0.1); t.poly(rrect(sx + 2.8, cy - 1.2, 2.2, 1.6, 0.4), R3('#a87850')[1]); });
    // the bull rope from the horns to the cowboy's hands
    if (G.pose === 'hold') { piece(g, t => stroke(t, [[hx - 1.2, hy - 2.6], [hx - 3.6, hy - 2.2], G.hand], 0.32, 0.32, '#f2dca8')); handAt(g, G.hand2, G.s, dk(SKIN)); handAt(g, G.hand, G.s); }
    return G;
  };

  // ---------------- Barrel Roller: a pirate in a tricorn hat, pushing a big barrel (an imp peeks out of the top) ----------------
  const BARREL = R3('#dca26a', 0.2), HOOPC = R3('#a4acbe', 0.22), TRIC = R3('#a8785a', 0.22), BSTR = R3('#6ccabc');
  ZA.barrelroller = (g, P) => zombie(g, Object.assign({}, P, { arms: P.arms || 'hold' }), {
    s: 0.9, dx: -4.2, head: 'peanut', hair: false, sleeve: 'bare', coat: R3('#fbfaf4'), shirt: false, pants: R3('#b08a68'), shoe: R3('#6a5a6e'),
    body(t, G) { // a sleeveless teal-and-white striped shirt
      const { X, U, s } = G, SH = R3('#fbfaf4');
      blob(t, [[X(15.2), U(24.1), 5.6 * s, 4.6 * s]], SH, { hl: false });
      recol(t, SH, (x, y) => Math.floor((y - U(19)) / (1.3 * s)) % 2 === 1, (x, y, v) => (v === SH[2] ? BSTR[2] : BSTR[1]));
    },
    torso(g, G) { const { X, U, s } = G; piece(g, t => t.poly(rrect(X(9.8), U(25.8), 10.8 * s, 1.2 * s, 0.4), '#8a6a58')); piece(g, t => t.poly(rrect(X(14.6), U(25.6), 1.6 * s, 1.6 * s, 0.3), GOLD[1])); },
    hat(g, G) { // a tricorn: a low round crown, the brim turned up into points front and back, gold trim; a gold earring
      const { hx, hy, hrx, hry, top, S } = G, cx = hx - 0.8 * S, b = top + 3.4 * S;
      piece(g, t => blob(t, [[cx, b - 1.6 * S, 5.4 * S, 3.2 * S]], TRIC, { mask: (x, y) => y < b + 0.2, hl: [cx - 2.4 * S, b - 3.6 * S, 1.2, 0.6] }));
      const br = [[cx - 9.4 * S, b - 3.8 * S], [cx - 6.4 * S, b + 0.2 * S], [cx, b + 1.2 * S], [cx + 6.4 * S, b + 0.2 * S], [cx + 9.4 * S, b - 3.4 * S], [cx + 5.6 * S, b - 1.6 * S], [cx, b - 1 * S], [cx - 5.6 * S, b - 1.8 * S]];
      piece(g, t => blob(t, [{ p: br }], TRIC, { hl: false }));
      thin(g, [[cx - 8.8 * S, b - 3.1 * S], [cx - 5.6 * S, b - 1.1 * S], [cx, b - 0.3 * S], [cx + 5.6 * S, b - 0.9 * S], [cx + 8.8 * S, b - 2.8 * S]], GOLD[1], 0.34);
      piece(g, t => t.ell(hx - hrx * 0.62, hy + hry * 0.46, 0.7 * S, 0.7 * S, flat(GOLD)));
    },
    note: 'hat', noteAfterHat: true, hatNote: G => [G.hx - 1.2 * G.S, G.top + 0.8 * G.S, -0.1, 0.7],
    front(g, G) { // the barrel on its side: bulging staves (they roll on the walk), two iron hoops, the round end showing
      const f = G.P.frame ? 1 : 0, x0 = 18.8, x1 = 31.2, cy = 24.6 + G.bob * 0.3, ry = 6, cxm = (x0 + x1) / 2, lx = x1 - 1.9;
      // an imp peeking out of the bung hole on top (behind the barrel's top edge)
      const ix = cxm + 0.4, iy = cy - ry - 1.2 - f * 0.5;
      piece(g, t => blob(t, [[ix, iy, 2.6, 2.3]], SKIN, { hl: false }));
      A.chibiEyes(g, ix + 0.6, iy - 0.3, { white: true, sp: 2.4, w: 1.9, h: 2.1, look: [0.6, 0.2], mood: G.P.eyes === 'happy' ? 'happy' : null });
      const hoop = x => (xx, y) => Math.abs(xx - (x + Math.abs(y - cy) * 0.12)) < 0.65;
      piece(g, t => {
        blob(t, [{ p: rrect(x0, cy - ry + 0.6, x1 - x0, ry * 2 - 1.2, 2.6) }, [cxm, cy, (x1 - x0) / 2 - 1.2, ry]], BARREL, { hl: false, d: [0.8, 0.9] });
        recol(t, BARREL, (x, y) => ((x - lx) / 1.9) ** 2 + ((y - cy) / (ry - 0.8)) ** 2 <= 1, (x, y, v) => (v === BARREL[2] ? BARREL[1] : '#f2c896'));
        recol(t, BARREL, (x, y) => hoop(x0 + 2.6)(x, y) || hoop(x1 - 4.4)(x, y), (x, y, v) => (v === BARREL[2] ? HOOPC[2] : HOOPC[1]));
      });
      for (const v of [-0.62, 0, 0.62]) { const k = v + (f ? 0.31 : 0), kk = k > 0.9 ? k - 1.24 : k, ye = cy + kk * (ry - 1.6) * 0.86, ym = cy + kk * (ry - 1); thin(g, [[x0 + 1.2, ye], [cxm - 1, ym], [lx - 2.2, ye]], BARREL[2], 0.26); }
      thin(g, [[lx, cy - ry + 1.4], [lx - 0.9, cy - 1], [lx - 0.9, cy + 1], [lx, cy + ry - 1.4]], BARREL[2], 0.24);
      g.dots([[x0 + 2, cy - 2.6], [x0 + 2.5, cy - 3]], BARREL[0]);
      handOver(g, G, 1); handOver(g, G, 2);
    },
  });

  // ---------------- Tomb Raiser: a hooded robe, a staff topped with a cartoon bone, and a little gravestone rising up beside it ----------------
  const ROBE = R3('#9c8ec8', 0.2), STONE = ['#f4f2fb', '#d2cde2', '#aea8c4'], MOSS = ['#e2f6c8', '#b2e08c', '#92c870'], DIRT = R3('#b8906c', 0.2), BONEC = ['#ffffff', '#fbf6ea', '#d8ccb4'];
  ZA.tombraiser = (g, P) => zombie(g, P, {
    s: 0.92, head: 'egg', hair: false, defArms: 'point', coat: ROBE, sleeve: ROBE, shirt: false, pants: ROBE, shoe: R3('#7a6a8a'), legs: 'short',
    body(t, G) { const { X, U, Y } = G; blob(t, [{ p: [[X(12), U(19.4)], [X(18.8), U(19.4)], [X(21.2), Y(29.4)], [X(9.6), Y(29.4)]] }], ROBE, { hl: false }); },
    back(g, G) { // the hood behind the head, with a soft point flopping back
      const { hx, hy, hrx, hry } = G;
      piece(g, t => blob(t, [[hx - 0.9, hy - 0.5, hrx + 1.3, hry + 1.1], { p: [[hx - hrx * 0.2, hy - hry - 0.8], [hx - hrx - 3.2, hy - hry * 0.2], [hx - hrx * 0.6, hy]] }], ROBE, { hl: false, mask: x => x < hx + hrx * 0.5 }));
    },
    torso(g, G) { const { X, U, s } = G; piece(g, t => t.poly(rrect(X(10.2), U(25), 10.2 * s, 1.1 * s, 0.4), '#f2dca8')); piece(g, t => stroke(t, [[X(13), U(25.8)], [X(12.6), U(28.2)]], 0.4, 0.36, '#f2dca8')); },
    hat(g, G) { // the hood's front: over the crown and down behind the face, framing it
      const { hx, hy, hrx, hry, ex, ey, S } = G, sp = 6.6 * S;
      piece(g, t => blob(t, [[hx - 0.9, hy - 0.5, hrx + 1.3, hry + 1.1]], ROBE, { hl: [hx - hrx * 0.4, hy - hry * 0.8, 1.6, 0.7], mask: (x, y) => y < ey - 4 * S - (x - hx) * 0.08 || x < ex - sp / 2 - 3.4 * S + Math.max(0, y - ey) * 0.3 }));
    },
    note: 'hat', noteAfterHat: true, hatNote: G => [G.hx - 5.6 * G.S, G.hy - 3.6 * G.S, -0.3, 0.8],
    front(g, G) { // the staff: a crooked stick with a cartoon bone across the top, magic sparkles round it
      const [hx, hy] = G.hand, x = hx + 0.3, top = Math.max(4.6, Math.min(hy - 9, G.ey - 6)), f = G.P.frame ? 1 : 0;
      piece(g, t => stroke(t, [[x - 0.4, Math.min(30.4, hy + 7)], [x, hy], [x + 0.5, top + 1]], 0.55, 0.55, WOOD[1]));
      piece(g, t => { stroke(t, [[x - 2.2, top + 0.4], [x + 2.6, top - 0.4]], 0.6, 0.6, BONEC[1]); for (const [bx, by] of [[x - 2.6, top + 0.5], [x + 3, top - 0.5]]) { t.ell(bx, by - 0.6, 0.8, 0.8, BONEC[1]); t.ell(bx, by + 0.6, 0.8, 0.8, BONEC[1]); } });
      for (const [a, b] of (f ? [[-3, -2.4], [3.6, -2], [2.6, 2.6]] : [[-3.4, 1.8], [2.4, -2.8], [3.8, 2]])) sparkle(g, x + a, top + b, '#c8f4a8');
      handOver(g, G, 1);
    },
    post(g, G) { // a little gravestone (the garden's look: lilac-grey, R.I.P., a moss tuft) rising out of a mound, clods flying
      const f = G.P.frame ? 1 : 0, sx = 26.8, top = f ? 19.8 : 21.4, bot = 30.2;
      piece(g, t => blob(t, [{ p: rrect(sx - 3.4, top + 2.4, 6.8, bot - top - 2.4, 0.4) }, [sx, top + 3, 3.4, 3]], STONE, { hl: [sx - 1.6, top + 1.4, 1, 0.5] }));
      piece(g, t => { t.ell(sx - 1.4, top + 0.4, 1.8, 1, MOSS, -0.4); t.ell(sx + 0.4, top - 0.1, 1.2, 0.7, MOSS, 0); });
      const ry = top + 4, L = pts => thin(g, pts, STONE[2], 0.24);
      L([[sx - 2.2, ry + 0.9], [sx - 2.2, ry - 0.9], [sx - 1.5, ry - 0.9], [sx - 1.3, ry - 0.4], [sx - 1.6, ry], [sx - 2.2, ry], [sx - 1.3, ry + 0.9]]);
      L([[sx, ry - 0.9], [sx, ry + 0.9]]);
      L([[sx + 1.3, ry + 0.9], [sx + 1.3, ry - 0.9], [sx + 2, ry - 0.9], [sx + 2.2, ry - 0.45], [sx + 2, ry], [sx + 1.3, ry]]);
      thin(g, [[sx + 2.4, top + 6.6], [sx + 1.6, top + 7.6], [sx + 2.2, top + 8.4]], STONE[2], 0.22);
      piece(g, t => blob(t, [[sx, 30.6, 4.4, 1.6], [sx - 3.4, 30.4, 1.4, 1.1], [sx + 3.2, 30.5, 1.3, 1]], DIRT, { hl: false }));
      if (f) for (const [a, b] of [[-4.6, 26.4], [4.2, 25.6], [-3.2, 24.2]]) piece(g, t => t.ell(sx + a, b, 0.6, 0.55, DIRT[1]));
    },
  });

  // ---------------- Disco-tron: a disco robot with a mirror-ball head, a light-up dance-floor chest and laser lights ----------------
  const BALL = ['#ffffff', '#dfe6f0', '#a8b4c8'], DSUIT = ['#f8fbff', '#d2dae8', '#a2aec4'], DFLOOR = ['#ff8ad0', '#8af0ff', '#ffe27a', '#9af27a', '#c4a4f0', '#ffb07a'];
  const LASER = ['255,120,200', '110,230,255', '255,226,110', '150,240,140'];
  // a see-through laser light from the ball's rim (rim angle th) along angle a: a soft cone, 1 px wide at the ball and 2 px at the
  // end, fading to nothing over its length L (so it reads as light, not a stick), and always stopping 1 px short of the sprite box
  // so it never ends in a hard cut. Painted only on empty pixels (it shines from behind and gets no bold edge)
  function beam(g, G, th, a, rgb, L) {
    const k = g.k || 1, dx = Math.cos(a), dy = Math.sin(a), x = G.hx + Math.cos(th) * G.hrx, y = G.hy + Math.sin(th) * G.hry;
    for (const [p, d, n] of [[x, dx, g.w], [y, dy, g.h]]) if (Math.abs(d) > 1e-3) L = Math.min(L, ((d > 0 ? n - 2 : 2) - p) / d);
    const alpha = v => (v && v[0] === 'r' ? parseFloat(v.slice(v.lastIndexOf(',') + 1)) : -1);
    for (let r = 0; r <= L; r += 0.25) {
      const u = r / L, hw = 0.5 + 0.5 * u;
      for (let o = -hw; o <= hw + 1e-6; o += 0.25) {
        const al = Math.round(95 * (1 - u) * (1 - 0.4 * Math.abs(o) / hw)) / 100;
        if (al < 0.04) continue;
        const fx = Math.floor((x + dx * r - dy * o) * k), fy = Math.floor((y + dy * r + dx * o) * k), v = g.fget(fx, fy);
        if (v === null || alpha(v) >= 0 && alpha(v) < al) g.fset(fx, fy, `rgba(${rgb},${al})`);
      }
    }
  }
  ZA.discotron = (g, P) => {
    const f = P.frame ? 1 : 0;
    const G = zombie(g, P, {
      s: 0.92, hair: false, face: false, defArms: 'point', coat: DSUIT, sleeve: DSUIT, handSkin: DSUIT, shirt: false, pants: DSUIT, shoe: GOLD,
      head(t, G) { // the mirror ball: little square mirrors with grout lines, a few catching coloured light (they twinkle on the beat)
        const { hx, hy, hrx, hry } = G, c = 2.2;
        blob(t, [[hx, hy, hrx, hry]], BALL, { d: [hrx * 0.12, hry * 0.14], hl: false });
        recol(t, BALL, () => true, (x, y, v) => {
          const u = (x - hx) / c + 40, w = (y - hy) / c + 40, i = Math.floor(u), j = Math.floor(w);
          if (u - i < 0.2 || w - j < 0.2) return v === BALL[2] ? '#8e9ab0' : '#b8c2d4';
          const h = (i * 7 + j * 13 + f * 5) % 11;
          if (h === 0) return '#ffc4ec'; if (h === 3) return '#c4f4ff'; if (h === 6) return '#fff2b4';
          return v === BALL[2] ? '#c4cedc' : h % 2 ? '#ffffff' : '#e6ecf4';
        });
      },
      torso(g, G) { // a light-up dance floor on its chest (the colours swap on the beat)
        const { X, U, s } = G, x0 = X(12.2), y0 = U(21.4), c = 1.8 * s;
        piece(g, t => t.poly(rrect(x0 - 0.4, y0 - 0.4, 3 * c + 0.8, 2 * c + 0.8, 0.5), '#4a4670'));
        for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) g.poly(rrect(x0 + i * c + 0.2, y0 + j * c + 0.2, c - 0.4, c - 0.4, 0.2), DFLOOR[(i + j * 3 + f * 2) % 6]);
      },
      hat(g, G) { // a hanging loop on top, and a dark screen on the front of the ball with googly eyes and a glowing smile
        const { hx, top, ex, ey, mx, my, S } = G, sp = 6.6 * S, Pz = G.P;
        piece(g, t => stroke(t, [[hx - 0.4, top + 0.6], [hx - 0.4, top - 0.5]], 0.4, 0.4, METAL[2]));
        piece(g, t => { t.ell(hx - 0.4, top - 1.3, 1, 0.95, METAL[1]); t.ell(hx - 0.4, top - 1.3, 0.42, 0.38, null); });
        piece(g, t => t.poly(rrect(ex - sp / 2 - 3.4 * S, ey - 3.6 * S, sp + 7 * S, 10.2 * S, 2.6 * S), '#4a4670'));
        zEyes(g, G, Pz, { col: '#2a3448' });
        // the line moods' ink would vanish on the dark screen: those lines glow instead (1 px in from the screen's edge)
        if (Pz.eyes === 'happy' || Pz.eyes === 'closed' || Pz.eyes === 'blink') { const x0 = ex - sp / 2 - 3.4 * S + 1, y0 = ey - 3.6 * S + 1; recol(g, [INK], (x, y) => x > x0 && x < x0 + sp + 7 * S - 2 && y > y0 && y < y0 + 10.2 * S - 2, '#c4f4ff'); }
        if (Pz.mouth === 'open' || Pz.mouth === 'o' || Pz.mouth === 'grin') piece(g, t => t.poly(rrect(mx - 1.6 * S, my - 0.6 * S, 3.2 * S, 1.6 * S, 0.5 * S), '#ff8ad0'));
        else thin(g, [[mx - 1.6 * S, my - 0.2], [mx - 0.6 * S, my + 0.4], [mx + 0.6 * S, my + 0.4], [mx + 1.6 * S, my - 0.2]], '#ff8ad0', 0.3);
        sparkle(g, hx - 5 * S, G.hy - 5.6 * S, W);
      },
      note: [-6.6, -2.4, -0.3, 0.8], noteAfterHat: true,
    });
    // four laser lights fanning out from the ball's rim, up-left, left, up-right and low-right (nothing straight up by the hanging
    // loop, so they can't read as antennae); [rim angle, beam angle] pairs, swinging on the beat
    (f ? [[-2.45, -2.75], [2.7, 2.95], [-0.95, -0.5], [0.95, 0.95]] : [[-2.3, -2.6], [2.85, 2.75], [-1.1, -0.3], [0.85, 0.7]]).forEach(([th, a], i) => beam(g, G, th, a, LASER[i], 10));
    return G;
  };
})();
