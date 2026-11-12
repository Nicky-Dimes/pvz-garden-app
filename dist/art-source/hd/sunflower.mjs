#!/usr/bin/env node
// sunflower.mjs — PVZ Garden illustrated Sunflower (art source only, never shipped).
//   node pvz-garden/art-source/hd/sunflower.mjs        → plants/sunflower/stage-{0,1,2}/<pose>.svg (24 editable SVG sources)
//   node tools/hd_art_render.mjs sunflower              → the 256 x 256 transparent PNG next to each SVG
//
// One rig drives every frame, all drawn with the shared house-style kit (kit.mjs: ink silhouette pass, cel-shadow crescents,
// light patches, glossy PvZ plant eyes) so the Sunflower and the Basic Zombie read as one game.
//   * a HEAD = a ring of petals (fixed count and fixed per-petal irregularities, seeded per head, so it is the same flower in
//     every pose) round a warm-orange face disc, turned 3/4 to the right (x squashed 0.92, features shifted right);
//     pose controls: position, tilt, squash/stretch, petal swing / drag-bend / flare / ruffle / gravity droop, and the face.
//   * the BODY = curved stems (one per head; side stems branch off the main stem) + broad base leaves that act as feet +
//     two arm leaves on the main stem; stage 1 / 2 add leaves on the side stems.
//   * every pose is its own set of numbers (POSES below): the lean and line of action of the stems, which foot leaf is lifted,
//     where the arm leaves go, how each head bobs / tilts / reacts, and each head's expression.
// The lowest body point is snapped to the ground line so the base sits on (128, 248) in every frame.
import * as K from './kit.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'plants', 'sunflower');
const { n, INK } = K;
const RAD = Math.PI / 180;
export const POSE_NAMES = ['idle', 'blink', 'walk0', 'walk1', 'cheer', 'attack', 'hurt', 'knocked'];
const GROUND = -9; // the lowest body path point (the ink line below it lands on y ≈ 248-250)

// ---------- palette ----------
const PET = { fill: '#ffcf33', shade: '#e39a17', light: '#fff2a6' };
const BACKPET = { fill: '#f2a91e', shade: '#c97a12' };
const FACE = { fill: '#f0902d', shade: '#c4621a', light: '#ffc27a' };
const GRN = { fill: '#63b43c', shade: '#3c7f27', light: '#b8ec80' };
const GOLD = { fill: '#ffe066', shade: '#d6941a', light: '#fffbe6' };
const RUBY = { fill: '#e8336b', shade: '#9c1243', light: '#ffb3cb' };
const SAPH = { fill: '#3fb6f2', shade: '#1a6fae', light: '#c4ecff' };
const EYE = '#2b1a17', MOUTH = '#5a1f22', TONGUE = '#e8676f', BLUSH = '#ff4f6a', TEETH = '#fffbea';

let uidN = 0;
const uid = p => `sf${p}${(++uidN).toString(36)}`;
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const P2 = p => `${n(p[0])},${n(p[1])}`;
const lerp = (a, b, t) => a + (b - a) * t;
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const pol = (a, r) => [Math.cos(a * RAD) * r, Math.sin(a * RAD) * r];

// ---------- ink: the kit's silhouette recipe (K.draw), split so the whole character gets ONE bold outer contour and each head
// gets a thinner overlap line where it sits over the body / another head ----------
const OUTER_W = 6.2, OVERLAP_W = 3.6;
function wobDefs(id, seed, scale = 2.6) { return `<defs><filter id="${id}" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="${seed}"/><feDisplacementMap in="SourceGraphic" scale="${scale}"/></filter></defs>`; }
function inkPass(parts, outer, wid) {
  const sil = parts.filter(p => !p.noInk).map(p => `<path d="${p.d}"/>`).join('');
  return `<g filter="url(#${wid})" transform="translate(${K.NUDGE[0]},${K.NUDGE[1]})" fill="${INK}" stroke="${INK}" stroke-width="${n(2 * outer)}" stroke-linejoin="round">${sil}</g>`
    + `<g filter="url(#${wid})" fill="${INK}" stroke="${INK}" stroke-width="${n(2 * outer - 3)}" stroke-linejoin="round">${sil}</g>`;
}
const colour = (parts, wid) => parts.map(p => K.part(p, wid)).join('');

// ---------- the head transform: head space (centre 0,0, unrotated, R = disc radius) → frame space ----------
function xf(h) {
  const a = (h.tilt || 0) * RAD, c = Math.cos(a), s = Math.sin(a), kx = (h.sx || 1) * (h.turn ?? 0.92), ky = h.sy || 1;
  const f = p => { const x = p[0] * kx, y = p[1] * ky; return [h.x + x * c - y * s, h.y + x * s + y * c]; };
  f.attr = `translate(${n(h.x)} ${n(h.y)}) rotate(${n(h.tilt || 0)}) scale(${n(kx)} ${n(ky)})`;
  f.kx = kx; f.ky = ky; f.rot = h.tilt || 0;
  return f;
}

// ---------- petals ----------
// a broad rounded petal from radius r0 (hidden under the disc) to r1 along angle a (radians, head space); bend = sideways curl of
// the tip (px), skew = tip offset (px)
function petalPts(T, a, r0, r1, w, bend, skew) {
  const ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux, L = r1 - r0, W = w / 2;
  const at = (t, s) => { const b = bend * t * t, r = r0 + L * t; return T([ux * r + px * (s + b), uy * r + py * (s + b)]); };
  return [at(0, 0), at(0.2, W * 0.64), at(0.47, W), at(0.74, W * 0.86), at(0.93, W * 0.44 + skew * 0.5), at(1, skew), at(0.93, -W * 0.4 + skew * 0.5), at(0.74, -W * 0.8), at(0.47, -W * 0.96), at(0.2, -W * 0.6)];
}

