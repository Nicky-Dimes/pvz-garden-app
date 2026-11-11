// art-aqua.js — PVZ Garden: My Aquarium art registries and the sprite builder. The art itself lives in art-fish.js,
// art-fish2.js (the fish), art-aquadecor.js (decorations) and art-aquaworld.js (backdrops + sand). Loaded after art-core.js.
//   PX.FISH_ART[kind]      = { w, h, draw(g, f) }   a fish facing RIGHT; f = 0 | 1 (tail swish / leg shuffle / bell pulse)
//   PX.DECOR_ART[id]       = { w, h, draw(g, f) }   a decoration, anchored bottom-centre (floor(w / 2), h); f = 0 | 1 (sway)
//   PX.AQUA_BACKDROP[id]   = { water: [top, mid, deep], draw(g, w, h, f) }   the far scenery behind the decorations (no sand)
//   PX.AQUA_SAND[id]       = { ramp: [light, mid, dark], dots: [colour...] } the tank floor
// Grids are hi-res (PX.HI fine pixels per art pixel), like every character; the builder adds the bold outer line (A.noLine
// skips it, e.g. for a see-through jellyfish) and caches the canvases. Anything that fails to draw becomes a soft blob, so a
// broken sprite never stops the game.
(function () {
  'use strict';
  if (!window.PX || !PX.Grid) return;
  const { Grid } = PX;
  PX.FISH_ART = PX.FISH_ART || {};
  PX.DECOR_ART = PX.DECOR_ART || {};
  PX.AQUA_BACKDROP = PX.AQUA_BACKDROP || {};
  PX.AQUA_SAND = PX.AQUA_SAND || {};
  const hires = fn => (PX.hires ? PX.hires(fn) : fn());
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  const cache = new Map();
  const keep = (key, c) => { cache.set(key, c); if (cache.size > 400) cache.delete(cache.keys().next().value); return c; };

  function blob(w, h, col) {
    const g = new Grid(w, h); g.ell(w / 2, h / 2, w / 2 - 1, h / 2 - 1, col || ['#bfe6ff', '#7cc4f0', '#4f8fc8']); g.outline(); return g;
  }
  // a fish / decoration sprite: kind 'fish' | 'decor'
  PX.aquaSprite = function (kind, id, f) {
    const key = kind + ':' + id + ':' + (f | 0); if (cache.has(key)) return cache.get(key);
    const A = (kind === 'fish' ? PX.FISH_ART : PX.DECOR_ART)[id];
    let c = null;
    try {
      c = hires(() => {
        if (!A) return blob(kind === 'fish' ? 18 : 20, kind === 'fish' ? 12 : 16).canvas();
        const g = new Grid(A.w, A.h); A.draw(g, f | 0); if (!A.noLine) g.outerLine(); return g.canvas();
      });
    } catch (e) { console.error('PX.aquaSprite', kind, id, e); c = hires(() => blob(18, 12).canvas()); }
    return keep(key, c);
  };
  // the far scenery at a given size (art px), water gradient included
  PX.aquaBackdrop = function (id, w, h, f) {
    w = Math.max(8, Math.round(w)); h = Math.max(8, Math.round(h));
    const key = 'bd:' + id + ':' + w + 'x' + h + ':' + (f | 0); if (cache.has(key)) return cache.get(key);
    const A = PX.AQUA_BACKDROP[id] || PX.AQUA_BACKDROP.reef || { water: ['#9fe6f6', '#4fb8e2', '#2a7cc0'] };
    let c = null;
    try {
      c = hires(() => {
        const g = new Grid(w, h), W = A.water || ['#9fe6f6', '#4fb8e2', '#2a7cc0'];
        // the water: three bands softly dithered into each other, lightest at the top
        for (let y = 0; y < h; y++) {
          const k = Math.min(0.999, y / h) * 2, i = Math.floor(k), fr = k - i;
          for (let x = 0; x < w; x++) g.set(x, y, BAYER[(y & 3) * 4 + (x & 3)] < fr ? W[i + 1] : W[i]);
        }
        if (A.draw) A.draw(g, w, h, f | 0);
        return g.canvas();
      });
    } catch (e) { console.error('PX.aquaBackdrop', id, e); c = null; }
    return keep(key, c);
  };
  PX.aquaSandOf = id => PX.AQUA_SAND[id] || PX.AQUA_SAND.white || { ramp: ['#fff6dc', '#f2dfae', '#d8bf86'], dots: ['#ffffff', '#e2c890'] };

  // shop / prize icons: PX.item('fish' | 'decor' | 'backdrop' | 'sand', id)
  const oldItem = PX.item;
  const icons = new Map();
  PX.item = function (kind, id) {
    if (kind !== 'fish' && kind !== 'decor' && kind !== 'backdrop' && kind !== 'sand') return oldItem(kind, id);
    const key = kind + ':' + id; if (icons.has(key)) return icons.get(key);
    let c = null;
    try {
      if (kind === 'fish' || kind === 'decor') c = PX.aquaSprite(kind, id, 0);
      else if (kind === 'backdrop') {
        // a little window: the scenery with a strip of white sand
        const bd = PX.aquaBackdrop(id, 30, 20);
        c = hires(() => { const g = new Grid(30, 20); const S = PX.aquaSandOf('white'); for (let x = 0; x < 30; x++) for (let y = 16; y < 20; y++) g.set(x, y, y === 16 ? S.ramp[0] : S.ramp[1]); g.outline(); return g.canvas(); });
        const out = document.createElement('canvas'); out.width = bd.width; out.height = bd.height; if (bd.k) out.k = bd.k;
        const x = out.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(bd, 0, 0); x.drawImage(c, 0, 0); c = out;
      } else {
        const S = PX.aquaSandOf(id);
        c = hires(() => {
          const g = new Grid(14, 14); g.ell(7, 7.5, 6, 5.5, [S.ramp[0], S.ramp[1], S.ramp[2]]);
          const D = S.dots || []; for (let i = 0; i < 9 && D.length; i++) g.set(3 + (i * 5) % 8, 4 + (i * 3) % 7, D[i % D.length]);
          g.outline(); return g.canvas();
        });
      }
    } catch (e) { console.error('PX.item', kind, id, e); c = null; }
    if (!c) return oldItem('gumball', 3);
    icons.set(key, c); return c;
  };
})();
