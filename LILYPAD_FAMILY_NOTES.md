# Lily Pad family production

Status: complete; 45 indexed drawn frames ready for parent integration. Not registered in runtime by this task.

## Inspected reference

- Actual PvZ2 render from community game mirror: https://pvsz2.ru/plant/58 . Full image: https://pvsz2.ru/statics/plants-big/58.png .
- Saved and visually inspected at `PROJECT/art-src/pvz-ai/research/lilypad/lily-pad-actual.png`, source URL metadata alongside in `reference.json`.
- Visible anatomy: very broad low oval green leaf disk, radiating veins, raised lime rim, a cleft/notch toward rear-left, two hooded yellow eyes at the near/front rim. No separate upright body, feet, leaf pedestal or mouth.
- Parent task requests friendly dark oval eyes. This is an explicit project eye variant; source PvZ2 render has narrow yellow eyes. Keep the actual disk/vein/notch anatomy while using the requested dark eyes.
- Approved pixel style was visually inspected from the actual-game Peashooter source atlas, copied within the project as `art-src/pvz-ai/animation/peashooter-0-actual-source.png`.

## Canonical versus project progression

- Lily Pad is canonical. Base stage stays a low flat green disk; remove invented blue water/ground/shadow strip and bud to keep canonical clean pad anatomy.
- Lotus Pad and Lotus Queen are project evolutions, not claimed as separately canonical game plants. Add an attached pink/white lotus blossom at rear center, then a richer multi-tiered lotus bloom and larger pad. Flower has no face. All eyes remain on the pad. No human queen or literal royal crown.
- Current family hard rules: friendly/cute, no mouth at every stage, no legs/feet. Only pad flex/slides, rim curls and attached petal motion; no detached projectiles, particles, water or ground.
- Natural low horizontal silhouette is preserved. Stage max heights38/46/54 are ceilings, not forced anatomy; max width56 is the likely limiting axis for the basic pad.
- Fifteen frames per stage: idle2, walk4, attack3, hurt1, knockedOut2, cheer2, sleep1. KO/sleep require closed eyes; blossoms fold without a face or limbs.

## Ownership

Only Lily Pad source copies, spec, indexed data, metadata and family notes. Parent handles registry/index/progress integration. Shared runtime and tools untouched.

## Final files and verification

- `PROJECT/art-src/pvz-ai/animation/lilypad-family-spec.json`: stages0/1/2, source paths and 45 recorded source face boxes, with face anchored on pad rather than flower.
- `PROJECT/art-src/pvz-ai/animation/lilypad-family-frames.json`: complete 45-frame indexed data, ready for parent ingestion with a unique registry filename.
- `lilypad-0-actual-source.png`, `lilypad-1-actual-source.png`, `lilypad-2-actual-source.png`, all preserved and copied to `PROJECT/pvz-garden/_ref/animation/`; spec copied there as well.
- `lilypad-family-prompts.json` records the generation prompts.
- All three indexed previews were visually inspected. Wide flat pad is maintained, pad-face eyes remain separate from the lotus, no mouth or limbs, and KO/sleep eyes close. Active lotus petals and pad cupping differ between attack/windup/recovery and cheer frames.
- Natural rendered height ranges (in64px canvases): stage0=25–32px; stage1=32–43px; stage2=35–44px. Height ceilings were respected without forcing the horizontal plant upright.
- QC passed all45frames:64x64, transparent non-touching edges, exact base row61, lower support centered within32±10, bounded recorded face/hat anchors, ≤52colors, one palette per stage, and no repeated frames within multi-frame clips. Result: `verification/lilypad-qc.json`; harness `/workspace/work/pvz/runtime-review/check_lilypad.py`.
- No generation rejection or corrective redraw was needed. Runtime/index/progress/shared tools unchanged.
