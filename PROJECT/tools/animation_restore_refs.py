#!/usr/bin/env python3
"""Restore development-only source mirrors after extracting the source-art archive."""
import json
import shutil
from pathlib import Path

root = Path(__file__).resolve().parents[1]
game = root / 'pvz-garden'
count = 0
seen = set()
for file in sorted((root / 'art-src/pvz-ai/animation').glob('*-spec.json')):
    for spec in json.loads(file.read_text()):
        source = (root / spec['source']).resolve()
        target = (game / spec['src']).resolve()
        if not target.is_relative_to(game / '_ref'):
            raise ValueError('Development mirror must be under _ref: ' + str(target))
        if source.exists() and target not in seen:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
            seen.add(target)
            count += 1
print(f'Restored {count} development source mirrors.')
