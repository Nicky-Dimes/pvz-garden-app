#!/usr/bin/env node
// zombie-basic.mjs — PVZ Garden illustrated Basic Zombie (art source only, never shipped).
//   node pvz-garden/art-source/hd/zombie-basic.mjs      → writes zombies/basic/<pose>.svg  (idle, walk0, walk1, bite, hurt)
//   node tools/hd_art_render.mjs zombies/basic          → renders + checks the 256 x 256 transparent PNGs next to them
//
// One character, five genuinely different drawings: every pose is built from the same costume / face / hand / shoe parts
// (4 teeth, 2 buttons, 3 fingers + thumb on each hand, the same patch, tie and hair), placed on a small rig (pelvis, torso lean,
// head offset + tilt, jaw angle, 2-bone arms and legs, shoes on the ground line) and drawn with the shared house-style kit.
// Faces RIGHT; the shoe soles sit on the anchor line (frame y 248, x 128).
import * as K from './kit.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'zombies', 'basic');
const { n, INK } = K;

// ---------- palette ----------
const C = {
  skin: '#a8c98a', skinS: '#7a9d64', skinL: '#d6eeb8', skinD: '#5f8a52', spot: '#8fb276',
  sclera: '#f2e8a0', scleraS: '#d4c46e',
  jacket: '#8b5a3a', jacketS: '#66402a', jacketL: '#b47e55',
  patch: '#b48a3e', patchS: '#8a6628', patchL: '#d9b465',
  shirt: '#efe6cf', shirtS: '#c8ba98',
  tie: '#c8323a', tieS: '#8c1c27', tieL: '#f07272',
  pants: '#4a6fa8', pantsS: '#33507f', pantsL: '#7e9dd2',
  shoe: '#764628', shoeS: '#4f2d19', shoeL: '#a87149', sole: '#6a5446', soleS: '#463529',
  teeth: '#f3ead0', teethS: '#c9b98e',
  mouth: '#4a1820', mouthS: '#2f0d15', tongue: '#c4505c', tongueS: '#9a3843',
  button: '#3e281c', thread: '#d8c9a4',
};
const FAR = 0.4; // far-side limbs are pushed back with a darker fill
const farOf = (c, s) => K.mix(c, s, FAR);

// ---------- geometry ----------
const rad = d => d * Math.PI / 180;
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const norm = a => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };
const rotAbout = (p, c, a) => { const s = Math.sin(a), co = Math.cos(a), x = p[0] - c[0], y = p[1] - c[1]; return [c[0] + x * co - y * s, c[1] + x * s + y * co, ...p.slice(2)]; };
// a placed frame: local [x, y(, k)] → world: rotated by a (radians, clockwise on screen) about the origin o; fy = -1 mirrors local y
const place = (o, a = 0, fy = 1) => p => { const c = Math.cos(a), s = Math.sin(a), x = p[0], y = p[1] * fy; return [o[0] + x * c - y * s, o[1] + x * s + y * c, ...p.slice(2)]; };
// a path through points with per-point smoothness: [x, y, k], k = 1 smooth (default) … 0 a sharp corner
function shape(pts, closed = true, t = 1) {
  const L = pts.length, at = i => closed ? pts[(i + L) % L] : pts[Math.max(0, Math.min(L - 1, i))], out = [`M${n(pts[0][0])},${n(pts[0][1])}`];
  for (let i = 0; i < (closed ? L : L - 1); i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2), k1 = (p1[2] ?? 1) * t, k2 = (p2[2] ?? 1) * t;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6 * k1, p1[1] + (p2[1] - p0[1]) / 6 * k1], c2 = [p2[0] - (p3[0] - p1[0]) / 6 * k2, p2[1] - (p3[1] - p1[1]) / 6 * k2];
    out.push(`C${n(c1[0])},${n(c1[1])} ${n(c2[0])},${n(c2[1])} ${n(p2[0])},${n(p2[1])}`);
  }
  return out.join('') + (closed ? 'Z' : '');
}
// a tube along a centre line with a width per point; round start cap; the end is round or a torn edge
// jag = [[t across the end (+1 left … -1 right), how far past the end]]
function tube(pts, ws, jag = null) {
  const N = pts.length, left = [], right = [];
  for (let i = 0; i < N; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)], d = norm(sub(b, a)), nx = -d[1] * ws[i] / 2, ny = d[0] * ws[i] / 2;
    left.push([pts[i][0] + nx, pts[i][1] + ny]); right.push([pts[i][0] - nx, pts[i][1] - ny]);
  }
  const e = pts[N - 1], ed = norm(sub(e, pts[N - 2])), ep = [-ed[1], ed[0]], s = pts[0], sd = norm(sub(s, pts[1])), sp = [-sd[1], sd[0]];
  const we = ws[N - 1] / 2, w0 = ws[0] / 2;
  const end = jag ? jag.map(([t, o]) => [e[0] + ep[0] * t * we + ed[0] * o, e[1] + ep[1] * t * we + ed[1] * o, 0])
    : [[e[0] + ep[0] * we * 0.7 + ed[0] * we * 0.7, e[1] + ep[1] * we * 0.7 + ed[1] * we * 0.7], [e[0] + ed[0] * we, e[1] + ed[1] * we], [e[0] - ep[0] * we * 0.7 + ed[0] * we * 0.7, e[1] - ep[1] * we * 0.7 + ed[1] * we * 0.7]];
  const start = [[s[0] - sp[0] * w0 * 0.7 + sd[0] * w0 * 0.7, s[1] - sp[1] * w0 * 0.7 + sd[1] * w0 * 0.7], [s[0] + sd[0] * w0, s[1] + sd[1] * w0], [s[0] + sp[0] * w0 * 0.7 + sd[0] * w0 * 0.7, s[1] + sp[1] * w0 * 0.7 + sd[1] * w0 * 0.7]];
  if (jag) { left[N - 1].push(0); right[N - 1].push(0); }
  return shape([...left, ...end, ...right.reverse(), ...start]);
}
// 2-bone IK: the joint between root a and end c (lengths l1, l2), bend = +1 / -1 picks the side
function ik(a, c, l1, l2, bend) {
  const d = Math.min(Math.hypot(c[0] - a[0], c[1] - a[1]), l1 + l2 - 0.5), ang = Math.atan2(c[1] - a[1], c[0] - a[0]);
  const A = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))) * bend;
  return [a[0] + Math.cos(ang + A) * l1, a[1] + Math.sin(ang + A) * l1];
}
// a brush stroke in ink (tapered both ends), through 3+ points
const brush = (pts, w, col = INK, t0 = 0.3, t1 = 0.3) => `<path d="${K.limb(pts.length > 2 ? pts : [pts[0], lerp(pts[0], pts[1], 0.5), pts[1]], w * t0, w, w * t1)}" fill="${col}"/>`;
const dot = (p, r, col, extra = '') => `<circle cx="${n(p[0])}" cy="${n(p[1])}" r="${n(r)}" fill="${col}"${extra}/>`;

