# Zombie wave six — production notes

IDs: `ra`, normal-zombie `gargantuar`, `jackbox`. Actual game identities, new original pixel frames; no runtime/data/save/index changes.

## Inspected identities

### ra

Actual Ra: cream falcon-face printed crown, purple/blue painted falcon eye motifs and dark beak, gold-orange striped side flaps, two real zombie eyes below; gold sun staff and sun necklace, gold arm bands/belt over dusty mummy wraps. Sun props have no faces.

Reference: https://walls360.com/plants-vs-zombies-ii-ra-zombie/

### gargantuar

Normal64px Gargantuar must match user-approved96px boss source: muscular hunch, huge arms, brown sleeveless vest/red collar/rope belt, dark torn trousers/brown boots, wooden telephone pole with insulators, red-shirt Imp in strapped back basket. Existing approved boss source and preview are preserved under their original names; new normal source/preview use gargantuar-zombie prefix.

Reference: https://plantsvszombies.fandom.com/wiki/Gargantuar

### jackbox

Actual PvZ1 Jack-in-the-Box: bald wiry-haired green-gray head with stubble, off-white straitjacket and torn baggy off-white trousers, brown leather straps/buckles, bare green feet, red star-marked cube with cyan lid held in long sleeves. NOT the project’s invented striped clown suit/ruffle/cap. Verified against original small game sprite.

Reference: https://plantsvszombies.wiki.gg/wiki/Jack-in-the-Box_Zombie_(PvZ)

The approved Gargantuar pixel boss source at `PROJECT/art-src/pvz-ai/animation/gargantuar-actual-source.png` is the primary visual continuity reference for the normal sprite. New normal source must be `gargantuar-zombie-actual-source.png`, with `outputStem:gargantuar-zombie`, preserving older approved boss assets.

## Contract

5×3 first13 cells/final2 blank; idle2 walk4 attack3 hurt1 fall3, right-facing. Full props and clear margins, pale cream background, no ground/shadows/detached effects. N64/base61/maxH54/maxW55. Parent owns ingestion/game checks.

## Status

All39 source and indexed frames are reviewed, validated and frozen for parent integration.

## Import and final QC

All three striking poses use expanded source crop `[616,324,388,324]`, keeping complete staff/pole/box/shoes in otherwise empty gutters and excluding neighboring poses. Recorded face boxes use expanded-crop coordinates in index7. Strict background-only seeds clear enclosed gaps under Ra/Gargantuar arms in standing/actions; original pixels remain unmodified.

Normal Gargantuar uses `gargantuar-zombie-actual-source.png` and `outputStem:gargantuar-zombie` to keep boss assets separate. The approved boss source and `gargantuar-indexed.png` hashes were checked before and after conversion and are unchanged; evidence in `verification/zombie-wave-six-protected-boss-hashes.json`.

All39 frames pass dimensions64×64, consistent palette≤52, valid symbols, empty edges, exact base61, centered lower support32±10, finite recorded main-face anchors, distinct frames within multi-frame clips. `verification/zombie-wave-six-validation.json` records all frame bounds. All originals/indexed previews visually reviewed with full props/subjects retained.

Assessment: Ra good—actual falcon-printed nemes, orange-gold stripes and sun props; normal Gargantuar good—matches approved bulky body, red collar/Imp basket/insulator club, with proper walk/bite/fall extension; Jack-in-the-Box good—actual off-white strapped outfit and cyan-lidded red star box, replacing invented clown costume.

Reproduce: `python tools/animation_slice.py art-src/pvz-ai/animation/zombie-wave-six-spec.json`. No runtime/index/gameplay/save/shared-progress edits; parent owns integration/checks.
