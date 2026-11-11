# Laser Bean family production notes

## Actual reference inspected

Page: https://pvsz2.ru/plant/55

Image: https://pvsz2.ru/statics/plants-big/55.png

Preserved: `PROJECT/art-src/pvz-ai/research/next-plants/laserbean.png`, also under `_ref/actual/laserbean-actual.png`.

Canonical actual-game anatomy: tall asymmetric lime-green kidney bean resting on its broad lower lobe, two enormous pale off-white eyes with small red pupils, a forward green-flesh hood/lip above the eyes and a thin green antenna angled back-left. Antenna ends in a green ball with a tilted green induction loop near it. The hood is bean flesh, not a cap or metal robot visor. There are no canonical base leaves. The tiny actual frown is omitted to retain the project's mouthless identity and friendly resting rule.

Data stages remain Laser Bean → Beam Bean → Mega Laser Bean. Custom evolutions naturally increase bean mass/height and antenna prominence, with two/three slender attached induction loops. They do not become metal robots, guns or space suits; the actual white-eye/small-red-pupil proportions remain. Custom stages reuse base canonical identity reference.

## Animation plan

15 source frames per stage, with explicit row/cell prompts: row1 idleA,idleB,walk1,walk2,walk3; row2 walk4,attackWindup,attackRelease,attackRecovery,HURT; row3 KO1,KO2,CHEER1,CHEER2,SLEEP. Body movement is whole-bean tilt/stretch/compression and antenna flex, not limbs. Attacks focus/brighten drawn red pupils without external beams; runtime supplies beam effects. Calm/friendly resting eyes, mouthless in all actions. Every antenna part remains attached.

Exact prompts: `PROJECT/art-src/pvz-ai/animation/laserbean-family-prompts.json`.

Status: complete and frozen. No queue/index/runtime/progress/shared tools edits or ingestion; main agent owns integration.

## Completed artifacts

- `PROJECT/art-src/pvz-ai/animation/laserbean-{0,1,2}-actual-source.png` — preserved final source atlases, also under `_ref/animation/`.
- `PROJECT/art-src/pvz-ai/animation/laserbean-family-spec.json` — layout, body/hood head boxes, recorded pupil-height overrides and precise antenna-loop background seeds; `_ref/animation/` copy included.
- `PROJECT/art-src/pvz-ai/animation/laserbean-family-frames.json` —45 indexed drawn frames.
- `PROJECT/art-src/pvz-ai/animation/laserbean-{0,1,2}-indexed.png` — reviewed contact sheets.
- `PROJECT/art-src/pvz-ai/animation/laserbean-eye-anchor-analysis.json` — one-time source red-pupil measurements; closed-eye poses retain recorded geometric anchors.
- `PROJECT/art-src/pvz-ai/animation/laserbean-family-provenance.json` — source hashes/QC report.

## Quality review

All sources and indexed sheets were visually inspected. Canonical organic kidney shape, integrated green flesh hood, huge white eyes/small red pupils and attached green ball/ring antenna remain clear. No metal robot substitute, leaves, limbs, mouth or detached beam effects. Source induction loops progress1/2/3; exact cream-color flood seeds clear enclosed antenna gaps while preserving green wires and white eye surfaces. Attacks visibly compress/thrust/recover. Row2col5 is a distinct one-eye hurt wince; final-row cells match KO1,KO2,cheer1,cheer2,sleep.

All45 checks pass: exact64×64 rows, base61, clear margins, support midpoint32±10, consistent palettes, valid symbols and bounded head anchors. All15frames in each stage are distinct even across clips. Palettes24/27/28 colors; action heights26–38,31–46 and38–54px. Main agent owns runtime/export validation.
