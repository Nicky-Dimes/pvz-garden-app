# Zombie wave four — production notes

IDs: `snorkel`, `balloon`, `imp`. Actual game identities in original rich pixel art; no runtime/data/save/index changes.

## Inspected identities

### snorkel

Actual PvZ1 cracked yellow-rim oval mask and dark red-brown tube, yellow arm floaties, white I-heart-BRAINS vest, red shorts and dark-red flippers. Cross-checked against original small game sprite; rejected PvZ2 bare-torso/yellow-flipper candidate for this base identity.

Reference: https://plantsvszombies.wiki.gg/wiki/Snorkel_Zombie_(PvZ)

### balloon

Actual PvZ1 sprite/almanac capture: propeller beanie, torn light shirt and blue trousers, dangling body below red balloon attached at back. Red balloon bears black doodled face print. Larger search results were stylistically dubious/fan-like, so actual game sprite is the identity reference rather than those substitutes.

Reference: https://plantsvszombies.wiki.gg/wiki/Balloon_Zombie_(PvZ)

### imp

Original short Imp, giant bald googly-eyed head and big square teeth, red open torn shirt, green belly, blue ragged short trousers and bare little green feet. Preserve small role: occupied height capped40 rather than normal54, still on N64/base61.

Reference: https://plantsvszombies.wiki.gg/wiki/Imp_(PvZ)

## Contract

5×3 source grid, first13 poses, final2 blank: idle2 walk4 attack3 hurt1 fall3. Right-facing with complete props inside margins; pale cream background, no shadows/ground/detached effects. Target N64/base61/maxW55; normal maxH54, Imp maxH40 to retain tiny species identity. Parent handles ingestion/runtime checks.

## Status

All 39 source and indexed frames are reviewed and validated; frozen for parent integration.

## Import and QC decisions

Snorkel's broad strike uses `cropRects[7]=[616,324,388,324]` to retain the complete rear flipper in empty gutter; other source cells keep their regular bounds. Manual head boxes use the expanded-crop coordinate mapping in that cell. Background-only seed fills clear enclosed cream gaps under arms and between legs without changing the original source.

Balloon source idle/walk/recovery cells naturally faced left while the lunge/fall cells faced right. `flipFrames=[0,1,2,3,4,5,8]` normalizes them once during import; every runtime frame faces right. Uniform maximum width40 retains the complete floating pose and centered foot support in the 64×64 contract. It avoids trimming or reshaping the actual airborne lunge. The black doodle is printed on the balloon; no independent balloon expression is animated.

Imp uses maxH40/maxW44 so this little species remains smaller than a normal zombie. Its red open shirt, green belly, blue trousers, bare feet and exaggerated teeth match the actual game identity.

All39 frames pass64×64 dimensions, palette≤52 and consistent per character, valid palette symbols, empty frame edges, exact base61, centered lower support32±10, finite manual face anchors and distinct frames in all multi-frame clips. Per-frame evidence: `verification/zombie-wave-four-validation.json`. All indexed previews were visually inspected; props and complete subjects remain; no adjacent-pose pixels are visible. Source originals remain unmodified.

Assessment: Snorkel good—actual PvZ1 floaties/mask/tube/flippers rather than generic wetsuit; Balloon good—actual hanging silhouette, beanie and attached red balloon; Imp good—small canonical red-shirt bare-foot body with toothy face.

Reproduce: `python tools/animation_slice.py art-src/pvz-ai/animation/zombie-wave-four-spec.json`. Parent owns runtime/index/data/save integration. No shared runtime/progress/tools edits by this batch.
