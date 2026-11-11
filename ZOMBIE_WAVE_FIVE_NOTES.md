# Zombie wave five — production notes

IDs: `yeti`, `pirate`, `mummy`. Actual game identities in new original pixel art; data/save IDs unchanged.

## Inspected identities

### yeti

Licensed actual Yeti: huge shaggy white fur hump, beard and long arms; green-gray face/hands/bare feet, pale yellow eyes with small red pupils, toothy jaw. No horns, backpack, scarf, boots or invented blue face.

Reference: https://walls360.com/plants-vs-zombies-2-zombie-yeti/

### pirate

Licensed actual BASIC Pirate Zombie: dark maroon striped bandana tied at back, gold hoop earring and gold teeth, patched brown coat over red/white stripes, navy pants with red seam and buckled brown boots. Both eyes and both bare hands visible; drop project’s invented captain hook/eye patch/polka dots.

Reference: https://walls360.com/plants-vs-zombies-ii-pirate-zombie/

### mummy

Actual BASIC Mummy Zombie: broad dusty beige head wrap with two exposed eyes/face, tattered beige-gray linen body wraps/robe, red-and-gold geometric Egyptian neck strip, exposed green hands/shins and wrapped shoes. Not Ra/pharaoh and not a generic one-eye mummy.

Reference: https://pvsz2.ru/zombie/6

## Contract

Each source5×3, first13 used, final2 blank: idle2 walk4 attack3 hurt1 fall3. Right-facing, generous margins, complete props, pale cream background, no ground/shadows/detached effects. N64/base61/maxH54/maxW55. Parent owns runtime/index ingestion and final game checks.

## Status

All39 source and indexed frames are reviewed, validated and frozen for parent integration.

## Import and final QC

Yeti's reaching strike spans the adjacent blank gutters; `cropRects[7]=[616,324,388,324]` preserves its full hands and toes without neighboring pose pixels. Face bounds in that frame are normalized to the expanded crop. A uniform +1px horizontal import shift brings its strike support midpoint from21.5 to22.5 while keeping all frame margins. Source originals are preserved unchanged.

Manual source face boxes are recorded for every frame. All39 frames pass64×64 dimensions, per-character consistent palette≤52, valid symbols, empty edges, exact base61, lower support within32±10, finite head metadata and distinct frames in multi-frame clips. `verification/zombie-wave-five-validation.json` records evidence. All indexed sheets and original sources were visually reviewed; full props/subjects remain.

Assessment: Yeti good—actual white shaggy hunch, exposed green-gray face/feet/hands and red eye dots; Pirate good—licensed basic Pirate identity, avoiding invented captain hook/patch; Mummy good—two exposed eyes and actual red-gold neck strip with dusty wraps, distinct from Ra.

Reproduce: `python tools/animation_slice.py art-src/pvz-ai/animation/zombie-wave-five-spec.json`. No runtime/index/data/save/shared-progress/tool edits; parent owns ingestion and game checks.
