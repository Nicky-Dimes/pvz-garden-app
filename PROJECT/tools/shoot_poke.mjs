#!/usr/bin/env node
// shoot_poke.mjs — dev tool (never part of the game): drives a headless Chrome over the DevTools protocol to take screenshots of
// Poké Garden and run scripted taps, so a review can look at every screen without anyone's browser.
//   node tools/shoot_poke.mjs <plan.json>
// plan.json:
//   { "url": "http://127.0.0.1:8772/?save=shots",          the game (the local preview server, port 8772)
//     "w": 1180, "h": 820, "dpr": 1,                         viewport (iPad Air landscape = 1180 x 820; portrait = 820 x 1180)
//     "out": "/abs/dir",                                     where screenshots go (made if missing)
//     "seed": { "pkmn:save:v1:shots": "@/abs/save.json" },   localStorage to set before the game loads ("@file" = file contents)
//     "init": "js code",                                     optional: runs before the page's own scripts (e.g. a drawImage guard)
//     "steps": [ ... ] }
// steps (run in order):
//   {"wait": ms}                     pause
//   {"js": "code"}                   run in the page (awaited; the result is printed)
//   {"go": "battle"}                 tap a bottom-nav tab (garden, race, battle, explore, shop, sprouts)
//   {"click": "css selector"}        click the first matching element (its centre)
//   {"text": "Buy"}                  click the first visible button / link / [role=button] whose text contains this
//   {"tap": [x, y]}                  mouse click at viewport coordinates
//   {"drag": [[x1, y1], [x2, y2]]}   press, move in steps, release
//   {"shot": "name.png"}             screenshot into "out"
//   {"cdp": ["Method", {params}]}    send a DevTools command, e.g. ["Emulation.setCPUThrottlingRate", {"rate": 4}] (a slower phone)
//   {"cast": "name", "ms": 2000}     record the screen as it plays (every frame the browser draws) into out/name-000.png ...,
//                                    with name-times.json (ms since the first frame); "scale": 0.5 records smaller frames
//   {"touch": [[x, y], ...], "ms": 250}  one finger (needs "touch": true in the plan): down at the first point, through the rest
//                                    over "ms", then up; a string instead of the list is page code that returns the list
// Console errors and uncaught exceptions from the page are printed at the end.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const planFile = process.argv[2];
if (!planFile) { console.error('usage: node tools/shoot_poke.mjs <plan.json>'); process.exit(2); }
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
const W = plan.w || 1180, H = plan.h || 820, DPR = plan.dpr || 1, OUT = plan.out || path.join(path.dirname(path.resolve(planFile)), 'shots');
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const port = 9300 + Math.floor(Math.random() * 500);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pkshoot-'));
const chrome = spawn(CHROME, ['--headless', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
  '--hide-scrollbars', '--mute-audio', '--autoplay-policy=no-user-gesture-required', `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
let done = false;
function finish(code) {
  if (done) return; done = true;
  try { chrome.kill('SIGKILL'); } catch (e) { /* gone */ }
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* temp */ }
  process.exit(code);
}
const killer = setTimeout(() => { console.error('timed out (plan.timeout ms)'); finish(3); }, plan.timeout || 180000);

async function target() {
  for (let i = 0; i < 100; i++) {
    try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const p = l.find(t => t.type === 'page'); if (p) return p; } catch (e) { /* starting */ }
    await sleep(150);
  }
  throw new Error('Chrome did not start');
}
const errors = [];
async function main() {
  const t = await target();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const waiting = new Map(), listeners = [];
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && waiting.has(m.id)) { const w = waiting.get(m.id); waiting.delete(m.id); m.error ? w.rej(new Error(m.error.message)) : w.res(m.result); }
    else if (m.method) for (const f of listeners) f(m);
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; waiting.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  listeners.push(m => {
    if (m.method === 'Runtime.exceptionThrown') errors.push('exception: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('console.error: ' + m.params.args.map(a => a.value ?? a.description ?? '').join(' '));
  });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: false });
  if (plan.touch) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }); // fingers, not a mouse
  if (plan.init) await send('Page.addScriptToEvaluateOnNewDocument', { source: plan.init }); // optional: runs before the page's own scripts
  if (plan.seed) {
    const seed = {};
    for (const [k, v] of Object.entries(plan.seed)) seed[k] = typeof v === 'string' && v.startsWith('@') ? fs.readFileSync(v.slice(1), 'utf8') : (typeof v === 'string' ? v : JSON.stringify(v));
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `try { if (!sessionStorage.getItem('__pkseed')) { const s = ${JSON.stringify(seed)}; for (const k in s) localStorage.setItem(k, s[k]); sessionStorage.setItem('__pkseed', '1'); } } catch (e) {}` });
  }
  const evalJs = async code => {
    const r = await send('Runtime.evaluate', { expression: `(async () => { ${/\breturn\b/.test(code) ? code : 'return (' + code + ')'} })()`, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  await send('Page.navigate', { url: plan.url || 'http://127.0.0.1:8772/?save=shots' });
  for (let i = 0; i < 80; i++) { await sleep(250); try { if (await evalJs("!!(window.PS && PS.ui && !document.getElementById('bootSplash'))")) break; } catch (e) { /* loading */ } }
  await sleep(plan.settle || 1500);
  const mouse = async (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, pointerType: 'mouse' });
  const tap = async (x, y) => { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); await mouse('mousePressed', x, y); await sleep(40); await mouse('mouseReleased', x, y); };
  const centreOf = async sel => evalJs(`return (() => { const el = ${sel}; if (!el) return null; el.scrollIntoView({ block: 'nearest' }); const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
  for (const s of plan.steps || []) {
    try {
      if (s.wait != null) await sleep(s.wait);
      else if (s.js) { const v = await evalJs(s.js); if (v !== undefined) console.log('js →', typeof v === 'string' ? v : JSON.stringify(v)); }
      else if (s.go) { const c = await centreOf(`document.querySelector('#nav [data-go="${s.go}"]')`); if (!c) throw new Error('no nav tab ' + s.go); await tap(c[0], c[1]); await sleep(s.after ?? 900); }
      else if (s.click) { const c = await centreOf(`document.querySelector(${JSON.stringify(s.click)})`); if (!c) throw new Error('nothing matches ' + s.click); await tap(c[0], c[1]); await sleep(s.after ?? 600); }
      else if (s.text) {
        const c = await centreOf(`[...document.querySelectorAll('button, a, [role=button], .btn, [data-act]')].find(e => e.offsetParent !== null && (e.textContent || '').replace(/\\s+/g, ' ').toLowerCase().includes(${JSON.stringify(String(s.text).toLowerCase())}))`);
        if (!c) throw new Error('no visible button with text ' + s.text); await tap(c[0], c[1]); await sleep(s.after ?? 600);
      }
      else if (s.tap) { await tap(s.tap[0], s.tap[1]); await sleep(s.after ?? 500); }
      else if (s.drag) {
        const [[x1, y1], [x2, y2]] = s.drag; await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x1, y: y1 }); await mouse('mousePressed', x1, y1);
        for (let i = 1; i <= 12; i++) { await sleep(25); await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x1 + (x2 - x1) * i / 12, y: y1 + (y2 - y1) * i / 12, buttons: 1, button: 'left' }); }
        await mouse('mouseReleased', x2, y2); await sleep(s.after ?? 500);
      }
      else if (s.cast) {
        const frames = [], onFrame = m => {
          if (m.method !== 'Page.screencastFrame') return;
          frames.push({ data: m.params.data, ts: m.params.metadata.timestamp });
          send('Page.screencastFrameAck', { sessionId: m.params.sessionId }).catch(() => {});
        };
        listeners.push(onFrame);
        const k = s.scale || 1;
        await send('Page.startScreencast', { format: 'png', maxWidth: Math.round(W * DPR * k), maxHeight: Math.round(H * DPR * k), everyNthFrame: 1 });
        await sleep(s.ms ?? 2000);
        await send('Page.stopScreencast'); listeners.splice(listeners.indexOf(onFrame), 1);
        const t0 = frames.length ? frames[0].ts : 0;
        frames.forEach((f, i) => fs.writeFileSync(path.join(OUT, `${s.cast}-${String(i).padStart(3, '0')}.png`), Buffer.from(f.data, 'base64')));
        fs.writeFileSync(path.join(OUT, `${s.cast}-times.json`), JSON.stringify(frames.map(f => Math.round((f.ts - t0) * 1000))));
        console.log(`cast → ${frames.length} frames in ${OUT}/${s.cast}-*.png`);
      }
      else if (s.cdp) { // ("save": "name.json" writes the whole answer into "out", e.g. a Profiler.stop profile)
        const v = await send(s.cdp[0], s.cdp[1] || {});
        if (s.save) { const f = path.join(OUT, s.save); fs.writeFileSync(f, JSON.stringify(v)); console.log('cdp →', f); }
        else if (v && Object.keys(v).length) console.log('cdp →', JSON.stringify(v).slice(0, 300));
      }
      else if (s.touch) {
        const pts = typeof s.touch === 'string' ? await evalJs(s.touch) : s.touch;
        if (!Array.isArray(pts) || !pts.length) throw new Error('touch: no points');
        const n = Math.max(1, pts.length - 1), gap = (s.ms ?? 250) / n, at = p => [{ x: p[0], y: p[1], id: 1, radiusX: 6, radiusY: 6, force: 1 }];
        await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(pts[0]) });
        for (let i = 1; i < pts.length; i++) { await sleep(gap); await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(pts[i]) }); }
        await sleep(30); await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(s.after ?? 400);
      }
      else if (s.shot) { const r = await send('Page.captureScreenshot', { format: 'png' }); const f = path.join(OUT, s.shot); fs.writeFileSync(f, Buffer.from(r.data, 'base64')); console.log('shot →', f); }
    } catch (e) { console.log('step failed', JSON.stringify(s), '→', e.message); if (plan.stopOnError) break; }
  }
  if (errors.length) { console.log('\nPage errors:'); for (const e of [...new Set(errors)].slice(0, 30)) console.log('  ' + e.slice(0, 400)); } else console.log('\nNo page errors.');
  ws.close();
}
main().then(() => { clearTimeout(killer); finish(0); }, e => { console.error(e.message); clearTimeout(killer); finish(1); });
