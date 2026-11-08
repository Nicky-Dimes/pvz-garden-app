// app.js — PVZ Garden shell: screen switching, HUD, one shared animation loop, modals, toasts, sprout picker, dev tools.
//
// SCENE CONTRACT: each screen module registers
//   PS.scenes.<name> = { mount(rootEl), show(params), hide(), frame(dt, t) }
// mount() runs once, the first time the screen is shown. frame() runs every animation frame while the screen is visible.
// Full-screen play (a race or battle in progress) calls PS.ui.chrome(false) to hide the HUD and nav, and PS.ui.hold(true)
// so evolution/egg pop-ups wait; call chrome(true) and hold(false) when the player is back on a menu.
(function () {
  'use strict';
  const { D, state } = PS;
  const $ = id => document.getElementById(id);
  PS.scenes = PS.scenes || {};
  let current = null, mounted = {}, t = 0;

  // ---------------- tiny pixel icons for the chrome ----------------
  function icon(kind) {
    const G = PX.Grid;
    const g = new G(16, 16);
    switch (kind) {
      case 'garden': { // a sunflower in the lawn
        g.rect(7, 9, 2, 6, '#3f8a3a'); g.ell(5, 12.5, 2.4, 1.1, ['#a6ec70', '#5cb43a', '#2f7a4a'], 0.5); g.ell(11, 12.5, 2.4, 1.1, ['#a6ec70', '#5cb43a', '#2f7a4a'], -0.5);
        for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; g.ell(8 + Math.cos(a) * 4, 6 + Math.sin(a) * 4, 1.6, 1, ['#fff27a', '#f6c83a', '#c7861c'], a); }
        g.ell(8, 6, 2.6, 2.6, ['#f6d6a6', '#e2a866', '#a8683a']); g.outline(); g.px([[7, 5], [9, 5]], '#222034'); g.px([[7, 7], [8, 8], [9, 7]], '#222034'); break;
      }
      case 'race': g.rect(3, 1, 1, 14, '#595a70'); g.rect(4, 2, 9, 7, '#ffffff'); for (let y = 0; y < 7; y++) for (let x = 0; x < 9; x++) if ((x + y) % 2) g.set(4 + x, 2 + y, '#222034'); g.outline(); break;
      case 'battle': { // a goofy zombie head
        g.ell(8, 8.5, 6, 6, ['#d8e8b8', '#8fa872', '#5a6e48']); g.rect(4, 2, 2, 2, '#5a6e48'); g.outline();
        g.ell(5.5, 7.5, 1.8, 1.8, '#ffffff'); g.ell(10.5, 8, 1.3, 1.3, '#ffffff'); g.px([[6, 8], [10, 8]], '#222034');
        g.px([[5, 11], [6, 12], [7, 12], [8, 12], [9, 12], [10, 11]], '#222034'); g.set(8, 11, '#ffffff'); break;
      }
      case 'shop': return PX.item('egg', 'normal:peashooter');
      case 'sprouts': { // the almanac: a green book with a leaf
        g.rect(2, 2, 12, 12, '#5cb43a'); g.rect(2, 2, 2, 12, '#2f7a4a'); g.rect(13, 3, 1, 10, '#fbf0cc'); g.outline();
        g.ell(9, 8, 3, 1.6, ['#d8f8a8', '#a6ec70', '#5cb43a'], -0.7); g.px([[7, 10], [8, 9], [9, 8], [10, 7]], '#2f7a4a'); g.px([[5, 3], [5, 12]], '#a6ec70'); break;
      }
      case 'aquarium': { // a round fish bowl with a little clownfish
        g.ell(8, 9, 6.6, 5.8, ['#e2f6ff', '#9ad8f2', '#5aa6d6']); g.ell(8, 13.6, 4.6, 1.3, ['#fff4d0', '#f2dca0', '#d8bc78']); g.ell(8, 3.9, 4.2, 1.1, ['#ffffff', '#eef8ff', '#c4def0']);
        g.poly([[5.2, 9.6], [3.8, 8], [3.8, 11.2]], '#ff9a4a'); g.ell(8.6, 9.6, 2.9, 1.9, ['#ffd2a6', '#ff8c3c', '#de6626']); g.outline();
        g.px([[8, 8], [8, 9], [8, 10], [8, 11]], '#ffffff'); g.set(10, 9, '#222034'); g.set(5, 6, '#ffffff'); g.set(4, 7, '#ffffff'); break;
      }
      case 'arcade': { // a little arcade cabinet with a pea on its screen, a joystick and a button
        g.rect(3, 1, 10, 13, '#8a5ad0'); g.rect(3, 1, 10, 3, '#ffd23a'); g.rect(4, 5, 8, 4, '#2a2140'); g.rect(2, 10, 12, 2, '#b08ae8'); g.rect(4, 14, 8, 1, '#5a3a9a'); g.outline();
        g.ell(8, 7, 1.6, 1.4, ['#d8f8a8', '#7cc94a', '#3f8a3a']); g.set(9, 6, '#ffffff'); g.px([[5, 2], [7, 2], [9, 2], [11, 2]], '#fff6c8');
        g.rect(5, 9, 1, 2, '#3a2d34'); g.ell(5.5, 9, 1.2, 1.1, ['#ff9ea6', '#e04848', '#962b36']); g.ell(10.5, 10.5, 1.1, 0.8, ['#fff27a', '#f6c83a', '#c7861c']); break;
      }
      case 'trophy': { // a gold cup
        g.ell(8, 5, 4.6, 4, ['#fff6b0', '#f6c83a', '#c7861c']); g.rect(3, 1, 10, 2, '#f6c83a'); g.rect(7, 9, 2, 3, '#c7861c'); g.rect(4, 12, 8, 3, '#8a6234');
        g.ell(2.6, 5, 1.6, 2.2, null); g.outline(); g.px([[5, 3], [5, 4], [6, 5]], '#ffffff'); g.rect(6, 13, 4, 1, '#ffd23a'); break;
      }
      case 'music': case 'nomusic': { // a pair of music notes, or crossed out
        const c = new G(13, 11); c.rect(3, 2, 1, 7, '#dfe8fb'); c.rect(9, 1, 1, 7, '#dfe8fb'); c.rect(3, 1, 7, 2, '#dfe8fb'); c.ell(2.2, 8.6, 1.8, 1.4, '#dfe8fb'); c.ell(8.2, 7.6, 1.8, 1.4, '#dfe8fb'); c.outline();
        if (kind === 'nomusic') c.px([[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9], [10, 10], [2, 1], [3, 2], [4, 3], [5, 4], [6, 5], [7, 6], [8, 7], [9, 8], [10, 9], [11, 10]], '#d24552');
        return c.canvas();
      }
      case 'coin': { const c = new G(9, 9); c.ell(4.5, 4.5, 4, 4, ['#fff27a', '#f6c83a', '#c7861c']); c.px([[4, 2], [4, 3], [4, 4], [4, 5], [4, 6]], '#c7861c'); c.px([[3, 2]], '#ffffff'); return c.canvas(); }
      case 'sun': { const c = new G(9, 9); c.ell(4.5, 4.5, 3, 3, '#f6c83a'); c.px([[4, 0], [4, 8], [0, 4], [8, 4], [1, 1], [7, 1], [1, 7], [7, 7]], '#f6c83a'); return c.canvas(); }
      case 'moon': { const c = new G(9, 9); c.ell(4.5, 4.5, 3.8, 3.8, '#c9a2f0'); c.ell(6, 3.5, 3, 3, null); c.outline(); return c.canvas(); }
      case 'sound': case 'mute': { // a little speaker, with sound waves or a cross
        const c = new G(13, 11); c.rect(1, 4, 3, 3, '#dfe8fb'); c.poly([[3.5, 4], [7.5, 0.5], [7.5, 10.5], [3.5, 7]], '#dfe8fb'); c.outline();
        if (kind === 'sound') c.px([[9, 4], [9, 5], [9, 6], [11, 2], [11, 3], [12, 4], [12, 5], [12, 6], [11, 7], [11, 8]], '#222034');
        else c.px([[9, 3], [10, 4], [11, 5], [12, 6], [9, 7], [10, 6], [12, 4], [11, 3], [11, 7], [12, 8], [9, 8], [12, 2]], '#d24552');
        return c.canvas();
      }
    }
    return g.canvas();
  }
  function paint(canvas, src) { if (src.k && (canvas.width !== src.width || canvas.height !== src.height)) fitCanvas(canvas, src); hdLook(canvas, src); const x = canvas.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, canvas.width, canvas.height); if (src.width === canvas.width) x.drawImage(src, 0, 0); else x.drawImage(src, 0, 0, canvas.width, canvas.height); hdWait(canvas, src, () => paint(canvas, src)); }
  // draw a sprout (or any look) into a canvas element; pose optional
  function drawSproutTo(canvas, sOrLook, pose) {
    const L = sOrLook && sOrLook.stats ? state.lookOf(sOrLook) : sOrLook, src = PX.sprig(L, pose || {});
    fitCanvas(canvas, src); paint(canvas, src);
  }
  // size a canvas's bitmap to a sprite (hi-res sprites have k x more pixels). Canvases sized by CSS keep their size; one
  // that was only sized by its width/height attributes gets that size pinned in CSS so it doesn't grow on screen.
  function fitCanvas(canvas, src) {
    const aw = PX.artW(src), ah = PX.artH(src);
    if (src.k && canvas.isConnected && !canvas.style.width) {
      const cs = getComputedStyle(canvas), w = parseFloat(cs.width), h = parseFloat(cs.height);
      if (Math.abs(w - canvas.width) < 0.5 && Math.abs(h - canvas.height) < 0.5) { canvas.style.width = (canvas.width === aw ? aw : w) + 'px'; canvas.style.height = (canvas.height === ah ? ah : h) + 'px'; }
    }
    if (canvas.width !== src.width) canvas.width = src.width;
    if (canvas.height !== src.height) canvas.height = src.height;
  }

  // ---------------- HUD ----------------
  let chipKey = '';
  function refreshPlayerChip() {
    const p = PS.players.current(), partner = state.active();
    const key = (p ? p.name : '') + '|' + (partner ? JSON.stringify(state.lookOf(partner)) : '-');
    if (key === chipKey) return; chipKey = key;
    $('playerName').textContent = PS.players.isTesting() ? 'Test save' : (p ? p.name : 'Player');
    drawSproutTo($('playerAvatar'), partner || { species: PS.S.starter || 'peashooter', stage: 0 }, partner ? {} : { eyes: 'happy' });
  }
  function refresh() {
    refreshPlayerChip();
    $('coinText').textContent = coinLabel(coinFreeze == null ? PS.S.coins : coinFreeze);
    const night = PS.clock.isNight(), ms = PS.clock.msToSwitch(), m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60;
    // (the word sits in its own span: a phone hides it, the sun or moon icon says it, so the player's name keeps its room)
    const ct = $('clockText'); if (!ct.firstElementChild) ct.innerHTML = '<span class="ck-w"></span><span class="ck-t"></span>';
    ct.firstElementChild.textContent = night ? 'Night ' : 'Day '; ct.lastElementChild.textContent = `${m}:${String(s).padStart(2, '0')}`;
    const want = night ? 'moon' : 'sun';
    if ($('clockIcon').dataset.k !== want) { paint($('clockIcon'), icon(want)); $('clockIcon').dataset.k = want; }
    document.querySelector('[data-go="garden"] .badge').hidden = !PS.S.eggs.length;
    if (booted) { try { menuMusic(); goalTick(); dailyTick(); } catch (e) { console.error(e); reportError(e, 'goals'); } }
  }
  let booted = false;

  // big totals get short so the player's name still fits in the HUD: 98,765 / 123K / 1.23M
  function coinLabel(n) {
    if (n < 100000) return n.toLocaleString();
    if (n < 1e6) return Math.floor(n / 1000) + 'K';
    return (Math.floor(n / (n < 1e7 ? 1e4 : 1e5)) / (n < 1e7 ? 100 : 10)) + 'M';
  }

  // ---------------- iPad & laptop guards ----------------
  // Safari (iPad and Mac) lets you press-and-hold or double-tap-and-drag a picture off the screen (it treats every canvas as a
  // draggable image); older iPads also slide/bounce the whole page with a swipe and zoom it with a pinch; a laptop zooms with a
  // trackpad pinch (ctrl+wheel) and selects on a double-click. None of that belongs in the game. (The garden handles pinch on its
  // own canvas with pointer events, so its zoom still works.)
  const typing = el => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  document.addEventListener('dragstart', e => e.preventDefault());
  document.addEventListener('selectstart', e => { if (!typing(e.target)) e.preventDefault(); });
  document.addEventListener('dblclick', e => { if (!typing(e.target)) e.preventDefault(); });
  document.addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, e => e.preventDefault(), { passive: false });
  // a swipe only moves something that really scrolls (shop, almanac, lists); a two-finger pinch never zooms the page
  const scroller = el => {
    for (let n = el instanceof Element ? el : el && el.parentElement; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if ((/(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 1) || (/(auto|scroll)/.test(cs.overflowX) && n.scrollWidth > n.clientWidth + 1)) return n;
    }
    return null;
  };
  document.addEventListener('touchmove', e => {
    if (typing(document.activeElement)) return;
    if (e.touches.length > 1) { e.preventDefault(); return; }
    // a scroll box with more to show scrolls by itself (checked first: it's cheap, and this runs for every finger move)
    const b = e.target.closest && e.target.closest('.sbox');
    if (b && b._sb && b._sb.over) return;
    if (!scroller(e.target)) e.preventDefault();
  }, { passive: false });
  // done typing: put the page back where it belongs
  document.addEventListener('focusout', e => { if (typing(e.target)) setTimeout(() => { if (!typing(document.activeElement) && (window.scrollX || window.scrollY)) window.scrollTo(0, 0); }, 50); });
  // anything that nudges the page or a frame that isn't meant to scroll gets put straight back (except while typing: the iPad
  // slides the page up to make room for the keyboard, and snapping it back closed the keyboard before you could type)
  document.addEventListener('scroll', e => {
    if (typing(document.activeElement)) return;
    const el = e.target;
    if (!el || el === document || el === document.documentElement || el === document.body) { if (window.scrollX || window.scrollY) window.scrollTo(0, 0); return; }
    if (!(el instanceof Element) || el._sb) return; // (a scroll box: meant to scroll, and this runs for every frame of it)
    const cs = getComputedStyle(el), fixed = v => v === 'hidden' || v === 'clip' || v === 'visible';
    if (fixed(cs.overflowY) && el.scrollTop) el.scrollTop = 0;
    if (fixed(cs.overflowX) && el.scrollLeft) el.scrollLeft = 0;
  }, true);

  // ---------------- scroll boxes ----------------
  // Long lists of options (plants, moves, items, maps, leagues…) scroll inside their own bounded box, so a sheet never runs off
  // the screen. Markup: <div class="sbox-frame"><div class="sbox">…</div></div> (app.css sizes them). iPads hide native scroll
  // bars and ignore ::-webkit-scrollbar styling, so each box gets a drawn bar in its frame: a track and a chunky thumb, moved
  // once per frame while it scrolls (all reads first, then all writes). Drag the thumb to scroll; tap the track to page.
  // Boxes are picked up by the page's one MutationObserver (watchCanvases) and dropped again when they leave the page.
  const SB_PAD = 6, SB_THUMB = 44, SB_MINH = 168, sbLive = new Set(), sbDirty = new Set(); let sbRaf = 0;
  const sbRO = window.ResizeObserver ? new ResizeObserver(list => { for (const en of list) if (en.target._sb) sbQueue(en.target._sb); }) : null;
  function sbQueue(st) { sbDirty.add(st); if (!sbRaf) sbRaf = requestAnimationFrame(sbFlush); }
  function sbFlush() {
    sbRaf = 0;
    const list = [...sbDirty]; sbDirty.clear();
    for (const st of list) { const el = st.el; st.m = el.isConnected ? [el.scrollTop, el.scrollHeight, el.clientHeight] : null; }
    for (const st of list) if (st.m) sbPaint(st, st.m[0], st.m[1], st.m[2]);
  }
  function sbPaint(st, top, sh, ch) {
    const over = sh > ch + 2, mh = Math.min(SB_MINH, sh);
    // a list in a pop-up keeps 2-3 rows on a short screen (the card scrolls instead), but never more room than it needs
    if (mh !== st.mh) { st.mh = mh; st.frame.style.setProperty('--sb-min', mh + 'px'); }
    st.over = over; st.max = over ? sh - ch : 0;
    const track = Math.max(0, ch - SB_PAD * 2), th = Math.min(track, Math.max(SB_THUMB, Math.round(track * ch / sh)));
    // (only a few pixels more to see: the box still scrolls, but a bar that's all thumb would just be clutter)
    const show = over && sh - ch > 16;
    if (show !== st.shown) { st.shown = show; st.bar.style.display = show ? '' : 'none'; }
    if (!show) return;
    const y = Math.round((track - th) * Math.min(1, Math.max(0, top / (sh - ch))));
    st.track = track;
    if (th !== st.th) { st.th = th; st.thumb.style.height = th + 'px'; }
    if (y !== st.y) { st.y = y; st.thumb.style.transform = `translate3d(0,${y}px,0)`; }
  }
  function sbAttach(el) {
    if (el._sb || !el.isConnected || !el.parentElement) return;
    let frame = el.parentElement;
    // (markup brings its own frame; wrapping here moves the box, which would reset where it was scrolled to)
    if (!frame.classList.contains('sbox-frame')) { frame = document.createElement('div'); frame.className = 'sbox-frame'; el.replaceWith(frame); frame.appendChild(el); }
    const bar = document.createElement('div'); bar.className = 'sb-bar'; bar.style.display = 'none'; bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = '<span class="sb-track"></span><span class="sb-thumb"></span>';
    frame.appendChild(bar);
    const st = el._sb = { el, frame, bar, thumb: bar.lastChild, over: false, shown: false, th: 0, y: -1, mh: -1, track: 0, max: 0, m: null, touch: false, press: false, busy: 0 };
    el.addEventListener('scroll', () => { st.busy = performance.now() + 400; sbQueue(st); }, { passive: true });
    el.addEventListener('touchstart', () => { st.touch = true; sbEdge(st); }, { passive: true });
    for (const t of ['touchend', 'touchcancel']) el.addEventListener(t, () => { st.touch = false; st.busy = performance.now() + 400; }, { passive: true });
    bar.addEventListener('pointerdown', e => sbPress(st, e));
    if (sbRO) sbRO.observe(el);
    sbLive.add(st); sbQueue(st);
  }
  function sbDrop(st) { sbLive.delete(st); sbDirty.delete(st); if (sbRO) sbRO.unobserve(st.el); st.el._sb = null; }
  // older iPads ignore overscroll-behavior: a box resting at its very top or bottom hands the swipe to the page, which bounces.
  // One pixel in from the edge the box always has room to move, so it keeps the swipe (and bounces on its own).
  function sbEdge(st) {
    sbQueue(st);
    if (!st.over || st.max < 2) return;
    const el = st.el, top = el.scrollTop;
    if (top <= 0) el.scrollTop = 1; else if (top >= st.max) el.scrollTop = st.max - 1;
  }
  // The thumb follows the finger. The track: a tap pages towards it when the finger lifts, and a swipe that starts on the bar
  // scrolls the list like a swipe on the list itself (the bar blocks native scrolling, and children swipe near the edge too).
  function sbPress(st, e) {
    if (!st.shown || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault(); e.stopPropagation();
    const el = st.el, bar = st.bar, id = e.pointerId, y0 = e.clientY, top0 = el.scrollTop, y = y0 - bar.getBoundingClientRect().top - SB_PAD;
    const thumb = y >= st.y - 10 && y <= st.y + st.th + 10, k = thumb ? st.max / Math.max(1, st.track - st.th) : -1;
    let moved = thumb, lastY = y0, lastT = e.timeStamp, v = 0;
    try { bar.setPointerCapture(id); } catch (err) { /* moves still arrive while the finger stays on the bar */ }
    st.press = true; if (thumb) bar.dataset.drag = '1';
    const move = ev => {
      if (ev.pointerId !== id) return;
      if (!moved) { if (Math.abs(ev.clientY - y0) < 8) return; moved = true; }
      el.scrollTop = top0 + (ev.clientY - y0) * k;
      const dt = ev.timeStamp - lastT; if (dt > 0) { v = 0.7 * (ev.clientY - lastY) / dt + 0.3 * v; lastY = ev.clientY; lastT = ev.timeStamp; }
    };
    const ends = ['pointerup', 'pointercancel', 'lostpointercapture'];
    const end = ev => {
      if (ev.pointerId !== id) return;
      st.press = false; delete bar.dataset.drag; bar.removeEventListener('pointermove', move); ends.forEach(t => bar.removeEventListener(t, end));
      if (thumb || ev.type !== 'pointerup') return;
      // a tap: one page towards it; a quick swipe glides on a little, like the list's own momentum
      const by = !moved ? (y < st.y ? -1 : 1) * Math.max(40, Math.round(el.clientHeight * 0.85)) : Math.abs(v) > 0.3 && ev.timeStamp - lastT < 90 ? Math.round(-v * 260) : 0;
      if (!by) return;
      if (el.scrollBy) el.scrollBy({ top: by, behavior: 'smooth' }); else el.scrollTop += by;
    };
    bar.addEventListener('pointermove', move);
    ends.forEach(t => bar.addEventListener(t, end));
  }
  // from the MutationObserver: attach new boxes, re-measure a box whose list changed, drop boxes that left the page
  function sbScan(list) {
    let gone = false;
    for (const m of list) {
      if (m.type === 'childList') {
        if (m.removedNodes.length) gone = true;
        for (const n of m.addedNodes) if (n.nodeType === 1) { if (n.classList.contains('sbox')) sbAttach(n); else if (n.firstElementChild) n.querySelectorAll('.sbox').forEach(sbAttach); }
      }
      if (sbLive.size && m.target.closest) { const b = m.target.closest('.sbox'); if (b && b._sb) sbQueue(b._sb); }
    }
    if (gone) for (const st of sbLive) if (!st.el.isConnected) sbDrop(st);
  }
  // re-measure a box after a change the observer can't see (or every box)
  function sboxRefresh(el) { if (el) { if (el._sb) sbQueue(el._sb); } else sbLive.forEach(sbQueue); }
  // a screen that rebuilds its list now and then (the race hub at dusk) waits while the list is touched, scrolled or dragged,
  // so a swipe or a thumb drag isn't cut off and a tap on a row isn't lost
  function sboxBusy(el) { const st = el && el._sb; return !!st && (st.touch || st.press || performance.now() < st.busy); }
  // A picker can list 200+ plants, and the first time a plant is drawn its sprite has to be built (on an iPad, opening the list
  // stalled for a second or more). So the first rows are drawn at once and the rest a few per frame in the background, rows
  // that scroll into view first. lazyDraws(box, first) returns add(canvas, draw); it stops by itself when the list closes.
  function lazyDraws(box, first) {
    const todo = new Map(); let raf = 0, n = 0;
    const io = window.IntersectionObserver ? new IntersectionObserver(list => { for (const en of list) if (en.isIntersecting) run(en.target); }, { root: box, rootMargin: '150px 0px' }) : null;
    const run = c => { const f = todo.get(c); if (!f) return; todo.delete(c); if (io) io.unobserve(c); try { f(c); } catch (e) { console.error(e); } };
    const tick = () => {
      raf = 0;
      if (!box.isConnected) { todo.clear(); if (io) io.disconnect(); return; }
      const end = performance.now() + 6;
      for (const c of todo.keys()) { run(c); if (performance.now() > end) break; }
      if (todo.size) raf = requestAnimationFrame(tick); else if (io) io.disconnect();
    };
    return (c, f) => {
      if (n++ < first) { f(c); return; }
      todo.set(c, f); if (io) io.observe(c);
      if (!raf) raf = requestAnimationFrame(tick);
    };
  }

  // ---------------- navigation ----------------
  function go(name, params) {
    const sc = PS.scenes[name];
    if (current && PS.scenes[current] && PS.scenes[current].hide) PS.scenes[current].hide();
    document.querySelectorAll('.screen').forEach(el => { el.hidden = el.dataset.screen !== name; });
    document.querySelectorAll('#nav button').forEach(b => { if (b.dataset.go === name) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    const prev = current; current = name;
    const root = $('scr-' + name);
    // the new screen fades in (menus also rise a little: app.css .scr-in); only when the screen really changes
    if (root && prev !== name) { root.classList.remove('scr-in'); void root.offsetWidth; root.classList.add('scr-in'); }
    if (sc && !mounted[name]) { mounted[name] = true; try { sc.mount(root); } catch (e) { console.error(e); root.innerHTML = `<div class="card" style="margin:20px auto">This screen failed to load.</div>`; } }
    // hub music first, so a scene's own show() can start its own track straight after (a battle, a mini-game)
    music();
    if (sc && sc.show) sc.show(params || {});
    if (!sc) root.innerHTML = `<div style="padding:24px"><div class="card">Coming soon.</div></div>`;
  }
  let chromeOn = true, held = false, heldToast = null;
  function chrome(on) {
    chromeOn = !!on;
    if (!chromeOn) { const el = $('toast'); if (el && +el.style.opacity > 0) { el.style.opacity = 0; toastT = 0; } } // a race or battle starts: clear any message on screen
    document.getElementById('app').classList.toggle('chrome-off', !chromeOn); window.dispatchEvent(new Event('resize')); if (chromeOn && !held && heldToast) { const h = heldToast; heldToast = null; toast(h[0], h[1]); } }
  function hold(on) { held = !!on; if (!held) { pumpModals(); if (heldToast && chromeOn) { const h = heldToast; heldToast = null; toast(h[0], h[1]); } } }

  // ---------------- toast ----------------
  let toastT = 0;
  function toast(msg, ms) {
    if (held || !chromeOn) { heldToast = [msg, ms]; return; } // don't cover a race or battle; show the latest one afterwards
    const el = $('toast'); el.textContent = msg; el.style.opacity = 1; toastT = (ms || 2400) / 1000;
  }

  // ---------------- modals (queued) ----------------
  // opts: { eyebrow, title, html, sprite: sprout|look|canvas, pose, buttons:[{label, kind:'primary'|'go'|'danger'|'', onClick(close)}], row, dismiss:true }
  const queue = []; let open = null;
  // A tap that opens a pop-up when the finger lifts (the garden tray's fruit) is followed by the browser's own click at the
  // same spot, which then lands on the new pop-up: it armed "Throw away" on the fruit pop-up. A click whose press began
  // before the pop-up opened isn't meant for it. (Keyboard clicks have detail 0; the time limit keeps assistive taps safe.)
  let pressN = 0;
  for (const t of ['pointerdown', 'touchstart']) document.addEventListener(t, () => { pressN++; }, { capture: true, passive: true });
  function modal(opts) { queue.push(opts); pumpModals(); }
  function pumpModals() {
    if (open || !queue.length) return;
    // (while a race or battle holds pop-ups, only a moment that scene asked for itself, a celebrate(), may show)
    const qi = held ? queue.findIndex(q => q.force) : 0;
    if (qi < 0) return;
    const o = queue.splice(qi, 1)[0]; open = o;
    if (o.cel) { try { showCelebrate(o); } catch (e) { console.error(e); reportError(e, 'celebrate'); $('modalRoot').innerHTML = ''; open = null; o.done(); pumpModals(); } return; }
    if (o.evo) { // (if the scene can't run, the plain pop-up it replaced)
      try { showEvolution(o); } catch (e) { console.error(e); reportError(e, 'evolve'); $('modalRoot').innerHTML = ''; open = null; const s = o.evo.s, fi = state.formInfo(s); queue.unshift({ eyebrow: 'Evolution', title: `${E(o.evo.name || s.name)} evolved into ${E(fi.name)}!`, sprite: s, buttons: [{ label: 'Wonderful', kind: 'primary' }] }); pumpModals(); }
      return;
    }
    const root = $('modalRoot');
    const canX = o.dismiss !== false && o.closeX !== false;
    root.innerHTML = `<div class="overlay" role="dialog" aria-modal="true"><div class="modal-wrap">${canX ? '<button class="m-x" type="button" aria-label="Close">×</button>' : ''}<div class="card modal-card">
      ${o.sprite ? '<canvas class="px m-sprite" width="32" height="32"></canvas>' : ''}
      ${o.eyebrow ? `<div class="eyebrow">${o.eyebrow}</div>` : ''}
      ${o.title ? `<h1>${o.title}</h1>` : ''}
      <div class="m-body">${o.html || ''}</div>
      <div class="modal-btns ${o.row ? 'row' : ''}"></div></div></div></div>`;
    const openN = pressN, openT = performance.now();
    root.querySelector('.overlay').addEventListener('click', e => { if (e.detail && pressN === openN && performance.now() - openT < 700) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
    const cv = root.querySelector('.m-sprite');
    if (cv) { if (o.sprite instanceof HTMLCanvasElement) { fitCanvas(cv, o.sprite); paint(cv, o.sprite); } else drawSproutTo(cv, o.sprite, o.pose || { eyes: 'happy', mouth: 'open', arms: 'up' }); }
    const close = () => { root.innerHTML = ''; open = null; if (o.onClose) o.onClose(); pumpModals(); };
    const btns = o.buttons && o.buttons.length ? o.buttons : [{ label: 'OK', kind: 'primary' }];
    const box = root.querySelector('.modal-btns');
    btns.forEach(b => { const el = document.createElement('button'); el.className = 'btn wide ' + (b.kind || ''); el.textContent = b.label; el.onclick = () => { PX.Sound.play('pop'); if (b.onClick) { const keep = b.onClick(close); if (keep === true) return; } close(); }; box.appendChild(el); });
    if (o.dismiss !== false) root.querySelector('.overlay').addEventListener('click', e => { if (e.target.classList.contains('overlay')) close(); });
    const xb = root.querySelector('.m-x'); if (xb) xb.onclick = () => { PX.Sound.play('pop'); close(); };
    if (o.mount) o.mount(root.querySelector('.card'), close);
    const card = root.querySelector('.card'); if (card && card.querySelector('.sbox')) card.classList.add('m-sbox'); // (only the list shrinks to fit the screen)
  }
  function closeModal() { if (!open) return; if (open.kill) { open.kill(); return; } $('modalRoot').innerHTML = ''; open = null; pumpModals(); } // (a celebrate or evolution closes itself, so its promise resolves)

  // ---------------- sprout picker ----------------
  // opts: { title, eyebrow, note, filter(s)->true|string(reason disabled), extra(s)->html, onPick(s) }
  function pickSprout(opts) {
    const list = PS.S.sprouts;
    if (!list.length) { modal({ title: 'No plants yet', html: '<p>Plant your first seed packet in the Garden.</p>', buttons: [{ label: 'Go to the Garden', kind: 'primary', onClick: () => go('garden') }] }); return; }
    modal({
      eyebrow: opts.eyebrow || '', title: opts.title || 'Choose a plant', html: (opts.note ? `<p>${opts.note}</p>` : '') + '<div class="sbox-frame pick-frame"><div class="sbox pick-list"></div></div>',
      buttons: [{ label: 'Cancel' }],
      mount(card, close) {
        const box = card.querySelector('.pick-list'), draw = lazyDraws(box, 12);
        const sorted = list.slice().sort((a, b) => (b.id === PS.S.activeId) - (a.id === PS.S.activeId) || state.totalLevels(b) - state.totalLevels(a));
        for (const s of sorted) {
          const ok = opts.filter ? opts.filter(s) : true;
          const b = document.createElement('button'); b.className = 'pick-item'; if (ok !== true && ok !== undefined) b.disabled = true;
          // (sized up front: a picture drawn later doesn't move the row, or make drawSproutTo measure it. 64px is the crisp size
          // the pixel snapper gives a 64x64 hi-res plant on any screen; at 56px every late picture grew its row by 8px, and the
          // list slid under a waiting finger)
          b.innerHTML = `<canvas class="px" width="0" height="0" style="width:64px;height:64px"></canvas><span><b>${PS.state.esc(s.name)}</b><small>${state.formInfo(s).name} · Lv ${state.totalLevels(s)} · ${D.AREAS[s.area].name}</small>${opts.extra ? `<small>${opts.extra(s)}</small>` : ''}${typeof ok === 'string' ? `<small>${ok}</small>` : ''}</span>${s.id === PS.S.activeId ? '<span class="tag">Partner</span>' : ''}`;
          draw(b.querySelector('canvas'), c => drawSproutTo(c, s));
          b.onclick = () => { close(); opts.onPick(s); };
          box.appendChild(b);
        }
      },
    });
  }

  // ---------------- battle move picker ----------------
  // Pick which of its learned moves a Sprout takes into battle (up to state.MAX_MOVES). Each move shows why it suits this Sprout
  // (from its stats and types); "Best picks" chooses for you; "Let the game choose" goes back to the automatic set.
  function pickMoves(s, onDone) {
    if (!s) return;
    const MAX = state.MAX_MOVES, name = PS.state.esc(s.name), learned = state.learnedMoves(s);
    let chosen = state.movesOf(s).filter(id => learned.includes(id));
    const src = {}; for (const k of state.knownMoves(s)) if (!k.locked && !src[k.id]) src[k.id] = k.from;
    const later = state.knownMoves(s).filter(k => k.locked).sort((a, b) => (a.level || (a.evolveTo != null ? 15 + a.evolveTo * 12 : 99)) - (b.level || (b.evolveTo != null ? 15 + b.evolveTo * 12 : 99))); // still to learn: levels, evolving, cores (soonest first)
    // (a picked move at the top is a small card, mini: name, power and type; tap it to take it out)
    const card = (id, on, mini) => {
      const m = D.MOVES[id], f = state.moveFit(s, id), E = D.ELEMENTS[m.el] || D.ELEMENTS.normal, pow = m.pow > 0 ? `Pow ${m.pow}${m.fx.hits > 1 ? ' ×' + m.fx.hits : ''}` : 'Helper';
      if (mini) return `<button class="mv-card on mini" data-mv-id="${id}" type="button"><canvas class="px" data-el="${m.el}" width="7" height="7"></canvas><span><b>${PS.state.esc(m.name)}</b><small>${pow} · ${E.label}</small></span></button>`;
      return `<button class="mv-card${on ? ' on' : ''}" data-mv-id="${id}" type="button"><canvas class="px" data-el="${m.el}" width="7" height="7"></canvas>
        <span><b>${PS.state.esc(m.name)}</b><small>${pow} · ${E.label}${src[id] ? ' · ' + PS.state.esc(src[id]) : ''}</small>${f.why ? `<i>${PS.state.esc(f.why)}</i>` : ''}</span>${on ? '<em>✓</em>' : ''}</button>`;
    };
    // ("Best picks" without the name: a long name wrapped that row, and on a 9.7-inch iPad or iPad mini the extra line pushed
    // Cancel and Save off the card)
    modal({ eyebrow: 'Battle moves', title: `${name}'s moves`, sprite: s, row: true,
      html: `<p>Pick ${MAX} moves for battles. Tap a move to add it or take it out.</p><div class="mv-slots"></div>
        <div class="mv-tools"><button class="btn" type="button" data-mv="best">★ Best picks</button><button class="pl-link" type="button" data-mv="auto">Let the game choose</button></div>
        <div class="label">Moves ${name} knows (${learned.length})</div>
        <div class="sbox-frame mv-frame"><div class="sbox"><div class="mv-list"></div>
        ${later.length ? `<div class="label">Still to learn</div><div class="mv-later">${later.slice(0, 6).map(x => `<div><b>${PS.state.esc(D.MOVES[x.id].name)}</b> · ${x.evolveTo != null ? `evolve into a ${PS.state.esc(state.stageName(s.species, x.evolveTo))}` : x.level ? `reach level ${x.level}` : `give it ${x.cores} more ${PS.state.esc(x.from.replace(' element', ''))} core${x.cores > 1 ? 's' : ''}`}</div>`).join('')}</div>` : ''}</div></div>`,
      buttons: [{ label: 'Cancel' }, { label: 'Save', kind: 'primary', onClick: () => {
        const now = state.setMoves(s, chosen); PX.Sound.play('chime');
        toast(`${s.name} will battle with ${now.map(id => D.MOVES[id].name).join(', ')}.`, 3200); if (onDone) setTimeout(onDone, 0);
      } }],
      mount(el, close) {
        const draw = () => {
          el.querySelector('.mv-slots').innerHTML = Array.from({ length: MAX }, (_, i) => chosen[i] ? card(chosen[i], true, true) : '<div class="mv-empty">Empty</div>').join('');
          el.querySelector('.mv-list').innerHTML = learned.filter(id => !chosen.includes(id)).map(id => card(id, false)).join('') || '<p class="bk-ver" style="margin:0">It uses every move it knows.</p>';
          el.querySelectorAll('canvas[data-el]').forEach(c => paint(c, PX.item('element', c.dataset.el)));
        };
        el.addEventListener('click', e => {
          const b = e.target.closest('[data-mv-id],[data-mv]'); if (!b) return;
          if (b.dataset.mv === 'best') { chosen = state.bestMoves(s); PX.Sound.play('pop'); draw(); return; }
          if (b.dataset.mv === 'auto') { state.setMoves(s, null); PX.Sound.play('pop'); toast(`The game will choose ${s.name}'s moves.`, 2600); close(); if (onDone) setTimeout(onDone, 0); return; }
          const id = b.dataset.mvId, i = chosen.indexOf(id);
          if (i >= 0) { if (chosen.length > 1) chosen.splice(i, 1); else toast('Keep at least one move.'); }
          else if (chosen.length < MAX) chosen.push(id);
          else { toast(`${MAX} moves is the most. Tap one at the top to take it out.`, 2600); return; }
          PX.Sound.play('tick'); draw();
        });
        draw();
      },
    });
  }

  // ---------------- global reactions ----------------
  // freezeCoins(true) holds the HUD coin total (e.g. while a gumball rolls, so the prize isn't spoiled); false shows the real total
  let coinFreeze = null;
  function bumpCoins() { const p = $('coinPill'); p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); PX.Sound.play('tick'); }
  function freezeCoins(on) {
    if (on) { if (coinFreeze == null) coinFreeze = PS.S.coins; return; }
    if (coinFreeze == null) return;
    const was = coinFreeze; coinFreeze = null; refresh(); if (PS.S.coins > was) bumpCoins();
  }
  PS.on('coins', e => { refresh(); if (e.n > 0 && coinFreeze == null && chromeOn) bumpCoins(); }); // no tick under a race or battle
  // saving problems are rare but serious: tell a grown-up once, with the fix
  let saveWarned = false;
  function saveWarning(why) {
    if (saveWarned) return; saveWarned = true;
    modal({ eyebrow: 'For grown-ups', title: 'Progress isn’t saving', html: `<p>${why} Until it's fixed, new progress may be lost when the game closes.</p><p>Make a backup code now (Backups), then check that the phone has free storage and that website data isn't blocked for this app.</p>`,
      buttons: [{ label: 'Make a backup code', kind: 'primary', onClick: () => { setTimeout(backupPanel, 0); } }, { label: 'OK' }] });
  }
  PS.on('save:failed', () => saveWarning('This device just refused to save the game.'));
  PS.on('save:ok', () => { saveWarned = false; });
  PS.on('sprout:evolve', e => { if (e && e.s && !e.s.npc) { queue.push({ evo: e }); pumpModals(); } }); // (the evolution scene: showEvolution)
  PS.on('move:learn', e => {
    const s = e.s, names = e.ids.map(id => D.MOVES[id].name);
    const rows = e.ids.map(id => { const m = D.MOVES[id], E = D.ELEMENTS[m.el] || D.ELEMENTS.normal; return `<div class="mv-new"><b>${PS.state.esc(m.name)}</b><small>${m.pow > 0 ? 'Pow ' + m.pow : 'Helper'} · ${E.label}</small><span>${PS.state.esc(m.desc)}</span></div>`; }).join('');
    PX.Sound.play('level');
    modal({ eyebrow: `Level ${state.totalLevels(s)}`, title: `${PS.state.esc(s.name)} learned ${PS.state.esc(names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0])}!`, sprite: s, pose: { eyes: 'happy', mouth: 'open', arms: 'up' },
      html: `${rows}<p class="bk-ver">Pick which moves it takes into battle with Choose moves.</p>`,
      buttons: [{ label: 'Choose moves', onClick: () => { setTimeout(() => pickMoves(s), 0); } }, { label: 'Awesome!', kind: 'primary' }] });
  });
  PS.on('egg:new', e => { refresh(); const k = e.egg.kind, nm = k === 'normal' ? `${D.PLANTS[e.egg.species].name} seed packet` : D.SEEDS[k].name; toast(`New ${nm}! It's waiting in the ${D.AREAS[e.egg.area].name}.`, 3200); });
  // a brand-new plant to collect (from a race or battle): celebrate it
  PS.on('unlock', e => {
    const P = D.PLANTS[e.species]; if (!P || !e.isNew || e.source === 'Your first plant') return;
    if (P.legendary && /^Won in /.test(e.source || '')) return; // (Survival shows its own big legendary reveal)
    // (wait:true: it waits for a race or battle to finish, like the pop-up it replaced)
    celebrate({ kind: P.legendary ? 'legend' : 'unlock', wait: true, eyebrow: 'New plant unlocked!', title: P.name, sprite: { species: e.species, stage: 0 }, cry: true,
      sub: `Its seed packet is waiting in the Garden.${e.source ? ' Prize for: ' + e.source + '.' : ''}`, button: 'Hooray!' });
  });
  // a seed packet sprouted: the garden plays its own little pop; the first of a kind (or a Shiny) also gets the big moment
  PS.on('egg:hatch', e => {
    const s = e && e.s; if (!s || !D.PLANTS[s.species]) return;
    const shiny = !!(s.look && s.look.shiny), firstKind = PS.S.sprouts.filter(x => x.species === s.species).length === 1;
    if (!shiny && !firstKind) return;
    const P = D.PLANTS[s.species];
    goalT = performance.now() + 2500; // (a goal reached by this hatch is paid after the moment, where it can be seen)
    setTimeout(() => celebrate({ kind: 'hatch', wait: true, eyebrow: shiny ? 'A Shiny plant!' : 'It sprouted!', title: `Hi, ${s.name}!`, sprite: s, cry: true,
      sub: shiny ? `A Shiny ${P.name}! It shimmers.` : `Your new ${P.name} is growing in the Garden.`, button: 'Hi!' }), 1400);
  });
  PS.on('levelup', e => { if (current !== 'race' && current !== 'battle') toast(`${e.s.name}: ${D.STAT_META[e.stat].label} Lv ${e.lv}`); });
  PS.on('night', e => { toast(e.isNight ? 'Night has fallen. Night elements are out.' : 'Good morning! The sun is up.', 3000); refresh(); if (current === 'garden' && chromeOn && !held && !open) music(); });

  // ---------------- parent gate (keeps kids out of the testing tools and erase buttons) ----------------
  // One right answer opens grown-up actions for 2 minutes, and putting the app away closes them again
  // (a Home Screen app can stay open for days, so "until reload" would leave them open to the kids).
  const PARENT_MS = 120000; let parentUntil = 0;
  document.addEventListener('visibilitychange', () => { if (document.hidden) parentUntil = 0; });
  function parentGate(then) {
    if (Date.now() < parentUntil) { then(); return; }
    const a = 6 + Math.floor(Math.random() * 7), b = 4 + Math.floor(Math.random() * 6);
    let tries = 0;
    modal({ eyebrow: 'Grown-ups only', title: 'Parent check', html: `<p>What is ${a} × ${b}?</p><input class="field-input" id="pgAns" inputmode="numeric" autocomplete="off" aria-label="Answer"><div class="pg-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '⌫'].map(k => `<button type="button" class="btn pg-key" data-k="${k}">${k}</button>`).join('')}</div>`,
      // (number buttons too: the answer can be tapped in without the on-screen keyboard)
      mount(card) { const inp = card.querySelector('#pgAns'); card.querySelectorAll('.pg-key').forEach(b => { b.onclick = () => { const k = b.dataset.k; PX.Sound.play('tick'); inp.value = k === 'C' ? '' : k === '⌫' ? inp.value.slice(0, -1) : (inp.value + k).slice(0, 4); }; }); },
      row: true, buttons: [{ label: 'Cancel' }, { label: 'Continue', kind: 'primary', onClick: () => {
        const v = parseInt(($('pgAns') || {}).value, 10);
        if (v === a * b) { parentUntil = Date.now() + PARENT_MS; setTimeout(then, 0); return; }
        if (++tries >= 3) { toast('Ask a grown-up to help with this one.'); return; }
        toast('That is not quite right.'); return true;
      } }] });
  }

  // ---------------- testing tools (parent only) ----------------
  function devPanel() {
    const T = PS.S.totals || {}, mins = Math.round((T.playSec || 0) / 60), n = v => Number(v || 0).toLocaleString();
    const played = mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`;
    const odds = state.treeOdds().sort((a, b) => b.p - a.p).map(o => `${D.FRUITS[o.id].name} ${(o.p * 100).toFixed(o.p < 0.1 ? 1 : 0)}%`).join(' · ');
    const stats = `<p class="bk-ver" style="margin-top:0"><b>Play stats</b> (this player, kept on this device): played ${played} since this was added · ${n(T.races)} races (${n(T.raceWins)} won) · ${n(T.battles)} battles (${n(T.battleWins)} won) · ${n(T.coinsEarned)} coins earned · ${n(T.gumballs)} gumballs · ${n(T.fusions)} fusions · ${n(PS.S.sprouts.length)} plants · ${n(state.unlockedList().length)} of ${Object.keys(D.PLANTS).length} plant types</p><p class="bk-ver"><b>Fruit tree odds</b> (fruit already on a tree is less likely to grow again): ${odds}</p>`;
    parentGate(() => modal({
      eyebrow: 'Parent tools', title: 'Testing shortcuts', html: stats + '<p>Shortcuts for testing the whole game quickly. They skip the normal grind, so keep them away from the kids.</p><div class="sbox-frame dev-frame"><div class="sbox dev-grid"></div></div>',
      buttons: [{ label: 'Close' }],
      mount(card, close) {
        const grid = card.querySelector('.dev-grid');
        const add = (label, fn) => { const b = document.createElement('button'); b.className = 'btn'; b.textContent = label; b.onclick = () => { fn(); refresh(); PX.Sound.play('chime'); }; grid.appendChild(b); };
        add('+1,000 coins', () => state.addCoins(1000, 'dev'));
        add('+10,000 coins', () => state.addCoins(10000, 'dev'));
        add('Partner +300 XP', () => { const s = state.active(); if (s) state.gain(s, Object.fromEntries(D.STATS.map(k => [k, 300]))); else toast('Grow a plant first'); });
        add('Toggle day/night', () => PS.clock.toggle());
        add('Zombie attack now', () => { close(); PS.ui.go('garden'); setTimeout(() => { if (window.__garden) window.__garden.raidNow(); }, 500); });
        add('Open all Survival maps', () => { const S = PS.S.progress.survival || (PS.S.progress.survival = {}); for (const M of D.SURVIVAL) S[M.id] = Object.assign({ wins: 0, best: null }, S[M.id], { open: true }); PS.save(); toast('Every Survival map is open (legendary plants still need a win)'); });
        if (PS.event && PS.event.force) { const f = PS.event.forced ? PS.event.forced() : null; add(`Halloween: ${f === true ? 'ON' : f === false ? 'OFF' : 'automatic'} (tap to change)`, () => { const nx = f === null ? true : f === true ? false : null; PS.event.force(nx); toast(nx === true ? 'Halloween is on' : nx === false ? 'Halloween is off' : 'Halloween follows the calendar (Oct 15 – Nov 3)', 3000); close(); PS.saveNow(); setTimeout(() => location.reload(), 900); }); }
        add(PS.S.raidsOff ? 'Turn zombie attacks ON' : 'Turn zombie attacks OFF', () => { PS.S.raidsOff = !PS.S.raidsOff; PS.save(); toast(PS.S.raidsOff ? 'Zombies won\'t attack the garden' : 'Zombies may attack the garden again'); close(); });
        add('Get a seed packet', () => state.addEgg('normal', 'Parent tools'));
        add('Get a Golden seed', () => state.addEgg('golden', 'Parent tools'));
        add('Get a special seed', () => { const k = PS.util.pick(D.SHOP_SEEDS); state.addEgg(k, 'Parent tools'); });
        add('Unlock every plant', () => { for (const id of Object.keys(D.PLANTS)) if (!state.isUnlocked(id)) PS.S.unlocked[id] = Date.now(); PS.save(); toast('Every plant is in the Shop now'); });
        add('+3 element cores', () => { for (let i = 0; i < 3; i++) state.addToPouch(PS.util.pick(Object.keys(D.ELEMENT_INFO))); toast('3 cores in the Garden pouch'); });
        add('+3 fusion items', () => { for (let i = 0; i < 3; i++) state.addItem(state.randomItem()); toast('3 fusion items for the Fusion Lab'); });
        // opens every tier of every series (Master stays unwon, so its first-win egg can still be earned)
        add('Unlock all races', () => {
          const rs = PS.scenes.race; let done = false;
          if (rs && typeof rs.unlockAll === 'function') { try { rs.unlockAll(); done = true; } catch (e) { console.error(e); } }
          if (!done) for (const r of D.RACES) for (let i = 0; i < 2; i++) { const k = r.id + '-' + i; PS.S.progress.races[k] = Object.assign({ runs: 1, best: null }, PS.S.progress.races[k], { wins: Math.max(1, (PS.S.progress.races[k] || {}).wins || 0) }); }
          PS.save(); toast('All races unlocked');
        });
        add('Unlock all leagues', () => { for (const L of D.LEAGUES.concat(D.PLANT_LEAGUES)) PS.S.progress.leagues[L.id] = { beaten: [true, true, true], cleared: true }; PS.save(); toast('All leagues unlocked'); });
        const who = (PS.players.current() || {}).name || 'this player';
        const r = document.createElement('button'); r.className = 'btn danger'; r.style.gridColumn = '1 / -1'; r.textContent = `Erase ${who}'s game`;
        let armed = 0; r.onclick = () => { if (Date.now() - armed > 3000) { armed = Date.now(); r.textContent = `Tap again to erase ${who}'s game`; return; } PS.reset(); close(); location.reload(); };
        grid.appendChild(r);
      },
    }));
  }

  // ---------------- players ----------------
  const E = v => PS.state.esc(v);
  const MUTE_KEY = 'pvzg:muted';
  function setMuted(on) { PX.Sound.muted = !!on; try { localStorage.setItem(MUTE_KEY, on ? '1' : '0'); } catch (e) { /* this session only */ } if (!on) PX.Sound.play('pop'); }
  // ---------------- backups ----------------
  function copyText(text, ta, onCopied, msg) {
    const done = () => { toast(msg || 'Backup code copied. Paste it somewhere safe, like Notes or an email to yourself.', 3600); if (onCopied) onCopied(); };
    const fallback = () => { if (ta) { ta.focus(); ta.select(); } toast('Select the code and copy it.'); };
    try { navigator.clipboard.writeText(text).then(done, fallback); } catch (e) { fallback(); }
  }
  const ago = ts => { const d = Math.round((new Date(new Date().toDateString()) - new Date(new Date(ts).toDateString())) / 86400000); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`; };
  const when = ts => new Date(ts).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  async function shareText(text, name) {
    try {
      const file = new File([text], `pvz-garden-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.txt`, { type: 'text/plain' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'PVZ Garden backup' }); return true; }
      if (navigator.share) { await navigator.share({ title: 'PVZ Garden backup', text }); return true; }
    } catch (e) { if (e && e.name === 'AbortError') return true; }
    return false;
  }
  function backupPanel() {
    const cur = PS.players.current(), many = PS.players.list().length > 1, last = PS.players.lastBackup(cur.id);
    const autos = PS.backup.autoBackups().filter(a => a.ok), rescue = PS.backup.rescued();
    modal({ eyebrow: 'Keep progress safe', title: 'Backups',
      html: `<p>A backup code holds a whole saved game. Keep a copy somewhere safe (Notes, Files or an email). If a phone is lost, reset or replaced, paste the code into the game to get everything back.</p>
        <p class="bk-ver" style="margin-top:0">${last ? `${E(cur.name)} was last backed up ${ago(last)}.` : `${E(cur.name)} hasn't been backed up yet.`}</p>
        <div class="bk-actions"><button class="btn primary" id="bkMe">Back up ${E(cur.name)}</button>${many ? '<button class="btn" id="bkAll">Back up all players</button>' : ''}</div>
        <div id="bkOut" hidden><textarea class="field-input bk-code" id="bkCode" readonly rows="4" aria-label="Backup code"></textarea>
          <div class="bk-actions"><button class="btn primary" id="bkCopy">Copy code</button><button class="btn" id="bkShare">Save or share</button></div></div>
        <div class="label" style="margin-top:16px">Restore from a backup</div>
        <textarea class="field-input bk-code" id="bkIn" rows="3" placeholder="Paste a backup code here" aria-label="Backup code to restore"></textarea>
        <div class="bk-actions"><button class="btn" id="bkNew">Restore as new player</button><button class="btn danger" id="bkReplace">Replace ${E(cur.name)}'s game</button></div>
        ${autos.length ? `<div class="label" style="margin-top:16px">Automatic backups on this device</div>
          <p class="bk-ver" style="margin-top:2px">The game keeps ${E(cur.name)}'s game from the last few days it was played, in case something goes wrong.</p>
          <div class="bk-auto">${autos.map(a => `<div class="bk-row"><span><b>${E(when(a.at))}</b><small>${a.sprouts} plant${a.sprouts === 1 ? '' : 's'} · ${Number(a.coins).toLocaleString()} coins</small></span><button class="btn" data-auto="${a.i}">Restore</button></div>`).join('')}</div>` : ''}
        ${rescue ? `<p class="bk-ver">A copy of a saved game that couldn't be opened was kept from ${E(when(rescue.at))}. <button class="pl-link" id="bkRescue">Copy it</button> to send it for help.</p>` : ''}
        <p class="bk-ver">Version ${E(window.PVZG_VERSION || 'dev')}</p>`,
      buttons: [{ label: 'Done' }],
      mount(card) {
        let code = '', codeName = cur.name, which = 'player';
        const backedUp = () => PS.players.markBackedUp(which === 'all' ? PS.players.list().map(p => p.id) : [cur.id]);
        const show = async w => {
          try { which = w; code = await PS.backup.exportBackup(w); codeName = w === 'all' ? 'all-players' : cur.name; card.querySelector('#bkOut').hidden = false; card.querySelector('#bkCode').value = code; }
          catch (e) { toast('Could not make a backup on this device.'); }
        };
        card.querySelector('#bkMe').onclick = () => show('player');
        if (many) card.querySelector('#bkAll').onclick = () => show('all');
        card.querySelector('#bkCode').addEventListener('copy', backedUp); // copied by hand (the fallback when the clipboard is blocked)
        card.querySelector('#bkCopy').onclick = () => copyText(code, card.querySelector('#bkCode'), backedUp);
        card.querySelector('#bkShare').onclick = async () => { if (await shareText(code, codeName)) backedUp(); else copyText(code, card.querySelector('#bkCode'), backedUp); };
        card.querySelectorAll('[data-auto]').forEach(b => b.onclick = () => {
          const a = autos.find(x => x.i === +b.dataset.auto); if (!a) return;
          parentGate(() => modal({ title: `Go back to ${E(when(a.at))}?`, html: `<p>${E(cur.name)}'s game will go back to how it was on ${E(when(a.at))}. Anything played since then will be replaced.</p>`, row: true,
            buttons: [{ label: 'Cancel' }, { label: 'Restore', kind: 'danger', onClick: () => { try { PS.backup.restoreAuto(a.i); toast('Restored.', 2000); setTimeout(() => location.reload(), 600); } catch (e) { toast(e.message, 3600); } } }] }));
        });
        const rb = card.querySelector('#bkRescue'); if (rb) rb.onclick = () => copyText(rescue.raw, null, null, 'Copied. Paste it into an email or message to whoever helps with the game.');
        const restore = async mode => {
          const txt = card.querySelector('#bkIn').value.trim();
          if (!txt) { toast('Paste a backup code first.'); return; }
          let obj; try { obj = await PS.backup.decodeBackup(txt); } catch (e) { toast(e.message || 'That backup code did not work.', 3600); return; }
          if (mode === 'replace' && obj.kind === 'all') { toast('That code holds several players. Use "Restore as new player".', 3600); return; }
          const go2 = () => { try { const names = PS.backup.importBackup(obj, mode); toast(`Restored ${names.join(', ')}.`, 3000); setTimeout(() => { if (mode === 'replace') location.reload(); else { const last = PS.players.list().slice(-1)[0]; PS.players.switchTo(last.id); } }, 700); } catch (e) { toast(e.message, 3600); } };
          if (mode === 'replace') parentGate(() => modal({ title: `Replace ${E(cur.name)}'s game?`, html: `<p>${E(cur.name)}'s current plants will be replaced by the backup.</p>`, row: true, buttons: [{ label: 'Cancel' }, { label: 'Replace', kind: 'danger', onClick: go2 }] }));
          else go2();
        };
        card.querySelector('#bkNew').onclick = () => restore('new');
        card.querySelector('#bkReplace').onclick = () => restore('replace');
      },
    });
  }

  // ---------------- installed-app support: offline cache + updates ----------------
  let updateReady = false, hiddenAt = 0;
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || window.top !== window || !/^https:|^http:\/\/(localhost|127\.0\.0\.1)/.test(location.href)) return;
    if (!window.PVZG_VERSION || window.PVZG_VERSION === 'dev') return; // only the built site ships a service worker
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').then(reg => {
      document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
    }).catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || updateReady) return; // first install, or already handled
      updateReady = true; PS.saveNow();
      modal({ eyebrow: 'Update', title: 'A new version is ready', html: '<p>PVZ Garden has been updated. Your progress is saved and will carry over.</p>', row: true,
        buttons: [{ label: 'Later' }, { label: 'Update now', kind: 'primary', onClick: () => location.reload() }] });
    });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); PS.saveNow(); return; }
    if (updateReady && hiddenAt && Date.now() - hiddenAt > 20000 && !held && chromeOn && !open && !queue.length) location.reload(); // apply a pending update when the app is reopened (never under an open panel)
  });
  function askPersistentStorage() { try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* optional */ } }

  // ---------------- crisp pixel icons ----------------
  // Pixel art only looks right when every art pixel covers a whole number of screen pixels. Many icons are sized "by eye" in the
  // stylesheets (a 32px Sprout shown at 34 or 76 CSS px, a 26px critter squeezed into 22), which doubles some pixel rows and not
  // others. This snaps every small pixel-art canvas to the nearest whole-pixel scale for this screen (1x, 2x or 3x), preferring
  // a slightly smaller size over a bigger one so layouts don't overflow. Big scene canvases draw at device resolution and are skipped.
  const snapQ = new Set(); let snapRaf = 0;
  const pxOf = v => (typeof v === 'string' && /px$/.test(v) ? parseFloat(v) : 0);
  function queueSnap(c) { snapQ.add(c); if (!snapRaf) { snapRaf = 1; Promise.resolve().then(flushSnap); } } // before the next paint
  function flushSnap() {
    snapRaf = 0;
    const dpr = window.devicePixelRatio || 1, todo = [];
    for (const c of snapQ) { // read everything first (one style pass), then write
      if (!c.isConnected || !c.width || !c.height || c.width > 200 || c.height > 200 || 'nosnap' in c.dataset) continue;
      const cs = getComputedStyle(c); if (!/pixelated|crisp/.test(cs.imageRendering)) continue;
      const mine = c.dataset.sw && c.style.width === c.dataset.sw && c.style.height === c.dataset.sh;
      let rw = mine ? +c.dataset.rw : pxOf(c.style.width) || pxOf(cs.width), rh = mine ? +c.dataset.rh : pxOf(c.style.height) || pxOf(cs.height);
      if (!rw && !rh) continue;
      const k = Math.min(rw ? rw / c.width : Infinity, rh ? rh / c.height : Infinity), phys = k * dpr;
      const lo = Math.max(1, Math.floor(phys)), hi = Math.max(1, Math.ceil(phys));
      let n = Math.abs(phys - lo) / phys <= 1.25 * Math.abs(hi - phys) / phys || lo === hi ? lo : hi;
      if (phys < 0.75) n = 1 / Math.max(1, Math.round(1 / phys)); // a hi-res sprite in a small box (1x screens): halve it, don't let it grow
      const w = c.width * n / dpr, h = c.height * n / dpr;
      if (mine && Math.abs(w - pxOf(c.style.width)) < 0.01 && Math.abs(h - pxOf(c.style.height)) < 0.01) continue;
      todo.push([c, rw || w, rh || h, w, h]);
    }
    snapQ.clear();
    for (const [c, rw, rh, w, h] of todo) { c.dataset.rw = rw; c.dataset.rh = rh; c.style.width = c.dataset.sw = w + 'px'; c.style.height = c.dataset.sh = h + 'px'; }
  }
  function watchCanvases() {
    const add = n => { if (n.nodeType !== 1) return; if (n.tagName === 'CANVAS') queueSnap(n); else n.querySelectorAll && n.querySelectorAll('canvas').forEach(queueSnap); };
    new MutationObserver(list => { for (const m of list) { if (m.type === 'attributes') { if (m.target.tagName === 'CANVAS') queueSnap(m.target); else add(m.target); } else m.addedNodes.forEach(add); } sbScan(list); })
      .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['width', 'height', 'class', 'hidden'] });
    add(document.body);
    document.querySelectorAll('.sbox').forEach(sbAttach);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => sboxRefresh());
    window.addEventListener('resize', () => add(document.body));
  }

  // ---------------- errors: shown on screen (briefly, once per kind) so a grown-up can screenshot them for fixing ----------------
  // PS.ui.reportError(error, where): a dark bar above the bottom tabs for 15 s (tap to hide); the same message at most once a minute.
  const errSeen = {};
  function reportError(e, where) {
    try {
      const msg = String((e && (e.message || e.reason)) || e || 'error').slice(0, 160);
      const at = e && e.stack ? (String(e.stack).split('\n').find(l => /\.js:\d+/.test(l)) || '').replace(/^.*\/([^/]+\.js:\d+):\d+\)?.*$/, '$1') : '';
      const key = msg + at; if (errSeen[key] && Date.now() - errSeen[key] < 60000) return; errSeen[key] = Date.now();
      let el = document.getElementById('errBar');
      if (!el) { el = document.createElement('div'); el.id = 'errBar'; el.className = 'pv-err'; el.setAttribute('role', 'alert'); el.onclick = () => { el.hidden = true; }; document.body.appendChild(el); }
      el.textContent = `Oops! Something went wrong (${where || 'game'}): ${msg}${at ? ' · ' + at : ''} · ${window.PVZG_VERSION || 'dev'} · tap to hide`;
      el.hidden = false; clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, 15000);
    } catch (x) { /* never let the reporter break anything */ }
  }
  window.addEventListener('error', ev => { if (ev && ev.target && ev.target !== window && !ev.error && !ev.message) return; reportError(ev.error || ev.message, 'page'); }); // (not a picture or font that failed to load)
  window.addEventListener('unhandledrejection', ev => reportError(ev.reason, 'page'));

  // ---------------- loop ----------------
  let last = performance.now(), hudT = 0, looping = false;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    const sc = PS.scenes[current];
    if (sc && sc.frame && mounted[current] && !PS.ui.menuOpen) { try { sc.frame(dt, t); } catch (e) { console.error(e); reportError(e, current); } } // the main menu covers the screen: don't draw it twice
    // (the loop must never stop: one bad frame would freeze every screen on its last picture)
    try {
      hudT -= dt; if (hudT <= 0) { hudT = 0.5; refresh(); }
      if (!PS.ui.menuOpen && PS.S.totals) PS.S.totals.playSec = (PS.S.totals.playSec || 0) + dt; // time played (parent tools; stays on the device)
      if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').style.opacity = 0; }
    } catch (e) { console.error(e); reportError(e, 'hud'); }
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => { last = performance.now(); });

  // boot(): the "Loading…" splash (index.html) goes first, whatever happens next; a step that fails is reported on screen and
  // the game keeps going (the frame loop always starts). Boot never waits for fonts or pictures.
  function boot() {
    const splash = document.getElementById('bootSplash'); if (splash) splash.remove();
    try { bootSteps(); }
    catch (e) { console.error(e); reportError(e, 'boot'); try { booted = true; bootDone = true; if (!current) go('garden'); } catch (x) { console.error(x); } }
    if (!looping) { looping = true; requestAnimationFrame(frame); }
  }
  function bootSteps() {
    watchCanvases();
    document.getElementById('nav').style.setProperty('--nav-n', document.querySelectorAll('#nav button').length); // (one column per tab: app.css)
    document.querySelectorAll('#nav button').forEach(b => { paint(b.querySelector('canvas'), icon(b.dataset.go)); b.onclick = () => { PX.Sound.unlock(); PX.Sound.play('tick'); go(b.dataset.go); }; });
    paint($('coinIcon'), icon('coin'));
    document.addEventListener('pointerdown', () => PX.Sound.unlock()); // every tap: iOS can stop the audio after a call or a trip to another app
    $('coinPill').addEventListener('click', () => toast(`You have ${PS.S.coins.toLocaleString()} coins. Earn more in races and battles.`));
    $('clockPill').addEventListener('click', () => toast('Day and night switch every 15 minutes. Some elements only come out at night.', 3200));
    const gc = $('goalChip'); if (gc) gc.onclick = () => { PX.Sound.unlock(); PX.Sound.play('tick'); if (goalNow) goalNow.go(); };
    booted = true;
    refresh();
    go('garden');
    // plants (or maps) added in an update for goals this player had already reached: hand them over now
    try {
      // (each plant gets the usual "New plant unlocked!" card; maps get one card here)
      const maps = PS.state.catchUpRewards().filter(g => g.map).map(g => D.GARDEN_MAPS[g.map].name);
      if (maps.length) setTimeout(() => modal({ eyebrow: 'Catch-up gift', title: 'New garden maps!', html: `<p>You'd already earned ${maps.length === 1 ? 'this map' : 'these maps'}: <b>${maps.map(n => PS.state.esc(n)).join(', ')}</b>. Tap a garden's name to change its map.</p>` }), 900);
    } catch (e) { console.error(e); }
    if (!looping) { looping = true; requestAnimationFrame(frame); }
    registerServiceWorker();
    document.addEventListener('pointerdown', askPersistentStorage, { once: true });
    // sound: a device-wide on/off (iPads have no mute switch), and the audio sleeps while the app is put away
    try { PX.Sound.muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { /* default on */ }
    document.addEventListener('visibilitychange', () => { try { if (document.hidden) { if (PX.Sound.suspend) PX.Sound.suspend(); } else if (PX.Sound.resume) PX.Sound.resume(); } catch (e) { /* optional */ } });
    // can this device save at all? (blocked website data, a full phone…)
    try { localStorage.setItem('pvzg:probe', '1'); localStorage.removeItem('pvzg:probe'); } catch (e) { saveWarning('This device is blocking the game from saving.'); }
    // a save that had to be repaired or brought back from an automatic backup: tell a grown-up what happened
    const ln = PS.loadNote;
    if (ln) {
      const who = E(PS.players.isTesting() ? 'This' : ((PS.players.current() || {}).name || 'This player') + '’s');
      const html = ln.kind === 'repaired' ? `<p>${who} saved game had a small problem, so the game fixed it. Everything else is safe.</p>`
        : ln.kind === 'snapshot' ? `<p>${who} saved game couldn't be opened, so the game brought back its automatic backup from ${E(when(ln.at))}.</p>`
          : `<p>${who} saved game couldn't be opened and there was no automatic backup yet, so a new game started. If you have a backup code, restore it in Backups.</p>`;
      modal({ eyebrow: 'For grown-ups', title: 'We looked after a saved game', html: html + '<p>A copy of the old save was kept. You can find it in Backups.</p>',
        buttons: [{ label: 'Open Backups', onClick: () => { setTimeout(backupPanel, 0); } }, { label: 'OK', kind: 'primary' }] });
      PS.clearLoadNote();
    }
    // a new garden starts by picking one of three plants (the other two are early prizes)
    const welcome = () => {
      if (PS.S.starter || PS.S.sprouts.length) return;
      if (open || queue.some(q => q.starter)) return;
      modal({ starter: true, eyebrow: 'Welcome to PVZ Garden', title: 'Pick your first plant', dismiss: false,
        html: '<p>Grow it, collect elements, evolve it, then race and battle the zombies!</p><div class="st-list"></div>', buttons: [],
        mount(card, close) {
          card.querySelector('.modal-btns').hidden = true;
          const box = card.querySelector('.st-list');
          for (const id of D.STARTERS) {
            const P = D.PLANTS[id], b = document.createElement('button'); b.className = 'st-card'; b.type = 'button';
            b.innerHTML = `<canvas class="px"></canvas><span><b class="px-title">${E(P.name)}</b><small>${E(P.blurb)}</small><i>${E(D.ROLES[P.role].label)} · evolves into ${E(P.names[1])} and ${E(P.names[2])}</i></span>`;
            drawSproutTo(b.querySelector('canvas'), { species: id, stage: 0 }, { eyes: 'happy', mouth: 'open', arms: 'up' });
            b.onclick = () => {
              PX.Sound.play('plant'); state.pickStarter(id); close(); refresh();
              modal({ eyebrow: 'Great pick!', title: `${E(P.name)} seeds`, sprite: PX.item('egg', 'normal:' + id), html: '<p>Your seed packet is waiting in the Front Yard. <b>Tap it to water it and plant it!</b></p>', buttons: [{ label: "Let's grow!", kind: 'primary' }] });
            };
            box.appendChild(b);
          }
        } });
    };
    PS.ui.welcome = welcome;
    // the title menu: a Music button beside Sound (added each time it opens; see addMusicButton)
    if (PS.ui.mainMenu && !PS.ui.mainMenu._pv) { const mm = PS.ui.mainMenu; PS.ui.mainMenu = function (o) { const r = mm.apply(this, arguments); try { addMusicButton(); menuMusic(); } catch (e) { console.error(e); } return r; }; PS.ui.mainMenu._pv = true; }
    let skipMenu = false;
    try { skipMenu = sessionStorage.getItem('pvzg:skipMenu') === '1'; sessionStorage.removeItem('pvzg:skipMenu'); } catch (e) { /* blocked */ }
    if (PS.players.isTesting() || skipMenu || !PS.ui.mainMenu) { PS.players.touch && PS.players.touch(); welcome(); }
    else PS.ui.mainMenu({ launch: true });
    $('playerChip').onclick = () => { PX.Sound.play('tick'); PS.ui.mainMenu(); };
    bootDone = true; // (after the title menu had its chance to open: the daily gift waits for it to close)
  }

  // ---------------- shared moments: celebrate, wipe, fx, hub music ----------------
  // Every screen uses these (callers guard them: `PS.ui.celebrate ? PS.ui.celebrate(o) : PS.ui.modal(…)`), so big moments look
  // and sound the same everywhere. Everything is made per moment and thrown away after (no caches), nothing here delays the
  // boot, and prefers-reduced-motion is kept: fades and count-ups stay, big motion (rays, confetti, bars, flying coins) goes.
  const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const audio = fn => { try { if (window.PX && PX.Music) fn(PX.Music, PX.Cry); } catch (e) { /* sound is optional */ } };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  // a pixel-art canvas shown crisp: its CSS size is the bitmap times a whole number (device pixels for hi-res sprites), as
  // close to `want` CSS px tall as fits; the snapper leaves it alone
  function crispScale(c, want, dev) {
    const dpr = dev ? window.devicePixelRatio || 1 : 1, w = Math.max(1, c.width), h = Math.max(1, c.height), n = Math.max(1, Math.floor(want * dpr / h));
    c.style.width = (w * n / dpr) + 'px'; c.style.height = (h * n / dpr) + 'px'; c.dataset.nosnap = '';
  }
  // Illustrated (hi-res) sprites: canvases finer than 2 fine px per art px (art-hd-loader.js returns .k = 8). crispScale only ever
  // enlarges a bitmap, so a 256-px sheet frame came out several times too big in pop-ups. hdFit shows one at exactly the size the
  // pixel sprite gets there (its art size, PX.artW / artH, at 2 fine px per art px times a whole number of device px, as close
  // to `want` CSS px tall as fits), redrawn smoothly at that device resolution. Pixel art (k <= 2) never comes through here.
  function isHD(src) { return !!src && (src.k || 1) > 2; } // (a declaration, so paint() can use it while app.js is still loading)
  function hdFit(c, src, want) {
    const dpr = window.devicePixelRatio || 1, aw = PX.artW(src), ah = PX.artH(src), n = Math.max(1, Math.floor(want * dpr / (ah * 2)));
    c.width = Math.max(1, Math.round(aw * 2 * n)); c.height = Math.max(1, Math.round(ah * 2 * n));
    const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(src, 0, 0, src.width, src.height, 0, 0, c.width, c.height);
    c.style.width = (c.width / dpr) + 'px'; c.style.height = (c.height / dpr) + 'px'; c.style.imageRendering = 'auto'; c.dataset.nosnap = '';
    hdWait(c, src, () => hdFit(c, src, want));
  }
  // A copy made while the sprite still showed the code art (its sheet was loading: src.hdPending, art-hd-loader.js) is drawn
  // again once, when the loader announces the sheet ('pvz-hd-art'). Copies of finished sprites are never tracked.
  // (the map lives on the function, a hoisted declaration, so paint() can run before this part of app.js has loaded)
  function hdWait(target, src, redo) { const m = hdWait.m || (hdWait.m = new Map()); if (src && src.hdPending) m.set(target, { src, redo }); else if (m.size) m.delete(target); }
  window.addEventListener('pvz-hd-art', () => {
    const m = hdWait.m; if (!m) return;
    for (const [c, w] of [...m]) {
      if (!c.isConnected) { m.delete(c); continue; } // (a pop-up that has closed)
      if (w.src.hdPending) continue; // (another sheet arrived: this one is still loading)
      m.delete(c); try { w.redo(); } catch (e) { /* the code art stays */ }
    }
  });
  // a canvas showing an illustrated sprite at a CSS size set elsewhere (lists, cards, the HUD chip) is shrunk smoothly, not pixelated
  function hdLook(canvas, src) {
    const want = isHD(src) ? 'auto' : '';
    if (canvas.style && canvas.style.imageRendering !== want) canvas.style.imageRendering = want;
  }
  const eventOn = () => { try { return !!(PS.event && typeof PS.event.active === 'function' && PS.event.active()); } catch (e) { return false; } };
  // hub music for the screen being shown: the title menu has its own tune, the Garden follows the game clock (and the Halloween
  // event), the Arcade has its own, every other hub plays the town theme. Scenes call PS.ui.music() when they come back to their
  // menu after a battle, race or match; go() calls it on every screen change (before the scene's show(), which may start its own).
  function music() {
    audio(M => {
      if (PS.ui.menuOpen) { M.play('title'); return; }
      if (current === 'garden' && window.__garden && window.__garden.raid) return; // (a zombie attack plays its own track)
      M.play(current === 'garden' ? (eventOn() ? 'halloween' : PS.clock.isNight() ? 'garden-night' : 'garden-day') : current === 'arcade' ? 'arcade' : 'town');
    });
  }
  let menuWas = null; // (the title menu opening or closing changes the music: checked with the top bar, twice a second)
  function menuMusic() { const m = !!PS.ui.menuOpen; if (m !== menuWas) { const first = menuWas === null; menuWas = m; if (!first || m) music(); } }

  // PS.ui.celebrate(o) -> Promise, resolved when it closes. A full-screen reward moment: a dark lawn-green backdrop, turning sun
  // rays, confetti and leaves, a big plant / zombie / icon popping in, a Luckiest Guy title, up to 4 reward tiles and one button.
  // o = { kind:'trophy'|'unlock'|'hatch'|'evolve'|'legend'|'gift'|'star'|'levelup'|'generic', eyebrow, title, sub (plain text),
  //       sprite: a plant look {species, stage, …} or a plant, zombie: a zombie id, icon:<canvas>, jingle (id, or false for none;
  //       a default per kind), cry:true, tiles:[{icon:<canvas>|null, value:'+200', label:'Coins'}], button:'Great!',
  //       hold:800 (taps ignored that long), wait:true (wait for hold(false) like a normal pop-up), onClose }
  // It queues behind an open pop-up but not behind hold(): a scene that calls it (battle or race results) wants it now. It sits
  // above every scene canvas (z-index 9000).
  const CEL_JINGLE = { trophy: 'trophy', unlock: 'unlock', hatch: 'hatch', evolve: 'evolved', legend: 'rare', gift: 'daily', star: 'star', levelup: 'levelup', generic: 'item' };
  function celebrate(o) {
    o = Object.assign({}, o);
    return new Promise(done => { queue.push({ cel: o, force: !o.wait, done }); pumpModals(); });
  }
  function heroCanvas(o, want) {
    if (o.zombie) { const src = PX.sprig({ zombie: String(o.zombie) }, {}), c = document.createElement('canvas'); c.className = 'px'; if (isHD(src)) { hdFit(c, src, want); return c; } c.width = src.width; c.height = src.height; paint(c, src); crispScale(c, want, !!src.k); return c; }
    if (o.sprite && (o.sprite.species || o.sprite.stats)) {
      const c = document.createElement('canvas'), P = o.pose || { eyes: 'happy', mouth: 'open', arms: 'up' }; c.className = 'px';
      const src = PX.sprig(o.sprite.stats ? state.lookOf(o.sprite) : o.sprite, P);
      if (isHD(src)) { hdFit(c, src, want); return c; }
      drawSproutTo(c, o.sprite, P); crispScale(c, want, true); return c;
    }
    if (o.icon && o.icon.getContext) { const c = document.createElement('canvas'); c.className = 'px'; if (isHD(o.icon)) { hdFit(c, o.icon, Math.min(want, 168)); return c; } c.width = o.icon.width; c.height = o.icon.height; paint(c, o.icon); crispScale(c, Math.min(want, 168), !!o.icon.k); return c; }
    return null;
  }
  function showCelebrate(item) {
    const o = item.cel, root = $('modalRoot'), rm = reduced(), kind = CEL_JINGLE[o.kind] ? o.kind : 'generic';
    const tiles = Array.isArray(o.tiles) ? o.tiles.filter(Boolean).slice(0, 4) : [];
    root.innerHTML = `<div class="pv-cel k-${kind}${rm ? ' rm' : ''}" role="dialog" aria-modal="true">
      <div class="pv-cel-rays" aria-hidden="true"></div><canvas class="pv-cel-fx" aria-hidden="true"></canvas>
      <div class="pv-cel-box"><div class="pv-cel-hero"></div>
        ${o.eyebrow ? `<div class="pv-cel-eb">${E(o.eyebrow)}</div>` : ''}
        ${o.title ? `<h1 class="pv-cel-title">${E(o.title)}</h1>` : ''}${o.sub ? `<p class="pv-cel-sub">${E(o.sub)}</p>` : ''}
        ${tiles.length ? `<div class="pv-res-tiles">${tiles.map(t => `<div class="pv-res-tile">${t.icon ? '<canvas class="px"></canvas>' : ''}<b class="num">${E(t.value == null ? '' : t.value)}</b><small>${E(t.label || '')}</small></div>`).join('')}</div>` : ''}
        <button class="btn go pv-cel-ok" type="button">${E(o.button || 'Great!')}</button></div></div>`;
    const layer = root.firstElementChild, hero = layer.querySelector('.pv-cel-hero'), okBtn = layer.querySelector('.pv-cel-ok');
    const want = Math.max(96, Math.min(window.innerHeight * 0.3, 288));
    try { const c = heroCanvas(o, want); if (c) hero.appendChild(c); else hero.remove(); } catch (e) { console.error(e); hero.remove(); }
    layer.querySelectorAll('.pv-res-tile').forEach((el, i) => {
      const t = tiles[i], c = el.querySelector('canvas'), b = el.querySelector('b');
      if (c && t.icon && t.icon.getContext) { if (isHD(t.icon)) hdFit(c, t.icon, 32); else { c.width = t.icon.width; c.height = t.icon.height; paint(c, t.icon); crispScale(c, 32, !!t.icon.k); } }
      const m = /^([+]?)(\d[\d,]*)$/.exec(String(t.value == null ? '' : t.value).trim()), to = m ? +m[2].replace(/,/g, '') : 0;
      if (to > 0) { b.textContent = m[1] + '0'; setTimeout(() => countUp(b, 0, to, 700, { prefix: m[1], sound: /coin/i.test(t.label || '') }), 450 + i * 140); }
    });
    const jg = o.jingle === undefined ? CEL_JINGLE[kind] : o.jingle;
    if (jg) audio(M => M.jingle(jg));
    if (o.cry) setTimeout(() => audio((M, C) => {
      if (!C) return;
      if (o.zombie) C.play(String(o.zombie), { zombie: true });
      else if (o.sprite && o.sprite.species) C.play(o.sprite.species, { stage: o.sprite.stage | 0 });
    }), rm ? 0 : 320);
    let fx = null, closed = false;
    const close = () => {
      if (closed) return; closed = true; if (fx) fx.stop();
      if (layer.isConnected) root.innerHTML = '';
      if (open === item) open = null;
      try { if (o.onClose) o.onClose(); } catch (e) { console.error(e); }
      item.done(); pumpModals();
    };
    const holdMs = o.hold == null ? 800 : Math.max(0, +o.hold || 0), t0 = performance.now();
    if (holdMs) { okBtn.classList.add('wait'); setTimeout(() => okBtn.classList.remove('wait'), holdMs); }
    // a tap anywhere continues, once the first moment has played (so a mashed button doesn't skip it)
    layer.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (performance.now() - t0 < holdMs) return; PX.Sound.play('pop'); close(); });
    item.kill = close;
    if (!rm) fx = celFx(layer, hero.isConnected ? hero : okBtn, close);
  }
  // confetti and little leaves bursting from the picture and sun sparkles round it, on the moment's own canvas while they last
  // (then it's emptied). Returns { stop }. onGone runs if the moment was taken off the page from outside (closeModal()).
  function celFx(layer, anchor, onGone) {
    const cv = layer.querySelector('.pv-cel-fx'); let raf = 0;
    const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; cv.width = 0; cv.height = 0; };
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = layer.clientWidth, H = layer.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const x = cv.getContext('2d'), lr = layer.getBoundingClientRect(), hr = anchor.getBoundingClientRect();
    const cx = hr.left - lr.left + hr.width / 2, cy = hr.top - lr.top + hr.height / 2, R = Math.max(hr.width, hr.height) * 0.62 + 10;
    const COLS = ['#ffd23a', '#7cc94a', '#e04848', '#fff6d8', '#4fb0e6', '#ff9a4a', '#5cb43a'];
    const bits = Array.from({ length: 40 }, (_, i) => { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, v = 420 + Math.random() * 460; return { x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 14, w: 5 + Math.random() * 4, h: 8 + Math.random() * 5, c: COLS[i % COLS.length], leaf: i % 4 === 0, d: 0.08 + Math.random() * 0.25 }; });
    const sparks = Array.from({ length: 12 }, (_, i) => ({ a: i / 12 * 6.283 + Math.random() * 0.3, r: R * (0.8 + Math.random() * 0.35), p: Math.random(), s: 3 + Math.random() * 3 }));
    let last = performance.now(), age = 0;
    const tick = now => {
      raf = 0;
      if (!layer.isConnected) { stop(); if (onGone) onGone(); return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now; age += dt;
      x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
      let alive = 0;
      for (const b of bits) {
        if (age < b.d) { alive++; continue; }
        b.vy += 900 * dt; b.vx *= 1 - 0.9 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.r += b.vr * dt;
        if (b.y > H + 20) continue;
        alive++; x.save(); x.translate(b.x, b.y); x.rotate(b.r); x.scale(Math.cos(b.r * 1.7), 1);
        if (b.leaf) { x.fillStyle = '#5cb43a'; x.beginPath(); x.ellipse(0, 0, 3.5, 7, 0, 0, 6.283); x.fill(); x.fillStyle = '#2f7a2e'; x.fillRect(-0.6, -6, 1.2, 12); }
        else { x.fillStyle = b.c; x.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); }
        x.restore();
      }
      if (age < 2.4) { // little four-point sun sparkles twinkling round the picture
        alive++; x.fillStyle = '#fff6b8';
        for (const s of sparks) { const k = Math.sin(Math.max(0, age * 5 - s.p * 6)); if (k <= 0) continue; const sx = cx + Math.cos(s.a) * s.r, sy = cy + Math.sin(s.a) * s.r, z = s.s * k; x.fillRect(sx - z, sy - 1, z * 2, 2); x.fillRect(sx - 1, sy - z, 2, z * 2); }
      }
      if (alive) raf = requestAnimationFrame(tick); else { cv.width = 0; cv.height = 0; }
    };
    raf = requestAnimationFrame(tick);
    return { stop };
  }

  // PS.ui.wipe(kind, mid) -> Promise. Covers the whole game, calls mid() once it's fully covered (swap scenes there; it may
  // return a promise, waited for up to 3 s), then reveals. kind: 'plain' (two ink bars), 'battle' (8 sliding bars), 'boss' (two
  // red flashes, then a swirl of wedges), 'arcade' (pixel tiles popping in, corner to corner). PS.ui.wipe(mid) = plain. Wipes
  // asked for together run one after another.
  let wipeChain = Promise.resolve();
  function wipe(kind, mid) {
    if (typeof kind === 'function') { mid = kind; kind = 'plain'; }
    const run = () => runWipe(String(kind || 'plain'), mid), p = wipeChain.then(run, run);
    wipeChain = p.catch(() => {});
    return p;
  }
  async function runWipe(kind, mid) {
    const rm = reduced(), app = $('app'), el = document.createElement('canvas'), INK = '#2b2024';
    const W = Math.max(1, app.clientWidth), H = Math.max(1, app.clientHeight), dpr = Math.min(2, window.devicePixelRatio || 1);
    el.className = 'pv-wipe'; el.setAttribute('aria-hidden', 'true'); el.width = Math.round(W * dpr); el.height = Math.round(H * dpr);
    app.appendChild(el);
    const x = el.getContext('2d'), ease = k => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
    const TS = 48, cols = Math.ceil(W / TS), rows = Math.ceil(H / TS);
    const draw = (p, fade) => {
      x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H); x.fillStyle = INK;
      if (fade) { x.globalAlpha = Math.max(0, Math.min(1, p)); x.fillRect(0, 0, W, H); x.globalAlpha = 1; return; }
      if (kind === 'boss') { // six wedges that grow while the whole thing turns
        const R = Math.hypot(W, H) / 2 + 4, rot = p * Math.PI * 1.5, sw = p * Math.PI / 3 + (p >= 1 ? 0.02 : 0);
        for (let j = 0; j < 6; j++) { const a = rot + j * Math.PI / 3; x.beginPath(); x.moveTo(W / 2, H / 2); x.arc(W / 2, H / 2, R, a, a + sw); x.closePath(); x.fill(); }
      } else if (kind === 'battle') { // 8 bars, from the left and the right in turn
        const bh = Math.ceil(H / 8);
        for (let i = 0; i < 8; i++) { const q = Math.max(0, Math.min(1, p * 1.25 - i * 0.03)), w = W * q; x.fillRect(i % 2 ? W - w : 0, i * bh, w, bh + 1); }
      } else if (kind === 'arcade') { // square tiles that grow from the top-left corner to the bottom-right
        const span = cols + rows;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const q = Math.max(0, Math.min(1, p * 1.7 - (r + c) / span * 0.7)); if (!q) continue;
          const s = Math.ceil(TS * q) + (q >= 1 ? 1 : 0); x.fillRect(c * TS + (TS - s) / 2, r * TS + (TS - s) / 2, s, s);
        }
      } else { const h = Math.ceil(H / 2 * p) + (p >= 1 ? 1 : 0); x.fillRect(0, 0, W, h); x.fillRect(0, H - h, W, h); }
    };
    const anim = (ms, f) => new Promise(res => { const a0 = performance.now(); const step = now => { const k = Math.min(1, (now - a0) / ms); try { f(k); } catch (e) { /* keep going */ } if (k < 1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); });
    try {
      if (rm) await anim(160, k => draw(k, true));
      else {
        if (kind === 'boss') await anim(330, k => { x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, el.width, el.height); if (k < 0.25 || (k > 0.5 && k < 0.75)) { x.fillStyle = 'rgba(224,72,72,.85)'; x.fillRect(0, 0, el.width, el.height); } });
        await anim(kind === 'battle' || kind === 'arcade' ? 380 : kind === 'boss' ? 560 : 240, k => draw(ease(k)));
      }
      draw(1, rm);
      try { const r = typeof mid === 'function' ? mid() : null; if (r && typeof r.then === 'function') await Promise.race([r, sleep(3000)]); } catch (e) { console.error(e); reportError(e, 'wipe'); }
      await sleep(rm ? 40 : 90);
      if (rm) await anim(180, k => draw(1 - k, true));
      else await anim(kind === 'boss' ? 340 : 260, k => draw(1 - ease(k)));
    } finally { el.width = 0; el.height = 0; el.remove(); }
  }

  // ---- PS.ui.fx: small reward helpers ----
  // countUp(el, from, to, ms=700, {prefix, sound}) -> Promise: the number in el rolls up (a coin tick every 80 ms unless sound:false)
  function countUp(el, from, to, ms, o) {
    o = o || {};
    return new Promise(res => {
      if (!el) { res(); return; }
      from = +from || 0; to = +to || 0; ms = ms == null ? 700 : Math.max(0, +ms || 0);
      const pre = o.prefix || '', fmt = n => pre + Math.round(n).toLocaleString(), a0 = performance.now();
      if (!ms || from === to) { el.textContent = fmt(to); res(); return; }
      let tk = 0;
      const step = now => {
        const k = Math.min(1, (now - a0) / ms);
        el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - k, 3)));
        if (o.sound !== false && k < 1 && now - tk > 80) { tk = now; PX.Sound.play('coin'); }
        if (k < 1 && el.isConnected) requestAnimationFrame(step); else { el.textContent = fmt(to); res(); }
      };
      requestAnimationFrame(step);
    });
  }
  // coinsFly(fromElOrXY, n=8) -> Promise: coins fly from an element (or {x,y} / [x,y] in page px) to the top bar's coin pill,
  // which bumps. With the top bar hidden (a race or battle) it does nothing; with reduced motion the pill just bumps.
  function coinsFly(from, n) {
    n = Math.max(1, Math.min(12, n == null ? 8 : n | 0));
    return new Promise(res => {
      const pill = $('coinPill'), app = $('app'), pr = pill ? pill.getBoundingClientRect() : null;
      if (!pr || !pr.width || !chromeOn) { res(); return; }
      if (reduced()) { bumpCoins(); res(); return; }
      const ar = app.getBoundingClientRect();
      let fx0 = ar.left + ar.width / 2, fy0 = ar.top + ar.height / 2;
      if (from && from.getBoundingClientRect) { const r = from.getBoundingClientRect(); fx0 = r.left + r.width / 2; fy0 = r.top + r.height / 2; }
      else if (Array.isArray(from)) { fx0 = +from[0]; fy0 = +from[1]; }
      else if (from && typeof from.x === 'number') { fx0 = from.x; fy0 = from.y; }
      fx0 -= ar.left; fy0 -= ar.top;
      const src = icon('coin'), S = src.width * 2, tx = pr.left - ar.left + 14 - S / 2, ty = pr.top - ar.top + pr.height / 2 - S / 2;
      const layer = document.createElement('div'); layer.className = 'pv-fly'; app.appendChild(layer);
      const coins = Array.from({ length: n }, (_, i) => {
        const c = document.createElement('canvas'); c.className = 'px'; c.width = src.width; c.height = src.height; c.dataset.nosnap = '';
        c.getContext('2d').drawImage(src, 0, 0); c.style.width = c.style.height = S + 'px'; c.style.opacity = 0; layer.appendChild(c);
        const sx = fx0 - S / 2 + (Math.random() - 0.5) * 40, sy = fy0 - S / 2 + (Math.random() - 0.5) * 26;
        return { c, d: i * 40, sx, sy, mx: (sx + tx) / 2 + (Math.random() - 0.5) * 80, my: Math.min(sy, ty) - 60 - Math.random() * 60 };
      });
      const a0 = performance.now(); let landed = 0;
      const step = now => {
        let busy = 0;
        for (const k of coins) {
          if (k.done) continue;
          const u = (now - a0 - k.d) / 500;
          if (u < 0) { busy++; continue; }
          if (u >= 1) { k.done = true; k.c.remove(); landed++; if (landed === 1 || landed === n) bumpCoins(); continue; }
          busy++;
          const e = u * (0.55 + 0.45 * u), a = (1 - e) * (1 - e), b = 2 * (1 - e) * e, c2 = e * e;
          k.c.style.opacity = 1; k.c.style.transform = `translate3d(${a * k.sx + b * k.mx + c2 * tx}px,${a * k.sy + b * k.my + c2 * ty}px,0)`;
        }
        if (busy && layer.isConnected) requestAnimationFrame(step); else { layer.remove(); res(); }
      };
      requestAnimationFrame(step);
    });
  }
  // banner(text, {tone:'go'|'info'|'warn', ms:1300}) -> Promise: a big band across the middle ("GO!", "Wave 3 of 5!")
  function banner(text, o) {
    o = o || {};
    return new Promise(res => {
      const el = document.createElement('div'), tone = ['go', 'info', 'warn'].includes(o.tone) ? o.tone : 'go';
      el.className = `pv-bnr t-${tone}${/\d/.test(String(text)) ? ' num' : ''}${reduced() ? ' rm' : ''}`; el.setAttribute('role', 'status'); // (.num: the title font's 2 and 8 look alike)
      el.innerHTML = `<b>${E(text)}</b>`; $('app').appendChild(el);
      setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); res(); }, 280); }, Math.max(300, +o.ms || 1300));
    });
  }

  // ---------------- evolution: a scene of its own (replaces the old "became a …" pop-up) ----------------
  // "Whoa! Peashooter is evolving!" -> glowing silhouettes of the old and new forms swap faster and faster (2 to 12 a second) ->
  // a white flash -> the new form in colour with confetti, its voice and a jingle -> "Hooray!" and its new moves. Queued like a
  // pop-up (it waits until a race or battle is over). A tap skips ahead after 1.5 s, once this player has seen that evolution
  // (remembered in the optional PS.S.journey.evo).
  function showEvolution(item) {
    const e = item.evo, s = e.s, rm = reduced(), root = $('modalRoot'), fi = state.formInfo(s);
    const newL = state.lookOf(s), oldL = Object.assign({}, newL, { stage: Math.max(0, (e.stage == null ? s.stage : e.stage | 0) - 1) });
    const J = journey(), seenEvo = J.evo && typeof J.evo === 'object' ? J.evo : (J.evo = {}), key = s.species + ':' + (e.stage == null ? s.stage : e.stage), seen = !!seenEvo[key];
    seenEvo[key] = 1; PS.save();
    const oldName = E(e.name || s.name), formName = E(fi.name);
    const moves = (fi.moves || []).map(id => D.MOVES[id]).filter(Boolean).map(m => `<span class="chip-el" style="background:${(D.ELEMENTS[m.el] || D.ELEMENTS.normal).color}">${E(m.name)}</span>`).join('');
    const last = s.stage >= 2;
    root.innerHTML = `<div class="pv-cel pv-evo${rm ? ' rm' : ''}" role="dialog" aria-modal="true">
      <div class="pv-cel-rays" aria-hidden="true"></div><canvas class="pv-cel-fx" aria-hidden="true"></canvas><div class="pv-evo-flash" aria-hidden="true"></div>
      <div class="pv-cel-box"><div class="pv-cel-hero pv-evo-hero"><canvas class="px"></canvas></div>
        <h1 class="pv-cel-title" hidden>${formName}!</h1>
        <p class="pv-evo-say">Whoa! ${oldName} is evolving!</p>
        <div class="pv-evo-moves" hidden>${moves ? `<small>New moves</small>${moves}` : ''}</div>
        <button class="btn go pv-cel-ok" type="button" hidden>Hooray!</button></div></div>`;
    const layer = root.firstElementChild, hero = layer.querySelector('.pv-evo-hero'), cv = hero.querySelector('canvas'), say = layer.querySelector('.pv-evo-say');
    let A = null, B = null;
    try { A = PX.sprig(oldL, { eyes: 'happy' }); B = PX.sprig(newL, { eyes: 'happy', mouth: 'open', arms: 'up' }); } catch (err) { console.error(err); }
    // Illustrated forms (isHD) are laid out by art size (PX.artW / artH) at the scale the pixel forms get, drawn smoothly at device
    // resolution; a pixel form shown beside one is scaled by the same whole number, so it stays crisp. Pixel forms alone: as before.
    const evoWant = Math.max(96, Math.min(window.innerHeight * 0.32, 300)), hd = isHD(A) || isHD(B), dpr = window.devicePixelRatio || 1;
    const aw = Math.max(A ? PX.artW(A) : 32, B ? PX.artW(B) : 32), ah = Math.max(A ? PX.artH(A) : 32, B ? PX.artH(B) : 32), n = hd ? Math.max(1, Math.floor(evoWant * dpr / (ah * 2))) : 1;
    const W = hd ? aw * 2 * n : Math.max(A ? A.width : 64, B ? B.width : 64), H = hd ? ah * 2 * n : Math.max(A ? A.height : 64, B ? B.height : 64);
    cv.width = W; cv.height = H;
    if (hd) { cv.style.width = (W / dpr) + 'px'; cv.style.height = (H / dpr) + 'px'; cv.style.imageRendering = 'auto'; cv.dataset.nosnap = ''; }
    else crispScale(cv, evoWant, true);
    const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
    const drawForm = (src, glow) => {
      x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, W, H); if (!src) return;
      const dw = hd ? PX.artW(src) * 2 * n : src.width, dh = hd ? PX.artH(src) * 2 * n : src.height;
      x.imageSmoothingEnabled = isHD(src); if (x.imageSmoothingEnabled) x.imageSmoothingQuality = 'high';
      try { x.drawImage(src, 0, 0, src.width, src.height, Math.round((W - dw) / 2), H - dh, dw, dh); } catch (err) { return; }
      if (glow) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = '#fff8c8'; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over'; }
    };
    audio(M => M.play('evolve'));
    let raf = 0, fx = null, phase = 0, closed = false, t0 = performance.now(), endT = 0;
    const FLASH = rm ? 1200 : 4000;
    const finish = () => { // the new form, in colour
      if (phase >= 2) return; phase = 2; endT = performance.now();
      layer.querySelector('.pv-evo-flash').classList.add('on');
      PX.Sound.play('evolve');
      audio((M, C) => { music(); M.jingle('evolved'); if (C) setTimeout(() => { try { C.play(s.species, { stage: s.stage }); } catch (err) { /* optional */ } }, 250); });
      say.textContent = last ? `Hooray! ${e.name || s.name} evolved into ${fi.name}! Its final form!` : `Hooray! ${e.name || s.name} evolved into ${fi.name}!`;
      layer.classList.add('done'); layer.querySelector('.pv-cel-title').hidden = false; layer.querySelector('.pv-evo-moves').hidden = !moves;
      const ok = layer.querySelector('.pv-cel-ok'); ok.hidden = false; ok.classList.add('wait'); setTimeout(() => ok.classList.remove('wait'), 700);
      if (!rm) fx = celFx(layer, hero, close);
    };
    const close = () => {
      if (closed) return; closed = true; if (raf) cancelAnimationFrame(raf); raf = 0; if (fx) fx.stop();
      cv.width = 0; cv.height = 0;
      if (layer.isConnected) root.innerHTML = '';
      if (open === item) open = null;
      if (phase < 2) music();
      pumpModals();
    };
    const tick = now => {
      raf = 0;
      if (!layer.isConnected) { close(); return; }
      const t = now - t0;
      if (phase < 2) {
        if (t >= FLASH) finish();
        else if (t < 1000 || rm) drawForm(A, false);
        else { if (!phase) { phase = 1; layer.classList.add('glow'); } const u = (t - 1000) / 3000, cyc = 6 * u + 15 * u * u; drawForm(Math.floor(cyc * 2) % 2 ? B : A, true); }
      }
      if (phase >= 2) { drawForm(B, false); return; } // (the last picture stays: no need to keep drawing it)
      raf = requestAnimationFrame(tick);
    };
    item.kill = close;
    raf = requestAnimationFrame(tick);
    layer.addEventListener('click', ev => {
      ev.preventDefault(); ev.stopPropagation();
      const now = performance.now();
      if (phase < 2) { if (seen && now - t0 > 1500) finish(); return; }
      if (now - endT < 700) return;
      PX.Sound.play('pop'); close();
    });
  }

  // ---------------- next goal: a small pill in the top bar (icon only on a phone); tap it to go there ----------------
  // A short script first (the first-session loop), then the next challenge from the Battle screen (PS.battle.nextChallenge). Each
  // scripted goal pays a few coins once (coins fly from the chip). Saved in the optional PS.S.journey = { done:{id:time}, pet, fed,
  // evo } (made when first needed; a game from before this update starts with the goals it already reached marked done, unpaid).
  const nextCh = () => { try { return PS.battle && typeof PS.battle.nextChallenge === 'function' ? PS.battle.nextChallenge() : null; } catch (e) { return null; } };
  function firstTrophy() {
    try { if (PS.battle && typeof PS.battle.trophies === 'function') { const list = PS.battle.trophies(); if (Array.isArray(list)) return list.some(t => t && t.got); } } catch (e) { /* the league list below */ }
    const L = D.LEAGUES && D.LEAGUES[0]; return !!(L && (PS.S.progress.leagues[L.id] || {}).cleared);
  }
  const GOALS = [
    { id: 'plant', label: 'Plant your seeds!', ic: 'egg', to: 'garden', coins: 100, done: () => PS.S.sprouts.length > 0 },
    { id: 'pet', label: 'Pet your plant!', ic: 'garden', to: 'garden', coins: 50, done: J => !!J.pet },
    { id: 'feed', label: 'Feed it a fruit!', ic: 'fruit', to: 'garden', coins: 50, done: J => !!J.fed },
    { id: 'battle', label: 'Win a battle!', ic: 'battle', to: 'battle', coins: 150, ch: true, done: () => (PS.S.totals.battleWins || 0) > 0 },
    { id: 'race', label: 'Win a race!', ic: 'race', to: 'race', coins: 150, done: () => (PS.S.totals.raceWins || 0) > 0 },
    { id: 'evolve', label: 'Evolve a plant!', ic: 'garden', to: 'garden', coins: 150, done: () => PS.S.sprouts.some(s => s.stage > 0) },
    { id: 'trophy', label: 'Win a trophy!', ic: 'trophy', to: 'battle', coins: 200, ch: true, done: () => firstTrophy() },
  ];
  const goalDone = (g, J) => { try { return !!g.done(J); } catch (e) { return false; } };
  function journey() {
    let J = PS.S.journey;
    if (!J || typeof J !== 'object' || Array.isArray(J)) {
      J = PS.S.journey = { done: {} };
      const T = PS.S.totals || {}, old = PS.S.sprouts.length > 1 || (T.battles || 0) + (T.races || 0) > 0;
      if (old) for (const g of GOALS) if (g.id === 'pet' || g.id === 'feed' || goalDone(g, J)) J.done[g.id] = 1;
      PS.save();
    }
    if (!J.done || typeof J.done !== 'object' || Array.isArray(J.done)) J.done = {};
    return J;
  }
  PS.on('sprout:pet', () => { try { const J = journey(); if (!J.pet) { J.pet = 1; PS.save(); } } catch (e) { /* optional */ } });
  PS.on('sprout:fed', () => { try { const J = journey(); if (!J.fed) { J.fed = 1; PS.save(); } } catch (e) { /* optional */ } });
  const chLabel = c => { const l = String(c && c.label || '').trim(); return !l ? '' : /[!?.]$/.test(l) ? l : `${l}!`; };
  function goalIcon(ic) {
    if (ic === 'egg') return PX.item('egg', 'normal:' + (PS.S.starter || 'peashooter'));
    if (ic === 'fruit') { try { return PX.item('fruit', 'plantfood'); } catch (e) { return icon('garden'); } }
    return icon(ic);
  }
  let goalNow = null, goalKey = '', goalT = 0;
  function goalTick(force) {
    const el = $('goalChip'); if (!el || !PS.S || !PS.S.totals) return;
    if (!force && performance.now() < goalT) return; goalT = performance.now() + 1500;
    const J = journey(); let g = GOALS.find(q => !J.done[q.id]) || null;
    // a goal reached: pay it once, then move on (not under a pop-up or the title menu, so the moment is seen)
    if (g && goalDone(g, J) && chromeOn && !held && !open && !queue.length && !PS.ui.menuOpen) {
      J.done[g.id] = Date.now(); PS.save();
      if (g.coins) { state.addCoins(g.coins, 'goal'); coinsFly(el, 6); }
      toast(`Goal done! +${g.coins} coins`, 2600); PX.Sound.play('chime');
      g = GOALS.find(q => !J.done[q.id]) || null;
    }
    let show = null;
    if (g) { const c = g.ch ? nextCh() : null; show = { label: (c && chLabel(c)) || g.label, ic: g.ic, go: c && typeof c.go === 'function' ? () => c.go() : () => go(g.to) }; }
    else { const c = nextCh(); if (c && chLabel(c)) show = { label: chLabel(c), ic: 'battle', go: () => c.go() }; }
    goalNow = show;
    const k = show ? show.label + '|' + show.ic : '';
    if (k === goalKey) return; goalKey = k;
    el.hidden = !show; if (!show) return;
    el.querySelector('span').textContent = show.label; el.setAttribute('aria-label', 'Next goal: ' + show.label);
    try { paint(el.querySelector('canvas'), goalIcon(show.ic)); } catch (e) { /* no icon */ }
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  }

  // ---------------- welcome back + a daily gift from Crazy Dave ----------------
  // The first time the game is opened on a new day: Crazy Dave waves "Welcome back, NAME!" with a gift that takes turns (coins, a
  // seed packet, a Plant Food). After 6 hours away on the same day, just a hello. No streaks, no "you missed a day". Saved in the
  // optional PS.S.daily = { gift: time, at: time, n }. (Not for test saves, so test runs start clean; &daily forces it there.)
  // It waits until the game is really being played: boot finished (the title menu opens at the end of boot), the title menu is
  // closed and a player is picked, the Garden is on screen, and nothing else is up (no pop-up; no battle, race or zombie attack
  // holding pop-ups). One gift however many days were missed; it checks again when the app comes back after an hour away.
  let dailyDone = false, bootDone = false;
  document.addEventListener('visibilitychange', () => { if (!document.hidden && hiddenAt && Date.now() - hiddenAt > 3600e3) dailyDone = false; });
  function dailyTick() {
    if (dailyDone || !bootDone || PS.ui.menuOpen || current !== 'garden' || open || queue.length || held || !chromeOn || !PS.players.current()) return;
    dailyDone = true;
    if (!PS.S.sprouts.length || (PS.players.isTesting() && !/[?&]daily\b/.test(location.search))) return;
    const now = Date.now(), d = PS.S.daily && typeof PS.S.daily === 'object' && !Array.isArray(PS.S.daily) ? PS.S.daily : (PS.S.daily = {});
    const day = ts => new Date(ts || 0).toDateString(), away = now - (+d.at || 0), gift = day(d.gift) !== day(now);
    d.at = now; PS.save();
    const who = PS.players.isTesting() ? 'friend' : ((PS.players.current() || {}).name || 'friend');
    if (!gift) { if (away > 6 * 3600e3) toast(`Welcome back, ${who}!`, 2800); return; }
    const n = (+d.n || 0) % 3; d.gift = now; d.n = n + 1;
    let tile;
    if (n === 1) { const egg = state.addEgg('normal', 'Crazy Dave'); tile = { icon: PX.item('egg', 'normal:' + ((egg && egg.species) || PS.S.starter || 'peashooter')), value: '+1', label: 'Seed packet' }; }
    else if (n === 2 && D.FRUITS.plantfood) { state.addFruit('plantfood', 1); let ic = null; try { ic = PX.item('fruit', 'plantfood'); } catch (e) { /* no icon */ } tile = { icon: ic, value: '+1', label: D.FRUITS.plantfood.name }; }
    else { state.addCoins(150, 'daily'); tile = { icon: icon('coin'), value: '+150', label: 'Coins' }; }
    PS.save();
    let dave = null; try { dave = PX.crazyDave ? PX.crazyDave(1) : null; } catch (e) { /* no Dave art */ }
    const eggs = PS.S.eggs.length, partner = state.active();
    celebrate({ kind: 'gift', wait: true, eyebrow: 'Crazy Dave', title: `Welcome back, ${who}!`,
      sub: eggs ? `${eggs === 1 ? 'A seed packet is' : eggs + ' seed packets are'} waiting in the Garden. Here's a present!` : `${partner ? partner.name : 'Your garden'} missed you! Here's a present!`,
      icon: dave, sprite: dave ? null : partner || null, tiles: [tile], button: 'Thanks, Dave!', hold: 900 });
  }

  // ---------------- music on/off (the title menu shows it beside Sound; PX.Music.muted is kept per device by audio.js) ----------------
  function setMusic(on) { try { if (window.PX && PX.Music) { PX.Music.muted = !on; if (on) music(); } } catch (e) { /* optional */ } }
  const musicOn = () => { try { return !(window.PX && PX.Music && PX.Music.muted); } catch (e) { return true; } };
  // the title menu (menu.js) has a Sound button; a Music button is added beside it here, unless menu.js already has one
  function addMusicButton() {
    const snd = document.querySelector('.mm-sound'); if (!snd || !snd.parentElement) return;
    let b = snd.parentElement.querySelector('.mm-music, [data-a="music"]');
    if (!b) {
      b = snd.cloneNode(true); b.classList.remove('mm-sound'); b.classList.add('mm-music', 'pv-music'); b.removeAttribute('data-a'); b.dataset.pv = 'music';
      snd.after(b);
      b.addEventListener('click', ev => { ev.stopPropagation(); setMusic(!musicOn()); PX.Sound.play('tick'); paintMusic(b); toast(musicOn() ? 'Music on' : 'Music off', 1400); });
    }
    if (b.dataset.pv === 'music') paintMusic(b);
  }
  function paintMusic(b) {
    const on = musicOn(), c = b.querySelector('canvas'), sp = b.querySelector('span');
    if (c) paint(c, icon(on ? 'music' : 'nomusic'));
    if (sp) sp.textContent = on ? 'Music on' : 'Music off';
    b.setAttribute('aria-label', on ? 'Music is on. Tap to turn it off' : 'Music is off. Tap to turn it on');
  }

  // ---------------- garden maps ----------------
  // a garden map: a little picture of the lawn, its house and its colours (120 x 64 art px)
  function mapPreview(id) {
    const th = (PS.gardenMaps && (PS.gardenMaps[id] || PS.gardenMaps.frontyard)) || null, c = document.createElement('canvas');
    c.width = 240; c.height = 128; c.k = 2;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.scale(2, 2);
    if (!th) return c;
    const sky = th.sky || ['#9ed5f5', '#b6e0f7', '#cfeaf8', '#e6f5fa'];
    sky.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * 5, 120, 5); });
    const far = th.far || th.near || ['#a6d98b', '#7fbf6a'];
    g.fillStyle = far[0]; g.fillRect(0, 18, 120, 4); g.fillStyle = far[1] || far[0]; g.fillRect(0, 21, 120, 3);
    const T = th.tiles || th.grass || ['#96dc64', '#88d25a', '#6cbc46', '#62b03e'];
    for (let y = 24, r = 0; y < 64; y += 10, r++) for (let x = 0, q = 0; x < 120; x += 12, q++) { g.fillStyle = T[(r + q) % 2]; g.fillRect(x, y, 12, 10); }
    const W = th.water || ['#9fe6f7', '#5fcde4']; g.fillStyle = W[1]; g.beginPath(); g.moveTo(92, 24); g.lineTo(120, 24); g.lineTo(120, 64); g.lineTo(100, 64); g.closePath(); g.fill();
    g.fillStyle = W[0]; g.fillRect(104, 34, 6, 1); g.fillRect(110, 46, 5, 1);
    try { const h = th.facade && PX.pvzHouse ? PX.pvzHouse(th.facade) : null; if (h) { const w = PX.artW(h) * 0.62, hh = PX.artH(h) * 0.62; g.drawImage(h, -6, 50 - hh, w, hh); } } catch (e) { /* no house art yet */ }
    try { const props = (th.props || []).slice(0, 3); props.forEach(([kind], i) => { const p = PX.prop(kind, (D.GARDEN_MAPS[id] || {}).theme || 'day'); if (p) { const w = PX.artW(p), hh = PX.artH(p), k = Math.min(1, 18 / hh); g.drawImage(p, 50 + i * 15 - (w * k) / 2, 58 - hh * k, w * k, hh * k); } }); } catch (e) { /* no prop art yet */ }
    return c;
  }
  // choose where a map goes: pickMap(mapId) asks which garden should wear it; pickMap(null, garden) lists maps for that garden
  function pickMap(mapId, garden) {
    const st = state;
    if (mapId) {
      const M = D.GARDEN_MAPS[mapId]; if (!M || !st.ownsMap(mapId)) return;
      modal({ eyebrow: 'Garden map', title: `Where should the ${st.esc(M.name)} go?`, buttons: [{ label: 'Cancel' }],
        html: `<p>Pick a garden. If another garden is wearing this map, the two gardens swap maps. Your plants stay where they are.</p><div class="sbox-frame pm-frame"><div class="sbox pm-list"></div></div>`,
        mount(card, close) {
          const box = card.querySelector('.pm-list');
          for (const a of D.AREA_ORDER) {
            const cur = D.GARDEN_MAPS[st.mapOf(a)], b = document.createElement('button'); b.type = 'button'; b.className = 'pick-item';
            const n = PS.S.sprouts.filter(s => s.area === a).length;
            b.innerHTML = `<canvas class="px pm-pv"></canvas><span><b>${st.esc(D.AREAS[a].baseName)} garden</b><small>Wearing: ${st.esc(cur.name)} · ${n} plant${n === 1 ? '' : 's'}</small></span>${st.mapOf(a) === mapId ? '<span class="tag">Here</span>' : ''}`;
            const cv = b.querySelector('canvas'), src = mapPreview(st.mapOf(a)); cv.width = src.width; cv.height = src.height; cv.getContext('2d').drawImage(src, 0, 0);
            b.onclick = () => { PX.Sound.play('pop'); st.setMap(a, mapId); close(); toast(`The ${D.AREAS[a].baseName} garden is wearing the ${M.name} map now!`, 2800); };
            box.appendChild(b);
          }
        } });
      return;
    }
    const g = D.AREAS[garden] ? garden : PS.S.area;
    modal({ eyebrow: `${D.AREAS[g].baseName} garden`, title: 'Change the map', buttons: [{ label: 'Done' }],
      html: `<p>Pick a map for this garden. Your plants, pots and fruit trees stay. Get more maps in the Shop, or earn them in races and battles.</p><div class="sbox-frame pm-frame"><div class="sbox pm-list"></div></div>`,
      mount(card, close) {
        const box = card.querySelector('.pm-list');
        for (const id of D.MAP_ORDER) {
          const M = D.GARDEN_MAPS[id]; if (!M) continue;
          const own = st.ownsMap(id), wearer = st.gardenWearing(id), b = document.createElement('button'); b.type = 'button'; b.className = 'pick-item' + (own ? '' : ' pm-locked');
          b.innerHTML = `<canvas class="px pm-pv"></canvas><span><b>${st.esc(M.name)}</b><small>${own ? (wearer ? (wearer === g ? 'On this garden now' : `On the ${st.esc(D.AREAS[wearer].baseName)} garden (they'll swap)`) : 'Yours') : `In the Shop for ${M.price.toLocaleString()} coins`}</small></span>${wearer === g ? '<span class="tag">Now</span>' : own ? '<span class="tag">Use</span>' : '<span class="tag">Shop</span>'}`;
          const cv = b.querySelector('canvas'), src = mapPreview(id); cv.width = src.width; cv.height = src.height; cv.getContext('2d').drawImage(src, 0, 0);
          b.onclick = () => {
            PX.Sound.play('pop');
            if (!own) { close(); go('shop', { tab: 'maps' }); return; }
            if (wearer !== g) { st.setMap(g, id); toast(`The ${D.AREAS[g].baseName} garden is wearing the ${M.name} map now!`, 2800); }
            close();
          };
          box.appendChild(b);
        }
      } });
  }

  PS.ui = { reportError, boot, go, toast, modal, celebrate, wipe, music, setMusic, musicOn, fx: { countUp, coinsFly, banner }, pickMap, mapPreview, closeModal, welcome: () => {}, pickSprout, pickMoves, chrome, hold, refresh, devPanel, playersPanel: () => PS.ui.mainMenu(), backupPanel, parentGate, icon, paint, drawSproutTo, fitCanvas, freezeCoins, sboxRefresh, sboxBusy, lazyDraws, setMuted, isMuted: () => !!PX.Sound.muted, get current() { return current; }, get modalOpen() { return !!open || queue.length > 0; } };
})();
