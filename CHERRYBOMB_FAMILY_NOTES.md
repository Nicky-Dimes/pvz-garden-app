# Cherry Bomb family production notes

Actual reference inspected: https://pvsz2.ru/plant/16

Image: https://pvsz2.ru/statics/plants-big/16.png

Local research reference: `PROJECT/pvz-garden/_ref/actual/cherrybomb-actual.png`.

Observed anatomy: two glossy red cherries with deep wine-red underside shading, joined by curved green forked stems and one top leaf. Front fruit sits lower than rear fruit. Both faces have heavy inward-slanted brows, off-white eye whites, small olive/dark pupils and angry mouths with sparse blocky teeth. There are no roots, human limbs, feet, shoes or pots.

Production direction: follow actual fruit/stem silhouette in the approved rich pixel style. Retain family anger at every growth stage and in idle, attacks, cheer, KO and sleep. Stage 0 has two cherries/one leaf; stage 1 has a broader stronger pair/two leaves; stage 2 extends the family to exactly three cherries/three leaves. These extra evolutions are project-specific; the canonical game reference supplies their anatomy rather than an invented substitute body.

Style reference inspected: approved new Peashooter source `exec-fa5d028b-d48a-4089-acb6-9c134d4e10df.png`. This supplies outlines, pixel shading, source-atlas layout and material richness only.

Frame contract per stage: idle 2, walk 4, attack 3, hurt 1, knockedOut 2, cheer 2, sleep 1 (15 total). Attacks use intact fruit compression/inflation and connected stem flex; runtime effects handle explosion. Walk uses body/fruit bounce and tilt without adding legs. Cream-background source preservation and recorded head anchors are required.

Status: complete source and indexed-art handoff; runtime integration is owned by the main agent. No IDs, game data, save files, index.html or shared runtime files have been changed by this task.

## Completed artifacts

- `PROJECT/art-src/pvz-ai/animation/cherrybomb-{0,1,2}-actual-source.png` — three preserved source atlases, also copied under `pvz-garden/_ref/animation/`.
- `PROJECT/art-src/pvz-ai/animation/cherrybomb-family-spec.json` — reproducible 5×3 source slicing, per-frame front-fruit head boxes, background-gap seeds, 64px canvas/base61 and stage max-heights38/46/54.
- `PROJECT/art-src/pvz-ai/animation/cherrybomb-family-frames.json` — 3 stages × 15 drawn frames = 45 indexed frames, ready for the main agent's ingestion.
- `PROJECT/art-src/pvz-ai/animation/cherrybomb-{0,1,2}-indexed.png` — all three indexed contact sheets, visually reviewed.

## Quality review

All source and indexed sheets were visually inspected. Stage0/1 have exactly two cherries throughout; stage2 has three throughout. Angry faces persist in every stage, including cheer, hurt, KO and sleep; no feet, limbs, pots or detached attack effects were introduced. Thin stem gaps are cleared by explicit cream-background flood seeds rather than runtime repainting.

Inline checks of all 45 indexed frames passed: exact64×64 rows, lowest outline row61, no frame-edge contact, support midpoint within32±10, finite head anchors inside canvas, and distinct hashes within each multi-frame clip. Stage palettes contain22/19/24 colors respectively and are consistent across all frames of each stage. These checks supplement, rather than replace, the main agent's ingestion/export/runtime validation.

The recorded head anchor follows the front lower-left cherry, retaining a stable costume target rather than switching among fruit in the cluster. Bright cherry specular highlights and angry pale eyes remain drawn source pixels; no runtime eye replacement is needed.
