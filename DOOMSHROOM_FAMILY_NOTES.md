# Doom-shroom family production notes

## Actual-game research

- Inspected PvZ1 in-game reference: https://www.onlinedown.net/article/10032588.htm .
- Reference image: https://img.onlinedown.net/article/202207/114718-62d629469a52e.jpg .
- Development copy: `PROJECT/pvz-garden/_ref/actual/doomshroom-actual.jpg`.
- Observed canonical anatomy: smooth broad charcoal-black dome cap, thick vertically striated gray stalk with flat continuous flared ground base; sharply narrowed glowing red eyes on the FRONT LOWER CAP EDGE beneath slanted cap-brow folds, and a small downturned frown under the cap. No purple spots, green leaves or separate cute face on stalk.
- An archived original sprite-sheet reference was also located at https://www.spriters-resource.com/pc_computer/plantsvszombies/asset/168245/ but direct image retrieval returned403, so it was not used as a visually inspected reference. The actual in-game image above was downloaded and inspected.
- Approved rich pixel-style reference: newly redrawn Peashooter source exec-fa5d028b-d48a-4089-acb6-9c134d4e10df.png.

## Corrections and stages

- Old project inventory described a purple spotted cap. Latest user direction and the inspected game reference supersede that: use CHARCOAL/BLACK smooth cap and red angry cap eyes.
- Stage0 Doom-shroom: canonical squat smooth black dome and gray striated stalk.
- Stage1 Gloom Doom: custom project evolution, NOT canonical Gloom-shroom. Broader heavier cap with stronger overhang and slightly flared corners; no vent tubes, second cap or spots.
- Stage2 Mega Doom: custom project evolution, widest flared cap and subtle dark radial cap ridges merging into the same single dome; thicker stalk/base. No mushroom-cloud creature, explosion, crown, armor or purple spots.
- Family stays mad in awake poses, including cheer. Sleep/KO close eyes but retain heavy cap-brow form. No feet, arms, shoes or leaf pedestal; stalk meets ground continuously.

## Production

Three 5×3 source atlases are generated and visually reviewed,15frames each. Every cell coordinate is spelled out: row1 idle2/walk1-3; row2 walk4/attack windup/strike/recovery/HURT; row3 KO1/KO2/CHEER1/CHEER2/SLEEP. Sources use warm cream backgrounds, right-facing three-quarter view, uniform per-stage scale and generous cell margins. Attack is drawn cap/stalk compression, flare and recovery; no detached explosion, smoke, crater or projectile is drawn into the sprite.

This agent does not edit runtime, index, shared progress or queue, and does not ingest registries.

Additional canonical PvZ2 render visually inspected: https://pvsz2.ru/plant/197 (local `PROJECT/art-src/pvz-ai/research/snowpea-queue-candidates/doomshroom-stage-0.png`). It independently confirms charcoal cap, red lower-cap eyes, heavy slanted brows and gray striated stalk, consistent with the chosen PvZ1 anatomy.

## Final sources and review

- Stage0: `PROJECT/art-src/pvz-ai/animation/doomshroom-0-actual-source.png`, original exec-7495d51f-2969-4979-bd7f-ea831178061f.png.
- Stage1: `PROJECT/art-src/pvz-ai/animation/doomshroom-1-actual-source.png`, original exec-e63f6168-c688-44f4-aa7e-72bd61d400de.png.
- Stage2: `PROJECT/art-src/pvz-ai/animation/doomshroom-2-actual-source.png`, original exec-cc090b58-dc9c-4816-9986-6a77432d4cd5.png.
- Initial stage2 draft is preserved as `doomshroom-2-initial-draft-source.png`. Its KO/sleep red eyes were still partly open, so a bounded expression edit removed red eye fill in hurt/KO/sleep cells and retained awake red-eyed cheers.
- All45source cells and all3indexed sheets were visually inspected. Charcoal cap, gray stem, red angry cap eyes and single mushroom silhouette survive64px indexing; awake/closed states remain distinct.
- Cap bounds are measured from source silhouettes' wide upper region. Open-eye lines are measured from red cap eyes, excluding stem reflections. Closed eyelid lines are recorded from visual source inspection so stem reflection color cannot misplace them. These are stored per frame in spec headBoxes/headOverrides and output metadata; no runtime eye detection is required.
- Base/gray stalk remains intact after background removal. No leaf pedestal, feet, detached effects or projectiles.

Self-assessment: **good** Doom-shroom, **good** Gloom Doom (subtle cap-width progression), **good** Mega Doom (wider ridged dome). Fine gray striations simplify at64px as expected.

No runtime/index/progress/queue changes or registry ingestion were made by this agent. The ready marker is written only after independent source/indexed-frame QC.

Final independent QC:45nonempty64×64frames; row61bases; safe source-cell and logical-canvas edges; within-clip uniqueness; fixed per-stage palettes; bounded finite head anchors; support center within10px of x32. Metrics in `PROJECT/art-src/pvz-ai/animation/doomshroom-family-qc.json`.
