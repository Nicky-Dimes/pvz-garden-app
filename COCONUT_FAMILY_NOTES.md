# Coconut Cannon family production notes

## Actual reference inspected

Page: https://pvsz2.ru/plant/20

Image: https://pvsz2.ru/statics/plants-big/20.png

Preserved reference: `PROJECT/art-src/pvz-ai/research/next-plants/coconut.png`, also under `_ref/actual/coconut-actual.png`.

Observed canonical anatomy: brown fibrous coconut-shell cannon, hollow right-facing oval muzzle with thick white coconut-flesh/pith rim and dark interior. A pale side eye sits under a thick angular dark-brown angry brow. Rear upper rope fuse curves back-left. Organic base uses round-ended brown coconut/wood support logs under green husk leaf straps; these fixed supports are neither human feet nor wheeled cart. No separate face mouth. The inspected icon shows a large active fuse flash; source animation retains only a tiny attached lit wick tip so runtime effects can remain separate.

Data names remain Coconut Cannon → Coco Mortar → Coco Battleship. Only base cannon is canonical; middle/final are project extensions. Mortar uses a deeper steeper single coconut barrel and heavier organic husk cradle. Battleship retains actual organic cannon anatomy as one main plus two smaller connected coconut barrels on a broad log/husk cradle, rather than substituting a literal toy pirate ship or metal turret. Exactly three white-pith-rimmed muzzles, one primary angry side eye; auxiliary barrels have no extra faces.

All stages/actions remain mad, with no separate face mouth, human limbs, feet, metal tank, pilot or costume. New evolutions reuse inspected base canonical reference rather than claiming official game species.

## Animation plan

15 explicitly placed source states per stage: row1 idleA,idleB,walk1,walk2,walk3; row2 walk4,windup,release,recovery,HURT; row3 KO1,KO2,CHEER1,CHEER2,SLEEP. Movement rocks/slides whole organic cradle and flexes husk straps/fuse, never adds legs. Attack raises/loads muzzle, recoils while aiming right, then settles; no detached projectile or flash. KO/sleep keep all shell/cradle parts and close eyes under angry brows. Tiny attached fuse ember dims during rest.

Exact prompts: `PROJECT/art-src/pvz-ai/animation/coconut-family-prompts.json`.

Status: completed and frozen. No queue/index/runtime/progress/shared tools edits or ingestion; main agent owns integration.

## Completed artifacts

- `PROJECT/art-src/pvz-ai/animation/coconut-{0,1,2}-actual-source.png` — final source atlases, with `_ref/animation/` copies.
- `PROJECT/art-src/pvz-ai/animation/coconut-2-initial-single-barrel-draft.png` and `coconut-2-triple-barrel-count-draft.png` — preserved superseded drafts. Image-generation edits added the required two auxiliary coconut barrels, then removed an accidental fourth tube in row2col2,row2col5,row3col3,row3col4. Final source has exactly3muzzles in every cell.
- `PROJECT/art-src/pvz-ai/animation/coconut-family-spec.json` — source layout, per-frame main-barrel head anchors and size/base constraints; copy under `_ref/animation/`.
- `PROJECT/art-src/pvz-ai/animation/coconut-family-frames.json` —45 indexed frames.
- `PROJECT/art-src/pvz-ai/animation/coconut-{0,1,2}-indexed.png` — reviewed previews.
- `PROJECT/art-src/pvz-ai/animation/coconut-family-provenance.json` — source hashes and QC.

## Quality review

All source and indexed sheets were visually inspected. Coconut shell grain, white flesh muzzle rims, dark bores, mad pale side eye/brow, husk straps, coconut-log cradle and attached tiny fuse ember follow actual-game identity. No separate face mouth, feet, human limbs, literal toy ship or metal gun replacement. Stage0/1 have one muzzle each; final stage consistently has one main plus two auxiliary muzzles in all15frames, including KO/sleep. Final row and hurt cell follow explicit requested states.

All45 checks pass: exact64×64 canvas, base61, free edges, support midpoint32±10, palette consistency, valid pixel symbols and bounded finite head anchors. All15frames per stage are unique even across clips. Palettes27/27/28; action height ranges31–38,34–46 and37–49px. The final triple-barrel plant remains naturally low/wide within56px width cap. Main agent owns export/runtime validation.
