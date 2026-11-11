# Snapdragon family — actual-game redraw

Owner: `potatomine_family` production queue. Existing `snapdragon*` animation artifacts were checked before generation; none were present. No queue, runtime, index, game data, saves or shared progress files are edited by this batch.

## Visually inspected actual reference

- Page: https://pvsz2.ru/plant/85 .
- Actual render: https://pvsz2.ru/statics/plants-big/85.png .
- Saved reference: `PROJECT/art-src/pvz-ai/research/owner-potatomine-queue/snapdragon.png`.
- Approved pixel style/layout: `/workspace/generated_images/exec-fa5d028b-d48a-4089-acb6-9c134d4e10df.png`.

The inspected game identity differs from the old simplified lime dragon description: its head is olive/yellow-green, it has two pale-yellow crown horns and a prominent single snout horn, a broad nostrilled upturned snout, strong green lips with visible ivory fangs, yellow eyes with reddish slit pupils, a jagged orange rear neck frill, thin crooked thorny olive stalk, and orange basal leaves. It is a dragon-flower plant rather than a small animal dragon on legs. These features guide the new art.

The actual render has a stern narrowed gaze. The project's explicit friendly default is retained through calmer relaxed brows and warm alert eyes/toothy grin while preserving characteristic horn/snout/fang/eye anatomy. No arms, legs, feet, shoes, wings, animal torso, costumes, floating fire mane, detached effects or generic pea muzzle.

## Canonical and custom stages

IDs/stage names remain `snapdragon` 0 Snapdragon, 1 Dragon Snap, 2 Inferno Dragon. Only Snapdragon is canonical here. Custom evolutions extend jaw strength, crown/snouthorn size, layered orange frill, thorny stalk and orange leaf base naturally. Inferno's broader orange/red-orange fin-frill crown remains attached leaf/frill anatomy, not a king crown or a new fire head.

## Animation/import

Each source has exactly15 full poses in5columns ×3rows. Row1: idleA,idleB,walk1,walk2,walk3. Row2: walk4,attackwindup,attackstrike,attackrecovery,hurt. Row3: KO1,KO2,cheer1,cheer2,sleep. Walking uses leaf scoots and stalk flex. Attack draws the head back and opens the jaw, thrusts it right with fangs/tongue visible, then recovers. Separate breath/projectile effects belong to the game. KO and sleep keep the curved stalk attached while the head droops onto orange leaves.

Conversion target:64×64, base61, max heights38/46/54 and width56. Head boxes will track dragon skull/jaw, excluding basal leaves and the lower stalk.

Status: COMPLETE — all source atlases and indexed sheets visually reviewed. Exactly15poses per5×3 sheet, clear dragon-head/horn/snout/fang/frill identity, thin attached thorny stalk, orange basal leaves and no animal/human limbs. Initial source defaults copied the actual render's stern downturned expression; all3 stages received targeted image_gen facial corrections to kind open yellow eyes, relaxed arched brows, upward toothy smiles and happy cheer expressions. Anatomy/action poses remained intact. Stern originals are preserved separately and excluded from spec.

All45 indexed frames pass64×64 dimensions, clear edges, exact base61, lower-base center32±10, stable per-stage palettes25/26/26, bounded finite head geometry and distinct frames in every multi-frame clip. QC: `PROJECT/art-src/pvz-ai/animation/snapdragon-family-qc.json`.

Stable files under `PROJECT/art-src/pvz-ai/animation/`: `snapdragon-family-spec.json`, `snapdragon-family-frames.json`, `snapdragon-{0,1,2}-actual-source.png` plus matching `_ref/animation` copies, and `snapdragon-{0,1,2}-indexed.png`. Frames SHA256 `938c961f68785ca1b09d7175ac5e94af87f10d5fcaf1e55aaeebe6cd4ada71d6`.

Final preserved sources: stage0 `/workspace/generated_images/exec-2326538b-1798-473f-b491-ce6074567b1a.png`; stage1 `/workspace/generated_images/exec-13146be4-07eb-4640-9228-3dfb29169999.png`; stage2 `/workspace/generated_images/exec-2abfcee0-445c-40d1-8a5c-205cced5db8d.png`. No resource rejection occurred. Only base Snapdragon is canonical; both named later stages are project extensions of that inspected reference. No runtime/index/queue/shared-progress edits or ingestion. Files frozen at ready-marker handoff; main owns integration and gameplay/costume checks.
