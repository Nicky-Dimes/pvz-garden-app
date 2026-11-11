#!/usr/bin/env python3
"""Lightweight asset-dimension/alpha/size validator (stdlib only).

Usage: python3 tools/check-sheets.py /path/to/project/img/hd
- infers plant/zombie/boss from path (adapt once source paths audited)
- does not validate artistic quality or animation semantics
"""
import pathlib, struct, sys

ROOT=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else pathlib.Path('img/hd')
if not ROOT.is_dir():
    sys.exit(f'ERROR: asset directory not found: {ROOT}')
files=sorted(ROOT.rglob('*.png'))
if not files:
    sys.exit(f'ERROR: no PNGs found under {ROOT}')
BAD=0
for p in files:
    raw=p.read_bytes()[:33]
    if not raw.startswith(b'\x89PNG\r\n\x1a\n') or len(raw)<26:
        print('FAIL invalid PNG:',p);BAD+=1;continue
    w,h=struct.unpack('>II',raw[16:24]); color=raw[25]
    size=p.stat().st_size
    problems=[]
    if size>8*1024*1024: problems.append(f'{size} bytes > 8MiB')
    if color not in (4,6): problems.append(f'PNG color-type {color} not directly alpha-capable (need RGBA or gray-alpha)')
    path=p.as_posix().lower()
    if '/plants/' in path and (w,h)!=(1024,512): problems.append(f'plant sheet {w}x{h}, expected 1024x512')
    elif '/zombies/' in path and (w,h)!=(768,512): problems.append(f'zombie sheet {w}x{h}, expected 768x512')
    elif '/boss' in path and (w,h) not in ((384,384),(768,384)): problems.append(f'boss PNG {w}x{h}; expected frame 384x384 or two-frame 768x384, verify source loader')
    if problems:
        BAD+=1; print('FAIL',p,'; '.join(problems))
    else: print('PASS',p.relative_to(ROOT),f'{w}x{h}',f'{size//1024}KiB')
print(f'Checked {len(files)} PNG files; {BAD} failed')
sys.exit(bool(BAD))