// head parts: petals (back) + the face disc. Returns { parts, T }
function headParts(h) {
  const T = xf(h), R = h.R, N = h.n, rnd = rng(h.seed), P = h.petals || {};
  const fix = Array.from({ length: N }, () => ({ dl: (rnd() - 0.5) * 0.16, dw: (rnd() - 0.5) * 0.14, da: (rnd() - 0.5) * 0.09, sk: (rnd() - 0.5) * 0.5 }));
  const pr = rng(h.seed * 7 + (P.ruffleSeed || 1)); // pose-dependent randomness (ruffle)
  const parts = [], step = Math.PI * 2 / N, tiltR = (h.tilt || 0) * RAD;
  const a0 = (h.a0 ?? -90) * RAD + (P.swing || 0) * RAD;
  // the back ring: darker, a little shorter, half a step round, filling the notches between the front petals
  for (let i = 0; i < N; i++) {
    const f = fix[(i + 3) % N];
    let a = a0 + (i + 0.5) * step - f.da * 0.5 - (P.swing || 0) * RAD * 0.35, len = 0.5 * (1 - f.dl * 0.5) * (P.flare || 1), wid = 0.52, bend = (P.bend || 0) * R * 0.6;
    if (P.droop) { const c = Math.cos(a + tiltR), s = Math.sin(a + tiltR); a += P.droop * c * 0.75; len *= 1 - P.droop * 0.4 * Math.max(0, -s); wid *= 1 - P.droop * 0.2; }
    if (P.ruffle) { a += (pr() - 0.5) * P.ruffle * 1.4; len *= 1 + (pr() - 0.5) * P.ruffle * 0.5; }
    if (P.drag) { const wa = a + tiltR; bend += (P.drag[0] * -Math.sin(wa) + P.drag[1] * Math.cos(wa)) * R * 0.7; }
    const blit = Math.cos(a + tiltR) * -0.66 + Math.sin(a + tiltR) * -0.75;
    parts.push({ d: K.blob(petalPts(T, a, R * 0.6, R * (1 + len), R * wid, bend, 0)), fill: blit < 0 ? K.mix(BACKPET.fill, BACKPET.shade, -blit * 0.3) : BACKPET.fill, shade: BACKPET.shade, shadeW: Math.max(3, R * 0.12), line: Math.max(2.2, R * 0.075) });
  }
  for (let k = 0; k < N; k++) {
    const i = (k + (h.first || 0)) % N, f = fix[i];
    let a = a0 + i * step + f.da;
    let len = 0.58 * (1 + f.dl) * (P.flare || 1), wid = 0.62 * (1 + f.dw) * (P.wide || 1), bend = (P.bend || 0) * R, sk = f.sk * R * 0.12;
    if (P.ruffle) { const q = (pr() - 0.5) * 2; a += q * P.ruffle; bend += (pr() - 0.5) * P.ruffle * R * 0.9; len *= 1 + (pr() - 0.5) * P.ruffle * 0.6; }
    if (P.flutter) { bend += (i % 2 ? 1 : -1) * P.flutter * R; }
    if (P.drag) { const wa = a + tiltR; bend += (P.drag[0] * -Math.sin(wa) + P.drag[1] * Math.cos(wa)) * R; len *= 1 + (P.drag[0] * Math.cos(wa) + P.drag[1] * Math.sin(wa)) * 0.5; }
    if (P.droop) { // gravity in frame space: side petals hang down, upward petals fold back (shorter), all go limp (narrower)
      const wa = a + tiltR, c = Math.cos(wa), s = Math.sin(wa);
      a += P.droop * c * 0.9; len *= 1 - P.droop * 0.42 * Math.max(0, -s); wid *= 1 - P.droop * 0.22;
      bend += P.droop * R * 0.18 * c;
    }
    const pts = petalPts(T, a, R * 0.6, R * (1 + len), R * wid, bend, sk);
    // painted light: petals that face the upper-left light get a soft light stroke toward their tip
    const wa = a + tiltR, face = Math.max(0, -(Math.cos(wa) * -0.66 + Math.sin(wa) * -0.75) * -1);
    const lit = Math.max(0, Math.cos(wa) * -0.66 + Math.sin(wa) * -0.75); // 1 = pointing at the light
    const ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux, rr = R * (1 + len * 0.62);
    const hc = T([ux * rr + px * -R * wid * 0.14, uy * rr + py * -R * wid * 0.14]);
    const hl = lit > 0.25 ? [[hc[0], hc[1], R * len * 0.2, R * wid * 0.12, (a * 1 + tiltR) / RAD, 0.2 + lit * 0.55]] : [];
    // a crease from the base of the petal (shade colour, clipped inside the petal)
    const c0 = T([ux * R * 1.04, uy * R * 1.04]), c1 = T([ux * R * (1 + len * 0.55) + px * bend * 0.3, uy * R * (1 + len * 0.55) + py * bend * 0.3]);
    const inside = K.line(`M${P2(c0)} L${P2(c1)}`, Math.max(1.2, R * 0.04), PET.shade, ' opacity="0.42"');
    const tone = lit > 0.5 ? K.mix(PET.fill, PET.light, (lit - 0.5) * 0.4) : K.mix(PET.fill, PET.shade, Math.min(0.38, (0.5 - lit) * 0.26));
    parts.push({ d: K.blob(pts), ...PET, fill: tone, shadeW: Math.max(3.2, R * 0.13), highlights: hl, inside, line: Math.max(2.4, R * 0.085) });
    void face;
  }
  // the face disc: a slightly irregular oval, a ring of seed dimples near its rim, a light crescent upper-left
  const disc = K.oval(h.x, h.y, R * T.kx, R * T.ky, tiltR, [[2, 0.018, h.seed % 5], [3, 0.014, 1.3], [5, 0.008, 0.4]], 20);
  let seeds = '';
  const sr = rng(h.seed + 99);
  const rim = K.oval(h.x, h.y, R * T.kx * 0.86, R * T.ky * 0.86, tiltR, [[3, 0.012, 0.5]], 20);
  seeds += `<path d="${disc} ${rim}" fill="${FACE.shade}" fill-rule="evenodd" opacity="0.28"/>`;
  for (let i = 0; i < 34; i++) {
    const a = i * (360 / 34) + (i % 2) * 5, r = (i % 2 ? 0.885 : 0.95) * R, p = T(pol(a, r));
    seeds += `<ellipse cx="${n(p[0])}" cy="${n(p[1])}" rx="${n(R * 0.035)}" ry="${n(R * 0.026)}" transform="rotate(${n(a + T.rot)} ${n(p[0])} ${n(p[1])})" fill="#a84f12" opacity="${n(0.3 + sr() * 0.15)}"/>`;
  }
  const lightPatch = crescent(T, R * 0.8, R * 0.66, 186, 256);
  const hp = T([-R * 0.4, -R * 0.56]), hq = T([-R * 0.6, -R * 0.3]);
  parts.push({ d: disc, ...FACE, shadeW: Math.max(4, R * 0.15), inside: seeds, lightPatch, lightOpacity: 0.45, highlights: [[hp[0], hp[1], R * 0.1, R * 0.04, -38 + T.rot, 0.7], [hq[0], hq[1], R * 0.045, R * 0.03, -60 + T.rot, 0.55]], line: Math.max(3, R * 0.1) });
  return { parts, T };
}
// a crescent (head space, angles in degrees) along the inside of a circle: outer radius r0, inner radius r1 at the middle
function crescent(T, r0, r1, a0, a1, k = 8) {
  const pts = [];
  for (let i = 0; i <= k; i++) pts.push(T(pol(lerp(a0, a1, i / k), r0)));
  for (let i = k - 1; i >= 1; i--) { const t = i / k; pts.push(T(pol(lerp(a0, a1, t), r0 - (r0 - r1) * Math.sin(Math.PI * t)))); }
  return K.blob(pts);
}

