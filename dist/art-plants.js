// art-plants.js — PVZ Garden plant art, part A1: Peashooter, Sunflower, Chomper, plus the shared chibi kit that art-plants2.js
// (and any other species file) can use through PX.art.chibi. See docs/pvz-art-guide.md and docs/chibi-reference.js.
// TRUE chibi: the round head IS the plant (radius about 8 / 9 / 10 by stage, its bottom on row ~25-26), two little round base
// leaves on rows 27-30, a stem of 2-3 px at most, big glossy eyes set low and wide, a tiny mouth (or none), soft blush,
// flat pastel fills with ONE soft shade (PX.art.softBody inside PX.piece). The core adds the bold outer edge (g.outerLine).
// Contract: PX.PLANT_ART[id] = function (g, stage, P, C) -> { hx, hy, hr, top, ey, hat?, front? }. Art faces RIGHT.
(function () {
  'use strict';
  const { INK, stroke } = PX;
  const A = PX.art, mix = PX.mixHex;
  const ART = PX.PLANT_ART, PAL = PX.PLANT_PAL;
  const T = (stage, a, b, c) => (stage === 2 ? c : stage === 1 ? b : a); // pick a value per stage
  const R = Math.round;
  const WHITE = '#ffffff';

  // ================= the chibi kit =================
  // keep the shading gentle even with strong element colours: if a ramp's shade is much darker than its fill, soften it
  function soft(M) {
    const d = A.lum(M[1]) - A.lum(M[2]);
    return d > 0.14 ? [M[0], M[1], mix(M[1], M[2], 0.14 / d)] : M;
  }
  const flat = M => { const S = soft(M); return [S[1], S[1], S[2]]; }; // small parts: flat fill + a soft shade on the lower right
  const pc = (g, f) => PX.piece(g, f);
  const fine = f => { f.fine = true; return f; };
  // walking = a little hop on frame 1; cheering = a smaller hop
  const hopOf = P => (P.walk && P.frame ? -1.5 : P.arms === 'up' ? -1 : 0);
  // two little round base leaves the plant sits on (they stay on the ground when it hops). arms 'up' tips them up.
  function baseLeaves(g, cx, L, P, o) {
    o = o || {};
    const y = o.y || 28.7, rx = o.rx || 4.4, ry = o.ry || 1.9, dx = o.dx || 4.2, a = P.arms === 'up' ? 0.5 : P.arms === 'out' ? 0.06 : 0.22;
    pc(g, t => { t.ell(cx - dx, y, rx, ry, flat(L), -a); t.ell(cx + dx, y, rx, ry, flat(L), a); });
  }
  const stem = (g, x, y0, y1, col, w) => pc(g, t => stroke(t, [[x, y0], [x, y1]], w || 0.95, w || 0.95, col));
  // the soft crescent for ANY flat shape on a piece grid: pixels of colour M[1] whose down-right neighbour (a, b art px away)
  // is outside the shape become the shade; o.hl = [x, y, rx, ry, rot?] adds the small highlight up-left.
  function softify(t, M, o) {
    o = o || {};
    const S = soft(M), K = t.k || 1, a = R((o.a == null ? 1.3 : o.a) * K), b = R((o.b == null ? 1.5 : o.b) * K), W = t.fw, H = t.fh, src = t.a.slice();
    const only = o.only === undefined ? M[1] : o.only;
    for (let fy = 0; fy < H; fy++) for (let fx = 0; fx < W; fx++) {
      const c = src[fy * W + fx]; if (c === null || c === INK || (only && c !== only)) continue;
      const nx = fx + a, ny = fy + b, n = nx < W && ny < H ? src[ny * W + nx] : null;
      if (n === null || n === INK) t.a[fy * W + fx] = S[2];
    }
    if (o.hl) { const [x, y, rx, ry, rot] = o.hl; t.ell(x, y, rx, ry, S[0], rot == null ? -0.55 : rot, fine((xx, yy) => t.filled(xx, yy))); }
  }
  // a polygon painted only where mask(x, y) holds (fine-pixel precise)
  function polyIn(t, pts, col, mask) {
    const tmp = new PX.Grid(t.w, t.h, t.k); tmp.poly(pts, col);
    for (let i = 0; i < tmp.a.length; i++) if (tmp.a[i] !== null) { const fx = i % t.fw, fy = (i / t.fw) | 0; if (!mask || mask(fx / t.k, fy / t.k)) t.a[i] = tmp.a[i]; }
  }
  // the top row with anything drawn on it
  const topOf = g => { for (let fy = 0; fy < g.fh; fy++) for (let fx = 0; fx < g.fw; fx++) if (g.fget(fx, fy) !== null) return Math.floor(fy / g.k); return g.h; };
  // the chibi face for a head of radius r: big glossy eyes centred at (ex, ey), blush, a tiny mouth.
  // o: { mad: true (the kids' mad list: a scowl, no blush, frown / gritted teeth), grin: true (mad + gritted teeth by default),
  //      mouth: false (no mouth), mood: default eye mood, sp / w / h eye spacing + size, col eye colour, white / look (white eyes
  //      with pupils), mx / my / mw mouth place + width, by / bsp blush offset + spacing, blush: false }
  function chibiFace(g, ex, ey, r, P, o) {
    o = o || {};
    const e = P.eyes, mad = !!o.mad;
    const mood = mad ? (e === 'blink' || e === 'closed' || e === 'sad' || e === 'sleepy' ? e : 'mad') : (e || o.mood);
    A.chibiEyes(g, ex, ey, { sp: o.sp || r * 0.86, w: o.w || r * 0.48, h: o.h || r * 0.64, mood, col: o.col, white: o.white, look: o.look, one: o.one });
    if (!mad && o.blush !== false) A.blush(g, ex - 0.2, ey + (o.by == null ? r * 0.42 : o.by), { sp: o.bsp || r, w: o.bw, h: o.bh });
    if (o.mouth === false) return;
    const m = P.mouth;
    const kind = mad ? (m === 'open' || m === 'grin' || (o.grin && !m) ? 'grin' : m === 'o' ? 'o' : m === 'flat' ? 'flat' : 'frown') : (m || 'smile');
    A.chibiMouth(g, o.mx == null ? ex : o.mx, o.my == null ? ey + r * 0.48 : o.my, kind, o.mw || Math.max(1.8, r * 0.3));
  }
  const LEAF2 = ['#d2f4ac', '#8fd46e', '#68b058']; // pastel leaf green
  const TIE = ['#ffc2c6', '#ff7e8a', '#e2606e']; // the pea family's red bow tie
  function bowTie(g, x, y, s) {
    s = s || 1;
    pc(g, t => {
      for (const d of [-1, 1]) t.poly([[x, y - 0.7 * s], [x + d * 3.1 * s, y - 1.9 * s], [x + d * 3.8 * s, y - 0.6 * s], [x + d * 3.8 * s, y + 0.6 * s], [x + d * 3.1 * s, y + 1.9 * s], [x, y + 0.7 * s]], TIE[1]);
      softify(t, TIE, { a: 0.6, b: 0.7 });
    });
    pc(g, t => t.ell(x, y, 1.05 * s, 1.15 * s, TIE[2]));
    g.dots([[x - 2.6 * s, y - 0.9 * s], [x + 1.9 * s, y - 0.9 * s]], TIE[0]);
  }
  A.chibi = { soft, flat, pc, fine, hopOf, baseLeaves, stem, softify, polyIn, topOf, chibiFace, bowTie, LEAF2, TIE, T };

  // ================= Peashooter -> Repeater -> Gatling Pea =================
  // A round pale-green head with a tube snout to the right, leaf tufts at the back (Repeater: two), a red bow tie, big eyes,
  // no mouth (the snout is its mouth). Gatling Pea: an olive army helmet and a steel 4-barrel snout.
  PAL.peashooter = { main: ['#eefcd0', '#b2e78a', '#8ccd6c'], leaf: LEAF2, stem: '#72bb5a', root: '#a8865a', part: 'snout' };
  const STEEL = ['#f2f5fa', '#c3cbd8', '#98a3b6'];
  // shared pea head (Peashooter, Snow Pea, and any pea plant in other files)
  // o: { tuft: fn(g, hx, hy, r) to draw the back tuft yourself (e.g. ice crystals), gatling: true, M: head ramp, L: leaf ramp,
  //      tie: false (no bow tie) }. Returns { hx, hy, hr, r, sx, sy, sr, M, top, ex, ey }.
  function peaHead(g, stage, P, C, o) {
    o = o || {};
    // reference v3: the head only slightly oval (1.06r x 0.95r) with a fuller back; a short CHUNKY snout tube in the same piece
    const M = soft(o.M || C.main), L = o.L || C.leaf, r = T(stage, 8, 9, 10), rx = r * 1.06, ry = r * 0.95, rot = -0.06, hop = hopOf(P);
    const hx = 14, hy = 26 - ry + hop + 0.3, gat = !!o.gatling;
    pc(g, t => { t.ell(11.2, 28.7, 4.3, 1.9, flat(L), -0.22); t.ell(19.2, 28.7, 4.3, 1.9, flat(L), 0.22); }); // base leaves
    stem(g, 15, 28.6, hy + ry - 1, C.stem);
    if (o.tuft) o.tuft(g, hx, hy, r, rx, ry);
    else pc(g, t => { t.ell(hx - rx * 0.6, hy - ry * 0.86, 3.3, 1.65, flat(L), -0.95); if (stage >= 1) t.ell(hx - rx * 0.92, hy - ry * 0.34, 3.1, 1.55, flat(L), -0.3); }); // leaf tufts
    const tl = 2.0, th = r * 0.36, fl = 1.2, sy = hy + r * 0.08, x0 = hx + rx * 0.7, x1 = hx + rx + tl;
    pc(g, t => { // head + snout tube in ONE piece
      t.poly([[x0, sy - th], [x1, sy - th * fl], [x1, sy + th * fl], [x0, sy + th]], M[1]); // the tube
      A.softBody(t, hx - rx * 0.14, hy - ry * 0.1, rx * 0.86, ry * 0.86, M, { rot, hl: false }); // fuller back of the head
      A.softBody(t, hx, hy, rx, ry, M, { rot });
      t.poly([[x0 + 1, sy + th * 0.35], [x1, sy + th * fl * 0.35], [x1, sy + th * fl], [x0 + 1, sy + th]], M[2]); // tube underside shade
      t.ell((x0 + x1) / 2 + 0.8, sy - th * 0.55, (x1 - x0) * 0.25, th * 0.18, M[0], 0, x => x > hx + rx - 0.4); // tube glint
    });
    const rw = gat ? 2.0 : 1.6, rh = th * fl, ox = x1 - 0.1 + (gat ? 0.3 : 0), hole = mix(M[2], '#2b2129', P.mouth === 'open' ? 0.45 : 0.6); // the opening
    pc(g, t => {
      t.ell(ox, sy, rw, rh, M[0]);
      if (!gat) t.ell(ox + rw * 0.15, sy + 0.05, rw * 0.58, rh * 0.7, hole);
      else for (const [dx, dy] of [[-0.45, -0.42], [0.65, -0.42], [-0.45, 0.46], [0.65, 0.46]]) t.ell(ox + dx, sy + dy * rh, 0.5, rh * 0.25, P.mouth === 'open' ? '#ffe680' : hole); // 4 barrels
    });
    if (o.tie !== false) refTie(g, hy + ry * 0.95);
    return { hx, hy, hr: r, r, rx, ry, sx: ox, sy, sr: rh, M, top: hy - ry, ex: hx + 0.8, ey: hy + ry * 0.16, front: ox + rw };
  }
  // the reference bow tie (drawn after any helmet, like the reference)
  function refTie(g, by) { pc(g, t => { t.poly([[14.8, by], [11.7, by - 1.5], [11.7, by + 1.5]], '#ff8f8f'); t.poly([[14.8, by], [17.9, by - 1.5], [17.9, by + 1.5]], '#ff8f8f'); t.ell(14.8, by, 0.95, 0.95, '#f26f78'); }); }
  // (kept for older call sites: the chibi pea head already draws its muzzle)
  function peaMuzzle() {}
  ART.peashooter = function (g, stage, P, C) {
    const H = peaHead(g, stage, P, C, { gatling: stage === 2, tie: false });
    const by = R(H.hy - H.ry * 0.42), w = H.rx * 0.95;
    if (stage === 2) pc(g, t => A.armyHelmet(t, H.hx - 0.3, by, w)); // Gatling Pea's army helmet
    refTie(g, H.hy + H.ry * 0.95);
    if (stage === 2) A.armyHelmetDetails(g, H.hx - 0.3, by, w);
    chibiFace(g, H.ex, H.ey, H.r, P, { mouth: false });
    return { hx: R(H.hx), hy: R(H.hy), hr: H.r, top: topOf(g), ey: R(H.ey), front: R(H.front) };
  };

  // ================= Sunflower -> Twin Sunflower -> Sunflower Queen =================
  // Rounded butter-yellow petals (C.main) round a warm brown face (C.acc), big eyes and a happy smile.
  // Stage 1: two heads. Stage 2: three flowers, the big middle one wearing a little gold tiara.
  PAL.sunflower = { main: ['#fff8d0', '#ffe282', '#f4c45e'], acc: ['#fadfb4', '#ecbb8a', '#d49c6a'], leaf: LEAF2, stem: '#72bb5a', root: '#a8865a', part: 'petals', fuseLeaf: ['#fff8d0', '#ffe282', '#f4c45e'] };
  // a sunflower head: petals and a face of radius r centred at (x, y). Returns { pr, ex, ey } (pr = outer petal radius).
  function sunHead(g, x, y, r, C, P, spin, o) {
    o = o || {};
    const n = r < 4.6 ? 10 : 12, d = r * 1.1, pl = r * 0.4, pw = r * 0.31, s0 = spin || 0, PET = flat(C.main);
    pc(g, t => { for (let i = 0; i < n; i++) { const a = s0 + i * Math.PI * 2 / n; t.ell(x + Math.cos(a) * d, y + Math.sin(a) * d, pl, pw, PET, a); } });
    pc(g, t => A.softBody(t, x, y, r, r, soft(C.acc || C.main)));
    const ex = x + r * 0.07, ey = y + r * 0.03;
    if (o.face !== false) { // eyes as big as the reference's (w 0.46, h 0.62 of the face radius)
      A.chibiEyes(g, ex, ey, { sp: r * 0.84, w: r * 0.46, h: r * 0.62, mood: P.eyes, col: '#4a2c22' });
      A.chibiMouth(g, ex, ey + r * 0.485, P.mouth || 'smile', Math.max(1.4, r * 0.32));
      A.blush(g, ex, ey + r * 0.37, { sp: r * 1.12, w: Math.max(0.75, r * 0.16), h: Math.max(0.5, r * 0.1) });
    }
    return { pr: d + pl, ex, ey };
  }
  ART.sunflower = function (g, stage, P, C) {
    const hop = hopOf(P);
    baseLeaves(g, 15.7, C.leaf, P);
    // [x, y, face radius]; the last head is the main one
    const heads = T(stage,
      [[15.5, 18.2 + hop, 6]],
      [[9.9, 14.4 + hop * 0.8, 5.3], [21.5, 17.6 + hop, 5.6]],
      [[6.6, 20.2 + hop * 0.6, 3.8], [25.4, 20.6 + hop * 0.6, 3.8], [15.8, 13.4 + hop, 5.8]]);
    for (const [x, y] of heads) pc(g, t => stroke(t, [[15.7, 28.4], [15.7 + (x - 15.7) * 0.35, 25.2], [x, y + 3]], 0.85, 0.85, C.stem));
    let M = null;
    heads.forEach(([x, y, r], i) => { M = sunHead(g, x, y, r, C, P, (P.frame ? 0.1 : 0) + i * 0.13); M.x = x; M.y = y; M.r = r; });
    let hat = null;
    if (stage === 2) { // the Queen's tiara on the middle flower
      const x = M.x, y = M.y - M.r + 0.9;
      pc(g, t => { t.poly([[x - 3.4, y + 0.4], [x - 3.8, y - 2.6], [x - 1.8, y - 1.2], [x, y - 3.8], [x + 1.8, y - 1.2], [x + 3.8, y - 2.6], [x + 3.4, y + 0.4]], '#ffd95c'); softify(t, ['#fff2b0', '#ffd95c', '#f0b440'], { a: 0.6, b: 0.6, only: '#ffd95c' }); });
      g.ell(x, y - 1.3, 0.75, 0.75, '#ff7e8a'); g.dots([[x - 3.4, y - 1.8], [x + 3.4, y - 1.8]], '#7fd0f0'); g.dot(x - 0.3, y - 1.7, WHITE);
      hat = { x: R(x), y: R(y - 2), w: 8 };
    }
    const geo = { hx: R(M.x), hy: R(M.y), hr: R(M.pr), top: topOf(g), ey: R(M.ey) };
    if (hat) geo.hat = hat;
    return geo;
  };

  // ================= Chomper -> Super Chomper -> Mega Chomper =================
  // A big round purple head (C.main) whose face is a huge toothy mouth opening to the right (white teeth, pink tongue), light
  // spots on the dome, NO eyes, on two base leaves. Stage 1: a leaf sprout on top. Stage 2: a leaf crown and two big fangs.
  PAL.chomper = { main: ['#f0dcff', '#c9a2f2', '#a882dc'], leaf: LEAF2, acc: ['#ffd0dc', '#ff9ab2', '#e87896'], stem: '#72bb5a', root: '#a8865a', part: 'jaws' };
  ART.chomper = function (g, stage, P, C) {
    const M = soft(C.main), r = T(stage, 8.2, 9.2, 10.2), ry = r * 0.9, hop = hopOf(P);
    const hx = 14.2, hy = 25.9 - ry + hop;
    const open = P.mouth === 'open' || P.mouth === 'grin' || P.mouth === 'o';
    baseLeaves(g, 15.6, C.leaf, P);
    stem(g, 15.4, 28.6, hy + ry - 1, C.stem, 1.05);
    if (stage >= 1) { // leaves on top, leaning back
      const list = stage === 2 ? [[-4.4, -2.45, 5, 1.7], [-1.6, -2.0, 5.6, 1.8], [1.2, -1.55, 4.6, 1.6]] : [[-3, -2.2, 4.6, 1.7], [-0.4, -1.7, 4, 1.55]];
      for (const [dx, a, len, w] of list) pc(g, t => t.ell(hx + dx + Math.cos(a) * len * 0.42, hy - ry + 1.6 + Math.sin(a) * len * 0.42, len / 2, w, flat(C.leaf), a));
    }
    // the mouth: a wedge from a hinge left of centre out to the right edge (wider when it bites, nearly shut when 'flat')
    const Hx = hx - r * 0.16, Hy = hy + ry * 0.2;
    const aU = open ? -0.72 : P.mouth === 'flat' ? -0.2 : -0.38, aL = open ? 0.86 : P.mouth === 'flat' ? 0.24 : 0.48;
    const inHead = (x, y) => ((x - hx) / r) ** 2 + ((y - hy) / ry) ** 2 <= 1;
    const inMouth = (x, y) => { const dx = x - Hx, dy = y - Hy; if (dx <= 0.2) return false; const a = Math.atan2(dy, dx); return a > aU && a < aL; };
    const lipD = (x, y, a) => { const dx = x - Hx, dy = y - Hy; return { d: Math.abs(-Math.sin(a) * dx + Math.cos(a) * dy), along: Math.cos(a) * dx + Math.sin(a) * dy }; };
    // the head: a round dome with a little bulge at the upper back; the upper jaw overbites a little past the lower one, which is
    // itself pushed half a pixel forward. One flat fill + ONE soft crescent for the whole silhouette (softify).
    const jaw = (x, y) => y > Hy + Math.tan(aL) * (x - Hx) + 0.3 && x > Hx;
    const lip = (x, y) => y < Hy + Math.tan(aU) * (x - Hx) - 0.3 && x > Hx;
    const jx = hx + r * 0.3 + 0.5, jy = hy + ry * 0.46, ux = Hx + Math.cos(aU) * r * 0.8, uy = Hy + Math.sin(aU) * r * 0.8 - 0.4;
    pc(g, t => {
      t.ell(hx, hy, r, ry, M[1], 0, fine((x, y) => !inMouth(x, y)));
      t.ell(hx - r * 0.3, hy - ry * 0.24, r * 0.78, ry * 0.8, M[1], 0, fine((x, y) => !inMouth(x, y)));
      t.ell(jx, jy, r * 0.66, ry * 0.46, M[1], 0, fine(jaw)); // lower jaw
      t.ell(ux, uy, r * 0.38, ry * 0.3, M[1], aU, fine(lip)); // the overbite at the tip of the upper jaw
      softify(t, M, { a: r * 0.15, b: ry * 0.17, hl: [hx - r * 0.42, hy - ry * 0.5, r * 0.24, ry * 0.14] });
      // a light lilac-pink lip rim, one full art pixel, along both jaw edges
      for (let i = 0; i < t.a.length; i++) {
        const c = t.a[i]; if (c === null || c === INK) continue;
        const x = (i % t.fw + 0.5) / t.k, y = ((i / t.fw | 0) + 0.5) / t.k;
        for (const a of [aU, aL]) { const q = lipD(x, y, a); if (q.along > r * 0.2 && q.d < 1.55) { t.a[i] = '#f3c6e6'; break; } }
      }
    });
    const THROAT = mix(M[2], '#3a1838', 0.62), TONGUE = soft(C.acc);
    pc(g, t => {
      const m = fine((x, y) => inMouth(x, y) && inHead(x, y));
      t.ell(hx, hy, r, ry, THROAT, 0, m);
      const tl = r * 0.62, ta = aL * 0.6; // the tongue lies along the lower jaw
      t.ell(Hx + Math.cos(ta) * tl, Hy + Math.sin(ta) * tl - 0.2, r * 0.36, r * 0.17, TONGUE[1], ta, m);
      t.ell(Hx + Math.cos(ta) * tl - 0.4, Hy + Math.sin(ta) * tl - 0.5, r * 0.14, r * 0.06, TONGUE[0], ta, m);
    });
    // a few chunky teeth (rounded white triangles) pointing into the mouth: 2 fangs on top, 1-2 below
    const onMouth = (x, y) => { const c = g.get(x, y); return c === THROAT || c === TONGUE[0] || c === TONGUE[1]; };
    for (const [a, side, ks] of [[aU, 1, [0.5, 0.78]], [aL, -1, stage === 0 ? [0.64] : [0.5, 0.78]]]) {
      const dx = Math.cos(a), dy = Math.sin(a), nx = -dy * side, ny = dx * side;
      for (const k0 of ks) {
        const k = r * k0, hw = 1.02, hh = side === 1 ? (stage === 2 ? 2.6 : 2.2) : 1.9;
        const bx = Hx + dx * k - nx * 0.6, by = Hy + dy * k - ny * 0.6, tx = bx + nx * (hh + 0.6), ty = by + ny * (hh + 0.6);
        const tmp = new PX.Grid(g.w, g.h, g.k);
        tmp.poly([[bx - dx * hw, by - dy * hw], [bx + dx * hw, by + dy * hw], [tx + dx * 0.5, ty + dy * 0.5], [tx - dx * 0.5, ty - dy * 0.5]], WHITE);
        tmp.ell(tx - nx * 0.15, ty - ny * 0.15, 0.62, 0.62, WHITE);
        for (let i = 0; i < tmp.a.length; i++) if (tmp.a[i] !== null) { const fx = i % g.fw, fy = i / g.fw | 0; if (onMouth(fx / g.k, fy / g.k)) g.fset(fx, fy, WHITE); }
      }
    }
    // light spots on the dome
    const SP = mix(M[0], WHITE, 0.25);
    for (const [kx, ky, s] of [[-0.5, -0.42, 1.25], [0.08, -0.7, 0.9], [-0.78, 0.05, 0.8]]) g.ell(hx + kx * r, hy + ky * ry, s, s * 0.85, SP, 0, fine((x, y) => g.filled(x, y) && g.get(x, y) !== WHITE));
    return { hx: R(hx), hy: R(hy), hr: R(r), top: topOf(g), ey: R(hy - ry * 0.22), front: R(hx + r) };
  };

  // shared with the other species files
  Object.assign(PX.art, { peaHead, peaMuzzle, sunHead });
})();
