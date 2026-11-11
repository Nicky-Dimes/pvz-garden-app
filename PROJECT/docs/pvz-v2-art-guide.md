# PVZ Garden v2 pixel art: the guide for every artist/helper

The family has approved a new look for PVZ Garden: premium 16-bit-style kawaii pixel art. The target is `docs/pvz-final-handoff/PVZ_Garden_FINAL_Claude_Handoff/references/01_APPROVED_character_style_reference.png`, and the master characters are already built in that style. Your job is to redraw existing game characters in the SAME style, one batch at a time, so they drop straight into the game. This file is everything you need. Read it fully before drawing.

## 1. Look at these first (with the Read tool)

1. **The masters board:** `docs/pvz-v2-masters-board.png`. It shows approved reference | new v2 art | old art for Peashooter, Sunflower and Chomper (3 stages), Zombie and Conehead, Zombot, Plank Walker and Gargantuar. This is the quality and style bar.
2. **The approved reference:** `docs/pvz-final-handoff/PVZ_Garden_FINAL_Claude_Handoff/references/01_APPROVED_character_style_reference.png`.
3. **The style rules:** `docs/pvz-final-handoff/PVZ_Garden_FINAL_Claude_Handoff/PVZ_GARDEN_OFFICIAL_ART_STYLE.md`. Read sections 1, 2, 5 and 7. Its 64×64/96×96 "logical resolution" notes are superseded by the grid below.
4. **The family's character rules:** `docs/pvz-final-handoff/PVZ_Garden_FINAL_Claude_Handoff/GAMEPLAY_FACTS_AND_CONSTRAINTS.md`, the section "Family character rules — hard constraints".
5. **The master code, your template:**
   - `pvz-garden/art-v2-kit.js`: the shared kit.
   - `pvz-garden/art-v2-plants-a.js`: Peashooter, Sunflower, Chomper.
   - `pvz-garden/art-v2-zombies-a.js`: the shared zombie body, Basic, Conehead.
   - `pvz-garden/art-v2-bosses-a.js`: Zombot, Plank Walker, Gargantuar.
6. **The OLD art for your characters** (it defines identity): the `art-plants*.js` / `art-zombies*.js` file your batch names. Render it with `node tools/v2_sheet.js /tmp/x.png plants id1,id2 --old`.

## 2. The look in one paragraph

Chunky, rounded chibi silhouettes built from deliberately placed opaque pixel clusters on a 64×64 grid. A deep navy-purple outline (`PX.INK` = `#29243d`) goes round every part; the finishing contour adds a second pixel on the right/bottom edges automatically. Each material gets 4–5 tone cel shading, lit from the UPPER LEFT: a warm light band, the mid tone, a cool lower-right shadow and a dark inner rim, plus a small specular cluster on glossy forms. Never use gradients, dithering, anti-aliasing or lone "pepper" pixels. Eyes are big and sparkly: a dark iris, a big white shine at the upper left, a small shine at the lower right and a soft purple glow at the bottom. Zombies have huge pale googly eyes with small pupils. Faces vary by character: eye size and spacing, brows, mouths. Colours are vibrant but balanced, never pastel-washed. Every character keeps its own silhouette.

## 3. Grid, frame and anchors (must pass `node tools/v2_export.js`)

