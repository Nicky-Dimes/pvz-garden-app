# ONE-COMMAND HANDOFF — PVZ GARDEN COMPLETE ART + UI REBUILD (ALL FOUR PHASES)

You are Claude Code operating on my local **PVZ Garden** editable game source workspace. I am commissioning an end-to-end, cohesive, authentic pixel-art redesign of ALL character assets, animations, scenery and game interface without changing the rules of the game. Carry out ALL FOUR PHASES below as one assignment, not just an audit or sample. **Do not refer me back to ChatGPT.** Use your own tools and source access to continue until the new assets are integrated, tested and ready for a controlled deployment. If an art-generation tool or pixel-editing capability is not available, tell me what is blocking truly faithful art and implement/review the parts you can instead of passing off crude placeholders as finished assets.

## First read (mandatory, in order)
1. `START_HERE.md`
2. `GAMEPLAY_FACTS_AND_CONSTRAINTS.md`
3. `UI_ALL_SCREENS.md`
4. `ASSET_PRODUCTION_AND_QA.md`
5. `PVZ_GARDEN_OFFICIAL_ART_STYLE.md`
6. `references/04_ORIGINAL_corrected_gameplay_fact_sheet.png` — authoritative original product requirements and gameplay examples.
7. `references/01_APPROVED_character_style_reference.png` — definitive art quality/direction.
8. `references/02_APPROVED_game_interface_art_bible.png` and `references/03_APPROVED_gameplay_art_style_bible.png` — visual inspiration for the full UI. They contain AI-generated text that is not an authoritative specification.
9. Existing renderer helpers in `canvas/`, Art Studio in `art-studio/`, validation scripts in `tools/`.

## Operating requirements
- Vanilla HTML, CSS, JavaScript, HTML5 Canvas. **No Phaser, PixiJS, React, Unity or Godot**; do not add unnecessary dependencies.
- Runs in desktop Safari and iPhone/iPad Safari/Home Screen mode, hosted by GitHub Pages; keep touch controls, responsive viewports and Web Audio functioning.
- Preserve Garden, Race, Battle, Survival & Adventure, Arcade, Shop, Almanac, My Aquarium, title/player screens, progression, coins, gems, unlocks, achievements, inventories, costumes, backups, saved games, offline support, parent controls and all other existing behavior.
- Existing saved game IDs/formats and backup codes must remain compatible. Use distinct review-only storage keys.
- Work from editable source `pvz-garden/`, **not** hand-edited GitHub Pages build outputs `pvz-garden-app/`. Locate exact paths first, rather than guessing. Repo README documents `python3 tools/build_pvz.py` and `tools/check_pvz.js`; verify actual files locally.
- Create a safe feature/development branch; do NOT auto-push, force-push, delete historical files, migrate saves without fallback, or deploy to children's phones. No credentials in public files.
- The original PVZ Garden family fan game uses recognizable inspired identities but all **new artwork must be original**, not copied, traced, extracted or reused from external copyrighted game assets.

## Reference priority
The corrected original gameplay fact sheet controls facts; the approved character sheet controls character aesthetic; the two UI bibles control visual inspiration only. If the AI-generated text on a concept sheet conflicts with code or fact sheet, discard the AI text. **Do not use the earlier rejected smooth/vector PVZ Garden roster. This is PVZ Garden, not Solunar Sprouts.**

## PHASE 1 — SOURCE AUDIT, INVENTORY, SAFETY BASELINE
1. Inspect the entire editable source tree, particularly `pixel.js`, art modules, canvas init, `data.js`, `state.js`, UI CSS/HTML, Garden/Survival/Battle/Race/Arcade/Shop/Almanac/Aquarium logic, asset loader, service worker and build/check scripts. Cite verified source paths in `docs/pvz-art-audit.md`.
2. Programmatically extract actual stable plant/zombie/boss IDs, growth stages, existing poses, costume layers, elements, fruits/seeds, effects, scenery, screens and cross-references. Never invent missing IDs from poster spelling. Preserve current canonical IDs.
3. Capture current screenshots for all screens and size classes (portrait iPhone, portrait iPad, landscape where supported, desktop Safari). Record baseline layout, hitboxes, animation timing, drawing transforms, memory, loading, current save compatibility and PWA cache state.
4. Write `docs/pvz-art-asset-manifest.json` with `id`, `type`, `stage`, `pose`, `assetPath`, native and frame dimensions, anchor, render scale, authoring status, runtime integration status, and verification status. Generate it from existing source and update as work proceeds.
5. Record rollback path and a baseline build/test pass. Do not stop here: advance to Phase 2 automatically.