// ---------- the layer renderer (kit look; raw SVG layers may sit between parts) ----------
let WID = 0;
function render(layers) {
  const wob = `zbw${++WID}`, out = [];
  out.push(`<defs><filter id="${wob}" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="2.6"/></filter></defs>`);
  const sil = layers.filter(l => l.d && !l.noInk).map(l => `<path d="${l.d}"/>`).join('');
  out.push(`<g filter="url(#${wob})" transform="translate(${K.NUDGE[0]},${K.NUDGE[1]})" fill="${INK}" stroke="${INK}" stroke-width="${2 * K.OUTER}" stroke-linejoin="round">${sil}</g>`);
  out.push(`<g filter="url(#${wob})" fill="${INK}" stroke="${INK}" stroke-width="${2 * K.OUTER - 3}" stroke-linejoin="round">${sil}</g>`);
  for (const l of layers) out.push(l.raw != null ? l.raw : K.part(l, wob));
  return out.join('');
}

// a painted cast shadow: the caster's shapes, nudged down-right, darkening whatever is under them inside clipD
function castShadow(paths, clipD, off, op) {
  const cid = `zcs${++WID}`;
  return `<clipPath id="${cid}"><path d="${clipD}"/></clipPath><g clip-path="url(#${cid})"><g transform="translate(${n(off[0])},${n(off[1])})" fill="${INK}" opacity="${op}">${paths.map(d => `<path d="${d}"/>`).join('')}</g></g>`;
}

