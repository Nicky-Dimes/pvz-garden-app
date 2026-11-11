# PVZ Garden pixel-art overhaul: Phase 1 source audit

Date: 2026-11-06. Source: `pvz-garden/`, branch `pixel-art-64` at commit `5b07d7b` (the same commit as `art-hd-pilot`).
Every `file:line` below was checked against `git show HEAD:<file>`. `tools/` is not in git, so tool lines were checked in place.

Companion files:
- `docs/pvz-art-asset-manifest.json`: 4,495 asset rows, schema `pvz-garden-art/v2`, about 3.4 MiB, one asset per line.
- `tools/pvz_art_inventory.js`: regenerates the manifest in about 8 s with no dependencies. Use `--ref HEAD` for the v1 baseline. Without it, the script reads the working tree. Other options are `--out <file>` and `--dry-run`.

> **Working tree in motion.** Phase 2 edits landed while this audit was being written:
> - `pixel.js` INK changed to `#29243d`.
> - `art-core.js` now has a v2 dispatch.
> - `index.html` now loads `art-v2-*.js`.
> - New tools appeared: `tools/v2_export.js` and `tools/v2_sheet.js`.
>
> The line numbers here and the committed manifest describe HEAD, which is the v1 code art. When the script reads the working tree, v2 rows show up as `authoring: "v2-code"`. At the time of writing there were 88 such rows: peashooter, sunflower, chomper, basic, conehead, zombot, plankwalker and gargantuar.

---

## 1. Inventory (from the manifest)

| type | rows | ids | how a row is defined |
|---|---|---|---|
| plant | 3,384 | 141 | 423 looks (3 stages) x 8 poses. Fields include legendary, role, element, part, unlock and currentBounds |
| zombie | 405 | 81 | 5 poses. 8 zombies have the `arcade: true` flag |
| boss | 24 | 12 | 2 frames on a 96x96 logical grid. Names, titles and arenas come from `battle.js` BOSSES |
| costume-item | 26 | 26 | `D.FUSION_ITEMS`. Costume in art-core.js ITEM, icon in art-world.js FUS |
| fusion-part | 36 | 36 | `PX.PART_IDS`, with the partner plants that wear each part |
| skin | 21 | 21 | 6 `D.SKINS` (all reachable) and 15 `PX.SKIN_IDS` Solunar skins (none reachable) |
| halloween-costume | 4 | 4 | hjack, hwitch, hbat, hcandy (art-event.js PLANT_SKINS) |
| element-topper | 11 | 11 | art-core.js EL_FX. `normal` draws nothing |
| element-creature | 33 | 11 | 3 frames each (`PX.critter('el:<el>', f)`) |
| shard / core | 11 / 11 | 11 / 11 | `PX.item('shard' / 'core', el)` |
| element-icon | 12 | 12 | `D.ELEMENTS` (the 11 elements plus `plant`) |
| fruit | 11 | 11 | 9 in pixel.js FRUIT_ART, 2 in art-core.js FRUIT2 |
| seed-packet | 8 | 8 | 7 `D.SEEDS` kinds, plus `hjack` (event.js adds it at runtime) |
| effect-style | 32 | 32 | 27 ANIM styles, 4 SUPPORT styles, and the `power` default |
| garden-theme / house | 16 / 16 | 16 / 16 | `D.GARDEN_MAPS`. Each theme has its own corner-house facade |
| prop | 125 | 125 | 98 PVZ_PROP, 5 PVZ_HOME, and 22 pixel.js props that themes still use |
| survival-map | 16 | 16 | `D.SURVIVAL` |
| adventure-world | 8 | 8 | 5 levels each, 40 levels in total |
| battle-league / plant-cup | 29 / 11 | 29 / 11 | arena = `LEAGUE_AREA[id]`, falling back to `frontyard` |
| race-scenery | 27 | 27 | 15 from race.js TH and 12 from PX.RACE_MAPS. 31 race series use them |
| arcade-game | 9 | 9 | 8 GAMES and the Claw Machine |
| trophy | 50 | 50 | 27 league cups, 11 cup pots, 12 Zomboss medals |
| fish / aqua-decor | 31 / 22 | 31 / 22 | `D.AQUA.FISH` / `D.AQUA.DECOR` |
| aqua-backdrop / aqua-sand | 6 / 4 | 6 / 4 | |
| ui-tab / ui-screen | 7 / 18 | 7 / 18 | 9 `data-screen` sections and 9 chrome surfaces |
| *extra types found in the source* | | | |
| effect-sprite | 37 | 37 | battle.js `aspr()` cases (pea … pow) |
| arcade-sprite | 21 | 21 | `PX.arcade.*` |
| halloween-zombie-costume | 4 | 4 | art-event.js ZCOST |
| event-item | 7 | 7 | `PX.eventArt` |
| npc | 2 | 1 | Crazy Dave, 2 frames |

