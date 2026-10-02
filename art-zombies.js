// art-zombies.js — PVZ Garden zombies and Zombosses in the TRUE chibi style (docs/pvz-art-guide.md §1, docs/chibi-reference.js).
// Loaded after art-core.js. art-zombies2.js (the newer zombies and Zombosses) reuses the kit exported here as PX.ZKIT.
// PX.ZOMBIE_ART[kind] = function (g, P, L): a 32x32 hi-res PX.Grid, FACING RIGHT (screens flip it), feet on rows 29-31.
//   A chibi zombie is a BIG head (about 60% of the height, each kind its own head shape: wide, egg, boxy, pear, peanut...) with
//   big white googly eyes, a pink sticky note on the forehead and a few hair strands, on a tiny egg body (brown coat, white shirt,
//   red tie), stubby legs and shoes, and one short arm reaching forward. Accessories are big and chunky and sit on the big head.
//   P: walk + frame (0|1) = a shamble (legs stride / pass, the body bobs, the arm swings); arms ('up' | 'out' | 'paddle' | 'hold' |
//   'point'); eyes (happy | closed | blink | sleepy | sad | brave | mad); mouth ('open' | 'o' | 'flat' | 'grin' | 'smile' | 'frown').
//   Skins (gold, crystal, galaxy, zombie, rainbow) recolour the finished sprite in the core, and the core adds the bold outer edge.
// PX.BOSS_ART[id] = { w: 48, h: 48, draw(g, f) }: big round toy-like Zombosses facing right, f = animation frame 0|1.
(function () {
  'use strict';
  if (!window.PX) return;
  const { Grid, INK, stroke } = PX;
  const A = PX.art, mixHex = PX.mixHex;
  const piece = (g, f) => PX.piece(g, f);
  const W = '#ffffff';
  const flat = R => [R[1], R[1], R[2]];
  // a pastel ramp [light, mid, shade] from one mid colour
  const R3 = (c, k) => [mixHex(c, '#ffffff', 0.42), c, mixHex(c, '#4a3646', k == null ? 0.2 : k)];
  const lerp2 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

  // ---------------- soft shapes ----------------
  // blob(t, shapes, R, o): one organic shape built from overlapping ellipses ([cx, cy, rx, ry, rot?]) and polys ({ p: pts }),
  // filled flat R[1], then the softBody look for the whole union: a crescent of R[2] along the lower-right edge (a pixel is shaded
  // when the point a little down-right of it is outside the shape) and a small R[0] highlight up-left. o.d = [dx, dy] crescent
  // depth in art px (default from the size), o.hl = false | [x, y, rx, ry] highlight, o.mask(x, y) clips the fill.
  function blob(t, shapes, R, o) {
    o = o || {};
    const k = t.k || 1, col = R[1], m = o.mask;
    for (const s of shapes) {
      if (s.p) { const u = new Grid(t.w, t.h, k); u.poly(s.p, col); for (let i = 0; i < u.a.length; i++) if (u.a[i] && (!m || m((i % t.fw) / k, Math.floor(i / t.fw) / k))) t.a[i] = col; }
      else t.ell(s[0], s[1], s[2], s[3], col, s[4] || 0, m ? Object.assign((x, y) => m(x, y), { fine: true }) : undefined);
    }
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; const mine = [];
    for (let fy = 0; fy < t.fh; fy++) for (let fx = 0; fx < t.fw; fx++) if (t.a[fy * t.fw + fx] === col) { mine.push(fx, fy); if (fx < x0) x0 = fx; if (fx > x1) x1 = fx; if (fy < y0) y0 = fy; if (fy > y1) y1 = fy; }
    if (!mine.length) return;
    const w = (x1 - x0 + 1) / k, h = (y1 - y0 + 1) / k;
    const d = o.d || [Math.max(0.5, Math.min(2, w * 0.13)), Math.max(0.5, Math.min(2.2, h * 0.15))];
    const ox = Math.max(1, Math.round(d[0] * k)), oy = Math.max(1, Math.round(d[1] * k));
    const sh = [];
    for (let i = 0; i < mine.length; i += 2) { const fx = mine[i], fy = mine[i + 1]; if (!t.ffilled(fx + ox, fy + oy)) sh.push(fx, fy); }
    for (let i = 0; i < sh.length; i += 2) t.fset(sh[i], sh[i + 1], R[2]);
    if (o.hl !== false) {
      const hl = o.hl || [x0 / k + w * 0.3, y0 / k + h * 0.22, Math.max(0.6, w * 0.12), Math.max(0.45, h * 0.075)];
      const on = (x, y) => t.get(x, y) === col; on.fine = true;
      t.ell(hl[0], hl[1], hl[2], hl[3], R[0], hl[4] == null ? -0.55 : hl[4], on);
    }
  }
  // paint fine pixels of the colours in `from` (a list) inside a test, with c
  const recol = (t, from, test, c) => { const k = t.k || 1; for (let fy = 0; fy < t.fh; fy++) for (let fx = 0; fx < t.fw; fx++) { const v = t.a[fy * t.fw + fx]; if (v && from.includes(v) && test(fx / k, fy / k)) t.a[fy * t.fw + fx] = typeof c === 'function' ? c(fx / k, fy / k, v) : c; } };
  // a thin line (fine-pixel thick) for seams, stitches, strings, mouths
  const thin = (g, pts, c, r) => { for (let i = 1; i < pts.length; i++) stroke(g, [pts[i - 1], pts[i]], r || 0.26, r || 0.26, c); };
  const rot = (pts, cx, cy, a) => { const c = Math.cos(a), s = Math.sin(a); return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]); };
  // rounded rectangle as a poly (r = corner radius)
  function rrect(x, y, w, h, r) {
    const p = [], n = 4;
    const c = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
    for (const [cx, cy, a0] of c) for (let i = 0; i <= n; i++) { const a = a0 + (Math.PI / 2) * i / n; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    return p;
  }

  // ---------------- palette (pastel) ----------------
  const SKIN = ['#dcebc8', '#b0cfa6', '#9fbc8a'];      // soft grey-green (deep enough that the gold skin keeps a pale-yellow head)
  const COAT = ['#d2a982', '#ad835e', '#8b6644'];
  const PANTS = ['#a4aacc', '#8189b0', '#646c94'];
  const SHOE = ['#7e6a6e', '#6e5a5e', '#4e3e42'];
  const SHIRT = '#fbf6ee', SHIRT_D = '#e4dccc', TIE = ['#ff9a9a', '#f07a7a', '#cc5a62'];
  const NOTE = '#ffc8d8', NOTE_D = '#f4a3b8', NOTE_L = '#e890b0';
  const HAIR = INK;
  const CONE = R3('#ffa760'), METAL = ['#f4f7fb', '#c8d2de', '#9aa6b8'], RED = R3('#f27878'), GOLD = R3('#ffd466'), WOOD = R3('#c99a6a');
  const BLUE = R3('#8cb4f0'), PURP = R3('#b896e8'), CREAM = R3('#f6ecd2'), PINK = R3('#ffa8c8'), TEAL = R3('#7cd4c8'), DKSTEEL = R3('#8a94a8');

  // ---------------- head shapes (each zombie gets its own silhouette) ----------------
  // f(cx, cy, rx, ry) -> shapes, where cx, cy, rx, ry is the head's bounding oval (so faces and hats place the same way).
  const HEADS = {
    round: (x, y, a, b) => [[x, y, a, b]],
    // the classic: fuller at the back, with a softly flattened chin that leans forward a touch
    peanut: (x, y, a, b) => [[x - a * 0.04, y - b * 0.05, a * 0.97, b * 0.95], [x + a * 0.2, y + b * 0.34, a * 0.72, b * 0.62]],
    // a touch wider than tall, the crown sitting back
    wide: (x, y, a, b) => [[x, y + b * 0.04, a, b * 0.95], [x - a * 0.12, y - b * 0.1, a * 0.86, b * 0.88]],
    // a gentle egg, a little narrower at the top
    egg: (x, y, a, b) => [[x, y + b * 0.1, a * 0.98, b * 0.9], [x - a * 0.03, y - b * 0.12, a * 0.86, b * 0.88]],
    // a soft rounded box
    box: (x, y, a, b) => [{ p: rrect(x - a, y - b, a * 2, b * 2, Math.min(a, b) * 0.66) }],
    // a soft pear: a slightly fuller jowly bottom
    pear: (x, y, a, b) => [[x, y + b * 0.16, a, b * 0.84], [x - a * 0.04, y - b * 0.14, a * 0.84, b * 0.86]],
    // a slight lean back
    bean: (x, y, a, b) => [[x - a * 0.08, y - b * 0.06, a * 0.92, b * 0.94, -0.12], [x + a * 0.08, y + b * 0.1, a * 0.92, b * 0.9, -0.12]],
  };

  // ---------------- the sticky note, hair, face ----------------
  // a pink sticky note (w x h art px) centred on cx, cy, tilted by a; a darker folded corner and one scribble line
  function note(g, cx, cy, S, a) {
    S = S || 1; a = a == null ? -0.2 : a;
    const w = 4.3 * S, h = 3.5 * S, P = rot([[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2 - 1.1 * S], [cx + w / 2 - 1.1 * S, cy + h / 2], [cx - w / 2, cy + h / 2]], cx, cy, a);
    piece(g, t => { t.poly(P, NOTE); t.poly([P[2], P[3], rot([[cx + w / 2 - 1.1 * S, cy + h / 2 - 1.1 * S]], cx, cy, a)[0]], NOTE_D); });
    const l = rot([[cx - w * 0.3, cy - h * 0.12], [cx + w * 0.3, cy - h * 0.12]], cx, cy, a), l2 = rot([[cx - w * 0.3, cy + h * 0.18], [cx + w * 0.08, cy + h * 0.18]], cx, cy, a);
    thin(g, l, NOTE_L, 0.24); thin(g, l2, NOTE_L, 0.24);
    return P;
  }
  function hairStrands(g, G) {
    const { hx, top, S } = G;
    for (const [a, b] of [[[-3.4, 0.9], [-4.4, -0.9]], [[-1, 0.5], [-0.8, -1.3]], [[1.2, 0.8], [2.4, -0.6]]]) {
      const p0 = [hx + a[0] * S, top + a[1] * S], p1 = [hx + b[0] * S, top + b[1] * S], mid = [(p0[0] + p1[0]) / 2 + 0.3 * S, (p0[1] + p1[1]) / 2];
      thin(g, [p0, mid, p1], HAIR, 0.3);
    }
  }
  function zMouth(g, G, P, o) {
    o = o || {};
    const { mx, my, S } = G, w = (o.w || 2.6) * S, m = P.mouth;
    if (m === 'grin') { A.chibiMouth(g, mx, my, 'grin', w * 1.05); return; }
    if (m === 'o') { A.chibiMouth(g, mx, my, 'o', w); return; }
    if (m === 'smile' || m === 'frown') { A.chibiMouth(g, mx, my, m, w); return; }
    if (m === 'open') { A.chibiMouth(g, mx, my, 'open', w * 1.08); g.dots([[mx - 0.2, my - 0.1], [mx + 0.3, my - 0.1], [mx - 0.2, my + 0.4]], o.tooth || W); return; }
    // default: a wobbly zombie line with one tooth
    thin(g, [[mx - w / 2, my + 0.1], [mx - w / 6, my - 0.15], [mx + w / 6, my + 0.15], [mx + w / 2, my - 0.1]], INK, 0.34);
    g.dots([[mx + 0.1, my + 0.4], [mx + 0.6, my + 0.4], [mx + 0.1, my + 0.85]], o.tooth || W);
  }
  function zEyes(g, G, P, o) {
    o = o || {};
    const S = G.S;
    A.chibiEyes(g, G.ex, G.ey, Object.assign({ white: true, sp: 6.6 * S, w: 5.2 * S, h: 5.6 * S, look: [0.55, 0.25], mood: P.eyes }, o));
  }
  // a little stitched seam (fine pixels) from a to b
  function stitch(g, a, b, c) {
    c = c || SKIN[2]; thin(g, [a, b], c, 0.22);
    const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.1)), d = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(d[0], d[1]) || 1, nx = -d[1] / L * 0.55, ny = d[0] / L * 0.55;
    for (let i = 1; i < n; i++) { const p = lerp2(a, b, i / n); thin(g, [[p[0] - nx, p[1] - ny], [p[0] + nx, p[1] + ny]], c, 0.2); }
  }

  // ---------------- the shared chibi zombie ----------------
  // o: s (whole-zombie scale about the feet), hs (head scale), dx (shift), head (shape name or fn(t, G)), skin/coat/pants/shoe ramps,
  //    body ('egg' | 'pear' | 'tall' | fn(t, G)), shirt (false = none), tie (ramp | false), sleeve (coat ramp for the arms | 'bare'),
  //    arms (force a pose), holdArms (default pose 'hold'), legs ('none' | 'short'), note ('forehead' | 'side' | false | [dx, dy, a]),
  //    hair (false), face (false = the kind draws its own), eyeOpt (chibiEyes options), mouthOpt, stitch (false), buttons (false),
  //    layer hooks (g, G): back, belowBody, mid0 (after the body), hat (after the head), mid (before the front arm), front, post.
  // Returns G: geometry (hx, hy, hrx, hry, top, ex, ey, mx, my, S, hand, hand2, X, Y, U, bob, f, walk, pose ...).
  function zombie(g, P, o) {
    P = P || {}; o = o || {};
    const s = o.s || 1, hs = o.hs || 1, S = s * hs, dx = o.dx || 0;
    const walk = !!P.walk, f = walk && P.frame ? 1 : 0, bob = walk && f ? -1 : 0;
    const X = x => 16 + (x - 16) * s + dx, Y = y => 31 - (31 - y) * s, U = y => Y(y) + bob;
    const SK = o.skin || SKIN, CO = o.coat || COAT, PA = o.pants || PANTS, SH = o.shoe || SHOE;
    const hrx = 10 * S * (o.hw || 1), hry = 9.2 * S * (o.hh || 1);
    const hx = X(16.6) + (o.hdx || 0) * s, hy = U(20.6) - hry + (o.hdy || 0) * s;
    const G = { P, o, s, hs, S, X, Y, U, SK, CO, PA, SH, hx, hy, hrx, hry, top: hy - hry, bob, f, walk };
    G.ex = hx + 2.2 * S + (o.edx || 0); G.ey = hy + 0.5 * S + (o.edy || 0);
    G.mx = hx + 3.9 * S + (o.mdx || 0); G.my = hy + 5.9 * S + (o.mdy || 0);
    // ---- pose ----
    let A0 = o.arms || P.arms; if (!A0 && o.holdArms) A0 = 'hold'; if (!A0 && o.defArms && !walk) A0 = o.defArms;
    const sw = walk ? (f ? -1 : 0.6) : 0; // the arm swings with the walk
    const FS = [18.4, 21.6], BS = [12.6, 22.2];
    let fa, ba, backHand = true;
    switch (A0) {
      case 'up': fa = [FS, [24.4, 15.8]]; ba = [BS, [8, 16]]; break;
      case 'out': fa = [FS, [24.6, 24.8]]; ba = [BS, [7.2, 25]]; break;
      case 'paddle': if (P.frame) { fa = [FS, [24.8, 25]]; ba = [BS, [9.4, 16.4]]; } else { fa = [FS, [24.4, 15.6]]; ba = [BS, [7.4, 25.4]]; } break;
      case 'hold': fa = [FS, [23.6, 22.6 + sw * 0.4]]; ba = [[13.6, 21.8], [22.2, 20.8 + sw * 0.4]]; break;
      case 'point': fa = [FS, [24.8, 14.6]]; ba = [BS, [8.6, 25.8]]; break;
      default: fa = [FS, [25, 21.2 + sw]]; ba = [BS, [10.2 - sw * 0.3, 25.2]]; backHand = false;
    }
    G.pose = A0 || 'fwd';
    const T = ([x, y]) => [X(x), U(y)];
    G.fa = fa.map(T); G.ba = ba.map(T);
    const handOf = p => { const [a, c] = p, d = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1; return [c[0] + (c[0] - a[0]) / d * 1.1 * s, c[1] + (c[1] - a[1]) / d * 1.1 * s]; };
    G.hand = handOf(G.fa); G.hand2 = handOf(G.ba);
    const armR = (o.armR || 1.45) * s, handR = (o.handR || 1.7) * s;
    const drawArm = (t, p, R, hand) => {
      if (o.sleeve === 'bare') stroke(t, p, armR * 0.85, armR * 0.8, (o.armSkin || SK)[1]);
      else stroke(t, p, armR, armR * 0.93, R[1]);
      if (hand) { const h = handOf(p); t.ell(h[0], h[1], handR, handR * 0.94, flat(o.handSkin || SK)); }
    };
    G.drawArm = drawArm;
    // ---- legs ----
    const st = walk ? (f ? -1 : 2) : 0, lift = walk && f ? 0.8 : 0;
    const legs = t => {
      const L = o.legs === 'short' ? 1.6 : 2.4;
      t.ell(X(12.6 - st), Y(28.4), 1.9 * s, L * s, [PA[1], mixHex(PA[1], '#4a3646', 0.1), PA[2]]);
      t.ell(X(17.8 + st), Y(28.4) - lift, 1.9 * s, L * s, flat(PA));
    };
    const shoes = t => {
      t.ell(X(12.4 - st * 1.2), Y(30.3), 2.4 * s, 1.2 * s, flat(SH));
      t.ell(X(18.6 + st * 1.2), Y(30.3) - lift, 2.4 * s, 1.2 * s, flat(SH));
    };
    G.legsFn = legs; G.shoesFn = shoes;
    // ---- body ----
    const body = t => {
      const bx = X(15.2), by = U(24.1);
      if (typeof o.body === 'function') return o.body(t, G);
      if (o.body === 'pear') blob(t, [[bx, by + 0.6 * s, 6.4 * s, 4.4 * s], [bx - 0.2 * s, by - 1.4 * s, 4.4 * s, 3.4 * s]], CO, { hl: false });
      else if (o.body === 'tall') blob(t, [[bx, by - 0.6 * s, 4.8 * s, 5.4 * s]], CO, { hl: false });
      else blob(t, [[bx, by, 5.6 * s, 4.6 * s]], CO, { hl: false });
    };
    const shirt = t => {
      if (o.shirt === false) return;
      t.poly([[X(13.2), U(19.6)], [X(17.4), U(19.6)], [X(15.4), U(24.6)]], o.shirt || SHIRT);
      if (o.tie !== false) { const TI = o.tie || TIE; t.poly([[X(15.4), U(20.4)], [X(16.3), U(22.4)], [X(15.4), U(25.2)], [X(14.5), U(22.4)]], TI[1]); t.ell(X(15.4), U(20.6), 0.75 * s, 0.6 * s, TI[2]); }
    };
    G.body = body; G.shirtFn = shirt;
    // ---- head ----
    const headShapes = (typeof o.head === 'function') ? null : (HEADS[o.head || 'peanut'] || HEADS.peanut)(hx, hy, hrx, hry);
    const head = t => { if (headShapes) blob(t, headShapes, SK, { d: [hrx * 0.12, hry * 0.14], hl: [hx - hrx * 0.5, hy - hry * 0.52, Math.max(0.8, 1.6 * S), Math.max(0.6, 0.9 * S)] }); else o.head(t, G); };
    G.headShapes = headShapes;

    // ---- draw, back to front ----
    if (o.back) o.back(g, G);
    if (!o.noBackArm) piece(g, t => drawArm(t, G.ba, o.sleeve && o.sleeve !== 'bare' ? R3(mixHex(o.sleeve[1], '#4a3646', 0.15)) : [CO[2], CO[2], CO[2]], backHand));
    if (o.legs !== 'none') { piece(g, legs); piece(g, shoes); }
    if (o.belowBody) o.belowBody(g, G);
    piece(g, t => { body(t); });
    if (!o.torso) piece(g, shirt); else o.torso(g, G);
    if (o.buttons !== false && !o.torso && o.shirt !== false) g.dots([[X(12.7), U(23.6)], [X(12.9), U(25.6)]], CO[2]);
    if (o.mid0) o.mid0(g, G);
    piece(g, head);
    if (o.stitch && headShapes) stitch(g, [hx - hrx * 0.78, hy + hry * 0.12], [hx - hrx * 0.5, hy + hry * 0.5], SK[2]);
    if (o.hair !== false && !o.hat) hairStrands(g, G);
    if (o.face !== false) { zEyes(g, G, P, o.eyeOpt); zMouth(g, G, P, o.mouthOpt); }
    if (o.hatNote) G.hatNote = o.hatNote(G);
    const nt = o.note == null ? 'forehead' : o.note;
    if (nt && !o.noteAfterHat) placeNote(g, G, nt);
    if (o.hat) o.hat(g, G);
    if (nt && o.noteAfterHat) placeNote(g, G, nt);
    if (o.mid) o.mid(g, G);
    if (!o.noFrontArm) piece(g, t => drawArm(t, G.fa, o.sleeve && o.sleeve !== 'bare' ? o.sleeve : CO, true));
    if (o.front) o.front(g, G);
    if (o.post) o.post(g, G);
    return G;
  }
  function placeNote(g, G, nt) {
    const { hx, hy, hrx, hry, S } = G;
    if (nt === 'forehead') G.notePts = note(g, hx - hrx * 0.3, hy - hry * 0.64, S, -0.2);
    else if (nt === 'hat' && G.hatNote) { const [x, y, a, k] = G.hatNote; G.notePts = note(g, x, y, S * (k || 0.8), a == null ? -0.2 : a); }
    else if (Array.isArray(nt)) G.notePts = note(g, hx + nt[0] * S, hy + nt[1] * S, S * (nt[3] || 1), nt[2] == null ? -0.2 : nt[2]);
  }
  // redraw a hand on top of a held prop
  function handOver(g, G, which) {
    const h = which === 2 ? G.hand2 : G.hand, s = G.s, r = (G.o.handR || 1.7) * s;
    piece(g, t => t.ell(h[0], h[1], r, r * 0.94, flat(which === 2 ? G.o.handSkin || G.SK : G.o.handSkin || G.SK)));
  }

  const ZA = PX.ZOMBIE_ART = PX.ZOMBIE_ART || {};
  const BA = PX.BOSS_ART = PX.BOSS_ART || {};
  PX.ZKIT = { zombie, handOver, blob, recol, thin, rot, rrect, note, stitch, zEyes, zMouth, hairStrands, HEADS, piece, flat, R3, lerp2,
    SKIN, COAT, PANTS, SHOE, SHIRT, SHIRT_D, TIE, NOTE, CONE, METAL, RED, GOLD, WOOD, BLUE, PURP, CREAM, PINK, TEAL, DKSTEEL, W };

  // =====================================================================================================
  // THE ZOMBIES
  // =====================================================================================================
  ZA.basic = (g, P) => zombie(g, P, {});

  // ---------------- Flag: a big brain flag on a pole, flying above the head ----------------
  const FLAG = R3('#f08888'), BRAIN = ['#ffe0ea', '#ffb8cc', '#e88aa8'];
  // a chubby cartoon brain (two lobes with fine-pixel folds), centred on cx, cy
  function brain(g, cx, cy, sc) {
    sc = sc || 1;
    piece(g, t => blob(t, [[cx - 1.1 * sc, cy, 1.9 * sc, 1.6 * sc], [cx + 1.1 * sc, cy, 1.9 * sc, 1.6 * sc], [cx, cy + 0.5 * sc, 2.6 * sc, 1.3 * sc]], BRAIN, { hl: false }));
    thin(g, [[cx, cy - 1.3 * sc], [cx, cy + 1.2 * sc]], BRAIN[2], 0.22);
    thin(g, [[cx - 2 * sc, cy - 0.2 * sc], [cx - 1.2 * sc, cy + 0.4 * sc], [cx - 0.6 * sc, cy - 0.4 * sc]], BRAIN[2], 0.2);
    thin(g, [[cx + 0.7 * sc, cy + 0.3 * sc], [cx + 1.4 * sc, cy - 0.5 * sc], [cx + 2 * sc, cy + 0.2 * sc]], BRAIN[2], 0.2);
  }
  ZA.flag = (g, P) => zombie(g, P, {
    s: 0.86, head: 'egg', defArms: 'up',
    back(g, G) {
      // the pole stands in the front hand; the banner flies back over the head (drawn behind it)
      const [hx] = G.hand, px = Math.min(29.6, hx + 0.6), top = 0.9, wav = G.f || (G.P.frame ? 1 : 0);
      const L = px - 12.5;
      piece(g, t => blob(t, [{ p: [[px, top + 0.3], [L + 1, top + wav * 0.7], [L, top + 3.2], [L + 1.2, top + 6.6 - wav * 0.5], [px, top + 7]] }], FLAG, { hl: false }));
      brain(g, px - 5.6, top + 3.4, 1.05);
      G.pole = [px, top];
    },
    front(g, G) {
      const [px, top] = G.pole, [, hy] = G.hand;
      piece(g, t => stroke(t, [[px, top - 0.4], [px, Math.min(30.4, hy + 6)]], 0.62, 0.62, WOOD[1]));
      piece(g, t => t.ell(px, top - 0.6, 0.95, 0.95, flat(GOLD)));
      handOver(g, G, 1);
    },
  });

  // ---------------- Conehead: a big chunky traffic cone ----------------
  function cone(g, G, o) {
    o = o || {};
    const S = G.S, cx = G.hx - 0.6 * S, base = G.top + 4.8 * S, a = -0.08, hw = 8.6 * S, tip = Math.max(0.7, base - 11.6 * S);
    const R = o.R || CONE;
    piece(g, t => {
      blob(t, [{ p: rot([[cx - hw, base], [cx + hw, base], [cx + 1.5 * S, tip + 0.9], [cx - 1.5 * S, tip + 0.9]], cx, base, a) }, rot([[cx, tip + 1, 1.5 * S, 1.1 * S]], cx, base, a).map(([x, y]) => [x, y, 1.5 * S, 1.1 * S])[0]], R, { d: [1.6, 0.6] });
      // two cream reflective bands
      const band = (y0, y1) => recol(t, R, (x, y) => { const q = rot([[x, y]], cx, base, -a)[0]; return q[1] > y0 && q[1] < y1; }, (x, y, v) => (v === R[2] ? '#e8dcc4' : '#fff6e6'));
      band(base - 7.6 * S, base - 5.9 * S); band(base - 4.2 * S, base - 2.5 * S);
    });
    // the chunky square-ish rim
    piece(g, t => blob(t, [{ p: rot(rrect(cx - hw - 1.4 * S, base - 1 * S, (hw + 1.4 * S) * 2, 2.4 * S, 1 * S), cx, base, a) }], R3(mixHex(R[1], '#e86a3a', 0.25)), { hl: false, d: [0.6, 0.8] }));
  }
  ZA.conehead = (g, P) => zombie(g, P, { s: 0.88, head: 'wide', hair: false, hat: (g, G) => cone(g, G), note: 'hat', noteAfterHat: true, hatNote: G => [G.hx + 1.6 * G.S, G.top + 1.6 * G.S, 0.2, 0.8] });

  // ---------------- Buckethead: an upside-down metal pail ----------------
  ZA.buckethead = (g, P) => zombie(g, P, {
    s: 0.92, head: 'box', hair: false, note: 'hat', noteAfterHat: true, hatNote: G => [G.hx + 1.6 * G.S, G.top + 1.2 * G.S, -0.15, 0.85],
    hat(g, G) {
      const S = G.S, cx = G.hx - 0.5 * S, rim = G.top + 4.6 * S, a = -0.07, top = Math.max(0.8, rim - 8.6 * S);
      // the wire handle loops down the back
      piece(g, t => { const p = rot([[cx - 6.4 * S, rim - 4.6 * S], [cx - 9 * S, rim - 1.6 * S], [cx - 8 * S, rim + 2.4 * S]], cx, rim, a); stroke(t, p, 0.45, 0.45, METAL[2]); });
      piece(g, t => {
        blob(t, [{ p: rot([[cx - 8.2 * S, rim], [cx + 8.2 * S, rim], [cx + 6 * S, top + 0.6], [cx + 5.2 * S, top], [cx - 5.2 * S, top], [cx - 6 * S, top + 0.6]], cx, rim, a) }], METAL, { d: [1.8, 0.7], hl: false });
        // a shiny stripe and a ridge near the top
        recol(t, METAL, (x, y) => { const q = rot([[x, y]], cx, rim, -a)[0]; return q[0] > cx - 4.4 * S && q[0] < cx - 3 * S && q[1] > top + 2.2 && q[1] < rim - 1.4; }, W);
        recol(t, METAL, (x, y) => { const q = rot([[x, y]], cx, rim, -a)[0]; return q[1] > top + 1.3 && q[1] < top + 1.9; }, METAL[2]);
      });
      // the rolled rim
      piece(g, t => blob(t, [{ p: rot(rrect(cx - 9.2 * S, rim - 1.2 * S, 18.4 * S, 2.4 * S, 1.1 * S), cx, rim, a) }], METAL, { hl: false, d: [0.5, 0.8] }));
      // a little dent
      const d = rot([[cx + 3.2 * S, rim - 4.4 * S]], cx, rim, a)[0];
      g.dots([[d[0], d[1]], [d[0] + 0.5, d[1]], [d[0] + 0.5, d[1] + 0.5]], METAL[2]); g.dot(d[0] + 1, d[1] + 0.5, W);
    },
  });

  // ---------------- Newspaper: an old fella with fluffy white hair, specs and a big newspaper ----------------
  const NEWS = ['#fffdf4', '#f2ecd8', '#d4c8a8'], WHITEHAIR = ['#ffffff', '#eef0f6', '#c8ccd8'];
  ZA.newspaper = (g, P) => zombie(g, P, {
    head: 'egg', holdArms: true, hair: false, coat: R3('#a8a888'), tie: R3('#8ab8ec'),
    mid0(g, G) { // fluffy white tufts round the back of the head (behind it)
      const { hx, hy, hrx, hry } = G;
      piece(g, t => blob(t, [[hx - hrx * 0.86, hy + hry * 0.1, 2.6, 3.2], [hx - hrx * 0.62, hy - hry * 0.48, 2.6, 2.2], [hx - hrx * 0.98, hy + hry * 0.46, 2, 2]], WHITEHAIR, { hl: false }));
    },
    hat(g, G) {
      const { hx, top, ex, ey, S } = G;
      piece(g, t => blob(t, [[hx - 1.6, top + 0.6, 1.6, 1.1], [hx + 0.6, top + 0.2, 1.4, 1], [hx - 3.6, top + 1.4, 1.4, 1]], WHITEHAIR, { hl: false }));
      // reading specs: a bridge between the googly eyes and an arm to the ear
      const sp = 6.6 * S;
      thin(g, [[ex - sp / 2 + 2.7 * S, ey - 0.6], [ex + sp / 2 - 2.7 * S, ey - 0.6]], INK, 0.32);
      thin(g, [[ex - sp / 2 - 2.8 * S, ey - 0.4], [ex - sp / 2 - 5.2 * S, ey - 1.4]], INK, 0.3);
      // bushy white brows
      for (const x of [ex - sp / 2, ex + sp / 2]) piece(g, t => t.ell(x, ey - 3.6 * S, 1.6 * S, 0.65 * S, WHITEHAIR[1]));
    },
    front(g, G) {
      if (G.pose !== 'hold') { const [hx, hy] = G.hand; piece(g, t => blob(t, [{ p: [[hx - 1.6, hy - 5], [hx + 2.6, hy - 5.4], [hx + 3, hy + 1.4], [hx - 1.2, hy + 1.8]] }], NEWS, { hl: false })); handOver(g, G, 1); return; }
      const x0 = G.X(17.8), y0 = G.U(16.6), w = 12.8 * G.s, h = 13 * G.s, a = 0.05;
      const C = [x0 + w / 2, y0 + h / 2];
      piece(g, t => {
        blob(t, [{ p: rot([[x0, y0 + 0.6], [x0 + w / 2, y0], [x0 + w, y0 + 0.6], [x0 + w, y0 + h], [x0 + w / 2, y0 + h - 0.6], [x0, y0 + h]], C[0], C[1], a) }], NEWS, { hl: false, d: [1, 0.8] });
      });
      // the fold down the middle, a headline and columns of grey text (fine lines)
      const R = (x, y) => rot([[x, y]], C[0], C[1], a)[0];
      thin(g, [R(x0 + w / 2, y0 + 0.3), R(x0 + w / 2, y0 + h - 0.5)], NEWS[2], 0.24);
      thin(g, [R(x0 + 1.2, y0 + 2), R(x0 + w / 2 - 1, y0 + 2)], '#6a6478', 0.5);
      for (let i = 0; i < 4; i++) { const y = y0 + 4.4 + i * 2; thin(g, [R(x0 + 1.2, y), R(x0 + w / 2 - 1 - (i % 2) * 1.4, y)], '#b4b0c0', 0.22); }
      for (let i = 0; i < 2; i++) { const y = y0 + 8.4 + i * 2; thin(g, [R(x0 + w / 2 + 1, y), R(x0 + w - 1.4 - (i % 2) * 1.2, y)], '#b4b0c0', 0.22); }
      piece(g, t => t.poly([R(x0 + w / 2 + 1, y0 + 2.2), R(x0 + w - 1.4, y0 + 2.2), R(x0 + w - 1.4, y0 + 6.6), R(x0 + w / 2 + 1, y0 + 6.6)], '#bcd6f4'));
      handOver(g, G, 1); handOver(g, G, 2);
    },
  });

  // ---------------- Screen Door: a chunky screen door held up like a shield ----------------
  const DOOR = R3('#f2f0ea'), MESH = ['#d4dcea', '#aebcd2', '#8e9cb4'];
  ZA.screendoor = (g, P) => zombie(g, P, {
    holdArms: true, head: 'peanut',
    front(g, G) {
      const x0 = 19, y0 = 13.6 + G.bob * 0.6, w = 12, h = 17.2;
      piece(g, t => blob(t, [{ p: rrect(x0, y0, w, h, 1.2) }], DOOR, { hl: false, d: [0.8, 0.8] }));
      piece(g, t => { t.poly(rrect(x0 + 1.5, y0 + 1.5, w - 3, h / 2 - 2, 0.5), MESH[1]); t.poly(rrect(x0 + 1.5, y0 + h / 2 + 0.6, w - 3, h / 2 - 2.1, 0.5), MESH[1]); });
      // the mesh: a neat fine-pixel grid
      for (let x = x0 + 3.5; x < x0 + w - 1.6; x += 2) for (let y = y0 + 1.6; y < y0 + h - 1.5; y += 0.5) if (g.get(x, y) === MESH[1]) g.dot(x, y, MESH[0]);
      for (let y = y0 + 3.5; y < y0 + h - 1.6; y += 2) for (let x = x0 + 1.6; x < x0 + w - 1.5; x += 0.5) if (g.get(x, y) === MESH[1] || g.get(x, y) === MESH[0]) g.dot(x, y, MESH[0]);
      g.dots([[x0 + 2.2, y0 + 2.2], [x0 + 2.7, y0 + 2.2], [x0 + 2.2, y0 + 2.7]], W);
      piece(g, t => t.ell(x0 + w - 2, y0 + h / 2 + 0.2, 0.9, 0.9, flat(GOLD)));
      handOver(g, G, 1); handOver(g, G, 2);
    },
  });

  // ---------------- Football: a big round helmet with a face guard, giant shoulder pads ----------------
  const JERSEY = R3('#f27c84'), HELM = R3('#f06a78', 0.18);
  ZA.football = (g, P) => zombie(g, P, {
    head: 'round', hair: false, pants: R3('#eeeef2'), shirt: false, sleeve: JERSEY, note: 'hat', noteAfterHat: true, hatNote: G => [G.hx - 4.6 * G.S, G.hy - 5 * G.S, -0.3, 0.8],
    body(t, G) { const { X, U, s } = G; blob(t, [[X(15.2), U(24.4), 6 * s, 4.4 * s], [X(15.2), U(21.4), 7.4 * s, 2.4 * s]], JERSEY, { hl: false }); },
    torso(g, G) { // the big white number 1
      const { X, U } = G; thin(g, [[X(14.4), U(23)], [X(15.4), U(22.2)], [X(15.4), U(26.2)]], W, 0.42); thin(g, [[X(14.4), U(26.2)], [X(16.4), U(26.2)]], W, 0.42);
    },
    mid0(g, G) { const { X, U, s } = G; piece(g, t => blob(t, [[X(13.6), U(20.6), 4.6 * s, 2.2 * s], [X(19.2), U(20.8), 3.2 * s, 2.1 * s]], JERSEY, { hl: false })); },
    hat(g, G) {
      const { hx, hy, hrx, hry, ex, ey, S, mx, my } = G;
      const sp = 6.6 * S, open = (x, y) => y > ey - 3.5 * S && x > ex - sp / 2 - 3.3 * S + Math.max(0, y - (ey + 2.5 * S)) * -0.6;
      piece(g, t => {
        blob(t, [[hx - 0.3, hy - 0.5, hrx + 0.9, hry + 0.6]], HELM, { mask: (x, y) => !open(x, y) });
        // a white stripe over the top
        recol(t, HELM, (x, y) => Math.abs(x - (hx - 1 + (y - (hy - hry)) * 0.25)) < 0.9 * S && y < ey - 3, (x, y, v) => (v === HELM[2] ? '#e4e0ea' : W));
      });
      // the face guard: two bars and an upright across the mouth
      const gx = mx + 3.4 * S, c = METAL;
      piece(g, t => stroke(t, [[mx - 3.8 * S, my - 1.8 * S], [gx - 0.6, my - 1.8 * S], [gx, my - 1.2 * S], [gx, my + 1.6 * S], [gx - 0.6, my + 2.3 * S], [mx - 2.2 * S, my + 2.4 * S]], 0.36, 0.36, c[1]));
    },
  });

  // ---------------- Pole Vaulter: a long bean head, sweatband, track vest, a long pole ----------------
  ZA.polevault = (g, P) => zombie(g, P, {
    head: 'bean', sleeve: 'bare', shirt: false, pants: R3('#80a8f0'), body: 'tall', legs: 'short',
    torso(g, G) {
      const { X, U, s } = G;
      piece(g, t => { blob(t, [{ p: [[X(11.6), U(20.4)], [X(13.6), U(19.8)], [X(15.2), U(21.4)], [X(16.8), U(19.8)], [X(18.8), U(20.4)], [X(19.6), U(26.6)], [X(10.8), U(26.6)]] }], R3('#fafaf6'), { hl: false });
        recol(t, ['#fafaf6', R3('#fafaf6')[2]], (x, y) => y > U(22.6) && y < U(23.8), (x, y, v) => (v === '#fafaf6' ? RED[1] : RED[2])); });
    },
    hat(g, G) {
      const { hx, hy, hrx, hry, top, S } = G;
      // a red sweatband with knotted ends flying back
      const y = top + hry * 0.62, fl = G.f ? 0.6 : 0;
      piece(g, t => { blob(t, [{ p: [[hx - hrx * 1.02, y - 0.2], [hx + hrx * 0.86, y - 1.6], [hx + hrx * 0.9, y + 0.4], [hx - hrx * 1.02, y + 1.8]] }], RED, { hl: false, mask: (x, yy) => g.filled(x, yy) }); });
      piece(g, t => { t.ell(hx - hrx - 1.4, y + 0.2 - fl, 1.6, 0.8, flat(RED), 0.4); t.ell(hx - hrx - 1.2, y + 1.8 + fl * 0.5, 1.5, 0.75, flat(RED), -0.5); });
      void hy; void S;
    },
    front(g, G) {
      const [hx, hy] = G.hand, p0 = G.pose === 'fwd' ? [1, hy + 3.4] : [hx - 3, Math.min(30, hy + 9)], p1 = G.pose === 'fwd' ? [31, hy - 2.4] : [hx + 3, Math.max(0.8, hy - 12)];
      piece(g, t => stroke(t, [p0, p1], 0.62, 0.62, RED[1]));
      thin(g, [lerp2(p0, p1, 0.04).map((v, i) => v - (i ? 0.3 : 0)), lerp2(p0, p1, 0.96).map((v, i) => v - (i ? 0.3 : 0))], RED[0], 0.2);
      handOver(g, G, 1);
    },
  });

  // ---------------- Dancing (disco): a huge fluffy afro, white suit, gold medallion ----------------
  const AFRO = R3('#a87c66', 0.22), DISCO = R3('#fbfaff');
  const afroCloud = G => { const { hx, hy, hrx, hry } = G, cx = hx - 1.2, cy = hy - hry * 0.3, sh = [[cx, cy, hrx * 1.08, hry * 1.02]]; for (let i = 0; i < 13; i++) { const a = Math.PI * (0.5 + i * 0.125); sh.push([cx + Math.cos(a) * hrx * 1.08, cy + Math.sin(a) * hry * 1.04, 3.2, 3]); } return sh; };
  ZA.disco = (g, P) => zombie(g, P, {
    s: 0.9, head: 'round', hair: false, coat: DISCO, pants: DISCO, shoe: R3('#f4f2fa'), shirt: R3('#d0a0f0')[1], tie: false, defArms: 'point',
    back(g, G) { // the afro: a big cloud of puffs round the head
      piece(g, t => blob(t, afroCloud(G), AFRO, { d: [1.4, 1.2] }));
    },
    hat(g, G) { // the same cloud in front of the head above the hairline and behind the ear, framing the face
      const { ex, ey, S } = G, sp = 6.6 * S;
      piece(g, t => blob(t, afroCloud(G), AFRO, { hl: false, d: [1.4, 1.2], mask: (x, y) => y < ey - 4.6 * S + Math.max(0, ex - sp / 2 - 1.4 * S - x) * 0.7 - Math.max(0, x - (ex + sp / 2)) * 0.4 }));
    },
    note: 'hat', noteAfterHat: true, hatNote: G => [G.hx + 0.6 * G.S, G.hy - 7.6 * G.S, 0.15, 0.85],
    torso(g, G) { // wide disco lapels, the purple shirt, a gold medallion
      const { X, U, s } = G;
      piece(g, t => { t.poly([[X(13), U(19.6)], [X(17.8), U(19.6)], [X(15.4), U(24.8)]], '#d0a0f0'); });
      piece(g, t => { t.poly([[X(12.6), U(19.8)], [X(14.4), U(22.4)], [X(12.8), U(23.4)]], DISCO[1]); t.poly([[X(18.2), U(19.8)], [X(16.6), U(22.4)], [X(18.4), U(23.2)]], DISCO[1]); });
      piece(g, t => t.ell(X(15.4), U(23.4), 1.15 * s, 1.15 * s, flat(GOLD)));
      g.dot(X(15.1), U(23.1), W);
    },
  });


  // ---------------- Ducky Tube: a big rubber-duck swim ring round the tummy ----------------
  const DUCK = R3('#ffe27a', 0.16), BEAK = R3('#ffaa5a');
  ZA.duckytube = (g, P) => zombie(g, P, {
    head: 'wide',
    belowBody(g, G) { const { X, U, s } = G; piece(g, t => blob(t, [[X(15.4), U(24.6), 9.2 * s, 3.6 * s]], DUCK, { hl: false, mask: (x, y) => y < U(24.6) })); },
    mid(g, G) {
      const { X, U, s } = G, cy = U(24.6);
      piece(g, t => blob(t, [[X(15.4), cy, 9.2 * s, 3.6 * s]], DUCK, { mask: (x, y) => y >= cy - 0.4 * s, hl: [X(10.6), cy + 0.9 * s, 1.6 * s, 0.6 * s] }));
    },
    front(g, G) { // the duck's head at the front of the ring, with its beak and a dot eye
      const { X, U, s } = G, dx = X(24), dy = U(23.4);
      piece(g, t => blob(t, [[dx, dy, 2.8 * s, 2.6 * s], [dx - 1 * s, dy + 1.8 * s, 2.2 * s, 1.8 * s]], DUCK));
      piece(g, t => blob(t, [[dx + 3 * s, dy + 0.7 * s, 1.7 * s, 0.9 * s]], BEAK, { hl: false }));
      piece(g, t => t.ell(dx + 0.7 * s, dy - 0.5 * s, 0.6 * s, 0.75 * s, A.EYE_INK));
      g.dot(dx + 0.55 * s, dy - 0.8 * s, W);
    },
  });

  // ---------------- Snorkel: a big dive mask and a snorkel tube ----------------
  const WETSUIT = R3('#7ccfc4'), MASK = R3('#6c9ee8'), GLASS = '#d8f4ff';
  ZA.snorkel = (g, P) => zombie(g, P, {
    head: 'egg', coat: WETSUIT, shirt: false, hair: false,
    back(g, G) { // the snorkel tube runs up the back of the head
      const { hx, hy, hrx, hry, S } = G;
      piece(g, t => stroke(t, [[hx - hrx * 0.3, hy + hry * 0.5], [hx - hrx * 0.95, hy + hry * 0.1], [hx - hrx * 1.02, hy - hry * 0.6], [hx - hrx * 0.84, hy - hry * 1.1]], 0.9 * S, 0.9 * S, '#ffd65a'));
      piece(g, t => t.ell(hx - hrx * 0.82, hy - hry * 1.14, 1.1 * S, 0.8 * S, flat(BEAK)));
    },
    torso(g, G) { const { X, U, s } = G; piece(g, t => { t.poly([[X(14.2), U(19.8)], [X(16.6), U(19.8)], [X(16.6), U(27.6)], [X(15.4), U(27.6)]], '#ffd65a'); }); void s; },
    hat(g, G) {
      const { ex, ey, S, hx, hrx } = G, sp = 6.6 * S;
      const x0 = ex - sp / 2 - 3.5 * S, x1 = ex + sp / 2 + 3.3 * S, y0 = ey - 3.7 * S, y1 = ey + 3.4 * S;
      piece(g, t => stroke(t, [[x0, ey - 0.4], [hx - hrx * 0.98, ey - 0.8]], 0.75 * S, 0.75 * S, MASK[2])); // strap
      piece(g, t => { blob(t, [{ p: rrect(x0, y0, x1 - x0, y1 - y0, 2.4 * S) }], MASK, { hl: false, d: [0.7, 0.7] }); t.poly(rrect(x0 + 1 * S, y0 + 1 * S, x1 - x0 - 2 * S, y1 - y0 - 2 * S, 1.6 * S), GLASS); });
      zEyes(g, G, G.P);
      g.dots([[x0 + 1.6 * S, y0 + 1.6 * S], [x0 + 2.1 * S, y0 + 1.6 * S], [x0 + 1.6 * S, y0 + 2.1 * S]], W);
    },
    note: [-3.4, -6.6, -0.2, 0.85],
  });

  // ---------------- Balloon: a big red balloon on a string ----------------
  const BALL = R3('#ff8a8a', 0.18);
  ZA.balloon = (g, P) => zombie(g, P, {
    s: 0.94, head: 'egg', coat: R3('#9cb4d4'), tie: GOLD,
    front(g, G) {
      const [hx, hy] = G.hand, bob = G.P.frame ? 0.6 : 0, bx = Math.min(27.2, hx + 0.6), by = 5.2 + bob;
      thin(g, [[hx, hy - 1], [bx + 0.6, (hy + by) / 2 + 1], [bx, by + 4.6]], '#8a7a84', 0.24);
      piece(g, t => blob(t, [[bx, by, 3.7, 4.2], [bx + 0.2, by + 2.2, 2.8, 2.4]], BALL));
      piece(g, t => t.poly([[bx - 0.9, by + 5.1], [bx + 0.9, by + 5.1], [bx, by + 3.9]], BALL[2]));
      g.dots([[bx - 1.8, by - 2], [bx - 1.8, by - 1.5], [bx - 1.3, by - 2.5]], W);
      handOver(g, G, 1);
    },
  });

  // ---------------- Imp: a small cheeky zombie in a vest ----------------
  ZA.imp = (g, P) => zombie(g, Object.assign({}, P, { mouth: P.mouth || 'grin' }), {
    s: 0.74, hs: 1.12, head: 'wide', sleeve: 'bare', shirt: false, coat: R3('#f6f2e8'), pants: R3('#c8955e'),
    torso(g, G) { const { X, U } = G; piece(g, t => { t.ell(X(15.2), U(26.6), 5.4 * G.s, 0.9 * G.s, '#c8955e'); }); },
    mid0(g, G) { // a pointy ear at the back of the head
      const { hx, hy, hrx, hry } = G;
      piece(g, t => blob(t, [[hx - hrx * 0.96, hy + hry * 0.02, 1.7, 2]], G.SK, { hl: false }));
    },
  });

  // ---------------- Zombie Yeti: a big fluffy white snow zombie with a blue face ----------------
  const FUR = ['#ffffff', '#f0f4fa', '#c8d4e6'], ICEF = R3('#a8c8f0', 0.16);
  // a fluffy blob: an oval with a scalloped edge of little tufts
  const fluff = (cx, cy, rx, ry, n, r, a0, a1) => { const sh = [[cx, cy, rx * 0.92, ry * 0.92]]; for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / (n - 1); sh.push([cx + Math.cos(a) * rx * 0.86, cy + Math.sin(a) * ry * 0.86, r, r]); } return sh; };
  ZA.yeti = (g, P) => zombie(g, P, {
    s: 1, head: (t, G) => blob(t, fluff(G.hx, G.hy, G.hrx, G.hry, 12, 2.2, Math.PI * 0.55, Math.PI * 2.25), FUR), hair: false,
    skin: FUR, coat: FUR, pants: FUR, shoe: ICEF, shirt: false, sleeve: FUR, handSkin: ICEF, armR: 1.8,
    body(t, G) { const { X, U, s } = G; blob(t, fluff(X(15.2), U(24.4), 6.2 * s, 4.8 * s, 9, 1.6, Math.PI * 0.1, Math.PI * 0.9), FUR, { hl: false }); },
    mid0(g, G) { const { X, U, s } = G; piece(g, t => blob(t, [[X(16.4), U(24.4), 3 * s, 3 * s]], R3('#e6eef8'), { hl: false })); },
    face: false,
    hat(g, G) { // the blue face, eyes and mouth on it
      const { ex, ey, S } = G;
      piece(g, t => blob(t, [[ex + 0.8 * S, ey + 1.6 * S, 7.4 * S, 6 * S], [ex - 0.6 * S, ey - 1 * S, 6.2 * S, 4 * S]], ICEF, { mask: (x, y) => g.filled(x, y) }));
      zEyes(g, G, G.P); zMouth(g, G, G.P);
    },
    note: [-4.6, -5.6, -0.25, 0.9], noteAfterHat: true,
  });

  // ---------------- Pirate: a polka-dot bandana, an eye patch, a stripy shirt and a hook ----------------
  const BANDANA = R3('#f27878'), STRIPE = R3('#8cacec');
  ZA.pirate = (g, P) => zombie(g, P, {
    head: 'box', hair: false, coat: R3('#fbfaf4'), shirt: false, pants: R3('#b08a68'), sleeve: R3('#fbfaf4'),
    body(t, G) { // a stripy shirt and a belt
      const { X, U, s } = G, SH = R3('#fbfaf4');
      blob(t, [[X(15.2), U(24.1), 5.6 * s, 4.6 * s]], SH, { hl: false });
      recol(t, SH, (x, y) => Math.floor((y - U(19)) / (1.3 * s)) % 2 === 1, (x, y, v) => (v === SH[2] ? STRIPE[2] : STRIPE[1]));
      recol(t, SH.concat(STRIPE), (x, y) => y > U(25.9) && y < U(27.1), '#8a6a58');
    },
    torso(g, G) { const { X, U, s } = G; piece(g, t => t.poly(rrect(X(14.6), U(25.7), 1.6 * s, 1.6 * s, 0.3), GOLD[1])); },
    hat(g, G) {
      const { hx, hy, hrx, hry, ex, ey, S } = G;
      piece(g, t => blob(t, [[hx - 0.2, hy - 0.8, hrx + 0.5, hry + 0.2]], BANDANA, { hl: false, mask: (x, y) => y < ey - 3.2 * S - (x - hx) * 0.08 }));
      // white polka dots
      for (const [a, b] of [[-5, -5.6], [-1.6, -7.2], [2.2, -6.4], [-6.8, -2.6], [5, -4.2]]) { const x = hx + a * S, y = hy + b * S; if (BANDANA.includes(g.get(x, y))) piece(g, t => t.ell(x, y, 0.75 * S, 0.7 * S, '#fff6f0')); }
      // the knot and its tails at the back
      piece(g, t => { t.ell(hx - hrx - 0.4, ey - 3.6 * S, 1.5, 1.3, flat(BANDANA)); t.ell(hx - hrx - 1.4, ey - 1.6 * S, 1.6, 0.8, flat(BANDANA), 1.1); t.ell(hx - hrx - 2.2, ey - 3 * S, 1.5, 0.75, flat(BANDANA), 0.4); });
      // the eye patch over the back eye, with its strap
      const sp = 6.6 * S, px = ex - sp / 2;
      thin(g, [[hx - hrx * 0.94, ey - 3.4 * S], [px, ey], [ex + sp / 2 + 1, ey - 4.2 * S]], INK, 0.32);
      piece(g, t => t.ell(px, ey + 0.2, 2.6 * S, 2.7 * S, ['#4a3a48', '#4a3a48', '#3a2d34']));
    },
    mouthOpt: { tooth: GOLD[1] }, note: 'hat', noteAfterHat: true, hatNote: G => [G.hx - 3.2 * G.S, G.hy - 6.6 * G.S, -0.2, 0.8],
    front(g, G) { // a silver hook instead of the front hand
      const [x, y] = G.hand, s = G.s;
      piece(g, t => t.ell(x - 0.9 * s, y, 1.2 * s, 1.5 * s, flat(R3('#b08a68'))));
      piece(g, t => stroke(t, [[x, y], [x + 1.4 * s, y], [x + 2.4 * s, y - 0.8 * s], [x + 2.4 * s, y - 2 * s], [x + 1.4 * s, y - 2.6 * s]], 0.42 * s, 0.34 * s, METAL[1]));
    },
    handR: 0.01,
  });

  // ---------------- Mummy: all wrapped up in bandages, one googly eye peeking out ----------------
  const BAND = ['#e8dcbc', '#d0c29e', '#ad9c78'], BAND_L = '#9a8662';
  ZA.mummy = (g, P) => zombie(g, P, {
    head: 'egg', hair: false, skin: BAND, coat: BAND, pants: BAND, shoe: R3('#c8b48a'), shirt: false, sleeve: BAND, handSkin: BAND,
    eyeOpt: { one: true },
    post(g, G) {
      // bandage seams: slanted fine lines over every wrapped part (only on bandage colours)
      const k = g.k || 1, per = 3.6 * G.S, slope = 0.2;
      for (let fy = 0; fy < g.fh; fy++) for (let fx = 0; fx < g.fw; fx++) {
        const v = g.fget(fx, fy); if (!v || !BAND.includes(v)) continue;
        const x = (fx + 0.5) / k, y = (fy + 0.5) / k, u = (((y - x * slope - G.hy) % per) + per) % per;
        if (u < 0.5) g.fset(fx, fy, v === BAND[2] ? mixHex(BAND[2], INK, 0.2) : BAND_L); // the band's darker edge
        else if (u < 1.5 && v === BAND[1]) g.fset(fx, fy, BAND[0]);                      // its light stripe
      }
      // a loose bandage end dangles from the front arm
      const [hx, hy] = G.hand, sw = G.f ? 0.8 : 0;
      piece(g, t => stroke(t, [[hx - 2, hy + 0.6], [hx - 2.2 + sw, hy + 2.6], [hx - 1.4 + sw, hy + 4]], 0.55, 0.45, BAND[1]));
    },
  });

  // ---------------- Ra: a striped pharaoh headdress, a gold collar and a sun staff ----------------
  const NEMES = R3('#ffd466'), NBLUE = R3('#7c9ae8');
  ZA.ra = (g, P) => zombie(g, P, {
    head: 'egg', hair: false, coat: R3('#fbf8ee'), shirt: false, pants: R3('#fbf8ee'), shoe: GOLD, note: 'hat', noteAfterHat: true, hatNote: G => [G.hx - 3.4 * G.S, G.hy - 6.8 * G.S, -0.2, 0.8],
    back(g, G) { // the sun staff, held up in the front hand
      const [hx, hy] = G.hand, x = hx + 0.4, top = Math.max(5, hy - 12);
      piece(g, t => stroke(t, [[x, Math.min(30.4, hy + 7)], [x, top + 2]], 0.55, 0.55, WOOD[1]));
      piece(g, t => { const r = G.P.frame ? 0.3 : 0; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + r; t.ell(x + Math.cos(a) * 3, top + Math.sin(a) * 3, 1, 1, '#ffc040'); } });
      piece(g, t => blob(t, [[x, top, 2.6, 2.6]], R3('#ffe680'), { hl: false }));
      g.dots([[x - 1, top - 1], [x - 0.5, top - 1.5]], W);
    },
    torso(g, G) { // a gold-and-blue collar
      const { X, U, s } = G;
      piece(g, t => { t.ell(X(15.6), U(20.8), 5.4 * s, 2.4 * s, NEMES[1], 0, (x, y) => y > U(19.4)); recol(t, [NEMES[1]], (x, y) => Math.hypot((x - X(15.6)) / 5.4, (y - U(20.8)) / 2.4) > 0.6 * s, NBLUE[1]); });
      piece(g, t => t.poly([[X(10.2), U(26.2)], [X(20.6), U(26.2)], [X(20.2), U(27.2)], [X(10.4), U(27.2)]], NEMES[1]));
    },
    hat(g, G) {
      const { hx, hy, hrx, hry, ex, ey, S } = G;
      const capY = ey - 3.4 * S;
      piece(g, t => {
        blob(t, [[hx - 0.2, hy - 0.4, hrx + 0.9, hry + 0.5], { p: [[hx - hrx - 0.8, hy - 1], [hx - hrx * 0.2, hy - 1], [hx - hrx * 0.1, hy + hry + 3.4], [hx - hrx - 1.8, hy + hry + 3]] }], NEMES,
          { hl: false, mask: (x, y) => y < capY || x < ex - 6.6 * S / 2 - 3 * S });
        recol(t, NEMES, (x, y) => Math.floor((y - (hy - hry)) / (1.5 * S)) % 2 === 1, (x, y, v) => (v === NEMES[2] ? NBLUE[2] : NBLUE[1]));
      });
      // the gold band across the brow and a little cobra
      piece(g, t => t.poly([[hx - hrx * 0.6, capY - 0.6], [hx + hrx + 0.6, capY - 1.2], [hx + hrx + 0.6, capY + 0.4], [hx - hrx * 0.6, capY + 1]], GOLD[1]));
      piece(g, t => blob(t, [[ex + 2.2 * S, capY - 1.4, 1, 1.4]], R3('#7c9ae8'), { hl: false }));
    },
  });


  // ---------------- Gargantuar: a HUGE zombie with a telephone pole and a tiny imp on its back ----------------
  const GSK = ['#d8e8c2', '#aacb9e', '#93b386'], RAGS = R3('#c49a6e');
  function gargantuar(g, P, sc, ox, oy) {
    sc = sc || 1; ox = ox || 0; oy = oy || 0;
    const X = x => ox + x * sc, Y = y => oy + y * sc, walk = !!P.walk, f = walk && P.frame ? 1 : 0, bob = walk && f ? -1 * sc : 0, A0 = P.arms;
    const st = walk ? (f ? -1 : 2) : 0, R = v => v * sc;
    // the telephone pole (behind the head, over the front shoulder); arms up = it's lifted high
    const p0 = A0 === 'up' ? [X(1.2), Y(3.4) + bob] : [X(30.6), Y(25) + bob], p1 = A0 === 'up' ? [X(30.8), Y(3.4) + bob] : [X(4.4), Y(1.6) + bob];
    piece(g, t => stroke(t, [p0, p1], R(1.5), R(1.35), WOOD[1]));
    { const d = [p1[0] - p0[0], p1[1] - p0[1]], L = Math.hypot(d[0], d[1]), n = [-d[1] / L, d[0] / L], c = lerp2(p0, p1, 0.88); piece(g, t => stroke(t, [[c[0] - n[0] * R(3), c[1] - n[1] * R(3)], [c[0] + n[0] * R(3), c[1] + n[1] * R(3)]], R(0.6), R(0.6), WOOD[2])); thin(g, [lerp2(p0, p1, 0.05).map((v, i) => v + n[i] * R(0.6)), lerp2(p0, p1, 0.85).map((v, i) => v + n[i] * R(0.6))], WOOD[0], 0.22); }
    // the imp riding on its back, peeking over the shoulder (it ducks when the pole goes up)
    if (A0 !== 'up') {
      const ix = X(8.2), iy = Y(9.4) + bob;
      piece(g, t => blob(t, [[ix, iy, R(3.4), R(3.1)]], SKIN));
      A.chibiEyes(g, ix + R(0.8), iy + R(0.2), { white: true, sp: R(2.6), w: R(2.1), h: R(2.3), look: [0.5, 0.2], mood: P.eyes === 'happy' ? 'happy' : null });
      A.chibiMouth(g, ix + R(1.4), iy + R(1.9), 'grin', R(1.4));
      piece(g, t => { stroke(t, [[ix - R(2), iy + R(2.4)], [ix - R(3.6), iy - R(0.4) - f * R(0.8)]], R(0.7), R(0.6), SKIN[1]); t.ell(ix - R(3.8), iy - R(1) - f * R(0.8), R(0.9), R(0.9), flat(SKIN)); });
    }
    // back arm
    const ba = A0 === 'up' ? [[X(11), Y(13)], [X(4.6), Y(5.6)]] : [[X(10.6), Y(15)], [X(6.4), Y(22.6)]];
    piece(g, t => { stroke(t, [ba[0].map((v, i) => v + (i ? bob : 0)), ba[1].map((v, i) => v + (i ? bob : 0))], R(2.3), R(2.1), dk2(GSK)[1]); t.ell(ba[1][0], ba[1][1] + bob, R(2.3), R(2.2), flat(dk2(GSK))); });
    // stubby legs + big bare feet
    for (const [lx, R0, sgn] of [[11.4, dk2(RAGS), -1], [18.8, RAGS, 1]]) {
      piece(g, t => { const x = X(lx + sgn * st); t.ell(x, Y(27), R(2.8), R(3), flat(R0)); });
      piece(g, t => { const x = X(lx + sgn * st * 1.2 + 0.8); t.ell(x, Y(30.2), R(3.4), R(1.4), flat(sgn < 0 ? dk2(GSK) : GSK)); });
    }
    // the big pear body with ragged trousers and a rope belt
    piece(g, t => {
      blob(t, [[X(14.6), Y(20.4) + bob, R(8.6), R(6.2)], [X(14.2), Y(24.4) + bob, R(9.4), R(4.4)]], GSK, { hl: false });
      const RA = RAGS, yb = Y(23.6) + bob;
      recol(t, GSK, (x, y) => y > yb + Math.sin(x * 2.1) * 0.25, (x, y, v) => (v === GSK[2] ? RA[2] : RA[1]));
      recol(t, RA, (x, y) => y > yb && y < yb + R(0.9), '#e8c88a');
    });
    thin(g, [[X(17.6), Y(19.4) + bob], [X(18.2), Y(20.6) + bob], [X(17.6), Y(21.6) + bob]], GSK[2], 0.24); // a belly-button line
    // the head: big, round-ish and a little forward
    const hx = X(20.4), hy = Y(10.6) + bob, hr = R(8.2), hry = R(7.4);
    piece(g, t => blob(t, HEADS.pear(hx, hy, hr, hry), GSK, { hl: [hx - hr * 0.5, hy - hry * 0.5, R(1.4), R(0.8)] }));
    note(g, hx - hr * 0.32, hy - hry * 0.64, sc * 0.95, -0.2);
    hairStrands(g, { hx, top: hy - hry, S: sc * 0.9 });
    const ex = hx + R(1.8), ey = hy + R(0.6);
    A.chibiEyes(g, ex, ey, { white: true, sp: R(5.6), w: R(4.4), h: R(4.8), look: [0.55, 0.2], mood: P.eyes || 'brave' });
    zMouth(g, { mx: hx + R(3.4), my: hy + R(5), S: sc }, P);
    // the front arm grips the pole
    const fa = A0 === 'up' ? [[X(19.6), Y(17)], [X(26), Y(5.8)]] : [[X(18.6), Y(17.6)], [X(24.6), Y(21.4)]];
    piece(g, t => { stroke(t, [fa[0].map((v, i) => v + (i ? bob : 0)), fa[1].map((v, i) => v + (i ? bob : 0))], R(2.4), R(2.2), GSK[1]); t.ell(fa[1][0], fa[1][1] + bob, R(2.5), R(2.4), flat(GSK)); });
  }
  const dk2 = R => R.map(c => mixHex(c, '#4a3646', 0.12));
  ZA.gargantuar = (g, P) => gargantuar(g, P, 1, 0, 0);

  // ---------------- Jack-in-the-Box: a stripy clown suit, a ruffle collar and a jack-in-the-box ----------------
  const CLOWN = R3('#c4a4f0'), RUFF = R3('#fbf8ff'), JBOX = R3('#f27c84');
  ZA.jackbox = (g, P) => zombie(g, P, {
    head: 'round', coat: CLOWN, shirt: false, sleeve: CLOWN, pants: CLOWN,
    body(t, G) { const { X, U, s } = G; blob(t, [[X(15.2), U(24.1), 5.6 * s, 4.6 * s]], CLOWN, { hl: false }); recol(t, CLOWN, x => Math.floor((x - X(9)) / (1.6 * s)) % 2 === 1, (x, y, v) => (v === CLOWN[2] ? '#d8cce8' : '#f6f0ff')); },
    torso(g, G) { const { X, U, s } = G; for (const y of [22.6, 25]) piece(g, t => t.ell(X(15.6), U(y), 0.8 * s, 0.8 * s, flat(GOLD))); },
    mid0(g, G) { // a white ruffle collar
      const { X, U, s } = G, sh = [];
      for (let i = 0; i < 7; i++) sh.push([X(10.8 + i * 1.6), U(19.8 + (i % 2) * 0.4), 1.3 * s, 1.1 * s]);
      piece(g, t => blob(t, sh, RUFF, { hl: false }));
    },
    hat(g, G) { // a little clown hat with a pompom
      const { hx, top, S } = G, cx = hx - 1.2 * S, b = top + 3.4 * S, a = -0.18, HATC = R3('#ffd466');
      piece(g, t => { blob(t, [{ p: rot([[cx - 5 * S, b], [cx + 5 * S, b], [cx + 0.9 * S, b - 8.2 * S], [cx - 0.9 * S, b - 8.2 * S]], cx, b, a) }], HATC, { hl: false });
        recol(t, HATC, (x, y) => { const q = rot([[x, y]], cx, b, -a)[0]; return Math.floor((q[1] - b) / (2.2 * S)) % 2 === 0; }, (x, y, v) => (v === HATC[2] ? JBOX[2] : JBOX[1])); });
      const tp = rot([[cx, b - 8.6 * S]], cx, b, a)[0];
      piece(g, t => blob(t, [[tp[0], tp[1], 1.6 * S, 1.6 * S]], RUFF, { hl: false }));
    },
    note: 'hat', noteAfterHat: true, hatNote: G => [G.hx - 1.2 * G.S, G.top + 0.4 * G.S, -0.18, 0.7],
    front(g, G) {
      const [hx, hy] = G.hand, s = G.s, x0 = hx - 3.6 * s, y0 = hy + 0.6 * s, w = 6.6 * s;
      piece(g, t => blob(t, [{ p: rrect(x0, y0, w, w, 0.8 * s) }], JBOX, { hl: false }));
      piece(g, t => t.poly(rrect(x0 - 0.6 * s, y0 - 0.8 * s, w + 1.2 * s, 1.6 * s, 0.6 * s), GOLD[1]));
      piece(g, t => t.poly(PX.starPts(x0 + w / 2, y0 + w / 2 + 0.4 * s, 2.2 * s, 1 * s, 5), GOLD[1]));
      // the crank turns: up on one frame, down on the other
      const up = G.P.frame ? -1 : 1, cx = x0 + w + 0.2 * s, cy = y0 + w / 2;
      piece(g, t => { stroke(t, [[x0 + w - 0.4 * s, cy], [cx + 1 * s, cy], [cx + 1 * s, cy + up * 1.8 * s]], 0.4 * s, 0.4 * s, METAL[1]); t.ell(cx + 1 * s, cy + up * 2.2 * s, 0.75 * s, 0.75 * s, flat(JBOX)); });
      handOver(g, G, 1);
    },
  });

  // ---------------- Digger: a miner's hard hat with a glowing lamp and a pickaxe ----------------
  const HARDHAT = R3('#ffd466', 0.18), DUSTY = R3('#c8a47a');
  ZA.digger = (g, P) => zombie(g, P, {
    s: 0.94, head: 'wide', hair: false, coat: DUSTY, shirt: '#e6dcc4', tie: false, pants: R3('#9a92b8'), note: 'hat', noteAfterHat: true, hatNote: G => [G.hx - 3.8 * G.S, G.hy - 5.8 * G.S, -0.25, 0.8],
    back(g, G) { // the pickaxe, held up behind
      const [hx, hy] = G.hand, top = Math.max(4.6, hy - 9.4);
      piece(g, t => stroke(t, [[hx + 0.4, hy + 3], [hx + 0.4, top]], 0.62, 0.62, WOOD[1]));
      piece(g, t => blob(t, [{ p: [[hx - 5, top + 2.4], [hx - 1.2, top - 0.9], [hx + 2, top - 0.9], [hx + 5.8, top + 2.4], [hx + 2, top + 0.9], [hx - 1.2, top + 0.9]] }], METAL, { hl: false }));
    },
    hat(g, G) {
      const { hx, hy, hrx, hry, ex, ey, S } = G, rim = ey - 3.4 * S;
      piece(g, t => blob(t, [[hx - 0.3, hy - 1, hrx + 0.5, hry], { p: rrect(hx - hrx - 1.4, rim - 1, hrx * 2 + 3, 2, 1) }], HARDHAT, { mask: (x, y) => y < rim + 1, hl: [hx - hrx * 0.4, hy - hry * 0.7, 1.4, 0.8] }));
      recol(g, HARDHAT, (x, y) => Math.abs(x - (hx - 0.6)) < 0.8 * S && y < rim - 1, HARDHAT[0]);
      // the lamp
      const lx = hx + hrx * 0.62, ly = rim - 2.8 * S;
      piece(g, t => blob(t, [[lx, ly, 2 * S, 1.9 * S]], METAL, { hl: false }));
      piece(g, t => t.ell(lx + 0.6 * S, ly, 1.3 * S, 1.3 * S, '#fff6b0'));
      g.dot(lx + 0.4 * S, ly - 0.4 * S, W);
      if (G.P.frame) for (const [a, b] of [[2.6, -1.2], [3.2, 0], [2.6, 1.2]]) g.dots([[lx + a * S, ly + b * S], [lx + a * S + 0.5, ly + b * S]], '#fff27a');
    },
    post(g, G) { const { hx, hy, S } = G; for (const [a, b] of [[-5, 3.2], [4.8, 5.6], [-2.4, 6.4]]) if (g.get(hx + a * S, hy + b * S) === G.SK[1]) g.dots([[hx + a * S, hy + b * S], [hx + a * S + 0.5, hy + b * S]], '#a8b890'); handOver(g, G, 1); },
  });

  // ---------------- Knight: a round silver helmet with a visor slot and a big red plume ----------------
  const ARMOR = ['#f4f7fb', '#cfd8e4', '#a2aec0'], MAIL = R3('#b8c2d2');
  ZA.knight = (g, P) => zombie(g, P, {
    head: (t, G) => blob(t, HEADS.box(G.hx, G.hy - 0.3, G.hrx + 0.3, G.hry + 0.3), ARMOR, { hl: [G.hx - G.hrx * 0.5, G.hy - G.hry * 0.55, 1.6, 0.9] }),
    hair: false, face: false, coat: MAIL, sleeve: MAIL, handSkin: ARMOR, shirt: false, pants: R3('#a2aec0'), shoe: ARMOR,
    torso(g, G) { // a red tabard with a gold cross
      const { X, U, s } = G;
      piece(g, t => blob(t, [{ p: [[X(12.4), U(20)], [X(18.2), U(20)], [X(18.8), U(27.6)], [X(11.8), U(27.6)]] }], RED, { hl: false }));
      piece(g, t => { t.poly(rrect(X(14.8), U(21.2), 1 * s, 4.6 * s, 0.3), GOLD[1]); t.poly(rrect(X(13.4), U(22.6), 3.8 * s, 1 * s, 0.3), GOLD[1]); });
    },
    hat(g, G) {
      const { hx, hy, hrx, hry, ex, ey, S, P } = G, sp = 6.6 * S;
      // the visor opening: the zombie face peeks out, googly eyes and all
      piece(g, t => t.poly(rrect(ex - sp / 2 - 3.2 * S, ey - 3.2 * S, sp + 6.8 * S, 6.2 * S, 2.2 * S), G.SK[1]));
      zEyes(g, G, P, { h: 5 * S });
      // breathing holes on the chin plate and a ridge down the middle
      for (const [a, b] of [[1.6, 6.2], [3.2, 6.2], [4.8, 6]]) piece(g, t => t.ell(ex + a * S, ey + b * S - 0.4, 0.42 * S, 0.42 * S, '#6a7488'));
      thin(g, [[hx - 0.6, hy - hry - 0.2], [hx - 0.2, ey - 3.6 * S]], ARMOR[0], 0.3);
      // the red plume sweeping back
      const w = P.frame ? 0.5 : 0;
      piece(g, t => blob(t, [[hx - 1.6, hy - hry - 1.6 - w, 3, 2.4, -0.2], [hx - 4.8, hy - hry - 0.8 + w, 3.2, 2.2, 0.2], [hx - 7.8, hy - hry + 1.2 + w, 2.6, 1.8, 0.6], [hx - 9.6, hy - hry + 3.6, 1.6, 1.3, 1]], RED, { hl: [hx - 2.6, hy - hry - 2.4, 1.2, 0.6] }));
      thin(g, [[hx - 1.8, hy - hry - 1.4 - w], [hx - 5, hy - hry - 0.4 + w * 0.5], [hx - 8.2, hy - hry + 1.8]], RED[2], 0.22);
    },
    note: 'hat', noteAfterHat: true, hatNote: G => [G.hx - 3.6 * G.S, G.hy - 6.2 * G.S, -0.2, 0.8],
  });

  // ---------------- Cowboy: a wide-brim hat, a red neckerchief and a vest ----------------
  const HAT = R3('#c49468'), VEST = R3('#b98a66');
  ZA.cowboy = (g, P) => zombie(g, P, {
    s: 0.94, head: 'peanut', hair: false, coat: VEST, shirt: '#fbf6ee', tie: false, pants: R3('#86a8e0'), shoe: R3('#a87850'), sleeve: R3('#fbf2e2'),
    mid0(g, G) { // the neckerchief, tied under the chin
      const { X, U, s } = G;
      piece(g, t => blob(t, [{ p: [[X(11.6), U(19.4)], [X(19.6), U(19.4)], [X(16.2), U(23.4)]] }], RED, { hl: false }));
      for (const [a, b] of [[13.6, 20.2], [16.2, 20.4], [15.6, 21.8]]) g.dots([[X(a), U(b)], [X(a) + 0.5, U(b)]], '#fff2ee');
    },
    hat(g, G) {
      const { hx, top, S } = G, cx = hx - 0.8 * S, b = top + 3.6 * S;
      piece(g, t => blob(t, [[cx, b - 2.8 * S, 5 * S, 3.6 * S], { p: [[cx - 4.6 * S, b - 2.6 * S], [cx + 4.6 * S, b - 2.6 * S], [cx + 4.6 * S, b], [cx - 4.6 * S, b]] }], HAT, { mask: (x, y) => y < b + 0.2, hl: false }));
      // the dent on top and the band
      thin(g, [[cx - 1.6 * S, b - 5.6 * S], [cx, b - 4.8 * S], [cx + 1.6 * S, b - 5.6 * S]], HAT[2], 0.26);
      recol(g, HAT, (x, y) => y > b - 1.6 * S && y < b - 0.6 * S, '#8a5a48');
      // the wide brim, curled up at the ends
      piece(g, t => blob(t, [[cx, b + 0.2, 9.8 * S, 1.5 * S], [cx - 9.2 * S, b - 0.8 * S, 1.4 * S, 1.2 * S], [cx + 9.2 * S, b - 0.8 * S, 1.4 * S, 1.2 * S]], HAT, { hl: false, d: [0.5, 0.6] }));
    },
    note: 'hat', noteAfterHat: true, hatNote: G => [G.hx + 0.4 * G.S, G.top + 0.6 * G.S, 0.2, 0.7],
  });

  // ---------------- Robo Zombie: a boxy metal head, googly eyes on a screen, an antenna ----------------
  const ROBO = ['#eef3fa', '#bcc8da', '#8e9cb4'], RBODY = R3('#9cb0d0');
  ZA.robot = (g, P) => zombie(g, P, {
    head: 'box', hair: false, face: false, skin: ROBO, handSkin: ROBO, coat: RBODY, sleeve: RBODY, shirt: false, pants: R3('#8a98b8'), shoe: R3('#7a88a8'),
    torso(g, G) { // a chest panel with blinking lights
      const { X, U, s } = G, on = G.P.frame;
      piece(g, t => t.poly(rrect(X(12.6), U(21.2), 5.6 * s, 3.4 * s, 0.8 * s), '#5a6680'));
      for (const [i, c] of [[0, on ? '#ff9ab8' : '#8af0ff'], [1, '#fff27a'], [2, on ? '#8af0ff' : '#ff9ab8']]) piece(g, t => t.ell(X(13.8 + i * 1.6), U(22.9), 0.55 * s, 0.55 * s, c));
    },
    hat(g, G) {
      const { hx, top, ex, ey, S, P } = G, sp = 6.6 * S;
      // the screen: googly eyes and a pixel mouth glow on it
      piece(g, t => t.poly(rrect(ex - sp / 2 - 3.4 * S, ey - 3.6 * S, sp + 7 * S, 10.4 * S, 2.4 * S), '#4a5670'));
      zEyes(g, G, P, { col: '#2a3448' });
      const { mx, my } = G;
      if (P.mouth === 'open' || P.mouth === 'o' || P.mouth === 'grin') { piece(g, t => t.poly(rrect(mx - 1.6 * S, my - 0.6 * S, 3.2 * S, 1.6 * S, 0.5 * S), '#8af0ff')); }
      else thin(g, [[mx - 1.6 * S, my], [mx - 0.5 * S, my + 0.5], [mx + 0.5 * S, my], [mx + 1.6 * S, my + 0.5]], '#8af0ff', 0.3);
      // bolts on the side and an antenna with a glowing ball
      piece(g, t => blob(t, [[hx - G.hrx * 0.96, ey + 0.6, 1.4, 1.8]], ROBO, { hl: false }));
      piece(g, t => stroke(t, [[hx - 1.4, top + 0.4], [hx - 1.4, top - 2.6]], 0.38, 0.38, ROBO[2]));
      piece(g, t => t.ell(hx - 1.4, top - 3.2, 1.3, 1.3, P.frame ? flat(R3('#ff9ab8')) : flat(R3('#8af0ff'))));
    },
    note: [-3.6, -6, -0.2, 0.9], noteAfterHat: true,
  });


  // =====================================================================================================
  // ZOMBOSSES: PX.BOSS_ART[id] = { w: 48, h: 48, draw(g, f) }. Big, round, toy-like and friendly-silly, facing right,
  // feet on the bottom rows, f = animation frame 0|1. Dr. Zomboss peeks out where it fits.
  // =====================================================================================================
  const ZHAIR = R3('#6a5a7c', 0.25), COATW = ['#ffffff', '#f2f2f8', '#cfd2de'];
  // chibi Dr. Zomboss: a round green head, big swept-back dark hair, two clean googly eyes, a toothy grin
  function drZ(g, cx, cy, sc, o) {
    sc = sc || 1; o = o || {};
    if (o.body) {
      piece(g, t => blob(t, [[cx - 0.2 * sc, cy + 5.6 * sc, 4.6 * sc, 2.6 * sc]], COATW, { hl: false }));
      piece(g, t => t.poly([[cx + 0.4 * sc, cy + 3.8 * sc], [cx + 1.4 * sc, cy + 6.6 * sc], [cx - 0.6 * sc, cy + 6.6 * sc]], RED[1]));
    }
    // the hair: a big swoosh sweeping up and back, with two spikes
    piece(g, t => blob(t, [[cx - 1.8 * sc, cy - 1.8 * sc, 4.4 * sc, 3.6 * sc], { p: [[cx - 4 * sc, cy - 3.4 * sc], [cx - 7.6 * sc, cy - 5.6 * sc], [cx - 4.6 * sc, cy - 0.6 * sc]] }, { p: [[cx - 2 * sc, cy - 4.6 * sc], [cx - 4.4 * sc, cy - 8 * sc], [cx - 0.4 * sc, cy - 4.8 * sc]] }], ZHAIR, { hl: false }));
    piece(g, t => blob(t, [[cx + 0.3 * sc, cy + 0.6 * sc, 4.4 * sc, 4.1 * sc], [cx + 1.4 * sc, cy + 2.2 * sc, 3.2 * sc, 2.4 * sc]], SKIN, { hl: false, mask: (x, y) => !(y < cy - 1.6 * sc && x < cx + 1.4 * sc) }));
    piece(g, t => blob(t, [[cx - 0.6 * sc, cy - 2.6 * sc, 3.6 * sc, 1.6 * sc, -0.2]], ZHAIR, { hl: false })); // the fringe
    const ex = cx + 1.4 * sc, ey = cy + 0.6 * sc;
    A.chibiEyes(g, ex, ey, { white: true, sp: 3.6 * sc, w: 2.9 * sc, h: 3.1 * sc, look: [0.5, 0.2], mood: o.mood === 'happy' ? 'happy' : null });
    A.chibiMouth(g, cx + 2 * sc, cy + 3 * sc, sc >= 1.1 ? 'grin' : 'smile', 2.6 * sc); // small pilots keep it simple
  }
  // Dr. Zomboss seen through a round glass window: ONE clean glass rim (its outline), him inside, a single soft highlight arc at
  // the upper left and one glint dot (no extra rings, so it never swirls at game size). (`frame` is kept for old call sites.)
  function drZWindow(g, cx, cy, rx, ry, zx, zy, sc) {
    piece(g, t => t.ell(cx, cy, rx, ry, '#d8f2ff'));
    const T = new Grid(g.w, g.h, g.k); drZ(T, zx, zy, sc, { body: true });
    const k = g.k || 1, inG = (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    for (let fy = 0; fy < g.fh; fy++) for (let fx = 0; fx < g.fw; fx++) { const c = T.fget(fx, fy); if (c && inG((fx + 0.5) / k, (fy + 0.5) / k) < 0.86) g.fset(fx, fy, c); }
    const arc = []; for (let i = 0; i <= 8; i++) { const a = Math.PI * (1.08 + 0.36 * i / 8); arc.push([cx + Math.cos(a) * rx * 0.74, cy + Math.sin(a) * ry * 0.74]); }
    thin(g, arc, W, 0.3);
    g.dot(cx + rx * 0.42, cy - ry * 0.52, W);
  }
  // a chunky toy-robot leg (a capsule) with a round foot
  function capLeg(g, x, y0, y1, w, R, fx) {
    piece(g, t => blob(t, [{ p: rrect(x - w, y0, w * 2, y1 - y0, w) }], R, { hl: false }));
    piece(g, t => blob(t, [[x + (fx == null ? 0.8 : fx), y1 + 0.4, w * 1.55, w * 0.85]], R, { hl: false, mask: (xx, yy) => yy < y1 + 1.3 }));
  }
  const rivets = (g, pts, c) => { for (const [x, y] of pts) if (g.filled(x, y)) g.dots([[x, y], [x + 0.5, y]], c || '#7a8498'); };
  const STEEL = R3('#c4ccda'), ZSKIN = ['#dcebc8', '#b0cfa6', '#9fbc8a'];

  // ---------------- Gargantuar (boss): the giant zombie, telephone pole, imp and all ----------------
  BA.gargantuar = { w: 48, h: 48, draw(g, f) { gargantuar(g, { walk: true, frame: f, eyes: 'brave', mouth: f ? 'open' : null }, 1.5, 0, 0); } };

  // ---------------- Zombot: a giant zombie-head robot, Dr. Zomboss in the chest window ----------------
  BA.zombot = { w: 48, h: 48, draw(g, f) {
    const d = f ? 0.5 : 0;
    // back arm with a claw
    piece(g, t => stroke(t, [[13, 30], [8, 35]], 2, 1.8, STEEL[2]));
    piece(g, t => blob(t, [[7, 37, 2.6, 2.4]], dk2(STEEL), { hl: false }));
    // stubby legs
    capLeg(g, 17, 36, 43.6, 2.8, dk2(STEEL)); capLeg(g, 30, 36, 43.6, 2.9, STEEL);
    // the round metal body with a cockpit window
    piece(g, t => blob(t, [{ p: rrect(11, 26.6, 25, 13.4, 5.6) }], STEEL, { hl: false }));
    drZWindow(g, 23.4, 33.2, 4.6, 4, 23.2, 33.6, 0.82);
    for (const [x, c] of [[14.6, f ? '#ff9ab8' : '#fff27a'], [16.6, '#8af0ff']]) piece(g, t => t.ell(x, 31, 0.8, 0.8, c));
    rivets(g, [[13.4, 36.6], [33.4, 29], [33.4, 37]]);
    // the giant zombie head with a metal jaw
    const hx = 25.4, hy = 14.6 + d, rx = 14, ry = 11.6;
    piece(g, t => {
      blob(t, HEADS.peanut(hx, hy, rx, ry), ZSKIN, { hl: [hx - 7, hy - 6.6, 2.2, 1.2] });
      recol(t, ZSKIN, (x, y) => y > hy + 4.6 + (x - hx) * 0.06, (x, y, v) => (v === ZSKIN[2] ? STEEL[2] : STEEL[1]));
    });
    // big teeth along the jaw, the mouth opens on frame 1 (a fireball glows inside)
    const jy = hy + 6.4;
    if (f) { piece(g, t => blob(t, [{ p: rrect(hx + 1.6, jy - 0.2, 11, 4, 1.8) }], ['#5a3a4a', '#5a3a4a', '#4a2a3a'], { hl: false })); piece(g, t => blob(t, [[hx + 7.4, jy + 2, 2.6, 1.6]], R3('#ffb04a', 0.15), { hl: false })); }
    for (let i = 0; i < 5; i++) piece(g, t => t.poly(rrect(hx + 2 + i * 2.2, jy - 0.6, 1.9, 1.9, 0.5), '#fbfaf2'));
    // googly eyes, the sticky note, wire hairs and an ear bolt
    A.chibiEyes(g, hx + 3.6, hy - 1.6, { white: true, sp: 10.4, w: 8, h: 8.6, look: [0.55, 0.2], mood: 'brave' });
    note(g, hx - 6.4, hy - 8.4, 1.7, -0.2);
    for (const [a, b] of [[-3.6, -0.8], [-0.4, 0.4], [2.8, 0.2]]) thin(g, [[hx + a, hy - ry + 0.8], [hx + a - 0.6, hy - ry - 1.4 + b], [hx + a - 1.6, hy - ry - 2.2 + b]], INK, 0.3);
    piece(g, t => blob(t, [[hx - rx + 0.4, hy + 1.6, 2.2, 2.8]], STEEL, { hl: false }));
    rivets(g, [[hx - 10, hy + 6.6], [hx - 6, hy + 8.6], [hx + 12, hy + 6.8]]);
    // front arm with a big pincer claw
    piece(g, t => stroke(t, [[34, 30], [39.6, 33.6]], 2.1, 1.9, STEEL[1]));
    piece(g, t => blob(t, [[40.4, 33.4, 2.4, 2.4]], STEEL, { hl: false }));
    const op = f ? 0.5 : 0.2;
    for (const a of [-op - 0.4, op + 0.4]) piece(g, t => stroke(t, [[41, 33.2], [41 + Math.cos(a) * 3.6, 33.2 + Math.sin(a) * 3.6], [41 + Math.cos(a * 0.4) * 5.6, 33.2 + Math.sin(a * 0.4) * 5.6]], 1.1, 0.6, STEEL[1]));
  } };

  // ---------------- Zombot Plank Walker: a chubby toy pirate ship with googly eyes, on four robot legs ----------------
  const HULL = R3('#d4a470'), SAIL = ['#ffffff', '#fbf6ea', '#e2d8c0'];
  BA.plankwalker = { w: 48, h: 48, draw(g, f) {
    const st = f ? 1.2 : -1.2;
    for (const [x, s2, R] of [[11.6, st, dk2(STEEL)], [28, st, dk2(STEEL)], [18.4, -st, STEEL], [35.4, -st, STEEL]]) capLeg(g, x + s2 * 0.6, 32, 43.6 - (s2 > 0 ? 0.6 : 0), 2.8, R);
    // the ship is drawn on its own grid and dropped onto the legs (3 rows lower than its drawing coordinates)
    const T = new Grid(g.w, g.h, g.k); shipTop(T, f);
    const k = g.k || 1, dy = 3 * k;
    for (let fy = g.fh - 1; fy >= dy; fy--) for (let fx = 0; fx < g.fw; fx++) { const c = T.fget(fx, fy - dy); if (c) g.fset(fx, fy, c); }
  } };
  function shipTop(g, f) {
    // mast, sail with a big Z, a little flag
    piece(g, t => t.poly(rrect(22.6, 3.4, 1.8, 18, 0.8), HULL[2]));
    const bl = f ? 0.8 : 0;
    piece(g, t => blob(t, [{ p: [[14.6, 5.6], [31.8, 5.6], [33.4 + bl, 10.6], [32.2, 16.2], [14.4, 16.2], [15.6 + bl, 10.6]] }], SAIL, { hl: false, d: [1.2, 1] }));
    piece(g, t => stroke(t, [[19.6, 8], [27, 8], [19.6, 13.6], [27, 13.6]], 0.75, 0.75, RED[1]));
    piece(g, t => blob(t, [{ p: [[24.4, 1.2 + bl * 0.6], [30, 2.2], [29, 3.4 - bl * 0.4], [24.4, 4.2]] }], RED, { hl: false }));
    // the round hull, a raised stern castle, a gold trim
    piece(g, t => blob(t, [{ p: rrect(2.8, 13.6, 11, 9, 2.4) }], HULL, { hl: false }));
    piece(g, t => {
      blob(t, [{ p: [[3.4, 20], [43.6, 19.4], [46.6, 15.6], [46, 21], [42, 29.6], [10, 31], [4, 26]] }, [24, 25, 19, 6.6]], HULL, { hl: false });
      recol(t, HULL, (x, y) => Math.abs(y - (20.4 - (x > 40 ? (x - 40) * 0.6 : 0))) < 0.6, GOLD[1]);
      for (const y of [24.4, 28]) recol(t, HULL, (x, yy) => Math.abs(yy - y) < 0.25, HULL[2]);
    });
    // portholes and the plank
    for (const x of [13, 19.6]) { piece(g, t => t.ell(x, 25, 1.7, 1.7, flat(GOLD))); piece(g, t => t.ell(x, 25, 1.1, 1.1, '#a8e4ff')); }
    piece(g, t => blob(t, [{ p: rrect(39.6, 17.4, 8, 1.8, 0.6) }], WOOD, { hl: false }));
    // the ship's face at the bow: googly eyes and a grin
    A.chibiEyes(g, 33.4, 24.4, { white: true, sp: 7.4, w: 5.8, h: 6.2, look: [0.55, 0.2], mood: f ? 'brave' : null });
    A.chibiMouth(g, 36.6, 28.6, f ? 'open' : 'smile', 3.4);
    // Dr. Zomboss on the stern castle
    drZ(g, 8, 9.4 + (f ? 0.5 : 0), 0.95, { body: true });
  }


  // ---------------- Zombot Sphinx-inator: a chubby lying sphinx robot with Dr. Zomboss's face ----------------
  const SAND = R3('#f2d8a0'), NEM = R3('#ffd466'), NBL = R3('#7c9ae8');
  BA.sphinx = { w: 48, h: 48, draw(g, f) {
    // tail with a tuft
    piece(g, t => stroke(t, [[8, 37], [3.6, 34], [3, 28.4], [5, 26]], 1.1, 0.9, SAND[1]));
    piece(g, t => blob(t, [[5.4, 25.2, 1.8, 1.8]], NBL, { hl: false }));
    // the loaf body, haunch and paws
    piece(g, t => blob(t, [[20, 36, 15.4, 7.4], [10.6, 36.4, 7.6, 7.4], [30, 33.6, 8, 8]], SAND, { hl: false }));
    piece(g, t => blob(t, [[12, 43.4, 5.4, 2.2]], SAND, { hl: false }));
    piece(g, t => blob(t, [[37.4, 43, 9.4, 2.8]], SAND, { hl: false }));
    piece(g, t => blob(t, [[38.6, 40.2, 8.2, 2.6]], SAND, { hl: false }));
    for (const [x, y] of [[44.6, 39.6], [46, 40.6], [45.4, 42.4], [46.6, 43.4]]) g.dots([[x, y], [x, y + 0.5]], SAND[2]);
    // panel seams and a glowing vent
    thin(g, [[16, 30.4], [16, 41.6]], SAND[2], 0.22); thin(g, [[6, 38], [26, 38]], SAND[2], 0.22);
    for (let i = 0; i < 3; i++) piece(g, t => t.poly(rrect(19.4 + i * 2, 32, 1.2, 3.4, 0.5), f ? '#8af0ff' : '#7c9ae8'));
    // the headdress (nemes): gold and blue stripes, flaps to the chest
    const hx = 33.6, hy = 18.4;
    piece(g, t => {
      blob(t, [[hx, hy - 2, 10.4, 10], { p: [[hx - 10, hy - 2], [hx - 4.4, hy], [hx - 4.4, hy + 13.4], [hx - 10.4, hy + 13]] }, { p: [[hx + 10, hy - 2], [hx + 5, hy], [hx + 5.6, hy + 13.4], [hx + 10.6, hy + 12.6]] }], NEM, { hl: false });
      recol(t, NEM, (x, y) => Math.floor((y - hy + 20) / 2) % 2 === 1, (x, y, v) => (v === NEM[2] ? NBL[2] : NBL[1]));
    });
    // Dr. Zomboss's face (green, with his dark fringe), googly eyes and a grin
    piece(g, t => blob(t, [[hx + 0.6, hy + 1.6, 6.8, 6.8], [hx + 1.4, hy + 4, 5.4, 4.6]], ZSKIN, { hl: false }));
    piece(g, t => blob(t, [[hx - 0.6, hy - 3.6, 5.4, 2, -0.15]], ZHAIR, { hl: false, mask: (x, y) => g.filled(x, y) }));
    piece(g, t => t.poly([[hx - 9, hy - 6.6], [hx + 9.6, hy - 6.6], [hx + 9.6, hy - 5], [hx - 9.4, hy - 5]], GOLD[1]));
    piece(g, t => blob(t, [[hx + 2.6, hy - 8.4, 1.4, 2]], NBL, { hl: false }));
    A.chibiEyes(g, hx + 1.8, hy + 1.6, { white: true, sp: 5.6, w: 4.2, h: 4.6, look: [0.5, 0.2], mood: 'brave' });
    A.chibiMouth(g, hx + 2.6, hy + 6, 'grin', 3.2);
    // the eyes glow before the beam
    if (f) for (const [x, y] of [[hx - 3.6, hy - 1.6], [hx + 7.6, hy - 1.8], [hx + 8.2, hy + 3.4]]) g.dots([[x, y - 0.5], [x - 0.5, y], [x, y], [x + 0.5, y], [x, y + 0.5]], '#fff27a');
    // the pharaoh beard
    piece(g, t => { blob(t, [{ p: rrect(hx + 1.2, hy + 7.8, 3, 5.4, 1.2) }], NEM, { hl: false }); recol(t, NEM, (x, y) => Math.floor(y) % 2 === 0, NBL[1]); });
  } };

  // ---------------- Zombot Frost Mammoth: a round icy robot mammoth, Dr. Zomboss in a glass dome ----------------
  const ICE = R3('#b8e2f6', 0.16), ICE2 = R3('#d8f2ff', 0.12), TUSK = ['#ffffff', '#fffaf0', '#e2d8c4'];
  BA.frostmammoth = { w: 48, h: 48, draw(g, f) {
    const d = f ? 0.5 : 0;
    capLeg(g, 10, 32, 43.4, 2.8, dk2(ICE)); capLeg(g, 26, 32, 43.4, 2.8, dk2(ICE));
    // ice crystals on the back
    piece(g, t => { for (const [x, h] of [[7, 5], [11.6, 7], [26, 6], [30, 4.4]]) t.poly([[x - 2, 19.4], [x, 19.4 - h], [x + 2, 19.4]], ICE2[1]); });
    // the round body
    piece(g, t => blob(t, [[19.4, 27.4, 15, 10.6], [17, 31, 13.6, 7.4]], ICE, { hl: [12, 21, 2.6, 1.2] }));
    for (const [x, h] of [[17, 3], [20.6, 4.4], [24, 2.6]]) piece(g, t => t.poly([[x - 1.2, 36.6], [x + 1.2, 36.6], [x, 36.6 + h]], ICE2[0])); // icicles
    capLeg(g, 14.6, 33, 44, 3.1, ICE); capLeg(g, 30.6, 33, 44, 3.1, ICE);
    // the glass dome on its back, with Dr. Zomboss
    drZWindow(g, 18.6, 14.6, 6.6, 6, 19, 14.6 + d, 1.05);
    // head, big ear, tusks, trunk
    const hx = 35.4, hy = 22 + d;
    piece(g, t => blob(t, [[hx, hy, 8.4, 8], [hx + 2, hy + 3, 6, 5.4]], ICE, { hl: [hx - 3, hy - 4.6, 1.6, 0.9] }));
    piece(g, t => blob(t, [[hx - 5.6, hy + 1.4, 4.6, 6]], ICE, { hl: false }));
    piece(g, t => t.ell(hx - 5.4, hy + 1.6, 2.6, 4, ICE2[1]));
    const tr = f ? [[hx + 6, hy + 3], [hx + 9.4, hy + 8.6], [hx + 9.2, hy + 14], [hx + 11.6, hy + 16.4]] : [[hx + 6, hy + 3], [hx + 9, hy + 9], [hx + 8.4, hy + 14.4], [hx + 10.6, hy + 17.4]];
    piece(g, t => stroke(t, tr, 2.6, 1.3, ICE[1]));
    for (let i = 1; i < 6; i++) { const p = lerp2(tr[1], tr[2], i / 6); thin(g, [[p[0] - 1.4, p[1]], [p[0] + 1.2, p[1] - 0.2]], ICE[2], 0.2); }
    piece(g, t => stroke(t, [[hx + 2.6, hy + 6.2], [hx + 7.4, hy + 9.6], [hx + 10.6, hy + 7]], 1.4, 0.7, TUSK[1]));
    // a frosty helmet plate, googly eyes
    piece(g, t => blob(t, [[hx + 0.6, hy - 6.4, 6, 2.4]], DKSTEEL, { hl: false, mask: (x, y) => y <= hy - 5 }));
    A.chibiEyes(g, hx + 2.6, hy - 0.6, { white: true, sp: 5.4, w: 4, h: 4.4, look: [0.55, 0.2], mood: 'brave' });
    // frost sparkles
    for (const [x, y] of (f ? [[3, 10], [44, 5], [31, 6], [46, 30]] : [[5, 6], [42, 9], [33, 3], [2.4, 20]])) g.dots([[x, y - 0.5], [x - 0.5, y], [x, y], [x + 0.5, y], [x, y + 0.5]], '#e8faff');
  } };

  // ---------------- Zombot Dark Dragon: a chubby robot dragon with little wings, Dr. Zomboss riding ----------------
  const DRK = R3('#a490d8', 0.2), WINGM = R3('#d8a8f0', 0.16), BELLY = R3('#e8dcf8');
  BA.darkdragon = { w: 48, h: 48, draw(g, f) {
    const d = f ? 1 : 0;
    // the wing behind, with a scalloped edge
    piece(g, t => blob(t, [{ p: [[22, 25], [17, 8 - d], [11, 10 - d], [5, 7 - d * 1.4], [2, 18]] }, [5.4, 19, 3.4, 3.2], [10.6, 22, 3.6, 3.4], [16.4, 24, 3.4, 3]], WINGM, { hl: false }));
    for (const [a, b] of [[[21, 24], [16.6, 9 - d]], [[19, 24], [6, 8 - d * 1.4]]]) thin(g, [a, b], DRK[2], 0.32);
    // the tail, curling, with a heart tip
    piece(g, t => stroke(t, [[12, 36], [5.6, 39], [2.6, 35], [4, 31.6]], 2.4, 1.1, DRK[1]));
    piece(g, t => blob(t, [[3.4, 30, 1.4, 1.4], [5.2, 30, 1.4, 1.4], { p: [[2, 30.4], [6.6, 30.4], [4.3, 33]] }], R3('#ff9ac0'), { hl: false }));
    capLeg(g, 15, 36, 43.6, 2.8, dk2(DRK)); capLeg(g, 28, 36, 43.6, 3, DRK);
    // the round body with a pale belly and back bumps
    piece(g, t => { for (const x of [10.4, 15, 19.6, 24.2]) t.ell(x, 25.4 - (x > 18 ? 0.6 : 0), 2, 2, DRK[0]); });
    piece(g, t => blob(t, [[20.6, 32.4, 12.6, 9]], DRK, { hl: false }));
    piece(g, t => blob(t, [[25, 35.4, 6.6, 5]], BELLY, { hl: false }));
    for (const y of [33.4, 35.8, 38.2]) thin(g, [[20.4, y], [30, y]], BELLY[2], 0.2);
    // the saddle and Dr. Zomboss riding
    piece(g, t => blob(t, [[19.6, 24.6, 4.6, 2]], R3('#c46a6a'), { hl: false }));
    drZ(g, 19.4, 18.4 + d * 0.5, 0.95, { body: true });
    // the neck and the big round head with a snout
    piece(g, t => stroke(t, [[28, 30], [32.6, 24]], 3.6, 3.2, DRK[1]));
    const hx = 35.4, hy = 17.6 + d * 0.5;
    piece(g, t => { t.poly([[hx - 4, hy - 4.6], [hx - 7.6, hy - 9.6], [hx - 1.6, hy - 6]], DRK[0]); t.poly([[hx + 0.4, hy - 6], [hx - 0.6, hy - 11], [hx + 3.4, hy - 6.4]], DRK[0]); }); // horns
    piece(g, t => blob(t, [[hx, hy, 7.6, 7], [hx + 6, hy + 2.6, 5.4, 3.8]], DRK, { hl: [hx - 3, hy - 4.4, 1.6, 0.8] }));
    g.dots([[hx + 10, hy + 1], [hx + 10, hy + 1.5]], DRK[2]);
    // the mouth: a smile, or wide open with fire glowing on frame 1
    if (f) { piece(g, t => blob(t, [{ p: [[hx + 3, hy + 4], [hx + 11.6, hy + 3.2], [hx + 11, hy + 6.6], [hx + 4, hy + 6.4]] }], R3('#ffb04a', 0.15), { hl: false }));
      for (const [x, y] of [[46.4, 19], [45, 25.6], [46.6, 22.4]]) g.dots([[x, y], [x + 0.5, y], [x, y + 0.5]], '#ffe98a'); }
    else thin(g, [[hx + 3, hy + 4.2], [hx + 7, hy + 5], [hx + 10.6, hy + 3.8]], INK, 0.3);
    A.chibiEyes(g, hx + 1, hy - 0.8, { white: true, sp: 5, w: 3.8, h: 4.2, look: [0.55, 0.2], mood: 'brave' });
  } };

  // ---------------- Zombot Tomorrow-tron: a round chrome robot with a glass dome head and a laser cannon arm ----------------
  const CHROME = ['#ffffff', '#dfe6f2', '#a8b4cc'];
  BA.tomorrowtron = { w: 48, h: 48, draw(g, f) {
    const N1 = f ? '#ff8ad8' : '#7af0ff', N2 = f ? '#7af0ff' : '#ff8ad8', d = f ? 0.5 : 0;
    // back arm
    piece(g, t => stroke(t, [[15, 25], [9.6, 31]], 2.2, 2, CHROME[2]));
    piece(g, t => blob(t, [[9, 32.6, 2.6, 2.4]], dk2(CHROME), { hl: false }));
    capLeg(g, 18, 35, 43.6, 2.8, dk2(CHROME)); capLeg(g, 29.4, 35, 43.6, 3, CHROME);
    for (const x of [18, 29.4]) thin(g, [[x, 36.4], [x, 41.4]], N1, 0.4);
    // the round body with a neon ring and a glowing core
    piece(g, t => { blob(t, [[23.6, 29.6, 11.4, 8.4]], CHROME, { hl: [17.6, 24.6, 2.2, 1] }); recol(t, CHROME, (x, y) => Math.abs(y - 31.6) < 0.5, N2); });
    piece(g, t => blob(t, [[24.6, 27.6, 2.8, 2.8]], R3(N1, 0.15), { hl: false }));
    g.dots([[23.6, 26.6], [24.1, 26.6]], W);
    // the dome head: chrome with a big glass window, Dr. Zomboss inside, two neon antennae
    for (const [x, y] of [[17.6, 2.4], [30.6, 3]]) { piece(g, t => stroke(t, [[x, y + 1.6], [x + (x < 24 ? 1.4 : -1.4), 8]], 0.42, 0.42, CHROME[2])); piece(g, t => t.ell(x, y, 1.3, 1.3, flat(R3(N1, 0.15)))); }
    piece(g, t => blob(t, [[24, 13.6 + d, 10, 8.4]], CHROME, { hl: false }));
    recol(g, CHROME, (x, y) => Math.abs(y - (19.4 + d)) < 0.5 && x > 15 && x < 33, N2);
    drZWindow(g, 25.6, 12.6 + d, 6, 5.4, 25.6, 12.6 + d * 2, 0.95, CHROME);
    // the laser cannon arm
    piece(g, t => stroke(t, [[32, 26], [35.6, 28.6]], 2.4, 2.2, CHROME[1]));
    piece(g, t => blob(t, [{ p: rrect(33.6, 25.4, 11.6, 5.6, 2.6) }], STEEL, { hl: false }));
    for (const x of [36.4, 38.6]) thin(g, [[x, 25.8], [x, 30.6]], N1, 0.36);
    piece(g, t => blob(t, [[45.8, 28.2, 1.6, 2.2]], R3(N1, 0.15), { hl: false }));
    if (f) for (const [x, y] of [[47.4, 24.6], [47.4, 31.6]]) g.dots([[x, y], [x, y + 0.5]], '#ffffff');
  } };

  Object.assign(PX.ZKIT, { drZ, drZWindow, capLeg, rivets, dk2, gargantuar, STEEL, ZSKIN, ZHAIR, COATW, DKSTEEL });
})();
