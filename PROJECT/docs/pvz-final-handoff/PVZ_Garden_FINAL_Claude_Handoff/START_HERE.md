# PVZ GARDEN — READY TO HAND OFF TO CLAUDE CODE

**This is the final, four-phase, self-contained package. Nothing needs to be sent back to ChatGPT to complete this assignment.**

## How to hand off
1. Give Claude Code this entire folder or ZIP, plus access to the **actual editable source workspace** containing `pvz-garden/` and `tools/`. The public GitHub Pages repository is a built deployment folder, not the editable original (as its README states).
2. Paste the **entire** `CLAUDE_ALL_FOUR_PHASES.md` into Claude Code. Do not paste the older `CLAUDE_CODE_START_HERE.md`; it intentionally stopped after a small pilot and is superseded.
3. Tell Claude to keep working through all four phases, run the build/test checks, and deliver an integration report and deploy-ready branch. It must stop before touching the live published branch, which is an explicit safety gate, **not** a requirement to come back to this ChatGPT conversation.
4. Review screenshots and tests when Claude provides them. Commit/push only after real device and save-data checks.

## What's in this package
- `CLAUDE_ALL_FOUR_PHASES.md` — the definitive paste-into-Claude instruction.
- `CLAUDE.md` — reusable project agent conventions, copy to the editable source root if convenient.
- `references/01_APPROVED_character_style_reference.png` — approved Peashooter, Sunflower, Chomper, zombies and three boss designs.
- `references/02_APPROVED_game_interface_art_bible.png` — broad UI, tiles, animation and character direction; visual reference only.
- `references/03_APPROVED_gameplay_art_style_bible.png` — approved revision incorporating game modes. **Its AI-rendered writing may contain mistakes.**
- `references/04_ORIGINAL_corrected_gameplay_fact_sheet.png` — **source of truth for rules, counts, poses, sprite packing and on-screen game behavior.**
- `GAMEPLAY_FACTS_AND_CONSTRAINTS.md` — manually transcribed actionable production constraints.
- `UI_ALL_SCREENS.md` — UI art direction and screen-by-screen acceptance specs.
- `ASSET_PRODUCTION_AND_QA.md` — complete sprite inventory targets, authoring and tests.
- `canvas/` — zero-dependency Canvas renderer and pixel-art primitives examples (adapt; do not replace existing modules blindly).
- `art-studio/` — standalone original vs candidate image review tool (separate browser saves).
- `tools/check-sheets.py` — standard-library validator for sheet dimensions, transparency, and file size.
- `tools/check-assets.mjs` — existing optional asset-header check.

## Fundamental honesty about outputs
The 3 approved AI illustration/reference images are **concept sheets, not individual transparent PNG sprites**, no matter how good they look. This ZIP **does not include 423×8 finished plant frames, 81×5 zombie frames, and all other game art**. It includes the exact spec and implementation contract to produce, validate, integrate and QA them in the source project. Do not crop poster text/cream panels as fake sprites or misrepresent procedural placeholder art as approved.

## Priority when materials disagree
1. Actual current source-code behavior and gameplay data, unless specifically overridden by the corrected original fact sheet.
2. `04_ORIGINAL_corrected_gameplay_fact_sheet.png` for gameplay constraints, sprite specifications, and family rules.
3. `01_APPROVED_character_style_reference.png` for character art styling.
4. `02_...` and `03_...` for interface and environment visual inspiration **only**, never for literal counts or exact mechanics.
5. Earlier kits are obsolete where contradictory.

GitHub Pages public game: https://nicky-dimes.github.io/pvz-garden-app/
Published repo (not editable original): https://github.com/Nicky-Dimes/pvz-garden-app
