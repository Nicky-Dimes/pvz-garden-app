# PVZ Garden — project architecture

Plain HTML, CSS and JavaScript drawing on `<canvas>`. No framework, no bundler, no
dependencies. `pvz-garden/index.html` loads the scripts in order; opening the folder
through any static web server runs the game.

The detailed reference is `PROJECT/docs/PVZ_GARDEN_ART_PIPELINE_AUDIT.md` (rendering,
scaling, how characters are composed and animated, positioning, performance). This file
is the map.

## Files in `pvz-garden/`

| File | Responsibility |
|---|---|
| `index.html`, `ui.css`, `app.css` | page shell, script order, layout and pop-up styles |
| `pixel.js` | the drawing layer `PX`: `Grid` (art pixels at `K = 2` fine pixels each), blitting helpers (`artW/artH/blit/keepK`), sound |
| `data.js` | all game data `D`: plants, zombies, moves, elements, leagues, unlocks, maps, prices |
| `state.js` | the save `PS.S`, rules, `migrate()`, backups, rewards |
| `app.js` | boot, navigation between scenes, pop-ups, iPad guards, celebrations |
| `garden.js` | the garden scene: planting, pots, visitors, zombie attacks, maps |
| `battle.js` | turn battles, leagues, Zombosses, the move-animation table `ANIM` |
| `race.js`, `survival.js`, `adventure.js`, `arcade.js`, `aquarium.js`, `event.js`, `shop.js`, `menu.js`, `sprouts.js` | the other scenes |
| `audio.js` | music and sound |
| `art-core.js` | builds a character: body + costume / fusion parts / element topper, fitted once per look; `PX.sprig(look, pose)` returns the flipbook frame every scene draws |
| `art-plants*.js`, `art-zombies*.js` | the old code-drawn characters |
| `art-world*.js`, `art-aqua*.js`, `art-fish*.js`, `art-arcade.js`, `art-event.js`, `art-trophies.js` | scenery, props, fish, arcade, event and trophy art (all code-drawn) |
| `art-v2-kit.js` | helpers for the 64×64 "v2" character format |
| `art-v2-ai.js` | runtime for sprites converted from ChatGPT sheets: decodes them, makes the other poses, registers them so `art-core.js` uses them instead of code art |
| `art-v2-ai-NN.js` | the converted sprites, one file per sheet (generated; do not edit by hand) |
| `art-hd-loader.js`, `art-hd-manifest.js` | unused full-size picture route (empty manifest) |
| `version.js` | `'dev'` in source; the build writes the release version |

## How a character reaches the screen

1. A scene asks `PX.sprig(look, pose)`. `look` says kind, id, stage, element, fusion,
   costume; `pose` says walk frame, mood, attack and so on.
2. `art-core.js` looks for a v2 sprite for that id and stage. If `art-v2-ai.js` has one,
   it is used; otherwise the old code art is drawn.
3. Costume items, fusion parts and element toppers are fitted to the resting pose once
   and then follow the head.
4. The result is cached per look and pose and blitted with nearest-neighbour scaling.

Characters face right; zombies are mirrored by the scene. Feet sit on a fixed base row.

## Saves

`localStorage`, keys `pvzg:save:v1:<slot>`, `pvzg:players:v1`, `pvzg:snap:v1:`,
`pvzg:rescue:v1:`. These must never change or collide with the family's other games on
the same site. Any change to the save's shape needs a step in `state.js` `migrate()`.
Art changes must not touch ids in `data.js`: saves refer to plants by id.

## Tools (`PROJECT/tools/`)

| Tool | Use |
|---|---|
| `check_pvz.js` | the full check; must print "All checks passed." |
| `check_art_ids.js` | fast check that every id has art |
| `build_pvz.py` | runs the check, then writes the publishable site to `pvz-garden-app/` |
| `ai_sheets.js` | makes the sheet templates and prompts |
| `ai_process.js`, `ai_ingest.js` | turn a finished sheet into `art-v2-ai-NN.js` |
| `v2_export.js`, `v2_sheet.js`, `render_sheet.js`, `plant_sheet.js` | render art to PNG sheets for review |
| `pvz_art_inventory.js` | regenerates the asset manifest |
| `art_hd_check.js`, `test_art_hd_*.{js,py}`, `pack_hd_art.py`, `hd_art_render.mjs` | belong to the unused full-size picture route |
| `test-saves/` | example saves for testing |

## Fragile things

- Script order in `index.html`.
- Sizing: sprites carry their scale (`.k`); always size and draw through the `PX`
  helpers, never by raw canvas width.
- Costume fitting is measured once on the resting pose. Measuring per frame made hats
  jump; do not go back to that.
- `check_pvz.js` scans `garden.js` for `tree: [` and `home: [`; keep other object keys
  with those names quoted.
- iPad: the page is locked against dragging and bouncing in `ui.css` and `app.js`.
  These guards cannot be tested in a desktop browser.
