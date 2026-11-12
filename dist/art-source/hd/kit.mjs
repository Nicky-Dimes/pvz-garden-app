// PVZ Garden illustrated-art kit (source only, never shipped): one shared house style for every hand-built character SVG.
//
// THE LOOK (the family's approved direction): professional hand-illustrated 2D cartoon. Thick, dark, slightly irregular outlines
// with varied weight (a bold outer silhouette, thinner inner lines, heavier on the shadow side), exaggerated heads and faces,
// playful asymmetry, rich flat colour with controlled cel shading (one shadow tone + one light tone + a few painted highlights),
// expressive eyes and mouths. NOT pixel art, NOT glossy gradients, NOT emoji-smooth.
//
// FRAME CONTRACT (art-hd-loader.js): 256 x 256 transparent, the character faces RIGHT, its feet / base rest on y = 248 centred
// on x = 128 (the bottom of the silhouette, incl. its outline, touches about y = 248-250), everything inside the frame.
//
// How a character is drawn: a list of PARTS in back-to-front order, each { d, fill, shade, light, ... }. draw(parts) renders:
//   pass 1  the INK SILHOUETTE: every part filled + stroked in ink (OUTER) and nudged down-right, with a gentle wobble filter,
//           so the outer contour is bold and heavier on the shadow side, and irregular like a brush line;
//   pass 2  each part's colour: flat fill, a cel-shadow crescent (the part minus itself nudged toward the light, upper left),
//           an optional light patch and painted highlights, then its own thinner ink line (INNER) so overlaps read clearly.
// Faces and small details (eyes, mouths, veins, teeth, stitches) are drawn on top with the helpers below.
//
// Use: import * as K from './kit.mjs'; const svg = K.svg(K.draw(parts) + K.eye(...) + ...); K.write(file, svg)
import fs from 'node:fs';
import path from 'node:path';

export const INK = '#241a1c';          // warm near-black for every line
export const OUTER = 7.5;              // outer silhouette line (each side), px at 256
export const INNER = 3.4;              // inner part lines
export const NUDGE = [1.6, 2.2];       // ink silhouette offset: heavier lines bottom-right
export const LIGHT_DIR = [-1, -1.15];  // light from the upper left

let uid = 0;
const id = p => `${p}${(++uid).toString(36)}`;
export const n = v => Math.round(v * 100) / 100;

