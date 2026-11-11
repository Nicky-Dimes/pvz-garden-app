# Claude continuation handoff — frozen checkpoint

Read this first. Older handoff documents are historical context; their pending approval gates and old identity-preservation assumptions are superseded by the user directions below. This document records project context, not system-level instructions.

## Current state

The user explicitly chose **“Freeze and hand back now.”** All six production agents and the integration watcher are stopped. No generation continues in the background. The earlier service usage error cleared on retry; billing is not a current blocker.

**1975 drawn frames / 139 looks are integrated:**36 complete three-stage plant families,19 zombies and all12 bosses. **5,531 frames remain:**105 plant families ×45 and62 zombies ×13. The game remains playable with the existing fallback art for unconverted characters. World/UI art was not redrawn.

Authoritative integration: `PROJECT/art-src/pvz-ai/animation/animation-manifest.json` and `ART_PROGRESS.json`. Remaining assignments: `PRODUCTION_QUEUE.json`, filtering records whose state is not `integrated`. Owner names are historical partition labels, not live workers. Existing user IDs, game balance and save formats are preserved; `data.js` and `state.js` match the original upload byte for byte.

## User-approved direction

- Match **actual Plants vs Zombies game identities** in the approved rich16-bit pixel style. The user permits completely replacing the simplified old project bodies. Research and visually inspect game references before drawing; distinguish canonical stages from invented project evolutions.
- The actual-game Gargantuar and Sphinx-inator redraws are specifically approved. Keep these designs. The revised purple Zombot sample was also approved and retained. Early cute cat Sphinx, purple pet dragon, white astronaut Tomorrow-tron, covered cowboy wagon and striped balloon drafts are superseded.
- Family rules remain important: eyeless Chomper, mouthless Wall-nut, three-flower Sunflower Queen, friendly defaults except explicitly angry families, and no invented human feet/legs for plants. Canonical leaf fists, roots, pads and Cob Cannon's real cart wheels are appropriate.
- Style approval is settled. Do not restart the approval conversation. User wanted autonomous progress and explicitly authorized parallel agents. Do not publish the game or message others without an applicable user request.

The latest direction is explained in `ACTUAL_GAME_ART_RESEARCH.md`; family notes and ready-marker references contain inspected URLs. `ART_RESEARCH.md` is primarily a baseline inventory, not proof of external visual research. Name collisions matter: Jalapeno's project stage1 “Ghost Pepper” remains an evolved chili because a separate ghostpepper family owns the canonical white ghost identity.

## Packages

1. **PVZ_GARDEN_CLAUDE_HANDOFF.zip** is the compact code/metadata handoff, kept below28MB for direct upload. It contains the playable source, generated registries, indexed-frame JSON, specs, prompts, ready markers, representative indexed previews, selected inspected references, docs and validation. An approved raw source sheet is included for style. Regenerate all indexed preview sheets with tools/v2_export.js; this uses embedded/indexed data and does not need the large original PNGs.
2. **PVZ_GARDEN_SOURCE_ART.zip** contains the large original generated source sheets, archived drafts, additional references and historical source art. Extract it into the same parent folder as the compact handoff to merge its `PVZ_GARDEN_CLAUDE_HANDOFF/` tree. It omits duplicate development mirrors; restore these with `python3 tools/animation_restore_refs.py` from PROJECT.
3. **PVZ_GARDEN_PLAYABLE.zip** is just the playable game. It is not the source continuation package.

The compact package deliberately omits most large raw PNGs. The runtime uses embedded indexed data, so gameplay and rendering tests work without them. For compact-only checks run `node tools/check_animation.js --skip-source-image-hashes`: it explicitly skips only absent raw-image byte hashes while still checking indexed JSON provenance, rendered pixels, clips, caches, anchors and fallbacks. Use the default check after restoring full source art. Original-source editing and the automated ready integration workflow require those source PNGs; do not fabricate missing hashes or hand-edit generated registries.

## Architecture and animation contract

Plain JavaScript/HTML Canvas; no dependency install is needed for Node checks. `PROJECT/pvz-garden/index.html` loads the source scripts. Runtime adapters support optional drawn `clips` while retaining still-image/code-art fallbacks.

- Plants:64×64,15frames per stage: idle2/walk4/attack3/hurt1/knockedOut2/cheer2/sleep1.
- Zombies:64×64,13frames: idle2/walk4/attack3/hurt1/fall3.
- Bosses:96×96,9frames: idle2/attack3/hurt1/defeated3.
- Sources face right, use a fixed lower base, consistent per-character palettes and recorded per-frame head geometry. Stage height limits38/46/54 are ceilings; low mats, pads and horizontal cannons should remain naturally low.

