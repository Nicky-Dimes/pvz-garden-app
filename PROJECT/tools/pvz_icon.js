// pvz_icon.js — the PVZ Garden app icon, drawn with the game's own pixel art. Regenerate all three sizes:
//   for s in 16:icon-512 6:icon-192; do (echo "var ICON_SCALE=${s%%:*};"; cat tools/pvz_icon.js) > /tmp/i.js; node tools/render_sheet.js pvz-garden/icons/${s#*:}.png /tmp/i.js; done
//   (echo 'var ICON_SCALE=6, ICON_CROP=1;'; cat tools/pvz_icon.js) > /tmp/i.js; node tools/render_sheet.js pvz-garden/icons/apple-touch-icon.png /tmp/i.js
// 32x32 icon: sky, sun, lawn checker, a happy Peashooter firing a pea
const N = 32, c = document.createElement('canvas'); c.width = N; c.height = N; const g = c.getContext('2d');
const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
const sky = ['#6cc6f4', '#7ccdf6', '#8cd5f8', '#9cdcfa', '#ace3fb', '#bce9fc'];
for (let y = 0; y < 21; y++) R(0, y, N, 1, sky[Math.min(sky.length - 1, Math.floor(y / 3.5))]);
// sun (top-left)
const sx = 4, sy = 4;
for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) { const d = Math.hypot(x, y); if (d <= 3.6) R(sx + x, sy + y, 1, 1, d < 2.2 ? '#fff6a0' : '#ffd23a'); else if (d <= 4.4) R(sx + x, sy + y, 1, 1, '#f6a82a'); }
for (const [x, y] of [[0, -6], [0, 6], [-6, 0], [6, 0], [-4, -4], [4, -4], [-4, 4], [4, 4]]) R(sx + x, sy + y, 1, 1, '#ffd23a');
// hedge line + lawn checker
for (let x = 0; x < N; x++) R(x, 19 + ((x * 7) % 3 === 0 ? -1 : 0), 1, 3, '#3e8a34');
for (let y = 21; y < N; y++) for (let x = 0; x < N; x++) R(x, y, 1, 1, ((x >> 2) + ((y - 21) >> 2)) & 1 ? '#6cbc46' : '#86d258');
for (let x = 0; x < N; x++) R(x, 21, 1, 1, '#5aa83c');
// plant shadow, plant, pea
R(9, 29, 12, 1, 'rgba(34,32,52,0.35)'); R(10, 30, 10, 1, 'rgba(34,32,52,0.2)');
const p = PX.sprig({ species: 'peashooter', stage: 0 }, { eyes: 'happy', mouth: 'open' });
g.drawImage(p, -1, -1);
const px = 26, py = 12;
for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) { const d = Math.hypot(x, y); if (d <= 1.6) R(px + x, py + y, 1, 1, (x < 0 && y < 0) ? '#c8f490' : '#78d040'); else if (d <= 2.4) R(px + x, py + y, 1, 1, '#222034'); }
R(22, 11, 1, 1, 'rgba(255,255,255,0.8)'); R(22, 13, 1, 1, 'rgba(255,255,255,0.6)');
let out = c;
if (typeof ICON_CROP !== 'undefined') { const k = document.createElement('canvas'); k.width = N - 2; k.height = N - 2; k.getContext('2d').drawImage(c, -1, -1); out = k; }
sheet.gap = 0; sheet.scale = typeof ICON_SCALE !== 'undefined' ? ICON_SCALE : 8;
sheet.add(out);
