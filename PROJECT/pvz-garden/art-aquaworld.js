// art-aquaworld.js — PVZ Garden: My Aquarium backdrops (the far scenery behind the tank) and the sand floors.
// Loaded after art-aqua.js (the registries and the builder live there). Adds:
//   PX.AQUA_BACKDROP[id] = { water: [top, mid, deep], draw(g, w, h, f) }   reef (default), lagoon, deep, wreck, night, atlantis
//   PX.AQUA_SAND[id]     = { ramp: [light, mid, dark], dots: [colour...] }  white (default), pink, black, rainbow
// Style: soft far-away silhouettes in one or two muted shades of the water colour, a thin lighter rim where light from above
// catches a top edge, no outline. Scenery stays in the middle / lower band (the game's sand covers the bottom ~22%, the top
// half is open water for the fish, light rays and bubbles) and is placed by fractions of w / h, so it fits any tank from
// about 200 x 120 to 340 x 170 art px (and the 30 x 20 shop icon). f (the frame) is passed through but not used yet.
(function () {
  'use strict';
  if (!window.PX || !PX.Grid) return;
  const { Grid } = PX;
  // our own blend of two #rrggbb colours (k = 0 -> a, 1 -> b), so the file doesn't depend on art-core.js loading first
  function mixHex(a, b, k) {
    if (typeof a !== 'string' || typeof b !== 'string' || a[0] !== '#' || b[0] !== '#') return a;
    const A = parseInt(a.slice(1, 7), 16), B = parseInt(b.slice(1, 7), 16), ch = s => Math.round((A >> s & 255) + ((B >> s & 255) - (A >> s & 255)) * k);
    return '#' + ((1 << 24) + (ch(16) << 16) + (ch(8) << 8) + ch(0)).toString(16).slice(1);
  }
  const BD = PX.AQUA_BACKDROP = PX.AQUA_BACKDROP || {};
  const SD = PX.AQUA_SAND = PX.AQUA_SAND || {};
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  const bay = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
  // a steady pseudo-random number in [0, 1)
  const rnd = (i, s) => { const v = Math.sin(i * 127.1 + (s || 0) * 311.7) * 43758.5453; return v - Math.floor(v); };
  // colour mixing, cached by light colour -> amount -> colour (the glows mix many pixels, but the water has few colours)
  const MX = new Map();
  let mxN = 0;
  function mix(a, b, k) {
    let m = MX.get(b); if (!m) MX.set(b, m = new Map());
    let n = m.get(k); if (!n) m.set(k, n = new Map());
    let v = n.get(a); if (v === undefined) { v = mixHex(a, b, k); if (++mxN > 20000) { MX.clear(); mxN = 0; } else n.set(a, v); }
    return v;
  }
  // a thick line through pts with round ends, its radius easing from r0 to r1 along the way (one capsule per segment,
  // flat colour; the same look as PX.stroke, which stamps a circle every 0.3 px and is slow for many grass blades)
  function line(t, pts, r0, r1, col) {
    const K = t.k, W = t.fw, H = t.fh, a = t.a, L = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const len = L[L.length - 1] || 1;
    for (let i = 1; i < pts.length; i++) {
      const ax = pts[i - 1][0], ay = pts[i - 1][1], dx = pts[i][0] - ax, dy = pts[i][1] - ay, dd = dx * dx + dy * dy || 1e-9;
      const ra = r0 + (r1 - r0) * L[i - 1] / len, rb = r0 + (r1 - r0) * L[i] / len, R = Math.max(ra, rb);
      const fx0 = Math.max(0, Math.floor((Math.min(ax, ax + dx) - R) * K)), fx1 = Math.min(W - 1, Math.ceil((Math.max(ax, ax + dx) + R) * K));
      const fy0 = Math.max(0, Math.floor((Math.min(ay, ay + dy) - R) * K)), fy1 = Math.min(H - 1, Math.ceil((Math.max(ay, ay + dy) + R) * K));
      for (let fy = fy0; fy <= fy1; fy++) for (let fx = fx0; fx <= fx1; fx++) {
        const px = (fx + 0.5) / K - ax, py = (fy + 0.5) / K - ay, u = Math.max(0, Math.min(1, (px * dx + py * dy) / dd)), qx = dx * u - px, qy = dy * u - py, r = ra + (rb - ra) * u;
        if (qx * qx + qy * qy <= r * r) a[fy * W + fx] = col;
      }
    }
    return t;
  }

  // ---------------- laying scenery on the water ----------------
  // draw(t) paints shapes on a scratch grid; they land on g as flat fills with a thin lighter rim where a top edge catches
  // the light (1 fine px, then a checker of the next), never an outline. o.rim = how much lighter, o.glow = the light colour,
  // o.side = also light the left edges (tall spires).
  function layer(g, draw, o) {
    o = o || {};
    const t = new Grid(g.w, g.h, g.k); draw(t);
    const W = t.fw, H = t.fh, a = t.a, A = g.a, k = o.rim == null ? 0.25 : o.rim, glow = o.glow || '#ffffff', side = !!o.side;
    for (let fy = 0; fy < H; fy++) for (let fx = 0, i = fy * W; fx < W; fx++, i++) {
      const c = a[i]; if (!c) continue;
      let v = c;
      if (k) {
        if (fy === 0 || !a[i - W]) v = mix(c, glow, k);
        else if ((fy > 1 && !a[i - 2 * W] && ((fx + fy) & 1)) || (side && fx > 0 && !a[i - 1])) v = mix(c, glow, k * 0.5);
      }
      A[i] = v;
    }
    return g;
  }
  // Flat fills straight into the fine pixels, one span per row (the engine's ell / poly test a whole square per shape,
  // which is slow for the wide ovals and long bands of scenery).
  // a rounded box from (x0, y0) to (x1, y1), corner radius r
  function box(t, x0, y0, x1, y1, r, col) {
    const K = t.k, W = t.fw, a = t.a;
    r = Math.max(0, Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2));
    for (let fy = Math.max(0, Math.floor(y0 * K)); fy < Math.min(t.fh, Math.ceil(y1 * K)); fy++) {
      const py = (fy + 0.5) / K, dy = py < y0 + r ? y0 + r - py : py > y1 - r ? py - (y1 - r) : 0; if (dy > r) continue;
      const ins = r - Math.sqrt(r * r - dy * dy), f0 = Math.max(0, Math.ceil((x0 + ins) * K - 0.5)), f1 = Math.min(W - 1, Math.floor((x1 - ins) * K - 0.5));
      for (let fx = f0, i = fy * W + f0; fx <= f1; fx++, i++) a[i] = col;
    }
    return t;
  }
  // an upright oval (no rotation, one colour)
  function oval(t, cx, cy, rx, ry, col) {
    if (!(rx > 0 && ry > 0)) return t;
    const K = t.k, W = t.fw, a = t.a;
    for (let fy = Math.max(0, Math.floor((cy - ry) * K)); fy <= Math.min(t.fh - 1, Math.ceil((cy + ry) * K)); fy++) {
      const dy = ((fy + 0.5) / K - cy) / ry; if (dy * dy > 1) continue;
      const hw = rx * Math.sqrt(1 - dy * dy), f0 = Math.max(0, Math.ceil((cx - hw) * K - 0.5)), f1 = Math.min(W - 1, Math.floor((cx + hw) * K - 0.5));
      for (let fx = f0, i = fy * W + f0; fx <= f1; fx++, i++) a[i] = col;
    }
    return t;
  }
  // recolour what is already drawn inside a box (hoops, fluting, shade sides)
  function boxIn(t, x0, y0, x1, y1, col) {
    const K = t.k, W = t.fw, a = t.a;
    for (let fy = Math.max(0, Math.floor(y0 * K)); fy < Math.min(t.fh, Math.ceil(y1 * K)); fy++) for (let fx = Math.max(0, Math.floor(x0 * K)), i = fy * W + fx; fx < Math.min(W, Math.ceil(x1 * K)); fx++, i++) if (a[i]) a[i] = col;
  }

  // ---------------- shapes (drawn on the scratch grid) ----------------
  // a long ridge of round bumps whose tops wander between y - amp and y, filled down to the bottom
  function ridge(t, w, h, y, amp, gap, seed, col) {
    box(t, -2, y, w + 2, h + 2, 0, col);
    const n = Math.max(2, Math.round(w / gap));
    for (let i = -1; i <= n + 1; i++) {
      const x = (i + (rnd(i, seed) - 0.5) * 0.6) * w / n, top = y - amp * (0.3 + 0.7 * rnd(i, seed + 1)), rx = w / n * (0.55 + 0.3 * rnd(i, seed + 2));
      oval(t, x, y + 0.5, rx, y + 0.5 - top, col);
    }
  }
  // a reef pillar: lumpy rounded rocks piled from (x, base) up to y = top, about rw wide, with knobs on the sides
  function stack(t, x, base, top, rw, seed, col) {
    const n = Math.max(2, Math.round((base - top) / (rw * 0.9))), step = (base - top) / (n + 0.4);
    for (let i = 0; i < n; i++) {
      const q = i / n, cx = x + (rnd(i, seed) - 0.5) * rw * 0.5, r = rw * (1 - q * 0.35) * (0.85 + rnd(i, seed + 1) * 0.3);
      oval(t, cx, base - step * (i + 0.45), r, step * 0.95, col);
      if (rnd(i, seed + 2) > 0.35) { const sd = rnd(i, seed + 3) > 0.5 ? 1 : -1; oval(t, cx + sd * r * 0.85, base - step * (i + 0.2), r * 0.5, step * 0.55, col); }
    }
  }
  // a sea fan on a short trunk at (x, y), radius r, leaning a little: five ribs that fork on the way to a soft rim, joined by
  // a few uneven cross threads (an organic net, not neat rings, so it never looks like a spider web)
  function fan(t, x, y, r, col, lean) {
    lean = lean || 0;
    const cx = x + r * lean * 0.25, cy = y - r * 0.15, th = Math.max(0.3, r * 0.034), seed = Math.round(x * 7 + y * 3);
    const a0 = -Math.PI * 0.93 + lean * 0.3, a1 = -Math.PI * 0.07 + lean * 0.3, P = (a, q) => [cx + Math.cos(a) * r * q, cy + Math.sin(a) * r * q * 0.88], tip = i => a0 + (a1 - a0) * i / 9;
    line(t, [[x, y + 1], [cx, cy]], th * 2.4, th * 1.8, col);
    for (let k = 0; k < 5; k++) {
      const am = (tip(2 * k) + tip(2 * k + 1)) / 2, m = P(am, 0.42 + rnd(k, seed) * 0.12);
      line(t, [[cx, cy], m], th * 1.6, th * 1.25, col);
      for (const i of [2 * k, 2 * k + 1]) line(t, [m, P((tip(i) * 2 + am) / 3, 0.74), P(tip(i), 0.97)], th * 1.2, th, col);
    }
    const rim = []; for (let i = 0; i <= 20; i++) rim.push(P(a0 + (a1 - a0) * i / 20, 0.97 + Math.sin(i * 1.7 + seed) * 0.025));
    line(t, rim, th, th, col);
    for (let i = 0; i < 9; i++) for (let j = 0; j < 2; j++) {
      const q = 0.62 + 0.28 * (j + rnd(i * 3 + j, seed + 1)) / 2, q2 = q + (rnd(i * 5 + j, seed + 2) - 0.5) * 0.14;
      line(t, [P(tip(i) + 0.03, q), P(tip(i + 1) - 0.03, q2)], th * 0.85, th * 0.85, col);
    }
  }
  // branching (staghorn) coral growing up from (x, y), about s tall; pushes its round tips onto tips
  function branch(t, x, y, s, col, seed, tips) {
    const grow = (x0, y0, a, len, r, d, k) => {
      const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len, mx = (x0 + x1) / 2 - Math.sin(a) * len * 0.08, my = (y0 + y1) / 2 + Math.cos(a) * len * 0.08;
      line(t, [[x0, y0], [mx, my], [x1, y1]], r, r * 0.86, col);
      if (d <= 0) { oval(t, x1, y1, r * 1.05, r * 1.05, col); if (tips) tips.push([x1, y1]); return; }
      const sp = 0.4 + rnd(k, seed) * 0.3;
      grow(x1, y1, a - sp, len * 0.74, r * 0.82, d - 1, k * 2 + 1);
      grow(x1, y1, a + sp * 0.9, len * 0.7, r * 0.82, d - 1, k * 2 + 2);
    };
    grow(x, y, -Math.PI / 2 + (rnd(0, seed) - 0.5) * 0.4, s * 0.38, Math.max(0.4, s * 0.075), 2, 1);
  }
  // a round coral head sitting on the floor at (x, y)
  const dome = (t, x, y, r, col) => oval(t, x, y, r, r * 0.8, col);
  // tube sponges: three round-topped tubes from (x, y), the tallest s, with dark openings
  function tubes(t, x, y, s, col, dark) {
    for (const [dx, hk, rk] of [[-0.24, 0.68, 0.13], [0, 1, 0.15], [0.23, 0.52, 0.12]]) {
      const r = Math.max(0.5, s * rk), cx = x + dx * s, top = y - s * hk + r * 0.5;
      line(t, [[cx, y + 2], [cx, top]], r, r, col); oval(t, cx, top - r * 0.35, r * 0.62, r * 0.32, dark);
    }
  }
  // a clump of sea grass: n thin blades from (x, y), up to len tall, swaying to one side
  function grass(t, x, y, len, n, col, seed, sway) {
    for (let i = 0; i < n; i++) {
      const dx = (i - (n - 1) / 2) * Math.max(0.55, len * 0.07), L = len * (0.5 + 0.5 * rnd(i, seed)), lean = ((sway || 0) + (rnd(i, seed + 1) - 0.5) * 0.8 + dx * 0.05) * L * 0.4;
      const pts = []; for (let k = 0; k <= 8; k++) { const q = k / 8; pts.push([x + dx + lean * q * q, y + 1 - (L + 1) * q]); }
      line(t, pts, Math.max(0.4, len * 0.04), 0.22, col);
    }
  }
  // a tall rock spire from (x, base) up to y = top, rw wide at the foot, wobbling a little
  function spire(t, x, base, top, rw, seed, col) {
    const H = base - top, n = Math.max(5, Math.round(H / 2.5)), wob = q => Math.sin(q * 3.2 + seed) * rw * 0.2;
    for (let i = 0; i <= n; i++) {
      const q = i / n, r = Math.max(0.6, rw * (1 - q * 0.7) * (0.92 + rnd(i, seed) * 0.16));
      oval(t, x + wob(q), base - H * q + r * 0.3, r, Math.max(1, H / n), col);
    }
  }

  // ---------------- light and glow (drawn straight on g, after the scenery) ----------------
  // a soft glowing speck: a bright core and a faint halo mixed into whatever is behind
  function speck(g, x, y, col, big) {
    const K = g.k, fx = Math.round(x * K), fy = Math.round(y * K);
    const soft = (a, b, k) => { const c = g.fget(fx + a, fy + b); if (c) g.fset(fx + a, fy + b, mix(c, col, k)); };
    if (big) {
      for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) g.fset(fx + a, fy + b, col);
      for (const [a, b] of [[-1, 0], [-1, 1], [2, 0], [2, 1], [0, -1], [1, -1], [0, 2], [1, 2]]) soft(a, b, 0.5);
      for (const [a, b] of [[-1, -1], [2, -1], [-1, 2], [2, 2]]) soft(a, b, 0.2);
    } else {
      g.fset(fx, fy, col); for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) soft(a, b, 0.4);
    }
  }
  // a round glow at (x, y), radius r art px: a core and three rings fading into whatever is behind
  function glow(g, x, y, r, col, core) {
    const K = g.k, cx = x * K, cy = y * K, R = r * K;
    for (let fy = Math.floor(cy - R); fy <= Math.ceil(cy + R); fy++) for (let fx = Math.floor(cx - R); fx <= Math.ceil(cx + R); fx++) {
      const d = Math.hypot(fx + 0.5 - cx, fy + 0.5 - cy) / R, c = g.fget(fx, fy); if (d > 1 || !c) continue;
      g.fset(fx, fy, d < 0.3 ? core || col : mix(c, col, d < 0.55 ? 0.62 : d < 0.8 ? 0.34 : 0.15));
    }
  }
  // drifting specks scattered over a band of the water (y0..y1 as shares of h); n grows with the tank's area.
  // In a tiny picture (the shop icon) they shrink to single soft fine pixels.
  function specks(g, w, h, y0, y1, per, cols, seed) {
    const n = Math.max(2, Math.round(w * h / per)), tiny = w < 80;
    for (let i = 0; i < n; i++) {
      const x = 2 + rnd(i, seed) * (w - 4), y = h * (y0 + (y1 - y0) * rnd(i, seed + 1)), col = cols[i % cols.length];
      if (tiny) { const c = g.get(x, y); if (c) g.dot(x, y, mix(c, col, 0.6)); } else speck(g, x, y, col, rnd(i, seed + 2) > 0.7);
    }
  }
  // a big soft light: rings of col mixed into the water, their edges dithered like the water itself
  function halo(g, x, y, rx, ry, col, ks) {
    const K = g.k, W = g.fw, A = g.a, NK = ks.length, maps = ks.map(() => new Map());
    // ring n where (1 - d) * NK * 1.15 + (dither - 0.5) * 0.8 >= n, i.e. d <= 1 - (n - (dither - 0.5) * 0.8) / (NK * 1.15): squared, per dither level
    const T2 = BAYER.map(b => ks.map((_, n) => { const t = 1 - (n + 1 - (b - 0.5) * 0.8) / (NK * 1.15); return t > 0 ? t * t : -1; }));
    for (let fy = Math.max(0, Math.floor((y - ry) * K)); fy < Math.min(g.fh, Math.ceil((y + ry) * K)); fy++) {
      const dy = (fy / K - y) / ry, dy2 = dy * dy; if (dy2 >= 1) continue;
      const hw = rx * Math.sqrt(1 - dy2), row = ((fy >> 1) & 3) * 4;
      for (let fx = Math.max(0, Math.floor((x - hw) * K)); fx < Math.min(W, Math.ceil((x + hw) * K)); fx++) {
        const dx = (fx / K - x) / rx, d2 = dx * dx + dy2, T = T2[row + ((fx >> 1) & 3)];
        let n = 0; while (n < NK && d2 <= T[n]) n++;
        const i = fy * W + fx, c = A[i]; if (!n || !c) continue;
        const M = maps[n - 1]; let v = M.get(c); if (v === undefined) { v = mixHex(c, col, ks[n - 1]); M.set(c, v); }
        A[i] = v;
      }
    }
  }
  // sunlit ripples near the surface: a net of thin wobbly light lines (the edges of soft cells, bent by a gentle warp),
  // thinning out with depth
  function ripples(g, w, h, depth, cols) {
    const s = Math.min(1.2, Math.max(0.35, Math.min(w / 260, h / 146))), K = g.k, W = g.fw, A = g.a, FH = Math.min(g.fh, Math.round(h * depth * K)), cw = 13 * s, ch = 7 * s;
    // one jittered seed per cell; cell (i, j) lives at (i + 2) + (j + 2) * NI (the warp can reach a little past the edges)
    const NI = Math.ceil(w / cw) + 6, NJ = Math.ceil(FH / K / ch) + 6, SX = new Float64Array(NI * NJ), SY = new Float64Array(NI * NJ);
    for (let j = -2; j < NJ - 2; j++) for (let i = -2; i < NI - 2; i++) { const n = i + 2 + (j + 2) * NI; SX[n] = (i + 0.2 + 0.6 * rnd(i * 31 + j * 7, 7)) * cw; SY[n] = (j + 0.2 + 0.6 * rnd(j * 17 + i * 5, 9)) * ch; }
    // the gentle warp that bends the cell edges: x + sin((y * 0.42 + x * 0.12) / s) * 1.8s, y + sin((x * 0.3 + y * 0.17) / s) * 1.2s
    const sb = new Float64Array(W), cb = new Float64Array(W), sc = new Float64Array(W), cc = new Float64Array(W);
    for (let fx = 0; fx < W; fx++) { const x0 = fx / K; sb[fx] = Math.sin(x0 * 0.12 / s); cb[fx] = Math.cos(x0 * 0.12 / s); sc[fx] = Math.sin(x0 * 0.3 / s); cc[fx] = Math.cos(x0 * 0.3 / s); }
    for (let fy = 0; fy < FH; fy++) {
      const q = fy / FH, y0 = fy / K, thr = (0.5 - q * 0.22) * Math.max(0.6, s), col = cols[q < 0.4 ? 0 : 1], cut = q * 1.15 - 0.1;
      const sa = Math.sin(y0 * 0.42 / s) * 1.8 * s, ca = Math.cos(y0 * 0.42 / s) * 1.8 * s, sd = Math.sin(y0 * 0.17 / s) * 1.2 * s, cd = Math.cos(y0 * 0.17 / s) * 1.2 * s;
      for (let fx = 0; fx < W; fx++) {
        if (bay(fx >> 1, fy >> 1) <= cut) continue;
        const x = fx / K + sa * cb[fx] + ca * sb[fx], y = y0 + sc[fx] * cd + cc[fx] * sd, ci = Math.floor(x / cw), cj = Math.floor(y / ch);
        let m1 = 1e18, m2 = 1e18;
        for (let j = Math.max(-2, cj - 1); j <= Math.min(NJ - 3, cj + 1); j++) for (let i = Math.max(-2, ci - 1); i <= Math.min(NI - 3, ci + 1); i++) {
          const n = i + 2 + (j + 2) * NI, dx = x - SX[n], dy = (y - SY[n]) * 1.4, m = dx * dx + dy * dy;
          if (m < m1) { m2 = m1; m1 = m; } else if (m < m2) m2 = m;
        }
        if (Math.sqrt(m2) - Math.sqrt(m1) < thr) A[fy * W + fx] = col;
      }
    }
  }

  // =====================================================================================================
  // Coral Reef (the default): bright aqua water, a soft reef wall with rock pillars, sea fans and branch coral
  // =====================================================================================================
  BD.reef = { water: ['#a6ecf6', '#5ec8ea', '#3c9cd8'], draw(g, w, h) {
    const s = Math.min(w / 260, h / 146), F = '#4db1cc', N = '#409fbc', D = '#378cab', L = { rim: 0.24, glow: '#e0fcff' };
    layer(g, t => {
      ridge(t, w, h, h * 0.63, h * 0.1, 22 * s, 3, F);
      stack(t, w * 0.21, h * 0.66, h * 0.4, 9 * s, 1, F);
      stack(t, w * 0.67, h * 0.66, h * 0.45, 8 * s, 2, F);
      fan(t, w * 0.09, h * 0.59, 15 * s, F, -0.3);
      fan(t, w * 0.81, h * 0.57, 13 * s, F, 0.25);
      branch(t, w * 0.37, h * 0.61, 20 * s, F, 4);
      branch(t, w * 0.94, h * 0.6, 16 * s, F, 5);
    }, L);
    layer(g, t => {
      ridge(t, w, h, h * 0.755, h * 0.035, 30 * s, 13, N);
      for (const [fx, r] of [[0.03, 10], [0.28, 7], [0.53, 11], [0.63, 6], [0.89, 9]]) dome(t, w * fx, h * 0.745, r * s, N);
      tubes(t, w * 0.45, h * 0.75, 20 * s, N, D);
      branch(t, w * 0.15, h * 0.75, 19 * s, N, 6);
      branch(t, w * 0.76, h * 0.75, 21 * s, N, 7);
    }, L);
  } };

  // =====================================================================================================
  // Tropical Lagoon: very light shallow water, sunlit ripples near the top, gentle sandbars and sea grass far back
  // =====================================================================================================
  BD.lagoon = { water: ['#ccf8f2', '#a2eee6', '#76dad6'], draw(g, w, h) {
    const s = Math.min(w / 260, h / 146), L = { rim: 0.4, glow: '#ffffff' }, GF = '#88d6c4', GN = '#6ec6b2';
    ripples(g, w, h, 0.3, ['#f6fffd', '#e6fcf7']);
    layer(g, t => {
      ridge(t, w, h, h * 0.66, h * 0.035, 70 * s, 11, '#b2ecdc');
      for (const [fx, len, n, sd, sw] of [[0.1, 14, 6, 1, 0.3], [0.33, 11, 5, 2, -0.2], [0.58, 13, 5, 3, 0.1], [0.86, 15, 6, 4, -0.1]]) grass(t, w * fx, h * 0.665, len * s, n, GF, sd, sw);
    }, L);
    layer(g, t => {
      oval(t, w * 0.24, h * 0.8, w * 0.34, h * 0.09, '#c0f1dc'); oval(t, w * 0.8, h * 0.81, w * 0.3, h * 0.08, '#c0f1dc');
      box(t, -2, h * 0.79, w + 2, h + 2, 0, '#c0f1dc');
      for (const [fx, fy, rx, ry] of [[0.515, 0.757, 5.5, 3.6], [0.548, 0.748, 4.4, 4.4], [0.58, 0.76, 3.4, 2.6]]) oval(t, w * fx, h * fy, rx * s, ry * s, '#9cdcca');
      for (const [fx, len, n, sd, sw] of [[0.05, 19, 7, 5, 0.2], [0.24, 15, 6, 6, -0.3], [0.45, 17, 6, 7, 0.15], [0.69, 21, 8, 8, 0.25], [0.95, 16, 6, 9, -0.2]]) grass(t, w * fx, h * 0.745 + Math.abs(fx - 0.5) * h * 0.02, len * s, n, GN, sd, sw);
    }, L);
  } };

  // =====================================================================================================
  // Deep Blue: deep blue to navy water, distant tall rock spires, tiny drifting glowing specks
  // =====================================================================================================
  BD.deep = { water: ['#5e9fe2', '#3d72c8', '#2c4d9e'], draw(g, w, h) {
    const s = Math.min(w / 260, h / 146), L = { rim: 0.2, glow: '#bfe4ff', side: true }, F = '#3966b8', N = '#30589e';
    layer(g, t => {
      ridge(t, w, h, h * 0.68, h * 0.05, 30 * s, 21, F);
      for (const [fx, top, rw, sd] of [[0.07, 0.42, 9, 1], [0.3, 0.29, 11, 2], [0.46, 0.5, 7, 3], [0.62, 0.35, 10, 4], [0.86, 0.45, 9, 5]]) spire(t, w * fx, h * 0.72, h * top, rw * s, sd, F);
    }, L);
    layer(g, t => {
      ridge(t, w, h, h * 0.755, h * 0.05, 26 * s, 22, N);
      for (const [fx, top, rw, sd] of [[0.19, 0.49, 12, 6], [0.74, 0.54, 11, 7], [0.97, 0.58, 9, 8]]) spire(t, w * fx, h * 0.78, h * top, rw * s, sd, N);
    }, L);
    specks(g, w, h, 0.08, 0.74, 650, ['#dff8ff', '#c4f2ff', '#e8e2ff'], 31);
    if (w >= 80) for (let i = 0; i < Math.round(w * h / 5000); i++) glow(g, 4 + rnd(i, 37) * (w - 8), h * (0.12 + 0.55 * rnd(i, 38)), 2 * s, '#9fe4ff', '#f0fcff');
  } };

  // =====================================================================================================
  // Shipwreck Bay: blue-green water, a big soft sunken galleon tilted in the sand, barrels and an anchor
  // =====================================================================================================
  // the galleon in ship units (hull 110 long, y down), tilted by ang and scaled by s around the hull's middle (x, y)
  function galleon(t, x, y, s, ang, col, sail, dark) {
    const c = Math.cos(ang), n = Math.sin(ang), T = ([u, v]) => [x + (u * c - v * n) * s, y + (u * n + v * c) * s], TT = P => P.map(T);
    const L = (pts, r0, r1) => line(t, TT(pts), r0 * s, r1 * s, col);
    // masts and spars first (the hull covers their feet), a torn sail on the main yard
    L([[-31, -24], [-32, -50]], 1.7, 1.3);
    L([[0, -18], [0, -68]], 2.1, 1.5);
    L([[30, -22], [31, -55]], 1.8, 1.3);
    L([[-16, -59], [16, -59]], 1.1, 1);
    L([[19, -46], [43, -50]], 1, 0.9);
    L([[50, -22], [75, -37]], 1.6, 0.8);
    t.poly(TT([[-14, -58], [14, -58], [12, -42], [7, -45.5], [2, -40], [-3, -44.5], [-8, -41], [-13, -45]]), sail);
    t.poly(TT([[-48, -48], [-35, -49], [-36, -39], [-41, -42], [-46, -38]]), sail);
    // the hull: high stern castle (left), low waist, forecastle and beak (right)
    t.poly(TT([[-57, -35], [-35, -35], [-34, -28], [-18, -28], [-17, -21], [22, -21], [24, -26], [43, -26], [51, -22], [56, -18], [51, -8], [44, 2], [30, 8], [10, 11], [-15, 11], [-36, 8], [-47, 2], [-51, -8]]), col);
    // portholes, stern windows and a broken hole near the bow
    for (const u of [-27, -15, -3, 9, 21, 33]) { const [px, py] = T([u, -12]); oval(t, px, py, 2.1 * s, 2.1 * s, dark); }
    for (const u of [-52, -46]) t.poly(TT([[u, -31.5], [u + 3.8, -31.5], [u + 3.8, -27.5], [u, -27.5]]), dark);
    t.poly(TT([[12, -4], [16, -7], [19, -4], [23, -6], [25, -1], [22, 3], [17, 1], [13, 3]]), dark);
  }
  // an anchor, crown at (x, y), size s (its height), tilted by ang
  function anchor(t, x, y, s, ang, col) {
    const c = Math.cos(ang), n = Math.sin(ang), T = ([u, v]) => [x + (u * c - v * n) * s, y + (u * n + v * c) * s];
    const L = (pts, r) => line(t, pts.map(T), r * s, r * s, col);
    L([[0, 0], [0, -0.82]], 0.055);
    L([[-0.24, -0.68], [0.24, -0.68]], 0.045);
    const ring = []; for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI * 2; ring.push([Math.cos(a) * 0.09, -0.92 + Math.sin(a) * 0.09]); }
    L(ring, 0.03);
    const arm = []; for (let i = 0; i <= 12; i++) { const a = Math.PI * (0.12 + 0.76 * i / 12); arm.push([-Math.cos(a) * 0.36, -0.3 + Math.sin(a) * 0.32]); }
    L(arm, 0.055);
    for (const sx of [-1, 1]) t.poly([[sx * 0.4, -0.38], [sx * 0.27, -0.2], [sx * 0.45, -0.17]].map(T), col);
  }
  // a barrel standing up, or lying on its side; (x, y) = the middle, s = its height, hoops in dark
  function barrel(t, x, y, s, up, col, dark) {
    if (up) {
      box(t, x - s * 0.34, y - s * 0.5, x + s * 0.34, y + s * 0.5, s * 0.12, col); oval(t, x, y, s * 0.4, s * 0.38, col);
      for (const d of [-0.27, 0.27]) boxIn(t, x - s, y + d * s - 0.25, x + s, y + d * s + 0.25, dark);
    } else {
      box(t, x - s * 0.5, y - s * 0.34, x + s * 0.5, y + s * 0.34, s * 0.12, col); oval(t, x, y, s * 0.38, s * 0.4, col);
      for (const d of [-0.27, 0.27]) boxIn(t, x + d * s - 0.25, y - s, x + d * s + 0.25, y + s, dark);
    }
  }
  BD.wreck = { water: ['#a4e8de', '#5ec4c0', '#3a9aa8'], draw(g, w, h) {
    // (the little shop icon gets a darker ship so it still reads at that size)
    const s = Math.min(w / 260, h / 146), tiny = w < 80, F = '#4eaeb2', N = tiny ? '#337f8a' : '#40989f', D = tiny ? '#2a6c78' : '#36868f', L = { rim: 0.22, glow: '#e4fff8' };
    layer(g, t => {
      ridge(t, w, h, h * 0.68, h * 0.06, 34 * s, 41, F);
      oval(t, w * 0.07, h * 0.69, 14 * s, 9 * s, F); oval(t, w * 0.94, h * 0.67, 16 * s, 11 * s, F);
    }, L);
    layer(g, t => {
      ridge(t, w, h, h * 0.79, h * 0.02, 40 * s, 42, N);
      galleon(t, w * 0.56, h * 0.75, Math.min(w * 0.0045, h * 0.0072), -0.2, N, F, D);
      oval(t, w * 0.17, h * 0.775, 15 * s, 5 * s, N);
      barrel(t, w * 0.125, h * 0.7, 14 * s, true, N, D);
      barrel(t, w * 0.21, h * 0.735, 12 * s, false, N, D);
      oval(t, w * 0.855, h * 0.775, 10 * s, 5 * s, N);
      anchor(t, w * 0.885, h * 0.77, 32 * s, 0.4, N);
    }, L);
  } };

  // =====================================================================================================
  // Glowing Night Reef: indigo night water, dark reef silhouettes with softly glowing coral tips and specks
  // =====================================================================================================
  BD.night = { water: ['#6a74cf', '#4a56ae', '#343e8c'], draw(g, w, h) {
    const s = Math.min(w / 260, h / 146), F = '#414ca2', N = '#343d8a', L = { rim: 0.18, glow: '#b8c0ff' };
    const GL = [['#ff9ed8', '#ffe2f4'], ['#8ff4ff', '#e4fdff'], ['#c8ff8a', '#f0ffd8']];
    const far = [], near = [], tufts = [], gs = Math.max(0.3, s);
    layer(g, t => {
      ridge(t, w, h, h * 0.64, h * 0.09, 24 * s, 51, F);
      stack(t, w * 0.3, h * 0.66, h * 0.43, 8 * s, 3, F);
      stack(t, w * 0.78, h * 0.66, h * 0.41, 9 * s, 4, F);
      branch(t, w * 0.1, h * 0.61, 18 * s, F, 8, far);
      branch(t, w * 0.55, h * 0.62, 16 * s, F, 9, far);
      fan(t, w * 0.92, h * 0.58, 12 * s, F, 0.2);
    }, L);
    layer(g, t => {
      ridge(t, w, h, h * 0.755, h * 0.035, 30 * s, 52, N);
      for (const [fx, r] of [[0.04, 9], [0.39, 8], [0.66, 10], [0.96, 8]]) dome(t, w * fx, h * 0.745, r * s, N);
      branch(t, w * 0.2, h * 0.75, 20 * s, N, 10, near);
      branch(t, w * 0.52, h * 0.75, 16 * s, N, 11, near);
      branch(t, w * 0.83, h * 0.75, 21 * s, N, 12, near);
      // anemone tufts: short blades with a glowing bead on each tip
      for (const [fx, sd] of [[0.31, 13], [0.74, 14]]) for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.32, len = (6 + rnd(i, sd) * 3) * s, x0 = w * fx, y0 = h * 0.755, x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
        line(t, [[x0, y0 + 1], [x0 + Math.cos(a) * len * 0.5, y0 + Math.sin(a) * len * 0.6], [x1, y1]], Math.max(0.4, 0.7 * s), Math.max(0.3, 0.45 * s), N); tufts.push([x1, y1]);
      }
    }, L);
    far.forEach(([x, y], i) => glow(g, x, y, 2.6 * gs, mix(GL[i % 3][0], F, 0.25), GL[i % 3][0]));
    near.forEach(([x, y], i) => glow(g, x, y, 3.6 * gs, GL[(i + 1) % 3][0], GL[(i + 1) % 3][1]));
    tufts.forEach(([x, y], i) => glow(g, x, y, 2.4 * gs, GL[i < 5 ? 0 : 1][0], GL[i < 5 ? 0 : 1][1]));
    if (w >= 80) for (const [fx, r, i] of [[0.39, 8, 0], [0.66, 10, 1]]) for (let k = 0; k < 5; k++) speck(g, w * fx + (k - 2) * r * s * 0.36, h * 0.745 - r * s * (0.42 + 0.26 * Math.cos((k - 2) * 0.7)), GL[(i + k) % 3][0], false);
    specks(g, w, h, 0.1, 0.62, 1100, ['#ffd0ee', '#c8f8ff', '#e2ffc0', '#fff4c0'], 61);
  } };

  // =====================================================================================================
  // Lost Atlantis (legendary): blue water with golden light, a sunken temple: arch, steps and columns, pale stone + gold
  // =====================================================================================================
  // a temple column standing on base (y), hgt tall, shaft cw wide; broken ones end in a jagged top (no capital)
  function column(t, x, base, hgt, cw, S, G, broken, seed) {
    const top = base - hgt, sx0 = x - cw / 2, sx1 = x + cw / 2;
    if (broken) {
      const pts = [[sx0, base], [sx0, top + cw * 0.3]];
      for (let i = 1; i < 4; i++) pts.push([sx0 + cw * i / 4, top + (i % 2 ? 0 : cw * 0.45) + rnd(i, seed) * cw * 0.3]);
      pts.push([sx1, top + cw * 0.55], [sx1, base]); t.poly(pts, S[0]);
    } else box(t, sx0, top + cw * 0.4, sx1, base, 0, S[0]);
    boxIn(t, x + cw * 0.2, top, sx1 + 1, base, S[1]);
    for (const d of [-0.2, 0.06]) boxIn(t, x + d * cw - 0.25, top + cw * 0.9, x + d * cw + 0.25, base - cw * 0.5, S[1]);
    box(t, x - cw * 0.78, base - cw * 0.42, x + cw * 0.78, base + 3, cw * 0.12, S[0]);
    boxIn(t, x + cw * 0.3, base - cw * 0.42, x + cw, base + 3, S[1]);
    boxIn(t, x - cw, base - cw * 0.42, x + cw, base - cw * 0.3, G[0]);
    if (!broken) { box(t, x - cw * 0.8, top, x + cw * 0.8, top + cw * 0.48, cw * 0.14, G[0]); boxIn(t, x + cw * 0.3, top, x + cw, top + cw * 0.48, G[1]); }
  }
  // a little far-off temple: a platform, a row of columns (the water shows between them) and a pointed roof;
  // broken: the roof has fallen and the columns stand at different heights
  function farTemple(t, x, base, wd, ht, col, broken) {
    const n = 4, cw = wd * 0.11, top = base - ht * 0.72;
    box(t, x - wd / 2, base - ht * 0.1, x + wd / 2, base + 3, 0, col);
    for (let i = 0; i < n; i++) { const cx = x - wd * 0.37 + wd * 0.74 * i / (n - 1), ct = broken ? top + ht * [0.05, 0.3, 0, 0.45][i] : top; box(t, cx - cw / 2, ct, cx + cw / 2, base, 0, col); }
    if (broken) { box(t, x - wd * 0.46, top - ht * 0.07, x + wd * 0.12, top + ht * 0.03, 0, col); return; }
    box(t, x - wd * 0.48, top - ht * 0.08, x + wd * 0.48, top + ht * 0.03, 0, col);
    t.poly([[x - wd * 0.52, top - ht * 0.07], [x + wd * 0.52, top - ht * 0.07], [x, base - ht]], col);
  }
  BD.atlantis = { water: ['#e2f4dc', '#86cce8', '#4e9ad6'], draw(g, w, h) {
    const s = Math.min(w / 260, h / 146), cx = w * 0.5, S = ['#b8dcea', '#9cc8e0'], G = ['#e8d08c', '#ccb470'], FAR = '#94cbe4';
    halo(g, cx, h * 0.5, Math.min(w * 0.46, h * 0.9), h * 0.52, '#fff2b8', [0.16, 0.3, 0.44]);
    // far: the faint lost city (little temples) and the sea floor
    layer(g, t => {
      ridge(t, w, h, h * 0.71, h * 0.035, 40 * s, 71, FAR);
      farTemple(t, w * 0.22, h * 0.72, 38 * s, 32 * s, FAR, false);
      farTemple(t, w * 0.79, h * 0.72, 34 * s, 28 * s, FAR, true);
    }, { rim: 0.18, glow: '#fff4cc' });
    // the temple: steps, the arch, columns standing (and broken) on either side
    layer(g, t => {
      const base = h * 0.765, st = 4.5 * s, ptop = base - st * 2;
      for (let i = 0; i < 3; i++) { const hw = (50 - i * 10) * s; box(t, cx - hw, base - st * i, cx + hw, h + 2, 0.6 * s, S[0]); boxIn(t, cx + hw - 9 * s, base - st * i, cx + hw + 1, h + 2, S[1]); }
      const px = 17 * s, pw = 6.5 * s, cap = ptop - 26 * s, ro = px + pw * 0.85, ri = px - pw * 0.55, ay = cap - 1.2 * s;
      for (const sx of [-1, 1]) column(t, cx + sx * px, ptop, ptop - cap, pw, S, G, false, 0);
      for (let fy = Math.floor((ay - ro) * t.k); fy <= Math.ceil(ay * t.k); fy++) for (let fx = Math.floor((cx - ro) * t.k); fx <= Math.ceil((cx + ro) * t.k); fx++) {
        const d = Math.hypot((fx + 0.5) / t.k - cx, (fy + 0.5) / t.k - ay); if (d > ro || d < ri) continue;
        t.fset(fx, fy, d > ro - 0.9 ? G[0] : d < ri + 0.7 ? S[1] : S[0]);
      }
      box(t, cx - 2.4 * s, ay - ro - 0.5, cx + 2.4 * s, ay - ro + 3.6 * s, 0.6, G[0]); boxIn(t, cx + 0.6 * s, ay - ro - 1, cx + 3 * s, ay - ro + 4 * s, G[1]);
      column(t, w * 0.13, base, 36 * s, 7 * s, S, G, false, 1);
      column(t, w * 0.27, base, 16 * s, 7 * s, S, G, true, 2);
      column(t, w * 0.74, base, 20 * s, 7 * s, S, G, true, 3);
      column(t, w * 0.88, base, 32 * s, 7 * s, S, G, false, 4);
    }, { rim: 0.3, glow: '#fffbe8' });
    specks(g, w, h, 0.22, 0.7, 2600, ['#fff2b0', '#ffe48a'], 81);
    if (w >= 80) for (let i = 0; i < Math.round(w * h / 9000); i++) glow(g, w * (0.2 + 0.6 * rnd(i, 83)), h * (0.18 + 0.4 * rnd(i, 84)), 1.8 * s, '#ffe9a0', '#fffbe6');
  } };

  // =====================================================================================================
  // Sand floors (the game draws a wavy band from the ramp and sprinkles the dots)
  // =====================================================================================================
  SD.white = { ramp: ['#fffaf0', '#f6e8c6', '#e2cc9c'], dots: ['#ffffff', '#f2d68a', '#fff4cc', '#e6c47e'] };
  SD.pink = { ramp: ['#fff0f2', '#f9d2da', '#eaaab8'], dots: ['#ffffff', '#ff9a8c', '#ffc6b8', '#f47e7c'] };
  SD.black = { ramp: ['#8e84a6', '#6c6288', '#524a6c'], dots: ['#eef0f8', '#c2cce2', '#8fd2ff', '#aab8ff'] };
  SD.rainbow = { ramp: ['#fff8fc', '#f4e4f2', '#dccae6'], dots: ['#ff6b8e', '#ffa44e', '#ffe04e', '#6edc72', '#4ec4ff', '#9c7cff', '#ff80d2'] };
})();
