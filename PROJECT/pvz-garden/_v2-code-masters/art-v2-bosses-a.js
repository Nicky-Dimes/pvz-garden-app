// art-v2-bosses-a.js — PVZ Garden v2 pixel art: the MASTER Zombosses (Zombot, Plank Walker, Gargantuar), 2 frames each.
// PX.BOSS_ART2[id] = { w: 48, h: 48, draw(g, f) }: a 48x48 art-px Grid at k = 2 = a 96x96 LOGICAL canvas (exported as 384x384
// frames). Facing right, standing on row ~94, centred near column 48. Big, toy-like and silly (family rule), with machinery that
// makes sense (the approved sheet: Zombot's dome, the pirate ship with its captain). Canonical ids/designs come from the game:
// 'gargantuar' stays the game's giant zombie with the Imp on his back (the sheet's "Gargantuar Rex" mount is not in the game).
(function () {
  'use strict';
  const V = PX.v2, { ell, poly, rect, px, piece, cel, round, line, bres, ramp, mix, OUT, WHITE } = V;
  const BA = PX.BOSS_ART2, Z = PX.v2Z;
  const METAL = ['#f2f0fa', '#c4bfe0', '#958fc0', '#686296', '#433e6c'];
  const STEEL = ['#ffffff', '#dfe3ee', '#b3b9cc', '#80879e', '#545a70'];
  const RED = ['#ffb4ac', '#f4564c', '#cc2c3c', '#8e1c30', '#5a1022'];
  const GLASS = ['#ffffff', '#e2f8ff', '#b4e6fa', '#7cc0e4', '#4f8cba'];
  const GOLD = ['#fff6b8', '#ffd54a', '#f2a82a', '#b8701c', '#7a4412'];
  const BRAIN = ['#ffe0ec', '#ffb0cc', '#f283aa', '#c45a84', '#86365a'];
  const WOOD = ['#f6d39c', '#d9a064', '#ad7442', '#7c4c2a', '#4e2c18'];
  const SAIL = ['#ffb0a0', '#e85a48', '#c23834', '#8a2228', '#56141c'];

  // a zombie head for a pilot: centre (cx, cy), radius r, o = { brain: true (exposed brain), mad: true, patch: 'left', beard, mouth }
  function pilotHead(g, cx, cy, r, f, o) {
    o = o || {}; const SK = Z.SKIN;
    piece(g, t => { ell(t, cx, cy, r, r - 1, SK[2]); ell(t, cx + r * 0.35, cy + r * 0.55, r * 0.6, r * 0.42, SK[2]); round(t, SK, { cx: cx - 1, cy: cy - 1, rx: r, ry: r, spec: [-0.4, -0.55, 0.16, 0.1] }); });
    if (o.brain) piece(g, t => {
      ell(t, cx - 1, cy - r * 0.55, r * 0.78, r * 0.48, BRAIN[2]);
      round(t, BRAIN, { cx: cx - 1, cy: cy - r * 0.55, rx: r * 0.78, ry: r * 0.48, spec: [-0.4, -0.5, 0.2, 0.15] });
      for (const dx of [-0.4, 0, 0.4]) bres(t, cx - 1 + dx * r, cy - r * 0.95, cx - 1 + dx * r * 0.7 + 1, cy - r * 0.35, BRAIN[3]);
    });
    const er = Math.max(4, Math.round(r * 0.4)), ey = Math.round(cy + (o.brain ? 1 : 0));
    V.eye(g, Math.round(cx - er * 0.4 - er), ey - er, er * 2 - 1, er * 2, o.mad ? 'mad' : undefined, -1, Object.assign({ white: true, look: [0.6, 0.1], pupil: 2, skin: SK[2] }, Z.EYE));
    if (o.patch) { ell(g, cx + er * 1.3, ey, er + 0.5, er, '#2a2236'); bres(g, cx - r + 1, ey - er - 2, cx + r - 1, ey - er + 1, '#2a2236'); }
    else V.eye(g, Math.round(cx + er * 1.3 - er), ey - er - 1, er * 2 + 1, er * 2 + 1, o.mad ? 'mad' : undefined, 1, Object.assign({ white: true, look: [0.6, 0.1], pupil: 3, skin: SK[2] }, Z.EYE));
    const mw = Math.round(r * 0.9), mx = Math.round(cx + r * 0.3), my = Math.round(cy + r * 0.52);
    if (o.beard) piece(g, t => { ell(t, cx + r * 0.2, cy + r * 0.85, r * 0.75, r * 0.5, o.beard[2]); cel(t, o.beard, { s: [2, 2], h: [1, 1] }); for (let i = -2; i <= 2; i++) px(t, [[Math.round(cx + r * 0.2 + i * 2), Math.round(cy + r * 1.15)]], o.beard[3]); });
    // gritted teeth: a dark slot with a row of white teeth (a goofy grimace, not scary)
    rect(g, mx - Math.floor(mw / 2), my, mw, 3, '#5a1a2a');
    for (let i = 0; i < mw; i += 2) rect(g, mx - Math.floor(mw / 2) + i, my, 1, 2, WHITE);
    bres(g, mx - Math.floor(mw / 2) - 1, my - 1, mx + Math.ceil(mw / 2), my - 1, OUT); bres(g, mx - Math.floor(mw / 2) - 1, my + 3, mx + Math.ceil(mw / 2), my + 3, OUT);
  }

  // ===================== ZOMBOT =====================
  // A purple-grey mech with red shoulder pads, a glass dome with the zombie pilot (brain showing) inside, a glowing chest core,
  // big three-finger claws, chunky legs with red knee joints and an antenna with a red ball. Frame 1: the claw opens, the core flares.
  BA.zombot = { w: 48, h: 48, draw(g, f) {
    const bob = f ? -1 : 0;
    // back leg + back arm (darker), then the body, front leg, dome, front arm
    const dark = R => R.map(c => mix(c, '#1a1530', 0.2));
    const legP = (x, y0, y1, R) => {
      piece(g, t => { rect(t, x - 5, y0, 10, y1 - y0 - 6, R[2]); cel(t, R, { s: [3, 1], h: [2, 1] }); });
      piece(g, t => { ell(t, x, y0 + Math.round((y1 - y0) * 0.45), 5.5, 4.5, RED[2]); round(t, RED, { cx: x, cy: y0 + (y1 - y0) * 0.45, rx: 5.5, ry: 4.5 }); });
      piece(g, t => { poly(t, [[x - 9, y1], [x + 11, y1], [x + 9, y1 - 7], [x - 7, y1 - 7]], R[2]); cel(t, R, { s: [2, 2], h: [1, 1] }); });
    };
    legP(36, 66 + bob, 92, dark(METAL));
    piece(g, t => { line(t, [[38, 44 + bob], [30, 58 + bob]], 5, dark(METAL)[2]); cel(t, dark(METAL), { s: [2, 2], h: [1, 1] }); });
    // the torso: a big rounded barrel
    piece(g, t => {
      ell(t, 50, 56 + bob, 22, 17, METAL[2]);
      rect(t, 32, 62 + bob, 36, 10, METAL[2]);
      round(t, METAL, { cx: 48, cy: 54 + bob, rx: 23, ry: 19, spec: [-0.5, -0.55, 0.16, 0.1] });
      // panel seams and rivets
      bres(t, 33, 66 + bob, 67, 66 + bob, METAL[3]);
      for (const x of [36, 44, 56, 64]) px(t, [[x, 69 + bob]], METAL[1]);
    });
    // the glowing core
    piece(g, t => { ell(t, 54, 58 + bob, 6, 6, f ? '#fff2a0' : GOLD[2]); round(t, f ? ['#ffffff', '#fffbd0', '#fff2a0', '#ffd54a', '#f2a82a'] : GOLD, { cx: 54, cy: 58 + bob, rx: 6, ry: 6, spec: [-0.4, -0.4, 0.3, 0.3] }); });
    piece(g, t => { ell(t, 54, 58 + bob, 8, 8, STEEL[2], 0, (x, y) => Math.hypot(x + 0.5 - 54, y + 0.5 - 58 - bob) > 6.2); cel(t, STEEL, { s: [1, 1], h: [1, 1] }); });
    legP(58, 66 + bob, 92, METAL);
    // shoulder pads
    for (const [x, y, s] of [[31, 44, 0.85], [68, 44, 1]]) piece(g, t => { ell(t, x, y + bob, 9 * s, 8 * s, RED[2]); round(t, RED, { cx: x, cy: y + bob, rx: 9 * s, ry: 8 * s, spec: [-0.45, -0.5, 0.2, 0.14] }); bres(t, x - 6 * s, y + bob + 3, x + 6 * s, y + bob + 3, RED[3]); });
    // the dome: glass over the pilot, a metal collar, the antenna
    piece(g, t => { rect(t, 36, 34 + bob, 28, 6, STEEL[2]); cel(t, STEEL, { s: [2, 1], h: [1, 1] }); for (const x of [39, 45, 51, 57, 61]) px(t, [[x, 36 + bob]], STEEL[4]); });
    piece(g, t => { ell(t, 50, 24 + bob, 15, 13, GLASS[2], 0, (x, y) => y < 36 + bob); round(t, GLASS, { cx: 50, cy: 24 + bob, rx: 15, ry: 13, spec: false, band: [0.7, 0.2, -0.3] }); });
    pilotHead(g, 51, 26 + bob, 9, f, { brain: true, mad: true });
    // glass glints over the pilot (white streaks, upper left)
    for (const [x0, y0, x1, y1] of [[40, 18, 44, 13], [39, 23, 40, 21]]) bres(g, x0, y0 + bob, x1, y1 + bob, WHITE);
    piece(g, t => { rect(t, 49, 8 + bob, 2, 5, STEEL[3]); ell(t, 50, 7 + bob, 3, 3, RED[2]); round(t, RED, { cx: 50, cy: 7 + bob, rx: 3, ry: 3, spec: [-0.4, -0.4, 0.3, 0.3] }); });
    // the front arm and claw (opens on frame 1)
    piece(g, t => { line(t, [[70, 47 + bob], [78, 57 + bob]], 5, METAL[2]); cel(t, METAL, { s: [2, 2], h: [1, 1] }); });
    piece(g, t => { ell(t, 79, 59 + bob, 6, 5, RED[2]); round(t, RED, { cx: 79, cy: 59 + bob, rx: 6, ry: 5 }); });
    const open = f ? 4 : 1;
    for (const [dx, dy, ang] of [[0, -1, -0.5 - open * 0.08], [2, 2, 0.35], [-2, 3, 0.9 + open * 0.08]]) piece(g, t => {
      const bx = 82 + dx, by = 61 + dy + bob, L = 7;
      poly(t, [[bx, by - 2], [bx + Math.cos(ang) * L, by + Math.sin(ang) * L - 1], [bx + Math.cos(ang) * (L + 2), by + Math.sin(ang) * (L + 2) + 1], [bx, by + 2]], STEEL[2]);
      cel(t, STEEL, { s: [1, 1], h: [1, 1] });
    });
  } };

  // ===================== PLANK WALKER =====================
  // A wooden pirate ship riding a wave: two cannon ports, a skull on the bow, a gold anchor, a red sail with a white skull, a
  // lantern on the stern post, and the zombie captain (hat, eye patch, beard) at the wheel. Frame 1: the ship rocks, the sail fills.
  BA.plankwalker = { w: 48, h: 48, draw(g, f) {
    const rock = f ? 1 : 0;
    // mast + sail behind everything
    piece(g, t => { rect(t, 30, 10, 3, 52, WOOD[3]); cel(t, WOOD, { only: WOOD[3], s: [1, 1], h: [1, 1], noDeep: true }); });
    piece(g, t => {
      poly(t, [[16, 14 + rock], [31, 12], [31, 44], [14 + (f ? -2 : 0), 42 + rock]], SAIL[2]);
      cel(t, SAIL, { s: [3, 2], h: [2, 2] });
      // tattered bottom edge
      for (const x of [17, 22, 27]) px(t, [[x, 42 + rock], [x, 41 + rock]], null);
    });
    // the skull and crossbones on the sail
    piece(g, t => {
      ell(t, 23, 24 + rock, 4.5, 4, '#fbf6ea'); rect(t, 21, 27 + rock, 5, 3, '#fbf6ea');
      line(t, [[17, 33 + rock], [29, 38 + rock]], 0.8, '#fbf6ea'); line(t, [[17, 38 + rock], [29, 33 + rock]], 0.8, '#fbf6ea');
      px(t, [[21, 24 + rock], [22, 24 + rock], [24, 24 + rock], [25, 24 + rock]], '#3a2236');
    }, { outline: false });
    // the flag on top
    piece(g, t => { poly(t, [[33, 8], [44, 10 + rock], [33, 13]], SAIL[2]); cel(t, SAIL, { s: [1, 1], h: [1, 1] }); });
    // the captain (behind the rail, from the chest up)
    piece(g, t => { rect(t, 46, 40 + rock, 14, 14, '#4a5a9a'); cel(t, ['#a8b8f0', '#7486c8', '#4a5a9a', '#323e72', '#222a52'], { only: '#4a5a9a', s: [2, 1], h: [1, 1] }); });
    pilotHead(g, 54, 34 + rock, 8, f, { patch: true, beard: ['#f4f2ee', '#d8d4cc', '#b4aea4', '#8a847a', '#5e584f'] });
    // pirate hat with a skull
    piece(g, t => { poly(t, [[43, 29 + rock], [65, 29 + rock], [61, 22 + rock], [56, 20 + rock], [51, 20 + rock], [47, 22 + rock]], '#2e2840'); cel(t, ['#8a80b0', '#5e5684', '#2e2840', '#201c30', '#141020'], { only: '#2e2840', s: [2, 1], h: [1, 1] }); });
    px(g, [[53, 24 + rock], [54, 24 + rock], [55, 24 + rock], [53, 25 + rock], [55, 25 + rock], [54, 26 + rock]], '#fbf6ea');
    // the wheel in front of him
    piece(g, t => { ell(t, 62, 48 + rock, 6, 6, WOOD[2], 0, (x, y) => Math.hypot(x + 0.5 - 62, y + 0.5 - 48 - rock) > 3.6); for (let a = 0; a < 6.28; a += 0.785) px(t, [[Math.round(61.5 + Math.cos(a) * 7.5), Math.round(47.5 + rock + Math.sin(a) * 7.5)]], WOOD[2]); ell(t, 62, 48 + rock, 1.6, 1.6, GOLD[2]); cel(t, WOOD, { s: [1, 1], h: [1, 1] }); });
    // the lantern post at the stern
    piece(g, t => { rect(t, 78, 26 + rock, 2, 22, WOOD[3]); rect(t, 75, 20 + rock, 8, 8, GOLD[2]); cel(t, GOLD, { s: [1, 1], h: [1, 1] }); rect(t, 77, 22 + rock, 4, 4, f ? '#fff6b8' : '#ffd54a'); });
    // the hull: a curved wooden hull, planks, cannon ports, bow skull, anchor
    piece(g, t => {
      poly(t, [[8, 50 + rock], [88, 48 - rock], [83, 64], [75, 77], [19, 77], [11, 64]], WOOD[2]);
      cel(t, WOOD, { s: [3, 3], h: [2, 2] });
      for (const y of [56, 62, 68, 74]) bres(t, 10, y + rock - (y > 60 ? 0 : 0), 88, y - rock, WOOD[3]);
      rect(t, 8, 48 + rock, 80, 3, WOOD[1]); bres(t, 8, 51 + rock, 88, 51 - rock, WOOD[3]);
    });
    for (const cx of [32, 48]) piece(g, t => { ell(t, cx, 62, 4.5, 4.5, STEEL[3]); ell(t, cx, 62, 3, 3, '#1c1828'); px(t, [[cx - 2, 60]], STEEL[1]); });
    piece(g, t => { ell(t, 18, 58 + rock, 4, 3.5, '#fbf6ea'); rect(t, 16, 60 + rock, 5, 2, '#fbf6ea'); px(t, [[17, 58 + rock], [19, 58 + rock]], '#3a2236'); });
    piece(g, t => { rect(t, 65, 58, 2, 11, GOLD[2]); rect(t, 62, 59, 8, 2, GOLD[2]); poly(t, [[60, 67], [72, 67], [66, 72]], GOLD[2]); cel(t, GOLD, { s: [1, 1], h: [1, 1] }); px(t, [[64, 68], [68, 68]], null); });
    // the wave the ship rides: water with foam crests and splash drops
    const W = ['#e8fbff', '#9ee2ff', '#5ab8f0', '#2f86cc', '#1c5894'];
    piece(g, t => {
      for (let x = 4; x < 92; x++) { const top = 79 + Math.round(Math.sin((x + (f ? 6 : 0)) * 0.22) * 2); for (let y = top; y <= 91; y++) t.fset(x, y, y === top ? W[0] : y < top + 3 ? W[1] : y < top + 8 ? W[2] : W[3]); }
    });
    for (const [x, y] of [[8, 74], [88, 72], [12, 70], [84, 76]]) piece(g, t => { ell(t, x + (f ? 1 : 0), y - (f ? 2 : 0), 1.6, 1.8, W[1]); px(t, [[x, y - 1 - (f ? 2 : 0)]], W[0]); });
  } };

  // ===================== GARGANTUAR =====================
  // The giant: a huge hunched body in a torn white vest and patched brown trousers with a rope belt, a small head with a fierce
  // but goofy face, a telephone pole over his shoulder, and the little Imp riding on his back. Frame 1: he raises the pole.
  BA.gargantuar = { w: 48, h: 48, draw(g, f) {
    const SK = Z.SKIN, up = f ? -3 : 0;
    const VEST = ['#ffffff', '#f2efe4', '#d8d2c2', '#a8a090', '#787062'];
    const TROU = ['#c8a070', '#9c7448', '#7a5634', '#553a22', '#382414'];
    // the pole (behind), held over the back shoulder
    piece(g, t => { line(t, [[14, 10 + up], [52, 58]], 3.2, WOOD[2]); cel(t, WOOD, { s: [2, 2], h: [1, 1] }); bres(t, 14, 12 + up, 18, 16 + up, WOOD[3]); });
    piece(g, t => { rect(t, 10, 13 + up, 12, 3, WOOD[3]); cel(t, WOOD, { only: WOOD[3], s: [1, 1], h: [1, 1], noDeep: true }); }); // the crossbar
    // the Imp on his back: a small zombie waving
    piece(g, t => { ell(t, 28, 30, 7, 7, SK[2]); round(t, SK, { cx: 27, cy: 29, rx: 7, ry: 7 }); });
    V.eye(g, 27, 26, 5, 6, undefined, 1, Object.assign({ white: true, look: [0.5, 0], pupil: 2 }, Z.EYE));
    V.mouth(g, 30, 33, 'open', 4, { ink: OUT });
    piece(g, t => { line(t, [[22, 34], [18, 26 + (f ? -3 : 0)]], 1.6, SK[2]); cel(t, SK, { s: [1, 1], h: [1, 1] }); });
    // legs: thick trousers with patches, big bare feet
    for (const [x, d] of [[38, 0.2], [58, 0]]) {
      piece(g, t => { rect(t, x - 7, 70, 14, 15, d ? TROU.map(c => mix(c, '#1a1530', d))[2] : TROU[2]); cel(t, d ? TROU.map(c => mix(c, '#1a1530', d)) : TROU, { s: [3, 1], h: [2, 1] }); });
      piece(g, t => { ell(t, x + 2, 88, 10, 4.5, SK[2]); rect(t, x - 7, 87, 19, 4, SK[2]); round(t, SK, { cx: x + 1, cy: 87, rx: 11, ry: 5.5 }); for (const k of [4, 7, 10]) px(t, [[x + k, 90], [x + k, 89]], SK[3]); });
    }
    piece(g, t => { rect(t, 51, 75, 5, 5, '#c89a60'); px(t, [[52, 76], [54, 78]], '#8a6238'); }, { outline: false });
    // the body: a huge rounded torso in a torn vest, green arms
    piece(g, t => {
      ell(t, 50, 54, 22, 20, VEST[2]);
      rect(t, 32, 62, 36, 12, VEST[2]);
      round(t, VEST, { cx: 48, cy: 52, rx: 23, ry: 22, spec: false });
      // torn holes showing green skin + the rope belt
      for (const [x, y, r] of [[44, 50, 3], [58, 62, 2.5]]) ell(t, x, y, r, r * 0.8, SK[2]);
      for (let x = 30; x < 70; x++) { t.fset(x, 72, x % 3 ? '#c8a24c' : '#8e6a2c'); t.fset(x, 73, x % 3 ? '#a8822c' : '#6e4e1c'); }
    });
    // the head: small for the body, low between the shoulders, a big jaw, angry-goofy brows
    piece(g, t => { ell(t, 66, 34, 10, 9, SK[2]); ell(t, 70, 40, 7, 5, SK[2]); round(t, SK, { cx: 65, cy: 33, rx: 10, ry: 10, spec: [-0.4, -0.5, 0.18, 0.12] }); });
    V.eye(g, 63, 29, 5, 6, 'mad', -1, Object.assign({ white: true, look: [0.6, 0.2], pupil: 2, skin: SK[2] }, Z.EYE));
    V.eye(g, 70, 28, 6, 7, 'mad', 1, Object.assign({ white: true, look: [0.6, 0.2], pupil: 2, skin: SK[2] }, Z.EYE));
    rect(g, 66, 40, 8, 3, '#5a1a2a'); for (let i = 0; i < 8; i += 2) rect(g, 66 + i, 40, 1, 2, WHITE); bres(g, 65, 39, 74, 39, OUT); bres(g, 65, 43, 74, 43, OUT);
    // the front arm: a big fist swinging forward
    piece(g, t => { line(t, [[66, 50], [80, 64 + (f ? -4 : 0)]], 5.5, SK[2]); cel(t, SK, { s: [2, 2], h: [1, 1] }); });
    piece(g, t => { ell(t, 82, 67 + (f ? -4 : 0), 7, 6.5, SK[2]); round(t, SK, { cx: 81, cy: 66 + (f ? -4 : 0), rx: 7, ry: 6.5 }); for (const k of [-3, 0, 3]) px(t, [[85, 66 + k + (f ? -4 : 0)]], SK[3]); });
  } };
})();
