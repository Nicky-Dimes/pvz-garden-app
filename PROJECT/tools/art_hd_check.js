// art_hd_check.js — PVZ Garden: checks the illustrated-art sprite sheets registered in pvz-garden/art-hd-manifest.js.
// Used by tools/check_pvz.js (so tools/build_pvz.py runs it before every build) and by tools/test_art_hd_build.py.
// Plain Node, no packages: it reads the PNG / WebP file headers only.
//
//   check(src, ids) -> { refs, files, problems, notes }
//     src   the game source folder (pvz-garden/)
//     ids   optional { plants: Set, zombies: Set } of the game's own plant and zombie ids
//     refs  every registered sheet: { kind: 'plants' | 'zombies', id, stage, path }
//     files the image paths to ship (unique, sorted): only REGISTERED sheets ever ship; drafts never do
//     problems  anything that must stop a build; notes: harmless remarks (unregistered or draft files that stay unshipped)
//
// Rules: a sheet is registered by its path in art-hd-manifest.js (plants: { id: { 0: path, 1: path, 2: path } },
// zombies: { id: path }). The path must be img/hd/<plants|zombies>/… in lowercase letters, digits, '-' and '_' (no folder or
// file starting with '_': those are drafts), the file must exist with exactly that spelling, be a PNG or WebP with
// transparency, and have exactly the sheet size art-hd-loader.js expects (frames of 256 x 256: plants 4 x 2, zombies 3 x 2).
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const SHEET = { plants: { w: 1024, h: 512 }, zombies: { w: 768, h: 512 } }; // must match CELL / the frame lists in art-hd-loader.js
const MAX_BYTES = 8 * 1024 * 1024; // a sanity limit per sheet (a 1024 x 512 PNG is normally well under 2 MB)
const PATH_RE = /^img\/hd\/(plants|zombies)\/(?:[a-z0-9-][a-z0-9_-]*\/)*[a-z0-9-][a-z0-9_-]*\.(png|webp)$/;

function readManifest(src) {
  const file = path.join(src, 'art-hd-manifest.js');
  if (!fs.existsSync(file)) return { manifest: null };
  try {
    const box = { window: {} }; box.globalThis = box;
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), box, { filename: 'art-hd-manifest.js', timeout: 1000 });
    return { manifest: box.window.PVZ_HD_MANIFEST || null };
  } catch (e) { return { manifest: null, error: `art-hd-manifest.js does not run: ${e.message}` }; }
}

// the registered sheets, plus structure problems
function listRefs(M, ids, problems) {
  const refs = [], isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  if (!isObj(M)) { problems.push('art-hd-manifest.js: PVZ_HD_MANIFEST must be an object { plants: {}, zombies: {} }'); return refs; }
  for (const key of Object.keys(M)) if (key !== 'plants' && key !== 'zombies') problems.push(`art-hd-manifest.js: unknown section "${key}" (only plants and zombies are supported)`);
  const plants = M.plants == null ? {} : M.plants, zombies = M.zombies == null ? {} : M.zombies;
  if (!isObj(plants)) problems.push('art-hd-manifest.js: plants must be an object');
  else for (const [id, stages] of Object.entries(plants)) {
    if (ids && ids.plants && !ids.plants.has(id)) problems.push(`art-hd-manifest.js: plant "${id}" is not a PVZ Garden plant`);
    if (!isObj(stages)) { problems.push(`art-hd-manifest.js: plant "${id}" must map stages 0, 1, 2 to sheet paths`); continue; }
    for (const [st, p] of Object.entries(stages)) {
      if (!['0', '1', '2'].includes(st)) { problems.push(`art-hd-manifest.js: plant "${id}" has stage ${st} (only 0, 1 and 2 exist)`); continue; }
      refs.push({ kind: 'plants', id, stage: +st, path: p });
    }
  }
  if (!isObj(zombies)) problems.push('art-hd-manifest.js: zombies must be an object');
  else for (const [id, p] of Object.entries(zombies)) {
    if (ids && ids.zombies && !ids.zombies.has(id)) problems.push(`art-hd-manifest.js: zombie "${id}" is not a PVZ Garden zombie`);
    refs.push({ kind: 'zombies', id, stage: null, path: p });
  }
  return refs;
}

// true when every part of rel exists with exactly this spelling (macOS folders ignore case; the web server does not)
function existsExactly(src, rel) {
  let dir = src;
  for (const part of rel.split('/')) {
    let names; try { names = fs.readdirSync(dir); } catch (e) { return false; }
    if (!names.includes(part)) return false;
    dir = path.join(dir, part);
  }
  return fs.statSync(dir).isFile();
}

