# PVZ Garden art guide

Everything in the game is procedural pixel art drawn in code (no image files). The source is `pvz-garden/`; never edit `pvz-garden-app/` (it is the built copy).

## 1. The look: TRUE chibi (read this twice)

The family's verdict on the first attempt was "terrible and not cute at all". That version kept the old proportions (small heads on long stems, tiny dot eyes, thin lines). **Recreate every character from scratch. Do not restyle old code.** The gold standard is `docs/chibi-reference.js` (Peashooter, Sunflower, Wall-nut and a basic zombie). Open it, render it, and match its proportions, eyes, shading and outline exactly:

```
RENDER_EXTRA=docs/chibi-reference.js node tools/render_sheet.js out.png script.js
```

In your script, set `PX.PLANT_ART.peashooter = PX.CHIBI_DEMO.peashooter`, etc.

**What chibi means** (researched; "chibi" = small, super-deformed):

1. **The head is the character.** Chibis are 1.5–2.5 heads tall; our plants are about 1.3 heads tall. The head is ROUND and at least as wide as it is tall.
   - Plant heads have a radius of about **8 / 9 / 10 art px** at stages 0 / 1 / 2, with the head bottom at art row ~25–26.
   - Under the head sit two little round base leaves (rows 27–30) and a stem of at most 2–3 px, often hidden.
   - **No long stems, no thin necks, no legs.**
1b. **Not one circle for everything, but SUBTLE.** The family said a perfect circle is too simple, then that a wide oval was "worse, way too oval". Shapes should be only slightly off-round, with a gentle profile (a slight lean, a fuller back, a softly flattened chin), so it isn't noticeable. Parts must stay in proportion: Peashooter's snout is a SHORT tube merged into the head. Every character gets its own distinctive silhouette:
   - Wide ovals: Peashooter, fuller at the back.
   - Eggs: Wall-nut, Tall-nut.
   - Beans: Coffee Bean, Laser Bean.
   - Pears and gourds: Squash.
   - Squashed domes: mushroom caps.
   - Teardrops: Lightning Reed.
   - Stars, hearts, flat lily pads, spiky durians, and so on.

   Build shapes from 2–3 overlapping ellipses or polys so they feel organic, and keep them chunky and chibi.
2. **Big eyes set LOW and wide.** Each eye is about a third of the head's height, placed a little BELOW the head's centre and shifted ~1 px toward the front (sprites face right). They are glossy dark ovals with a big white shine at the upper left and a small one at the lower right, the same corner on every character.
   - Use `PX.art.chibiEyes(g, cx, cy, { sp: r*0.86, w: r*0.48, h: r*0.64, mood: P.eyes })` (the art director's v3 sizes, about a third of the head's height; smaller eyes read as creepy beads). See `docs/chibi-reference.js` for every sample.
   - White eyes with pupils (Wall-nut, zombies) use `{ white: true, look: [dx, dy] }`.
   - Moods: happy, closed, blink, sleepy, sad, brave and mad all exist.
