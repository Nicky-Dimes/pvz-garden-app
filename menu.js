// menu.js — P vs. Z Garden title screen: shown at launch (each child picks who's playing) and from the player chip in the top bar.
// The yard is drawn like the game: sky by the game clock (day, or dusk at night), the house, a wooden fence, a checkered lawn
// with a path and mowers, everyone's partner plants bobbing (shooters shoot peas) and a few zombies shambling in, then
// turning back. Halloween (PS.event.active()) adds jack-o'-lanterns and bats. Player cards look like seed packets.
// Exposes PS.ui.mainMenu(opts) and PS.ui.closeMainMenu().
(function () {
  'use strict';
  const { state } = PS;
  const E = v => state.esc(v);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  let root = null, raf = 0, manage = false, lastT = 0, inGame = false;
  let plants = [], zombies = [], looksKey = '', calm = false;
  const peas = Array.from({ length: 8 }, () => ({ on: false, x: 0, lane: 0, y: 0, pop: 0 }));

  // an 8-way text outline (the logo letters)
  const ol = (c, w) => [[w, 0], [-w, 0], [0, w], [0, -w], [w, w], [-w, w], [w, -w], [-w, -w]].map(([x, y]) => `${x}px ${y}px 0 ${c}`).join(',');
  const style = document.createElement('style');
  style.textContent = `
  .mm{position:absolute;inset:0;z-index:30;background:#5fb4ee;overflow:hidden}
  .mm-bg{position:absolute;inset:0;width:100%;height:100%;display:block}
  .mm-frame{position:absolute;inset:0;--sb-gut:28px}
  .mm-scroll{flex:1 1 auto;padding:calc(18px + env(safe-area-inset-top,0px)) 16px calc(130px + env(safe-area-inset-bottom,0px))} /* (a scroll box: app.js draws its bar) */
  .mm-inner{max-width:420px;margin:0 auto;display:grid;gap:14px}
  @media (min-width:700px){.mm-inner{max-width:560px}}
  .mm-head{text-align:center;padding:2px 0 0}
  .mm-row{display:flex;align-items:center;justify-content:center;gap:8px}
  .mm-row canvas.mm-side{width:64px;height:64px;flex:0 0 auto}
  .mm-flip{transform:scaleX(-1)}
  .mm-logo{display:flex;flex-direction:column;align-items:center;gap:4px}
  .mm-brand{font-family:var(--f-px);font-size:clamp(15px,3.8vw,25px);line-height:1.3;color:#9be35a;text-shadow:2px 2px 0 #1d4a17,-2px -2px 0 #1d4a17}
  .mm-logo .mm-watch{font-size:clamp(12px,3.2vw,20px);padding-left:12px;padding-right:12px;letter-spacing:.01em}
  .mm-pvz{display:flex;align-items:flex-end;font-family:var(--f-px);font-weight:400;line-height:.86;letter-spacing:.02em}
  .mm-pvz i{font-style:normal;display:inline-block}
  .mm-lp{position:relative;font-size:70px;color:#9be35a;text-shadow:${ol('#1d4a17', 3)},0 7px 0 #1d4a17,3px 7px 0 #1d4a17,-3px 7px 0 #1d4a17}
  .mm-lp::before{content:'';position:absolute;left:46%;top:-9px;width:18px;height:10px;background:#5cc23a;border:3px solid #1d4a17;border-radius:0 100% 0 100%;transform:rotate(-24deg)}
  .mm-lv{font-size:26px;color:#fff6d0;margin:0 3px 10px;text-shadow:${ol('#4a2c12', 2)}}
  .mm-lz{font-size:70px;color:#b6c79a;transform:rotate(7deg) translateY(2px);text-shadow:${ol('#33362a', 3)},0 7px 0 #33362a,3px 7px 0 #33362a,-3px 7px 0 #33362a}
  .mm-sign{position:relative;margin-top:6px;font-family:var(--f-px);font-weight:400;font-size:36px;line-height:1;color:#fff3c4;letter-spacing:.06em;padding:4px 22px 7px;border:3px solid #5a3519;border-radius:12px;
    background:radial-gradient(circle at 9px 50%,#5a3519 2px,transparent 3px),radial-gradient(circle at calc(100% - 9px) 50%,#5a3519 2px,transparent 3px),repeating-linear-gradient(180deg,#c98a4c 0 9px,#b8783e 9px 11px);
    box-shadow:inset 0 -4px 0 rgba(0,0,0,.16),0 4px 0 rgba(40,20,6,.35);text-shadow:0 3px 0 #5a3519,${ol('#5a3519', 2)};transform:rotate(-2deg)}
  .mm-tag{display:inline-block;margin-top:12px;background:#fff6d6;border:2px solid #6b4a24;border-bottom-width:4px;border-radius:12px;padding:4px 12px;font-weight:700;font-size:14px;color:#4a3214}
  .mm-tag.hw{background:#ffdcae;border-color:#a8501a;color:#6a2a08}
  .mm-who{text-align:center}
  .mm-who span{display:inline-block;background:#fff6d6;border:2px solid #6b4a24;border-radius:10px;padding:3px 14px;font-family:var(--f-px);font-weight:700;font-size:19px;color:#3a2810;box-shadow:0 3px 0 rgba(40,20,6,.3);animation:mmPulse 1.6s ease-in-out infinite}
  @keyframes mmPulse{50%{transform:scale(1.06)}}
  .mm-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .mm-grid.solo{grid-template-columns:1fr}
  .mm-card{background:var(--panel);border:2px solid var(--line);border-bottom:5px solid var(--edge);border-radius:20px;overflow:hidden;display:flex;flex-direction:column;min-width:0}
  .mm-card.mm-new{background:#fff6d6;border:3px dashed #6b4a24;border-radius:14px}
  .mm-play{flex:1;border:0;background:transparent;display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 8px 12px;color:var(--ink);min-width:0}
  .mm-play:active{background:var(--slot-hi)}
  .mm-play:focus-visible{outline:3px solid var(--focus);outline-offset:-3px}
  .mm-play b{font-size:21px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .mm-play small{font-size:13px;color:var(--ink-soft);font-weight:600;line-height:1.3}
  .mm-when{margin-top:5px;background:#efe0b0;border-radius:8px;padding:1px 9px}
  .mm-plus-i{display:grid;place-items:center;width:66px;height:66px;margin:11px 0 9px;border-radius:18px;border:3px dashed #8a6a3a;font:700 40px var(--f-px);color:#6b4a24}
  .mm-newform{display:grid;gap:8px;padding:14px;text-align:center;justify-items:center}
  .mm-newform canvas{width:60px;height:72px}
  .mm-newform label{font-size:20px;color:var(--ink)}
  .mm-newform .btn{width:100%}
  /* player cards: seed packets */
  .mm-card.mm-pk{background:#f6e6b4;border:3px solid #6b4a24;border-radius:14px;box-shadow:inset 0 0 0 3px #fff6d6,0 5px 0 rgba(40,24,8,.35)}
  .mm-pk .mm-play{padding:0 0 9px;gap:6px}
  .mm-pk .mm-play:active{background:#efdba0}
  .mm-tbar{display:flex;align-items:center;justify-content:center;align-self:stretch;background:linear-gradient(#72c64e,#4f9e36);border-bottom:3px solid #6b4a24;padding:6px 10px 5px;min-width:0}
  .mm-play .mm-tbar b{font-family:var(--f-px);font-weight:700;font-size:20px;line-height:1.1;color:#fff;text-shadow:${ol('#2a5a1c', 1.5)},0 2px 0 #2a5a1c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
  .mm-tbody{display:flex;flex-direction:column;align-items:center;gap:5px;padding:4px 8px 0;align-self:stretch}
  .mm-avbox{display:flex;flex-direction:column;align-items:center;align-self:center;width:112px;border-radius:12px;border:2px solid #8a6a3a;background:linear-gradient(#bfe6fb 0 58%,#8fd65a 58% 100%);padding:2px 0 3px}
  .mm-av{width:88px;height:88px}
  .mm-play .mm-pname{font:800 12px var(--f-ui);color:#2a4a14;background:rgba(255,255,255,.7);border-radius:6px;padding:0 6px;max-width:104px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .mm-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;align-self:stretch}
  .mm-stat{display:flex;flex-direction:column;align-items:center;background:#fff6d6;border:2px solid #d8bc80;border-radius:9px;padding:3px 2px 2px;min-width:0}
  .mm-stat canvas{width:22px;height:22px}
  .mm-play .mm-stat b{font:900 17px/1.1 var(--f-ui);color:#3a2810}
  .mm-play .mm-stat small{font:700 11px/1.2 var(--f-ui);color:#6b5430}
  .mm-play .mm-coins{display:flex;align-items:center;gap:4px;font:800 14px var(--f-ui);color:#5a4420}
  .mm-coins canvas{width:16px;height:16px}
  .mm-tools{display:flex;justify-content:center;gap:4px;border-top:2px dashed #b89a60;padding:2px;flex-wrap:wrap}
  .mm-tools .field-input{margin:4px 6px 0}
  .mm-foot{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
  .mm-foot.solo{grid-template-columns:repeat(3,minmax(0,1fr))}
  .mm-foot.nomusic{grid-template-columns:repeat(3,minmax(0,1fr))}
  .mm-foot.solo.nomusic{grid-template-columns:repeat(2,minmax(0,1fr))}
  .mm-foot .mm-ib{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:64px;padding:8px 4px;font-size:14px}
  .mm-ib canvas{width:26px;height:26px}
  .mm-ib.mm-sound canvas{width:26px;height:22px}
  .mm-ver{text-align:center;font-size:13px;font-weight:600;color:#fff;text-shadow:0 1px 0 #222034;margin:0}
  .mm-remind{display:flex;align-items:center;gap:10px;background:#fff4c2;border:2px solid #e0a800;border-bottom-width:4px;border-radius:16px;padding:8px 10px 8px 12px;font-size:14px;font-weight:600;line-height:1.3}
  .mm-remind span{flex:1}
  .mm-remind .btn{flex:0 0 auto;padding:7px 12px;font-size:15px}
  @media (max-width:420px){.mm-play .mm-stat small{font-size:10px;letter-spacing:-.01em}.mm-stat{padding:3px 1px 2px}.mm-play .mm-stat b{font-size:15px}}
  .mm-tip{background:#fff6d6;border:2px dashed #8a6a3a;border-radius:14px;padding:8px 12px;font-size:13.5px;font-weight:600;line-height:1.35;margin:0;text-align:center}
  @media (max-width:400px){.mm-lp,.mm-lz{font-size:58px}.mm-row canvas.mm-side{width:52px;height:52px}.mm-sign{font-size:30px}}
  @media (prefers-reduced-motion: reduce){.mm-who span{animation:none}}
  `;
  document.head.appendChild(style);

  function ago(ts) {
    if (!ts) return 'New';
    const then = new Date(ts), now = new Date();
    if (then.toDateString() === now.toDateString()) return 'Played today';
    const days = Math.max(1, Math.round((new Date(now.toDateString()) - new Date(then.toDateString())) / 86400000));
    return days === 1 ? 'Played yesterday' : `Played ${days} days ago`;
  }
  const halloween = () => { try { return !!(PS.event && typeof PS.event.active === 'function' && PS.event.active()); } catch (e) { return false; } };
  const nightK = () => { try { return PS.clock && PS.clock.night ? Math.round(PS.clock.night() * 20) / 20 : 0; } catch (e) { return 0; } };

  // ---------- Sound + Music buttons ----------
  function paintSound() {
    const b = root && root.querySelector('.mm-sound'); if (!b) return;
    const off = PS.ui.isMuted && PS.ui.isMuted();
    PS.ui.paint(b.querySelector('canvas'), PS.ui.icon(off ? 'mute' : 'sound'));
    b.querySelector('span').textContent = off ? 'Sound off' : 'Sound on';
    b.setAttribute('aria-label', off ? 'Sound is off. Tap to turn it on' : 'Sound is on. Tap to turn it off');
  }
  const hasMusic = () => !!(PS.ui.setMusic || (window.PX && PX.Music));
  function musicOn() {
    try { if (PS.ui.musicOn) return !!PS.ui.musicOn(); if (PX.Music) return !PX.Music.muted; } catch (e) { /* audio optional */ }
    return true;
  }
  function setMusic(on) {
    try {
      if (PS.ui.setMusic) { PS.ui.setMusic(on); }
      else if (PX.Music) { PX.Music.muted = !on; if (!on && PX.Music.stop) PX.Music.stop(300); }
      if (on && PX.Music && root && !root.hidden) PX.Music.play('title');
    } catch (e) { /* audio optional */ }
  }
  function paintMusic() {
    const b = root && root.querySelector('.mm-music'); if (!b) return;
    const show = hasMusic(); b.hidden = !show;
    root.querySelector('.mm-foot').classList.toggle('nomusic', !show);
    if (!show) return;
    const on = musicOn();
    try { PS.ui.paint(b.querySelector('canvas'), footIcon(on ? 'music' : 'musicoff')); } catch (e) { /* icon optional */ }
    b.querySelector('span').textContent = on ? 'Music on' : 'Music off';
    b.setAttribute('aria-label', on ? 'Music is on. Tap to turn it off' : 'Music is off. Tap to turn it on');
  }

  // a gentle nudge for grown-ups when a player with plants hasn't been backed up for 2 weeks (never for brand-new players)
  function remindBackup(list) {
    const el = root.querySelector('.mm-remind'); if (!el) return;
    const DAY = 86400000, now = Date.now();
    const due = list.filter(p => PS.players.summary(p.id).sprouts > 0 && now - (p.created || now) > 3 * DAY && now - PS.players.lastBackup(p.id) > 14 * DAY);
    el.hidden = !due.length || PS.players.isTesting();
    if (!el.hidden) el.querySelector('span').textContent = due.length === 1 ? `Time for a backup of ${due[0].name}'s garden!` : 'Time for a backup of everyone’s gardens!';
  }

  // Almanac % and trophies for the seed-packet cards: worked out for whoever is loaded now, and remembered on this device
  // (a small separate key, never inside a save) so the other players' cards can show theirs too
  const TC_KEY = 'pvzg:tcard';
  function cardStats(id, isCur) {
    let all = {};
    try { all = JSON.parse(localStorage.getItem(TC_KEY) || '{}') || {}; } catch (e) { all = {}; }
    if (isCur && PS.S) {
      let pct = null, tro = null;
      try { if (PS.almanac && typeof PS.almanac.counts === 'function') pct = PS.almanac.counts().pct; } catch (e) { pct = null; }
      try { if (PS.battle && typeof PS.battle.trophies === 'function') tro = PS.battle.trophies().filter(x => x && x.got).length; } catch (e) { tro = null; }
      const old = all[id] || {};
      all[id] = { pct: pct == null ? old.pct : pct, tro: tro == null ? old.tro : tro };
      if (!PS.players.isTesting()) try { localStorage.setItem(TC_KEY, JSON.stringify(all)); } catch (e) { /* storage full: fine */ }
    }
    return all[id] || {};
  }
  // little pixel icons (made once): backups, players, music, a trophy cup when the trophy art isn't there
  const footC = {};
  function footIcon(kind) {
    if (footC[kind]) return footC[kind];
    const ROWS = {
      backup: ['.kkkkkkkkkkkk.', 'kggggggggggggk', 'kggwwwwwwwwggk', 'kggwwwwwwwwggk', 'kggwwwwwwwwggk', 'kggggggggggggk', 'kggggggggggggk', 'kggkkkkkkkkggk', 'kggkWWWWWWkggk', 'kggkWWkkWWkggk', 'kggkWWkkWWkggk', '.kkkkkkkkkkkk.'],
      players: ['...kkk........', '..kpppk..kkk..', '..kpppk.kqqqk.', '...kkk..kqqqk.', '.kkgggkk.kkk..', 'kgggggggkoook.', 'kgggggggkooook', 'kgggggggkooook', '.kkkkkkk.kkkk.'],
      music: ['....kkk...', '....kyykk.', '....kykyyk', '....kyk.kk', '....kyk...', '....kyk...', '....kyk...', '.kkkkyk...', 'kyyyyyk...', 'kyyyyyk...', 'kyyyyk....', '.kkkk.....'],
      trophy: ['kkkkkkkkkk', 'kyyyyyyyyk', 'kyywyyyyyk', 'kyywyyyyyk', '.kyyyyyyk.', '..kyyyyk..', '...kyyk...', '....kk....', '...kyyk...', '..kkkkkk..'],
    };
    // (music off: the note with a red line across it)
    const R = kind === 'musicoff' ? ROWS.music.map((r, i) => { const c = Math.round(i * 8 / 11); return r.slice(0, c) + 'rr' + r.slice(c + 2); }) : ROWS[kind];
    const pal = { k: '#3a2d34', g: '#4f9e36', w: '#fff6d6', W: '#d8c8a0', p: '#f6c8a0', q: '#f6c8a0', o: '#e0a040', y: '#ffd23a', r: '#e04a3a', l: '#8fd65a' };
    return (footC[kind] = PX.fromStrings(R, pal).canvas());
  }
  function statIcon(kind, st) {
    if (kind === 'plants') return PS.ui.icon('garden');
    if (kind === 'book') return PS.ui.icon('sprouts');
    if (kind === 'coin') return PS.ui.icon('coin');
    if (kind === 'trophy') {
      try {
        if (typeof PX.trophy === 'function' && PS.battle && typeof PS.battle.trophies === 'function') {
          const L = PS.battle.trophies(), t = L.find(x => x && x.got) || L[0];
          if (t) return PX.trophy(t.id, 1, { dim: !(st && st.tro) });
        }
      } catch (e) { /* drawn below */ }
      return footIcon('trophy');
    }
    return PS.ui.icon('garden');
  }

  function build() {
    root = document.createElement('div');
    root.className = 'mm'; root.id = 'mainMenu'; root.hidden = true;
    // an iPhone playing in a Safari tab (not the Home Screen app) can lose its saves after a week without visits
    const safariTab = navigator.standalone === false && window.top === window;
    root.innerHTML = `<canvas class="px mm-bg" aria-hidden="true"></canvas>
      <div class="sbox-frame mm-frame"><div class="sbox mm-scroll"><div class="mm-inner">
        <header class="mm-head">
          <div class="mm-row"><canvas class="px mm-side" data-pl="peashooter" width="32" height="32"></canvas>
            <div class="mm-logo" role="img" aria-label="P vs. Z Garden"><div class="mm-pvz" aria-hidden="true"><i class="mm-lp">P</i><i class="mm-lv">vs.</i><i class="mm-lz">Z</i></div><div class="mm-sign" aria-hidden="true">GARDEN</div></div>
            <canvas class="px mm-side mm-flip" data-zb="conehead" width="32" height="32"></canvas></div>
          <p class="mm-tag">Grow plants, collect elements, fuse them and beat the zombies!</p>
        </header>
        <div class="mm-remind" hidden><span></span><button class="btn primary" data-a="backup">Back up</button></div>
        <div class="mm-who"><span>Who's playing?</span></div>
        <div class="mm-grid"></div>
        <div class="mm-foot"><button class="btn mm-ib" data-a="backup"><canvas class="px" data-fi="backup"></canvas><span>Backups</span></button><button class="btn mm-ib" data-a="manage"><canvas class="px" data-fi="players"></canvas><span>Players</span></button><button class="btn mm-ib mm-sound" data-a="sound" type="button"><canvas class="px" width="13" height="11"></canvas><span>Sound on</span></button><button class="btn mm-ib mm-music" data-a="music" type="button"><canvas class="px"></canvas><span>Music on</span></button></div>
        ${safariTab ? '<p class="mm-tip">Grown-ups: add P vs. Z Garden to the Home Screen (Share, then Add to Home Screen) and play from its icon, so progress is kept safe.</p>' : ''}
        <p class="mm-ver"></p>
      </div></div></div>`;
    document.getElementById('app').appendChild(root);
    root.querySelectorAll('[data-pl]').forEach(c => { try { PS.ui.drawSproutTo(c, { species: c.dataset.pl, stage: 0 }, { eyes: 'happy' }); } catch (e) { /* art optional */ } });
    root.querySelectorAll('[data-zb]').forEach(c => { try { const z = PX.sprig({ zombie: c.dataset.zb }, { mouth: 'open' }); PS.ui.fitCanvas(c, z); const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(z, 0, 0); } catch (e) { /* art optional */ } });
    root.querySelectorAll('[data-fi]').forEach(c => { try { PS.ui.paint(c, footIcon(c.dataset.fi)); } catch (e) { /* icon optional */ } });
    paintSound(); paintMusic();
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'mmName') create(); });
  }

  function renderCards(newForm) {
    const grid = root.querySelector('.mm-grid'), list = PS.players.list(), fresh = PS.players.isFreshInstall(), cur = PS.players.current();
    grid.innerHTML = ''; grid.classList.toggle('solo', fresh);
    const looks = [];
    if (!fresh) for (const p of list) {
      const sm = PS.players.summary(p.id), isCur = !!(cur && p.id === cur.id), st = cardStats(p.id, isCur);
      const stat = (ic, v, label) => `<span class="mm-stat"><canvas class="px" data-mi="${ic}"></canvas><b class="num">${v == null ? '-' : typeof v === 'number' ? v.toLocaleString() : v}</b><small>${label}</small></span>`;
      const card = document.createElement('div'); card.className = 'mm-card mm-pk';
      card.innerHTML = `<button class="mm-play" data-play="${p.id}" aria-label="Play as ${E(p.name)}">
          <span class="mm-tbar"><b>${E(p.name)}</b></span>
          <span class="mm-tbody"><span class="mm-avbox"><canvas class="px mm-av"></canvas>${sm.partner ? `<small class="mm-pname">${E(sm.partner.name)}</small>` : ''}</span>
            <span class="mm-stats">${stat('plants', sm.sprouts, 'Plants')}${stat('book', st.pct == null ? null : st.pct + '%', 'Almanac')}${stat('trophy', st.tro, 'Trophies')}</span>
            <small class="mm-coins num"><canvas class="px" data-mi="coin"></canvas>${Number(sm.coins || 0).toLocaleString()}${!sm.sprouts && sm.eggs ? ' · seeds waiting' : ''}</small></span>
          <small class="mm-when">${inGame && isCur ? 'Playing now' : ago(p.lastPlayed)}</small></button>
        ${manage ? `<div class="mm-tools"><button class="pl-link" data-rename="${p.id}">Rename</button>${list.length > 1 ? `<button class="pl-link" data-remove="${p.id}">Remove</button>` : ''}</div>` : ''}`;
      const av = card.querySelector('canvas.mm-av');
      if (sm.partner) { const L = state.lookOf(sm.partner); PS.ui.drawSproutTo(av, L, { eyes: 'happy', mouth: 'open' }); looks.push(L); }
      else { const egg = PX.item('egg', 'normal'), K = egg.k || 1; av.width = 32 * K; av.height = 32 * K; const g = av.getContext('2d'); g.setTransform(K, 0, 0, K, 0, 0); g.imageSmoothingEnabled = false; g.drawImage(egg, Math.round((32 - PX.artW(egg)) / 2), 32 - PX.artH(egg) - 2, PX.artW(egg), PX.artH(egg)); }
      card.querySelectorAll('[data-mi]').forEach(c => { try { PS.ui.paint(c, statIcon(c.dataset.mi, st)); } catch (e) { /* icon optional */ } });
      grid.appendChild(card);
    }
    const nc = document.createElement('div'); nc.className = 'mm-card mm-new';
    if (fresh || newForm) {
      nc.innerHTML = `<div class="mm-newform"><canvas class="px" width="22" height="28"></canvas>
        <label class="px-title" for="mmName">${fresh ? "What's your name?" : 'New player'}</label>
        <input class="field-input" id="mmName" maxlength="14" autocomplete="off" placeholder="Type a name">
        <button class="btn primary" data-a="create">${fresh ? 'Start playing' : 'Create player'}</button>
        ${fresh ? '' : '<button class="pl-link" data-a="cancelnew">Cancel</button>'}</div>`;
      PS.ui.paint(nc.querySelector('canvas'), PX.item('egg', 'normal'));
      if (newForm) grid.classList.add('solo');
    } else {
      nc.innerHTML = `<button class="mm-play" data-a="new"><span class="mm-plus-i">+</span><b class="px-title">New player</b><small>Start a new garden</small></button>`;
    }
    grid.appendChild(nc);
    root.querySelector('[data-a="manage"] span').textContent = manage ? 'Done' : 'Players';
    root.querySelector('[data-a="manage"]').hidden = fresh;
    root.querySelector('.mm-foot').classList.toggle('solo', fresh);
    root.querySelector('.mm-ver').textContent = 'Version ' + (window.PVZG_VERSION || 'dev');
    const hw = halloween(), tag = root.querySelector('.mm-tag');
    tag.classList.toggle('hw', hw); tag.textContent = hw ? 'Happy Halloween! Spooky fun in the garden!' : 'Grow plants, collect elements, fuse them and beat the zombies!';
    remindBackup(list);
    setYard(looks);
    if (fresh || newForm) setTimeout(() => { const i = root.querySelector('#mmName'); if (i && !fresh) i.focus(); }, 50);
  }

  function choose(id) {
    PX.Sound.unlock(); PX.Sound.play('chime');
    const cur = PS.players.current();
    if (cur && id === cur.id && !PS.players.isTesting()) { PS.players.touch(); close(); PS.ui.refresh(); if (PS.ui.welcome) PS.ui.welcome(); return; }
    PS.players.switchTo(id, true);
  }
  function create() {
    const input = root.querySelector('#mmName'); const name = (input && input.value || '').trim();
    if (!name) { PS.ui.toast('Type a name first'); if (input) input.focus(); return; }
    PX.Sound.unlock(); PX.Sound.play('chime');
    if (PS.players.isFreshInstall()) { const cur = PS.players.current(); PS.players.rename(cur.id, name); PS.players.touch(); close(); PS.ui.refresh(); if (PS.ui.welcome) PS.ui.welcome(); return; }
    const p = PS.players.add(name); PS.players.switchTo(p.id, true);
  }

  function onClick(e) {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.play) { choose(t.dataset.play); return; }
    const a = t.dataset.a;
    if (a === 'new') { PX.Sound.play('pop'); renderCards(true); return; }
    if (a === 'cancelnew') { renderCards(false); return; }
    if (a === 'create') { create(); return; }
    if (a === 'backup') { PX.Sound.play('pop'); PS.ui.backupPanel(); return; }
    if (a === 'sound') { PS.ui.setMuted(!PS.ui.isMuted()); paintSound(); PS.ui.toast(PS.ui.isMuted() ? 'Sound off' : 'Sound on', 1400); return; }
    if (a === 'music') { PX.Sound.unlock(); const on = !musicOn(); setMusic(on); paintMusic(); PS.ui.toast(musicOn() ? 'Music on' : 'Music off', 1400); return; }
    if (a === 'manage') { PX.Sound.play('tick'); manage = !manage; renderCards(false); return; }
    if (t.dataset.rename) {
      const p = PS.players.list().find(x => x.id === t.dataset.rename); const tools = t.closest('.mm-tools');
      tools.innerHTML = `<input class="field-input" maxlength="14" value="${E(p.name)}" aria-label="New name for ${E(p.name)}"><button class="pl-link" data-saveName="${p.id}">Save</button>`;
      const inp = tools.querySelector('input'); inp.focus(); inp.select();
      const save = () => { PS.players.rename(p.id, inp.value); renderCards(false); PS.ui.refresh(); };
      tools.querySelector('[data-savename]').onclick = save;
      inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') save(); });
      return;
    }
    if (t.dataset.remove) {
      const id = t.dataset.remove, p = PS.players.list().find(x => x.id === id);
      PS.ui.parentGate(() => PS.ui.modal({ title: `Remove ${E(p.name)}?`, html: `<p>This deletes ${E(p.name)}'s plants and progress on this device. Make a backup first if you might want them back.</p>`, row: true,
        buttons: [{ label: 'Keep' }, { label: 'Remove', kind: 'danger', onClick: () => { const wasCurrent = id === PS.players.current().id; PS.players.remove(id); if (wasCurrent) location.reload(); else renderCards(false); } }] }));
    }
  }

  // ---------- the yard: everyone's partner plants on the lawn, zombies shambling in from the right ----------
  // Every sprite frame is made once here (PX.sprig caches by look), so the drawing loop never builds anything.
  const DEFAULT_PLANTS = ['peashooter', 'sunflower', 'wallnut', 'snowpea', 'chomper'];
  const ZOMBIE_KINDS = ['basic', 'conehead', 'buckethead', 'flag', 'newspaper', 'football'];
  function setYard(looks) {
    const L = looks.slice(0, 5);
    for (const sp of DEFAULT_PLANTS) { if (L.length >= 5) break; if (!L.some(x => x.species === sp)) L.push({ species: sp, stage: 0 }); }
    const key = JSON.stringify(L); if (key === looksKey) return; looksKey = key;
    plants = L.map((look, i) => {
      const P = PS.D.PLANTS[look.species] || {}, f = (pose) => { try { return PX.sprig(look, pose); } catch (e) { return null; } };
      return { look, lane: 0, col: 0, x: 0, shooter: P.role === 'shooter', t: Math.random() * 2, shotT: 0, phase: Math.random() * 3,
        fr: [f({ frame: 0 }), f({ frame: 1 }), f({ frame: 0, eyes: 'blink' }), f({ frame: 0, mouth: 'open' })] };
    });
    const kinds = ZOMBIE_KINDS.slice().sort(() => Math.random() - 0.5).slice(0, 4);
    zombies = kinds.map((id, i) => {
      const f = (pose) => { try { return PX.sprig({ zombie: id }, pose); } catch (e) { return null; } };
      return { id, lane: 0, x: 0, dir: -1, v: 2.4 + Math.random() * 1.4, wait: 1 + i * 4.5, pause: 0, hit: 0, started: false,
        fr: [f({ walk: true, frame: 0 }), f({ walk: true, frame: 1 }), f({ mouth: 'open' })] };
    });
    drawBg.layoutKey = ''; // lanes are handed out again for the new cast
  }
  // lanes: plants spread over the lanes (shooters first face the zombies), zombies take lanes with a shooter when they can
  function placeCast(Lay) {
    const order = [1, 3, 0, 2, 4].filter(i => i < Lay.lanes);
    plants.forEach((p, i) => { p.lane = order[i % order.length]; p.col = Math.floor(i / order.length) + (i % 2); p.x = Lay.pathW + 16 + p.col * Lay.tileW; });
    const shooterLanes = plants.filter(p => p.shooter).map(p => p.lane), others = order.filter(l => !shooterLanes.includes(l));
    const lanes = shooterLanes.concat(others);
    zombies.forEach((z, i) => { z.lane = lanes[i % lanes.length]; if (!z.started) { z.x = Lay.ww + 14; z.dir = -1; } });
    for (const pe of peas) pe.on = false;
  }
  function stopX(z, Lay) {
    let m = Lay.pathW + 30;
    for (const p of plants) if (p.lane === z.lane && p.x + 22 > m) m = p.x + 22;
    return m;
  }

  // (a colour between two hex colours)
  const mix = (a, b, k) => { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), ch = sh => Math.round(((pa >> sh) & 255) * (1 - k) + ((pb >> sh) & 255) * k); return `rgb(${ch(16)},${ch(8)},${ch(0)})`; };
  const DAY_SKY = ['#4fa8ec', '#64b6f0', '#7cc4f2', '#98d2f4', '#b8e0f6', '#d6eef8'];
  const DUSK_SKY = ['#241c52', '#3a2668', '#5a3078', '#8a3f80', '#c85a74', '#f0905e'];
  const FRONT_YARD = { kind: 'house', wall: ['#fbf0d4', '#ecdcb4', '#cdb88e'], roof: ['#e0705a', '#b84a3a', '#86302a'], trim: '#ffffff', glass: '#8fd3f0', door: ['#b8603a', '#8a4428'], porch: ['#e4b27a', '#b8743a'], found: ['#c4c4cc', '#8e8e9c'], box: true, shutter: '#5cb43a' };
  function layoutOf(ww, wh) {
    const lawnH = clamp(Math.round(wh * 0.34), 56, 130), lanes = clamp(Math.floor(lawnH / 16), 3, 5), laneH = Math.floor((lawnH - 3) / lanes);
    return { ww, wh, lawnH, lanes, laneH, tileW: Math.max(16, laneH), lawnTop: wh - lawnH, pathW: 10, feet: i => wh - lawnH + 3 + laneH * (i + 1) - 3 };
  }
  // a friendly jack-o'-lantern (round eyes, big smile), x/y = bottom middle
  function pumpkin(g, x, y, lit) {
    const ink = '#5a2a10', face = lit ? '#ffe27a' : '#6a3010';
    g.fillStyle = ink; g.fillRect(x - 5, y - 9, 11, 9); g.fillRect(x - 6, y - 8, 13, 7);
    g.fillStyle = '#f08a24'; g.fillRect(x - 4, y - 8, 9, 7); g.fillRect(x - 5, y - 7, 11, 5);
    g.fillStyle = '#c8641a'; g.fillRect(x - 2, y - 8, 1, 7); g.fillRect(x + 2, y - 8, 1, 7);
    g.fillStyle = '#ffb45a'; g.fillRect(x - 4, y - 7, 1, 2);
    g.fillStyle = '#4f9a3a'; g.fillRect(x, y - 11, 2, 3); g.fillRect(x + 2, y - 11, 1, 1);
    g.fillStyle = face; g.fillRect(x - 3, y - 6, 2, 2); g.fillRect(x + 2, y - 6, 2, 2);
    g.fillRect(x - 3, y - 3, 1, 1); g.fillRect(x - 2, y - 2, 5, 1); g.fillRect(x + 3, y - 3, 1, 1);
  }
  // the still part of the yard, made again only when the size, the time of day or Halloween changes
  function buildBg(Lay, K, n, hw) {
    const { ww, wh, lawnTop, lanes, laneH, pathW } = Lay;
    const c = document.createElement('canvas'); c.width = ww * K; c.height = wh * K;
    const g = c.getContext('2d'); g.setTransform(K, 0, 0, K, 0, 0); g.imageSmoothingEnabled = false;
    // sky
    const bh = Math.ceil(lawnTop / DAY_SKY.length);
    for (let i = 0; i < DAY_SKY.length; i++) { g.fillStyle = mix(DAY_SKY[i], DUSK_SKY[i], n); g.fillRect(0, i * bh, ww, bh + 1); }
    const disc = (cx, cy, r, col) => { g.fillStyle = col; for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) if (a * a + b * b <= r * r + r * 0.5) g.fillRect(cx + a, cy + b, 1, 1); };
    const sx = ww - 24, sy = 20;
    if (n < 0.95) { g.globalAlpha = 1 - n; disc(sx, sy, 9, '#fff6c8'); disc(sx, sy, 7, '#ffe45a'); g.globalAlpha = 1; }
    if (n > 0.05) { g.globalAlpha = n; if (hw) { disc(sx, sy, 9, '#ffc070'); disc(sx - 3, sy - 2, 2, '#f0a050'); disc(sx + 3, sy + 3, 1, '#f0a050'); } else { disc(sx, sy, 8, '#fff2d0'); disc(sx + 4, sy - 2, 7, mix(DAY_SKY[0], DUSK_SKY[0], n)); } g.globalAlpha = 1; }
    // far trees and a hedge behind the fence
    const ridge = x => Math.sin(x * 0.09) * 0.5 + Math.sin(x * 0.23 + 1.3) * 0.3 + Math.sin(x * 0.51 + 3.1) * 0.2;
    const far = mix('#5aa860', '#2a2a5a', n * 0.85), farE = mix('#3c8a48', '#1e1e44', n * 0.85), hedge = mix('#4f9e3e', '#24384a', n * 0.7), hedgeL = mix('#6cbc50', '#2e4a52', n * 0.7);
    for (let x = 0; x < ww; x++) {
      const top = Math.round(lawnTop - 20 - ridge(x) * 6);
      g.fillStyle = farE; g.fillRect(x, top, 1, 1); g.fillStyle = far; g.fillRect(x, top + 1, 1, lawnTop - top);
      const ht = Math.round(lawnTop - 9 - Math.abs(Math.sin(x * 0.2)) * 3);
      g.fillStyle = hedge; g.fillRect(x, ht, 1, lawnTop - ht); if ((x * 5) % 7 < 2) { g.fillStyle = hedgeL; g.fillRect(x, ht + 1, 1, 1); }
    }
    // the wooden fence along the back of the lawn
    const plank = mix('#e2a86a', '#7a5a6a', n * 0.6), plankD = mix('#b97a42', '#5a405a', n * 0.6), fink = mix('#6b4422', '#2a1e34', n * 0.5);
    const fy = lawnTop + 1, fh = 14;
    g.fillStyle = fink; g.fillRect(0, fy - fh + 4, ww, 3); g.fillRect(0, fy - 5, ww, 3);
    g.fillStyle = plankD; g.fillRect(0, fy - fh + 5, ww, 1); g.fillRect(0, fy - 4, ww, 1);
    for (let x = 40; x < ww + 6; x += 7) {
      g.fillStyle = fink; g.fillRect(x - 1, fy - fh, 7, fh); g.fillRect(x, fy - fh - 1, 5, 1);
      g.fillStyle = plank; g.fillRect(x, fy - fh + 1, 5, fh - 1); g.fillRect(x + 1, fy - fh, 3, 1);
      g.fillStyle = plankD; g.fillRect(x + 4, fy - fh + 1, 1, fh - 1);
    }
    // the lawn: a checkerboard, a lane at a time
    const A = mix('#94d85a', '#3c5e5a', n * 0.55), B = mix('#80c84a', '#34525a', n * 0.55), seam = mix('#6aae3e', '#2a4450', n * 0.55);
    g.fillStyle = seam; g.fillRect(0, lawnTop, ww, wh - lawnTop);
    for (let r = 0; r < lanes; r++) {
      const y0 = lawnTop + 3 + r * laneH, hh = r === lanes - 1 ? wh - y0 : laneH - 1;
      for (let x = pathW, q = 0; x < ww; x += Lay.tileW, q++) { g.fillStyle = (r + q) % 2 ? A : B; g.fillRect(x, y0, Lay.tileW, hh); }
    }
    g.fillStyle = mix('#5a9a34', '#223a44', n * 0.55); g.fillRect(0, lawnTop, ww, 3);
    // the stone path on the left with a lawn mower in every lane
    const st = mix('#d2ccbc', '#6a6a7a', n * 0.5), stD = mix('#a8a090', '#4a4a5a', n * 0.5);
    g.fillStyle = stD; g.fillRect(0, lawnTop + 3, pathW, wh - lawnTop);
    for (let y = lawnTop + 4, i = 0; y < wh; y += 6, i++) { g.fillStyle = st; g.fillRect(i % 2, y, pathW - 2, 5); }
    for (let r = 0; r < lanes; r++) {
      const fy2 = Lay.feet(r), mx = 1;
      g.fillStyle = '#3a2d34'; g.fillRect(mx, fy2 - 6, 9, 5); g.fillRect(mx + 7, fy2 - 10, 1, 4); g.fillRect(mx + 5, fy2 - 10, 3, 1);
      g.fillStyle = '#e04a3a'; g.fillRect(mx + 1, fy2 - 5, 7, 3); g.fillStyle = '#ff8a6a'; g.fillRect(mx + 2, fy2 - 5, 3, 1);
      g.fillStyle = '#2a2a30'; g.fillRect(mx + 1, fy2 - 2, 2, 2); g.fillRect(mx + 6, fy2 - 2, 2, 2);
    }
    // the house in the back corner (lit windows at dusk)
    try {
      const h = PX.pvzHouse(Object.assign({}, FRONT_YARD, { lit: n > 0.5 })), w = PX.artW(h), hh = PX.artH(h);
      g.drawImage(h, -14, lawnTop + 4 - hh, w, hh);
    } catch (e) { /* no house art */ }
    if (hw) {
      try { const gs = PX.prop('gravestone', n > 0.5 ? 'night' : 'day'); if (gs) g.drawImage(gs, ww - 30, lawnTop + 2 - PX.artH(gs), PX.artW(gs), PX.artH(gs)); } catch (e) { /* prop optional */ }
      pumpkin(g, 64, lawnTop + 3, n > 0.5); pumpkin(g, ww - 52, lawnTop + 3, n > 0.5); pumpkin(g, Math.round(ww * 0.55), lawnTop + 3, n > 0.5);
      pumpkin(g, ww - 12, wh - 2, n > 0.5); pumpkin(g, pathW + 9, wh - 2, n > 0.5);
    }
    return c;
  }
  function cloud(g, x, y, w) { g.fillStyle = '#ffffff'; g.fillRect(x, y, w, 3); g.fillRect(x + 2, y - 2, w - 5, 2); g.fillRect(x + 4, y - 3, Math.max(2, w - 10), 1); g.fillStyle = '#d8e8f6'; g.fillRect(x + 1, y + 3, w - 2, 1); }
  function bat(g, x, y, up) {
    g.fillStyle = '#2e2440'; g.fillRect(x - 1, y - 1, 3, 3); g.fillRect(x - 1, y - 2, 1, 1); g.fillRect(x + 1, y - 2, 1, 1);
    if (up) { g.fillRect(x - 4, y - 2, 3, 1); g.fillRect(x - 5, y - 3, 2, 1); g.fillRect(x + 2, y - 2, 3, 1); g.fillRect(x + 4, y - 3, 2, 1); }
    else { g.fillRect(x - 4, y, 3, 1); g.fillRect(x - 5, y + 1, 2, 1); g.fillRect(x + 2, y, 3, 1); g.fillRect(x + 4, y + 1, 2, 1); }
    g.fillStyle = '#ffe27a'; g.fillRect(x - 1, y - 1, 1, 1); g.fillRect(x + 1, y - 1, 1, 1);
  }
  function drawSprite(g, c, x, y, flip) { if (c) PX.blit(g, c, x, y, flip, PX.SPRIG_AX, PX.SPRIG_AY); }
  function drawBg(tNow) {
    const cv = root.querySelector('.mm-bg'), W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return;
    const PXS = W >= 700 ? 3 : 2, ww = Math.ceil(W / PXS), wh = Math.ceil(H / PXS);
    const K = PX.SCENE_K; // (the buffer has K pixels per world pixel, so the plants and zombies show their hi-res detail)
    // (the clock and the event are asked once a second; nothing here builds strings or objects while the yard just plays)
    if (!(tNow - drawBg.chk < 1)) { drawBg.chk = tNow; drawBg.nk = nightK(); drawBg.hwk = halloween(); }
    const n = drawBg.nk, hw = drawBg.hwk;
    if (drawBg.w !== ww || drawBg.h !== wh || drawBg.n !== n || drawBg.hw !== hw) {
      const resized = drawBg.w !== ww || drawBg.h !== wh;
      drawBg.w = ww; drawBg.h = wh; drawBg.n = n; drawBg.hw = hw; drawBg.lay = layoutOf(ww, wh); drawBg.bg = buildBg(drawBg.lay, K, n, hw);
      if (resized) drawBg.layoutKey = '';
      if (!drawBg.buf || drawBg.buf.width !== ww * K || drawBg.buf.height !== wh * K) { drawBg.buf = document.createElement('canvas'); drawBg.buf.width = ww * K; drawBg.buf.height = wh * K; }
      if (!drawBg.stars) drawBg.stars = Array.from({ length: 40 }, () => [Math.random(), Math.random()]);
      drawBg.starCol = `rgba(255,255,255,${n})`;
    }
    const Lay = drawBg.lay;
    if (drawBg.layoutKey !== 'set') { drawBg.layoutKey = 'set'; placeCast(Lay); }
    const tm = calm ? 0 : tNow; // (reduced motion: clouds and bats hold still, zombies just stand at the edge of the lawn)
    const b = drawBg.buf, g = b.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false; g.drawImage(drawBg.bg, 0, 0);
    g.setTransform(K, 0, 0, K, 0, 0);
    const skyH = Lay.lawnTop - 26;
    if (n > 0.3) { g.fillStyle = drawBg.starCol; for (const s of drawBg.stars) if (Math.floor(tNow * 2 + s[0] * 9) % 5) g.fillRect(Math.round(s[0] * ww), Math.round(s[1] * skyH), 1, 1); }
    if (n < 0.8) { g.globalAlpha = 1 - n; for (let i = 0; i < 3; i++) cloud(g, Math.round(((tm * (1.4 + i * 0.5) + i * 77) % (ww + 60)) - 30), 34 + i * 17, 11 + (i % 3) * 5); g.globalAlpha = 1; }
    if (hw) for (let i = 0; i < 3; i++) {
      const bx = Math.round(((tm * (9 + i * 3) + i * 90) % (ww + 40)) - 20), by = Math.round(18 + i * 13 + Math.sin(tm * 2.2 + i * 2) * 5);
      bat(g, bx, by, Math.floor(tm * 8 + i) % 2 === 0);
    }
    const dt = Math.min(0.05, tNow - (lastT || tNow)); lastT = tNow;
    stepYard(dt, tNow, Lay);
    for (let lane = 0; lane < Lay.lanes; lane++) {
      const fy = Lay.feet(lane);
      for (const p of plants) {
        if (p.lane !== lane) continue;
        const blink = ((tNow + p.phase * 1.7) % 3.8) < 0.14, f = p.shotT > 0 ? 3 : blink ? 2 : Math.floor((tNow + p.phase) / 0.55) % 2;
        g.fillStyle = 'rgba(34,32,52,.2)'; g.fillRect(Math.round(p.x) - 6, fy - 1, 13, 2);
        drawSprite(g, p.fr[f] || p.fr[0], p.x, fy, false);
      }
      for (const z of zombies) {
        if (z.lane !== lane || !z.started) continue;
        const walking = z.pause <= 0, f = walking ? Math.floor(tNow * 3 + z.v) % 2 : 2;
        g.fillStyle = 'rgba(34,32,52,.2)'; g.fillRect(Math.round(z.x) - 6, fy - 1, 13, 2);
        drawSprite(g, z.fr[f] || z.fr[0], z.x, fy, z.dir < 0);
        if (z.hit > 0) { g.fillStyle = '#d8f8a0'; g.fillRect(Math.round(z.x) - 8, fy - 15, 3, 3); g.fillRect(Math.round(z.x) - 10, fy - 17, 1, 1); g.fillRect(Math.round(z.x) - 6, fy - 18, 1, 1); }
      }
      for (const pe of peas) {
        if (!pe.on || pe.lane !== lane) continue;
        const px = Math.round(pe.x), py = fy - 15;
        g.fillStyle = '#2a5a1c'; g.fillRect(px - 1, py - 2, 3, 5); g.fillRect(px - 2, py - 1, 5, 3);
        g.fillStyle = '#8fe05a'; g.fillRect(px - 1, py - 1, 3, 3); g.fillStyle = '#d8ffb0'; g.fillRect(px - 1, py - 1, 1, 1);
      }
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(b, 0, 0, ww * PXS * dpr, wh * PXS * dpr);
  }
  // zombies shamble in, stop in front of the plants, look surprised and shuffle back off the lawn; shooters pop peas at them
  function stepYard(dt, tNow, Lay) {
    if (calm) { for (let i = 0; i < zombies.length; i++) { const z = zombies[i]; if (!z.started || z.pause < 1e8) { z.started = true; z.dir = -1; z.pause = 1e9; z.x = Math.min(Lay.ww - 10, stopX(z, Lay) + 26 + i * 9); } } return; }
    for (const z of zombies) {
      if (z.hit > 0) z.hit -= dt;
      if (!z.started) { z.wait -= dt; if (z.wait <= 0) { z.started = true; z.x = Lay.ww + 14; z.dir = -1; } continue; }
      if (z.pause > 0) { z.pause -= dt; if (z.pause <= 0) z.dir = 1; continue; }
      z.x += z.dir * z.v * dt;
      if (z.dir < 0 && z.x <= stopX(z, Lay)) { z.x = stopX(z, Lay); z.pause = 1.6 + Math.random(); }
      else if (z.dir > 0 && z.x > Lay.ww + 18) { z.started = false; z.wait = 1.5 + Math.random() * 3; }
    }
    for (const p of plants) {
      if (p.shotT > 0) p.shotT -= dt;
      if (!p.shooter) continue;
      p.t -= dt; if (p.t > 0) continue;
      p.t = 2 + Math.random() * 0.8;
      if (!zombies.some(z => z.started && z.lane === p.lane && z.x > p.x + 12 && z.x < Lay.ww - 4)) continue;
      const pe = peas.find(q => !q.on); if (!pe) continue;
      pe.on = true; pe.x = p.x + 7; pe.lane = p.lane; p.shotT = 0.22;
    }
    for (const pe of peas) {
      if (!pe.on) continue;
      pe.x += 58 * dt;
      if (pe.x > Lay.ww + 4) { pe.on = false; continue; }
      for (const z of zombies) if (z.started && z.lane === pe.lane && pe.x >= z.x - 6 && pe.x < z.x + 6) { pe.on = false; z.hit = 0.15; if (z.dir < 0 && z.pause <= 0) z.x += 2; break; }
    }
  }
  function loop(now) { if (!root || root.hidden) { raf = 0; return; } drawBg(now / 1000); raf = requestAnimationFrame(loop); }

  function open(opts) {
    if (!root) build();
    inGame = !(opts && opts.launch);
    manage = false;
    renderCards(false); paintSound(); paintMusic();
    root.hidden = false; root.querySelector('.mm-scroll').scrollTop = 0; PS.ui.menuOpen = true;
    try { calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { calm = false; }
    lastT = 0; if (!raf) raf = requestAnimationFrame(loop);
    try { if (window.PX && PX.Music) PX.Music.play('title'); } catch (e) { /* audio optional */ }
  }
  function close() {
    const was = root && !root.hidden;
    if (root) root.hidden = true; PS.ui.menuOpen = false;
    if (was) try { if (PS.ui.music) PS.ui.music(); } catch (e) { /* audio optional */ }
  }

  PS.ui.mainMenu = open;
  PS.ui.closeMainMenu = close;
})();
