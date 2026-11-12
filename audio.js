// audio.js — P vs. Z Garden music, fanfares, plant voices and zombie moans. Every note here is ORIGINAL chiptune written for this game
// and played by code (no recordings, no transcribed or paraphrased melodies from any game). Loaded right after pixel.js.
//   PX.Music.play(id)  .stop(ms)  .tempo(k)  .intensity(k)  .jingle(id)  .muted (get/set, saved per device as pvzg:music)  .current
//   PX.Cry.play(plantOrZombieId, { stage, pitch, zombie })
// The soundtrack is a PLAYLIST: a track id ('garden-day', 'battle'...) holds one or more songs. A song plays its intro once,
// loops its body `loops` times (default 2), then hands over exactly on the beat to the next song of that id (no fade, no gap).
// Coming back to an id later starts with the song after the last one heard there. Songs are built from sections (sparse intros,
// full choruses, breakdowns, a key lift for the second half), so each loop has a shape.
//   PX.Music.tempo(k)      0.5-2: speeds the current song up (e.g. Survival's last wave). Back to 1 when the track changes.
//   PX.Music.intensity(k)  0-1 (default 1 = as written): thins the arrangement for calmer moments, same song and position:
//                          below 0.6 no hi-hats; below 0.5 the second voice (countermelody / arpeggios) fades, silent at 0;
//                          below 0.35 no snare; below 0.15 no drums at all (melody and bass always play). Back to 1 when the
//                          track changes, so call it after play().
// Style: a backyard-vs-zombies romp: bouncy, a little spooky-silly, never sad or scary. Oom-pah bass, plucky marimba leads,
// chromatic tiptoes and cheeky rests in the garden; straight, driving rhythms in every battle (no swing there).
// iPad rules: the music shares PX.Sound's AudioContext (only a tap can create it, so a track asked for before the first tap
// starts as soon as the audio runs). Each music "deck" keeps ONE oscillator per channel for the whole song and only moves its
// pitch and volume per note (making nodes per note is what once froze a sister game); ornaments, swing and accents are automation
// on those same nodes. A 25 ms timer schedules 120 ms ahead, and nothing is scheduled unless the audio is running and the page is
// visible; when hidden the music fades out in 100 ms and the clock stops. navigator.audioSession is left alone on purpose.
(function () {
  'use strict';
  if (!window.PX || !PX.Sound) return;
  const S = PX.Sound;
  const noop = () => {};
  if (!S.on || !S.allow) { PX.Music = { play: noop, stop: noop, tempo: noop, jingle: noop, intensity: noop, muted: false }; PX.Cry = { play: noop }; return; } // (an old pixel.js)

  // ================= score language =================
  // Melodies are written in C major / A minor as note strings: "E5:2 G5 A5:4 r:2 | ..." (the number is a length in 16th notes and
  // sticks until changed; '|' marks bars, which the compiler checks are full). Flags after a note: ' short (staccato), > accent,
  // _ soft, ^ grace note from the scale step below, * quick turn up to the step above and back, / slide up into it, ~ vibrato.
  // Chords ("C | Am | F G", or "C:12 G:4" to push a change ahead of the bar) drive generated bass lines, arpeggios and off-beat
  // stabs; drums are step patterns. A song is a set of sections S played in a `form` such as "i | A B A+2 C": sections before
  // '|' play once (the intro), the rest loops, "+2" lifts that pass up two semitones; a section can borrow another's notes with
  // { base: 'A', ...changes }. `key` moves the whole song, `swing` (0-0.67 of a 16th) delays the off-beat 8ths for a shuffle,
  // `bar: 12` makes 6/8 bars, `gain` trims one song's overall level (1 = as mixed), `env: [[decay s, sustain 0-1] per voice]`
  // makes a voice plucky (a marimba lead is [0.06, 0.3]).
  const PCS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const warn = []; // score typos found while compiling (the test page reads these)
  const acc = s => (s === '#' ? 1 : s === 'b' ? -1 : 0);
  function midi(tok) { const m = /^([A-G])([#b]?)(\d)$/.exec(tok); return m ? 12 * (+m[3] + 1) + PCS[m[1]] + acc(m[2]) : null; }
  const FLAGS = /['>_^*\/~]+$/;
  // a note: [step, midi, length, volume, gate (0 = the song's), vibrato, ornament (1 grace, 2 turn, 3 slide)]
  function notes(str, tag, bar) {
    const out = []; let t = 0, d = 2, b0 = 0, bi = 1;
    for (let tok of String(str).trim().split(/\s+/)) {
      if (!tok) continue;
      if (tok === '|') { if (bar && t - b0 !== bar) warn.push(tag + ' bar ' + bi + ': ' + (t - b0) + ' steps'); b0 = t; bi++; continue; }
      const fm = FLAGS.exec(tok), fl = fm ? fm[0] : ''; if (fl) tok = tok.slice(0, -fl.length);
      const i = tok.indexOf(':'), n = i < 0 ? tok : tok.slice(0, i);
      if (i >= 0) d = +tok.slice(i + 1) || d;
      if (n === 'r') { t += d; continue; }
      const m = midi(n); if (m == null) { warn.push(tag + ': bad note ' + tok); continue; }
      const has = c => fl.indexOf(c) >= 0;
      out.push([t, m, d, has('>') ? 1.18 : has('_') ? 0.62 : 1, has("'") ? 0.5 : 0, has('~') ? 1 : 0, has('^') ? 1 : has('*') ? 2 : has('/') ? 3 : 0]);
      t += d;
    }
    if (bar && t - b0 !== bar) warn.push(tag + ' bar ' + bi + ': ' + (t - b0) + ' steps');
    out.len = t; return out;
  }
  const QUAL = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9],
    dim: [0, 3, 6], aug: [0, 4, 8], sus4: [0, 5, 7], sus2: [0, 2, 7], add9: [0, 4, 7, 14] };
  function chords(str, tag, key, B) { // one chord object per 16th step
    const per = [];
    for (const bar of str.split('|')) {
      const cs = bar.trim().split(/\s+/).filter(Boolean).map(c => c.split(':'));
      const fixed = cs.reduce((a, c) => a + (+c[1] || 0), 0), free = cs.filter(c => !+c[1]).length, b0 = per.length;
      for (const [c, len] of cs) {
        const m = /^([A-G])([#b]?)(maj7|m7|m6|m|7|6|dim|aug|sus4|sus2|add9)?$/.exec(c);
        if (!m) warn.push(tag + ': bad chord ' + c);
        const ch = { r: m ? (PCS[m[1]] + acc(m[2]) + key + 120) % 12 : 0, iv: QUAL[(m && m[3]) || ''] };
        for (let k = 0, n = +len || (B - fixed) / free; k < n; k++) per.push(ch);
      }
      if (cs.length && per.length - b0 !== B) warn.push(tag + ': chord bar of ' + (per.length - b0) + ' steps');
    }
    return per;
  }
  const fold = (pc, lo) => lo + ((pc - lo) % 12 + 12) % 12; // that pitch class at or just above midi note `lo`
  // bass patterns, one character per 8th or 16th (or per 8th of a 12-step bar): R root, 3 third, 5 fifth, 6 sixth, 7 seventh,
  // 8 octave, l the fifth below, x a half step under the next chord's root, - hold, . rest (a new chord always starts on its root)
  const BASS = { walk: 'R-5-8-5-', march: 'R.5.8.5.', drive: 'RRRRRRRR', oct: 'R8R8R8R8', half: 'R---5---', bounce: 'R..R..5.R..R..5.',
    gallop: 'R.RRR.RRR.RRR.RR', pump: 'R.RR8.RRR.RR8.R8', boss: 'RRR8RRR8RRR8R5R8',
    hop: 'R.8.5.8.R.8.5.8x', boogie: 'R3568653', skip: 'R..8R.5.R..8R.5x', tres: 'R..5..8.R..5..8.', polka: 'R.l.R.l.', step: 'R.3.5.6.8.6.5.3x',
    octx: 'R8R8R85x', sly: 'R.8R.85.R.8R.87x', funk: 'R..R.8.5R.R..85.', pedal: 'R-R-R-R-', jig: 'R-.5-.', waltz: 'R---5-', wl: 'R-5-8-' };
  function bassLine(per, pat, lo, vol, gate, B) {
    const out = [], u = B / pat.length;
    for (let t = 0; t < per.length; t += u) {
      const ch = per[t]; let c = pat[(t / u) % pat.length];
      if (t > 0 && ch !== per[t - 1]) c = 'R';
      if (c === '.') continue;
      if (c === '-') { if (out.length) out[out.length - 1][2] += u; continue; }
      const r = fold(ch.r, lo), iv = ch.iv;
      let n = r + ({ 3: iv[1], 5: iv[2], 6: 9, 7: iv[3] && iv[3] < 12 ? iv[3] : 10, 8: 12, l: iv[2] - 12 }[c] || 0);
      if (c === 'x') { let j = t + u; while (j < per.length && per[j] === ch) j++; n = fold(per[j % per.length].r, lo) - 1; if (n === r) n = r + 2; }
      out.push([t, n, u, vol, gate]);
    }
    return out;
  }
  function tones(ch, lo) { const r = fold(ch.r, lo), ts = ch.iv.slice(0, 3).map(i => r + i); ts.push(r + 12); return ts; }
  function harmony(kind, per, lo, B) {
    const out = [];
    if (kind === 'arp16' || kind === 'arp8') {
      const u = kind === 'arp16' ? 1 : 2, ord = u === 1 ? [0, 1, 2, 3] : [0, 2, 1, 2];
      for (let t = 0, k = 0; t < per.length; t += u, k++) out.push([t, tones(per[t], lo)[ord[k % 4]], u, u === 1 ? 0.8 : 0.9, 0.55]);
    } else if (kind === 'up8') { // rising 8th arpeggio, a new run on every chord
      for (let t = 0, k = 0; t < per.length; t += 2, k++) { if (t && per[t] !== per[t - 2]) k = 0; out.push([t, tones(per[t], lo)[k % 4], 2, 0.9, 0.6]); }
    } else if (kind === 'off') {
      for (let t = 2; t < per.length; t += 4) out.push([t, tones(per[t], lo)[1 + ((t >> 2) & 1)], 2, 1, 0.45]);
    } else if (kind === 'skip') { // two quick chord tones on every off-beat ("and-a")
      for (let t = 2; t < per.length; t += 4) { const ts = tones(per[t], lo); out.push([t, ts[1], 1, 0.9, 0.6], [t + 1, ts[2], 1, 0.8, 0.6]); }
    } else if (kind === 'waltz') { // 3/4: rest on one, chord on two and three
      for (let t = 0; t < per.length; t += 4) if (t % B) out.push([t, tones(per[t], lo)[1 + ((t % B) >> 3)], 3, 0.9, 0.5]);
    } else if (kind === 'pad') {
      for (let t = 0; t < per.length; t++) if (!t || per[t] !== per[t - 1]) out.push([t, tones(per[t], lo)[1], 16, 0.75, 0.95, 1]);
    }
    return out;
  }
  const SC = [0, 2, 4, 5, 7, 9, 11];
  function third(m) { // the diatonic (C major) note a third below
    const o = Math.floor(m / 12), pc = m % 12; let i = SC.indexOf(pc); if (i < 0) i = SC.indexOf(pc - 1);
    const j = i - 2; return (j < 0 ? o - 1 : o) * 12 + SC[(j + 7) % 7];
  }
  function step(m, dir) { // the C major scale neighbour above (+1) or below (-1); a half step for notes outside the scale
    const o = Math.floor(m / 12), i = SC.indexOf(m % 12); if (i < 0) return m + dir;
    const j = i + dir; return (j < 0 ? o - 1 : j > 6 ? o + 1 : o) * 12 + SC[(j + 7) % 7];
  }
  const DR = { rock: 'K.h.S.h.K.K.S.h.', light: 'K...h...S...h...', battle: 'K.hhS.hhK.hKS.hh', race: 'K.o.S.o.K.o.S.oh', march: 'K...S...K...S.S.',
    beat: 'K...K...K...K...', sneak: 'K..hS..hK.hhS.h.', boss: 'K.K.S..KK.K.S.KS', soft: 'K.......h.......', epic: 'K...S..KK...S.SS',
    fill: 'K.h.S.h.SSS.SSSS', fill2: 'K.S.S.SSK.SSSSSS',
    pop: 'K.h.S.hKK.h.S.h.', shuffle: 'K.h.S.h.K.hKS.h.', disco: 'K.o.S.o.K.o.S.o.', island: 'K..hS.h.K.hhS..h', half: 'K.......S.......',
    sparse: 'K.......K.......', brush: 'K...h.h.S...h.h.', gallop: 'K.hKS.hKK.hKS.hK', drive: 'KhhhShhhKhhKShhh', tom: 'K..K..S.K..K.SSS',
    up: 'K...S...SS.SSSSS', snap: 'K.S.K.S.KKS.SSSS', clap: 'S.S.S.S.SSSSSSSS',
    stomp: 'K.hhS.h.K.hhS.hK', raid: 'K.hhS.hKK.hKS.SS', funk: 'K.hhS.hK.KhhS.hh', jig: 'K.hS.hK.hS.h', jigfill: 'K.hS.hS.SSSS', waltz: 'K...h...h...', wfill: 'K...S...SSSS', wsoft: 'K...........' };
  // noise drum kit: level, decay seconds. Each voice has its own FIXED filter (kick, snare, hats): sweeping one shared filter
  // between hits made it ring with big spikes.
  const KIT = { K: [3, 0.09], S: [0.85, 0.12], h: [0.32, 0.03], o: [0.3, 0.13] };
  const DRUM_F = [['K', 'bandpass', 130, 1], ['S', 'bandpass', 1700, 0.7], ['h', 'highpass', 6500, 0.7]];

  // A song compiles to one list of note events per 16th step: { c: channel (0 lead, 1 second voice, 2 bass, 3 drums), n: midi
  // note or drum letter, d: length in steps (always ends before that channel's next note, also across the loop point), v, g: gate,
  // vib, o: ornament, nb: its neighbour note }.
  function compile(def, tag, oneShot) {
    const key0 = def.key || 0, mo = 12 * (def.oct || 0), B = def.bar || 16, ch = [[], [], [], []];
    const SEC = def.S || { i: def.intro, A: def }, form = def.form || (def.intro ? 'i | A' : 'A');
    const parts = form.indexOf('|') >= 0 ? form.split('|') : ['', form], list = [];
    parts.forEach((part, k) => {
      for (const tok of part.trim().split(/\s+/).filter(Boolean)) {
        const m = /^([A-Za-z0-9]+?)([+-]\d+)?$/.exec(tok); let p = m && SEC[m[1]];
        if (!p) { warn.push(tag + ': no section ' + tok); continue; }
        if (p.base) p = Object.assign({}, SEC[p.base], p);
        list.push({ p, up: +(m[2] || 0), once: k === 0, name: tok });
      }
    });
    let off = 0, loopAt = -1;
    for (const { p, up, once, name } of list) {
      if (!once && loopAt < 0) loopAt = off;
      const P = k => (p[k] !== undefined ? p[k] : def[k]), key = key0 + up, at = tag + ' ' + name; // a section's setting, else the song's
      const mel = notes(p.mel || '', at, oneShot ? 0 : B);
      const per = p.chords ? chords(p.chords, at, key, B) : null, n = per ? per.length : mel.len;
      if (per && mel.len !== n) warn.push(at + ': melody has ' + mel.len + ' steps, chords ' + n);
      const gate = P('gate') || (oneShot ? 0.85 : 0.9), h = P('harm') || '', b = P('bass') || '';
      const hlo = P('hlo') || 57, blo = P('blo') || 45, bgate = P('bgate') || 0.8;
      const add = (c, e, v, vib, sh) => { const nb = e[6] === 1 ? step(e[1], -1) : e[6] === 2 ? step(e[1], 1) : e[1];
        ch[c].push([off + e[0] + (sh || 0), e[1] + key + mo, e[2], v * e[3], e[4] || gate, vib || e[5], e[6], nb + key + mo]); };
      for (const e of mel) add(0, e, 1, 1);
      if (h.startsWith('mel:')) for (const e of notes(h.slice(4), at + ' harm', 0)) add(1, e, 1, 0);
      else if (h === 'harm3') for (const e of mel) add(1, [e[0], third(e[1]), e[2], e[3], e[4], 0, 0], 1.1, 0);
      else if (h.startsWith('echo:')) for (const e of mel) add(1, e, 1, 0, +h.slice(5) || 2);
      else if (per) {
        const bp = BASS[b] || b;
        const hs = h === 'bass2' ? bassLine(per, bp, blo + 12, 1.2, 0.7, B) : harmony(h, per, hlo, B);
        for (const e of hs) ch[1].push([off + e[0], e[1], e[2], e[3], e[4], e[5] || 0, 0, 0]);
      }
      if (b.startsWith('mel:')) for (const e of notes(b.slice(4), at + ' bass', 0)) ch[2].push([off + e[0], e[1] + key, e[2], e[3], e[4] || 0.85, 0, 0, 0]);
      else if (per && b) { const bp = BASS[b] || b; if (/^[R35678lx.\-]+$/.test(bp)) for (const e of bassLine(per, bp, blo, 1, bgate, B)) ch[2].push([off + e[0], e[1], e[2], e[3], e[4], 0, 0, 0]); else warn.push(at + ': bad bass ' + b); }
      const dr = P('dr'), dn = P('drums');
      if (dr) { for (let i = 0; i < dr.length; i++) if (KIT[dr[i]]) ch[3].push([off + i, dr[i], 1, 1, 1, 0, 0, 0]); }
      else if (dn) {
        const fl = P('fill'), every = P('every') || 8, bars = n / B;
        for (let bar = 0; bar < bars; bar++) {
          const pat = DR[fl && ((bar + 1) % every === 0 || bar === bars - 1) ? fl : dn] || (fl && ((bar + 1) % every === 0 || bar === bars - 1) ? fl : dn);
          if (pat.length !== B) { warn.push(at + ': drum pattern ' + pat); break; }
          for (let i = 0; i < B; i++) if (KIT[pat[i]]) ch[3].push([off + bar * B + i, pat[i], 1, 1, 1, 0, 0, 0]);
        }
      }
      off += n;
    }
    if (loopAt < 0) loopAt = 0;
    let len = off;
    const loop = !oneShot && def.loop !== false;
    if (!loop) for (const L of ch) for (const e of L) len = Math.max(len, e[0] + e[2]);
    for (const L of ch) {
      if (loop) for (const e of L) if (e[0] >= len) e[0] = loopAt + (e[0] - len); // echoes that spill past the end wrap round
      L.sort((x, y) => x[0] - y[0]);
      for (let i = L.length - 1; i > 0; i--) if (L[i][0] === L[i - 1][0]) L.splice(i, 1);
      for (let i = 0; i < L.length; i++) {
        let nx = i + 1 < L.length ? L[i + 1][0] : -1;
        if (nx < 0) { if (loop) { const f = L.find(e => e[0] >= loopAt); nx = f ? len + f[0] - loopAt : len; } else nx = L[i][0] + L[i][2]; }
        L[i][2] = Math.max(1, Math.min(L[i][2], nx - L[i][0]));
      }
    }
    const ev = new Array(len), sw = def.swing || 0;
    ch.forEach((L, c) => { for (const e of L) (ev[e[0]] || (ev[e[0]] = [])).push({ c, n: e[1], d: e[2], v: e[3], g: e[4], vib: e[5], o: e[6], nb: e[7] }); });
    return { id: tag, name: def.name || tag, sd: 60 / def.bpm / 4, len, loopAt: loop ? loopAt : -1, ev, wave: def.wave || [25, 12], bar: B,
      sw: [0, sw / 2, sw, sw / 2], loops: def.loops || 2, gain: def.gain || 1, env: def.env || null, bpm: def.bpm, key: key0,
      vol: [0, 1, 2, 3].map(i => (def.vol && def.vol[i] != null ? def.vol[i] : 1)), drums: ch[3].length > 0 };
  }

  // ================= the soundtrack (original) =================
  // Every song: a hook that comes back, a counter-voice that answers it, real chord changes with a moving bass, a breakdown, and
  // usually a key lift. Keys below are the sounding keys (the notes are written in C / A minor and moved by `key`).
  const PLUCK = [[0.06, 0.32], null, [0.12, 0.6]]; // marimba-ish lead, bouncy bass

  // Title — "Brains & Blossoms Overture" (F major, 138): a cheeky backyard march, chromatic tiptoe pickups in the hook
  const TITLE = { name: 'Brains & Blossoms Overture', bpm: 138, key: 5, wave: [25, 12], vol: [1, 0.85, 1, 0.8], form: 'i | A B A+2 C',
    S: {
      i: { chords: 'C | G7', harm: 'off', bass: 'polka', drums: 'sparse', fill: 'up', every: 2,
        mel: "C5:2' r:2 G4:2' r:2 C5:2' E5:2' G5:4> | F5:2' r:2 D5:2' r:2 B4:2' D5:2' G4:4" },
      A: { chords: 'C | C | F | C | Am | D7 | G | G7', harm: 'off', bass: 'polka', drums: 'march', fill: 'fill', every: 4,
        mel: "E5:2 G5:2' r:2 G5:2' A5:1 G5:1 F#5:1 G5:1 E5:4 | C5:2 E5:2' r:2 E5:2' F5:1 E5:1 D#5:1 E5:1 C5:4 | A5:2 C6:2' r:2 C6:2' D6:1 C6:1 B5:1 C6:1 A5:2 F5:2 | G5:3 E5:1 C5:2 E5:2 G5:4 r:4 | " +
          "A5:2 C6:2 E6:2 C6:2 A5:2 E5:2 C5:2 E5:2 | F#5:2 A5:2 C6:2 D6:2 F#6:2 D6:2 C6:2 A5:2 | B5:2 D6:2 G6:3 F6:1 E6:2 D6:2 B5:2 G5:2 | F5:2' F5:2' r:2 F5:2' G5:2 A5:2 B5:2 D6:2" },
      B: { chords: 'F | F | C | C | Dm | G7 | C:8 A7:8 | Dm:8 G7:8', harm: 'arp8', bass: 'walk', drums: 'rock', fill: 'fill2', every: 8,
        mel: 'A5:6 G5:2 F5:4 C5:4 | D5:2 F5:2 A5:2 C6:2 D6:4 C6:4 | G5:6 F5:2 E5:4 C5:4 | E5:2 G5:2 C6:2 E6:2 D6:4 C6:4 | ' +
          'F5:2 A5:2 D6:4 C6:2 A5:2 F5:4 | G5:2 B5:2 D6:4 F6:2 E6:2 D6:4 | E6:2 C6:2 G5:2 C6:2 C#6:2 E6:2 A6:4 | F6:2 D6:2 A5:2 F5:2 G5:2 B5:2 D6:2 G6:2' },
      C: { chords: 'Am | Am | Dm | G7', harm: 'skip', bass: 'pedal', drums: 'sneak', fill: 'up', every: 4,
        mel: "A4:2' r:2 C5:2' r:2 E5:2' r:2 D#5:2 E5:2 | A5:2' r:2 G5:2' r:2 E5:2' r:2 C5:2 E5:2 | D5:2' r:2 F5:2' r:2 A5:2' r:2 G#5:2 A5:2 | B5:2 G5:2 F5:2 D5:2 B4:2 D5:2 G5:4>" } } };

  // Garden (day) 1 — "Picket Fence Polka" (G major, 150): marimba lead over oom-pah, straight and sunny
  const PICKET = { name: 'Picket Fence Polka', gain: 1.1, bpm: 150, key: -5, wave: [50, 25], env: PLUCK, vol: [1.15, 0.85, 1, 0.75], form: 'i | A B A2 C',
    S: {
      i: { chords: 'G7', bass: 'polka', drums: 'snap', mel: "r:8 G4:2' B4:2' D5:2' F5:2'" },
      A: { chords: 'C | G7 | G7 | C | C | F | G7 | C', harm: 'off', bass: 'polka', drums: 'pop', fill: 'fill', every: 4,
        mel: 'E5:2 E5:1 F5:1 G5:2 C6:2 r:2 G5:2 E5:2 C5:2 | D5:2 D5:1 E5:1 F5:2 B5:2 r:2 G5:2 F5:2 D5:2 | B4:2 D5:2 G5:2 B5:2 A5:2 G5:2 F5:2 D5:2 | E5:2 G5:2 C6:4> r:8 | ' +
          "E5:2 E5:1 F5:1 G5:2 C6:2 r:2 E6:2 D6:2 C6:2 | C6:2 A5:2 F5:2 A5:2 C6:2 D6:2 C6:2 A5:2 | G5:2 B5:2 D6:2 F6:2 E6:2 D6:2 B5:2 G5:2 | C6:4> G5:2' E5:2' C5:4' r:4" },
      A2: { base: 'A', harm: 'harm3' },
      B: { chords: 'Am | Em | F | C | Dm | G | F:8 G:8 | G7', bass: 'walk', drums: 'rock', fill: 'fill2', every: 8,
        mel: "A5:4 C6:2 A5:2 E5:4 r:4 | G5:4 B5:2 G5:2 E5:4 r:4 | F5:2 A5:2 C6:2 F6:2 E6:2 C6:2 A5:2 F5:2 | G5:6 E5:2 C5:4 r:4 | " +
          "D5:2 F5:2 A5:2 D6:2 C6:2 A5:2 F5:2 A5:2 | B5:2 D6:2 G6:4 F6:2 D6:2 B5:4 | A5:2 C6:2 F6:2 C6:2 B5:2 D6:2 G6:2 D6:2 | F6:2' F6:2' r:2 D6:2' r:2 B5:2' G5:2 B5:2",
        harm: 'mel:r:8 C5:2 E5:2 A5:4 | r:8 B4:2 E5:2 G5:4 | A4:8 C5:8 | E5:8 r:8 | F4:8 A4:8 | D5:8 B4:8 | C5:8 D5:8 | B4:4 r:4 D5:4 r:4' },
      C: { chords: 'F | C | Dm | G7', harm: 'skip', bass: 'polka', drums: 'half', fill: 'up', every: 4,
        mel: "A5:2' r:2 A5:2' r:2 C6:2 A5:2 F5:4 | G5:2' r:2 G5:2' r:2 E5:2 G5:2 C6:4 | F5:2 A5:2 D6:2 A5:2 F6:2 D6:2 A5:2 F5:2 | G5:1 A5:1 B5:1 C6:1 D6:2 r:2 G5:2' r:2 G4:4'" } } };

  // Garden (day) 2 — "Sprinkler Skip" (D major, 132, light swing): stuttering "sprinkler" repeated notes, boogie bass
  const SPRINKLER = { name: 'Sprinkler Skip', gain: 1.08, bpm: 132, key: 2, swing: 0.45, wave: [25, 50], vol: [1, 0.85, 1, 0.75], form: 'i | A B C A2',
    S: {
      i: { chords: 'G7', bass: 'boogie', drums: 'snap', mel: "G5:2' r:2 G5:2' r:2 F5:2 D5:2 B4:2 G4:2" },
      A: { chords: 'C | Am | Dm | G7 | C | Am | D7 | G7', harm: 'off', bass: 'boogie', drums: 'shuffle', fill: 'fill', every: 4,
        mel: 'G5:1 G5:1 G5:2 E5:2 C5:2 E5:2 G5:2 A5:2 G5:2 | A5:1 A5:1 A5:2 E5:2 C5:2 E5:2 A5:2 C6:2 A5:2 | F5:2 A5:2 D6:2 C6:2 A5:2 F5:2 D5:4 | B4:2^ D5:2 G5:2 B5:2 D6:4 r:4 | ' +
          'G5:1 G5:1 G5:2 E5:2 C5:2 E5:2 G5:2 C6:2 E6:2 | E6:2 D6:2 C6:2 A5:2 E5:2 A5:2 C6:4 | F#5:2 A5:2 C6:2 D6:2 F#6:2 E6:2 D6:2 C6:2 | B5:2 A5:2 G5:2 F5:2 D5:2 B4:2 G4:4' },
      A2: { base: 'A', harm: 'harm3', drums: 'stomp' },
      B: { chords: 'F | G | Em | Am | Dm | G | C:8 A7:8 | D7:8 G7:8', bass: 'step', drums: 'pop', fill: 'fill2', every: 8,
        mel: 'A5:2 C6:2 F6:2 E6:2 C6:4 A5:4 | B5:2 D6:2 G6:2 F6:2 D6:4 B5:4 | G5:2 B5:2 E6:2 D6:2 B5:2 G5:2 E5:4 | A5:2 C6:2 E6:4 r:2 E6:1 F6:1 E6:2 C6:2 | ' +
          'D6:2 F6:2 A6:2 F6:2 D6:2 A5:2 F5:2 A5:2 | B5:2 D6:2 G6:4 r:4 G5:2 B5:2 | C6:2 E6:2 G6:2 E6:2 C#6:2 E6:2 G6:2 A6:2 | F#6:2 D6:2 A5:2 F#5:2 G5:2 B5:2 D6:2 F6:2',
        harm: 'mel:r:8 F5:4 A5:4 | r:8 G5:4 B5:4 | E5:8 G5:8 | C5:8 E5:8 | F5:8 D5:8 | D5:8 B4:8 | E5:8 C#5:8 | D5:8 B4:8' },
      C: { chords: 'Am | F | C | G7', harm: 'skip', bass: 'pedal', drums: 'brush', fill: 'up', every: 4,
        mel: "C6:2' r:2 B5:2' r:2 A5:2' r:2 E5:2 A5:2 | C6:2' r:2 B5:2' r:2 A5:2' r:2 F5:2 A5:2 | G5:2 C6:2 E6:2 C6:2 G5:2 E5:2 C5:2 E5:2 | D5:2 G5:2 B5:2 D6:2 F6:4> r:4" } } };

  // Garden (night) — "Moonlit Mushroom Tiptoe" (A minor, 116, gentle swing): pizzicato tiptoes, chromatic sneaks, a warm middle
  const NIGHT = { name: 'Moonlit Mushroom Tiptoe', gain: 1.12, bpm: 116, key: 0, swing: 0.33, wave: [50, 'tri'], env: PLUCK, vol: [1.15, 0.9, 1, 0.65], form: 'i | A B A2 C',
    S: {
      i: { chords: 'Am | E7', bass: 'march', drums: 'soft', mel: "A4:2' r:2 C5:2' r:2 E5:2' r:2 D#5:2' r:2 | E5:2' r:2 G#5:2' r:2 B5:2' r:2 D6:2 C6:2" },
      A: { chords: 'Am | Am | Dm | E7 | Am | F | Dm:8 E7:8 | Am', harm: 'off', bass: 'march', drums: 'sneak', fill: 'fill', every: 4,
        mel: "E5:2' A5:2' r:2 A5:2' G#5:2 A5:2 C6:2 A5:2 | E5:2' A5:2' r:2 A5:2' B5:2 C6:2 D6:2 B5:2 | F5:2' A5:2' r:2 D6:2' C#6:2 D6:2 F6:2 D6:2 | B5:2 G#5:2 E5:2 G#5:2 B5:4 r:4 | " +
          "C6:2' E6:2' r:2 C6:2' B5:2 C6:2 E6:2 C6:2 | A5:2' C6:2' r:2 F6:2' E6:2 D6:2 C6:2 A5:2 | D6:2 F6:2 A5:2 D6:2 B5:2 G#5:2 E5:2 G#5:2 | A5:4> E5:2' C5:2' A4:4' r:4" },
      A2: { base: 'A', harm: 'echo:3' },
      B: { chords: 'F | G | C | Am | Dm | E7 | Am:8 F:8 | E7', harm: 'arp8', bass: 'walk', drums: 'brush', fill: 'fill2', every: 8,
        mel: "A5:6 C6:2 F6:4 E6:4 | D6:6 B5:2 G5:4 D6:4 | C6:6 E6:2 G6:4 E6:4 | C6:2 B5:2 A5:2 E5:2 A5:8 | " +
          "F5:2 A5:2 D6:2 F6:2 E6:4 D6:4 | B5:2 D6:2 G#6:2 F6:2 E6:4 D6:4 | C6:2 E6:2 A6:2 E6:2 C6:2 A5:2 F5:2 A5:2 | G#5:2' r:2 B5:2' r:2 D6:2' r:2 E6:4" },
      C: { chords: 'Dm | Am | Bb | E7', harm: 'skip', bass: 'pedal', drums: 'half', fill: 'up', every: 4,
        mel: "D5:2' F5:2' A5:2' r:2 G#5:2 A5:2 D6:4 | C6:2' A5:2' E5:2' r:2 D#5:2 E5:2 A5:4 | Bb5:2 D6:2 F6:2 D6:2 Bb5:2 F5:2 D5:2 F5:2 | E5:2 G#5:2 B5:2 D6:2 E6:2' r:2 E5:2' r:2" } } };

  // Town 1 — "Main Street Mosey" (Bb major, 124, swing): ragtime-ish strut with chromatic chords (E7, A7, Fm)
  const MAINST = { name: 'Main Street Mosey', bpm: 124, key: -2, swing: 0.5, wave: [25, 50], vol: [1, 0.85, 1, 0.75], form: 'i | A B A2 C',
    S: {
      i: { chords: 'G7', bass: 'boogie', drums: 'snap', mel: "r:4 G5:2' F#5:2' F5:2' E5:2' D5:2' B4:2'" },
      A: { chords: 'C | E7 | A7 | Dm | F | Fm | C:8 A7:8 | D7:8 G7:8', harm: 'off', bass: 'boogie', drums: 'shuffle', fill: 'fill', every: 4,
        mel: 'E5:2 G5:2 C6:2 E6:2 D#6:2 E6:2 C6:4 | B5:2 G#5:2 E5:2 G#5:2 B5:4 D6:4 | C#6:2 A5:2 E5:2 G5:2 A5:2 C#6:2 E6:4 | D6:2 F6:2 E6:2 D6:2 A5:4 r:4 | ' +
          'A5:2 C6:2 F6:2 C6:2 A5:2 F5:2 C6:4 | Ab5:2 C6:2 F6:2 C6:2 Ab5:2 F5:2 Eb5:4 | E5:2 G5:2 C6:2 E6:2 C#6:2 E6:2 G6:4 | F#6:2 D6:2 A5:2 F#5:2 G5:2 B5:2 D6:2 G6:2' },
      A2: { base: 'A', drums: 'stomp', harm: 'mel:C5:8 E5:8 | G#4:8 B4:8 | A4:8 C#5:8 | F5:8 D5:8 | F5:8 A5:8 | F5:8 Ab5:8 | G5:8 G5:8 | F#5:8 F5:8' },
      B: { chords: 'F | F#dim | C | A7 | Dm | G7 | C | G7', bass: 'step', drums: 'shuffle', fill: 'fill2', every: 8,
        mel: "A5:2' A5:2' C6:2 A5:2 F5:4 r:4 | A5:2' A5:2' C6:2 A5:2 F#5:4 r:4 | G5:2 E5:2 C5:2 E5:2 G5:2 C6:2 E6:4 | C#6:2 E6:2 G6:2 E6:2 C#6:2 A5:2 G5:4 | " +
          "F5:2 A5:2 D6:2 A5:2 F6:4 D6:4 | G5:2 B5:2 D6:2 F6:2 E6:2 D6:2 B5:4 | C6:4 E6:2 G6:2 E6:2 C6:2 G5:4 | D6:2' r:2 B5:2' r:2 G5:2' F5:2 D5:2 B4:2",
        harm: 'mel:r:12 C5:2 F5:2 | r:12 C5:2 Eb5:2 | E5:8 G5:8 | E5:8 C#5:8 | F5:8 A5:8 | F5:8 D5:8 | E5:8 G5:8 | F5:4 r:4 D5:4 r:4' },
      C: { chords: 'Am | D7 | Dm | G7', harm: 'skip', bass: 'pedal', drums: 'brush', fill: 'up', every: 4,
        mel: "E5:2 A5:2 C6:2 E6:2 D#6:2 E6:2 C6:2 A5:2 | F#5:2 A5:2 C6:2 D6:2 F#6:4 r:4 | F5:2 A5:2 D6:2 F6:2 E6:2 D6:2 A5:2 F5:2 | G5:2' r:2 G5:2' r:2 B5:2 D6:2 F6:2 G6:2" } } };

  // Town 2 — "Corner Shop Calypso" (F major, 118): steel-drum-ish plucks, calypso syncopation (3+3+2), straight time
  const CALYPSO = { name: 'Corner Shop Calypso', gain: 1.06, bpm: 118, key: 5, wave: [50, 12], env: [[0.07, 0.35], [0.06, 0.4], null], vol: [1.15, 0.95, 1, 0.75], form: 'i | A B A+2 C',
    S: {
      i: { chords: 'C | G7', bass: 'tres', drums: 'island', mel: "r:16 | G5:2' r:1 G5:1 F5:2 r:2 D5:2 r:2 B4:4" },
      A: { chords: 'C | C | F | G7 | C | Am | F:8 G7:8 | C', harm: 'off', bass: 'tres', drums: 'island', fill: 'fill', every: 4,
        mel: 'E5:3 G5:3 C6:2 r:2 B5:2 C6:2 G5:2 | E5:3 G5:3 C6:2 r:2 D6:2 E6:2 C6:2 | F5:3 A5:3 C6:2 r:2 B5:2 A5:2 F5:2 | G5:3 B5:3 D6:2 F6:4 E6:2 D6:2 | ' +
          'E6:3 D6:3 C6:2 r:2 G5:2 A5:2 C6:2 | C6:3 B5:3 A5:2 r:2 E5:2 G5:2 A5:2 | F5:2 A5:2 C6:2 A5:2 G5:2 B5:2 D6:2 F6:2 | E6:4> C6:2 G5:2 E5:2 G5:2 C6:4' },
      B: { chords: 'Dm | G7 | Em | Am | Dm | G7 | C | C', bass: 'tres', drums: 'island', fill: 'fill2', every: 8,
        mel: "D6:2 C6:2 A5:2 F5:2 D5:4 r:4 | B4:2 D5:2 G5:2 B5:2 D6:4 r:4 | E6:2 D6:2 B5:2 G5:2 E5:4 r:4 | A5:2 C6:2 E6:2 G6:2 E6:4 r:4 | " +
          "F6:3 E6:3 D6:2 r:2 A5:2 C6:2 D6:2 | B5:3 C6:3 D6:2 r:2 F6:2 E6:2 D6:2 | C6:3 G5:3 E5:2 r:2 G5:2 C6:2 E6:2 | G6:2' r:2 E6:2' r:2 C6:2' r:2 G5:4",
        harm: 'mel:r:8 A4:2 D5:2 F5:4 | r:8 G4:2 B4:2 F5:4 | r:8 G4:2 B4:2 E5:4 | r:8 C5:2 E5:2 A5:4 | F5:8 D5:8 | D5:8 B4:8 | E5:8 G5:8 | E5:4 r:4 E5:4 r:4' },
      C: { chords: 'Am | Dm | F | G7', harm: 'skip', bass: 'tres', drums: 'half', fill: 'up', every: 4,
        mel: "A5:2' r:2 C6:2' r:2 E6:2' r:2 C6:2 A5:2 | D6:2' r:2 F6:2' r:2 A6:2' r:2 F6:2 D6:2 | A5:2 C6:2 F6:2 C6:2 A5:2 F5:2 C5:2 F5:2 | G5:2 B5:2 D6:2 F6:2 G6:4> r:4" } } };

  // Battle 1 — "Hedge Row Rumble" (E minor, 168): jabbing repeated-note hook over an octave bass, a chromatic zombie-shuffle breakdown
  const HEDGE = { name: 'Hedge Row Rumble', bpm: 168, key: -5, wave: [25, 12], form: 'i | A B C A2',
    S: {
      i: { chords: 'Am | E7', harm: 'pad', bass: 'drive', drums: 'snap', fill: 'up', every: 2,
        mel: 'A4:2> r:2 A4:2> r:2 C5:2 B4:2 A4:2 E5:2 | G#5:2> r:2 G#5:2> r:2 B5:2 D6:2 E6:4' },
      A: { chords: 'Am | C | G | E7 | Am | C | D | E7', harm: 'arp16', bass: 'oct', drums: 'battle', fill: 'fill', every: 4,
        mel: 'A5:2 A5:1 A5:1 E5:2 A5:2 C6:3 B5:1 A5:2 E5:2 | G5:2 G5:1 G5:1 E5:2 G5:2 C6:3 D6:1 E6:2 C6:2 | D6:2 B5:2 G5:2 B5:2 D6:3 E6:1 D6:2 B5:2 | G#5:2 B5:2 E6:4> D6:2 B5:2 G#5:2 E5:2 | ' +
          'A5:2 A5:1 A5:1 E5:2 A5:2 C6:3 B5:1 A5:2 C6:2 | E6:2 E6:1 E6:1 C6:2 E6:2 G6:3 F6:1 E6:2 C6:2 | F#6:2 D6:2 A5:2 F#5:2 A5:2 D6:2 F#6:2 A6:2 | G#6:4> E6:2 B5:2 G#5:2 B5:2 E6:2 D6:2' },
      A2: { base: 'A', harm: 'harm3', drums: 'drive' },
      B: { chords: 'F | G | Em | Am | F | G | E | E', bass: 'pump', drums: 'drive', fill: 'fill2', every: 8,
        mel: 'C6:4 A5:2 C6:2 F6:4 C6:4 | D6:4 B5:2 D6:2 G6:4 D6:4 | E6:3 D6:1 B5:2 G5:2 E5:2 G5:2 B5:2 E6:2 | C6:2 B5:2 A5:2 E5:2 A5:4 r:4 | ' +
          'A5:2 C6:2 F6:2 A6:2 G6:2 F6:2 C6:2 A5:2 | B5:2 D6:2 G6:2 B6:2 A6:2 G6:2 D6:2 B5:2 | G#5:4> B5:4> E6:8~ | E6:2 D6:2 B5:2 G#5:2 E5:2 G#5:2 B5:2 D6:2',
        harm: 'mel:A4:8 C5:8 | B4:8 D5:8 | G4:8 B4:8 | E5:8 C5:8 | F5:4 r:4 F5:4 r:4 | G5:4 r:4 G5:4 r:4 | E5:8 G#5:8 | r:8 B4:2 D5:2 E5:2 G#5:2' },
      C: { chords: 'Am | Ab | G | E7', harm: 'pad', bass: 'drive', drums: 'half', fill: 'up', every: 4,
        mel: "A5:2' r:2 E5:2' r:2 A5:2' r:2 C6:2 B5:2 | Ab5:2' r:2 Eb5:2' r:2 Ab5:2' r:2 C6:2 Bb5:2 | G5:2' r:2 D5:2' r:2 G5:2' r:2 B5:2 D6:2 | E6:2 D6:2 B5:2 G#5:2 E5:2 G#5:2 B5:4>" } } };

  // Battle 2 — "Garden Gate Showdown" (D minor, 172): circle-of-fifths hook, galloping drums, a bright major-key chorus
  const GATE = { name: 'Garden Gate Showdown', bpm: 172, key: 5, wave: [12, 25], form: 'i | A B C A2',
    S: {
      i: { chords: 'Am', bass: 'drive', drums: 'snap', mel: 'E5:1 E5:1 r:2 E5:1 E5:1 r:2 A5:2 C6:2 E6:2 G#5:2' },
      A: { chords: 'Am | Dm | G | C | F | Dm | E7 | E7', harm: 'up8', bass: 'oct', drums: 'gallop', fill: 'fill', every: 4,
        mel: 'E5:2 A5:2 C6:2 E6:4 C6:2 B5:2 C6:2 | D6:2 F6:2 A6:2 F6:4 D6:2 C6:2 D6:2 | B5:2 D6:2 G6:2 D6:4 B5:2 A5:2 B5:2 | C6:2 E6:2 G6:4> E6:2 C6:2 G5:2 E5:2 | ' +
          'F5:2 A5:2 C6:2 F6:4 E6:2 D6:2 C6:2 | D6:2 F6:2 A6:4 G6:2 F6:2 E6:2 D6:2 | E6:2 G#6:2 B6:4> A6:2 G#6:2 E6:2 D6:2 | B5:2 G#5:2 E5:2 G#5:2 B5:2 D6:2 E6:4' },
      A2: { base: 'A', harm: 'harm3', drums: 'drive' },
      B: { chords: 'F | C | G | Am | F | C | E7 | E7', harm: 'arp16', bass: 'pump', drums: 'drive', fill: 'fill2', every: 8,
        mel: 'A5:4 C6:4 F6:6 E6:2 | E6:4 D6:2 C6:2 G5:8 | B5:4 D6:4 G6:6 F6:2 | E6:4 C6:2 A5:2 E5:8 | ' +
          'F5:2 A5:2 C6:2 F6:2 A6:4 G6:2 F6:2 | E6:2 G6:2 C7:4> B6:2 G6:2 E6:4 | G#6:2 E6:2 B5:2 E6:2 G#6:2 B6:2 D7:4> | C7:2 B6:2 G#6:2 E6:2 D6:2 B5:2 G#5:2 E5:2' },
      C: { chords: 'Am | Am | F | E7', harm: 'skip', bass: 'pedal', drums: 'tom', fill: 'up', every: 4,
        mel: 'A4:2> A4:2> r:2 C5:2> r:2 E5:2 D5:2 C5:2 | A4:2> A4:2> r:2 C5:2> r:2 E5:2 F5:2 G5:2 | A5:2> A5:2> r:2 C6:2> r:2 F6:2 E6:2 C6:2 | B5:2 G#5:2 E5:2 G#5:2 B5:2 E6:2 G#6:4>' } } };

  // Boss (Raid Chief) — "Mecha-Boss Stomp" (C minor, 150): big stomping bass in octaves, silly-menacing chromatic hook, robot breakdown
  const BOSS = { name: 'Mecha-Boss Stomp', bpm: 150, key: 3, wave: [25, 50], vol: [1, 0.8, 1.15, 1], blo: 40, form: 'i | A B C A2',
    S: {
      i: { chords: 'Am | Am', harm: 'bass2', bass: 'boss', drums: 'sparse', fill: 'tom', every: 2, mel: 'r:16 | r:8 E5:2> F5:2> F#5:2> G#5:2>' },
      A: { chords: 'Am | Am | F | E | Am | Am | Bb | E', harm: 'bass2', bass: 'boss', drums: 'boss', fill: 'fill2', every: 4,
        mel: 'A4:2 B4:2 C5:2 A4:2 E5:4> D#5:2 E5:2 | A5:3 G5:1 E5:2 C5:2 D#5:2 E5:2 r:4 | F5:2 G5:2 A5:2 F5:2 C6:4> B5:2 C6:2 | B5:3 A5:1 G#5:2 E5:2 G#5:2 B5:2 r:4 | ' +
          'A5:2 B5:2 C6:2 A5:2 E6:4> D#6:2 E6:2 | A6:3 G6:1 E6:2 C6:2 D#6:2 E6:2 r:4 | F6:2 D6:2 Bb5:2 F5:2 D6:2 Bb5:2 F5:2 D5:2 | E5:2 G#5:2 B5:2 E6:2 G#6:4> r:4' },
      A2: { base: 'A', harm: 'arp16' },
      B: { chords: 'F | G | C | Am | F | G | E | E', harm: 'arp16', bass: 'oct', drums: 'battle', fill: 'fill2', every: 8,
        mel: 'C6:2 A5:2 F5:2 A5:2 C6:4 F6:4 | D6:2 B5:2 G5:2 B5:2 D6:4 G6:4 | E6:2 G6:2 C7:4> G6:2 E6:2 C6:4 | A5:2 C6:2 E6:4 D6:2 C6:2 A5:4 | ' +
          'F6:3 E6:1 C6:2 A5:2 F5:4 A5:4 | G6:3 F6:1 D6:2 B5:2 G5:4 B5:4 | G#5:2 B5:2 E6:2 G#6:2 B6:4> G#6:4 | E6:2 D6:2 B5:2 G#5:2 E5:2 D5:2 B4:2 G#4:2' },
      C: { chords: 'Dm | Dm | E | E', harm: 'bass2', bass: 'boss', drums: 'tom', fill: 'fill2', every: 4,
        mel: 'D5:1 D5:1 r:2 D5:1 D5:1 r:2 F5:2 E5:2 D5:4 | A5:1 A5:1 r:2 A5:1 A5:1 r:2 C6:2 B5:2 A5:4 | E5:2 F5:2 E5:2 D#5:2 E5:2 G#5:2 B5:4 | E6:2 F6:2 E6:2 D#6:2 E6:4> r:4' } } };

  // Plant cups — "Golden Trowel Cup" (Bb major, 164): heroic and bright, rising arpeggio finale
  const CUP = { name: 'Golden Trowel Cup', bpm: 164, key: -2, wave: [25, 12], form: 'i | A B A2 C',
    S: {
      i: { chords: 'C | G7', harm: 'pad', bass: 'drive', drums: 'snap', fill: 'up', every: 2, mel: 'C5:2> r:2 C5:2> r:2 C5:2 E5:2 G5:4 | B4:2> r:2 B4:2> r:2 D5:2 F5:2 G5:4' },
      A: { chords: 'C | Am | F | G | C | Am | Bb:8 F:8 | G', harm: 'arp16', bass: 'oct', drums: 'battle', fill: 'fill', every: 4,
        mel: 'G5:2 C6:2 E6:4 D6:2 C6:2 G5:4 | A5:2 C6:2 E6:4 D6:2 C6:2 A5:4 | F5:2 A5:2 C6:2 F6:2 E6:2 D6:2 C6:2 A5:2 | B5:4 D6:4 G6:4> r:4 | ' +
          'G5:2 C6:2 E6:4 G6:2 E6:2 C6:4 | C6:2 E6:2 A6:4 G6:2 E6:2 A5:4 | Bb5:2 D6:2 F6:2 D6:2 A5:2 C6:2 F6:2 C6:2 | D6:2 B5:2 G5:2 B5:2 D6:2 F6:2 G6:4>' },
      A2: { base: 'A', harm: 'harm3', drums: 'drive' },
      B: { chords: 'Am | Em | F | C | Dm | E7 | F | G7', bass: 'pump', drums: 'drive', fill: 'fill2', every: 8,
        mel: 'E6:4 C6:2 A5:2 E5:4 A5:4 | G5:4 B5:2 E6:2 G6:4 E6:4 | F6:4 C6:2 A5:2 F5:4 A5:4 | G5:2 C6:2 E6:2 G6:2 E6:4 C6:4 | ' +
          'D6:2 F6:2 A6:4 F6:2 D6:2 A5:4 | G#5:2 B5:2 E6:4 D6:2 B5:2 G#5:4 | A5:2 C6:2 F6:2 A6:2 G6:2 F6:2 C6:2 A5:2 | B5:2 D6:2 F6:2 G6:2 B6:4> r:4',
        harm: 'mel:C5:8 E5:8 | B4:8 E5:8 | A4:8 C5:8 | E5:8 G5:8 | F5:8 D5:8 | E5:8 B4:8 | C5:8 A4:8 | D5:8 F5:8' },
      C: { chords: 'Am | F | Dm | G', harm: 'up8', bass: 'half', drums: 'tom', fill: 'up', every: 4,
        mel: 'A5:6 C6:2 E6:8 | F6:6 E6:2 C6:8 | D6:2 F6:2 A6:2 F6:2 D6:2 A5:2 F5:2 A5:2 | G5:1 A5:1 B5:1 C6:1 D6:1 E6:1 F6:1 G6:1 B6:4> r:4' } } };

  // Zombie raid in the garden — "Uninvited Guests" (A minor, 156): a lumbering chromatic shuffle hook, sly bass, straight drive
  const RAID = { name: 'Uninvited Guests', gain: 1.08, bpm: 156, key: 0, wave: [12, 50], vol: [1, 0.85, 1, 0.8], form: 'i | A B A2 C',
    S: {
      i: { chords: 'Am | E7', harm: 'harm3', bass: 'drive', drums: 'snap', fill: 'up', every: 2,
        mel: "A4:2' C5:2' D#5:2' E5:2' r:4 A4:1 C5:1 E5:1 G5:1 | G#5:2> r:2 G#5:2> r:2 B5:2 D6:2 E6:4" },
      A: { chords: 'Am | Am | Dm | E7 | Am | Am | F:8 E7:8 | Am', harm: 'off', bass: 'sly', drums: 'raid', fill: 'fill2', every: 4,
        mel: "A4:2 C5:2 E5:2 D#5:2 E5:2 r:2 A5:4> | G5:2 F5:2 E5:2 D#5:2 E5:2 r:2 C5:4 | D5:2 F5:2 A5:2 G#5:2 A5:2 r:2 D6:4> | C6:2 B5:2 A5:2 G#5:2 B5:2 r:2 E5:4 | " +
          "A5:2 C6:2 E6:2 D#6:2 E6:2 r:2 A6:4> | G6:2 F6:2 E6:2 D#6:2 E6:2 C6:2 A5:4 | F5:2 A5:2 C6:2 F6:2 E6:2 G#5:2 B5:2 E6:2 | A5:2' r:2 A5:2' r:2 E5:2' r:2 A4:4'" },
      A2: { base: 'A', harm: 'harm3', drums: 'battle' },
      B: { chords: 'F | G | C | Am | F | G | E7 | E7', harm: 'arp8', bass: 'pump', drums: 'drive', fill: 'fill', every: 8,
        mel: 'A5:2 C6:2 F6:4 E6:2 C6:2 A5:4 | B5:2 D6:2 G6:4 F6:2 D6:2 B5:4 | C6:2 E6:2 G6:2 C7:2 B6:2 G6:2 E6:4 | A6:4 E6:2 C6:2 A5:4 r:4 | ' +
          'F6:2 E6:2 C6:2 A5:2 F5:2 A5:2 C6:4 | G6:2 F6:2 D6:2 B5:2 G5:2 B5:2 D6:4 | E6:2 F6:2 E6:2 D#6:2 E6:2 G#6:2 B6:4> | B6:2 G#6:2 E6:2 D6:2 B5:2 G#5:2 E5:4' },
      C: { chords: 'Am | Bb | Am | E7', harm: 'skip', bass: 'octx', drums: 'tom', fill: 'snap', every: 4,
        mel: "A5:2> r:2 A5:2> r:2 E5:2 F5:2 F#5:2 G5:2 | Bb5:2> r:2 Bb5:2> r:2 F5:2 F#5:2 G5:2 G#5:2 | A5:2> r:2 A5:2> r:2 C6:2 B5:2 Bb5:2 A5:2 | G#5:2 B5:2 E6:2 G#6:2 B6:2' r:2 E6:2' r:2" } } };

  // Race 1 — "Lawnmower Dash" (D major, 180): zooming broken-chord hook, disco hats in the chorus
  const MOWER = { name: 'Lawnmower Dash', bpm: 180, key: 2, wave: [25, 12], form: 'i | A B C A+2',
    S: {
      i: { chords: 'G | G7', bass: 'oct', drums: 'sparse', fill: 'up', every: 2, mel: "D5:2' r:2 D5:2' r:2 D5:2' r:2 G5:4 | G5:1 A5:1 B5:1 C6:1 D6:2 F6:2 G6:4> r:4" },
      A: { chords: 'C | F | G | C | Am | F | D7 | G7', harm: 'arp16', bass: 'oct', drums: 'race', fill: 'fill', every: 4,
        mel: 'E6:2 C6:2 G5:2 C6:2 E6:2 G6:2 E6:4 | F6:2 C6:2 A5:2 C6:2 F6:2 A6:2 F6:4 | D6:2 B5:2 G5:2 B5:2 D6:2 F6:2 G6:2 F6:2 | E6:4> C6:2 G5:2 E5:4 G5:4 | ' +
          'A5:2 C6:2 E6:2 A6:2 G6:2 E6:2 C6:2 E6:2 | F6:2 E6:2 C6:2 A5:2 F5:2 A5:2 C6:4 | F#6:2 D6:2 A5:2 F#5:2 A5:2 D6:2 F#6:4 | G6:2 F6:2 D6:2 B5:2 G5:2 A5:2 B5:2 D6:2' },
      B: { chords: 'Am | Em | F | G | Am | Em | F | G7', bass: 'hop', drums: 'disco', fill: 'fill2', every: 8,
        mel: 'C6:3 B5:1 A5:4 E5:4 A5:4 | B5:3 A5:1 G5:4 E5:4 G5:4 | A5:2 C6:2 F6:4 E6:2 D6:2 C6:4 | D6:6 B5:2 G5:8 | ' +
          'E6:3 D6:1 C6:4 A5:4 E6:4 | G6:3 F6:1 E6:4 B5:4 G6:4 | A6:2 G6:2 F6:2 E6:2 D6:2 C6:2 A5:2 C6:2 | B5:2 D6:2 F6:2 G6:2 B6:4> r:4',
        harm: 'mel:r:12 E6:2 D6:2 | r:12 D6:2 C6:2 | A5:8 C6:8 | B5:8 r:8 | r:12 E6:2 F6:2 | r:12 G6:2 A6:2 | C6:8 A5:8 | D6:8 F6:8' },
      C: { chords: 'F | G | Em | Am', harm: 'pad', bass: 'pedal', drums: 'half', fill: 'up', every: 4,
        mel: 'C6:4 F6:4 A6:8 | B5:4 D6:4 G6:8 | B5:2 E6:2 G6:2 B6:2 G6:2 E6:2 B5:2 G5:2 | A5:2 C6:2 E6:2 A6:2 G6:1 F6:1 E6:1 D6:1 C6:2 B5:2' } } };

  // Race 2 — "Wheelbarrow Rally" (A major, 172): rattly funk bass, call-and-answer hook, sprint fill at the end
  const BARROW = { name: 'Wheelbarrow Rally', bpm: 172, key: -3, wave: [12, 25], form: 'i | A B C A+2',
    S: {
      i: { chords: 'G7', bass: 'oct', drums: 'snap', mel: "G5:2' G5:2' r:2 G5:2' r:2 B5:2 D6:2 F6:2" },
      A: { chords: 'C | G | Am | Em | F | C | Dm:8 G:8 | C', harm: 'skip', bass: 'funk', drums: 'pop', fill: 'fill', every: 4,
        mel: 'C6:2 G5:2 r:2 C6:2 E6:2 D6:2 C6:2 G5:2 | B5:2 G5:2 r:2 B5:2 D6:2 C6:2 B5:2 G5:2 | A5:2 E5:2 r:2 A5:2 C6:2 B5:2 A5:2 E5:2 | G5:2 B5:2 E6:2 G6:2 E6:4 B5:4 | ' +
          'A5:2 C6:2 F6:2 C6:2 A6:3 G6:1 F6:2 C6:2 | E6:2 C6:2 G5:2 C6:2 E6:4 G6:4 | F6:2 E6:2 D6:2 A5:2 B5:2 D6:2 G6:2 F6:2 | E6:4> C6:2 G5:2 C6:2 E6:2 G6:4' },
      B: { chords: 'F | G | Am | Am | F | G | E7 | E7', harm: 'arp16', bass: 'oct', drums: 'race', fill: 'fill2', every: 8,
        mel: 'A5:6 C6:2 F6:4 E6:4 | D6:6 B5:2 G5:4 B5:4 | C6:4 A5:2 C6:2 E6:4 A6:4 | G6:2 E6:2 C6:2 E6:2 A6:8 | ' +
          'A6:2 G6:2 F6:2 C6:2 A5:2 C6:2 F6:4 | G6:2 F6:2 D6:2 B5:2 G5:2 B5:2 D6:4 | E6:2 G#6:2 B6:2 G#6:2 E6:2 B5:2 G#5:4 | B5:2 C6:2 D6:2 E6:2 F6:2 E6:2 D6:2 B5:2' },
      C: { chords: 'Am | F | G | G7', harm: 'skip', bass: 'pedal', drums: 'half', fill: 'up', every: 4,
        mel: "E6:2' r:2 E6:2' r:2 A6:2' r:2 E6:2 C6:2 | F6:2' r:2 F6:2' r:2 A6:2' r:2 F6:2 C6:2 | D6:2 B5:2 G5:2 B5:2 D6:2 G6:2 D6:2 B5:2 | G5:1 A5:1 B5:1 C6:1 D6:1 E6:1 F6:1 G6:1 F6:2> D6:2 B5:2 G5:2" } } };

  // Survival 1 — "Last Lawn Standing" (G minor, 146): galloping bass, stubborn heroic hook, gets brighter in the chorus
  const SURV_A = { name: 'Last Lawn Standing', bpm: 146, key: -2, wave: [25, 12], form: 'i | A B C A2',
    S: {
      i: { chords: 'Am | E7', bass: 'gallop', drums: 'sparse', fill: 'snap', every: 2, mel: "r:16 | E5:2' r:2 E5:2' r:2 G#5:2 B5:2 D6:2 E6:2" },
      A: { chords: 'Am | C | Dm | E7 | Am | C | F:8 G:8 | E7', harm: 'arp16', bass: 'gallop', drums: 'battle', fill: 'fill', every: 4,
        mel: 'A5:4 E5:2 A5:2 C6:4 B5:2 A5:2 | G5:4 E5:2 G5:2 C6:4 D6:2 E6:2 | F6:4 D6:2 A5:2 F5:4 A5:2 D6:2 | B5:4 G#5:2 E5:2 B5:4 r:4 | ' +
          'A5:4 E5:2 A5:2 C6:4 E6:2 A6:2 | G6:4 E6:2 C6:2 G6:4 F6:2 E6:2 | F6:2 E6:2 D6:2 C6:2 D6:2 E6:2 F6:2 G6:2 | G#6:4> E6:2 B5:2 G#5:4 E5:4' },
      A2: { base: 'A', harm: 'harm3' },
      B: { chords: 'F | C | G | Am | F | C | Dm | E7', bass: 'oct', drums: 'drive', fill: 'fill2', every: 8,
        mel: 'A5:2 C6:2 F6:2 A6:2 G6:4 F6:4 | E6:2 G6:2 C7:2 G6:2 E6:4 C6:4 | D6:2 G6:2 B6:2 G6:2 D6:4 B5:4 | C6:6 B5:1 A5:1 E5:8 | ' +
          'F5:2 A5:2 C6:2 F6:2 E6:4 D6:4 | E6:2 G6:2 C7:4 B6:2 G6:2 E6:4 | F6:2 D6:2 A5:2 D6:2 F6:2 A6:2 F6:2 D6:2 | B5:2 D6:2 E6:2 G#6:2 B6:4> r:4',
        harm: 'mel:C5:8 A4:8 | G4:8 C5:8 | B4:8 D5:8 | E5:8 C5:8 | A4:8 C5:8 | C5:8 E5:8 | D5:8 F5:8 | E5:8 G#4:8' },
      C: { chords: 'Dm | Am | Dm | E7', harm: 'arp8', bass: 'pedal', drums: 'tom', fill: 'up', every: 4,
        mel: 'D6:3 C6:1 A5:4 F5:4 A5:4 | C6:3 B5:1 A5:4 E5:4 A5:4 | D6:2 F6:2 A6:2 F6:2 D6:2 F6:2 A6:4 | G#6:2 E6:2 B5:2 G#5:2 E5:4> r:4' } } };

  // Survival 2 — "Night Watch Thumper" (B minor, 152): pumping bass, stomping kick, a soaring major chorus
  const SURV_B = { name: 'Night Watch Thumper', bpm: 152, key: 2, wave: [12, 50], form: 'i | A B C A2',
    S: {
      i: { chords: 'Am', bass: 'drive', drums: 'snap', mel: 'A4:1 A4:1 r:2 A4:1 A4:1 r:2 C5:2 E5:2 A5:2 B5:2' },
      A: { chords: 'Am | F | C | G | Am | F | G | E7', harm: 'up8', bass: 'pump', drums: 'stomp', fill: 'fill', every: 4,
        mel: 'E5:2 A5:2 B5:2 C6:2 B5:2 A5:2 E5:4 | F5:2 A5:2 C6:2 F6:2 E6:2 C6:2 A5:4 | G5:2 C6:2 E6:2 G6:2 F6:2 E6:2 C6:4 | D6:2 B5:2 G5:2 B5:2 D6:4 r:4 | ' +
          'E6:2 A6:2 G6:2 E6:2 C6:2 E6:2 A5:4 | F6:2 E6:2 C6:2 A5:2 F5:2 A5:2 C6:4 | B5:2 D6:2 G6:2 F6:2 D6:2 B5:2 G5:4 | G#5:2 B5:2 E6:2 G#6:2 B6:4> r:4' },
      A2: { base: 'A', harm: 'harm3', drums: 'battle' },
      B: { chords: 'C | G | Am | Em | F | C | Dm:8 E7:8 | Am', harm: 'arp16', bass: 'oct', drums: 'drive', fill: 'fill2', every: 8,
        mel: 'E6:4 G6:4 C7:6 B6:2 | B6:4 G6:2 D6:2 B5:8 | C6:4 E6:4 A6:6 G6:2 | G6:4 E6:2 B5:2 G5:8 | ' +
          'A5:2 C6:2 F6:2 A6:2 G6:2 F6:2 C6:4 | E6:2 G6:2 C7:2 G6:2 E6:2 C6:2 G5:4 | F6:2 D6:2 A5:2 D6:2 G#6:2 E6:2 B5:2 E6:2 | A6:4> E6:2 C6:2 A5:4 r:4' },
      C: { chords: 'F | E7 | F | E7', harm: 'skip', bass: 'octx', drums: 'tom', fill: 'snap', every: 4,
        mel: 'A5:2> r:2 C6:2> r:2 F6:2 E6:2 C6:2 A5:2 | G#5:2> r:2 B5:2> r:2 E6:2 D6:2 B5:2 G#5:2 | A5:2> r:2 C6:2> r:2 F6:2 G6:2 A6:2 C7:2 | B6:2 G#6:2 E6:2 D6:2 B5:2 G#5:2 E5:4>' } } };

  // Adventure map 1 — "Path to the Old Shed" (D major, 128): walking bass, a curious echoing tune that keeps peeking around corners
  const SHED = { name: 'Path to the Old Shed', bpm: 128, key: 2, wave: [50, 12], vol: [1, 0.8, 1, 0.7], form: 'i | A B C A2',
    S: {
      i: { chords: 'G7', bass: 'walk', drums: 'snap', mel: 'r:8 G4:2 B4:2 D5:2 F5:2' },
      A: { chords: 'C | G | Am | F | C | G | F:8 G:8 | C', harm: 'echo:3', bass: 'walk', drums: 'light', fill: 'fill', every: 4,
        mel: 'E5:2 G5:2 C6:3 B5:1 C6:2 G5:2 E5:4 | D5:2 G5:2 B5:3 A5:1 B5:2 G5:2 D5:4 | C5:2 E5:2 A5:3 G5:1 A5:2 C6:2 E6:4 | F6:2 E6:2 C6:2 A5:2 F5:4 r:4 | ' +
          "E5:2 G5:2 C6:3 D6:1 E6:2 C6:2 G5:4 | D6:2 B5:2 G5:2 B5:2 D6:3 E6:1 F6:4 | E6:2 C6:2 A5:2 F5:2 D6:2 B5:2 G5:2 B5:2 | C6:4> G5:2' E5:2' C5:4' r:4" },
      A2: { base: 'A', harm: 'harm3', drums: 'pop' },
      B: { chords: 'Am | Em | F | C | Dm | G | E7 | E7', harm: 'arp8', bass: 'step', drums: 'pop', fill: 'fill2', every: 8,
        mel: "A5:4 C6:4 E6:6 D6:2 | B5:4 G5:4 E5:8 | F5:4 A5:4 C6:6 B5:2 | C6:2 E6:2 G6:2 E6:2 C6:8 | " +
          "D6:4 F6:4 A6:4 F6:4 | G6:4 D6:4 B5:4 G5:4 | G#5:2 B5:2 E6:2 G#6:2 B6:4 G#6:4 | E6:2' r:2 D6:2' r:2 B5:2' r:2 G#5:4" },
      C: { chords: 'F | G | Am | G7', harm: 'skip', bass: 'polka', drums: 'half', fill: 'up', every: 4,
        mel: "A5:2' r:2 C6:2' r:2 F6:2 E6:2 C6:2 A5:2 | B5:2' r:2 D6:2' r:2 G6:2 F6:2 D6:2 B5:2 | C6:2 E6:2 A6:2 E6:2 C6:2 A5:2 E5:2 A5:2 | G5:2 B5:2 D6:2 F6:2 G6:4> r:4" } } };

  // Adventure map 2 — "Seed Trail Stroll" (F major, 136, light swing): skipping bass, sing-song hook that climbs each bar
  const TRAIL = { name: 'Seed Trail Stroll', bpm: 136, key: 5, swing: 0.4, wave: [25, 'tri'], vol: [1, 0.85, 1, 0.7], form: 'i | A B A+2',
    S: {
      i: { chords: 'C | G7', bass: 'skip', drums: 'snap', mel: "r:16 | G5:2' r:2 E5:2' r:2 D5:2' r:2 B4:2 D5:2" },
      A: { chords: 'C | Am | F | G | C | Am | Dm:8 G7:8 | C', harm: 'off', bass: 'skip', drums: 'pop', fill: 'fill', every: 4,
        mel: 'C5:2 E5:2 G5:2 A5:1 G5:1 E5:4 C6:4 | A5:2 C6:2 E6:2 D6:1 C6:1 A5:4 E5:4 | F5:2 A5:2 C6:2 D6:1 C6:1 A5:4 F5:4 | G5:2 B5:2 D6:2 E6:1 D6:1 B5:4 G5:4 | ' +
          "C6:2 E6:2 G6:2 A6:1 G6:1 E6:4 C6:4 | A5:2 C6:2 E6:2 F6:1 E6:1 C6:4 A5:4 | D6:2 F6:2 A6:2 F6:2 G6:2 F6:2 D6:2 B5:2 | C6:4> E6:2' C6:2' G5:4' r:4" },
      B: { chords: 'F | C | Dm | Am | Bb | F | G | G7', bass: 'step', drums: 'pop', fill: 'fill2', every: 8,
        mel: "A5:4 F5:2 A5:2 C6:4 A5:4 | G5:4 E5:2 G5:2 C6:4 G5:4 | F5:4 D5:2 F5:2 A5:4 D6:4 | C6:4 A5:2 E5:2 A5:8 | " +
          "Bb5:4 D6:2 F6:2 D6:4 Bb5:4 | A5:4 C6:2 F6:2 C6:4 A5:4 | B5:2 D6:2 G6:2 D6:2 B5:2 G5:2 D5:2 G5:2 | F5:2' r:2 G5:2' r:2 B5:2 D6:2 F6:4",
        harm: 'mel:r:8 C5:4 F5:4 | r:8 E5:4 G5:4 | r:8 D5:4 F5:4 | E5:8 C5:8 | D5:8 F5:8 | F5:8 C5:8 | D5:8 B4:8 | B4:4 r:4 D5:4 r:4' } } };

  // Arcade 1 — "Pinball Peas" (G major, 160): flipper-bounce hook, sparkly 16th arpeggios, a chromatic-mediant level-up turn
  const PINBALL = { name: 'Pinball Peas', bpm: 160, key: -5, wave: [12, 25], form: 'i | A B C A+2',
    S: {
      i: { chords: 'C | G7', bass: 'oct', drums: 'disco', mel: 'C6:1 G5:1 E5:1 G5:1 C6:1 G5:1 E5:1 G5:1 C6:4> r:4 | B5:1 G5:1 D5:1 G5:1 B5:1 G5:1 D5:1 G5:1 D6:4> r:4' },
      A: { chords: 'C | C | F | F | G | G | C:8 Am:8 | Dm:8 G7:8', harm: 'arp16', bass: 'oct', drums: 'disco', fill: 'fill', every: 4,
        mel: "E5:2 G5:2 C6:2' r:2 C6:2' r:2 B5:2 C6:2 | E6:4 D6:2 C6:2 G5:4 r:4 | F5:2 A5:2 C6:2' r:2 C6:2' r:2 B5:2 C6:2 | F6:4 E6:2 C6:2 A5:4 r:4 | " +
          "D5:2 G5:2 B5:2' r:2 B5:2' r:2 A5:2 B5:2 | D6:4 C6:2 B5:2 G5:4 F5:4 | E5:2 G5:2 C6:2 E6:2 A5:2 C6:2 E6:2 A6:2 | F6:2 D6:2 A5:2 F5:2 G5:2 B5:2 D6:2 F6:2" },
      B: { chords: 'Am | F | C | G | Am | F | D7 | G7', harm: 'skip', bass: 'funk', drums: 'pop', fill: 'fill2', every: 8,
        mel: 'A5:2 B5:2 C6:2 E6:2 A6:4 E6:4 | F6:2 E6:2 C6:2 A5:2 F5:4 A5:4 | G5:2 A5:2 C6:2 E6:2 G6:4 E6:4 | D6:2 C6:2 B5:2 G5:2 D5:4 r:4 | ' +
          'A5:2 C6:2 E6:2 A6:2 C7:4 A6:4 | F6:2 A6:2 C7:2 A6:2 F6:4 C6:4 | F#6:2 D6:2 A5:2 D6:2 F#6:2 A6:2 C7:4 | B6:2 G6:2 F6:2 D6:2 B5:2 G5:2 F5:2 D5:2' },
      C: { chords: 'C | Eb | F | G', harm: 'arp16', bass: 'oct', drums: 'half', fill: 'up', every: 4,
        mel: 'C6:2 E6:2 G6:2 C7:2 G6:2 E6:2 C6:4 | Eb6:2 G6:2 Bb6:2 Eb7:2 Bb6:2 G6:2 Eb6:4 | F6:2 A6:2 C7:2 F7:2 C7:2 A6:2 F6:4 | G6:2 B6:2 D7:2 G7:2 F7:2 D7:2 B6:4' } } };

  // Arcade 2 — "Token Tumble" (A major, 150): coin-drop turns in the hook, chromatic chords (E7, C7, Fm), stop-start breakdown
  const TOKEN = { name: 'Token Tumble', bpm: 150, key: -3, wave: [25, 50], form: 'i | A B A2 C',
    S: {
      i: { chords: 'G7', bass: 'octx', drums: 'snap', mel: 'G5:1 A5:1 B5:1 D6:1 G6:4> r:2 F6:2 D6:2 B5:2' },
      A: { chords: 'C | E7 | Am | C7 | F | Fm | C:8 G7:8 | C', harm: 'off', bass: 'octx', drums: 'disco', fill: 'fill', every: 4,
        mel: "G5:2 C6:2 E6:2 G6:2 E6:1 F6:1 E6:2 C6:4 | G#5:2 B5:2 E6:2 G#6:2 E6:1 F6:1 E6:2 B5:4 | A5:2 C6:2 E6:2 A6:2 G6:1 A6:1 G6:2 E6:4 | G6:2 E6:2 C6:2 Bb5:2 G5:4 E5:4 | " +
          "A5:2 C6:2 F6:2 A6:2 G6:2 F6:2 C6:4 | Ab5:2 C6:2 F6:2 Ab6:2 G6:2 F6:2 C6:4 | E6:2 G6:2 C7:2 G6:2 F6:2 D6:2 B5:2 G5:2 | C6:4> G5:2' E5:2' C5:2' r:6" },
      A2: { base: 'A', harm: 'arp8', drums: 'pop' },
      B: { chords: 'Am | Em | F | C | Dm | G | E7 | E7', harm: 'skip', bass: 'hop', drums: 'pop', fill: 'fill2', every: 8,
        mel: "C6:2' C6:2' r:2 E6:2 A6:4 G6:2 E6:2 | B5:2' B5:2' r:2 E6:2 G6:4 F#6:2 E6:2 | A5:2' A5:2' r:2 C6:2 F6:4 E6:2 C6:2 | G5:2 C6:2 E6:2 G6:2 E6:4 r:4 | " +
          "F6:2' F6:2' r:2 D6:2 A5:4 D6:2 F6:2 | G6:2' G6:2' r:2 D6:2 B5:4 D6:2 G6:2 | G#6:2 E6:2 B5:2 E6:2 G#6:2 B6:2 D7:4 | B6:2 G#6:2 E6:2 D6:2 B5:2 G#5:2 E5:4" },
      C: { chords: 'F | G | Am | G7', harm: 'arp16', bass: 'pedal', drums: 'half', fill: 'up', every: 4,
        mel: "C6:1 C6:1 r:2 A5:1 A5:1 r:2 F5:2 A5:2 C6:4 | D6:1 D6:1 r:2 B5:1 B5:1 r:2 G5:2 B5:2 D6:4 | E6:1 E6:1 r:2 C6:1 C6:1 r:2 A5:2 C6:2 E6:4 | F6:2 D6:2 B5:2 G5:2 F6:2' r:2 G6:4>" } } };

  // Bowling — "Rolling Nut Jig" (G major, 6/8 at 172): rolling triplet lines that tumble down like a ball down the lawn
  const BOWL = { name: 'Rolling Nut Jig', bpm: 172, key: -5, bar: 12, wave: [25, 12], vol: [1, 0.85, 1, 0.75], form: 'i | A B A2',
    S: {
      i: { chords: 'G7', bass: 'jig', drums: 'jig', mel: 'G5:2 F5:2 D5:2 B4:2 D5:2 F5:2' },
      A: { chords: 'C | C | G7 | C | F | C | G7 | C', harm: 'harm3', bass: 'jig', drums: 'jig', fill: 'jigfill', every: 4,
        mel: "E5:2 G5:2 C6:2 E6:4 C6:2 | G5:2 E5:2 C5:2 E5:2 G5:2 C6:2 | D6:2 B5:2 G5:2 F5:4 D5:2 | E5:2 G5:2 C6:2 E5:6 | " +
          "F5:2 A5:2 C6:2 F6:4 E6:2 | E6:2 C6:2 G5:2 E6:4 C6:2 | B5:2 D6:2 F6:2 G6:2 F6:2 D6:2 | C6:6> G5:2' E5:2' C5:2'" },
      A2: { base: 'A', harm: 'echo:2' },
      B: { chords: 'Am | Am | F | G | Am | Em | F:6 G:6 | G7', harm: 'harm3', bass: 'jig', drums: 'jig', fill: 'jigfill', every: 4,
        mel: 'A5:2 C6:2 E6:2 A6:4 E6:2 | C6:2 B5:2 A5:2 E5:6 | F5:2 A5:2 C6:2 F6:4 C6:2 | D6:2 B5:2 G5:2 B5:6 | ' +
          'A5:2 C6:2 E6:2 A6:2 G6:2 E6:2 | G6:2 E6:2 B5:2 G5:6 | A5:2 C6:2 F6:2 G6:2 F6:2 D6:2 | B5:2 G5:2 F5:2 D5:2 B4:2 G4:2' } } };

  // Whack-a-zombie — "Bonk Bonk Boogie" (F major, 176): staccato mallet hits, oom-pah march, a stop-start bonk breakdown
  const WHACK = { name: 'Bonk Bonk Boogie', gain: 1.08, bpm: 176, key: 5, wave: [12, 50], env: PLUCK, vol: [1.15, 0.85, 1, 0.8], form: 'i | A B A+2 C',
    S: {
      i: { chords: 'C', bass: 'polka', drums: 'snap', mel: "C6:2' r:2 C6:2' r:2 G5:2' r:2 C5:2' r:2" },
      A: { chords: 'C | G7 | G7 | C | F | C | G7 | C', harm: 'off', bass: 'polka', drums: 'march', fill: 'fill', every: 4,
        mel: "C5:2' E5:2' G5:2' C6:2' r:2 B5:2' C6:2' r:2 | B4:2' D5:2' F5:2' B5:2' r:2 A5:2' B5:2' r:2 | G5:2 F5:2 D5:2 B4:2 G4:2 B4:2 D5:2 F5:2 | E5:2' C5:2' G4:2' C5:2' E5:4> r:4 | " +
          "A5:2' C6:2' F6:2' C6:2' r:2 A5:2' F5:2' r:2 | G5:2' C6:2' E6:2' C6:2' r:2 G5:2' E5:2' r:2 | D6:2 B5:2 G5:2 F5:2 D5:2 F5:2 G5:2 B5:2 | C6:2' r:2 G5:2' r:2 C5:4> r:4" },
      B: { chords: 'Am | E7 | Am | E7 | F | C | D7 | G7', harm: 'skip', bass: 'polka', drums: 'pop', fill: 'fill2', every: 8,
        mel: "A5:2 C6:2 E6:4 D#6:2 E6:2 C6:4 | B5:2 G#5:2 E5:4 D#5:2 E5:2 G#5:4 | A5:2 C6:2 E6:4 F6:2 E6:2 C6:4 | B5:4 D6:4 E6:4> r:4 | " +
          "F6:2 E6:2 C6:2 A5:2 F5:4 A5:4 | E6:2 D6:2 C6:2 G5:2 E5:4 G5:4 | F#5:2 A5:2 C6:2 D6:2 F#6:4 D6:4 | G6:2' r:2 F6:2' r:2 D6:2' r:2 B5:4" },
      C: { chords: 'C | C | G | G7', harm: 'skip', bass: 'oct', drums: 'half', fill: 'clap', every: 4,
        mel: "C6:1' C6:1' r:2 G5:1' G5:1' r:2 E5:1' E5:1' r:2 C5:4 | E5:1' E5:1' r:2 G5:1' G5:1' r:2 C6:1' C6:1' r:2 E6:4 | D6:1' D6:1' r:2 B5:1' B5:1' r:2 G5:1' G5:1' r:2 D5:4 | G5:1 A5:1 B5:1 C6:1 D6:1 E6:1 F6:1 G6:1 F6:4> r:4" } } };

  // Vase breaker — "Pottery Puzzle" (B minor, 112, gentle swing): curious pizzicato tiptoe with a sneaky B7 twist
  const VASE = { name: 'Pottery Puzzle', gain: 1.1, bpm: 112, key: 2, swing: 0.33, wave: [50, 'tri'], env: PLUCK, vol: [1.15, 0.9, 1, 0.6], form: 'i | A B A2',
    S: {
      i: { chords: 'Am', bass: 'march', drums: 'soft', mel: "A4:2' r:2 B4:2' r:2 C5:2' r:2 D#5:2' E5:2'" },
      A: { chords: 'Am | B7 | Am | E7 | Am | B7 | C:8 B7:8 | E7', harm: 'off', bass: 'march', drums: 'sneak', fill: 'fill', every: 4,
        mel: "E5:2' A5:2' r:2 C6:2' B5:2' A5:2' E5:4 | D#5:2' F#5:2' r:2 A5:2' B5:2' A5:2' F#5:4 | E5:2' A5:2' r:2 C6:2' E6:2' D6:2' C6:4 | B5:2 G#5:2 E5:2 D5:2 B4:4 r:4 | " +
          "C6:2' E6:2' r:2 A6:2' G6:2' E6:2' C6:4 | B5:2' D#6:2' r:2 F#6:2' A6:2' F#6:2' D#6:4 | E6:2 G6:2 E6:2 C6:2 D#6:2 F#6:2 A6:4 | G#6:2 E6:2 B5:2 G#5:2 E5:4> r:4" },
      A2: { base: 'A', harm: 'echo:3' },
      B: { chords: 'F | G | C | Am | Dm | G | Bb | E7', harm: 'arp8', bass: 'walk', drums: 'brush', fill: 'fill2', every: 8,
        mel: "A5:4 C6:2 F6:2 E6:4 C6:4 | B5:4 D6:2 G6:2 F6:4 D6:4 | C6:4 E6:2 G6:2 C7:4 G6:4 | A6:2 G6:2 E6:2 C6:2 A5:8 | " +
          "F5:2 A5:2 D6:2 F6:2 E6:4 D6:4 | D6:2 G6:2 B6:2 G6:2 F6:4 D6:4 | D6:2 F6:2 Bb6:2 F6:2 D6:2 Bb5:2 F5:4 | E5:2' G#5:2' B5:2' D6:2' E6:4> r:4" } } };

  // Halloween 1 — "Greater Rindguard Jamboree" (D minor, 144): spooky-fun organ, oom-pah bounce, harmonic-minor wiggles
  const JAMBOREE = { name: "Greater Rindguard Jamboree", gain: 1.05, bpm: 144, key: -7, wave: ['org', 25], vol: [0.95, 0.85, 1, 0.75], form: 'i | A B A2 C',
    S: {
      i: { chords: 'Am | E7', harm: 'pad', bass: 'polka', drums: 'sparse', fill: 'up', every: 2,
        mel: 'A5:4> G#5:2 A5:2 E5:4 C5:4 | B4:2 C5:2 D5:2 D#5:2 E5:4> r:4' },
      A: { chords: 'Am | Am | Dm | E7 | Am | Am | F:8 E7:8 | Am', harm: 'off', bass: 'polka', drums: 'stomp', fill: 'fill', every: 4,
        mel: "A4:2 E5:2 A5:2 E5:2 C6:3 B5:1 A5:2 E5:2 | G#5:2 A5:2 B5:2 C6:2 B5:2 A5:2 E5:4 | D5:2 A5:2 D6:2 A5:2 F6:3 E6:1 D6:2 A5:2 | G#5:2 B5:2 D6:2 F6:2 E6:4> r:4 | " +
          "A5:2 E6:2 A6:2 E6:2 C7:3 B6:1 A6:2 E6:2 | F6:2 E6:2 D#6:2 E6:2 C6:2 B5:2 A5:4 | F5:2 A5:2 C6:2 F6:2 E6:2 D6:2 B5:2 G#5:2 | A5:4> E5:2' C5:2' A4:4' r:4" },
      A2: { base: 'A', harm: 'harm3', drums: 'pop' },
      B: { chords: 'F | G | C | E7 | F | G | A | A', harm: 'arp8', bass: 'oct', drums: 'pop', fill: 'fill2', every: 8,
        mel: "A5:2 C6:2 F6:2 C6:2 A6:4 F6:4 | B5:2 D6:2 G6:2 D6:2 B6:4 G6:4 | C6:2 E6:2 G6:2 E6:2 C7:4 G6:4 | B6:2 G#6:2 E6:2 D6:2 B5:4 G#5:4 | " +
          "A5:2 C6:2 F6:2 A6:2 G6:2 F6:2 C6:2 A5:2 | B5:2 D6:2 G6:2 B6:2 A6:2 G6:2 D6:2 B5:2 | C#6:4> E6:4> A6:8~ | A6:2' r:2 E6:2' r:2 C#6:2' r:2 A5:2 G#5:2" },
      C: { chords: 'Dm | Am | Bb | E7', harm: 'skip', bass: 'march', drums: 'sneak', fill: 'up', every: 4,
        mel: "D5:2' r:2 F5:2' r:2 A5:2' r:2 G#5:2 A5:2 | C6:2' r:2 A5:2' r:2 E5:2' r:2 D#5:2 E5:2 | F5:2 Bb5:2 D6:2 F6:2 E6:2 D6:2 Bb5:2 F5:2 | E5:2 G#5:2 B5:2 D6:2 F6:2 E6:2 D6:2 B5:2" } } };

  // Halloween 2 — "Haunted Hayride" (G minor, 132): creaky organ chords under a tiptoeing tune, a big spooky-silly chorus
  const HAYRIDE = { name: 'Haunted Hayride', gain: 1.05, bpm: 132, key: -2, wave: [25, 'org'], vol: [1, 0.8, 1, 0.7], form: 'i | A B A2',
    S: {
      i: { chords: 'Am', bass: 'march', drums: 'sparse', mel: "E6:2' D#6:2' E6:2' C6:2' A5:2' r:2 E5:4'" },
      A: { chords: 'Am | Dm | E7 | Am | Am | Dm | E7 | Am', harm: 'off', bass: 'march', drums: 'sneak', fill: 'fill', every: 4,
        mel: "A5:2 B5:2 C6:2 A5:2 E6:4 r:4 | F6:2 E6:2 D6:2 A5:2 F5:4 r:4 | E5:2 G#5:2 B5:2 D6:2 C6:2 B5:2 G#5:4 | A5:2 E5:2 C5:2 E5:2 A5:4 r:4 | " +
          "C6:2 D6:2 E6:2 C6:2 A6:4 r:4 | A6:2 G6:2 F6:2 D6:2 A5:4 r:4 | G#5:2 B5:2 E6:2 G#6:2 F6:2 E6:2 D6:2 B5:2 | A5:4> r:2 E5:2' A4:4' r:4" },
      A2: { base: 'A', harm: 'harm3', drums: 'stomp' },
      B: { chords: 'F | C | G | E7 | F | C | Dm | E7', harm: 'arp8', bass: 'walk', drums: 'pop', fill: 'fill2', every: 8,
        mel: "A5:6 C6:2 F6:8 | G6:6 E6:2 C6:8 | D6:6 B5:2 G5:8 | G#5:2 B5:2 D6:2 E6:2 G#6:8 | " +
          "A6:4 F6:4 C6:4 A5:4 | G5:4 C6:4 E6:4 G6:4 | F6:2 E6:2 D6:2 A5:2 F5:2 A5:2 D6:2 F6:2 | E6:2' r:2 B5:2' r:2 G#5:2' r:2 E5:4'" } } };

  // the loop after a win — "Sunny Lawn Parade" (C major, 144, light swing): a bright brassy strut
  const VICTORY = { name: 'Sunny Lawn Parade', bpm: 144, swing: 0.3, wave: [25, 12], form: 'A B',
    S: {
      A: { chords: 'C | F | G | C | Am | F | G7 | C', harm: 'off', bass: 'boogie', drums: 'pop', fill: 'fill', every: 4,
        mel: "C5:2 G5:2 E5:2 G5:2 C6:4> E6:4 | F6:2 C6:2 A5:2 C6:2 F6:4> A5:4 | G5:2 B5:2 D6:2 G6:2 F6:2 D6:2 B5:4 | C6:2 E6:2 G6:4> E6:2 C6:2 G5:4 | " +
          "A5:2 C6:2 E6:2 A6:2 G6:2 E6:2 C6:4 | F6:2 A6:2 C7:4> A6:2 F6:2 C6:4 | D6:2 F6:2 G6:2 B6:2 A6:2 G6:2 F6:2 D6:2 | C7:4> G6:2' E6:2' C6:4' r:4" },
      B: { chords: 'F | G | Em | Am | Dm | G | C:8 A7:8 | D7:8 G7:8', harm: 'arp8', bass: 'step', drums: 'rock', fill: 'fill2', every: 8,
        mel: 'A5:2 C6:2 F6:4 r:2 E6:2 F6:2 A6:2 | G6:2 D6:2 B5:4 r:2 A5:2 B5:2 D6:2 | E6:2 B5:2 G5:4 r:2 F#5:2 G5:2 B5:2 | C6:2 A5:2 E5:4 r:2 E5:2 A5:2 C6:2 | ' +
          'F6:2 E6:2 D6:2 A5:2 F5:4 A5:4 | D6:2 B5:2 G5:2 B5:2 D6:4 G6:4 | E6:2 G6:2 C7:2 G6:2 C#7:2 A6:2 E6:2 G6:2 | F#6:2 D6:2 A5:2 F#5:2 G5:2 B5:2 D6:2 F6:2' } } };

  // a plant evolving — "Blooming Up" (D major, 120): shimmering arpeggios that climb to a big bright chord
  const EVOLVE = { name: 'Blooming Up', bpm: 120, key: 2, wave: [50, 12], vol: [1, 0.8, 0.8, 0.7], form: 'A B',
    S: {
      A: { chords: 'C | Am | F | G', harm: 'arp16', bass: 'pedal', drums: 'beat', mel: 'G5:12~ C6:4 | C6:12~ E6:4 | A5:8 C6:4 F6:4 | D6:12~ G5:4' },
      B: { chords: 'F | G | Ab:8 Bb:8 | C', harm: 'arp16', bass: 'oct', drums: 'drive', fill: 'up', every: 4, mel: 'C6:4 F6:4 A6:8 | D6:4 G6:4 B6:8 | Ab6:4 C7:4 Bb6:4 D7:4 | C7:16~' } } };

  // track id -> one song, or a playlist (each song plays its loops, then hands over to the next on the beat)
  const DEF = {
    title: TITLE,
    'garden-day': [PICKET, SPRINKLER],
    'garden-night': NIGHT,
    town: [MAINST, CALYPSO],
    battle: [HEDGE, GATE],
    'battle-boss': BOSS,
    'battle-cup': CUP,
    raid: RAID,
    race: [MOWER, BARROW],
    survival: [SURV_A, SURV_B],
    'adventure-map': [SHED, TRAIL],
    arcade: [PINBALL, TOKEN],
    bowling: BOWL,
    whack: WHACK,
    vase: VASE,
    halloween: [JAMBOREE, HAYRIDE],
    victory: VICTORY,
    evolve: EVOLVE,
  };
  // short fanfares (one-shot): hand-written second voice and bass, raw drum strings
  const J = {
    victory: { bpm: 160, mel: "C5:1 E5:1 G5:1 C6:1 E6:2' C6:1 E6:1 G6:2' F6:1 E6:1 D6:1 C6:1 B5:1 D6:1 C6:8>",
      harm: "mel:E4:1 G4:1 C5:1 E5:1 G5:2' E5:1 G5:1 C6:2' A5:1 G5:1 F5:1 E5:1 D5:1 F5:1 E5:8", bass: 'mel:C3:4 E3:2 G3:2 F3:2 E3:2 D3:2 G2:2 C3:8',
      dr: 'K...S...K.S.SSSSK.o.....' },
    lose: { bpm: 132, wave: ['tri', 50], vol: [1.1, 0.7, 0.8, 1], gate: 0.9, mel: "G5:2 E5:2 F5:1 D5:1 E5:2 C5:2 r:1 G4:1 C5:4'",
      harm: 'mel:E5:2 C5:2 D5:1 B4:1 C5:2 G4:2 r:1 E4:1 E4:4', bass: 'mel:C3:4 G2:2 C3:2 r:2 G2:2 C3:4' },
    levelup: { bpm: 160, mel: 'C6:1 D6:1 E6:1 G6:1 r:1 E6:1 G6:1 C7:4>', harm: 'mel:E5:1 F5:1 G5:1 B5:1 r:1 G5:1 B5:1 E6:4', bass: 'mel:C3:2 G2:2 r:1 C3:1 C3:4' },
    evolved: { bpm: 144, mel: "E5:2' G5:1 A5:1 C6:2' E6:2' r:1 D6:1 E6:1 G6:1 C7:8>", harm: 'mel:C5:2 E5:1 F5:1 G5:2 C6:2 r:1 B5:1 C6:1 D6:1 E6:8',
      bass: 'mel:C3:4 F2:2 G2:2 r:2 G2:2 C3:8', dr: 'S.SSS.S.K.K.S.o.....' },
    trophy: { bpm: 140, vol: [1, 1, 1, 0.8], mel: 'G4:2 C5:2 E5:2 G5:2 C6:3 B5:1 C6:1 D6:1 E6:1 G6:1 E6:2 C7:8>',
      harm: 'mel:E4:2 G4:2 C5:2 E5:2 E5:3 G5:1 A5:1 B5:1 C6:1 D6:1 C6:2 E6:8', bass: 'mel:C3:4 C3:4 F2:4 G2:4 C3:2 G2:2 C3:4', dr: 'K...S...K...S...S.S.SSSSK.o.' },
    unlock: { bpm: 160, mel: "C6:1 G5:1 C6:1 E6:1 G6:2' E6:1 A6:4>", harm: 'mel:E5:1 E5:1 E5:1 G5:1 C6:2 C6:1 C6:4', bass: 'mel:C3:2 G2:2 C3:2 r:1 F3:4' },
    hatch: { bpm: 150, mel: "E6:1 C6:1 G5:1 C6:1 E6:2' G6:2' F6:1 G6:1 C7:4>", harm: 'mel:C6:1 G5:1 E5:1 G5:1 C6:2 E6:2 D6:1 E6:1 G6:4', bass: 'mel:C3:4 G2:2 C3:2 G2:2 C3:4' },
    item: { bpm: 168, mel: "E6:1 G6:1 C7:2' r:1 G6:1 C7:3>", harm: 'mel:C6:1 E6:1 G6:2 r:1 E6:1 G6:3', bass: 'mel:C3:2 G2:2 r:1 C3:3' },
    rare: { bpm: 150, key: -5, mel: 'C6:1 D6:1 E6:1 G6:1 A6:1 G6:1 E6:1 G6:1 C7:2 D7:2* E7:4>', harm: 'echo:2', bass: 'mel:C4:4 F3:4 G3:4 C4:4', dr: 'K.......K...o...' },
    star: { bpm: 170, wave: [12, 'sine'], mel: 'G6:1 C7:1 E7:1 G7:3>', harm: 'mel:E6:1 G6:1 C7:1 E7:3', bass: 'mel:C4:2 G3:1 C4:3' },
    candy: { bpm: 160, wave: [12, 'sine'], mel: "C6:1 E6:1 G6:1 E6:1 C7:2' r:1 B6:1 C7:3>", harm: 'mel:G5:1 C6:1 E6:1 C6:1 G6:2 r:1 G6:1 G6:3', bass: 'mel:C3:4 G2:2 r:2 C3:3' },
    newpage: { bpm: 150, mel: 'G5:1 B5:1 D6:1 G6:1 F#6:1 G6:1 A6:1 B6:1 D7:4>', harm: 'mel:D5:1 G5:1 B5:1 D6:1 D6:1 D6:1 F#6:1 G6:1 B6:4', bass: 'mel:G2:4 D3:4 G2:4' },
    daily: { bpm: 140, mel: "C6:2 E6:1 D6:1 C6:1 G5:1 A5:1 B5:1 C6:2' E6:2' G6:4>", harm: 'mel:E5:2 G5:1 F5:1 E5:1 E5:1 F5:1 G5:1 E5:2 G5:2 C6:4',
      bass: 'mel:C3:4 F2:2 G2:2 C3:4 G2:2 C3:2', dr: 'K...S...K.S.S.o.' },
  };

  // ================= synth =================
  const LOOK = 0.12, TICK = 25, XF = 0.4, DUCK = 0.3;
  const MUSIC_VOL = 0.045, JINGLE_VOL = 1.6; // music sits at about a third of the sound effects' loudness (measured RMS)
  const CH_VOL = [0.3, 0.13, 0.5, 0.25]; // lead, second voice, triangle bass, noise drums
  const WAVE_K = { 12: 1.3, 25: 1, 50: 0.6, tri: 1.6, sine: 1.3, org: 0.62 }; // evens out how loud each wave shape sounds
  const WAVES = new WeakMap();
  function waves(a) { // pulse waves (12.5 / 25 / 50% duty), a reedy organ and a looping noise buffer, made once per context
    let w = WAVES.get(a); if (w) return w;
    w = {};
    for (const d of [12, 25, 50]) {
      const n = 48, re = new Float32Array(n), im = new Float32Array(n), duty = d === 12 ? 0.125 : d / 100;
      for (let k = 1; k < n; k++) re[k] = 4 / (k * Math.PI) * Math.sin(k * Math.PI * duty);
      w[d] = a.createPeriodicWave(re, im);
    }
    { const re = new Float32Array(9), im = new Float32Array(9); [0, 1, 0.75, 0.4, 0.5, 0, 0.22, 0, 0.28].forEach((v, k) => { im[k] = v; }); w.org = a.createPeriodicWave(re, im); }
    const len = Math.floor(a.sampleRate * 0.5), b = a.createBuffer(1, len, a.sampleRate), x = b.getChannelData(0);
    for (let i = 0, v = 0; i < len; i++) { if (!(i & 1)) v = Math.random() * 2 - 1; x[i] = v; }
    w.noise = b; WAVES.set(a, w); return w;
  }
  let alive = 0; // decks whose nodes are still connected (the test page checks this stays small)
  function deck(a, out, song, g0, offline) {
    const W = waves(a), t = a.currentTime, nodes = [], srcs = [], ch = [];
    const dg = a.createGain(); dg.gain.setValueAtTime(g0, t); dg.connect(out); nodes.push(dg);
    for (let i = 0; i < 3; i++) {
      const w = i === 2 ? 'tri' : song.wave[i], o = a.createOscillator(), g = a.createGain();
      if (w === 'tri') o.type = 'triangle'; else if (w === 'sine') o.type = 'sine'; else o.setPeriodicWave(W[w] || W[25]);
      g.gain.setValueAtTime(0, t); o.connect(g); g.connect(dg); nodes.push(o, g); srcs.push(o);
      ch.push({ o, g, k: CH_VOL[i] * song.vol[i] * song.gain * (i === 2 ? 1 : WAVE_K[w] || 1) });
    }
    if (song.drums) { // one looping noise source feeding three fixed filters, each with its own volume
      const s = a.createBufferSource(), dr = {};
      s.buffer = W.noise; s.loop = true; nodes.push(s); srcs.push(s);
      for (const [v, type, hz, q] of DRUM_F) {
        const f = a.createBiquadFilter(), g = a.createGain();
        f.type = type; f.frequency.value = hz; f.Q.value = q; g.gain.setValueAtTime(0, t);
        s.connect(f); f.connect(g); g.connect(dg); nodes.push(f, g); dr[v] = { g, until: 0 };
      }
      dr.o = dr.h; ch.push({ o: s, dr, k: CH_VOL[3] * song.vol[3] * song.gain });
    }
    for (const s of srcs) s.start(t);
    if (!offline) {
      alive++; let gone = false;
      srcs[0].onended = () => { if (gone) return; gone = true; alive--; for (const n of nodes) { try { n.disconnect(); } catch (e) { /* already */ } } };
    }
    return { a, out, off: !!offline, song, ch, dg, srcs, nodes: nodes.length, born: t, pos: 0, next: t + 0.05, gv: [t, g0, t, g0],
      dying: false, killT: 0, done: false, endT: 0, si: 0, rot: 0, loops: 0, handoff: false };
  }
  // ramp a gain from wherever it is now (worked out from the last ramp: Safari's .value doesn't follow automation)
  function rampTo(p, st, v, dur, a) {
    const t = a.currentTime, d = Math.max(0.005, dur);
    const k = st[2] > st[0] ? Math.min(1, Math.max(0, (t - st[0]) / (st[2] - st[0]))) : 1, now = st[1] + (st[3] - st[1]) * k;
    try { p.cancelScheduledValues(t); p.setValueAtTime(now, t); p.linearRampToValueAtTime(v, t + d); } catch (e) { /* context gone */ }
    return [t, now, t + d, v];
  }
  function kill(dk, fade) { // fade a deck out, then its oscillators stop and every node unplugs
    const t = dk.a.currentTime;
    if (dk.dying && dk.killT <= t + fade) return;
    dk.dying = true; dk.gv = rampTo(dk.dg.gain, dk.gv, 0, fade, dk.a); dk.killT = t + fade;
    for (const s of dk.srcs) { try { s.stop(dk.killT + 0.03); } catch (e) { /* already stopped */ } }
  }
  // note envelope: 5 ms attack, short decay to a sustain level, release that always ends before the next note starts
  function env(p, t, v, tEnd, rel, dec, sus) {
    const ta = t + 0.005;
    p.setValueAtTime(0, t); p.linearRampToValueAtTime(v, ta);
    if (tEnd > ta + dec) { p.linearRampToValueAtTime(v * sus, ta + dec); p.setValueAtTime(v * sus, tEnd); }
    else if (tEnd > ta) p.linearRampToValueAtTime(v + (v * sus - v) * (tEnd - ta) / dec, tEnd);
    p.linearRampToValueAtTime(0, tEnd + rel);
  }
  function vibrato(p, t0, t1, cents, rate) { // a gentle delayed vibrato on long notes (detune ramps, no extra nodes)
    const half = 0.5 / rate; let s = 1, t = t0;
    p.setValueAtTime(0, t0);
    while (t + half < t1) { t += half; p.linearRampToValueAtTime(s * cents, t); s = -s; }
    p.linearRampToValueAtTime(0, Math.min(t1 + 0.02, t + half));
  }
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  let inten = 1; // PX.Music.intensity()
  function noteOn(dk, e, t, sd, span) {
    const c = dk.ch[e.c]; if (!c) return;
    let v = c.k * (e.v == null ? 1 : e.v);
    if (inten < 1 && !dk.fanfare) { // a calmer arrangement: drums and the second voice step back, melody and bass stay
      if (e.c === 1) { v *= Math.min(1, inten * 2); if (v < 1e-3) return; }
      else if (e.c === 3 && inten < (e.n === 'K' ? 0.15 : e.n === 'S' ? 0.35 : 0.6)) return;
    }
    // (`until`: a note never starts before the last one on that voice has fully released, even across a tempo change)
    if (e.c === 3) {
      const kit = KIT[e.n], vo = c.dr[e.n]; if (!kit || !vo) return;
      if (t < vo.until) t = vo.until + 0.001;
      const dec = Math.max(0.01, Math.min(kit[1], span - 0.004)), p = vo.g.gain, pk = v * kit[0];
      p.setValueAtTime(0, t); p.linearRampToValueAtTime(pk, t + 0.002); p.linearRampToValueAtTime(pk * 0.3, t + dec * 0.35); p.linearRampToValueAtTime(0, t + dec);
      vo.until = t + dec; return;
    }
    if (t < (c.until || 0)) t = c.until + 0.001;
    const f = hz(e.n), F = c.o.frequency;
    if (e.o === 1 || e.o === 2) { // grace note from below, or a quick turn to the note above: pitch steps, same oscillator
      const og = Math.min(0.035, span * 0.2), fn = hz(e.nb);
      if (e.o === 1) { F.setValueAtTime(fn, t); F.setValueAtTime(f, t + og); }
      else { F.setValueAtTime(f, t); F.setValueAtTime(fn, t + og); F.setValueAtTime(f, t + 2 * og); }
    } else if (e.o === 3) { F.setValueAtTime(f * 0.8409, t); F.exponentialRampToValueAtTime(f, t + Math.min(0.06, span * 0.35)); } // slide up a minor third
    else F.setValueAtTime(f, t);
    const rel = Math.min(0.03, span * 0.25), hold = Math.max(0.008, Math.min(span * (e.g || 0.9), span - rel - 0.004));
    const ev = dk.song.env && dk.song.env[e.c]; // a plucky voice (marimba lead, steel-drum stabs) decays to a lower sustain
    env(c.g.gain, t, v, t + hold, rel, ev ? ev[0] : e.c === 2 ? 0.15 : 0.08, ev ? ev[1] : e.c === 2 ? 0.8 : 0.7);
    c.until = t + hold + rel;
    if (e.c < 2) { c.o.detune.setValueAtTime(0, t); if (e.vib && hold > 0.32) vibrato(c.o.detune, t + 0.2, t + hold, 11, 5.5); }
  }
  function run(dk, until, now) { // schedule a deck's notes up to `until`
    if (dk.done) return;
    const song = dk.song, sd = song.sd / (dk.fanfare ? 1 : tempoK), sw = song.sw;
    if (dk.next < now - 0.03) dk.next = now + 0.01; // the timer was starved: skip ahead rather than burst out a backlog
    while (dk.next < until) {
      const evs = song.ev[dk.pos];
      if (evs) { // swing: off-beat 8ths (and the 16ths around them) land a little late; lengths stretch to match
        const s0 = sw[dk.pos & 3];
        for (const e of evs) noteOn(dk, e, dk.next + s0 * sd, sd, (e.d + sw[(dk.pos + e.d) & 3] - s0) * sd);
      }
      dk.next += sd;
      if (++dk.pos >= song.len) {
        if (song.loopAt < 0) { dk.done = true; dk.endT = dk.next + 0.06; break; }
        dk.pos = song.loopAt; dk.loops++;
        if (dk.rot && !dk.dying && dk.loops >= dk.rot) { dk.done = true; dk.handoff = true; dk.endT = dk.next; break; } // next song's turn
      }
    }
  }
  // playlist hand-over: the next song of the same id starts on the exact beat where this one's loop ended (a new deck at full
  // volume; the old one holds until that moment, then a 60 ms fade catches its last release and it unplugs as usual)
  function handoff(dk, loopsEach) {
    const list = playlist(dk.song.id), si = (dk.si + 1) % list.length, a = dk.a, t0 = Math.max(a.currentTime, dk.endT);
    const nx = deck(a, dk.out, list[si], 1, dk.off);
    nx.si = si; nx.rot = loopsEach || list[si].loops; nx.next = dk.endT; nx.fanfare = dk.fanfare;
    if (!dk.off) rot[dk.song.id] = si + 1;
    try { const p = dk.dg.gain; p.cancelScheduledValues(a.currentTime); p.setValueAtTime(1, t0); p.linearRampToValueAtTime(0, t0 + 0.06); } catch (e) { /* gone */ }
    dk.gv = [t0, 1, t0 + 0.06, 0]; dk.dying = true; dk.killT = t0 + 0.06; dk.handoff = false;
    for (const s of dk.srcs) { try { s.stop(dk.killT + 0.03); } catch (e) { /* already stopped */ } }
    return nx;
  }

  // ================= player =================
  const ACTION = new Set(['battle', 'battle-boss', 'battle-cup', 'raid', 'race', 'survival', 'arcade', 'bowling', 'whack', 'vase']);
  const KEY = 'pvzg:music'; // '0' = music off on this device, '1' / missing = on
  let mOff = false; try { mOff = localStorage.getItem(KEY) === '0'; } catch (e) { /* default: music on */ }
  let want = null, cur = null, decks = [], jdk = null, jAfter, jBlock = false, hub = null, resumeAt = null;
  let timer = 0, tempoK = 1, bound = null, master = null, duck = null, duckSt = [0, 1, 0, 1], quietAt = 0, jT = 0, poll = 0;
  const CACHE = {}, rot = {}; // rot: which song of each id plays next
  const playlist = id => (DEF[id] ? CACHE[id] || (CACHE[id] = [].concat(DEF[id]).map((d, i) => Object.assign(compile(d, id + '/' + (d.name || i), false), { id }))) : null);
  const fanfare = id => (J[id] ? CACHE['j:' + id] || (CACHE['j:' + id] = compile(J[id], id, true)) : null);

  function bind(a) { // first sight of the (shared) context: our master and duck gains live here
    bound = a; decks = []; cur = null; jdk = null; jBlock = false; jAfter = undefined;
    try { a.addEventListener('statechange', sync); } catch (e) { /* older Safari: taps and page visibility still call sync() */ }
    master = a.createGain(); master.gain.value = MUSIC_VOL; master.connect(a.destination);
    duck = a.createGain(); duck.gain.value = 1; duck.connect(master); duckSt = [0, 1, 0, 1];
  }
  function canRun() { const a = S.ctx; return !!a && a === bound && a.state === 'running' && !document.hidden && !S.held && !S.muted && !mOff; }
  function sync() {
    try {
      const a = S.ctx;
      if (a && a !== bound) bind(a);
      if (!canRun()) { hush(0.1); return; }
      if (!timer) timer = setInterval(tick, TICK);
      start();
      tick();
    } catch (e) { /* music is optional: never break the game */ }
  }
  // fade everything out and stop the clock; the wanted track is remembered and comes back (same song, same bar) later
  function hush(fade) {
    if (timer) { clearInterval(timer); timer = 0; }
    if (!bound) return;
    if (cur || jdk || decks.length) quietAt = performance.now() + fade * 1000 + 60;
    if (cur) resumeAt = { id: cur.song.id, si: cur.si, pos: cur.pos, loops: cur.loops };
    if (jdk) { kill(jdk, fade); jdk = null; if (jAfter !== undefined) { want = jAfter; resumeAt = null; } jAfter = undefined; jBlock = false; }
    for (const dk of decks) kill(dk, fade);
    decks = []; cur = null;
    if (duckSt[3] !== 1) duckSt = rampTo(duck.gain, duckSt, 1, fade, bound);
  }
  function start() { // make the wanted track the one playing (400 ms crossfade)
    if (jBlock || !bound) return;
    if (!want) { if (cur) { kill(cur, XF); cur = null; } return; }
    if (cur && cur.song.id === want) return;
    const list = playlist(want); if (!list) return;
    const a = bound, fresh = !cur;
    if (cur && a.currentTime - cur.born < 0.06) return; // switching faster than this: tick() finishes the switch a moment later
    if (cur) kill(cur, a.currentTime - cur.born < 0.3 ? 0.03 : XF); // a track that only just started goes at once
    for (const dk of decks) if (dk.dying && dk !== cur && dk.killT > a.currentTime + 0.05) kill(dk, 0.03); // one fade-out at a time
    const back = resumeAt && resumeAt.id === want ? resumeAt : null, si = back ? back.si % list.length : (rot[want] || 0) % list.length, song = list[si];
    cur = deck(a, duck, song, 0); cur.si = si; cur.rot = list.length > 1 ? song.loops : 0; rot[want] = si + 1;
    if (back && back.pos >= song.loopAt) { cur.pos = back.pos - (back.pos - song.loopAt) % song.bar; cur.loops = back.loops || 0; }
    resumeAt = null;
    cur.gv = rampTo(cur.dg.gain, cur.gv, 1, fresh ? 0.3 : XF, a);
    decks.push(cur);
  }
  function tick() {
    try {
      if (!canRun()) { hush(0.1); return; }
      const now = bound.currentTime, until = now + LOOK;
      for (const dk of decks) run(dk, dk.dying ? Math.min(until, dk.killT) : until, now);
      if (cur && cur.handoff && !cur.dying) { cur = handoff(cur); decks.push(cur); run(cur, until, now); } // playlist: next song
      if (jdk) { run(jdk, until, now); if (jdk.done && now >= jdk.endT) endJingle(); }
      if (want && !jBlock && (!cur || cur.song.id !== want)) start();
      if (decks.length > 1 || (decks.length && decks[0].dying)) decks = decks.filter(dk => !dk.dying || now < dk.killT + 0.05); // (no garbage on a normal tick)
      if (!decks.length && !jdk && !want && timer) { clearInterval(timer); timer = 0; }
    } catch (e) { /* optional */ }
  }
  function endJingle() {
    kill(jdk, 0.05); jdk = null;
    if (jAfter !== undefined) { want = jAfter; resumeAt = null; }
    jAfter = undefined; jBlock = false;
    if (duckSt[3] !== 1) duckSt = rampTo(duck.gain, duckSt, 1, 0.4, bound);
    start();
  }
  function play(id) {
    try {
      if (!DEF[id]) return; // unknown ids are ignored
      if (id === want && cur && !jBlock && timer) return; // same track already playing: nothing to do (scenes may call this every frame)
      jAfter = undefined; // a scene's own choice beats a fanfare's planned follow-up
      if (id !== want) { tempoK = 1; inten = 1; if (want && !ACTION.has(want) && want !== 'evolve' && want !== 'victory') hub = want; want = id; }
      sync();
    } catch (e) { /* optional */ }
  }
  function stop(ms) {
    try {
      want = null; jAfter = undefined; resumeAt = null;
      if (cur) { kill(cur, Math.max(0.02, (ms == null ? 400 : +ms || 0) / 1000)); cur = null; }
    } catch (e) { /* optional */ }
  }
  function tempo(k) { tempoK = Math.max(0.5, Math.min(2, +k || 1)); } // resets to 1 when the track changes
  function intensity(k) { const v = k == null ? 1 : +k; inten = v === v ? Math.max(0, Math.min(1, v)) : 1; } // resets to 1 too
  // Fanfares duck the music to 30% and bring it back. After a battle / race / Survival / mini-game track, "victory" and "trophy"
  // lead into the victory loop and "lose" into quiet; "evolved" after the evolve loop returns to the track from before it.
  function jingle(id) {
    try {
      const song = fanfare(id); if (!song) return;
      const ms = performance.now(); if (jdk && jdk.song.id === id && ms - jT < 300) return; // the same fanfare asked for again at once
      const now = cur ? cur.song.id : want;
      let after = jAfter;
      if ((id === 'victory' || id === 'trophy') && ACTION.has(now)) after = 'victory';
      else if (id === 'lose' && ACTION.has(now)) after = null;
      else if (id === 'evolved' && now === 'evolve') after = hub;
      if (!canRun()) { if (after !== undefined) { want = after; jAfter = undefined; } return; } // no stale fanfare later, only its follow-up
      if (jdk) { kill(jdk, 0.03); jdk = null; }
      jAfter = after; jBlock = after !== undefined;
      if (jBlock) { if (cur) { kill(cur, 0.25); cur = null; } }
      else if (cur) duckSt = rampTo(duck.gain, duckSt, DUCK, 0.08, bound);
      jdk = deck(bound, master, song, JINGLE_VOL); jdk.fanfare = true; jT = ms;
      if (!timer) timer = setInterval(tick, TICK);
      tick();
    } catch (e) { /* optional */ }
  }
  S.on(k => {
    if (k === 'suspend') { hush(0.1); return Math.max(0, quietAt - performance.now()); } // ask PX.Sound to pause after the fade
    sync(); // unlock / resume / mute
    // (resume() is async: where the context has no statechange event, look again shortly)
    if ((k === 'unlock' || k === 'resume') && want && !poll && !canRun()) poll = setTimeout(() => { poll = 0; sync(); }, 300);
    return 0;
  });
  document.addEventListener('visibilitychange', sync);

  // ================= voices =================
  // PLANTS chirp, pop and boing. Each plant's call is built from three things:
  //  - its ELEMENT sets the character (TYPE_VOICE): plants pop and boing, fire crackles, water bloops, ice tinkles, electric
  //    buzzes, lasers hum, poison burbles, magic sparkles, rock knocks, robots beep in steps…;
  //  - its HEFT (0 = a little first-stage sprout, 1 = a big final-stage wall: role, stage, a nudge for tough types) makes it
  //    deeper (up to ~1.1 octaves, never growly), longer and rounder, and it hums or bellows instead of chirping;
  //  - a hash of its id picks the exact pitch, shape and details within that, so every plant keeps its own call.
  // ZOMBIES ({ zombie: true }) moan a silly cartoon "braaains": a buzzy voice through vowel filters with a wobble. Bigger zombies
  // are deeper and slower; the giants (Crossbar Hauler-like) add a booming thump; their element adds a flavour (water gurgles, ice
  // shivers, robots beep, fire crackles). One voice at a time; voices follow the sound switch, not the music one.
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return h >>> 0; }
  const ECHO = new WeakMap();
  function echoIn(a) {
    let e = ECHO.get(a); if (e) return e;
    e = a.createGain(); const dl = a.createDelay(1), fb = a.createGain(), wet = a.createGain();
    dl.delayTime.value = 0.17; fb.gain.value = 0.32; wet.gain.value = 0.42;
    e.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(a.destination);
    ECHO.set(a, e); return e;
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function plantOf(id) { try { return (window.PSDATA && PSDATA.PLANTS && PSDATA.PLANTS[id]) || null; } catch (e) { return null; } }
  function zombieOf(id) { try { return (window.PSDATA && PSDATA.ZOMBIES && PSDATA.ZOMBIES[id]) || null; } catch (e) { return null; } }
  const ROLE_SIZE = { support: 0.12, spore: 0.08, shooter: 0.22, zap: 0.25, lobber: 0.38, melee: 0.42, bomb: 0.35, wall: 0.58 };
  const BIG_PLANT = /tall|doom|melon|primal|giga|titan|jumbo|mega|squash|cob|torch|tree|endurian|king/;
  function heftOf(id, st) {
    const P = plantOf(id), el = P ? P.el : '';
    const size = (P && ROLE_SIZE[P.role] != null ? ROLE_SIZE[P.role] : 0.25) + (BIG_PLANT.test(id) ? 0.2 : 0);
    const tb = el === 'rock' || el === 'robot' ? 0.08 : el === 'magic' ? -0.06 : 0;
    return clamp(0.45 * Math.min(1, st / 2) + 0.55 * size + tb, 0, 1);
  }
  function typeOf(id) { const P = plantOf(id); return P ? (P.el === 'normal' && P.el2 ? P.el2 : P.el) || 'normal' : 'normal'; }
  const GRIT = new WeakMap();
  function gritCurve(a) { // soft clipping (made once per context)
    let c = GRIT.get(a); if (c) return c;
    c = new Float32Array(1024); for (let i = 0; i < 1024; i++) c[i] = Math.tanh(2.6 * (i / 511.5 - 1)) / Math.tanh(2.6);
    GRIT.set(a, c); return c;
  }
  // pitch shapes: [time 0-1, pitch x base]; dip = the volume dips between two calls; step = jumps instead of slides (robots)
  const SHAPES = {
    rise: { p: [[0, 0.75], [0.55, 1.3], [1, 1.12]] }, fall: { p: [[0, 1.35], [0.3, 1.22], [1, 0.68]] },
    chirp2: { p: [[0, 0.85], [0.4, 1.3], [0.45, 0.95], [1, 1.42]], dip: [0.38, 0.42, 0.47] }, hop: { p: [[0, 0.9], [0.25, 1.35], [0.6, 1], [1, 1.2]] },
    trill: { p: [[0, 1.05], [1, 0.9]], trill: 1 }, bellow: { p: [[0, 0.8], [0.4, 1.12], [1, 0.62]] },
    zap: { p: [[0, 0.6], [0.08, 1.25], [0.5, 1.15], [1, 0.95]] }, boom: { p: [[0, 0.75], [0.1, 0.62], [0.35, 1.1], [0.75, 0.95], [1, 0.6]] },
    steps: { p: [[0, 1], [0.33, 1.26], [0.66, 0.9]], step: 1 }, hum: { p: [[0, 0.95], [0.5, 1.08], [1, 0.85]] },
    pop: { p: [[0, 0.8], [0.12, 1.45], [0.3, 1.1], [1, 1.2]] }, // a cork-pop up, then a happy hold
    boing: { p: [[0, 0.7], [0.15, 1.35], [0.3, 0.9], [0.45, 1.2], [0.6, 0.95], [0.75, 1.1], [1, 1]] }, // a spring settling
    bloop: { p: [[0, 1.3], [0.2, 0.8], [0.5, 1.15], [1, 0.9]] }, // a bubble
  };
  // the voice of each element (light = small plants, heavy = big ones; values in between follow heft):
  //  L/H shapes it may use · w lead wave light/heavy (p12/p25/p50 pulse, saw, tri, sine) · r/rH second voice pitch ratio · o2 its level
  //  lp tone (lowpass Hz light/heavy), q resonance, sw tone sweep over the call (x at the end) · grit (soft clipping, heavy only)
  //  lfo wobble rate light/heavy ranges [a, b, c, d] · am volume wobble light/heavy · fm pitch wobble light/heavy (cents)
  //  nz breath [filter, Hz, q, level, seconds, crackle] · reg octave shift · drop how much heft deepens it · dk length · vol loudness
  const TYPE_VOICE = {
    normal: { L: ['rise', 'chirp2', 'hop', 'boing'], H: ['bellow', 'boing', 'hum'], w: ['p25', 'tri'], r: [1.012, 1.5, 2], rH: [0.5, 0.995, 0.667], o2: 0.5, lp: [6000, 2200], q: 0.7, sw: 1, grit: 0.3, lfo: [26, 34, 28, 36], am: [0, 0.3], fm: [0, 8], nz: ['bandpass', 1800, 1.1, 1.2, 0.07, 0], reg: 0, drop: 1, dk: 1, vol: 1.3 },
    plant: { L: ['pop', 'rise', 'boing', 'hop'], H: ['bellow', 'boing', 'hum'], w: ['tri', 'p25'], r: [1.5, 1.006], rH: [0.667, 0.5], o2: 0.45, lp: [4800, 2000], q: 0.9, sw: 0.8, grit: 0.3, lfo: [26, 32, 26, 32], am: [0.06, 0.25], fm: [0, 6], nz: ['bandpass', 2200, 0.8, 1.3, 0.18, 0], reg: 0, drop: 1, dk: 1, vol: 1.05 },
    fire: { L: ['rise', 'pop', 'hop'], H: ['bellow', 'boing', 'hum'], w: ['p25', 'saw'], r: [1.008, 1.5], rH: [0.667, 0.5], o2: 0.5, lp: [7000, 2800], q: 0.8, sw: 0.55, grit: 0.4, lfo: [20, 26, 26, 32], am: [0.12, 0.3], fm: [0, 10], nz: ['bandpass', 2800, 0.9, 1.8, 0.3, 1], reg: 0, drop: 1, dk: 1, vol: 0.82 },
    water: { L: ['bloop', 'hop', 'rise'], H: ['boom', 'bloop', 'bellow'], w: ['tri', 'p50'], r: [1.006, 2], rH: [0.5, 0.995], o2: 0.45, lp: [3400, 2600], q: 2.6, sw: 0.32, grit: 0.2, lfo: [9, 12, 14, 18], am: [0, 0.25], fm: [22, 12], nz: ['lowpass', 900, 0.7, 2.2, 0.16, 0], reg: -0.05, drop: 1, dk: 1.05, vol: 1.1 },
    ice: { L: ['rise', 'chirp2', 'fall'], H: ['bellow', 'hum', 'fall'], w: ['tri', 'sine'], r: [2, 3], rH: [0.5, 2], o2: 0.3, lp: [7000, 2400], q: 1, sw: 1, grit: 0, lfo: [6, 7, 5, 6], am: [0, 0.05], fm: [12, 10], nz: ['bandpass', 7000, 1, 1.4, 0.2, 0], reg: 0.1, drop: 0.9, dk: 1.1, vol: 0.95 },
    electric: { L: ['zap', 'hop', 'chirp2'], H: ['zap', 'hum', 'boing'], w: ['p12', 'p25'], r: [1.01, 1.5], rH: [0.5, 1.01], o2: 0.5, lp: [8000, 3600], q: 1.2, sw: 1, grit: 0.4, lfo: [44, 60, 40, 54], am: [0.22, 0.32], fm: [32, 36], nz: ['highpass', 4500, 0.7, 1.2, 0.05, 0], reg: 0.15, drop: 0.9, dk: 0.9, vol: 0.85 },
    laser: { L: ['hum', 'rise', 'zap'], H: ['hum', 'bellow', 'zap'], w: ['tri', 'p25'], r: [1.01, 1.5], rH: [1.01, 0.5], o2: 0.5, lp: [1400, 1000], q: 5, sw: 2.6, grit: 0.2, lfo: [5, 6, 5, 6], am: [0, 0.06], fm: [16, 20], nz: ['bandpass', 2400, 1.5, 0.8, 0.12, 0], reg: 0, drop: 1, dk: 1.1, vol: 1.3 },
    poison: { L: ['trill', 'bloop', 'fall'], H: ['bloop', 'bellow', 'hum'], w: ['p25', 'tri'], r: [1.006, 0.5], rH: [0.5, 0.995], o2: 0.45, lp: [2800, 2000], q: 3, sw: 0.6, grit: 0.3, lfo: [8, 11, 14, 18], am: [0.1, 0.3], fm: [48, 16], nz: ['lowpass', 700, 0.8, 1.8, 0.18, 0], reg: 0, drop: 1, dk: 1, vol: 0.95 },
    magic: { L: ['trill', 'rise', 'chirp2'], H: ['rise', 'bellow', 'hum'], w: ['sine', 'tri'], r: [2, 1.5], rH: [2, 1.5], o2: 0.35, lp: [8000, 5000], q: 0.7, sw: 1, grit: 0, lfo: [10, 12, 8, 10], am: [0, 0], fm: [18, 14], nz: ['highpass', 6500, 0.7, 1.2, 0.12, 0], reg: 0.3, drop: 0.6, dk: 1.05, vol: 0.85, echo: 1 },
    dark: { L: ['hop', 'fall', 'boing'], H: ['hum', 'bellow', 'boing'], w: ['p25', 'tri'], r: [1.008, 0.5], rH: [0.5, 0.995], o2: 0.5, lp: [5000, 2200], q: 1, sw: 0.8, grit: 0.4, lfo: [5, 6.5, 4.5, 5.5], am: [0.1, 0.15], fm: [40, 60], nz: ['bandpass', 3200, 0.6, 1.2, 0.3, 0], reg: -0.05, drop: 1, dk: 1.1, vol: 0.95, echo: 1 },
    rock: { L: ['boing', 'hop', 'pop'], H: ['boing', 'bellow', 'boom'], w: ['p50', 'tri'], r: [1.008, 0.5], rH: [0.5, 0.667], o2: 0.5, lp: [4500, 2000], q: 0.9, sw: 0.85, grit: 0.5, lfo: [28, 36, 28, 36], am: [0.12, 0.3], fm: [0, 6], nz: ['bandpass', 450, 1.5, 2.6, 0.06, 0], reg: -0.1, drop: 1, dk: 1, vol: 1.25 },
    robot: { L: ['steps', 'hop'], H: ['steps', 'hum'], w: ['p50', 'p50'], r: [1.414, 2.76], rH: [1.414, 0.707], o2: 0.4, lp: [5000, 2800], q: 2.5, sw: 1, grit: 0.4, lfo: [30, 40, 30, 40], am: [0.1, 0.3], fm: [0, 6], nz: ['highpass', 3000, 0.7, 1.8, 0.04, 0], reg: 0, drop: 1, dk: 1, vol: 0.7 },
  };
  const mix = (a, b, k) => a + (b - a) * k;
  // the full recipe for one plant call (plain numbers: the dev helpers below check it for every plant)
  function recipe(id, o) {
    o = o || {};
    const key = String(id == null ? '' : id).toLowerCase(), h = hash(key), pitch = +o.pitch > 0 ? +o.pitch : 1;
    const st = clamp(+o.stage || 0, 0, 2), H = heftOf(key, st), heavy = H > 0.6, type = typeOf(key), T = TYPE_VOICE[type] || TYPE_VOICE.normal;
    const pool = heavy ? T.H : T.L, shape = pool[(h >>> 3) % pool.length], ratios = heavy ? T.rH : T.r;
    let hz = (320 + (h % 561) * (1 - 0.45 * H)) * Math.pow(2, T.reg - 1.1 * H * T.drop) * pitch;
    if (hz < 160) hz = 160 - (160 - hz) * 0.55; // (deep voices are squeezed together a little, so they stay audible on small speakers)
    const u = n => ((h >>> n) & 255) / 255; // more of the hash: small per-plant differences in swing, tone and second voice
    const dur = Math.min(1.3, (0.3 + ((h >>> 11) % 30) / 100) * T.dk * (1 + 0.6 * H) * Math.min(1.4, pitch < 1 ? 1 / pitch : 1));
    const lr = heavy ? [T.lfo[2], T.lfo[3]] : [T.lfo[0], T.lfo[1]];
    return { key, type, heft: H, heavy, shape, hz, dur, echo: !!T.echo,
      w1: heavy ? T.w[1] : T.w[0], ratio: ratios[(h >>> 17) % ratios.length], o2: T.o2 * (heavy ? 1.1 : 1) * (0.75 + 0.5 * u(9)), ex: 0.65 + 0.7 * u(13),
      cut: mix(T.lp[0], T.lp[1], H) * (0.78 + 0.44 * u(21)), q: T.q, sweep: T.sw, drive: heavy && T.grit > 0 ? (0.2 + 0.4 * H) * T.grit : 0,
      lfo: mix(lr[0], lr[1], ((h >>> 5) % 100) / 99), am: mix(T.am[0], T.am[1], H), fm: mix(T.fm[0], T.fm[1], H),
      nz: { type: T.nz[0], f: T.nz[1] * (T.nz[1] > 1500 ? 1 - 0.35 * H : 1), q: T.nz[2], lvl: T.nz[3] * (1 + 0.3 * H), dur: T.nz[4] * (1 + 0.6 * H), crackle: !!T.nz[5] },
      pk: 0.03 * (1 + 0.3 * H) * T.vol, att: 0.01 + 0.04 * H };
  }
  function setWave(osc, w, W) { if (w === 'saw') osc.type = 'sawtooth'; else if (w === 'tri') osc.type = 'triangle'; else if (w === 'sine') osc.type = 'sine'; else osc.setPeriodicWave(W[w === 'p12' ? 12 : w === 'p50' ? 50 : 25]); }
  function plantVoice(a, out, t, id, o) {
    const R = recipe(id, o), S = SHAPES[R.shape] || SHAPES.rise, W = waves(a), dur = R.dur, b = R.hz;
    const o1 = a.createOscillator(), o2 = a.createOscillator(), g2 = a.createGain(), lp = a.createBiquadFilter(), am = a.createGain();
    const lfo = a.createOscillator(), la = a.createGain(), lf = a.createGain(), g = a.createGain(), k = a.createGain();
    const nodes = [o1, o2, g2, lp, am, lfo, la, lf, g, k];
    setWave(o1, R.w1, W); setWave(o2, R.w1 === 'tri' || R.w1 === 'sine' ? R.w1 : 'p50', W);
    // pitch: the shape (a trill wobbles quickly; robots jump between notes)
    let p = S.p.map(([at, m]) => [at, 1 + (m - 1) * R.ex]);
    if (S.trill) { const n = Math.max(6, Math.round(dur * 22)); p = [[0, 1.05]]; for (let i = 1; i <= n; i++) p.push([i / n, (1.05 - 0.15 * i / n) * (i % 2 ? 1.12 : 0.92)]); }
    for (const [osc, m] of [[o1, 1], [o2, R.ratio]]) {
      osc.frequency.setValueAtTime(b * p[0][1] * m, t);
      for (let i = 1; i < p.length; i++) { const at = t + dur * p[i][0], f = b * p[i][1] * m; if (S.step) osc.frequency.setValueAtTime(f, at); else osc.frequency.exponentialRampToValueAtTime(f, at); }
    }
    g2.gain.value = R.o2;
    // tone: big plants are rounder; some elements sweep it (water closes like a bubble, lasers open like a "wow")
    lp.type = 'lowpass'; lp.Q.value = R.q; lp.frequency.setValueAtTime(R.cut, t);
    if (R.sweep !== 1) lp.frequency.exponentialRampToValueAtTime(Math.max(120, Math.min(12000, R.cut * R.sweep)), t + dur);
    // one wobble for both volume (buzzes, chitters: am swings between 1 - d and 1) and pitch (gurgles, sparkles: cents)
    lfo.frequency.value = R.lfo; am.gain.value = 1 - R.am / 2; la.gain.value = R.am / 2; lf.gain.value = R.fm;
    lfo.connect(la); la.connect(am.gain); if (R.fm > 0) { lfo.connect(lf); lf.connect(o1.detune); lf.connect(o2.detune); }
    // volume: big ones swell in more slowly; two-part shapes dip between the parts
    const pk = R.pk, G = g.gain;
    G.setValueAtTime(0, t); G.linearRampToValueAtTime(pk, t + R.att);
    if (S.dip) { G.linearRampToValueAtTime(pk * 0.85, t + dur * S.dip[0]); G.linearRampToValueAtTime(pk * 0.06, t + dur * S.dip[1]); G.linearRampToValueAtTime(pk, t + dur * S.dip[2]); }
    G.linearRampToValueAtTime(pk * 0.75, t + dur * 0.8); G.linearRampToValueAtTime(0, t + dur);
    // the breath: a leafy rustle, splash, crackle, tinkle, zap or knock, by element
    const n = a.createBufferSource(), nf = a.createBiquadFilter(), ng = a.createGain(), nd = R.nz.dur;
    n.buffer = W.noise; n.loop = nd > 0.45; nf.type = R.nz.type; nf.frequency.value = R.nz.f; nf.Q.value = R.nz.q;
    ng.gain.setValueAtTime(pk * R.nz.lvl, t); ng.gain.linearRampToValueAtTime(0, t + nd);
    nodes.push(n, nf, ng); n.connect(nf); nf.connect(ng);
    if (R.nz.crackle) { const cr = a.createGain(), lc = a.createGain(); cr.gain.value = 0.4; lc.gain.value = 0.6; lfo.connect(lc); lc.connect(cr.gain); ng.connect(cr); cr.connect(k); nodes.push(cr, lc); }
    else ng.connect(k);
    // wiring: voices -> (a little warmth, for big tough ones) -> tone -> wobble -> volume
    o2.connect(g2);
    if (R.drive > 0) { const dr = a.createGain(), sh = a.createWaveShaper(); dr.gain.value = R.drive; sh.curve = gritCurve(a); o1.connect(dr); g2.connect(dr); dr.connect(sh); sh.connect(lp); nodes.push(dr, sh); }
    else { o1.connect(lp); g2.connect(lp); }
    lp.connect(am); am.connect(g); g.connect(k); k.connect(out);
    if (R.echo) k.connect(echoIn(a));
    const tEnd = t + Math.max(dur, nd); // (o1 is watched for the unplug, so it stops last: the breath is never cut off mid-sample)
    o1.start(t); o2.start(t); lfo.start(t); n.start(t); o1.stop(tEnd + 0.04); o2.stop(t + dur + 0.03); lfo.stop(tEnd + 0.03); n.stop(t + nd + 0.01);
    return { k, srcs: [o1, o2, n, lfo], nodes, end: t + Math.max(dur, nd), dur, heft: R.heft, hz: b, R };
  }

  // ---- zombie moans ----
  const ZGIANT = /gargantuar|zomboss|giga|robot|mecha|zomboni|excavator|king|bullrider|tombraiser|discotron|troglobite|dodorider/;
  const ZBIG = /yeti|football|camel|bobsled|shieldbot|brickhead|caveman|barrelroller|knight|bully|octo|jester|wizard/;
  const ZSMALL = /imp|chicken|seagull|bugbot|weasel|eightbit|gnome|baby|tiny|mini/;
  // contours: pitch x base over the moan; dip = a little break ("brains... brains")
  const ZSHAPE = {
    moan: { p: [[0, 0.92], [0.25, 1.12], [0.65, 1], [1, 0.78]] },
    huh: { p: [[0, 0.95], [0.5, 0.86], [0.7, 0.95], [1, 1.32]] }, // "uhhh-huh?"
    brains2: { p: [[0, 0.9], [0.2, 1.15], [0.42, 0.95], [0.5, 1.05], [0.7, 1.12], [1, 0.8]], dip: [0.4, 0.45, 0.5] },
    yawn: { p: [[0, 0.85], [0.3, 1.28], [1, 0.72]] },
    hum: { p: [[0, 1], [0.5, 1.06], [1, 0.9]] },
  };
  const VOWEL = { aa: [760, 1150], oo: [380, 820], eh: [560, 1700], uh: [620, 1100] };
  function zrecipe(id, o) {
    o = o || {};
    const key = String(id == null ? '' : id).toLowerCase(), h = hash('z:' + key), pitch = +o.pitch > 0 ? +o.pitch : 1, Z = zombieOf(key);
    const els = Z && Z.el ? [].concat(Z.el) : ['normal'], has = e => els.indexOf(e) >= 0, u = n => ((h >>> n) & 255) / 255;
    const size = ZGIANT.test(key) ? 'giant' : ZBIG.test(key) ? 'big' : ZSMALL.test(key) ? 'small' : 'mid';
    const pool = size === 'giant' ? ['moan', 'yawn'] : size === 'small' ? ['huh', 'brains2', 'moan', 'hum'] : ['moan', 'brains2', 'huh', 'yawn', 'hum'];
    const shape = pool[(h >>> 3) % pool.length], vw = ['aa', 'aa', 'oo', 'eh', 'uh'][(h >>> 7) % 5];
    const base = { giant: 82, big: 120, mid: 150, small: 270 }[size] * (0.88 + 0.28 * u(11)) * (has('magic') ? 1.12 : 1) * pitch;
    const fK = { giant: 0.82, big: 0.92, mid: 1, small: 1.22 }[size];
    const dur = Math.min(1.4, ({ giant: 0.95, big: 0.75, mid: 0.6, small: 0.42 }[size] + 0.25 * u(15)) * Math.min(1.4, pitch < 1 ? 1 / pitch : 1));
    return { key, size, shape, vowel: vw, hz: base, dur, f1: VOWEL[vw][0] * fK, f2: VOWEL[vw][1] * fK,
      wave: has('robot') ? 'p50' : 'saw', step: has('robot'), vibR: has('ice') ? 11 : 4.5 + 3 * u(19), vibC: has('ice') ? 45 : has('water') ? 70 : 22 + 30 * u(23),
      gurgle: has('water'), crackle: has('fire'), boom: size === 'giant', ex: 0.75 + 0.5 * u(27),
      pk: { giant: 0.07, big: 0.1, mid: 0.095, small: 0.09 }[size], att: size === 'giant' ? 0.07 : 0.035 };
  }
  function zombieVoice(a, out, t, id, o) {
    const R = zrecipe(id, o), Sh = ZSHAPE[R.shape] || ZSHAPE.moan, W = waves(a), dur = R.dur, b = R.hz;
    const o1 = a.createOscillator(), lfo = a.createOscillator(), lf = a.createGain();
    const f1 = a.createBiquadFilter(), f2 = a.createBiquadFilter(), g1 = a.createGain(), g2 = a.createGain(), lp = a.createBiquadFilter(), g = a.createGain(), k = a.createGain();
    const nodes = [o1, lfo, lf, f1, f2, g1, g2, lp, g, k], srcs = [o1, lfo];
    if (R.wave === 'saw') o1.type = 'sawtooth'; else o1.setPeriodicWave(W[50]);
    const p = Sh.p.map(([at, m]) => [at, 1 + (m - 1) * R.ex]);
    o1.frequency.setValueAtTime(b * p[0][1], t);
    for (let i = 1; i < p.length; i++) { const at = t + dur * p[i][0], f = b * p[i][1]; if (R.step) o1.frequency.setValueAtTime(f, at); else o1.frequency.exponentialRampToValueAtTime(f, at); }
    // the silly wobble (water zombies gurgle, ice ones shiver)
    lfo.frequency.value = R.gurgle ? 13 : R.vibR; lf.gain.value = R.vibC; lfo.connect(lf); lf.connect(o1.detune);
    // the vowel: "aah" closing towards "uh" (two resonances), the second one quieter
    f1.type = 'bandpass'; f1.Q.value = 2.6; f1.frequency.setValueAtTime(R.f1, t); f1.frequency.linearRampToValueAtTime(R.f1 * 0.72, t + dur);
    f2.type = 'bandpass'; f2.Q.value = 4; f2.frequency.value = R.f2; g1.gain.value = 1; g2.gain.value = 0.55;
    lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 0.5;
    o1.connect(f1); o1.connect(f2); f1.connect(g1); f2.connect(g2); g1.connect(lp); g2.connect(lp); lp.connect(g); g.connect(k); k.connect(out);
    const pk = R.pk, G = g.gain;
    G.setValueAtTime(0, t); G.linearRampToValueAtTime(pk, t + R.att);
    if (Sh.dip) { G.linearRampToValueAtTime(pk * 0.85, t + dur * Sh.dip[0]); G.linearRampToValueAtTime(pk * 0.08, t + dur * Sh.dip[1]); G.linearRampToValueAtTime(pk, t + dur * Sh.dip[2]); }
    G.linearRampToValueAtTime(pk * 0.8, t + dur * 0.8); G.linearRampToValueAtTime(0, t + dur);
    // giants: a soft sub-octave hum and a booming footstep thump under the moan
    if (R.boom) {
      const sub = a.createOscillator(), sg = a.createGain(); sub.type = 'sine'; sub.frequency.setValueAtTime(b * 0.5, t); sub.frequency.exponentialRampToValueAtTime(b * 0.4, t + dur);
      sg.gain.setValueAtTime(0, t); sg.gain.linearRampToValueAtTime(pk * 1.1, t + 0.08); sg.gain.linearRampToValueAtTime(0, t + dur);
      sub.connect(sg); sg.connect(k); sub.start(t); sub.stop(t + dur + 0.03); nodes.push(sub, sg); srcs.push(sub);
    }
    // the breath: a giant's thump, a fire zombie's crackle, else the little "-ns" hiss at the end of "brains"
    const n = a.createBufferSource(), nf = a.createBiquadFilter(), ng = a.createGain();
    n.buffer = W.noise; n.loop = true;
    const nt = R.boom ? t : R.crackle ? t : t + dur * 0.82, nd = R.boom ? 0.3 : R.crackle ? dur : 0.14;
    nf.type = R.boom ? 'lowpass' : 'bandpass'; nf.frequency.value = R.boom ? 160 : R.crackle ? 2600 : 5200; nf.Q.value = R.boom ? 0.7 : 1;
    const nl = R.boom ? pk * 1.6 : R.crackle ? pk * 0.6 : pk * 0.5;
    ng.gain.setValueAtTime(0, t); ng.gain.setValueAtTime(0, nt); ng.gain.linearRampToValueAtTime(nl, nt + 0.01); ng.gain.linearRampToValueAtTime(0, nt + nd);
    if (R.crackle) { const cr = a.createGain(), lc = a.createGain(); cr.gain.value = 0.4; lc.gain.value = 0.6; lfo.connect(lc); lc.connect(cr.gain); ng.connect(cr); cr.connect(k); nodes.push(cr, lc); }
    else ng.connect(k);
    n.connect(nf); nf.connect(ng); nodes.push(n, nf, ng); srcs.push(n);
    const tEnd = Math.max(t + dur, nt + nd); // (o1 is watched for the unplug, so it stops last)
    o1.start(t); lfo.start(t); n.start(t); o1.stop(tEnd + 0.04); lfo.stop(tEnd + 0.03); n.stop(tEnd + 0.02);
    return { k, srcs, nodes, end: Math.max(t + dur, nt + nd), dur, hz: b, R };
  }
  let crying = null;
  const Cry = {
    play(id, o) {
      try {
        if (!S.allow()) return; // muted, page hidden, audio paused or too many sounds at once
        const a = S.ctx; if (!a) return;
        const t = a.currentTime + 0.01;
        if (crying && crying.end > t) { // one voice at a time: the old one fades in 20 ms
          const K = crying.k.gain; K.setValueAtTime(1, t); K.linearRampToValueAtTime(0, t + 0.02);
          for (const s of crying.srcs) { try { s.stop(t + 0.03); } catch (e) { /* ended */ } }
        }
        crying = (o && o.zombie ? zombieVoice : plantVoice)(a, a.destination, t, id, o);
        S.unplug(crying.srcs[0], crying.nodes);
      } catch (e) { /* voices are optional */ }
    },
  };

  // ================= test helpers (dev only: render offline and measure) =================
  function stats(x, sr, seams, cols) {
    let pk = 0, ss = 0, nan = 0, last = 0;
    for (let i = 0; i < x.length; i++) { const v = x[i]; if (v !== v) { nan++; continue; } const av = v < 0 ? -v : v; if (av > pk) pk = av; ss += v * v; if (av > 1e-4) last = i; }
    const W = Math.round(sr * 0.02), jumps = [], big = i0 => { let m = 0; for (let i = Math.max(1, i0); i < Math.min(x.length, i0 + W); i++) { const d = Math.abs(x[i] - x[i - 1]); if (d > m) m = d; } return m; };
    for (let s = 1; s + W < x.length; s += W) jumps.push(big(s));
    const q = jumps.slice().sort((u, v) => u - v), at = f => q[Math.min(q.length - 1, Math.floor(f * q.length))] || 0, r = v => +v.toFixed(4);
    const out = { peak: r(pk), rms: r(Math.sqrt(ss / x.length)), nan, end: +(last / sr).toFixed(2), jumpMed: r(at(0.5)), jumpP99: r(at(0.99)), jumpMax: r(at(1)),
      seam: (seams || []).map(t => r(big(Math.round((t - 0.01) * sr)))) };
    if (cols) { out.env = []; const n = x.length / cols; for (let c = 0; c < cols; c++) { let lo = 0, hi = 0; for (let i = Math.floor(c * n); i < Math.floor((c + 1) * n); i++) { if (x[i] < lo) lo = x[i]; if (x[i] > hi) hi = x[i]; } out.env.push([r(lo), r(hi)]); } }
    return out;
  }
  function offline(secs, sr, build, keep) {
    const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const a = new OC(1, Math.ceil(sr * secs), sr), info = build(a) || {};
    return a.startRendering().then(buf => { const x = buf.getChannelData(0); return Object.assign(info, stats(x, sr, info.seamsAt, info.cols), keep ? { pcm: x } : {}); });
  }
  // id: 'garden-day' (its first song), 'garden-day#1' (its second song) or 'j:victory'. chain = true plays the whole playlist through
  // its hand-overs (each song's intro and one loop, then the next) and measures those seams too; default length = to just past
  // the first loop seam (or through the whole chain and into the first song again). keep = also return the samples (pcm).
  function render(id, secs, sr, cols, chain, keep) {
    id = String(id);
    const isJ = /^j:/.test(id), tid = id.replace(/^j:/, '').split('#')[0], list = isJ ? null : playlist(tid);
    if (!isJ && !list && J[tid]) return render('j:' + tid, secs, sr, cols, false, keep);
    const si = list ? (+id.split('#')[1] || 0) % list.length : 0, song = isJ ? fanfare(tid) : list && list[si];
    if (!song) return Promise.resolve(null);
    const span = s => s.len * s.sd, many = !!chain && list && list.length > 1;
    sr = sr || 44100; secs = secs || (many ? list.reduce((a, s) => a + span(s), 0) + 2.5 : span(song) + (isJ ? 0.4 : 2.5));
    return offline(secs, sr, a => {
      const m = a.createGain(); m.gain.value = MUSIC_VOL * (isJ ? JINGLE_VOL : 1); m.connect(a.destination);
      let dk = deck(a, m, song, 1, true); dk.fanfare = isJ; dk.next = 0.02; dk.si = si;
      const seamsAt = [], names = [song.name]; let nodes = dk.nodes;
      if (many) {
        dk.rot = 1;
        for (let k = 0; k < 24; k++) { run(dk, secs, 0); if (!dk.handoff) break; seamsAt.push(dk.endT); dk = handoff(dk, 1); names.push(dk.song.name); nodes = Math.max(nodes, dk.nodes); }
      } else {
        run(dk, secs, 0);
        const L = (song.len - song.loopAt) * song.sd;
        if (song.loopAt >= 0) for (let t = 0.02 + song.len * song.sd; t < secs - 0.05; t += L) seamsAt.push(t);
      }
      return { id, name: names.join(' > '), secs: +secs.toFixed(2), loopSec: song.loopAt >= 0 ? +((song.len - song.loopAt) * song.sd).toFixed(2) : 0,
        steps: song.len, nodesPerDeck: nodes, seamsAt, cols };
    }, keep).then(r => { delete r.cols; r.seamsAt = r.seamsAt.map(t => +t.toFixed(2)); return r; });
  }
  const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  PX.Music = {
    play, stop, tempo, intensity, jingle,
    get muted() { return mOff; },
    set muted(v) { mOff = !!v; try { localStorage.setItem(KEY, mOff ? '0' : '1'); } catch (e) { /* this session only */ } sync(); },
    get current() { return want; },
    tracks: Object.keys(DEF), jingles: Object.keys(J),
    get songs() { const o = {}; for (const id in DEF) o[id] = [].concat(DEF[id]).map(d => d.name || id); return o; }, // id -> song names
    // dev: every song's name, sounding key (major, or its relative minor when written in A minor) and tempo
    _list() { const o = {}; for (const id in DEF) o[id] = [].concat(DEF[id]).map(d => { const k = ((d.key || 0) % 12 + 12) % 12, minor = /^\s*(Am|Dm|Em)\b/.test((d.S && d.S.A && d.S.A.chords) || ''); return d.name + ' — ' + (minor ? KEYS[(k + 9) % 12] + ' minor' : KEYS[k] + ' major') + ', ' + d.bpm + ' bpm' + (d.swing ? ' (swing)' : ''); }); return o; },
    _check() { for (const id in DEF) playlist(id); for (const id in J) fanfare(id); return warn.slice(); },
    _debug: () => ({ want, cur: cur && cur.song.id, song: cur && cur.song.name, si: cur ? cur.si : -1, loops: cur ? cur.loops : 0, decks: decks.length, alive,
      nodesPerDeck: cur ? cur.nodes : 0, jingle: jdk && jdk.song.id, after: jAfter === undefined ? '-' : jAfter, timer: !!timer, tempo: tempoK, intensity: inten,
      running: canRun(), duck: duckSt[3], warn: warn.length }),
    _render: render,
    _rot: n => { if (cur) cur.rot = n; return !!cur; }, // (dev: hand over to the next song after n loops of this one)
    _song: id => (/^j:/.test(id) ? fanfare(id.slice(2)) : (playlist(id.split('#')[0]) || [])[+(id.split('#')[1] || 0)] || fanfare(id)),
  };
  Cry._render = (id, o) => offline(2.4, 44100, a => { const v = (o && o.zombie ? zombieVoice : plantVoice)(a, a.destination, 0.02, id, o); return { id: String(id), type: v.R.type || v.R.size, shape: v.R.shape, dur: +v.dur.toFixed(2), heft: v.heft != null ? +v.heft.toFixed(2) : undefined, hz: Math.round(v.hz) }; });
  Cry._recipe = (id, o) => (o && o.zombie ? zrecipe(id, o) : recipe(id, o));
  PX.Cry = Cry;
})();
