# Iceberg Lettuce family — actual-game redraw

Owner: `potatomine_family` production queue. Existing family artifacts were checked before starting; none were present. This batch does not edit the queue, index, runtime, game data, save files or shared progress documents.

## Reference inspected

- Page: https://pvsz2.ru/plant/47 .
- Actual render: https://pvsz2.ru/statics/plants-big/47.png .
- Saved reference: `PROJECT/art-src/pvz-ai/research/iceberg-actual.png`.
- Approved pixel style/layout: `/workspace/generated_images/exec-fa5d028b-d48a-4089-acb6-9c134d4e10df.png`.

The actual game identity is a compact turquoise/cyan lettuce head wrapped in overlapping pointed pale-mint/ice-blue leaves. One prominent folded top leaf sweeps upward and forward; two tall black oval eyes with white glints occupy the central face, with no mouth or nose. A low folded frosty leaf base supports the whole rosette. The reference's soft outer glow is not part of the production source.

The new art preserves lettuce layers rather than substituting a generic crystal orb or ice monster. All frost and leaf tips stay attached; no floating shards, aura or particle effects are included. There are no human limbs, separate stem-neck, pot, costume or mouth.

## Stage/animation decisions

IDs and stage names remain `iceberg` 0 Iceberg Lettuce, 1 Frost Lettuce, 2 Glacier Lettuce. Only Iceberg Lettuce is the canonical identity here; later stages are project evolutions. The middle stage adds fuller overlapping rosette layers and frosted jagged leaf tips. The final stage broadens the lettuce crown and adds restrained crystalline facets to actual leaf tips while preserving the central lettuce face. All stages are friendly and mouthless.

Each source has exactly 15 poses in 5 columns ×3 rows: row1 idleA, idleB, walk1, walk2, walk3; row2 walk4, attack windup, strike, recovery, hurt; row3 KO1, KO2, cheer1, cheer2, sleep. Walking uses leaf scoots and body tilt. Attack contracts then flares the attached rosette; the game supplies separate freeze effects. KO folds the intact lettuce low onto its base leaves.

Existing browser converter target: 64×64, base row61, max heights38/46/54 and width56. Source head boxes will track the central lettuce head rather than the lower frost rim.

Status: COMPLETE — all three source sheets and indexed sheets visually reviewed. Exactly15 poses per5×3 atlas; every frame remains friendly/mouthless with the central lettuce face, pointed folded leaf layers and attached frosted leaf base. No grid/pose correction or resource rejection was needed.

All45 frames pass logical64×64 dimensions, clear margins, exact base row61, lower-base center within32±10, consistent palette per stage, bounded finite head anchors and pixel-distinct frames within every multi-frame clip. Palettes22/22/25. QC record: `PROJECT/art-src/pvz-ai/animation/iceberg-family-qc.json`.

Stable files under `PROJECT/art-src/pvz-ai/animation/`: `iceberg-family-spec.json`, `iceberg-family-frames.json`, `iceberg-{0,1,2}-actual-source.png` with matching `_ref/animation` copies, and `iceberg-{0,1,2}-indexed.png`. Frames SHA256: `d7ae7c1d0df5fd385c1f115a7580bb482f5075b81d9f4249e0523b9caf5513ac`.

Generation originals preserved: stage0 `/workspace/generated_images/exec-6bda2849-9cdd-481d-8715-a7ccd536b06a.png`; stage1 `/workspace/generated_images/exec-2c94a6ac-2b29-46d1-9982-09f37f67e69c.png`; stage2 `/workspace/generated_images/exec-b1589212-4b44-4b7e-9f81-a3bc12dfef5a.png`.

Only base Iceberg Lettuce is canonical; the same inspected game render informs the two project evolutions. No runtime/index/queue/shared-progress edits or ingestion were performed. Files freeze at ready-marker handoff; main owns integration and gameplay/costume verification.