// ---------- costume pieces ----------
// a hand: wrist w, pointing along angle a (radians); thumb on side s (+1 / -1); o.spread / o.curl shape the 3 fingers
function hand(L, w, a, o = {}) {
  const s = o.side || 1, Hp = place(w, a, s), H = p => Hp([p[0] * 1.14, p[1] * 1.14]), far = !!o.far;
  const fill = far ? farOf(C.skin, C.skinS) : C.skin, shade = far ? K.mix(C.skinS, C.skinD, 0.5) : C.skinS;
  const sp = o.spread ?? 1, cu = o.curl ?? 1;
  // thumb (behind the palm's top edge)
  const th = [[3, -6], [9, -11 - 2 * sp], [15, -13 - 3 * sp + 3 * cu]].map(H);
  L.push({ d: K.limb(th, 7.5, 6.5, 5.6), fill, shade, shadeW: 2.2, line: 2.6, noWobbleLine: true });
  // fingers: back to front, each a little sausage with a curl
  const F = [[-4.2 * sp, 15, 0.9], [0.4, 17.5, 1], [4.6 * sp, 14.5, 1.15]];
  const fingers = F.map(([dy, len, k]) => [[11, dy * 0.55], [11 + len * 0.55, dy * 0.85 + 2.2 * cu * k], [11 + len, dy + 6 * cu * k]].map(H));
  for (const f of fingers) L.push({ d: K.limb(f, 7.4, 6.8, 6.2), fill, shade, shadeW: 2.2, line: 2.6, noWobbleLine: true });
  // palm
  L.push({ d: shape([[-3, -7.5], [8, -8.5], [15, -6], [17, 1], [14, 7.5], [5, 8.5], [-3, 6]].map(H)), fill, shade, shadeW: 3.2, line: 3, noWobbleLine: true,
    highlights: far ? [] : [[...H([5, -4]), 3.2, 1.6, n(a * 57.3), 0.5]], light: C.skinL });
  // knuckle creases
  const kn = [-0.4, 0.4].map(t => H([14.5, t * 6 * sp]));
  L.push({ raw: kn.map(p => dot(p, 0.9, K.mix(fill, INK, 0.5))).join('') });
}
// a shoe: soles on the ground line; pivot 'heel' (rotate about the heel) or 'toe'; returns the ankle socket point
function shoe(L, o) {
  const pivot = o.pivot === 'toe' ? [40, 25] : [-14, 25], A = rad(o.a || 0), k = o.s || 1.12;
  const S = p => { const q = [pivot[0] + (p[0] - pivot[0]) * k, pivot[1] + (p[1] - pivot[1]) * k]; const r = rotAbout(q, pivot, A); return [r[0] - pivot[0] + o.x, r[1] - pivot[1], ...p.slice(2)]; };
  const far = !!o.far, fill = far ? farOf(C.shoe, C.shoeS) : C.shoe, shade = far ? K.mix(C.shoeS, '#2a160c', 0.4) : C.shoeS;
  const UP = [[-15, 1], [-19, 11], [-17, 21, 0.6], [8, 22.5], [34, 21.5], [45, 16], [47.5, 7], [42, 0], [29, -3], [15, -6.5], [4, -9], [-7, -7]];
  L.push({ d: shape(UP.map(S)), fill, shade, shadeW: 6, light: C.shoeL, lightPatch: far ? null : K.oval(...S([36, 4]), 9, 5, A - 0.3),
    lightOpacity: 0.45, highlights: far ? [] : [[...S([39, 3.5]), 4.2, 2, n(-25 + (o.a || 0)), 0.9]], line: 3.4 });
  const SOLE = [[-19.5, 18.5], [6, 20], [36, 19], [47, 13, 0.5], [47.5, 19], [41, 25.5, 0.6], [-15, 25.5, 0.6], [-20, 22.5]];
  L.push({ d: shape(SOLE.map(S)), fill: far ? K.mix(C.sole, C.soleS, 0.5) : C.sole, shade: C.soleS, shadeW: 2, line: 2.8 });
  // toe-cap seam, laces, a worn crease
  const seam = [[27, -2.5], [31, 7], [32, 19]].map(S), lace1 = [[8, -7.5], [15, -3.5]].map(S), lace2 = [[14, -7], [9, -3.5]].map(S), lace3 = [[17, -5.5], [22, -1.5]].map(S);
  L.push({ raw: K.line(shape(seam, false), 2.6) + K.line(shape(lace1, false), 2.2) + K.line(shape(lace2, false), 2.2) + K.line(shape(lace3, false), 2.2)
    + brush([[-12, 4], [-10, 10], [-11, 15]].map(S), 2, K.mix(fill, INK, 0.45)) });
  return S([1, -2]);
}
// trouser leg (hip → knee → ankle) with a frayed cuff, plus the jacket's cast shadow
function leg(L, hip, ankle, o) {
  const far = !!o.far, knee = ik(hip, ankle, 34, 33, o.bend ?? -1);
  const fill = far ? farOf(C.pants, C.pantsS) : C.pants, shade = far ? K.mix(C.pantsS, '#1e3050', 0.5) : C.pantsS;
  const ankleEnd = add(ankle, mul(norm(sub(ankle, knee)), 3));
  const jag = [[0.85, 1], [0.6, 6], [0.38, 1.5], [0.12, 7], [-0.15, 2], [-0.42, 6.5], [-0.68, 1], [-0.9, 4]];
  const d = tube([hip, lerp(hip, knee, 0.5), knee, lerp(knee, ankleEnd, 0.55), ankleEnd], [25, 23.5, 20.5, 21.5, 26], jag);
  const kd = norm(sub(knee, hip)), kp = [-kd[1], kd[0]];
  L.push({ d, fill, shade, shadeW: 6, light: C.pantsL, inside: o.hemShadow || '',
    lightPatch: far ? null : K.limb([add(lerp(hip, knee, 0.25), mul(kp, 5)), add(lerp(hip, knee, 0.7), mul(kp, 5)), add(knee, mul(kp, 4))], 5, 6, 3), lightOpacity: 0.35, line: far ? 3.4 : 4 });
  // knee creases
  const kc = add(knee, mul(kp, -3));
  L.push({ raw: brush([add(kc, mul(kd, -6)), add(kc, mul(kp, -4)), add(kc, add(mul(kd, 5), mul(kp, -7)))], 2.2, K.mix(fill, INK, 0.55))
    + brush([add(knee, add(mul(kd, 10), mul(kp, 6))), add(knee, add(mul(kd, 14), mul(kp, 1))), add(knee, add(mul(kd, 15), mul(kp, -5)))], 1.8, K.mix(fill, INK, 0.45)) });
  return knee;
}
// jacket sleeve (shoulder → elbow → wrist) with a torn cuff, hand first so the sleeve covers the wrist
function arm(L, sh, wr, o) {
  const far = !!o.far, el = ik(sh, wr, o.l1 || 29, o.l2 || 29, o.bend);
  const handDir = rad(o.handAng);
  hand(L, wr, handDir, { side: o.side, far, spread: o.spread, curl: o.curl });
  const fill = far ? farOf(C.jacket, C.jacketS) : C.jacket, shade = far ? K.mix(C.jacketS, '#3a2214', 0.45) : C.jacketS;
  const wEnd = add(wr, mul(norm(sub(wr, el)), 2));
  const jag = [[0.85, 0.5], [0.55, 6], [0.25, 0.5], [-0.05, 5.5], [-0.35, 0], [-0.62, 6.5], [-0.88, 1.5]];
  const d = tube([sh, lerp(sh, el, 0.5), el, lerp(el, wEnd, 0.5), wEnd], [23, 21, 19, 19.5, 22], jag);
  const ud = norm(sub(el, sh)), up = [-ud[1], ud[0]];
  L.push({ d, fill, shade, shadeW: 5.5, light: C.jacketL, line: far ? 3.4 : 4.6,
    lightPatch: far ? null : K.limb([add(lerp(sh, el, 0.15), mul(up, -5)), add(lerp(sh, el, 0.6), mul(up, -5)), add(el, mul(up, -4))], 4, 5, 3), lightOpacity: 0.35 });
  // elbow folds
  const fd = norm(sub(wr, el)), fp = [-fd[1], fd[0]], fc = K.mix(fill, INK, 0.55);
  L.push({ raw: brush([add(el, add(mul(fd, -4), mul(fp, -6))), add(el, add(mul(fd, 1), mul(fp, -2))), add(el, add(mul(fd, 3), mul(fp, 4)))], 2.2, fc)
    + brush([add(el, add(mul(fd, 7), mul(fp, -5))), add(el, add(mul(fd, 10), mul(fp, -1))), add(el, add(mul(fd, 11), mul(fp, 3)))], 1.8, fc) });
  return { el, sleeve: d };
}