3. **Tiny mouth or none.** `PX.art.chibiMouth(g, cx, cy, P.mouth, w)` with w about 2–2.6 art px: '‿' default, open, o, flat, grin, frown, cat 'ω'. No nose.
4. **Soft blush** under the eyes: `PX.art.blush(g, cx, cy, { sp })`.
5. **Simplify hard.** Big bold shapes; the character's 1–2 signature features drawn LARGE and clear (Peashooter's snout and bow tie, Sunflower's petals, Chomper's mouth); no small clutter or texture.
6. **Soft flat colour.**
   - Fill big shapes with `PX.art.softBody(t, cx, cy, rx, ry, [light, mid, shade])` inside `PX.piece(g, t => ...)`: a flat pastel fill, a soft crescent of shade along the lower-right edge and a small highlight up-left.
   - Small parts use flat colour, or `[mid, mid, shade]` ramps.
   - Pastel palettes: mint and lime greens, butter yellow, peach, baby blue, lilac, soft pink. No dark muddy tones and no dithering (hi-res grids don't dither by default).
7. **Bold clean outline.** Pieces get a 1-fine-pixel inner outline from `PX.piece`, and the core adds a bold extra ring round the whole character automatically (`g.outerLine()` after your art function). Don't draw your own outer black lines.
8. **Body language.**
   - Walking = the whole plant hops 1–2 px on frame 1 (maybe a squash on frame 0).
   - `arms:'up'` = a happy hop or raised leaves.
   - Expressions come from the eye moods and the mouth.
9. **Zombies (chibi):** the head is about 60% of the height (radius ~9–10, centred around row 11). Big white googly eyes with small pupils, a pink sticky note on the forehead, a few hair strands, a tiny egg body in a brown coat with a white shirt and red tie, stubby legs and shoes, one short arm reaching forward. Silly and cute. Accessories (cone, bucket, helmet, ducky tube, etc.) are big and chunky and sit on the big head.
10. **Zombosses** are big, round, toy-like and friendly-silly. Same rules at 48×48.
11. **Props, critters, items and backgrounds** follow the same rules: round, chunky, pastel, soft crescent shading, bold outline on sprites, simple shapes. Cute faces (dot or glossy eyes + blush) on creatures. Backgrounds are a soft pastel checker lawn, sparkly light-blue water and puffy rounded clouds and trees.

## 2. Resolution and drawing API

The whole game draws at **2 fine pixels per art pixel** (`Grid.K = 2`). Sprites are still laid out in **art pixels**: 32×32 for plants and zombies, anchored at the bottom (16, 31), facing right.

- `g.ell / g.poly / PX.stroke(g, ...)` rasterise at fine resolution, giving smooth curves.
- `g.set / g.px / g.rect / g.str / g.get / g.filled` work in art pixels:
  - A `set` colours the whole 2×2 block, but if the block holds part of a shape, it colours only that shape's fine pixels and leaves the outline alone.
- **Fine detail:**
  - `g.dot(x, y, col)` sets ONE fine pixel at fractional art coordinates (`10.5` = the right half of art pixel 10). `g.dots([[x, y], ...], col)` sets several.
  - `g.fset(fx, fy, col)` and `g.fget(fx, fy)` take raw fine coordinates; `g.ffilled` is the fine-pixel version of `filled`.
  - `g.k` is 2.
  - Use fine pixels for sparkles, thin mouths, small highlights, tiny spots, stitches and seams. Don't scatter per-pixel noise.
- **Shared helpers in `PX.art`:**
  - `face(g, x, y, P, o)`, `madFace(g, x, y, P, o)`, `mouth(...)`
  - `leaf(g, x, y, len, ang, ramp, fat)`, `baseLeaves(...)`, `stemTo(...)`, `shroomFoot(...)`
  - `piece`, `mixHex`, `pal`, `LEAF`, `hatAt`, `armyHelmet`
  - `feet()` now draws nothing, because plants have no legs.
- **Plant contract:** `PX.PLANT_ART[id] = function (g, stage, P, C)`, where `C` is the palette `PX.PLANT_PAL[id]` (element-tinted). It returns the geometry `{ hx, hy, hr, top, ey, hat?, front? }`, which the core uses to place element effects, fusion parts and items, hats and skins.
  - Register the palette with `PX.PLANT_PAL[id] = { main: [light, mid, dark], leaf: [...], stem, root, acc?: [...], part: '<fusion part id>' }`.
  - Stage 0, 1 and 2 must look clearly different and grow; stage 2 should stay at or below art row 2.
- **Poses (`P`):**
  - `eyes`: `'happy' | 'closed' | 'blink' | 'sleepy' | 'sad' | 'brave'`
  - `mouth`: `'open' | 'o' | 'flat' | 'grin' | 'smile'`
  - `walk: true` with `frame: 0 | 1`: walking. With no legs, plants **hop and bob or squash** on their base leaves.
  - `arms: 'up'`: cheering, which can be a leaf wave or a little hop.
- **Zombie contract:** `PX.ZOMBIE_ART[kind] = function (g, P, L)` on a 32×32 grid, facing right, with feet on rows 29–31. Poses use `P.walk` / `P.frame` and `P.mouth`.
- **Zombosses:** `PX.BOSS_ART[id] = { w: 48, h: 48, draw(g, f) }`, with `f` = animation frame 0 or 1.
- **Render tool:** `node tools/render_sheet.js OUT.png SCRIPT.js`. The script gets `PX`, `PSDATA` and `sheet`:
  - `sheet.add(canvas)`, `sheet.row()`, `sheet.scale = n` (art-pixel scale), `sheet.bg = '#rrggbb'`.
  - Hi-res canvases draw at the same size with full detail.
  - Example: `sheet.add(PX.sprig({ species: 'peashooter', stage: 1 }, { eyes: 'happy', mouth: 'open' }))`.
  - **Cache gotcha:** `PX.sprig` caches by `JSON(L)+JSON(P)`. Add a dummy key to `P` if you monkeypatch while testing.
- `node tools/check_pvz.js` must pass for your part before you finish.

## 3. The family's rules (from the kids' feedback)

- **No legs or feet on any plant.** PvZ plants are rooted: they sit on base leaves, roots, a pad or a pot. The only exception is a plant that really has wheels, such as Cob Cannon's cart.
- **Mad faces** (now `chibiEyes(..., { mood: 'mad' })` plus a `frown` or `grin` mouth; brows clearly slanting down to the middle) belong only to these plants:
  - Cherry Bomb, Squash, Cactus, Doom-shroom and Jalapeño (all stages)
  - Fume-shroom (= puffshroom stage 1)
  - Coconut Cannon (all stages)
  - Melon-pult (= melonpult stage 0; it's its own plant now)
  - Cob Cannon (= kernelpult stage 2)

  Every other existing plant is friendly by default and only scowls when `P.eyes === 'brave'`. New plants follow the wiki look below; a few new ones are grumpy in PvZ, and that's fine.
- **No eyes:** Chomper.
- **No mouth:**
  - Lily Pad, Melon-pult and Cob Cannon.
  - Lightning Reed: also a glowing mint-green teardrop bulb on a reed, with eyes only. Not mad.
- **Mushrooms** never have feet: the stalk flares to the ground.

## 4. PvZ reference: what each plant looks like (from the PvZ wiki gallery)

The PvZ wiki pictures, condensed. Keep each plant's **identity** (silhouette, colours, signature parts), drawn in the chibi style above.

### Existing plants

- **Peashooter / Repeater / Gatling Pea:**
  - A round pale-green head with a tube snout to the right, a small leaf tuft at the back, a thin stem and base leaves.
  - Dot eyes, no mouth (the snout is the mouth), and a tiny red bow tie.
  - Repeater has a second leaf tuft at the back.
  - Gatling Pea has an olive army helmet and a 4-barrel snout.
- **Sunflower / Twin Sunflower / Sunflower Queen:** rounded butter-yellow petals around a warm brown face, dot eyes and a happy smile. Twin = two heads; Queen = three heads, or one with a petal crown (keep 3 flowers at stage 2).
- **Chomper:** a big purple head with a huge toothy mouth (white teeth, pink tongue), light spots on the head, NO eyes, a stem and leaves.
- **Wall-nut / Tall-nut / Giga Tall-nut:** a brown nut with big friendly eyes (white with dark pupils) and **no mouth**. Tall-nut is taller.
- **Snow Pea:** an icy pale-blue Peashooter with ice crystals instead of the back leaf.
- **Cherry Bomb:** two red cherries joined by stems with a leaf, angry faces with gritted teeth.
- **Potato Mine:** a potato peeking out of a dirt mound, with an **antenna** (grey stalk, red or grey ball), small eyes and a little mouth.
- **Puff-shroom → Fume-shroom → Gloom-shroom:**
  - Puff: a small purple cap on a pale stalk, eyes.
  - Fume: a big purple cap whose front stretches into a funnel or horn, with a grumpy face on the stalk.
  - Gloom: a round purple cap ringed with vent tubes and worried eyes.
- **Sun-shroom:** an orange-yellow cap with brown spots, a cream stalk, cute eyes and a smile.
- **Cabbage-pult → Cabbage Launcher → King Cabbage-pult** (the family asked: Cabbage-pult stays a cabbage at every stage):
  - A cabbage head with leafy "hair" and a catapult arm holding a cabbage in a basket; leafier and bigger at stage 1, a crown of curled leaves at stage 2.
- **Melon-pult → Winter Melon → Mega Winter Melon** (a separate plant, unlocked when a Cabbage-pult evolves):
  - Melon-pult: a striped watermelon body, mad, no mouth, with an arm holding a melon.
  - Winter Melon: a frosty blue melon with icy spikes.
  - Mega Winter Melon: a bigger, grander frosty melon with more ice.
- **Kernel-pult → Butter-pult → Cob Cannon:**
  - Kernel-pult: a corn cob in husk leaves with a **yellow mustache** and an arm with a kernel or butter.
  - Cob Cannon: a big cob on a **wooden cart with round wheels** (donut wheels in the chibi reference), mad, no mouth.
- **Squash:** a pale-green squash with heavy angry brows and a frown, sitting on the ground.
- **Jalapeño:** a red chili, angry, with gritted teeth and a curly stem.
- **Cactus:** a green cactus with arms, a red/pink flower on top, spines, and a little tube on the side it shoots from. Mad.
- **Spikeweed / Spikerock:** a low brown mound of thorns (Spikerock is grey rock spikes) with tiny eyes.
- **Torchwood:** a tree stump with a fire on top, an angry face and teeth.
- **Lily Pad:** a green pad with eyes only.
- **Tangle Kelp:** dark tangled kelp in water with glowing red eyes, no mouth.
- **Starfruit:** a yellow star with dot eyes and a smile, plus a stem nub.
- **Magnet-shroom:** a red horseshoe magnet with silver tips on top of a mushroom stalk, with the face on the stalk. Gold Magnet is a gold horseshoe.
- **Hypno-shroom:** a pastel **rainbow** cap and a white stalk with **swirly** eyes, no mouth.
- **Doom-shroom:** a **black / charcoal** cap and a grey stalk with angry red eyes. Mad.
- **Iceberg Lettuce:** an icy translucent lettuce head with big round eyes, no mouth, on a frosty puddle.
- **Bonk Choy:** a bok choy body with **huge leafy fists**, one squinty eye, buck teeth, determined.
- **Lightning Reed:** glowing green teardrop bulb, eyes only (see the rules).
- **Laser Bean:** a green kidney bean with an **antenna** on top and red angry-ish eyes, no mouth (friendly by default per the rules: just red eyes).
- **Garlic:** a cream garlic bulb, one big eye and one squint, a little grimace.
- **Snapdragon:** a yellow-green dragon head with horns, an orange frill and yellow eyes on a stem; it breathes fire.
- **Marigold:** white petals around a yellow-orange face with a smile.
- **Pumpkin:** an orange carved jack-o'-lantern shell (the carved face is the face).
- **Coconut Cannon:** a coconut barrel cannon on leafy roots, angry eyes, a lit fuse spark at the back, no mouth.
- **Bloomerang:** a flower head with white/yellow boomerang petals and a green face bulb.
- **Electric Blueberry:** a small glossy blue berry with eyes and a smile, sparking.
- **Infi-nut:** a **blue / cyan hologram** wall-nut on a little projector base with soft eyes. Blue, not pink.

### The 30 newer plants

- **Threepeater:** three pea heads on branching stems, each with a snout and dot eyes, plus bow ties.
- **Split Pea:** one pea head with snouts on BOTH sides (front and back).
- **Scaredy-shroom:** a tall thin stalk, a purple spotted cap and a long periscope tube snout, worried eyes.
- **Ice-shroom:** a spiky icy crystal cap on a light-blue stalk, a frowny face.
- **Sea-shroom:** a small green-capped mushroom floating in water with little tentacle roots.
- **Plantern:** a glowing yellow lantern in a dark frame with leaves on top and a face in the glow.
- **Blover:** a 3-leaf clover fan on a thin stem with a face in the middle (eyes, an "o" mouth).
- **Cattail:** a pink cat-like plant on a lily pad: cat ears, a cat face (whiskers, eyes, small mouth) and a brown cattail spike on its tail.
- **Umbrella Leaf:** a big leafy umbrella canopy over a small light-green face bulb.
- **Coffee Bean:** a brown bean with big googly eyes, a small mouth and a stem nub. It floats.
- **Grave Buster:** a dark grey tombstone-like block covered in vines with glowing yellow eyes (it eats graves).
- **Spring Bean:** a green bean whose lower body is a coiled spring (ribbed), big worried eyes.
- **Chili Bean:** a red bean with a curly stem, eyes and a cheeky smirk.
- **Pea Pod:** an open green pod with pea heads peeking out (1 at stage 0, 2 at stage 1, 3–5 at stage 2), with leaves.
- **Hot Potato:** a brown potato with sleepy half-lidded eyes, warm and glowing.
- **Pepper-pult:** an orange bell-pepper body with grumpy eyes and a catapult arm holding a flaming pepper, leaves at the base.
- **Stunion:** a red onion with bored half-lidded eyes, a frown and sprouts on top.
- **Red Stinger:** a red rose-like flower head with sharp petals and angry eyes, on a stem with leaves.
- **Electric Currant:** a white ghost-shaped berry with a stem on top, eyes and a small mouth; it floats and sparks.
- **Endurian:** a spiky orange durian with grumpy brows, no mouth.
- **Citron:** an orange citrus ball with determined eyes and green slanted brow marks; it floats and glows with plasma.
- **E.M.Peach:** a red-orange peach with big eyes and an **antenna with a blue ball and rings**.
- **Celery Stalker:** green celery stalks popping out of a dirt mound with angry eyes.
- **Guacodile:** an avocado-green crocodile head with yellow eyes and bumpy scales.
- **Banana Launcher:** a yellow banana with its peel open, a face (eyes, smile) and a launcher.
- **Moonflower:** a blue-violet tulip flower over a small yellow-green face bud.
- **Magnifying Grass:** a pale crystal lens with eyes, held up by leaves.
- **Shadow-shroom:** a purple mushroom cap dripping dark goo over a yellow-green face sticking out its tongue.
- **Hurrikale:** swirling teal/blue-green kale leaves (wind curls) with a face in the middle.
- **Fire Peashooter:** a red/orange Peashooter with a flame instead of the back leaf, glowing.

### The fourth wave: 24 newer plants (2026-10-04)

- **Imitater:** a pale grey-white potato with a two-leaf sprout on top, big curious eyes, a small "o" mouth.
- **Power Lily:** an orange lily, pointed petals (yellow centre) round the face, two base leaves, a warm glow.
- **Chard Guard:** a leafy chard plant, green leaves with pink-red ribs fanning out like a shield.
- **Sun Bean:** a yellow-orange kidney bean with a leaf on top and a little sun symbol on its body.
- **A.K.E.E.:** a red-orange pear-shaped pod split open on top, cream inside and a shiny black seed like a hat.
- **Gold Leaf:** a shiny golden leaf (tip up, centre vein) with a face and sparkles.
- **Toadstool:** a big red cap with white spots, a cream stalk flaring to the ground, a playful tongue.
- **Strawburst:** a red strawberry with yellow seeds and a green leafy crown.
- **Bowling Bulb:** a purple onion bulb with a sprout tuft and three bowling-ball finger holes.
- **Homing Thistle:** a purple spiky thistle puff crowning a green spiny bulb body.
- **Stallia:** a pale icy blue/white flower with frosty petals and ice sparkles.
- **Phat Beet:** a round magenta beet with a big leafy top and little sound-wave arcs.
- **Spore-shroom:** a tan-brown mushroom with a puffy cap covered in round spore bumps and big round glossy eyes.
- **Intensive Carrot:** an orange carrot tucked into leaves, a bushy leaf top, a tiny heart sparkle.
- **Primal Peashooter:** a chunky pea head with a rocky stone-grey snout and a leafy prehistoric mane.
- **Primal Wall-nut:** a tall brown nut with a mossy top patch and stone chips (not a Wall-nut recolour).
- **Perfume-shroom:** a lilac-pink mushroom with a perfume-spray bulb and nozzle on its cap.
- **Nightshade:** a dark purple closed-tulip hood with a softly glowing face peeking out.
- **Dusk Lobber:** a purple mushroom whose cup-shaped cap holds a glowing spore ball.
- **Grimrose:** a deep plum-red layered rose with a face and a curly thorny vine; mysterious but friendly.
- **Sweet Potato:** a big purple-pink sweet potato with a leafy sprout and rosy cheeks.
- **Wasabi Whip:** a pale green wasabi root with whip-like leaf tendrils (more at later stages).
- **Missile Toe:** a mistletoe sprig, white berries (face on the biggest), dark green leaves, a red ribbon, frost.
- **Kiwibeast:** a fuzzy brown kiwi cut open in front to green flesh with a ring of tiny black seeds; fluffier at stage 2.

### Legendary plants (won in Survival; PvZ Heroes plant heroes, rooted like every plant)

- **Green Shadow:** a Peashooter superhero, dark domino mask, purple cape, lightning emblem.
- **Solar Flare:** a sunflower heroine with flame-like petals and sunglasses on her head.
- **Wall-Knight:** a Wall-nut in a plumed knight helmet with a small round shield.
- **Chompzilla:** a regal purple Chomper (NO eyes, family rule) with a toothy grin, crown and cape.
- **Spudow:** a potato hero with a red bandana mask and a lit fuse-sprout.
- **Nightcap:** a purple mushroom ninja with a mask band, a scarf and a throwing-star badge.
- **Captain Combustible:** a Torchwood log with a flame top, a captain's hat and a moustache.
- **Rose:** a rose sorceress with petals framing her face like a hood and a star wand.

All legendary plants get a soft golden sparkle; stage 2 ("Legend") is the grandest.

### My Aquarium (the sixth tab, 2026-10-11)
A saltwater tank in the same chibi sticker style. Contract in `art-aqua.js`: `PX.FISH_ART[id] = { w, h, draw(g, f) }` (faces right;
f = tail swish / leg shuffle / bell pulse), `PX.DECOR_ART[id]` (anchored bottom-centre, f = sway / open / bubbles),
`PX.AQUA_BACKDROP[id] = { water: [top, mid, deep], draw(g, w, h) }` (far scenery only, soft and lower-contrast than the fish) and
`PX.AQUA_SAND[id] = { ramp, dots }`. The builder adds the bold outer line.
- Fish: a round chunky body, ONE big glossy side-view eye (`chibiEyes({ one: true })`), blush, a tiny smile; the species' colours
  and pattern big and simple. Cute and friendly, never scary (the lionfish, shark and octopus too). `puffer:puffed` and
  `zombiepuffer:puffed` are the tapped, puffed-up looks. Legendaries get a golden glow and twinkles.
- Decorations: corals, an anemone (clownfish hide in it), shells, rocks, a chest and a clam that open, bubblers, a ship and a castle,
  plus PvZ touches (Sea-shroom, Tangle Kelp, a Snorkel Zombie statue, Crazy Dave's pot) drawn like the game's plants and props.
- Who draws what: `art-fish.js` (commons + early rares), `art-fish2.js` (the rest + legendaries), `art-aquadecor.js`
  (decorations), `art-aquaworld.js` (backdrops + sand). `aquarium.js` (the scene) is the main session's.

## 5. Who edits what

Several helpers work at the same time. **Only edit the files you own.**

| File | Owner |
|---|---|
| `art-plants.js`, `art-plants2.js` | Plants A (existing 19) |
| `art-plants3.js` | Plants B (existing 15) |
| `art-plants4.js` | New plants C |
| `art-plants5.js` | New plants D |
| `art-zombies.js`, `art-zombies2.js` | Zombies E |
| `art-core.js` (everything except the face/mouth/madFace/feet/shroomFoot helpers) | Fusion & items F |
| `art-world.js`, art sections of `pixel.js` (critters, items, fruit, fx, emotes, props, gumball, flowers) | World G |
| scene art in `battle.js` and `race.js` (backgrounds, themes, icons, effect sprites) | Scenes H |
| `art-plants6.js` | Newer plants I (12) |
| `art-plants7.js` | Newer plants J (12) |
| `art-plants8.js` | Legendary plants M (8) |
| `art-zombies3.js` | Zombies K (16 newer zombies) |
| `art-world2.js` | Garden maps L (8 maps, their props, houses and race scenery) |
| `survival.js` | Survival mode N |
| `garden.js`, `state.js`, `data.js`, `app.js`, `menu.js`, `shop.js`, `sprouts.js`, CSS, `tools/`, the pixel engine | Main session |

If you need something from a file you don't own, say so in your final report instead of editing it.
