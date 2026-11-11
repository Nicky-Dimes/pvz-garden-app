# Garlic family production notes

## Inspected actual-game reference

- Source page: https://pvsz2.ru/plant/33 . Community-hosted actual game render.
- Image URL: https://pvsz2.ru/statics/plants-big/33.png .
- Inspected reference: `PROJECT/art-src/pvz-ai/research/snowpea-queue-candidates/garlic-stage-0.png`; development copy at `PROJECT/pvz-garden/_ref/actual/garlic-actual.png`.
- Observed anatomy: plump cream/ivory garlic bulb with rounded clove lobes, vertical papery seams, narrow top neck and three thin curled dry paper-leaf tips. Comically mismatched googly eyes with pale-pink rims and tiny black pupils, raised brows and crooked grin with two front teeth. The bulb itself rests flat on its root base; no green leaf pedestal or humanoid body.
- New artwork uses approved rich pixel-style Peashooter source as style/layout reference; official/game image is not runtime art.

## Stage decisions

- Stage0 Garlic: preserve actual cream clove bulb, three papery curls, asymmetric googly eyes and two-tooth grin; no added accessory.
- Stage1 Stinky Garlic: project evolution with more lobed bulb, papery curls and a thin tied green grass-leaf band around narrow top neck. This retains the old project's mild headband progression without turning the plant into a clothed fighter.
- Stage2 Mega Garlic: broad mature clove bulb, a fuller papery curl crest and one small fresh green three-leaf neck sprout crown. No gold crown or helmet; cream garlic remains dominant.
- Friendly goofy faces throughout. No plant arms, legs, shoes or feet. Bottom clove lobes remain continuous bulb anatomy, not separate fake feet.

## Animation production

Three5×3 source sheets are generated and visually reviewed with15poses each: idle2, root-bulb waddle4, attack3, hurt1, knockedOut2, cheer2, sleep1. Every coordinate is named in the prompt, especially R2C5HURT and R3C1/2KO,R3C3/4CHEER,R3C5SLEEP. Breath attack inflates cheeks, thrusts bulb/toothy mouth right, then relaxes; no detached stink cloud or effect. Hurt/KO/sleep close the eyes; cheers keep open friendly eyes.

No runtime/index/ingestion/shared progress/queue edits are made by this agent. Ready marker will be written only after source/indexed review and independent QC.

## Final source provenance and review

- Stage0: `PROJECT/art-src/pvz-ai/animation/garlic-0-actual-source.png`, generated final exec-dd0c277e-0941-4b2e-a26c-f2d069f5c568.png.
- Stage1: `PROJECT/art-src/pvz-ai/animation/garlic-1-actual-source.png`, generated final exec-e920cddc-510e-4dd4-b3da-230e972bfb09.png.
- Stage2: `PROJECT/art-src/pvz-ai/animation/garlic-2-actual-source.png`, generated final exec-1b432d6f-304d-4e7e-b66d-4c1dae2b5b68.png.
- Earlier stage0/1 drafts are preserved as `garlic-{0,1}-initial-draft-source.png`. Their tall cheer papery curl crossed the source row boundary; bounded margin edits shrank each entire source pose within its own cell and clarified the tiny second eye's closed eyelid in KO/sleep. Final source cell boundaries are clear.
- All three final source and indexed sheets were visually inspected. Papery bulb lobes, asymmetric pink-rimmed eyes, crooked toothy face and top-growth progression remain readable at64px. No fake feet, limbs, pea-leaf pedestal or stink clouds were introduced.
- Per-frame main-bulb bounds exclude papery neck/crown tips. Eye lines are measured from pink eye regions rather than assuming symmetric face height; metadata is recorded once in headBoxes/headOverrides.
- Cream clove interiors are preserved by outlined background cutting; no broad cream color-key pass is applied to this pale plant.

Self-assessment: **good** Garlic; **good** Stinky Garlic with restrained leaf band; **good** Mega Garlic with fresh sprout crown. Fine clove texture and the tiny second eye simplify at64px as expected, while asymmetry stays recognizable.

Ready marker will be written LAST after final QC. No runtime/index/progress/queue edits or registry ingestion by this agent.

Final independent QC:45nonempty64×64frames; row61bases; safe source-cell and logical-canvas edges; within-clip uniqueness; fixed per-stage palettes; bounded finite head anchors; support center within10px of x32. Metrics in `PROJECT/art-src/pvz-ai/animation/garlic-family-qc.json`.