// ---------- the head (head-local coordinates: centre (0, 0), facing right) ----------
const CRANIUM = [[47, 13], [53.5, 3], [54, -9], [52, -22], [45, -33], [31, -41], [12, -45.5], [-7, -45], [-25, -40.5], [-39, -31], [-48.5, -16], [-51, 1], [-46, 15], [-35, 23], [-18, 26], [2, 22], [22, 18.5], [37, 16]];
const JAW = [[-22, 13], [-17, 29], [-2, 39.5], [22, 45.5], [45, 44.5], [59, 38], [64, 27], [61, 17.5, 0.6], [44, 19.5], [22, 21], [2, 19]];
const ULIP = [[5, 13], [22, 11], [38, 8], [51, 4]];
const JLIP = [[63, 25], [46, 26], [26, 27], [8, 23]];
const HINGE = [-18, 16];
const BUCK = [[32, 6, 0], [43.5, 6.5, 0], [44.5, 21], [42, 27, 0.4], [34.5, 26.5, 0.4], [32.5, 18]];
const LOWER = [ // three uneven lower teeth (jaw-local), roots hidden by the jaw
  [[7, 27, 0], [6.5, 13], [11, 7.5, 0.5], [16.5, 10.5], [17.5, 27, 0]],
  [[24, 27, 0], [24, 16.5], [27.5, 13.5, 0], [33, 15.5, 0], [34, 27, 0]],
  [[42, 26, 0], [41.5, 8], [48, 2.5, 0.5], [54, 8], [54.5, 26, 0]],
];