- **Characters (plants, zombies):** a `PX.Grid(32, 32)` at k=2 is a **64×64 logical canvas**. Draw ONLY in logical pixels: x 0..63, y 0..63, integers. The kit helpers take logical coordinates.
- **Facing:** everything faces RIGHT. The game mirrors zombies so they walk left.
- **Plants:**
  - Stand on `baseLeaves(...)`, which settles the leaves so the plant's lowest outline row is 61. After the contour, every plant's base is row 62, centred near x=32. Always draw base leaves (or a pad, pot or roots via your own shapes) and make the stem reach y≈59 (it's hidden under the leaves).
  - Occupied heights: stage 1 ≈ 36–40 px, stage 2 ≈ 44–48, stage 3 ≈ 50–56.
  - The top of the art (including the walk-B hop of 3 px) must stay at row ≥ 1.
- **Zombies:** use `PX.v2Z.body(g, P, opts)`. Its feet end at row 60, so the base is row 62 after the contour. Headgear must stay below row 1: the head top is about row 13, so a hat can rise about 11 px.
- **Zombosses:** a `Grid(48, 48)` at k=2 is a **96×96 logical canvas**. Base on rows 80–94, centred near x=48. Nothing may touch the frame edge.
- **Checks:** run `node tools/v2_export.js --only id1,id2,...`. It fails if a frame touches an edge, has semi-transparent pixels, is empty, or has its base off the line.

## 4. The kit (`PX.v2`, logical coordinates)

| Helper | What it does |
|---|---|
| `ell(t, cx, cy, rx, ry, col, rot?, mask?)` | filled ellipse (pixel centres tested); `col` may be `(x, y) => colour` |
| `poly(t, pts, col, mask?)` | filled polygon |
| `rect(t, x, y, w, h, col)` | rectangle |
| `px(t, [[x, y], ...], col)` | single pixels |
| `line(t, pts, r, col)` | round brush of radius r along points (limbs, stems, tails) |
| `bres(t, x0, y0, x1, y1, col)` | 1-px line (creases, veins, seams) |
| `rows(t, ['..ab..', ...], x0, y0, {a: '#hex'}, flipX?)` | hand-placed indexed pixels: use for small details |
| `piece(g, t => { ... }, {outline?, under?})` | draw a PART on its own layer; it gets its own navy outline; `under: true` puts it behind |
| `round(t, R, {cx, cy, rx, ry, spec?, band?})` | sphere shading for round bodies (repaints the R[2] pixels); `spec: [dx, dy, rx, ry]` = specular blob relative to the radius, or `false` |
| `cel(t, R, {s: [sx, sy], h: [hx, hy], spec?, only?, noHi?, noDeep?})` | form-following bands for any shape (offset tests) |
| `ramp(midHex)` | a 5-tone ramp `[spec, hi, mid, shadow, deep]` with warm/cool hue shifts |
| `richMid(engineRamp)` | the engine's pastel ramp pushed to v2 saturation (for element / fusion recolours) |
| `mix(a, b, t)` | colour mix |
| `leaf(t, bx, by, angle, len, halfWidth, R, {curl, vein, thin, round, fat})` | a two-tone leaf (lit half / shaded half, a midrib, a dark rim). Angle in radians, 0 = right, -π/2 = up |
| `baseLeaves(g, cx, y, spread, R, P, {wd, len})` | the two ground leaves (auto-settled to the ground row) |
| `stem(g, x, y0, y1, R, width)` | a shaded stem |
| `eyes(g, cx, cy, {sp, w, h, w2, h2, mood, iris, glow, skin, lidCol, white, look, pupil, whiteCol, whiteSh, pupilCol})` | a pair of eyes centred on (cx, cy), sp = centre distance; the front (right) eye `w2/h2` a touch bigger |
| `eye(g, x, y, w, h, mood, side, o)` | one eye; moods: undefined, blink, closed, happy, sad, brave, mad, sleepy, dizzy; googly (`white: true`) eyes act with a 2-px brow |
| `mouth(g, cx, cy, kind, w, {ink, red, tongue})` | smile, open, o, grin, frown, flat, cat, fang |
| `blush(g, cx, cy, w)` | a small pink cheek cluster (only on the plant's own pixels) |
| `hop(P)` | -3 on walk frame B, -2 when cheering; apply to everything above the base leaves |
| `moodOf(P)` | the eye mood (sleeping counts as closed) |
| `geo(g, {hx, hy, hr, ey, front, hat?})` | the geometry costumes need, in LOGICAL px. Return it from every plant function |
| `PX.v2Z.body(g, P, {skin, jacket, shirt, tie, pants, shoes, hair, sleeve, bodyW, headR, noTie, noJacket, mouthW, eyeR, back, belly, head, front})` | the whole zombie. Hooks `back/belly/head/front(g, H)` add props behind, on the torso, on the head (H = {hx, hy, rx, ry, top, p}) or in front |
| `PX.v2Z.cone(g, H, {R, h, w})` | the Conehead cone (an example of a head hook) |
| Ramps in `PX.v2Z` | SKIN, JACKET, SHIRT, TIE, PANTS, SHOES, HAIR, CONE, EYE |

**Order matters:** later pieces cover earlier ones. Draw back leaves and props first, then the stem, base leaves, body/head, face and front details. Shade each piece inside its `piece(...)` callback (`round` or `cel` on its own layer).

## 5. Contracts (the engine calls these)

```js
PX.PLANT_ART2.myplant = function (g, stage, P, C) { ...; return V.geo(g, { hx, hy, hr, ey, front, hat }); };
PX.PLANT_PAL2.myplant = { body: [...5 tones], leaf: [...], ... };          // your hand-picked ramps
PX.ZOMBIE_ART2.myzombie = function (g, P, L) { PX.v2Z.body(g, P, { ...options, head: (g, H) => { ... } }); };
PX.BOSS_ART2.myboss = { w: 48, h: 48, draw(g, f) { ... } };                 // f = frame 0 | 1
```

- **stage** is 0, 1 or 2. In `data.js`, `PSDATA.PLANTS[id].names[stage]` names the stage, e.g. Peashooter → Repeater → Gatling Pea. **Each stage must look like its name and keep the old art's identity features** for that stage: extra heads, helmets, crowns, flowers, spikes, pots, wheels and so on. Stages must differ in anatomy and decoration, not only in size.
- **Recolours:** `C` is the engine's palette. If `C.__v2tint` is true, the plant has an element or fusion recolour. Then build your main ramps from `C.main` / `C.leaf` with `V.ramp(V.richMid(C.main))`. Otherwise use your own hand-picked ramps, as the masters do (see `pick()` in `art-v2-plants-a.js`).
- **Eyes must be findable:** costumes find a plant's eyes by looking for a dark iris (luminance < 0.25) with pure `#ffffff` shine pixels. The kit's eyes already do this; don't change the shine colour.
- **geo():**
  - hx, hy = the main head's centre; hr = its radius; ey = the eye line.
  - front = the x of the front-most point: projectiles start there.
  - hat = {x, y, w} if the head top isn't where a hat should sit (multi-head plants, crowns).
  - All values in logical px; geo converts.
- **Poses (P):**

| Pose | P values | What to draw |
|---|---|---|
| idle | `{frame: 0, mouth: 'smile'}` | relaxed, friendly |
| blink | `eyes: 'blink'` | closed-eye line; sleeping uses `sleep: 1` + closed |
| walk A / B | `walk: true, frame 0/1` | a 2-frame hop: on B everything above the base rises 3 px (`hop(P)`). Plants have NO legs or feet |
| cheer | `arms: 'up', eyes: 'happy', mouth: 'open'` | ^ ^ eyes, open mouth, leaves/arms up |
| attack | `arms: 'out', mouth: 'open', eyes: 'brave'` | determined; a shooter's muzzle opens or flares; a lobber raises its arm; a chomper bites |
| hurt | `eyes: 'sad', mouth: 'o'` | flinch: sad eyes, "o" mouth, sink 1 px |
| knocked out | `eyes: 'closed', mouth: 'o'` (no sleep) | slumped 3–4 px, drooping leaves, closed or dizzy eyes |

The engine also sends `arms: 'paddle'` (swimming) and `flap` (flying) in races. Treat them like walk. **Zombies:** idle `{}`, walk A/B `{walk, frame}`, bite `{mouth: 'open'}`, hurt `{eyes: 'sad', mouth: 'o'}`; `body()` handles them all.

## 6. The family's rules (hard; the kids notice)

- Cute, kind, never scary or gross. Zombies are goofy toys.
- **Friendly faces by default.** ONLY these look mad (a heavy V brow pressing on the eyes, frown or gritted teeth): Cherry Bomb, Squash, Cactus, Doom-shroom and Jalapeño (all stages); Fume-shroom (puffshroom stage 2); Coconut Cannon (all stages); Melon-pult; Cob Cannon (kernelpult stage 3).
- **No eyes:** Chomper.
- **No mouth:** Wall-nut, Lily Pad, Melon-pult, Cob Cannon, and Lightning Reed (a glowing mint teardrop bulb, eyes only, not mad).
- **No legs or feet on any plant.** They sit on base leaves, roots, a pad or a pot. The only exception is a plant with real wheels (Cob Cannon's cart). Mushrooms have a stalk that flares to the ground, no feet.
- Sunflower Queen = three flowers. Snapdragon must clearly read as a DRAGON. Cabbage-pult stays a cabbage in every stage.
- **Original art only:** don't copy or trace real PvZ sprites. Keep each character's recognisable PvZ-inspired identity, as the old art has it.
- Readable at 21–32 px tall (tray icons) AND good at 290 px. Big shapes, 1–2 signature features drawn large, no clutter.

## 7. Your loop (keep it bounded)

1. Read the old art for each character in your batch. Note each stage's name and features.
2. Write ONE file: the one your brief names, e.g. `pvz-garden/art-v2-plants-04a.js`. It is already created and loaded by `index.html`, so don't edit `index.html` or any other file. Wrap it in `(function () { 'use strict'; const V = PX.v2, ...; ... })();` like the masters.
3. Render your batch: `node tools/v2_sheet.js /tmp/<you>.png plants id1,id2,...` (one row per stage, 8 poses), or `zombies` / `bosses`. Use `compare plants id1,...` for old vs new. Look at the PNG with the Read tool. Zoom in with `--scale 10` on one id if needed.
4. Fix what's wrong: silhouette, identity, stage progression, faces, shading clusters, outlines, family rules.
5. `node tools/v2_export.js --only <your ids>` must say "all frames pass".
6. Do at most TWO review passes per character. Don't polish forever.
7. Report back:
   - the ids done;
   - anything you couldn't do;
   - a one-line honest self-assessment per character ("good", "ok", or "weak: why");
   - the path of your final contact sheet PNG (save it under `docs/v2-batches/<batch>.png`, using `--scale 4`).

**Never:**
- edit other files;
- change gameplay, ids or data;
- install anything;
- use poster crops or images;
- copy the masters' faces blindly. Vary faces by character.