## PHASE 2 — RENDERING, FIRST MASTER ASSETS, ART SYSTEM
1. Design a canonical pixel-art palette, logical-grid protocol, reusable sprite atlas reader, indexed-pixel drawing helpers, transparent image loader/cache, no-smoothing renderer, consistent anchors, stage/pose selection, mirroring and fallback to original code-drawn art for missing assets. Integrate safely with existing Canvas transforms; be deliberate with devicePixelRatio and source/destination scaling.
2. Adopt the exact frame/sheet format in the corrected gameplay fact sheet (`GAMEPLAY_FACTS_AND_CONSTRAINTS.md`). It supersedes generic 64×64 canvas suggestions in earlier kits. Use 256×256 output frame per plant/zombie pose, 8 physical pixels per logical art pixel; 384×384 per boss frame. See the documented anchor and sheet layouts.
3. Author and render **fully faithful** master designs for Peashooter stages 1/2/3 (8 poses each), Sunflower stages 1/2/3, Chomper stages 1/2/3, Basic Zombie (5 poses), Conehead Zombie (5 poses), and Zombot, Plankwalker and Gargantuar Rex (2 frames each). Match the approved character style and every character-specific rule.
4. Add an independent local Art Studio comparing current/target/art-reference at native size, 1×/2×/4× and actual on-screen ~21–32px size, with onion skin, alpha checkerboard, grid, notes, and per-asset accept/revise status. Existing included Art Studio can be the starting point; do not introduce review links in the public game.
5. Apply a common pixel-art UI kit (button chrome, icons, tabs, panels, coin/energy/gem counters, tooltips, popup frames, text clarity, touch targets, state feedback) and the core Garden screen. Implement a design-token layer so every screen uses the same language.
6. Run automatic dimension/alpha/atlas/manifest checks, capture actual screen comparisons, correct failures, then continue to Phase 3 without making me return to ChatGPT. A visual sign-off can be recorded by me locally; lack of immediate sign-off does not authorize publishing unapproved assets.

## PHASE 3 — COMPLETE PRODUCTION ART AND ENTIRE-GAME UI
1. Produce/integrate the actual complete current-source roster, not only examples: **141 plant species × 3 growth stages (423 distinct looks) × 8 poses**, **81 zombies × 5 poses**, **12 Zombosses × 2 frames**, plus all costume/fusion parts, elemental companions, shards/cores, fruits/seeds, projectiles/effects, 16 garden themes and 98 props, Survival/Adventure scenery, 29 Battle arenas, Race tracks, Arcade boards/trophies, Aquarium assets, menus, screen panels and icons described in the corrected sheet. Read code to confirm counts; do not fabricate missing content or add unrelated characters.
2. Every character must retain its recognizable identity, correct anatomy, individual silhouette and relevant stage progression. Follow family-specific rules: cute/toy-like zombies, no ordinary plant legs, named facial exceptions, special Sunflower stage 3 three flowers, Dragon-like Snapdragon, Cabbage-pult cabbage in all stages, floating costumes aligned to head anchor, visual detail legible tiny and large.
3. Build reusable original tilesets and layered parallax/background assets; keep existing map/collision/interaction positions and text/screen navigation. Render garden HUD and seed tray, Survival lane-defense UI, Battle fighters/health, Race course lanes and HUD, Arcade games, Shop, Almanac, Aquarium, main menu, profile selection, title, settings, popups, unlocks and ending states per `UI_ALL_SCREENS.md`.
4. Provide frame-accurate animation, palette consistency, texture density and readable feedback. No pasted generic faces, smooth/vector stickers, ad hoc mixed resolutions, unapproved concept-poster crops or missing stage art. Keep gameplay deterministic and asset loading robust.
5. Perform batched visual QA by category with generated contact sheets, per-character runtime previews, logs and manifest progress. Correct automated issues, and visually review each category; make any unresolved art gaps explicit. A placeholder is not complete. Keep going to Phase 4 automatically.

## PHASE 4 — CROSS-SCREEN QA, MOBILE PERFORMANCE, BUILD, DEPLOYMENT PREP
1. Run the project's existing source validator and build: use the actual local `tools/check_pvz.js` and `tools/build_pvz.py` if present; also run `tools/check-sheets.py` from this kit (or equivalent) against new assets. Fix defects and re-run.
2. Exercise Garden, Race, Battle, Survival/Adventure, Arcade, Shop, Almanac, Aquarium, player/profile and every important popup. Test touches, scroll, animations, hitboxes, wake/resume, offline startup, service-worker upgrades, load failures, slow network, Retina DPR and memory pressure on iOS.
3. Verify save migrations (ideally no migration), backup-code export/import, per-player save separation, Home Screen Safari storage separation and child-progress preservation. Do not remove or reset saved data.
4. Check both original and replacement fallback for every ID; no invisible sprites, cut-off halos, blurred non-integer pixels, odd head-anchor accessories, altered combat timings or unauthorized gameplay changes.
5. Produce: `docs/pvz-art-completion-report.md`, actual asset inventory by count/status, source/build diff, screen-by-screen screenshots, test commands and results, known defects, before/after reviews, cache-update/version strategy and rollback instructions.
6. Prepare build outputs on a staging branch. **STOP BEFORE LIVE PUSH/DEPLOY**, show a launch checklist and obtain my explicit approval for release. This approval gate is here to protect the children's saves, not to route back to the ChatGPT thread.

## Acceptance gates
- Every original runtime asset reference resolves; gameplay remains fully functional.
- All new sprites are genuine individually constructed pixel art on consistent grids with opaque pixel boundaries and transparent outside; no AI poster crops falsely labeled game sprites.
- All counts/poses/forms required by the current source manifest are present, validated and integrated. Report real completion numerically, no blanket claims without tests.
- All seven top-level tabs and supplemental gameplay screens have cohesive UI without sacrificing readable mobile controls.
- High-resolution zoom AND actual-size ~21–32px previews look good.
- All current players' save data and backup codes remain compatible.

## Work style
Act as the end-to-end implementer. Make sensible source-grounded decisions without asking repeated clarifying questions. Work in batches with verifiable milestones, keep concise progress logs, and use the reference examples as the consistent design benchmark. Do not stop at a proposed plan, proof-of-concept or sample roster. However, if you physically cannot create finished sprites or cannot test a platform, state the limitation accurately and complete everything feasible. Only require my explicit approval to go LIVE, never require a return to ChatGPT.
