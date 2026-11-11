# Zombie wave seven — production notes

IDs: `digger`, `knight`, `cowboy`. Actual-game identity research, new original pixel art, fixed game/save IDs.

## Inspected identities

### digger

Actual PvZ1 stocky Digger: gray-white hardhat with large yellow lamp, black sideburn/hair tufts and stubble, pink googly eyes, red plaid shirt, dark blue short overalls, steel pickaxe on wooden handle; one brown boot and one bare green foot. Cross-checked against original game sprite. Not a generic yellow-hat blue miner.

Reference: https://plantsvszombies.wiki.gg/wiki/Digger_Zombie_(PvZ)

### knight

Licensed Knight Zombie: large silver helmet with raised slotted visor, red feather plume, U-shaped chin/neck guard and shoulder pauldron, but body is ragged olive/brown peasant tunic with rope belt, patched shoulder and brown stitched shoes. Both eyes/face visible. No invented full-body plate armor, sword or shield.

Reference: https://walls360.com/plants-vs-zombies-ii-knight-zombie/

### cowboy

Actual Cowboy Zombie: dark brown/maroon wide hat, red white-POLKA-DOT neckerchief, brown fringed jacket over blue shirt, navy trousers with red chaps and black lacing, gold belt buckle, one bare green hand/one brown leather glove, pointed brown Western boots with gray star spurs. Unarmed.

Reference: https://pvsz2.ru/zombie/37

## Contract

5×3 source grid, first13/final2 blank, idle2 walk4 attack3 hurt1 fall3. Right-facing, full props within margin, cream background, no ground/shadow/detached effects. N64/base61/maxH54/maxW55. Parent owns runtime/index/data/save integration.

## Status

PENDING — user requested immediate freeze and handoff to Claude before generation began. References are downloaded and visually inspected. No generated source atlases, spec/frames JSON, registry ingestion or ready marker exist for this wave.

## Handoff boundary

Production stopped at the user's explicit freeze request. Continue only when authorized after handoff. Next three IDs are `digger`, `knight`, `cowboy`; their reference manifest is `PROJECT/art-src/pvz-ai/animation/zombie-wave-seven-references.json`. Remaining work: generate13 drawn poses per character, preserve source/_ref copies, record per-frame face boxes and any source crops/background seeds, slice to N64/base61, verify all margins/center/palette/anchors/clip uniqueness and inspect the indexed output. Only then create a ready marker for parent/Claude integration.
