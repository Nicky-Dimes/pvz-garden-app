// event.js — P vs. Z Garden: the Halloween event (October 15 – November 3, local date, or forced on/off from Parent tools).
// While it's on, zombie attacks in the Garden become Trick-or-Treat raids: costumed zombies (art-event.js) that drop CANDY when
// they're beaten. Candy is spent in the Shop's Halloween tab on costumes for plants, garden decorations, Candy Bags and the
// event's prize plant (a Greater Rindguard Pipspout). Candy, costumes and decorations are kept after the event (and next year).
// Save: optional PS.S.event = { year, candy, total, bought: { id: n }, intro: year, won: n } (created lazily; old saves load as-is).
// Plants wear a costume as a Halloween value of look.skin ('hwitch' | 'hbat' | 'hcandy'; the prize plant is born 'hjack').
// API: PS.event.active(), info(), force(true | false | null), candy(), addCandy(n, why), shop(), buy(id), canDress(s), dress(s, id),
//      wearing(id), free(id), owns(id), openBag(), raidCandy(boss), decor() (bought decorations, shown in every garden).
// Events: 'event' {active} when the switch changes · 'candy' {n, total, why} · 'event:buy' {id}.
(function () {
  'use strict';
  if (!window.PS || !PS.D) return;
  const D = PS.D, ST = PS.state;
  const emit = (n, e) => { try { PS.emit(n, e || {}); } catch (err) { /* optional */ } };
  const save = () => { try { PS.save(); } catch (e) { /* optional */ } };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const irand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const FORCE_KEY = 'pvzg:eventForce';

  // ---------------- the dates ----------------
  // Oct 15 – Nov 3 (inclusive), by the device's own clock
  function inSeason(d) { const m = d.getMonth(), day = d.getDate(); return (m === 9 && day >= 15) || (m === 10 && day <= 3); }
  function forced() { try { const v = localStorage.getItem(FORCE_KEY); return v === '1' ? true : v === '0' ? false : null; } catch (e) { return null; } }
  let last = null, memo = { at: -1e9, v: false };
  // (the garden asks every frame: the answer is kept for 5 seconds, so there's no storage read or Date object per frame)
  function active() {
    const now = Date.now(); if (now - memo.at < 5000) return memo.v;
    const f = forced(); memo.at = now; memo.v = f != null ? f : inSeason(new Date()); return memo.v;
  }
  // Parent tools: true = on, false = off, null = follow the calendar (a device setting, never in the save)
  function force(on) {
    try { if (on == null) localStorage.removeItem(FORCE_KEY); else localStorage.setItem(FORCE_KEY, on ? '1' : '0'); } catch (e) { /* blocked */ }
    memo.at = -1e9; check(); return active();
  }
  function check() { const a = active(); if (a !== last) { const was = last; last = a; if (was !== null) emit('event', { active: a }); } return a; }
  setInterval(() => { if (PS.S) check(); }, 60000);
  function info() {
    const now = new Date(), y = now.getFullYear(), end = new Date(y, 10, 3, 23, 59, 59);
    const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));
    return { id: 'halloween', name: 'Halloween', active: active(), forced: forced(), inSeason: inSeason(now), year: now.getFullYear(), ends: end, daysLeft: inSeason(now) ? daysLeft : null, candy: candy() };
  }

  // ---------------- registries (always, so saved plants and seed packets draw and name themselves after the event) ----------------
  D.SKINS = D.SKINS || {};
  Object.assign(D.SKINS, { hjack: { name: 'Jack-o\'-Lantern' }, hwitch: { name: 'Witch Hat' }, hbat: { name: 'Bat Wings' }, hcandy: { name: 'Candy Corn' } });
  D.SEEDS = D.SEEDS || {};
  if (!D.SEEDS.hjack) D.SEEDS.hjack = { name: 'Jack-o\'-Lantern Seed Packet', skin: 'hjack', taps: 6, bonus: 40, hatchWith: D.ELEMENT_INFO && D.ELEMENT_INFO.fire ? 'fire' : undefined, halloween: true, desc: 'Grows the Jack-o\'-Lantern Pipspout: a glowing pumpkin Pipspout born with Fire.' };

  // ---------------- the shop ----------------
  const COSTUMES = ['hwitch', 'hbat', 'hcandy'];
  const SHOP = {
    jackpea: { kind: 'prize', name: 'Jack-o\'-Lantern Pipspout', price: 170, once: true, desc: 'The Halloween prize plant! A glowing pumpkin Pipspout, born with Fire.' },
    hwitch: { kind: 'costume', name: 'Witch Hat', price: 40, desc: 'A pointy purple hat with a gold buckle.' },
    hbat: { kind: 'costume', name: 'Bat Wings', price: 40, desc: 'Two little flappy bat wings.' },
    hcandy: { kind: 'costume', name: 'Candy Corn', price: 55, desc: 'Turns a plant into sweet candy corn colours.' },
    patch: { kind: 'decor', name: 'Rindguard Patch', price: 45, once: true, desc: 'Rindguards grow by the fence in every garden, all year.' },
    grave: { kind: 'decor', name: 'Friendly Graves', price: 35, once: true, desc: 'Two cute gravestones with flowers, in every garden.' },
    bag: { kind: 'bag', name: 'Candy Bag', price: 25, desc: 'A surprise inside: coins, fruit, a costume or a spooky seed packet.' },
  };
  const ORDER = ['jackpea', 'hwitch', 'hbat', 'hcandy', 'patch', 'grave', 'bag'];
  // candy from a Trick-or-Treat raid: 2-4 per zombie, 15 for a Raid Chiefs, 10 more for winning (a big raid gives about 40, a small
  // one about 20: the prize plant takes 4-6 raids for most players)
  const CANDY = { zombie: [2, 4], boss: 15, win: 10 };

  function ev() {
    const S = PS.S; if (!S) return { candy: 0, bought: {} };
    if (!S.event || typeof S.event !== 'object') S.event = { year: new Date().getFullYear(), candy: 0, total: 0, bought: {} };
    const E = S.event;
    if (!(E.candy >= 0)) E.candy = 0; if (!(E.total >= 0)) E.total = E.candy;
    if (!E.bought || typeof E.bought !== 'object') E.bought = {};
    return E;
  }
  const candy = () => (PS.S && PS.S.event ? Math.max(0, PS.S.event.candy | 0) : 0);
  function addCandy(n, why) {
    n = Math.max(0, Math.round(n || 0)); if (!n) return 0;
    const E = ev(); E.candy += n; E.total += n; E.year = new Date().getFullYear();
    emit('candy', { n, total: E.candy, why }); save(); return n;
  }
  function spend(n) { const E = ev(); if (E.candy < n) return false; E.candy -= n; emit('candy', { n: -n, total: E.candy, why: 'spend' }); return true; }
  const owns = id => (ev().bought[id] | 0) > 0;
  const wearing = id => (PS.S ? PS.S.sprouts.filter(s => s.look && s.look.skin === id).length : 0);
  const free = id => Math.max(0, (ev().bought[id] | 0) - wearing(id));
  // a plant can wear a costume if it has no special skin of its own (a gold or galaxy plant keeps its look), or another costume
  const isCostume = k => COSTUMES.includes(k);
  function canDress(s) { const k = s && s.look && s.look.skin; return !!s && !s.zombie && (!k || isCostume(k)); }
  function dress(s, id) {
    if (!canDress(s)) return { ok: false, reason: 'skin' };
    s.look = s.look || {};
    if (!id) { delete s.look.skin; emit('sprout:update', { s }); save(); return { ok: true, off: true }; }
    if (!isCostume(id)) return { ok: false };
    if (s.look.skin !== id && free(id) < 1) return { ok: false, reason: 'none' };
    s.look.skin = id; emit('sprout:update', { s }); save(); return { ok: true };
  }
  function status(id) {
    const I = SHOP[id]; if (!I) return null;
    if (I.once && owns(id)) return { done: true };
    return { short: Math.max(0, I.price - candy()) };
  }
  function buy(id) {
    const I = SHOP[id]; if (!I) return { ok: false };
    if (I.once && owns(id)) return { ok: false, reason: 'owned' };
    if (!spend(I.price)) return { ok: false, reason: 'candy' };
    const E = ev(); let out = { ok: true, id, kind: I.kind, name: I.name };
    if (I.kind === 'prize') { const egg = ST.addEgg('hjack', 'Halloween prize', 'peashooter'); out.egg = egg; }
    if (I.kind === 'bag') out = Object.assign(out, bagPrize());
    E.bought[id] = (E.bought[id] | 0) + 1;
    emit('event:buy', { id }); save();
    return out;
  }
  // ---------------- the Candy Bag ----------------
  // rar: 'often' | 'rare' | 'super' (the reveal's glow colour)
  const BAG = [['coins', 34], ['fruit', 26], ['plantfood', 12], ['costume', 15], ['spookyseed', 10], ['candy', 3]];
  function weighted(list) { const tot = list.reduce((a, x) => a + x[1], 0); let r = Math.random() * tot; for (const x of list) { r -= x[1]; if (r <= 0) return x[0]; } return list[0][0]; }
  function bagPrize() {
    const type = weighted(BAG), E = ev();
    switch (type) {
      case 'coins': { const n = ST.addCoins(irand(80, 220), 'event'); return { type, n, rar: 'often', title: `${n} coins`, text: 'Coins tumble out of the bag!' }; }
      case 'fruit': {
        const pool = Object.keys(D.FRUITS || {}).filter(k => k !== 'plantfood' && k !== 'goldfruit'), got = [pick(pool), pick(pool), pick(pool)].filter(Boolean);
        got.forEach(k => { PS.S.fruits[k] = (PS.S.fruits[k] || 0) + 1; }); emit('pouch');
        return { type, id: got[0], n: got.length, rar: 'often', title: '3 fruits', text: got.map(k => D.FRUITS[k].name).join(', ') + '. They are in the Garden fruit tray.' };
      }
      case 'plantfood': { PS.S.fruits.plantfood = (PS.S.fruits.plantfood || 0) + 1; emit('pouch'); return { type, id: 'plantfood', rar: 'rare', title: 'Plant Food!', text: 'XP for every stat. It is in the Garden fruit tray.' }; }
      case 'costume': { const id = pick(COSTUMES); E.bought[id] = (E.bought[id] | 0) + 1; return { type, id, rar: 'rare', title: `A ${SHOP[id].name}!`, text: 'A costume for a plant. Dress one up in this Halloween shop.' }; }
      case 'spookyseed': { const k = Math.random() < 0.5 ? 'ghost' : 'zombie', egg = ST.addEgg(D.SEEDS[k] ? k : 'normal', 'Candy Bag'); return { type, id: k, egg, rar: 'rare', title: (D.SEEDS[k] || D.SEEDS.normal).name + '!', text: `A spooky seed packet! It's waiting in the ${((D.AREAS[egg.area] || {}).name) || 'Garden'}.` }; }
      default: { addCandy(60, 'bag'); return { type: 'candy', n: 60, rar: 'super', title: 'A huge pile of candy!', text: '60 candies! The bag was full to the top.' }; }
    }
  }
  // ---------------- raids ----------------
  const raidCandy = boss => (boss ? CANDY.boss : irand(CANDY.zombie[0], CANDY.zombie[1]));
  // decorations bought in the shop: shown in every garden, all year (garden.js places them)
  const decor = () => ['patch', 'grave'].filter(owns);

  PS.event = {
    active, info, force, forced, check, candy, addCandy, spend, owns, wearing, free, canDress, dress, buy, status, decor, raidCandy,
    shop: () => ORDER.map(id => Object.assign({ id }, SHOP[id])), item: id => SHOP[id], COSTUMES, CANDY,
    state: ev,
  };
  // (for testing in the browser console: __event.force(true), __event.addCandy(200))
  window.__event = { force, addCandy, info, buy, dress, state: ev };
  try { check(); } catch (e) { /* PS.S not ready */ }
})();
