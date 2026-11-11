# Melon-pult family — actual-game redraw

Owner: parallel production agent `potatomine_family`, reassigned to this family after the Potato Mine handoff. This batch owns only its new Melon-pult sources, spec, frame data, previews, QC record and this note. It does not edit index.html, runtime code, shared progress documents, save data or game IDs.

## References visually inspected

- Melon-pult: https://pvsz2.ru/plant/61 ; local `PROJECT/art-src/pvz-ai/research/next-plants/melon-pult.png`.
- Winter Melon: https://pvsz2.ru/plant/112 ; local `PROJECT/art-src/pvz-ai/research/next-plants/winter-melon.png`.
- Latest production notes: `NEXT_PLANT_REFERENCES.md`, Melon-pult family section.
- Approved style/layout: `/workspace/generated_images/exec-fa5d028b-d48a-4089-acb6-9c134d4e10df.png` (new Peashooter atlas).

The inspected game render has a squat horizontal oval melon body, wavy longitudinal rind stripes, dark oval eyes, broad root leaves and no mouth. A short curled vine spring behind the body joins it to a half-melon bowl cradling one upright whole melon payload. The body, spring, cup and payload together form the defining silhouette. There is no wooden siege cart, humanoid body, separate gun or pea muzzle.

Winter Melon changes the whole material identity to cyan and ice blue, with darker turquoise stripes, a blue spring vine, blue-green leaves and an angular icy cup rim. This is a canonical distinct plant, not an optional green recolor. Mega Winter Melon is a project evolution extending the canonical Winter shape through a broader body, stronger spring and more crystalline cup rim.

## Stage rules and animation

Keep `melonpult` stages 0/1/2 and stage names Melon-pult / Winter Melon / Mega Winter Melon. Stage 0 retains the project heavy mad brow and mouthless rule. Winter stages stay friendly and mouthless. No feet, legs, human arms, costumes, crowns or floating effects.

Each source atlas must contain exactly 15 complete characters in five aligned columns and three rows. The row-by-row prompt explicitly maps:

- Row 1: idle A, idle B, walk 1, walk 2, walk 3.
- Row 2: walk 4, attack windup, attack release, attack recovery, hurt.
- Row 3: knockedOut 1, knockedOut 2, cheer 1, cheer 2, sleep.

Walking uses root-leaf scoots, spring bob and body tilt. Attack draws the attached cup back, springs it forward (an empty cup is allowed in release), then reloads/recoils. The game supplies the separate projectile. Defeat keeps the limp spring and cup attached to the melon body. No shadows or detached effects belong to the source.

Planned conversion: 64 ×64 logical canvas, fixed base row 61, stage maximum heights 38/46/54 and width 56. Head anchors will describe the lower melon face-body, excluding the upper payload and cup.

Status: COMPLETE — all three source atlases and their indexed sheets were visually reviewed. Every sheet has exactly 15 poses in 5 columns ×3 rows, consistent identity, mouthless face and footless leaf base. Stage0 retains mad brows; stages1/2 are cyan Winter forms. No source retries or credit rejection occurred.

All45 logical frames pass read-only QC: exact64×64 canvas, fully indexed opaque/empty pixels, clear outer edges, exact lowest base row61, lower-base center within32±10, identical palette within each stage, bounded finite head geometry, and distinct pixels for every frame in each multi-frame clip. Stage palette sizes are26/24/22. QC record: `PROJECT/art-src/pvz-ai/animation/melonpult-family-qc.json`.

Stable handoff files:

- `PROJECT/art-src/pvz-ai/animation/melonpult-family-spec.json`
- `PROJECT/art-src/pvz-ai/animation/melonpult-family-frames.json` (SHA256 `d5d4fe7fd25fed2e745ebcaec382b79d4a548e54cc55dbfdf0dd57d621e5440b`)
- `PROJECT/art-src/pvz-ai/animation/melonpult-{0,1,2}-actual-source.png`, matching `pvz-garden/_ref/animation/` copies
- `PROJECT/art-src/pvz-ai/animation/melonpult-{0,1,2}-indexed.png`

Origin source images, preserved unchanged:

- Stage0 `/workspace/generated_images/exec-3df17364-642b-4d20-a5b2-2e20045a67bf.png`
- Stage1 `/workspace/generated_images/exec-77f72e4f-fb07-4839-9bc2-439a260a543a.png`
- Stage2 `/workspace/generated_images/exec-6d0308d3-9d31-4fe0-96d8-c4866f83c42e.png`

Head boxes are recorded from each lower melon face-body, excluding the upper payload/cup. Conversion uses the existing browser source cutter/indexer; no source art was drawn procedurally. Runtime ingestion, gameplay/costume verification and shared progress updates belong to the main integrating agent. These source/spec/frame filenames are frozen at handoff.
