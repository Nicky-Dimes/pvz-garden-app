// art-plants.js — PVZ Garden plant species art (see the SPECIES ART CONTRACT at the top of art-core.js).
// Each species: PX.PLANT_PAL[id] (default colours) + PX.PLANT_ART[id](g, stage, P, C) -> geom. Art faces RIGHT, 32x32, feet at y 29-31.
// Stage sizes: 0 about 20 px tall (top near y 11), 1 about 24 px (top near y 7), 2 about 28 px (top near y 3).
// Style: DawnBringer-ish colours, 1px ink outline (g.outline / piece), 3-tone shading via ramps, a cute face (PX.art.face).
(function () {
  'use strict';
  const { RAMPS, INK, stroke, starPts } = PX;
  const { face, feet, leaf, baseLeaves, stemTo, piece, mixHex } = PX.art;
  const ART = PX.PLANT_ART, PAL = PX.PLANT_PAL;
  const T = (stage, a, b, c) => (stage === 2 ? c : stage === 1 ? b : a); // pick a value per stage

  // ---------------- Peashooter -> Repeater -> Gatling Pea ----------------
  // A round pea head with a tube snout pointing right; a back leaf tuft from stage 1; a helmet + four-barrel snout at stage 2.
  PAL.peashooter = { main: ['#b8f070', '#6cc84a', '#2f8a3e'], leaf: ['#a6ec70', '#5cb43a', '#2f7a4a'], stem: '#3f8a3a', root: '#7a5a2a', part: 'snout' };
  function peaHead(g, stage, P, C, o) {
    o = o || {};
    const hr = T(stage, 4.6, 5.4, 6), hx = T(stage, 14, 14, 14), hy = T(stage, 16, 13, 10) + (P.frame && !P.walk ? 0.4 : 0);
    const sl = T(stage, 4, 5, 5.4), dark = o.dark || 0;
    const M = dark ? C.main.map(c => mixHex(c, INK, dark)) : C.main;
    // stem + base leaves + feet
    stemTo(g, [[15.5, 29], [15.6, hy + hr + 2], [hx + 0.5, hy + hr - 0.5]], C.stem, T(stage, 0.8, 0.9, 1));
    baseLeaves(g, 16, 27.6, P, C.leaf, T(stage, 5, 6, 6.5));
    feet(g, 16, P, C.root, T(stage, 2.6, 3, 3.2));
    // back leaf tuft (stage 1+) behind the head
    if (stage >= 1) piece(g, t => { leaf(t, hx - hr + 1, hy - 1, T(stage, 0, 5, 6), Math.PI + 0.5, C.leaf, 0.32); leaf(t, hx - hr + 1.5, hy - 2.5, T(stage, 0, 4, 5.4), Math.PI + 1.1, C.leaf, 0.32); });
    else piece(g, t => leaf(t, hx - hr + 1.4, hy - hr + 1.6, 3.6, Math.PI + 0.9, C.leaf, 0.34));
    // head + snout
    piece(g, t => {
      t.ell(hx, hy, hr, hr * 0.95, M);
      t.ell(hx + hr * 0.75 + 0.5, hy + 0.4, sl * 0.6, T(stage, 1.9, 2.2, 2.5), M);
    });
    const sx = Math.round(hx + hr * 0.75 + sl * 0.6 + 0.6), sy = hy + 0.4, sr = T(stage, 2.1, 2.4, 2.8);
    piece(g, t => t.ell(sx, sy, 1.4, sr, M));
    return { hx, hy, hr, sx: Math.round(sx), sy: Math.round(sy), sr, M };
  }
  function peaMuzzle(g, H, P, gatling) {
    const x = H.sx, y = Math.round(H.sy);
    if (gatling) { // four little barrel holes in a grey ring
      for (let yy = y - 2; yy <= y + 2; yy++) if (g.filled(x, yy)) g.set(x, yy, '#8c93a8');
      for (const yy of [y - 2, y - 1, y + 1, y + 2]) if (g.filled(x, yy)) g.set(x, yy, (yy % 2) ? '#222034' : '#595a70');
      if (g.filled(x, y)) g.set(x, y, '#dfe8fb');
    } else {
      for (let yy = y - 1; yy <= y + 1; yy++) if (g.filled(x, yy)) g.set(x, yy, '#1f4a2a');
      if (P.mouth === 'open' && g.filled(x, y)) g.set(x, y, '#b8f07a');
    }
  }
  ART.peashooter = function (g, stage, P, C) {
    const H = peaHead(g, stage, P, C);
    let top = Math.round(H.hy - H.hr) - 1;
    if (stage === 2) { // army helmet
      piece(g, t => t.ell(H.hx - 0.5, H.hy - H.hr * 0.25, H.hr + 1.2, H.hr * 0.85, ['#a4b05e', '#6e7c34', '#414c1e'], 0, (x, y) => y <= H.hy - H.hr * 0.2));
      top = Math.round(H.hy - H.hr * 1.1) - 1;
    }
    g.outline();
    peaMuzzle(g, H, P, stage === 2);
    if (stage === 2) { const y = Math.round(H.hy - H.hr * 0.2); for (let x = Math.round(H.hx - H.hr - 1); x <= H.hx + H.hr; x++) if (g.filled(x, y)) g.set(x, y, '#414c1e'); g.set(Math.round(H.hx - 1), Math.round(H.hy - H.hr * 0.75), '#fff27a'); }
    // highlight
    const hl = [Math.round(H.hx - H.hr * 0.5), Math.round(H.hy - H.hr * 0.55)];
    if (stage < 2 && g.filled(hl[0], hl[1])) g.set(hl[0], hl[1], '#e8ffc8');
    const ex = Math.round(H.hx - 1), ey = Math.round(H.hy - (stage === 2 ? 0.5 : 1.5));
    face(g, ex, ey, stage >= 1 && !P.eyes ? Object.assign({}, P, { eyes: 'brave' }) : P, { gap: 4, cheeks: [ex - 1, ex + 5, ey + 3] });
    return { hx: Math.round(H.hx), hy: Math.round(H.hy), hr: Math.round(H.hr), top, ey, front: H.sx };
  };

  // ---------------- Sunflower -> Twin Sunflower -> Sunflower Queen ----------------
  // Petal ring (C.main) round a warm face (C.acc); stage 1 grows a second smaller head; stage 2 wears a little petal crown.
  PAL.sunflower = { main: ['#fff27a', '#f6c83a', '#c7861c'], acc: ['#f6d6a6', '#e2a866', '#a8683a'], leaf: ['#a6ec70', '#5cb43a', '#2f7a4a'], stem: '#3f8a3a', root: '#7a5a2a', part: 'petals', fuseLeaf: ['#fff27a', '#f6c83a', '#c7861c'] };
  function sunHead(g, x, y, r, C, P, spin) {
    const n = r < 3 ? 9 : 12, pl = r < 3 ? 1.5 : 2.1;
    piece(g, t => { for (let i = 0; i < n; i++) { const a = i * Math.PI * 2 / n + (spin || 0); t.ell(x + Math.cos(a) * (r + 1.2), y + Math.sin(a) * (r + 1.2), pl, pl * 0.62, C.main, a); } });
    piece(g, t => t.ell(x, y, r, r * 0.95, C.acc));
  }
  // stage 0: one flower. stage 1 (Twin Sunflower): the stem forks into two equal heads. stage 2 (Sunflower Queen): three
  // flowers, a big crowned one in the middle and one each side.
  function sunFace(g, x, y, r, P, main) {
    if (r >= 3.4) { const ex = Math.round(x - 2), ey = Math.round(y - 2); face(g, ex, ey, P, { gap: 3, mouth: [ex, ey + 4, 5], cheeks: main ? [ex - 1, ex + 5, ey + 3] : null }); return ey; }
    const ex = Math.round(x - 1.5), ey = Math.round(y - 1.5); // small heads: dot eyes + a little smile
    if (P.eyes === 'blink' || P.eyes === 'closed' || P.eyes === 'happy') g.px([[ex, ey + 1], [ex + 3, ey + 1]], INK); else g.px([[ex, ey], [ex, ey + 1], [ex + 3, ey], [ex + 3, ey + 1]], INK);
    g.px([[ex + 1, ey + 3], [ex + 2, ey + 3]], INK);
    return ey;
  }
  ART.sunflower = function (g, stage, P, C) {
    const bob = P.frame && !P.walk ? 0.5 : 0, spin = P.frame ? 0.13 : 0;
    feet(g, 16, P, C.root, 3);
    let heads; // [x, y, r, main]
    if (stage === 0) heads = [[15.5, 16 + bob, 3.8, true]];
    else if (stage === 1) heads = [[10.2, 14 + bob, 3.3, false], [21.4, 12.6 + bob, 3.5, true]];
    else heads = [[6.8, 18.4 + bob, 2.9, false], [25, 17.8 + bob, 2.9, false], [15.8, 10 + bob, 3.7, true]];
    // stems: one trunk that forks to every head
    const forkY = T(stage, 22, 22.5, 23);
    stemTo(g, [[16, 29], [16, forkY]], C.stem, T(stage, 0.9, 1, 1.05));
    for (const [x, y] of heads) stemTo(g, [[16, forkY], [16 + (x - 16) * 0.55, (forkY + y) / 2 + 1], [x, y + 2]], C.stem, 0.8);
    baseLeaves(g, 16, T(stage, 25, 25.6, 26.2), P, C.leaf, T(stage, 5.5, 6, 6.5));
    for (const [x, y, r] of heads) sunHead(g, x, y, r, C, P, spin + x * 0.07);
    const M = heads[heads.length - 1];
    let top = Math.round(Math.min(...heads.map(h => h[1] - h[2] - 3.5)));
    if (stage === 2) { // petal crown on the middle flower
      const [hx, hy, r] = M;
      piece(g, t => t.poly([[hx - 3, hy - r - 0.5], [hx - 3, hy - r - 3.4], [hx - 1.5, hy - r - 1.8], [hx, hy - r - 4.2], [hx + 1.5, hy - r - 1.8], [hx + 3, hy - r - 3.4], [hx + 3, hy - r - 0.5]], '#ffd23a'));
      top = Math.round(hy - r - 4.6);
    }
    g.outline();
    if (stage === 2) { const [hx, hy, r] = M; g.set(Math.round(hx), Math.round(hy - r - 2), '#e0303e'); g.set(Math.round(hx - 2.5), Math.round(hy - r - 1.6), '#4fc4ee'); g.set(Math.round(hx + 2.5), Math.round(hy - r - 1.6), '#4fc4ee'); }
    let ey = 0;
    for (const [x, y, r, main] of heads) { const e = sunFace(g, x, y, r, P, main); if (main) ey = e; }
    return { hx: Math.round(M[0]), hy: Math.round(M[1]), hr: Math.round(M[2] + 1), top, ey, hat: { x: Math.round(M[0]), y: Math.round(M[1] - M[2] - 1.5), w: 8 } };
  };

  // ---------------- Chomper -> Super Chomper -> Mega Chomper ----------------
  // A big round purple head (C.main) with a wide wedge mouth opening to the right (rows of white teeth, dark throat, pink
  // tongue) on a thin curly stem, with a leaf collar under the head. Stage 1 grows back leaves; stage 2 a spiky leaf mane + fangs.
  PAL.chomper = { main: ['#d8a8f8', '#9a5ad8', '#5e2a8e'], leaf: ['#a6ec70', '#5cb43a', '#2f7a4a'], acc: ['#ff9ab0', '#e0506e', '#9a2a46'], stem: '#3f8a3a', root: '#7a5a2a', part: 'jaws' };
  const THROAT = '#4a1030';
  ART.chomper = function (g, stage, P, C) {
    const open = P.mouth === 'open' || P.mouth === 'grin';
    const rx = T(stage, 6.6, 7.6, 8.4), ry = T(stage, 5.8, 6.6, 7.2), hx = T(stage, 14.4, 14.2, 14.2);
    const hy = T(stage, 15.4, 12.4, 10.4) + (P.frame && !P.walk ? 0.4 : 0);
    // thin curly stem, base leaves, roots
    stemTo(g, [[15.5, 29], [17, 26], [16.4, hy + ry + 2.5], [hx + 0.5, hy + ry - 1]], C.stem, 0.55);
    baseLeaves(g, 16, 27.4, P, C.leaf, T(stage, 4.6, 5.4, 6));
    feet(g, 16, P, C.root, 3);
    // a leaf sprout on top (stage 1) or a spiky leaf mane (stage 2), leaning back
    if (stage >= 1) piece(g, t => {
      const top = hy - ry + 1.2, list = stage === 2 ? [[-1.5, -2.0, 6.4], [-3.6, -2.5, 5.6], [0.8, -1.55, 5]] : [[-1.2, -2.05, 5], [-3, -2.6, 4.2]];
      for (const [dx, a, len] of list) leaf(t, hx + dx, top, len, a, C.leaf, stage === 2 ? 0.22 : 0.28);
    });
    // leaf collar where the stem meets the head
    piece(g, t => { leaf(t, hx - 0.5, hy + ry - 1.2, T(stage, 4, 4.6, 5), Math.PI - 0.55, C.leaf, 0.32); leaf(t, hx + 1.5, hy + ry - 1.2, T(stage, 3.6, 4.2, 4.6), 0.5, C.leaf, 0.32); });
    // the head: a round dome with a wedge mouth cut out on the right
    const hgX = hx - rx * 0.12, hgY = hy + ry * 0.12, tipX = hx + rx + 1.5;
    const upY = open ? hy - ry * 0.95 : hgY - ry * 0.42, loY = open ? hy + ry * 1.05 : hgY + ry * 0.5;
    const upAt = x => hgY + (upY - hgY) * (x - hgX) / (tipX - hgX), loAt = x => hgY + (loY - hgY) * (x - hgX) / (tipX - hgX);
    const inMouth = (x, y) => x + 0.5 > hgX && y + 0.5 > upAt(x + 0.5) && y + 0.5 < loAt(x + 0.5);
    piece(g, t => t.ell(hx, hy, rx, ry, C.main, 0, (x, y) => !inMouth(x, y)));
    g.outline();
    // throat, tongue and teeth inside the wedge (the outline already drew the lips' ink edge)
    const x0 = Math.ceil(hgX + 1), x1 = Math.floor(hx + rx);
    for (let x = x0; x <= x1; x++) {
      const yu = Math.ceil(upAt(x + 0.5) - 0.5), yl = Math.floor(loAt(x + 0.5) - 0.5);
      for (let y = yu; y <= yl; y++) {
        if (!inMouth(x, y)) continue;
        const near = g.get(x, y - 1) !== null && g.get(x, y - 1) !== INK ? 0 : 1;
        if (g.get(x, y) === INK || g.get(x, y) === null) g.set(x, y, y >= yl - (open ? 1 : 0) && x < x1 - 1 && x > x0 ? C.acc[1] : THROAT);
        void near;
      }
    }
    // teeth along the jaw edges: every other edge pixel of the mouth, hanging from the top jaw and rising from the bottom one
    const mouthPx = (x, y) => inMouth(x, y) && (g.get(x, y) === THROAT || g.get(x, y) === C.acc[1]);
    const teeth = [];
    for (let y = 0; y < 32; y++) for (let x = x0; x <= x1 + 1; x++) {
      if (!mouthPx(x, y)) continue;
      const top = !inMouth(x, y - 1), bot = !inMouth(x, y + 1);
      if ((top || bot) && (x + y) % 2 === 0) teeth.push([x, y, top]);
    }
    for (const [x, y, top] of teeth) {
      g.set(x, y, '#ffffff');
      if (stage === 2 && (x % 4 === 0) && mouthPx(x, top ? y + 1 : y - 1)) g.set(x, top ? y + 1 : y - 1, '#e8e4f4'); // longer fangs
    }
    // light lip rims
    for (let x = x0 - 1; x <= x1 + 1; x++) for (const y of [Math.round(upAt(x + 0.5)) - 1, Math.round(loAt(x + 0.5))]) if (g.get(x, y) === C.main[1] || g.get(x, y) === C.main[2]) g.set(x, y, C.main[0]);
    // spots on the dome
    g.px([[Math.round(hx - rx * 0.45), Math.round(hy - ry * 0.4)], [Math.round(hx + rx * 0.15), Math.round(hy - ry * 0.7)], [Math.round(hx - rx * 0.7), Math.round(hy + ry * 0.05)], [Math.round(hx + rx * 0.5), Math.round(hy - ry * 0.45)]].filter(([x, y]) => g.filled(x, y) && g.get(x, y) !== INK), C.main[0]);
    // eyes high on the dome, looking forward
    const ex = Math.round(hx - 1), ey = Math.round(hy - ry * 0.62);
    face(g, ex, ey, stage === 2 && !P.eyes ? Object.assign({}, P, { eyes: 'brave' }) : P, { gap: 3 });
    return { hx: Math.round(hx), hy: Math.round(hy), hr: Math.round(ry), top: Math.round(hy - ry) - 1, ey, front: Math.round(hx + rx), hat: { x: Math.round(hx - 1), y: Math.round(hy - ry + 1), w: Math.round(rx * 1.3) } };
  };
  // shared with the other species files
  Object.assign(PX.art, { peaHead, peaMuzzle, sunHead });
})();