function head(L, H, J, Q) {
  const E = Q.eyes || {};
  const at = p => H(p), jt = p => J(p), tiltDeg = (Q.tilt || 0);
  // mouth interior (behind the face), tongue inside
  const mouthPts = [...ULIP.map(at), ...JLIP.map(jt)];
  L.push({ d: shape(mouthPts), fill: C.mouth, shade: C.mouthS, shadeW: 4, line: 0,
    inside: K.fillPath(K.oval(...jt([30, 31]), 17, 7.5, rad(tiltDeg + Q.jaw * 0.6)), C.tongue) + K.fillPath(K.oval(...jt([34, 33]), 13, 4, rad(tiltDeg + Q.jaw * 0.6)), C.tongueS, ' opacity="0.6"') });
  // the upper buck tooth (root under the lip)
  L.push({ d: shape(BUCK.map(p => at(rotAbout(p, [38, 8], rad(7))))), fill: C.teeth, shade: C.teethS, shadeW: 2.6, line: 2.6, noWobbleLine: true });
  // cranium
  const spots = [[-31, -6, 4.4], [-21, -23, 2.7], [29, -33, 2.2], [-40, 9, 2.4], [-12, 6, 1.8]];
  const inside = [
    // sunken eye sockets + hollow cheek (painted shade shapes)
    K.fillPath(K.oval(...at([14, -11]), 23.5, 25, rad(tiltDeg - 8), [[3, 0.03, 0.4]]), K.mix(C.skin, C.skinS, 0.55)),
    K.fillPath(K.oval(...at([42, -12]), 15, 16.5, rad(tiltDeg + 6)), K.mix(C.skin, C.skinS, 0.5)),
    K.fillPath(shape([[0, 10], [12, 5], [26, 8], [22, 15], [8, 17]].map(at)), K.mix(C.skin, C.skinS, 0.6)),
    ...spots.map(([x, y, r]) => dot(at([x, y]), r, C.spot)),
  ].join('');
  L.push({ d: shape(CRANIUM.map(at)), fill: C.skin, shade: C.skinS, shadeW: 10, light: C.skinL, line: 4.2, inside,
    lightPatch: K.oval(...at([-18, -25]), 25, 12, rad(tiltDeg - 32)), lightOpacity: 0.5,
    highlights: [[...at([-25, -30]), 7.5, 3.2, tiltDeg - 38, 0.85], [...at([-36, -17]), 2.6, 1.7, tiltDeg - 60, 0.75], [...at([33, -36]), 4, 1.8, tiltDeg - 15, 0.6]] });
  // ear (side of the head)
  L.push({ d: K.oval(...at([-29, 1]), 9.5, 12.5, rad(tiltDeg - 12), [[2, 0.06, 0.3]]), fill: C.skin, shade: C.skinS, shadeW: 3.5, line: 3.2 });
  L.push({ raw: brush([[-27, -6], [-33, -1], [-31, 7], [-26, 8]].map(at), 2.6) });
  // nose
  L.push({ d: K.oval(...at([55, 0]), 8.5, 7.5, rad(tiltDeg + 20), [[2, 0.05, 1]]), fill: C.skin, shade: C.skinS, shadeW: 3, line: 3.2, light: C.skinL, highlights: [[...at([52.5, -3]), 2.6, 1.4, tiltDeg - 20, 0.8]] });
  L.push({ raw: dot(at([57.5, 4]), 1.6, INK) });
  // lower teeth (in front of the upper lip: an underbite), then the jaw over their roots
  LOWER.forEach((t, i) => L.push({ d: shape(t.map(p => jt(rotAbout(p, [t[0][0] + 4, 24], rad([-12, 4, 9][i]))))), fill: C.teeth, shade: C.teethS, shadeW: 2.4, line: 2.6, noWobbleLine: true }));
  L.push({ d: shape(JAW.map(jt)), fill: C.skin, shade: C.skinS, shadeW: 8, light: C.skinL, line: 4.2,
    inside: dot(jt([6, 33]), 2.2, C.spot) + dot(jt([40, 38]), 1.6, C.spot),
    lightPatch: K.oval(...jt([30, 30]), 15, 5, rad(tiltDeg + Q.jaw + 4)), lightOpacity: 0.35, highlights: [[...jt([50, 30]), 3.5, 1.6, tiltDeg + Q.jaw - 20, 0.6]] });
  // chin cleft / jaw crease
  L.push({ raw: brush([[48, 33], [53, 37], [55, 41]].map(jt), 1.8, K.mix(C.skin, INK, 0.5)) });
  // eyes
  L.push({ raw: eyes(H, Q, E) });
  // stitches across the back of the skull
  L.push({ raw: stitches([[-41, -21], [-32, -30], [-20, -36], [-9, -38.5]].map(at), 4) });
  // cheek crease (nose → mouth corner), under-eye bag
  L.push({ raw: brush([[49, 7], [44, 11], [42, 15]].map(at), 2, K.mix(C.skin, INK, 0.55)) + brush([[3, 8], [12, 11.5], [22, 9]].map(at), 2, K.mix(C.skin, INK, 0.5)) });
  // hair: three stubborn strands
  const HAIR = Q.hair || [[[-3, -44], [-6, -54], [-14, -59], [-19, -55]], [[6, -45], [9, -55], [17, -60]], [[-14, -43], [-21, -50], [-29, -50]]];
  L.push({ raw: HAIR.map(h => brush(h.map(at), 3.4, INK, 0.9, 0.25)).join('') });
}
function eyes(H, Q, E) {
  const t = Q.tilt || 0, out = [];
  const B = { c: H([13, -14]), rx: 17.5, ry: 19.5 }, S = { c: H([42, -14]), rx: 10.5, ry: 12 };
  const bold = e => `<ellipse cx="${n(e.c[0] + 0.9)}" cy="${n(e.c[1] + 1.2)}" rx="${n(e.rx + 2.3)}" ry="${n(e.ry + 2.3)}" transform="rotate(${n(t)} ${n(e.c[0] + 0.9)} ${n(e.c[1] + 1.2)})" fill="${INK}"/>`;
  const state = E.state || 'open';
  if (state === 'squeeze') { // squeezed shut: bulging lids with a crease
    for (const [e, s] of [[B, 1], [S, -1]]) {
      out.push(bold(e), `<ellipse cx="${n(e.c[0])}" cy="${n(e.c[1])}" rx="${n(e.rx)}" ry="${n(e.ry * 0.92)}" transform="rotate(${n(t)} ${n(e.c[0])} ${n(e.c[1])})" fill="${C.skin}"/>`);
      out.push(`<ellipse cx="${n(e.c[0] + e.rx * 0.2)}" cy="${n(e.c[1] + e.ry * 0.35)}" rx="${n(e.rx * 0.9)}" ry="${n(e.ry * 0.5)}" fill="${C.skinS}" opacity="0.6"/>`);
      out.push(K.line(shape([[-0.85 * s, -0.45], [0.55 * s, 0.02], [-0.85 * s, 0.5]].map(([x, y]) => H(add([x * e.rx, y * e.ry], sub(e.c === B.c ? [13, -14] : [42, -14], [0, 0])))), false, 0.4), Math.max(3, e.rx * 0.28)));
    }
  } else {
    out.push(bold(B), bold(S));
    out.push(K.eye({ cx: B.c[0], cy: B.c[1], rx: B.rx, ry: B.ry, white: true, sclera: C.sclera, scleraShade: C.scleraS, iris: INK, pupil: E.pupilB || 0.3, look: E.lookB || [0.5, 0.1], lid: E.lidB ?? 0.2, lidCol: C.skin, rot: t }));
    out.push(K.eye({ cx: S.c[0], cy: S.c[1], rx: S.rx, ry: S.ry, white: true, sclera: C.sclera, scleraShade: C.scleraS, iris: INK, pupil: E.pupilS || 0.38, look: E.lookS || [0.55, -0.3], lid: E.lidS ?? 0, lidCol: C.skin, rot: t }));
  }
  // brows: bald brow ridges as brush strokes (shape varies by mood)
  const bb = E.browB || [[-3, -37], [12, -42], [27, -37]], bs = E.browS || [[34, -31], [42, -34.5], [50, -30]];
  out.push(brush(bb.map(H), 4.2), brush(bs.map(H), 3.4));
  return out.join('');
}
function stitches(pts, k) {
  let s = K.line(shape(pts, false), 2.4, K.mix(C.skinS, INK, 0.5));
  for (let i = 1; i <= k; i++) {
    const t = i / (k + 1), seg = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1))), u = t * (pts.length - 1) - seg;
    const p = lerp(pts[seg], pts[seg + 1], u), d = norm(sub(pts[seg + 1], pts[seg])), q = [-d[1], d[0]];
    s += K.line(`M${n(p[0] + q[0] * 4.5 - d[0])},${n(p[1] + q[1] * 4.5 - d[1])} L${n(p[0] - q[0] * 4.5 + d[0])},${n(p[1] - q[1] * 4.5 + d[1])}`, 2.2);
  }
  return s;
}

