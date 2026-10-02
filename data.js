// data.js — all PVZ Garden content and balance numbers. Rules live in state.js; this file is pure data.
// Every tunable number is here so balance can change without touching game code.
// Words: a "plant" is the player's creature (the save calls them `sprouts`), a "seed packet" waits in the garden to be
// planted (the save calls them `eggs`), an "element" is collected as 3 shards that make one core.
(function () {
  'use strict';

  const STATS = ['swim', 'fly', 'run', 'power', 'stamina'];
  const STAT_META = {
    swim: { label: 'Swim', color: '#2f8fd0' },
    fly: { label: 'Fly', color: '#9a6ad0' },
    run: { label: 'Run', color: '#df7126' },
    power: { label: 'Power', color: '#d24552' },
    stamina: { label: 'Stamina', color: '#2b8243' },
  };

  // ---------- Types (battle). strong: this type deals x1.5 to those; the reverse deals x0.75 ----------
  const ELEMENTS = {
    plant: { label: 'Plant', color: '#4fae3a', strong: ['water', 'rock'] },
    fire: { label: 'Fire', color: '#df5a26', strong: ['plant', 'ice', 'robot'] },
    water: { label: 'Water', color: '#2f8fd0', strong: ['fire', 'rock'] },
    ice: { label: 'Ice', color: '#3fb4d8', strong: ['plant', 'magic'] },
    electric: { label: 'Electric', color: '#d8a800', strong: ['water', 'robot'] },
    laser: { label: 'Laser', color: '#e8336a', strong: ['robot', 'dark'] },
    poison: { label: 'Poison', color: '#9a4ad0', strong: ['plant', 'normal'] },
    magic: { label: 'Magic', color: '#d860c0', strong: ['dark', 'poison'] },
    dark: { label: 'Dark', color: '#5e3a8e', strong: ['magic', 'laser'] },
    rock: { label: 'Rock', color: '#8c7a5e', strong: ['fire', 'electric', 'ice'] },
    robot: { label: 'Robot', color: '#6e7a96', strong: ['rock', 'ice'] },
    normal: { label: 'Normal', color: '#8c93a8', strong: [] },
  };

  // ---------- Moves ----------
  // pow: base power (0 = no damage). acc: 0..1. fx (all optional):
  //   hits:n (multi-hit, pow per hit) · drain:0..1 (heal that share of damage) · heal:0..1 (heal share of max HP)
  //   buff:{stat,n} on self · debuff:{stat,n} on target (stat: atk|def|spd|eva|acc, n stages; either may also be an array of these)
  //   status:{type:'stun'|'poison'|'burn'|'sleep', chance} · recoil:0..1 of damage dealt · first:true (always goes first)
  //   sure:true (ignores dodge) · cleanse:true (remove own status) · crit:0..1 extra crit chance · once:true (usable once per battle)
  const M = (name, el, pow, acc, fx, desc) => ({ name, el, pow, acc, fx: fx || {}, desc });
  const MOVES = {
    // ----- plant roles: every plant of a role shares these (2 per stage) -----
    // shooter
    seedspit: M('Seed Spit', 'plant', 16, 0.95, { hits: 3 }, 'Spits three little seeds.'),
    sprouthide: M('Leaf Hide', 'plant', 0, 1, { buff: { stat: 'eva', n: 1 }, heal: 0.15 }, 'Hides behind its leaves. Heals a little and raises Dodge.'),
    steadyaim: M('Steady Aim', 'normal', 0, 1, { buff: [{ stat: 'atk', n: 1 }, { stat: 'acc', n: 1 }] }, 'Aims carefully. Raises Attack and Aim.'),
    thornshot: M('Thorn Shot', 'plant', 55, 0.95, { crit: 0.2 }, 'A sharp thorn. Crits often.'),
    rapidfire: M('Rapid Fire', 'plant', 0, 1, { buff: { stat: 'spd', n: 2 } }, 'Gets ready to fire fast. Sharply raises Speed.'),
    leafstorm: M('Leaf Storm', 'plant', 85, 0.9, {}, 'A whirlwind of sharp leaves.'),
    // support
    sunbeam: M('Sun Beam', 'plant', 45, 0.95, {}, 'A warm beam of sunshine.'),
    sunsnack: M('Sun Snack', 'plant', 0, 1, { heal: 0.3 }, 'Soaks up the sun to heal.'),
    sunburst: M('Sun Burst', 'plant', 65, 0.95, {}, 'A bright burst of sunlight.'),
    warmglow: M('Warm Glow', 'plant', 0, 1, { heal: 0.25, buff: { stat: 'def', n: 1 } }, 'Heals and raises Defense.'),
    solarflare: M('Solar Flare', 'fire', 90, 0.9, {}, 'A blazing flare of sunshine.'),
    sunshield: M('Sun Shield', 'plant', 0, 1, { buff: { stat: 'def', n: 2 }, cleanse: true }, 'Sharply raises Defense and clears status.'),
    // melee
    nibble: M('Nibble', 'plant', 35, 1, { first: true }, 'Tiny bites. Goes first.'),
    leafjab: M('Leaf Jab', 'plant', 45, 0.95, { crit: 0.15 }, 'A quick leafy jab. Crits often.'),
    bigbite: M('Big Bite', 'plant', 65, 0.95, {}, 'A big, crunchy bite.'),
    snaproot: M('Snap Root', 'plant', 0, 0.9, { status: { type: 'stun', chance: 0.45 } }, 'Roots grab their feet. May stun.'),
    jawcrush: M('Jaw Crush', 'plant', 85, 0.9, { crit: 0.1 }, 'A mighty crunch.'),
    wildthrash: M('Wild Thrash', 'plant', 30, 0.9, { hits: 3 }, 'Thrashes three times.'),
    // wall
    nutbump: M('Nut Bump', 'rock', 40, 0.95, {}, 'A hard little bump.'),
    hunker: M('Hunker Down', 'rock', 0, 1, { buff: { stat: 'def', n: 2 } }, 'Sharply raises Defense.'),
    shellslam: M('Shell Slam', 'rock', 60, 0.95, {}, 'Slams with its hard shell.'),
    ironbark: M('Iron Bark', 'rock', 0, 1, { buff: { stat: 'def', n: 1 }, heal: 0.25 }, 'Heals and raises Defense.'),
    fortress: M('Fortress', 'rock', 0, 1, { buff: { stat: 'def', n: 3 }, heal: 0.2, once: true }, 'Hugely raises Defense. Once per battle.'),
    bodyslam: M('Body Slam', 'rock', 85, 0.9, { recoil: 0.1 }, 'A heavy slam, a little recoil.'),
    // bomb
    pop: M('Pop!', 'fire', 50, 0.95, {}, 'A small explosion.'),
    fuse: M('Light the Fuse', 'fire', 0, 1, { buff: { stat: 'atk', n: 2 } }, 'Sharply raises Attack.'),
    kaboom: M('Ka-boom!', 'fire', 80, 0.9, { recoil: 0.15 }, 'A big boom, a little recoil.'),
    smokepuff: M('Smoke Puff', 'normal', 0, 1, { debuff: { stat: 'acc', n: 2 } }, 'A cloud of smoke. Sharply lowers Aim.'),
    megablast: M('Mega Blast', 'fire', 105, 0.85, { recoil: 0.2 }, 'A HUGE blast, with recoil.'),
    blastshield: M('Blast Shield', 'fire', 0, 1, { buff: { stat: 'def', n: 2 }, heal: 0.15 }, 'Heals and sharply raises Defense.'),
    // lobber
    loblob: M('Lob', 'plant', 45, 1, { sure: true }, 'Lobbed high: never misses.'),
    leafsling: M('Leaf Sling', 'plant', 0, 1, { buff: { stat: 'atk', n: 1 }, heal: 0.1 }, 'Winds up the arm. Raises Attack.'),
    highlob: M('High Lob', 'plant', 60, 1, { sure: true }, 'A sky-high lob. Never misses.'),
    splatter: M('Splatter', 'plant', 40, 0.95, { debuff: { stat: 'spd', n: 1 } }, 'A squishy splat. Lowers Speed.'),
    meteorlob: M('Meteor Lob', 'plant', 85, 1, { sure: true }, 'Falls like a meteor. Never misses.'),
    lobstorm: M('Lob Storm', 'plant', 22, 1, { hits: 3, sure: true }, 'Three lobs that never miss.'),
    // spore (mushrooms)
    sporepuff: M('Spore Puff', 'poison', 0, 0.9, { status: { type: 'sleep', chance: 0.5 } }, 'A sleepy puff. May cause sleep.'),
    capbonk: M('Cap Bonk', 'plant', 50, 0.95, { status: { type: 'stun', chance: 0.1 } }, 'A bouncy headbutt. May stun.'),
    fumes: M('Fumes', 'poison', 55, 0.95, { status: { type: 'poison', chance: 0.3 } }, 'Stinky fumes. May poison.'),
    sleepspore: M('Sleepy Spore', 'poison', 0, 0.9, { status: { type: 'sleep', chance: 0.55 } }, 'Often causes sleep.'),
    gloomcloud: M('Gloom Cloud', 'poison', 75, 0.9, { status: { type: 'poison', chance: 0.3 } }, 'A dark cloud. May poison.'),
    shroomshield: M('Shroom Shield', 'plant', 0, 1, { buff: { stat: 'def', n: 2 }, heal: 0.1 }, 'Hides under its cap. Raises Defense.'),
    // zap
    spark: M('Spark', 'electric', 40, 1, { first: true }, 'A quick spark. Goes first.'),
    staticfur: M('Static Charge', 'electric', 0, 1, { buff: { stat: 'spd', n: 2 } }, 'Crackles with static. Sharply raises Speed.'),
    chainzap: M('Chain Zap', 'electric', 22, 0.95, { hits: 3 }, 'Zaps three times.'),
    charge: M('Power Charge', 'electric', 0, 1, { buff: { stat: 'atk', n: 2 } }, 'Charges up. Sharply raises Attack.'),
    thunderclap: M('Thunderclap', 'electric', 80, 0.9, { status: { type: 'stun', chance: 0.2 } }, 'A loud thunder blast. May stun.'),
    stormcall: M('Storm Call', 'electric', 0, 1, { buff: [{ stat: 'atk', n: 1 }, { stat: 'spd', n: 1 }], heal: 0.15 }, 'Heals and raises Attack and Speed.'),

    // ----- plant signatures: one per evolution stage -----
    peashot: M('Pea Shot', 'plant', 45, 1, { first: true }, 'Pop! A speedy pea. Goes first.'),
    repeater: M('Repeater', 'plant', 28, 0.95, { hits: 2 }, 'Pop-pop! Two peas at once.'),
    gatling: M('Gatling Peas', 'plant', 20, 0.95, { hits: 5 }, 'Pea-pea-pea-pea-pea! Five peas.'),
    sunnyday: M('Sunny Day', 'plant', 0, 1, { heal: 0.35, buff: { stat: 'def', n: 1 } }, 'Sunflower signature. Heals and raises Defense.'),
    twinsun: M('Twin Sun', 'plant', 0, 1, { heal: 0.3, buff: { stat: 'atk', n: 2 } }, 'Twin Sunflower signature. Heals and sharply raises Attack.'),
    royalbeam: M('Royal Sunbeam', 'plant', 95, 0.9, {}, 'Sunflower Queen signature. A dazzling beam.'),
    chomp: M('Chomp', 'plant', 55, 0.95, {}, 'CHOMP! A big bite.'),
    superchomp: M('Super Chomp', 'plant', 70, 0.95, { drain: 0.4 }, 'Chomps and heals.'),
    biggulp: M('Big Gulp', 'plant', 95, 0.9, { drain: 0.5 }, 'Swallows a huge bite. Heals half.'),
    nutroll: M('Nut Roll', 'rock', 45, 0.95, {}, 'Rolls into the target.'),
    tallwall: M('Tall Wall', 'rock', 0, 1, { buff: { stat: 'def', n: 3 } }, 'Stands tall. Hugely raises Defense.'),
    gigaroll: M('Giga Roll', 'rock', 95, 0.9, {}, 'A giant rolling nut.'),
    snowshot: M('Snow Pea', 'ice', 40, 1, { debuff: { stat: 'spd', n: 1 } }, 'A frozen pea. Lowers Speed.'),
    frostrepeat: M('Frost Repeater', 'ice', 28, 0.95, { hits: 2, debuff: { stat: 'spd', n: 1 } }, 'Two frozen peas. Lowers Speed.'),
    blizzardpea: M('Blizzard', 'ice', 95, 0.9, { debuff: { stat: 'spd', n: 1 } }, 'A howling blizzard. Lowers Speed.'),
    cherrypop: M('Cherry Pop', 'fire', 55, 0.95, {}, 'Two cherries go pop!'),
    cherryblast: M('Cherry Blast', 'fire', 85, 0.9, { recoil: 0.15 }, 'A big cherry boom.'),
    megacherry: M('Mega Cherry', 'fire', 120, 0.85, { recoil: 0.25 }, 'The biggest cherry boom there is!'),
    spudup: M('Spud Up', 'rock', 45, 1, { first: true }, 'Pops out of the ground. Goes first.'),
    mashblast: M('Mash Blast', 'rock', 80, 0.9, { recoil: 0.15 }, 'Spud-tacular boom.'),
    megamine: M('Mega Mine', 'rock', 110, 0.85, { recoil: 0.2 }, 'A massive potato boom.'),
    puff: M('Puff', 'poison', 40, 1, { first: true }, 'A quick spore puff. Goes first.'),
    fume: M('Fume', 'poison', 55, 0.95, { status: { type: 'poison', chance: 0.4 } }, 'A stinky fume. May poison.'),
    gloom: M('Gloom', 'poison', 22, 0.95, { hits: 4, status: { type: 'poison', chance: 0.2 } }, 'Fumes in every direction. Four hits.'),
    sunspore: M('Sun Spore', 'magic', 40, 1, {}, 'A glowing sunny spore.'),
    bigsun: M('Big Sun', 'magic', 0, 1, { heal: 0.4 }, 'Glows like the sun. Heals.'),
    megasun: M('Mega Sun', 'magic', 90, 0.9, {}, 'A blinding magic sun.'),
    cabbagelob: M('Cabbage Lob', 'plant', 45, 1, { sure: true }, 'A lobbed cabbage. Never misses.'),
    melonlob: M('Melon Lob', 'plant', 80, 1, { sure: true }, 'A heavy watermelon. Never misses.'),
    wintermelon: M('Winter Melon', 'ice', 90, 1, { sure: true, debuff: { stat: 'spd', n: 1 } }, 'A frosty melon. Never misses, lowers Speed.'),
    kernelshot: M('Kernel Pop', 'normal', 40, 1, { sure: true }, 'A lobbed corn kernel. Never misses.'),
    butterlob: M('Butter Lob', 'normal', 45, 1, { sure: true, status: { type: 'stun', chance: 0.4 } }, 'Splat! Butter. May stun.'),
    cobcannon: M('Cob Cannon', 'normal', 120, 0.9, { once: true }, 'A giant corn cob strike. Once per battle.'),
    pounce: M('Squash Pounce', 'rock', 55, 0.95, {}, 'Jumps and squashes.'),
    supersquash: M('Super Squash', 'rock', 80, 0.9, { status: { type: 'stun', chance: 0.15 } }, 'A bigger squash. May stun.'),
    megasquash: M('Mega Squash', 'rock', 110, 0.85, {}, 'SQUASH!'),
    hotpepper: M('Hot Pepper', 'fire', 50, 0.95, { status: { type: 'burn', chance: 0.3 } }, 'Spicy! May burn.'),
    ghostpepper: M('Ghost Pepper', 'dark', 70, 0.95, { status: { type: 'burn', chance: 0.2 } }, 'A spooky hot haunting. May burn.'),
    dragonpepper: M('Dragon Pepper', 'fire', 110, 0.85, { status: { type: 'burn', chance: 0.3 } }, 'Dragon-hot fire. May burn.'),
    spineshot: M('Spine Shot', 'plant', 40, 1, { first: true }, 'A quick spine. Goes first.'),
    needlerain: M('Needle Rain', 'plant', 22, 0.95, { hits: 3 }, 'Three needles.'),
    spikestorm: M('Spike Storm', 'plant', 20, 0.95, { hits: 5 }, 'Five spikes!'),
    spiketrap: M('Spike Trap', 'rock', 45, 1, { sure: true }, 'Hidden spikes. Never misses.'),
    spikerock: M('Spikerock', 'rock', 40, 1, { buff: { stat: 'def', n: 1 } }, 'Rocky spikes. Raises Defense.'),
    spiketitan: M('Titan Spikes', 'rock', 95, 0.9, {}, 'Giant spikes burst up.'),
    torchbonk: M('Torch Bonk', 'fire', 45, 0.95, { status: { type: 'burn', chance: 0.2 } }, 'A flaming bonk. May burn.'),
    blazewall: M('Blaze Wall', 'fire', 0, 1, { buff: { stat: 'def', n: 2 }, heal: 0.15 }, 'A wall of fire. Heals, raises Defense.'),
    infernoring: M('Inferno Ring', 'fire', 95, 0.9, { status: { type: 'burn', chance: 0.3 } }, 'A ring of fire. May burn.'),
    lilysplash: M('Lily Splash', 'water', 40, 1, {}, 'A splash of pond water.'),
    lotusheal: M('Lotus Heal', 'water', 0, 1, { heal: 0.45 }, 'Rests on the water. Heals a lot.'),
    lotusbloom: M('Lotus Bloom', 'water', 85, 0.95, { drain: 0.3 }, 'A blooming wave. Heals a little.'),
    tangle: M('Tangle', 'water', 0, 0.9, { status: { type: 'stun', chance: 0.5 } }, 'Kelp wraps their feet. May stun.'),
    snapkelp: M('Snap Kelp', 'water', 65, 0.95, {}, 'Snap!'),
    krakenwrap: M('Kraken Wrap', 'water', 95, 0.9, { debuff: { stat: 'spd', n: 1 } }, 'A huge squeeze. Lowers Speed.'),
    starshot: M('Star Shot', 'magic', 16, 1, { hits: 3 }, 'Three spinning stars.'),
    starburst: M('Star Burst', 'magic', 18, 1, { hits: 4 }, 'Four spinning stars.'),
    supernova: M('Supernova', 'magic', 100, 0.9, {}, 'An exploding star!'),
    magnetpull: M('Magnet Pull', 'robot', 0, 1, { debuff: { stat: 'def', n: 2 } }, 'Pulls off their armor. Sharply lowers Defense.'),
    goldpull: M('Gold Pull', 'robot', 55, 0.95, { debuff: { stat: 'def', n: 1 } }, 'A golden pull. Lowers Defense.'),
    megamagnet: M('Mega Magnet', 'robot', 95, 0.9, {}, 'A super magnetic smash.'),
    hypnotize: M('Hypnotize', 'magic', 0, 0.9, { status: { type: 'sleep', chance: 0.55 } }, 'You are getting sleepy... May cause sleep.'),
    swirlgaze: M('Swirl Gaze', 'magic', 55, 0.95, { status: { type: 'stun', chance: 0.25 } }, 'A dizzy swirl. May stun.'),
    hypnoking: M('Royal Hypnosis', 'magic', 90, 0.9, { status: { type: 'sleep', chance: 0.2 } }, 'A royal swirl. May cause sleep.'),
    doompuff: M('Doom Puff', 'dark', 55, 0.95, {}, 'A dark puff.'),
    gloomboom: M('Gloom Boom', 'dark', 85, 0.9, { recoil: 0.15 }, 'A gloomy boom.'),
    megadoom: M('Mega Doom', 'dark', 125, 0.85, { recoil: 0.25, once: true }, 'The biggest boom of all. Once per battle.'),
    freeze: M('Freeze', 'ice', 0, 0.9, { status: { type: 'stun', chance: 0.55 } }, 'Freezes the target. May stun.'),
    frostbite: M('Frostbite', 'ice', 60, 0.95, { debuff: { stat: 'spd', n: 1 } }, 'A chilly bite. Lowers Speed.'),
    glacier: M('Glacier Crash', 'ice', 95, 0.9, {}, 'A whole glacier crashes down.'),
    bonk: M('Bonk', 'normal', 40, 1, { first: true }, 'Bonk! Goes first.'),
    combopunch: M('Combo Punch', 'normal', 22, 0.95, { hits: 3 }, 'Punch punch punch!'),
    kingbonk: M('King Bonk', 'normal', 95, 0.9, { crit: 0.15 }, 'The champion punch.'),
    zapreed: M('Reed Zap', 'electric', 40, 1, {}, 'A little lightning bolt.'),
    stormreed: M('Storm Reed', 'electric', 24, 0.95, { hits: 3 }, 'Three bolts in a row.'),
    thunderreed: M('Thunder Reed', 'electric', 95, 0.9, { status: { type: 'stun', chance: 0.15 } }, 'A huge thunderbolt. May stun.'),
    beamshot: M('Bean Beam', 'laser', 45, 1, { sure: true }, 'A laser beam. Never misses.'),
    beambean: M('Beam Sweep', 'laser', 70, 1, { sure: true }, 'A sweeping laser. Never misses.'),
    megalaser: M('Mega Laser', 'laser', 105, 0.9, {}, 'A giant laser blast.'),
    garlicbreath: M('Garlic Breath', 'poison', 40, 1, { status: { type: 'poison', chance: 0.4 } }, 'Phew! May poison.'),
    stinkcloud: M('Stink Cloud', 'poison', 0, 1, { debuff: [{ stat: 'acc', n: 1 }, { stat: 'atk', n: 1 }] }, 'So stinky. Lowers Aim and Attack.'),
    megastink: M('Mega Stink', 'poison', 85, 0.9, { status: { type: 'poison', chance: 0.4 } }, 'The stinkiest. May poison.'),
    snapflame: M('Snap Flame', 'fire', 45, 0.95, { status: { type: 'burn', chance: 0.2 } }, 'A snappy flame. May burn.'),
    dragonsnap: M('Dragon Snap', 'fire', 70, 0.95, {}, 'A fiery dragon bite.'),
    infernobreath: M('Inferno Breath', 'fire', 105, 0.85, { status: { type: 'burn', chance: 0.3 } }, 'A roaring fire. May burn.'),
    goldshine: M('Gold Shine', 'magic', 0, 1, { heal: 0.35 }, 'Shines like gold. Heals.'),
    luckypetal: M('Lucky Petal', 'magic', 50, 1, { crit: 0.35 }, 'A lucky petal. Often crits.'),
    goldenstorm: M('Golden Storm', 'magic', 20, 0.95, { hits: 4 }, 'Four golden petals.'),
    pumpkinbump: M('Pumpkin Bump', 'dark', 45, 0.95, {}, 'A bonk from a pumpkin.'),
    lanternglow: M('Lantern Glow', 'dark', 65, 0.95, { debuff: { stat: 'acc', n: 1 } }, 'A spooky glow. Lowers Aim.'),
    pumpkinking: M('Pumpkin Party', 'dark', 95, 0.9, { status: { type: 'stun', chance: 0.15 } }, 'A royal pumpkin party! May stun.'),
    cocoshot: M('Coconut Shot', 'rock', 50, 0.95, {}, 'Boom! A coconut cannonball.'),
    cocomortar: M('Coco Mortar', 'rock', 75, 1, { sure: true }, 'A high mortar shot. Never misses.'),
    battleship: M('Broadside', 'rock', 30, 0.9, { hits: 4 }, 'Four coconut cannonballs!'),
    boomerang: M('Bloomerang', 'normal', 24, 1, { hits: 2 }, 'Hits going out and coming back.'),
    doubleboom: M('Double Boom', 'normal', 22, 1, { hits: 3 }, 'Three boomerang hits.'),
    megaboom: M('Mega Boomerang', 'normal', 26, 0.95, { hits: 4 }, 'Four boomerang hits.'),
    berryzap: M('Berry Zap', 'electric', 45, 0.95, { status: { type: 'stun', chance: 0.1 } }, 'A zappy berry. May stun.'),
    shockberry: M('Shock Berry', 'electric', 70, 0.95, { status: { type: 'stun', chance: 0.15 } }, 'A big shock. May stun.'),
    thunderberry: M('Thunder Berry', 'electric', 110, 0.85, {}, 'KA-ZAP!'),
    infishield: M('Infi Shield', 'laser', 0, 1, { buff: { stat: 'def', n: 2 } }, 'An energy shield. Sharply raises Defense.'),
    plasmashield: M('Plasma Shield', 'laser', 0, 1, { buff: { stat: 'def', n: 1 }, heal: 0.3 }, 'Heals and raises Defense.'),
    infibeam: M('Infi Beam', 'laser', 90, 0.95, {}, 'A beam from the future.'),

    // ----- element moves: unlocked by giving a plant 1 / 2 / 3 cores of that element -----
    ember: M('Ember', 'fire', 45, 1, { status: { type: 'burn', chance: 0.2 } }, 'A small flame. May burn.'),
    flamethrower: M('Flamethrower', 'fire', 70, 0.95, { status: { type: 'burn', chance: 0.2 } }, 'A stream of fire. May burn.'),
    inferno: M('Inferno', 'fire', 100, 0.85, { status: { type: 'burn', chance: 0.35 } }, 'A blazing inferno. May burn.'),
    splash: M('Splash', 'water', 40, 1, {}, 'A cheerful splash.'),
    waterjet: M('Water Jet', 'water', 55, 1, { first: true }, 'A fast jet of water. Goes first.'),
    tidalwave: M('Tidal Wave', 'water', 95, 0.9, {}, 'A crashing wave.'),
    iceshard: M('Ice Shard', 'ice', 40, 1, { debuff: { stat: 'spd', n: 1 } }, 'A chilly shard. Lowers Speed.'),
    frostbreath: M('Frost Breath', 'ice', 65, 0.95, { debuff: { stat: 'spd', n: 1 } }, 'Freezing breath. Lowers Speed.'),
    avalanche: M('Avalanche', 'ice', 100, 0.85, {}, 'Buries them in snow.'),
    zap: M('Zap', 'electric', 40, 1, { first: true }, 'A quick zap. Goes first.'),
    thunderbolt: M('Thunderbolt', 'electric', 70, 0.95, { status: { type: 'stun', chance: 0.15 } }, 'A bolt of lightning. May stun.'),
    megavolt: M('Mega Volt', 'electric', 100, 0.85, { status: { type: 'stun', chance: 0.2 } }, 'A million volts! May stun.'),
    laserdot: M('Laser Dot', 'laser', 40, 1, { sure: true }, 'A precise laser. Never misses.'),
    photonbeam: M('Photon Beam', 'laser', 65, 1, { sure: true }, 'A bright beam. Never misses.'),
    hyperbeam: M('Hyper Beam', 'laser', 105, 0.85, {}, 'An enormous laser.'),
    toxicspit: M('Toxic Spit', 'poison', 35, 1, { status: { type: 'poison', chance: 0.5 } }, 'Often poisons.'),
    poisoncloud: M('Poison Cloud', 'poison', 0, 0.9, { status: { type: 'poison', chance: 0.8 } }, 'Usually poisons.'),
    venomburst: M('Venom Burst', 'poison', 85, 0.9, { status: { type: 'poison', chance: 0.35 } }, 'A burst of venom. May poison.'),
    magicspark: M('Magic Spark', 'magic', 40, 1, { crit: 0.15 }, 'A sparkly spell. Crits often.'),
    starwand: M('Star Wand', 'magic', 0, 1, { heal: 0.35, cleanse: true }, 'Heals and clears status.'),
    arcanastorm: M('Arcane Storm', 'magic', 22, 0.95, { hits: 4 }, 'Four magic bolts.'),
    shadowpunch: M('Shadow Punch', 'dark', 45, 1, { sure: true }, 'A punch from the shadows. Never misses.'),
    nightmare: M('Nightmare', 'dark', 0, 0.9, { status: { type: 'sleep', chance: 0.55 } }, 'A spooky dream. May cause sleep.'),
    eclipse: M('Eclipse', 'dark', 95, 0.9, { debuff: { stat: 'acc', n: 1 } }, 'Blots out the sun. Lowers Aim.'),
    pebbletoss: M('Pebble Toss', 'rock', 22, 0.95, { hits: 2 }, 'Two pebbles.'),
    rockslide: M('Rock Slide', 'rock', 70, 0.9, { status: { type: 'stun', chance: 0.15 } }, 'Tumbling rocks. May stun.'),
    meteor: M('Meteor', 'rock', 105, 0.85, {}, 'A meteor falls from the sky.'),
    bolttoss: M('Bolt Toss', 'robot', 40, 1, {}, 'Throws nuts and bolts.'),
    gearup: M('Gear Up', 'robot', 0, 1, { buff: [{ stat: 'atk', n: 1 }, { stat: 'def', n: 1 }] }, 'Raises Attack and Defense.'),
    robocannon: M('Robo Cannon', 'robot', 100, 0.85, {}, 'A robot arm cannon.'),
    tackle: M('Tackle', 'normal', 40, 0.95, {}, 'A sturdy tackle.'),
    bodycheck: M('Body Check', 'normal', 0, 1, { buff: [{ stat: 'atk', n: 1 }, { stat: 'spd', n: 1 }] }, 'Raises Attack and Speed.'),
    gigaimpact: M('Giga Impact', 'normal', 100, 0.85, { recoil: 0.15 }, 'A huge impact, some recoil.'),

    // ----- fusion items -----
    armybarrage: M('Army Barrage', 'normal', 18, 0.95, { hits: 5 }, 'A barrage of five quick shots.'),
    shieldbash: M('Shield Bash', 'robot', 60, 0.95, { buff: { stat: 'def', n: 1 } }, 'Hits and raises Defense.'),
    cannonball: M('Cannonball', 'water', 80, 0.9, {}, 'Ka-boom!'),
    lasso: M('Lasso', 'normal', 40, 1, { debuff: { stat: 'spd', n: 2 } }, 'Sharply lowers Speed.'),
    magicbolt: M('Magic Bolt', 'magic', 65, 1, { sure: true }, 'Never misses.'),
    royaldecree: M('Royal Decree', 'magic', 0, 1, { buff: [{ stat: 'atk', n: 1 }, { stat: 'def', n: 1 }, { stat: 'spd', n: 1 }] }, 'Raises Attack, Defense and Speed.'),
    shadowstrike: M('Shadow Strike', 'dark', 55, 1, { first: true, crit: 0.2 }, 'Goes first, crits often.'),
    starbeam: M('Star Beam', 'laser', 80, 0.95, {}, 'A shining beam from the stars.'),
    doubletrouble: M('Double Trouble', 'plant', 28, 0.95, { hits: 3 }, 'Three quick shots in a row.'),
    catapultlob: M('Catapult Lob', 'plant', 70, 1, { sure: true }, 'Never misses.'),
    jetdash: M('Jet Dash', 'normal', 50, 1, { first: true, buff: { stat: 'spd', n: 1 } }, 'Goes first, raises Speed.'),
    spookyscare: M('Spooky Scare', 'dark', 0, 0.9, { status: { type: 'stun', chance: 0.5 } }, 'BOO! May stun.'),

    // ----- zombies -----
    zbite: M('Bite', 'normal', 40, 0.95, {}, 'Chomp! A zombie bite.'),
    zbrain: M('Brain Munch', 'normal', 45, 0.95, { drain: 0.5 }, 'Braaains! Heals half the damage.'),
    zgroan: M('Groan', 'normal', 0, 1, { debuff: { stat: 'atk', n: 1 } }, 'Braaaaains... Lowers Attack.'),
    zshamble: M('Shamble', 'normal', 0, 1, { buff: { stat: 'def', n: 1 }, heal: 0.1 }, 'Shuffles along. Raises Defense.'),
    zconebonk: M('Cone Bonk', 'rock', 50, 0.95, { status: { type: 'stun', chance: 0.1 } }, 'A traffic-cone bonk. May stun.'),
    zbucket: M('Bucket Bash', 'robot', 55, 0.95, {}, 'A clang from a metal bucket.'),
    zbucketup: M('Bucket Up', 'robot', 0, 1, { buff: { stat: 'def', n: 2 } }, 'Pulls the bucket down tight.'),
    zflag: M('Flag Wave', 'normal', 0, 1, { buff: [{ stat: 'atk', n: 1 }, { stat: 'spd', n: 1 }] }, 'Here they come! Raises Attack and Speed.'),
    znewsrage: M('Newspaper Rage', 'normal', 0, 1, { buff: { stat: 'atk', n: 2 } }, 'MY NEWSPAPER! Sharply raises Attack.'),
    znewsread: M('Read the News', 'normal', 0, 1, { heal: 0.3 }, 'A quiet read. Heals.'),
    zdoor: M('Door Shield', 'robot', 0, 1, { buff: { stat: 'def', n: 2 } }, 'Hides behind a screen door.'),
    zdoorslam: M('Door Slam', 'robot', 60, 0.9, {}, 'Slam!'),
    ztackle: M('Football Tackle', 'normal', 50, 0.95, { first: true }, 'Hut hut! Goes first.'),
    zshoulder: M('Shoulder Pads', 'rock', 0, 1, { buff: { stat: 'def', n: 2 } }, 'Big pads. Sharply raises Defense.'),
    zrush: M('Touchdown Rush', 'normal', 75, 0.9, { recoil: 0.1 }, 'A charging rush.'),
    zvault: M('Pole Vault', 'normal', 45, 1, { first: true }, 'Leaps over with a pole. Goes first.'),
    zsprint: M('Sprint', 'normal', 0, 1, { buff: { stat: 'spd', n: 2 } }, 'Sharply raises Speed.'),
    zdisco: M('Disco Dance', 'magic', 0, 0.9, { status: { type: 'stun', chance: 0.5 } }, 'Groovy moves! May stun.'),
    zfever: M('Disco Fever', 'magic', 0, 1, { buff: [{ stat: 'atk', n: 1 }, { stat: 'spd', n: 1 }] }, 'Raises Attack and Speed.'),
    zfloat: M('Ducky Float', 'water', 0, 1, { heal: 0.3, buff: { stat: 'spd', n: 1 } }, 'Floats on a ducky. Heals.'),
    zsplash: M('Zombie Splash', 'water', 45, 1, {}, 'A big splash.'),
    zdive: M('Snorkel Dive', 'water', 0, 1, { buff: { stat: 'eva', n: 2 } }, 'Dives under. Sharply raises Dodge.'),
    zballoon: M('Balloon Float', 'normal', 0, 1, { buff: { stat: 'eva', n: 2 } }, 'Floats up high. Sharply raises Dodge.'),
    zdrop: M('Balloon Drop', 'normal', 55, 0.95, {}, 'Drops down from above.'),
    zimp: M('Imp Bite', 'dark', 35, 1, { first: true }, 'A tiny bite. Goes first.'),
    ztumble: M('Imp Tumble', 'dark', 22, 0.95, { hits: 2 }, 'Tumbles twice.'),
    zyeti: M('Yeti Ice Blast', 'ice', 60, 0.95, { debuff: { stat: 'spd', n: 1 } }, 'A frosty blast. Lowers Speed.'),
    zsnow: M('Snowball Toss', 'ice', 20, 1, { hits: 3 }, 'Three snowballs.'),
    zswing: M('Pirate Swing', 'water', 26, 0.95, { hits: 2 }, 'Swings on a rope, twice.'),
    zcannon: M('Cannon Blast', 'water', 75, 0.85, {}, 'Fires a cannon.'),
    zwrap: M('Mummy Wrap', 'dark', 0, 0.9, { status: { type: 'stun', chance: 0.5 } }, 'Wraps them up. May stun.'),
    zsand: M('Sandstorm', 'rock', 0, 1, { debuff: { stat: 'acc', n: 2 } }, 'Sand in the eyes. Sharply lowers Aim.'),
    zsunsteal: M('Sun Steal', 'fire', 50, 0.95, { drain: 0.5 }, 'Steals sunshine. Heals half.'),
    zstaff: M('Sun Staff', 'fire', 65, 0.95, { status: { type: 'burn', chance: 0.2 } }, 'A burning staff. May burn.'),
    zsmash: M('Garg Smash', 'rock', 85, 0.9, { status: { type: 'stun', chance: 0.15 } }, 'SMASH! May stun.'),
    zimptoss: M('Imp Toss', 'dark', 60, 0.95, {}, 'Throws a tiny imp.'),
    zboom: M('Jack Boom', 'fire', 110, 0.9, { recoil: 0.35, once: true }, 'Pop goes the zombie! Once per battle.'),
    zspring: M('Jack Spring', 'normal', 40, 1, { status: { type: 'stun', chance: 0.3 } }, 'Boing! May stun.'),
    zdig: M('Dig Up', 'rock', 45, 1, { first: true }, 'Pops up from underground. Goes first.'),
    zpick: M('Pickaxe', 'rock', 60, 0.95, { crit: 0.15 }, 'Crits often.'),
    zcharge: M('Knight Charge', 'robot', 65, 0.95, {}, 'A clanky charge.'),
    zarmor: M('Armor Up', 'robot', 0, 1, { buff: { stat: 'def', n: 2 } }, 'Sharply raises Defense.'),
    zlasso: M('Lasso Spin', 'normal', 25, 0.95, { hits: 2 }, 'Spins a lasso twice.'),
    zyeehaw: M('Yee-haw!', 'normal', 0, 1, { buff: [{ stat: 'atk', n: 1 }, { stat: 'spd', n: 1 }] }, 'Raises Attack and Speed.'),
    zzap: M('Robo Zap', 'electric', 55, 0.95, { status: { type: 'stun', chance: 0.15 } }, 'A robot zap. May stun.'),
    zlaser: M('Laser Eye', 'laser', 70, 0.95, {}, 'A laser from its visor.'),
    // Zomboss super attacks (battle.js bosses)
    bpole: M('Telephone Pole', 'rock', 120, 0.9, {}, 'A giant pole smash.'),
    bfire: M('Zombot Fireball', 'fire', 115, 0.9, { status: { type: 'burn', chance: 0.3 } }, 'A giant fireball.'),
    bsphinx: M('Sphinx Beam', 'laser', 110, 0.9, {}, 'A beam from the sphinx eyes.'),
    bbarrage: M('Cannon Barrage', 'water', 30, 0.9, { hits: 4 }, 'Four cannonballs!'),
    bdragon: M('Dark Dragon Fire', 'fire', 120, 0.85, { status: { type: 'burn', chance: 0.3 } }, 'Dragon fire!'),
    bmammoth: M('Mammoth Freeze', 'ice', 115, 0.9, { debuff: { stat: 'spd', n: 1 } }, 'A freezing stomp.'),
    btomorrow: M('Tomorrow Laser', 'laser', 120, 0.85, {}, 'A laser from the future.'),

    // ----- the 30 newer plants (signature moves, one per stage) -----
    tripleshot: M('Triple Shot', 'plant', 22, 0.95, { hits: 3 }, 'Threepeater signature. Three heads, three peas.'),
    threeway: M('Three-Way Volley', 'plant', 27, 0.95, { hits: 3, crit: 0.1 }, 'Triple Threat signature. Three big peas. Crits often.'),
    trigatling: M('Tri-Gatling', 'plant', 18, 0.95, { hits: 6 }, 'Tri-Gatling signature. Six peas in a row!'),
    splitshot: M('Split Shot', 'plant', 25, 1, { hits: 2 }, 'Split Pea signature. One pea forward, one back.'),
    backfire: M('Back Fire', 'plant', 36, 0.95, { hits: 2, first: true }, 'Split Repeater signature. Two quick peas. Goes first.'),
    splitstorm: M('Split Storm', 'plant', 22, 0.95, { hits: 5 }, 'Split Gatling signature. Peas fly both ways!'),
    scaredyshot: M('Scaredy Shot', 'poison', 45, 1, { first: true }, 'Scaredy-shroom signature. A long-range spore. Goes first.'),
    hidepeek: M('Hide and Peek', 'poison', 0, 1, { buff: { stat: 'eva', n: 2 }, heal: 0.2 }, 'Shy-shroom signature. Hides in its cap. Heals and sharply raises Dodge.'),
    bravespore: M('Brave Spore', 'poison', 90, 0.9, { status: { type: 'poison', chance: 0.3 } }, 'Brave-shroom signature. Not scared anymore! May poison.'),
    icepulse: M('Ice Pulse', 'ice', 40, 0.95, { status: { type: 'stun', chance: 0.3 } }, 'Ice-shroom signature. A burst of cold. May freeze.'),
    frostblast: M('Frost Blast', 'ice', 70, 0.9, { debuff: { stat: 'spd', n: 2 } }, 'Frost-shroom signature. Sharply lowers Speed.'),
    blizzardboom: M('Blizzard Boom', 'ice', 115, 0.85, { recoil: 0.2, status: { type: 'stun', chance: 0.25 } }, 'Blizzard-shroom signature. Freezes the whole lawn. May stun.'),
    seaspore: M('Sea Spore', 'water', 40, 1, { first: true }, 'Sea-shroom signature. A splashy spore. Goes first.'),
    bubblepuff: M('Bubble Puff', 'water', 30, 0.95, { hits: 2, debuff: { stat: 'acc', n: 1 } }, 'Tide-shroom signature. Bubbles in the eyes! Lowers Aim.'),
    tidalspore: M('Tidal Spore', 'water', 90, 0.9, {}, 'Ocean-shroom signature. A wave of spores.'),
    lanternlight: M('Lantern Light', 'magic', 0, 1, { heal: 0.3, buff: { stat: 'acc', n: 2 } }, 'Plantern signature. Lights the way. Heals and sharply raises Aim.'),
    glowbeam: M('Glow Beam', 'magic', 70, 1, { sure: true }, 'Glow Lantern signature. A beam of lantern light. Never misses.'),
    starlantern: M('Star Lantern', 'magic', 95, 0.9, { heal: 0.2 }, 'Star Lantern signature. Dazzling starlight that heals a little.'),
    blowaway: M('Blow Away', 'normal', 40, 1, { first: true, debuff: { stat: 'eva', n: 1 } }, 'Blover signature. A gust of wind. Goes first.'),
    gustfan: M('Gust Fan', 'normal', 0, 1, { buff: { stat: 'spd', n: 2 }, cleanse: true }, 'Big Blover signature. Blows bad stuff away and sharply raises Speed.'),
    tornado: M('Tornado', 'normal', 95, 0.85, { debuff: { stat: 'acc', n: 1 } }, 'Mega Blover signature. A spinning tornado. Lowers Aim.'),
    homingspike: M('Homing Spike', 'water', 45, 1, { sure: true }, 'Cattail signature. A spike that always finds its target.'),
    archerspike: M('Archer Spikes', 'water', 28, 1, { hits: 2, sure: true }, 'Cattail Archer signature. Two homing spikes. Never miss.'),
    royalspikes: M('Royal Spikes', 'water', 24, 1, { hits: 4, sure: true }, 'Royal Cattail signature. Four homing spikes. Never miss.'),
    umbrellaguard: M('Umbrella Guard', 'plant', 0, 1, { buff: { stat: 'def', n: 2 }, heal: 0.15 }, 'Umbrella Leaf signature. Opens its leaves. Sharply raises Defense.'),
    leafbounce: M('Leaf Bounce', 'plant', 65, 0.95, { buff: { stat: 'def', n: 1 } }, 'Parasol Leaf signature. Bounces an attack back. Raises Defense.'),
    canopy: M('Canopy Crush', 'plant', 95, 0.9, {}, 'Canopy Leaf signature. A huge leafy slam.'),
    wakeup: M('Wake Up!', 'magic', 0, 1, { cleanse: true, buff: { stat: 'spd', n: 2 } }, 'Coffee Bean signature. Wakes up and sharply raises Speed.'),
    espresso: M('Espresso Shot', 'magic', 60, 1, { first: true }, 'Espresso Bean signature. A super-fast hit. Goes first.'),
    mochaboost: M('Mocha Boost', 'magic', 0, 1, { buff: [{ stat: 'spd', n: 2 }, { stat: 'atk', n: 2 }] }, 'Mocha Bean signature. Sharply raises Speed and Attack.'),
    gravechomp: M('Grave Chomp', 'dark', 55, 0.95, {}, 'Grave Buster signature. Chomps like it eats a gravestone.'),
    tombtoss: M('Tomb Toss', 'dark', 72, 0.9, { debuff: { stat: 'def', n: 1 } }, 'Grave Gobbler signature. Throws a tombstone. Lowers Defense.'),
    cryptcrush: M('Crypt Crush', 'dark', 100, 0.9, { drain: 0.3 }, 'Tomb Crusher signature. Crushes and heals a little.'),
    boing: M('Boing!', 'normal', 45, 1, { buff: { stat: 'eva', n: 1 } }, 'Spring Bean signature. Bounces into the target. Raises Dodge.'),
    springkick: M('Spring Kick', 'normal', 70, 0.95, { first: true }, 'Bounce Bean signature. A springy kick. Goes first.'),
    megabounce: M('Mega Bounce', 'normal', 100, 0.9, {}, 'Super Spring signature. Boings sky high and lands hard.'),
    stinkpop: M('Stink Pop', 'poison', 50, 0.95, { status: { type: 'poison', chance: 0.4 } }, 'Chili Bean signature. Pop! A stinky cloud. May poison.'),
    chiliburst: M('Chili Burst', 'poison', 80, 0.9, { status: { type: 'poison', chance: 0.4 } }, 'Hot Chili Bean signature. A bigger stinky burst.'),
    gasgiant: M('Gas Giant', 'poison', 120, 0.85, { recoil: 0.2, status: { type: 'poison', chance: 0.5 } }, 'Volcano Bean signature. The stinkiest boom ever!'),
    podshot: M('Pod Shot', 'plant', 45, 1, {}, 'Pea Pod signature. A pea from the pod.'),
    podpair: M('Pod Pair', 'plant', 30, 0.95, { hits: 2 }, 'Pea Pod Duo signature. Two pod heads fire at once.'),
    podparty: M('Pod Party', 'plant', 20, 0.95, { hits: 5 }, 'Pea Pod Party signature. Five pod heads, five peas!'),
    warmup: M('Warm Up', 'fire', 0, 1, { heal: 0.3, cleanse: true }, 'Hot Potato signature. A toasty hug. Heals and cures.'),
    toastyhug: M('Toasty Toss', 'fire', 65, 0.95, { status: { type: 'burn', chance: 0.3 } }, 'Baked Potato signature. A hot potato! May burn.'),
    lavaheal: M('Lava Glow', 'fire', 0, 1, { heal: 0.4, buff: { stat: 'atk', n: 1 } }, 'Lava Potato signature. Heals a lot and raises Attack.'),
    pepperlob: M('Pepper Lob', 'fire', 45, 1, { sure: true }, 'Pepper-pult signature. A lobbed hot pepper. Never misses.'),
    flamelob: M('Flame Lob', 'fire', 70, 1, { sure: true, status: { type: 'burn', chance: 0.25 } }, 'Pepper Blaster signature. A flaming pepper. May burn.'),
    infernolob: M('Inferno Lob', 'fire', 95, 1, { sure: true, status: { type: 'burn', chance: 0.3 } }, 'Pepper Inferno signature. A pepper meteor! May burn.'),
    onionfume: M('Onion Fumes', 'poison', 35, 1, { status: { type: 'stun', chance: 0.3 } }, 'Stunion signature. Phew! May stun.'),
    tearcloud: M('Tear Cloud', 'poison', 60, 0.95, { status: { type: 'stun', chance: 0.3 }, debuff: { stat: 'acc', n: 1 } }, 'Big Stunion signature. Watery eyes! May stun, lowers Aim.'),
    stunstorm: M('Stun Storm', 'poison', 90, 0.9, { status: { type: 'stun', chance: 0.35 } }, 'Mega Stunion signature. A huge onion cloud. May stun.'),
    petalsting: M('Petal Sting', 'plant', 48, 1, { crit: 0.15 }, 'Red Stinger signature. A sharp petal. Crits often.'),
    stingvolley: M('Sting Volley', 'plant', 26, 0.95, { hits: 3, crit: 0.15 }, 'Crimson Stinger signature. Three sharp petals.'),
    rosestorm: M('Rose Storm', 'plant', 95, 0.9, { crit: 0.2 }, 'Rose Stinger signature. A storm of thorny petals.'),
    currantzap: M('Currant Zap', 'electric', 42, 1, { first: true }, 'Electric Currant signature. A spooky little zap. Goes first.'),
    shockwave: M('Shock Wave', 'electric', 68, 0.95, { status: { type: 'stun', chance: 0.2 } }, 'Shock Currant signature. May stun.'),
    stormcurrant: M('Storm Currant', 'electric', 95, 0.9, { status: { type: 'stun', chance: 0.2 } }, 'Storm Currant signature. A ghostly thunderstorm. May stun.'),
    spikybump: M('Spiky Bump', 'rock', 45, 0.95, { buff: { stat: 'def', n: 1 } }, 'Endurian signature. A prickly bump. Raises Defense.'),
    thornarmor: M('Thorn Armor', 'rock', 0, 1, { buff: { stat: 'def', n: 3 }, heal: 0.1 }, 'Spiky Endurian signature. Bristles all over. Hugely raises Defense.'),
    durianquake: M('Durian Quake', 'rock', 100, 0.9, {}, 'King Endurian signature. A spiky ground pound.'),
    plasmaball: M('Plasma Ball', 'robot', 55, 0.95, {}, 'Citron signature. A charged-up plasma ball.'),
    citronbeam: M('Citron Beam', 'robot', 75, 1, { sure: true }, 'Citron Blaster signature. A plasma beam. Never misses.'),
    primeblast: M('Prime Blast', 'robot', 120, 0.85, { recoil: 0.15 }, 'Citron Prime signature. The biggest plasma ball in the galaxy.'),
    empulse: M('E.M. Pulse', 'electric', 50, 0.95, { status: { type: 'stun', chance: 0.35 } }, 'E.M.Peach signature. An electric pulse. May stun robots and zombies.'),
    peachblast: M('Peach Blast', 'electric', 80, 0.9, { status: { type: 'stun', chance: 0.3 } }, 'Mega Peach signature. May stun.'),
    ultrapulse: M('Ultra Pulse', 'electric', 120, 0.85, { recoil: 0.2, status: { type: 'stun', chance: 0.3 } }, 'Ultra Peach signature. Shorts out everything!'),
    stalk: M('Stalk', 'dark', 50, 0.95, { crit: 0.2 }, 'Celery Stalker signature. Sneaks up and strikes. Crits often.'),
    sneakattack: M('Sneak Attack', 'dark', 70, 1, { sure: true, first: true }, 'Celery Sneak signature. Pops up behind the target. Goes first, never misses.'),
    ninjaslash: M('Ninja Slash', 'dark', 98, 0.9, { crit: 0.25 }, 'Celery Ninja signature. A shadowy slash. Crits often.'),
    avocadochomp: M('Avocado Chomp', 'water', 55, 0.95, {}, 'Guacodile signature. A crunchy croc bite.'),
    pitspit: M('Pit Spit', 'water', 70, 0.95, { debuff: { stat: 'def', n: 1 } }, 'Guaco-Gator signature. Spits its pit! Lowers Defense.'),
    guacrush: M('Guac Crush', 'water', 100, 0.9, { drain: 0.3 }, 'Guaco-King signature. A huge chomp that heals a little.'),
    bananalob: M('Banana Lob', 'normal', 48, 1, { sure: true }, 'Banana Launcher signature. A banana from far away. Never misses.'),
    bananapeel: M('Banana Peel', 'normal', 60, 1, { sure: true, debuff: { stat: 'spd', n: 1 } }, 'Banana Bomber signature. A slippery peel! Lowers Speed.'),
    bananabarrage: M('Banana Barrage', 'normal', 30, 1, { hits: 3, sure: true }, 'Banana Barrage signature. Three bananas from the sky.'),
    moonbeam: M('Moon Beam', 'dark', 0, 1, { heal: 0.3, buff: { stat: 'eva', n: 1 } }, 'Moonflower signature. Moonlight heals and raises Dodge.'),
    moonglow: M('Moon Glow', 'dark', 68, 1, { sure: true }, 'Moon Bloom signature. A glowing moon ray. Never misses.'),
    fullmoon: M('Full Moon', 'dark', 95, 0.9, { heal: 0.2 }, 'Full Moon Flower signature. The full moon shines! Heals a little.'),
    focusbeam: M('Focus Beam', 'laser', 48, 1, { sure: true }, 'Magnifying Grass signature. Focused sunlight. Never misses.'),
    prismray: M('Prism Ray', 'laser', 26, 1, { hits: 3 }, 'Focus Grass signature. A rainbow of three rays.'),
    sunlens: M('Sun Lens', 'laser', 100, 0.9, { status: { type: 'burn', chance: 0.25 } }, 'Prism Grass signature. A burning beam of sunshine. May burn.'),
    shadowpuff: M('Shadow Puff', 'dark', 42, 1, { first: true }, 'Shadow-shroom signature. A puff of shadow. Goes first.'),
    darkgoo: M('Dark Goo', 'dark', 65, 0.95, { debuff: { stat: 'spd', n: 1 } }, 'Shade-shroom signature. Sticky goo! Lowers Speed.'),
    nightmare: M('Nightmare', 'dark', 95, 0.9, { status: { type: 'sleep', chance: 0.25 } }, 'Nightmare-shroom signature. Spooky! May make the target fall asleep.'),
    chillwind: M('Chill Wind', 'ice', 40, 1, { debuff: { stat: 'spd', n: 1 } }, 'Hurrikale signature. A freezing breeze. Lowers Speed.'),
    icegust: M('Ice Gust', 'ice', 0, 1, { buff: { stat: 'eva', n: 1 }, heal: 0.25 }, 'Hurri-Gust signature. Heals and raises Dodge.'),
    blizzardwind: M('Blizzard Wind', 'ice', 95, 0.9, { debuff: { stat: 'spd', n: 1 } }, 'Hurri-Storm signature. A whirling blizzard. Lowers Speed.'),
    firepea: M('Fire Pea', 'fire', 45, 1, { first: true, status: { type: 'burn', chance: 0.2 } }, 'Fire Peashooter signature. A flaming pea. Goes first, may burn.'),
    firerepeat: M('Fire Repeater', 'fire', 30, 0.95, { hits: 2, status: { type: 'burn', chance: 0.2 } }, 'Fire Repeater signature. Two flaming peas.'),
    infernopea: M('Inferno Peas', 'fire', 20, 0.95, { hits: 5, status: { type: 'burn', chance: 0.2 } }, 'Inferno Gatling signature. Five flaming peas!'),
    // ----- newer zombies -----
    zpickaxe: M('Pickaxe', 'rock', 50, 0.95, {}, 'Prospector Zombie swings its pickaxe.'),
    zdynamite: M('Dynamite', 'fire', 60, 0.9, { recoil: 0.1 }, 'Lights a stick of dynamite!'),
    zpiano: M('Piano Tune', 'magic', 45, 0.95, { debuff: { stat: 'atk', n: 1 } }, 'A spooky tune. Lowers Attack.'),
    zchicken: M('Chicken Swarm', 'normal', 14, 0.95, { hits: 4 }, 'Zombie chickens everywhere! Four hits.'),
    zwhip: M('Whip Crack', 'normal', 55, 0.95, {}, 'An adventurer\'s whip.'),
    zshovel: M('Shovel Scoop', 'rock', 58, 0.9, { debuff: { stat: 'def', n: 1 } }, 'Scoops at its target. Lowers Defense.'),
    zparasol: M('Parasol Block', 'normal', 0, 1, { buff: { stat: 'def', n: 2 } }, 'Hides under a parasol. Sharply raises Defense.'),
    zsurf: M('Surf Slam', 'water', 60, 0.9, {}, 'Slams down with a surfboard.'),
    zhook: M('Fishing Hook', 'water', 50, 0.95, { debuff: { stat: 'spd', n: 1 } }, 'Reels its target in. Lowers Speed.'),
    zink: M('Octo Ink', 'water', 45, 0.95, { debuff: { stat: 'acc', n: 1 } }, 'Squirts ink. Lowers Aim.'),
    zclub: M('Caveman Club', 'rock', 60, 0.9, {}, 'Bonk! A big wooden club.'),
    zbullystomp: M('Bully Stomp', 'rock', 75, 0.85, {}, 'A huge stomp from a big bully.'),
    zpunk: M('Punk Kick', 'normal', 55, 0.95, { first: true }, 'A rocking kick. Goes first.'),
    zglitter: M('Glitter Burst', 'magic', 50, 0.95, { debuff: { stat: 'acc', n: 1 } }, 'Sparkly glitter in the eyes. Lowers Aim.'),
    zboombox: M('Bass Drop', 'electric', 60, 0.9, { status: { type: 'stun', chance: 0.2 } }, 'The boombox drops the bass. May stun.'),
    zspell: M('Sheep Spell', 'magic', 45, 0.9, { status: { type: 'sleep', chance: 0.25 } }, 'A wizard spell. May put the target to sleep.'),
    zshield: M('Energy Shield', 'robot', 0, 1, { buff: { stat: 'def', n: 2 }, heal: 0.15 }, 'Puts up an energy shield.'),
    zbrick: M('Brick Bonk', 'rock', 55, 0.95, {}, 'Bonks with its brick helmet.'),
    zpeck: M('Zombie Peck', 'normal', 30, 1, { first: true }, 'A super-fast zombie chicken peck. Goes first.'),
    // ----- newer Zomboss giant attacks -----
    bwagon: M('Wagon Charge', 'fire', 115, 0.9, { status: { type: 'burn', chance: 0.3 } }, 'The War Wagon charges on fire!'),
    bgondola: M('Gondola Drop', 'rock', 115, 0.9, {}, 'Drops crates from the sky.'),
    bshark: M('Shark Bite', 'water', 120, 0.85, {}, 'A giant robot shark bite!'),
    bmecha: M('Mechasaur Roar', 'robot', 115, 0.9, { debuff: { stat: 'def', n: 1 } }, 'A deafening robot dino roar.'),
    bmasher: M('Mega Mash', 'electric', 120, 0.85, { status: { type: 'stun', chance: 0.2 } }, 'Speakers blast a giant soundwave!'),
  };

  // ---------- Plant roles: the 2 shared moves at each stage (a plant's 3 form moves = its signature + these) ----------
  const ROLES = {
    shooter: { label: 'Shooter', moves: [['seedspit', 'sprouthide'], ['steadyaim', 'thornshot'], ['rapidfire', 'leafstorm']] },
    support: { label: 'Sunny helper', moves: [['sunbeam', 'sunsnack'], ['sunburst', 'warmglow'], ['solarflare', 'sunshield']] },
    melee: { label: 'Brawler', moves: [['nibble', 'leafjab'], ['bigbite', 'snaproot'], ['jawcrush', 'wildthrash']] },
    wall: { label: 'Defender', moves: [['nutbump', 'hunker'], ['shellslam', 'ironbark'], ['fortress', 'bodyslam']] },
    bomb: { label: 'Boomer', moves: [['pop', 'fuse'], ['kaboom', 'smokepuff'], ['megablast', 'blastshield']] },
    lobber: { label: 'Lobber', moves: [['loblob', 'leafsling'], ['highlob', 'splatter'], ['meteorlob', 'lobstorm']] },
    spore: { label: 'Mushroom', moves: [['sporepuff', 'capbonk'], ['fumes', 'sleepspore'], ['gloomcloud', 'shroomshield']] },
    zap: { label: 'Zapper', moves: [['spark', 'staticfur'], ['chainzap', 'charge'], ['thunderclap', 'stormcall']] },
  };

  // ---------- Plants ----------
  // names: the 3 evolution stages. el: base type. role: shared moves. sig: signature move per stage. part: the trait it adds when
  // fused onto another plant (art-core.js). pre/suf: fusion name pieces (partner pre + body suf: Sun + shooter = "Sunshooter").
  // bias: XP multipliers per stat (its strengths). race: extra race rating per segment. price: seed packet price once unlocked.
  const PL = (names, el, role, sig, part, pre, suf, bias, race, price, blurb) => ({ names, name: names[0], el, role, sig, part, pre, suf, bias: bias || {}, race: race || {}, price, blurb });
  const PLANTS = {
    peashooter: PL(['Peashooter', 'Repeater', 'Gatling Pea'], 'plant', 'shooter', ['peashot', 'repeater', 'gatling'], 'snout', 'Pea', 'shooter', { power: 1.15, run: 1.1 }, {}, 150, 'Shoots peas. The best first plant there is.'),
    sunflower: PL(['Sunflower', 'Twin Sunflower', 'Sunflower Queen'], 'plant', 'support', ['sunnyday', 'twinsun', 'royalbeam'], 'petals', 'Sun', 'flower', { stamina: 1.15, fly: 1.1 }, { fly: 0.8 }, 150, 'Makes sunshine and heals its friends.'),
    chomper: PL(['Chomper', 'Super Chomper', 'Mega Chomper'], 'plant', 'melee', ['chomp', 'superchomp', 'biggulp'], 'jaws', 'Chomp', 'chomper', { power: 1.2, stamina: 1.05 }, { run: 0.5 }, 150, 'A big purple plant with a BIG bite.'),
    wallnut: PL(['Wall-nut', 'Tall-nut', 'Giga Tall-nut'], 'rock', 'wall', ['nutroll', 'tallwall', 'gigaroll'], 'shell', 'Nut', 'nut', { stamina: 1.3, run: 0.85 }, { climb: 1.5 }, 250, 'Tough as a nut. Nothing gets past.'),
    snowpea: PL(['Snow Pea', 'Frost Repeater', 'Blizzard Pea'], 'ice', 'shooter', ['snowshot', 'frostrepeat', 'blizzardpea'], 'snout', 'Frost', 'pea', { power: 1.1, swim: 1.1 }, { swim: 0.6 }, 350, 'Shoots frozen peas that slow zombies down.'),
    cherrybomb: PL(['Cherry Bomb', 'Cherry Blaster', 'Mega Cherry'], 'fire', 'bomb', ['cherrypop', 'cherryblast', 'megacherry'], 'cherries', 'Cherry', 'bomb', { power: 1.3, stamina: 0.9 }, { run: 0.6 }, 500, 'Two grumpy cherries that go BOOM.'),
    potatomine: PL(['Potato Mine', 'Spud Mine', 'Mega Mine'], 'rock', 'bomb', ['spudup', 'mashblast', 'megamine'], 'beam', 'Spud', 'mine', { power: 1.2, stamina: 1.1 }, { climb: 0.8 }, 450, 'Hides underground, then pops up with a boom.'),
    puffshroom: PL(['Puff-shroom', 'Fume-shroom', 'Gloom-shroom'], 'poison', 'spore', ['puff', 'fume', 'gloom'], 'cap', 'Puff', 'shroom', { power: 1.1, fly: 1.1 }, { fly: 0.6 }, 300, 'A little night mushroom that puffs stinky spores.'),
    sunshroom: PL(['Sun-shroom', 'Big Sun-shroom', 'Mega Sun-shroom'], 'magic', 'support', ['sunspore', 'bigsun', 'megasun'], 'cap', 'Sunny', 'shroom', { stamina: 1.15, fly: 1.1 }, { fly: 0.6 }, 350, 'A sleepy mushroom that glows like the sun.'),
    cabbagepult: PL(['Cabbage-pult', 'Melon-pult', 'Winter Melon'], 'plant', 'lobber', ['cabbagelob', 'melonlob', 'wintermelon'], 'basket', 'Cabbage', 'pult', { power: 1.15, stamina: 1.1 }, {}, 400, 'Lobs cabbages over anything.'),
    kernelpult: PL(['Kernel-pult', 'Butter-pult', 'Cob Cannon'], 'normal', 'lobber', ['kernelshot', 'butterlob', 'cobcannon'], 'leafcrown', 'Corn', 'pult', { power: 1.15, run: 1.05 }, {}, 600, 'Lobs corn and sticky butter.'),
    squash: PL(['Squash', 'Super Squash', 'Mega Squash'], 'rock', 'melee', ['pounce', 'supersquash', 'megasquash'], 'brows', 'Squash', 'squash', { power: 1.25, stamina: 1.1, run: 0.9 }, { climb: 1.5 }, 550, 'Jumps up and SQUASHES. Always grumpy.'),
    jalapeno: PL(['Jalapeno', 'Ghost Pepper', 'Dragon Pepper'], 'fire', 'bomb', ['hotpepper', 'ghostpepper', 'dragonpepper'], 'flame', 'Pepper', 'pepper', { power: 1.25, run: 1.1 }, { run: 1.5 }, 800, 'So spicy it bursts into flames.'),
    cactus: PL(['Cactus', 'Prickly Cactus', 'Spike Cactus'], 'plant', 'shooter', ['spineshot', 'needlerain', 'spikestorm'], 'spikes', 'Spiky', 'cactus', { power: 1.1, stamina: 1.1, swim: 0.85 }, { climb: 1 }, 650, 'Shoots spines. Prickly but kind.'),
    spikeweed: PL(['Spikeweed', 'Spikerock', 'Spike Titan'], 'rock', 'wall', ['spiketrap', 'spikerock', 'spiketitan'], 'spikes', 'Spike', 'weed', { stamina: 1.2, power: 1.1, fly: 0.85 }, { climb: 1 }, 650, 'Hides in the grass. Ouch!'),
    torchwood: PL(['Torchwood', 'Blaze Wood', 'Inferno Wood'], 'fire', 'wall', ['torchbonk', 'blazewall', 'infernoring'], 'flame', 'Torch', 'wood', { stamina: 1.2, power: 1.1 }, {}, 700, 'A friendly stump with a fire on top.'),
    lilypad: PL(['Lily Pad', 'Lotus Pad', 'Lotus Queen'], 'water', 'support', ['lilysplash', 'lotusheal', 'lotusbloom'], 'lily', 'Lily', 'pad', { swim: 1.35, stamina: 1.05 }, { swim: 2 }, 300, 'Floats on water and helps friends across.'),
    tanglekelp: PL(['Tangle Kelp', 'Snap Kelp', 'Kraken Kelp'], 'water', 'melee', ['tangle', 'snapkelp', 'krakenwrap'], 'leafcrown', 'Kelp', 'kelp', { swim: 1.3, power: 1.1 }, { swim: 2.5 }, 400, 'Lurks in the water and grabs feet.'),
    starfruit: PL(['Starfruit', 'Star Burst', 'Supernova Star'], 'magic', 'shooter', ['starshot', 'starburst', 'supernova'], 'star', 'Star', 'fruit', { fly: 1.2, run: 1.1 }, { fly: 1.5 }, 750, 'Shoots stars in five directions.'),
    magnetshroom: PL(['Magnet-shroom', 'Gold Magnet', 'Mega Magnet'], 'robot', 'spore', ['magnetpull', 'goldpull', 'megamagnet'], 'magnet', 'Magnet', 'shroom', { stamina: 1.1, power: 1.1 }, {}, 1100, 'Pulls the metal right off zombies.'),
    hypnoshroom: PL(['Hypno-shroom', 'Swirl-shroom', 'Hypno King'], 'magic', 'spore', ['hypnotize', 'swirlgaze', 'hypnoking'], 'swirl', 'Hypno', 'shroom', { fly: 1.15, stamina: 1.1 }, { fly: 0.8 }, 900, 'One look and zombies get very sleepy.'),
    doomshroom: PL(['Doom-shroom', 'Gloom Doom', 'Mega Doom'], 'dark', 'bomb', ['doompuff', 'gloomboom', 'megadoom'], 'cap', 'Doom', 'shroom', { power: 1.35, stamina: 0.9 }, {}, 1400, 'A gloomy mushroom with an enormous boom.'),
    iceberg: PL(['Iceberg Lettuce', 'Frost Lettuce', 'Glacier Lettuce'], 'ice', 'wall', ['freeze', 'frostbite', 'glacier'], 'leafcrown', 'Ice', 'lettuce', { stamina: 1.15, swim: 1.1 }, { swim: 1 }, 800, 'A frosty lettuce that freezes zombies solid.'),
    bonkchoy: PL(['Bonk Choy', 'Bonk Champ', 'Bonk King'], 'normal', 'melee', ['bonk', 'combopunch', 'kingbonk'], 'leafcrown', 'Bonk', 'choy', { power: 1.2, run: 1.1 }, { run: 1, climb: 0.8 }, 950, 'Punches zombies with leafy fists.'),
    lightningreed: PL(['Lightning Reed', 'Storm Reed', 'Thunder Reed'], 'electric', 'zap', ['zapreed', 'stormreed', 'thunderreed'], 'bolt', 'Zap', 'reed', { run: 1.2, power: 1.1 }, { run: 1.5 }, 1000, 'A reed that crackles with lightning.'),
    laserbean: PL(['Laser Bean', 'Beam Bean', 'Mega Laser Bean'], 'laser', 'shooter', ['beamshot', 'beambean', 'megalaser'], 'beam', 'Laser', 'bean', { power: 1.2, fly: 1.05 }, {}, 1250, 'Shoots lasers that never miss.'),
    garlic: PL(['Garlic', 'Stinky Garlic', 'Mega Garlic'], 'poison', 'wall', ['garlicbreath', 'stinkcloud', 'megastink'], 'bulb', 'Garlic', 'garlic', { stamina: 1.25, power: 1.05 }, {}, 900, 'So stinky that zombies run away.'),
    snapdragon: PL(['Snapdragon', 'Dragon Snap', 'Inferno Dragon'], 'fire', 'melee', ['snapflame', 'dragonsnap', 'infernobreath'], 'jaws', 'Dragon', 'dragon', { power: 1.25, fly: 1.05 }, { fly: 1 }, 1300, 'A flower that snaps and breathes fire.'),
    marigold: PL(['Marigold', 'Gold Bloom', 'Golden Marigold'], 'magic', 'support', ['goldshine', 'luckypetal', 'goldenstorm'], 'petals', 'Gold', 'gold', { stamina: 1.1, fly: 1.15 }, { fly: 0.8 }, 600, 'A cheerful flower that finds coins.'),
    pumpkin: PL(['Pumpkin', "Jack-o'-Lantern", 'Pumpkin King'], 'dark', 'wall', ['pumpkinbump', 'lanternglow', 'pumpkinking'], 'pumpkin', 'Pumpkin', 'kin', { stamina: 1.3, power: 1.05 }, {}, 1200, 'A spooky pumpkin shell that protects friends.'),
    coconut: PL(['Coconut Cannon', 'Coco Mortar', 'Coco Battleship'], 'rock', 'shooter', ['cocoshot', 'cocomortar', 'battleship'], 'snout', 'Coco', 'cannon', { power: 1.25, swim: 1.1 }, { swim: 1 }, 500, 'A coconut cannon from the Pirate Seas.'),
    bloomerang: PL(['Bloomerang', 'Double Bloomerang', 'Mega Bloomerang'], 'normal', 'shooter', ['boomerang', 'doubleboom', 'megaboom'], 'boomerang', 'Boomer', 'rang', { fly: 1.2, run: 1.1 }, { fly: 2 }, 1100, 'Throws petals that come back.'),
    blueberry: PL(['Electric Blueberry', 'Shock Berry', 'Thunder Berry'], 'electric', 'zap', ['berryzap', 'shockberry', 'thunderberry'], 'berry', 'Berry', 'berry', { power: 1.2, run: 1.05 }, { run: 1 }, 1000, 'A berry full of lightning.'),
    infinut: PL(['Infi-nut', 'Infi-Shield', 'Infi-Fortress'], 'laser', 'wall', ['infishield', 'plasmashield', 'infibeam'], 'shell', 'Infi', 'nut', { stamina: 1.3, power: 1.05 }, { climb: 1 }, 1500, 'A nut from the future with an energy shield.'),

    // ----- 30 newer plants from PvZ 1 and PvZ 2 -----
    threepeater: PL(['Threepeater', 'Triple Threat', 'Tri-Gatling'], 'plant', 'shooter', ['tripleshot', 'threeway', 'trigatling'], 'snout', 'Tri', 'peater', { power: 1.15, run: 1.05 }, {}, 900, 'Three heads, three peas, three times the fun.'),
    splitpea: PL(['Split Pea', 'Split Repeater', 'Split Gatling'], 'plant', 'shooter', ['splitshot', 'backfire', 'splitstorm'], 'snout', 'Split', 'pea', { power: 1.1, run: 1.1 }, { run: 0.8 }, 700, 'Shoots peas forwards AND backwards.'),
    scaredyshroom: PL(['Scaredy-shroom', 'Shy-shroom', 'Brave-shroom'], 'poison', 'spore', ['scaredyshot', 'hidepeek', 'bravespore'], 'cap', 'Scaredy', 'shroom', { fly: 1.15, power: 1.05 }, { fly: 0.6 }, 650, 'Shoots from far away. Hides when zombies get close!'),
    iceshroom: PL(['Ice-shroom', 'Frost-shroom', 'Blizzard-shroom'], 'ice', 'bomb', ['icepulse', 'frostblast', 'blizzardboom'], 'cap', 'Ice', 'shroom', { power: 1.2, stamina: 1.05 }, {}, 1000, 'Freezes everything around it in a flash.'),
    seashroom: PL(['Sea-shroom', 'Tide-shroom', 'Ocean-shroom'], 'water', 'spore', ['seaspore', 'bubblepuff', 'tidalspore'], 'cap', 'Sea', 'shroom', { swim: 1.3, power: 1.05 }, { swim: 2 }, 450, 'A little mushroom that floats on the water.'),
    plantern: PL(['Plantern', 'Glow Lantern', 'Star Lantern'], 'magic', 'support', ['lanternlight', 'glowbeam', 'starlantern'], 'bulb', 'Lantern', 'tern', { stamina: 1.15, fly: 1.1 }, {}, 800, 'Lights up the dark so friends can see.'),
    blover: PL(['Blover', 'Big Blover', 'Mega Blover'], 'normal', 'support', ['blowaway', 'gustfan', 'tornado'], 'petals', 'Blow', 'ver', { fly: 1.25, run: 1.05 }, { fly: 1.5 }, 600, 'A clover fan that blows fog and flying zombies away.'),
    cattail: PL(['Cattail', 'Cattail Archer', 'Royal Cattail'], 'water', 'shooter', ['homingspike', 'archerspike', 'royalspikes'], 'spikes', 'Cat', 'tail', { swim: 1.2, power: 1.1 }, { swim: 1.5 }, 1100, 'A kitty plant on a lily pad. Its spikes always hit.'),
    umbrellaleaf: PL(['Umbrella Leaf', 'Parasol Leaf', 'Canopy Leaf'], 'plant', 'wall', ['umbrellaguard', 'leafbounce', 'canopy'], 'leafcrown', 'Umbrella', 'leaf', { stamina: 1.25, power: 1.05 }, {}, 700, 'Protects friends from things falling from the sky.'),
    coffeebean: PL(['Coffee Bean', 'Espresso Bean', 'Mocha Bean'], 'magic', 'support', ['wakeup', 'espresso', 'mochaboost'], 'berry', 'Coffee', 'bean', { run: 1.2, stamina: 1.05 }, { run: 1.5 }, 500, 'Wakes up sleepy mushrooms. Zoom zoom!'),
    gravebuster: PL(['Grave Buster', 'Grave Gobbler', 'Tomb Crusher'], 'dark', 'melee', ['gravechomp', 'tombtoss', 'cryptcrush'], 'jaws', 'Grave', 'buster', { power: 1.2, stamina: 1.1 }, { climb: 1 }, 750, 'Eats gravestones for breakfast.'),
    springbean: PL(['Spring Bean', 'Bounce Bean', 'Super Spring'], 'normal', 'melee', ['boing', 'springkick', 'megabounce'], 'leafcrown', 'Spring', 'bean', { run: 1.15, fly: 1.15 }, { climb: 1.5, fly: 1 }, 550, 'Boing! Bounces zombies right back.'),
    chilibean: PL(['Chili Bean', 'Hot Chili Bean', 'Volcano Bean'], 'poison', 'bomb', ['stinkpop', 'chiliburst', 'gasgiant'], 'flame', 'Chili', 'bean', { power: 1.25, stamina: 0.95 }, {}, 650, 'A spicy bean that leaves a stinky cloud. Phew!'),
    peapod: PL(['Pea Pod', 'Pea Pod Duo', 'Pea Pod Party'], 'plant', 'shooter', ['podshot', 'podpair', 'podparty'], 'snout', 'Pod', 'pod', { power: 1.15, stamina: 1.05 }, {}, 850, 'Grows more pea heads as it grows up.'),
    hotpotato: PL(['Hot Potato', 'Baked Potato', 'Lava Potato'], 'fire', 'support', ['warmup', 'toastyhug', 'lavaheal'], 'flame', 'Toasty', 'tato', { stamina: 1.2, power: 1.05 }, {}, 600, 'A warm potato that thaws out frozen friends.'),
    pepperpult: PL(['Pepper-pult', 'Pepper Blaster', 'Pepper Inferno'], 'fire', 'lobber', ['pepperlob', 'flamelob', 'infernolob'], 'basket', 'Pepper', 'pult', { power: 1.2, stamina: 1.05 }, {}, 950, 'Lobs flaming peppers and keeps friends warm.'),
    stunion: PL(['Stunion', 'Big Stunion', 'Mega Stunion'], 'poison', 'spore', ['onionfume', 'tearcloud', 'stunstorm'], 'bulb', 'Stun', 'ion', { stamina: 1.15, power: 1.05 }, {}, 800, 'So stinky it stops zombies in their tracks.'),
    redstinger: PL(['Red Stinger', 'Crimson Stinger', 'Rose Stinger'], 'plant', 'shooter', ['petalsting', 'stingvolley', 'rosestorm'], 'petals', 'Sting', 'stinger', { power: 1.2, fly: 1.05 }, {}, 1050, 'A fierce flower that shoots sharp petals.'),
    electriccurrant: PL(['Electric Currant', 'Shock Currant', 'Storm Currant'], 'electric', 'zap', ['currantzap', 'shockwave', 'stormcurrant'], 'berry', 'Current', 'currant', { run: 1.15, power: 1.1 }, { run: 1 }, 950, 'A ghostly little berry that buzzes with electricity.'),
    endurian: PL(['Endurian', 'Spiky Endurian', 'King Endurian'], 'rock', 'wall', ['spikybump', 'thornarmor', 'durianquake'], 'spikes', 'Duri', 'ian', { stamina: 1.35, power: 1.05 }, {}, 1050, 'A grumpy spiky fruit. Zombies that bite it say ouch!'),
    citron: PL(['Citron', 'Citron Blaster', 'Citron Prime'], 'robot', 'shooter', ['plasmaball', 'citronbeam', 'primeblast'], 'beam', 'Citro', 'tron', { power: 1.25, stamina: 1.05 }, {}, 1300, 'A bounty hunter from the future. Charges up plasma balls.'),
    empeach: PL(['E.M.Peach', 'Mega Peach', 'Ultra Peach'], 'electric', 'bomb', ['empulse', 'peachblast', 'ultrapulse'], 'bolt', 'Peach', 'peach', { power: 1.2, run: 1.05 }, {}, 1200, 'Shorts out zombie robots with an electric pulse.'),
    celerystalker: PL(['Celery Stalker', 'Celery Sneak', 'Celery Ninja'], 'dark', 'melee', ['stalk', 'sneakattack', 'ninjaslash'], 'leafcrown', 'Celery', 'stalker', { power: 1.2, run: 1.15 }, { run: 1 }, 950, 'Sneaks underground and pops up behind zombies.'),
    guacodile: PL(['Guacodile', 'Guaco-Gator', 'Guaco-King'], 'water', 'melee', ['avocadochomp', 'pitspit', 'guacrush'], 'jaws', 'Guaco', 'dile', { power: 1.15, swim: 1.2 }, { swim: 1.5 }, 1150, 'Half avocado, half crocodile. Spits its pit!'),
    bananalauncher: PL(['Banana Launcher', 'Banana Bomber', 'Banana Barrage'], 'normal', 'lobber', ['bananalob', 'bananapeel', 'bananabarrage'], 'basket', 'Banana', 'launcher', { power: 1.2, fly: 1.05 }, {}, 1250, 'Launches bananas from far, far away.'),
    moonflower: PL(['Moonflower', 'Moon Bloom', 'Full Moon Flower'], 'dark', 'support', ['moonbeam', 'moonglow', 'fullmoon'], 'petals', 'Moon', 'flower', { stamina: 1.15, fly: 1.1 }, { fly: 0.8 }, 900, 'A night flower that glows with moonlight.'),
    magnifyinggrass: PL(['Magnifying Grass', 'Focus Grass', 'Prism Grass'], 'laser', 'shooter', ['focusbeam', 'prismray', 'sunlens'], 'beam', 'Magni', 'grass', { power: 1.2, fly: 1.05 }, {}, 1250, 'A crystal lens that focuses sunshine into a beam.'),
    shadowshroom: PL(['Shadow-shroom', 'Shade-shroom', 'Nightmare-shroom'], 'dark', 'spore', ['shadowpuff', 'darkgoo', 'nightmare'], 'cap', 'Shadow', 'shroom', { power: 1.15, fly: 1.05 }, {}, 1000, 'A gooey mushroom that loves the dark. Sticks its tongue out!'),
    hurrikale: PL(['Hurrikale', 'Hurri-Gust', 'Hurri-Storm'], 'ice', 'support', ['chillwind', 'icegust', 'blizzardwind'], 'leafcrown', 'Hurri', 'kale', { fly: 1.2, stamina: 1.05 }, { fly: 1.5 }, 900, 'Swirls a freezing wind that pushes zombies back.'),
    firepeashooter: PL(['Fire Peashooter', 'Fire Repeater', 'Inferno Gatling'], 'fire', 'shooter', ['firepea', 'firerepeat', 'infernopea'], 'snout', 'Fire', 'shooter', { power: 1.2, run: 1.05 }, {}, 1100, 'Shoots flaming peas. Toasty!'),
  };
  const STARTERS = ['peashooter', 'sunflower', 'chomper'];
  // a few fusion names that read better than the automatic blend ("body+partner")
  const FUSION_NAMES = { 'wallnut+peashooter': 'Pea-nut', 'peashooter+wallnut': 'Nut Shooter', 'sunflower+peashooter': 'Pea-flower', 'cherrybomb+wallnut': 'Cherry Nut', 'wallnut+cherrybomb': 'Cherry Nut', 'chomper+peashooter': 'Pea Chomper',
    'peashooter+peashooter': 'Double Shooter', 'sunflower+sunflower': 'Super Sunflower', 'chomper+chomper': 'Double Chomper', 'potatomine+peashooter': 'Pea Mine' };

  // ---------- Elements (collected in the garden: 3 shards make a core; give a core to a plant) ----------
  // gives: stat XP per core. moves: unlocked with 1 / 2 / 3 cores. prefix: added to the plant's name ("Fire Repeater").
  const EL = (name, prefix, sprite, gives, moves, blurb) => ({ name, prefix, sprite, gives, moves, blurb });
  const ELEMENT_INFO = {
    fire: EL('Fire', 'Fire', 'Ember Wisp', { power: 14, run: 5 }, ['ember', 'flamethrower', 'inferno'], 'Hot hot hot! Fire beats plants, ice and robots.'),
    water: EL('Water', 'Aqua', 'Water Drop', { swim: 14, stamina: 5 }, ['splash', 'waterjet', 'tidalwave'], 'Splashy. Water beats fire and rock.'),
    ice: EL('Ice', 'Frost', 'Frosty', { stamina: 12, swim: 7 }, ['iceshard', 'frostbreath', 'avalanche'], 'Chilly. Ice beats plants and magic.'),
    electric: EL('Electric', 'Shock', 'Spark Bug', { run: 14, power: 5 }, ['zap', 'thunderbolt', 'megavolt'], 'Zappy and fast. Electric beats water and robots.'),
    laser: EL('Laser', 'Laser', 'Laser Prism', { power: 10, fly: 9 }, ['laserdot', 'photonbeam', 'hyperbeam'], 'Never misses. Laser beats robots and dark.'),
    poison: EL('Poison', 'Toxic', 'Toxic Bubble', { stamina: 10, power: 8 }, ['toxicspit', 'poisoncloud', 'venomburst'], 'Yucky! Poison beats plants and normal.'),
    magic: EL('Magic', 'Magic', 'Twinkle Star', { fly: 14, stamina: 5 }, ['magicspark', 'starwand', 'arcanastorm'], 'Sparkly spells. Magic beats dark and poison.'),
    dark: EL('Dark', 'Shadow', 'Shadow Wisp', { power: 10, fly: 8 }, ['shadowpunch', 'nightmare', 'eclipse'], 'Spooky. Dark beats magic and laser.'),
    rock: EL('Rock', 'Stone', 'Pebble Buddy', { stamina: 12, power: 7, swim: -3 }, ['pebbletoss', 'rockslide', 'meteor'], 'Tough. Rock beats fire, electric and ice.'),
    robot: EL('Robot', 'Robo', 'Gear Bot', { power: 9, stamina: 9 }, ['bolttoss', 'gearup', 'robocannon'], 'Beep boop! Robot beats rock and ice.'),
    normal: EL('Normal', 'Mighty', 'Fluff Puff', { run: 7, power: 6, stamina: 6 }, ['tackle', 'bodycheck', 'gigaimpact'], 'Strong and simple. Good at everything.'),
  };
  const SHARDS_PER_CORE = 3;
  // which element sprites live where: [element, where (land | coast | water | air), time (day | night | any)]
  const AREA_ELEMENTS = {
    frontyard: [['normal', 'land', 'any'], ['rock', 'land', 'day'], ['fire', 'land', 'day'], ['electric', 'air', 'night'], ['magic', 'air', 'night'], ['water', 'water', 'any'], ['ice', 'air', 'night']],
    graveyard: [['dark', 'land', 'any'], ['poison', 'land', 'any'], ['magic', 'air', 'any'], ['ice', 'air', 'any'], ['laser', 'air', 'any'], ['water', 'water', 'any']],
    pirate: [['water', 'water', 'any'], ['rock', 'coast', 'any'], ['electric', 'air', 'day'], ['fire', 'land', 'day'], ['robot', 'coast', 'any'], ['dark', 'water', 'night'], ['normal', 'land', 'any']],
    egypt: [['fire', 'land', 'day'], ['rock', 'land', 'any'], ['laser', 'air', 'day'], ['magic', 'air', 'night'], ['poison', 'land', 'night'], ['water', 'water', 'any'], ['robot', 'land', 'any']],
  };

  // ---------- Fusion items: fuse one onto a plant in the Fusion Lab ----------
  // name: shown name; form: the fused plant's name ({stage} = its stage name, {pre} = its fusion prefix). el: type it adds.
  // stats: stat levels it adds. move: the move it teaches. price: in the shop.
  const FI = (name, form, el, stats, move, price, blurb) => ({ name, form, el, stats, move, price, blurb });
  const FUSION_ITEMS = {
    extrashooter: FI('Extra Shooter', 'Twin {stage}', 'plant', { power: 4, run: 2 }, 'doubletrouble', 450, 'An extra shooter on top. More shots!'),
    army: FI('Army Helmet', 'Army {stage}', 'normal', { power: 4, stamina: 3 }, 'armybarrage', 600, 'A tough army helmet. Ready for battle.'),
    catapult: FI('Catapult Arm', '{pre}-pult', 'plant', { power: 5, fly: 2 }, 'catapultlob', 500, 'A catapult arm for lobbing things.'),
    knight: FI('Knight Armor', 'Knight {stage}', 'robot', { stamina: 6, power: 2 }, 'shieldbash', 700, 'Shiny armor from the Dark Ages.'),
    halloween: FI('Halloween Pumpkin', 'Spooky {stage}', 'dark', { stamina: 4, power: 3 }, 'spookyscare', 550, 'A spooky pumpkin shell. Boo!'),
    pirate: FI('Pirate Hat', 'Pirate {stage}', 'water', { swim: 5, power: 2 }, 'cannonball', 500, 'Arr! A captain\'s hat from the Pirate Seas.'),
    cowboy: FI('Cowboy Hat', 'Cowboy {stage}', 'normal', { run: 5, power: 2 }, 'lasso', 450, 'Yee-haw! From the Wild West.'),
    wizard: FI('Wizard Hat', 'Wizard {stage}', 'magic', { fly: 4, power: 3 }, 'magicbolt', 650, 'A pointy hat full of spells.'),
    crown: FI('Royal Crown', 'King {stage}', 'magic', { power: 3, stamina: 3, run: 2 }, 'royaldecree', 900, 'Fit for a plant king or queen.'),
    ninja: FI('Ninja Mask', 'Ninja {stage}', 'dark', { run: 5, power: 2 }, 'shadowstrike', 650, 'Quiet, quick and sneaky.'),
    space: FI('Space Helmet', 'Space {stage}', 'laser', { fly: 4, stamina: 3 }, 'starbeam', 800, 'A helmet from the Far Future.'),
    jetpack: FI('Jetpack', 'Jet {stage}', 'normal', { fly: 6, run: 2 }, 'jetdash', 750, 'Zoom! A little jetpack.'),
  };
  const FUSION = { costPlants: 150, costItem: 50 }; // coins for a fusion in the lab (plant + plant consumes both plants)

  // ---------- Evolution: total stat levels needed for stage 1 and stage 2 ----------
  const EVO = { budAt: 15, bloomAt: 40 };
  // ---------- Level-up moves: a bonus move at each of these total levels, between and after the two evolutions ----------
  // Levels 5, 10, 30 and 65 teach the four moves for its kind of plant; levels 25 and 50 teach its own element's first two moves
  // (Plant-type plants get leafy moves instead). A move it already knows is swapped for the next one that fits.
  const LEVEL_MOVES = [5, 10, 25, 30, 50, 65];
  const BONUS_MOVES = {
    shooter: ['kernelshot', 'doubletrouble', 'armybarrage', 'starbeam'],
    support: ['luckypetal', 'lotusheal', 'magicbolt', 'starbeam'],
    melee: ['tackle', 'jetdash', 'shadowpunch', 'gigaimpact'],
    wall: ['bodycheck', 'shieldbash', 'rockslide', 'gigaimpact'],
    bomb: ['ember', 'cannonball', 'robocannon', 'meteor'],
    lobber: ['pebbletoss', 'bolttoss', 'cannonball', 'catapultlob'],
    spore: ['toxicspit', 'stinkcloud', 'shadowstrike', 'venomburst'],
    zap: ['magicspark', 'laserdot', 'photonbeam', 'hyperbeam'],
  };
  const PLANT_TYPE_MOVES = [['leafjab', 'loblob', 'spineshot'], ['leafstorm', 'meteorlob', 'lobstorm']]; // levels 25 and 50 for Plant-type plants
  const ALT_ATTACKS = { magic: ['magicbolt', 'luckypetal', 'arcanastorm'], robot: ['shieldbash', 'robocannon'], dark: ['shadowstrike', 'lanternglow'], poison: ['fumes', 'megastink'], normal: ['jetdash', 'gigaimpact'], rock: ['rockslide', 'shellslam'] }; // level 50 when its element's 2nd move is a helper (or taken)
  const SPARE_MOVES = ['tackle', 'pebbletoss', 'magicspark', 'splash', 'iceshard', 'toxicspit', 'shadowpunch', 'bolttoss', 'lasso', 'jetdash'];
  const STRONG_SPARES = ['gigaimpact', 'meteor', 'rockslide', 'photonbeam', 'venomburst', 'flamethrower', 'waterjet', 'frostbreath', 'thunderbolt', 'shadowstrike', 'robocannon']; // fallbacks from level 30 on

  // ---------- Areas (gardens) ----------
  const AREAS = {
    frontyard: { name: 'Front Yard', blurb: 'A sunny lawn by the house, with a little koi pond.', theme: 'day', water: 'Koi Pond' },
    graveyard: { name: 'Night Graveyard', blurb: 'Always night. Spooky but friendly.', theme: 'night', water: 'Foggy Pond' },
    pirate: { name: 'Pirate Seas', blurb: 'Sandy decks, cannons and the open sea.', theme: 'day', water: 'Open Sea' },
    egypt: { name: 'Ancient Egypt', blurb: 'Warm dunes, pyramids and an oasis.', theme: 'desert', water: 'Oasis' },
  };
  const AREA_ORDER = ['frontyard', 'graveyard', 'pirate', 'egypt'];

  // ---------- Growth & economy (slow on purpose) ----------
  const GROWTH = {
    xpForLevel: lv => 20 + lv * 12,     // XP to go from lv to lv+1 (per stat)
    maxLevel: 50,
    pouchMax: 8,                        // element cores waiting in the pouch
    fruitRegrowSec: 90,
    dropEverySec: [55, 120],            // random coin / XP / shard drops in the garden
    critterEverySec: [18, 35],          // element sprites
    critterLifeSec: 30,
    swimXpPerSec: 0.6,
    walkXpPerSec: 0.08,
    petHappy: 2,
  };
  const DROPS = {
    coin: { weight: 6, min: 2, max: 6 },          // multiplied by (1 + bestTier*0.5)
    bigcoin: { weight: 1, min: 12, max: 25 },
    xp: { weight: 4, min: 3, max: 7 },            // XP to a random stat of the plant that taps it
    shard: { weight: 1.5 },                       // an element shard from this garden
    fitem: { weight: 0.12 },                      // a rare fusion item!
  };
  // Fruit. The tree grows any of them; cheaper fruit is more common (TREE.exp) and fruit already hanging is less likely
  // to grow again (TREE.repeat), so a tree is always a mix and every fruit can turn up.
  const FRUITS = {
    apple: { name: 'Heart Apple', price: 8, gives: { stamina: 4 }, happy: 10, desc: 'Stamina and happiness.' },
    sunpear: { name: 'Speedy Pear', price: 20, gives: { run: 5 }, desc: 'Run XP.' },
    moonplum: { name: 'Power Plum', price: 20, gives: { power: 5 }, desc: 'Power XP.' },
    melon: { name: 'Melon Slice', price: 20, gives: { swim: 5 }, desc: 'Swim XP.' },
    swiftberry: { name: 'Swift Berry', price: 30, gives: { run: 8 }, desc: 'Lots of Run XP.' },
    wingseed: { name: 'Wing Seed', price: 30, gives: { fly: 8 }, desc: 'Fly XP.' },
    seakelp: { name: 'Sea Kelp', price: 30, gives: { swim: 8 }, desc: 'Lots of Swim XP.' },
    powernut: { name: 'Power Nut', price: 30, gives: { power: 8 }, desc: 'Lots of Power XP.' },
    heartyroot: { name: 'Hearty Root', price: 30, gives: { stamina: 8 }, desc: 'Stamina XP.' },
    plantfood: { name: 'Plant Food', price: 150, gives: { swim: 8, fly: 8, run: 8, power: 8, stamina: 8 }, happy: 25, desc: 'Glowing super snack: XP to every stat.' },
    goldfruit: { name: 'Golden Fruit', price: 250, gives: { swim: 15, fly: 15, run: 15, power: 15, stamina: 15 }, happy: 20, desc: 'Lots of XP to every stat.' },
  };
  const TREE = { exp: 0.85, repeat: 2 }; // tree fruit weight = (1 / price) ^ exp, divided by (1 + repeat × copies already on the tree)

  // ---------- Races: 5 series x 3 tiers ----------
  // mix: relative weight of segment types. rating: rival stat ratings (see state.raceRating). coins: 1st place prize.
  const RACE_TIERS = [
    { id: 0, name: 'Beginner', rating: [1.2, 2.2], coins: 30, xp: 10, cheerSkill: [0.12, 0.3, 0.15] },
    { id: 1, name: 'Pro', rating: [3.4, 5], coins: 110, xp: 22, cheerSkill: [0.28, 0.35, 0.08] },
    { id: 2, name: 'Master', rating: [6, 8], coins: 380, xp: 40, cheerSkill: [0.42, 0.3, 0.03] },
  ];
  const RACES = [
    { id: 'frontyard', name: 'Front Yard Dash', area: 'frontyard', mix: { run: 5, swim: 1, climb: 1, fly: 1 }, length: 1100, unlock: null },
    { id: 'graveyard', name: 'Graveyard Glide', area: 'graveyard', mix: { run: 2, swim: 1, climb: 3, fly: 4 }, length: 1250, unlock: { race: 'frontyard', tier: 0 } },
    { id: 'pirate', name: 'Pirate Seas Rally', area: 'pirate', mix: { run: 3, swim: 3, climb: 2, fly: 2 }, length: 1300, unlock: { race: 'graveyard', tier: 0 } },
    { id: 'grand', name: 'Zombie Grand Prix', area: 'frontyard', mix: { run: 3, swim: 3, climb: 3, fly: 3 }, length: 1700, unlock: { race: 'pirate', tier: 1 } },
  ];
  const RACE_PLACE_SHARE = [1, 0.55, 0.3, 0.15]; // share of prize by place
  const RACE_STAT = { run: 'run', swim: 'swim', climb: 'power', fly: 'fly' };

  // ---------- Zombies ----------
  // el: types. moves: battle moves. bias: how its levels spread (stamina-heavy zombies are tanky). race: rating bonus per segment.
  const Z = (name, el, moves, bias, blurb, race) => ({ name, el, moves, bias: bias || {}, blurb, race: race || {} });
  const ZOMBIES = {
    basic: Z('Zombie', ['normal'], ['zbite', 'zgroan', 'zshamble'], { stamina: 1.4 }, 'Just a regular zombie. Loves brains.'),
    flag: Z('Flag Zombie', ['normal'], ['zbite', 'zflag', 'zgroan'], { run: 1.3 }, 'Waves a flag: here comes a big wave!'),
    conehead: Z('Conehead', ['normal', 'rock'], ['zbite', 'zconebonk', 'zshamble'], { stamina: 1.6 }, 'Wears a traffic cone for a helmet.'),
    buckethead: Z('Buckethead', ['normal', 'robot'], ['zbucket', 'zbucketup', 'zbite'], { stamina: 1.9 }, 'A metal bucket makes it extra tough.'),
    newspaper: Z('Newspaper Zombie', ['normal'], ['zbite', 'znewsrage', 'znewsread'], { power: 1.3 }, 'Gets VERY angry when its paper is ruined.'),
    screendoor: Z('Screen Door Zombie', ['normal', 'robot'], ['zdoorslam', 'zdoor', 'zbite'], { stamina: 1.7 }, 'Hides behind a screen door.'),
    football: Z('Football Zombie', ['normal', 'rock'], ['ztackle', 'zshoulder', 'zrush'], { power: 1.4, run: 1.3 }, 'Fast and tough. Hut hut!', { run: 1 }),
    polevault: Z('Pole Vaulting Zombie', ['normal'], ['zvault', 'zsprint', 'zbite'], { run: 1.8 }, 'Jumps right over plants.', { run: 1.5, climb: 1 }),
    disco: Z('Dancing Zombie', ['magic'], ['zdisco', 'zfever', 'zbite'], { run: 1.2, power: 1.2 }, 'Can\'t stop dancing!'),
    duckytube: Z('Ducky Tube Zombie', ['water'], ['zsplash', 'zfloat', 'zbite'], { swim: 1.8 }, 'Floats along on a rubber duck.', { swim: 1.5 }),
    snorkel: Z('Snorkel Zombie', ['water'], ['zdive', 'zsplash', 'zbite'], { swim: 1.8, fly: 1.2 }, 'Swims under the water.', { swim: 2 }),
    balloon: Z('Balloon Zombie', ['normal'], ['zballoon', 'zdrop', 'zbite'], { fly: 2 }, 'Floats over everything on a balloon.', { fly: 2 }),
    imp: Z('Imp', ['dark'], ['zimp', 'ztumble', 'zgroan'], { run: 1.6, fly: 1.3 }, 'Tiny, fast and cheeky.', { run: 1 }),
    yeti: Z('Zombie Yeti', ['ice'], ['zyeti', 'zsnow', 'zbite'], { stamina: 1.5, power: 1.3 }, 'A rare, fluffy, frosty zombie.'),
    pirate: Z('Pirate Zombie', ['water'], ['zswing', 'zcannon', 'zbite'], { swim: 1.4, power: 1.2 }, 'Arr! Swings in from the ship.', { swim: 1 }),
    mummy: Z('Mummy Zombie', ['dark', 'rock'], ['zwrap', 'zsand', 'zbite'], { stamina: 1.5 }, 'All wrapped up from Ancient Egypt.'),
    ra: Z('Ra Zombie', ['fire', 'magic'], ['zsunsteal', 'zstaff', 'zgroan'], { power: 1.3, fly: 1.2 }, 'Steals sunshine with its staff.'),
    gargantuar: Z('Gargantuar', ['rock'], ['zsmash', 'zimptoss', 'zgroan'], { stamina: 1.8, power: 1.6, run: 0.7 }, 'A HUGE zombie with a pole and an imp.'),
    jackbox: Z('Jack-in-the-Box Zombie', ['normal', 'fire'], ['zboom', 'zspring', 'zbite'], { power: 1.5 }, 'Turns the crank... and BOOM!'),
    digger: Z('Digger Zombie', ['rock'], ['zdig', 'zpick', 'zshamble'], { power: 1.3, stamina: 1.2 }, 'Tunnels under the lawn.', { climb: 1.5 }),
    knight: Z('Knight Zombie', ['robot'], ['zcharge', 'zarmor', 'zbite'], { stamina: 1.7, power: 1.2 }, 'Clanky armor from the Dark Ages.'),
    cowboy: Z('Cowboy Zombie', ['normal'], ['zlasso', 'zyeehaw', 'zbite'], { run: 1.4, power: 1.2 }, 'Yee-haw! From the Wild West.', { run: 1 }),
    robot: Z('Robo Zombie', ['robot', 'laser'], ['zlaser', 'zzap', 'zarmor'], { power: 1.4, stamina: 1.3 }, 'A robot zombie from the Far Future.'),

    // ----- newer zombies (PvZ 2 worlds) -----
    prospector: Z('Prospector Zombie', ['rock', 'fire'], ['zpickaxe', 'zdynamite', 'zbite'], { power: 1.3, stamina: 1.2 }, 'Digs for gold and lights dynamite.'),
    pianist: Z('Pianist Zombie', ['magic'], ['zpiano', 'zbite', 'zgroan'], { stamina: 1.5 }, 'Pushes a piano and plays a spooky tune.'),
    chickenwrangler: Z('Chicken Wrangler', ['normal'], ['zchicken', 'zlasso', 'zbite'], { run: 1.4 }, 'Lets loose a flock of zombie chickens!', { run: 1 }),
    adventurer: Z('Adventurer Zombie', ['normal', 'rock'], ['zwhip', 'zsprint', 'zbite'], { run: 1.3, power: 1.2 }, 'Explores the Lost City with a whip and a hat.', { climb: 1 }),
    excavator: Z('Excavator Zombie', ['rock'], ['zshovel', 'zdig', 'zbite'], { power: 1.3, stamina: 1.3 }, 'Scoops plants up with its shovel.'),
    parasol: Z('Parasol Zombie', ['normal'], ['zparasol', 'zbite', 'zgroan'], { stamina: 1.6 }, 'Hides under a parasol. Nothing gets through!'),
    surfer: Z('Surfer Zombie', ['water'], ['zsurf', 'zsplash', 'zbite'], { swim: 1.6, power: 1.2 }, 'Cowabunga! Rides the big waves.', { swim: 1.5 }),
    fisherman: Z('Fisherman Zombie', ['water'], ['zhook', 'zsplash', 'zbite'], { swim: 1.4, stamina: 1.2 }, 'Reels in plants with a fishing hook.', { swim: 1 }),
    octo: Z('Octo Zombie', ['water', 'poison'], ['zink', 'zwrap', 'zbite'], { swim: 1.7, power: 1.2 }, 'Carries a squishy octopus. Squirts ink!', { swim: 2 }),
    caveman: Z('Jurassic Zombie', ['rock'], ['zclub', 'zgroan', 'zbite'], { power: 1.3, stamina: 1.3 }, 'A cave zombie from the Jurassic Marsh. Ug!'),
    bully: Z('Jurassic Bully', ['rock'], ['zbullystomp', 'zclub', 'zgroan'], { power: 1.6, stamina: 1.5, run: 0.8 }, 'A big tough caveman zombie.'),
    punk: Z('Punk Zombie', ['normal', 'electric'], ['zpunk', 'zbite', 'zgroan'], { run: 1.4, power: 1.3 }, 'Rocks out and kicks plants away.', { run: 1 }),
    glitter: Z('Glitter Zombie', ['magic'], ['zglitter', 'zfever', 'zbite'], { run: 1.2, fly: 1.2 }, 'Leaves a sparkly rainbow trail.'),
    boombox: Z('Boombox Zombie', ['electric'], ['zboombox', 'zdisco', 'zbite'], { power: 1.3, stamina: 1.3 }, 'Blasts music so loud plants can\'t move!'),
    wizard: Z('Wizard Zombie', ['magic', 'dark'], ['zspell', 'zstaff', 'zbite'], { power: 1.3, fly: 1.2 }, 'A spooky wizard who turns plants into sheep.'),
    shieldbot: Z('Shield Zombie', ['robot'], ['zshield', 'zzap', 'zbite'], { stamina: 1.8 }, 'A future zombie behind a glowing energy shield.'),
    brickhead: Z('Brickhead', ['rock'], ['zbrick', 'zbucketup', 'zbite'], { stamina: 2 }, 'A brick on its head. Even tougher than a bucket!'),
    chicken: Z('Zombie Chicken', ['normal'], ['zpeck', 'ztumble', 'zgroan'], { run: 2 }, 'A tiny, speedy zombie chicken. Bawk!', { run: 2 }),
  };

  // ---------- Battle leagues: 16 Zombie leagues x 3 zombies ----------
  // Opponent: zombie kind, name (optional), lv = target total stat level, look extras (skin), k = HP/Attack tweak.
  const ZO = (zombie, lv, name, look, k) => ({ zombie, lv, name, look, k });
  const LEAGUES = [
    // (listed in the order they open: each PvZ 2 world sits right after the league that unlocks it)
    { id: 'lawn', name: 'Front Lawn League', coins: 20, xp: 8, opponents: [ZO('basic', 3), ZO('flag', 5), ZO('conehead', 8)] },
    { id: 'backyard', name: 'Backyard League', coins: 50, xp: 14, unlock: 'lawn', opponents: [ZO('newspaper', 12), ZO('buckethead', 16, null, null, 0.9), ZO('screendoor', 20, null, null, 0.8)] },
    { id: 'night', name: 'Night League', coins: 110, xp: 22, unlock: 'backyard', opponents: [ZO('imp', 22), ZO('disco', 26), ZO('jackbox', 30, null, null, 0.85)] },
    { id: 'pool', name: 'Pool League', coins: 220, xp: 32, unlock: 'night', opponents: [ZO('duckytube', 34), ZO('snorkel', 40), ZO('polevault', 46)] },
    { id: 'roof', name: 'Rooftop League', coins: 420, xp: 45, unlock: 'pool', opponents: [ZO('balloon', 52), ZO('digger', 58), ZO('football', 60, null, null, 0.65)] },
    { id: 'west', name: 'Wild West League', coins: 440, xp: 48, unlock: 'roof', opponents: [ZO('prospector', 62), ZO('chickenwrangler', 66, null, null, 0.9), ZO('pianist', 72, null, null, 0.85)] },
    { id: 'egypt', name: 'Ancient Egypt League', coins: 900, xp: 70, unlock: 'roof', opponents: [ZO('mummy', 75), ZO('ra', 85, null, null, 0.85), ZO('mummy', 100, 'Pharaoh Zombie', { skin: 'gold' }, 0.6)] },
    { id: 'lostcity', name: 'Lost City League', coins: 950, xp: 72, unlock: 'egypt', opponents: [ZO('adventurer', 104), ZO('parasol', 108, null, null, 0.9), ZO('excavator', 112, null, null, 0.85)] },
    { id: 'pirate', name: 'Pirate Seas League', coins: 1000, xp: 75, unlock: 'egypt', opponents: [ZO('pirate', 112, null, null, 1.3), ZO('cowboy', 122, null, null, 1.1), ZO('pirate', 132, 'Captain Deadbeard', { skin: 'gold' }, 0.95)] },
    { id: 'beach', name: 'Big Wave Beach League', coins: 1080, xp: 78, unlock: 'pirate', opponents: [ZO('surfer', 136), ZO('fisherman', 140, null, null, 0.9), ZO('octo', 146, null, null, 0.85)] },
    { id: 'frost', name: 'Frostbite League', coins: 1150, xp: 82, unlock: 'pirate', opponents: [ZO('yeti', 146, null, null, 1.2), ZO('football', 160, 'Ice Hunter', { skin: 'crystal' }, 0.85), ZO('gargantuar', 166, 'Ice Gargantuar', { skin: 'crystal' }, 0.8)] },
    { id: 'jurassic', name: 'Jurassic Marsh League', coins: 1220, xp: 86, unlock: 'frost', opponents: [ZO('caveman', 170), ZO('bully', 178, null, null, 0.8), ZO('gargantuar', 186, 'Jurassic Gargantuar', { skin: 'zombie' }, 0.7)] },
    { id: 'darkages', name: 'Dark Ages League', coins: 1300, xp: 90, unlock: 'frost', opponents: [ZO('knight', 188, null, null, 0.9), ZO('imp', 202, 'Imp Dragon Rider', { skin: 'rainbow' }, 0.6), ZO('knight', 208, 'King Knight', { skin: 'gold' }, 0.65)] },
    { id: 'neon', name: 'Neon Mixtape League', coins: 1400, xp: 95, unlock: 'darkages', opponents: [ZO('punk', 212), ZO('glitter', 218, null, null, 0.9), ZO('boombox', 226, null, null, 0.8)] },
    { id: 'future', name: 'Far Future League', coins: 1500, xp: 100, unlock: 'darkages', opponents: [ZO('robot', 228, null, null, 0.75), ZO('robot', 238, 'Mecha Zombie', { skin: 'galaxy' }, 0.75), ZO('gargantuar', 248, 'Gargantuar Prime', { skin: 'galaxy' }, 0.6)] },
    { id: 'modern', name: 'Modern Day League', coins: 1700, xp: 110, unlock: 'future', opponents: [ZO('brickhead', 252), ZO('wizard', 262, null, null, 0.85), ZO('shieldbot', 275, null, null, 0.75)] },
  ];
  // Plant Duels: battle other gardeners' plants (the "battle plants" option). Opponent: species, stage, element, fuse, lv.
  const PO = (name, species, stage, lv, extra, k) => Object.assign({ name, species, stage, lv, k }, extra || {});
  const PLANT_LEAGUES = [
    { id: 'seedling', name: 'Seedling Cup', coins: 30, xp: 10, opponents: [PO('Pip', 'peashooter', 0, 4), PO('Sunny', 'sunflower', 0, 7), PO('Nutty', 'wallnut', 0, 10)] },
    { id: 'sprout', name: 'Sprout Cup', coins: 90, xp: 20, unlock: 'seedling', opponents: [PO('Frosty', 'snowpea', 1, 18, null, 0.75), PO('Boomer', 'cherrybomb', 1, 22, { element: 'fire' }, 0.7), PO('Lobby', 'cabbagepult', 1, 28)] },
    { id: 'bloom', name: 'Bloom Cup', coins: 260, xp: 34, unlock: 'sprout', opponents: [PO('Chompers', 'chomper', 1, 36, { element: 'fire' }, 0.75), PO('Fumey', 'puffshroom', 1, 44, null, 0.85), PO('Cobby', 'kernelpult', 2, 52, { fuse: { item: 'army' } })] },
    { id: 'masters', name: 'Garden Masters Cup', coins: 700, xp: 60, unlock: 'bloom', opponents: [PO('Gatling Gus', 'peashooter', 2, 70, { element: 'electric', fuse: { item: 'army' } }, 0.85), PO('Stella', 'starfruit', 2, 86, { element: 'magic' }), PO('Tallulah', 'wallnut', 2, 100, { element: 'rock', fuse: { with: 'cherrybomb' } }, 0.7)] },
    { id: 'champion', name: 'Champion Garden Cup', coins: 1400, xp: 95, unlock: 'masters', opponents: [PO('Blaze', 'snapdragon', 2, 140, { element: 'fire', fuse: { item: 'knight' } }, 0.85), PO('Lumen', 'laserbean', 2, 180, { element: 'laser', fuse: { with: 'sunflower' } }, 0.85), PO('Queen Petunia', 'sunflower', 2, 230, { element: 'magic', fuse: { item: 'crown' }, skin: 'gold' }, 0.7)] },
  ];
  const BATTLE = {
    hpBase: 40, hpPerStamina: 5, hpPerLevel: 1,
    atkBase: 12, atkPerPower: 2.2,
    defBase: 10, defPerStamina: 1.1, defPerSwim: 0.9,
    spdBase: 10, spdPerRun: 2,
    evaPerFly: 0.006, evaMax: 0.25,
    stab: 1.25, strong: 1.5, weak: 0.75, critBase: 0.06, critMult: 1.6,
    stageMult: [0.5, 0.6, 0.75, 1, 1.33, 1.66, 2], // index = stage + 3
    loseCoinsShare: 0.2,
    xpSplit: { power: 1.2, stamina: 1, run: 0.6, fly: 0.4, swim: 0.4 }, loseXpShare: 0.35, winCoinStep: 0.25, clearCoins: 3,
    itemDrop: 0.1, // chance a won league battle also drops a fusion item
  };

  // ---------- New plants: what unlocks each one (its seed packet is the reward, and it goes on sale in the shop) ----------
  // keys: race:<series>-<tier> (first win), league:<id> / cup:<id> (cleared), boss:<id> (first defeat). 'starter' = the next
  // starter plant the player doesn't have yet.
  const UNLOCKS = {
    'race:frontyard-0': 'starter', 'league:lawn': 'starter',
    'race:frontyard-1': 'wallnut', 'race:graveyard-0': 'puffshroom', 'race:graveyard-1': 'sunshroom',
    'race:pirate-0': 'coconut', 'race:pirate-1': 'cabbagepult', 'race:grand-0': 'starfruit',
    'race:frontyard-2': 'marigold', 'race:graveyard-2': 'hypnoshroom', 'race:pirate-2': 'kernelpult', 'race:grand-1': 'bloomerang', 'race:grand-2': 'infinut',
    'race:desert-0': 'cactus', 'race:desert-1': 'spikeweed', 'race:desert-2': 'torchwood', 'race:rooftop-0': 'lightningreed', 'race:rooftop-1': 'blueberry', 'race:rooftop-2': 'laserbean',
    'race:jungle-0': 'lilypad', 'race:jungle-1': 'tanglekelp', 'race:snowy-0': 'iceberg',
    'league:backyard': 'snowpea', 'league:night': 'cherrybomb', 'league:pool': 'potatomine', 'league:roof': 'squash', 'league:egypt': 'jalapeno', 'league:pirate': 'bonkchoy',
    'league:frost': 'garlic', 'league:darkages': 'snapdragon', 'league:future': 'magnetshroom',
    'boss:gargantuar': 'doomshroom', 'boss:zombot': 'pumpkin',
    // the 30 newer plants
    'cup:seedling': 'splitpea', 'cup:sprout': 'threepeater', 'cup:bloom': 'scaredyshroom', 'cup:masters': 'firepeashooter', 'cup:champion': 'bananalauncher',
    'race:jungle-2': 'gravebuster', 'race:snowy-1': 'hurrikale', 'race:snowy-2': 'iceshroom', 'race:volcano-0': 'hotpotato', 'race:volcano-1': 'pepperpult', 'race:volcano-2': 'plantern',
    'race:starlight-0': 'empeach', 'race:starlight-1': 'magnifyinggrass', 'race:starlight-2': 'electriccurrant',
    'boss:plankwalker': 'cattail', 'boss:sphinx': 'redstinger', 'boss:frostmammoth': 'stunion', 'boss:darkdragon': 'shadowshroom', 'boss:tomorrowtron': 'citron',
    'league:west': 'peapod', 'league:lostcity': 'endurian', 'league:beach': 'guacodile', 'league:jurassic': 'umbrellaleaf', 'league:neon': 'celerystalker', 'league:modern': 'moonflower',
    'boss:warwagon': 'chilibean', 'boss:gondola': 'springbean', 'boss:sharktronic': 'seashroom', 'boss:mechasaur': 'coffeebean', 'boss:masher': 'blover',
  };

  // ---------- Seed packets ----------
  // A normal packet grows its species. Special packets give a random unlocked species a special skin (and a head start).
  // taps: waters needed to plant it. bonus: XP to every stat. hatchWith: an element core it is born with ('random' = any).
  const SEEDS = {
    normal: { name: 'Seed Packet', taps: 5 },
    golden: { name: 'Golden Seed Packet', skin: 'gold', taps: 8, bonus: 60, price: 1250, desc: 'Grows a shiny gold plant with a head start in every stat.' },
    rainbow: { name: 'Rainbow Seed Packet', skin: 'rainbow', taps: 8, bonus: 30, price: 2250, hatchWith: 'random', desc: 'Grows a rainbow plant born with a random element.' },
    crystal: { name: 'Crystal Seed Packet', skin: 'crystal', taps: 8, bonus: 45, price: 3000, hatchWith: 'magic', desc: 'Grows a glittering crystal plant born with Magic.' },
    galaxy: { name: 'Galaxy Seed Packet', skin: 'galaxy', taps: 8, bonus: 30, price: 2000, desc: 'Grows a twinkly galaxy plant full of tiny stars.' },
    ghost: { name: 'Ghost Seed Packet', skin: 'ghost', taps: 6, bonus: 10, price: 700, spooky: true, hatchWith: 'dark', desc: 'Grows a friendly see-through ghost plant. Boo!' },
    zombie: { name: 'Zombie Seed Packet', skin: 'zombie', taps: 6, bonus: 10, price: 900, spooky: true, desc: 'Grows a goofy zombified plant. Braaains?' },
  };
  const SHOP_SEEDS = ['golden', 'rainbow', 'crystal', 'galaxy', 'ghost', 'zombie'];
  const SPECIAL_SEEDS = ['ghost', 'zombie', 'galaxy'];      // the gumball 'specialseed' prize picks one of these
  const SKINS = { gold: { name: 'Gold' }, rainbow: { name: 'Rainbow' }, crystal: { name: 'Crystal' }, galaxy: { name: 'Galaxy' }, ghost: { name: 'Ghost' }, zombie: { name: 'Zombified' } };

  // ---------- Gumball machine ----------
  // price per gumball. prizes: [type, weight]. Prize types are handled in state.gumball().
  const GUMBALL = {
    small: { name: 'Gumball', price: 25, prizes: [['coins', 20], ['fruit', 24], ['goldfruit', 2], ['shard', 18], ['core', 2.5], ['seed', 6], ['fitem', 3], ['specialseed', 1], ['goldenseed', 0.25]], coins: [8, 40] },
    mega: { name: 'Mega gumball', price: 150, prizes: [['coins', 14], ['goldfruit', 10], ['shard', 14], ['core', 10], ['seed', 14], ['fitem', 14], ['specialseed', 6], ['goldenseed', 3], ['rainbowseed', 1]], coins: [60, 240] },
  };
  const SHINY_CHANCE = 1 / 30;                        // a plant sometimes grows up Shiny
  // selling a plant: base + per total level + per stage, plus extra for fusions and special skins
  const SELL = { base: 20, perLevel: 6, stage: [0, 100, 400], fused: 250, skin: 300 };
  const NAMES = ['Pip', 'Sprig', 'Bean', 'Sunny', 'Leafy', 'Buddy', 'Clover', 'Bloom', 'Petal', 'Basil', 'Olive', 'Sage', 'Ivy', 'Fern', 'Mossy', 'Hazel',
    'Maple', 'Acorn', 'Kiwi', 'Poppy', 'Daisy', 'Tulip', 'Twig', 'Peanut', 'Bubbles', 'Sparky', 'Ziggy', 'Rocky', 'Frosty', 'Blaze', 'Dot', 'Pickle', 'Noodle', 'Tater',
    'Squish', 'Biscuit', 'Waffle', 'Mochi', 'Nugget', 'Pebble', 'Juniper', 'Wren', 'Fennel', 'Rowan', 'Sprout', 'Dewdrop', 'Honey', 'Gumdrop', 'Toffee', 'Zephyr'];

  // ---------- Day / night ----------
  const CLOCK = { phaseMinutes: 15, fadeSeconds: 45 }; // switches every 15 real minutes

  window.PSDATA = { STATS, STAT_META, ELEMENTS, MOVES, ROLES, PLANTS, STARTERS, FUSION_NAMES, ELEMENT_INFO, SHARDS_PER_CORE, AREA_ELEMENTS, FUSION_ITEMS, FUSION,
    EVO, LEVEL_MOVES, BONUS_MOVES, PLANT_TYPE_MOVES, ALT_ATTACKS, SPARE_MOVES, STRONG_SPARES, AREAS, AREA_ORDER, GROWTH, DROPS, FRUITS, TREE, RACE_TIERS, RACES, RACE_PLACE_SHARE, RACE_STAT, ZOMBIES, LEAGUES, PLANT_LEAGUES, BATTLE, UNLOCKS,
    SEEDS, EGGS: SEEDS, SHOP_SEEDS, SPECIAL_SEEDS, SKINS, GUMBALL, SHINY_CHANCE, SELL, NAMES, CLOCK };
})();
