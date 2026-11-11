#!/usr/bin/env node
// ai_sheets.js — PVZ Garden: make the ChatGPT template sheets + their prompts (dev tool).
//   node tools/ai_sheets.js "<out folder>" [--from 2] [--to 59] [--no-images]
// The sheet list matches pvz-garden/_ai-templates.html (plants: Peashooter/Sunflower/Chomper first, then data order, 3 species
// per sheet = one per row, stages left to right; zombies: 9 per sheet; Zombosses: 4 per sheet). For each sheet it writes
// sheet-NN-template.png (rendered by the local preview server on port 8770) and sheet-NN-prompt.txt (with that sheet's names and
// the family's rules that apply to its characters), plus "HOW TO RUN THE SHEETS.txt" with the list.
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..'), SRC = path.join(ROOT, 'pvz-garden');
const OUTDIR = process.argv[2]; if (!OUTDIR) { console.log('usage: node tools/ai_sheets.js "<out folder>" [--from n] [--to n] [--no-images]'); process.exit(2); }
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? +process.argv[i + 1] : d; };
const FROM = arg('--from', 1), TO = arg('--to', 999), IMAGES = !process.argv.includes('--no-images');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sb = { window: {}, document: { createElement: () => ({ getContext: () => null }) } }; sb.window = sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(SRC, 'data.js'), 'utf8'), sb);
const D = sb.PSDATA;
const artOrder = [...fs.readFileSync(path.join(SRC, 'index.html'), 'utf8').matchAll(/src="(art-[A-Za-z0-9-]+\.js)"/g)].map(m => m[1]).filter(f => !/^art-(hd-|v2-)/.test(f));
const BOSS_IDS = artOrder.flatMap(f => [...fs.readFileSync(path.join(SRC, f), 'utf8').matchAll(/^\s*BA\.([a-z]+) = \{/gm)].map(m => m[1])); // same order as PX.BOSS_ART keys
const bossNames = Object.fromEntries([...fs.readFileSync(path.join(SRC, 'battle.js'), 'utf8').matchAll(/id: '([a-z]+)', name: '([^']+)'/g)].filter(m => BOSS_IDS.includes(m[1])).map(m => [m[1], m[2]]));

// ---- the same sheet list as _ai-templates.html ----
const plants = Object.keys(D.PLANTS), first = ['peashooter', 'sunflower', 'chomper'];
const order = first.concat(plants.filter(p => !first.includes(p)));
const sheets = [];
for (let i = 0; i < order.length; i += 3) sheets.push({ kind: 'plants', cols: 3, rows: Math.ceil(order.slice(i, i + 3).length), ids: order.slice(i, i + 3) });
const zs = Object.keys(D.ZOMBIES); for (let i = 0; i < zs.length; i += 9) sheets.push({ kind: 'zombies', cols: 3, rows: 3, ids: zs.slice(i, i + 9) });
for (let i = 0; i < BOSS_IDS.length; i += 4) sheets.push({ kind: 'bosses', cols: 2, rows: 2, ids: BOSS_IDS.slice(i, i + 4) });
sheets.forEach((s, i) => { s.n = i + 1; });
// fix-up sheets (pvz-garden/_ai-fixups.json): chosen looks, drawn from their current new art, with per-row notes
try { for (const f of JSON.parse(fs.readFileSync(path.join(SRC, '_ai-fixups.json'), 'utf8')).sheets) sheets.push({ n: f.n, kind: 'fixup', cols: f.cols, rows: f.rows, items: f.items, notes: f.rows_notes }); } catch (e) { /* none */ }

// ---- the family's rules, per plant and stage (stage index 0-2) ----
const MAD_ALL = ['cherrybomb', 'squash', 'cactus', 'doomshroom', 'jalapeno', 'coconut'];
const isMad = (id, st) => MAD_ALL.includes(id) || (id === 'melonpult' && st === 0) || (id === 'puffshroom' && st === 1) || (id === 'kernelpult' && st === 2);
const noMouth = (id, st) => ['wallnut', 'lilypad', 'lightningreed'].includes(id) || (id === 'melonpult' && st === 0) || (id === 'kernelpult' && st === 2);
const isShroom = id => D.PLANTS[id].role === 'spore' || /shroom|toadstool|nightcap/i.test(id + ' ' + D.PLANTS[id].names.join(' '));
function plantNotes(ids) {
  const notes = [];
  for (const id of ids) {
    const N = D.PLANTS[id].names;
    const mad = [0, 1, 2].filter(st => isMad(id, st)), mouthless = [0, 1, 2].filter(st => noMouth(id, st));
    if (mad.length === 3) notes.push(`${N[0]} looks MAD at every stage (a heavy V-shaped brow pressing down on the eyes, frown or gritted teeth). It is still cute, not scary.`);
    else for (const st of mad) notes.push(`${N[st]} looks MAD (a heavy V-shaped brow pressing down on the eyes). Cute, not scary.`);
    if (mouthless.length === 3) notes.push(`${N[0]} has NO MOUTH at any stage (eyes only).`);
    else for (const st of mouthless) notes.push(`${N[st]} has NO MOUTH (eyes only).`);
    if (id === 'chomper') notes.push('Chomper has NO EYES at any stage.');
    if (isShroom(id)) notes.push(`${N[0]} is a mushroom: no feet; its stalk flares down to the ground.`);
    if (id === 'snapdragon') notes.push('Snapdragon must clearly look like a little DRAGON at every stage.');
    if (id === 'cabbagepult') notes.push('Cabbage-pult stays a cabbage at every stage.');
    if (id === 'kernelpult') notes.push('Cob Cannon (stage 3) sits on a little cart with real wheels and has no mouth and no legs.');
    if (id === 'melonpult') notes.push('Melon-pult has no mouth and no legs: it sits on its leaves.');
    if (id === 'lightningreed') notes.push('Lightning Reed is a glowing mint-green teardrop bulb on a reed with a curled tip and a halo, eyes only, friendly.');
    if (id === 'sunflower') notes.push('Sunflower Queen has three flowers.');
  }
  return notes;
}
const STYLE = 'premium 16-bit kawaii pixel art, crisp square pixels, chunky rounded chibi shapes, thick dark navy-purple outline, 4-5 tone cel shading lit from the upper left, glossy highlights, big sparkly eyes, bright colors';
function prompt(s) {
  const n = s.kind === 'fixup' ? s.items.length : s.kind === 'plants' ? s.ids.length * 3 : s.ids.length, grid = `${s.cols}x${s.rows}`;
  const L = [`I'm attaching two images. Image 1 is a template sheet: ${n} ${s.kind === 'bosses' ? 'boss characters' : 'characters'} from my game in a ${grid} grid. Image 2 is my approved art style.`, '',
    `Redraw all ${n} characters from image 1 in the exact art style of image 2: ${STYLE}.`, '', 'Keep the layout exactly the same:',
    `- Same ${grid} grid, same order, one character per cell, centered in its cell, about the same size, all standing on the same baseline, all facing RIGHT.`,
    '- Plain flat cream background (#FEF6DD) everywhere. No grass, no ground, no shadows, no text, no labels, no borders, no frames.', ''];
  if (s.kind === 'fixup') {
    L[0] = `I'm attaching two images. Image 1 shows 9 characters from my game in a 3x3 grid, already drawn in my style. Image 2 is my approved art style.`;
    L[2] = `Redraw all 9 characters from image 1 in the exact art style of image 2 (${STYLE}), with the changes listed below. Characters without a listed change stay exactly as they are.`;
    L.push('The characters and the changes (rows top to bottom, left to right):');
    for (const t of s.notes) L.push('- ' + t);
    L.push('', 'Rules:', '- Plants have no legs or feet; they sit on their base leaves, roots, a pad or a pot.', '- Cute, friendly, never scary.');
  } else if (s.kind === 'plants') {
    L.push('The characters (rows top to bottom; left to right = growth stage 1, 2, 3):');
    s.ids.forEach((id, r) => L.push(`- Row ${r + 1}: ${D.PLANTS[id].names.join(' -> ')}`));
    L.push('', 'Rules:', "- Keep each character's identity, colors, accessories and stage features from image 1, drawn like the plants in image 2.",
      '- Plants have no legs or feet; they sit on their base leaves, roots, a pad or a pot.', '- Friendly, cute faces unless a rule below says otherwise; nothing scary.',
      '- Each stage should look clearly more grown-up and detailed than the one before.');
    for (const t of plantNotes(s.ids)) L.push('- ' + t);
  } else if (s.kind === 'zombies') {
    L.push('The characters (rows top to bottom, left to right):');
    for (let r = 0; r < s.rows; r++) { const row = s.ids.slice(r * s.cols, r * s.cols + s.cols); if (row.length) L.push(`- Row ${r + 1}: ${row.map(id => D.ZOMBIES[id].name).join(', ')}`); }
    L.push('', 'Rules:', "- Keep each zombie's identity, outfit, hat, gear and props from image 1, drawn like the zombies in image 2.",
      '- Cute, silly, toy-like zombies, never scary or gross: big pale googly eyes, goofy mouths, green-grey skin.',
      '- Full body with legs and shoes, standing, facing RIGHT. Every zombie gets its own clearly different look.');
  } else {
    L.push('The characters:'); const pos = ['Top left', 'Top right', 'Bottom left', 'Bottom right'];
    s.ids.forEach((id, i) => L.push(`- ${pos[i]}: ${bossNames[id] || id}`));
    L.push('', 'Rules:', "- These are the game's big boss machines and monsters. Keep each one's design, vehicle/body and zombie pilot from image 1.",
      '- Big, bold and toy-like, silly rather than scary; machinery that looks properly built (wheels, joints, controls attached).', '- Facing RIGHT, whole body inside its cell.');
  }
  L.push('', 'Make ONE image with the whole sheet.', '');
  return L.join('\n');
}

fs.mkdirSync(OUTDIR, { recursive: true });
const list = [];
for (const s of sheets) {
  const NN = String(s.n).padStart(2, '0');
  const names = s.kind === 'fixup' ? s.items.map(([id, st]) => D.PLANTS[id].names[st]) : s.kind === 'plants' ? s.ids.map(id => D.PLANTS[id].name) : s.kind === 'zombies' ? s.ids.map(id => D.ZOMBIES[id].name) : s.ids.map(id => bossNames[id] || id);
  list.push(`Sheet ${NN} (${s.kind}): ${names.join(', ')}`);
  if (s.n < FROM || s.n > TO) continue;
  fs.writeFileSync(path.join(OUTDIR, `sheet-${NN}-prompt.txt`), prompt(s));
  if (IMAGES) {
    const size = 1536;
    execFileSync(CHROME, ['--headless', '--disable-gpu', '--hide-scrollbars', `--window-size=${size},${size}`, '--force-device-scale-factor=1', '--virtual-time-budget=6000', `--screenshot=${path.join(OUTDIR, `sheet-${NN}-template.png`)}`, `http://127.0.0.1:8770/_ai-templates.html?sheet=${s.n}`], { stdio: 'ignore' });
  }
  process.stdout.write(`sheet ${NN} `);
}
fs.writeFileSync(path.join(OUTDIR, 'HOW TO RUN THE SHEETS.txt'), [
  'PVZ Garden: ChatGPT art sheets', '',
  'For EACH sheet, one at a time:',
  '  1. Open a NEW ChatGPT chat (or keep using the same one, but send ONE sheet per message).',
  '  2. Attach sheet-NN-template.png first, then STYLE-approved-reference.png.',
  '  3. Paste the text from sheet-NN-prompt.txt and send.',
  '  4. Save ChatGPT\'s picture into this folder as sheet-NN-result.png (NN = the sheet number).',
  'Tell Claude when a batch is in the folder; it converts them into game sprites and checks them.',
  'If a result has a character missing, extra, out of order or not facing right, just run that sheet again.', '',
  `${sheets.length} sheets:`, ...list, ''].join('\n'));
console.log(`\n${sheets.length} sheets in total; wrote ${OUTDIR}`);