// ---------- faces (drawn in head space inside the head's transform) ----------
function faceSvg(h) {
  const R = h.R, F = h.face || {}, out = [];
  const fx = R * (0.2 + (F.fx || 0)), fy = R * (0.03 + (F.fy || 0));
  const ne = { cx: fx - R * 0.3, cy: fy - R * 0.13, rx: R * 0.16, ry: R * 0.265 };
  const fe = { cx: fx + R * 0.27, cy: fy - R * 0.15, rx: R * 0.14, ry: R * 0.25 };
  // cheeks
  const bo = F.blush ?? 0.55;
  if (bo > 0) out.push(K.blush(fx - R * 0.5, fy + R * 0.17, R * 0.15, R * 0.085, BLUSH, bo), K.blush(fx + R * 0.47, fy + R * 0.14, R * 0.11, R * 0.08, BLUSH, bo));
  // eyes
  const es = F.eyes || 'open', look = F.look || [0.45, -0.05];
  for (const [e, side] of [[ne, 1], [fe, -1]]) {
    const o = { ...e, iris: EYE, look, lidCol: FACE.fill };
    if (es === 'spiral') { out.push(spiral(e.cx, e.cy, e.rx * 1.25, e.ry * 0.95, side, R)); continue; }
    if (es === 'open' || es === 'wide') { o.state = es; if (F.lid) o.lid = F.lid; }
    else if (es === 'squint') { o.state = 'squint'; o.side = side; o.rx *= 1.1; }
    else o.state = es;
    out.push(K.eye(o));
  }
  // brows: [near, far] as { dy (above the eye top, R units), tilt (rad, + = left end up), w, arch }
  if (F.brows) F.brows.forEach((b, i) => { if (!b) return; const e = i ? fe : ne; out.push(brow(e.cx + (b.dx || 0) * R, e.cy - e.ry - b.dy * R, b.w * R, b.tilt, (b.arch ?? 0.05) * R, R * (b.th || 0.085))); });
  // mouth
  out.push(mouthSvg({ x: fx + R * (0.02 + (F.mx || 0)), y: fy + R * (0.34 + (F.my || 0)), w: R * (F.mw || 0.68), h: R * (F.mh || 0.38), kind: F.mouth || 'smile', lift: R * (F.lift ?? 0.06) }, R));
  return out.join('');
}
function brow(cx, cy, w, tilt, arch, th) {
  const a = [cx - w / 2, cy - Math.sin(tilt) * w / 2], c = [cx + w / 2, cy + Math.sin(tilt) * w / 2], m = [cx, cy - arch];
  return `<path d="${K.limb([a, m, c], th * 0.75, th, th * 0.55)}" fill="${INK}"/>`;
}
function spiral(cx, cy, rx, ry, dir, R) {
  const pts = [];
  for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * Math.PI * 3.6 * dir, r = 0.12 + t * 0.88; pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]); }
  return K.line(K.curve(pts), Math.max(2.4, R * 0.075));
}
function mouthSvg(m, R) {
  const { x, y, w, h, kind } = m, lw = Math.max(2.8, R * 0.09), out = [];
  let d = null, inner = '', after = '';
  if (kind === 'smile' || kind === 'grin' || kind === 'big') {
    const lift = m.lift || 0, L = [x - w / 2, y + lift * 0.3], Rt = [x + w / 2, y - lift];
    const dip = kind === 'big' ? 0.02 : 0.12;
    d = `M${P2(L)} C${P2([x - w * 0.18, y + h * dip])} ${P2([x + w * 0.2, y + h * dip - lift * 0.6])} ${P2(Rt)} C${P2([Rt[0] + w * 0.03, Rt[1] + h * 1.02])} ${P2([L[0] + w * 0.02, L[1] + h * 1.15])} ${P2(L)}Z`;
    inner += `<ellipse cx="${n(x + w * 0.1)}" cy="${n(y + h * (kind === 'big' ? 0.86 : 0.84))}" rx="${n(w * 0.3)}" ry="${n(h * (kind === 'big' ? 0.34 : 0.3))}" fill="${TONGUE}"/>`;
    if (kind === 'grin' || kind === 'big') { // a band of upper teeth under the top lip
      const tb = kind === 'big' ? 0.2 : 0.3;
      inner += `<path d="M${P2([L[0] - 2, L[1] - 4])} L${P2([Rt[0] + 2, Rt[1] - 4])} L${P2([Rt[0] + 2, Rt[1] + h * tb])} Q${P2([x, y + h * (tb + 0.18)])} ${P2([L[0] - 2, L[1] + h * tb])}Z" fill="${TEETH}"/>`;
    }
    // smile creases at the corners
    after += K.line(`M${P2([L[0] - w * 0.05, L[1] - h * 0.2])} Q${P2([L[0] - w * 0.11, L[1] + h * 0.02])} ${P2([L[0] - w * 0.03, L[1] + h * 0.2])}`, lw * 0.75);
    after += K.line(`M${P2([Rt[0] + w * 0.03, Rt[1] - h * 0.24])} Q${P2([Rt[0] + w * 0.1, Rt[1] - h * 0.02])} ${P2([Rt[0] + w * 0.04, Rt[1] + h * 0.16])}`, lw * 0.75);
  } else if (kind === 'o') { // puffing / beaming: a small round mouth pushed forward, cheeks puffed
    d = K.oval(x + w * 0.12, y + h * 0.18, w * 0.19, h * 0.36, 0.15, [[2, 0.05, 0.6]]);
    inner += `<ellipse cx="${n(x + w * 0.16)}" cy="${n(y + h * 0.42)}" rx="${n(w * 0.13)}" ry="${n(h * 0.14)}" fill="${TONGUE}"/>`;
    after += K.line(`M${P2([x - w * 0.3, y - h * 0.3])} Q${P2([x - w * 0.46, y + h * 0.1])} ${P2([x - w * 0.3, y + h * 0.5])}`, lw * 0.8, FACE.shade);
    after += K.line(`M${P2([x + w * 0.5, y - h * 0.32])} Q${P2([x + w * 0.62, y + h * 0.05])} ${P2([x + w * 0.5, y + h * 0.42])}`, lw * 0.8, FACE.shade);
  } else if (kind === 'grit') { // a pained grimace: clenched teeth, corners pulled down
    d = K.blob([[x - w / 2, y + h * 0.42], [x - w * 0.25, y + h * 0.02], [x + w * 0.05, y - h * 0.06], [x + w * 0.32, y], [x + w / 2, y + h * 0.36], [x + w * 0.2, y + h * 0.62], [x - w * 0.2, y + h * 0.66]], 0.8);
    inner += `<path d="${d}" fill="${TEETH}"/>`;
    inner += K.line(K.curve([[x - w / 2, y + h * 0.36], [x - w * 0.2, y + h * 0.3], [x + w * 0.1, y + h * 0.34], [x + w / 2, y + h * 0.3]]), lw * 0.7);
    for (const tx of [-0.24, 0.02, 0.26]) inner += K.line(`M${P2([x + w * tx, y - h * 0.1])} L${P2([x + w * (tx + 0.01), y + h * 0.75])}`, lw * 0.55);
  } else if (kind === 'ko') { // exhausted: a slack open mouth, tongue lolling out of the corner
    d = K.oval(x + w * 0.02, y + h * 0.2, w * 0.24, h * 0.3, -0.2, [[2, 0.07, 0.3], [3, 0.04, 1]]);
    after += `<path d="${K.blob([[x + w * 0.06, y + h * 0.3], [x + w * 0.3, y + h * 0.32], [x + w * 0.36, y + h * 0.75], [x + w * 0.24, y + h * 0.98], [x + w * 0.08, y + h * 0.8]], 0.9)}" fill="${TONGUE}" stroke="${INK}" stroke-width="${n(lw * 0.85)}" stroke-linejoin="round"/>`;
    after += K.line(`M${P2([x + w * 0.2, y + h * 0.45])} L${P2([x + w * 0.24, y + h * 0.72])}`, lw * 0.5, '#b8444e');
  } else if (kind === 'flat') {
    return K.line(`M${P2([x - w * 0.35, y + h * 0.2])} Q${P2([x, y + h * 0.32])} ${P2([x + w * 0.35, y + h * 0.12])}`, lw);
  }
  const cid = uid('m');
  out.push(`<clipPath id="${cid}"><path d="${d}"/></clipPath><path d="${d}" fill="${MOUTH}"/><g clip-path="url(#${cid})">${inner}</g>`);
  out.push(`<path d="${d}" fill="none" stroke="${INK}" stroke-width="${n(lw)}" stroke-linejoin="round"/>`);
  out.push(after);
  return out.join('');
}

