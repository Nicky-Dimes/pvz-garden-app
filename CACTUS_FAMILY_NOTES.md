# Cactus family production

Status: complete, 45 indexed drawn frames ready for parent integration. Not yet registered in runtime by this task.

## Inspected identity and reference

- Actual game render: https://pvsz2.ru/plant/12, local `PROJECT/art-src/pvz-ai/research/next-plants/cactus.png`.
- Visually inspected render shows an upright bright green ribbed column, two naturally raised cactus branches, long reddish-brown spine clusters, narrow pale eyes under angry brows, a short forward tube, red-orange ruffled flowering crown with three gold stamens, and a low brown stone ring.
- Approved pixel style inspected: the actual-game Peashooter atlas at `/workspace/generated_images/exec-fa5d028b-d48a-4089-acb6-9c134d4e10df.png`.

## Decisions

- Preserve the cactus column, naturally branched silhouette, ribbing, snout, angry pale eyes and stone base. Natural cactus branches are plant anatomy; no hands, human arms, feet, shoes or leaf pedestal.
- Use the project's permitted pink/coral flower variant and tan/reddish-brown needle clusters. These are color choices, not evidence of a separate canonical cactus species.
- Cactus is canonical. Prickly Cactus and Spike Cactus are project evolutions extending height, branch strength, rib shading, spine density and one/two/three crown blooms. IDs, stage names and rules stay unchanged.
- All stages stay mad, including proud cheer poses. Knocked-out and sleep frames explicitly require closed eyelids without pupils.
- Fifteen frames per stage: idle2, walk4 by natural column/base rocking, attack3 by snout compression/thrust/recovery, hurt1, knockedOut2, cheer2, sleep1. No detached projectiles, shadows or particles; the engine handles effects.

## Integration ownership

Only this family's source copies, spec, indexed frames and notes are owned by this task. Parent integrates the generated registry and edits index/progress. Shared runtime files and slicing tools are not changed.

## Final files and QC

- `PROJECT/art-src/pvz-ai/animation/cactus-family-spec.json` records 3 stages, source paths and all 45 source head boxes.
- `PROJECT/art-src/pvz-ai/animation/cactus-family-frames.json` contains the complete indexed frame data; parent can pass it to `tools/animation_ingest.js` with a unique registry output name.
- Final sources: `cactus-0-actual-source.png`, `cactus-1-actual-source.png`, `cactus-2-actual-source.png`; all copied to `PROJECT/pvz-garden/_ref/animation/`.
- Pre-edit evolved drafts retained as `cactus-1-initial-source.png` and `cactus-2-initial-source.png`. They were too similar to the base, so focused image edits added a separate second coral bloom and needle fans to stage1, then three countable pink/magenta blooms, broader ribbing and denser tan needle fans to stage2.
- Initial source prompts and edit decisions: `cactus-family-prompts.json`.
- Indexed previews `cactus-0-indexed.png`, `cactus-1-indexed.png`, `cactus-2-indexed.png` were visually inspected after conversion. All poses remain right-facing, snout actions distinct, narrow mad brows retained, and KO/sleep eyes closed. At 64px the narrow canonical eye highlights and finest needles simplify, while silhouette, flower progression and denser stage2 spines remain readable.
- Family QC passed all45frames: 64x64, transparent non-touching edges, exact lowest ink row61, lower support centered within32±10, all recorded head/hat anchors bounded, ≤52colors, one consistent palette per stage, and unique frames within every multi-frame clip. Result: `verification/cactus-qc.json`. The common browser slicing tool performed all conversion; no pixel painting or runtime drawing code was introduced.
- Family QC harness: `/workspace/work/pvz/runtime-review/check_cactus.py`.
- No image-generation rejection occurred. Two focused edits improved stage readability.
