# Runtime animation review

Changes delegated and completed in `garden.js`, `arcade.js`, `sprouts.js` before switching to Cactus art production.

- Garden costumed zombies now use normalized drawn poses before `eventZombie`'s finite cache. This permits all four walk frames, action progress and recorded per-frame costume head positioning.
- Almanac zombie tap/groan supplies elapsed progress for the nonloop attack clip.
- Arcade zombie helpers supply attack progress from existing Whack/Vase/Catcher timers, with repeating bites for persistent open-mouth displays. Gold zombie and Explode-o-nut tint caches use source-canvas identity so their new drawn frames are preserved.

Observed before/after browser results, isolated `?save=runtimeagent` save:

- Almanac attack frames: `[0]` before, `[0,1,2]` after over a tap response.
- Garden costume event calls: two cached captures before; after, repeated finite-cached sprite selection showed all `[0,1,2,3]` walk frames.
- No browser page errors in these probes.
- Three modified JavaScript files parse; `check_animation.js` passed 19 looks / 211 drawn frames at the time of the change.

A later synthetic Whack fixture did not emit attack traces because its test monster was not retained through initial layout. That fixture failed and is not claimed as passing verification. Parent subsequently reported consolidated full-suite and focused-browser passes. No family save was read or edited.

Artifacts: `probe-before.json`, `probe.json`, `garden-costume-probe.png`, test harness `/workspace/work/pvz/runtime-review/probe.py`.
