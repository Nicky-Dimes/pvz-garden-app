# Zombie wave one — production notes

Direction: actual Plants vs Zombies game identities, redrawn as original rich pixel art. This batch owns `flag`, `conehead` and `buckethead`; save IDs and game data remain unchanged.

## Inspected identity references

- Flag Zombie: https://pvsz2.ru/zombie/4 — red waving banner with a peach brain emblem, long wooden pole held in hand, bare sparse-haired head; ragged brown suit, red striped tie, exposed shins, big brown shoes.
- Conehead Zombie: https://pvsz2.ru/zombie/2 — plain orange traffic cone with square flat brim, taper and open tip on the classic hunched zombie body.
- Buckethead Zombie: https://pvsz2.ru/zombie/3 — inverted silver metal pail, rolled rim, ellipse top and wire handle crossing head; classic hunched zombie body. Red source stains omitted for family-friendly clean metal.

Each reference was opened and visually inspected. These secondary game-art mirrors are identity references, not runtime images. Copied development references and SHA-256 provenance are recorded in `PROJECT/art-src/pvz-ai/animation/zombie-wave-one-references.json`.

## Source specification

Each generated source atlas uses 5 columns × 3 rows. First 13 cells: idle 2, walk 4, attack 3, hurt 1, fall 3. Last two cells are blank. All face right, with props attached across actions, no ground/shadows/detached effects. The approved Basic Zombie sheet supplies pixel rendering style; the actual references supply silhouette and props. No pink head stickers or exposed head brains were requested.

Runtime target: 64 × 64, base row 61, max occupied height 54, max width 55. Sources are preserved; the existing browser converter handles cutout, indexing, per-character palette consistency and anchors.

## Status

All three source sheets are generated and visually reviewed. All 39 frames have been indexed and visually reviewed. Manual face bounds and enclosed Flag background cleanup are final. Artifact validation passes for all frames; see `verification/zombie-wave-one-validation.json`. No shared runtime registries, index, gameplay or save files edited. Main agent owns integration and final game checks.

## Visual assessment

- Conehead — good: actual orange traffic cone and square brim, slim hunched browncoat body, clear bite/walk/fall silhouettes. Cone stays present throughout.
- Buckethead — good: distinct metal pail, dents and wire handle with clear uncovered googly eyes; pail stays attached throughout.
- Flag — good: red brain banner, rear pole position and readable face remain consistent; flag grip is less explicit in the last seated fall frame, while the pole remains leaning against the body.

Source originals are preserved at `PROJECT/art-src/pvz-ai/animation/{conehead,buckethead,flag}-actual-source.png` and mirrored under `pvz-garden/_ref/animation/`. The generated-image origin paths and hashes are in `zombie-wave-one-sources.json`. No actual-game reference pixels are used as runtime sprites.

### Import refinements

Manual source face boxes are recorded for all 39 frames. Automatic green-component detection was unsuitable for Buckethead because the wire handle divides visible skin and could select a hand; the boxes keep costume/projectile anchors tied to the full face. The Flag source has enclosed cream gaps behind the head and pole; explicit background-only flood seeds (strict colour threshold 18) clear those gaps without painting over the art. Sources remain unchanged.
