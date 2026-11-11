# Bonk Choy family production

Status: complete; 45 indexed frames frozen for parent integration. This task did not register runtime art.

## Inspected actual-game reference

- Bonk Choy actual render: https://pvsz2.ru/plant/9 ; full image https://pvsz2.ru/statics/plants-big/9.png . Saved/visually inspected in `PROJECT/art-src/pvz-ai/research/bonkchoy/bonk-choy-actual.png` with `reference.json` URL record.
- Observed pale lime pear-shaped choy body, large dark green ruffled leaf crest, asymmetric eyes (one half-lidded), downturned tiny mouth with one central flat rectangular buck tooth. Two long curved green leaf stalks extend into rolled dark-green leaf fists with visible curled edges. Continuous rounded body/root base; no legs/shoes or humanoid body.
- Natural punching leaf stalks/fists are canonical anatomy and are retained. They are not human arms/hands or boxing gloves.
- Project friendly/cute rule tempers the stern source expression to confidently determined, with no frightening heavy angry brows. Keep asymmetric eyes and one central buck tooth.

## Canonical versus invented stages

- Bonk Choy stage0 is canonical plain plant with rolled leaf fists.
- Bonk Champ and Bonk King are project evolutions. Champ adds sturdier rolled leafy fists and a narrow red/white sweatband around crest base. King adds larger layered leafy guard and a small gold champion leaf crown nestled on crest, while remaining a choy plant without clothes, armor or human anatomy.
-15frames per stage: idle2, walk4 by root/body rocking and leaf balance, attack3 with pullback/strong rightward attached leaf jab/recovery, hurt1, KO2, cheer2, sleep1. KO and sleep eyes fully closed; fists/crest droop rather than detach.
- All sources use approved rich pixel style, cream background, no shadows/ground/effects/projectiles, right-facing. Parent owns runtime/index/ingestion; this task owns only Bonk Choy art/spec/data/notes.

## Final files / QC

- `PROJECT/art-src/pvz-ai/animation/bonkchoy-family-{spec,frames,prompts}.json`; final three `bonkchoy-{0,1,2}-actual-source.png` and indexed previews. Source/spec copies in `PROJECT/pvz-garden/_ref/animation/`.
- All three source atlases and all three final indexed previews visually reviewed. Pulled-back leaf guard, extended attached rightward punch and recovery differ; KO/sleep eyes closed; headband and crown remain with appropriate stages.
- The long extended fist initially pushed evolved-stage base support too far left. Uniform per-stage width ceilings were tightened to50px for stages1/2 (below common56px cap), preserving complete fists and transparent margins while satisfying centered support. No global frame shift or source painting was used.
- Explicit strict cream-color background seeds clear enclosed gaps between body and curved leaf stalks; white eye/tooth/headband details remain distinct from cream background.
- All45frames passed64x64 canvas, non-touching edges, exact base61, support32±10, bounded authored head/hat metadata, ≤52colors with consistent per-stage palette, and no duplicate frames within multi-frame clips. Result `verification/bonkchoy-qc.json`; harness `/workspace/work/pvz/runtime-review/check_family.py bonkchoy`.
- No generation rejection or corrective image redraw. Canonical reference reused for invented Champ/King stages; those additions are documented above.
