# Hypno-shroom family production notes

## Reference inspected

Page: https://pvsz2.ru/plant/46

Image: https://pvsz2.ru/statics/plants-big/46.png

Preserved reference: `PROJECT/art-src/pvz-ai/research/next-plants/hypnoshroom.png`, also under `_ref/actual/hypnoshroom-actual.png`.

Actual game anatomy: a huge asymmetric rounded-conical pearlescent rainbow cap with a pale continuous rim, pink/lilac/mint/cyan and warm pastel-yellow material areas. The short pale lavender/cream stalk flares to one broad ground base. Two crimson/red spiral eyes sit on the stalk. The inspected actual render has a tiny open mouth; the project's mouthless family identity is retained as a deliberate adaptation. There are no separate feet, arms, leaves or root pedestal.

Data names remain Hypno-shroom → Swirl-shroom → Hypno King. Swirl-shroom naturally broadens the physical cap and introduces curved flowing color bands; it is not a separate lollipop disc. Hypno King adds the project's compact attached three-point gold crown to a larger canonical mushroom body. Custom stages reuse base identity reference; they are not claimed as separately existing official species.

## Animation and metadata plan

15 drawn frames per stage: idle2, walk4, attack3, hurt1, knockedOut2, cheer2, sleep1. Mushroom movement uses stalk flex, cap bob/tilt and one flared base; no feet. Hypnosis attacks tighten/enlarge drawn eye spirals and stretch/lean the cap/stalk, without detached rings or spores. KO/sleep use gently drooped caps and closed crimson spiral-ended eye arcs. Crown remains attached in final-stage actions. Source eye pixels remain immutable at runtime.

Exact prompts: `PROJECT/art-src/pvz-ai/animation/hypnoshroom-family-prompts.json`.

Status: complete and frozen for main-agent integration. No queue/index/runtime/shared progress/tools edits or ingestion were performed.

## Completed artifacts

- `PROJECT/art-src/pvz-ai/animation/hypnoshroom-{0,1,2}-actual-source.png` — preserved final sources, with `_ref/animation/` copies.
- `PROJECT/art-src/pvz-ai/animation/hypnoshroom-0-initial-bullseye-draft.png` — preserved superseded initial draft. Its concentric target eyes were corrected with image generation into true open crimson spirals; geometry/layout and mouthless identities were retained.
- `PROJECT/art-src/pvz-ai/animation/hypnoshroom-family-spec.json` — source layout, cap geometry and recorded eye overrides; copy also under `_ref/animation/`.
- `PROJECT/art-src/pvz-ai/animation/hypnoshroom-family-frames.json` —45 indexed drawn frames.
- `PROJECT/art-src/pvz-ai/animation/hypnoshroom-{0,1,2}-indexed.png` — reviewed indexed contact sheets.
- `PROJECT/art-src/pvz-ai/animation/hypnoshroom-eye-anchor-analysis.json` — source crimson-pixel measurements for45 stalk eye positions.
- `PROJECT/art-src/pvz-ai/animation/hypnoshroom-family-provenance.json` — source hashes and QC.

## Quality review

Every source and indexed sheet was visually reviewed. Actual asymmetric rainbow cap/pale flared stalk/crimson spiral-eye anatomy remains recognizable. No feet, limbs, detached hypnosis rings or floating effects were added. Final crown stays attached. Row2col5 is hurt; final row is KO1,KO2,cheer1,cheer2,sleep, with closed crimson arcs in the settled KO/sleep cells.

All45 checks pass: exact64×64 rows, base61, clear edges, support midpoint32±10, palette consistency, legal pixel symbols and finite bounded head anchors. All15frames in each stage are distinct even across clips. Palettes28/31/29 colors; action height ranges26–38,32–46 and39–54px.

Head/costume geometry follows the CAP so hats sit above the actual mushroom head; eye-height metadata is independently measured once from crimson source pixels on the STALK. Numeric eye overrides are persisted in the slicing spec for reproducibility. This metadata pass changed no sprite pixel or palette. Main agent owns ingestion/export/runtime checks.
