// art-plants11.js — PVZ Garden: the SECOND set of 8 LEGENDARY hero plants (the prizes for clearing the newer Survival maps), in
// TRUE chibi style (docs/pvz-art-guide.md + docs/chibi-reference.js): Captain Magnet, Grass Knuckles, Beta-Carrotina, Frost
// Fury, Starstrike, Kaboom Twins, Storm Striker and Hypnotica.
// Same contract as art-plants8.js (the first 8 legendaries): PX.PLANT_ART[id] = function (g, stage, P, C) -> geometry,
// PX.PLANT_PAL[id] = palette. The chibi template: the head IS the character (half-width about 8 / 9 / 10 by stage, its bottom
// near row 26), rooted on base leaves or a flared mushroom foot (no legs), big glossy eyes set low and wide, a tiny mouth (Storm
// Striker has none: it is a Lightning Reed), blush, flat pastel fills with one soft shade. Every one is friendly and brave,
// never mad. Heroes add their costume (mask, cape, gloves, visor, wand...) drawn big and simple, and every one carries the
// legendary touch: a few golden twinkles (2 / 3 / 4 by stage) and, at stage 2 ("Legend"), a soft golden aura.
// The core adds the bold outer edge. Walking = a hop on frame 1; arms:'up' = raised gloves / props and a little hop.
(function () {
  'use strict';
  if (!window.PX || !PX.art) return;
  const ART = PX.PLANT_ART, PAL = PX.PLANT_PAL, A = PX.art;
  const { INK, stroke, starPts } = PX;
  const mixHex = A.mixHex;
  const piece = (g, f) => PX.piece(g, f);
  const R = Math.round, PI = Math.PI, cos = Math.cos, sin = Math.sin;
  const T = (s, a, b, c) => (s === 2 ? c : s === 1 ? b : a);
  const WHITE = '#ffffff', HOLE = '#2b2129';
  const flat = M => [M[1], M[1], M[2]];
  const lt = (c, k) => mixHex(c, WHITE, k);
  const fm = fn => { fn.fine = true; return fn; };
  const inside = t => fm((x, y) => t.filled(x, y));
  const inEll = (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  const LEAF = ['#d2f4ac', '#8fd46e', '#68b058'];
  const GOLD = ['#fff6c0', '#ffd75a', '#e0a83a'];
  const SILVER = ['#ffffff', '#eceef4', '#bcc3d2'];
  const ZAP = ['#fffbe0', '#fff07a', '#f2c84a'];

  // ---------------- shared bits (as art-plants8.js) ----------------
  // walking: a hop on frame 1; cheering: a smaller hop
  const hopOf = P => (P.walk && P.frame ? -1.5 : P.arms === 'up' ? -1 : 0);
  // the top row with anything drawn on it (measured BEFORE the twinkles, so hats sit on the head, not on a sparkle)
  function topOf(g) { for (let fy = 0; fy < g.fh; fy++) for (let fx = 0; fx < g.fw; fx++) if (g.fget(fx, fy) !== null) return Math.floor(fy / g.k); return g.h; }
  // soft shade for any flat R[1] silhouette on a piece layer: mid pixels whose neighbour (dx, dy) down-right is outside go R[2]
  function shadeShape(t, Rm, dx, dy) {
    const k = t.k, ox = Math.max(1, R(dx * k)), oy = Math.max(1, R(dy * k)), W = t.fw, list = [];
    for (let fy = 0; fy < t.fh; fy++) for (let fx = 0; fx < W; fx++) if (t.a[fy * W + fx] === Rm[1] && t.fget(fx + ox, fy + oy) === null) list.push(fy * W + fx);
    for (const i of list) t.a[i] = Rm[2];
  }
  // a small soft highlight, only on the shape
  const shine = (t, x, y, rx, ry, col, rot) => t.ell(x, y, rx, ry, col, rot == null ? -0.55 : rot, inside(t));
  // a polygon painted only where mask(x, y) holds (fine-pixel precise)
  function polyIn(t, pts, col, mask) {
    const u = new PX.Grid(t.w, t.h, t.k); u.poly(pts, col);
    for (let i = 0; i < u.a.length; i++) if (u.a[i] !== null) { const x = (i % t.fw) / t.k, y = Math.floor(i / t.fw) / t.k; if (!mask || mask(x, y)) t.a[i] = col; }
  }
  // a stroke through pts painted only where mask(x, y) holds (a pattern that must stay on its shape)
  function strokeIn(t, pts, r, col, mask) {
    const u = new PX.Grid(t.w, t.h, t.k); stroke(u, pts, r, r, col);
    for (let i = 0; i < u.a.length; i++) if (u.a[i] !== null) { const x = (i % t.fw) / t.k, y = Math.floor(i / t.fw) / t.k; if (mask(x, y)) t.a[i] = col; }
  }
  // two little round base leaves (they tip up for a cheer)
  function baseLeaves(g, P, L, o) {
    o = o || {};
    const cx = o.cx == null ? 15.4 : o.cx, sp = o.sp == null ? 4.2 : o.sp, len = o.len || 4.4, y = o.y || 28.7;
    const a = P.arms === 'up' ? -0.5 : P.arms === 'out' || P.arms === 'paddle' ? 0.04 : 0.22, ly = P.arms === 'up' ? y - 0.5 : y;
    piece(g, t => { t.ell(cx - sp, ly, len, 1.9, flat(L), -a); t.ell(cx + sp, ly, len, 1.9, flat(L), a); });
  }
  const stem = (g, x, y0, y1, col, r) => piece(g, t => stroke(t, [[x, y0], [x, y1]], r || 0.95, r || 0.95, col));
  // soft pink cheeks, only on the colours in `on` (so they never paint over a mask or a visor rim)
  function cheeks(g, cx, cy, sp, on, o) {
    o = o || {};
    const ok = fm((x, y) => on.includes(g.get(x, y)));
    for (const x of [cx - sp / 2, cx + sp / 2]) g.ell(x, cy, o.w || 1.5, o.h || 0.85, o.col || '#ffb3c2', 0, ok);
  }
  // BIG glossy eyes (art director v3 ratios) for a face of radius r
  const eyes = (g, ex, ey, r, P, o) => A.chibiEyes(g, ex, ey, Object.assign({ sp: r * 0.86, w: r * 0.48, h: r * 0.64, mood: P.eyes }, o || {}));
  // two little lash flicks at the outer top corner of each open eye (the heroines)
  function lashes(g, ex, ey, esp, ew, eh, P) {
    if (P.eyes === 'happy' || P.eyes === 'closed' || P.eyes === 'blink') return;
    for (const s of [-1, 1]) {
      const x = ex + s * esp / 2, rx = ew / 2, ry = eh / 2;
      stroke(g, [[x + s * rx * 0.62, ey - ry * 0.8], [x + s * (rx * 0.62 + 0.7), ey - ry * 0.8 - 0.8]], 0.26, 0.26, INK);
      stroke(g, [[x + s * rx * 0.92, ey - ry * 0.42], [x + s * (rx * 0.92 + 0.85), ey - ry * 0.42 - 0.45]], 0.26, 0.26, INK);
    }
  }
  // a flowing ribbon / scarf tail: a tapered stroke through pts
  const ribbon = (t, pts, w0, w1, col) => stroke(t, pts, w0, w1, col);
  // a little lightning bolt (top-left corner x, y; size s; about 2 s wide and 3.9 s tall)
  const bolt = (t, x, y, s, col) => t.poly([[0, 0], [1.7, 0], [0.8, 1.4], [2, 1.4], [-0.3, 3.9], [0.4, 2.1], [-0.7, 2.1]].map(([a, b]) => [x + a * s, y + b * s]), col);
  // a pointed leaf / blade from its base (x, y): length len, angle ang (0 = right, negative = up), half width w
  function pointLeaf(t, x, y, len, ang, w, col) {
    const c = cos(ang), s = sin(ang), nx = -s * w, ny = c * w, pts = [];
    const prof = [[0, 0.3], [0.18, 0.82], [0.42, 1], [0.66, 0.82], [0.86, 0.42], [1, 0]];
    for (const [u, k] of prof) pts.push([x + c * len * u + nx * k, y + s * len * u + ny * k]);
    for (let i = prof.length - 2; i >= 0; i--) { const [u, k] = prof[i]; pts.push([x + c * len * u - nx * k, y + s * len * u - ny * k]); }
    t.poly(pts, col);
  }

  // ---------------- the hero costume kit ----------------
  // a superhero cape (Green Shadow's, made general): a wedge flying back from behind the head (centre hx, hy; half-size rx, ry),
  // pinned at the back (o.top = how high, in ry) and the neck, its hem cut into points (2 / 3 / 3 by stage), a lighter lining
  // where the top flips over in the wind and a fold line to each notch. It flutters more as the plant runs.
  // o: { len: [stage 0, 1, 2] length past the head, gold: a gold hem (Legend), foot: the lowest row, deco(t, bx, cl, yAt) }.
  // Returns { bx, cl, fl } (the back of the head, the cape's reach, the flutter) for placing tails and twinkles.
  function heroCape(g, stage, P, CP, o) {
    const f = P.frame ? 1 : 0, fl = P.walk ? (f ? 1.4 : 0.7) : f ? 0.3 : 0, cl = T(stage, o.len[0], o.len[1], o.len[2]) + fl;
    const hx = o.hx, hy = o.hy, rx = o.rx, ry = o.ry, bx = hx - rx, foot = o.foot || 29.2, tp = o.top == null ? -0.32 : o.top;
    const tips = T(stage, [[1.0, 0.18], [0.62, 0.95]], [[1.0, 0.12], [0.86, 0.56], [0.5, 1.0]], [[1.0, 0.1], [0.88, 0.55], [0.52, 1.0]]);
    const yAt = k => Math.min(foot - 0.3, hy + ry * (-0.05 + k * 0.98) + (k >= 0.99 ? 0 : -fl * 0.35 * (1 - k)));
    const pts = [[hx + 1.5, Math.min(foot, hy + ry * 0.55)], [hx - rx * 0.3, hy + ry * (tp + 0.12)], [bx + 0.6, hy + ry * tp]];
    // (the points stop a pixel short of the left edge, so a long cape flapping on the run is never clipped)
    tips.forEach(([kx, ky], i) => { pts.push([Math.max(1.1, bx - cl * kx), yAt(ky)]); const nx = tips[i + 1]; if (nx) pts.push([Math.max(1.6, bx - cl * (kx + nx[0]) * 0.28), yAt((ky + nx[1]) / 2 + 0.06)]); });
    pts.push([hx - 2.4, foot], [hx + 1, foot]);
    piece(g, t => {
      t.poly(pts, CP[1]); shadeShape(t, CP, 0.9, 1.1);
      polyIn(t, [[bx + 0.6, hy + ry * tp], [bx - cl * tips[0][0], yAt(tips[0][1])], [bx - cl * 0.5, yAt(tips[0][1]) + 1.4], [bx + 1.2, hy + ry * (tp + 0.27)]], CP[0], (x, y) => t.get(x, y) === CP[1] || t.get(x, y) === CP[2]);
      for (let i = 0; i < tips.length - 1; i++) { const nx = tips[i + 1], kx = tips[i][0]; stroke(t, [[bx + 0.4, hy + ry * 0.2 + i * 1.2], [bx - cl * (kx + nx[0]) * 0.24, yAt((tips[i][1] + nx[1]) / 2 + 0.06) - 0.5]], 0.22, 0.22, CP[2]); }
      if (o.deco) o.deco(t, bx, cl, yAt);
      if (o.gold) { // a gold hem along the points
        const src = t.a.slice();
        for (let i = 0; i < t.a.length; i++) { const c = src[i]; if (c === null || c === INK) continue; const fx = i % t.fw, fy = Math.floor(i / t.fw); if (fx / t.k > bx + 0.2) continue; for (const [dx, dy] of [[-2, 0], [-2, 2], [0, 2], [-1, 1], [-2, 1]]) if (src[(fy + dy) * t.fw + fx + dx] === null) { t.a[i] = GOLD[1]; break; } }
      }
    });
    return { bx, cl, fl };
  }
  // a superhero domino mask over a pair of big eyes (centre ex, ey; eye size ew x eh; eye spacing esp), Green Shadow's shape:
  // a flat top with upswept pointed tips, dipping under each eye with a notch over the nose. onFace(x, y) keeps it on the face
  // (the tips may sweep up past the outline); o.strap = the x its strap runs back to; o.pad = the rim round each eye.
  // The eye holes stay open so the big eyes show through. Returns the strap's row (for the knot's tails).
  function domino(g, ex, ey, ew, eh, esp, MK, onFace, o) {
    o = o || {};
    const lx = ex - esp / 2, rx2 = ex + esp / 2, mrx = ew / 2 + (o.pad || 1.4), tp = o.tip == null ? 1.8 : o.tip, ky = ey - eh * 0.3;
    // (Green Shadow's approved SLIM proportions: the edges sit only just past the eyes, so the eye holes break through and the
    // lower half of each eye sits on skin. A thick band round the eyes read as goggles, or a dark blob, at kid size.)
    const mry = eh / 2 + 0.25, myb = mry;
    piece(g, t => {
      polyIn(t, [[lx - mrx - tp * 1.1, ey - mry - tp], [lx - mrx * 0.3, ey - mry + 0.1], [ex, ey - mry + 0.35], [rx2 + mrx * 0.3, ey - mry + 0.1], [rx2 + mrx + tp * 0.83, ey - mry - tp],
        [rx2 + mrx + 0.1, ey + 0.3], [rx2 + mrx * 0.55, ey + myb * 0.9], [rx2, ey + myb + 0.1], [rx2 - mrx * 0.6, ey + myb * 0.8], [ex, ey + myb * 0.1],
        [lx + mrx * 0.6, ey + myb * 0.8], [lx, ey + myb + 0.1], [lx - mrx * 0.55, ey + myb * 0.9], [lx - mrx - 0.1, ey + 0.3]], MK[1], (x, y) => onFace(x, y) || (!o.clip && y < ey));
      if (o.strap != null) polyIn(t, [[lx - mrx + 0.5, ky - 0.9], [o.strap, ky - 0.6], [o.strap, ky + 0.8], [lx - mrx + 0.5, ky + 1.0]], MK[1], onFace);
      shadeShape(t, MK, 0.45, 0.55);
      for (const x of [lx, rx2]) shine(t, x - mrx * 0.5, ey - mry * 0.7, 0.9, 0.3, MK[0], -0.15);
      for (const x of [lx, rx2]) t.ell(x, ey, ew / 2 + 0.75, eh / 2 + 0.6, null);
    });
    return ky;
  }
  // the mask's two ribbon tails, flying back from the knot at (x, y); fl = the cape's flutter, s = length
  function maskTails(g, x, y, fl, MK, s) {
    s = Math.min(s || 1, (x - 1.1) / 3.4);
    piece(g, t => {
      ribbon(t, [[x + 1.2, y], [x - 1.2 * s, y - 1.2 - fl * 0.4], [x - 3.0 * s, y - 2.4 - fl * 0.8]], 0.95, 0.42, MK[1]);
      ribbon(t, [[x + 1.2, y + 0.3], [x - 1.4 * s, y + 0.4 - fl * 0.2], [x - 3.4 * s, y + 0.6 - fl * 0.6]], 0.9, 0.4, MK[1]);
      shadeShape(t, MK, 0.3, 0.4);
    });
  }
  // a round gold hero emblem (centre x, y; radius er) with a lightning bolt in colour col, or a snowflake (sym 'flake')
  function emblem(g, x, y, er, col, sym) {
    piece(g, t => { t.ell(x, y, er, er * 0.95, GOLD[1]); shadeShape(t, GOLD, 0.4, 0.45); shine(t, x - er * 0.45, y - er * 0.5, er * 0.3, er * 0.18, GOLD[0]); });
    if (sym === 'flake') for (let i = 0; i < 3; i++) { const a = PI / 2 + i * PI / 3, d = er * 0.68; stroke(g, [[x - cos(a) * d, y - sin(a) * d], [x + cos(a) * d, y + sin(a) * d]], 0.24, 0.24, col); }
    else piece(g, t => bolt(t, x - 0.3 * er, y - 0.98 * er, er * 0.52, col));
  }

  // ---------------- the legendary touch (as art-plants8.js) ----------------
  // a golden four-point twinkle (its own outlined piece) with a white heart
  function twinkle(g, x, y, s, col) {
    // (centred on a fine pixel, or the thin spikes can miss every pixel centre and vanish)
    const k = g.k; x = (Math.floor(x * k) + 0.5) / k; y = (Math.floor(y * k) + 0.5) / k;
    piece(g, t => t.poly(starPts(x, y, 1.7 * s, 0.55 * s, 4), col || '#ffe27a'));
    g.dot(x, y, WHITE); if (s > 0.85) g.dot(x - 0.5, y, '#fffbe0');
  }
  // the twinkles: spots = [[x, y, size], ...]; stage 0 shows 2, stage 1 3, stage 2 4. They shimmer with the frame, and skip a
  // spot that is already drawn on.
  function twinkles(g, stage, P, spots) {
    const n = T(stage, 2, 3, 4), f = P.frame ? 1 : 0;
    spots.slice(0, n).forEach(([x, y, s], i) => {
      const ss = Math.max(0.8, s * ((i + f) % 2 ? 0.8 : 1)), m = 1.7 * ss + 0.5;
      const xx = Math.max(m, Math.min(32 - m, x)), yy = Math.max(m, Math.min(30.4, y));
      const c = g.get(xx, yy); if (c && c[0] === '#') return;
      twinkle(g, xx, yy, ss);
    });
  }
  // a soft see-through glow round the whole silhouette (no bold edge on it): width w art px, colour [r, g, b], alpha a, and only
  // above art row maxY when given. A quick two-pass distance map keeps it cheap (sprites are drawn often in the tools).
  function aura(g, w, rgb, a, maxY) {
    const W = g.fw, H = g.fh, N = W * H, BIG = 1e6, d = new Float32Array(N), k = g.k;
    for (let i = 0; i < N; i++) { const c = g.a[i]; d[i] = c !== null && c[0] !== 'r' ? 0 : BIG; }
    const D1 = 1, D2 = 1.414;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; let v = d[i]; if (!v) continue;
      if (x > 0) v = Math.min(v, d[i - 1] + D1);
      if (y > 0) { v = Math.min(v, d[i - W] + D1); if (x > 0) v = Math.min(v, d[i - W - 1] + D2); if (x < W - 1) v = Math.min(v, d[i - W + 1] + D2); }
      d[i] = v;
    }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x; let v = d[i]; if (!v) continue;
      if (x < W - 1) v = Math.min(v, d[i + 1] + D1);
      if (y < H - 1) { v = Math.min(v, d[i + W] + D1); if (x < W - 1) v = Math.min(v, d[i + W + 1] + D2); if (x > 0) v = Math.min(v, d[i + W - 1] + D2); }
      d[i] = v;
    }
    const r1 = w * k * 0.5, r2 = w * k, s = rgb.join(',');
    const inner = `rgba(${s},${a})`, outer = `rgba(${s},${(a * 0.5).toFixed(2)})`;
    const lim = maxY == null ? N : Math.min(N, Math.ceil(maxY * k) * W);
    for (let i = 0; i < lim; i++) { const v = d[i]; if (!v || v > r2 + 0.01) continue; if (g.a[i] === null) g.a[i] = v <= r1 + 0.6 ? inner : outer; }
  }
  const legendAura = (g, stage) => { if (stage === 2) aura(g, 2.6, [255, 222, 120], 0.42); };

  // =====================================================================================================
  // Captain Magnet -> Major Magnet -> Captain Magnet Legend
  // A superhero Magnet-shroom: the plump purple mushroom (the face) flaring out to the ground, a big red horseshoe magnet with
  // silver tips on its head like the real one, a navy domino mask (the big eyes show through) knotted at the back with flying
  // tails, a red cape flying back and a small gold emblem with a red lightning bolt low on its front, under its smile. Major:
  // bigger, a longer cape and a red hero belt (the cape's colour, so it pops off the lilac) with silver studs round its flare,
  // the emblem as its buckle (a mushroom has no shoulders: pads there read as ears or paws at sprite size); Legend: gold studs,
  // a gold hem, gold bands on the magnet and the aura.
  PAL.captainmagnet = { main: ['#efe0ff', '#c2a2f0', '#a282d8'], leaf: LEAF, acc: ['#ffc8cc', '#f2606c', '#d64a5c'], stem: '#72bb5a', root: '#a8865a', part: 'magnet' };
  const MAGNET = ['#ffd2d6', '#f46e78', '#d8505e'];
  // (a step lighter than a true navy, so the mask never goes muddy against the lilac)
  const NAVY = ['#b8c4ff', '#5868c0', '#4858ac'];
  // the horseshoe magnet: a chunky U (arms up, flat ends) with silver tips. cx = centre, by = outer bottom, ro / ri = outer /
  // inner radius of the bend, h = height from the bottom to the arm tops; gold = gold bands where the tips meet the red
  function magnetU(g, cx, by, ro, ri, h, body, gold) {
    const cy = by - ro, ty = by - h, U = [[cx - ro, ty]];
    for (let i = 0; i <= 16; i++) { const an = PI - i * PI / 16; U.push([cx + cos(an) * ro, cy + sin(an) * ro]); }
    U.push([cx + ro, ty], [cx + ri, ty]);
    for (let i = 0; i <= 16; i++) { const an = i * PI / 16; U.push([cx + cos(an) * ri, cy + sin(an) * ri]); }
    U.push([cx - ri, ty]);
    piece(g, t => { t.poly(U, body[1]); shadeShape(t, body, (ro - ri) * 0.3, (ro - ri) * 0.3); });
    const th = Math.max(1.6, (ro - ri) * 0.62);
    piece(g, t => { for (const s of [-1, 1]) t.poly([[cx + s * ri, ty], [cx + s * ro, ty], [cx + s * ro, ty + th], [cx + s * ri, ty + th]], SILVER[1]); shadeShape(t, SILVER, 0.5, 0.5); });
    if (gold) for (const s of [-1, 1]) piece(g, t => t.poly([[cx + s * ri, ty + th], [cx + s * ro, ty + th], [cx + s * ro, ty + th + 0.9], [cx + s * ri, ty + th + 0.9]], GOLD[1]));
    // shines: a soft streak down the outside of the left arm, glints on the tips
    stroke(g, [[cx - ro + (ro - ri) * 0.3, ty + th + (gold ? 1.9 : 1)], [cx - ro + (ro - ri) * 0.3, cy + 0.2]], 0.32, 0.32, body[0]);
    for (const s of [-1, 1]) g.dots([[cx + s * (ri + ro) / 2 - (ro - ri) * 0.25, ty + 0.6], [cx + s * (ri + ro) / 2 - (ro - ri) * 0.25 + 0.5, ty + 0.6]], WHITE);
    return { tl: [cx - (ro + ri) / 2, ty], tr: [cx + (ro + ri) / 2, ty] };
  }
  ART.captainmagnet = function (g, stage, P, C) {
    const M = C.main, CP = C.acc, h = hopOf(P), sq = P.walk && !P.frame ? 0.35 : 0, up = P.arms === 'up' ? 1 : 0;
    const r = T(stage, 8, 9, 10), rx = r * 0.88 + sq, ry = r * 0.8 - sq * 0.5, hx = 15.4, hy = 26.8 - ry + h, top0 = hy - ry;
    const fr = r * 0.92, ex = hx + 0.8, ey = hy + ry * 0.16, ew = fr * 0.48, eh = fr * 0.64, esp = fr * 0.86;
    const inBody = inEll(hx, hy, rx + 0.2, ry + 0.2);
    // the red cape, flying back from its shoulders (Legend: a gold hem), and its high collar from Major
    const cp = heroCape(g, stage, P, CP, { hx, hy, rx, ry, len: [4.6, 5.8, 6.4], gold: stage === 2, top: -0.12 });
    // the mask's ribbon tails, flying back from the knot behind its head
    const ky = ey - eh * 0.3;
    maskTails(g, hx - rx + 0.6, ky, cp.fl, NAVY);
    // the body: a plump purple mushroom (a small fuller bulge low at the back) flaring out to the ground: no feet
    piece(g, t => {
      t.ell(hx, hy, rx, ry, M[1]); t.ell(hx - rx * 0.1, hy + ry * 0.3, rx * 0.96, ry * 0.7, M[1]); t.ell(hx, 28.4 + h, rx + 0.7 + sq, 1.9, M[1]);
      shadeShape(t, M, rx * 0.15, ry * 0.15); shine(t, hx - rx * 0.42, hy - ry * 0.5, rx * 0.22, ry * 0.13, M[0]);
    });
    // the big red-and-silver horseshoe magnet, its bend sinking into the top of the head
    const ro = rx * 0.9, ri = ro * 0.42, mh = T(stage, 8.2, 9.0, 8.8);
    const tips = magnetU(g, hx + 0.2, top0 + 2.6, ro, ri, mh, MAGNET, stage === 2);
    domino(g, ex, ey, ew, eh, esp, NAVY, inBody, { strap: hx - rx - 0.5, tip: 1.0 });
    eyes(g, ex, ey, fr, P);
    cheeks(g, ex - 0.2, ey + fr * 0.42 + 0.7, fr * 1.04, [M[0], M[1], M[2]]);
    // Major and Legend: a red hero belt (the cape's colour: a navy one sank into the shade) round the flare of the mushroom,
    // with shiny studs (silver, gold for Legend). It sits low on the flare, so the smile keeps a band of lilac above it.
    const by = 27.7 + h;
    if (stage >= 1) {
      const inFoot = fm((x, y) => inBody(x, y) || inEll(hx, 28.4 + h, rx + 0.9 + sq, 2.1)(x, y));
      piece(g, t => { t.ell(hx, by, rx + 2, 1.0, CP[1], 0, fm((x, y) => inFoot(x, y) && Math.abs(y - by + 0.5 * ((x - hx) / rx) ** 2) <= 0.85)); shadeShape(t, CP, 0.3, 0.4); });
      for (const k of [-0.78, -0.48, 0.62, 0.86]) { const x = hx + k * rx, y = by - 0.5 * k * k; if (g.filled(x, y)) g.ell(x, y, 0.4, 0.4, stage === 2 ? GOLD[1] : SILVER[1]); }
    }
    // the hero emblem, small and low on its front where the mushroom flares out (the belt's buckle from Major); its top stays
    // clear of the smile, and the smile is drawn after it anyway so it always shows
    emblem(g, hx + 0.5, by + 0.3, T(stage, 1.5, 1.7, 1.9), CP[2]);
    A.chibiMouth(g, ex, ey + fr * 0.48, P.mouth || 'smile', 2.0);
    const top = topOf(g);
    legendAura(g, stage);
    twinkles(g, stage, P, [[hx + ro + 3.2, tips.tr[1] + 1.6, 1], [hx - ro - 3.0, tips.tl[1] + 2.4, 0.85], [hx + rx + 3.6, hy + 2.2, 0.8], [cp.bx - cp.cl - 0.6, hy - ry * 0.1, 0.8]]);
    return { hx: R(hx), hy: R(hy - 1), hr: R(rx), top, ey: R(ey), hat: { x: R(hx), y: R(top0 + 1.6), w: R(ri * 2 + 2) } };
  };

  // =====================================================================================================
  // Grass Knuckles -> Grass Knuckles Champ -> Grass Knuckles Legend
  // A grass-tuft boxer hero: a round grass-green head with a bushy crown of long grass blades (two rows, so each blade shows),
  // a white sweatband with a red stripe across its forehead, and two BIG red boxing gloves held up in a guard (one in front, low
  // beside its smile; one behind): a round mitt with a thumb, a white cuff and a little leaf tucked in it. Champ: a taller tuft
  // and bigger gloves; Legend: the tallest tuft, a red champion belt with a big gold plate round its middle and the aura.
  // A cheer punches both gloves up high.
  PAL.grassknuckles = { main: ['#e2f8bc', '#a6dc78', '#82c05c'], leaf: LEAF, acc: ['#ffc8c8', '#f2646e', '#d24a5a'], stem: '#5aa64c', root: '#a8865a', part: 'gloves' };
  const BAND = ['#ffffff', '#f6f6fa', '#d4d8e4'];
  // a big boxing glove centred (x, y), size s, its wrist toward angle ca: a round red mitt with the thumb bump on the side ta
  // and a crease between them, a shine, then a white cuff round the wrist with a little leaf tucked in it (behind)
  function glove(g, x, y, s, ca, ta, GL, L) {
    const wx = x + cos(ca) * s * 0.92, wy = y + sin(ca) * s * 0.92;
    piece(g, t => { pointLeaf(t, wx, wy, s * 0.95, ca - 0.6, s * 0.3, L[1]); shadeShape(t, L, 0.3, 0.35); });
    const tx = x + cos(ta) * s * 0.66, ty = y + sin(ta) * s * 0.66;
    piece(g, t => {
      t.ell(x, y, s, s * 0.86, GL[1], ca + PI / 2); t.ell(tx, ty, s * 0.46, s * 0.4, GL[1], ta);
      shadeShape(t, GL, s * 0.18, s * 0.2); shine(t, x - s * 0.36, y - s * 0.4, s * 0.32, s * 0.16, GL[0]);
      // the crease between the thumb and the mitt
      const c = cos(ta), sn = sin(ta), d = s * 0.36;
      stroke(t, [[x + c * d - sn * s * 0.42, y + sn * d + c * s * 0.42], [x + c * d * 1.25, y + sn * d * 1.25], [x + c * d + sn * s * 0.42, y + sn * d - c * s * 0.42]], 0.2, 0.2, GL[2]);
    });
    piece(g, t => { t.ell(wx, wy, s * 0.36, s * 0.62, BAND[1], ca); shadeShape(t, BAND, 0.3, 0.35); });
  }
  ART.grassknuckles = function (g, stage, P, C) {
    const M = C.main, GL = C.acc, L = C.leaf, f = P.frame ? 1 : 0, h = hopOf(P), up = P.arms === 'up';
    const r = T(stage, 8, 9, 10), rx = r * 1.04, ry = r * 0.94, hx = 14.6, hy = 26.2 - ry + h, top0 = hy - ry;
    const ex = hx + 0.8, ey = hy + ry * 0.2, ew = r * 0.48, eh = r * 0.64, esp = r * 0.86;
    // the grass tuft: long pointed blades fanning up off the top of its head (behind it), the middle ones tallest; a darker
    // back row and a lighter front row so every blade shows
    const BK = [M[1], mixHex(M[1], M[2], 0.75), mixHex(M[2], '#3e7a40', 0.35)], FR = [M[0], mixHex(M[1], M[2], 0.25), mixHex(M[2], '#3e7a40', 0.15)];
    const n = T(stage, 7, 8, 9), bl = T(stage, 3.6, 4.0, 4.2), sway = P.walk ? (f ? 0.12 : -0.04) : 0;
    for (const row of [0, 1]) piece(g, t => {
      for (let i = row; i < n; i += 2) {
        const k = i / (n - 1), a = -2.5 + k * 1.75 + sway, b = -2.35 + k * 1.55, mid = 1 - Math.abs(k - 0.5) * 0.75;
        pointLeaf(t, hx + cos(b) * rx * 0.76, hy + sin(b) * ry * 0.78, bl * mid + 2.0 + (row ? 0 : 0.7), a, 1.0, (row ? FR : BK)[1]);
      }
      shadeShape(t, row ? FR : BK, 0.3, 0.35);
    });
    // the back glove, behind the head (high for a cheer)
    const gs = T(stage, 3.4, 3.7, 4.0), bob = P.walk ? (f ? -0.5 : 0.3) : 0;
    if (up) glove(g, hx - rx * 0.8, top0 + 2.6, gs * 0.92, 1.9, -1.0, GL, L);
    else glove(g, hx - rx + 0.5, hy + ry * 0.3 - bob, gs * 0.92, 1.9, -1.2, GL, L);
    baseLeaves(g, P, L, { cx: 15.0 });
    stem(g, 15.0, 28.6, hy + ry - 1, C.stem);
    // the head: round, a touch wider than tall, a little fuller at the back
    piece(g, t => {
      t.ell(hx, hy, rx, ry, M[1]); t.ell(hx - rx * 0.12, hy - ry * 0.08, rx * 0.88, ry * 0.9, M[1]);
      shadeShape(t, M, rx * 0.15, ry * 0.16); shine(t, hx - rx * 0.42, hy - ry * 0.46, rx * 0.22, ry * 0.13, M[0]);
    });
    // the sweatband round its forehead (its edges curve with the head), a red stripe along the middle
    const inHead = inEll(hx, hy, rx + 0.05, ry + 0.05), b0 = ey - eh / 2 - 2.7, bw = T(stage, 2.0, 2.1, 2.3), cv = x => 0.6 * ((x - hx) / rx) ** 2;
    piece(g, t => {
      t.ell(hx, b0 + bw / 2, rx + 1, bw, BAND[1], 0, fm((x, y) => inHead(x, y) && y >= b0 + cv(x) && y <= b0 + bw + cv(x)));
      shadeShape(t, BAND, 0.3, 0.4);
      for (let x = hx - rx; x <= hx + rx; x += 0.5) { const y = b0 + bw / 2 + cv(x); if (t.filled(x, y)) t.dot(x, y, GL[1]); if (t.filled(x, y + 0.5) && bw > 2.05) t.dot(x, y + 0.5, GL[1]); }
    });
    eyes(g, ex, ey, r, P);
    cheeks(g, ex - 0.2, ey + r * 0.42 + 0.2, r * 1.0, [M[0], M[1], M[2]]);
    A.chibiMouth(g, ex + 0.1, ey + r * 0.48, P.mouth || 'smile', 2.2);
    // Legend: the champion belt round the bottom of its head, a big gold plate in front with a red jewel and a white star
    if (stage === 2) {
      const by = hy + ry * 0.97, px = hx + 0.4;
      piece(g, t => { t.ell(hx, by, rx + 1, 1.0, GL[1], 0, fm((x, y) => inHead(x, y) && Math.abs(y - by + cv(x) * 1.6) <= 0.85)); shadeShape(t, GL, 0.3, 0.4); });
      piece(g, t => {
        t.poly([[px - 2.6, by - 1.6], [px + 2.6, by - 1.6], [px + 3.3, by], [px + 2.6, by + 1.6], [px - 2.6, by + 1.6], [px - 3.3, by]], GOLD[1]);
        shadeShape(t, GOLD, 0.45, 0.5); shine(t, px - 1.6, by - 0.9, 1.0, 0.3, GOLD[0], 0);
        t.ell(px, by, 1.35, 1.2, GL[1]); t.poly(starPts(px, by + 0.05, 1.0, 0.42, 5), WHITE);
      });
    }
    // the front glove, held up low beside its smile (punching forward on the walk; up high for a cheer)
    if (up) glove(g, hx + rx * 0.9, top0 + 2.2, gs, 2.3, -2.2, GL, L);
    else glove(g, hx + rx + 0.5 + (P.walk && f ? 0.6 : 0) + (P.arms === 'hold' || P.arms === 'out' ? 0.6 : 0), hy + ry * 0.48 + bob, gs, 2.45, -2.0, GL, L);
    const top = topOf(g);
    legendAura(g, stage);
    twinkles(g, stage, P, [[hx + rx + 3.0, top0 - 0.2, 1], [hx - rx - 2.4, top0 - 0.6, 0.85], [hx - rx - 2.6, hy + ry * 0.95, 0.8], [hx + 3.4, top0 - 5.6, 0.8]]);
    return { hx: R(hx), hy: R(hy), hr: R(rx), top, ey: R(ey), front: R(hx + rx + gs), hat: { x: R(hx), y: R(b0 + 0.6), w: R(rx * 1.6) } };
  };

  // =====================================================================================================
  // Beta-Carrotina -> Beta-Carrotina Prime -> Beta-Carrotina Legend
  // A carrot heroine: the chunky orange carrot (a round top tapering to a rounded tip between her base leaves) with green leafy
  // hair swept back in a ponytail, a see-through cyan laser visor across her eyes (the big eyes and lashes still show through, a
  // dark rim and two glints), a smile, and a little white rocket pack on her back with a red nose cone and a flickering flame.
  // Prime: fuller hair, a bigger rocket with fins and a bigger flame; Legend: the fullest hair, a gold visor rim, a gold nose
  // cone and the aura.
  PAL.betacarrotina = { main: ['#ffe6c4', '#ffb272', '#f28e54'], leaf: LEAF, acc: ['#e6fcff', '#8ee6f6', '#52c2e0'], stem: '#62ac50', root: '#8a6a3a', part: 'herocape' };
  const ROCKET = ['#ffffff', '#eef0f6', '#c2c8d8'], NOSE = ['#ffc8cc', '#f2646e', '#d44a5a'], FLAME = ['#fff4c0', '#ffd25a', '#ff9a4e'];
  ART.betacarrotina = function (g, stage, P, C) {
    const h = hopOf(P), M = C.main, L = C.leaf, V = C.acc, f = P.frame ? 1 : 0, cx = 16.2;
    const r = T(stage, 8.0, 8.8, 9.5), w = r * 0.98, tipY = 29.7 + h, top0 = tipY - w * 2 * 1.09, rx = w, ry = w * 0.92, cy = top0 + ry, ty = top0 + 1.1;
    // the leafy hair: pointed leaves fanning up and back from the top, the back ones longest (a ponytail streaming back)
    const hair = T(stage, [[-0.95, 4.2], [-1.55, 5.4], [-2.2, 6.0], [-2.75, 6.6]], [[-0.85, 4.4], [-1.4, 5.8], [-1.95, 6.4], [-2.45, 7.0], [-2.9, 7.0]],
      [[-0.8, 4.6], [-1.3, 6.0], [-1.8, 6.8], [-2.25, 7.4], [-2.65, 7.6], [-3.05, 7.0]]);
    const sw = P.walk ? (f ? 0.12 : 0.04) : 0;
    piece(g, t => {
      for (const [a0, len] of hair) { const a = a0 - (a0 < -2 ? sw : 0); pointLeaf(t, cx - 0.4, ty + 0.8, len, a, 1.5, L[1]); }
      shadeShape(t, L, 0.4, 0.5);
      for (const [a0, len] of hair) stroke(t, [[cx - 0.4 + cos(a0) * 1.2, ty + 0.8 + sin(a0) * 1.2], [cx - 0.4 + cos(a0) * len * 0.72, ty + 0.8 + sin(a0) * len * 0.72]], 0.18, 0.18, L[2]);
    });
    // the rocket pack on her back: a white capsule leaning back, a red nose cone, fins from Prime, a flame from its nozzle
    const rs = T(stage, 1.2, 1.32, 1.42), rkx = cx - rx - 0.6, rky = cy + 1.2, ra = -0.3, ca = cos(ra), sa = sin(ra);
    const at = (u, v) => [rkx + u * ca - v * sa, rky + u * sa + v * ca];
    const fh = T(stage, 2.6, 3.3, 3.9) * (f ? 1.15 : 0.9);
    piece(g, t => { const [x, y] = at(0, 3.6 * rs); t.ell(x, y + fh * 0.45, 1.3 * rs, fh * 0.62, FLAME[2], ra); t.poly([at(-1.1 * rs, 3.6 * rs), at(0, 3.6 * rs + fh * 1.25), at(1.1 * rs, 3.6 * rs)], FLAME[2]); });
    piece(g, t => { const [x, y] = at(0, 3.6 * rs); t.ell(x, y + fh * 0.3, 0.7 * rs, fh * 0.42, FLAME[1], ra); t.ell(x, y + fh * 0.12, 0.38 * rs, fh * 0.22, FLAME[0], ra); });
    if (stage >= 1) piece(g, t => { for (const s of [-1, 1]) t.poly([at(s * 1.2 * rs, 1.0 * rs), at(s * 2.5 * rs, 2.9 * rs), at(s * 2.4 * rs, 3.9 * rs), at(s * 1.2 * rs, 3.0 * rs)], NOSE[1]); shadeShape(t, NOSE, 0.3, 0.35); });
    piece(g, t => {
      const [x, y] = at(0, 0.4 * rs); t.ell(x, y, 1.65 * rs, 3.5 * rs, ROCKET[1], ra);
      shadeShape(t, ROCKET, 0.45, 0.5); shine(t, x - 0.6, y - 0.6, 0.4, 1.3 * rs, WHITE, ra);
      const [nx, ny] = at(0, 3.3 * rs); t.ell(nx, ny, 1.3 * rs, 0.6, '#9aa4ba', ra);
    });
    piece(g, t => { const N2 = stage === 2 ? GOLD : NOSE, [x, y] = at(0, -2.2 * rs); t.ell(x, y, 1.6 * rs, 1.5 * rs, N2[1], ra, fm((xx, yy) => (yy - y) * ca - (xx - x) * sa <= 0.3)); t.poly([at(-1.6 * rs, -2.0 * rs), at(0, -4.6 * rs), at(1.6 * rs, -2.0 * rs)], N2[1]); shadeShape(t, N2, 0.35, 0.4); });
    // the base leaves sit behind the carrot, so its rounded tip shows between them
    baseLeaves(g, P, L, { cx: 15.8, sp: 4.8 });
    // the carrot: a round top, a chunky middle and a taper down to a rounded tip
    const inCarrot = fm((x, y) => ((x - cx) / (rx + 0.1)) ** 2 + ((y - cy) / (ry + 0.1)) ** 2 <= 1 || (y > cy && y < tipY && Math.abs(x - cx) < rx * (1 - (y - cy) / (tipY - cy)) * 0.95));
    piece(g, t => {
      t.ell(cx, cy, rx, ry, M[1]);
      t.ell(cx - 0.15, cy + w * 0.42, w * 0.84, w * 0.7, M[1]);
      t.poly([[cx - w * 0.78, cy + w * 0.45], [cx + w * 0.78, cy + w * 0.45], [cx + 1.3, tipY - 0.9], [cx - 1.5, tipY - 0.9]], M[1]);
      t.ell(cx - 0.1, tipY - 1.0, 1.45, 1.0, M[1]);
      shadeShape(t, M, rx * 0.14, ry * 0.16);
      shine(t, cx - rx * 0.45, cy - ry * 0.5, rx * 0.2, ry * 0.13, M[0]);
      for (const [side, k, len] of [[-1, 0.62, 2.2], [1, 0.56, 2.0], [-1, 1.0, 1.6]]) { const y = cy + k * w; stroke(t, [[cx + side * w * (0.86 - k * 0.32), y - 0.15], [cx + side * (w * (0.86 - k * 0.32) - len * 0.5), y + 0.3], [cx + side * (w * (0.86 - k * 0.32) - len), y + 0.45]], 0.21, 0.21, M[2]); }
    });
    const ex = cx + 0.8, ey = cy + ry * 0.18, er = r * 0.95, ew = er * 0.48, eh = er * 0.64, esp = er * 0.86;
    eyes(g, ex, ey, er, P);
    lashes(g, ex, ey, esp, ew, eh, P);
    // the laser visor: a rounded band across her eyes that wraps round her head (curving with it) and sticks out a little in
    // front; see-through cyan (whatever is under it is tinted, so the eyes still show), a dark rim (gold for Legend), two glints
    const vcx = cx + 0.9, va = rx + 1.1, vb = eh / 2 + 0.95, yc = x => ey + 0.1 + 0.55 * ((x - cx) / rx) ** 2;
    const inVis = (x, y) => ((x - vcx) / va) ** 4 + ((y - yc(x)) / vb) ** 4 <= 1 && x >= cx - rx + 0.1;
    const RIM = stage === 2 ? GOLD[2] : mixHex(V[2], INK, 0.3), K = g.k, W = g.fw, list = [];
    // the tint keeps how light or dark each pixel is but turns it cyan (a plain mix of orange and cyan goes grey). The eyes must
    // stay big glossy eyes through the glass: their dark fill (and lashes) stays near-black teal, the soft glow low in each eye a
    // deep teal, and the white shines stay white (lifting the dark fill to mid-teal left hollow squiggles).
    const EYEDARK = mixHex('#173a48', INK, 0.35), EYEGLOW = mixHex(EYEDARK, V[2], 0.3);
    const tint = c => { const l = A.lum(c); if (l < 0.35) return l < 0.25 ? EYEDARK : EYEGLOW; if (l > 0.9) return WHITE; return l > 0.55 ? mixHex(V[1], WHITE, Math.min(0.8, (l - 0.55) * 1.4)) : mixHex(V[1], '#1c4250', Math.min(0.85, (0.55 - l) * 1.9)); };
    // the glints keep off the eyes: only on the visor's back end (behind the back eye) or along its top rim
    const offEyes = (x, y) => x < ex - esp / 2 - ew / 2 - 0.3 || y < ey - eh / 2 - 0.2;
    for (let fy = 0; fy < g.fh; fy++) for (let fx = 0; fx < W; fx++) {
      const x = (fx + 0.5) / K, y = (fy + 0.5) / K; if (!inVis(x, y)) continue;
      const edge = !inVis(x, y - 1 / K) || !inVis(x, y + 1 / K) || !inVis(x + 1 / K, y) || (!inVis(x - 1 / K, y) && !inCarrot(x - 1 / K, y));
      list.push([fy * W + fx, edge, x, y]);
    }
    for (const [i, edge, x, y] of list) {
      const c = g.a[i];
      if (edge) g.a[i] = RIM;
      else if (c === null || c[0] !== '#') g.a[i] = lt(V[1], 0.3);
      else g.a[i] = tint(c);
      // two diagonal glints across the upper left of the visor
      if (!edge && offEyes(x, y)) for (const [gx, gw] of [[cx - rx * 0.45, 0.55], [cx - rx * 0.1, 0.3]]) if (Math.abs((x - gx) + (y - yc(x)) * 0.8) < gw) g.a[i] = mixHex(g.a[i], WHITE, 0.6);
    }
    if (stage === 2) { const yy = yc(cx + rx); for (const dy of [-vb + 0.3, vb - 0.3]) g.dot(cx + rx + 1.2, yy + dy, GOLD[1]); }
    cheeks(g, ex - 0.2, ey + vb + 0.9, er * 1.0, [M[0], M[1], M[2]]);
    A.chibiMouth(g, ex + 0.1, ey + vb + 1.7, P.mouth || 'smile', 2.1);
    const top = topOf(g);
    legendAura(g, stage);
    twinkles(g, stage, P, [[cx + rx + 3.0, top0 + 1.4, 1], [cx + 4.4, top0 - 3.6, 0.85], [cx + rx + 3.4, cy + ry * 0.7, 0.8], [rkx - 3.6, rky - 4.4, 0.8]]);
    return { hx: R(cx), hy: R(cy), hr: R(rx), top, ey: R(ey), hat: { x: R(cx), y: R(top0 + 1.4), w: R(rx * 1.5) } };
  };

  // =====================================================================================================
  // Frost Fury -> Frost Fury Prime -> Frost Fury Legend
  // A Snow Pea superhero: the icy blue pea head and short snout of the pea family, clear ice crystals at the back of its head
  // instead of a leaf tuft, a deep ice-blue domino mask (the big eyes show through) knotted at the back with flying tails, a
  // deeper ice-blue cape (from the mask's family, so it stands out from the pale head) with a white snowflake hem pattern, and a
  // round gold emblem with a snowflake where the bow tie would be.
  // Prime: three crystals and a longer cape; Legend: a little crown of ice crystals on top, a gold hem, a gold snout lip and the aura.
  PAL.frostfury = { main: ['#f4fcff', '#c3e8fb', '#9ed0ef'], leaf: ['#d0f4e6', '#88d4bf', '#64b4a0'], acc: ['#d4e8ff', '#5e9ee8', '#4a86d2'], stem: '#74c2aa', root: '#a8865a', part: 'herocape' };
  const ICE = ['#ffffff', '#dcf6ff', '#a8dcf4'];
  const FROSTMASK = ['#a2ccff', '#4280d2', '#356cb8'];
  // an ice crystal from its base (x, y) along angle a: a long diamond of length len and half width w with a pale facet
  function shard(t, x, y, len, a, w) {
    const c = cos(a), s = sin(a), px = -s * w, py = c * w, m = [x + c * len * 0.36, y + s * len * 0.36], tip = [x + c * len, y + s * len];
    t.poly([[x, y], [m[0] + px, m[1] + py], tip, [m[0] - px, m[1] - py]], ICE[1]);
    t.poly([[x, y], [m[0] + px * 0.1, m[1] + py * 0.1], tip, [m[0] - px, m[1] - py]], ICE[0]);
  }
  ART.frostfury = function (g, stage, P, C) {
    const M = C.main, CP = C.acc, h = hopOf(P);
    const r = T(stage, 8, 9, 10), rx = r * 1.06, ry = r * 0.95, hx = 14.4, hy = 26 - ry + h + 0.3, bx = hx - rx;
    const ex = hx + 0.8, ey = hy + ry * 0.16, ew = r * 0.48, eh = r * 0.64, esp = r * 0.86;
    // the frosty cape, with little white snowflakes along its hem (Legend: a gold hem)
    const cp = heroCape(g, stage, P, CP, { hx, hy, rx, ry, len: [4.4, 5.6, 6.2], gold: stage === 2, deco: (t, b, cl, yAt) => {
      for (const [k, ky] of [[0.55, 0.3], [0.35, 0.72]]) { const x = b - cl * k, y = yAt(ky); if (t.get(x, y) === CP[1] || t.get(x, y) === CP[0]) for (let i = 0; i < 3; i++) { const a = PI / 2 + i * PI / 3; stroke(t, [[x - cos(a) * 0.75, y - sin(a) * 0.75], [x + cos(a) * 0.75, y + sin(a) * 0.75]], 0.17, 0.17, WHITE); } }
    } });
    // the mask's ribbon tails
    const ky = ey - eh * 0.3;
    maskTails(g, bx + 0.6, ky, cp.fl, FROSTMASK);
    // clear ice crystals at the back of its head, behind it (where a Peashooter has its leaf tuft)
    const cry = T(stage, [[-0.42, -0.72, -1.95, 5.2, 1.55], [-0.72, -0.42, -2.55, 4.6, 1.4]], [[-0.28, -0.82, -1.75, 5.0, 1.5], [-0.55, -0.62, -2.2, 5.8, 1.7], [-0.8, -0.3, -2.7, 4.8, 1.45]],
      [[-0.24, -0.84, -1.72, 5.2, 1.5], [-0.52, -0.64, -2.18, 6.2, 1.75], [-0.8, -0.32, -2.7, 5.0, 1.5]]);
    for (const [kx, kyy, a, len, w] of cry) piece(g, t => { shard(t, hx + kx * rx, hy + kyy * ry, len, a, w); shadeShape(t, ICE, 0.3, 0.3); });
    baseLeaves(g, P, C.leaf, { cx: 15.2 });
    stem(g, 15, 28.6, hy + ry - 1, C.stem);
    // the head + snout tube in ONE piece (docs/chibi-reference.js Peashooter v3)
    const tl = 2.0, th = r * 0.36, fl2 = 1.2, sy = hy + r * 0.08, x0 = hx + rx * 0.7, x1 = hx + rx + tl;
    piece(g, t => {
      t.poly([[x0, sy - th], [x1, sy - th * fl2], [x1, sy + th * fl2], [x0, sy + th]], M[1]);
      A.softBody(t, hx - rx * 0.14, hy - ry * 0.1, rx * 0.86, ry * 0.86, M, { rot: -0.06, hl: false });
      A.softBody(t, hx, hy, rx, ry, M, { rot: -0.06 });
      polyIn(t, [[x0 + 1, sy + th * 0.35], [x1, sy + th * fl2 * 0.35], [x1, sy + th * fl2], [x0 + 1, sy + th]], M[2], (x, y) => x > hx + rx - 0.8 && t.filled(x, y));
      t.ell((x0 + x1) / 2 + 0.8, sy - th * 0.55, (x1 - x0) * 0.25, th * 0.18, M[0], 0, fm((x, y) => x > hx + rx - 0.4 && t.filled(x, y)));
    });
    const rw = 1.6, rh = th * fl2, ox = x1 - 0.1;
    piece(g, t => { t.ell(ox, sy, rw, rh, stage === 2 ? GOLD[1] : M[0]); t.ell(ox + rw * 0.15, sy + 0.05, rw * 0.58, rh * 0.7, P.mouth === 'open' ? lt(M[0], 0.2) : mixHex(M[2], HOLE, 0.6)); });
    // Legend: a little crown of three ice crystals on top
    if (stage === 2) { const x = hx + 0.2, y = hy - ry + 1.4; for (const [dx, len, a, w] of [[-3, 3.4, -1.95, 1.25], [3.2, 3.4, -1.19, 1.25], [0.1, 4.6, -1.57, 1.45]]) piece(g, t => { shard(t, x + dx, y + Math.abs(dx) * 0.18, len, a, w); shadeShape(t, ICE, 0.3, 0.3); }); }
    domino(g, ex, ey, ew, eh, esp, FROSTMASK, inEll(hx, hy, rx + 0.2, ry + 0.2), { strap: bx - 0.5 });
    emblem(g, hx + 0.8, hy + ry * 0.96, T(stage, 2.0, 2.2, 2.5), '#4a86d6', 'flake');
    eyes(g, ex, ey, r, P);
    cheeks(g, ex - 0.2, ey + r * 0.42 + 0.8, r * 1.02, [M[0], M[1], M[2]]);
    const top = topOf(g);
    legendAura(g, stage);
    twinkles(g, stage, P, [[hx + rx + 2.8, hy - ry + 0.6, 1], [hx + 1.6, hy - ry - 3.4, 0.85], [hx + rx + 4.4, hy + ry * 0.6, 0.8], [cp.bx - cp.cl - 0.2, hy + ry * 0.3, 0.8], [bx - 3.8, hy - ry - 1.2, 0.8]]);
    return { hx: R(hx), hy: R(hy), hr: r, top, ey: R(ey), front: R(ox + rw), hat: { x: R(hx), y: R(hy - ry * 0.5), w: R(rx * 1.8) } };
  };

  // =====================================================================================================
  // Starstrike -> Starstrike Prime -> Starstrike Legend
  // A Starfruit superhero: the chubby yellow five-point star (points tapering to rounded tips, its side points are its arms, a
  // little green stem nub and leaf on the top point) wearing a magenta hero mask (one band across its face, the big eyes show
  // through) knotted at the side with flying tails, a night-blue cape dotted with little white stars,
  // and a shooting star streaking past. Prime: a longer cape and bigger star; Legend: the biggest, a gold hem, a second shooting
  // star and the aura.
  PAL.starstrike = { main: ['#fff9cc', '#ffe27c', '#f5c656'], leaf: LEAF, acc: ['#ccd8ff', '#6e8ae2', '#5872ca'], stem: '#72bb5a', root: '#a8865a', part: 'herocape' };
  const STARMASK = ['#f4bcf2', '#b85cc8', '#9c4ab2'];
  // the chubby star body (Starfruit's star with deeper valleys): five points that taper to rounded tips, so it reads as a star
  // at kid size and stands on two star points (fuller valleys made short round bumps, the bottom two like stubby feet). Each
  // point runs straight from its valleys onto a round tip (its sides touch the tip circle), then the centre is filled.
  // Returns its five tips.
  function starBody(t, cx, cy, ro, armUp, col) {
    const D = PI / 180, ang = [-90, -18 - armUp, 54, 126, 198 + armUp].map(a => a * D), pts = [], tr = ro * 0.16;
    const val = ang.map((a, i) => { const m = (a + ang[(i + 1) % 5] + (i === 4 ? PI * 2 : 0)) / 2; return [cx + cos(m) * ro * 0.42, cy + sin(m) * ro * 0.42]; });
    const wrap = v => Math.atan2(sin(v), cos(v));
    ang.forEach((a, i) => {
      const tx = cx + cos(a) * ro * 0.8, ty = cy + sin(a) * ro * 0.8, vp = val[(i + 4) % 5], vn = val[i];
      // where each side of the point touches the tip circle (the tangent from its valley)
      const tan = (v, s) => wrap(Math.atan2(v[1] - ty, v[0] - tx) + s * Math.acos(Math.min(1, tr / Math.hypot(v[0] - tx, v[1] - ty))) - a);
      const s0 = tan(vp, 1), s1 = tan(vn, -1);
      for (let j = 0; j <= 8; j++) { const b = a + s0 + (s1 - s0) * j / 8; pts.push([tx + cos(b) * tr, ty + sin(b) * tr]); }
      pts.push(vn);
    });
    t.poly(pts, col);
    t.ell(cx, cy + ro * 0.04, ro * 0.48, ro * 0.45, col);
    return ang.map(a => [cx + cos(a) * ro * 0.96, cy + sin(a) * ro * 0.96]);
  }
  // a shooting star at (x, y), size s, its trail streaming back toward angle a
  function shootingStar(g, x, y, s, a) {
    piece(g, t => stroke(t, [[x, y], [x + cos(a) * 2.4 * s, y + sin(a) * 2.4 * s], [x + cos(a) * 4.6 * s, y + sin(a) * 4.6 * s]], 0.62 * s, 0.18, '#fff2b0'));
    piece(g, t => { t.poly(starPts(x, y, 1.55 * s, 0.7 * s, 5), GOLD[1]); shadeShape(t, GOLD, 0.3, 0.3); });
    g.dot(x - 0.3, y - 0.3, WHITE);
  }
  ART.starstrike = function (g, stage, P, C) {
    const M = C.main, f = P.frame ? 1 : 0, h = hopOf(P);
    const ro = T(stage, 9.2, 10.2, 11.0), cx = 16.6, cy = 30.4 - ro * 0.78 + h;
    const armUp = P.arms === 'up' ? 20 : P.arms === 'out' || P.arms === 'hold' ? 4 : 0;
    // the night-blue cape, flying back from behind the star, dotted with little white stars (Legend: a gold hem)
    const cp = heroCape(g, stage, P, C.acc, { hx: cx, hy: cy, rx: ro * 0.55, ry: ro * 0.7, len: [6.0, 6.6, 7.0], gold: stage === 2, top: -0.4, deco: (t, b, cl, yAt) => {
      for (const [k, ky] of [[0.5, 0.25], [0.3, 0.7], [0.75, 0.5]]) { const x = b - cl * k, y = yAt(ky); if (t.get(x, y) === C.acc[1] || t.get(x, y) === C.acc[2]) { t.dot(x, y, WHITE); t.dot(x + 0.5, y, '#e8eeff'); t.dot(x, y + 0.5, '#e8eeff'); } }
    } });
    // the face sits a little above the star's middle, so the mask and the smile under it both fit on the body
    const ex = cx + 0.8, ey = cy - ro * 0.12, rf = ro * 0.6, ew = rf * 0.48, eh = rf * 0.64, esp = rf * 0.86;
    const star = new PX.Grid(g.w, g.h, g.k);
    starBody(star, cx, cy, ro, armUp, '#000000');
    // the mask band runs out over the arm roots (a strap past the eyes: a band that stopped at the eye rims read as goggles)
    // but no further, so the arms stay yellow star points
    const onFace = fm((x, y) => star.get(x, y) !== null && inEll(cx + 0.4, cy + ro * 0.04, ro * 0.74, ro * 0.6)(x, y));
    const sY = ey - eh * 0.3;
    let kx = cx - ro; while (kx < cx && !onFace(kx, sY)) kx += 0.25;
    // the mask's ribbon tails, streaming back over the cape from the knot at the band's left end, at eye height (behind the
    // star, so they flutter out above and below its left arm and the arm stays a clear yellow point)
    maskTails(g, kx, sY, cp.fl, STARMASK, 1.2);
    // the star, its stem nub and leaf
    let tips;
    piece(g, t => { tips = starBody(t, cx, cy, ro, armUp, M[1]); shadeShape(t, M, ro * 0.13, ro * 0.13); shine(t, cx - ro * 0.42, cy - ro * 0.32, ro * 0.16, ro * 0.09, M[0]); });
    const tp = tips[0];
    // (a small stem nub and leaf right on the top point's tip, so the point itself still shows)
    piece(g, t => { stroke(t, [[tp[0] - 0.1, tp[1] + 0.4], [tp[0] + 0.1, tp[1] - 0.9]], 0.55, 0.5, C.stem); t.ell(tp[0] + 1.15, tp[1] - 0.95, 1.15, 0.6, flat(C.leaf), -0.5); });
    // the hero mask: ONE solid band across the face at eye level, out to the edge of its face on both sides (its strap), a rim
    // 1 art px thick all round each eye hole (so the bottom edge dips under each eye with a notch over the nose), the top edge
    // swept up a little at the outer corners, and a round knot at its left end. (Thin rims round each hole, clipped to the
    // face with no band, read as purple glasses.)
    const lx = ex - esp / 2, rxe = ex + esp / 2, hrx = ew / 2 + 0.4, hry = eh / 2 + 0.35, rim = 1.0, tY = ey - hry - rim;
    // the smile sits under the nose notch, a clear pixel below the mask's edge (touching it, the smile vanished)
    const mY = ey + hry + rim + 1.15, mw = rf * 0.28;
    piece(g, t => {
      // (the rim is circles along each hole's edge, so it is the same width all round: a scaled-up ellipse was much thicker
      // under the eyes and crowded the smile)
      for (const x of [lx, rxe]) { t.ell(x, ey, hrx, hry, STARMASK[1], 0, onFace); for (let i = 0; i < 24; i++) t.ell(x + cos(i * PI / 12) * hrx, ey + sin(i * PI / 12) * hry, rim, rim, STARMASK[1], 0, onFace); }
      polyIn(t, [[cx - ro, sY - 1.1], [lx - hrx - 0.5, tY - 0.5], [lx, tY], [ex, tY + 0.25], [rxe, tY], [rxe + hrx + 0.5, tY - 0.5], [cx + ro, sY - 1.1],
        [cx + ro, sY + 1.5], [cx - ro, sY + 1.5]], STARMASK[1], onFace);
      shadeShape(t, STARMASK, 0.45, 0.55);
      for (const x of [lx, rxe]) shine(t, x - hrx * 0.55, tY + 0.45, 0.8, 0.26, STARMASK[0], -0.15);
      for (const x of [lx, rxe]) t.ell(x, ey, hrx, hry, null);
    });
    piece(g, t => { t.ell(kx + 0.3, sY + 0.2, 1.0, 0.9, STARMASK[1]); shadeShape(t, STARMASK, 0.3, 0.35); });
    eyes(g, ex, ey, rf, P);
    cheeks(g, ex - 0.2, ey + hry + rim + 0.55, rf * 1.1, [M[0], M[1], M[2]], { w: 1.3, h: 0.75 });
    A.chibiMouth(g, ex, mY, P.mouth || 'smile', mw);
    const top = topOf(g);
    // the shooting stars streaking past (a second one for Legend)
    const sh = T(stage, [[27.6, 6.6 + f * 0.6, 0.9]], [[27.8, 5.6 + f * 0.6, 1]], [[28.0, 4.6 + f * 0.6, 1], [5.2, 6.8 - f * 0.6, 0.85]]);
    for (const [x, y, s] of sh) shootingStar(g, x, y, s, x > 16 ? PI * 0.82 : PI * 0.15);
    legendAura(g, stage);
    twinkles(g, stage, P, [[cx + ro + 1.4, cy - ro * 0.05, 1], [cp.bx - cp.cl - 0.6, cy - ro * 0.7, 0.85], [cx - 5.4, cy - ro - 0.4, 0.8], [cx + ro + 1.2, cy + ro * 0.62, 0.8]]);
    return { hx: R(cx), hy: R(cy), hr: R(ro * 0.6), top, ey: R(ey), hat: { x: R(tp[0]), y: R(tp[1] + 2.4), w: 6 } };
  };

  // =====================================================================================================
  // Kaboom Twins -> Kaboom Twins Blast -> Kaboom Twins Legend
  // Two round Cherry Bomb heroes (dimpled at the top like real cherries) joined by their stems to a leaf, wearing matching navy
  // domino masks (the big eyes show through) with flying tails, brave confident smiles (friendly, NOT the Cherry Bomb's scowl),
  // and a lit fuse fizzing where their stems meet. Blast: bigger cherries, a second leaf and a bigger spark; Legend: the biggest,
  // an eight-point starburst spark, a gold star where the stems meet and the aura.
  PAL.kaboomcherry = { main: ['#ffd0d0', '#ff8a90', '#ec6a74'], leaf: LEAF, acc: ['#aab0ea', '#4a4e9e', '#3c408a'], stem: '#6ea852', root: '#a8865a', part: 'cherries' };
  ART.kaboomcherry = function (g, stage, P, C) {
    const M = C.main, MK = C.acc, h = hopOf(P), f = P.frame ? 1 : 0;
    // [x, y, r] back to front
    const L = T(stage, [[10.4, 24.5, 6.0], [21.6, 24.8, 6.1]], [[10.0, 23.9, 6.6], [22.0, 24.2, 6.7]], [[9.7, 23.3, 7.1], [22.4, 23.6, 7.2]]).map(([x, y, r], i) => [x, y + h * (i % 2 ? 1 : 0.7), r]);
    const jx = 16.1, jy = T(stage, 12.2, 10.6, 9.2) + h, fl = P.walk ? (f ? 1 : 0.4) : 0;
    // the stems curving up to meet, the fuse cord and its spark
    for (const [x, y, r] of L) piece(g, t => stroke(t, [[x + 0.2, y - r * 0.72], [x + (jx - x) * 0.25, jy + (y - r - jy) * 0.5], [jx, jy]], 0.62, 0.55, C.stem));
    const sx = jx - T(stage, 2.6, 3.4, 3.8), sy = jy - T(stage, 2.6, 2.8, 2.6), spr = T(stage, 1.9, 2.4, 2.8) + f * 0.3, rot = f ? -PI / 2 + 0.3 : -PI / 2;
    piece(g, t => stroke(t, [[jx, jy], [jx - 1.0, jy - 1.4], [sx + 0.7, sy + 0.6]], 0.42, 0.4, '#b88a5a'));
    piece(g, t => { t.poly(starPts(sx, sy, spr, spr * 0.46, stage === 2 ? 8 : 5, rot), '#ffb45a'); t.poly(starPts(sx, sy, spr * 0.56, spr * 0.3, 5, rot + 0.3), '#fff2a0'); });
    for (const [a, d] of [[-2.6, 0.8], [-0.7, 1.0], [-3.3, 0.9], [-1.6, 1.1]].slice(0, T(stage, 2, 3, 4))) { const dd = spr + 0.8 + d * (f ? 1.2 : 0.6); g.ell(sx + cos(a + f * 0.3) * dd, sy + sin(a + f * 0.3) * dd, 0.42, 0.42, f ? '#ffd25e' : '#ff9e58'); }
    piece(g, t => {
      t.ell(jx + 2.6, jy - 1.1, 3.1, 1.55, flat(C.leaf), -0.42); stroke(t, [[jx + 0.2, jy - 0.1], [jx + 4.8, jy - 2.1]], 0.2, 0.2, C.leaf[2]);
      if (stage >= 1) { t.ell(jx + 1.4, jy + 1.6, 2.4, 1.2, flat(C.leaf), 0.5); stroke(t, [[jx + 0.1, jy + 0.4], [jx + 3.0, jy + 2.6]], 0.18, 0.18, C.leaf[2]); }
    });
    if (stage === 2) piece(g, t => { t.poly(starPts(jx, jy, 1.8, 0.8, 5), GOLD[1]); shadeShape(t, GOLD, 0.3, 0.3); });
    // the masks' tails, flying back from behind each cherry
    for (const [x, y, r] of L) maskTails(g, x - r + 0.6, y + r * 0.06 - r * 0.64 * 0.3, fl, MK, T(stage, 0.8, 0.95, 1.05));
    // the cherries, each with its mask, big eyes, cheeks and a brave smile (a little wider: confident, no brows)
    for (const [x, y, r] of L) {
      const parts = [[x - r * 0.26, y - r * 0.05, r * 0.78, r * 0.82], [x + r * 0.26, y - r * 0.05, r * 0.78, r * 0.82], [x, y + r * 0.12, r * 0.95, r * 0.85]];
      piece(g, t => { for (const [a, b, c, d] of parts) t.ell(a, b, c, d, M[1]); shadeShape(t, M, r * 0.16, r * 0.17); shine(t, x - r * 0.45, y - r * 0.42, r * 0.22, r * 0.13, M[0]); });
      const onFace = fm((xx, yy) => parts.some(([a, b, c, d]) => ((xx - a) / (c + 0.1)) ** 2 + ((yy - b) / (d + 0.1)) ** 2 <= 1));
      const ex = x + 0.5, ey = y + r * 0.06, ew = Math.max(2.4, r * 0.48), eh = Math.max(3.2, r * 0.64), esp = r * 0.84;
      domino(g, ex, ey, ew, eh, esp, MK, onFace, { strap: x - r - 0.5, pad: 1.25, tip: 1.4 });
      A.chibiEyes(g, ex, ey, { sp: esp, w: ew, h: eh, mood: P.eyes });
      cheeks(g, ex - 0.2, ey + r * 0.5, r * 1.0, [M[0], M[1], M[2]], { w: 1.3, h: 0.75 });
      A.chibiMouth(g, ex, ey + r * 0.64, P.mouth || 'smile', 2.8 + (r - 6) * 0.3);
    }
    const top = topOf(g);
    legendAura(g, stage);
    const H = L[L.length - 1];
    twinkles(g, stage, P, [[jx + 6.6, jy - 2.2, 1], [3.2, L[0][1] - L[0][2] - 2.2, 0.85], [29.0, H[1] - H[2] - 1.0, 0.8], [jx - 1.2, jy - 6.4, 0.8]]);
    return { hx: R(H[0]), hy: R(H[1]), hr: R(H[2]), top, ey: R(H[1] + H[2] * 0.06), hat: { x: R(jx), y: R(jy + 1), w: 7 } };
  };

  // =====================================================================================================
  // Storm Striker -> Storm Striker Prime -> Storm Striker Legend
  // A Lightning Reed hero: the glowing mint-green teardrop bulb on its tiny reed between base leaves, but its tip is a big yellow
  // lightning bolt (the bolt head), a little storm cloud hanging at its back zapping a mini bolt, and a storm-blue cape with a
  // yellow zigzag. EYES ONLY, NO MOUTH (the Lightning Reed rule), a soft mint glow round it. Prime: a bigger bolt and cloud;
  // Legend: a stormier cloud with two zaps, a gold hem and the golden aura.
  PAL.stormstriker = { main: ['#f4fff8', '#b2f4d2', '#80dab0'], leaf: LEAF, acc: ['#d6daf6', '#848cca', '#6870b0'], stem: '#6fb85e', root: '#7a5a2a', part: 'bolt' };
  const CLOUD = ['#ffffff', '#e2e6f4', '#b8c0da'];
  // a big lightning bolt rising from its base (x, y) to a sharp point, leaning back by lean; s = size
  const boltUp = (t, x, y, s, lean, col) => t.poly([[-1.3, 0.8], [-0.1, -2.7], [-1.5, -2.6], [0.9, -6.6], [0.5, -3.7], [1.9, -3.8], [1.3, 0.8]].map(([a, b]) => [x + (a + b * lean * 0.12) * s, y + b * s]), col);
  ART.stormstriker = function (g, stage, P, C) {
    const M = C.main, f = P.frame ? 1 : 0, h = hopOf(P);
    const rx = T(stage, 7.4, 8.1, 8.8), ry = rx * 0.92, hx = T(stage, 16.6, 16.8, 17.0), hy = 26.4 - ry + h, lean = T(stage, 1.0, 1.2, 1.4);
    // the storm cape with a yellow zigzag across it (Legend: a gold hem)
    const cp = heroCape(g, stage, P, C.acc, { hx, hy, rx, ry, len: [4.2, 5.2, 5.6], gold: stage === 2, top: -0.2, deco: (t, b, cl, yAt) => {
      const pts = []; for (let i = 0; i <= 4; i++) { const k = i / 4, x = b + 0.6 - cl * 0.92 * k; pts.push([x, yAt(0.48) - 0.8 + (i % 2 ? 1.2 : 0)]); }
      strokeIn(t, pts, 0.36, ZAP[1], (x, y) => C.acc.includes(t.get(x, y)));
    } });
    // the little storm cloud at its back, zapping a mini bolt down (two for Legend)
    const cs = T(stage, 0.85, 1.0, 1.12), ccx = hx - rx - 1.0, ccy = hy - ry - T(stage, 0.4, 0.8, 1.2);
    for (const [dx, k] of T(stage, [[0.2, 0.8]], [[0.2, 1]], [[-1.4, 0.9], [1.6, 1]])) piece(g, t => bolt(t, ccx + dx * cs - 0.8 + (f ? 0.3 : 0), ccy + 1.2 * cs, 0.62 * k * cs, ZAP[1]));
    piece(g, t => {
      for (const [dx, dy, s] of [[-2.0, 0.5, 1.6], [0, -0.5, 2.1], [2.0, 0.4, 1.7], [0.2, 0.9, 1.9]]) t.ell(ccx + dx * cs, ccy + dy * cs, s * cs * 1.05, s * cs, CLOUD[1]);
      shadeShape(t, CLOUD, 0.45, 0.55); shine(t, ccx - 0.6 * cs, ccy - 1.3 * cs, 0.9 * cs, 0.35, WHITE, -0.2);
    });
    baseLeaves(g, P, C.leaf, { cx: hx - 0.6 });
    stem(g, hx - 0.4, 28.6, hy + ry - 1, C.stem);
    // the bolt head: a big yellow lightning bolt rising from the bulb's tip (behind the bulb, so the bulb's top hides its foot)
    const tx = hx - lean * 0.6, tyy = hy - ry + 1.0, bs = T(stage, 1.12, 1.22, 1.26);
    piece(g, t => { boltUp(t, tx, tyy, bs, lean + (P.walk && f ? 0.3 : 0), ZAP[1]); shadeShape(t, ZAP, 0.35, 0.4); });
    // the glowing teardrop bulb: rounder at the bottom, rising to a soft point where the bolt sprouts, a glowing core
    piece(g, t => {
      t.ell(hx, hy, rx, ry, M[1]); t.ell(hx, hy + ry * 0.2, rx * 1.03, ry * 0.8, M[1]);
      t.poly([[hx - rx * 0.8, hy - ry * 0.42], [hx - rx * 0.35, hy - ry * 0.9], [tx - 0.9, tyy - 0.6], [tx + 0.9, tyy - 0.5], [hx + rx * 0.3, hy - ry * 0.92], [hx + rx * 0.72, hy - ry * 0.55]], M[1]);
      shadeShape(t, M, rx * 0.15, ry * 0.16);
      t.ell(hx - rx * 0.12, hy - ry * 0.05, rx * 0.56, ry * 0.52, mixHex(M[0], M[1], 0.35), 0, inside(t));
      shine(t, hx - rx * 0.42, hy - ry * 0.48, rx * 0.22, ry * 0.13, M[0]);
    });
    // eyes only, like the real Lightning Reed: no mouth
    const ex = hx + 0.8, ey = hy + ry * 0.18;
    eyes(g, ex, ey, rx, P);
    cheeks(g, ex - 0.2, ey + rx * 0.42 + 0.3, rx * 1.0, [M[0], M[1], M[2], mixHex(M[0], M[1], 0.35)]);
    const top = topOf(g);
    // the soft glow: pale mint (or a pale tint of its element's colour), golden for Legend
    if (stage === 2) legendAura(g, stage);
    else { const gc = parseInt(lt(M[1], 0.45).slice(1), 16); aura(g, 1.8, [gc >> 16 & 255, gc >> 8 & 255, gc & 255], 0.45, hy + ry + 0.6); }
    twinkles(g, stage, P, [[hx + rx + 2.6, hy - ry + 0.4, 1], [hx + rx + 3.2, hy + ry * 0.7, 0.85], [cp.bx - cp.cl - 0.4, hy + ry * 0.5, 0.8], [tx + 5.4, tyy - 5.0, 0.8]]);
    return { hx: R(hx), hy: R(hy), hr: R(rx), top, ey: R(ey), hat: { x: R(hx + 0.4), y: R(hy - ry + 1.6), w: R(rx * 1.3) } };
  };

  // =====================================================================================================
  // Hypnotica -> Hypnotica Sorceress -> Hypnotica Legend
  // A Hypno-shroom sorceress: a big squashed-dome cap swirled with pink, purple and teal spiral bands (a pale rim underneath),
  // over a wide white stalk (the face) that flares to the ground, big glossy plum eyes with lashes, a smile, and a wand with a
  // swirly pink star held out by a leaf. Sorceress: a purple cloak flowing back from under the cap and a bigger star; Legend: a
  // gold tiara with a swirl jewel on the cap, a gold hem on the cloak, the biggest star and the aura.
  PAL.hypnotica = { main: ['#ffe4f4', '#f8b4dc', '#e08cc0'], leaf: LEAF, acc: ['#ffffff', '#f6f0fc', '#d8cce8'], stem: '#6fb85e', root: '#7a5a2a', part: 'swirl' };
  const SWIRLS = ['#ffb2da', '#c4a0f2', '#88dcd4'];
  const CLOAK = ['#e2d0ff', '#9c76d8', '#8262c0'];
  const WANDSTAR = ['#fff0fa', '#ffbce6', '#f092cc'];
  ART.hypnotica = function (g, stage, P, C) {
    const M = C.main, K = C.acc, f = P.frame ? 1 : 0, h = hopOf(P), sq = P.walk && !P.frame ? 0.4 : 0, sx = 15.4;
    const srx = T(stage, 6.6, 7.0, 7.4), sry = T(stage, 6.8, 7.2, 7.6), sy = 29.0 - sry + h, stop = sy - sry;
    const crx = T(stage, 9.8, 10.6, 11.4), cry = T(stage, 5.6, 6.2, 6.8), cby = stop + 1.6, cx = sx - 0.2;
    const er = T(stage, 7.4, 7.8, 8.2), ew = er * 0.48, eh = er * 0.64, esp = er * 0.86, ex = sx + 0.8, ey = cby + 1.8 + eh / 2;
    // Sorceress and Legend: the purple cloak flowing back from under the cap (Legend: a gold hem)
    const cp = stage >= 1 ? heroCape(g, stage, P, CLOAK, { hx: sx, hy: sy, rx: srx, ry: sry, len: [0, 4.6, 5.4], gold: stage === 2, top: -0.75 }) : { bx: sx - srx, cl: 0 };
    // the wand, held out in front by a curled leaf: a stick with a swirly star (raised for a cheer)
    const up = P.arms === 'up' ? 1 : 0, hold = P.arms === 'hold' || P.arms === 'out' ? 1 : 0;
    const wx0 = sx + srx + 0.2 + hold * 0.4, wy0 = sy + sry * 0.42 - up * 0.8, wl = T(stage, 5.6, 6.0, 6.4), wa = -0.72 - up * 0.45 + hold * 0.15;
    const wx1 = wx0 + cos(wa) * wl, wy1 = wy0 + sin(wa) * wl, st = T(stage, 2.2, 2.5, 2.8);
    // the stalk (the face), flaring out to the ground: no feet
    piece(g, t => {
      t.ell(sx, 28.5 + h * 0.3, srx + 1.0 + sq, 1.5, K[1]); t.ell(sx, sy, srx + sq * 0.5, sry, K[1]); t.ell(sx, sy + sry * 0.3, srx * 0.96 + sq * 0.5, sry * 0.72, K[1]);
      shadeShape(t, K, srx * 0.15, sry * 0.15);
    });
    // the cap: a squashed dome swirled with pink, purple and teal spiral bands, a soft shade low on the right, a shine and a pale rim
    const SW = M === PAL.hypnotica.main ? SWIRLS : SWIRLS.map(c => mixHex(c, M[1], 0.55));
    const scx = cx + 0.8, scy = cby - cry * 0.55, pitch = crx * 0.95;
    piece(g, t => {
      t.ell(cx, cby - 0.3, crx, cry, M[1], 0, fm((x, y) => y <= cby));
      t.ell(cx - crx * 0.06, cby - cry * 0.5, crx * 0.74, cry * 0.72, M[1]);
      const W = t.fw, kk = t.k, src = t.a.slice();
      for (let i = 0; i < src.length; i++) {
        if (src[i] === null) continue;
        const x = (i % W + 0.5) / kk, y = (Math.floor(i / W) + 0.5) / kk, dx = x - scx, dy = (y - scy) * (crx / cry) * 0.8;
        const u = Math.atan2(dy, dx) / (2 * PI) + Math.hypot(dx, dy) / pitch, band = ((Math.floor(u * 3) % 3) + 3) % 3;
        const fx = i % W, fy = Math.floor(i / W), edge = t.fget(fx + R(crx * 0.12 * kk), fy + R(cry * 0.2 * kk)) === null;
        t.a[i] = edge ? mixHex(SW[band], '#7a5a9a', 0.2) : SW[band];
      }
      t.ell(cx, cby, crx - 0.9, 1.25, lt(M[0], 0.4));
      shine(t, cx - crx * 0.45, cby - cry * 0.7, crx * 0.18, cry * 0.12, WHITE);
    });
    // Legend: a gold tiara on the cap with a swirl jewel
    if (stage === 2) {
      const x = cx + 0.6, y = cby - cry * 0.92;
      piece(g, t => { t.poly([[x - 3.6, y + 1.0], [x - 3.4, y - 0.9], [x - 1.7, y], [x, y - 2.4], [x + 1.7, y], [x + 3.4, y - 0.9], [x + 3.6, y + 1.0]], GOLD[1]); shadeShape(t, GOLD, 0.4, 0.5); });
      g.ell(x, y - 0.1, 0.75, 0.75, '#c070e0'); g.dot(x - 0.3, y - 0.4, WHITE);
    }
    // the wand stick + the leaf hand holding it, then the swirly star
    piece(g, t => { stroke(t, [[wx0, wy0], [wx1, wy1]], 0.5, 0.45, '#9a6ad0'); t.ell(wx0 - 0.2, wy0 + 0.5, 1.9, 1.0, flat(C.leaf), -0.3 - up * 0.3); });
    piece(g, t => { t.poly(starPts(wx1, wy1, st, st * 0.5, 5, -PI / 2 + (f ? 0.2 : 0)), WANDSTAR[1]); shadeShape(t, WANDSTAR, 0.35, 0.45); });
    { const pts = []; for (let i = 0; i <= 18; i++) { const a = i * 0.62, rr = st * 0.62 * (1 - i / 20); pts.push([wx1 + cos(a) * rr * 0.8, wy1 + 0.1 + sin(a) * rr * 0.8]); } stroke(g, pts.reverse(), 0.2, 0.2, '#a058c8'); }
    // magic swirl sparkles round the star (more from Sorceress)
    for (const [dx, dy, s] of [[st + 1.2, -0.6, 0.5], [-0.4, -st - 1.6, 0.48], [st + 0.6, st + 1.2, 0.42]].slice(0, T(stage, 1, 2, 3))) {
      const k = f ? 1.15 : 0.9, x = Math.min(31.2 - 2.3 * s, wx1 + dx * k), y = wy1 + dy * k, kk = g.k, X = (Math.floor(x * kk) + 0.5) / kk, Y = (Math.floor(y * kk) + 0.5) / kk;
      piece(g, t => t.poly(starPts(X, Y, 2.3 * s, 0.75 * s, 4), '#d8b8ff'));
    }
    eyes(g, ex, ey, er, P, { col: '#4a2a5a' });
    lashes(g, ex, ey, esp, ew, eh, P);
    cheeks(g, ex - 0.2, ey + er * 0.44, er * 1.0, [K[0], K[1], K[2]]);
    A.chibiMouth(g, ex + 0.1, ey + er * 0.52, P.mouth || 'smile', 2.0);
    const top = topOf(g);
    legendAura(g, stage);
    twinkles(g, stage, P, [[cx - crx - 1.6, cby - cry + 0.2, 1], [cx + crx + 1.4, cby - cry - 0.6, 0.85], [cp.bx - cp.cl - 0.6, sy + 0.6, 0.8], [cx - 2.6, cby - cry - 3.0, 0.8]]);
    return { hx: R(sx), hy: R(cby - cry * 0.4), hr: R(crx * 0.8), top, ey: R(ey), hat: { x: R(cx), y: R(cby - cry * 0.6), w: R(crx * 1.5) } };
  };
})();
