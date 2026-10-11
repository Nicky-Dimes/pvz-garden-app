// art-core.js — PVZ Garden art core. Loaded after pixel.js (and before art-plants.js / art-zombies.js / art-world.js).
// Plants and zombies are drawn on the same 32x32 canvas as the old Sprouts (anchor: feet at 16,31), so every screen that calls
// PX.sprig(look, pose) draws them unchanged. PX.sprig dispatches on the look:
//   { zombie: 'conehead', ... }                       -> PX.ZOMBIE_ART (art-zombies.js)
//   { species: 'peashooter', stage: 0|1|2, element, skin, shiny, fuse: { with: speciesId, item: itemId } } -> plants
// ART FACES RIGHT. Screens flip a sprite when it should face left.
//
// SPECIES ART CONTRACT (art-plants.js): PX.PLANT_ART[id] = function (g, stage, P, C) -> geom
//   g      PX.Grid(32, 32). Draw the whole plant (stem, leaves, feet, head, face) and ink-outline it (g.outline() / PX.piece()).
//   stage  0 (small, about 20 px tall), 1 (about 24 px), 2 (about 28 px, the top of the art no higher than y = 3).
//   P      pose: frame (0|1: idle bob / walk step), walk (bool), eyes, mouth, arms ('up' | 'out' | 'down' | 'hold': leaf pose).
//   C      colours: { main, leaf, acc } 3-tone ramps [light, mid, dark] (an element or a fusion may swap main / leaf), plus
//          C.stem, C.root single colours. Use C.main for the plant's signature colour so elements can recolour it.
//   geom   { hx, hy, hr, top, ey } head centre + radius, top row of the art, eye row. Overlays (hats, fusion parts, element
//          effects) are placed from it. Optional: hat {x, y, w} (where headgear sits), front (x where the face points).
// Helpers for species art: PX.art.face / feet / leaf / stemTo / pal.
(function () {
  'use strict';
  const { Grid, RAMPS, INK, stroke, line, starPts } = PX;
  const piece = (G, draw) => { const t = new Grid(G.w, G.h, G.k); draw(t); t.outline(); G.merge(t); return G; };
  const under = (a, b) => { for (let i = 0; i < a.a.length; i++) if (a.a[i] === null && b.a[i] !== null) a.a[i] = b.a[i]; };
  function mixHex(a, b, k) {
    try { const p = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)), A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); } catch (e) { return a; }
  }
  const lum = c => { if (typeof c !== 'string' || c[0] !== '#') return 0.5; const n = parseInt(c.slice(1), 16); return ((n >> 16 & 255) * 0.3 + (n >> 8 & 255) * 0.59 + (n & 255) * 0.11) / 255; };
  const WHITE = '#ffffff', MOUTH = '#d95763', SHINE = '#3f4aa0';
  const LEAF = ['#a6ec70', '#5cb43a', '#2f7a4a'];

  // ---------------- face (chibi sticker style) ----------------
  // Two little dot eyes in the cells (x, y) and (x + gap, y): each cell is 2 x 3 art pixels and the dot (a 2 x 2 art-pixel
  // oval with a white sparkle, drawn in fine pixels) sits in its middle, so older call sites keep their layout.
  // o: { gap: 4, mouth: [x, y, w] | null, cheeks: [x1, x2, y] | null, one: true (side view: front eye only), pupil: colour (a
  // coloured eye, e.g. Hypno-shroom), big: true (a bigger round eye) }
  // P.eyes: 'happy' (^ ^), 'closed' (sleeping), 'blink', 'sleepy' (half shut), 'sad', 'brave' (little brows) or normal dots.
  function face(g, x, y, P, o) {
    o = o || {}; P = P || {};
    const gap = o.gap == null ? 4 : o.gap, k = INK, ey = P.eyes, K = g.k || 1;
    // f(a, i, j): the fine pixel at column i, row j inside the eye cell whose left art column is a (cells are 2K x 3K fine)
    const f = (a, i, j, c) => g.fset(a * K + i, y * K + j, c);
    const eye = (a, left) => {
      if (K < 2) { // (a 1x grid: the old chunky eye)
        g.px([[a, y], [a + 1, y], [a, y + 1], [a + 1, y + 1], [a, y + 2], [a + 1, y + 2]], k); g.set(a, y, WHITE); return;
      }
      switch (ey) {
        case 'happy': for (const [i, j] of [[0, 4], [0, 3], [1, 2], [2, 2], [3, 3], [3, 4]]) f(a, i, j, k); break;
        case 'closed': for (const [i, j] of [[0, 3], [1, 4], [2, 4], [3, 3]]) f(a, i, j, k); break;
        case 'blink': for (let i = 0; i < 4; i++) f(a, i, 4, k); break;
        case 'sleepy': for (const [i, j] of [[0, 3], [1, 3], [2, 3], [3, 3], [0, 4], [1, 4], [2, 4], [3, 4], [1, 5], [2, 5]]) f(a, i, j, k); break;
        default: {
          const col = o.pupil || k;
          const dots = o.big ? [[1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2], [2, 2], [3, 2], [0, 3], [1, 3], [2, 3], [3, 3], [0, 4], [1, 4], [2, 4], [3, 4], [1, 5], [2, 5]]
            : [[1, 1], [2, 1], [0, 2], [1, 2], [2, 2], [3, 2], [0, 3], [1, 3], [2, 3], [3, 3], [1, 4], [2, 4]];
          for (const [i, j] of dots) f(a, i, j, col);
          f(a, 1, o.big ? 1 : 2, WHITE); if (o.big) f(a, 2, 1, WHITE);
          // brave: a little brow slanting down to the middle; sad: slanting up to the middle (both one fine pixel thick + a nub)
          if (ey === 'brave') { const br = left ? [[-1, -1], [0, -1], [1, 0], [2, 0], [3, 1]] : [[4, -1], [3, -1], [2, 0], [1, 0], [0, 1]]; for (const [i, j] of br) f(a, i, j - (o.big ? 1 : 0), k); }
          if (ey === 'sad') { const br = left ? [[0, 1], [1, 0], [2, 0], [3, -1], [4, -1]] : [[3, 1], [2, 0], [1, 0], [0, -1], [-1, -1]]; for (const [i, j] of br) f(a, i, j - (o.big ? 1 : 0), k); }
        }
      }
    };
    if (!o.one) eye(x, true);
    eye(o.one ? x : x + gap, false);
    if (o.cheeks) { // soft pink blush ovals (3 x 2 fine pixels), only on the face
      const [c1, c2, cy] = o.cheeks, col = o.cheek || '#f8b4c4';
      for (const cx of [c1, c2]) for (const [i, j] of [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]) { const fx = Math.round(cx * K) + i - 1, fy = cy * K + j; if (g.ffilled(fx, fy)) g.fset(fx, fy, col); }
    }
    if (o.mouth) mouth(g, o.mouth[0], o.mouth[1], o.mouth[2] || 4, P.mouth);
  }
  // A small chibi mouth centred in the box (x .. x + w - 1, rows y .. y + 1), drawn in fine pixels.
  // kind: 'open' (little open smile), 'o', 'flat', 'grin' (teeth), 'frown', default a small '‿' smile.
  function mouth(g, x, y, w, kind) {
    const k = INK, K = g.k || 1;
    if (K < 2) { // (1x fallback)
      switch (kind) {
        case 'open': g.px([[x, y], [x + w - 1, y]], k); for (let i = 1; i < w - 1; i++) { g.set(x + i, y + 1, k); g.set(x + i, y, MOUTH); } break;
        case 'flat': for (let i = 1; i < w - 1; i++) g.set(x + i, y + 1, k); break;
        default: g.set(x, y, k); for (let i = 1; i < w - 1; i++) g.set(x + i, y + 1, k); g.set(x + w - 1, y, k);
      }
      return;
    }
    const W = Math.max(4, Math.round(w * K * 0.62)), fx0 = Math.round((x + w / 2) * K - W / 2), fy = y * K;
    const P = (i, j, c) => g.fset(fx0 + i, fy + j, c);
    switch (kind) {
      case 'open': // a little D-shaped open smile with a pink inside
        for (let i = 0; i < W; i++) P(i, 0, k);
        for (let i = 1; i < W - 1; i++) { P(i, 1, MOUTH); P(i, 2, i > 1 && i < W - 2 ? MOUTH : k); }
        P(0, 1, k); P(W - 1, 1, k); for (let i = 2; i < W - 2; i++) P(i, 3, k);
        if (W >= 6) P(Math.floor(W / 2), 2, '#f4a3b8');
        break;
      case 'o': { const c = Math.floor(W / 2) - 1; for (const [i, j] of [[0, 0], [1, 0], [-1, 1], [2, 1], [-1, 2], [2, 2], [0, 3], [1, 3]]) P(c + i, j, k); P(c, 1, MOUTH); P(c + 1, 1, MOUTH); P(c, 2, MOUTH); P(c + 1, 2, MOUTH); break; }
      case 'flat': for (let i = 1; i < W - 1; i++) P(i, 2, k); break;
      case 'grin': // gritted teeth: a white bar with tooth gaps
        for (let i = 0; i < W; i++) { P(i, 0, k); P(i, 3, k); }
        for (let i = 0; i < W; i++) for (const j of [1, 2]) P(i, j, i === 0 || i === W - 1 ? k : (i % 2 === 0 && j === 2 ? '#d8d0d8' : WHITE));
        break;
      case 'frown': P(0, 3, k); P(0, 2, k); for (let i = 1; i < W - 1; i++) P(i, 1, k); P(W - 1, 2, k); P(W - 1, 3, k); break;
      default: P(0, 1, k); for (let i = 1; i < W - 1; i++) P(i, 2, k); P(W - 1, 1, k); // the little '‿'
    }
  }
  // ---------------- chibi face kit (the new standard; see docs/chibi-reference.js) ----------------
  // Big glossy eyes set low and wide, a tiny mouth, soft blush. All positions are art-pixel floats (fine-pixel precise).
  //   chibiEyes(g, cx, cy, o): cx, cy = the point between the eyes; o.sp = distance between eye centres (default 6),
  //     o.w / o.h = eye size (default 3.2 x 4.4), o.col = eye colour, o.white: true = big white eyes with pupils (Wall-nut, zombies),
  //     o.look = [dx, dy] pupil offset for white eyes, o.mood = P.eyes (happy | closed | blink | sleepy | sad | brave | mad),
  //     o.one: true = only the front eye (side view)
  //   chibiMouth(g, cx, cy, kind, w): kind = P.mouth ('smile' default, 'open', 'o', 'flat', 'grin', 'frown', 'cat'), w = width
  //   blush(g, cx, cy, o): two soft pink ovals under the eyes (o.sp, o.w, o.h, o.col)
  const EYE_INK = '#2b2129';
  // softBody(t, cx, cy, rx, ry, R, o): the chibi body fill. A flat R[1] shape with a soft R[2] crescent along the lower-right
  // edge (no hard band across the middle) and a small R[0] highlight up-left. o.rot rotates; o.shade = crescent depth (0.16);
  // o.hl: false = no highlight; o.mask = optional mask. Draw it inside PX.piece(g, t => ...) so it gets its own outline.
  function softBody(t, cx, cy, rx, ry, R, o) {
    o = o || {};
    const rot = o.rot || 0, k = o.shade == null ? 0.16 : o.shade, m = o.mask;
    t.ell(cx, cy, rx, ry, R[1], rot, m);
    const sx = -rx * k, sy = -ry * k * 1.15; // the lit part is the same ellipse nudged up-left; what's left over is the shade
    const lit = (x, y) => { const q = PX.inEll(x + 0.5 / (t.k || 1), y + 0.5 / (t.k || 1), cx + sx, cy + sy, rx * 1.02, ry * 1.02, rot); return q.in; };
    const sh = (x, y) => !lit(x, y) && (!m || m(x, y)); sh.fine = true;
    t.ell(cx, cy, rx, ry, R[2], rot, sh);
    if (o.hl !== false) t.ell(cx - rx * 0.4, cy - ry * 0.48, Math.max(0.6, rx * 0.24), Math.max(0.45, ry * 0.14), R[0], rot - 0.55, m);
  }
  function chibiEyes(g, cx, cy, o) {
    o = o || {};
    const sp = o.sp == null ? 6 : o.sp, w = o.w || 3.2, h = o.h || 4.4, mood = o.mood, col = o.col || EYE_INK, K = g.k || 1;
    const line = (pts, th) => { for (let i = 1; i < pts.length; i++) PX.stroke(g, [pts[i - 1], pts[i]], th, th, INK); };
    const th = Math.max(0.42, w * 0.15); // line thickness (art px) for closed / happy eyes and brows
    const xs = o.one ? [cx + sp / 2] : [cx - sp / 2, cx + sp / 2];
    xs.forEach((ex, i) => {
      const left = !o.one && i === 0, rx = w / 2, ry = h / 2;
      if (mood === 'happy') { line([[ex - rx, cy + ry * 0.35], [ex - rx * 0.45, cy - ry * 0.35], [ex + rx * 0.45, cy - ry * 0.35], [ex + rx, cy + ry * 0.35]], th); return; }
      if (mood === 'closed') { line([[ex - rx, cy - ry * 0.05], [ex - rx * 0.4, cy + ry * 0.5], [ex + rx * 0.4, cy + ry * 0.5], [ex + rx, cy - ry * 0.05]], th); return; }
      if (mood === 'blink') { line([[ex - rx, cy + ry * 0.3], [ex + rx, cy + ry * 0.3]], th); return; }
      if (o.white) {
        g.ell(ex, cy, rx + 0.35, ry + 0.35, INK); g.ell(ex, cy, rx, ry, '#ffffff');
        const [lx, ly] = o.look || [0.35, 0.2], pr = Math.min(rx, ry) * 0.5;
        g.ell(ex + lx * rx * 0.5, cy + ly * ry * 0.5, pr, pr * 1.15, col);
        g.dot(ex + lx * rx * 0.5 - pr * 0.45, cy + ly * ry * 0.5 - pr * 0.5, '#ffffff');
      } else if (mood === 'sleepy') { // half shut: the lower half of the eye under a flat lid line
        const m = (xx, yy) => yy >= cy - ry * 0.1; m.fine = true;
        g.ell(ex, cy, rx, ry, col, 0, m); line([[ex - rx - 0.2, cy - ry * 0.1], [ex + rx + 0.2, cy - ry * 0.1]], th);
        g.dot(ex - rx * 0.3, cy + ry * 0.25, '#ffffff');
      } else {
        g.ell(ex, cy, rx, ry, col);
        // a soft lighter glow low in the eye, then a BIG shine up-left (kept inside the eye): glossy, sparkly chibi eyes
        const m = (xx, yy) => PX.inEll(xx + 0.25, yy + 0.25, ex, cy, rx, ry, 0).in; m.fine = true;
        g.ell(ex, cy + ry * 0.55, rx * 0.7, ry * 0.32, PX.mixHex(col, '#ffffff', 0.22), 0, m);
        g.ell(ex - rx * 0.3, cy - ry * 0.32, Math.max(0.6, rx * 0.46), Math.max(0.65, ry * 0.34), '#ffffff', 0, m);
        g.dot(ex + rx * 0.38, cy + ry * 0.42, '#ffffff'); // small shine, lower right
        if (K > 1 && rx >= 1.4) g.dot(ex + rx * 0.38 + 0.5, cy + ry * 0.42, '#ffffff');
      }
      const s = left ? 1 : -1, by = cy - ry - 0.9;
      if (mood === 'brave' || mood === 'mad') line([[ex - s * rx * 1.05, by - 0.4], [ex + s * rx * 0.95, by + (mood === 'mad' ? 1.1 : 0.6)]], mood === 'mad' ? th * 1.5 : th);
      if (mood === 'sad') line([[ex - s * rx * 1.0, by + 0.6], [ex + s * rx * 0.9, by - 0.4]], th);
    });
  }
  function chibiMouth(g, cx, cy, kind, w) {
    w = w || 2.2;
    const th = 0.36, L = pts => { for (let i = 1; i < pts.length; i++) PX.stroke(g, [pts[i - 1], pts[i]], th, th, INK); };
    switch (kind) {
      case 'open': g.ell(cx, cy + 0.2, w * 0.55, w * 0.42, INK); g.ell(cx, cy + 0.15, w * 0.42, w * 0.3, '#e8707e'); g.ell(cx, cy + 0.45, w * 0.24, w * 0.14, '#ffb0bc'); break;
      case 'o': g.ell(cx, cy, w * 0.3, w * 0.36, INK); g.ell(cx, cy, w * 0.17, w * 0.22, '#e8707e'); break;
      case 'flat': L([[cx - w / 2, cy], [cx + w / 2, cy]]); break;
      case 'grin': g.ell(cx, cy, w * 0.62, w * 0.34, INK); g.ell(cx, cy, w * 0.5, w * 0.22, '#ffffff'); for (const d of [-0.33, 0, 0.33]) g.dot(cx + d * w, cy, INK); break;
      case 'frown': L([[cx - w / 2, cy + 0.45], [cx - w / 4, cy], [cx + w / 4, cy], [cx + w / 2, cy + 0.45]]); break;
      case 'cat': L([[cx - w / 2, cy - 0.2], [cx - w / 4, cy + 0.35], [cx, cy], [cx + w / 4, cy + 0.35], [cx + w / 2, cy - 0.2]]); break; // ω
      default: L([[cx - w / 2, cy - 0.25], [cx - w / 4, cy + 0.3], [cx + w / 4, cy + 0.3], [cx + w / 2, cy - 0.25]]); // ‿
    }
  }
  function blush(g, cx, cy, o) {
    o = o || {};
    const sp = o.sp == null ? 9 : o.sp, col = o.col || '#ffb3c2';
    for (const x of o.one ? [cx + sp / 2] : [cx - sp / 2, cx + sp / 2]) g.ell(x, cy, o.w || 1.5, o.h || 0.85, col, 0, (xx, yy) => g.filled(xx, yy));
  }
  // an angry face (Cactus, Coconut Cannon, Lightning Reed): eyebrows slanting down to the middle (kept when it blinks), a frown,
  // gritted teeth when it attacks or cheers, no rosy cheeks
  function madFace(g, x, y, P, o) {
    o = o || {}; P = P || {};
    const gap = o.gap == null ? 3 : o.gap, e = P.eyes, eyes = e === 'sad' || e === 'blink' || e === 'closed' ? e : 'brave';
    face(g, x, y, Object.assign({}, P, { eyes }), { gap });
    if (eyes === 'blink' || eyes === 'closed') { g.px([[x - 1, y], [x, y], [x + 1, y + 1]], INK); g.px([[x + gap + 2, y], [x + gap + 1, y], [x + gap, y + 1]], INK); }
    else if (eyes === 'brave' && !o.soft) { // a proper scowl: thick brows meeting in a V, pressing on the eyes (the kids said thin ones didn't read as mad)
      const K = g.k || 1;
      if (K < 2) { const a = x, b = a + 1, c = x + gap, d = c + 1; g.px([[a - 1, y - 2], [a, y - 2], [a, y - 1], [b, y - 1], [b + 1, y], [d + 1, y - 2], [d, y - 2], [d, y - 1], [c, y - 1], [c - 1, y], [a, y], [c, y]], INK); }
      else for (const [cx, dir] of [[x, 1], [x + gap, -1]]) { // a 2-fine-pixel-thick bar from high outside to low inside, cutting the top of the eye
        const ox = cx * K + (dir > 0 ? 0 : 3), oy = y * K;
        for (let t = 0; t <= 5; t++) { const fx = ox + dir * (t - 1), fy = oy - 2 + Math.round(t * 0.75); g.fset(fx, fy, INK); g.fset(fx, fy + 1, INK); }
      }
    }
    if (o.mouth) mouth(g, o.mouth[0], o.mouth[1], o.mouth[2] || 4, P.mouth === 'open' || P.mouth === 'grin' ? 'grin' : P.mouth === 'o' ? 'o' : 'frown');
  }
  // mushrooms have no feet: the stalk flares out to meet the ground (it squashes a little as it walks)
  function shroomFoot(g, cx, P, ramp, w) {
    const sq = P && P.walk && P.frame ? 1 : 0;
    g.ell(cx + sq * 0.5, 28.7 + sq * 0.2, w + sq * 0.4, 1.9 - sq * 0.2, ramp);
  }
  // little root feet (walk: one lifts). cx = centre between the feet.
  // (PvZ plants have no legs: they're rooted and hop on their leaves, so this draws nothing now. Kept so old call sites work.)
  function feet() {}
  // a leaf from (x, y): length len, angle ang (radians, 0 = right, negative = up)
  function leaf(g, x, y, len, ang, ramp, fat) { g.ell(x + Math.cos(ang) * len / 2, y + Math.sin(ang) * len / 2, len / 2, len * (fat || 0.27), ramp || LEAF, ang); }
  // two base leaves for the leaf pose (up = cheering, out = arms out, default resting)
  function baseLeaves(g, cx, y, P, ramp, len) {
    const a = P && P.arms, L2 = len || 5.5;
    const ang = a === 'up' ? 0.95 : a === 'out' ? 0.15 : a === 'hold' ? -0.35 : -0.35;
    leaf(g, cx - 1, y, L2, Math.PI + ang, ramp); leaf(g, cx + 1, y, L2, -ang, ramp);
  }
  function stemTo(g, pts, col, r) { stroke(g, pts, r || 0.9, (r || 0.9) * 0.85, col || '#4f9a3e'); }

  // ---------------- colours ----------------
  // Element colours (pastel): main replaces the plant's signature colour, leaf its leaves (an element plant is recoloured all over).
  const EL_PAL = {
    fire: { main: ['#ffe3b0', '#ffb27a', '#f2865e'], leaf: ['#ffd29a', '#f7a06a', '#dc7650'] },
    water: { main: ['#d8f6ff', '#94d8f6', '#62b0e2'], leaf: ['#bff2e8', '#80d6c8', '#52aea4'] },
    ice: { main: ['#f8feff', '#d2f0fc', '#9ed0ee'], leaf: ['#e4f7ff', '#b4def4', '#84b8de'] },
    electric: { main: ['#fffcd0', '#fff08a', '#f2c95a'], leaf: ['#f0f8b0', '#d4e47c', '#a8bc54'] },
    laser: { main: ['#ffd8e2', '#ffa2b8', '#ec7896'], leaf: ['#e2dcff', '#bbb0fa', '#9284e2'] },
    poison: { main: ['#f2dcff', '#d2aaf6', '#ac80dc'], leaf: ['#dcf5a8', '#acdb78', '#80b452'] },
    magic: { main: ['#ffe8fb', '#ffbdee', '#ec90d4'], leaf: ['#e6d8ff', '#c4aefa', '#9e86e2'] },
    dark: { main: ['#c4b8e2', '#978ac2', '#6f62a0'], leaf: ['#ab9ed0', '#8174b0', '#5e5292'] },
    rock: { main: ['#efe8dc', '#d4cab8', '#ac9e8e'], leaf: ['#d8d0ba', '#b4aa92', '#8e846e'] },
    robot: { main: ['#f6f8fd', '#d4dcea', '#a4b0c8'], leaf: ['#dfe5ef', '#b8c2d4', '#8e9ab2'] },
    normal: { main: ['#fffcf4', '#f6eddc', '#dccdb2'], leaf: null },
  };
  const PLANT_PAL = {}; // filled by art-plants*.js: PLANT_PAL[id] = { main, leaf, acc, stem, root, part }
  const lift = (R, k) => R.map(c => mixHex(c, '#ffffff', k));
  // A plant fused with another plant becomes two-tone: its leaves and stem take the partner's colours, and its own colour
  // leans a little toward the partner's (the partner's signature part, drawn big, carries the rest).
  // (a near-white partner - Dandelion, Caulipower, Garlic... - lends its accent colour instead: white leaves melted into a white
  // part, and the plant looked like it sat in foam with no roots)
  const pale = c => { const n = parseInt(String(c).slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255, mx = Math.max(r, g, b); return lum(c) > 0.9 && (mx - Math.min(r, g, b)) / (mx || 1) < 0.2; };
  function pal(species, element, fuseWith) {
    const base = PLANT_PAL[species] || PLANT_PAL.peashooter || { main: RAMPS.leaf, leaf: LEAF, acc: RAMPS.sun };
    const C = { main: base.main, leaf: base.leaf || LEAF, acc: base.acc || base.main, stem: base.stem || '#7cc05a', root: base.root || '#b88a5c' };
    if (fuseWith && PLANT_PAL[fuseWith] && fuseWith !== species) {
      const F = PLANT_PAL[fuseWith], FL = F.fuseLeaf || (pale(F.main[1]) ? (F.acc && !pale(F.acc[1]) ? F.acc : F.leaf || LEAF) : F.main);
      C.leaf = FL; C.stem = mixHex(C.stem, FL[1], 0.55);
      C.main = C.main.map((c, i) => mixHex(c, F.main[i], i === 2 ? 0.3 : 0.16));
    }
    const E = element && EL_PAL[element];
    if (E) { C.main = E.main; if (E.leaf) { C.leaf = E.leaf; C.stem = E.leaf[2]; } }
    return C;
  }

  // ---------------- overlays: shared geometry ----------------
  // where headgear sits (old contract): bottom-centre x, y and width
  const hatAt = G => G.hat || { x: G.hx, y: Math.round(G.hy - G.hr * 0.55), w: Math.max(7, Math.round(G.hr * 1.9)) };
  const flat = R => [R[1], R[1], R[2]];
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  // the shape's left / right edge on art row y, walking out from column cx over drawn pixels (stops after lim art px)
  function span(g, y, cx, lim) {
    const k = g.k || 1, fy = Math.round(y * k), c0 = Math.round(cx * k);
    if (!g.fget(c0, fy)) return null;
    let l = c0, r = c0;
    while (l > 0 && g.fget(l - 1, fy) && c0 - l < lim * k) l--;
    while (r < g.fw - 1 && g.fget(r + 1, fy) && r - c0 < lim * k) r++;
    return { l: l / k, r: (r + 1) / k };
  }
  // the leader head's eyes: of all the eye blobs, the one nearest its eye centre (G.hx, G.ey) and a partner on the same row
  // (found once per species + stage on a plain pose, then moved with the head)
  function findEyes(g, G) {
    const hr = G.hr || 6, ey = G.ey != null ? G.ey : G.hy, cen = b => [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
    const near = eyeBlobs(g).filter(b => { const [x, y] = cen(b); return Math.abs(y - ey) < hr * 0.6 && Math.abs(x - G.hx) < hr * 1.3 && b.x1 - b.x0 < hr * 0.9; });
    if (!near.length) return null;
    const d = b => { const [x, y] = cen(b); return Math.abs(x - G.hx - 1) + 2 * Math.abs(y - ey); };
    near.sort((a, b) => d(a) - d(b));
    const a = near[0], [ax, ay] = cen(a), mate = near.slice(1).find(b => { const [x, y] = cen(b); return Math.abs(y - ay) < hr * 0.28 && Math.abs(x - ax) > hr * 0.3 && Math.abs(x - ax) < hr * 1.4; });
    return (mate ? [a, mate] : [a]).sort((p, q) => p.x0 - q.x0).map(b => ({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, w: b.x1 - b.x0, h: b.y1 - b.y0 }));
  }
  // every eye-like blob anywhere in the plant (all its heads): connected dark glossy pixels, padded out for big white eyes
  function eyeBlobs(g) {
    const k = g.k || 1, W = g.fw, N = g.fw * g.fh, seen = new Uint8Array(N), out = [];
    // eye colours: dark glossy ones, plus any colour that wraps a white shine pixel on all four sides (red Doom eyes, yellow Snapdragon eyes...)
    const eyeCol = new Set();
    for (let i = W; i < N - W; i++) {
      if (g.a[i] !== WHITE) continue;
      const nb = [g.a[i - 1], g.a[i + 1], g.a[i - W], g.a[i + W]], c = nb.find(v => v && v !== WHITE);
      if (c && c !== INK && c[0] === '#' && lum(c) < 0.8 && nb.filter(v => v === c).length >= 3 && nb.every(v => v === c || v === WHITE)) eyeCol.add(c);
    }
    if (eyeCol.size) { const cnt = new Map(); for (let i = 0; i < N; i++) if (eyeCol.has(g.a[i])) cnt.set(g.a[i], (cnt.get(g.a[i]) || 0) + 1); for (const [c, n] of cnt) if (n > 64 * k * k) eyeCol.delete(c); } // (eyes are small: a body colour with a sparkle isn't one)
    const dark = i => { const c = g.a[i]; return !!c && c !== INK && c[0] === '#' && (lum(c) < 0.25 || eyeCol.has(c)); };
    for (let i = 0; i < N; i++) {
      if (seen[i] || !dark(i)) continue;
      const st = [i]; seen[i] = 1; let x0 = W, y0 = N, x1 = -1, y1 = -1, n = 0;
      while (st.length) {
        const j = st.pop(), x = j % W, y = (j - x) / W; n++;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        for (const q of [j - 1, j + 1, j - W, j + W]) if (q >= 0 && q < N && !seen[q] && Math.abs((q % W) - x) <= 1 && dark(q)) { seen[q] = 1; st.push(q); }
      }
      if (n < 4 || x1 - x0 >= 8 * k || y1 - y0 >= 9 * k) continue;
      { // a white eye round the pupil? grow over the white touching it, at most 3 art px from the pupil's centre
        const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, R = 3 * k, wst = [], wseen = new Set();
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) wst.push(y * W + x);
        let grew = 0;
        while (wst.length) {
          const j = wst.pop(), x = j % W, y = (j - x) / W;
          for (const q of [j - 1, j + 1, j - W, j + W]) { if (q < 0 || q >= N || wseen.has(q) || g.a[q] !== WHITE) continue; const qx = q % W, qy = (q - qx) / W; if (Math.abs(qx - x) > 1 || Math.hypot(qx - mx, qy - my) > R) continue; wseen.add(q); wst.push(q); grew++; if (qx < x0) x0 = qx; if (qx > x1) x1 = qx; if (qy < y0) y0 = qy; if (qy > y1) y1 = qy; }
        }
        void grew;
      }
      let a = x0 / k, b = (x1 + 1) / k, c = y0 / k, d = (y1 + 1) / k;
      if (b - a < 2.4) { const m = (a + b) / 2; a = m - 1.5; b = m + 1.5; }
      if (d - c < 2.8) { const m = (c + d) / 2; c = m - 1.7; d = m + 1.7; }
      out.push({ x0: a, y0: c, x1: b, y1: d });
    }
    return out;
  }
  const eyeCache = new Map();
  function eyeInfo(sp, stage) {
    const key = sp + ':' + stage;
    if (!eyeCache.has(key)) {
      let rel = null, all = [];
      try {
        const t = new Grid(32, 32), G0 = PX.PLANT_ART[sp](t, stage, {}, pal(sp));
        if (G0) {
          const ox = G0.hx, oy = G0.ey != null ? G0.ey : G0.hy, e = findEyes(t, G0);
          if (e) rel = e.map(q => ({ dx: q.x - ox, dy: q.y - oy, w: q.w, h: q.h }));
          all = eyeBlobs(t).map(b => ({ x0: b.x0 - ox, y0: b.y0 - oy, x1: b.x1 - ox, y1: b.y1 - oy }));
        }
      } catch (e) { rel = null; all = []; }
      eyeCache.set(key, { rel, all });
    }
    return eyeCache.get(key);
  }
  function eyeSpots(sp, stage, G) {
    const rel = eyeInfo(sp, stage).rel; if (!rel) return null;
    const ey = G.ey != null ? G.ey : G.hy;
    return rel.map(q => ({ x: G.hx + q.dx, y: ey + q.dy, w: q.w, h: q.h }));
  }
  // everything an overlay needs to fit a plant of any shape: head centre / size, the brim line where hats sit (always above the
  // eyes), the head's half width there and at its middle, the neck (bottom of the head), eye boxes and a size factor s
  function geom(g, G, sp, stage) {
    const hr = Math.max(3, G.hr || 6), top = G.top != null ? G.top : Math.round(G.hy - hr), hh = Math.max(3, G.hy - top), ey = G.ey != null ? G.ey : G.hy;
    const eyes = eyeSpots(sp, stage, G);
    const one = !eyes || eyes.length < 2; // (a squinting or missing eye is a line we can't measure: assume a standard big eye too)
    const eyeTop = Math.min(eyes ? Math.min(...eyes.map(e => e.y - e.h / 2)) : 99, one ? ey - hr * 0.34 : 99), eyeBot = Math.max(eyes ? Math.max(...eyes.map(e => e.y + e.h / 2)) : -99, one ? ey + hr * 0.32 : -99);
    const brim = Math.round(clamp(Math.min(eyeTop - 1.4, top + Math.max(2.5, 0.5 * (eyeTop - top))), top + 1.2, 29) * 2) / 2;
    const sB = span(g, brim, G.hx, hr * 1.35), sM = span(g, G.hy, G.hx, hr * 1.4);
    const bw = sB ? clamp((sB.r - sB.l) / 2, hr * 0.45, hr * 1.25) : hr * 0.8, bx = sB ? clamp((sB.l + sB.r) / 2, G.hx - 2, G.hx + 2) : G.hx;
    const mw = sM ? clamp(G.hx - sM.l, hr * 0.6, hr * 1.35) : hr;
    const neck = Math.min(29.5, G.hy + hh * 0.92);
    // other heads' eyes come in pairs (a lone shiny blob, like an antenna ball or a crown jewel, isn't an eye)
    const raw = eyeInfo(sp, stage).all.map(b => ({ x0: G.hx + b.x0, y0: ey + b.y0, x1: G.hx + b.x1, y1: ey + b.y1 })), mid = b => [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
    const boxes = raw.filter(b => { const [x, y] = mid(b); return raw.some(o => { if (o === b) return false; const [ox, oy] = mid(o); return Math.abs(oy - y) < 1.6 && Math.abs(ox - x) > 1.8 && Math.abs(ox - x) < 9; }); });
    if (eyes) for (const e of eyes) boxes.push({ x0: e.x - e.w / 2, y0: e.y - e.h / 2, x1: e.x + e.w / 2, y1: e.y + e.h / 2 });
    // hits(x0, y0, x1, y1): would a costume piece in this box cross any eye of any head?
    const over = (b, x0, y0, x1, y1) => x0 < b.x1 + 0.3 && x1 > b.x0 - 0.3 && y0 < b.y1 + 0.3 && y1 > b.y0 - 0.3;
    const hits = (x0, y0, x1, y1) => boxes.some(b => over(b, x0, y0, x1, y1));
    const own = eyes ? eyes.map(e => ({ x0: e.x - e.w / 2, y0: e.y - e.h / 2, x1: e.x + e.w / 2, y1: e.y + e.h / 2 })) : [], others = boxes.filter(b => !own.some(o => over(o, b.x0, b.y0, b.x1, b.y1)));
    const hitsOther = (x0, y0, x1, y1) => others.some(b => over(b, x0, y0, x1, y1)); // (another head's eyes, not the leader's)
    const lowEye = boxes.length ? Math.max(eyeBot, ...boxes.map(b => b.y1)) : eyeBot;
    return { hx: G.hx, hy: G.hy, hr, hh, top, ey, eyes, eyeTop, eyeBot, brim, bw, bx, mw, neck, s: clamp(hr / 9, 0.6, 1.2), front: G.front, hat: hatAt(G), boxes, others, hits, hitsOther, lowEye };
  }
  // the overlay layers: back (under the plant), front (over it), post (painted straight onto the finished plant)
  function layers() {
    const back = new Grid(32, 32), front = new Grid(32, 32), post = [];
    return { back: f => piece(back, f), front: f => piece(front, f), post: f => post.push(f), backG: back, frontG: front,
      done(g) { back.outline(); under(g, back); front.outline(); g.merge(front); for (const f of post) f(g); } };
  }
  // painting helpers for post steps: only on the plant's own pixels (so straps and masks wrap the body)
  const onBody = (g, fx, fy) => { const c = g.fget(fx, fy); return c && c !== INK && c[0] === '#'; };
  let AVOID = null; // eye boxes of the plant being dressed (set by buildPlant)
  const inEye = (x, y) => !!AVOID && AVOID.some(b => x > b.x0 - 0.2 && x < b.x1 + 0.2 && y > b.y0 - 0.2 && y < b.y1 + 0.2);
  function paint(g, test, col) { const k = g.k; for (let fy = 0; fy < g.fh; fy++) for (let fx = 0; fx < g.fw; fx++) { const x = (fx + 0.5) / k, y = (fy + 0.5) / k; if (onBody(g, fx, fy) && !inEye(x, y) && test(x, y)) g.fset(fx, fy, typeof col === 'function' ? col(x, y) : col); } }
  // a four-point twinkle (outlined so it shows on any lawn); big = the brighter frame
  function twinkle(t, x, y, r, col) { t.poly([[x, y - r], [x + r * 0.3, y - r * 0.3], [x + r, y], [x + r * 0.3, y + r * 0.3], [x, y + r], [x - r * 0.3, y + r * 0.3], [x - r, y], [x - r * 0.3, y - r * 0.3]], col || '#fff6b0'); }
  const star5 = (t, x, y, ro, ri, col, rot) => t.poly(starPts(x, y, ro, ri, 5, rot), col);
  // a soft-edged glow behind a small shape: fine-pixel rings of fading colour round everything already on t
  function haloAround(g, x0, y0, x1, y1, col, alphas) {
    const k = g.k, W = g.fw, H = g.fh;
    for (const a of alphas) {
      const add = [];
      for (let fy = Math.max(0, Math.floor(y0 * k)); fy < Math.min(H, Math.ceil(y1 * k)); fy++) for (let fx = Math.max(0, Math.floor(x0 * k)); fx < Math.min(W, Math.ceil(x1 * k)); fx++) {
        if (g.a[fy * W + fx] !== null) continue;
        if ((fx > 0 && g.a[fy * W + fx - 1]) || (fx < W - 1 && g.a[fy * W + fx + 1]) || (fy > 0 && g.a[(fy - 1) * W + fx]) || (fy < H - 1 && g.a[(fy + 1) * W + fx])) add.push(fy * W + fx);
      }
      for (const i of add) g.a[i] = rgba(col, a);
    }
  }

  // ---- shared costume pieces ----
  const OLIVE = ['#dbe4a4', '#b4c274', '#8c9c52'], STEELR = ['#f6f9fd', '#d2dae8', '#9ea9c2'], GOLD = ['#fff6c4', '#ffdc72', '#eaae46'];
  const GEMS = ['#ff8fb4', '#82cfff', '#86e6b4', '#c8a2ff'];
  // Army helmet (Gatling Pea + the Army Helmet item): a chunky olive dome tipped back a touch, a rolled brim sticking out at the front
  function armyHelmet(t, cx, by, w) {
    softBody(t, cx - 0.2, by + 0.7, w + 0.2, w * 0.74 + 1, OLIVE, { mask: (x, y) => y <= by + 0.3, rot: -0.08 });
    t.ell(cx + 0.8, by + 0.6, w + 1.4, Math.max(1, w * 0.13), flat(['#d0dc94', '#a6b464', '#7e8e48']));
  }
  function armyHelmetDetails(g, cx, by, w) {
    const ok = (x, y) => g.filled(x, y), put = (x, y, c) => { if (ok(x, y)) g.dot(x, y, c); };
    for (const [dx, dy, rx, ry, c] of [[-0.42, -0.42, 0.18, 0.12, '#9aaa5c'], [0.18, -0.55, 0.15, 0.1, '#c8b884'], [0.48, -0.22, 0.12, 0.1, '#9aaa5c']]) // soft camo blobs
      g.ell(cx + w * dx, by - w * 0.74 * -dy * -1 + 0.2, Math.max(0.8, w * rx), Math.max(0.55, w * ry), c, 0.3, (x, y) => ok(x, y) && y < by - 0.2);
    for (let i = 0; i < 4; i++) put(cx - w * 0.55 + i * 0.5, by - w * 0.55 - i * 0.18, '#f4f8d8'); // shine
  }
  // Knight helmet: a round steel dome with a centre ridge and a raised visor peak, a big pink-red plume streaming back
  function knightHelmet(t, cx, by, w) {
    const top = by - (w * 0.82 + 1);
    stroke(t, [[cx + 0.4, top + 0.8], [cx - 1, top - 1.6], [cx - 3.6, top - 2.2], [cx - 6.4, top - 0.8], [cx - 7.6, top + 1.8]], 1.9, 0.8, '#ff7a90');
    softBody(t, cx, by + 1, w + 0.4, w * 0.82 + 2, STEELR, { mask: (x, y) => y <= by + 0.6 });
  }
  function knightHelmetDetails(g, cx, by, w) {
    const top = by - (w * 0.82 + 1), put = (x, y, c) => { if (g.filled(x, y)) g.dot(x, y, c); };
    for (let y = top + 0.5; y <= by; y += 0.5) put(cx + 0.25, y, '#ffffff'); // centre ridge
    for (let x = cx - w + 0.6; x <= cx + w - 0.4; x += 1.5) { put(x, by - 0.4, '#8e9ab4'); put(x + 0.5, by - 0.4, '#8e9ab4'); } // rivets
    for (const [dx, dy] of [[-1, -2.2], [-2.6, -2.6], [-4.2, -2.4], [-5.8, -1.4]]) { put(cx + dx, top + dy, '#ffc0cc'); put(cx + dx + 0.5, top + dy, '#ffc0cc'); } // plume light edge
  }
  // a hat crown + brim (used by several costumes): R crown ramp, B brim ramp
  function hatShape(L, X, R, B, o) {
    o = o || {}; const s = X.s, cx = X.bx + (o.dx || 0), by = X.brim, w = X.bw + (o.extra == null ? 1.8 : o.extra) * s, ch = (o.h || 4.2) * s;
    L.front(t => softBody(t, cx - 0.2, by + 0.4, w * (o.crown || 0.72), ch + 0.4, R, { mask: (x, y) => y <= by + 0.2 }));
    L.front(t => t.ell(cx + 0.4, by + 0.5, w, Math.max(1.1, 1.3 * s), flat(B)));
    return { cx, by, w, ch };
  }

  // ---- wave 5 costume helpers ----
  const fm = f => { f.fine = true; return f; }; // (a mask checked at fine-pixel precision)
  // hue (0-360) of a '#rrggbb' colour, -1 for a grey
  const hueOf = c => { const n = parseInt(String(c).slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), d = mx - Math.min(r, g, b); if (!d || isNaN(n)) return -1; const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (h * 60 + 360) % 360; };
  // the chibi crescent shade for any shape already on t (softBody does it for ellipses): every pixel outside the ellipse
  // (cx, cy, rx, ry) nudged up-left becomes R[2], plus a small R[0] highlight. o.only = recolour just that colour; o.hl: false
  function shadeShape(t, cx, cy, rx, ry, R, o) {
    o = o || {}; const K = t.k || 1, sx = cx - rx * 0.16, sy = cy - ry * 0.18;
    for (let fy = 0; fy < t.fh; fy++) for (let fx = 0; fx < t.fw; fx++) { const i = fy * t.fw + fx, c = t.a[i]; if (!c || c === INK || (o.only && c !== o.only)) continue; if (!PX.inEll((fx + 0.5) / K, (fy + 0.5) / K, sx, sy, rx * 1.02, ry * 1.02, 0).in) t.a[i] = R[2]; }
    if (o.hl !== false) t.ell(cx - rx * 0.42, cy - ry * 0.5, Math.max(0.6, rx * 0.22), Math.max(0.45, ry * 0.13), R[0], -0.55, fm((x, y) => t.filled(x, y)));
  }
  // little floating extras (sparkles, notes, hearts, bubbles) drawn on their own grid, outlined, and tucked UNDER the plant:
  // they only fill empty space, so they can never cover a face
  function floatBits(g, draw) { const t = new Grid(g.w, g.h, g.k); draw(t); t.outline(); under(g, t); }
  // a heart (the classic curve): centre (cx, cy), half width w, half height h, point down
  function heartPts(cx, cy, w, h, n) { const p = []; n = n || 30; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, x = 16 * Math.sin(a) ** 3, y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); p.push([cx + x / 16 * w, cy - (y + 2.5) / 14.5 * h]); } return p; }
  // a tiny five-petal flower (round petals round a round middle), r = its radius
  function flower5(t, x, y, r, col, mid, rot) { for (let i = 0; i < 5; i++) { const a = (rot || 0) - Math.PI / 2 + i * Math.PI * 2 / 5; t.ell(x + Math.cos(a) * r * 0.58, y + Math.sin(a) * r * 0.58, r * 0.5, r * 0.5, col); } t.ell(x, y, r * 0.36, r * 0.36, mid || '#ffd84a'); }
  // a glossy holly leaf from (x, y), length len along angle ang: prickly points along both edges, a light upper half and a
  // shaded lower half meeting at the midrib (R = [light, mid, shade])
  function hollyLeaf(t, x, y, len, ang, R) {
    const c = Math.cos(ang), sn = Math.sin(ang), w = len * 0.31, at = (u, v) => [x + c * u * len - sn * v * w, y + sn * u * len + c * v * w];
    const edge = [[0.16, 0.6], [0.3, 1.08], [0.44, 0.66], [0.6, 1.08], [0.74, 0.62], [0.87, 0.82]];
    t.poly([at(0, 0)].concat(edge.map(([u, v]) => at(u, v)), [at(1, 0)]), R[1]);
    t.poly([at(0, 0)].concat(edge.map(([u, v]) => at(u, -v)), [at(1, 0)]), R[2]);
  }
  // a music note: a round head, a stem and a little flag
  function musicNote(t, x, y, s, col) { t.ell(x, y, 0.85 * s, 0.68 * s, col, -0.35); stroke(t, [[x + 0.6 * s, y - 0.1], [x + 0.6 * s, y - 2.7 * s]], 0.26, 0.26, col); stroke(t, [[x + 0.6 * s, y - 2.7 * s], [x + 1.5 * s, y - 2.1 * s], [x + 1.6 * s, y - 1.5 * s]], 0.26, 0.26, col); }
  // a spiral curl starting at (x, y) heading along angle a0, winding `turns` times (dir 1 clockwise) as it shrinks to the middle
  function spiralPts(x, y, r, a0, turns, dir) {
    const cx = x - Math.cos(a0 - dir * Math.PI / 2) * r, cy = y - Math.sin(a0 - dir * Math.PI / 2) * r, n = Math.ceil(turns * 18), p = [];
    for (let i = 0; i <= n; i++) { const k = i / n, a = a0 - dir * Math.PI / 2 + dir * k * turns * Math.PI * 2, rr = r * (1 - k * 0.72); p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
    return p;
  }
  // is (x, y) on the plant itself (its resting pose, moved with the head)? (a head-sized ellipse when the pose isn't known)
  function bodyAt(X, x, y) {
    const b = X.body; if (!b) return ((x - X.hx) / X.mw) ** 2 + ((y - X.hy) / X.hh) ** 2 <= 1;
    const k = b.k || 1; return b.fget(Math.floor((x - X.hx + X.hx0) * k), Math.floor((y - X.hy + X.hy0) * k)) != null;
  }
  // the real top of the head at column x, for things that sit ON it: X.top is the plant's highest point, and on some bodies
  // that's a thin feature above the head (Lily Pad's lotus bud, Cattail's tail, Storm Striker's bolt), so a sprig or crown
  // put there floated in the air. Scanning down from X.top, the first row where the plant is solid across a 3 px strip
  // round x (a halo doesn't count, and a bolt tip or stalk narrower than that is passed over); X.top if there's none.
  function topAt(X, x) {
    const b = X.body; if (!b) return X.top;
    const k = b.k || 1, solid = (xx, y) => { const c = b.fget(Math.floor((xx - X.hx + X.hx0) * k), Math.floor((y - X.hy + X.hy0) * k)); return !!c && c[0] === '#'; };
    for (let y = X.top; y <= X.neck; y += 0.25) if (solid(x - 1.5, y) && solid(x, y) && solid(x + 1.5, y)) return y;
    return X.top;
  }
  // where a badge or a small shield (half size r) goes: low on the front of the head, else at the very bottom, else behind it
  // (1.6 px inside the right edge, outline and all)
  function badgeSpot(X, r) {
    const x = Math.min(30.4 - r, X.hx + X.mw * 0.62), box = y => X.hits(x - r - 0.1, y - r - 0.1, x + r + 0.1, y + r + 0.9);
    let y = X.neck - 1.6 * X.s; if (box(y)) y = 31.4 - r - 0.6;
    return { x, y, behind: box(y) };
  }

  // ---------------- fusion parts (data.js PLANTS[id].part): the partner plant's signature, drawn BIG ----------------
  // draw(L, X, F, P, C): L = layers, X = geom, F = the partner's palette, C = the body's palette. glow: the fusion aura colour.
  const PART = {
    // Sunflower, Marigold...: a full ring of big two-tone petals round the head
    petals: { glow: F => F.main[0], draw(L, X, F) {
      const n = 14, a0 = -Math.PI / 2, hw = X.mw + 1.2 * X.s, hh = X.hh + 1.1 * X.s, P0 = lift(F.main, 0.15), P1 = F.main;
      for (const odd of [0, 1]) L.back(t => { for (let i = odd; i < n; i += 2) { const a = a0 + i * Math.PI * 2 / n; t.ell(X.hx + Math.cos(a) * hw, X.hy + Math.sin(a) * hh, 3 * X.s, 2.1 * X.s, flat(odd ? P1 : P0), a); } });
    } },
    // Peashooter family: a second pea snout aimed up at the front + a pea leaf tuft at the back
    snout: { glow: F => F.main[0], draw(L, X, F) {
      const s = X.s, a = -0.78, bx = X.hx + Math.cos(a) * X.mw * 0.78, by = X.hy + Math.sin(a) * X.hh * 0.8, d = -0.78, len = 4.4 * s;
      const tx = Math.min(29, bx + Math.cos(d) * len), ty = Math.max(3.2 * s, by + Math.sin(d) * len);
      L.back(t => { t.ell(X.hx - X.mw * 0.7, X.top + X.hh * 0.32, 3.6 * s, 1.8 * s, flat(F.leaf || LEAF), -0.9); });
      const SN = X.hitsOther(Math.min(bx, tx) - 2.5 * s, Math.min(by, ty) - 2.8 * s, Math.max(bx, tx) + 2.5 * s, Math.max(by, ty) + 2.5 * s) ? L.back : L.front;
      SN(t => stroke(t, [[bx, by], [tx, ty]], 2.5 * s, 2.3 * s, F.main[1]));
      SN(t => { t.ell(tx + 0.5, ty - 0.5, 1.75 * s, 2.8 * s, F.main[0], d + Math.PI / 2); });
      L.post(g => { g.ell(tx + 0.75, ty - 0.75, 1.0 * s, 1.85 * s, mixHex(F.main[2], EYE_INK, 0.5), d + Math.PI / 2, (x, y) => g.filled(x, y)); });
    } },
    // Chomper, Snapdragon, Guacodile: a big jaw hood - the upper jaw over the head with teeth hanging over the forehead, the
    // lower jaw under the chin with teeth pointing up (it looks like it's wearing a Chomper!)
    jaws: { glow: F => F.main[0], draw(L, X, F) {
      const s = X.s, by = X.brim - 0.8, cx = X.bx + 0.6, w = X.bw + 2.4 * s, h = by - X.top + 2.6 * s, ny = X.neck - 0.4, lw = X.mw * 0.9 + 1, tw = 1.25 * s, step = 2.9 * s;
      L.front(t => softBody(t, cx, by, w, h, F.main, { mask: (x, y) => y <= by }));
      L.front(t => t.ell(cx, by + 0.1, w - 0.6, 0.8 * s, '#ff9ab0', 0, (x, y) => y >= by - 0.2));
      L.front(t => { const n = Math.max(3, Math.floor((2 * w - 2) / step)), x0 = cx - (n - 1) * step / 2; for (let i = 0; i < n; i++) { const x = x0 + i * step; t.poly([[x - tw, by + 0.3], [x + tw, by + 0.3], [x, by + 1.9 * s]], '#ffffff'); } });
      const LJ = X.hits(X.hx + 0.5 - lw, ny - 2.2, X.hx + 0.5 + lw, ny + 2.6 * s) ? () => {} : L.front;
      LJ(t => softBody(t, X.hx + 0.5, ny, lw, 2.6 * s, F.main, { mask: (x, y) => y >= ny - 0.4, hl: false }));
      LJ(t => { t.ell(X.hx + 0.5, ny + 0.2, lw - 1.6, 1.1 * s, '#ff9ab0', 0, (x, y) => y >= ny - 0.3); });
      LJ(t => { const n = Math.max(3, Math.floor((2 * lw - 3) / step)), x0 = X.hx + 0.5 - (n - 1) * step / 2; for (let i = 0; i < n; i++) { const x = x0 + i * step; t.poly([[x - tw, ny - 0.2], [x + tw, ny - 0.2], [x, ny - 1.8 * s]], '#ffffff'); } });
      L.post(g => { for (const [dx, dy, r] of [[-0.45, -0.55, 0.9], [0.1, -0.75, 0.7], [0.5, -0.35, 0.6]]) g.ell(cx + dx * w, by + dy * h, r * s, r * s * 0.8, lift(F.main, 0.5)[0], 0, (x, y) => g.filled(x, y)); });
    } },
    // Wall-nut, Infi-nut: nut-shell armour - a shell helmet with a crack and a shell breastplate
    shell: { glow: F => F.main[0], draw(L, X, F) {
      const s = X.s, by = X.brim, cx = X.bx, w = X.bw + 1.4 * s, h = by - X.top + 2.8 * s, crack = mixHex(F.main[2], INK, 0.35);
      const sy = X.hy + X.hh * 0.42, sw = 2.6 * s, sh = 3.2 * s;
      const pads = [-1, 1].filter(dir => { const x = X.hx + dir * (X.mw + 0.2) + (dir > 0 ? 0.6 : 0); return !X.hits(x - sw, sy - sh, x + sw, sy + sh); });
      L.front(t => { for (const dir of pads) softBody(t, X.hx + dir * (X.mw + 0.2) + (dir > 0 ? 0.6 : 0), sy, sw, sh, F.main, { rot: dir * 0.25 }); });
      L.front(t => softBody(t, cx, by + 0.6, w, h + 0.6, F.main, { mask: (x, y) => y <= by + 0.4 }));
      L.front(t => t.ell(cx + 0.3, by + 0.5, w + 0.4, 1.15 * s, flat(F.main)));
      L.post(g => { PX.stroke(g, [[cx - w * 0.4, by - h * 0.78], [cx - w * 0.18, by - h * 0.5], [cx - w * 0.34, by - h * 0.25]], 0.34, 0.34, crack);
        PX.stroke(g, [[cx + w * 0.3, by - h * 0.6], [cx + w * 0.45, by - h * 0.4]], 0.3, 0.3, crack);
        for (const dir of pads) { const x = X.hx + dir * (X.mw + 0.2) + (dir > 0 ? 0.6 : 0); PX.stroke(g, [[x - 0.4, sy - sh * 0.5], [x + 0.4, sy - sh * 0.1], [x - 0.2, sy + sh * 0.3]], 0.28, 0.28, crack); } });
    } },
    // Cherry Bomb: two little cherry bombs dangling like earrings (with sleepy-cute faces) from a stem bow on top
    cherries: { glow: F => F.main[0], draw(L, X, F) {
      const s = X.s, r = 2.3 * s, yy = X.hy + X.hh * 0.5, cxOf = x => Math.max(r + 0.4, Math.min(31.4 - r, x));
      const pts = [[X.hx - X.mw - 0.4, yy], [X.hx + X.mw * 0.95 + 0.6, yy + X.hh * 0.32]].filter(([x, y]) => { const sx = x + (x < X.hx ? 1.4 : -1.4), sy = X.hy - X.hh * 0.15; return !X.hits(Math.min(cxOf(x), sx) - r, Math.min(sy, y - r - 1), Math.max(cxOf(x), sx) + r, y + r); });
      L.front(t => { for (const [x, y] of pts) stroke(t, [[x + (x < X.hx ? 1.4 : -1.4), X.hy - X.hh * 0.15], [x, y - r * 0.6]], 0.45, 0.4, '#7cc05a'); });
      L.front(t => { for (const [x, y] of pts) softBody(t, Math.max(r + 0.4, Math.min(31.4 - r, x)), y, r, r * 0.95, F.main); });
      L.post(g => { for (const [x0, y] of pts) { const x = Math.max(r + 0.4, Math.min(31.4 - r, x0)); g.dots([[x - 0.6, y + 0.2], [x + 0.7, y + 0.2]], EYE_INK); g.dot(x - 0.6 - 0.5, y - 0.3, '#ffffff'); } });
      L.front(t => { t.ell(X.bx + 0.6, X.top + 0.4, 2 * s, 1 * s, flat(F.leaf || LEAF), -0.4); });
    } },
    // Potato Mine, Laser Bean, Citron: a big antenna with a glowing tip and two radar rings
    beam: { glow: () => '#ffb4c2', draw(L, X) {
      const s = X.s, x = X.bx - 0.5, y0 = X.top + 1.2, y1 = Math.max(2.2 + 1.8 * s, X.top - 3.6 * s);
      L.back(t => stroke(t, [[x, y0], [x + 0.3, y1]], 0.55, 0.45, '#b4bdd0'));
      L.front(t => softBody(t, x + 0.3, y1 - 0.6, 1.8 * s, 1.8 * s, ['#ffe0e6', '#ff8fa2', '#e86a84']));
      L.post(g => { g.dot(x - 0.3, y1 - 1.4, '#ffffff'); g.dot(x + 0.2, y1 - 1.4, '#ffffff'); haloAround(g, x - 5, y1 - 5, x + 5, y1 + 3, '#ff9fb2', [0.45, 0.25]);
        for (const [dx, dy] of [[-2.8, -0.6], [3.4, -0.6], [-2.4, -2.8], [3, -2.8]]) if (!g.get(x + dx, y1 + dy)) g.dot(x + dx, y1 + dy, '#ff9fb2'); });
    } },
    // the mushrooms: a big squashy mushroom cap hat with white spots and a cream rim
    cap: { glow: F => F.main[0], draw(L, X, F) {
      const s = X.s, by = X.brim + 0.6, cx = X.bx, w = X.bw + 3 * s, h = Math.min(by - 0.8, by - X.top + 3 * s);
      L.front(t => t.ell(cx + 0.3, by + 0.2, w - 0.8, 1.2 * s, flat(['#fff8ea', '#f6e8d0', '#dcc6a6'])));
      L.front(t => softBody(t, cx, by, w, h, F.main, { mask: (x, y) => y <= by - 0.3 }));
      L.post(g => { for (const [dx, dy, r] of [[-0.5, -0.45, 1.5], [0.12, -0.72, 1.2], [0.55, -0.3, 1.1], [-0.08, -0.25, 0.8]]) g.ell(cx + dx * w, by + dy * h, r * s, r * s * 0.78, '#ffffff', 0, (x, y) => g.filled(x, y) && y < by - 0.4); });
    } },
    // Cabbage-pult & co: a catapult arm over the back of the head with a basket holding the partner's ammo
    basket: { glow: F => F.main[0], draw(L, X, F) { catapultArm(L, X, F.main, X.s, !!(PLANT_PAL.melonpult && F.main && F.main[1] === PLANT_PAL.melonpult.main[1])); } }, // (fused with Melon-pult: a striped melon)
    // Kernel-pult, Bonk Choy, Iceberg...: a big leafy crown fanning up from the top of the head
    leafcrown: { glow: F => (F.leaf || F.main)[0], draw(L, X, F) {
      const s = X.s, R = F.leaf || F.main, x = X.bx, y = X.top + 2.2 * s;
      const leaves = [[-1.05, 4.6], [-0.55, 5.6], [0, 6.2], [0.55, 5.6], [1.05, 4.6]];
      for (const odd of [0, 1]) L.back(t => leaves.forEach(([da, len], i) => { if (i % 2 !== odd) return; const a = -Math.PI / 2 + da, l = Math.min(len * s, y - 0.6 + 1); t.ell(x + Math.cos(a) * l * 0.55, y + Math.sin(a) * l * 0.55, l * 0.55, l * 0.24, flat(odd ? R : lift(R, 0.18)), a); }));
    } },
    // Squash: big bushy determined brows + the squash's curly stem on top
    brows: { glow: F => F.main[0], draw(L, X, F) {
      const s = X.s, col = mixHex(F.main[2], INK, 0.35), eyes = X.eyes || [{ x: X.hx - X.hr * 0.3 + 1.4, y: X.ey, w: X.hr * 0.36, h: X.hr * 0.5 }, { x: X.hx + X.hr * 0.3 + 1.4, y: X.ey, w: X.hr * 0.36, h: X.hr * 0.5 }];
      L.post(g => { eyes.forEach((e, i) => { const left = eyes.length > 1 && i === 0, by = Math.min(e.y - e.h / 2, X.eyeTop + 0.6) - 1.15 - 0.8 * s, dir = left ? 1 : -1;
        g.ell(e.x, by, e.w * 0.62 + 0.4, 0.75 * s, col, dir * 0.32); }); });
      L.front(t => stroke(t, [[X.bx - 0.4, X.top + 1], [X.bx + 0.4, X.top - 1.4 * s], [X.bx + 1.8 * s, X.top - 2 * s], [X.bx + 2.6 * s, X.top - 1.1 * s]], 0.75 * s, 0.55 * s, F.main[1]));
    } },
    // Jalapeño, Torchwood...: a big soft flame crown blazing on top of the head (it flickers)
    flame: { glow: () => '#ffc27a', draw(L, X, F, P) { flameCrown(L, X.bx, X.top + 0.8 * X.s, Math.max(3.4, X.bw * 0.72), Math.min(X.top + 0.2, 7.6 * X.s), P, false); } },
    // Cactus, Spikeweed, Endurian, Cattail: a crest of chunky spikes round the top of the head, with pale tips
    spikes: { glow: F => F.main[0], draw(L, X, F) {
      const s = X.s, n = 7, R = flat(F.main), hw = X.mw * 0.98, hh = X.hh * 0.98;
      L.back(t => { for (let i = 0; i < n; i++) { const a = -Math.PI + 0.42 + i * (Math.PI - 0.84) / (n - 1), w = 0.27; const p = (aa, k) => [X.hx + Math.cos(aa) * hw * k, X.hy + Math.sin(aa) * hh * k];
        t.poly([p(a - w, 0.86), p(a, 1) .map((v, j) => v + (j ? Math.sin(a) : Math.cos(a)) * 3.4 * s), p(a + w, 0.86)], R[1]); } });
    } },
    // Lily Pad: the plant floats on a big lily pad with a pink lotus at its side
    lily: { glow: () => '#c8f2a8', behindAll: true, draw(L, X, F) {
      const R = F.leaf && F.main[1] === F.leaf[1] ? F.main : F.main;
      L.back(t => softBody(t, 16, 29.3, 14.2, 2.5, R, { mask: (x, y) => !(x > 17 && x < 22 && y < 29.3 - (x - 17) * 0.1) }));
      if (!X.hits(2.4, 25.2, 6.8, 29.6)) L.front(t => { for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.5; t.ell(4.6 + Math.cos(a) * 1.5, 27.6 + Math.sin(a) * 1.5, 1.1, 1.9, flat(['#ffe2ee', '#ffc2da', '#f49ac0']), a + Math.PI / 2); } t.ell(4.6, 27.8, 0.9, 0.7, '#fff27a'); });
    } },
    // Starfruit: a big smiling star hair clip on top of the head
    star: { glow: () => '#fff2a0', draw(L, X, F) {
      const s = X.s, x = X.bx + X.bw * 0.45, y = X.brim - 1.6 * s;
      L.front(t => star5(t, x, y, 3.6 * s, 1.75 * s, F.main[1], -Math.PI / 2 + 0.2));
      L.post(g => { g.dots([[x - 0.7, y + 0.1], [x + 0.8, y + 0.1]], EYE_INK); g.dot(x, y - 1.2, lift(F.main, 0.6)[0]); g.dot(x - 0.5, y - 1.2, lift(F.main, 0.6)[0]); });
    } },
    // Magnet-shroom: a horseshoe magnet standing upright on top of the head (silver tips up), tiny zap marks
    magnet: { glow: () => '#ffb0b8', draw(L, X) {
      const s = X.s, cx = X.bx + 0.3, base = X.top + 1.4 * s, hw = 2.7 * s, d = 3.4 * s, top = Math.max(1.2 + 1.2 * s, base - d - 1.6 * s), pts = [];
      for (let i = 0; i <= 12; i++) { const a = i * Math.PI / 12; pts.push([cx - Math.cos(a) * hw, Math.min(base, top + 1.2 * s + d * 0.4 + Math.sin(a) * d * 0.75)]); }
      const arm = [[cx - hw, top + 1.2 * s]].concat(pts, [[cx + hw, top + 1.2 * s]]);
      L.front(t => stroke(t, arm, 1.2 * s, 1.2 * s, '#ff8a96'));
      L.front(t => { for (const sx of [-1, 1]) t.ell(cx + sx * hw, top + 0.6 * s, 1.25 * s, 1 * s, flat(['#ffffff', '#eef2f8', '#bcc6d6'])); });
      L.post(g => { for (const sx of [-1, 1]) for (const [dx, dy] of [[0.4, -1.8], [1.6, -1.2]]) { const x = cx + sx * (hw + dx * s), y = top + dy * s; if (!g.get(x, y)) g.dot(x, y, '#ffd84a'); } g.dot(cx - hw - 0.3, top + 2.6 * s, '#ffc4cc'); });
    } },
    // Hypno-shroom: hypnotic swirly eyes + a pastel rainbow arch behind the head
    swirl: { glow: () => '#f6b0f0', draw(L, X, F, P) {
      const cols = ['#ffadc6', '#ffe08a', '#a8eab4', '#a8d0ff'], w = X.mw + 1.6, h = X.hh + 1.6;
      cols.forEach((c, i) => L.back(t => t.ell(X.hx, X.hy, w + (3 - i) * 1.05, h + (3 - i) * 1.05, c, 0, (x, y) => y < X.hy + 0.5 && ((x - X.hx) / (w + (3 - i) * 1.05 - 1.05)) ** 2 + ((y - X.hy) / (h + (3 - i) * 1.05 - 1.05)) ** 2 >= 1)));
      const open = !P.eyes || P.eyes === 'brave' || P.eyes === 'sad' || P.eyes === 'mad';
      if (open && X.eyes) L.post(g => X.eyes.forEach(e => swirlEye(g, e.x, e.y, Math.max(1.4, e.w * 0.62), Math.max(1.8, e.h * 0.55))));
      else if (!X.eyes) L.post(g => swirlEye(g, X.bx, X.top + X.hh * 0.45, 2.2, 2.2));
    } },
    // Lightning Reed, E.M.Peach: two zigzag lightning bolts sticking out of the head like antennae
    bolt: { glow: () => '#fff3a0', draw(L, X) {
      const s = X.s;
      for (const dir of [-1, 1]) L.front(t => { const x = X.bx + dir * X.bw * 0.55, y = X.brim - 0.5; boltShape(t, x, y + 0.6, 1.45 * s, dir * 0.42, '#fff08a'); });
      L.post(g => { for (const [dx, dy] of [[-X.bw - 1.5, -2], [X.bw + 1.6, -3]]) { const x = X.bx + dx, y = X.brim + dy; if (!g.get(x, y)) { g.dot(x, y, '#ffe24a'); g.dot(x + 0.5, y - 0.5, '#ffe24a'); g.dot(x - 0.5, y + 0.5, '#ffe24a'); } } });
    } },
    // Garlic, Plantern, Stunion: a plump bulb hat with segment lines and a sprout tip
    bulb: { glow: F => F.main[0], draw(L, X, F) {
      const s = X.s, cx = X.bx, by = X.brim + 0.6, w = X.bw * 0.9 + 0.8, h = Math.min(by - 1.5, by - X.top + 2.8 * s);
      L.front(t => stroke(t, [[cx + 0.2, by - h + 0.8], [cx + 0.6, by - h - 1.6 * s], [cx + 1.6, by - h - 2.4 * s]], 0.7 * s, 0.45 * s, '#9ed86a'));
      L.front(t => softBody(t, cx, by, w, h, F.main, { mask: (x, y) => y <= by - 0.2 }));
      L.post(g => { for (const k of [-0.42, 0, 0.42]) PX.stroke(g, [[cx + k * w * 0.9, by - 0.6], [cx + k * w * 0.55, by - h * 0.75]], 0.22, 0.22, mixHex(F.main[2], INK, 0.2)); });
    } },
    // Pumpkin: the plant sits snug inside a pumpkin shell
    pumpkin: { glow: F => F.main[0], draw(L, X, F) { pumpkinShell(L, X, F.main, false); } },
    // Electric Blueberry, Coffee Bean, Currant: a bunch of berries clipped to the head
    berry: { glow: F => F.main[0], draw(L, X, F) {
      const s = X.s, x = X.bx + X.bw * 0.3, y = X.brim - 1.6 * s, B = [[-1.9, 0.5], [1.9, 0.5], [0, -1.9]];
      L.front(t => t.ell(x - 0.6, y - 3.2 * s, 2 * s, 0.95 * s, flat(F.leaf || LEAF), -0.5));
      L.front(t => { for (const [dx, dy] of B) softBody(t, x + dx * s, y + dy * s, 2.1 * s, 2.1 * s, F.main); });
      L.post(g => { for (const [dx, dy] of B) { g.dot(x + dx * s - 0.7, y + dy * s - 0.8, '#ffffff'); g.dot(x + dx * s - 0.2, y + dy * s - 0.8, '#ffffff'); } });
    } },
    // Bloomerang: two boomerang petals behind the head like little wings
    boomerang: { glow: F => F.main[0], draw(L, X, F) {
      const s = X.s, R = flat(F.main);
      for (const dir of [-1, 1]) L.back(t => { const x = X.hx + dir * (X.mw + 0.5), y = X.hy - X.hh * 0.35;
        stroke(t, [[x - dir * 2, y + 2.4 * s], [x + dir * 1.6 * s, y - 0.4], [x - dir * 0.6, y - 3.2 * s]], 1.25 * s, 1.1 * s, R[1]); });
    } },
    // Dandelion: a big fluffy white seed-puff halo round the head - one soft cloud with a scalloped edge, a few faint seed
    // stalks (every other tuft: a stalk on each one read as pleats, a lace ruff) - and one seed floating off on its parachute
    puffball: { glow: () => '#f4f2ff', draw(L, X, F, P) {
      const s = X.s, n = 18, hw = X.mw + 1.3 * s, hh = X.hh + 1.2 * s, r = 1.15 * s, PUFF = ['#ffffff', '#fdfcf8', '#e4e0ec'], tufts = [];
      for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / n; tufts.push([a, Math.cos(a), Math.sin(a)]); }
      // (each side of the ring shrinks to fit inside the sprite, its outermost tufts and their outline included, rather than
      // being cut off, so the scalloped edge always shows)
      const pad = r * 1.35 + 1.5, wL = Math.min(hw, X.hx - pad), wR = Math.min(hw, 32 - pad - X.hx), hT = Math.min(hh, X.hy - pad);
      const ring = () => tufts.map(([, c, sn]) => [X.hx + c * (c < 0 ? wL : wR), Math.min(32 - pad, X.hy + sn * (sn < 0 ? hT : hh))]);
      L.back(t => {
        t.poly(ring(), PUFF[1]);
        for (const [x, y] of ring()) { const a = Math.atan2(y - X.hy, x - X.hx), c = Math.cos(a), sn = Math.sin(a); for (const [u, v] of [[0.35, 0], [-0.1, 0.85], [-0.1, -0.85]]) t.ell(clamp(x + c * u * r - sn * v * r, r + 1.1, 30.9 - r), clamp(y + sn * u * r + c * v * r, r + 1.1, 30.9 - r), r, r, PUFF[1]); }
        shadeShape(t, X.hx, X.hy, hw + r, hh + r, PUFF, { hl: false });
      });
      // the floating seed: a soft white parachute dome with fine spokes on a thin stalk, a little brown seed hanging below
      const f = P.frame ? 0.5 : 0, pr = 2.4 * s, py = clamp(X.top - 0.6 - f, pr * 0.8 + 0.8, 20), box = x => X.hits(x - pr, py - pr, x + pr, py + 4.8 * s);
      let px = Math.min(30.6 - pr, X.hx + hw + 0.4); if (box(px)) px = Math.max(pr + 0.8, X.hx - hw - 0.4);
      L.front(t => { stroke(t, [[px, py + 0.5], [px - 0.3, py + 3.4 * s]], 0.26, 0.26, '#cdbd9c'); t.ell(px - 0.3, py + 3.9 * s, 0.6 * s, 0.95 * s, flat(['#ecc89a', '#c89a6a', '#a07650']), 0.25); });
      L.front(t => t.ell(px, py + 0.5, pr, pr * 0.8, flat(PUFF), 0, fm((x, y) => y <= py + 0.5)));
      L.post(g => {
        const puff = (x, y) => { const c = g.get(x, y); return c === PUFF[1] || c === PUFF[2]; };
        ring().forEach(([ex, ey], i) => { if (i % 2) return; const at = k => [X.hx + (ex - X.hx) * k, X.hy + (ey - X.hy) * k]; for (let k = 0.74; k <= 1.0; k += 0.025) { const [x, y] = at(k); if (puff(x, y)) g.dot(x, y, '#e6e2f0'); } const [x, y] = at(0.76); if (puff(x, y)) g.dot(x, y, '#d8c8ae'); });
        for (const a of [-2.55, -2.0, -1.57, -1.14, -0.6]) PX.stroke(g, [[px, py + 0.3], [px + Math.cos(a) * pr * 0.8, py + 0.5 + Math.sin(a) * pr * 0.62]], 0.15, 0.15, '#d6d2e4');
      });
    } },
    // Holly Barrier: a sprig of three big glossy prickly holly leaves with three round red berries tucked on top of the head,
    // and a frosty glint
    holly: { glow: () => '#d8f4ff', draw(L, X) {
      // (the sprig shrinks to fit: the middle leaf points almost straight up, so on a tall head it shortens until its tip is
      // 2 px under the top edge, outline and all; each side leaf keeps its full length unless its tip or top prickles would
      // reach the side or top edge. It sits on the head right under it, not under X.top: see topAt. On a head with almost no
      // forehead, like Lily Pad's, it rides up just enough that the berries stay off the eyes)
      const s = X.s, x = X.bx - 0.3, y0 = Math.max(5.4 * s, X.top + 1.4 * s);
      let y = Math.max(5.4 * s, topAt(X, x) + 1.0 * s);
      while (y > y0 && X.hits(x - 2.6 * s, y, x + 2.6 * s, y + 1.9 * s + 0.2)) y -= 0.25;
      const len = Math.min(6.3 * s, (y - 0.4 - 2.0) / 0.82), G = ['#b8eaa8', '#4fae66', '#378a50'], B = ['#ffcaca', '#ff6a7a', '#d84a62'];
      const side = d => Math.min(6.3 * s, ((d < 0 ? x - 0.5 : 31.5 - x) - 1.8) / 0.89, (y - 2.0) / 0.63), lenL = side(-1), lenR = side(1);
      L.front(t => hollyLeaf(t, x, y - 0.4, len * 0.82, -1.72, G));
      L.front(t => hollyLeaf(t, x - 0.5, y, lenL, -2.66, G));
      L.front(t => hollyLeaf(t, x + 0.5, y, lenR, -0.48, G));
      const BR = [[-1.25, 0.6], [1.25, 0.6], [0, -0.6]];
      for (const [dx, dy] of BR) L.front(t => softBody(t, x + dx * s, y + dy * s, 1.35 * s, 1.3 * s, B));
      L.post(g => { for (const [dx, dy] of BR) { g.dot(x + dx * s - 0.55 * s, y + dy * s - 0.55 * s, '#ffffff'); g.dot(x + dx * s - 0.05 * s, y + dy * s - 0.55 * s, '#ffffff'); }
        floatBits(g, t => twinkle(t, clamp(x + lenR + 0.4, 2, 30.5 - 1.3 * s), Math.max(1.5 + 1.3 * s, y - lenR * 0.7), 1.3 * s, '#e8f8ff')); });
    } },
    // Witch Hazel: a tall grape-purple witch hat whose tip bends FORWARD (the Wizard Hat item's flops back), a wide flat brim,
    // and a pink band dotted with gold stars
    witchhat: { glow: () => '#e0c8ff', draw(L, X) {
      const s = X.s, cx = X.bx, by = X.brim + 0.5, w = X.bw + 3.1 * s, hH = Math.min(10.5 * s, by - 1.0), HAT = ['#d2b6f4', '#9068cc', '#7050b0'], BAND = ['#ffd2ea', '#ff9ccc', '#ec7cb0'];
      const cone = [[cx - w * 0.48, by + 0.2], [cx + w * 0.44, by + 0.2], [cx + w * 0.2, by - hH * 0.44], [cx + 0.9 * s, by - hH * 0.62], [cx + 4.0 * s, by - hH], [cx - 0.5 * s, by - hH * 0.74], [cx - w * 0.25, by - hH * 0.42]];
      const bandTop = by - Math.min(2.3 * s, hH * 0.26);
      L.front(t => { t.poly(cone, HAT[1]); shadeShape(t, cx, by - hH * 0.45, w * 0.5, hH * 0.6, HAT); for (let i = 0; i < t.a.length; i++) if (t.a[i] && t.a[i] !== INK && Math.floor(i / t.fw) / t.k >= bandTop) t.a[i] = (i % t.fw) / t.k > cx + w * 0.24 ? BAND[2] : BAND[1]; });
      L.front(t => t.ell(cx + 0.3, by + 0.5, w, 1.3 * s, flat(HAT)));
      L.post(g => { const sy = (bandTop + by) / 2 - 0.1; for (const k of [-0.28, 0.02, 0.3]) { const x = cx + k * w; if (g.filled(x, sy)) g.dots([[x, sy], [x - 0.5, sy], [x + 0.5, sy], [x, sy - 0.5], [x, sy + 0.5]], '#fff08a'); }
        star5(g, cx - w * 0.08, by - hH * 0.52, 0.95 * s, 0.42 * s, '#fff08a'); g.dot(cx + 1.6 * s, by - hH * 0.8, '#fff6c0'); });
    } },
    // Caulipower: a bumpy cream cauliflower-brain cap - round florets, each its own little bump (the lower ones over the upper
    // ones), two little leaves at its rim - and soft purple sparkles of brain power floating round it
    brainglow: { glow: () => '#d4b0ff', draw(L, X, F, P) {
      // (the cap stays 2 px under the top edge, outline and all, even mid-hop: on a squeezed cap the big lower florets reach
      // higher than the top row, so with no room the whole cap squashes down - every floret's height and rise shrink - into a
      // flatter dome of wide florets, rather than florets cut off flat along the top)
      const s = X.s, cx = X.bx, by = X.brim + 0.5, w = X.bw + 1.3 * s, h = Math.min(by - 2.0, by - X.top + 2.4 * s), CR = ['#fffcee', '#f6ebc6', '#dcc898'], r = Math.max(1.7, w * 0.34);
      const rows0 = [[[-0.12, h - r * 0.85], [0.42, h - r * 1.1]], [[-0.52, h * 0.58], [0.0, h * 0.64], [0.5, h * 0.55]], [[-0.7, r * 0.55], [-0.24, r * 0.68], [0.24, r * 0.68], [0.7, r * 0.55]]];
      const kv = Math.min(1, (by - 2.0) / Math.max(...rows0.flat().map(([, dy]) => dy + r * 0.88))), rows = rows0.map(row => row.map(([k, dy]) => [k, dy * kv]));
      // (the rim leaves tuck in rather than touch a side edge on a wide head)
      L.front(t => { for (const d of [-1, 1]) t.ell(clamp(cx + d * (w - 0.4), 1.6 + 2.2 * s, 30.4 - 2.2 * s), by - 0.1, 2.4 * s, 1.05 * s, flat(['#d4f4b4', '#9ed86a', '#74b84e']), d * 0.45); });
      L.front(t => t.ell(cx, by, w * 0.92, (h - r * 0.5) * kv, CR[1], 0, fm((x, y) => y <= by)));
      rows.forEach(row => row.forEach(([k, dy], i) => L.front(t => t.ell(cx + k * w, by - dy, r * (i % 2 ? 0.95 : 1), r * 0.88 * kv, flat(CR), 0, fm((x, y) => y <= by + 0.2)))));
      L.post(g => {
        for (const row of rows) for (const [k, dy] of row) { const x = cx + k * w - r * 0.35, y = by - dy - r * 0.35 * kv; if (g.get(x, y) === CR[1]) { g.dot(x, y, CR[0]); g.dot(x + 0.5, y, CR[0]); } }
        const f = P.frame ? 1 : 0; floatBits(g, t => { for (const [x, y, rr] of [[cx + w + 1.4, by - h * 0.9 - f * 0.5, 1.4], [cx - w - 1.2, by - h * 0.55 + f * 0.5, 1.15], [cx + w * 0.2, by - h - 1.6, 1.05]]) twinkle(t, clamp(x, 1.5 + rr * s, 30.5 - rr * s), clamp(y, 1.5 + rr * s, 30), rr * s, f ? '#e2c8ff' : '#c8a0ff'); });
        haloAround(g, cx - w - 2, by - h - 2.5, cx + w + 2, by - 0.6, '#c890ff', [0.42, 0.2]);
      });
    } },
    // Goo Peashooter: a blob of glossy slime sat on the head, dripping down over its top (purple goo on a green plant, lime goo
    // on anything else, so it always shows), with bubbles of the other colour
    goo: { glow: () => '#d8f0a0', draw(L, X, F, P, C) {
      const s = X.s, hu = hueOf(C.main[1]), green = hu > 55 && hu < 175, GOO = green ? ['#f2e0ff', '#c99cf2', '#a276d8'] : ['#eeffd0', '#b4ec78', '#88c658'], BUB = green ? '#c8f08c' : '#dcb4ff';
      // (the blob and its two top lobes stay 1.6 px under the top edge, outline and all: with no room the lobes rise less and
      // it's a lower, flatter goo cap, rather than a blob cut off flat along the top. It's never taller than 0.85 x its half
      // width either: on a narrow pointed head (Squash) a tall goo was a straight-sided purple pillar, a top hat, not slime)
      const cx = X.bx, by = X.brim + 0.1, w = X.bw + 1.1 * s, room = by - 1.6, h = Math.min(room, by - X.top + 2.2 * s, w * 0.85), bump = clamp(room - h, 0, h * 0.2);
      const drips = [[-0.8, 2.4], [-0.4, 3.4], [0.06, 2.0], [0.46, 3.0], [0.84, 2.0]].map(([k, l]) => { const x = cx + k * w; let len = l * s; while (len > 0.7 && X.hits(x - 1.1 * s, by, x + 1.1 * s, by + len + 1.3)) len -= 0.35; return [x, len]; }).filter(d => d[1] > 0.7);
      L.front(t => {
        t.ell(cx, by, w, h, GOO[1], 0, fm((x, y) => y <= by + 0.5));
        for (const [k, kk] of [[-0.38, 0.5], [0.3, 0.42]]) t.ell(cx + k * w, by - h - bump + h * 0.42, w * kk, h * 0.42, GOO[1]);
        for (const [x, len] of drips) { stroke(t, [[x, by - 0.2], [x, by + len - 0.9 * s]], 0.8 * s, 0.75 * s, GOO[1]); t.ell(x, by + len - 0.7 * s, 1.0 * s, 1.15 * s, GOO[1]); }
        shadeShape(t, cx, by - h * 0.35, w, h * 0.9, GOO);
      });
      L.post(g => {
        for (const [dx, dy, rr] of [[-0.42, 0.5, 0.95], [0.32, 0.3, 0.7], [0.05, 0.75, 0.55]]) { const x = cx + dx * w, y = by - dy * h; if (g.filled(x, y)) { g.ell(x, y, rr * s, rr * s, BUB, 0, fm((xx, yy) => g.filled(xx, yy))); g.dot(x - rr * s * 0.35, y - rr * s * 0.35, '#ffffff'); } }
        for (const [x, len] of drips) g.dot(x - 0.4 * s, by + len - 1.0 * s, '#ffffff');
        PX.stroke(g, [[cx - w * 0.62, by - h * 0.32], [cx - w * 0.5, by - h * 0.62]], 0.3, 0.3, GOO[0]);
      });
    } },
    // Solar Tomato: round sunglasses pushed up on the head (the big eyes stay free): sunny orange frames and dark tinted lenses
    // with a white glint, arms running back over the head
    shades: { glow: () => '#ffd08a', draw(L, X) {
      const s = X.s, gy = X.brim - 1.5 * s, gx = X.bx + 0.6, r = 2.35 * s, d = 2.75 * s, FR = ['#ffd4a4', '#ff9c56', '#e87c40'], LENS = ['#a49cdc', '#5e5690', '#4a4278'];
      L.front(t => stroke(t, [[Math.max(1, gx - d - r - 2.4 * s), gy + 1.6 * s], [gx - d - r + 0.4, gy], [gx + d + r - 0.4, gy], [Math.min(31, gx + d + r + 0.8 * s), gy + 0.8 * s]], 0.45 * s, 0.45 * s, FR[1]));
      L.front(t => { for (const dx of [-d, d]) t.ell(gx + dx, gy, r, r * 0.9, FR[1]); shadeShape(t, gx, gy, d + r, r, FR, { hl: false }); });
      L.post(g => { for (const dx of [-d, d]) { const x = gx + dx; g.ell(x, gy, r * 0.68, r * 0.6, LENS[1]); g.ell(x + r * 0.12, gy + r * 0.22, r * 0.5, r * 0.3, LENS[2], 0, fm((xx, yy) => g.get(xx, yy) === LENS[1])); PX.stroke(g, [[x - r * 0.42, gy + 0.1], [x - 0.05, gy - r * 0.38]], 0.32, 0.32, '#ffffff'); } });
    } },
    // Shine Vine: a thick glowing vine wound low round the forehead (the front over it, the back behind), its two ends rising
    // into big curly tendrils that curl up and out above the head on both sides, with leaves and three glowing butter-yellow
    // star flowers. (A thin vine with little cream daisies read as a daisy chain: the same look as the Flower Crown item.)
    vine: { glow: () => '#fff2a8', draw(L, X, F, P, C) {
      const s = X.s, cx = X.bx + 0.1, cy = X.brim + 0.1, rx = X.bw + 0.5 * s, ry = 1.3 * s, V = '#7cca58', th = 0.8 * s, m = 1.5 + th, LF = flat(['#d0f8b0', '#a2e27e', '#74c058']), FL = ['#fffbe0', '#ffe45a', '#f0c23c'];
      const at = a => [clamp(cx + Math.cos(a) * rx, m, 32 - m), cy + Math.sin(a) * ry], arc = (a0, a1) => { const p = []; for (let i = 0; i <= 16; i++) p.push(at(a0 + (a1 - a0) * i / 16)); return p; };
      L.back(t => stroke(t, arc(Math.PI, Math.PI * 2), th, th, V));
      L.front(t => stroke(t, arc(0, Math.PI), th, th, V));
      // each tendril rises from an end of the band (leaning in over the head when the edge is close), then curls up and out:
      // the curl reaches 1.69r out and 0.84r up from where it starts, so r shrinks to whatever room there is
      const curls = [-1, 1].map(d => {
        const [x0, y0] = at(d > 0 ? 0 : Math.PI), room = d > 0 ? 32 - m - x0 : x0 - m;
        let r = Math.max(1, Math.min(2.4 * s, (y0 - 1.2 - m) / 0.84));
        const lean = clamp(1.69 * r - room, 0, rx * 0.6); r = Math.max(1, Math.min(r, (room + lean) / 1.69));
        const xs = x0 - d * lean, yc = clamp(X.top + 0.6, m + 0.84 * r, y0 - 1.2);
        const pts = [[x0, y0], [x0 - d * (lean * 0.3 + 0.3 * s), (y0 + yc) / 2], [xs, yc]].concat(spiralPts(xs, yc, r, -Math.PI / 2, 1.15, d).slice(1));
        return { d, xs, yc, r, pts, L: X.hits(Math.min(x0, xs) - 1, yc - r, Math.max(x0, xs + d * 1.7 * r) + 1, y0 + 1) ? L.back : L.front };
      });
      for (const c of curls) c.L(t => stroke(t, c.pts, th, th * 0.6, V));
      L.front(t => { for (const a of [0.42, 2.0, 2.75]) { const [x, y] = at(a); t.ell(x + 0.6 * s, y - 0.5 * s, 1.3 * s, 0.6 * s, LF, a < 1.5 ? -0.5 : 0.5); } });
      const fl = [0.95, 1.6, 2.3].map(at).map(([x, y]) => [x, y - 0.2 * s]), ro = 2.1 * s;
      L.front(t => { for (const [x, y] of fl) { star5(t, x, y, ro, ro * 0.48, FL[1], -Math.PI / 2); t.ell(x, y + 0.15, 0.5 * s, 0.5 * s, '#ffffff'); } });
      L.post(g => {
        // the light-flowers glow: a fine pale rim hugging each flower's outline, only on skin at least as light as the head's
        // own colour (never over an eye), and a soft butter halo wherever a flower sticks out past the plant. (Mixing every
        // skin tone round them toward yellow turned the mid and shade pixels of a lilac cap or an olive helmet khaki and grey:
        // muddy smudged bands, not a glow.)
        const k = g.k, W = g.fw, lm = lum((C || F).main[1]) - 0.01, t = new Grid(g.w, g.h, k);
        for (const [x, y] of fl) star5(t, x, y, ro, ro * 0.48, FL[1], -Math.PI / 2);
        const grow = a => { const b = a.slice(); for (let i = 0; i < a.length; i++) { if (a[i]) continue; const x = i % W; for (const j of [i - W, i + W, i - 1, i + 1, i - W - 1, i - W + 1, i + W - 1, i + W + 1]) if (j >= 0 && j < a.length && Math.abs((j % W) - x) <= 1 && a[j]) { b[i] = 1; break; } } return b; };
        const in0 = t.a.map(c => (c ? 1 : 0)), in1 = grow(in0), in2 = grow(in1);
        for (let i = 0; i < in2.length; i++) {
          if (!in2[i] || in1[i]) continue;
          const c = g.a[i], px = (i % W + 0.5) / k, py = (Math.floor(i / W) + 0.5) / k;
          if (!c || c === INK || c[0] !== '#' || FL.includes(c) || c === '#ffffff' || lum(c) < lm || inEye(px, py)) continue;
          g.a[i] = mixHex(c, '#fffbe8', 0.3);
        }
        for (const [x, y] of fl) haloAround(g, x - ro - 1.8, y - ro - 1.8, x + ro + 1.8, y + ro + 1.8, '#fff2a0', [0.45, 0.22]);
        for (const [x, y] of fl) g.dot(x - 0.45 * s, y - 0.9 * s, FL[0]);
        const f = P.frame ? 1 : 0;
        floatBits(g, t => { for (const c of curls) twinkle(t, clamp(c.xs + c.d * 1.9 * c.r, 1.8, 30.2), clamp(c.yc - c.r - 0.6 + (c.d > 0 ? f : -f) * 0.5, 1.8, 30), (c.d > 0 ? 1.15 : 0.95) * s, '#fff4a0'); });
      });
    } },
    // Sling Pea: a big Y-shaped twig slingshot slung on the back (its fork sticking up past the top of the head), the bright
    // pink band stretched between the prong tips with a fat pea loaded in it, sat up on the band so the open V of the fork
    // shows. (Drawn big - a small one read as a twig sprouting from the head. Where a tall or wide head leaves no room above
    // it, the fork tucks in over the back of the head or swings round it until the prongs and pea fit, then gets shorter.)
    slingshot: { glow: () => '#d8f5a8', draw(L, X) {
      const s = X.s, W = ['#f6d6a2', '#dcaa70', '#b8844e'], tw = 0.85 * s, lim = 1.5 + tw, pr = 2.0 * s, sp = 0.68;
      const shape = (a, fx, fy, len) => { const tip = d => [fx + Math.cos(a + d) * len, fy + Math.sin(a + d) * len], lt = tip(-sp), rt = tip(sp), u = 0.3 * pr; return { lt, rt, pe: [(lt[0] + rt[0]) / 2 + Math.cos(a) * u, (lt[1] + rt[1]) / 2 + Math.sin(a) * u] }; };
      const fits = ({ lt, rt, pe }) => [lt, rt].every(([x, y]) => x >= lim && x <= 32 - lim && y >= lim) && pe[0] >= pr + 1.6 && pe[0] <= 30.4 - pr && pe[1] >= pr + 1.6;
      // (tried upright first, its fork tucked further in over the head's back edge, then swung round the back; a fork tucked
      // in over the head must stay clear of the eyes)
      let best = null;
      search: for (const a of [-2.0, -2.2, -2.4, -2.6]) for (const kr of [1, 0.85, 0.7]) {
        const fx = clamp(X.hx + Math.cos(a) * (X.mw * kr + 1.6 * s), 2.4, 29.6), fy = clamp(X.hy + Math.sin(a) * (X.hh * kr + 1.2 * s), 2.4, 26);
        let len = 7.2 * s; while (len > 3.6 * s && !fits(shape(a, fx, fy, len))) len -= 0.2;
        const { lt, rt } = shape(a, fx, fy, len);
        if (kr < 1 && X.hits(Math.min(fx, lt[0], rt[0]) - 1, Math.min(lt[1], rt[1]) - 1, Math.max(fx, lt[0], rt[0]) + 1, fy + 1.6 * s)) continue;
        if (!best || len > best.len + 0.3) best = { a, fx, fy, len };
        if (len >= 7.2 * s - 0.01) break search;
      }
      const { a, fx, fy, len } = best, { lt, rt, pe } = shape(a, fx, fy, len);
      // the handle goes behind the head; the fork rides in front of any back leaf (unless it would touch an eye)
      const FK = X.hits(Math.min(lt[0], rt[0], fx) - 1, Math.min(lt[1], rt[1], fy) - 1, Math.max(lt[0], rt[0], fx) + 1, Math.max(lt[1], rt[1], fy) + 1) ? L.back : L.front;
      L.back(t => { stroke(t, [[X.hx - X.mw * 0.3, X.hy], [fx, fy]], 1.3 * s, 1.3 * s, W[1]); shadeShape(t, fx, fy, len, len, W, { hl: false }); });
      FK(t => { stroke(t, [[fx - Math.cos(a) * 1.8 * s, fy - Math.sin(a) * 1.8 * s], [fx, fy]], 1.3 * s, 1.25 * s, W[1]); stroke(t, [[fx, fy], lt], 1.25 * s, tw, W[1]); stroke(t, [[fx, fy], rt], 1.25 * s, tw, W[1]); t.ell(fx, fy, 1.4 * s, 1.4 * s, W[1]); shadeShape(t, fx, fy, len, len, W, { hl: false }); });
      FK(t => { stroke(t, [lt, pe], 0.55, 0.55, '#ff7a9c'); stroke(t, [rt, pe], 0.55, 0.55, '#ff7a9c'); });
      FK(t => softBody(t, pe[0], pe[1], pr, pr, ['#e8fbc8', '#a6de7c', '#7cbf5c']));
      L.post(g => { for (const [x, y] of [lt, rt]) g.ell(x, y, 0.62 * s, 0.62 * s, W[0], 0, fm((xx, yy) => g.get(xx, yy) === W[1] || g.get(xx, yy) === W[2]));
        g.ell(pe[0] - pr * 0.36, pe[1] - pr * 0.4, 0.55 * s, 0.42 * s, '#ffffff', -0.5, fm((xx, yy) => g.filled(xx, yy))); });
    } },
    // Pomegranate-pult, Bombegranate: the pomegranate's ruby crown (a stubby calyx flaring into six pointed lobes) on top of the
    // head, and a few shiny ruby seeds bouncing round it
    pomcrown: { glow: () => '#ffb4c4', draw(L, X, F, P) {
      // (on the head right under the crown, not under X.top: on Lily Pad that's the lotus bud's tip, and the crown floated.
      // Where there's almost no forehead it rides up just enough to keep off the eyes)
      const s = X.s, cx = X.bx + 0.3, nw = 1.9 * s, R = ['#ffc6d0', '#f4718a', '#d4566e'], f = P.frame ? 0.5 : 0;
      let base = topAt(X, cx) + 1.4 * s;
      while (base > X.top + 1.4 * s && X.hits(cx - nw, base - 1, cx + nw, base + 0.8)) base -= 0.25;
      const ty = Math.max(3.4 * s + 0.6, base - 2.1 * s);
      L.front(t => {
        t.poly([[cx - nw, base + 0.6], [cx + nw, base + 0.6], [cx + nw * 0.82, ty + 0.4], [cx - nw * 0.82, ty + 0.4]], R[1]);
        for (let i = 0; i < 6; i++) { const a = -Math.PI + 0.3 + i * (Math.PI - 0.6) / 5, l = (i === 0 || i === 5 ? 2.6 : 3.3) * s, bx = cx + Math.cos(a) * nw * 0.55, byy = ty + 0.8 + Math.sin(a) * 0.5; t.poly([[bx - Math.sin(a) * 0.95 * s, byy + Math.cos(a) * 0.95 * s], [cx + Math.cos(a) * (nw * 0.5 + l), ty + 0.6 + Math.sin(a) * l * 0.82], [bx + Math.sin(a) * 0.95 * s, byy - Math.cos(a) * 0.95 * s]], R[1]); }
        shadeShape(t, cx, ty, nw + 3 * s, 3 * s, R);
      });
      L.post(g => g.ell(cx, ty + 0.75, nw * 0.62, 0.6 * s, '#c84c66'));
      const seeds = [[X.hx - X.mw - 0.6, X.top + X.hh * 0.45, -0.4], [X.hx + X.mw + 0.9, X.top + X.hh * 0.18, 0.5], [cx + 4.2 * s, base - 1.2 * s, 0.3]].map(([x, y, rot]) => [clamp(x, 1.4, 30.6), clamp(y - f, 1.8, 29), rot]).filter(([x, y]) => !X.hits(x - 1.3, y - 1.5, x + 1.3, y + 1.5));
      L.front(t => { for (const [x, y, rot] of seeds) t.ell(x, y, 1.05 * s, 1.35 * s, flat(['#ffd0dc', '#ff5e82', '#e0406a']), rot); });
      L.post(g => { for (const [x, y] of seeds) g.dot(x - 0.35 * s, y - 0.55 * s, '#ffffff'); });
    } },
    // Dartichoke: a helmet of layered pointed artichoke leaves (rows of sage-green points with lilac tips, the outer rows
    // overlapping the inner ones) closing to a bud tip on top
    artichoke: { glow: () => '#d8ecb8', draw(L, X) {
      const s = X.s, cx = X.bx, by = X.brim + 0.5, w = X.bw + 1.3 * s, h = Math.min(by - 1.6, by - X.top + 2.4 * s), AR = ['#e8f6cc', '#aed08a', '#86ae66'];
      const rows = [[0.0, 6, 0.46], [0.36, 5, 0.42], [0.68, 4, 0.36]], tips = [];
      L.front(t => softBody(t, cx, by, w * 0.92, h, AR, { mask: fm((x, y) => y <= by) }));
      L.front(t => { t.poly([[cx - 1.5 * s, by - h + 1.2], [cx + 1.5 * s, by - h + 1.2], [cx + 0.2, by - h - 1.4 * s]], AR[1]); shadeShape(t, cx, by - h, 1.6 * s, 1.6 * s, AR, { hl: false }); tips.push([cx + 0.2, by - h - 1.0 * s]); });
      for (let ri = rows.length - 1; ri >= 0; ri--) {
        const [k, n, kh] = rows[ri], y = by - k * h, half = w * Math.sqrt(Math.max(0.05, 1 - k * k)) + 0.3, sw = 2 * half / n, sh = h * kh;
        for (const odd of [0, 1]) L.front(t => { for (let i = odd; i < n; i += 2) { const x = cx - half + sw * (i + 0.5), tx = x + (x - cx) * 0.12; t.poly([[x - sw * 0.62, y + 0.5], [x - sw * 0.6, y - sh * 0.45], [tx, y - sh], [x + sw * 0.6, y - sh * 0.45], [x + sw * 0.62, y + 0.5]], AR[1]); tips.push([tx, y - sh + 0.55]); } shadeShape(t, cx, by - h * 0.5, w, h * 0.8, AR, { hl: false }); });
      }
      L.post(g => { for (const [x, y] of tips) if (g.filled(x, y)) { g.dot(x, y, '#c8a6e2'); g.dot(x, y + 0.5, '#d8bcea'); } g.ell(cx - w * 0.45, by - h * 0.55, 0.9 * s, 0.4 * s, AR[0], -0.6, fm((x, y) => g.filled(x, y))); });
    } },
    // Blooming Heart: a big heart-shaped bloom of pink petals behind the head - its notch sits on the top of the head and the
    // two round lobes rise up either side - and tiny hearts floating round it.
    // (it keeps its heart shape on any body: w and h shrink together until the whole bloom, petals and all, fits inside the
    // sprite; with no room above a tall head it slides down behind it, so just the two round lobes peep up - never squashed)
    heartbloom: { glow: () => '#ffc4dc', draw(L, X, F, P) {
      const s = X.s, pr = 2.1 * s, c0 = X.hx - 0.2, slide = 2.5;
      const w = Math.max(3, Math.min(Math.min(X.mw + 2.4 * s, 12.6 * s) + pr, 15.4, 31.4 - (c0 - slide), c0 + slide - 0.6) - pr), h = w / 1.2;
      const cx = clamp(c0, 0.6 + w + pr, 31.4 - w - pr), cy0 = Math.min(31.4 - pr - h, Math.max(X.top + 0.6 + 0.52 * h, 0.6 + pr + h));
      const PK = ['#ffe2ee', '#ffb0cc', '#f08cb0'], PK2 = ['#ffeef4', '#ffc8dc', '#f4a2c2'], edge = heartPts(cx, cy0, w, h, 24);
      for (const odd of [0, 1]) L.back(t => { edge.forEach(([x, y], i) => { if (i % 2 !== odd) return; t.ell(x, y, 2.0 * s, 1.45 * s, flat(odd ? PK : PK2), Math.atan2(y - cy0, x - cx)); }); });
      L.back(t => { t.poly(heartPts(cx, cy0 + 0.2, w * 0.84, h * 0.84, 40), PK2[1]); shadeShape(t, cx, cy0, w, h, PK2, { hl: false }); });
      const f = P.frame ? 0.5 : 0, small = [[X.hx + X.mw + 2.2 * s, X.hy - X.hh * 0.05 - f, 1.25], [X.hx - X.mw - 1.8 * s, X.hy + X.hh * 0.3 + f, 1.0]].map(([x, y, k]) => [clamp(x, 1.1 + 1.1 * k * s, 30.9 - 1.1 * k * s), clamp(y, 1.8, 29.5), k * s]);
      L.post(g => floatBits(g, t => { for (const [x, y, k] of small) t.poly(heartPts(x, y, k * 1.1, k, 20), '#ff8ab6'); }));
      L.post(g => { for (const [x, y, k] of small) if (g.get(x - k * 0.4, y - k * 0.45) === '#ff8ab6') g.dot(x - k * 0.4, y - k * 0.45, '#ffffff'); });
    } },
    // Sap-fling: a little upright pinecone perched on the head like a pointy cap - taller than wide, tip on top, its scales
    // overlapping in offset rows like shingles (a dark rim under each, a pale tan tip) - and a short glossy drop of golden sap
    // hanging from its side. (A squat dome with rows of dashes read as a walnut shell or a basket; a long sap stripe, a tassel.)
    sapcone: { glow: () => '#ffe2a0', draw(L, X) {
      const s = X.s, cx = X.bx - 0.2, by = X.brim + 0.3, h = Math.min(by - 1.6, 9.2 * s), w = h / 2.5, PC = ['#f8e2c0', '#dcae7c', '#b8875a'], RIM = mixHex(PC[2], INK, 0.5), SAP = ['#fff4b8', '#ffcc4a', '#efa632'];
      // its half width at height y: a rounded bottom swelling out to the widest a third of the way up, then a plump taper to the tip
      const half = y => { const v = (by - y) / h; return v < 0 || v > 1 ? -1 : v < 0.36 ? w * Math.sqrt(Math.max(0, 1 - ((0.36 - v) / 0.4) ** 2)) : w * (1 - ((v - 0.36) / 0.64) ** 1.6) ** 0.9; };
      const inCone = (x, y) => Math.abs(x - cx) <= half(y), sw = w * 1.0, sh = sw * 0.9, tips = [];
      const scale = (x, y) => [[x, y - sh * 0.55], [x + sw * 0.5, y - sh * 0.05], [x + sw * 0.28, y + sh * 0.35], [x, y + sh * 0.5], [x - sw * 0.28, y + sh * 0.35], [x - sw * 0.5, y - sh * 0.05]];
      L.front(t => {
        const K = t.k; for (let fy = 0; fy < t.fh; fy++) for (let fx = 0; fx < t.fw; fx++) if (inCone((fx + 0.5) / K, (fy + 0.5) / K)) t.fset(fx, fy, PC[1]);
        // the scales, bottom row first so each row overlaps the one below it; every other row shifted half a scale
        for (let i = 0, y = by - sh * 0.4; y > by - h + sh * 0.45; i++, y -= sh * 0.6) for (let j = -3; j <= 3; j++) {
          const x = cx + (j + (i % 2) * 0.5) * sw; if (Math.abs(x - cx) > half(y) + sw * 0.25) continue;
          t.poly(scale(x, y + 0.6), RIM); t.poly(scale(x, y), PC[1]); tips.push([x, y + sh * 0.26]);
        }
        for (let fy = 0; fy < t.fh; fy++) for (let fx = 0; fx < t.fw; fx++) if (t.a[fy * t.fw + fx] && !inCone((fx + 0.5) / K, (fy + 0.5) / K)) t.a[fy * t.fw + fx] = null;
        shadeShape(t, cx, by - h * 0.4, w, h * 0.58, PC, { only: PC[1], hl: false });
      });
      // the sap: a short golden teardrop hanging from the side of the cone at its widest, kept clear of the eyes
      const sx = cx - w * 0.92, sy = by - h * 0.32, r = 0.8 * s; let len = 2.4 * s; while (len > 1.5 && X.hits(sx - r, sy, sx + r, sy + len)) len -= 0.3;
      L.front(t => { t.poly([[sx - r * 0.45, sy], [sx + r * 0.45, sy], [sx + r, sy + len - r], [sx - r, sy + len - r]], SAP[1]); t.ell(sx, sy + len - r, r, r * 1.05, SAP[1]); shadeShape(t, sx, sy + len * 0.5, r, len * 0.6, SAP, { hl: false }); });
      L.post(g => { for (const [x, y] of tips) g.ell(x, y, sw * 0.24, sh * 0.16, PC[0], 0, fm((xx, yy) => g.get(xx, yy) === PC[1] || g.get(xx, yy) === PC[2]));
        g.dot(sx - r * 0.3, sy + len - r * 1.25, '#ffffff'); });
    } },
    // Thyme Warp: a cute gold pocket watch worn as a badge (white face, two hands, a little crown) and a minty time-warp
    // arrow looping round in a circle over the back of the head. Where a badge would hide behind the plant (Lily Pad's low
    // wide pad), a smaller watch hangs in front inside the loop instead, the arrow looping round it and its crown poking out
    // through the loop's gap - the gold watch with its white face always shows.
    clock: { glow: () => '#c8f0e8', draw(L, X, F, P) {
      // (where the badge goes is decided on the resting pose and then follows the head, so the watch can't hop between the
      // badge and the loop as the plant walks)
      const s = X.s, f = P.frame ? 0.35 : 0, MINT = ['#e0fff4', '#8ee6cc', '#62c8ac'], dx = X.hx - (X.hx0 == null ? X.hx : X.hx0), dy = X.hy - (X.hy0 == null ? X.hy : X.hy0);
      // (a hanging watch is never tiny, whatever the plant's size - at least 2.3 px round - and its loop grows to hold it)
      const B = badgeSpot(shiftGeom(X, -dx, -dy), 2.7 * s + 0.5), r2 = Math.max(2.3, 2.7 * s * 0.8), sr = B.behind ? r2 / 0.64 : 2.7 * s;
      // (the loop stays 1.6 px inside the edges, its widest stroke and outline and all)
      const scx = clamp(X.hx - X.mw * 0.66, sr + 0.7 * s + 1.6, 30 - sr), scy = clamp(X.top + 0.4, sr + 0.4 * s + 1.8, 26), loop = [];
      for (let i = 0; i <= 24; i++) { const a = -Math.PI * 0.35 + f - i * (Math.PI * 1.62) / 24; loop.push([scx + Math.cos(a) * sr, scy + Math.sin(a) * sr]); }
      const end = loop[loop.length - 1], pre = loop[loop.length - 3], da = Math.atan2(end[1] - pre[1], end[0] - pre[0]), SW = X.hits(scx - sr - 1.8, scy - sr - 1.8, scx + sr + 1.8, scy + sr + 1.8) ? L.back : L.front;
      SW(t => { stroke(t, loop, 0.42 * s, 0.68 * s, MINT[1]); t.poly([[end[0] + Math.cos(da) * 2.0 * s, end[1] + Math.sin(da) * 2.0 * s], [end[0] + Math.cos(da + 2.1) * 1.6 * s, end[1] + Math.sin(da + 2.1) * 1.6 * s], [end[0] + Math.cos(da - 2.1) * 1.6 * s, end[1] + Math.sin(da - 2.1) * 1.6 * s]], MINT[1]); shadeShape(t, scx, scy, sr + 1, sr + 1, MINT, { hl: false }); });
      // the watch: r its radius, ca the way its crown points (k scales the crown with the watch)
      let r = 2.7 * s, x = B.x + dx, y = Math.min(31.4 - r - 0.6, B.y + dy) + 0.4, ca = -Math.PI / 2, behind = B.behind, hung = false;
      if (behind) {
        const gap = -Math.PI * 0.27 + f; // (between the loop's start and its arrowhead)
        const spots = [[scx, scy, gap], [X.hx - X.mw - r2 - 0.6, X.neck - r2, -Math.PI / 2], [X.hx + X.mw + r2 + 0.6, X.neck - r2, -Math.PI / 2]].map(([px, py, a]) => [clamp(px, r2 + 1.6, 30.4 - r2), clamp(py, r2 + 1.4 * s + 1.8, 30 - r2), a]);
        const ok = spots.find(([px, py]) => !X.hits(px - r2 - 0.3, py - r2 - 0.3, px + r2 + 0.3, py + r2 + 0.3));
        if (ok) { [x, y, ca] = ok; r = r2; behind = false; hung = true; }
      }
      const BD = behind ? L.back : L.front, k = r / (2.7 * s), cx1 = Math.cos(ca), cy1 = Math.sin(ca);
      BD(t => { t.ell(x + cx1 * (r + 0.3 * s * k), y + cy1 * (r + 0.3 * s * k), 0.85 * s * k, 0.75 * s * k, GOLD[1], ca + Math.PI / 2); t.ell(x + cx1 * (r + 1.15 * s * k), y + cy1 * (r + 1.15 * s * k), 0.8 * s * k, 0.62 * s * k, GOLD[1], ca + Math.PI / 2); });
      BD(t => softBody(t, x, y, r, r, GOLD));
      BD(t => t.ell(x, y + 0.05, r * (hung ? 0.62 : 0.7), r * (hung ? 0.62 : 0.7), '#fffdf4')); // (the hanging watch keeps a thicker gold rim)
      L.post(g => {
        // (a twinkle with no room on its side of the loop moves to the other side, rather than being pushed under the loop)
        floatBits(g, t => { for (const [ox, oy, rr] of [[sr + 1.9, -sr * 0.3, 1.0], [-sr - 1.0, sr * 1.0, 0.85]]) { const m = rr * s + 1.5, px = scx + ox < m || scx + ox > 32 - m ? scx - ox : scx + ox; twinkle(t, clamp(px, m, 32 - m), clamp(scy + oy + f, m, 30), rr * s, '#c8fff0'); } });
        if (behind) return;
        for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) g.dot(x + dx * r * 0.52, y + 0.05 + dy * r * 0.52, '#c8b4a4');
        PX.stroke(g, [[x, y + 0.05], [x, y - r * 0.48]], 0.2, 0.2, INK); PX.stroke(g, [[x, y + 0.05], [x + r * 0.34, y + r * 0.2]], 0.22, 0.22, INK); g.dot(x, y, '#ff8fa8');
        g.ell(x - r * 0.45, y - r * 0.5, Math.max(0.5, 0.5 * s * k), Math.max(0.35, 0.32 * s * k), GOLD[0], -0.6, fm((xx, yy) => g.get(xx, yy) === GOLD[1]));
      });
    } },
    // Grass Knuckles: two big red boxing gloves (a thumb on the inside, a white cuff round the wrist) held up either side of the
    // head, ready to box: the back one high in a guard, the front one ready to jab (higher when cheering, a jab as it walks)
    gloves: { glow: () => '#ffc4b4', draw(L, X, F, P) {
      const s = X.s, r = 2.85 * s, up = P.arms === 'up' ? 2.4 * s : 0, jab = P.walk && P.frame ? 1.1 : 0, RD = ['#ffc8c2', '#ff7c7c', '#e05a62'], CUFF = ['#ffffff', '#fbf8f4', '#dcd4ce'];
      // (each glove stays 1.6 px inside the sprite, outline and all; its box is the ball, the thumb on its inner side and the wrist)
      const xlo = r + 1.6, xhi = 30.4 - r, ylo = r * 1.04 + 1.6, yhi = 30.6 - r * 1.45;
      const box = (x, y, dir) => { const ti = x - dir * r * 1.22; return [Math.min(x - r, ti), y - r * 1.04, Math.max(x + r, ti), y + r * 1.45]; };
      // how much of a glove behind the plant still shows (the share of its ball off the resting body)
      const seen = (x, y) => { let n = 0, v = 0; for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { if (i * i + j * j > 5) continue; n++; if (!bodyAt(X, x + i * r * 0.42, y + j * r * 0.42)) v++; } return v / n; };
      // (spots to try, nearest first: o px further out, u px higher - or a little lower, down to cheek height)
      const tries = [], cost = ([o, u]) => o + (u < 0 ? -1.6 * u : 1.3 * u); for (let o = 0; o <= 9; o += 0.5) for (let u = -3; u <= 9; u += 0.5) tries.push([o, u]);
      tries.sort((a, b) => cost(a) - cost(b));
      for (const dir of [-1, 1]) {
        const x0 = dir < 0 ? X.hx - X.mw - 0.4 * s : X.hx + X.mw * 0.86 + 0.8 * s + jab, y0 = X.hy + X.hh * (dir < 0 ? 0.12 : 0.4) - up;
        // the guard spot first; if that glove would cover an eye it slides out past the plant's side and up beside the face (or
        // down to the cheek, if that's nearer): the nearest spot clear of every eye goes in front (over a cheek or the side of
        // the body is fine), else the nearest one that mostly shows beside the plant goes behind it, else whichever shows most.
        // (Behind the plant at the guard spot, a glove could vanish - both did on Squash, one on Lily Pad.)
        let x, y, G = null, most = -1;
        for (const [o, u] of tries) {
          const cx = clamp(x0 + dir * o, xlo, xhi), cy = clamp(y0 - u, ylo, yhi);
          if (!X.hits(...box(cx, cy, dir))) { x = cx; y = cy; G = L.front; break; }
          const v = seen(cx, cy); if (v >= 0.7) { x = cx; y = cy; G = L.back; break; }
          if (v > most) { most = v; x = cx; y = cy; }
        }
        if (!G) G = L.back;
        const tx = x - dir * r * 0.78;
        // (a red mitten on a narrower red wrist with a white band: a flat white cuff under a red ball read as a toadstool)
        G(t => { t.poly([[x - r * 0.56, y + r * 0.5], [x + r * 0.56, y + r * 0.5], [x + r * 0.5, y + r * 1.45], [x - r * 0.5, y + r * 1.45]], RD[1]); shadeShape(t, x, y + r, r * 0.56, r * 0.5, RD, { hl: false }); });
        G(t => { softBody(t, x, y, r, r * 1.04, RD); t.ell(tx, y - r * 0.12, r * 0.44, r * 0.62, RD[1], dir * 0.35); });
        // the thumb seam goes only on the glove itself: on a glove behind the plant it was a stray red slash across the face
        L.post(g => {
          const onGlove = fm((xx, yy) => { const c = g.get(xx, yy); return c === RD[1] || c === RD[2]; }), a = [tx + dir * r * 0.3, y - r * 0.5], b = [tx + dir * r * 0.42, y + r * 0.3];
          for (let i = 0; i <= 8; i++) g.ell(a[0] + (b[0] - a[0]) * i / 8, a[1] + (b[1] - a[1]) * i / 8, 0.22, 0.22, RD[2], 0, onGlove);
          if (G === L.front) g.poly([[x - r * 0.52, y + r * 1.0], [x + r * 0.52, y + r * 1.0], [x + r * 0.5, y + r * 1.24], [x - r * 0.5, y + r * 1.24]], CUFF[1]);
        });
      }
    } },
    // Beta-Carrotina, Frost Fury, Starstrike: a short superhero cape flying back from the neck in the partner's costume colour,
    // and a coloured domino mask round the leader head's eyes (eye holes rimmed in the plant's own colour, so the big eyes
    // always show) with two tails. The mask's top edge arches UP over each eye and its tips flare out sideways at eye height:
    // a top edge sloping down to the nose is the V scowl that reads as mad, and a near-black mask read as sunglasses.
    herocape: { glow: F => (F.acc || F.main)[0], draw(L, X, F, P, C) {
      const s = X.s, R = F !== C ? (F.acc || F.main) : ['#ffb8c4', '#ff7c92', '#e45c78'], fl = P.walk ? (P.frame ? 1.4 : 0.7) : P.frame ? 0.3 : 0;
      // the partner's own colour - gold Starstrike, icy Frost Fury, orange Beta-Carrotina - lines the cape (the flash where it
      // flips over and a trim along its hem) and colours the mask's tails: with cape and mask both in the costume colour, two
      // blues, Starstrike and Frost Fury fusions looked the same. A gold partner (Starstrike) also wears a gold star on the cape.
      const P2 = F !== C ? F.main : ['#fff6c4', '#ffe27c', '#f5c656'], hu = hueOf(P2[1]), starHero = F !== C && hu > 38 && hu < 62;
      // (the cape only flares as far out as the sprite allows - never cut off flat along the left edge - and with little room
      // it swings further down instead)
      const bx = X.hx - X.mw, capeAt = fl => {
        const cl = clamp(Math.min(5.8 * s + fl, bx - 1.2), 0, 99), k0 = 0.12 + 0.3 * clamp((2.5 - cl) / 2.5, 0, 1);
        const yAt = k => Math.min(29, X.hy + X.hh * (-0.08 + k * 0.92) - fl * 0.35 * (1 - k)), kk = k => k0 + (k - 0.12) * (1 - k0) / 0.88;
        const hem = [[bx - cl, yAt(k0)], [bx - cl * 0.42, yAt(kk(0.5))], [bx - cl * 0.82, yAt(kk(0.62))], [bx - cl * 0.3, yAt(1)], [X.hx - 2.2, 29.2]];
        return { cl, k0, yAt, hem, pts: [[X.hx + 1.2, X.hy + X.hh * 0.55], [X.hx - X.mw * 0.3, X.hy - X.hh * 0.2], [bx + 0.6, X.hy - X.hh * 0.3]].concat(hem, [[X.hx + 1, 29.2]]) };
      };
      const { cl, k0, yAt, hem, pts } = capeAt(fl);
      L.back(t => {
        t.poly(pts, R[1]); shadeShape(t, bx, X.hy, cl + 2, X.hh, R, { hl: false }); t.poly([[bx + 0.6, X.hy - X.hh * 0.3], [bx - cl, yAt(k0)], [bx - cl * 0.5, yAt(k0) + 1.2], [bx + 1.2, X.hy - X.hh * 0.08]], P2[1]);
        // the hem trim: a band just inside the cape's free edge (a shade darker where the cape is shaded)
        const tt = new Grid(t.w, t.h, t.k); stroke(tt, hem, 0.6 * s, 0.6 * s, P2[1]);
        for (let i = 0; i < t.a.length; i++) if (tt.a[i] && t.a[i] && t.a[i] !== INK) t.a[i] = t.a[i] === R[2] ? P2[2] : P2[1];
      });
      // Starstrike's star: on the roomiest spot of the resting cape that the plant doesn't cover (fitted on the resting shape
      // so it doesn't hop about as the cape flutters; left off when there's no room for a star that reads)
      if (starHero) {
        const t0 = new Grid(32, 32); t0.poly(capeAt(0).pts, R[1]);
        const free = (x, y, r) => { if (!t0.filled(x, y) || bodyAt(X, x, y)) return false; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (!t0.filled(px, py) || bodyAt(X, px, py)) return false; } return true; };
        let star = null;
        for (let y = 2; y <= 30; y += 0.5) for (let x = 1.5; x <= X.hx; x += 0.5) { if (!free(x, y, 0.6)) continue; let r = 0.6; while (r < 2.4 * s && free(x, y, r + 0.2)) r += 0.2; if (!star || r > star.r + 0.01 || (r > star.r - 0.01 && y > star.y)) star = { x, y, r }; }
        if (star && star.r >= 1.5) { const ro = clamp(star.r - 0.4, 1.2, 1.9 * s); L.back(t => star5(t, star.x, star.y + ro * 0.08, ro, ro * 0.45, GOLD[1], -Math.PI / 2 - 0.15)); L.post(g => { if (g.get(star.x - ro * 0.25, star.y - ro * 0.2) === GOLD[1]) g.dot(star.x - ro * 0.25, star.y - ro * 0.25, '#ffffff'); }); }
      }
      // only the leader head is masked (a second head's eyes, and anything past the leader's width, are left alone)
      const eyes = (X.eyes || []).filter(e => Math.abs(e.x - X.hx) <= X.mw && !X.others.some(b => e.x > b.x0 - 0.3 && e.x < b.x1 + 0.3 && e.y > b.y0 - 0.3 && e.y < b.y1 + 0.3));
      if (!eyes.length) return;
      const MASK = [mixHex(R[1], INK, 0.1), mixHex(R[2], INK, 0.22), mixHex(R[2], INK, 0.35)], ky = Math.min(...eyes.map(e => e.y)) - 0.5, eTop = Math.min(...eyes.map(e => e.y - e.h / 2));
      // the strap runs back to the head's edge but stops short of another head's face
      const bk = Math.max(bx - 0.4, ...X.others.filter(b => b.x1 < eyes[0].x && b.y1 > ky - 2.5 && b.y0 < ky + 2.5).map(b => b.x1 + 1.2)), tl = Math.min(3.4 * s, bk + 0.8 - 1.6);
      if (tl > 1) L.back(t => { const kx = bk + 0.8; stroke(t, [[kx, ky], [kx - tl * 0.48, ky - 1.0 - fl * 0.4], [kx - tl, ky - 2.0 - fl * 0.7]], 0.85 * s, 0.4 * s, P2[1]); stroke(t, [[kx, ky + 0.4], [kx - tl * 0.52, ky + 0.6 - fl * 0.2], [kx - tl, ky + 1.0 - fl * 0.5]], 0.8 * s, 0.38 * s, P2[2]); });
      L.post(g => {
        const t = new Grid(g.w, g.h, g.k), E = eyes.slice().sort((a, b) => a.x - b.x), A0 = E[0], A1 = E[E.length - 1], mry = Math.max(...E.map(e => e.h)) / 2 + 0.35, my = (A0.y + A1.y) / 2;
        const lx = A0.x, rx = A1.x, ml = A0.w / 2 + 1.3, mr = A1.w / 2 + 1.3, mid = E.length > 1 ? (lx + rx) / 2 : lx + ml + 0.6, top = eTop;
        // top edge: from the left tip (out sideways at eye height) up over the left eye in a gentle arch, a touch lower between
        // the eyes (never lower than the outer ends), over the right eye, out to the right tip
        const poly = [[lx - ml - 1.7, my - 0.1], [lx - ml + 0.1, top - 0.5], [lx - ml * 0.35, top - 1.1], [lx + ml * 0.35, top - 1.1]];
        if (E.length > 1) poly.push([mid, top - 0.85], [rx - mr * 0.35, top - 1.1]);
        poly.push([rx + mr * 0.35, top - 1.1], [rx + mr - 0.1, top - 0.5], [rx + mr + 1.7, my - 0.1], [rx + mr + 0.1, my + 0.6], [rx + mr * 0.55, my + mry * 0.9], [rx, my + mry + 0.1]);
        if (E.length > 1) poly.push([rx - mr * 0.6, my + mry * 0.8], [mid, my + mry * 0.12], [lx + ml * 0.6, my + mry * 0.8]);
        poly.push([lx, my + mry + 0.1], [lx - ml * 0.55, my + mry * 0.9], [lx - ml - 0.1, my + 0.6]);
        t.poly(poly, MASK[1]); if (bk < lx - ml) t.poly([[lx - ml + 0.5, ky - 0.8], [bk, ky - 0.5], [bk, ky + 0.9], [lx - ml + 0.5, ky + 1.0]], MASK[1]);
        // only on the plant's own pixels, never more than 1.2 px above the eyes (off a mushroom cap or a second head)
        for (let i = 0; i < t.a.length; i++) { if (t.a[i] === null) continue; const c = g.a[i]; if (!c || c === INK || c[0] !== '#' || Math.floor(i / t.fw) / t.k < top - 1.2) t.a[i] = null; }
        shadeShape(t, mid, my - 0.6, rx - lx + ml + mr, mry * 1.6, MASK, { hl: false });
        for (const e of E) { t.ell(e.x - e.w * 0.3, top - 0.6, e.w * 0.26, 0.3, MASK[0]); t.ell(e.x, e.y, e.w / 2 + 0.7, e.h / 2 + 0.55, null); }
        t.outline(); g.merge(t);
      });
    } },
  };
  // a pastel spiral painted over an eye (Hypno fusion)
  function swirlEye(g, cx, cy, rx, ry) {
    g.ell(cx, cy, rx + 0.4, ry + 0.4, INK); g.ell(cx, cy, rx, ry, '#ffffff');
    const pts = []; for (let a = 0; a < Math.PI * 4.2; a += 0.3) { const r = 0.12 + a / (Math.PI * 4.2); pts.push([cx + Math.cos(a) * rx * r * 0.9, cy + Math.sin(a) * ry * r * 0.9]); }
    for (let i = 1; i < pts.length; i++) PX.stroke(g, [pts[i - 1], pts[i]], 0.24, 0.24, '#d860c8');
  }
  function boltShape(t, x, y, k, rot, col) {
    const P0 = [[-0.6, 0], [0.9, 0], [0.2, -2.2], [1.6, -2.2], [-0.2, -5.6], [0.2, -3.2], [-1.2, -3.2]];
    t.poly(P0.map(([a, b]) => { const c = Math.cos(rot), s = Math.sin(rot); return [x + (a * c - b * s) * k, y + (a * s + b * c) * k]; }), col);
  }
  // a soft three-tongue flame (pink edge, peach middle, butter core); back: the head covers its base
  // a soft flame: one big teardrop tongue with a small one either side, nested pink -> peach -> butter (it flickers).
  // (x, y) = the centre of the flame's round bottom; w = half width; h = height from there to the tip
  function flameCrown(L, x, y, w, h, P, back) {
    const f = P && P.frame ? 1 : 0, put = back ? L.back : L.front, lean = f ? 0.7 : -0.35;
    const tear = (t, cx, cy, rw, rh, tipx, col) => { t.ell(cx, cy, rw, rw * 0.92, col); t.poly([[cx - rw * 0.95, cy - rw * 0.1], [tipx, cy - rh], [cx + rw * 0.95, cy - rw * 0.1]], col); };
    put(t => { tear(t, x - w * 0.6, y + w * 0.08, w * 0.4, h * 0.62, x - w * 0.95 + lean * 0.4, '#ff9c88'); tear(t, x + w * 0.6, y + w * 0.08, w * 0.4, h * 0.56, x + w * 0.92 + lean * 0.4, '#ff9c88'); tear(t, x, y, w * 0.66, h, x + lean, '#ff9c88'); });
    put(t => tear(t, x, y + w * 0.1, w * 0.44, h * 0.64, x + lean * 0.6, '#ffc47c'));
    put(t => tear(t, x, y + w * 0.22, w * 0.25, h * 0.36, x + lean * 0.3, '#fff2a8'));
  }
  // a catapult arm + basket over the back of the head holding a ball of colour R (Cabbage-pult part, Catapult Arm item)
  function catapultArm(L, X, R, s, melon) {
    const r = 2.35 * s, wood = ['#f2cc94', '#dcaa70', '#b8844e'];
    const ex = X.hx - X.mw * 0.2, ey = clamp(X.top - 2.4 * s, 2 * r + 2.2, 24), cx = clamp(X.hx - X.mw * 0.95, r + 1.6, ex - 3 * s), cy = ey + 0.6;
    L.back(t => stroke(t, [[X.hx - X.mw * 0.05, X.hy], [ex, ey]], 0.85 * s, 0.75 * s, wood[1]));
    L.back(t => stroke(t, [[ex, ey], [cx + 1.2 * s, cy]], 0.75 * s, 0.75 * s, wood[1]));
    L.back(t => t.ell(ex, ey, 1.05 * s, 1.05 * s, flat(wood)));
    const CU = X.hits(cx - 3 * s, cy - r * 1.6, cx + 3 * s, cy + 2 * s) ? L.back : L.front;
    CU(t => softBody(t, cx, cy - r * 0.6, r, r * 0.92, R));
    CU(t => softBody(t, cx, cy + 0.3, 2.9 * s, 1.7 * s, ['#f6d8a8', '#e2b47c', '#c08c58'], { mask: (x, y) => y >= cy - 0.3, hl: false }));
    L.post(g => {
      const ok = (x, y) => g.filled(x, y) && y < cy - 0.2;
      if (melon) for (const dx of [-0.55, 0, 0.55]) for (let a = -1.25; a <= 1.25; a += 0.12) { const x = cx + Math.sin(dx * 1.3) * r * Math.cos(a) * 0.95, y = cy - r * 0.6 + Math.sin(a) * r * 0.9; if (ok(x, y)) g.dot(x + dx * 0.3, y, R[2]); }
      else for (const a of [-0.6, 0.6]) PX.stroke(g, [[cx, cy - r * 0.2], [cx + Math.sin(a) * r * 0.8, cy - r * 1.4]], 0.2, 0.2, mixHex(R[2], INK, 0.2));
      g.dot(cx - r * 0.45, cy - r * 1.15, '#ffffff'); g.dot(cx - r * 0.45 + 0.5, cy - r * 1.15, '#ffffff');
    });
  }
  // the pumpkin shell round the bottom of the plant: the back half behind it, the front half (three soft lobes) over it.
  // lit = a glowing carved jack-o'-lantern face (Halloween item); otherwise a curly vine and a leaf (Pumpkin fusion)
  function pumpkinShell(L, X, R, lit) {
    const s = X.s, bot = 31.7, rim = clamp(Math.max(X.lowEye + 1.4, X.neck - 7 * s), 16, 27.4), cx = clamp(X.hx + 0.6, 14.5, 17.5), w = Math.min(15.4, X.mw + 1.8 * s, cx - 0.4, 31.6 - cx), h = (bot - rim) / 2 + 1.1, cy = bot - h;
    const low = X.lowEye + 1.4 > 27.4, front = (x, y) => !low && y >= rim + (1 - ((x - cx) / w) ** 2) * 1.5;
    L.back(t => softBody(t, cx, cy, w, h, R, { hl: false }));
    L.front(t => { for (const k of [-1, 1]) softBody(t, cx + k * w * 0.52, cy + 0.2, w * 0.48, h * 0.94, R, { mask: front, hl: false }); });
    L.front(t => softBody(t, cx, cy + 0.3, w * 0.44, h, R, { mask: front }));
    if (lit && !low && bot - rim >= 5) L.post(g => {
      const y = rim + (bot - rim) * 0.36, G1 = '#ffd86a', G2 = '#fff6c0', ew = Math.max(1.1, w * 0.13);
      for (const dx of [-0.32, 0.32]) { g.poly([[cx + dx * w - ew - 0.35, y + 1.05], [cx + dx * w + ew + 0.35, y + 1.05], [cx + dx * w, y - 1.1]], INK); g.poly([[cx + dx * w - ew, y + 0.7], [cx + dx * w + ew, y + 0.7], [cx + dx * w, y - 0.6]], G1); g.dot(cx + dx * w, y + 0.2, G2); }
      const my = y + 2, mw = w * 0.42, pts = []; for (let i = 0; i <= 6; i++) pts.push([cx - mw + i * mw / 3, my + (i % 2 ? 0.8 : 0) + Math.sin(i / 6 * Math.PI) * 0.6]);
      g.poly([[cx - mw - 0.4, my - 0.4]].concat(pts.map(([x, yy]) => [x, yy - 0.4]), [[cx + mw + 0.4, my - 0.4], [cx, my + 2.2]]), INK);
      g.poly([[cx - mw, my - 0.1]].concat(pts.map(([x, yy]) => [x, yy - 0.1]), [[cx + mw, my - 0.1], [cx, my + 1.7]]), G1);
    });
    else if (!lit && !low) {
      L.front(t => t.ell(cx + w * 0.62, rim - 0.2, 2 * s, 1 * s, flat(['#c8f0a0', '#9ed86a', '#7cb850']), -0.5));
      L.post(g => PX.stroke(g, [[cx + w * 0.3, rim + 0.6], [cx + w * 0.42, rim - 0.6], [cx + w * 0.56, rim - 0.2], [cx + w * 0.5, rim + 0.4]], 0.24, 0.24, '#7cb850'));
    }
  }

  // ---------------- fusion items (data.js FUSION_ITEMS): full costumes ----------------
  const ITEM = {
    // Extra Shooter: a mini twin shooter head riding on top, with its own snout and face
    extrashooter: { glow: () => '#d8f5a8', draw(L, X, F, P, C) {
      const s = X.s, M = C.main, r = 4.9 * s, cx = X.bx + X.bw * 0.1 - 0.6, cy = Math.max(r * 0.9 + 0.7, X.top + 0.4);
      L.front(t => t.ell(cx - r * 0.75, cy - r * 0.8, 2.3 * s, 1.1 * s, flat(C.leaf || LEAF), -0.85));
      L.front(t => { t.ell(cx + r + 0.6 * s, cy + 0.5, 2.3 * s, 1.7 * s, M[1]); });
      L.front(t => softBody(t, cx, cy, r * 1.05, r * 0.92, M));
      L.front(t => { t.ell(cx + r + 2.5 * s, cy + 0.5, 1.2 * s, 2 * s, M[0]); });
      L.post(g => { g.ell(cx + r + 2.7 * s, cy + 0.5, 0.65 * s, 1.25 * s, mixHex(M[2], EYE_INK, 0.5)); chibiEyes(g, cx + 0.9, cy + 0.7, { sp: r * 0.8, w: r * 0.42, h: r * 0.56, mood: P.eyes }); blush(g, cx + 0.7, cy + r * 0.55, { sp: r * 1.15, w: 0.8, h: 0.5 }); });
    } },
    // Army Helmet: a chunky camo helmet with a chin strap + an ammo belt across the body
    army: { glow: () => '#d8e4a0', draw(L, X) {
      const w = X.bw + 1.4 * X.s, by = X.brim + 0.4;
      L.front(t => armyHelmet(t, X.bx, by, w));
      L.post(g => armyHelmetDetails(g, X.bx, by, w));
    } },
    // Knight Armor: a steel helmet with a big plume, a shield at the front and a sword on the back
    knight: { glow: () => '#dfe7f6', draw(L, X) {
      const s = X.s, w = X.bw + 1 * s, by = X.brim + 0.4;
      L.back(t => { const hx = X.hx - X.mw * 0.55, hy = X.neck - 0.8; stroke(t, [[hx, hy], [Math.max(1.6, X.hx - X.mw - 1.2), Math.max(1.6, X.top - 1.2)]], 0.95 * s, 0.6 * s, '#f0f4fa'); });
      L.back(t => { const hx = X.hx - X.mw * 0.55, hy = X.neck - 0.8; stroke(t, [[hx - 1.8 * s, hy - 0.6], [hx + 1.8 * s, hy + 0.6]], 0.55 * s, 0.55 * s, '#ffd36a'); });
      L.front(t => knightHelmet(t, X.bx, by, w));
      const sx = Math.min(31 - 3.2 * s, X.hx + X.mw * 0.62), sbox = y => X.hits(sx - 3.1 * s, y - 3.1 * s, sx + 3.1 * s, y + 3.9 * s);
      let sy = X.neck - 1.6 * s; if (sbox(sy)) sy = 31.6 - 3.9 * s; const shieldBehind = sbox(sy), SH = shieldBehind ? L.back : L.front;
      SH(t => { t.poly([[sx - 3 * s, sy - 3 * s], [sx + 3 * s, sy - 3 * s], [sx + 3 * s, sy + 0.6 * s], [sx, sy + 3.8 * s], [sx - 3 * s, sy + 0.6 * s]], '#ffd36a'); });
      SH(t => { t.poly([[sx - 2.2 * s, sy - 2.3 * s], [sx + 2.2 * s, sy - 2.3 * s], [sx + 2.2 * s, sy + 0.4 * s], [sx, sy + 2.8 * s], [sx - 2.2 * s, sy + 0.4 * s]], '#8ec0ff'); });
      L.post(g => { knightHelmetDetails(g, X.bx, by, w); if (!shieldBehind) for (let i = -1.6; i <= 1.6; i += 0.5) g.dot(sx, sy + i * s, '#ffffff'); if (!shieldBehind) for (let i = -1.4; i <= 1.4; i += 0.5) g.dot(sx + i * s, sy - 0.8 * s, '#ffffff'); });
    } },
    // Pirate Hat: a big captain's hat with gold trim and a skull, an eyepatch, and a tiny parrot friend
    pirate: { glow: () => '#d8ccff', draw(L, X, F, P) {
      const s = X.s, cx = X.bx, by = X.brim + 0.5, w = X.bw + 2.6 * s, h = 4.2 * s, HAT = ['#8e80ae', '#64587e', '#4c4264'];
      L.front(t => softBody(t, cx, by + 0.4, w * 0.74, h + 0.8, HAT, { mask: (x, y) => y <= by }));
      L.front(t => t.poly([[cx - w, by + 0.6], [cx - w * 0.8, by - 2.4 * s], [cx - w * 0.3, by - 0.6], [cx + w * 0.3, by - 0.6], [cx + w * 0.8, by - 2.4 * s], [cx + w, by + 0.6], [cx, by + 1.6 * s]], HAT[1]));
      // the parrot: perched on the back corner of the hat (red body, green wing, blue tail, hooked yellow beak)
      const f = P.frame ? 0.4 : 0, px = Math.max(3.2 * s, cx - w * 0.72), py = Math.max(4.6 * s, by - 2.6 * s) - f, RED = ['#ffc8c8', '#ff8c8c', '#e86c72'];
      const parrot = !X.hits(px - 2.6 * s, py - 4 * s, px + 3.4 * s, py + 3.8 * s), PR = parrot ? L.front : () => {};
      PR(t => stroke(t, [[px - 0.6 * s, py + 1.4 * s], [px - 2.2 * s, py + 3.6 * s]], 0.9 * s, 0.5 * s, '#8cc8ff'));
      PR(t => softBody(t, px, py, 1.9 * s, 2.3 * s, RED));
      PR(t => softBody(t, px + 0.5 * s, py - 2.4 * s, 1.6 * s, 1.5 * s, RED));
      PR(t => t.ell(px - 0.5 * s, py + 0.3 * s, 1.1 * s, 1.7 * s, flat(['#c8f2c0', '#8ad89c', '#62b47a']), 0.35));
      PR(t => t.poly([[px + 1.7 * s, py - 3 * s], [px + 3.2 * s, py - 2.3 * s], [px + 2.4 * s, py - 1.2 * s], [px + 1.7 * s, py - 1.7 * s]], '#ffd36a'));
      if (parrot) L.post(g => { g.ell(px + 0.9 * s, py - 2.7 * s, 0.45, 0.55, EYE_INK); g.dot(px + 0.75 * s, py - 2.9 * s, '#ffffff'); });
      L.post(g => {
        for (let x = cx - w + 0.6; x <= cx + w - 0.6; x += 0.5) { const y = by + 0.6 - (Math.abs(x - cx) < w * 0.3 ? 1.1 : Math.abs(x - cx) > w * 0.8 ? -0.2 + (w - Math.abs(x - cx)) * -1 : 0); if (g.filled(x, by - 0.1)) g.dot(x, by - 0.1, '#ffd36a'); }
        const kx = cx + 0.3, ky = by - h * 0.45; g.ell(kx, ky, 1.1 * s, 0.95 * s, '#ffffff'); g.dots([[kx - 0.4, ky], [kx + 0.5, ky]], HAT[2]); PX.stroke(g, [[kx - 1.6 * s, ky + 1.5 * s], [kx + 1.6 * s, ky + 0.6]], 0.22, 0.22, '#ffffff'); PX.stroke(g, [[kx + 1.6 * s, ky + 1.5 * s], [kx - 1.6 * s, ky + 0.6]], 0.22, 0.22, '#ffffff');
        const e = X.eyes && X.eyes.length > 1 ? X.eyes[0] : null; // eyepatch on the back eye
        if (e && (!P.eyes || P.eyes === 'brave' || P.eyes === 'sad' || P.eyes === 'mad' || P.eyes === 'sleepy')) {
          const pw = e.w * 0.55 + 0.15, ph = e.h * 0.5 + 0.1;
          PX.stroke(g, [[e.x + pw * 0.35, e.y - ph * 0.85], [e.x + pw * 1.05, by + 0.5]], 0.26, 0.26, HAT[2]); PX.stroke(g, [[e.x - pw * 0.6, e.y - ph * 0.7], [e.x - pw * 1.5, by + 0.5]], 0.26, 0.26, HAT[2]);
          g.ell(e.x, e.y, pw + 0.35, ph + 0.35, INK); g.ell(e.x, e.y, pw, ph, HAT[1]); g.ell(e.x + pw * 0.2, e.y + ph * 0.25, pw * 0.75, ph * 0.7, HAT[2], 0, (x, y) => g.get(x, y) === HAT[1] && (x - e.x) / pw + (y - e.y) / ph > 0.35);
          g.dots([[e.x - pw * 0.45, e.y - ph * 0.45], [e.x - pw * 0.45 + 0.5, e.y - ph * 0.55]], HAT[0]);
        }
      });
    } },
    // Cowboy Hat: a pinched tan hat with a curly brim and a red band + a polka-dot bandana
    cowboy: { glow: () => '#ffe2b0', draw(L, X) {
      const s = X.s, cx = X.bx, by = X.brim + 0.5, w = X.bw + 3 * s, ch = 4.8 * s, TAN = ['#fbe2b4', '#e8be86', '#c8945e'];
      L.front(t => { softBody(t, cx - 0.1, by + 0.2, w * 0.52, ch + 0.2, TAN, { mask: (x, y) => y <= by && !(Math.abs(x - cx) < 0.8 * s && y < by - ch + 1.1 * s) }); });
      L.front(t => { // the brim: a wide smile shape whose ends curl up
        const up = [], dn = [];
        for (let i = 0; i <= 16; i++) { const u = -1 + i / 8, x = cx + u * w; up.push([x, by - 0.5 - 2 * s * Math.abs(u) ** 3]); dn.push([x, by + 1.2 * s - 1.5 * s * u * u]); }
        t.poly(up.concat(dn.reverse()), TAN[1]);
      });
      const bbox = y => X.hits(X.hx - X.mw * 0.55 - 1.3, y - 2.2, X.hx + X.mw * 0.7, y + 3.4 * s);
      let ny = X.neck - 0.8; if (bbox(ny)) ny = 26.6; if (bbox(ny)) ny = null;
      if (ny != null) L.front(t => { t.poly([[X.hx - X.mw * 0.55, ny - 1.3], [X.hx + X.mw * 0.7, ny - 1.3], [X.hx + 1, ny + 3.4 * s]], '#ff8a96'); t.ell(X.hx - X.mw * 0.5, ny - 0.8, 1.2 * s, 1 * s, '#ff8a96'); });
      L.post(g => { for (let x = cx - w * 0.52 + 0.4; x <= cx + w * 0.52 - 0.4; x += 0.5) for (const dy of [-1, -1.5]) if (g.filled(x, by + dy)) g.dot(x, by + dy, '#ff7a8a');
        star5(g, cx + w * 0.22, by - 1.25, 0.95 * s, 0.42 * s, '#ffe27a');
        if (ny != null) for (const [dx, dy] of [[-0.25, -0.6], [0.3, -0.6], [0.05, 0.6], [0.45, 0.2]]) g.dot(X.hx + dx * X.mw, ny + dy * 1.4 + 0.2, '#ffffff'); });
    } },
    // Wizard Hat: a tall floppy starry hat whose tip droops back + a glowing star wand held at the back
    wizard: { glow: () => '#e2d0ff', draw(L, X, F, P) {
      const s = X.s, cx = X.bx, by = X.brim + 0.5, w = X.bw + 2.4 * s, tipY = Math.max(1.2, by - 10 * s), WZ = ['#d8c6ff', '#a98cf2', '#8268d2'];
      const wx0 = X.hx - X.mw * 0.55, wy0 = 29.4, wx1 = Math.max(3, X.hx - X.mw - 0.6), wy1 = Math.max(4, X.neck - 6.4 * s);
      const wandBehind = X.hits(Math.min(wx0, wx1) - 2.5 * s, wy1 - 3.1 * s, Math.max(wx0, wx1) + 2.5 * s, wy0), WA = wandBehind ? L.back : L.front;
      WA(t => stroke(t, [[wx0, wy0], [wx1, wy1]], 0.55, 0.5, '#c8945e'));
      WA(t => star5(t, wx1, wy1 - 0.6, 2.4 * s, 1.1 * s, '#fff08a', -Math.PI / 2 - 0.2));
      L.front(t => t.poly([[cx - w * 0.62, by + 0.2], [cx + w * 0.6, by + 0.2], [cx + w * 0.18, by - 4 * s], [cx - 0.6, tipY + 2 * s], [cx - 3.4 * s, tipY + 0.4], [cx - 5 * s, tipY + 2.4 * s], [cx - 2.6 * s, tipY + 3.6 * s], [cx - w * 0.3, by - 4 * s]], WZ[1]));
      L.front(t => t.ell(cx + 0.3, by + 0.5, w, 1.35 * s, flat(WZ)));
      L.post(g => {
        star5(g, cx + w * 0.12, by - 2.6 * s, 1.25 * s, 0.55 * s, '#fff08a'); g.dot(cx - 2.4 * s, tipY + 2.4 * s, '#fff6c0'); g.dot(cx - w * 0.3, by - 1.4 * s, '#fff6c0');
        g.ell(cx - w * 0.15, by - 4.4 * s, 0.9 * s, 0.9 * s, '#fff08a', 0, (x, y) => g.filled(x, y)); g.ell(cx - w * 0.15 + 0.5, by - 4.6 * s, 0.75 * s, 0.75 * s, WZ[1], 0, (x, y) => g.filled(x, y));
        for (let x = cx - w + 0.6; x <= cx + w - 0.2; x += 0.5) if (g.filled(x, by - 0.1)) g.dot(x, by - 0.1, '#fff08a');
        if (!wandBehind) haloAround(g, wx1 - 4.5, wy1 - 5, wx1 + 4.5, wy1 + 3.5, '#fff08a', [0.5, 0.28, 0.12]);
        const f = P.frame ? 1 : 0; for (const [dx, dy] of [[3.2, -2.4 - f], [-2.6, -3.6 + f], [2.6, 1.6]]) if (!g.get(wx1 + dx, wy1 + dy)) { g.dot(wx1 + dx, wy1 + dy, '#ffffff'); }
      });
    } },
    // Royal Crown: a big jewelled gold crown + a royal cape with a fluffy ermine collar
    crown: { glow: () => '#fff0a0', draw(L, X, F, P, C) {
      const s = X.s, cx = X.bx, by = X.brim + 0.2, w = Math.max(3.4, X.bw * 0.82), h = 3.6 * s, CAPE = ['#ffc2d4', '#f896b4', '#dc7096'];
      const cbox = y => X.hits(X.hx - X.mw * 0.62 - 1.4, y - 1.6, X.hx + X.mw * 0.74 + 2.2, y + 1.6);
      let ny = X.neck - 0.6; if (cbox(ny)) ny = 27.4; if (cbox(ny)) ny = null;
      L.back(t => t.poly([[X.hx - X.mw * 0.7, X.hy], [X.hx + X.mw * 0.7, X.hy], [Math.min(31.6, X.hx + X.mw + 2.4), 31.6], [Math.max(0.4, X.hx - X.mw - 2.6), 31.6]], CAPE[1]));
      L.back(t => t.poly([[X.hx - X.mw * 0.7, X.hy + 1], [X.hx - X.mw * 0.2, X.hy], [Math.max(0.4, X.hx - X.mw - 2.6), 31.6], [Math.max(0.4, X.hx - X.mw - 1.2), 31.6]], CAPE[2]));
      if (ny != null) L.front(t => { for (let i = 0; i < 5; i++) { const x = X.hx - X.mw * 0.62 + i * X.mw * 0.34, y = ny + (Math.abs(i - 2) === 2 ? -0.5 : Math.abs(i - 2) === 1 ? 0.2 : 0.5); t.ell(x + 0.4, y, 1.7 * s, 1.35 * s, flat(['#ffffff', '#fffaf4', '#e6dcec'])); } });
      L.front(t => { const pts = [[cx - w, by + 0.4], [cx - w - 0.4, by - h], [cx - w * 0.5, by - h * 0.55], [cx, by - h - 1.2 * s], [cx + w * 0.5, by - h * 0.55], [cx + w + 0.4, by - h], [cx + w, by + 0.4]]; t.poly(pts, GOLD[1]); });
      L.front(t => { for (const [x, y] of [[cx - w - 0.4, by - h], [cx, by - h - 1.2 * s], [cx + w + 0.4, by - h]]) t.ell(x, y - 0.5, 0.95 * s, 0.95 * s, '#fffaf0'); });
      L.post(g => {
        for (let x = cx - w + 0.3; x <= cx + w - 0.3; x += 0.5) { if (g.filled(x, by - 0.6)) g.dot(x, by - 0.6, GOLD[2]); if (g.filled(x, by - h * 0.32)) g.dot(x, by - h * 0.32, GOLD[0]); }
        [[cx, by - h * 0.62, GEMS[0], 1.15], [cx - w * 0.58, by - h * 0.25, GEMS[1], 0.85], [cx + w * 0.58, by - h * 0.25, GEMS[2], 0.85]].forEach(([x, y, c, r]) => { g.ell(x, y, r * s + 0.3, r * s + 0.3, INK); g.ell(x, y, r * s, r * s, c); g.dot(x - 0.4, y - 0.4, '#ffffff'); });
        if (ny != null) for (let i = 0; i < 5; i++) { const x = X.hx - X.mw * 0.62 + i * X.mw * 0.34 + 0.4, y = ny + (Math.abs(i - 2) === 2 ? -0.5 : Math.abs(i - 2) === 1 ? 0.2 : 0.5); if (i % 2 === 0) g.dots([[x, y], [x, y + 0.5]], EYE_INK); }
      });
    } },
    // Ninja Mask: a hood band over the forehead and a cloth mask over the lower face (the eyes peep out); two red scarf tails
    // flutter from the knot at the back of the band
    ninja: { glow: () => '#cfc8f0', draw(L, X, F, P) {
      const s = X.s, NJ = ['#a49ecb', '#7a73a6', '#5d5788'], SC = ['#ffc2c8', '#ff8a98', '#e8687c'], f = P.frame ? 1 : 0;
      const bandBot = X.eyeTop - 1.25, bandTop = Math.max(X.top + 0.3, bandBot - 2.3 * s), maskTop = X.eyeBot + 0.7;
      const inHead = (x, y) => ((x - X.hx) / (X.mw + 0.4)) ** 2 + ((y - X.hy) / (X.hh + 0.6)) ** 2 <= 1.05;
      const kx = X.hx - X.mw + 0.4, ky = (bandTop + bandBot) / 2;
      const lx = Math.max(1.2, kx - 3.6 * s), TL = X.hits(lx - 1, ky - 1, kx + 1.2, ky + 4.6) ? L.back : L.front;
      TL(t => stroke(t, [[kx, ky], [kx - 1.8 * s, ky + 0.6 + f * 0.6], [lx, ky + 1.4 - f * 0.5]], 0.85 * s, 0.55 * s, SC[1]));
      TL(t => stroke(t, [[kx, ky + 0.3], [kx - 1.3 * s, ky + 2.2 + f * 0.4], [Math.max(1.2, kx - 2.6 * s), ky + 3.6 - f * 0.4]], 0.8 * s, 0.5 * s, SC[1]));
      TL(t => t.ell(kx + 0.2, ky + 0.1, 1.1 * s, 1 * s, flat(SC)));
      L.post(g => {
        paint(g, (x, y) => y >= bandTop && y <= bandBot && inHead(x, y), (x, y) => (y < bandTop + 0.6 ? NJ[0] : NJ[1]));
        if (X.eyes) paint(g, (x, y) => y >= maskTop && inHead(x, y) && y < X.neck - 0.4, (x, y) => (x - X.hx > X.mw * 0.55 || y > X.neck - 2 ? NJ[2] : NJ[1]));
        for (let x = X.hx - X.mw; x <= X.hx + X.mw; x += 0.5) { if (X.eyes && onBody(g, Math.floor(x * 2), Math.floor(maskTop * 2)) && inHead(x, maskTop) && !inEye(x, maskTop)) g.dot(x, maskTop, NJ[2]); if (onBody(g, Math.floor(x * 2), Math.floor(bandBot * 2)) && inHead(x, bandBot) && !inEye(x, bandBot)) g.dot(x, bandBot, NJ[2]); }
        const px = X.bx + 0.6, py = (bandTop + bandBot) / 2; g.rect(Math.round(px - 1), Math.round(py - 0.5), 2, 1, '#e6ecf4'); g.dot(px - 0.5, py - 0.5, '#ffffff');
      });
    } },
    // Space Helmet: a glass bubble round the head with a star antenna, and a space-suit collar ring
    space: { glow: () => '#c8f0ff', draw(L, X, F, P) {
      const kbox = y => X.hits(X.hx - X.mw * 0.82 - 0.6, y - 1.7, X.hx + X.mw * 0.82 + 1.2, y + 1.7);
      let ny = X.neck - 0.2; if (kbox(ny)) ny = 27.6; if (kbox(ny)) ny = null;
      if (ny != null) L.front(t => t.ell(X.hx + 0.3, ny, X.mw * 0.82 + 0.8, 1.7 * X.s, flat(STEELR)));
      L.post(g => spaceBubble(g, X, P));
    } },
    // Catapult Arm: a bent lobbing arm rising behind the head with a striped watermelon in its cup
    catapult: { glow: () => '#d8f2b8', draw(L, X) { catapultArm(L, X, ['#d8f5b0', '#a6da82', '#6fae56'], X.s, true); } },
    // Jetpack: twin rocket tanks on the back with big puffy flames, and flying goggles on the forehead
    jetpack: { glow: () => '#ffd8a8', draw(L, X, F, P) {
      const s = X.s, x = Math.max(3.6 * s, X.hx - X.mw * 0.92), y = Math.min(X.hy + X.hh * 0.2, 22), f = P.frame ? 1 : 0, T = ['#ffffff', '#e2e8f2', '#b0bccf'];
      const JP = X.hits(x - 3.7 * s, y - 4.4 * s, x + 3.7 * s, y + 10 * s) ? L.back : L.front;
      for (const dx of [-1.75, 1.75]) JP(t => { const fx = x + dx * s, fy = y + 3.2 * s, fl = Math.min(31.6 - fy, (5.4 + f) * s); t.poly([[fx - 1.5 * s, fy], [fx + 1.5 * s, fy], [fx + 1 * s, fy + fl * 0.55], [fx, fy + fl], [fx - 1 * s, fy + fl * 0.55]], '#ff9a8a'); });
      for (const dx of [-1.75, 1.75]) JP(t => { const fx = x + dx * s, fy = y + 3.2 * s; t.ell(fx, fy + 1.4 * s, 0.85 * s, (1.8 + f * 0.6) * s, '#fff2a8'); });
      for (const dx of [-1.75, 1.75]) JP(t => softBody(t, x + dx * s, y, 1.65 * s, 3.7 * s, T));
      for (const dx of [-1.75, 1.75]) JP(t => t.ell(x + dx * s, y - 3.1 * s, 1.45 * s, 0.95 * s, flat(['#ffc2c8', '#ff8a96', '#e8687c'])));
      const gy = Math.min(X.brim + 0.4, X.eyeTop - 1.2 - 1.75 * s);
      L.post(g => { // flying goggles on the forehead (each lens left off if it would touch an eye)
        paint(g, (xx, yy) => Math.abs(yy - gy) < 0.65 && ((xx - X.hx) / (X.mw + 0.3)) ** 2 + ((yy - X.hy) / (X.hh + 0.6)) ** 2 <= 1, '#c8945e');
        for (const dx of [-1, 1]) { const gx = X.bx + 0.9 + dx * 2.3 * s; if (X.hits(gx - 2 * s, gy - 1.7 * s, gx + 2 * s, gy + 1.7 * s)) continue; g.ell(gx, gy, 2.05 * s, 1.75 * s, INK); g.ell(gx, gy, 1.7 * s, 1.4 * s, '#ffd36a'); g.ell(gx, gy, 1.2 * s, 0.95 * s, '#b4e6ff'); g.dot(gx - 0.5, gy - 0.4, '#ffffff'); g.dot(gx, gy - 0.4, '#ffffff'); }
      });
    } },
    // Halloween Pumpkin: a glowing carved jack-o'-lantern shell round the plant
    halloween: { glow: () => '#ffc27a', draw(L, X) { pumpkinShell(L, X, ['#ffd4a0', '#ffad6a', '#ec8a50'], true); } },
    // Viking Helmet: a round steel helmet with a gold rim and nose ridge, two big curved ivory horns, and a little round wooden
    // shield with a steel rim and a gold boss
    viking: { glow: () => '#e6ecf6', draw(L, X) {
      const s = X.s, cx = X.bx, by = X.brim + 0.4, w = X.bw + 1.2 * s, h = Math.min(by - 1.6, w * 0.78 + 1), HORN = ['#fffcf2', '#f4e8cc', '#d4c09a'];
      // each horn sweeps out from the side of the helmet, then curls up to a point. (Near a side edge the horn is squeezed as a
      // whole - its sideways reach shrinks to the room there, about 0.8s for the stroke at its widest point plus 1.6, while it
      // still rises as high, so it curls up more steeply - and near the top edge its rise shrinks the same way: clamping
      // single points flattened a horn against the edge with no outline)
      const horn = d => {
        const x0 = cx + d * w * 0.78, y0 = by - h * 0.3, room = (d < 0 ? x0 : 32 - x0) - (0.8 * s + 1.6), kx = clamp(room / (4.0 * s), 0, 1), ky = clamp((y0 - 0.35 * s - 1.6) / (5.6 * s), 0.4, 1);
        return [[x0, y0], [x0 + d * 2.6 * s * kx, y0 - 0.5 * s * ky], [x0 + d * 4.0 * s * kx, y0 - 2.9 * s * ky], [x0 + d * 3.8 * s * kx, y0 - 5.6 * s * ky]];
      };
      for (const d of [-1, 1]) L.front(t => { const H = horn(d); stroke(t, H, 1.65 * s, 0.35 * s, HORN[1]); shadeShape(t, H[2][0], H[2][1], 2.4 * s, 3 * s, HORN, { hl: false }); });
      L.front(t => softBody(t, cx, by + 0.6, w, h + 0.6, STEELR, { mask: fm((x, y) => y <= by + 0.2) }));
      L.front(t => t.ell(cx + 0.3, by + 0.1, w + 0.3, 1.15 * s, flat(GOLD)));
      const r = 2.6 * s, B = badgeSpot(X, r + 0.5 * s), SH = B.behind ? L.back : L.front;
      SH(t => softBody(t, B.x, B.y, r + 0.5 * s, r + 0.5 * s, STEELR, { hl: false }));
      SH(t => softBody(t, B.x, B.y, r - 0.3 * s, r - 0.3 * s, ['#f6d4a4', '#dca872', '#b8844e']));
      SH(t => softBody(t, B.x, B.y, 0.95 * s, 0.95 * s, GOLD));
      L.post(g => {
        for (let y = by - h + 0.6; y <= by - 0.6; y += 0.5) if (g.filled(cx + 0.6, y)) { g.dot(cx + 0.4, y, GOLD[1]); g.dot(cx + 0.9, y, GOLD[2]); }
        for (const k of [-0.6, -0.2, 0.2, 0.6]) if (g.filled(cx + k * w, by)) g.dot(cx + k * w, by, '#fff6c4');
        for (const d of [-1, 1]) { const H = horn(d); for (const k of [0.25, 0.7]) { const x = H[1][0] + (H[2][0] - H[1][0]) * k, y = H[1][1] + (H[2][1] - H[1][1]) * k; PX.stroke(g, [[x - d * 0.75 * s, y - 0.35 * s], [x + d * 0.65 * s, y + 0.3 * s]], 0.17, 0.17, HORN[2]); } }
        if (!B.behind) for (const dx of [-0.5, 0.5]) PX.stroke(g, [[B.x + dx * r, B.y - r * 0.5], [B.x + dx * r, B.y + r * 0.55]], 0.16, 0.16, '#b8844e');
      });
    } },
    // Chef Hat: a tall puffy white chef's hat (a pleated band under a cloud of a top) + a red neckerchief knotted at the neck and
    // a wooden spoon at the back
    chef: { glow: () => '#fff4e0', draw(L, X) {
      // (the hat's top puff stays 2 px under the top edge, outline and all: on a tall head the puffs get smaller, and if even
      // small puffs don't fit the band gets a little shorter - a shorter, puffier hat rather than one cut off flat)
      const s = X.s, cx = X.bx + 0.2, by = X.brim + 0.4, w = Math.max(3.6, X.bw * 0.74 + 0.6), bh = Math.max(1.0, Math.min(2.2 * s, by - 2.0 - 1.95 * 1.4)), r = clamp((by - bh - 2.0) / 1.95, 1.4, w * 0.6), WH = ['#ffffff', '#fbf9f4', '#dcd4c8'];
      const py = by - bh - r * 0.5, puffs = [[cx - w * 0.55, py, r * 0.92], [cx + w * 0.55, py, r * 0.92], [cx, py - r * 0.55, r]];
      L.back(t => { const x0 = X.hx - X.mw * 0.5, y0 = X.neck - 1.2, x1 = clamp(X.hx - X.mw - 2.2 * s, 1.6 + 1.3 * s, 30), y1 = Math.max(3.4, X.hy - X.hh * 0.45); stroke(t, [[x0, y0], [x1, y1]], 0.45 * s, 0.5 * s, '#dcaa70'); t.ell(x1 - 0.3, y1 - 1.1 * s, 1.15 * s, 1.6 * s, flat(['#f6d6a8', '#e0b07a', '#c08c58']), -0.35); });
      L.front(t => { for (const [x, y, rr] of puffs) t.ell(x, y, rr, rr * 0.9, WH[1]); t.poly([[cx - w * 0.82, by - bh + 0.2], [cx + w * 0.82, by - bh + 0.2], [cx + w * 0.82, py], [cx - w * 0.82, py]], WH[1]); shadeShape(t, cx, py - r * 0.3, w + r * 0.4, r * 1.3, WH); });
      L.front(t => { t.poly([[cx - w * 0.8, by + 0.4], [cx + w * 0.8, by + 0.4], [cx + w * 0.84, by - bh], [cx - w * 0.84, by - bh]], WH[1]); shadeShape(t, cx, by - bh / 2, w * 0.84, bh, WH, { hl: false }); });
      const bbox = y => X.hits(X.hx - X.mw * 0.5 - 1.3, y - 2, X.hx + X.mw * 0.6, y + 3 * s);
      let ny = X.neck - 0.8; if (bbox(ny)) ny = 26.8; if (bbox(ny)) ny = null;
      if (ny != null) L.front(t => { t.poly([[X.hx - X.mw * 0.5, ny - 1.2], [X.hx + X.mw * 0.6, ny - 1.2], [X.hx + 0.6, ny + 3 * s]], '#ff8a8a'); t.ell(X.hx - X.mw * 0.46, ny - 0.7, 1.15 * s, 0.95 * s, '#ff8a8a'); });
      L.post(g => {
        for (const k of [-0.5, 0, 0.5]) PX.stroke(g, [[cx + k * w, by - bh + 0.5], [cx + k * w, by - 0.3]], 0.16, 0.16, WH[2]);
        for (const [x, y, rr] of puffs.slice(0, 2)) for (let a = 0.6; a <= 2.0; a += 0.2) { const px = x + Math.cos(a) * rr * 0.8, ppy = y + Math.sin(a) * rr * 0.55 - rr * 0.1; if (g.filled(px, ppy) && ppy < by - bh) g.dot(px, ppy, '#ece6dc'); }
        if (ny != null) for (const [dx, dy] of [[-0.2, -0.4], [0.25, -0.4], [0.05, 0.7]]) g.dot(X.hx + dx * X.mw, ny + dy * 1.4, '#ffffff');
      });
    } },
    // Headphones: big comfy headphones - a pink band arching over the top of the head, a big round ear cup on the near (back)
    // side, the far cup peeking out behind the front - and music notes bobbing round it
    headphones: { glow: () => '#ffc8e6', draw(L, X, F, P) {
      const s = X.s, f = P.frame ? 1 : 0, cy = X.hy - X.hh * 0.08, crx = 2.1 * s, cry = 2.8 * s, HP = ['#ffd2e4', '#ff96ba', '#e8709c'], PAD = ['#efe8ff', '#c4b4f0', '#a090d4'];
      // (both cups stay 1.6 px inside the side edges, outline and all: the near cup is drawn 0.3s further out than nx)
      const nlo = crx + 0.3 * s + 1.6; let nx = Math.max(nlo, X.hx - X.mw * 0.8); if (X.hits(nx - crx, cy - cry, nx + crx + 0.4, cy + cry)) nx = Math.max(nlo, X.hx - X.mw - 0.6);
      const NC = X.hits(nx - crx, cy - cry, nx + crx + 0.4, cy + cry) ? L.back : L.front, fx = Math.min(30.4 - crx * 0.9, X.hx + X.mw * 0.86);
      // (on a tall head the band is a lower, rounder arc hugging the head - it's behind it - rather than one squashed flat along
      // the top edge: its top stays 2 px under the edge, outline and all. Its height comes from the head itself, not X.top:
      // over Lily Pad's lotus bud or Storm Striker's bolt it was a tall handbag handle - the bud or bolt pokes up in front)
      const ox = (nx + fx) / 2, orx = (fx - nx) / 2, ory = Math.min(cy - topAt(X, X.hx) + 1.3 * s, cy - 2.0 - 0.43 * s), band = [];
      for (let i = 0; i <= 18; i++) { const a = Math.PI + i * Math.PI / 18; band.push([ox + Math.cos(a) * orx, cy + Math.sin(a) * ory]); }
      L.back(t => { stroke(t, band, 0.85 * s, 0.85 * s, HP[1]); shadeShape(t, ox, cy - ory * 0.6, orx, ory, HP, { hl: false }); });
      L.back(t => softBody(t, fx, cy - 0.3, crx * 0.9, cry * 0.9, HP));
      NC(t => softBody(t, nx + 0.5 * s, cy, crx * 0.75, cry * 0.95, PAD, { hl: false }));
      NC(t => softBody(t, nx - 0.3 * s, cy, crx, cry, HP));
      L.post(g => {
        if (NC === L.front) { g.ell(nx - 0.3 * s, cy, crx * 0.5, cry * 0.5, HP[0], 0, fm((x, y) => g.get(x, y) === HP[1])); g.dot(nx - 0.9 * s, cy - cry * 0.5, '#ffffff'); }
        // (each note's stem and flag stay inside the sprite too)
        floatBits(g, t => { musicNote(t, clamp(X.hx + X.mw + 1.0, 2, 30.2 - 1.75 * s), clamp(X.top + 1.6 - f * 0.6, Math.max(3.6, 1.9 + 2.85 * s), 28), 1.05 * s, '#a07ee6'); musicNote(t, clamp(nx - crx - 1.6, 1.5 + 0.85 * s, 29), clamp(cy - cry - 1.4 + f * 0.6, Math.max(3.8, 1.9 + 2.45 * s), 28), 0.9 * s, '#ff7aa8'); });
      });
    } },
    // Propeller Cap: a striped candy beanie (four pastel wedges, a little bill at the front, a button on top) with a propeller
    // that spins (frame 1 shows its blades turned edge-on)
    propeller: { glow: () => '#d8ecff', draw(L, X, F, P) {
      const s = X.s, cx = X.bx, by = X.brim + 0.4, w = X.bw + 1.0 * s, f = P.frame ? 1 : 0, h = Math.max(2, Math.min(by - 4.2 * s, w * 0.72 + 0.6)), STR = ['#ff9eae', '#fff08a', '#9ad4ff', '#a8eab4'];
      L.front(t => t.ell(cx + w * 0.78, by + 0.3, 2.6 * s, 0.9 * s, flat(['#c8e6ff', '#9ad4ff', '#74b4e8']), 0.12));
      L.front(t => {
        softBody(t, cx, by + 0.4, w, h + 0.4, ['#ffffff', '#ffffff', '#cfcfcf'], { mask: fm((x, y) => y <= by + 0.2) });
        // the candy wedges fan out from the middle of the brim; the soft shade stays as a darker tone of each wedge
        for (let i = 0; i < t.a.length; i++) { const c = t.a[i]; if (!c || c === INK) continue; const x = (i % t.fw + 0.5) / t.k, y = (Math.floor(i / t.fw) + 0.5) / t.k, a = Math.atan2(y - by - 1.2, x - cx), band = STR[clamp(Math.floor((a + Math.PI) / (Math.PI / 4)), 0, 3)]; t.a[i] = c === '#cfcfcf' ? mixHex(band, '#b08aa0', 0.22) : band; }
        t.ell(cx - w * 0.45, by - h * 0.55, Math.max(0.6, w * 0.2), Math.max(0.45, h * 0.13), '#ffffff', -0.55, fm((x, y) => t.filled(x, y)));
      });
      const top = by - h - 0.2, py = Math.max(1.0 + 0.6 * s, top - 1.6 * s), bl = f ? 1.0 * s : 2.7 * s;
      L.front(t => stroke(t, [[cx, top + 0.6], [cx, py]], 0.32 * s, 0.32 * s, '#b8bcc8'));
      L.front(t => { for (const d of [-1, 1]) t.ell(cx + d * (bl + 0.3 * s), py, bl, 0.78 * s, flat(['#fff6c4', '#ffd36a', '#eaae46']), f ? d * 0.5 : d * 0.12); t.ell(cx, py, 0.75 * s, 0.75 * s, '#ff8fa8'); });
      L.post(g => { g.ell(cx, top + 0.3, 0.9 * s, 0.6 * s, '#ff8fa8', 0, fm((x, y) => g.filled(x, y))); if (!f) for (const d of [-1, 1]) { const x = cx + d * (2 * bl + 1.2 * s), y = py - 0.4; if (!g.get(x, y)) { g.dot(x, y, '#9ad4ff'); g.dot(x, y + 0.5, '#9ad4ff'); } } });
    } },
    // Hero Cape: a long red superhero cape flying out behind from the neck - its back edge billows out from narrow shoulders,
    // the hem's back corner lifts off the ground and the hem waves in three deep scallops (it ripples as the plant runs) - with
    // a big gold star on the widest part that shows and a star clasp at the neck. On a low, wide body that would hide it (Lily
    // Pad) it streams out behind and above instead. (No mask: the masked cape is the hero plants' fusion part. Pinned flat to
    // the sprite's left edge with a flat grounded hem, it read as a red armchair.)
    cape: { glow: () => '#ffc0c0', draw(L, X, F, P) {
      const s = X.s, fl = P.walk ? (P.frame ? 1.4 : 0.7) : P.frame ? 0.35 : 0, RED = ['#ffb6b6', '#ff707c', '#dc5266'], bx = X.hx - X.mw, M = 1.6, ny = Math.min(X.hy + X.hh * 0.42, 25.5);
      const bez = (p0, p1, p2, p3) => { const o = []; for (let i = 0; i <= 12; i++) { const t = i / 12, u = 1 - t; o.push([0, 1].map(c => u * u * u * p0[c] + 3 * u * u * t * p1[c] + 3 * u * t * t * p2[c] + t * t * t * p3[c])); } return o; };
      // n round scallops bulging out (to the left of the a -> b direction), each a little different, rippling with f
      const scallops = (a, b, n, d, f) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, o = []; for (let i = 0; i < n; i++) for (let j = 0; j <= 8; j++) { const t = (i + j / 8) / n, k = Math.sin(Math.PI * j / 8) * d * (1 + 0.2 * Math.sin(f * 2 + i * 2.1)); o.push([a[0] + dx * t - dy / l * k, a[1] + dy * t + dx / l * k]); } return o; };
      const shape = (f, fly) => {
        if (fly) {
          const T0 = [X.hx - X.mw * 0.15, X.top + 1.4], B = [Math.max(M, bx - Math.max(5.4 * s, 5) - f), Math.max(M + 0.6, X.top - Math.max(5.8 * s, 6) + f * 0.4)], D = [Math.max(M, bx - Math.max(3 * s, 3.5)), X.hy - X.hh * 0.15];
          return { B, cusps: [1, 2].map(i => [B[0] + (D[0] - B[0]) * i / 3, B[1] + (D[1] - B[1]) * i / 3]), root: T0,
            pts: bez(T0, [T0[0] - 2 * s, T0[1] - 3 * s], [B[0] + 2.4 * s, B[1] - 0.6], B).concat(scallops(B, D, 3, 1.3 * s, f), [[X.hx - X.mw * 0.3, X.hy]]).map(([x, y]) => [Math.max(M, x), Math.max(M, y)]) };
        }
        const flare = clamp(bx - M, 0, 5.4 * s + f), out = bx - flare, S = [bx + 0.8, X.hy - X.hh * 0.42], B = [out, Math.min(27.4, X.hy + X.hh * 0.62) - f * 0.6], H = [X.hx + X.mw * 0.45, 31.2];
        return { B, cusps: [1, 2].map(i => [B[0] + (H[0] - B[0]) * i / 3, B[1] + (H[1] - B[1]) * i / 3]), root: [bx + 1.2, X.hy - X.hh * 0.2],
          pts: [[X.hx + X.mw * 0.5, ny], [X.hx - X.mw * 0.25, X.hy - X.hh * 0.36]].concat(bez(S, [bx - flare * 0.3, S[1] + (B[1] - S[1]) * 0.25], [out - 0.8, S[1] + (B[1] - S[1]) * 0.7], B), scallops(B, H, 3, 1.5 * s, f), [[X.hx + X.mw * 0.5, 31.2]]).map(([x, y]) => [Math.max(M, x), Math.min(31.2, y)]) };
      };
      // the gold star goes on the roomiest spot of the resting cape that the plant doesn't cover (fitted once on the resting
      // shape, so it doesn't hop about as the cape ripples); if there's no room for one at all, a wide low body is hiding the
      // cape, and it flies up behind instead
      const t0 = new Grid(32, 32), spot = () => {
        const free = (x, y, r) => { if (!t0.filled(x, y) || bodyAt(X, x, y)) return false; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (!t0.filled(px, py) || bodyAt(X, px, py)) return false; } return true; };
        let best = null;
        for (let y = 2; y <= 30; y += 0.5) for (let x = 1.5; x <= X.hx; x += 0.5) { if (!free(x, y, 0.6)) continue; let r = 0.6; while (r < 3.4 * s && free(x, y, r + 0.2)) r += 0.2; if (!best || r > best.r + 0.01 || (r > best.r - 0.01 && y > best.y)) best = { x, y, r }; }
        return best;
      };
      t0.poly(shape(0, false).pts, RED[1]);
      let star = spot(); const fly = !star || star.r < (X.top > 12 ? 2.2 : 1.5), C = shape(fl, fly);
      if (fly) { t0.a.fill(null); t0.poly(shape(0, true).pts, RED[1]); star = spot(); }
      L.back(t => {
        t.poly(C.pts, RED[1]); shadeShape(t, bx + 1, X.hy, X.mw + 4, X.hh + 4, RED, { hl: false });
        // a flash of the lighter lining where the lifted back corner flips over, and two soft folds running down to the hem
        const [qx, qy] = C.B, v = fly ? 1 : -1; t.poly([[qx, qy], [qx + 1.8 * s, qy + v * 0.3 * s], [qx + 0.5 * s, qy + v * 2.0 * s]], RED[0]);
        if (!fly) for (const [x, y] of C.cusps) stroke(t, [C.root, [x, y - 0.6]], 0.2, 0.26, RED[2]); // (on the flying cape they read as the ribs of a wing)
      });
      if (star) { const ro = clamp(star.r - 0.6, Math.max(1.2 * s, 1.3), 2.5 * s); L.back(t => star5(t, star.x, star.y + ro * 0.08, ro, ro * 0.45, GOLD[1], -Math.PI / 2 - 0.15)); L.post(g => { if (g.get(star.x - ro * 0.25, star.y - ro * 0.2) === GOLD[1]) g.dot(star.x - ro * 0.25, star.y - ro * 0.25, '#ffffff'); }); }
      const cxp = X.hx - X.mw * 0.66, cyp = Math.min(X.neck - 2.2 * s, X.hy + X.hh * 0.42);
      if (!fly && !X.hits(cxp - 1.7 * s, cyp - 1.7 * s, cxp + 1.7 * s, cyp + 1.7 * s)) L.front(t => star5(t, cxp, cyp, 1.5 * s, 0.68 * s, GOLD[1], -Math.PI / 2));
    } },
    // Cool Shades: big star-shaped pink sunglasses pushed up on top of the head (the big eyes stay free) and a sparkle
    sunglasses: { glow: () => '#ffc4e8', draw(L, X, F, P) {
      const s = X.s, gy = X.brim - 1.95 * s, gx = X.bx + 0.6, r = 2.9 * s, d = 3.0 * s, FR = ['#ffcce6', '#ff7cbc', '#e45c9c'], LN = ['#d8ccff', '#a894e8', '#8c78d0'];
      L.front(t => stroke(t, [[Math.max(1, gx - d - r - 2 * s), gy + 1.6 * s], [gx - d - r * 0.6, gy + 0.2], [gx + d + r * 0.6, gy + 0.2], [Math.min(31, gx + d + r + 0.6 * s), gy + 0.9 * s]], 0.42 * s, 0.42 * s, FR[1]));
      L.front(t => { for (const dx of [-d, d]) t.poly(starPts(gx + dx, gy, r, r * 0.56, 5, -Math.PI / 2 + (dx < 0 ? -0.12 : 0.12)), FR[1]); shadeShape(t, gx, gy, d + r, r, FR, { hl: false }); });
      L.post(g => {
        for (const dx of [-d, d]) { const x = gx + dx; g.poly(starPts(x, gy + 0.1, r * 0.62, r * 0.35, 5, -Math.PI / 2 + (dx < 0 ? -0.12 : 0.12)), LN[1]); g.dot(x - r * 0.18, gy - r * 0.18, '#ffffff'); g.dot(x - r * 0.18 + 0.5, gy - r * 0.18, '#ffffff'); }
        const f = P.frame ? 1 : 0; floatBits(g, t => twinkle(t, clamp(gx + d + r + 1.6 * s, 2, 30.2), Math.max(1.8, gy - r - 0.6 + f * 0.4), (1.5 - f * 0.3) * s, '#fff6b0'));
      });
    } },
    // Flower Crown: a ring of tiny pastel flowers (pink, butter, lilac, white, peach, baby blue) with little leaves, round the top
    // of the head: three peep up from the back of the ring, five sit across the front
    flowercrown: { glow: () => '#ffe0f0', draw(L, X) {
      const s = X.s, cx = X.bx + 0.3, cy = X.brim - 0.7 * s, rx = X.bw + 0.5 * s, ry = 1.5 * s, r = 1.5 * s, COLS = [['#ffb6ca', '#ffe27a'], ['#fff0a0', '#ffa45a'], ['#d6c4ff', '#ffe27a'], ['#ffffff', '#ffd24a'], ['#ffcca8', '#ffe27a'], ['#acdcff', '#fff0a0']];
      const at = a => [clamp(cx + Math.cos(a) * rx, r + 0.4, 31.6 - r), Math.max(r + 0.4, cy + Math.sin(a) * ry)];
      const back = [Math.PI + 0.75, Math.PI * 1.5, Math.PI * 2 - 0.75].map(at), front = [Math.PI - 0.1, Math.PI * 0.74, Math.PI * 0.5, Math.PI * 0.26, 0.1].map(at);
      L.front(t => { back.forEach(([x, y], i) => flower5(t, x, y, r * 0.86, COLS[(i * 2 + 1) % 6][0], COLS[(i * 2 + 1) % 6][1], 0.3)); });
      L.front(t => { const p = []; for (let i = 0; i <= 16; i++) p.push(at(Math.PI - 0.1 - i * (Math.PI - 0.2) / 16)); stroke(t, p, 0.42 * s, 0.42 * s, '#7cc860'); for (const a of [Math.PI * 0.87, Math.PI * 0.62, Math.PI * 0.38, Math.PI * 0.13]) { const [x, y] = at(a); t.ell(x, y + 0.2, 1.2 * s, 0.55 * s, flat(['#d0f8b0', '#a2e27e', '#74c058']), a > Math.PI / 2 ? 0.5 : -0.5); } });
      for (const odd of [0, 1]) L.front(t => { front.forEach(([x, y], i) => { if (i % 2 === odd) flower5(t, x, y, r, COLS[i % 6][0], COLS[i % 6][1], i * 0.4); }); });
      L.post(g => { for (const [x, y] of front) g.dot(x - 0.3 * s, y - 0.3 * s, '#ffffff'); });
    } },
    // Diving Mask: a round diving mask pushed up on the head (a thick teal rim round tinted glass with a glint, a strap round the
    // back), a bendy orange snorkel up the back of the head, and a couple of bubbles
    diving: { glow: () => '#c8f0ff', draw(L, X, F, P) {
      const s = X.s, f = P.frame ? 0.6 : 0, mx = X.bx + 0.8, my = X.brim - 1.7 * s, mrx = Math.max(3.0, X.bw * 0.6 + 0.4), mry = 2.0 * s, RIM = ['#b8f0f4', '#5ec8d4', '#3ea2b4'], OR = ['#ffe0b0', '#ffae52', '#ec8a36'];
      // (the snorkel's top and mouthpiece stay under the top edge, outline and all; when that leaves a stubby tube, its top
      // bends further forward toward the mask, a little lower, instead of reaching for the edge)
      const sx = clamp(X.hx - X.mw * 0.86, 1.6 + 1.05 * s, 30), sy0 = X.hy - X.hh * 0.05, sy1 = Math.max(1.8 + 0.9 * s, Math.min(X.top - 1.4 * s, my - mry - 1.6 * s)), bend = clamp(3 * s - (sy0 - sy1), 0, 2.5 * s);
      const tip = [sx + 1.4 * s + bend, sy1 + bend * 0.4], SN = X.hits(sx - 1, sy1, tip[0] + 1.2 * s, sy0) ? L.back : L.front;
      L.front(t => stroke(t, [[Math.max(0.9, X.hx - X.mw + 0.2), my + 1.4 * s], [mx - mrx, my + 0.3]], 0.5 * s, 0.5 * s, '#4a8cb4'));
      SN(t => { stroke(t, [[sx, sy0], [sx - 0.3 * s, (sy0 + sy1) / 2], [sx + bend * 0.3, sy1 + 1.2 * s + bend * 0.2], tip], 0.75 * s, 0.75 * s, OR[1]); shadeShape(t, sx, (sy0 + sy1) / 2, 1.6 * s, (sy0 - sy1) / 2 + 1, OR, { hl: false }); });
      SN(t => t.ell(tip[0] + 0.1 * s, tip[1] - 0.1, 0.9 * s, 0.7 * s, '#4a8cb4', 0.4));
      L.front(t => { softBody(t, mx, my, mrx + 0.7 * s, mry + 0.7 * s, RIM); });
      L.post(g => {
        g.ell(mx, my, mrx - 0.2, mry - 0.15, '#d2f4ff'); g.ell(mx + mrx * 0.25, my + mry * 0.3, mrx * 0.6, mry * 0.35, '#b2e4f6', 0, fm((x, y) => g.get(x, y) === '#d2f4ff'));
        PX.stroke(g, [[mx - mrx * 0.62, my + 0.1], [mx - mrx * 0.22, my - mry * 0.55]], 0.3, 0.3, '#ffffff'); g.dot(mx + mrx * 0.45, my - mry * 0.4, '#ffffff');
        // (the bubbles stay inside the sprite, outline and all)
        const bub = [[tip[0] + 1.4 * s, sy1 - 1.6 * s - f, 0.85], [tip[0] + 2.4 * s, sy1 - 3.4 * s - f * 0.6, 0.6]].map(([x, y, rr]) => [clamp(x, 1.5 + rr * s, 30.5 - rr * s), clamp(y, 1.5 + rr * s, 30), rr * s]);
        floatBits(g, t => { for (const [x, y, rr] of bub) t.ell(x, y, rr, rr, '#dff6ff'); });
        for (const [x, y, rr] of bub) if (g.get(x - rr * 0.35, y - rr * 0.35) === '#dff6ff') g.dot(x - rr * 0.35, y - rr * 0.35, '#ffffff');
      });
    } },
  };
  // the Space Helmet: a glass bubble round the head (lightly tinted over the face), a bright rim, glare arcs, a star antenna
  function spaceBubble(g, X, P) {
    let cx = X.hx + 0.4, cy = X.hy + 0.2, rx = X.mw + 2.6 * X.s, ry = X.hh + 2.4 * X.s;
    if (X.eyes) { // stretch down / out until the leader's eyes sit well inside the glass
      const top0 = cy - ry, bot0 = Math.max(cy + ry, X.eyeBot + 2.4); cy = (top0 + bot0) / 2; ry = (bot0 - top0) / 2;
      for (const e of X.eyes) for (const ex of [e.x - e.w / 2 - 0.8, e.x + e.w / 2 + 0.8]) { const v = Math.min(0.9, Math.abs(e.y - cy) / ry); rx = Math.max(rx, Math.abs(ex - cx) / Math.sqrt(1 - v * v)); }
    }
    ry = Math.min(ry, cy - 0.8, 31.2 - cy); rx = Math.min(rx, cx - 0.6, 31.4 - cx);
    // shrink the bubble (down to the leader's head) so it doesn't reach another head's eyes; any eye it still reaches stays clear
    const others = X.others || [], reach = b => { const nx = clamp(cx, b.x0, b.x1), ny = clamp(cy, b.y0, b.y1); return ((nx - cx) / rx) ** 2 + ((ny - cy) / ry) ** 2 < 1.02; };
    const minRx = Math.min(rx, X.mw + 0.8), minRy = Math.min(ry, Math.max(X.hh + 0.8, (X.eyeBot + 1.6 - (cy - ry)) / 2));
    for (let i = 0; i < 24 && others.some(reach); i++) { rx = Math.max(minRx, rx * 0.95); ry = Math.max(minRy, ry * 0.95); }
    if (others.some(reach)) { // several heads: the whole plant goes inside one big glass dome
      let x0 = 99, y0 = 99, x1 = -1, y1 = -1; for (let fy = 0; fy < g.fh; fy++) for (let fx = 0; fx < g.fw; fx++) { const c = g.fget(fx, fy); if (c && c[0] === '#') { x0 = Math.min(x0, fx); x1 = Math.max(x1, fx); y0 = Math.min(y0, fy); y1 = Math.max(y1, fy); } }
      x0 /= g.k; x1 = (x1 + 1) / g.k; y0 /= g.k; y1 = (y1 + 1) / g.k; cx = (x0 + x1) / 2; cy = (y0 + y1) / 2 - 0.6;
      rx = Math.min((x1 - x0) / 2 + 1.6, cx - 0.5, 31.5 - cx); ry = Math.min((y1 - y0) / 2 + 1.8, cy - 0.5, 31.5 - cy);
    }
    const clearEye = (x, y) => (X.boxes || []).some(b => x > b.x0 - 0.3 && x < b.x1 + 0.3 && y > b.y0 - 0.3 && y < b.y1 + 0.3);
    const k = g.k, d = (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    for (let fy = 0; fy < g.fh; fy++) for (let fx = 0; fx < g.fw; fx++) {
      const x = (fx + 0.5) / k, y = (fy + 0.5) / k, q = d(x, y), c = g.fget(fx, fy);
      if (q > 1 || (q > 0.8 && clearEye(x, y))) continue;
      if (q > 0.86) g.fset(fx, fy, q > 0.94 ? '#e8f8ff' : '#b8e6fa');
      else if (!c) g.fset(fx, fy, 'rgba(196,236,255,0.42)');
      else if (c !== INK && c[0] === '#' && c !== WHITE && lum(c) >= 0.25 && !clearEye(x, y)) g.fset(fx, fy, mixHex(c, '#e2f6ff', 0.16));
    }
    for (const [a0, a1, rr] of [[3.45, 4.35, 0.8], [4.55, 4.75, 0.8], [0.35, 0.75, 0.82]]) for (let a = a0; a <= a1; a += 0.05) { const x = cx + Math.cos(a) * rx * rr, y = cy + Math.sin(a) * ry * rr; if (!clearEye(x, y)) g.dot(x, y, '#ffffff'); }
    const ax = cx + rx * 0.42, ay = cy - ry * 0.92, top = Math.max(1.6, ay - 3.2);
    PX.stroke(g, [[ax, ay], [ax + 0.4, top + 0.8]], 0.32, 0.32, '#9ea9c2');
    const t = new Grid(32, 32); star5(t, ax + 0.4, top + 0.2, 1.7, 0.75, P && P.frame ? '#ffe08a' : '#ffb4c8', -Math.PI / 2); t.outline(); g.merge(t);
  }

  // ---------------- element effects (pastel, chibi): a big topper above the head, or a small floating badge when the plant
  // also wears a fusion (so it never fights a hat). fx(L, x, y, s, P, onSkin): x, y = bottom centre of the effect ----------------
  const EL_FX = {
    fire(L, x, y, s, P) { flameCrown(L, x, y - 0.4 * s, 3.7 * s, Math.min(y - 0.8, 7.2 * s), P, false); },
    water(L, x, y, s, P) { const yy = y - 2.6 * s - (P.frame ? 0.5 : 0); L.front(t => { softBody(t, x, yy, 2.1 * s, 2.1 * s, ['#e8fbff', '#a2dcf8', '#6cb6e6']); t.poly([[x - 1.55 * s, yy - 1.1 * s], [x + 1.55 * s, yy - 1.1 * s], [x, yy - 4 * s]], '#a2dcf8'); });
      L.post(g => { g.dot(x - 0.8 * s, yy - 0.8 * s, '#ffffff'); g.dot(x - 0.8 * s, yy - 0.3 * s, '#ffffff'); }); },
    ice(L, x, y, s, P, top, onSkin) { const c = onSkin ? ['#c8ecff', '#7cc4f2', '#5aa0dc'] : ['#ffffff', '#d6f2ff', '#a2d4f2'];
      for (const [dx, hh, w] of [[-2.6, 3.6, 1.2], [2.6, 3.4, 1.15], [0, 5.2, 1.5]]) L.front(t => t.poly([[x + (dx - w) * s, y + 0.6], [x + (dx - w) * s, y - hh * 0.55 * s], [x + dx * s, y - hh * s], [x + (dx + w) * s, y - hh * 0.55 * s], [x + (dx + w) * s, y + 0.6]], c[1]));
      L.post(g => { for (const [dx, hh] of [[-2.6, 3.6], [2.6, 3.4], [0, 5.2]]) { g.dot(x + (dx - 0.5) * s, y - hh * 0.55 * s, '#ffffff'); g.dot(x + (dx - 0.5) * s, y - hh * 0.4 * s, '#ffffff'); } }); },
    electric(L, x, y, s, P) { L.front(t => boltShape(t, x + 0.3, y + 0.6, 1.5 * s, 0.12, '#fff08a')); L.post(g => { for (const [dx, dy] of [[-3, -2.4], [3.2, -4.4]]) { const xx = x + dx * s, yy = y + dy * s - (P.frame ? 0.5 : 0); if (!g.get(xx, yy)) { g.dot(xx, yy, '#ffe24a'); g.dot(xx + 0.5, yy - 0.5, '#ffe24a'); } } }); },
    laser(L, x, y, s, P) { const yy = y - 2.8 * s - (P.frame ? 0.5 : 0); L.front(t => t.poly([[x, yy - 2.8 * s], [x + 2 * s, yy - 0.6 * s], [x, yy + 1.6 * s], [x - 2 * s, yy - 0.6 * s]], '#ffa8c0'));
      L.post(g => { g.poly([[x, yy - 2.2 * s], [x + 0.9 * s, yy - 0.6 * s], [x, yy - 0.2 * s], [x - 0.9 * s, yy - 0.6 * s]], '#ffe0ea'); for (const [dx, dy] of [[-3, -0.6], [3, -0.6], [0, -4.4]]) if (!g.get(x + dx * s, yy + dy * s)) g.dot(x + dx * s, yy + dy * s, '#ff8fb0'); }); },
    poison(L, x, y, s, P) { const f = P.frame ? 0.5 : 0; for (const [dx, dy, r] of [[-1.2, -1.6, 1.5], [1.6, -3.6, 1.1], [-0.4, -5.4, 0.8]]) L.front(t => softBody(t, x + dx * s, y + (dy - f) * s, r * s, r * s, ['#f2dcff', '#cfa2f4', '#a878dc']));
      L.post(g => { for (const [dx, dy, r] of [[-1.2, -1.6, 1.5], [1.6, -3.6, 1.1]]) g.dot(x + (dx - r * 0.4) * s, y + (dy - f - r * 0.4) * s, '#ffffff'); }); },
    magic(L, x, y, s, P) { const yy = y - 2.8 * s; L.front(t => star5(t, x, yy, 3.2 * s, 1.5 * s, '#ffc4ec', -Math.PI / 2 + (P.frame ? 0.15 : 0))); L.post(g => { star5(g, x, yy + 0.2, 1.4 * s, 0.6 * s, '#fff6b0', -Math.PI / 2); }); },
    dark(L, x, y, s) { for (const dir of [-1, 1]) L.front(t => t.poly([[x + dir * 1.4 * s, y + 0.8], [x + dir * 3.4 * s, y + 0.8], [x + dir * 3.2 * s, y - 3.4 * s]], '#a294c8'));
      L.post(g => { for (const dir of [-1, 1]) g.dot(x + dir * 3 * s, y - 1.8 * s, '#e2d8ff'); }); },
    rock(L, x, y, s) { L.front(t => softBody(t, x - 1.4 * s, y - 0.4, 2.2 * s, 1.6 * s, ['#f2ece2', '#d4cab8', '#ac9e8e'])); L.front(t => softBody(t, x + 1.6 * s, y - 0.9 * s, 1.7 * s, 1.3 * s, ['#f2ece2', '#c8bca8', '#a09280']));
      L.front(t => t.ell(x + 1.9 * s, y - 2.6 * s, 0.9 * s, 0.5 * s, flat(['#c8f0a0', '#9ed86a', '#7cb850']), -0.5)); },
    robot(L, x, y, s, P) { L.back(t => stroke(t, [[x, y + 1], [x, y - 3.4 * s]], 0.42, 0.42, '#a4b0c8')); L.front(t => softBody(t, x, y - 4 * s, 1.35 * s, 1.35 * s, P.frame ? ['#fffbd0', '#ffe27a', '#f2c24a'] : ['#fff6c0', '#ffd860', '#eab040'])); },
    normal() {},
  };
  // little extras painted straight onto the plant after its outline: shines, sparkles round the body
  function elDetails(g, el, X, P) {
    const free = (x, y) => !g.get(x, y), f = P.frame ? 1 : 0;
    const around = [[X.hx - X.mw - 1.6, X.hy - X.hh * 0.4], [X.hx + X.mw + 1.8, X.hy + X.hh * 0.2], [X.hx - X.mw - 1, X.hy + X.hh * 0.6]];
    const dotAt = (x, y, c) => { if (free(x, y)) g.dot(x, y, c); };
    if (el === 'ice') for (const [x, y] of around.slice(0, 2)) { for (const [a, b] of [[0, 0], [0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) dotAt(x + a, y + b, '#ffffff'); }
    if (el === 'electric') around.forEach(([x, y], i) => { if ((i + f) % 2) return; dotAt(x, y, '#ffe24a'); dotAt(x + 0.5, y - 0.5, '#ffe24a'); dotAt(x - 0.5, y + 0.5, '#ffe24a'); });
    if (el === 'magic') around.forEach(([x, y], i) => { const c = (i + f) % 2 ? '#ffc4ec' : '#fff6b0'; dotAt(x, y, c); for (const [a, b] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) dotAt(x + a, y + b, c); });
    if (el === 'fire') for (const [x, y] of around.slice(0, 2)) dotAt(x, y - f, '#ffb27a');
    if (el === 'poison') { const y = X.neck - 0.4; for (const x of [X.hx - X.mw * 0.4, X.hx + X.mw * 0.3]) if (g.filled(x, y - 1) && free(x, y + 0.6)) { g.dot(x, y + 0.5, '#c890f0'); g.dot(x, y + 1, '#c890f0'); g.dot(x + 0.5, y + 1, '#c890f0'); } }
    if (el === 'water') for (const [x, y] of around.slice(1)) { dotAt(x, y, '#a2dcf8'); dotAt(x + 0.5, y, '#a2dcf8'); dotAt(x, y - 0.5, '#ffffff'); }
    if (el === 'laser') for (const [x, y] of around.slice(0, 2)) dotAt(x, y - f, '#ff9fb8');
    if (el === 'dark') for (const [x, y] of around.slice(0, 2)) { dotAt(x, y, '#b4a8dc'); dotAt(x + 0.5, y + 0.5, '#8e80c0'); }
  }

  // ---------------- special skins: recolour by brightness (outline, eyes and mouths stay) ----------------
  // each ramp runs dark -> light; the plant's own brightness range is stretched over it, so pale plants keep their shading
  const SKIN = {
    gold: ['#b07a1e', '#cf9832', '#e8b64c', '#f8d36c', '#fff0a8'],
    crystal: ['#8eaee8', '#acc8f4', '#c8e2fb', '#e2f2ff', '#f8fcff'],
    galaxy: ['#3b3384', '#5244a8', '#6c5cc8', '#8f80e2', '#b8acf6'],
    ghost: ['#b6aedc', '#cec8ec', '#e2def6', '#f0eefc', '#fbfaff'],
    zombie: ['#7e9468', '#98ae80', '#b2c69a', '#cadab4', '#e2ecd2'],
  };
  const RBW = ['#ffadb8', '#ffcc94', '#fff09a', '#b6ecaa', '#a6dcff', '#cbb4ff'];
  const keepSkin = c => !c || c === INK || c === WHITE || c === EYE_INK || c === '#e8707e' || c === '#ffb0bc' || c === '#ffb3c2' || c[0] !== '#';
  function applySkin(g, skin, X, P) {
    const k = g.k || 1, R = SKIN[skin];
    if (skin !== 'rainbow' && !R) return;
    let lo = 1, hi = 0;
    for (let i = 0; i < g.a.length; i++) { const c = g.a[i]; if (keepSkin(c) || lum(c) < 0.25) continue; const L = lum(c); if (L < lo) lo = L; if (L > hi) hi = L; }
    const span2 = Math.max(0.18, hi - lo);
    for (let fy = 0; fy < g.fh; fy++) for (let fx = 0; fx < g.fw; fx++) {
      const c = g.fget(fx, fy); if (keepSkin(c)) continue;
      const L0 = lum(c); if (L0 < 0.25 && skin !== 'rainbow') continue; // eyes / dark holes stay
      const L = clamp((L0 - lo) / span2, 0, 1), x = fx / k, y = fy / k;
      if (skin === 'rainbow') { const band = RBW[Math.floor((y + x * 0.45) / 3.6) % RBW.length]; g.fset(fx, fy, L > 0.8 ? mixHex(band, '#ffffff', 0.5) : L < 0.3 ? mixHex(band, INK, 0.16) : band); continue; }
      let col = R[Math.max(0, Math.min(R.length - 1, Math.floor(L * R.length * 0.999)))];
      if (skin === 'crystal' && ((x - y + 64) % 9) < 1.2) col = mixHex(col, '#ffffff', 0.7); // diagonal shine streaks
      if (skin === 'galaxy' && ((x * 0.7 + y) % 13) < 3.5) col = mixHex(col, '#e8a0e8', 0.28); // pink nebula drifts
      g.fset(fx, fy, col);
    }
    const f = P && P.frame ? 1 : 0, spots = [];
    for (let y = 1; y < g.h - 1; y++) for (let x = 1; x < g.w - 1; x++) if (g.filled(x + 0.5, y + 0.5) && g.filled(x - 0.5, y + 0.5) && g.filled(x + 1.5, y + 0.5) && g.filled(x + 0.5, y - 0.5) && g.filled(x + 0.5, y + 1.5)) spots.push([x, y]);
    const thin = k > 1 ? 1 : 2.6, pick = (n, seed) => spots.filter(([x, y]) => ((x * 7 + y * 13 + seed) % Math.round(n * thin)) === 0); // (fewer on a half-size 1x plant)
    const tw = (x, y, c, big) => { g.dot(x + 0.5, y + 0.5, c); if (big && k > 1) for (const [a, b] of [[1, 0.5], [0, 0.5], [0.5, 0], [0.5, 1]]) g.dot(x + a, y + b, mixHex(c, '#ffffff', 0.4)); };
    if (skin === 'galaxy') { pick(17, f * 5).forEach(([x, y], i) => tw(x, y, '#ffffff', i % 3 === 0)); pick(29, 11 + f * 3).forEach(([x, y]) => tw(x, y, '#ffe6a0', false)); }
    if (skin === 'crystal') pick(31, f * 7).forEach(([x, y]) => tw(x, y, '#ffffff', true));
    if (skin === 'gold') pick(37, f * 9).forEach(([x, y]) => tw(x, y, '#ffffff', true));
    if (skin === 'zombie' && X) { // a pink sticky note on the forehead + a stitch, like the zombies
      const nx = X.hx - X.hr * 0.35, ny = X.top + X.hh * 0.3;
      g.poly([[nx - 1.6, ny - 1], [nx + 1.4, ny - 1.5], [nx + 1.7, ny + 1.2], [nx - 1.3, ny + 1.6]], '#ffc8d8'); g.dots([[nx - 0.6, ny], [nx, ny - 0.1], [nx + 0.5, ny - 0.2]], '#e890b0');
      const sx = X.hx + X.hr * 0.45, sy = X.hy + X.hh * 0.45; PX.stroke(g, [[sx - 1.2, sy], [sx + 1.2, sy - 0.3]], 0.22, 0.22, '#6a5a60'); for (const d of [-0.7, 0, 0.7]) PX.stroke(g, [[sx + d, sy - 0.6], [sx + d, sy + 0.4]], 0.2, 0.2, '#6a5a60');
    }
  }
  // ghost: everything (outline too) becomes see-through, fading toward the bottom like a ghost's tail; the eyes stay solid
  function ghostFade(g) {
    const k = g.k;
    for (let fy = 0; fy < g.fh; fy++) for (let fx = 0; fx < g.fw; fx++) {
      const c = g.fget(fx, fy); if (!c || c[0] !== '#' || c === EYE_INK || c === WHITE) continue;
      const y = fy / k, a = y > 27 ? 0.32 : y > 23 ? 0.5 : 0.68;
      if (c === INK) g.fset(fx, fy, `rgba(120,104,176,${a + 0.12})`); else g.fset(fx, fy, rgba(c, a));
    }
  }
  // shiny: a glossy streak across the head and twinkles round it
  function applyShiny(g, X, P) {
    const k = g.k || 1;
    for (let fy = 0; fy < g.fh; fy++) for (let fx = 0; fx < g.fw; fx++) {
      const c = g.fget(fx, fy); if (!c || c === INK || c === WHITE || c === EYE_INK || c[0] !== '#') continue;
      const x = fx / k, y = fy / k, d = (x - X.hx) + (y - X.hy) + X.hr * 0.55; if (d >= 0 && d <= 1.2 && y < X.hy) g.fset(fx, fy, mixHex(c, '#ffffff', 0.5));
    }
    const t = new Grid(32, 32), f = P && P.frame ? 1 : 0;
    for (const [x, y, r] of [[X.hx + X.mw + 1.4, X.top + 1.2, 1.6 + f * 0.4], [X.hx - X.mw - 1, X.hy + X.hh * 0.3, 1.2 + (1 - f) * 0.3]]) if (!g.get(x, y)) twinkle(t, clamp(x, 1.6, 30.4), clamp(y, 1.6, 30), r, '#fff6b0');
    t.outline(); under(g, t);
  }
  // the fusion glow: a soft coloured rim of light round the whole plant and a few twinkles that say "fused!"
  function fusionGlow(g, col, X, P) {
    haloAround(g, 0, 0, 32, 32, col, [0.62, 0.36, 0.16]);
    const f = P && P.frame ? 1 : 0, t = new Grid(32, 32);
    const spots = f ? [[X.hx + X.mw + 2.4, X.top + 0.8, 1.45], [X.hx - X.mw - 1.8, X.neck - 3, 1.15]] : [[X.hx - X.mw - 2.2, X.top + 1.6, 1.45], [X.hx + X.mw + 2.2, X.hy + X.hh * 0.35, 1.15]];
    spots.forEach(([x, y, r], i) => { const xx = clamp(x, 1.8, 30.2), yy = clamp(y, 1.8, 29.6), c = g.a[Math.floor(yy * 2) * g.fw + Math.floor(xx * 2)]; if (c && c[0] === '#') return; twinkle(t, xx, yy, r, i ? mixHex(col, '#ffffff', 0.45) : '#fff6b0'); });
    t.outline(); g.merge(t);
  }

  // how far (art px) headgear on layer t reaches down into the 1 px gap above an eye (or into the eye): only pixels coming
  // from above the eye's middle count, so collars and shells below the face don't
  function headgearOverlap(t, X) {
    const k = t.k || 1; let lift = 0;
    for (const b of X.boxes) {
      const top = b.y0 - 1, mid = (b.y0 + b.y1) / 2;
      for (let fx = Math.floor((b.x0 + 0.2) * k); fx < Math.ceil((b.x1 - 0.2) * k); fx++) for (let fy = Math.floor(top * k); fy < Math.floor(mid * k); fy++) {
        if (t.fget(fx, fy) === null) continue;
        let fy0 = fy; while (fy0 > 0 && t.fget(fx, fy0 - 1) !== null) fy0--; // the piece must hang down from above the gap
        if (fy0 / k < top - 0.1) lift = Math.max(lift, (fy + 1) / k - top);
      }
    }
    return lift > 0 ? Math.ceil(lift * 2) / 2 : 0;
  }

  // (for checking art: the measured geometry costumes use for a plant)
  function dressGeom(L, P) { const sp = PX.PLANT_ART[L.species] ? L.species : 'peashooter', stage = Math.max(0, Math.min(2, L.stage | 0)), g = new Grid(32, 32), G = PX.PLANT_ART[sp](g, stage, P || {}, pal(sp)); if (G.top == null) G.top = Math.round(G.hy - G.hr); const RG = restGeom(sp, stage); return Object.assign({ G, live: geom(g, G, sp, stage) }, shiftGeom(RG.X0, G.hx - RG.G0.hx, G.hy - RG.G0.hy), { all: eyeInfo(sp, stage).all }); }
  PX.dressGeom = dressGeom;

  // ---------------- the plant ----------------
  // Costumes are fitted once, on the plant's resting pose, and then simply follow its head. (Measuring every animation frame
  // made hats and fusion parts hop and change size from frame to frame as a plant walked or swam: the "glitching" fusions.)
  const restCache = new Map(), liftCache = new Map();
  function restGeom(sp, stage) {
    const key = sp + ':' + stage + ':' + Grid.K;
    if (!restCache.has(key)) {
      const g0 = new Grid(32, 32), G0 = PX.PLANT_ART[sp](g0, stage, {}, pal(sp)) || { hx: 16, hy: 16, hr: 5, top: 10 };
      if (G0.top == null) G0.top = Math.round(G0.hy - G0.hr);
      // (the resting plant rides along as X.body, so a costume can find the free space round it: see bodyAt)
      restCache.set(key, { G0, X0: Object.assign(geom(g0, G0, sp, stage), { body: g0, hx0: G0.hx, hy0: G0.hy }) });
    }
    return restCache.get(key);
  }
  function shiftGeom(X, dx, dy) {
    if (!dx && !dy) return X;
    const sb = b => ({ x0: b.x0 + dx, y0: b.y0 + dy, x1: b.x1 + dx, y1: b.y1 + dy });
    const boxes = X.boxes.map(sb), others = X.others.map(sb);
    const over = (b, x0, y0, x1, y1) => x0 < b.x1 + 0.3 && x1 > b.x0 - 0.3 && y0 < b.y1 + 0.3 && y1 > b.y0 - 0.3;
    return Object.assign({}, X, {
      hx: X.hx + dx, hy: X.hy + dy, top: X.top + dy, ey: X.ey + dy, eyeTop: X.eyeTop + dy, eyeBot: X.eyeBot + dy, brim: X.brim + dy, bx: X.bx + dx,
      neck: Math.min(29.5, X.neck + dy), lowEye: X.lowEye + dy, front: X.front == null ? X.front : X.front + dx,
      hat: X.hat && { x: X.hat.x + dx, y: X.hat.y + dy, w: X.hat.w }, eyes: X.eyes && X.eyes.map(e => Object.assign({}, e, { x: e.x + dx, y: e.y + dy })),
      boxes, others, hits: (x0, y0, x1, y1) => boxes.some(b => over(b, x0, y0, x1, y1)), hitsOther: (x0, y0, x1, y1) => others.some(b => over(b, x0, y0, x1, y1)),
    });
  }
  function buildPlant(L, P) {
    P = P || {};
    const sp = PX.PLANT_ART[L.species] ? L.species : 'peashooter', stage = Math.max(0, Math.min(2, L.stage | 0));
    const D = window.PSDATA;
    const fz = L.fuse || {}, F = fz.with && PLANT_PAL[fz.with] ? pal(fz.with) : null;
    const C = pal(sp, L.element, fz.with);
    const g = new Grid(32, 32);
    const G = PX.PLANT_ART[sp](g, stage, P, C) || { hx: 16, hy: 16, hr: 5, top: 10 };
    if (G.top == null) G.top = Math.round(G.hy - G.hr);
    const RG = restGeom(sp, stage);
    let X = shiftGeom(RG.X0, G.hx - RG.G0.hx, G.hy - RG.G0.hy);
    const partId = fz.with && D && D.PLANTS && D.PLANTS[fz.with] ? D.PLANTS[fz.with].part : null;
    const part = partId && PART[partId], item = fz.item && ITEM[fz.item];
    // the element's topper: big on the head, or a small floating badge at the upper front when a fusion is worn.
    // With a special-seed design (gold, crystal, galaxy...) it goes on afterwards in its own colours, so both show.
    const fused = !!(part || item), elLater = !!L.skin;
    const elAt = () => (fused ? [clamp(X.hx + X.mw + 1.4, 4, 28.2), clamp(X.top + 2.4, 7.5, 20), X.s * 0.82, false] : [X.bx, X.top + 1.6 * X.s, X.s * 1.12, true]);
    const elFx = Lx => { const [x, y, s, top] = elAt(); const behindIt = fused && X.hits(x - 3.2 * s, y - 7 * s, x + 3.2 * s, y + 1.5); EL_FX[L.element](behindIt ? { front: Lx.back, back: Lx.back, post: Lx.post } : Lx, x, y, s, P, top, elLater); };
    const dress = () => { const Lx = layers(); if (part) part.draw(Lx, X, F || C, P, C); if (item) item.draw(Lx, X, F || C, P, C); if (L.element && EL_FX[L.element] && !elLater) elFx(Lx); return Lx; };
    // how far headgear must lift to clear the eyes: worked out once per look on the resting pose, so it can't change frame to frame
    if (fused) {
      const lk = JSON.stringify(L) + ':' + Grid.K;
      let lift = liftCache.get(lk);
      if (lift == null) {
        const Xnow = X, Pnow = P; X = RG.X0; P = {}; lift = 0;
        try { for (let i = 0; i < 3; i++) { const l = headgearOverlap(dress().frontG, X); if (l <= 0) break; lift += l; X = Object.assign({}, X, { brim: X.brim - l }); } }
        finally { X = Xnow; P = Pnow; }
        liftCache.set(lk, lift); if (liftCache.size > 600) liftCache.delete(liftCache.keys().next().value);
      }
      if (lift) X = Object.assign({}, X, { brim: X.brim - lift });
    }
    const Ly = dress();
    AVOID = X.boxes; try { Ly.done(g); } finally { AVOID = null; }
    if (L.element && !elLater) elDetails(g, L.element, X, P);
    if (L.skin) applySkin(g, L.skin, X, P);
    if (L.element && elLater && EL_FX[L.element]) { const L2 = layers(); elFx(L2); L2.done(g); elDetails(g, L.element, X, P); }
    if (L.shiny) applyShiny(g, X, P);
    g.outerLine(); // the bold sticker edge round the whole plant
    if (L.skin === 'ghost') ghostFade(g);
    if (fused) fusionGlow(g, (part ? part.glow(F || C) : item.glow()) || '#fff2a0', X, P);
    return g;
  }

  // ---------------- PX.sprig dispatch ----------------
  const oldSprig = PX.sprig;
  const cache = new Map();
  // plants, zombies and Zombosses are drawn on hi-res grids (HI fine pixels per art pixel); everything else stays 1x
  const HI = 2;
  function hires(fn) { const k0 = Grid.K; Grid.K = HI; try { return fn(); } finally { Grid.K = k0; } }
  PX.hires = hires; PX.HI = HI;
  function sprig(L, P) {
    if (!L || (!L.species && !L.zombie)) return oldSprig(L, P);
    const key = JSON.stringify(L) + '|' + JSON.stringify(P || {});
    let c = cache.get(key);
    if (!c) {
      try { c = hires(() => (L.zombie ? buildZombie(L, P) : buildPlant(L, P)).canvas()); }
      catch (e) { console.error('PX.sprig', L, e); c = hires(() => buildPlant({ species: 'peashooter', stage: 0 }, {}).canvas()); }
      cache.set(key, c); if (cache.size > 900) cache.delete(cache.keys().next().value);
    }
    return c;
  }
  function buildZombie(L, P) {
    const g = new Grid(32, 32), fn = PX.ZOMBIE_ART && (PX.ZOMBIE_ART[L.zombie] || PX.ZOMBIE_ART.basic);
    if (fn) fn(g, P || {}, L); else { g.ell(16, 20, 6, 9, ['#c8d8a8', '#8fa872', '#5a6e48']); g.outline(); }
    if (L.skin) applySkin(g, L.skin);
    g.outerLine();
    return g;
  }

  PX.PLANT_ART = PX.PLANT_ART || {};
  PX.ZOMBIE_ART = PX.ZOMBIE_ART || {};
  PX.PLANT_PAL = PLANT_PAL;
  PX.EL_PAL = EL_PAL;
  PX.sprig = sprig;
  PX.buildPlant = buildPlant;
  PX.buildZombie = buildZombie;
  PX.mixHex = mixHex;
  PX.piece = piece;
  PX.SKIN_LIST = Object.keys(SKIN).concat(['rainbow']);
  PX.PART_IDS = Object.keys(PART);
  PX.ITEM_FX_IDS = Object.keys(ITEM);
  PX.art = { face, madFace, mouth, feet, shroomFoot, armyHelmet, armyHelmetDetails, chibiEyes, chibiMouth, blush, softBody, EYE_INK, leaf, baseLeaves, stemTo, pal, piece, under, mixHex, lum, LEAF, hatAt };
})();

// ---------------- PVZ Garden items, element sprites, Zomboss sprites and props (wraps pixel.js PX.item / critter / prop) ----------------
// item kinds added here:
//   'egg' <kind>:<species>  a 22x28 seed packet (the plant's head in the window; special packets are coloured)
//   'element' <type>        7x7 type icon (art-world.js ELEMENT_ICON)   'core' / 'shard' <element>  13x13 orb / 9x9 shard
//   'fitem' <itemId>        16x16 fusion item icon                       'fruit' melon | plantfood  (new fruit)
//   'plant' <species>       16x16 head icon of a species (stage 0)
// critter ids added: 'el:<element>' (18x18, 3 frames: art-world.js ELEMENT_SPRITE) and Zomboss ids (48x48, 2 frames: BOSS_ART).
(function () {
  'use strict';
  const { Grid, INK } = PX;
  const oldItem = PX.item, oldCritter = PX.critter, oldFrames = PX.critterFrames, oldProp = PX.prop;
  function crop(g, w, h, align) { // copy the filled box of g into w x h (centred; align 'top' keeps the top rows), fine pixels and all
    const k = g.k || 1; let x0 = g.w, y0 = g.h, x1 = -1, y1 = -1;
    for (let fy = 0; fy < g.fh; fy++) for (let fx = 0; fx < g.fw; fx++) if (g.fget(fx, fy)) { const x = Math.floor(fx / k), y = Math.floor(fy / k); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const o = new Grid(w, h, k); if (x1 < 0) return o;
    const ox = Math.floor((w - (x1 - x0 + 1)) / 2) - x0, oy = align === 'top' ? -y0 + (h > y1 - y0 + 1 ? Math.floor((h - (y1 - y0 + 1)) / 2) : 0) : Math.floor((h - (y1 - y0 + 1)) / 2) - y0;
    for (let fy = y0 * k; fy < (y1 + 1) * k; fy++) for (let fx = x0 * k; fx < (x1 + 1) * k; fx++) { const c = g.fget(fx, fy); if (c) o.fset(fx + ox * k, fy + oy * k, c); }
    return o;
  }
  const A = PX.art, soft = A.softBody, flat = R => [R[1], R[1], R[2]];
  // a rounded rectangle (fine-pixel exact), for cards and labels
  function rrect(t, x, y, w, h, r, col) {
    const k = t.k || 1;
    for (let fy = Math.floor(y * k); fy < Math.ceil((y + h) * k); fy++) for (let fx = Math.floor(x * k); fx < Math.ceil((x + w) * k); fx++) {
      const px = (fx + 0.5) / k, py = (fy + 0.5) / k, cx = Math.min(Math.max(px, x + r), x + w - r), cy = Math.min(Math.max(py, y + r), y + h - r);
      if ((px - cx) ** 2 + (py - cy) ** 2 <= r * r) t.fset(fx, fy, typeof col === 'function' ? col(px, py) : col);
    }
  }
  // the whole plant at half size (built on a 1x grid, so each art pixel becomes one fine pixel), trimmed to what's drawn
  function miniPlant(L, P) {
    const k0 = Grid.K; let p;
    Grid.K = 1; try { p = PX.buildPlant(L, P || {}); } finally { Grid.K = k0; }
    let x0 = 99, y0 = 99, x1 = -1, y1 = -1;
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.a[y * p.w + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return { p, x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }
  // paste a mini plant into g (a 2x grid) so its fine-pixel box is centred on fine column fcx with its bottom on fine row fbot
  function pasteMini(g, m, fcx, fbot, clip) {
    if (m.x1 < 0) return;
    const ox = Math.round(fcx - m.w / 2) - m.x0, oy = fbot - m.y1;
    for (let y = m.y0; y <= m.y1; y++) for (let x = m.x0; x <= m.x1; x++) { const c = m.p.a[y * m.p.w + x]; if (!c) continue; const fx = x + ox, fy = y + oy; if (clip && !clip(fx, fy)) continue; g.fset(fx, fy, c); }
  }

  // ---------------- seed packets: soft pastel cards like a cute seed bar ----------------
  // card: [light, mid, shade]; band: the top band (null = rainbow stripes); sky: the window; ink: label marks
  const PACK = {
    normal: { card: ['#fffcf2', '#fdf2d8', '#ead6aa'], band: ['#dcf6c4', '#b4e698', '#8cc874'], sky: '#eef9ff', grass: ['#d4f4b4', '#b2e290', '#90c874'] },
    golden: { card: ['#fffbe0', '#fff0b4', '#f2cc72'], band: ['#fff4c0', '#ffe07a', '#f2b850'], sky: '#fffbe8', grass: ['#fff0b0', '#ffe08a', '#f2c060'] },
    rainbow: { card: ['#fffafd', '#fdeef6', '#ecc8dc'], band: null, sky: '#f8f4ff', grass: ['#d4f4b4', '#b2e290', '#90c874'] },
    crystal: { card: ['#f8fdff', '#e2f4fd', '#b4d8f2'], band: ['#eef8ff', '#c6e6fa', '#9ccaee'], sky: '#f6fcff', grass: ['#e2f4ff', '#c4e4fa', '#a0cef0'] },
    galaxy: { card: ['#8a7ce0', '#6656c4', '#4a3c9e'], band: ['#d4a8f0', '#b484e2', '#9064c8'], sky: '#3e3390', grass: ['#7c6cd8', '#6252c0', '#4a3ca4'] },
    ghost: { card: ['#fcfbff', '#efecfb', '#d0c8ee'], band: ['#e6e0fa', '#d2c8f4', '#b4a8e2'], sky: '#fbfaff', grass: ['#e6e0fa', '#d2c8f4', '#b4a8e2'] },
    zombie: { card: ['#f2f6e6', '#e2ecd0', '#bccca2'], band: ['#cadab4', '#b2c69a', '#94ac7c'], sky: '#f4f8ea', grass: ['#cadab4', '#b2c69a', '#94ac7c'] },
  };
  const RBW = ['#ffb4bf', '#ffd09c', '#fff0a0', '#bdeeb0', '#aee0ff', '#d0baff'];
  function seedPacket(id) {
    const [kind, species] = String(id || 'normal').split(':'), S = PACK[kind] || PACK.normal, seed = (window.PSDATA && window.PSDATA.SEEDS[kind]) || {};
    const g = new Grid(22, 28);
    // the card (rounded, a soft shade down the right and along the bottom, a light edge at the top left)
    PX.piece(g, t => rrect(t, 1, 1, 20, 26, 2.6, (x, y) => (x > 18.6 || y > 25 ? S.card[2] : x < 2.4 || y < 2 ? S.card[0] : S.card[1])));
    // the top band with a scalloped bottom edge
    PX.piece(g, t => {
      rrect(t, 1.5, 1.5, 19, 4.4, 2.1, (x, y) => (S.band ? (y > 4.8 ? S.band[2] : y < 2.4 ? S.band[0] : S.band[1]) : RBW[Math.floor((x + y * 0.6) / 2.6) % 6]));
      for (let i = 0; i < 6; i++) t.ell(3.4 + i * 3.04, 5.9, 1.55, 1.05, S.band ? S.band[1] : RBW[i], 0, (x, y) => y >= 5.5);
    });
    // the window: sky with a little grass hill, the plant standing in it
    PX.piece(g, t => rrect(t, 3, 7.6, 16, 13, 1.8, S.sky));
    g.ell(11, 21.6, 9.2, 3, flat(S.grass), 0, (x, y) => g.filled(x, y));
    const k = g.k;
    const inWin = (fx, fy) => { const x = (fx + 0.5) / k, y = (fy + 0.5) / k; return x > 3.15 && x < 18.85 && y > 7.75 && y < 20.45; };
    if (window.PSDATA && window.PSDATA.PLANTS[species]) {
      const L = { species, stage: 0 }; if (seed.skin) L.skin = seed.skin;
      pasteMini(g, miniPlant(L, { eyes: 'happy', mouth: 'open' }), 11 * k, Math.round(20.2 * k), inWin);
    } else { // a seed with a sprout
      PX.piece(g, t => { soft(t, 11, 16.6, 2.8, 2.2, ['#ecc8a0', '#d4a478', '#b07c54']); t.ell(9.4, 12.4, 1.7, 0.9, flat(['#d4f4b4', '#a8e08c', '#7cc068']), 0.5); t.ell(12.6, 12, 1.7, 0.9, flat(['#d4f4b4', '#a8e08c', '#7cc068']), -0.5); });
      PX.stroke(g, [[11, 14.6], [11, 12.4]], 0.4, 0.4, '#7cc068');
      g.dots([[10.2, 16.4], [11.8, 16.4]], A.EYE_INK || INK);
    }
    // the label: a white pill with a little smiling sun (the cost) and soft text marks
    PX.piece(g, t => rrect(t, 3, 21.8, 16, 3.6, 1.8, '#ffffff'));
    PX.piece(g, t => { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; t.ell(5.6 + Math.cos(a) * 1.55, 23.6 + Math.sin(a) * 1.55, 0.55, 0.55, '#ffc85a'); } t.ell(5.6, 23.6, 1.3, 1.3, '#ffe27a'); });
    g.dots([[5.1, 23.4], [6.1, 23.4]], A.EYE_INK || INK); g.dot(5.6, 24.1, '#e8707e');
    for (const [x, w] of [[8.6, 3.4], [12.6, 2.2], [15.4, 1.6]]) rrect(g, x, 23.2, w, 0.9, 0.45, S.card[2]);
    // sparkle for the fancy packets
    const tw = (x, y, c) => { g.dot(x, y, c); g.dot(x + 0.5, y, c); g.dot(x - 0.5, y, c); g.dot(x, y + 0.5, c); g.dot(x, y - 0.5, c); };
    if (kind === 'galaxy') { for (const [x, y] of [[4.6, 9.4], [16.6, 10.4], [15, 18.4], [5.4, 17.6]]) tw(x, y, '#ffffff'); g.dots([[9, 9], [13.4, 8.6], [7.4, 13.6]], '#fff0b0'); }
    if (kind === 'golden' || kind === 'crystal') for (const [x, y] of [[17.6, 3.2], [4.6, 9.6], [16.8, 18.6]]) tw(x, y, '#ffffff');
    if (kind === 'ghost') for (const [x, y] of [[4.8, 9.6], [17, 11]]) tw(x, y, '#d2c8f4');
    if (kind === 'zombie') { g.poly([[15.6, 8.6], [18.4, 8.2], [18.6, 10.6], [15.8, 11]], '#ffc8d8'); g.dots([[16.4, 9.6], [17, 9.5], [17.6, 9.4]], '#e890b0'); }
    g.outerLine();
    return g;
  }
  // new fruit icons (13 x 13): a smiling watermelon slice and a glowing Plant Food leaf
  const FRUIT2 = {
    melon(g) {
      PX.piece(g, t => { t.ell(6.5, 4.2, 6, 6, '#bfe8a0', 0, (x, y) => y >= 4.2); });
      PX.piece(g, t => { t.ell(6.5, 4.2, 4.9, 4.9, '#ffffff', 0, (x, y) => y >= 4.2); t.ell(6.5, 4.2, 4.3, 4.3, '#ffa4b0', 0, (x, y) => y >= 4.2); });
      g.ell(6.5, 4.2, 4.3, 4.3, '#f48a9a', 0, (x, y) => y >= 7.2 && g.get(x, y) === '#ffa4b0');
      g.dots([[3.6, 5.6], [9.4, 5.6], [5, 8], [8, 8]], '#5a4048');
      A.chibiEyes(g, 6.6, 5.6, { sp: 2.4, w: 0.9, h: 1.2 }); g.dot(6.6, 6.8, A.EYE_INK || INK);
      g.dots([[2.4, 4.8], [3, 4.8]], '#ffffff');
      g.outerLine();
    },
    plantfood(g) {
      PX.piece(g, t => soft(t, 6.5, 6.8, 5, 5, ['#e8ffcc', '#b4ec84', '#86cc5c']));
      PX.piece(g, t => { t.ell(6.5, 6.6, 1.9, 3.2, flat(['#f4ffe0', '#ffffff', '#e2f6c8']), 0.6); });
      PX.stroke(g, [[5.4, 8.4], [7.6, 4.8]], 0.22, 0.22, '#86cc5c');
      g.outerLine();
      for (const [x, y] of [[1, 2.2], [11.8, 3.4], [11.4, 11.4], [1.2, 10.4]]) { g.dot(x, y, '#d4ffa8'); g.dot(x + 0.5, y, '#ffffff'); }
    },
  };
  // A shard is a tiny, cute version of the element sprite that dropped it (a water droplet, a flame, an ice cube...).
  // Three of the same make a core.
  //   'shard' <el>      one shard, 11x11 (garden drops, prizes, lists)
  //   'shard' <el>:<n>  the three a core needs in a little triangle, n filled in and the rest dotted (the garden tray)
  const SHARD_ART = (() => {
    const eyes = (g, x, y, col) => { const e = col || A.EYE_INK || INK; for (const dx of [-1.25, 1.25]) { g.ell(x + dx, y, 0.55, 0.75, e); g.dot(x + dx - 0.25, y - 0.4, '#ffffff'); } };
    const cheeks = (g, x, y) => { for (const dx of [-2.3, 2.3]) g.ell(x + dx, y, 0.6, 0.35, '#ffb3c2', 0, (xx, yy) => g.filled(xx, yy)); };
    const tear = (t, cx, cy, r, h, col) => { soft(t, cx, cy, r, r * 0.95, col); t.poly([[cx - r * 0.86, cy - r * 0.4], [cx, cy - h], [cx + r * 0.86, cy - r * 0.4]], col[1]); };
    return {
      water(g) { PX.piece(g, t => tear(t, 5.5, 6.6, 3.5, 6, ['#e8fbff', '#a2dcf8', '#6cb6e6'])); eyes(g, 5.6, 6.8); cheeks(g, 5.6, 8.1); g.dots([[3.6, 5.4], [3.6, 5.9]], '#ffffff'); },
      fire(g) {
        PX.piece(g, t => { tear(t, 5.5, 6.8, 3.4, 6.4, ['#ffd8c4', '#ffa48c', '#f2826c']); t.poly([[7.6, 5.8], [9.4, 2.2], [8.6, 6.6]], '#ffa48c'); });
        g.ell(5.5, 7.4, 2.2, 2, '#ffd27a', 0, (x, y) => g.filled(x, y)); eyes(g, 5.6, 7); cheeks(g, 5.6, 8.3);
      },
      ice(g) { PX.piece(g, t => rrect(t, 1.8, 2, 7.4, 7.2, 1.8, (x, y) => (x > 7.8 || y > 7.9 ? '#a2d4f2' : '#d8f2ff'))); g.dots([[3, 3.2], [3.5, 3.2], [3, 3.7], [4, 3.2]], '#ffffff'); eyes(g, 5.5, 5.9); cheeks(g, 5.5, 7.2); },
      electric(g) { PX.piece(g, t => { soft(t, 5.5, 6.4, 3.6, 3.4, ['#fffcd0', '#fff08a', '#f2c95a']); t.poly([[4.4, 3.6], [5.6, 0.6], [5.4, 2.6], [7, 2.2], [5.8, 4.4]], '#fff08a'); }); eyes(g, 5.6, 6.6); cheeks(g, 5.6, 7.9); },
      laser(g) { PX.piece(g, t => t.poly([[5.5, 1], [9.4, 4.8], [5.5, 10], [1.6, 4.8]], '#ffa8c0')); g.poly([[5.5, 1.8], [8, 4.6], [5.5, 4.6], [3, 4.6]], '#ffd4e0'); eyes(g, 5.5, 6.2); },
      poison(g) { PX.piece(g, t => { soft(t, 5.4, 6.4, 3.6, 3.3, ['#f2dcff', '#d2aaf6', '#ac80dc']); soft(t, 8.4, 2.6, 1.4, 1.4, ['#f2dcff', '#d2aaf6', '#ac80dc']); }); g.dot(3.6, 4.8, '#ffffff'); g.dot(7.9, 2.1, '#ffffff'); eyes(g, 5.4, 6.6); cheeks(g, 5.4, 7.9); },
      magic(g) { PX.piece(g, t => t.poly(PX.starPts(5.5, 5.9, 4.8, 2.3, 5), '#ffc4ec')); eyes(g, 5.5, 6.4); g.dot(5.5, 3.2, '#ffffff'); },
      dark(g) { PX.piece(g, t => { soft(t, 5.5, 5.2, 3.6, 3.4, ['#c4b8e2', '#a294c8', '#7a6ca8']); t.poly([[1.9, 5.2], [9.1, 5.2], [9.1, 9.4], [7.3, 8.4], [5.5, 9.6], [3.7, 8.4], [1.9, 9.4]], '#a294c8'); }); eyes(g, 5.6, 5.6, '#fff2a0'); },
      rock(g) { PX.piece(g, t => soft(t, 5.5, 6.6, 4.1, 3.2, ['#f2ece2', '#d4cab8', '#ac9e8e'])); PX.piece(g, t => { t.ell(4.6, 2.6, 1.3, 0.65, flat(['#c8f0a0', '#9ed86a', '#7cb850']), 0.5); t.ell(6.6, 2.4, 1.3, 0.65, flat(['#c8f0a0', '#9ed86a', '#7cb850']), -0.5); }); eyes(g, 5.6, 6.8); cheeks(g, 5.6, 8); },
      robot(g) { PX.piece(g, t => { PX.stroke(t, [[5.5, 3.6], [5.5, 1.6]], 0.3, 0.3, '#a4b0c8'); rrect(t, 2, 3.6, 7, 5.8, 1.6, (x, y) => (x > 7.6 || y > 8.2 ? '#a4b0c8' : '#e2e8f2')); }); PX.piece(g, t => t.ell(5.5, 1.3, 0.9, 0.9, '#ffd860')); eyes(g, 5.5, 6.2, '#6cc4e8'); g.dots([[4.6, 8.1], [5.1, 8.1], [5.6, 8.1], [6.1, 8.1]], '#a4b0c8'); },
      normal(g) { PX.piece(g, t => { const C = ['#fffcf4', '#f6eddc', '#dccdb2']; soft(t, 3.8, 6.8, 2.7, 2.4, C); soft(t, 7.2, 6.8, 2.7, 2.4, C); soft(t, 5.5, 4.8, 3, 2.7, C); }); eyes(g, 5.5, 6); cheeks(g, 5.5, 7.3); },
    };
  })();
  function oneShard(el) {
    const g = new Grid(11, 11);
    if (SHARD_ART[el]) SHARD_ART[el](g); else { const E = window.PSDATA && window.PSDATA.ELEMENTS[el]; PX.piece(g, t => t.poly([[5.5, 1], [9, 5.5], [5.5, 10], [2, 5.5]], E ? E.color : '#c8ccd8')); }
    g.outerLine();
    return g;
  }
  function shardGrid(id) {
    const [el, nStr] = String(id).split(':');
    if (nStr == null) return oneShard(el);
    const have = Math.max(0, Math.min(3, +nStr || 0)), one = oneShard(el), g = new Grid(19, 19), k = g.k;
    // order filled in: bottom left, bottom right, top; the ones still to catch are a soft dotted ghost
    [[4, 0, 2], [0, 8, 0], [8, 8, 1]].forEach(([ox, oy, n]) => {
      for (let fy = 0; fy < one.fh; fy++) for (let fx = 0; fx < one.fw; fx++) {
        const c = one.fget(fx, fy); if (c === null) continue;
        const tx = fx + ox * k, ty = fy + oy * k;
        if (n < have) g.fset(tx, ty, c);
        else if (g.fget(tx, ty) === null || /^rgba/.test(g.fget(tx, ty))) g.fset(tx, ty, c === INK ? ((fx + fy) % 3 ? null : 'rgba(58,45,52,0.5)') : 'rgba(58,45,52,0.12)');
      }
    });
    return g;
  }
  const itemCache = {};
  PX.item = function (kind, id) {
    const key = kind + ':' + id; if (itemCache[key]) return itemCache[key];
    let g = null;
    try {
      if (kind === 'egg' || kind === 'seed') g = seedPacket(id);
      else if (kind === 'element') { g = new Grid(7, 7); if (PX.ELEMENT_ICON && PX.ELEMENT_ICON[id]) PX.ELEMENT_ICON[id](g); else { const E = window.PSDATA && window.PSDATA.ELEMENTS[id]; g.ell(3.5, 3.5, 2.6, 2.6, E ? E.color : '#8c93a8'); g.outline(); } }
      else if (kind === 'core') { g = new Grid(13, 13); if (PX.ELEMENT_CORE) PX.ELEMENT_CORE(g, id); else { const E = window.PSDATA && window.PSDATA.ELEMENTS[id]; g.ell(6.5, 6.5, 5, 5, E ? E.color : '#8c93a8'); g.outline(); } }
      else if (kind === 'shard') g = shardGrid(id);
      else if (kind === 'fitem') { g = new Grid(16, 16); if (PX.FUSION_ICON && PX.FUSION_ICON[id]) PX.FUSION_ICON[id](g); else { g.ell(8, 8, 6, 6, ['#fff27a', '#f6c83a', '#c7861c']); g.outline(); } }
      else if (kind === 'fruit' && FRUIT2[id]) { g = new Grid(13, 13); FRUIT2[id](g); }
      else if (kind === 'plant') { g = new Grid(16, 16); pasteMini(g, miniPlant({ species: id, stage: 0 }, {}), 16, 31); } // the whole little plant, half size
    } catch (e) { console.error('PX.item', kind, id, e); g = null; }
    if (!g) return oldItem(kind, id);
    return (itemCache[key] = g.canvas());
  };
  // element sprites (critter id 'el:fire') and Zomboss sprites
  const crCache = {};
  const isEl = id => typeof id === 'string' && id.slice(0, 3) === 'el:';
  PX.critter = function (kind, frame) {
    const B = PX.BOSS_ART && PX.BOSS_ART[kind];
    if (!isEl(kind) && !B) return oldCritter(kind, frame);
    const f = isEl(kind) ? (frame > 0 && frame < 3 ? frame | 0 : 0) : (frame ? 1 : 0), key = kind + ':' + f;
    if (crCache[key]) return crCache[key];
    let g;
    try {
      if (B) { g = PX.hires(() => { const b = new Grid(B.w || 48, B.h || 48); B.draw(b, f); b.outerLine(); return b; }); }
      else { g = new Grid(18, 18); const fn = PX.ELEMENT_SPRITE && PX.ELEMENT_SPRITE[kind.slice(3)]; if (fn) fn(g, f); else { const E = window.PSDATA && window.PSDATA.ELEMENTS[kind.slice(3)]; g.ell(9, 10, 5, 5, E ? E.color : '#8c93a8'); g.outline(); g.px([[8, 9], [11, 9]], INK); } }
    } catch (e) { console.error('PX.critter', kind, e); g = new Grid(18, 18); g.ell(9, 10, 5, 5, '#8c93a8'); g.outline(); }
    return (crCache[key] = g.canvas());
  };
  PX.critterFrames = kind => (isEl(kind) ? 3 : PX.BOSS_ART && PX.BOSS_ART[kind] ? 2 : oldFrames(kind));
  // garden props from art-world.js (PVZ_PROP / PVZ_HOME); anything else falls back to pixel.js
  const propCache = {};
  PX.prop = function (kind, theme) {
    const P = (PX.PVZ_PROP && PX.PVZ_PROP[kind]) || (PX.PVZ_HOME && PX.PVZ_HOME[kind]);
    if (!P) return oldProp(kind, theme);
    const key = kind + (theme || 'day'); if (propCache[key]) return propCache[key];
    let c;
    try { const g = new Grid(P.w, P.h); P.draw(g, theme || 'day'); c = g.canvas(); } catch (e) { console.error('PX.prop', kind, e); c = oldProp('rock', theme); }
    return (propCache[key] = c);
  };
  PX.homeInfo = kind => (PX.PVZ_HOME && PX.PVZ_HOME[kind]) || (PX.HOMES && PX.HOMES[kind]) || null;
  PX.crop = crop;

  // ---------------- the garden's house (top-left corner of each yard), 74 x 70, front facing the player ----------------
  // PX.pvzHouse(F) -> canvas with .meta = { door: [x, y], win: [[x, y]...] } (pixel positions in the canvas).
  // F (from garden.js TH[area].facade): kind 'house' | 'cabin' | 'temple', wall/roof ramps, trim, glass, door, porch, found.
  // A soft toy house: rounded chunky shapes, flat pastel fills with one soft shade, a bold sticker outline.
  const houseCache = {};
  PX.pvzHouse = function (F) {
    const key = JSON.stringify(F); if (houseCache[key]) return houseCache[key];
    const W = 74, H = 70, g = new Grid(W, H), P = draw => PX.piece(g, draw), win = [];
    const pa = c => PX.mixHex(c, '#ffffff', 0.16), R3 = R => R.map(pa); // everything a little softer and lighter
    const wall = R3(F.wall), roof = R3(F.roof), trim = pa(F.trim), door = R3(F.door), porch = R3(F.porch), found = R3(F.found), lit = !!F.lit;
    const glass = lit ? '#ffe9a0' : pa(F.glass), line = (pts, c, r) => PX.stroke(g, pts, r || 0.32, r || 0.32, c);
    const shine = (x, y) => { if (!lit) { g.dots([[x, y], [x + 0.5, y], [x, y + 0.5], [x + 1, y], [x, y + 1]], '#ffffff'); } };
    // a rounded window: trim frame, glass, cross bars, a shine
    const pane = (x, y, w, h, r) => {
      P(t => rrect(t, x, y, w, h, r, trim));
      P(t => rrect(t, x + 1.4, y + 1.4, w - 2.8, h - 2.8, Math.max(0.6, r - 1), glass));
      line([[x + w / 2, y + 1.6], [x + w / 2, y + h - 1.6]], trim, 0.45); line([[x + 1.6, y + h / 2], [x + w - 1.6, y + h / 2]], trim, 0.45);
      shine(x + 2.4, y + 2.4); win.push([Math.round(x + w / 2), Math.round(y + h / 2)]);
    };
    const porthole = (cx, cy, r) => { P(t => soft(t, cx, cy, r, r, [PX.mixHex(trim, '#ffffff', 0.3), trim, PX.mixHex(trim, '#000000', 0.12)])); P(t => t.ell(cx, cy, r - 1.6, r - 1.6, glass)); shine(cx - r * 0.4, cy - r * 0.4); win.push([Math.round(cx), Math.round(cy)]); };
    const steps = (y) => { P(t => rrect(t, 27, y, 20, 2.6, 1.2, porch[0])); P(t => rrect(t, 25, y + 2, 24, 2.4, 1.2, porch[1])); };
    let doorAt;
    if (F.kind === 'temple') {
      // a sandstone temple: rounded blocks, a painted cornice, fat columns, a dark arched doorway with a winged sun
      for (let x = 4; x < 70; x += 7) P(t => rrect(t, x, 8.5, 5, 5, 1.6, wall[0]));
      P(t => rrect(t, 4, 26, 66, 41, 2.4, (x, y) => (x > 67 || y > 64.5 ? wall[2] : wall[1])));
      for (let y = 31; y < 64; y += 5.5) line([[5.5, y], [68.5, y]], PX.mixHex(wall[1], wall[2], 0.55), 0.22);
      P(t => { rrect(t, 1, 13, 72, 14, 2.6, roof[0]); });
      for (const [y, c] of [[16.2, roof[1]], [20.2, '#ffffff'], [23.6, roof[2]]]) for (let x = 3; x < 71; x += c === '#ffffff' ? 5 : 1) { if (c === '#ffffff') rrect(g, x, y - 0.6, 2.6, 1.2, 0.6, c); else line([[x, y], [x + 1, y]], c, 0.7); }
      for (const cx of [20.5, 49.5]) { P(t => rrect(t, cx - 3, 31, 6, 36, 2, (x) => (x > cx + 1.6 ? wall[2] : wall[0]))); P(t => soft(t, cx, 30, 4.6, 2.4, [roof[0], roof[1], PX.mixHex(roof[1], '#000000', 0.12)])); }
      P(t => { rrect(t, 28, 38, 18, 30, 2, door[1]); t.ell(37, 39.5, 9, 5, door[1], 0, (x, y) => y < 40); });
      P(t => rrect(t, 26.5, 33.2, 21, 4.2, 1.8, trim));
      P(t => soft(t, 37, 35.3, 2.2, 1.6, ['#fff6c4', '#ffdc72', '#eaae46'])); for (const s of [-1, 1]) { line([[37 + s * 2.8, 35], [37 + s * 6.4, 34.4]], roof[1], 0.55); line([[37 + s * 2.8, 36], [37 + s * 5.6, 36.2]], roof[1], 0.45); }
      for (const px of [8, 56]) { P(t => rrect(t, px, 34, 10, 20, 2, PX.mixHex(wall[0], '#ffffff', 0.4))); const c = roof[1];
        if (px === 8) { g.ell(px + 5, 39, 1.6, 1.8, c); g.ell(px + 5, 39, 0.8, 1, PX.mixHex(wall[0], '#ffffff', 0.4)); line([[px + 2.6, 41.4], [px + 7.4, 41.4]], c, 0.5); line([[px + 5, 41], [px + 5, 49]], c, 0.55); }
        else { g.ell(px + 5, 43, 3, 1.7, c); g.ell(px + 5, 43, 2, 1.1, '#ffffff'); g.ell(px + 5.3, 43, 0.9, 0.9, '#4a3a40'); line([[px + 4, 45], [px + 3.4, 47.6]], c, 0.4); } }
      win.push([37, 46]);
      doorAt = [37, 67];
      steps(65.2);
    } else {
      const cabin = F.kind === 'cabin';
      // behind the roof: a mast with a little flag (cabin) or a round brick chimney with a puff of smoke (house)
      if (cabin) { P(t => rrect(t, 50.6, 0.4, 2.4, 22, 1.2, '#b88a5c')); P(t => t.poly([[53, 1.4], [63.6, 4.2], [53, 8.4]], '#8e80ae')); g.ell(56.6, 4.6, 1.3, 1.2, '#ffffff'); g.dots([[56.1, 4.5], [57.1, 4.5]], '#8e80ae'); }
      else {
        P(t => rrect(t, 48, 4, 9, 16, 1.6, (x) => (x > 55 ? PX.mixHex('#e8908a', '#000000', 0.08) : '#e8908a')));
        for (let y = 7.5; y < 18; y += 3.5) line([[48.6, y], [56.4, y]], '#cc7672', 0.22);
        P(t => rrect(t, 46.6, 2, 11.8, 3.6, 1.6, '#d8d8e2'));
      }
      // the front wall: soft boards (house) or chunky vertical planks (cabin)
      P(t => rrect(t, 6, 36, 62, 31, 2, (x, y) => (x > 66 || y > 64.5 ? wall[2] : x < 7.6 ? wall[0] : wall[1])));
      if (cabin) for (let x = 11; x < 66; x += 5) line([[x, 37.6], [x, 62.6]], PX.mixHex(wall[1], wall[2], 0.6), 0.25);
      else for (let y = 40.5; y < 63; y += 4) line([[7.4, y], [66.6, y]], PX.mixHex(wall[1], wall[2], 0.45), 0.2);
      // the roof: a chunky rounded shape with soft scalloped shingles (dark planks on the cabin) and a ridge cap
      P(t => { t.poly([[1.5, 39.5], [72.5, 39.5], [61, 10.5], [13, 10.5]], roof[1]); t.ell(13.6, 11.6, 2, 1.6, roof[1]); t.ell(60.4, 11.6, 2, 1.6, roof[1]); });
      for (let row = 0, y = 15; y < 38; y += 4.6, row++) {
        const x0 = 13 - (y - 10.5) * 0.4, x1 = 61 + (y - 10.5) * 0.4;
        if (cabin) { line([[x0 + 0.6, y], [x1 - 0.6, y]], roof[2], 0.25); for (let x = x0 + (row % 2 ? 4 : 1.5); x < x1 - 1; x += 7) line([[x, y - 4.2], [x, y]], roof[2], 0.22); continue; }
        for (let x = x0 + (row % 2 ? 3 : 0); x < x1 - 1.5; x += 6) for (let a = 0.15; a < Math.PI - 0.15; a += 0.2) { const dx = x + 3 + Math.cos(a) * 3, dy = y - 0.3 + Math.sin(a) * 1.5; if (g.filled(dx, dy)) g.dot(dx, dy, roof[2]); }
      }
      P(t => rrect(t, 0, 36.4, 74, 4.6, 2.3, roof[2]));
      P(t => rrect(t, 11.4, 8.2, 51.2, 4.2, 2.1, roof[0]));
      // a dormer with a round window (house) / a round attic port (cabin)
      if (!cabin) { P(t => rrect(t, 29, 18.6, 14, 13.4, 2.2, wall[1])); P(t => { t.poly([[26.4, 21.4], [45.6, 21.4], [36, 13.6]], roof[2]); t.ell(36, 14.4, 1.6, 1.2, roof[2]); }); porthole(36, 25.6, 4.2); }
      else porthole(36, 24.6, 4.8);
      // windows either side of the door, with shutters and flower boxes (portholes on the cabin)
      for (const wx of [11, 50]) {
        if (cabin) { porthole(wx + 6.5, 49, 5.6); continue; }
        if (F.shutter) { const sh = pa(F.shutter); P(t => { rrect(t, wx - 3, 42.6, 2.8, 13.4, 1.2, sh); rrect(t, wx + 13.2, 42.6, 2.8, 13.4, 1.2, sh); }); }
        pane(wx, 42.6, 13, 13.4, 2.6);
        if (F.box) { P(t => rrect(t, wx - 1, 55.6, 15, 3.2, 1.2, '#d8a87c')); for (let i = 0; i < 5; i++) P(t => { const c = ['#ffb4c2', '#fff0a0', '#ffc8dc', '#ffffff', '#ffb4c2'][i]; t.ell(wx + 1 + i * 2.8, 55, 1.2, 1.1, c); }); }
      }
      // stone foundation
      P(t => rrect(t, 6, 62.4, 62, 4.6, 1.6, found[0]));
      for (let x = 8; x < 66; x += 6) g.ell(x + 2.4, 64.6, 2.2, 1.3, found[1], 0, (xx, yy) => g.filled(xx, yy));
      // the front door: an arched door with a round window, a little roof over it, a porch lamp and steps
      P(t => { rrect(t, 30, 47, 14, 20, 1.2, door[0]); t.ell(37, 47.6, 7, 4.4, door[0], 0, (x, y) => y < 48); });
      if (F.glassDoor) { P(t => rrect(t, 32, 48, 10, 17, 1.4, glass)); line([[37, 48.6], [37, 64.4]], trim, 0.4); }
      else if (cabin) { for (const yy of [50.5, 61]) line([[31, yy], [43, yy]], '#8a8494', 0.45); for (const xx of [34.5, 39.5]) line([[xx, 46], [xx, 66]], door[1], 0.25); }
      else { P(t => rrect(t, 32.2, 55, 4, 9.4, 1, door[1])); P(t => rrect(t, 37.8, 55, 4, 9.4, 1, door[1])); P(t => t.ell(37, 48.6, 2.8, 2.8, trim)); g.ell(37, 48.6, 1.8, 1.8, glass); shine(36, 47.6); }
      P(t => soft(t, 41.4, 58.6, 0.8, 0.8, ['#fff6c4', '#ffdc72', '#eaae46']));
      P(t => { t.poly([[27.4, 43.6], [46.6, 43.6], [43.6, 39.4], [30.4, 39.4]], roof[2]); });
      P(t => rrect(t, 47.2, 46.2, 3.6, 4.6, 1.4, '#ffe27a')); P(t => rrect(t, 47, 45, 4, 1.4, 0.7, '#b8b8c8')); win.push([49, 48]);
      steps(66.4);
      doorAt = [37, 69];
    }
    g.outerLine();
    const c = g.canvas(); c.meta = { door: doorAt, win };
    return (houseCache[key] = c);
  };
})();
