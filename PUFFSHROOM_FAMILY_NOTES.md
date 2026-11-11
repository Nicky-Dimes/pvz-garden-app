# Puff-shroom family production

Actual-game references were downloaded and visually inspected before generation. Shared research is in NEXT_PLANT_REFERENCES.md / NEXT_PLANT_REFERENCES.json.

- Stage 0 Puff-shroom: large purple spotted cap, pale squat stalk, short pale-green stalk trumpet and friendly oval eyes.
- Stage 1 Fume-shroom: purple cap-mounted nozzle, pale squat stalk with mad brows; do not attach the nozzle to stalk.
- Stage 2 Gloom-shroom: round vented purple dome with upward-looking pale eyes and only a narrow pale base; do not make an ordinary tall mushroom.
- Mushrooms have no feet, shoes, human limbs or leaf pedestal; stalk/base flares directly to ground.
- All stages use right-facing three-quarter poses and the same approved Peashooter pixel rendering style.
- Clip order: idle2, walk4, attack3, hurt1, knockedOut2, cheer2, sleep1. Each stage has 15 separately drawn source frames.
- Canvas import target: 64×64, lowest solid row61, stage maxH38/46/54, maxW56.

Generation and conversion are complete: **3 looks,45 drawn frames**, all reviewed as source and indexed sprite atlases. No runtime/index/data/save files were modified by this production task. Main agent can integrate with:

```sh
node tools/animation_ingest.js art-src/pvz-ai/animation/puffshroom-family-frames.json --out art-v2-ai-puffshroom-family.js
```

Files in `PROJECT/art-src/pvz-ai/animation/`:

- `puffshroom-family-spec.json`: source slicing settings, per-frame source face boxes and separate source cap landmarks; explicit cap-top hat overrides are recorded for each frame.
- `puffshroom-family-frames.json`:45 indexed64×64frames with immutable metadata.
- `puffshroom-{0,1,2}-actual-source.png`:15-frame image-generation source atlases, also copied under game `_ref/animation/`.
- `puffshroom-{0,1,2}-indexed.png`:4× indexed previews, visually inspected.

`PUFFSHROOM_FRAME_QC.json` records passing checks: all45frames have64×64canvases, exact bottom row61, free edge margins, centered lower support, ≤52palette entries, one palette per stage, bounded per-frame face/cap landmarks and distinct drawn frames within each multi-frame clip. These checks do not replace the main runtime/costume/browser tests.

Manual review: no shoes/feet/limb substitutes or detached effects; stage0's trumpet is on the pale stalk; stage1's purple nozzle is on the cap and mad brows remain visible; stage2 is the original ring-vent dome with upward-looking eyes and a narrow pale base. Quiet closed eyes identify KO/sleep poses.

Costume metadata: face boxes describe the stalk face for Puff/Fume and dome face for Gloom. Separate source cap landmarks place hat anchors above cap/dome rather than on the stalk face. The final spec stores explicit logical `headOverrides` so rerunning the standard slicer reproduces them.

Source references: https://pvsz2.ru/plant/78 ; https://pvsz2.ru/plant/32 ; https://plantsvszombies.fandom.com/wiki/Gloom-shroom . Canonical images are reference-only; generated sprites are original pixel art.

