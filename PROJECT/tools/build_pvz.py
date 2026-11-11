#!/usr/bin/env python3
"""Build the installable PVZ Garden web app (for GitHub Pages) from the game source.

  source:  pvz-garden/        (the game)
  output:  pvz-garden-app/    (a standalone site: full HTML page, app manifest, icons, offline service worker)

Run from anywhere:   python3 tools/build_pvz.py
Then publish the pvz-garden-app/ folder (see pvz-garden-app/README.md).

PVZ Garden can live on the same github.io address as Solunar Sprouts without the two touching: its saves use "pvzg:"
storage keys, its offline cache is named "pvzg-app-...", and backup codes start with PVZGARDEN1.

Every build gets a new version stamp. Installed copies notice the new service worker, download the new files,
and offer "Update now". Player saves live in the phone's storage for the site's address, so they carry over.

Before building, tools/check_pvz.js runs (needs Node): it checks every script parses, the content tables, that every
plant/zombie/seed packet/icon draws, and that current and damaged saves load without losing progress. The build stops
if it fails. (Emergency only: `python3 tools/build_pvz.py --skip-checks`.)
"""
import datetime
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'pvz-garden')
OUT = os.path.join(ROOT, 'pvz-garden-app')

APP_NAME = 'PVZ Garden'
SHORT_NAME = 'PVZ Garden'        # label under the Home Screen icon (iOS shows about 12 characters)
THEME = '#5cb43a'
BACKGROUND = '#78c850'
CACHE_PREFIX = 'pvzg-app-'    # must differ from Solunar's 'solunar-app-': both sites can share one github.io origin

# Files copied as-is (version.js is generated). Anything starting with "_" is a scratch file and never shipped.
COPY_EXT = ('.js', '.css')
SKIP = {'version.js'}
KEEP_IN_OUT = {'.git', 'README.md', 'CNAME', '.gitignore', '.gitattributes'}  # never deleted when rebuilding

# Illustrated art (img/hd/...): ONLY the sprite sheets registered in pvz-garden/art-hd-manifest.js ship, and only after
# tools/art_hd_check.js has validated them (registered path, exact spelling, PNG/WebP with transparency, exact sheet size).
# Drafts (any file or folder starting with "_") and unregistered files under img/ are never copied or cached. Any problem stops
# the build before pvz-garden-app/ is touched -- also with --skip-checks. No registered sheets = the build is exactly as before.
_image_cache = None

def image_assets():
    """The validated image paths to ship (relative to SRC, sorted). Exits the build on any problem."""
    global _image_cache
    if _image_cache is not None:
        return _image_cache
    manifest = os.path.join(SRC, 'art-hd-manifest.js')
    if not os.path.isfile(manifest) or not re.search(r"""['"]img/""", _strip_js_comments(open(manifest, encoding='utf-8').read())):
        _image_cache = []  # nothing registered (or no manifest at all): ship no images
        return _image_cache
    node = shutil.which('node')
    if not node:
        sys.exit('Node.js is needed to check the illustrated sprite sheets (tools/art_hd_check.js).')
    script = ("const r = require(process.argv[1]).check(process.argv[2]);"
              "process.stdout.write(JSON.stringify({ files: r.files, problems: r.problems, notes: r.notes }));")
    res = subprocess.run([node, '-e', script, os.path.join(ROOT, 'tools', 'art_hd_check.js'), SRC],
                         capture_output=True, text=True)
    if res.returncode != 0:
        sys.exit('Build stopped: the sprite-sheet check crashed:\n' + (res.stderr or res.stdout))
    out = json.loads(res.stdout)
    for note in out['notes']:
        print('  note: ' + note)
    if out['problems']:
        sys.exit('Build stopped: fix the illustrated sprite sheets first. Nothing was changed in pvz-garden-app/.\n  - '
                 + '\n  - '.join(out['problems']))
    _image_cache = out['files']
    return _image_cache


def _strip_js_comments(code):
    return re.sub(r'//[^\n]*', '', re.sub(r'/\*.*?\*/', '', code, flags=re.S))


def run_checks():
    """Run tools/check_pvz.js; stop the build if anything fails (a broken file would be cached offline on every device)."""
    if '--skip-checks' in sys.argv:
        print('WARNING: skipping pre-publish checks (--skip-checks)')
        return
    node = shutil.which('node')
    if not node:
        sys.exit('Node.js is needed for the pre-publish checks (tools/check_pvz.js). Install it, or run with --skip-checks.')
    result = subprocess.run([node, os.path.join(ROOT, 'tools', 'check_pvz.js')])
    if result.returncode != 0:
        sys.exit('Build stopped: fix the problems above first. Nothing was changed in pvz-garden-app/.')