All brief counts match the source: 141 plants, 81 zombies, 12 bosses, 26 fusion items, 16 garden maps, 16 Survival maps, 29 leagues and 11 cups, 31 fish, 22 decor items. Adventure has 40 levels.

**Grid and frame rules** (manifest `grid`, read from the loaded engine):
- Characters use a logical grid of 64x64. This is a 32x32 art-px Grid with `Grid.K = 2`.
- Each character exports as a 256x256 frame (`renderScale` 4) with the anchor at (32, 62). In the frame that is base y = 248 and centre x = 128.
- Bosses use 96x96 logical, exported as 384x384. The proposed anchor is (48, 94).
- Every other sprite lists its *current* canvas size in logical px, and a placeholder frame size of 4x that.
- Scene-sized art has null sizes.

---

## 2. Rendering engine: `pixel.js`

- `INK = '#3a2d34'` (:8) is the outline colour. `PAL` (:10) is the DawnBringer-32 table. `RAMPS` (:17) are 3-tone `[light, mid, dark]` ramps, with extra ramps in `RAMP_X` (:197).
- `class Grid` (:75) is the pixel buffer:
  - The constructor (:77) takes `k = k || Grid.K || 1`. `set()` (:87) paints whole k x k blocks and leaves ink inside a block alone.
  - `dot()` (:99) addresses fine px. `ell()` (:102) and `poly()` rasterise at fine resolution.
  - `outline()` (:131) draws a 1-fine-px ink edge. `outerLine()` (:143) adds the bold outer ring and skips `rgba()` colours.
  - `canvas()` (:155) tags the canvas with `c.k` (:159).
- `Grid.K = 2` (:165) makes the whole game draw at 2 fine px per art px. The comment at :74 still says the default is 1, which is stale.
- `piece()` (:191) draws a shape on its own grid, outlines it, then merges it. This is the source of the inner separation lines.
- The old Solunar sprout builder `sprig()` (:956) forces `Grid.K = 1` (:960). `SPRIG_W/H/AX/AY = 32/32/16/31` (:967).
- `critter()` (:1554) and `critterSwim()` (:1585), which draws the top 60% of a creature with a ripple.
- `item()` (:1605) includes FRUIT_ART (:1619). The old `fruit()` is at :2011.
- `PROP2` (:2084) holds chibi props, and `prop()` (:2222) falls back to the old Solunar switch.
- `artW/artH` (:2692) return `width / k`. `blit()` (:2693) anchors bottom-centre (`floor(w/2)`, `h`) in art px and flips with `scale(-1, 1)`. `keepK()` (:2701) carries the k tag over. `SCENE_K = 2` (:2703).
- The `window.PX` export is at :2909.

## 3. Canvas init, DPR and how each scene reaches the screen

The world is laid out in world px (= art px). Sprites go into a buffer that holds `SCENE_K` px per world px. That buffer is then scaled to device pixels.

