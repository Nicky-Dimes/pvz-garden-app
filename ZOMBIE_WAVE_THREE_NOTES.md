# Zombie wave three — production notes

Batch IDs: `polevault`, `disco`, `duckytube`. Actual PvZ game identities, original rich pixel redraws. IDs/data/saves unchanged.

## Inspected reference identities

### polevault

Actual athletic zombie: red track vest/shorts, blue headband and wristbands, straw-blond swept hair, red high-top shoes with white toes, long silver pole with red grip.

Reference: https://plantsvszombies.wikia.com/wiki/Pole_Vaulting_Zombie

### disco

Updated disco Dancing Zombie identity, matching project afro theme: enormous orange-brown afro, round pink glasses with gold rims, sky-blue open-collar shirt with wide white collar, gold medallion, white bell-bottom trousers and orange platform shoes. Use this updated licensed game render, not the older red-jacket dancer.

Reference: https://walls360.com/plants-vs-zombies-disco-zombie-vi/

### duckytube

Classic browncoat zombie with pale-grey shirt/red tie, navy torn trousers, big brown shoes; bright yellow oval rubber-duck ring round waist, orange beak and silly white duck eye, small cream tape patches on ring. Cross-checked with original PvZ1 wiki sprite.

Reference: https://mystickermania.com/sticker-packs/games/plants-vs-zombies-ducky-tube-zombie

Ducky Tube cross-check sprite: https://static.wikia.nocookie.net/plantsvszombies/images/f/fc/Ducky_Tube_Zombie1.png/revision/latest . Initial HTTP requests for the sticker were403; headless Chromium successfully opened and saved the image. Neither a plush toy nor a mod asset was used as the identity reference.

## Production contract

Each source:5×3 cells, first13 active, final2 blank; idle2, walk4, attack3, hurt1, fall3. Face right; full props inside margins; no ground/shadows/detached effects. N64, exact base61, max occupied height54,width55. Keep pole, afro/glasses/medallion and duck ring through actions. Parent owns runtime/index ingestion and final game checks.

## Status

All 39 drawn frames generated, indexed, visually reviewed and validated. Frozen for parent integration.

## Corrections and final QC

Pole Vaulter's first source erroneously drew a second overhead pole in the vault strike. Imagegen corrected the action to one planted pole, then placed its ground contact beneath the torso so its base remains centered. Both rejected intermediate sources are preserved in `art-src/pvz-ai/animation/`. The accepted source is `polevault-actual-source.png`; no procedural art replacement was used.

All three source atlases were checked for source-cell edge crossings: none. No crop override is required. Manual full-face boxes are recorded for all39 frames. Strict background-only seed floods clear enclosed cream gaps under Pole Vaulter’s arms and between Ducky Tube’s legs, preserving the actual clothes and yellow ring/tape patches.

All39 indexed frames pass dimensions64×64, palette≤52 and consistent per character, valid symbols, opaque/empty pixels, empty edges, exact base61, base support centered32±10, finite head metadata and distinct frames in multi-frame clips. Details: `verification/zombie-wave-three-validation.json`; source margins: `verification/zombie-wave-three-source-qc.json`.

Assessment: Pole Vaulter good—actual outfit and a real compact one-pole vault; Disco good—licensed updated afro/pink-glasses identity, clear dance poses; Ducky Tube good—patched yellow ring retained throughout, clear kicks/bite/fall.

Reproduce: `python tools/animation_slice.py art-src/pvz-ai/animation/zombie-wave-three-spec.json`. Source originals stay unchanged; parent owns ingestion and runtime checks. No runtime/index/data/save/shared progress files edited.
