// art-core.js — PVZ Garden art core. Loaded after pixel.js (and before art-plants.js / art-zombies.js / art-world.js).
// Plants and zombies are drawn on the same 32x32 canvas as the old Sprouts (anchor: feet at 16,31), so every screen that calls
// PX.sprig(look, pose) draws them unchanged. PX.sprig dispatches on the look:
//   { zombie: 'conehead', ... }                       -> PX.ZOMBIE_ART (art-zombies.js)
//   { species: 'peashooter', stage: 0|1|2, element, skin, shiny, fuse: { with: speciesId, item: itemId } } -> plants
// ART FACES RIGHT. Screens flip a sprite when it should face left.
//
// SPECIES ART CONTRACT (art-plants.js): PX.PLANT_ART[id] = function (g, stage, P, C) -> geom
//   g      PX.Grid(32, 32). Draw the whole plant (stem, leaves, feet, head, face) and ink-outline it (g.outline() / PX.piece()).
//   stage  0 (small, about 20 px tall), 1 (about 24 px), 2 (about 28 px, the top of the art no higher than y = 3).
//   P      pose: frame (0|1: idle bob / walk step), walk (bool), eyes, mouth, arms ('up' | 'out' | 'down' | 'hold': leaf pose).
//   C      colours: { main, leaf, acc } 3-tone ramps [light, mid, dark] (an element or a fusion may swap main / leaf), plus
//          C.stem, C.root single colours. Use C.main for the plant's signature colour so elements can recolour it.
//   geom   { hx, hy, hr, top, ey } head centre + radius, top row of the art, eye row. Overlays (hats, fusion parts, element
//          effects) are placed from it. Optional: hat {x, y, w} (where headgear sits), front (x where the face points).
// Helpers for species art: PX.art.face / feet / leaf / stemTo / pal.
(function () {
  'use strict';
  const { Grid, RAMPS, INK, stroke, line, starPts } = PX;
  const piece = (G, draw) => { const t = new Grid(G.w, G.h); draw(t); t.outline(); G.merge(t); return G; };
  const under = (a, b) => { for (let i = 0; i < a.a.length; i++) if (a.a[i] === null && b.a[i] !== null) a.a[i] = b.a[i]; };
  function mixHex(a, b, k) {
    try { const p = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)), A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); } catch (e) { return a; }
  }
  const lum = c => { if (typeof c !== 'string' || c[0] !== '#') return 0.5; const n = parseInt(c.slice(1), 16); return ((n >> 16 & 255) * 0.3 + (n >> 8 & 255) * 0.59 + (n & 255) * 0.11) / 255; };
  const WHITE = '#ffffff', MOUTH = '#d95763', SHINE = '#3f4aa0';
  const LEAF = ['#a6ec70', '#5cb43a', '#2f7a4a'];

  // ---------------- face ----------------
  // Two eyes (2 wide x 3 tall) at columns x and x + gap, rows y..y+2; optional mouth and cheeks.
  // o: { gap: 4, mouth: [x, y, w] | null, cheeks: [x1, x2, y] | null, one: true (side view: front eye only), pupil: colour }
  function face(g, x, y, P, o) {
    o = o || {}; P = P || {};
    const gap = o.gap == null ? 4 : o.gap, k = INK, ey = P.eyes;
    const eye = (a, left) => {
      const b = a + 1;
      switch (ey) {
        case 'happy': g.px([[a, y + 1], [b, y + 1], [a - 1, y + 2], [b + 1, y + 2]], k); break;
        case 'closed': g.px([[a, y + 2], [b, y + 2], [a - 1, y + 1], [b + 1, y + 1]], k); break;
        case 'blink': g.px([[a, y + 2], [b, y + 2]], k); break;
        case 'sleepy': g.px([[a, y + 1], [b, y + 1], [a, y + 2], [b, y + 2], [a - 1, y + 1], [b + 1, y + 1]], k); break;
        default:
          g.px([[a, y], [b, y], [a, y + 1], [b, y + 1], [a, y + 2], [b, y + 2]], k); g.set(a, y, WHITE); g.set(b, y + 2, o.pupil || SHINE);
          if (ey === 'brave') { if (left) g.px([[a - 1, y - 2], [a, y - 2], [b, y - 1]], k); else g.px([[b + 1, y - 2], [b, y - 2], [a, y - 1]], k); }
          if (ey === 'sad') { if (left) g.px([[a - 1, y - 1], [a, y - 2], [b, y - 2]], k); else g.px([[b + 1, y - 1], [b, y - 2], [a, y - 2]], k); }
      }
    };
    if (!o.one) eye(x, true);
    eye(o.one ? x : x + gap, false);
    if (o.cheeks) { const [c1, c2, cy] = o.cheeks; g.px([[c1, cy], [c2, cy]].filter(([a, b]) => g.filled(a, b)), o.cheek || '#f4a3b8'); }
    if (o.mouth) mouth(g, o.mouth[0], o.mouth[1], o.mouth[2] || 4, P.mouth);
  }
  function mouth(g, x, y, w, kind) {
    const k = INK;
    switch (kind) {
      case 'open': g.px([[x, y], [x + w - 1, y]], k); for (let i = 1; i < w - 1; i++) { g.set(x + i, y + 1, k); g.set(x + i, y, MOUTH); } break;
      case 'o': { const c = x + Math.floor(w / 2) - 1; g.px([[c, y], [c + 1, y], [c, y + 1], [c + 1, y + 1]], k); break; }
      case 'flat': for (let i = 1; i < w - 1; i++) g.set(x + i, y + 1, k); break;
      case 'grin': g.px([[x, y], [x + w - 1, y]], k); for (let i = 1; i < w - 1; i++) { g.set(x + i, y + 1, k); g.set(x + i, y, WHITE); } break;
      case 'frown': g.set(x, y + 1, k); for (let i = 1; i < w - 1; i++) g.set(x + i, y, k); g.set(x + w - 1, y + 1, k); break;
      default: g.set(x, y, k); for (let i = 1; i < w - 1; i++) g.set(x + i, y + 1, k); g.set(x + w - 1, y, k);
    }
  }
  // an angry face (Cactus, Coconut Cannon, Lightning Reed): eyebrows slanting down to the middle (kept when it blinks), a frown,
  // gritted teeth when it attacks or cheers, no rosy cheeks
  function madFace(g, x, y, P, o) {
    o = o || {}; P = P || {};
    const gap = o.gap == null ? 3 : o.gap, e = P.eyes, eyes = e === 'sad' || e === 'blink' || e === 'closed' ? e : 'brave';
    face(g, x, y, Object.assign({}, P, { eyes }), { gap });
    if (eyes === 'blink' || eyes === 'closed') { g.px([[x - 1, y], [x, y], [x + 1, y + 1]], INK); g.px([[x + gap + 2, y], [x + gap + 1, y], [x + gap, y + 1]], INK); }
    else if (eyes === 'brave' && !o.soft) { // a proper scowl: thick brows meeting in a V and pressing down on the eyes (the kids said the thin ones didn't read as mad)
      const a = x, b = a + 1, c = x + gap, d = c + 1;
      g.px([[a - 1, y - 2], [a, y - 2], [a, y - 1], [b, y - 1], [b + 1, y], [d + 1, y - 2], [d, y - 2], [d, y - 1], [c, y - 1], [c - 1, y], [a, y], [c, y]], INK);
      g.set(a, y + 1, WHITE); g.set(c, y + 1, WHITE);
    }
    if (o.mouth) mouth(g, o.mouth[0], o.mouth[1], o.mouth[2] || 4, P.mouth === 'open' || P.mouth === 'grin' ? 'grin' : P.mouth === 'o' ? 'o' : 'frown');
  }
  // mushrooms have no feet: the stalk flares out to meet the ground (it squashes a little as it walks)
  function shroomFoot(g, cx, P, ramp, w) {
    const sq = P && P.walk && P.frame ? 1 : 0;
    g.ell(cx + sq * 0.5, 28.7 + sq * 0.2, w + sq * 0.4, 1.9 - sq * 0.2, ramp);
  }
  // little root feet (walk: one lifts). cx = centre between the feet.
  function feet(g, cx, P, col, spread) {
    const s = spread || 3.2, l = P && P.walk && P.frame ? -1 : 0, r = P && P.walk && !P.frame ? -1 : 0, c = col || '#8f563b';
    const R = Array.isArray(c) ? c : [mixHex(c, '#ffffff', 0.25), c, mixHex(c, INK, 0.35)];
    g.ell(cx - s, 29.4 + l, 2.3, 1.5, R); g.ell(cx + s, 29.4 + r, 2.3, 1.5, R);
  }
  // a leaf from (x, y): length len, angle ang (radians, 0 = right, negative = up)
  function leaf(g, x, y, len, ang, ramp, fat) { g.ell(x + Math.cos(ang) * len / 2, y + Math.sin(ang) * len / 2, len / 2, len * (fat || 0.27), ramp || LEAF, ang); }
  // two base leaves for the leaf pose (up = cheering, out = arms out, default resting)
  function baseLeaves(g, cx, y, P, ramp, len) {
    const a = P && P.arms, L2 = len || 5.5;
    const ang = a === 'up' ? 0.95 : a === 'out' ? 0.15 : a === 'hold' ? -0.35 : -0.35;
    leaf(g, cx - 1, y, L2, Math.PI + ang, ramp); leaf(g, cx + 1, y, L2, -ang, ramp);
  }
  function stemTo(g, pts, col, r) { stroke(g, pts, r || 0.9, (r || 0.9) * 0.85, col || '#4f9a3e'); }

  // ---------------- colours ----------------
  // Element colours: main replaces the plant's signature colour, leaf its leaves (an element plant is recoloured all over).
  const EL_PAL = {
    fire: { main: ['#ffd27a', '#f2742a', '#b8321e'], leaf: ['#ffb35a', '#d8501e', '#8a2a16'] },
    water: { main: ['#c4f6ff', '#4fc4ee', '#2a6fc0'], leaf: ['#9ee8e0', '#3fae9e', '#1f6a70'] },
    ice: { main: ['#f4fcff', '#a8e4fa', '#5aa2d8'], leaf: ['#d8f4ff', '#8cc8e8', '#4a86b8'] },
    electric: { main: ['#fffbb0', '#f8dc2c', '#c08a10'], leaf: ['#e8f070', '#b4c42a', '#6a7a1c'] },
    laser: { main: ['#ffc0d0', '#ff4a6a', '#b0183e'], leaf: ['#d0c8ff', '#8a7af0', '#4a3ca8'] },
    poison: { main: ['#e8c0ff', '#a45ad8', '#5e2a8e'], leaf: ['#c0f070', '#74b03a', '#3a6a2a'] },
    magic: { main: ['#ffdcfa', '#f08ae0', '#a8449e'], leaf: ['#d0b8ff', '#9070e0', '#5a3aa8'] },
    dark: { main: ['#9a8ab8', '#56487a', '#2c2448'], leaf: ['#74649a', '#463a6c', '#241e3e'] },
    rock: { main: ['#ddd6ca', '#a0968a', '#645c54'], leaf: ['#bab29a', '#7c7662', '#4a4638'] },
    robot: { main: ['#eef2fa', '#a8b4c8', '#5e6a80'], leaf: ['#c8d0dc', '#808ca0', '#4a5468'] },
    normal: { main: ['#fffaf0', '#ece0cc', '#b4a48c'], leaf: null },
  };
  const PLANT_PAL = {}; // filled by art-plants.js: PLANT_PAL[id] = { main, leaf, acc, stem, root }
  function pal(species, element, fuseWith) {
    const base = PLANT_PAL[species] || PLANT_PAL.peashooter || { main: RAMPS.leaf, leaf: LEAF, acc: RAMPS.sun };
    const C = { main: base.main, leaf: base.leaf || LEAF, acc: base.acc || base.main, stem: base.stem || '#4f9a3e', root: base.root || '#8f563b' };
    if (fuseWith && PLANT_PAL[fuseWith]) { const F = PLANT_PAL[fuseWith]; C.leaf = F.fuseLeaf || F.main; C.stem = mixHex(C.stem, F.main[2], 0.4); }
    const E = element && EL_PAL[element];
    if (E) { C.main = E.main; if (E.leaf) { C.leaf = E.leaf; C.stem = E.leaf[2]; } }
    return C;
  }

  // ---------------- overlays ----------------
  // where headgear sits: bottom-centre x, y and width
  const hatAt = G => G.hat || { x: G.hx, y: Math.round(G.hy - G.hr * 0.55), w: Math.max(7, Math.round(G.hr * 1.9)) };
  // Element effects (drawn on their own outlined layer on top of the plant)
  const EL_FX = {
    fire(t, G, P) {
      const h = hatAt(G), x = h.x, y = h.y - 1, f = P.frame ? 1 : 0;
      t.poly([[x - 3, y + 1], [x - 2.5, y - 3], [x - 1, y - 1.5], [x, y - 5 - f], [x + 1.4, y - 1.6], [x + 2.8, y - 3.4 + f], [x + 3, y + 1]], '#f2742a');
      t.ell(x, y, 2.2, 1.6, '#ffd27a');
    },
    water(t, G) { const x = G.hx + Math.round(G.hr * 0.3), y = G.top - 3; t.ell(x, y + 1, 1.6, 1.7, ['#e0fbff', '#4fc4ee', '#2a6fc0']); t.poly([[x - 1.2, y + 0.5], [x + 1.2, y + 0.5], [x, y - 2]], '#4fc4ee'); },
    ice(t, G, P, onSkin) { // (deeper blue on a special-seed design, so it shows on pale crystal / ghost skins)
      const h = hatAt(G);
      for (const [dx, hh] of [[-2.5, 3.5], [0, 5], [2.5, 3.2]]) { const x = h.x + dx, y = h.y; t.poly([[x - 1.1, y], [x, y - hh], [x + 1.1, y]], onSkin ? '#5aaee6' : '#c8f0ff'); if (onSkin) t.set(Math.round(x), Math.round(y - hh + 1), '#ffffff'); }
    },
    electric(t, G) { const h = hatAt(G), x = h.x + 1, y = h.y - 1; t.poly([[x - 1, y - 6], [x + 2, y - 6], [x + 0.5, y - 3.5], [x + 2.5, y - 3.5], [x - 1.5, y + 1], [x - 0.2, y - 2.5], [x - 2, y - 2.5]], '#f8dc2c'); },
    laser(t, G) { const h = hatAt(G), x = h.x - 1, y = h.y; t.rect(x, y - 4, 1, 4, '#5e6a80'); t.ell(x + 0.5, y - 5, 1.6, 1.6, '#ff4a6a'); },
    poison(t, G) { const x = G.hx - 2, y = G.top - 2; t.ell(x, y, 1.4, 1.4, '#c080f0'); t.ell(x + 3, y - 2, 1, 1, '#c080f0'); },
    magic(t, G) { const h = hatAt(G); t.poly(starPts(h.x, h.y - 3, 3.2, 1.4, 5), '#fff27a'); },
    dark(t, G) { const h = hatAt(G); t.poly([[h.x - 3.4, h.y + 1], [h.x - 3.8, h.y - 3], [h.x - 1.6, h.y]], '#463a6c'); t.poly([[h.x + 3.4, h.y + 1], [h.x + 3.8, h.y - 3], [h.x + 1.6, h.y]], '#463a6c'); },
    rock(t, G) { const h = hatAt(G); t.ell(h.x - 1.5, h.y - 0.5, 2, 1.4, ['#ddd6ca', '#a0968a', '#645c54']); t.ell(h.x + 1.8, h.y - 1, 1.6, 1.2, ['#ddd6ca', '#a0968a', '#645c54']); },
    robot(t, G) { const h = hatAt(G), x = h.x; t.rect(x, h.y - 4, 1, 4, '#5e6a80'); t.ell(x + 0.5, h.y - 5, 1.4, 1.4, '#ffd23a'); },
  };
  // details painted after outlining (sparkles, drips, bolts on the body)
  function elDetails(g, el, G, P) {
    const on = (x, y) => g.filled(x, y);
    if (el === 'fire') { const h = hatAt(G); g.px([[h.x, h.y - 2], [h.x - 1, h.y - 1]].filter(([x, y]) => on(x, y)), '#fff6b0'); if (!g.get(h.x + 4, h.y - 6)) g.set(h.x + 4, h.y - 6 + (P.frame ? 1 : 0), '#ffb35a'); }
    if (el === 'ice') { for (const [x, y] of [[G.hx - G.hr + 1, G.hy - 1], [G.hx + 2, G.hy + G.hr - 1], [G.hx - 1, G.hy - G.hr + 2]]) if (on(x, y)) g.set(x, y, '#ffffff'); }
    if (el === 'electric') for (const [x, y] of [[G.hx + G.hr + 2, G.hy - 3], [G.hx - G.hr - 2, G.hy + 1], [G.hx + G.hr + 1, G.hy + 3]]) if (!g.get(x, y)) g.set(x, y + (P.frame ? -1 : 0), '#fff27a');
    if (el === 'poison') { const y = G.hy + G.hr; for (const x of [G.hx - 2, G.hx + 1]) if (on(x, y - 1) && !on(x, y + 1)) { g.set(x, y, '#a45ad8'); g.set(x, y + 1, '#c080f0'); } }
    if (el === 'magic') for (const [x, y] of [[G.hx - G.hr - 2, G.hy - 3], [G.hx + G.hr + 2, G.hy + 1], [G.hx - G.hr - 1, G.hy + 4]]) { if (g.get(x, y)) continue; g.set(x, y, '#fff27a'); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!g.get(x + a, y + b)) g.set(x + a, y + b, P.frame ? '#ffd8fa' : '#f08ae0'); }
    if (el === 'dark') for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (g.get(x, y) === WHITE && g.get(x, y + 1) === INK) g.set(x, y, '#ffe24a'); // glowing eyes
    if (el === 'robot') for (const [x, y] of [[G.hx - G.hr + 1, G.hy], [G.hx + 2, G.hy + G.hr - 2], [G.hx - 1, G.hy - G.hr + 2]]) if (on(x, y)) g.set(x, y, '#4a5468');
    if (el === 'rock') for (const [x, y] of [[G.hx - G.hr + 2, G.hy + 1], [G.hx + 1, G.hy + G.hr - 2], [G.hx - 2, G.hy - G.hr + 3], [G.hx + G.hr - 2, G.hy - 2]]) if (on(x, y)) g.set(x, y, '#645c54');
    if (el === 'water') for (const [x, y] of [[G.hx - 2, G.hy - G.hr + 2], [G.hx + G.hr - 2, G.hy + 1]]) if (on(x, y)) g.set(x, y, '#e0fbff');
    if (el === 'laser') { const h = hatAt(G); if (!g.get(h.x - 3, h.y - 5)) g.set(h.x - 3, h.y - 5, '#ffc0d0'); if (!g.get(h.x + 2, h.y - 6)) g.set(h.x + 2, h.y - 6, '#ffc0d0'); }
  }

  // Fusion parts: the trait a fused partner plant adds (data.js PLANTS[id].part). behind: true = drawn behind the plant.
  const PART = {
    petals: { behind: true, draw(t, G, F) { const R = F.main; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; t.ell(G.hx + Math.cos(a) * (G.hr + 1.6), G.hy + Math.sin(a) * (G.hr + 1.6), 2, 1.2, R, a); } } },
    leafcrown: { behind: true, draw(t, G, F) { for (const a of [-2.4, -1.9, -1.2, -0.7]) t.ell(G.hx + Math.cos(a) * (G.hr + 1.2), G.hy + Math.sin(a) * (G.hr + 1.2), 2.4, 1.3, F.leaf || F.main, a); } },
    spikes: { behind: true, draw(t, G, F) { for (let i = 0; i < 7; i++) { const a = -Math.PI + 0.25 + i * (Math.PI - 0.5) / 6, r = G.hr; t.poly([[G.hx + Math.cos(a - 0.22) * r, G.hy + Math.sin(a - 0.22) * r], [G.hx + Math.cos(a + 0.22) * r, G.hy + Math.sin(a + 0.22) * r], [G.hx + Math.cos(a) * (r + 3), G.hy + Math.sin(a) * (r + 3)]], F.main[2]); } } },
    snout: { draw(t, G, F) { const x = G.hx + 1, y = G.top + 1; t.ell(x, y, 2.4, 2, F.main); t.rect(x + 1, y - 1, 3, 2, F.main[1]); t.ell(x + 4, y, 1, 1.6, F.main); } },
    cap: { draw(t, G, F) { const h = hatAt(G); t.ell(h.x, h.y + 0.5, h.w / 2 + 1.5, 3.4, F.main, 0, (x, y) => y <= h.y + 0.5); } },
    shell: { draw(t, G, F) { const h = hatAt(G); t.ell(h.x, h.y + 1.5, h.w / 2 + 1, 3.2, F.main, 0, (x, y) => y <= h.y + 1); } },
    flame: { draw(t, G, F, P) { EL_FX.fire(t, G, P); } },
    star: { draw(t, G, F) { const h = hatAt(G); t.poly(starPts(h.x, h.y - 2.5, 3.4, 1.5, 5), F.main[1]); } },
    bolt: { draw(t, G, F) { EL_FX.electric(t, G); } },
    beam: { draw(t, G) { EL_FX.laser(t, G); } },
    cherries: { draw(t, G) { const x = G.hx - G.hr - 1, y = G.hy + 1; t.ell(x, y + 2, 1.8, 1.8, ['#ff8a90', '#e0303e', '#901c30']); t.ell(x + 3, y + 3, 1.8, 1.8, ['#ff8a90', '#e0303e', '#901c30']); } },
    swirl: { draw() {} },
    magnet: { draw(t, G) { const h = hatAt(G), x = h.x, y = h.y - 1; t.poly([[x - 3, y], [x - 3, y - 4], [x + 3, y - 4], [x + 3, y], [x + 1.5, y], [x + 1.5, y - 2.5], [x - 1.5, y - 2.5], [x - 1.5, y]], '#d24552'); } },
    bulb: { draw(t, G) { const h = hatAt(G); t.ell(h.x, h.y - 1.2, 2.4, 2, ['#ffffff', '#f0ecdc', '#c8c0a4']); t.poly([[h.x - 0.8, h.y - 2.5], [h.x + 0.8, h.y - 2.5], [h.x, h.y - 5]], '#f0ecdc'); } },
    lily: { behind: true, draw(t, G, F) { t.ell(16, 30.2, 9, 1.8, F.leaf || ['#9ee070', '#4fae3a', '#2f7a4a']); } },
    pumpkin: { draw(t, G) { t.ell(16, 27.6, 7.4, 3.6, ['#ffc47a', '#f7922e', '#c8581c'], 0, (x, y) => y >= 26); } },
    basket: { behind: true, draw(t, G) { stroke(t, [[G.hx - 2, G.hy + 3], [G.hx - G.hr - 3, G.top + 1]], 0.7, 0.6, '#8f563b'); t.ell(G.hx - G.hr - 4, G.top, 2.6, 1.6, ['#d9a066', '#b8743a', '#8f563b'], 0, (x, y) => y >= G.top - 0.5); } },
    berry: { draw(t, G) { const x = G.hx - G.hr, y = G.hy + 2; t.ell(x, y, 2, 2, ['#9cb4ff', '#4a5ae0', '#2a3090']); } },
    boomerang: { behind: true, draw(t, G) { stroke(t, [[G.hx - G.hr - 1, G.hy - 4], [G.hx - G.hr - 4, G.hy - 1], [G.hx - G.hr - 1, G.hy + 2]], 0.9, 0.9, '#d9a066'); } },
    jaws: { draw() {} },
    brows: { draw() {} },
  };
  function partDetails(g, part, G, F) {
    if (part === 'jaws') { // a toothy grin across the lower face
      const y = G.hy + Math.max(2, Math.round(G.hr * 0.55)), x0 = G.hx - Math.round(G.hr * 0.4), x1 = G.hx + Math.round(G.hr * 0.9);
      for (let x = x0; x <= x1; x++) if (g.filled(x, y)) { g.set(x, y, x % 2 ? WHITE : F.main[2]); if (g.filled(x, y + 1)) g.set(x, y + 1, F.main[1]); }
    }
    if (part === 'swirl') { const cx = G.hx - 1, cy = G.hy - Math.round(G.hr * 0.6); for (const [x, y] of [[cx, cy], [cx + 1, cy], [cx + 1, cy + 1], [cx, cy + 1], [cx - 1, cy + 1], [cx - 1, cy], [cx - 1, cy - 1], [cx, cy - 1], [cx + 1, cy - 1], [cx + 2, cy - 1]]) if (g.filled(x, y)) g.set(x, y, (x + y) % 2 ? '#f07ad8' : '#9ef07a'); }
    if (part === 'brows') { const y = G.ey ? G.ey - 2 : G.hy - 3; for (let x = G.hx - 2; x <= G.hx + 4; x++) if (g.filled(x, y)) g.set(x, y, INK); }
    if (part === 'cap') { const h = hatAt(G); for (const [x, y] of [[h.x - 2, h.y - 1], [h.x + 1, h.y - 2], [h.x + 3, h.y]]) if (g.filled(x, y)) g.set(x, y, WHITE); }
    if (part === 'shell') { const h = hatAt(G); for (const [x, y] of [[h.x - 1, h.y - 1], [h.x, h.y], [h.x + 2, h.y - 1]]) if (g.filled(x, y)) g.set(x, y, '#6a4428'); }
    if (part === 'snout') { const x = G.hx + 5, y = G.top + 1; if (g.filled(x, y)) g.set(x, y, '#1f4a2a'); }
  }

  // ---- helmets (Gatling Pea + the Army Helmet / Knight Armor fusion items) ----
  // cx: centre, by: the brim row (sits on the head), w: half width. Shapes go on a layer that gets outlined; *Details after.
  const OLIVE = ['#b4c06c', '#76843a', '#454f20'], STEELR = ['#d4dce8', '#939fb6', '#535f78'];
  // where a helmet's brim goes: the plant's hat line, but always high enough that the brim and its outline clear the eyes
  const helmY = (G, h) => (G.ey != null ? Math.min(h.y, G.ey - 3) : h.y);
  function armyHelmet(t, cx, by, w) {
    t.ell(cx - 0.3, by + 0.6, w, w * 0.78 + 0.8, OLIVE, -0.12, (x, y) => y <= by); // dome, tipped back a touch
    t.ell(cx + 0.7, by + 0.7, w + 1.6, 1.15, ['#94a24e', '#5f6d2b', '#3b451a']); // brim, sticking out a bit more at the front
  }
  function armyHelmetDetails(g, cx, by, w) {
    const ok = (x, y) => g.filled(x, y) && g.get(x, y) !== INK, put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (ok(x, y)) g.set(x, y, c); };
    for (let x = Math.round(cx - w - 1); x <= cx + w + 2; x++) put(x, by, '#a6b45e'); // light top edge of the brim
    put(cx - w * 0.5, by - w * 0.62, '#dfe8a8'); put(cx - w * 0.5 + 1, by - w * 0.62 - 1, '#dfe8a8'); put(cx - w * 0.5 - 1, by - w * 0.62 + 1, '#c4d07e'); // shine
    for (const [dx, dy, c] of [[0.25, 0.4, '#4f5c24'], [0.25 * 1 + 1 / w, 0.4, '#4f5c24'], [-0.15, 0.2, '#8f9c4c'], [0.55, 0.18, '#8f9c4c']]) put(cx + w * dx, by - 1 - w * dy, c); // camo spots
  }
  function knightHelmet(t, cx, by, w) {
    // a feather plume streaming back (left) from the crown; drawn first so the dome covers its root
    const top = by + 2 - (w * 0.92 + 1.2);
    stroke(t, [[cx + 0.5, top + 0.5], [cx - 1, top - 1.8], [cx - 4, top - 2.4], [cx - 7, top - 1], [cx - 8.4, top + 1.6]], 1.7, 0.6, '#e0303e');
    t.ell(cx, by + 1, w + 0.3, w * 0.92 + 1.2, STEELR, 0, (x, y) => y <= by + 1); // dome
    t.poly([[cx - w - 0.3, by], [cx - w * 0.55, by], [cx - w * 0.7, by + 3.4], [cx - w - 0.3, by + 2.6]], STEELR[2]); // back + cheek guard
    t.rect(Math.round(cx + w - 1.2), by, 2, 2, STEELR[1]); // front visor peak
  }
  function knightHelmetDetails(g, cx, by, w) {
    const ok = (x, y) => g.filled(x, y) && g.get(x, y) !== INK, put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (ok(x, y)) g.set(x, y, c); };
    const top = Math.round(by - w * 0.92);
    for (let y = top + 1; y <= by; y++) put(cx, y, STEELR[0]); // centre ridge
    for (let x = Math.round(cx - w + 1); x <= cx + w; x++) put(x, by + 1, x % 2 ? '#7e8aa2' : '#d6dcea'); // rivet band round the rim
    const pt = by + 2 - (w * 0.92 + 1.2); // plume: a light top edge and a dark underside
    for (const [dx, dy] of [[-1, -2.6], [-2.4, -3], [-4, -3.2], [-5.6, -2.6]]) put(cx + dx, pt + dy, '#ff8a92');
    for (const [dx, dy] of [[-3, -1.4], [-5, -1.2], [-6.8, 0]]) put(cx + dx, pt + dy, '#a01c30');
  }
  // the Space Helmet: a glass bubble round the head (tinted, with a clear rim and a glare) and a little antenna
  function spaceBubble(g, G) {
    const cx = G.hx + 0.5, cy = G.hy + 0.5, rx = G.hr + 2.6, ry = G.hr + 2.4;
    const d = (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
    for (let y = Math.floor(cy - ry - 2); y <= cy + ry + 2; y++) for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) {
      const k = d(x, y), c = g.get(x, y);
      if (k <= 1) { if (k > 0.8) g.set(x, y, '#c8f0ff'); else if (!c) g.set(x, y, 'rgba(190,236,255,0.45)'); }
      else if (!c || c[0] !== '#') { // ink just outside the rim (only where nothing is drawn)
        if (d(x - 1, y) <= 1 || d(x + 1, y) <= 1 || d(x, y - 1) <= 1 || d(x, y + 1) <= 1) g.set(x, y, INK);
      }
    }
    // glare: a short white arc in the upper left
    for (const a of [3.5, 3.75, 4.0, 4.25]) { const x = Math.round(cx - 0.5 + Math.cos(a) * (rx - 2)), y = Math.round(cy - 0.5 + Math.sin(a) * (ry - 2)); g.set(x, y, WHITE); }
    // antenna with a red tip
    const ax = Math.round(cx + rx * 0.45), ay = Math.round(cy - ry * 0.9);
    for (let y = ay - 3; y < ay; y++) g.set(ax, y, '#8c93a8');
    g.px([[ax, ay - 4], [ax - 1, ay - 4], [ax + 1, ay - 4], [ax, ay - 5], [ax, ay - 3]].filter(([x, y]) => !g.filled(x, y) || g.get(x, y) === INK), INK);
    g.set(ax, ay - 4, '#ff4a5a');
  }

  // Fusion items (data.js FUSION_ITEMS): headgear and add-ons. behind: drawn behind the plant.
  const ITEM = {
    army: { draw(t, G) { const h = hatAt(G); armyHelmet(t, h.x, helmY(G, h), h.w / 2 + 0.8); } },
    knight: { draw(t, G) { const h = hatAt(G); knightHelmet(t, h.x, helmY(G, h), h.w / 2 + 0.8); } },
    pirate: { draw(t, G) { const h = hatAt(G), w = h.w / 2 + 3; t.poly([[h.x - w, h.y + 1], [h.x - w + 2, h.y - 3], [h.x, h.y - 5], [h.x + w - 2, h.y - 3], [h.x + w, h.y + 1]], '#3a3044'); } },
    cowboy: { draw(t, G) { const h = hatAt(G), w = h.w / 2 + 3.5; t.ell(h.x, h.y + 0.5, w, 1.4, ['#d9a066', '#a8743a', '#6a4422']); t.ell(h.x, h.y - 1.5, h.w / 2 - 0.5, 3, ['#d9a066', '#a8743a', '#6a4422'], 0, (x, y) => y <= h.y); } },
    wizard: { draw(t, G) { const h = hatAt(G), w = h.w / 2 + 2; t.poly([[h.x - w, h.y + 1], [h.x + w, h.y + 1], [h.x + 2, h.y - 8], [h.x + 4, h.y - 9]], '#7a44c8'); t.rect(Math.round(h.x - w), h.y, Math.round(w * 2) + 1, 1, '#4a2478'); } },
    crown: { draw(t, G) { const h = hatAt(G), w = Math.max(3, Math.round(h.w / 2)); t.poly([[h.x - w, h.y + 1], [h.x - w, h.y - 3], [h.x - w / 2, h.y - 1], [h.x, h.y - 4], [h.x + w / 2, h.y - 1], [h.x + w, h.y - 3], [h.x + w, h.y + 1]], '#f6c83a'); } },
    ninja: { draw(t, G) { const y = G.ey ? G.ey - 2 : G.hy - 2; t.rect(G.hx - G.hr, y - 1, G.hr * 2 + 1, 2, '#3a3044'); stroke(t, [[G.hx - G.hr, y], [G.hx - G.hr - 3, y + 1], [G.hx - G.hr - 5, y + 3]], 0.6, 0.5, '#3a3044'); } },
    space: { draw() {} }, // (drawn straight onto the plant afterwards: spaceBubble)
    extrashooter: { draw(t, G, F) { const x = G.hx - 1, y = G.top + 1; t.ell(x, y, 2.6, 2.2, F.main); t.rect(x + 1, y - 1, 4, 2, F.main[1]); t.ell(x + 5, y, 1.1, 1.8, F.main); } },
    catapult: { behind: true, draw(t, G) { PART.basket.draw(t, G); } },
    // strapped on the back (left) edge, drawn in front so wide plants (petals, spikes, lily pads) don't hide it
    jetpack: { draw(t, G, F, P) { const x = Math.max(4, Math.round(G.hx - G.hr)), y = G.hy + 1; t.rect(x - 2, y - 3, 3, 7, '#a8b4c8'); t.rect(x - 2, y - 3, 1, 7, '#e8eef8'); t.rect(x + 1, y - 1, 2, 1, '#6a7690'); t.poly([[x - 2, y + 4], [x + 1, y + 4], [x - 0.5, y + 7 + (P.frame ? 1 : 0)]], '#f2742a'); } },
    halloween: { draw(t, G) { PART.pumpkin.draw(t, G); } },
  };
  function itemDetails(g, id, G) {
    const h = hatAt(G);
    if (id === 'army') armyHelmetDetails(g, h.x, helmY(G, h), h.w / 2 + 0.8);
    if (id === 'knight') knightHelmetDetails(g, h.x, helmY(G, h), h.w / 2 + 0.8);
    if (id === 'pirate') { if (g.filled(h.x, h.y - 2)) g.set(h.x, h.y - 2, WHITE); if (g.filled(h.x - 1, h.y - 1)) g.set(h.x - 1, h.y - 1, WHITE); if (g.filled(h.x + 1, h.y - 1)) g.set(h.x + 1, h.y - 1, WHITE); }
    if (id === 'cowboy') for (let x = Math.round(h.x - h.w / 2 + 1); x < h.x + h.w / 2 - 1; x++) if (g.filled(x, h.y - 1)) g.set(x, h.y - 1, '#e0303e');
    if (id === 'wizard') for (const [x, y] of [[h.x - 1, h.y - 3], [h.x + 2, h.y - 5]]) if (g.filled(x, y)) g.set(x, y, '#fff27a');
    if (id === 'crown') for (const [x, y] of [[h.x, h.y - 1], [h.x - 3, h.y], [h.x + 3, h.y]]) if (g.filled(x, y)) g.set(x, y, (x + y) % 2 ? '#e0303e' : '#4fc4ee');
    if (id === 'space') spaceBubble(g, G);
    if (id === 'extrashooter') { const x = G.hx + 4, y = G.top + 1; if (g.filled(x, y)) g.set(x, y, '#1f4a2a'); }
    if (id === 'halloween') { for (const [x, y] of [[13, 27], [16, 28], [19, 27]]) if (g.filled(x, y)) g.set(x, y, '#c8581c'); }
  }

  // ---------------- special skins: recolour by brightness (outline, eye glints and mouths stay) ----------------
  const SKIN = {
    gold: ['#a8680e', '#e8a42a', '#fcd850', '#fff6a8', '#ffffff'],
    crystal: ['#6a98d0', '#94b8e8', '#bfe2f8', '#e2f4ff', '#ffffff'],
    galaxy: ['#1a1240', '#2c2272', '#4a3aa8', '#7a64d8', '#b8a8ff'],
    ghost: ['#9a8cc8', '#c4b8ec', '#e2dcfa', '#f4f0ff', '#ffffff'],
    zombie: ['#4a5a3a', '#6a7e52', '#8ea872', '#b4c898', '#dfe8c8'],
  };
  const RBW = ['#ff7a8a', '#ffa858', '#f8dc4a', '#7ad070', '#5ab8f0', '#a07ae8'];
  function applySkin(g, skin) {
    const keep = c => !c || c === INK || c === WHITE || c === MOUTH || c === SHINE || c === '#f4a3b8' || c === '#ffe24a';
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      const c = g.get(x, y); if (keep(c) || c[0] !== '#') continue;
      const L = lum(c);
      if (skin === 'rainbow') { const band = RBW[Math.floor((y + x * 0.35) / 3.2) % RBW.length]; g.set(x, y, L > 0.72 ? mixHex(band, '#ffffff', 0.45) : L < 0.38 ? mixHex(band, INK, 0.3) : band); continue; }
      const R = SKIN[skin]; if (!R) return;
      g.set(x, y, R[Math.max(0, Math.min(R.length - 1, Math.floor(L * R.length * 1.05)))]);
    }
    if (skin === 'galaxy') for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.filled(x, y) && g.get(x, y) !== WHITE && ((x * 7 + y * 13) % 23) === 0) g.set(x, y, '#ffffff');
    if (skin === 'crystal' || skin === 'gold') for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.filled(x, y) && ((x * 5 + y * 11) % 29) === 0) g.set(x, y, '#ffffff');
    if (skin === 'zombie') for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.filled(x, y) && ((x * 3 + y * 17) % 31) === 0 && g.filled(x + 1, y)) { g.set(x, y, '#3a2a2a'); g.set(x + 1, y, '#3a2a2a'); }
    if (skin === 'ghost') for (let y = 24; y < g.h; y++) for (let x = 0; x < g.w; x++) { const c = g.get(x, y); if (!c) continue; const a = y >= 28 ? 0.55 : 0.8; if (c === INK) g.set(x, y, `rgba(110,92,170,${a})`); else if (c[0] === '#') { const n = parseInt(c.slice(1), 16); g.set(x, y, `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`); } }
  }
  function applyShiny(g, G) {
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      const c = g.get(x, y); if (!c || c === INK || c === WHITE || c[0] !== '#') continue;
      const d = (x - G.hx) + (y - G.hy); if (d >= 1 && d <= 2 && y < G.hy + 1) g.set(x, y, mixHex(c, '#ffffff', 0.45));
    }
    for (const [x, y] of [[G.hx + G.hr - 1, G.hy - G.hr + 1], [G.hx - G.hr - 2, G.hy + 3]]) if (!g.get(x, y)) { g.set(x, y, '#ffffff'); } else if (g.filled(x, y)) g.set(x, y, '#ffffff');
  }

  // ---------------- the plant ----------------
  function buildPlant(L, P) {
    P = P || {};
    const sp = PX.PLANT_ART[L.species] ? L.species : 'peashooter', stage = Math.max(0, Math.min(2, L.stage | 0));
    const D = window.PSDATA, info = D && D.PLANTS && D.PLANTS[sp];
    const fz = L.fuse || {}, F = fz.with && PLANT_PAL[fz.with] ? pal(fz.with) : null;
    const C = pal(sp, L.element, fz.with);
    const g = new Grid(32, 32);
    const G = PX.PLANT_ART[sp](g, stage, P, C) || { hx: 16, hy: 16, hr: 5, top: 10 };
    if (G.top == null) G.top = Math.round(G.hy - G.hr);
    const partId = fz.with && D && D.PLANTS && D.PLANTS[fz.with] ? D.PLANTS[fz.with].part : null;
    const behind = new Grid(32, 32), front = new Grid(32, 32);
    if (partId && PART[partId]) (PART[partId].behind ? behind : front) && PART[partId].draw(PART[partId].behind ? behind : front, G, F || C, P);
    if (fz.item && ITEM[fz.item]) ITEM[fz.item].draw(ITEM[fz.item].behind ? behind : front, G, C, P);
    // with a special-seed design (gold, crystal, galaxy...) the design recolours the plant, and the element's details
    // (flame, ice crystals, lightning bolt...) go on top afterwards in their own colours, so both show
    const elLater = !!L.skin;
    if (L.element && EL_FX[L.element] && !elLater) EL_FX[L.element](front, G, P);
    behind.outline(); under(g, behind);
    front.outline(); g.merge(front);
    if (partId) partDetails(g, partId, G, F || C);
    if (fz.item) itemDetails(g, fz.item, G);
    if (L.element && !elLater) elDetails(g, L.element, G, P);
    if (L.skin) applySkin(g, L.skin);
    if (L.element && elLater) {
      if (EL_FX[L.element]) { const t = new Grid(32, 32); EL_FX[L.element](t, G, P, true); t.outline(); g.merge(t); }
      elDetails(g, L.element, G, P);
    }
    if (L.shiny) applyShiny(g, G);
    void info;
    return g;
  }

  // ---------------- PX.sprig dispatch ----------------
  const oldSprig = PX.sprig;
  const cache = new Map();
  function sprig(L, P) {
    if (!L || (!L.species && !L.zombie)) return oldSprig(L, P);
    const key = JSON.stringify(L) + '|' + JSON.stringify(P || {});
    let c = cache.get(key);
    if (!c) {
      try { c = (L.zombie ? buildZombie(L, P) : buildPlant(L, P)).canvas(); }
      catch (e) { console.error('PX.sprig', L, e); c = buildPlant({ species: 'peashooter', stage: 0 }, {}).canvas(); }
      cache.set(key, c); if (cache.size > 900) cache.delete(cache.keys().next().value);
    }
    return c;
  }
  function buildZombie(L, P) {
    const g = new Grid(32, 32), fn = PX.ZOMBIE_ART && (PX.ZOMBIE_ART[L.zombie] || PX.ZOMBIE_ART.basic);
    if (fn) fn(g, P || {}, L); else { g.ell(16, 20, 6, 9, ['#c8d8a8', '#8fa872', '#5a6e48']); g.outline(); }
    if (L.skin) applySkin(g, L.skin);
    return g;
  }

  PX.PLANT_ART = PX.PLANT_ART || {};
  PX.ZOMBIE_ART = PX.ZOMBIE_ART || {};
  PX.PLANT_PAL = PLANT_PAL;
  PX.EL_PAL = EL_PAL;
  PX.sprig = sprig;
  PX.buildPlant = buildPlant;
  PX.buildZombie = buildZombie;
  PX.mixHex = mixHex;
  PX.piece = piece;
  PX.SKIN_LIST = Object.keys(SKIN).concat(['rainbow']);
  PX.PART_IDS = Object.keys(PART);
  PX.ITEM_FX_IDS = Object.keys(ITEM);
  PX.art = { face, madFace, mouth, feet, shroomFoot, armyHelmet, armyHelmetDetails, leaf, baseLeaves, stemTo, pal, piece, under, mixHex, lum, LEAF, hatAt };
})();

