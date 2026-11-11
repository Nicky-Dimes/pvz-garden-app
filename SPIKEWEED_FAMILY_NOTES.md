# Spikeweed family production

Generation, expression correction, conversion and frame QC are complete for all45frames: Spikeweed → Spikerock → Spike Titan. No runtime/index/data/shared progress files are edited by this task.

Inspected actual-game references are documented in NEXT_PLANT_REFERENCES.md/JSON and stored in PROJECT/art-src/pvz-ai/research/next-plants/.

- Canonical Spikeweed is a low **green thorn mat** with pale conical spikes, not the old project ochre mound.
- Canonical Spikerock is a low broad angular gray rock/steel-like spike formation with a central faceted spear point and curved side spires.
- Spike Titan is a project evolution: denser, broader low rocky spike formation rooted in a thin green mat. It remains a ground trap rather than a tree, biped, animal, robot or golem.
- Small embedded eyes use friendly-neutral attitude in accordance with the project family rule; no mouths or angry V brows.
- No arms/legs/feet, detached debris, shadows or effects. Whole mats/rock plates scoot and compress, attached spikes brace and fan.
- Deliberately natural low sizing: import targets maxH22/30/36 and maxW46/52/56 on64×64canvases, exact base61. Do not force these families to fill54px height.
- Clip order per stage: idle2,walk4,attack3,hurt1,knockedOut2,cheer2,sleep1.

Stage0 reference: https://pvsz2.ru/plant/89 . Stage1/final structural reference: https://pvsz2.ru/plant/88 . References are community-hosted game renders, used only to guide original generated pixel art.

## Completed artifacts

- `PROJECT/art-src/pvz-ai/animation/spikeweed-family-spec.json`: reproducible64pxslicing, natural low stage sizes and explicit recorded per-frame semantic ground-trap geometry.
- `spikeweed-family-frames.json`:3looks/45indexedframes, ready for main-agent ingestion.
- `spikeweed-{0,1,2}-actual-source.png`: final corrected15frameatlases; copies under game `_ref/animation/`.
- `spikeweed-{0,1,2}-indexed.png`:4×pixelpreviews, all visually inspected.
- `spikeweed-{0,1,2}-pre-expression-correction-source.png`: original drafts retained.
- `spikeweed-family-prompts.json`: production constraints, identity prompts and expression-correction rationale.
- `SPIKEWEED_FRAME_QC.json`: passing3look/45framechecks for64×64,exactbase61,freeedges,centered support,palette consistency,bounded metadata and distinct drawn frames inside each multi-frame clip.

Ingest from PROJECT (not run by this task):

```sh
node tools/animation_ingest.js art-src/pvz-ai/animation/spikeweed-family-frames.json --out art-v2-ai-spikeweed-family.js
```

## Review decisions

The first drafts reproduced the original game's stern brow despite the project-friendly rule. Image-generation edits soften only eye openings and brow edges, preserve canonical ground-trap bodies, and explicitly correct the final hurt/KO/cheer/sleep expression order. No procedural pixel painting, mouth, human limbs, detached effects or debris were introduced.

These plants have no humanoid head. Metadata describes the low body/front region, with an accessory anchor immediately above the highest attached spike. Geometry is recorded once from final indexed body bounds in the spec's `headOverrides`; runtime does not scan pixels or invent an anatomical head.

Measured imported ink bounds (min/max across15frames each):

- Stage0: height13–21px, width44–46px.
- Stage1: height16–28px, width47–52px.
- Stage2: height18–29px, width50–58px.

Main agent still needs runtime, costume and game-scene checks. Puff-shroom artifacts were left frozen throughout this task.

## Freeze handoff repair: stage2 source grid

The original final-stage source contained SIX bottom-row poses. That invalidated fixed5column slices for frames11/12/13 despite basic frame metrics passing. It has been repaired with imagegen to EXACT5×3 and the bottom row now contains KO1,KO2,cheer1,cheer2,sleep.

- New authoritative stage2 source: `PROJECT/art-src/pvz-ai/animation/spikeweed-2-corrected-grid-source.png` (also under `_ref/animation/`).
- New authoritative stage2 indexed preview: `spikeweed-2-corrected-grid-indexed.png`.
- Old `spikeweed-2-actual-source.png` and old indexed preview remain IMMUTABLE historical artifacts; do not use them for current stage2.
- Staged source/grid evidence: `spikeweed-grid-repair-family-source-qc.json`.
- `spikeweed-grid-repair-components-qc.json`:each of all15correctedstage2frames is exactly ONE8-connected occupied component,including priorityframes11/12/13. No neighboring-pose fragments remain.
- `SPIKEWEED_GRID_REPAIR_FRAME_QC.json`:all45finalfamilyframes pass standard indexed QC. Stage0/1 frame data retained unchanged.
- Old family spec/frame JSON archived as `spikeweed-family-pre-grid-repair-{spec,frames}.json`; corrected spec/frame JSON published by atomic file replacement only after staging QC.

All prior active source/preview PNG hashes were verified unchanged before publish. New source and indexed preview were visually inspected. No runtime/index/ingestion/sharedprogress edits were made. This repair is frozen for Claude handoff.