// ---------- small geometry helpers (all return SVG path data) ----------
// a closed organic blob through points (Catmull-Rom → cubic Béziers), tension 0..1
export function blob(pts, t = 1) {
  const P = pts, L = P.length, out = [];
  out.push(`M${n(P[0][0])},${n(P[0][1])}`);
  for (let i = 0; i < L; i++) {
    const p0 = P[(i - 1 + L) % L], p1 = P[i], p2 = P[(i + 1) % L], p3 = P[(i + 2) % L];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6 * t, p1[1] + (p2[1] - p0[1]) / 6 * t];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6 * t, p2[1] - (p3[1] - p1[1]) / 6 * t];
    out.push(`C${n(c1[0])},${n(c1[1])} ${n(c2[0])},${n(c2[1])} ${n(p2[0])},${n(p2[1])}`);
  }
  return out.join('') + 'Z';
}
// an open smooth curve through points (for stems, lines, mouths)
export function curve(pts, t = 1) {
  const P = pts, L = P.length, out = [`M${n(P[0][0])},${n(P[0][1])}`];
  for (let i = 0; i < L - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(L - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6 * t, p1[1] + (p2[1] - p0[1]) / 6 * t];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6 * t, p2[1] - (p3[1] - p1[1]) / 6 * t];
    out.push(`C${n(c1[0])},${n(c1[1])} ${n(c2[0])},${n(c2[1])} ${n(p2[0])},${n(p2[1])}`);
  }
  return out.join('');
}
// an ellipse as an organic blob: wob = [[harmonic, amplitude (0..1 of radius), phase], ...] makes it imperfect
export function oval(cx, cy, rx, ry, rot = 0, wob = [], steps = 14) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const a = i / steps * Math.PI * 2;
    let k = 1; for (const [h, amp, ph] of wob) k += amp * Math.sin(h * a + ph);
    const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return blob(pts);
}
// a thick tapered stroke along a centre line (stems, arms, legs, petals' veins): w0 → w1 width, as a filled closed path
export function limb(pts, w0, w1, w2 = w1) {
  const L = pts.length, left = [], right = [];
  for (let i = 0; i < L; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(L - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const t = i / (L - 1), w = t < 0.5 ? w0 + (w1 - w0) * t * 2 : w1 + (w2 - w1) * (t - 0.5) * 2;
    const nx = -dy / len * w / 2, ny = dx / len * w / 2;
    left.push([pts[i][0] + nx, pts[i][1] + ny]); right.push([pts[i][0] - nx, pts[i][1] - ny]);
  }
  return blob(left.concat(right.reverse()), 0.9);
}
// a leaf / petal shape from base to tip with width w and bend (sideways bulge of the midline)
export function leaf(base, tip, w, bend = 0, fat = 0.5) {
  const [bx, by] = base, [tx, ty] = tip, dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, px = -uy, py = ux;
  const at = (t, s) => [bx + dx * t + px * (s + bend * Math.sin(Math.PI * t)), by + dy * t + py * (s + bend * Math.sin(Math.PI * t))];
  return blob([at(0, 0), at(0.25, w * (fat + 0.1)), at(fat, w * 0.62), at(0.8, w * 0.4), at(1, 0), at(0.8, -w * 0.36), at(fat, -w * 0.58), at(0.25, -w * (fat + 0.05))], 1);
}
// point helpers
export const rot = (p, c, a) => { const s = Math.sin(a), co = Math.cos(a), x = p[0] - c[0], y = p[1] - c[1]; return [c[0] + x * co - y * s, c[1] + x * s + y * co]; };
export const mix = (a, b, t) => { const pa = hex(a), pb = hex(b); return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

// ---------- drawing ----------
// part: { d, fill, shade?, light?, shadeW? (crescent width, default 8), lightPatch? (path d), highlights? [[cx,cy,rx,ry,rot]],
//         line? (inner line width, default INNER, 0 = none), noInk? (leave out of the silhouette), lineColor? }
export function draw(parts, opt = {}) {
  const wob = id('w'), out = [];
  out.push(`<defs><filter id="${wob}" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="${opt.wobFreq || 0.045}" numOctaves="2" seed="${opt.seed || 7}"/><feDisplacementMap in="SourceGraphic" scale="${opt.wobble == null ? 2.6 : opt.wobble}"/></filter></defs>`);
  // pass 1: the ink silhouette (bold outer line, heavier bottom-right, slightly irregular)
  const sil = parts.filter(p => !p.noInk).map(p => `<path d="${p.d}"/>`).join('');
  out.push(`<g filter="url(#${wob})" transform="translate(${NUDGE[0]},${NUDGE[1]})" fill="${INK}" stroke="${INK}" stroke-width="${2 * (opt.outer || OUTER)}" stroke-linejoin="round">${sil}</g>`);
  out.push(`<g filter="url(#${wob})" fill="${INK}" stroke="${INK}" stroke-width="${2 * (opt.outer || OUTER) - 3}" stroke-linejoin="round">${sil}</g>`);
  // pass 2: each part's colour, cel shading and its own line
  for (const p of parts) out.push(part(p, wob));
  return out.join('');
}
export function part(p, wob) {
  const cid = id('c'), sw = p.shadeW == null ? 8 : p.shadeW, lx = LIGHT_DIR[0] * sw, ly = LIGHT_DIR[1] * sw;
  let s = `<clipPath id="${cid}"><path d="${p.d}"/></clipPath><g clip-path="url(#${cid})">`;
  s += `<path d="${p.d}" fill="${p.shade || p.fill}"/>`;
  s += `<path d="${p.d}" fill="${p.fill}" transform="translate(${n(lx)},${n(ly)})"/>`;
  if (p.inside) s += p.inside; // extra clipped detail drawn before the light (e.g. texture marks, seeds)
  if (p.lightPatch) s += `<path d="${p.lightPatch}" fill="${p.light || '#ffffff'}" opacity="${p.lightOpacity || 0.55}"/>`;
  for (const h of p.highlights || []) s += `<ellipse cx="${n(h[0])}" cy="${n(h[1])}" rx="${n(h[2])}" ry="${n(h[3])}" transform="rotate(${n(h[4] || 0)} ${n(h[0])} ${n(h[1])})" fill="${p.light || '#ffffff'}" opacity="${h[5] || 0.8}"/>`;
  s += `</g>`;
  const lw = p.line == null ? INNER : p.line;
  if (lw > 0) s += `<path d="${p.d}" fill="none" stroke="${p.lineColor || INK}" stroke-width="${lw}" stroke-linejoin="round"${wob && !p.noWobbleLine ? ` filter="url(#${wob})"` : ''}/>`;
  return s;
}
// an ink line (open path), tapered look via round caps; w = width
export const line = (d, w = INNER, col = INK, extra = '') => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
export const fillPath = (d, col, extra = '') => `<path d="${d}" fill="${col}"${extra}/>`;

// ---------- faces ----------
// an eye: big dark glossy oval (open), or closed / happy / squint / x / tired, with optional brow.
// o = { cx, cy, rx, ry, state: 'open'|'closed'|'happy'|'squint'|'x'|'wide'|'tired', look: [dx,dy] pupil shift (0..1),
//       white: true (a white eye with a pupil, for zombies) | false (a solid dark PvZ-style eye), iris, brow: {dy, tilt, w}, lid (0..1 top lid) }
export function eye(o) {
  const { cx, cy, rx, ry } = o, st = o.state || 'open', out = [];
  if (st === 'closed' || st === 'tired') { // a calm curved lash line (tired = droopier, lower)
    const y = cy + ry * (st === 'tired' ? 0.25 : 0.05), sag = ry * (st === 'tired' ? 0.25 : 0.45);
    out.push(line(`M${n(cx - rx)},${n(y)} Q${n(cx)},${n(y + sag)} ${n(cx + rx)},${n(y)}`, Math.max(3.2, rx * 0.34)));
  } else if (st === 'happy') { // ^ arcs
    out.push(line(`M${n(cx - rx)},${n(cy + ry * 0.25)} Q${n(cx)},${n(cy - ry * 0.75)} ${n(cx + rx)},${n(cy + ry * 0.25)}`, Math.max(3.4, rx * 0.36)));
  } else if (st === 'squint') { // a pained > or < shape
    const s = o.side || 1;
    out.push(line(`M${n(cx - rx * s)},${n(cy - ry * 0.6)} L${n(cx + rx * 0.7 * s)},${n(cy)} L${n(cx - rx * s)},${n(cy + ry * 0.55)}`, Math.max(3.2, rx * 0.32)));
  } else if (st === 'x') {
    out.push(line(`M${n(cx - rx * 0.7)},${n(cy - ry * 0.6)} L${n(cx + rx * 0.7)},${n(cy + ry * 0.6)} M${n(cx + rx * 0.7)},${n(cy - ry * 0.6)} L${n(cx - rx * 0.7)},${n(cy + ry * 0.6)}`, Math.max(3.2, rx * 0.32)));
  } else if (o.white) { // white eye + coloured iris + pupil (zombie eyes)
    const lx = (o.look || [0, 0])[0] * rx * 0.35, ly = (o.look || [0, 0])[1] * ry * 0.35, cid = id('e');
    out.push(`<clipPath id="${cid}"><ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" transform="rotate(${n(o.rot || 0)} ${n(cx)} ${n(cy)})"/></clipPath>`);
    out.push(`<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" transform="rotate(${n(o.rot || 0)} ${n(cx)} ${n(cy)})" fill="${o.sclera || '#f6f0c8'}" stroke="${INK}" stroke-width="${INNER}"/>`);
    out.push(`<g clip-path="url(#${cid})"><ellipse cx="${n(cx + rx * 0.25)}" cy="${n(cy + ry * 0.35)}" rx="${n(rx)}" ry="${n(ry * 0.7)}" fill="${o.scleraShade || '#d9cf8f'}"/>`);
    out.push(`<circle cx="${n(cx + lx)}" cy="${n(cy + ly)}" r="${n(Math.min(rx, ry) * (o.pupil || 0.42))}" fill="${o.iris || INK}"/>`);
    out.push(`<circle cx="${n(cx + lx)}" cy="${n(cy + ly)}" r="${n(Math.min(rx, ry) * (o.pupil || 0.42) * 0.55)}" fill="${INK}"/>`);
    if (o.lid) out.push(`<rect x="${n(cx - rx - 2)}" y="${n(cy - ry - 2)}" width="${n(rx * 2 + 4)}" height="${n(ry * 2 * o.lid + 2)}" fill="${o.lidCol || '#9fb67e'}"/>`);
    out.push(`</g>`);
    if (o.lid) out.push(line(`M${n(cx - rx)},${n(cy - ry + ry * 2 * o.lid)} Q${n(cx)},${n(cy - ry + ry * 2 * o.lid + 3)} ${n(cx + rx)},${n(cy - ry + ry * 2 * o.lid)}`, INNER));
    out.push(`<circle cx="${n(cx + lx - rx * 0.18)}" cy="${n(cy + ly - ry * 0.2)}" r="${n(Math.min(rx, ry) * 0.16)}" fill="#ffffff" opacity="0.9"/>`);
  } else { // solid dark glossy oval eye (PvZ plant eye) with a big white shine and a small second shine
    const lx = (o.look || [0, 0])[0] * rx * 0.25, ly = (o.look || [0, 0])[1] * ry * 0.2, R = o.rot || 0;
    const sc = st === 'wide' ? 1.12 : 1;
    out.push(`<ellipse cx="${n(cx + lx)}" cy="${n(cy + ly)}" rx="${n(rx * sc)}" ry="${n(ry * sc)}" transform="rotate(${n(R)} ${n(cx + lx)} ${n(cy + ly)})" fill="${o.iris || INK}"/>`);
    if (o.lid) out.push(`<path d="M${n(cx + lx - rx * 1.15)},${n(cy + ly - ry * 1.2)} H${n(cx + lx + rx * 1.15)} V${n(cy + ly - ry + ry * 2 * o.lid)} Q${n(cx + lx)},${n(cy + ly - ry + ry * 2 * o.lid + ry * 0.25)} ${n(cx + lx - rx * 1.15)},${n(cy + ly - ry + ry * 2 * o.lid)}Z" fill="${o.lidCol || '#e8902a'}"/>` + line(`M${n(cx + lx - rx * 1.05)},${n(cy + ly - ry + ry * 2 * o.lid)} Q${n(cx + lx)},${n(cy + ly - ry + ry * 2 * o.lid + ry * 0.25)} ${n(cx + lx + rx * 1.05)},${n(cy + ly - ry + ry * 2 * o.lid)}`, 3));
    out.push(`<ellipse cx="${n(cx + lx - rx * 0.32)}" cy="${n(cy + ly - ry * 0.34)}" rx="${n(rx * 0.34)}" ry="${n(ry * 0.27)}" transform="rotate(-25 ${n(cx + lx - rx * 0.32)} ${n(cy + ly - ry * 0.34)})" fill="#ffffff"/>`);
    out.push(`<circle cx="${n(cx + lx + rx * 0.3)}" cy="${n(cy + ly + ry * 0.36)}" r="${n(Math.min(rx, ry) * 0.14)}" fill="#ffffff" opacity="0.85"/>`);
  }
  if (o.brow) { // a thick brush-like brow: {dy, tilt (radians, + = angry inner end down for the right eye), w (length), th (thickness)}
    const b = o.brow, w = b.w || rx * 1.6, y = cy - ry - (b.dy == null ? ry * 0.45 : b.dy), t = b.tilt || 0, th = b.th || 5;
    const a = [cx - w / 2, y - Math.sin(t) * w / 2], c = [cx + w / 2, y + Math.sin(t) * w / 2], m = [cx, y - (b.arch == null ? 3 : b.arch)];
    out.push(`<path d="${limb([a, m, c], th * 0.7, th, th * 0.6)}" fill="${INK}"/>`);
  }
  return out.join('');
}
// a mouth. o = { cx, cy, w, h, state: 'smile'|'grin'|'open'|'o'|'flat'|'frown'|'wince'|'gape', tongue: true, teeth: [...], tilt }
export function mouth(o) {
  const { cx, cy, w } = o, h = o.h || w * 0.5, st = o.state || 'smile', out = [], t = o.tilt || 0, dark = o.dark || '#5a1f22', tongue = o.tongueCol || '#e8676f';
  const g = s => `<g transform="rotate(${n(t * 57.3)} ${n(cx)} ${n(cy)})">${s}</g>`;
  if (st === 'flat') return g(line(`M${n(cx - w / 2)},${n(cy)} Q${n(cx)},${n(cy + 2)} ${n(cx + w / 2)},${n(cy - 1)}`, Math.max(3.2, w * 0.1)));
  if (st === 'frown') return g(line(`M${n(cx - w / 2)},${n(cy + h * 0.3)} Q${n(cx)},${n(cy - h * 0.45)} ${n(cx + w / 2)},${n(cy + h * 0.3)}`, Math.max(3.4, w * 0.1)));
  let d;
  if (st === 'o') d = oval(cx, cy, w * 0.3, h * 0.42, 0, [[2, 0.05, 0.4]]);
  else if (st === 'wince') d = blob([[cx - w / 2, cy], [cx - w * 0.2, cy - h * 0.25], [cx + w * 0.1, cy - h * 0.1], [cx + w / 2, cy - h * 0.2], [cx + w * 0.35, cy + h * 0.3], [cx - w * 0.1, cy + h * 0.25]], 0.8);
  else if (st === 'smile') d = `M${n(cx - w / 2)},${n(cy - h * 0.15)} Q${n(cx)},${n(cy + h * 0.1)} ${n(cx + w / 2)},${n(cy - h * 0.2)} Q${n(cx + w * 0.3)},${n(cy + h * 1.05)} ${n(cx - w * 0.05)},${n(cy + h * 0.9)} Q${n(cx - w * 0.42)},${n(cy + h * 0.75)} ${n(cx - w / 2)},${n(cy - h * 0.15)}Z`;
  else if (st === 'grin') d = `M${n(cx - w / 2)},${n(cy - h * 0.25)} Q${n(cx)},${n(cy + h * 0.05)} ${n(cx + w / 2)},${n(cy - h * 0.3)} Q${n(cx + w * 0.38)},${n(cy + h * 0.75)} ${n(cx)},${n(cy + h * 0.72)} Q${n(cx - w * 0.4)},${n(cy + h * 0.7)} ${n(cx - w / 2)},${n(cy - h * 0.25)}Z`;
  else /* open / gape */ d = oval(cx, cy + h * 0.1, w * 0.5, h * (st === 'gape' ? 0.75 : 0.55), 0, [[2, 0.06, 0.9], [3, 0.03, 0.2]]);
  const cid = id('m');
  out.push(`<clipPath id="${cid}"><path d="${d}"/></clipPath><path d="${d}" fill="${dark}"/>`);
  out.push(`<g clip-path="url(#${cid})">`);
  if (o.tongue !== false && st !== 'grin') out.push(`<ellipse cx="${n(cx + w * 0.06)}" cy="${n(cy + h * (st === 'o' ? 0.35 : 0.75))}" rx="${n(w * (st === 'o' ? 0.2 : 0.3))}" ry="${n(h * 0.35)}" fill="${tongue}"/>`);
  for (const tt of o.teeth || []) out.push(tt); // caller-supplied tooth shapes (in mouth coordinates)
  if (st === 'grin') out.push(`<path d="M${n(cx - w / 2)},${n(cy - h * 0.25)} L${n(cx + w / 2)},${n(cy - h * 0.3)} L${n(cx + w / 2)},${n(cy + h * 0.2)} L${n(cx - w / 2)},${n(cy + h * 0.2)}Z" fill="#fffbea"/>` + line(`M${n(cx - w / 2)},${n(cy + h * 0.2)} L${n(cx + w / 2)},${n(cy + h * 0.15)}`, 2.4));
  out.push(`</g><path d="${d}" fill="none" stroke="${INK}" stroke-width="${Math.max(3.2, w * 0.09)}" stroke-linejoin="round"/>`);
  return g(out.join(''));
}
// soft cheek blush (painted, not glossy)
export const blush = (cx, cy, rx, ry, col = '#ff7f6a', op = 0.45) => `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="${col}" opacity="${op}"/>`;

// ---------- output ----------
export const svg = (body, W = 256, H = 256) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>\n`;
export function write(file, s) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, s); }
// a pose's frame: everything placed so the feet sit on (128, 248); `body` is drawn in local coordinates with the feet at (0, 0)
export const frame = (body, dx = 0, dy = 0) => svg(`<g transform="translate(${n(128 + dx)},${n(248 + dy)})">${body}</g>`);
