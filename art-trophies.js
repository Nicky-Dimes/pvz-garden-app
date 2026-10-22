// art-trophies.js — PVZ Garden: trophy and medal art, drawn in code in the chibi sticker style (soft brown ink, one soft shade,
// a small highlight, a bold outer edge).
//   PX.trophy(id, scale, { dim }) -> a NEW <canvas> of 48 x 48 pixels (24 x 24 art pixels at 2 fine pixels each) times a
//   whole-number scale. dim: a flat silhouette, for a trophy not won yet. Unknown ids give null.
//   Ids: 'l-<league id>' (a gold cup on a coloured base, one per zombie league), 'c-<cup id>' (a golden flower pot with a
//   flower, one per plant cup), 'z-<zomboss id>' (a gear-rimmed medal on a ribbon, one per Zomboss). PX.TROPHY_IDS lists them.
// Nothing is drawn when this file loads (tools/check_pvz.js runs art files in Node): a trophy is drawn the first time it is
// asked for, and only those 1x pictures are kept (at most two per id: plain and dim).
(function () {
  'use strict';
  if (typeof window === 'undefined' || !window.PX) return;
  const PX = window.PX, INK = PX.INK || '#3a2d34';

  // ---------------- colours ----------------
  const GOLD = ['#fff6c0', '#ffd34a', '#e09a26'], GOLD_IN = '#b8741c', GOLD_LIP = ['#fffbe0', '#ffe27a', '#e8ae3a'];
  const R = {
    green: ['#d4f4a8', '#72c44c', '#3f8a32'], teal: ['#c0f2ea', '#3cbcae', '#1f8478'], blue: ['#cce6ff', '#4e9cf0', '#2a64b8'],
    navy: ['#c4ccf4', '#5e6cd2', '#363f96'], purple: ['#e6ccff', '#9c5cd8', '#5e2c8c'], pink: ['#ffd4e6', '#f274aa', '#b83c74'],
    red: ['#ffcabe', '#e8524c', '#a42a2c'], orange: ['#ffe2b4', '#f28c34', '#b45a1c'], brown: ['#f2d4ac', '#b47c4a', '#7a4a28'],
    sand: ['#fff2c4', '#e6be6c', '#b4863a'], ice: ['#f2fbff', '#a6daf6', '#5a9eda'], grey: ['#f0f2f6', '#a9b1be', '#6a7282'],
    dark: ['#a8acc4', '#535872', '#2e3046'], lime: ['#ecffb4', '#b6e23a', '#76a420'], violet: ['#f0d4ff', '#c47ce8', '#7e3eaa'],
  };
  const LEAF = ['#dcf8b0', '#7ccc54', '#4a9636'], IVORY = ['#fffdf2', '#f4ead2', '#d2c2a0'], WHITE = ['#ffffff', '#f2f6fb', '#c6d2e2'];

  // ---------------- the trophy list ----------------
  // [emblem, colour] per id. Leagues: what the league is about. Cups: a plant thing. Zombosses: their world.
  const LEAGUE = {
    lawn: ['flag', 'red'], backyard: ['bucket', 'grey'], night: ['moon', 'navy'], pool: ['ring', 'blue'], roof: ['roof', 'orange'],
    west: ['hat', 'brown'], egypt: ['pyramid', 'sand'], lostcity: ['gem', 'teal'], pirate: ['anchor', 'dark'], beach: ['wave', 'blue'],
    frost: ['snow', 'ice'], jurassic: ['bone', 'green'], darkages: ['sword', 'purple'], neon: ['note', 'pink'], future: ['gear', 'navy'],
    modern: ['brick', 'red'], icerink: ['cube', 'ice'], seaside: ['shell', 'pink'], caravan: ['cactus', 'sand'], castle: ['castle', 'grey'],
    sky: ['cloud', 'blue'], arcade: ['invader', 'violet'], glacier: ['peak', 'ice'], ruins: ['skull', 'teal'], robo: ['bolt', 'dark'],
    party: ['balloon', 'pink'], royal: ['crown', 'purple'],
  };
  const CUP = {
    seedling: ['sprout', 'green'], sprout: ['leaf', 'lime'], bloom: ['flower', 'pink'], masters: ['star', 'orange'], champion: ['crown', 'red'],
    petal: ['flower', 'violet'], thorn: ['cactus', 'green'], legend: ['star', 'purple'], gardenparty: ['balloon', 'teal'], thunder: ['bolt', 'navy'],
    royalbloom: ['heart', 'red'],
  };
  const BOSS = {
    gargantuar: ['z', 'green'], zombot: ['gear', 'grey'], plankwalker: ['anchor', 'blue'], sphinx: ['pyramid', 'sand'], frostmammoth: ['snow', 'ice'],
    darkdragon: ['flame', 'purple'], warwagon: ['hat', 'brown'], gondola: ['balloon', 'teal'], sharktronic: ['fin', 'navy'], mechasaur: ['bone', 'lime'],
    masher: ['note', 'pink'], tomorrowtron: ['bolt', 'dark'],
  };

  // ---------------- emblems: drawn round (x, y), about 7 art px across at s = 1 ----------------
  const stroke = (t, pts, r0, r1, c) => PX.stroke(t, pts, r0, r1, c);
  const soft = (t, cx, cy, rx, ry, C, o) => (PX.art && PX.art.softBody ? PX.art.softBody(t, cx, cy, rx, ry, C, o) : t.ell(cx, cy, rx, ry, C[1]));
  const EMB = {
    flag(t, P, C) { stroke(t, [P(-2.4, 3.6), P(-2.4, -3.4)], 0.42, 0.42, '#8a5a3a'); t.poly([P(-2, -3.2), P(3.2, -2.4), P(1.8, -0.8), P(3.4, 0.9), P(-2, 0.5)], C[1]); t.poly([P(-2, -3.2), P(3.2, -2.4), P(2.6, -1.8), P(-2, -2.2)], C[0]); },
    bucket(t, P, C) { stroke(t, [P(-2.9, -1.8), P(-2.2, -3.6), P(0, -4.1), P(2.2, -3.6), P(2.9, -1.8)], 0.28, 0.28, C[2]); t.poly([P(-3, -2.2), P(3, -2.2), P(2.3, 3.2), P(-2.3, 3.2)], C[1]); t.poly([P(1.2, -2.2), P(3, -2.2), P(2.3, 3.2), P(1, 3.2)], C[2]); t.ell(P(0, 0)[0], P(0, -2.2)[1], 3.1, 0.8, C[0]); },
    moon(t, P, C) { const [x, y] = P(-0.3, 0); t.ell(x, y, 3.4, 3.4, C[1]); t.ell(x + 1.5, y - 1, 2.7, 2.7, null); t.ell(x - 1.6, y + 0.6, 0.7, 0.7, C[0]); },
    ring(t, P, C) { const [x, y] = P(0, 0.8); t.ell(x, y, 3.6, 2.6, C[1]); t.poly([P(-3.6, 0.4), P(-1.8, 0.4), P(-1.6, 2.4), P(-3.4, 2.2)], '#ffffff'); t.poly([P(1.8, 0.4), P(3.6, 0.4), P(3.4, 2.2), P(1.6, 2.4)], '#ffffff'); t.ell(x, y, 1.5, 0.9, null); const [hx, hy] = P(1.6, -2.2); t.ell(hx, hy, 1.4, 1.3, '#ffe14a'); t.poly([[hx + 1.1, hy - 0.2], [hx + 2.4, hy + 0.2], [hx + 1.1, hy + 0.6]], '#f28c34'); },
    roof(t, P, C) { t.poly([P(1.4, -3), P(2.6, -3), P(2.6, -0.6), P(1.4, -0.6)], C[2]); t.poly([P(-3.9, 0.2), P(0, -3.6), P(3.9, 0.2)], C[1]); t.poly([P(-2.7, 0.2), P(2.7, 0.2), P(2.7, 3.4), P(-2.7, 3.4)], '#fff4e0'); t.poly([P(-0.8, 1.4), P(0.8, 1.4), P(0.8, 3.4), P(-0.8, 3.4)], C[2]); },
    hat(t, P, C) { t.poly([P(-2.1, 1.3), P(-1.9, -2.6), P(-0.5, -1.8), P(0, -2.8), P(0.5, -1.8), P(1.9, -2.6), P(2.1, 1.3)], C[1]); t.poly([P(-2.1, 0), P(2.1, 0), P(2.1, 1.2), P(-2.1, 1.2)], C[2]); const [x, y] = P(0, 1.7); t.ell(x, y, 4, 1.1, C[1]); },
    pyramid(t, P, C) { t.poly([P(-3.9, 3.2), P(0, -3.6), P(3.9, 3.2)], C[1]); t.poly([P(0, -3.6), P(3.9, 3.2), P(0.8, 3.2)], C[2]); t.poly([P(-0.6, -1.8), P(0, -2.9), P(0.3, -1.6)], C[0]); },
    gem(t, P, C) { t.poly([P(-3.2, -1), P(-1.7, -3.2), P(1.7, -3.2), P(3.2, -1), P(0, 3.6)], C[1]); t.poly([P(-3.2, -1), P(3.2, -1), P(1.7, -3.2), P(-1.7, -3.2)], C[0]); t.poly([P(0.6, -1), P(3.2, -1), P(0, 3.6)], C[2]); },
    anchor(t, P, C) { const c = C[1]; stroke(t, [P(0, -2.2), P(0, 3)], 0.45, 0.45, c); stroke(t, [P(-3.1, 0.4), P(-2.5, 2.3), P(0, 3.4), P(2.5, 2.3), P(3.1, 0.4)], 0.45, 0.45, c); stroke(t, [P(-1.7, -1.2), P(1.7, -1.2)], 0.4, 0.4, c); const [x, y] = P(0, -3.1); t.ell(x, y, 1.1, 1.1, c); t.ell(x, y, 0.45, 0.45, null); },
    wave(t, P, C) { t.poly([P(-3.8, 1.2), P(3.8, 1.2), P(3.8, 3.2), P(-3.8, 3.2)], C[1]); stroke(t, [P(-3.4, 1.4), P(-1.8, 0), P(-0.4, -1.8), P(1.3, -2.8), P(3, -2.2), P(2.2, -1), P(1.4, 0.6)], 0.9, 0.7, C[1]); stroke(t, [P(-0.8, -1.4), P(1, -2.4), P(2.4, -2.2)], 0.3, 0.3, '#ffffff'); },
    snow(t, P, C) { const [x, y] = P(0, 0), c = C[2] === R.ice[2] ? '#ffffff' : C[0]; for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3 + Math.PI / 2, dx = Math.cos(a) * 3.6, dy = Math.sin(a) * 3.6; stroke(t, [[x - dx, y - dy], [x + dx, y + dy]], 0.42, 0.42, c); } t.ell(x, y, 1, 1, c); },
    bone(t, P) { stroke(t, [P(-2, 2), P(2, -2)], 0.75, 0.75, IVORY[1]); for (const [a, b] of [[-2.7, 1.5], [-1.5, 2.7], [2.7, -1.5], [1.5, -2.7]]) { const [x, y] = P(a, b); t.ell(x, y, 1, 1, IVORY[1]); } stroke(t, [P(-1.2, 0.6), P(0.6, -1.2)], 0.22, 0.22, '#ffffff'); },
    sword(t, P, C) { t.poly([P(-0.6, 1.2), P(-0.6, -3), P(0, -4), P(0.6, -3), P(0.6, 1.2)], WHITE[1]); stroke(t, [P(-2.1, 1.5), P(2.1, 1.5)], 0.48, 0.48, C[1]); stroke(t, [P(0, 1.9), P(0, 3.1)], 0.42, 0.42, '#8a5a3a'); const [x, y] = P(0, 3.6); t.ell(x, y, 0.65, 0.65, C[1]); },
    note(t, P, C) { stroke(t, [P(-0.6, 2.1), P(-0.6, -2.8)], 0.32, 0.32, C[1]); stroke(t, [P(3.1, 1.3), P(3.1, -3.6)], 0.32, 0.32, C[1]); t.poly([P(-0.9, -3.3), P(3.4, -4.1), P(3.4, -2.7), P(-0.9, -1.9)], C[1]); let [x, y] = P(-1.9, 2.3); t.ell(x, y, 1.4, 1.05, C[1], -0.35); [x, y] = P(1.8, 1.5); t.ell(x, y, 1.4, 1.05, C[1], -0.35); },
    gear(t, P, C) { const [x, y] = P(0, 0); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; t.ell(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 0.85, 0.85, C[1]); } t.ell(x, y, 2.7, 2.7, C[1]); t.ell(x, y, 1.1, 1.1, null); },
    brick(t, P, C) { const rows = [[-3.2, -1.1, [[-3.6, -0.25], [0.25, 3.6]]], [-0.6, 1.5, [[-3.6, -1.95], [-1.45, 1.95], [2.45, 3.6]]], [2, 4, [[-3.6, -0.25], [0.25, 3.6]]]]; for (const [y0, y1, bs] of rows) for (const [a, b] of bs) { t.poly([P(a, y0), P(b, y0), P(b, y1), P(a, y1)], C[1]); t.poly([P(a, y0), P(b, y0), P(b, y0 + 0.5), P(a, y0 + 0.5)], C[0]); } },
    cube(t, P, C) { t.poly([P(-2.8, -1.2), P(1.2, -1.2), P(1.2, 3.2), P(-2.8, 3.2)], C[1]); t.poly([P(-2.8, -1.2), P(-1.2, -3), P(2.8, -3), P(1.2, -1.2)], C[0]); t.poly([P(1.2, -1.2), P(2.8, -3), P(2.8, 1.4), P(1.2, 3.2)], C[2]); stroke(t, [P(-2, 0), P(-2, 1.2)], 0.25, 0.25, '#ffffff'); },
    shell(t, P, C) { const [x, y] = P(0, 0.8); t.ell(x, y, 3.6, 3.2, C[1], 0, (px, py) => py <= y + 1.2); t.poly([P(-1.2, 1.6), P(1.2, 1.6), P(0.8, 3.2), P(-0.8, 3.2)], C[1]); for (const a of [-2.2, -1.1, 0, 1.1, 2.2]) stroke(t, [P(0, 2.2), P(a * 1.25, -1.6 + Math.abs(a) * 0.35)], 0.2, 0.2, C[2]); },
    cactus(t, P) { stroke(t, [P(-0.4, 0.8), P(-2.4, 0.8), P(-2.4, -1.4)], 0.72, 0.72, LEAF[1]); stroke(t, [P(0.4, -0.2), P(2.4, -0.2), P(2.4, -2.2)], 0.72, 0.72, LEAF[1]); stroke(t, [P(0, 3.4), P(0, -2.6)], 1.15, 1.05, LEAF[1]); stroke(t, [P(-0.3, -1.6), P(-0.3, 0.6)], 0.2, 0.2, LEAF[0]); const [x, y] = P(0, -3.6); t.ell(x, y, 0.8, 0.7, '#ff8fb4'); },
    castle(t, P, C) { t.poly([P(-3.6, -0.6), P(3.6, -0.6), P(3.6, 3.4), P(-3.6, 3.4)], C[1]); for (const a of [-3.6, -0.7, 2.2]) t.poly([P(a, -2.4), P(a + 1.4, -2.4), P(a + 1.4, -0.4), P(a, -0.4)], C[1]); const [x, y] = P(0, 2.4); t.ell(x, y, 1.1, 1.5, C[2], 0, (px, py) => py <= y + 1); t.poly([P(-2.6, 0.4), P(-1.8, 0.4), P(-1.8, 1.4), P(-2.6, 1.4)], C[2]); t.poly([P(1.8, 0.4), P(2.6, 0.4), P(2.6, 1.4), P(1.8, 1.4)], C[2]); },
    cloud(t, P) { for (const [a, b, rx, ry] of [[-1.8, 0.9, 1.9, 1.6], [0.5, -0.4, 2.2, 2.1], [2.3, 1.1, 1.6, 1.4]]) { const [x, y] = P(a, b); t.ell(x, y, rx, ry, WHITE[1]); } t.poly([P(-3.4, 1), P(3.6, 1), P(3.4, 2.5), P(-3.2, 2.5)], WHITE[1]); stroke(t, [P(-1, 2.1), P(3, 2.1)], 0.35, 0.35, WHITE[2]); },
    invader(t, P, C) { const rows = ['..#.....#..', '...#...#...', '..#######..', '.##.###.##.', '###########', '#.#######.#', '#.#.....#.#', '...##.##...']; const q = 0.68; rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') { const [x, y] = P((i - 5.5) * q, (j - 4) * q); t.poly([[x, y], [x + q, y], [x + q, y + q], [x, y + q]], C[1]); } }); },
    peak(t, P, C) { t.poly([P(-3.9, 3.2), P(-1.2, -2.8), P(0.5, -0.6), P(1.8, -2.2), P(3.9, 3.2)], C[1]); t.poly([P(-1.2, -2.8), P(-2.4, -0.2), P(-1.2, -0.8), P(-0.2, 0.1), P(0.5, -0.6)], '#ffffff'); t.poly([P(1.8, -2.2), P(1, -1), P(1.8, -0.6), P(2.6, -0.8)], '#ffffff'); t.poly([P(0.5, -0.6), P(3.9, 3.2), P(1.6, 3.2)], C[2]); },
    skull(t, P, C) { const [x, y] = P(0, -0.6); t.ell(x, y, 3.2, 2.9, C[1]); t.poly([P(-1.8, 1.2), P(1.8, 1.2), P(1.4, 3.3), P(-1.4, 3.3)], C[1]); t.ell(x - 1.3, y + 0.2, 0.95, 1.05, INK); t.ell(x + 1.3, y + 0.2, 0.95, 1.05, INK); t.ell(x - 1.6, y - 0.2, 0.3, 0.3, '#ffffff'); t.ell(x + 1, y - 0.2, 0.3, 0.3, '#ffffff'); t.poly([P(-0.35, 1.2), P(0.35, 1.2), P(0, 0.6)], INK); },
    bolt(t, P) { t.poly([P(1, -3.9), P(-2.5, 0.6), P(-0.3, 0.6), P(-1.1, 3.9), P(2.5, -0.8), P(0.2, -0.8)], '#ffe14a'); t.poly([P(1, -3.9), P(-1.6, -0.4), P(-0.6, -0.4)], '#fff8b8'); },
    balloon(t, P, C) { stroke(t, [P(0, 2), P(-0.5, 3), P(0.4, 3.9)], 0.18, 0.18, INK); const [x, y] = P(0, -1); t.ell(x, y, 2.7, 3.1, C[1]); t.poly([P(-0.6, 2), P(0.6, 2), P(0, 1.2)], C[1]); t.ell(x - 1.1, y - 1.3, 0.6, 0.9, C[0], -0.4); },
    crown(t, P, C) { t.poly([P(-3.5, 2.6), P(-3.7, -1.9), P(-1.7, -0.1), P(0, -3.1), P(1.7, -0.1), P(3.7, -1.9), P(3.5, 2.6)], C[1]); t.poly([P(-3.5, 1.4), P(3.5, 1.4), P(3.5, 2.6), P(-3.5, 2.6)], C[2]); for (const a of [-2.2, 0, 2.2]) { const [x, y] = P(a, 0.6); t.ell(x, y, 0.55, 0.55, '#ffffff'); } },
    leaf(t, P) { const [x, y] = P(0, 0); t.ell(x, y, 3.8, 1.9, LEAF[1], -0.7); stroke(t, [P(-2.4, 2.4), P(2, -1.8)], 0.2, 0.2, LEAF[2]); t.ell(x - 1, y - 0.4, 1, 0.5, LEAF[0], -0.7); },
    sprout(t, P) { stroke(t, [P(0, 3.6), P(0, -0.2)], 0.42, 0.42, LEAF[2]); let [x, y] = P(-1.8, -0.8); t.ell(x, y, 2.1, 1.1, LEAF[1], 0.5); [x, y] = P(1.8, -1.6); t.ell(x, y, 2.1, 1.1, LEAF[1], -0.5); },
    flower(t, P, C) { const [x, y] = P(0, 0); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; t.ell(x + Math.cos(a) * 2.1, y + Math.sin(a) * 2.1, 1.45, 1.45, C[1]); } t.ell(x, y, 1.3, 1.3, '#ffd84a'); t.ell(x - 0.4, y - 0.4, 0.4, 0.4, '#fff6c0'); },
    star(t, P, C) { const [x, y] = P(0, 0.3); t.poly(PX.starPts(x, y, 4, 1.8, 5), C[1]); t.poly(PX.starPts(x - 0.3, y - 0.3, 1.6, 0.7, 5), C[0]); },
    heart(t, P, C) { let [x, y] = P(-1.4, -0.9); t.ell(x, y, 1.8, 1.8, C[1]); [x, y] = P(1.4, -0.9); t.ell(x, y, 1.8, 1.8, C[1]); t.poly([P(-3.1, -0.4), P(3.1, -0.4), P(0, 3.4)], C[1]); [x, y] = P(-1.7, -1.4); t.ell(x, y, 0.6, 0.5, C[0]); },
    z(t, P, C) { t.poly([P(-2.9, -3.1), P(2.9, -3.1), P(2.9, -1.7), P(-0.5, 1.7), P(2.9, 1.7), P(2.9, 3.1), P(-2.9, 3.1), P(-2.9, 1.7), P(0.5, -1.7), P(-2.9, -1.7)], C[1]); },
    flame(t, P, C) { const [x, y] = P(0, 1.1); t.ell(x, y, 2.7, 2.4, '#f28c34'); t.poly([P(-2.5, 0.6), P(-0.6, -2.4), P(0.2, -1.2), P(1, -4), P(2.5, 0.6)], '#f28c34'); t.ell(x, y + 0.4, 1.4, 1.4, '#ffe14a'); t.poly([P(-1.2, 1), P(0.2, -1.4), P(1.2, 1)], '#ffe14a'); },
    fin(t, P, C) { t.poly([P(-3.6, 2.2), P(0.6, -3.6), P(1.4, -0.6), P(3.6, 2.2)], C[1]); t.poly([P(0.6, -3.6), P(1.4, -0.6), P(3.6, 2.2), P(1.4, 2.2)], C[2]); stroke(t, [P(-3.8, 3), P(-2, 2.4), P(0, 3), P(2, 2.4), P(3.8, 3)], 0.4, 0.4, '#8fd4ff'); },
  };
  const AT = (x, y, s) => (a, b) => [x + a * s, y + b * s];
  function emblem(g, kind, x, y, s, C) { PX.piece(g, t => (EMB[kind] || EMB.star)(t, AT(x, y, s), C)); }

  // ---------------- the three shapes ----------------
  function cup(g, C, em) { // a zombie league: a two-handled gold cup on a coloured base
    PX.piece(g, t => { for (const d of [-1, 1]) { t.ell(12 + d * 7.6, 7.6, 2.9, 3.2, GOLD[1]); t.ell(12 + d * 7.6, 7.6, 1.4, 1.8, null); } });
    PX.piece(g, t => { t.poly([[6.8, 21], [17.2, 21], [17.2, 23.2], [6.8, 23.2]], C[1]); t.poly([[6.8, 22.3], [17.2, 22.3], [17.2, 23.2], [6.8, 23.2]], C[2]); t.poly([[9.4, 21.6], [14.6, 21.6], [14.6, 22.2], [9.4, 22.2]], C[0]); });
    PX.piece(g, t => { t.poly([[8.2, 19], [15.8, 19], [17, 21], [7, 21]], GOLD[1]); t.poly([[13.6, 19], [15.8, 19], [17, 21], [14.4, 21]], GOLD[2]); });
    PX.piece(g, t => { t.poly([[10.8, 14.6], [13.2, 14.6], [12.8, 19], [11.2, 19]], GOLD[1]); t.ell(12, 16.4, 1.9, 0.9, GOLD[1]); t.poly([[12.4, 14.6], [13.2, 14.6], [12.8, 19], [12.2, 19]], GOLD[2]); });
    PX.piece(g, t => soft(t, 12, 5.6, 7.7, 9.6, GOLD, { mask: (x, y) => y >= 3 }));
    PX.piece(g, t => { t.ell(12, 3.2, 7.8, 1.5, GOLD_LIP[1]); t.ell(12, 3.3, 6.5, 0.8, GOLD_IN); });
    emblem(g, em, 12, 8.6, 1, C);
    g.dots([[6.5, 6], [6.5, 6.5], [6.5, 7], [6.5, 7.5], [7, 9], [7, 9.5]], '#fffbe6');
  }
  function pot(g, C, em) { // a plant cup: a golden flower pot with leaves and a flower in the cup's colour
    PX.piece(g, t => { stroke(t, [[12, 10], [12, 5]], 0.45, 0.45, LEAF[2]); t.ell(9.6, 8.2, 2.5, 1.1, LEAF[1], 0.6); t.ell(14.4, 8.2, 2.5, 1.1, LEAF[1], -0.6); });
    PX.piece(g, t => { for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; t.ell(12 + Math.cos(a) * 2.3, 3.9 + Math.sin(a) * 2.2, 1.55, 1.5, C[1]); } t.ell(12, 3.9, 1.35, 1.3, '#ffd84a'); t.ell(11.6, 3.5, 0.45, 0.4, '#fff6c0'); });
    PX.piece(g, t => { t.ell(12, 21.4, 6.6, 1.4, C[2]); t.poly([[6.4, 20.6], [17.6, 20.6], [17.6, 21.6], [6.4, 21.6]], C[1]); t.ell(12, 20.6, 6.6, 1.1, C[1]); });
    PX.piece(g, t => { t.poly([[6.6, 10], [17.4, 10], [15.8, 20.2], [8.2, 20.2]], GOLD[1]); t.poly([[14.6, 10], [17.4, 10], [15.8, 20.2], [13.8, 20.2]], GOLD[2]); t.poly([[7.6, 11], [8.6, 11], [9.2, 17], [8.6, 17]], GOLD[0]); });
    PX.piece(g, t => soft(t, 12, 9.8, 7.4, 1.9, GOLD_LIP, { hl: false }));
    emblem(g, em, 12, 15, 0.72, C);
  }
  function medal(g, C, em) { // a Zomboss: a gear-rimmed gold medal on a two-colour ribbon
    PX.piece(g, t => { t.poly([[6.6, 0.4], [10.6, 0.4], [12.8, 8.6], [9.6, 9.6]], C[1]); t.poly([[8.6, 0.4], [10.6, 0.4], [12.8, 8.6], [11.6, 9]], C[2]); });
    PX.piece(g, t => { t.poly([[13.4, 0.4], [17.4, 0.4], [14.4, 9.6], [11.2, 8.6]], '#ffffff'); t.poly([[15.6, 0.4], [17.4, 0.4], [14.4, 9.6], [13.4, 9.2]], WHITE[2]); });
    PX.piece(g, t => { for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + Math.PI / 12; t.ell(12 + Math.cos(a) * 8.4, 14.6 + Math.sin(a) * 8.4, 1.2, 1.2, GOLD[2]); } soft(t, 12, 14.6, 8.2, 8.2, GOLD); });
    PX.piece(g, t => soft(t, 12, 14.6, 6.1, 6.1, C, { hl: false }));
    emblem(g, em, 12, 14.8, 0.95, em === 'snow' || em === 'bolt' || em === 'bone' || em === 'flame' ? C : [GOLD_LIP[0], '#fff4c0', GOLD[1]]);
    g.dots([[6.5, 11], [6.5, 11.5], [7, 10], [7.5, 9.5]], '#fffbe6');
  }

  // ---------------- PX.trophy ----------------
  const SPEC = {};
  for (const [k, v] of Object.entries(LEAGUE)) SPEC['l-' + k] = [cup, v[0], v[1]];
  for (const [k, v] of Object.entries(CUP)) SPEC['c-' + k] = [pot, v[0], v[1]];
  for (const [k, v] of Object.entries(BOSS)) SPEC['z-' + k] = [medal, v[0], v[1]];
  PX.TROPHY_IDS = Object.keys(SPEC);
  const base = {}; // id + dim -> the 1x picture (at most 2 per id)
  function draw1x(id, dim) {
    const key = id + (dim ? ':d' : ''); if (base[key]) return base[key];
    const S = SPEC[id]; if (!S || !PX.Grid || !PX.piece) return null;
    const g = new PX.Grid(24, 24, 2);
    S[0](g, R[S[2]] || R.green, S[1]);
    g.outerLine();
    if (dim) for (let i = 0; i < g.a.length; i++) { const c = g.a[i]; if (c) g.a[i] = c === INK ? '#4e3e36' : '#8a786a'; }
    return (base[key] = g.canvas());
  }
  PX.trophy = function (id, scale, o) {
    if (typeof document === 'undefined') return null;
    let b; try { b = draw1x(id, !!(o && o.dim)); } catch (e) { return null; }
    if (!b) return null;
    const k = Math.max(1, Math.round(scale || 1)), c = document.createElement('canvas');
    c.width = b.width * k; c.height = b.height * k;
    const x = c.getContext && c.getContext('2d'); if (!x) return c;
    x.imageSmoothingEnabled = false; x.drawImage(b, 0, 0, c.width, c.height);
    return c;
  };
})();
