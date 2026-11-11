# PVZ Garden — Technical Art Pipeline Audit

**Prepared for:** the family's ChatGPT art collaboration (replacing PVZ Garden's code-drawn art with hand-illustrated, Plants vs. Zombies–quality 2D cartoon art, keeping the game's own characters, mechanics and identities).
**Game audited:** PVZ Garden, a private family web game, source folder `pvz-garden/`, live build `pvz-garden-app/` (GitHub Pages). The Christmas "Deck the Lawn" event will be added to this game later, so everything here applies to it too.
**Date:** 2026-11-06. **Status:** information only. Nothing in the game was changed, installed or generated while preparing this report.

**How to read this document**
- **VERIFIED** = read directly in the source code, with `file:line` references (lines as of 2026-11-06). Numbers marked *computed* are arithmetic on verified formulas.
- **INFERRED** = a reasonable conclusion from the code that was not measured on a device.
- **RECOMMENDATION** = advice for the new pipeline, not a description of today's game.

All paths are relative to `pvz-garden/` unless they start with `tools/` (the project's tools folder, next to `pvz-garden/`) or `pocket-sprout/` (the sister game, see §6).

---

## 0. Summary (one page)

- **VERIFIED.** PVZ Garden is a **custom vanilla-JavaScript engine** with no framework, no libraries and no bundler. It renders with **Canvas 2D only** (no WebGL). The UI is DOM/CSS.
- **VERIFIED.** **Every character, prop, background and icon is drawn procedurally in code.** The game ships no image assets except the three app icons in `icons/`. Nothing in the game code loads an image file today (no `new Image`, no image URLs).
- **VERIFIED.** Characters are **whole-sprite flipbooks**. Each combination of look and pose (frame 0/1, walking, eyes, mouth, arms, flap) is painted procedurally into its own small canvas and cached. Scenes then add motion with transforms (bob, squash, lunge, tip-over, flash).
- **VERIFIED.** The resolution contract:
  - A plant or zombie is **32 × 32 "art pixels" = a 64 × 64 canvas** (`.k = 2`), anchored bottom-centre at (16, 31). A Zomboss is 48 × 48 (96 × 96 canvas).
  - Every scene draws into a world buffer at **2 buffer pixels per world pixel** (`PX.SCENE_K = 2`). It then enlarges that buffer to the screen with **nearest-neighbour scaling** (smoothing off, `image-rendering: pixelated`).
- **VERIFIED.** **This is the main limit for illustrated art.** However large a character appears on screen (64–160 CSS px in normal play, up to 320 at maximum zoom), it reaches the screen as **64 × 64 buffer pixels**, upscaled 3–5× with hard pixel edges. Detailed illustrations would come out blocky unless the buffer resolution and smoothing rules change for the new art.
- **VERIFIED.** Gameplay mostly uses **world positions and fixed numbers**, not image sizes. Examples: Survival lawn cells, raid fighting distances, the projectile offsets in the battle ANIM table. That makes it safe to swap pictures if every new image keeps the same **32 × 32 art-pixel box and feet anchor**. The exceptions are listed in §5.
- **VERIFIED.** The sister game **Solunar Sprouts** (same engine) already replaces code art with PNG illustrations through one wrapper file, `pocket-sprout/art-images.js`. It fits each PNG into the code art's box, falls back to code art until the PNG loads, and ships the images in the offline cache. PVZ Garden's art API has the same shape (`PX.sprig`, `PX.critter`, `PX.item`, `PX.prop`), so the same approach is proven for this engine.
- **RECOMMENDATION (detail in §6–§7).**
  - **Format:** use **one transparent PNG per character per pose** (WebP optional), organised per character. Start with a small pose set (idle / blink / walk ×2 / attack / hurt), packed as a **per-character sprite sheet plus a JSON frame map**.
  - **Display:** draw the new art at **native device resolution with smoothing on**, not through today's 2× pixel buffer.
  - **Memory:** load art **per scene** into an **LRU-limited cache**.
  - **Keep today's motion code:** bob, lunge, flash and tip-over are scene transforms and keep working unchanged.

---

## 1. Game engine and rendering architecture

### 1.1 Technology (VERIFIED)
- Custom engine, no framework or library. `index.html:65-111` loads **46 plain `<script>` files in order**. They share three globals: `PX` (engine and all art), `PS` (app, state, scenes) and `PSDATA` (game data).
- **Canvas 2D only.** There are 86 `getContext('2d')` calls (no options). No `.js` file uses WebGL, OffscreenCanvas, `createImageBitmap`, `new Image` or any image URL.
- **UI is DOM and CSS** (`ui.css`, `app.css`, plus CSS strings each scene injects), with small `<canvas class="px">` icons painted by code.
- **Fonts:** Google Fonts "Luckiest Guy" and "Nunito", loaded without blocking (`index.html:4-8`). These are the only external requests.
- **Offline:** the built site adds a service worker (`pvz-garden-app/sw.js`) that pre-caches the files `tools/build_pvz.py` copies (see §3.3; this matters for new image files).

### 1.2 Rendering loop and buffers (VERIFIED)
- **One master loop.** `app.js:688-699` runs a single `requestAnimationFrame` loop. Each frame it calls the active scene's `PS.scenes[current].frame(dt, t)` with `dt ≤ 0.05` s. There is no frame-rate cap.
- **Side loops:**
  - title-screen yard (`menu.js:516`)
  - confetti (`app.js:868-901`) and screen wipes (`app.js:916+`)
  - the shop gumball machine (`shop.js:714`)
  - lazy sprite drawing for the UI (`app.js:260-277`)
- **Off-screen buffers, one set per scene:**

| Scene | File | Buffers |
|---|---|---|
| Garden (main screen, big scrolling map) | `garden.js:3409-3411` | `buf` (world at 2×), `skyC`, `bgC` (land painted at 1×) |
| Battle (turn battles) | `battle.js:1905, 3845` | `lo` (world at 2×), `bgC` |
| Survival (PvZ lane defense) | `survival.js:701, 724` | `buf`, `bgC`, `fenceC` |
| Race | `race.js:2058-2059` | `lo`, `bgC`, `fgC`, `dkC` |
| Title | `menu.js:444` | `drawBg.buf` |
| Aquarium | `aquarium.js:69` | `buf` |

- **Same pattern in every scene:**
  1. Draw the world into the buffer under `setTransform(PX.SCENE_K)`, with positions in world pixels.
  2. Copy the whole buffer to the on-screen canvas with **one scaled `drawImage`**.
  3. Draw text and HUD numbers at device resolution.
- **Garden example:** `garden.js:2701-2708`. Smoothing is turned off, and turned on (`'low'`) only when zoomed so far out that a buffer pixel is smaller than a device pixel:
```js
// garden.js:2701-2708
const sc = Z * DPR;
ctx.setTransform(1, 0, 0, 1, 0, 0);
ctx.imageSmoothingEnabled = false;
ctx.fillStyle = waterC || TH[area].water[3]; ctx.fillRect(0, 0, cv.width, cv.height);
// far out, a scene-buffer pixel is smaller than a device pixel: smooth it then (nearest would drop thin lines)
if (sc < PX.SCENE_K - 0.01) { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low'; }
const X0 = Math.round(-camX * sc), Y0 = Math.round(-camY * sc), X1 = Math.round((ww - camX) * sc), Y1 = Math.round((wh - camY) * sc);
ctx.drawImage(buf, X0, Y0, X1 - X0, Y1 - Y0);
```

### 1.3 Does `pixel.js` still draw characters procedurally? Yes (VERIFIED)
- **`PX.Grid`** (`pixel.js:75-162`) is a grid of w × h art pixels. Each art pixel is k × k "fine pixels", stored as an array of colour strings; `null` means transparent.
- **Drawing primitives:**
  - `ell`, `poly` and `stroke` draw at fine-pixel resolution (`pixel.js:102-128`).
  - Shading uses 3-tone ramps picked by surface angle (`shadeOf`, `pixel.js:60`), plus crescent shade and highlights (`kShade`, `pixel.js:976-984`).
  - Colours: `PAL` (`pixel.js:10-15`), `RAMPS` (`pixel.js:17-51`), outline ink `#3a2d34` (`pixel.js:8`).
- **Outlines:**
  - `outline()` adds a 1-fine-pixel ink ring (`pixel.js:131-141`).
  - `outerLine()` adds a bold ring round the whole silhouette and skips `rgba()` glows (`pixel.js:143-152`).
  - `PX.piece()` draws a part on its own grid, outlines it, then merges it (`pixel.js:191`).
- **`Grid.canvas()`** turns a grid into a real canvas with **one 1 × 1 `fillRect` per filled fine pixel**, and tags it with `.k`:
```js
// pixel.js:155-165
canvas() {
  const c = document.createElement('canvas'); c.width = this.fw; c.height = this.fh;
  const x = c.getContext('2d');
  for (let y = 0; y < this.fh; y++) for (let i = 0; i < this.fw; i++) { const col = this.a[y * this.fw + i]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } }
  if (this.k > 1) c.k = this.k; // screens draw it at (width / k) x (height / k) art pixels: see blit / PX.artW
  return c;
}
...
Grid.K = 2;
```
- **Plants** are built by `buildPlant` (`art-core.js:1639-1680`) from about 141 per-species drawing functions in `PX.PLANT_ART` (`art-plants.js` … `art-plants12.js`).
- **Zombies** are built by `buildZombie` (`art-core.js:1700-1705`) from about 81 `ZOMBIE_ART` functions (`art-zombies.js` … `art-zombies5.js`). Each is 32 × 32, faces right, with feet on rows 29-31 (`art-zombies.js:3`).
- **Zombosses** are 48 × 48 (about 12 `BOSS_ART` entries), built through `PX.critter` (`art-core.js:1897-1909`).

### 1.4 Separate systems (VERIFIED)
- **Characters, props, items and icons** are all `PX` canvases. Scenes draw them with `PX.blit` (anchored at the bottom-centre); the UI paints them into small DOM canvases with `PS.ui.paint` / `fitCanvas` (`app.js:67-83`).
- **Backgrounds are painted per scene:**
  - The Garden and Survival land is filled pixel by pixel with `createImageData` at **1 canvas pixel per world pixel** (`garden.js:466-579`, `survival.js:720-831`).
  - Battle and Race backgrounds are painted at SCENE_K (`battle.js:3842-3845`, `race.js:2059`).
- **A few sprites are DOM-positioned canvases:**
  - the garden drag ghost (`garden.js:2909-2912`)
  - the tutorial hand
  - flying coins (`app.css:317`)
  - the celebration hero
- **The UI is HTML/CSS.**

### 1.5 Dependencies and what could get in the way of image files (VERIFIED unless marked)
1. **Build copies only top-level `.js`/`.css` plus `icons/`.** `tools/build_pvz.py:40` has `COPY_EXT = ('.js', '.css')`, with the copy loop at `:140-146`. A new `art/` folder would **not** be shipped until the build script is extended.
2. **The service worker pre-caches only that file list** (`pvz-garden-app/sw.js:6`). Requests that miss the cache are fetched but never stored (`sw.js:29`), so new images would not work offline until they are added to the pre-cache list.
3. **Boot never waits for files** (`app.js:703`). The loading screen switches to "Tap to try again" after 9 s (`index.html:19-23`). Scenes already fall back safely when a sprite fails (`spr(key, make, fb)`, `garden.js:195-200`).
4. **Sizing is by `.k`.** `PX.artW = width / k` (`pixel.js:2692`). An image canvas tagged `.k = imageWidth / 32` is sized correctly by every `PX.blit` call with no other change.
5. **Failed loads are silent.** `app.js:683` deliberately doesn't report failed loads, so a missing image would fail quietly. Recommendation: add a dev-only check.
6. **The pre-publish checks have no image support.** `tools/check_pvz.js:29-45` runs all art in Node with a fake canvas and no `Image`; it would need a stub or a file-existence check for images.
7. **Smoothing is off nearly everywhere and canvases are `pixelated`** (§2.4). Illustrated art scaled through today's path would look jagged.
8. *External knowledge:* WebP needs iOS/iPadOS 14 or later. PNG works everywhere.

---

## 2. Graphics resolution and scaling

### 2.1 Core constants (VERIFIED)
| Constant | Value | Where |
|---|---|---|
| `Grid.K` (fine px per art px) | **2** | `pixel.js:165` |
| `PX.HI` (characters' grid scale) | **2** | `art-core.js:1686` |
| `PX.SCENE_K` (buffer px per world px) | **2** | `pixel.js:2703` |
| Plant / zombie art box | **32 × 32 art px = 64 × 64 canvas**, anchor (16, 31) bottom-centre | `pixel.js:967`, `art-zombies.js:3` |
| Zomboss art box | **48 × 48 art px = 96 × 96 canvas** | `art-core.js:1897-1909` |
| Small plant icons, legacy sprite builder | built at 1× | `art-core.js:1754`, `pixel.js:960` |

`PX.blit` draws with 5-argument `drawImage` at size (w/k, h/k), anchored at the bottom-centre, with positions rounded to whole world pixels:
```js
// pixel.js:2690-2703
const artW = c => (c.k ? c.width / c.k : c.width), artH = c => (c.k ? c.height / c.k : c.height);
function blit(ctx, c, x, y, flip, ax, ay) {
  const w = artW(c), h = artH(c);
  ax = ax == null ? Math.floor(w / 2) : ax; ay = ay == null ? h : ay;
  x = Math.round(x); y = Math.round(y);
  if (flip) { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(c, -(w - ax), y - ay, w, h); ctx.restore(); }
  else ctx.drawImage(c, x - ax, y - ay, w, h);
}
const keepK = (src, out) => { if (src && src.k) out.k = src.k; return out; };
const SCENE_K = 2;
```

### 2.2 How each scene scales to the screen (VERIFIED formulas, *computed* values)
Reference devices: **iPad** 820 × 1180 CSS px at DPR 2; **iPhone** 390 × 844 at DPR 3.

| Scene | DPR used | Scale rule | iPad | iPhone |
|---|---|---|---|---|
| **Garden** (`garden.js:829-865`, `TUNE` `:41`) | `min(2, dpr)` | ZMIN = max(1.5, floor(min(W/280, H/250)·DPR)/DPR); ZMAX = 4·ZMIN; world ww = ceil(W/ZMIN·2.05), wh = ceil(H/ZMIN·1.7); start zoom = snapZ(1.5·ZMIN) | **ZMIN 2.5**, ZMAX 10, **start Z = 4** CSS px per world px; world 673 × ~704; buffer 1346 × 1408; screen canvas 1640 × 2070 | DPR **2** (device is 3); **ZMIN 1.5**, ZMAX 6, **start Z = 2**; world 533 × ~790; buffer 1066 × 1580; screen canvas 780 × 1394 |
| **Battle** (`battle.js:1892-1910`) | clamp 1..3 | PXS = clamp(round(cssW/125), 3, 5); SC = max(2, round(PXS·dpr/2)·2) device px per world px | **5 CSS px per world px**; world 164 × ~177; Zomboss drawn ×2 | **3.33 CSS px per world px**; world 117 wide; Zomboss ×1 |
| **Survival** (`survival.js:678-712, 1108-1110`) | `min(3, dpr)` | Z = floor(W/(30 + 21·COLS)·DPR)/DPR; cell width = clamp(floor((ww − 30)/COLS), 20, 28) world px | 7 columns, **Z = 4.5**; world 183 × 263; **cell 21 world px = 94.5 CSS px** | 7 columns, **Z = 2**; world 195 × 422; **cell 23 world px = 46 CSS px** |
| **Race** (`race.js:2041-2066`) | `min(3, dpr)` | as Battle | 5 CSS px per world px | 3.33 |
| **Title** (`menu.js:433-487`) | `min(2, dpr)` | PXS = W ≥ 700 ? 3 : 2 | 3 | 2 |

**Notes**
- Garden world height, battle height and the Zomboss scale also depend on the HUD/nav heights; those were estimated from the CSS (INFERRED). ZMIN, ZMAX and the start zoom depend only on width, so they are firm.
- Garden: the double-tap zoom toggles ZMIN ↔ 2·ZMIN (`garden.js:2894`). The magnifier button zooms out to show the whole garden.

### 2.3 Canvas size vs CSS size, DPR (VERIFIED)
- **Garden, Survival and Title:** the canvas is CSS 100% wide and tall, with a bitmap of W·DPR × H·DPR (`garden.js:842, 3262`; `survival.js:702, 1532`; `menu.js:20, 486`).
- **Battle and Race:** the CSS size is set to bitmap ÷ dpr, so one canvas pixel is one device pixel (`battle.js:1903`; `race.js:2062`). Race also nudges the canvas onto a whole device pixel (`race.js:2037-2040`).
- **DPR is capped at 2** in the Garden, Title, confetti and wipes (`garden.js:832`, `menu.js:485`, `app.js:871/917`). On a DPR-3 iPhone those canvases are therefore stretched 1.5× by the browser (INFERRED: slightly uneven pixel widths).

### 2.4 Smoothing and transparency (VERIFIED)
**Smoothing**
- `imageSmoothingEnabled = false` appears **53 times**.
- Only the Garden turns smoothing on (`'low'`), when zoomed so far out that `Z·DPR < 2` (`garden.js:2706`).
- CSS `canvas.px { image-rendering: pixelated; image-rendering: crisp-edges }` (`ui.css:28`).
- The scene canvases `.g-cv`, `.b-cv`, `.sv-cv`, `.aq-cv` and `.r-cv` are pixelated.
- A MutationObserver resizes every pixelated canvas up to 200 × 200 to a whole multiple of device pixels (`app.js:636-667`). `crispScale` does the same for celebration art (`app.js:788-791`).

**Transparency**
- Empty grid cells stay transparent. Ghost-like skins use `rgba()` colours (`art-core.js:1566-1573`).
- Effects rely on the alpha channel:
  - `'lighter'` hit flashes (`garden.js:2583`)
  - `'source-in'` white silhouettes (`battle.js:3878-3883`, `race.js:2755-2759`)
  - `'source-atop'` ice tint (`survival.js:113-118`)
  - `'destination-out'` boss aura (`battle.js:3893-3899`)
- **All of these work unchanged on transparent PNGs.**

### 2.5 How big characters appear (VERIFIED formulas, *computed* values)
- **The rule:** on-screen size = 32 art px × (CSS px per world px).
- **The visible plant is shorter than its box.** The head-height constant `HEAD` is 20 / 25 / 29 art px by growth stage (`garden.js:1017`, `survival.js:60`); battle uses 24 (`battle.js:1916`).
- **Zombies are about 30 art px tall** (INFERRED from health bars drawn at y − 33).

| Where | iPad (CSS px) | iPhone (CSS px) |
|---|---|---|
| Garden, start zoom (32 × Z) | **128** (256 device px) | **64** (128 device px) |
| Garden, whole-garden view / max zoom | ~39 / 320 | ~23 / 192 |
| Garden Zomboss, start zoom (48 × Z) | 192 | 96 |
| Survival (32 × Z) | **144** (visible plant 90 / 112 / 131) | **64** (visible 40 / 50 / 58) |
| Battle (32 × CSS px per world px) | **160** (~120 visible) | **~107** (~80 visible) |
| Battle Zomboss (48 × 2 × 5 on iPad) | 480 | 160 |

**Key fact for new art (VERIFIED).** A character always reaches the screen as **64 × 64 buffer pixels** (32 × SCENE_K), whatever its displayed size. Each buffer pixel then becomes:
- **4 × 4 device pixels** in the iPad garden at start zoom
- **5 × 5** in iPad battle
- **4.5** in iPad survival (a non-integer, so columns alternate 4 and 5 pixels wide)

**Native-resolution targets for new art (*computed*).** To show one source pixel per device pixel, a character image needs about:
- **256 px** for the iPad garden at start zoom
- **320 px** for battle on both devices
- **640 px** for the iPad garden at maximum zoom


---

## 3. Current artwork and asset files

### 3.1 Directory tree of graphics code and assets (VERIFIED)
```
pvz-garden/                      (index.html:65-111 loads these in order)
├── index.html                   page shell, HUD and nav markup, script order
├── ui.css, app.css              UI styling; canvas.px { image-rendering: pixelated } (ui.css:28)
├── pixel.js        227 KB       ENGINE: PX.Grid (Grid.K = 2, :165), shapes, 3-tone shading, outline/outerLine (:131/:143),
│                                Grid.canvas() → canvas.k (:155-160), artW/artH/blit/keepK/SCENE_K (:2690-2703),
│                                legacy sprig/critter/item/fruit/fx/prop/emote/gumball builders, Sound/Music
├── art-core.js     191 KB       CHARACTER CORE: PX.art face/eye/leaf kit, pal()/EL_PAL recolours, overlay geometry
│                                (geom/eyeBlobs/restGeom/shiftGeom), fusion PARTS (:477) and ITEMS (:1071), element effects
│                                EL_FX (:1490), skins/shiny/ghost/fusionGlow, buildPlant (:1639) / buildZombie (:1700),
│                                PX.sprig cache (:1684-1698), seed packets, shards, cores, PX.item/critter/prop wrappers
│                                (:1881/:1899/:1914), PX.pvzHouse
├── art-plants.js    18 KB       chibi kit + Peashooter, Sunflower, Chomper
├── art-plants2.js … art-plants12.js   629 KB   138 more plants (141 species in total, 3 growth stages each)
├── art-zombies.js   73 KB       PX.ZKIT zombie kit, basic + first zombies, 7 Zombosses (BOSS_ART, 48 × 48)
├── art-zombies2.js … art-zombies5.js  184 KB   remaining zombies (81 in total) + 5 Zombosses
├── art-world.js     74 KB       element sprites/icons, cores, shards, fusion icons, garden props (PVZ_PROP), house, Crazy Dave
├── art-world2.js   100 KB       8 garden maps + props, houses, race scenery
├── art-world3.js    70 KB       4 more garden maps
├── art-aqua.js, art-fish.js, art-fish2.js, art-aquadecor.js, art-aquaworld.js   165 KB   My Aquarium
├── art-trophies.js  18 KB       trophy medals (PX.trophy)
├── art-arcade.js    22 KB       Arcade sprites (PX.arcade.*)
├── art-event.js     23 KB       Halloween costumes, costumed zombies (PX.eventZombie)
├── battle.js                    also holds the projectile/effect sprites ASPR (:2815), shared with Survival and the
│                                Garden as window.__battle.aspr (:3071)
└── icons/                       apple-touch-icon.png (180², 1.2 KB), icon-192.png (1.3 KB), icon-512.png (7.6 KB)
                                 ← the ONLY image files; they are also rendered from code (tools/pvz_icon.js via
                                   tools/render_sheet.js)
tools/  build_pvz.py (build → pvz-garden-app/), check_pvz.js (pre-publish checks), render_sheet.js, plant_sheet.js
        (writes pvz-plant-sheet.html, every plant × 3 stages), pvz_icon.js
```
- **Totals (VERIFIED).** `pixel.js` plus 29 `art-*.js` files hold **1,833,293 bytes of drawing code**.
- **Content:** 141 plants × 3 stages, 81 zombies, 12 Zombosses, 12 elements, 26 fusion items, 6 skins plus 4 Halloween costume skins.

### 3.2 Procedural vs imported (VERIFIED)
**Everything is procedural.** No asset category loads an image file:
| Category | Drawn by | Format at runtime | Original size |
|---|---|---|---|
| Plants (141 × 3 stages) | `PX.PLANT_ART[id](g, stage, P, C)` via `buildPlant` | canvas, 64 × 64, `.k = 2` | 32 × 32 art px |
| Zombies (81) | `PX.ZOMBIE_ART[kind](g, P, L)` via `buildZombie` | canvas, 64 × 64, `.k = 2` | 32 × 32 art px |
| Zombosses (12) | `PX.BOSS_ART` via `PX.critter` | canvas, 96 × 96 | 48 × 48 art px |
| Seed packets, cores, shards, fusion items, fruit | `PX.item(kind, id)` | canvas | 16–32 art px (varies) |
| Garden props, houses, Crazy Dave | `PX.prop(kind, theme)`, `PX.pvzHouse(F)`, `PX.crazyDave(f)` | canvas | varies |
| Garden land, sky, water | painted per scene into `bgC`/`skyC` (`garden.js:466-579`) | 1 canvas px per world px | world size (§2.2) |
| Survival lawn, Battle and Race backgrounds | painted per scene (`survival.js:720-831`, `battle.js:3842`, `race.js:2059`) | canvas | world size |
| Projectiles/effects | `ASPR` (`battle.js:2815`), `PX.fx` | canvas | small |
| Trophies, Arcade, Aquarium, Halloween | `PX.trophy`, `PX.arcade.*`, `PX.aquaSprite`, `PX.eventZombie` | canvas | varies |
| UI icons | painted into `<canvas class="px">` | canvas | 9–32 art px |
| App icons | PNG files in `icons/` (rendered from code by tools) | PNG | 180 / 192 / 512 |

### 3.3 How the game references art (VERIFIED)
Scenes ask by **id and look**, never by file name:
- **`PX.sprig(look, pose)`** (`art-core.js:1689`) draws **every plant and zombie**.
  - A plant look is `{ species, stage, element, skin, shiny, fuse: { with | item } }`; a zombie look is `{ zombie, skin }` (`state.js:559-567`).
  - It dispatches to `PX.PLANT_ART[id]` (which returns head geometry), `PX.PLANT_PAL[id]` and `PX.ZOMBIE_ART[kind]`.
  - Note: there is no `PX.plant` or `PX.zombie` function.
- **`PX.critter(id, frame)`**: Zombosses (`PX.BOSS_ART`) and element sprites (`'el:fire'`).
- **`PX.item(kind, id)`**:
  - Kinds: `egg`/`seed` (seed packet), `element`, `core`, `shard`, `fitem`, `fruit`, `plant`.
  - Seed packets and plant icons draw a mini plant through `PX.buildPlant` directly (`art-core.js:1752-1758`, `:1885/:1891`), **not** through `PX.sprig`.
- **Others:** `PX.prop(kind, theme)`, `PX.pvzHouse(F)`, `PX.crazyDave(f)`, `PX.trophy(id, scale, { dim })`, `PX.arcade.*`, `PX.eventZombie(kind, costume, P)`, `PX.aquaSprite(kind, id, f)`, `PX.emote(id)`, `PX.fx(kind, col)`.
- **Scene caches.** Each scene keeps its own cache of finished canvases by key:
  - Survival `spr()` (`survival.js:82`)
  - Garden `spr()` (`garden.js:195`)
  - Arcade `sprC` (`arcade.js:112`)
  - Battle `A.memo` (`battle.js:3913`)

### 3.4 Can replacement art load without touching gameplay logic? (VERIFIED + RECOMMENDATION)
- **VERIFIED.** Gameplay never reads sprite pixels for plants or zombies. `getImageData` appears only in `pixel.js:1589` (swimming critters) and `race.js:649`.
  - Placement, targeting, bites, projectiles, taps and draw order use **feet points and fixed numbers in world pixels** (§5).
  - So a picture that keeps the **32 × 32 art-px box, the feet anchor (16, 31) and similar head heights** changes nothing in gameplay.
- **VERIFIED.** The art API is **wrappable**: PVZ already wraps its own art functions (`art-core.js:1733`, `art-event.js:113`).
  - A new loader file can wrap `PX.sprig` / `PX.critter` / `PX.item` / `PX.prop` and return picture canvases, with no change to scene code.
- **Care points (§5.4):**
  - overlays positioned from code geometry
  - colour variants
  - scene caches that keep the first (code) canvas
  - the build/offline cache

---

## 4. Character composition and animation

> The brief asked for **Sugarplum** and **Caroler** as examples. Those are Deck the Lawn characters and don't exist in PVZ Garden yet. Their PVZ Garden counterparts are traced instead: **Sunflower**, the sun-making support plant (Sugarplum's role), and the **Basic Zombie** (Caroler's role). When Sugarplum and Caroler join PVZ Garden for the Christmas event, they will follow exactly these paths.

### 4.1 Single images, sheets or parts? (VERIFIED)
- **Neither image files nor sprite sheets nor a skeleton.** No JS file loads an image or contains bone or rig code.
- **One call returns one flat still picture.** `PX.sprig(look, pose)` (`art-core.js:1689-1699`) returns one 32 × 32 art-px canvas (64 × 64 real px, `.k = 2`).
  - It is wrapped by the Halloween costume layer (`art-event.js:111-133`), which loads after all art files.
- **Parts are separate only while drawing.** Body, face, limbs, fusion parts, items, element toppers, skins and costumes are separate drawing steps, all merged into that one picture when it is built. Nothing is layered at draw time.
- **Animation happens in two ways:**
  1. The scene asks for a **different pose each tick**: 2-frame walk cycles, expressions, arm poses. Each new look-plus-pose combination is a new procedurally drawn picture, then cached.
  2. The scene **moves, flips, rotates, scales, fades or flashes** that still picture when drawing it.

### 4.2 The API, poses and anchor (VERIFIED)
- **Look** (`state.js:559-567`):
  - Plant: `{ species, stage 0|1|2, element?, skin?, shiny?, fuse?: { with } | { item } }`.
  - Zombie: `{ zombie, skin? }`.
- **Pose `P`:** `frame` (0/1), `walk`. Values scenes actually request:
  - `eyes`: blink / happy / sad / closed / brave
  - `mouth`: smile / open / o / flat / grin
  - `arms`: up / out / hold / paddle / down
  - Garden and Race also send `P.flap`, but no plant or zombie art reads it.
- **Sizes:** growth stages are about **20 / 24 / 28 art px tall** (`art-core.js:10`).
- **Anchor:** `SPRIG_AX = 16, SPRIG_AY = 31` = bottom of the feet (`pixel.js:966-967`). Art faces **right**; `PX.blit` flips around the anchor.
  - Plants use (16, 31) in every scene.
  - In Battle, plants and zombies both use (16, height − 1).
  - In Garden and Survival, zombies use blit's default (16, 32), one art px lower.
  - Plant base leaves sit on rows ~27-30; zombie feet on rows 29-31.
- **Other entry points:**
  - Halloween raid zombies: `PX.eventZombie(kind, costume, P)` (`art-event.js:202-220`).
  - Zombosses: `PX.critter(id, 0|1)`, 48 × 48, 2 frames (`art-core.js:1899-1911`).
  - Plant icons and seed packets: `PX.buildPlant` at k = 1 (`art-core.js:1752-1758, 1885-1891`).
- **Inventory:** 141 plant drawing functions (`ART.<id>`, 3 stages each) and 81 zombie functions (`ZA.<id>`), matching `PLANTS`/`ZOMBIES` in `data.js` one to one.

### 4.3 How a character is composed (VERIFIED)
**Parts.** Each part is drawn on a scratch grid by `PX.piece`: draw → own ink outline → merge (`pixel.js:191`). One bold sticker edge, `outerLine()`, goes round the whole character at the end (`art-core.js:1676, 1704`).

**Plants**
- Each species function returns its **head geometry**: `PLANT_ART[id](g, stage, P, C) → { hx, hy, hr, top, ey, hat?, front? }`. That is head centre, head radius, top row and eye row, plus an optional hat spot and facing point (`art-core.js:8-15`).
- Shared kit:
  - `softBody` (112), `chibiEyes` (122-155), `chibiMouth` (156-168), `blush` (169-174), `madFace` (176-191) in `art-core.js`
  - `hopOf`, `baseLeaves`, `stem`, `chibiFace` (`art-plants.js:26-33, 58-68, 80`)
  - Eyes and mouths are painted straight onto the plant's grid, not as separate layers.
- **Overlay order in `buildPlant`** (`art-core.js:1639-1680`):
  1. fusion part (`PART`, 37 kinds) or fusion item (`ITEM`, 26 kinds), drawn into back/front/post layers
  2. element topper `EL_FX` (11 elements; a small badge instead if fused), then `elDetails`
  3. `applySkin`, a brightness recolour (gold, crystal, galaxy, ghost, zombie, rainbow)
  4. `applyShiny`, then `outerLine()`, then `ghostFade`, then `fusionGlow`
  - Painting after step 1 avoids the eye boxes (`AVOID`).

**Zombies**
- One shared builder, `zombie(g, P, o)` (`art-zombies.js:139-229`), draws back to front: back arm → legs → shoes → body → shirt and tie → head (shape from `HEADS`, 74-90) → hair → eyes/mouth (`zEyes`/`zMouth`, 109-124) → sticky note → hat step → front arm → extra steps.
- It returns a geometry object (head, eyes, mouth, hands).
- Each zombie kind is a set of options plus extra drawing steps. `ZA.basic = (g, P) => zombie(g, P, {})` (`:250`).

**Fitting overlays to the head**
- `geom()` measures the drawn pixels (`art-core.js:335-357`): eye blobs, the brim line above the eyes, head half-widths, the neck.
- `restGeom` does this once per species and stage on the resting pose. `shiftGeom` moves that fit with the head in other poses, so overlays follow the hop without being measured again (`:1616-1638`).
- `liftCache` (≤ 600 entries) stores how far headgear must lift to clear the eyes, from `headgearOverlap` (`:1596-1669`).
- Halloween plant costumes use only the resting fit (`art-event.js:123-124`).
```js
// art-core.js:1645-1649, 1670-1679 (overlays are placed from the CODE drawing's geometry)
const g = new Grid(32, 32);
const G = PX.PLANT_ART[sp](g, stage, P, C) || { hx: 16, hy: 16, hr: 5, top: 10 };
if (G.top == null) G.top = Math.round(G.hy - G.hr);
const RG = restGeom(sp, stage);
let X = shiftGeom(RG.X0, G.hx - RG.G0.hx, G.hy - RG.G0.hy);
...
const Ly = dress();
AVOID = X.boxes; try { Ly.done(g); } finally { AVOID = null; }
if (L.element && !elLater) elDetails(g, L.element, X, P);
if (L.skin) applySkin(g, L.skin, X, P);
if (L.element && elLater && EL_FX[L.element]) { const L2 = layers(); elFx(L2); L2.done(g); elDetails(g, L.element, X, P); }
if (L.shiny) applyShiny(g, X, P);
g.outerLine(); // the bold sticker edge round the whole plant
if (L.skin === 'ghost') ghostFade(g);
if (fused) fusionGlow(g, (part ? part.glow(F || C) : item.glow()) || '#fff2a0', X, P);
return g;
```

### 4.4 Animation: what is drawn into the picture, what is a scene transform (VERIFIED)

**A. Drawn inside the art** (each pose is a new picture)
- **Plant walk, 2 frames:**
  - On frame 1, `hopOf` lifts the head(s) −1.5 art px (−1 with arms up) (`art-plants.js:26`).
  - Base leaves stay on the ground and stems stretch.
  - Leaf "arms" tilt 0.5 rad (up), 0.06 (out), 0.22 (other).
  - Some species add extras; Sunflower's petals turn +0.1 rad.
- **Zombie shamble, 2 frames** (`art-zombies.js:142, 152, 176-185`):
  - On frame 1 the body bobs −1.
  - Legs stride (`st` 2 → −1) and the front foot lifts 0.8.
  - The arm swings (`sw` 0.6 → −1).
  - Arm poses are lines from shoulder points `FS [18.4, 21.6]` / `BS [12.6, 22.2]` to a hand target per pose.
- **Expressions:** eyes and mouth states are drawn per pose (blink, happy, sad, closed, brave, mad; smile, open, o, flat, grin, frown).
- **Small per-frame motion in overlays:** element toppers shift, skin sparkles and fusion-glow twinkles move, Halloween bat wings flap and capes swing.
- **No skeleton.** Limb positions and head anchors exist only while a picture is being drawn.

**B. Applied by the scenes at draw time** (these keep working with any picture)

| Effect | Garden (`garden.js`) | Survival (`survival.js`) | Battle (`battle.js`) |
|---|---|---|---|
| Flip | plant `facing < 0` 1791; zombie 2566 | plant 898; zombie always 920 | opponent 3924 |
| Idle | 1 px breathe at 1.4 Hz, 1813 | 902 | 1 px bob at 2 Hz (boss 1.3), 3926 |
| Hop | 4 px sine over 0.35 s, 1812 | 901 | 6 px, 3932 |
| Attack | 5 px lunge over 0.3 s; 1.5 px kick-back; 1816, 2375, 2386 | 903, 406, 420 | 12 px lunge 3931; 2 px recoil 3933; dash/jump 3934-3937 |
| Hurt | ±1 px shiver at 40 Hz plus a brightening second pass (`'lighter'`, 0.4; zombies 0.55), 1818-1820, 2583 | 905, 914, 934 | ±2 px shake 3941; white-silhouette flicker 3957 |
| Zombie lean | +1.5 px bite, −2.2 px knockback, 2578 | 931 | dash + code-drawn jaws on the target, 2946-2950 |
| Zombie death | tips back k²·1.45 rad about the feet, then fades (0.28 s tip, 0.35–0.75 s fade), 2572-2576 | 925-929 | faint: fades and sinks 7 px (boss 14), 3944 |
| Plant knocked out | `zz` emote, dizzy stars, walks home (2448, 2608, 2463) | wobbles ±0.12 rad about the feet, fades over the last 25% of 0.9 s, 908-911 | fade + sink |
| Extras | pop-in scale 1794; water clip 1806-1808; pot lift +6 2144; zombie rises from the ground, 0.9 s clip 2581; fly-away spin 2567-2569 | mower launch spin 921-923; icy tint + half frame rate when slowed 917-919; placement ghost at 0.45 899 | entry slide 3929; win bounce 3939; dodge 3940; boss charging aura 3952-3955 |
| Emote bubble | 13 × 13 `PX.emote` above the head, 2694 | 1007 | 3960 |

Race adds a bob per terrain segment, Giant mode (× 2), and star/ghost silhouettes (`race.js:2723-2806`).

**C. Speeds and timings** (frames are chosen from time `t`, in seconds)
- **Garden plants:**
  - walk `floor(t·7) % 2` (`garden.js:1781`)
  - paddling/swimming t·5, waiting t·3 (`:1787`)
  - falling t·12; eating mouth t·8
  - blink 0.14 s every 2–5 s (`:1065`)
- **Garden raid zombies:** `floor(t·3 + phase) % 2` (`:2561`); bite mouth open 0.35 s.
- **Survival:** plants always frame 0, blinking; zombies t·3, or t·1.5 when slowed (`survival.js:889-896, 917`).
- **Battle:**
  - Nobody walks; win pose t·4 (`battle.js:3904`).
  - Blink 0.13 s every 2.5–5.5 s.
  - Effect timers: lunge 2.2 s⁻¹, hop 3, shake/flash 1, dodge 2.2, entry 1.6, faint 1.1; a dash lasts 0.62 s.
- **Race:** frames follow distance (run `floor(x/5) % 2`).
- **Almanac:** a frame every 0.55 s; blink 0.14 s every 3.6 s (`sprouts.js:486-488`).
- **Movement speeds (art px/s):** Garden plant walk 10 (+0.2 per run level, `garden.js:36`); raid zombies 6.5 (`:2178`); Survival zombies 5.6 (`survival.js:54`).

**D. Pivots and positions** (all in art px, relative to the feet)
- **Draw point:** the feet anchor, rounded to whole art px (`pixel.js:2696`).
- **Rotations:** tip-over and knock-out wobble pivot on the feet; fly-away spins about the centre; pop-in scales about the feet.
- **Hard-coded body measurements in scenes:**
  - head heights `HEAD = [20, 25, 29]`
  - shot start (x ± 7, y − 14)
  - hit point y − 12 (boss − 22)
  - zombie health bar y − 33
  - Battle `spot()`, fighter height 24, `topOf = 0.62·h`, mouth (± 10, − 15)

### 4.5 Example 1: Sunflower, from data to screen (VERIFIED)
1. **Data:** `data.js:690`. `PL(['Sunflower','Twin Sunflower','Sunflower Queen'], 'plant', 'support', ['sunnyday','twinsun','royalbeam'], 'petals', …)`. It's a starter plant (`:844`). Palette `PAL.sunflower` (`art-plants.js:133`).
2. **Look:** `state.js:559-567` → `{ species: 'sunflower', stage }`.
3. **Art:** `PX.sprig` → Halloween wrapper (passes through, `art-event.js:116`) → cache (`art-core.js:1691`) → `buildPlant` (`:1639`) → `ART.sunflower` (`art-plants.js:148-169`).
   - Stage 0: one head at (15.5, 18.2), radius 6.
   - Stage 1: two heads.
   - Stage 2: three heads plus a tiara (which also tells hats where to sit).
   - Each head (`sunHead`, `:135-147`) draws 10-12 petals, a face disc, chibi eyes (`#4a2c22`), a mouth and blush.
4. **Garden:** `drawSprout` (`garden.js:1790-1823`) with `pose(r)` (`:1776-1789`):
   - Poses: idle `{ frame: 0, mouth: 'smile' }`, blink, walk frames 0/1 (hop + petal turn), held, fall, eat, paddle, cheer `{ arms: 'up', eyes: 'happy', mouth: 'open' }`.
   - Transforms: the Garden column of §4.4 B.
5. **Survival:** `drawUnit` (`survival.js:897-915`) with `pose(u)` (`:889-896`): always frame 0, blink, cheer after a heal, `mouth: 'o'` when hit, `{ closed, o }` when knocked out.
6. **Battle:** the look is fixed at battle start (`battle.js:141`); poses come from `poseFor`/`sprigFor` (`:3901-3917`, memo keyed `eyes|mouth|arms|frame`).
   - `sunnyday`/`twinsun` are support moves: hop + `{ arms: 'up', mouth: 'grin' }` for 0.5 s, with rising suns.
   - `royalbeam` is a beam: attack pose `{ arms: 'out', mouth: 'open', eyes: 'brave' }`.
```js
// art-plants.js:26, 148-158 (Sunflower; walk = hop on frame 1, petals turn)
const hopOf = P => (P.walk && P.frame ? -1.5 : P.arms === 'up' ? -1 : 0);
ART.sunflower = function (g, stage, P, C) {
  const hop = hopOf(P);
  baseLeaves(g, 15.7, C.leaf, P);
  // [x, y, face radius]; the last head is the main one
  const heads = T(stage,
    [[15.5, 18.2 + hop, 6]],
    [[9.9, 14.4 + hop * 0.8, 5.3], [21.5, 17.6 + hop, 5.6]],
    [[6.6, 20.2 + hop * 0.6, 3.8], [25.4, 20.6 + hop * 0.6, 3.8], [15.8, 13.4 + hop, 5.8]]);
  for (const [x, y] of heads) pc(g, t => stroke(t, [[15.7, 28.4], [15.7 + (x - 15.7) * 0.35, 25.2], [x, y + 3]], 0.85, 0.85, C.stem));
  let M = null;
  heads.forEach(([x, y, r], i) => { M = sunHead(g, x, y, r, C, P, (P.frame ? 0.1 : 0) + i * 0.13); M.x = x; M.y = y; M.r = r; });
```
```js
// garden.js:1781-1791, 1812-1820 (Garden: pose per tick, then transforms)
if (r.state === 'walk' || r.state === 'enter') { S.walk = true; S.frame = Math.floor(t * 7) % 2; }
if (r.cheerT > 0) { S.arms = 'up'; S.eyes = 'happy'; S.mouth = 'open'; }
...
const look = lookFor(r), c = PX.sprig(look, pose(r)), flip = r.facing < 0;
const hopY = r.hopT > 0 ? Math.round(Math.sin((1 - r.hopT / 0.35) * Math.PI) * 4) : 0;
const breathe = !hopY && (r.state === 'idle' || r.state === 'pet') && Math.floor(t * 1.4 + r.ph) % 2 ? 1 : 0;
const lx = (r.lungeT > 0 ? r.facing * 5 * Math.sin(Math.PI * (1 - r.lungeT / 0.3)) : 0) - (r.kickT > 0 ? r.facing * 1.5 : 0);
const shake = r.hitT > 0 ? (Math.floor(r.hitT * 40) % 2 ? 1 : -1) : 0;
put(r.x + Math.round(lx) + shake, r.y - hopY - breathe - lift);
if (r.hitT > 0) { bx.save(); bx.globalAlpha = 0.4; bx.globalCompositeOperation = 'lighter'; put(r.x + Math.round(lx) + shake, r.y - hopY - breathe - lift); bx.restore(); }
```

### 4.6 Example 2: Basic Zombie, from data to screen (VERIFIED)
1. **Data:** `data.js:1035` → `Z('Zombie', ['normal'], ['zbite','zgroan','zshamble'], { stamina: 1.4 }, …)`. It appears in spawn pools and as a league opponent `ZO('basic', 3)` (`:1129`).
2. **Look:** `ST.makeZombie` (`state.js:1195-1201`) → `{ zombie: 'basic' }`.
3. **Art:** `buildZombie` (`art-core.js:1700-1706`) → `ZA.basic` → `zombie(g, P, {})`.
   - It draws: peanut-shaped head, coat, shirt and tie, sticky note, hair, white googly eyes, and the default wobbly one-tooth mouth.
   - It is also the fallback for unknown zombie kinds.
4. **Garden raid:** created by `makeZ` (`garden.js:2255-2265`, rising from the ground, facing left); drawn by `drawZombieRaid` (`:2560-2585`).
   - The scene caches the picture under `'zr:' + kind + ':' + frame + ':' + biting` (`:2565`).
   - It requests `{ walk: true, frame: f, mouth: biting ? 'open' : undefined }`.
5. **Survival:** `makeZ` (`survival.js:317-327`) → `zSpr` (`:91`) → `drawZombie` (`:916-935`).
   - Frames t·3 (t·1.5 when slowed); always flipped; icy tint when slowed.
6. **Battle:** built via `makeNPC` (`state.js:1211-1213`) / `makeFighter` (`battle.js:137-145`); standing poses only; flipped as the opponent.
   - `zbite` is a chomp: a 0.62 s dash plus code-drawn jaws on the target (`battle.js:2946-2950`).
```js
// art-zombies.js:142, 152-161, 176, 250 (2-frame shamble and arm poses, all procedural)
const walk = !!P.walk, f = walk && P.frame ? 1 : 0, bob = walk && f ? -1 : 0;
const sw = walk ? (f ? -1 : 0.6) : 0; // the arm swings with the walk
const FS = [18.4, 21.6], BS = [12.6, 22.2];
switch (A0) {
  case 'up': fa = [FS, [24.4, 15.8]]; ba = [BS, [8, 16]]; break;
  case 'out': fa = [FS, [24.6, 24.8]]; ba = [BS, [7.2, 25]]; break;
  ...
  default: fa = [FS, [25, 21.2 + sw]]; ba = [BS, [10.2 - sw * 0.3, 25.2]]; backHand = false;
}
const st = walk ? (f ? -1 : 2) : 0, lift = walk && f ? 0.8 : 0;
ZA.basic = (g, P) => zombie(g, P, {});
```
```js
// garden.js:2561-2583 (raid zombie: frame, cached picture, tip-over death, bite lean, hit flash)
const f = Math.floor(t * 3 + z.ph) % 2;
... c = spr('zr:' + z.kind + ':' + f + ':' + (z.chomp > 0 ? 1 : 0), () => PX.sprig({ zombie: z.kind }, { walk: true, frame: f, mouth: z.chomp > 0 ? 'open' : undefined }), () => blob(14, 24, PX.RAMPS.moss));
const h = PX.artH(c), flip = z.facing < 0; // zombie art faces right
if (z.dead) { // tips over backwards, then fades away in a puff
  const k = clamp(z.dead / 0.28, 0, 1), fa = clamp(1 - (z.dead - 0.35) / 0.4, 0, 1); if (fa <= 0) return;
  bx.save(); bx.globalAlpha = fa; bx.translate(Math.round(z.x), Math.round(z.y)); bx.rotate(k * k * 1.45 * (z.facing < 0 ? 1 : -1));
  if (flip) bx.scale(-1, 1); bx.drawImage(c, -PX.artW(c) / 2, -h, PX.artW(c), h); bx.restore(); return;
}
const lean = (z.kb > 0 ? 2.2 * (z.kb / 0.2) : 0) * (z.facing < 0 ? 1 : -1) + (z.chomp > 0 ? 1.5 * z.facing : 0);
...
PX.blit(bx, c, z.x + lean, y, flip);
if (z.hitT > 0) { bx.globalAlpha = 0.55 * alpha; bx.globalCompositeOperation = 'lighter'; PX.blit(bx, c, z.x + lean, y, flip); }
```

### 4.7 Can the animation logic stay while the illustrations change? (VERIFIED + RECOMMENDATION)
- **VERIFIED: the swap point is narrow.** Scenes get characters only through `PX.sprig`, plus `PX.eventZombie`, `PX.critter` and `PX.item`.
  - The only art detail a scene reads directly is `PX.PLANT_PAL[species].main`, the colour of Battle's chomp jaws (`battle.js:2881`).
  - So a different picture returned from `PX.sprig` shows up everywhere.
- **Survives a plain picture swap, unchanged:** everything in §4.4 B. That covers flips, hops, breathing, lunges, recoil, shivers, the brighten and white-silhouette flashes, pop-in, knock-out wobble, tip-over death, fly-away, rising and water clips, icy tint, battle dash/jump/dodge/faint/aura, race silhouettes, emotes, shadows and health bars.
- **Needs extra frames (or part images):**
  - the second walk/shamble frame
  - blink and each expression
  - arm/leaf poses
  - the 3 plant stages
  - the open biting mouth
  - every look variant now merged into the picture: 11 elements, 37 fusion parts, 26 fusion items, 6 skins, shiny, Halloween costumes
- **Pose sets the code already uses** (a good minimum to draw):
  - Arcade `POSES`: idle, blink, happy, sad, walk0, walk1 (`arcade.js:119`).
  - Title menu: plant frame 0/1, blink, mouth open; zombie walk0/walk1, mouth open (`menu.js:319, 325`).
  - Battle adds attack, hit, faint and win.
- **RECOMMENDATION.** Per plant stage, draw **idle, blink, walk-A, walk-B, cheer (arms up, happy, open mouth), attack, hurt and sleepy/knocked-out**. Per zombie, draw **walk-A, walk-B, bite (mouth open), hurt and idle**.
  - Map every other requested pose to the nearest of these in the loader (e.g. `eyes: 'sad'` → hurt).
  - Scenes keep requesting poses exactly as today, and the transforms do the rest.


---

## 5. Character positioning and gameplay compatibility

### 5.1 Survival (PvZ-style lane defense, `survival.js`) (VERIFIED)
- **Grid:** **5 rows** (`SV.rows`, `survival.js:32`). **8 columns**, or **7** when that lets a phone show everything bigger (`:70`, `:1110`).
- **Cells:** `cellW = clamp(⌊(ww − 30) / COLS⌋, 20, 28)` and lane height `laneH = clamp(⌊(bot − top) / 5⌋, 20, 30)` world px (`:690-701`). iPad: 21 px cells = 94.5 CSS px; iPhone: 23 px = 46 CSS px (*computed*, §2.2).
- **Placement:** fixed spots. `colX(c) = gx0 + (c + 0.5)·cellW` (cell centre); `laneY(r) = gy0 + (r + 1)·laneH − 3` (feet line) (`:73-74`). Plants are drawn anchored at (16, 31) (`:913`).
- **Sprite vs cell:** the 32 × 32 sprite box is **larger than a cell** (20–28) and a lane (20–30). Overlap is handled by depth sorting.
- **Zombie movement:**
  - Spawns at `L.zx + 6..14` (boss +10), y = lane ± 1.4 (`:325`).
  - Speed `5.6 × clamp(0.8 + (spd − 20)/140, 0.7, 1.5)` art px/s; boss × 0.55; halved when chilled (`:323`, `:464`).
  - Stops to bite when a plant in its lane is within `gap + 1` (gap 13, boss 20) (`:452-454`).
  - The mower triggers at `x ≤ gx0 − 2`; the house is reached at `x ≤ hx` (`:467-468`).
- **Hit detection:** **no pixel or bounding-box collision.**
  - Targeting is by lane and x-distance in `cellW` units (`canHit`, `:355-363`).
  - Projectiles home in and hit on arrival (`:423-433`).
  - Bomb splash: ±1 lane and < 1.6·cellW (`:406`).
- **Projectile origin:** `(u.x + 7·face, u.y − 14)` (`:414`); aim point y − 12 (boss − 22) (`:426`); lob arc height 24.
- **Taps:**
  - `unitAt`: |dx| < 0.55·cellW and y between `u.y − 28` and `u.y + 4` (`:1241`).
  - `zombieAt`: radius 13 (boss 24) around y − 12 (boss y − 22) (`:1246`).
  - `cellAt`: grid maths (`:1251`).
- **Fixed offsets tied to art size:**
  - `HEAD = [20, 25, 29]` plant height per stage (`:60`)
  - zombie health bar at `z.y − 33` (boss − 52); target arrow − 37 (boss − 56)
  - shadows: plant 13 wide, zombie 11, boss 26
- **Z-order:** background → props → fence → house → mowers → plants and zombies **sorted by feet y** (zombies + 0.1, so they stand in front of a plant on the same line; ties by x) → night tint → projectiles → bars → particles. Numbers are drawn crisp on the screen canvas (`:974-1027`):
```js
// survival.js:992-996
const list = [];
for (const u of M.units) list.push({ y: u.y, x: u.x, fn: () => drawUnit(u) });
for (const z of M.zs) list.push({ y: z.y + 0.1, x: z.x, fn: () => drawZombie(z) });
list.sort((a, b) => a.y - b.y || a.x - b.x).forEach(o => o.fn());
```

### 5.2 Garden (`garden.js`) (VERIFIED)
- **World size:** about **280 × 250 world px** fit the screen at minimum zoom; the yard is **2.05 × 1.7** that size (`TUNE`, `:41`).
- **Plants** walk freely. `(r.x, r.y)` is the **feet point**, drawn with anchor (16, 31) (`:1790-1822`).
  - Potted plants are lifted by `POT_LIFT = 6` (`:2144`).
  - Swimming plants are clipped at the waterline r.y − 6 (`:1807`).
  - Held and falling plants are drawn on top of everything.
- **Taps:**
  - `sproutAt`: distance from `(r.x, r.y − 10)` < `hitR(12)`, where `hitR(r) = max(r, 11/Z)` (`:207`, `:2748-2753`).
  - Raid `zombieAt`: `hitR(12)` (boss `hitR(22)`) (`:2543`).
  - Props are hit-tested from the prop canvas's `artW`/`artH` (`:209-219`). **This is the one place where image size affects gameplay.** Keep prop pictures inside the code prop's box.
- **Zombie raids** (free 2-D movement, y weighted × 1.4: `:2287`, `:2350`):
  - Ranges `RANGE`: shooter 74, lobber 84, zap 58, spore 48, support 60, melee 14, wall 15, bomb 16 (`:2179`).
  - Zombies stand at gap 11 (boss 17) and bite at distance < 14 (boss < 21) (`:2428-2432`).
  - Projectile origin `(r.x + 7·facing, r.y − POT_LIFT − 14)` (`:2373`).
- **Z-order:** a single list **sorted by feet y** (`:2661-2674`). Pots − 0.5, graves − 0.6, zombies + 0.1. After that: the raid layer, flying critters, held plants, night tint, emotes.
- **Shadows:** plant 13 (held 9, falling 11), zombie 11, boss 26.

### 5.3 Battle (`battle.js`) (VERIFIED)
- **World and scale:** `WW × WH`, with `SC = max(2, round(PXS·dpr/2)·2)` device px per world px (`:1899-1905`).
- **Fighters:** drawn at 1:1 (32 × 32) with anchor `(16, artH − 1)` (`:3924`). Zombosses are enlarged × 2 with nearest-neighbour when WW ≥ 140 and WH ≥ 170 (`:1910`, `:3886`).
- **Positions:** `spot(side)` gives the feet. `topOf` = feet − 0.62·fighterH (fighterH: plant 24, boss 44·scale). `mouthOf` = feet + (±10, −15) is the projectile origin.
- **Move animations:** the `ANIM` table (`:2752-2807`) chooses only style, sprite, count and arc; positions come from `spot`/`topOf`/`mouthOf`.
  - Dash attacks go to feet.x ∓ 15 (boss 26); jumps ∓ 8 (boss 20); lunge reach 12 (boss 20) (`:2910-2985`, `:3930`).
- **Z-order:** opponent first, then player; swapped while the opponent dashes (`:4012`). Shadow is a 9-px half-width bar at the feet (`:3947`).
```js
// battle.js:1909-1917, 2878
const HY = () => Math.round(WH * 0.38);
const bossScale = () => (WW >= 140 && WH >= 170 ? 2 : 1); // Zomboss art is 48x48
function spot(side) {
  if (side === 'o' && V && V.boss) return { x: Math.round(WW * 0.66), y: Math.round(clamp(WH * 0.62, HY() + 34, WH - 58)) };
  return side === 'o' ? { x: Math.round(WW * 0.71), y: Math.round(clamp(WH * 0.53, HY() + 16, WH - 50)) } : { x: Math.round(WW * 0.29), y: Math.round(WH - Math.max(10, WH * 0.1)) };
}
const fighterH = side => (side === 'o' && V && V.boss ? Math.round(44 * bossScale()) : side === 'o' && V && V.wild ? Math.round(15 * critScale()) : 24);
const topOf = side => { const s = spot(side); return { x: s.x, y: s.y - Math.round(fighterH(side) * 0.62) }; };
...
const mouthOf = side => (side === 'o' && (V.boss || V.wild) ? topOf('o') : { x: spot(side).x + (side === 'p' ? 10 : -10), y: spot(side).y - 15 });
```

### 5.4 What would break, or needs care, with higher-resolution artwork (VERIFIED dependencies)
| Dependency | Where | Effect, and what to do |
|---|---|---|
| **2× world buffer, smoothing off** | `pixel.js:2703`; Survival `:701/:974/:1017`; Garden `:841/:2653/:2708`; Battle `:1905/:4001/:4036`; `menu.js:436`; Race `:2058` | **The big one.** A large picture is shrunk to 2 px per art px with nearest-neighbour sampling, then enlarged nearest-neighbour, so it looks jagged and loses detail. See §7.3 for the fix options. The Arcade is the exception: it already draws at device pixels (`arcade.js:1983`). |
| **Art box + feet anchor** | `SPRIG_AX/AY = 16, 31` (`pixel.js:967`); zombies bottom-centre; battle `ay = artH − 1` | Pictures must stand in the same 32 × 32 box (bosses 48 × 48), facing right, with feet on the bottom rows. |
| **Hard-coded heights and offsets** | `HEAD` (Survival `:60`, Garden `:1017`); bars − 33/− 52; arrows; damage numbers − 28/− 44; muzzle (+7, −14); battle mouth (±10, −15), `topOf` | Keep the silhouette heights (stage 0/1/2 ≈ 20/24/28 art px, `art-core.js:10`), or update these numbers. |
| **The `.k` resolution tag** | Set in `Grid.canvas()` (`pixel.js:159`); used by `keepK` and by code that sizes bitmaps from k: Race `spriteBox` `:1197`, `drawPartner` `:2021`; Battle `critterBox` `:1352`, `auraOf` (3·k) `:3895`; arcade plush `:339` | A picture canvas must carry a correct whole-number `.k` (canvas width ÷ 32). Memory grows with k². |
| **UI canvases** | `fitCanvas`/`paint` copy the bitmap size (`app.js:67-84`); `crispScale` = max(1, ⌊want·dpr/h⌋) (`:788`) | Big bitmaps show oversized in the celebration/evolution screens (`:820-824`, `:1044`). Up to 40 Survival tray cards (`:42`) each hold full bitmaps; the code comments say this already froze iPads. |
| **Caches** | `PX.sprig` 900 entries (`art-core.js:1696`). Scene caches unbounded, never cleared: Survival `:82`, Garden `:195`, Arcade `:112`, Battle `bigCache :3885` | Bound them, and **clear them when a picture finishes loading**. Otherwise the code art cached first stays on screen all session. |
| **Overlays placed from code geometry** | `geom`/`eyeBlobs`/`span` (`art-core.js:249-357`), `restGeom`/`shiftGeom` (`:1617-1638`), `headgearOverlap` + `liftCache` (`:1596-1667`), `dressGeom` (`:1610`, used by `art-event.js:64/123`) | Fusion parts, items, element toppers, Halloween costumes and fusion glow are positioned from the **code drawing's** head geometry (head centre `hx, hy`, radius `hr`, `top`, eye line `ey`), read from the grid's own colours. A picture must match those numbers per stage, or the overlays float. |
| **Colour variants** | `pal()` element/fusion recolour (`:231-243`), `applySkin` (`:1536`), `ghostFade`, `applyShiny`, zombie skins (`:1703`), Halloween skins (`art-event.js:115-130`), seed-packet palettes | None of these work on a picture. Options: per-variant pictures, a pixel-level remap, or keep code art for variant looks. |
| **Outline** | `outline`/`outerLine` (`pixel.js:131/:143`) | Pictures need their own ink edge (Solunar's `blendPass` adds one in code). |
| **Composite effects** | Hit flash `'lighter'` (Survival `:914/:934`, Garden `:1820/:2583`); `whiteOf` `'source-in'` / `auraOf` (Battle `:3878-3900`); `icy` `'source-atop'`; arcade tints `:125-143`; race silhouette; evolve glow `app.js:1050` | **Work on any transparent picture.** Soft, half-transparent edges will show as a tinted fringe (INFERRED). |
| **Mirroring** | `blit` flips around the anchor; Survival zombies always flipped (`:920`); Garden by `facing`; Battle opponent flipped | Lettering or one-sided details in a picture will mirror (INFERRED). Avoid text on characters. |
| **Code paths that skip `PX.sprig`** | Seed packets and `PX.item('plant')` via `miniPlant` → `PX.buildPlant` (`:1752-1758`, `:1885/:1891`); Halloween plants (`art-event.js:123`); `eventZombie` (`:197/:209`) | A `PX.sprig` wrapper alone won't reach these. |
| **Arcade armour swap** | Armoured zombies switch to the **basic** look when their armour breaks (`arcade.js:316/651/1196`) | If only some zombies get pictures, styles could mix mid-fight (INFERRED). |
| **Build + checker** | `build_pvz.py` copies only top-level `.js`/`.css` + `icons/` (`:39-41`, `:139-146`); version hash ignores images (`:58-71`); offline list (`:202`). `check_pvz.js` loads all `art-*.js` in Node with no `Image` (`:16`, `:28-42`) and requires `index.html` to load every script (`:24`) | An `img/` folder wouldn't ship, wouldn't be cached offline, and wouldn't trigger an update. A loader must skip itself in Node. |

---

## 6. Current sprite-replacement process

### 6.1 Today (VERIFIED)
**There is no replacement process.** The only way to change a character today is to edit its drawing function:
- **Sunflower:** `ART.sunflower = function (g, stage, P, C)` (`art-plants.js:148-169`), palette `PAL.sunflower` (`:133`), heads by `sunHead()` (`:135-146`).
  - Stage 0 = one head (radius 6, at 15.5, 18.2). Stage 1 "Twin Sunflower" = two heads. Stage 2 "Sunflower Queen" = three flowers + a tiara that also tells hats where to sit.
  - Poses: a hop of −1.5 on a walk step; petals rotate on frame 1; eyes and mouth follow `P.eyes`/`P.mouth`.
- **Basic Zombie:** `ZA.basic = (g, P) => zombie(g, P, {})` (`art-zombies.js:250`), with `zombie()` at `art-zombies.js:139-230`.
  - Head centre ≈ (16.6, 11.4). Two-frame shamble (leg stride, body bob, arm swing). Arm poses `up/out/paddle/hold/point`. Eyes and mouth states.
  - It is also the **fallback** for unknown zombie kinds (`art-core.js:1701`).

### 6.2 The proven pattern from the sister game (VERIFIED, `pocket-sprout/art-images.js`)
Solunar Sprouts runs on the same engine and already shows family-made PNG illustrations in place of code art:
- **Node guard** (`:18`): skips itself when `Image` doesn't exist, so the Node checker still runs.
- **Loading** (`:23-34`): one `new Image()` per id in a `LIST`, from `img/<kind>/<id>.png`. On load, that id's cached canvases are dropped so the picture appears.
- **Fitting** (`fitted()`, `:50-63`):
  - The output canvas has the **code canvas's size × S** and keeps its `.k`.
  - The picture is scaled to fit the code art's **visible box** (alpha > 40), centred horizontally, feet on the same bottom row (or centred vertically for items).
  - Drawn with **high-quality smoothing**; optional `squash`, `tint` and `dy` fake simple poses.
- **Cache:** at most 600 fitted canvases.
- **Fallback:** returns the code art until the picture has loaded, and on any error.
- **Build:** `tools/build_web.py` copies `img/**.png|.webp`, adds each to the offline-cache list and the version hash, and stops on bad names (iCloud duplicates, uppercase).
- **Image pipeline pages:** `_ai-templates.html` makes template grids for the image app; `_slice.html` cuts the returned sheets into individual sprites.
```js
// pocket-sprout/art-images.js:30-34, 50-55 (load, then fit into the code art's box)
for (const [kind, ids] of Object.entries(LIST)) for (const id of ids) {
  const im = new window.Image(), key = kind + '/' + id;
  im.onload = () => { IMG[key] = im; drop(key + '|'); if (kind === 'hats') drop('sprig|'); };
  im.src = 'img/' + key + '.png';
}
...
function fitted(base, im, S, opt) {
  S = S || 1; opt = opt || {};
  const c = document.createElement('canvas'); c.width = base.width * S; c.height = base.height * S; if (base.k) c.k = base.k;
  const x = c.getContext('2d'), b = visibleBox(base), bw = (b.x1 - b.x0 + 1) * S, bh = (b.y1 - b.y0 + 1) * S;
  const grow = opt.grow || 1, s = Math.min(bw * grow / im.naturalWidth, bh * grow / im.naturalHeight), w = Math.max(1, Math.round(im.naturalWidth * s)), h = Math.max(1, Math.round(im.naturalHeight * s));
  const cx = (b.x0 + b.x1 + 1) / 2 * S, X = Math.round(cx - w / 2 + (opt.dx || 0) * S), Y = opt.middle ? Math.round((b.y0 + b.y1 + 1) / 2 * S - h / 2) : (b.y1 + 1) * S - h + Math.round((opt.dy || 0) * S);
```
- **Does PVZ's API have the same shape? Mostly yes (VERIFIED).**
  - Same as Solunar: `artW/artH/blit/keepK/SCENE_K`, `Grid.K = 2`, and the same signatures for `PX.critter(kind, frame)`, `PX.item(kind, id)`, `PX.prop(kind, theme)`, `PX.trophy(id, scale, o)` and `PX.sprig(L, P)`.
  - Differences:
    - PVZ's characters are `PX.sprig` looks with poses, not critters, so the wrapper must handle look + pose.
    - `PX.critter` covers only element sprites and Zombosses.
    - `PX.trophy` returns canvases without `.k`.
    - Data ids come from `PSDATA.PLANTS/ZOMBIES`, which load after the art files.

### 6.3 Exact steps to replace Sunflower and the Basic Zombie (RECOMMENDATION built on the verified code)
1. **Pick the resolution strategy first** (§7.3). Without it, any picture looks no sharper than 64 × 64.
2. **Make reference sheets.** Render the code art per stage and pose (`tools/render_sheet.js`; `pvz-plant-sheet.html` already shows every plant × 3 stages).
   - Brief for the artist: **32 × 32 art box, feet at (16, 31), facing right, transparent background**, head where the code's head geometry is.
3. **Files** (lowercase names):
   - `pvz-garden/img/plants/sunflower-0.png`, `-1.png`, `-2.png` (one per stage)
   - `pvz-garden/img/zombies/basic.png` (plus walk/attack frames)
4. **Loader:** a new `pvz-garden/art-images.js`, added to `index.html` **after `data.js` (`:97`) and before `state.js`**. That is after `art-event.js`'s own `PX.sprig` wrapper, the same place Solunar loads its loader.
   - Wrap `PX.sprig`. For **plain looks** (no element, skin, fusion or shiny), return the picture fitted into the code art's box, with `.k` set.
   - Every other look keeps code art (or gets its own variant picture later).
   - Optionally wrap `PX.item('egg' | 'seed' | 'plant')` so seed packets show the new art too.
5. **Cache invalidation.** When a picture finishes loading, clear the scene caches that hold the old canvas:
   - Survival `zSpr` (`:91`), Garden `'zr:'` (`:2565`), Arcade `zSpr`/`pSpr` (`:118-120`), Battle `A.memo`.
   - Or wait for the pictures before the game starts. Solunar uses a `picLate`/`checkPics` hook (`pocket-sprout/garden.js:217-245`).
6. **Build:** port Solunar's `image_files()` (`build_web.py:54`), `check_names()` (`:79`), image hashing (`:118`) and copy + offline-list lines (`:148-151`) into `tools/build_pvz.py`. Teach `tools/check_pvz.js` to check that every listed image exists.
7. **Test** Survival at iPad and iPhone sizes, a garden raid, a battle, the Almanac, the Shop and the Arcade.

### 6.4 Which format fits best (RECOMMENDATION, reasons from the code)
| Format | Fit with this code |
|---|---|
| **One PNG per pose/frame** | Simplest loader. But the pose space multiplies (eyes × mouth × arms × frame × walk) across 3 stages × 141 plants; the checker alone tests 10 poses (`check_pvz.js:178`). Element, skin and fusion looks can't be pre-drawn. |
| **Layered body-part PNGs** | Mirrors how the code builds poses today: separate arms (`FS`/`BS`), leg stride, `zEyes`/`zMouth`, `chibiEyes`/`chibiMouth`. Keeps a stable head anchor, so fusion parts, items and element toppers still land. Needs a small code rig, and the artist must deliver matching parts. |
| **Sprite sheet (grid)** | Same content as per-pose PNGs in fewer files. Fewer files matters, because the offline cache install fails as a whole if one file is missing. |
| **Texture atlas (packed sheet + JSON)** | A superset of a sprite sheet: per-frame **feet pivots** map onto `SPRIG_AX/AY`, and trimmed frames are restored to the 32 × 32 box. |

**Recommendation:**
- **Deliver one atlas (sheet + JSON frame map) per character.** Each frame records its size, its trim and its **feet pivot**.
- **Start with whole-pose frames.** Use a small set: idle, blink, walk A/B, attack, hurt (plus dying if wanted), each stage for plants. That is the fastest way to PvZ-quality looks, and it matches what ChatGPT's image tools produce reliably.
- **Keep today's scene transforms** for motion (bob, lunge, tip-over, flash, knockback). They work on any picture (§4).
- **Optionally move to layered parts** (separate eyes/mouth/arms) later for the most-seen characters, if live blinking and talking mouths matter.
- **Variant looks** (elements, skins, fusion, shiny): at first keep the code-drawn overlays on top of the picture, positioned from per-stage head numbers in the JSON, or fall back to code art. Decide per variant.


---

## 7. Performance and image quality

### 7.1 How sprites are made, cached and drawn today (VERIFIED)
**Building sprites**
- Sprites are **built in code on first use**.
- A cache miss paints up to 4,096 `fillRect` calls for one 64 × 64 sprite.
- The code records a ≥ 1 s iPad stall when 200+ sprites were built at once (`app.js:257-259`). The fix was `lazyDraws`, which builds at most 6 ms of sprites per frame (`app.js:260-277`). The Almanac draws tiles as they scroll into view (`sprouts.js:595`).

**Caches**
- **No atlases and no texture management.** Every sprite is its own `<canvas>`.
- **Character cache (`PX.sprig`):**
  - A `Map` keyed by `JSON.stringify(look) + '|' + JSON.stringify(pose)`, capped at **900** entries.
  - It drops the **oldest inserted** entry (a lookup doesn't refresh it), so it is first-in-first-out, not least-recently-used (`art-core.js:1684-1698`).
  - 64 × 64 × 4 B = 16 KiB each, about **14 MiB** at the cap.
- **Other caches:**
  - The legacy builder: 600 entries (`pixel.js:955-963`).
  - `restCache` (no cap) and `liftCache` (600) (`art-core.js:1616-1667`).
- **Unbounded caches** (never cleared):
  - `pixel.js:1023-2048` (emote/critter/item/prop) and `art-core.js:1880-1929`
  - Garden `sprCache`, `cloudCache` (`garden.js:193-200, 1896`)
  - Survival `sprCache` (`:80-92`)
  - Battle `bigCache`, `auraCache`, `tintCache` and a per-fighter memo (`:3877-3917`). A battle 2× Zomboss is 144 KiB.
- **No scene frees its canvases when hidden.** Rough screen-buffer memory on an iPad:
  - Garden ≈ **24 MiB** (buffer 7.2 + sky 1.8 + land 1.8 + screen 12.9)
  - Battle ≈ 11.5 MiB
  - Survival ≈ 15.5 MiB

**Drawing**
- Sprites are drawn with 5-argument `drawImage` at art size (`PX.blit`, `fxAt`, `img`: `garden.js:2649`, `battle.js:3876`, `survival.js:879`).
- Each frame makes **one scaled copy** of the world buffer to the screen.

### 7.2 Per-frame costs worth knowing (VERIFIED)
- **The Garden redraws the whole map every frame**, not just what the camera sees:
  - sky/land layers, then every tree, prop, pot, egg, plant, critter and fruit, **sorted by y with no view culling** (`garden.js:2661-2674`)
  - full-map night/Halloween tints (`:2681-2689`)
  - then a scaled copy of the whole buffer: at iPad start zoom the destination is 5384 × 5632 device px, clipped to the screen (`:2707-2708`)
  - `checkSize` reads the page layout every frame (`:926-931`)
- `PX.sprig` runs **two `JSON.stringify` calls per character per frame** in the Garden (`:1791`) and Survival (`:898`, `:91`). Battle caches per pose (`:3913-3917`).
- **Resizing:**
  - Garden reallocates all four canvases on any size change (`:840-842`).
  - Battle checks every 0.5 s (`:4084-4088`).
  - Race skips reallocation when nothing changed (`:2046`).
  - Survival resizes when its size key changes (`:713-717`).
- **iPad/Safari guards already in place:**
  - DPR capped at 2 in the Garden, title, confetti and wipes.
  - Drag, callout, selection, pinch and scroll blocked (`ui.css:14-17`, `app.js:115-154`).
  - Sound nodes disconnected when they finish; at most 8 sounds per 250 ms and 24 at once (`pixel.js:2723-2735, 2847-2856`).
  - Sprite building spread over frames; lost touches reset.
  - No device detection and no frame-rate cap.

### 7.3 Would hundreds of larger animated images cause problems? (*computed* + INFERRED)
**Memory per decoded frame (RGBA)**

| Frame size | Memory |
|---|---|
| 128 × 128 | 64 KiB |
| 256 × 256 | 256 KiB |
| 320 × 320 | 400 KiB |
| 512 × 512 | 1 MiB |

Today's sprites are 16 KiB each.

**If today's 900-entry cache held pictures**
- at 256 px: **225 MiB**
- at 320 px: **352 MiB**
- at 512 px: **900 MiB**

That is too much for iPad Safari (INFERRED: older iOS Safari limits total canvas memory to a few hundred MB).

**All content at once:** (141 plants × 3 stages + 81 zombies) × 8 frames ≈ 4,000 frames, about **1 GiB at 256 px**. So art must be **loaded per scene and held in a size-limited, least-recently-used cache**.

**Garden worst case actually on screen:** 32 plants (`data.js:982`) + 11 raid zombies (`garden.js:2178`), × 8 frames × 256 KiB ≈ **86 MiB**. That is workable with least-recently-used eviction.

**Why bigger pictures alone won't look better (VERIFIED)**
- **Today's buffer throws extra resolution away.** Pictures are shrunk into the 2× world buffer, then enlarged with nearest-neighbour scaling.
- **Raising `SCENE_K` for the whole Garden grows its whole-map buffer quadratically:**
  - K = 4 → 2692 × 2816 (7.6 MP, ~29 MiB)
  - K = 6 → 4038 × 4224 (17.1 MP), over iOS Safari's **16,777,216-pixel canvas limit** (external knowledge)

**Options for showing illustrated characters sharply (RECOMMENDATION)**

**A. Fit pictures into today's 64 × 64 canvases.** This is Solunar's `fitted()` approach.
- Zero engine change, works today.
- Detail is capped at 64 × 64, shown 2–5× enlarged with hard edges. **Not PvZ quality on iPad.**

**B. Raise `SCENE_K` (e.g. to 4) in Battle and Survival only.** Those worlds are small (iPad battle 164 × ~177, survival 183 × 263), so this is cheap.
- Characters use `.k = 4` canvases (128 × 128).
- Better, but the Garden stays at 2× because of its map size.

**C. Recommended: draw characters on a high-resolution layer at screen resolution.**
- Keep the ground (sky, land, water, paths) in today's world buffer.
- After copying the buffer to the screen, draw the **depth-sorted list** directly onto the screen canvas with the camera transform: plants, zombies, props, trees and the house. Use `ctx.setTransform(sc, 0, 0, sc, −camX·sc, −camY·sc)` with `imageSmoothingEnabled = true` and quality `'high'`.
- Pictures are then drawn at true device resolution from source images with `.k = 8` (256 × 256 per 32-art-px box; 384 × 384 for 48-px Zombosses).
- **Cull to the visible view.** It is new for the Garden, and it pays for the extra cost.
- Survival and Battle already copy small buffers, so the same split is easy there.
- Text and HUD are already drawn at screen resolution.
- **Gameplay code is unchanged:** positions stay in world pixels and sizes stay in art pixels; only the final draw changes.
- Supporting changes:
  - Turn `image-rendering: pixelated` off for these canvases.
  - Stop pixel-snapping illustrated sprites.

**Supporting recommendations**
- Load each character's sheet when a scene first needs it, and keep decoded frames in a **least-recently-used cache capped by bytes** (e.g. 64 MiB on iPad, 40 MiB on iPhone).
- Show the code art (today's sprite) as a placeholder until the picture has decoded.
- Keep pictures at **256 px per 32-art-px box** and use PNG with alpha. WebP is about 30–50% smaller but needs iOS 14+.
- Ship pictures in the offline cache with content-hash versioning (port Solunar's `build_web.py` image code).
- Remove the per-frame `JSON.stringify` cache keys for picture lookups: key by `species|stage|pose`.

---

## 8. Source code and implementation handoff

### 8.1 Files and line ranges ChatGPT needs (VERIFIED locations)
Give ChatGPT these sections, or the whole files: a ready-made bundle is listed in §8.3.

| What | File : lines | Why |
|---|---|---|
| Script load order | `index.html:65-111` | where a new `art-images.js` loader goes (after `data.js`, before `state.js`) |
| Grid + canvas output (`.k`) | `pixel.js:75-165` | how procedural sprites become canvases |
| Anchors and box | `pixel.js:965-968` | `SPRIG_W/H = 32`, `SPRIG_AX = 16`, `SPRIG_AY = 31` |
| `artW/artH/blit/keepK/SCENE_K` | `pixel.js:2690-2703` | the size/anchor contract every scene uses |
| Character builder + cache | `art-core.js:1590-1760` | overlay geometry, `buildPlant`, `buildZombie`, `PX.sprig` cache, mini plants |
| Other art wrappers | `art-core.js:1880-1930` | `PX.item`, `PX.critter` (Zombosses), `PX.prop` |
| Example plant | `art-plants.js:130-170` | Sunflower: palette, heads, stages, pose handling |
| Example zombie | `art-zombies.js:1-10, 139-250` | zombie kit, poses, Basic Zombie |
| Garden sizing + render | `garden.js:829-865, 1776-1830, 2640-2710, 195-220, 2560-2570` | resize/zoom, `drawSprout`, sorted draw list + buffer copy, sprite cache + tap radius, raid zombie sprite |
| Survival | `survival.js:56-120, 678-720, 880-940, 974-1027` | `HEAD`, lane/column maths, sprite cache, ice tint, layout, `drawUnit`/`drawZombie`, frame |
| Battle | `battle.js:1892-1920, 2752-2810, 3870-3950, 4000-4040` | scale/spots, ANIM table, fighter drawing (flash, aura, boss ×2), frame |
| UI canvases + loop | `app.js:60-90, 255-280, 630-670, 688-703, 785-825` | `fitCanvas`/`paint`, `lazyDraws`, pixel snapper, the rAF loop + boot, `crispScale` |
| Build / offline cache | `tools/build_pvz.py` (whole file, small) | must be taught to ship `img/` |
| Checks | `tools/check_pvz.js:1-60, 170-190` | Node sandbox (no `Image`), the pose list it tests |
| **Reference implementation** | `pocket-sprout/art-images.js` (whole, ~17 KB); `tools/build_web.py:54-151` | working picture loader + fitter + build/offline-cache code on this same engine |

### 8.2 Key data structures (VERIFIED)
**Plant look** (`state.js:559-567`):
```js
{ species: 'sunflower', stage: 0 | 1 | 2, element?: 'fire' | …, skin?: 'gold' | 'ghost' | …, shiny?: true,
  fuse?: { with: '<plantId>' } | { item: '<fusionItemId>' } }
```
**Zombie look:**
```js
{ zombie: 'basic', skin?: … }
```
**Pose** (`P`):
```js
{ frame: 0 | 1, walk?: true, eyes?: 'happy'|'closed'|'blink'|'sleepy'|'sad'|'brave'|'mad',
  mouth?: 'open'|'o'|'flat'|'grin'|'smile'|'frown', arms?: 'up'|'out'|'paddle'|'hold'|'point', flap?: … }
```
**Art registries:**
- `PX.PLANT_ART[id](grid, stage, P, C)` → returns head geometry `{ hx, hy, hr, top }`
- `PX.PLANT_PAL[id]`
- `PX.ZOMBIE_ART[kind](grid, P, L)`
- `PX.BOSS_ART[id]`

**Output:** an `HTMLCanvasElement` 64 × 64 (bosses 96 × 96) with `.k = 2`, drawn bottom-centre at feet anchor (16, 31) in art px.

### 8.3 Handoff bundle
A zip with the files above (unchanged copies, for reading only) is provided next to this report: `docs/pvz-art-handoff.zip`. Upload it to ChatGPT together with this document if it asks for code.


---

## 9. Recommended practical path (RECOMMENDATION)

The aim: **PvZ-quality illustrated characters with no change to gameplay, saves or animation logic.**

1. **Art spec** (one per character type; use for ChatGPT image prompts and as the delivery standard):
   - **Canvas and placement:**
     - Transparent PNG, facing **right**.
     - Character inside a square **256 × 256 px** cell = the game's 32 × 32 art-px box at `.k = 8`. Zombosses: **384 × 384** (48 art px).
     - **Feet on the bottom centre**: the anchor is (128, 248) in a 256 cell, i.e. art (16, 31).
     - **Height per growth stage:** about 160 / 192 / 224 px (20 / 24 / 28 art px).
   - **Style:** a clean dark outline built into the drawing (the game won't add one), no text, no drop shadow (the game draws its own oval shadow).
   - **Poses per plant stage:** idle, blink, walk-A, walk-B, cheer, attack, hurt, knocked-out.
   - **Poses per zombie:** walk-A, walk-B, bite, hurt, idle.
   - **Delivery:** one sheet per character + a JSON frame map: `{ frame: { x, y, w, h, pivotX, pivotY } }`. Per plant stage, also give the head numbers: centre, radius, top, eye line (§5.4) so fusion parts, items and costumes can still sit on the head.
2. **Loader file** `pvz-garden/art-images.js`, loaded after `data.js`:
   - Wraps `PX.sprig`, plus `PX.critter` for Zombosses and `PX.item` for seed packets.
   - For a plain look, returns the picture frame for the requested pose as a canvas with `.k = 8` and a stable identity.
   - Every other look keeps the code art for now.
   - Falls back to code art until the picture has loaded.
   - Byte-capped least-recently-used cache.
   - Skips itself in Node (the checker).
   - Clears scene caches when a picture arrives.
3. **Sharp drawing (§7.3 option C):** in the Garden, Survival and Battle, draw the depth-sorted characters and props **on the screen canvas at device resolution with smoothing on**, keeping the ground in today's buffer.
   - Garden: add view culling.
   - Turn off `pixelated` and the whole-pixel snapper for picture canvases.
   - Positions and gameplay maths stay in world pixels.
4. **Build:** `tools/build_pvz.py` ships `img/`, adds it to the offline cache and the version hash, and rejects bad file names. `tools/check_pvz.js` checks that every listed picture exists.
5. **Pilot first:** Sunflower (3 stages) + Basic Zombie only.
   - Test at iPad and iPhone sizes in the Garden (including a raid), Survival, Battle, the Almanac and the Shop.
   - The family approves **in the real game** before the rest is drawn.
6. **Then roll out** in batches (most-seen characters first), keeping code art as the fallback for anything not yet drawn.
   - The Christmas event characters (Sugarplum, Caroler, Krampus…) can be drawn **directly in the new style** and added through the same loader.

## 10. Open questions for the family and ChatGPT

1. **Variant looks.** Should pictured plants keep today's code-drawn variant looks (11 elements, 37 fusion parts, 26 fusion items, 6 skins, shiny, Halloween costumes), drawn on top using the head numbers? Or should those looks fall back to code art until variant pictures exist?
2. **Blink and mouth.** Are separate frames per pose enough? Or should the most-seen characters get layered eyes and mouths for live blinking and talking?
3. **Consistency.** Can ChatGPT keep a character identical across 8 poses and 3 growth stages? A model sheet per character (front, ¾, poses) before frames helps.
4. **Mixing styles.** Until everything is redrawn, some characters will be pictures and some code art, side by side. Which characters come first?
5. **Not measured** (needs a real-device test after the pilot): real iPad/iPhone memory headroom, first-install download time for hundreds of PNGs, and how many poses a real play session uses.

---

*Prepared from the PVZ Garden source as of 2026-11-06 (pvz-garden/ = live build 2026.10.24-1500-e28fee). Three independent read-only reviews were cross-checked, and the key numbers were re-verified against the code. No game file was changed.*
