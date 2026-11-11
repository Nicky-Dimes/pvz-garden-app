# Sea-shroom family production

Status: complete;45indexed frames frozen for parent/Claude integration. Finished existing source batch without further generation after the freeze instruction.

## Inspected actual-game references

- Larger community-wiki render: https://static.wikia.nocookie.net/plantsvszombies/images/d/d0/Sea-shroomHD.png ; local `PROJECT/art-src/pvz-ai/research/seashroom/Sea-shroomHD.png`.
- Original-game thumbnail checked for identity: https://static.wikia.nocookie.net/plantsvszombies/images/8/8c/Sea-shroom1.png ; local file in same folder. The thumbnail is a pool screenshot, not a runtime asset.
- Both were visually inspected. Actual anatomy: broad dome DARK GREEN mushroom cap with large darker green circular spots, pale mint/aqua short body with two black oval eyes, small forward green trumpet nozzle, a continuous flaring pale-cyan stalk/base and thin aqua frond/tentacle-like basal roots. No human feet or leaf pedestal.
- Parent direction uses actual anatomy rather than old mint-cap simplification. Tide-shroom and Ocean-shroom are project extensions, not separately canonical species: naturally expand cap/rim, spots and aqua basal fronds while preserving mushroom body/nozzle.
- Keep stalk flaring into a continuous footless base as explicit family rule. Basal aqua fronds are botanical/aquatic anatomy rather than drawn water/shadow/effect; no pool/blue puddle in sources.
- Detailed URL record `PROJECT/art-src/pvz-ai/research/seashroom/references.json`.

## Final source batch / QC

- `PROJECT/art-src/pvz-ai/animation/seashroom-family-{spec,frames,prompts}.json`; three final `seashroom-{0,1,2}-actual-source.png` and indexed previews, with source/spec copies in `_ref/animation/`.
- All source and indexed sheets visually inspected. Canonical short cyan basal fronds remain attached to the flaring stalk/base; they are reference anatomy, not human legs/feet or blue water background. Tide/Ocean add wavy then double aqua cap frills and expanded green spotted caps.
- Row2col5 hurt, row3cols1/2 fully closed-eye KO, row3cols3/4 happy crescent-eye cheer, and row3col5 fully closed-eye sleep are correct. Windup/nozzle thrust/recovery are distinct and right-facing.
- All45passed64x64, transparent margins, exact base61, centered support32±10, bounded recorded face/head/hat anchors, consistent≤52color stage palettes and no duplicate frames within multi-frame clips. Result `verification/seashroom-qc.json`; harness `/workspace/work/pvz/runtime-review/check_family.py seashroom`.
- No generation rejection or corrective redraw. No runtime/index/progress/tool edits. Ready marker is written last after successful QC; registration remains the parent's responsibility.
