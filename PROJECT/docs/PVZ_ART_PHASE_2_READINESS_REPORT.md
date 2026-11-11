# PVZ Garden: Art Phase 2 Readiness Report

**Date:** 2026-11-06.
**Branch:** `art-hd-pilot` in the `pvz-garden/` source repository.
- `5b07d7b` Phase 2, on top of `066a80e` (pilot scaffold) and `df960a7` (the published source).

**Status: all six Phase 2 items done.**
- Nothing was published or built into the live site; `pvz-garden-app/` is untouched.
- No artwork was added and `pvz-garden/img/` does not exist.
- Gameplay, balance, saves, `state.js`, `pixel.js`, `PX.SCENE_K`, `survival.js` and `battle.js` were not changed.

| Phase 2 item | Result |
|---|---|
| 1. Pose mapping | Done and tested: 57 pose cases plus a draw-path check. One small, behaviour-neutral pose hint was added in `garden.js` (§2.1). |
| 2. Hi-res sizing | Done. Pop-ups, reward tiles and the evolution scene show 256-px sprites at **exactly** the code-art sizes on iPad and iPhone (§2.2). One related bug was found and fixed: pop-ups opened before a sheet loaded kept the old art. |
| 3. Publishing safeguards | Done. Only registered, validated sheets ship. Drafts and unregistered files never ship. The build stops before touching the output on any problem. Service worker and versioning are unchanged (§2.3). |
| 4. Atlas import | **Confirmed** with exact-spec test sheets at the four production paths (§4) |
| 5. Rendering plan | Below (§5). Nothing implemented. |
| 6. Tests and report | All existing checks plus 3 new test suites pass (§3) |

---

## 1. Files modified

**`pvz-garden/` (on the `art-hd-pilot` branch)**

| File | Change |
|---|---|
| `art-hd-loader.js` | `pickPose()` rewritten (`pickPlantPose` / `pickZombiePose`).<br>`PVZ_HD.poseFor()` test hook.<br>Registered sheets start loading at once (≤ 24 sheets; more → load on first use).<br>`canvas.hdPending` stays true while a sheet is loading.<br>A `pvz-hd-art` window event fires when a sheet settles (loaded, failed, invalid) or when HD is toggled. |
| `app.js` | New helpers:<br>• `isHD(src)` is true when `.k > 2`<br>• `hdFit()` sizes an HD sprite by `PX.artW/artH` exactly like code art and draws it smoothly at device resolution<br>• `hdLook()` turns on smooth CSS scaling for HD sprites in fixed-size UI canvases<br>• `hdWait()` + `pvz-hd-art` listener redraw UI copies made before a sheet arrived<br>Used in `heroCanvas()` (zombie, sprite and icon heroes), the reward tiles and the evolution scene. **Every `k ≤ 2` path is unchanged.** |
| `garden.js` | `sleep: 1` added to 3 pose objects (sleep state `:1786`, evolving cocoon `:1802`, "resting in the house" list `:1313`). Why this is needed is in §2.1. Code art ignores the flag; checked by the identical-canvas test. |

**`tools/` (shared with the other game, so not on the branch)**
- Originals of `build_pvz.py` and `check_pvz.js` are kept in `backups/pvz-garden-before-art-hd-2026-11-06-tools/`.

| File | Change |
|---|---|
| `build_pvz.py` | Ships **only** sheets registered in `art-hd-manifest.js`, after validation, and copies them file by file instead of the whole folder. Validation runs before anything is written, including with `--skip-checks`. |
| `art_hd_check.js` | **New.** Validator for registered sheets: registered path, exact spelling, PNG/WebP with transparency, exact sheet size, known ids and stages. Used by the build and the checker. |
| `check_pvz.js` | New "Illustrated art" check section |
| `test_art_hd_loader.js` | Extended from 1 to 4 test groups |
| `test_art_hd_build.py` | **New.** Build regression test using throwaway copies and synthetic test sheets |

**Not modified:** `state.js`, save format and keys, `pixel.js`, `PX.SCENE_K`, `survival.js`, `battle.js`, `data.js`, all existing art functions, `pvz-garden-app/`.

---

## 2. Corrections implemented

### 2.1 Pose mapping
These rules come from the poses the scenes actually request: `garden.js pose()`, `survival.js pose()`, `battle.js poseFor()` and its move poses, `race.js poseOf()`, the menus and the pop-ups.

