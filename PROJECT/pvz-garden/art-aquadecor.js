// art-aquadecor.js — PVZ Garden: My Aquarium decorations (22). Corals, sea grass, rocks and shells, a giant clam, treasure, a sunken
// ship, a sea castle, a diver's helmet, a bubble volcano, the PvZ water plants (Sea-shroom, Tangle Kelp), a Snorkel Zombie statue,
// Crazy Dave's pot and two legendaries (Golden Treasure, Crystal Grotto).
// Contract (art-aqua.js): PX.DECOR_ART[id] = { w, h, draw(g, f) } on a hi-res PX.Grid(w, h) in art-pixel coordinates; it stands on
// the sand (anchored bottom-centre, its base on the bottom rows); f = 0 | 1 is a gentle animation frame (sway, a bubble puff, a lid
// lifting). The builder adds the bold outer line, so pieces get thin outlines only. A 1 art-pixel border stays clear.
// Style: TRUE chibi stickers like art-world2.js (docs/pvz-art-guide.md): round chunky shapes, flat pastel fills with one soft shade
// crescent and a small highlight. PX.art (art-core.js) is looked up while drawing, never at load (load order differs by tool).
(function () {
  'use strict';
  if (!window.PX || !PX.Grid) return;
  const { Grid, INK } = PX;
  const D = PX.DECOR_ART = PX.DECOR_ART || {};
  const AR = () => PX.art || {};
  const WHITE = '#ffffff', PI = Math.PI;
  function mixHex(a, b, k) { const p = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)), A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); }

  // ---------------- helpers (the kit from art-world2.js) ----------------
  const piece = (G, draw) => { const t = new Grid(G.w, G.h, G.k); draw(t); t.outline(); G.merge(t); return G; };
  const fine = f => { f.fine = true; return f; };
  const IN = g => fine((x, y) => g.filled(x, y));
  // the chibi crescent shade for any silhouette already drawn on t (pixels outside the ellipse nudged up-left take R[2])
  function softShade(t, cx, cy, rx, ry, R, o) {
    o = o || {}; const k = o.shade == null ? 0.16 : o.shade, K = t.k || 1, sx = cx - rx * k, sy = cy - ry * k * 1.15;
    for (let fy = 0; fy < t.fh; fy++) for (let fx = 0; fx < t.fw; fx++) {
      const i = fy * t.fw + fx, c = t.a[i]; if (!c || c === INK || (o.only && c !== o.only)) continue;
      if (!PX.inEll((fx + 0.5) / K, (fy + 0.5) / K, sx, sy, rx * 1.02, ry * 1.02, o.rot || 0).in) t.a[i] = R[2];
    }
    if (o.hl !== false) t.ell(cx - rx * 0.42, cy - ry * 0.5, Math.max(0.6, rx * 0.22), Math.max(0.45, ry * 0.13), R[0], -0.55, IN(t));
    return t;
  }
  // the chibi body fill (PX.art.softBody): flat R[1], a soft R[2] crescent low-right, a small R[0] highlight up-left
  function soft(t, cx, cy, rx, ry, R, o) {
    o = o || {}; const rot = o.rot || 0, k = o.shade == null ? 0.16 : o.shade, m = o.mask;
    t.ell(cx, cy, rx, ry, R[1], rot, m);
    const lit = (x, y) => PX.inEll(x + 0.5 / t.k, y + 0.5 / t.k, cx - rx * k, cy - ry * k * 1.15, rx * 1.02, ry * 1.02, rot).in;
    t.ell(cx, cy, rx, ry, R[2], rot, fine((x, y) => !lit(x, y) && (!m || m(x, y))));
    if (o.hl !== false) t.ell(cx - rx * 0.4, cy - ry * 0.48, Math.max(0.6, rx * 0.24), Math.max(0.45, ry * 0.14), R[0], rot - 0.55, m);
  }
  // a soft shade that follows any outline (branches, blades): R[1] pixels whose (dx, dy) neighbour down-right is empty take R[2]
  function shadeEdge(t, R, dx, dy) {
    const k = t.k, ox = Math.max(1, Math.round(dx * k)), oy = Math.max(1, Math.round(dy * k)), W = t.fw, list = [];
    for (let fy = 0; fy < t.fh; fy++) for (let fx = 0; fx < W; fx++) if (t.a[fy * W + fx] === R[1] && t.fget(fx + ox, fy + oy) === null) list.push(fy * W + fx);
    for (const i of list) t.a[i] = R[2];
  }
  const shine = (t, x, y, rx, ry, col, rot) => t.ell(x, y, rx, ry, col, rot == null ? -0.55 : rot, IN(t));
  // a rounded box from (x0, y0) to (x1, y1), corner radius r; col may be a function (x, y) -> colour
  function box(t, x0, y0, x1, y1, r, col) {
    const k = t.k || 1;
    for (let fy = Math.floor(y0 * k); fy < Math.ceil(y1 * k); fy++) for (let fx = Math.floor(x0 * k); fx < Math.ceil(x1 * k); fx++) {
      const px = (fx + 0.5) / k, py = (fy + 0.5) / k, cx = Math.min(Math.max(px, x0 + r), x1 - r), cy = Math.min(Math.max(py, y0 + r), y1 - r);
      if ((px - cx) ** 2 + (py - cy) ** 2 <= r * r) t.fset(fx, fy, typeof col === 'function' ? col(px, py) : col);
    }
    return t;
  }
  const line = (g, pts, r, col) => PX.stroke(g, pts, r, r, col);
  // only where something is already drawn (grooves, bands and stripes that stay inside a shape)
  const lineInT = (g, pts, r0, r1, col) => { const t = new Grid(g.w, g.h, g.k); PX.stroke(t, pts, r0, r1, col); for (let i = 0; i < g.a.length; i++) if (t.a[i] && g.a[i] && g.a[i] !== INK) g.a[i] = t.a[i]; };
  const lineIn = (g, pts, r, col) => lineInT(g, pts, r, r, col);
  // rotate points round (cx, cy)
  const rot = (pts, cx, cy, a) => { const c = Math.cos(a), s = Math.sin(a); return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]); };
  // big glossy chibi eyes + blush (+ a tiny mouth), sized from r like the plants (PX.art.chibiEyes)
  function face(g, ex, ey, r, o) {
    o = o || {}; const A = AR();
    if (A.chibiEyes) A.chibiEyes(g, ex, ey, Object.assign({ sp: r * 0.86, w: r * 0.48, h: r * 0.64 }, o.eye));
    if (o.blush !== false && A.blush) A.blush(g, ex - 0.2, ey + (o.by || r * 0.42), { sp: o.bsp || r, w: o.bw, h: o.bh });
    if (o.mouth && A.chibiMouth) A.chibiMouth(g, ex + 0.1, ey + (o.my || r * 0.48), o.mouth, o.mw || 2);
  }
  // an outlined four-point sparkle (golden twinkles on the legendaries)
  const sparkle = (g, x, y, s, col) => piece(g, t => t.poly(PX.starPts(x, y, 1.9 * s, 0.62 * s, 4), col || '#fff6a0'));
  // a round air bubble: pale blue, a soft shade and a bright glint
  const BUB = ['#ffffff', '#d6f4fd', '#a8dcf0'];
  function bubble(g, x, y, r) {
    piece(g, t => soft(t, x, y, r, r, BUB, { hl: false }));
    g.ell(x - r * 0.36, y - r * 0.36, Math.max(0.45, r * 0.3), Math.max(0.4, r * 0.24), WHITE, -0.7, fine((xx, yy) => PX.inEll(xx, yy, x, y, r * 0.9, r * 0.9).in));
  }
  // a chubby five-point starfish with round tips
  function starfish(g, x, y, r, R, a) {
    piece(g, t => {
      const ang = [0, 1, 2, 3, 4].map(i => -PI / 2 + (a || 0) + i * PI * 2 / 5), pts = [];
      ang.forEach(q => { pts.push([x + Math.cos(q) * r * 0.86, y + Math.sin(q) * r * 0.86], [x + Math.cos(q + PI / 5) * r * 0.46, y + Math.sin(q + PI / 5) * r * 0.46]); });
      t.poly(pts, R[1]); for (const q of ang) t.ell(x + Math.cos(q) * r * 0.74, y + Math.sin(q) * r * 0.74, r * 0.2, r * 0.2, R[1]); t.ell(x, y, r * 0.5, r * 0.48, R[1]);
      shadeEdge(t, R, Math.max(0.3, r * 0.12), Math.max(0.3, r * 0.14));
    });
    for (const q of [0, 1, 2, 3, 4].map(i => -PI / 2 + (a || 0) + i * PI * 2 / 5)) g.dot(x + Math.cos(q) * r * 0.5, y + Math.sin(q) * r * 0.5, R[0]);
  }
  // a pointed crystal prism standing on (x, y): half-width w, height h, tilt a (0 = straight up); a light left facet and a glint
  function crystal(g, x, y, w, h, a, C) {
    const P = pts => rot(pts.map(([dx, dy]) => [x + dx, y + dy]), x, y, a);
    piece(g, t => { t.poly(P([[-w, 0.6], [-w, -h + w * 1.1], [0, -h], [w, -h + w * 1.1], [w, 0.6]]), C[1]); t.poly(P([[-w, 0.6], [-w, -h + w * 1.1], [0, -h], [-w * 0.1, 0.6]]), C[0]); t.poly(P([[w * 0.45, 0.6], [w * 0.45, -h + w * 1.6], [w, -h + w * 1.1], [w, 0.6]]), C[2]); });
    const [gx, gy] = P([[-w * 0.5, -h * 0.55]])[0]; g.dot(gx, gy, WHITE); g.dot(gx, gy + 0.5, WHITE);
  }
  // a gold coin seen at an angle (a flat ellipse with a rim)
  function coin(g, x, y, r, GD) { piece(g, t => { t.ell(x, y, r, r * 0.62, GD[2]); t.ell(x, y - 0.25, r, r * 0.6, GD[1]); }); g.ell(x, y - 0.3, r * 0.55, r * 0.3, GD[0], 0, IN(g)); }
  // a faceted gem (rounded diamond) with a white shine
  function gem(g, x, y, r, C) {
    piece(g, t => { t.poly([[x - r, y - r * 0.2], [x - r * 0.5, y - r * 0.8], [x + r * 0.5, y - r * 0.8], [x + r, y - r * 0.2], [x, y + r]], C[1]); t.poly([[x - r, y - r * 0.2], [x - r * 0.5, y - r * 0.8], [x, y - r * 0.8], [x, y + r]], C[0]); });
    g.dot(x - r * 0.45, y - r * 0.35, WHITE);
  }

  // a roomier canvas for a drawing: ox art px more each side and oy more on top (its base stays on the bottom rows), so the bold
  // outer line keeps a 1 art-pixel clear border
  function pad(ox, oy, A) {
    return { w: A.w + ox * 2, h: A.h + oy, draw(g, f) {
      const t = new Grid(A.w, A.h, g.k), dx = ox * g.k, dy = oy * g.k; A.draw(t, f);
      for (let fy = 0; fy < t.fh; fy++) for (let fx = 0; fx < t.fw; fx++) { const c = t.a[fy * t.fw + fx]; if (c !== null) g.a[(fy + dy) * g.fw + fx + dx] = c; }
    } };
  }

  // ---------------- colours ----------------
  const PINK = ['#ffe8f4', '#ffaed2', '#ec88b8'];
  const LILAC = ['#fbeefc', '#ebbce6', '#cf9acb'];
  const FAN = ['#f4e8ff', '#c9a4f2', '#a682dc'];
  const TEAL = ['#e6fff6', '#9fe6cc', '#72c8b0'];
  const GRASS = ['#e4f8c6', '#a4dc86', '#7cc06e'];
  const GRASS2 = ['#d6f0b8', '#88c874', '#68ac62'];
  const ROCK = ['#f4f0fa', '#d2c8e0', '#ada2c4'];
  const SHELL = ['#fcf6ff', '#e6d8f6', '#c6b4de'];
  const CONCH = ['#ffeef2', '#ffbcd0', '#f09ab6'];
  const SCAL = ['#fff8e2', '#ffdca2', '#f2bc7c'];
  const TENT = ['#ffeefa', '#f6b2e2', '#da8ec8'];
  const TENT2 = ['#f8e0f6', '#e49ad6', '#c67cbc'];
  const FOOT = ['#fff0e2', '#ffc8aa', '#eca68a'];
  const CLAM = ['#fdfbff', '#e8e2f6', '#c6bcde'];
  const MANT = ['#dce0ff', '#9ea6f4', '#7c80da'];
  const WOOD = ['#fbe2c6', '#e2ae84', '#c69068'];
  const WOOD2 = ['#f2d6b8', '#c99c78', '#a88062'];
  const GOLD = ['#fff6c8', '#ffd866', '#f0b44a'];
  const STEEL = ['#ffffff', '#d6dce8', '#9ea8c0'];
  const SAND = ['#fff8e6', '#f8e4b8', '#e4c894'];
  const PEACH = ['#fff2ea', '#ffd2c0', '#f2b09c'];
  const BRASS = ['#fff4c8', '#f8cf72', '#dea652'];
  const STONE = ['#f8f6fc', '#d8d4e4', '#b4aec6'];
  const MOSS = ['#e4f8c4', '#a8d88a', '#84bc72'];
  const VROCK = ['#f6ecf2', '#d2bed0', '#ae98b2'];
  const LAVA = ['#fff2d0', '#ffc48c', '#f49c72'];
  const STARP = ['#ffe8e0', '#ffae9c', '#ee8a7c'];
  const GLASS = '#6a9cc4';

  // =====================================================================================================
  // Corals, grass, rocks and shells
  // =====================================================================================================
  // Brain Coral: a round pink-lilac dome with soft maze grooves
  D.brain = pad(1, 0, { w: 18, h: 14, draw(g) {
    const B = LILAC;
    piece(g, t => soft(t, 9, 8.6, 7.8, 6.6, B, { mask: fine((x, y) => y <= 12.7) }));
    const gc = mixHex(B[2], '#9a6a9e', 0.25), band = (i, x) => 4.4 + i * 2.1 + Math.sin(x * 1.3 + i * 1.9) * 0.5 + ((x - 9) / 7.8) ** 2 * 2.4;
    for (let i = 0; i < 4; i++) { const pts = []; for (let x = 1; x <= 17; x += 0.35) pts.push([x, band(i, x)]); lineIn(g, pts, 0.26, gc); }
    // little dead-end turns between the grooves (the maze)
    for (const [i, x] of [[0, 5.6], [0, 12.4], [1, 8.8], [1, 3.8], [1, 14.2], [2, 6.4], [2, 11.6]]) lineIn(g, [[x, band(i, x)], [x + 0.3, (band(i, x) + band(i + 1, x)) / 2 + 0.3]], 0.26, gc);
    g.ell(5.6, 4.9, 1.6, 0.7, B[0], -0.5, IN(g));
  } });

  // Staghorn Coral: branching antlers in bubblegum pink with lighter tips (f sways the branches)
  D.staghorn = { w: 22, h: 22, draw(g, f) {
    const P = PINK, sw = f ? 0.8 : 0, S = pts => pts.map(([x, y]) => [x + sw * ((20.6 - y) / 18) ** 1.5, y]);
    // Y-forking branches (an antler bush, tips at different heights and angles)
    const br = [
      [[[11, 20.6], [10.9, 16.8]], 1.9, 1.7],
      [[[10.9, 16.8], [7.6, 13.2], [4.6, 10.6], [3.2, 7.6]], 1.55, 1.0],
      [[[7.6, 13.2], [8.4, 9.6], [7.6, 6.4]], 1.25, 1.0],
      [[[8.4, 9.8], [10.2, 7.2], [10.6, 4.4]], 1.05, 0.95],
      [[[10.9, 16.8], [14.4, 13.6], [17.4, 10.8], [18.6, 7.8]], 1.55, 1.0],
      [[[14.4, 13.6], [14, 9.8], [14.8, 6.2]], 1.25, 1.0],
      [[[4.6, 10.6], [6, 8.4]], 0.95, 0.9],
    ];
    piece(g, t => {
      t.ell(11, 20.4, 3.2, 1.2, P[1]);
      for (const [pts, r0, r1] of br) PX.stroke(t, S(pts), r0, r1, P[1]);
      shadeEdge(t, P, 0.45, 0.5);
      for (const [pts] of br.slice(1)) { const [x, y] = S(pts)[pts.length - 1]; t.ell(x, y - 0.2, 1.0, 1.1, P[0]); }
      shine(t, 9.6, 17.6, 0.5, 1.2, P[0], 0.3);
    });
  } };

  // Sea Fan: a big lacy purple fan on a short stalk (f sways it)
  D.seafan = { w: 26, h: 24, draw(g, f) {
    const F = FAN, ST = ['#e6d0f6', '#b08ad8', '#8e6cc0'], sx = f ? 0.45 : -0.45, cx = 13 + sx, by = 18.8;
    // the fan: a wide rounded fan with a softly lobed top edge
    piece(g, t => {
      t.ell(cx, 11.6, 10.2, 7.2, F[1], 0, fine((x, y) => y <= 15.4));
      t.poly([[cx - 8.2, 15], [cx + 8.2, 15], [cx + 1.4, by], [cx - 1.4, by]], F[1]);
      for (const [x, y, rx, ry] of [[-6.4, 7.4, 4.2, 3.6], [0, 5.6, 5, 3.2], [6.4, 7.2, 4.2, 3.6]]) t.ell(cx + x, y, rx, ry, F[1]);
      softShade(t, cx, 11.8, 11, 7.6, F, { hl: false });
    });
    // the lace: a light net, then darker veins branching out from the stalk
    for (let d = -26; d < 34; d += 3.4) { lineIn(g, [[d + sx, 25], [d + sx + 25, 0]], 0.17, F[0]); lineIn(g, [[d + sx, 0], [d + sx + 25, 25]], 0.17, F[0]); }
    for (const v of [[[0, by], [-3.4, 13.8], [-7.6, 10.6], [-10.2, 10.2]], [[-3.4, 13.8], [-4.8, 8.6], [-7, 5.6]], [[0, by], [3.4, 13.8], [7.6, 10.6], [10.2, 10.2]], [[3.4, 13.8], [4.8, 8.6], [7, 5.6]], [[0, by], [-0.2, 10.6], [-1.6, 4.4]], [[-0.2, 10.6], [1.8, 4.4]]]) lineIn(g, v.map(([x, y]) => [cx + x, y]), 0.3, mixHex(F[1], F[2], 0.8));
    piece(g, t => { line(t, [[13, 22.6], [13 + sx * 0.4, 21], [cx, by - 0.4]], 1.05, ST[1]); t.ell(13, 22.6, 2.8, 1.1, ST[1]); shadeEdge(t, ST, 0.4, 0.4); });
  } };

  // Mushroom Coral: a flat round green-teal disc with radiating ridges and a glowing centre (f: the glow pulses)
  D.mushroomcoral = pad(1, 0, { w: 20, h: 12, draw(g, f) {
    const T = TEAL;
    piece(g, t => { t.ell(10, 7.6, 8.6, 3.3, T[2]); t.ell(10, 6.5, 8.6, 3.3, T[1]); t.ell(10, 5.9, 6.2, 2.6, T[1]); });
    const rc = mixHex(T[2], '#3f8f80', 0.3);
    for (let i = 0; i < 20; i++) { const a = i * PI / 10 + 0.08; lineIn(g, [[10 + Math.cos(a) * 2.4, 6.2 + Math.sin(a) * 0.9], [10 + Math.cos(a) * 8.2, 6.4 + Math.sin(a) * 3.1]], 0.22, rc); }
    g.ell(10, 6.2, 3.2 + f * 0.5, 1.4 + f * 0.25, '#d6fff2', 0, IN(g));
    g.ell(10, 6.2, 2.2 + f * 0.3, 0.55 + f * 0.1, '#fffbd8', 0, IN(g));
    g.dots([[9.0, 6.0], [9.5, 6.0]], WHITE);
    g.ell(4.6, 5.3, 1.4, 0.45, T[0], -0.25, IN(g));
  } });

  // Sea Grass: a tuft of long green blades (f sways them)
  D.seagrass = pad(1, 1, { w: 18, h: 20, draw(g, f) {
    const sw = f ? 0.9 : 0;
    piece(g, t => t.ell(9, 18.6, 3.2, 1.0, GRASS2[1]));
    // [base x, height, lean, colours], back to front
    for (const [bx, h, lean, C] of [[7.4, 13, -3.4, GRASS2], [10.4, 14.4, 3.2, GRASS2], [9, 17, -1, GRASS], [6.4, 10.4, -3.8, GRASS], [11.6, 11, 3.8, GRASS], [9.8, 15.4, 1.2, GRASS]]) piece(g, t => {
      const pts = []; for (let i = 0; i <= 8; i++) { const k = i / 8; pts.push([bx + (lean + sw) * k * k + Math.sin(k * 3) * 0.3, 18.8 - k * h]); }
      PX.stroke(t, pts, 1.0, 0.45, C[1]); shadeEdge(t, C, 0.4, 0.3);
      line(t, pts.slice(1, 5).map(([x, y]) => [x - 0.35, y]), 0.16, C[0]);
    });
  } });

  // Live Rock: a chunky lumpy grey-purple rock with tiny pink and green coral spots
  D.liverock = pad(1, 0, { w: 24, h: 18, draw(g) {
    const R = ROCK;
    piece(g, t => { line(t, [[15.6, 6], [16.4, 3.8], [17.8, 2.6]], 0.7, PINK[1]); line(t, [[16.2, 4.6], [15.2, 2.8]], 0.6, PINK[1]); t.ell(17.9, 2.5, 0.75, 0.75, PINK[0]); t.ell(15.1, 2.7, 0.65, 0.65, PINK[0]); });
    piece(g, t => { for (const [dx, h, a] of [[-1, 2.6, -0.45], [0, 3.4, 0], [1, 2.4, 0.45]]) line(t, [[6.6 + dx * 0.6, 7], [6.6 + dx * 0.6 + Math.sin(a) * h, 7 - h]], 0.45, GRASS[1]); });
    piece(g, t => {
      for (const [x, y, rx, ry] of [[8.6, 11.6, 7.2, 5.6], [15.6, 10.6, 6.6, 6.2], [11.6, 7.2, 5.4, 4.4], [19.2, 13.4, 3.6, 3.4], [4.4, 13.6, 3.4, 3]]) t.ell(x, y, rx, ry, R[1], 0, fine((xx, yy) => yy <= 16.8));
      softShade(t, 12, 10.4, 10.6, 6.6, R);
    });
    const m = IN(g);
    for (const [x, y] of [[12.6, 12.6], [7.6, 9.8], [17.4, 8.4], [10.4, 15.4]]) g.ell(x, y, 0.55, 0.42, R[2], 0, m);
    for (const [x, y, c] of [[5.2, 12.4, PINK], [10.8, 9.4, GRASS], [14.6, 13.8, PINK], [18.8, 9.8, FAN], [19.8, 14.6, GRASS], [8.2, 14.6, ['#fff8d8', '#ffd87a', '#e8b860']]]) { g.ell(x, y, 1.1, 0.95, c[2], 0, m); g.ell(x, y, 0.7, 0.6, c[1], 0, m); g.dot(x - 0.3, y - 0.3, WHITE); }
  } });

  // Seashells: a butter scallop, a pink conch and a lilac spiral shell
  D.shells = pad(1, 0, { w: 20, h: 13, draw(g) {
    const S1 = SCAL;
    piece(g, t => {
      t.ell(6, 6.8, 4.5, 4.1, S1[1], 0, fine((x, y) => y <= 8.4));
      t.poly([[1.7, 8], [10.3, 8], [7.2, 11.2], [4.8, 11.2]], S1[1]);
      t.poly([[3.8, 10.2], [8.2, 10.2], [8.8, 12], [3.2, 12]], S1[1]);
      for (let i = 0; i < 7; i++) { const a = PI + 0.25 + i * (PI - 0.5) / 6; t.ell(6 + Math.cos(a) * 4.2, 6.8 + Math.sin(a) * 3.9, 0.9, 0.9, S1[1]); }
      softShade(t, 6, 7.4, 5, 4.6, S1);
    });
    for (let i = 0; i < 6; i++) { const a = PI + 0.5 + i * (PI - 1) / 5; lineIn(g, [[6, 10.6], [6 + Math.cos(a) * 4.6, 6.8 + Math.sin(a) * 4.2]], 0.2, S1[2]); }
    lineIn(g, [[3.4, 10.4], [8.6, 10.4]], 0.18, S1[2]);
    // the conch: a fat body tapering to a pointy spire up to the right, knobs on its shoulder, the flared lip pink inside
    const C = CONCH;
    piece(g, t => {
      t.poly([[11, 6.2], [15.6, 4.6], [19, 3.4], [17.6, 7.6], [15.6, 11.4], [11.6, 11.8]], C[1]); t.ell(13.2, 8.8, 3.4, 3.0, C[1]);
      for (const [x, y] of [[12.4, 5.6], [14.8, 4.8]]) t.ell(x, y, 0.95, 0.9, C[1]);
      softShade(t, 14.2, 7.4, 5.2, 4.4, C);
    });
    lineIn(g, [[15.8, 6], [17.2, 7.4]], 0.18, C[2]); lineIn(g, [[16.8, 4.8], [18, 5.8]], 0.18, C[2]);
    piece(g, t => { t.ell(12.6, 9.4, 2.4, 2.4, '#fff4f7', 0.3); });
    g.ell(12.9, 9.6, 1.25, 1.55, '#f49aba', 0.3, IN(g));
    // the spiral shell in front
    const S = SHELL;
    piece(g, t => { soft(t, 8.6, 9.6, 2.7, 2.4, S); t.ell(9.1, 7.1, 0.8, 0.7, S[1]); });
    { const sp = []; for (let a = 0; a < 10.5; a += 0.3) { const r = 2.1 * (1 - a / 12); sp.push([8.7 + Math.cos(a) * r, 9.6 + Math.sin(a) * r * 0.86]); } lineIn(g, sp, 0.19, S[2]); }
  } });

  // Anemone: a bed of soft wiggly purple-pink tentacles with light tips on a peach base (f sways the tentacles)
  D.anemone = { w: 24, h: 20, draw(g, f) {
    const sw = f ? 0.7 : 0;
    piece(g, t => soft(t, 12, 16.4, 6.4, 3.4, FOOT, { mask: fine((x, y) => y <= 19), hl: false }));
    const tent = (a, L, ph, R) => piece(g, t => {
      const bx = 12 + Math.cos(a) * 2.6, by = 13.8 + Math.sin(a) * 0.6, pts = [];
      for (let i = 0; i <= 10; i++) { const k = i / 10, d = L * k, wob = Math.sin(k * 5 + ph) * 0.6 * k; pts.push([bx + Math.cos(a) * d - Math.sin(a) * wob + sw * k * k, by + Math.sin(a) * d + Math.cos(a) * wob]); }
      PX.stroke(t, pts, 1.05, 0.85, R[1]); shadeEdge(t, R, 0.35, 0.4);
      const [ex, ey] = pts[10]; t.ell(ex, ey, 0.95, 0.95, R[0]);
    });
    [[-2.75, 6.3, 0], [-2.3, 7.2, 1.4], [-1.85, 7.6, 2.6], [-1.3, 7.6, 0.6], [-0.85, 7.2, 2], [-0.4, 6.3, 3]].forEach(([a, L, ph]) => tent(a, L, ph, TENT2));
    [[-2.95, 4.6, 1], [-2.45, 5.6, 2.2], [-1.95, 6.2, 0.4], [-1.45, 6.4, 1.6], [-1.0, 6.0, 2.8], [-0.55, 5.6, 0.8], [-0.15, 4.6, 2]].forEach(([a, L, ph]) => tent(a, L, ph, TENT));
    [[PI - 0.2, 3.4, 1.2], [0.2, 3.4, 2.4]].forEach(([a, L, ph]) => tent(a, L, ph, TENT));
  } };

  // Bubble Coral: a clump of round pale green and white bubbles (f: they breathe a little)
  D.bubblecoral = pad(1, 0, { w: 18, h: 15, draw(g, f) {
    const A1 = ['#ffffff', '#ddf6d6', '#b4dcb8'], A2 = ['#ffffff', '#f4fff0', '#d0e8d2'];
    piece(g, t => { t.ell(9, 13.4, 6.8, 1.2, ROCK[1]); softShade(t, 9, 13.4, 6.8, 1.2, ROCK, { hl: false }); });
    [[5.2, 8.4, 2.6, A1], [9.2, 6.4, 3.0, A2], [13, 8.2, 2.7, A1], [3.8, 11.6, 2.3, A2], [7.6, 10.8, 2.8, A1], [11.6, 11, 2.8, A2], [14.8, 12, 2.0, A1]].forEach(([x, y, r, R], i) => {
      const k = f && i % 2 ? 0.18 : 0;
      piece(g, t => soft(t, x, y, r + k, (r + k) * 0.95, R, { hl: false }));
      g.ell(x - r * 0.38, y - r * 0.4, r * 0.3, r * 0.2, WHITE, -0.6, IN(g));
    });
  } });

  // Rock Arch: a lumpy rock arch fish can swim through, coral spots, a little starfish and coral sprigs on top
  D.rockarch = pad(1, 1, { w: 36, h: 22, draw(g) {
    const R = ROCK;
    piece(g, t => { line(t, [[12.4, 5], [12, 3], [10.6, 1.8]], 0.65, PINK[1]); line(t, [[12.1, 3.6], [13.4, 2]], 0.55, PINK[1]); t.ell(10.5, 1.8, 0.7, 0.7, PINK[0]); t.ell(13.5, 1.9, 0.6, 0.6, PINK[0]); });
    piece(g, t => { for (const [dx, h, a] of [[-1, 2.4, -0.45], [0, 3.2, 0.05], [1, 2.2, 0.5]]) line(t, [[25 + dx * 0.6, 6.4], [25 + dx * 0.6 + Math.sin(a) * h, 6.4 - h]], 0.45, GRASS[1]); });
    piece(g, t => {
      const flatB = fine((x, y) => y <= 20.8);
      for (const [x, y, rx, ry] of [[9, 10, 7.4, 5.6], [18, 8.8, 8.6, 5.4], [27, 10.2, 7.4, 5.4], [6, 15.6, 4.6, 5.6], [30, 15.8, 4.6, 5.4], [6.2, 18.8, 5.2, 2.2], [29.6, 18.8, 5, 2.2]]) t.ell(x, y, rx, ry, R[1], 0, flatB);
      t.ell(18, 21.6, 7.2, 9.6, null);
      softShade(t, 18, 12, 17, 9.4, R);
      // the underside of the arch in shade
      const m = fine((x, y) => t.filled(x, y) && PX.inEll(x, y, 18, 21.6, 8.6, 11).in); t.ell(18, 21.6, 8.6, 11, R[2], 0, m);
    });
    const m = IN(g);
    for (const [x, y] of [[14, 6.6], [22.6, 7.6], [4.6, 13.6], [31.6, 13], [8.6, 19.2]]) g.ell(x, y, 0.55, 0.42, mixHex(R[2], '#8a7ea8', 0.3), 0, m);
    for (const [x, y, c] of [[5.6, 11.6, PINK], [16.4, 6.2, PINK], [20.6, 5.4, GRASS], [27.6, 8.2, FAN], [3.8, 17.2, GRASS], [32.6, 17.4, PINK], [8.6, 7.4, ['#fff8d8', '#ffd87a', '#e8b860']]]) { g.ell(x, y, 1.1, 0.95, c[2], 0, m); g.ell(x, y, 0.7, 0.6, c[1], 0, m); g.dot(x - 0.3, y - 0.3, WHITE); }
    starfish(g, 29.6, 12.6, 2.4, STARP, 0.25);
  } });

  // Giant Clam: a big wavy clam with a blue-purple mantle; f = 1 it opens a bit and shows a shiny pearl
  D.clam = pad(1, 1, { w: 24, h: 17, draw(g, f) {
    const S = CLAM, M = MANT, lift = f ? 2.8 : 0, my = 10.6, ty = my - lift, wave = x => Math.cos((x - 12) * PI / 2.1) * 0.8, folds = [3.6, 7.8, 12, 16.2, 20.4];
    const xs = []; for (let x = 1.4; x <= 22.6; x += 0.4) xs.push(x);
    // the mantle along the zigzag gap (and the pink inside when it opens)
    piece(g, t => {
      t.poly(xs.map(x => [x, ty - 2.1 + wave(x)]).concat(xs.slice().reverse().map(x => [x, my + 0.7 + wave(x)])), M[1]);
      if (lift) t.poly(xs.map(x => [x, ty - 0.9 + wave(x)]).concat(xs.slice().reverse().map(x => [x, my - 0.6 + wave(x)])), '#f2a2c6');
    });
    for (const x of folds) { g.ell(x, ty - 1.15 + wave(x), 0.5, 0.38, '#b8f6f6', 0, IN(g)); if (lift) g.ell(x, my - 0.15 + wave(x), 0.5, 0.36, '#b8f6f6', 0, IN(g)); }
    if (lift) { piece(g, t => soft(t, 12, my - 2.1, 1.95, 1.85, ['#ffffff', '#f6f2ff', '#d6cef0'], { hl: false })); g.ell(11.3, my - 2.9, 0.65, 0.48, WHITE, -0.5); g.dot(12.9, my - 1.4, WHITE); }
    // the bottom shell: a bowl, folds running down from the wavy rim
    piece(g, t => { t.ell(12, my - 1.4, 10.6, 6.2, S[1], 0, fine((x, y) => y >= my + wave(x) - 0.2)); softShade(t, 12, my + 1.4, 10.6, 4.4, S, { hl: false }); });
    for (const x of folds) lineIn(g, [[x, my + wave(x)], [12 + (x - 12) * 0.5, my + 6]], 0.2, S[2]);
    // the top shell: a fluted dome with a bump for every fold (lifted on frame 1)
    piece(g, t => {
      const m = fine((x, y) => y <= ty + wave(x) - 1.8);
      t.ell(12, ty + 0.4, 10.2, 5.8, S[1], 0, m);
      for (const x of folds) t.ell(x, ty + 1.5 - 5.8 * Math.sqrt(Math.max(0, 1 - ((x - 12) / 10.2) ** 2)), 2.3, 2.1, S[1], 0, m);
      softShade(t, 12, ty - 2.6, 10.6, 4.4, S);
    });
    for (const x of [5.7, 9.9, 14.1, 18.3]) lineIn(g, [[x, ty + wave(x) - 1.9], [12 + (x - 12) * 0.35, ty - 9]], 0.2, S[2]);
  } });

  // =====================================================================================================
  // Treasure, wrecks and buildings
  // =====================================================================================================
  // Treasure Chest: wood with gold bands; f = 1 the lid lifts a little with gold coins and a sparkle peeking out
  D.chest = pad(1, 0, { w: 20, h: 17, draw(g, f) {
    const W = WOOD, lift = f ? 2.2 : 0;
    if (f) {
      piece(g, t => box(t, 3.2, 6.4, 16.8, 9.6, 1, '#fff2b8'));
      piece(g, t => { for (const [x, y] of [[5.4, 8.4], [8.2, 7.9], [11, 8.1], [13.8, 8.4], [9.6, 8.8]]) t.ell(x, y, 1.5, 0.95, GOLD[1]); softShade(t, 10, 8.2, 5.5, 1.4, GOLD, { hl: false }); });
      g.dots([[7.6, 7.5], [10.4, 7.7]], WHITE);
    }
    piece(g, t => { box(t, 2.2, 8.6, 17.8, 15.8, 1.2, W[1]); softShade(t, 10, 12.2, 7.8, 3.6, W, { hl: false }); });
    lineIn(g, [[2.6, 12.4], [17.4, 12.4]], 0.18, W[2]);
    for (const x of [5, 15]) lineIn(g, [[x, 8.8], [x, 15.6]], 0.6, GOLD[1]);
    piece(g, t => { t.ell(10, 8.8 - lift, 7.9, 4.4, W[1], 0, fine((x, y) => y <= 8.8 - lift)); box(t, 2, 7.2 - lift, 18, 9.4 - lift, 0.8, W[1]); softShade(t, 10, 7.2 - lift, 7.9, 3.4, W); });
    for (const x of [5, 15]) lineIn(g, [[x, 4 - lift], [x, 9.2 - lift]], 0.6, GOLD[1]);
    lineIn(g, [[2.2, 8.7 - lift], [17.8, 8.7 - lift]], 0.42, GOLD[2]);
    piece(g, t => box(t, 8.5, 9.4, 11.5, 12.6, 0.7, GOLD[1]));
    g.ell(10, 10.6, 0.42, 0.45, '#8a6a4a'); g.poly([[9.7, 10.8], [10.3, 10.8], [10.12, 11.8], [9.88, 11.8]], '#8a6a4a'); g.dot(8.9, 9.8, GOLD[0]);
    if (f) { sparkle(g, 17.4, 4.4, 0.72, '#fff6a0'); sparkle(g, 2.8, 5.2, 0.5, '#fff6a0'); }
  } });

  // Sunken Ship: a cute little wooden wreck, tilted, a broken mast, round portholes, a hole in the hull and a little flag
  D.ship = pad(1, 0, { w: 48, h: 30, draw(g) {
    const W = WOOD, W2 = WOOD2, cx = 24, cy = 18, a = -0.09, R = pts => rot(pts, cx, cy, a), sand = fine((x, y) => y <= 28.8);
    // the flag on the stern pole, the broken mast and the bowsprit (behind the hull)
    piece(g, t => line(t, R([[6.6, 10], [6.6, 2.6]]), 0.32, W2[2]));
    piece(g, t => { t.poly(R([[6.9, 2.4], [11.8, 3.2], [10.4, 4.3], [11.8, 5.4], [6.9, 5.8]]), '#ffa6be'); });
    g.ell(...R([[8.6, 4.1]])[0], 0.6, 0.6, WHITE);
    piece(g, t => { t.poly(R([[21, 12], [21, 4.6], [21.8, 3.4], [22.4, 4.6], [23.2, 2.8], [24, 4.2], [24, 12]]), W2[1]); shadeEdge(t, W2, 0.5, 0.4); });
    lineIn(g, R([[21.4, 7.4], [23.6, 7.4]]), 0.3, W2[2]);
    piece(g, t => line(t, R([[42, 11], [47, 7.4]]), 0.55, W2[1]));
    // the hull: a raised stern, the deck dipping in the middle, the bow rising; the bottom sunk in the sand
    piece(g, t => {
      t.poly(R([[2.6, 8.4], [12, 8.4], [12.8, 11.2], [35.4, 11.8], [41.6, 10.2], [45.4, 8], [45, 12.6], [43, 18], [38.6, 24], [31, 28.6], [18, 30.4], [9.6, 29.6], [5.2, 25.2], [3, 17]]), W[1], sand);
      softShade(t, cx, cy + 1.4, 21, 10, W);
    });
    lineIn(g, R([[3, 9.4], [12.2, 9.4], [13, 12.2], [35.4, 12.8], [41.6, 11.2], [44.8, 9.2]]), 0.42, W[0]);
    for (const y of [16.2, 21.4, 26]) lineIn(g, R([[2, y], [46, y - 0.8]]), 0.2, W[2]);
    for (const [x, y] of [[8, 13.6], [33, 14.6]]) lineIn(g, R([[x, y], [x, y + 2]]), 0.18, W[2]);
    // the broken hole (a fish could swim in)
    piece(g, t => t.poly(R([[34, 19.6], [35.6, 18.6], [36.6, 19.8], [38.6, 19.2], [38.4, 21.4], [37, 22.8], [35.4, 22.2], [33.8, 22.6]]), '#6e5a78'));
    // round portholes: a brass ring, dark glass and a shine
    for (const [x, y] of [[16.4, 15.6], [23.6, 15.9], [30.8, 15.9]]) {
      const [px, py] = R([[x, y]])[0];
      piece(g, t => soft(t, px, py, 2.0, 2.0, BRASS, { hl: false }));
      piece(g, t => t.ell(px, py, 1.15, 1.15, GLASS));
      g.dots([[px - 0.5, py - 0.5], [px, py - 0.5]], WHITE);
    }
    // sea grass growing at the stern, a starfish on the hull
    for (const [bx, h, lean] of [[5, 5.6, -1.4], [6.4, 7, 0.4], [7.8, 4.6, 1.6]]) piece(g, t => { const pts = []; for (let i = 0; i <= 6; i++) { const k = i / 6; pts.push([bx + lean * k * k, 28.6 - k * h]); } PX.stroke(t, pts, 0.75, 0.38, GRASS[1]); shadeEdge(t, GRASS, 0.3, 0.3); });
    starfish(g, 41.4, 16, 1.9, STARP, 0.3);
  } });

  // Sea Castle: a pastel sandcastle with towers, a big arched door fish could swim into, tiny flags
  D.castle = pad(0, 1, { w: 32, h: 34, draw(g) {
    const S = SAND, T = PEACH, DOOR = '#6e6aa8';
    const merl = (t, x0, x1, y, n, col) => { const wm = (x1 - x0) / (2 * n - 1); for (let i = 0; i < n; i++) box(t, x0 + 2 * i * wm, y - 1.8, x0 + (2 * i + 1) * wm, y + 0.6, 0.45, col); };
    const flag = (x, y, col) => { piece(g, t => line(t, [[x, y + 4.4], [x, y]], 0.26, WOOD2[2])); piece(g, t => t.poly([[x + 0.3, y - 0.3], [x + 4.2, y + 0.9], [x + 0.3, y + 2.2]], col)); };
    flag(16, 1.6, '#9ee4f4'); flag(7, 7, '#ffa8c4'); flag(25, 7, '#fff09a');
    // the keep at the back
    piece(g, t => { box(t, 11, 8, 21, 30, 0.8, S[1]); merl(t, 11, 21, 8, 3, S[1]); softShade(t, 16, 16, 5.4, 9, S); });
    // the side towers
    for (const x0 of [3, 21]) piece(g, t => { box(t, x0, 13, x0 + 8, 32.8, 1, T[1]); merl(t, x0, x0 + 8, 13, 3, T[1]); softShade(t, x0 + 4, 21, 4.4, 10, T); });
    for (const x0 of [3, 21]) for (const y of [22.4, 27.6]) lineIn(g, [[x0 + 0.4, y], [x0 + 7.6, y]], 0.2, T[2]);
    lineIn(g, [[11.4, 13.2], [20.6, 13.2]], 0.2, S[2]);
    // the front wall and its battlements
    piece(g, t => { box(t, 8.4, 21, 23.6, 32.8, 0.8, S[1]); merl(t, 8.4, 23.6, 21, 4, S[1]); softShade(t, 16, 26, 7.6, 5.6, S, { hl: false }); });
    // arched windows and the door
    for (const [x, y] of [[7, 16.2], [25, 16.2], [16, 11]]) piece(g, t => box(t, x - 1.1, y, x + 1.1, y + 3.4, 1.1, DOOR));
    piece(g, t => box(t, 12.4, 23.2, 19.6, 33.4, 3.6, DOOR));
    piece(g, t => { box(t, 13.6, 24.6, 18.4, 33.4, 2.4, '#8884c2'); });
    g.ell(16, 32.4, 2.2, 0.7, '#a6a2dc', 0, IN(g));
    starfish(g, 21.6, 27, 1.7, STARP, 0.2);
    piece(g, t => { t.ell(10.2, 31.4, 1.3, 1.1, '#ffe0ec'); }); lineIn(g, [[9.6, 30.8], [10.2, 32.2], [10.8, 30.8]], 0.14, '#f0a8c0');
  } });

  // Diver Helmet: an old brass diving helmet with a big round window, sitting on the sand; f = 1 bubbles rise from the top
  D.diver = pad(0, 1, { w: 20, h: 26, draw(g, f) {
    const B = BRASS;
    piece(g, t => { box(t, 8.8, 7.6, 11.2, 9.8, 0.5, B[1]); t.ell(10, 7.6, 1.7, 0.75, B[0]); });
    piece(g, t => { box(t, 2, 19.8, 18, 24.8, 2.6, B[1]); softShade(t, 10, 22.2, 8, 3, B, { hl: false }); });
    for (const x of [3.9, 7.2, 12.8, 16.1]) { g.ell(x, 23, 0.55, 0.55, B[2], 0, IN(g)); g.dot(x - 0.25, 22.75, B[0]); }
    piece(g, t => soft(t, 10, 15.4, 6.8, 6.6, B));
    piece(g, t => t.ell(10, 21.2, 5.4, 0.9, B[2]));
    // a small side window and the big front window with rivets round it
    piece(g, t => t.ell(4.4, 15.2, 1.5, 2.0, B[0])); g.ell(4.4, 15.2, 0.8, 1.25, GLASS, 0, IN(g)); g.dot(4.2, 14.6, WHITE);
    piece(g, t => soft(t, 11, 15.8, 4.3, 4.3, [B[0], B[0], B[1]], { hl: false }));
    piece(g, t => t.ell(11, 15.8, 2.9, 2.9, GLASS));
    g.ell(10, 14.8, 1.1, 0.85, WHITE, -0.6, IN(g)); g.dots([[12.6, 17.2], [12.1, 17.6]], '#cfeaff');
    for (let i = 0; i < 6; i++) { const q = i * PI / 3 + 0.3; g.dot(11 + Math.cos(q) * 3.6, 15.8 + Math.sin(q) * 3.6, B[2]); }
    if (f) { bubble(g, 10.6, 5.6, 1.25); bubble(g, 12.3, 3.1, 0.95); bubble(g, 9.6, 1.9, 0.6); }
  } });

  // Bubble Volcano: a little rocky volcano bubbler with pastel lava; f = 1 a stream of round bubbles puffs out of the top
  D.volcano = pad(1, 1, { w: 22, h: 26, draw(g, f) {
    const V = VROCK, L = LAVA;
    piece(g, t => {
      t.poly([[1.6, 24.8], [20.4, 24.8], [15.2, 13.8], [6.8, 13.8]], V[1]);
      for (const [x, y, rx, ry] of [[4.6, 22.2, 3.6, 2.8], [17.4, 22.2, 3.6, 2.8], [7.6, 18.6, 2.8, 3.2], [14.4, 18.8, 2.8, 3], [11, 14.2, 4.6, 1.6]]) t.ell(x, y, rx, ry, V[1], 0, fine((xx, yy) => yy <= 24.8));
      softShade(t, 11, 19.6, 9.4, 6.4, V);
    });
    g.ell(11, 14, 3.3, 1.0, '#ffcf8c', 0, IN(g)); g.ell(11, 13.9, 2.1, 0.55, '#fff4c4', 0, IN(g));
    // two soft lava drips running down from the crater
    for (const [pts, r0, r1] of [[[[10.2, 14.4], [9.7, 16.4], [9.9, 18.6]], 1.0, 0.75], [[[12.7, 14.5], [13.2, 16.4]], 0.8, 0.6]]) { lineInT(g, pts, r0, r1, L[1]); const [x, y] = pts[pts.length - 1]; g.ell(x, y + 0.3, r1 + 0.3, r1 + 0.35, L[1], 0, IN(g)); }
    lineInT(g, [[9.9, 15.2], [9.6, 16.8]], 0.3, 0.25, L[0]);
    for (const [x, y] of [[5, 21.6], [16.6, 20.4], [9.6, 22.6]]) g.ell(x, y, 0.6, 0.45, V[2], 0, IN(g));
    if (f) for (const [x, y, r] of [[11, 10.6, 1.6], [12.6, 7.3, 1.35], [10.4, 4.5, 1.1], [12, 2.2, 0.8]]) bubble(g, x, y, r);
    else { bubble(g, 11.2, 11.4, 1.1); bubble(g, 12.4, 8.6, 0.7); }
  } });

  // =====================================================================================================
  // PvZ friends
  // =====================================================================================================
  // Sea-shroom: the PvZ Sea-shroom (art-plants4.js colours): a small glowing sea-green mushroom, a big happy face on its stalk,
  // the stalk flaring to the ground and little tentacle roots curling out (f: the glow pulses)
  D.seashroom = pad(1, 0, { w: 18, h: 18, draw(g, f) {
    const M = ['#d0f6dc', '#86d8ae', '#5cb48e'], A = ['#f8fff4', '#e2f4de', '#b8d4b8'], sx = 9;
    piece(g, t => { for (const d of [-1, 1]) PX.stroke(t, [[sx + d * 2.6, 15.4], [sx + d * 5.2, 16.5], [sx + d * 6.6, 15.5], [sx + d * 6.2, 14.4]], 0.72, 0.5, A[2]); });
    piece(g, t => { t.ell(sx, 15.9, 5.6, 1.1, A[1]); t.ell(sx, 12.8, 4.6, 3.6, A[1]); t.ell(sx, 14, 4.5, 2.6, A[1]); shadeEdge(t, A, 0.7, 0.6); });
    piece(g, t => {
      const by = 10.2, rx = 7.4, ry = 4.8, cx = sx - 0.2;
      t.ell(cx, by - 0.3, rx, ry, M[1], 0, fine((x, y) => y <= by)); t.ell(cx - rx * 0.06, by - ry * 0.5, rx * 0.74, ry * 0.72, M[1]); t.ell(cx, by, rx - 0.9, 1.25, M[1]);
      shadeEdge(t, M, rx * 0.12, ry * 0.2);
      for (const [x, y, r] of [[5.4, 7.6, 1.2], [11.6, 6.6, 1.0], [8.6, 5.4, 0.75], [13.6, 8.6, 0.7]]) t.ell(x, y, r, r * 0.86, '#f2fff6', 0, IN(t));
      shine(t, cx - rx * 0.5, by - ry * 0.62, rx * 0.16, ry * 0.12, '#ffffff');
    });
    face(g, sx + 0.4, 13.4, 5.2, { mouth: 'smile', mw: 2 });
    // the soft glow round the cap (see-through, so the outline skips it)
    for (const [rx, ry, al] of [[9.2, 6.6, 0.16], [8.4, 5.8, 0.2]]) g.ell(sx - 0.2, 8.6, rx + f * 0.3, ry + f * 0.3, `rgba(170,255,215,${al})`, 0, fine((x, y) => !g.fget(Math.floor(x * g.k), Math.floor(y * g.k)) && y < 11.4));
  } });

  // Tangle Kelp: the PvZ Tangle Kelp (art-plants2.js look): a lumpy olive kelp clump with curly fronds, kelp strands draping like
  // hair, big glossy red eyes and blush, no mouth (as in the game) (f sways the fronds)
  function frond(t, x0, y0, h, amp, ph, w, col, curl, lean) {
    const pts = [];
    for (let i = 0; i <= 10; i++) { const k = i / 10; pts.push([x0 + (lean || 0) * k * k + Math.sin(k * 3.6 + ph) * amp * k, y0 - k * h]); }
    if (curl) {
      const [ex, ey] = pts[10], [px, py] = pts[9], dx = ex - px, dy = ey - py, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
      const rc = 1.3, cxp = ex - uy * rc * curl, cyp = ey + ux * rc * curl; let a = Math.atan2(ey - cyp, ex - cxp);
      for (let i = 1; i <= 3; i++) { a += 0.8 * curl; pts.push([cxp + Math.cos(a) * rc, cyp + Math.sin(a) * rc]); }
    }
    const n = pts.length - 1;
    for (let i = 0; i < n; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], seg = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.3));
      for (let s = 0; s <= seg; s++) { const k = (i + s / seg) / n, r = w * (0.55 + 0.55 * Math.sin(Math.min(1, k) * PI * 0.72)); t.ell(ax + (bx - ax) * s / seg, ay + (by - ay) * s / seg, Math.max(0.55, r), Math.max(0.55, r), col); }
    }
  }
  D.tanglekelp = pad(1, 0, { w: 22, h: 22, draw(g, f) {
    const M = ['#e2e8b4', '#b8c584', '#98a868'], LF = ['#cfe2ac', '#94b878', '#76985e'], LF2 = ['#dcebbd', '#a6c68a', '#86a86c'], sw = f ? 0.8 : 0;
    const r = 6.2, cx = 11, cy = 20.8 - r * 0.86;
    [[8.2, 12.2, 1.3, 0, -4], [10.2, 14.4, 1.4, 1.8, -1.4], [12.2, 14.2, 1.4, 3.4, 1.6], [14, 12, 1.3, 5, 4]].forEach(([x, h, amp, ph, lean], i) => piece(g, t => { frond(t, x, 20.2, h, amp, ph + sw * 1.4, 1.15, (i % 2 ? LF : LF2)[1], lean <= 0 ? 0.7 : -0.7, lean); shadeEdge(t, i % 2 ? LF : LF2, 0.45, 0.55); }));
    piece(g, t => {
      t.ell(cx, cy, r, r * 0.86, M[1]); t.ell(cx - r * 0.4, cy + r * 0.2, r * 0.66, r * 0.66, M[1]); t.ell(cx + r * 0.42, cy + r * 0.22, r * 0.62, r * 0.62, M[1]);
      shadeEdge(t, M, 0.9, 0.9); shine(t, cx - r * 0.3, cy - r * 0.62, r * 0.2, r * 0.1, M[0]);
    });
    for (const d of [-1, 1]) piece(g, t => {
      const pts = [[cx + d * r * 0.15, cy - r * 0.84], [cx + d * r * 0.72, cy - r * 0.55 + sw * 0.2], [cx + d * (r * 0.98 + sw * 0.3), cy + r * 0.1], [cx + d * (r * 0.92 - sw * 0.2), cy + r * 0.6], [cx + d * r * 1.1, 20.6]];
      for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k <= 8; k++) { const u = (i + k / 8) / (pts.length - 1), w = 0.95 + Math.sin(u * PI) * 0.5; t.ell(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k / 8, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k / 8, w, w, LF[1]); }
      shadeEdge(t, LF, 0.5, 0.6);
    });
    face(g, cx + 0.5, cy + r * 0.1, r, { eye: { col: '#e0485e' } });
  } });

  // Snorkel Zombie Statue: a cute mossy stone statue of the PvZ Snorkel Zombie (dive mask, snorkel), smiling, on a little plinth
  D.snorkelstatue = { w: 18, h: 26, draw(g) {
    const S = STONE, MO = MOSS, hx = 9.4, hy = 9.8, hr = 5.6;
    piece(g, t => { box(t, 3, 20.8, 15, 25, 0.8, S[1]); box(t, 2, 19.8, 16, 21.8, 0.8, S[1]); softShade(t, 9, 22.2, 6.4, 2.6, S, { hl: false }); });
    lineIn(g, [[2.4, 21.8], [15.6, 21.8]], 0.2, S[2]);
    // the snorkel up the back of the head
    piece(g, t => { line(t, [[hx - 2.4, hy + 3.6], [hx - 5.8, hy + 1.2], [hx - 6.2, hy - 3], [hx - 5.2, hy - 6.4]], 0.85, S[1]); t.ell(hx - 5, hy - 6.9, 1.15, 0.8, S[0]); });
    // a little egg body and one arm reaching forward
    piece(g, t => soft(t, 9, 16.8, 3.8, 3.3, S));
    piece(g, t => { line(t, [[10.8, 15.4], [14.6, 14.2]], 0.95, S[1]); t.ell(15, 14.1, 1.2, 1.1, S[1]); shadeEdge(t, S, 0.3, 0.3); });
    // the big head, the mask strap and the dive mask
    piece(g, t => soft(t, hx, hy, hr, hr * 0.95, S));
    lineIn(g, [[hx - 5.8, hy - 0.8], [hx - 4, hy - 0.9]], 0.55, S[2]);
    piece(g, t => box(t, hx - 4.4, hy - 3.6, hx + 5, hy + 2.2, 2, '#c4bed4'));
    piece(g, t => box(t, hx - 3.4, hy - 2.6, hx + 4, hy + 1.2, 1.5, '#c8e2f4'));
    if (AR().chibiEyes) AR().chibiEyes(g, hx + 0.3, hy - 0.7, { white: true, sp: 3.7, w: 2.1, h: 2.4, look: [0.45, 0.3], col: '#5e5870' });
    g.dots([[hx - 2.7, hy - 2], [hx - 2.2, hy - 2], [hx - 2.7, hy - 1.5]], WHITE);
    if (AR().chibiMouth) AR().chibiMouth(g, hx + 0.6, hy + 3.6, 'smile', 2.4);
    if (AR().blush) AR().blush(g, hx + 0.3, hy + 3.1, { sp: 7, w: 0.8, h: 0.45, col: '#f2d0dc' });
    // moss on the head, the shoulder and the plinth
    const mz = (cx, cy, rx, ry, y0) => g.ell(cx, cy, rx, ry, MO[1], 0, fine((x, y) => g.filled(x, y) && y < y0 + Math.sin(x * 2.2) * 0.45));
    mz(hx - 0.6, hy - 4.2, 4.4, 2.6, hy - 3.9); mz(4, 21.6, 3.2, 2.6, 20.8); mz(14.4, 22, 2.2, 2.6, 20.6);
    g.ell(hx - 2.2, hy - 4.6, 1.0, 0.4, MO[0], -0.3, IN(g));
    piece(g, t => { for (const [x, y] of [[5.2, 15.6], [12.6, 18.6]]) t.ell(x, y, 0.9, 0.7, MO[1]); });
  } };

  // Crazy Dave's Pot: his metal saucepan (the one he wears as a hat) upside down on the sand, the handle sticking out and a little
  // starfish sitting on top
  D.davepot = pad(1, 1, { w: 26, h: 17, draw(g) {
    const M = STEEL;
    // the long handle sticking out at the rim
    piece(g, t => { PX.stroke(t, [[16, 13.8], [23.4, 11.6]], 1.05, 0.95, M[1]); t.ell(23.4, 11.6, 1.35, 1.3, M[1]); t.ell(23.5, 11.6, 0.5, 0.5, null); shadeEdge(t, M, 0.35, 0.45); });
    // the pot upside down: a drum with its base on top, a rolled rim at the bottom
    piece(g, t => { box(t, 5.2, 5.4, 16.8, 15, 1.8, M[1]); softShade(t, 11, 9.6, 5.8, 5.6, M, { hl: false }); });
    piece(g, t => { box(t, 4, 13.6, 18, 16, 1.1, M[1]); softShade(t, 11, 14.6, 7, 1.6, M, { hl: false }); });
    lineIn(g, [[7.2, 7.6], [7.2, 12.6]], 0.55, WHITE); lineIn(g, [[8.8, 7.8], [8.8, 9.4]], 0.3, WHITE);
    lineIn(g, [[5.6, 7.2], [16.4, 7.2]], 0.18, M[2]);
    lineIn(g, [[4.6, 14.3], [17.4, 14.3]], 0.2, WHITE);
    // a little starfish sitting on top, smiling
    starfish(g, 11.2, 4.4, 3.0, STARP, 0.15);
    if (AR().chibiEyes) AR().chibiEyes(g, 11.4, 4.6, { sp: 1.8, w: 0.95, h: 1.25 });
    if (AR().chibiMouth) AR().chibiMouth(g, 11.5, 5.8, 'smile', 0.9);
  } });

  // =====================================================================================================
  // Legendaries
  // =====================================================================================================
  // Golden Treasure: an open chest overflowing with gold coins and gems, golden twinkles (f: the twinkles swap places)
  D.goldtreasure = pad(1, 1, { w: 28, h: 24, draw(g, f) {
    const W = WOOD, GD = GOLD;
    // the open lid behind, its rosy lining showing
    piece(g, t => { box(t, 5, 4.2, 23, 12.4, 2.4, W[1]); softShade(t, 14, 8, 9, 3.6, W, { hl: false }); });
    piece(g, t => box(t, 6.8, 5.8, 21.2, 12.4, 1.6, '#f4a2bc'));
    for (const x of [8.4, 19.6]) lineIn(g, [[x, 4.4], [x, 5.8]], 0.55, GD[1]);
    // the heap of coins, gems on top
    piece(g, t => { for (const [x, y, rx, ry] of [[14, 12.6, 8.8, 3.4], [9, 12.4, 4.4, 2.8], [19, 12.2, 4.6, 3], [14, 10.2, 5, 2.8]]) t.ell(x, y, rx, ry, GD[1]); softShade(t, 14, 11.6, 9.4, 3.6, GD); });
    for (const [x, y] of [[8.4, 12.2], [12.6, 10.6], [17.6, 11.4], [20.8, 12.8], [10.6, 13.6], [15.4, 13.4]]) { const pts = []; for (let q = 0; q <= PI * 2 + 0.1; q += 0.4) pts.push([x + Math.cos(q) * 1.15, y + Math.sin(q) * 0.7]); lineIn(g, pts, 0.16, GD[2]); }
    gem(g, 10.4, 9.8, 1.6, ['#ffe0ec', '#ff9cc0']); gem(g, 17.8, 9.2, 1.7, ['#e2fbff', '#8ee0f2']); gem(g, 14, 7.4, 1.5, ['#f4e8ff', '#c4a2f4']);
    // the chest
    piece(g, t => { box(t, 4.6, 13.4, 23.4, 22.8, 1.4, W[1]); softShade(t, 14, 18, 9.4, 4.6, W); });
    lineIn(g, [[5, 18.4], [23, 18.4]], 0.2, W[2]);
    for (const x of [8, 20]) lineIn(g, [[x, 13.6], [x, 22.6]], 0.65, GD[1]);
    lineIn(g, [[4.8, 14.2], [23.2, 14.2]], 0.5, GD[1]);
    piece(g, t => box(t, 12.3, 15, 15.7, 18.6, 0.8, GD[1]));
    g.ell(14, 16.3, 0.45, 0.5, '#8a6a4a'); g.poly([[13.68, 16.5], [14.32, 16.5], [14.12, 17.7], [13.88, 17.7]], '#8a6a4a'); g.dot(12.8, 15.4, GD[0]);
    // coins spilled on the sand
    coin(g, 3, 21.8, 1.5, GD); coin(g, 25.2, 22, 1.4, GD); coin(g, 24.2, 20.2, 1.2, GD);
    for (const [x, y, s] of f ? [[3.2, 6.4, 0.85], [25, 4.2, 0.7], [24.6, 14.6, 0.55], [2.6, 15.2, 0.5]] : [[2.8, 9.6, 0.7], [24.4, 7.4, 0.85], [6.4, 2.2, 0.55], [25.2, 15.8, 0.45]]) sparkle(g, x, y, s, '#ffe680');
  } });

  // Crystal Grotto: a small rock cave with glowing pastel crystals (lilac, aqua, pink) and sparkles (f: the glow and sparkles pulse)
  D.crystalgrotto = pad(1, 1, { w: 30, h: 26, draw(g, f) {
    const R = ['#f2eef8', '#cfc6e0', '#aa9ec4'];
    const LIL = ['#fbf4ff', '#dcc6fa', '#b89ce8'], AQ = ['#f0feff', '#aeeef6', '#7ccee2'], PK = ['#fff2f8', '#ffc2dc', '#f09cc0'];
    // crystals growing out of the rock (behind it)
    crystal(g, 11.6, 11.6, 1.7, 7.4, -0.42, LIL); crystal(g, 18.6, 11.2, 1.6, 7.2, 0.4, LIL); crystal(g, 15, 10.6, 2.2, 9.2, -0.02, LIL);
    crystal(g, 5.4, 16.8, 1.5, 5.6, -0.62, PK); crystal(g, 7.6, 14.6, 1.7, 6.6, -0.3, PK);
    crystal(g, 24.2, 15, 1.7, 7, 0.4, AQ); crystal(g, 25.8, 18.4, 1.3, 4.6, 0.7, AQ);
    // the rock and the cave mouth
    piece(g, t => {
      const flatB = fine((x, y) => y <= 24.8);
      for (const [x, y, rx, ry] of [[15, 17.6, 12.4, 7.8], [6.8, 19.6, 5.6, 5.4], [23.4, 19.4, 5.6, 5.6], [15, 13.4, 7, 4]]) t.ell(x, y, rx, ry, R[1], 0, flatB);
      softShade(t, 15, 17.4, 13, 7.4, R);
    });
    piece(g, t => { t.ell(14.6, 25.4, 5.6, 8.2, '#6e5ea2', 0, fine((x, y) => y <= 24.8)); t.ell(14.6, 25.4, 3.6, 5.6, '#8a78c0', 0, fine((x, y) => y <= 24.8)); });
    // a glowing crystal inside the cave and two little ones in front on the sand
    crystal(g, 14.6, 24.6, 1.5, 5.4, 0.1, AQ); crystal(g, 3.4, 24.6, 1.1, 3.4, -0.3, LIL); crystal(g, 25.8, 24.6, 1.1, 3.6, 0.3, PK);
    const m = IN(g);
    for (const [x, y] of [[8.4, 18.4], [21.6, 20.2], [18.6, 15.4], [5, 22.4]]) g.ell(x, y, 0.55, 0.42, R[2], 0, m);
    // a soft see-through glow round the crystals and the sparkles
    for (const [x, y, r, c] of [[15, 5.6, 4.6, '220,200,255'], [6, 12.6, 3.4, '255,200,230'], [25.6, 12.4, 3.4, '180,245,255'], [14.6, 20.6, 3, '180,245,255']]) g.ell(x, y, r + f * 0.4, r + f * 0.4, `rgba(${c},0.22)`, 0, fine((xx, yy) => !g.fget(Math.floor(xx * g.k), Math.floor(yy * g.k))));
    for (const [x, y, s, c] of f ? [[3.2, 6.8, 0.8, '#f4e8ff'], [27, 5.6, 0.65, '#d8fbff'], [21.4, 2.8, 0.5, '#ffe0f0']] : [[26.4, 8.6, 0.8, '#d8fbff'], [3.6, 9.4, 0.6, '#ffe0f0'], [9.2, 3.2, 0.55, '#f4e8ff']]) sparkle(g, x, y, s, c);
  } });
})();