| scene | world buffer | background buffer | DPR cap | present step |
|---|---|---|---|---|
| Garden | `buf` = world x SCENE_K (garden.js:841). Render sets `setTransform(SCENE_K)` (:2653) | **skyC/bgC at 1x** (:840). paintSky :441, paintLand :467 | 2 (:832) | `drawImage(buf)` x Z·DPR (:2708). `snapZ` (:856) keeps whole device px per fine px. Smoothing is turned on (`'low'`) when zoomed out (:2706) |
| Survival | `L.ww*K` (survival.js:701) | **bgC at 1x** (:724) in paintBg :720, drawn under `setTransform(K)` (:974-975) | 3 (:686) | `drawImage(buf, … Z·DPR)` (:1017) |
| Battle | `lo` at K. One world px = 3 to 5 CSS px (`PXS`, :1899) | bgC = WW·K (battle.js:3845) in drawBg :3841 | 3 (:1896) | `drawImage(lo, … sc)` (:4036) |
| Race | lo/bgC/fgC = WW·SCENE_K (race.js:2058-2059) | same | 3 (:2044) | DS = whole device px per fine px (:2051). Integer-only present (:2912) |
| Aquarium | K (aquarium.js:21) | bg at K, paintBg :93 | 3 (:56) | `drawImage(buf, … Z·DPR)` (:561) |
| Arcade | per game | **`lo` at 1x** (arcade.js:1918) in paintBg :1914 | 3 (:2334) | `drawImage(bgC, … g.Z)` (:1985) |
| Adventure | `AW x AH` = 150x260 world px x K (adventure.js:117) | paintWorld :135 | n/a | CSS-scaled, `data-nosnap` |
| Title menu | K (menu.js:436) | drawBg :433. One world px = 2 or 3 CSS px (:435) | 2 (:485) | |

UI canvases in app.js:
- `paint()` (:67) and `fitCanvas()` (:75) size a bitmap from the sprite, using `.k`.
- `flushSnap()` (:639) snaps every `canvas.px` up to 200 px to a whole number of device pixels per bitmap pixel. `ui.css:28` sets `canvas.px{image-rendering:pixelated}`.
- `crispScale()` (:788) handles reward and celebration tiles.
- `hdFit()` (:797), `hdLook()` (:818) and the evolution scene `showEvolution()` (:1063, sizing at :1083-1093) are the **k>2 smooth path** (see risks).
- Nav icons come from `icon()` (:16) and are painted at :713.

## 4. Character art

**`art-core.js`, the plant and zombie builders:**
- Palettes: `EL_PAL` (:211) holds the element recolours. `PLANT_PAL` (:224) is filled by art-plants*.js. `pal()` (:231) mixes the element and fusion partner colours.
- `geom()` (:335) and `layers()` (:358) are the costume layer system.
- Costume tables: `PART` (:477) has 36 fusion parts and `ITEM` (:1071) has 26 fusion items.
- Element toppers: `EL_FX` (:1490) plus `elDetails()` (:1511) for the sparkles.
- Skins: `SKIN` (:1527) and `applySkin()` (:1536), with the rainbow ramp in RBW. Also `ghostFade` (:1566), `applyShiny` (:1575) and `fusionGlow` (:1586).
- Costume fitting happens once per look, on the resting pose:
  - `dressGeom` (:1610) is the debug view.
  - The `restCache`/`liftCache` caches are at :1616.
  - `restGeom()` (:1617) and `shiftGeom()` (:1627) do the fit, `headgearOverlap()` (:1596) measures how far headgear must lift, and `liftCache` is used at :1661.
  - Do not go back to measuring every frame: that caused the "glitching fusion" bug.
- `buildPlant()` (:1639) builds the plant and finishes with `outerLine` (:1676).
- `PX.sprig` dispatch (:1689):
  - It runs under `hires()` (:1687, `HI = 2` at :1686), caches up to 900 looks (:1696), and falls back to the Peashooter if a draw throws (:1695).
  - `buildZombie()` (:1700) builds zombies.
  - Wrappers stack on top: art-event.js:115 dresses Halloween looks, and art-hd-loader.js:123 swaps in illustrated sheets.
- Exports: `PX.SKIN_LIST/PART_IDS/ITEM_FX_IDS` (:1717-1719) and the `PX.art` helpers (:1720: chibiEyes, madFace, blush, softBody, …).
- Item, critter and prop wrappers:
  - `PX.item` (:1881) covers seed packets via `seedPacket` (:1778) with a half-size `miniPlant` (:1752), element icons, cores, shards (`shardGrid` :1865), fusion icons and FRUIT2 (:1816).
  - `PX.critter` (:1899) covers element creatures at 18x18 and Zombosses from BOSS_ART at 48x48 hi-res.
  - `PX.prop` (:1914) checks PVZ_PROP, then PVZ_HOME, then pixel.js.
  - `PX.pvzHouse` (:1930) draws the 74x70 corner house.