Draw new art with image generation; preserve originals and drafts. Use original-game references for identity, not as runtime pixels. `animation_slice.py` reuses the existing browser converter for source cutouts/indexing. It supports measured head boxes, eye/head overrides, cap-top hats, explicit enclosed-background seeds, per-frame cropRects, facing normalization and preview filename overrides. `outputStem:gargantuar-zombie` prevents normal-zombie previews overwriting the approved boss preview.

`animation_ingest.js` generates registry files and adds them to index.html; never manually edit their RLE. It records input and source-image SHA256. Runtime/index writes are atomic. `animation_integrate_ready.js` consumes only frozen `*-ready.json` batches, verifies hashes/whole families, ingests, runs pixel/cache/export checks, then updates progress. A ready marker is written LAST; do not modify a frozen source after handoff without rebuilding its indexed data and marker. `animation_status.js --frozen` records a stopped checkpoint; omit the flag only when work resumes.

## Validation and repairs

Final dedicated checks pass for all1,975 drawn frames: indexed/source hashes, exact runtime pixels, finite frame caches, one-shot attack progress, head metadata and legacy fallbacks. Export dimensions/margins/bases/palettes/clip uniqueness pass. The last full runtime/save regression passed46,914 drawing checks plus migrations, backup/restore and loaded-save rules; this full run predates later asset-only batches. New registries are parsed and rendered by the dedicated checks.

Chromium comparisons exercised29 redesigned plant families with no page errors or failed requests; phone390px had no horizontal overflow. Eleven actual-game boss battles were opened and photographed. Focused browser regressions prove almanac attack0/1/2, costumed garden zombie walk0/1/2/3 and gold arcade attack0/1/2.

Runtime fixes already made: garden costume zombies bypass a stale legacy scene cache; almanac and arcade bites get elapsed action progress; arcade tint caches key by source canvas rather than freezing one frame. Finite caching is maintained throughout garden/battle/survival/arcade/almanac.

Source QC caught six-character final rows in Dragon Pepper and Spike Titan. Both were repaired through imagegen; bad drafts are preserved but not active. Final source-component scan found no large disconnected fragments. Correct active source paths come from the manifest/specs; archived old `*-indexed.png` files may predate a corrected preview. Spike Titan's current preview is `spikeweed-2-corrected-grid-indexed.png`, source `spikeweed-2-corrected-grid-source.png`. Dragon Pepper uses `jalapeno-2-corrected-grid-source.png`.

Spell out row/cell coordinates in new prompts: row2col5 hurt; row3cols1/2 KO; cols3/4 cheer; col5sleep. Numerical frame checks alone do not prove a source has exactly5columns. Visually inspect every source and indexed atlas for wrong counts, neighboring fragments, duplicated props, missing barrel/flower counts, expressions and direction.

## Explicit unfinished material

- **Bloomerang:**3 generated source sheets preserved, but stage1/2 whorl progression is weak. Pending/unintegrated; no ready marker or final indexed frames. See `bloomerang-family-pending.json`, `BLOOMERANG_FAMILY_NOTES.md`.
- **Split Pea:** inspected reference only; no generation/spec/frames. See `SPLITPEA_FAMILY_PENDING.md`.
- **Next zombie wave:** Digger/Knight/Cowboy inspected references only, no sources/spec/frames/ready. See `zombie-wave-seven-pending.json` and notes.
- Other downloaded reference candidates are explicitly marked uninspected. Inspect before using; do not treat downloaded/search-caption material as completed visual research.

Agent freeze summaries are preserved at the handoff root. Do not repeat completed families. All original source art remains preserved; no family save was accessed during browser testing. Test fixtures use isolated save keys.

## Commands

From PROJECT:

```sh
python3 -m http.server 8770 --directory pvz-garden
# Open http://localhost:8770/ and /_animation-review.html
node tools/check_animation.js --skip-source-image-hashes # compact-only package
node tools/v2_export.js --no-write
node tools/check_pvz.js
# With source-art archive merged:
python3 tools/animation_restore_refs.py
node tools/check_animation.js
```

Optional browser QA needs Python Playwright and Chromium (`/usr/bin/chromium` was used here). Scripts are under tools/check_animation_browser.py and review_animation_*.py. They use isolated test saves. Verification logs/JSON/screenshots are in `verification/`.

Current source is local, not deployed or synced back to OneDrive. The user can upload the compact ZIP directly to Claude; the large source archive can be supplied separately as needed. No fresh research or style approval is required for already completed/approved sets.