// ---------- the tiara (Sunflower Queen): a pale shiny gold band across the top of the main face, three rounded points
// (the middle one tallest, holding a ruby), gold balls on the tips and two little sapphires on the band ----------
function tiaraParts(h) {
  const T = xf(h), R = h.R, c = -86, parts = [];
  const ri = R * 0.74, ro = R * 0.95; // band inner / outer radius (head space)
  const pts = [[-20, 0.27, 0.3], [0, 0.46, 0.36], [20, 0.27, 0.3]]; // [angle offset, height (R), base width (R)]
  const outer = [pol(c - 31, ro)];
  for (const [da, hh, bw] of pts) {
    const a = c + da, half = bw * R / ro / RAD / 2, top = ro + hh * R;
    outer.push(pol(a - half, ro + R * 0.01), pol(a - half * 0.42, ro + hh * R * 0.62), pol(a, top), pol(a + half * 0.42, ro + hh * R * 0.62), pol(a + half, ro + R * 0.01));
  }
  outer.push(pol(c + 31, ro));
  const inner = []; for (let i = 0; i <= 8; i++) inner.push(pol(c + 31 - i * 62 / 8, ri + Math.sin(i / 8 * Math.PI) * R * 0.035));
  const band = outer.concat(inner).map(T);
  const h1 = T(pol(c - 16, (ri + ro) / 2 + R * 0.02)), h2 = T(pol(c, ro + R * 0.3));
  parts.push({ d: K.blob(band, 0.45), ...GOLD, shadeW: R * 0.07, highlights: [[h1[0], h1[1], R * 0.12, R * 0.03, c - 16 + 90 + T.rot, 0.9], [h2[0] - R * 0.05, h2[1], R * 0.025, R * 0.07, T.rot, 0.8]], line: 2.6 });
  for (const [da, hh] of pts) { const p = T(pol(c + da, ro + hh * R + R * 0.045)); parts.push({ d: K.oval(p[0], p[1], R * 0.075, R * 0.075), ...GOLD, shadeW: R * 0.035, highlights: [[p[0] - R * 0.025, p[1] - R * 0.025, R * 0.022, R * 0.018, 0, 0.95]], line: 2.2 }); }
  const g = T(pol(c, ro + R * 0.14));
  parts.push({ d: K.oval(g[0], g[1], R * 0.1 * T.kx, R * 0.12, T.rot * RAD, [[2, 0.04, 0.3]]), ...RUBY, shadeW: R * 0.05, highlights: [[g[0] - R * 0.035, g[1] - R * 0.045, R * 0.035, R * 0.022, -30, 0.95]], line: 2.2 });
  for (const sd of [-1, 1]) { const q = T(pol(c + sd * 21, (ri + ro) / 2)); parts.push({ d: K.oval(q[0], q[1], R * 0.055, R * 0.06), ...SAPH, shadeW: R * 0.025, highlights: [[q[0] - R * 0.018, q[1] - R * 0.02, R * 0.018, R * 0.014, 0, 0.95]], line: 1.8 }); }
  return parts;
}

