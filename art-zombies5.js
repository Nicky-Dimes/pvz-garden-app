// art-zombies5.js — PVZ Garden: the seventh wave of zombies (8 more) in the TRUE chibi style: Pogo Zombie, Backup Dancer,
// Catapult Zombie, Torchlight Zombie, Pinata Zombie, Fossilhead, Gingerbread Zombie and Witch Zombie.
// Same contract and kit as art-zombies3/4.js: PX.ZOMBIE_ART[kind] = function (g, P, L) on a 32x32 grid facing right, feet on
// rows 29-31, built with PX.ZKIT (exported by art-zombies.js). The Pogo and Catapult zombies draw the zombie on its own grid and
// lay it over their ride a few pixels up (rider(), as in art-zombies4.js). Silly and friendly: big googly eyes, the pink sticky
// note, chunky props.
(function () {
  'use strict';
  if (!window.PX || !PX.ZKIT) return;
  const { INK, stroke, Grid } = PX;
  const A = PX.art, mixHex = PX.mixHex;
  const K = PX.ZKIT;
  const { zombie, handOver, blob, recol, thin, rrect, piece, flat, R3, SKIN, GOLD, WOOD, W } = K;
  const ZA = PX.ZOMBIE_ART;
  const FLAME = ['#fff4b8', '#ffae52', '#f07c46'];
  const dk = Rm => Rm.map(c => mixHex(c, '#4a3646', 0.15));
  const sparkle = (g, x, y, c) => g.dots([[x, y - 0.5], [x - 0.5, y], [x, y], [x + 0.5, y], [x, y + 0.5]], c || '#fffbe0');

  // ---------------- riders (as art-zombies4.js): the zombie on its own grid, laid over the ride dx, dy art px away ----------------
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
    return Object.assign({}, G, { hand: sh(G.hand), hand2: sh(G.hand2), hx: G.hx + dx, hy: G.hy + dy, top: G.top + dy, ex: G.ex + dx, ey: G.ey + dy });
  }
  const handAt = (g, p, s, Rm) => piece(g, t => t.ell(p[0], p[1], 1.7 * s, 1.6 * s, flat(Rm || SKIN)));
  // a little flame from its base (x, y), height fh, half-width fw
  function flame(t, x, y, fh, fw, lean) {
    t.ell(x, y - fw * 0.85, fw, fw * 0.92, FLAME[1]);
    t.poly([[x - fw * 0.98, y - fw * 0.95], [x - fw * 0.6, y - fh * 0.5], [x + lean * fh, y - fh], [x + fw * 0.7, y - fh * 0.48], [x + fw * 0.98, y - fw * 0.95]], FLAME[1]);
    t.ell(x + 0.1, y - fw * 0.7, fw * 0.52, fw * 0.55, FLAME[0]);
    t.poly([[x - fw * 0.45, y - fw * 0.8], [x + lean * fh * 0.45, y - fh * 0.55], [x + fw * 0.5, y - fw * 0.8]], FLAME[0]);
  }
  // a party-hat cone on the head (tilted back a little) with stripes and a pom-pom
  function partyCone(g, G, C1, C2, h) {
    const { hx, top, S } = G, bx = hx - 0.8 * S, by = top + 2.6 * S, hw = 3.4 * S, tip = [bx - 1.2 * S, Math.max(1.6, by - (h || 8) * S)];
    piece(g, t => {
      t.poly([[bx - hw, by + 0.4], [bx + hw, by - 0.2], tip], C1[1]);
      recol(t, [C1[1]], (x, y) => Math.floor((y - tip[1]) / (1.6 * S)) % 2 === 1, C2);
      blob(t, [], C1);
    });
    piece(g, t => t.ell(tip[0], tip[1], 1.25 * S, 1.2 * S, flat(['#ffffff', '#fff6f0', '#e6d8d0'])));
    thin(g, [[bx - hw + 0.6, by + 0.9], [bx - hw * 0.4, by + 3.8 * S]], '#e8d0d8', 0.2);
  }

  // =====================================================================================================
  // Pogo Zombie: bouncing on a pogo stick - feet on the pegs, hands on the handlebar, a red sweatband; it boings up on frame 1
  // =====================================================================================================
  const POGO = R3('#ff7a8a'), POLE = ['#f4f6fa', '#cfd6e2', '#9aa4b8'], SPRING = '#9aa4b8';
  ZA.pogo = (g, P) => {
    const f = P.walk && P.frame ? 1 : 0, up = f ? -1.6 : 0, comp = f ? 0 : 0.8;
    const dy = -4.4 + up + comp;
    const G = rider(g, Object.assign({}, P, { walk: false, arms: P.arms || 'hold' }), {
      s: 0.92, legs: 'short', coat: R3('#7cc0e8'), pants: R3('#5c6a9a'), shoe: R3('#f2f2f6'),
      hat(g, G) { // a red sweatband with a white stripe
        const { hx, hrx, ey, S } = G, y = ey - 4.6 * S;
        piece(g, t => blob(t, [{ p: [[hx - hrx * 1.02, y + 0.8], [hx + hrx * 0.95, y - 0.6], [hx + hrx * 0.98, y + 1.3], [hx - hrx * 1.02, y + 2.7]] }], POGO, { hl: false, mask: (x, yy) => g.filled(x, yy) }));
        thin(g, [[hx - hrx * 0.95, y + 1.7], [hx + hrx * 0.92, y + 0.3]], W, 0.26);
      },
      note: [-4.4, -6.4, -0.2, 0.85], noteAfterHat: true,
    }, 0, dy);
    // the pogo stick: a pole in front of the body, a handlebar under the hands, foot pegs under the shoes, a spring and a rubber foot
    const px = 18.8, barY = G.hand[1] + 0.2, pegY = 30.3 + dy + 1.0, footY = 31.3;
    piece(g, t => stroke(t, [[px, barY - 0.6], [px, pegY + 1.2]], 0.75, 0.75, POLE[1]));
    piece(g, t => { const n = 4, y0 = pegY + 0.9, y1 = footY - 1.3; for (let i = 0; i < n; i++) { const y = y0 + (y1 - y0) * (i + 0.5) / n; t.ell(px, y, 1.9, Math.max(0.4, (y1 - y0) / n * 0.42), SPRING); } });
    piece(g, t => t.ell(px, footY - 0.9, 1.1, 0.75, '#4e4a5a'));
    piece(g, t => { t.poly([[px - 6.4, pegY - 0.35], [px + 1.4, pegY - 0.35], [px + 1.4, pegY + 0.55], [px - 6.4, pegY + 0.55]], POLE[1]); });
    piece(g, t => { stroke(t, [[px - 1.8, barY], [Math.min(29.6, G.hand[0] + 1.4), barY - 0.2]], 0.55, 0.55, '#4e4a5a'); });
    handAt(g, G.hand, G.s); handAt(g, G.hand2, G.s);
    if (f) for (const d of [-1, 1]) { thin(g, [[px + d * 2.6, 30.2], [px + d * 4.0, 31.0]], '#8a92a8', 0.24); thin(g, [[px + d * 2.4, 28.6], [px + d * 3.8, 28.8]], '#8a92a8', 0.24); }
    return G;
  };

  // =====================================================================================================
  // Backup Dancer: a sparkly red sequin jacket, a shiny pompadour and gold chain; it strikes a disco point (and pops an arm up)
  // =====================================================================================================
  const SEQ = R3('#f2647c'), QUIFF = R3('#5a4664', 0.25);
  ZA.backupdancer = (g, P) => zombie(g, P, {
    s: 0.92, head: 'egg', hair: false, coat: SEQ, pants: R3('#3e3a52'), shoe: R3('#f4f2fa'), shirt: '#fff2f6', tie: false,
    arms: P.arms || (P.walk ? null : P.frame ? 'up' : 'point'),
    hat(g, G) { // a big shiny pompadour swooping up and forward
      const { hx, hy, hrx, hry, S } = G;
      piece(g, t => blob(t, [[hx - hrx * 0.25, hy - hry * 0.78, hrx * 0.85, hry * 0.42, -0.15], [hx + hrx * 0.42, hy - hry * 0.98, hrx * 0.5, hry * 0.34, -0.35], [hx - hrx * 0.8, hy - hry * 0.4, hrx * 0.32, hry * 0.45]], QUIFF, { hl: [hx - hrx * 0.1, hy - hry * 1.02, 1.8 * S, 0.5 * S, -0.2] }));
      thin(g, [[hx - hrx * 0.5, hy - hry * 0.72], [hx + hrx * 0.1, hy - hry * 0.98], [hx + hrx * 0.6, hy - hry * 1.05]], QUIFF[0], 0.22);
    },
    note: [-6.0, -1.6, -0.35, 0.8], noteAfterHat: true,
    torso(g, G) { // the white shirt, sequin lapels, a gold chain
      const { X, U, s } = G;
      piece(g, t => t.poly([[X(13.2), U(19.6)], [X(17.4), U(19.6)], [X(15.4), U(24.6)]], '#fff2f6'));
      piece(g, t => { t.poly([[X(12.8), U(19.8)], [X(14.4), U(22.6)], [X(12.9), U(23.4)]], SEQ[2]); t.poly([[X(18), U(19.8)], [X(16.4), U(22.6)], [X(18.2), U(23.2)]], SEQ[2]); });
      thin(g, [[X(13.8), U(20.4)], [X(15.4), U(22.6)], [X(17), U(20.4)]], GOLD[1], 0.3);
      for (const [a, b] of [[11.6, 23.8], [13.2, 25.6], [17.8, 24.4], [16.6, 26.2], [12.4, 21.6]]) g.dot(X(a), U(b), '#fff0f4');
    },
    post(g, G) { const f = G.P.frame ? 1 : 0; sparkle(g, f ? 27.6 : 28.6, f ? 6.4 : 8.6); sparkle(g, f ? 4.4 : 3.6, f ? 12 : 9.4, '#fff6b0'); },
  });

  // =====================================================================================================
  // Catapult Zombie: drives a wooden catapult cart on donut wheels; a basketball sits in the catapult's basket at the back
  // =====================================================================================================
  const CART = R3('#d8a46c'), CART2 = R3('#c08a58'), WHEEL = ['#8a8494', '#6a6476', '#4e4a5a'], BALL = R3('#ff9a4a', 0.18);
  ZA.catapult = (g, P) => {
    const f = P.walk && P.frame ? 1 : 0, bob = f ? -0.5 : 0;
    // the catapult arm and basketball at the back (behind everything)
    const ax = 8.2, ay = 21.4 + bob, tx = 4.6, ty = 11.2 + bob + (f ? 0.6 : 0);
    piece(g, t => stroke(t, [[ax, ay], [tx + 1.2, ty + 2.2]], 0.8, 0.65, WOOD[1]));
    piece(g, t => { t.ell(tx + 1.0, ty + 2.6, 2.6, 1.3, CART2[1], -0.5); });
    piece(g, t => { t.ell(tx, ty, 2.7, 2.6, BALL[1]); blob(t, [], BALL); });
    thin(g, [[tx - 2.6, ty], [tx + 2.6, ty]], '#a8542e', 0.22); thin(g, [[tx, ty - 2.5], [tx, ty + 2.5]], '#a8542e', 0.22);
    thin(g, [[tx - 1.8, ty - 1.9], [tx - 0.7, ty], [tx - 1.8, ty + 1.9]], '#a8542e', 0.2);
    g.dot(tx - 1.2, ty - 1.4, '#ffe0c0');
    // the driver, sitting in the cart
    const G = rider(g, Object.assign({}, P, { walk: false, arms: P.arms || 'hold' }), { s: 0.78, legs: 'none', coat: R3('#8cc4a0'), dx: 1.2 }, 0, -4.2 + bob);
    // the cart: a chunky wooden box with a plank line, a lever the zombie holds
    const cx0 = 6.2, cx1 = 27.4, cy0 = 20.6 + bob, cy1 = 28.0 + bob;
    piece(g, t => stroke(t, [[22.6, cy0 + 0.8], [G.hand[0], G.hand[1] + 0.4]], 0.45, 0.45, '#8a7a6a'));
    piece(g, t => { blob(t, [{ p: rrect(cx0, cy0, cx1 - cx0, cy1 - cy0, 1.3) }], CART, { hl: [cx0 + 3, cy0 + 1.2, 2.4, 0.6] }); });
    thin(g, [[cx0 + 0.8, (cy0 + cy1) / 2 + 0.2], [cx1 - 0.8, (cy0 + cy1) / 2 + 0.2]], CART[2], 0.24);
    for (const x of [cx0 + 1.4, cx1 - 1.4]) g.dots([[x, cy0 + 1.4], [x, cy1 - 1.4]], CART[2]);
    handAt(g, G.hand, G.s);
    // donut wheels
    for (const [x, ph] of [[10.6, 0], [23.0, 1]]) {
      piece(g, t => { t.ell(x, 28.6, 2.7, 2.6, WHEEL[1]); blob(t, [], WHEEL); t.ell(x, 28.6, 0.95, 0.95, '#d8d2dc'); });
      const a = (f + ph) * 0.8; thin(g, [[x + Math.cos(a) * 1.4, 28.6 + Math.sin(a) * 1.4], [x + Math.cos(a) * 2.2, 28.6 + Math.sin(a) * 2.2]], WHEEL[0], 0.24);
    }
    return G;
  };

  // =====================================================================================================
  // Torchlight Zombie: a cosy plum hooded cloak and a big flaming torch held up in front (it's scared of the dark!)
  // =====================================================================================================
  const HOOD = R3('#8a6ab0', 0.22), HOOD_IN = '#4e3a66';
  ZA.torchlight = (g, P) => zombie(g, P, {
    s: 0.94, head: 'peanut', hair: false, coat: HOOD, sleeve: HOOD, pants: R3('#6e6a86'), shoe: R3('#8a6a5a'), shirt: false, tie: false,
    arms: P.arms || 'hold',
    back(g, G) { // the hood's back, falling down behind the head
      const { hx, hy, hrx, hry } = G;
      piece(g, t => blob(t, [[hx - hrx * 0.25, hy + hry * 0.05, hrx * 1.08, hry * 1.06], [hx - hrx * 0.7, hy + hry * 0.75, hrx * 0.5, hry * 0.6]], HOOD, { hl: false }));
    },
    hat(g, G) { // the hood over the top of the head, framing the face
      const { hx, hy, hrx, hry, ex, ey, S } = G;
      const fx = ex + 0.6 * S, fy = ey + 1.6 * S, frx = 6.9 * S, fry = 6.6 * S, open = (x, y) => ((x - fx) / frx) ** 2 + ((y - fy) / fry) ** 2 < 1;
      piece(g, t => blob(t, [[hx - hrx * 0.12, hy - hry * 0.1, hrx * 1.1, hry * 1.04]], HOOD, { hl: [hx - hrx * 0.4, hy - hry * 0.86, 1.6 * S, 0.6 * S], mask: (x, y) => !open(x, y) }));
      for (let a = -2.6; a <= 0.2; a += 0.08) { const x = fx + Math.cos(a) * (frx + 0.25), y = fy + Math.sin(a) * (fry + 0.25); if (g.get(x, y) === HOOD[1] || g.get(x, y) === HOOD[2]) g.dot(x, y, HOOD_IN); }
    },
    note: [-6.2, 0.6, -0.4, 0.8], noteAfterHat: true,
    torso(g, G) { const { X, U } = G; piece(g, t => t.ell(X(15.4), U(20.4), 1.1, 1.0, flat(GOLD))); },
    front(g, G) { // the torch: a wooden handle with a wrapped top, and a big flame
      const [hx0, hy0] = G.hand, f = G.P.frame ? 1 : 0, x = Math.min(27.6, hx0 + 0.6), top = hy0 - 4.2;
      piece(g, t => stroke(t, [[hx0 - 0.4, hy0 + 3.4], [x, top]], 0.62, 0.72, WOOD[1]));
      piece(g, t => { t.ell(x, top + 0.2, 1.25, 0.95, '#c8a47a'); });
      piece(g, t => flame(t, x, top - 0.2, 6.4 + f * 0.6, 2.2, f ? 0.12 : -0.05));
      handOver(g, G, 1); handOver(g, G, 2);
      for (const [a, b] of f ? [[x + 3.0, top - 6.6], [x - 3.2, top - 4.2]] : [[x + 3.4, top - 4.2], [x - 2.8, top - 6.8]]) g.dot(a, Math.max(1.2, b), '#ffd86a');
    },
  });

  // =====================================================================================================
  // Pinata Zombie: a party hat, and a big rainbow donkey pinata hugged in its arms
  // =====================================================================================================
  const PIN = [['#ff8fb4', '#ff6f9c'], ['#ffe27a', '#f6c84a'], ['#7fdcd0', '#54c0b4'], ['#b996ee', '#9a76d8']];
  ZA.pinata = (g, P) => zombie(g, P, {
    s: 0.92, head: 'wide', hair: false, coat: R3('#a0c8f0'), arms: P.arms || 'hold',
    hat(g, G) { partyCone(g, G, R3('#7fdcd0'), '#ffe27a', 7.6); },
    note: [-5.4, -2.6, -0.3, 0.8], noteAfterHat: true,
    front(g, G) { // the donkey: a fringed rainbow body, a neck and head with tall ears, four stubby legs, a paper tail
      const f = G.P.frame ? 1 : 0, bx = 22.4, by = 24.2 + (f ? -0.4 : 0);
      const shapes = [{ p: rrect(bx - 5.6, by - 2.8, 10.4, 5.4, 2.2) }, { p: [[bx + 2.6, by - 1.4], [bx + 4.6, by - 7.4], [bx + 6.6, by - 6.8], [bx + 5.0, by - 0.6]] }, [bx + 6.0, by - 7.6, 2.3, 1.8, -0.2]];
      piece(g, t => { for (const [lx] of [[bx - 4.2], [bx - 1.8], [bx + 1.2], [bx + 3.6]]) t.poly([[lx - 0.8, by + 2], [lx + 0.8, by + 2], [lx + 0.8, by + 4.8], [lx - 0.8, by + 4.8]], PIN[(Math.round(lx) % 4 + 4) % 4][0]); });
      piece(g, t => { t.ell(bx + 5.0, by - 9.6, 0.8, 1.9, PIN[3][0], 0.15); t.ell(bx + 6.6, by - 9.4, 0.8, 1.9, PIN[0][0], 0.4); });
      piece(g, t => {
        blob(t, shapes, ['#ffffff', '#ff8fb4', '#ff6f9c'], { hl: false });
        // fringe stripes in rainbow bands
        for (let i = 0; i < t.a.length; i++) { const c = t.a[i]; if (!c || c === INK) continue; const x = (i % t.fw + 0.5) / t.k, y = (Math.floor(i / t.fw) + 0.5) / t.k, band = ((Math.floor((y - x * 0.18) / 1.5) % 4) + 4) % 4; t.a[i] = c === '#ff6f9c' ? PIN[band][1] : PIN[band][0]; }
      });
      for (let x = bx - 5; x < bx + 4.6; x += 1.0) g.dot(x, by + 2.4, '#ffffff');
      piece(g, t => { stroke(t, [[bx - 5.6, by - 1.2], [bx - 7.6, by - 0.2], [bx - 8.2, by + 1.6]], 0.4, 0.25, PIN[1][0]); });
      g.ell(bx + 6.8, by - 7.9, 0.45, 0.45, INK); g.dot(bx + 6.6, by - 8.1, W);
      handOver(g, G, 1); handOver(g, G, 2);
    },
  });

  // =====================================================================================================
  // Fossilhead: wears a big dinosaur skull for a helmet (a beige skull dome, an eye socket, a toothy snout over its brow and a
  // little horn), a spotty fur pelt, and a bone club
  // =====================================================================================================
  const BONE = ['#fffaf0', '#f2e6cc', '#d4c09e'], PELT = R3('#c8966e'), SPOT = '#a07454';
  ZA.fossilhead = (g, P) => zombie(g, P, {
    s: 0.92, head: 'pear', hair: false, sleeve: 'bare', shirt: false, tie: false, coat: PELT, pants: R3('#a8805e'), shoe: R3('#b4cc9e'),
    torso(g, G) { // a one-shoulder pelt with spots and a zigzag hem
      const { X, U, s } = G, hem = [];
      for (let i = 0; i <= 8; i++) hem.push([X(21 - i * 1.4), U(27.4 + (i % 2) * 1.1)]);
      piece(g, t => {
        blob(t, [{ p: [[X(10), U(22)], [X(17.4), U(19.4)], [X(21), U(22.8)]].concat(hem) }], PELT, { hl: false });
        for (const [a, b] of [[12.4, 23.8], [16.4, 22.4], [14.6, 25.8], [18.8, 25]]) t.ell(X(a), U(b), 0.95 * s, 0.75 * s, SPOT, 0, (x, y) => t.filled(x, y));
      });
    },
    hat(g, G) { // the dinosaur skull helmet
      const { hx, hy, hrx, hry, ey, S } = G, by = ey - 3.6 * S;
      // the bony frill fanning out behind the skull, with round scallops and dots
      piece(g, t => { const sh = [[hx - hrx * 0.7, hy - hry * 0.55, hrx * 0.62, hry * 0.62]]; for (let i = 0; i < 5; i++) { const a = Math.PI * (0.78 + i * 0.16); sh.push([hx - hrx * 0.55 + Math.cos(a) * hrx * 0.62, hy - hry * 0.5 + Math.sin(a) * hry * 0.62, 1.5 * S, 1.5 * S]); } blob(t, sh, R3('#e6d2ae'), { hl: false }); });
      piece(g, t => {
        blob(t, [[hx - hrx * 0.05, hy - hry * 0.42, hrx * 1.0, hry * 0.66], { p: [[hx + hrx * 0.2, by - 2.6 * S], [hx + hrx * 1.4, by - 0.2 * S], [hx + hrx * 1.5, by + 1.4 * S], [hx + hrx * 0.2, by + 1.0 * S]] }], BONE, { mask: (x, y) => y < by + 1.4 * S, hl: [hx - hrx * 0.4, hy - hry * 0.86, 1.8 * S, 0.7 * S] });
        // two horns sweeping forward from the brow, and a little nose horn
        t.poly([[hx - hrx * 0.05, hy - hry * 0.8], [hx + hrx * 0.95, hy - hry * 1.42], [hx + hrx * 0.4, hy - hry * 0.62]], BONE[0]);
        t.poly([[hx + hrx * 0.95, by - 1.6 * S], [hx + hrx * 1.18, by - 3.6 * S], [hx + hrx * 1.3, by - 1.2 * S]], BONE[0]);
      });
      // a big round eye socket, a nostril, teeth along the beak's lower edge and a crack
      g.ell(hx - hrx * 0.3, hy - hry * 0.5, 1.9 * S, 1.6 * S, '#6a5446'); g.dot(hx - hrx * 0.38, hy - hry * 0.58, '#9a8070');
      g.ell(hx + hrx * 1.18, by - 0.3 * S, 0.5 * S, 0.4 * S, '#6a5446');
      for (let i = 0; i < 4; i++) { const x = hx + hrx * (0.42 + i * 0.26), y = by + 1.15 * S; g.poly([[x - 0.55, y], [x + 0.55, y], [x, y + 1.05]], W); }
      thin(g, [[hx + hrx * 0.1, hy - hry * 0.9], [hx + hrx * 0.3, hy - hry * 0.7], [hx + hrx * 0.2, hy - hry * 0.55]], BONE[2], 0.22);
    },
    note: [-6.6, 0.8, -0.4, 0.8], noteAfterHat: true,
    front(g, G) { // a bone club in the front hand
      const [x, y] = G.hand;
      piece(g, t => { stroke(t, [[x - 0.6, y + 2.2], [Math.min(28.6, x + 2.6), y - 4.4]], 0.7, 0.7, BONE[1]); for (const [dx, dy] of [[-0.9, 0], [0.9, 0.3]]) { t.ell(x - 0.6 + dx * 0.8, y + 2.8 + dy, 1.0, 0.95, BONE[1]); t.ell(Math.min(28.6, x + 2.6) + dx, y - 4.8 + dy, 1.05, 1.0, BONE[1]); } blob(t, [], BONE); });
      handOver(g, G, 1);
    },
  });

  // =====================================================================================================
  // Gingerbread Zombie: a gingerbread cookie zombie - warm brown cookie skin, white icing squiggles at the wrists, ankles and round
  // the face, three gumdrop buttons, an icing smile and a bite out of the top of its head
  // =====================================================================================================
  const GINGER = R3('#d99a5e', 0.22), ICE = '#ffffff';
  ZA.gingerbread = (g, P) => zombie(g, P, {
    s: 0.94, head: 'round', hair: false, skin: GINGER, coat: GINGER, pants: GINGER, shoe: R3('#c88a52'), shirt: false, tie: false, sleeve: GINGER, buttons: false,
    torso(g, G) { // three gumdrop buttons
      const { X, U, s } = G;
      [['#ff6f8a', 21.4], ['#7fd67a', 23.4], ['#ffd84a', 25.4]].forEach(([c, y], i) => piece(g, t => t.ell(X(15.4 + (i - 1) * 0.15), U(y), 0.95 * s, 0.85 * s, flat(R3(c, 0.18)))));
    },
    mouthOpt: { tooth: '#fff4e8' },
    post(g, G) {
      const { hx, hy, hrx, hry, X, U, s, S } = G;
      // icing squiggles round the face, at the wrists and the ankles
      const wav = []; for (let i = 0; i <= 14; i++) { const a = Math.PI * (0.62 + i * 0.07), r = 1 + (i % 2 ? 0.06 : -0.02); wav.push([hx + Math.cos(a) * hrx * 0.82 * r, hy + Math.sin(a) * hry * 0.82 * r]); }
      for (let i = 1; i < wav.length; i++) if (g.filled(wav[i][0], wav[i][1])) thin(g, [wav[i - 1], wav[i]], ICE, 0.24);
      for (const p of [G.hand, G.hand2]) thin(g, [[p[0] - 1.3 * s, p[1] - 0.8 * s], [p[0] - 0.6 * s, p[1] - 1.4 * s], [p[0] + 0.1 * s, p[1] - 0.8 * s], [p[0] + 0.8 * s, p[1] - 1.4 * s]], ICE, 0.22);
      for (const lx of [12.6, 17.8]) thin(g, [[X(lx - 1.6), U(27.6)], [X(lx - 0.6), U(27.0)], [X(lx + 0.4), U(27.6)], [X(lx + 1.4), U(27.0)]], ICE, 0.22);
      // the bite out of the top of its head (two round nibbles)
      g.ell(hx - hrx * 0.62, hy - hry * 0.86, 2.0 * S, 1.9 * S, null); g.ell(hx - hrx * 0.25, hy - hry * 1.0, 1.6 * S, 1.5 * S, null);
      for (let a = 0; a < Math.PI * 2; a += 0.2) { const x = hx - hrx * 0.62 + Math.cos(a) * 2.25 * S, y = hy - hry * 0.86 + Math.sin(a) * 2.15 * S; if (g.get(x, y) && g.get(x, y) !== INK) g.dot(x, y, GINGER[2]); }
    },
  });

  // =====================================================================================================
  // Witch Zombie: a big purple pointy witch hat (wide brim, gold buckle, the tip flopping back), a purple robe, green hair
  // strands and a broom
  // =====================================================================================================
  const WHAT = R3('#8a62c4', 0.25), ROBE = R3('#9a78d0', 0.22), STRAW = R3('#f2c86a', 0.2);
  ZA.witch = (g, P) => zombie(g, P, {
    s: 0.88, head: 'egg', hair: false, coat: ROBE, sleeve: ROBE, pants: R3('#5e5a7a'), shoe: R3('#4e4a5a'), shirt: false, tie: false, arms: P.arms || 'hold',
    broom(g, G) { // the broom, held upright in the front hand: a stick, a tied straw bundle fanning out on the ground
      const [x, y] = G.hand, f = G.P.frame ? 1 : 0, bx = Math.min(27.6, x + 1.6);
      piece(g, t => stroke(t, [[x - 0.6, y - 7.4], [bx, 26.6]], 0.48, 0.48, WOOD[1]));
      piece(g, t => { t.poly([[bx - 1.4, 26.0], [bx + 1.4, 26.0], [Math.min(30.6, bx + 3.0), 31.0 - f * 0.2], [bx - 3.0, 31.0]], STRAW[1]); blob(t, [], STRAW); });
      thin(g, [[bx - 1.5, 26.9], [bx + 1.5, 26.9]], '#a87a4a', 0.34);
      for (const dx of [-1.6, 0, 1.6]) thin(g, [[bx + dx * 0.5, 27.8], [bx + dx, 30.6]], STRAW[2], 0.18);
    },
    hat(g, G) {
      const { hx, top, hrx, S } = G, by = top + 3.6 * S, f = G.P.frame ? 1 : 0;
      // wispy green hair under the brim at the back
      for (const [a, b] of [[[-0.95, 0.6], [-1.2, 3.4]], [[-0.8, 0.6], [-0.95, 4.0]], [[-1.02, 1.6], [-1.3, 4.4]]]) thin(g, [[hx + a[0] * hrx, by + a[1]], [hx + b[0] * hrx, by + b[1]]], '#7cc86a', 0.34);
      const tip = [hx - 4.6 * S, Math.max(1.4, by - 10.6 * S + f * 0.3)];
      piece(g, t => { t.poly([[hx - 4.4 * S, by - 0.3], [hx + 3.4 * S, by - 0.6], [hx + 0.2 * S, by - 7.0 * S], tip, [hx - 2.8 * S, by - 6.0 * S]], WHAT[1]); blob(t, [], WHAT); });
      piece(g, t => blob(t, [[hx - 0.4 * S, by + 0.2, hrx * 1.28, 1.6 * S, -0.04]], WHAT, { hl: false }));
      piece(g, t => t.poly([[hx - 4.2 * S, by - 0.6], [hx + 3.3 * S, by - 0.9], [hx + 3.0 * S, by - 2.4 * S], [hx - 3.9 * S, by - 2.1 * S]], '#5a3e86'));
      piece(g, t => { t.poly([[hx - 1.1 * S, by - 0.5], [hx + 1.3 * S, by - 0.6], [hx + 1.2 * S, by - 2.6 * S], [hx - 1.0 * S, by - 2.5 * S]], GOLD[1]); t.poly([[hx - 0.4 * S, by - 1.0], [hx + 0.6 * S, by - 1.1], [hx + 0.55 * S, by - 2.0 * S], [hx - 0.35 * S, by - 1.95 * S]], '#5a3e86'); });
    },
    note: [-7.0, 0.4, -0.4, 0.8], noteAfterHat: true,
    torso(g, G) { const { X, U } = G; for (const y of [21, 23.2, 25.4]) g.dot(X(15.4), U(y), GOLD[1]); },
    front(g, G) { G.o.broom(g, G); handOver(g, G, 1); handOver(g, G, 2); const f = G.P.frame ? 1 : 0; sparkle(g, f ? 28.6 : 27.8, f ? 9.0 : 11.2, '#e6c8ff'); },
  });
})();
