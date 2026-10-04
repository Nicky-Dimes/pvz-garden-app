// art-plants8.js — PVZ Garden: the 8 LEGENDARY hero plants (the prizes for clearing a Survival map), in TRUE chibi style
// (docs/pvz-art-guide.md + docs/chibi-reference.js): Green Shadow, Solar Flare, Wall-Knight, Chompzilla, Spudow, Nightcap,
// Captain Combustible and Rose (the PvZ Heroes plant heroes).
// Same contract as art-plants.js: PX.PLANT_ART[id] = function (g, stage, P, C) -> geometry, PX.PLANT_PAL[id] = palette.
// The chibi template: the head IS the character (half-width about 8 / 9 / 10 by stage, its bottom near row 26), rooted on base
// leaves, a mound or roots (no legs), big glossy eyes set low and wide, a tiny mouth, blush, flat pastel fills with one soft
// shade. Heroes add their costume (mask, cape, helmet, crown, hat...) drawn big and simple, and every one carries the
// legendary touch: a few golden twinkles (2 / 3 / 4 by stage) and, at stage 2 ("Legend"), a soft golden aura.
// The core adds the bold outer edge. Walking = a hop on frame 1; arms:'up' = raised leaves / props and a little hop.
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
  const LEAF = ['#d2f4ac', '#8fd46e', '#68b058'];
  const GOLD = ['#fff6c0', '#ffd75a', '#e0a83a'];
  const STEEL = ['#f6f8fc', '#cdd5e2', '#9aa4ba'];

  // ---------------- shared bits ----------------
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
  // two little round base leaves (they tip up for a cheer)
  function baseLeaves(g, P, L, o) {
    o = o || {};
    const cx = o.cx == null ? 15.4 : o.cx, sp = o.sp == null ? 4.2 : o.sp, len = o.len || 4.4, y = o.y || 28.7;
    const a = P.arms === 'up' ? -0.5 : P.arms === 'out' || P.arms === 'paddle' ? 0.04 : 0.22, ly = P.arms === 'up' ? y - 0.5 : y;
    piece(g, t => { t.ell(cx - sp, ly, len, 1.9, flat(L), -a); t.ell(cx + sp, ly, len, 1.9, flat(L), a); });
  }
  const stem = (g, x, y0, y1, col, r) => piece(g, t => stroke(t, [[x, y0], [x, y1]], r || 0.95, r || 0.95, col));
  // soft pink cheeks, only on the colours in `on` (so they never paint over a mask or a scarf)
  function cheeks(g, cx, cy, sp, on, o) {
    o = o || {};
    const ok = fm((x, y) => on.includes(g.get(x, y)));
    for (const x of [cx - sp / 2, cx + sp / 2]) g.ell(x, cy, o.w || 1.5, o.h || 0.85, o.col || '#ffb3c2', 0, ok);
  }
  // BIG glossy eyes (art director v3 ratios) for a face of radius r
  const eyes = (g, ex, ey, r, P, o) => A.chibiEyes(g, ex, ey, Object.assign({ sp: r * 0.86, w: r * 0.48, h: r * 0.64, mood: P.eyes }, o || {}));
  // a flowing ribbon / scarf tail: a tapered stroke through pts
  const ribbon = (t, pts, w0, w1, col) => stroke(t, pts, w0, w1, col);
  // a little lightning bolt (top-left corner x, y; size s)
  const bolt = (t, x, y, s, col) => t.poly([[0, 0], [1.7, 0], [0.8, 1.4], [2, 1.4], [-0.3, 3.9], [0.4, 2.1], [-0.7, 2.1]].map(([a, b]) => [x + a * s, y + b * s]), col);

  // ---------------- the legendary touch ----------------
  // a golden four-point twinkle (its own outlined piece) with a white heart
  function twinkle(g, x, y, s, col) {
    // (centred on a fine pixel, or the thin spikes can miss every pixel centre and vanish)
    const k = g.k; x = (Math.floor(x * k) + 0.5) / k; y = (Math.floor(y * k) + 0.5) / k;
    piece(g, t => t.poly(starPts(x, y, 1.7 * s, 0.55 * s, 4), col || '#ffe27a'));
    g.dot(x, y, WHITE); if (s > 0.85) g.dot(x - 0.5, y, '#fffbe0');
  }
  // the twinkles: spots = [[x, y, size], ...]; stage 0 shows 2, stage 1 3, stage 2 4. They shimmer with the frame.
  function twinkles(g, stage, P, spots) {
    const n = T(stage, 2, 3, 4), f = P.frame ? 1 : 0;
    spots.slice(0, n).forEach(([x, y, s], i) => {
      const ss = Math.max(0.8, s * ((i + f) % 2 ? 0.8 : 1)), m = 1.7 * ss + 0.5;
      const xx = Math.max(m, Math.min(32 - m, x)), yy = Math.max(m, Math.min(30.4, y));
      const c = g.get(xx, yy); if (c && c[0] === '#') return;
      twinkle(g, xx, yy, ss);
    });
  }
  // a soft see-through glow round the whole silhouette (no bold edge on it): width w art px, colour [r, g, b], alpha a, and
  // only above art row maxY when given (so a flower's glow can skip its leaves).
  // Uses a quick two-pass distance map so it stays cheap (sprites are drawn often in the tools).
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
  // Green Shadow -> Shadow Striker -> Green Shadow Legend
  // A Peashooter superhero: the reference pea head and short snout, a dark plum domino mask (flat top, upswept pointed tips,
  // a notch over the nose; the big eyes show through pale-rimmed holes) tied at the back with two ribbon tails, a purple cape
  // flying back in points, and a round gold emblem with a lightning bolt where the bow tie would be. Striker: a longer cape
  // with three points; Legend: a gold hem on the cape, a gold lip on the snout and the aura.
  PAL.greenshadow = { main: ['#eafcc8', '#ace580', '#86c866'], leaf: LEAF, acc: ['#e6d6ff', '#a98ae6', '#8a6cca'], stem: '#72bb5a', root: '#a8865a', part: 'snout' };
  const MASK = ['#a294d6', '#5e4c94', '#504184'];
  ART.greenshadow = function (g, stage, P, C) {
    const M = C.main, CP = C.acc, f = P.frame ? 1 : 0, h = hopOf(P);
    const r = T(stage, 8, 9, 10), rx = r * 1.06, ry = r * 0.95, hx = 14, hy = 26 - ry + h + 0.3, bx = hx - rx;
    const ex = hx + 0.8, ey = hy + ry * 0.16, ew = r * 0.48, eh = r * 0.64, esp = r * 0.86;
    // the cape: a wedge flying back from her neck, its hem cut into points (it flutters more as she runs)
    const fl = P.walk ? (f ? 1.4 : 0.7) : f ? 0.3 : 0, cl = T(stage, 4.4, 5.6, 6.2) + fl;
    const tips = T(stage, [[1.0, 0.18], [0.62, 0.95]], [[1.0, 0.12], [0.86, 0.56], [0.5, 1.0]], [[1.0, 0.1], [0.88, 0.55], [0.52, 1.0]]);
    const yAt = k => hy + ry * (-0.05 + k * 0.98) + (k >= 0.99 ? 0 : -fl * 0.35 * (1 - k)), pts = [[hx + 1.5, hy + ry * 0.55], [hx - rx * 0.3, hy - ry * 0.2], [bx + 0.6, hy - ry * 0.32]];
    tips.forEach(([kx, ky], i) => { pts.push([bx - cl * kx, Math.min(28.9, yAt(ky))]); const nx = tips[i + 1]; if (nx) pts.push([bx - cl * (kx + nx[0]) * 0.28, yAt((ky + nx[1]) / 2 + 0.06)]); });
    pts.push([hx - 2.4, 29.2], [hx + 1, 29.2]);
    piece(g, t => {
      t.poly(pts, CP[1]); shadeShape(t, CP, 0.9, 1.1);
      // the lighter lining where the top flips over in the wind, and a fold line from the neck to each notch
      polyIn(t, [[bx + 0.6, hy - ry * 0.32], [bx - cl * tips[0][0], yAt(tips[0][1])], [bx - cl * 0.5, yAt(tips[0][1]) + 1.4], [bx + 1.2, hy - ry * 0.05]], CP[0], (x, y) => t.get(x, y) === CP[1] || t.get(x, y) === CP[2]);
      for (let i = 0; i < tips.length - 1; i++) { const nx = tips[i + 1], kx = tips[i][0]; stroke(t, [[bx + 0.4, hy + ry * 0.2 + i * 1.2], [bx - cl * (kx + nx[0]) * 0.24, yAt((tips[i][1] + nx[1]) / 2 + 0.06) - 0.5]], 0.22, 0.22, CP[2]); }
      if (stage === 2) { // a gold hem along the points
        const src = t.a.slice();
        for (let i = 0; i < t.a.length; i++) { const c = src[i]; if (c === null || c === INK) continue; const fx = i % t.fw, fy = Math.floor(i / t.fw); if (fx / t.k > bx + 0.2) continue; for (const [dx, dy] of [[-2, 0], [-2, 2], [0, 2], [-1, 1], [-2, 1]]) if (src[(fy + dy) * t.fw + fx + dx] === null) { t.a[i] = GOLD[1]; break; } }
      }
    });
    // the mask's ribbon tails, flying back from the knot behind the head
    const ky = ey - eh * 0.3;
    piece(g, t => {
      ribbon(t, [[bx + 1.2, ky], [bx - 1.2, ky - 1.2 - fl * 0.4], [bx - 3.0, ky - 2.4 - fl * 0.8]], 0.95, 0.42, MASK[1]);
      ribbon(t, [[bx + 1.2, ky + 0.3], [bx - 1.4, ky + 0.4 - fl * 0.2], [bx - 3.4, ky + 0.6 - fl * 0.6]], 0.9, 0.4, MASK[1]);
      shadeShape(t, MASK, 0.3, 0.4);
    });
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
    // the domino mask: one classic shape (a flat top with upswept pointed tips, dipping under each eye with a notch over the
    // nose) and a strap round to the back; the eye holes stay open so the big eyes show through
    const lx = ex - esp / 2, rxe = ex + esp / 2, mrx = ew / 2 + 1.4, mry = eh / 2 + 0.25, my0 = ey;
    const inHead = (x, y) => ((x - hx) / (rx + 0.2)) ** 2 + ((y - hy) / (ry + 0.2)) ** 2 <= 1;
    piece(g, t => {
      polyIn(t, [[lx - mrx - 2.0, my0 - mry - 1.8], [lx - mrx * 0.3, my0 - mry + 0.1], [ex, my0 - mry + 0.35], [rxe + mrx * 0.3, my0 - mry + 0.1], [rxe + mrx + 1.5, my0 - mry - 1.8],
        [rxe + mrx + 0.1, my0 + 0.3], [rxe + mrx * 0.55, my0 + mry * 0.9], [rxe, my0 + mry + 0.1], [rxe - mrx * 0.6, my0 + mry * 0.8], [ex, my0 + mry * 0.12],
        [lx + mrx * 0.6, my0 + mry * 0.8], [lx, my0 + mry + 0.1], [lx - mrx * 0.55, my0 + mry * 0.9], [lx - mrx - 0.1, my0 + 0.3]], MASK[1], (x, y) => inHead(x, y) || y < my0);
      polyIn(t, [[lx - mrx + 0.5, ky - 0.9], [bx - 0.5, ky - 0.6], [bx - 0.5, ky + 0.8], [lx - mrx + 0.5, ky + 1.0]], MASK[1], inHead);
      shadeShape(t, MASK, 0.45, 0.55);
      for (const x of [lx, rxe]) shine(t, x - mrx * 0.5, my0 - mry * 0.7, 0.9, 0.3, MASK[0], -0.15);
      for (const x of [lx, rxe]) t.ell(x, ey, ew / 2 + 0.75, eh / 2 + 0.6, null);
    });
    // the hero emblem: a gold disc with a purple lightning bolt, where the pea family wears its bow tie
    const embR = T(stage, 2.0, 2.2, 2.5), emx = hx + 0.8, emy = hy + ry * 0.96;
    piece(g, t => { t.ell(emx, emy, embR, embR * 0.95, GOLD[1]); shadeShape(t, GOLD, 0.4, 0.45); shine(t, emx - embR * 0.45, emy - embR * 0.5, embR * 0.3, embR * 0.18, GOLD[0]); });
    piece(g, t => bolt(t, emx - 0.3 * embR, emy - 0.98 * embR, embR * 0.52, CP[2]));
    eyes(g, ex, ey, r, P);
    cheeks(g, ex - 0.2, ey + r * 0.42 + 0.8, r * 1.02, [M[0], M[1], M[2]]);
    const top = topOf(g);
    legendAura(g, stage);
    twinkles(g, stage, P, [[hx + rx + 2.6, hy - ry + 1.2, 1], [bx - 1.6, hy - ry - 0.4, 0.85], [hx + rx + 4.4, hy + ry * 0.6, 0.8], [hx + 2.4, hy - ry - 2.6, 0.8], [bx - cl - 0.4, hy - ry * 0.6, 0.8]]);
    return { hx: R(hx), hy: R(hy), hr: r, top, ey: R(ey), front: R(ox + rw), hat: { x: R(hx), y: R(hy - ry * 0.5), w: R(rx * 1.8) } };
  };

  // =====================================================================================================
  // Solar Flare -> Sunburst Flare -> Solar Flare Legend
  // A sunflower heroine whose petals are plump flame teardrops (orange with a pale-yellow core) round a warm golden face, purple
  // shades pushed up on top of her head, and a warm see-through glow round the flower. Sunburst: a second, redder ring of flames
  // behind; Legend: a bigger double crown of flames, a wider golden glow and the twinkles.
  PAL.solarflare = { main: ['#fff2b4', '#ffc65a', '#ff9a4e'], acc: ['#ffe8c4', '#fbc890', '#e8a66e'], leaf: LEAF, stem: '#72bb5a', root: '#a8865a', part: 'petals', fuseLeaf: ['#fff2b4', '#ffc65a', '#ff9a4e'] };
  const SHADES = ['#9a86d0', '#5a4a86', '#4c3e76'];
  // a flame-teardrop petal from the face centre (cx, cy) along angle a: a plump round body from d0 tapering to a soft point
  // at d0 + len, nudged sideways a little by curl
  function flamePetal(t, cx, cy, a, d0, len, w, curl, col) {
    const c = cos(a), s = sin(a), px = -s, py = c, Q = (d, k) => [cx + c * d + px * k, cy + s * d + py * k];
    const bd = d0 + w, b = Q(bd, 0);
    t.ell(b[0], b[1], w, w * 0.96, col);
    t.poly([Q(bd - 0.2, -w * 0.97), Q(bd + (len - w) * 0.5, -w * 0.62 + curl * 0.3), Q(d0 + len, curl), Q(bd + (len - w) * 0.5, w * 0.62 + curl * 0.3), Q(bd - 0.2, w * 0.97)], col);
  }
  ART.solarflare = function (g, stage, P, C) {
    const f = P.frame ? 1 : 0, h = hopOf(P), M = C.main, FC = C.acc;
    const fr = T(stage, 6.2, 6.6, 7.0), cx = 15.5, cy = 26 - fr - T(stage, 3.4, 3.6, 3.8) + h;
    baseLeaves(g, P, C.leaf, { cx: 15.6 });
    stem(g, 15.6, 28.6, cy + fr, C.stem);
    const n = T(stage, 10, 10, 11), spin = -PI / 2 + (f ? 0.08 : 0) + (P.walk ? 0.1 : 0), cu = 0.35;
    // the back ring of redder flames (stage 1+), longer and between the front ones
    if (stage >= 1) {
      const BK = [M[1], mixHex(M[2], '#ff6a50', 0.4), mixHex(M[2], '#e8484c', 0.45)];
      piece(g, t => {
        for (let i = 0; i < n; i++) { const a = spin + (i + 0.5) * 2 * PI / n, lg = (i + f) % 2 ? 1 : 0.9; flamePetal(t, cx, cy, a, fr - 1.4, T(stage, 0, 6.2, 7.0) * lg, 1.55, cu, BK[1]); }
        shadeShape(t, BK, 0.6, 0.7);
      });
    }
    // the front ring: plump orange flame tongues, each with a pale-yellow core licking up it
    const fl = T(stage, 5.6, 5.6, 6.0), fw = T(stage, 2.05, 2.05, 2.1);
    piece(g, t => {
      for (let i = 0; i < n; i++) { const a = spin + i * 2 * PI / n, lg = (i + f) % 2 ? 0.88 : 1; flamePetal(t, cx, cy, a, fr - 1.9, fl * lg, fw, cu, M[2]); }
      shadeShape(t, [M[1], M[2], mixHex(M[2], '#e86a48', 0.45)], 0.5, 0.6);
      for (let i = 0; i < n; i++) { const a = spin + i * 2 * PI / n, lg = (i + f) % 2 ? 0.88 : 1; flamePetal(t, cx, cy, a, fr - 1.9, fl * 0.72 * lg, fw * 0.58, cu * 0.6, M[1]); }
      for (let i = 0; i < n; i++) { const a = spin + i * 2 * PI / n, d = fr + 0.6; t.ell(cx + cos(a) * d, cy + sin(a) * d, 0.55, 0.55, M[0]); }
    });
    piece(g, t => A.softBody(t, cx, cy, fr, fr * 0.97, FC));
    // the shades, pushed up on her head: two round lenses and a bridge across the top of her face
    const gy = cy - fr - 0.3, gx = cx + 0.4;
    piece(g, t => {
      stroke(t, [[gx - 5.0, gy + 0.9], [gx - 3.8, gy + 0.1], [gx + 3.9, gy + 0.1], [gx + 5.1, gy + 0.9]], 0.45, 0.45, SHADES[1]);
      for (const dx of [-2.3, 2.4]) t.ell(gx + dx, gy + 0.1, 2.15, 1.55, SHADES[1], dx < 0 ? 0.1 : -0.1);
      shadeShape(t, SHADES, 0.35, 0.45);
      for (const dx of [-2.3, 2.4]) stroke(t, [[gx + dx - 1.1, gy + 0.3], [gx + dx - 0.2, gy - 0.6]], 0.3, 0.3, '#e8dcff');
    });
    const ex = cx + 0.5, ey = cy + 0.9;
    A.chibiEyes(g, ex, ey, { sp: fr * 0.86, w: fr * 0.48, h: fr * 0.62, mood: P.eyes, col: '#4a2c22' });
    A.chibiMouth(g, ex, ey + fr * 0.48, P.mouth || 'smile', Math.max(1.6, fr * 0.32));
    cheeks(g, ex, ey + fr * 0.36, fr * 1.12, FC, { w: fr * 0.17, h: fr * 0.1 });
    const top = topOf(g);
    // her warm sunny glow round the flower (not the leaves), wider and golden at stage 2
    aura(g, T(stage, 1.6, 2.0, 2.8), stage === 2 ? [255, 214, 110] : [255, 190, 110], T(stage, 0.34, 0.38, 0.42), cy + fr + 3.4);
    twinkles(g, stage, P, [[cx - fr - 6.2, cy - fr - 2.6, 0.95], [cx + fr + 6.4, cy - 1.2, 0.85], [cx + fr + 5.4, cy - fr - 4.4, 0.8], [cx - fr - 6.8, cy + fr - 0.4, 0.8], [cx + 0.5, cy - fr - 8.4, 0.8]]);
    return { hx: R(cx), hy: R(cy), hr: R(fr + 4), top, ey: R(ey), hat: { x: R(cx), y: R(cy - fr + 0.6), w: 9 } };
  };

  // =====================================================================================================
  // Wall-Knight -> Wall-Paladin -> Wall-Knight Legend
  // A Wall-nut egg (big white eyes with pupils, no mouth) in a steel knight helmet whose visor is flipped up (a plate sticking
  // up and forward with two slits) and a pink plume streaming back, with a round gold-rimmed blue shield held low in front, clear
  // of the eyes (raised beside the face for a cheer). Paladin: a taller nut and a gold helmet band; Legend: the tallest, a
  // gold-rimmed visor, a gold plume knob, a big plume, a gold star on the shield (white before) and the aura.
  PAL.wallknight = { main: ['#fdebcb', '#efcb99', '#d8ab76'], leaf: LEAF, acc: STEEL, stem: '#72bb5a', root: '#a8865a', part: 'shell' };
  const PLUME = ['#ffd2dc', '#ff7e96', '#e45c7a'];
  const SHIELD = ['#e8f4ff', '#94c4ff', '#6c9ee6'];
  ART.wallknight = function (g, stage, P, C) {
    const M = C.main, S = C.acc, f = P.frame ? 1 : 0, sq = P.walk && !P.frame ? 0.35 : 0;
    const hop = P.walk && P.frame ? -1 : P.arms === 'up' ? -0.7 : 0;
    const rx = T(stage, 8.6, 8.9, 9.3) + sq, ry = T(stage, 9.6, 10.9, 11.6) - sq, hx = 15.0, hy = 30.4 - ry + hop, top0 = hy - ry;
    const ew = T(stage, 4.2, 4.4, 4.6), eh = T(stage, 4.8, 5.0, 5.3), esp = T(stage, 6.2, 6.4, 6.8);
    const ex = hx + 1.2, ey = hy + ry * T(stage, 0.02, 0.06, 0.08), brim = ey - eh / 2 - 1.5;
    const inDome = (x, y) => ((x - hx) / (rx + 0.55)) ** 2 + ((y - hy + 0.3) / (ry + 0.4)) ** 2 <= 1;
    // the plume, streaming back off the top of the helmet (behind it)
    const pl = T(stage, 1, 1.15, 1.25), pw = P.walk ? (f ? 0.8 : 0) : 0;
    piece(g, t => {
      stroke(t, [[hx + 0.4, top0 + 0.6], [hx - 0.8 * pl, top0 - 1.7 * pl], [hx - 3.4 * pl, top0 - 2.3 * pl - pw * 0.5], [hx - 6.0 * pl, top0 - 1.0 * pl - pw], [hx - 7.4 * pl, top0 + 1.6 * pl - pw]], 1.9 * pl, 0.75, PLUME[1]);
      shadeShape(t, PLUME, 0.4, 0.6);
      stroke(t, [[hx - 1.0 * pl, top0 - 1.4 * pl], [hx - 3.4 * pl, top0 - 1.95 * pl - pw * 0.5], [hx - 5.4 * pl, top0 - 1.1 * pl - pw]], 0.42, 0.3, PLUME[0]);
    });
    // the nut: an egg, fuller at the bottom
    piece(g, t => {
      t.ell(hx, hy, rx, ry, M[1]); t.ell(hx + 0.2, hy + ry * 0.3, rx * 1.03, ry * 0.68, M[1]);
      shadeShape(t, M, rx * 0.15, ry * 0.15); shine(t, hx - rx * 0.5, brim + 1.8, rx * 0.16, 0.9, M[0], -0.3);
    });
    // the helmet: a steel dome hugging the top of the nut down to a band just above the eyes
    const bandW = rx * Math.sqrt(Math.max(0, 1 - ((brim - hy) / ry) ** 2)) + 0.8;
    piece(g, t => {
      A.softBody(t, hx, hy - 0.3, rx + 0.55, ry + 0.4, S, { mask: (x, y) => y <= brim + 0.2 });
      t.ell(hx, brim - 0.1, bandW, 1.15, stage >= 1 ? GOLD[1] : S[1]);
      if (stage >= 1) shadeShape(t, GOLD, 0.5, 0.5);
    });
    for (let x = hx - bandW + 1.4; x <= hx + bandW - 1; x += 1.8) if (g.filled(x, brim - 0.1)) g.dot(x, brim - 0.1, stage >= 1 ? '#c8862e' : '#8e9ab4'); // rivets
    // the visor, flipped UP: a rounded plate lying over the front of the dome, its front edge sticking out up and forward,
    // with two eye slits
    // (Legend's visor has a gold rim)
    const vx = hx + rx * 0.4, vy = top0 + (brim - top0) * 0.44, va = -0.4, vw = rx * 0.52, vh = T(stage, 2.1, 2.2, 2.3);
    piece(g, t => {
      const plate = (e, col) => { t.ell(vx, vy, vw + e, vh + e, col, va); t.ell(vx + cos(va) * vw * 0.75, vy + sin(va) * vw * 0.75, vh * 0.92 + e, vh * 0.92 + e, col); };
      if (stage === 2) plate(0.5, GOLD[1]);
      plate(0, S[1]); shadeShape(t, S, 0.4, 0.55); shine(t, vx - vw * 0.35, vy - vh * 0.45, vw * 0.36, 0.3, S[0], va);
    });
    for (const k of [-0.2, 0.36]) { const cx2 = vx + cos(va) * vw * k, cy2 = vy + sin(va) * vw * k + 0.45; stroke(g, [[cx2 - 0.75, cy2 + 0.32], [cx2 + 0.75, cy2 - 0.3]], 0.3, 0.3, '#6e7890'); }
    if (stage === 2) piece(g, t => { t.ell(hx + 0.2, top0 + 0.3, 1.25, 1.1, GOLD[1]); shadeShape(t, GOLD, 0.3, 0.35); t.ell(hx + 0.1, top0 + 0.2, 0.55, 0.5, '#82cfff'); }); // a gold knob holding the plume
    A.chibiEyes(g, ex, ey, { white: true, sp: esp, w: ew, h: eh, look: [0.5, -0.1], mood: P.eyes });
    cheeks(g, ex - 0.4, ey + eh * 0.72, esp + 2.2, [M[0], M[1], M[2]]);
    // the round shield, held low in front, clear of the eyes; raised beside the face for a cheer; further out for 'hold'
    const sr = T(stage, 3.3, 3.6, 4.0), eb = ey + eh / 2;
    let sx = hx + rx * 0.72 + (P.arms === 'hold' || P.arms === 'out' ? 1.0 : 0), sy = Math.min(30.5 - sr, eb + 0.8 + sr);
    if (P.arms === 'up') { sx = hx + rx + 1.0; sy = ey + 0.4; }
    piece(g, t => { t.ell(sx, sy, sr, sr, GOLD[1]); shadeShape(t, GOLD, 0.5, 0.6); });
    piece(g, t => {
      t.ell(sx, sy, sr - 0.95, sr - 0.95, SHIELD[1]); shadeShape(t, SHIELD, 0.5, 0.6);
      t.poly(starPts(sx, sy + 0.1, sr * 0.56, sr * 0.25, 5), stage === 2 ? GOLD[1] : WHITE); // the knight's star (gold for Legend)
      shine(t, sx - sr * 0.42, sy - sr * 0.44, sr * 0.2, sr * 0.12, SHIELD[0]);
    });
    const top = topOf(g);
    legendAura(g, stage);
    twinkles(g, stage, P, [[hx + rx + 3, top0 + 3, 1], [hx - rx - 2.2, hy + 1.2, 0.85], [hx + rx + 2.4, top0 - 1.8, 0.8], [hx - rx - 2.4, top0 + 6.6, 0.8]]);
    return { hx: R(hx), hy: R(hy), hr: R(rx), top, ey: R(ey), hat: { x: R(hx), y: R(top0 + 2.6), w: R(rx * 1.6) } };
  };

  // =====================================================================================================
  // Chompzilla -> Chompzilla Queen -> Chompzilla Legend
  // A big regal violet Chomper: NO eyes (the family's rule), a huge happy grin that curls up at the corners (pointy white
  // Chomper teeth, pink tongue, a light lip), light spots on her dome, big leaf fins down the back of her head like a friendly
  // dino, a little gold crown and a small royal-red cape. Queen: a five-point jewelled crown, four fins and an ermine trim along
  // the cape's edge; Legend: a tall crown, five fins, a gold line inside the ermine and the aura.
  PAL.chompzilla = { main: ['#f6dcff', '#cf9cf0', '#ae7ad8'], leaf: LEAF, acc: ['#ffd0dc', '#ff9ab2', '#e87896'], stem: '#72bb5a', root: '#a8865a', part: 'jaws' };
  const CAPE = ['#ffd0d8', '#ff7e90', '#e45c74'];
  ART.chompzilla = function (g, stage, P, C) {
    const M = C.main, f = P.frame ? 1 : 0, h = hopOf(P);
    const r = T(stage, 8.6, 9.4, 10.2), ry = r * 0.9, hx = 14.6, hy = 25.9 - ry + h, bx = hx - r;
    const fl = P.walk ? (f ? 1.0 : 0.5) : f ? 0.2 : 0;
    // the royal cape: draped from behind her head, flaring out to the ground at her back; an ermine hem from Queen,
    // a gold edge for Legend
    const cw = T(stage, 3.2, 3.8, 4.2) + fl;
    piece(g, t => {
      t.poly([[hx + 1, hy + ry * 0.5], [hx - r * 0.3, hy - ry * 0.2], [bx + 0.6, hy - ry * 0.05], [bx - cw * 0.55, hy + ry * 0.4 - fl * 0.3], [bx - cw, 28.4 - fl * 0.5], [bx - cw + 0.6, 29.4], [hx, 29.4]], CAPE[1]);
      t.ell(bx - cw * 0.45, 28.6 - fl * 0.25, cw * 0.62, 1.0, CAPE[1], -0.12);
      shadeShape(t, CAPE, 0.8, 0.9);
      stroke(t, [[bx + 0.4, hy + ry * 0.35], [bx - cw * 0.45, 28.0 - fl * 0.3]], 0.22, 0.22, CAPE[2]);
      if (stage >= 1) { // a white ermine trim with little dark tufts all along the cape's outer edge (a gold line inside it for Legend)
        const src = t.a.slice(), W = t.fw, off = (i, dx, dy) => { const x = i % W + dx, y = Math.floor(i / W) + dy; return x < 0 || y < 0 || y >= t.fh ? null : src[y * W + x]; };
        const edge = (i, d) => { for (let a = 0; a <= d; a++) for (let b = 0; b <= d; b++) if ((a || b) && off(i, -a, b) === null) return true; return false; };
        for (let i = 0; i < t.a.length; i++) { const c = src[i]; if (c === null || c === INK || (i % W) / t.k > bx + 1.0) continue; if (edge(i, 2)) t.a[i] = '#fffaf4'; else if (stage === 2 && edge(i, 3)) t.a[i] = GOLD[1]; }
        for (let fy = 0; fy < t.fh; fy += 3) { let first = -1; for (let fx = 0; fx < W && fx / t.k <= bx + 1.0; fx++) if (t.a[fy * W + fx] === '#fffaf4') { first = fx; break; } if (first >= 0 && (fy / 3) % 2 === 0) t.a[fy * W + first + 1] = '#6a5a6e'; }
      }
    });
    // big leafy fins down the back of her head, like a friendly dino
    const fins = T(stage, [-1.95, -2.4, -2.85], [-1.85, -2.25, -2.65, -3.05], [-1.75, -2.1, -2.45, -2.8, -3.15]);
    piece(g, t => {
      fins.forEach((a, i) => {
        const end = i === 0 || i === fins.length - 1, len = T(stage, 4.4, 4.8, 5.2) * (end ? 0.82 : 1), w = T(stage, 1.45, 1.55, 1.65) * (end ? 0.85 : 1);
        const b0x = hx - r * 0.12 + cos(a) * r * 0.82, b0y = hy + sin(a) * ry * 0.82, aa = a - 0.2, c = cos(aa), s = sin(aa);
        t.ell(b0x + c * len * 0.42, b0y + s * len * 0.42, len * 0.46, w, C.leaf[1], aa);
        t.poly([[b0x + c * len * 0.5 - s * w * 0.8, b0y + s * len * 0.5 + c * w * 0.8], [b0x + c * (len + 1.0), b0y + s * (len + 1.0)], [b0x + c * len * 0.5 + s * w * 0.8, b0y + s * len * 0.5 - c * w * 0.8]], C.leaf[1]);
      });
      shadeShape(t, C.leaf, 0.45, 0.55);
    });
    baseLeaves(g, P, C.leaf, { cx: 15.8 });
    stem(g, 15.6, 28.6, hy + ry - 1, C.stem, 1.05);
    // the grin: a big half-moon smile from just left of centre out to her front edge, its corners curling up
    const open = P.mouth === 'open' || P.mouth === 'o' ? 1 : P.mouth === 'flat' ? -1 : 0;
    const mcx = hx + r * 0.34, mcy = hy + ry * (open > 0 ? 0.2 : 0.24), mrx = r * 0.68, mry = ry * (open > 0 ? 0.54 : open < 0 ? 0.28 : 0.42);
    const topY = x => mcy - mry * 0.1 - ((x - mcx) / mrx) ** 2 * mry * 0.6;
    const inMouth = (x, y) => ((x - mcx) / mrx) ** 2 + ((y - mcy) / mry) ** 2 <= 1 && y >= topY(x);
    piece(g, t => {
      t.ell(hx, hy, r, ry, M[1]); t.ell(hx - r * 0.3, hy - ry * 0.24, r * 0.78, ry * 0.8, M[1]);
      t.ell(hx + r * 0.3, hy + ry * 0.4, r * 0.72, ry * 0.52, M[1]);
      shadeShape(t, M, r * 0.15, ry * 0.17); shine(t, hx - r * 0.42, hy - ry * 0.5, r * 0.24, ry * 0.14, M[0]);
      const SP = lt(M[0], 0.3);
      for (const [kx, ky, s] of [[-0.48, -0.36, 1.25], [0.14, -0.64, 0.95], [-0.8, 0.12, 0.8]]) t.ell(hx + kx * r, hy + ky * ry, s, s * 0.85, SP, 0, inside(t));
      // a soft light lip round the grin
      t.ell(mcx, mcy, mrx + 0.75, mry + 0.75, '#f3c8ec', 0, fm((x, y) => t.filled(x, y) && ((x - mcx) / (mrx + 0.75)) ** 2 + ((y - mcy) / (mry + 0.75)) ** 2 <= 1 && y >= topY(x) - 0.75));
    });
    const THROAT = mixHex(M[2], '#3a1838', 0.6), TONGUE = C.acc;
    piece(g, t => {
      const m = fm(inMouth);
      t.ell(mcx, mcy, mrx + 0.2, mry + 0.2, THROAT, 0, m);
      t.ell(mcx + 0.3, mcy + mry * 0.66, mrx * 0.58, mry * 0.44, TONGUE[1], 0, m);
      t.ell(mcx - 0.4, mcy + mry * 0.5, mrx * 0.22, mry * 0.12, TONGUE[0], 0, m);
      // pointy white Chomper teeth: a row hanging from the top, a few smaller ones poking up from the bottom
      const n = T(stage, 4, 5, 5), tw = mrx * 1.8 / n, th = T(stage, 1.9, 2.0, 2.2) + (open > 0 ? 0.3 : open < 0 ? -0.5 : 0);
      const arc = x => Math.sqrt(Math.max(0, 1 - ((x - mcx) / mrx) ** 2)), yTop = x => Math.max(topY(x), mcy - mry * arc(x));
      for (let i = 0; i < n; i++) { const x = mcx - mrx * 0.9 + tw * (i + 0.5), yt = yTop(x) + 0.35; polyIn(t, [[x - tw * 0.5, yt - 0.6], [x + tw * 0.5, yt - 0.6], [x + tw * 0.5, yt], [x + 0.15, yt + th], [x - tw * 0.5, yt]], WHITE, m); }
      if (open >= 0) for (const k of [-0.34, 0.2, 0.66]) { const x = mcx + k * mrx, yb = mcy + mry * arc(x) - 0.35; polyIn(t, [[x - tw * 0.42, yb + 0.6], [x + tw * 0.42, yb + 0.6], [x + tw * 0.42, yb], [x, yb - th * 0.75], [x - tw * 0.42, yb]], WHITE, m); }
    });
    // the crown: gold, a little tilted back, a pink jewel in the band (Queen and Legend: more points and jewels)
    const cx2 = hx + 0.8, cyb = hy - ry + T(stage, 1.4, 1.5, 1.5), crw = T(stage, 3.0, 3.6, 4.0), ch = T(stage, 2.6, 3.0, 3.8), np = T(stage, 3, 5, 5);
    piece(g, t => {
      const pts = [[cx2 - crw, cyb + 0.5]];
      for (let i = 0; i < np; i++) { const x = cx2 - crw + (2 * crw) * i / (np - 1), tall = i === (np - 1) / 2 ? 0.7 : 0; pts.push([x, cyb - ch - tall]); if (i < np - 1) pts.push([x + crw / (np - 1), cyb - ch * 0.38]); }
      pts.push([cx2 + crw, cyb + 0.5]);
      t.poly(pts.map(([x, y]) => [x + (y - cyb) * 0.1, y]), GOLD[1]); shadeShape(t, GOLD, 0.4, 0.5);
      t.ell(cx2 - 0.3, cyb - ch * 0.62, crw * 0.5, 0.35, GOLD[0], 0, inside(t));
    });
    g.ell(cx2 - 0.1, cyb - 0.55, 0.7, 0.62, '#ff7aa0'); g.dot(cx2 - 0.35, cyb - 0.85, WHITE);
    if (np === 5) { g.ell(cx2 - crw * 0.6, cyb - 0.45, 0.45, 0.45, '#82cfff'); g.ell(cx2 + crw * 0.62, cyb - 0.45, 0.45, 0.45, '#86e6b4'); }
    const top = topOf(g);
    legendAura(g, stage);
    twinkles(g, stage, P, [[hx + r + 3.4, hy - ry + 0.6, 1], [bx - 3.0, hy - ry + 0.4, 0.85], [hx + r + 4.6, hy + 2.0, 0.8], [hx + 5.6, hy - ry - 3.4, 0.8]]);
    return { hx: R(hx), hy: R(hy), hr: R(r), top, ey: R(hy - ry * 0.22), front: R(hx + r), hat: { x: R(cx2), y: R(cyb - 0.6), w: R(r * 1.4) } };
  };

  // =====================================================================================================
  // Spudow -> Spudow Blast -> Spudow Legend
  // A Potato Mine hero: a lumpy potato peeking out of its dirt mound, a red polka-dot bandana wrapped across its eyes (its
  // edges curve with the potato, big eyes in the holes, the knot's tails flying at the back), and a little sprout on top whose
  // tip is a lit fuse fizzing with sparks. Blast: a bigger spark, two leaves on the sprout and leaves on the mound; Legend: an
  // eight-point starburst spark, a gold star on the knot and the aura.
  PAL.spudow = { main: ['#fff0d0', '#f0d09c', '#d8b078'], leaf: LEAF, acc: ['#e2c6a4', '#c7a482', '#a98866'], stem: '#72bb5a', root: '#a8865a', part: 'beam' };
  const BANDANA = ['#ffb4b4', '#f2646e', '#d24a5a'];
  ART.spudow = function (g, stage, P, C) {
    const M = C.main, D = C.acc, f = P.frame ? 1 : 0, hop = P.walk && P.frame ? -1.2 : P.arms === 'up' ? -0.8 : 0;
    const rx = T(stage, 7.8, 8.6, 9.4), ry = T(stage, 7.2, 7.9, 8.6), cx = 16, cy = 28.2 - ry + hop, ptop = cy - ry;
    const mrx = T(stage, 12, 13, 14), mtop = T(stage, 27.0, 26.8, 26.6);
    const r = (rx + ry) / 2, ex = cx + 1, ey = cy - ry * 0.12, ew = r * 0.48, eh = r * 0.64, esp = r * 0.86;
    // the fuse sprout: a green stalk curling up off the top with a leaf (two from Blast), a short fuse cord at its tip, lit
    const sx0 = cx - 0.6, tipX = cx + T(stage, 1.6, 1.8, 2.0), tipY = ptop - T(stage, 4.0, 4.3, 4.1);
    piece(g, t => {
      stroke(t, [[sx0, ptop + 1.2], [sx0 - 0.4, ptop - 1.4], [tipX - 0.7, tipY + 2.2], [tipX - 0.2, tipY + 1.3]], 0.62, 0.5, C.stem);
      t.ell(sx0 - 2.0, ptop - 0.9, 2.2, 1.05, flat(C.leaf), -2.6);
      if (stage >= 1) t.ell(sx0 + 1.7, ptop - 2.4, 2.0, 0.95, flat(C.leaf), -0.5);
    });
    piece(g, t => stroke(t, [[tipX - 0.2, tipY + 1.4], [tipX, tipY + 0.2]], 0.42, 0.38, '#8a6a4a'));
    const spr = T(stage, 1.8, 2.2, 2.6) + f * 0.3, rot = f ? -PI / 2 + 0.3 : -PI / 2;
    piece(g, t => { t.poly(starPts(tipX, tipY - 0.6, spr, spr * 0.46, stage === 2 ? 8 : 5, rot), '#ffb45a'); t.poly(starPts(tipX, tipY - 0.6, spr * 0.56, spr * 0.3, 5, rot + 0.3), '#fff2a0'); });
    for (const [a, d] of [[-2.75, 0.8], [-0.55, 1.0], [0.3, 0.9], [-3.2, 0.9]].slice(0, T(stage, 2, 3, 4))) { // sparks flying off it
      const dd = spr + 0.9 + d * (f ? 1.2 : 0.6); g.ell(tipX + cos(a + f * 0.3) * dd, tipY - 0.6 + sin(a + f * 0.3) * dd, 0.42, 0.42, f ? '#ffd25e' : '#ff9e58');
    }
    // the bandana's knot and tails, flying back from the back of its head
    const by = ey + 0.1, bw = eh / 2 + 0.75, fl = P.walk ? (f ? 1 : 0.4) : 0, kx = cx - rx + 0.2;
    piece(g, t => {
      ribbon(t, [[kx + 0.6, by - 0.3], [kx - 1.6, by - 1.5 - fl * 0.6], [kx - 3.8, by - 1.2 - fl]], 1.05, 0.5, BANDANA[1]);
      ribbon(t, [[kx + 0.6, by + 0.3], [kx - 1.3, by + 1.2 - fl * 0.3], [kx - 3.3, by + 2.5 - fl * 0.6]], 1.0, 0.48, BANDANA[1]);
      t.ell(kx - 0.2, by, 1.1, 1.25, BANDANA[1]);
      shadeShape(t, BANDANA, 0.35, 0.4);
    });
    // the potato: a lumpy oval with a bump up at the back
    const inPot = (x, y) => ((x - cx) / (rx + 0.1)) ** 2 + ((y - cy) / (ry + 0.1)) ** 2 <= 1 || ((x - cx + rx * 0.32) / (rx * 0.72 + 0.1)) ** 2 + ((y - cy + ry * 0.22) / (ry * 0.8 + 0.1)) ** 2 <= 1;
    piece(g, t => {
      t.ell(cx, cy, rx, ry, M[1]); t.ell(cx - rx * 0.32, cy - ry * 0.22, rx * 0.72, ry * 0.8, M[1]);
      shadeShape(t, M, rx * 0.15, ry * 0.16); shine(t, cx - rx * 0.45, cy - ry * 0.66, rx * 0.22, ry * 0.1, M[0]);
      for (const [kx2, ky2] of [[-0.62, 0.5], [0.66, -0.66]]) t.ell(cx + kx2 * rx, cy + ky2 * ry, 0.6, 0.42, mixHex(M[2], '#8a6040', 0.3), 0, inside(t));
    });
    // the bandana across its eyes: a red band wrapped round the potato (its edges curve with it), round white polka dots;
    // the eye holes stay open
    const edge = (x, s) => by + s * bw + 0.7 * ((x - cx) / rx) ** 2;
    piece(g, t => {
      t.ell(cx, by, rx + 1, bw + 1.2, BANDANA[1], 0, fm((x, y) => inPot(x, y) && y >= edge(x, -1) && y <= edge(x, 1)));
      shadeShape(t, BANDANA, 0.4, 0.5);
      for (const [dx, dy] of [[-0.78, -0.25], [-0.6, 0.55], [-0.88, 0.75], [0.06, -0.5], [0.94, 0.1]]) { const x = cx + dx * rx, y = by + dy * bw; if (t.get(x, y) === BANDANA[1] || t.get(x, y) === BANDANA[2]) t.ell(x, y, 0.62, 0.58, '#fff4f4', 0, inside(t)); }
      for (const x of [ex - esp / 2, ex + esp / 2]) t.ell(x, ey, ew / 2 + 0.6, eh / 2 + 0.55, null);
    });
    if (stage === 2) piece(g, t => { t.poly(starPts(kx - 0.1, by, 1.7, 0.75, 5), GOLD[1]); shadeShape(t, GOLD, 0.3, 0.3); });
    // the dirt mound in front (leaves on it from Blast)
    if (stage >= 1) for (const [x, a] of [[16 - mrx + 3.4, PI + 0.75], [16 + mrx - 3, -0.75]]) piece(g, t => t.ell(x + cos(a) * 1.8, mtop + 2.1 + sin(a) * 1.8, 2.4, 1.15, flat(C.leaf), a));
    piece(g, t => {
      t.ell(16, 31.4, mrx, 31.4 - mtop, D[1], 0, (x, y) => y <= 30.8); t.ell(12.6, 31.4, mrx * 0.62, 31.4 - mtop + 0.7, D[1], 0, (x, y) => y <= 30.8);
      shadeShape(t, D, 1.2, 1.2);
      for (const [x, y] of [[16 - mrx + 4, mtop + 2.4], [16 + 3.2, mtop + 3.0], [16 + mrx - 4.4, mtop + 2.2]]) t.ell(x, y, 0.75, 0.5, D[0], 0, inside(t));
    });
    eyes(g, ex, ey, r, P);
    cheeks(g, ex - 0.2, edge(ex, 1) + 1.0, r * 1.05, [M[0], M[1], M[2]], { w: 1.3, h: 0.7 });
    A.chibiMouth(g, ex + 0.2, edge(ex, 1) + 1.6, P.mouth || 'smile', Math.max(1.9, r * 0.28));
    const top = topOf(g);
    legendAura(g, stage);
    twinkles(g, stage, P, [[cx + rx + 3.2, ptop + 1.4, 1], [cx - rx - 3, ptop - 0.4, 0.85], [cx + rx + 4.6, cy + 1.2, 0.8], [tipX + 5.0, tipY - 1.4, 0.8]]);
    return { hx: R(cx), hy: R(cy), hr: R(rx), top, ey: R(ey), hat: { x: R(cx), y: R(ptop + 2), w: R(rx * 1.6) } };
  };

  // =====================================================================================================
  // Nightcap -> Night Ninja -> Nightcap Legend
  // A mushroom ninja: a violet squashed-dome cap with light spots on a wide cream-lavender stalk (the face) that flares to the
  // ground, BIG eyes on the bare stalk under the cap like the other mushrooms, and a soft indigo-plum ninja mask over the lower
  // face (its top edge dips in a gentle V over the nose; no mouth, the mask covers it) knotted at the back with flying tails, a
  // slim teal scarf below it with a silver throwing star pinned on. Night Ninja: bigger, longer tails, more spots; Legend: a gold
  // crescent moon on the cap and the aura.
  PAL.nightcap = { main: ['#e6daff', '#aa96e8', '#8a74cc'], leaf: LEAF, acc: ['#fdfaff', '#efe8f8', '#d2c6e6'], stem: '#72bb5a', root: '#a8865a', part: 'cap' };
  const NINJA = ['#b4acea', '#6a62a8', '#55508e'];
  const SCARF = ['#dafff4', '#7cd8c4', '#56b8a6'];
  const SHURI = ['#ffffff', '#dfe5f0', '#a4aec4'];
  ART.nightcap = function (g, stage, P, C) {
    const M = C.main, K = C.acc, f = P.frame ? 1 : 0, h = hopOf(P), sq = P.walk && !P.frame ? 0.4 : 0, sx = 15.2;
    const srx = T(stage, 6.8, 7.2, 7.6), sry = T(stage, 7.0, 7.4, 7.8), sy = 29.0 - sry + h, stop = sy - sry;
    const crx = T(stage, 9.4, 10.4, 11.2), cry = T(stage, 5.0, 5.6, 6.2), cby = stop + 1.4, cx = sx - 0.2;
    const er = T(stage, 7.6, 8.0, 8.4), ew = er * 0.48, eh = er * 0.64, esp = er * 0.86, ex = sx + 0.8, ey = cby + 1.9 + eh / 2;
    const fl = P.walk ? (f ? 1.1 : 0.5) : f ? 0.25 : 0, tl = T(stage, 1, 1.15, 1.3);
    // the mask's top edge: just under the eyes, dipping in a soft V in the middle; the scarf sits below it
    const m0 = ey + eh / 2 + 0.45, mTop = x => m0 + 0.8 * Math.max(0, 1 - Math.abs(x - ex) / 2.8), ny = Math.min(28.1 + h, sy + sry * 0.8), my = (m0 + ny) / 2;
    // the scarf's tail and the mask's tails, streaming back
    piece(g, t => {
      ribbon(t, [[sx - srx + 1, ny], [sx - srx - 1.8 * tl, ny + 0.5 - fl * 0.5], [sx - srx - 4.0 * tl, ny - 0.3 - fl]], 1.0, 0.6, SCARF[1]);
      shadeShape(t, SCARF, 0.35, 0.45);
    });
    piece(g, t => {
      ribbon(t, [[sx - srx + 1.2, my - 0.3], [sx - srx - 1.8 * tl, my - 1.5 - fl * 0.5], [sx - srx - 4.2 * tl, my - 1.2 - fl]], 0.9, 0.4, NINJA[1]);
      ribbon(t, [[sx - srx + 1.2, my + 0.3], [sx - srx - 1.6 * tl, my + 1.0 - fl * 0.2], [sx - srx - 3.6 * tl, my + 2.3 - fl * 0.6]], 0.85, 0.38, NINJA[1]);
      t.ell(sx - srx + 0.4, my, 1.0, 1.15, NINJA[1]);
      shadeShape(t, NINJA, 0.3, 0.4);
    });
    // the stalk (the face), flaring to the ground: no feet
    const inStalk = (x, y) => ((x - sx) / (srx + sq * 0.5 + 0.1)) ** 2 + ((y - sy) / (sry + 0.1)) ** 2 <= 1 || ((x - sx) / (srx * 0.96 + sq * 0.5 + 0.1)) ** 2 + ((y - sy - sry * 0.3) / (sry * 0.72 + 0.1)) ** 2 <= 1;
    piece(g, t => {
      t.ell(sx, 28.6, srx + 1.0 + sq, 1.4, K[1]); t.ell(sx, sy, srx + sq * 0.5, sry, K[1]); t.ell(sx, sy + sry * 0.3, srx * 0.96 + sq * 0.5, sry * 0.72, K[1]);
      shadeShape(t, K, srx * 0.15, sry * 0.15);
    });
    // the lower-face ninja mask: soft cloth from under the eyes down to the scarf, a fold line and a shine
    piece(g, t => {
      t.ell(sx, my, srx + 1, (ny - m0) / 2 + 1.6, NINJA[1], 0, fm((x, y) => inStalk(x, y) && y >= mTop(x) && y <= ny + 0.6));
      shadeShape(t, NINJA, 0.4, 0.5);
      shine(t, sx - srx * 0.55, m0 + 0.6, 1.2, 0.3, NINJA[0], 0.1);
      stroke(t, [[sx - srx * 0.55, ny - 0.75], [ex - 0.4, ny - 1.2], [sx + srx * 0.55, ny - 0.9]], 0.18, 0.18, NINJA[2]);
    });
    // the scarf round the bottom of the stalk, knotted in front, with a silver throwing star pinned on
    piece(g, t => {
      t.ell(sx, ny, srx + 1.0, 1.0, SCARF[1], 0, fm((x, y) => inStalk(x - 0.4, y) || inStalk(x + 0.4, y)));
      t.ell(sx + srx * 0.62, ny + 0.4, 1.3, 1.25, SCARF[1]); // the knot
      shadeShape(t, SCARF, 0.4, 0.5);
      for (let x = sx - srx; x < sx + srx * 0.3; x += 0.5) if (t.get(x, ny - 0.75) === SCARF[1]) t.dot(x, ny - 0.75, SCARF[0]);
    });
    { const k = g.k, ss = T(stage, 2.6, 2.8, 3.0), stx = (Math.floor((sx - 0.6) * k) + 0.5) / k, sty = (Math.floor((ny + 0.2) * k) + 0.5) / k, rot = -PI / 4 + (P.walk && f ? 0.35 : 0);
      piece(g, t => { t.poly(starPts(stx, sty, ss, ss * 0.38, 4, rot), SHURI[1]); shadeShape(t, SHURI, 0.3, 0.35); t.ell(stx, sty, 0.5, 0.5, '#6e7890'); });
      g.dot(stx + cos(rot + PI) * ss * 0.55, sty + sin(rot + PI) * ss * 0.55, WHITE); g.dot(stx + cos(rot + PI) * ss * 0.3, sty + sin(rot + PI) * ss * 0.3, WHITE); }
    // the cap: a squashed dome with a rounded rim and light spots (Legend: a gold crescent moon)
    piece(g, t => {
      t.ell(cx, cby - 0.3, crx, cry, M[1], 0, (x, y) => y <= cby);
      t.ell(cx - crx * 0.06, cby - cry * 0.5, crx * 0.74, cry * 0.72, M[1]);
      t.ell(cx, cby, crx - 0.9, 1.25, M[1]);
      shadeShape(t, M, crx * 0.12, cry * 0.2);
      shine(t, cx - crx * 0.45, cby - cry * 0.72, crx * 0.2, cry * 0.13, M[0]);
      const SP = lt(M[0], 0.45);
      for (const [dx, dy, s] of T(stage, [[-4.8, -1.8, 1.3], [0.6, -3.8, 1.2], [4.8, -1.6, 1.0]], [[-5.6, -2, 1.5], [0.2, -4.4, 1.4], [5.4, -2.2, 1.2], [-2, -0.8, 0.8]], [[-6.2, -2.2, 1.6], [-1.6, -4.8, 1.4], [6.0, -1.8, 1.2], [-2.8, -0.9, 0.9]])) t.ell(cx + dx, cby + dy * (cry / 5.2), s, s * 0.86, SP, 0, inside(t));
    });
    if (stage === 2) piece(g, t => { const mx = cx + 2.8, my2 = cby - cry * 0.6; t.ell(mx, my2, 2.1, 2.1, GOLD[1]); t.ell(mx + 1.05, my2 - 0.55, 1.75, 1.75, null); shadeShape(t, GOLD, 0.3, 0.35); });
    eyes(g, ex, ey, er, P);
    const top = topOf(g);
    legendAura(g, stage);
    twinkles(g, stage, P, [[cx + crx + 2.4, cby - cry + 0.6, 1], [cx - crx - 1.8, cby - cry - 0.4, 0.85], [sx + srx + 3.8, sy + 1.4, 0.8], [cx + 1.4, cby - cry - 3.4, 0.8]]);
    return { hx: R(sx), hy: R(cby - cry * 0.4), hr: R(crx * 0.8), top, ey: R(ey), hat: { x: R(cx), y: R(cby - cry * 0.6), w: R(crx * 1.5) } };
  };

  // =====================================================================================================
  // Captain Combustible -> Admiral Combustible -> Captain Combustible Legend
  // A Torchwood hero: a chunky tree stump on root flares, its fire blazing up from the cut top round a captain's hat (puffy white
  // top, navy band, gold badge, glossy dark peak), a friendly brown handlebar moustache, a little smile and a red scarf knotted
  // under it with its tail flying. Admiral: a taller stump, a gold braid on the hat and a bigger fire; Legend: a blue-white hot
  // core in the fire, a gold star badge and the aura.
  PAL.captaincombustible = { main: ['#f3d7b0', '#dcb084', '#c29266'], leaf: LEAF, acc: ['#ffd0cc', '#f2727a', '#d4566a'], stem: '#72bb5a', root: '#a8865a', part: 'flame' };
  const HAT = ['#8a96c8', '#56619a', '#454f84'];
  const STACHE = ['#c8946c', '#9a6644', '#7e5236'];
  // a flame tongue from its base (x, base): a round body of half width w that licks up to a point h above the base, leaning by lean
  function tongue(t, x, base, w, h, lean, col) {
    t.ell(x, base - w * 0.9, w, w, col);
    t.poly([[x - w * 0.97, base - w * 0.8], [x + lean * 0.45 - w * 0.55, base - h * 0.62], [x + lean, base - h], [x + lean * 0.5 + w * 0.6, base - h * 0.56], [x + w * 0.97, base - w * 0.8]], col);
  }
  ART.captaincombustible = function (g, stage, P, C) {
    const M = C.main, SC = C.acc, f = P.frame ? 1 : 0, h = hopOf(P) * 0.8;
    const rx = T(stage, 7.8, 8.3, 8.8), ry = T(stage, 8.2, 8.8, 9.4), cx = 16, cy = 29.4 - ry + h, rimY = cy - ry * 0.84;
    const fh = T(stage, 10.0, 10.6, 10.6), fw = rx + 0.2, FIRE = stage === 2 ? ['#ffa266', '#ffd84e', '#e4f6ff'] : ['#ff9a62', '#ffd84e', '#fff4c0'];
    const fl = P.walk ? (f ? 1 : 0.4) : 0;
    // the fire: three big tongues licking up from the cut top, well above the hat, orange round a yellow core with a pale heart
    // (blue-white for Legend); little ones at the rim's edges. They flicker with the frame.
    const fb = rimY + 0.8, k1 = f ? 1.06 : 0.94, k2 = f ? 0.94 : 1.06;
    const TG = [[cx - fw * 0.5, 2.3, fh * 0.8 * k1, -1.2], [cx + 0.3, 2.8, fh * k2, f ? 0.6 : -0.3], [cx + fw * 0.52, 2.2, fh * 0.7 * k1, 1.1]];
    piece(g, t => { for (const [x, w, hh, ln] of TG) tongue(t, x, fb, w, hh, ln, FIRE[0]); for (const sd of [-1, 1]) tongue(t, cx + sd * fw * 0.86, fb, 1.4, fh * 0.42, sd * 0.8, FIRE[0]); });
    piece(g, t => { for (const [x, w, hh, ln] of TG) tongue(t, x + 0.1, fb, w * 0.6, hh * 0.7, ln * 0.7, FIRE[1]); tongue(t, TG[1][0] + 0.2, fb, 1.0, TG[1][2] * 0.42, TG[1][3] * 0.5, FIRE[2]); });
    // the scarf's tail, flying back
    const ny = cy + ry * 0.72;
    piece(g, t => { ribbon(t, [[cx - rx + 1, ny], [cx - rx - 2.2, ny + 0.4 - fl * 0.5], [cx - rx - 4.4, ny - 0.6 - fl]], 1.1, 0.65, SC[1]); shadeShape(t, SC, 0.35, 0.45); });
    // the stump: a rounded cylinder flaring into roots
    piece(g, t => {
      t.ell(cx, cy, rx, ry, M[1]); t.poly([[cx - rx * 0.97, cy - ry * 0.55], [cx + rx * 0.97, cy - ry * 0.55], [cx + rx * 0.99, cy + ry * 0.6], [cx - rx * 0.99, cy + ry * 0.6]], M[1]);
      t.ell(cx, 29.6 + h * 0.3, rx + 1.6, 1.6, M[1]); t.ell(cx - rx - 0.6, 29.2 + h * 0.3, 2, 1.4, M[1], 0.3); t.ell(cx + rx + 0.6, 29.4 + h * 0.3, 2, 1.3, M[1], -0.3);
      shadeShape(t, M, rx * 0.13, 1.2); shine(t, cx - rx * 0.62, cy - ry * 0.12, 0.8, ry * 0.3, M[0], -0.15);
    });
    const RIM = [lt(M[0], 0.4), lt(M[0], 0.15), M[1]];
    piece(g, t => { t.ell(cx, rimY, rx - 0.5, 1.8, RIM[1]); t.ell(cx, rimY, rx * 0.5, 0.85, RIM[0]); });
    for (const [x, y0, y1] of [[cx - rx * 0.68, rimY + 2.8, cy + ry * 0.4], [cx + rx * 0.72, rimY + 3.2, cy + ry * 0.2]]) PX.stroke(g, [[x, y0], [x + 0.3, (y0 + y1) / 2], [x - 0.1, y1]], 0.22, 0.22, M[2]); // bark lines
    // the captain's hat, perched on the rim with the fire blazing round it: a puffy white top, a navy band, a gold badge and a
    // glossy dark peak to the front (Admiral: a gold braid; Legend: a gold star badge)
    const hw = T(stage, 4.8, 5.2, 5.6), hc = cx + 0.5, hb = rimY + 0.6, bandH = T(stage, 1.7, 1.8, 1.9), topY = hb - bandH;
    piece(g, t => {
      t.poly([[hc - hw * 0.84, hb], [hc - hw * 0.88, topY], [hc + hw * 0.88, topY - 0.2], [hc + hw * 0.86, hb]], HAT[1]);
      shadeShape(t, HAT, 0.4, 0.4);
    });
    piece(g, t => {
      t.ell(hc + 0.2, topY - 0.9, hw * 1.08, 1.75, '#f6f6ff', -0.06);
      shadeShape(t, ['#ffffff', '#f6f6ff', '#d6d8ea'], 0.4, 0.5); shine(t, hc - hw * 0.5, topY - 1.6, hw * 0.3, 0.35, WHITE, -0.06);
    });
    piece(g, t => { t.ell(hc + hw * 0.5, hb + 0.25, hw * 0.66, 1.05, HAT[2], 0.1, (x, y) => y >= hb - 0.5); shine(t, hc + hw * 0.3, hb + 0.25, hw * 0.3, 0.25, HAT[0], 0.1); }); // the peak
    if (stage >= 1) stroke(g, [[hc - hw * 0.78, hb - 0.55], [hc + hw * 0.78, hb - 0.65]], 0.28, 0.28, GOLD[1]);
    piece(g, t => { if (stage === 2) t.poly(starPts(hc + 0.6, topY - 0.5, 1.6, 0.7, 5), GOLD[1]); else t.ell(hc + 0.6, topY - 0.4, 1.15, 1.0, GOLD[1]); shadeShape(t, GOLD, 0.3, 0.3); });
    // the scarf, wrapped round the stump under its smile, knotted at the front
    const inStump = (x, y) => Math.abs(x - cx) <= rx + 0.4 && y <= cy + ry * 0.7 + 1.5;
    piece(g, t => {
      t.ell(cx, ny, rx + 1.2, 1.0, SC[1], 0, fm(inStump));
      t.ell(cx + rx * 0.55, ny + 0.5, 1.35, 1.35, SC[1]);
      shadeShape(t, SC, 0.4, 0.5);
      for (let x = cx - rx; x < cx + rx * 0.3; x += 0.5) if (t.get(x, ny - 0.75) === SC[1]) t.dot(x, ny - 0.75, SC[0]);
    });
    const ex = cx + 0.9, ey = cy - ry * 0.16, r = rx;
    eyes(g, ex, ey, r, P);
    cheeks(g, ex - 0.2, ey + r * 0.42, r * 1.08, [M[0], M[1], M[2]]);
    // the friendly moustache: two plump curly lobes with up-turned tips under the eyes, and a little smile below
    const my = ey + r * 0.44;
    piece(g, t => {
      for (const s of [-1, 1]) { t.ell(ex + s * 1.45, my - 0.1, 1.55, 0.85, STACHE[1], s * -0.3); t.ell(ex + s * 2.75, my - 0.75, 0.7, 0.66, STACHE[1]); t.ell(ex + s * 3.05, my - 1.35, 0.48, 0.48, STACHE[1]); }
      shadeShape(t, STACHE, 0.3, 0.35); shine(t, ex - 1.8, my - 0.45, 0.6, 0.22, STACHE[0], -0.3); shine(t, ex + 1.1, my - 0.5, 0.6, 0.22, STACHE[0], 0.3);
      t.ell(ex, my + 0.75, 0.5, 0.55, null); // a little notch in the middle
    });
    A.chibiMouth(g, ex, my + 1.75, P.mouth || 'smile', 1.9);
    const top = topOf(g);
    legendAura(g, stage);
    twinkles(g, stage, P, [[cx + rx + 3, rimY - 1.6, 1], [cx - rx - 2.6, rimY - 1.0, 0.85], [cx + rx + 3.8, cy + 2.2, 0.8], [cx - rx - 3.4, cy + 1.2, 0.8]]);
    return { hx: R(cx), hy: R(cy), hr: R(rx), top, ey: R(ey), hat: { x: R(hc), y: R(topY - 1), w: R(hw * 1.8) } };
  };

  // =====================================================================================================
  // Rose -> Rose Sorceress -> Rose Legend
  // A rose sorceress: a pale rosy face framed by a hood of rose-pink petals (a scalloped bloom behind, a curled rosebud swirl on
  // top, three overlapping petals over her forehead, petal tips curling out at her chin), big eyes, a smile, and a little green
  // wand with a gold star held up beside her by a leaf, pink magic sparkles round it. Sorceress: an outer ring of deeper petals
  // and a bigger star; Legend: a fuller bloom, a gold leaf tiara, the biggest star and the aura.
  PAL.rose = { main: ['#ffd8ec', '#ff92c0', '#ea6ea2'], leaf: LEAF, acc: ['#fffaf6', '#fff0ea', '#f4d2cc'], stem: '#72bb5a', root: '#a8865a', part: 'petals' };
  ART.rose = function (g, stage, P, C) {
    const M = C.main, FC = C.acc, f = P.frame ? 1 : 0, h = hopOf(P);
    const r = T(stage, 8, 9, 10), hx = 14.8, hy = 26.2 - r * 0.92 + h;
    const frx = r * 0.78, fry = r * 0.7, fx = hx + 0.5, fy = hy + r * 0.2;
    const PB = [M[1], mixHex(M[1], M[2], 0.55), mixHex(M[2], '#c84a74', 0.3)], PO = [M[1], mixHex(M[2], '#d85a84', 0.35), mixHex(M[2], '#c04070', 0.5)];
    baseLeaves(g, P, C.leaf, { cx: 15.0 });
    stem(g, 15.0, 28.6, hy + r * 0.8, C.stem);
    // the wand, held up beside her by a curled leaf: a green stick with a gold star (raised for a cheer, out for 'hold')
    const up = P.arms === 'up' ? 1 : 0, hold = P.arms === 'hold' || P.arms === 'out' ? 1 : 0;
    const wx0 = hx + r * 0.98 + 0.4 + hold * 0.6, wy0 = hy + r * 0.82 - up * 1.0, wl = T(stage, 6.0, 6.6, 7.2), wa = -1.32 - up * 0.2 + hold * 0.3;
    const wx1 = wx0 + cos(wa) * wl, wy1 = wy0 + sin(wa) * wl, st = T(stage, 2.0, 2.4, 2.8);
    // Sorceress and Legend: an outer ring of deeper-pink petals peeking out behind the hood
    if (stage >= 1) piece(g, t => {
      const n = T(stage, 0, 7, 9);
      for (let i = 0; i < n; i++) { const a = PI * 0.92 + i * (PI * 1.16) / (n - 1); t.ell(hx + cos(a) * r * 0.86, hy + 0.4 + sin(a) * r * 0.8, r * 0.34, r * 0.3, PO[1], a); }
      shadeShape(t, PO, 0.6, 0.7);
    });
    // the hood: a round bloom with a scalloped top edge of big rounded petals
    const np = T(stage, 5, 6, 7);
    piece(g, t => {
      t.ell(hx, hy + 0.2, r * 0.98, r * 0.9, PB[1]);
      for (let i = 0; i < np; i++) { const a = PI + 0.25 + i * (PI - 0.5) / (np - 1); t.ell(hx + cos(a) * r * 0.74, hy + 0.2 + sin(a) * r * 0.7, r * 0.36, r * 0.33, PB[1]); }
      shadeShape(t, PB, 0.8, 0.9);
      for (let i = 0; i < np - 1; i++) { const a = PI + 0.25 + (i + 0.5) * (PI - 0.5) / (np - 1); stroke(t, [[hx + cos(a) * r * 0.86, hy + 0.2 + sin(a) * r * 0.84], [hx + cos(a) * r * 0.62, hy + 0.2 + sin(a) * r * 0.6]], 0.2, 0.2, PB[2]); } // folds between the petals
    });
    // the rosebud swirl on top
    piece(g, t => {
      const sx2 = hx - 0.2, sy2 = hy - r * 0.74;
      t.ell(sx2, sy2, r * 0.54, r * 0.4, M[1]); shadeShape(t, M, 0.5, 0.6); shine(t, sx2 - r * 0.22, sy2 - r * 0.18, r * 0.16, r * 0.08, M[0], 0);
      // the rose's spiral: two turns winding in to the middle
      const pts = []; for (let i = 0; i <= 26; i++) { const a = -PI * 0.15 + i * 0.48, rr = r * 0.44 - i * 0.135; if (rr > 0.25) pts.push([sx2 + cos(a) * rr * 1.18, sy2 + sin(a) * rr * 0.8]); }
      stroke(t, pts, 0.3, 0.24, mixHex(M[2], '#c04a7a', 0.25));
    });
    if (stage === 2) piece(g, t => { // a gold leaf tiara on the bud
      const x = hx, y = hy - r * 0.96;
      t.poly([[x - 3.4, y + 0.9], [x - 3.2, y - 1.0], [x - 1.6, y - 0.1], [x, y - 2.3], [x + 1.6, y - 0.1], [x + 3.2, y - 1.0], [x + 3.4, y + 0.9]], GOLD[1]);
      shadeShape(t, GOLD, 0.4, 0.5);
    });
    if (stage === 2) g.ell(hx, hy - r * 0.96 - 0.3, 0.55, 0.55, '#ff6a9a');
    // the face: a soft round pale face in the hood, a touch wider than tall
    piece(g, t => { A.softBody(t, fx, fy, frx, fry, FC); });
    // a rim of little rounded petals over her forehead, and petal tips curling out at her chin
    for (const [k, w] of [[-0.6, 0.3], [0.62, 0.3], [0.0, 0.34]]) piece(g, t => {
      const x = fx + k * frx, y = fy - fry * 0.88 + Math.abs(k) * 1.1;
      t.ell(x, y, r * w, r * 0.22, M[1], k * 0.3); shadeShape(t, M, 0.35, 0.45);
      stroke(t, [[x - r * w * 0.5, y - r * 0.02], [x, y - r * 0.12], [x + r * w * 0.5, y - r * 0.02]], 0.18, 0.18, M[0]); // the curled-back petal edge
    });
    piece(g, t => {
      for (const s2 of [-1, 1]) { const x = fx + s2 * frx * 0.98, y = fy + fry * 0.5; t.ell(x, y, r * 0.17, r * 0.3, M[1], s2 * -0.4); t.poly([[x - r * 0.15, y + r * 0.16], [x + s2 * r * 0.22, y + r * 0.52], [x + r * 0.15, y + r * 0.16]], M[1]); }
      shadeShape(t, M, 0.4, 0.5);
    });
    piece(g, t => { // the wand stick + the leaf hand holding it
      stroke(t, [[wx0, wy0], [wx1, wy1]], 0.5, 0.45, '#5ea850');
      t.ell(wx0 - 0.3, wy0 + 0.5, 1.9, 1.0, flat(C.leaf), -0.5 - up * 0.3);
    });
    piece(g, t => { t.poly(starPts(wx1, wy1 - 0.2, st, st * 0.48, 5, -PI / 2 + (f ? 0.2 : 0)), GOLD[1]); shadeShape(t, GOLD, 0.35, 0.45); shine(t, wx1 - st * 0.25, wy1 - st * 0.45, st * 0.2, st * 0.14, GOLD[0]); });
    // pink magic sparkles round the star (more from Sorceress)
    for (const [dx, dy, s] of [[st + 1.3, -0.4, 0.55], [-st - 1.0, -1.6, 0.5], [st + 0.6, st + 1.6, 0.45], [-0.6, -st - 1.8, 0.45]].slice(0, T(stage, 2, 3, 4))) {
      const k = f ? 1.15 : 0.9, x = Math.min(31, wx1 + dx * k), y = wy1 + dy * k, kk = g.k, X = (Math.floor(x * kk) + 0.5) / kk, Y = (Math.floor(y * kk) + 0.5) / kk;
      piece(g, t => t.poly(starPts(X, Y, 2.3 * s, 0.75 * s, 4), '#ffc4e0'));
    }
    const ex = fx + 0.3, ey = fy + fry * 0.1;
    A.chibiEyes(g, ex, ey, { sp: frx * 0.9, w: frx * 0.5, h: fry * 0.74, mood: P.eyes, col: '#4a2a3a' });
    cheeks(g, ex - 0.1, ey + fry * 0.48, frx * 1.08, FC, { w: 1.3, h: 0.7 });
    A.chibiMouth(g, ex + 0.1, ey + fry * 0.58, P.mouth || 'smile', Math.max(1.7, r * 0.22));
    const top = topOf(g);
    legendAura(g, stage);
    twinkles(g, stage, P, [[hx - r - 2.6, hy - r * 0.4, 1], [hx + r * 0.7, hy - r - 1.4, 0.85], [hx - r - 3.0, hy + r * 0.6, 0.8], [hx - 3.6, hy - r - 2.6, 0.8]]);
    return { hx: R(hx), hy: R(hy), hr: R(r), top, ey: R(ey), hat: { x: R(hx), y: R(hy - r * 0.62), w: R(r * 1.6) } };
  };
})();
