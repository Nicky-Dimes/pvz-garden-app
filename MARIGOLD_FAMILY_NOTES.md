# Marigold family production

Status: complete;45indexed frames frozen for parent integration. No runtime registration by this task.

## Inspected references

- Canonical Marigold render from game wiki gallery: https://plantsvszombies.fandom.com/wiki/Marigold/Gallery ; image https://vignette.wikia.nocookie.net/plantsvszombies/images/3/32/Marigold_HD.png/revision/latest?cb=20140924172255 . Saved/visually inspected `PROJECT/art-src/pvz-ai/research/marigold/marigold-actual.png`.
- Observed white rounded petal ring with pale-cyan shadows, round warm golden face, green arched brows, blue/dark oval eyes, smiling small mouth with a white front tooth, thin green stem and paired broad base leaves. It is not a yellow-petaled sunflower.
- Canonical Gold Bloom: https://pvsz2.ru/plant/35 ; full image https://pvsz2.ru/statics/plants-big/35.png . Saved/visually inspected `.../research/marigold/gold-bloom-actual.png`.
- Gold Bloom has distinct actual anatomy: three tall green stalks carry angular folded gold buds over a low green bulb face with large pale-ringed eyes and small smile, on dark green pointed base leaves. It is not simply a larger white Marigold. Gold-bright material is represented by opaque pixel ramps, no surrounding halo/effects.
- URL records in `.../research/marigold/references.json`; reference copies under `PROJECT/pvz-garden/_ref/actual/`.

## Canonical versus custom progression

- Stage0 Marigold uses canonical white petals/golden face. Stage1 Gold Bloom corresponds to the canonical distinct plant and uses its own inspected reference/anatomy.
- Stage2 Golden Marigold is a project extension of the Marigold identity: two fuller white/cream rounded petal rings, restrained champagne-gold petal edging, warm gold smiling face and fuller green leaf base. No literal royal crown, humanoid queen or sunflower substitution.
- Family remains friendly/cute, with no feet/human limbs. Walk uses leaf/root scoots and stem motion. Support attack uses compression/opening/return of petals or gold buds, with no detached coins, rays or projectiles. Explicit row/column pose assignments require hurt at row2col5, KO at row3cols1/2, happy-eye cheer at row3cols3/4 and fully closed sleep eyes at row3col5.
- Parent owns registry/index/ingestion. This task owns only this family's sources, metadata, frames, ready marker and notes.

## Final files and QC

- `PROJECT/art-src/pvz-ai/animation/marigold-family-{spec,frames,prompts}.json`; final sources `marigold-{0,1,2}-actual-source.png`, all three indexed previews and `_ref/animation/` copies.
- All source/indexed sheets visually inspected. Canonical Gold Bloom has its own bulb-face head anchors at the base, not anchors on its three golden buds. Other stages use golden flower-face anchors. Row2col5 hurt, row3cols1/2 closed-eye KO, row3cols3/4 happy crescent-eye cheer, and row3col5 closed-eye sleep are correct.
- All45frames passed64x64, transparent margins, exact base61, centered lower support32±10, bounded recorded head/hat anchors, ≤52colors with one per-stage palette, and unique frames within each multi-frame clip. Result `verification/marigold-qc.json`; harness `/workspace/work/pvz/runtime-review/check_family.py marigold`.
- No generation rejection, corrective redraw or runtime/tool edits. Actual Gold Bloom anatomy intentionally replaces the old enlarged-white-daisy stage1 baseline under the user's canonical-art direction.