**Plants (frames: idle, blink, walk0, walk1, cheer, attack, hurt, knocked)**

| Pose requested | Frame |
|---|---|
| `sleep` hint (Garden sleeping, evolving cocoon, resting in the house) | **blink** (eyes shut, calm; never knocked) |
| Moving (`walk`, fluttering/flying, swimming `paddle`) | **walk0/1**, kept through blinks, moods and tiredness.<br>Two exceptions: a happy cheer with arms up → cheer; a stumble or hit (`sad` + `o`) → hurt |
| `eyes:'closed'` + `mouth:'o'` while standing (Survival knocked out, Battle faint and defeat) | **knocked** |
| Dropped from a finger (falling, not fluttering) | cheer |
| `eyes:'sad'`, or `mouth:'o'` without brave eyes or outstretched arms (hit, stun, low HP, sad) | **hurt** |
| `blink`, or `closed` eyes with any other mouth (incl. Battle sleep status `{closed, flat}`) | **blink** |
| arms up or happy eyes (cheer, Battle victory, race finish, happy) | **cheer** |
| eating (`arms:'hold'`) | idle (no flicker while chewing) |
| held up by a finger (`arms:'out'` + `o`) | cheer |
| arms out / mouth open / grin / brave eyes (attack, stance, bracing for a charge, race countdown) | **attack** |
| anything else | idle |

**Zombies (frames: idle, walk0, walk1, bite, hurt)**
1. `eyes:'sad'`, or the defeat pose `closed` + `o` → **hurt**. This is checked **before** any mouth rule.
2. Mouth open, `o` or grin, or arms out (biting, attacking, the win roar) → **bite**.
3. Moving → **walk0/1**, also while blinking.
4. Otherwise → idle (including blink and Battle sleep).

**Battle victory and defeat (verified against `battle.js:3904-3907` and `:2186`):**

| | Victory | Defeat or faint |
|---|---|---|
| Plant | cheer | knocked |
| Zombie | bite (a triumphant roar) | hurt |

Battle sleep status shows **blink** for plants and **idle** for zombies.

**Two points to note:**
1. **Sleeping vs knocked out cannot be told apart in the loader alone.** The Garden builds the same pose for sleeping (`{eyes:'closed', mouth:'o'}`, `garden.js:1786`) as Survival does for knocked out (`survival.js:894`). So the Garden's three "resting" poses now carry `sleep: 1`.
   - It is a pose hint only, and the code art ignores it.
   - With the empty manifest, all 4,032 tested sprite calls still return the identical original canvases.
2. **`closed` + `o` → knocked applies to standing characters.** A racer marked tired (`race.js:2719`) has the same eyes and mouth while still running, so it keeps its walk cycle instead of showing a knocked-out frame mid-race.

### 2.2 Hi-res sprite sizing (`app.js`)
**Cause:** `crispScale()` only ever **enlarged** a bitmap by whole numbers. A 256-px frame (`.k = 8`) therefore came out about 4× too large in a 32-px reward tile.

**Fix:**
- `hdFit()` computes the size the code art would get: art size (`PX.artW/artH`, 32 art px) × 2 × a whole number of device px.
- It redraws the sprite smoothly at exactly that device resolution and marks it "no pixel snapping".
- Applied in:
  - `heroCanvas()`: zombie, sprite and icon heroes (around old `app.js:820-822`)
  - the reward tiles (old `:840`)
  - the evolution scene (old `:1047`), where both forms are laid out by art size and HD forms are drawn smoothly. A code-art form beside an HD one is scaled by the same whole number, so it stays crisp.

Measured in the real game. CSS size first, then the bitmap; code art (today) vs a test sheet loaded:

| | iPad (DPR 2) | iPhone (DPR 3) |
|---|---|---|
| Pop-up hero | 288 px (code 64 bmp → HD 576 bmp) | 234.67 px (64 → 704) |
| Reward tiles | 32 px (64 → 64) | 21.33 px (64 → 64) |
| Evolution scene | 288 px (64 → 576) | 256 px (64 → 768) |

Sizes are identical to today's code art, at full device sharpness.

**Related bug found and fixed.** Pop-ups **copy** a sprite. If the sheet was still loading, they copied the code art and kept it.

