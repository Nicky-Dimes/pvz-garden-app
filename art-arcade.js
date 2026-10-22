// art-arcade.js — PVZ Garden: mini-game arcade art (Wall-nut Bowling, Whack-a-Zombie, Vasebreaker).
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
//   PX.arcade.alley()           12 x 10  a red bowling-line marker flower for the Wall-nut Bowling start line
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

  PX.arcade = { vase, shard, hole, mallet, sun, alley, KINDS: Object.keys(VASE) };
  void INK;
})();