// { type, w, h, alpha } from a PNG or WebP header, or null
function imageInfo(buf) {
  if (buf.length >= 33 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) && buf.toString('latin1', 12, 16) === 'IHDR') {
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), colorType = buf[25];
    let alpha = colorType === 4 || colorType === 6;
    for (let i = 8; !alpha && i + 8 <= buf.length;) { // a palette or plain-colour PNG can still be transparent (tRNS)
      const len = buf.readUInt32BE(i), type = buf.toString('latin1', i + 4, i + 8);
      if (type === 'tRNS') alpha = true;
      if (type === 'IDAT' || type === 'IEND') break;
      i += 12 + len;
    }
    return { type: 'png', w, h, alpha };
  }
  if (buf.length >= 30 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') {
    const chunk = buf.toString('latin1', 12, 16);
    if (chunk === 'VP8X') return { type: 'webp', w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3), alpha: !!(buf[20] & 0x10) };
    if (chunk === 'VP8L' && buf[20] === 0x2f) { const b = buf.readUInt32LE(21); return { type: 'webp', w: 1 + (b & 0x3fff), h: 1 + ((b >>> 14) & 0x3fff), alpha: !!((b >>> 28) & 1) }; }
    if (chunk === 'VP8 ') return { type: 'webp', w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff, alpha: false };
  }
  return null;
}

// image files under img/ that are not shipped (unregistered sheets, drafts): reported as notes, never an error
function strayFiles(src, shipped) {
  const out = [], root = path.join(src, 'img');
  const walk = (dir, rel) => {
    for (const name of fs.readdirSync(dir).sort()) {
      if (name === '.DS_Store') continue;
      const p = path.join(dir, name), r = rel ? rel + '/' + name : name;
      if (fs.statSync(p).isDirectory()) walk(p, r); else if (!shipped.has('img/' + r)) out.push('img/' + r);
    }
  };
  if (fs.existsSync(root)) walk(root, '');
  return out;
}

function check(src, ids) {
  const problems = [], notes = [];
  const { manifest, error } = readManifest(src);
  if (error) return { refs: [], files: [], problems: [error], notes };
  const refs = manifest ? listRefs(manifest, ids, problems) : [];
  const files = [...new Set(refs.map(r => r.path).filter(p => typeof p === 'string'))].sort();
  for (const r of refs) {
    const who = `${r.kind === 'plants' ? 'plant' : 'zombie'} "${r.id}"${r.stage == null ? '' : ' stage ' + r.stage}`;
    if (typeof r.path !== 'string') { problems.push(`${who}: the sheet path must be a string`); continue; }
    if (!PATH_RE.test(r.path)) { problems.push(`${who}: "${r.path}" is not a valid sheet path (img/hd/${r.kind}/…, lowercase a-z 0-9 - _, .png or .webp, no _draft folders or files)`); continue; }
    if (r.path.split('/')[2] !== r.kind) { problems.push(`${who}: "${r.path}" must be under img/hd/${r.kind}/`); continue; }
    if (!existsExactly(src, r.path)) { problems.push(`${who}: ${r.path} is missing (or its spelling/capitals differ)`); continue; }
    const full = path.join(src, ...r.path.split('/')), size = fs.statSync(full).size;
    if (size > MAX_BYTES) { problems.push(`${who}: ${r.path} is ${(size / 1048576).toFixed(1)} MB (over the ${MAX_BYTES / 1048576} MB limit)`); continue; }
    const info = imageInfo(fs.readFileSync(full));
    if (!info) { problems.push(`${who}: ${r.path} is not a readable PNG or WebP image`); continue; }
    if (info.type !== path.extname(r.path).slice(1)) problems.push(`${who}: ${r.path} is really a ${info.type.toUpperCase()} file`);
    const want = SHEET[r.kind];
    if (info.w !== want.w || info.h !== want.h) problems.push(`${who}: ${r.path} is ${info.w} x ${info.h}; it must be exactly ${want.w} x ${want.h} (256 x 256 frames)`);
    if (!info.alpha) problems.push(`${who}: ${r.path} has no transparency (the background must be transparent)`);
  }
  for (const f of strayFiles(src, new Set(files))) notes.push(`${f} is not registered in art-hd-manifest.js, so it is not shipped`);
  return { refs, files: problems.length ? [] : files, problems, notes };
}

module.exports = { check, readManifest, imageInfo, SHEET };
