# Potato Mine family — actual-game redraw

Owner: parallel production agent `potatomine_family`. No runtime, index, data, save, or shared progress files are edited by this batch.

## Reference inspected

- Page: https://pvsz2.ru/plant/72
- Image: https://pvsz2.ru/statics/plants-big/72.png
- Local research copy: `research/potatomine-actual.png` under the work research directory.
- Game development reference: `PROJECT/pvz-garden/_ref/actual/potatomine-actual.png`.

The visually inspected render has a squat, lumpy tan potato protruding from an angular brown earth-clod ring, black oval eyes with white highlights, a small smile with one large ivory tooth, and a short gray steel trigger stalk topped by a glossy red sphere. It has no body limbs, pot, or separate green plant stem. The search result from a secondary clip-art mirror was not used as the drawing reference; the actual game render above was downloaded and inspected directly.

Rendering style reference: the approved new Peashooter atlas, `/workspace/generated_images/exec-fa5d028b-d48a-4089-acb6-9c134d4e10df.png`, visually inspected before generation. New pixel art is generated from the identity and style references; the official render is not imported as runtime art.

## Stage decisions

The existing IDs and names are retained: `potatomine` stage 0 Potato Mine, stage 1 Spud Mine, stage 2 Mega Mine. Only the base Potato Mine has a canonical counterpart here. Later stages extend its recognizable shape naturally according to the project progression:

- Potato Mine: simple tan potato, small gray trigger/red bulb, plain earth ring.
- Spud Mine: broader potato, sturdier trigger and slightly larger bulb, wider mound with two small green rear leaves.
- Mega Mine: largest broad potato, bigger red warning bulb, chunky rocky earth mound and a few rear leaves.

All stages keep one face, one trigger and their attached dirt base. No arms, legs, feet, bow ties, armor, detached explosion effects, or extra characters are requested.

## Animation and import

Each stage requests 15 complete drawn poses in a 5-column, 3-row source atlas: idle ×2, walk ×4, attack ×3, hurt ×1, knockedOut ×2, cheer ×2, sleep ×1. Walking uses mound shuffles and body tilts; attack lowers the potato/trigger, springs upward, then recovers. The game supplies battle effects. KO and sleep remain gentle and preserve the attached mine silhouette.

Planned import is 64 ×64, base row 61, maximum stage heights 38/46/54 and maximum width 56. The source sheets, spec, indexed frames and head anchors will be reviewed before handoff to the integrating agent.

Status: all three sources and all45 indexed frames completed. Main agent visually reviewed indexed stages0/1/2 and the stage1 original source, then integrated the family. Current pixel-fidelity, head, duplicate-clip and export checks pass.
