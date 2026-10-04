// state.js — PVZ Garden rules + save data. Exposes window.PS (shared by every screen).
//
// Words: the save keeps the template's field names. A "sprout" in code is a PLANT; an "egg" is a SEED PACKET waiting in the
// garden; the "pouch" holds complete ELEMENT CORES (3 shards make one).
//
// CONTRACT (other modules rely on these; keep signatures stable)
//   PS.D                      content tables (data.js)
//   PS.S                      the live save object (read freely; mutate through PS.state functions where one exists)
//   PS.save()                 throttled save to localStorage (safe to call often)
//   PS.on(evt, fn) / PS.emit(evt, payload)
//       events: 'coins' {n, why} · 'sprout:update' {s} · 'levelup' {s, stat, lv} · 'sprout:evolve' {s, from, to, name}
//               'egg:new' {egg} · 'egg:hatch' {egg, s} · 'pouch' {} · 'area' {area} · 'night' {isNight}
//               'sprout:sold' {s, price} · 'items' {} (fusion items changed) · 'unlock' {species, isNew, source}
//               'shard' {el, n, completed} · 'fusion' {s}
//   PS.clock.isNight() · PS.clock.night() -> 0..1 (smooth, fades at the switch) · PS.clock.msToSwitch()
//   PS.state.*  (see bottom of file)
(function () {
  'use strict';
  const D = window.PSDATA;
  // ---------------- players (one save per player) ----------------
  // The first player ('main') keeps the original storage key, so saves from before profiles existed carry over.
  const BASE = 'pvzg:save:v1', PKEY = 'pvzg:players:v1';
  const keyFor = pid => BASE + (pid && pid !== 'main' ? ':' + pid : '');
  function readPlayers() { try { const p = JSON.parse(localStorage.getItem(PKEY)); if (p && Array.isArray(p.list) && p.list.length) return p; } catch (e) { /* blocked */ } return null; }
  function writePlayers(p) { try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch (e) { /* blocked */ } }
  let players = readPlayers();
  if (!players) { players = { list: [{ id: 'main', name: 'Player 1', created: Date.now() }], current: 'main', named: false }; writePlayers(players); }
  if (!players.list.some(p => p.id === players.current)) players.current = players.list[0].id;
  // ?save=<slot> is a testing override that never touches the players list
  const SLOT = (() => { try { return new URLSearchParams(location.search).get('save') || ''; } catch (e) { return ''; } })();
  const KEY = SLOT ? BASE + ':' + SLOT : keyFor(players.current);
  const rand = (a, b) => a + Math.random() * (b - a);
  const irand = (a, b) => Math.floor(rand(a, b + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const newId = p => (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ---------------- events ----------------
  const listeners = {};
  function on(e, fn) { (listeners[e] = listeners[e] || []).push(fn); return () => { listeners[e] = listeners[e].filter(f => f !== fn); }; }
  function emit(e, p) { (listeners[e] || []).slice().forEach(f => { try { f(p || {}); } catch (err) { console.error(err); } }); }


  // ---------------- save ----------------
  function fresh() {
    return {
      v: SAVE_VERSION, created: Date.now(), coins: 1000, area: 'frontyard', activeId: null, clockOffset: 0,
      sprouts: [], eggs: [], pouch: [], shards: {}, fruits: { apple: 3 }, fitems: {}, unlocked: {}, prefs: {},
      progress: { races: {}, leagues: {}, cups: {}, rewards: {} },
      seen: {}, bestTier: 0, totals: { races: 0, raceWins: 0, battles: 0, battleWins: 0, coinsEarned: 0, gumballs: 0, sold: 0, fusions: 0, playSec: 0 },
    };
  }
  // Save format version. When the save shape changes, bump this and add a step to migrate() so old saves upgrade instead of breaking.
  // migrate() must never throw: it repairs what it can (and notes it in `repairs`) so one bad entry can't cost a whole game.
  const SAVE_VERSION = 1;
  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const countMap = (m, ok) => { const o = {}; if (isObj(m)) for (const [k, v] of Object.entries(m)) if ((!ok || ok(k)) && typeof v === 'number' && v > 0 && isFinite(v)) o[k] = Math.floor(v); return o; };
  function migrate(s, repairs) {
    repairs = repairs || [];
    if (!isObj(s) || !Array.isArray(s.sprouts)) return null;
    // every field gets a sane type; extras written by race/battle/garden are normalised
    const f = fresh();
    for (const k of Object.keys(f)) if (s[k] === undefined || s[k] === null) s[k] = f[k];
    for (const k of ['eggs', 'pouch']) if (!Array.isArray(s[k])) { repairs.push(k); s[k] = []; }
    for (const k of ['fruits', 'progress', 'seen', 'totals', 'shards', 'fitems', 'unlocked', 'prefs']) if (!isObj(s[k])) { repairs.push(k); s[k] = f[k]; }
    s.coins = Math.max(0, Math.round(num(s.coins, 0)));
    if (!D.AREAS[s.area]) s.area = 'frontyard';
    for (const k of ['races', 'leagues', 'cups', 'rewards']) if (!isObj(s.progress[k])) s.progress[k] = {};
    for (const k of ['raceExtra', 'battleExtra', 'survival']) if (s.progress[k] != null && !isObj(s.progress[k])) { repairs.push(k); delete s.progress[k]; }
    if (s.garden != null && !isObj(s.garden)) { repairs.push('garden'); delete s.garden; }
    if (s.maps != null) {
      if (!isObj(s.maps)) { repairs.push('maps'); delete s.maps; }
      else {
        s.maps.owned = countMap(s.maps.owned, k => !!D.GARDEN_MAPS[k]);
        const use = isObj(s.maps.use) ? s.maps.use : {}; s.maps.use = {};
        for (const [a, id] of Object.entries(use)) if (D.AREAS[a] && D.GARDEN_MAPS[id] && (D.GARDEN_MAPS[id].price === 0 || s.maps.owned[id]) && !Object.values(s.maps.use).includes(id)) s.maps.use[a] = id;
      }
    }
    fixBattleExtra(s.progress.battleExtra, repairs);
    fixRaceExtra(s.progress.raceExtra, repairs);
    if (s.garden) for (const k of ['trees', 'ground']) {
      if (s.garden[k] != null && !isObj(s.garden[k])) { repairs.push('garden.' + k); delete s.garden[k]; continue; }
      for (const [a, list] of Object.entries(s.garden[k] || {})) if (!Array.isArray(list)) { repairs.push('garden.' + k); delete s.garden[k][a]; }
    }
    s.totals = Object.assign({}, f.totals, s.totals);
    s.fruits = countMap(s.fruits, k => !!D.FRUITS[k]);
    s.shards = countMap(s.shards, k => !!D.ELEMENT_INFO[k]);
    s.fitems = countMap(s.fitems, k => !!D.FUSION_ITEMS[k]);
    for (const k of Object.keys(s.unlocked)) if (!D.PLANTS[k]) delete s.unlocked[k];
    s.pouch = s.pouch.filter(id => typeof id === 'string' && D.ELEMENT_INFO[id]);
    s.eggs = s.eggs.filter(e => { if (isObj(e) && typeof e.kind === 'string') return true; repairs.push('egg'); return false; });
    for (const e of s.eggs) { if (!e.id) e.id = newId('e'); e.taps = num(e.taps, 0); if (!D.AREAS[e.area]) e.area = 'frontyard'; if (!D.SEEDS[e.kind]) e.kind = 'normal'; if (!D.PLANTS[e.species]) e.species = 'peashooter'; }
    s.sprouts = s.sprouts.filter(sp => { if (isObj(sp)) return true; repairs.push('plant'); return false; });
    for (const sp of s.sprouts) {
      if (!sp.id) sp.id = newId('s'); if (typeof sp.name !== 'string' || !sp.name) sp.name = 'Sprig';
      if (!D.PLANTS[sp.species]) { repairs.push('species'); sp.species = 'peashooter'; }
      if (!isObj(sp.stats)) sp.stats = {};
      for (const st of D.STATS) { const x = sp.stats[st]; sp.stats[st] = isObj(x) ? { lv: Math.max(0, Math.min(D.GROWTH.maxLevel, Math.round(num(x.lv, 0)))), xp: Math.max(0, num(x.xp, 0)) } : { lv: 0, xp: 0 }; }
      if (!isObj(sp.look)) sp.look = {};
      sp.infused = countMap(sp.infused, k => !!D.ELEMENT_INFO[k]);
      if (sp.element != null && !D.ELEMENT_INFO[sp.element]) { repairs.push('element'); sp.element = null; }
      if (sp.fuse != null) {
        if (!isObj(sp.fuse) || (!D.PLANTS[sp.fuse.with] && !D.FUSION_ITEMS[sp.fuse.item])) { repairs.push('fuse'); sp.fuse = null; }
        else { if (!D.PLANTS[sp.fuse.with]) delete sp.fuse.with; if (!D.FUSION_ITEMS[sp.fuse.item]) delete sp.fuse.item; sp.fuse.stage = Math.max(0, Math.min(2, num(sp.fuse.stage, 0))); }
      }
      if (sp.moveset != null && (!Array.isArray(sp.moveset) || sp.moveset.some(x => typeof x !== 'string'))) { repairs.push('moveset'); delete sp.moveset; } // chosen battle moves (optional)
      sp.record = Object.assign({ races: 0, raceWins: 0, battles: 0, battleWins: 0 }, isObj(sp.record) ? sp.record : {});
      sp.stage = Math.max(0, Math.min(2, Math.round(num(sp.stage, 0))));
      sp.happy = num(sp.happy, 70); sp.energy = num(sp.energy, 100); if (!D.AREAS[sp.area]) sp.area = 'frontyard';
    }
    // each garden has room for D.GROWTH.gardenMax plants outside: any extra wait in its house (the partner and the strongest stay out)
    const lvSum = x => D.STATS.reduce((a, k) => a + x.stats[k].lv, 0);
    for (const a of D.AREA_ORDER) {
      const out = s.sprouts.filter(x => x.area === a && !x.home);
      if (out.length <= D.GROWTH.gardenMax) continue;
      out.sort((x, y) => (y.id === s.activeId) - (x.id === s.activeId) || lvSum(y) - lvSum(x));
      for (const x of out.slice(D.GROWTH.gardenMax)) { x.home = true; delete x.pot; delete x.potArea; }
    }
    if (!s.v || s.v < SAVE_VERSION) s.v = SAVE_VERSION;
    return s;
  }
  // battle.js keeps its own progress in progress.battleExtra (bosses, tower, friend, snack, seen, wild). Only wrong types are fixed;
  // missing parts are fine (battle.js fills them in when it needs them).
  function fixBattleExtra(bx, repairs) {
    if (!isObj(bx)) return;
    const bad = k => repairs.push('battleExtra.' + k);
    for (const k of ['bosses', 'friend', 'seen']) if (bx[k] != null && !isObj(bx[k])) { bad(k); bx[k] = {}; }
    for (const [id, b] of Object.entries(bx.bosses || {})) if (!isObj(b)) { bad('bosses'); delete bx.bosses[id]; }
    if (bx.tower != null && !isObj(bx.tower)) { bad('tower'); bx.tower = { best: 0, runs: 0, run: null }; }
    if (bx.tower) {
      for (const k of ['best', 'runs']) if (bx.tower[k] != null && typeof bx.tower[k] !== 'number') { bad('tower'); bx.tower[k] = 0; }
      const r = bx.tower.run;
      if (r != null && (!isObj(r) || typeof r.sid !== 'string' || !(num(r.floor, 0) >= 1))) { bad('tower.run'); bx.tower.run = null; }
      else if (r && r.fighting != null && typeof r.fighting !== 'number') delete r.fighting;
    }
    if (bx.wild != null && !isObj(bx.wild)) { bad('wild'); bx.wild = {}; }
    if (bx.wild) {
      if (bx.wild.animals != null && !isObj(bx.wild.animals)) { bad('wild'); bx.wild.animals = {}; }
      if (bx.wild.areas != null && !isObj(bx.wild.areas)) { bad('wild'); bx.wild.areas = {}; }
      for (const [id, v] of Object.entries(bx.wild.animals || {})) if (!Array.isArray(v) || v.length !== 3 || v.some(x => typeof x !== 'number')) { bad('wild'); delete bx.wild.animals[id]; }
    }
    if (bx.snack != null && typeof bx.snack !== 'string') delete bx.snack;
  }
  // race.js keeps the extra/wild series, time trials (with ghost runs), the Daily Cup and hint counters in progress.raceExtra.
  function fixRaceExtra(rx, repairs) {
    if (!isObj(rx)) return;
    const bad = k => repairs.push('raceExtra.' + k);
    for (const k of ['series', 'trials', 'daily', 'hint']) if (rx[k] != null && !isObj(rx[k])) { bad(k); rx[k] = {}; }
    for (const [key, v] of Object.entries(rx.series || {})) if (!isObj(v)) { bad('series'); delete rx.series[key]; }
    for (const [key, v] of Object.entries(rx.trials || {})) {
      if (!isObj(v)) { bad('trials'); delete rx.trials[key]; continue; }
      if (v.g != null && (!Array.isArray(v.g) || v.g.some(x => typeof x !== 'number'))) { bad('trials'); delete v.g; delete v.dt; delete v.len; } // a broken ghost goes; the best time stays
    }
  }
  function parseSave(raw, repairs) { try { return raw ? migrate(JSON.parse(raw), repairs) : null; } catch (e) { return null; } }

  // ---------------- safety net: automatic daily backups + a kept copy of any save that fails to load ----------------
  // They live under their own prefixes (never a player key). SNAP: up to 3 known-good saves from different days (race-ghost
  // replays left out to save space). RESCUE: the raw text of a save that couldn't be opened, so nothing is ever overwritten blind.
  const SNAP = 'pvzg:snap:v1:', RESCUE = 'pvzg:rescue:v1:', SNAP_KEEP = 3;
  const dayOf = ts => new Date(ts).toDateString();
  function readSnaps(key) { try { const v = JSON.parse(localStorage.getItem(SNAP + (key || KEY))); return v && Array.isArray(v.list) ? v.list.filter(x => x && x.raw && x.at) : []; } catch (e) { return []; } }
  function snapshot(raw) {
    try {
      const list = readSnaps();
      if (list.length && dayOf(list[0].at) === dayOf(Date.now())) return; // one per day: the first good load of the day
      const obj = JSON.parse(raw), rx = obj && obj.progress && obj.progress.raceExtra;
      if (rx && isObj(rx.trials)) for (const t of Object.values(rx.trials)) if (isObj(t)) delete t.g;
      list.unshift({ at: Date.now(), raw: JSON.stringify(obj) });
      try { localStorage.setItem(SNAP + KEY, JSON.stringify({ list: list.slice(0, SNAP_KEEP) })); }
      catch (e) { try { localStorage.setItem(SNAP + KEY, JSON.stringify({ list: list.slice(0, 1) })); } catch (e2) { localStorage.removeItem(SNAP + KEY); } } // never crowd out the real save
    } catch (e) { /* optional */ }
  }
  function keepRescue(raw) { try { localStorage.setItem(RESCUE + KEY, JSON.stringify({ at: Date.now(), raw })); } catch (e) { /* storage full: the raw save is still in place until the next save */ } }
  let loadNote = null; // tells the app (once) that a save had to be repaired, restored from a daily backup, or restarted
  function load() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { return null; }
    if (raw == null) return null; // a brand-new player
    const repairs = [], s = parseSave(raw, repairs);
    if (s && !repairs.length) { snapshot(raw); return s; }
    keepRescue(raw); // keep the original text before anything overwrites it
    if (s) { loadNote = { kind: 'repaired', what: repairs }; return s; }
    for (const sn of readSnaps()) { const b = parseSave(sn.raw); if (b) { loadNote = { kind: 'snapshot', at: sn.at }; return b; } }
    loadNote = { kind: 'fresh' };
    return null;
  }
  let saveTimer = null, saveLockUntil = 0, saveFailed = false;
  // returns false (and tells the app once) when the device refuses to save
  function saveNow() {
    if (Date.now() < saveLockUntil) return true;
    try { localStorage.setItem(KEY, JSON.stringify(PS.S)); if (saveFailed) { saveFailed = false; emit('save:ok'); } return true; }
    catch (e) { if (!saveFailed) { saveFailed = true; emit('save:failed', { error: e }); } return false; }
  }
  function save() { if (saveTimer) return; saveTimer = setTimeout(() => { saveTimer = null; saveNow(); }, 400); }
  // Before a reload that must not write the old in-memory game back (a restore, or removing the current player): stop saving.
  function lockSaves(ms) { saveLockUntil = Date.now() + (ms || 10000); if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; } }
  function reset() { PS.S = fresh(); saveNow(); emit('reset'); }

  // ---------------- player management ----------------
  const playersApi = {
    list: () => players.list.slice(),
    current: () => players.list.find(p => p.id === players.current),
    isTesting: () => !!SLOT,
    named: () => !!players.named,
    summary(id) {
      const sv = id === players.current && !SLOT ? PS.S : (() => { try { return parseSave(localStorage.getItem(keyFor(id))); } catch (e) { return null; } })();
      if (!sv) return { sprouts: 0, coins: 1000, eggs: 0, partner: null };
      const partner = sv.sprouts.find(x => x.id === sv.activeId) || sv.sprouts[0] || null;
      return { sprouts: sv.sprouts.length, coins: sv.coins, eggs: sv.eggs.length, partner };
    },
    add(name) {
      let base = String(name || '').trim().slice(0, 12) || 'Player ' + (players.list.length + 1), nm = base, n = 2;
      while (players.list.some(p => p.name.toLowerCase() === nm.toLowerCase())) nm = `${base} ${n++}`;
      const p = { id: newId('p'), name: nm, created: Date.now() }; players.list.push(p); writePlayers(players); return p;
    },
    rename(id, name) { const p = players.list.find(x => x.id === id); if (!p) return; p.name = String(name || '').trim().slice(0, 14) || p.name; if (id === players.current) players.named = true; writePlayers(players); },
    // (its daily automatic backups are kept for a while, so a removal by mistake can still be undone from Backups)
    remove(id) {
      if (players.list.length < 2) return false;
      const wasCurrent = players.current === id && !SLOT;
      if (wasCurrent) lockSaves(60000); // the reload that follows must not write this game back
      players.list = players.list.filter(p => p.id !== id);
      try { localStorage.removeItem(keyFor(id)); } catch (e) { /* blocked */ }
      if (players.current === id) players.current = players.list[0].id;
      writePlayers(players); return true;
    },
    // switching players reloads the game with the other save
    // skipMenu: after the reload, go straight into the game instead of showing the main menu again
    switchTo(id, skipMenu) {
      if (!players.list.some(p => p.id === id)) return;
      saveNow(); lockSaves(); players.current = id; players.named = true; writePlayers(players);
      if (skipMenu) { try { sessionStorage.setItem('pvzg:skipMenu', '1'); } catch (e) { /* blocked */ } }
      location.reload();
    },
    // backup reminders: when each player's game was last copied or shared as a backup code (kept with the player list)
    markBackedUp(ids) { if (SLOT) return; players.backedUp = Object.assign({}, players.backedUp); for (const id of ids) players.backedUp[id] = Date.now(); writePlayers(players); },
    lastBackup: id => (players.backedUp && players.backedUp[id]) || 0,
    touch() { const p = players.list.find(x => x.id === players.current); if (p) { p.lastPlayed = Date.now(); writePlayers(players); } },
    // a brand-new install: one unnamed player who hasn't hatched anything yet
    isFreshInstall() { return players.list.length === 1 && !players.named && playersApi.summary(players.list[0].id).sprouts === 0; },
    markNamed() { players.named = true; writePlayers(players); },
    // read-only copies of another player's plants on this device (e.g. for friend battles). Never write these back.
    sproutsOf(id) {
      const sv = id === players.current && !SLOT ? PS.S : (() => { try { return parseSave(localStorage.getItem(keyFor(id))); } catch (e) { return null; } })();
      return sv ? JSON.parse(JSON.stringify(sv.sprouts)) : [];
    },
  };

  // ---------------- backups (copyable codes) ----------------
  // Format: "PVZGARDEN1Z:" + base64(deflate(json)), or "PVZGARDEN1J:" + base64(json) where compression is unavailable.
  const toB64 = bytes => { let out = ''; for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(out); };
  const fromB64 = str => { const bin = atob(str); const b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return b; };
  async function encodeBackup(obj) {
    let bytes = new TextEncoder().encode(JSON.stringify(obj)), tag = 'J';
    try { if (window.CompressionStream) { const st = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw')); bytes = new Uint8Array(await new Response(st).arrayBuffer()); tag = 'Z'; } } catch (e) { tag = 'J'; bytes = new TextEncoder().encode(JSON.stringify(obj)); }
    return `PVZGARDEN1${tag}:${toB64(bytes)}`;
  }
  async function decodeBackup(code) {
    const m = /^PVZGARDEN1([JZ]):([A-Za-z0-9+/=]+)$/.exec(String(code || '').replace(/\s+/g, ''));
    if (!m) throw new Error('That does not look like a PVZ Garden backup code.');
    let bytes = fromB64(m[2]);
    if (m[1] === 'Z') {
      if (!window.DecompressionStream) throw new Error('This device cannot open compressed backups. Try a newer browser.');
      const st = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')); bytes = new Uint8Array(await new Response(st).arrayBuffer());
    }
    const obj = JSON.parse(new TextDecoder().decode(bytes));
    if (!obj || (obj.kind !== 'player' && obj.kind !== 'all')) throw new Error('This backup code is incomplete.');
    return obj;
  }
  async function exportBackup(which) {
    saveNow();
    if (which === 'all') {
      const list = players.list.map(p => ({ name: p.name, save: p.id === players.current && !SLOT ? PS.S : parseSave(localStorage.getItem(keyFor(p.id))) })).filter(x => x.save);
      return encodeBackup({ kind: 'all', at: Date.now(), players: list });
    }
    return encodeBackup({ kind: 'player', at: Date.now(), name: (playersApi.current() || {}).name || 'Player', save: PS.S });
  }
  // mode 'new': add as new player(s) · mode 'replace': overwrite the current player (single-player backups only)
  function importBackup(obj, mode) {
    const entries = obj.kind === 'all' ? obj.players : [{ name: obj.name, save: obj.save }];
    const good = entries.map(e => ({ name: e.name, save: migrate(e.save) })).filter(e => e.save);
    if (!good.length) throw new Error('This backup has no saved games in it.');
    if (mode === 'replace' && obj.kind === 'player') {
      replaceCurrent(good[0].save);
      return [playersApi.current().name];
    }
    const names = [];
    for (const e of good) {
      const p = playersApi.add(e.name); names.push(p.name);
      try { localStorage.setItem(keyFor(p.id), JSON.stringify(e.save)); } catch (err) { throw new Error('This device would not let the game save.'); }
    }
    return names;
  }
  // Put a whole saved game in place of the current player's, then hold saves until the caller reloads:
  // the old game still in memory (and every save-on-exit handler) must never be written back over it.
  function replaceCurrent(saveObj) {
    try { localStorage.setItem(KEY, JSON.stringify(saveObj)); } catch (e) { throw new Error('This device would not let the game save.'); }
    PS.S = saveObj; lockSaves(10000);
  }
  // Automatic daily backups of the current player (newest first) and the kept copy of a save that failed to load.
  const autoBackups = () => readSnaps().map((sn, i) => { const s = parseSave(sn.raw); return { i, at: sn.at, ok: !!s, sprouts: s ? s.sprouts.length : 0, coins: s ? s.coins : 0 }; });
  function restoreAuto(i) { const sn = readSnaps()[i], s = sn && parseSave(sn.raw); if (!s) throw new Error('That backup could not be opened.'); replaceCurrent(s); return true; }
  function rescued() { try { const v = JSON.parse(localStorage.getItem(RESCUE + KEY)); return v && v.raw ? v : null; } catch (e) { return null; } }
  // tidy up: automatic backups of players removed more than 30 days ago
  function pruneSnaps() {
    try {
      const live = new Set(players.list.map(p => SNAP + keyFor(p.id)));
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i); if (!k || !k.startsWith(SNAP) || live.has(k) || k === SNAP + KEY) continue;
        const list = readSnaps(k.slice(SNAP.length)); if (!list.length || Date.now() - list[0].at > 30 * 86400000) localStorage.removeItem(k);
      }
    } catch (e) { /* optional */ }
  }

  // ---------------- clock (switches day/night every 15 real minutes) ----------------
  const PH = D.CLOCK.phaseMinutes * 60000, FADE = D.CLOCK.fadeSeconds * 1000;
  const clock = {
    now: () => Date.now() + (PS.S ? PS.S.clockOffset || 0 : 0),
    phase: () => Math.floor(clock.now() / PH),
    isNight: () => clock.phase() % 2 === 1,
    msToSwitch: () => PH - (clock.now() % PH),
    night() { // 0 = full day, 1 = full night, blends near the switch
      const into = clock.now() % PH, left = PH - into, n = clock.isNight() ? 1 : 0;
      if (into < FADE) return n ? 0.5 + 0.5 * into / FADE : 0.5 - 0.5 * into / FADE;
      if (left < FADE) return n ? 0.5 + 0.5 * left / FADE : 0.5 - 0.5 * left / FADE;
      return n;
    },
    toggle() { PS.S.clockOffset = (PS.S.clockOffset || 0) + (PH - clock.now() % PH) + 1000; save(); emit('night', { isNight: clock.isNight() }); },
  };
  let lastNight = null;
  setInterval(() => { if (!PS.S) return; const n = clock.isNight(); if (lastNight !== null && n !== lastNight) emit('night', { isNight: n }); lastNight = n; }, 2000);

  // ---------------- plants ----------------
  const blankStats = () => Object.fromEntries(D.STATS.map(s => [s, { lv: 0, xp: 0 }]));
  const specOf = s => D.PLANTS[s && s.species] || D.PLANTS.peashooter;
  function uniqueName() {
    const used = new Set(PS.S.sprouts.map(s => s.name));
    const free = D.NAMES.filter(n => !used.has(n));
    return free.length ? pick(free.slice(0, 8)) : ('Plant ' + (PS.S.sprouts.length + 1));
  }
  // a new plant. opts: { species, kind (seed packet kind), area, name, npc }
  function makeSprout(opts) {
    opts = opts || {};
    const seed = D.SEEDS[opts.kind] || D.SEEDS.normal, species = D.PLANTS[opts.species] ? opts.species : 'peashooter';
    const s = {
      id: newId('s'), name: opts.name || uniqueName(), species, area: opts.area || 'frontyard', born: Date.now(), kind: opts.kind || 'normal',
      look: {}, stats: blankStats(), stage: 0, infused: {}, element: null, fuse: null,
      happy: 70, energy: 100, record: { races: 0, raceWins: 0, battles: 0, battleWins: 0 },
    };
    if (seed.skin) s.look.skin = seed.skin;
    else if (!opts.npc && Math.random() < D.SHINY_CHANCE) s.look.shiny = true; // a rare shimmering Shiny (about 1 in 30)
    if (seed.bonus) D.STATS.forEach(st => addXp(s, st, seed.bonus, true));
    return s;
  }
  const xpFor = lv => D.GROWTH.xpForLevel(lv);
  function addXp(s, stat, amt, quiet) {
    const st = s.stats[stat]; if (!st || !amt) return 0;
    st.xp += amt; let ups = 0;
    while (st.lv < D.GROWTH.maxLevel && st.xp >= xpFor(st.lv)) { st.xp -= xpFor(st.lv); st.lv++; ups++; }
    if (st.lv >= D.GROWTH.maxLevel) st.xp = 0;
    if (st.xp < 0) st.xp = 0;
    if (ups && !quiet && !s.npc) emit('levelup', { s, stat, lv: st.lv });
    return ups;
  }
  // a very happy plant (happiness 75+, from petting, snacks and elements) learns a little faster: +10% on every XP gain
  const happyBonus = s => (s && !s.npc && (s.happy || 0) >= 75 ? 1.1 : 1);
  // gives = {stat: xp}. Each species learns its strong stats faster (PLANTS[id].bias). Returns {ups:{stat:n}, evolved}
  function gain(s, gives, opts) {
    opts = opts || {}; const ups = {}, k = (opts.mult || 1) * (opts.quiet ? 1 : happyBonus(s)), bias = s.zombie ? {} : specOf(s).bias || {}, tl0 = s.stats ? totalLevels(s) : 0;
    for (const [stat, amt] of Object.entries(gives || {})) { const n = addXp(s, stat, amt > 0 ? amt * k * (bias[stat] || 1) : amt * (opts.mult || 1), opts.quiet); if (n) ups[stat] = n; }
    const evolved = s.npc ? null : checkEvolve(s);
    if (!s.npc && !s.zombie) { const t0 = tl0, t1 = totalLevels(s), learned = levelMoves(s).filter(m => m.at > t0 && m.at <= t1).map(m => m.id); if (learned.length) emit('move:learn', { s, ids: learned }); }
    if (!s.npc) { emit('sprout:update', { s }); save(); }
    return { ups, evolved };
  }
  const totalLevels = s => D.STATS.reduce((a, k) => a + s.stats[k].lv, 0);
  function domStat(s) { return D.STATS.slice().sort((a, b) => (s.stats[b].lv * 1000 + s.stats[b].xp) - (s.stats[a].lv * 1000 + s.stats[a].xp))[0]; }
  function checkEvolve(s) {
    const tl = totalLevels(s); let ev = null;
    if (s.stage === 0 && tl >= D.EVO.budAt) ev = evolveTo(s, 1);
    if (s.stage === 1 && tl >= D.EVO.bloomAt) ev = evolveTo(s, 2);
    return ev;
  }
  function evolveTo(s, stage) {
    const from = formInfo(s).name;
    s.stage = stage;
    const to = formInfo(s).name;
    const ev = { s, from, to, name: s.name, stage };
    if (!s.npc) { emit('sprout:evolve', ev); save(); setTimeout(() => reward('evolve:' + s.species + '-' + stage, `${from} evolved`), 0); } // (some plants unlock when another evolves: Melon-pult)
    return ev;
  }

  // ---------------- forms, names, moves, looks ----------------
  const stageName = (species, stage) => { const P = D.PLANTS[species] || D.PLANTS.peashooter; return P.names[Math.max(0, Math.min(2, stage | 0))]; };
  // the fused form's name (no element prefix): "Sunshooter" -> "Sun Repeater", "Knight Repeater", "Pea-pult"
  function fusionForm(s) {
    const P = specOf(s), st = stageName(s.species, s.stage), F = s.fuse;
    if (!F) return st;
    if (F.item && D.FUSION_ITEMS[F.item]) return D.FUSION_ITEMS[F.item].form.replace('{stage}', st).replace('{pre}', P.pre);
    const B = D.PLANTS[F.with]; if (!B) return st;
    const fixed = D.FUSION_NAMES[s.species + '+' + F.with];
    if (s.stage === 0) return fixed || (B.pre + P.suf);
    return `${B.pre} ${st}`;
  }
  function formInfo(s) {
    if (s.zombie) { const Z = D.ZOMBIES[s.zombie] || D.ZOMBIES.basic; return { id: 'zombie:' + s.zombie, name: s.name || Z.name, short: Z.name, stage: 0, el: Z.el[0], moves: Z.moves.slice() }; }
    const P = specOf(s), base = fusionForm(s), E = s.element && D.ELEMENT_INFO[s.element];
    const role = D.ROLES[P.role] || D.ROLES.shooter, stg = Math.max(0, Math.min(2, s.stage | 0));
    return { id: s.species + ':' + stg, name: E ? `${E.prefix} ${base}` : base, short: base, species: stageName(s.species, stg), stage: stg, el: s.element || P.el, moves: [P.sig[stg], ...role.moves[stg]] };
  }
  // types: its element (if any), the type a fusion adds, then its own type (two at most)
  function elementsOf(s) {
    if (s.zombie) return (D.ZOMBIES[s.zombie] || D.ZOMBIES.basic).el.slice(0, 2);
    const P = specOf(s), F = s.fuse, fz = F ? (F.item && D.FUSION_ITEMS[F.item] ? D.FUSION_ITEMS[F.item].el : F.with && D.PLANTS[F.with] ? D.PLANTS[F.with].el : null) : null;
    const out = [];
    for (const e of [s.element, fz, P.el]) if (e && D.ELEMENTS[e] && !out.includes(e)) out.push(e);
    return out.slice(0, 2);
  }
  // a fused partner plant teaches its signature moves (up to the stage it was when fused); an item teaches one move
  function fusionMoves(s) {
    const F = s.fuse; if (!F) return [];
    if (F.item && D.FUSION_ITEMS[F.item]) return [D.FUSION_ITEMS[F.item].move];
    const B = D.PLANTS[F.with]; return B ? B.sig.slice(0, (F.stage | 0) + 1) : [];
  }
  const elTier = n => Math.min(3, n | 0); // 1 core unlocks the first move, 2 the second, 3 the third
  // the bonus moves a species learns as it levels up: [{ id, at }] (at = total level). See D.LEVEL_MOVES / D.BONUS_MOVES.
  const lvlCache = {};
  function levelMoves(s) {
    if (s.zombie || !D.PLANTS[s.species]) return [];
    if (lvlCache[s.species]) return lvlCache[s.species];
    const P = D.PLANTS[s.species], role = D.ROLES[P.role] || D.ROLES.shooter, bonus = D.BONUS_MOVES[P.role] || D.BONUS_MOVES.shooter, E = D.ELEMENT_INFO[P.el];
    const taken = new Set(P.sig.concat(...role.moves)), out = [];
    const lv50 = E ? [E.moves[1]].filter(id => D.MOVES[id] && D.MOVES[id].pow > 0).concat(D.ALT_ATTACKS[P.el] || []) : D.PLANT_TYPE_MOVES[1];
    const slots = [[bonus[0]], [bonus[1]], E ? [E.moves[0]] : D.PLANT_TYPE_MOVES[0], [bonus[2]], lv50, [bonus[3]]];
    D.LEVEL_MOVES.forEach((at, i) => {
      const id = (slots[i] || []).concat(at >= 30 ? D.STRONG_SPARES : D.SPARE_MOVES).find(m => D.MOVES[m] && !taken.has(m));
      if (id) { taken.add(id); out.push({ id, at }); }
    });
    return (lvlCache[s.species] = out);
  }
  const levelMovesNow = s => { const tl = totalLevels(s); return levelMoves(s).filter(m => tl >= m.at).map(m => m.id); };
  function elementMoves(s) { const out = []; for (const [el, n] of Object.entries(s.infused || {})) { const E = D.ELEMENT_INFO[el]; if (E) E.moves.slice(0, elTier(n)).forEach(id => out.push(id)); } return out; }
  // Every plant has 3 moves per stage. By default it battles with its form's 3 + its best extra move (its element's newest, or
  // its fusion move). The player can instead pick any MAX_MOVES of the moves it has learned (s.moveset); NPCs always use the default.
  const MAX_MOVES = 4;
  function defaultMoves(s) {
    const ids = formInfo(s).moves.slice();
    if (s.zombie) return ids;
    const E = s.element && D.ELEMENT_INFO[s.element], n = E ? elTier((s.infused || {})[s.element]) : 0;
    const extra = E && n ? E.moves[n - 1] : fusionMoves(s).slice(-1)[0] || levelMovesNow(s).slice(-1)[0];
    if (extra && D.MOVES[extra] && !ids.includes(extra)) ids.push(extra);
    return ids;
  }
  // every move it can use right now: this and earlier stages, its elements and its fusion
  function learnedMoves(s) {
    if (s.zombie) return formInfo(s).moves.filter(id => D.MOVES[id]);
    const P = specOf(s), role = D.ROLES[P.role] || D.ROLES.shooter, ids = [];
    const add = id => { if (D.MOVES[id] && !ids.includes(id)) ids.push(id); };
    formInfo(s).moves.forEach(add);
    for (let st = s.stage - 1; st >= 0; st--) { add(P.sig[st]); role.moves[st].forEach(add); }
    elementMoves(s).forEach(add); fusionMoves(s).forEach(add); levelMovesNow(s).forEach(add);
    return ids;
  }
  function movesOf(s) {
    const def = defaultMoves(s);
    if (s.npc || !Array.isArray(s.moveset) || !s.moveset.length) return def;
    const known = new Set(learnedMoves(s)), pick = s.moveset.filter((id, i, a) => known.has(id) && a.indexOf(id) === i).slice(0, MAX_MOVES);
    if (!pick.length) return def;
    for (const id of def) if (pick.length < Math.min(MAX_MOVES, known.size) && !pick.includes(id)) pick.push(id); // fill any gap
    return pick;
  }
  // pick the battle moves (null or the usual set = let the game choose, which then follows new stages and elements by itself)
  function setMoves(s, ids) {
    const known = new Set(learnedMoves(s)), pick = (ids || []).filter((id, i, a) => known.has(id) && a.indexOf(id) === i).slice(0, MAX_MOVES);
    const def = defaultMoves(s);
    if (!pick.length || (pick.length === def.length && pick.every(id => def.includes(id)))) delete s.moveset; else s.moveset = pick;
    emit('sprout:update', { s }); save(); return movesOf(s);
  }
  // How well a move suits this plant, from its stats and types: { score, why } (why = one short line for kids, or '')
  function moveFit(s, id) {
    const m = D.MOVES[id]; if (!m) return { score: 0, why: '' };
    const L = k => s.stats[k].lv, fx = m.fx || {}, sum = L('power') + L('stamina') + L('run') + L('fly') + 4;
    const share = k => (L(k) + 1) / sum, top = ['power', 'stamina', 'run', 'fly'].sort((a, b) => L(b) - L(a))[0];
    const stab = m.el !== 'normal' && elementsOf(s).includes(m.el), nm = s.name;
    if (m.pow > 0) {
      let v = m.pow * (fx.hits || 1) * m.acc * (stab ? D.BATTLE.stab : 1) * (1 + (fx.crit || 0) * 0.6) * (0.85 + share('power') * 0.9);
      v *= 1 + (fx.drain || 0) * 0.5 * (0.6 + share('stamina')) - (fx.recoil || 0) * 0.6 + (fx.first ? 0.06 + share('run') * 0.3 : 0);
      if (fx.status) v += fx.status.chance * 25; if (fx.debuff) v += 6; if (fx.buff) v += 6; if (fx.once) v *= 0.85;
      const why = stab ? `Same type as ${nm}: extra strong` : fx.hits > 1 ? `Hits ${fx.hits} times` : fx.drain ? `Heals ${nm} while it hits` : fx.first ? 'Always goes first' : fx.sure ? 'Never misses' : top === 'power' && m.pow >= 60 ? `Great with ${nm}'s strong Power` : '';
      return { score: v, why };
    }
    let v = 0; const bufs = [].concat(fx.buff || []), debs = [].concat(fx.debuff || []);
    if (fx.heal) v += fx.heal * 110 * (0.6 + share('stamina') * 1.4) * (fx.once ? 0.8 : 1);
    for (const b of bufs) v += b.n * ({ atk: 22 * (0.6 + share('power') * 1.4), def: 18 * (0.6 + share('stamina') * 1.4), spd: 12 * (0.6 + share('run') * 1.4), eva: 16 * (0.6 + share('fly') * 1.4), acc: 8 }[b.stat] || 10);
    for (const b of debs) v += b.n * ({ atk: 18, def: 18, spd: 10, acc: 14, eva: 12 }[b.stat] || 10);
    if (fx.status) v += fx.status.chance * ({ stun: 40, sleep: 45, poison: 32, burn: 36 }[fx.status.type] || 30) * m.acc;
    if (fx.cleanse) v += 8;
    const b0 = bufs[0] && bufs[0].stat;
    const why = fx.heal && top === 'stamina' ? `Great for tough ${nm}: heals` : fx.heal ? `Heals ${nm}` : b0 === 'atk' ? (top === 'power' ? `Makes strong ${nm} even stronger` : 'Raises Attack')
      : b0 === 'def' ? (top === 'stamina' ? `Makes tough ${nm} even tougher` : 'Raises Defense') : b0 === 'eva' ? (top === 'fly' ? `Floaty ${nm} dodges even more` : 'Helps it dodge')
        : b0 === 'spd' ? (top === 'run' ? `Speedy ${nm} gets even faster` : 'Makes it faster') : fx.status ? `May make them ${{ stun: 'dizzy', sleep: 'sleep', poison: 'poisoned', burn: 'burned' }[fx.status.type] || 'weaker'}` : debs.length ? 'Makes them weaker' : '';
    return { score: v, why };
  }
  // the moves that suit it best: its strongest attacks (different types where it can, so something hits hard), plus its best helper move
  function bestMoves(s) {
    const all = learnedMoves(s).map(id => ({ id, m: D.MOVES[id], f: moveFit(s, id).score }));
    const atk = all.filter(x => x.m.pow > 0).sort((a, b) => b.f - a.f), sup = all.filter(x => x.m.pow <= 0).sort((a, b) => b.f - a.f);
    const pick = [], els = new Set();
    for (const x of atk) { if (pick.length >= 3) break; if (pick.length && els.has(x.m.el) && atk.some(y => !pick.includes(y.id) && !els.has(y.m.el) && y.f > x.f * 0.8)) continue; pick.push(x.id); els.add(x.m.el); }
    for (const x of atk) if (pick.length < 2 && !pick.includes(x.id)) pick.push(x.id);
    if (sup.length && pick.length < MAX_MOVES) pick.push(sup[0].id);
    for (const x of atk.concat(sup)) if (pick.length < Math.min(MAX_MOVES, all.length) && !pick.includes(x.id)) pick.push(x.id);
    return pick;
  }
  // everything it knows, with where it came from (for the plant page). locked element moves show how many cores they need.
  function knownMoves(s) {
    const P = specOf(s), role = D.ROLES[P.role] || D.ROLES.shooter, active = new Set(movesOf(s)), out = [], seenIds = new Set();
    const add = (id, from, extra) => { if (!D.MOVES[id] || seenIds.has(id)) return; seenIds.add(id); out.push(Object.assign({ id, from, active: active.has(id) }, extra || {})); };
    for (let st = s.stage; st >= 0; st--) { const nm = stageName(s.species, st); add(P.sig[st], nm); role.moves[st].forEach(id => add(id, nm)); }
    for (let st = s.stage + 1; st <= 2; st++) add(P.sig[st], stageName(s.species, st), { locked: true, evolveTo: st });
    for (const [el, n] of Object.entries(s.infused || {})) { const E = D.ELEMENT_INFO[el]; if (!E) continue; E.moves.forEach((id, i) => add(id, E.name + ' element', i < elTier(n) ? null : { locked: true, unlockAt: i + 1, cores: i + 1 - (n | 0) })); }
    const F = s.fuse; if (F) fusionMoves(s).forEach(id => add(id, F.item ? D.FUSION_ITEMS[F.item].name : stageName(F.with, F.stage) + ' fusion'));
    const tl = totalLevels(s); for (const m of levelMoves(s)) add(m.id, `Level ${m.at}`, tl >= m.at ? null : { locked: true, level: m.at });
    return out;
  }
  function battleStats(s) {
    const B = D.BATTLE, L = k => s.stats[k].lv;
    const tl = totalLevels(s);
    return {
      hp: Math.round(B.hpBase + L('stamina') * B.hpPerStamina + tl * B.hpPerLevel),
      atk: Math.round(B.atkBase + L('power') * B.atkPerPower),
      def: Math.round(B.defBase + L('stamina') * B.defPerStamina + L('swim') * B.defPerSwim),
      spd: Math.round(B.spdBase + L('run') * B.spdPerRun),
      eva: Math.min(B.evaMax, L('fly') * B.evaPerFly),
      els: elementsOf(s), level: tl,
    };
  }
  // Race rating per segment type (roughly 1.5 fresh → 6 mid-game → 12+ late). A species' natural strengths add a little
  // (lily pads swim, Bloomerangs glide, Wall-nuts climb), more as it evolves; a fused partner adds half of its own.
  const ITEM_RACE = { jetpack: { fly: 1.5, run: 0.5 }, pirate: { swim: 1 }, cowboy: { run: 1 }, ninja: { run: 1, climb: 0.5 }, knight: { climb: 0.8 }, space: { fly: 1 }, catapult: { climb: 0.5, fly: 0.5 } };
  function raceBonus(s, seg) {
    if (s.zombie) return ((D.ZOMBIES[s.zombie] || {}).race || {})[seg] || 0;
    let r = (specOf(s).race[seg] || 0) * (0.7 + 0.15 * (s.stage | 0));
    const F = s.fuse; if (F && F.with && D.PLANTS[F.with]) r += (D.PLANTS[F.with].race[seg] || 0) * 0.5;
    if (F && F.item && ITEM_RACE[F.item]) r += ITEM_RACE[F.item][seg] || 0;
    return r;
  }
  function raceRating(s, seg) { const stat = D.RACE_STAT[seg] || seg; return 1.5 + s.stats[stat].lv * 0.35 + raceBonus(s, seg); }
  function staminaRating(s) { return 1.5 + s.stats.stamina.lv * 0.35 + (s.species === 'wallnut' || s.species === 'pumpkin' || s.species === 'infinut' ? 0.8 : 0); }

  // Pixel look for PX.sprig() (art-core.js draws plants and zombies from this)
  function lookOf(s) {
    if (s.zombie) return Object.assign({ zombie: s.zombie }, s.look && s.look.skin ? { skin: s.look.skin } : {});
    const L = { species: s.species, stage: s.stage | 0 };
    if (s.element) L.element = s.element;
    if (s.look && s.look.skin) L.skin = s.look.skin;
    if (s.look && s.look.shiny) L.shiny = true;
    if (s.fuse) L.fuse = s.fuse.item ? { item: s.fuse.item } : { with: s.fuse.with };
    return L;
  }

  // ---------------- elements: shards -> cores -> plants ----------------
  // catching an element sprite gives a shard; every 3 shards of one element make a core in the pouch (if there's room)
  const coresInPouch = () => PS.S.pouch.length;
  const pouchFull = () => coresInPouch() >= D.GROWTH.pouchMax;
  function canCatch(el) { return !pouchFull() || ((PS.S.shards[el] || 0) < D.SHARDS_PER_CORE - 1); }
  function addShard(el, n) {
    if (!D.ELEMENT_INFO[el]) return { el, n: 0, completed: 0 };
    PS.S.shards[el] = (PS.S.shards[el] || 0) + (n || 1);
    let completed = 0;
    while (PS.S.shards[el] >= D.SHARDS_PER_CORE && !pouchFull()) { PS.S.shards[el] -= D.SHARDS_PER_CORE; PS.S.pouch.push(el); completed++; }
    if (!PS.S.shards[el]) delete PS.S.shards[el];
    PS.S.seen['el:' + el] = true;
    const ev = { el, n: n || 1, completed, have: PS.S.shards[el] || 0 }; emit('shard', ev); emit('pouch'); save(); return ev;
  }
  // a whole core (gumball / rewards); when the pouch is full it becomes shards instead, so it is never lost
  function addToPouch(el) { if (!D.ELEMENT_INFO[el]) return false; if (pouchFull()) { addShard(el, D.SHARDS_PER_CORE); return true; } PS.S.pouch.push(el); PS.S.seen['el:' + el] = true; emit('pouch'); save(); return true; }
  function takeFromPouch(index) { const id = PS.S.pouch.splice(index, 1)[0]; emit('pouch'); save(); return id; }
  // give an element core to a plant: it takes on the element (look, type, name), learns its moves and gets stat XP
  function absorb(s, el) {
    const E = D.ELEMENT_INFO[el]; if (!E) return null;
    s.infused = s.infused || {};
    const before = s.infused[el] || 0, beforeTier = elTier(before), was = s.element;
    s.infused[el] = before + 1;
    const afterTier = elTier(s.infused[el]);
    s.element = el;
    s.happy = clamp(s.happy + 6, 0, 100);
    // elements stay worth collecting as a plant grows: XP scales with the stat's level (x1 at Lv 0, x2 at Lv 20, x3.5 at Lv 50)
    const gives = {};
    for (const [st, v] of Object.entries(E.gives)) gives[st] = v > 0 && s.stats[st] ? Math.round(v * (1 + s.stats[st].lv / 20)) : v;
    const res = gain(s, gives);
    const unlocked = afterTier > beforeTier ? E.moves.slice(beforeTier, afterTier) : [];
    return { id: el, name: E.name, gives, ups: res.ups, unlocked, evolved: res.evolved, changed: was !== el, count: s.infused[el] };
  }
  function feed(s, fruitId) {
    const f = D.FRUITS[fruitId]; if (!f) return null;
    s.happy = clamp(s.happy + (f.happy || 4), 0, 100);
    s.energy = clamp(s.energy + 15, 0, 100);
    return gain(s, f.gives);
  }
  function pet(s) { s.happy = clamp(s.happy + D.GROWTH.petHappy, 0, 100); save(); }
  function roughHandle(s) { s.happy = clamp(s.happy - 4, 0, 100); save(); }

  // ---------------- unlocks (new plants come from races and battles) ----------------
  const isUnlocked = sp => !!PS.S.unlocked[sp];
  const unlockedList = () => Object.keys(D.PLANTS).filter(isUnlocked);
  // unlock a species (once) and always hand over a seed packet of it
  function unlockSpecies(sp, source) {
    if (!D.PLANTS[sp]) return null;
    const isNew = !PS.S.unlocked[sp];
    if (isNew) PS.S.unlocked[sp] = Date.now();
    const egg = addEgg('normal', source || 'Reward', sp);
    if (isNew) emit('unlock', { species: sp, isNew, source });
    save(); return { species: sp, isNew, egg };
  }
  // a reward key from data.js UNLOCKS (first race win, league cleared, boss beaten). Pays out once per key.
  function reward(key, source) {
    const R = PS.S.progress.rewards; if (R[key]) return null;
    let sp = D.UNLOCKS[key]; if (!sp) return null;
    R[key] = Date.now();
    if (typeof sp === 'string' && sp.startsWith('map:')) { const res = giveMap(sp.slice(4), source); return res ? { map: res.id } : null; }
    if (sp === 'starter') sp = D.STARTERS.find(x => !isUnlocked(x)) || D.STARTERS.find(x => x !== PS.S.starter) || 'peashooter';
    return unlockSpecies(sp, source);
  }
  // has this reward key's goal already been reached? (a first race win, a league or cup cleared, a boss beaten, a Survival map won)
  function rewardDone(key) {
    const P = PS.S.progress || {}, i = key.indexOf(':'), kind = key.slice(0, i), rest = key.slice(i + 1);
    if (kind === 'race') { const a = (P.races || {})[rest], b = P.raceExtra && P.raceExtra.series && P.raceExtra.series[rest]; return !!((a && a.wins) || (b && b.wins)); }
    if (kind === 'league' || kind === 'cup') { const L = (P.leagues || {})[rest]; return !!(L && L.cleared); }
    if (kind === 'boss') { const b = P.battleExtra && P.battleExtra.bosses && P.battleExtra.bosses[rest]; return !!(b && b.wins); }
    if (kind === 'survival') { const v = P.survival && P.survival[rest]; return !!(v && v.wins); }
    if (kind === 'evolve') { const i2 = rest.lastIndexOf('-'), sp = rest.slice(0, i2), st = +rest.slice(i2 + 1); return PS.S.sprouts.some(x => x.species === sp && (x.stage | 0) >= st); }
    return false;
  }
  // catch-up: rewards added in an update for goals a player had ALREADY reached never paid out (e.g. Split Pea for a Seedling Cup won
  // before Split Pea existed). On load, hand over every plant and map whose goal is done but which the player doesn't have yet.
  function catchUpRewards() {
    const R = PS.S.progress.rewards || (PS.S.progress.rewards = {}), got = [];
    const all = Object.entries(D.UNLOCKS).concat((D.SURVIVAL || []).map(M => ['survival:' + M.id, M.reward]));
    for (const [key, what] of all) {
      if (!rewardDone(key)) continue;
      if (what === 'starter') { if (!R[key]) R[key] = Date.now(); continue; }
      if (typeof what === 'string' && what.startsWith('map:')) { const id = what.slice(4); if (giveMap(id, 'Catch-up gift')) got.push({ map: id }); R[key] = R[key] || Date.now(); continue; }
      if (!D.PLANTS[what] || isUnlocked(what)) { R[key] = R[key] || Date.now(); continue; }
      R[key] = Date.now(); const res = unlockSpecies(what, `${unlockHint(what)} (you'd already done it!)`); if (res) got.push({ species: what, egg: res.egg });
    }
    if (got.length) save();
    return got;
  }
  // what unlocks a locked species (for the shop and the almanac): "Win the Front Yard Dash (Pro)"
  function unlockHint(sp) {
    const key = Object.keys(D.UNLOCKS).find(k => D.UNLOCKS[k] === sp) || ((D.SURVIVAL || []).find(M => M.reward === sp) ? 'survival:' + D.SURVIVAL.find(M => M.reward === sp).id : null);
    if (!key) return D.STARTERS.includes(sp) ? 'Win your first race or clear the Front Lawn League' : 'Keep playing to find it';
    return rewardHint(key);
  }
  // what a reward key asks for, in words: "Win the Front Yard Dash (Pro)"
  function rewardHint(key) {
    const [kind, rest] = key.split(':');
    if (kind === 'survival') { const M = (D.SURVIVAL || []).find(m => m.id === rest); return `Win ${M ? M.name : 'a Survival map'} (Battle › Survival)`; }
    if (kind === 'race') { const i = rest.lastIndexOf('-'), id = rest.slice(0, i), tier = +rest.slice(i + 1), R = D.RACES.find(r => r.id === id), T = D.RACE_TIERS[tier]; return `Win the ${R ? R.name : (PS.raceNames && PS.raceNames[id]) || 'race'} (${T ? T.name : ''})`; }
    if (kind === 'league') { const L = D.LEAGUES.find(l => l.id === rest); return `Clear the ${L ? L.name : 'league'}`; }
    if (kind === 'cup') { const L = D.PLANT_LEAGUES.find(l => l.id === rest); return `Win the ${L ? L.name : 'cup'}`; }
    if (kind === 'boss') return `Beat ${(PS.bossNames && PS.bossNames[rest]) || 'a Zomboss'}`;
    if (kind === 'evolve') { const i2 = rest.lastIndexOf('-'), P = D.PLANTS[rest.slice(0, i2)]; return P ? `Evolve a ${P.name} into a ${P.names[+rest.slice(i2 + 1)]}` : 'Evolve a plant'; }
    return 'Keep playing to find it';
  }
  // the first plant of a new game: unlock it and give its seed packet
  function pickStarter(sp) { if (!D.STARTERS.includes(sp) || PS.S.starter) return null; PS.S.starter = sp; return unlockSpecies(sp, 'Your first plant'); }

  // ---------------- fusion ----------------
  const items = () => PS.S.fitems || (PS.S.fitems = {});
  function addItem(id, n) { if (!D.FUSION_ITEMS[id]) return false; items()[id] = (items()[id] || 0) + (n || 1); PS.S.seen['fi:' + id] = true; emit('items'); save(); return true; }
  const randomItem = () => pick(Object.keys(D.FUSION_ITEMS));
  const canFuse = s => !!s && !s.fuse && !s.npc;
  // why two plants can't fuse right now ('' = they can)
  function fuseBlock(a, b) {
    if (!a || !b) return 'Pick two plants.';
    if (a === b) return 'Pick two different plants.';
    if (a.fuse || b.fuse) return 'A fused plant can\'t be fused again.';
    if (PS.S.coins < D.FUSION.costPlants) return `You need ${D.FUSION.costPlants} coins.`;
    return '';
  }
  // plant + plant: both go into the Fusion Lab and one new plant comes out. It keeps the first plant's body, gets the second
  // plant's trait (look, type, signature moves), the best level of each stat, every element either had, and a name like "Sunshooter".
  function fusePlants(aId, bId) {
    const A = get(aId), B = get(bId);
    if (fuseBlock(A, B) || !spend(D.FUSION.costPlants)) return null;
    const s = JSON.parse(JSON.stringify(A));
    s.id = newId('s'); s.fuse = { with: B.species, stage: B.stage | 0 };
    for (const st of D.STATS) s.stats[st] = { lv: Math.max(A.stats[st].lv, B.stats[st].lv), xp: 0 };
    for (const [el, n] of Object.entries(B.infused || {})) s.infused[el] = Math.max(s.infused[el] || 0, n);
    s.element = A.element || B.element || null;
    s.stage = Math.max(A.stage, B.stage);
    s.happy = 100; s.energy = 100; s.fusedAt = Date.now(); s.fusedFrom = [A.name, B.name];
    if (!s.look.skin && B.look && B.look.skin) s.look.skin = B.look.skin;
    if (B.look && B.look.shiny) s.look.shiny = true;
    for (const k of ['races', 'raceWins', 'battles', 'battleWins']) s.record[k] = (A.record[k] || 0) + (B.record[k] || 0);
    delete s.moveset; delete s.home;
    const list = PS.S.sprouts, i = list.indexOf(A);
    list.splice(i, 1, s); list.splice(list.indexOf(B), 1);
    if (PS.S.activeId === A.id || PS.S.activeId === B.id) PS.S.activeId = s.id;
    checkEvolve(s);
    PS.S.totals.fusions = (PS.S.totals.fusions || 0) + 1;
    emit('fusion', { s }); emit('sprout:update', { s }); save();
    return s;
  }
  // plant + fusion item: the item is used up; the plant gets its look, a type, a move and some stat levels
  function fuseItem(aId, itemId) {
    const A = get(aId), I = D.FUSION_ITEMS[itemId];
    if (!canFuse(A) || !I || !items()[itemId] || !spend(D.FUSION.costItem)) return null;
    if (--items()[itemId] <= 0) delete items()[itemId];
    A.fuse = { item: itemId }; A.fusedAt = Date.now();
    for (const [st, n] of Object.entries(I.stats || {})) if (A.stats[st]) A.stats[st].lv = Math.min(D.GROWTH.maxLevel, A.stats[st].lv + n);
    A.happy = clamp(A.happy + 15, 0, 100);
    delete A.moveset;
    checkEvolve(A);
    PS.S.totals.fusions = (PS.S.totals.fusions || 0) + 1;
    emit('items'); emit('fusion', { s: A }); emit('sprout:update', { s: A }); save();
    return A;
  }
  // a preview of a fusion (not saved) for the lab: { look, name, els, moves }
  function fusePreview(a, b, itemId) {
    if (!a) return null;
    const s = JSON.parse(JSON.stringify(a));
    if (itemId) s.fuse = { item: itemId }; else if (b) { s.fuse = { with: b.species, stage: b.stage | 0 }; s.stage = Math.max(a.stage, b.stage); s.element = a.element || b.element || null; }
    return { s, look: lookOf(s), name: formInfo(s).name, els: elementsOf(s), moves: fusionMoves(s) };
  }

  // ---------------- coins & shop ----------------
  function addCoins(n, why) { n = Math.max(0, Math.round(n)); if (!n) return 0; PS.S.coins += n; PS.S.totals.coinsEarned += n; emit('coins', { n, why }); save(); return n; }
  function spend(n) { if (PS.S.coins < n) return false; PS.S.coins -= n; emit('coins', { n: -n }); save(); return true; }
  function buy(kind, id) {
    if (kind === 'fruit') { const f = D.FRUITS[id]; if (!f || !spend(f.price)) return false; PS.S.fruits[id] = (PS.S.fruits[id] || 0) + 1; emit('pouch'); save(); return true; }
    if (kind === 'seed') { const P = D.PLANTS[id]; if (!P || !isUnlocked(id) || !spend(P.price)) return false; addEgg('normal', 'Bought at the shop', id); return true; }
    if (kind === 'special') { const e = D.SEEDS[id]; if (!e || !e.price || !spend(e.price)) return false; addEgg(id, 'Bought at the shop'); return true; }
    if (kind === 'fitem') { const I = D.FUSION_ITEMS[id]; if (!I || !spend(I.price)) return false; addItem(id); return true; }
    if (kind === 'core') { const c = D.CORE_PRICES[id]; if (!c || pouchFull() || !spend(c)) return false; addToPouch(id); return true; }
    if (kind === 'map') return buyMap(id).ok;
    return false;
  }
  function useFruit(id) { if (!PS.S.fruits[id]) return false; PS.S.fruits[id]--; if (!PS.S.fruits[id]) delete PS.S.fruits[id]; emit('pouch'); save(); return true; }
  function addFruit(id, n) { PS.S.fruits[id] = (PS.S.fruits[id] || 0) + (n || 1); emit('pouch'); save(); }
  // throw fruit away from the tray; returns how many went
  function discardFruit(id, n) { const have = PS.S.fruits[id] || 0, k = Math.max(0, Math.min(have, Math.floor(n || 1))); if (!k) return 0; PS.S.fruits[id] = have - k; if (!PS.S.fruits[id]) delete PS.S.fruits[id]; emit('pouch'); save(); return k; }
  // Fruit for a tree branch. Any fruit can grow; cheaper ones are more common, and fruit already hanging (hanging = list of
  // fruit ids on the tree now) is less likely to grow again, so a tree never fills up with one kind.
  function treeFruit(hanging) {
    const n = {}; for (const k of hanging || []) n[k] = (n[k] || 0) + 1;
    return weighted(Object.keys(D.FRUITS).map(k => [k, Math.pow(1 / D.FRUITS[k].price, D.TREE.exp) / (1 + D.TREE.repeat * (n[k] || 0))]));
  }
  // odds of each fruit on a fresh tree (for the parent / info screens)
  function treeOdds() { const w = Object.keys(D.FRUITS).map(k => [k, Math.pow(1 / D.FRUITS[k].price, D.TREE.exp)]), t = w.reduce((a, x) => a + x[1], 0); return w.map(([k, v]) => ({ id: k, p: v / t })); }

  // random garden drops: returns {type:'coin'|'xp'|'shard'|'fitem', amount, stat?, el?, id?}
  function rollDrop(area) {
    const tbl = D.DROPS, total = Object.values(tbl).reduce((a, d) => a + d.weight, 0);
    let r = Math.random() * total, key = 'coin';
    for (const [k, d] of Object.entries(tbl)) { r -= d.weight; if (r <= 0) { key = k; break; } }
    const d = tbl[key], mult = 1 + (PS.S.bestTier || 0) * 0.5;
    if (key === 'xp') return { type: 'xp', amount: irand(d.min, d.max), stat: pick(D.STATS) };
    if (key === 'shard') { const list = D.AREA_ELEMENTS[area || PS.S.area] || D.AREA_ELEMENTS.frontyard; return { type: 'shard', el: pick(list)[0], amount: 1 }; }
    if (key === 'fitem') return { type: 'fitem', id: randomItem(), amount: 1 };
    return { type: 'coin', big: key === 'bigcoin', amount: Math.round(irand(d.min, d.max) * mult) };
  }

  // ---------------- selling plants ----------------
  function sellPrice(s) {
    const S = D.SELL; let p = S.base + totalLevels(s) * S.perLevel + (S.stage[s.stage] || 0);
    if (s.fuse) p += S.fused;
    if (s.look && s.look.skin) p += S.skin;
    return Math.round(p);
  }
  const canSell = s => !!s && PS.S.sprouts.includes(s) && PS.S.sprouts.length > 1;
  // removes the plant for good and pays for it. Returns the coins paid (0 = not sold: you must keep at least one plant)
  function sellSprout(id) {
    const s = get(id); if (!canSell(s)) return 0;
    const price = sellPrice(s);
    PS.S.sprouts.splice(PS.S.sprouts.indexOf(s), 1);
    if (PS.S.activeId === id) PS.S.activeId = PS.S.sprouts[0].id;
    PS.S.totals.sold = (PS.S.totals.sold || 0) + 1;
    addCoins(price, 'sell');
    emit('sprout:sold', { s, price }); emit('sprout:update', { s: active() }); save();
    return price;
  }

  // ---------------- gumball machine ----------------
  function weighted(list) { const tot = list.reduce((a, x) => a + x[1], 0); let r = Math.random() * tot; for (const x of list) { r -= x[1]; if (r <= 0) return x[0]; } return list[list.length - 1][0]; }
  const inArea = a => 'the ' + ((D.AREAS[a] || {}).name || 'Garden');
  const randomUnlocked = () => pick(unlockedList().length ? unlockedList() : D.STARTERS);
  // Spends the price and gives one prize. Returns null (unknown tier), {ok:false, reason:'coins'} or
  // {ok:true, tier, color (0..7 gumball colour), type, id?, n?, title, text}
  function gumball(tier) {
    const G = D.GUMBALL[tier]; if (!G) return null;
    if (!spend(G.price)) return { ok: false, reason: 'coins' };
    const mega = tier === 'mega', type = weighted(G.prizes);
    let out = null;
    const coins = n => { const got = addCoins(n, 'gumball'); return { type: 'coins', n: got, title: `${got} coins`, text: 'Coins spill out of the gumball!' }; };
    const els = Object.keys(D.ELEMENT_INFO);
    switch (type) {
      case 'coins': out = coins(irand(G.coins[0], G.coins[1])); break;
      case 'fruit': {
        const got = [treeFruit([]), treeFruit([]), treeFruit([])].map(k => (k === 'goldfruit' || k === 'plantfood' ? 'apple' : k));
        got.forEach(k => { PS.S.fruits[k] = (PS.S.fruits[k] || 0) + 1; }); emit('pouch');
        out = { type, id: got[0], n: 3, title: '3 fruits', text: got.map(k => D.FRUITS[k].name).join(', ') + '. Find them in the Garden fruit tray.' }; break;
      }
      case 'goldfruit': { const n = mega ? 2 : 1, id = Math.random() < 0.5 ? 'plantfood' : 'goldfruit'; PS.S.fruits[id] = (PS.S.fruits[id] || 0) + n; emit('pouch'); out = { type: 'goldfruit', id, n, title: `${n} ${D.FRUITS[id].name}`, text: 'XP to every stat. Find it in the Garden fruit tray.' }; break; }
      case 'shard': { const a = pick(els), b = pick(els); addShard(a, 1); addShard(b, 1); out = { type, id: a, n: 2, title: '2 element shards', text: `${D.ELEMENT_INFO[a].name} and ${D.ELEMENT_INFO[b].name}. Collect 3 of one element to make a core.` }; break; }
      case 'core': { const el = pick(els); addToPouch(el); out = { type, id: el, title: `A ${D.ELEMENT_INFO[el].name} core!`, text: 'A complete element! Give it to a plant in the Garden.' }; break; }
      case 'seed': { const sp = randomUnlocked(), e = addEgg('normal', 'Gumball machine', sp); out = { type: 'egg', id: sp, egg: e, title: `${D.PLANTS[sp].name} seeds`, text: `A seed packet! It's waiting in ${inArea(e.area)}.` }; break; }
      case 'fitem': { const id = randomItem(); addItem(id); out = { type, id, title: D.FUSION_ITEMS[id].name + '!', text: 'A fusion item! Fuse it onto a plant in the Shop\'s Fusion Lab.' }; break; }
      case 'specialseed': { const k = pick(D.SPECIAL_SEEDS), e = addEgg(k, 'Gumball machine'); out = { type: 'egg', id: e.species, egg: e, title: D.SEEDS[k].name + '!', text: `A special seed packet! It's waiting in ${inArea(e.area)}.` }; break; }
      case 'goldenseed': case 'rainbowseed': { const k = type === 'goldenseed' ? 'golden' : 'rainbow', e = addEgg(k, 'Gumball machine'); out = { type: 'egg', id: e.species, egg: e, title: D.SEEDS[k].name + '!', text: `A super special seed packet! It's waiting in ${inArea(e.area)}.` }; break; }
      default: out = coins(irand(G.coins[0], G.coins[1]));
    }
    PS.S.totals.gumballs = (PS.S.totals.gumballs || 0) + 1;
    emit('items'); save();
    return Object.assign({ ok: true, tier, color: irand(0, 7) }, out);
  }

  // ---------------- seed packets ----------------
  // kind: a D.SEEDS key ('normal' for a plain packet). species: what grows (special packets pick a random unlocked plant).
  function addEgg(kind, source, species) {
    if (!D.SEEDS[kind]) kind = 'normal';
    const sp = D.PLANTS[species] ? species : randomUnlocked();
    const egg = { id: newId('e'), kind, species: sp, source: source || '', area: PS.S.area, taps: 0 };
    PS.S.eggs.push(egg); emit('egg:new', { egg }); save(); return egg;
  }
  function hatchEgg(eggId) {
    const i = PS.S.eggs.findIndex(e => e.id === eggId); if (i < 0) return null;
    const egg = PS.S.eggs.splice(i, 1)[0];
    const s = makeSprout({ kind: egg.kind, species: egg.species, area: egg.area });
    PS.S.sprouts.push(s);
    const hw = (D.SEEDS[egg.kind] || {}).hatchWith;
    if (hw) { const el = hw === 'random' ? pick(Object.keys(D.ELEMENT_INFO)) : hw; absorb(s, el); s.bornWith = el; }
    if (!PS.S.activeId) PS.S.activeId = s.id;
    PS.S.seen['plant:' + s.species] = true;
    emit('egg:hatch', { egg, s }); save(); return s;
  }
  // room outside in a garden (D.GROWTH.gardenMax plants; the rest wait in its house)
  const outsideIn = (area, but) => PS.S.sprouts.filter(s => s !== but && s.area === area && !s.home).length;
  const gardenFull = (area, but) => outsideIn(area, but) >= D.GROWTH.gardenMax;
  // a plant moving to a full garden goes straight into that garden's house
  function moveSprout(s, area) { if (!D.AREAS[area]) return; s.area = area; delete s.home; if (gardenFull(area, s)) s.home = true; emit('sprout:update', { s }); save(); }
  // each garden has a little house where plants can rest (s.home = true; no field = playing outside)
  const homeName = area => mapInfo(area).home || 'House';

  // ---------------- garden maps (the look each garden wears: buy or earn more, and swap them between gardens) ----------------
  // PS.S.maps = { owned: { id: time }, use: { garden: mapId } }; a garden with no entry wears its own map.
  function mapsOf() { const S = PS.S; if (!isObj(S.maps)) S.maps = {}; if (!isObj(S.maps.owned)) S.maps.owned = {}; if (!isObj(S.maps.use)) S.maps.use = {}; return S.maps; }
  function mapOf(area) { const u = PS.S && PS.S.maps && PS.S.maps.use && PS.S.maps.use[area]; return D.GARDEN_MAPS[u] ? u : area; }
  const mapInfo = area => D.GARDEN_MAPS[mapOf(area)] || D.GARDEN_MAPS.frontyard;
  const ownsMap = id => !!D.GARDEN_MAPS[id] && (D.GARDEN_MAPS[id].price === 0 || !!(PS.S.maps && PS.S.maps.owned && PS.S.maps.owned[id]));
  const gardenWearing = id => D.AREA_ORDER.find(a => mapOf(a) === id) || null;
  function giveMap(id, source) {
    if (!D.GARDEN_MAPS[id] || ownsMap(id)) return null;
    mapsOf().owned[id] = Date.now(); emit('map:new', { id, source: source || '' }); save(); return { id };
  }
  function buyMap(id) {
    const M = D.GARDEN_MAPS[id];
    if (!M || ownsMap(id)) return { ok: false, why: 'You already have this map.' };
    if (!spend(M.price)) return { ok: false, why: `You need ${M.price} coins.` };
    mapsOf().owned[id] = Date.now(); emit('map:new', { id, source: 'Shop' }); save(); return { ok: true };
  }
  // put a map on a garden; if another garden is wearing it, the two gardens swap maps
  function setMap(area, id) {
    if (!D.AREAS[area] || !ownsMap(id)) return false;
    const M = mapsOf(), was = mapOf(area);
    if (was === id) return true;
    const other = D.AREA_ORDER.find(a => a !== area && mapOf(a) === id);
    M.use[area] = id; if (other) M.use[other] = was;
    for (const a of D.AREA_ORDER) if (M.use[a] === a) delete M.use[a];
    emit('map:set', { area, id, other }); save(); return true;
  }
  // a garden's name, blurb, prop colours, pond and visiting element sprites all come from the map it wears (baseName: the
  // garden's own name, for things like race series that are named after places, not gardens)
  for (const a of Object.keys(D.AREAS)) {
    const A = D.AREAS[a]; A.baseName = A.name;
    for (const k of ['name', 'blurb', 'theme', 'water']) Object.defineProperty(A, k, { get: () => mapInfo(a)[k], enumerable: true, configurable: true });
  }
  const BASE_ELS = Object.assign({}, D.AREA_ELEMENTS);
  for (const a of Object.keys(D.AREAS)) Object.defineProperty(D.AREA_ELEMENTS, a, { get: () => mapInfo(a).els || BASE_ELS[mapOf(a)] || BASE_ELS[a], enumerable: true, configurable: true });
  function renameSprout(s, name) { s.name = String(name || '').trim().slice(0, 12) || s.name; emit('sprout:update', { s }); save(); }
  const get = id => PS.S.sprouts.find(s => s.id === id);
  const active = () => get(PS.S.activeId) || PS.S.sprouts[0] || null;
  function setActive(id) { PS.S.activeId = id; save(); emit('sprout:update', { s: get(id) }); }

  // ---------------- races ----------------
  const raceKey = (id, tier) => `${id}-${tier}`;
  function raceProgress(id, tier) { return PS.S.progress.races[raceKey(id, tier)] || { runs: 0, wins: 0, best: null }; }
  function raceUnlocked(id, tier) {
    const r = D.RACES.find(x => x.id === id); if (!r) return false;
    if (tier > 0 && !raceProgress(id, tier - 1).wins) return false;
    if (!r.unlock) return true;
    return raceProgress(r.unlock.race, r.unlock.tier).wins > 0;
  }
  // race against zombies (default) or other gardeners' plants
  const raceVs = () => (PS.S.prefs && PS.S.prefs.raceVs === 'plants' ? 'plants' : 'zombies');
  function setRaceVs(v) { PS.S.prefs = PS.S.prefs || {}; PS.S.prefs.raceVs = v === 'plants' ? 'plants' : 'zombies'; save(); }
  const RACE_ZOMBIES = ['basic', 'flag', 'conehead', 'football', 'polevault', 'imp', 'duckytube', 'balloon', 'cowboy', 'digger', 'pirate', 'disco',
    'zomboni', 'bobsled', 'dolphinrider', 'jetpack', 'seagull', 'camel', 'chicken', 'surfer'].filter(z => D.ZOMBIES[z]);
  // a look for a rival racer (r = a seeded 0..1 random): a zombie, or another gardener's plant (never a legendary one).
  // side: 'zombies' | 'plants' (each race series has its own side)
  function rivalLook(r, tier, side) {
    if ((side || 'zombies') === 'plants') { const ids = Object.keys(D.PLANTS).filter(id => !D.PLANTS[id].legendary), sp = ids[Math.floor(r() * ids.length)]; const L = { species: sp, stage: Math.min(2, tier + (r() < 0.3 ? 1 : 0)) }; if (tier > 0 && r() < 0.5) L.element = Object.keys(D.ELEMENT_INFO)[Math.floor(r() * 11)]; return { look: L, name: D.NAMES[Math.floor(r() * D.NAMES.length)] }; }
    const z = RACE_ZOMBIES[Math.floor(r() * RACE_ZOMBIES.length)];
    return { look: { zombie: z }, name: D.ZOMBIES[z].name };
  }
  function raceRivals(id, tier) {
    const T = D.RACE_TIERS[tier], R = D.RACES.findIndex(x => x.id === id);
    let seed = (R + 1) * 97 + tier * 13; const sr = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const used = new Set();
    return [0, 1, 2].map(i => {
      const base = T.rating[0] + (T.rating[1] - T.rating[0]) * (i / 2);
      const rt = () => +Math.min(T.rating[1], base * (0.8 + sr() * 0.4)).toFixed(2); // never stronger than the tier's stated range
      let rl = rivalLook(sr, tier, 'zombies'); for (let k = 0; k < 4 && used.has(JSON.stringify(rl.look)); k++) rl = rivalLook(sr, tier, 'zombies'); used.add(JSON.stringify(rl.look));
      return { name: rl.name, look: rl.look, rating: { run: rt(), swim: rt(), climb: rt(), fly: rt(), stamina: rt() }, cheer: T.cheerSkill };
    });
  }
  // place: 0 = 1st. Applies coins, XP, progress, rewards. Returns a summary for the results screen.
  function finishRace(s, id, tier, place, timeSec) {
    const T = D.RACE_TIERS[tier], ri = D.RACES.findIndex(x => x.id === id), R = D.RACES[ri];
    const key = raceKey(id, tier), p = PS.S.progress.races[key] || { runs: 0, wins: 0, best: null };
    const firstWin = place === 0 && !p.wins;
    p.runs++; if (place === 0) p.wins++; if (timeSec && (!p.best || timeSec < p.best)) p.best = +timeSec.toFixed(2);
    PS.S.progress.races[key] = p;
    const coins = addCoins(T.coins * (1 + ri * 0.15) * D.RACE_PLACE_SHARE[place], 'race');
    const mixTotal = Object.values(R.mix).reduce((a, b) => a + b, 0), gives = {};
    for (const [seg, w] of Object.entries(R.mix)) { const st = D.RACE_STAT[seg]; gives[st] = (gives[st] || 0) + T.xp * (w / mixTotal) * 2.5 * (place === 0 ? 1 : 0.6); }
    gives.stamina = (gives.stamina || 0) + T.xp * 0.5;
    const res = gain(s, gives);
    s.record.races++; if (place === 0) s.record.raceWins++;
    PS.S.totals.races++; if (place === 0) PS.S.totals.raceWins++;
    let egg = null, unlock = null, item = null;
    if (firstWin) {
      unlock = reward('race:' + key, `${R.name} ${T.name}`); egg = unlock ? unlock.egg : null;
      if (tier === 2 && id === 'grand') egg = addEgg('golden', `${R.name} ${T.name}`);
      PS.S.bestTier = Math.max(PS.S.bestTier, tier + 1);
    }
    if (place === 0 && Math.random() < 0.12) { item = randomItem(); addItem(item); } // a lucky fusion item for the winner
    save();
    return { coins, gives, ups: res.ups, evolved: res.evolved, egg, unlock, item, firstWin, unlockedNext: firstWin };
  }

  // ---------------- battles ----------------
  function leagueProgress(id) { return PS.S.progress.leagues[id] || { beaten: [false, false, false], cleared: false }; }
  function leagueUnlocked(id) { const L = D.LEAGUES.find(l => l.id === id) || D.PLANT_LEAGUES.find(l => l.id === id); return !!L && (!L.unlock || leagueProgress(L.unlock).cleared); }
  // spread a total level over the stats by weights (and the zombie / species bias)
  function spreadLevels(s, lv, bias) {
    const w = { swim: 1, fly: 1, run: 1, power: 1.1, stamina: 1.2 };
    for (const [k, v] of Object.entries(bias || {})) if (w[k]) w[k] *= Math.pow(v, 2);
    const wt = Object.values(w).reduce((a, b) => a + b, 0);
    for (const st of D.STATS) s.stats[st].lv = Math.min(D.GROWTH.maxLevel, Math.round(lv * w[st] / wt));
  }
  // a zombie fighter, sprout-shaped so movesOf / battleStats / lookOf work on it
  function makeZombie(kind, lv, name, look) {
    const Z = D.ZOMBIES[kind] || D.ZOMBIES.basic;
    const s = { id: 'npc-z-' + kind + lv, npc: true, zombie: D.ZOMBIES[kind] ? kind : 'basic', name: name || Z.name, area: 'frontyard', look: Object.assign({}, look || {}),
      stats: blankStats(), stage: 0, infused: {}, element: null, fuse: null, happy: 80, energy: 100, record: {} };
    spreadLevels(s, lv, Z.bias);
    return s;
  }
  // a plant fighter for Plant Duels and the Tower
  function makePlantNPC(o) {
    const s = { id: 'npc-p-' + o.species + o.lv, npc: true, name: o.name || D.PLANTS[o.species].name, species: D.PLANTS[o.species] ? o.species : 'peashooter', area: 'frontyard',
      look: o.skin ? { skin: o.skin } : {}, stats: blankStats(), stage: Math.max(0, Math.min(2, o.stage | 0)), infused: {}, element: null, fuse: o.fuse ? Object.assign({ stage: o.stage | 0 }, o.fuse) : null, happy: 80, energy: 100, record: {} };
    if (o.element) { s.element = o.element; s.infused[o.element] = o.stage >= 2 ? 3 : o.stage + 1; }
    spreadLevels(s, o.lv, specOf(s).bias);
    return s;
  }
  // league opponent (Zombie leagues or Plant Duel cups)
  function makeNPC(leagueId, index) {
    const Z = D.LEAGUES.find(l => l.id === leagueId);
    if (Z) { const o = Z.opponents[index]; return makeZombie(o.zombie, o.lv, o.name, o.look); }
    const P = D.PLANT_LEAGUES.find(l => l.id === leagueId); if (!P) return null;
    return makePlantNPC(P.opponents[index]);
  }
  // (battle rewards are paid in battle.js by one function, grant(), using D.BATTLE's prize settings)

  // ---------------- boot ----------------
  const PS = window.PS = {
    D, S: load() || fresh(), save, saveNow, reset, lockSaves, on, emit, clock, players: playersApi,
    get loadNote() { return loadNote; }, clearLoadNote() { loadNote = null; },
    backup: { exportBackup, decodeBackup, importBackup, autoBackups, restoreAuto, rescued },
    util: { rand, irand, pick, clamp, newId, weighted },
    state: {
      makeSprout, addXp, gain, happyBonus, totalLevels, domStat, formInfo, fusionForm, stageName, movesOf, knownMoves, elementsOf, battleStats,
      learnedMoves, defaultMoves, setMoves, moveFit, bestMoves, MAX_MOVES, fusionMoves, elementMoves, levelMoves,
      raceRating, raceBonus, staminaRating, lookOf, absorb, feed, pet, roughHandle,
      canCatch, addShard, addToPouch, takeFromPouch, pouchFull, addCoins, spend, buy, useFruit, addFruit, discardFruit, treeFruit, treeOdds, rollDrop,
      addEgg, hatchEgg, moveSprout, outsideIn, gardenFull, homeName, renameSprout, get, active, setActive, mapOf, mapInfo, ownsMap, gardenWearing, giveMap, buyMap, setMap,
      rewardDone, rewardHint, catchUpRewards, raceProgress, raceUnlocked, raceRivals, finishRace, raceVs, setRaceVs, rivalLook,
      leagueProgress, leagueUnlocked, makeNPC, makeZombie, makePlantNPC, checkEvolve, evolveTo, esc,
      sellPrice, canSell, sellSprout, gumball, items, addItem, randomItem,
      isUnlocked, unlockedList, unlockSpecies, reward, unlockHint, pickStarter,
      canFuse, fuseBlock, fusePlants, fuseItem, fusePreview,
    },
  };
  lastNight = clock.isNight();
  pruneSnaps();
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
  window.addEventListener('pagehide', saveNow);
})();
