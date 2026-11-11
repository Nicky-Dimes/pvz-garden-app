# Snow Pea family production notes

Direction: actual Plants vs Zombies game identities rendered as original rich pixel art. The latest direct user direction permits replacing simplified handoff anatomy; old bow-tie details are superseded.

## Reference inspection

- Licensed merchandise render cross-check: https://walls360.com/plants-vs-zombies-ii-snow-pea/
- Actual Snow Pea game render: https://pvsz2.ru/plant/86
- Image mirror: https://pvsz2.ru/statics/plants-big/86.png
- Local research reference: `research/snowpea-actual.png` in the working research folder; a development copy is at `PROJECT/pvz-garden/_ref/actual/snowpea-actual.png`.
- Visually inspected: smooth spherical turquoise/cyan head, broad forward flared pea tube, two black oval eyes with white highlights, pale aqua faceted ice-crystal fan behind head, thin curved green living stem, broad green basal leaves. It is not a blue animal or a robot.
- Approved pixel-style/layout reference: newly redrawn Peashooter source `exec-fa5d028b-d48a-4089-acb6-9c134d4e10df.png`.

## Stage decisions

- `snowpea` stage 0: canonical Snow Pea anatomy, modest rear crystal fan, one tube.
- Stage 1, Frost Repeater: project evolution extending the canonical family. One head and one tube, a larger swept crystal fan; no invented double barrel, helmet or bow tie.
- Stage 2, Blizzard Pea: project evolution with largest rear crystal fan and four short icy tubes in a diamond muzzle cluster. No military helmet or metal weapon.
- Green stem/base leaves retained to match the game reference; head/crystals stay icy cyan.
- Friendly face; no plant arms, legs, shoes or feet. Leaf-root scoots provide walk movement.

## Production status

Three 15-frame source sheets have been generated and visually reviewed. All face right; no bow tie, limbs, shadows or detached projectiles. Snow Pea and Frost Repeater have single tubes; Blizzard Pea has four icy tubes. All 45 frames are indexed and visually reviewed at their actual 64×64 logical resolution. Required order: idle 2, walk 4, attack 3, hurt 1, knockedOut 2, cheer 2, sleep 1. All sources retain cream backgrounds and are converted through the project's original browser converter. IDs, data, saves and runtime/index files are untouched by this agent.

## Source files

- `PROJECT/art-src/pvz-ai/animation/snowpea-0-actual-source.png` — Snow Pea, generated source exec-f3b20762-fc39-40a1-9933-35620b7f775d.png.
- `PROJECT/art-src/pvz-ai/animation/snowpea-1-actual-source.png` — Frost Repeater, generated source exec-67694acd-f03c-4cb6-806a-8cd09ef30584.png.
- `PROJECT/art-src/pvz-ai/animation/snowpea-2-actual-source.png` — Blizzard Pea, generated source exec-ab89dd50-db9c-42b1-8dd9-6066d5e1b072.png.
- `PROJECT/art-src/pvz-ai/animation/snowpea-family-spec.json` — source-grid specification with recorded per-frame head boxes, N64/base61 and stage heights38/46/54.

Head boxes were measured from connected cyan regions in each source cell, excluding the rear crystal fan and capping the joined muzzle region so hat anchors stay above the head bulb. Knocked-out/sleep source bounds exclude the drooping tube below the head. This is source analysis, not procedural illustration.

## Outputs and validation

- `PROJECT/art-src/pvz-ai/animation/snowpea-family-frames.json`: all 45 indexed source frames, fixed per-character palette and recorded head metadata.
- `PROJECT/art-src/pvz-ai/animation/snowpea-family-qc.json`: per-stage validation results.
- `PROJECT/art-src/pvz-ai/animation/snowpea-{0,1,2}-indexed.png`: three reviewed 5×3 transparent indexed-frame sheets (4× scale).
- Source/spec copies exist under `pvz-garden/_ref/animation` for development review.
- All stages: 15 unique nonempty frames; 64×64 canvas; lowest pixel row61; no frame-edge contact; lower support center within10px of x32; consistent palette across each stage; finite bounded head anchors.
- Palette counts: stage0 20 colors; stage1 23; stage2 25.
- Tallest occupied bounds: stage0 top24/base61 (38px); stage1 top16/base61 (46px); stage2 top9/base61 (53px after conversion).
- Source sheets and indexed sheets were each visually inspected. Distinct single-tube versus four-tube anatomy remains readable. Crystal facets are simplified by 64px indexing as expected.
- Self-assessment: **good** for Snow Pea; **good** for Frost Repeater; **good** for Blizzard Pea. Friendly icy family identity and drawn actions survive indexing; four-barrel stage is clear.
- Runtime/index/progress shared files were not modified. Registry ingestion and app-level integration checks remain with the main agent.

Suggested ingestion from PROJECT:

`node tools/animation_ingest.js art-src/pvz-ai/animation/snowpea-family-frames.json --out art-v2-ai-snowpea-family.js`