def content_version():
    """Date + a short fingerprint of the shipped files, so two builds a minute apart still get different versions."""
    h = hashlib.sha1()
    for name in sorted(os.listdir(SRC)):
        p = os.path.join(SRC, name)
        if name.startswith('_') or name in SKIP or not (name.endswith(COPY_EXT) or name == 'index.html'):
            continue
        h.update(name.encode())
        with open(p, 'rb') as f:
            h.update(f.read())
    for name in sorted(os.listdir(os.path.join(SRC, 'icons'))):
        with open(os.path.join(SRC, 'icons', name), 'rb') as f:
            h.update(f.read())
    for rel in image_assets():
        h.update(rel.encode('utf-8'))
        with open(os.path.join(SRC, *rel.split('/')), 'rb') as f:
            for chunk in iter(lambda: f.read(1024 * 1024), b''):
                h.update(chunk)
    return datetime.datetime.now().strftime('%Y.%m.%d-%H%M') + '-' + h.hexdigest()[:6]


README = """# PVZ Garden

A pixel-art plant-raising game for iPhone and iPad (a private family fan game inspired by Plants vs. Zombies),
installed from Safari as a Home Screen app.

This folder is the **built site**. Don't edit files here by hand. The game source lives in `../pvz-garden/`, and
`python3 ../tools/build_pvz.py` rebuilds this folder (it keeps this README).

## One-time setup (about 10 minutes)

1. In **GitHub Desktop**, choose **File › Add Local Repository…** and pick this `pvz-garden-app` folder.
   It will offer to **create a repository** here: do that, type "First version" in the summary box, click
   **Commit to main**, then click **Publish repository**. Keep the name `pvz-garden-app` and untick
   **Keep this code private** (free GitHub Pages sites need a public repository).
2. On github.com, open the repository, then **Settings › Pages**. Under **Build and deployment** choose
   **Deploy from a branch**, branch **main**, folder **/ (root)**, and **Save**.
3. After a minute or two the page shows the address, like `https://<your-name>.github.io/pvz-garden-app/`.

It sits next to Solunar Sprouts on the same github.io address without touching it: the two games keep separate
saves, separate offline copies and separate backup codes.

## Installing on each iPhone or iPad

1. Open the address in **Safari**.
2. Tap **Share**, then **Add to Home Screen**, then **Add**.
3. Always launch from the new **PVZ Garden** icon. Progress saved in the Home Screen app is separate from Safari.
4. Each child taps their own card on **Who's playing?**, or **New player**. A new player picks a Peashooter,
   Sunflower or Chomper to start.

## Publishing an update

1. Ask Claude to make changes; Claude runs `python3 tools/build_pvz.py`, which refreshes this folder. It runs
   `tools/check_pvz.js` first; if anything fails the build stops and nothing here changes.
2. In GitHub Desktop, write a short summary, click **Commit to main**, then **Push origin**.
3. Within a few minutes, open phones see "A new version is ready". Saves are kept.

## Keeping progress safe

- **Almanac › Backups** (also on the main menu) makes a backup code (it starts with `PVZGARDEN1`). Keep it in
  Notes or an email; paste it into **Restore** on a new or reset phone.
- Each device also keeps the last three days' saves automatically and brings one back if a save is ever damaged.
- Parent-only actions ask a quick maths question first.

## Good to know

- Works offline after the first launch.
- Deleting the Home Screen icon deletes that app's saved games, so back up first.
- Renaming the repository changes the address, which starts saves from scratch. Restore from backup codes if so.
"""


