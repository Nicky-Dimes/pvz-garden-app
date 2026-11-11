/**
 * Optional DEV-ONLY validator; no runtime dependencies and no dependency on build tool.
 * Usage: node tools/check-assets.mjs path/to/manifest.json [repo-root]
 * Checks IDs, file existence, PNG magic, logical frame dimensions and frame count.
 */
import fs from 'node:fs';
import path from 'node:path';

const input = process.argv[2];
const root = path.resolve(process.argv[3] || process.cwd());
if (!input) {
  console.error('Usage: node tools/check-assets.mjs manifest.json [repo-root]');
  process.exit(2);
}
const manifest = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
const issues = [];
const seen = new Set();
for (const a of manifest.assets || []) {
  if (!a.id || seen.has(a.id)) issues.push(`Missing or duplicate id: ${a.id}`);
  seen.add(a.id);
  if (!a.src || !a.src.endsWith('.png')) { issues.push(`${a.id}: PNG source missing/invalid`); continue; }
  if (!Number.isInteger(a.logicalWidth) || !Number.isInteger(a.logicalHeight) ||
      a.logicalWidth < 1 || a.logicalHeight < 1) {
    issues.push(`${a.id}: invalid logical dimensions`); continue;
  }
  const abs = path.resolve(root, a.src);
  if (!abs.startsWith(root + path.sep)) { issues.push(`${a.id}: path escapes repository root`); continue; }
  if (!fs.existsSync(abs)) { issues.push(`${a.id}: missing file ${a.src}`); continue; }
  const data = fs.readFileSync(abs);
  if (data.length < 26 || data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    issues.push(`${a.id}: not a PNG file`); continue;
  }
  const w = data.readUInt32BE(16), h = data.readUInt32BE(20);
  const frames = a.frames || 1;
  if (!Number.isInteger(frames) || frames < 1) issues.push(`${a.id}: invalid frames`);
  const expectedW = a.frameLayout === 'horizontal' ? a.logicalWidth * frames : a.logicalWidth;
  const expectedH = a.frameLayout === 'vertical' ? a.logicalHeight * frames : a.logicalHeight;
  if (w !== expectedW || h !== expectedH) {
    issues.push(`${a.id}: PNG ${w}x${h}; expected ${expectedW}x${expectedH}`);
  }
  // PNG color type 6 = RGBA, 4 = gray+alpha; 2/3 may still have tRNS transparency.
  const colorType = data[25];
  if (![4, 6].includes(colorType) && !data.includes(Buffer.from('tRNS'))) {
    issues.push(`${a.id}: WARNING PNG may not have transparency (color type ${colorType})`);
  }
}
if (issues.length) {
  for (const issue of issues) console.error(issue);
  console.error(`Found ${issues.length} potential problem(s).`);
  process.exit(1);
}
console.log(`OK: verified ${seen.size} manifest asset(s).`);