// ---------- body: stems and leaves ----------
const bez = (P, t) => { const u = 1 - t; return [0, 1].map(k => u * u * u * P[0][k] + 3 * u * u * t * P[1][k] + 3 * u * t * t * P[2][k] + t * t * t * P[3][k]); };
// a stem from p0 to p3; b0 / b1 bulge the lower / upper third sideways (+ = to the right of the line), giving the line of action
function stemCurve(p0, p3, b0, b1) {
  const dx = p3[0] - p0[0], dy = p3[1] - p0[1], L = Math.hypot(dx, dy) || 1; let px = -dy / L, py = dx / L;
  if (px < 0) { px = -px; py = -py; }
  return [p0, [p0[0] + dx * 0.33 + px * b0, p0[1] + dy * 0.33 + py * b0], [p0[0] + dx * 0.7 + px * b1, p0[1] + dy * 0.7 + py * b1], p3];
}
function stemPart(P, w0, w1, w2) {
  const pts = Array.from({ length: 9 }, (_, i) => bez(P, i / 8));
  // light streak down the left side
  const lp = [];
  for (let i = 1; i < 8; i++) {
    const a = pts[i - 1], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; let nx = -dy / L, ny = dx / L;
    if (nx > 0) { nx = -nx; ny = -ny; }
    const t = i / 8, w = t < 0.5 ? lerp(w0, w1, t * 2) : lerp(w1, w2, (t - 0.5) * 2);
    lp.push([pts[i][0] + nx * w * 0.24, pts[i][1] + ny * w * 0.24]);
  }
  return { d: K.limb(pts, w0, w1, w2), ...GRN, shadeW: Math.max(3, w1 * 0.32), lightPatch: K.limb(lp, w0 * 0.12, w1 * 0.2, w2 * 0.1), lightOpacity: 0.5, line: 3, pts };
}
// a broad leaf from base to tip. bend > 0 arches the midline upward, curl > 0 turns the tip up, asym > 0 widens the upper half
function leafGeo(base, tip, w, bend = 0, curl = 0, asym = 0.08) {
  const [bx, by] = base, dx = tip[0] - bx, dy = tip[1] - by, len = Math.hypot(dx, dy) || 1; let px = -dy / len, py = dx / len;
  if (py > 0) { px = -px; py = -py; } // p points up(ish)
  const mid = t => { const b = bend * Math.sin(Math.PI * t) + curl * t * t * t; return [bx + dx * t + px * b, by + dy * t + py * b]; };
  const prof = t => t < 0.3 ? lerp(0.1, 0.5, Math.sin(t / 0.3 * Math.PI / 2)) : 0.5 * Math.pow(Math.cos((t - 0.3) / 0.7 * Math.PI / 2), 0.85);
  const side = (t, s, k = 1) => {
    const a = mid(Math.max(0, t - 0.02)), b = mid(Math.min(1, t + 0.02)); let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    let nx = -ty, ny = tx; if (nx * px + ny * py < 0) { nx = -nx; ny = -ny; } // the upper side's normal
    const hw = w * prof(t) * (1 + s * asym) * k, m = mid(t); return [m[0] + nx * hw * s, m[1] + ny * hw * s];
  };
  const ts = [0, 0.1, 0.25, 0.42, 0.6, 0.76, 0.9];
  const pts = ts.map(t => side(t, 1)).concat([mid(1)], ts.slice().reverse().map(t => side(t, -1)));
  return { d: K.blob(pts), pts, mid, side, w, up: [px, py] };
}
function leafPart(L) {
  const g = leafGeo(L.base, L.tip, L.w, L.bend || 0, L.curl || 0, L.asym ?? 0.08), vw = Math.max(1.6, L.w * 0.075);
  let inside = K.line(K.curve([0.04, 0.25, 0.5, 0.72, 0.88].map(g.mid)), vw * 1.25, GRN.shade, ' opacity="0.8"');
  for (const t of [0.3, 0.52, 0.7]) for (const s of [1, -1]) {
    const a = g.mid(t), b = g.side(Math.min(0.95, t + 0.16), s, 0.62);
    inside += K.line(`M${P2(a)} Q${P2(g.side(t + 0.06, s, 0.3))} ${P2(b)}`, vw * 0.8, GRN.shade, ' opacity="0.6"');
  }
  // light patch: a narrow band on the upper half
  const lp = [0.14, 0.3, 0.48, 0.64, 0.78].map(t => g.side(t, 1, 0.78)).concat([0.64, 0.48, 0.3].map(t => g.side(t, 1, 0.3)));
  return { d: g.d, ...GRN, shadeW: Math.max(3.5, L.w * 0.2), inside, lightPatch: K.blob(lp), lightOpacity: 0.42, line: 3, pts: g.pts };
}

