# PVZ Garden: Art Pilot Integration Report (Claude → ChatGPT)

**Date:** 2026-11-06.
**Scope:** Section 8 of `CLAUDE_IMPLEMENTATION_HANDOFF.md`, the **non-destructive pilot loader integration only**.
**Status:** integrated and tested on a separate branch. **Nothing was built or published.** The live site and its repository (`pvz-garden-app/`) are untouched.

## 1. What was done

**Branch.** `pvz-garden/` (the game source) had no version control.
- A local git repository was created with two branches:
  - `main`: the source exactly as published (build 2026.10.24-1500-e28fee).
  - `art-hd-pilot`: the kit integration (commit `066a80e`).
- Plain-folder backups were also made: `backups/pvz-garden-before-art-hd-2026-11-06/` and `…-tools/`.

**Kit files added to `pvz-garden/`:**
- `art-hd-manifest.js` (empty)
- `art-hd-loader.js`
- `_art-compare.html` (dev-only; files starting with `_` are never shipped)

**`index.html`:** the patch applied cleanly. Load order is now `art-event.js → data.js → art-hd-manifest.js → art-hd-loader.js → state.js`; the other 40+ script tags are untouched.

**`tools/build_pvz.py`:** the patch applied cleanly. The current file matched the audited version exactly, so after patching it is byte-identical to the kit's copy.
- It changes nothing until a `pvz-garden/img/` folder exists: `image_assets()` returns `[]` and the version hash is unchanged.
- `tools/` is shared by both games and lives outside the branch. The original is kept in the `…-tools/` backup.

**`tools/test_art_hd_loader.js`:** added.

**Source differences:** none. Both patch contexts matched the current files exactly. Gameplay, saves, `state.js`, `pixel.js`, `PX.SCENE_K`, `garden.js`, `survival.js`, `battle.js` and all existing art were not touched.

## 2. Test results

| Test | Result |
|---|---|
| `node --check` on the loader, manifest and test; Python syntax check of `build_pvz.py` | pass |
| `node tools/check_pvz.js` (full repo) | **All checks passed**: 48 scripts parse (including the 2 new ones), 46,914 art draws, all save/migration/backup checks |
| `node tools/test_art_hd_loader.js` | **PASS** (stable canvas, async repaint, stage selection, dimensions, variant fallback) |
| **No-change proof, empty manifest**, real game in Chrome | `PX.sprig()` returned **the identical original canvas for 504 looks × 8 poses = 4,032 calls, 0 different**, so the game looks and behaves exactly as before. Script order verified. Garden, Battle, Race, Arcade, Shop and Almanac: no page errors. |
| `_art-compare.html` over local HTTP | Works. Shows "No approved image atlases are registered yet; replacement correctly falls back". |
| **Dry run with placeholder sheets** (a throwaway copy outside the project; coloured stand-in shapes, one per pose, exact sheet sizes) | Sheets load and every cached sprite **repaints in place without resetting scenes or saves**. Checked in the Garden (walk, blink, cheer), during a Garden zombie raid (health bars, depth order, fighting), the Almanac list, the Battle hub and a Battle turn (attack, hit), and Survival (lawn and tray cards). Size, feet anchor and depth order were correct everywhere. No page errors. |

**Not done yet (by design for this phase):** real artwork, site build, device tests, high-resolution rendering (Stages A/B). As the handoff says, sheets loaded today are still shown through the 2× world buffer, so the pictures will not look sharper until Stage A/B.

## 3. Issues found (need a decision or fix before or with the real art)

### 3.1 Pose mapping in `art-hd-loader.js` → `pickPose()`
These are the poses the game actually requested during the dry run (by scene), and the frame the loader picked:

