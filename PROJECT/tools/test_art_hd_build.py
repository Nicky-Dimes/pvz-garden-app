#!/usr/bin/env python3
"""Regression test for shipping illustrated sprite sheets with tools/build_pvz.py (no real artwork needed).

  python3 tools/test_art_hd_build.py

Builds copies of pvz-garden/ into throwaway folders (pvz-garden/ and pvz-garden-app/ are never touched), with synthetic
test sheets (plain transparent PNGs of the right size: test fixtures, not artwork), and checks that:
  1. with no registered sheets the build ships no images, and stray/draft images change nothing (not even the version hash);
  2. registered, valid sheets are copied and added to the offline cache list, drafts and unregistered images are not;
  3. a wrong size, no transparency, a missing file, wrong capitals, a registered draft or a non-image stops the build
     before the output folder is touched;
  4. tools/art_hd_check.js rejects unknown plant / zombie ids and bad stages (the check tools/check_pvz.js runs).
"""
import importlib.util
import json
import os
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REAL_SRC = os.path.join(ROOT, 'pvz-garden')
MANIFEST = """window.PVZ_HD_MANIFEST = Object.freeze({
  plants: { sunflower: { 0: 'img/hd/plants/sunflower/stage-0.png', 1: 'img/hd/plants/sunflower/stage-1.png', 2: 'img/hd/plants/sunflower/stage-2.png' } },
  zombies: { basic: 'img/hd/zombies/basic.png' },
});
"""
EMPTY = "window.PVZ_HD_MANIFEST = Object.freeze({ plants: {}, zombies: {} });\n"
failures = []


def png(path, w, h, alpha=True):
    """A plain test sheet: transparent (or white, if alpha=False), one opaque mark per 256 cell. Not artwork."""
    bpp = 4 if alpha else 3
    rows = []
    for y in range(h):
        row = bytearray(w * bpp) if alpha else bytearray(b'\xff' * (w * bpp))
        if y % 256 == 200:
            for x in range(0, w, 256):
                row[(x + 128) * bpp:(x + 129) * bpp] = bytes([200, 60, 60, 255][:bpp])
        rows.append(b'\x00' + bytes(row))
    def chunk(t, c):
        return struct.pack('>I', len(c)) + t + c + struct.pack('>I', zlib.crc32(t + c) & 0xffffffff)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6 if alpha else 2, 0, 0, 0))
                + chunk(b'IDAT', zlib.compress(b''.join(rows), 9)) + chunk(b'IEND', b''))


