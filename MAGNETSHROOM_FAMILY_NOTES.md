# Magnet-shroom family production

Production complete and frozen: Magnet-shroom → Gold Magnet → Mega Magnet,45drawnframes. No runtime/index/shared progress/queue files edited by this task.

## Actual-game research

- Inspected actual Magnet-shroom render: https://pvsz2.ru/plant/59 ; image https://pvsz2.ru/statics/plants-big/59.png . Red upright U-magnet has silver squared pole tips and EYES ON THE LOWER RED U-ARMS. It rests on a flat purple spotted saucer cap above a pale green mushroom stalk flaring directly to ground. Old project face-on-purple-stalk identity is inaccurate.
- Inspected canonical original-game Gold Magnet almanac illustration: https://plantsvszombies.fandom.com/wiki/Gold_Magnet ; image https://static.wikia.nocookie.net/plantsvszombies/images/e/ec/Gold2.png/revision/latest?cb=20121209102051 . Gold U-magnet has eyes on its lower arms and green botanical stem/leaf support. It does not retain a purple mushroom-face body. Almanac text/frame are not part of generated sprites.
- Mega Magnet is a project evolution, not a separate canonical species: one larger sturdier gold U, thicker pale-gold poles, fuller green leaf collar/root support. One face and one magnet, no unrelated body.

## Rules and decisions

Keep all plants footless. Base Magnet-shroom remains a mushroom with one continuous flared stalk meeting ground. Canonical Gold Magnet is supported by a green stem and leaf collar/root base rather than a mushroom stalk; this follows actual identity while retaining the no-feet rule. No human limbs, detached coins/metal/effects/shadows, or unnecessary faces on support structures. Eyes remain on the magnet U in every frame. Friendly expressions, quiet KO/sleep.

Clip order: idle2,walk4,attack3,hurt1,knockedOut2,cheer2,sleep1. Import64×64,exactbase61,maxH38/46/54,maxW56. Sources are new pixel art guided by reference images, not copies of official sprites.

## Completed artifacts and checks

- `PROJECT/art-src/pvz-ai/animation/magnetshroom-family-frames.json`:3looks/45indexedframes,ready for main-agent ingestion.
- `magnetshroom-family-spec.json`:reproducible64pxslicing,recorded per-frame lower-U face boxes and explicit hat landmarks above actual magnet tips.
- `magnetshroom-{0,1,2}-actual-source.png`:final15frameatlases; copies under game `_ref/animation/`.
- `magnetshroom-{0,1,2}-indexed.png`:4×indexedpreviews,all visually inspected.
- Original source drafts and pre-layout sources retained alongside final sources.
- `magnetshroom-family-prompts.json`:identity prompts and correction rationale.
- `MAGNETSHROOM_FRAME_QC.json`:all45frames pass64×64/exactbase61/freeedges/centered support/palette consistency/finite head and accessory landmarks/distinct multi-frameclips.
- `magnetshroom-family-source-qc.json`:all three source rows in each sheet have exactly five major silhouettes,with complete bodies inside their own cells.

A source-layout defect (six characters in base sheet's bottom row) was caught by indexed visual review despite ordinary frame metrics passing. It was corrected with imagegen; current sources pass independent component/cell-boundary checks. No neighbor fragments remain. A Mega KO pose crossing its source cell edge was likewise corrected. Frame10hurt,KO11/12,cheer13/14 andsleep15 expressions and body states were explicitly corrected before freeze.

Stage0 preserves actual red-Uface/purple-saucer/pale-mushroom-stalk identity. Gold and Mega preserve actual gold-Uface/green-botanical-support identity; Mega is the larger project evolution. No duplicate face was added to stalk/cap/leaves.

Ingest from PROJECT (not run by this task):

```sh
node tools/animation_ingest.js art-src/pvz-ai/animation/magnetshroom-family-frames.json --out art-v2-ai-magnetshroom-family.js
```

Main agent still needs runtime, costume and scene checks. No runtime/index/queue/sharedprogress files were modified.
