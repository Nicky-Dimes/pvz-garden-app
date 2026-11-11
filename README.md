# PVZ Garden

Frozen art and animation checkpoint for the PVZ Garden browser game.

Start with [CLAUDE_RESUME.md](CLAUDE_RESUME.md) for the implementation status, validation results, and remaining work. [CLAUDE_START_PROMPT.txt](CLAUDE_START_PROMPT.txt) contains the continuation prompt.

This checkpoint includes 1,975 drawn animation frames across 139 looks: 36 plant families, 19 zombies, and 12 bosses. The art production queue is frozen for handoff.

## Play locally

From the repository root, run:

```sh
python3 -m http.server 8000 --directory PROJECT/pvz-garden
```

Open http://localhost:8000 in your browser.

## Validate

With Node.js installed, run:

```sh
cd PROJECT
node tools/check_animation.js
node tools/v2_export.js --no-write
```

The original source artwork is included under `PROJECT/art-src` and the reference folders. The redundant development mirrors are included so the default validation checks can run directly.

## Downloadable handoff

Download the packaged checkpoint, playable build, and original-art ZIPs from the [GitHub Release](https://github.com/Nicky-Dimes/pvz-garden-app/releases/tag/checkpoint-2026-11-11). A second copy is in [OneDrive](https://onedrive.live.com?cid=0C315480C80B53CB&id=C315480C80B53CB!sa644776c30744a839b75e582b9f5b60e). Source art is supplied as five ordinary ZIPs; extract all five into the same destination.
