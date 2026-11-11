# Torchwood family — actual-game redraw

Owner: parallel production agent `potatomine_family`, assigned this family after freezing the Melon-pult handoff. This batch owns only its new Torchwood sources, spec, frame data, previews, QC record and this note. No index, runtime, game data, saves or shared progress files are edited.

## Visually inspected references and rules

- Actual Torchwood page: https://pvsz2.ru/plant/108 .
- Actual render: https://pvsz2.ru/statics/plants-big/108.png .
- Downloaded reference: `PROJECT/art-src/pvz-ai/research/torchwood-actual.png`.
- Approved style/layout: `/workspace/generated_images/exec-fa5d028b-d48a-4089-acb6-9c134d4e10df.png` (Peashooter atlas).
- Existing progression and family rules: `ART_PROGRESS.json` Torchwood record; `PROJECT/pvz-garden/data.js`; `art-plants2.js` Torchwood section.

The inspected game render is a hollow, rough brown tree stump with angular bark ridges, a jagged cut rim, a trunk-carved face, flared woody root base and a very large attached orange/yellow flame. The eyes are narrow yellow/amber with reddish pupils and bark brows; the mouth has big ivory teeth. The actual render has a harsh expression, but the project's newer explicit Torchwood rule requires a friendly default. New art keeps the recognizable wood face/eye/mouth anatomy with relaxed brows, kind alert eyes and a friendly toothy grin. It must not become a generic fire monster or a small humanoid made of wood.

## Stage decisions

Keep IDs and stage names unchanged: `torchwood` 0 Torchwood, 1 Blaze Wood, 2 Inferno Wood. Only Torchwood is the canonical identity; later labels are project evolutions.

- Stage 0: compact original-style charred hollow stump, simple bark knots, natural roots and warm orange/yellow top fire.
- Stage 1: taller trunk, deeper bark grain, small close-fitting branch knot stubs, stronger root flare and larger fire.
- Stage 2: broad rugged charred trunk, wider blazing crown and a restrained blue-white hot inner core within orange/yellow outer fire, following existing progression.

No human arms, legs, feet, costumes, armor, pot, leaf pedestal, crown or separate head. Any branch knots remain close to the trunk rather than gesturing as arms. All flames remain attached to the hollow top, even in hurt/KO/sleep; detached sparks, fireballs, particles and game effects are excluded from sources.

## Animation/import

Three stage source atlases, each exactly five aligned columns × three rows:

- Row 1: idle A, idle B, walk 1, walk 2, walk 3.
- Row 2: walk 4, attack windup, attack strike, attack recovery, hurt.
- Row 3: knockedOut 1, knockedOut 2, cheer 1, cheer 2, sleep.

Root shuffles, whole-trunk tilts and attached flame motion replace humanoid walking. Attack compresses and draws back, thrusts the trunk/fire forward, then recovers. KO slumps the intact tree onto roots and reduces the attached fire to an ember flame. The face/wood region, excluding the flame, will receive recorded source head boxes.

Conversion uses existing `animation_slice.py`: logical 64×64, exact base row 61, max stage heights 38/46/54 and width 56.

Status: COMPLETE — all three source atlases and indexed sheets visually reviewed, exactly15 poses per5×3 sheet. All45 frames pass64×64 dimensions, clear edges, exact base61, centered lower base, stage-consistent palettes, bounded recorded wood-face head anchors and distinct pixels for each frame in every multi-frame clip. Palette sizes24/22/27.

Stage1 first draft had a harsh gritted-teeth/V-brow default. It was corrected with image_gen to relaxed arched brows, open kind amber eyes and a friendly upward toothy grin without changing anatomy, pose layout or material style. The harsh draft is preserved as `torchwood-1-rejected-harsh-expression.png` and is excluded from the production spec. All flame silhouettes remain attached; final-stage blue-white inner core survives indexing.

Stable files under `PROJECT/art-src/pvz-ai/animation/`:

- `torchwood-family-spec.json`
- `torchwood-family-frames.json`, SHA256 `b0a4fd62808ea53c4048794c33fc09599d08f4dce88a478706655bbde7c5272a`
- `torchwood-family-qc.json`
- `torchwood-{0,1,2}-actual-source.png` and matching game `_ref/animation` copies
- `torchwood-{0,1,2}-indexed.png`

Preserved generation originals: stage0 `/workspace/generated_images/exec-0269aeba-a648-47a6-b451-d1d0a816f837.png`; final stage1 `/workspace/generated_images/exec-e5fa5700-2d02-422c-ba5a-84f6d41b795c.png`; stage2 `/workspace/generated_images/exec-58adaa29-17ec-40c6-b25e-a46654ce0ed4.png`. No resource rejection occurred. No runtime/index/shared-progress edits or ingestion were performed. Files frozen at handoff; main owns subsequent integration and gameplay/costume verification.
