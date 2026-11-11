# PVZ Garden — running the game and its checks

Nothing to install except **Node.js 18 or newer** (checked here with Node 26) and
Python 3 for the local web server and the build script. No npm packages.

All commands run from the `PROJECT/` folder.

## Play it

```bash
python3 -m http.server 8770 --directory pvz-garden
```

Open `http://localhost:8770`. Useful pages on the same server: `_all-art.html` and
`_art-gallery.html` (every character), `_ai-templates.html` (sheet templates),
`_ai-slice.html` (cut a finished sheet into sprites), `_art-compare.html`.

Example saves for testing are in `tools/test-saves/pvz-*.json` (they are the contents
of the game's `localStorage` save keys; how to load one was not re-checked for this
handoff).

## Check it

```bash
node tools/check_pvz.js        # the full check; ends with "All checks passed."
node tools/v2_export.js        # frame checks for the 64x64 sprites
```

`check_pvz.js` is the gate. Results on this snapshot, run on 2026-11-11 from a copy of
this package: `check_pvz.js` **All checks passed.**; `v2_export.js` **108 sheets, 864
frames, 36 plants, all frames pass.** (`tools/check_art_ids.js <id,...>` is a quick
per-character art check for use while drawing.)

## Convert finished sheets into sprites

```bash
python3 -m http.server 8770 --directory pvz-garden      # keep running in another terminal
node tools/ai_process.js "../ART_PIPELINE/sheets"
node tools/v2_export.js
node tools/check_pvz.js
```

`ai_process.js` drives headless Google Chrome at
`/Applications/Google Chrome.app` (macOS path). On another system, open
`http://localhost:8770/_ai-slice.html` in a browser to slice by hand; `ai_ingest.js`
then takes the sliced JSON (`node tools/ai_ingest.js sheet-NN.json`). The by-hand
route was not re-checked for this handoff.

## Build the publishable site (do not publish)

```bash
python3 tools/build_pvz.py
```

Runs the check first and stops on failure; writes `pvz-garden-app/` next to
`pvz-garden/`. The family reviews and publishes that folder themselves.
