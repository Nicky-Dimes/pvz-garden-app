# PVZ Garden — notes for ChatGPT

You are receiving the real project so the art can be improved. Claude takes it back
afterwards, checks it and prepares it for the family to publish.

## Do first

1. Read `README_START_HERE.md`, `DEVELOPMENT_STATUS.md` and `ART_CONTRACT.md`.
2. Look at the approved style: `ART_PIPELINE/sheets/STYLE-approved-reference.png`.
3. Look at what the new art looks like in the game today:
   `PROJECT/docs/pvz-ai-sample-garden.png`, `pvz-ai-sample-survival.png`,
   `pvz-ai-sample-sheet01-conversion.png`.
4. Run the game and the checks (`SETUP_AND_CHECKS.md`). Node is all that is needed.

## What needs the most work (in order)

1. **Finish the character set in one style.** 105 plant families, 81 zombies and 12
   Zombosses still have the old art. The templates and prompts are ready
   (`ART_PIPELINE/sheets/`, sheets 13 onward).
2. **Movement.** Every new character is a single still picture with small code tricks.
   Drawn walk, attack, hurt and knocked-out frames would be the biggest visible gain
   (needs the small code change described in `ART_CONTRACT.md`).
3. **Conversion quality.** Check the 36 converted families at 64 × 64 for lost detail,
   wrong eye boxes and muddy recolours; improve the slicer or the sprites.
4. **Scenery and interface.** Gardens, houses, backdrops and icons are still plain
   code drawings in the old look.

## Must not break

- **Saves.** Children have progress in the published game. Do not rename or remove ids
  in `data.js`, do not change storage keys, and add a `migrate()` step in `state.js`
  for any change to the save's shape.
- **`node tools/check_pvz.js` must still print "All checks passed."**
- Script order in `index.html`; the generated `art-v2-ai-NN.js` files (regenerate them
  with the tools, do not hand-edit).
- The family's character rules (`PROJECT/docs/pvz-v2-art-guide.md` section 6).
- Performance on older iPads: no large images decoded per frame, no per-frame
  re-measuring of costumes, keep sounds capped as they are.
- Nothing is to be published. The family publishes after seeing it.

## Please do not

- Replace approved new-style sprites with code-drawn art.
- Restyle with thin outlines, tiny dot eyes or perfectly round heads (all rejected).
- Make a whole set before one sample has been seen in the game.
- Delete old art files; the game falls back to them for anything not yet replaced.

## What to send back

1. The whole `PROJECT/` folder, same structure.
2. Any new sheet results as `sheet-NN-result.png`, plus the sources of any other new
   pictures.
3. A file `CHANGES_FROM_CHATGPT.md`: every file added or changed and why; which
   characters now have new art; any code change to how sprites are loaded or posed;
   the output of `node tools/check_pvz.js`; and what was not run.
4. Please do not reformat code you are not changing.

This snapshot is kept in Git as tag `handoff-2026-11-11` on branch `pixel-art-64`, so
replacing files in place is fine.
