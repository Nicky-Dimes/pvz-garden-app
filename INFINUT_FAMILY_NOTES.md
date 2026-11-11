# Infi-nut family production

Status: complete;45indexed frames frozen for parent integration. No runtime registration by this task.

## Inspected actual-game reference

- Actual PvZ2 render: https://pvsz2.ru/plant/49 ; image https://pvsz2.ru/statics/plants-big/49.png . Saved/visually inspected `PROJECT/art-src/pvz-ai/research/infinut/infinut-actual.png`, URL record `reference.json`.
- Large rounded lumpy cyan/aqua holographic walnut shape with ridged edge and scan-like facets, two luminous off-white pupil-less eyes, small gentle mouth, short pale-cyan projection funnel connecting to a gray elliptical projector ring with cyan aperture and3round cyan lamps, resting on dark green base leaves.
- Preserve cyan body identity, not pink/purple crystal, brown nut or robot person. Holographic light uses opaque pixel ramps and bright cyan edge rather than semitransparent pixels or surrounding aura.

## Canonical versus project progression

- Base Infi-nut follows actual shape/projector/blank luminous eyes. Infi-Shield and Infi-Fortress are project extensions, not separately claimed canonical species.
- Infi-Shield adds a clean attached segmented cyan protective oval behind the central nut and a sturdier projector.
- Infi-Fortress adds stronger scan facets/protective rim and a broader low continuous reinforced gray projector platform over green leaves. Fortified base is mechanical plant anatomy, not legs, boots, turrets or a humanoid body.
- All15states explicitly placed by row/column. KO1/KO2 and sleep show white eyelid arcs fully closed instead of open white eye shapes, with readable drooping hologram rather than disappearance. Cheer uses happy upward white eye arcs. Attack compresses then pushes the nut/shield right, with connected projector/funnel and no detached beam.
- Parent owns runtime/index/ingestion. This task owns only family source/spec/data/ready/notes.

## Final files / QC

- `PROJECT/art-src/pvz-ai/animation/infinut-family-{spec,frames,prompts}.json`; three `infinut-{0,1,2}-actual-source.png` and indexed previews, with source/spec copies in `_ref/animation/`.
- All source/indexed sheets visually inspected. Pupil-less luminous eyes open in active poses, squeeze for hurt, close as thin white arcs in KO/sleep, and turn upward for happy cheer. Stage1 has a segmented shield oval; final stage has stronger faceted scan material and broader projector/leaf platform. Both are documented project evolutions.
- Head boxes follow the holographic nut silhouette (excluding projector and shield ring). Separately authored source eye rows derive stored per-frame `ey` overrides so costume eyes follow actual luminous eyes while hats follow nut crown. This metadata is stored in the family spec, with no shared-tool changes.
- Strict background-color seeds clear enclosed shield-ring gaps without cutting white eyes, cyan material or gray projector.
- All45passed64x64, transparent margins, base61, centered support32±10, bounded recorded head/hat anchors, consistent≤52color stage palettes and no duplicate frames within multi-frame clips. Result `verification/infinut-qc.json`; harness `/workspace/work/pvz/runtime-review/check_family.py infinut`.
- No generation rejection or corrective image redraw. Shared runtime/index/progress/tools untouched.