def main():
    if not os.path.isfile(os.path.join(SRC, 'index.html')):
        sys.exit(f'Cannot find the game source at {SRC}')
    run_checks()
    image_assets()  # validates the registered sprite sheets; exits before anything below is written
    version = content_version()
    os.makedirs(OUT, exist_ok=True)

    # clear old build output, keeping the git repo and hand-written files
    for name in os.listdir(OUT):
        if name in KEEP_IN_OUT:
            continue
        path = os.path.join(OUT, name)
        shutil.rmtree(path) if os.path.isdir(path) else os.remove(path)

    assets = []
    for name in sorted(os.listdir(SRC)):
        if name.startswith('_') or name in SKIP or not name.endswith(COPY_EXT):
            continue
        shutil.copy2(os.path.join(SRC, name), os.path.join(OUT, name))
        assets.append(name)
    shutil.copytree(os.path.join(SRC, 'icons'), os.path.join(OUT, 'icons'))
    assets += ['icons/' + n for n in sorted(os.listdir(os.path.join(SRC, 'icons'))) if not n.startswith('.')]
    # Ship the validated, registered sprite sheets only (never drafts or unregistered files) and put them in the versioned
    # offline precache. Until the first sheets are registered there are none, and the build is exactly as before.
    for rel in image_assets():
        dest = os.path.join(OUT, *rel.split('/'))
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copy2(os.path.join(SRC, *rel.split('/')), dest)
        assets.append(rel)

    with open(os.path.join(OUT, 'version.js'), 'w') as f:
        f.write(f"// Generated by tools/build_pvz.py\nwindow.PVZG_VERSION = '{version}';\n")
    assets.append('version.js')

    # index.html: the source page is a body fragment (the Claude preview adds its own <head>). Give it a full document.
    src_html = open(os.path.join(SRC, 'index.html'), encoding='utf-8').read()
    split = src_html.index('<div id="app">')
    head_part, body_part = src_html[:split], src_html[split:]
    head_part = re.sub(r'<meta charset="utf-8">\s*', '', head_part)
    head_part = re.sub(r'<title>.*?</title>\s*', '', head_part)
    page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{APP_NAME}</title>
{head_part.strip()}
<meta name="theme-color" content="{THEME}">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="{SHORT_NAME}">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="manifest" href="manifest.webmanifest">
<style>#hud{{padding-top:calc(8px + env(safe-area-inset-top, 0px))}}</style>
</head>
<body>
{body_part.strip()}
</body>
</html>
"""
    with open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(page)
    assets = ['./', 'index.html'] + assets

    manifest = {
        'name': APP_NAME, 'short_name': SHORT_NAME, 'id': './', 'start_url': './', 'scope': './',
        'display': 'standalone', 'orientation': 'portrait', 'background_color': BACKGROUND, 'theme_color': THEME,
        'description': 'Grow, fuse, race and battle pixel plants against zombies.',
        'icons': [
            {'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
            {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
            {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
        ],
    }
    with open(os.path.join(OUT, 'manifest.webmanifest'), 'w') as f:
        json.dump(manifest, f, indent=2)
    assets.append('manifest.webmanifest')

    sw = f"""// Generated by tools/build_pvz.py — offline cache for PVZ Garden {version}.
// A new build changes VERSION, so phones download the new files, then the game offers "Update now".
const VERSION = '{version}';
const CACHE = '{CACHE_PREFIX}' + VERSION;
const FONT_CACHE = 'pvzg-fonts';
const ASSETS = {json.dumps(assets)};

self.addEventListener('install', event => {{
  event.waitUntil(caches.open(CACHE)
    .then(cache => cache.addAll(ASSETS.map(u => new Request(u, {{ cache: 'reload' }}))))
    .then(() => self.skipWaiting()));
}});

self.addEventListener('activate', event => {{
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('{CACHE_PREFIX}') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
}});

self.addEventListener('fetch', event => {{
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {{
    if (req.mode === 'navigate') {{
      event.respondWith(caches.match('index.html').then(hit => hit || fetch(req)));
      return;
    }}
    event.respondWith(caches.match(req, {{ ignoreSearch: true }}).then(hit => hit || fetch(req)));
    return;
  }}
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {{
    event.respondWith(caches.open(FONT_CACHE).then(async cache => {{
      const hit = await cache.match(req);
      const net = fetch(req).then(res => {{ if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; }}).catch(() => hit);
      return hit || net;
    }}));
  }}
}});
"""
    with open(os.path.join(OUT, 'sw.js'), 'w') as f:
        f.write(sw)

    open(os.path.join(OUT, '.nojekyll'), 'w').close()  # GitHub Pages: serve files as-is
    if not os.path.exists(os.path.join(OUT, 'README.md')):
        with open(os.path.join(OUT, 'README.md'), 'w') as f:
            f.write(README)

    print(f'Built {APP_NAME} {version} -> {OUT}')
    print(f'{len(assets)} files cached for offline play')


if __name__ == '__main__':
    main()