// ---------- the torso (torso-local: origin at the pelvis centre, y down) ----------
const JACKET = [[-29, 6, 0], [-33.5, -8], [-34, -26], [-29.5, -43], [-18, -54.5], [-4, -60.5], [12, -60], [24, -53], [30.5, -38], [32.5, -20], [31.5, -3], [29.5, 7, 0],
  [24, 12.5, 0], [19.5, 5, 0], [14, 13.5, 0], [8.5, 6.5, 0], [3, 10, 0], [-2.5, 4, 0], [-8, 12.5, 0], [-14, 5.5, 0], [-18, 10, 0], [-23.5, 4.5, 0]];
const SHIRT = [[3, -59, 0.5], [14, -62.5], [25.5, -54.5, 0.5], [27, -46], [19.5, -25, 0], [10, -45]];
const LAPEL = [[1, -58, 0], [9.5, -46], [19.5, -25, 0], [6, -37, 0], [-1, -50]];
const PATCH = [[-27, -22, 0], [-12, -24, 0.3], [-11, -9, 0], [-25.5, -7, 0.3]];

function torso(L, T, Q) {
  // neck (mostly hidden under the jaw)
  // jacket body
  const hemShadowFor = null;
  L.push({ d: shape(JACKET.map(T)), fill: C.jacket, shade: C.jacketS, shadeW: 9, light: C.jacketL, line: 4,
    lightPatch: K.oval(...T([-21, -34]), 7, 17, rad(Q.lean + 18)), lightOpacity: 0.4,
    highlights: [[...T([-17, -50]), 6, 2.2, Q.lean - 30, 0.55]],
    inside: brush([[-26, -40], [-19, -33], [-18, -24]].map(T), 2.4, K.mix(C.jacket, INK, 0.5)) + brush([[24, -22], [18, -17], [14, -10]].map(T), 2, K.mix(C.jacket, INK, 0.5)) });
  // shirt + collar + lapel
  L.push({ d: shape(SHIRT.map(T)), fill: C.shirt, shade: C.shirtS, shadeW: 4, line: 3 });
  L.push({ d: shape([[2, -58.5, 0], [13, -58, 0], [8, -49.5, 0]].map(T)), fill: C.shirt, shade: C.shirtS, shadeW: 2, line: 2.6, noWobbleLine: true });
  L.push({ d: shape([[15, -60, 0], [26.5, -54, 0], [22, -48, 0]].map(T)), fill: C.shirt, shade: C.shirtS, shadeW: 2, line: 2.6, noWobbleLine: true });
  L.push({ d: shape(LAPEL.map(T)), fill: K.mix(C.jacket, C.jacketL, 0.25), shade: C.jacketS, shadeW: 3, line: 3 });
  // patch + stitches, pocket, buttons
  L.push({ d: shape(PATCH.map(T)), fill: C.patch, shade: C.patchS, shadeW: 3, light: C.patchL, highlights: [[...T([-22, -13]), 3, 1.4, Q.lean - 10, 0.6]], line: 2.8, noWobbleLine: true });
  const ps = PATCH.map(T); let st = '';
  for (let i = 0; i < 4; i++) { const a = ps[i], b = ps[(i + 1) % 4]; for (const t of [0.3, 0.7]) { const p = lerp(a, b, t), d = norm(sub(b, a)), q = [-d[1], d[0]]; st += K.line(`M${n(p[0] + q[0] * 2.5)},${n(p[1] + q[1] * 2.5)} L${n(p[0] - q[0] * 2.5)},${n(p[1] - q[1] * 2.5)}`, 1.6); } }
  L.push({ raw: st });
  L.push({ raw: brush([[11, -9], [20, -10.5], [28, -8]].map(T), 2.4) });
  const btn = [[25.5, -19], [26.5, -6]].map(T);
  L.push({ raw: btn.map(p => dot(p, 3.6, C.button, ` stroke="${INK}" stroke-width="1.8"`) + dot(add(p, [-1, -1]), 0.8, C.thread) + dot(add(p, [1, 0.6]), 0.8, C.thread)).join('') });
}
function tie(L, T, Q) {
  const knot = T([14.5, -54.5]), a = rad(90 - (Q.tieSwing || 0)), X = place(knot, a), bend = Q.tieBend ?? 3;
  const blade = [[1, -4], [14, -5.8], [31, -7.6, 0.5], [40, 0, 0], [31, 7.6, 0.5], [14, 5.8], [1, 4]].map(([x, y, k]) => [x, y + bend * Math.sin(Math.PI * x / 40), k]);
  L.push({ d: shape(blade.map(X)), fill: C.tie, shade: C.tieS, shadeW: 3, light: C.tieL, highlights: [[...X([14, -2]), 5, 1.4, n(a * 57.3), 0.6]], line: 2.8, noWobbleLine: true,
    inside: [[9, 13], [19, 23], [29, 33]].map(([a0, a1]) => K.fillPath(shape([[a0, -9, 0], [a0 + 4.5, -9, 0], [a1 + 4.5, 9, 0], [a1, 9, 0]].map(X)), C.tieS, ' opacity="0.75"')).join('') });
  L.push({ d: K.oval(...knot, 5.2, 4.4, a), fill: C.tie, shade: C.tieS, shadeW: 1.8, line: 2.6, noWobbleLine: true });
}

