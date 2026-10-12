// art-fish2.js — PVZ Garden: My Aquarium fish, batch 2 (batch 1 is art-fish.js). Registers in PX.FISH_ART (art-aqua.js):
//   puffer (+ 'puffer:puffed', the spiky ball it blows up into when a child taps it), triggerfish (Picasso), butterflyfish
//   (Copperband), boxfish (Yellow Boxfish), emperorangel, lionfish, moorishidol, octopus, bambooshark, jellyfish (Moon Jelly),
//   seaturtle, and the legendaries goldclown (Golden Clownfish), crystalhorse (Crystal Seahorse), zombiepuffer
//   (+ 'zombiepuffer:puffed') and kingangel (King Neptune Angelfish).
// Each is { w, h, draw(g, f) }: g is a hi-res PX.Grid in art px, the fish faces RIGHT, f = 0 | 1 is the swim frame (tail swish +
// fin flap; the octopus curls its arms, the jelly squeezes its bell, the turtle strokes its flippers). The builder adds the bold
// outer line (the see-through jelly has noLine and draws its own soft edge).
// Style: TRUE chibi stickers (docs/pvz-art-guide.md): round chunky bodies, only subtly off-round; ONE big glossy side-view eye with
// a white glint, a little blush and a tiny smile; flat pastel fills with one soft shade crescent and a small highlight; thin
// piece outlines; each species' signature colours drawn big and simple. Legendaries get art-plants8.js's aura and twinkles; the
// Golden Clownfish copies art-fish.js's Clownfish shape so it reads as its golden twin.
(function () {
  'use strict';
  if (!window.PX || !PX.Grid) return;
  const { Grid, INK, stroke, starPts } = PX;
  const AR = PX.art || {};
  const FA = PX.FISH_ART || (PX.FISH_ART = {});
  const WHITE = '#ffffff', PI = Math.PI;

  // ---------------- helpers (the art-world2.js kit, plus a few fishy ones) ----------------
  const piece = (G, draw) => { const t = new Grid(G.w, G.h, G.k); draw(t); t.outline(); G.merge(t); return G; };
  const fine = m => { m.fine = true; return m; };
  const IN = g => fine((x, y) => g.filled(x, y));
  const ON = (g, cols) => fine((x, y) => cols.includes(g.get(x, y)));
  const line = (g, pts, r, col) => stroke(g, pts, r, r, col);
  const rot = (p, o, a) => { const c = Math.cos(a), s = Math.sin(a), dx = p[0] - o[0], dy = p[1] - o[1]; return [o[0] + dx * c - dy * s, o[1] + dx * s + dy * c]; };
  const rotAll = (pts, o, a) => pts.map(p => rot(p, o, a));
  // a soft polygon: the shape grown by r all round, so every corner is rounded (chibi fins)
  const rpoly = (t, pts, r, col) => { t.poly(pts, col); stroke(t, pts.concat([pts[0]]), r, r, col); return t; };
  // a rounded box from (x0, y0) to (x1, y1), corner radius r
  function box(t, x0, y0, x1, y1, r, col) {
    const k = t.k || 1;
    for (let fy = Math.floor(y0 * k); fy < Math.ceil(y1 * k); fy++) for (let fx = Math.floor(x0 * k); fx < Math.ceil(x1 * k); fx++) {
      const px = (fx + 0.5) / k, py = (fy + 0.5) / k, cx = Math.min(Math.max(px, x0 + r), x1 - r), cy = Math.min(Math.max(py, y0 + r), y1 - r);
      if ((px - cx) ** 2 + (py - cy) ** 2 <= r * r) t.fset(fx, fy, col);
    }
    return t;
  }
  // paint only over what is already drawn on g (bands, stripes, spots that stay inside a shape); only = the colours it may cover
  function paint(g, draw, only) {
    const t = new Grid(g.w, g.h, g.k); draw(t);
    for (let i = 0; i < g.a.length; i++) { const c = g.a[i]; if (t.a[i] && c && c !== INK && (!only || only.includes(c))) g.a[i] = t.a[i]; }
    return g;
  }
  // repaint t's pixels where fn(x, y, c) returns a colour (x, y = the fine pixel's centre, in art px)
  function paintAt(t, fn) {
    const K = t.k;
    for (let fy = 0; fy < t.fh; fy++) for (let fx = 0; fx < t.fw; fx++) { const i = fy * t.fw + fx, c = t.a[i]; if (!c || c === INK) continue; const v = fn((fx + 0.5) / K, (fy + 0.5) / K, c); if (v) t.a[i] = v; }
    return t;
  }
  // the chibi crescent shade over a whole multi-colour piece: pixels outside the lit ellipse (cx, cy, rx, ry nudged up-left) take
  // their colour's shade from M = { colour: shade }; o.hl adds the small highlight up-left (only on the o.hlOn colours when given)
  function crescent(t, cx, cy, rx, ry, M, o) {
    o = o || {}; const k = o.shade == null ? 0.16 : o.shade, K = t.k, sx = cx - rx * k, sy = cy - ry * k * 1.15;
    for (let fy = 0; fy < t.fh; fy++) for (let fx = 0; fx < t.fw; fx++) {
      const i = fy * t.fw + fx, c = t.a[i]; if (!c || !M[c]) continue;
      if (!PX.inEll((fx + 0.5) / K, (fy + 0.5) / K, sx, sy, rx * 1.02, ry * 1.02, o.rot || 0).in) t.a[i] = M[c];
    }
    if (o.hl) t.ell(cx - rx * 0.42, cy - ry * 0.5, Math.max(0.6, rx * 0.22), Math.max(0.45, ry * 0.13), o.hl, -0.55, o.hlOn ? ON(t, o.hlOn) : IN(t));
    return t;
  }
  // rims along a fin's outer edge (as art-fish.js): a pixel within d art px of the edge, looking straight out from the base point
  // (bx, by), takes that band's colour; bands = [[d, colour], ...], thinnest first
  function rim(t, bx, by, bands) {
    const a0 = t.a.slice(), K = t.k, W = t.fw, H = t.fh;
    const empty = (x, y) => { const fx = Math.floor(x * K), fy = Math.floor(y * K); if (fx < 0 || fy < 0 || fx >= W || fy >= H) return true; const c = a0[fy * W + fx]; return !c || c === INK; };
    for (let fy = 0; fy < H; fy++) for (let fx = 0; fx < W; fx++) {
      const i = fy * W + fx; if (!a0[i] || a0[i] === INK) continue;
      const x = (fx + 0.5) / K, y = (fy + 0.5) / K, d0 = Math.hypot(x - bx, y - by) || 1, ux = (x - bx) / d0, uy = (y - by) / d0;
      for (const [d, col] of bands) if (empty(x + ux * d, y + uy * d)) { t.a[i] = col; break; }
    }
    return t;
  }
  // a tapered stroke whose colour cycles along its length every seg art px (striped spines and fin rays)
  function bands(t, pts, r0, r1, cols, seg) {
    let len = 0; const L = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(d); len += d; }
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], d = L[i - 1], n = Math.max(1, Math.ceil(d / 0.2));
      for (let s = 0; s <= n; s++) { const u = s / n, at = acc + d * u, r = r0 + (r1 - r0) * at / (len || 1); t.ell(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, r, r, cols[Math.floor(at / seg) % cols.length]); }
      acc += d;
    }
    return t;
  }
  // a two-lobed tail fin from its base (bx, by) back to the left: length len, half-spread spr, swish angle a, notch n (share of
  // len; 0 = a straight edge, negative = a round fan)
  function tail(t, bx, by, len, spr, a, col, n) {
    n = n == null ? 0.3 : n; const r = Math.min(1.1, spr * 0.32);
    return rpoly(t, rotAll([[bx + 0.5, by - spr * 0.3], [bx - len + r, by - spr + r], [bx - len * (1 - n) + r * 0.5, by], [bx - len + r, by + spr - r], [bx + 0.5, by + spr * 0.3]], [bx, by], a), r, col);
  }
  // the Clownfish's round fan tail (as art-fish.js): len long, sp = half its height at the end; f = 1 swishes it
  function fanTail(t, bx, by, len, sp, col, f) {
    const sq = f ? 0.8 : 1, a = f ? -0.17 : 0.06, c = Math.cos(a), s = Math.sin(a), P = (u, v) => [bx - u * sq * c - v * s, by - u * sq * s + v * c];
    t.poly([P(-0.8, -sp * 0.5), P(len * 0.6, -sp * 0.95), P(len * 0.6, sp * 0.95), P(-0.8, sp * 0.5)], col);
    const [x, y] = P(len * 0.6, 0); t.ell(x, y, len * 0.42 * sq, sp, col, a);
    return t;
  }
  // a side (pectoral) fin: an oval from its root (x, y) reaching len art px toward angle ang (PI = straight back), half-width wd
  const sideFin = (t, x, y, len, wd, ang, col) => t.ell(x + Math.cos(ang) * len / 2, y + Math.sin(ang) * len / 2, len / 2, wd, col, ang);
  // the side-view chibi face: ONE big glossy eye (centre ex, ey; size s = 3.3 x 4.3 art px at 1, or o.w x o.h) with its white
  // glint, a soft blush just under it and a tiny mouth at (mx, my), slid back until the whole smile sits on the body. o: mouth
  // kind, mw, white (a googly eye with a pupil, look), ring (a pale ring round the eye, for a dark mask), blush: false | [dx, dy]
  function face(g, ex, ey, s, mx, my, o) {
    o = o || {}; const w = o.w || 3.3 * s, h = o.h || 4.3 * s;
    if (o.ring) g.ell(ex, ey, w / 2 + 0.7, h / 2 + 0.7, o.ring, 0, IN(g));
    if (AR.chibiEyes) AR.chibiEyes(g, ex, ey, { one: true, sp: 0, w, h, mood: o.mood, white: o.white, look: o.look || [0.5, 0.1] });
    const [bx, by] = o.blush || [-0.3, h * 0.5 + 0.75];
    if (o.blush !== false && AR.blush) AR.blush(g, ex + bx, ey + by, { one: true, sp: 0, w: 1.15 * s, h: 0.6 * s, col: o.blushCol });
    if (mx == null || !AR.chibiMouth) return;
    const mw = o.mw || 1.5 * s, on = (x, y) => g.filled(x, y);
    while (mx > ex && !(on(mx + mw * 0.5 + 0.6, my) && on(mx + mw * 0.5 + 0.6, my + 0.7) && on(mx, my + 0.9))) mx -= 0.25;
    AR.chibiMouth(g, mx, my, o.mouth || 'smile', mw);
  }

  // ---- the legendary touch (as art-plants8.js): a soft see-through aura and four-point twinkles ----
  // a four-point twinkle (its own outlined piece) with a white heart
  function twinkle(g, x, y, s, col) {
    const k = g.k; x = (Math.floor(x * k) + 0.5) / k; y = (Math.floor(y * k) + 0.5) / k;
    piece(g, t => t.poly(starPts(x, y, 1.7 * s, 0.55 * s, 4), col || '#ffe27a'));
    g.dot(x, y, WHITE); if (s > 0.85) g.dot(x - 0.5, y, '#fffbe0');
  }
  // twinkles at spots [[x, y, size], ...] that shimmer with the frame (big / small in turn); never on top of the fish
  function twinkles(g, f, spots, col) {
    spots.forEach(([x, y, s], i) => { const ss = Math.max(0.75, s * ((i + f) % 2 ? 0.8 : 1)), c = g.get(x, y); if (c && c[0] === '#') return; twinkle(g, x, y, ss, col); });
  }
  // a soft see-through glow round the whole silhouette (no bold edge on it): width w art px, colour [r, g, b], alpha a
  function aura(g, w, rgb, a) {
    const W = g.fw, H = g.fh, N = W * H, BIG = 1e6, d = new Float32Array(N), k = g.k;
    for (let i = 0; i < N; i++) { const c = g.a[i]; d[i] = c !== null && c[0] !== 'r' ? 0 : BIG; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; let v = d[i]; if (!v) continue;
      if (x > 0) v = Math.min(v, d[i - 1] + 1);
      if (y > 0) { v = Math.min(v, d[i - W] + 1); if (x > 0) v = Math.min(v, d[i - W - 1] + 1.414); if (x < W - 1) v = Math.min(v, d[i - W + 1] + 1.414); }
      d[i] = v;
    }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x; let v = d[i]; if (!v) continue;
      if (x < W - 1) v = Math.min(v, d[i + 1] + 1);
      if (y < H - 1) { v = Math.min(v, d[i + W] + 1); if (x < W - 1) v = Math.min(v, d[i + W + 1] + 1.414); if (x > 0) v = Math.min(v, d[i + W - 1] + 1.414); }
      d[i] = v;
    }
    const r1 = w * k * 0.5, r2 = w * k, s = rgb.join(','), inner = `rgba(${s},${a})`, outer = `rgba(${s},${(a * 0.5).toFixed(2)})`;
    for (let i = 0; i < N; i++) { const v = d[i]; if (!v || v > r2 + 0.01) continue; if (g.a[i] === null) g.a[i] = v <= r1 + 0.6 ? inner : outer; }
  }

  // =====================================================================================================
  // Pufferfish and the Zombie Pufferfish (same body; each also has a ':puffed' spiky ball for when it's tapped)
  // =====================================================================================================
  const PUFFER = { R: ['#fff6d6', '#f8dc92', '#e6be70'], F: ['#fff4cc', '#f6dc9a', '#e2c27c'], spot: ['#c99a68', '#b48656'], belly: ['#fffbec', '#f4e2b8'] };
  const ZPUFFER = { R: ['#e8f4d8', '#b8d6a8', '#9fbe8e'], F: ['#eef8e0', '#cce4bc', '#aecaa0'], belly: ['#f6fbec', '#dcead0'], zombie: true };
  const BRAIN = ['#ffe0ea', '#ffb8cc', '#e88aa8'], TIE = ['#ff9a9a', '#f07a7a', '#cc5a62'], PATCH = ['#f2f6cc', '#e2ecb0', '#cad898'];
  const PUF_SPOTS = [[7.6, 7.6, 0.8], [9.8, 5.4, 0.85], [12.4, 4.3, 0.8], [11.8, 7.6, 0.9], [14.8, 5.4, 0.75], [8.8, 10.6, 0.75], [6.6, 10.2, 0.6], [15.4, 3.4, 0.55]];
  const BALL_SPOTS = [[-5.6, -2.4, 0.9], [-3.2, -5.2, 1], [0, -6.4, 0.9], [-1.4, -2.6, 1], [2.4, -4.4, 0.85], [-6.2, 1.2, 0.8], [-3.6, 0.6, 0.75], [3.6, -7, 0.6]];
  // a chubby cartoon brain bump (two lobes with fine folds), centred on cx, cy
  function brain(g, cx, cy, sc) {
    piece(g, t => { t.ell(cx - 1.05 * sc, cy, 1.75 * sc, 1.45 * sc, BRAIN[1]); t.ell(cx + 1.05 * sc, cy - 0.1 * sc, 1.75 * sc, 1.45 * sc, BRAIN[1]); t.ell(cx, cy + 0.5 * sc, 2.5 * sc, 1.2 * sc, BRAIN[1]); crescent(t, cx, cy, 2.8 * sc, 1.7 * sc, { [BRAIN[1]]: BRAIN[2] }, { hl: BRAIN[0] }); });
    for (const p of [[[cx, cy - 1.3 * sc], [cx + 0.1 * sc, cy + 1.2 * sc]], [[cx - 2 * sc, cy - 0.1 * sc], [cx - 1.3 * sc, cy + 0.5 * sc], [cx - 0.7 * sc, cy - 0.3 * sc]], [[cx + 0.7 * sc, cy + 0.3 * sc], [cx + 1.4 * sc, cy - 0.5 * sc], [cx + 2 * sc, cy + 0.2 * sc]]]) line(g, p, 0.2, BRAIN[2]);
  }
  // a little stitched patch (the zombie joke): a pale rounded square stuck on, with cross-stitches over its edges
  function patch(g, x, y, w, h, a) {
    const P = rotAll([[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2, y + h / 2], [x - w / 2, y + h / 2]], [x, y], a);
    piece(g, t => { rpoly(t, rotAll([[x - w / 2 + 0.4, y - h / 2 + 0.4], [x + w / 2 - 0.4, y - h / 2 + 0.4], [x + w / 2 - 0.4, y + h / 2 - 0.4], [x - w / 2 + 0.4, y + h / 2 - 0.4]], [x, y], a), 0.4, PATCH[1]); crescent(t, x, y, w * 0.6, h * 0.6, { [PATCH[1]]: PATCH[2] }, { hl: PATCH[0] }); });
    for (let i = 0; i < 4; i++) {
      const p0 = P[i], p1 = P[(i + 1) % 4], ux = (p1[0] - p0[0]) / Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), uy = (p1[1] - p0[1]) / Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      for (const u of [0.3, 0.7]) { const px = p0[0] + (p1[0] - p0[0]) * u, py = p0[1] + (p1[1] - p0[1]) * u; line(g, [[px + uy * 0.55, py - ux * 0.55], [px - uy * 0.55, py + ux * 0.55]], 0.13, INK); }
    }
  }
  // the little red zombie tie, knot at (x, y)
  function tie(g, x, y, s) {
    piece(g, t => { t.poly([[x, y], [x + 1 * s, y + 1.7 * s], [x, y + 3.4 * s], [x - 1 * s, y + 1.7 * s]], TIE[1]); t.poly([[x + 0.1, y + 1.5 * s], [x + 1 * s, y + 1.7 * s], [x, y + 3.4 * s]], TIE[2]); });
    piece(g, t => t.ell(x, y, 0.9 * s, 0.72 * s, TIE[2]));
  }
  function puffer(g, f, P) {
    const R = P.R, F = P.F, z = P.zombie, oy = z ? 1.8 : 0, a = f ? -0.22 : 0.18;
    piece(g, t => tail(t, 5.6, 9.8 + oy, 4.2, 3.1, a, F[1], -0.25));
    piece(g, t => { rpoly(t, [[8.4, 4.8 + oy], [9.8, 2.9 + oy], [11.6, 3.6 + oy], [11.9, 5.2 + oy]], 0.7, F[1]); rpoly(t, [[8.6, 14.6 + oy], [10.2, 16.3 + oy], [11.8, 15.6 + oy], [11.9, 14.2 + oy]], 0.6, F[1]); });
    piece(g, t => {
      t.ell(12.4, 9.8 + oy, 7.8, 6.5, R[1]); t.ell(14.4, 9.0 + oy, 6.6, 6.1, R[1]);
      paint(t, u => u.ell(13.8, 13.9 + oy, 7.4, 3.3, P.belly[0]));
      if (P.spot) paint(t, u => { for (const [x, y, r] of PUF_SPOTS) u.ell(x, y + oy, r, r * 0.92, P.spot[0]); }, [R[1]]);
      crescent(t, 12.8, 9.6 + oy, 8.4, 6.8, Object.assign({ [R[1]]: R[2], [P.belly[0]]: P.belly[1] }, P.spot ? { [P.spot[0]]: P.spot[1] } : {}), { hl: R[0], hlOn: [R[1]] });
    });
    if (z) patch(g, 9.2, 9.6 + oy, 3.4, 3, -0.18);
    piece(g, t => sideFin(t, 14.6, 11.6 + oy, 4, 1.25, PI - (f ? 0.95 : 0.45), F[1]));
    if (z) { brain(g, 13.6, 3.4, 1); tie(g, 18.4, 13.6 + oy, 1.1); }
    face(g, 17.4, 8.7 + oy, 1, 20.0, 11.6 + oy, z ? { white: true, look: [0.6, 0.15] } : null);
  }
  // puffed up: a big round ball ringed with little soft spikes, a surprised 'o' mouth (it squishes a little on frame 1)
  function pufferBall(g, f, P) {
    const R = P.R, F = P.F, z = P.zombie, cx = 13, cy = z ? 15 : 13, sq = f ? 0.3 : 0, rx = 9 + sq, ry = 8.8 - sq;
    piece(g, t => tail(t, cx - rx + 1.6, cy + 0.6, 3.6, 2.6, f ? -0.3 : 0.2, F[1], -0.25));
    piece(g, t => { const n = 18; for (let i = 0; i < n; i++) { const an = (i + 0.5) * 2 * PI / n, c = Math.cos(an), s = Math.sin(an); rpoly(t, [[cx + c * (rx - 1) - s * 0.85, cy + s * (ry - 1) + c * 0.85], [cx + c * (rx + 1.6), cy + s * (ry + 1.6)], [cx + c * (rx - 1) + s * 0.85, cy + s * (ry - 1) - c * 0.85]], 0.4, F[1]); } });
    piece(g, t => {
      t.ell(cx, cy, rx, ry, R[1]);
      paint(t, u => u.ell(cx + 0.6, cy + 5.6, 8.4, 4, P.belly[0]));
      if (P.spot) paint(t, u => { for (const [x, y, r] of BALL_SPOTS) u.ell(cx + x, cy + y, r, r * 0.92, P.spot[0]); }, [R[1]]);
      crescent(t, cx, cy, rx, ry, Object.assign({ [R[1]]: R[2], [P.belly[0]]: P.belly[1] }, P.spot ? { [P.spot[0]]: P.spot[1] } : {}), { hl: R[0], hlOn: [R[1]] });
    });
    if (z) patch(g, cx - 4.4, cy + 0.8, 3.6, 3.2, -0.18);
    piece(g, t => sideFin(t, cx + 2.4, cy + 2.8, 3.6, 1.2, PI - (f ? 1.0 : 0.55), F[1]));
    if (z) { brain(g, cx - 0.4, cy - ry - 0.4, 1.15); tie(g, cx + 5.4, cy + ry - 3, 1.1); }
    face(g, cx + 4.4, cy - 1.8, 1.15, cx + 7.2, cy + 2.8, Object.assign({ mouth: 'o', mw: 2.6 }, z ? { white: true, look: [0.5, -0.1] } : null));
  }
  FA.puffer = { w: 24, h: 18, draw(g, f) { puffer(g, f, PUFFER); } };
  FA['puffer:puffed'] = { w: 26, h: 26, draw(g, f) { pufferBall(g, f, PUFFER); } };
  FA.zombiepuffer = { w: 24, h: 20, draw(g, f) { puffer(g, f, ZPUFFER); } };
  FA['zombiepuffer:puffed'] = { w: 26, h: 28, draw(g, f) { pufferBall(g, f, ZPUFFER); } };

  // =====================================================================================================
  // Picasso Triggerfish: a cream oval "painted" with a black band behind the eye, a yellow lip line and blue/yellow strokes
  // =====================================================================================================
  FA.triggerfish = { w: 26, h: 18, draw(g, f) {
    const R = ['#fffbf2', '#fbefd6', '#e6d2ae'], FN = ['#fffaea', '#f4e6c6', '#dccaa2'], BEL = ['#ffffff', '#f2ece0'];
    const K = ['#5a5066', '#463e52'], BL = ['#9ad8fa', '#6cc0ee', '#58a8da'], Y = ['#fff2a8', '#ffd84e', '#f0be3e'], a = f ? -0.2 : 0.16;
    piece(g, t => tail(t, 6.2, 9.6, 4.2, 3.2, a, FN[1], 0.32));
    piece(g, t => { rpoly(t, [[13.2, 3.8], [8.6, 2.6], [6.6, 5.4], [8.8, 6.6]], 0.8, FN[1]); rpoly(t, [[13.2, 15.4], [8.6, 16.6], [6.6, 13.8], [8.8, 12.6]], 0.8, FN[1]); });
    piece(g, t => {
      t.ell(13.4, 9.6, 8.4, 6.1, R[1], -0.04); t.ell(19.4, 10.2, 3.6, 3.3, R[1]);
      paint(t, u => u.ell(14.2, 14.2, 8, 3, BEL[0]));
      // the painted strokes on the back: blue, yellow, blue, slanting up toward the tail
      for (const [x, c] of [[7.6, BL[1]], [9.8, Y[1]], [12, BL[1]]]) paint(t, u => line(u, [[x + 1.8, 15.6], [x - 1.6, 9.6]], 0.55, c));
      // the black band behind the eye with a thin blue edge either side, and the yellow line from the lips back under the eye
      paint(t, u => line(u, [[16.6, 2.6], [15.0, 16.4]], 1.55, BL[1])); paint(t, u => line(u, [[16.6, 2.6], [15.0, 16.4]], 1.05, K[0]));
      paint(t, u => line(u, [[22.4, 11.2], [19.4, 11.9], [16.4, 12.2]], 0.5, Y[1]));
      paint(t, u => u.ell(22.6, 10.6, 1.0, 1.4, Y[1]));
      crescent(t, 13.8, 9.6, 9, 6.6, { [R[1]]: R[2], [BEL[0]]: BEL[1], [K[0]]: K[1], [BL[1]]: BL[2], [Y[1]]: Y[2] }, { hl: R[0], hlOn: [R[1]] });
    });
    piece(g, t => sideFin(t, 15.4, 11.4, 3.4, 1.05, PI - (f ? 0.9 : 0.45), FN[1]));
    face(g, 18.8, 8.2, 0.9, 21.4, 12.2, { mw: 1.3 });
  } };

  // =====================================================================================================
  // Copperband Butterflyfish: a white disc, bold orange bands edged in black, a long thin snout, an eye-spot on the back fin
  // =====================================================================================================
  FA.butterflyfish = { w: 26, h: 20, draw(g, f) {
    const W = ['#ffffff', '#fbfaf6', '#e2deea'], OR = ['#ffd2a0', '#ffa04a', '#ec8434'], ED = '#4e3e46', SN = ['#fffaee', '#fff2d6', '#ecd8b0'], a = f ? -0.2 : 0.16;
    piece(g, t => tail(t, 5.6, 10.2, 3.8, 3.1, a, W[1], 0.12));
    piece(g, t => {
      t.ell(12.6, 10.2, 7.2, 7, W[1]);
      rpoly(t, [[13.4, 3.6], [9, 2.4], [5.8, 4.8], [5.2, 8.4], [8.6, 8.2]], 0.9, W[1]);
      rpoly(t, [[13, 16.8], [9, 17.6], [5.8, 15.6], [5.2, 12], [8.6, 12.2]], 0.9, W[1]);
      stroke(t, [[18.6, 10.8], [21.4, 11.3], [23.6, 11.7]], 1.2, 0.9, SN[1]);
      // three orange bands edged in black, plus a thin dark one where the tail starts
      for (const [x0, x1, r] of [[15.2, 14.2, 0.78], [11.6, 10.8, 0.78], [8.2, 7.4, 0.72]]) { paint(t, u => line(u, [[x0, 0.5], [x1, 19.5]], r + 0.36, ED), [W[1]]); paint(t, u => line(u, [[x0, 0.5], [x1, 19.5]], r, OR[1]), [W[1], ED]); }
      paint(t, u => line(u, [[5.6, 7.6], [5.4, 12.8]], 0.42, ED), [W[1]]);
      paint(t, u => u.ell(19.6, 10.9, 0.75, 1.4, OR[1]), [SN[1]]);
      crescent(t, 12.4, 10, 8.4, 8.2, { [W[1]]: W[2], [OR[1]]: OR[2], [SN[1]]: SN[2] }, { hl: W[0], hlOn: [W[1]] });
    });
    // the false eye-spot on the back fin: a black dot with a pale ring and a glint
    g.ell(6.3, 5.6, 1.35, 1.35, '#ffe6c4', 0, IN(g)); g.ell(6.3, 5.6, 0.95, 0.95, ED, 0, IN(g)); g.dot(6, 5.2, WHITE);
    piece(g, t => sideFin(t, 15, 12.6, 3, 0.95, PI - (f ? 0.95 : 0.5), W[1]));
    face(g, 17.8, 8.8, 0.9, 23.2, 12.8, { mw: 1.1 });
  } };

  // =====================================================================================================
  // Yellow Boxfish: a little bright yellow box with black polka dots and tiny fins
  // =====================================================================================================
  FA.boxfish = { w: 22, h: 18, draw(g, f) {
    const Y = ['#fffbd4', '#ffe24c', '#f2c43a'], FN = ['#fff8cc', '#ffec8e', '#f2d064'], DOT = '#3e3440', a = f ? -0.24 : 0.2;
    const ex = 15.4, ey = 8.6;
    piece(g, t => tail(t, 5.8, 9.6, 3.8, 2.8, a, FN[1], -0.3));
    piece(g, t => { t.ell(9.6, 3.8, 1.7, 1.2, FN[1], -0.25); t.ell(9.6, 15.4, 1.7, 1.2, FN[1], 0.25); });
    piece(g, t => {
      box(t, 5, 3.4, 18.8, 15.4, 3.6, Y[1]);
      crescent(t, 11.9, 9.4, 7.4, 6.4, { [Y[1]]: Y[2] }, { hl: Y[0] });
    });
    // the polka dots (kept off the face), each with a tiny shine
    for (const [x, y] of [[7.6, 6.4], [10.8, 5.4], [13.6, 5.2], [9.2, 9.4], [7.6, 12.4], [10.8, 12.8], [13.8, 13.4], [16.6, 13.2]]) {
      if (Math.hypot(x - ex, y - ey) < 3.2) continue;
      g.ell(x, y, 0.9, 0.9, DOT, 0, IN(g)); g.dot(x - 0.4, y - 0.45, WHITE);
    }
    piece(g, t => sideFin(t, 12.6, 10.4, 2.8, 0.95, PI - (f ? 1.0 : 0.45), FN[1]));
    face(g, ex, ey, 1, 18.2, 12.4, { mw: 1.3 });
  } };

  // =====================================================================================================
  // Emperor Angelfish: a deep blue disc with curving yellow stripes, a yellow tail and a dark mask band over the eye
  // =====================================================================================================
  FA.emperorangel = { w: 32, h: 26, draw(g, f) {
    const B = ['#b6ccff', '#6f8ef0', '#5672d4'], B2 = ['#a8bcf8', '#5a78dc', '#4862c0'], Y = ['#fff6c0', '#ffde62', '#f2c040'];
    const MASK = ['#46549e', '#3a4688'], RIM = '#cfe4ff', FC = ['#f6fbff', '#dcecff', '#bcd4f2'], a = f ? -0.18 : 0.14;
    piece(g, t => { tail(t, 8, 13.2, 5.4, 4.6, a, Y[1], -0.12); crescent(t, 5.6, 13.2, 3.4, 4.6, { [Y[1]]: Y[2] }); });
    piece(g, t => { rpoly(t, [[18.4, 5.6], [12.4, 3.4], [7.8, 4.6], [5.4, 7.6], [8.6, 9.4], [13.6, 7.6]], 0.9, B[1]); paint(t, u => { for (const y of [5.4, 7.6]) line(u, [[17.6, y - 1], [11, y - 1.4], [6.4, y + 0.2]], 0.45, Y[1]); }); });
    piece(g, t => { rpoly(t, [[18.4, 20.8], [12.4, 23], [7.8, 21.8], [5.4, 18.8], [8.6, 17], [13.6, 18.8]], 0.9, B2[1]); paint(t, u => line(u, [[17.4, 21.6], [11.6, 22.6], [6.6, 19.4]], 0.4, '#9fd2ff')); });
    piece(g, t => {
      t.ell(16.6, 13.2, 9.4, 8.6, B[1]); t.ell(19.2, 13.6, 7.2, 7.4, B[1]);
      // curving yellow stripes sweeping up toward the back (arcs round a point far below the tail)
      paint(t, u => { for (let i = 0; i < 7; i++) { const rr = 13 + i * 2.3, pts = []; for (let k = 0; k <= 24; k++) { const th = -1.75 + k * 0.06; pts.push([4 + Math.cos(th) * rr, 30 + Math.sin(th) * rr]); } line(u, pts, 0.5, Y[1]); } }, [B[1]]);
      // the pale face in front, then the dark mask band through the eye with a light-blue rim
      paint(t, u => u.ell(27.4, 13.8, 4.6, 9, FC[1]));
      paint(t, u => line(u, [[23.4, 3.6], [21.8, 20.4]], 2.4, RIM)); paint(t, u => line(u, [[23.4, 3.6], [21.8, 20.4]], 1.9, MASK[0]));
      crescent(t, 16.8, 13.2, 10.4, 9.2, { [B[1]]: B[2], [Y[1]]: Y[2], [FC[1]]: FC[2], [MASK[0]]: MASK[1] }, { hl: B[0], hlOn: [B[1]] });
    });
    piece(g, t => sideFin(t, 18.6, 15.8, 4.4, 1.4, PI - (f ? 0.95 : 0.5), B2[1]));
    face(g, 22.6, 11.4, 1.05, 25.4, 15.4, { ring: RIM, blush: [1.6, 3.4], mw: 1.5 });
  } };

  // =====================================================================================================
  // Lionfish: maroon-and-white stripes, a crest of striped spines and big striped fans spread out below like a lion's mane
  // =====================================================================================================
  FA.lionfish = { w: 34, h: 26, draw(g, f) {
    const W = ['#ffffff', '#fff2ec', '#ecd2cc'], M = ['#f2a2b0', '#d2627a', '#b44c64'], MEM = ['#fff6f6', '#ffdfe4', '#f6c6ce'], a = f ? -0.2 : 0.16, open = f ? 0.07 : -0.04;
    piece(g, t => { tail(t, 15, 11.8, 4.2, 3.2, a, W[1], -0.2); paint(t, u => { for (const [x, y] of [[12.4, 10], [11.2, 12], [12.4, 13.8], [13.8, 11.8]]) { const p = rot([x, y], [15, 11.8], a); u.ell(p[0], p[1], 0.55, 0.55, M[1]); } }); });
    // the mane: a big pale fan spreading down and back from behind the head, its striped rays poking out past a scalloped edge
    piece(g, t => {
      const o = [20.2, 14], n = 6, th0 = PI * 0.42 + open, th1 = PI * 0.97 + open * 1.6, pts = [o];
      for (let k = 0; k <= 40; k++) { const u = k / 40, th = th0 + (th1 - th0) * u, r = 8.2 - 1.5 * Math.abs(Math.sin(u * (n - 1) * PI)); pts.push([o[0] + Math.cos(th) * r, o[1] + Math.sin(th) * r]); }
      t.poly(pts, MEM[1]);
      for (let i = 0; i < n; i++) { const th = th0 + (th1 - th0) * i / (n - 1), L = 9.5 + (i % 2) * 0.2; bands(t, [o, [o[0] + Math.cos(th) * L, o[1] + Math.sin(th) * L]], 1.05, 0.72, [M[1], W[1]], 1.3); }
      crescent(t, 16.4, 18.4, 7.6, 5.8, { [W[1]]: W[2], [M[1]]: M[2], [MEM[1]]: MEM[2] });
    });
    // the crest: striped spines fanning up and back, a pale web between their lower halves
    piece(g, t => {
      const S = []; for (let i = 0; i < 6; i++) { const bx = 24.6 - i * 1.75, by = 8.8 + i * 0.35, th = -PI / 2 - 0.1 - i * 0.12 + open * 0.5, L = 6.6 - i * 0.34; S.push([bx, by, bx + Math.cos(th) * L, by + Math.sin(th) * L]); }
      t.poly(S.map(s => [s[0], s[1] + 1]).concat(S.slice().reverse().map(s => [s[0] + (s[2] - s[0]) * 0.55, s[1] + (s[3] - s[1]) * 0.55])), MEM[1]);
      for (const s of S) bands(t, [[s[0], s[1]], [s[2], s[3]]], 0.88, 0.62, [W[1], M[1]], 1.25);
    });
    piece(g, t => {
      t.ell(21, 12.6, 6.6, 4.8, W[1]); t.ell(24.8, 11.8, 4.5, 4.5, W[1]);
      for (const x of [15.6, 18, 20.4, 22.6]) paint(t, u => line(u, [[x + 0.7, 6], [x - 0.7, 19]], 0.7, M[1]));
      crescent(t, 21.4, 12.2, 7.8, 5.4, { [W[1]]: W[2], [M[1]]: M[2] }, { hl: W[0], hlOn: [W[1]] });
    });
    face(g, 25.7, 11, 1, 28.2, 14.6, { mw: 1.8 });
  } };

  // =====================================================================================================
  // Moorish Idol: a tall disc in black, white and yellow bands, a little snout and a long white banner fin trailing back
  // =====================================================================================================
  FA.moorishidol = { w: 28, h: 26, draw(g, f) {
    const Y = ['#fff6c4', '#ffe066', '#f0c448'], W = ['#ffffff', '#fbfaf4', '#e4e0ea'], K = ['#6a6070', '#463e4c', '#3a3240'], OR = '#ffb062', a = f ? -0.2 : 0.16;
    piece(g, t => { tail(t, 9.6, 14.4, 4.4, 3.6, a, W[1], 0.18); paint(t, u => tail(u, 9.3, 14.4, 3.3, 2.6, a, K[1], 0.12)); });
    piece(g, t => { stroke(t, [[14.8, 5.2], [12.8, 2.4], [8.6, 1.6], [4.8, 2.4], [2.2, 4.4 + f]], 1.05, 0.45, W[1]); crescent(t, 8, 3, 7, 2, { [W[1]]: W[2] }); });
    piece(g, t => {
      t.ell(15.6, 14.4, 6.8, 7.2, Y[1]);
      rpoly(t, [[11.8, 9.6], [14.6, 4.6], [16.2, 5.4], [19.2, 10]], 0.8, Y[1]);
      rpoly(t, [[12.4, 19.4], [12.8, 23.6], [14.8, 23.4], [18.6, 19]], 0.8, Y[1]);
      stroke(t, [[20.4, 14.8], [22.8, 15.4], [24.8, 16]], 1.3, 1.0, W[1]);
      // front to back: the yellow face, a black band, a white band, a broad black band, the yellow back (black bands white-edged)
      paint(t, u => line(u, [[15.4, 2], [13.8, 25]], 1.55, W[1]), [Y[1]]);
      for (const [x0, r] of [[17.9, 0.95], [12.2, 1.2]]) { paint(t, u => line(u, [[x0, 2], [x0 - 1.6, 25]], r + 0.42, W[1]), [Y[1]]); paint(t, u => line(u, [[x0, 2], [x0 - 1.6, 25]], r, K[1]), [Y[1], W[1]]); }
      paint(t, u => u.ell(22.2, 14.3, 1.5, 0.8, OR), [W[1]]);
      crescent(t, 15.8, 14.2, 8, 8.4, { [Y[1]]: Y[2], [W[1]]: W[2], [K[1]]: K[2], [OR]: '#ee9a4c' }, { hl: Y[0], hlOn: [Y[1]] });
    });
    face(g, 20.1, 12.4, 0.9, 24.4, 16.6, { mw: 1.2 });
  } };

  // =====================================================================================================
  // Octopus: a round pink-purple head with a big friendly face (it looks at you a bit) and 8 short curly arms with suckers
  // =====================================================================================================
  // an arm from its root (bx, by) down to the sand, then a curl outward (side s = -1 | 1, spread m, curl c 0..1)
  function armPts(bx, by, s, m, c) {
    const ox = bx + s * (0.9 + 1.5 * m), oy = by + 3.4, end = PI * (0.3 + 0.55 * c), pts = [[bx, by], [bx + s * 0.3 * m, by + 1.4]];
    for (let k = 0; k <= 12; k++) { const u = k / 12, th = PI - u * (PI + end), r = 1.9 * (1 - 0.62 * u); pts.push([ox + s * Math.cos(th) * r, oy + Math.sin(th) * r]); }
    return pts;
  }
  FA.octopus = { w: 26, h: 22, draw(g, f) {
    const R = ['#ffe4f6', '#f0aade', '#d68ac6'], BK = '#e6a0d4', SU = '#fff2fa';
    piece(g, t => { for (const [bx, s, m] of [[8.4, -1, 1.2], [11.2, -1, 0.5], [15.4, 1, 0.5], [18.2, 1, 1.2]]) stroke(t, armPts(bx, 13.8, s, m, f ? 0.2 : 0.9), 1.25, 0.5, BK); });
    const front = [[9.6, -1, 1], [12.4, -1, 0.3], [15, 1, 0.3], [17.6, 1, 1]];
    piece(g, t => { for (const [bx, s, m] of front) stroke(t, armPts(bx, 14.6, s, m, f ? 1 : 0.35), 1.35, 0.55, R[1]); crescent(t, 13.4, 16, 8, 4.4, { [R[1]]: R[2] }); });
    // suckers along the inside of each curl
    for (const [bx, s, m] of front) { const P = armPts(bx, 14.6, s, m, f ? 1 : 0.35); for (const k of [7, 9, 11]) g.ell(P[k][0], P[k][1], 0.32, 0.32, SU, 0, IN(g)); }
    piece(g, t => {
      t.ell(13.4, 8.8, 7.6, 7, R[1]); t.ell(12.2, 7.6, 6.6, 6.3, R[1]);
      for (const [x, y, r] of [[9, 5, 0.9], [11.4, 3.4, 0.7], [7.4, 8.2, 0.6]]) t.ell(x, y, r, r, R[0]);
      crescent(t, 13, 8.4, 8.2, 7.6, { [R[1]]: R[2] }, { hl: R[0] });
    });
    if (AR.chibiEyes) AR.chibiEyes(g, 14.6, 10.4, { sp: 5.4, w: 3, h: 3.9 });
    if (AR.blush) AR.blush(g, 14.4, 12.7, { sp: 7.8, w: 1.15, h: 0.6 });
    if (AR.chibiMouth) AR.chibiMouth(g, 14.7, 12.8, 'smile', 1.6);
  } };

  // =====================================================================================================
  // Bamboo Shark: a small friendly shark, tan with soft darker bands, a long body and tail, a gentle smile (no teeth)
  // =====================================================================================================
  FA.bambooshark = { w: 40, h: 18, draw(g, f) {
    const R = ['#fff4dc', '#f4d8aa', '#dcb684'], BD = ['#d6a272', '#c08c60'], BEL = ['#fffaee', '#f2e2c4'], GL = '#c9a078', sw = f ? 1 : -1;
    const tip = [3.4, 8.4 + sw * 1.0];
    // the tail fin: a long upper lobe tipped up, a little lower one
    piece(g, t => rpoly(t, [[8.8, 8.2 + sw * 0.4], [2.6, 5.4 + sw * 1.2], [1.6, 7 + sw * 1.2], [3.2, 9.4 + sw], [3, 11 + sw * 0.8], [6.8, 11 + sw * 0.4]], 0.75, R[1]));
    // the first dorsal fin (tall, leaning back like a shark's) and the little second one
    piece(g, t => { rpoly(t, [[15.6, 6.4], [17.4, 2], [18.8, 2], [21.8, 5.8]], 0.75, R[1]); rpoly(t, [[9.8, 8], [10.6, 5.6], [11.8, 5.6], [13.2, 7.8]], 0.6, R[1]); });
    piece(g, t => { rpoly(t, [[16.8, 13], [15, 15], [13.8, 14.4], [14.8, 12.8]], 0.6, R[1]); rpoly(t, [[11.6, 11.2], [10.4, 12.8], [9.4, 12.4], [9.8, 10.8]], 0.5, R[1]); });
    piece(g, t => {
      stroke(t, [[18, 9.8], [11, 9.6], [6, 9.2 + sw * 0.4], tip], 3.5, 1, R[1]);
      t.ell(21.4, 9.8, 9.2, 4.8, R[1]); t.ell(30.4, 9.4, 6.6, 5.6, R[1]); t.ell(34.2, 10, 3, 3.4, R[1]);
      paint(t, u => { u.ell(26, 13.4, 11.4, 2.5, BEL[0]); u.ell(32.4, 12.8, 4.8, 2.6, BEL[0]); });
      paint(t, u => { for (const x of [24.6, 20.2, 15.8, 11.4, 7.2]) line(u, [[x + 0.7, 2], [x - 0.5, 12.6]], x > 20 ? 1.05 : 0.9, BD[0]); }, [R[1]]);
      crescent(t, 21, 9.4, 17, 5.4, { [R[1]]: R[2], [BD[0]]: BD[1], [BEL[0]]: BEL[1] }, { hl: R[0], hlOn: [R[1]] });
    });
    // gill slits, then the side fin
    for (const x of [26.4, 27.4, 28.4]) line(g, [[x + 0.2, 8.2], [x - 0.15, 9.8], [x + 0.1, 11.4]], 0.17, GL);
    piece(g, t => rpoly(t, rotAll([[25.4, 12.4], [21.6, 16], [20.4, 15.4], [22.4, 12.4]], [24, 12.4], f ? -0.25 : 0.12), 0.8, R[1]));
    face(g, 32.6, 7.8, 1, 35, 12, { mw: 1.9 });
  } };

  // =====================================================================================================
  // Moon Jelly: a see-through pale pink-lilac bell with four soft rings inside, short frilly tentacles and a tiny happy face.
  // noLine: it draws its own soft lilac edge instead of the bold ink one. Frame 1: the bell squeezes narrower and taller.
  // =====================================================================================================
  FA.jellyfish = { w: 22, h: 23, noLine: true, draw(g, f) {
    const BELL = 'rgba(255, 210, 238, 0.62)', BELL_L = 'rgba(255, 240, 250, 0.82)', BELL_D = 'rgba(234, 168, 216, 0.74)', RING = '#f5a6d6', RING_D = '#e88cc6';
    const TEN = 'rgba(248, 176, 220, 0.9)', EDGE = '#c47cba', cx = 11, rim = 12.2, rx = f ? 7.4 : 8.3, ry = f ? 7.2 : 6.5, cy = rim - ry * 0.46;
    const t = new Grid(g.w, g.h, g.k);
    // short frilly mouth arms and a fringe of fine tentacles round the rim
    for (const [x, ph] of [[cx - 2.4, 0], [cx - 0.8, 1.6], [cx + 0.8, 3.1], [cx + 2.4, 4.6]]) {
      const pts = []; for (let k = 0; k <= 8; k++) { const y = rim + 0.2 + k * 0.85; pts.push([x + Math.sin(ph + k * 0.9 + f * 1.4) * 0.55 + (x - cx) * k * 0.05, y]); }
      stroke(t, pts, 0.75, 0.45, TEN);
      for (let k = 2; k <= 8; k += 2) t.ell(pts[k][0] + (k % 4 ? 0.55 : -0.55), pts[k][1], 0.5, 0.4, TEN);
    }
    for (let x = cx - rx + 1.2; x <= cx + rx - 1.1; x += 1.45) { const w = Math.sin(x * 1.7 + f * 2) * 0.35; stroke(t, [[x, rim], [x + w, rim + 1.3], [x - w * 0.6, rim + 2.4 - Math.abs(x - cx) * 0.06]], 0.24, 0.2, TEN); }
    // the bell: a dome with a scalloped rim
    t.ell(cx, cy, rx, ry, BELL, 0, fine((x, y) => y <= rim));
    for (let x = cx - rx + 0.9; x <= cx + rx - 0.8; x += 1.6) t.ell(x, rim, 0.95, 0.7, BELL);
    const lit = fine((x, y) => PX.inEll(x + 0.25, y + 0.25, cx - rx * 0.16, cy - ry * 0.18, rx * 1.02, ry * 1.02, 0).in);
    for (let i = 0; i < t.a.length; i++) if (t.a[i] === BELL) { const fx = i % t.fw, fy = (i / t.fw) | 0; if (!lit(fx / t.k, fy / t.k) && fy / t.k < rim + 0.8) t.a[i] = BELL_D; }
    t.ell(cx - rx * 0.42, cy - ry * 0.52, rx * 0.26, ry * 0.15, BELL_L, -0.55);
    // the four soft rings, a clover seen from a little above, up in the dome
    for (const [dx, dy] of [[-2.2, 0], [2.2, 0], [0, -1.25], [0, 1.25]]) { const x = cx + dx, y = 5.9 + dy; t.ell(x, y, 1.35, 1.0, RING); t.ell(x, y, 0.85, 0.52, BELL); t.dot(x + 0.4, y + 0.5, RING_D); }
    t.outline(EDGE); t.outline('rgba(196, 124, 186, 0.45)');
    g.merge(t);
    if (AR.chibiEyes) AR.chibiEyes(g, cx + 0.3, rim - 2.8, { sp: 4, w: 1.9, h: 2.4 });
    if (AR.blush) AR.blush(g, cx + 0.3, rim - 1.5, { sp: 5.6, w: 0.85, h: 0.45 });
    if (AR.chibiMouth) AR.chibiMouth(g, cx + 0.35, rim - 1.5, 'smile', 1.2);
  } };

  // =====================================================================================================
  // Sea Turtle: a green sea turtle swimming, a brown patterned shell, flipper strokes on frame 1
  // =====================================================================================================
  FA.seaturtle = { w: 36, h: 24, draw(g, f) {
    const SH = ['#fbe0b4', '#dcaa72', '#c08c58'], SC = ['#f2c890', '#e2b47c'], SK = ['#eef9d8', '#b8e294', '#96c878'], SKD = '#a6d486', PL = ['#fff8e2', '#fbe8c0', '#e6cc98'];
    const up = f ? 1 : 0;
    // the far front flipper (darker, behind) and the back flipper with the little tail
    piece(g, t => rpoly(t, rotAll([[23.4, 12.6], [18.8, 14], [14.4, 18.6], [17.8, 17.8], [23.8, 15]], [23.4, 13.6], up ? 0.35 : -0.3), 0.9, SKD));
    piece(g, t => { rpoly(t, rotAll([[9.8, 13.6], [6.2, 15], [4.8, 16.6], [8.8, 16.2]], [9.6, 14.6], up ? -0.2 : 0.15), 0.8, SK[1]); t.poly([[7.4, 12.2], [4.2, 13.2], [7.4, 14.2]], SK[1]); crescent(t, 7.4, 13.6, 3.6, 2.4, { [SK[1]]: SK[2] }); });
    // head and neck
    piece(g, t => { t.ell(26.6, 12.4, 3.4, 2.6, SK[1]); t.ell(30, 10.8, 4.3, 3.7, SK[1]); crescent(t, 29.4, 11, 5.2, 3.8, { [SK[1]]: SK[2] }, { hl: SK[0] }); });
    // the shell: a dome over a pale belly plate, with lighter scutes
    piece(g, t => {
      box(t, 7.4, 12.2, 26, 15.4, 1.4, PL[1]);
      t.ell(16.6, 12.8, 10.6, 7.9, SH[1], 0, fine((x, y) => y <= 13.6));
      for (const [x, y, rx, ry] of [[11.8, 7.2, 2.3, 1.4], [16.6, 6.2, 2.5, 1.4], [21.4, 7.2, 2.3, 1.4], [8.6, 11.2, 1.9, 1.7], [13.2, 10.6, 2.1, 1.9], [18, 10.4, 2.1, 1.9], [22.8, 10.9, 1.9, 1.8]]) t.ell(x, y, rx, ry, SC[0], 0, ON(t, [SH[1]]));
      crescent(t, 16.6, 11, 11, 6.6, { [SH[1]]: SH[2], [SC[0]]: SC[1], [PL[1]]: PL[2] }, { hl: '#fff0d4', hlOn: [SH[1], SC[0]] });
    });
    // the near front flipper: a long paddle, down-stroke on frame 0, up on frame 1
    piece(g, t => { rpoly(t, rotAll([[25.2, 12.8], [21, 14.2], [15.8, 20.2], [19.6, 19.6], [25.4, 15.6]], [24.6, 13.8], up ? -0.5 : 0), 0.95, SK[1]); crescent(t, 20.4, 16, 5.4, 3.6, { [SK[1]]: SK[2] }); });
    face(g, 31.2, 10, 0.86, 33.7, 12.4, { mw: 1.4 });
  } };

  // =====================================================================================================
  // Golden Clownfish (legendary): art-fish.js's Clownfish (round body, 3 curved white bands, rimmed round fins) a little bigger,
  // in shimmering gold with deep-gold edges, a soft golden glow and white-hearted twinkles
  // =====================================================================================================
  FA.goldclown = { w: 30, h: 22, draw(g, f) {
    const GD = ['#fff6c8', '#ffd65c', '#efb23e'], ED = '#b07a2a', WS = '#f2e6cc', SHN = '#fffbe6';
    const S = 1.15, X = x => 2.4 + x * S, Y = y => 1.4 + y * S, RIM = [[0.8 * S, ED], [1.25 * S, WHITE]];
    piece(g, t => { fanTail(t, X(6.6), Y(8.9), 5 * S, 3.3 * S, GD[1], f); rim(t, X(7.6), Y(8.9), RIM); });
    piece(g, t => { t.ell(X(f ? 10.9 : 11.2), Y(4.2), 3.6 * S, 2.2 * S, GD[1], f ? -0.22 : -0.08); rim(t, X(11.4), Y(8.7), RIM); });
    piece(g, t => { t.ell(X(9.2), Y(13.1), 1.9 * S, 1.4 * S, GD[1], 0.35); t.ell(X(14.4), Y(13.3), 1.3 * S, 1.1 * S, GD[1], -0.3); rim(t, X(11.6), Y(8.7), RIM); });
    piece(g, t => {
      t.ell(X(12.4), Y(8.7), 6.9 * S, 4.8 * S, GD[1]); t.ell(X(15), Y(8.4), 4.6 * S, 4.6 * S, GD[1]);
      const band = (x, y, x0, k, hw) => { const d = Math.abs(x - (x0 - k * (y - 8.7) * (y - 8.7))); return d < hw ? WHITE : d < hw + 0.5 ? ED : null; };
      paintAt(t, (x, y) => { const u = (x - 2.4) / S, v = (y - 1.4) / S; return band(u, v, 14, 0.09, 0.78) || band(u, v, 10.1, 0.06, 0.68) || band(u, v, 6.5, 0, 0.42); });
      // the shimmer: a few bright streaks across the gold
      paint(t, u => { line(u, [[X(11.6), Y(5.6)], [X(11), Y(7)]], 0.3, SHN); line(u, [[X(8.6), Y(7)], [X(8.2), Y(8.2)]], 0.26, SHN); line(u, [[X(16.6), Y(11.6)], [X(17.4), Y(11)]], 0.26, SHN); }, [GD[1]]);
      crescent(t, X(13), Y(8.7), 7.4 * S, 4.9 * S, { [GD[1]]: GD[2], [WHITE]: WS }, { hl: GD[0], hlOn: [GD[1]] });
    });
    // the side fin: a teardrop hinged behind the eye, rimmed in deep gold (f flaps it up)
    piece(g, t => { const fa = f ? 0.12 : 0.6, len = 3 * S, ux = -Math.cos(fa), uy = Math.sin(fa), x = X(13.4), y = Y(10.4), cx = x + ux * len * 0.58, cy = y + uy * len * 0.58; t.ell(cx, cy, len * 0.46, 1.05 * S, GD[1], -fa); t.poly([[x - uy * 0.35, y + ux * 0.35], [cx - uy * 0.95 * S, cy + ux * 0.95 * S], [cx + uy * 0.95 * S, cy - ux * 0.95 * S], [x + uy * 0.35, y - ux * 0.35]], GD[1]); rim(t, x, y, [[0.55, ED]]); });
    face(g, X(17.1), Y(7.9), 1, X(19.1), Y(10.2), { w: 2.9 * S, h: 3.5 * S, mw: 1.4 });
    aura(g, 1.6, [255, 220, 110], 0.42);
    twinkles(g, f, [[26.6, 3.4, 1], [3.6, 3.8, 0.85], [27, 18, 0.8]]);
  } };

  // =====================================================================================================
  // Crystal Seahorse (legendary): an upright seahorse made of pale pastel crystal facets (lilac / aqua / pink) with sparkles
  // =====================================================================================================
  const CRYS = { '#e6d8ff': '#c8b4f0', '#c8f2f2': '#9cdade', '#ffd8ee': '#f2b2d6', '#f8f4ff': '#dcd2f4' };
  const CSEEDS = [[9.4, 3.2, '#e6d8ff'], [11.6, 5, '#c8f2f2'], [8.2, 6, '#ffd8ee'], [13.4, 6.4, '#f8f4ff'], [7.2, 8.8, '#c8f2f2'], [10.4, 9, '#e6d8ff'], [12.2, 12, '#ffd8ee'],
    [8.4, 12.4, '#f8f4ff'], [6.2, 14.6, '#e6d8ff'], [10.2, 15.2, '#c8f2f2'], [8.2, 18, '#ffd8ee'], [11.4, 19.8, '#e6d8ff'], [7.8, 20.4, '#c8f2f2']];
  FA.crystalhorse = { w: 18, h: 24, draw(g, f) {
    const FIN = ['#effcfc', '#c8f2f2', '#9cdade'];
    piece(g, t => rpoly(t, rotAll([[6.6, 9.8], [3.6, 10.4], [3.2, 13.4], [6.4, 13.8]], [6.6, 11.8], f ? 0.25 : -0.1), 0.6, FIN[1]));
    piece(g, t => { for (const [x, y, h] of [[8.2, 2.6, 1.6], [9.6, 2, 2], [11, 2.6, 1.5]]) t.poly([[x - 0.8, y + 1.2], [x, y - h + 0.4], [x + 0.8, y + 1.2]], '#e6d8ff'); });
    piece(g, t => {
      t.ell(9.6, 4.9, 3.1, 2.8, '#e6d8ff', 0.2); stroke(t, [[11.4, 5.5], [12.9, 5.9], [14.2, 6.3]], 1.05, 0.88, '#e6d8ff'); t.ell(14.3, 6.3, 0.85, 1.05, '#e6d8ff');
      stroke(t, [[8.8, 6.4], [7.8, 8.8]], 2, 2, '#e6d8ff');
      t.ell(9.2, 11.6, 3.8, 4.3, '#e6d8ff', 0.12); t.ell(7.8, 11, 2.6, 3.8, '#e6d8ff');
      stroke(t, [[8.6, 14.6], [8.2, 17], [8.6, 19.4], [10.4, 20.9], [12.2, 20.4], [12.6, 18.8], [11.5, 18], [10.7, 18.8]], 1.8, 0.5, '#e6d8ff');
      // crystal facets: each pixel takes the colour of its nearest seed, with a white seam where two facets meet
      const K = t.k;
      for (let i = 0; i < t.a.length; i++) {
        if (!t.a[i]) continue;
        const x = (i % t.fw + 0.5) / K, y = (((i / t.fw) | 0) + 0.5) / K; let d1 = 1e9, d2 = 1e9, c = null;
        for (const [sx, sy, sc] of CSEEDS) { const d = Math.hypot(x - sx, y - sy); if (d < d1) { d2 = d1; d1 = d; c = sc; } else if (d < d2) d2 = d; }
        t.a[i] = d2 - d1 < 0.32 ? WHITE : c;
      }
      crescent(t, 9.6, 11, 5.6, 9.6, CRYS);
    });
    face(g, 10.3, 4.7, 0.7, 13.8, 7.3, { mw: 1, blush: [0, 2.2] });
    aura(g, 1.4, [214, 196, 255], 0.38);
    twinkles(g, f, [[15, 2.4, 0.9], [3, 5.6, 0.8], [15, 15.6, 0.85], [3.4, 19.6, 0.75]], '#d8c4ff');
  } };

  // =====================================================================================================
  // King Neptune Angelfish (legendary): a royal purple and gold angelfish with long flowing fins, a tiny gold crown and twinkles
  // =====================================================================================================
  FA.kingangel = { w: 34, h: 30, draw(g, f) {
    const PU = ['#ecdeff', '#b896f0', '#9a78d8'], FN = ['#f2e8ff', '#c8aaf6', '#a888e0'], GD = ['#fff4c0', '#ffd65a', '#efb03c'], JW = '#ff9cc4';
    const a = f ? -0.16 : 0.12, wv = f ? 0.8 : 0;
    piece(g, t => { tail(t, 12, 15.4, 6.6, 5.4, a, GD[1], 0.38); crescent(t, 8, 15.4, 4.2, 5.4, { [GD[1]]: GD[2] }); });
    const finD = [[20.2, 8.2], [16.6, 4.6], [12.2, 2.8], [7.8, 2.6 + wv], [10.4, 5.6], [12.8, 9.4], [15.4, 10.6]], finA = [[20.2, 22.6], [16.6, 26.2], [12.2, 27.4], [8.2, 27 - wv], [10.6, 24.8], [12.8, 21.4], [15.4, 20.2]];
    for (const P of [finD, finA]) piece(g, t => { rpoly(t, P, 0.9, FN[1]); paint(t, u => line(u, P.slice(0, 4), 0.85, GD[1])); paint(t, u => { line(u, [P[0], P[5]], 0.3, FN[2]); line(u, [P[1], P[4]], 0.3, FN[2]); }, [FN[1]]); crescent(t, 13.4, 15.4, 8, 12, { [FN[1]]: FN[2], [GD[1]]: GD[2] }); });
    piece(g, t => stroke(t, [[20.4, 21.6], [19.4, 24.8], [18 - wv * 0.6, 27.6]], 0.55, 0.32, GD[1]));
    piece(g, t => {
      t.ell(19.4, 15.4, 8, 8.4, PU[1]); t.ell(21.4, 16, 6.4, 6.8, PU[1]);
      for (const [x, r] of [[20.6, 1], [15.4, 1.05]]) paint(t, u => line(u, [[x + 0.6, 6], [x + 1.2, 15.4], [x + 0.4, 25]], r, GD[1]));
      crescent(t, 19.6, 15.4, 8.8, 9, { [PU[1]]: PU[2], [GD[1]]: GD[2] }, { hl: PU[0], hlOn: [PU[1]] });
    });
    piece(g, t => sideFin(t, 20.6, 17.6, 4, 1.25, PI - (f ? 0.95 : 0.5), FN[1]));
    // the tiny gold crown, tipped a little forward
    piece(g, t => { const C = rotAll([[22.2, 8.8], [22, 5.4], [23.4, 6.8], [24.6, 4.6], [25.8, 6.8], [27.2, 5.4], [27, 8.8]], [24.6, 8.8], 0.12); t.poly(C, GD[1]); crescent(t, 24.6, 7, 2.8, 2.2, { [GD[1]]: GD[2] }, { hl: GD[0] }); });
    g.ell(24.7, 7.7, 0.55, 0.55, JW); g.dot(24.5, 7.4, WHITE);
    face(g, 23.8, 13.6, 1.05, 26.6, 17, { mw: 1.6 });
    aura(g, 1.5, [255, 218, 120], 0.38);
    twinkles(g, f, [[31, 5, 1], [4.2, 9.4, 0.85], [30.6, 24.4, 0.8], [5, 22.4, 0.8]]);
  } };
})();
