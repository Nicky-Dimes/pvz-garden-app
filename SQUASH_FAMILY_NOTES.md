# Squash family production notes

## Inspected reference and rules

Actual game reference: https://pvsz2.ru/plant/93

Local inspected source: `PROJECT/art-src/pvz-ai/research/next-plants/squash.png` (also copied to `pvz-garden/_ref/actual/squash-actual.png`). Style source: approved actual Peashooter pixel atlas `exec-fa5d028b-d48a-4089-acb6-9c134d4e10df.png`.

Observed anatomy: lime-green pear-shaped/squat gourd with broad rounded flat ground base, lumpy shoulders/vertical squash ridges, sparse round surface warts and a short thick cut green top stem. Face uses a continuous heavy green-flesh downturned brow, pale eyes with small dark pupils and a pronounced downturned lip/chin. No leaves, roots, pot, arms, legs or feet.

All stages must remain mad, including small idle and every action. Data names remain Squash → Super Squash → Mega Squash. Only base Squash is canonical; later stages naturally add shoulder/gourd mass, deeper lobes, a thicker short stem and larger sparse warts. The project red headband is omitted in favor of canonical anatomy. No substitute humanoid or smiling pear.

## Animation plan

15 drawn frames per stage: idle2, walk4, attack3, hurt1, knockedOut2, cheer2, sleep1. Whole-body walk rocking/bounce replaces legs. Attack source silhouettes are compressed launch crouch → stretched leaning leap/pound → broad flattened landing. All complete bodies fit inside source cells; no landing dust, shadows or detached effects. Runtime maintains the fixed baseline and adds scene motion. Cheer stays fiercely proud, and sleep keeps the angry brow above closed eyes.

Exact generation prompts: `PROJECT/art-src/pvz-ai/animation/squash-family-prompts.json`.

Status: completed source and indexed-art handoff. No shared runtime, index, progress, IDs, game data or saves changed; integration belongs to the main agent.

## Completed artifacts

- `PROJECT/art-src/pvz-ai/animation/squash-{0,1,2}-actual-source.png` — preserved generated source atlases, also copied under `pvz-garden/_ref/animation/`.
- `PROJECT/art-src/pvz-ai/animation/squash-family-spec.json` — reproducible source layout, per-frame face boxes, stage size caps,64px canvas and base61; copy also under `_ref/animation/`.
- `PROJECT/art-src/pvz-ai/animation/squash-family-frames.json` —45 drawn indexed frames ready for main-agent ingestion.
- `PROJECT/art-src/pvz-ai/animation/squash-{0,1,2}-indexed.png` — visually reviewed previews.
- `PROJECT/art-src/pvz-ai/animation/squash-family-provenance.json` — exact source hashes and stage QC metadata.

## Quality review

All three source atlases and three indexed contact sheets were visually inspected. Every stage/action keeps the continuous angry green brow, downturned lip/chin, short cut stem and irregular gourd/wart anatomy. No headband, limbs, feet, leaf pedestal or detached effects were introduced. Attack drawings visibly compress low, stretch/tilt into pound, then flatten broadly on landing; these silhouette changes survive indexing. Sleep and KO retain the angry brow above closed eyes.

All45 local frame checks pass: exact64×64 rows, base61, free frame edges, lower support centered within32±10, finite bounded head anchors and no duplicate hashes. Every one of the15frames in each stage is distinct even across clips. Stage palettes are29/27/25 colors respectively and remain consistent within each stage. Action height ranges are23–38px,26–47px and34–54px, reflecting actual squash/stretch silhouettes rather than rigid body transforms. These checks supplement main-agent ingestion/export/runtime validation.
