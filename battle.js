// battle.js — PVZ Garden Battle: Zombie leagues, Plant Duels (battle other gardeners' plants), turn-based 1v1 fights, results,
// Zombosses (boss fights), the Battle Tower, pass-and-play Friend Battles and battle snacks.
// Owns PS.scenes.battle. CSS is injected from here (classes prefixed .b-).
// The rules engine (makeFighter / resolveRound / aiChoose) is pure and has no DOM, so it can run headless
// for balance sims: window.__battle.engine.sim(sprout, leagueId, index, n), .simBoss(sprout, bossId, n), .simTower(sprout, n),
// .estimate(sprout, spec, n) (the same kid-level estimate the pre-battle screens show).
// Every battle prize is decided by prize() and paid by grant(), once, the moment a battle is decided.
// New save data lives only in PS.S.progress.battleExtra (created lazily by extra(); old saves simply don't have it yet).
(function () {
  'use strict';
  const PS = window.PS, D = PS.D, ST = PS.state;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3);

  // ======================================================================
  // Content tables (battle-only)
  // ======================================================================
  // Legend Challenges. Stats are those of a balanced plant of total level `lv`, scaled by hpK / atkK / defK / spdK.
  // Every boss follows the same readable rhythm: `calm` normal turns, then it CHARGES (big warning), then it unleashes
  // its giant attack. Using a Guard / Heal / Boost move (or a snack) on the giant-attack turn blocks most of it.
  const BOSSES = [
    { id: 'gargantuar', name: 'Gargantuar', title: 'the Giant Zombie', area: 'frontyard', unlock: { league: 'backyard' }, lv: 24, hpK: 1.55, atkK: 1.28, defK: 1, spdK: 0.75, smart: 0.7,
      els: ['rock'], moves: ['zsmash', 'zimptoss', 'zgroan'], calm: 2, sup: { move: 'bpole', mult: 1.35, name: 'Telephone Pole' },
      charge: 'The Gargantuar lifts its telephone pole high!', warn: 'Pole smash coming!', coins: 140, xp: 20, rec: 35,
      blurb: 'A HUGE zombie with a telephone pole and a tiny imp on its back.' },
    { id: 'zombot', name: 'Zombot', title: "Dr. Zomboss's robot", area: 'peak', unlock: { league: 'night' }, lv: 42, hpK: 1.65, atkK: 1.28, defK: 1, spdK: 1, smart: 0.75,
      els: ['robot', 'fire'], moves: ['zcharge', 'zzap', 'zarmor'], calm: 2, sup: { move: 'bfire', mult: 1.35, name: 'Giant Fireball' },
      charge: 'The Zombot opens its mouth... a fireball is coming!', warn: 'Giant fireball coming!', coins: 260, xp: 30, rec: 50,
      blurb: 'Dr. Zomboss built a giant robot zombie head. It throws fireballs!' },
    { id: 'plankwalker', name: 'Plank Walker', title: 'Zombot of the Pirate Seas', area: 'abyss', unlock: { league: 'pool' }, lv: 58, hpK: 1.5, atkK: 1.35, defK: 1.05, spdK: 0.85, smart: 0.8,
      els: ['water', 'robot'], moves: ['zswing', 'zcannon', 'zarmor'], calm: 2, sup: { move: 'bbarrage', mult: 1.3, name: 'Cannon Barrage' },
      charge: 'The Plank Walker loads all its cannons!', warn: 'Cannon barrage coming!', coins: 450, xp: 42, rec: 62,
      blurb: 'A walking pirate-ship robot. Its cannons fire four at once.' },
    { id: 'sphinx', name: 'Sphinx-inator', title: 'Zombot of Ancient Egypt', area: 'sunfire', unlock: { league: 'roof' }, lv: 76, hpK: 1.6, atkK: 1.3, defK: 1, spdK: 0.9, smart: 0.8,
      els: ['rock', 'laser'], moves: ['zsand', 'zwrap', 'zstaff'], calm: 2, sup: { move: 'bsphinx', mult: 1.3, name: 'Sphinx Beam' },
      charge: 'The Sphinx-inator\'s eyes start to glow!', warn: 'Sphinx beam coming!', coins: 700, xp: 55, rec: 84,
      blurb: 'A giant stone sphinx with Dr. Zomboss\'s face. Its eyes shoot beams!' },
    { id: 'frostmammoth', name: 'Frost Mammoth', title: 'Zombot of Frostbite Caves', area: 'snow', unlock: { league: 'egypt' }, lv: 86, hpK: 1.15, atkK: 1.45, defK: 1, spdK: 1.05, smart: 0.85,
      els: ['ice', 'robot'], moves: ['zyeti', 'zsnow', 'zarmor'], calm: 2, sup: { move: 'bmammoth', mult: 1.3, name: 'Mammoth Freeze' }, revive: 0.4,
      charge: 'The Frost Mammoth stomps and the air turns icy!', warn: 'Mammoth freeze coming!', coins: 900, xp: 65, rec: 105,
      blurb: 'An icy robot mammoth. Beat it once and it reboots, so save some strength!' },
    { id: 'darkdragon', name: 'Dark Dragon', title: 'Zombot of the Dark Ages', area: 'volcano', unlock: { league: 'frost' }, lv: 108, hpK: 1.3, atkK: 1.5, defK: 1.05, spdK: 1, smart: 0.9,
      els: ['fire', 'dark'], moves: ['zcharge', 'zimp', 'zarmor'], calm: 1, sup: { move: 'bdragon', mult: 1.25, name: 'Dragon Fire' },
      charge: 'The Dark Dragon takes a DEEP breath!', warn: 'Dragon fire coming!', coins: 1200, xp: 80, rec: 120,
      blurb: 'A robot dragon from the Dark Ages. It breathes fire every third turn!' },
    { id: 'warwagon', name: 'War Wagon', title: 'Zombot of the Wild West', area: 'west', unlock: { league: 'west' }, lv: 70, hpK: 1.5, atkK: 1.3, defK: 1, spdK: 0.95, smart: 0.8,
      els: ['fire', 'robot'], moves: ['zdynamite', 'zlasso', 'zarmor'], calm: 2, sup: { move: 'bwagon', mult: 1.3, name: 'Wagon Charge' },
      charge: 'The War Wagon revs up and its wheels catch fire!', warn: 'Wagon charge coming!', coins: 600, xp: 50, rec: 75,
      blurb: 'A rolling robot wagon from the Wild West. Watch out for its flaming charge!' },
    { id: 'gondola', name: 'Aerostatic Gondola', title: 'Zombot of the Lost City', area: 'lostcity', unlock: { league: 'lostcity' }, lv: 112, hpK: 1.45, atkK: 1.35, defK: 1.05, spdK: 0.9, smart: 0.85,
      els: ['rock', 'robot'], moves: ['zshovel', 'zwhip', 'zarmor'], calm: 2, sup: { move: 'bgondola', mult: 1.3, name: 'Gondola Drop' },
      charge: 'The Gondola opens its hatch... crates incoming!', warn: 'Crate drop coming!', coins: 1000, xp: 70, rec: 112,
      blurb: 'A floating robot balloon that drops crates on the Lost City.' },
    { id: 'sharktronic', name: 'Sharktronic Sub', title: 'Zombot of Big Wave Beach', area: 'bigwave', unlock: { league: 'beach' }, lv: 146, hpK: 1.4, atkK: 1.4, defK: 1.05, spdK: 1, smart: 0.85,
      els: ['water', 'robot'], moves: ['zsurf', 'zhook', 'zarmor'], calm: 2, sup: { move: 'bshark', mult: 1.3, name: 'Shark Bite' },
      charge: 'The Sharktronic Sub opens its giant jaws!', warn: 'Shark bite coming!', coins: 1150, xp: 78, rec: 140,
      blurb: 'A robot shark submarine. Its giant bite comes every few turns!' },
    { id: 'mechasaur', name: 'Dinotronic Mechasaur', title: 'Zombot of Jurassic Marsh', area: 'jurassic', unlock: { league: 'jurassic' }, lv: 186, hpK: 1.35, atkK: 1.45, defK: 1.05, spdK: 1, smart: 0.9,
      els: ['robot', 'rock'], moves: ['zbullystomp', 'zclub', 'zarmor'], calm: 1, sup: { move: 'bmecha', mult: 1.25, name: 'Mechasaur Roar' }, revive: 0.3,
      charge: 'The Mechasaur takes a giant breath...', warn: 'Mechasaur roar coming!', coins: 1350, xp: 88, rec: 160,
      blurb: 'A giant robot dinosaur. Beat it once and it gets back up!' },
    { id: 'masher', name: 'Multi-stage Masher', title: 'Zombot of the Neon Mixtape Tour', area: 'neon', unlock: { league: 'neon' }, lv: 226, hpK: 1.35, atkK: 1.45, defK: 1.1, spdK: 1.05, smart: 0.95,
      els: ['electric', 'robot'], moves: ['zboombox', 'zpunk', 'zarmor'], calm: 1, sup: { move: 'bmasher', mult: 1.25, name: 'Mega Mash' },
      charge: 'The Masher turns its speakers ALL the way up!', warn: 'Mega mash coming!', coins: 1500, xp: 95, rec: 175,
      blurb: 'A giant robot stage with enormous speakers. Rock on!' },
    { id: 'tomorrowtron', name: 'Tomorrow-tron', title: 'Zombot of the Far Future', area: 'tower', unlock: { league: 'future' }, lv: 160, hpK: 1.35, atkK: 1.45, defK: 1.1, spdK: 1.05, smart: 0.95,
      els: ['laser', 'robot'], moves: ['zlaser', 'zzap', 'zarmor'], calm: 1, sup: { move: 'btomorrow', mult: 1.25, name: 'Tomorrow Laser' }, revive: 0.3,
      charge: 'The Tomorrow-tron charges its laser cannon!', warn: 'Tomorrow laser coming!', coins: 1600, xp: 100, rec: 170,
      blurb: 'Dr. Zomboss\'s biggest robot ever, straight from the future. The final boss!' },
  ];
  // first-win prizes for Zombosses without a plant unlock: a fusion item and a special seed packet
  const BOSS_PRIZE = { plankwalker: ['pirate', 'galaxy'], sphinx: ['crown', 'golden'], frostmammoth: ['space', 'crystal'], darkdragon: ['knight', 'rainbow'], tomorrowtron: ['jetpack', 'golden'] };
  PS.bossNames = Object.fromEntries(BOSSES.map(b => [b.id, b.name]));
  const BOSS = Object.fromEntries(BOSSES.map(b => [b.id, b]));
  // Battle Tower: floor f has an opponent of total level lv(f). HP carries over, +heal between floors.
  const TOWER = {
    unlock: 'lawn', heal: 0.4,
    lv: f => Math.round(2 + f * 4.2),
    mult: f => Math.min(1, 0.8 + f * 0.04) * (f > 55 ? 1 + (f - 55) * 0.03 : 1),
    smart: f => Math.min(0.95, 0.35 + f * 0.03),
    coins: f => Math.max(8, Math.round(0.085 * Math.pow(TOWER.lv(f), 1.9))),
    xp: f => (0.75 * TOWER.lv(f) + 5) * 0.5,
  };
  // Wild Battles: fight the real animals of each island. lv: [little, big, alpha] level ranges, spread across the area's animals
  // in data order. An animal's stats lean toward what it `gives` (a Sparrow is a dodgy flier, a Ram hits hard).
  const WILD = {
    areas: [
      { id: 'meadow', unlock: null, lv: [[2, 10], [14, 24], [28, 40]] },
      { id: 'beach', unlock: 'thorn', lv: [[18, 26], [32, 44], [50, 64]] },
      { id: 'moonlit', unlock: 'tide', lv: [[30, 40], [48, 60], [70, 86]] },
      { id: 'candy', unlock: 'moon', lv: [[44, 54], [64, 78], [95, 112]] },
    ],
    steps: [{ name: 'Little', mult: 0.7, smart: 0.3, scale: 1, moves: 2 }, { name: 'Big', mult: 0.95, smart: 0.55, scale: 1 }, { name: 'Alpha', mult: 1.1, smart: 0.8, scale: 1 }], // garden-sized animals (bosses stay giant)
    coins: lv => Math.max(6, Math.round(0.09 * Math.pow(lv, 1.9))),
    xp: lv => (0.75 * lv + 5) * 0.6,
  };
  const STAT_FRUITS = ['swiftberry', 'wingseed', 'seakelp', 'powernut', 'heartyroot'];
  const FRIEND = { coinsWin: 12, coinsLose: 6, coinsDraw: 9, xp: 2.8, perDay: 5 }; // xp: base XP (× the battle XP split = 10)
  const SNACK = '__snack';
  const SNACK_HEAL = { goldfruit: 0.5 }; // share of max HP; everything else heals TUNE.snackHeal
  const NPC_NAMES = ['Biscuit', 'Nova', 'Ziggy', 'Mochi', 'Pickle', 'Tango', 'Comet', 'Sprocket', 'Dot', 'Echo', 'Fern', 'Gizmo', 'Jinx', 'Kiwi', 'Lumen', 'Marble',
    'Noodle', 'Orbit', 'Puddle', 'Quill', 'Rascal', 'Tofu', 'Umi', 'Vesper', 'Waffle', 'Yuzu', 'Zephyr', 'Bean', 'Cricket', 'Dizzy', 'Ember', 'Flick'];

  // ======================================================================
  // Rules engine (pure)
  // ======================================================================
  // Tunables that are not in data.js (yet). dmg = pow × (atk/def)^ratioExp × dmgK × (lvBase + level/dmgLv) × STAB × type × crit × rand
  const TUNE = {
    dmgK: 0.104, lvBase: 1.5, dmgLv: 45, ratioExp: 0.65, rand: [0.9, 1.1],
    accStage: [0.6, 0.7, 0.85, 1, 1.15, 1.3, 1.45], // hit-chance multiplier for (acc stage − eva stage), −3..+3
    npcMult: [0.75, 0.92, 1, 1, 1, 1, 1, 1, 1, 1],   // opponent HP/Attack scale per league (keeps Pebble gentle for a fresh plant)
    poisonFrac: 1 / 10, burnFrac: 1 / 12, dotTurns: 4, sleepTurns: [1, 3],
    typeCap: [0.5, 2],
    healFade: 0.75, healFloor: 0.25, // each heal a fighter uses is weaker than the last (stops heal-stalling)
    aiSmart: [0.2, 0.45, 0.6, 0.72, 0.85, 0.95, 0.95, 0.96, 0.97, 0.98], // per league index (Pebble → Champion)
    tireAt: 14, tireFrac: 1 / 10,                    // from this round on, both lose HP each round (no endless stalls)
    braceMult: 0.3, bossDot: 0.3, bossTireAt: 22,    // bosses: blocked giant attacks deal 30%; poison/burn/tiring hurt bosses 30% as much
    snackHeal: 0.3,
  };
  const SURE = new Set(['slowslam']); // "Never misses" (ignores Dodge)
  // One set of kid words everywhere in battle: Dodge (not Evasion) and Aim (not Accuracy)
  const STAT_NAME = { atk: 'Attack', def: 'Defense', spd: 'Speed', eva: 'Dodge', acc: 'Aim' };
  const STAT_SHORT = STAT_NAME; // plate tags use the same words
  const kidWords = t => String(t).replace(/\bEvasion\b/g, 'Dodge').replace(/\bevasion\b/g, 'dodge').replace(/\baccuracy\b/gi, 'Aim');
  const STATUS_SHORT = { poison: 'Poison', burn: 'Burn', sleep: 'Asleep', stun: 'Stunned' };
  const arr = v => (!v ? [] : Array.isArray(v) ? v : [v]);
  const sm = n => D.BATTLE.stageMult[clamp(Math.round(n), -3, 3) + 3];

  // healed / dealt / dealtStrong (super-effective damage) / dealtWeak / bigHits (unblocked giant attacks taken) feed the
  // "why did we lose?" tips on the results screen.
  function baseFighter(side) {
    return { side, st: { atk: 0, def: 0, spd: 0, eva: 0, acc: 0 }, status: null, statusT: 0, stun: false, used: {}, heals: 0,
      boss: null, charging: false, bc: 0, braced: false, snack: null, revived: false, healed: 0, dealt: 0, dealtStrong: 0, dealtWeak: 0, strongEl: null, bigHits: 0 };
  }
  // mult: the league's strength scale (HP, Attack, Defense). k: an optional per-opponent tweak from data.js ({hp, atk, def}).
  function makeFighter(s, side, mult, k, noLook) {
    const bs = Object.assign({}, ST.battleStats(s));
    if (mult && mult !== 1) { bs.hp = Math.round(bs.hp * mult); bs.atk = Math.round(bs.atk * mult); bs.def = Math.round(bs.def * mult); }
    if (k) { if (k.hp) bs.hp = Math.round(bs.hp * k.hp); if (k.atk) bs.atk = Math.round(bs.atk * k.atk); if (k.def) bs.def = Math.round(bs.def * k.def); }
    let look = null; if (!noLook) try { look = ST.lookOf(s); } catch (e) { look = null; }
    return Object.assign(baseFighter(side), {
      s, name: s.name, npc: !!s.npc, look, moves: ST.movesOf(s).filter(id => D.MOVES[id]), els: bs.els.slice(), lv: bs.level,
      max: bs.hp, hp: bs.hp, atk: bs.atk, def: bs.def, spd: bs.spd, eva: bs.eva,
    });
  }
  // A boss is a fighter with no plant behind it: stats of a balanced plant of level B.lv, scaled.
  function makeBoss(id) {
    const B = BOSS[id], L = B.lv;
    const f = Object.assign(baseFighter('o'), {
      s: null, name: B.name, npc: true, look: null, critter: id, boss: B, moves: B.moves.filter(m => D.MOVES[m]), els: B.els.slice(), lv: L,
      atk: Math.round((12 + 0.44 * L) * B.atkK), def: Math.round((10 + 0.4 * L) * B.defK), spd: Math.round((10 + 0.4 * L) * B.spdK), eva: 0,
    });
    f.max = f.hp = Math.round((40 + 2 * L) * B.hpK);
    return f;
  }
  const wildList = area => Object.keys(D.ANIMALS).filter(k => D.ANIMALS[k].area === area);
  // level order inside an area: gentler creatures (smaller total gives) get the lower levels, so new additions don't all land at the top
  const giveSum = id => Object.values(D.ANIMALS[id].gives || {}).reduce((t, v) => t + Math.abs(v), 0);
  const wildRank = area => wildList(area).map((id, i) => [id, giveSum(id) + i * 0.001]).sort((x, y) => x[1] - y[1]).map(x => x[0]);
  function wildLv(id, step) {
    const A = D.ANIMALS[id], W = WILD.areas.find(a => a.id === A.area) || WILD.areas[0], list = wildRank(A.area), i = Math.max(0, list.indexOf(id)), [a, b] = W.lv[step];
    return Math.round(a + (b - a) * (list.length > 1 ? i / (list.length - 1) : 0));
  }
  // A wild animal fighter: its own 3 moves and element, stats from a plant-like spread of level L that leans toward its gives.
  function makeWild(id, step) {
    const A = D.ANIMALS[id], S = WILD.steps[step], L = wildLv(id, step), B = D.BATTLE;
    const w = { swim: 1, fly: 1, run: 1, power: 1, stamina: 1.2 };
    for (const [st, v] of Object.entries(A.gives || {})) if (v > 0 && w[st]) w[st] += v / 5;
    const wt = Object.values(w).reduce((a, b) => a + b, 0), lv = {};
    for (const st of D.STATS) lv[st] = Math.min(D.GROWTH.maxLevel, Math.round(L * w[st] / wt));
    const m = S.mult;
    // a Little one only knows its first moves, but always at least one attack (else it could never win on its own)
    const all = A.moves.filter(x => D.MOVES[x]), moves = all.slice(0, S.moves || 3);
    if (!moves.some(x => D.MOVES[x].pow > 0)) moves[moves.length - 1] = all.find(x => D.MOVES[x].pow > 0) || 'tackle';
    const f = Object.assign(baseFighter('o'), {
      s: null, name: `${S.name} ${A.name}`, npc: true, look: null, critter: id, wild: { id, step }, moves, els: [A.el || 'normal'], lv: L,
      atk: Math.round((B.atkBase + lv.power * B.atkPerPower) * m), def: Math.round((B.defBase + lv.stamina * B.defPerStamina + lv.swim * B.defPerSwim) * m),
      spd: Math.round(B.spdBase + lv.run * B.spdPerRun), eva: Math.min(B.evaMax, lv.fly * B.evaPerFly),
    });
    f.max = f.hp = Math.round((B.hpBase + lv.stamina * B.hpPerStamina + L * B.hpPerLevel) * m);
    return f;
  }
  const effAtk = f => f.atk * sm(f.st.atk - (f.status === 'burn' ? 1 : 0));
  const effDef = f => f.def * sm(f.st.def);
  const effSpd = f => f.spd * sm(f.st.spd) * (f.status === 'sleep' ? 0.5 : 1);
  // Defender's first element (its form) counts fully; a second element (from its top animal) counts half.
  function typeMult(el, defEls) {
    let m = 1; const E = D.ELEMENTS[el];
    defEls.forEach((d, i) => {
      const k = i === 0 ? 1 : 0.5;
      if (E && E.strong.includes(d)) m *= 1 + (D.BATTLE.strong - 1) * k;
      else if (D.ELEMENTS[d] && D.ELEMENTS[d].strong.includes(el)) m *= 1 - (1 - D.BATTLE.weak) * k;
    });
    return clamp(m, TUNE.typeCap[0], TUNE.typeCap[1]);
  }
  const stabOf = (f, mv) => (mv.el !== 'normal' && f.els.includes(mv.el) ? D.BATTLE.stab : 1);
  const targetsFoe = mv => mv.pow > 0 || !!mv.fx.debuff || !!mv.fx.status;
  // moves that block a boss's giant attack: anything that only helps yourself (guard, heal, boost), and snacks
  const isBrace = id => id === SNACK || (!!D.MOVES[id] && D.MOVES[id].pow === 0 && !targetsFoe(D.MOVES[id]));
  const canAct = f => !f.stun && !(f.status === 'sleep' && f.statusT > 0);
  function hitChance(a, t, id) {
    const mv = D.MOVES[id];
    if (!mv || !targetsFoe(mv)) return 1;
    if (SURE.has(id)) return 1;
    return clamp(mv.acc * (1 - t.eva) * TUNE.accStage[clamp(a.st.acc - t.st.eva, -3, 3) + 3], 0.05, 1);
  }
  function baseDamage(a, t, mv) { // expected damage per hit, no crit / random
    const ratio = Math.pow(effAtk(a) / Math.max(1, effDef(t)), TUNE.ratioExp);
    return mv.pow * ratio * TUNE.dmgK * (TUNE.lvBase + a.lv / TUNE.dmgLv) * stabOf(a, mv) * typeMult(mv.el, t.els);
  }
  function rollDamage(a, t, mv, rng) {
    const crit = rng() < D.BATTLE.critBase + (mv.fx.crit || 0);
    const r = TUNE.rand[0] + rng() * (TUNE.rand[1] - TUNE.rand[0]);
    return { n: Math.max(1, Math.round(baseDamage(a, t, mv) * (crit ? D.BATTLE.critMult : 1) * r)), crit, tm: typeMult(mv.el, t.els) };
  }
  const healFactor = f => Math.max(TUNE.healFloor, Math.pow(TUNE.healFade, f.heals));
  const usable = (f, id) => (id === SNACK ? !!(f.snack && !f.snack.used) : !!D.MOVES[id] && !(D.MOVES[id].fx.once && f.used[id]));
  const priority = id => (id === SNACK ? 2 : D.MOVES[id] && D.MOVES[id].fx.first ? 1 : 0);
  const dotMul = f => (f.boss ? TUNE.bossDot : 1);

  function snap(b) {
    const one = f => ({ hp: f.hp, status: f.status, stun: f.stun, st: Object.assign({}, f.st), charging: f.charging });
    return { p: one(b.p), o: one(b.o), tired: !!b.tired };
  }
  // opts: npcMult, k (per-opponent tweak), smart, rng, boss (boss id: the 'o' side is that boss instead of sO), wild, tireAt,
  // friend (pass-and-play: a double knock-out is a draw), sim (headless: no looks, no event snapshots)
  function newBattle(sP, sO, opts) {
    opts = opts || {};
    const o = opts.boss ? makeBoss(opts.boss) : opts.wild ? makeWild(opts.wild.id, opts.wild.step) : makeFighter(sO, 'o', opts.npcMult, opts.k, opts.sim);
    const b = { p: makeFighter(sP, 'p', 1, null, opts.sim), o, turn: 0, over: false, winner: null, tie: false, tired: false, friend: !!opts.friend, sim: !!opts.sim, rng: opts.rng || Math.random,
      smart: opts.smart == null ? (o.boss ? o.boss.smart : o.wild ? WILD.steps[o.wild.step].smart : 0.6) : opts.smart, tireAt: opts.tireAt || (o.boss ? TUNE.bossTireAt : TUNE.tireAt) };
    b.p.foe = b.o; b.o.foe = b.p;
    return b;
  }
  // A boss that can be reborn (Phoenix) comes back once instead of fainting.
  function revive(f, E) {
    if (f.hp > 0) return true;
    if (!f.boss || !f.boss.revive || f.revived) return false;
    f.revived = true; f.hp = Math.round(f.max * f.boss.revive); f.status = null; f.statusT = 0; f.stun = false; f.charging = false; f.bc = 0;
    f.st = { atk: 0, def: 0, spd: 0, eva: 0, acc: 0 };
    E('revive', f, { text: `${f.name} rose again from its flames!` });
    return true;
  }
  // After anything that can knock a fighter out: a reborn boss rises again, otherwise whoever is at 0 HP faints.
  // Both at 0 at once is a tie. Against the computer the player's plant hangs on with 1 HP and wins (kid-friendly);
  // in a Friend Battle it's a draw (winner null).
  function settle(b, E, tired) {
    const P = b.p, O = b.o;
    if (O.hp <= 0) revive(O, E);
    if (P.hp <= 0) revive(P, E);
    const pd = P.hp <= 0, od = O.hp <= 0;
    if (!pd && !od) return false;
    const out = f => E('faint', f, { text: tired ? `${f.name} is too tired to go on!` : `${f.name} fainted!` });
    b.over = true; b.tiredEnd = !!tired;
    if (pd && od) {
      b.tie = true;
      if (b.friend) { out(O); out(P); b.winner = null; E('note', null, { draw: true, text: "Both are down at the same time. It's a draw!" }); }
      else { out(O); P.hp = 1; b.winner = 'p'; E('hang', P, { text: `Both are worn out... but ${P.name} hangs on with 1 HP!` }); }
      return true;
    }
    const f = pd ? P : O; out(f); b.winner = f.foe.side;
    return true;
  }

  // Resolve one round. Returns a list of events (each carries a state snapshot taken right after it happened).
  function resolveRound(b, pMove, oMove) {
    const ev = [], P = b.p, O = b.o, rng = b.rng;
    const E = (type, who, x) => { const e = Object.assign({ type, who: who ? who.side : null }, x || {}); if (!b.sim) e.snap = snap(b); ev.push(e); return e; };
    b.turn++;
    // a boss either acts normally, charges up (telegraphed), or unleashes its giant attack
    let oPlan = null;
    if (O.boss) { if (O.charging) oPlan = 'super'; else if (O.bc >= O.boss.calm) oPlan = 'charge'; }
    P.braced = canAct(P) && isBrace(pMove); O.braced = false;
    let first = [P, pMove], second = [O, oMove];
    const pp = priority(pMove), po = oPlan ? -1 : priority(oMove);
    if (po > pp || (po === pp && (effSpd(O) > effSpd(P) || (effSpd(O) === effSpd(P) && rng() < 0.5)))) { first = [O, oMove]; second = [P, pMove]; }
    for (const [a, id] of [first, second]) {
      const t = a.foe;
      if (a === O && oPlan) bossAct(b, a, t, oPlan, E); else act(b, a, t, id, E);
      if (settle(b, E)) return ev;
    }
    if (O.boss && !oPlan) O.bc++;
    // end of round: poison / burn hurt both fighters first, then we see who is still standing (so the order never picks the winner)
    for (const f of [first[0], second[0]]) {
      if (f.status !== 'poison' && f.status !== 'burn') continue;
      const n = Math.max(1, Math.round(f.max * (f.status === 'poison' ? TUNE.poisonFrac : TUNE.burnFrac) * dotMul(f)));
      f.hp = Math.max(0, f.hp - n);
      E('dot', f, { n, kind: f.status, text: f.status === 'poison' ? `${f.name} is hurt by poison.` : `${f.name} is hurt by its burn.` });
      if (f.hp > 0 && --f.statusT <= 0 && f.status) { const k = f.status; f.status = null; E('cure', f, { text: k === 'poison' ? `${f.name}'s poison wore off.` : `${f.name}'s burn healed.` }); }
    }
    if (settle(b, E)) return ev;
    // long battles: from round tireAt on, both lose a little HP every round (no endless stalls)
    if (b.turn >= b.tireAt) {
      const firstTire = !b.tired;
      if (firstTire) { b.tired = true; E('note', null, { tired: true, text: 'Both are getting tired! Now they lose a little HP every turn.' }); }
      let i = 0;
      for (const f of [first[0], second[0]]) {
        const n = Math.max(1, Math.round(f.max * TUNE.tireFrac * dotMul(f))); f.hp = Math.max(0, f.hp - n);
        E('dot', f, { n, kind: 'tired', text: i++ || firstTire ? '' : 'Both are tired and lose some HP.' });
      }
      if (settle(b, E, true)) return ev;
    }
    return ev;
  }

  function act(b, a, t, id, E) {
    const rng = b.rng;
    if (a.stun) { a.stun = false; E('skip', a, { kind: 'stun', text: `${a.name} is stunned and can't move!` }); return; }
    if (a.status === 'sleep') {
      if (a.statusT > 0) { a.statusT--; E('skip', a, { kind: 'sleep', text: `${a.name} is fast asleep.` }); return; }
      a.status = null; E('wake', a, { text: `${a.name} woke up!` });
    }
    if (id === SNACK) { // battle snack: heals, never misses, goes first
      const sn = a.snack; if (!sn || sn.used) { E('note', a, { text: 'No snack left!' }); return; }
      sn.used = true;
      const h = Math.min(a.max - a.hp, Math.round(a.max * sn.heal));
      a.hp += h; a.healed += h;
      E('snack', a, { n: h, fruit: sn.fruit, text: `${a.name} ate the ${sn.name}. Yum!` });
      if (sn.cleanse && (a.status || a.stun)) { a.status = null; a.statusT = 0; a.stun = false; E('cleanse', a, { text: `${a.name} feels refreshed.` }); }
      return;
    }
    const mv = D.MOVES[id], fx = mv.fx;
    a.used[id] = (a.used[id] || 0) + 1;
    E('use', a, { move: id, text: `${a.name} used ${mv.name}!` });
    if (targetsFoe(mv) && rng() > hitChance(a, t, id)) {
      E('miss', a, { move: id, target: t.side, text: t.eva > 0.08 || t.st.eva > 0 ? `${t.name} dodged it!` : 'It missed!' });
      return;
    }
    let dealt = 0;
    if (mv.pow > 0) {
      const n = fx.hits || 1; let hits = 0, anyCrit = false, tm = 1;
      for (let i = 0; i < n && t.hp > 0; i++) {
        const r = rollDamage(a, t, mv, rng);
        t.hp = Math.max(0, t.hp - r.n); dealt += r.n; hits++; tm = r.tm; anyCrit = anyCrit || r.crit;
        a.dealt += r.n; if (r.tm > 1) { a.dealtStrong += r.n; a.strongEl = mv.el; } else if (r.tm < 1) a.dealtWeak += r.n;
        E('hit', t, { by: a.side, move: id, el: mv.el, n: r.n, crit: r.crit, tm: r.tm, i, of: n, text: r.crit && n === 1 ? 'A critical hit!' : '' });
      }
      const bits = [];
      if (n > 1) bits.push(`Hit ${hits} time${hits > 1 ? 's' : ''}!`);
      if (n > 1 && anyCrit) bits.push('Critical!');
      if (tm > 1) bits.push("It's super effective!"); else if (tm < 1) bits.push("It's not very effective...");
      if (bits.length) E('note', t, { text: bits.join(' ') });
    }
    if (fx.drain && dealt) { const h = Math.min(a.max - a.hp, Math.max(1, Math.round(dealt * fx.drain))); if (h > 0) { a.hp += h; a.healed += h; E('heal', a, { n: h, text: `${a.name} drained some energy.` }); } }
    if (fx.recoil && dealt) { const r = Math.max(1, Math.round(dealt * fx.recoil)); a.hp = Math.max(0, a.hp - r); E('recoil', a, { n: r, text: `${a.name} is hurt by the recoil.` }); }
    if (fx.cleanse && (a.status || a.stun)) { a.status = null; a.statusT = 0; a.stun = false; E('cleanse', a, { text: `${a.name} feels refreshed.` }); }
    if (fx.heal) {
      const k = healFactor(a), h = Math.min(a.max - a.hp, Math.round(a.max * fx.heal * k));
      if (a.hp < a.max) a.heals++;
      if (h > 0) { a.hp += h; a.healed += h; E('heal', a, { n: h, text: k < 0.6 ? `${a.name} recovered a little HP. Healing is wearing thin.` : `${a.name} recovered HP.` }); }
      else if (!fx.buff) E('note', a, { text: `${a.name}'s HP is already full.` });
    }
    for (const bf of arr(fx.buff)) stage(a, bf.stat, bf.n, E);
    if (t.hp > 0) for (const db of arr(fx.debuff)) stage(t, db.stat, -db.n, E);
    if (fx.status && t.hp > 0) {
      const S = fx.status, has = S.type === 'stun' ? t.stun : !!t.status;
      if (!has && rng() < S.chance) {
        if (S.type === 'stun') { t.stun = true; E('status', t, { st: 'stun', text: `${t.name} is stunned!` }); }
        else {
          t.status = S.type;
          t.statusT = S.type === 'sleep' ? (t.boss ? 1 : TUNE.sleepTurns[0] + Math.floor(rng() * (TUNE.sleepTurns[1] - TUNE.sleepTurns[0] + 1))) : TUNE.dotTurns;
          E('status', t, { st: S.type, text: S.type === 'sleep' ? `${t.name} fell asleep!` : S.type === 'poison' ? `${t.name} was poisoned! Poison hurts each turn.`
            : `${t.name} was burned! Burns hurt each turn and make attacks weaker.` }); // (burn: Attack counts one step lower, see effAtk)
        }
      } else if (mv.pow === 0 && !fx.debuff) E('note', t, { text: has ? 'But it failed!' : 'It had no effect.' });
    }
  }
  // boss special turns: 'charge' (the warning) and 'super' (the giant attack). Stunning or sleeping boss loses its charge.
  function bossAct(b, a, t, plan, E) {
    const B = a.boss, rng = b.rng;
    if (!canAct(a)) {
      const why = a.stun ? 'stunned' : 'asleep';
      if (a.stun) a.stun = false; else a.statusT--;
      if (plan === 'super') { a.charging = false; a.bc = 0; E('skip', a, { kind: a.status === 'sleep' ? 'sleep' : 'stun', text: `${a.name} is ${why}! Its giant attack fizzled out!` }); }
      else E('skip', a, { kind: a.status === 'sleep' ? 'sleep' : 'stun', text: why === 'stunned' ? `${a.name} is stunned and can't move!` : `${a.name} is fast asleep.` });
      return;
    }
    if (a.status === 'sleep') { a.status = null; E('wake', a, { text: `${a.name} woke up!` }); }
    if (plan === 'charge') { a.charging = true; E('charge', a, { text: B.charge, warn: B.warn }); return; }
    a.charging = false; a.bc = 0;
    const mv = D.MOVES[B.sup.move];
    E('use', a, { move: B.sup.move, giant: true, text: `${a.name} used ${B.sup.name.toUpperCase()}!` });
    const tm = typeMult(mv.el, t.els);
    const n = Math.max(1, Math.round(baseDamage(a, t, mv) * B.sup.mult * (0.95 + rng() * 0.1) * (t.braced ? TUNE.braceMult : 1)));
    t.hp = Math.max(0, t.hp - n); a.dealt += n; if (tm > 1) { a.dealtStrong += n; a.strongEl = mv.el; } if (!t.braced) t.bigHits++;
    E('hit', t, { by: a.side, move: B.sup.move, el: mv.el, n, crit: false, tm, i: 0, of: 1, giant: true, braced: t.braced, text: '' });
    E('note', t, { text: t.braced ? `${t.name} was ready and blocked most of it!` : `Ouch! ${t.name} took the whole blast!` });
  }
  function stage(f, stat, n, E) {
    const before = f.st[stat], after = clamp(before + n, -3, 3);
    const nm = `${f.name}'s ${STAT_NAME[stat]}`;
    if (after === before) { E('stage', f, { stat, n: 0, text: `${nm} won't go any ${n > 0 ? 'higher' : 'lower'}!` }); return; }
    f.st[stat] = after; const d = after - before, big = Math.abs(d) >= 2 ? (Math.abs(d) >= 3 ? 'hugely ' : 'sharply ') : '';
    E('stage', f, { stat, n: d, text: `${nm} ${big}${d > 0 ? 'rose' : 'fell'}!` });
  }

  // ---------------- AI ----------------
  function scoreMove(me, foe, id, turn) {
    const mv = D.MOVES[id], fx = mv.fx, hpK = me.hp / me.max, miss = 1 - hpK;
    let s = 0;
    if (mv.pow > 0) {
      const est = baseDamage(me, foe, mv) * (fx.hits || 1) * hitChance(me, foe, id);
      s += Math.min(1.1, est / Math.max(1, foe.hp)) * 100;
      if (est >= foe.hp) s += 60;
      s += Math.min(40, est / foe.max * 60);
      if (fx.first && est >= foe.hp * 0.9) s += 40;
      if (fx.drain) s += miss * est / me.max * 60;
      if (fx.recoil) s -= est * fx.recoil / Math.max(1, me.hp) * 60;
    }
    if (fx.heal) {
      const h = Math.min(miss, fx.heal * healFactor(me));
      s += miss >= 0.45 ? h * 190 : h * 40;
      if (fx.once && miss < 0.5) s -= 60;
    }
    if (fx.cleanse && (me.status || me.stun)) s += 30;
    for (const bf of arr(fx.buff)) {
      const room = 3 - me.st[bf.stat]; if (room <= 0) continue;
      const w = { atk: 22, def: 16, spd: 10, eva: 16, acc: me.st.acc < 0 ? 16 : 5 }[bf.stat] || 10;
      s += Math.min(room, bf.n) * w * (turn <= 2 ? 1.3 : 0.7) * (hpK > 0.5 ? 1 : 0.35) * (me.st[bf.stat] >= 2 ? 0.3 : 1);
    }
    for (const db of arr(fx.debuff)) {
      const room = 3 + foe.st[db.stat]; if (room <= 0) continue;
      const w = { atk: 18, def: 18, spd: 9, eva: 8, acc: 16 }[db.stat] || 10;
      s += Math.min(room, db.n) * w * (turn <= 3 ? 1.1 : 0.6) * (foe.st[db.stat] <= -2 ? 0.3 : 1);
    }
    if (fx.status && mv.pow === 0) s += (fx.status.type === 'stun' ? foe.stun : foe.status) ? -20 : fx.status.chance * hitChance(me, foe, id) * 60;
    else if (fx.status) s += (foe.status ? 0 : fx.status.chance * 12);
    return s;
  }
  function aiChoose(b, me, smart) {
    const rng = b.rng, foe = me.foe;
    const opts = me.moves.filter(id => usable(me, id));
    if (!opts.length) return me.moves[0];
    // (used by the balance sims to play the player's side) snack when low, block a boss's giant attack when it's coming
    if (me.snack && !me.snack.used && me.hp / me.max < 0.4 && rng() < smart) return SNACK;
    if (foe.boss && foe.charging) {
      const br = opts.filter(isBrace);
      if (br.length && rng() < 0.5 + smart * 0.5) { let best = br[0], bs = -1e9; for (const id of br) { const sc = scoreMove(me, foe, id, b.turn + 1) + rng(); if (sc > bs) { bs = sc; best = id; } } return best; }
    }
    if (rng() < (1 - smart) * 0.5) return opts[Math.floor(rng() * opts.length)];
    let best = opts[0], bs = -1e9;
    for (const id of opts) {
      const sc = scoreMove(me, foe, id, b.turn + 1) * (1 + (rng() - 0.5) * 1.4 * (1 - smart));
      if (sc > bs) { bs = sc; best = id; }
    }
    return best;
  }

  // a league in either list: the Zombie leagues (D.LEAGUES) or the Plant Duel cups (D.PLANT_LEAGUES). di = a difficulty index 0..9
  function leagueOf(id) {
    let li = D.LEAGUES.findIndex(l => l.id === id);
    if (li >= 0) return { L: D.LEAGUES[li], li, di: Math.min(TUNE.npcMult.length - 1, li), plants: false, list: D.LEAGUES }; // (the difficulty tables have 10 steps; later leagues use the last)
    li = D.PLANT_LEAGUES.findIndex(l => l.id === id);
    return li >= 0 ? { L: D.PLANT_LEAGUES[li], li, di: Math.min(9, li * 2 + 1), plants: true, list: D.PLANT_LEAGUES } : null;
  }
  // ---------------- generated opponents (Tower) ----------------
  function srng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const hashStr = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  // A Tower opponent of total level lv: a zombie, or (on star floors) another gardener's plant. Deterministic for a seed.
  const TOWER_ZOMBIES = [['basic', 'flag', 'conehead', 'newspaper'], ['buckethead', 'screendoor', 'imp', 'disco'], ['duckytube', 'polevault', 'balloon', 'digger', 'jackbox'],
    ['football', 'pirate', 'mummy', 'ra', 'cowboy'], ['yeti', 'knight', 'robot', 'gargantuar']];
  function genNPC(seed, lv, o) {
    o = o || {};
    const r = srng(seed), pick = a => a[Math.floor(r() * a.length)];
    if (o.plant) {
      const ids = Object.keys(D.PLANTS), stage = lv >= D.EVO.bloomAt ? 2 : lv >= D.EVO.budAt ? 1 : 0;
      const spec = { name: o.name || pick(NPC_NAMES.concat(D.NAMES)), species: pick(ids), stage, lv };
      if (lv >= 20) spec.element = pick(Object.keys(D.ELEMENT_INFO));
      if (lv >= 60 && r() < 0.6) spec.fuse = r() < 0.5 ? { item: pick(Object.keys(D.FUSION_ITEMS)) } : { with: pick(ids) };
      if (o.skin) spec.skin = o.skin;
      return ST.makePlantNPC(spec);
    }
    const band = TOWER_ZOMBIES[Math.min(TOWER_ZOMBIES.length - 1, Math.floor(lv / 50))], z = pick(band);
    return ST.makeZombie(z, lv, null, o.skin ? { skin: o.skin } : null);
  }
  function towerNPC(seed, f) {
    const star = f % 5 === 0;
    return genNPC(seed * 31 + f * 977, TOWER.lv(f), { plant: star, skin: star && f >= 15 ? ['gold', 'crystal', 'galaxy', 'rainbow'][Math.floor(f / 5) % 4] : null });
  }

  // League opponents come from state.makeNPC, which doesn't cap stats. Real plants max out at 50 per stat, so the late leagues
  // move any extra into the other stats (total level unchanged). The original six leagues never go over 50, so they're untouched.
  function leagueNPC(leagueId, index) {
    const s = ST.makeNPC(leagueId, index), M = D.GROWTH.maxLevel; let spill = 0;
    for (const st of D.STATS) if (s.stats[st].lv > M) { spill += s.stats[st].lv - M; s.stats[st].lv = M; }
    for (const st of D.STATS.slice().sort((a, b) => s.stats[b].lv - s.stats[a].lv)) { if (spill <= 0) break; const add = Math.min(spill, M - s.stats[st].lv); s.stats[st].lv += add; spill -= add; }
    return s;
  }
  // One builder for every kind of opponent, used by the real battles and by the estimates, so they always agree.
  // spec: {kind:'league', id, i} | {kind:'wild', id, step} | {kind:'boss', id} | {kind:'tower', seed, floor, hp}
  // (spec.npc: an already-built opponent plant, so a batch of sims builds it once)
  function foeBattle(sP, spec, opts) {
    opts = Object.assign({}, opts);
    if (spec.kind === 'league') {
      const G = leagueOf(spec.id), o = G.L.opponents[spec.i];
      const k = typeof o.k === 'number' ? { hp: o.k, atk: o.k } : o.k || null; // data.js: HP and Attack × k
      return newBattle(sP, spec.npc || leagueNPC(spec.id, spec.i), Object.assign(opts, { npcMult: TUNE.npcMult[G.di], k, smart: TUNE.aiSmart[G.di] }));
    }
    if (spec.kind === 'wild') return newBattle(sP, null, Object.assign(opts, { wild: { id: spec.id, step: spec.step } }));
    if (spec.kind === 'boss') return newBattle(sP, null, Object.assign(opts, { boss: spec.id }));
    const f = spec.floor, b = newBattle(sP, spec.npc || towerNPC(spec.seed, f), Object.assign(opts, { npcMult: TOWER.mult(f), smart: TOWER.smart(f) }));
    b.p.hp = Math.max(1, Math.round(b.p.max * (Number.isFinite(spec.hp) ? clamp(spec.hp, 0, 1) : 1))); // at least 1 HP
    return b;
  }
  const leagueBattle = (sP, id, i, opts) => foeBattle(sP, { kind: 'league', id, i }, opts);
  // Honest matchup estimate: n quick fights with kid-level play for the player (no snack). Seeded, so the same plant
  // against the same opponent always gets the same answer.
  const KID = 0.5;
  function estimate(sP, spec, n, seed) {
    n = n || 36; const rng = srng(seed == null ? 12345 : seed);
    const fixed = spec.kind === 'league' ? Object.assign({ npc: leagueNPC(spec.id, spec.i) }, spec) : spec.kind === 'tower' ? Object.assign({ npc: towerNPC(spec.seed, spec.floor) }, spec) : spec;
    let w = 0, turns = 0;
    for (let i = 0; i < n; i++) {
      const b = foeBattle(sP, fixed, { rng, sim: true });
      while (!b.over && b.turn < 60) resolveRound(b, aiChoose(b, b.p, KID), aiChoose(b, b.o, b.smart));
      w += b.winner === 'p'; turns += b.turn;
    }
    return { win: w / n, turns: turns / n };
  }
  // ---------------- headless sim (balance) ----------------
  function simBattle(sP, sO, oppSmart, pSmart, maxTurns, npcMult) {
    const b = newBattle(sP, sO, { npcMult });
    while (!b.over && b.turn < (maxTurns || 40)) resolveRound(b, aiChoose(b, b.p, pSmart), aiChoose(b, b.o, oppSmart));
    return { won: b.winner === 'p', turns: b.turn, hpLeft: b.p.hp / b.p.max };
  }
  function sim(sP, leagueId, index, n, pSmart) {
    const spec = { kind: 'league', id: leagueId, i: index, npc: leagueNPC(leagueId, index) };
    let w = 0, turns = 0; n = n || 300;
    for (let i = 0; i < n; i++) { const b = foeBattle(sP, spec); while (!b.over && b.turn < 40) resolveRound(b, aiChoose(b, b.p, pSmart == null ? 0.85 : pSmart), aiChoose(b, b.o, b.smart)); w += b.winner === 'p'; turns += b.turn; }
    return { win: +(w / n).toFixed(2), turns: +(turns / n).toFixed(1) };
  }
  const simSnack = () => ({ fruit: 'apple', name: 'Heart Apple', heal: TUNE.snackHeal, used: false });
  function simBoss(sP, bossId, n, pSmart, snack) {
    let w = 0, turns = 0, blocked = 0, supers = 0; n = n || 200; pSmart = pSmart == null ? 0.85 : pSmart;
    for (let i = 0; i < n; i++) {
      const b = newBattle(sP, null, { boss: bossId });
      if (snack) b.p.snack = simSnack();
      while (!b.over && b.turn < 60) {
        const ev = resolveRound(b, aiChoose(b, b.p, pSmart), aiChoose(b, b.o, b.smart));
        for (const e of ev) if (e.giant && e.type === 'hit') { supers++; if (e.braced) blocked++; }
      }
      w += b.winner === 'p'; turns += b.turn;
    }
    return { win: +(w / n).toFixed(2), turns: +(turns / n).toFixed(1), blocked: supers ? +(blocked / supers).toFixed(2) : null };
  }
  function simTower(sP, n, pSmart, snack) {
    const floors = []; n = n || 60; pSmart = pSmart == null ? 0.85 : pSmart;
    for (let i = 0; i < n; i++) {
      let f = 1, hp = 1, sn = snack ? simSnack() : null; const seed = 1000 + i;
      for (; f < 120; f++) {
        const b = newBattle(sP, towerNPC(seed, f), { npcMult: TOWER.mult(f), smart: TOWER.smart(f) });
        b.p.hp = Math.max(1, Math.round(b.p.max * hp)); if (sn) b.p.snack = sn;
        while (!b.over && b.turn < 40) resolveRound(b, aiChoose(b, b.p, pSmart), aiChoose(b, b.o, b.smart));
        if (b.winner !== 'p') break;
        hp = Math.min(1, b.p.hp / b.p.max + TOWER.heal);
      }
      floors.push(f - 1);
    }
    floors.sort((a, b) => a - b);
    return { avg: +(floors.reduce((a, b) => a + b, 0) / n).toFixed(1), median: floors[Math.floor(n / 2)], best: floors[n - 1], worst: floors[0] };
  }

  function simWild(sP, id, step, n, pSmart) {
    let w = 0, turns = 0; n = n || 200;
    for (let i = 0; i < n; i++) { const b = newBattle(sP, null, { wild: { id, step } }); while (!b.over && b.turn < 40) resolveRound(b, aiChoose(b, b.p, pSmart == null ? 0.85 : pSmart), aiChoose(b, b.o, b.smart)); w += b.winner === 'p'; turns += b.turn; }
    return { win: +(w / n).toFixed(2), turns: +(turns / n).toFixed(1), lv: wildLv(id, step) };
  }

  const engine = { TUNE, BOSSES, TOWER, WILD, makeWild, wildLv, wildList, simWild, makeFighter, makeBoss, newBattle, resolveRound, aiChoose, scoreMove, typeMult, hitChance, baseDamage, isBrace,
    simBattle, sim, simBoss, simTower, genNPC, towerNPC, leagueNPC, foeBattle, leagueBattle, estimate, srng, SNACK, KID };
  window.__battle = { engine };

  // ======================================================================
  // Save helpers (new, optional fields only)
  // ======================================================================
  // PS.S.progress.battleExtra = { bosses:{id:{wins,tries,best}}, tower:{best,runs,run}, friend:{day,paid,played}, snack, seen:{},
  //                             wild:{animals:{id:[littleWins,bigWins,alphaWins]}, areas:{areaId:true when every Alpha is beaten}} }
  function extra() {
    const p = PS.S.progress || (PS.S.progress = { races: {}, leagues: {} });
    let e = p.battleExtra;
    if (!e || typeof e !== 'object') e = p.battleExtra = {};
    if (!e.bosses || typeof e.bosses !== 'object') e.bosses = {};
    if (!e.tower || typeof e.tower !== 'object') e.tower = {};
    const T = e.tower; if (typeof T.best !== 'number') T.best = 0; if (typeof T.runs !== 'number') T.runs = 0; if (T.run === undefined) T.run = null;
    if (!e.friend || typeof e.friend !== 'object') e.friend = {};
    if (!e.seen || typeof e.seen !== 'object') e.seen = {};
    if (!e.wild || typeof e.wild !== 'object') e.wild = {};
    if (!e.wild.animals || typeof e.wild.animals !== 'object') e.wild.animals = {};
    if (!e.wild.areas || typeof e.wild.areas !== 'object') e.wild.areas = {};
    return e;
  }
  const bossRec = id => Object.assign({ wins: 0, tries: 0, best: null }, extra().bosses[id]);
  function bossUnlocked(B) {
    const u = B.unlock || {};
    if (u.league) return ST.leagueProgress(u.league).cleared;
    if (u.boss) return bossRec(u.boss).wins > 0;
    return true;
  }
  function unlockText(B) {
    const u = B.unlock || {};
    if (u.league) return `Clear the ${(D.LEAGUES.find(l => l.id === u.league) || {}).name || 'league'} to unlock`;
    if (u.boss) return `Beat the ${BOSS[u.boss].name} to unlock`;
    return '';
  }
  const towerUnlocked = () => ST.leagueProgress(TOWER.unlock).cleared;
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

  // ======================================================================
  // UI
  // ======================================================================
  if (typeof document === 'undefined' || !document.createElement) return; // headless (balance sims)
  PS.scenes = PS.scenes || {};
  const PX = window.PX;
  const INK = PX.INK;
  const LEAGUE_AREA = { lawn: 'frontyard', backyard: 'backyard', night: 'graveyard', pool: 'backyard', roof: 'frontyard', egypt: 'egypt', pirate: 'pirate', frost: 'snow', darkages: 'volcano', future: 'tower',
    west: 'west', lostcity: 'lostcity', beach: 'bigwave', jurassic: 'jurassic', neon: 'neon', modern: 'modern',
    seedling: 'frontyard', sprout: 'backyard', bloom: 'graveyard', masters: 'pirate', champion: 'egypt' };
  // battle effects were drawn for 9 element styles; each PVZ type borrows the closest one
  const FXEL = { plant: 'leaf', fire: 'fire', water: 'water', ice: 'sky', electric: 'light', laser: 'light', poison: 'shadow', magic: 'sweet', dark: 'shadow', rock: 'stone', robot: 'stone', normal: 'normal' };
  const safe = (fn, fb) => { try { const v = fn(); return v == null ? fb : v; } catch (e) { return fb; } };
  const sfx = n => safe(() => PX.Sound.play(n));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const elColor = el => (D.ELEMENTS[el] || D.ELEMENTS.normal).color;
  const elLabel = el => (D.ELEMENTS[el] || D.ELEMENTS.normal).label;
  const eggName = k => (D.SEEDS[k] || {}).name || 'Seed packet';
  const eggKey = e => (e ? e.kind + ':' + e.species : 'normal');
  // what clearing a league (or cup) unlocks: a species id, or null
  // the plant a league's clear reward unlocks; 'starter' means one of the starters the player didn't pick
  const leagueUnlock = L => {
    const un = D.UNLOCKS[(D.LEAGUES.includes(L) ? 'league:' : 'cup:') + L.id] || null;
    return un === 'starter' ? D.STARTERS.find(x => !ST.isUnlocked(x)) || D.STARTERS.find(x => x !== PS.S.starter) || D.STARTERS[0] : un;
  };
  const aOrAn = w => (/^[aeiou]/i.test(w) ? 'an' : 'a'); // "an Eclipse Egg", "an Owl"
  const areaName = a => (D.AREAS[a] ? D.AREAS[a].name : 'Garden');
  const SIDES = ['p', 'o'];
  // prefers-reduced-motion: no screen shake, and soft instead of bright full-screen flashes
  const RM = safe(() => window.matchMedia('(prefers-reduced-motion: reduce)'), null);
  const calm = () => !!(RM && RM.matches);
  // remove dead items from an array in place (no new array every frame)
  function keep(a, alive) { let j = 0; for (let i = 0; i < a.length; i++) if (alive(a[i])) a[j++] = a[i]; a.length = j; }
  const partAlive = p => p.life > 0, popAlive = p => p.t < p.life;
  const ambAlive = p => p.life > 0 && p.x > -20 && p.x < WW + 30 && p.y < WH + 6 && p.y > -10;

  // ---------------- matchup estimates (pre-battle "Easy / Fair / Tough / Very tough") ----------------
  // A quick seeded sim with kid-level play, cached per plant (its levels, moves and elements) and opponent.
  const estCache = new Map();
  const sproutSig = s => `${s.id}:${D.STATS.map(k => s.stats[k].lv).join(',')}:${ST.movesOf(s).join(',')}:${ST.elementsOf(s).join(',')}`;
  const specKey = sp => (sp.kind === 'league' ? `L:${sp.id}:${sp.i}` : sp.kind === 'boss' ? `B:${sp.id}` : `T:${sp.seed}:${sp.floor}:${Math.round((sp.hp == null ? 1 : sp.hp) * 20)}`);
  function matchup(s, spec, n) {
    n = n || 36;
    const key = `${sproutSig(s)}|${specKey(spec)}|${n}`;
    let e = estCache.get(key);
    if (!e) { e = safe(() => estimate(s, spec, n, hashStr(key)), { win: 0.5, turns: 10 }); if (estCache.size > 300) estCache.clear(); estCache.set(key, e); }
    return e;
  }
  const ODDS = [{ min: 0.8, word: 'Easy', c: 'easy' }, { min: 0.55, word: 'Fair', c: 'fair' }, { min: 0.25, word: 'Tough', c: 'tough' }, { min: -1, word: 'Very tough', c: 'vtough' }];
  const oddsOf = w => ODDS.find(o => w >= o.min);
  // one short reason, from the types first (what a kid can act on), then levels and healing
  function matchReason(s, spec, win) {
    const b = safe(() => foeBattle(s, spec, { sim: true }), null); if (!b) return '';
    const P = b.p, O = b.o, good = win >= 0.55, me = esc(P.name), foe = esc(O.boss ? 'The ' + O.name : O.name), gap = O.lv - P.lv;
    const atk = f => f.moves.map(id => D.MOVES[id]).filter(m => m && m.pow > 0);
    const hit = atk(P).find(m => typeMult(m.el, O.els) > 1), hurt = atk(O).find(m => typeMult(m.el, P.els) > 1);
    const weak = atk(P).length && atk(P).every(m => typeMult(m.el, O.els) < 1);
    const hitText = () => { const on = O.els.find(d => (D.ELEMENTS[hit.el] || { strong: [] }).strong.includes(d)) || O.els[0]; return `${foe} is ${elLabel(on)} — ${elLabel(hit.el)} moves hit it hard!`; };
    if (good && hit) return hitText();
    if (!good && hurt) return `Watch out: ${foe}'s ${elLabel(hurt.el)} moves hit ${me} hard.`;
    if (!good && weak) return `${me}'s moves are weak against ${elLabel(O.els[0])}.`;
    if (!good && gap >= 5) return `${foe} is ${gap} levels higher.`;
    if (O.boss) return good ? 'Block its giant attack and you can win!' : 'Zombosses are really strong. Train more first?';
    if (!good && O.moves.some(id => D.MOVES[id] && D.MOVES[id].fx.heal)) return `${foe} can heal itself.`;
    if (good && gap <= -5) return `${me} is ${-gap} levels higher.`;
    if (hit) return hitText();
    return good ? 'A fair fight. Good luck!' : `${foe} is strong. Train a bit more first?`;
  }
  function oddsHtml(s, spec) {
    const e = matchup(s, spec), o = oddsOf(e.win), lvl = ODDS.indexOf(o);
    return `<div class="b-odds ${o.c}"><span class="b-pips" aria-hidden="true">${ODDS.map((x, i) => `<i class="${i <= lvl ? 'on' : ''}"></i>`).join('')}</span>
      <div><b>${o.word}</b><span>${matchReason(s, spec, e.win)}</span></div></div>`;
  }

  // ======================================================================
  // Rewards: prize() says what a battle pays (the previews show these same numbers) and grant() pays it exactly once,
  // the moment the battle is decided, so closing the app during the victory dance never loses a prize.
  // The results card only shows what grant() actually paid.
  // ======================================================================
  const BT = D.BATTLE, XP_SPLIT = BT.xpSplit || { power: 1.2, stamina: 1, run: 0.6, fly: 0.4, swim: 0.4 };
  const LOSE_XP = BT.loseXpShare == null ? 0.35 : BT.loseXpShare, WIN_STEP = BT.winCoinStep == null ? 0.25 : BT.winCoinStep, CLEAR = BT.clearCoins || 3;
  // won: true / false ('draw' for a Friend Battle draw). x: the battle (V) or the same fields for a preview.
  function prize(kind, x, won) {
    const xk = won === true ? 1 : LOSE_XP, lose = BT.loseCoinsShare;
    if (kind === 'league') return { coins: won ? x.L.coins * (1 + x.index * WIN_STEP) : x.L.coins * lose, xp: x.L.xp * xk };
    if (kind === 'cup') return prize('league', x, won);
    if (kind === 'boss') return { coins: x.boss.coins * (won ? 1 : lose), xp: x.boss.xp * xk };
    if (kind === 'wild') { const L = wildLv(x.wild.id, x.wild.step); return { coins: WILD.coins(L) * (won ? 1 : lose), xp: WILD.xp(L) * xk }; }
    if (kind === 'tower') return { coins: won ? TOWER.coins(x.floor) : 0, xp: TOWER.xp(x.floor) * xk }; // tower coins go into the prize bag
    if (kind === 'friend') return { coins: won === 'draw' ? FRIEND.coinsDraw : won ? FRIEND.coinsWin : FRIEND.coinsLose, xp: FRIEND.xp };
    return { coins: 0, xp: 0 };
  }
  const leagueClearCoins = L => L.coins * CLEAR;
  const alphaBonus = L => WILD.coins(L) * 2, pouchFullCoins = L => 20 + L * 2;
  const xpCum = [0];
  const cumXp = lv => { while (xpCum.length <= lv) xpCum.push(xpCum[xpCum.length - 1] + D.GROWTH.xpForLevel(xpCum.length - 1)); return xpCum[lv]; };
  const xpOf = s => D.STATS.reduce((t, k) => t + (s.stats[k] ? cumXp(s.stats[k].lv) + (s.stats[k].xp || 0) : 0), 0);
  // coins + XP (spread over the stats) + the battle record. Returns what was really paid (XP is measured, so any
  // happy bonus is included and XP past the max level isn't counted).
  function payout(s, coins, xp, why, won, count) {
    const x0 = xpOf(s), happy = typeof ST.happyBonus === 'function' && safe(() => ST.happyBonus(s), 1) > 1;
    const got = coins > 0 ? ST.addCoins(coins, why) : 0;
    const gives = {}; for (const k of Object.keys(XP_SPLIT)) gives[k] = xp * XP_SPLIT[k];
    const r = ST.gain(s, gives) || {};
    if (count !== false) {
      s.record = s.record || {}; s.record.battles = (s.record.battles || 0) + 1; PS.S.totals.battles = (PS.S.totals.battles || 0) + 1;
      if (won) { s.record.battleWins = (s.record.battleWins || 0) + 1; PS.S.totals.battleWins = (PS.S.totals.battleWins || 0) + 1; }
    }
    return { coins: got, xp: Math.max(0, Math.round(xpOf(s) - x0)), ups: r.ups || {}, evolved: r.evolved, happy, maxed: ST.totalLevels(s) >= D.STATS.length * D.GROWTH.maxLevel };
  }

  const CSS = `
.b-hub,.b-fight{font-variant-ligatures:none}
.b-hub .label,.b-snackrow .label{font-family:var(--f-ui);font-weight:700;font-size:14px;letter-spacing:0;text-transform:none;color:var(--ink)}
.b-res .eyebrow,.b-pass .eyebrow{font-family:var(--f-ui);font-weight:700;font-size:14px;letter-spacing:0;text-transform:none}
.b-mv .n.sm{font-size:14.5px}
.b-hub{position:absolute;inset:0;overflow-y:auto;-webkit-overflow-scrolling:touch;touch-action:pan-y;padding:12px 12px 24px}
.b-hub .panel{padding:12px 14px;margin-bottom:12px}
.b-top{display:flex;align-items:flex-end;justify-content:space-between;margin:2px 4px 10px}
.b-top h1{font-family:var(--f-px);font-weight:700;font-size:26px;margin:0;color:var(--ink)}
.b-top .b-rec{font-family:var(--f-ui);font-weight:700;font-size:15px;color:var(--ink)}
.b-tabs{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin:0 0 12px}
.b-tab{position:relative;display:flex;flex-direction:column;align-items:center;gap:1px;min-height:62px;padding:5px 1px 4px;border-radius:14px;border:2px solid var(--line);border-bottom-width:5px;background:var(--panel);font-family:var(--f-ui);font-weight:700;font-size:14px;color:var(--ink);min-width:0}
.b-tab canvas{width:32px;height:32px}
.b-tab[aria-selected="true"]{background:var(--sun);border-color:var(--sun-edge);color:#4a3210}
.b-tab:active{transform:translateY(3px);border-bottom-width:2px;margin-bottom:3px}
.b-tab .dot{position:absolute;top:2px;right:3px;font-family:var(--f-ui);font-size:12.5px;line-height:15px;padding:0 4px;border-radius:6px;background:var(--berry);color:#fff;border:1px solid #fff;font-weight:700}
.b-ph{display:grid;grid-template-columns:76px 1fr auto;gap:10px;align-items:center}
.b-psprite{width:76px;height:76px;background:var(--slot);border-radius:16px;border:2px solid var(--line)}
.b-pname{font-size:22px;color:var(--ink)}
.b-pform{font-size:15px;color:var(--ink);margin:1px 0 4px}
.b-chips{display:flex;flex-wrap:wrap;gap:4px}
.b-chip{display:inline-flex;align-items:center;gap:4px;border-radius:8px;padding:1px 7px 1px 4px;font-family:var(--f-ui);font-weight:700;font-size:13px;color:#fff;background:var(--c);border:2px solid rgba(34,32,52,.25)}
.b-chip canvas{width:12px;height:12px;background:#fffdf6;border-radius:50%;padding:1px;box-sizing:content-box}
.b-mlist{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px}
.b-mrow{display:grid;grid-template-columns:16px 1fr;gap:2px 6px;align-items:center;background:color-mix(in srgb,var(--c) 14%,#fffdf6);border:2px solid color-mix(in srgb,var(--c) 55%,#e3cf9d);border-radius:12px;padding:5px 8px;text-align:left}
.b-mrow canvas{width:14px;height:14px;grid-row:span 2}
.b-mrow b{font-family:var(--f-ui);font-weight:700;font-size:15px;line-height:1.1;color:var(--ink)}
.b-mrow small{font-size:14px;color:var(--ink);line-height:1.2}
.b-how{font-size:14px;line-height:1.4;color:var(--ink-soft);margin:0}
.b-howrow{display:flex;align-items:center;gap:10px;margin:10px 2px 0}.b-howrow .btn{flex:0 0 auto;padding:8px 12px;font-size:15px}
.b-lg header{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.b-lname{font-size:20px;color:var(--ink)}
.b-lsub{font-family:var(--f-ui);font-weight:700;font-size:14px;color:var(--ink);margin-top:2px}
.b-lsub.done{color:var(--accent)}
.b-rw{display:flex;flex-direction:column;align-items:flex-end;gap:3px;font-family:var(--f-ui);font-weight:700;font-size:13.5px;color:var(--ink)}
.b-rw span{display:inline-flex;align-items:center;gap:4px;background:var(--slot);border-radius:8px;padding:2px 7px}
.b-rw canvas{width:12px;height:12px}
.b-rw canvas.egg{width:12px;height:14px}
.b-opps{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}
.b-opp{position:relative;display:flex;flex-direction:column;align-items:center;gap:0;background:var(--field);border:2px solid var(--line);border-bottom-width:4px;border-radius:14px;padding:4px 2px 6px}
.b-opp canvas{width:56px;height:56px}
.b-opp b{font-family:var(--f-ui);font-weight:700;font-size:15px;line-height:1.1}
.b-opp small{font-size:14px;color:var(--ink)}
.b-opp.next{border-color:var(--sun-edge);background:#fff6d6;box-shadow:0 0 0 2px var(--sun) inset}
.b-opp.beaten{background:#eef8e6;border-color:#9cd08a}
.b-opp[disabled]{opacity:.5}
.b-opp .b-tick{position:absolute;top:4px;right:4px;width:18px;height:18px}
.b-lg.locked .b-opps{filter:grayscale(1) brightness(.9);opacity:.55}
.b-lockline{display:flex;align-items:center;gap:6px;margin-top:8px;font-family:var(--f-ui);font-weight:700;font-size:14px;color:var(--ink)}
.b-lockline canvas{width:14px;height:16px}
.b-empty{text-align:center;padding:30px 20px}
.b-empty p{font-size:16px}
.b-areas{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:0 0 10px}
.b-area{position:relative;display:flex;flex-direction:column;align-items:center;gap:1px;padding:5px 2px 4px;border-radius:12px;border:2px solid var(--line);border-bottom-width:4px;background:var(--field);font-family:var(--f-ui);font-weight:700;font-size:14px;color:var(--ink)}
.b-area canvas{width:36px;height:36px}
.b-area small{font-family:var(--f-ui);font-weight:600;font-size:14px;color:var(--ink)}
.b-area.on{background:#eef8e6;border-color:var(--accent);box-shadow:0 0 0 2px #99e550 inset}
.b-area.locked canvas{filter:brightness(0) opacity(.4)}
.b-area.locked{color:var(--ink-soft)}
.b-area .done{position:absolute;top:2px;right:3px;width:14px;height:14px}
.b-wgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}
.b-wc{position:relative;display:flex;flex-direction:column;align-items:center;background:var(--field);border:2px solid var(--line);border-bottom-width:4px;border-radius:14px;padding:3px 2px 6px;min-width:0}
.b-wc:active{transform:translateY(3px);border-bottom-width:1px;margin-bottom:3px}
.b-wc canvas{width:48px;height:48px}
.b-wc b{font-family:var(--f-ui);font-weight:700;font-size:15px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.b-wc small{font-size:14px;color:var(--ink);line-height:1.2}
.b-wc.done{background:#fff6d6;border-color:var(--sun-edge)}
.b-stars{display:flex;gap:2px;margin:2px 0 1px}
.b-stars canvas{width:14px;height:14px}
.b-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:8px 0 6px}
.b-stp{display:flex;flex-direction:column;align-items:center;gap:0;border-radius:12px;border:2px solid var(--line);border-bottom-width:4px;background:var(--field);padding:5px 2px;font-family:var(--f-ui);font-weight:700;font-size:16px;color:var(--ink)}
.b-stp small{font-family:var(--f-ui);font-weight:600;font-size:14px;color:var(--ink)}
.b-stp.on{background:#eef8e6;border-color:var(--accent);box-shadow:0 0 0 2px #99e550 inset}
.b-stp[disabled]{opacity:.45}
.b-champ{display:flex;align-items:center;gap:10px;background:linear-gradient(180deg,#fff1bf,#ffe08a);border:2px solid var(--sun-edge);border-bottom-width:5px;border-radius:18px;padding:8px 12px;margin:0 0 12px}
.b-champ canvas{width:48px;height:48px}
.b-champ b{font-family:var(--f-px);font-size:20px;color:#4a3210;display:block}
.b-champ small{font-size:14px;color:#6a4a10;line-height:1.3;display:block}
.b-intro{font-size:15px;line-height:1.4;color:var(--ink);margin:-2px 4px 10px}
.b-intro b{color:var(--ink)}
.b-legs{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
.b-leg{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;padding:6px 6px 9px;border-radius:18px;border:2px solid var(--px-ink);border-bottom-width:5px;background:linear-gradient(180deg,var(--c1),var(--c2));color:#fff;overflow:hidden}
.b-leg:active:not(.locked){transform:translateY(3px);border-bottom-width:2px;margin-bottom:3px}
.b-leg canvas.big{width:96px;height:96px;margin:-2px 0 -4px}
.b-leg b{font-family:var(--f-px);font-weight:700;font-size:20px;line-height:1;text-shadow:0 2px 0 rgba(34,32,52,.6)}
.b-leg .t{font-family:var(--f-ui);font-weight:700;font-size:14px;opacity:.95;text-shadow:0 1px 0 rgba(34,32,52,.6);margin-top:1px}
.b-leg .st{margin-top:6px;display:inline-flex;align-items:center;gap:4px;font-family:var(--f-ui);font-weight:700;font-size:14px;line-height:18px;border-radius:8px;padding:2px 8px;background:rgba(255,248,230,.95);color:var(--ink);border:1px solid rgba(34,32,52,.4)}
.b-leg .st canvas{width:16px;height:16px}
.b-leg .st.win{background:#eef8e6;color:#1f6232}
.b-leg .st.new{background:var(--sun);color:#4a3210}
.b-leg.locked{filter:grayscale(.85) brightness(.8)}
.b-leg.locked canvas.big{filter:brightness(0) opacity(.55)}
.b-leg .lk{font-family:var(--f-ui);font-weight:700;font-size:14px;line-height:1.2;margin-top:5px;background:rgba(34,32,52,.55);border-radius:8px;padding:3px 6px}
.b-tw{display:grid;grid-template-columns:84px 1fr;gap:12px;align-items:start}
.b-tw canvas.art{width:84px;height:132px}
.b-tw h2{font-family:var(--f-px);font-weight:700;font-size:22px;margin:0;color:var(--ink)}
.b-tw .best{display:inline-flex;align-items:center;gap:5px;font-family:var(--f-ui);font-weight:700;font-size:15px;background:#fff1bf;border:2px solid var(--sun-edge);border-radius:10px;padding:2px 9px;margin:4px 0 6px;color:#4a3210}
.b-tw p{margin:0 0 6px;font-size:15px;line-height:1.35;color:var(--ink)}
.b-treats{display:grid;gap:4px;margin:8px 0 2px}
.b-treat{display:flex;align-items:center;gap:7px;background:var(--slot);border-radius:10px;padding:4px 8px;font-size:14px;font-weight:600;color:var(--ink)}
.b-treat b{font-family:var(--f-ui);font-size:14px;min-width:64px;font-weight:700}
.b-treat canvas{width:16px;height:16px}
.b-treat canvas.egg{width:14px;height:17px}
.b-btns{display:grid;gap:8px;margin-top:12px}
.b-runbox{background:#eef4ff;border:2px solid #9fb8e8;border-radius:14px;padding:8px 10px;margin-top:10px;display:grid;grid-template-columns:48px 1fr;gap:8px;align-items:center}
.b-runbox canvas{width:48px;height:48px}
.b-runbox b{font-family:var(--f-ui);font-size:17px;color:var(--ink);font-weight:700}
.b-runbox small{display:block;font-size:14px;color:var(--ink);line-height:1.3}
.b-runbox.paused{background:#fff6d6;border-color:var(--sun-edge)}
.b-fr .vs{display:flex;align-items:center;justify-content:center;gap:4px;margin:4px 0 8px}
.b-fr .vs canvas{width:84px;height:84px}
.b-fr .vs b{font-family:var(--f-px);font-weight:700;font-size:26px;color:#c0612a}
.b-fr h2{font-family:var(--f-px);font-weight:700;font-size:22px;margin:0 0 4px;text-align:center;color:var(--ink)}
.b-fr p{margin:0 0 6px;font-size:15px;line-height:1.4;color:var(--ink);text-align:center}
.b-fr ol{margin:8px 0 0;padding:0;list-style:none;display:grid;gap:6px;counter-reset:s}
.b-fr ol li{display:grid;grid-template-columns:24px 1fr;gap:8px;font-size:15px;line-height:1.35;counter-increment:s;color:var(--ink)}
.b-fr ol li::before{content:counter(s);display:grid;place-items:center;width:22px;height:22px;border-radius:7px;background:var(--sun);border:2px solid var(--sun-edge);font-family:var(--f-ui);font-weight:700;font-size:13px;color:#4a3210}
.b-snackrow{margin:10px 0 2px;text-align:left}
.b-snackrow .label span{text-transform:none;letter-spacing:0;font-family:var(--f-ui);font-weight:600;color:var(--accent)}
.b-snacks{display:flex;gap:6px;overflow-x:auto;padding:4px 1px 4px;-webkit-overflow-scrolling:touch;touch-action:pan-x}
.b-sn{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;min-width:52px;height:54px;border-radius:12px;border:2px solid var(--line);border-bottom-width:4px;background:var(--field);font-family:var(--f-ui);font-weight:700;font-size:14px;color:var(--ink)}
.b-sn canvas{width:26px;height:26px}
.b-sn small{font-size:13px;line-height:1;color:var(--ink);font-weight:700}
.b-sn.on{background:#eef8e6;border-color:var(--accent);box-shadow:0 0 0 2px #99e550 inset}
.b-snone{font-size:14px;color:var(--ink-soft);margin:2px 0 0}
.b-mini{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin:4px 0 8px}
.b-mini span{font-family:var(--f-ui);font-weight:700;font-size:14px;background:var(--slot);border-radius:8px;padding:2px 8px}
.b-odds{display:flex;align-items:center;gap:9px;margin:8px 0 6px;padding:6px 10px;border-radius:12px;border:2px solid var(--oc);background:color-mix(in srgb,var(--oc) 16%,#fffdf6);text-align:left}
.b-odds b{display:block;font-family:var(--f-ui);font-weight:700;font-size:17px;line-height:1.15;color:var(--ink)}
.b-odds div span{display:block;font-size:14px;line-height:1.3;color:var(--ink)}
.b-odds .b-pips{display:flex;align-items:flex-end;gap:2px;flex:0 0 auto}
.b-pips i{display:block;width:6px;border-radius:2px;background:#e3dccb;border:1px solid rgba(34,32,52,.35)}
.b-pips i:nth-child(1){height:8px}.b-pips i:nth-child(2){height:12px}.b-pips i:nth-child(3){height:16px}.b-pips i:nth-child(4){height:20px}
.b-pips i.on{background:var(--oc)}
.b-odds.easy,.b-ow.easy{--oc:#6abe30}.b-odds.fair,.b-ow.fair{--oc:#f6c83a}.b-odds.tough,.b-ow.tough{--oc:#df7126}.b-odds.vtough,.b-ow.vtough{--oc:#e5535f}
.b-ow{font-family:var(--f-ui);font-weight:700;border-radius:6px;padding:0 5px;background:var(--oc);color:#fff;text-shadow:0 1px 0 rgba(34,32,52,.4)}
.b-why{background:#fff6d6;border:2px solid var(--sun-edge);border-radius:12px;padding:7px 10px;margin:2px 0 8px;text-align:left;font-size:15px;line-height:1.35;color:var(--ink)}
.b-why b{display:block;font-family:var(--f-ui);font-weight:700}
.b-why span{display:block}.b-why i{font-style:normal;font-weight:700;color:var(--accent)}
.b-alt{display:grid;grid-template-columns:44px 1fr;gap:4px 8px;align-items:center;background:#eef8e6;border:2px solid var(--accent);border-radius:12px;padding:6px 8px 8px;margin:0 0 8px;text-align:left}
.b-alt canvas{width:44px;height:44px}
.b-alt b{display:block;font-family:var(--f-ui);font-weight:700;font-size:16px;color:var(--ink)}
.b-alt small{display:block;font-size:14px;line-height:1.3;color:var(--ink)}
.b-alt .btn{grid-column:1 / -1}
.b-happy{font-family:var(--f-ui);font-weight:700;font-size:12.5px;border-radius:6px;padding:0 5px;margin-left:4px;background:#f7b6c8;color:#6a1f3e}

.b-fight{position:absolute;inset:0;display:flex;flex-direction:column;background:#222034}
.b-arena{position:relative;flex:1 1 auto;min-height:0;overflow:hidden}
.b-cv{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;image-rendering:crisp-edges}
.b-plate{position:absolute;width:min(48%,210px);background:rgba(255,248,230,.96);border:2px solid var(--edge);border-bottom-width:4px;border-radius:14px;padding:5px 9px 5px;box-shadow:0 3px 0 rgba(34,32,52,.25);pointer-events:none;transition:opacity .3s}
.b-plate.o{top:10px;left:10px}
.b-plate.p{right:10px;bottom:12px}
.b-own{font-family:var(--f-ui);font-weight:700;font-size:13px;letter-spacing:0;text-transform:none;color:#c0612a;line-height:1.15}
.b-prow{display:flex;justify-content:space-between;align-items:baseline;gap:6px}
.b-prow b{font-family:var(--f-ui);font-weight:700;font-size:17px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.b-pels{display:flex;gap:2px;flex:0 0 auto;margin-right:auto;align-self:center}
.b-pels canvas{width:14px;height:14px;display:block}
.b-prow .b-lv{font-family:var(--f-ui);font-weight:700;font-size:14px;color:var(--ink);white-space:nowrap}
.b-hp{display:flex;align-items:center;gap:5px;margin-top:3px}
.b-hp em{font-family:var(--f-ui);font-style:normal;font-weight:700;font-size:12.5px;color:#fff;background:#c0612a;border-radius:4px;padding:0 3px;line-height:15px}
.b-hpbar{flex:1;height:10px;background:#3a3350;border:2px solid var(--px-ink);border-radius:3px;overflow:hidden;position:relative}
.b-hpbar i{position:absolute;left:0;top:0;bottom:0;width:100%;background:#6abe30;box-shadow:inset 0 2px 0 rgba(255,255,255,.35),inset 0 -2px 0 rgba(0,0,0,.18)}
.b-hpbar i.mid{background:#f6c83a}.b-hpbar i.low{background:#e5535f}
.b-hpbar::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 7px,rgba(34,32,52,.28) 7px 8px)}
.b-prow2{display:flex;justify-content:space-between;align-items:center;gap:4px;margin-top:3px;min-height:16px}
.b-hpn{white-space:nowrap;flex:0 0 auto}
.b-hpn{font-family:var(--f-ui);font-weight:700;font-size:15px;color:var(--ink)}
.b-tags{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:3px}
.b-tag{font-family:var(--f-ui);font-weight:700;font-size:12.5px;line-height:16px;border-radius:4px;padding:0 5px;color:#fff;border:1px solid rgba(34,32,52,.4)}
.b-tag.up{background:#2b8243}.b-tag.down{background:#3f55b8}
.b-tag.poison{background:#9a6ad0}.b-tag.burn{background:#df5a26}.b-tag.sleep{background:#5b6ee1}.b-tag.stun{background:#e0a800;color:#3a2a00}
.b-tag.tired{background:#8c93a8}
.b-tag.charge{background:#e5535f;animation:bBlink .6s steps(2) infinite}
.b-plate.o.boss{left:10px;right:10px;width:auto;background:linear-gradient(180deg,#3a2a4a,#2a1e38);border-color:#fbf236;color:#fff;padding:5px 10px 6px}
.b-plate.boss .b-prow b{color:#fff27a;font-size:20px;letter-spacing:.02em;font-family:var(--f-px)}
.b-plate.boss .b-lv{color:#f6d2ad}
.b-plate.boss .b-sub{font-family:var(--f-ui);font-weight:700;font-size:14px;color:#dfe8fb;margin-top:-1px}
.b-plate.boss .b-hpbar{height:14px}
.b-plate.boss .b-hpbar i{background:#e5535f}.b-plate.boss .b-hpbar i.mid{background:#df7126}.b-plate.boss .b-hpbar i.low{background:#ac3232}
.b-plate.boss .b-hpn{color:#fff}
.b-plate.boss .b-hp em{background:#fbf236;color:#4a3210}
.b-fight.boss .b-run{top:92px}
.b-plate.boss .b-sub{display:inline;margin-left:4px}
.b-run{position:absolute;top:10px;right:10px;font-family:var(--f-ui);font-weight:700;font-size:14px;border-radius:10px;border:2px solid rgba(255,255,255,.55);background:rgba(34,32,52,.45);color:#fff;padding:5px 9px}
.b-run.armed{background:#e5535f;border-color:#fff}
.b-snack{position:absolute;right:10px;bottom:98px;display:flex;align-items:center;gap:6px;font-family:var(--f-ui);font-weight:700;font-size:16px;border-radius:14px;border:2px solid var(--accent-edge);border-bottom-width:5px;background:#eef8e6;color:#1f6232;padding:4px 10px 4px 6px}
.b-snack canvas{width:26px;height:26px}
.b-snack:active:not([disabled]){transform:translateY(3px);border-bottom-width:2px}
.b-snack[disabled]{opacity:.5}
.b-snack.brace{box-shadow:0 0 0 3px #fbf236;animation:bGlow .8s ease-in-out infinite}
.b-warn{position:absolute;left:12px;right:12px;top:128px;text-align:center;background:#e5535f;border:3px solid #fbf236;border-radius:14px;padding:6px 10px 7px;color:#fff;box-shadow:0 4px 0 rgba(34,32,52,.45);pointer-events:none;animation:bWarn .9s ease-in-out infinite}
.b-warn b{display:block;font-family:var(--f-px);font-weight:700;font-size:20px;line-height:1.1;text-transform:uppercase;letter-spacing:.02em;text-shadow:0 2px 0 #8a2433}
.b-warn span{display:block;font-size:15px;font-weight:700;line-height:1.25;margin-top:2px}
@keyframes bWarn{50%{transform:scale(1.03)}}
@keyframes bGlow{50%{box-shadow:0 0 0 5px #fff27a}}
.b-panel{flex:0 0 auto;background:var(--panel);border-top:3px solid var(--edge);padding:8px 10px calc(10px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:8px}
.b-log{position:relative;height:58px;overflow:hidden;background:var(--field);border:2px solid var(--line);border-radius:12px;padding:6px 26px 6px 10px;font-family:var(--f-ui);font-weight:600;font-size:17px;line-height:1.25;color:var(--ink)}
.b-log i{position:absolute;right:9px;bottom:5px;font-style:normal;font-size:11px;color:var(--ink-soft);animation:bBlink 1s steps(2) infinite}
@keyframes bBlink{50%{opacity:0}}
.b-moves{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:58px 58px;gap:8px}
.b-log.long{font-size:15px;line-height:1.3}
.b-mv{position:relative;display:grid;grid-template-columns:20px 1fr;grid-template-rows:auto auto;column-gap:7px;align-items:center;text-align:left;height:58px;min-height:0;padding:6px 9px 6px 8px;border-radius:14px;
  background:color-mix(in srgb,var(--c) 18%,#fffdf6);border:2px solid color-mix(in srgb,var(--c) 70%,#222034);border-bottom-width:5px;color:var(--ink);-webkit-touch-callout:none}
.b-mv:active:not([disabled]){transform:translateY(3px);border-bottom-width:2px;margin-bottom:3px}
.b-mv canvas{grid-row:span 2;width:20px;height:20px}
.b-mv .n{font-family:var(--f-ui);font-weight:700;font-size:16px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.b-mv .d{font-family:var(--f-ui);font-weight:600;font-size:14px;color:var(--ink);line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.b-mv .eff{position:absolute;top:-9px;right:6px;font-family:var(--f-ui);font-weight:700;font-size:12.5px;line-height:16px;padding:0 5px;border-radius:6px;border:1px solid var(--px-ink)}
.b-mv .eff.good{background:#99e550;color:#1f4a10}.b-mv .eff.bad{background:#dfe8fb;color:#595a70}
.b-mv .eff.brace{background:#fbf236;color:#4a3210;right:auto;left:6px}
.b-mv.brace{box-shadow:0 0 0 3px #fbf236;animation:bGlow .8s ease-in-out infinite}
.b-mv[disabled]{opacity:.45}
.b-moves.wait .b-mv{opacity:.55;pointer-events:none}
.b-info{font-size:14px;line-height:1.3;color:var(--ink-soft);height:37px;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;padding:0 2px}
.b-info.long{font-size:14px;line-height:1.3;height:37px;-webkit-line-clamp:2}
.b-info b{font-family:var(--f-ui);font-weight:700;color:var(--ink)}

.b-res{position:absolute;inset:0;background:rgba(34,32,52,.55);display:flex;flex-direction:column;align-items:center;padding:16px;z-index:10;overflow:auto;-webkit-overflow-scrolling:touch;touch-action:pan-y}
.b-res .card,.b-pass .card{margin:auto}
@media (max-height:720px){.b-res canvas.hero{width:84px;height:84px}.b-res .card{padding-top:14px}.b-pass canvas{width:96px;height:96px}}
.b-res .card{text-align:center;animation:bPop .35s ease-out}
@keyframes bPop{from{transform:scale(.85);opacity:0}to{transform:none;opacity:1}}
.b-res canvas.hero{width:112px;height:112px;display:block;margin:-6px auto 0}
.b-res canvas.duo{width:84px;height:84px}
.b-res h1{margin:2px 0 4px}
.b-res .sub{font-size:15px;color:var(--ink);margin:0 0 10px}
.b-rrows{display:grid;gap:6px;margin:8px 0 4px;text-align:left}
.b-rrow{display:flex;align-items:center;gap:8px;background:var(--slot);border-radius:12px;padding:7px 10px;font-size:15.5px;font-weight:600}
.b-rrow canvas{width:18px;height:18px;flex:0 0 auto}
.b-rrow canvas.egg{width:20px;height:24px}
.b-rrow canvas.crit{width:32px;height:32px}
.b-rrow b{font-family:var(--f-ui);font-size:17px;margin-left:auto;font-weight:700}
.b-rrow.gold{background:#fff1bf;border:2px solid var(--sun-edge)}
.b-rrow.blue{background:#eef4ff;border:2px solid #9fb8e8}
.b-ups{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin:6px 0 2px}
.b-ups span{font-family:var(--f-ui);font-weight:700;font-size:14px;color:#fff;border-radius:8px;padding:2px 8px}
.b-hpline{display:flex;align-items:center;gap:8px;margin:4px 0 2px;font-family:var(--f-ui);font-weight:700;font-size:14px;color:var(--ink)}
.b-hpline .b-hpbar{height:12px}
.b-pass{position:absolute;inset:0;z-index:12;display:flex;flex-direction:column;align-items:center;overflow:auto;padding:18px;background:#3a2a4a;background-image:radial-gradient(rgba(255,255,255,.08) 22%,transparent 24%);background-size:22px 22px}
.b-pass .card{text-align:center;animation:bPop .3s ease-out}
.b-pass canvas{width:128px;height:128px;display:block;margin:-4px auto 2px}
.b-pass h1{font-size:30px;font-family:var(--f-ui);font-weight:700}
.b-res h1.num{font-family:var(--f-ui);font-weight:700}
@media (prefers-reduced-motion: reduce){.b-res .card,.b-pass .card{animation:none}.b-log i,.b-warn,.b-mv.brace,.b-snack.brace,.b-tag.charge{animation:none}}
`;

  // ---------------- small pixel icons ----------------
  const ICON = {};
  // chibi sticker icons and particles: round chunky pastel shapes, one soft shade, a fine outline (hi-res grids)
  function icons() {
    if (ICON.ok) return ICON; ICON.ok = true;
    const G = PX.Grid, A = PX.art, P = (g, f) => PX.piece(g, f), soft = (t, cx, cy, rx, ry, R, o) => A.softBody(t, cx, cy, rx, ry, R, o);
    const done = (g, bold) => { if (bold) g.outerLine(); return g.canvas(); };
    let g;
    g = new G(12, 12); P(g, t => soft(t, 6, 6, 5, 5, ['#e4fbc8', '#a6e290', '#80c47c'])); PX.stroke(g, [[3.4, 6.2], [5.2, 8], [8.6, 4]], 0.72, 0.72, '#ffffff'); ICON.tick = done(g, true);
    g = new G(10, 12); P(g, t => { PX.stroke(t, [[2.8, 6], [2.8, 3.4], [5, 1.4], [7.2, 3.4], [7.2, 6]], 0.62, 0.62, '#cdd0e4'); });
    P(g, t => { t.poly([[1, 5.6], [9, 5.6], [9, 11], [1, 11]], '#ffe39a'); t.poly([[1, 9.6], [9, 9.6], [9, 11], [1, 11]], '#f4c86e'); }); g.ell(5, 7.6, 0.8, 0.8, INK); PX.stroke(g, [[5, 7.8], [5, 9.2]], 0.3, 0.3, INK); ICON.lock = done(g, true);
    ICON.coin = safe(() => PX.item('coin'), null) || safe(() => PS.ui.icon('coin'), null);
    ICON.bigcoin = safe(() => PX.item('bigcoin'), null) || ICON.coin;
    // tab icons (16x16)
    g = new G(16, 16); P(g, t => { t.poly([[1.6, 4.8], [5, 8.6], [8, 2.6], [11, 8.6], [14.4, 4.8], [13.2, 12.6], [2.8, 12.6]], '#ffe48c'); t.poly([[2.6, 10.6], [13.4, 10.6], [13.2, 12.6], [2.8, 12.6]], '#f6c66c'); });
    for (const [x, y, r] of [[1.6, 3.8, 1.1], [8, 1.8, 1.2], [14.4, 3.8, 1.1]]) P(g, t => t.ell(x, y, r, r, '#fff4b8'));
    P(g, t => t.ell(8, 8.4, 1.4, 1.4, '#ff9fb8')); P(g, t => { t.ell(4.8, 11.6, 0.9, 0.7, '#9fd4ff'); t.ell(11.2, 11.6, 0.9, 0.7, '#9fd4ff'); });
    g.dots([[4.5, 6.5], [5, 6.5], [7.5, 7.8]], '#ffffff'); ICON.crown = done(g, true);
    g = new G(16, 16); { const S = ['#f2f0fa', '#d8d8ec', '#b8bad4']; P(g, t => { t.rect(4, 6, 8, 9, S[1]); t.rect(10, 6, 2, 9, S[2]); }); P(g, t => { t.rect(3, 4, 10, 2, S[1]); for (const x of [3, 6, 9, 12]) t.rect(x, 3, 1, 1, S[1]); });
      P(g, t => { PX.stroke(t, [[7.5, 4], [7.5, 0.6]], 0.3, 0.3, '#a8a0c0'); t.poly([[7.8, 0.4], [11.6, 1.4], [7.8, 2.6]], '#ffa6b8'); });
      P(g, t => { t.ell(6.5, 8.6, 0.9, 1.2, '#fff1a8'); t.ell(9.5, 8.6, 0.9, 1.2, '#8e88c4'); }); P(g, t => { t.ell(8, 15, 1.6, 2.6, '#d8b08a'); }); g.dots([[4.5, 7], [4.5, 7.5]], '#ffffff'); }
    ICON.tower = done(g, true);

    ICON.league = safe(() => PS.ui.icon('battle'), null);
    ICON.paw = safe(() => PX.item('plant', 'peashooter'), null);
    { const K = PX.SCENE_K, c = document.createElement('canvas'); c.width = 16 * K; c.height = 16 * K; c.k = K; const x = c.getContext('2d'); x.scale(K, K); const a = safe(() => PX.item('plant', 'sunflower'), null), b2 = safe(() => PX.item('plant', 'chomper'), null);
      if (a && b2) { x.drawImage(a, -4, 2, 12, 12); x.save(); x.translate(16, 0); x.scale(-1, 1); x.drawImage(b2, -4, 2, 12, 12); x.restore(); } ICON.friends = c; }

    const star = (n, on) => { const g2 = new G(n, n), m = n / 2; P(g2, t => t.poly(PX.starPts(m, m + 0.3, m - 0.5, (m - 0.5) * 0.48, 5), on ? '#ffe680' : '#ece6f2')); if (on) { g2.ell(m, m + 1.2, m * 0.5, m * 0.25, '#f6c85e', 0, (x, y) => g2.filled(x, y)); g2.dots([[m - 1, m - 0.5], [m - 0.5, m - 1]], '#ffffff'); } if (!on) for (let i = 0; i < g2.a.length; i++) if (g2.a[i] === INK) g2.a[i] = '#b4aec4'; return g2.canvas(); };
    ICON.staron = star(8, true); ICON.staroff = star(8, false);
    // particles (round, chunky, pastel)
    const dot = (c, s) => { const d = new G(s || 2, s || 2); d.rect(0, 0, s || 2, s || 2, c); return d.canvas(); };
    const ball = (n, R, o) => { const g2 = new G(n, n); P(g2, t => soft(t, n / 2, n / 2, n / 2 - 0.6, n / 2 - 0.6, R, o)); return g2; };
    g = new G(4, 4); g.ell(2, 2, 1.7, 1.7, '#c8eeff'); g.ell(2, 2, 1.1, 1.1, '#f0fbff'); g.dot(1.5, 1, '#ffffff'); ICON.bubble = g.canvas();
    ICON.pebble = ball(3, ['#f0ecf6', '#d8d2e6', '#b8b0cc'], { hl: false }).canvas();
    ICON.rock = ball(5, ['#f0ecf6', '#d8d2e6', '#b8b0cc']).canvas();
    const arrow = (up, R) => { const g2 = new G(7, 7); P(g2, t => { const p = up ? [[3.5, 0.6], [6.4, 3.4], [4.6, 3.4], [4.6, 6.4], [2.4, 6.4], [2.4, 3.4], [0.6, 3.4]] : [[3.5, 6.4], [6.4, 3.6], [4.6, 3.6], [4.6, 0.6], [2.4, 0.6], [2.4, 3.6], [0.6, 3.6]]; t.poly(p, R[1]); }); g2.dot(3, up ? 1.5 : 4.5, '#ffffff'); return g2.canvas(); };
    ICON.up = arrow(true, ['#e4fbc8', '#9fe08a']); ICON.down = arrow(false, ['#e0f2ff', '#9fd0ff']);
    g = new G(6, 6); P(g, t => { PX.stroke(t, [[3, 1.2], [3, 4.8]], 0.9, 0.9, '#b8f0a0'); PX.stroke(t, [[1.2, 3], [4.8, 3]], 0.9, 0.9, '#b8f0a0'); }); g.dot(2.5, 2, '#ffffff'); ICON.plus = g.canvas();
    g = new G(4, 5); P(g, t => { t.ell(2, 3.2, 1.5, 1.5, '#a8dcff'); t.poly([[2, 0.4], [3.3, 2.6], [0.7, 2.6]], '#a8dcff'); }); g.dot(1.5, 3, '#ffffff'); ICON.sweat = g.canvas();
    g = ball(7, ['#fff6b0', '#ffc27e', '#ff9a86']); g.ell(3, 3, 1.3, 1.3, '#fff4b0'); ICON.fireball = g.canvas();
    ICON.orb = ball(5, ['#f2e6ff', '#cdb4f4', '#a88ad8']).canvas();
    g = new G(7, 3); PX.stroke(g, [[0.6, 0.8], [4, 0.8]], 0.35, 0.35, '#ffffff'); PX.stroke(g, [[2.6, 2.1], [6.4, 2.1]], 0.35, 0.35, '#eaf4ff'); ICON.wind = g.canvas();
    g = new G(5, 6); P(g, t => { t.ell(2.5, 3.8, 1.8, 1.7, '#9fd8ff'); t.poly([[2.5, 0.5], [4.1, 3.2], [0.9, 3.2]], '#9fd8ff'); }); g.dot(1.8, 3.4, '#ffffff'); g.dot(2, 3, '#ffffff'); ICON.drop = g.canvas();
    g = new G(7, 7); P(g, t => t.poly(PX.starPts(3.5, 3.7, 3.1, 1.4, 5), '#fff09a')); g.dot(3, 3, '#ffffff'); ICON.star = g.canvas();
    ICON.sprinkle = ['#ff9fb4', '#9fd0ff', '#b8ec9a', '#fff09a', '#ffc6e0'].map(c => { const s = new G(3, 2); s.ell(1.5, 1, 1.3, 0.7, c); return s.canvas(); });
    g = new G(9, 10); P(g, t => { t.poly([[0.8, 1.6], [4.5, 0.6], [8.2, 1.6], [8.2, 5], [4.5, 9.4], [0.8, 5]], '#cfeaff'); t.poly([[4.5, 0.6], [8.2, 1.6], [8.2, 5], [4.5, 9.4]], '#a8d2f6'); });
    g.ell(3, 3.6, 0.8, 1.4, '#ffffff', 0.3); ICON.shield = done(g, true);
    ICON.dot = dot;
    ICON.splash = dot('#e0ecff', 1);
    // element hit effects (hitFx)
    { const pet = new G(3, 3); pet.ell(1.5, 1.6, 1.3, 1, '#ffc4d8', 0.6); pet.dot(1, 1, '#ffffff'); const lf = new G(3, 3); lf.ell(1.5, 1.5, 1.4, 0.8, '#b8ec9a', -0.6); lf.dot(1, 1.5, '#e4fbc8'); ICON.petals = [fxs('leaf'), pet.canvas(), lf.canvas()]; }
    g = new G(3, 3); g.ell(1.5, 1.5, 1.3, 1.3, '#9fd8ff'); g.dot(1, 1, '#ffffff'); ICON.droplet = g.canvas();
    ICON.embers = [dot('#ffc27e', 1), dot('#fff09a', 1), dot('#ffa08a', 2), (() => { const e = new G(2, 3); e.ell(1, 1.6, 0.9, 1.2, '#ffb07e'); e.ell(1, 1.8, 0.5, 0.6, '#fff09a'); return e.canvas(); })()];
    ICON.chips = [ball(3, ['#f6eedc', '#e6d8bc', '#c8b898'], { hl: false }).canvas(), ball(3, ['#f0ecf6', '#d8d2e6', '#b8b0cc'], { hl: false }).canvas(), dot('#d8c8a8', 1), dot('#b8aec8', 2)];
    g = new G(7, 2); PX.stroke(g, [[2.6, 0.5], [6.4, 0.5]], 0.3, 0.3, '#ffffff'); PX.stroke(g, [[0.6, 1.5], [4, 1.5]], 0.3, 0.3, '#e6f0ff'); ICON.streak = g.canvas();
    ICON.wisps = [0, 1].map(i => { const w = new G(3, 3); PX.stroke(w, i ? [[0.5, 0.5], [1.6, 1.4], [2.4, 2.5]] : [[2.5, 0.5], [1.4, 1.4], [0.6, 2.5]], 0.45, 0.3, i ? '#d8c2ff' : '#c4a8f0'); return w.canvas(); });
    ICON.twinkle = [fxs('spark', '#ffffff'), fxs('bigspark', '#fff09a'), fxs('spark', '#fff6b8')];
    // puffy sky clouds: round puffs, a soft lavender shade underneath and a soft periwinkle outline (not ink: they are far away)
    const cloud = (w, h, puffs) => {
      const c = new G(w, h), base = h - 1.2, keep = (x, y) => y < base; keep.fine = true;
      for (const [x, y, r] of puffs) c.ell(x, y, r, r * 0.9, '#e2eafb', 0, keep);
      const lit = (x, y) => y < base - 0.6 && c.ffilled(Math.round(x * 2), Math.round(y * 2 + 1.2)); lit.fine = true;
      for (const [x, y, r] of puffs) c.ell(x - 0.3, y - 0.7, r, r * 0.9, '#ffffff', 0, lit);
      c.outline('#a8badf'); return c.canvas();
    };
    ICON.clouds = [cloud(15, 7, [[3.5, 4.4, 2.6], [7, 3.4, 3.2], [11, 4.2, 2.8]]), cloud(10, 6, [[3.4, 3.6, 2.4], [6.6, 3.2, 2.6]]), cloud(20, 8, [[3.8, 5.2, 2.8], [7.8, 3.8, 3.4], [12.4, 3.6, 3.6], [16.4, 5, 2.8]])];
    ICON.darkclouds = ICON.clouds.map(c => tint(c, '#6a74a8', 0.55));
    return ICON;
  }
  function tint(c, col, a) {
    const o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const x = o.getContext('2d');
    x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = a; x.fillStyle = col; x.fillRect(0, 0, o.width, o.height); return PX.keepK(c, o);
  }
  // chibi tower art for the hub (28x44): a round pastel stone tower, chunky crenels, a pink flag and warm round windows
  let towerArt = null;
  function towerPic() {
    if (towerArt) return towerArt;
    const G = PX.Grid, g = new G(28, 44), S = ['#f4f2fc', '#dcdcee', '#bcbed8'], P = f => PX.piece(g, f), soft = PX.art.softBody;
    P(t => { t.rect(6, 13, 16, 30, S[1]); t.rect(18, 13, 4, 30, S[2]); t.rect(6, 13, 2, 30, S[0]); });
    P(t => { t.rect(4, 9, 20, 5, S[1]); t.rect(20, 9, 4, 5, S[2]); for (const x of [4, 9, 14, 19]) t.rect(x, 6, 4, 3, x === 19 ? S[2] : S[1]); });
    P(t => { PX.stroke(t, [[13.5, 6.4], [13.5, 0.8]], 0.4, 0.4, '#b0a8c8'); t.poly([[14, 0.4], [21, 2], [14, 3.8]], '#ffa6b8'); t.poly([[14, 2.6], [21, 2], [14, 3.8]], '#f28aa0'); });
    for (let y = 16.5; y < 42; y += 4) for (let x = (y / 4) % 2 < 1 ? 8 : 10.5; x < 20; x += 5) PX.stroke(g, [[x, y], [x + 2.2, y]], 0.22, 0.22, S[2]);
    const win = (x, y, lit) => P(t => { t.ell(x, y, 1.8, 2.3, lit ? '#fff1a8' : '#9c96cc', 0); t.rect(Math.floor(x - 1), Math.floor(y), 3, 2, lit ? '#fff1a8' : '#9c96cc'); });
    win(10.5, 18.5, false); win(17.5, 18.5, true); win(14, 26.5, true); win(10.5, 33.5, true); win(17.5, 33.5, false);
    g.dots([[17, 17.5], [17, 18]], '#ffffff');
    P(t => { t.ell(14, 39.5, 3.2, 3.4, '#d8b08a'); t.rect(11, 39, 6, 4, '#d8b08a'); t.rect(15, 39, 2, 4, '#c49a76'); }); g.dot(15.6, 40.5, '#fff1a8');
    g.outerLine();
    towerArt = g.canvas(); return towerArt;
  }
  const fxs = (k, c) => safe(() => PX.fx(k, c), null);
  function elParticles(el) {
    el = FXEL[el] || el;
    const I = icons();
    switch (el) {
      case 'leaf': return { spr: [fxs('leaf'), fxs('spark', '#99e550'), fxs('leaf')], g: 40 };
      case 'water': return { spr: [I.bubble, fxs('drop', '#9fd8ff'), fxs('drop', '#639bff')], g: -10 };
      case 'fire': return { spr: [fxs('spark', '#ff9a3a'), fxs('spark', '#fbf236'), fxs('bigspark', '#df5a26')], g: -40 };
      case 'stone': return { spr: [I.pebble, I.dot('#8c7a5e'), I.dot('#b7c2cc')], g: 120 };
      case 'sky': return { spr: [fxs('feather'), fxs('spark', '#ffffff'), fxs('spark', '#9fd8ff')], g: 20 };
      case 'shadow': return { spr: [fxs('spark', '#9a6ad0'), fxs('bigspark', '#5e3a8e'), I.dot('#c9a2f0')], g: -20 };
      case 'light': return { spr: [fxs('bigspark', '#fbf236'), fxs('spark', '#ffffff'), fxs('spark', '#fff27a')], g: 0 };
      case 'sweet': return { spr: [fxs('spark', '#f7b6c8'), fxs('heart'), fxs('spark', '#e07ba0')], g: 30 };
      default: return { spr: [fxs('spark', '#ffffff'), fxs('bigspark', '#ffffff'), I.dot('#dfe8fb')], g: 60 };
    }
  }

  // ---------------- DOM ----------------
  let root, hubEl, fightEl, resEl, passEl, arenaEl, cv, ctx, logEl, movesEl, infoEl, runBtn, snackBtn, warnEl, plateEls = {};
  const lo = document.createElement('canvas'), lx = lo.getContext('2d');
  const bgC = document.createElement('canvas'), bgx = bgC.getContext('2d');
  let cssW = 0, cssH = 0, dpr = 1, PXS = 4, SC = 12, WPX = 4, WW = 100, WH = 120, bgKey = -1, sizeDirty = true, sizeCheckT = 0;
  // SC = device pixels per world pixel (always a whole number, so pixel art stays crisp); WPX = CSS px per world pixel
  let V = null; // live battle view
  let hubT = 0, hubFrame = 0, hubSprite = null, hubTab = 'leagues';
  let snackSel;  // fruit id chosen as a battle snack (undefined = not chosen yet this session)

  function mount(el) {
    root = el;
    if (!document.getElementById('b-style')) { const st = document.createElement('style'); st.id = 'b-style'; st.textContent = CSS; document.head.appendChild(st); }
    root.innerHTML = `
      <div class="b-hub"></div>
      <div class="b-fight" hidden>
        <div class="b-arena">
          <canvas class="b-cv"></canvas>
          <div class="b-plate o"></div>
          <div class="b-plate p"></div>
          <div class="b-warn" hidden></div>
          <button class="b-snack" type="button" hidden><canvas class="px" width="13" height="13"></canvas><span>Snack</span></button>
          <button class="b-run" type="button">Give up</button>
        </div>
        <div class="b-panel">
          <div class="b-log" aria-live="polite"><span></span><i hidden>&#9660;</i></div>
          <div class="b-moves"></div>
          <div class="b-info"></div>
        </div>
        <div class="b-res" hidden></div>
        <div class="b-pass" hidden></div>
      </div>`;
    hubEl = root.querySelector('.b-hub'); fightEl = root.querySelector('.b-fight'); resEl = root.querySelector('.b-res'); passEl = root.querySelector('.b-pass');
    arenaEl = root.querySelector('.b-arena'); cv = root.querySelector('.b-cv'); ctx = cv.getContext('2d');
    logEl = root.querySelector('.b-log'); movesEl = root.querySelector('.b-moves'); infoEl = root.querySelector('.b-info');
    runBtn = root.querySelector('.b-run'); snackBtn = root.querySelector('.b-snack'); warnEl = root.querySelector('.b-warn');
    plateEls = { o: root.querySelector('.b-plate.o'), p: root.querySelector('.b-plate.p') };
    let armedAt = 0;
    runBtn.onclick = () => {
      if (!V || V.b.over || V.granted || V.phase === 'end' || V.phase === 'results') return; // the fight is already decided
      const label = V.mode === 'friend' ? 'End battle' : 'Give up';
      if (Date.now() - armedAt > 3000) {
        armedAt = Date.now(); runBtn.textContent = V.mode === 'tower' ? 'Tap again (keep half the bag)' : `Tap again to ${label.toLowerCase()}`; runBtn.classList.add('armed');
        setTimeout(() => { if (V) runBtn.textContent = V.mode === 'friend' ? 'End battle' : 'Give up'; runBtn.classList.remove('armed'); armedAt = 0; }, 3000); return;
      }
      sfx('miss');
      const wasTower = V.mode === 'tower', bag = wasTower ? towerRun() && towerRun().pot : 0;
      forfeit(); renderHub();
      if (wasTower && bag) PS.ui.toast(`Tower run over. You kept ${Math.round(bag / 2)} coins.`, 3000);
    };
    snackBtn.onclick = () => {
      if (!V || V.phase !== 'choose') return;
      const f = V.b[chooser()]; if (!usable(f, SNACK)) return;
      if (f.hp >= f.max && !(f.foe.boss && f.foe.charging)) { sfx('miss'); infoEl.innerHTML = `<b>${esc(f.name)} is full!</b> Save the snack for when HP is low.`; return; }
      choose(SNACK);
    };
    const skip = () => { if (V && (V.phase === 'play' || V.phase === 'intro' || V.phase === 'end')) V.fast = true; };
    arenaEl.addEventListener('pointerdown', e => { if (e.target !== runBtn && !snackBtn.contains(e.target)) skip(); });
    logEl.addEventListener('pointerdown', skip);
    window.addEventListener('resize', () => { sizeDirty = true; });
    if (window.ResizeObserver) safe(() => new ResizeObserver(() => { sizeDirty = true; }).observe(arenaEl));
  }

  function show(params) {
    params = params || {};
    if (!V) { fightEl.hidden = true; hubEl.hidden = false; renderHub(); }
    if (params.league != null && params.index != null) startBattle(params.league, params.index);
  }
  function hide() { if (V) forfeit(true); } // leaving the screen some other way only pauses a Tower floor
  function forfeit(pause) { // leave mid-battle: no reward, restore shell. Giving up on a Tower floor ends the run (half the bag).
    if (V && V.mode === 'tower' && !V.granted && !pause) towerEnd('lost'); // (a decided floor was already paid by grant())
    V = null; resEl.hidden = true; passEl.hidden = true; fightEl.hidden = true; hubEl.hidden = false;
    PS.ui.chrome(true); PS.ui.hold(false);
  }

  // ---------------- hub ----------------
  const partner = () => ST.active();
  function chip(el) {
    return `<span class="b-chip" style="--c:${elColor(el)}"><canvas class="px" data-el="${el}" width="7" height="7"></canvas>${elLabel(el)}</span>`;
  }
  function paintIcons(scope) {
    scope.querySelectorAll('canvas[data-el]').forEach(c => { const s = safe(() => PX.item('element', c.dataset.el), null); if (s) { PS.ui.fitCanvas(c, s); PS.ui.paint(c, s); } });
    scope.querySelectorAll('canvas[data-coin]').forEach(c => { const s = c.dataset.coin === 'big' ? icons().bigcoin : icons().coin; if (s) { PS.ui.fitCanvas(c, s); PS.ui.paint(c, s); } });
    scope.querySelectorAll('canvas[data-egg]').forEach(c => { const s = safe(() => PX.item('egg', c.dataset.egg), null); if (s) { PS.ui.fitCanvas(c, s); PS.ui.paint(c, s); } });
    scope.querySelectorAll('canvas[data-plant]').forEach(c => { const s = safe(() => PX.item('plant', c.dataset.plant), null); if (s) { PS.ui.fitCanvas(c, s); PS.ui.paint(c, s); if ('lock' in c.dataset) c.style.filter = 'brightness(0) opacity(.35)'; } });
    scope.querySelectorAll('canvas[data-fitem]').forEach(c => { const s = safe(() => PX.item('fitem', c.dataset.fitem), null); if (s) { PS.ui.fitCanvas(c, s); PS.ui.paint(c, s); } });
    scope.querySelectorAll('canvas[data-icon]').forEach(c => { const s = icons()[c.dataset.icon]; if (s) { PS.ui.fitCanvas(c, s); PS.ui.paint(c, s); } });
    scope.querySelectorAll('canvas[data-fruit]').forEach(c => { const s = safe(() => PX.item('fruit', c.dataset.fruit), null); if (s) { PS.ui.fitCanvas(c, s); PS.ui.paint(c, s); } });
    scope.querySelectorAll('canvas[data-critter]').forEach(c => { const s = critterBox(c.dataset.critter, +(c.dataset.box || 32)); if (s) { PS.ui.fitCanvas(c, s); PS.ui.paint(c, s); } });
  }
  // a rare critter centred on its feet in a square canvas (so it scales by whole pixels)
  const boxCache = {};
  function critterBox(id, box) {
    const key = id + box; if (boxCache[key]) return boxCache[key];
    const c = safe(() => PX.critter(id), null); if (!c) return null;
    const k = c.k || 1, B = box * k, o = document.createElement('canvas'); o.width = B; o.height = B; // (box in art pixels)
    o.getContext('2d').drawImage(c, Math.floor((B - c.width) / 2 / k) * k, B - c.height - Math.floor((B - c.height) / 4 / k) * k);
    return (boxCache[key] = PX.keepK(c, o));
  }
  function moveKind(mv) {
    const fx = mv.fx;
    if (mv.pow > 0) return `Pow ${mv.pow}${fx.hits ? ' ×' + fx.hits : ''}`;
    if (fx.heal) return 'Heal';
    if (fx.buff) return 'Boost';
    if (fx.debuff) return 'Weaken';
    if (fx.status) return 'Status';
    return 'Support';
  }
  function moveSource(s, id) {
    const k = ST.knownMoves(s).find(x => x.id === id);
    return k ? k.from.replace(' element', '') : '';
  }
  const TABS = [['leagues', 'Zombies', 'league'], ['plants', 'Plants', 'paw'], ['legends', 'Zombosses', 'crown'], ['tower', 'Tower', 'tower'], ['friends', 'Friends', 'friends']];
  function tabBadge(id) {
    const X = extra();
    if (id === 'legends') return BOSSES.some(B => bossUnlocked(B) && !X.seen['boss:' + B.id]);
    if (id === 'tower') return towerUnlocked() && !X.seen.tower;
    if (id === 'plants') return !X.seen.plants;
    return false;
  }
  function renderHub() {
    if (!hubEl) return;
    const s = partner();
    if (!s) {
      hubEl.innerHTML = `<div class="b-top"><h1>Battle</h1></div><div class="panel b-empty"><p>You need a plant to battle the zombies.</p><p>Plant your first seed packet in the Garden.</p><button class="btn primary b-goG">Go to the Garden</button></div>`;
      hubEl.querySelector('.b-goG').onclick = () => PS.ui.go('garden');
      hubSprite = null; return;
    }
    const X = extra();
    if (hubTab === 'legends') { let ch = false; for (const B of BOSSES) if (bossUnlocked(B) && !X.seen['boss:' + B.id]) { X.seen['boss:' + B.id] = true; ch = true; } if (ch) PS.save(); }
    if (hubTab === 'tower' && towerUnlocked() && !X.seen.tower) { X.seen.tower = true; PS.save(); }
    if (hubTab === 'plants' && !X.seen.plants) { X.seen.plants = true; PS.save(); }
    let h = `<div class="b-top"><h1>Battle</h1><span class="b-rec">${PS.S.totals.battleWins || 0} wins</span></div>
      <div class="b-tabs" role="tablist">${TABS.map(([id, label, ic]) => `<button class="b-tab" type="button" role="tab" data-tab="${id}" aria-selected="${hubTab === id}"><canvas class="px" data-icon="${ic}"></canvas>${label}${tabBadge(id) ? '<span class="dot">NEW</span>' : ''}</button>`).join('')}</div>`;
    if (hubTab !== 'friends') h += partnerHtml(s);
    h += hubTab === 'plants' ? leaguesHtml(D.PLANT_LEAGUES) : hubTab === 'legends' ? legendsHtml() : hubTab === 'tower' ? towerHtml() : hubTab === 'friends' ? friendsHtml() : leaguesHtml(D.LEAGUES);
    hubEl.innerHTML = h;
    paintIcons(hubEl);
    hubEl.querySelectorAll('.b-tab').forEach(b => b.onclick = () => { if (hubTab === b.dataset.tab) return; sfx('tick'); hubTab = b.dataset.tab; renderHub(); hubEl.scrollTop = 0; });
    hubSprite = hubEl.querySelector('.b-psprite'); hubFrame = -1;
    if (hubSprite) {
      PS.ui.drawSproutTo(hubSprite, s);
      const mvBtn = hubEl.querySelector('.b-pickmoves'); if (mvBtn) mvBtn.onclick = () => { sfx('pop'); PS.ui.pickMoves(s, () => renderHub()); };
      hubEl.querySelector('.b-change').onclick = () => { sfx('pop'); PS.ui.pickSprout({ title: 'Choose a fighter', eyebrow: 'Battle', extra: x => ST.movesOf(x).map(id => D.MOVES[id].name).join(', '), onPick: x => { ST.setActive(x.id); renderHub(); } }); };
    }
    if (hubTab === 'legends') bindLegends(); else if (hubTab === 'tower') bindTower(); else if (hubTab === 'friends') bindFriends(); else bindLeagues(hubTab === 'plants' ? D.PLANT_LEAGUES : D.LEAGUES);
  }
  function partnerHtml(s) {
    const fi = ST.formInfo(s), bs = ST.battleStats(s), mv = ST.movesOf(s), rec = s.record || {};
    return `<section class="panel b-partner"><div class="b-ph"><canvas class="px b-psprite" width="32" height="32"></canvas>
        <div><div class="label">Your fighter</div><div class="px-title b-pname">${esc(s.name)}</div><div class="b-pform">${esc(fi.name)} · Lv ${bs.level} · ${rec.battleWins || 0}–${(rec.battles || 0) - (rec.battleWins || 0)}</div>
        <div class="b-chips">${bs.els.map(chip).join('')}</div></div>
        <button class="btn b-change" type="button">Change</button></div>
        <div class="b-mlist">${mv.map(id => { const m = D.MOVES[id]; return `<div class="b-mrow" style="--c:${elColor(m.el)}"><canvas class="px" data-el="${m.el}"></canvas><b>${m.name}</b><small>${moveKind(m)} · ${esc(moveSource(s, id))}</small></div>`; }).join('')}</div>
        <div class="b-howrow"><p class="b-how">${s.moveset ? 'You picked these moves.' : 'The game picks these moves.'} ${esc(s.name)} knows ${ST.learnedMoves ? ST.learnedMoves(s).length : mv.length}. Evolve it and give it element cores to learn more.</p><button class="btn b-pickmoves" type="button">Choose moves</button></div>
      </section>`;
  }
  // the Zombie leagues (main) or the Plant Duel cups (battle other gardeners' plants)
  function leaguesHtml(list) {
    const plants = list === D.PLANT_LEAGUES, done = list.filter(L => ST.leagueProgress(L.id).cleared).length, last = list[list.length - 1];
    let h = ST.leagueProgress(last.id).cleared
      ? `<div class="b-champ"><canvas class="px" data-icon="crown"></canvas><div><b>${plants ? 'Garden Champion!' : 'Zombie Champion!'}</b><small>You cleared all ${list.length} ${plants ? 'cups' : 'leagues'}. Rematch anyone to keep training!</small></div></div>`
      : plants ? `<p class="b-intro"><b>Plant Duels:</b> battle other gardeners' plants! ${done} of ${list.length} cups won. Every cup you win gives a fusion item.</p>`
        : `<p class="b-intro"><b>${done} of ${list.length} leagues cleared.</b> Stop the zombies! Clearing a league unlocks a new plant.</p>`;
    list.forEach((L, li) => {
      const open = ST.leagueUnlocked(L.id), p = ST.leagueProgress(L.id), n = p.beaten.filter(Boolean).length;
      const nextI = p.beaten.findIndex(x => !x), un = leagueUnlock(L);
      const lockName = L.unlock ? (list.find(x => x.id === L.unlock) || {}).name : '';
      const clearPrize = un ? `<canvas class="px" data-plant="${un}" ${ST.isUnlocked(un) ? '' : 'data-lock'} style="width:16px;height:16px"></canvas>${ST.isUnlocked(un) || p.cleared ? esc(D.PLANTS[un].name) : 'New plant!'}`
        : plants ? '<canvas class="px" data-fitem="crown" style="width:16px;height:16px"></canvas>Item' : '';
      h += `<section class="panel b-lg ${open ? '' : 'locked'}" data-li="${li}"><header><div><div class="px-title b-lname">${L.name}</div>
          <div class="b-lsub ${p.cleared ? 'done' : ''}">${p.cleared ? 'Cleared' : open ? `${n} of 3 beaten` : 'Locked'}</div></div>
          <div class="b-rw"><span><canvas class="px" data-coin="1"></canvas>${Math.round(prize('league', { L, index: 0 }, true).coins)} a win</span><span>Clear: <canvas class="px" data-coin="1"></canvas>${leagueClearCoins(L)}${clearPrize ? ' + ' + clearPrize : ''}</span></div></header>
        <div class="b-opps">${L.opponents.map((o, i) => {
          const can = open && (i === 0 || p.beaten[i - 1] || p.beaten[i]);
          const cls = p.beaten[i] ? 'beaten' : can && i === nextI ? 'next' : '';
          return `<button class="b-opp ${cls}" type="button" data-i="${i}" ${can ? '' : 'disabled'}><canvas class="px" width="32" height="32"></canvas><b>${esc(leagueNPC(L.id, i).name)}</b><small>Lv ${ST.battleStats(leagueNPC(L.id, i)).level}</small>${p.beaten[i] ? '<canvas class="px b-tick" data-icon="tick"></canvas>' : ''}</button>`;
        }).join('')}</div>
        ${open ? '' : `<div class="b-lockline"><canvas class="px" data-icon="lock"></canvas>Clear the ${lockName} to unlock</div>`}
      </section>`;
    });
    return h;
  }
  function bindLeagues(list) {
    hubEl.querySelectorAll('.b-lg').forEach(sec => {
      const L = list[+sec.dataset.li];
      sec.querySelectorAll('.b-opp').forEach(btn => {
        const i = +btn.dataset.i, npc = leagueNPC(L.id, i), cv = btn.querySelector('canvas');
        safe(() => { PS.ui.drawSproutTo(cv, ST.lookOf(npc), npc.zombie ? { mouth: 'open' } : { eyes: 'brave' }); cv.style.transform = 'scaleX(-1)'; });
        btn.onclick = () => { sfx('pop'); preview(L, i); };
      });
    });
  }
  function matchupHint(s, npc) {
    const me = ST.movesOf(s).map(id => D.MOVES[id]).filter(m => m.pow > 0), foeEls = ST.elementsOf(npc), myEls = ST.elementsOf(s);
    const good = me.filter(m => typeMult(m.el, foeEls) > 1).map(m => m.name);
    const threat = ST.movesOf(npc).map(id => D.MOVES[id]).filter(m => m.pow > 0 && typeMult(m.el, myEls) > 1).map(m => m.name);
    const bits = [];
    if (good.length) bits.push(`<b>${good.join(', ')}</b> ${good.length > 1 ? 'are' : 'is'} super effective.`);
    if (threat.length) bits.push(`Watch out for <b>${threat.join(', ')}</b>.`);
    return bits.join(' ') || 'No big type advantage either way.';
  }
  function preview(L, i) {
    const s = partner(); if (!s) return;
    const npc = leagueNPC(L.id, i), bs = ST.battleStats(npc), p = ST.leagueProgress(L.id), un = leagueUnlock(L);
    const coins = Math.round(prize('league', { L, index: i }, true).coins), last = !p.cleared && p.beaten.filter(Boolean).length === 2 && !p.beaten[i];
    const clearText = un ? (ST.isUnlocked(un) ? `${esc(D.PLANTS[un].name)} seeds` : 'a <b>brand-new plant</b>') : D.PLANT_LEAGUES.includes(L) ? 'a <b>fusion item</b>' : '';
    PS.ui.modal({
      eyebrow: `${L.name} · ${i + 1} of 3`, title: npc.name, sprite: npc, pose: npc.zombie ? { mouth: 'open', arms: 'up' } : { eyes: 'brave', mouth: 'grin', arms: 'up' },
      html: `<p style="text-align:center;margin-top:-4px">${esc(npc.zombie ? (D.ZOMBIES[npc.zombie].blurb) : ST.formInfo(npc).name)} · Lv ${bs.level}</p>
        <div class="chips-list" style="justify-content:center">${bs.els.map(chip).join('')}</div>
        ${oddsHtml(s, { kind: 'league', id: L.id, i })}
        <p><b>Moves:</b> ${ST.movesOf(npc).map(id => D.MOVES[id].name).join(', ')}</p>
        <p>${matchupHint(s, npc)}</p>
        <p>Win: <b>${coins} coins</b>${last ? ` + prize <b>${leagueClearCoins(L)} coins</b>${clearText ? ' and ' + clearText : ''}` : ''}.</p>
        ${snackRow()}`,
      buttons: [{ label: `Battle with ${s.name}!`, kind: 'go', onClick: () => { setTimeout(() => startBattle(L.id, i), 0); } }, { label: 'Not yet' }],
      mount(card) { paintIcons(card); bindSnacks(card); },
    });
  }

  // ---------------- snacks (pre-battle picker) ----------------
  const snackHeal = id => SNACK_HEAL[id] || TUNE.snackHeal;
  // The chosen snack, only while there is one left. Never swaps to a different fruit behind the player's back: if the
  // chosen fruit runs out it's "No snack" (and the choice comes back once they have that fruit again).
  function currentSnack() {
    const F = PS.S.fruits || {};
    if (snackSel === undefined) { // first time this session: the remembered choice; never chosen yet: a Heart Apple if there is one
      const pref = extra().snack;
      snackSel = pref === null ? null : pref && D.FRUITS[pref] ? pref : 'apple';
    }
    return snackSel && F[snackSel] > 0 && D.FRUITS[snackSel] ? snackSel : null;
  }
  function snackRow() {
    const F = PS.S.fruits || {}, list = Object.keys(F).filter(k => F[k] > 0 && D.FRUITS[k]);
    if (!list.length) return `<div class="b-snackrow"><div class="label">Battle snack</div><p class="b-snone">No fruit to bring. Pick fruit from the trees in the Garden!</p></div>`;
    const cur = currentSnack();
    return `<div class="b-snackrow"><div class="label">Bring a snack? <span>Eat it in battle to heal once</span></div><div class="b-snacks">
      <button class="b-sn ${!cur ? 'on' : ''}" type="button" data-sn="">None</button>
      ${list.map(k => `<button class="b-sn ${cur === k ? 'on' : ''}" type="button" data-sn="${k}" aria-label="${esc(D.FRUITS[k].name)}"><canvas class="px" data-fruit="${k}"></canvas><small>×${F[k]}</small></button>`).join('')}</div></div>`;
  }
  function bindSnacks(card) {
    card.querySelectorAll('.b-sn').forEach(btn => btn.onclick = () => {
      snackSel = btn.dataset.sn || null; extra().snack = snackSel; PS.save(); sfx('tick');
      card.querySelectorAll('.b-sn').forEach(x => x.classList.toggle('on', x === btn));
      if (snackSel) PS.ui.toast(`${D.FRUITS[snackSel].name}: heals ${Math.round(snackHeal(snackSel) * 100)}% once. Only used if you eat it.`, 2400);
    });
  }
  function snackFor(fruit) {
    if (!fruit || !(PS.S.fruits || {})[fruit] || !D.FRUITS[fruit]) return null;
    return { fruit, name: D.FRUITS[fruit].name, heal: snackHeal(fruit), cleanse: fruit === 'goldfruit', used: false };
  }

  // ---------------- Legends hub ----------------
  const THEME_CARD = { egypt: ['#f8e4b0', '#d8b070'], candy: ['#ffc8e0', '#d890c8'], beach: ['#a8e2f6', '#6cb4e0'], frontyard: ['#b8e690', '#78bc6c'], backyard: ['#b8e690', '#78bc6c'], meadow: ['#b8e690', '#78bc6c'],
    snow: ['#d8e8fa', '#9cb4e0'], peak: ['#a8c8f6', '#7c94d8'], jungle: ['#ffc8a2', '#7cba80'], jurassic: ['#bfe6cc', '#6ea886'], abyss: ['#a4e0ea', '#7c9ed8'], sunfire: ['#ffc49a', '#e8907a'], volcano: ['#fcc8b8', '#b28aae'],
    tower: ['#a8b0ec', '#6c6cc8'], moonlit: ['#8a8ed6', '#4a4f9a'], graveyard: ['#8a8ed6', '#4a4f9a'], pirate: ['#a8e2f6', '#6cb4e0'], west: ['#ffd8a8', '#e09a7a'], lostcity: ['#f6dc8e', '#80c290'],
    bigwave: ['#9cdcf6', '#4fb0e0'], neon: ['#d89ce8', '#5a3a96'], modern: ['#bce2f7', '#8cc480'] };
  // what a Zomboss gives the first time: a new plant, or a fusion item + a special seed packet
  function bossFirstPrize(B) { const un = D.UNLOCKS['boss:' + B.id]; if (un) return { plant: un }; const bp = BOSS_PRIZE[B.id] || ['crown', 'golden']; return { item: bp[0], seed: bp[1] }; }
  function legendsHtml() {
    const cards = BOSSES.map(B => {
      const open = bossUnlocked(B), r = bossRec(B.id), [c1, c2] = THEME_CARD[B.area] || ['#8c93a8', '#595a70'];
      const fp = bossFirstPrize(B), prize = fp.plant ? `<canvas class="px" data-plant="${fp.plant}" ${ST.isUnlocked(fp.plant) ? '' : 'data-lock'}></canvas>` : `<canvas class="px" data-fitem="${fp.item}"></canvas>`;
      const status = !open ? `<div class="lk">${unlockText(B)}</div>`
        : r.wins ? `<span class="st win"><canvas class="px" data-icon="tick"></canvas>Beaten${r.wins > 1 ? ' ×' + r.wins : ''}</span>`
          : `<span class="st new">Win: ${prize}${fp.plant ? 'New plant!' : 'Prizes!'}</span>`;
      return `<button class="b-leg ${open ? '' : 'locked'}" type="button" data-boss="${B.id}" style="--c1:${c1};--c2:${c2}" ${open ? '' : 'aria-disabled="true"'}>
        <canvas class="px big" data-critter="${B.id}"></canvas><b>${B.name}</b><span class="t">${B.title}</span>
        ${open ? `<span class="t">Best for Lv ${B.rec}+</span>` : ''}${status}</button>`;
    }).join('');
    return `<p class="b-intro"><b>Zombosses:</b> Dr. Zomboss's giant robots, with huge HP. When one <b>charges up</b>, use a Guard, Heal or Boost move to block its giant attack!</p><div class="b-legs">${cards}</div>`;
  }
  function bindLegends() {
    hubEl.querySelectorAll('.b-leg').forEach(btn => btn.onclick = () => {
      const B = BOSS[btn.dataset.boss];
      if (!bossUnlocked(B)) { sfx('miss'); PS.ui.toast(unlockText(B) + '.'); return; }
      sfx('pop'); previewBoss(B);
    });
  }
  function previewBoss(B) {
    const s = partner(); if (!s) return;
    const r = bossRec(B.id), f = makeBoss(B.id), coins = Math.round(prize('boss', { boss: B }, true).coins);
    const fp = bossFirstPrize(B);
    const win = !r.wins ? (fp.plant ? `${ST.isUnlocked(fp.plant) ? `${esc(D.PLANTS[fp.plant].name)} seeds` : 'a <b>brand-new plant</b>'} + <b>${coins} coins</b>` : `${aOrAn(D.FUSION_ITEMS[fp.item].name)} <b>${esc(D.FUSION_ITEMS[fp.item].name)}</b>, ${aOrAn(eggName(fp.seed))} <b>${esc(eggName(fp.seed))}</b> + <b>${coins} coins</b>`) : `<b>${coins} coins</b>`;
    const threat = B.moves.concat(B.sup.move).map(id => D.MOVES[id]).filter(m => m.pow > 0 && typeMult(m.el, ST.elementsOf(s)) > 1).map(m => m.name);
    const good = ST.movesOf(s).map(id => D.MOVES[id]).filter(m => m.pow > 0 && typeMult(m.el, B.els) > 1).map(m => m.name);
    PS.ui.modal({
      eyebrow: 'Zomboss battle', title: `${B.name}, ${B.title}`, sprite: critterBox(B.id, 48),
      html: `<p style="text-align:center;margin-top:-4px">${esc(B.blurb)}</p>
        <div class="b-mini"><span>HP ${f.max}</span><span>Best for Lv ${B.rec}+</span>${r.tries ? `<span>Won ${r.wins} of ${r.tries}</span>` : ''}</div>
        <div class="chips-list" style="justify-content:center">${B.els.map(chip).join('')}</div>
        ${oddsHtml(s, { kind: 'boss', id: B.id })}
        <p><b>Giant attack:</b> every ${B.calm + 2}${B.calm + 2 === 3 ? 'rd' : 'th'} turn it charges up, then uses <b>${B.sup.name}</b>. When you see the warning, pick a move with a yellow <b>BLOCK</b> tag (Guard, Heal or Boost) or eat your snack!</p>
        ${B.revive ? `<p><b>Reboot:</b> the first time it's beaten, it reboots with ${Math.round(B.revive * 100)}% HP.</p>` : ''}
        <p><b>Moves:</b> ${B.moves.map(id => D.MOVES[id].name).join(', ')}</p>
        ${good.length ? `<p><b>${good.join(', ')}</b> ${good.length > 1 ? 'are' : 'is'} super effective.</p>` : ''}${threat.length ? `<p>Watch out: <b>${threat.join(', ')}</b> is strong against ${esc(s.name)}.</p>` : ''}
        <p>Win: ${win}.</p>${snackRow()}`,
      buttons: [{ label: `Challenge with ${s.name}!`, kind: 'go', onClick: () => { setTimeout(() => startBoss(B.id), 0); } }, { label: 'Not yet' }],
      mount(card) { paintIcons(card); bindSnacks(card); },
    });
  }

  // ---------------- Tower hub ----------------
  const towerRun = () => { const run = extra().tower.run; return run && typeof run === 'object' ? run : null; };
  function treatFor(f) {
    if (f % 5) return null;
    if (f === 5) return { kind: 'fruit', text: '2 power fruits', icon: 'powernut' };
    if (f === 10) return { kind: 'bag', text: 'Big coin bag' };
    if (f === 15) return { kind: 'gold', text: 'Golden Fruit', icon: 'goldfruit' };
    if (f % 10 === 0) return { kind: 'egg', text: `Coin bag + ${f >= 40 ? 35 : f >= 30 ? 30 : 25}% special seed chance`, egg: f >= 40 ? 'rainbow' : 'golden', chance: f >= 40 ? 0.35 : f >= 30 ? 0.3 : 0.25 };
    return { kind: 'gold2', text: 'Golden Fruit + 2 fruits', icon: 'goldfruit' };
  }
  function treatIcon(t) {
    if (!t) return '';
    if (t.kind === 'bag') return '<canvas class="px" data-coin="big"></canvas>';
    if (t.kind === 'egg') return `<canvas class="px egg" data-egg="${t.egg}"></canvas>`;
    return `<canvas class="px" data-fruit="${t.icon}"></canvas>`;
  }
  function towerHtml() {
    const T = extra().tower, run = towerRun(), open = towerUnlocked();
    const rs = run ? ST.get(run.sid) : null;
    const nextTreat = [5, 10, 15, 20, 25, 30, 40].find(f => f > (run ? run.floor - 1 : 0)) || 50;
    let h = `<section class="panel b-tw-p"><div class="b-tw"><canvas class="px art" data-icon="towerart"></canvas><div>
      <h2>Battle Tower</h2><span class="best"><canvas class="px" data-icon="crown" style="width:16px;height:16px"></canvas>Best: ${T.best ? 'Floor ' + T.best : 'none yet'}</span>
      <p>Beat one zombie after another, higher and higher! Every 5th floor a rival gardener's plant waits. You heal a little between floors. Stop any time to take your prize bag.</p></div></div>`;
    if (!open) {
      h += `<div class="b-lockline"><canvas class="px" data-icon="lock"></canvas>Clear the ${(D.LEAGUES.find(l => l.id === TOWER.unlock) || {}).name} to unlock</div></section>`;
      return h;
    }
    if (run && rs) {
      const info = `${esc(rs.name)} · HP ${Math.round(run.hp * 100)}% · Prize bag: ${run.pot} coins${run.snack && !run.snackUsed && snackFor(run.snack) ? ` · Snack: ${esc(D.FRUITS[run.snack].name)}` : ' · No snack'}`;
      h += towerPaused(run)
        ? `<div class="b-runbox paused"><canvas class="px b-runsp" width="32" height="32"></canvas><div><b>Floor ${run.floor}: battle paused</b>
          <small>${info}</small><small>Finish this floor first. Then you can stop and take the bag.</small></div></div>
          <div class="b-btns"><button class="btn wide go b-tcont" type="button">Back to Floor ${run.floor}!</button></div>`
        : `<div class="b-runbox"><canvas class="px b-runsp" width="32" height="32"></canvas><div><b>Floor ${run.floor} next</b>
          <small>${info}</small></div></div>
          <div class="b-btns"><button class="btn wide go b-tcont" type="button">Climb to Floor ${run.floor}!</button><button class="btn wide b-tstop" type="button">Stop and take ${run.pot} coins</button></div>`;
    } else {
      h += `<div class="b-btns"><button class="btn wide go b-tstart" type="button">Start climbing!</button></div>`;
    }
    h += `<div class="label" style="margin-top:12px">Treats every 5 floors</div><div class="b-treats">${[5, 10, 15, 20, 30].map(f => { const t = treatFor(f); return `<div class="b-treat"><b>Floor ${f}${f === 30 ? '+' : ''}</b>${treatIcon(t)}${t.text}${f === nextTreat ? ' <span style="margin-left:auto;color:var(--accent)">next!</span>' : ''}</div>`; }).join('')}</div>
      <p class="b-how">Floor coins go in your prize bag. If your plant faints, you keep half the bag.</p></section>`;
    return h;
  }
  function bindTower() {
    const art = hubEl.querySelector('canvas[data-icon="towerart"]'); if (art) { const c = towerPic(); PS.ui.fitCanvas(art, c); PS.ui.paint(art, c); }
    const run = towerRun(), rs = run ? ST.get(run.sid) : null;
    if (run && !rs) { const pay = towerEnd(towerPaused(run) ? 'lost' : 'stop'); PS.ui.toast(`Your tower climber left, so the climb ended.${pay ? ` You got ${pay} coins.` : ''}`); renderHub(); return; }
    const sp = hubEl.querySelector('.b-runsp'); if (sp && rs) PS.ui.drawSproutTo(sp, rs, { eyes: 'brave' });
    const st = hubEl.querySelector('.b-tstart');
    if (st) st.onclick = () => { sfx('pop'); previewTower(); };
    const ct = hubEl.querySelector('.b-tcont');
    if (ct) ct.onclick = () => { sfx('pop'); startTowerFloor(); };
    const sb = hubEl.querySelector('.b-tstop');
    if (sb) sb.onclick = () => { sfx('pop'); const pot = towerEnd('stop'); sfx('level'); PS.ui.toast(`You took ${pot} coins home!`); renderHub(); };
  }
  function previewTower() {
    const s = partner(); if (!s) return;
    PS.ui.modal({
      eyebrow: 'Battle Tower', title: `Climb with ${esc(s.name)}?`, sprite: s, pose: { eyes: 'brave', mouth: 'grin', arms: 'up' },
      html: `<p>Each floor has a stronger zombie. HP carries over and ${esc(s.name)} heals ${Math.round(TOWER.heal * 100)}% after each win.</p>
        <p>Floor 1 is Lv ${TOWER.lv(1)}, floor 10 is Lv ${TOWER.lv(10)}. You can bring one snack for the whole climb.</p>${snackRow()}`,
      buttons: [{ label: 'Start climbing!', kind: 'go', onClick: () => { setTimeout(() => { towerBegin(s); startTowerFloor(); }, 0); } }, { label: 'Not yet' }],
      mount(card) { paintIcons(card); bindSnacks(card); },
    });
  }
  function towerBegin(s) {
    const T = extra().tower;
    T.run = { sid: s.id, floor: 1, hp: 1, pot: 0, seed: Math.floor(Math.random() * 1e6), snack: currentSnack() || null, snackUsed: false, started: Date.now() };
    T.runs = (T.runs || 0) + 1; PS.save();
  }
  // end the current run: 'stop' pays the whole bag, 'lost' pays half. Returns coins paid.
  function towerEnd(how) {
    const T = extra().tower, run = towerRun(); if (!run) return 0;
    const pay = how === 'lost' ? Math.round(run.pot / 2) : run.pot;
    T.run = null; PS.save();
    if (pay) ST.addCoins(pay, 'tower');
    return pay;
  }
  // run.fighting = the floor being fought right now: set when a floor starts, deleted when it is won (losing ends the run).
  // The climber's HP is saved to run.hp after every round (and run.snackUsed when the snack is eaten). If fighting is still
  // set while no Tower battle is on, the game was closed mid-floor (iOS may do that on its own): the climb is paused there,
  // nothing is lost, and the only way on is to fight that floor again from the saved HP (the opponent starts fresh).
  // The bag can't be taken until that floor is finished, so closing the app never beats the half-the-bag rule.
  const towerPaused = run => !!(run && run.fighting && !(V && V.mode === 'tower'));

  // ---------------- Friends hub ----------------
  function friendsHtml() {
    const others = otherPlayers(), F = extra().friend, left = F.day === today() ? Math.max(0, FRIEND.perDay - (F.paid || 0)) : FRIEND.perDay;
    return `<section class="panel b-fr"><h2>Friend Battle</h2><div class="vs"><canvas class="px b-fa" width="32" height="32"></canvas><b>VS</b><canvas class="px b-fb" width="32" height="32"></canvas></div>
      <p>Two players, one phone! Each player secretly picks a move, then passes the phone.</p>
      <ol><li>Pick your plant.</li><li>Pick ${others.length ? "a friend's plant (from another player on this phone) or another of yours" : 'another of your plants for your friend'}.</li><li>Take turns. No peeking!</li></ol>
      <div class="b-btns"><button class="btn wide go b-fstart" type="button">Start a friend battle</button></div>
      <p class="b-how" style="text-align:center">Just for fun: nobody's plants lose anything. ${left ? `You get a few coins for playing (${left} more today).` : 'No more coins today, but you can keep playing!'}</p></section>`;
  }
  function otherPlayers() {
    const cur = safe(() => PS.players.current(), null), list = safe(() => PS.players.list(), []) || [];
    return list.filter(p => !cur || p.id !== cur.id);
  }
  function bindFriends() {
    const s = partner(), a = hubEl.querySelector('.b-fa'), b = hubEl.querySelector('.b-fb');
    if (a && s) PS.ui.drawSproutTo(a, s, { eyes: 'brave', arms: 'up', mouth: 'grin' });
    if (b) { const L = { species: 'sunflower', stage: 1 }, c = PX.sprig(L, { eyes: 'brave', arms: 'up', mouth: 'grin' }); PS.ui.fitCanvas(b, c); const x = b.getContext('2d'); x.save(); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); x.restore(); }
    const st = hubEl.querySelector('.b-fstart'); if (st) st.onclick = () => { sfx('pop'); friendSetup(); };
  }
  // a list modal like PS.ui.pickSprout but for any items. items: [{name, sub, draw(canvas), onPick, disabled}]
  function pickList(opts) {
    PS.ui.modal({
      eyebrow: opts.eyebrow || '', title: opts.title, html: (opts.note ? `<p>${opts.note}</p>` : '') + '<div class="pick-list"></div>', buttons: [{ label: opts.cancel || 'Cancel' }],
      mount(card, close) {
        const box = card.querySelector('.pick-list');
        for (const it of opts.items) {
          const b = document.createElement('button'); b.className = 'pick-item'; b.type = 'button'; if (it.disabled) b.disabled = true;
          b.innerHTML = `<canvas class="px" width="32" height="32"></canvas><span><b>${esc(it.name)}</b>${it.sub ? `<small>${it.sub}</small>` : ''}</span>${it.tag ? `<span class="tag">${esc(it.tag)}</span>` : ''}`;
          safe(() => it.draw(b.querySelector('canvas')));
          b.onclick = () => { close(); setTimeout(() => it.onPick(), 0); };
          box.appendChild(b);
        }
      },
    });
  }
  const sproutSub = s => `${esc(ST.formInfo(s).name)} · Lv ${ST.totalLevels(s)}`;
  function friendSetup() {
    const mine = PS.S.sprouts;
    if (!mine.length) { PS.ui.toast('Hatch a plant first!'); return; }
    const me = safe(() => PS.players.current(), null), meName = me && me.name ? me.name : 'Player 1';
    pickList({
      eyebrow: 'Friend Battle · Step 1', title: `${esc(meName)}, pick your plant`,
      items: mine.slice().sort((a, b) => (b.id === PS.S.activeId) - (a.id === PS.S.activeId) || ST.totalLevels(b) - ST.totalLevels(a))
        .map(s => ({ name: s.name, sub: sproutSub(s), tag: s.id === PS.S.activeId ? 'Partner' : '', draw: c => PS.ui.drawSproutTo(c, s), onPick: () => friendPickFoe(s, meName) })),
    });
  }
  function friendPickFoe(sA, meName) {
    const others = otherPlayers();
    const items = others.map(p => {
      const list = safe(() => PS.players.sproutsOf(p.id), []) || [];
      const top = list[0];
      return { name: p.name, sub: list.length ? `${list.length} plant${list.length > 1 ? 's' : ''}` : 'No plants yet', disabled: !list.length,
        draw: c => { if (top) PS.ui.drawSproutTo(c, top); }, onPick: () => friendPickFoeSprout(sA, meName, p.name, list) };
    });
    items.push({ name: 'Two of my plants', sub: 'Your friend borrows one of yours', draw: c => { const s = PS.S.sprouts.find(x => x.id !== sA.id) || sA; PS.ui.drawSproutTo(c, s); },
      onPick: () => friendPickFoeSprout(sA, meName, 'Player 2', PS.S.sprouts, true) });
    if (!others.length) { friendPickFoeSprout(sA, meName, 'Player 2', PS.S.sprouts, true); return; }
    pickList({ eyebrow: 'Friend Battle · Step 2', title: 'Who is your friend?', note: 'Pick another player on this phone.', items });
  }
  function friendPickFoeSprout(sA, meName, foeName, list, own) {
    pickList({
      eyebrow: 'Friend Battle · Step ' + (own && !otherPlayers().length ? 2 : 3), title: own ? 'Pick a plant for your friend' : `${esc(foeName)}, pick your plant`,
      note: own ? 'Your friend will play with this one.' : '',
      items: list.map(s => ({ name: s.name, sub: sproutSub(s) + (s.id === sA.id && own ? ' · mirror match!' : ''), draw: c => PS.ui.drawSproutTo(c, s), onPick: () => startFriend(sA, s, meName, foeName, !!own) })),
    });
  }

  // ---------------- battle start ----------------
  function launch(cfg) {
    PS.ui.closeModal && PS.ui.closeModal();
    PS.ui.hold(true); PS.ui.chrome(false);
    hubEl.hidden = true; fightEl.hidden = false; resEl.hidden = true; passEl.hidden = true;
    const b = cfg.b;
    V = Object.assign({
      phase: 'intro', t: 0, fast: false, queue: [], step: null, done: false, granted: false, res: null, spec: null,
      disp: snap(b), hpShown: { p: b.p.hp, o: b.o.hp }, parts: [], pops: [], rings: [], beams: [], fx: [], amb: [], clouds: [], crowd: [],
      a: { p: fresh(), o: fresh() }, log: { full: '', shown: 0, drawn: -1, drawnFull: null }, lastMove: null, quake: 0, quakeA: 0, flashT: 0, flashA: 0.7, flashC: '#ffffff', banner: null, bolt: null, boltT: 3 + Math.random() * 4,
    }, cfg);
    V.a.p.enter = 1; V.a.o.enter = 1; V.seed = Math.floor(Math.random() * 1e9);
    for (let i = 0; i < 4; i++) V.clouds.push({ x: Math.random() * 140 - 20, y: 2 + Math.random() * 16, k: i % 3, v: 1.5 + Math.random() * 2 });
    fightEl.classList.toggle('boss', !!V.boss);
    resize(); bgKey = -1;
    makeCrowd();
    renderPlates(true); renderMoves(); setInfo(null); renderSnack();
    runBtn.textContent = V.mode === 'friend' ? 'End battle' : 'Give up'; runBtn.classList.remove('armed'); runBtn.hidden = false;
    queue(cfg.intro);
    sfx('go');
    resize(true); render(); // draw the new scene now, so the previous battle's last frame never flashes up
  }
  // Every battle is built by foeBattle() from a spec, the same way the pre-battle estimates build theirs.
  function startBattle(leagueId, index) {
    const s = partner(); if (!s) return;
    const G = leagueOf(leagueId); if (!G) return;
    const L = G.L, li = G.li;
    const npc = leagueNPC(leagueId, index), spec = { kind: 'league', id: leagueId, i: index };
    const b = foeBattle(s, Object.assign({ npc }, spec));
    b.p.snack = snackFor(currentSnack());
    launch({ mode: 'league', b, L, li, list: G.list, index, s, npc, spec, area: LEAGUE_AREA[leagueId] || 'frontyard',
      intro: [{ kind: 'intro', text: npc.zombie ? `${npc.name} from the ${L.name} is coming! Braaains!` : `${npc.name} of the ${L.name} wants to battle!`, dur: 1.4 }, { kind: 'go', text: `Go, ${s.name}!`, dur: 0.9 }] });
  }
  function startBoss(id) {
    const s = partner(), B = BOSS[id]; if (!s || !B || !bossUnlocked(B)) return;
    const spec = { kind: 'boss', id }, b = foeBattle(s, spec);
    b.p.snack = snackFor(currentSnack());
    const X = extra(); X.bosses[id] = Object.assign(bossRec(id), { tries: bossRec(id).tries + 1 }); PS.save();
    launch({ mode: 'boss', b, s, boss: B, spec, area: B.area,
      intro: [{ kind: 'bossin', text: `Dr. Zomboss attacks with ${B.name}, ${B.title}!`, dur: 2.2 }, { kind: 'go', text: `Be brave, ${s.name}!`, dur: 0.9 }] });
  }
  function startTowerFloor() {
    const run = towerRun(); if (!run) return;
    const s = ST.get(run.sid); if (!s) { towerEnd('stop'); renderHub(); return; }
    const f = run.floor, npc = towerNPC(run.seed, f), spec = { kind: 'tower', seed: run.seed, floor: f, hp: run.hp };
    const b = foeBattle(s, Object.assign({ npc }, spec)); // starts from run.hp (after a pause: the HP saved in the last round)
    if (run.snack && !run.snackUsed) b.p.snack = snackFor(run.snack);
    const resumed = run.fighting === f;
    run.fighting = f; PS.save(); // deleted when this floor is won; still set after a restart = the climb is paused here (towerPaused)
    const star = f % 5 === 0;
    launch({ mode: 'tower', b, s, npc, floor: f, run, spec, area: 'tower',
      intro: [{ kind: 'floor', text: resumed ? `Floor ${f}: back to the battle with ${npc.name}!` : star ? `Floor ${f}: a star challenger, ${npc.name}!` : `Floor ${f}: ${npc.name} is waiting!`, dur: 1.5 }, { kind: 'go', text: `Go, ${s.name}!`, dur: 0.8 }] });
  }
  function startFriend(sA, sB, nameA, nameB, own) {
    const b = newBattle(sA, sB, { smart: 0, friend: true });
    if (b.o.name === b.p.name) b.o.name = b.o.name + ' 2';
    const area = D.AREAS[sA.area] ? sA.area : 'frontyard';
    launch({ mode: 'friend', b, s: sA, sB, own, area, fr: { names: { p: nameA, o: nameB }, turn: 'p', picks: {} },
      intro: [{ kind: 'intro', text: `${nameA}'s ${b.p.name} vs ${nameB}'s ${b.o.name}!`, dur: 1.6 }, { kind: 'go', text: 'Ready? Fight!', dur: 0.8 }] });
  }
  const fresh = () => ({ move: null, recoil: 0, lunge: 0, hop: 0, shake: 0, flash: 0, alpha: 1, drop: 0, pose: null, poseT: 0, emote: null, emoteT: 0, enter: 0, dodge: 0, charge: 0, blinkAt: 2 + Math.random() * 3 });

  // Only call from frame() (a render follows right away, so a resized canvas is never shown blank).
  // The picture is frozen while the results card is up: showing the HUD again shrinks the arena, and re-laying out
  // the scene behind the card looked like a glitch. The canvas has an exact CSS size, so a smaller arena just crops it.
  function resize(force) {
    if (!arenaEl) return;
    if (!force && cssW && V && V.phase === 'results') return;
    const r = arenaEl.getBoundingClientRect(); if (!r.width || !r.height) return;
    const d = clamp(window.devicePixelRatio || 1, 1, 3);
    if (!force && Math.abs(r.width - cssW) < 0.5 && Math.abs(r.height - cssH) < 0.5 && d === dpr) return;
    cssW = r.width; cssH = r.height; dpr = d;
    PXS = clamp(Math.round(cssW / 125), 3, 5); // smaller pixels = more detail
    while (PXS > 3 && cssH / PXS < 96) PXS--;
    SC = Math.max(2, Math.round(PXS * dpr / PX.SCENE_K) * PX.SCENE_K); WPX = SC / dpr; // (a whole number of device pixels per fine pixel too)
    cv.width = Math.ceil(cssW * dpr); cv.height = Math.ceil(cssH * dpr);
    cv.style.width = cv.width / dpr + 'px'; cv.style.height = cv.height / dpr + 'px'; // 1 canvas pixel = 1 device pixel (no resampling)
    WW = Math.ceil(cv.width / SC); WH = Math.ceil(cv.height / SC);
    lo.width = WW * PX.SCENE_K; lo.height = WH * PX.SCENE_K; bgC.width = WW; bgC.height = WH; bgKey = -1; // lo: SCENE_K buffer pixels per world pixel
    if (V) makeCrowd();
  }
  // fighter feet positions (world px)
  const HY = () => Math.round(WH * 0.38);
  const bossScale = () => (WW >= 140 && WH >= 170 ? 2 : 1); // Zomboss art is 48x48
  function spot(side) {
    if (side === 'o' && V && V.boss) return { x: Math.round(WW * 0.66), y: Math.round(clamp(WH * 0.62, HY() + 34, WH - 58)) };
    return side === 'o' ? { x: Math.round(WW * 0.71), y: Math.round(clamp(WH * 0.53, HY() + 16, WH - 50)) } : { x: Math.round(WW * 0.29), y: Math.round(WH - Math.max(10, WH * 0.1)) };
  }
  const critScale = () => (V && V.boss ? bossScale() : V && V.wild ? WILD.steps[V.wild.step].scale : 1);
  const fighterH = side => (side === 'o' && V && V.boss ? Math.round(44 * bossScale()) : side === 'o' && V && V.wild ? Math.round(15 * critScale()) : 24);
  const topOf = side => { const s = spot(side); return { x: s.x, y: s.y - Math.round(fighterH(side) * 0.62) }; };

  // ---------------- plates & moves ----------------
  const STAGE_KEYS = ['atk', 'def', 'spd', 'eva', 'acc'];
  function renderPlates(full) {
    for (const side of SIDES) {
      const f = V.b[side], d = V.disp[side], el = plateEls[side];
      if (full || !el.firstChild) {
        const boss = side === 'o' && V.boss;
        el.className = 'b-plate ' + side + (boss ? ' boss' : '');
        // element icons next to the name, so kids can see the types at a glance
        const els = f.els.map(e => `<canvas class="px" data-el="${e}" role="img" aria-label="${elLabel(e)}"></canvas>`).join('');
        el.innerHTML = `${V.mode === 'friend' ? `<div class="b-own">${esc(V.fr.names[side])}'s</div>` : ''}<div class="b-prow"><b>${esc(f.name)}${boss ? ` <small class="b-sub">${esc(V.boss.title)}</small>` : ''}</b><span class="b-pels">${els}</span><span class="b-lv">${boss ? 'Legend · ' : V.mode === 'tower' && side === 'o' ? `Floor ${V.floor} · ` : ''}Lv ${f.lv}</span></div>
          <div class="b-hp"><em>HP</em><div class="b-hpbar"><i></i></div></div>
          <div class="b-prow2"><span class="b-hpn"></span><span class="b-tags"></span></div>`;
        paintIcons(el);
        el._bar = el.querySelector('.b-hpbar i'); el._n = el.querySelector('.b-hpn'); el._tags = el.querySelector('.b-tags'); el._last = ''; el._hs = null;
      }
      let tags = '';
      if (d.charging) tags += '<span class="b-tag charge">Charging!</span>';
      if (V.disp.tired) tags += '<span class="b-tag tired">Tired</span>';
      if (d.status) tags += `<span class="b-tag ${d.status}">${STATUS_SHORT[d.status]}</span>`;
      if (d.stun) tags += '<span class="b-tag stun">Stunned</span>';
      for (const k of STAGE_KEYS) {
        const n = k === 'atk' && d.status === 'burn' ? clamp(d.st.atk - 1, -3, 3) : d.st[k]; // a burn makes attacks weaker: show it
        if (n) tags += `<span class="b-tag ${n > 0 ? 'up' : 'down'}">${STAT_SHORT[k]}${n > 0 ? '&#9650;' : '&#9660;'}${Math.abs(n)}</span>`;
      }
      if (tags !== el._last) { el._tags.innerHTML = tags; el._last = tags; }
    }
    const warn = !!(V.boss && V.disp.o.charging && V.phase !== 'end' && V.phase !== 'results');
    if (warn && warnEl.hidden) { warnEl.innerHTML = `<b>${esc(V.boss.warn)}</b><span>Pick a move with a yellow BLOCK tag${V.b.p.snack && !V.b.p.snack.used ? ', or eat your snack' : ''}!</span>`; }
    warnEl.hidden = !warn;
    snackBtn.style.bottom = plateEls.p.offsetHeight + 22 + 'px'; // always just above the player's plate
    if (V.boss) { // keep Give up and the warning just under the boss plate, whatever its height
      const pb = plateEls.o.offsetTop + plateEls.o.offsetHeight;
      if (pb > 20) { runBtn.style.top = pb + 6 + 'px'; warnEl.style.top = pb + 44 + 'px'; }
    } else { runBtn.style.top = ''; warnEl.style.top = ''; }
    updateBars();
  }
  function updateBars() { // runs every frame: only touches the DOM when the shown HP really changes
    for (const side of SIDES) {
      const f = V.b[side], el = plateEls[side]; if (!el._bar) continue;
      const hs = Math.round(V.hpShown[side] * 4); if (el._hs === hs) continue; el._hs = hs;
      const k = clamp(V.hpShown[side] / f.max, 0, 1);
      el._bar.style.width = (k * 100).toFixed(1) + '%'; el._bar.className = k > 0.5 ? '' : k > 0.2 ? 'mid' : 'low';
      const t = `${Math.max(0, Math.round(V.hpShown[side]))} / ${f.max}`; if (el._n.textContent !== t) el._n.textContent = t;
    }
  }
  const chooser = () => (V.mode === 'friend' ? V.fr.turn : 'p');
  function renderMoves() {
    const side = chooser(), f = V.b[side], foe = f.foe;
    const bracing = foe.boss && foe.charging;
    movesEl.innerHTML = '';
    f.moves.forEach(id => {
      const m = D.MOVES[id], tm = m.pow > 0 ? typeMult(m.el, foe.els) : 1, br = bracing && isBrace(id);
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'b-mv' + (br ? ' brace' : ''); btn.style.setProperty('--c', elColor(m.el));
      const used = m.fx.once && f.used[id];
      btn.innerHTML = `<canvas class="px" data-el="${m.el}"></canvas><span class="n${m.name.length > 13 ? ' sm' : ''}">${m.name}</span><span class="d">${used ? 'Used up' : `${elLabel(m.el)} · ${moveKind(m)}`}</span>${br ? '<span class="eff brace">BLOCK</span>' : ''}${tm > 1 ? '<span class="eff good">Strong!</span>' : tm < 1 ? '<span class="eff bad">Weak</span>' : ''}`;
      if (used) btn.disabled = true;
      let timer = 0, long = false;
      btn.addEventListener('pointerdown', () => { long = false; clearTimeout(timer); timer = setTimeout(() => { long = true; setInfo(id); PX.buzz && PX.buzz(8); }, 380); });
      const cancel = () => clearTimeout(timer);
      btn.addEventListener('pointerup', cancel); btn.addEventListener('pointerleave', cancel); btn.addEventListener('pointercancel', cancel);
      btn.addEventListener('contextmenu', e => e.preventDefault());
      btn.addEventListener('mouseenter', () => setInfo(id));
      btn.addEventListener('focus', () => setInfo(id));
      btn.addEventListener('click', () => { if (long) { long = false; return; } choose(id); });
      movesEl.appendChild(btn);
    });
    paintIcons(movesEl);
    movesEl.classList.toggle('wait', V.phase !== 'choose');
    renderSnack();
  }
  function renderSnack() {
    const f = V && V.b[chooser()], sn = f && f.snack;
    snackBtn.hidden = !sn || sn.used;
    if (snackBtn.hidden) return;
    const c = snackBtn.querySelector('canvas'), s = safe(() => PX.item('fruit', sn.fruit), null);
    if (s && c.dataset.f !== sn.fruit) { PS.ui.fitCanvas(c, s); PS.ui.paint(c, s); c.dataset.f = sn.fruit; }
    snackBtn.disabled = V.phase !== 'choose';
    snackBtn.classList.toggle('brace', !!(f.foe.boss && f.foe.charging && V.phase === 'choose'));
    snackBtn.setAttribute('aria-label', `Eat snack: ${sn.name}`);
  }
  function setInfo(id) {
    infoEl.classList.remove('long');
    if (!id) {
      infoEl.innerHTML = V && V.mode === 'friend' && V.phase === 'choose' ? `<b>${esc(V.fr.names[V.fr.turn])}'s turn.</b> Hold a move to read what it does.`
        : V && V.lastMove ? '' : 'Tap a move to use it. Hold a move to read what it does.';
      return;
    }
    const m = D.MOVES[id], fx = m.fx, bits = [];
    if (m.pow > 0) bits.push(`Power ${m.pow}${fx.hits ? ` × ${fx.hits} hits` : ''}`);
    if (m.pow > 0 || fx.debuff || fx.status) bits.push(SURE.has(id) ? 'Never misses' : `Aim ${Math.round(m.acc * 100)}%`);
    if (fx.first) bits.push('Goes first');
    if (fx.heal && V && V.b[chooser()].heals) bits.push('Heals less each time');
    if (V && V.boss && isBrace(id)) bits.push('Blocks giant attacks');
    infoEl.innerHTML = `<b>${m.name}</b> (${elLabel(m.el)}): ${esc(kidWords(m.desc))} <span>${bits.join(' · ')}</span>`;
    infoEl.classList.toggle('long', infoEl.textContent.length > 92);
  }

  // ---------------- turn flow ----------------
  function choose(id) {
    if (!V || V.phase !== 'choose') return;
    const side = chooser(), f = V.b[side]; if (!usable(f, id)) return;
    sfx('pop');
    V.lastMove = id;
    if (V.mode === 'friend') {
      V.fr.picks[side] = id;
      if (side === 'p') { V.fr.turn = 'o'; showPass('o'); return; }
      resolveNow(V.fr.picks.p, V.fr.picks.o); V.fr.picks = {}; V.fr.turn = 'p';
      return;
    }
    resolveNow(id, aiChoose(V.b, V.b.o, V.b.smart));
  }
  function resolveNow(pid, oid) {
    const ev = resolveRound(V.b, pid, oid);
    // a snack that was actually eaten comes out of the fruit stash now
    for (const e of ev) if (e.type === 'snack') {
      const f = V.b[e.who];
      if (f.s && !f.npc && PS.S.sprouts.includes(f.s)) ST.useFruit(e.fruit);
      if (V.mode === 'tower' && e.who === 'p' && towerRun()) { towerRun().snackUsed = true; PS.save(); }
    }
    // the outcome is known now: no more giving up, and the prize is paid right away (the animation plays after)
    if (V.b.over) { runBtn.hidden = true; grant(); }
    else if (V.mode === 'tower') { const run = towerRun(); if (run && run.fighting === V.floor) { run.hp = V.b.p.hp / V.b.p.max; PS.save(); } } // (a paused climb resumes from here)
    V.phase = 'play'; movesEl.classList.add('wait'); setInfo(null); renderSnack();
    queue(ev.map(e => ({ kind: 'ev', ev: e, text: e.text, dur: evDur(e) })));
  }
  function evDur(e) {
    switch (e.type) {
      case 'use': return e.giant ? 1 : D.MOVES[e.move].pow > 0 ? 0.55 : 0.5;
      case 'hit': return e.giant ? 1.1 : e.of > 1 ? 0.32 : 0.6;
      case 'faint': return 1.2;
      case 'dot': return e.kind === 'tired' ? 0.35 : 0.7;
      case 'skip': return 0.9;
      case 'charge': return 1.7;
      case 'revive': return 1.8;
      case 'snack': return 0.9;
      case 'hang': return 1.5;
      case 'note': return e.tired || e.draw ? 1.3 : 0.7;
      default: return 0.7;
    }
  }
  function queue(steps) { V.queue.push(...steps); }
  function nextStep() {
    const st = V.queue.shift();
    if (!st) { onQueueEmpty(); return; }
    V.step = st; st.t = 0;
    if (st.text) { V.log.full = st.text; V.log.shown = 0; }
    st.need = Math.max(st.dur, st.text ? st.text.length / 55 + 0.55 : 0);
    begin(st);
  }
  function toChoose() {
    V.phase = 'choose';
    if (V.mode === 'friend') { showPass(V.fr.turn); return; }
    renderMoves(); renderPlates(false); setLog(`What will ${V.b.p.name} do?`); setInfo(null);
  }
  function onQueueEmpty() {
    V.step = null;
    V.fast = false;
    if (V.phase === 'intro') { toChoose(); return; }
    if (V.phase === 'play') {
      if (V.b.over) { endBattle(); return; }
      toChoose(); return;
    }
    if (V.phase === 'end') showResults();
  }
  function setLog(t) { V.log.full = t; V.log.shown = 0; }
  // pass-and-play hand-over screen: hides the moves until the right player is holding the phone
  function showPass(side) {
    V.phase = 'pass';
    const who = V.fr.names[side], other = V.fr.names[side === 'p' ? 'o' : 'p'], f = V.b[side];
    const first = V.b.turn === 0 && side === 'p';
    passEl.innerHTML = `<div class="card"><canvas class="px" width="32" height="32"></canvas><div class="eyebrow">Friend Battle · Round ${V.b.turn + 1}</div>
      <h1>${first ? `${esc(who)} goes first!` : `Pass the phone to ${esc(who)}!`}</h1><p class="sub">${esc(other)}, no peeking at the moves!</p>
      <button class="btn wide go" type="button">I'm ${esc(who)}. Show my moves!</button></div>`;
    PS.ui.drawSproutTo(passEl.querySelector('canvas'), f.s || f.look, { eyes: 'brave', mouth: 'grin', arms: 'up' });
    passEl.hidden = false;
    passEl.querySelector('button').onclick = () => {
      sfx('pop'); passEl.hidden = true; V.phase = 'choose';
      renderMoves(); renderPlates(false); setLog(`${who}: what will ${f.name} do?`); setInfo(null);
    };
  }

  // start the visuals for one step
  function begin(st) {
    if (st.kind === 'intro') { sfx('whoosh'); if (V.mode === 'friend') banner('FIGHT!', `${V.fr.names.p} vs ${V.fr.names.o}`, '#fbf236'); return; }
    if (st.kind === 'bossin') { sfx('thud'); V.a.o.enter = 1; V.a.o.drop = 1; banner(V.boss.name.toUpperCase(), V.boss.title, '#fbf236', 2.2); return; }
    if (st.kind === 'wildin' && V.wild) { sfx('whoosh'); banner(V.b.o.name.toUpperCase(), 'Wild ' + D.AREAS[D.ANIMALS[V.wild.id].area].name, V.wild.step === 2 ? '#ff9a3a' : '#fff27a'); V.a.o.hop = 1; return; }
    if (st.kind === 'floor') { sfx('whoosh'); banner(`FLOOR ${V.floor}`, V.floor % 5 === 0 ? 'Star challenger!' : '', '#fff27a'); return; }
    if (st.kind === 'go') { V.a.p.pose = { arms: 'up', mouth: 'open', eyes: 'happy' }; V.a.p.poseT = 0.8; V.a.p.hop = 1; if (V.mode === 'friend') { V.a.o.pose = { arms: 'up', mouth: 'open', eyes: 'brave' }; V.a.o.poseT = 0.8; V.a.o.hop = 1; } return; }
    if (st.kind === 'victory' || st.kind === 'defeat') return;
    const e = st.ev, who = e.who, A = who ? V.a[who] : null;
    V.disp = e.snap; renderPlates(false);
    const top = topOf;
    switch (e.type) {
      case 'use': {
        const m = D.MOVES[e.move];
        if (e.giant) { A.lunge = 1; A.charge = 0; quake(0.5, 3); sfx('crack'); st.shoot = { from: who, el: m.el, t: 0.35, giant: true }; banner(V.boss.sup.name.toUpperCase() + '!', '', '#ff9a3a', 1.1); break; }
        if (m.pow > 0) animMove(st, who, e.move);
        else { A.hop = 1; A.pose = { arms: 'up', mouth: 'grin' }; A.poseT = 0.5; sfx('chime'); burst(top(who), m.el, 8, 26); animSupport(st, who, e.move); if (V.boss && who === 'p' && V.disp.o.charging) rise(top(who), icons().shield, 1); }
        break;
      }
      case 'hit': {
        A.flash = 0.18; A.shake = 0.3; A.pose = { eyes: 'sad', mouth: 'o' }; A.poseT = 0.45;
        const p = top(who);
        if (e.giant) {
          burst(p, e.el, e.braced ? 14 : 30, e.braced ? 50 : 80); ring(p.x, p.y, e.braced ? '#9fd8ff' : '#ffffff', 22); ring(p.x, p.y, elColor(e.el), 30, 0.1);
          quake(e.braced ? 0.4 : 0.8, e.braced ? 2 : 4); flash(e.braced ? '#9fd8ff' : '#ffffff', 0.3);
          if (e.braced) { V.parts.push({ x: p.x, y: p.y - 2, vx: 0, vy: -4, g: 0, life: 1, spr: icons().shield, big: true }); }
          pop(p.x, p.y - 12, `-${e.n}`, e.braced ? '#9fd8ff' : '#ff9a3a', e.braced ? 30 : 42, e.braced ? 'BLOCKED!' : 'OUCH!');
          sfx(e.braced ? 'chime' : 'thud'); safe(() => PX.buzz(e.braced ? 20 : 60));
        } else {
          burst(p, e.el, e.of > 1 ? 3 : 6, e.crit ? 60 : 44); hitFx(p, e.el, e.crit || e.tm > 1, e.by === 'p' ? 1 : -1, e.of > 1);
          ring(p.x, p.y, e.crit ? '#fbf236' : '#ffffff', e.crit ? 16 : 11);
          if (e.crit) { quake(0.25, 2); flash('#ffffff', 0.12); } else if (e.tm > 1) quake(0.15, 1);
          pop(p.x, p.y - 12, `-${e.n}`, e.crit ? '#fbf236' : e.tm > 1 ? '#ffb347' : '#ffffff', e.crit ? 34 : e.tm > 1 ? 30 : 26, e.crit ? 'CRIT' : e.tm > 1 ? 'SUPER' : '');
          sfx(e.crit ? 'snap' : 'thud'); if (who === 'p' || V.mode === 'friend') safe(() => PX.buzz(e.crit ? 25 : 12));
        }
        cheer(0.5);
        break;
      }
      case 'miss': {
        const t = V.a[e.target]; t.dodge = 1; const p = top(e.target); pop(p.x, p.y - 10, 'Miss!', '#dfe8fb', 24); sfx('miss');
        break;
      }
      case 'heal': { rise(top(who), ICON.plus || icons().plus, 10); pop(top(who).x, top(who).y - 12, `+${e.n}`, '#99e550', 26); A.pose = { eyes: 'happy', mouth: 'smile', arms: 'up' }; A.poseT = 0.5; sfx('chime'); break; }
      case 'snack': {
        const fr = safe(() => PX.item('fruit', e.fruit), null); if (fr) V.parts.push({ x: top(who).x, y: top(who).y - 6, vx: 0, vy: -10, g: 0, life: 0.8, spr: fr });
        rise(top(who), fxs('heart'), 6); pop(top(who).x, top(who).y - 12, `+${e.n}`, '#99e550', 28, 'YUM!');
        A.pose = { eyes: 'happy', mouth: 'open', arms: 'up' }; A.poseT = 0.7; A.emote = 'munch'; A.emoteT = 0.8; A.hop = 1; sfx('munch'); setTimeout(() => sfx('chime'), 160);
        break;
      }
      case 'recoil': { A.shake = 0.25; A.flash = 0.12; pop(top(who).x, top(who).y - 12, `-${e.n}`, '#ffffff', 22); sfx('thud'); break; }
      case 'stage': {
        if (e.n) { rise(top(who), e.n > 0 ? icons().up : icons().down, 8, e.n < 0); if (e.n > 0) { A.hop = 1; } sfx(e.n > 0 ? 'level' : 'miss'); }
        break;
      }
      case 'status': {
        const col = { poison: '#9a6ad0', burn: '#df5a26', sleep: '#5b6ee1', stun: '#fbf236' }[e.st];
        burst(top(who), e.st === 'burn' ? 'fire' : e.st === 'poison' ? 'shadow' : 'light', 10, 30);
        A.emote = e.st === 'sleep' ? 'zz' : e.st === 'stun' ? 'swirl' : '!'; A.emoteT = 1;
        pop(top(who).x, top(who).y - 14, STATUS_SHORT[e.st] + '!', col, 22); sfx('crack');
        break;
      }
      case 'skip': { A.emote = e.kind === 'sleep' ? 'zz' : 'swirl'; A.emoteT = 1; A.shake = e.kind === 'stun' ? 0.3 : 0; A.charge = 0; break; }
      case 'wake': { A.emote = '!'; A.emoteT = 0.8; A.hop = 1; break; }
      case 'charge': {
        A.charge = 1; A.emote = '!'; A.emoteT = 1.6; quake(1.2, 1); sfx('whoosh'); setTimeout(() => sfx('crack'), 250);
        banner('WATCH OUT!', V.boss.warn, '#ff5a4a', 1.6);
        break;
      }
      case 'revive': {
        A.fainting = 0; A.flash = 0.5; A.hop = 1; burst(top(who), 'fire', 30, 70); ring(top(who).x, top(who).y, '#fbf236', 30); flash('#fff27a', 0.4); quake(0.6, 2);
        banner('REBORN!', `${V.b[who].name} rose from the flames`, '#fbf236', 1.6); sfx('evolve');
        break;
      }
      case 'dot': {
        if (e.kind === 'tired') { rise(top(who), icons().sweat, 3); A.shake = 0.12; }
        else { burst(top(who), e.kind === 'burn' ? 'fire' : 'shadow', 8, 22); A.flash = 0.12; A.shake = 0.25; }
        pop(top(who).x, top(who).y - 12, `-${e.n}`, e.kind === 'poison' ? '#c9a2f0' : e.kind === 'burn' ? '#ffb347' : '#dfe8fb', e.kind === 'tired' ? 18 : 22);
        break;
      }
      case 'cure': case 'cleanse': { rise(top(who), fxs('spark', '#ffffff'), 8); sfx('chime'); break; }
      case 'faint': { A.fainting = 0.001; A.charge = 0; A.pose = { eyes: 'closed', mouth: 'o' }; A.poseT = 99; sfx('thud'); if (who === 'o' && V.boss) { quake(0.9, 3); burst(top('o'), V.boss.els[0], 26, 60); } break; }
      case 'hang': { // a tie against the computer: the player's plant wobbles back up with 1 HP
        A.fainting = 0; A.hop = 1; A.shake = 0.3; A.emote = '!'; A.emoteT = 1.2; A.pose = { eyes: 'brave', mouth: 'grin', arms: 'up' }; A.poseT = 1.3;
        rise(top(who), fxs('heart'), 5); pop(top(who).x, top(who).y - 12, '1 HP', '#fbf236', 28, 'HANG ON!'); sfx('chime');
        break;
      }
      case 'note':
        if (e.tired) { for (const s of SIDES) { rise(top(s), icons().sweat, 4); V.a[s].shake = 0.2; } banner('TIRED!', 'Both lose HP every turn now', '#9fd8ff', 1.6); sfx('whoosh'); }
        else if (e.draw) banner('DRAW!', '', '#9fd8ff', 1.6);
        break;
    }
  }

  function endBattle() {
    const won = V.b.winner === 'p', draw = !V.b.winner;
    V.phase = 'end'; V.won = won; runBtn.hidden = true; snackBtn.hidden = true; warnEl.hidden = true;
    if (!draw) { const W = V.a[V.b.winner]; W.win = true; W.emote = 'heart'; W.emoteT = 99; }
    for (const c of V.crowd) c.cheer = true;
    let text = won ? `${V.b.p.name} won the battle!` : `${V.b.p.name} lost the battle...`;
    if (V.mode === 'friend') text = draw ? "It's a draw! Good game!" : `${V.fr.names[V.b.winner]}'s ${V.b[V.b.winner].name} wins!`;
    else if (V.mode === 'boss' && won) text = `${V.b.p.name} beat the ${V.boss.name}!`;
    else if (V.mode === 'wild' && won) text = `${V.b.p.name} beat the ${V.b.o.name}!`;
    if (!draw && (won || V.mode === 'friend')) banner(V.mode === 'friend' ? 'WINNER!' : 'VICTORY!', '', '#fbf236', 1.8);
    queue([{ kind: won || V.mode === 'friend' ? 'victory' : 'defeat', text, dur: 1.8 }]);
    sfx(won || V.mode === 'friend' ? 'level' : 'miss');
  }

  function showResults() {
    if (V.done) return; V.done = true; V.phase = 'results';
    if (!V.granted) grant(); // (normally already paid, the moment the battle was decided)
    const res = V.res || { rows: '', pay: null };
    if (V.mode === 'boss') resultsBoss(res); else if (V.mode === 'tower') resultsTower(res); else if (V.mode === 'friend') resultsFriend(res); else resultsLeague(res);
    paintIcons(resEl);
    resEl.hidden = false;
    PS.ui.chrome(true); PS.ui.hold(false);
    if (!V.won && V.mode !== 'friend' && V.mode !== 'tower') suggestSprout();
  }
  // Pays the battle's prize exactly once (V.granted), the moment the outcome is known. The rows it builds are shown later
  // by the results card, so the card always shows what was really paid.
  function grant() {
    if (!V || V.granted || !V.b.over) return;
    V.granted = true;
    try { V.res = GRANT[V.mode](V.b.winner === 'p'); } catch (e) { console.error(e); V.res = null; }
    PS.save();
  }
  const rowHtml = (icon, label, val, cls) => `<div class="b-rrow${cls ? ' ' + cls : ''}">${icon}${label}${val == null ? '' : `<b>${val}</b>`}</div>`;
  const COIN = '<canvas class="px" data-coin="1"></canvas>', BIGCOIN = '<canvas class="px" data-coin="big"></canvas>', PLUS = '<canvas class="px" data-icon="plus"></canvas>';
  const xpText = pay => (pay.xp || !pay.maxed ? `+${pay.xp}` : 'Max level!');
  const xpRow = pay => rowHtml(PLUS, `Training XP${pay.happy ? ' <span class="b-happy">Happy bonus!</span>' : ''}`, xpText(pay));
  const eggRow = (kind, egg, lead) => `<div class="b-rrow gold"><canvas class="px egg" data-egg="${eggKey(egg)}"></canvas><span>${lead} It's waiting in the ${areaName(egg.area)}.</span></div>`;
  const itemRow = (id, lead) => `<div class="b-rrow gold"><canvas class="px" data-fitem="${id}" style="width:32px;height:32px"></canvas><span>${lead || `A ${esc(D.FUSION_ITEMS[id].name)}!`} Fuse it onto a plant in the Shop's Fusion Lab.</span></div>`;
  // a league or cup cleared: its plant unlock (once) and, for Plant Duel cups, a fusion item
  function clearPrize(L) {
    const cup = D.PLANT_LEAGUES.includes(L), key = (cup ? 'cup:' : 'league:') + L.id;
    let rows = '';
    const un = ST.reward(key, L.name);
    if (un) rows += `<div class="b-rrow gold"><canvas class="px egg" data-egg="${eggKey(un.egg)}"></canvas><span>${un.isNew ? `New plant unlocked: <b>${esc(D.PLANTS[un.species].name)}</b>!` : `${esc(D.PLANTS[un.species].name)} seeds!`} The seed packet is waiting in the ${areaName(un.egg.area)}.</span></div>`;
    if (cup) { const it = ST.randomItem(); ST.addItem(it); rows += itemRow(it, `Cup prize: a ${esc(D.FUSION_ITEMS[it].name)}!`); }
    return rows;
  }
  const GRANT = {
    league(won) {
      const { L, index, s } = V, pz = prize('league', V, won), pay = payout(s, pz.coins, pz.xp, 'battle', won), p = ST.leagueProgress(L.id);
      let rows = rowHtml(COIN, 'Coins', `+${pay.coins}`) + xpRow(pay);
      if (won) {
        p.beaten[index] = true;
        if (!p.cleared && p.beaten.every(Boolean)) {
          p.cleared = true;
          const bonus = ST.addCoins(leagueClearCoins(L), 'league');
          if (D.LEAGUES.includes(L)) PS.S.bestTier = Math.max(PS.S.bestTier || 0, Math.min(3, Math.ceil((D.LEAGUES.indexOf(L) + 1) / 2)));
          rows += rowHtml(COIN, `${L.name} cleared!`, `+${bonus}`, 'gold') + clearPrize(L);
        } else if (Math.random() < (BT.itemDrop || 0)) { const it = ST.randomItem(); ST.addItem(it); rows += itemRow(it, `Lucky! A ${esc(D.FUSION_ITEMS[it].name)}!`); }
      }
      PS.S.progress.leagues[L.id] = p;
      return { pay, rows };
    },
    boss(won) {
      const { boss: B, s } = V, X = extra(), r = bossRec(B.id), first = won && !r.wins;
      if (won) { r.wins++; if (!r.best || V.b.turn < r.best) r.best = V.b.turn; }
      X.bosses[B.id] = r;
      const pz = prize('boss', V, won), pay = payout(s, pz.coins, pz.xp, 'zomboss', won);
      let rows = '';
      if (first) {
        const fp = bossFirstPrize(B);
        if (fp.plant) { const un = ST.reward('boss:' + B.id, `${B.name} beaten`); if (un) rows += `<div class="b-rrow gold"><canvas class="px egg" data-egg="${eggKey(un.egg)}"></canvas><span>${un.isNew ? `New plant unlocked: <b>${esc(D.PLANTS[un.species].name)}</b>!` : `${esc(D.PLANTS[un.species].name)} seeds!`} The seed packet is waiting in the ${areaName(un.egg.area)}.</span></div>`; }
        else { ST.addItem(fp.item); rows += itemRow(fp.item); const egg = ST.addEgg(fp.seed, `${B.name} beaten`); rows += eggRow(fp.seed, egg, `${aOrAn(eggName(fp.seed)) === 'an' ? 'An' : 'A'} ${esc(eggName(fp.seed))}!`); }
      }
      rows += rowHtml(COIN, 'Coins', `+${pay.coins}`) + xpRow(pay);
      return { pay, rows, first };
    },
    tower(won) {
      const { s, floor: f } = V, T = extra().tower, run = towerRun(), pz = prize('tower', V, won), pay = payout(s, 0, pz.xp, 'tower', won);
      if (won && run) {
        delete run.fighting;
        run.pot += pz.coins;
        const record = f > (T.best || 0); if (record) T.best = f;
        const hpNext = Math.min(1, V.b.p.hp / V.b.p.max + TOWER.heal);
        run.hp = hpNext; run.floor = f + 1;
        let rows = rowHtml(COIN, 'Into the prize bag', `+${pz.coins}`);
        const t = treatFor(f); if (t) rows += giveTreat(t, f, run);
        rows += rowHtml(BIGCOIN, 'Prize bag', run.pot, 'blue') + xpRow(pay);
        return { pay, rows, record, hpNext, pot: run.pot };
      }
      const pot = run ? run.pot : 0, paid = towerEnd('lost');
      return { pay, rows: rowHtml(BIGCOIN, 'You keep half the bag', `+${paid}`, 'gold') + xpRow(pay), pot };
    },
    friend() {
      const { b, fr, s } = V, win = b.winner, F = extra().friend;
      if (F.day !== today()) { F.day = today(); F.paid = 0; }
      F.played = (F.played || 0) + 1;
      if ((F.paid || 0) >= FRIEND.perDay) return { rows: '<div class="b-rrow">No more coins today, but that was fun!</div>' };
      F.paid = (F.paid || 0) + 1;
      const pz = prize('friend', V, win === null ? 'draw' : win === 'p'), pay = payout(s, pz.coins, pz.xp, 'friend', win === 'p', false);
      return { pay, rows: rowHtml(COIN, `Coins for ${esc(fr.names.p)}`, `+${pay.coins}`) + rowHtml(PLUS, `A little XP for ${esc(b.p.name)}`, xpText(pay)) };
    },
  };

  // ---------------- after a loss: why, one tip, and maybe a better plant ----------------
  function typeTip(foeEl) {
    const beat = Object.keys(D.ELEMENTS).filter(k => D.ELEMENTS[k].strong.includes(foeEl)), el = beat.find(k => D.ELEMENT_INFO[k]);
    return beat.length ? `${beat.map(elLabel).join(' and ')} moves beat ${elLabel(foeEl)}.${el ? ` Catch ${D.ELEMENT_INFO[el].sprite}s in the Garden and give your plant a ${D.ELEMENT_INFO[el].name} core!` : ''}` : '';
  }
  // One short reason from what really happened in this battle, and one training tip.
  function lossWhy() {
    const b = V.b, P = b.p, O = b.o, me = esc(P.name), foe = esc(O.boss ? 'The ' + O.name : O.name), gap = O.lv - P.lv;
    const lvTip = 'Race, play in the Garden and win easier battles to level up, then come back!';
    if (O.boss && P.bigHits) return { why: `${foe}'s giant attack hit ${me} hard.`, tip: 'When it charges up, pick a move with the yellow BLOCK tag!' };
    if (gap >= 10) return { why: `${foe} is ${gap} levels higher than ${me}.`, tip: lvTip };
    if (O.dealtStrong > 0 && O.dealtStrong >= O.dealt * 0.4) return { why: `${foe}'s ${elLabel(O.strongEl)} moves hit ${me} hard.`, tip: typeTip(O.els[0]) || lvTip };
    if (O.healed >= O.max * 0.5) return { why: `${foe} healed a lot.`, tip: 'Use your strongest moves every turn, so its healing can\'t keep up.' };
    if (P.dealt > 0 && P.dealtWeak >= P.dealt * 0.5) return { why: `${me}'s moves were weak against ${elLabel(O.els[0])}.`, tip: typeTip(O.els[0]) || lvTip };
    if (gap >= 5) return { why: `${foe} is ${gap} levels higher than ${me}.`, tip: lvTip };
    if (b.tiredEnd) return { why: `${me} got too tired first.`, tip: 'Heal moves and a snack help in long battles.' };
    return { why: 'That was close!', tip: P.snack ? 'Try again. Eat your snack when HP gets low!' : 'Try again, and bring a snack to heal once.' };
  }
  function lossHtml() {
    const w = safe(lossWhy, null); if (!w) return '';
    return `<div class="b-why"><b>${w.why}</b><span><i>Tip:</i> ${w.tip}</span></div><div class="b-alt" hidden></div>`;
  }
  // Is one of the player's other plants a clearly better match for this foe? Checked just after the card shows.
  function suggestSprout() {
    const v = V, spec = v && v.spec, cur = v && v.s; if (!spec || !cur) return;
    setTimeout(() => {
      const box = resEl.querySelector('.b-alt'); if (V !== v || !box || resEl.hidden) return;
      const mine = matchup(cur, spec).win; let best = null;
      const others = PS.S.sprouts.filter(x => x !== cur).sort((a, b) => ST.totalLevels(b) - ST.totalLevels(a)).slice(0, 8);
      for (const s of others) { const e = matchup(s, spec, 24); if (e.win >= Math.max(0.5, mine + 0.25) && (!best || e.win > best.win)) best = { s, win: e.win }; }
      if (!best) return;
      const o = oddsOf(best.win), name = esc(best.s.name);
      box.innerHTML = `<canvas class="px" width="32" height="32"></canvas><div><b>Try ${name}?</b><small>${name} has a better chance: <span class="b-ow ${o.c}">${o.word}</span></small></div>
        <button class="btn wide go" type="button">Battle with ${name}!</button>`;
      PS.ui.drawSproutTo(box.querySelector('canvas'), best.s, { eyes: 'brave', mouth: 'grin', arms: 'up' });
      box.hidden = false;
      box.querySelector('button').onclick = () => { sfx('pop'); ST.setActive(best.s.id); rematch(v); };
    }, 60);
  }
  // start the same fight again (with whoever is the partner now)
  function rematch(v) {
    V = null; resEl.hidden = true;
    if (v.mode === 'league') startBattle(v.L.id, v.index); else if (v.mode === 'boss') startBoss(v.boss.id);
  }
  const turnsText = n => `${n} turn${n > 1 ? 's' : ''}`;
  const upsBlock = res => { const u = Object.entries((res.pay && res.pay.ups) || {}).map(([k, n]) => `<span style="background:${D.STAT_META[k].color}">${D.STAT_META[k].label} +${n} Lv</span>`).join(''); return u ? `<div class="b-ups">${u}</div>` : ''; };
  const winSub = (s, foe) => (V.b.tie ? `${esc(s.name)} hung on with 1 HP and won the tie!` : `${esc(s.name)} beat ${foe} in ${turnsText(V.b.turn)}.`);
  function backToHub(then) { V = null; resEl.hidden = true; passEl.hidden = true; fightEl.hidden = true; hubEl.hidden = false; renderHub(); if (then) then(); }
  function bindRes(map) {
    resEl.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { sfx('pop'); const fn = map[b.dataset.a]; if (fn) fn(); else backToHub(); });
  }
  function resultsLeague(res) {
    const { L, index, s, won } = V;
    const nextOk = won && index < 2;
    const nextL = won && index === 2 ? V.list[V.li + 1] : null;
    resEl.innerHTML = `<div class="card">
      <div class="eyebrow">${L.name} · ${esc(V.npc.name)}</div>
      <canvas class="px hero" width="32" height="32"></canvas>
      <h1>${won ? 'Victory!' : 'So close!'}</h1>
      <p class="sub">${won ? winSub(s, esc(V.npc.name)) : `${esc(V.npc.name)} won this time.`}</p>
      ${won ? '' : lossHtml()}
      <div class="b-rrows">${res.rows}</div>${upsBlock(res)}
      <div class="modal-btns">
        ${nextOk ? `<button class="btn wide go" data-a="next">Next: ${esc(leagueNPC(L.id, index + 1).name)}</button>` : ''}
        ${nextL && ST.leagueUnlocked(nextL.id) ? `<button class="btn wide go" data-a="league">Next: ${nextL.name}</button>` : ''}
        ${!won ? '<button class="btn wide primary" data-a="retry">Try again</button>' : ''}
        <button class="btn wide" data-a="hub">Back to ${D.PLANT_LEAGUES.includes(L) ? 'cups' : 'leagues'}</button>
      </div></div>`;
    PS.ui.drawSproutTo(resEl.querySelector('canvas.hero'), s, won ? { arms: 'up', eyes: 'happy', mouth: 'open' } : { eyes: 'sad', mouth: 'flat' });
    const lid = L.id;
    bindRes({
      next: () => { V = null; resEl.hidden = true; startBattle(lid, index + 1); },
      retry: () => { V = null; resEl.hidden = true; startBattle(lid, index); },
      league: () => backToHub(() => preview(nextL, 0)),
    });
  }
  function resultsBoss(res) {
    const { boss: B, s, won } = V;
    resEl.innerHTML = `<div class="card">
      <div class="eyebrow">Zomboss · ${B.name}</div>
      <canvas class="px hero" width="32" height="32"></canvas>
      <h1>${won ? (res.first ? 'Zomboss defeated!' : 'Victory!') : 'So close!'}</h1>
      <p class="sub">${won ? winSub(s, `the ${B.name}`) : `The ${B.name} won this time.`}</p>
      ${won ? '' : lossHtml()}
      <div class="b-rrows">${res.rows}</div>${upsBlock(res)}
      <div class="modal-btns">${!won ? '<button class="btn wide primary" data-a="retry">Try again</button>' : ''}<button class="btn wide" data-a="hub">Back to Zombosses</button></div></div>`;
    const hero = resEl.querySelector('canvas.hero');
    if (won) PS.ui.drawSproutTo(hero, s, { arms: 'up', eyes: 'happy', mouth: 'open' }); else { const c = critterBox(B.id, 32); PS.ui.fitCanvas(hero, c); PS.ui.paint(hero, c); }
    const id = B.id;
    bindRes({ retry: () => { V = null; resEl.hidden = true; previewBossAgain(id); } });
  }
  function previewBossAgain(id) { fightEl.hidden = true; hubEl.hidden = false; hubTab = 'legends'; renderHub(); previewBoss(BOSS[id]); }
  function resultsTower(res) {
    const { s, won, floor: f } = V, T = extra().tower;
    let title, sub, btns;
    if (won && res.hpNext != null) {
      const hp = Math.round(res.hpNext * 100);
      title = res.record && f > 1 ? 'New record!' : `Floor ${f} cleared!`;
      sub = `${esc(s.name)} heals ${Math.round(TOWER.heal * 100)}% for the next floor.`;
      btns = `<div class="b-hpline">HP<div class="b-hpbar"><i style="width:${hp}%" class="${res.hpNext > 0.5 ? '' : res.hpNext > 0.2 ? 'mid' : 'low'}"></i></div>${hp}%</div>
        <div class="modal-btns"><button class="btn wide go" data-a="next">Climb to Floor ${f + 1}!</button><button class="btn wide" data-a="stop">Stop and take ${res.pot} coins</button></div>`;
    } else {
      title = 'Great climb!';
      sub = `${esc(s.name)} reached Floor ${f}${res.pot ? ` (the bag had ${res.pot} coins)` : ''}. Best ever: Floor ${T.best || 0}.`;
      btns = `<div class="modal-btns"><button class="btn wide primary" data-a="again">Climb again</button><button class="btn wide" data-a="hub">Back to the Tower</button></div>`;
    }
    resEl.innerHTML = `<div class="card"><div class="eyebrow">Battle Tower · Floor ${f}</div><canvas class="px hero" width="32" height="32"></canvas>
      <h1 class="${/\d/.test(title) ? 'num' : ''}">${title}</h1><p class="sub">${sub}</p>${won ? '' : lossHtml()}<div class="b-rrows">${res.rows}</div>${upsBlock(res)}${btns}</div>`;
    PS.ui.drawSproutTo(resEl.querySelector('canvas.hero'), s, won ? { arms: 'up', eyes: 'happy', mouth: 'open' } : { eyes: 'happy', mouth: 'smile' });
    bindRes({
      next: () => { V = null; resEl.hidden = true; startTowerFloor(); },
      stop: () => { const pot = towerEnd('stop'); sfx('level'); backToHub(() => PS.ui.toast(`You took ${pot} coins home!`)); },
      again: () => { hubTab = 'tower'; backToHub(() => previewTower()); },
    });
  }
  function giveTreat(t, f, run) {
    if (t.kind === 'fruit') { const a = STAT_FRUITS[Math.floor(Math.random() * STAT_FRUITS.length)], b = STAT_FRUITS[Math.floor(Math.random() * STAT_FRUITS.length)]; ST.addFruit(a, 1); ST.addFruit(b, 1); return `<div class="b-rrow gold"><canvas class="px" data-fruit="${a}"></canvas><span>Treat: ${a === b ? `2 ${D.FRUITS[a].name}s` : `${D.FRUITS[a].name} and ${D.FRUITS[b].name}`}!</span></div>`; }
    if (t.kind === 'gold' || t.kind === 'gold2') {
      ST.addFruit('goldfruit', 1); let extraF = '';
      if (t.kind === 'gold2') { const a = STAT_FRUITS[Math.floor(Math.random() * STAT_FRUITS.length)]; ST.addFruit(a, 1); ST.addFruit('apple', 1); extraF = `, a ${D.FRUITS[a].name} and a Heart Apple`; }
      return `<div class="b-rrow gold"><canvas class="px" data-fruit="goldfruit"></canvas><span>Treat: a Golden Fruit${extraF}!</span></div>`;
    }
    const bag = TOWER.coins(f) * 3; run.pot += bag;
    let h = `<div class="b-rrow gold"><canvas class="px" data-coin="big"></canvas>Treat: big coin bag<b>+${bag}</b></div>`;
    if (t.kind === 'egg' && Math.random() < t.chance) { const egg = ST.addEgg(t.egg, `Battle Tower floor ${f}`); h += eggRow(t.egg, egg, `Lucky! ${aOrAn(eggName(t.egg)) === 'an' ? 'An' : 'A'} ${eggName(t.egg)}!`); }
    if (f % 10 === 0 && f >= 20) { const it = ST.randomItem(); ST.addItem(it); h += itemRow(it); }
    return h;
  }
  function resultsFriend(res) {
    const { b, fr } = V, win = b.winner, draw = !win;
    resEl.innerHTML = `<div class="card"><div class="eyebrow">Friend Battle</div>
      <div style="display:flex;justify-content:center;gap:6px"><canvas class="px duo" data-side="p" width="32" height="32"></canvas><canvas class="px duo" data-side="o" width="32" height="32"></canvas></div>
      <h1>${draw ? "It's a draw!" : `${esc(fr.names[win])} wins!`}</h1><p class="sub">${draw ? `Both were knocked out at the same time after ${turnsText(b.turn)}.` : `${esc(b[win].name)} won in ${turnsText(b.turn)}.`} Good game, ${esc(fr.names.p)} and ${esc(fr.names.o)}!</p>
      <div class="b-rrows">${res.rows}</div>${upsBlock(res)}
      <div class="modal-btns"><button class="btn wide go" data-a="rematch">Rematch!</button><button class="btn wide" data-a="hub">Done</button></div></div>`;
    resEl.querySelectorAll('canvas.duo').forEach(c => { const side = c.dataset.side, f = b[side]; PS.ui.drawSproutTo(c, f.s || f.look, draw || side === win ? { arms: 'up', eyes: 'happy', mouth: 'open' } : { eyes: 'sad', mouth: 'flat' }); if (side === 'o') c.style.transform = 'scaleX(-1)'; });
    const sA = V.s, sB = V.sB, nA = fr.names.p, nB = fr.names.o, own = V.own;
    bindRes({ rematch: () => { V = null; resEl.hidden = true; startFriend(sA, sB, nA, nB, own); } });
  }

  // ---------------- particles & pops ----------------
  function burst(p, el, n, speed) {
    const P = elParticles(el);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (0.4 + Math.random() * 0.6) * speed;
      V.parts.push({ x: p.x + (Math.random() - 0.5) * 6, y: p.y + (Math.random() - 0.5) * 6, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.3, g: P.g, life: 0.4 + Math.random() * 0.35, spr: P.spr[i % P.spr.length] });
    }
  }
  function rise(p, spr, n, down) {
    for (let i = 0; i < n; i++) V.parts.push({ x: p.x + (Math.random() - 0.5) * 22, y: p.y + 6 + Math.random() * 8, vx: 0, vy: down ? 14 + Math.random() * 8 : -(16 + Math.random() * 10), g: 0, life: 0.5 + Math.random() * 0.4, delay: i * 0.04, spr });
  }
  // A little element-coloured splash where a move lands: leaf petals drift, water droplets arc and fall, fire embers
  // rise and flicker, stone chips bounce down, sky wind streaks rush past, shadow wisps curl up, light sparkles twinkle,
  // sweet sprinkles pop out. dir: +1 when the attacker is on the left. small: one hit of a multi-hit move.
  function hitFx(p, el, strong, dir, small) {
    el = FXEL[el] || el;
    const I = icons(), r = Math.random, n = small ? 3 : strong ? 9 : 6;
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, v = 18 + r() * 26;
      const q = { x: p.x + (r() - 0.5) * 8, y: p.y + (r() - 0.5) * 8, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0, life: 0.45 + r() * 0.3, spr: null };
      switch (el) {
        case 'leaf': q.spr = I.petals[i % I.petals.length]; q.vy = -Math.abs(q.vy) * 0.7; q.g = 36; q.spin = 1 + i * 1.9; q.life += 0.35; break;
        case 'water': q.spr = i % 2 ? I.drop : I.droplet; q.vx *= 0.8; q.vy = -30 - r() * 40; q.g = 260; break;
        case 'fire': q.spr = I.embers[i % I.embers.length]; q.vx *= 0.5; q.vy = -22 - r() * 30; q.g = -30; q.blink = 1 + i; q.life += 0.2; break;
        case 'stone': q.spr = I.chips[i % I.chips.length]; q.vy = -40 - r() * 34; q.g = 330; break;
        case 'sky': q.spr = I.streak; q.x -= dir * 10; q.vx = dir * (80 + r() * 50); q.vy = (r() - 0.5) * 12; q.life = 0.3 + r() * 0.2; break;
        case 'shadow': q.spr = I.wisps[i % I.wisps.length]; q.vx *= 0.4; q.vy = -12 - r() * 14; q.spin = 1 + i * 2.3; q.life += 0.3; break;
        case 'light': q.spr = I.twinkle[i % I.twinkle.length]; q.vx *= 0.6; q.vy *= 0.6; q.blink = 1 + i; q.life += 0.15; break;
        case 'sweet': q.spr = i % 4 === 3 ? fxs('heart') : I.sprinkle[i % I.sprinkle.length]; q.vy = -34 - r() * 30; q.g = 190; break;
        default: q.spr = I.twinkle[0];
      }
      V.parts.push(q);
    }
  }
  function pop(x, y, text, color, size, tag) { V.pops.push({ x, y, text, color, size, tag, t: 0, life: 0.95 }); }
  function ring(x, y, color, r, delay) { V.rings.push({ x, y, color, r, t: -(delay || 0), life: 0.32 }); }
  function quake(t, a) { if (calm()) return; V.quakeA = V.quake > 0 ? Math.max(V.quakeA, a) : a; V.quake = Math.max(V.quake, t); }
  function flash(c, t) { V.flashC = c; V.flashT = t; V.flashL = t; V.flashA = calm() ? 0.15 : 0.7; } // reduced motion: a soft tint, not a bright flash
  function banner(text, sub, color, life) { V.banner = { text, sub, color, t: 0, life: life || 1.4 }; }
  function cheer(chance) { for (const c of V.crowd) if (Math.random() < chance) c.hop = 1; }

  // ---------------- crowd ----------------
  // the crowd: the element sprites of the arena's garden cheer along
  const CROWD = Object.fromEntries(Object.entries(D.AREA_ELEMENTS).map(([a, list]) => [a, [...new Set(list.map(x => 'el:' + x[0]))]]));
  function makeCrowd() {
    if (!V) return;
    const T = THEMES[V.area] || THEMES.meadow;
    V.crowd = [];
    if (!T.crowd) return;
    const pool = T.crowd === 'mix' ? Object.keys(D.ELEMENT_INFO).map(e => 'el:' + e) : CROWD[V.area] || CROWD.frontyard;
    // Same animals every time for this battle (a resize only moves them), garden-sized (1:1 like the Garden and the wild
    // animals), and never standing in front of the horizon props or right behind the opponent.
    const r = srng(V.seed || 1), hy = HY(), wall = T.far === 'walls', busy = [];
    for (const [kind, fx0] of wall ? [] : T.props || []) {
      const c = bprop(kind, T.theme || 'day'); if (!c) continue;
      const x = propX(kind, c, fx0);
      if (PX.artH(c) >= 24) busy.push([x - PX.artW(c) * 0.35 - 4, x + PX.artW(c) * 0.35 + 4]); // tall props (trees): keep their trunks clear
    }
    const ox = spot('o').x; if (!wall) busy.push([ox - 12, ox + 12]);
    const want = wall ? (WW >= 150 ? 6 : 5) : (WW >= 150 ? 4 : 3), picks = [];
    for (let x = 12; x < WW - 8 && picks.length < 16; x += 3) if (!busy.some(([a, b]) => x >= a && x <= b) && !picks.some(p => Math.abs(p - x) < 18)) picks.push(x);
    const k = Math.min(want, picks.length), xs = [];
    for (let i = 0; i < k; i++) { const x = picks[k > 1 ? Math.round(i * (picks.length - 1) / (k - 1)) : Math.floor(picks.length / 2)]; if (!xs.includes(x)) xs.push(x); } // spread evenly
    xs.forEach((x, i) => {
      const kind = pool[Math.floor(r() * pool.length)];
      V.crowd.push({ kind, x, y: wall ? hy - 17 : hy + 5 + (i % 2) * 2, flip: x > WW / 2, hop: 0, ph: r() * 6, cheer: false });
    });
    V.crowd.sort((a, b) => a.y - b.y);
  }

  // ---------------- update ----------------
  function update(dt) {
    V.t += dt;
    const speed = V.fast ? 4 : 1;
    // step timing
    if (!V.step && V.queue.length) nextStep();
    if (V.step) {
      const st = V.step; st.t += dt * speed;
      if (st.shoot && st.t >= st.shoot.t && !st.shoot.done) { st.shoot.done = true; shoot(st.shoot.from, st.shoot.el, st.shoot.giant); }
      if (st.at) for (const a of st.at) if (!a.done && st.t >= a.t) { a.done = true; safe(a.fn); }
      if (st.t >= st.need) { V.step = null; if (V.queue.length) nextStep(); else onQueueEmpty(); }
    }
    if (!V) return;
    // typewriter
    if (V.log.shown < V.log.full.length) V.log.shown = Math.min(V.log.full.length, V.log.shown + dt * 55 * speed * (V.fast ? 3 : 1));
    // hp bars ease toward display snapshot
    for (const side of SIDES) {
      const target = V.disp[side].hp, cur = V.hpShown[side];
      if (cur !== target) { const d = target - cur, stepv = Math.max(Math.abs(d) * 6 * dt * speed, 30 * dt * speed); V.hpShown[side] = Math.abs(d) <= stepv ? target : cur + Math.sign(d) * stepv; }
    }
    updateBars();
    // anims
    const ds = dt * speed;
    for (const side of SIDES) {
      const A = V.a[side];
      dec(A, 'lunge', side === 'o' && V.boss ? 1.4 : 2.2, ds); dec(A, 'hop', 3, ds); dec(A, 'shake', 1, ds); dec(A, 'flash', 1, ds); dec(A, 'poseT', 1, ds); dec(A, 'emoteT', 1, ds);
      dec(A, 'dodge', 2.2, ds); dec(A, 'enter', V.boss && side === 'o' ? 1.1 : 1.6, ds); dec(A, 'drop', 1.1, ds);
      if (A.fainting) A.fainting = Math.min(1, A.fainting + dt * speed * 1.1);
      if (A.poseT <= 0 && !A.win) A.pose = null;
      if (A.emoteT <= 0) A.emote = null;
      if (V.t > A.blinkAt) A.blinkAt = V.t + 2.5 + Math.random() * 3;
    }
    if (V.boss && V.a.o.enter <= 0 && !V.a.o.landed) { V.a.o.landed = true; quake(0.6, 3); sfx('thud'); burst({ x: spot('o').x, y: spot('o').y - 2 }, 'stone', 18, 40); }
    // ambient status fx
    for (const side of SIDES) {
      const d = V.disp[side], sp = spot(side), w = side === 'o' && V.boss ? 40 : side === 'o' && V.wild ? 24 : 16;
      if (V.a[side].fainting) continue;
      if (d.status === 'poison' && Math.random() < dt * 3) V.parts.push({ x: sp.x + (Math.random() - 0.5) * w, y: sp.y - 8 - Math.random() * 10, vx: 0, vy: -12, g: 0, life: 0.7, spr: icons().bubble });
      if (d.status === 'burn' && Math.random() < dt * 4) V.parts.push({ x: sp.x + (Math.random() - 0.5) * w, y: sp.y - 4 - Math.random() * 12, vx: 0, vy: -16, g: 0, life: 0.5, spr: fxs('spark', Math.random() < 0.5 ? '#ff9a3a' : '#fbf236') });
      // a charging boss pulls sparks inward
      if (d.charging && V.boss && side === 'o' && live() && Math.random() < dt * 22) {
        const tp = topOf('o'), a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 16, P = elParticles(V.boss.els[0]);
        V.parts.push({ x: tp.x + Math.cos(a) * r, y: tp.y + Math.sin(a) * r * 0.7, vx: -Math.cos(a) * r * 2.2, vy: -Math.sin(a) * r * 1.5, g: 0, life: 0.42, spr: P.spr[Math.floor(Math.random() * P.spr.length)] });
      }
    }
    for (const p of V.parts) { if (p.delay > 0) { p.delay -= dt; continue; } p.life -= dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.spin) p.x += Math.sin(V.t * 14 + p.spin) * 0.6; }
    keep(V.parts, partAlive); // (in place: no new arrays every frame)
    for (const p of V.pops) p.t += dt;
    keep(V.pops, popAlive);
    for (const r of V.rings) r.t += dt * speed;
    keep(V.rings, popAlive);
    for (const bm of V.beams) bm.t += dt * speed;
    keep(V.beams, popAlive);
    updateFx(dt * speed);
    for (const side of SIDES) { const A = V.a[side]; if (A.move) { A.move.t += dt * speed; if (A.move.t >= A.move.life) A.move = null; } if (A.recoil > 0) A.recoil = Math.max(0, A.recoil - dt * speed * 6); }
    if (V.quake > 0) V.quake = Math.max(0, V.quake - dt);
    if (V.flashT > 0) V.flashT = Math.max(0, V.flashT - dt);
    if (V.banner) { V.banner.t += dt; if (V.banner.t > V.banner.life) V.banner = null; }
    for (const c of V.clouds) { c.x += c.v * dt; if (c.x > WW + 20) { c.x = -30; c.y = 2 + Math.random() * Math.max(4, HY() - 14); } }
    for (const c of V.crowd) { if (c.hop > 0) c.hop = Math.max(0, c.hop - dt * 2.4); else if (c.cheer && Math.random() < dt * 2.5) c.hop = 1; else if (!c.cheer && Math.random() < dt * 0.08) c.hop = 1; }
    ambient(dt);
    const T = THEMES[V.area] || THEMES.meadow;
    if (T.lightning && live()) { V.boltT -= dt; if (V.boltT <= 0) { V.boltT = 4 + Math.random() * 6; V.bolt = { t: 0, x: Math.round(WW * (0.15 + Math.random() * 0.7)), seed: Math.floor(Math.random() * 1e5) }; if (!calm()) flash('#dfe8fb', 0.18); setTimeout(() => sfx('thud'), 300); } }
    if (V.bolt) { V.bolt.t += dt; if (V.bolt.t > 0.35) V.bolt = null; }
  }
  // weather & theme particles (drawn in front)
  function ambient(dt) {
    const T = THEMES[V.area] || THEMES.meadow, k = T.amb, night = safe(() => PS.clock.night(), 0);
    const add = addAmb, r = Math.random;
    if (k === 'petals' && r() < dt * 1.6) add({ x: -4, y: r() * WH * 0.7, vx: 14 + r() * 10, vy: 5 + r() * 5, sway: r() * 6, life: 12, c: r() < 0.5 ? '#ffc8da' : '#ffffff', w: 2, h: 1 });
    if ((k === 'fireflies' || (k === 'petals' && night > 0.6)) && r() < dt * 1.4) add({ x: r() * WW, y: HY() + r() * (WH - HY()) * 0.8, vx: (r() - 0.5) * 6, vy: -2 - r() * 3, sway: r() * 6, life: 4, c: '#f0ffb0', blink: true, w: 1, h: 1 });
    if (k === 'sprinkles' && r() < dt * 3) add({ x: r() * WW, y: -2, vx: (r() - 0.5) * 4, vy: 16 + r() * 8, life: 14, c: ['#ff9fb4', '#9fd0ff', '#b8ec9a', '#fff09a', '#ffffff'][Math.floor(r() * 5)], w: r() < 0.5 ? 2 : 1, h: r() < 0.5 ? 1 : 2 });
    if (k === 'snow' && r() < dt * 14) add({ x: r() * (WW + 20) - 10, y: -2, vx: -3 + r() * 2, vy: 10 + r() * 10, sway: r() * 6, life: 20, c: r() < 0.7 ? '#ffffff' : '#dfe8fb', w: r() < 0.3 ? 2 : 1, h: r() < 0.3 ? 2 : 1 });
    if (k === 'embers' && r() < dt * 9) add({ x: r() * WW, y: WH + 2, vx: (r() - 0.5) * 6, vy: -(14 + r() * 18), sway: r() * 6, life: 12, c: r() < 0.5 ? '#ffbc7e' : r() < 0.5 ? '#fff09a' : '#ff9486', w: 1, h: 1, fade: true });
    if (k === 'rain' && r() < dt * 40) add({ x: r() * (WW + 30), y: -4, vx: -22, vy: 110 + r() * 30, life: 3, c: '#c4d4f4', w: 1, h: 3, rain: true });
    if (k === 'wind' && r() < dt * 2.5) add({ x: -12, y: r() * WH * 0.8, vx: 60 + r() * 30, vy: 0, life: 4, c: '#ffffff', w: 6 + Math.floor(r() * 6), h: 1, alpha: 0.6 });
    if (k === 'leaves' && r() < dt * 1.2) add({ x: WW + 4, y: r() * WH * 0.6, vx: -(10 + r() * 8), vy: 6 + r() * 5, sway: r() * 6, life: 14, c: r() < 0.5 ? '#9cdc7e' : '#b8ec9a', w: 2, h: 1 });
    if (k === 'bubbles' && r() < dt * 3) add({ x: r() * WW, y: WH + 2, vx: 0, vy: -(8 + r() * 9), sway: r() * 6, life: 22, c: r() < 0.5 ? '#effcff' : '#c8f0fa', w: r() < 0.3 ? 2 : 1, h: r() < 0.3 ? 2 : 1, fade: true });
    if (k === 'dust' && r() < dt * 1) add({ x: r() * WW, y: HY() + r() * 20, vx: 3, vy: -2, life: 5, c: '#fff6c8', w: 1, h: 1, blink: true });
    for (const p of V.amb) {
      p.life -= dt; p.x += (p.vx + (p.sway ? Math.sin(V.t * 2 + p.sway) * 6 : 0)) * dt; p.y += p.vy * dt;
      if (p.rain && p.y > WH * 0.4 + ((p.x * 7) % (WH * 0.6))) { p.life = 0; if (Math.random() < 0.3) V.parts.push({ x: p.x, y: p.y, vx: 0, vy: 0, g: 0, life: 0.12, spr: icons().splash }); }
    }
    keep(V.amb, ambAlive);
  }
  function addAmb(p) { if (V.amb.length < 90) V.amb.push(p); }
  function dec(A, k, r, ds) { if (A[k] > 0) A[k] = Math.max(0, A[k] - ds * r); }
  // element-flavoured projectiles
  function shoot(from, el, giant) {
    el = FXEL[el] || el;
    const a = from === 'o' && (V.boss || V.wild) ? topOf('o') : { x: spot(from).x + (from === 'p' ? 10 : -10), y: spot(from).y - 16 };
    const b = topOf(from === 'p' ? 'o' : 'p');
    const ax = a.x, ay = a.y, bx = b.x, by = b.y, P = elParticles(el), I = icons();
    const n = giant ? 26 : 9, life = giant ? 0.3 : 0.22;
    const push = (spr, i, k, extra) => V.parts.push(Object.assign({ x: ax + (Math.random() - 0.5) * (giant ? 16 : 4), y: ay + (Math.random() - 0.5) * (giant ? 12 : 4), vx: (bx - ax) / life, vy: (by - ay) / life, g: 0, life, delay: k * (giant ? 0.3 : 0.12), spr }, extra || {}));
    if (el === 'light' || (giant && el === 'fire')) V.beams.push({ ax, ay, bx, by, t: 0, life: giant ? 0.45 : 0.28, w: giant ? 5 : 2, c: el === 'fire' ? ['#fbf236', '#ff9a3a', '#df5a26'] : ['#ffffff', '#fff27a', '#f6c83a'] });
    for (let i = 0; i < n; i++) {
      const k = i / n;
      switch (el) {
        case 'fire': push(i % 3 === 0 ? I.fireball : P.spr[i % P.spr.length], i, k); break;
        case 'water': push(i % 2 ? I.drop : P.spr[i % P.spr.length], i, k, { vy: (by - ay) / life - 70, g: 560 }); break;
        case 'stone': push(i % 3 === 0 ? I.rock : P.spr[i % P.spr.length], i, k, { vy: (by - ay) / life - 90, g: 760 }); break;
        case 'shadow': push(i % 2 ? I.orb : P.spr[i % P.spr.length], i, k, { spin: i * 1.7 }); break;
        case 'sky': push(i % 2 ? I.wind : P.spr[i % P.spr.length], i, k); break;
        case 'leaf': push(P.spr[i % P.spr.length], i, k, { spin: i * 2.1 }); break;
        case 'sweet': push(i % 3 === 0 ? fxs('heart') : I.sprinkle[i % I.sprinkle.length], i, k, { spin: i }); break;
        case 'light': push(i % 2 ? I.star : P.spr[i % P.spr.length], i, k); break;
        default: push(i % 3 === 0 ? I.star : P.spr[i % P.spr.length], i, k);
      }
    }
  }

  // ---------------- move animations ----------------
  // Every attack has a shape that matches what it is: peas fly (one, two or four), cabbages and melons arc overhead,
  // cherries go BOOM, Chomper and zombies bite with giant jaws, Squash jumps and slams, lightning zig-zags, lasers beam,
  // vines wrap, clouds drift, rocks fall from the sky... Support moves get shields, suns, power-ups and spooky spirals.
  // animMove() schedules everything so the effect lands just as the hit step (the damage number) begins.
  const ANIM = {
    // straight shots
    peashot: { s: 'shot', o: 'pea', n: 1 }, repeater: { s: 'shot', o: 'pea', n: 2 }, gatling: { s: 'shot', o: 'pea', n: 4 }, doubletrouble: { s: 'shot', o: 'pea', n: 2 },
    snowshot: { s: 'shot', o: 'icepea', n: 1 }, frostrepeat: { s: 'shot', o: 'icepea', n: 2 }, blizzardpea: { s: 'shot', o: 'icepea', n: 4 },
    seedspit: { s: 'shot', o: 'seed', n: 1 }, thornshot: { s: 'shot', o: 'thorn', n: 3 }, spineshot: { s: 'shot', o: 'thorn', n: 2 }, spikestorm: { s: 'shot', o: 'thorn', n: 5 },
    kernelshot: { s: 'shot', o: 'kernel', n: 1 }, cocoshot: { s: 'shot', o: 'coco', n: 1, heavy: true }, starshot: { s: 'shot', o: 'star', n: 2 }, starburst: { s: 'shot', o: 'star', n: 3 },
    armybarrage: { s: 'shot', o: 'bullet', n: 6 }, sunspore: { s: 'shot', o: 'sunball', n: 1 }, puff: { s: 'shot', o: 'spore', n: 1 }, toxicspit: { s: 'shot', o: 'goo', n: 1 },
    magicspark: { s: 'shot', o: 'star', n: 1 }, magicbolt: { s: 'shot', o: 'star', n: 3 }, berryzap: { s: 'zap' }, luckypetal: { s: 'shot', o: 'coin', n: 2 },
    // lobbed over the top
    loblob: { s: 'lob', o: 'cabbage' }, cabbagelob: { s: 'lob', o: 'cabbage' }, highlob: { s: 'lob', o: 'cabbage', h: 40 }, splatter: { s: 'lob', o: 'cabbage' }, lobstorm: { s: 'lob', o: 'cabbage', n: 3 }, catapultlob: { s: 'lob', o: 'cabbage', h: 40 },
    melonlob: { s: 'lob', o: 'melon' }, meteorlob: { s: 'lob', o: 'melon', h: 44 }, wintermelon: { s: 'lob', o: 'wmelon' }, butterlob: { s: 'lob', o: 'butter' }, cobcannon: { s: 'lob', o: 'cob', h: 46, boom: true },
    cocomortar: { s: 'lob', o: 'coco', boom: true }, pebbletoss: { s: 'lob', o: 'rock', n: 3, h: 22 }, bolttoss: { s: 'lob', o: 'bolt', n: 2 }, zsnow: { s: 'lob', o: 'snowball', n: 2 },
    bbarrage: { s: 'lob', o: 'cannon', n: 4, boom: true }, zcannon: { s: 'lob', o: 'cannon', boom: true }, cannonball: { s: 'lob', o: 'cannon', boom: true }, battleship: { s: 'lob', o: 'cannon', n: 3, boom: true }, zimptoss: { s: 'lob', o: 'rock', h: 34 },
    // explosions
    pop: { s: 'boom' }, kaboom: { s: 'boom', big: true }, megablast: { s: 'boom', big: true }, cherrypop: { s: 'boom' }, cherryblast: { s: 'boom', big: true }, megacherry: { s: 'boom', big: true }, zboom: { s: 'boom', big: true },
    spudup: { s: 'boom', dirt: true }, mashblast: { s: 'boom', dirt: true, big: true }, megamine: { s: 'boom', dirt: true, big: true },
    doompuff: { s: 'boom', doom: true }, gloomboom: { s: 'boom', doom: true, big: true }, megadoom: { s: 'boom', doom: true, big: true }, supernova: { s: 'boom', star: true, big: true }, venomburst: { s: 'boom', goo: true },
    hotpepper: { s: 'firecol' }, dragonpepper: { s: 'firecol', big: true }, ghostpepper: { s: 'firecol', dark: true }, infernoring: { s: 'firecol', big: true },
    // bites
    nibble: { s: 'chomp' }, bigbite: { s: 'chomp' }, jawcrush: { s: 'chomp', big: true }, chomp: { s: 'chomp' }, superchomp: { s: 'chomp' }, biggulp: { s: 'chomp', big: true }, snapkelp: { s: 'chomp', kelp: true },
    dragonsnap: { s: 'flame' }, zbite: { s: 'chomp' }, zbrain: { s: 'chomp' }, zimp: { s: 'chomp' },
    // dash in and bonk
    leafjab: { s: 'bonk' }, wildthrash: { s: 'bonk', n: 3 }, capbonk: { s: 'bonk' }, torchbonk: { s: 'bonk', fire: true }, nutbump: { s: 'bonk' }, shellslam: { s: 'bonk' }, bodyslam: { s: 'bonk', big: true },
    bonk: { s: 'bonk' }, combopunch: { s: 'bonk', n: 3 }, kingbonk: { s: 'bonk', big: true }, tackle: { s: 'bonk' }, gigaimpact: { s: 'bonk', big: true }, pumpkinbump: { s: 'bonk' }, shieldbash: { s: 'bonk' },
    shadowpunch: { s: 'bonk', dark: true }, jetdash: { s: 'bonk' }, zconebonk: { s: 'bonk' }, zbucket: { s: 'bonk' }, zdoorslam: { s: 'bonk', big: true }, ztackle: { s: 'bonk' }, zrush: { s: 'bonk', big: true },
    zcharge: { s: 'bonk', big: true }, zpick: { s: 'bonk' }, zswing: { s: 'bonk' }, ztumble: { s: 'bonk' }, zspring: { s: 'jump' },
    // jump and slam, bowling nuts
    pounce: { s: 'jump' }, supersquash: { s: 'jump', big: true }, megasquash: { s: 'jump', big: true }, zvault: { s: 'jump' }, zdrop: { s: 'jump' }, zsmash: { s: 'jump', big: true }, bpole: { s: 'jump', big: true },
    nutroll: { s: 'roll' }, gigaroll: { s: 'roll', big: true },
    // lightning, beams, fire, ice, water
    spark: { s: 'zap' }, chainzap: { s: 'zap', n: 2 }, zap: { s: 'zap' }, zapreed: { s: 'zap' }, stormreed: { s: 'zap', n: 2 }, shockberry: { s: 'zap' }, zzap: { s: 'zap' }, thunderbolt: { s: 'zap', sky: true },
    thunderclap: { s: 'zap', sky: true, big: true }, thunderreed: { s: 'zap', sky: true, big: true }, megavolt: { s: 'zap', sky: true, big: true }, thunderberry: { s: 'zap', sky: true, big: true },
    beamshot: { s: 'beam', w: 1 }, laserdot: { s: 'beam', w: 1 }, beambean: { s: 'beam', w: 2 }, photonbeam: { s: 'beam', w: 2 }, starbeam: { s: 'beam', w: 2, c: 'star' }, zlaser: { s: 'beam', w: 2 },
    megalaser: { s: 'beam', w: 4 }, hyperbeam: { s: 'beam', w: 4 }, infibeam: { s: 'beam', w: 3 }, bsphinx: { s: 'beam', w: 4, c: 'sun' }, btomorrow: { s: 'beam', w: 4 },
    sunbeam: { s: 'beam', w: 2, c: 'sun' }, royalbeam: { s: 'beam', w: 4, c: 'sun' }, sunburst: { s: 'sun' }, solarflare: { s: 'sun', big: true }, megasun: { s: 'sun', big: true }, zstaff: { s: 'beam', w: 2, c: 'sun' }, zsunsteal: { s: 'steal' },
    ember: { s: 'flame', short: true }, snapflame: { s: 'flame', short: true }, flamethrower: { s: 'flame' }, inferno: { s: 'flame', big: true }, infernobreath: { s: 'flame', big: true }, bdragon: { s: 'flame', big: true }, bfire: { s: 'lob', o: 'fireball', h: 30, boom: true },
    iceshard: { s: 'shot', o: 'shard', n: 3 }, frostbreath: { s: 'flame', ice: true }, frostbite: { s: 'freeze' }, zyeti: { s: 'freeze' }, bmammoth: { s: 'freeze', big: true }, avalanche: { s: 'drop', o: 'iceblock', n: 3 }, glacier: { s: 'drop', o: 'iceblock', big: true },
    splash: { s: 'lob', o: 'water', h: 18 }, lilysplash: { s: 'lob', o: 'water', h: 18 }, zsplash: { s: 'lob', o: 'water', h: 18 }, waterjet: { s: 'flame', water: true }, tidalwave: { s: 'wave' }, lotusbloom: { s: 'wave', lotus: true },
    krakenwrap: { s: 'wrap', c: 'tentacle' }, lasso: { s: 'wrap', c: 'rope' }, zlasso: { s: 'wrap', c: 'rope' },
    // clouds, magic, dark
    fume: { s: 'cloud' }, fumes: { s: 'cloud' }, gloom: { s: 'cloud', n: 2 }, gloomcloud: { s: 'cloud', big: true }, garlicbreath: { s: 'cloud', c: 'stink' }, megastink: { s: 'cloud', c: 'stink', big: true },
    arcanastorm: { s: 'rain', o: 'star' }, goldenstorm: { s: 'rain', o: 'coin' }, needlerain: { s: 'rain', o: 'thorn' }, swirlgaze: { s: 'hypno' }, hypnoking: { s: 'hypno', big: true },
    shadowstrike: { s: 'slash' }, lanternglow: { s: 'slash', c: 'gold' }, pumpkinking: { s: 'rain', o: 'pumpkin' }, eclipse: { s: 'eclipse' },
    // rock & robot
    rockslide: { s: 'drop', o: 'rock', n: 3 }, meteor: { s: 'drop', o: 'meteor', big: true }, spiketrap: { s: 'spikes' }, spikerock: { s: 'spikes' }, spiketitan: { s: 'spikes', big: true }, zdig: { s: 'spikes', dirt: true },
    robocannon: { s: 'missile' }, goldpull: { s: 'magnet' }, megamagnet: { s: 'magnet', big: true }, leafstorm: { s: 'leafstorm' },
    boomerang: { s: 'boomer' }, doubleboom: { s: 'boomer', n: 2 }, megaboom: { s: 'boomer', n: 3 },
  };
  // moves that don't hit: what they look like
  const SUPPORT = {
    shield: ['sprouthide', 'sunshield', 'hunker', 'ironbark', 'fortress', 'tallwall', 'shroomshield', 'blastshield', 'infishield', 'plasmashield', 'blazewall', 'zdoor', 'zarmor', 'zbucketup', 'zshoulder', 'bodycheck'],
    suns: ['sunsnack', 'warmglow', 'sunnyday', 'twinsun', 'bigsun', 'lotusheal', 'goldshine'],
    hex: ['sporepuff', 'sleepspore', 'stinkcloud', 'poisoncloud', 'smokepuff', 'hypnotize', 'nightmare', 'spookyscare', 'zgroan', 'freeze', 'tangle', 'zwrap', 'magnetpull', 'snaproot', 'zsand', 'znewsread'],
    disco: ['zdisco', 'zfever'],
  };
  const SUPPORT_OF = {}; for (const [k, list] of Object.entries(SUPPORT)) for (const id of list) SUPPORT_OF[id] = { s: k };
  const ANIM_BY_EL = { fire: { s: 'flame', short: true }, ice: { s: 'shot', o: 'shard', n: 2 }, electric: { s: 'zap' }, laser: { s: 'beam', w: 2 }, water: { s: 'lob', o: 'water', h: 18 }, poison: { s: 'cloud' },
    magic: { s: 'shot', o: 'star', n: 2 }, dark: { s: 'slash' }, rock: { s: 'drop', o: 'rock' }, robot: { s: 'lob', o: 'bolt' }, plant: { s: 'shot', o: 'seed', n: 2 }, normal: { s: 'bonk' } };
  function animOf(id) { const m = D.MOVES[id]; if (!m) return { s: 'bonk' }; return ANIM[id] || (m.pow > 0 ? ANIM_BY_EL[m.el] || { s: 'bonk' } : SUPPORT_OF[id] || { s: 'power' }); }

  // little sprites for the animations (drawn once): chibi sticker style — round chunky pastel shapes with one soft shade,
  // a fine inner outline and a bold outer ring; the sun, the star and the bowling nut get big glossy eyes
  const ASPR = {};
  function aspr(k) {
    if (ASPR[k]) return ASPR[k];
    const G = PX.Grid, A = PX.art, P = (f) => PX.piece(g, f), soft = (t, cx, cy, rx, ry, R, o) => A.softBody(t, cx, cy, rx, ry, R, o);
    let g, bold = true;
    const ball = (n, R, r) => { g = new G(n, n); P(t => soft(t, n / 2, n / 2, r || n / 2 - 1, r || n / 2 - 1, R)); };
    const egg = (w, h, rx, ry, R, rot) => { g = new G(w, h); P(t => soft(t, w / 2, h / 2, rx, ry, R, { rot: rot || 0 })); };
    const on = (x, y) => g.filled(x, y);
    switch (k) {
      case 'pea': ball(9, ['#eafcc8', '#ace47e', '#86c66a']); break;
      case 'icepea': ball(9, ['#ffffff', '#c8f0fb', '#9ad6ef']); g.dots([[5.5, 5.5], [6, 5]], '#ffffff'); break;
      case 'sunball': ball(7, ['#fffbe2', '#fff09a', '#f6cc6a']); break;
      case 'spore': ball(7, ['#fbf2ff', '#dcc2f6', '#b89ce2']); break;
      case 'goo': ball(7, ['#f0ffcc', '#c4ee8c', '#98d272']); break;
      case 'kernel': egg(7, 7, 2.5, 2.4, ['#fffbe2', '#ffe68a', '#f0c460']); break;
      case 'coin': ball(7, ['#fffbe2', '#ffe07a', '#e8b850']); g.dots([[3, 2.5], [3, 3]], '#ffffff'); break;
      case 'seed': egg(7, 6, 2.4, 1.7, ['#fff8e6', '#f2dcae', '#d6b680']); break;
      case 'thorn': g = new G(12, 5); P(t => { t.poly([[1, 1.2], [11, 2.5], [1, 3.8]], '#ecf8c8'); t.poly([[1, 2.5], [11, 2.5], [1, 3.8]], '#c8e6a0'); }); break;
      case 'shard': g = new G(11, 6); P(t => { t.poly([[1, 1.2], [10.4, 3], [1, 4.8]], '#ddf6ff'); t.poly([[1, 3], [10.4, 3], [1, 4.8]], '#aedcf4'); }); g.dots([[3, 2], [3.5, 2], [5, 2.5]], '#ffffff'); break;
      case 'bullet': g = new G(7, 4); P(t => { t.ell(3.5, 2, 2.4, 1, '#f6eed6'); t.ell(3.5, 2.5, 2.2, 0.5, '#e0d2b0'); }); break;
      case 'coco': ball(11, ['#ecccac', '#cfa47e', '#ad8462']); for (const [x, y] of [[4.2, 4.4], [6.4, 4.4], [5.3, 6.4]]) g.ell(x, y, 0.65, 0.65, '#7e5a44'); break;
      case 'star': g = new G(11, 11); P(t => { t.poly(PX.starPts(5.5, 5.9, 5, 2.4, 5), '#fff09a'); t.ell(6.4, 7.6, 2.8, 1.6, '#f8d468', 0, (x, y) => t.filled(x, y)); });
        A.chibiEyes(g, 5.6, 6.3, { sp: 2.9, w: 1.5, h: 2.1 }); A.blush(g, 5.6, 7.8, { sp: 4.4, w: 0.7, h: 0.45 }); break;
      case 'cabbage': ball(11, ['#f0fcd0', '#bce892', '#94ce7a']); for (const p of [[[5.5, 2.6], [5.5, 8.4]], [[5.5, 5.6], [3.2, 3.8]], [[5.5, 6.6], [7.8, 4.6]], [[5.5, 7.6], [3.4, 6.6]]]) PX.stroke(g, p, 0.24, 0.24, '#8cc472'); break;
      case 'melon': g = new G(13, 11); P(t => soft(t, 6.5, 5.5, 5.2, 4.2, ['#dcf8b4', '#a2de82', '#7cc26c'])); for (const x of [4, 6.5, 9]) PX.stroke(g, [[x + 0.2, 1.8], [x - 0.3, 5.5], [x + 0.2, 9.2]], 0.42, 0.42, '#6aae5e'); break;
      case 'wmelon': g = new G(13, 11); P(t => soft(t, 6.5, 5.5, 5.2, 4.2, ['#ffffff', '#cdf0fb', '#a0d8f0'])); for (const x of [4, 6.5, 9]) PX.stroke(g, [[x + 0.2, 1.8], [x - 0.3, 5.5], [x + 0.2, 9.2]], 0.42, 0.42, '#ffffff'); g.dots([[3, 3], [10, 7]], '#ffffff'); break;
      case 'butter': g = new G(9, 7); P(t => { t.poly([[1.4, 2], [7.6, 2], [8, 2.6], [8, 5.6], [7.6, 6], [1.4, 6], [1, 5.6], [1, 2.6]], '#fff0a2'); t.poly([[1, 4.8], [8, 4.8], [8, 5.6], [7.6, 6], [1.4, 6], [1, 5.6]], '#f2d474'); }); g.dots([[2, 2.5], [2.5, 2.5], [3, 2.5]], '#fffbe2'); break;
      case 'cob': g = new G(15, 7); P(t => soft(t, 8.4, 3.5, 5.6, 2.5, ['#fffbe2', '#ffe68a', '#f0c460'], { hl: false })); for (let x = 5; x < 13.5; x += 1.5) for (const y of [2.5, 4]) if (g.filled(Math.floor(x), Math.floor(y))) g.dot(x, y, '#fff8c8'); P(t => { t.poly([[0.6, 1], [5.2, 3.5], [0.6, 6]], '#b8ec9a'); t.poly([[0.6, 3.5], [5.2, 3.5], [0.6, 6]], '#94d27e'); }); break;
      case 'rock': egg(9, 8, 3.6, 3, ['#f2eef8', '#d8d2e6', '#b6aecc']); break;
      case 'bolt': g = new G(7, 7); P(t => { t.poly([[1, 2.2], [3.5, 0.8], [6, 2.2], [6, 4.8], [3.5, 6.2], [1, 4.8]], '#d4d8ea'); t.poly([[3.5, 3.5], [6, 4.8], [3.5, 6.2], [1, 4.8]], '#b4bad2'); }); g.ell(3.5, 3.5, 0.9, 0.9, '#8a8eac'); bold = false; break;
      case 'snowball': ball(7, ['#ffffff', '#f4f8ff', '#d4def4']); break;
      case 'cannon': ball(8, ['#d6daf0', '#9ca0c4', '#7e82a8']); g.dots([[2.5, 2.5], [3, 2.5], [2.5, 3]], '#ffffff'); break;
      case 'water': ball(8, ['#f2fcff', '#a4def6', '#7ac2ea']); g.dots([[2.5, 3], [3, 2.5]], '#ffffff'); break;
      case 'fireball': ball(11, ['#fff8c0', '#ffc482', '#ff9c88']); g.ell(5, 5.2, 2.2, 2, '#fff2a8', 0, on); g.ell(4.6, 4.6, 1, 0.9, '#ffffff', 0, on); break;
      case 'pumpkin': g = new G(9, 8); P(t => soft(t, 4.5, 4.6, 3.6, 2.9, ['#ffe2b4', '#ffb87a', '#f09662'])); P(t => t.rect(4, 0, 1, 2, '#9cd884')); for (const x of [3, 6]) PX.stroke(g, [[x, 2.6], [x, 6.6]], 0.2, 0.2, '#f09662'); g.poly([[2.4, 4.6], [3.2, 3.6], [4, 4.6]], INK); g.poly([[5, 4.6], [5.8, 3.6], [6.6, 4.6]], INK); g.ell(4.5, 5.6, 1.2, 0.45, INK, 0, (x, y) => y >= 5); break;
      case 'iceblock': g = new G(12, 11); P(t => { t.poly([[1.8, 1], [10.2, 1], [11, 1.8], [11, 9.2], [10.2, 10], [1.8, 10], [1, 9.2], [1, 1.8]], '#d4f2fc'); t.poly([[8.6, 1], [10.2, 1], [11, 1.8], [11, 9.2], [10.2, 10], [1.8, 10], [1, 9.2], [1, 8.4], [8.6, 8.4]], '#aadcf2'); }); PX.stroke(g, [[2.6, 6.4], [2.6, 2.6], [6, 2.6]], 0.36, 0.36, '#ffffff'); break;
      case 'meteor': ball(11, ['#f0e2d4', '#ccb4a0', '#ac9482']); g.ell(4, 6.6, 1, 0.8, '#ffb07e'); g.ell(7, 4, 0.8, 0.7, '#ffb07e'); g.ell(6.6, 7.4, 0.6, 0.5, '#fff09a'); break;
      case 'nut': g = new G(15, 15); P(t => soft(t, 7.5, 7.6, 6, 6.2, ['#f8e2b8', '#e8c08a', '#cc9e66'])); PX.stroke(g, [[5, 2.8], [6, 3.8], [5.6, 4.8]], 0.25, 0.25, '#b08050');
        A.chibiEyes(g, 8.2, 7.6, { white: true, sp: 4.6, w: 3, h: 3.6, look: [0.5, 0] }); A.blush(g, 8.2, 10.4, { sp: 6.4, w: 1, h: 0.55 }); break;
      case 'boomer': g = new G(11, 11); P(t => { t.poly([[1, 2.4], [5.8, 6.4], [10, 2.4], [10, 4.4], [5.8, 9.2], [1, 4.4]], '#e6c2fa'); t.poly([[5.8, 6.4], [10, 2.4], [10, 4.4], [5.8, 9.2]], '#c89ce8'); }); g.dots([[2, 3], [2.5, 3.5]], '#ffffff'); break;
      case 'sun': g = new G(13, 13); P(t => { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; t.ell(6.5 + Math.cos(a) * 4.6, 6.5 + Math.sin(a) * 4.6, 1.15, 1.15, '#ffe48a'); } });
        P(t => soft(t, 6.5, 6.5, 3.9, 3.9, ['#fffbe2', '#fff09a', '#f8d06a'])); A.chibiEyes(g, 6.7, 6.7, { sp: 3.35, w: 1.85, h: 2.45 }); A.blush(g, 6.7, 8.4, { sp: 5, w: 0.75, h: 0.45 }); break;
      case 'missile': g = new G(13, 7); P(t => { t.poly([[1, 0.8], [4, 2.4], [1, 2.4]], '#ffa6b4'); t.poly([[1, 6.2], [4, 4.6], [1, 4.6]], '#ffa6b4'); }); P(t => { t.ell(6.6, 3.5, 4.6, 1.6, '#eef0fa'); t.ell(6.6, 4.3, 4.4, 0.8, '#ccd0e4', 0, (x, y) => t.filled(x, y)); }); P(t => t.poly([[10.2, 2], [12.4, 3.5], [10.2, 5]], '#ffa6b4')); break;
      case 'magnet': g = new G(11, 11); P(t => { PX.stroke(t, [[2.6, 1.4], [2.6, 6], [5.5, 9], [8.4, 6], [8.4, 1.4]], 1.45, 1.45, '#ffa6b4'); }); P(t => { t.rect(1, 1, 3, 2, '#eef0fa'); t.rect(7, 1, 3, 2, '#eef0fa'); }); g.dots([[2, 4], [2, 4.5]], '#ffd4dc'); break;
      case 'disco': ball(9, ['#ffffff', '#e2e6f4', '#bcc0da']); for (const [x, y, c] of [[3, 3, '#ffc6e8'], [5, 5, '#bfeeff'], [3, 5, '#fff2a8'], [5, 3, '#d8c8ff']]) g.dots([[x, y], [x + 0.5, y], [x, y + 0.5], [x + 0.5, y + 0.5]], c); P(t => t.rect(4, 0, 1, 1, '#c8c8dc')); break;
      case 'leaf0': g = new G(8, 6); P(t => { t.ell(4, 3, 3.3, 2, '#c8f2a0', 0.25); t.ell(4.4, 3.6, 2.8, 1.2, '#a4e080', 0.25, (x, y) => t.filled(x, y)); }); PX.stroke(g, [[1.4, 2.4], [6.6, 3.6]], 0.2, 0.2, '#86c46e'); bold = false; break;
      case 'leaf1': g = new G(7, 5); P(t => { t.ell(3.5, 2.5, 2.8, 1.6, '#a8e486', -0.2); t.ell(3.8, 3, 2.4, 0.9, '#88cc72', -0.2, (x, y) => t.filled(x, y)); }); PX.stroke(g, [[1.2, 2.9], [5.8, 2.1]], 0.2, 0.2, '#70b062'); bold = false; break;
      case 'leaf2': g = new G(8, 6); P(t => { t.ell(4, 3, 3.3, 2, '#fff09a', -0.3); t.ell(4.4, 3.6, 2.8, 1.2, '#f2d070', -0.3, (x, y) => t.filled(x, y)); }); PX.stroke(g, [[1.4, 3.6], [6.6, 2.4]], 0.2, 0.2, '#d8b45e'); bold = false; break;
      case 'pow': g = new G(19, 17); g.poly(PX.starPts(9.5, 8.5, 8.2, 4.6, 9), '#fff3a8'); g.outline('#ff96a6'); g.ell(9.5, 8.5, 3, 2.7, '#ffffff'); bold = false; break;
      default: { bold = false; const m = /^disc:(#[0-9a-f]{6}):(\d)$/.exec(k); if (m) { const r = +m[2]; g = new G(r * 2 + 1, r * 2 + 1); g.ell(r + 0.5, r + 0.5, r + 0.2, r + 0.2, m[1]); } else g = new G(1, 1); }
    }
    if (bold) g.outerLine();
    return (ASPR[k] = g.canvas());
  }
  // the four quarter-turns of a sprite (crisp spinning for lobs, nuts and boomerangs)
  const ROT = {};
  function rot4(k) {
    if (ROT[k]) return ROT[k];
    const c = aspr(k), out = [c];
    for (let q = 1; q < 4; q++) { const o = document.createElement('canvas'), w = q % 2 ? c.height : c.width, h = q % 2 ? c.width : c.height; o.width = w; o.height = h; const x = o.getContext('2d'); x.imageSmoothingEnabled = false; x.translate(w / 2, h / 2); x.rotate(q * Math.PI / 2); x.drawImage(c, -c.width / 2, -c.height / 2); out.push(PX.keepK(c, o)); }
    return (ROT[k] = out);
  }
  const dot = (c, r) => aspr('disc:' + c + ':' + r);
  const bits = (p, cols, n, sp, g) => { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = (0.4 + Math.random() * 0.8) * (sp || 40); V.parts.push({ x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, g: g == null ? 160 : g, life: 0.35 + Math.random() * 0.3, spr: dot(cols[i % cols.length], i % 3 === 0 ? 1 : 0) }); } };
  const mouthOf = side => (side === 'o' && (V.boss || V.wild) ? topOf('o') : { x: spot(side).x + (side === 'p' ? 10 : -10), y: spot(side).y - 15 });
  const fxPush = f => { f.t = 0; V.fx.push(f); return f; };
  const JAWS = { zombie: ['#c8d4a8', '#8ea872', '#5a6a48'], kelp: ['#9ee8c0', '#3fae7e', '#1f6a50'] };
  function jawCols(who) { const f = V.b[who]; if (f.zombie || f.critter) return JAWS.zombie; const sp = f.look && f.look.species, pal = sp && PX.PLANT_PAL && PX.PLANT_PAL[sp]; return pal && pal.main ? pal.main : ['#d8a8f8', '#9a5ad8', '#5e2a8e']; }
  // what each projectile leaves behind
  function splat(p, o) {
    switch (o) {
      case 'pea': case 'goo': bits(p, ['#d8f8b0', '#a6e07e', '#86c66a'], 6); break;
      case 'icepea': case 'shard': case 'wmelon': bits(p, ['#ffffff', '#d4f2ff', '#bdeefa'], 8); break;
      case 'cabbage': bits(p, ['#e6fcc4', '#ace486', '#86c46e'], 10, 50); break;
      case 'melon': bits(p, ['#9cdc7e', '#ffa2ae', '#78bc6a'], 10, 50); break;
      case 'butter': bits(p, ['#fff6c0', '#fff09a'], 6, 30); fxPush({ k: 'mark', x: p.x, y: p.y - 6, life: 1, spr: 'butter' }); break; // a pat of butter sits on its head
      case 'snowball': bits(p, ['#ffffff', '#eef6ff'], 10, 40); break;
      case 'water': bits(p, ['#effcff', '#8ed8f4', '#6aa8e0'], 10, 50, 260); break;
      case 'kernel': case 'sunball': case 'coin': case 'star': bits(p, ['#fffbe2', '#fff09a', '#ffffff'], 6); break;
      case 'spore': bits(p, ['#f0d8ff', '#d4b0f2'], 6, 30, -20); break;
      case 'rock': case 'coco': case 'meteor': case 'bolt': bits(p, ['#e4e0ec', '#c4bed0', '#9c96ac'], 8, 50, 260); break;
      case 'iceblock': bits(p, ['#ffffff', '#d4f2ff', '#a8d8f0'], 12, 60, 260); break;
      default: bits(p, ['#ffffff', '#fff3a0'], 5);
    }
  }
  function boomAt(p, o) { // o: { big, doom, dirt, star, goo }
    const big = !!o.big, R = big ? 20 : 13;
    const cols = o.doom ? ['#dcc2f8', '#a888d8', '#6a5a8a'] : o.star ? ['#ffffff', '#ffc8d8', '#d8a2e6'] : o.goo ? ['#e8ffc0', '#b0e484', '#88c070'] : ['#fff3a0', '#ffbc7e', '#ff9486'];
    const puffs = []; for (let i = 0; i < (big ? 9 : 6); i++) puffs.push({ dx: (Math.random() - 0.5) * R * 1.6, dy: (Math.random() - 0.5) * R, r: 2 + Math.floor(Math.random() * 3) });
    fxPush({ k: 'boom', x: p.x, y: p.y, R, cols, puffs, doom: !!o.doom, life: big ? 0.9 : 0.7 });
    if (o.dirt) bits({ x: p.x, y: p.y + 8 }, ['#c8a284', '#b08e74', '#d4b28a'], 12, 60, 280);
    quake(big ? 0.5 : 0.3, big ? 4 : 2); flash(o.doom ? '#dcc2f8' : '#fff3a0', big ? 0.22 : 0.12); sfx('boom');
  }
  // a thing flying from a to b over `life` s (arc = height of a lob); spins through its quarter-turns if spin
  function projectile(o) { return fxPush(Object.assign({ k: 'proj', arc: 0, spin: false }, o)); }

  function animMove(st, who, id) {
    const S = animOf(id), A = V.a[who], tgt = who === 'p' ? 'o' : 'p', dir = who === 'p' ? 1 : -1;
    const land = Math.max(0.35, st.need - 0.05), a = mouthOf(who), b = topOf(tgt), feet = spot(tgt);
    const at = (t, fn) => (st.at || (st.at = [])).push({ t: Math.max(0, t), fn });
    const attackPose = () => { A.pose = { arms: 'out', mouth: 'open', eyes: 'brave' }; A.poseT = 0.6; };
    const n = S.n || 1;
    switch (S.s) {
      case 'shot': { // straight shots: the attacker kicks back with every one
        const tr = S.heavy ? 0.32 : 0.24, gap = n > 4 ? 0.07 : 0.11;
        for (let i = 0; i < n; i++) at(land - tr - (n - 1 - i) * gap, () => {
          A.recoil = 1; attackPose(); sfx(i === 0 ? 'pop' : 'tick');
          for (let q = 0; q < 3; q++) V.parts.push({ x: a.x, y: a.y, vx: dir * (10 + q * 8), vy: (q - 1) * 10, g: 0, life: 0.16, spr: dot('#ffffff', q === 1 ? 2 : 1) }); // a puff at the muzzle
          const jitter = n > 1 ? (i % 2 ? 2 : -2) : 0;
          projectile({ spr: S.o, ax: a.x, ay: a.y + jitter, bx: b.x, by: b.y + jitter, life: tr, flip: who === 'o', spin: S.o === 'star' || S.o === 'coco', trail: ['star', 'coin', 'sunball'].includes(S.o) ? 'sparkle' : null, onEnd: () => splat({ x: b.x, y: b.y + jitter }, S.o) });
        });
        break;
      }
      case 'lob': { // up and over in an arc, with a shadow sliding along the ground
        const tr = 0.55, gap = 0.14;
        for (let i = 0; i < n; i++) at(land - tr - (n - 1 - i) * gap, () => {
          A.hop = 1; attackPose(); sfx('whoosh');
          const dx = n > 1 ? (i - (n - 1) / 2) * 6 : 0;
          projectile({ spr: S.o, ax: a.x, ay: a.y - 4, bx: b.x + dx, by: b.y, life: tr, arc: S.h || 30, spin: S.o !== 'butter' && S.o !== 'water', shadow: { y0: spot(who).y, y1: feet.y }, trail: S.o === 'fireball' ? 'fire' : null,
            onEnd: () => { if (S.boom) boomAt({ x: b.x + dx, y: b.y }, { big: S.o === 'cob' }); else splat({ x: b.x + dx, y: b.y }, S.o); } });
        });
        break;
      }
      case 'boom': // the plant puffs up, then BOOM on the target (a dirt mound pops up first for potato mines)
        at(land - 0.45, () => { A.flash = 0.45; A.shake = 0.4; attackPose(); sfx('tick'); });
        if (S.dirt) at(land - 0.18, () => bits({ x: feet.x, y: feet.y - 2 }, ['#c8a284', '#b08e74'], 8, 30, 200));
        at(land, () => boomAt({ x: b.x, y: b.y + (S.dirt ? 4 : 0) }, S));
        break;
      case 'firecol':
        at(land - 0.4, () => { A.flash = 0.3; attackPose(); });
        at(land - 0.08, () => { fxPush({ k: 'firecol', x: feet.x, y: feet.y + 1, w: S.big ? 26 : 18, dark: !!S.dark, life: 0.8 }); quake(0.35, 2); sfx('boom'); });
        break;
      case 'chomp': case 'bonk': { // dash over, bite or bonk, dash back
        const life = 0.62, hitAt = 0.3;
        at(land - hitAt, () => { A.move = { kind: 'dash', t: 0, life, tx: feet.x - dir * (V.boss && tgt === 'o' ? 26 : 15), ty: feet.y + (who === 'p' ? -3 : 3) }; attackPose(); sfx('whoosh'); });
        if (S.s === 'chomp') {
          at(land - 0.16, () => fxPush({ k: 'jaws', x: b.x, y: b.y + 1, cols: S.kelp ? JAWS.kelp : jawCols(who), big: !!S.big, life: 0.5 }));
          at(land - 0.02, () => sfx('chomp'));
        } else for (let i = 0; i < n; i++) at(land + i * 0.12, () => {
          const q = { x: b.x + (n > 1 ? (i - 1) * 6 : 0), y: b.y + (n > 1 ? (i % 2 ? -4 : 3) : 0) };
          fxPush({ k: 'pow', x: q.x, y: q.y, big: !!S.big, life: 0.4 }); bits(q, S.fire ? ['#fff3a0', '#ffbc7e'] : S.dark ? ['#dcc2f8', '#8e70c0'] : ['#fff3a0', '#ffffff'], 6, 50, 0);
          if (S.big) quake(0.3, 3); sfx(i ? 'tick' : 'snap');
        });
        break;
      }
      case 'jump': { // leap high over and slam down
        const life = 0.85, hitAt = 0.45;
        at(land - hitAt, () => { A.move = { kind: 'jump', t: 0, life, tx: feet.x - dir * (V.boss && tgt === 'o' ? 20 : 8), ty: feet.y - (who === 'p' ? 4 : 0), h: S.big ? 40 : 30 }; A.pose = { arms: 'up', mouth: 'open', eyes: 'brave' }; A.poseT = 0.9; sfx('whoosh'); });
        at(land, () => { quake(S.big ? 0.5 : 0.35, S.big ? 4 : 3); ring(feet.x, feet.y, '#ffffff', 20); bits({ x: feet.x, y: feet.y - 2 }, ['#e8dcc0', '#dacca8', '#ffffff'], 12, 60, 200); sfx('thud'); });
        break;
      }
      case 'roll': // a wall-nut bowls across the ground and bonks
        at(land - 0.45, () => { A.hop = 1; attackPose(); sfx('whoosh'); projectile({ spr: 'nut', ax: spot(who).x + dir * 8, ay: spot(who).y - (S.big ? 14 : 7), bx: feet.x, by: feet.y - (S.big ? 14 : 7), life: 0.45, spin: true, big: !!S.big, bounce: S.big ? 6 : 4, onEnd: () => { fxPush({ k: 'pow', x: b.x, y: b.y + 4, big: !!S.big, life: 0.4 }); quake(0.3, 3); sfx('snap'); } }); });
        break;
      case 'zap':
        for (let i = 0; i < n; i++) at(land - 0.14 + i * 0.12, () => {
          attackPose();
          fxPush({ k: 'bolt', ax: S.sky ? b.x + (Math.random() - 0.5) * 10 : a.x, ay: S.sky ? -4 : a.y, bx: b.x, by: b.y, w: S.big ? 2 : 1, seed: Math.floor(Math.random() * 1e6), life: 0.32 });
          if (S.sky) flash('#ffffff', 0.15); bits(b, ['#ffffff', '#fff09a', '#fff3a0'], 6, 50, 0); sfx('zap');
        });
        break;
      case 'beam': {
        const c = S.c === 'sun' ? ['#ffffff', '#fff3a0', '#ffd876'] : S.c === 'star' ? ['#ffffff', '#ffc8d8', '#d8a2e6'] : ['#ffffff', '#ffb4c6', '#ff8a96'];
        at(land - 0.55, () => { attackPose(); fxPush({ k: 'charge', x: a.x, y: a.y, c: c[1], life: 0.3, small: true }); });
        at(land - 0.25, () => { V.beams.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, t: 0, life: 0.5, w: S.w || 2, c }); sfx('zap'); if (S.w >= 4) { quake(0.4, 2); flash(c[1], 0.12); } });
        break;
      }
      case 'sun': // a sun swells above the plant, then hurls itself at the target
        at(land - 0.7, () => { A.pose = { arms: 'up', mouth: 'open', eyes: 'happy' }; A.poseT = 0.8; sfx('sun'); });
        at(land - 0.4, () => projectile({ spr: 'sun', ax: a.x, ay: a.y - 14, bx: b.x, by: b.y, life: 0.4, arc: 10, spin: true, big: true, trail: 'sparkle', onEnd: () => { ring(b.x, b.y, '#fff09a', S.big ? 26 : 18); flash('#fff3a0', 0.15); bits(b, ['#fffbe2', '#fff09a'], 10, 60, 0); } }));
        break;
      case 'steal': // a sun is pulled out of the target and flies back to the zombie
        at(land, () => projectile({ spr: 'sun', ax: b.x, ay: b.y, bx: a.x, by: a.y, life: 0.45, arc: 12, spin: true }));
        break;
      case 'flame': { // a stream of fire / frost / water from the mouth
        const cols = S.ice ? ['#ffffff', '#d4f2ff', '#8cc6ee'] : S.water ? ['#ffffff', '#bdeefa', '#7cc4ec'] : ['#fff3a0', '#ffbc7e', '#ff9486'];
        const dur = S.short ? 0.3 : S.big ? 0.6 : 0.45;
        const edge = S.ice ? '#6c98c8' : S.water ? '#5a7ab8' : '#c86a5a';
        at(land - dur - 0.15, () => { attackPose(); A.lunge = 0.6; fxPush({ k: 'stream', ax: a.x, ay: a.y, bx: b.x, by: b.y, cols, edge, water: !!S.water, emit: dur, big: !!S.big, life: dur + 0.3 }); sfx(S.ice ? 'freeze' : S.water ? 'splash' : 'whoosh'); });
        break;
      }
      case 'freeze':
        at(land - 0.3, () => { attackPose(); for (let i = 0; i < 3; i++) projectile({ spr: 'shard', ax: a.x, ay: a.y + (i - 1) * 3, bx: b.x, by: b.y + (i - 1) * 3, life: 0.25, flip: who === 'o', delay: i * 0.05 }); });
        at(land, () => { fxPush({ k: 'icecube', x: feet.x, y: feet.y, w: tgt === 'o' && V.boss ? 30 : 14, h: tgt === 'o' && V.boss ? 50 : 26, life: 1.1 }); bits(b, ['#ffffff', '#d4f2ff'], 10, 40, 0); sfx('freeze'); });
        break;
      case 'drop': // falls out of the sky onto the target
        for (let i = 0; i < n; i++) at(land - 0.32 + (i - (n - 1)) * 0.13, () => {
          const dx = n > 1 ? (i - (n - 1) / 2) * 7 : 0;
          projectile({ spr: S.o, ax: b.x + dx - dir * 12, ay: -16, bx: b.x + dx, by: b.y, life: 0.34, spin: S.o !== 'iceblock', trail: S.o === 'meteor' ? 'fire' : null, big: S.big || S.o === 'rock', dropShadow: feet.y,
            onEnd: () => { splat({ x: b.x + dx, y: b.y }, S.o); quake(S.big ? 0.45 : 0.2, S.big ? 4 : 2); sfx('thud'); if (S.o === 'meteor') boomAt(b, { big: true }); } });
        });
        at(land - 0.6, attackPose);
        break;
      case 'wave':
        at(land - 0.6, () => { attackPose(); A.hop = 1; fxPush({ k: 'wave', ax: spot(who).x, ay: spot(who).y, bx: feet.x, by: feet.y, lotus: !!S.lotus, life: 0.7 }); sfx('splash'); });
        at(land, () => { bits(b, ['#effcff', '#8ed8f4', '#6aa8e0'], 14, 60, 260); sfx('splash'); });
        break;
      case 'wrap':
        at(land - 0.15, () => { attackPose(); fxPush({ k: 'wrap', x: feet.x, y: feet.y, h: tgt === 'o' && V.boss ? 44 : 22, c: S.c === 'rope' ? ['#f0dca8', '#dcc08a'] : S.c === 'tentacle' ? ['#dcc2f8', '#a888d8'] : ['#c4f09a', '#86c66a'], life: 0.9 }); sfx('snap'); });
        break;
      case 'cloud': {
        const cols = S.c === 'stink' ? ['#e8f0a0', '#ccd88a', '#aab86e'] : ['#ecdcff', '#c8aaf0', '#a888d8'];
        at(land - 0.5, () => { attackPose(); A.lunge = 0.5; for (let i = 0; i < 7; i++) V.parts.push({ x: a.x, y: a.y, vx: (b.x - a.x) / 0.45 + (Math.random() - 0.5) * 20, vy: (b.y - a.y) / 0.45 + (Math.random() - 0.5) * 20, g: 0, life: 0.45, delay: i * 0.04, spr: dot(cols[i % 3], 1 + (i % 2)) }); sfx('whoosh'); });
        at(land - 0.05, () => fxPush({ k: 'cloud', x: b.x, y: b.y, cols, big: !!S.big, life: 0.9 }));
        break;
      }
      case 'rain':
        at(land - 0.45, () => { A.pose = { arms: 'up', mouth: 'open', eyes: 'brave' }; A.poseT = 0.8; fxPush({ k: 'rain', x: b.x, y: b.y, o: S.o, n: 9, life: 0.75 }); sfx('chime'); });
        break;
      case 'hypno':
        at(land - 0.2, () => { attackPose(); fxPush({ k: 'hypno', x: b.x, y: b.y, big: !!S.big, life: 1 }); sfx('chime'); });
        break;
      case 'slash':
        at(land - 0.12, () => { attackPose(); A.lunge = 1; fxPush({ k: 'slash', x: b.x, y: b.y, gold: S.c === 'gold', life: 0.45 }); sfx('snap'); });
        break;
      case 'eclipse':
        at(land - 0.7, () => { A.pose = { arms: 'up', mouth: 'open', eyes: 'brave' }; A.poseT = 1; fxPush({ k: 'eclipse', life: 1.1 }); sfx('groan'); });
        at(land, () => { flash('#dcc2f8', 0.25); bits(b, ['#dcc2f8', '#8e70c0', '#ffffff'], 12, 60, 0); });
        break;
      case 'spikes':
        at(land - 0.12, () => { attackPose(); fxPush({ k: 'spikes', x: feet.x, y: feet.y + 1, big: !!S.big, dirt: !!S.dirt, life: 0.55 }); quake(0.2, 2); sfx('crack'); });
        break;
      case 'missile':
        at(land - 0.4, () => { attackPose(); A.recoil = 1; projectile({ spr: 'missile', ax: a.x, ay: a.y, bx: b.x, by: b.y, life: 0.4, arc: 8, flip: who === 'o', big: true, trail: 'smoke', onEnd: () => boomAt(b, {}) }); sfx('whoosh'); });
        break;
      case 'magnet':
        at(land - 0.5, () => { A.pose = { arms: 'up', mouth: 'open', eyes: 'brave' }; A.poseT = 0.9; fxPush({ k: 'magnet', x: topOf(who).x, y: topOf(who).y - 14, life: 0.9 }); sfx('zap'); });
        at(land, () => { for (let i = 0; i < (S.big ? 6 : 4); i++) projectile({ spr: i % 2 ? 'bolt' : 'coin', ax: b.x + (Math.random() - 0.5) * 10, ay: b.y + (Math.random() - 0.5) * 8, bx: topOf(who).x, by: topOf(who).y - 10, life: 0.4, delay: i * 0.06, spin: true }); });
        break;
      case 'boomer':
        for (let i = 0; i < n; i++) at(land - 0.35 + i * 0.12, () => { attackPose(); fxPush({ k: 'boomer', ax: a.x, ay: a.y, bx: b.x, by: b.y, side: i % 2 ? -1 : 1, life: 0.8 }); sfx('whoosh'); });
        break;
      case 'leafstorm': { // a spiralling stream of leaves, a whirlwind round the target, then a burst
        const life = 1.15, leaves = [];
        for (let i = 0; i < 20; i++) leaves.push({ v: i % 5 === 4 ? 2 : i % 2, ph: i * 2.39, ring: i % 3, delay: (i % 11) * 0.025, spd: 0.85 + (i % 5) * 0.08, out: 0.6 + (i % 4) * 0.25 });
        at(land - life * 0.32, () => { attackPose(); A.lunge = 0.6; fxPush({ k: 'leafstorm', ax: a.x, ay: a.y, bx: b.x, by: b.y, fy: feet.y, h: Math.max(18, feet.y - b.y + 10), leaves, life }); sfx('whoosh'); });
        at(land + 0.15, () => sfx('whoosh'));
        break;
      }
      default: // plain hit: a quick lunge and a POW
        at(land - 0.3, () => { A.lunge = 1; attackPose(); sfx('whoosh'); });
        at(land, () => fxPush({ k: 'pow', x: b.x, y: b.y, life: 0.35 }));
    }
  }
  // moves that don't hit: shields, suns, power-ups, spooky spirals at the target, a disco party
  function animSupport(st, who, id) {
    const S = animOf(id), tgt = who === 'p' ? 'o' : 'p', c = topOf(who), boss = who === 'o' && V.boss;
    switch (S.s) {
      case 'shield': fxPush({ k: 'shield', x: c.x, y: c.y + 4, r: boss ? 30 : 15, c: elColor(D.MOVES[id].el), life: 1 }); break;
      case 'suns': for (let i = 0; i < 3; i++) V.parts.push({ x: c.x + (i - 1) * 9, y: c.y + 6, vx: 0, vy: -22, g: 0, life: 0.9, delay: i * 0.12, spr: aspr('sun') }); break;
      case 'hex': { const b = topOf(tgt), a = mouthOf(who); for (let i = 0; i < 5; i++) V.parts.push({ x: a.x, y: a.y, vx: (b.x - a.x) / 0.5, vy: (b.y - a.y) / 0.5, g: 0, life: 0.5, delay: i * 0.05, spin: i * 2, spr: dot(['#ecdcff', '#c8aaf0', '#a888d8'][i % 3], 1) }); fxPush({ k: 'hypno', x: b.x, y: b.y, life: 0.9, delay: 0.45 }); break; }
      case 'disco': fxPush({ k: 'disco', x: c.x, y: Math.max(14, c.y - 26), life: 1.3 }); break;
      default: fxPush({ k: 'charge', x: c.x, y: c.y + 2, c: elColor(D.MOVES[id].el), life: 0.75 });
    }
  }
  // debug: play one move's animation in the current battle (used to check the animations by eye)
  // the garden's zombie attacks borrow the battle's effect sprites and move styles
  window.__battle.aspr = aspr; window.__battle.animOf = animOf;
  window.__battle.fxTest = (who, id) => { if (!V) return 'no battle'; const st = { t: 0, need: 1, dur: 1 }; V.step = st; if (D.MOVES[id].pow > 0) animMove(st, who, id); else animSupport(st, who, id); return animOf(id); };
  // debug: play one move and lay its frames side by side (to review an animation's whole motion at once)
  window.__battle.fxStrip = (who, id, n, span, cols, scale, crop, from) => {
    if (!V) return 'no battle';
    n = n || 12; span = span || 1.4; cols = cols || 4; scale = scale || 2;
    const [cx, cy, cw, ch] = (crop || [0, 0, 1, 1]).map((v, i) => Math.round(v * (i % 2 ? WH : WW)));
    window.__battle.fxTest(who, id);
    for (let t = 0; t < (from || 0); t += 0.02) update(0.02);
    const K = PX.SCENE_K, dt = span / n, rows = Math.ceil(n / cols), c = document.createElement('canvas'); c.width = (cw * cols + (cols - 1) * 2) * K; c.height = (ch * rows + (rows - 1) * 2) * K;
    const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < n; i++) { for (let j = 0; j < 4; j++) update(dt / 4); render(); x.drawImage(lo, cx * K, cy * K, cw * K, ch * K, (i % cols) * (cw + 2) * K, Math.floor(i / cols) * (ch + 2) * K, cw * K, ch * K); }
    const old = document.getElementById('fxstrip'); if (old) old.remove();
    scale = Math.min(scale, innerWidth / c.width, innerHeight / c.height);
    c.id = 'fxstrip'; c.style.cssText = `position:fixed;left:0;top:0;z-index:99999;image-rendering:pixelated;width:${c.width * scale}px;height:${c.height * scale}px`;
    document.body.appendChild(c); return animOf(id);
  };
  // debug: several moves at once, one row of frames each: list = [[who, id, from, span], ...]
  window.__battle.fxSheet = (list, n, crop) => {
    if (!V) return 'no battle';
    n = n || 6; const [cx, cy, cw, ch] = (crop || [0, 0, 1, 1]).map((v, i) => Math.round(v * (i % 2 ? WH : WW)));
    const K = PX.SCENE_K, c = document.createElement('canvas'); c.width = (cw * n + (n - 1) * 2) * K; c.height = (ch * list.length + (list.length - 1) * 2) * K;
    const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height);
    list.forEach(([who, id, from, span], row) => {
      V.fx.length = 0; V.parts.length = 0; V.beams.length = 0; V.rings.length = 0; for (const s of SIDES) { V.a[s].move = null; V.a[s].lunge = 0; V.a[s].hop = 0; }
      window.__battle.fxTest(who, id); for (let t = 0; t < (from || 0); t += 0.02) update(0.02);
      const dt = (span || 1) / n;
      for (let i = 0; i < n; i++) { for (let j = 0; j < 4; j++) update(dt / 4); render(); x.drawImage(lo, cx * K, cy * K, cw * K, ch * K, i * (cw + 2) * K, row * (ch + 2) * K, cw * K, ch * K); }
    });
    const old = document.getElementById('fxstrip'); if (old) old.remove();
    const scale = Math.min(innerWidth / c.width, innerHeight / c.height);
    c.id = 'fxstrip'; c.style.cssText = `position:fixed;left:0;top:0;z-index:99999;image-rendering:pixelated;width:${c.width * scale}px;height:${c.height * scale}px`;
    document.body.appendChild(c); return list.map(([, id]) => id + ':' + animOf(id).s).join(' ');
  };
  function updateFx(ds) {
    for (const f of V.fx) {
      if (f.delay > 0) { f.delay -= ds; continue; }
      f.t += ds;
      if (f.k === 'stream' && f.t < f.emit && Math.random() < 0.5) { const c = f.cols; V.parts.push({ x: f.bx + (Math.random() - 0.5) * 10, y: f.by + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * 30, vy: f.water ? -30 : -20, g: f.water ? 200 : -10, life: 0.3, spr: dot(c[Math.floor(Math.random() * 3)], 1) }); } // sparks / droplets where it hits
      if (f.k === 'proj' && f.trail && Math.random() < 0.8) { const p = projPos(f), T = f.trail; V.parts.push({ x: p.x + (Math.random() - 0.5) * 3, y: p.y + (Math.random() - 0.5) * 3, vx: 0, vy: T === 'smoke' ? -6 : T === 'sparkle' ? 0 : -12, g: 0, life: T === 'sparkle' ? 0.25 : 0.3, blink: T === 'sparkle' ? 1 + Math.random() * 3 : 0, spr: T === 'smoke' ? dot('#dcdce6', 1) : T === 'sparkle' ? dot(Math.random() < 0.5 ? '#ffffff' : '#fff3a0', 0) : dot(Math.random() < 0.5 ? '#ffbc7e' : '#fff09a', 1) }); }
      if (f.k === 'proj' && !f.ended && f.t >= f.life) { f.ended = true; if (f.onEnd) f.onEnd(); }
    }
    keep(V.fx, fxAlive);
  }
  const fxAlive = f => f.delay > 0 || f.t < f.life;
  function projPos(f) { const k = clamp(f.t / f.life, 0, 1); return { x: lerp(f.ax, f.bx, k), y: lerp(f.ay, f.by, k) - Math.sin(Math.PI * k) * f.arc - (f.bounce ? Math.abs(Math.sin(k * Math.PI * 3)) * f.bounce : 0) }; } // (bounce: a rolling nut hops along)
  const BACK_FX = new Set(['leafstorm']); // effects with a part that goes behind the fighters
  function drawFxAll(layer) { for (const f of V.fx) if (!(f.delay > 0) && (layer !== 'back' || BACK_FX.has(f.k))) safe(() => drawFx(f, layer || 'front')); }
  function drawFx(f, layer) {
    const k = clamp(f.t / f.life, 0, 1), fade = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1, R = Math.round;
    switch (f.k) {
      case 'proj': {
        const p = projPos(f), fr = f.spin ? rot4(f.spr)[Math.floor(f.t * 16) % 4] : aspr(f.spr);
        if (f.shadow) { const gy = lerp(f.shadow.y0, f.shadow.y1, k); lx.fillStyle = 'rgba(58,45,52,.25)'; lx.fillRect(R(p.x - 3), R(gy - 1), 7, 2); }
        if (f.dropShadow) { const w = R(2 + k * 7); lx.fillStyle = 'rgba(58,45,52,.3)'; lx.fillRect(R(f.bx - w), R(f.dropShadow - 1), w * 2 + 1, 2); } // grows as it falls
        const sc = f.big ? 2 : 1, w = PX.artW(fr) * sc, h = PX.artH(fr) * sc;
        if (f.flip && !f.spin) { lx.save(); lx.translate(R(p.x), 0); lx.scale(-1, 1); lx.drawImage(fr, R(-w / 2), R(p.y - h / 2), w, h); lx.restore(); }
        else lx.drawImage(fr, R(p.x - w / 2), R(p.y - h / 2), w, h);
        break;
      }
      case 'mark': { lx.globalAlpha = fade; const s = aspr(f.spr); img(s, R(f.x - PX.artW(s) / 2), R(f.y - PX.artH(s))); lx.globalAlpha = 1; break; }
      case 'boom': {
        const grow = ease(Math.min(1, k / 0.3)), r = Math.max(1, R(f.R * grow));
        if (k < 0.55) { lx.globalAlpha = k < 0.4 ? 1 : 1 - (k - 0.4) / 0.15; disc0(f.x, f.y, r + 1, '#3a2d34'); disc0(f.x, f.y, r, f.cols[2]); disc0(f.x, f.y, R(r * 0.72), f.cols[1]); disc0(f.x, f.y, R(r * 0.42), f.cols[0]); if (k < 0.15) disc0(f.x, f.y, R(r * 0.25), '#ffffff'); lx.globalAlpha = 1; }
        if (f.doom && k > 0.18) { // a mushroom cloud: a smoky stem and a big dome-shaped cap that rises and spreads
          const u = ease((k - 0.18) / 0.5), up = 8 + u * 22, cy = R(f.y + 6 - up), crx = R(f.R * (0.55 + 0.45 * u)), cry = R(f.R * (0.32 + 0.18 * u));
          lx.globalAlpha = fade;
          for (let yy = cy; yy < f.y + 8; yy++) { const w = R(3 + (yy - cy) / Math.max(1, f.y + 8 - cy) * 3); lx.fillStyle = (yy >> 1) % 2 ? '#bc9ae6' : '#a888d8'; lx.fillRect(R(f.x - w), yy, w * 2 + 1, 1); }
          ellipse0(f.x, cy + 2, crx + 1, R(cry * 0.6), '#8a6aac'); ellipse0(f.x, cy, crx, cry, '#a888d8'); ellipse0(R(f.x - crx * 0.2), R(cy - cry * 0.35), R(crx * 0.6), R(cry * 0.55), '#dcc2f8');
          ellipse0(f.x, R(f.y + 7), R(crx * 1.2), 2, '#8a6aac');
          lx.globalAlpha = 1;
        }
        if (k > 0.25) { lx.globalAlpha = 0.85 * fade; for (const q of f.puffs) disc0(R(f.x + q.dx * (0.6 + k)), R(f.y + q.dy - (k - 0.25) * 22), q.r + (k > 0.5 ? 1 : 0), k > 0.6 ? '#c4c4d6' : '#e8e8f0'); lx.globalAlpha = 1; }
        break;
      }
      case 'firecol': { // a wall of flame tongues along the ground
        const env = k < 0.2 ? k / 0.2 : fade, cols = f.dark ? ['#ecdcff', '#bc9ae6', '#6e5a9a'] : ['#fff3a0', '#ffbc7e', '#ff9486'];
        for (let i = -f.w; i <= f.w; i += 2) {
          const h = R((12 + 6 * Math.sin(i * 0.7 + V.t * 20) + (Math.abs(i) < f.w * 0.4 ? 6 : 0)) * env * (1 - Math.abs(i) / (f.w * 1.6)));
          if (h <= 0) continue; const x = R(f.x + i);
          lx.fillStyle = cols[2]; lx.fillRect(x, f.y - h, 2, h); lx.fillStyle = cols[1]; lx.fillRect(x, f.y - R(h * 0.7), 2, R(h * 0.7)); lx.fillStyle = cols[0]; lx.fillRect(x, f.y - R(h * 0.35), 2, R(h * 0.35));
        }
        break;
      }
      case 'jaws': { // two big jaws close in from above and below and snap shut, twice
        const w = f.big ? 15 : 11, open = k < 0.3 ? 12 : k < 0.42 ? lerp(12, 0, (k - 0.3) / 0.12) : k < 0.58 ? lerp(0, 5, (k - 0.42) / 0.16) : k < 0.7 ? lerp(5, 0, (k - 0.58) / 0.12) : 0;
        lx.globalAlpha = fade; jaw(f.x, R(f.y - open), w, f.cols, -1); jaw(f.x, R(f.y + open), w, f.cols, 1); lx.globalAlpha = 1;
        break;
      }
      case 'pow': { const s = aspr('pow'), sc = f.big ? 2 : 1, pop = k < 0.15 ? 0.6 : 1; lx.globalAlpha = fade; const w = R(PX.artW(s) * sc * pop), h = R(PX.artH(s) * sc * pop); lx.drawImage(s, R(f.x - w / 2), R(f.y - h / 2), w, h); lx.globalAlpha = 1; break; }
      case 'bolt': { // zig-zag lightning that flickers
        if (Math.floor(f.t * 30) % 3 === 2) break;
        const r = srng(f.seed + Math.floor(f.t * 12)), steps = 7; let x0 = f.ax, y0 = f.ay;
        lx.globalAlpha = fade;
        for (let i = 1; i <= steps; i++) {
          const u = i / steps, x1 = i === steps ? f.bx : lerp(f.ax, f.bx, u) + (r() - 0.5) * 10, y1 = i === steps ? f.by : lerp(f.ay, f.by, u) + (r() - 0.5) * 6;
          const len = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
          for (let j = 0; j <= len; j++) { const xx = R(lerp(x0, x1, j / len)), yy = R(lerp(y0, y1, j / len)); lx.fillStyle = '#fff09a'; lx.fillRect(xx - f.w, yy - f.w, f.w * 2 + 1, f.w * 2 + 1); lx.fillStyle = '#ffffff'; lx.fillRect(xx, yy, 1, 1); }
          x0 = x1; y0 = y1;
        }
        lx.globalAlpha = 1;
        break;
      }
      case 'charge': { // bold rings closing in on the plant, sparks rushing inward, a glow
        const n = f.small ? 2 : 3;
        for (let j = 0; j < n; j++) { const kk = (k * 2 + j / n) % 1, rad = (f.small ? 10 : 22) * (1 - kk) + 2, m = Math.max(10, R(rad * 3.5)); lx.globalAlpha = Math.min(1, kk * 2) * fade; lx.fillStyle = j % 2 ? '#ffffff' : f.c; for (let i = 0; i < m; i++) { const ang = i / m * Math.PI * 2; lx.fillRect(R(f.x + Math.cos(ang) * rad), R(f.y + Math.sin(ang) * rad * 0.8), 2, 2); } }
        if (!f.small) { lx.globalAlpha = 0.25 * Math.sin(Math.PI * k); disc0(R(f.x), R(f.y + 2), 9, '#ffffff'); if (Math.random() < 0.6) { const ang = Math.random() * 6.28, r = 20; V.parts.push({ x: f.x + Math.cos(ang) * r, y: f.y + Math.sin(ang) * r * 0.8, vx: -Math.cos(ang) * r * 3, vy: -Math.sin(ang) * r * 2.4, g: 0, life: 0.3, spr: dot(Math.random() < 0.5 ? '#ffffff' : f.c, 1) }); } }
        lx.globalAlpha = 1;
        break;
      }
      case 'stream': { // a cone of blobs that grow as they travel, light near the mouth and darker (then smoke) at the far end
        const on = f.t < f.emit + 0.22, N = f.big ? 26 : 18, dx = f.bx - f.ax, dy = f.by - f.ay, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
        if (!on) break;
        for (let i = 0; i < N; i++) {
          const p = (f.t * 3.2 + i / N) % 1, born = f.t - p / 3.2; if (born < 0 || born > f.emit) continue;
          const wob = Math.sin(i * 2.7 + f.t * 30) * p * (f.big ? 7 : 5), x = f.ax + dx * p + nx * wob, y = f.ay + dy * p + ny * wob, r = Math.max(1, R(1 + p * (f.big ? 4.5 : 3.4)));
          const c = p < 0.3 ? f.cols[0] : p < 0.65 ? f.cols[1] : f.cols[2];
          lx.globalAlpha = p > 0.85 ? (1 - p) / 0.15 : 1; disc0(R(x), R(y), r + 1, f.edge || '#3a2d34'); disc0(R(x), R(y), r, c); if (r > 2) disc0(R(x - 1), R(y - 1), 1, f.cols[0]);
        }
        lx.globalAlpha = 1;
        break;
      }
      case 'icecube': { const a = k < 0.1 ? k / 0.1 : fade, x = R(f.x - f.w / 2 - 2), y = R(f.y - f.h - 2); lx.globalAlpha = 0.55 * a; lx.fillStyle = '#d4f2ff'; lx.fillRect(x, y, f.w + 4, f.h + 3); lx.globalAlpha = a; lx.fillStyle = '#ffffff'; lx.fillRect(x, y, f.w + 4, 1); lx.fillRect(x, y, 1, f.h + 3); lx.fillRect(x + 2, y + 2, 2, 4); lx.fillStyle = '#8cc6ee'; lx.fillRect(x + f.w + 3, y + 1, 1, f.h + 2); lx.fillRect(x + 1, y + f.h + 2, f.w + 3, 1); lx.globalAlpha = 1; break; }
      case 'wave': { // a curling blue wave rolls from the attacker to the target
        const e = ease(k), cx = lerp(f.ax, f.bx, e), cy = lerp(f.ay, f.by, e), sz = 1 + k * 0.8;
        if (Math.random() < 0.6) V.parts.push({ x: cx + (Math.random() - 0.5) * 20 * sz, y: cy - 12 * sz, vx: (Math.random() - 0.5) * 30, vy: -30, g: 200, life: 0.35, spr: dot(Math.random() < 0.5 ? '#ffffff' : '#bdeefa', 1) }); // spray
        lx.globalAlpha = fade;
        for (let i = -16; i <= 16; i++) { const h = R(Math.cos(i / 16 * Math.PI / 2) * 14 * sz * (i > 0 ? 1 : 0.8)), x = R(cx + i * sz); if (h <= 0) continue; const cw = Math.ceil(sz); lx.fillStyle = '#3a2d34'; lx.fillRect(x, R(cy - h) - 1, cw, 1); lx.fillStyle = '#6aa8e0'; lx.fillRect(x, R(cy - h), cw, h); lx.fillStyle = '#8ed8f4'; lx.fillRect(x, R(cy - h), cw, R(h * 0.6)); lx.fillStyle = f.lotus && i % 5 === 0 ? '#ffc8d8' : '#ffffff'; lx.fillRect(x, R(cy - h), cw, 2); }
        lx.globalAlpha = 1;
        break;
      }
      case 'wrap': { // bands wind around the target one after another
        for (let j = 0; j < 3; j++) {
          const u = clamp(k * 3.2 - j * 0.6, 0, 1); if (u <= 0) continue;
          const yy = f.y - f.h * (0.25 + j * 0.27), rx = 9 + (j === 1 ? 1 : 0), m = R(40 * u);
          lx.globalAlpha = fade;
          for (let i = 0; i < m; i++) { const ang = i / 40 * Math.PI * 2, front = Math.sin(ang) > 0; lx.fillStyle = front ? f.c[0] : f.c[1]; lx.fillRect(R(f.x + Math.cos(ang) * rx), R(yy + Math.sin(ang) * 3), 2, 2); }
        }
        lx.globalAlpha = 1;
        break;
      }
      case 'cloud': { const r0 = f.big ? 8 : 6, a = k < 0.15 ? k / 0.15 : fade; lx.globalAlpha = 0.7 * a; for (let i = 0; i < 6; i++) { const ang = i / 6 * Math.PI * 2 + V.t * 1.5; disc0(R(f.x + Math.cos(ang) * r0), R(f.y + Math.sin(ang) * r0 * 0.6), r0 - 2 + (i % 2), f.cols[i % 3]); } lx.globalAlpha = 1; break; }
      case 'rain': {
        const spr = f.o === 'thorn' ? 'shard' : f.o;
        for (let i = 0; i < f.n; i++) { const u = clamp((k - i * 0.06) / 0.4, 0, 1); if (u <= 0 || u >= 1) continue; const h = (i * 37) % 23 - 11, fr = rot4(spr)[(i + Math.floor(f.t * 12)) % 4]; img(fr, R(f.x + h - PX.artW(fr) / 2), R(lerp(-10, f.y + ((i * 13) % 9) - 4, u) - PX.artH(fr) / 2)); if (u > 0.92) bits({ x: f.x + h, y: f.y }, ['#ffffff', '#fff3a0'], 1, 30, 0); }
        break;
      }
      case 'hypno': { // a bold spinning spiral over the target, with rings pulsing out and little hearts
        const grow = ease(Math.min(1, k / 0.2)), size = (f.big ? 15 : 11) * grow, spin = V.t * 7;
        lx.globalAlpha = fade;
        for (let i = 0; i < 70; i++) { const th = i / 70 * Math.PI * 5, r = th / (Math.PI * 5) * size; const x = R(f.x + Math.cos(th + spin) * r), y = R(f.y + Math.sin(th + spin) * r * 0.75); lx.fillStyle = i % 14 < 7 ? '#ff9ed4' : '#c08aec'; lx.fillRect(x, y, 2, 2); }
        for (let j = 0; j < 2; j++) { const kk = (k * 2.5 + j * 0.5) % 1, rad = size + 2 + kk * 12, m = R(rad * 3.5); lx.globalAlpha = fade * (1 - kk); lx.fillStyle = j ? '#ffc8d8' : '#d8a2f0'; for (let i = 0; i < m; i++) { const ang = i / m * Math.PI * 2; lx.fillRect(R(f.x + Math.cos(ang) * rad), R(f.y + Math.sin(ang) * rad * 0.75), 2, 1); } }
        lx.globalAlpha = fade; const h = safe(() => PX.fx('heart'), null); if (h && k > 0.2) for (let i = 0; i < 3; i++) { const ang = V.t * 2 + i * 2.1; img(h, R(f.x + Math.cos(ang) * (size + 6) - PX.artW(h) / 2), R(f.y - 4 + Math.sin(ang) * (size + 6) * 0.5 - PX.artH(h) / 2)); }
        lx.globalAlpha = 1;
        break;
      }
      case 'slash': { // three claw marks slice across
        lx.globalAlpha = fade;
        for (let i = 0; i < 3; i++) { const u = clamp(k * 4 - i * 0.4, 0, 1), x0 = f.x - 9 + i * 6, y0 = f.y - 10, len = R(18 * u); for (let j = 0; j < len; j++) { lx.fillStyle = f.gold ? '#ffd876' : '#bc9ae6'; lx.fillRect(R(x0 + j * 0.55) - 1, y0 + j, 3, 1); lx.fillStyle = '#ffffff'; lx.fillRect(R(x0 + j * 0.55), y0 + j, 1, 1); } }
        lx.globalAlpha = 1;
        break;
      }
      case 'eclipse': { const a = k < 0.3 ? k / 0.3 : fade; lx.globalAlpha = 0.45 * a; lx.fillStyle = '#4a3a6a'; lx.fillRect(0, 0, WW, WH); lx.globalAlpha = a; disc0(R(WW / 2), 16, 10, '#fff09a'); disc0(R(WW / 2), 16, 9, '#ffffff'); disc0(R(WW / 2 + 3 - k * 3), 16, 9, '#4a3a6a'); lx.globalAlpha = 1; break; }
      case 'spikes': { // spikes burst up out of the ground, then sink back
        const up = k < 0.25 ? ease(k / 0.25) : k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3, H0 = f.big ? 17 : 12, n = f.big ? 4 : 3;
        for (let i = -n; i <= n; i++) {
          const h = R(H0 * up * (1 - Math.abs(i) * 0.12) * (i % 2 ? 0.75 : 1)), x = R(f.x + i * 4); if (h <= 1) continue;
          for (let y = 0; y <= h; y++) { const w = Math.max(0, R((1 - y / h) * 2.4)); lx.fillStyle = '#3a2d34'; lx.fillRect(x - w - 1, f.y - y, w * 2 + 3, 1); }
          lx.fillStyle = '#3a2d34'; lx.fillRect(x, f.y - h - 1, 1, 1);
          for (let y = 0; y < h; y++) { const w = Math.max(0, R((1 - y / h) * 2.4)); lx.fillStyle = f.dirt ? (y > h * 0.5 ? '#d4b28a' : '#c8a284') : y > h * 0.55 ? '#ffffff' : y > h * 0.25 ? '#dce2ee' : '#b4bacc'; lx.fillRect(x - w, f.y - y, w * 2 + 1, 1); }
        }
        if (k < 0.3) bits({ x: f.x, y: f.y - 2 }, f.dirt ? ['#c8a284', '#b08e74'] : ['#e8dcc0', '#dacca8'], 1, 40, 200);
        break;
      }
      case 'magnet': { const s = aspr('magnet'); lx.globalAlpha = fade; img(s, R(f.x - PX.artW(s) / 2), R(f.y - PX.artH(s) / 2 + Math.sin(V.t * 12))); lx.globalAlpha = 1; break; }
      case 'boomer': { // out in a curve, back in another
        const out = k < 0.5, u = out ? k / 0.5 : (k - 0.5) / 0.5, s = f.side, px0 = out ? f.ax : f.bx, py0 = out ? f.ay : f.by, px1 = out ? f.bx : f.ax, py1 = out ? f.by : f.ay;
        const cx = (f.ax + f.bx) / 2, cy = (f.ay + f.by) / 2 + s * (out ? -22 : 22), x = (1 - u) * (1 - u) * px0 + 2 * u * (1 - u) * cx + u * u * px1, y = (1 - u) * (1 - u) * py0 + 2 * u * (1 - u) * cy + u * u * py1;
        const fr = rot4('boomer')[Math.floor(f.t * 20) % 4]; img(fr, R(x - PX.artW(fr) / 2), R(y - PX.artH(fr) / 2));
        if (!f.hit && !out) { f.hit = true; bits({ x: f.bx, y: f.by }, ['#f0c0ff', '#d8a2f0', '#ffffff'], 6, 50, 0); sfx('snap'); }
        break;
      }
      case 'leafstorm': {
        const fly = 0.32, spin = 0.8, back = layer === 'back'; // phases: stream in, whirl, burst out
        const wa = k > fly && k < spin + 0.1 ? clamp((k - fly) / 0.08, 0, 1) * (k > spin ? 1 - (k - spin) / 0.1 : 1) : 0;
        if (wa > 0) {
          if (back) { lx.globalAlpha = 0.28 * wa; lx.fillStyle = '#4a7a5a'; for (let yy = -3; yy <= 3; yy++) { const w = R(17 * Math.sqrt(1 - (yy * yy) / 12)); lx.fillRect(R(f.bx - w), R(f.fy + yy), w * 2 + 1, 1); } lx.globalAlpha = 1; } // shadow on the ground
          // the funnel: bands of wind, wider at the top, the front half bright and the back half faint
          const bands = 6, top = f.h + 8;
          for (let j = 0; j < bands; j++) {
            const yy = f.fy - 2 - j * top / (bands - 1), rx = 6 + j * 2.6, base = V.t * (11 - j) + j * 1.3, m = R(rx * 5);
            for (let i = 0; i < m; i++) {
              const ang = base + i / m * Math.PI * 2, front = Math.sin(ang) > 0; if (front === back) continue;
              if ((i + Math.floor(V.t * 24)) % 5 === 0) continue; // dashes, so it reads as moving air
              lx.globalAlpha = (front ? 0.7 : 0.3) * wa; lx.fillStyle = j % 2 ? '#ffffff' : '#e8fbd8';
              lx.fillRect(R(f.bx + Math.cos(ang) * rx), R(yy + Math.sin(ang) * rx * 0.3), 1, 1);
            }
          }
          lx.globalAlpha = 1;
        }
        for (const L of f.leaves) {
          const kk = clamp(k - L.delay, 0, 1); let x, y, inBack = false, a = 1;
          if (kk < fly) { // spiral along the line from the plant to the target
            if (back) continue;
            const u = ease(kk / fly), sw = Math.sin(u * Math.PI * 3 + L.ph) * 7 * (1 - u * 0.4);
            const nx = -(f.by - f.ay), ny = f.bx - f.ax, nl = Math.hypot(nx, ny) || 1;
            x = lerp(f.ax, f.bx, u) + nx / nl * sw; y = lerp(f.ay, f.by, u) + ny / nl * sw;
          } else if (kk < spin) { // whirl in three layers, faster and tighter as it goes
            const u = (kk - fly) / (spin - fly), ang = L.ph + u * Math.PI * 7 * L.spd, rx = (11 + L.ring * 3.5) * (1 - u * 0.15);
            x = f.bx + Math.cos(ang) * rx; y = f.fy - 4 - L.ring * (f.h / 2.6) - u * 3 + Math.sin(ang) * rx * 0.3; inBack = Math.sin(ang) < 0;
          } else { // burst outward, tumbling, then drift down
            if (back) continue;
            const u = (kk - spin) / (1 - spin), ang = L.ph + Math.PI * 7 * L.spd, r0 = 11 * 0.85 + L.ring * 3;
            x = f.bx + Math.cos(ang) * (r0 + ease(u) * 34 * L.out); y = f.fy - 4 - L.ring * (f.h / 2.6) + Math.sin(ang) * r0 * 0.3 - ease(u) * 10 + u * u * 14; a = 1 - u * u;
          }
          if (inBack !== back) continue;
          const fr = rot4('leaf' + L.v)[Math.floor(f.t * 16 + L.ph) % 4];
          lx.globalAlpha = a; img(fr, R(x - PX.artW(fr) / 2), R(y - PX.artH(fr) / 2)); lx.globalAlpha = 1;
        }
        break;
      }
      case 'shield': { // a bubble shield: tinted inside, a bright double rim with a travelling shine
        const a = k < 0.15 ? k / 0.15 : fade, rad = f.r + (k < 0.15 ? -4 + k / 0.15 * 4 : Math.sin(V.t * 6) * 0.6), m = R(rad * 5);
        lx.globalAlpha = 0.22 * a; disc0(R(f.x), R(f.y), R(rad), f.c); lx.globalAlpha = a;
        for (let i = 0; i < m; i++) { const ang = i / m * Math.PI * 2, x = R(f.x + Math.cos(ang) * rad), y = R(f.y + Math.sin(ang) * rad * 1.05); lx.fillStyle = f.c; lx.fillRect(x, y, 2, 2); }
        lx.fillStyle = '#ffffff'; for (let i = 0; i < 10; i++) { const ang = V.t * 3 + i * 0.12 - 2.2; lx.fillRect(R(f.x + Math.cos(ang) * (rad - 2)), R(f.y + Math.sin(ang) * (rad - 2) * 1.05), 1, 1); }
        lx.globalAlpha = 1;
        break;
      }
      case 'disco': { // a disco ball spinning above, coloured light beams sweeping the ground, dancing spots
        const s2 = aspr('disco'), C = ['#ffa2ae', '#fff09a', '#8fdcf0', '#b8f08a', '#d8a2f0'], gy = HY() + (WH - HY()) * 0.6;
        lx.globalAlpha = 0.18 * fade;
        for (let i = 0; i < 4; i++) { const sw = Math.sin(V.t * 2 + i * 1.6), ex = f.x + sw * 40 + (i - 1.5) * 18; lx.fillStyle = C[i]; for (let y = R(f.y); y < gy; y += 1) { const u = (y - f.y) / (gy - f.y), x = R(lerp(f.x, ex, u)), w = R(1 + u * 6); lx.fillRect(x - w, y, w * 2 + 1, 1); } }
        lx.globalAlpha = fade; lx.fillStyle = '#3a2d34'; lx.fillRect(R(f.x), 0, 1, R(f.y - 8));
        lx.drawImage(s2, R(f.x - PX.artW(s2)), R(f.y - PX.artH(s2)), PX.artW(s2) * 2, PX.artH(s2) * 2);
        for (let i = 0; i < 14; i++) { if (Math.floor(V.t * 8 + i) % 3 === 0) continue; lx.fillStyle = C[i % 5]; lx.fillRect(((i * 47 + Math.floor(V.t * 4) * 13) % WW), R(HY() + 6 + ((i * 29) % Math.max(10, WH - HY() - 10))), 3, 2); }
        lx.globalAlpha = 1;
        break;
      }
    }
  }
  function ellipse0(cx, cy, rx, ry, c) { lx.fillStyle = c; for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.01)))); lx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); } }
  function disc0(cx, cy, r, c) { lx.fillStyle = c; for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(Math.max(0, r * r - y * y))); lx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); } }
  function jaw(cx, ey, w, C, side) { // a dome-shaped jaw with a row of teeth along its edge; side -1 = top jaw (opens upward)
    for (let i = 0; i <= 7; i++) { const half = Math.round(w * Math.sqrt(Math.max(0, 1 - (i / 7.5) * (i / 7.5)))), y = ey + side * i; lx.fillStyle = '#3a2d34'; lx.fillRect(Math.round(cx - half - 1), y, half * 2 + 3, 1); lx.fillStyle = i > 5 ? C[2] : i > 2 ? C[1] : C[0]; if (side > 0) lx.fillStyle = i > 4 ? C[2] : C[1]; lx.fillRect(Math.round(cx - half), y, half * 2 + 1, 1); }
    lx.fillStyle = '#ffffff'; for (let x = -w + 2; x <= w - 2; x += 3) { lx.fillRect(Math.round(cx + x), ey - side * 1, 2, 1); lx.fillRect(Math.round(cx + x) + (side < 0 ? 0 : 1), ey - side * 2, 1, 1); }
  }

  // ---------------- render ----------------
  // Arena backgrounds in the chibi sticker style (docs/pvz-art-guide.md §1.11): a smooth pastel sky with a little smiling sun,
  // puffy rounded hills / mountains / sea on the horizon, a soft checker floor in perspective, chunky outlined pads and
  // toy-like props. drawBg() paints bgC once per size / night step at SCENE_K buffer pixels per world pixel (coordinates are
  // world pixels; FP = one fine buffer pixel, so half-pixel fills give fine detail) and render() draws it back at world size.
  // far: hills | sea | surf | stormsea | mountains | peaks | volcano | jungle | ruins | walls | desert | stage | suburb
  // ground: grass | lawn | fern | glow | sand | dust | snow | candy | cloud | rock | basalt | redrock | tiles | stone | dance
  // sky: 4 stops, top to horizon. gr: [checker light, checker dark, horizon line, far haze]. pad: [highlight, fill, shade].
  // hF / hN: far / near hills [fill, line]. fixed: ignores day/night. crowd: element sprites watching. amb: weather particles.
  // props: [kind, x, flip, dy] (x < 0: left edge, x > 1: right edge, else a fraction of the width; dy: drop below the horizon)
  const THEMES = {
    meadow: { sky: ['#9ed5f5', '#b6e0f7', '#cfeaf8', '#e6f5fa'], far: 'hills', hF: ['#c8eac0', '#9fcfa2'], hN: ['#a9dc9e', '#7fbe86'], trees: ['#93d38c', '#71b474'],
      gr: ['#addf83', '#9cd273', '#86c066', '#cdeec0'], pad: ['#e4f8be', '#c2e696', '#9eca78'], dots: ['#ffd3e2', '#fff2a6', '#ffffff'],
      props: [['bigtree', -6, 2], ['bush', 0.45, 0], ['tree', 1.02, 1]], clouds: true, ground: 'grass', amb: 'petals', crowd: true },
    beach: { sky: ['#8dd2f5', '#a7dcf6', '#c3e8f8', '#e0f4fb'], far: 'sea', sea: ['#93daf2', '#72c8ea', '#ffffff', '#c8f0fa'],
      gr: ['#fcebc8', '#f7e0b6', '#e9cd9c', '#fff5dc'], pad: ['#fff7e2', '#f4deb2', '#dcc18e'], dots: ['#ffffff', '#ffc4d6', '#f2b48a'],
      props: [['palm', -2, 2], ['umbrella', 0.47, 0], ['shells', 0.93, 0, 5]], clouds: true, ground: 'sand', crowd: true },
    moonlit: { sky: ['#3d4188', '#4a4f9a', '#5a5fab', '#6c6fba'], far: 'hills', hF: ['#5763a8', '#46508f'], hN: ['#4a7c9c', '#3a6684'], trees: ['#5c93b0', '#467690'],
      gr: ['#74c6b2', '#64b6a4', '#4f9c8e', '#7c88c4'], pad: ['#a6eadb', '#7fd2bf', '#5eb2a2'], dots: ['#d8c2ff', '#bfe8ff', '#fff4a8'],
      props: [['glowtree', -4, 2], ['glowshroom', 0.46, 0], ['crystal', 1.0, 1]], stars: true, moon: true, theme: 'night', ground: 'glow', amb: 'fireflies', crowd: true },
    candy: { sky: ['#ffc4db', '#ffd2e4', '#ffdfeb', '#ffeef4'], far: 'hills', hF: ['#f8c8e0', '#e6a6c8'], hN: ['#e4b8ee', '#c89ad8'], trees: null, gumdrops: true,
      gr: ['#fff2f7', '#ffdeeb', '#f2bcd4', '#ffe8f2'], pad: ['#ffffff', '#ffd8e8', '#f0b4cc'], dots: ['#8fc8ff', '#a8e88a', '#fff08a', '#ffb07a', '#ff9ec4'],
      props: [['lollitree', -4, 2], ['gumdrops', 0.45, 0, 5], ['candycane', 1.0, 1]], clouds: true, theme: 'candy', ground: 'candy', amb: 'sprinkles', crowd: true },
    snow: { sky: ['#a7cdf2', '#bcd9f4', '#d2e6f7', '#e8f2fb'], far: 'mountains', mB: ['#dbe5f7', '#bccbe8', '#a2b4dc'], mF: ['#bccdee', '#9fb2dc', '#8498c8'], cap: '#ffffff',
      gr: ['#ffffff', '#eef4fd', '#cddaf0', '#e8f0fb'], pad: ['#ffffff', '#e4edfb', '#c4d4ef'], dots: ['#cfe6ff', '#ffffff'], pines: true, clouds: true, fixed: true, ground: 'snow', amb: 'snow', sun: 'pale' },
    peak: { sky: ['#7caff2', '#95c0f4', '#b3d3f7', '#d3e6fb'], far: 'peaks', mB: ['#ccd5f0', '#aab6de', '#909ccc'], mF: ['#aab8e2', '#8b9ace', '#7282bc'], cap: '#ffffff',
      gr: ['#ffffff', '#f2f7ff', '#d2def4', '#e6eefc'], pad: ['#ffffff', '#e8f0fd', '#c2d0ee'], dots: ['#ffffff', '#d6e4fb'], clouds: true, fixed: true, ground: 'cloud', amb: 'wind', sun: true },
    jungle: { sky: ['#ffb894', '#ffc8a2', '#ffdab6', '#ffeacb'], far: 'jungle', canopy: ['#94d494', '#74ba80', '#5a9e6c'], cone: ['#eeb6a4', '#d69c8e', '#b8807a'], lava: ['#fff3a8', '#ffc078', '#ff9a86'],
      gr: ['#b6dd86', '#a6d176', '#8cbc62', '#d6ecb0'], pad: ['#f4e6b6', '#e0cc98', '#c2ad7c'], dots: ['#ffb8c8', '#fff09a', '#ffffff'],
      props: [['palm', -2, 2], ['palm', 1.02, 1]], fixed: true, ground: 'fern', amb: 'leaves', sun: 'big' },
    abyss: { sky: ['#78c6d6', '#82bcdc', '#8eb2e0', '#9caae2'], far: 'deepsea', reef: ['#ffb8c8', '#ffcca8', '#d8bcf4', '#fff0a8'], kelp: ['#a8e6c0', '#7cc4a0'], rocks: ['#a8b8e4', '#8696c8'],
      gr: ['#9fd8e0', '#8cc8d8', '#74b2c6', '#a8cce8'], pad: ['#dcf6f8', '#ace2ea', '#86c6d6'], dots: ['#ffffff', '#ffc4d6', '#fff0a8'],
      props: [['kelp', -1, 2], ['coral', 0.97, 1, 2]], fixed: true, ground: 'sand', amb: 'bubbles' },
    volcano: { sky: ['#f2a4c0', '#f6b2b8', '#f9c2ae', '#fcd4ae'], far: 'volcano', cone: ['#cca2c2', '#b28aae', '#96729c'], lava: ['#fff1a6', '#ffbd78', '#ff8f86'],
      gr: ['#d9b8c8', '#c9a8bc', '#b496ac', '#ecc8d0'], pad: ['#f6e2ec', '#e0c4d4', '#c4a6ba'], dots: ['#ffb07a', '#ffd88a'],
      props: [['rock', 0.05, 0, 7], ['rock', 0.97, 1, 7]], fixed: true, ground: 'basalt', amb: 'embers' },
    sunfire: { sky: ['#ff9e80', '#ffb38c', '#ffc99e', '#ffdfb6'], far: 'volcano', cone: ['#f0b29a', '#da9886', '#ba7e70'], lava: ['#fff3a8', '#ffc078', '#ff9a86'],
      gr: ['#f3c8a0', '#ebba90', '#d6a07a', '#fbdcbe'], pad: ['#fde4c8', '#f2cca6', '#d8ae86'], dots: ['#fff0a0', '#d49a78'],
      props: [['rock', 0.05, 0, 7], ['rock', 0.97, 1, 7]], fixed: true, ground: 'redrock', amb: 'embers', sun: 'big' },
    tower: { sky: ['#6c6cc8', '#8086d6', '#9ca4e2', '#bac2ee'], far: 'walls', wall: ['#eeecf8', '#d4d4e8', '#b6b8d0', '#9a9cba'],
      gr: ['#f1e5cc', '#e7d8bc', '#cdbb98', '#efe4d4'], pad: ['#fff6e0', '#eedfc0', '#d0bc98'], dots: ['#cdbb98'], stars: true, fixed: true, ground: 'tiles', amb: 'dust', crowd: 'mix', torches: true },
    // the new leagues' and Zombosses' worlds
    west: { sky: ['#ffc99a', '#ffd6aa', '#ffe4c0', '#fff1da'], far: 'desert', mesa: ['#f8c8a4', '#eaac8c', '#d09076'], mesaFar: ['#fbdcc2', '#f0c4a8'],
      gr: ['#f8dcac', '#f1cf9a', '#dfb882', '#fdeacc'], pad: ['#feecc8', '#f2d6a8', '#d8b888'], dots: ['#b8dca0', '#ffc6a8', '#ffffff'],
      props: [['cactus', -3, 2], ['saloon', 0.43, 0], ['wheel', 0.97, 1, 3]], clouds: true, fixed: true, ground: 'dust', sun: 'big', sunX: 0.72, crowd: true },
    lostcity: { sky: ['#a6dad6', '#badfd8', '#cfe8da', '#e6f2dc'], far: 'ruins', canopy: ['#a4dca6', '#80c290', '#66aa7c'], gold: ['#fde4a0', '#f2ca70', '#d6a852'],
      gr: ['#efdeaa', '#e5d098', '#cbb27e', '#f2ead0'], pad: ['#fdebb8', '#f2d690', '#d6b670'], dots: ['#9cd6a0', '#ffe6a0'],
      props: [['jtree', -5, 2], ['goldpillar', 0.45, 0], ['idol', 0.98, 1, 1]], clouds: true, fixed: true, ground: 'stone', amb: 'leaves', sun: true, sunX: 0.84, crowd: true },
    bigwave: { sky: ['#7ccff5', '#99d9f6', '#bae5f8', '#daf2fb'], far: 'surf', sea: ['#90dcf2', '#6fc8ea', '#ffffff', '#c4f0fa'],
      gr: ['#fdedcc', '#f8e3ba', '#ead0a0', '#fff6e0'], pad: ['#fff8e4', '#f5e0b6', '#ddc492'], dots: ['#ffffff', '#ffc4d6', '#9fe0f0'],
      props: [['surfboard', -2, 2], ['lifeguard', 0.45, 0], ['beachball', 0.95, 0, 5]], clouds: true, fixed: true, ground: 'sand', sun: true, crowd: true },
    neon: { sky: ['#34286a', '#45307e', '#583892', '#6e42a4'], far: 'stage', neon: ['#ff9edb', '#8fe9ff', '#c9a8ff', '#fff29a'],
      gr: ['#6c4ea0', '#5e4292', '#4a3478', '#7a5cae'], pad: ['#ffd8f4', '#f4abe2', '#cc86c8'], dots: ['#ff9edb', '#8fe9ff', '#fff29a'],
      props: [['speaker', -1, 2], ['speaker', 1.02, 1]], stars: true, fixed: true, theme: 'night', ground: 'dance', amb: 'sprinkles', crowd: true },
    modern: { sky: ['#a4d6f5', '#badff7', '#d2eaf9', '#e9f5fb'], far: 'suburb', hF: ['#c8eac0', '#9fcfa2'], trees: ['#93d38c', '#71b474'],
      houses: [['#d4f0e0', '#a6d2bc'], ['#ffe2cc', '#f0bc9c'], ['#e8dcff', '#c4b0ea'], ['#fff2bc', '#ead08e']], roofs: [['#f6a4a4', '#d88486'], ['#98bcee', '#7898d0'], ['#bca2e6', '#9a80c8'], ['#f6b884', '#d89868']],
      gr: ['#addf83', '#9cd273', '#86c066', '#cdeec0'], pad: ['#e4f8be', '#c2e696', '#9eca78'], dots: ['#ffd3e2', '#fff2a6', '#ffffff'],
      props: [['lamp', -1, 2], ['hedge', 0.45, 0], ['bin', 0.97, 1, 1]], clouds: true, ground: 'lawn', amb: 'petals', crowd: true },
  };
  // the PVZ gardens as arenas (built from the classic arenas with garden props)
  THEMES.frontyard = Object.assign({}, THEMES.meadow, { props: [['bigtree', -6, 2], ['hedge', 0.45, 0], ['mailbox', 1.0, 1]] });
  THEMES.backyard = Object.assign({}, THEMES.meadow, { props: [['tree', -2, 2], ['poolchair', 0.45, 0], ['hedge', 1.02, 1]], amb: null });
  THEMES.graveyard = Object.assign({}, THEMES.moonlit, { gr: ['#86c0b4', '#76b0a6', '#5e968e', '#8a90c8'], props: [['spookytree', -4, 2], ['gravestone', 0.46, 0], ['gravestone2', 1.0, 1]] });
  THEMES.pirate = Object.assign({}, THEMES.beach, { props: [['palm', -2, 2], ['cannon', 0.47, 0], ['barrel', 0.93, 0]] });
  THEMES.egypt = Object.assign({}, THEMES.beach, { sky: ['#8acff2', '#a6daf2', '#c8e8ee', '#f6ecd0'], far: 'hills', hF: ['#f6e0ae', '#e0c48c'], hN: ['#efd196', '#d4b074'], trees: null, pyramids: true,
    gr: ['#f9e6b4', '#f2da9e', '#e2c68a', '#fbf0d4'], pad: ['#fff6d6', '#f2dca4', '#d6bc84'], dots: ['#d8b07a', '#ffffff', '#9fe0f0'], props: [['datepalm', -2, 2], ['obelisk', 0.47, 0], ['urn', 0.93, 0]] });
  THEMES.jurassic = Object.assign({}, THEMES.jungle, { sky: ['#a2d9cc', '#b6e1cc', '#cdeacd', '#e5f2d3'], canopy: ['#9ad49c', '#78ba86', '#5ea072'], cone: ['#d6b0b4', '#bc969e', '#9e7e8a'],
    props: [['fern', -1, 2], ['bones', 0.46, 0, 4], ['dinoegg', 0.97, 1, 2]], sun: true });
  const NIGHT_SKY = ['#2e306e', '#383c80', '#444a90', '#525a9e'], NIGHT = '#3a4084';
  const hash = n => { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return n >>> 0; };
  function mix(a, b, k) {
    if (!k) return a;
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = Math.round(lerp(pa >> 16, pb >> 16, k)), g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, k)), bl = Math.round(lerp(pa & 255, pb & 255, k));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  }
  function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  // night: a soft blue tint (multiply toward periwinkle with a little blue lift) instead of mixing toward grey
  const NMUL = [0.6, 0.66, 0.92], NADD = [8, 12, 36];
  function nightOf(c, a) { if (!a) return c; const p = parseInt(c.slice(1), 16), ch = [p >> 16 & 255, p >> 8 & 255, p & 255].map((v, i) => Math.round(Math.min(255, v * (1 - a * (1 - NMUL[i])) + a * NADD[i]))); return '#' + ((1 << 24) | (ch[0] << 16) | (ch[1] << 8) | ch[2]).toString(16).slice(1); }
  const FP = 1 / PX.SCENE_K, fsnap = v => Math.round(v * PX.SCENE_K) / PX.SCENE_K;
  // the horizontal run of an ellipse on row y (or null)
  function span(cx, cy, rx, ry, y) { const d = (y - cy) / ry; if (d <= -1 || d >= 1) return null; const w = rx * Math.sqrt(1 - d * d); return [cx - w, cx + w]; }
  function run(g, a, b, y, c) { a = fsnap(a); b = fsnap(b); if (b > a) px(g, a, y, b - a, FP, c); }
  function fell(g, cx, cy, rx, ry, c) { for (let y = fsnap(cy - ry); y < cy + ry; y += FP) { const s = span(cx, cy, rx, ry, y + FP / 2); if (s) run(g, s[0], s[1], y, c); } }
  // a chibi blob: flat fill R[1], a soft R[2] crescent along the lower right, a small R[0] highlight up-left and an lw-fine-pixel
  // outline. o.cut: stop at this row (things sitting on the ground)
  function blob(g, cx, cy, rx, ry, R, line, o) {
    o = o || {}; const lw = (o.lw == null ? 1 : o.lw) * FP, k = o.shade == null ? 0.2 : o.shade, cut = o.cut == null ? 1e9 : o.cut;
    for (let y = fsnap(cy - ry - lw); y < Math.min(cy + ry + lw, cut); y += FP) {
      const yc = y + FP / 2, so = lw ? span(cx, cy, rx + lw, ry + lw, yc) : null;
      if (so) run(g, so[0], so[1], y, line);
      const s = span(cx, cy, rx, ry, yc); if (!s) continue;
      run(g, s[0], s[1], y, R[2]);
      const l = span(cx - rx * k, cy - ry * k * 1.15, rx * 1.02, ry * 1.02, yc);
      if (l) run(g, Math.max(s[0], l[0]), Math.min(s[1], l[1]), y, R[1]);
    }
    if (o.hl !== false && R[0]) fell(g, cx - rx * 0.42, cy - ry * 0.45, Math.max(FP, rx * 0.22), Math.max(FP, ry * 0.14), R[0]);
  }
  // a 4-point twinkle (water, snow, stars)
  function sparkle(g, x, y, c, big) {
    x = fsnap(x); y = fsnap(y); const L = big ? 2 : 1;
    for (let i = 1; i <= L; i++) { px(g, x - i * FP, y, FP, FP, c); px(g, x + i * FP, y, FP, FP, c); px(g, x, y - i * FP, FP, FP, c); px(g, x, y + i * FP, FP, FP, c); }
    px(g, x, y, FP, FP, '#ffffff');
  }
  // a band of round bumps along the horizon (hills, tree crowns, domes): flat fill, an optional soft shade on slopes that
  // fall to the right, a fine outline along the top (unbroken on steep sides). Returns the height function.
  function bumps(g, hy, o) {
    const H = x => {
      let h = o.base || 0; const k0 = Math.floor(x / o.per);
      for (let k = k0 - 2; k <= k0 + 2; k++) { const q = hash(k * 131 + o.seed), c = k * o.per + (q % 97) / 97 * o.per * 0.7, r = o.r[0] + (q >>> 9) % o.r[1], d = x - c; if (d > -r && d < r) h = Math.max(h, (o.base || 0) * 0.5 + (o.bell ? r * (1 + Math.cos(Math.PI * d / r)) / 2 : Math.sqrt(r * r - d * d)) * o.sq); }
      return h;
    };
    let hp = H(-FP), h = H(0);
    for (let x = 0; x < WW; x += FP) {
      const hn = H(x + FP), top = fsnap(hy - h), low = Math.min(hy, Math.max(top + FP, fsnap(hy - Math.min(hp, hn))));
      px(g, x, top, FP, hy - top, o.shade && hn < h - FP * 0.15 ? o.shade : o.fill);
      if (o.cap) { const d = h - o.capAt; if (d > 0) { const dep = Math.min(d * 0.75, o.capMax || 7) + Math.sin(x * 1.7) * 0.6 + 0.6; px(g, x, top, FP, fsnap(Math.max(FP, dep)), o.cap); px(g, x, top + fsnap(Math.max(FP, dep)), FP, FP, o.capLine); } }
      px(g, x, top, FP, low - top, o.line);
      hp = h; h = hn;
    }
    return H;
  }
  // a lollipop tree (far hills, streets)
  function puffTree(g, x, y, r, C, line) { px(g, fsnap(x - FP), y - r * 0.8, FP * 2, r * 0.8 + FP, line); blob(g, x, y - r * 1.25, r, r * 0.92, [mix(C[0], '#ffffff', 0.35), C[0], C[1]], line); }
  // a pyramid / roof: lit left face, shaded right face, fine outline. slope = half-width per pixel of height
  function pyramid(g, cx, by, h, slope, lit, shade, line) {
    for (let y = fsnap(by - h - FP); y < by; y += FP) {
      const yy = y + FP / 2 - (by - h); if (yy < -FP) continue; const w = Math.max(0, yy) * slope;
      run(g, cx - w - FP * 1.2, cx + w + FP * 1.2, y, line);
      if (yy > FP / 2) { run(g, cx - w, cx, y, lit); run(g, cx, cx + w, y, shade); }
    }
  }
  // a rounded box (houses, stages, signs) with a fine outline and a soft shade along its right and bottom edges
  function box(g, x, y, w, h, fill, shade, line, r) {
    r = r == null ? 1 : r;
    for (let yy = fsnap(y - FP); yy < y + h + FP; yy += FP) {
      const t = yy + FP / 2, e = t < y + r ? y + r - t : t > y + h - r ? t - (y + h - r) : 0, ins = r ? r - Math.sqrt(Math.max(0, r * r - e * e)) : 0;
      run(g, x + ins - FP, x + w - ins + FP, yy, line);
      if (t > y && t < y + h) { run(g, x + ins, x + w - ins, yy, t > y + h - 1.2 ? shade : fill); if (shade && t <= y + h - 1.2) run(g, x + w - ins - 1.2, x + w - ins, yy, shade); }
    }
  }
  // the little sky characters: a smiling sun and a sleepy moon (hi-res sprites, drawn once)
  const SKY = {};
  function sunSpr(big) {
    const key = big ? 'bigsun' : 'sun'; if (SKY[key] !== undefined) return SKY[key];
    let c = null;
    try {
      const n = big ? 30 : 22, m = n / 2, r = big ? 8.6 : 6, A = PX.art, g = new PX.Grid(n, n);
      PX.piece(g, t => { for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 + 0.31; t.ell(m + Math.cos(a) * (r + 2.4), m + Math.sin(a) * (r + 2.4), big ? 2.2 : 1.7, big ? 2.2 : 1.7, i % 2 ? '#ffe9a0' : '#ffdf8a'); } });
      PX.piece(g, t => A.softBody(t, m, m, r, r, ['#fffbe2', '#fff0a0', '#ffd77e']));
      A.chibiEyes(g, m + 0.4, m + r * 0.14, { sp: r * 0.86, w: r * 0.46, h: r * 0.6 });
      A.blush(g, m + 0.4, m + r * 0.5, { sp: r * 1.3, w: big ? 1.3 : 1, h: big ? 0.75 : 0.6 });
      A.chibiMouth(g, m + 0.4, m + r * 0.6, 'smile', big ? 2.2 : 1.7);
      c = g.canvas();
    } catch (e) { c = null; }
    return (SKY[key] = c);
  }
  function moonSpr() {
    if (SKY.moon !== undefined) return SKY.moon;
    let c = null;
    try {
      const A = PX.art, g = new PX.Grid(18, 18);
      PX.piece(g, t => A.softBody(t, 9, 9, 6.6, 6.6, ['#fffbea', '#fff1c2', '#f2d896']));
      g.ell(6.2, 6, 1.1, 0.9, '#f6e2a8'); g.ell(12, 12.6, 0.9, 0.7, '#f6e2a8');
      A.chibiEyes(g, 9.4, 9.4, { sp: 5.4, w: 2.8, h: 3.6 }); A.chibiMouth(g, 9.4, 12.4, 'smile', 1.6);
      A.blush(g, 9.4, 11.8, { sp: 7.6, w: 1, h: 0.55 });
      c = g.canvas();
    } catch (e) { c = null; }
    return (SKY.moon = c);
  }
  // ---- arena props drawn here (the new worlds); everything else comes from PX.prop (art-world.js) ----
  const BPROP = {
    cactus: { w: 18, h: 28, draw(g) {
      const C = ['#dcf6bc', '#a9dc8e', '#86c276'], A = PX.art, keep = (x, y) => y < 27.5;
      PX.piece(g, t => { PX.stroke(t, [[8, 17], [4.4, 17], [4.4, 10.5]], 1.75, 1.75, C[1]); t.ell(4.4, 10.4, 1.75, 1.6, C[1]); });
      PX.piece(g, t => { PX.stroke(t, [[10, 14.5], [13.6, 14.5], [13.6, 8.5]], 1.6, 1.6, C[1]); t.ell(13.6, 8.4, 1.6, 1.5, C[1]); });
      PX.piece(g, t => A.softBody(t, 9, 17, 3.9, 11.5, C, { mask: keep }));
      for (const x of [7.6, 10.4]) PX.stroke(g, [[x, 8], [x, 26.5]], 0.25, 0.25, C[2]);
      PX.piece(g, t => { for (let i = 0; i < 5; i++) { const a = i * Math.PI * 0.4 - Math.PI / 2; t.ell(9 + Math.cos(a) * 1.5, 5.6 + Math.sin(a) * 1.5, 1.2, 1.2, '#ffb3c8'); } t.ell(9, 5.6, 0.9, 0.9, '#fff2a0'); });
    } },
    saloon: { w: 34, h: 28, draw(g) {
      const W = ['#f8dab4', '#ecc096', '#d2a27a'];
      PX.piece(g, t => { t.rect(3, 7, 28, 20, W[1]); t.rect(8, 3, 18, 4, W[1]); t.rect(28, 7, 3, 20, W[2]); });
      for (let y = 9.5; y < 26; y += 2.5) PX.stroke(g, [[3.4, y], [27.6, y]], 0.22, 0.22, W[2]);
      PX.piece(g, t => t.rect(10, 4, 14, 4, '#fff3d6'));
      g.ell(17, 6, 1, 1, '#ff9fae'); g.dots([[15, 5.5], [19, 5.5]], '#d2a27a');
      PX.piece(g, t => { t.poly([[2, 13], [32, 13], [30.5, 16.4], [3.5, 16.4]], '#ffa6b0'); for (let x = 5; x < 30; x += 4) t.poly([[x, 13], [x + 2, 13], [x + 1.7, 16.4], [x + 0.3, 16.4]], '#fff0f2'); });
      PX.piece(g, t => { t.rect(6, 18, 6, 5, '#c6ecf8'); t.rect(22, 18, 6, 5, '#c6ecf8'); });
      g.dots([[7, 19], [7.5, 19], [7, 19.5], [23, 19], [23.5, 19], [23, 19.5]], '#ffffff');
      PX.piece(g, t => t.rect(13, 18, 8, 9, '#a88070'));
      PX.piece(g, t => { t.rect(13, 20, 4, 5, W[0]); t.rect(17, 20, 4, 5, W[0]); });
      PX.piece(g, t => t.rect(1, 26, 32, 2, W[2]));
    } },
    wheel: { w: 16, h: 16, draw(g) {
      const W = ['#f6d4ae', '#e2b48a', '#c4946c'];
      PX.piece(g, t => { for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; PX.stroke(t, [[8, 8.5], [8 + Math.cos(a) * 5.6, 8.5 + Math.sin(a) * 5.6]], 0.55, 0.55, W[1]); } });
      PX.piece(g, t => { for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12, b = (i + 1) * Math.PI / 12; PX.stroke(t, [[8 + Math.cos(a) * 6.2, 8.5 + Math.sin(a) * 6.2], [8 + Math.cos(b) * 6.2, 8.5 + Math.sin(b) * 6.2]], 0.95, 0.95, i > 2 && i < 10 ? W[2] : W[1]); } });
      PX.piece(g, t => t.ell(8, 8.5, 1.7, 1.7, W[0]));
    } },
    jtree: { w: 30, h: 40, draw(g) {
      const T = ['#e6c09c', '#d2a680', '#b48a66'], L = ['#d0f4b8', '#a2dc92', '#7cc07e'], A = PX.art;
      PX.piece(g, t => { t.poly([[12, 39], [13.2, 20], [16.8, 20], [18.6, 39]], T[1]); t.poly([[16, 39], [17, 22], [16.8, 20], [18.6, 39]], T[2]); });
      PX.piece(g, t => A.softBody(t, 8.6, 15, 7.4, 6.2, L));
      PX.piece(g, t => A.softBody(t, 21.4, 14, 7.6, 6.4, L));
      PX.piece(g, t => A.softBody(t, 15, 9.2, 9, 7.6, L));
      for (const [x, y0, n] of [[6.5, 19, 9], [23.5, 18.5, 12], [11, 15, 6]]) { PX.piece(g, t => { PX.stroke(t, [[x, y0], [x + 0.6, y0 + n]], 0.4, 0.4, '#8cc87e'); t.ell(x + 0.8, y0 + n * 0.55, 1.1, 0.7, '#a2dc92', 0.5); t.ell(x + 0.4, y0 + n, 1.1, 0.7, '#a2dc92', -0.5); }); }
    } },
    goldpillar: { w: 14, h: 30, draw(g) {
      const G = ['#fff2b8', '#f6d27a', '#dcae5a'], S = ['#f2ead2', '#ddd2b4', '#bfb292'];
      PX.piece(g, t => { t.rect(1, 26, 12, 3, S[1]); t.rect(1, 28, 12, 1, S[2]); });
      PX.piece(g, t => { t.poly([[3.5, 26], [3.5, 9], [5.5, 7.4], [7.3, 9], [9, 6.6], [10.5, 8.4], [10.5, 26]], G[1]); t.rect(9, 9, 2, 17, G[2]); });
      for (const x of [5.5, 7.5]) PX.stroke(g, [[x, 10.5], [x, 25.5]], 0.25, 0.25, G[2]);
      g.ell(5, 11, 0.6, 1.4, G[0]);
      PX.piece(g, t => { PX.stroke(t, [[3.2, 25], [10.6, 21], [3.2, 16.5], [9.4, 12.5]], 0.45, 0.45, '#8ccc84'); for (const [x, y, a] of [[6.8, 23, 0.4], [7.2, 18.8, -0.5], [6, 14.6, 0.4]]) t.ell(x, y, 1.3, 0.75, '#a8dc96', a); });
    } },
    idol: { w: 20, h: 22, draw(g) {
      const G = ['#fff2b8', '#f6d27a', '#dcae5a'], S = ['#f2ead2', '#ddd2b4', '#bfb292'], A = PX.art;
      PX.piece(g, t => { t.rect(3, 15, 14, 6, S[1]); t.rect(14, 15, 3, 6, S[2]); });
      PX.piece(g, t => { t.ell(3.6, 9.4, 1.8, 3, G[2]); t.ell(16.4, 9.4, 1.8, 3, G[2]); });
      PX.piece(g, t => A.softBody(t, 10, 9, 6.4, 6, G));
      PX.piece(g, t => t.poly([[10, 2.4], [11.4, 4], [10, 5.6], [8.6, 4]], '#ff9fc0'));
      A.chibiEyes(g, 10.4, 9.6, { sp: 4.6, w: 1.8, h: 2.2, mood: 'closed', col: '#a8803c' });
      A.chibiMouth(g, 10.4, 12.2, 'smile', 2);
    } },
    surfboard: { w: 12, h: 28, draw(g) {
      PX.piece(g, t => { t.ell(6, 13.6, 3.7, 12.6, '#ffbfd2', 0.1, (x, y) => y < 27); t.poly([[2.1, 13], [9.9, 11.6], [10, 14.2], [2.2, 15.6]], '#8fe0f0'); });
      g.ell(4.6, 6, 0.7, 2.6, '#fff0f6', 0.1);
      PX.piece(g, t => t.rect(0, 26, 12, 2, '#f2dcae'));
    } },
    lifeguard: { w: 26, h: 32, draw(g) {
      const Wd = ['#f8dcb8', '#ecc49c', '#d2a882'];
      PX.piece(g, t => { PX.stroke(t, [[6, 31], [8, 18]], 0.75, 0.75, Wd[1]); PX.stroke(t, [[20, 31], [18, 18]], 0.75, 0.75, Wd[1]); PX.stroke(t, [[7, 25], [19, 25]], 0.5, 0.5, Wd[2]); });
      PX.piece(g, t => { t.rect(6, 11, 14, 8, '#ffffff'); for (let x = 6; x < 20; x += 4) t.rect(x, 11, 2, 8, '#ff9fae'); t.rect(19, 11, 1, 8, '#e6e6f0'); });
      PX.piece(g, t => t.rect(10, 13, 6, 3, '#bfeaf8'));
      PX.piece(g, t => { t.poly([[3, 11.4], [13, 5.6], [23, 11.4]], '#ffb0a8'); t.poly([[13, 5.6], [23, 11.4], [13, 11.4]], '#f2948e'); });
      PX.piece(g, t => { PX.stroke(t, [[13, 6], [13, 1.4]], 0.3, 0.3, '#b8b0c0'); t.poly([[13.2, 1], [17.4, 2.2], [13.2, 3.4]], '#8fe0f0'); });
    } },
    beachball: { w: 12, h: 12, draw(g) {
      const segs = ['#ff9fb4', '#ffffff', '#8fd8f8', '#fff09a', '#ffffff', '#a8e6a0'];
      PX.piece(g, t => { for (let i = 0; i < 6; i++) { const m = (x, y) => { const a = (Math.atan2(y - 5.8, x - 6) + Math.PI * 2 + 0.2) % (Math.PI * 2); return Math.floor(a / (Math.PI / 3)) === i; }; m.fine = true; t.ell(6, 6, 5, 5, segs[i], 0, m); } t.ell(6, 6, 1.2, 1.2, '#ffffff'); });
      for (let fy = 0; fy < g.fh; fy++) for (let fx = 0; fx < g.fw; fx++) { const c = g.fget(fx, fy), x = (fx + 0.5) / g.k, y = (fy + 0.5) / g.k; if (c && c !== INK && (x - 4.9) * (x - 4.9) + (y - 4.8) * (y - 4.8) > 22) g.fset(fx, fy, PX.art.mixHex(c, '#9a86b8', 0.22)); } // a soft shade crescent
      g.ell(4.2, 3.8, 1, 0.6, '#ffffff', -0.5);
    } },
    speaker: { w: 16, h: 26, draw(g) {
      const B = ['#8a74c0', '#6e5aa6', '#5a4890'];
      PX.piece(g, t => { t.rect(1, 12, 14, 13, B[1]); t.rect(12, 12, 3, 13, B[2]); });
      PX.piece(g, t => { t.rect(3, 2, 10, 10, B[1]); t.rect(11, 2, 2, 10, B[2]); });
      for (const [cx, cy, r] of [[8, 19, 4.2], [7.6, 7, 2.6]]) { PX.piece(g, t => { t.ell(cx, cy, r, r, '#d4b8ff'); t.ell(cx, cy, r * 0.62, r * 0.62, '#b694f0'); t.ell(cx, cy, r * 0.28, r * 0.28, '#ff9edb'); }); g.dot(cx - r * 0.5, cy - r * 0.5, '#ffffff'); }
      g.dots([[3, 13.5], [3.5, 13.5], [12, 13.5], [12.5, 13.5]], '#8fe9ff');
    } },
    lamp: { w: 12, h: 36, draw(g) {
      const P = ['#e6eaf8', '#c4cae2', '#a2a8c8'];
      PX.piece(g, t => { t.rect(2, 33, 6, 2, P[1]); PX.stroke(t, [[5, 33], [5, 6], [6.5, 3.6], [8.6, 3.6]], 0.6, 0.6, P[1]); });
      PX.piece(g, t => { t.poly([[6.6, 4.4], [10.6, 4.4], [11.2, 6.4], [6, 6.4]], P[1]); t.ell(8.6, 7.2, 1.6, 1.1, '#fff3a8'); });
      g.dot(8.2, 6.9, '#ffffff');
    } },
    bin: { w: 10, h: 13, draw(g) {
      PX.piece(g, t => { t.poly([[1.6, 3.4], [8.4, 3.4], [7.6, 12.6], [2.4, 12.6]], '#b4dccc'); t.poly([[6.4, 3.4], [8.4, 3.4], [7.6, 12.6], [6, 12.6]], '#92c4b2'); });
      for (const x of [3.8, 5.2]) PX.stroke(g, [[x, 5], [x, 11.4]], 0.22, 0.22, '#92c4b2');
      PX.piece(g, t => { t.ell(5, 3, 4.3, 1.3, '#c8ead8'); t.ell(5, 1.6, 1.2, 0.6, '#c8ead8'); });
    } },
    fern: { w: 20, h: 14, draw(g) {
      const L = ['#d0f4b8', '#a2dc92', '#7cc07e'];
      for (const [a, len] of [[-2.5, 7.6], [-0.65, 7], [-1.6, 8.4], [-2.05, 8], [-1.05, 8]]) PX.piece(g, t => { const ex = 10 + Math.cos(a) * len, ey = 13 + Math.sin(a) * len; t.ell((10 + ex) / 2, (13 + ey) / 2, len / 2 + 0.6, 1.9, L[1], a); PX.stroke(t, [[10, 13], [ex, ey]], 0.2, 0.2, L[2]); });
    } },
    bones: { w: 22, h: 10, draw(g) {
      const B = ['#fffbf2', '#f4ead6', '#dacdb4'];
      PX.piece(g, t => { PX.stroke(t, [[4.4, 6.4], [17.6, 4.6]], 1.4, 1.4, B[1]); for (const [x, y] of [[3.2, 5.4], [3.6, 7.8], [18.6, 3.4], [18.6, 5.9]]) t.ell(x, y, 1.6, 1.4, B[1]); });
      PX.stroke(g, [[6, 7.2], [16, 5.8]], 0.25, 0.25, B[2]);
      PX.piece(g, t => { t.ell(11.4, 8.6, 2.2, 1, B[2]); });
    } },
    dinoegg: { w: 12, h: 14, draw(g) {
      PX.piece(g, t => { t.ell(6, 12.4, 5.4, 1.6, '#d8b48c'); });
      PX.piece(g, t => PX.art.softBody(t, 6, 7.4, 3.8, 4.8, ['#f6fff8', '#d6f2e2', '#aedac4'], { mask: (x, y) => y < 12 }));
      g.ell(4.8, 8.6, 0.9, 0.7, '#c8b6f0'); g.ell(7.6, 6, 0.8, 0.6, '#c8b6f0'); g.ell(7.4, 10, 0.6, 0.5, '#c8b6f0');
      PX.piece(g, t => { for (const x of [1.5, 4, 8, 10.5]) PX.stroke(t, [[x, 12.6], [x + 0.8, 11.2]], 0.35, 0.35, '#c49c74'); });
    } },
  };
  BPROP.kelp = { w: 12, h: 30, draw(g) { // swaying sea kelp
    PX.piece(g, t => { for (let y = 29; y >= 3; y -= 0.5) t.ell(6 + Math.sin(y * 0.32) * 1.7, y, 1.2, 0.6, '#a8e6c0'); for (let y = 7; y < 28; y += 6) t.ell(6 + Math.sin(y * 0.32) * 1.7 + (y % 12 > 6 ? 2.6 : -2.6), y, 2.1, 1.05, '#c4f0d0', y % 12 > 6 ? 0.5 : -0.5); });
    g.dots([[5.5, 20], [6.5, 12], [6, 6]], '#ecfcf0');
  } };
  BPROP.coral = { w: 18, h: 18, draw(g) { // branching pastel coral on a little rock
    PX.piece(g, t => PX.art.softBody(t, 9, 16.4, 6.4, 2.4, ['#e8eefc', '#c8d2f0', '#a8b4dc'], { hl: false }));
    PX.piece(g, t => { const c = '#ffb8c8'; PX.stroke(t, [[9, 15], [9, 9], [5.4, 5.6], [4.6, 2.8]], 1.3, 1.0, c); PX.stroke(t, [[9, 10.4], [12.6, 6.6], [13.2, 3.6]], 1.2, 1.0, c); PX.stroke(t, [[9, 8.4], [9.2, 3.4]], 1.15, 1.0, c); });
    g.dots([[4.6, 2.6], [9.2, 3.2], [13.2, 3.4], [8.6, 12]], '#ffe2ea');
  } };
  for (const [k, h, w] of [['pine', 26, 16], ['pine2', 20, 13], ['pine3', 15, 10]]) BPROP[k] = { w, h, draw(g) { // chibi snowy pine: three stacked rounded tiers
    const C = ['#c4ecdc', '#8ccdb8', '#68ad9a'], m = w / 2, tier = (h - 4) / 3;
    PX.piece(g, t => t.rect(Math.floor(m - 1), h - 4, 2, 4, '#d0a07c'));
    for (let i = 2; i >= 0; i--) PX.piece(g, t => { const by = h - 3 - (2 - i) * tier * 0.82, top = by - tier * 1.25, hw = m - 1 - i * 0.9; t.poly([[m, top], [m + hw, by - 0.4], [m + hw - 0.8, by + 0.6], [m - hw + 0.8, by + 0.6], [m - hw, by - 0.4]], C[1]); t.poly([[m, top], [m + hw, by - 0.4], [m + hw - 0.8, by + 0.6], [m, by + 0.6]], C[2]); t.ell(m, top + 1, 1.3 + (2 - i) * 0.2, 1, '#ffffff'); });
  } };
  const bpCache = {};
  // an arena prop: drawn here (BPROP) or by the garden props (PX.prop)
  function bprop(kind, theme) {
    const B = BPROP[kind];
    if (!B) return safe(() => PX.prop(kind, theme), null);
    if (bpCache[kind] !== undefined) return bpCache[kind];
    let c = null; try { const g = new PX.Grid(B.w, B.h); B.draw(g); g.outerLine(); c = g.canvas(); } catch (e) { console.error('arena prop', kind, e); }
    return (bpCache[kind] = c);
  }
  const propX = (kind, c, fx0) => (fx0 < 0 ? fx0 + PX.artW(c) / 2 : fx0 > 1 ? WW - PX.artW(c) / 2 + 4 : Math.round(WW * fx0 - (kind === 'rock' ? 0 : 10)));
  // ---- horizon bands ----
  function farBand(g, T, hy, Nk, k) {
    switch (T.far) {
      case 'sea': case 'stormsea': case 'surf': {
        const storm = T.far === 'stormsea', surf = T.far === 'surf', top = hy - (storm ? 12 : surf ? 15 : 8), S = T.sea.map(Nk);
        if (storm) for (const [x0, w, h] of [[0.12, 4, 15], [0.2, 2.6, 9], [0.83, 5, 19], [0.9, 2.6, 8]]) blob(g, Math.round(WW * x0), top + 1, w, h, T.spire.map(Nk), Nk(T.spire[2]), { cut: top + 1 });
        if (!storm && !surf) { const ix = Math.round(WW * 0.62); blob(g, ix, top + 1, 9, 3.2, ['#d8f0c8', '#b8e2b0', '#98cc98'].map(Nk), Nk('#84b88c'), { cut: top + 1, hl: false }); }
        for (let y = fsnap(top); y < hy; y += FP) { const d = (y - top) / (hy - top); px(g, 0, y, WW, FP, mix(S[3], S[0], Math.min(1, d * 1.6))); }
        px(g, 0, fsnap(top), WW, FP, Nk(S[1]));
        for (let i = 0; i < WW / 9; i++) { const q = hash(i * 17 + 5), x = (q % 1000) / 1000 * WW, y = top + 1.5 + ((q >>> 10) % 100) / 100 * (hy - top - 2.5); if (q % 3) { run(g, x, x + 1.5 + (q >>> 20) % 2, fsnap(y), mix(S[2], S[3], 0.3)); } else sparkle(g, x, y, mix(S[3], '#ffffff', 0.4), (q >>> 7) % 4 === 0); }
        if (surf) { // two rows of big rolling waves with foamy crests
          for (const [row, base, h, per] of [[0, top + 6, 4.5, 34], [1, hy - 0.5, 6.5, 46]]) {
            for (let x0 = -per + (row ? 10 : 0); x0 < WW + per; x0 += per) {
              const q = hash(Math.round(x0) * 7 + row), cx = x0 + (q % 9), w = per * 0.42;
              blob(g, cx, base, w, h, [S[3], S[0], S[1]], Nk(S[1]), { cut: base, hl: false });
              for (let i = 0; i < 4; i++) fell(g, cx - w * 0.55 + i * w * 0.24, base - h * (0.78 + 0.18 * Math.sin(i * 1.3)) + 0.4, 1.6 - i * 0.18, 1.1, '#ffffff');
              sparkle(g, cx + w * 0.3, base - h * 0.45, '#e8faff');
            }
          }
        }
        for (let x = 0; x < WW; x += FP) { const y = hy - 0.5 + Math.sin(x * 0.8) * 0.35; px(g, x, fsnap(y), FP, FP * 2, mix('#ffffff', S[3], 0.2 + k * 0.5)); } // foam on the shore
        break;
      }
      case 'deepsea': { // a pastel sea-floor horizon: light rays, soft rocks, round coral heads, branching coral, swaying kelp, bubbles
        const Rk = T.rocks, Rf = T.reef, Kp = T.kelp;
        g.globalAlpha = 0.16; for (const [x0, w] of [[0.12, 5], [0.4, 7], [0.66, 4], [0.86, 6]]) { const bx = WW * x0; for (let y = 0; y < hy; y += FP) { const cx = bx + y * 0.35; run(g, cx - w / 2, cx + w / 2, y, '#ffffff'); } } g.globalAlpha = 1;
        bumps(g, hy, { seed: 71, per: 26, r: [11, 8], sq: 0.55, base: 4, fill: Rk[0], line: Rk[1] });
        for (let i = 0; i < WW / 12; i++) {
          const q = hash(i * 37 + 5), x = i * 12 + q % 8, c = Rf[q % 4], line = mix(c, '#6a5a8a', 0.42), kind = (q >>> 5) % 3;
          if (kind === 0) blob(g, x, hy, 3 + (q >>> 8) % 3, 2.6 + (q >>> 10) % 2, [mix(c, '#ffffff', 0.45), c, mix(c, '#8a6aa0', 0.18)], line, { cut: hy + 0.2 });
          else if (kind === 1) for (const pass of [0, 1]) for (const [dx, h] of [[-1.7, 4], [0, 6.5], [1.7, 3.6]]) { const w = 0.8 + (pass ? 0 : FP); for (let y = hy - h; y < hy; y += FP) run(g, x + dx - w, x + dx + w, y, pass ? c : line); fell(g, x + dx, hy - h, w, w, pass ? c : line); }
          else { const h = 7 + (q >>> 12) % 6; for (let y = fsnap(hy - h); y < hy; y += FP) { const sx = x + Math.sin((y - hy) * 0.6 + i) * 0.9; run(g, sx - 0.75 - FP, sx + 0.75 + FP, y, Kp[1]); run(g, sx - 0.75, sx + 0.75, y, Kp[0]); } fell(g, x + Math.sin(-h * 0.6 + i) * 0.9, hy - h, 0.85, 0.85, Kp[0]); }
        }
        for (let i = 0; i < WW / 8; i++) { const q = hash(i * 53 + 11), x = (q % 997) / 997 * WW, y = 3 + ((q >>> 10) % 997) / 997 * (hy - 12); if (q % 3) { fell(g, x, y, 1, 1, '#bfe6f2'); fell(g, x, y, 0.7, 0.7, '#e8fbff'); px(g, fsnap(x - 0.4), fsnap(y - 0.4), FP, FP, '#ffffff'); } else sparkle(g, x, y, '#e8fbff', q % 7 === 0); }
        break;
      }
      case 'mountains': case 'peaks': {
        const P = T.far === 'peaks', B = T.mB.map(Nk), F = T.mF.map(Nk);
        bumps(g, hy, { seed: 11, per: 34, bell: true, r: [17, 12], sq: P ? 1.45 : 1.05, base: P ? 14 : 5, fill: B[0], shade: B[1], line: B[2], cap: T.cap, capLine: B[2], capAt: P ? 28 : 18, capMax: 6 });
        bumps(g, hy, { seed: 23, per: 26, bell: true, r: [12, 10], sq: P ? 1.3 : 0.95, base: P ? 6 : 1, fill: F[0], shade: F[1], line: F[2], cap: T.cap, capLine: F[2], capAt: P ? 22 : 13, capMax: 5 });
        if (P) for (let x = -6; x < WW + 6; x += 7) { const q = hash(x + 99); blob(g, x, hy - 2 - (q % 3), 5 + (q >>> 5) % 3, 3.6, ['#ffffff', '#ffffff', '#e4ecfb'], '#c2d0ee', { cut: hy + 1, hl: false }); }
        break;
      }
      case 'volcano': {
        const C = T.cone.map(Nk);
        bumps(g, hy, { seed: 5, per: 30, r: [12, 8], sq: 0.55, base: 3, fill: mix(C[0], T.sky[3], 0.45), line: mix(C[2], T.sky[3], 0.4) });
        cone(g, hy, T, Math.round(WW * 0.58), Math.min(Math.round(hy * 0.72), 52), false);
        break;
      }
      case 'jungle': case 'ruins': {
        const C = T.canopy;
        if (T.far === 'jungle') cone(g, hy, T, Math.round(WW * 0.72), Math.min(Math.round(hy * 0.5), 30), true);
        else ziggurat(g, hy, T, Math.round(WW * 0.56), Math.min(Math.round(hy * 0.62), 34));
        bumps(g, hy, { seed: 41, per: 13, r: [6, 5], sq: 0.95, base: 7, fill: mix(C[1], T.sky[3], 0.25), line: mix(C[2], T.sky[3], 0.2) });
        bumps(g, hy, { seed: 47, per: 11, r: [5, 4], sq: 0.9, base: 3, fill: C[0], line: C[2] });
        for (let i = 0; i < WW / 14; i++) { const q = hash(i * 29 + 3), x = (q % 997) / 997 * WW; fell(g, x, hy - 5 - (q >>> 11) % 4, 1.1, 0.7, mix(C[0], '#ffffff', 0.4)); }
        break;
      }
      case 'walls': {
        const W = T.wall.map(Nk), top = hy - 16;
        for (let x = 0; x < WW; x += 6) box(g, x, top - 3.5, 4, 4.5, W[0], W[1], W[3], 1);
        px(g, 0, top, WW, 16, W[1]); px(g, 0, top, WW, 1, W[0]); px(g, 0, top - FP, WW, FP, W[3]);
        for (let y = top + 4; y < hy; y += 4) { px(g, 0, fsnap(y), WW, FP, W[2]); for (let x = ((y - top) / 4) % 2 ? 0 : 4; x < WW; x += 8) px(g, x, fsnap(y - 4 + FP), FP, 4 - FP, W[2]); }
        V.torches = [];
        const cols = [['#ffc2cc', '#f29aa8'], ['#fff0a8', '#f0cf70'], ['#bfe0ff', '#92bcee'], ['#c6eeb4', '#9cd292']];
        for (let i = 0, x = 10; x < WW - 6; x += 24, i++) {
          blob(g, x + 0.5, top + 8, 3.5, 4, [W[3], W[3], mix(W[3], '#6a6c90', 0.3)], mix(W[3], '#4a4c70', 0.45), { hl: false }); px(g, x - 3, top + 8, 7, 8, W[3]); px(g, x - 3 - FP, top + 8, FP, 8, mix(W[3], '#4a4c70', 0.45)); px(g, x + 4, top + 8, FP, 8, mix(W[3], '#4a4c70', 0.45));
          const bx = x + 12;
          if (bx < WW - 4) { const [c0, c1] = cols[i % 4]; for (let y = top + 1; y < top + 10.5; y += FP) { const notch = y > top + 8.5 ? Math.abs((y - top - 8.5)) * 1.2 : 0; run(g, bx - 3 - FP, bx + 3 + FP, y, W[3]); if (y >= top + 1 + FP) { run(g, bx - 3, bx - notch * 0 - 0.4 - notch, y, c0); run(g, bx + 0.4 + notch, bx + 3, y, c0); if (notch < 0.4) run(g, bx - 0.4, bx + 0.4, y, c0); run(g, bx + 1.8, bx + 3, y, c1); } } px(g, bx - 1.5, top + 2.5, FP, 5, '#ffffff'); }
          V.torches.push({ x: x + 6, y: top + 6 });
        }
        break;
      }
      case 'desert': {
        const F = T.mesaFar.map(Nk), M = T.mesa.map(Nk);
        for (const [x0, w, h] of [[0.08, 16, 9], [0.36, 22, 13], [0.7, 18, 8], [0.95, 14, 11]]) mesa(g, hy, WW * x0, w, h, [F[0], F[1], F[1]], mix(F[1], M[2], 0.6));
        for (const [x0, w, h] of [[0.22, 13, 17], [0.62, 10, 22], [0.84, 16, 12]]) mesa(g, hy, WW * x0, w, h, M, mix(M[2], '#8a5a5a', 0.25), true);
        break;
      }
      case 'stage': {
        const N = T.neon, top = hy - 9;
        g.globalAlpha = 0.16; // soft spotlight beams fanning up from the stage
        for (const [x0, ang, c] of [[0.18, -0.35, N[0]], [0.4, 0.15, N[1]], [0.62, -0.2, N[2]], [0.84, 0.32, N[3]]]) { const bx = WW * x0; for (let y = 0; y < top; y += FP) { const d = top - y, cx = bx + d * ang, w = 1.5 + d * 0.16; run(g, cx - w, cx + w, y, c); } }
        g.globalAlpha = 1;
        const ax = WW / 2, aw = WW * 0.32, ah = Math.min(22, hy * 0.5); // an arch of bulbs over the stage
        for (let i = 0; i <= 20; i++) { const a = Math.PI * i / 20, x = ax - Math.cos(a) * aw, y = top - Math.sin(a) * ah; fell(g, x, y, 1.05, 1.05, '#3a2a6a'); fell(g, x, y, 0.75, 0.75, N[i % 4]); px(g, fsnap(x - 0.25), fsnap(y - 0.25), FP, FP, '#ffffff'); }
        box(g, -2, top, WW + 4, 9.5, '#5a4290', '#4c3680', '#2e2258', 0);
        px(g, 0, top + 1, WW, FP * 2, N[0]); px(g, 0, top + 1 + FP * 2, WW, FP, mix(N[0], '#5a4290', 0.5));
        for (let x = 2; x < WW; x += 5) fell(g, x, top + 5, 1, 1, N[(x / 5 | 0) % 4]);
        { const dx = WW / 2, dy = Math.max(6, top - ah - 6); px(g, fsnap(dx), 0, FP, dy - 3, '#c9b8e8'); blob(g, dx, dy, 3.2, 3.2, ['#ffffff', '#e6e8f6', '#b8bcd8'], '#7a6aa8', { hl: false }); for (const [ox, oy] of [[-1.2, -1], [1, 0.4], [-0.4, 1.4], [1.4, -1.6]]) px(g, fsnap(dx + ox), fsnap(dy + oy), FP * 2, FP * 2, N[(ox * 3 + 9 | 0) % 4]); sparkle(g, dx - 4.5, dy - 3, N[3], true); sparkle(g, dx + 5, dy + 1, N[1]); }
        break;
      }
      case 'suburb': {
        bumps(g, hy, { seed: 61, per: 34, r: [16, 12], sq: 0.4, base: 5, fill: Nk(T.hF[0]), line: Nk(T.hF[1]) });
        const H = T.houses, R = T.roofs;
        for (let i = 0, x = 4; x < WW + 20; i++) {
          const q = hash(i * 13 + 7), w = 16 + q % 6, wh = 9 + (q >>> 4) % 3, rh = 6 + (q >>> 7) % 3, Hc = H[(i + (q >>> 9)) % 4].map(Nk), Rc = R[(i * 3 + (q >>> 11)) % 4].map(Nk), by = hy - 1;
          box(g, x, by - wh, w, wh, Hc[0], Hc[1], Nk(mix(Hc[1], '#5a4a5a', 0.45)), 0);
          pyramid(g, x + w / 2, by - wh + 0.6, rh, (w / 2 + 1.6) / rh, Rc[0], Rc[1], Nk(mix(Rc[1], '#4a3a4a', 0.45)));
          const lit = k > 0.3 ? '#fff0a0' : '#d8f2fc';
          box(g, x + 2.5, by - wh + 2.5, 3.5, 3, lit, null, Nk('#8a8098'), 0); box(g, x + w - 6, by - wh + 2.5, 3.5, 3, lit, null, Nk('#8a8098'), 0);
          box(g, x + w / 2 - 1.5, by - 4.5, 3, 4.5, Rc[1], null, Nk(mix(Rc[1], '#4a3a4a', 0.45)), 0);
          x += w + 7 + (q >>> 13) % 6;
          if ((q >>> 15) % 2) puffTree(g, x - 3.5, hy, 2.6, T.trees.map(Nk), Nk(mix(T.trees[1], '#3a5a3a', 0.4)));
        }
        for (let x = 0; x < WW; x += 3) { box(g, x, hy - 4, 1.5, 4, '#ffffff', '#e8eaf4', Nk('#a8acc4'), 0.6); } // a white picket fence
        px(g, 0, hy - 2.6, WW, FP * 2, Nk('#ffffff'));
        break;
      }
      default: { // hills
        const far = bumps(g, hy, { seed: 3, per: 34, r: [15, 13], sq: 0.42, base: 6, fill: Nk(T.hF[0]), line: Nk(T.hF[1]) });
        if (T.pyramids) for (const [x0, h] of [[0.3, 14], [0.42, 9], [0.78, 11]]) { const x = WW * x0; pyramid(g, x, hy - far(x) + 2.5, h, 1.05, Nk('#fbe6b4'), Nk('#ecca8c'), Nk('#c8a46e')); }
        if (T.gumdrops) for (let i = 0; i < WW / 22; i++) { const q = hash(i * 7 + 2), x = i * 22 + q % 12, cols = [['#ff9ec4', '#e884ac'], ['#a8e88a', '#88cc70'], ['#9fd0ff', '#80b4ec'], ['#fff08a', '#ead070']][q % 4]; blob(g, x, hy - far(x) + 1, 3.4, 3, [mix(cols[0], '#ffffff', 0.5), cols[0], cols[1]].map(Nk), Nk(mix(cols[1], '#6a4a6a', 0.4)), { cut: hy - far(x) + 1.5 }); }
        if (T.trees) for (let i = 0; i < WW / 26; i++) { const q = hash(i * 11 + 9), x = i * 26 + q % 16; puffTree(g, x, hy - far(x) + 1.5, 2.6 + (q >>> 6) % 2, T.trees.map(Nk), Nk(mix(T.trees[1], '#3a5a4a', 0.4))); }
        bumps(g, hy, { seed: 7, per: 26, r: [12, 10], sq: 0.3, base: 2, fill: Nk(T.hN[0]), line: Nk(T.hN[1]) });
      }
    }
  }
  // a cute rounded volcano: a soft bell-shaped cone, a lava cap with rounded drips and puffy smoke
  function cone(g, hy, T, cx, H, small) {
    const C = T.cone, L = T.lava, cw = H * 0.16, sw = H * (small ? 0.95 : 1.05);
    const hAt = x => { const d = Math.abs(x - cx); if (d <= cw) return H; const u = Math.min(1, (d - cw) / sw); return H * (1 - u * u * (3 - 2 * u)); };
    let hp = hAt(cx - cw - sw - FP);
    for (let x = fsnap(cx - cw - sw); x < cx + cw + sw; x += FP) {
      const h = hAt(x), hn = hAt(x + FP); if (h <= 0.2) { hp = h; continue; }
      const top = fsnap(hy - h), low = Math.min(hy, Math.max(top + FP, fsnap(hy - Math.min(hp, hn))));
      px(g, x, top, FP, hy - top, x > cx + cw * 0.6 ? C[1] : C[0]); px(g, x, top, FP, low - top, C[2]); hp = h;
    }
    const ty = hy - H;
    // a lava cap like icing on a cake: it follows the cone's top and ends in round scalloped drips
    const capD = Math.max(1.4, H * 0.16), dripW = Math.max(2.2, H * 0.12), dripL = small ? 0 : Math.max(1.2, H * 0.14);
    for (let x = fsnap(cx - cw - sw * 0.55); x < cx + cw + sw * 0.55; x += FP) {
      const h = hAt(x + FP / 2); if (h < H - capD - dripL - 1) continue;
      const u = (x - cx) / dripW, drip = dripL * Math.max(0, Math.cos(u * Math.PI)) * (Math.abs(u) < 2.6 ? 1 : 0.4), bot = Math.min(hy, hy - H + capD + drip), top = fsnap(hy - h);
      if (bot <= top + FP) continue;
      px(g, x, top, FP, fsnap(bot) - top, x > cx + cw * 0.6 ? L[2] : L[1]); px(g, x, fsnap(bot), FP, FP, C[2]);
      if (x < cx - cw * 0.2 && x > cx - cw - 1) px(g, x, top + FP, FP, FP, L[0]);
    }
    fell(g, cx, ty + 0.5, cw * 0.8 + 0.4, 0.9, C[2]); fell(g, cx, ty + 0.5, cw * 0.8, 0.6, L[0]);
    const sm = ['#fbf6ff', '#e6dcef', '#c8b8d6'];
    for (const [dx, dy, r] of small ? [[1, -4, 2], [3, -8, 2.8]] : [[1, -5, 3], [5, -11, 4], [2, -19, 5]]) blob(g, cx + dx, ty + dy, r, r * 0.85, sm, '#a898b8');
  }
  // the Lost City's golden step temple
  function ziggurat(g, hy, T, cx, H) {
    const G = T.gold, line = mix(G[2], '#7a5a3a', 0.35), steps = 4, sh = H / (steps + 0.6);
    for (let i = 0; i < steps; i++) { const w = H * 0.95 - i * H * 0.2, y = hy - (i + 1) * sh; box(g, cx - w, y, w * 2, sh + 0.5, G[1], G[2], line, 0.8); px(g, fsnap(cx - w + 0.6), fsnap(y + 0.6), w * 2 - 1.2, FP, G[0]); }
    const ty = hy - steps * sh; box(g, cx - 3.5, ty - sh * 0.9, 7, sh * 0.9 + 0.5, G[1], G[2], line, 1); box(g, cx - 1.2, ty - sh * 0.6, 2.4, sh * 0.6 + 0.2, mix(G[2], '#8a6a4a', 0.4), null, line, 1);
    for (let y = ty + 1; y < hy; y += 1.2) run(g, cx - 1.6, cx + 1.6, fsnap(y), y % 2.4 < 1.2 ? G[0] : G[1]); // the stair up the middle
    fell(g, cx, ty - sh * 0.9 - 2.2, 1.8, 1.8, line); fell(g, cx, ty - sh * 0.9 - 2.2, 1.3, 1.3, '#ff9fc0'); px(g, fsnap(cx - 0.6), fsnap(ty - sh * 0.9 - 2.9), FP, FP, '#ffffff');
  }
  // a flat-topped desert mesa with rounded corners, a sandstone stripe and a shaded right side
  function mesa(g, hy, cx, w, h, M, line, stripes) {
    const r = Math.min(3, h * 0.35);
    for (let x = fsnap(cx - w - 2); x < cx + w + 2; x += FP) {
      const d = Math.abs(x + FP / 2 - cx), e = w - d; if (e <= 0) continue;
      const hh = e >= r ? h : h - r + Math.sqrt(Math.max(0, r * r - (r - e) * (r - e))) * 1, foot = e < 1.2 ? (1.2 - e) * 2 : 0, top = fsnap(hy - hh + foot);
      px(g, x, top, FP, hy - top, x > cx + w * 0.45 ? M[1] : M[0]);
      if (stripes) { const sy = fsnap(hy - h * 0.55); if (sy > top + 1) px(g, x, sy, FP, FP * 2, x > cx + w * 0.45 ? M[2] : M[1]); }
      px(g, x, top, FP, FP, line); if (e < FP * 1.5) px(g, x, top, FP, hy - top, line);
    }
  }
  // ---- the floor ----
  // a soft checker in perspective: rows get taller toward the front, columns fan out from a vanishing point above the horizon
  function checker(g, hy, cols, o) {
    o = o || {};
    const N = o.rows || 8, cw = o.cw || 20, vy = hy - (WH - hy) * (o.fan || 1.3), cx = WW / 2 + (o.ox || 0), haze = o.haze, nC = cols.length;
    for (let y = hy; y < WH; y += FP) {
      const yc = y + FP / 2, d = (yc - hy) / (WH - hy), r = Math.floor(Math.pow(d, 1 / 1.6) * N), w = cw * (yc - vy) / (WH - vy);
      const hz = haze ? 0.45 * Math.pow(1 - d, 3) : 0;
      let i = Math.floor(-cx / w);
      for (let x0 = cx + i * w; x0 < WW; x0 += w, i++) { const c = cols[((i + r) % nC + nC) % nC]; run(g, Math.max(0, x0), Math.min(WW, x0 + w), y, hz ? mix(c, haze, hz) : c); if (o.grout) run(g, Math.max(0, x0), Math.max(0, x0) + FP, y, o.grout); }
      if (o.grout && Math.floor(Math.pow((yc + FP - hy) / (WH - hy), 1 / 1.6) * N) !== r) px(g, 0, y, WW, FP, o.grout);
    }
  }
  function flower(g, x, y, s, petal, mid) { x = fsnap(x); y = fsnap(y); const q = FP * s; px(g, x - q, y, q, q, petal); px(g, x + q, y, q, q, petal); px(g, x, y - q, q, q, petal); px(g, x, y + q, q, q, petal); px(g, x, y, q, q, mid); }
  function tuft(g, x, y, s, c) { x = fsnap(x); y = fsnap(y); const q = FP; px(g, x - q * 2, y - q * s, q, q * s, c); px(g, x, y - q * (s + 1), q, q * (s + 1), c); px(g, x + q * 2, y - q * s, q, q * s, c); }
  function ground(g, T, hy, G) {
    const gr = T.gr.map(G), dots = T.dots, ty = T.ground, A = gr[0], B = gr[1];
    switch (ty) {
      case 'tiles': checker(g, hy, [A, B], { rows: 8, cw: 22, grout: gr[2], haze: gr[3] }); break;
      case 'stone': checker(g, hy, [A, B], { rows: 7, cw: 18, grout: gr[2], haze: gr[3] }); break;
      case 'dance': checker(g, hy, ['#e8a0da', A, '#92d0f2', B, '#bca4f4', A, '#a8e4cc', B].map(G), { rows: 7, cw: 18, grout: gr[2], fan: 1.1, haze: gr[3] }); break;
      case 'rock': case 'basalt': checker(g, hy, [A, B], { rows: 7, cw: 24, haze: gr[3] }); break;
      case 'cloud': px(g, 0, hy, WW, WH - hy, A); break;
      default: checker(g, hy, [A, B], { rows: 8, cw: ty === 'sand' || ty === 'snow' || ty === 'dust' || ty === 'redrock' ? 26 : 20, haze: gr[3] });
    }
    px(g, 0, hy, WW, FP, gr[2]);
    if (ty === 'lawn') { px(g, 0, hy, WW, 2.5, G('#eceef6')); px(g, 0, hy + 2.5, WW, FP, G('#c8ccdc')); for (let x = 3; x < WW; x += 9) px(g, x, hy + FP, FP, 2.5 - FP, G('#d4d8e6')); }
    if (ty === 'cloud') { // rows of puffy cloud tops, bigger nearer the front
      for (let row = 0, y = hy + 5; y < WH + 6; row++, y += 7 + row * 3) {
        const r = 3 + row, step = r * 2 + 3;
        for (let x = (row % 2) * Math.round(step / 2) - r, j = 0; x < WW + r; x += step, j++) { const q = hash(row * 97 + j * 13), rr = r + 1 + (q % 3) * 0.6; blob(g, x + (q >>> 4) % 3 - 1, y + ((q >>> 6) % 3 - 1) * 0.5, rr + 0.8, rr * 0.72, ['#ffffff', '#ffffff', '#e6edfb'], '#dbe4f6', { shade: 0.34, hl: false }); }
      }
      return;
    }
    const n = Math.round(WW * (WH - hy) / 120);
    for (let i = 0; i < n; i++) {
      const h = hash(i * 131 + 17), x = (h % 1000) / 1000 * WW, y = hy + 4 + ((h >>> 10) % 1000) / 1000 * (WH - hy - 5), d = (y - hy) / (WH - hy), v = (h >>> 20) % 9, s = d > 0.45 ? 2 : 1;
      switch (ty) {
        case 'grass': case 'lawn': case 'glow': case 'fern':
          if (ty === 'glow') { if (v < 3) sparkle(g, x, y, G(dots[v % dots.length]), v === 0); else if (v < 5) tuft(g, x, y, s, gr[2]); break; }
          if (ty === 'fern' && v < 2) { for (let j = -2; j <= 2; j++) { const a = -Math.PI / 2 + j * 0.45, L = 1.6 + s * 0.8 - Math.abs(j) * 0.3; for (let u = 0; u < L; u += FP) px(g, fsnap(x + Math.cos(a) * u), fsnap(y + Math.sin(a) * u), FP, FP, gr[2]); } break; }
          if (v < 3) tuft(g, x, y, s, gr[2]); else if (v < 5) flower(g, x, y, s, G(dots[(h >>> 5) % 2 ? 0 : 2]), G(dots[1])); break;
        case 'sand': case 'dust':
          if (v < 2) { const c = G(dots[v + 1] || dots[0]); fell(g, x, y, 0.8 * s, 0.55 * s, mix(c, '#7a5a4a', 0.25)); fell(g, x, y - FP * 0.5, 0.8 * s - FP, 0.55 * s - FP * 0.5, c); }
          else if (v === 2) sparkle(g, x, y, G('#fff8ea'));
          else if (v === 3 && ty === 'dust') tuft(g, x, y, s, G(dots[0]));
          else if (v === 3) for (let j = 0; j < 5; j++) { const a = j * Math.PI * 0.4 - Math.PI / 2; px(g, fsnap(x + Math.cos(a) * FP * 2 * s), fsnap(y + Math.sin(a) * FP * 2 * s), FP, FP, G('#ffb0a0')); }
          break;
        case 'snow': if (v < 3) sparkle(g, x, y, G(dots[0]), v === 0); else if (v < 5) run(g, x, x + 2 + s, fsnap(y), gr[2]); break;
        case 'candy': if (v < 5) { const c = G(dots[(h >>> 5) % dots.length]); if ((h >>> 9) % 2) px(g, fsnap(x), fsnap(y), FP * 2 * s, FP * s, c); else px(g, fsnap(x), fsnap(y), FP * s, FP * 2 * s, c); } break;
        case 'rock': if (v < 2) { fell(g, x, y, 2 + s, 0.7 + s * 0.3, G('#b8c8ec')); sparkle(g, x - 0.5, y - 0.2, G('#eef4ff')); } else if (v < 4) fell(g, x, y, 0.8 * s, 0.5 * s, gr[2]); break;
        case 'basalt': if (v === 0) { fell(g, x, y, 1.6 + s * 0.6, 0.6 + s * 0.3, gr[2]); fell(g, x, y - FP * 0.5, 1.2 + s * 0.6, 0.4 + s * 0.25, T.lava[1]); fell(g, x - 0.4, y - FP, 0.6 + s * 0.2, 0.2 + s * 0.1, T.lava[0]); } else if (v < 3) fell(g, x, y, 0.8 * s, 0.5 * s, gr[2]); break;
        case 'redrock': if (v < 3) fell(g, x, y, 0.9 * s, 0.55 * s, gr[2]); else if (v === 3) sparkle(g, x, y, G(dots[0])); break;
        case 'stone': case 'tiles': if (v < 2 && ty === 'stone') tuft(g, x, y, s, G('#9cd6a0')); break;
        case 'dance': if (v < 2) sparkle(g, x, y, G(dots[v]), true); break;
      }
    }
  }
  function drawBg(night) {
    const T = THEMES[V.area] || THEMES.meadow, g = bgx, hy = HY(), K = PX.SCENE_K;
    if (T.fixed) night = 0;
    const k = T.theme === 'night' ? night * 0.4 : night * 0.85, Nk = c => nightOf(c, k * 0.85);
    bgC.width = WW * K; bgC.height = WH * K; g.setTransform(K, 0, 0, K, 0, 0); g.imageSmoothingEnabled = false; // (render() draws it back at WW x WH)
    g.clearRect(0, 0, WW, WH);
    // a smooth pastel sky
    for (let y = 0; y < hy; y += FP) { const u = Math.min(2.999, y / Math.max(1, hy) * 3), i = Math.floor(u); px(g, 0, y, WW, FP, mix(mix(T.sky[i], T.sky[i + 1], u - i), mix(NIGHT_SKY[i], NIGHT_SKY[i + 1], u - i), k)); }
    if (T.stars || night > 0.35) {
      const sa = T.stars ? 1 : clamp((night - 0.35) / 0.4, 0, 1);
      for (let i = 0; i < 26; i++) { const h = hash(i * 7 + 3); if (h % 3 && sa < 0.7) continue; sparkle(g, (h % 997) / 997 * WW, 2 + ((h >>> 8) % 997) / 997 * Math.max(1, hy - 10), (h >>> 3) % 3 ? '#e6e8ff' : '#fff4b0', (h >>> 5) % 5 === 0); }
    }
    const sunny = (T.sun || !T.fixed) && !T.moon && night < 0.5 && T.far !== 'walls' && T.far !== 'stage';
    if (T.moon || (night > 0.5 && !T.fixed)) { const m = moonSpr(); if (m) PX.blit(g, m, Math.round(WW * 0.5), Math.round(hy * 0.32) + 9); }
    else if (T.sun === 'big') { const s = sunSpr(true); if (s) PX.blit(g, s, Math.round(WW * (T.sunX || 0.36)), Math.round(hy * 0.5) + 15); }
    else if (sunny) { const s = sunSpr(false); if (s) PX.blit(g, s, Math.round(WW * (T.sunX || 0.62)), Math.round(hy * 0.26) + 11); }
    farBand(g, T, hy, Nk, k);
    // the floor, then its edge props, then the two pads
    const G = c => nightOf(c, k * 0.8);
    ground(g, T, hy, G);
    const theme = T.theme || (night > 0.5 ? 'night' : 'day');
    if (T.pines) for (const [kind, x, dy] of [['pine', 6, 4], ['pine2', 15, 2], ['pine', WW - 7, 5], ['pine3', Math.round(WW * 0.46), 1]]) { const c = bprop(kind); if (c) PX.blit(g, c, x, hy + dy); }
    for (const [kind, fx0, flip, dy] of T.props || []) {
      const c = bprop(kind, theme); if (!c) continue;
      g.save(); if (night > 0.3 && T.theme !== 'night') g.filter = `brightness(${1 - night * 0.15})`;
      PX.blit(g, c, propX(kind, c, fx0), hy + 3 + (dy || 0), flip === 1); g.restore();
    }
    for (const side of ['o', 'p']) {
      const s = spot(side), big = side === 'o' && V.boss, wild = side === 'o' && V.wild, rx = big ? 32 : wild ? 12 : side === 'o' ? 18 : 22, ry = big ? 6 : wild ? 3 : side === 'o' ? 4 : 5;
      blob(g, s.x, s.y - 1, rx, ry, T.pad.map(G), INK, { lw: 2, shade: 0.26 });
      run(g, s.x - rx * 0.55, s.x + rx * 0.2, fsnap(s.y - 1 - ry * 0.55), G(T.pad[0]));
    }
    if (night > 0.02 && T.theme !== 'night' && !T.fixed) { g.fillStyle = `rgba(90,100,190,${0.07 * night})`; g.fillRect(0, hy, WW, WH - hy); }
  }

  const img = (c, x, y) => lx.drawImage(c, x, y, PX.artW(c), PX.artH(c)); // an art canvas (hi-res) at its art size
  const tintCache = new WeakMap();
  function whiteOf(c) {
    let w = tintCache.get(c); if (w) return w;
    w = document.createElement('canvas'); w.width = c.width; w.height = c.height; const x = w.getContext('2d');
    x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#ffffff'; x.fillRect(0, 0, w.width, w.height);
    PX.keepK(c, w); tintCache.set(c, w); return w;
  }
  // big boss sprite (whole-pixel scaled) and its glowing charge aura
  const bigCache = {};
  function bigCritter(id, S, f) {
    const key = id + S + ':' + (f || 0); if (bigCache[key]) return bigCache[key];
    const c = PX.critter(id, f || 0), o = document.createElement('canvas'); o.width = c.width * S; o.height = c.height * S;
    const x = o.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, o.width, o.height);
    return (bigCache[key] = PX.keepK(c, o));
  }
  const auraCache = {};
  function auraOf(c, col, key) {
    if (auraCache[key]) return auraCache[key];
    const k = c.k || 1, o = document.createElement('canvas'); o.width = c.width + 6 * k; o.height = c.height + 6 * k; const x = o.getContext('2d'); // (3 art px all round)
    const w = whiteOf(c); for (const [dx, dy] of [[0, 3], [6, 3], [3, 0], [3, 6], [1, 1], [5, 1], [1, 5], [5, 5]]) x.drawImage(w, dx * k, dy * k);
    x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, o.width, o.height);
    x.globalCompositeOperation = 'destination-out'; x.drawImage(c, 3 * k, 3 * k);
    return (auraCache[key] = PX.keepK(c, o));
  }
  function poseFor(side) {
    const A = V.a[side], f = V.b[side], d = V.disp[side];
    if (A.pose) return A.pose;
    if (A.win) return { arms: 'up', eyes: 'happy', mouth: 'open', frame: Math.floor(V.t * 4) % 2 };
    if (d.status === 'sleep') return { eyes: 'closed', mouth: 'flat' };
    if (d.stun) return { eyes: 'sad', mouth: 'o' };
    if (V.phase === 'end' && V.b.winner !== side) return { eyes: 'closed', mouth: 'o' };
    if (d.hp / f.max < 0.25) return { eyes: 'sad', mouth: 'flat' };
    if (V.boss && side === 'p' && d.hp / f.max >= 0.25 && V.disp.o.charging) return { eyes: 'brave', mouth: 'o' };
    if (A.blinkAt - V.t < 0.13) return { eyes: 'blink' };
    return {};
  }
  function sprigFor(side) {
    const f = V.b[side], A = V.a[side], P = poseFor(side), k = `${P.eyes || ''}|${P.mouth || ''}|${P.arms || ''}|${P.frame || 0}`;
    const m = A.memo || (A.memo = {});
    return m[k] || (m[k] = safe(() => PX.sprig(f.look, P), null));
  }
  const live = () => V && (V.phase === 'choose' || V.phase === 'play' || V.phase === 'intro' || V.phase === 'pass');
  function drawFighter(side) {
    const f = V.b[side], A = V.a[side], sp = spot(side), dir = side === 'p' ? 1 : -1, boss = side === 'o' && V.boss, crit = side === 'o' && !!f.critter;
    let spr, ax, ay, flip;
    const pf = boss && !A.fainting ? Math.floor(V.t * 2) % 2 : 0; // Zombosses have 2 frames
    if (crit) { spr = safe(() => bigCritter(f.critter, critScale(), pf), null); if (!spr) return; ax = Math.floor(PX.artW(spr) / 2); ay = PX.artH(spr); flip = true; }
    else { if (!f.look) return; spr = sprigFor(side); if (!spr) return; ax = PX.SPRIG_AX || 16; ay = PX.artH(spr) - 1; flip = side === 'o'; } // art faces right
    let x = sp.x, y = sp.y;
    const bob = V.phase !== 'end' && !A.fainting && Math.floor(V.t * (boss ? 1.3 : 2) + (side === 'o' ? 1 : 0)) % 2 ? -1 : 0;
    y += bob;

    if (A.enter > 0) { if (boss) y -= Math.round(ease(A.enter) * WH); else { x -= dir * Math.round((1 - ease(1 - A.enter)) * (WW * 0.55)); y -= Math.round(Math.abs(Math.sin(A.enter * Math.PI * 3)) * 4 * A.enter); } }
    const reach = boss ? 20 : 12;
    if (A.lunge > 0) { const k = 1 - A.lunge, l = k < 0.35 ? k / 0.35 : 1 - (k - 0.35) / 0.65; x += dir * Math.round(reach * l); y -= Math.round((boss ? 8 : 4) * Math.sin(Math.PI * clamp(k / 0.5, 0, 1))); }
    if (A.hop > 0) y -= Math.round(6 * Math.sin(Math.PI * (1 - A.hop)));
    if (A.recoil > 0) x -= dir * Math.round(2 * A.recoil); // kicks back when it shoots
    if (A.move) { // dashes over to bite/bonk, or leaps over and slams down
      const M = A.move, k = clamp(M.t / M.life, 0, 1), tx = M.tx - sp.x, ty = M.ty - sp.y;
      if (M.kind === 'dash') { const l = k < 0.45 ? ease(k / 0.45) : k < 0.6 ? 1 : 1 - ease((k - 0.6) / 0.4); x += Math.round(tx * l); y += Math.round(ty * l); }
      else { const l = k < 0.53 ? Math.pow(k / 0.53, 1.6) : k < 0.66 ? 1 : 1 - ease((k - 0.66) / 0.34); x += Math.round(tx * l); y += Math.round(ty * l - (k < 0.53 ? Math.sin(Math.PI * k / 0.53) * M.h : 0)); }
    }
    if (A.win) y -= Math.round(Math.abs(Math.sin(V.t * 7)) * (boss ? 3 : 5));
    if (A.dodge > 0) x -= dir * Math.round(7 * Math.sin(Math.PI * (1 - A.dodge)));
    if (A.shake > 0) x += Math.round(Math.sin(V.t * 70) * 2);
    if (boss && V.disp.o.charging && !A.fainting && live() && !calm()) x += Math.round(Math.sin(V.t * 40));
    let alpha = 1;
    if (A.fainting) { alpha = 1 - ease(A.fainting); y += Math.round(ease(A.fainting) * (boss ? 14 : 7)); }
    if (alpha <= 0.02) return;
    // shadow
    const sw = crit ? PX.artW(spr) * 0.36 : 9;
    const sh = A.fainting ? 0 : clamp(Math.round((sp.y - y) / (boss ? 6 : 1)), 0, 8);
    lx.fillStyle = 'rgba(58,45,52,.2)'; lx.fillRect(Math.round(x - sw + sh), sp.y - 1, Math.round(sw * 2 + 1 - sh * 2), 2);
    lx.globalAlpha = alpha;
    // glowing aura while a boss charges its giant attack
    if (boss && V.disp.o.charging && !A.fainting && live()) {
      const au = auraOf(spr, '#fbf236', 'a' + f.critter + bossScale()), au2 = auraOf(spr, '#df5a26', 'b' + f.critter + bossScale());
      PX.blit(lx, Math.floor(V.t * 8) % 2 ? au : au2, x, y + 3, flip, ax + 3, ay + 3);
    }
    PX.blit(lx, spr, x, y, flip, ax, ay);
    if (A.flash > 0 && Math.floor(A.flash * 30) % 2 === 0) PX.blit(lx, whiteOf(spr), x, y, flip, ax, ay);
    lx.globalAlpha = 1;
    const em = A.emote || (V.disp[side].status === 'sleep' ? 'zz' : V.disp[side].stun ? 'swirl' : null);
    if (em && !A.fainting) { const e = safe(() => PX.emote(em), null); if (e) PX.blit(lx, e, x + (crit ? -Math.round(PX.artW(spr) * 0.3) : 7), y - (crit ? PX.artH(spr) - 4 : 26) - (Math.floor(V.t * 3) % 2), false, 0, e.height); }
  }
  function drawCrowd() {
    for (const c of V.crowd) {
      const spr = safe(() => PX.critter(c.kind), null); if (!spr) continue;
      const bob = Math.floor(V.t * 1.5 + c.ph) % 2 ? 0 : -1, hop = c.hop > 0 ? Math.round(Math.sin(Math.PI * (1 - c.hop)) * 5) : 0;
      PX.blit(lx, spr, c.x, c.y + bob - hop, c.flip);
    }
  }
  function drawRing(r) {
    if (r.t < 0) return;
    const k = r.t / r.life, rad = 2 + ease(k) * r.r;
    lx.globalAlpha = 1 - k; lx.fillStyle = r.color;
    const n = Math.max(12, Math.round(rad * 3));
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; lx.fillRect(Math.round(r.x + Math.cos(a) * rad), Math.round(r.y + Math.sin(a) * rad * 0.7), 1, 1); }
    lx.globalAlpha = 1;
  }
  function drawBeam(bm) {
    const k = bm.t / bm.life, grow = clamp(k * 4, 0, 1), fade = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
    const ex = lerp(bm.ax, bm.bx, grow), ey = lerp(bm.ay, bm.by, grow), len = Math.hypot(ex - bm.ax, ey - bm.ay), n = Math.ceil(len);
    lx.globalAlpha = fade;
    for (let i = 0; i <= n; i++) {
      const t = i / Math.max(1, n), x = Math.round(lerp(bm.ax, ex, t)), y = Math.round(lerp(bm.ay, ey, t)), w = bm.w + (Math.floor(V.t * 30 + i) % 3 === 0 ? 1 : 0);
      lx.fillStyle = bm.c[2]; lx.fillRect(x, y - w, 1, w * 2 + 1);
      lx.fillStyle = bm.c[1]; lx.fillRect(x, y - w + 1, 1, Math.max(1, w * 2 - 1));
      lx.fillStyle = bm.c[0]; lx.fillRect(x, y - Math.floor(w / 2), 1, Math.max(1, w));
    }
    lx.globalAlpha = 1;
  }
  function drawBolt(b) {
    let x = b.x, y = 0; const r = srng(b.seed), hy = HY();
    lx.globalAlpha = 1 - b.t / 0.35; lx.fillStyle = '#ffffff';
    while (y < hy - 6) { const nx = x + Math.round((r() - 0.5) * 6), ny = y + 3 + Math.round(r() * 3); for (let i = 0; i <= ny - y; i++) lx.fillRect(Math.round(lerp(x, nx, i / (ny - y))), y + i, 1, 1); x = nx; y = ny; }
    lx.globalAlpha = 1;
  }
  function render() {
    if (!cssW) return;
    const night = safe(() => PS.clock.night(), 0), T = THEMES[V.area] || THEMES.meadow;
    // (the area only changes in launch(), which resets bgKey)
    const key = (T.fixed ? 0 : Math.round(night * 30)) + (V.boss ? 40 : 0) + (V.wild ? V.wild.step + 1 : 0) * 100 + WW * 1e3 + WH * 1e6;
    if (key !== bgKey) { bgKey = key; drawBg(night); }
    lx.setTransform(PX.SCENE_K, 0, 0, PX.SCENE_K, 0, 0); lx.imageSmoothingEnabled = false;
    lx.clearRect(0, 0, WW, WH);
    lx.drawImage(bgC, 0, 0, WW, WH); // (bgC is painted at SCENE_K buffer pixels per world pixel)
    const nk = T.fixed ? 0 : night;
    if (T.clouds && nk < 0.8) { lx.globalAlpha = 1 - nk * 0.7; for (const c of V.clouds) img(icons().clouds[c.k], Math.round(c.x), Math.round(c.y)); lx.globalAlpha = 1; }
    if (T.darkClouds) for (const c of V.clouds) img(icons().darkclouds[c.k], Math.round(c.x), Math.round(c.y * 0.6));
    if (T.stars) for (let i = 0; i < 6; i++) { const h = hash(i * 97 + 1), on = Math.floor(V.t * 1.5 + i) % 3 === 0; if (on) px(lx, h % WW, (h >>> 7) % Math.max(1, HY() - 8), 1, 1, '#ffffff'); }
    if (V.bolt) drawBolt(V.bolt);
    if (T.torches && V.torches) for (const t of V.torches) { const f = Math.floor(V.t * 10 + t.x) % 3; px(lx, t.x - 1, t.y + 2, 3, 3, '#c8a284'); px(lx, t.x - 1, t.y - 1 - (f === 1 ? 1 : 0), 3, 3, '#ff9486'); px(lx, t.x, t.y - 2 - f % 2, 1, 3, '#fff09a'); if (f === 2) px(lx, t.x + (f - 1), t.y - 4, 1, 1, '#ffbc7e'); }
    drawCrowd();
    drawFxAll('back');
    if (V.a.o.move) { drawFighter('p'); drawFighter('o'); } else { drawFighter('o'); drawFighter('p'); } // whoever is dashing over goes in front
    for (const bm of V.beams) drawBeam(bm);
    drawFxAll('front');
    for (const p of V.parts) {
      if (p.delay > 0 || !p.spr) continue;
      if (p.blink && ((V.t * 18 + p.blink) | 0) % 3 === 0) continue; // embers flicker, sparkles twinkle
      lx.globalAlpha = clamp(p.life * 3, 0, 1);
      img(p.spr, Math.round(p.x - PX.artW(p.spr) / 2), Math.round(p.y - PX.artH(p.spr) / 2));
    }
    lx.globalAlpha = 1;
    for (const r of V.rings) drawRing(r);
    for (const p of V.amb) {
      if (p.blink && Math.floor(V.t * 3 + p.x) % 3 === 0) continue;
      lx.globalAlpha = p.alpha || (p.fade ? clamp(p.life / 3, 0, 1) : 1); lx.fillStyle = p.c; lx.fillRect(Math.round(p.x), Math.round(p.y), p.w, p.h);
    }
    lx.globalAlpha = 1;
    if (V.flashT > 0) { lx.globalAlpha = clamp(V.flashT / (V.flashL || 0.3), 0, 1) * (V.flashA || 0.7); lx.fillStyle = V.flashC; lx.fillRect(0, 0, WW, WH); lx.globalAlpha = 1; }
    if (V.boss && V.disp.o.charging && live()) { lx.globalAlpha = calm() ? 0.1 : 0.1 + 0.08 * Math.sin(V.t * 8); lx.fillStyle = '#e5535f'; lx.fillRect(0, 0, WW, WH); lx.globalAlpha = 1; } // reduced motion: steady, no pulsing
    // upscale (with screen shake)
    let qx = 0, qy = 0;
    if (V.quake > 0) { const a = Math.max(1, Math.round(V.quakeA * Math.min(1, V.quake * 2))); qx = Math.round((Math.random() * 2 - 1) * a); qy = Math.round((Math.random() * 2 - 1) * a); }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = INK; ctx.fillRect(0, 0, cv.width, cv.height);
    const sc = SC; // whole-pixel scale: shaking shifts the picture and repeats its edge row/column into the gap (never stretches it)
    ctx.drawImage(lo, qx * sc, qy * sc, WW * sc, WH * sc);
    const K = PX.SCENE_K;
    if (qx > 0) ctx.drawImage(lo, 0, 0, K, WH * K, 0, qy * sc, qx * sc, WH * sc);
    if (qx < 0) ctx.drawImage(lo, (WW - 1) * K, 0, K, WH * K, (WW + qx) * sc, qy * sc, -qx * sc, WH * sc);
    if (qy > 0) ctx.drawImage(lo, 0, 0, WW * K, K, qx * sc, 0, WW * sc, qy * sc);
    if (qy < 0) ctx.drawImage(lo, 0, (WH - 1) * K, WW * K, K, qx * sc, (WH + qy) * sc, WW * sc, -qy * sc);
    // crisp text layer
    ctx.setTransform(dpr, 0, 0, dpr, qx * SC, qy * SC);
    for (const p of V.pops) {
      const k = p.t / p.life, a = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1, up = ease(Math.min(1, k * 2.2)) * 14;
      const s = k < 0.12 ? 0.6 + k / 0.12 * 0.5 : k < 0.2 ? 1.1 - (k - 0.12) / 0.08 * 0.1 : 1;
      ctx.globalAlpha = a;
      const tx = Math.round(p.x * WPX), ty = Math.round((p.y - up) * WPX);
      bigText(p.text, tx, ty, Math.round(p.size * s), p.color);
      if (p.tag) bigText(p.tag, tx, Math.round(ty - p.size * 0.95), 13, p.color);
      ctx.globalAlpha = 1;
    }
    if (V.banner) {
      const b = V.banner, k = b.t / b.life, a = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1, s = k < 0.1 ? 0.5 + k / 0.1 * 0.6 : k < 0.16 ? 1.1 - (k - 0.1) / 0.06 * 0.1 : 1;
      const y = cssH * (V.boss ? 0.47 : 0.36), size = Math.round(Math.min(40, cssW / Math.max(6, b.text.length * 0.62)) * s);
      ctx.globalAlpha = a;
      bigText(b.text, Math.round(cssW / 2), Math.round(y), size, b.color);
      if (b.sub) bigText(b.sub, Math.round(cssW / 2), Math.round(y) + 24, 16, '#ffffff');
      ctx.globalAlpha = 1;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // log typewriter
    const nShown = Math.floor(V.log.shown);
    if (nShown !== V.log.drawn || V.log.full !== V.log.drawnFull) {
      if (V.log.full !== V.log.drawnFull) logEl.classList.toggle('long', V.log.full.length > 62);
      V.log.drawn = nShown; V.log.drawnFull = V.log.full; logEl.firstChild.textContent = V.log.full.slice(0, nShown);
    }
    const noMore = !(V.phase === 'play' || V.phase === 'intro' || V.phase === 'end') || V.log.shown < V.log.full.length;
    if (logEl.lastChild.hidden !== noMore) logEl.lastChild.hidden = noMore;
  }
  // Readable canvas text: the title font (Luckiest Guy) only for big words without digits (its 2/8 and 5/S look alike);
  // everything else in rounded Nunito, a little larger, with a thinner outline so small letters stay open.
  function bigText(text, x, y, size, col) {
    const pixel = size >= 24 && !/\d/.test(text);
    if (!pixel) size = Math.max(15, Math.round(size * 1.08));
    ctx.font = pixel ? `400 ${size}px "Luckiest Guy", sans-serif` : `800 ${size}px "Nunito", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round'; ctx.lineWidth = pixel ? Math.max(4, size / 6) : Math.max(3, Math.round(size / 5.5)); ctx.strokeStyle = INK; ctx.strokeText(text, x, y);
    ctx.fillStyle = col; ctx.fillText(text, x, y);
  }

  function frame(dt) {
    if (V) {
      // The hand-over screen covers the arena completely, and the results card freezes it (its last frame stays
      // behind the dimmed card): no need to redraw the full-resolution canvas 60 times a second.
      if (V.phase === 'pass' || V.phase === 'results') return;
      sizeCheckT -= dt;
      if (sizeDirty || sizeCheckT <= 0) { sizeDirty = false; sizeCheckT = 0.5; resize(); }
      update(dt);
      if (V) render();
      return;
    }
    // hub: idle bob of the partner sprite
    if (hubSprite && hubEl && !hubEl.hidden) {
      hubT += dt; const f = Math.floor(hubT * 1.6) % 4;
      if (f !== hubFrame) { hubFrame = f; const s = partner(); if (s) PS.ui.drawSproutTo(hubSprite, s, f === 3 ? { eyes: 'blink' } : { frame: f % 2 }); }
    }
  }

  PS.scenes.battle = { mount, show, hide, frame };
  Object.assign(window.__battle, { start: startBattle, startBoss, startTowerFloor, towerBegin, towerEnd, startFriend, renderHub, forfeit, extra, choose,
    tab: t => { hubTab = t; renderHub(); } });
  Object.defineProperty(window.__battle, 'V', { get: () => V });
})();
