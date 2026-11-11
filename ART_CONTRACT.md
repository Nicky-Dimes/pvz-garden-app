# PVZ Garden — art contract (technical)

What new art must match so it drops into the game without code changes, and where code
changes would be needed. The longer guide is `PROJECT/docs/pvz-v2-art-guide.md`.

## Character sprites (the route that works today)

| | Plants and zombies | Zombosses |
|---|---|---|
| Logical canvas | **64 × 64 px** | **96 × 96 px** |
| Shown at | 4× (256 × 256 frame) in pop-ups; scaled per scene elsewhere | 4× (384 × 384) |
| Facing | right (the game mirrors zombies) | right |
| Base line | lowest outline row is row 61; the character stands centred near x = 32 | base on rows 80–94, centred near x = 48 |
| Edges | nothing may touch the frame edge; keep row 0 free (a 2–3 px hop is added in code) | same |
| Pixels | fully opaque or fully empty; no soft edges, no anti-aliasing | same |
| Plant heights | stage 1 about 36–40 px, stage 2 about 44–48, stage 3 about 50–56 | — |

Stored format (made by the tools, never by hand): `PX.v2ai.add(kind, id, stage, { pal,
rle, eyes })` in `pvz-garden/art-v2-ai-NN.js`. `pal` is the sprite's colour list, `rle`
is one run-length row per pixel row, `eyes` are boxes `[x, y, w, h]` used to repaint the
eyes for blink, happy, sad and cross moods (omitted for characters with no eyes).

`kind` is `plant`, `zombie` or `boss`; `id` is the id in `data.js` (never rename ids);
`stage` is 0, 1 or 2 for plants.

## The sheet pipeline (how the first 36 plant families were made)

1. `ART_PIPELINE/sheets/sheet-NN-template.png` (1536 × 1536) shows nine characters in a
   3 × 3 grid: for plants, one family per row with stages left to right; zombies nine
   to a sheet; Zombosses four to a sheet.
2. `sheet-NN-prompt.txt` names each character and lists the family's rules for it.
3. An image tool redraws the sheet in the approved style on a flat cream background
   (`#FEF6DD`), same grid, same order, all facing right, no text or borders.
4. The result is saved as `sheet-NN-result.png`.
5. `node tools/ai_process.js "<folder with results>"` slices the cells, removes the cream
   background, reduces each cell to a 64 × 64 indexed sprite with its base on row 61,
   finds the eye boxes, writes `art-v2-ai-NN.js` and adds it to `index.html`.
   This step needs macOS Google Chrome and the local server on port 8770
   (`SETUP_AND_CHECKS.md`). `pvz-garden/_ai-slice.html` is the slicer page and can be
   used by hand in any browser.
6. `node tools/v2_export.js` checks every frame (edges, opacity, base line).

A sheet that comes back with a character missing, extra, out of order or facing left is
simply run again.

## What a single sprite cannot do (needs code if you want more)

- **Real animation.** Today each character is one picture. To give a character drawn
  walk, attack, hurt and knocked-out frames, `art-v2-ai.js` would need to accept several
  frames per look (for example `add(kind, id, stage, data, 'walk1')`) and `art-core.js`
  `PX.sprig` would need to pick them by pose. The pose names the scenes ask for are
  listed in `PROJECT/docs/PVZ_GARDEN_ART_PIPELINE_AUDIT.md` section 4.
- **Higher resolution than 64 × 64.** Scenes draw into low-resolution buffers and scale
  with nearest-neighbour, so a sharper picture is thrown away unless the scene renderer
  changes too (audit section 7.3). The family chose 64 × 64 for this reason.
- **Costumes.** Hats, fusion parts and element toppers are code-drawn and fitted to the
  body's measured head. A body with an unusual silhouette can make them sit badly;
  check a few costumes on every new body.

## Everything that is not a character

Gardens, houses, props, backdrops, effects, fish, arcade and interface pictures are
drawn by functions in `art-world*.js`, `art-aqua*.js`, `art-arcade.js`, `art-event.js`
and `art-trophies.js`. There is no picture-file route for them yet. Replacing them with
drawn pictures means adding a loader (the unused `art-hd-loader.js` shows one way) and
is a code task, not only an art task.

## Rules that are easy to break

- Only the characters the family named look cross; most are friendly. Some have no
  mouth, some no eyes, mushrooms have no feet. See the guide, section 6.
- One level of detail everywhere: a new-style character next to an old-style prop
  looks wrong, so finish whole groups.
- Show one finished character in the game beside the approved reference before making
  a whole set.
