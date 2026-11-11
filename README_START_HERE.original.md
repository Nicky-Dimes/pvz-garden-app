# PVZ Garden — complete project handoff for an art pass

Prepared 2026-11-11. This is the real, current PVZ Garden project: a private family
fan game (a garden-pet game with battles, races, a lane-defence mode and an arcade)
played in the browser on iPad and iPhone. The code is finished and checked. **The art is
what needs work.**

Git snapshot of this exact state: branch `pixel-art-64`, tag `handoff-2026-11-11`.

## Read in this order

1. `CHATGPT_HANDOFF.md` — what to do first, what must not break, what to send back.
2. `DEVELOPMENT_STATUS.md` — what works, where the art stands, known problems.
3. `ART_CONTRACT.md` — the exact sizes, anchors, file formats and tools for new art.
4. `PROJECT_ARCHITECTURE.md` — how the code is organised.
5. `SETUP_AND_CHECKS.md` — how to run the game and its checks (Node only, no installs).

## What is in this package

| Folder | What it is |
|---|---|
| `PROJECT/pvz-garden/` | the game's source: plain HTML, CSS and JavaScript, no build step needed to run |
| `PROJECT/tools/` | checks, the build script, and the art tools (sheet templates, slicing, ingest) |
| `PROJECT/docs/` | the family's art guides, the approved style reference, review logs, earlier art audits |
| `ART_PIPELINE/sheets/` | the sheet templates and prompts already prepared, and the results received so far |
| `PROJECT/art-src/pvz-ai/` | the original pictures the current new sprites were cut from, and the sliced results |

Not included because they are rebuilt: the published site folder (`pvz-garden-app/`,
made by `tools/build_pvz.py`), backups, and Git history.

## Art direction

The look the family approved is `PROJECT/docs/pvz-final-handoff/.../references/01_*` and
`ART_PIPELINE/sheets/STYLE-approved-reference.png`: bright 16-bit kawaii pixel art with
navy-purple outlines, three to five tones of cel shading and light from the upper left.
The family's own rules for individual characters (which ones look cross, which have no
mouth, and so on) are in `PROJECT/docs/pvz-v2-art-guide.md` section 6 and
`PROJECT/docs/pvz-art-guide.md`. Those files are the creative brief; this handoff adds
the technical side.

## One thing to know about the game's characters

PVZ Garden is themed on an existing commercial game. It is a private family project and
cannot be sold or monetised in this form. If the family ever wants that, the cast and
names would need to become original; the code does not care what the characters are.