// ---------- assemble one pose ----------
function zombie(Q) {
  const L = [];
  const T = place(Q.pelvis, rad(Q.lean));
  const neckBase = T([6, -56]);
  const Cn = add(neckBase, Q.headOff);
  const H = place(Cn, rad(Q.tilt));
  const J = p => H(add(rotAbout(p, HINGE, rad(Q.jaw)), Q.jawShift || [0, 0]));
  // far arm (behind everything)
  arm(L, T([15, -51]), Q.farArm.wrist, { ...Q.farArm, far: true });
  // legs: far then near; jacket hem cast shadow on the trousers
  const hem = JACKET.slice(11).map(T), hemShadow = K.fillPath(shape([...hem.map(p => add(p, [1.5, 6.5])), add(hem[hem.length - 1], [-40, -80]), add(hem[0], [40, -80])]), C.pantsS, ' opacity="0.85"');
  const fa = shoe(L, { ...Q.farFoot, far: true });
  leg(L, T([-11, 1]), fa, { far: true, hemShadow, bend: Q.farFoot.bend });
  const na = shoe(L, Q.nearFoot);
  leg(L, T([8, 2]), na, { hemShadow, bend: Q.nearFoot.bend });
  // neck, torso, tie
  const nt = H([-14, 20]);
  L.push({ d: K.limb([neckBase, lerp(neckBase, nt, 0.5), nt], 19, 16, 18), fill: C.skin, shade: C.skinS, shadeW: 5, line: 3 });
  torso(L, T, Q);
  tie(L, T, Q);
  // painted cast shadows on the jacket: the big head / jaw, and the near arm
  const jd = shape(JACKET.map(T)), nearL = [], near = arm(nearL, T([-9, -50]), Q.nearArm.wrist, Q.nearArm);
  L.push({ raw: castShadow([shape(CRANIUM.map(H)), shape(JAW.map(J))], jd, [2.5, 7.5], 0.32) + castShadow([near.sleeve], jd, [4, 5], 0.26) });
  // head, then the near arm in front
  head(L, H, J, Q);
  L.push(...nearL);
  return K.frame(render(L), 0, Q.dy ?? -10);
}

