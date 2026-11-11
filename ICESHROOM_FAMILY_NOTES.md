# Ice-shroom family — actual-game redraw

Owner: `potatomine_family` production queue. Existing `iceshroom*` animation artifacts were checked before generation; none were present. No queue, runtime, index, game data, saves, shared progress or shared tool edits are made.

## Visually inspected actual reference

- Page: https://pvsz2.ru/plant/188 .
- Render: https://pvsz2.ru/statics/plants-big/188.png .
- Saved reference: `PROJECT/art-src/pvz-ai/research/owner-potatomine-queue/iceshroom.png`.
- Approved pixel style/layout: `/workspace/generated_images/exec-fa5d028b-d48a-4089-acb6-9c134d4e10df.png`.

This is the modern **PvZ2 Ice-shroom** crystalline-cap design, matching the project's existing crystalline mushroom identity; it is not being described as the older PvZ1 rounded-cap render. The inspected render has a broad cap made of tightly clustered tall blue crystal pillars on a continuous curved cyan rim, a few attached underside icicles, a squat pale-turquoise frosted stalk-face with white eyes/blue irises, and a flat continuously flared base edged with small attached ice facets.

The actual render scowls under a deep icy brow. The project's explicit newer friendly default takes priority for expression: the new render requests relaxed/raised brows, open kind white eyes/blue irises and a small upward smile while keeping crystal-cap/stalk anatomy. No humanoid ice body, arms, legs, feet, shoes, pot, green leaf pedestal, floating crown, glow aura or detached shards/particles are included. Cap/rim/crystals/stalk remain attached throughout.

## Canonical and custom stages

Keep `iceshroom` stages0/1/2 and names Ice-shroom / Frost-shroom / Blizzard-shroom. Only base Ice-shroom is canonical here. Custom later stages extend cap width, pillar layers, attached icicles and frosted stalk strength naturally. Crystals remain a mushroom CAP above a readable face-STALK, not a generic crystal orb with a face pasted on or a humanoid ice monster.

## Animation/import

Exactly15 poses per5-column ×3-row atlas: row1 idleA,idleB,walk1,walk2,walk3; row2 walk4,attackwindup,attackstrike,attackrecovery,hurt; row3 KO1,KO2,cheer1,cheer2,sleep. Walking uses stalk-base shuffle, whole-cap tilt and mushroom squash/stretch with no feet. Attack compresses then raises the attached crystal cap; separate freeze effects belong to game renderer. KO lowers cap over a flattened continuous stalk while keeping all crystal/rim parts attached.

Existing converter target:64×64, exact base61, max heights38/46/54 and width56. Head boxes will describe the face-stalk below the crystal cap, excluding the cap crown and outer icefrill base.

Status: COMPLETE — all3 source atlases and indexed sheets visually reviewed, exactly15poses per5×3 atlas. Canonical modern PvZ2 crystalline cap/rim/icicles/stalk identity retained; defaults have friendly whiteeyes/blueirises and small upward smile, all mushroom bases continuously flare to ground with no feet. The initial hurt cell looked happy in early sources, so row2col5 was corrected via image_gen to harmless pain squints and tiny O mouth. Cheer1 row3col3 was made explicitly happy eye-arcs. Earlier expression drafts are preserved separately and excluded from spec.

All45 indexed frames pass64×64 size, clear margins, exact base61, lower-base center32±10, stable per-stage palettes26/25/28, bounded finite face-stalk geometry and distinct frames in every multi-frame clip. Separate per-frame `hat` anchors were measured ONCE from indexed cap bounds (horizontal bounds center, top+4, width75%ofcapbounds) and recorded through spec headOverrides, so costumes can sit above the crystalline cap while eyes/face geometry stays on the stalk. All45 hat anchors are finite/bounded and above face centers. No runtime geometry scanning is added. QC: `PROJECT/art-src/pvz-ai/animation/iceshroom-family-qc.json`.

Stable files under `PROJECT/art-src/pvz-ai/animation/`: `iceshroom-family-spec.json`, `iceshroom-family-frames.json`, `iceshroom-{0,1,2}-actual-source.png` plus matching `_ref/animation` copies, and `iceshroom-{0,1,2}-indexed.png`. Frames SHA256 `27fbdcea449a4332b846b419a8ef8f10766101ea053b1394758dd6e228dc9d2a`.

Final source originals: stage0 `/workspace/generated_images/exec-e90c32cc-fa7b-4ac3-a8c8-b90d3848e920.png`; stage1 `/workspace/generated_images/exec-99f6791a-b21b-438b-84fc-df48a073fba0.png`; stage2 `/workspace/generated_images/exec-9a8c75a9-690c-4967-912c-855baa8276b3.png`. No resource rejection occurred. Only base Ice-shroom is canonical; custom stages extend the same inspected modern PvZ2 identity. No runtime/index/queue/shared-progress edits or ingestion. Files frozen at ready-marker handoff; main owns gameplay/costume verification.