| Requested pose (look) | Where | Frame picked | Correct? |
|---|---|---|---|
| plant `{frame:0, mouth:'smile'}` | Garden idle | idle | ✓ |
| plant `{walk:true, frame:0/1, mouth:'smile'}` | Garden walk | walk0 / walk1 | ✓ |
| plant `{walk:true, eyes:'blink', …}` | Garden, blinking while walking | blink | ⚠ the standing blink frame interrupts the walk cycle. Suggest: ignore blink while walking, or add walk-blink frames later. |
| plant `{arms:'up', eyes:'happy', mouth:'open'}` (with or without walk) | cheer, raid heal, battle support move | cheer | ✓ |
| plant `{arms:'out', mouth:'open', eyes:'brave'}` | Battle attack | attack | ✓ |
| plant `{eyes:'sad', mouth:'o'}` | Battle hit | hurt | ✓ |
| plant `{eyes:'closed', mouth:'o'}` | Survival knocked out | **hurt** | ✗ should be **knocked**. The 8th plant frame (`knocked`) is **never selected** by the current rules, and `{eyes:'closed'}` alone (sleeping) maps to `blink`. |
| zombie `{walk:true, frame:0/1}` | Garden raid, Survival | walk0 / walk1 | ✓ |
| zombie `{walk:true, mouth:'open'}`, `{arms:'out', mouth:'open', eyes:'brave'}` | biting, Battle attack | bite | ✓ |
| zombie `{eyes:'sad', mouth:'o'}` | Battle hit | **bite** | ✗ should be **hurt**. The mouth check runs before the eyes check. |

**Requested fix (ChatGPT, together with an updated test):** extend `pickPose()` so that:
- `closed + o` → `knocked` (plants)
- `sad` → `hurt` before any mouth rule (zombies)
- sleeping (`closed`) has an agreed frame
- blink is ignored while walking (if wanted)

Plant faint and win poses in Battle were not exercised in the dry run. Please also state their intended frames.

### 3.2 Reward pop-ups show 256-px sheet frames far too big
**Seen:** the "New Almanac pages!" card drew the Basic Zombie about 2× too large.

**Cause:** `app.js:820` copies the sprite's bitmap size (`c.width = src.width`, now 256), then `crispScale()` (`app.js:788-791`) only ever scales **up** by a whole number. A 256-px bitmap therefore can't shrink to the card's size.

**Same pattern elsewhere:**
- `app.js:821-822` and `:840` (other celebration and goal icons)
- `app.js:1047` (the evolution scene)

**Fix needed (outside the kit; Claude can do it):** for canvases with `.k > 2`, size from `PX.artW/artH × scale` and draw smoothed.

### 3.3 Smaller notes
- **Build:**
  - `shutil.copytree(img)` also copies `_`-prefixed draft files into the published folder (they are not pre-cached). Suggest an ignore pattern for `_*`.
  - The pre-cache install fails as a whole if one listed image is missing, so keep the image set small and checked.
- **Memory (pilot):** each pose canvas is 256 × 256 (256 KiB). The loader caps them at 96 (≈ 24 MiB), plus about 2 MiB per decoded sheet. Fine for the pilot; Stage C still applies.
- **What the pilot covers today:**
  - Covered: the Survival tray cards and Battle hub hero use `PX.sprig`, so they already show pilot art.
  - Not covered: Garden seed packets and plant icons use `PX.item`, so they stay code art.
  - Looks with an element, skin, shiny or fusion stay code art, as designed.

## 4. What ChatGPT needs to provide for the next phase
1. **The 4 pilot sheets, exactly to spec:**
   - Sunflower `stage-0/1/2.png`, 1024 × 512, order idle · blink · walk0 · walk1 / cheer · attack · hurt · knocked
   - Basic Zombie `basic.png`, 768 × 512, order idle · walk0 · walk1 / bite · hurt · (empty)
   - Every cell 256 × 256, transparent PNG, facing right, feet at (128, 248), no shadow or floor
   - Stage heights about 160 / 192 / 224
2. **The updated `pickPose()` mapping plus its test** (§3.1). Alternatively, approve Claude making that change.
3. **Optional, for later variant overlays:** per stage and per frame, the head centre, head radius, top of head and eye line in sheet pixels, so fusion parts, items and costumes can sit on the new art.

**After you approve the sheets, Claude will:**
- put them in `img/hd/…` and register them in the manifest
- re-run every check
- take real-game screenshots at iPad and iPhone sizes

Then Stage A (sharp Survival and Battle) can start.
