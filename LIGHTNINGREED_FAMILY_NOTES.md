# Lightning Reed family production

Production complete and frozen: Lightning Reed → Storm Reed → Thunder Reed,45drawnframes.

Inspected actual game render: https://pvsz2.ru/plant/57 ; image https://pvsz2.ru/statics/plants-big/57.png , saved in PROJECT/art-src/pvz-ai/research/reference-agent-queue/lightningreed-actual.png.

Canonical Lightning Reed is a luminous WHITE elongated leaf/flame head edged vivid mint green, with small dark-green oval eyes, a pointed upper/back tip, one thin WHITE ZIGZAG STEM blending green near the rooted green leaf rosette. It is not a generic mint curled teardrop mascot or a pea-shooter. No mouth.

Storm Reed and Thunder Reed are project evolutions, not separately established canonical plants. They extend the single white/mint face and reed support with attached swept-back crest tips and restrained internal pale-gold vein accents. Do not add detached bolts/sparks, floating effects, robotic antennas, human limbs or a separate face. Root leaves scoot and reed stem bends; no feet. White luminosity is rendered inside opaque pixel contours, without soft halo painted onto background.

All frames follow explicit row/cell positions for15poses: idle2,walk4,attack3,hurt1,knockedOut2,cheer2,sleep1. Base61,N64,maxH38/46/54,maxW56. Preserve NO MOUTH at every stage and pose.

No queue/runtime/index/sharedprogress files edited by this task.

## Completed artifacts

- `PROJECT/art-src/pvz-ai/animation/lightningreed-family-frames.json`:3looks/45indexedframes,ready for main-agent ingestion.
- `lightningreed-family-spec.json`:reproducible64pxslicing and per-frame luminous-leaf-head face/accessory anchors.
- `lightningreed-{0,1,2}-actual-source.png`:15frameatlases,also under game `_ref/animation/`.
- `lightningreed-{0,1,2}-indexed.png`:all3indexedatlases visually inspected.
- `lightningreed-family-prompts.json`:shared constraints and per-stage identity prompts.
- `lightningreed-family-source-qc.json`:exact5major-silhouette groups per row,complete sprites within their cells.
- `LIGHTNINGREED_FRAME_QC.json`:all45frames pass64canvas/base61,margins,centered lower support,size ceilings,consistent palettes,bounded metadata and distinct multi-frame clips.

All source and indexed sheets were reviewed. Canonical white/mint silhouette and zigzag stem survive conversion; no mouths,human limbs,detached bolts,source-neighbor fragments or soft background halos were added. Explicit row/cell posing produced the correct15frameorder on the first generation pass; no redraw was required.

Ingest from PROJECT (not run by this task):

```sh
node tools/animation_ingest.js art-src/pvz-ai/animation/lightningreed-family-frames.json --out art-v2-ai-lightningreed-family.js
```

Main agent still needs runtime,costume and scene checks. Existing frozen families unchanged.