// ---------- the stages: rest layout of the heads ----------
// x, y = head centre at rest (base at 0,0), R = face disc radius, n = petals, a0 = first petal angle
const STAGES = {
  0: { scale: 1, arms: true, heads: [{ key: 'main', x: -3, y: -104, R: 34, n: 13, seed: 11, a0: -88 }] },
  1: { scale: 1.06, arms: true, heads: [{ key: 'small', x: -44, y: -146, R: 25, n: 11, seed: 23, a0: -84, stem: [-15, 7], fork: 0.34, leaf: { t: 0.5, a: 200, len: 30, w: 15, bend: 3, curl: 5 } }, { key: 'main', x: 34, y: -106, R: 33, n: 13, seed: 11, a0: -88 }] },
  2: { scale: 1.12, arms: false, heads: [{ key: 'left', x: -64, y: -108, R: 22, n: 11, seed: 31, a0: -86, stem: [-14, 8], fork: 0.3, leaf: { t: 0.42, a: 206, len: 28, w: 15, bend: 3, curl: 6 } }, { key: 'right', x: 64, y: -90, R: 20, n: 10, seed: 41, a0: -80, stem: [12, -6], fork: 0.26, leaf: { t: 0.5, a: -24, len: 26, w: 14, bend: 3, curl: 6 } }, { key: 'main', x: -2, y: -148, R: 34, n: 13, seed: 11, a0: -88, crown: true }] },
};

// ---------- expressions ----------
const EXPR = {
  idle: { eyes: 'open', look: [0.5, -0.05], mouth: 'smile', lift: 0.12, brows: [{ dy: 0.09, tilt: -0.06, w: 0.32, th: 0.095 }, { dy: 0.2, tilt: 0.18, w: 0.28, arch: 0.08, th: 0.09 }] },
  blink: { eyes: 'closed', mouth: 'smile', lift: 0.12, brows: [{ dy: 0.09, tilt: -0.06, w: 0.32, th: 0.095 }, { dy: 0.2, tilt: 0.18, w: 0.28, arch: 0.08, th: 0.09 }] },
  walk0: { eyes: 'open', look: [0.7, 0.1], mouth: 'smile', lift: 0.04, brows: [{ dy: 0.1, tilt: -0.05, w: 0.3 }, { dy: 0.12, tilt: 0.05, w: 0.27 }] },
  walk1: { eyes: 'open', look: [0.6, -0.3], mouth: 'grin', lift: 0.06, mh: 0.38, brows: [{ dy: 0.14, tilt: -0.1, w: 0.3 }, { dy: 0.17, tilt: 0.1, w: 0.27 }] },
  cheer: { eyes: 'happy', mouth: 'big', mw: 0.74, mh: 0.56, lift: 0.02, my: -0.02, blush: 0.7, brows: [{ dy: 0.2, tilt: -0.3, w: 0.3, arch: 0.08 }, { dy: 0.22, tilt: 0.3, w: 0.27, arch: 0.08 }] },
  attack: { eyes: 'open', lid: 0.36, look: [1, 0.15], mouth: 'o', mw: 0.6, mh: 0.4, blush: 0.6, brows: [{ dy: -0.02, tilt: 0.42, w: 0.34, arch: 0.02, th: 0.1 }, { dy: -0.02, tilt: -0.42, w: 0.3, arch: 0.02, th: 0.1 }] },
  hurt: { eyes: 'squint', mouth: 'grit', mw: 0.6, mh: 0.4, my: 0.02, blush: 0.25, brows: [{ dy: 0.18, tilt: -0.42, w: 0.3, arch: 0.04 }, { dy: 0.2, tilt: 0.42, w: 0.27, arch: 0.04 }] },
  knocked: { eyes: 'spiral', mouth: 'ko', mw: 0.6, mh: 0.42, blush: 0.2, brows: [{ dy: 0.12, tilt: -0.3, w: 0.28, arch: -0.02 }, { dy: 0.12, tilt: 0.3, w: 0.25, arch: -0.02 }] },
};

// ---------- the poses ----------
// body: lean (deg, + = toward the right) and drop (vertical scale of the heads' height) move every head about the base;
// stem: [b0, b1] line of action; feet / arms: leaf angles (deg; 180 = flat to the left, 0 = flat to the right, − = up)
// head: shared head motion (dx, dy, tilt, sx, sy, petals), heads: per-head extras for the multi-head stages
const POSES = {
  idle: { lean: 0, drop: 1, stem: [-9, 10], tilt: -6,
    feet: [{ a: 183, len: 50, w: 25, bend: 3, curl: 6 }, { a: -2, len: 56, w: 27, bend: 3, curl: 6 }],
    arms: [{ a: 172, len: 36, w: 17, bend: -2, curl: -3 }, { a: -28, len: 40, w: 18, bend: 3, curl: 6 }] },
};
POSES.blink = POSES.idle; // + every head's eyes closed (build)
POSES.walk0 = { lean: 8, drop: 0.95, stem: [-14, 3], tilt: 5, petals: { drag: [-0.15, 0.04], swing: -5 },
  feet: [{ a: 177, len: 54, w: 25, bend: 2, curl: 3 }, { a: -33, len: 52, w: 26, bend: 5, curl: 9 }],
  arms: [{ a: 202, len: 36, w: 17, bend: 3, curl: 5 }, { a: 12, len: 38, w: 18, bend: -3, curl: -3 }] };
