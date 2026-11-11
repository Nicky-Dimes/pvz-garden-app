# Starfruit family production notes

## Actual reference inspected

Page: https://pvsz2.ru/plant/95

Image: https://pvsz2.ru/statics/plants-big/95.png

Preserved reference: `PROJECT/art-src/pvz-ai/research/next-plants/starfruit.png`, also copied to `pvz-garden/_ref/actual/starfruit-actual.png`.

Observed actual PvZ2 anatomy: thick plump yellow five-point starfruit, yellow central face grading to orange/amber rims, sculpted center-to-point ridges, round subdued orange fruit spots and glossy highlights. Two black oval eyes have white glints; friendly curved smile has one small white bucktooth. Attached green leaf rosette peeks behind the fruit valleys. This inspected render shows no distinct top stem nub, so an invented nub is not added. The main yellow body remains exactly five points.

Data stages are Starfruit → Star Burst → Supernova Star. Later names are project evolutions, extending canonical point depth, body mass and brighter material shading while remaining an organic five-point fruit. They are not space helmets, animals, extra-point stars or detached orbital effects. All glow is represented in attached fruit material ramps. No human limbs or footwear; motion uses whole-body tilt/bounce, fruit-point flex and attached rear leaf flutter.

15 source frames per stage: idle2, walk4, attack3, hurt1, knockedOut2, cheer2, sleep1. Attacks compress points inward, flare/thrust and recover; runtime creates star projectiles. Five yellow points remain connected and readable in every action. Defeat/sleep are gentle and friendly.

Exact generation prompts: `PROJECT/art-src/pvz-ai/animation/starfruit-family-prompts.json`.

Status: completed source and indexed-art handoff, frozen for main-agent integration. No index, shared runtime, progress, IDs, data or saves changed.

## Completed artifacts

- `PROJECT/art-src/pvz-ai/animation/starfruit-{0,1,2}-actual-source.png` — preserved source atlases; copies also under `pvz-garden/_ref/animation/`.
- `PROJECT/art-src/pvz-ai/animation/starfruit-family-spec.json` — source layout, per-frame head boxes,64px canvas/base61 and stage size ceilings; also under `_ref/animation/`.
- `PROJECT/art-src/pvz-ai/animation/starfruit-family-frames.json` —45 indexed frames ready for ingestion.
- `PROJECT/art-src/pvz-ai/animation/starfruit-{0,1,2}-indexed.png` — visually reviewed contact sheets.
- `PROJECT/art-src/pvz-ai/animation/starfruit-family-provenance.json` — source hashes and QC report.

## Quality review

All three source and indexed sheets were visually reviewed. Five connected yellow/orange fruit points remain readable through all actions, with the actual green rear leaf rosette, black oval eyes, friendly smile and single bucktooth. No invented stem nub, human limbs, footwear, costumes or detached star effects were added. Walk uses body tilt/bounce, attacks visibly compress/flare/recover, and KO/sleep remain gentle.

All45 local checks pass: exact64×64 canvas, base61, clear margins, support midpoint32±10, consistent palettes, valid symbols and bounded finite head anchors. All15frames in every stage have distinct hashes even across clips. Palettes25/27/27 colors; action height ranges28–38,34–46 and36–50px. Final stage remains naturally broad under56px width cap. Runtime integration/export tests are owned by main agent.
