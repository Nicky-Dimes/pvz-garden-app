/* P vs. Z Garden — non-destructive illustrated-art pilot bridge.
 * Integrate after data.js and AFTER art-event.js. Never edits gameplay or saves.
 * Each scene receives a stable canvas. That canvas is repainted IN PLACE when an
 * atlas loads, so the game's existing caches automatically show the new image.
 * Until then, or when a PNG is missing, it displays the existing procedural art.
 * For now variants (skins, fusion, shiny, elements) deliberately use code art.
 * NOTE: This does not fix the low-resolution world buffer. See the handoff doc.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || !window.PX ||
      typeof window.Image !== 'function' || typeof document === 'undefined') return;
  const PX = window.PX;
  if (typeof PX.sprig !== 'function') return;
  const manifest = window.PVZ_HD_MANIFEST || { plants: {}, zombies: {} };
  const originalSprig = PX.sprig.bind(PX);
  const CELL = 256, LIMIT = 96;
  const PLANT_POSES = ['idle', 'blink', 'walk0', 'walk1', 'cheer', 'attack', 'hurt', 'knocked'];
  const ZOMBIE_POSES = ['idle', 'walk0', 'walk1', 'bite', 'hurt'];
  const atlas = new Map(); // src -> {im, state, listeners}
  const frames = new Map(); // key -> {canvas, base, src, rect}
  let active = true;

  function isPlain(L) {
    return !!L && !L.skin && !L.element && !L.shiny && !L.fuse &&
      (typeof L.species === 'string' || typeof L.zombie === 'string');
  }
  // Which atlas frame a requested pose shows. The rules follow the poses the scenes really ask for (garden.js pose(),
  // survival.js pose(), battle.js poseFor() and its move poses, race.js poseOf(), the menus and the pop-ups); see
  // tools/test_art_hd_loader.js for the full table.
  function pickPlantPose(P) {
    if (P.sleep) return 'blink'; // asleep in the Garden / the evolving cocoon / resting in the house: eyes shut, never 'knocked'
    if (P.walk || P.flap === true || P.arms === 'paddle') { // moving: the walk cycle carries on through blinks, moods and tiredness
      if (P.arms === 'up' && P.eyes === 'happy') return 'cheer'; // a cheer or a victory lap on the move
      if (P.eyes === 'sad' && P.mouth === 'o') return 'hurt'; // stumbled or hit mid-step
      return P.frame ? 'walk1' : 'walk0';
    }
    if (P.eyes === 'closed' && P.mouth === 'o') return 'knocked'; // knocked out (Survival), fainted or beaten (Battle)
    if ('flap' in P) return 'cheer'; // dropped from a finger (falling without fluttering): whee
    if (P.eyes === 'sad' || (P.mouth === 'o' && P.arms !== 'out' && P.eyes !== 'brave')) return 'hurt'; // hit, stunned, low HP, sad
    if (P.eyes === 'blink' || P.eyes === 'closed') return 'blink'; // a blink; asleep in a battle ({ eyes: 'closed', mouth: 'flat' })
    if (P.arms === 'up' || P.eyes === 'happy') return 'cheer'; // cheering, winning a battle or race, happy
    if (P.arms === 'hold') return 'idle'; // eating
    if (P.arms === 'out' && P.mouth === 'o') return 'cheer'; // held up by a finger: delighted
    if (P.arms === 'out' || P.mouth === 'open' || P.mouth === 'grin' || P.eyes === 'brave') return 'attack'; // attacking, ready
    return 'idle';
  }
  function pickZombiePose(P) {
    if (P.eyes === 'sad' || (P.eyes === 'closed' && P.mouth === 'o')) return 'hurt'; // hit, stunned, low HP, beaten: before any mouth
    if (P.mouth === 'open' || P.mouth === 'o' || P.mouth === 'grin' || P.arms === 'out') return 'bite'; // biting, attacking, a win roar
    if (P.walk || P.flap === true || P.arms === 'paddle') return P.frame ? 'walk1' : 'walk0'; // walking (also while blinking)
    return 'idle'; // standing, blinking, asleep in a battle
  }
  function pickPose(P, zombie) { P = P || {}; return zombie ? pickZombiePose(P) : pickPlantPose(P); }
  function selected(L, P) {
    if (!isPlain(L)) return null;
    const zombie = !!L.zombie;
    const id = zombie ? L.zombie : L.species;
    const stage = zombie ? 0 : Math.max(0, Math.min(2, L.stage | 0));
    const src = zombie ? (manifest.zombies || {})[id] : ((manifest.plants || {})[id] || {})[stage];
    if (typeof src !== 'string' || !/^img\/[a-zA-Z0-9/_-]+\.(png|webp)$/.test(src)) return null;
    const pose = pickPose(P, zombie), poses = zombie ? ZOMBIE_POSES : PLANT_POSES;
    const i = poses.indexOf(pose), cols = zombie ? 3 : 4;
    if (i < 0) return null;
    return { src, rect: { x: (i % cols) * CELL, y: Math.floor(i / cols) * CELL },
      key: (zombie ? 'z:' : 'p:') + id + ':' + stage + ':' + pose };
  }
  function paintLegacy(entry) {
    const c = entry.canvas, x = c.getContext('2d');
    x.clearRect(0, 0, CELL, CELL);
    x.imageSmoothingEnabled = false;
    x.drawImage(entry.base, 0, 0, CELL, CELL);
  }
  function paintApproved(entry, im) {
    const c = entry.canvas, x = c.getContext('2d'), r = entry.rect;
    x.clearRect(0, 0, CELL, CELL);
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = 'high';
    x.drawImage(im, r.x, r.y, CELL, CELL, 0, 0, CELL, CELL);
  }
  // c.hdPending: true while the canvas still shows the code art because its sheet is loading. UI code that COPIES a sprite
  // (pop-ups, cards: app.js paint / hdFit) repaints its copy when the 'pvz-hd-art' event below says a sheet has settled.
  function repaint(entry, record) {
    if (active && record && record.state === 'loaded') paintApproved(entry, record.im);
    else paintLegacy(entry);
    entry.canvas.hdPending = !!(active && record && record.state === 'pending');
  }
  function announce(src, state) {
    try { if (typeof window.dispatchEvent === 'function' && typeof window.CustomEvent === 'function') window.dispatchEvent(new window.CustomEvent('pvz-hd-art', { detail: { src, state } })); } catch (e) { /* no DOM (tests) */ }
  }
  function load(src) {
    if (atlas.has(src)) return atlas.get(src);
    const rec = { state: 'pending', im: new window.Image(), listeners: new Set() };
    atlas.set(src, rec);
    rec.im.onload = function () {
      // Reject wrong-sized sheets rather than silently crop or misalign frames.
      const isZombie = src.startsWith('img/hd/zombies/');
      const expectedW = (isZombie ? 3 : 4) * CELL, expectedH = 2 * CELL;
      if (rec.im.naturalWidth !== expectedW || rec.im.naturalHeight !== expectedH) {
        rec.state = 'invalid';
        console.warn('[PVZ HD] wrong atlas dimensions:', src, rec.im.naturalWidth,
          rec.im.naturalHeight, 'expected', expectedW, expectedH);
      } else rec.state = 'loaded';
      for (const entry of rec.listeners) repaint(entry, rec);
      rec.listeners.clear();
      announce(src, rec.state);
    };
    rec.im.onerror = function () {
      rec.state = 'failed';
      console.warn('[PVZ HD] Could not load:', src);
      for (const entry of rec.listeners) repaint(entry, rec); // (the code art stays; only the pending mark goes)
      rec.listeners.clear();
      announce(src, rec.state);
    };
    rec.im.src = src;
    return rec;
  }
  function remember(entry) {
    if (frames.has(entry.key)) frames.delete(entry.key);
    frames.set(entry.key, entry);
    if (frames.size > LIMIT) frames.delete(frames.keys().next().value);
  }
  PX.sprig = function (L, P) {
    const spec = selected(L, P);
    if (!spec) return originalSprig(L, P);
    let entry = frames.get(spec.key);
    if (entry) { remember(entry); return entry.canvas; }
    const base = originalSprig(L, P);
    if (!base) return base;
    const c = document.createElement('canvas');
    c.width = CELL; c.height = CELL; c.k = CELL / 32; // artW/artH are still 32x32 world pixels
    entry = { key: spec.key, src: spec.src, rect: spec.rect, canvas: c, base };
    remember(entry);
    const rec = load(spec.src);
    repaint(entry, rec);
    if (rec.state === 'pending') rec.listeners.add(entry);
    return c;
  };
  // Registered sheets start loading at once (not on first use), so pop-ups and cards drawn early already have them. Few
  // sheets in the pilot; a large roll-out loads per scene instead (Stage C), so beyond PRELOAD_MAX they load on first use.
  const PRELOAD_MAX = 24, SHEETS = [];
  for (const byStage of Object.values(manifest.plants || {})) for (const src of Object.values(byStage || {})) SHEETS.push(src);
  for (const src of Object.values(manifest.zombies || {})) SHEETS.push(src);
  const toLoad = [...new Set(SHEETS.filter(src => typeof src === 'string' && /^img\/[a-zA-Z0-9/_-]+\.(png|webp)$/.test(src)))];
  if (toLoad.length <= PRELOAD_MAX) toLoad.forEach(load);
  // Non-graphical debug hooks for preview/testing.
  window.PVZ_HD = {
    originalSprig,
    poseFor: (P, zombie) => pickPose(P, !!zombie), // which frame a pose shows (tests and the compare page)
    get enabled() { return active; },
    setEnabled(value) {
      active = !!value;
      for (const entry of frames.values()) repaint(entry, atlas.get(entry.src));
      announce(null, active ? 'enabled' : 'disabled');
      return active;
    },
    stats() {
      const result = { cachedFrames: frames.size, atlases: atlas.size, loaded: 0, pending: 0, failed: 0, invalid: 0 };
      for (const rec of atlas.values()) result[rec.state]++;
      return result;
    },
  };
})();