POSES.walk1 = { lean: -6, drop: 1.05, dx: -2, stem: [10, -7], tilt: -10, petals: { drag: [0.13, -0.05], swing: 6 },
  feet: [{ a: 212, len: 46, w: 24, bend: 5, curl: 9 }, { a: 1, len: 58, w: 27, bend: 2, curl: 4 }],
  arms: [{ a: 158, len: 35, w: 17, bend: -3, curl: -4 }, { a: -42, len: 40, w: 18, bend: 4, curl: 7 }] };
POSES.cheer = { lean: -2, drop: 1.1, stem: [-5, 6], tilt: -14, sx: 0.97, sy: 1.04, petals: { flare: 1.08, wide: 1.04, flutter: 0.05 },
  feet: [{ a: 190, len: 50, w: 25, bend: 4, curl: 12 }, { a: -10, len: 54, w: 26, bend: 4, curl: 12 }],
  arms: [{ a: 207, len: 56, w: 20, bend: 6, curl: 12 }, { a: -31, len: 58, w: 21, bend: 6, curl: 12 }] };
POSES.attack = { lean: 13, drop: 0.94, dx: 5, stem: [-17, -3], tilt: 4, sx: 1.06, sy: 0.95, petals: { drag: [-0.24, 0.03], swing: -8 },
  feet: [{ a: 175, len: 57, w: 26, bend: 2, curl: 3 }, { a: 3, len: 54, w: 26, bend: 3, curl: 5 }],
  arms: [{ a: 190, len: 40, w: 18, bend: 4, curl: 6 }, { a: -8, len: 45, w: 19, bend: 2, curl: 6 }] };
POSES.hurt = { lean: -12, drop: 0.98, dx: -2, stem: [12, 6], tilt: -12, sx: 0.95, sy: 1.04, petals: { ruffle: 0.42, drag: [0.12, 0.05], ruffleSeed: 5 },
  feet: [{ a: 181, len: 52, w: 25, bend: 2, curl: 4 }, { a: -17, len: 52, w: 26, bend: 4, curl: 10 }],
  arms: [{ a: 214, len: 38, w: 17, bend: 4, curl: 8 }, { a: -64, len: 38, w: 18, bend: 4, curl: 6 }] };
POSES.knocked = { lean: 22, drop: 0.68, stem: [-16, -16], tilt: 26, sy: 0.97, petals: { droop: 0.55 },
  feet: [{ a: 181, len: 56, w: 26, bend: 0, curl: 0 }, { a: -1, len: 58, w: 27, bend: 0, curl: 0 }],
  arms: [{ a: 152, len: 38, w: 17, bend: -3, curl: -2 }, { a: 30, len: 38, w: 18, bend: -3, curl: -2 }] };

// each extra head reacts in its own way (secondary motion: a beat behind / ahead of the main head, its own expression)
const MISCHIEF = [{ dy: 0.06, tilt: 0.2, w: 0.32, th: 0.1 }, { dy: 0.24, tilt: 0.25, w: 0.28, arch: 0.1, th: 0.09 }];
const WORRY = [{ dy: 0.22, tilt: -0.45, w: 0.3, arch: 0.05 }, { dy: 0.24, tilt: 0.45, w: 0.27, arch: 0.05 }];
const SLEEPY = [{ dy: 0.08, tilt: -0.2, w: 0.28, arch: -0.02 }, { dy: 0.08, tilt: 0.2, w: 0.25, arch: -0.02 }];
POSES.idle.heads = {
  small: { tilt: 9, face: { mouth: 'grin', look: [0.8, 0.35], lift: 0.14, brows: MISCHIEF } },
  left: { tilt: -8, face: { look: [0.5, -0.6], mouth: 'smile', lift: 0.04 } },
  right: { tilt: 10, face: { mouth: 'grin', look: [0.7, 0.1], brows: MISCHIEF } },
  main: { face: {} } };
POSES.walk0.heads = { small: { dy: -7, tilt: -8, petals: { drag: [-0.1, 0.08] } }, left: { dy: -6, tilt: -10 }, right: { dy: 5, tilt: 12, face: { mouth: 'grin' } } };
POSES.walk1.heads = { small: { dy: 6, tilt: 10, face: { mouth: 'smile' } }, left: { dy: 5, tilt: 8, face: { mouth: 'grin' } }, right: { dy: -6, tilt: -10 } };
POSES.cheer.heads = { small: { dy: -10, dx: -4, tilt: -20 }, left: { dy: -8, dx: -4, tilt: -20 }, right: { dy: -8, dx: 4, tilt: 12 } };
POSES.attack.heads = { small: { dx: 6, tilt: 6 }, left: { dx: -8, dy: 4, tilt: 8 }, right: { dx: -10, dy: -4, tilt: 4 } };
POSES.hurt.heads = {
  small: { dx: -8, dy: 4, tilt: -20, face: { eyes: 'wide', look: [-0.7, -0.3], mouth: 'o', mw: 0.55, brows: WORRY, blush: 0.2 } },
  left: { dx: 8, dy: 0, tilt: -16, face: { eyes: 'wide', look: [-0.6, -0.2], mouth: 'o', mw: 0.55, brows: WORRY, blush: 0.2 } },
  right: { dx: -4, dy: 3, tilt: -10 } };