Two fixes:
- Registered sheets now start loading as soon as the game starts.
- Copies made while `hdPending` is set are redrawn when `pvz-hd-art` arrives. Tested live: a red "pending" tile turned blue on arrival.

The evolution scene draws from the live canvas each frame, so it needed no redraw hook.

### 2.3 Publishing safeguards (`tools/build_pvz.py`, `tools/art_hd_check.js`, `tools/check_pvz.js`)
- **Only registered sheets ship.** The build reads `art-hd-manifest.js` and ships exactly those paths, copied one by one.
  - Never shipped, never cached offline: anything under `img/` that isn't registered, and any file or folder starting with `_` (drafts).
  - Unregistered files are printed as notes.
- **Validation before publication.** Each registered path must:
  - match `img/hd/<plants|zombies>/…` in lowercase `a-z 0-9 - _` (no draft segments)
  - exist with **exactly** that spelling (macOS ignores case; the web server doesn't)
  - be a real PNG/WebP whose contents match its extension
  - have transparency
  - be exactly **1024 × 512** (plants) or **768 × 512** (zombies)
  - be ≤ 8 MB
  - and, in `check_pvz.js`, belong to a real plant/zombie id and stage 0–2.

  Any problem stops the build before `pvz-garden-app/` is touched, even with `--skip-checks`.
- **Service worker and offline unchanged.** Same `sw.js` template; shipped sheets are added to the versioned pre-cache list.
- **Versioning unchanged.** With no registered sheets, the build ships no images and the version hash ignores `img/` entirely (tested). When sheets ship, their bytes join the hash, so phones update.

---

## 3. Tests performed and results

| Test | Result |
|---|---|
| `node tools/check_pvz.js` (full repo, branch) | **All checks passed**: 48 scripts parse, all content references valid, 46,914 art draws, the new "Illustrated art: no sprite sheets registered yet" check, all 12 save/migration/backup checks |
| `node tools/test_art_hd_loader.js` | **PASS, 4 groups:**<br>1. ChatGPT's original checks (stable canvas, async repaint, stage selection, dimensions, variant fallback)<br>2. **Pose mapping: 44 plant + 13 zombie poses**, including Battle victory and defeat, sleeping vs knocked, walking blinks, Survival hit and knock-out<br>3. The correct **sheet cell is drawn** for knocked (768, 256), sleeping (256, 0), walking blink (768, 0), victory (0, 256), zombie hurt (256, 256) and bite (0, 256)<br>4. Preload, pending mark, arrival event; failed and wrong-sized sheets keep the code art; an empty manifest loads nothing and returns the original art |
| `python3 tools/test_art_hd_build.py` | **23/23 pass:**<br>• no sheets → no images, unchanged hash<br>• valid sheets → exactly the 4 shipped and pre-cached; drafts and unregistered excluded; hash changes; service worker intact<br>• 8 bad-sheet cases stop the build with the output untouched (wrong size ×2, no alpha, missing, wrong capitals, registered draft, not an image, wrong file type)<br>• unknown ids and stages rejected |
| No-change proof, real game, empty manifest | `PX.sprig` returns the **identical original canvas for 504 looks × 8 poses = 4,032 calls**. Tour of Garden, Battle, Race, Arcade, Shop and Almanac: **no page errors** |
| Live dry run, throwaway copy with synthetic test sheets (coloured shapes, not artwork) at the production paths | All 4 sheets loaded at start. Live pose requests mapped correctly in the Garden: walk, walking blink → walk frames, cheer on the move, zombie walk and bite. Pop-ups and evolution sized as in §2.2 on iPad and iPhone. Redraw hook verified. No page errors. |
| Earlier pilot dry run (same sheets) | Garden, zombie raid, Almanac, Battle hub and turn, Survival lawn and tray: correct size, anchor and depth order |

**Not observed live**, so covered by the unit tests with the exact pose objects the code builds:
- a Garden plant actually falling asleep (the headless garden woke the plant immediately)
- a Survival knock-out
- a full Battle played to victory or defeat

These will be checked on screen with the real sheets.

---

## 4. Confirmation: the four production atlases can be imported
Test sheets at the four production paths, at exactly the specified sizes, were checked end to end:

```
img/hd/plants/sunflower/stage-0.png   1024 × 512  (4 × 2 frames: idle, blink, walk0, walk1 / cheer, attack, hurt, knocked)
img/hd/plants/sunflower/stage-1.png   1024 × 512
img/hd/plants/sunflower/stage-2.png   1024 × 512
img/hd/zombies/basic.png               768 × 512  (3 × 2 frames: idle, walk0, walk1 / bite, hurt / empty)
```

- `art_hd_check.js` accepted all four (no problems).
- The build ships them and adds them to the offline cache.
- The loader shows them in the Garden, raids, Battle, Survival, the Almanac, pop-ups and the evolution scene, without any gameplay change.

**Importing the approved art is two steps:**
1. Save the 4 PNGs at those paths.
2. Uncomment the 5 manifest lines in `art-hd-manifest.js`, then run `node tools/check_pvz.js`.

The art must face right, use a transparent background, and keep the feet anchor at (128, 248) in every 256 × 256 cell.

---

## 5. Proposed high-resolution rendering architecture (not implemented)
The loader replaces image data only. Every scene still draws characters into a world buffer at 2 buffer px per world px (`PX.SCENE_K = 2`) and enlarges it nearest-neighbour, so loaded art is **not sharper yet**.

**Recommended approach:** draw each scene at its **native factor**, meaning buffer px = device px per world px. Measured:
- Survival: 9 on iPad, 6 on iPhone
- Battle: 10

A fixed factor of 4 would still enlarge sprites by an uneven 2.25–2.5×. All gameplay maths stays in world px.

**A0: shared plumbing (additions only)**
- `PX.FINE_K = 2` as the explicit code-art pixel constant, used where `SCENE_K` currently stands in for it.
- `canvas.hdArt` (set when approved art is painted, cleared for code art) and `PX.isHD(c)`.
- `PX.blit` and a new `PX.drawArt()` switch `imageSmoothingEnabled` on with quality `'high'` **only for HD sprites**. Code art stays nearest and crisp.
- `canvas.hdv` (a repaint counter), so the ice-tint cache (`survival.js:112-118`) and the white-flash cache (`battle.js:3877-3883`) refresh when art arrives.
- A per-device switch, `localStorage['pvzg:hdScene']`:

  | Mode | Behaviour |
  |---|---|
  | `auto` (default) | Native factor only when the manifest has entries |
  | `off` | Exactly today's path |
  | `on` | Native factor always (for performance tests) |

**A1: Battle**
- `lo` sized `WW·SK × WH·SK` with `SK = SC` (`:1905`); transform at `:4001`; screen-shake edge rectangles in SK units (`:4037-4041`).
- The debug film-strip tools sample at SK but output at FINE_K (`:3080`, `:3092`).
- **Keep at 2:** the layout formula SC (`:1901`, which drives arena size, `spot()` and boss scale), background caches (`:3842-3845`) and the fine-pixel helpers (`:3399`).
- Free the buffers when a battle ends.

**A2: Survival** (also covers Adventure, which runs on this engine)
- `K` (`:17`) becomes a per-layout `SK = round(Z·DPR)`, used at `:701` (buffer), `:974` (transform) and `:1017` (copy, now 1:1).
- Raw `drawImage` sites for flings and tip-overs (`:923`, `:929`) go through `PX.drawArt`.
- Keep `arc` shots looking the same (`:950-951`) as tiny 2× sprites.
- The drag ghost (`:1345-1348`) gets smooth rendering for HD.
- Free `buf` at match end.

**B: Garden.** The world buffer covers the **whole scrolling map** at 2×. Raising it to native would exceed mobile canvas limits.
- **B1:** replace it with a **viewport-sized buffer**, drawn with the camera transform and clipped to the world rectangle.
  - The draw functions and order stay identical: sky/land/water → one list sorted by feet y (trees, props, pots, graves, raid zombies, house, seed packets, plants, critters, fruit) → ambient → raid layer → held plants → night/Halloween tints → lights → drops, emotes, particles → screen text.
  - Tints and glows stay in world coordinates, so HD sprites are tinted exactly like code art.
  - **Gate: at factor 2 it must look identical to today.**
- **B2:** view culling with generous margins. At start zoom only about 11% of the map is visible; the Garden draws the whole map every frame today.
- **B3:** native factor when the zoom gives a whole number ≥ 2; otherwise `max(2, floor(S))` while pinching or animating.
- **B4:** separate the layout DPR (still capped at 2, so map size and tap targets don't change) from the render DPR (up to 3). iPhones then stop stretching a 2× canvas by 1.5.
- **B5 (optional):** pre-shrunk 128/64-px copies of each frame for the whole-garden view; merge sky and land into one layer.

**Memory (computed, canvas bytes)**

| Scene | iPad (today → native) | iPhone (today → native) |
|---|---|---|
| Survival | 16.6 → 31.5 MB | 13.8 → 24.4 MB |
| Battle | 12.5 → 23.7 MB | 8.2 → 15.5 MB |
| Garden | 25 → about 31 MB | 14.5 → about 23 MB |

Loader frames: ≤ 96 × 256 KiB.

**Performance budget** (to calibrate on the family's devices)
- Scene `frame()` p95 ≤ 8 ms.
- Frame interval p99 ≤ 20 ms, no hitch over 50 ms.
- Canvas memory ≤ about 100 MB on iPad and 70 MB on iPhone.
- Measured by a dev-only probe (`pvzg:perf`), Safari Web Inspector Timelines, comparing `auto` with `off`, and a 30-minute heat run.

**Order of work:** A0 → A1 Battle → A2 Survival → family comparison on a real iPad → B1 + B2 (identical-look gates) → B3 + B4 → B5 only if measurements call for it. Race, title and Aquarium stay at 2× for now.

**Main risks and mitigations**

| Risk | Mitigation |
|---|---|
| Extra memory per scene | Free buffers on scene exit, a size cap, measurement |
| Drawing cost on older iPads | Culling, the switch per device |
| Mixed detail: sharp characters beside code-art props and backgrounds (the family has rejected mixed pixel sizes before) | Present the pilot as a sharpness test with the switch; plan the art layer by layer |
| Stale tint caches | `hdv` |
| Code art blurred inside 256-px canvases | `hdArt` |
| Seams while zooming | Whole-number factors, rounded camera, world clip |

**Tests per scene** cover:
- **Survival:** day, night and all maps, boss waves, chill, mower, tip-over, knock-outs, drag.
- **Battle:** every move animation via `fxSheet`, shake, aura, intro, faint and win, night arenas.
- **Garden:** pan, pinch, whole-garden view, culling edges, water clips, raids, night and Halloween on every map, tap targets.
- **Devices:** a 3× iPhone, where map size must not change.

---

## 6. Unresolved issues and caveats
1. **Sharpness needs Stage A/B** (§5). Until then, approved sheets display through today's 2× buffers.
2. **Variant looks still use code art:** plants with an element, skin, shiny or fusion. The same applies to:
   - `PX.item` seed packets and plant icons
   - Zombosses (`PX.critter`)
   - Halloween costume zombies (`PX.eventZombie`)

   A variant strategy is needed before a wide rollout.
3. **Mixed styles during the pilot.** Illustrated Sunflower and Basic Zombie will appear beside code-art plants, zombies and props.
4. **Judgement calls in the pose table** that the family or ChatGPT may want to change:

   | Pose | Mapped to |
   |---|---|
   | held by a finger | cheer |
   | eating | idle |
   | dropped | cheer |
   | race countdown | attack |
   | zombie victory | bite (roar) |
   | zombie asleep in battle | idle |

5. **`tools/` is shared with Solunar Sprouts and not under version control.** The changed tools only affect PVZ, and originals are backed up. The `pvz-garden/` folder is currently on the `art-hd-pilot` branch; `git checkout main` restores the published source.
6. Not observed live (covered by unit tests): sleeping, Survival knock-out, full Battle victory and defeat (§3).

## 7. What ChatGPT needs to provide next
1. **The four approved sheets**, exactly as in §4:
   - transparent RGBA PNG
   - lowercase file names; no `_` prefix (that marks drafts)
   - each under 8 MB, ideally under 2 MB
   - frames in the stated order
   - feet at (128, 248); stage heights about 160 / 192 / 224 px
   - every pose a separate drawing
2. **Confirm or adjust the pose mapping** (§2.1 and the judgement calls in §6.4), especially whether sleeping should use `blink` or a dedicated frame later.
3. **Approval to start Stage A** once the pilot sheets are in and accepted, and a view on the native-factor approach (§5).
4. **Later, for the wider rollout:**
   - a variant-art strategy (overlays positioned from per-stage head geometry: centre, radius, top, eye line in sheet pixels; or separate variant sheets)
   - a Zomboss sheet spec (384 × 384 frames, 48 art px)
   - which characters come next
