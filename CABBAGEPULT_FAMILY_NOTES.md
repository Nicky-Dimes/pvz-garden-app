# Cabbage-pult family production notes

## Reference and direction

- Actual game render visually inspected: `PROJECT/art-src/pvz-ai/research/next-plants/cabbage-pult.png`.
- Source page: https://pvsz2.ru/plant/11 . A community mirror of the game render, used for identity research rather than runtime art.
- Observed anatomy: round layered green cabbage body, lighter ruffled outer leaves, overlapping dark-green base leaves, black oval eyes and raised leafy brows; no separate mouth. Long bent green leaf stalk arches behind/up into a green leaf cup cradling a smaller layered cabbage.
- Approved pixel style/layout: newly redrawn Peashooter source exec-fa5d028b-d48a-4089-acb6-9c134d4e10df.png.
- Latest user direction allows replacing simplified handoff art with actual-game identity in this pixel style. Canonical Cabbage-pult supplies the base; Cabbage Launcher and King Cabbage-pult are project evolutions.

## Stage decisions

- Stage0 Cabbage-pult: canonical round layered cabbage and green leaf-cup launcher; no added bow tie or mouth.
- Stage1 Cabbage Launcher: fuller ruffled body, modest leaf crest, stronger curved leafy stalk and larger loaded cup. Keep all parts organic green plant matter; no crown at middle stage.
- Stage2 King Cabbage-pult: fuller leaf rosette and layered body, stronger catapult with larger cabbage payload, one small three-point gold crown nested on the main face cabbage (not payload).
- Preserve one main face and one un-faced cabbage payload. Do not turn cabbage into a pea, melon, humanoid king or wooden siege cart.
- No arms, legs, shoes or feet. Walk uses root-leaf scoots and cabbage-body squash.

## Animation production

Three 5×3 source sheets have been generated and visually inspected; each contains 15 frames in order: idle2, walk4, attack3, hurt1, knockedOut2, cheer2, sleep1. Attack windup pulls loaded cup back; strike whips the empty cup forward after release with no detached cabbage drawn; recovery reloads an attached cabbage. The game draws its own projectile. Bent leaf stalk remains attached throughout. Hurt/KO keep all parts, use squint/closed eyes and drooping leafy anatomy.

Source illustration is generated using the image tool. Original browser converter handles source cutting, palette indexing and fixed-base placement. Registry/index/runtime/shared progress files remain untouched by this agent.

## Source provenance

- Stage0 source: `PROJECT/art-src/pvz-ai/animation/cabbagepult-0-actual-source.png`, original generated file exec-0cbd50b5-c819-4736-95a6-d5b6f64e3832.png.
- Stage1 source: `PROJECT/art-src/pvz-ai/animation/cabbagepult-1-actual-source.png`, original generated file exec-b681b7cf-dd93-4d6e-ab29-7978f2c2a637.png.
- Stage2 source: `PROJECT/art-src/pvz-ai/animation/cabbagepult-2-actual-source.png`, original generated file exec-1b5a249c-c904-43ea-bc23-964683239be7.png.
- Each source contains 15 distinct poses on a 5×3 grid, 1620×971 native pixels.
- `cabbagepult-family-spec.json` records per-frame source head boxes measured on the main cabbage body, excluding catapult stalk, payload and base leaves. Green component analysis initially merged some connected stalks, so those automatic bounds were replaced by inspected body-only bounds.
- Enclosed cream gaps underneath the arch/cup are keyed with explicit source-background flood seeds (threshold18) selected from enclosed cream-color source components; this uses the existing browser conversion pipeline. No character pixels are painted procedurally.

## Validation and review

All three source sheets and indexed previews were visually inspected. The three stages retain layered green cabbage anatomy; stage0/1 cup swings forward/up at strike, and the final-stage empty cup rises with a braced body (less forward reach than stage0/1). The crown and larger rosette distinguish final stage. There are no detached payload drawings. All sources are original generated pixel art; the inspected game render is used only as identity reference.

Independent JSON checks confirm each stage has 15 unique nonempty 64×64 frames; every lowest pixel row is61; no image touches a canvas edge; support center remains within10px of x32; each stage shares one palette; all numeric head anchors are bounded within64px.

Palette counts: stage0 23; stage1 26; stage2 23. Tallest occupied top rows:24,15,12, respectively, with base61. Stage2 fills less than54px vertically because the wide catapult pose reaches maxW56 first. Source-scale consistency is retained within each stage.

Self-assessment: **good** base Cabbage-pult; **good** Cabbage Launcher; **good** King Cabbage-pult, with a milder final-stage forward throw silhouette than the other stages. Layered cabbage, green leaf cup/stalk and small crown remain readable at64px.

Outputs:

- `PROJECT/art-src/pvz-ai/animation/cabbagepult-family-frames.json`
- `PROJECT/art-src/pvz-ai/animation/cabbagepult-family-spec.json`
- `PROJECT/art-src/pvz-ai/animation/cabbagepult-family-qc.json`
- `PROJECT/art-src/pvz-ai/animation/cabbagepult-{0,1,2}-indexed.png`
- Source/spec copies under `PROJECT/pvz-garden/_ref/animation`.

No registry ingestion, index edit, runtime edit, data/save edit or shared progress edit was made by this agent. Main agent handles integration and app-level tests.

Suggested ingestion from PROJECT:

`node tools/animation_ingest.js art-src/pvz-ai/animation/cabbagepult-family-frames.json --out art-v2-ai-cabbagepult-family.js`