// ---------- the five poses ----------
export const POSES = {
  idle: { // hunched, slack-jawed rest: the forward arm hangs limp, the other dangles, weight on both big shoes
    pelvis: [-14, -88], lean: 22, headOff: [22, -28], tilt: 4, jaw: 10, tieSwing: 14,
    eyes: { lookB: [0.5, 0.15], lookS: [0.55, -0.3], lidB: 0.22 },
    farArm: { wrist: [80, -96], bend: 1, handAng: 80, side: -1, l1: 31, l2: 31 },
    nearArm: { wrist: [2, -86], bend: -1, handAng: 95, side: 1, curl: 1.2 },
    farFoot: { x: -62, a: -5 }, nearFoot: { x: 0, a: 0 },
  },
  walk0: { // near leg strides forward on its heel, far foot pushes off its toe; near arm swings back, far arm reaches; body low
    pelvis: [-12, -86], lean: 24, headOff: [24, -26], tilt: 9, jaw: 13, tieSwing: 26,
    eyes: { lookB: [0.6, 0.25], lookS: [0.6, -0.05], lidB: 0.26 },
    farArm: { wrist: [86, -110], bend: 1, handAng: 64, side: -1, l1: 31, l2: 31 },
    nearArm: { wrist: [-36, -94], bend: -1, handAng: 118, side: 1 },
    farFoot: { x: -24, a: 16, pivot: 'toe' }, nearFoot: { x: 26, a: -12 },
  },
  walk1: { // the other step: far leg forward, near foot drags on its toe; near arm swings forward, far arm droops; body high
    pelvis: [-12, -89], lean: 15, headOff: [20, -27], tilt: -3, jaw: 6, tieSwing: 6,
    eyes: { lookB: [0.45, -0.05], lookS: [0.5, -0.4], lidB: 0.18 },
    farArm: { wrist: [72, -92], bend: 1, handAng: 86, side: -1, l1: 31, l2: 31 },
    nearArm: { wrist: [34, -100], bend: 1, handAng: 72, side: 1 },
    farFoot: { x: 10, a: -8 }, nearFoot: { x: -28, a: 22, pivot: 'toe' },
  },
  bite: { // lunging, head tipped back so the huge jaw gapes, both claws grabbing low under the chin
    pelvis: [-16, -86], lean: 24, headOff: [30, -30], tilt: -8, jaw: 22, tieSwing: 34,
    eyes: { lookB: [0.75, 0.35], lookS: [0.75, 0.3], lidB: 0.06, pupilB: 0.26, pupilS: 0.32, browB: [[-2, -32], [12, -35], [27, -41]], browS: [[33, -38], [42, -33], [50, -30]] },
    farArm: { wrist: [72, -94], bend: 1, handAng: 28, side: -1, spread: 1.7, curl: 1.4, l1: 33, l2: 33 },
    nearArm: { wrist: [50, -96], bend: 1, handAng: 40, side: 1, spread: 1.7, curl: 1.4, l1: 33, l2: 33 },
    farFoot: { x: -30, a: 12, pivot: 'toe' }, nearFoot: { x: 10, a: 0 },
  },
  hurt: { // recoiling backwards: head thrown back, eyes squeezed, jaw knocked askew, arms flung, tie flying
    pelvis: [-20, -86], lean: -14, headOff: [4, -24], tilt: -20, jaw: 16, jawShift: [-5, 3], tieSwing: 70, tieBend: -5,
    eyes: { state: 'squeeze', browB: [[-2, -30], [12, -38], [26, -40]], browS: [[34, -40], [42, -38], [50, -32]] },
    farArm: { wrist: [58, -158], bend: -1, handAng: -60, side: -1, spread: 1.5, l1: 31, l2: 31 },
    nearArm: { wrist: [-84, -122], bend: 1, handAng: -165, side: 1, spread: 1.4 },
    farFoot: { x: -44, a: 0 }, nearFoot: { x: 4, a: -16 },
  },
};

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] || '')) {
  const only = process.argv[2];
  for (const [name, Q] of Object.entries(POSES)) {
    if (only && !only.split(',').includes(name)) continue;
    K.write(path.join(OUT, `${name}.svg`), zombie(Q));
    console.log('wrote', path.relative(process.cwd(), path.join(OUT, `${name}.svg`)));
  }
}
