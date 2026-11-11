# Pumpkin family production

Production complete and frozen: Pumpkin → Jack-o'-Lantern → Pumpkin King,45drawnframes.

## Inspected actual-game identities

- Canonical Pumpkin armor: https://pvsz2.ru/plant/140 ; image https://pvsz2.ru/statics/plants-big/140.png . A very wide LOW hollow orange ribbed shell,open top rim,dark internal well,and friendly carved jack-o-lantern eyes/nose/broad grin. It is not a round pumpkin emoji or a plant growing inside armor.
- Canonical Jack O' Lantern: https://pvsz2.ru/plant/51 ; image https://pvsz2.ru/statics/plants-big/51.png . A rounder orange pumpkin with green-lit eye/mouth carvings,pupils,square grin tooth,crooked green top stem and attached green flame with pale core. This is distinct anatomy,not just a bigger armor shell.
- Pumpkin King is a project extension of Jack O' Lantern,adding natural body/rib size and a small gold crown at base of flame stem.

References are saved under PROJECT/art-src/pvz-ai/research/reference-agent-queue/pumpkin-actual.png and pumpkin-jackolantern-actual.png. All were visually inspected before generation.

Keep friendly carved expressions and no human limbs/feet/shoes/leaf substitutes. Pumpkins sit on broad rounded body bases and walk via whole-body hops/tilts. The green flame is a connected canonical part of stages1/2,not a detached attack effect. Render light as opaque pixel ramps within contours,without blurred backdrop halos,particles or cast shadows. Stage0 stays naturally low instead of being stretched to fill38px height.

Explicit5×3grid and exact row/cell pose instructions: idle2,walk4,attack3,hurt1,knockedOut2,cheer2,sleep1. N64,base61,maxH38/46/54,maxW56. No runtime/index/queue/sharedprogress edits.

## Completed frozen artifacts

- `PROJECT/art-src/pvz-ai/animation/pumpkin-family-frames.json`:3looks/45indexedframes,ready for main-agent ingestion.
- `pumpkin-family-spec.json`:reproducible64pxslicing,sourceboxes and explicit recorded per-frame head/accessory landmarks from orange body; green stem flame excluded from face center.
- `pumpkin-{0,1,2}-actual-source.png`:final15frameatlases,also under game `_ref/animation/`.
- `pumpkin-{0,1,2}-indexed.png`:all3indexedatlases visually inspected.
- Stages1/2original sources retained as `pumpkin-{1,2}-pre-layout-correction-source.png`; final versions were reframed withimagegen for clear sourcecell margins around greenflametips.
- `pumpkin-family-prompts.json`:identity prompts and repair rationale.
- `pumpkin-family-source-qc.json`:exact5major-silhouette groups per row,complete bodies/flames inside cells.
- `PUMPKIN_FRAME_QC.json`:all45frames pass64canvas/base61,margins,centered support,natural size ceilings,consistent palettes,bounded head/accessory metadata and distinct drawn multi-frameclips.
- `pumpkin-family-components-qc.json`:all45frames are exactly ONE8-connected occupied component; no neighboring-pose fragments or detached flame pieces.

Source and indexed sheets are visually reviewed. Stage0 is the low hollow carved armor shell; stage1 follows canonical green-face/flame Jack O' Lantern; final project King adds restrained gold crown/body growth. No human limbs,leaf-shoes,looseeffects or shadows.

Ingest from PROJECT (notrunbythistask):

```sh
node tools/animation_ingest.js art-src/pvz-ai/animation/pumpkin-family-frames.json --out art-v2-ai-pumpkin-family.js
```

Frozen for Claude handoff at user's request. No new family generation follows. Main agent still needs ingestion/runtime/costume/scene checks. No runtime/index/queue/sharedprogress files were changed.