def load_builder():
    spec = importlib.util.spec_from_file_location('build_pvz_under_test', os.path.join(ROOT, 'tools', 'build_pvz.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def fresh_src(tmp, name):
    src = os.path.join(tmp, name, 'pvz-garden')
    shutil.copytree(REAL_SRC, src, ignore=shutil.ignore_patterns('.git', '.DS_Store'))
    return src


def build(src, out):
    """Run the real build on a copy (checks skipped: they read the real source; the sheet validation still runs).
    Returns (ok, message, version)."""
    mod = load_builder()
    mod.SRC, mod.OUT = src, out
    argv, sys.argv = sys.argv, ['build_pvz.py', '--skip-checks']
    try:
        import io, contextlib
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            mod.main()
        text = buf.getvalue()
        m = re.search(r"Built PVZ Garden (\S+)", text)
        return True, text, (m.group(1) if m else None)
    except SystemExit as e:
        return False, str(e.code), None
    finally:
        sys.argv = argv


def sw_assets(out):
    sw = open(os.path.join(out, 'sw.js'), encoding='utf-8').read()
    return json.loads(re.search(r'const ASSETS = (\[.*?\]);', sw).group(1))


def shipped_images(out):
    found = []
    for folder, _, files in os.walk(os.path.join(out, 'img')):
        for f in files:
            found.append(os.path.relpath(os.path.join(folder, f), out).replace(os.sep, '/'))
    return sorted(found)


def expect(cond, what):
    print(('  ✓ ' if cond else '  ✗ ') + what)
    if not cond:
        failures.append(what)


def main():
    tmp = tempfile.mkdtemp(prefix='pvz-arthd-build-')
    try:
        sheets = ['img/hd/plants/sunflower/stage-0.png', 'img/hd/plants/sunflower/stage-1.png',
                  'img/hd/plants/sunflower/stage-2.png', 'img/hd/zombies/basic.png']

        print('1. No registered sheets')
        src = fresh_src(tmp, 'a')
        open(os.path.join(src, 'art-hd-manifest.js'), 'w').write(EMPTY)
        ok, msg, v1 = build(src, os.path.join(tmp, 'a-out'))
        expect(ok, 'builds')
        expect(not os.path.exists(os.path.join(tmp, 'a-out', 'img')), 'ships no img/ folder')
        expect(not any(a.startswith('img/') for a in sw_assets(os.path.join(tmp, 'a-out'))), 'no images in the offline cache list')
        png(os.path.join(src, 'img/hd/plants/peashooter/stage-0.png'), 1024, 512)   # unregistered
        png(os.path.join(src, 'img/hd/_drafts/sunflower-v2.png'), 1024, 512)        # draft folder
        png(os.path.join(src, 'img/hd/zombies/_try.png'), 768, 512)                 # draft file
        ok, msg, v2 = build(src, os.path.join(tmp, 'a2-out'))
        expect(ok and not os.path.exists(os.path.join(tmp, 'a2-out', 'img')), 'stray and draft images ship nothing')
        expect(v1 and v2 and v1.split('-')[-1] == v2.split('-')[-1], f'version hash unchanged by unregistered images ({v1} / {v2})')

        print('2. Registered, valid sheets')
        open(os.path.join(src, 'art-hd-manifest.js'), 'w').write(MANIFEST)
        for p in sheets:
            png(os.path.join(src, p), 768 if 'zombies' in p else 1024, 512)
        out = os.path.join(tmp, 'b-out')
        ok, msg, v3 = build(src, out)
        expect(ok, 'builds')
        expect(shipped_images(out) == sorted(sheets), 'ships exactly the 4 registered sheets (no drafts, no unregistered files)')
        assets = sw_assets(out)
        expect(all(p in assets for p in sheets), 'all 4 sheets are in the offline cache list')
        expect(not any('_' in a.split('/')[-1][:1] or '/_' in a for a in assets if a.startswith('img/')), 'no draft paths in the cache list')
        expect('not registered' in msg and 'peashooter' in msg, 'notes the unregistered file')
        expect(v3 and v3.split('-')[-1] != v1.split('-')[-1], 'the version hash changes when sheets ship')
        expect(os.path.isfile(os.path.join(out, 'sw.js')) and 'self.addEventListener(\'fetch\'' in open(os.path.join(out, 'sw.js')).read(), 'service worker still generated')

        print('3. Bad sheets stop the build before the output folder is touched')
        cases = [
            ('wrong size', lambda s: png(os.path.join(s, sheets[0]), 1000, 512), 'must be exactly 1024 x 512'),
            ('zombie sheet sized like a plant sheet', lambda s: png(os.path.join(s, sheets[3]), 1024, 512), 'must be exactly 768 x 512'),
            ('no transparency', lambda s: png(os.path.join(s, sheets[1]), 1024, 512, alpha=False), 'no transparency'),
            ('missing file', lambda s: os.remove(os.path.join(s, sheets[2])), 'missing'),
            ('wrong capitals', lambda s: os.rename(os.path.join(s, sheets[3]), os.path.join(s, 'img/hd/zombies/Basic.png')), 'missing'),
            ('registered draft', lambda s: open(os.path.join(s, 'art-hd-manifest.js'), 'w').write(MANIFEST.replace("'img/hd/zombies/basic.png'", "'img/hd/zombies/_basic.png'")), 'not a valid sheet path'),
            ('not an image', lambda s: open(os.path.join(s, sheets[0]), 'w').write('hello'), 'not a readable PNG'),
            ('webp name, png bytes', lambda s: (os.rename(os.path.join(s, sheets[0]), os.path.join(s, sheets[0][:-4] + '.webp')),
                                                 open(os.path.join(s, 'art-hd-manifest.js'), 'w').write(MANIFEST.replace('stage-0.png', 'stage-0.webp'))), 'really a PNG'),
        ]
        for i, (name, breakit, want) in enumerate(cases):
            s = fresh_src(tmp, f'c{i}')
            open(os.path.join(s, 'art-hd-manifest.js'), 'w').write(MANIFEST)
            for p in sheets:
                png(os.path.join(s, p), 768 if 'zombies' in p else 1024, 512)
            breakit(s)
            out = os.path.join(tmp, f'c{i}-out'); os.makedirs(out); open(os.path.join(out, 'SENTINEL'), 'w').write('x')
            ok, msg, _ = build(s, out)
            expect(not ok and want in msg and os.listdir(out) == ['SENTINEL'], f'{name}: stops ("{want}"), output untouched')

        print('4. Data checks in tools/art_hd_check.js (run by check_pvz.js)')
        s = fresh_src(tmp, 'd')
        for p in sheets:
            png(os.path.join(s, p), 768 if 'zombies' in p else 1024, 512)
        open(os.path.join(s, 'art-hd-manifest.js'), 'w').write(MANIFEST.replace('sunflower:', 'sunflowr:').replace('basic:', 'basicc:').replace("2: 'img", "3: 'img"))
        js = ("const r=require(process.argv[1]).check(process.argv[2],{plants:new Set(['sunflower']),zombies:new Set(['basic'])});"
              "process.stdout.write(JSON.stringify(r.problems))")
        res = subprocess.run(['node', '-e', js, os.path.join(ROOT, 'tools', 'art_hd_check.js'), s], capture_output=True, text=True)
        probs = json.loads(res.stdout or '[]')
        expect(any('"sunflowr" is not a PVZ Garden plant' in p for p in probs), 'unknown plant id is caught')
        expect(any('"basicc" is not a PVZ Garden zombie' in p for p in probs), 'unknown zombie id is caught')
        expect(any('stage 3' in p for p in probs), 'a stage other than 0-2 is caught')
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print('\nAll build tests passed.' if not failures else f'\n{len(failures)} build test(s) failed.')
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()