**Families:**
- Plants (contract at art-plants.js:6, `ART.<id> = function (g, stage, P, C)`):
  - art-plants.js has 3, art-plants2.js 17, art-plants3/4/5.js 15 each, art-plants6/7/9/10/12.js 12 each, art-plants8/11.js 8 each.
  - 16 are legendary. No plant is defined twice.
- Zombies (contract at art-zombies.js:3, `ZA` :242):
  - art-zombies.js has 23, art-zombies2.js 18, art-zombies3/4.js 16 each, art-zombies5.js 8.
  - The shared kit is `PX.ZKIT`.
- Zombosses (`BA` art-zombies.js:243):
  - 7 are in art-zombies.js, from :820 (gargantuar) through tomorrowtron.
  - 5 are in art-zombies2.js, from :482 (warwagon).
- `art-world.js`:
  - Element creatures: `SPR` (:90).
  - Icons: `ELEMENT_ICON` (:265, built in a loop), `ELEMENT_CORE` (:276), `ELEMENT_SHARD` (:287), `FUS` fusion icons (:299).
  - Props: PVZ_PROP `P` (:549) and PVZ_HOME `H` (:828).
  - `PX.crazyDave` (:909) and `PX.worldArt` (:932).
- `art-world2.js` adds HOUSE facades (:659), props (:948), the `pvzHouse` wrapper (:952), 8 GARDEN_MAPS (:1211) and 8 RACE_MAPS (:1265).
- `art-world3.js` adds HOUSE (:516), props (:697), 4 GARDEN_MAPS (:846) and 4 RACE_MAPS (:879).
- Aquarium:
  - art-aqua.js holds the registries (:14), `aquaSprite` (:27), `aquaBackdrop` (:40) and an `item` wrapper (:64).
  - Fish are in art-fish.js (16, `FA` :16) and art-fish2.js (15, :18). Decor is in art-aquadecor.js (22, `D` :13). Backdrops and sands are in art-aquaworld.js (`BD` :19).
- `art-trophies.js` has the LEAGUE (:27), CUP (:35) and BOSS (:40) tables, plus `SPEC` (:118), `draw1x` (:124, using `new PX.Grid(24, 24, 2)` at :127) and `PX.trophy` (:133).
- `art-arcade.js` has `make()` (:42) and `PX.arcade` (:354).
- `art-event.js` has `PLANT_SKINS` (:65), the sprig wrapper (:115), `ZCOST` (:146), `costumesFor` (:193), `eventZombie` (:202), the hjack packet `item` wrapper (:285) and `PX.eventArt` (:328).

## 5. Non-sprite art: where scenes draw their worlds

| art | defined | drawn |
|---|---|---|
| Garden themes | garden.js `THM` (:59): 4 originals. PX.GARDEN_MAPS 8+4 are merged in at :147. `TH` Proxy (:148). `PS.gardenMaps` (:149) | garden.js paintSky :441, paintLand :467, drawFenceFx :1695, drawWater :1939, render :2650. Props come through `propSpr` (:205), and the corner house is drawn at :344-346 |
| Survival lawns | the same themes, via survival.js `themeFor` (:148) | paintBg :720, paintFence :835, drawProps :866. Map preview at :1065 |
| Adventure map | adventure.js `WORLDS` (:33), `PER = 5` (:43) | paintWorld :135 |
| Battle arenas | battle.js `THEMES` (:3329, 22 keys), `BPROP` arena props (:3491). Leagues map to arenas through `LEAGUE_AREA` (:661) and `launch()` (:1857) | drawBg :3841. Fighters at drawFighter :3919, Zombosses with bigCritter :3886 |
| Battle effects | `ANIM` (:2752), `SUPPORT` (:2801), `animOf` (:2810), sprites in `aspr()` (:2815) | animMove :2910, animSupport :3059 |
| Race tracks | race.js `TH` (:271) plus PX.RACE_MAPS merged in (:346). Series: EXTRA_RACES :68, MORE_RACES :85, PLANT_RACES :108 | drawWorld :1620. Canvas sizing from :2032 |
| Arcade boards | arcade.js `GAMES` (:44), `CLAW_DEF` (:1642), `MODS` (:1894). Each module has its own `draw(g)` | paintBg :1914, render :1981, clawCab :2254 |
| Aquarium tank | art-aquaworld.js backdrops and sands | aquarium.js paintBg :93, drawGlass :533 |
| Title yard | menu.js | drawBg :433 |

