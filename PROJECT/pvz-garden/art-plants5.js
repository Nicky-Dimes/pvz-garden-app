// art-plants5.js — PVZ Garden: the newer plants, part 2, in TRUE chibi style (docs/pvz-art-guide.md + docs/chibi-reference.js).
// Pepper-pult, Stunion, Red Stinger, Electric Currant, Endurian, Citron, E.M.Peach, Celery Stalker, Guacodile, Banana Launcher,
// Moonflower, Magnifying Grass, Shadow-shroom, Hurrikale, Fire Peashooter.
// Same contract as art-plants.js: PX.PLANT_ART[id] = function (g, stage, P, C) -> geometry, PX.PLANT_PAL[id] = palette.
// The chibi template: the head IS the character (radius about 8 / 9 / 10 by stage, its bottom near row 26), sitting on two little
// base leaves (or floating), big glossy eyes set low and wide (PX.art.chibiEyes), a tiny mouth, blush, flat pastel colour with one
// soft shade (PX.art.softBody, or blob() below for shapes made of 2-3 ellipses). Each plant keeps its own gently off-round silhouette.
(function () {
  'use strict';
  if (!window.PX || !PX.art) return;
  const ART = PX.PLANT_ART, PAL = PX.PLANT_PAL, A = PX.art;
  const { INK, stroke } = PX;
  const { piece, mixHex } = A;
  const R = Math.round, PI = Math.PI, cos = Math.cos, sin = Math.sin;
  const WHITE = '#ffffff';
  const SIZE = [8, 9, 10];                                  // head radius by stage
  const flat = M => [M[1], M[1], M[2]];                     // flat fill + one soft shade (small parts)
  const mix = (M, c, k) => M.map(x => mixHex(x, c, k));
  const fm = fn => { fn.fine = true; return fn; };          // a mask checked at fine-pixel precision
  const LEAF = ['#d2f4ac', '#8fd46e', '#68b058'];           // the shared pastel leaf green
  const FLAME = ['#fff4b8', '#ffd25e', '#ff9e58'];
  const PLASMA = ['#f2fdff', '#9ce4ff', '#5aaee8'];
  const STEEL = ['#f4f7fc', '#c8d0de', '#98a2b8'];

  // ---------------- shared bits ----------------
  const hopOf = P => (P.walk && P.frame ? -1.5 : P.arms === 'up' ? -1 : 0);                         // walking = a hop
  const floatOf = P => (P.walk ? (P.frame ? -1.8 : 0) : P.arms === 'up' ? -1.2 : P.frame ? -0.5 : 0); // floaters bob
  // grumpy plants: a cute scowl unless the pose asks for another feeling
  const madMood = e => (e === 'happy' || e === 'closed' || e === 'blink' || e === 'sleepy' || e === 'sad' ? e : 'mad');
  const madMouth = m => (m == null ? 'frown' : m === 'open' ? 'grin' : m);
  // big chibi eyes (art director v3: w 0.48 r, h 0.64 r, sp 0.86 r) — r is the radius of the FACE area
  function eyes(g, ex, ey, r, mood, o) { A.chibiEyes(g, ex, ey, Object.assign({ sp: r * 0.86, w: r * 0.48, h: r * 0.64, mood }, o || {})); }
  // the whole face: eyes centred at (ex, ey), a tiny mouth at ey + 0.48 r (kind null = no mouth), blush at ey + 0.42 r
  function chibiFace(g, ex, ey, r, mood, mouth, o) {
    o = o || {};
    eyes(g, ex, ey, r, mood, o.eye);
    if (mouth) A.chibiMouth(g, ex + (o.mx || 0), ey + r * (o.my || 0.48), mouth, o.mw || Math.min(2.6, Math.max(1.9, r * 0.27)));
    if (o.blush !== false) A.blush(g, ex - 0.2, ey + r * 0.42, Object.assign({ sp: r * 1.0 }, o.blush || {}));
  }
  function topOf(g) { const K = g.k || 1; for (let fy = 0; fy < g.fh; fy++) for (let fx = 0; fx < g.fw; fx++) if (g.fget(fx, fy) !== null) return Math.floor(fy / K); return g.h; }
  // two little round base leaves (they lift a bit for a cheer)
  function baseLeaves(g, P, L, x0, x1, w) {
    const up = P.arms === 'up', a = up ? 0.5 : 0.22, dy = up ? -0.4 : 0;
    x0 = x0 == null ? 11.2 : x0; x1 = x1 == null ? 19.4 : x1; w = w || 4.3;
    piece(g, t => { t.ell(x0, 28.7 + dy, w, 1.9, flat(L), -a); t.ell(x1, 28.7 + dy, w, 1.9, flat(L), a); });
  }
  const stemUp = (g, x, y1, col) => piece(g, t => stroke(t, [[x, 28.6], [x - 0.2, y1]], 0.95, 0.95, col));
  // shade the pixels of `base` whose neighbour (dx, dy) fine px down-right falls outside the shape (softBody's crescent, any shape)
  function rimShade(t, base, shade, dx, dy) {
    const W = t.fw, H = t.fh, a = t.a, hit = [];
    for (let fy = 0; fy < H; fy++) for (let fx = 0; fx < W; fx++) {
      const i = fy * W + fx; if (a[i] !== base) continue;
      const x2 = fx + dx, y2 = fy + dy;
      if (x2 >= W || y2 >= H || a[y2 * W + x2] === null) hit.push(i);
    }
    for (const i of hit) a[i] = shade;
  }
  // a soft chibi body made of overlapping ellipses [cx, cy, rx, ry, rot]: flat M[1], one M[2] crescent lower-right, a small M[0]
  // highlight up-left of the first ellipse. Draw it first in its own piece.
  function blob(t, list, M, o) {
    o = o || {};
    for (const [cx, cy, rx, ry, rot] of list) t.ell(cx, cy, rx, ry, M[1], rot || 0, o.mask);
    const [, , rx0, ry0] = list[0], k = t.k || 1, s = o.shade == null ? 0.16 : o.shade;
    rimShade(t, M[1], M[2], Math.max(1, R(rx0 * s * k)), Math.max(1, R(ry0 * s * 1.15 * k)));
    if (o.hl !== false) {
      const [cx, cy, rx, ry, rot] = o.hlAt || list[0], m = fm((x, y) => t.get(x, y) === M[1]);
      t.ell(cx - rx * 0.4, cy - ry * 0.48, Math.max(0.6, rx * 0.24), Math.max(0.45, ry * 0.14), M[0], (rot || 0) - 0.55, m);
    }
  }
  // a leaf shape from (x, y): length len, angle ang (0 = right, negative = up), width fat * len
  const lf = (t, x, y, len, ang, col, fat) => t.ell(x + cos(ang) * len / 2, y + sin(ang) * len / 2, len / 2, len * (fat || 0.3), col, ang);
  // a sharp two-tone spike / petal from (x, y): the half facing up-left is lit (c1), the other half shaded (c2)
  function spike(t, x, y, len, ang, w, c1, c2) {
    const c = cos(ang), s = sin(ang), nx = -s * w, ny = c * w, tip = [x + c * len, y + s * len], m = [x + c * len * 0.36, y + s * len * 0.36];
    const lit = nx + ny > 0 ? c1 : c2, dim = nx + ny > 0 ? c2 : c1;
    t.poly([[x - nx * 0.7, y - ny * 0.7], [m[0] - nx, m[1] - ny], tip, [x, y]], lit);
    t.poly([[x, y], tip, [m[0] + nx, m[1] + ny], [x + nx * 0.7, y + ny * 0.7]], dim);
  }
  // a flame from its base (x, y): height h, half width w, leaning by ang (0 = straight up, negative = toward the back). Flickers with f.
  function flame(t, x, y, h, w, f, ang, F) {
    F = F || FLAME; ang = ang || 0;
    const c = cos(ang), s = sin(ang), Q = (u, v) => [x + u * c + v * s, y + u * s - v * c], sw = f ? 1 : -1;
    const tear = (W, H, col) => { const o = Q(0, W * 0.95); t.ell(o[0], o[1], W, W * 0.95, col); t.poly([Q(-W * 0.97, W * 0.85), Q(W * 0.97, W * 0.85), Q(sw * W * 0.3, H)], col); };
    tear(w, h, F[2]);
    t.poly([Q(-w * 0.9, w * 0.7), Q(-w * 0.1, w * 1.5), Q(-w * 1.35, h * (f ? 0.64 : 0.52))], F[2]);
    t.poly([Q(w * 0.9, w * 0.7), Q(w * 0.1, w * 1.5), Q(w * 1.3, h * (f ? 0.5 : 0.62))], F[2]);
    tear(w * 0.6, h * 0.64, F[1]);
    const o = Q(0, w * 0.55); t.ell(o[0], o[1], w * 0.3, w * 0.28, F[0]);
  }
  // a catapult arm: a chunky leafy stalk from behind the body to a leaf scoop holding the ammo (ammo(g) draws its own pieces)
  function pultArm(g, pts, cupX, cupY, cw, L, ammo) {
    piece(g, t => stroke(t, pts, 1.5, 1.2, L[1]));
    if (ammo) ammo(g);
    piece(g, t => {
      t.ell(cupX, cupY, cw, cw * 0.58, flat(L), 0, fm((x, y) => y >= cupY - 0.25));
      t.ell(cupX - cw + 0.6, cupY - 0.8, 1.1, 1.7, L[1], -0.45); // the scoop's curled-up back lip
    });
  }
  // a little outlined lightning bolt (top-left corner x, y; size s)
  const bolt = (t, x, y, s, col) => t.poly([[0, 0], [1.7, 0], [0.8, 1.4], [2, 1.4], [-0.3, 3.9], [0.4, 2.1], [-0.7, 2.1]].map(([a, b]) => [x + a * s, y + b * s]), col);
  // a soft cloud puff (several balls)
  // a puffy cloud: three overlapping balls on a flat-ish bottom (s = size)
  function cloud(t, x, y, s, M) { for (const [dx, dy, k] of [[-1.15, 0.35, 1.05], [1.15, 0.4, 1.0], [0, -0.35, 1.35]]) t.ell(x + dx * s, y + dy * s, k * s, k * s * 0.92, flat(M)); }
  // a thin ring (annulus) round (x, y); half: 'back' = the far (upper) half, 'front' = the near (lower) half, else all of it
  function ring(t, x, y, rx, ry, rot, col, half, th) {
    th = th || 0.7;
    const c = cos(-rot), s = sin(-rot);
    t.ell(x, y, rx, ry, col, rot, fm((px, py) => {
      let dx = px + 0.25 - x, dy = py + 0.25 - y; const X = dx * c - dy * s; dy = dx * s + dy * c; dx = X;
      if ((dx * dx) / ((rx - th) ** 2) + (dy * dy) / ((ry - th) ** 2) <= 1) return false;
      return half === 'back' ? dy < 0 : half === 'front' ? dy >= 0 : true;
    }));
  }

  // ======================= Pepper-pult -> Pepper Blaster -> Pepper Inferno =======================
  // A plump orange bell pepper (three soft lobes at the bottom, a green cap and curly stem), grumpy, with a leafy catapult arm lobbing
  // a flaming red pepper. Blaster: two leaves on its cap and a bigger fire; Inferno: a crown of flames round its cap.
  PAL.pepperpult = { main: ['#ffe8c8', '#ffbb7c', '#f4955c'], leaf: LEAF, acc: ['#ffc8b8', '#fc8474', '#e2605a'], stem: '#72bb5a', root: '#a8865a', part: 'basket' };
  function pepperAmmo(g, x, y, r, f, C, stage) {
    piece(g, t => flame(t, x + r * 0.15, y - r * 0.5, r * [1.9, 1.75, 1.45][stage] + 0.6, r * 0.78, f, 0.2));
    piece(g, t => blob(t, [[x, y, r, r * 0.92], [x - r * 0.42, y + r * 0.3, r * 0.6, r * 0.6], [x + r * 0.42, y + r * 0.3, r * 0.6, r * 0.6]], C.acc, { shade: 0.2 }));
    piece(g, t => { t.ell(x - 0.15, y - r * 0.85, r * 0.5, 0.75, C.leaf[1]); stroke(t, [[x - 0.2, y - r * 0.9], [x - 0.6, y - r - 0.9]], 0.42, 0.38, C.stem); });
  }
  ART.pepperpult = function (g, stage, P, C) {
    const M = C.main, L = C.leaf, r = SIZE[stage], f = P.frame ? 1 : 0;
    const rx = r * 1.0, ry = r * 0.93, hx = 17.9, hy = 26.2 - ry + hopOf(P);
    const cw = [3.4, 3.8, 4.0][stage], cupX = hx - rx - [1.9, 2.2, 2.4][stage], cupY = hy - ry * 0.5, ar = [2.1, 2.4, 2.6][stage];
    baseLeaves(g, P, L, 12.4, 21.2);
    pultArm(g, [[hx - 3, hy + 2], [hx - rx + 0.4, hy - ry * 0.1], [cupX + 0.6, cupY + 1.1]], cupX, cupY, cw, L, g2 => pepperAmmo(g2, cupX + 0.3, cupY - ar * 0.75, ar, f, C, stage));
    const capY = hy - ry * 0.93;
    if (stage === 2) for (const [dx, h, w, a, ff] of [[-3.4, 4.2, 1.5, -0.45, !f], [3.2, 4.4, 1.5, 0.45, !f], [-0.2, 5.2, 1.9, 0.05, f]]) piece(g, t => flame(t, hx + dx, capY + 1.6, h, w, ff ? 1 : 0, a));
    piece(g, t => blob(t, [[hx, hy - ry * 0.06, rx, ry * 0.92], [hx - rx * 0.43, hy + ry * 0.32, rx * 0.58, ry * 0.62], [hx + rx * 0.43, hy + ry * 0.32, rx * 0.58, ry * 0.62]], M));
    // the cap: a little green star with a curly stem (Blaster and Inferno grow two leaves out of it)
    piece(g, t => {
      if (stage >= 1) { lf(t, hx - 0.8, capY + 0.4, [0, 4.2, 4.8][stage], PI + 0.35, flat(L), 0.32); lf(t, hx - 0.2, capY + 0.4, [0, 3.8, 4.4][stage], -0.3, flat(L), 0.32); }
      stroke(t, [[hx - 0.6, capY + 0.6], [hx - 0.5, capY - 1.4], [hx + 0.9, capY - 2.4]], 0.8, 0.62, C.stem);
      t.ell(hx - 0.6, capY + 0.7, rx * 0.36, 1.45, flat(L));
      for (const a of [PI - 0.25, -0.25, PI / 2 + 0.6, PI / 2 - 0.6]) lf(t, hx - 0.6, capY + 0.9, 2.8, a, L[1], 0.3);
    });
    const ex = hx + 0.8, ey = hy + ry * 0.16 + 0.3;
    chibiFace(g, ex, ey, r, madMood(P.eyes), madMouth(P.mouth));
    return { hx: R(hx), hy: R(hy), hr: r, top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(capY + 0.6), w: R(rx * 1.4) } };
  };

  // ======================= Stunion -> Big Stunion -> Mega Stunion =======================
  // A wide pink-violet onion with a pointy top and green sprouts, sitting on two leaves; bored half-lidded eyes and a frown. Big: three
  // sprouts and a stink cloud; Mega: four tall sprouts and two clouds.
  PAL.stunion = { main: ['#fde6f2', '#f0b0d2', '#d88ab6'], leaf: LEAF, acc: ['#f8f6fc', '#e6e2f0', '#c6c0d8'], stem: '#72bb5a', root: '#f2e6cc', part: 'bulb' };
  ART.stunion = function (g, stage, P, C) {
    const M = C.main, L = C.leaf, r = SIZE[stage], f = P.frame ? 1 : 0;
    const rx = r * 1.04, ry = r * 0.88, hx = 15.6, hy = 26.3 - ry + hopOf(P), tipY = hy - ry - r * 0.26;
    baseLeaves(g, P, L);
    const SP = [[[-0.7, -1.95, 4.4], [0.7, -1.2, 4]], [[-1.1, -2.15, 4.4], [0, -1.62, 5.2], [1.1, -1.1, 4.4]], [[-1.5, -2.3, 4.4], [-0.5, -1.82, 5], [0.6, -1.36, 4.8], [1.6, -0.9, 4.2]]][stage];
    for (const [dx, a, len] of SP) piece(g, t => lf(t, hx + dx, tipY + 1.6, len, a, flat(L), 0.22));
    if (stage === 2) piece(g, t => cloud(t, 26.9, hy - ry * 0.18 + (f ? -0.5 : 0), 1.4, C.acc)); // a puffy stink cloud
    piece(g, t => {
      t.poly([[hx - rx * 0.56, hy - ry * 0.55], [hx - 1.5, tipY + 2.4], [hx, tipY], [hx + 1.5, tipY + 2.4], [hx + rx * 0.56, hy - ry * 0.55]], M[1]);
      blob(t, [[hx, hy, rx, ry], [hx - 0.2, hy + ry * 0.15, rx * 1.0, ry * 0.85]], M);
    });
    // onion layer lines curving down the sides
    for (const k of [-0.66, 0.84]) { const pts = []; for (let v = -0.55; v <= 0.7; v += 0.12) pts.push([hx + k * rx * Math.sqrt(1 - v * v), hy + v * ry]); for (let i = 1; i < pts.length; i++) stroke(g, [pts[i - 1], pts[i]], 0.24, 0.24, mixHex(M[1], M[2], 0.75)); }
    const ex = hx + 0.8, ey = hy + ry * 0.16;
    chibiFace(g, ex, ey, r, P.eyes || 'sleepy', P.mouth == null ? 'frown' : P.mouth);
    return { hx: R(hx), hy: R(hy), hr: r, top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - ry + 1), w: R(rx * 1.2) } };
  };

  // ======================= Red Stinger -> Crimson Stinger -> Rose Stinger =======================
  // A rosebud: a round red head whose two outer petals wrap up round the face from below (pointed tips, darker inner edges), a crown of
  // SHARP petal tips on top only, angry eyes, on two leaves. Crimson: a taller crown; Rose: a double crown and green sepals.
  PAL.redstinger = { main: ['#ffd4da', '#ff98a6', '#ee7486'], leaf: LEAF, stem: '#72bb5a', root: '#a8865a', part: 'petals' };
  ART.redstinger = function (g, stage, P, C) {
    const M = C.main, L = C.leaf, r = SIZE[stage] * 0.94, rx = r * 1.03, ry = r * 0.97, hx = 15.6, hy = 26.1 - ry + hopOf(P);
    const PB = mix(M, M[2], 0.5), PW = mix(M, '#b84a60', 0.6);
    baseLeaves(g, P, L);
    if (stage === 2) piece(g, t => { lf(t, hx - 2.4, hy + ry - 1.4, 4.4, PI - 0.35, flat(L), 0.3); lf(t, hx + 2.6, hy + ry - 1.4, 4.4, -0.35, flat(L), 0.3); }); // sepals
    // the crown: sharp petal tips across the top half only
    const rows = [[[5, 2.8, 1.9, PB, -PI + 0.66, -0.66]], [[6, 3.4, 2.0, PB, -PI + 0.52, -0.52]], [[7, 3.8, 2.0, PB, -PI + 0.42, -0.42], [4, 2.4, 2.0, M, -PI + 0.98, -0.98]]][stage];
    for (const [n, len, w, PC, a0, a1] of rows) for (let i = 0; i < n; i++) {
      const a = a0 + (a1 - a0) * i / (n - 1), x = hx + cos(a) * rx * 0.62, y = hy + sin(a) * ry * 0.62;
      piece(g, t => spike(t, x, y, r * 0.38 + len, a, w, PC[1], mixHex(PC[1], PC[2], 0.7)));
    }
    piece(g, t => blob(t, [[hx, hy, rx, ry], [hx - 0.2, hy - ry * 0.22, rx * 0.86, ry * 0.78]], M));
    // the outer petals wrapping round the sides of the face: crescents whose inner edges are a darker red
    for (const sd of [-1, 1]) piece(g, t => {
      const erx = rx * 0.9, ery = ry * 0.98, ecy = hy + ry * 0.16, xin = hx + 0.8 + sd * (r * 0.67 + 0.45), ecx = xin - sd * erx; // (inner edge just outside the eye)
      const inE = (x, y) => ((x - ecx) / erx) ** 2 + ((y - ecy) / ery) ** 2 <= 1;
      t.ell(hx, hy, rx + 0.15, ry + 0.1, PB[1], 0, fm((x, y) => !inE(x + 0.25, y + 0.25) && y > hy - ry * 0.62 && sd * (x - hx) > 0));
      rimShade(t, PB[1], PB[2], 2, 2);
      t.ell(hx, hy, rx + 0.15, ry + 0.1, PW[2], 0, fm((x, y) => t.get(x, y) !== null && inE(x + 0.25 - sd * 0.55, y + 0.25)));
    });
    const ex = hx + 0.8, ey = hy + ry * 0.12;
    chibiFace(g, ex, ey, r, madMood(P.eyes), madMouth(P.mouth));
    return { hx: R(hx), hy: R(hy), hr: R(r), top: topOf(g), ey: R(ey), front: R(hx + rx), hat: { x: R(hx), y: R(hy - ry + 1), w: R(rx * 1.3) } };
  };

  // ======================= Electric Currant -> Shock Currant -> Storm Currant =======================
  // A little white ghost of a berry (round top, scalloped hem) with a stem on top, floating over a crackling spark ring, sparking.
  // Shock: more sparks; Storm: two tiny currant buddies float along.
  PAL.electriccurrant = { main: ['#ffffff', '#f6f4ff', '#d4ccf2'], leaf: LEAF, acc: ['#fffbd0', '#ffe66a', '#f4c44a'], stem: '#a8865a', part: 'berry' };
  function ghost(t, cx, cy, rx, ry, M, f, hl) {
    const sk = ry * 0.62, br = rx / 3;
    const list = [[cx, cy, rx, ry]];
    for (let i = 0; i < 3; i++) list.push([cx - rx + br + i * 2 * br, cy + sk + (i === 1 ? (f ? 0.25 : -0.15) : (f ? -0.15 : 0.2)), br, br * 1.05]);
    t.poly([[cx - rx, cy], [cx + rx, cy], [cx + rx, cy + sk], [cx - rx, cy + sk]], M[1]);
    blob(t, list, M, { hl });
  }
  ART.electriccurrant = function (g, stage, P, C) {
    const M = C.main, Z = C.acc, r = SIZE[stage] * 0.9, f = P.frame ? 1 : 0, fl = floatOf(P);
    const rx = r * 0.98, ry = r * 0.88, hx = 15.8, hy = 25.4 - ry * 0.62 - rx / 3 - 1 + fl;
    piece(g, t => { // it floats: little sparks crackle underneath (over a soft glow, added last)
      for (const [x, y, k] of f ? [[12.4, 27.4, 1], [19.8, 28.2, 0.8], [16.2, 29, 0.7]] : [[12.8, 28.2, 0.8], [19.4, 27.4, 1], [15.8, 28.8, 0.7]]) t.poly(PX.starPts(x, y, 1.35 * k, 0.5 * k, 4), Z[1]);
    });
    const sp = [[[hx + rx + 1.2, hy - 3]], [[hx + rx + 1.2, hy - 3], [hx - rx - 3, hy + 1]], [[hx + rx + 0.8, hy - 4.6], [hx - rx - 2.4, hy - 3.4]]][stage];
    sp.forEach(([x, y], i) => piece(g, t => bolt(t, Math.max(0.6, Math.min(x, 29.6)), y + ((i + f) % 2 ? -0.8 : 0), 0.85, Z[1])));
    if (stage === 2) for (const [x, y] of [[Math.max(2.6, hx - rx - 2.9), hy + ry * 0.55 - (f ? 0.6 : 0)], [Math.min(29.2, hx + rx + 3.1), hy + ry * 0.2 - (f ? 0 : 0.6)]]) {
      piece(g, t => ghost(t, x, y, 2.3, 2, M, f, false));
      A.chibiEyes(g, x + 0.3, y + 0.3, { sp: 1.6, w: 0.9, h: 1.2, mood: 'happy' });
    }
    piece(g, t => { stroke(t, [[hx + 0.3, hy - ry + 1], [hx + 0.5, hy - ry - 1.2], [hx + 1.7, hy - ry - 2.3]], 0.6, 0.48, C.stem); lf(t, hx + 0.6, hy - ry - 1, [2.8, 3.2, 3.6][stage], -2.55, flat(C.leaf), 0.34); });
    piece(g, t => ghost(t, hx, hy, rx, ry, M, f));
    const ex = hx + 0.8, ey = hy + ry * 0.22;
    chibiFace(g, ex, ey, r, P.eyes, P.mouth || 'smile', { my: 0.46 });
    // the soft hover glow: see-through, so the bold edge skips it; painted only on empty pixels, so it sits behind the sparks
    const gw = [4.8, 5.4, 6][stage] - (fl < -1 ? 0.6 : 0), empty = fm((x, y) => g.get(x, y) === null);
    g.ell(16, 28.4, gw, 1.4, 'rgba(255,240,150,0.45)', 0, empty);
    g.ell(16, 28.4, gw + 1.4, 2.0, 'rgba(255,240,150,0.25)', 0, empty);
    return { hx: R(hx), hy: R(hy), hr: R(r), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - ry + 1), w: R(rx * 1.3) } };
  };

  // ======================= Endurian -> Spiky Endurian -> King Endurian =======================
  // A round khaki-amber durian: short chunky cone spikes all round its silhouette and little spike bumps on the husk, grumpy, no mouth,
  // on two leaves. Spiky: more, longer spikes; King: three big crown spikes on top.
  PAL.endurian = { main: ['#f6e6a4', '#e2c874', '#bea054'], leaf: LEAF, acc: ['#fbefb4', '#ecd480', '#c8a858'], stem: '#8a9a4a', part: 'spikes' };
  ART.endurian = function (g, stage, P, C) {
    const M = C.main, L = C.leaf, r = SIZE[stage] * 0.86;
    const rx = r * 1.04, ry = r * 0.97, hx = 15.8, hy = 26.4 - ry + hopOf(P);
    const n = [14, 16, 16][stage], sl = [1.7, 2.1, 2.2][stage], SPK = mix(M, M[2], 0.35);
    baseLeaves(g, P, L);
    for (let i = 0; i < n; i++) { // cone spikes all round the edge (not underneath, where it sits)
      const a = -PI / 2 + (i - (n - 1) / 2) * (2 * PI * 0.82) / (n - 1);
      if (sin(a) > 0.7) continue;
      const big = stage === 2 && (Math.abs(i - (n - 1) / 2) < 1 || Math.abs(Math.abs(i - (n - 1) / 2) - 2) < 0.6);
      const x = hx + cos(a) * rx * 0.86, y = hy + sin(a) * ry * 0.86, S = big ? C.acc : SPK, len = rx * 0.14 + sl + (big ? 2 : 0);
      piece(g, t => spike(t, x, y, len, a, big ? 1.9 : 1.45, S[1], mixHex(S[1], S[2], 0.85)));
    }
    piece(g, t => blob(t, [[hx, hy, rx, ry], [hx - 0.3, hy + ry * 0.12, rx * 0.98, ry * 0.86]], M));
    // little triangular spike bumps on the husk (lit face + shade side), kept off the face
    const bumps = [[-0.62, -0.5], [-0.15, -0.74], [0.42, -0.66], [-0.82, 0.02], [-0.66, 0.5], [0.8, -0.2]].slice(0, [4, 5, 6][stage]);
    for (const [dx, dy] of bumps) {
      const x = hx + dx * rx, y = hy + dy * ry;
      g.poly([[x - 0.85, y + 0.6], [x, y - 0.95], [x, y + 0.6]], mixHex(M[1], M[0], 0.6));
      g.poly([[x, y - 0.95], [x + 0.85, y + 0.6], [x, y + 0.6]], M[2]);
    }
    const ex = hx + 0.8, ey = hy + ry * 0.2;
    chibiFace(g, ex, ey, r, madMood(P.eyes), null); // (never a mouth)
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - ry - 0.5), w: R(rx * 1.3) } };
  };

  // ======================= Citron -> Citron Blaster -> Citron Prime =======================
  // A round orange citrus with a leaf on top, determined eyes under green slanted marks, floating on a blue plasma jet. Blaster: a
  // glowing plasma ball in front; Prime: a silver band round its middle and a bigger plasma charge.
  PAL.citron = { main: ['#ffe6bc', '#ffbc6e', '#f49a4c'], leaf: LEAF, acc: PLASMA, stem: '#9a8a4a', part: 'beam' };
  ART.citron = function (g, stage, P, C) {
    const M = C.main, L = C.leaf, r = SIZE[stage] * 0.92, f = P.frame ? 1 : 0, fl = floatOf(P);
    const rx = r * 1.04, ry = r * 0.97, hx = 15.2, hy = 24.2 - ry + fl;
    piece(g, t => flame(t, hx - 0.6, hy + ry - 1.2, [5.2, 5.6, 6][stage] + (f ? 0.5 : 0) - fl * 0.4, [2.2, 2.4, 2.6][stage], f, PI, C.acc)); // the plasma jet
    if (stage >= 1) { // a plasma ball charging in front
      const pr = [0, 1.9, 2.5][stage], px = Math.min(hx + rx + pr + 0.6, 30.2 - pr - 1.2), py = hy + ry * 0.36;
      piece(g, t => t.ell(px, py, pr + 0.9 + (f ? 0.3 : 0), pr + 0.9 + (f ? 0.3 : 0), C.acc[1]));
      piece(g, t => blob(t, [[px, py, pr, pr]], [WHITE, C.acc[0], C.acc[1]], { shade: 0.2 }));
    }
    piece(g, t => { stroke(t, [[hx + 0.4, hy - ry + 1], [hx + 0.8, hy - ry - 1.4]], 0.7, 0.6, C.stem); lf(t, hx + 0.8, hy - ry - 0.8, [3.6, 4, 4.4][stage], -0.5, flat(L), 0.34); });
    piece(g, t => blob(t, [[hx, hy, rx, ry], [hx + rx * 0.08, hy - ry * 0.55, rx * 0.36, ry * 0.5]], M));
    if (stage === 2) piece(g, t => { const by = hy + ry * 0.66; blob(t, [[hx, hy, rx + 0.3, ry + 0.3]], STEEL, { hl: false, mask: fm((x, y) => y >= by && y <= by + 1.6) }); });
    for (const [dx, dy] of [[-0.62, -0.3], [-0.34, -0.66], [-0.76, 0.24]]) g.dots([[hx + dx * rx, hy + dy * ry], [hx + dx * rx + 0.5, hy + dy * ry]], M[2]); // peel dimples
    if (stage === 2) for (const k of [-0.6, -0.1, 0.4]) g.dots([[hx + k * rx, hy + ry * 0.66 + 0.8], [hx + k * rx + 0.5, hy + ry * 0.66 + 0.8]], '#7a8498');
    const ex = hx + 0.8, ey = hy + ry * 0.16, sp = r * 0.86, w = r * 0.48, h = r * 0.64;
    chibiFace(g, ex, ey, r, P.eyes, P.mouth === 'open' || P.mouth === 'o' || P.mouth === 'grin' ? 'o' : null);
    if (P.eyes !== 'happy' && P.eyes !== 'closed') for (const s of [-1, 1]) { // the green slanted marks
      const x = ex + s * sp / 2, y = ey - h / 2 - 1.1;
      stroke(g, [[x + s * w * 0.7, y - 0.55], [x - s * w * 0.5, y + 0.45]], 0.5, 0.42, '#72c25a');
    }
    return { hx: R(hx), hy: R(hy), hr: R(r), top: topOf(g), ey: R(ey), front: R(hx + rx + 2), hat: { x: R(hx), y: R(hy - ry + 1), w: R(rx * 1.3) } };
  };

  // ======================= E.M.Peach -> Mega Peach -> Ultra Peach =======================
  // A soft peach (a gentle cleft at the top, a seam, a leaf) with big sparkly eyes and a short ANTENNA: a grey stalk with a blue ball
  // and a ring. Mega: a bigger ball and ring; Ultra: two rings and sparks.
  PAL.empeach = { main: ['#ffe6da', '#ffb09a', '#f08a7a'], leaf: LEAF, acc: ['#eafaff', '#86d0f8', '#5a9ee0'], stem: '#a6aec2', part: 'bolt' };
  ART.empeach = function (g, stage, P, C) {
    const M = C.main, L = C.leaf, Bl = C.acc, r = SIZE[stage], f = P.frame ? 1 : 0;
    const rx = r * 1.04, ry = r * 0.91, hx = 15.8, hy = 26.3 - ry + hopOf(P), dipY = hy - ry + 1.1;
    const ax = hx + 0.5, br = [1.8, 2, 2.1][stage], ay = dipY - [2.8, 2.8, 2.6][stage] - br;
    baseLeaves(g, P, L);
    const rings = [[[2.9, 1.0, -0.2]], [[3.4, 1.15, -0.2]], [[3.8, 1.2, -0.25], [3.2, 1.05, 0.5]]][stage];
    for (const [rr, ry2, rot] of rings) piece(g, t => ring(t, ax, ay + 0.3, rr, ry2, rot, Bl[1], 'back', 0.6));
    piece(g, t => stroke(t, [[ax - 0.3, dipY + 1.4], [ax, ay + br * 0.5]], 0.75, 0.6, C.stem));
    piece(g, t => blob(t, [[ax, ay, br, br]], Bl, { shade: 0.22 }));
    for (const [rr, ry2, rot] of rings) piece(g, t => ring(t, ax, ay + 0.3, rr, ry2, rot, Bl[1], 'front', 0.6));
    if (stage === 2) for (const [x, y] of f ? [[ax - 5.2, ay - 0.6], [ax + 4, ay + 1.4]] : [[ax + 4.2, ay - 0.8], [ax - 5.4, ay + 1.2]]) piece(g, t => bolt(t, x, y, 0.62, '#ffe66a'));
    piece(g, t => lf(t, hx - 0.5, dipY + 0.6, [3.8, 4.4, 4.8][stage], PI + 0.55, flat(L), 0.34));
    if (stage === 2) piece(g, t => lf(t, hx + 0.8, dipY + 0.6, 3.6, -0.5, flat(L), 0.34));
    piece(g, t => blob(t, [[hx, hy + ry * 0.08, rx, ry * 0.92], [hx - rx * 0.3, hy - ry * 0.1, rx * 0.72, ry * 0.88], [hx + rx * 0.32, hy - ry * 0.08, rx * 0.7, ry * 0.88]], M, { hlAt: [hx - rx * 0.3, hy - ry * 0.1, rx * 0.72, ry * 0.88] }));
    stroke(g, [[hx + 0.1, dipY + 0.6], [hx - rx * 0.14, hy - ry * 0.6], [hx - rx * 0.32, hy - ry * 0.3]], 0.26, 0.26, M[2]); // the peach's seam
    const ex = hx + 0.8, ey = hy + ry * 0.16;
    chibiFace(g, ex, ey, r, P.eyes, P.mouth || 'smile', { eye: { w: r * 0.5, h: r * 0.66 }, blush: { w: 1.7, h: 0.95 } });
    return { hx: R(hx), hy: R(hy), hr: r, top: topOf(g), ey: R(ey), hat: { x: R(hx - 1), y: R(dipY + 0.5), w: R(rx * 1.3) } };
  };

  // ======================= Celery Stalker -> Celery Sneak -> Celery Ninja =======================
  // A bundle of celery stalks popping out of a dirt mound: rounded stalk ends with leafy tufts, pale vertical ridges, and an angry face
  // on the front stalk. Sneak: three stalks; Ninja: taller, with a ninja headband.
  PAL.celerystalker = { main: ['#f4fcd8', '#c8ec96', '#a2cc72'], leaf: LEAF, acc: ['#eecba6', '#cfa47a', '#ae845e'], stem: '#72bb5a', part: 'leafcrown' };
  function celeryLeaves(t, x, y, s, L) { for (const [a, len] of [[-2.35, 3.2], [-1.57, 3.9], [-0.8, 3.2]]) lf(t, x + cos(a) * 0.5, y, len * s, a, flat(L), 0.42); }
  function stalk(t, x, yTop, yBot, w, M) { blob(t, [[x, yTop + w, w, w], [x, (yTop + w + yBot) / 2, w * 0.98, (yBot - yTop - w) / 2 + 0.2]], M, { hlAt: [x, yTop + w, w, w * 1.4] }); }
  function ridges(g, x, yTop, yBot, w, M, ks) { for (const k of ks) stroke(g, [[x + k * w, yBot - 0.6], [x + k * w * 0.92, yTop + w * 0.9]], 0.25, 0.25, mixHex(M[0], WHITE, 0.3)); }
  ART.celerystalker = function (g, stage, P, C) {
    const M = C.main, L = C.leaf, D = C.acc, r = SIZE[stage], hop = hopOf(P);
    const w = r * 0.6, ht = r * [1.86, 1.86, 1.9][stage], hx = 16.3, base = 29.4 + hop, top = base - ht;
    const SM = mix(M, M[2], 0.22), sw = r * 0.42;
    const sides = [[[-w - sw * 0.55, 0.82]], [[-w - sw * 0.55, 0.84], [w + sw * 0.6, 0.76]], [[-w - sw * 0.55, 0.86], [w + sw * 0.6, 0.78]]][stage];
    for (const [dx, k] of sides) {
      const x = hx + dx, yt = base - ht * k;
      piece(g, t => celeryLeaves(t, x, yt + 0.5, 0.85, L));
      piece(g, t => stalk(t, x, yt, base, sw, SM));
      ridges(g, x, yt, base, sw, SM, [0.1]);
    }
    piece(g, t => celeryLeaves(t, hx, top + 0.6, [1.0, 1.08, 1.16][stage], L));
    piece(g, t => stalk(t, hx, top, base, w, M));
    ridges(g, hx, top, base - 4.4, w, M, [-0.55, 0.62]);
    const fr = w * 1.2, ex = hx + 0.5, ey = top + w + r * 0.48;
    if (stage === 2) piece(g, t => { // ninja headband with tails flying back
      const by = ey - fr * 0.32 - 2.5;
      t.ell(hx, by + 0.7, w + 0.25, 1.1, ['#7a6aa8', '#6a5a98', '#4e4078'], 0, fm(x => Math.abs(x - hx) <= w + 0.1));
      stroke(t, [[hx - w + 0.4, by + 0.8], [hx - w - 2.2, by + 0.2], [hx - w - 3.6, by + 1.4]], 0.6, 0.45, '#6a5a98');
      stroke(t, [[hx - w + 0.4, by + 1.1], [hx - w - 1.8, by + 2.6], [hx - w - 2.6, by + 4]], 0.55, 0.4, '#5a4c88');
    });
    piece(g, t => A.softBody(t, 16, 30.4, [8.4, 9.4, 10.2][stage], 3.2, D, { hl: false, mask: fm((x, y) => y <= 30.4) })); // the dirt mound
    g.dots([[11.4, 28.9], [11.9, 28.9], [20.8, 28.7], [21.3, 28.7]], D[0]);
    chibiFace(g, ex, ey, fr, madMood(P.eyes), madMouth(P.mouth), { mw: 2 });
    return { hx: R(hx), hy: R(top + w + 1), hr: R(w), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(top + 1), w: R(w * 1.8) } };
  };

  // ======================= Guacodile -> Guaco-Gator -> Guaco-King =======================
  // An avocado crocodile: a pear-shaped avocado head-body (a pale belly with the brown pit), a long rounded croc snout with little
  // teeth, eye bumps with big YELLOW eyes, bumps down its back. Gator: a curly tail; King: a ridge of spikes.
  PAL.guacodile = { main: ['#dcf2b0', '#a6d27a', '#84b862'], leaf: LEAF, acc: ['#fdfde2', '#f2f4b8', '#d6dc90'], stem: '#72bb5a', part: 'jaws' };
  const PIT = ['#e6b48a', '#c88e62', '#a46e48'];
  function crocEyes(g, ex, ey, r, mood) { // big yellow eyes with dark pupils (lines for the other moods)
    if (mood === 'happy' || mood === 'closed' || mood === 'blink' || mood === 'sleepy') return eyes(g, ex, ey, r, mood);
    const sp = r * 0.86, w = r * 0.24, h = r * 0.31;
    for (const s of [-1, 1]) {
      const x = ex + s * sp / 2;
      g.ell(x, ey, w + 0.4, h + 0.4, INK); g.ell(x, ey, w, h, '#ffe27a');
      g.ell(x, ey, w, h, '#f4c24a', 0, fm((px, py) => py + 0.25 > ey + h * 0.35));
      g.ell(x + 0.35, ey + 0.2, w * 0.52, h * 0.72, A.EYE_INK || '#2b2129');
      g.ell(x - w * 0.15, ey - h * 0.3, Math.max(0.55, w * 0.3), Math.max(0.6, h * 0.24), WHITE);
      g.dot(x + w * 0.45, ey + h * 0.45, WHITE);
    }
    if (mood === 'brave' || mood === 'sad' || mood === 'mad') eyes(g, ex, ey, r, mood, { w: r * 0.01, h: r * 0.62 }); // brows only
  }
  ART.guacodile = function (g, stage, P, C) {
    const M = C.main, L = C.leaf, F = C.acc, r = SIZE[stage], f = P.frame ? 1 : 0;
    const hx = [13.4, 14, 14.4][stage], hy = 26.2 - r * 0.9 + hopOf(P), rx = r * 0.98, ry = r * 0.9;
    const open = P.mouth === 'open' || P.mouth === 'grin';
    baseLeaves(g, P, L, 10.4, 18.4);
    if (stage >= 1) piece(g, t => { // a curly tail behind
      const x0 = hx - rx + 1.6, y0 = hy + ry * 0.55;
      stroke(t, [[x0, y0], [x0 - 2.6, y0 + 0.5], [x0 - 4.2, y0 - 1], [x0 - 3.8, y0 - 2.8]], 1.7, 0.75, M[1]);
      if (stage === 2) for (const [x, y] of [[x0 - 2.4, y0 - 0.9], [x0 - 4.3, y0 - 2.4]]) spike(t, x, y, 1.6, -2.0, 0.8, M[2], M[2]);
    });
    if (stage === 2) for (let i = 0; i < 4; i++) { // a ridge of spikes down the back
      const a = -PI * 0.9 + i * 0.36, x = hx - 0.6 + cos(a) * rx * 0.86, y = hy - ry * 0.12 + sin(a) * ry * 0.86;
      piece(g, t => spike(t, x, y, 2.6, a, 1.25, mixHex(M[1], M[2], 0.4), M[2]));
    }
    // the eye bumps, then head + snout in one piece
    const ex = hx + 1.6, ey = hy - ry * 0.08, sp = r * 0.86;
    piece(g, t => { for (const s of [-1, 1]) t.ell(ex + s * sp / 2, ey - r * 0.3, r * 0.3, r * 0.26, M[1]); });
    const sl = [6, 6.6, 7.2][stage], sh = r * 0.34, sy = hy + ry * 0.3, tip = hx + rx * 0.62 + sl;
    piece(g, t => {
      blob(t, [[hx, hy, rx, ry], [hx - 0.6, hy - ry * 0.12, rx * 0.86, ry * 0.92], [hx + rx * 0.62 + sl * 0.5, sy, sl * 0.62, sh, -0.05]], M);
      for (const a of [-2.55, -2.95, 2.9]) t.ell(hx - 0.6 + cos(a) * rx * 0.86, hy - ry * 0.12 + sin(a) * ry * 0.92, 1.15, 1.05, M[1]); // back bumps
      t.ell(tip - 1.6, sy - sh + 0.15, 1.05, 0.8, M[1]);                                                                           // nostril bump
    });
    // the pale belly with the brown avocado pit
    const bx = hx + 1.6, by = hy + ry * 0.74; // the pale belly (cut avocado) with its brown pit, low under the jaw
    piece(g, t => blob(t, [[bx, by, rx * 0.5, ry * 0.3]], F, { hl: false }));
    piece(g, t => blob(t, [[bx + 0.2, by + 0.2, rx * 0.2, ry * 0.18]], PIT, { shade: 0.2 }));
    // mouth line with little teeth (the lower jaw drops when it chomps)
    const mx0 = hx + rx * 0.5, mx1 = tip - 0.8, my = sy + sh * 0.2;
    if (open) piece(g, t => t.poly([[mx0, my], [mx1 + 0.4, my - 0.2], [mx1, my + 1.6], [mx0 + 0.8, my + 0.9]], '#e8707e'));
    stroke(g, [[mx0, my], [mx1, my - 0.2]], 0.26, 0.26, INK);
    for (let x = mx0 + 1.2; x < mx1 - 0.3; x += 1.5) { const yy = my - 0.2 * (x - mx0) / (mx1 - mx0); g.dots([[x, yy + 0.5], [x + 0.5, yy + 0.5], [x + 0.25, yy + 1]], WHITE); }
    g.dots([[tip - 1.5, sy - sh + 0.6], [tip - 2, sy - sh + 0.6]], M[2]); // nostrils
    crocEyes(g, ex, ey, r, P.eyes === 'brave' ? 'brave' : P.eyes);
    A.blush(g, ex - 0.4, ey + r * 0.4, { sp: r * 1.0, w: 1.3, h: 0.75 });
    void f;
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), front: R(tip + 1), hat: { x: R(hx), y: R(hy - ry + 0.5), w: R(rx * 1.5) } };
  };

  // ======================= Banana Launcher -> Banana Bomber -> Banana Barrage =======================
  // A plump curved yellow banana, its peel opened at the top in three flaps round the cream fruit tip, a happy face, and a leafy
  // launcher arm with banana ammo (Bomber: two bananas; Barrage: a bunch of three).
  PAL.bananalauncher = { main: ['#fff8c8', '#fde27c', '#efc65a'], leaf: LEAF, acc: ['#fffef6', '#fdf4da', '#eadbb2'], stem: '#a8865a', part: 'basket' };
  function bananaAmmo(t, x, y, s, rot, M) { // a little banana (a smile-shaped crescent) centred at (x, y)
    const pts = []; for (let i = 0; i <= 8; i++) { const a = PI / 2 + rot + (i - 4) * 0.24; pts.push([x + cos(a) * s * 1.8, y - s * 1.8 * 0.9 + sin(a) * s * 1.8]); }
    stroke(t, pts.slice(0, 5), s * 0.42, s * 0.78, M[1]); stroke(t, pts.slice(4), s * 0.78, s * 0.42, M[1]);
    for (const p of [pts[0], pts[8]]) t.ell(p[0], p[1], s * 0.42, s * 0.42, '#9a8a4e');
  }
  ART.bananalauncher = function (g, stage, P, C) {
    const M = C.main, F = C.acc, L = C.leaf, r = SIZE[stage], f = P.frame ? 1 : 0, TIP = '#9a8a4e';
    const rx = r * 0.88, ry = r * 0.74, hx = 16.8, hy = 26.6 - ry + hopOf(P), rimY = hy - ry * 0.55; // the yellow (still peeled) body
    const fh = r * 0.78, fx = hx + 1.4, fy = rimY - fh * 0.42, frot = 0.32;                             // the cream fruit above it
    const cw = [2.8, 3.2, 3.6][stage], cupX = hx - rx - [2.1, 2.3, 2.5][stage], cupY = hy - ry * 0.85;
    baseLeaves(g, P, L, 12, 20.6);
    pultArm(g, [[hx - 2.5, hy + 2], [hx - rx + 0.4, hy - ry * 0.3], [cupX + 0.6, cupY + 1.1]], cupX, cupY, cw, L, g2 => {
      const list = [[[0, 1.05, 0]], [[-0.6, 1, -0.3], [0.7, 1, 0.3]], [[-1, 1, -0.5], [0, 1.1, 0], [1, 1, 0.5]]][stage];
      for (const [dx, sz, ro] of list) piece(g2, t => bananaAmmo(t, cupX + dx, cupY - 0.9 - sz * 0.4, sz, ro, M));
      if (stage === 2) piece(g2, t => t.ell(cupX, cupY - 2.9, 0.75, 0.75, TIP));
    });
    const sl = r * 0.66;
    piece(g, t => lf(t, hx - 0.4, rimY + 0.6, sl * 0.85, -2.25, flat(mix(M, M[2], 0.2)), 0.36)); // a peel strip behind the fruit
    piece(g, t => blob(t, [[fx, fy, r * 0.42, fh * 0.62, frot]], F));                            // the cream fruit, leaning forward
    piece(g, t => t.ell(fx + sin(frot) * fh * 0.62, fy - cos(frot) * fh * 0.62 - 0.3, 0.95, 0.85, TIP)); // its little tip
    const zig = (x, y) => y >= rimY + (Math.floor((x + 0.25) * 0.9) % 2 ? 0.7 : 0);
    piece(g, t => blob(t, [[hx, hy, rx, ry, 0.06], [hx + 0.8, hy - ry * 0.4, rx * 0.8, ry * 0.75, 0.25]], M, { mask: fm(zig) }));
    // the peel strips hanging out and down on each side
    for (const sd of [-1, 1]) { // a strip curving out, then hanging down, with a pale inside line
      const x0 = hx + sd * rx * 0.62 + 0.4, y0 = rimY + 0.4, pts = [[x0, y0], [x0 + sd * sl * 0.42, y0 + sl * 0.05], [x0 + sd * sl * 0.66, y0 + sl * 0.45], [x0 + sd * sl * 0.7, y0 + sl * 0.85]];
      piece(g, t => { stroke(t, pts, 1.15, 0.95, M[1]); rimShade(t, M[1], M[2], 1, 2); });
      stroke(g, pts.slice(1, 3).map(([x, y]) => [x - sd * 0.15, y]), 0.2, 0.2, F[1]);
    }
    const ex = hx + 0.7, ey = hy + ry * 0.18;
    chibiFace(g, ex, ey, r * 0.88, P.eyes, P.mouth || 'smile', { my: 0.46 });
    void f;
    return { hx: R(hx), hy: R(hy), hr: R(rx), top: topOf(g), ey: R(ey), hat: { x: R(hx + 0.5), y: R(rimY - 0.5), w: R(rx * 1.5) } };
  };

  // ======================= Moonflower -> Moon Bloom -> Full Moon Flower =======================
  // A blue-violet tulip cupped behind a round yellow-green face bud. Moon Bloom: two more petals opening out and moon sparkles; Full
  // Moon: a little crescent moon too.
  PAL.moonflower = { main: ['#eceaff', '#b8b2f6', '#958cdc'], leaf: LEAF, acc: ['#fbffd8', '#e4f2a0', '#c4d878'], stem: '#72bb5a', part: 'petals' };
  function tulipPetal(t, x, y, len, ang, w, M) {
    const c = cos(ang), s = sin(ang), nx = -s * w, ny = c * w, P = [];
    const prof = [[0, 0.45], [0.16, 0.86], [0.38, 1], [0.6, 0.9], [0.8, 0.58], [0.94, 0.24], [1, 0]];
    for (const [u, k] of prof) P.push([x + c * len * u + nx * k, y + s * len * u + ny * k]);
    for (let i = prof.length - 2; i >= 0; i--) { const [u, k] = prof[i]; P.push([x + c * len * u - nx * k, y + s * len * u - ny * k]); }
    t.poly(P, M[1]);
    rimShade(t, M[1], M[2], 2, 2);
  }
  ART.moonflower = function (g, stage, P, C) {
    const M = C.main, Fb = C.acc, L = C.leaf, r = SIZE[stage], f = P.frame ? 1 : 0;
    const br = r * 0.78, bx = 15.6, by = 26.2 - br * 0.96 + hopOf(P), PB = mix(M, M[2], 0.35);
    baseLeaves(g, P, L);
    stemUp(g, 15.6, by + br - 1, C.stem);
    const len = r * 1.42, w = r * 0.5;
    if (stage >= 1) for (const s of [-1, 1]) piece(g, t => tulipPetal(t, bx + s * br * 0.3, by, len * 0.82, -PI / 2 + s * 1.05, w * 0.85, PB)); // petals opening out
    piece(g, t => tulipPetal(t, bx, by + 0.4, len * 1.02, -PI / 2, w * 0.95, PB));                       // the back petal
    for (const s of [-1, 1]) piece(g, t => tulipPetal(t, bx + s * br * 0.18, by + 0.6, len * 0.95, -PI / 2 + s * 0.42, w, M)); // side petals
    if (stage === 2) piece(g, t => { // a little crescent moon
      const mx = Math.min(bx + br + 4.4, 28.6), my = by - len * 0.8;
      t.ell(mx, my, 2.3, 2.3, '#fff2a8', 0, fm((x, y) => (x + 0.25 - mx - 1) ** 2 + (y + 0.25 - my + 0.7) ** 2 > 3.4));
    });
    piece(g, t => blob(t, [[bx, by, br, br * 0.94], [bx + 0.2, by + br * 0.18, br * 0.96, br * 0.8]], Fb));
    for (const s of [-1, 1]) { const a = -PI / 2 + s * 0.42, x0 = bx + s * br * 0.18 + cos(a) * br * 1.1, y0 = by + sin(a) * br * 1.1; stroke(g, [[x0, y0], [x0 + cos(a) * len * 0.35, y0 + sin(a) * len * 0.35]], 0.22, 0.22, mixHex(M[1], M[0], 0.6)); } // petal veins
    if (stage >= 1) for (const [x, y] of f ? [[bx - br - 3.2, by - len * 0.7], [bx + br + 2.6, by - 1.6]] : [[bx + br + 3, by - len * 0.6], [bx - br - 2.6, by - 1]]) piece(g, t => t.poly(PX.starPts(x, y, 1.5, 0.6, 4), '#fff2a8'));
    const ex = bx + 0.8, ey = by + br * 0.16;
    chibiFace(g, ex, ey, br * 1.08, P.eyes, P.mouth || 'smile');
    return { hx: R(bx), hy: R(by), hr: R(br), top: topOf(g), ey: R(ey), hat: { x: R(bx), y: R(by - len * 0.75), w: R(w * 2.4) } };
  };

  // ======================= Magnifying Grass -> Focus Grass -> Prism Grass =======================
  // A round crystal lens in a golden rim (the face is in the glass) on a short handle, held up by two grass blades from a grass tuft.
  // Focus: a thicker rim and more grass; Prism: rainbow glints and little gems on the rim.
  PAL.magnifyinggrass = { main: ['#ffffff', '#dcf4fc', '#b4daee'], leaf: LEAF, acc: ['#fff4c4', '#f2cf72', '#d8ae52'], stem: '#72bb5a', part: 'beam' };
  ART.magnifyinggrass = function (g, stage, P, C) {
    const M = C.main, Ac = C.acc, L = C.leaf, r = SIZE[stage] * 0.9, f = P.frame ? 1 : 0;
    const lx = 15.8, ly = 25.4 - r - 1.6 + hopOf(P), rim = [1.3, 1.5, 1.6][stage], rot = -0.12;
    piece(g, t => stroke(t, [[lx - 0.2, ly + r - 0.5], [lx - 0.4, 28.4]], 1.15, 1.05, Ac[1])); // the handle
    for (const s of [-1, 1]) piece(g, t => { const x0 = lx + s * 2.6; stroke(t, [[x0, 28.6], [lx + s * (r + 0.9), ly + r * 0.45], [lx + s * (r + 0.6), ly - r * 0.15]], 1.05, 0.55, L[1]); }); // grass hands
    piece(g, t => blob(t, [[lx, ly, r * 1.02, r * 0.97, rot]], Ac, { hl: false }));
    piece(g, t => blob(t, [[lx, ly, r * 1.02 - rim, r * 0.97 - rim, rot]], M, { hl: false, shade: 0.12 }));
    const gr = r - rim - 1.4, gl = []; for (let a = 3.5; a <= 4.4; a += 0.15) gl.push([lx + cos(a) * gr, ly + sin(a) * gr * 0.96]);
    for (let i = 1; i < gl.length; i++) stroke(g, [gl[i - 1], gl[i]], 0.42, 0.42, WHITE); // glare on the glass
    if (stage === 2) { // rainbow glints + rim gems
      ['#ffc4d4', '#fff0a8', '#c4f0c4', '#c4dcff'].forEach((c, i) => stroke(g, [[lx + gr * 0.2 + i * 0.5, ly - gr * 0.85 + i * 0.3], [lx + gr * 0.62 + i * 0.5, ly - gr * 0.45 + i * 0.3]], 0.22, 0.22, c));
      for (const [a, c] of [[-PI / 2, '#ff9ab8'], [-PI / 2 - 1.1, '#8ad8ff'], [-PI / 2 + 1.1, '#8ad8ff']]) piece(g, t => t.ell(lx + cos(a) * (r - rim / 2), ly + sin(a) * (r - rim / 2), 0.95, 0.95, c));
    }
    const blades = [[[-3.2, -2.3, 3.6], [-1.4, -1.95, 4], [1.2, -1.2, 4], [3, -0.85, 3.4]], [[-3.8, -2.4, 4], [-2, -2.05, 4.4], [0.4, -1.6, 3.6], [2, -1.15, 4.4], [3.8, -0.8, 3.6]], [[-4.2, -2.45, 4.2], [-2.6, -2.1, 4.8], [-0.8, -1.75, 4], [1, -1.35, 4], [2.8, -1.05, 4.8], [4.4, -0.75, 3.8]]][stage];
    piece(g, t => { for (const [dx, a, len] of blades) spike(t, 15.8 + dx, 29.6, len, a + (f && P.walk ? 0.08 : 0), 0.95, L[1], L[2]); t.ell(15.8, 29.4, 4.6, 1.2, flat(L)); }); // grass tuft
    const ex = lx + 0.8, ey = ly + r * 0.14;
    chibiFace(g, ex, ey, r * 0.9, P.eyes, P.mouth || 'smile');
    return { hx: R(lx), hy: R(ly), hr: R(r), top: topOf(g), ey: R(ey), front: R(lx + r), hat: { x: R(lx), y: R(ly - r + 1), w: R(r * 1.4) } };
  };

  // ======================= Shadow-shroom -> Shade-shroom -> Nightmare-shroom =======================
  // A squashed purple dome cap dripping dark goo over a round yellow-green face that sticks its tongue out; the stalk flares to the
  // ground. Shade: more drips; Nightmare: glowing spots and a goo puddle.
  PAL.shadowshroom = { main: ['#e0ccf8', '#b294e6', '#9474cc'], leaf: LEAF, acc: ['#fafee0', '#e2f0a6', '#c2d47c'], stem: '#72bb5a', part: 'cap' };
  const GOO = ['#9a80cc', '#7c62b4', '#62489a'];
  ART.shadowshroom = function (g, stage, P, C) {
    const M = C.main, Fc = C.acc, r = SIZE[stage], f = P.frame ? 1 : 0, hop = hopOf(P);
    const srx = r * 0.74, sry = r * 0.62, sx = 15.6, sy = 27.4 - sry + hop * 0.6;
    const crx = r * 1.14, cry = r * 0.74, ccy = sy - sry * 0.74 - 0.9 + hop * 0.4, cbot = ccy + cry * 0.2;
    if (stage === 2) piece(g, t => { t.ell(9.6, 29.6, 3.2, 1.1, flat(GOO)); t.ell(22.6, 29.8, 2.6, 0.9, flat(GOO)); });
    piece(g, t => { t.ell(sx + (P.walk && !f ? 0.3 : 0), 28.6, srx + 1.1, 1.6, flat(Fc)); blob(t, [[sx, sy, srx, sry]], Fc); });
    piece(g, t => { // the cap: a squashed dome, its lower edge dark with goo that drips
      blob(t, [[sx, ccy, crx, cry], [sx - crx * 0.1, ccy - cry * 0.08, crx * 0.9, cry * 0.95]], M, { mask: fm((x, y) => y <= cbot) });
      const band = cbot - [1.4, 1.6, 1.8][stage];
      t.ell(sx, ccy, crx, cry, GOO[1], 0, fm((x, y) => y <= cbot && y >= band + 0.45 * sin(x * 1.7)));
      const fr0 = srx, exx = sx + 0.7, drips = [[exx - fr0 * 0.43 - fr0 * 0.24 - 1.9, [2.2, 2.6, 3][stage]], [exx + 0.05, [1.6, 1.9, 2.2][stage]], [exx + fr0 * 0.43 + fr0 * 0.24 + 1.7, [2, 2.4, 2.8][stage]]]; // (clear of the eyes)
      for (const [x, len] of drips) { const l = len + (f ? 0.4 : 0); t.poly([[x - 0.95, cbot - 0.6], [x + 0.95, cbot - 0.6], [x + 0.8, cbot + l - 0.6], [x - 0.8, cbot + l - 0.6]], GOO[1]); t.ell(x, cbot + l - 0.4, 1.05, 1.05, GOO[1]); }
      rimShade(t, GOO[1], GOO[2], 1, 2);
    });
    if (stage === 2) for (const [dx, dy, rr] of [[-0.5, -0.45, 1.2], [0.15, -0.72, 0.9], [0.55, -0.3, 1]]) piece(g, t => t.ell(sx + dx * crx, ccy + dy * cry, rr, rr * 0.9, '#efffb0'));
    else for (const [dx, dy, rr] of [[-0.5, -0.45, 1.1], [0.4, -0.55, 0.8]]) g.ell(sx + dx * crx, ccy + dy * cry, rr, rr * 0.85, M[0]);
    const fr = srx * 0.98, ex = sx + 0.7, ey = Math.max(sy - sry * 0.02, cbot + fr * 0.32 + 1.1);
    const tongue = P.mouth == null || P.mouth === 'smile' || P.mouth === 'open';
    chibiFace(g, ex, ey, fr, P.eyes, tongue ? (P.mouth === 'open' ? 'open' : 'flat') : P.mouth, { my: 0.5, blush: { w: 1.2, h: 0.7 } });
    if (tongue) { // the tongue sticking out
      const my = ey + fr * 0.5;
      piece(g, t => t.ell(ex + 0.3, my + 1.15, 0.95, 1.1, '#ff9ab0'));
      stroke(g, [[ex + 0.3, my + 0.8], [ex + 0.3, my + 1.6]], 0.16, 0.16, '#e8708a');
    }
    return { hx: R(sx), hy: R(ccy), hr: R(cry), top: topOf(g), ey: R(ey), hat: { x: R(sx), y: R(ccy - cry + 1), w: R(crx * 1.4) } };
  };

  // ======================= Hurrikale -> Hurri-Gust -> Hurri-Storm =======================
  // A round pale-teal face ringed by ruffly kale leaves swirling like a pinwheel. Gust: a wind curl; Storm: more leaves and two big
  // swirls of wind.
  PAL.hurrikale = { main: ['#d8fbf2', '#94dccf', '#6cc0b4'], leaf: ['#c4f4e4', '#7ccdb8', '#58ae9c'], acc: ['#f8fffc', '#e0f8f2', '#b8e4da'], stem: '#5aae8c', part: 'leafcrown' };
  function windCurl(g, x, y, s, dir) { const pts = []; for (let i = 0; i <= 16; i++) { const a = dir * i * 0.42, rr = s * (1 - i * 0.045); pts.push([x + cos(a) * rr * 1.4, y + sin(a) * rr]); } piece(g, t => { for (let i = 1; i < pts.length; i++) stroke(t, [pts[i - 1], pts[i]], 0.42, 0.42, '#f4feff'); }); }
  ART.hurrikale = function (g, stage, P, C) {
    const M = C.main, Fc = C.acc, L = C.leaf, r = SIZE[stage], f = P.frame ? 1 : 0;
    const cr = r * 0.7, hx = 15.8, hy = 26 - r * 0.92 + hopOf(P), n = [6, 7, 8][stage], spin = f ? 0.2 : 0;
    baseLeaves(g, P, L);
    if (stage >= 1) windCurl(g, Math.max(3.4, hx - r - 2.2), hy + r * 0.3, 1.8, -1);
    if (stage === 2) windCurl(g, Math.min(27.4, hx + r + 2.4), hy - r * 0.5, 2, 1);
    for (let i = 0; i < n; i++) { // the swirling kale leaves (all tilted the same way, like a pinwheel), with ruffled, curly tips
      const a = -PI / 2 + spin + i * 2 * PI / n, d = cr * 0.62, Lc = i % 2 ? M : mix(M, M[2], 0.25), len = r * 0.82;
      const cx = hx + cos(a) * (d + len * 0.42), cy = hy + sin(a) * (d + len * 0.42) * 0.94;
      piece(g, t => {
        t.ell(cx, cy, len * 0.62, len * 0.4, Lc[1], a + 0.75);
        for (const k of [0.62, 0.95]) { const b = a + 0.18 + (k - 0.62) * 0.9; t.ell(hx + cos(b) * (d + len * k), hy + sin(b) * (d + len * k) * 0.94, 1.25, 1.15, Lc[1]); }
        rimShade(t, Lc[1], Lc[2], 2, 2);
      });
    }
    piece(g, t => blob(t, [[hx, hy, cr * 1.05, cr]], [Fc[0], M[0], M[1]]));
    const ex = hx + 0.8, ey = hy + cr * 0.16;
    chibiFace(g, ex, ey, cr * 1.08, P.eyes, P.mouth || 'smile', { blush: { w: 1.2, h: 0.7 } });
    return { hx: R(hx), hy: R(hy), hr: R(r), top: topOf(g), ey: R(ey), hat: { x: R(hx), y: R(hy - cr), w: R(cr * 2) } };
  };

  // ======================= Fire Peashooter -> Fire Repeater -> Inferno Gatling =======================
  // Peashooter v3 from the reference (a gently oval head, fuller at the back, a short chunky snout tube in the head piece, a red bow
  // tie) in warm red-orange, with FLAMES where the back leaf tufts would be. Repeater: two flames; Inferno Gatling: a crest of three
  // flames and a 4-barrel muzzle.
  PAL.firepeashooter = { main: ['#ffe4cc', '#ffa880', '#f4846a'], leaf: LEAF, stem: '#72bb5a', root: '#a8865a', part: 'snout' };
  ART.firepeashooter = function (g, stage, P, C) {
    const M = C.main, L = C.leaf, r = SIZE[stage], rx = r * 1.06, ry = r * 0.95, rot = -0.06, f = P.frame ? 1 : 0;
    const hx = 14, hy = 26 - ry + hopOf(P) + 0.3;
    baseLeaves(g, P, L, 11.2, 19.2);
    stemUp(g, 15, hy + ry - 1, C.stem);
    const fl = [[[-0.58, -0.8, 5.2, 2.1, -0.85]], [[-0.5, -0.84, 5.4, 2.1, -0.7], [-0.86, -0.36, 4.8, 1.9, -1.3]], [[-0.1, -0.9, 5.2, 2, -0.15], [-0.52, -0.8, 5.6, 2.2, -0.7], [-0.84, -0.4, 4.6, 1.9, -1.15]]][stage];
    fl.forEach(([kx, ky, h, w, a], i) => piece(g, t => flame(t, hx + rx * kx, hy + ry * ky, h, w, (f + i) % 2, a)));
    const tl = 2.0, th = r * 0.36, fla = 1.2, sy = hy + r * 0.08, x0 = hx + rx * 0.7, x1 = hx + rx + tl;
    piece(g, t => { // head + snout tube in ONE piece
      t.poly([[x0, sy - th], [x1, sy - th * fla], [x1, sy + th * fla], [x0, sy + th]], M[1]);
      A.softBody(t, hx - rx * 0.14, hy - ry * 0.1, rx * 0.86, ry * 0.86, M, { rot, hl: false });
      A.softBody(t, hx, hy, rx, ry, M, { rot });
      t.poly([[x0 + 1, sy + th * 0.35], [x1, sy + th * fla * 0.35], [x1, sy + th * fla], [x0 + 1, sy + th]], M[2], x => x > hx + rx - 0.8);
      t.ell((x0 + x1) / 2 + 0.8, sy - th * 0.55, (x1 - x0) * 0.25, th * 0.18, M[0], 0, x => x > hx + rx - 0.4);
    });
    const rw = stage === 2 ? 2.0 : 1.6, rh = th * fla, ox = x1 - 0.1 + (stage === 2 ? 0.3 : 0), hole = P.mouth === 'open' ? '#ffd25e' : mixHex(M[2], '#2b2129', 0.6);
    piece(g, t => {
      t.ell(ox, sy, rw, rh, M[0]);
      if (stage < 2) t.ell(ox + rw * 0.15, sy + 0.05, rw * 0.58, rh * 0.7, hole);
      else for (const [dx, dy] of [[-0.45, -0.42], [0.65, -0.42], [-0.45, 0.46], [0.65, 0.46]]) t.ell(ox + dx, sy + dy * rh, 0.5, rh * 0.25, hole); // 4 barrels
    });
    piece(g, t => { const by = hy + ry * 0.95; t.poly([[14.8, by], [11.7, by - 1.5], [11.7, by + 1.5]], '#f4646e'); t.poly([[14.8, by], [17.9, by - 1.5], [17.9, by + 1.5]], '#f4646e'); t.ell(14.8, by, 0.95, 0.95, '#d84a58'); }); // red bow tie
    const ex = hx + 0.8, ey = hy + ry * 0.16;
    chibiFace(g, ex, ey, r, P.eyes, null);
    return { hx: R(hx), hy: R(hy), hr: r, top: topOf(g), ey: R(ey), front: R(ox + rw), hat: { x: R(hx - 0.5), y: R(hy - ry + 1.2), w: R(rx * 1.5) } };
  };
})();
