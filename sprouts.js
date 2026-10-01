// sprouts.js -- PVZ Garden Almanac: your plants and waiting seed packets, every plant there is (locked ones say how to unlock
// them), and a page per plant (stats, evolution path, elements, fusion, moves, battle stats, race ratings, records).
// Scene: PS.scenes.sprouts = { mount, show({id}), hide, frame }. Styles are injected below (prefix .sp-).
(function () {
  'use strict';
  const { D, state } = PS;
  const fmt = n => Math.round(n).toLocaleString();
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  const CSS = `
.sp-scroll{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;touch-action:pan-y;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
.sp-wrap{padding:12px 12px 28px;max-width:460px;margin:0 auto;display:grid;gap:12px}
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
`;
  function injectCSS() { if (document.getElementById('sp-css')) return; const st = document.createElement('style'); st.id = 'sp-css'; st.textContent = CSS; document.head.appendChild(st); }

  // ---------- helpers ----------
  function put(cv, src, scale) {
    if (cv.width !== src.width) cv.width = src.width;
    if (cv.height !== src.height) cv.height = src.height;
    const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, cv.width, cv.height); x.drawImage(src, 0, 0);
    if (scale) { cv.style.width = src.width * scale + 'px'; cv.style.height = src.height * scale + 'px'; }
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
      if (src) put(cv, src, +cv.dataset.scale || 0);
      delete cv.dataset.sp;
    });
  }
  const elChip = el => { const E = D.ELEMENTS[el] || D.ELEMENTS.normal; return `<span class="sp-chip" style="background:${E.color}">${E.label}</span>`; };
  const areaName = a => (D.AREAS[a] || D.AREAS.frontyard).name;
  const lookAttr = L => encodeURIComponent(JSON.stringify(L));

  // animated sprites: registered per render, redrawn only when their pose changes
  let anims = [];
  function animSprite(cv, look, scale, opts) {
    opts = opts || {};
    const a = { cv, look, scale, phase: opts.phase || Math.random() * 3, key: '', happyUntil: 0, flap: !!opts.flap };
    anims.push(a); drawAnim(a, 0); return a;
  }
  function drawAnim(a, t) {
    const f = Math.floor((t + a.phase) / 0.55) % 2;
    const blink = ((t + a.phase * 1.7) % 3.6) < 0.14;
    const happy = t < a.happyUntil;
    const pose = { frame: f };
    if (a.flap) pose.flap = true;
    if (happy) { pose.eyes = 'happy'; pose.mouth = 'open'; pose.arms = 'up'; }
    else if (blink) pose.eyes = 'blink';
    const key = JSON.stringify(pose);
    if (key === a.key) return;
    a.key = key;
    put(a.cv, PX.sprig(a.look, pose), a.scale);
  }
  const hasWings = () => false;

  // ---------- list ----------
  let root, view = 'list', curId = null, visible = false, dirty = false, clock = 0, listTab = 'mine';
  function mineHTML() {
    const S = PS.S, list = S.sprouts.slice().sort((a, b) => (b.id === S.activeId) - (a.id === S.activeId) || (a.born || 0) - (b.born || 0));
    const rows = list.map(s => {
      const fi = state.formInfo(s), tl = state.totalLevels(s), partner = s.id === S.activeId;
      return `<button class="sp-row ${partner ? 'partner' : ''}" data-open="${s.id}">
        <div class="sp-pic"><canvas data-anim="${s.id}"></canvas></div>
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
  // every plant there is: grown ones, unlocked ones, and locked ones with how to unlock them
  function allHTML() {
    const ids = Object.keys(D.PLANTS), open = ids.filter(id => state.isUnlocked(id));
    const tiles = ids.map(id => {
      const P = D.PLANTS[id], have = PS.S.sprouts.filter(s => s.species === id).length;
      if (!state.isUnlocked(id)) return `<button class="sp-ctile locked" data-species="${id}"><canvas data-sp="plant:${lookAttr({ species: id, stage: 0 })}" data-scale="2"></canvas><b>???</b><small>${esc(state.unlockHint(id))}</small></button>`;
      return `<button class="sp-ctile" data-species="${id}">${have ? `<span class="cnt">${have}</span>` : ''}<canvas data-sp="plant:${lookAttr({ species: id, stage: have ? Math.max(...PS.S.sprouts.filter(s => s.species === id).map(s => s.stage)) : 0 })}" data-scale="2"></canvas><b>${esc(P.name)}</b><small>${elChip(P.el)}</small></button>`;
    }).join('');
    return `<p class="sp-prog">${open.length} of ${ids.length} plants unlocked. Win races and battles to unlock more!</p><div class="sp-coll">${tiles}</div>`;
  }
  function listHTML() {
    return `<div class="sp-scroll"><div class="sp-wrap">
      <header class="panel sp-head"><canvas data-sp="icon:sprouts" data-scale="0" style="width:44px;height:44px"></canvas>
        <div><h1 class="px-title">Almanac</h1><div class="sp-sub">Your plants, and every plant to collect</div></div>
        <span class="sp-count">${PS.S.sprouts.length}</span></header>
      <div class="sp-tabs" role="tablist"><button role="tab" data-ltab="mine" aria-selected="${listTab === 'mine'}">My plants</button><button role="tab" data-ltab="all" aria-selected="${listTab === 'all'}">All plants</button></div>
      ${listTab === 'all' ? allHTML() : mineHTML()}
      <div class="sp-acct"><button class="btn" data-players>Switch player</button><button class="btn" data-backup>Backups</button></div>
      <button class="sp-dev" data-dev>Parent tools</button>
    </div></div>`;
  }
  // a species card: its 3 stages, type, role and signature moves (a buy button once it's unlocked)
  function speciesInfo(id) {
    const P = D.PLANTS[id], open = state.isUnlocked(id), R = D.ROLES[P.role];
    if (!open) { PS.ui.modal({ eyebrow: 'Almanac', title: 'A mystery plant', sprite: PX.sprig({ species: id, stage: 0 }, {}), html: `<p>Not unlocked yet.</p><p><b>How to unlock it:</b> ${esc(state.unlockHint(id))}.</p>`, mount: card => { const c = card.querySelector('.m-sprite'); if (c) c.style.filter = 'brightness(0) opacity(.3)'; } }); return; }
    PS.ui.modal({ eyebrow: `Almanac \u00b7 ${esc(R.label)}`, title: esc(P.name), sprite: { species: id, stage: 2 },
      html: `<p>${esc(P.blurb)}</p><div class="chips-list">${elChip(P.el)}</div>
        <div class="sp-sp-evo">${P.names.map((n, i) => `<div><canvas data-sp="plant:${lookAttr({ species: id, stage: i })}" data-scale="2"></canvas>${esc(n)}</div>`).join('')}</div>
        <p><b>Signature moves:</b> ${P.sig.map(m => esc(D.MOVES[m].name)).join(', ')}</p>
        <p class="bk-ver">Evolves at total level ${D.EVO.budAt} and ${D.EVO.bloomAt}. Seeds cost ${fmt(P.price)} coins in the Shop.</p>`,
      buttons: [{ label: 'Buy seeds in the Shop', kind: 'primary', onClick: () => PS.ui.go('shop', { tab: 'seeds' }) }, { label: 'Close' }], mount: card => hydrate(card) });
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
    if (curId === id) { curId = null; view = 'list'; }
    if (visible) render(false); else dirty = true;
  }
  // XP multiplier for a very happy plant (state.happyBonus: 1.1 at happy >= 75); 1 = no bonus
  const happyX = s => { try { const v = typeof state.happyBonus === 'function' ? +state.happyBonus(s) : 1; return v > 0 ? v : 1; } catch (e) { return 1; } };
  function detailHTML(s) {
    const fi = state.formInfo(s), partner = s.id === PS.S.activeId, hb = happyX(s);
    return `<div class="sp-scroll"><div class="sp-wrap">
      <div class="sp-top"><button class="btn sp-back" data-back>\u2039 All plants</button></div>
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
      <button class="btn sp-back" data-back style="justify-self:start">\u2039 All plants</button>
      ${sellHTML(s)}
    </div></div>`;
  }

  // ---------- render ----------
  function render(keepScroll) {
    dirty = false; anims = [];
    const sc = root.querySelector('.sp-scroll'), keep = keepScroll && sc ? sc.scrollTop : 0;
    const s = view === 'detail' ? state.get(curId) : null;
    if (view === 'detail' && !s) view = 'list';
    root.innerHTML = view === 'detail' ? detailHTML(s) : listHTML();
    hydrate(root);
    if (view === 'list') {
      root.querySelectorAll('canvas[data-anim]').forEach(cv => { const sp = state.get(cv.dataset.anim); if (sp) animSprite(cv, state.lookOf(sp), 2); });
    } else {
      const hero = root.querySelector('[data-hero]');
      heroAnim = animSprite(hero, state.lookOf(s), 5, { phase: 0 });
      // evolution previews: the same plant (element, fusion, skin and all) drawn at each stage
      root.querySelectorAll('canvas[data-evo]').forEach(cv => {
        const i = +cv.dataset.evo, L = Object.assign({}, state.lookOf(s), { stage: i });
        if (i === s.stage) animSprite(cv, L, 2);
        else put(cv, PX.sprig(L, { eyes: i > s.stage ? 'closed' : undefined }), 2);
      });
    }
    const sc2 = root.querySelector('.sp-scroll'); if (sc2) sc2.scrollTop = keep;
  }
  let heroAnim = null;
  function openDetail(id) { curId = id; view = 'detail'; render(false); }

  // ---------- events ----------
  function onClick(e) {
    const q = sel => e.target.closest(sel);
    let b;
    if ((b = q('[data-open]'))) { PX.Sound.play('pop'); openSecs.clear(); openDetail(b.dataset.open); return; }
    if ((b = q('[data-ltab]'))) { if (b.dataset.ltab !== listTab) { listTab = b.dataset.ltab; PX.Sound.play('tick'); render(false); } return; }
    if ((b = q('[data-species]'))) { PX.Sound.play('pop'); speciesInfo(b.dataset.species); return; }
    if ((b = q('[data-fold]'))) { const id = b.dataset.fold; if (openSecs.has(id)) openSecs.delete(id); else openSecs.add(id); PX.Sound.play('tick'); render(true); return; }
    if (q('[data-back]')) { PX.Sound.play('tick'); view = 'list'; render(false); return; }
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
  };

  PS.scenes.sprouts = {
    mount(el) {
      injectCSS(); root = el;
      root.addEventListener('click', onClick);
      root.addEventListener('change', e => { if (e.target.classList.contains('sp-name-in')) commitName(e.target); });
      root.addEventListener('keydown', e => { if (e.target.classList.contains('sp-name-in') && e.key === 'Enter') e.target.blur(); });
      root.addEventListener('focusout', e => { if (e.target.classList && e.target.classList.contains('sp-name-in') && dirty) setTimeout(() => { if (visible && dirty) render(true); }, 0); });
      ['sprout:update', 'sprout:evolve', 'sprout:sold', 'items', 'egg:new', 'egg:hatch', 'reset', 'unlock', 'fusion'].forEach(ev => PS.on(ev, markDirty));
    },
    show(params) {
      visible = true;
      if (params && params.id && state.get(params.id)) { curId = params.id; view = 'detail'; render(false); return; }
      view = 'list'; render(false);
    },
    hide() { visible = false; },
    frame(dt, t) { clock = t; for (const a of anims) drawAnim(a, t); },
  };
})();