## 6. Engine pieces

**Illustrated-art loader** (pilot, inert while the manifest is empty):
- `art-hd-manifest.js:6` exports a frozen, empty `PVZ_HD_MANIFEST`.
- `art-hd-loader.js` loads after data.js (index.html:98-99):
  - Cells are `CELL = 256` (:17). The pose lists start at :18. `isPlain()` (:24) sends variants (skin, element, fuse, shiny) back to code art.
  - `pickPlantPose`/`pickZombiePose` (:31/:48) map a pose request to a sheet frame. Sheet sizes are validated at :99.
  - `paintApproved()` (:74) paints frames with **imageSmoothing on** (:77).
  - The `PX.sprig` wrapper (:123) returns stable 256 px canvases tagged **`c.k = CELL / 32` = 8** (:131).
  - `PRELOAD_MAX = 24` (:141). `window.PVZ_HD` (:147) holds the debug hooks.
- The loader's pose names `walk0/walk1/knocked` become `walkA/walkB/knockedOut` in the manifest (see `grid.loaderPoseNames`). Every manifest row's `codePose` was checked against the loader's own `pickPose`.

**UI HTML/CSS:**
- `index.html`:
  - Boot splash at :14, with inline SVG and inline styles.
  - `#hud` (:28) and `#stage` (:39) with 9 `section.screen` blocks.
  - `#nav` (:51) with 7 tabs, `#modalRoot` (:61) and `#toast` (:62).
  - Google Fonts load at :7-8 (Luckiest Guy and Nunito).
  - Scripts run from :65 to `PS.ui.boot()` at :113.
- `ui.css`:
  - Tokens in `:root` (:4-11): `--ground --dots --wood* --leafband --panel --slot --line --edge --ink --px-ink --field --accent --sun --berry --sky --plum --focus --f-ui --f-px`.
  - `#app` is held to 460 px max (:24), except on iPads at 600 px and wider (:27).
  - `canvas.px` uses pixelated rendering (:28). The iPad drag guard is at :17.
- `app.css`:
  - `--pv-*` kit tokens (:175).
  - Per-screen `--mode/--mode-dk/--bg1/--bg2` (:180-189) and per-tab `--nav-c` (:190-191).
  - `.sbox-frame` (:58), `.modal-wrap` (:36), and pixelated pick previews (:105).
- **Ten scenes inject their own CSS:**
  - garden.js:3376, race.js:1017, battle.js:1267, survival.js:1652, arcade.js:2485
  - adventure.js:530, shop.js:277, sprouts.js:322, aquarium.js:1044, menu.js:17

## 7. Saves and caching

**Storage keys** (state.js):
- Saves use `pvzg:save:v1` (the first player has no suffix) and `pvzg:players:v1` (:23). `keyFor` is at :24.
- `?save=<slot>` (:31) overrides the slot for testing.
- Snapshots and rescue copies use `pvzg:snap:v1:` and `pvzg:rescue:v1:` (:166).
- Device-only keys: `pvzg:eventForce`, `gardenZoom`, `music`, `muted`, `probe`, `skipMenu`, `tcard`, `trayLow`.

**Save format:**
- `SAVE_VERSION = 1` (:57). `migrate()` (:61) raises `s.v` (:125). `load()` is at :182 and `saveNow()` at :196.
- Backup codes are `PVZGARDEN1Z:` + base64(deflate) or `PVZGARDEN1J:` (:257). `decodeBackup`, `exportBackup` and `importBackup` are at :265, :277 and :286, exported through `PS.backup` (:1223).
- Art changes touch none of this, as long as `look` values (species, stage, skin incl. the h* Halloween costumes, element, fuse, shiny) keep rendering.

**Service worker:**
- app.js registers it only when `PVZG_VERSION !== 'dev'` (:613, :615). On `controllerchange` it shows "A new version is ready / Update now" (:618-622).
- `tools/build_pvz.py`:
  - Runs `check_pvz.js` first (`run_checks` :82; `--skip-checks` :84).
  - Copies every top-level `.js/.css` file except `_*` and version.js (:184), plus `icons/` (:188) and only the registered `img/` sheets (`image_assets` :50).
  - Stamps `version.js` (:199) using `content_version` (:95), a hash of the shipped files.
  - Writes `sw.js` with cache `pvzg-app-<VERSION>` (:250) and `pvzg-fonts` (:251). The SW precaches all assets (`skipWaiting` :257) and deletes old `pvzg-app-*` caches on activate (:262).
