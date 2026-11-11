# NOTE: PRODUCTION DIMENSION PRIORITY
The approved style guide below describes artistic appearance; its suggested 64×64/96×96 logical resolutions are **superseded** by the actual corrected gameplay sheet: standard characters = 32×32 logical / 256×256 output; bosses = 48×48 logical / 384×384 output at 8×. Follow `GAMEPLAY_FACTS_AND_CONSTRAINTS.md` for implementation.

# PVZ GARDEN — OFFICIAL PIXEL-ART STYLE GUIDE

**Status: APPROVED for PVZ Garden.** The file `reference/PVZ_Garden_APPROVED_Style_Reference.png` is the dominant visual target. Older smooth/vector-style PVZ Garden roster illustrations were rejected. This is a different game from Solunar Sprouts.

## 1. Aesthetic

Premium, high-definition **16-bit-inspired kawaii pixel art**: crisp, individually defined pixel clusters, character-specific anatomy, rounded chibi silhouettes, oversized expressive eyes, playful asymmetry, readable storytelling, deep navy/purple/charcoal pixel outlines, vibrant balanced hues, and three-dimensional form built solely from deliberately shaped blocks of opaque colors. Think premium modern indie creature-defense sprites, not vector stickers or a pixelated smooth illustration.

- **Pixel craftsmanship:** intentional block clusters; consistent logical pixel grid per sprite; stepped curves; no anti-aliasing, blurry edges, interpolated gradients, smudges, random noise, or fake one-click pixelation.
- **Outlines:** near-black purple/navy/charcoal, commonly 1–2 logical pixels; selectively thicker around important contours (not absolute black).
- **Lighting:** upper-left, consistent across the game; warm light color, cooler lower-right shadows.
- **Shading:** usually 3–5 tones per material (more where needed for complex bosses); pixel-cluster cel shading with restrained speculars. No airbrush gradients.
- **Faces:** oversized sparkling eyes, readable brows, mouth/smile/teeth, emotionally clear idle expressions. Vary faces by identity, not identical faces on everything.
- **Forms:** rounded, cartoon-exaggerated but recognizably true to the original game character identity; each character must have its own silhouette.
- **Materials:** leaves, petals, wood, cloth, rusted metal, water, stone, ice, teeth, glass, chrome and skin MUST differ in pixel shading texture and specular behavior.
- **Production:** transparency around the entire silhouette and separate effects; no text/labels/cream panels/shadows baked into game-ready sprites unless intentionally part of an individual effect.

## 2. Identity & character groups

### Plants
Every plant needs 3 **distinct** growth stages. Stage 1 is youthful with small form and simplified features; Stage 2 adds meaningful anatomy and expressiveness; Stage 3 is larger/mature with distinct details and gameplay readability. Keep the core plant identity intact (Peashooter nozzle, Sunflower petal face, Chomper jaws/teeth). Never reuse a generic base body for all plants. The approved sheet visually demonstrates this progression.

### Zombies
Fun, slightly grotesque-but-kid-friendly, comedic and asymmetrical. Distinct silhouettes, stance, costume and accessories; green-gray flesh, pale expressive eyes, skewed mouths/teeth, strongly readable leg position during walk. Conehead's cone is structurally anchored on the head. No character should be reduced to a near-identical zombie with swapped headwear.

### Zombosses
Boss-scale designs with more intricate machinery, readable focal face, unique posture, and bold oversized silhouette. Mechanical construction must make sense: wheels/limbs, steering controls, joints, supports and weapons should look attached. The approved samples Zombot, Plankwalker and Gargantuar Rex are **style examples**; confirm all canonical IDs and designs from existing project data before changing the actual roster. Never shrink the boss until details disappear at in-game scale.

## 3. Logical sprite resolutions (starting recommendations; audit existing code first)

- Standard plant stages: common **64×64 logical canvas**, with visual occupied area increasing by growth stage. This keeps pixel density and anchor stable. If detailed Stage 3 needs 96×96, document why and use compatible anchor scale.
- Common zombies: 64×96 logical canvas for limbs and walking; choose exact sizes from actual project needs.
- Large bosses: 128×128, 192×192, 256×256, or multi-part assembly; use a consistent logical grid per sprite/animation set, never arbitrary physical pixel counts.
- Icons: 24×24 or 32×32.
- Prefer integer magnification (2×, 3×, 4×) with `imageSmoothingEnabled = false`; calculate source/target sizes and anchors precisely.
- Do NOT claim the approved concept PNG's 1774×887 pixels represent a uniform logical grid. It is a rendered reference image.

## 4. Suggested color roles (not mandatory replacement of existing character colors)

| Role | Example hexadecimal |
| --- | --- |
| Deep navy-purple outline | `#29243D` |
| Secondary outline | `#433657` |
| Cool shadow | `#4A4674` |
| Bright leaf highlight | `#C0F45A` |
| Leaf mid | `#78D845` |
| Leaf shadow | `#328A4D` |
| Sunflower warm highlight | `#FFED79` |
| Warm yellow | `#FFC638` |
| Warm orange | `#F68135` |
| Chomper lavender light | `#D7A0FF` |
| Chomper violet base | `#9960D5` |
| Zombie skin light | `#C4D3A1` |
| Zombie skin mid | `#95B283` |
| Zombie skin shadow | `#678D78` |
| Cream presentation background (NOT sprite alpha) | `#FEF6DD` |

Keep per-character palettes cohesive, not locked to these values when reference identity demands otherwise.

## 5. Animation vocabulary

- Plant: idle breath, blink, cheek/leaf bob, attack anticipation, attack/recoil, hit, stage growth transition.
- Zombie: clear readable walk poses with **actual leg movement**, head sway, jaw twitch, attack, stagger, hit, death.
- Boss: selective secondary motion on supported mechanical parts, readable anticipation, big actions, damage reactions, expressive face; use separate anchored layers if that saves memory.
- Animated source frame tiles must use identical logical pixel density, body scale, anchors and frame bounds. No interpolation smoothing. Use clear frame-to-frame redraws when appropriate; do not just wobble a static raster with transforms for all movement.

## 6. Deliverable checklist per character

- One transparent lossless PNG per approved pose/stage, or a correctly indexed transparent atlas.
- A clear stable ID matching game's current lookup.
- Correct anchor/origin, intended native resolution and intended display scale.
- Animation metadata where needed, with frames and frame rate.
- Side-by-side **1× native, 2×, 4×** preview against incumbent asset and the approved style reference.
- Verified against identity, silhouette, palette, eye design, outlines, lighting, anatomy, stage change, transparent edges and readability in Garden/Battle screens.
- Only after approval: commit PNG and manifest changes, test, then deploy.

## 7. Explicit reject conditions

- Smooth/vector aesthetic or glossy 3D sticker instead of authentic pixel clusters.
- Fake pixelation of a normal illustration, semi-transparent edge anti-aliasing, or mixed pixel density.
- Cloned faces/body shapes across different characters.
- Plants with merely resized growth stages.
- Zombies with floating clothes/hats, merged feet or incorrect poses.
- Zombosses whose equipment geometry is physically incoherent.
- Changing names/IDs, removing an asset, or silently overwriting unapproved art.
- Using a poster crop with cream background/text as a live transparent character sprite.
