# Tangle Kelp family production notes

## Inspected actual-game reference

- Source page: https://pvsz2.ru/plant/103 . Community-hosted actual game render.
- Image URL: https://pvsz2.ru/statics/plants-big/103.png .
- Local research file: `/workspace/work/pvz/research/tanglekelp-actual.png`; development reference copy at `PROJECT/pvz-garden/_ref/actual/tanglekelp-actual.png`.
- Observed anatomy: a low dark teal leafy face/root bundle with red almond eyes and narrow black pupils. Long pointed green/olive flat ribbon fronds cross and sweep upward above the face, casting dark teal strips; curled side leaf tendrils arise from the same base. The face peeks low beneath overlapping forehead fronds. No separate mouth, animal torso, suction cups, feet or container.
- The actual render supplies identity. Runtime art is original generated rich pixel art, using the approved Peashooter source as rendering/layout style reference.

## Stage decisions

- `tanglekelp` stage0 Tangle Kelp: canonical low peeking face, three dominant tall tapered kelp ribbons and short side curls.
- Stage1 Snap Kelp: natural project evolution with four main ribbons, including two longer inward hooked tips above face, stronger leafy base and short side curls. Hooks are flat leaves, not jaws or claws.
- Stage2 Kraken Kelp: natural project evolution with a dense six/seven-frond crown, elegant ribbon loops and side curls. It remains a seaweed bundle; do not substitute a literal octopus/kraken animal or gold royal crown.
- Preserve muted red eyes while keeping calm/curious expression. No mouth, nose, beak, teeth, animal limbs, legs or feet. No water patch, bubbles, shadow or ground is drawn into source sprites.

## Animation production

Three 5×3 source sheets are generated with 15 poses each: idle2, walk4, attack3, hurt1, knockedOut2, cheer2, sleep1. Walk uses rooted kelp shuffles and ribbon flex. Attack coils leaves back, reaches/loops flat fronds right, then loosens into recovery. KO/sleep settles into a low folded kelp bundle; all appendages remain attached plants. No detached effects/projectiles.

No index, registry ingestion, runtime, data/save, or shared progress changes are owned by this agent.

## Final sources and preserved drafts

- Stage0 final source: `PROJECT/art-src/pvz-ai/animation/tanglekelp-0-actual-source.png` (exec-fc457695-a026-403f-86b7-b349b88f271b.png).
- Stage1 final source: `PROJECT/art-src/pvz-ai/animation/tanglekelp-1-actual-source.png` (exec-5620c76c-52ad-40bc-b019-79c279757b03.png).
- Stage2 final source: `PROJECT/art-src/pvz-ai/animation/tanglekelp-2-actual-source.png` (exec-4654e8b1-0ebb-4888-8ba8-346ac6b4689f.png).
- Initial stage0 and two earlier stage2 drafts remain in the same source directory with `initial-draft` / `evolution-draft` filenames. They are not production sources.
- The initial final-stage draft looked too close to the basic form. It was revised into a distinct fuller six-frond fan with curled tips. A few long source fronds initially crossed source cell boundaries; stages0/2 were re-rendered with generous margins. Final source-cell boundary checks show no green artwork crossing any of the15cell edges in each stage.

## Conversion and head anchors

- Main face bounds are measured from each source frame's red-eye region with a small surrounding dark-leaf margin; tall crown fronds are excluded from the face/hat anchor.
- Enclosed cream gaps between fronds are cleared with explicit source-background flood seeds, using the original converter's70color-distance threshold. Seeds are restricted above the eye region so real eye highlights are preserved.
- The original browser converter performs cutting, palette indexing, source scaling and row61 base placement. No drawing is generated procedurally.

## Final review

All final source sheets and indexed sheets were visually inspected. The canonical low red-eyed teal leaf bundle survives indexing, and the final broad curled crown is clearly distinct from earlier stages. All poses use attached flat leaf ribbons; no water patch, animal torso, suction cups or human limbs. The larger final crown is width-limited and therefore naturally shorter vertically than the maximum54px ceiling.

Self-assessment: **good** Tangle Kelp; **good** Snap Kelp (subtle anatomy growth); **good** Kraken Kelp (distinct wider curled fan). Some fine leaf planes simplify at64px, as expected.

No runtime/index/ingestion/shared progress files were changed. Main agent owns integration.

Validation:45unique nonempty64×64frames, safe canvas edges, base61, support-center within10px, fixed per-stage palettes and bounded recorded head anchors. Detailed metrics: `PROJECT/art-src/pvz-ai/animation/tanglekelp-family-qc.json`.