- `pvz-garden/art-export/` is never shipped, because the build only copies top-level files.

## 8. Checks, tests and baseline results (run 2026-11-06)

| command | result |
|---|---|
| `node tools/check_pvz.js` on the real folder | **FAILS in 0.15 s** at step 1: "index.html does not load" `art-hd-loader 2.js`, `battle 2.js`, `garden 2.js`, `pixel 2.js`, `survival 2.js`. These iCloud duplicates are byte-identical to stash@{0}. `.gitignore` hides them, but check_pvz.js:20/:25 reads the folder |
| the same check on a clean copy of HEAD (duplicates left out) | **All checks passed** in 5 min 21 s: 48 scripts parse; 141 plants, 81 zombies, 597 moves, 11 elements, 26 fusion items, 40 leagues; "46,914 plants, zombies, sprites, seed packets and icons draw cleanly"; no sheets registered; saves, migration and backup codes OK |
| `python3 tools/test_art_hd_build.py` | **passes** (23 checks, 1.4 s, temporary folders only) |
| `node tools/test_art_hd_loader.js` | **FAILS** at :46 (`first.hdArt` is undefined). It asserts the stashed smooth-HD features (`hdArt`/`hdv`). To be rewritten in Phase 2 |
| `node tools/pvz_art_inventory.js --ref HEAD` | 4,495 rows in about 8 s, 0 warnings, every brief count matches. All 1,374 distinct `file:line` refs in the manifest were checked by script: each cited line exists and contains the id or the named symbol |

What `check_pvz.js` covers:
1. Syntax and index.html loading (:19-26).
2. Content tables (:67).
3. Every plant (stage, pose, element, item, part partner, skin), zombie (pose and skin), Zomboss, element sprite, packet, icon, house, prop and aquarium art draws without errors (:171-214).
4. Illustrated sheets via `art_hd_check.js` (:219).
5. Saves (:229).

## 9. Rollback path

**Git branches** in `pvz-garden/`:
- `main` = `df960a7`: the published source, build 2026.10.24-1500-e28fee, the same as `pvz-garden-app/version.js`.
- `art-hd-pilot` = `5b07d7b`.
- `pixel-art-64` = `5b07d7b`: the working branch, with no commits of its own yet.

**`stash@{0}`** ("smooth-HD A0 + partial stage A/B rendering") changes 5 files: art-hd-loader.js, battle.js, garden.js, pixel.js and survival.js. To restore it: `git stash apply stash@{0}` on `art-hd-pilot`.

**Backups:**
- `backups/pvz-garden-before-pixel64-2026-11-06` is the repo at `5b07d7b` (`art-hd-pilot`, with `main`), with the smooth-HD edits left uncommitted. Those edits are identical to the stash.
- `backups/pvz-garden-before-pixel64-2026-11-06-tools` is a copy of `tools/` before the pixel-64 work.
- Older backups exist: `pvz-garden-before-art-hd-2026-11-06(-tools)` and `pvz-garden-before-2026-10-22`.

**Live site:** `pvz-garden-app/` is untouched and is still build 2026.10.24-1500-e28fee.

To roll back, do any of these:
- `git checkout main`
- discard the working tree
- copy the backup folder back

`tools/` is shared and not in git, so restore it from the `-tools` backup.

## 10. Findings

- **Two leagues have no art of their own.** `trickortreat` and `funfair` (data.js:1161-1162):
  - They have no trophy in the art-trophies.js LEAGUE table (:27). `PX.trophy` returns null, and battle.js:1344 leaves the canvas blank.
  - They have no `LEAGUE_AREA` entry (battle.js:661), so they borrow the frontyard arena.
- **Unused art:**
  - The 5 PVZ_HOME rest houses (art-world.js:828: davehouse, shed, crypt, pirateshack, tomb) are never drawn. The garden draws its home with `PX.pvzHouse(th.facade)` (garden.js:344-346), and `th.home[0]` is only a label.
  - The props `ironfence` (art-world.js:679) and `picketfence` (:562) are not used either.
  - race.js `TH.jungle` and `TH.snowy` are fallback scenery only (race.js:74, :78).
  - The 15 Solunar skins in pixel.js `SKINS` (:351) can't be reached in PVZ.