POSES.knocked.heads = {
  small: { dx: 2, dy: 6, tilt: 8, petals: { droop: 0.5 }, face: { eyes: 'tired', mouth: 'flat', mw: 0.5, brows: null, blush: 0.3 } },
  left: { dx: 10, dy: 2, tilt: -26, petals: { droop: 0.5 }, face: { eyes: 'tired', mouth: 'flat', mw: 0.5, brows: null, blush: 0.3 } },
  right: { dx: -20, dy: -8, tilt: 14, petals: { droop: 0.5 }, face: { eyes: 'tired', mouth: 'flat', mw: 0.5, brows: null, blush: 0.3 } } };

// ---------- assembling a frame ----------
function build(stage, poseName) {
  const S = STAGES[stage], Pz = POSES[poseName], k = S.scale, ex = EXPR[poseName], blink = poseName === 'blink';
  const pivot = [0, -12];
  const heads = S.heads.map(h0 => {
    const o = (Pz.heads && Pz.heads[h0.key]) || {};
    // lean + drop about the base
    let x = h0.x, y = pivot[1] + (h0.y - pivot[1]) * (Pz.drop ?? 1);
    const la = (Pz.lean || 0) * RAD, rx = x - pivot[0], ry = y - pivot[1];
    x = pivot[0] + rx * Math.cos(la) - ry * Math.sin(la); y = pivot[1] + rx * Math.sin(la) + ry * Math.cos(la);
    x += (Pz.dx || 0) + (o.dx || 0); y += (Pz.dy || 0) + (o.dy || 0);
    const face = { ...ex, ...(o.face || {}) };
    if (blink) face.eyes = 'closed';
    return { ...h0, stem: o.stem || h0.stem, leafPose: { ...(h0.leaf || {}), ...(o.leaf || {}) }, x, y, tilt: (Pz.tilt || 0) + (o.tilt || 0) + (Pz.lean || 0) * 0.6, sx: (Pz.sx || 1) * (o.sx || 1), sy: (Pz.sy || 1) * (o.sy || 1), petals: { ...(Pz.petals || {}), ...(o.petals || {}) }, face };
  });
  // body
  const main = heads.find(h => h.key === 'main');
  const base = [0, -14];
  const stemTop = h => [h.x - h.R * 0.15, h.y + h.R * 0.25];
  const mainStem = stemPart(stemCurve(base, stemTop(main), (Pz.stem || [0, 0])[0], (Pz.stem || [0, 0])[1]), 15 * k, 12.5 * k, 11.5 * k);
  const back = [], front = [], stems = [];
  for (const h of heads) {
    if (h === main) continue;
    // side stems branch off the main stem, each with a leaf of its own
    const P = stemCurve(bez(stemCurve(base, stemTop(main), (Pz.stem || [0, 0])[0], (Pz.stem || [0, 0])[1]), h.fork || 0.3), stemTop(h), ...(h.stem || [0, 0]));
    stems.push(stemPart(P, 10 * k, 9 * k, 8 * k));
    if (h.leafPose && h.leafPose.len) { const L = h.leafPose, b = bez(P, L.t); back.push(leafPart({ base: b, tip: add(b, pol(L.a, L.len * k)), w: L.w * k, bend: L.bend, curl: L.curl })); }
  }
  stems.push(mainStem);
  const arm = (A, side) => {
    const at = bez(stemCurve(base, stemTop(main), (Pz.stem || [0, 0])[0], (Pz.stem || [0, 0])[1]), 0.24);
    const b = [at[0] + side * 3, at[1]], t = add(b, pol(A.a, A.len * k));
    return leafPart({ base: b, tip: t, w: A.w * k, bend: A.bend, curl: A.curl });
  };
  const foot = (F, side) => { const b = [side * 6, -16], t = add(b, pol(F.a, F.len * k)); return leafPart({ base: b, tip: t, w: F.w * k, bend: F.bend, curl: F.curl, asym: 0.12 }); };
  if (S.arms) back.push(arm(Pz.arms[0], -1));
  front.push(foot(Pz.feet[0], -1), foot(Pz.feet[1], 1));
  if (S.arms) front.push(arm(Pz.arms[1], 1));
  const bodyParts = back.concat(stems, front);
  // snap the lowest body point to the ground line
  let low = -1e9; for (const p of bodyParts) for (const q of p.pts || []) low = Math.max(low, q[1]);
  const dy = GROUND - low;
  // draw: ONE bold outer contour round everything, the body's colour, then each head (back to front) with a thinner overlap
  // line, its colour and its face; the tiara last
  const wid = uid('w'), H = heads.map(h => ({ h, ...headParts(h), crown: h.crown ? tiaraParts(h) : null }));
  const all = bodyParts.concat(...H.map(o => o.parts));
  let s = wobDefs(wid, 7) + inkPass(all, OUTER_W, wid) + colour(bodyParts, wid);
  for (const o of H) {
    s += inkPass(o.parts, OVERLAP_W, wid) + colour(o.parts, wid) + `<g transform="${o.T.attr}">${faceSvg(o.h)}</g>`;
    if (o.crown) { const tw = uid('w'); s += wobDefs(tw, 9, 1.1) + inkPass(o.crown, 2.5, tw) + colour(o.crown, tw); } // small jewellery: a gentler brush wobble
  }
  return K.frame(s, 0, dy);
}

// ---------- write ----------
const only = process.argv[2];
let count = 0;
for (const stage of [0, 1, 2]) for (const pose of POSE_NAMES) {
  if (!POSES[pose]) continue;
  if (only && !`${stage}/${pose}`.includes(only)) continue;
  K.write(path.join(OUT, `stage-${stage}`, `${pose}.svg`), build(stage, pose));
  count++;
}
console.log(`sunflower: ${count} SVG frame(s) written to ${path.relative(process.cwd(), OUT)}`);
