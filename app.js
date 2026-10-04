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
  function paint(canvas, src) { if (src.k && (canvas.width !== src.width || canvas.height !== src.height)) fitCanvas(canvas, src); const x = canvas.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, canvas.width, canvas.height); if (src.width === canvas.width) x.drawImage(src, 0, 0); else x.drawImage(src, 0, 0, canvas.width, canvas.height); }
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
    $('clockText').textContent = `${night ? 'Night' : 'Day'} ${m}:${String(s).padStart(2, '0')}`;
    const want = night ? 'moon' : 'sun';
    if ($('clockIcon').dataset.k !== want) { paint($('clockIcon'), icon(want)); $('clockIcon').dataset.k = want; }
    document.querySelector('[data-go="garden"] .badge').hidden = !PS.S.eggs.length;
  }

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
  document.addEventListener('touchmove', e => { if (typing(document.activeElement)) return; if (e.touches.length > 1 || !scroller(e.target)) e.preventDefault(); }, { passive: false });
  // done typing: put the page back where it belongs
  document.addEventListener('focusout', e => { if (typing(e.target)) setTimeout(() => { if (!typing(document.activeElement) && (window.scrollX || window.scrollY)) window.scrollTo(0, 0); }, 50); });
  // anything that nudges the page or a frame that isn't meant to scroll gets put straight back (except while typing: the iPad
  // slides the page up to make room for the keyboard, and snapping it back closed the keyboard before you could type)
  document.addEventListener('scroll', e => {
    if (typing(document.activeElement)) return;
    const el = e.target;
    if (!el || el === document || el === document.documentElement || el === document.body) { if (window.scrollX || window.scrollY) window.scrollTo(0, 0); return; }
    if (!(el instanceof Element)) return;
    const cs = getComputedStyle(el), fixed = v => v === 'hidden' || v === 'clip' || v === 'visible';
    if (fixed(cs.overflowY) && el.scrollTop) el.scrollTop = 0;
    if (fixed(cs.overflowX) && el.scrollLeft) el.scrollLeft = 0;
  }, true);

  // ---------------- navigation ----------------
  function go(name, params) {
    const sc = PS.scenes[name];
    if (current && PS.scenes[current] && PS.scenes[current].hide) PS.scenes[current].hide();
    document.querySelectorAll('.screen').forEach(el => { el.hidden = el.dataset.screen !== name; });
    document.querySelectorAll('#nav button').forEach(b => { if (b.dataset.go === name) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    current = name;
    const root = $('scr-' + name);
    if (sc && !mounted[name]) { mounted[name] = true; try { sc.mount(root); } catch (e) { console.error(e); root.innerHTML = `<div class="card" style="margin:20px auto">This screen failed to load.</div>`; } }
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
  function modal(opts) { queue.push(opts); pumpModals(); }
  function pumpModals() {
    if (open || held || !queue.length) return;
    const o = queue.shift(); open = o;
    const root = $('modalRoot');
    const canX = o.dismiss !== false && o.closeX !== false;
    root.innerHTML = `<div class="overlay" role="dialog" aria-modal="true"><div class="modal-wrap">${canX ? '<button class="m-x" type="button" aria-label="Close">×</button>' : ''}<div class="card modal-card">
      ${o.sprite ? '<canvas class="px m-sprite" width="32" height="32"></canvas>' : ''}
      ${o.eyebrow ? `<div class="eyebrow">${o.eyebrow}</div>` : ''}
      ${o.title ? `<h1>${o.title}</h1>` : ''}
      <div class="m-body">${o.html || ''}</div>
      <div class="modal-btns ${o.row ? 'row' : ''}"></div></div></div></div>`;
    const cv = root.querySelector('.m-sprite');
    if (cv) { if (o.sprite instanceof HTMLCanvasElement) { fitCanvas(cv, o.sprite); paint(cv, o.sprite); } else drawSproutTo(cv, o.sprite, o.pose || { eyes: 'happy', mouth: 'open', arms: 'up' }); }
    const close = () => { root.innerHTML = ''; open = null; if (o.onClose) o.onClose(); pumpModals(); };
    const btns = o.buttons && o.buttons.length ? o.buttons : [{ label: 'OK', kind: 'primary' }];
    const box = root.querySelector('.modal-btns');
    btns.forEach(b => { const el = document.createElement('button'); el.className = 'btn wide ' + (b.kind || ''); el.textContent = b.label; el.onclick = () => { PX.Sound.play('pop'); if (b.onClick) { const keep = b.onClick(close); if (keep === true) return; } close(); }; box.appendChild(el); });
    if (o.dismiss !== false) root.querySelector('.overlay').addEventListener('click', e => { if (e.target.classList.contains('overlay')) close(); });
    const xb = root.querySelector('.m-x'); if (xb) xb.onclick = () => { PX.Sound.play('pop'); close(); };
    if (o.mount) o.mount(root.querySelector('.card'), close);
  }
  function closeModal() { if (open) { $('modalRoot').innerHTML = ''; open = null; pumpModals(); } }

  // ---------------- sprout picker ----------------
  // opts: { title, eyebrow, note, filter(s)->true|string(reason disabled), extra(s)->html, onPick(s) }
  function pickSprout(opts) {
    const list = PS.S.sprouts;
    if (!list.length) { modal({ title: 'No plants yet', html: '<p>Plant your first seed packet in the Garden.</p>', buttons: [{ label: 'Go to the Garden', kind: 'primary', onClick: () => go('garden') }] }); return; }
    modal({
      eyebrow: opts.eyebrow || '', title: opts.title || 'Choose a plant', html: (opts.note ? `<p>${opts.note}</p>` : '') + '<div class="pick-list"></div>',
      buttons: [{ label: 'Cancel' }],
      mount(card, close) {
        const box = card.querySelector('.pick-list');
        const sorted = list.slice().sort((a, b) => (b.id === PS.S.activeId) - (a.id === PS.S.activeId) || state.totalLevels(b) - state.totalLevels(a));
        for (const s of sorted) {
          const ok = opts.filter ? opts.filter(s) : true;
          const b = document.createElement('button'); b.className = 'pick-item'; if (ok !== true && ok !== undefined) b.disabled = true;
          b.innerHTML = `<canvas class="px"></canvas><span><b>${PS.state.esc(s.name)}</b><small>${state.formInfo(s).name} · Lv ${state.totalLevels(s)} · ${D.AREAS[s.area].name}</small>${opts.extra ? `<small>${opts.extra(s)}</small>` : ''}${typeof ok === 'string' ? `<small>${ok}</small>` : ''}</span>${s.id === PS.S.activeId ? '<span class="tag">Partner</span>' : ''}`;
          drawSproutTo(b.querySelector('canvas'), s);
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
    const card = (id, on) => {
      const m = D.MOVES[id], f = state.moveFit(s, id), E = D.ELEMENTS[m.el] || D.ELEMENTS.normal;
      return `<button class="mv-card${on ? ' on' : ''}" data-mv-id="${id}" type="button"><canvas class="px" data-el="${m.el}" width="7" height="7"></canvas>
        <span><b>${PS.state.esc(m.name)}</b><small>${m.pow > 0 ? `Pow ${m.pow}${m.fx.hits > 1 ? ' ×' + m.fx.hits : ''}` : 'Helper'} · ${E.label}${src[id] ? ' · ' + PS.state.esc(src[id]) : ''}</small>${f.why ? `<i>${PS.state.esc(f.why)}</i>` : ''}</span>${on ? '<em>✓</em>' : ''}</button>`;
    };
    modal({ eyebrow: 'Battle moves', title: `${name}'s moves`, sprite: s, row: true,
      html: `<p>Pick ${MAX} moves for battles. Tap a move to add it or take it out.</p><div class="mv-slots"></div>
        <div class="mv-tools"><button class="btn" type="button" data-mv="best">★ Best picks for ${name}</button><button class="pl-link" type="button" data-mv="auto">Let the game choose</button></div>
        <div class="label">Moves ${name} knows (${learned.length})</div><div class="mv-list"></div>
        ${later.length ? `<div class="label" style="margin-top:12px">Still to learn</div><div class="mv-later">${later.slice(0, 6).map(x => `<div><b>${PS.state.esc(D.MOVES[x.id].name)}</b> · ${x.evolveTo != null ? `evolve into a ${PS.state.esc(state.stageName(s.species, x.evolveTo))}` : x.level ? `reach level ${x.level}` : `give it ${x.cores} more ${PS.state.esc(x.from.replace(' element', ''))} core${x.cores > 1 ? 's' : ''}`}</div>`).join('')}</div>` : ''}`,
      buttons: [{ label: 'Cancel' }, { label: 'Save', kind: 'primary', onClick: () => {
        const now = state.setMoves(s, chosen); PX.Sound.play('chime');
        toast(`${s.name} will battle with ${now.map(id => D.MOVES[id].name).join(', ')}.`, 3200); if (onDone) setTimeout(onDone, 0);
      } }],
      mount(el, close) {
        const draw = () => {
          el.querySelector('.mv-slots').innerHTML = Array.from({ length: MAX }, (_, i) => chosen[i] ? card(chosen[i], true) : '<div class="mv-empty">Empty</div>').join('');
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
  PS.on('sprout:evolve', e => {
    const s = e.s, fi = state.formInfo(s), mv = fi.moves.map(id => D.MOVES[id].name).join(', ');
    const why = s.stage === 1 ? `It grew big and strong (total level ${state.totalLevels(s)}). One more evolution to go!` : `Its final evolution! It's as strong as a ${PS.state.esc(fi.species)} gets.`;
    PX.Sound.play('evolve');
    modal({ eyebrow: 'Evolution', title: `${PS.state.esc(s.name)} became a ${PS.state.esc(fi.name)}!`, sprite: s, html: `<p>${why}</p><p><b>New moves:</b> ${mv}</p>`, buttons: [{ label: 'Wonderful', kind: 'primary' }] });
  });
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
    PX.Sound.play('evolve');
    modal({ eyebrow: 'New plant unlocked!', title: P.name, sprite: { species: e.species, stage: 0 }, pose: { eyes: 'happy', mouth: 'open', arms: 'up' },
      html: `<p>${PS.state.esc(P.blurb)}</p><p>Its seed packet is waiting in the Garden. You can buy more ${PS.state.esc(P.name)} seeds in the Shop now.</p>${e.source ? `<p class="bk-ver">Prize for: ${PS.state.esc(e.source)}</p>` : ''}`,
      buttons: [{ label: 'Hooray!', kind: 'primary' }] });
  });
  PS.on('levelup', e => { if (current !== 'race' && current !== 'battle') toast(`${e.s.name}: ${D.STAT_META[e.stat].label} Lv ${e.lv}`); });
  PS.on('night', e => { toast(e.isNight ? 'Night has fallen. Night elements are out.' : 'Good morning! The sun is up.', 3000); refresh(); });

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
      eyebrow: 'Parent tools', title: 'Testing shortcuts', html: stats + '<p>Shortcuts for testing the whole game quickly. They skip the normal grind, so keep them away from the kids.</p><div class="dev-grid"></div>',
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
    new MutationObserver(list => { for (const m of list) { if (m.type === 'attributes') { if (m.target.tagName === 'CANVAS') queueSnap(m.target); else add(m.target); } else m.addedNodes.forEach(add); } })
      .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['width', 'height', 'class', 'hidden'] });
    add(document.body);
    window.addEventListener('resize', () => add(document.body));
  }

  // ---------------- loop ----------------
  let last = performance.now(), hudT = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    const sc = PS.scenes[current];
    if (sc && sc.frame && mounted[current] && !PS.ui.menuOpen) { try { sc.frame(dt, t); } catch (e) { console.error(e); } } // the main menu covers the screen: don't draw it twice
    hudT -= dt; if (hudT <= 0) { hudT = 0.5; refresh(); }
    if (!PS.ui.menuOpen && PS.S.totals) PS.S.totals.playSec = (PS.S.totals.playSec || 0) + dt; // time played (parent tools; stays on the device)
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').style.opacity = 0; }
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => { last = performance.now(); });

  function boot() {
    watchCanvases();
    document.querySelectorAll('#nav button').forEach(b => { paint(b.querySelector('canvas'), icon(b.dataset.go)); b.onclick = () => { PX.Sound.unlock(); PX.Sound.play('tick'); go(b.dataset.go); }; });
    paint($('coinIcon'), icon('coin'));
    document.addEventListener('pointerdown', () => PX.Sound.unlock()); // every tap: iOS can stop the audio after a call or a trip to another app
    $('coinPill').addEventListener('click', () => toast(`You have ${PS.S.coins.toLocaleString()} coins. Earn more in races and battles.`));
    $('clockPill').addEventListener('click', () => toast('Day and night switch every 15 minutes. Some elements only come out at night.', 3200));
    refresh();
    go('garden');
    // plants (or maps) added in an update for goals this player had already reached: hand them over now
    try {
      // (each plant gets the usual "New plant unlocked!" card; maps get one card here)
      const maps = PS.state.catchUpRewards().filter(g => g.map).map(g => D.GARDEN_MAPS[g.map].name);
      if (maps.length) setTimeout(() => modal({ eyebrow: 'Catch-up gift', title: 'New garden maps!', html: `<p>You'd already earned ${maps.length === 1 ? 'this map' : 'these maps'}: <b>${maps.map(n => PS.state.esc(n)).join(', ')}</b>. Tap a garden's name to change its map.</p>` }), 900);
    } catch (e) { console.error(e); }
    requestAnimationFrame(frame);
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
    let skipMenu = false;
    try { skipMenu = sessionStorage.getItem('pvzg:skipMenu') === '1'; sessionStorage.removeItem('pvzg:skipMenu'); } catch (e) { /* blocked */ }
    if (PS.players.isTesting() || skipMenu || !PS.ui.mainMenu) { PS.players.touch && PS.players.touch(); welcome(); }
    else PS.ui.mainMenu({ launch: true });
    $('playerChip').onclick = () => { PX.Sound.play('tick'); PS.ui.mainMenu(); };
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
        html: `<p>Pick a garden. If another garden is wearing this map, the two gardens swap maps. Your plants stay where they are.</p><div class="pm-list"></div>`,
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
      html: `<p>Pick a map for this garden. Your plants, pots and fruit trees stay. Get more maps in the Shop, or earn them in races and battles.</p><div class="pm-list"></div>`,
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

  PS.ui = { boot, go, toast, modal, pickMap, mapPreview, closeModal, welcome: () => {}, pickSprout, pickMoves, chrome, hold, refresh, devPanel, playersPanel: () => PS.ui.mainMenu(), backupPanel, parentGate, icon, paint, drawSproutTo, fitCanvas, freezeCoins, setMuted, isMuted: () => !!PX.Sound.muted, get current() { return current; }, get modalOpen() { return !!open || queue.length > 0; } };
})();