- **Element and fruit oddities:**
  - `EL_FX.normal` draws nothing, so a Normal plant is shown by its `EL_PAL` tint alone.
  - The 9 classic fruits live in pixel.js FRUIT_ART (:1619). Melon and Plant Food live in art-core.js FRUIT2 (:1816).
- **The current canvases are full:**
  - **32 of 81 zombies touch the top row** of their 64x64 canvas. 79 of 81 reach the bottom row, and the mean height is 62.1 px.
  - 330 of 423 plant looks fill logical row 63.
  - Plant heights by stage average 47, 52 and 57 px.
  - 6 Zomboss frames touch the top of the 96 canvas, and Zombosses span 68-96 px across.
- **Trophy and generated canvases lose their `.k` tag.** `PX.trophy` returns canvases without `.k` (art-trophies.js:133-141). `mapPreview` hand-tags a canvas with `c.k = 2` (app.js:1259).

## 11. Risks for the overhaul

1. **Smooth-HD code paths will blur pixel sheets.**
   - The loader paints frames with smoothing on (art-hd-loader.js:77-78).
   - app.js switches every canvas with `k > 2` to smooth, `image-rendering:auto` drawing: hdFit :797-802, hdLook :818-820 and the evolution scene :1087/:1093.
   - The loader's 256 px frames are k = 8 (:131).
   - Garden zoom-out also smooths (garden.js:2706).
   - Phase 2 must route sheets through nearest-neighbour, integer-scaled drawing.
2. **The code assumes k = 2 in many places.**
   - `Grid.K`/`SCENE_K`/`HI` = 2 (pixel.js:165, :2703; art-core.js:1686).
   - Sizing math multiplies by 2: `artW*2` in app.js:798-799 and :1084-1085, `aw*2` in survival.js:1067, and `c.k = 2` in app.js:1259.
   - art-trophies.js:127 hard-codes k = 2.
   - The loader assumes 32-art-px cells (`CELL / 32`).
   - All of this needs auditing before new k values go live.
3. **The anchor can be off by one logical px.**
   - Scenes blit at `SPRIG_AX/AY` (16, 31) art px, for example garden.js:1795 and survival.js:913. So the ground line is the **top edge** of logical row 62, and today's feet fill rows 62-63.
   - If the frame's y = 248 is treated as "feet end here", new art will sit 1 logical px higher than code art.
   - Battle also anchors Zombosses at their bottom edge (`ay = artH`, battle.js:3923), not at the proposed (48, 94).
4. **Costume fitting depends on geometry from the drawing functions.**
   - Parts, items, element toppers and Halloween costumes (36 + 26 + 11 + 4) are placed using the head geometry each `PLANT_ART` function returns (restGeom/shiftGeom/liftCache).
   - Image sheets carry no geometry, so every new look needs head anchors in its data.
   - Every variant look (skin, element, fusion or shiny) still falls back to code art (art-hd-loader.js:24), so old and new art would mix on screen.
5. **Backgrounds are drawn at half the sprites' detail.** The garden sky and land (garden.js:840), the Survival lawn (survival.js:724) and Arcade boards (arcade.js:1918) are painted at 1 world px, which is 2x2 logical px. Sprites have 1-logical-px detail. This breaks "one level of detail everywhere" unless those layers are repainted at SCENE_K.
6. **The build is fragile.**
   - The iCloud `* 2.js` copies already break `check_pvz.js`, so the build is blocked right now. If they slipped through, `build_pvz.py:184` would ship them.
   - Any new `art-v2-*.js` file must be listed in index.html, or check_pvz fails.
   - Every shipped file goes into the SW precache. Up to 423 + 81 + 12 new sheets would make first-load and update downloads much heavier, while the loader only preloads 24 (:141).
7. **UI chrome is spread across many places.** Design tokens live in ui.css, app.css and 10 injected style blocks, plus inline styles in the boot splash and menu.js. Fonts come from Google Fonts: they are not precached, but the SW caches them on first use in `pvzg-fonts` (build_pvz.py:251), and the fallback faces apply until they arrive. A token-layer change has to reach all of them, and `#app` is held to 460 px below 600 px wide.
