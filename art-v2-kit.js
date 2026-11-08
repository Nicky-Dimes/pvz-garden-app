// art-v2-kit.js — PVZ Garden "v2" pixel-art style kit (the family's approved 16-bit kawaii pixel style, Nov 2026).
// Characters are drawn on the engine's fine grid: a 32x32 art-px Grid with k = 2 is a 64x64 LOGICAL pixel canvas. Every v2
// helper works in LOGICAL pixels (0..63, integer pixel centres), sets each pixel deliberately, never blends or anti-aliases.
// Exported 256x256 frames show each logical pixel as a 4x4 block (anchor: base on logical row 62, centred on column 32).
//
// The look (docs/pvz-final-handoff/.../PVZ_GARDEN_OFFICIAL_ART_STYLE.md + references/01_APPROVED_character_style_reference.png):
//  - deep navy-purple outlines (PX.INK = #29243d), one logical px, round every part (each part is its own outlined piece)
//  - 4-5 tone cel shading per material: light from the UPPER LEFT, warm highlights, cool lower-right shadows, a dark inner rim
//  - a small specular cluster on glossy forms; no gradients, no dithering, no isolated "pepper" pixels
//  - big sparkly eyes (dark iris, big white shine upper left, small shine lower right, a soft purple glow at the bottom)
//  - faces vary by character (eye shape/size/spacing, brows, mouths); the family's rules (docs) always apply
//
// Contracts are the engine's (art-core.js): PX.PLANT_ART2[id] = function (g, stage, P, C) -> { hx, hy, hr, top, ey, front?, hat? }
// in ART px (logical / 2), PX.ZOMBIE_ART2[kind] = function (g, P, L), PX.BOSS_ART2[id] = { w: 48, h: 48, draw(g, f) }.
// The dispatch in art-core.js prefers a v2 function when one exists (PX.useV2(false) switches back to the original art).
(function () {
  'use strict';
  const { Grid } = PX;
  const OUT = PX.INK; // navy-purple outline (pixel.js)
  const WHITE = '#ffffff';
  const EYE = '#24183a'; // iris: dark enough (lum < 0.25) that the costume fitter still finds the eyes
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ---------------- colour: hex <-> HSL, hue-shifted ramps ----------------
  function hex2rgb(h) { const n = parseInt(String(h).slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgb2hex(r, g, b) { return '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join(''); }
  function hex2hsl(h) {
    let [r, g, b] = hex2rgb(h).map(v => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    let hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [hh * 60, s, l];
  }
  function hsl2hex(h, s, l) {
    h = ((h % 360) + 360) % 360; s = clamp(s, 0, 1); l = clamp(l, 0, 1);
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return rgb2hex((r + m) * 255, (g + m) * 255, (b + m) * 255);
  }
  // hue toward a target (degrees, shortest way) by at most `by`
  const toward = (h, target, by) => { let d = ((target - h + 540) % 360) - 180; return h + clamp(d, -by, by); };
  // a 5-tone ramp from a mid colour: [spec, hi, mid, shadow, deep]. Highlights lean warm (toward yellow, 60deg), shadows cool
  // (toward blue-violet, 250deg) and get more saturated, the classic pixel-art hue shift. o.k scales the contrast.
  function ramp(mid, o) {
    o = o || {}; const k = o.k == null ? 1 : o.k, [h, s, l] = hex2hsl(mid);
    const grey = s < 0.08;
    const hi = hsl2hex(grey ? h : toward(h, 60, 14 * k), clamp(s * (grey ? 1 : 1.05), 0, 1), clamp(l + 0.13 * k, 0, 0.94));
    const spec = hsl2hex(grey ? h : toward(h, 60, 20 * k), clamp(s * 0.85, 0, 1), clamp(l + 0.27 * k, 0, 0.97));
    const sh = hsl2hex(grey ? toward(h, 250, 0) : toward(h, 250, 18 * k), clamp(s * (grey ? 1 : 1.08) + (grey ? 0.06 : 0), 0, 1), clamp(l - 0.15 * k, 0.04, 1));
    const deep = hsl2hex(grey ? toward(h, 250, 0) : toward(h, 250, 30 * k), clamp(s * (grey ? 1 : 1.1) + (grey ? 0.08 : 0), 0, 1), clamp(l - 0.28 * k, 0.03, 1));
    return [spec, hi, mid, sh, deep];
  }
  // the mid tone of an engine palette ramp [light, mid, shade] (pastel) pushed to the richer v2 saturation
  function richMid(R, o) {
    o = o || {}; const [h, s, l] = hex2hsl(Array.isArray(R) ? R[1] : R);
    return hsl2hex(h, clamp(s * (o.s || 1.25) + 0.08, 0, o.maxS || 0.9), clamp(l * (o.l || 0.9), 0.08, 0.86));
  }
  const mix = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); };

  // ---------------- logical-pixel drawing on a k=2 Grid (logical = fine pixels) ----------------
  const get = (t, x, y) => t.fget(x, y);
  const put = (t, x, y, c) => t.fset(x, y, c);
  // filled ellipse, centre (cx, cy), radii (rx, ry) in logical px; pixel centres tested; rot in radians; col = colour or fn(x, y)
  function ell(t, cx, cy, rx, ry, col, rot, mask) {
    const r = Math.max(rx, ry) + 1, cs = Math.cos(-(rot || 0)), sn = Math.sin(-(rot || 0));
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, u = dx * cs - dy * sn, v = dx * sn + dy * cs;
      if ((u / rx) ** 2 + (v / ry) ** 2 > 1) continue;
      if (mask && !mask(x, y)) continue;
      put(t, x, y, typeof col === 'function' ? col(x, y) : col);
    }
    return t;
  }
  function poly(t, pts, col, mask) {
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
      const px = x + 0.5, py = y + 0.5; let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside; }
      if (inside && (!mask || mask(x, y))) put(t, x, y, typeof col === 'function' ? col(x, y) : col);
    }
    return t;
  }
  function rect(t, x, y, w, h, col) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) put(t, i, j, col); return t; }
  function px(t, list, col) { for (const [x, y] of list) put(t, x, y, col); return t; }
  // a thick line (round brush of radius r) through points, rasterised on pixel centres
  function line(t, pts, r, col, mask) {
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
      for (let s = 0; s <= n; s++) { const x = x0 + (x1 - x0) * s / n, y = y0 + (y1 - y0) * s / n; ell(t, x, y, r, r, col, 0, mask); }
    }
    return t;
  }
  // a 1-px pixel line (Bresenham), for creases, veins, mouths and lids
  function bres(t, x0, y0, x1, y1, col) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
    for (;;) { put(t, x0, y0, col); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
    return t;
  }
  // indexed pixel rows (hand-placed): '.' = nothing; map[ch] = colour
  function rows(t, list, x0, y0, map, flipX) {
    list.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch === '.' || ch === ' ') continue; const c = map[ch]; if (c) put(t, flipX ? x0 + row.length - 1 - i : x0 + i, y0 + j, c); } });
    return t;
  }

  // ---------------- pieces: each part drawn on its own layer, outlined in navy, then laid on (or under) the sprite ----------------
  function piece(g, draw, o) {
    o = o || {}; const t = new Grid(g.w, g.h, g.k); draw(t);
    if (o.outline !== false) t.outline(o.ink || OUT);
    if (o.under) { for (let i = 0; i < g.a.length; i++) if (g.a[i] === null && t.a[i] !== null) g.a[i] = t.a[i]; }
    else g.merge(t);
    return t;
  }

  // ---------------- cel shading ----------------
  // shade every pixel of colour R[2] on layer t by where it sits in the shape (the connected pixels of t that aren't ink):
  //   deep  : the pixel one step down-right (dx, dy = o.rim, default 1) is outside -> a dark inner rim on the lower right
  //   shadow: the pixel (sx, sy) further down-right is outside                 -> a cool shadow band along the lower right
  //   hi    : the pixel (hx, hy) up-left is outside                            -> a warm lit band along the upper left
  // sizes in logical px (o.s = [sx, sy], o.h = [hx, hy]); o.spec = [x, y, rx, ry] adds a specular cluster (R[0]);
  // o.only: the colour to shade (default R[2]); o.noHi / o.noDeep switch bands off.
  function cel(t, R, o) {
    o = o || {}; const W = t.fw, H = t.fh, src = t.a.slice(), only = o.only || R[2];
    const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H && src[y * W + x] !== null && src[y * W + x] !== OUT;
    const [sx, sy] = o.s || [2, 3], [hx, hy] = o.h || [2, 2], rim = o.rim == null ? 1 : o.rim;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (src[y * W + x] !== only) continue;
      let c = R[2];
      if (!o.noHi && (!inside(x - hx, y - hy) || !inside(x - Math.ceil(hx / 2), y - hy) || !inside(x - hx, y - Math.ceil(hy / 2)))) c = R[1];
      if (!inside(x + sx, y + sy) || !inside(x + Math.ceil(sx / 2), y + sy)) c = R[3];
      if (!o.noDeep && rim && (!inside(x + rim, y + rim) || !inside(x, y + rim + 1))) c = R[4];
      t.a[y * W + x] = c;
    }
    if (o.spec) { const [x, y, rx, ry] = o.spec; ell(t, x, y, rx, ry, R[0], o.specRot || 0, (a, b) => { const c = get(t, a, b); return c === R[1] || c === R[2]; }); }
    despeckle(t, R);
    return t;
  }
  // round, form-following shading for an ellipse-like body (heads, bulbs, cherries): bands by the surface normal, lit from the
  // upper left. Draw the flat body in R[2] first; this repaints those pixels. o: { cx, cy, rx, ry, spec: [dx, dy, rx, ry] (relative
  // to the centre, in units of the radius), band: [hiCut, shCut] }
  function round(t, R, o) {
    // a real sphere: the 3-D normal of each pixel (nz from the ellipse) dotted with a light from the upper left and a little in
    // front, cut into bands: crescent shadows and a broad lit cap instead of flat diagonal stripes
    const W = t.fw, H = t.fh, src = t.a.slice(), only = o.only || R[2], [hiC, shC, dpC] = o.band || [0.74, 0.38, 0.06];
    const L = [-0.48, -0.62, 0.62], ln = Math.hypot(...L), lx = L[0] / ln, ly = L[1] / ln, lz = L[2] / ln;
    const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H && src[y * W + x] !== null && src[y * W + x] !== OUT;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (src[y * W + x] !== only) continue;
      let nx = (x + 0.5 - o.cx) / o.rx, ny = (y + 0.5 - o.cy) / o.ry; const q = nx * nx + ny * ny;
      if (q > 1) { const m = Math.sqrt(q); nx /= m; ny /= m; }
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), i = nx * lx + ny * ly + nz * lz;
      let c = i > hiC ? R[1] : i > shC ? R[2] : i > dpC ? R[3] : R[4];
      if (o.rim !== false && (!inside(x + 1, y + 1) || !inside(x, y + 1)) && i < shC + 0.15) c = R[4];
      t.a[y * W + x] = c;
    }
    if (o.spec !== false) {
      const [dx, dy, sr, sry] = o.spec || [-0.42, -0.52, 0.2, 0.13];
      ell(t, o.cx + dx * o.rx, o.cy + dy * o.ry, Math.max(1, sr * o.rx), Math.max(0.8, sry * o.ry), R[0], -0.6, (a, b) => { const c = get(t, a, b); return c === R[1] || c === R[2]; });
    }
    despeckle(t, R);
    return t;
  }
  // no lone pixels: a ramp pixel with no same-tone 4-neighbour takes the tone most of its neighbours have
  function despeckle(t, R) {
    const W = t.fw, H = t.fh, set = new Set(R), a = t.a;
    for (let pass = 0; pass < 2; pass++) for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const c = a[y * W + x]; if (!set.has(c) || c === R[0]) continue;
      const nb = [a[y * W + x - 1], a[y * W + x + 1], a[(y - 1) * W + x], a[(y + 1) * W + x]];
      if (nb.includes(c)) continue;
      const cnt = new Map(); for (const v of nb) if (set.has(v)) cnt.set(v, (cnt.get(v) || 0) + 1);
      let best = null, bn = 0; for (const [v, n] of cnt) if (n > bn) { best = v; bn = n; }
      if (best) a[y * W + x] = best;
    }
  }

  // ---------------- faces ----------------
  // one eye at (x, y) = its top-left, w x h logical px. mood: undefined | 'blink' | 'closed' | 'happy' | 'sad' | 'brave' | 'mad'
  // | 'sleepy' | 'dizzy'. side: -1 = the eye nearer the back (left), 1 = front (right). o.iris colour, o.glow, o.white = googly.
  function eye(g, x, y, w, h, mood, side, o) {
    o = o || {}; const iris = o.iris || EYE, glow = o.glow || mix(iris, '#8a6ae0', 0.55), cx = x + w / 2, cy = y + h / 2;
    const line = o.lid || OUT;
    if (mood === 'blink' || mood === 'closed' || mood === 'sleepy' && false) {
      // a closed eye: a soft downward curve (closed = relaxed, slightly lower) with a lash flick at the outer end
      const yy = Math.round(y + h * (mood === 'closed' ? 0.62 : 0.55));
      for (let i = 0; i < w; i++) { const t = (i + 0.5) / w, sag = Math.round(Math.sin(t * Math.PI) * Math.max(1, h * 0.14)); put(g, x + i, yy + sag, line); }
      put(g, side > 0 ? x + w : x - 1, yy - 1, line);
      return;
    }
    if (mood === 'happy') { // ^ arcs
      const yy = Math.round(y + h * 0.62);
      for (let i = 0; i < w; i++) { const t = (i + 0.5) / w, up = Math.round(Math.sin(t * Math.PI) * Math.max(2, h * 0.32)); put(g, x + i, yy - up, line); put(g, x + i, yy - up + 1, line); }
      return;
    }
    if (mood === 'dizzy') { // a little spiral
      const r = Math.min(w, h) / 2;
      for (let a = 0; a < Math.PI * 3.2; a += 0.12) { const rr = r * (0.15 + a / (Math.PI * 3.2) * 0.85); put(g, Math.round(cx - 0.5 + Math.cos(a) * rr), Math.round(cy - 0.5 + Math.sin(a) * rr), line); }
      return;
    }
    // the open eye
    const top = mood === 'sleepy' ? Math.round(h * 0.45) : 0;
    if (o.white) { // googly zombie / nut eye: a big pale ball, a small pupil
      const W1 = o.whiteCol || '#fbf7d6', W2 = o.whiteSh || '#d8d29a';
      ell(g, cx, cy, w / 2, h / 2, (a, b) => (a + b > cx + cy + Math.min(w, h) * 0.35 ? W2 : W1));
      ring(g, cx, cy, w / 2, h / 2, line);
      const [lx, ly] = o.look || [0.25, 0.1], pw = o.pupil || Math.max(2, Math.round(w * 0.3));
      const pxx = Math.round(cx - pw / 2 + lx * (w / 2 - pw / 2 - 0.5)), pyy = Math.round(cy - pw / 2 + ly * (h / 2 - pw / 2 - 0.5));
      rect(g, pxx, pyy, pw, pw, o.pupilCol || '#2a1f2e');
      if (pw >= 3) put(g, pxx, pyy, WHITE);
    } else {
      ell(g, cx, cy, w / 2, h / 2, (a, b) => (b > y + h * 0.66 ? glow : iris));
      // keep the glow off the edge so the eye stays outlined dark
      ring(g, cx, cy, w / 2, h / 2, iris);
      // the shines: a big one up-left (about 45% x 40%), a small one low-right
      const bw = Math.max(2, Math.round(w * 0.45)), bh = Math.max(2, Math.round(h * 0.38));
      const bx = Math.round(x + w * 0.16 + (side > 0 ? 0 : 0)), by = Math.round(y + h * 0.14);
      ell(g, bx + bw / 2, by + bh / 2, bw / 2, bh / 2, WHITE);
      if (w >= 4) { const sx = Math.round(x + w * 0.66), sy = Math.round(y + h * 0.66); put(g, sx, sy, WHITE); if (w >= 7) put(g, sx + 1, sy, WHITE); }
    }
    if (top) for (let j = 0; j < top; j++) for (let i = 0; i < w; i++) if (g.fget(x + i, y + j) !== null) put(g, x + i, y + j, o.lidCol || o.skin || line);
    if (o.white && (mood === 'brave' || mood === 'mad' || mood === 'sad')) {
      // googly eyes keep their round shape: a 2-px brow above does the acting (inner end pressed down for mad/brave, up for sad)
      const k = mood === 'mad' ? 3 : mood === 'brave' ? 2 : 2;
      for (let i = 0; i <= w + 1; i++) {
        const xx = side > 0 ? x - 1 + i : x + w - i, f = i / (w + 1), d = mood === 'sad' ? Math.round(f * k) : Math.round((1 - f) * k);
        put(g, xx, y - 2 + d, line); put(g, xx, y - 3 + d, line);
      }
      return;
    }
    if (mood === 'brave' || mood === 'mad' || mood === 'sad') {
      // cut the top of the eye on a slant with the lid/brow: brave = a gentle slant down toward the middle of the face, mad =
      // a heavy V brow (2 px thick) pressing on the eye, sad = slanting down toward the outer side
      const inner = side > 0 ? x : x + w - 1, outer = side > 0 ? x + w - 1 : x;
      const drop = mood === 'mad' ? Math.max(2, Math.round(h * 0.42)) : mood === 'brave' ? Math.max(1, Math.round(h * 0.28)) : Math.max(1, Math.round(h * 0.3));
      for (let i = 0; i < w; i++) {
        const xx = x + i, f = Math.abs(xx - outer) / Math.max(1, w - 1); // 0 at the outer edge, 1 at the inner
        const cut = mood === 'sad' ? Math.round((1 - f) * drop) : Math.round(f * drop);
        for (let j = 0; j < cut; j++) if (g.fget(xx, y + j) !== null) put(g, xx, y + j, o.skin || o.lidCol || mix(iris, '#ffffff', 0));
        put(g, xx, y + cut - 1, line); if (mood === 'mad') { put(g, xx, y + cut - 2, line); }
      }
      if (mood === 'mad') { put(g, inner + (side > 0 ? -1 : 1), y + drop - 1, line); put(g, inner + (side > 0 ? -1 : 1), y + drop, line); }
    }
  }
  // a 1-px ring just inside an ellipse's edge (repaints existing pixels)
  function ring(g, cx, cy, rx, ry, col) {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const inE = (a, b) => ((a + 0.5 - cx) / rx) ** 2 + ((b + 0.5 - cy) / ry) ** 2 <= 1;
      if (inE(x, y) && (!inE(x - 1, y) || !inE(x + 1, y) || !inE(x, y - 1) || !inE(x, y + 1))) put(g, x, y, col);
    }
  }
  // a pair of eyes centred on (cx, cy): o = { sp (centre distance), w, h, mood, iris, white, skin (head colour for lids), look }
  // the front (right) eye is a touch bigger: the face turns toward the viewer's right like the reference
  function eyes(g, cx, cy, o) {
    const sp = o.sp, w = o.w, h = o.h, w2 = o.w2 || w, h2 = o.h2 || h;
    eye(g, Math.round(cx - sp / 2 - w / 2), Math.round(cy - h / 2), w, h, o.mood, -1, o);
    eye(g, Math.round(cx + sp / 2 - w2 / 2), Math.round(cy - h2 / 2), w2, h2, o.mood, 1, o);
  }
  // mouths, centred on (cx, cy): 'smile' | 'open' | 'o' | 'grin' | 'frown' | 'flat' | 'cat' | 'fang' ; w = width (logical px)
  function mouth(g, cx, cy, kind, w, o) {
    o = o || {}; const ink = o.ink || '#4a1f33', red = o.red || '#9c2f4a', tongue = o.tongue || '#ff7d98';
    const x0 = Math.round(cx - w / 2), y0 = Math.round(cy);
    if (kind === 'open' || kind === 'grin') {
      const h = Math.max(2, Math.round(w * (kind === 'grin' ? 0.45 : 0.62)));
      for (let j = 0; j < h; j++) { const t = (j + 0.5) / h, half = (w / 2) * (kind === 'grin' ? 1 - t * 0.25 : Math.sqrt(1 - t * t * 0.85)); for (let i = Math.round(cx - half); i < Math.round(cx + half); i++) put(g, i, y0 + j, j === h - 1 || i === Math.round(cx - half) || i === Math.round(cx + half) - 1 ? ink : red); }
      for (let i = x0; i < x0 + w; i++) if (g.fget(i, y0) === red || g.fget(i, y0) === ink) put(g, i, y0, ink);
      if (kind === 'open' && h >= 3) { const tw = Math.max(1, Math.round(w * 0.42)); rect(g, Math.round(cx - tw / 2), y0 + h - 2, tw, 1, tongue); }
      if (kind === 'grin') for (let i = x0 + 1; i < x0 + w - 1; i++) put(g, i, y0 + 1, WHITE);
      return;
    }
    if (kind === 'o') { const r = Math.max(1, Math.round(w * 0.3)); rect(g, Math.round(cx - r), y0, r * 2, r * 2 + 1, red); ring(g, cx, y0 + r + 0.5, r, r + 0.5, ink); return; }
    if (kind === 'frown') { for (let i = 0; i < w; i++) { const t = (i + 0.5) / w, d = Math.round(Math.sin(t * Math.PI) * Math.max(1, w * 0.18)); put(g, x0 + i, y0 + 1 - d, ink); } return; }
    if (kind === 'flat') { for (let i = 0; i < w; i++) put(g, x0 + i, y0, ink); return; }
    if (kind === 'cat') { const h2 = Math.floor(w / 2); for (let i = 0; i < w; i++) { const d = i < h2 ? i : w - 1 - i; put(g, x0 + i, y0 + (d % 2 ? 0 : 1) , ink); } return; }
    // smile (default) / fang: a small U
    for (let i = 0; i < w; i++) { const t = (i + 0.5) / w, d = Math.round(Math.sin(t * Math.PI) * Math.max(1, w * 0.22)); put(g, x0 + i, y0 + d, ink); }
    if (kind === 'fang') { put(g, x0 + Math.round(w * 0.65), y0 + 2, WHITE); }
  }
  function blush(g, cx, cy, w, o) {
    o = o || {}; const c = o.col || '#ff98b0', l = o.light || '#ffc6d2', ww = Math.max(2, Math.round(w)), hh = ww >= 4 ? 2 : 1;
    for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) { if (hh === 2 && (j === 0 ? i === 0 || i === ww - 1 : false)) continue; if (g.fget(Math.round(cx - ww / 2) + i, Math.round(cy) + j) !== null) put(g, Math.round(cx - ww / 2) + i, Math.round(cy) + j, c); }
    if (ww >= 3 && g.fget(Math.round(cx - ww / 2) + 1, Math.round(cy)) !== null) put(g, Math.round(cx - ww / 2) + 1, Math.round(cy), l);
  }

  // ---------------- shared plant parts ----------------
  // a pointed leaf from base (bx, by) along angle a (radians, 0 = right), length len, half-width wd; flipped for the left side.
  // R = 5-tone leaf ramp. Returns nothing: draws into t (use inside piece()).
  function leaf(t, bx, by, a, len, wd, R, o) {
    o = o || {};
    // the outline in leaf space: u along the leaf (0 base .. len tip), v across (+ = the leaf's right side when it points along a);
    // the tip curls by `curl` (fraction of the length) toward +v
    const ca = Math.cos(a), sa = Math.sin(a), N = 18, curl = o.curl == null ? 0.16 : o.curl, top = [], bot = [];
    const half = u => Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(u, o.fat || 0.78))), o.round || 0.8) * wd * (1 - u * 0.1);
    const bend = u => u * u * curl * len;
    for (let i = 0; i <= N; i++) { const u = i / N; top.push([u * len, -half(u) + bend(u)]); bot.push([u * len, half(u) * (o.thin || 0.9) + bend(u)]); }
    const toXY = ([u, v]) => [bx + u * ca - v * sa, by + u * sa + v * ca];
    const pts = top.map(toXY).concat(bot.reverse().map(toXY));
    // which side faces the light (up-left): the side whose normal points more toward (-0.6, -0.8)
    const nTop = [sa, -ca], litTop = nTop[0] * -0.6 + nTop[1] * -0.8 > 0;
    poly(t, pts, (x, y) => {
      const dx = x + 0.5 - bx, dy = y + 0.5 - by, u = dx * ca + dy * sa, v = -dx * sa + dy * ca - bend(Math.max(0, Math.min(1, u / len)));
      const onTop = v < 0, lit = onTop === litTop;
      return lit ? R[1] : R[2];
    });
    // a dark inner rim on the shaded edge, the midrib as a darker line
    const W = t.fw, H = t.fh, src = t.a.slice(), inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H && src[y * W + x] !== null && src[y * W + x] !== OUT;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = src[y * W + x]; if (c !== R[2] && c !== R[1]) continue; if (!inside(x + 1, y + 1) || !inside(x, y + 1)) t.a[y * W + x] = c === R[2] ? R[3] : R[2]; }
    if (o.vein !== false && len >= 7) {
      for (let i = 2; i < Math.round(len * 0.78); i++) { const u = i, v = bend(i / len); const [x, y] = toXY([u, v]); const X = Math.round(x - 0.5), Y = Math.round(y - 0.5); if (inside(X, Y)) put(t, X, Y, R[3]); }
    }
    despeckle(t, R);
  }
  // two base leaves the plant sits on (they stay on the ground when it hops); w = spread; up = cheer lift. Whatever their size,
  // they are settled so their outline's lowest row is GROUND (61): with the finishing contour every plant stands on row 62.
  const GROUND = 61;
  function baseLeaves(g, cx, y, w, R, P, o) {
    o = o || {}; const up = P && P.arms === 'up' ? 0.32 : 0, len = o.len || Math.round(w * 0.72), wd = o.wd || Math.max(3, Math.round(w * 0.24));
    const t = new Grid(g.w, g.h, g.k);
    piece(t, u => leaf(u, cx - 1, y, Math.PI + 0.22 + up, len, wd, R, { curl: 0.3, thin: 0.72 }));
    piece(t, u => leaf(u, cx + 1, y, -0.22 - up, len, wd, R, { curl: -0.3, thin: 0.72 }));
    let low = -1; for (let i = t.a.length - 1; i >= 0; i--) if (t.a[i] !== null) { low = Math.floor(i / t.fw); break; }
    const dy = low < 0 ? 0 : (o.ground == null ? GROUND : o.ground) - low;
    for (let yy = t.fh - 1; yy >= 0; yy--) for (let xx = 0; xx < t.fw; xx++) { const c = t.a[yy * t.fw + xx]; if (c !== null) put(g, xx, yy + dy, c); }
    return dy;
  }
  // a stem from (x, y0) down to the ground y1 (2-3 px wide, shaded left-light / right-dark)
  function stem(g, x, y0, y1, R, w) {
    w = w || 3;
    piece(g, t => { for (let y = Math.round(y0); y <= Math.round(y1); y++) for (let i = 0; i < w; i++) put(t, Math.round(x - w / 2) + i, y, i === 0 ? R[1] : i === w - 1 ? R[3] : R[2]); });
  }

  // ---------------- poses ----------------
  // the hop for walking frame B / cheering (logical px, negative = up)
  const hop = P => (P.walk && P.frame ? -3 : P.arms === 'up' ? -2 : 0);
  // the face mood from the pose (the engine passes eyes / mouth directly)
  const moodOf = P => (P.sleep ? 'closed' : P.eyes);

  // ---------------- geometry back to the engine (art px) ----------------
  function topRow(g) { for (let y = 0; y < g.fh; y++) for (let x = 0; x < g.fw; x++) if (g.fget(x, y) !== null) return Math.floor(y / 2); return g.h; }
  const geo = (g, o) => Object.assign({ hx: Math.round(o.hx / 2), hy: Math.round(o.hy / 2), hr: Math.max(3, Math.round(o.hr / 2)), top: topRow(g), ey: Math.round(o.ey / 2), v2: true },
    o.front != null ? { front: Math.round(o.front / 2) } : {}, o.hat ? { hat: { x: Math.round(o.hat.x / 2), y: Math.round(o.hat.y / 2), w: Math.round(o.hat.w / 2) } } : {});

  // the finishing contour for a whole v2 sprite: a 1-px navy line round the silhouette (where pieces didn't already give one),
  // thickened to 2 px on the lower-right side so the character sits heavy and bold like the approved sheet
  function contour(g) {
    // pieces already carry a 1-px navy outline; this closes any gap round the silhouette and then thickens the RIGHT and BOTTOM
    // edges to 2 px (light comes from the upper left), so the sprite grows by at most 1 px left/top and 2 px right/bottom
    const W = g.fw, H = g.fh, a = g.a;
    const paint = i => { const v = a[i]; return v !== null && v !== undefined && v !== OUT && v[0] === '#'; };
    let add = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (a[i] !== null) continue; if ((x > 0 && paint(i - 1)) || (x < W - 1 && paint(i + 1)) || (y > 0 && paint(i - W)) || (y < H - 1 && paint(i + W))) add.push(i); }
    for (const i of add) a[i] = OUT;
    add = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (a[i] !== null) continue; if ((x > 1 && a[i - 1] === OUT && paint(i - 2)) || (y > 1 && a[i - W] === OUT && paint(i - 2 * W))) add.push(i); }
    for (const i of add) a[i] = OUT;
    return g;
  }
  PX.PLANT_ART2 = PX.PLANT_ART2 || {};
  PX.ZOMBIE_ART2 = PX.ZOMBIE_ART2 || {};
  PX.BOSS_ART2 = PX.BOSS_ART2 || {};
  PX.PLANT_PAL2 = PX.PLANT_PAL2 || {};
  PX.v2 = { GROUND, contour, OUT, WHITE, EYE, ramp, richMid, mix, hex2hsl, hsl2hex, ell, poly, rect, px, line, bres, rows, piece, cel, round, despeckle, eye, eyes, ring, mouth, blush, leaf, baseLeaves, stem, hop, moodOf, geo, topRow, clamp };
})();
