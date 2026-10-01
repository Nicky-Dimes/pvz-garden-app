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
      default: g.set(x, y, k); for (let i = 1; i < w - 1; i++) g.set(x + i, y + 1, k); g.set(x + w - 1, y, k);
    }
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
    ice(t, G) {
      const h = hatAt(G);
      for (const [dx, hh] of [[-2.5, 3.5], [0, 5], [2.5, 3.2]]) { const x = h.x + dx, y = h.y; t.poly([[x - 1.1, y], [x, y - hh], [x + 1.1, y]], '#c8f0ff'); }
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

  // Fusion items (data.js FUSION_ITEMS): headgear and add-ons. behind: drawn behind the plant.
  const ITEM = {
    army: { draw(t, G) { const h = hatAt(G); t.ell(h.x, h.y + 1, h.w / 2 + 1.4, 4, ['#9aa85a', '#6a7a32', '#3e4a1e'], 0, (x, y) => y <= h.y + 1); t.rect(Math.round(h.x - h.w / 2 - 2), h.y + 1, h.w + 4, 1, '#3e4a1e'); } },
    knight: { draw(t, G) { const h = hatAt(G); t.ell(h.x, h.y + 1.5, h.w / 2 + 1.2, 4.4, ['#f4f8ff', '#b8c4d8', '#6a7690'], 0, (x, y) => y <= h.y + 1.5); t.ell(h.x - 1, h.y - 4.5, 1.4, 2.6, ['#ff9aa0', '#e0303e', '#901c30'], -0.4); } },
    pirate: { draw(t, G) { const h = hatAt(G), w = h.w / 2 + 3; t.poly([[h.x - w, h.y + 1], [h.x - w + 2, h.y - 3], [h.x, h.y - 5], [h.x + w - 2, h.y - 3], [h.x + w, h.y + 1]], '#3a3044'); } },
    cowboy: { draw(t, G) { const h = hatAt(G), w = h.w / 2 + 3.5; t.ell(h.x, h.y + 0.5, w, 1.4, ['#d9a066', '#a8743a', '#6a4422']); t.ell(h.x, h.y - 1.5, h.w / 2 - 0.5, 3, ['#d9a066', '#a8743a', '#6a4422'], 0, (x, y) => y <= h.y); } },
    wizard: { draw(t, G) { const h = hatAt(G), w = h.w / 2 + 2; t.poly([[h.x - w, h.y + 1], [h.x + w, h.y + 1], [h.x + 2, h.y - 8], [h.x + 4, h.y - 9]], '#7a44c8'); t.rect(Math.round(h.x - w), h.y, Math.round(w * 2) + 1, 1, '#4a2478'); } },
    crown: { draw(t, G) { const h = hatAt(G), w = Math.max(3, Math.round(h.w / 2)); t.poly([[h.x - w, h.y + 1], [h.x - w, h.y - 3], [h.x - w / 2, h.y - 1], [h.x, h.y - 4], [h.x + w / 2, h.y - 1], [h.x + w, h.y - 3], [h.x + w, h.y + 1]], '#f6c83a'); } },
    ninja: { draw(t, G) { const y = G.ey ? G.ey - 2 : G.hy - 2; t.rect(G.hx - G.hr, y - 1, G.hr * 2 + 1, 2, '#3a3044'); stroke(t, [[G.hx - G.hr, y], [G.hx - G.hr - 3, y + 1], [G.hx - G.hr - 5, y + 3]], 0.6, 0.5, '#3a3044'); } },
    space: { behind: true, draw(t, G) { t.ell(G.hx, G.hy, G.hr + 2.6, G.hr + 2.4, 'rgba(200,240,255,0.55)'); } },
    extrashooter: { draw(t, G, F) { const x = G.hx - 1, y = G.top + 1; t.ell(x, y, 2.6, 2.2, F.main); t.rect(x + 1, y - 1, 4, 2, F.main[1]); t.ell(x + 5, y, 1.1, 1.8, F.main); } },
    catapult: { behind: true, draw(t, G) { PART.basket.draw(t, G); } },
    // strapped on the back (left) edge, drawn in front so wide plants (petals, spikes, lily pads) don't hide it
    jetpack: { draw(t, G, F, P) { const x = Math.max(4, Math.round(G.hx - G.hr)), y = G.hy + 1; t.rect(x - 2, y - 3, 3, 7, '#a8b4c8'); t.rect(x - 2, y - 3, 1, 7, '#e8eef8'); t.rect(x + 1, y - 1, 2, 1, '#6a7690'); t.poly([[x - 2, y + 4], [x + 1, y + 4], [x - 0.5, y + 7 + (P.frame ? 1 : 0)]], '#f2742a'); } },
    halloween: { draw(t, G) { PART.pumpkin.draw(t, G); } },
  };
  function itemDetails(g, id, G) {
    const h = hatAt(G);
    if (id === 'army') { const s = [h.x, h.y - 2]; if (g.filled(s[0], s[1])) g.set(s[0], s[1], '#fff27a'); }
    if (id === 'knight') for (let x = Math.round(h.x - h.w / 2); x <= h.x + h.w / 2; x++) if (g.filled(x, h.y) && g.get(x, h.y) !== INK) g.set(x, h.y, '#4a5468');
    if (id === 'pirate') { if (g.filled(h.x, h.y - 2)) g.set(h.x, h.y - 2, WHITE); if (g.filled(h.x - 1, h.y - 1)) g.set(h.x - 1, h.y - 1, WHITE); if (g.filled(h.x + 1, h.y - 1)) g.set(h.x + 1, h.y - 1, WHITE); }
    if (id === 'cowboy') for (let x = Math.round(h.x - h.w / 2 + 1); x < h.x + h.w / 2 - 1; x++) if (g.filled(x, h.y - 1)) g.set(x, h.y - 1, '#e0303e');
    if (id === 'wizard') for (const [x, y] of [[h.x - 1, h.y - 3], [h.x + 2, h.y - 5]]) if (g.filled(x, y)) g.set(x, y, '#fff27a');
    if (id === 'crown') for (const [x, y] of [[h.x, h.y - 1], [h.x - 3, h.y], [h.x + 3, h.y]]) if (g.filled(x, y)) g.set(x, y, (x + y) % 2 ? '#e0303e' : '#4fc4ee');
    if (id === 'space') { const x = G.hx - G.hr, y = G.hy - G.hr; if (g.get(x, y) || true) g.set(x, y, WHITE); }
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
    if (L.element && EL_FX[L.element]) EL_FX[L.element](front, G, P);
    behind.outline(); under(g, behind);
    front.outline(); g.merge(front);
    if (partId) partDetails(g, partId, G, F || C);
    if (fz.item) itemDetails(g, fz.item, G);
    if (L.element) elDetails(g, L.element, G, P);
    if (L.skin) applySkin(g, L.skin);
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
  PX.art = { face, mouth, feet, leaf, baseLeaves, stemTo, pal, piece, under, mixHex, lum, LEAF, hatAt };
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
  const itemCache = {};
  PX.item = function (kind, id) {
    const key = kind + ':' + id; if (itemCache[key]) return itemCache[key];
    let g = null;
    try {
      if (kind === 'egg' || kind === 'seed') g = seedPacket(id);
      else if (kind === 'element') { g = new Grid(7, 7); if (PX.ELEMENT_ICON && PX.ELEMENT_ICON[id]) PX.ELEMENT_ICON[id](g); else { const E = window.PSDATA && window.PSDATA.ELEMENTS[id]; g.ell(3.5, 3.5, 2.6, 2.6, E ? E.color : '#8c93a8'); g.outline(); } }
      else if (kind === 'core') { g = new Grid(13, 13); if (PX.ELEMENT_CORE) PX.ELEMENT_CORE(g, id); else { const E = window.PSDATA && window.PSDATA.ELEMENTS[id]; g.ell(6.5, 6.5, 5, 5, E ? E.color : '#8c93a8'); g.outline(); } }
      else if (kind === 'shard') { g = new Grid(9, 9); if (PX.ELEMENT_SHARD) PX.ELEMENT_SHARD(g, id); else { const E = window.PSDATA && window.PSDATA.ELEMENTS[id]; g.poly([[4.5, 0.5], [7.5, 4.5], [4.5, 8.5], [1.5, 4.5]], E ? E.color : '#8c93a8'); g.outline(); } }
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
})();
