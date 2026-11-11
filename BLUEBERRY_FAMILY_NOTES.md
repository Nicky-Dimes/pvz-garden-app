# Electric Blueberry family — actual-game redraw

Owner: `potatomine_family` production queue. Existing `blueberry*` animation files were checked before generation; none were present. No runtime, index, queue, game data, save files or shared progress edits are performed.

## Visually inspected actual reference

- Page: https://pvsz2.ru/plant/25 .
- Render: https://pvsz2.ru/statics/plants-big/25.png .
- Saved reference: `PROJECT/art-src/pvz-ai/research/owner-potatomine-queue/blueberry.png`.
- Approved pixel style/layout: `/workspace/generated_images/exec-fa5d028b-d48a-4089-acb6-9c134d4e10df.png`.

Actual Electric Blueberry is a glossy cyan/bright-blue round berry with a deep-blue scalloped open calyx cup, a dark hollow top, large white eyes with turquoise/blue irises, broad navy teardrop/arched eye surrounds, and a small two-front-tooth smile. Green base leaves and a large rear green leaf support the berry directly. This differs from the old generic violet-berry assumption. The eye whites/blue irises and blue botanical calyx are defining, not replaceable with standard black Peashooter eyes or a gold crown.

## Canonical and custom stages

Keep `blueberry` stages0/1/2 and names Electric Blueberry / Shock Berry / Thunder Berry. Only base Electric Blueberry is canonical here. Later named evolutions naturally enlarge berry/calyx and layer green support leaves, retaining one main berry and one face. Thunder's two small attached yellow lightning-shaped rind veins extend project electrical accents without adding detached bolts, machinery, a floating aura or extra characters.

All stages remain friendly and dreamy/alert, with white eyes/blue irises and two-tooth grin. No arms, legs, feet, shoes, pot, costume, separate neck or generic grape anatomy. All electrical markings stay flush within the berry material; the game supplies lightning effects separately.

## Animation/import

Three source atlases, each exactly15 poses in5columns ×3rows. Row1 idleA,idleB,walk1,walk2,walk3; row2 walk4,attackwindup,attackstrike,attackrecovery,hurt; row3 KO1,KO2,cheer1,cheer2,sleep. Leaf scoots/berry tilt replace walking limbs. Attack squashes/draws calyx inward, stretches and flares it, then recovers. KO folds berry/calyx onto leaves; all parts remain attached. The source can use happy eye arcs in closed-eye cheer while preserving blue-irised white eyes in open-eye poses.

Target is64×64, base61, max heights38/46/54 and width56, with head boxes on the main berry excluding upper calyx/rear support leaf.

Status: COMPLETE — all3 source atlases and indexed sheets visually reviewed, exactly15 poses per5×3 atlas. Canonical cyan-blue berry, dark scalloped calyx cup, blue-irised WHITE eyes/navy surrounds, two-tooth smile and green support leaves survive indexing. Only final custom stage has attached yellow rind markings. No source corrections or resource rejection occurred.

All45 frames pass64×64 size, clear margins, exact base61, lower-base center32±10, consistent per-stage palettes26/25/25, bounded finite head geometry and distinct frames within every multi-frame clip. Strict source-background seeds are limited to below-body gaps in the two raised cheer poses, preserving all face/tooth materials. QC: `PROJECT/art-src/pvz-ai/animation/blueberry-family-qc.json`.

Stable files under `PROJECT/art-src/pvz-ai/animation/`: `blueberry-family-spec.json`, `blueberry-family-frames.json`, `blueberry-{0,1,2}-actual-source.png` plus matching game `_ref/animation` copies, and `blueberry-{0,1,2}-indexed.png`. Frames SHA256 `8e7d68f3ac1f1b8599a59b24dd421a1b627e794e95586e8a0fed0e1e770380ec`.

Final source originals: stage0 `/workspace/generated_images/exec-30a305d6-4801-48b7-8768-580e01916cee.png`; stage1 `/workspace/generated_images/exec-62e0925f-9d8d-47fe-ab62-0f1e74879ce9.png`; stage2 `/workspace/generated_images/exec-98d89010-6aa5-4549-9b0d-fa767af65143.png`. Only base Electric Blueberry is canonical; custom Shock/Thunder extend that same inspected identity. No runtime/index/queue/shared-progress edits or ingestion. Files frozen at ready-marker handoff; main owns integration and gameplay/costume checks.
