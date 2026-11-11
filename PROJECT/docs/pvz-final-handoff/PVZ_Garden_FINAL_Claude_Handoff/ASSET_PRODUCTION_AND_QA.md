# PVZ Garden — full inventory, genuine pixel asset authoring, QA, rollout

## Scale of task and honesty
Expected minimum **3,384 plant pose cells** (141×3×8), **405 zombie pose cells** (81×5), and **24 boss frames** (12×2), BEFORE accessories, effects and UI. This means 423 distinct plant growth looks. These are work estimates from the user's authoritative fact sheet; confirm the actual code inventory. **No generated concept sheet includes thousands of transparent hand-authored individual frames.**

## Art authoring protocol
1. Start with canonical ID, silhouette, approved style, current anatomy and source-source scale. Create native logical-grid sprite at 32×32 for standard characters and 48×48 bosses, using controlled pixel clusters, design motifs and a deliberate local palette. Preserve originals' identities; three stages differ in anatomy, not a size filter.
2. Start each sprite with an explicit alpha mask/shape. Build outlines and colors with integer pixel steps only, 3–5 deliberate shades per material; upper-left light, cool-right/lower shadow; avoid isolated pepper noise, aliasing or blurred edges. Output nearest-neighbor 8× at 256×256 or 384×384 frames.
3. Keep anchors stable (standard frames base y248, x128). Record actual occupied bound and coverage. Outfit/hat layers use named head anchor per plant/pose and per stage.
4. Author each full animation pose, aligned, not merely copying an idle PNG and skewing it. Plant walkA/B are hop steps; zombie walkA/B show leg movement. Hurt, bite, cheer etc genuinely read. Boss 2-frame animation has meaningful supported motion.
5. Assemble plant atlas 4×2 = 1024×512, zombie atlas 3×2 = 768×512 and boss 2-frame packing per source loader. Enforce ≤8MB sheet, sRGB/alpha edges, no frame-edge collision. Name by source IDs.
6. At 1× logical pixel ratio 1:1 and at target on-screen 21–32px, inspect silhouette, expression, progress and hierarchy; use app's actual renderer. Also inspect 4× and 290px popup views. Fix visual issues before integration.
7. Update manifest, compare original vs new in Art Studio, generate category contact sheets, log approved/needs-revision with details. Do not conflate automated validation with human art approval.

## Asset families beyond principal characters
- costumes/fusion overlays, elements, shards/cores, fruits/packet collectibles, projectiles/28 effects, garden/background themes, plants' various ability art, bosses' particles, all game screen icons; shared tiles and fonts; race/parallax, arena art, Adventure maps, Arcade trophy art, Aquarium fish/decor. See full counts in `GAMEPLAY_FACTS_AND_CONSTRAINTS.md`.
- Major background compositions should use a layer stack (sky, mountains/far scenery, trees/structures, ground/lawn, effects) to enable parallax, reduce memory and respect live game geometry. Backgrounds are not single static infographics.
- Use original artwork generated/illustrated for this project; do not trace or rip characters from commercial PVZ game files. Inspired silhouette/identity is allowed while maintaining an original treatment.

## Mandatory validation
- Asset exists for each canonical manifest ID/pose/stage in source; report coverage by category, never merely totals.
- Exact dimensions and alpha. Check all 8 plant cells / 5+blank zombie cells; empty zombie sixth cell fully transparent; file ≤8MB; bounds inset; consistent anchors & facing right.
- Pixel consistency: sample 8× blocks should be uniform and opaque/transparent (unless documented special exception). A simple block-uniformity script can flag violations; visual reviewers decide false positives.
- Compare all statuses/poses and source-dependency fallbacks; verify renderer on both Safari and iOS Home Screen.
- Pixel-art interface passes mobile safe-area, contrast, keyboard/touch, portrait scaling and text overflow.
- Save schema, backup export/restore, cache update, offline and rollback tests pass.
- Never change the meaning of an existing currency cost, level, character ID, hitbox or ability because of art.

## Phase delivery definition
Phase 1: audit and baseline. Phase 2: full art/render system and faithful master assets. Phase 3: **complete source-inventory roster and interface artwork**, with counted manifest coverage and fixed gaps. Phase 4: browser/mobile tests, reports and staging build. Final live push requires owner approval.
