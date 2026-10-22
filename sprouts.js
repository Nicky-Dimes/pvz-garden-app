// sprouts.js -- PVZ Garden Almanac: a book with three tabs. My plants (your plants and waiting seed packets, each with its own
// page: stats, evolution path, elements, fusion, moves, battle stats, race ratings, records), Plants (every plant: art, element,
// stat bars, moves, a fun fact, how to unlock it) and Zombies (every zombie: toughness/speed bars, where it's met, a silly fact).
// Every 10 entries gives a prize. Exposes PS.almanac.counts() for the title screen.
// Scene: PS.scenes.sprouts = { mount, show({id}), hide, frame }. Styles are injected below (prefix .sp-).
(function () {
  'use strict';
  const { D, state } = PS;
  const fmt = n => Math.round(n).toLocaleString();
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  const CSS = `
/* the header and tabs (or the back button) stay on top; the list or the plant's page scrolls in the box below, with a scroll bar */
.sp-page{position:absolute;inset:0;display:flex;flex-direction:column}
.sp-pin{flex:0 0 auto;width:100%;max-width:500px;margin:0 auto;padding:12px 28px 0 12px;display:grid;gap:12px}
.sp-box{padding-left:12px}
@media (max-height:560px){.sp-pin .sp-head{display:none}} /* (a phone on its side: the list needs the room) */
.sp-wrap{padding:12px 0 28px;max-width:460px;margin:0 auto;display:grid;gap:12px}
.sp-head{padding:12px 14px;display:flex;align-items:center;gap:10px}
.sp-head h1{margin:0;font-size:26px;color:var(--ink)}
.sp-head .sp-sub{font-size:14px;color:var(--ink-soft);margin-top:2px}
.sp-head .sp-count{margin-left:auto;font-family:var(--f-ui);font-weight:700;font-size:16px;background:var(--slot);border:2px solid var(--line);border-radius:12px;padding:3px 10px}
.sp-lbl{font-family:var(--f-ui);font-weight:600;font-size:14px;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-soft);margin:4px 4px -4px;display:flex;align-items:center;gap:8px}
.sp-lbl .n{background:var(--slot);border:2px solid var(--line);border-radius:10px;padding:0 7px;letter-spacing:0;color:var(--ink)}
.sp-list{display:grid;gap:10px}
.sp-row{display:grid;grid-template-columns:76px 1fr auto;align-items:center;gap:12px;width:100%;text-align:left;background:var(--panel);border:2px solid var(--line);border-bottom:5px solid var(--edge);
  border-radius:20px;padding:8px 12px 8px 8px;color:var(--ink)}
.sp-row:active{transform:translateY(2px);border-bottom-width:3px;margin-bottom:2px}
.sp-row:focus-visible{outline:3px solid var(--focus);outline-offset:2px}
.sp-row.partner{border-color:var(--sun-edge);box-shadow:inset 0 0 0 2px var(--sun)}
.sp-pic{height:76px;border-radius:14px;background:var(--slot);display:flex;align-items:flex-end;justify-content:center;overflow:hidden}
.sp-pic canvas{display:block;margin-bottom:4px}
.sp-row b{display:block;font-family:var(--f-px);font-weight:700;font-size:20px;line-height:1.1}
.sp-row small{display:block;font-size:14px;line-height:1.35;color:var(--ink-soft)}
.sp-row .sp-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.sp-lv{display:grid;justify-items:center;gap:2px}
.sp-lv .num{font-size:22px;line-height:1}
.sp-lv span:not(.num){font-family:var(--f-ui);font-size:13.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-soft)}
.sp-tag{display:inline-block;font-family:var(--f-ui);font-weight:600;font-size:13.5px;background:var(--sun);border:2px solid var(--sun-edge);color:#4a3210;border-radius:8px;padding:0 6px;margin-left:6px;vertical-align:3px}
.sp-chip{display:inline-flex;align-items:center;gap:4px;border-radius:8px;padding:0 7px;font-family:var(--f-ui);font-weight:600;font-size:14px;line-height:18px;color:#fff;white-space:nowrap}
.sp-chip.soft{background:var(--slot);color:var(--ink);border:1px solid var(--line)}
.sp-egg{display:grid;grid-template-columns:56px 1fr auto;align-items:center;gap:12px;background:var(--panel);border:2px dashed var(--edge);border-radius:18px;padding:8px 12px 8px 8px}
.sp-egg .sp-pic{height:62px}
.sp-egg b{display:block;font-family:var(--f-px);font-weight:700;font-size:17px}
.sp-egg small{display:block;font-size:14px;color:var(--ink-soft);line-height:1.35}
.sp-empty{padding:18px;text-align:center}
.sp-empty p{margin:6px 0 12px;line-height:1.45}
.sp-acct{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px}
.sp-dev{justify-self:center;background:none;border:0;padding:8px 12px;font-family:var(--f-ui);font-weight:600;font-size:14px;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-soft);opacity:.75;text-decoration:underline;text-underline-offset:3px}

/* detail */
.sp-top{display:flex;align-items:center;gap:8px}
.sp-back{display:inline-flex;align-items:center;gap:6px;font-size:15px;padding:7px 12px 6px}
.sp-hero{padding:14px;display:grid;gap:10px;justify-items:center;text-align:center}
.sp-stagebox{position:relative;width:100%;height:190px;border-radius:18px;overflow:hidden;display:flex;align-items:flex-end;justify-content:center;
  background:linear-gradient(#cfeefc 0 58%, #a6dc8f 58% 100%);border:2px solid var(--line)}

.sp-stagebox.graveyard{background:linear-gradient(#2f2a5e 0 58%, #3a7a62 58% 100%)}
.sp-stagebox.pirate{background:linear-gradient(#bfe6ff 0 58%, #f2d49a 58% 100%)}
.sp-stagebox.egypt{background:linear-gradient(#bce2f0 0 58%, #f0d898 58% 100%)}
/* almanac tabs + collection grid */
.sp-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.sp-tabs button{border:2px solid var(--line);border-bottom-width:4px;border-radius:14px;background:var(--slot);padding:8px 4px;font:600 16px var(--f-ui);color:var(--ink-soft)}
.sp-tabs button[aria-selected="true"]{background:var(--panel);border-color:var(--sun-edge);color:var(--ink);box-shadow:inset 0 -4px 0 var(--sun)}
.sp-coll{display:grid;grid-template-columns:repeat(auto-fill,minmax(98px,1fr));gap:8px}
.sp-ctile{position:relative;display:grid;justify-items:center;gap:2px;background:var(--panel);border:2px solid var(--line);border-bottom:4px solid var(--edge);border-radius:16px;padding:8px 4px 7px;text-align:center;color:var(--ink)}
.sp-legend{display:inline-block;margin-left:3px;padding:0 5px;border-radius:8px;background:#ffd75a;color:#6a4a10;font:700 10.5px var(--f-ui);vertical-align:middle}
.sp-ctile.locked.legend{border-color:#e6b84a;background:#fff8dc}
.sp-ctile canvas{display:block}
.sp-ctile b{font:600 14px/1.1 var(--f-ui)}
.sp-ctile small{font-size:12px;color:var(--ink-soft);line-height:1.2}
.sp-ctile.locked{background:var(--slot);border-style:dashed}
.sp-ctile.locked canvas{filter:brightness(0) opacity(.25)}
.sp-ctile .cnt{position:absolute;top:-7px;right:-5px;min-width:22px;height:20px;padding:0 5px;display:grid;place-items:center;border-radius:10px;background:var(--sun);border:2px solid var(--sun-edge);font:700 12.5px var(--f-ui);color:#4a3210}
.sp-prog{font-size:14px;color:var(--ink-soft);font-weight:600;margin:0 4px}
.sp-sp-evo{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:6px 0 4px}
.sp-sp-evo div{display:grid;justify-items:center;gap:2px;background:var(--slot);border:2px solid var(--line);border-radius:12px;padding:6px 2px;text-align:center;font:600 13px/1.15 var(--f-ui)}
.sp-fuse{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center;background:#f4ecff;border:2px solid #b8a0e0;border-radius:14px;padding:8px 10px}
.sp-fuse canvas{display:block}
.sp-fuse p{margin:0;font-size:14px;line-height:1.4}
.sp-stagebox canvas{display:block;margin-bottom:14px;cursor:pointer}
.sp-stagebox .sp-where{position:absolute;left:8px;top:8px;font-family:var(--f-ui);font-weight:600;font-size:14px;background:rgba(255,248,230,.9);border-radius:8px;padding:2px 8px;color:var(--ink)}
.sp-namebox{display:flex;align-items:center;gap:6px;width:100%;max-width:300px}
.sp-name-in{flex:1;min-width:0;font-family:var(--f-px);font-weight:700;font-size:26px;text-align:center;color:var(--ink);background:var(--field);border:2px solid var(--line);border-radius:12px;padding:4px 8px;
  -webkit-user-select:text;user-select:text;touch-action:manipulation}
.sp-name-in:focus{outline:3px solid var(--focus);outline-offset:1px}
.sp-form{font-size:15px;color:var(--ink-soft);margin-top:-4px}
.sp-form b{color:var(--ink);font-weight:600}
.sp-acts{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%}
.sp-acts .btn{font-size:15px}
.sp-acts .btn[disabled]{opacity:.7;cursor:default}
.sp-mood{width:100%;text-align:left}
.sp-mood small{font-family:var(--f-ui);font-size:13.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-soft);display:flex;justify-content:space-between}
.sp-happy{margin:5px 0 0;font-size:14px;line-height:1.3;color:var(--ink-soft)}
.sp-happy.on{color:#a2334a;font-weight:600}
.sp-shiny{display:inline-flex;align-items:center;gap:3px;border-radius:8px;padding:0 8px;font-family:var(--f-ui);font-weight:700;font-size:14px;line-height:20px;white-space:nowrap;color:#5e2f86;
  background:linear-gradient(100deg,#fff4c2 0%,#ffd6ef 30%,#d4f1ff 60%,#fff4c2 100%);background-size:250% 100%;border:1px solid #d9a0e8;animation:sp-shine 2.6s ease-in-out infinite alternate}
@keyframes sp-shine{from{background-position:0% 50%}to{background-position:100% 50%}}
@media (prefers-reduced-motion: reduce){.sp-shiny{animation:none}}

.sp-sec{padding:14px}
.sp-fold-h{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;width:100%;cursor:pointer;min-height:36px}
.sp-fold-h h2{flex:1}
.sp-chev{flex:0 0 auto;width:30px;height:30px;border-radius:10px;display:grid;place-items:center;background:var(--slot);border:2px solid var(--line);font-size:14px;color:var(--ink-soft);transition:transform .15s}
.sp-fold.open .sp-chev{transform:rotate(180deg)}
.sp-fold-sum{margin-top:8px;cursor:pointer}
.sp-more{display:block;margin-top:8px;font-size:14px;font-weight:700;color:var(--accent,#c0612a)}
.sp-fold-less{all:unset;cursor:pointer;display:block;margin:12px auto 0;padding:6px 14px;font-size:14px;font-weight:700;color:var(--ink-soft)}
.sp-fold-line{margin:0;font-size:14px;color:var(--ink-soft);font-weight:600;line-height:1.4}
.sp-fold-line b{color:var(--ink)}
.sp-mchips{display:flex;flex-wrap:wrap;gap:6px}
.sp-mchip{display:inline-flex;align-items:center;gap:6px;padding:4px 10px 4px 6px;border-radius:10px;background:var(--field);border:2px solid var(--line);font-family:var(--f-ui);font-weight:600;font-size:14.5px}
.sp-mchip i{width:8px;height:14px;border-radius:3px;display:block}
.sp-bicons{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.sp-bico{position:relative;width:40px;height:40px;border-radius:10px;background:var(--field);border:2px solid var(--line);display:grid;place-items:center}
.sp-bico canvas{width:36px;height:36px;image-rendering:pixelated;image-rendering:crisp-edges}
.sp-bico i{position:absolute;right:-6px;bottom:-6px;font-style:normal;font:700 14px/17px var(--f-ui);background:var(--sun);border:2px solid var(--sun-edge);border-radius:8px;padding:0 4px;color:#4a3210}
.sp-bmore{font-family:var(--f-ui);font-weight:700;font-size:15px;color:var(--ink-soft);padding:0 4px}
.sp-sec h2{margin:0;font-family:var(--f-px);font-weight:700;font-size:20px;color:var(--ink);display:flex;align-items:center;gap:8px}
.sp-sec h2 .sp-aside{margin-left:auto;font-family:var(--f-ui);font-weight:600;font-size:14px;color:var(--ink-soft)}
.sp-sec .sp-note{margin:4px 0 10px;font-size:14px;line-height:1.4;color:var(--ink-soft)}
.sp-stats{display:grid;gap:4px}
.sp-els{display:flex;gap:5px;justify-content:center;margin-top:-6px}
.sp-stat{display:grid;grid-template-columns:70px 50px 1fr;align-items:center;gap:8px}
.sp-stat .nm{font-family:var(--f-ui);font-weight:700;font-size:16px}
.sp-stat .lv{font-weight:700;font-size:15px;font-variant-numeric:tabular-nums}
.sp-stat .xp{grid-column:3;font-size:14px;color:var(--ink-soft);margin-top:-7px;text-align:right;font-variant-numeric:tabular-nums}
.sp-stat .bar{height:12px}

.sp-nat{position:relative;height:18px;border-radius:9px;border:2px solid var(--line);
  background:linear-gradient(90deg,#9a6ad0 0%,#c9a2f0 37.5%,#bfe3b4 37.5%,#bfe3b4 62.5%,#fff27a 62.5%,#f6c83a 100%)}
.sp-nat i{position:absolute;top:-6px;width:10px;height:26px;margin-left:-5px;border-radius:5px;background:var(--ink);border:2px solid var(--panel)}
.sp-nat-l{display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-family:var(--f-ui);font-weight:600;font-size:14px;color:var(--ink-soft)}
.sp-nat-l canvas{width:14px;height:14px;vertical-align:-2px;margin:0 4px}
.sp-nat-now{margin:10px 0 0;font-size:14px;line-height:1.4}

.sp-evo{display:grid;grid-template-columns:1fr 18px 1fr 18px 1fr;align-items:end;gap:2px;margin-top:10px}
.sp-evo .st{display:grid;justify-items:center;gap:3px;text-align:center}
.sp-evo .st .pic{width:100%;height:84px;border-radius:14px;background:var(--slot);border:2px solid var(--line);display:flex;align-items:flex-end;justify-content:center;overflow:hidden}
.sp-evo .st .pic canvas{display:block;margin-bottom:3px}
.sp-evo .st.now .pic{border-color:var(--sun-edge);box-shadow:inset 0 0 0 2px var(--sun);background:var(--panel)}
.sp-evo .st.done .pic{opacity:.75}
.sp-evo .st.next .pic{border-style:dashed}
.sp-evo .st.next .pic canvas{opacity:.55;filter:saturate(.7)}
.sp-evo .st b{font-family:var(--f-ui);font-weight:700;font-size:14.5px;line-height:1.1}
.sp-evo .st small{font-size:14px;color:var(--ink-soft);line-height:1.2}
.sp-evo .arr{align-self:center;font-family:var(--f-px);font-weight:700;color:var(--edge);text-align:center;padding-bottom:30px}
.sp-evo-bar{margin-top:12px;font-size:14px}
.sp-evo-bar .row{display:flex;justify-content:space-between;margin-bottom:5px}
.sp-evo-bar .bar{height:14px}
.sp-flowers{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px}
.sp-flower{display:grid;justify-items:center;gap:2px;padding:7px 4px 6px;border-radius:12px;background:var(--field);border:2px solid var(--line);text-align:center}
.sp-flower canvas{width:30px;height:30px}
.sp-flower b{font-family:var(--f-ui);font-weight:600;font-size:14.5px;line-height:1.1}
.sp-flower small{font-size:14px;color:var(--ink-soft)}
.sp-flower.pick{border-color:var(--sun-edge);background:var(--panel);box-shadow:inset 0 -3px 0 var(--sun)}
.sp-flower.pick small{color:#8a5a10;font-weight:600}

.sp-moves{display:grid;gap:8px;margin-top:10px}
.sp-move{display:grid;grid-template-columns:8px 1fr auto;gap:0 10px;align-items:center;background:var(--field);border:2px solid var(--line);border-radius:14px;padding:7px 10px 7px 7px}
.sp-move>i{grid-row:span 2;align-self:stretch;border-radius:4px}
.sp-move b{font-family:var(--f-ui);font-weight:700;font-size:16px}
.sp-move small{grid-column:2/-1;font-size:13.5px;line-height:1.3;color:var(--ink-soft)}
.sp-move .pw{font-size:14px;font-weight:600;color:var(--ink-soft);text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.sp-move.active{background:var(--panel);border-color:var(--sun-edge);border-bottom-width:4px}
.sp-move.locked{opacity:.55;background:var(--slot)}
.sp-move.compact{grid-template-columns:6px 1fr auto;padding:5px 10px 5px 6px;border-radius:11px}
.sp-move.compact>i{grid-row:auto}
.sp-move.compact b{font-size:14px;display:flex;align-items:center;gap:6px}
.sp-move.compact.battle{border-color:var(--sun-edge)}
.sp-inb{font-family:var(--f-ui);font-weight:600;font-size:13px;background:var(--sun);color:#4a3210;border-radius:6px;padding:0 5px;line-height:16px}
.sp-grp{margin-top:14px}
.sp-grp h3{margin:0 0 6px;font-family:var(--f-ui);font-weight:600;font-size:14.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-soft);display:flex;align-items:center;gap:6px}
.sp-grp h3 canvas{width:22px;height:22px}
.sp-grp .sp-moves{margin-top:0;gap:6px}
.sp-lock{font-size:14px;font-weight:600;color:#8a5a10;background:#fff1c9;border-radius:6px;padding:0 6px;white-space:nowrap}

.sp-bonds{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px;margin-top:10px}
.sp-bond{position:relative;display:grid;justify-items:center;gap:2px;background:var(--field);border:2px solid var(--line);border-radius:14px;padding:8px 4px 7px;text-align:center}
.sp-bond.rare{border-color:#d9a0e8;background:#fbf0ff}
.sp-bond b{font-family:var(--f-ui);font-weight:600;font-size:14.5px;line-height:1.1}
.sp-bond small{font-size:14px;color:var(--ink-soft)}
.sp-bond .cnt{position:absolute;top:-7px;right:-5px;min-width:24px;height:22px;padding:0 5px;display:grid;place-items:center;border-radius:11px;background:var(--sun);border:2px solid var(--sun-edge);font-family:var(--f-ui);font-weight:700;font-size:14px;color:#4a3210}
.sp-pips{display:flex;gap:3px}
.sp-pips i{width:8px;height:8px;border-radius:2px;background:var(--slot);border:1px solid var(--edge)}
.sp-pips i.on{background:var(--accent);border-color:var(--accent-edge)}

.sp-parts{display:grid;gap:8px;margin-top:10px}
.sp-part{display:grid;grid-template-columns:110px 1fr 66px;gap:8px;align-items:center;font-size:14px}
.sp-part b{font-weight:600}
.sp-part small{font-size:14px;color:var(--ink-soft);text-align:right}

.sp-bstats{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:10px}
.sp-bstat{display:grid;justify-items:center;background:var(--field);border:2px solid var(--line);border-radius:12px;padding:6px 2px}
.sp-bstat .num{font-size:19px;line-height:1.1}
.sp-bstat small{font-family:var(--f-ui);font-size:13.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-soft)}
.sp-race{display:grid;grid-template-columns:70px 1fr 38px;gap:8px;align-items:center;margin-top:8px}
.sp-race .nm{font-family:var(--f-ui);font-weight:700;font-size:15px}
.sp-race .num{font-size:14px;text-align:right}
.sp-recs{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px}
.sp-rec{background:var(--field);border:2px solid var(--line);border-radius:12px;padding:8px 10px}
.sp-rec .num{font-size:20px}
.sp-rec small{display:block;font-size:14px;color:var(--ink-soft)}
.sp-muted{font-size:14px;color:var(--ink-soft);margin:8px 0 0;line-height:1.4}

/* style: paint, stickers, closet */
.sp-dress{grid-column:1/-1;display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px}
.sp-dress canvas{display:block;margin:-4px 0}
.sp-skin{display:inline-flex;align-items:center;gap:4px;border-radius:8px;padding:0 8px 0 4px;font-family:var(--f-ui);font-weight:600;font-size:14px;line-height:20px;white-space:nowrap;
  background:#fff1c9;border:1px solid #e0b040;color:#6a4a10}
.sp-skin canvas{display:block;width:13px;height:13px}
.sp-style-top{position:sticky;top:0;z-index:2;display:grid;grid-template-columns:104px 1fr;gap:12px;align-items:center;margin:4px -6px 0;padding:6px 6px 8px;background:var(--panel);border-radius:0 0 16px 16px}
.sp-mirror{height:112px;cursor:pointer;border-radius:16px;background:linear-gradient(#cfeefc 0 62%, #a6dc8f 62% 100%);border:2px solid var(--line);display:flex;align-items:flex-end;justify-content:center;overflow:hidden}
.sp-mirror canvas{display:block;margin-bottom:6px}
.sp-style-top p{margin:0;font-size:14px;line-height:1.4;color:var(--ink-soft)}
.sp-style-top p b{color:var(--ink);font-weight:600}
.sp-srow{margin-top:14px}
.sp-srow>.sp-lbl{margin:0 2px 0}
.sp-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;margin-top:8px}
.sp-tile{position:relative;display:grid;justify-items:center;align-content:start;gap:3px;min-height:92px;background:var(--field);border:2px solid var(--line);border-bottom-width:4px;
  border-radius:14px;padding:9px 4px 7px;text-align:center;color:var(--ink)}
.sp-tile:active{transform:translateY(2px);border-bottom-width:2px;margin-bottom:2px}
.sp-tile:focus-visible{outline:3px solid var(--focus);outline-offset:2px}
.sp-tile canvas{display:block;margin-bottom:3px}
.sp-tile b{font-family:var(--f-ui);font-weight:600;font-size:16px;line-height:1.1}
.sp-tile small{font-size:13.5px;line-height:1.2;color:var(--ink-soft)}
.sp-tile.on{border-color:var(--sun-edge);background:var(--panel);box-shadow:inset 0 0 0 2px var(--sun)}
.sp-tile.on small{color:#8a5a10;font-weight:600}
.sp-tile .cnt{position:absolute;top:-7px;right:-5px;min-width:26px;height:24px;padding:0 6px;display:grid;place-items:center;border-radius:12px;background:var(--sun);border:2px solid var(--sun-edge);
  font-family:var(--f-ui);font-weight:700;font-size:14.5px;color:#4a3210}
.sp-none{margin:6px 2px 0;font-size:14px;line-height:1.4;color:var(--ink-soft)}
.sp-gbcta{display:grid;grid-template-columns:auto 1fr;gap:8px 12px;align-items:center;background:var(--field);border:2px dashed var(--line);border-radius:16px;padding:10px 12px 12px;margin-top:14px}
.sp-gbcta canvas{display:block}
.sp-gbcta p{margin:0;font-size:15px;line-height:1.35;color:var(--ink)}
.sp-gbcta .btn{grid-column:1/-1;min-height:48px}
.sp-ba{display:flex;align-items:center;justify-content:center;gap:6px;margin:2px 0 12px}
.sp-ba figure{margin:0;display:grid;justify-items:center;gap:4px}
.sp-ba .pic{width:104px;height:104px;border-radius:16px;background:var(--slot);border:2px solid var(--line);display:flex;align-items:flex-end;justify-content:center;overflow:hidden}
.sp-ba .pic canvas{display:block;margin-bottom:3px}
.sp-ba .pic.after{border-color:var(--sun-edge);box-shadow:inset 0 0 0 2px var(--sun);background:var(--panel)}
.sp-ba figcaption{font-family:var(--f-ui);font-weight:600;font-size:14px;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-soft)}
.sp-ba .arr{font-family:var(--f-px);font-weight:700;font-size:28px;color:var(--edge);padding-bottom:20px}
.sp-warn{background:#fff1c9;border:2px solid #f0c860;border-radius:12px;padding:8px 10px;font-size:14px;line-height:1.4}
.card p.sp-m-left{text-align:center;font-size:14px;color:var(--ink-soft);margin:0 0 4px}

/* sell */
.sp-sell{display:grid;justify-items:center;gap:6px;margin-top:4px}
.sp-sell-btn{display:inline-flex;align-items:center;gap:8px;min-height:48px;padding:8px 16px;background:transparent;border:2px dashed var(--edge);border-bottom-width:2px;color:var(--ink-soft);font-size:15px}
.sp-sell-btn:active{transform:translateY(1px);border-bottom-width:2px;margin-bottom:0}
.sp-sell-btn canvas{width:18px;height:18px}
.sp-sell-btn[disabled]{opacity:.55;cursor:default}
.sp-sell-btn[disabled]:active{transform:none}
.sp-sell p{margin:0;font-size:14px;color:var(--ink-soft)}
.m-body .sp-sell-price{display:flex;align-items:center;justify-content:center;gap:6px;font-family:var(--f-px);font-weight:600;font-size:20px;margin:0 0 8px;color:var(--ink)}
.m-body .sp-sell-price canvas{width:18px;height:18px}
.m-body p.sp-sell-say{text-align:center;font-size:16px}
/* the sell pop-ups: "Keep" is the big, easy choice; selling is small and needs a second yes */
.modal-btns .btn.sp-keep{font-size:21px;padding:15px 12px}
.modal-btns .btn.sp-sell-go{font-size:15px;padding:9px 12px;background:transparent;border:2px dashed var(--edge);border-bottom-width:2px;color:var(--ink-soft)}
.modal-btns .btn.sp-sell-go:active{transform:translateY(1px);border-bottom-width:2px;margin-bottom:0}
.modal-btns .btn.sp-sell-yes{font-size:15px;padding:9px 12px}
.modal-btns .btn.sp-sell-yes[disabled]{opacity:.45;cursor:default}
.modal-btns .btn.sp-sell-yes[disabled]:active{transform:none;border-bottom-width:5px;margin-bottom:0}

/* ---- the Almanac book: progress, three tabs, tiles, and a page per plant or zombie ---- */
.sp-bookh{flex-wrap:wrap;border-left:10px solid #4f9e36;padding:10px 12px 10px 10px;row-gap:6px}
.sp-hmain{flex:1 1 180px;min-width:0}
.sp-pg{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.sp-pchip{display:inline-flex;align-items:center;gap:5px;background:var(--slot);border:2px solid var(--line);border-radius:10px;padding:2px 8px 2px 4px;font:700 14px var(--f-ui);color:var(--ink-soft)}
.sp-pchip b{color:var(--ink);font-size:15px}
.sp-pchip canvas{width:22px;height:22px}
.sp-prize{display:flex;align-items:center;gap:6px;flex:1 1 100%;background:#fff4c2;border:2px solid #e0b040;border-radius:12px;padding:4px 8px}
.sp-p10{display:flex;gap:3px;flex:1}
.sp-p10 i{flex:1;max-width:24px;height:14px;border-radius:5px;background:#f3e2b0;border:2px solid #d8b860}
.sp-p10 i.on{background:#6cc04a;border-color:#3f8a2a}
.sp-prize canvas{width:22px;height:22px}
.sp-prize small{font:800 13px var(--f-ui);color:#8a5a10;white-space:nowrap}
.sp-tabs3{grid-template-columns:repeat(3,1fr)}
.sp-tabs3 button{display:flex;align-items:center;justify-content:center;gap:6px;min-height:52px;font-size:15.5px;padding:6px 4px}
.sp-tabs3 button canvas{width:26px;height:26px;flex:0 0 auto}
.sp-ctile{min-height:118px;align-content:start}
.sp-no{position:absolute;top:4px;left:7px;font:700 11px var(--f-ui);font-style:normal;color:var(--ink-soft);opacity:.75}
.sp-flipx{transform:scaleX(-1)}
.sp-ctile.zt{background:#eef3e6}
.sp-ctile.zt.locked{background:var(--slot)}
.sp-sil{filter:brightness(0) opacity(.3)}
.sp-pnav{display:flex;align-items:center;gap:8px}
.sp-pno{margin-left:auto;font:700 15px var(--f-ui);color:var(--ink-soft)}
.sp-arrow{min-width:56px;min-height:48px;font:700 32px/1 var(--f-ui);padding:2px 10px 6px}
@media (min-width:700px){.sp-pin{max-width:800px}}
@media (max-width:480px){.sp-bookh>canvas{display:none}.sp-bookh{border-left-width:7px}.sp-pchip{font-size:13px;padding:1px 6px 1px 3px}.sp-tabs3 button{gap:4px;font-size:14.5px}.sp-tabs3 button canvas{width:22px;height:22px}}
.sp-paper{padding:14px;display:grid;gap:10px;justify-items:center;text-align:center;background:#fffdf3;box-shadow:inset 10px 0 0 #efe3c0}
.sp-paper.turn-n{animation:spTurnN .3s ease-out}
.sp-paper.turn-p{animation:spTurnP .3s ease-out}
@keyframes spTurnN{from{transform:perspective(900px) translateX(30px) rotateY(-14deg);opacity:.3}}
@keyframes spTurnP{from{transform:perspective(900px) translateX(-30px) rotateY(14deg);opacity:.3}}
@media (prefers-reduced-motion: reduce){.sp-paper.turn-n,.sp-paper.turn-p{animation:none}}
.sp-stagebox.zb{background:linear-gradient(#c7d3ea 0 58%, #93c27e 58% 100%)}
.sp-ptitle{margin:0;font-size:28px;color:var(--ink);line-height:1.1}
.sp-blurb{margin:-2px 0 0;font-size:15px;line-height:1.4;color:var(--ink-soft)}
.sp-stgs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;width:100%}
.sp-stg{display:grid;justify-items:center;align-content:end;gap:2px;background:var(--slot);border:2px solid var(--line);border-bottom-width:4px;border-radius:14px;padding:6px 2px 5px;color:var(--ink);min-height:96px}
.sp-stg b{font:600 13px/1.15 var(--f-ui)}
.sp-stg.on{background:var(--panel);border-color:var(--sun-edge);box-shadow:inset 0 -3px 0 var(--sun)}
.sp-fact{width:100%;text-align:left;background:#fff4c2;border:2px solid #e0b040;border-radius:16px;padding:8px 12px}
.sp-fact b{font:800 13px var(--f-ui);letter-spacing:.05em;text-transform:uppercase;color:#8a5a10}
.sp-fact p{margin:2px 0 0;font-size:17px;font-weight:600;line-height:1.35;color:#4a3210}
.sp-fact.locked{background:var(--slot);border-color:var(--line)}
.sp-fact.locked b,.sp-fact.locked p{color:var(--ink-soft)}
.sp-bars{width:100%;display:grid;gap:6px}
.sp-sbar{display:grid;grid-template-columns:72px 1fr;align-items:center;gap:8px;text-align:left}
.sp-sbar .nm{font:700 15px var(--f-ui);color:var(--ink)}
.sp-sbar .bk{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
.sp-sbar .bk i{height:16px;border-radius:5px;background:var(--slot);border:2px solid var(--line)}
.sp-sbar .bk i.on{border-color:rgba(0,0,0,.25)}
.sp-wchip canvas{width:18px;height:18px}
.sp-minelist{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
.sp-mine{display:grid;justify-items:center;align-content:end;gap:2px;min-width:84px;min-height:84px;background:var(--field);border:2px solid var(--line);border-bottom-width:4px;border-radius:14px;padding:6px 8px;color:var(--ink)}
.sp-mine b{font:600 13.5px var(--f-ui);max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
`;
  function injectCSS() { if (document.getElementById('sp-css')) return; const st = document.createElement('style'); st.id = 'sp-css'; st.textContent = CSS; document.head.appendChild(st); }

  // ---------- Almanac fun facts (our own silly one-liners, short enough to read aloud) ----------
  const PLANT_FACTS = {
    peashooter: 'It can spit a pea faster than you can blink!', sunflower: 'It hums a happy song whenever the sun comes out.',
    chomper: 'It has no eyes, but it never misses a snack.', wallnut: 'It loves staring contests. It always wins.',
    snowpea: 'Its peas are so cold they give zombies brain freeze!', cherrybomb: 'The two cherries argue all day about who is grumpier.',
    potatomine: 'It naps under the dirt until something steps on it.', puffshroom: 'Small and stinky, and very proud of it.',
    sunshroom: 'It starts tiny and grows up to glow like a lamp.', cabbagepult: 'It loves cabbage so much it throws it at everyone.',
    melonpult: 'Each melon is as heavy as a bowling ball. SPLAT!', kernelpult: 'Butter makes everything better. Even zombie hats.',
    squash: 'It only stops frowning when it squishes something.', jalapeno: 'So hot that even its leaves are sweating.',
    cactus: 'Prickly on the outside, a big softie on the inside.', spikeweed: 'Zombies who step on it hop around yelling OUCH!',
    torchwood: 'Peas that pass through its fire come out toasty.', lilypad: 'It gives free rides across the pond. All aboard!',
    tanglekelp: 'It hides in the water, waiting to give a big hug.', starfruit: 'It makes a wish on every star it shoots.',
    magnetshroom: 'It collects buckets, helmets and lost keys.', hypnoshroom: 'Look into its swirly eyes... you feel sleepy...',
    doomshroom: 'Its boom is so big it leaves a giant hole!', iceberg: 'The coolest lettuce in any salad. Brrr!',
    bonkchoy: 'It does one hundred push-ups every morning.', lightningreed: 'It crackles and glows when a storm is near.',
    laserbean: 'Its laser goes ZIP all the way across the lawn.', garlic: 'Zombies hold their noses and walk the other way.',
    snapdragon: 'It loves to toast marshmallows with its breath.', marigold: 'It finds shiny coins wherever it grows.',
    pumpkin: 'A cozy shell that friends can hide inside.', coconut: 'It fires coconuts as big as beach balls!',
    bloomerang: 'It throws its petal and catches it on the way back.', blueberry: 'One zap and a zombie\'s hair stands straight up.',
    infinut: 'Its glowing shield fixes itself again and again.', threepeater: 'Three heads means it never gets lonely.',
    splitpea: 'It can see behind itself. Sneaky zombies beware!', scaredyshroom: 'Brave from far away, very shy up close.',
    iceshroom: 'One shiver and the whole lawn freezes.', seashroom: 'The only mushroom that loves to swim.',
    plantern: 'A night-light that never runs out of glow.', blover: 'One big puff can blow the fog away!',
    cattail: 'It purrs while it shoots its spikes.', umbrellaleaf: 'Always ready for rain, or for falling zombies.',
    coffeebean: 'One sip and sleepy mushrooms wake right up!', gravebuster: 'It crunches gravestones like crackers.',
    springbean: 'It says BOING a hundred times a day.', chilibean: 'Eat it and you make a VERY stinky cloud.',
    peapod: 'It grows a new head every time it grows up.', hotpotato: 'Warm enough to melt a block of ice.',
    pepperpult: 'It keeps its friends toasty on snowy days.', stunion: 'So smelly that zombies forget where they were going.',
    redstinger: 'It shoots sharp petals and smells like roses.', electriccurrant: 'A little ghost berry that goes buzz in the dark.',
    endurian: 'Bite it and you\'ll be sorry. Ouch!', citron: 'It came from the future to save the lawn.',
    empeach: 'Zombie robots go fizzle when it pulses.', celerystalker: 'It sneaks around so quietly you\'ll never hear it.',
    guacodile: 'Half snack, half crocodile, all smiles.', bananalauncher: 'It can launch a banana across the whole yard!',
    moonflower: 'It only blooms when the moon is out.', magnifyinggrass: 'It turns sunshine into a super-hot beam.',
    shadowshroom: 'It loves the dark. It does not love bath time.', hurrikale: 'Its windy spin blows zombies backward.',
    firepeashooter: 'Its peas could roast a marshmallow.', imitater: 'It can copy any plant. Even its sneeze!',
    powerlily: 'It glows so bright it powers up its friends.', chardguard: 'It pushes zombies away with a big leafy shove.',
    sunbean: 'Full of sunshine all the way to its toes.', akee: 'Its shiny seeds bounce like rubber balls.',
    goldleaf: 'Shiny gold, and it makes its friends stronger.', toadstool: 'Its tongue is longer than its whole body!',
    strawburst: 'Sweet, red and ready to go POP!', bowlingbulb: 'It always rolls a strike. Every time.',
    homingthistle: 'Its darts chase zombies around corners.', stallia: 'Its chilly petals make zombies slow as snails.',
    phatbeet: 'It drops beats so loud zombies cover their ears.', sporeshroom: 'It plants baby mushrooms wherever it puffs.',
    intensivecarrot: 'It carries a tiny bandage for every friend.', primalpeashooter: 'Its peas are made of rock. Heavy!',
    primalwallnut: 'Older than the dinosaurs and twice as tough.', perfumeshroom: 'It smells like flowers and candy.',
    nightshade: 'It comes out to play when the stars do.', dusklobber: 'Its spore balls glow like little lanterns.',
    grimrose: 'Its thorny vine can tug a zombie away.', sweetpotato: 'Zombies can\'t say no to its sweet smell.',
    wasabiwhip: 'Spicy enough to make a zombie cry.', missiletoe: 'Its frosty missiles whistle as they fly.',
    kiwibeast: 'Fuzzy, fierce, and it loves a good hug.', dandelion: 'Make a wish and blow its fluffy seeds!',
    hollybarrier: 'A prickly hedge that never melts.', witchhazel: 'It waves its little twig and casts silly spells.',
    caulipower: 'Its big brain is full of clever ideas.', shrinkingviolet: 'Shy, but it can shrink zombies down tiny!',
    goopeashooter: 'Its peas are sticky like slime.', electricpeashooter: 'Its peas crackle with tiny sparks.',
    solartomato: 'It wears sunglasses even at night. So cool!', coldsnapdragon: 'It breathes snowflakes instead of fire.',
    shinevine: 'It wraps its friends in a warm, glowing hug.', slingpea: 'It flings peas way up high, over walls!',
    applemortar: 'An apple a day keeps the zombies away!', pomegranatepult: 'It lobs a whole handful of seeds at once.',
    bombegranate: 'Packed with seeds that all go BOOM.', dartichoke: 'Its leaves fly like little darts.',
    rotobaga: 'It spins like a top and shoots everywhere.', lavaguava: 'Bubbly and hot, like a tiny volcano.',
    bloomingheart: 'It shoots hearts because it loves its friends.', hotdate: 'Zombies think it\'s cute... until it goes BOOM.',
    peanut: 'Half wall, half shooter, all nut.', sapfling: 'Its sticky sap glues zombie feet to the ground.',
    escaperoot: 'It pops down here and pops up over there!', tileturnip: 'It makes magic tiles that power up plants.',
    thymewarp: 'It can make time go backward. Whoa!', greenshadow: 'It zooms so fast its cape goes flap flap flap.',
    solarflare: 'It shines brighter than a hundred sunflowers.', wallknight: 'Shiny armour, brave heart, never backs down.',
    chompzilla: 'It has the biggest burp in the whole garden.', spudow: 'It shouts KA-SPUD! before every boom.',
    nightcap: 'A mushroom ninja. You never see it coming.', captaincombustible: 'Captain of the hottest ship on the seas.',
    captainmagnet: 'It can pull a bucket off a zombie from across the yard.', grassknuckles: 'It has never lost a boxing match. Ding ding!',
    betacarrotina: 'It flies around on a rocket pack. Whoosh!', frostfury: 'Its icy mask keeps its face nice and cool.',
    starstrike: 'Its shooting stars leave sparkles in the sky.', kaboomcherry: 'Twin heroes who finish each other\'s booms.',
    stormstriker: 'Its cape crackles with lightning when it flies.', hypnotica: 'One swirl of its wand and zombies start to dance.',
    rose: 'Its sparkly wand can turn a zombie into a goat!',
  };
  const ZOMBIE_FACTS = {
    basic: 'It has been looking for its other shoe for years.', flag: 'It thinks it is leading a parade.',
    conehead: 'It found its cone in the road and never gave it back.', buckethead: 'Its bucket still smells like mop water.',
    newspaper: 'It only ever reads the comics page.', screendoor: 'It forgot the rest of the house that goes with its door.',
    football: 'It has never actually caught a football.', polevault: 'It wanted to go to the Olympics, but got lost.',
    disco: 'Its dance moves are older than your grandma.', duckytube: 'It can\'t swim. That\'s what the duck is for.',
    snorkel: 'It has been holding its breath since Tuesday.', balloon: 'It gets very upset when its balloon pops.',
    imp: 'Small, loud, and always wants a piggyback ride.', yeti: 'Some say it isn\'t real. It is!',
    pirate: 'It says ARR even when nobody asks.', mummy: 'It is wrapped in toilet paper. Nobody has told it.',
    ra: 'It wants sunshine, but it always gets a sunburn.', gargantuar: 'Its tiny imp friend rides on its back for free.',
    jackbox: 'It hums the same song over and over and over.', digger: 'It always pops up on the wrong side of the lawn.',
    knight: 'Its armour squeaks with every step.', cowboy: 'It has never ridden a horse. Not once.',
    robot: 'It runs on batteries and brains.', prospector: 'It thinks every shiny pebble is gold.',
    pianist: 'It only knows one song, and it is very long.', chickenwrangler: 'Its chickens always run the wrong way.',
    adventurer: 'It has a map, but it holds it upside down.', excavator: 'It wanted to dig a sandbox and dug a hole instead.',
    parasol: 'It is scared of getting even one raindrop on it.', surfer: 'It waits all day for the perfect wave.',
    fisherman: 'It has never caught a fish. Only plants.', octo: 'Its octopus is the brains of the team.',
    caveman: 'It thinks fire is a brand-new invention.', bully: 'It acts tough, but it cries at sad movies.',
    punk: 'It plays air guitar all day long.', glitter: 'It leaves sparkles that are impossible to clean up.',
    boombox: 'Its music is way too loud. Turn it down!', wizard: 'Its magic tricks never quite work.',
    shieldbot: 'It hides behind its shield when it feels shy.', brickhead: 'Its brick hat gives it a headache.',
    chicken: 'Bawk! It is much faster than it looks.', zomboni: 'It makes the lawn as slippery as an ice rink.',
    bobsled: 'It needs ice to go. On grass it just sits there.', dolphinrider: 'Its dolphin is much nicer than it is.',
    bungee: 'It loves bouncing even more than brains.', ladder: 'It carries a ladder, but it is scared of heights.',
    peashooterzombie: 'It shoots peas at plants. How rude!', wallnutzombie: 'It has a nut for a head. Really!',
    jester: 'It tells jokes, but they are never funny.', peasant: 'It wants to be a knight when it grows up.',
    camel: 'The camel costume has three zombies inside.', explorer: 'Its torch keeps going out. Oops!',
    seagull: 'Its seagull keeps stealing its snacks.', swashbuckler: 'It swings in on a rope and usually misses.',
    poncho: 'Its poncho is very cozy and very itchy.', jetpack: 'It never learned how to land.',
    arcade: 'It still hasn\'t beaten its own high score.', troglobite: 'It pushes ice blocks around for fun. Brrr.',
    dodorider: 'Its dodo can\'t really fly. It just hops.', snowhunter: 'It never misses with a snowball. Well, almost never.',
    weaselhoarder: 'Its weasels keep escaping from the cage.', lostpilot: 'It has been lost for about a hundred years.',
    turquoiseskull: 'Its sparkly hat is its pride and joy.', bugbotimp: 'Its robot bug goes bzzzz all day.',
    mechafootball: 'A robot that still can\'t catch a football.', breakdancer: 'It spins on its head until it gets dizzy.',
    mczomb: 'It drops the mic, then picks it right back up.', eightbit: 'It walks in tiny blocky steps. Beep boop.',
    kingzombie: 'Its crown is two sizes too big.', bullrider: 'It holds on tight. Yee-haw!',
    barrelroller: 'Its barrel is full of imps. Surprise!', tombraiser: 'It builds gravestones like sandcastles.',
    discotron: 'It has a disco ball for a head. Groovy!',
  };

  // ---------- helpers ----------
  function put(cv, src, scale) {
    if (cv.width !== src.width) cv.width = src.width;
    if (cv.height !== src.height) cv.height = src.height;
    const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, cv.width, cv.height); x.drawImage(src, 0, 0);
    if (scale) { cv.style.width = PX.artW(src) * scale + 'px'; cv.style.height = PX.artH(src) * scale + 'px'; }
    cv.classList.add('px');
  }
  function hydrate(root) {
    root.querySelectorAll('canvas[data-sp]').forEach(cv => {
      const [k, id] = cv.dataset.sp.split(':');
      let src = null;
      if (k === 'critter') src = PX.critter(id);
      else if (k === 'egg') src = PX.item('egg', id.replace('~', ':'));
      else if (k === 'icon') src = PS.ui.icon(id);
      else if (k === 'core' || k === 'shard' || k === 'fitem' || k === 'element') src = PX.item(k, id);
      else if (k === 'plant') src = PX.sprig(JSON.parse(decodeURIComponent(id)), {});
      else if (k === 'zombie') src = PX.sprig({ zombie: id }, {});
      if (src) put(cv, src, +cv.dataset.scale || 0);
      delete cv.dataset.sp;
    });
  }
  const elChip = el => { const E = D.ELEMENTS[el] || D.ELEMENTS.normal; return `<span class="sp-chip" style="background:${E.color}">${E.label}</span>`; };
  const areaName = a => (D.AREAS[a] || D.AREAS.frontyard).name;
  const lookAttr = L => encodeURIComponent(JSON.stringify(L));

  // animated sprites: registered per render, redrawn only when their pose changes
  // A list row (opts.row) only animates while it's on screen: a big garden has 200+ plants, and drawing them all every few frames
  // made scrolling the list heavy. An observer on the scroll box says which rows show; the others keep their last picture, and
  // rows nobody has scrolled to yet get their first picture a few per frame in the background (frame()).
  let anims = [], seeIO = null;
  function animSprite(cv, look, scale, opts) {
    opts = opts || {};
    const a = { cv, look, scale, phase: opts.phase || Math.random() * 3, key: '', happyUntil: 0, flap: !!opts.flap, zombie: !!opts.zombie, vis: !(opts.row && seeIO) };
    anims.push(a);
    if (a.vis) drawAnim(a, 0); else { cv._anim = a; seeIO.observe(cv); }
    return a;
  }
  function watchRows(box) {
    if (seeIO) seeIO.disconnect();
    seeIO = box && window.IntersectionObserver ? new IntersectionObserver(list => {
      for (const en of list) { const a = en.target._anim; if (a) { a.vis = en.isIntersecting; if (a.vis) drawAnim(a, clock); } }
    }, { root: box, rootMargin: '80px 0px' }) : null;
  }
  function drawAnim(a, t) {
    const f = Math.floor((t + a.phase) / 0.55) % 2;
    const blink = ((t + a.phase * 1.7) % 3.6) < 0.14;
    const happy = t < a.happyUntil;
    const pose = a.zombie ? (happy ? { mouth: 'open' } : { walk: true, frame: f }) : { frame: f };
    if (a.flap) pose.flap = true;
    if (a.zombie) { /* (zombies just shamble, and groan when tapped) */ }
    else if (happy) { pose.eyes = 'happy'; pose.mouth = 'open'; pose.arms = 'up'; }
    else if (blink) pose.eyes = 'blink';
    const key = JSON.stringify(pose);
    if (key === a.key) return;
    a.key = key;
    put(a.cv, PX.sprig(a.look, pose), a.scale);
  }
  const hasWings = () => false;

  // ---------- list ----------
  let root, view = 'list', curId = null, visible = false, dirty = false, clock = 0, listTab = 'mine';
  // where the list was scrolled when a plant was opened: Back returns there (with 200+ plants, back at the top meant scrolling all the way down again)
  let listTop = 0;
  function mineHTML() {
    const S = PS.S, list = S.sprouts.slice().sort((a, b) => (b.id === S.activeId) - (a.id === S.activeId) || (a.born || 0) - (b.born || 0));
    const rows = list.map(s => {
      const fi = state.formInfo(s), tl = state.totalLevels(s), partner = s.id === S.activeId;
      return `<button class="sp-row ${partner ? 'partner' : ''}" data-open="${s.id}">
        <div class="sp-pic"><canvas data-anim="${s.id}" width="0" height="0"></canvas></div>
        <div><b>${esc(s.name)}${partner ? '<span class="sp-tag">Partner</span>' : ''}</b>
          <small>${esc(fi.name)} \u00b7 ${esc(areaName(s.area))}</small>${s.home ? `<small>Resting in the ${esc(state.homeName(s.area))}</small>` : ''}
          <div class="sp-chips">${state.elementsOf(s).map(elChip).join('')}${fuseBadge(s)}${skinBadge(s)}${shinyBadge(s)}</div></div>
        <div class="sp-lv"><span class="num">${tl}</span><span>Level</span></div>
      </button>`;
    }).join('');
    const eggs = S.eggs.map(e => {
      const E = D.SEEDS[e.kind] || D.SEEDS.normal, left = Math.max(0, (E.taps || 5) - (e.taps || 0)), nm = e.kind === 'normal' ? `${D.PLANTS[e.species].name} seeds` : E.name;
      return `<div class="sp-egg"><div class="sp-pic"><canvas data-sp="egg:${e.kind}~${e.species}" data-scale="2"></canvas></div>
        <div><b>${esc(nm)}</b><small>In the ${esc(areaName(e.area))}${e.source ? ' \u00b7 ' + esc(e.source) : ''}</small><small>${left} ${left === 1 ? 'tap' : 'taps'} to plant</small></div>
        <button class="btn primary" data-hatch="${e.id}">Go plant</button></div>`;
    }).join('');
    return `${S.sprouts.length ? `<div class="sp-list">${rows}</div>` : `<div class="panel sp-empty"><b class="px-title" style="font-size:20px">No plants yet</b><p>${S.eggs.length ? 'Your first seed packet is waiting in the Garden. Tap it to water it until it sprouts.' : 'Pick your first plant to start your garden.'}</p><button class="btn primary" data-go-garden>Go to the Garden</button></div>`}
      ${S.eggs.length ? `<div class="sp-lbl">Seed packets waiting <span class="n">${S.eggs.length}</span></div><div class="sp-list">${eggs}</div>` : ''}`;
  }
  // ---------- the Suburban Almanac: a book with a Plants section and a Zombies section ----------
  // Plants count once you've unlocked them; zombies once you've seen them (PS.S.seenZ, written by PS.state.seeZombie, plus
  // the ones you already beat in a league or met in a won Survival map, so older saves start with the zombies they know).
  // Every PRIZE_EVERY entries pays PRIZE_COINS once; PS.S.almanacPrize (optional) remembers how many prizes were given.
  const PRIZE_EVERY = 10, PRIZE_COINS = 150;
  const plantIds = () => Object.keys(D.PLANTS);
  const zombieIds = () => Object.keys(D.ZOMBIES || {});
  function seenZ() {
    const S = PS.S, out = new Set(), z = S && S.seenZ;
    if (Array.isArray(z)) z.forEach(id => out.add(id));
    else if (z && typeof z === 'object') for (const k in z) if (z[k]) out.add(k);
    const P = (S && S.progress) || {};
    for (const L of D.LEAGUES || []) { const pr = P.leagues && P.leagues[L.id]; if (pr && Array.isArray(pr.beaten)) (L.opponents || []).forEach((o, i) => { if (pr.beaten[i] && o.zombie) out.add(o.zombie); }); }
    for (const M of D.SURVIVAL || []) { const pr = P.survival && P.survival[M.id]; if (pr && pr.wins) (M.pool || []).forEach(id => out.add(id)); }
    return out;
  }
  function counts() {
    const pIds = plantIds(), zIds = zombieIds(), seen = seenZ();
    const plants = pIds.filter(id => state.isUnlocked(id)).length, zombies = zIds.filter(id => seen.has(id)).length;
    const total = Math.max(1, pIds.length + zIds.length), entries = plants + zombies;
    return { plants, plantsAll: pIds.length, zombies, zombiesAll: zIds.length, entries, total, pct: Math.round(entries / total * 100) };
  }
  // where a zombie is met: the leagues it fights in, then the Survival maps it marches on
  function whereMet(id) {
    const out = [];
    for (const L of D.LEAGUES || []) if ((L.opponents || []).some(o => o.zombie === id)) out.push(L.name);
    for (const M of D.SURVIVAL || []) if ((M.pool || []).includes(id)) out.push(M.name);
    return out;
  }
  // 1-5 blocks from a stat lean (1 = normal)
  const blocks = (b, k) => clamp(2 + Math.round(((b || 1) - 1) * k), 1, 5);
  function barHTML(label, color, n) {
    return `<div class="sp-sbar"><span class="nm">${label}</span><span class="bk" aria-label="${n} of 5">${[0, 1, 2, 3, 4].map(i => `<i${i < n ? ` class="on" style="background:${color}"` : ''}></i>`).join('')}</span></div>`;
  }
  function plantBars(P) {
    const b = P.bias || {};
    return D.STATS.slice().reverse().map(k => barHTML(D.STAT_META[k].label, D.STAT_META[k].color, blocks(b[k], 6))).join('');
  }
  function zombieBars(Z) {
    const b = Z.bias || {};
    return barHTML('Tough', '#2b8243', blocks(b.stamina, 4)) + barHTML('Speed', '#df7126', blocks(Math.max(b.run || 1, b.fly || 1, b.swim || 1), 4)) + barHTML('Power', '#d24552', blocks(b.power, 4));
  }

  // prizes: every 10 entries; any already passed are given once, together, in one celebration
  let prizeBusy = false;
  function checkPrize() {
    if (!PS.S || prizeBusy || !visible) return;
    const c = counts(), due = Math.floor(c.entries / PRIZE_EVERY), got = Math.max(0, Math.floor(+PS.S.almanacPrize || 0));
    if (due <= got) return;
    const pages = due - got, coins = pages * PRIZE_COINS;
    PS.S.almanacPrize = due;
    try { state.addCoins(coins, 'almanac'); } catch (e) { PS.S.coins = (PS.S.coins || 0) + coins; }
    PS.save();
    const title = pages === 1 ? 'New Almanac page!' : `${pages} new Almanac pages!`, sub = `${c.entries} things in your Almanac`;
    const zi = (() => { try { return PX.sprig({ zombie: 'basic' }, {}); } catch (e) { return null; } })();
    const o = { kind: 'almanac', title, sub, sprite: null, zombie: null, icon: PS.ui.icon('sprouts'), jingle: 'newpage', button: 'Yay!',
      tiles: [{ icon: PS.ui.icon('garden'), value: c.plants, label: 'Plants' }, { icon: zi, value: c.zombies, label: 'Zombies' }, { icon: PS.ui.icon('coin'), value: '+' + coins.toLocaleString(), label: 'Coins' }] };
    prizeBusy = true;
    const done = () => { prizeBusy = false; if (visible) render(true); };
    try {
      if (typeof PS.ui.celebrate === 'function') { Promise.resolve(PS.ui.celebrate(o)).then(done, done); return; }
    } catch (e) { /* fall back below */ }
    try { if (PX.Music && PX.Music.jingle) PX.Music.jingle('newpage'); else PX.Sound.play('chime'); } catch (e) { /* audio optional */ }
    PS.ui.modal({ eyebrow: 'Almanac', title, html: `<p>${sub}. Here are <b>${coins.toLocaleString()} coins</b>!</p>`, buttons: [{ label: 'Yay!', kind: 'primary' }] });
    done();
  }

  // ---------- the book's list pages ----------
  // tiles draw their picture only when they scroll into view (130 plants and 70+ zombies at once was heavy on an iPad)
  let tileIO = null;
  function drawTile(cv) {
    const L = cv.dataset.lz; if (!L) return; delete cv.dataset.lz;
    try { const src = L.startsWith('z:') ? PX.sprig({ zombie: L.slice(2) }, {}) : PX.sprig(JSON.parse(decodeURIComponent(L)), {}); put(cv, src, 2); } catch (e) { console.error('almanac tile', e); }
  }
  function watchTiles(box) {
    if (tileIO) { tileIO.disconnect(); tileIO = null; }
    const list = box ? box.querySelectorAll('canvas[data-lz]') : [];
    if (!list.length) return;
    if (!window.IntersectionObserver) { list.forEach(drawTile); return; }
    tileIO = new IntersectionObserver(es => { for (const en of es) if (en.isIntersecting) { tileIO.unobserve(en.target); drawTile(en.target); } }, { root: box, rootMargin: '300px 0px' });
    list.forEach(cv => tileIO.observe(cv));
  }
  function plantsHTML() {
    const ids = plantIds(), have = {};
    for (const s of PS.S.sprouts) { const h = have[s.species] || (have[s.species] = { n: 0, stage: 0 }); h.n++; h.stage = Math.max(h.stage, s.stage || 0); }
    const tiles = ids.map((id, i) => {
      const P = D.PLANTS[id], open = state.isUnlocked(id), h = have[id];
      const look = { species: id, stage: h ? h.stage : 0 };
      return `<button class="sp-ctile${open ? '' : ' locked'}${P.legendary ? ' legend' : ''}" data-entry="p:${id}" aria-label="${open ? esc(P.name) : 'A mystery plant'}"><i class="sp-no">${i + 1}</i>${h ? `<span class="cnt">${h.n}</span>` : ''}<canvas data-lz="${lookAttr(look)}" style="width:64px;height:64px"></canvas><b>${open ? esc(P.name) : '???'}</b>${open ? `<small>${elChip(P.el)}</small>` : ''}</button>`;
    }).join('');
    return `<div class="sp-coll">${tiles}</div>`;
  }
  function zombiesHTML() {
    const ids = zombieIds(), seen = seenZ();
    const tiles = ids.map((id, i) => {
      const Z = D.ZOMBIES[id], ok = seen.has(id);
      return `<button class="sp-ctile zt${ok ? '' : ' locked'}" data-entry="z:${id}" aria-label="${ok ? esc(Z.name) : 'A zombie you have not seen yet'}"><i class="sp-no">${i + 1}</i><canvas class="sp-flipx" data-lz="z:${id}" style="width:64px;height:64px"></canvas><b>${ok ? esc(Z.name) : '???'}</b></button>`;
    }).join('');
    return `<div class="sp-coll">${tiles}</div>`;
  }
  function headHTML() {
    const c = counts(), left = PRIZE_EVERY - (c.entries % PRIZE_EVERY), fill = PRIZE_EVERY - left;
    return `<header class="panel sp-head sp-bookh"><canvas data-sp="icon:sprouts" data-scale="0" style="width:44px;height:44px"></canvas>
        <div class="sp-hmain"><h1 class="px-title">Almanac</h1>
          <div class="sp-pg"><span class="sp-pchip"><canvas data-sp="icon:garden" data-scale="0"></canvas>Plants <b class="num">${c.plants}/${c.plantsAll}</b></span><span class="sp-pchip"><canvas data-sp="zombie:basic" data-scale="0" class="sp-flipx"></canvas>Zombies <b class="num">${c.zombies}/${c.zombiesAll}</b></span></div></div>
        <div class="sp-prize" aria-label="${left} more for a prize"><span class="sp-p10">${Array.from({ length: PRIZE_EVERY }, (_, i) => `<i class="${i < fill ? 'on' : ''}"></i>`).join('')}</span><canvas data-sp="icon:coin" data-scale="0"></canvas><small>${left} more!</small></div>
      </header>`;
  }
  function listHTML() {
    const tab = (id, icon, label) => `<button role="tab" data-ltab="${id}" aria-selected="${listTab === id}"><canvas data-sp="${icon}" data-scale="0"${id === 'zombies' ? ' class="sp-flipx"' : ''}></canvas><span>${label}</span></button>`;
    const body = listTab === 'plants' ? plantsHTML() : listTab === 'zombies' ? zombiesHTML() : mineHTML();
    return `<div class="sp-page"><div class="sp-pin">
      ${headHTML()}
      <div class="sp-tabs sp-tabs3" role="tablist">${tab('mine', 'icon:garden', 'My plants')}${tab('plants', 'icon:sprouts', 'Plants')}${tab('zombies', 'zombie:basic', 'Zombies')}</div>
      </div><div class="sbox-frame sb-fill"><div class="sbox sp-box"><div class="sp-wrap">
      ${body}
      <div class="sp-acct"><button class="btn" data-players>Switch player</button><button class="btn" data-backup>Backups</button></div>
      <button class="sp-dev" data-dev>Parent tools</button>
    </div></div></div></div>`;
  }

  // ---------- a page of the book: one plant or one zombie ----------
  let pg = { kind: 'p', id: null, stage: 0 }, turn = 0, pgHero = null, backTo = 'list';
  const moveRow = id => { const M = D.MOVES[id]; if (!M) return ''; const C = (D.ELEMENTS[M.el] || D.ELEMENTS.normal).color; return `<div class="sp-move compact"><i style="background:${C}"></i><b>${esc(M.name)}</b><span class="pw">${M.pow ? `Power ${M.pow}` : ''}</span><small>${esc(M.desc || '')}</small></div>`; };
  function plantPageHTML(id) {
    const P = D.PLANTS[id], open = state.isUnlocked(id), ids = plantIds(), no = ids.indexOf(id) + 1, R = D.ROLES[P.role] || { label: '' };
    const mine = PS.S.sprouts.filter(s => s.species === id), stage = clamp(pg.stage | 0, 0, 2);
    const fact = PLANT_FACTS[id] || P.blurb || '';
    const stages = P.names.map((n, i) => `<button class="sp-stg${i === stage ? ' on' : ''}" data-pgstage="${i}" aria-pressed="${i === stage}"><canvas data-sp="plant:${lookAttr({ species: id, stage: i })}" data-scale="2"></canvas><b>${esc(n)}</b></button>`).join('');
    const roleMoves = [].concat(...((R.moves || []).map(x => x || []))).filter(m => D.MOVES[m] && !P.sig.includes(m));
    const yours = mine.length ? `<div class="sp-minelist">${mine.slice(0, 8).map(s => `<button class="sp-mine" data-open="${s.id}"><canvas data-sp="plant:${lookAttr(state.lookOf(s))}" data-scale="1"></canvas><b>${esc(s.name)}</b></button>`).join('')}</div>` : '';
    return `<section class="panel sp-paper ${turn > 0 ? 'turn-n' : turn < 0 ? 'turn-p' : ''}">
        <div class="sp-stagebox"><span class="sp-where">#${no}${open ? ` · ${esc(R.label)}` : ''}</span><canvas data-pghero class="${open ? '' : 'sp-sil'}" title="${open ? 'Tap me!' : ''}"></canvas></div>
        <h2 class="sp-ptitle px-title">${open ? esc(P.names[stage]) : '???'}</h2>
        <div class="sp-els">${elChip(P.el)}${P.legendary ? '<span class="sp-legend">Legendary</span>' : ''}</div>
        ${open ? `<div class="sp-stgs">${stages}</div>
        <div class="sp-fact"><b>Fun fact</b><p>${esc(fact)}</p></div>
        <div class="sp-bars">${plantBars(P)}</div>` : `<div class="sp-fact locked"><b>Locked</b><p>Get this plant to see its fun fact!</p></div>`}
      </section>
      ${open ? `<section class="panel sp-sec"><h2>Moves</h2><div class="sp-moves">${P.sig.map(moveRow).join('')}</div>
        ${roleMoves.length ? `<p class="sp-note" style="margin:12px 0 6px">It can also learn:</p><div class="sp-mchips">${roleMoves.map(m => `<span class="sp-mchip"><i style="background:${(D.ELEMENTS[D.MOVES[m].el] || D.ELEMENTS.normal).color}"></i>${esc(D.MOVES[m].name)}</span>`).join('')}</div>` : ''}</section>` : ''}
      <section class="panel sp-sec"><h2>${open ? (mine.length ? `You have ${mine.length}` : 'You got it!') : 'How to get it'}</h2>
        <p class="sp-note">${open ? (mine.length ? 'Tap one to see it.' : 'Buy its seeds in the Shop and grow one.') : esc(state.unlockHint(id)) + '.'}</p>
        ${yours}${open ? '<button class="btn primary" data-shop style="width:100%;margin-top:8px">Seeds in the Shop</button>' : ''}</section>`;
  }
  function zombiePageHTML(id) {
    const Z = D.ZOMBIES[id], seen = seenZ().has(id), ids = zombieIds(), no = ids.indexOf(id) + 1, where = whereMet(id);
    const fact = ZOMBIE_FACTS[id] || '';
    const whereHTML = where.length ? `<div class="sp-mchips">${where.slice(0, 4).map(w => `<span class="sp-mchip sp-wchip"><canvas data-sp="icon:battle" data-scale="0"></canvas>${esc(w)}</span>`).join('')}${where.length > 4 ? `<span class="sp-bmore">+${where.length - 4} more</span>` : ''}</div>` : '<p class="sp-note">Keep playing to meet it!</p>';
    return `<section class="panel sp-paper ${turn > 0 ? 'turn-n' : turn < 0 ? 'turn-p' : ''}">
        <div class="sp-stagebox zb"><span class="sp-where">#${no}</span><canvas data-pghero class="sp-flipx${seen ? '' : ' sp-sil'}" title="${seen ? 'Tap me!' : ''}"></canvas></div>
        <h2 class="sp-ptitle px-title">${seen ? esc(Z.name) : '???'}</h2>
        ${seen ? `<div class="sp-els">${(Z.el || []).map(elChip).join('')}</div>
        <p class="sp-blurb">${esc(Z.blurb || '')}</p>
        ${fact ? `<div class="sp-fact"><b>Silly fact</b><p>${esc(fact)}</p></div>` : ''}
        <div class="sp-bars">${zombieBars(Z)}</div>` : `<div class="sp-fact locked"><b>Not seen yet</b><p>Meet this zombie to fill in its page!</p></div>`}
      </section>
      <section class="panel sp-sec"><h2>Where to meet it</h2>${whereHTML}</section>
      ${seen && (Z.moves || []).length ? `<section class="panel sp-sec"><h2>Its moves</h2><div class="sp-moves">${Z.moves.map(moveRow).join('')}</div></section>` : ''}`;
  }
  function pageHTML() {
    const isP = pg.kind === 'p', ids = isP ? plantIds() : zombieIds(), i = ids.indexOf(pg.id);
    return `<div class="sp-page"><div class="sp-pin"><div class="sp-pnav">
        <button class="btn sp-back" data-back>‹ ${isP ? 'Plants' : 'Zombies'}</button>
        <span class="sp-pno num">${i + 1} / ${ids.length}</span>
        <button class="btn sp-arrow" data-pg="-1" aria-label="Previous page">‹</button><button class="btn sp-arrow" data-pg="1" aria-label="Next page">›</button>
      </div></div>
      <div class="sbox-frame sb-fill"><div class="sbox sp-box"><div class="sp-wrap">
      ${isP ? plantPageHTML(pg.id) : zombiePageHTML(pg.id)}
      </div></div></div></div>`;
  }
  function openPage(kind, id, dir) {
    const sc = root.querySelector('.sp-box');
    if (view === 'list' && sc) listTop = sc.scrollTop;
    const have = kind === 'p' ? PS.S.sprouts.filter(s => s.species === id).map(s => s.stage || 0) : [];
    pg = { kind, id, stage: have.length ? Math.max(...have) : 0 }; turn = dir || 0; view = 'page'; render(false); turn = 0;
  }
  function flip(d) {
    const ids = pg.kind === 'p' ? plantIds() : zombieIds(), i = ids.indexOf(pg.id);
    const next = ids[(i + d + ids.length) % ids.length];
    PX.Sound.play('tick');
    openPage(pg.kind, next, d);
  }
  function heroTap() {
    if (!pgHero) return;
    pgHero.happyUntil = clock + 1.1;
    const ok = pg.kind === 'p' ? state.isUnlocked(pg.id) : seenZ().has(pg.id);
    if (!ok) { PX.Sound.play('tick'); return; }
    try { if (PX.Cry && PX.Cry.play) { PX.Cry.play(pg.id, pg.kind === 'z' ? { zombie: true } : { stage: pg.stage }); return; } } catch (e) { /* fall back below */ }
    PX.Sound.play(pg.kind === 'z' ? 'pop' : 'coo');
  }

  // ---------- detail ----------
  function statsHTML(s) {
    const rows = D.STATS.map(k => {
      const st = s.stats[k], M = D.STAT_META[k], max = st.lv >= D.GROWTH.maxLevel, need = D.GROWTH.xpForLevel(st.lv);
      const pct = max ? 100 : clamp(st.xp / need * 100, 0, 100);
      return `<div class="sp-stat"><span class="nm" style="color:${M.color}">${M.label}</span><span class="lv">Lv ${st.lv}</span>
        <div class="bar"><i style="width:${pct}%;background:${M.color}"></i></div>
        <span class="xp">${max ? 'Max level' : `${Math.floor(st.xp)} / ${need} XP to Lv ${st.lv + 1}`}</span></div>`;
    }).join('');
    return `<section class="panel sp-sec"><h2>Stats <span class="sp-aside">Total level ${state.totalLevels(s)}</span></h2>
      <p class="sp-note">Elements, fruit, races and battles give XP. ${esc(D.PLANTS[s.species].name)}s learn ${Object.keys(D.PLANTS[s.species].bias).filter(k => D.PLANTS[s.species].bias[k] > 1).map(k => D.STAT_META[k].label).join(' and ') || 'everything'} faster.</p><div class="sp-stats">${rows}</div></section>`;
  }
  function evoHTML(s) {
    const E = D.EVO, tl = state.totalLevels(s), stage = s.stage || 0, P = D.PLANTS[s.species];
    const cls = i => (i < stage ? 'done' : i === stage ? 'now' : 'next');
    const sub = i => (i < stage ? 'Done' : i === stage ? 'Now' : i === 1 ? `At level ${E.budAt}` : `At level ${E.bloomAt}`);
    const track = [0, 1, 2].map(i => `<div class="st ${cls(i)}"><div class="pic"><canvas data-evo="${i}"></canvas></div><b>${esc(P.names[i])}</b><small>${sub(i)}</small></div>`).join('<div class="arr">\u203a</div>');
    let bar = '';
    if (stage < 2) {
      const goal = stage === 0 ? E.budAt : E.bloomAt, from = stage === 0 ? 0 : E.budAt;
      const pct = clamp((tl - from) / (goal - from) * 100, 0, 100);
      bar = `<div class="sp-evo-bar"><div class="row"><span>Becomes a ${esc(P.names[stage + 1])} at total level <b>${goal}</b></span><b class="num">${tl} / ${goal}</b></div>
        <div class="bar"><i style="width:${pct}%;background:var(--accent)"></i></div></div>
        <p class="sp-muted">Every level in any stat counts. Elements, fruit, races and battles all help.</p>`;
    } else bar = `<p class="sp-muted">Fully evolved into a <b>${esc(P.names[2])}</b>! It can still take new elements and level up.</p>`;
    return `<section class="panel sp-sec"><h2>Evolution <span class="sp-aside">Stage ${stage + 1} of 3</span></h2><div class="sp-evo">${track}</div>${bar}</section>`;
  }
  // the elements it has been given (3 shards make a core; each core of an element unlocks one more of its moves)
  function elementsHTML(s) {
    const e = Object.entries(s.infused || {}).filter(([el]) => D.ELEMENT_INFO[el]);
    if (!e.length) return `<section class="panel sp-sec"><h2>Elements</h2><p class="sp-muted">None yet. Catch element sprites in the Garden: 3 shards of one element make a core. Drag a core onto ${esc(s.name)} to give it that element's colours, type and moves.</p></section>`;
    e.sort((a, b) => (b[0] === s.element) - (a[0] === s.element) || b[1] - a[1]);
    const tiles = e.map(([el, n]) => {
      const E = D.ELEMENT_INFO[el], t = Math.min(3, n);
      return `<div class="sp-bond ${el === s.element ? 'rare' : ''}"><span class="cnt">\u00d7${n}</span><canvas data-sp="core:${el}" data-scale="3"></canvas><b>${esc(E.name)}</b>
        <div class="sp-pips" title="${t} of 3 moves">${[0, 1, 2].map(i => `<i class="${i < t ? 'on' : ''}"></i>`).join('')}</div><small>${el === s.element ? 'Its look now' : t < 3 ? `Next move: 1 more core` : 'All moves'}</small></div>`;
    }).join('');
    const icons = e.slice(0, 8).map(([el, n]) => `<span class="sp-bico" title="${esc(D.ELEMENT_INFO[el].name)}"><canvas data-sp="core:${el}" data-scale="0"></canvas>${n > 1 ? `<i>\u00d7${n}</i>` : ''}</span>`).join('');
    return foldSec('els', 'Elements', `${e.reduce((a, x) => a + x[1], 0)} cores`, `<div class="sp-bicons">${icons}</div>`,
      `<p class="sp-note">Its newest element sets its look and type. Elements it had before keep their moves.</p><div class="sp-bonds">${tiles}</div>`);
  }
  function fusionHTML(s) {
    const F = s.fuse;
    if (!F) return `<section class="panel sp-sec"><h2>Fusion</h2><div class="sp-fuse"><canvas data-sp="fitem:extrashooter" data-scale="3"></canvas><p>Not fused yet. In the Shop's <b>Fusion Lab</b>, fuse ${esc(s.name)} with another plant or a fusion item to make something new. A plant can only be fused once.</p></div>
      <button class="btn primary" data-fuse-go style="width:100%;margin-top:10px">Open the Fusion Lab</button></section>`;
    const what = F.item ? `the <b>${esc(D.FUSION_ITEMS[F.item].name)}</b>` : `a <b>${esc(state.stageName(F.with, F.stage))}</b>${s.fusedFrom ? ` (${esc(s.fusedFrom[1])})` : ''}`;
    const pic = F.item ? `<canvas data-sp="fitem:${F.item}" data-scale="3"></canvas>` : `<canvas data-sp="plant:${lookAttr({ species: F.with, stage: F.stage || 0 })}" data-scale="2"></canvas>`;
    return `<section class="panel sp-sec"><h2>Fusion <span class="sp-aside">Fused</span></h2><div class="sp-fuse">${pic}<p>${esc(s.name)} was fused with ${what}. It learned ${state.fusionMoves(s).map(m => `<b>${esc(D.MOVES[m].name)}</b>`).join(', ')}. Fused plants can't be fused again.</p></div></section>`;
  }
  // ---------- fold-away sections: a short summary until tapped open ----------
  const openSecs = new Set();
  function foldSec(id, title, aside, summary, body) {
    const open = openSecs.has(id);
    return `<section class="panel sp-sec sp-fold ${open ? 'open' : ''}">
      <button class="sp-fold-h" data-fold="${id}" aria-expanded="${open}"><h2>${title}${aside ? ` <span class="sp-aside">${aside}</span>` : ''}</h2><span class="sp-chev" aria-hidden="true">\u25be</span></button>
      ${open ? `<div class="sp-fold-body">${body}</div><button class="sp-fold-less" data-fold="${id}">Show less \u25b4</button>` : `<div class="sp-fold-sum" data-fold="${id}">${summary}<span class="sp-more">Tap to see more \u25be</span></div>`}</section>`;
  }
  function moveHTML(id, o) {
    o = o || {};
    const m = D.MOVES[id]; if (!m) return '';
    const E = D.ELEMENTS[m.el] || D.ELEMENTS.normal;
    const pow = m.pow ? (m.fx.hits ? `${m.pow}\u00d7${m.fx.hits}` : m.pow) : '';
    const pw = o.locked ? `<span class="sp-lock">${o.evolveTo != null ? 'When it evolves' : o.level ? `At level ${o.level}` : `${o.cores} more core${o.cores > 1 ? 's' : ''}`}</span>` : `${pow ? 'Pow ' + pow + ' \u00b7 ' : 'Support \u00b7 '}${Math.round(m.acc * 100)}%`;
    if (o.compact) return `<div class="sp-move compact ${o.inBattle ? 'battle' : ''} ${o.locked ? 'locked' : ''}" title="${esc(m.desc)}"><i style="background:${E.color}"></i><b>${esc(m.name)}${o.inBattle ? '<span class="sp-inb">In battle</span>' : ''}</b><span class="pw">${pw}</span></div>`;
    return `<div class="sp-move ${o.active ? 'active' : ''} ${o.locked ? 'locked' : ''}"><i style="background:${E.color}"></i><b>${esc(m.name)}</b><span class="pw">${pw}</span><small>${E.label} \u00b7 ${esc(m.desc)}</small></div>`;
  }
  function movesHTML(s) {
    const active = state.movesOf(s), known = state.knownMoves(s), fi = state.formInfo(s);
    const groups = [];
    for (const k of known) { let g = groups.find(x => x.from === k.from); if (!g) groups.push(g = { from: k.from, list: [] }); g.list.push(k); }
    const grp = groups.map(g => {
      const el = Object.keys(D.ELEMENT_INFO).find(k => D.ELEMENT_INFO[k].name + ' element' === g.from);
      const title = el ? `<canvas data-sp="core:${el}"></canvas>${esc(g.from)} \u00b7 ${s.infused[el]} core${s.infused[el] > 1 ? 's' : ''}` : esc(g.from);
      return `<div class="sp-grp"><h3>${title}</h3><div class="sp-moves">${g.list.map(k => moveHTML(k.id, { compact: true, locked: k.locked, cores: k.cores, evolveTo: k.evolveTo, inBattle: !k.locked && active.includes(k.id) })).join('')}</div></div>`;
    }).join('');
    const chips = active.map(id => { const m = D.MOVES[id]; if (!m) return ''; const E = D.ELEMENTS[m.el] || D.ELEMENTS.normal; return `<span class="sp-mchip"><i style="background:${E.color}"></i>${esc(m.name)}</span>`; }).join('');
    const body = `<p class="sp-note">${s.moveset ? `You picked the ${active.length} moves it uses in battle.` : `The game picks its battle moves: the ${esc(fi.species)}'s 3 moves plus its newest element or fusion move.`} You can choose any ${state.MAX_MOVES || 4} moves it knows.</p>
      <div class="sp-lbl" style="margin:0 0 6px">Battle moves</div>
      <div class="sp-moves" style="margin-top:0">${active.map(id => moveHTML(id, { active: true })).join('')}</div>
      <button class="btn primary" data-pick-moves style="width:100%;margin-top:10px">Choose battle moves</button>
      <div class="sp-grp"><h3>Types</h3><div style="display:flex;gap:5px;flex-wrap:wrap">${state.elementsOf(s).map(elChip).join('')}</div></div>
      <div class="sp-lbl" style="margin:16px 0 -6px">Every move it knows</div>
      ${grp}`;
    return foldSec('moves', 'Moves', `${known.filter(k => !k.locked).length} known`, `<div class="sp-mchips">${chips}</div>`, body);
  }
  function battleHTML(s) {
    const b = state.battleStats(s);
    const cell = (v, l) => `<div class="sp-bstat"><span class="num">${v}</span><small>${l}</small></div>`;
    const segs = [['run', 'Run'], ['swim', 'Swim'], ['climb', 'Climb'], ['fly', 'Fly']];
    const races = segs.map(([k, l]) => { const r = state.raceRating(s, k); return `<div class="sp-race"><span class="nm">${l}</span><div class="bar"><i style="width:${clamp(r / 15 * 100, 3, 100)}%;background:${D.STAT_META[D.RACE_STAT[k]].color}"></i></div><span class="num">${r.toFixed(1)}</span></div>`; }).join('')
      + (state.staminaRating ? (() => { const r = state.staminaRating(s); return `<div class="sp-race"><span class="nm">Stamina</span><div class="bar"><i style="width:${clamp(r / 15 * 100, 3, 100)}%;background:${D.STAT_META.stamina.color}"></i></div><span class="num">${r.toFixed(1)}</span></div>`; })() : '');
    const bstats = `<div class="sp-bstats">${cell(b.hp, 'HP')}${cell(b.atk, 'Atk')}${cell(b.def, 'Def')}${cell(b.spd, 'Spd')}${cell(Math.round(b.eva * 100) + '%', 'Dodge')}</div>`;
    return foldSec('bstats', 'Battle stats', '', bstats, `${bstats}<p class="sp-muted">Stamina gives HP and Defense, Power gives Attack, Run gives Speed, Fly gives Dodge, Swim adds Defense.</p>`)
      + foldSec('races', 'Race ratings', '', `<p class="sp-fold-line">${segs.map(([k, l]) => `${l} <b>${state.raceRating(s, k).toFixed(1)}</b>`).join(' \u00b7 ')}</p>`, `<p class="sp-note">How fast it moves on each kind of course section. Higher is faster.</p>${races}`);
  }
  function recordsHTML(s) {
    const r = s.record || {}, born = s.born ? new Date(s.born).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    const rec = (v, l) => `<div class="sp-rec"><span class="num">${v}</span><small>${l}</small></div>`;
    return foldSec('records', 'Records', '', `<p class="sp-fold-line">Races won <b>${r.raceWins || 0}</b> \u00b7 Battles won <b>${r.battleWins || 0}</b></p>`, `<div class="sp-recs">
      ${rec(`${r.raceWins || 0} / ${r.races || 0}`, 'Races won')}${rec(`${r.battleWins || 0} / ${r.battles || 0}`, 'Battles won')}
      ${rec(Object.values(s.infused || {}).reduce((a, b) => a + b, 0), 'Element cores')}${rec(Math.max(0, Math.floor((Date.now() - (s.born || Date.now())) / 86400000)), 'Days old')}</div>
      ${born ? `<p class="sp-muted">Sprouted ${born}${s.bornWith && D.ELEMENT_INFO[s.bornWith] ? `, born with ${esc(D.ELEMENT_INFO[s.bornWith].name)}` : ''}.</p>` : ''}`);
  }
  // ---------- badges ----------
  const skinOf = s => { const k = s.look && s.look.skin; return k && D.SKINS[k] ? k : null; };
  const skinBadge = s => { const k = skinOf(s); return k ? `<span class="sp-skin">${esc(D.SKINS[k].name)}</span>` : ''; };
  const shinyBadge = s => (s.look && s.look.shiny === true ? '<span class="sp-shiny" title="A rare Shiny plant">✦ Shiny</span>' : '');
  const fuseBadge = s => (s.fuse ? '<span class="sp-chip" style="background:#8a5ad0">Fused</span>' : '');
  function sellHTML(s) {
    const ok = state.canSell(s);
    return `<div class="sp-sell"><button class="btn sp-sell-btn" data-sell ${ok ? '' : 'disabled'}><canvas data-sp="icon:coin"></canvas>Sell for ${fmt(state.sellPrice(s))} coins</button>
      ${ok ? '' : '<p>You need at least one plant.</p>'}</div>`;
  }
  function cheer() { if (heroAnim) heroAnim.happyUntil = clock + 1.3; }
  // Selling is for good, so it takes two yeses. "Keep" is the big first button both times; the second "sell" button sits where
  // "Keep" was and wakes up after a moment, so a double tap or a mashed button keeps the plant.
  function confirmSell(s) {
    if (!state.canSell(s)) { PX.Sound.play('miss'); PS.ui.toast('You need at least one plant.'); return; }
    const price = state.sellPrice(s), id = s.id, name = s.name;
    PS.ui.modal({
      eyebrow: 'Sell', title: `Sell ${esc(name)}?`, sprite: s, pose: {},
      html: `<p class="sp-sell-price"><canvas data-sp="icon:coin"></canvas><span class="num">${fmt(price)}</span></p>
        <p class="sp-sell-say">${esc(name)} would leave your garden for good.</p>`,
      buttons: [{ label: `Keep ${name}`, kind: 'primary sp-keep' }, { label: `Sell for ${fmt(price)} coins`, kind: 'sp-sell-go', onClick: () => sureSell(id) }],
      mount: card => hydrate(card),
    });
  }
  function sureSell(id) {
    const s = state.get(id); if (!s || !state.canSell(s)) return;
    const price = state.sellPrice(s), name = s.name;
    PS.ui.modal({
      eyebrow: 'Sell for good', title: 'Are you sure?', sprite: s, pose: { eyes: 'sad' },
      html: `<p class="sp-sell-say"><b>${esc(name)}</b> will leave your garden for good.</p>
        <p class="sp-sell-price"><canvas data-sp="icon:coin"></canvas><span class="num">${fmt(price)}</span></p>`,
      buttons: [{ label: `Yes, sell ${name}`, kind: 'danger sp-sell-yes', onClick: () => doSell(id) }, { label: `Keep ${name}`, kind: 'primary sp-keep' }],
      mount: card => {
        hydrate(card);
        const yes = card.querySelector('.sp-sell-yes'); if (!yes) return;
        yes.disabled = true; setTimeout(() => { yes.disabled = false; }, 900);
      },
    });
  }
  function doSell(id) {
    const s = state.get(id); if (!s) return;
    const name = s.name, price = state.sellSprout(id);
    if (!price) { PX.Sound.play('miss'); PS.ui.toast('You need at least one plant.'); return; }
    PX.Sound.play('chime'); PX.buzz(20);
    PS.ui.toast(`${name} found a new home. +${fmt(price)} coins`, 3000);
    const back = curId === id;
    if (back) { curId = null; view = 'list'; }
    if (visible) render(back ? listTop : false); else dirty = true;
  }
  // XP multiplier for a very happy plant (state.happyBonus: 1.1 at happy >= 75); 1 = no bonus
  const happyX = s => { try { const v = typeof state.happyBonus === 'function' ? +state.happyBonus(s) : 1; return v > 0 ? v : 1; } catch (e) { return 1; } };
  function detailHTML(s) {
    const fi = state.formInfo(s), partner = s.id === PS.S.activeId, hb = happyX(s);
    return `<div class="sp-page"><div class="sp-pin"><div class="sp-top"><button class="btn sp-back" data-back>\u2039 Back</button></div></div>
      <div class="sbox-frame sb-fill"><div class="sbox sp-box"><div class="sp-wrap">
      <section class="panel sp-hero">
        <div class="sp-stagebox ${esc(s.area)}"><span class="sp-where">${esc(areaName(s.area))}${s.home ? ` \u00b7 resting in the ${esc(state.homeName(s.area))}` : ''}</span><canvas data-hero title="Pet"></canvas></div>
        <div class="sp-namebox"><input class="sp-name-in" maxlength="12" value="${esc(s.name)}" aria-label="Name" enterkeyhint="done" autocomplete="off" spellcheck="false"></div>
        <div class="sp-form"><b>${esc(fi.name)}</b> \u00b7 Stage ${fi.stage + 1} of 3</div><div class="sp-els">${state.elementsOf(s).map(elChip).join('')}${fuseBadge(s)}${skinBadge(s)}${shinyBadge(s)}</div>
        <div class="sp-mood">
          <small><span>Happiness</span><span>${Math.round(s.happy || 0)}</span></small><div class="bar"><i style="width:${clamp(s.happy || 0, 0, 100)}%;background:var(--berry)"></i></div>
          <p class="sp-happy ${hb > 1 ? 'on' : ''}">${hb > 1 ? `\u2665 Very happy: +${Math.round((hb - 1) * 100)}% XP` : 'Pet it and feed it to make it very happy.'}</p>
        </div>
        <div class="sp-acts">
          <button class="btn ${partner ? '' : 'primary'}" data-partner ${partner ? 'disabled' : ''}>${partner ? '\u2605 Your partner' : 'Set as partner'}</button>
          <button class="btn go" data-visit aria-label="Visit in the ${esc(areaName(s.area))}">Visit</button>
          <button class="btn sp-dress" data-fuse-go ${s.fuse ? 'disabled' : ''}><canvas data-sp="fitem:${s.fuse && s.fuse.item ? s.fuse.item : 'extrashooter'}" data-scale="2"></canvas>${s.fuse ? `${esc(s.name)} is fused` : `Fuse ${esc(s.name)} in the Fusion Lab`}</button>
        </div>
      </section>
      ${statsHTML(s)}${evoHTML(s)}${elementsHTML(s)}${fusionHTML(s)}${movesHTML(s)}${battleHTML(s)}${recordsHTML(s)}
      <button class="btn sp-back" data-back style="justify-self:start">\u2039 Back</button>
      ${sellHTML(s)}
    </div></div></div></div>`;
  }

  // ---------- render ----------
  // keepScroll: true keeps the box where it is, a number scrolls it there, false starts at the top
  function render(keepScroll) {
    dirty = false; anims = [];
    const sc = root.querySelector('.sp-box'), keep = typeof keepScroll === 'number' ? keepScroll : keepScroll && sc ? sc.scrollTop : 0;
    const s = view === 'detail' ? state.get(curId) : null;
    if (view === 'detail' && !s) view = 'list';
    if (view === 'page' && !(pg.kind === 'p' ? D.PLANTS[pg.id] : (D.ZOMBIES || {})[pg.id])) view = 'list';
    root.innerHTML = view === 'detail' ? detailHTML(s) : view === 'page' ? pageHTML() : listHTML();
    hydrate(root); pgHero = null;
    watchTiles(view === 'list' ? root.querySelector('.sp-box') : null);
    if (view === 'page') {
      watchRows(null);
      const hero = root.querySelector('[data-pghero]');
      if (hero) pgHero = animSprite(hero, pg.kind === 'p' ? { species: pg.id, stage: pg.stage } : { zombie: pg.id }, 4, { phase: 0, zombie: pg.kind === 'z' });
    } else if (view === 'list') {
      watchRows(root.querySelector('.sp-box'));
      root.querySelectorAll('canvas[data-anim]').forEach(cv => { const sp = state.get(cv.dataset.anim); if (sp) animSprite(cv, state.lookOf(sp), 2, { row: true }); });
    } else {
      watchRows(null);
      const hero = root.querySelector('[data-hero]');
      heroAnim = animSprite(hero, state.lookOf(s), 5, { phase: 0 });
      // evolution previews: the same plant (element, fusion, skin and all) drawn at each stage
      root.querySelectorAll('canvas[data-evo]').forEach(cv => {
        const i = +cv.dataset.evo, L = Object.assign({}, state.lookOf(s), { stage: i });
        if (i === s.stage) animSprite(cv, L, 2);
        else put(cv, PX.sprig(L, { eyes: i > s.stage ? 'closed' : undefined }), 2);
      });
    }
    const sc2 = root.querySelector('.sp-box'); if (sc2) sc2.scrollTop = keep;
  }
  let heroAnim = null;
  function openDetail(id) { const sc = root.querySelector('.sp-box'); if (view === 'list' && sc) listTop = sc.scrollTop; backTo = view === 'page' ? 'page' : 'list'; curId = id; view = 'detail'; render(false); }

  // ---------- events ----------
  function onClick(e) {
    const q = sel => e.target.closest(sel);
    let b;
    if ((b = q('[data-open]'))) { PX.Sound.play('pop'); openSecs.clear(); openDetail(b.dataset.open); return; }
    if ((b = q('[data-ltab]'))) { if (b.dataset.ltab !== listTab) { listTab = b.dataset.ltab; PX.Sound.play('tick'); render(false); } return; }
    if ((b = q('[data-entry]'))) { PX.Sound.play('pop'); const [k, id] = b.dataset.entry.split(':'); openPage(k, id); return; }
    if ((b = q('[data-pg]'))) { flip(+b.dataset.pg); return; }
    if ((b = q('[data-pgstage]'))) { const i = +b.dataset.pgstage; if (i !== pg.stage) { pg.stage = i; PX.Sound.play('tick'); render(true); } return; }
    if (q('[data-pghero]')) { heroTap(); return; }
    if (q('[data-shop]')) { PX.Sound.play('pop'); PS.ui.go('shop', { tab: 'seeds' }); return; }
    if ((b = q('[data-fold]'))) { const id = b.dataset.fold; if (openSecs.has(id)) openSecs.delete(id); else openSecs.add(id); PX.Sound.play('tick'); render(true); return; }
    if (q('[data-back]')) { PX.Sound.play('tick'); if (view === 'detail' && backTo === 'page') { backTo = 'list'; view = 'page'; render(false); return; } backTo = 'list'; view = 'list'; render(listTop); return; }
    if ((b = q('[data-hatch]'))) {
      const egg = PS.S.eggs.find(x => x.id === b.dataset.hatch);
      PX.Sound.play('pop');
      if (egg && egg.area !== PS.S.area && D.AREAS[egg.area]) { PS.S.area = egg.area; PS.emit('area', { area: egg.area }); PS.save(); }
      PS.ui.go('garden'); return;
    }
    if (q('[data-go-garden]')) { PS.ui.go('garden'); return; }
    if (q('[data-dev]')) { PS.ui.devPanel(); return; }
    if (q('[data-players]')) { PS.ui.playersPanel(); return; }
    if (q('[data-backup]')) { PS.ui.backupPanel(); return; }
    const s = state.get(curId); if (!s || view !== 'detail') return;
    if (q('[data-partner]')) { state.setActive(s.id); PX.Sound.play('chime'); PS.ui.toast(`${s.name} is now your partner.`); render(true); return; }
    if (q('[data-pick-moves]')) { PX.Sound.play('pop'); PS.ui.pickMoves(s, () => render(true)); return; }
    if (q('[data-visit]')) {
      PX.Sound.play('pop');
      if (PS.S.area !== s.area) { PS.S.area = s.area; PS.emit('area', { area: s.area }); PS.save(); }
      PS.ui.go('garden'); return;
    }
    if (q('[data-hero]') && heroAnim) { heroAnim.happyUntil = clock + 1.1; PX.Sound.play('coo'); PX.buzz(8); return; }
    if (q('[data-fuse-go]')) { if (s.fuse) return; PX.Sound.play('pop'); PS.ui.go('shop', { tab: 'fusion', fuse: s.id }); return; }
    if (q('[data-sell]')) { PX.Sound.play('pop'); confirmSell(s); return; }
  }
  function commitName(inp) {
    const s = state.get(curId); if (!s) return;
    const v = inp.value.trim().slice(0, 12);
    if (!v) { inp.value = s.name; return; }
    if (v !== s.name) { state.renameSprout(s, v); PS.ui.toast(`Renamed to ${s.name}`); }
  }
  const markDirty = () => {
    if (!visible) { dirty = true; return; }
    const a = document.activeElement;
    if (a && a.classList && a.classList.contains('sp-name-in')) { dirty = true; return; } // don't yank the field while typing
    render(true);
    if (view === 'list') setTimeout(checkPrize, 300);
  };

  PS.scenes.sprouts = {
    mount(el) {
      injectCSS(); root = el;
      root.addEventListener('click', onClick);
      root.addEventListener('change', e => { if (e.target.classList.contains('sp-name-in')) commitName(e.target); });
      root.addEventListener('keydown', e => { if (e.target.classList.contains('sp-name-in') && e.key === 'Enter') e.target.blur(); });
      root.addEventListener('focusout', e => { if (e.target.classList && e.target.classList.contains('sp-name-in') && dirty) setTimeout(() => { if (visible && dirty) render(true); }, 0); });
      ['sprout:update', 'sprout:evolve', 'sprout:sold', 'items', 'egg:new', 'egg:hatch', 'reset', 'unlock', 'fusion', 'zombie:seen'].forEach(ev => PS.on(ev, markDirty));
    },
    show(params) {
      visible = true;
      if (params && params.id && state.get(params.id)) { curId = params.id; view = 'detail'; backTo = 'list'; listTop = 0; render(false); return; }
      if (params && params.species && D.PLANTS[params.species]) { listTab = 'plants'; view = 'list'; listTop = 0; openPage('p', params.species); return; }
      if (params && params.zombie && (D.ZOMBIES || {})[params.zombie]) { listTab = 'zombies'; view = 'list'; listTop = 0; openPage('z', params.zombie); return; }
      if (params && ['mine', 'plants', 'zombies'].includes(params.tab)) listTab = params.tab;
      view = 'list'; render(false);
      setTimeout(checkPrize, 500);
    },
    hide() { visible = false; },
    frame(dt, t) {
      clock = t; let first = 4;
      for (const a of anims) { if (a.vis) drawAnim(a, t); else if (!a.key && first > 0) { first--; drawAnim(a, t); } }
    },
  };
  // for the title screen's cards and anyone who wants to link a page: PS.almanac.open('z', 'conehead')
  PS.almanac = { counts, seen: () => seenZ(), open: (kind, id) => PS.ui.go('sprouts', kind === 'z' ? { zombie: id } : { species: id }) };
})();
