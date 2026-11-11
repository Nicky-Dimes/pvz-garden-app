# PVZ Garden — development status at handoff (2026-11-11)

## In one paragraph

The game is complete and stable. Every check passes. The published version (build
`2026.10.24-1500-e28fee`) draws all of its art in code as small pixel sprites. A
replacement of the character art with the family's approved pixel style has started on
an unpublished branch: 36 of 141 plant families are done. Everything else, including
every zombie and every Zomboss, still has the old code-drawn art, so the branch
currently mixes two looks.

## What works (checked today)

`node tools/check_pvz.js` → **All checks passed.** It covers: every script loads, every
plant, zombie and boss draws in every pose, moves and unlocks are consistent, saves
load, migrate, back up and restore, storage keys stay separate from the family's other
games, and the rules run on a loaded save (planting every seed, every league, cup,
Zomboss, the Tower and the aquarium).

Not checked today: play on a real iPad or iPhone, sound, and the look of the mixed art
in each scene.

## Size of the game

| Thing | Count |
|---|---|
| Plant families (each has 3 growth stages) | 141 (423 looks) |
| Zombies | 81 |
| Zombosses | 12 |
| Fusion parts / costume items / skins | 36 / 26 / 21 |
| Elements (creature, shard, core, icon for each) | 11 |
| Garden themes and houses | 16 each |
| Battle effect styles / effect sprites | 32 / 37 |
| Other scenes | races, Survival (lane defence), Adventure map, Arcade (mini-games, claw machine), aquarium, shop, almanac, Halloween event |

Source: about 48,000 lines of JavaScript in 62 files. The full machine-made inventory
of every drawn asset is `PROJECT/docs/pvz-art-asset-manifest.json` (4,495 entries).

## Where the art stands

| Art | State |
|---|---|
| 36 plant families (sheets 1–12: Peashooter … Threepeater), 3 stages each | **New style**, converted from the family's ChatGPT sheets into 64×64 sprites (`art-v2-ai-01.js` … `-12.js`) |
| The other 105 plant families | old code-drawn art |
| All 81 zombies, all 12 Zombosses | old code-drawn art |
| Costumes, fusion parts, element toppers | code-drawn, layered on top of whichever body is used |
| Gardens, houses, props, battle backdrops, effects, aquarium, arcade, interface icons | code-drawn |

Sheets still to make: 49 of the 61 prepared templates (`ART_PIPELINE/sheets/`). The
list of which characters are on which sheet is in `HOW TO RUN THE SHEETS.txt` there.

## Known art problems

1. **Two looks at once.** New-style plants stand next to old-style plants and zombies.
2. **One pose per character.** Each new sprite is a single idle picture. Walk, cheer,
   blink, sleep, hurt, attack and knocked-out are made from it in code (a small hop,
   repainted eyes, a slump). Nothing really moves its body.
3. **Eye repainting is fragile.** Moods are painted into boxes recorded at ingest time;
   on a few sprites the box is slightly off (fix-ups live in `_ai-fixups.json`).
4. **Recolours are a hue shift.** Element and fusion variants tint the sprite; some
   combinations look muddy.
5. **Old art is low resolution.** The code art was designed on a 32×32 grid and doubled.
6. **Scenery is plain.** Lawns, fences, houses and backdrops are simple code drawings.
7. **Earlier attempts that were rejected** (do not repeat): thin-outline restyle,
   tiny dot eyes, perfect-circle heads, code-drawn "illustrated" vector characters, and
   code-drawn versions of the new style.

## Other things to know

- The live site still runs the October build. Nothing on this branch has been published.
- `art-hd-loader.js` / `art-hd-manifest.js` are an earlier, unused route for full-size
  illustrated pictures (the manifest is empty, so it does nothing).
- Saves must never break: the family's children have progress in the published game.
- Pages whose names start with `_` in `pvz-garden/` are review and conversion tools,
  not part of the game.
