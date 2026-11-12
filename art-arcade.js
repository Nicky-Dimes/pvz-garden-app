// art-arcade.js — P vs. Z Garden: mini-game arcade art (Shell Roll Rally, Burrow Bonk, Mystery Pots, Glow Drop, Leaf Match,
// Patchwork Swap, Seedshot Stall, Lane Sweep and the Claw Machine).
// Chibi props in the game's style (docs/pvz-art-guide.md): round chunky pastel shapes, a soft crescent of shade, a small
// highlight up-left, 1-fine-px piece outlines and a bold outerLine round each sprite. Plants and zombies are NOT drawn here:
// the mini-games reuse PX.sprig plants / zombies and PX.prop('zgrave' | 'gravestone' | 'lawnmower').
// Never touches the DOM at load (tools/check_pvz.js runs art files in Node): every canvas is made on first use and cached.
//
//   PX.arcade.vase(kind)        18 x 22  kind 'clay' (anything inside) | 'leaf' (always a plant) | 'gold' (always sun or coins)
//                                        anchor = bottom centre (9, 21)
//   PX.arcade.shard(kind, i)     8 x 7   three broken vase pieces (i = 0..2) in the vase's colours
//   PX.arcade.hole(part)        24 x 12  'back' = the dark dirt hole a zombie rises out of, 'front' = the dirt lip drawn over
//                                        the zombie's legs. Both share the same box; the hole's middle is (12, 6).
//   PX.arcade.mallet()          20 x 20  a cartoon wooden bonk mallet (head up-left, handle down-right); rotate it to swing
//   PX.arcade.sun()             16 x 16  a glowing PvZ-style sun to tap
//   PX.arcade.alley()           12 x 10  a red bowling-line marker flower for the Shell Roll Rally start line
//   PX.arcade.pot()             26 x 16  Glow Drop: the terracotta flower pot the Glowpetal rides in; anchor bottom centre (13, 15)
//   PX.arcade.cone() / bucket() 14 x 16 / 16 x 15  Glow Drop: what the zombie throws down (spin them round the centre)
//   PX.arcade.packet(kind)      24 x 30  Leaf Match cards: 'back' (sprout badge), 'face' (a window for the plant), 'zombie'
//   PX.arcade.splat()           16 x 12  Seedshot Stall: a green pea splat
//   PX.arcade.padlock()         16 x 18  the hub's locked-cabinet padlock
// Claw Machine + Lane Sweep:
//   PX.arcade.claw(part)        22 x 18  the claw head, 'open' | 'shut' (anchor: top middle (11, 0), prong tips at y 17)
//   PX.arcade.capsule(i)        14 x 14  a prize capsule (i = 0..3 colours): clear top, coloured bottom
//   PX.arcade.coinbag()         14 x 14  a little sack of coins with a red tie
//   PX.arcade.giftbox(i)        14 x 14  a fusion-item prize box with a ribbon and a bow (i = 0..3 colours)
//   PX.arcade.fishbag()         14 x 16  a water bag with a goldfish, tied at the top
//   PX.arcade.token()           12 x 12  a Claw token (a purple coin with a claw on it)
//   PX.arcade.rock()            14 x 10  Lane Sweep: a lawn rock to dodge
//   PX.arcade.sprinkler()       12 x 12  Lane Sweep: a lawn sprinkler head (the water is drawn by the game)
//   PX.arcade.plush(src, o)     24 x 24  a plushie: a real sprite (PX.sprig canvas) at half size on a felt cushion with stitches and a
//                                        heart tag. o.felt 'plant' (pink felt) | 'zombie' (mossy felt). NOT cached here: cache it yourself.
(function () {
  'use strict';
  if (!window.PX) return;
  const INK = PX.INK || '#3a2d34';
  const piece = PX.piece || function (G, draw) { const t = new PX.Grid(G.w, G.h, G.k); draw(t); t.outline(); G.merge(t); return G; };
  const soft = (t, cx, cy, rx, ry, R, o) => { if (PX.art && PX.art.softBody) PX.art.softBody(t, cx, cy, rx, ry, R, o); else t.ell(cx, cy, rx, ry, R[1]); };
  const line = (g, pts, w, col) => { for (let i = 1; i < pts.length; i++) PX.stroke(g, [pts[i - 1], pts[i]], w, w, col); };
  const twinkle = (g, x, y, col) => { g.dots([[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]], col); g.dot(x, y, '#ffffff'); };

  const cache = {};
  function make(key, w, h, draw) {
    if (key in cache) return cache[key];
    let c = null;
    try { const g = new PX.Grid(w, h); draw(g); c = g.canvas(); } catch (e) { console.error('PX.arcade', key, e); }
    if (!c) { try { const g = new PX.Grid(w, h); g.ell(w / 2, h / 2, w / 2 - 1, h / 2 - 1, ['#f6e6d0', '#e0c2a2', '#c09a80']); g.outline(); c = g.canvas(); } catch (e) { c = null; } }
    return (cache[key] = c);
  }

  // ---------------- vases ----------------
  // body / trim / pattern ramps: pastel terracotta, mint with a leaf badge, butter gold with sparkles
  const VASE = {
    clay: { body: ['#ffe8d2', '#f4b98e', '#d88f66'], trim: ['#fff2e4', '#e8a274', '#c47a54'], band: '#c97f58', dots: '#fff0e0' },
    leaf: { body: ['#eaf8d6', '#ade07e', '#7cbc5a'], trim: ['#f4fce8', '#92d06a', '#68a84c'], band: '#5f9c46', dots: '#f4ffe6' },
    gold: { body: ['#fff8d0', '#ffd862', '#e6a830'], trim: ['#fffbe6', '#f6c440', '#d09020'], band: '#d0901e', dots: '#fffbe0' },
  };
  function vaseArt(g, kind) {
    const V = VASE[kind] || VASE.clay;
    // the round belly (an off-round urn: a little fuller low down) and a short neck
    piece(g, t => { t.ell(9, 14.4, 7.6, 6.9, V.body[1]); t.ell(9, 12.2, 6.2, 5.6, V.body[1]); t.poly([[5.8, 6.4], [12.2, 6.4], [11.6, 9.4], [6.4, 9.4]], V.body[1]); soft(t, 9, 14, 7.6, 7.2, V.body); });
    // the lip on top (a flat rounded rim with the dark opening)
    piece(g, t => { t.ell(9, 5.6, 4.6, 1.7, V.trim[1]); soft(t, 9, 5.6, 4.6, 1.8, V.trim, { hl: false, shade: 0.3 }); });
    g.ell(9, 5.3, 3.0, 0.75, '#5a3e3a'); g.ell(8.4, 5.0, 1.4, 0.3, '#7a5650');
    // a little foot ring so it stands on the grass
    piece(g, t => { t.ell(9, 20.4, 4.6, 1.2, V.trim[2]); });
    // a wavy band round the belly + dots: the vase pattern
    const band = []; for (let x = 2.4; x <= 15.6; x += 0.6) band.push([x, 13.2 + Math.sin(x * 1.3) * 0.6]);
    line(g, band, 0.32, V.band);
    for (const x of [4.4, 7.2, 10, 12.8]) g.dot(x + 0.4, 16.2, V.dots);
    if (kind === 'leaf') { // a two-leaf sprout badge: "a plant lives in here"
      piece(g, t => { t.ell(7.6, 10.6, 1.8, 1.0, ['#f4ffe6', '#6cc04a', '#4c9a36'][1], 0.55); t.ell(10.4, 10.6, 1.8, 1.0, '#6cc04a', -0.55); });
      line(g, [[9, 12.2], [9, 10.8]], 0.3, '#4c9a36');
    }
    if (kind === 'gold') { twinkle(g, 5.2, 10.6, '#fffbe6'); g.dot(12.6, 9.6, '#ffffff'); }
    g.outerLine();
  }
  function vase(kind) { kind = VASE[kind] ? kind : 'clay'; return make('vase:' + kind, 18, 22, g => vaseArt(g, kind)); }
  // three curved pieces of a broken vase
  function shard(kind, i) {
    const V = VASE[kind] || VASE.clay; i = (i | 0) % 3;
    return make('shard:' + kind + i, 8, 7, g => {
      piece(g, t => {
        if (i === 0) t.poly([[0.6, 2.0], [6.8, 0.6], [5.6, 4.0], [2.2, 6.2]], V.body[1]);
        else if (i === 1) t.poly([[0.8, 0.8], [7.2, 2.6], [3.2, 6.4]], V.body[1]);
        else t.poly([[2.0, 0.6], [7.0, 1.4], [6.4, 6.2], [0.8, 4.4]], V.body[1]);
        soft(t, 4, 3.4, 3.6, 3.0, V.body, { hl: false });
      });
      line(g, [[1.6, 3.0], [5.6, 2.4]], 0.28, V.band);
      g.outerLine();
    });
  }

  // ---------------- the whack hole (back + front lip) ----------------
  const DIRT = ['#e8cdb4', '#c8a084', '#a27e66'];
  function hole(part) {
    part = part === 'front' ? 'front' : 'back';
    return make('hole:' + part, 24, 12, g => {
      if (part === 'back') {
        piece(g, t => { t.ell(12, 6.2, 10.6, 4.4, DIRT[1]); soft(t, 12, 6.2, 10.6, 4.4, DIRT, { hl: false }); });
        g.ell(12, 6.0, 8.2, 2.9, '#4e3532'); g.ell(12, 6.6, 7.4, 2.2, '#3a2828'); g.ell(10.4, 5.0, 4.4, 0.6, '#6a4a44');
        g.outerLine();
      } else {
        // only the near half of the dirt RING (the dark hole stays open), with clods and grass tufts: a zombie clipped to the hole's
        // upper half + its dark opening looks like it stands IN the hole
        const rim = (x, y) => y >= 6.0 && ((x - 12) / 8.2) * ((x - 12) / 8.2) + ((y - 6.0) / 2.9) * ((y - 6.0) / 2.9) >= 1;
        piece(g, t => { t.ell(12, 6.2, 10.6, 4.4, DIRT[1], 0, rim); t.ell(4.2, 8.6, 2.6, 1.8, DIRT[1]); t.ell(19.6, 8.4, 2.8, 1.9, DIRT[1]); soft(t, 12, 7.4, 10.8, 3.6, DIRT, { hl: false, mask: rim }); });
        line(g, [[6.2, 9.4], [7.8, 9.0], [9.0, 9.8], [11.2, 9.0], [12.6, 9.6], [14.6, 8.9], [16.4, 9.5]], 0.28, '#8e6a56');
        piece(g, t => { t.poly([[1.0, 9.6], [1.8, 7.0], [2.6, 9.2], [3.4, 6.6], [4.0, 9.6]], '#92d06a'); t.poly([[20.0, 9.4], [20.8, 6.8], [21.6, 9.0], [22.4, 7.2], [23.0, 9.6]], '#92d06a'); });
        g.outerLine();
      }
    });
  }

  // ---------------- the bonk mallet ----------------
  function mallet() {
    return make('mallet', 20, 20, g => {
      const W = ['#ffeacc', '#e8b47c', '#c08452'], H = ['#fff4e0', '#d8a06a', '#b07a48'];
      piece(g, t => { PX.stroke(t, [[8.4, 8.4], [17.8, 17.8]], 1.7, 1.4, H[1]); });
      // the barrel head lies ACROSS the handle (from lower-left to upper-right), with rounded ends and two dark bands
      piece(g, t => { t.poly([[1.2, 8.6], [8.6, 1.2], [12.8, 5.4], [5.4, 12.8]], W[1]); t.ell(3.3, 10.7, 2.95, 2.95, W[1]); t.ell(10.7, 3.3, 2.95, 2.95, W[1]); soft(t, 7, 7, 6.4, 6.4, W); });
      line(g, [[2.9, 7.1], [6.9, 11.1]], 0.42, W[2]); line(g, [[7.1, 2.9], [11.1, 6.9]], 0.42, W[2]);
      g.dot(4.6, 5.0, '#ffffff'); g.dot(5.2, 4.4, '#ffffff');
      g.outerLine();
    });
  }

  // ---------------- a sun to tap ----------------
  function sun() {
    return make('sun', 16, 16, g => {
      const S = ['#fffbd0', '#ffe04a', '#f4b42a'];
      piece(g, t => { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; t.ell(8 + Math.cos(a) * 5.4, 8 + Math.sin(a) * 5.4, 1.9, 1.3, S[2], a); } });
      piece(g, t => { t.ell(8, 8, 5.0, 5.0, S[1]); soft(t, 8, 8, 5.0, 5.0, S); });
      g.ell(8, 8, 2.6, 2.6, '#fff4a0'); g.dot(6.0, 5.6, '#ffffff'); g.dot(6.5, 5.2, '#ffffff');
      g.outerLine();
    });
  }

  // ---------------- the bowling start line's marker (a little red flag flower) ----------------
  function alley() {
    return make('alley', 12, 10, g => {
      piece(g, t => { for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; t.ell(6 + Math.cos(a) * 2.2, 4 + Math.sin(a) * 2.0, 1.7, 1.5, '#ff8e9a'); } soft(t, 6, 4, 3.8, 3.6, ['#ffd0d6', '#ff8e9a', '#e0606e'], { hl: false }); });
      g.ell(6, 4, 1.2, 1.1, '#ffe27a');
      piece(g, t => { t.ell(3.4, 8.4, 2.0, 0.9, '#92d06a', -0.3); t.ell(8.6, 8.4, 2.0, 0.9, '#92d06a', 0.3); });
      g.outerLine();
    });
  }

  // ---------------- shared: a rounded rectangle piece ----------------
  function rrect(t, x, y, w, h, r, col) {
    t.poly([[x + r, y], [x + w - r, y], [x + w, y + r], [x + w, y + h - r], [x + w - r, y + h], [x + r, y + h], [x, y + h - r], [x, y + r]], col);
    for (const [cx, cy] of [[x + r, y + r], [x + w - r, y + r], [x + r, y + h - r], [x + w - r, y + h - r]]) t.ell(cx, cy, r, r, col);
  }

  // ---------------- Glow Drop: the Glowpetal's flower pot, and the cone / bucket a zombie throws ----------------
  function pot() {
    return make('pot', 26, 16, g => {
      const C = ['#ffd8bc', '#f0a070', '#c8744a'], R = ['#ffe2cc', '#f6b282', '#d88a5c'];
      piece(g, t => { t.poly([[3.6, 4.4], [22.4, 4.4], [19.4, 15.2], [6.6, 15.2]], C[1]); t.ell(13, 14.4, 6.6, 1.0, C[1]); soft(t, 13, 9.4, 9.8, 6.2, C, { hl: false }); });
      piece(g, t => { rrect(t, 1.2, 1.0, 23.6, 4.8, 2.2, R[1]); soft(t, 13, 3.2, 12.2, 2.6, R, { hl: false, shade: 0.3 }); });
      g.dots([[4, 2.2], [5, 2.0], [6, 2.0], [7, 2.0]], '#fff1e4');
      // a little heart sticker on the pot's belly
      piece(g, t => { t.ell(11.9, 9.0, 1.6, 1.5, '#ff9ab4'); t.ell(14.1, 9.0, 1.6, 1.5, '#ff9ab4'); t.poly([[10.5, 9.5], [15.5, 9.5], [13, 12.4]], '#ff9ab4'); });
      g.dot(11.4, 8.6, '#ffffff');
      g.outerLine();
    });
  }
  function cone() {
    return make('cone', 14, 16, g => {
      piece(g, t => { t.poly([[6.0, 1.0], [8.0, 1.0], [12.0, 13.4], [2.0, 13.4]], '#ffa04a'); t.ell(7, 1.6, 1.2, 0.9, '#ffa04a'); soft(t, 7, 8, 5.4, 7.0, ['#ffd0a0', '#ffa04a', '#e0702a'], { hl: false }); });
      piece(g, t => { t.poly([[4.6, 5.2], [9.4, 5.2], [10.1, 7.6], [3.9, 7.6]], '#fff6ea'); });
      piece(g, t => { rrect(t, 0.6, 12.4, 12.8, 3.0, 1.2, '#f08a3a'); soft(t, 7, 13.9, 6.4, 1.6, ['#ffc890', '#f08a3a', '#c8642a'], { hl: false }); });
      g.dots([[5.6, 3.0], [5.2, 4.0], [4.6, 9.0]], '#ffffff');
      g.outerLine();
    });
  }
  function bucket() {
    return make('bucket', 16, 15, g => {
      const M = ['#eef4fa', '#b8c8d8', '#8496ac'];
      PX.stroke(g, [[2.6, 4.6], [3.8, 1.4], [8, 0.6], [12.2, 1.4], [13.4, 4.6]], 0.55, 0.55, '#6a7a8e');
      piece(g, t => { t.poly([[1.6, 4.0], [14.4, 4.0], [12.8, 14.2], [3.2, 14.2]], M[1]); soft(t, 8, 9, 6.4, 5.6, M); });
      piece(g, t => { t.ell(8, 4.2, 6.7, 1.6, '#d6e2ee'); });
      g.ell(8, 4.2, 5.2, 0.8, '#6a7a8e');
      line(g, [[2.7, 8.4], [13.3, 8.4]], 0.3, M[2]); line(g, [[3.0, 11.6], [13.0, 11.6]], 0.3, M[2]);
      g.dots([[4.4, 6.0], [4.4, 7.0], [4.6, 10.0]], '#ffffff');
      g.outerLine();
    });
  }

  // ---------------- Leaf Match: seed-packet cards ----------------
  const PACK = {
    back: { body: ['#d8f4c0', '#8fd46a', '#5ea844'], band: '#4e9a3a' },
    face: { body: ['#fffdf6', '#fbefd2', '#e2cfa4'], band: '#8fd46a' },
    zombie: { body: ['#efe4ff', '#c8b4ec', '#9a84c8'], band: '#7ea070' },
  };
  function packet(kind) {
    kind = PACK[kind] ? kind : 'back';
    const P = PACK[kind];
    return make('packet:' + kind, 24, 30, g => {
      piece(g, t => { rrect(t, 1, 1, 22, 28, 3.4, P.body[1]); soft(t, 12, 15, 11.2, 14.2, P.body, { hl: false, shade: 0.22 }); });
      piece(g, t => { rrect(t, 3, 3, 18, 4.6, 1.8, P.band); });
      g.dots([[4.8, 4.4], [5.8, 4.4], [6.8, 4.4]], '#ffffff');
      if (kind === 'back') { // a sprout badge in a white circle: "a plant is hiding here"
        piece(g, t => { t.ell(12, 18, 6.8, 6.8, '#f4ffe8'); });
        line(g, [[12, 22.6], [12, 17.4]], 0.5, '#4c9a36');
        piece(g, t => { t.ell(9.6, 16.4, 2.9, 1.6, '#6cc04a', 0.55); t.ell(14.4, 16.4, 2.9, 1.6, '#6cc04a', -0.55); });
        g.dots([[8.6, 15.8], [13.4, 15.8]], '#d4f8b0');
        twinkle(g, 18.6, 24.6, '#ffffff');
      } else { // a pale window the plant (or zombie) stands in
        piece(g, t => { rrect(t, 3.4, 9.2, 17.2, 17.6, 2.6, kind === 'zombie' ? '#f6f0ff' : '#ffffff'); });
        g.ell(12, 24.4, 6.0, 1.3, kind === 'zombie' ? '#e2d6f6' : '#eaf6dc');
      }
      g.outerLine();
    });
  }

  // ---------------- Seedshot Stall: a green pea splat ----------------
  function splat() {
    return make('splat', 16, 12, g => {
      piece(g, t => {
        t.ell(8, 6, 5.0, 3.6, '#8ee05a');
        for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.3; t.ell(8 + Math.cos(a) * 5.2, 6 + Math.sin(a) * 3.7, 1.5, 1.3, '#8ee05a'); }
        soft(t, 8, 6, 6.4, 4.8, ['#d4f8b0', '#8ee05a', '#5cb43a'], { hl: false });
      });
      g.dot(6, 4, '#ffffff'); g.dot(6.5, 3.5, '#ffffff');
      g.outerLine();
    });
  }

  // ---------------- the hub: a chunky gold padlock for locked cabinets ----------------
  function padlock() {
    return make('padlock', 16, 18, g => {
      piece(g, t => { PX.stroke(t, [[4.3, 9.4], [4.3, 5.8], [5.4, 2.8], [8, 1.6], [10.6, 2.8], [11.7, 5.8], [11.7, 9.4]], 1.5, 1.5, '#c8d2de'); });
      piece(g, t => { rrect(t, 1.6, 7.6, 12.8, 9.6, 2.6, '#ffd04a'); soft(t, 8, 12.4, 6.4, 4.8, ['#fff2b0', '#ffd04a', '#d89a20'], { hl: false }); });
      g.ell(8, 11.6, 1.4, 1.4, '#5a3e2a'); g.poly([[7.3, 12.0], [8.7, 12.0], [9.1, 14.8], [6.9, 14.8]], '#5a3e2a');
      g.dots([[3.4, 9.6], [3.4, 10.6], [3.4, 11.6]], '#ffffff');
      g.outerLine();
    });
  }

  // ---------------- Claw Machine ----------------
  const METAL = ['#f4f8fc', '#c4ceda', '#8e9aac'];
  function claw(part) {
    const shut = part === 'shut';
    return make('claw:' + (shut ? 's' : 'o'), 22, 18, g => {
      const prong = pts => piece(g, t => { PX.stroke(t, pts, 1.35, 1.0, METAL[1]); });
      if (shut) { prong([[8.4, 6], [5.6, 9.6], [6.4, 14.2], [8.8, 16.4]]); prong([[13.6, 6], [16.4, 9.6], [15.6, 14.2], [13.2, 16.4]]); prong([[11, 7], [11, 15.6]]); }
      else { prong([[8.4, 6], [4.0, 9.4], [2.4, 13.8], [3.8, 16.4]]); prong([[13.6, 6], [18.0, 9.4], [19.6, 13.8], [18.2, 16.4]]); prong([[11, 7], [11, 15.2]]); }
      piece(g, t => { rrect(t, 5.6, 1.2, 10.8, 6.2, 2.4, '#ff8ab0'); soft(t, 11, 4.3, 5.4, 3.1, ['#ffd0e0', '#ff8ab0', '#d85a88'], { hl: false }); });
      g.dots([[8, 2.8], [9, 2.8]], '#ffffff'); g.dot(11, 5.2, '#fff27a');
      g.outerLine();
    });
  }
  const CAPS = [['#ffe0e6', '#ff8aa0', '#d85a74'], ['#e0f0ff', '#7cc0f4', '#4a8ccc'], ['#fff4c8', '#ffd04a', '#d89a20'], ['#e4f8d8', '#8fd46a', '#5ea844']];
  function capsule(i) {
    i = Math.abs(i | 0) % CAPS.length; const C = CAPS[i];
    return make('capsule:' + i, 14, 14, g => {
      const lo = (x, y) => y >= 7, hi = (x, y) => y < 7;
      piece(g, t => { t.ell(7, 7, 6, 6, '#eef6fc', 0, hi); t.ell(7, 7, 6, 6, C[1], 0, lo); soft(t, 7, 7, 6, 6, C, { hl: false, mask: lo }); });
      g.ell(7, 5.0, 2.2, 1.5, C[0]); g.dot(6.4, 4.6, '#ffffff');
      line(g, [[1.4, 7], [12.6, 7]], 0.35, C[2]);
      g.dots([[3.6, 3.4], [4.2, 2.8]], '#ffffff');
      g.outerLine();
    });
  }
  function coinbag() {
    return make('coinbag', 14, 14, g => {
      const S = ['#fff0d8', '#e8c088', '#b88a54'];
      piece(g, t => { t.ell(7, 9.3, 5.6, 4.5, S[1]); t.poly([[4.8, 4.8], [9.2, 4.8], [8.6, 6.8], [5.4, 6.8]], S[1]); soft(t, 7, 9.2, 5.6, 4.7, S, { hl: false }); });
      piece(g, t => { t.ell(5.0, 3.4, 1.7, 1.4, S[1]); t.ell(9.0, 3.4, 1.7, 1.4, S[1]); t.ell(7, 2.8, 1.4, 1.4, S[1]); });
      line(g, [[4.9, 5.8], [9.1, 5.8]], 0.5, '#e0505a');
      piece(g, t => { t.ell(7, 9.8, 2.5, 2.5, '#ffd23a'); soft(t, 7, 9.8, 2.5, 2.5, ['#fff6b0', '#ffd23a', '#d89a20'], { hl: false }); });
      g.dot(6.4, 9.2, '#fff8c0'); g.dots([[3.8, 8.2], [3.8, 9.2]], '#fff6e6');
      g.outerLine();
    });
  }
  const BOX = [['#ffe6f0', '#ff9ec4', '#d8689a'], ['#e6f0ff', '#8cb8f8', '#5a86d0'], ['#f0e8ff', '#c4a4f4', '#8e6ccc'], ['#e8fae0', '#9edc78', '#68ac4c']];
  function giftbox(i) {
    i = Math.abs(i | 0) % BOX.length; const B = BOX[i];
    return make('giftbox:' + i, 14, 14, g => {
      piece(g, t => { rrect(t, 1.6, 5.2, 10.8, 8.0, 1.4, B[1]); soft(t, 7, 9.2, 5.4, 4.0, B, { hl: false }); });
      piece(g, t => { rrect(t, 1.0, 4.0, 12.0, 2.8, 1.0, B[0]); });
      piece(g, t => { t.poly([[6.0, 4.0], [8.0, 4.0], [8.0, 13.2], [6.0, 13.2]], '#ffd23a'); });
      piece(g, t => { t.ell(4.8, 2.6, 2.2, 1.5, '#ffd23a', -0.4); t.ell(9.2, 2.6, 2.2, 1.5, '#ffd23a', 0.4); t.ell(7, 3.4, 1.1, 1.0, '#ffd23a'); });
      g.dots([[3.0, 7.0], [3.0, 8.0]], '#ffffff');
      g.outerLine();
    });
  }
  function fishbag() {
    return make('fishbag', 14, 16, g => {
      piece(g, t => { t.ell(7, 10.2, 5.6, 5.0, '#d8f0ff'); t.poly([[5.4, 3.6], [8.6, 3.6], [9.8, 6.4], [4.2, 6.4]], '#eaf8ff'); });
      g.ell(7, 11.2, 4.8, 3.6, '#a8dcf8'); g.ell(7, 8.0, 4.4, 0.5, '#c8ecff');
      piece(g, t => { t.ell(7.4, 11.0, 2.4, 1.6, '#ff9a3a'); t.poly([[4.4, 9.6], [5.4, 11.0], [4.4, 12.4]], '#ff9a3a'); soft(t, 7.4, 11, 2.4, 1.6, ['#ffd0a0', '#ff9a3a', '#e0702a'], { hl: false }); });
      g.dot(8.6, 10.6, '#3a2d34');
      line(g, [[5.4, 3.6], [8.6, 3.6]], 0.5, '#e0505a'); piece(g, t => { t.ell(7, 2.2, 1.6, 1.1, '#eaf8ff'); });
      g.dots([[3.4, 8.6], [3.4, 9.6], [3.8, 10.6]], '#ffffff');
      g.outerLine();
    });
  }
  function token() {
    return make('token', 12, 12, g => {
      piece(g, t => { t.ell(6, 6, 5.2, 5.2, '#b88af4'); soft(t, 6, 6, 5.2, 5.2, ['#e8d8ff', '#b88af4', '#7a54c4']); });
      g.ell(6, 6, 3.6, 3.6, '#a070e8');
      PX.stroke(g, [[6, 2.8], [6, 4.6]], 0.5, 0.5, '#ffffff');
      PX.stroke(g, [[6, 4.6], [4.0, 6.4], [4.6, 8.6]], 0.55, 0.45, '#ffffff'); PX.stroke(g, [[6, 4.6], [8.0, 6.4], [7.4, 8.6]], 0.55, 0.45, '#ffffff');
      g.dots([[3.2, 3.4], [3.8, 2.8]], '#ffffff');
      g.outerLine();
    });
  }
  // ---------------- Lane Sweep: things on the lawn to dodge ----------------
  function rock() {
    return make('rock', 14, 10, g => {
      const R = ['#eef0f4', '#b8bcc8', '#868a9c'];
      piece(g, t => { t.ell(7.4, 6.4, 6.0, 3.4, R[1]); t.ell(5.6, 4.8, 3.6, 3.0, R[1]); t.ell(9.4, 5.2, 3.0, 2.6, R[1]); soft(t, 7, 5.8, 6.2, 3.8, R); });
      g.dots([[4.4, 3.2], [5.2, 2.8]], '#ffffff'); line(g, [[8.8, 5.6], [10.2, 6.8]], 0.3, R[2]);
      piece(g, t => { t.poly([[1.0, 9.4], [1.8, 7.6], [2.6, 9.4]], '#92d06a'); t.poly([[11.2, 9.4], [12.0, 7.4], [12.8, 9.4]], '#92d06a'); });
      g.outerLine();
    });
  }
  function sprinkler() {
    return make('sprinkler', 12, 12, g => {
      piece(g, t => { t.ell(6, 10.0, 5.0, 1.8, '#7cc05a'); soft(t, 6, 10, 5, 1.8, ['#c8f0a0', '#7cc05a', '#5ea844'], { hl: false }); });
      piece(g, t => { rrect(t, 4.6, 4.6, 2.8, 5.4, 1.0, '#ffd04a'); soft(t, 6, 7.2, 1.4, 2.8, ['#fff2b0', '#ffd04a', '#d89a20'], { hl: false }); });
      piece(g, t => { t.ell(6, 4.2, 2.6, 1.6, '#8ab8e8'); soft(t, 6, 4.2, 2.6, 1.6, ['#d8ecff', '#8ab8e8', '#5a86c0'], { hl: false }); });
      g.dots([[3.6, 3.8], [8.4, 3.8], [6, 2.6]], '#2a4a6a'); g.dot(5.2, 6.2, '#ffffff');
      g.outerLine();
    });
  }
  // ---------------- plushies: a real sprite at half size on a felt cushion ----------------
  const FELT = { plant: ['#fff0f4', '#ffc6d4', '#e894ac'], zombie: ['#eef4e2', '#b4c8a0', '#86a070'] };
  function plush(src, o) {
    o = o || {}; const F = FELT[o.felt] || FELT.plant;
    let c = null;
    try {
      const g = new PX.Grid(24, 24);
      piece(g, t => { t.ell(12, 19.2, 10.6, 4.4, F[1]); t.ell(4.4, 21.4, 2.4, 1.6, F[1]); t.ell(19.6, 21.4, 2.4, 1.6, F[1]); soft(t, 12, 19.2, 10.6, 4.4, F, { hl: false }); });
      for (let x = 3.5; x <= 20.5; x += 2) g.dot(x, 19.0 + Math.sin((x - 3.5) / 17 * Math.PI) * 1.6, '#ffffff');
      g.outerLine();
      c = g.canvas();
      if (src && src.width) {
        const x = c.getContext('2d'), k = c.k || 1, sk = src.k || 1, sw = src.width / sk, sh = src.height / sk, s = 0.5;
        x.imageSmoothingEnabled = false;
        const dw = Math.round(sw * s * k), dh = Math.round(sh * s * k);
        x.drawImage(src, Math.round((24 * k - dw) / 2), Math.round(20.2 * k - dh), dw, dh);
      }
      // the heart tag sewn on the front
      const tg = new PX.Grid(24, 24);
      piece(tg, t => { t.ell(18.4, 19.6, 1.3, 1.2, '#ff6b8a'); t.ell(20.2, 19.6, 1.3, 1.2, '#ff6b8a'); t.poly([[17.2, 20.0], [21.4, 20.0], [19.3, 22.4]], '#ff6b8a'); });
      tg.dot(18.0, 19.2, '#ffffff'); tg.outerLine();
      const tc = tg.canvas(); c.getContext('2d').drawImage(tc, 0, 0);
    } catch (e) { console.error('PX.arcade.plush', e); }
    return c;
  }

  PX.arcade = { vase, shard, hole, mallet, sun, alley, pot, cone, bucket, packet, splat, padlock, claw, capsule, coinbag, giftbox, fishbag, token, rock, sprinkler, plush, KINDS: Object.keys(VASE) };
  void INK;
})();
