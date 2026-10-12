// art-fish.js — PVZ Garden: My Aquarium fish, set 1 (art-fish2.js holds the rest). 13 kinds: clownfish, damsel (Blue Damselfish),
// yellowtang, royalgramma, chromis (Green Chromis), firefish, shrimp (Cleaner Shrimp), hermitcrab, starfish (Sea Star), bluetang,
// flameangel (Flame Angelfish), mandarin (Mandarin Dragonet) and seahorse.
// Registers PX.FISH_ART[id] = { w, h, draw(g, f) } (the contract is in art-aqua.js): a hi-res grid laid out in art pixels, the fish
// facing RIGHT, f = 0 | 1 the swim frame (tail swish + a fin flap; the shrimp and the hermit crab shuffle their legs, the sea star
// wiggles its arms). The builder adds the bold outer line, so every part here only gets a thin piece outline.
// Style: TRUE chibi stickers (docs/pvz-art-guide.md): round chunky bodies, ONE big glossy side-view eye with a white glint, a
// little blush and a tiny smile, flat pastel-bright fills with one soft shade crescent and a small highlight, and each species'
// signature colours and pattern drawn big and simple so a child knows it at a glance.
(function () {
  'use strict';
  if (!window.PX || !PX.Grid) return;
  const { Grid, INK } = PX;
  const AR = PX.art || {};
  const mixHex = AR.mixHex || PX.mixHex || (a => a);
  const FA = PX.FISH_ART = PX.FISH_ART || {};
  const WHITE = '#ffffff';

  // ---------------- helpers (the same kit as art-world2.js) ----------------
  const piece = (G, draw) => { const t = new Grid(G.w, G.h, G.k); t.dither = false; draw(t); t.outline(); G.merge(t); return G; };
  const flat = R => [R[1], R[1], R[2]];
  const line = (g, pts, r, col) => PX.stroke(g, pts, r, r, col);
  const SHADE = '#5a3c74';
  // the chibi crescent for a whole body drawn flat on t (its pattern included): every pixel outside the lit ellipse (the body
  // nudged up-left) takes its shade (S maps colour -> shade, anything else is mixed a little toward soft violet); then a small
  // highlight up-left, only on the base colour hl[1]
  function crescent(t, cx, cy, rx, ry, S, hl, o) {
    o = o || {}; const k = o.k == null ? 0.16 : o.k, K = t.k, sx = cx - rx * k, sy = cy - ry * k * 1.15;
    for (let fy = 0; fy < t.fh; fy++) for (let fx = 0; fx < t.fw; fx++) {
      const i = fy * t.fw + fx, c = t.a[i]; if (!c || c === INK) continue;
      if (!PX.inEll((fx + 0.5) / K, (fy + 0.5) / K, sx, sy, rx * 1.02, ry * 1.02, o.rot || 0).in) t.a[i] = S[c] || mixHex(c, SHADE, 0.18);
    }
    if (hl) { const m = (x, y) => t.get(x, y) === hl[1]; m.fine = true; t.ell(o.hx || cx - rx * 0.42, o.hy || cy - ry * 0.5, Math.max(0.6, rx * 0.22), Math.max(0.45, ry * 0.13), hl[0], -0.55, m); }
    return t;
  }
  // repaint t's pixels (only those of colour `on`, if given) where fn(x, y, c) returns a colour (x, y = the fine pixel's centre)
  function paint(t, fn, on) {
    const K = t.k;
    for (let fy = 0; fy < t.fh; fy++) for (let fx = 0; fx < t.fw; fx++) {
      const i = fy * t.fw + fx, c = t.a[i]; if (!c || c === INK || (on && c !== on)) continue;
      const v = fn((fx + 0.5) / K, (fy + 0.5) / K, c); if (v) t.a[i] = v;
    }
    return t;
  }
  // a test for paint(): true where the point (dx, dy) art px away is outside t's shape as it is now (a band along that edge)
  function near(t, dx, dy) {
    const a0 = t.a.slice(), K = t.k, W = t.fw, H = t.fh;
    return (x, y) => { const fx = Math.floor((x + dx) * K), fy = Math.floor((y + dy) * K); return fx < 0 || fy < 0 || fx >= W || fy >= H || !a0[fy * W + fx]; };
  }
  // rims along a fin's outer edge: a pixel within d art px of the edge (looking straight out from the base point bx, by) takes
  // that band's colour; bands = [[d, colour], ...], thinnest first
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
  // a tail fin fanning out to the left of its base (bx, by): len long, sp = half its height at the end. f = 1 swishes it (turned a
  // little, so narrower, and tilted). kind: 'round' (a fan) | 'fork' (two lobes with a V notch) | 'moon' (a slim crescent)
  function tailFin(t, bx, by, len, sp, col, f, kind) {
    const sq = f ? 0.8 : 1, a = f ? -0.17 : 0.06, c = Math.cos(a), s = Math.sin(a);
    const P = (u, v) => [bx - u * sq * c - v * s, by - u * sq * s + v * c];
    const E = (u, v, rx, ry, r) => { const [x, y] = P(u, v); t.ell(x, y, rx * sq, ry, col, (r || 0) + a); };
    if (kind === 'fork' || kind === 'moon') {
      const m = kind === 'moon', lw = m ? 0.27 : 0.4, ra = m ? 0.95 : 0.7;
      t.poly([P(-0.8, -sp * 0.42), P(len * 0.5, -sp * 0.6), P(len * 0.5, sp * 0.6), P(-0.8, sp * 0.42)], col);
      E(len * 0.6, -sp * 0.52, len * 0.52, sp * lw, ra); E(len * 0.6, sp * 0.52, len * 0.52, sp * lw, -ra);
    } else {
      t.poly([P(-0.8, -sp * 0.5), P(len * 0.6, -sp * 0.95), P(len * 0.6, sp * 0.95), P(-0.8, sp * 0.5)], col);
      E(len * 0.6, 0, len * 0.42, sp);
    }
    return t;
  }
  // the little side fin on the body: a teardrop hinged at (x, y), pointing back-down, a shade darker than the body R with one ray
  // line (or a rim colour); f = 1 flaps it up
  function sideFin(g, x, y, len, wid, R, f, rimCol) {
    const a = f ? 0.12 : 0.6, ux = -Math.cos(a), uy = Math.sin(a), cx = x + ux * len * 0.58, cy = y + uy * len * 0.58;
    const col = rimCol ? R[1] : mixHex(R[1], R[2], 0.45);
    piece(g, t => {
      t.ell(cx, cy, len * 0.46, wid, col, -a);
      t.poly([[x - uy * 0.35, y + ux * 0.35], [cx - uy * wid * 0.9, cy + ux * wid * 0.9], [cx + uy * wid * 0.9, cy - ux * wid * 0.9], [x + uy * 0.35, y - ux * 0.35]], col);
      if (rimCol) rim(t, x, y, [[0.55, rimCol]]);
      else PX.stroke(t, [[x + ux * 0.7, y + uy * 0.7], [x + ux * len * 0.78, y + uy * len * 0.78]], 0.18, 0.18, mixHex(R[2], SHADE, 0.25));
    });
  }
  // where a tiny smile can go: the spot nearest (x0, y0) where all of it sits on the body with a ring of body colour round it (so
  // it never melts into an outline, the eye or a pattern edge), drawn as a little 'u' rather than a bar; null if none is clean
  const EYE = AR.EYE_INK || '#2b2129';
  const NEAR = []; for (let i = -4; i <= 1; i++) for (let j = -2; j <= 2; j++) NEAR.push([i * 0.25, j * 0.25]);
  NEAR.sort((a, b) => Math.abs(a[0]) + Math.abs(a[1]) * 1.6 - Math.abs(b[0]) - Math.abs(b[1]) * 1.6);
  function smileSpot(g, x0, y0, kind, mw) {
    const W = g.fw, body = c => c && c !== INK && c !== EYE && c !== WHITE;
    let clean = null;
    for (const [dx, dy] of NEAR) {
      const t = new Grid(g.w, g.h, g.k); AR.chibiMouth(t, x0 + dx, y0 + dy, kind, mw);
      let ok = true, top = 1e9, x1 = 1e9, x2 = -1, run = 0;
      for (let i = 0; i < t.a.length && ok; i++) {
        if (!t.a[i]) continue;
        const fx = i % W, fy = (i - fx) / W;
        if (!body(g.a[i])) ok = false;
        for (let v = -1; v <= 1 && ok; v++) for (let u = -1; u <= 1; u++) { const j = i + v * W + u; if (!t.a[j] && !body(g.a[j])) { ok = false; break; } }
        if (fy < top) { top = fy; run = 0; } if (fy === top) run++; x1 = Math.min(x1, fx); x2 = Math.max(x2, fx);
      }
      if (!ok) continue;
      if (run < x2 - x1 + 1) return [x0 + dx, y0 + dy];
      if (!clean) clean = [x0 + dx, y0 + dy];
    }
    return clean;
  }
  // ONE big glossy side-view eye (with its white glint), a little blush on the cheek under it and a tiny smile just below its
  // front edge (o.mx / o.my move the smile, e.g. onto a snout)
  function face(g, ex, ey, w, h, o) {
    o = o || {};
    if (AR.chibiEyes) AR.chibiEyes(g, ex, ey, { one: true, sp: 0, w, h, mood: o.mood });
    if (o.blush !== false && AR.blush) AR.blush(g, o.bx == null ? ex - w * 0.3 : o.bx, o.by == null ? ey + h * 0.5 + 0.55 : o.by, { one: true, sp: 0, w: o.bw || 0.85, h: 0.48, col: o.blushCol });
    if (o.mouth === null || !AR.chibiMouth) return;
    const mw = o.mw || 1.1, kind = o.mouth || 'smile', x0 = o.mx == null ? ex + w * 0.38 : o.mx, y0 = o.my == null ? ey + h * 0.5 + 0.75 : o.my;
    const at = smileSpot(g, x0, y0, kind, mw) || [x0, y0];
    AR.chibiMouth(g, at[0], at[1], kind, mw);
  }
  const shades = (...Rs) => { const m = {}; for (const R of Rs) m[R[1]] = R[2]; return m; };

  // ---------------- palettes ----------------
  const ORANGE = ['#ffd6a6', '#ff9b48', '#f07c38'];
  const SNOW = ['#ffffff', '#ffffff', '#e6e0ee'];
  const BLUE = ['#c6eaff', '#46a6ff', '#3486e2'];
  const LEMON = ['#fffbd2', '#ffe84c', '#f5c63c'];
  const GOLD = ['#fff6bc', '#ffd442', '#f2b434'];
  const PURPLE = ['#f2d4ff', '#b874f2', '#9856d6'];
  const MINT = ['#e6fff4', '#a2ecca', '#80d2ae'];
  const SKY = ['#dcf6ff', '#8cd4f2', '#6eb8dc'];
  const RED = ['#ffccc0', '#ff6e5e', '#e85048'];
  const FLAME = ['#ffd4b8', '#ff6a42', '#e84e36'];
  const ROYAL = ['#c8dcff', '#4a80f0', '#3864d2'];
  const SUN = ['#fff4c8', '#ffcc4a', '#f4a83a'];
  const PINKSHELL = ['#fff6ee', '#ffd8cc', '#f2b6aa'];
  const CRAB = ['#ffd8c0', '#ff8c5c', '#ec6c46'];

  // =====================================================================================================
  // Clownfish: bright orange, three bold white bands edged in thin black, rounded fins with black rims
  // =====================================================================================================
  FA.clownfish = { w: 23, h: 16, draw(g, f) {
    const O = ORANGE, RIM = [[0.8, INK], [1.25, WHITE]], cx = 12.4, cy = 8.7;
    piece(g, t => { tailFin(t, 6.6, 8.9, 5, 3.3, O[1], f, 'round'); rim(t, 7.6, 8.9, RIM); });
    piece(g, t => { t.ell(f ? 10.9 : 11.2, 4.2, 3.6, 2.2, O[1], f ? -0.22 : -0.08); rim(t, 11.4, 8.7, RIM); });
    piece(g, t => { t.ell(9.2, 13.1, 1.9, 1.4, O[1], 0.35); t.ell(14.4, 13.3, 1.3, 1.1, O[1], -0.3); rim(t, 11.6, 8.7, RIM); });
    piece(g, t => {
      t.ell(cx, cy, 6.9, 4.8, O[1]); t.ell(15, 8.4, 4.6, 4.6, O[1]);
      const band = (x, y, x0, k, hw) => { const d = Math.abs(x - (x0 - k * (y - cy) * (y - cy))); return d < hw ? WHITE : d < hw + 0.5 ? INK : null; };
      paint(t, (x, y) => band(x, y, 14, 0.09, 0.78) || band(x, y, 10.1, 0.06, 0.68) || band(x, y, 6.5, 0, 0.42));
      crescent(t, cx + 0.6, cy, 7.4, 4.9, shades(O, SNOW), O);
    });
    sideFin(g, 13.4, 10.4, 3, 1.05, O, f, INK);
    face(g, 16.9, 7.8, 2.8, 3.4);
  } };

  // =====================================================================================================
  // Blue Damselfish: small, electric blue, a yellow tail
  // =====================================================================================================
  FA.damsel = { w: 18, h: 14, draw(g, f) {
    const B = BLUE, Y = GOLD, cx = 10, cy = 7.2;
    piece(g, t => tailFin(t, 5, 7.4, 3.7, 2.7, flat(Y), f, 'fork'));
    piece(g, t => t.ell(f ? 9.3 : 9.6, 3.4, 3, 1.6, flat(B), f ? -0.28 : -0.15));
    piece(g, t => t.ell(8.8, 11.2, 1.8, 1.2, flat(B), 0.3));
    piece(g, t => { t.ell(cx, cy, 5.5, 4.2, B[1]); t.ell(12, 7, 3.6, 3.9, B[1]); crescent(t, cx + 0.5, cy, 5.9, 4.3, shades(B), B); });
    sideFin(g, 10, 8.9, 2.3, 0.8, B, f);
    face(g, 12.7, 6.4, 2.6, 3.1);
  } };

  // =====================================================================================================
  // Yellow Tang: a tall lemon-yellow disc with a little pointy snout, tall top and bottom fins
  // =====================================================================================================
  FA.yellowtang = { w: 22, h: 20, draw(g, f) {
    const Y = LEMON, YF = ['#fffad0', '#ffdc3e', '#f2bf32'], cx = 11.8, cy = 10.4;
    piece(g, t => tailFin(t, 6.8, 10.6, 4.8, 3.1, flat(YF), f, 'round'));
    piece(g, t => t.ell(f ? 10.7 : 11, 5.4, 5, 3.3, flat(YF), f ? -0.22 : -0.12));
    piece(g, t => t.ell(f ? 10.6 : 10.8, 15.4, 4.4, 2.9, flat(YF), f ? 0.2 : 0.12));
    piece(g, t => {
      t.ell(cx, cy, 5.7, 5.7, Y[1]); t.ell(17, 11.6, 2.2, 1.4, Y[1], 0.25); t.poly([[15.8, 9.6], [19.5, 11.7], [16, 13.4]], Y[1]);
      crescent(t, cx + 0.6, cy, 6.3, 5.8, shades(Y), Y);
    });
    face(g, 15, 8.8, 2.9, 3.4, { mx: 17.7, my: 11.8, mw: 1 });
  } };

  // =====================================================================================================
  // Royal Gramma: front half purple, back half yellow, a dark spot on the top fin
  // =====================================================================================================
  FA.royalgramma = { w: 20, h: 14, draw(g, f) {
    const P = PURPLE, Y = GOLD, cx = 10.6, cy = 7.3, xb = y => 9.8 + 0.6 * Math.sin((y - cy) * 0.6);
    const split = (x, y, c) => (x > xb(y) ? (c === Y[1] ? P[1] : c === Y[2] ? P[2] : null) : null);
    piece(g, t => tailFin(t, 5.2, 7.5, 3.8, 2.7, flat(Y), f, 'round'));
    piece(g, t => { t.ell(f ? 9.9 : 10.2, 3.4, 4, 1.7, flat(Y), f ? -0.2 : -0.08); paint(t, split); t.ell(12.2, 2.8, 0.95, 0.8, '#3a2d4a'); });
    piece(g, t => { t.ell(8.6, 11.2, 1.9, 1.2, flat(Y), 0.3); t.ell(12.8, 11.4, 1.2, 1.1, flat(P)); });
    piece(g, t => {
      t.ell(cx, cy, 6.1, 4.2, Y[1]); t.ell(13, 7.1, 3.9, 4, Y[1]);
      paint(t, (x, y) => (x > xb(y) ? P[1] : null));
      crescent(t, cx + 0.5, cy, 6.5, 4.3, shades(P, Y), P);
    });
    sideFin(g, 11.2, 9, 2.4, 0.82, P, f);
    face(g, 13.7, 6.5, 2.7, 3.2);
  } };

  // =====================================================================================================
  // Green Chromis: small, pale mint-green to blue, a forked tail (they school)
  // =====================================================================================================
  FA.chromis = { w: 18, h: 13, draw(g, f) {
    const M = MINT, S = SKY, AQ = ['#e2fbf8', '#98e2dc', '#78c6c4'], TF = ['#e6fbf8', '#b0e8e2', '#8ccfc8'], cx = 9.8, cy = 6.6;
    piece(g, t => tailFin(t, 4.8, 6.8, 3.7, 2.7, flat(TF), f, 'fork'));
    piece(g, t => t.ell(f ? 9.3 : 9.6, 3.1, 2.8, 1.4, flat(S), f ? -0.3 : -0.15));
    piece(g, t => t.ell(8.8, 10.1, 1.6, 1, flat(TF), 0.3));
    piece(g, t => {
      t.ell(cx, cy, 5.4, 3.8, M[1]); t.ell(11.8, 6.5, 3.5, 3.6, M[1]);
      paint(t, (x, y) => { const d = y - cy + (x - cx) * 0.32; return d < -1.5 ? S[1] : d < -0.3 ? AQ[1] : null; });
      crescent(t, cx + 0.5, cy, 5.8, 3.9, shades(M, S, AQ), M);
    });
    face(g, 12.3, 5.9, 2.5, 3);
  } };

  // =====================================================================================================
  // Firefish: slim, white-yellow front fading to red-orange at the tail, a very tall flag-like top fin
  // =====================================================================================================
  FA.firefish = { w: 22, h: 18, draw(g, f) {
    const HD = ['#fffbe0', '#fff0a6', '#f4d684'], WM = ['#ffffff', '#fffaf2', '#ece0e4'], PC = ['#ffe6d8', '#ffb896', '#f29a7c'], RO = ['#ffd2c0', '#ff7448', '#e8563a'];
    const FL = ['#fffbe6', '#fff2bc', '#f2d89a'], cx = 11.4, cy = 12, zone = x => (x > 14.2 ? HD[1] : x > 10.8 ? WM[1] : x > 8.6 ? PC[1] : RO[1]);
    piece(g, t => { tailFin(t, 5.4, 12.1, 3.9, 2.8, RO[1], f, 'round'); rim(t, 6.2, 12.1, [[0.55, '#c8404a']]); });
    // the tall flag fin, pale yellow with a red-orange tip (f flicks it back)
    piece(g, t => {
      PX.stroke(t, f ? [[13.6, 9.6], [13.2, 6.6], [12.2, 4], [10.9, 2.5]] : [[13.6, 9.6], [13.4, 6.4], [12.9, 3.7], [12.1, 1.9]], 1.9, 0.7, FL[1]);
      paint(t, (x, y) => (y < 4.5 + (12.4 - x) * 0.45 ? RO[1] : y < 5.6 + (12.4 - x) * 0.45 ? PC[1] : null));
    });
    piece(g, t => { t.ell(8.8, 8.8, 3, 1.2, flat(PC), -0.15); t.ell(8.6, 15.5, 3, 1.2, flat(RO), 0.1); });
    piece(g, t => {
      t.ell(cx, cy, 6.4, 4.1, WM[1]); t.ell(14.8, 11.8, 3.9, 3.9, WM[1]);
      paint(t, (x, y) => zone(x + (y - cy) * 0.25));
      crescent(t, cx + 0.8, cy, 6.9, 4.2, shades(HD, WM, PC, RO), HD, { hx: 14.4, hy: 9.6 });
    });
    face(g, 15.8, 11, 2.8, 3.3);
  } };

  // =====================================================================================================
  // Cleaner Shrimp: a curved red body with a white stripe down the back, long white antennae, little legs (f shuffles them)
  // =====================================================================================================
  FA.shrimp = { w: 24, h: 16, draw(g, f) {
    const R = RED, LEG = ['#ffe0d8', '#ff9a8c', '#e87a70'];
    // long white feelers sweeping up and back over the body (drawn bare: the builder's outer line edges them)
    line(g, [[19.6, 6.2], [21.4, 3.6], [21, 1.8], [17.6, 1.5], [13.4, 2.4]], 0.32, WHITE);
    line(g, [[20, 6.8], [22.2, 4.8], [22.4, 2.4]], 0.3, WHITE);
    piece(g, t => {
      const s = f ? 0.6 : -0.6;
      for (const [x, i] of [[17, 0], [15, 1], [13.2, 2], [11.2, 3], [9.4, 4]]) { const ex = x + (i % 2 ? s : -s) * 0.7; PX.stroke(t, [[x, 10.6], [ex, 14.4]], 0.42, 0.34, LEG[1]); t.ell(ex, 14.1, 0.36, 0.42, WHITE); }
    });
    piece(g, t => {
      t.ell(15.7, 8.5, 4.4, 3.7, R[1], -0.1); t.poly([[18.4, 6.4], [21.2, 6.4], [19.4, 8.2]], R[1]);
      for (const [x, y, r] of [[11.6, 7.8, 3], [8.6, 8.6, 2.6], [6.2, 10, 2.1], [4.6, 11.6, 1.6]]) t.ell(x, y, r, r * 0.97, R[1]);
      const up = near(t, 0, -1.1); paint(t, (x, y) => (x > 4 && x < 19.2 && up(x, y) ? WHITE : null));
      crescent(t, 11.4, 8.6, 8.4, 3.8, shades(R, SNOW), R, { hx: 15, hy: 7.4 });
    });
    piece(g, t => { t.ell(3, 12.4, 1.5, 0.85, flat(R), -0.7); t.ell(2.9, 13.9, 1.5, 0.85, flat(R), 0.2); t.ell(4.1, 14, 1.1, 0.75, flat(R), 1); });
    face(g, 17.7, 7.3, 2.4, 2.9);
  } };

  // =====================================================================================================
  // Hermit Crab: a red-orange crab peeking out of a cream-pink spiral shell, eyes on stalks, little claws (f shuffles its legs)
  // =====================================================================================================
  FA.hermitcrab = { w: 20, h: 18, draw(g, f) {
    const S = PINKSHELL, C = CRAB, s = f ? 0.6 : -0.6;
    piece(g, t => { for (const [x, i] of [[12.4, 0], [14.2, 1], [15.8, 2]]) PX.stroke(t, [[x, 13.4], [x + 0.8 + (i % 2 ? s : -s), 16.1]], 0.5, 0.36, C[1]); });
    piece(g, t => {
      t.ell(8, 9.6, 5.8, 5.6, S[1]); t.ell(4.8, 4.8, 2.4, 2, S[1], -0.6); t.ell(3.3, 3.4, 1.1, 1, S[1]);
      crescent(t, 7.8, 9, 6.6, 6.6, shades(S), S);
    });
    const sp = []; for (let i = 0; i <= 24; i++) { const a = i * 0.42 + 2.4, r = 0.5 + i * 0.17; sp.push([7.6 + Math.cos(a) * r, 9.4 + Math.sin(a) * r * 0.95]); }
    { const t = new Grid(g.w, g.h, g.k); PX.stroke(t, sp, 0.36, 0.36, '#e89a98'); for (let i = 0; i < g.a.length; i++) if (t.a[i] && g.a[i] && g.a[i] !== INK) g.a[i] = t.a[i]; }
    piece(g, t => t.ell(12.8, 12, 2.6, 3, '#9a5a6a'));
    piece(g, t => { PX.stroke(t, [[13.4, 10], [12.9, 6.6]], 0.42, 0.42, C[1]); PX.stroke(t, [[15.4, 9.8], [16, 6.4]], 0.42, 0.42, C[1]); });
    piece(g, t => { t.ell(14.2, 11.6, 3, 2.6, C[1]); crescent(t, 14.2, 11.6, 3, 2.6, shades(C), C); });
    piece(g, t => t.ell(14.8, 14.4, 1.2, 0.95, flat(C)));
    piece(g, t => { t.ell(16.6, 13.1, 1.9, 1.5, C[1], -0.2); crescent(t, 16.6, 13.1, 1.9, 1.5, shades(C), null); });
    piece(g, t => t.ell(17.3, 11.5, 1.3, 0.72, flat(C), -0.45));
    piece(g, t => { t.ell(12.9, 6, 1.4, 1.5, C[1]); t.ell(16, 5.8, 1.4, 1.5, C[1]); });
    if (AR.chibiEyes) { AR.chibiEyes(g, 12.9, 6, { one: true, sp: 0, w: 2, h: 2.4 }); AR.chibiEyes(g, 16, 5.8, { one: true, sp: 0, w: 2, h: 2.4 }); }
    if (AR.blush) AR.blush(g, 16, 11.1, { one: true, sp: 0, w: 0.9, h: 0.5 });
    if (AR.chibiMouth) AR.chibiMouth(g, 14.9, 12.1, 'smile', 1.2);
  } };

  // =====================================================================================================
  // Sea Star: a chunky 5-arm orange-red star seen from the front, bumpy dots, a cute face in the middle (f: the arms wiggle)
  // =====================================================================================================
  FA.starfish = { w: 20, h: 20, draw(g, f) {
    const O = ['#ffdcc0', '#ff8e5a', '#ee7048'], cx = 10, cy = 10.6, arms = [];
    for (let i = 0; i < 5; i++) arms.push(-Math.PI / 2 + i * Math.PI * 2 / 5 + (f ? (i % 2 ? 0.07 : -0.07) : 0));
    piece(g, t => {
      for (const a of arms) PX.stroke(t, [[cx, cy], [cx + Math.cos(a) * 6.4, cy + Math.sin(a) * 6.4]], 3, 1.7, O[1]);
      t.ell(cx, cy, 4.4, 4.2, O[1]);
      for (const a of arms) for (const [d, o] of [[3.8, 0.55], [5.1, -0.5], [6.3, 0.1]]) { const x = cx + Math.cos(a) * d - Math.sin(a) * o, y = cy + Math.sin(a) * d + Math.cos(a) * o; t.ell(x, y, 0.5, 0.5, '#ffe8d2'); }
      crescent(t, cx, cy, 7.8, 7.8, Object.assign(shades(O), { '#ffe8d2': '#ffc8a8' }), O);
    });
    if (AR.chibiEyes) AR.chibiEyes(g, 10.2, 10.3, { sp: 3.6, w: 2.1, h: 2.6 });
    if (AR.blush) AR.blush(g, 10.2, 12.1, { sp: 5, w: 0.8, h: 0.5 });
    if (AR.chibiMouth) AR.chibiMouth(g, 10.3, 12.5, 'smile', 1.3);
  } };

  // =====================================================================================================
  // Blue Tang: a royal blue oval, a black "palette" swoosh, a bright yellow tail
  // =====================================================================================================
  FA.bluetang = { w: 24, h: 17, draw(g, f) {
    const B = ROYAL, Y = GOLD, DK = '#2e2a4e', cx = 12.6, cy = 8.6;
    piece(g, t => tailFin(t, 6, 8.8, 4.2, 3.4, flat(Y), f, 'moon'));
    piece(g, t => { t.ell(f ? 11.3 : 11.6, 4.2, 6, 1.9, B[1], f ? -0.1 : -0.05); rim(t, 11.6, 8.6, [[0.5, INK]]); });
    piece(g, t => { t.ell(10.8, 13, 4.6, 1.6, B[1], 0.08); rim(t, 10.8, 8.6, [[0.5, INK]]); });
    piece(g, t => {
      t.ell(cx, cy, 7.2, 4.9, B[1]); t.ell(15.4, 8.3, 4.6, 4.7, B[1]);
      paint(t, (x, y) => {
        if (x < 7.6 && Math.abs(y - 8.9) < (7.6 - x) * 0.95) return Y[1];
        const o = PX.inEll(x, y, 10.8, 7.4, 6, 3, -0.08).in, i = PX.inEll(x, y, 10.4, 7.6, 3.2, 1.5, -0.06).in;
        return o && !i ? DK : null;
      });
      crescent(t, cx + 0.6, cy, 7.6, 5, Object.assign(shades(B, Y), { [DK]: DK }), B);
    });
    sideFin(g, 14.4, 10.6, 2.7, 0.95, ['#fffbe0', '#ffe066', '#f2bc3c'], f);
    face(g, 17.8, 7.7, 2.9, 3.4);
  } };

  // =====================================================================================================
  // Flame Angelfish: glowing red-orange, a few thin dark vertical bars, blue tips on the back fins
  // =====================================================================================================
  FA.flameangel = { w: 22, h: 18, draw(g, f) {
    const R = FLAME, GL = '#ff9a4e', TIP = '#5aa2ff', BAR = '#8a2a3e', EDGE = '#3a3466', cx = 11.4, cy = 9.2;
    piece(g, t => tailFin(t, 5.8, 9.4, 3.6, 2.6, flat(['#ffd8c0', '#ff8048', '#e8603a']), f, 'round'));
    const fin = pts => piece(g, t => { PX.stroke(t, pts, 1.6, 1, R[1]); paint(t, x => (x < 6.2 ? TIP : x < 6.7 ? EDGE : null)); });
    fin([[13, 4.6], [10, 3.4], [6.6, 4.4], f ? [4.8, 6.4] : [4.4, 6.8]]);
    fin([[13, 13.8], [10, 15], [6.6, 14], f ? [4.8, 12] : [4.4, 11.6]]);
    piece(g, t => {
      t.ell(cx, cy, 6, 5.2, R[1]); t.ell(13.8, 9, 4, 4.6, R[1]);
      paint(t, (x, y) => (PX.inEll(x, y, 11.6, 9.6, 3.8, 3.2, 0).in ? GL : null));
      paint(t, (x, y) => (y < 10 && [8.4, 10.3, 12.2].some(bx => Math.abs(x - bx - (y - cy) * 0.05) < 0.25) ? BAR : null));
      crescent(t, cx + 0.6, cy, 6.6, 5.3, Object.assign(shades(R), { [GL]: '#ff7a44', [BAR]: '#7a2236' }), R);
    });
    face(g, 15.3, 8.3, 2.8, 3.3);
  } };

  // =====================================================================================================
  // Mandarin Dragonet: small and round, wild swirly orange and blue patterns, a fancy top fin (swims near the sand)
  // =====================================================================================================
  FA.mandarin = { w: 20, h: 15, draw(g, f) {
    const B = ['#c8e6ff', '#4c98f2', '#3a7ad6'], O = ['#ffe0b8', '#ff9a3c', '#ec7c2c'], cx = 10, cy = 9.6;
    piece(g, t => { tailFin(t, 4.8, 9.8, 3.4, 2.4, O[1], f, 'round'); for (const [x, y] of [[2.6, 9], [2.8, 10.8]]) t.ell(x, y, 0.5, 0.5, B[1]); });
    piece(g, t => { t.ell(f ? 9.6 : 10, 4.4, 2.4, 3.2, O[1], f ? -0.45 : -0.25); paint(t, (x, y) => (Math.abs(y - 3.6 - (x - 10) * 0.4) < 0.4 || Math.abs(y - 5.6 - (x - 10) * 0.4) < 0.4 ? B[1] : null)); rim(t, 10.6, 9, [[0.5, '#3a5aa8']]); });
    piece(g, t => t.ell(6.8, 6.6, 2.6, 1.4, flat(B), -0.2));
    piece(g, t => t.ell(8.6, 13, 3.6, 1, flat(O), 0.05));
    piece(g, t => {
      t.ell(cx, cy, 5.6, 3.8, B[1]); t.ell(12.6, 9, 3.8, 3.8, B[1]);
      // wavy orange swirls, the top one ending in a little curl
      const tt = new Grid(t.w, t.h, t.k), curl = []; for (let i = 0; i <= 9; i++) { const a = 2.6 + i * 0.62, q = 1.15 * (1 - i / 12); curl.push([9.9 + Math.cos(a) * q, 7.3 + Math.sin(a) * q]); }
      for (const pts of [[[5.2, 8.6], [7, 7.4], [8.8, 8]].concat(curl), [[5, 10.6], [7.2, 9.8], [9.2, 10.6], [11, 9.9], [12.4, 10.8], [13.4, 12]], [[6.4, 12.5], [8.4, 11.9], [10.4, 12.7], [12.6, 12.9]]]) PX.stroke(tt, pts, 0.45, 0.45, O[1]);
      for (let i = 0; i < t.a.length; i++) if (tt.a[i] && t.a[i]) t.a[i] = tt.a[i];
      crescent(t, cx + 0.6, cy, 6, 3.9, shades(B, O), B);
    });
    face(g, 13.9, 7.8, 2.8, 3.2);
  } };

  // =====================================================================================================
  // Seahorse: upright, sunny yellow-orange, a curly tail, a little crest, the snout pointing right (f: the back fin flutters)
  // =====================================================================================================
  FA.seahorse = { w: 14, h: 22, draw(g, f) {
    const Y = SUN, FN = ['#fffbe6', '#fff0b4', '#f2d690'], CR = ['#ffe8b0', '#ffb240', '#f2943a'], BEL = '#ffe9a2';
    piece(g, t => t.ell(3.4, 11.4, f ? 1.2 : 1.5, f ? 2.4 : 2.2, flat(FN), f ? -0.15 : 0.2));
    piece(g, t => {
      PX.stroke(t, [[6.8, 14.4], [6, 16.8], [6.4, 18.8], [7.8, 19.8], [9.2, 19.4], [9.6, 18], [8.8, 17], [7.8, 17.4]], 1.5, 0.55, Y[1]);
      t.ell(6.8, 11.4, 3.4, 3.9, Y[1], 0.1); t.ell(7.8, 12, 2.8, 3.2, Y[1]); t.ell(6.2, 8, 2.4, 2.2, Y[1]);
      const front = near(t, 1.5, 0); paint(t, (x, y) => (y > 8.8 && y < 15 && front(x, y) ? (Math.abs(((y - 9.2) % 1.4) - 0.7) < 0.16 ? Y[2] : BEL) : null));
      crescent(t, 7.2, 12.4, 3.8, 6.8, Object.assign(shades(Y), { [BEL]: '#ffd47a' }), Y, { hx: 5.6, hy: 9.6 });
    });
    piece(g, t => { t.ell(5.8, 2.6, 0.95, 1.05, flat(CR)); t.ell(7.1, 2.1, 0.95, 1.15, flat(CR)); t.ell(8.3, 2.6, 0.85, 0.95, flat(CR)); });
    piece(g, t => {
      t.ell(7.4, 5.2, 3.2, 2.9, Y[1], -0.1); PX.stroke(t, [[9.4, 5.8], [11.6, 6.4]], 0.95, 0.95, Y[1]); t.ell(11.75, 6.5, 1.1, 1.3, Y[1]);
      crescent(t, 8.4, 5.4, 4.4, 3, shades(Y), Y, { hx: 6.4, hy: 4 });
    });
    face(g, 8, 5, 2.5, 2.9, { mx: 11.6, my: 6.45, mw: 0.85, bx: 8.1, by: 7.1 });
  } };
})();
