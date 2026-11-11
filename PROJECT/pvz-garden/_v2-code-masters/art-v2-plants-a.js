// art-v2-plants-a.js — PVZ Garden v2 pixel art: the MASTER plants (Peashooter, Sunflower, Chomper), 3 stages each.
// Logical 64x64 grid (see art-v2-kit.js), base on row 62, facing right. Matches references/01_APPROVED_character_style_reference.png
// within the family's rules: Sunflower stage 3 = three flowers; Chomper has NO eyes (every stage).
(function () {
  'use strict';
  const V = PX.v2, { ell, poly, rect, px, piece, cel, round, eyes, mouth, blush, leaf, baseLeaves, stem, hop, moodOf, geo, ramp, mix, OUT, WHITE } = V;
  const ART = PX.PLANT_ART2, PAL = PX.PLANT_PAL2;
  const T = (s, a, b, c) => (s === 2 ? c : s === 1 ? b : a);
  const R5 = (C, key, fallback, o) => ramp(C && C[key] ? V.richMid(C[key], o) : fallback, o && o.k ? { k: o.k } : undefined);

  // ===================== PEASHOOTER =====================
  // The game's stages: Peashooter -> Repeater -> Gatling Pea (data.js). Stage 1: a round sprout-bulb with three little leaves and a
  // smile. Stage 2 (Repeater): the snout tube, a two-leaf crest at the back, a deeper green, a determined look. Stage 3 (Gatling
  // Pea): the army helmet and a wide four-barrel muzzle (its identity in the game), rendered in the approved style.
  PAL.peashooter = {
    head: ['#f4ffb8', '#c8f25c', '#97da3e', '#5aa834', '#2f6f35'],
    head2: ['#eaffb0', '#b2ec52', '#80cc38', '#469a33', '#246032'],
    helmet: ['#eef2b8', '#bcc76a', '#8e9a44', '#62702c', '#3c461c'],
    leaf: ['#e8ff9a', '#a6e84a', '#6ccb3a', '#38923b', '#1f5c37'],
    stem: ['#d8f58a', '#8fd84a', '#5fb83a', '#3a8a36', '#225c33'],
  };
  // a ramp for this plant: the hand-picked one, or (element / fusion colours) one built from the engine palette C
  const pick = (C, key, own, o) => (C && C.__v2tint && C[key] ? ramp(V.richMid(C[key], o)) : own);
  ART.peashooter = function (g, stage, P, C) {
    const Q = PAL.peashooter, HEAD = pick(C, 'main', stage === 1 ? Q.head2 : Q.head, { s: 1.35, l: 0.86 }), LEAF = pick(C, 'leaf', Q.leaf, { s: 1.3, l: 0.82 }), STEM = pick(C, 'leaf', Q.stem, { s: 1.2, l: 0.8 });
    const mood = moodOf(P), up = hop(P), ko = P.eyes === 'closed' && P.mouth === 'o' && !P.sleep, hurt = P.eyes === 'sad';
    const atk = P.arms === 'out' || (P.mouth === 'open' && P.eyes === 'brave');
    const sag = ko ? 4 : hurt ? 1 : 0, lean = atk ? -1 : 0;
    const hx = T(stage, 31, 28, 27) + lean, hy = T(stage, 44, 33, 29) + up + sag, rx = T(stage, 11, 13, 15), ry = T(stage, 10, 12, 14);
    const baseY = 56, droop = ko ? 0.55 : 0;
    // back leaves (behind the head)
    if (stage === 0) {
      const ty = hy - ry + 2, perk = P.arms === 'up' ? -0.2 : 0;
      piece(g, t => leaf(t, hx - 2, ty, -2.45 - perk + droop, 9, 4, LEAF, { curl: -0.18 }));
      piece(g, t => leaf(t, hx + 2, ty, -0.7 + perk - droop, 9, 4, LEAF, { curl: 0.18 }));
      piece(g, t => leaf(t, hx, ty, -1.62, 8, 3.5, LEAF, { curl: 0.12 }));
    } else if (stage === 1) { // the Repeater's crest: two leaves sweeping back
      piece(g, t => leaf(t, hx - 9, hy - ry + 8, -2.75 + droop, 13, 5, LEAF, { curl: -0.2 }));
      piece(g, t => leaf(t, hx - 6, hy - ry + 4, -2.25 + droop, 13, 5, LEAF, { curl: -0.18 }));
    } else { // Gatling Pea: a small leaf tuft peeks out under the back of the helmet
      piece(g, t => leaf(t, hx - 12, hy - 1, -2.9 + droop, 10, 4, LEAF, { curl: -0.2 }));
    }
    // stem
    const neck = hy + ry - 3;
    stem(g, 32, neck, baseY + 3, STEM, stage === 2 ? 4 : 3);
    baseLeaves(g, 32, baseY, T(stage, 21, 25, 29), LEAF, P, { wd: T(stage, 5, 6, 7), len: T(stage, 12, 14, 16) });
    // head (+ snout tube from stage 2), one piece so the two join without a seam
    const sx0 = hx + rx - 5, sx1 = hx + rx + T(stage, 0, 9, 10), scy = hy + 1, sh = T(stage, 0, 5, 7) + (atk ? 1 : 0);
    piece(g, t => {
      ell(t, hx, hy, rx, ry, HEAD[2]);
      ell(t, hx - 1, hy + 1, rx - 1, ry, HEAD[2]); // a fuller back/bottom: subtly off-round
      round(t, HEAD, { cx: hx - 1, cy: hy, rx, ry, spec: [-0.42, -0.5, 0.24, 0.17] });
      if (stage > 0) { // the tube: lit along the top, shaded underneath; the muzzle flares over its last 3 px
        for (let x = sx0; x <= sx1; x++) {
          const fl = x >= sx1 - 2 ? 1 + (x >= sx1 - 1 ? 1 : 0) : 0, y0 = scy - sh - fl, y1 = scy + sh + fl;
          for (let y = y0; y <= y1; y++) {
            if (((x + 0.5 - hx) / rx) ** 2 + ((y + 0.5 - hy) / ry) ** 2 <= 1) continue;
            const f = (y - y0) / Math.max(1, y1 - y0);
            t.fset(x, y, f < 0.2 ? HEAD[1] : f > 0.84 ? HEAD[4] : f > 0.6 ? HEAD[3] : HEAD[2]);
          }
        }
      }
    });
    if (stage === 2) { // the Gatling muzzle: a thick rim round four dark barrels (they flash yellow when it fires)
      const ox = sx1 - 1, ory = sh + 1.8, HOLE = '#123e1f', FIRE = atk || P.mouth === 'open';
      piece(g, t => {
        ell(t, ox, scy + 0.5, 4.2, ory, HEAD[1]);
        ell(t, ox + 0.5, scy + 0.5, 3.1, ory - 1.4, HEAD[3]);
        for (const [dx, dy] of [[-1, -3], [1, -3], [-1, 3], [1, 3]]) ell(t, ox + 0.5 + dx, scy + 0.5 + dy, 1.2, 1.6, FIRE ? '#ffe680' : HOLE);
        ell(t, ox - 1.5, scy - ory * 0.45, 0.8, 1.4, HEAD[0]);
      });
    }
    if (stage === 1) { // the opening: a thick light rim round a deep green hole (darker when it shoots)
      const ox = sx1 - 1, orx = T(stage, 0, 3, 3.8), ory = sh + 1.8, HOLE = P.mouth === 'open' || atk ? '#123e1f' : '#1e5c2b';
      piece(g, t => {
        ell(t, ox, scy + 0.5, orx, ory, HEAD[1]);
        ell(t, ox + 0.5, scy + 0.5, orx - 1.1, ory - 1.6, HOLE);
        ell(t, ox + 1.2, scy + 1.2, orx - 2, ory - 3.2, mix(HOLE, '#000000', 0.3));
        ell(t, ox - 0.4, scy - ory * 0.35, 0.8, 1.2, HEAD[0]);
      });
    }
    // the face: big eyes on the front of the head (the near/right eye a touch bigger), blush low on the cheek
    const ex = hx + T(stage, 1, 3, 4), ey = hy + T(stage, 0, -1, 2), ew = T(stage, 4, 5, 6), eh = T(stage, 6, 8, 9);
    eyes(g, ex, ey, { sp: T(stage, 9, 10, 12), w: ew, h: eh, w2: ew + 1, h2: eh + 1, mood, skin: HEAD[2], lidCol: HEAD[2] });
    if (stage === 2) { // Gatling Pea's army helmet: an olive dome with a brim, low over the brow, a strap down the cheek
      const H = Q.helmet, by = hy - ry * 0.42, top = hy - ry - 2;
      piece(g, t => {
        ell(t, hx - 1, by, rx + 0.5, by - top, H[2], 0, (x, y) => y < by);
        round(t, H, { cx: hx - 2, cy: by, rx: rx + 1.5, ry: by - top, spec: [-0.45, -0.6, 0.16, 0.18], band: [0.6, 0.25, -0.1] });
        for (const [x, y] of [[hx - 8, by - 6], [hx + 2, by - 9], [hx + 7, by - 4]]) ell(t, x, y, 1.6, 1.1, H[3], 0, (a, b) => t.fget(a, b) === H[1] || t.fget(a, b) === H[2]); // camo spots
      });
      piece(g, t => { V.rect(t, Math.round(hx - rx - 2), Math.round(by), Math.round(2 * rx + 5), 2, H[3]); cel(t, H, { only: H[3], s: [1, 1], h: [1, 1], noDeep: true }); });
    }
    if (stage === 1 && !mood) { // the Repeater's determined (not mad) look: a short 2-px brow over each eye, sloping in
      const by = Math.round(ey - eh / 2) - 4, l = ex - 6 - Math.round(ew / 2), r = ex + 6 - Math.round(ew / 2);
      for (let i = 0; i < ew; i++) { px(g, [[l + i, by + Math.floor(i / 2)], [l + i, by + 1 + Math.floor(i / 2)]], OUT); }
      for (let i = 0; i < ew + 1; i++) { px(g, [[r + i, by + Math.floor((ew - i) / 2)], [r + i, by + 1 + Math.floor((ew - i) / 2)]], OUT); }
    }
    if (P.eyes !== 'mad') blush(g, ex + T(stage, 7, 8, 9), ey + Math.round(eh / 2) + 1, T(stage, 3, 4, 4));
    if (stage === 0) mouth(g, ex + 1, ey + Math.round(eh / 2) + 2, P.mouth === 'open' ? 'open' : P.mouth === 'o' ? 'o' : 'fang', P.mouth === 'open' ? 5 : 4);
    return geo(g, { hx, hy, hr: Math.max(rx, ry), ey, front: stage > 0 ? sx1 + 2 : hx + rx });
  };

  // ===================== SUNFLOWER =====================
  // Bright two-layer petals round a warm orange-brown face; big friendly eyes and a smile. Stage 3 = THREE flowers (family rule):
  // the big one in the middle, two smaller ones low at the sides.
  PAL.sunflower = {
    petal: ['#fffbd0', '#ffec6a', '#ffd23a', '#f5a524', '#c46a1c'],
    back: ['#ffe680', '#ffcf40', '#f2b030', '#d98a26', '#9c561a'],
    face: ['#ffd9a0', '#f4a85a', '#de8436', '#b0581e', '#743417'],
    leaf: ['#e8ff9a', '#a6e84a', '#6ccb3a', '#38923b', '#1f5c37'],
    stem: ['#d8f58a', '#8fd84a', '#5fb83a', '#3a8a36', '#225c33'],
  };
  // one flower: face radius fr centred (x, y); petals pl long. spin = petal phase (radians)
  function flower(g, x, y, fr, pl, Q, P, o) {
    o = o || {}; const n = fr >= 7 ? 13 : 11, spin = o.spin || 0, R0 = fr + pl;
    // the back layer: petal tips peeking between the front petals (darker gold), one outlined piece
    piece(g, t => { for (let i = 0; i < n; i++) { const a = spin + (i + 0.5) * Math.PI * 2 / n; ell(t, x + Math.cos(a) * (fr + pl * 0.5), y + Math.sin(a) * (fr + pl * 0.5), pl * 0.62, pl * 0.32, Q.back[2], a); } round(t, Q.back, { cx: x, cy: y, rx: R0, ry: R0, spec: false, band: [0.7, 0.2, -0.2] }); });
    // the front petals: one smooth shape, shaded as a whole (lit upper left), orange where the petals meet the face, light tips,
    // and a fine radial crease between neighbours
    piece(g, t => {
      for (let i = 0; i < n; i++) { const a = spin + i * Math.PI * 2 / n; ell(t, x + Math.cos(a) * (fr + pl * 0.42), y + Math.sin(a) * (fr + pl * 0.42), pl * 0.6, pl * 0.36, Q.petal[2], a); }
      round(t, Q.petal, { cx: x, cy: y, rx: R0, ry: R0, spec: false, band: [0.66, 0.24, -0.15] });
      for (let yy = Math.floor(y - R0); yy <= y + R0; yy++) for (let xx = Math.floor(x - R0); xx <= x + R0; xx++) {
        const c = t.fget(xx, yy); if (c === null || c === OUT) continue; const r = Math.hypot(xx + 0.5 - x, yy + 0.5 - y);
        if (r < fr + 1.1) t.fset(xx, yy, Q.petal[3]);
        else if (r > fr + pl * 0.86 && c === Q.petal[2]) t.fset(xx, yy, Q.petal[1]);
      }
      for (let i = 0; i < n; i++) { const a = spin + (i + 0.5) * Math.PI * 2 / n; for (let r = fr + 1; r < fr + pl * 0.42; r += 0.5) { const X = Math.round(x - 0.5 + Math.cos(a) * r), Y = Math.round(y - 0.5 + Math.sin(a) * r); if (t.fget(X, Y) !== null && t.fget(X, Y) !== OUT) t.fset(X, Y, Q.petal[3]); } }
    });
    piece(g, t => {
      ell(t, x, y, fr, fr, Q.face[2]);
      round(t, Q.face, { cx: x, cy: y, rx: fr, ry: fr, spec: [-0.45, -0.5, 0.18, 0.14] });
      for (let a = 0.2; a < Math.PI * 2; a += 0.5) { const X = Math.round(x - 0.5 + Math.cos(a) * (fr - 1.6)), Y = Math.round(y - 0.5 + Math.sin(a) * (fr - 1.6)); if (t.fget(X, Y) === Q.face[2] || t.fget(X, Y) === Q.face[1]) t.fset(X, Y, Q.face[3]); }
    });
    if (o.face === false) return;
    const mood = moodOf(P), big = fr >= 8, ew = big ? 5 : fr >= 6 ? 4 : 3, eh = big ? 7 : fr >= 6 ? 6 : 4;
    eyes(g, x + 0.5, y - 1, { sp: Math.round(fr * 0.95), w: ew, h: eh, w2: ew, h2: eh, mood, skin: Q.face[2], lidCol: Q.face[2], iris: '#3a1a20', glow: '#8a4a5a' });
    const m = P.mouth === 'open' ? 'open' : P.mouth === 'o' ? 'o' : P.mouth === 'grin' ? 'grin' : 'smile';
    mouth(g, x + 0.5, y + Math.round(eh / 2) + (big ? 1 : 0), m, big ? 5 : 3, { ink: '#5a1f22' });
    if (P.eyes !== 'mad' && fr >= 6) { blush(g, x - fr * 0.6, y + eh / 2 - 1, big ? 3 : 2); blush(g, x + fr * 0.62, y + eh / 2 - 1, big ? 3 : 2); }
  }
  ART.sunflower = function (g, stage, P, C) {
    const Q0 = PAL.sunflower, Q = C && C.__v2tint ? Object.assign({}, Q0, { petal: ramp(V.richMid(C.main, { s: 1.3, l: 0.92 })), back: ramp(V.richMid(C.main, { s: 1.3, l: 0.78 })) }) : Q0;
    const up = hop(P), ko = P.eyes === 'closed' && P.mouth === 'o' && !P.sleep, sag = ko ? 4 : P.eyes === 'sad' ? 1 : 0, sway = P.frame ? 0.12 : 0;
    const baseY = 56;
    // [x, y, face r, petal len]; the last one is the leader (its face is what costumes fit)
    const heads = T(stage,
      [[31, 39, 6, 6]],
      [[20, 27, 6, 6], [43, 33, 6.5, 6]],
      [[14, 35, 5, 5], [49, 36, 5, 5], [31, 24, 8, 7.5]]).map(([x, y, r, l], i, arr) => [x, y + up * (i === arr.length - 1 ? 1 : 0.6) + sag, r, l]);
    // stems first (behind), then base leaves, then the flowers back to front
    stem(g, 32, heads[heads.length - 1][1] + heads[heads.length - 1][2] + 2, baseY + 3, Q.stem, stage === 2 ? 4 : 3);
    if (stage >= 1) for (const [x, y, r] of heads.slice(0, stage === 2 ? 2 : 2)) piece(g, t => V.line(t, [[32, 50], [32 + (x - 32) * 0.45, 45], [x, y + r + 2]], 1, Q.stem[2]));
    baseLeaves(g, 32, baseY, T(stage, 20, 24, 28), Q.leaf, P, { wd: T(stage, 5, 6, 7), len: T(stage, 11, 13, 15) });
    let lead = null;
    heads.forEach(([x, y, r, l], i) => { flower(g, x, y, r, l, Q, P, { spin: sway + i * 0.2 }); lead = { x, y, r, l }; });
    let hat = null;
    if (stage === 2) { // the Queen's gold tiara on the middle flower: three points, a pink jewel, two blue ones
      const x = lead.x, y = lead.y - lead.r - 2;
      piece(g, t => { poly(t, [[x - 7, y + 2], [x - 8, y - 4], [x - 4, y - 1], [x, y - 7], [x + 4, y - 1], [x + 8, y - 4], [x + 7, y + 2]], '#ffd54a'); cel(t, ['#fff6b8', '#ffe27a', '#ffd54a', '#e0a02a', '#a86a1a'], { only: '#ffd54a', s: [1, 1], h: [1, 1] }); });
      ell(g, x, y - 1, 1.6, 1.6, '#ff6e94'); V.px(g, [[x - 5, y - 1], [x + 5, y - 1]], '#6fd0f4'); V.px(g, [[x - 1, y - 2]], WHITE);
      hat = { x, y: y - 4, w: 16 };
    }
    return geo(g, { hx: lead.x, hy: lead.y, hr: lead.r + lead.l, ey: lead.y - 0.5, front: lead.x + lead.r + lead.l, hat });
  };

  // ===================== CHOMPER =====================
  // A violet head whose face is a big toothy mouth opening to the right; light spots on the dome; NO EYES (family rule, every
  // stage). Stage 1: a small bud with a toothy grin. Stage 2: jaws open, a leaf crown. Stage 3: a huge head, wide jaws, the tongue.
  PAL.chomper = {
    head: ['#f2d6ff', '#c58cf2', '#9a5fd6', '#6b3caa', '#43257a'],
    spot: '#e2bdfd', throat: '#3a1240', tongue: ['#ffd0e0', '#ff8fb4', '#ec5f8e', '#b83a68', '#7a2246'],
    tooth: ['#ffffff', '#ffffff', '#f2eef8', '#c9bfdc', '#9c8fb8'],
    leaf: ['#e8ff9a', '#a6e84a', '#6ccb3a', '#38923b', '#1f5c37'],
    stem: ['#d8f58a', '#8fd84a', '#5fb83a', '#3a8a36', '#225c33'],
  };
  ART.chomper = function (g, stage, P, C) {
    const Q = PAL.chomper, HEAD = C && C.__v2tint ? ramp(V.richMid(C.main, { s: 1.25, l: 0.85 })) : Q.head;
    const up = hop(P), ko = P.eyes === 'closed' && P.mouth === 'o' && !P.sleep, sag = ko ? 4 : P.eyes === 'sad' ? 1 : 0;
    const bite = P.mouth === 'open' || P.mouth === 'grin' || P.arms === 'out', shut = P.mouth === 'flat' || ko || P.sleep;
    const hx = T(stage, 30, 28, 27), hy = T(stage, 44, 33, 29) + up + sag, rx = T(stage, 11, 14, 17), ry = T(stage, 10, 12.5, 15);
    const baseY = 56;
    // leaf crown behind (stage 2+)
    if (stage >= 1) {
      const L = stage === 2 ? [[-9, -2.7, 14], [-5, -2.15, 15], [0, -1.65, 12]] : [[-7, -2.55, 12], [-2, -1.9, 12]];
      for (const [dx, a, len] of L) piece(g, t => leaf(t, hx + dx, hy - ry + 4, a + (ko ? 0.5 : 0), len, len * 0.36, Q.leaf, { curl: -0.15 }));
    }
    stem(g, 32, hy + ry - 3, baseY + 3, Q.stem, stage === 2 ? 4 : 3);
    // stage 3 also has curly leaves round the stem
    baseLeaves(g, 32, baseY, T(stage, 20, 25, 30), Q.leaf, P, { wd: T(stage, 5, 6, 7), len: T(stage, 11, 14, 17) });
    // the mouth wedge: hinge left of centre, opening to the right (wider when it bites, a thin slit when shut)
    const Hx = hx - rx * 0.1, Hy = hy + ry * 0.18;
    const aU = stage === 0 ? -0.12 : shut ? -0.14 : bite ? -0.78 : -0.48, aL = stage === 0 ? 0.12 : shut ? 0.14 : bite ? 0.82 : 0.5;
    const inMouth = (x, y) => { const dx = x + 0.5 - Hx, dy = y + 0.5 - Hy; if (dx <= 0.5) return false; const a = Math.atan2(dy, dx); return a > aU && a < aL; };
    const inHead = (x, y) => ((x + 0.5 - hx) / rx) ** 2 + ((y + 0.5 - hy) / ry) ** 2 <= 1;
    piece(g, t => {
      ell(t, hx, hy, rx, ry, HEAD[2], 0, (x, y) => !inMouth(x, y));
      ell(t, hx - rx * 0.25, hy - ry * 0.2, rx * 0.8, ry * 0.82, HEAD[2], 0, (x, y) => !inMouth(x, y)); // a fuller back of the dome
      round(t, HEAD, { cx: hx - 1, cy: hy - 1, rx, ry, spec: [-0.42, -0.55, 0.2, 0.14] });
      // light spots on the dome (2-3 px clusters)
      for (const [kx, ky, s] of [[-0.45, -0.45, 2], [0.05, -0.7, 1.4], [-0.75, 0.05, 1.5], [-0.2, -0.15, 1.2]]) ell(t, hx + kx * rx, hy + ky * ry, s, s * 0.8, Q.spot, 0, (x, y) => { const c = t.fget(x, y); return c === HEAD[1] || c === HEAD[2]; });
      if (stage > 0 || true) { // the lips: a light rim along both jaw edges
        for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const c = t.fget(x, y); if (c === null || c === OUT) continue; if (inMouth(x + 1, y) || inMouth(x, y + 1) || inMouth(x, y - 1)) t.fset(x, y, HEAD[1]); }
      }
    });
    if (stage > 0 && !shut) piece(g, t => { // the throat, the tongue lying along the lower jaw
      ell(t, hx, hy, rx, ry, Q.throat, 0, (x, y) => inMouth(x, y) && inHead(x, y));
      const tl = rx * 0.55, ta = aL * 0.55, tx = Hx + Math.cos(ta) * tl, ty = Hy + Math.sin(ta) * tl;
      ell(t, tx, ty, rx * (stage === 2 ? 0.42 : 0.32), ry * 0.15, Q.tongue[2], ta, (x, y) => inMouth(x, y) && inHead(x, y));
      ell(t, tx - 1, ty - 1, rx * 0.16, 1, Q.tongue[1], ta, (x, y) => inMouth(x, y) && inHead(x, y));
      if (stage === 2 && bite) { // the tongue lolls out past the lip
        V.line(t, [[tx + 3, ty + 2], [hx + rx - 1, hy + ry * 0.62], [hx + rx + 2, hy + ry * 0.75]], 1.8, Q.tongue[2]);
        V.line(t, [[hx + rx - 1, hy + ry * 0.58], [hx + rx + 1, hy + ry * 0.66]], 0.7, Q.tongue[1]);
      }
    }, { outline: false });
    // teeth: chunky white triangles pointing into the mouth along both jaws (a zigzag on the closed stage-1 grin)
    const tooth = (bx, by, dx, dy, nx, ny, hw, hh) => piece(g, t => { poly(t, [[bx - dx * hw, by - dy * hw], [bx + dx * hw, by + dy * hw], [bx + nx * hh, by + ny * hh]], Q.tooth[2]); V.cel(t, Q.tooth, { s: [1, 1], h: [1, 1], noDeep: true }); });
    if (stage === 0) {
      const y0 = Math.round(Hy), x0 = Math.round(Hx + 2);
      for (let i = 0; i < 4; i++) piece(g, t => { const x = x0 + i * 2; V.px(t, [[x, y0 - 1], [x + 1, y0 - 1], [x, y0]], Q.tooth[2]); });
    } else if (!shut) {
      for (const [a, side, ks] of [[aU, 1, stage === 2 ? [0.42, 0.62, 0.82] : [0.45, 0.75]], [aL, -1, stage === 2 ? [0.5, 0.75] : [0.62]]]) {
        const dx = Math.cos(a), dy = Math.sin(a), nx = -dy * side, ny = dx * side;
        for (const k0 of ks) { const k = rx * k0, bx = Hx + dx * k - nx * 0.3, by = Hy + dy * k - ny * 0.3; tooth(bx, by, dx, dy, nx, ny, stage === 2 ? 2 : 1.6, stage === 2 ? 4.5 : 3.5); }
      }
    }
    return geo(g, { hx, hy, hr: Math.max(rx, ry), ey: hy - ry * 0.2, front: hx + rx });
  };
})();
