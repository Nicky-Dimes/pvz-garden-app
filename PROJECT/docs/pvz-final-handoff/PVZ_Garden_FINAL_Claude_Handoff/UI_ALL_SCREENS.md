# PVZ Garden — complete interface art direction and screen integration

## Overall intent
Preserve the real game's flow and children's muscle memory. Make the WHOLE game match the premium 16-bit-inspired pixel art used in the approved character reference: deliberately stepped pixel clusters, dense but readable color blocking, dark navy/purple outlines (not pure black), warm upper-left light, cool shadows, kid-friendly expressive illustrations. Avoid smooth vector stickers, gradients in game sprites, fuzzy enlarged assets, and incongruent existing browser UI chrome.

The **generated UI guide illustrations** show the intended *feeling*, not authoritative labels/menus, hitbox geometry, scores, prices, levels or counts. Keep real data and user interactions as they are in source.

## Shared design system (build reusable HTML/CSS/Canvas components)
- Central art tokens for outlines, cream paper/wood/card panel fills, leaf-green action buttons, yellow primary actions, lavender magic/secondary actions, teal highlights, warm shadows, disabled states, focus outlines, danger & success colors. Icons illustrated on a common pixel grid.
- Replace mismatched CSS flat components gradually with consistent panels, corner sprites, wood-and-leaf headers, inset/recessed card borders, progress bars, badges, HUD chips, tabs, primary/secondary buttons, popup frames, toggles, prices, cooldowns, notifications and loading indicators.
- Use actual HTML text for important dynamic labels, accessible controls, translations and changing numbers: do NOT bake text into image sprites. Existing font may remain if it's legible; maintain contrast and large touch targets (target >=44 CSS pixels where possible).
- Preserve layout priorities and taps; honor iPhone notch/safe-area insets, bottom fixed tab bar and scrollable panels. Do not cover the playing field with unnecessary decorative chrome.
- Retina: sprite source art should be integer-pixel scaled; canvas viewport scales with DPR safely. CSS on responsive mobile may not always be an integer global scale—keep individual sprite rendering pixel-perfect and detect actual-size artifacts.
- Add named visual states (normal, active, pressed, cooldown, locked, disabled, highlighted, rewarded).
- Optimize assets as individual transparent sprites, shared atlases and tile layers; avoid enormous full-screen sprite posters. Provide fallback path to code art while loading.

## Screen-by-screen requirements (keep source behavior)
1. **Main title/profile selection:** lush game-logo header, compact background scenery, clear Start/Continue/profile cards, consistent pixel-framed primary buttons, safe-area margins, no forced reset.
2. **Garden / Home:** preserve scrolling checkered lawn, top-left house, back fence, five flowers left, pond right, fruit trees/growing props and zombie approaches from right; upgrade checker tiles, ground depth, fence, home, flowerbeds, bush/stone/pond/water animations. Keep tap-to-grow, moves, seedlings and popups. Pixel-art HUD with day/resources and wooden navigation; small sprites legible.
3. **Survival & Adventure:** 5 lanes × 9 columns, lawn/house/fence background, entry direction from right, plant tray and sun/resource collection, wave progress, placement feedback and ability effects; separate background layers, clear grid boundaries not distracting busy detail; adventure worlds/map/level cards and transitions.
4. **Battle:** turn-based one-on-one arenas in day/sunset/night, two prominently sized fighter sprites, legible HP bars, portraits, status icons, action buttons x4, boss-scale attacks, impact/hit/death feedback. Keep existing hitboxes and choices.
5. **Race:** horizontal parallax strips for each theme, clear multiple lanes and run/swim/climb/fly terrain, collectibles/items, obstacle warnings, speed feedback and finish-line celebration. Keep UI visible during scrolling.
6. **Arcade:** coherent framing but preserve each minigame's distinct board (bowling, whack, vase, sun-field, memory, match-3, shooting, targets, mower lanes and claw machine as source inventory confirms). Pixel trophies, reward screens and button styles.
7. **Shop:** collectible product cards, currency chips, pixel icons, visible prices, owned/locked states, selected states and purchase confirmation; keep purchase logic and balances.
8. **Almanac:** plant/zombie encyclopedic collection with actual IDs, distinct growth stages/pose preview, element descriptions, evolution details, backup/restore tools and progress; large zoom artwork should be crisp and not soft.
9. **My Aquarium:** fish sprites with 2-frame swimming, 6 distinct backdrops and 4 sands, decor selection and interaction overlays; preserve 31 fish, 22 decoration slots/content and saved state. Transparent fish, layered scenery and no clipping.
10. **Seasonal events and customization:** fusion hats, parts, element toppers, Halloween/other costumes sit atop the head anchor across all stages and move correctly with idle/walk/hurt. Reward cards, gift popups, tabs, unlock cinematics all share style.
11. **Persistent shared shell:** seven-tab navigation (Garden, Race, Battle, Arcade, Shop, Almanac, Aquarium), top resource HUD, snackbars, confirm boxes, settings, overlays, accessibility preferences and touch input.

## Deliverable for UI work
For every screen: before/after screenshots at iPhone and iPad portrait; component list used; CSS/JS change list; verification of touch targets, legible values, no overflow, no misplaced characters or obscured controls; and sign-off status. Load tested with slow/network/offline modes.
