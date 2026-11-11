# PVZ Garden — ground-truth gameplay and sprite specifications

**Authority:** `references/04_ORIGINAL_corrected_gameplay_fact_sheet.png` supplied by the game creator. This transcription is a working checklist; where code has changed since the image's build timestamp, inspect and reconcile actual source. Do not copy inconsistent numbers from AI-generated 'art bible' text.

## User experience and screen map
- Cozy family-friendly garden/defense game for young children; cute, silly toy-like zombies, plants as pets; no scary/gross faces. Portrait iPad and iPhone Home Screen, short sessions and fully offline after first load.
- Open seed packet; choose Peashooter, Sunflower or Chomper starter. Grow/raise in Garden, collect coins and element shards. Three growth stages with meaningful growth. Customize via elemental colors, fusion parts, costumes. Fight and win in Garden, Battle, Survival/Adventure, Race and Arcade.
- Tabs: Garden, Race, Battle, Arcade, Shop, Almanac, My Aquarium. Also title/profile selection, Survival & Adventure, popups, evolution, trophies and seasonal events.
- Garden: top-down scrolling checkerboard lawn, small standing characters, house in top-left, fence along back, five flowers left side, pond on right, props/fruit trees, waves of zombies from right, plant defense and taps.
- Survival: layered full-screen scene, house on left, zombies arrive from right; 5-lane by 9-column lawn, waves and seed tray. Adventure: worlds/map/levels.
- Battle: 1-on-1 turn-based RPG; portrait fighters face each other, arena backgrounds, HP cards, four move buttons, enemy/plant animations, bosses.
- Race: side-scrolling tracks with plant/zombie runners, obstacles, water/swim/climb/fly sections, item pickups and progress feedback.
- Arcade: minigames and trophies, plus claw machine. Shop/Almanac/Aquarium each have special inventories and objects.

## Canonical inventory targets (verify with source IDs)
| Family | Expected content | Render expectations |
|---|---|---|
| Plants | 141 species × 3 growth stages = 423 looks (includes 16 legendary hero plants) | 8 poses per look; distinct stages, not scaled clones |
| Zombies | 81 types | 5 poses per zombie, with unique gear/costumes |
| Zombosses | 12 bosses | 2 animated frames each; bigger and distinctive |
| Costume layers | 26 fusion items + 36 fusion parts + skins + 4 Halloween costumes + elemental toppers | Overlay with head anchor across all plant stages; clear 16×16 icon style where used |
| Elements | 12 types | elemental creatures (rest/bob/blink), shards, cores, small icons |
| Fruits and packets | 11 fruits, 8 seed packet kinds | preserve mechanics and recognizable types |
| Effects | 28 projectile/move animation styles | readable at game-scale; includes pea, lob, beam, flame and other effects |
| Garden | 16 themes, 98 props | house, checker grass, fence, pond, trees, season variations |
| Survival/Adventure | 16 survival maps; adventure 8 worlds, 40 levels | layered backgrounds, five-by-nine grid, world map |
| Battle | 29 zombie leagues, 11 plant cups | arenas, fighter HUD, HP cards, turn buttons |
| Race | track art for each theme and variant/side | scrolling parallax tracks, lanes, items, obstacles |
| Arcade | 8 games plus claw machine and trophies | game boards/trophies, varied interfaces |
| Aquarium | 31 fish, 22 decorations, 6 backdrops, 4 sands | side-view tank, animated fish, distinct sand/bg |
| UI | 7 tabs, title, popups | all gameplay and menus conform to style system |

## Strict sprite output and anchor standards
- Output lossless **transparent PNG** (or WebP where code supports it) in sRGB. No baked cream/white/checkerboard backgrounds. Character content must not touch frame edges.
- **PLANT and ZOMBIE each pose:** 256 × 256 physical pixels (a 32 × 32 logical pixel grid rendered at 8×). Face RIGHT; game mirrors zombies when they move left. Baseline at **y=248**, centered at **x=128**; consistent scale in every pose. These are authoring bounds, not the actual gameplay display size.
- Logical source pixel = exactly 8 output pixels (integer nearest-neighbor). Plants approximate height Stage 1 **160 px**, Stage 2 **192 px**, Stage 3 **224 px**, sitting on the baseline (these are target occupied heights, not frame sizes). Zombies approximate occupied height **230 px** including headgear; confirm per identity.
- **Boss:** 384 × 384 physical px per frame (48×48 logical at 8×), 2 animation frames each. Establish a consistent anchor based on actual battle placement.
- **Plants:** 8 poses in order: `idle`, `blink`, `walkA`, `walkB`, `cheer`, `attack`, `hurt`, `knockedOut`. Note `walkA/B` are 2 frames of a tiny hop, not walking feet. Stage 1 is simpler, Stage 3 fancier.
- **Zombies:** `idle`, `walkA`, `walkB`, `bite`, `hurt`; sixth cell is blank.
- **Plant atlas:** 1024 × 512 (4 columns × 2 rows of 256px), per species per stage. Source-sheet example pattern: `img/hd/plants/<plant-id>/stage-<n>.png`; adapt to exact game loader path.
- **Zombie atlas:** 768 × 512 (3 columns × 2 rows of 256px), per zombie ID. Example `img/hd/zombies/<zombie-id>.png`. Blank sixth cell must stay empty/transparent.
- **Bosses:** two 384×384 frames per boss, packed to a format selected by current code; document dimensions/anchor; do not assume plant atlas shape.
- **Sheet size:** maximum **8 MB per sheet**. All loaded images cached, correct alpha.
- Other art still code-drawn currently; new accessory/prop/effect art should match at **8× existing art pixel** where practical. Costume pieces need a marked head anchor. Backgrounds as separate sky / far scenery / ground layers at 2× iPad portrait **1640 × 2360** baseline where the actual screen supports it. Test memory on mobile.
- **Readable at tiny real game scale** around **21–32px tall** (seed tray and small scenes), also attractive enlarged about 290px (popups/evolution). Never rely only on zoomed poster quality.

## Family character rules — hard constraints
- Overall tone cute, kind, friendly and never scary or gross; even zombies are goofy toys. Default facial mood is FRIENDLY.
- Angry/mad characters only: **Cherry Bomb, Squash, Cactus, Doom-shroom, Jalapeño** (all stages); **Fume-shroom** (Puff-shroom stage 2), **Coconut Cannon, Melon-pult, Cob Cannon** (Kernel-pult stage 3). The mad expression needs a **heavy V-shaped brow** pressing onto the eyes, not just a thin tilted brow.
- **NO EYES:** Chomper (big purple head and toothy mouth).
- **NO MOUTH:** Wall-nut, Lily Pad, Melon-pult, Cob Cannon, Lightning Reed (glowing mint teardrop bulb).
- Sunflower stage 3 has **three flowers**. Snapdragon must read visually as a DRAGON. Cabbage-pult retains a cabbage in all three growth stages.
- **No legs or feet on plants.** Plants stand on leaves, roots, pad or pot. The exception is a plant with real wheels (Cob Cannon cart). Mushrooms use stalks to the ground.
- Keep recognizable silhouette and identity from existing game without copying third-party copyrighted art.
- Consistency across hats, costume parts, props, icons, effects and backgrounds. Costume layers must fit and follow heads across all 423 plant looks.
- Stage growth must introduce distinct anatomy and decorations, not just enlargement.
- Test character readability at ~21–32px tiny gameplay display and enlarged 290px scenes.