// ---------------- PVZ Garden items, element sprites, Zomboss sprites and props (wraps pixel.js PX.item / critter / prop) ----------------
// item kinds added here:
//   'egg' <kind>:<species>  a 22x28 seed packet (the plant's head in the window; special packets are coloured)
//   'element' <type>        7x7 type icon (art-world.js ELEMENT_ICON)   'core' / 'shard' <element>  13x13 orb / 9x9 shard
//   'fitem' <itemId>        16x16 fusion item icon                       'fruit' melon | plantfood  (new fruit)
//   'plant' <species>       16x16 head icon of a species (stage 0)
// critter ids added: 'el:<element>' (18x18, 3 frames: art-world.js ELEMENT_SPRITE) and Zomboss ids (48x48, 2 frames: BOSS_ART).
(function () {
  'use strict';
  const { Grid, INK } = PX;
  const oldItem = PX.item, oldCritter = PX.critter, oldFrames = PX.critterFrames, oldProp = PX.prop;
  function crop(g, w, h, align) { // copy the filled box of g into w x h (centred; align 'top' keeps the top rows)
    let x0 = g.w, y0 = g.h, x1 = -1, y1 = -1;
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.get(x, y)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const o = new Grid(w, h); if (x1 < 0) return o;
    const ox = Math.floor((w - (x1 - x0 + 1)) / 2) - x0, oy = align === 'top' ? -y0 + (h > y1 - y0 + 1 ? Math.floor((h - (y1 - y0 + 1)) / 2) : 0) : Math.floor((h - (y1 - y0 + 1)) / 2) - y0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = g.get(x, y); if (c && x + ox >= 0 && x + ox < w && y + oy >= 0 && y + oy < h) o.set(x + ox, y + oy, c); }
    return o;
  }
  const PACK = {
    normal: { card: ['#fbf0cc', '#ecd8a0', '#b89a5a'], band: ['#a6ec70', '#5cb43a', '#2f7a4a'], win: '#fffdf2' },
    golden: { card: ['#fff6b0', '#f6c83a', '#a8680e'], band: ['#fffbd0', '#fcd850', '#c08a10'], win: '#fff8d8' },
    rainbow: { card: ['#fff4fa', '#f8d8ea', '#c890b0'], band: null, win: '#ffffff' },
    crystal: { card: ['#f2fbff', '#c8ecfa', '#7aa8d8'], band: ['#e8f8ff', '#a8d8f8', '#5a8ac8'], win: '#f6fcff' },
    galaxy: { card: ['#6a5ad0', '#3a2e88', '#1c1450'], band: ['#b86ad8', '#8a44b8', '#5a2a86'], win: '#2a2266' },
    ghost: { card: ['#f8f4ff', '#e2dcfa', '#9a8cc8'], band: ['#d8ccf8', '#b4a4ec', '#7a68c0'], win: '#ffffff' },
    zombie: { card: ['#dfe8c8', '#a8bc88', '#5a6e48'], band: ['#8ea872', '#6a7e52', '#3a4a2a'], win: '#f4f8e8' },
  };
  const RBW = ['#ff7a8a', '#ffa858', '#f8dc4a', '#7ad070', '#5ab8f0', '#a07ae8'];
  function seedPacket(id) {
    const [kind, species] = String(id || 'normal').split(':'), S = PACK[kind] || PACK.normal, seed = (window.PSDATA && window.PSDATA.SEEDS[kind]) || {};
    const g = new Grid(22, 28); g.dither = false;
    g.rect(1, 1, 20, 26, S.card[1]); g.set(1, 1, null); g.set(20, 1, null); g.set(1, 26, null); g.set(20, 26, null);
    for (let y = 1; y < 27; y++) { if (g.get(2, y)) g.set(2, y, S.card[0]); if (g.get(19, y)) g.set(19, y, S.card[2]); }
    for (let x = 2; x < 20; x++) for (let y = 1; y < 6; y++) g.set(x, y, S.band ? (y === 1 ? S.band[0] : y === 5 ? S.band[2] : S.band[1]) : RBW[(x + y) % 6]);
    g.rect(3, 7, 16, 14, S.win);
    g.outline();
    // the plant in the window (its head and shoulders), wearing the packet's skin
    if (window.PSDATA && window.PSDATA.PLANTS[species]) {
      const L = { species, stage: 0 }; if (seed.skin) L.skin = seed.skin;
      const p = PX.buildPlant(L, { eyes: 'happy', mouth: 'open' }), c = crop(p, 16, 14, 'top');
      for (let y = 0; y < 14; y++) for (let x = 0; x < 16; x++) { const col = c.get(x, y); if (col) g.set(3 + x, 7 + y, col); }
    } else { // a seed with a sprout
      g.ell(11, 16, 3, 2.4, ['#c48a5c', '#8f563b', '#5a3322']); g.rect(11, 10, 1, 4, '#3f8a3a'); g.ell(9.5, 10.5, 1.6, 0.8, '#6abe30', 0.5); g.ell(12.5, 10, 1.6, 0.8, '#6abe30', -0.5);
    }
    g.rect(3, 21, 16, 1, S.card[2]);
    // a little sun badge in the bottom band (like a sun cost)
    g.ell(6.5, 24, 1.7, 1.7, '#fbd84a'); g.set(6, 23, '#fff6b0'); g.px([[4, 24], [9, 24], [6, 22]], '#f6a83a');
    g.px([[10, 24], [11, 24], [13, 24], [14, 24], [16, 24]], S.card[2]);
    if (kind === 'galaxy') for (const [x, y] of [[4, 2], [15, 3], [18, 9], [4, 18], [17, 17]]) g.set(x, y, '#ffffff');
    if (kind === 'golden' || kind === 'crystal') for (const [x, y] of [[17, 2], [4, 9], [17, 19]]) g.set(x, y, '#ffffff');
    return g;
  }
  const FRUIT2 = {
    melon(g) { g.ell(6.5, 8, 5.5, 4.5, ['#ff8a90', '#e8404a', '#a02c3a'], 0, (x, y) => y <= 8); g.rect(1, 8, 11, 1, '#f4ffe0'); g.rect(1, 9, 11, 1, '#5cb43a'); g.outline(); g.px([[4, 6], [7, 5], [9, 7], [5, 7]], INK); g.set(3, 5, '#ffc0c8'); },
    plantfood(g) { g.ell(6.5, 7, 4.6, 4.6, ['#c8ff9a', '#6ad84a', '#2f8a3e']); g.ell(6.5, 7, 2.6, 2.6, ['#f0ffd0', '#b8f070', '#6ab03a']); g.outline(); g.px([[5, 4], [4, 5]], '#ffffff'); g.px([[0, 2], [12, 3], [11, 11], [1, 10]], '#c8ff9a'); },
  };
  // A shard is a tiny, cute version of the element sprite that dropped it (a water droplet, a flame, an ice cube...).
  // Three of the same make a core.
  //   'shard' <el>      one shard, 11x11 (garden drops, prizes, lists)
  //   'shard' <el>:<n>  the three a core needs in a little triangle, n filled in and the rest dotted (the garden tray)
  const SHARD_ART = (() => {
    const shadeIn = (g, cx, cy, rx, ry, ramp) => g.ell(cx, cy, rx, ry, ramp, 0, (x, y) => g.get(x, y) !== null);
    const eyes = (g, y, a, b, col) => { g.set(a == null ? 4 : a, y, col || INK); g.set(b == null ? 7 : b, y, col || INK); };
    return {
      water(g) { const W = ['#e0f9ff', '#4fc4ee', '#2a6fc0']; g.poly([[5.5, 1], [2.4, 6], [8.6, 6]], W[1]); g.ell(5.5, 6.8, 3.2, 2.9, W[1]); g.outline(); shadeIn(g, 4.6, 5.5, 4, 4.6, W); eyes(g, 7); g.px([[4, 4], [4, 5]], '#ffffff'); g.set(8, 8, '#a8e8ff'); },
      fire(g) { const F = ['#ffe08a', '#f2742a', '#b8321e']; g.poly([[5.5, 0.6], [2.6, 5.6], [8.4, 5.6]], F[1]); g.poly([[8, 1.8], [9, 5.5], [6.4, 5]], F[1]); g.ell(5.5, 7, 3.2, 2.7, F[1]); g.outline(); shadeIn(g, 4.8, 5.4, 4, 5, F); g.ell(5.5, 8.2, 1.4, 0.9, '#fff27a'); eyes(g, 6); },
      ice(g) { const I = ['#ffffff', '#bfeaff', '#6ab0e0']; g.rect(2, 2, 7, 7, I[1]); g.outline(); shadeIn(g, 4.6, 4.6, 5.6, 5.6, I); g.px([[3, 3], [4, 3], [3, 4]], '#ffffff'); eyes(g, 6); g.px([[5, 7], [6, 7]], '#6ab0e0'); },
      electric(g) { const Y = ['#fffbd0', '#fbf236', '#c8a020']; g.ell(5.5, 6, 3.2, 3.2, Y[1]); g.poly([[3.4, 4], [2, 1], [4.8, 3]], Y[1]); g.poly([[7.6, 4], [9, 1], [6.2, 3]], Y[1]); g.outline(); shadeIn(g, 4.8, 5.2, 4.4, 4.4, Y); eyes(g, 6); g.set(5, 8, '#c8a020'); g.set(6, 8, '#c8a020'); },
      laser(g) { const L = ['#ffb8c0', '#e0303e', '#901c30']; g.poly([[5.5, 1], [9.2, 4.6], [5.5, 9.8], [1.8, 4.6]], L[1]); g.outline(); shadeIn(g, 4.4, 4, 4.6, 5.6, L); for (let x = 3; x <= 8; x++) if (g.get(x, 4) !== null && g.get(x, 4) !== INK) g.set(x, 4, L[0]); eyes(g, 6); },
      poison(g) { const P = ['#d8a8f8', '#9a5ad8', '#5e2a8e']; g.ell(5.5, 6.2, 3.6, 3.1, P[1]); g.ell(5.5, 3.6, 1.8, 1.6, P[1]); g.poly([[6.6, 8], [8, 8], [7.4, 10]], P[1]); g.outline(); shadeIn(g, 4.6, 5, 4.6, 4.8, P); g.px([[5, 3], [6, 2]], '#99e550'); eyes(g, 6); },
      magic(g) { const M = ['#ffd6f2', '#f070c0', '#a83a8a']; g.poly(PX.starPts(5.5, 5.9, 4.6, 2.1, 5), M[1]); g.outline(); shadeIn(g, 4.8, 5, 4.8, 5, M); eyes(g, 6, 4, 6); g.set(5, 3, '#ffffff'); },
      dark(g) { const D2 = ['#8a7ab8', '#3e3468', '#1e1838']; g.ell(5.5, 5, 3.4, 3.2, D2[1]); g.rect(2, 5, 7, 4, D2[1]); g.outline(); for (const x of [3, 6]) { g.set(x, 9, INK); } g.set(2, 9, null); g.set(8, 9, null); shadeIn(g, 4.6, 4.4, 4.6, 5.2, D2); eyes(g, 5, 4, 7, '#fff27a'); },
      rock(g) { const R = ['#cfc6b8', '#8e8478', '#5a5248']; g.ell(5.5, 6.4, 4, 3, R[1]); g.outline(); shadeIn(g, 4.4, 5.4, 4.8, 3.8, R); g.px([[5, 4], [6, 4]], '#7ec85c'); eyes(g, 7); g.set(7, 5, R[2]); },
      robot(g) { const M = ['#eef2fa', '#a8b4c8', '#5e6a80']; g.rect(2, 4, 7, 5, M[1]); g.rect(5, 2, 1, 2, M[2]); g.outline(); g.set(5, 1, '#f6c83a'); shadeIn(g, 4.6, 5.4, 4.8, 3.8, M); eyes(g, 6, 4, 7, '#5fcde4'); g.px([[4, 8], [5, 8], [6, 8], [7, 8]], M[2]); },
      normal(g) { const N = ['#ffffff', '#efe4cc', '#bfae8c']; g.ell(4, 6.6, 2.6, 2.3, N[1]); g.ell(7, 6.6, 2.6, 2.3, N[1]); g.ell(5.5, 4.6, 2.8, 2.6, N[1]); g.outline(); shadeIn(g, 4.6, 5, 5, 4.6, N); eyes(g, 6); g.set(5, 8, '#f4a3b8'); g.set(6, 8, null === 0 ? 0 : g.get(6, 8)); },
    };
  })();
  function oneShard(el) {
    const g = new Grid(11, 11);
    if (SHARD_ART[el]) SHARD_ART[el](g); else { const E = window.PSDATA && window.PSDATA.ELEMENTS[el]; g.poly([[5.5, 1], [9, 5.5], [5.5, 10], [2, 5.5]], E ? E.color : '#8c93a8'); g.outline(); }
    return g;
  }
  function shardGrid(id) {
    const [el, nStr] = String(id).split(':');
    if (nStr == null) return oneShard(el);
    const have = Math.max(0, Math.min(3, +nStr || 0)), one = oneShard(el), g = new Grid(19, 19);
    // order filled in: bottom left, bottom right, top
    [[4, 0, 2], [0, 8, 0], [8, 8, 1]].forEach(([ox, oy, k]) => {
      for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) {
        const c = one.get(x, y); if (c === null) continue;
        if (k < have) g.set(ox + x, oy + y, c);
        else if (g.get(ox + x, oy + y) === null || /^rgba/.test(g.get(ox + x, oy + y))) g.set(ox + x, oy + y, c === INK ? ((x + y) % 2 ? 'rgba(34,32,52,0.5)' : null) : 'rgba(34,32,52,0.13)'); // a dotted gap for the ones still to catch
      }
    });
    return g;
  }
  const itemCache = {};
  PX.item = function (kind, id) {
    const key = kind + ':' + id; if (itemCache[key]) return itemCache[key];
    let g = null;
    try {
      if (kind === 'egg' || kind === 'seed') g = seedPacket(id);
      else if (kind === 'element') { g = new Grid(7, 7); if (PX.ELEMENT_ICON && PX.ELEMENT_ICON[id]) PX.ELEMENT_ICON[id](g); else { const E = window.PSDATA && window.PSDATA.ELEMENTS[id]; g.ell(3.5, 3.5, 2.6, 2.6, E ? E.color : '#8c93a8'); g.outline(); } }
      else if (kind === 'core') { g = new Grid(13, 13); if (PX.ELEMENT_CORE) PX.ELEMENT_CORE(g, id); else { const E = window.PSDATA && window.PSDATA.ELEMENTS[id]; g.ell(6.5, 6.5, 5, 5, E ? E.color : '#8c93a8'); g.outline(); } }
      else if (kind === 'shard') g = shardGrid(id);
      else if (kind === 'fitem') { g = new Grid(16, 16); if (PX.FUSION_ICON && PX.FUSION_ICON[id]) PX.FUSION_ICON[id](g); else { g.ell(8, 8, 6, 6, ['#fff27a', '#f6c83a', '#c7861c']); g.outline(); } }
      else if (kind === 'fruit' && FRUIT2[id]) { g = new Grid(13, 13); FRUIT2[id](g); }
      else if (kind === 'plant') g = crop(PX.buildPlant({ species: id, stage: 0 }, {}), 16, 16, 'top');
    } catch (e) { console.error('PX.item', kind, id, e); g = null; }
    if (!g) return oldItem(kind, id);
    return (itemCache[key] = g.canvas());
  };
  // element sprites (critter id 'el:fire') and Zomboss sprites
  const crCache = {};
  const isEl = id => typeof id === 'string' && id.slice(0, 3) === 'el:';
  PX.critter = function (kind, frame) {
    const B = PX.BOSS_ART && PX.BOSS_ART[kind];
    if (!isEl(kind) && !B) return oldCritter(kind, frame);
    const f = isEl(kind) ? (frame > 0 && frame < 3 ? frame | 0 : 0) : (frame ? 1 : 0), key = kind + ':' + f;
    if (crCache[key]) return crCache[key];
    let g;
    try {
      if (B) { g = new Grid(B.w || 48, B.h || 48); B.draw(g, f); }
      else { g = new Grid(18, 18); const fn = PX.ELEMENT_SPRITE && PX.ELEMENT_SPRITE[kind.slice(3)]; if (fn) fn(g, f); else { const E = window.PSDATA && window.PSDATA.ELEMENTS[kind.slice(3)]; g.ell(9, 10, 5, 5, E ? E.color : '#8c93a8'); g.outline(); g.px([[8, 9], [11, 9]], INK); } }
    } catch (e) { console.error('PX.critter', kind, e); g = new Grid(18, 18); g.ell(9, 10, 5, 5, '#8c93a8'); g.outline(); }
    return (crCache[key] = g.canvas());
  };
  PX.critterFrames = kind => (isEl(kind) ? 3 : PX.BOSS_ART && PX.BOSS_ART[kind] ? 2 : oldFrames(kind));
  // garden props from art-world.js (PVZ_PROP / PVZ_HOME); anything else falls back to pixel.js
  const propCache = {};
  PX.prop = function (kind, theme) {
    const P = (PX.PVZ_PROP && PX.PVZ_PROP[kind]) || (PX.PVZ_HOME && PX.PVZ_HOME[kind]);
    if (!P) return oldProp(kind, theme);
    const key = kind + (theme || 'day'); if (propCache[key]) return propCache[key];
    let c;
    try { const g = new Grid(P.w, P.h); P.draw(g, theme || 'day'); c = g.canvas(); } catch (e) { console.error('PX.prop', kind, e); c = oldProp('rock', theme); }
    return (propCache[key] = c);
  };
  PX.homeInfo = kind => (PX.PVZ_HOME && PX.PVZ_HOME[kind]) || (PX.HOMES && PX.HOMES[kind]) || null;
  PX.crop = crop;

  // ---------------- the garden's house (top-left corner of each yard), 74 x 70, front facing the player ----------------
  // PX.pvzHouse(F) -> canvas with .meta = { door: [x, y], win: [[x, y]...] } (pixel positions in the canvas).
  // F (from garden.js TH[area].facade): kind 'house' | 'cabin' | 'temple', wall/roof ramps, trim, glass, door, porch, found.
  const houseCache = {};
  PX.pvzHouse = function (F) {
    const key = JSON.stringify(F); if (houseCache[key]) return houseCache[key];
    const W = 74, H = 70, g = new Grid(W, H), P = (draw) => PX.piece(g, draw), win = [];
    const onC = (x, y, from, to) => { if (g.get(x, y) === from) g.set(x, y, to); };
    const glass = (x, y, w, h) => { // a framed window pane with a shine
      g.rect(x - 1, y - 1, w + 2, h + 2, INK); g.rect(x, y, w, h, F.trim); g.rect(x + 1, y + 1, w - 2, h - 2, F.glass);
      g.rect(x + (w >> 1), y + 1, 1, h - 2, F.trim); g.rect(x + 1, y + (h >> 1), w - 2, 1, F.trim);
      if (!F.lit) { g.set(x + 1, y + 1, '#ffffff'); g.set(x + 2, y + 1, '#ffffff'); g.set(x + 1, y + 2, '#ffffff'); }
      win.push([x + (w >> 1), y + (h >> 1)]);
    };
    let door;
    if (F.kind === 'temple') {
      // body of sandstone blocks under a painted cornice, columns either side of a dark doorway
      P(t => t.rect(4, 27, 66, 40, F.wall[1]));
      for (let y = 28; y < 67; y++) for (let x = 4; x < 70; x++) { const row = Math.floor((y - 28) / 5), m = (y - 28) % 5; onC(x, y, F.wall[1], m === 4 || (x + row * 4) % 10 === 0 ? F.wall[2] : m === 0 ? F.wall[0] : F.wall[1]); }
      P(t => { t.rect(1, 16, 72, 12, F.roof[0]); t.rect(3, 12, 68, 4, F.wall[0]); });
      for (let x = 1; x < 73; x++) { onC(x, 18, F.roof[0], F.roof[1]); onC(x, 19, F.roof[0], F.roof[1]); onC(x, 23, F.roof[0], F.roof[2]); onC(x, 24, F.roof[0], F.roof[2]); if (x % 6 < 3) { onC(x, 21, F.roof[0], '#ffffff'); } onC(x, 27, F.roof[0], F.wall[2]); }
      for (let x = 5; x < 70; x += 6) P(t => t.rect(x, 9, 3, 3, F.wall[0])); // crenellations
      for (const cx of [21, 49]) P(t => { t.rect(cx, 31, 5, 36, F.wall[0]); t.rect(cx - 1, 29, 7, 3, F.roof[1]); });
      for (const cx of [21, 49]) for (let y = 33; y < 66; y += 3) onC(cx + 3, y, F.wall[0], F.wall[2]);
      P(t => t.rect(29, 38, 16, 29, F.door[1])); P(t => t.rect(27, 34, 20, 4, F.trim));
      g.rect(35, 35, 4, 2, '#f6c83a'); g.set(33, 35, '#2a98c0'); g.set(32, 36, '#2a98c0'); g.set(40, 35, '#2a98c0'); g.set(41, 36, '#2a98c0'); // winged sun
      for (const px of [8, 56]) { g.rect(px, 34, 10, 20, F.wall[2]); g.rect(px + 1, 35, 8, 18, '#f8e8c0'); const c = '#2a7a9a'; // carved panels: an ankh and an eye
        if (px === 8) { g.rect(px + 4, 38, 2, 1, c); g.set(px + 3, 39, c); g.set(px + 6, 39, c); g.rect(px + 2, 40, 6, 1, c); g.rect(px + 4, 41, 2, 7, c); }
        else { g.rect(px + 2, 42, 6, 1, c); g.rect(px + 3, 41, 4, 1, c); g.rect(px + 4, 42, 2, 2, '#2a1c12'); g.set(px + 3, 45, c); g.set(px + 4, 46, c); } }
      win.push([37, 46]);
      door = [37, 67];
      P(t => { t.rect(25, 66, 24, 2, F.porch[0]); t.rect(23, 68, 28, 2, F.porch[1]); });
    } else {
      const cabin = F.kind === 'cabin';
      // chimney (house) or mast with a flag (cabin), behind the roof
      if (cabin) { P(t => t.rect(51, 0, 2, 20, '#5a3a22')); P(t => t.poly([[53, 1], [63, 4], [53, 8]], '#222034')); g.set(56, 4, '#ffffff'); g.set(57, 4, '#ffffff'); g.set(56, 5, '#ffffff'); }
      else { P(t => t.rect(48, 2, 9, 16, '#c0503a')); P(t => t.rect(47, 1, 11, 3, '#8e8e9c')); for (let y = 6; y < 17; y += 3) for (let x = 48; x < 57; x++) onC(x, y, '#c0503a', '#86302a'); }
      // front wall: siding boards (house) or vertical planks (cabin), shaded toward the ground
      P(t => t.rect(5, 36, 64, 31, F.wall[1]));
      for (let y = 36; y < 67; y++) for (let x = 5; x < 69; x++) {
        const c = cabin ? ((x - 5) % 5 === 4 ? F.wall[2] : (x - 5) % 5 === 0 ? F.wall[0] : F.wall[1]) : ((y - 36) % 3 === 2 ? F.wall[2] : (y - 36) % 3 === 0 ? F.wall[0] : F.wall[1]);
        onC(x, y, F.wall[1], c);
      }
      for (let y = 37; y < 67; y++) { onC(5, y, F.wall[0], F.trim); onC(5, y, F.wall[1], F.trim); onC(5, y, F.wall[2], F.trim); onC(68, y, F.wall[1], F.wall[2]); onC(68, y, F.wall[0], F.wall[2]); }
      // the roof: overlapping shingle rows (dark boards on the cabin), a ridge cap on top, a deep eave over the wall
      P(t => t.poly([[0, 40], [74, 40], [62, 10], [12, 10]], F.roof[1]));
      for (let y = 10; y < 41; y++) for (let x = 0; x < W; x++) {
        if (g.get(x, y) !== F.roof[1]) continue;
        const k = (y - 10) % 4, off = Math.floor((y - 10) / 4) % 2 ? 3 : 0;
        let c = k === 3 ? F.roof[2] : k === 0 ? F.roof[0] : F.roof[1];
        if (!cabin && k === 2 && (x + off) % 6 === 0) c = F.roof[2];
        if (cabin && (x + off * 2) % 9 === 0 && k !== 3) c = F.roof[2];
        if (y >= 38) c = F.roof[2];
        g.set(x, y, c);
      }
      for (let x = 13; x < 62; x++) onC(x, 11, F.roof[0], PX.mixHex(F.roof[0], "#ffffff", 0.25));
      // a dormer window in the roof (house) / a round attic port (cabin)
      if (!cabin) { P(t => { t.rect(29, 20, 14, 12, F.wall[1]); }); P(t => t.poly([[27, 22], [45, 22], [36, 13]], F.roof[2])); glass(32, 23, 8, 7); }
      else { P(t => t.ell(36, 25, 5, 5, F.trim)); g.ell(36, 25, 3, 3, F.glass); g.set(35, 23, '#ffffff'); win.push([36, 25]); }
      // windows either side of the door, with shutters and flower boxes (portholes on the cabin)
      for (const wx of [12, 52]) {
        if (cabin) { P(t => t.ell(wx + 5, 49, 5.4, 5.4, F.trim)); g.ell(wx + 5, 49, 3.4, 3.4, F.glass); if (!F.lit) g.set(wx + 3, 47, '#ffffff'); win.push([wx + 5, 49]); continue; }
        if (F.shutter) { P(t => { t.rect(wx - 3, 43, 2, 12, F.shutter); t.rect(wx + 11, 43, 2, 12, F.shutter); }); }
        glass(wx, 43, 10, 12);
        if (F.box) { P(t => t.rect(wx - 1, 56, 12, 3, '#a0602e')); for (let k = 0; k < 5; k++) g.set(wx + k * 2, 55, ['#f07a84', '#fff27a', '#f7b6c8', '#ffffff', '#f07a84'][k]); }
      }
      // stone foundation
      for (let x = 6; x < 68; x++) for (let y = 63; y < 67; y++) { const c = g.get(x, y); if (c === F.wall[0] || c === F.wall[1] || c === F.wall[2]) g.set(x, y, (x + (y % 2) * 3) % 6 === 0 || y === 63 ? F.found[1] : F.found[0]); }
      // the front door (glass patio door by the pool), a little roof over it, a porch lamp and steps
      P(t => t.rect(30, 44, 14, 23, F.door[0]));
      if (F.glassDoor) { g.rect(31, 45, 12, 21, F.door[0]); g.rect(37, 45, 1, 21, F.trim); g.rect(32, 46, 2, 5, '#ffffff'); g.rect(40, 54, 1, 4, F.door[1]); }
      else if (cabin) { for (const yy of [48, 60]) g.rect(31, yy, 12, 1, '#3e3e48'); for (const xx of [34, 38]) g.rect(xx, 45, 1, 21, F.door[1]); g.set(41, 55, '#e8c070'); }
      else { g.rect(31, 45, 12, 21, F.door[1]); g.rect(32, 46, 10, 6, F.door[0]); g.rect(32, 54, 4, 10, F.door[0]); g.rect(38, 54, 4, 10, F.door[0]); g.rect(33, 47, 8, 4, F.glass); g.set(41, 58, '#f6c83a'); }
      P(t => t.poly([[27, 44], [47, 44], [44, 40], [30, 40]], F.roof[2]));
      P(t => t.rect(47, 47, 3, 4, '#f6c83a')); win.push([48, 49]);
      P(t => { t.rect(28, 66, 18, 2, F.porch[0]); t.rect(26, 68, 22, 2, F.porch[1]); });
      door = [37, 69];
    }
    const c = g.canvas(); c.meta = { door, win };
    return (houseCache[key] = c);
  };
})();
