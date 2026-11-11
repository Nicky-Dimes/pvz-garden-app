# Bloomerang family production notes

## Actual-game reference

- Source page: https://pvsz2.ru/plant/5 ; image https://pvsz2.ru/statics/plants-big/5.png .
- Visually inspected `PROJECT/art-src/pvz-ai/research/snowpea-queue-candidates/bloomerang-stage-0.png`; development copy at `PROJECT/pvz-garden/_ref/actual/bloomerang-actual.png`.
- Observed canonical anatomy: elongated green inverted-teardrop main body/stalk with black vertical oval eyes and small smile, broad basal green leaves. A partly visible turquoise/cyan bumpy seed dome at top is surrounded by long flat cream boomerang-shaped petals bending outward/down like umbrella blades, each with one ochre/orange band near tip and green/olive edge.
- This corrects the simplified old project assumption of generic yellow boomerang petals around a round green face. New source art keeps the actual elongated body and cream/orange-banded flower umbrella.

## Stage decisions

- Stage0 Bloomerang: canonical one-whorl cream/orange-banded petal umbrella, cyan seed dome, elongated green face and broad base leaves.
- Stage1 Double Bloomerang: project evolution with two staggered layers of boomerang petals around ONE dome/face, not two heads.
- Stage2 Mega Bloomerang: project evolution with fullest broad staggered starburst of alternating long/short cream orange-banded blades; one larger cyan dome and mature green body/base. No literal crown or armor.
- All friendly, no feet/shoes/legs or human arms. Petals remain attached flat plant blades, not round tentacles or detached weapons.

## Production

Three5×3 sources were generated with15exact pose cells each: row1 idle2/walk1–3;row2 walk4/attack windup/strike/recovery/HURT;row3KO1/KO2/CHEER1/CHEER2/SLEEP. Attack draws body/petal-whorl twist and rightward reach while petals remain attached; game renders its own boomerang projectile. Hurt/KO/sleep close BOTH eyes; cheers keep open friendly eyes.

To avoid earlier tall-tip boundary problems, the initial source prompt explicitly caps complete character height at55–60% of source cell and uses a sparse margined source as a third LAYOUT-only reference. Approved Peashooter remains the pixel-style reference; the actual Bloomerang image remains anatomy reference.

No runtime/index/ingestion/shared progress/queue edits by this agent. Ready marker only after source/indexed-frame review and independent QC.

## USER FREEZE — pending handoff

The user explicitly requested immediate freeze and handoff to Claude. No further generation, slicing, runtime integration or queue continuation is authorized in this active task.

Three completed source atlases have been preserved in `PROJECT/art-src/pvz-ai/animation/bloomerang-{0,1,2}-actual-source.png`, with development copies under `_ref/animation`. Their generation originals are recorded in `bloomerang-family-pending.json`.

Final source review: canonical base identity reads well and the15cell poses follow the intended states. However, middle-stage two-whorl anatomy and final-stage grand starburst are not sufficiently distinct from the base form. These sources therefore remain **PENDING and UNINTEGRATED**. They have not been indexed, no registry was ingested, and NO `bloomerang-family-ready.json` marker exists. Continue with stage1/2 design review/revision, then source-edge/indexed-frame QC, before integration. Do not treat pending sources as accepted production.

The prepared helper `/workspace/work/pvz/prepare_bloomerang_family.py` describes a possible face-body/seed-dome anchor analysis, but it has not been run on these sources and is only scratch tooling. The actual inspected anatomy reference and production notes remain in the project.
