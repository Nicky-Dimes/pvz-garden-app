// art-event.js — PVZ Garden: Halloween event art. Cute, never scary; TRUE chibi (docs/pvz-art-guide.md). Loaded after every plant and
// zombie art file. Must not touch the DOM at load (tools/check_pvz.js runs art files in Node, where only document.createElement exists).
//  - Plant costumes are Halloween values of look.skin: 'hjack' (the Jack-o'-Lantern prize look), 'hwitch' (Witch Hat), 'hbat' (Bat
//    Wings), 'hcandy' (Candy Corn). art-core.js skips skins it doesn't know, so PX.sprig is wrapped here to dress them (costumes are
//    fitted once per look on the art core's measured head, PX.dressGeom, and then follow the plant like the fusion items do).
//  - PX.eventZombie(kind, costume, P): a raid zombie in a costume: 'witch' (hat), 'ghost' (a bedsheet with eye holes), 'pumpkin'
//    (a pumpkin hat) or 'cape' (a vampire cape). PX.eventCostumes(kind) lists the ones that fit that zombie.
//  - PX.eventArt: candy(i), bag(), jack(lit), patch(), grave(), bat(frame), tabIcon(), PLANT_SKINS.
(function () {
  'use strict';
  if (!window.PX || !PX.Grid) return;
  const Grid = PX.Grid, INK = PX.INK || '#3a2d34', A = PX.art || {};
  const mix = (a, b, k) => (PX.mixHex ? PX.mixHex(a, b, k) : a);
  const lum = A.lum || (() => 0.5);
  const EYE = A.EYE_INK || '#2b2129';
  const hires = fn => (PX.hires ? PX.hires(fn) : fn());
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const piece = (g, f) => { const t = new Grid(g.w, g.h, g.k); f(t); t.outline(); g.merge(t); return g; };
  const soft = (t, cx, cy, rx, ry, R, o) => { if (A.softBody) A.softBody(t, cx, cy, rx, ry, R, o); else t.ell(cx, cy, rx, ry, R[1]); };
  const stroke = (g, pts, r0, r1, c) => { if (PX.stroke) PX.stroke(g, pts, r0, r1, c); };

  // ---------------- palettes (pastel, soft shade) ----------------
  const PUMPK = ['#ffc890', '#f6a04a', '#d8742a'];
  const PURP = ['#c9b0f0', '#9a78d8', '#6e52a8'];
  const BATC = ['#b8a8d8', '#8e7cb8', '#6a5a94'];
  const SHEET = ['#ffffff', '#f2eefc', '#cfc6e6'];
  const STEM = ['#b6dc8a', '#7cb850', '#5a8a3a'];
  const GOLDB = ['#fff0a8', '#f8d36c', '#cf9832'];
  const STONE = ['#e2deee', '#c4bed6', '#9a94b2'];
  const PUMPKIN_RAMP = ['#c8642c', '#e27c34', '#f39a46', '#f9b664', '#ffd69a'];
  const CANDY = { tip: ['#e8e2d4', '#f4efe2', '#fbf8ee', '#ffffff'], mid: ['#d8742a', '#ec8c38', '#f6a24a', '#ffbe70'], base: ['#e0b02c', '#f0c83a', '#fbdc5a', '#fff09a'] };

  // ---------------- dressing helpers ----------------
  // put layer t over (or behind) g, with a bold ink edge round the new parts only (g already has its own sticker edge)
  function dress(g, t, back) {
    const W = g.fw, H = g.fh, a = g.a, b = t.a, add = [];
    const on = j => { const v = b[j]; return v !== null && v !== INK && v[0] !== 'r'; };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (a[i] !== null || b[i] !== null) continue;
      if ((x > 0 && on(i - 1)) || (x < W - 1 && on(i + 1)) || (y > 0 && on(i - W)) || (y < H - 1 && on(i + W))) add.push(i);
    }
    for (let i = 0; i < a.length; i++) if (b[i] !== null && (!back || a[i] === null)) a[i] = b[i];
    for (const i of add) a[i] = INK;
  }
  // recolour by brightness (outline, eye ink, whites and blush stay), like the art core's special skins
  const keep = c => !c || c === INK || c === '#ffffff' || c === EYE || c === '#e8707e' || c === '#ffb0bc' || c === '#ffb3c2' || c[0] !== '#';
  const rampAt = (R, L) => R[clamp(Math.floor(L * R.length * 0.999), 0, R.length - 1)];
  function recolour(g, pickCol) {
    let lo = 1, hi = 0, top = 1e9, bot = -1;
    const k = g.k || 1;
    for (let i = 0; i < g.a.length; i++) {
      const c = g.a[i]; if (c === null) continue; const y = Math.floor(i / g.fw) / k; if (y < top) top = y; if (y > bot) bot = y;
      if (keep(c) || lum(c) < 0.25) continue; const L = lum(c); if (L < lo) lo = L; if (L > hi) hi = L;
    }
    const span = Math.max(0.18, hi - lo);
    for (let i = 0; i < g.a.length; i++) {
      const c = g.a[i]; if (keep(c) || lum(c) < 0.25) continue;
      g.a[i] = pickCol(clamp((lum(c) - lo) / span, 0, 1), (i % g.fw) / k, Math.floor(i / g.fw) / k, top, bot);
    }
  }

  // ---------------- plant costumes ----------------
  // X: the art core's measured geometry for this plant + stage (hx, hy, top, bx, bw, brim, mw, hh, s ...)
  function geomOf(L, P) { try { return PX.dressGeom ? PX.dressGeom(L, P) : null; } catch (e) { return null; } }
  const PLANT_SKINS = {
    // the Jack-o'-Lantern Peashooter (the event's prize): pumpkin orange, grooves meeting at a curly stem, a little vine leaf
    hjack(g, X) {
      recolour(g, L => rampAt(PUMPKIN_RAMP, L));
      if (!X) return;
      const s = X.s || 1, cx = X.bx != null ? X.bx : X.hx, top = Math.max(2.4, X.top), brim = X.brim != null ? X.brim : top + 4;
      for (const d of [-0.42, 0.42]) { const x0 = cx + d * (X.mw || 6) * 0.55, x1 = cx + d * (X.mw || 6); stroke(g, [[x0, top + 0.9], [x1, top + (brim - top) * 0.55], [x1 - d * 0.6, brim - 0.4]], 0.24, 0.2, '#c8642c'); }
      const t = new Grid(g.w, g.h, g.k);
      piece(t, u => u.poly([[cx - 0.9 * s, top + 0.8], [cx + 0.7 * s, top + 0.8], [cx + 1.1 * s, top - 1.9 * s], [cx - 0.2 * s, top - 2.2 * s]], STEM[2]));
      piece(t, u => u.ell(cx + 2.4 * s, top - 1.2 * s, 1.9 * s, 0.95 * s, STEM[1], -0.35));
      stroke(t, [[cx - 0.4 * s, top - 1.6 * s], [cx - 2 * s, top - 2.2 * s], [cx - 2.6 * s, top - 1.1 * s], [cx - 1.8 * s, top - 0.5 * s]], 0.2, 0.2, STEM[2]);
      t.dot(cx + 2.2 * s, top - 1.6 * s, STEM[0]);
      dress(g, t, false);
    },
    // Candy Corn: white tip, orange middle, sunny yellow base
    hcandy(g) {
      recolour(g, (L, x, y, top, bot) => { const k = (y - top) / Math.max(1, bot - top); return rampAt(k < 0.34 ? CANDY.tip : k < 0.68 ? CANDY.mid : CANDY.base, L); });
    },
    // Witch Hat: a purple pointy hat with a bent tip and a gold buckle band, sitting above the eyes like the fusion helmets
    hwitch(g, X) {
      if (!X) return;
      const s = X.s || 1, cx = X.bx != null ? X.bx : X.hx, by = (X.brim != null ? X.brim : X.top + 4) + 0.3, w = (X.bw || 12) + 2.2 * s;
      const H = Math.min(8.2 * s, by - 0.8), t = new Grid(g.w, g.h, g.k);
      piece(t, u => soft(u, cx, by, w * 0.62, 1.25 * s, PURP));
      piece(t, u => u.poly([[cx - w * 0.36, by - 0.2], [cx + w * 0.33, by - 0.2], [cx + w * 0.08, by - H * 0.72], [cx - w * 0.3, by - H], [cx - w * 0.16, by - H * 0.68]], PURP[1]));
      piece(t, u => u.poly([[cx - w * 0.35, by - 0.5], [cx + w * 0.32, by - 0.5], [cx + w * 0.27, by - 1.7 * s], [cx - w * 0.3, by - 1.7 * s]], '#f6a04a'));
      piece(t, u => u.rect(Math.round(cx - 0.9 * s), Math.round(by - 1.9 * s), Math.max(2, Math.round(1.8 * s)), Math.max(2, Math.round(1.6 * s)), GOLDB[1]));
      stroke(t, [[cx + w * 0.02, by - H * 0.62], [cx - w * 0.1, by - H * 0.78]], 0.18, 0.18, PURP[0]);
      t.dot(cx - w * 0.28, by - H + 0.4, '#fff27a');
      dress(g, t, false);
    },
    // Bat Wings: two little scalloped bat wings poking out behind the head
    hbat(g, X, P) {
      if (!X) return;
      const s = (X.s || 1) * 0.95, y0 = (X.hy != null ? X.hy : X.top + 6) - 1.2 * s, flap = P && P.frame ? 0.7 : 0, t = new Grid(g.w, g.h, g.k);
      const hx = X.hx != null ? X.hx : X.bx, mw = X.mw || 7;
      for (const dir of [-1, 1]) {
        const x0 = hx + dir * (mw - 0.6), X1 = v => clamp(x0 + dir * v * s, 0.6, 31.4), Y = v => Math.max(0.6, y0 + v * s - flap);
        piece(t, u => u.poly([[X1(0), Y(-1.4)], [X1(2.2), Y(-3.6)], [X1(5.2), Y(-3)], [X1(4.6), Y(-0.6)], [X1(3.6), Y(-1.4)], [X1(2.6), Y(0.2)], [X1(1.4), Y(-0.6)], [X1(0), Y(0.9)]], BATC[1]));
        stroke(t, [[X1(0.6), Y(-1)], [X1(3.6), Y(-2.6)]], 0.18, 0.18, BATC[0]);
      }
      dress(g, t, true);
    },
  };
  const HSKIN_IDS = Object.keys(PLANT_SKINS);

  // PX.sprig: plants wearing a Halloween costume are drawn plain by the art core, then dressed here (cached per look + pose)
  const baseSprig = PX.sprig;
  const pcache = new Map();
  if (typeof baseSprig === 'function') {
    PX.sprig = function (L, P) {
      if (!L || L.zombie || !L.species || !PLANT_SKINS[L.skin]) return baseSprig(L, P);
      const key = JSON.stringify(L) + '|' + JSON.stringify(P || {});
      let c = pcache.get(key);
      if (!c) {
        const L0 = Object.assign({}, L); delete L0.skin;
        try {
          c = hires(() => {
            const g = PX.buildPlant(L0, P || {}), X = geomOf({ species: L.species, stage: L.stage }, {});
            if (X && P && P.walk && P.frame) { /* (the costume follows the resting fit, like fusion items) */ }
            PLANT_SKINS[L.skin](g, X, P || {});
            return g.canvas();
          });
        } catch (e) { console.error('Halloween costume', L, e); c = baseSprig(L0, P); }
        pcache.set(key, c); if (pcache.size > 400) pcache.delete(pcache.keys().next().value);
      }
      return c;
    };
  }

  // ---------------- zombie costumes ----------------
  // the zombie's head from its art (the shared chibi zombie returns its geometry); otherwise measured from the pixels
  function measure(g) {
    const k = g.k || 1; let top = 99, x0 = 99, x1 = -1;
    for (let i = 0; i < g.a.length; i++) if (g.a[i] !== null) { const y = Math.floor(i / g.fw) / k; if (y < top) top = y; }
    const row = Math.min(31, top + 5);
    for (let fx = 0; fx < g.fw; fx++) if (g.fget(fx, Math.floor(row * k)) !== null) { const x = fx / k; if (x < x0) x0 = x; if (x > x1) x1 = x; }
    if (x1 < 0) { x0 = 8; x1 = 24; }
    const hrx = Math.max(5, (x1 - x0) / 2 - 0.5);
    return { hx: (x0 + x1) / 2, hy: top + 8.5, hrx, hry: 8.5, top, S: 1, measured: true };
  }
  const ZCOST = {
    witch(g, G) {
      const S = G.S || 1, cx = G.hx - 0.4 * S, by = G.top + G.hry * 0.44, w = G.hrx * 1.22, H = Math.min(8.4 * S, by - 0.5), t = new Grid(g.w, g.h, g.k);
      piece(t, u => soft(u, cx, by, w, 1.35 * S, PURP));
      piece(t, u => u.poly([[cx - w * 0.56, by - 0.3], [cx + w * 0.5, by - 0.3], [cx + w * 0.12, by - H * 0.7], [cx - w * 0.5, by - H], [cx - w * 0.26, by - H * 0.66]], PURP[1]));
      piece(t, u => u.poly([[cx - w * 0.55, by - 0.6], [cx + w * 0.49, by - 0.6], [cx + w * 0.42, by - 2 * S], [cx - w * 0.47, by - 2 * S]], '#f6a04a'));
      piece(t, u => u.rect(Math.round(cx - 1), Math.round(by - 2.2 * S), 2, 2, GOLDB[1]));
      stroke(t, [[cx + w * 0.04, by - H * 0.6], [cx - w * 0.16, by - H * 0.8]], 0.2, 0.2, PURP[0]);
      dress(g, t, false);
    },
    pumpkin(g, G) {
      const S = G.S || 1, cy = G.top + G.hry * 0.42, rx = G.hrx * 1.02, ry = G.hry * 0.62, cut = (G.ey != null ? G.ey - 3.4 * S : G.top + G.hry * 0.75), t = new Grid(g.w, g.h, g.k);
      piece(t, u => soft(u, G.hx, cy, rx, ry, PUMPK, { mask: (x, y) => y <= cut }));
      piece(t, u => u.poly([[G.hx - rx * 0.98, cut - 1.1 * S], [G.hx + rx * 0.98, cut - 1.1 * S], [G.hx + rx * 0.95, cut], [G.hx - rx * 0.95, cut]], PUMPK[2]));
      for (const d of [-0.5, 0, 0.5]) stroke(t, [[G.hx + d * rx * 0.5, cy - ry + 0.8], [G.hx + d * rx * 0.85, cut - 1.6 * S]], 0.22, 0.22, '#d8742a');
      const sy = Math.max(1.4, cy - ry + 0.4);
      piece(t, u => u.poly([[G.hx - 0.8 * S, sy + 0.4], [G.hx + 0.8 * S, sy + 0.4], [G.hx + 1.3 * S, Math.max(0.4, sy - 1.6 * S)], [G.hx, Math.max(0.3, sy - 1.8 * S)]], STEM[2]));
      piece(t, u => u.ell(G.hx + 2.6 * S, Math.max(1, sy - 0.8 * S), 1.9 * S, 0.9 * S, STEM[1], -0.3));
      dress(g, t, false);
    },
    ghost(g, G, P) {
      const S = G.S || 1, t = new Grid(g.w, g.h, g.k), x0 = G.hx - G.hrx - 0.8, x1 = G.hx + G.hrx + 0.6, yb = 28.4;
      const skirt = [[x1, G.hy], [x1 + 0.6, yb - 1]];
      const n = 5; for (let i = 0; i <= n; i++) { const x = x1 + 0.6 - (x1 + 0.6 - (x0 - 0.6)) * i / n; skirt.push([x, yb + (i % 2 ? -1.2 : 0.4)]); }
      skirt.push([x0 - 0.6, yb - 1], [x0, G.hy]);
      piece(t, u => { u.poly(skirt, SHEET[1]); soft(u, G.hx, G.hy - 0.2, G.hrx + 1.2, G.hry + 1.1, SHEET); });
      stroke(t, [[x1 - 1.2, G.hy + G.hry * 0.6], [x1 - 0.6, yb - 2]], 0.22, 0.22, SHEET[2]);
      dress(g, t, false);
      // eye holes with the zombie's googly eyes peeking out, and a little "boo" mouth
      if (G.ex != null && A.chibiEyes) {
        const sp = 6.6 * S, ew = 5.2 * S, eh = 5.6 * S;
        for (const d of [-0.5, 0.5]) g.ell(G.ex + d * sp, G.ey, ew / 2 + 0.6, eh / 2 + 0.6, '#5c4c72');
        A.chibiEyes(g, G.ex, G.ey, { white: true, sp, w: ew, h: eh, look: [0.55, 0.25], mood: P && P.eyes });
        if (A.chibiMouth) A.chibiMouth(g, G.mx != null ? G.mx : G.ex + 1.6, (G.my != null ? G.my : G.ey + 5) + 0.4, 'o', 1.8 * S);
        if (A.blush) A.blush(g, G.ex, G.ey + eh * 0.62, { sp: sp * 1.15, w: 1, h: 0.55 });
      }
    },
    cape(g, G, P) {
      const S = G.S || 1, X = G.X || (x => x), U = G.U || G.Y || (y => y), Y = G.Y || (y => y), t = new Grid(g.w, g.h, g.k), sw = P && P.walk && P.frame ? 0.8 : 0;
      piece(t, u => u.poly([[X(10.2), U(19.4)], [X(20.4), U(19.4)], [X(22.6) - sw, Y(29.6)], [X(19), Y(28.8)], [X(15.6), Y(29.8)], [X(12), Y(28.8)], [X(7.4) - sw, Y(29.8)]], '#5a4680'));
      piece(t, u => u.poly([[X(11.4), U(20.6)], [X(19.2), U(20.6)], [X(20.8) - sw, Y(28.2)], [X(9.4) - sw, Y(28.2)]], '#e0607a'));
      for (const d of [-1, 1]) piece(t, u => u.poly([[G.hx + d * G.hrx * 0.55, G.hy + G.hry * 0.62], [G.hx + d * (G.hrx + 1.8 * S), G.hy + G.hry * 0.08], [G.hx + d * (G.hrx + 0.6), G.hy + G.hry * 0.95]], d < 0 ? '#5a4680' : '#e0607a'));
      dress(g, t, true);
    },
  };
  const zcache = new Map(), zinfo = new Map();
  // which costumes fit a zombie: hatted zombies get the cape or the sheet, measured (odd-shaped) ones the cape
  function costumesFor(kind) {
    if (zinfo.has(kind)) return zinfo.get(kind);
    let list = ['cape'];
    try {
      const G = hires(() => { const g = new Grid(32, 32), fn = PX.ZOMBIE_ART && (PX.ZOMBIE_ART[kind] || PX.ZOMBIE_ART.basic); return fn ? fn(g, {}, { zombie: kind }) : null; });
      if (G && G.hx != null && G.hry != null) list = G.o && (G.o.hat || G.o.head === 'none') ? ['cape', 'ghost'] : ['witch', 'pumpkin', 'ghost', 'cape'];
    } catch (e) { list = ['cape']; }
    zinfo.set(kind, list); return list;
  }
  function eventZombie(kind, costume, P) {
    P = P || {};
    const key = kind + '|' + costume + '|' + JSON.stringify(P);
    let c = zcache.get(key);
    if (c) return c;
    try {
      c = hires(() => {
        const g = new Grid(32, 32), fn = PX.ZOMBIE_ART && (PX.ZOMBIE_ART[kind] || PX.ZOMBIE_ART.basic);
        let G = null; if (fn) G = fn(g, P, { zombie: kind });
        if (!G || G.hx == null || G.hry == null) G = measure(g);
        const fit = costumesFor(kind), want = fit.includes(costume) ? costume : fit[0];
        if (ZCOST[want] && !(G.measured && want === 'ghost')) ZCOST[want](g, G, P);
        g.outerLine();
        return g.canvas();
      });
    } catch (e) { console.error('Halloween zombie', kind, costume, e); c = PX.sprig({ zombie: kind }, P); }
    zcache.set(key, c); if (zcache.size > 300) zcache.delete(zcache.keys().next().value);
    return c;
  }

  // ---------------- event items and scenery ----------------
  const icache = {};
  const memo = (key, make) => icache[key] || (icache[key] = make());
  const CANDY_COLS = [['#ffb3c2', '#f07a94', '#c84e6e'], ['#c9b0f0', '#9a78d8', '#6e52a8'], ['#b6ecaa', '#6cc84a', '#3f8a3a'], ['#ffd69a', '#f6a04a', '#d8742a']];
  // little candies: 0-3 wrapped sweets in four colours, 4 candy corn, 5 a lollipop
  function candy(i) {
    i = (i | 0) % 6;
    return memo('candy' + i, () => {
      if (i === 4) { const g = new Grid(9, 10); piece(g, t => { t.poly([[1, 9], [8, 9], [4.5, 0.8]], CANDY.mid[2]); t.poly([[1.2, 9], [7.8, 9], [6.8, 6.4], [2.2, 6.4]], CANDY.base[2]); t.poly([[3.4, 3.6], [5.6, 3.6], [4.5, 0.9]], '#fbf8ee'); }); g.dot(3.4, 5.2, '#ffd69a'); return g.canvas(); }
      if (i === 5) { const g = new Grid(9, 13); piece(g, t => t.rect(4, 7, 1, 6, '#fbf8ee')); piece(g, t => soft(t, 4.5, 4.5, 3.8, 3.8, ['#ffd0dc', '#f07a94', '#c84e6e'])); stroke(g, [[4.5, 4.5], [5.6, 3.6], [4.4, 2.6], [3, 3.8], [3.6, 5.8], [5.8, 6], [7, 4]], 0.22, 0.22, '#ffffff'); return g.canvas(); }
      const R = CANDY_COLS[i], g = new Grid(13, 8);
      piece(g, t => { t.poly([[3.6, 4], [0.6, 1.2], [1.4, 4], [0.6, 6.8]], R[2]); t.poly([[9.4, 4], [12.4, 1.2], [11.6, 4], [12.4, 6.8]], R[2]); });
      piece(g, t => soft(t, 6.5, 4, 3.6, 2.9, R));
      stroke(g, [[5, 6], [7.6, 1.6]], 0.3, 0.3, '#ffffff');
      return g.canvas();
    });
  }
  // the Candy Bag: a smiling pumpkin pail full of sweets (the Halloween capsule)
  function bag() {
    return memo('bag', () => {
      const g = new Grid(26, 26);
      stroke(g, [[4.6, 13], [6, 4.4], [13, 1.6], [20, 4.4], [21.4, 13]], 0.55, 0.55, INK);
      stroke(g, [[4.6, 13], [6, 4.4], [13, 1.6], [20, 4.4], [21.4, 13]], 0.28, 0.28, '#8c93a8');
      piece(g, t => { t.ell(9, 10.2, 2.4, 1.6, '#f07a94', -0.4); t.ell(13.4, 9.4, 2.4, 1.6, '#9a78d8', 0.3); t.ell(17, 10.4, 2.2, 1.5, '#6cc84a', -0.2); });
      piece(g, t => soft(t, 13, 16.6, 10.6, 8.2, PUMPK));
      for (const d of [-5.2, 5.2]) stroke(g, [[13 + d * 0.6, 9.4], [13 + d, 16.6], [13 + d * 0.6, 23.6]], 0.26, 0.26, '#d8742a');
      piece(g, t => { t.poly([[7.6, 16.4], [10.6, 16.4], [9.1, 13.6]], '#7a4a2a'); t.poly([[15.4, 16.4], [18.4, 16.4], [16.9, 13.6]], '#7a4a2a'); t.poly([[7.4, 18.6], [18.6, 18.6], [16.8, 21.4], [13, 22.2], [9.2, 21.4]], '#7a4a2a'); });
      g.ell(11.4, 19.4, 0.8, 0.7, PUMPK[1]); g.ell(14.6, 19.4, 0.8, 0.7, PUMPK[1]);
      g.dot(9.6, 9, '#ffffff'); g.dot(13.8, 8.4, '#ffffff');
      return g.canvas();
    });
  }
  // a jack-o'-lantern for the garden (lit: candle glow in the carved face)
  function drawJack(g, ox, oy, lit) {
    const face = lit ? '#fff27a' : '#7a4a2a', X = x => ox + x, Y = y => oy + y;
    piece(g, t => soft(t, X(8), Y(8.5), 6.8, 5.2, PUMPK));
    for (const d of [-3.1, 3.1]) stroke(g, [[X(8 + d * 0.7), Y(4.1)], [X(8 + d), Y(8.5)], [X(8 + d * 0.7), Y(12.9)]], 0.24, 0.24, '#d8742a');
    piece(g, t => t.poly([[X(7.2), Y(3.9)], [X(8.8), Y(3.9)], [X(9.6), Y(1.2)], [X(8.3), Y(0.9)]], STEM[2]));
    piece(g, t => t.ell(X(11.3), Y(2.5), 1.9, 0.9, STEM[1], -0.4));
    piece(g, t => { t.poly([[X(4.4), Y(8.6)], [X(6.8), Y(8.6)], [X(5.6), Y(6.4)]], face); t.poly([[X(9.2), Y(8.6)], [X(11.6), Y(8.6)], [X(10.4), Y(6.4)]], face); t.poly([[X(4.4), Y(9.8)], [X(11.6), Y(9.8)], [X(10.4), Y(11.8)], [X(8), Y(12.4)], [X(5.6), Y(11.8)]], face); });
    g.ell(X(7.2), Y(10.4), 0.6, 0.5, PUMPK[1]); g.ell(X(8.8), Y(10.4), 0.6, 0.5, PUMPK[1]);
    if (lit) { g.dot(X(5.4), Y(7.6), '#ffffff'); g.dot(X(10.2), Y(7.6), '#ffffff'); }
    g.dot(X(4.6), Y(6), '#ffe2bc');
  }
  function jack(lit) { return memo('jack' + (lit ? 1 : 0), () => { const g = new Grid(16, 14); drawJack(g, 0, 0, lit); return g.canvas(); }); }
  // the prize plant's seed packet: a pumpkin-orange card with a purple scalloped band and a jack-o'-lantern under the moon
  function packet() {
    return memo('packet', () => {
      const g = new Grid(22, 28);
      piece(g, t => { t.rect(2, 1, 18, 26, '#ffd69a'); t.rect(1, 2, 20, 24, '#ffd69a'); t.rect(19, 3, 1, 23, '#f6b46a'); t.rect(2, 25, 17, 1, '#f6b46a'); });
      piece(g, t => { t.rect(2, 2, 18, 4, PURP[1]); for (let i = 0; i < 6; i++) t.ell(3.4 + i * 3.04, 5.9, 1.55, 1.05, PURP[1], 0, (x, y) => y >= 5.5); });
      g.rect(2, 2, 18, 1, PURP[0]);
      piece(g, t => t.rect(3, 8, 16, 13, '#5a4680'));
      g.ell(15.6, 10.6, 1.6, 1.6, '#fff6c8'); g.ell(16.3, 10.1, 1.2, 1.2, '#5a4680');
      g.dots([[5.5, 9.5], [9, 10], [12.5, 9.2]], '#ffffff');
      drawJack(g, 3, 7.4, true);
      piece(g, t => { t.rect(5, 22, 12, 3, '#ffffff'); t.rect(4, 23, 14, 1, '#ffffff'); });
      g.dots([[7, 23.5], [9, 23.5], [11, 23.5], [13, 23.5], [15, 23.5]], '#c9b0f0');
      return g.canvas();
    });
  }
  // seed packets of the prize plant use it (the art core would draw a plain packet for a kind it doesn't know)
  const baseItem = PX.item;
  if (typeof baseItem === 'function') PX.item = function (kind, id) { if ((kind === 'egg' || kind === 'seed') && /^hjack(:|$)/.test(String(id))) return packet(); return baseItem(kind, id); };
  // a little pumpkin patch: three pumpkins on a curly vine (a Halloween shop decoration)
  function patch() {
    return memo('patch', () => {
      const g = new Grid(28, 15);
      stroke(g, [[2, 13.4], [8, 12], [14, 13.6], [20, 12.2], [26, 13.4]], 0.32, 0.32, STEM[2]);
      piece(g, t => { t.ell(5.8, 9.6, 2.4, 1.1, STEM[1], -0.5); t.ell(22.6, 9.8, 2.3, 1.1, STEM[1], 0.5); });
      const pk = (x, y, rx, ry) => { piece(g, t => soft(t, x, y, rx, ry, PUMPK)); stroke(g, [[x, y - ry + 0.6], [x, y + ry - 0.6]], 0.22, 0.22, '#d8742a'); piece(g, t => t.poly([[x - 0.6, y - ry + 0.4], [x + 0.6, y - ry + 0.4], [x + 1, y - ry - 1.4], [x, y - ry - 1.5]], STEM[2])); };
      pk(6.6, 11.2, 4.2, 3.2); pk(20.6, 11.6, 3.6, 2.8); pk(13.6, 10, 5.4, 4.2);
      g.dot(11.6, 8, '#ffe2bc'); g.dot(4.8, 9.6, '#ffe2bc');
      return g.canvas();
    });
  }
  // a friendly gravestone with a tiny pumpkin and flowers (a Halloween shop decoration)
  function grave() {
    return memo('grave', () => {
      const g = new Grid(16, 17);
      piece(g, t => { t.ell(7, 6.4, 5.2, 5, STONE[1]); t.rect(2, 6, 10, 9, STONE[1]); });
      g.ell(5.2, 4.6, 1.6, 1, STONE[0]); g.rect(3, 12, 8, 2, STONE[2]);
      stroke(g, [[7, 4.6], [7, 9.6]], 0.34, 0.34, STONE[2]); stroke(g, [[5.2, 6.2], [8.8, 6.2]], 0.34, 0.34, STONE[2]);
      piece(g, t => t.ell(7, 15.4, 6.6, 1.4, ['#b6ecaa', '#8ed060', '#5ea040']));
      piece(g, t => soft(t, 12.4, 13.6, 2.6, 2.1, PUMPK));
      piece(g, t => t.poly([[12, 11.8], [12.8, 11.8], [13.2, 10.6], [12.4, 10.5]], STEM[2]));
      for (const [x, c] of [[2.2, '#f6a04a'], [4.4, '#c9b0f0']]) { stroke(g, [[x, 15], [x, 12.6]], 0.2, 0.2, STEM[2]); g.ell(x, 12.2, 0.9, 0.9, c); g.dot(x, 12.2, '#fff27a'); }
      return g.canvas();
    });
  }
  // a little bat for the sky (frame 0 wings up, 1 wings down)
  function bat(f) {
    f = f ? 1 : 0;
    return memo('bat' + f, () => {
      const g = new Grid(13, 8), up = !f;
      piece(g, t => {
        t.poly(up ? [[5.4, 4.4], [3, 1], [0.4, 2.4], [1.4, 4], [2.6, 3.6], [3.4, 5.2]] : [[5.4, 3.6], [3, 6.6], [0.6, 6], [1.6, 4.8], [2.8, 5], [3.6, 3.6]], BATC[1]);
        t.poly(up ? [[7.6, 4.4], [10, 1], [12.6, 2.4], [11.6, 4], [10.4, 3.6], [9.6, 5.2]] : [[7.6, 3.6], [10, 6.6], [12.4, 6], [11.4, 4.8], [10.2, 5], [9.4, 3.6]], BATC[1]);
      });
      piece(g, t => { soft(t, 6.5, 4.2, 2.3, 2.1, BATC); t.poly([[4.8, 2.8], [5.2, 1], [6, 2.4]], BATC[1]); t.poly([[7, 2.4], [7.8, 1], [8.2, 2.8]], BATC[1]); });
      g.dot(5.8, 4, '#ffffff'); g.dot(7.2, 4, '#ffffff'); g.dot(6.5, 5.2, '#ffb3c2');
      return g.canvas();
    });
  }
  PX.eventZombie = eventZombie;
  PX.eventCostumes = costumesFor;
  PX.eventArt = { candy, bag, jack, packet, patch, grave, bat, tabIcon: () => jack(true), PLANT_SKINS: HSKIN_IDS, isCostume: id => !!PLANT_SKINS[id] };
  // sparkle colours for the garden's skin twinkles (pixel.js table, when there)
  try { if (PX.SKIN_FX) Object.assign(PX.SKIN_FX, { hjack: ['#ffd27a', '#fff27a'], hwitch: ['#c9b0f0', '#fff27a'], hbat: ['#c9b0f0', '#ffffff'], hcandy: ['#fff09a', '#ffbe70', '#ffffff'] }); } catch (e) { /* optional */ }
})();
