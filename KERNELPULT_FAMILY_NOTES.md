# Kernel-pult family production notes

## Actual references inspected

- Kernel-pult: https://pvsz2.ru/plant/53 — local `PROJECT/art-src/pvz-ai/research/next-plants/kernel-pult.png`.
- Cob Cannon (PvZ1): https://www.pngaaa.com/detail/2460344 — local `PROJECT/art-src/pvz-ai/research/next-plants/cob-cannon.png`.
- Approved pixel style: actual Peashooter source `exec-fa5d028b-d48a-4089-acb6-9c134d4e10df.png`.

Observed Kernel-pult: upright short golden corn cob with chunky distinct kernels, two small dark oval eyes under drooping leaf-like green brows, broad green husk base leaves and a crown-attached angular green stalk ending in a bowl with kernel payload. The yellow moustache in the original project is not present in the actual reference and is removed.

Observed Cob Cannon: low horizontal corn-and-husk cannon facing right, narrowed stern eye in green husk casing, no mouth, short exposed yellow corn tip. Low brown wooden cart carries two real round pale corn-slice wheels. This is a separate anatomy from upright Kernel-pult, not a resized same-body evolution.

## Stage mapping and actions

Data ID remains `kernelpult`, stages0/1/2 names remain Kernel-pult → Butter-pult → Cob Cannon. Butter-pult is the project middle-stage label; it keeps upright corn anatomy and carries a pale rectangular butter pat in the cup. Final Cob Cannon is angry and mouthless. Real wheels are explicitly allowed by the family rule. No human limbs, shoes or substitute tank body.

15 frames per stage: idle2, walk4, attack3, hurt1, knockedOut2, cheer2, sleep1. Kernel/butter payload stays in the cup; runtime creates the actual projectile. Cob Cannon uses wheel/cart rocking and cannon recoil without detached projectile effects. Source atlas generation uses5×3 equal square cells, right-facing anatomy, cream background, preserved source and recorded head metadata.

Full generation prompts: `PROJECT/art-src/pvz-ai/animation/kernelpult-family-prompts.json`.

Status: complete source and indexed-art handoff. Runtime integration belongs to the main agent. No IDs, data, saves, index or shared runtime files changed by this task.

## Completed artifacts

- `PROJECT/art-src/pvz-ai/animation/kernelpult-{0,1,2}-actual-source.png` — original generated source atlases, also preserved under `pvz-garden/_ref/animation/`.
- `PROJECT/art-src/pvz-ai/animation/kernelpult-family-spec.json` — source layout and per-frame corn/husk head anchors; also copied under `_ref/animation/`.
- `PROJECT/art-src/pvz-ai/animation/kernelpult-family-frames.json` — 45 indexed frames ready for main-agent ingestion.
- `PROJECT/art-src/pvz-ai/animation/kernelpult-{0,1,2}-indexed.png` — all three contact sheets visually reviewed.
- `PROJECT/art-src/pvz-ai/animation/kernelpult-family-provenance.json` — source hashes, references and QC summary.

## Quality review

All three source sheets and indexed contact sheets were visually inspected. Kernel-pult and Butter-pult retain canonical corn/husk/crown-catapult anatomy and green leaf eyebrows rather than a yellow moustache. Middle-stage butter is visibly a pale rectangular pat. Cob Cannon uses the actual horizontal organic corn/husk cannon, narrowed stern eye, no mouth and two full round cart wheels in every action; it is not an upright scaled Kernel-pult or a metal tank. No human limbs or detached effects occur.

Inline checks passed all45 frames: exact64×64 rows, base61, no edge contact, lower support midpoint within32±10, bounded finite head anchors, and distinct hashes in each multi-frame clip. Stage palettes contain27/24/28 colors and are consistent within each stage. The horizontal canonical final stage remains naturally low/wide instead of being distorted to an upright height; its idle/attack/KO/cheer silhouettes span30–45px high inside the56px width cap. First two stages span28–38px and28–46px through their actions respectively.

The recorded head anchor follows the upright cob for stages0/1 and the green husk casing for final Cob Cannon, never the cart wheels. These local checks supplement the main agent's ingestion, export and runtime tests.
