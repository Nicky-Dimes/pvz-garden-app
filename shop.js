// shop.js -- PVZ Garden: Crazy Dave's Shop. Seed packets (every plant you've unlocked, plus special packets), the Fusion Lab
// (fuse two plants, or a plant and a fusion item), fusion items, fruit and the gumball machine. Coins come from races, battles and the garden.
// Scene: PS.scenes.shop = { mount, show({tab, section}), hide, frame }. Styles are injected below (prefix .sh-).
(function () {
  'use strict';
  const { D, state } = PS;
  const fmt = n => Math.round(n).toLocaleString();
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cap = s => String(s).charAt(0).toUpperCase() + String(s).slice(1);
  const aOrAn = w => (/^[aeiou]/i.test(String(w)) ? 'an' : 'a');

  const CSS = `
.sh-fx{position:fixed;inset:0;z-index:200;background:radial-gradient(circle at 50% 45%,rgba(90,60,140,.55),rgba(30,20,50,.78));touch-action:none}
.sh-fx canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;image-rendering:crisp-edges}
.sh-fx b{position:absolute;left:0;right:0;bottom:16%;text-align:center;font-family:var(--f-px);font-size:30px;color:#fff6c8;text-shadow:0 3px 0 #3a2d34;opacity:0;transition:opacity .3s}
.sh-scroll{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;touch-action:pan-y;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
.sh-wrap{padding:12px 12px 28px;max-width:460px;margin:0 auto}
.sh-head{padding:10px 12px 12px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px}
.sh-head .sh-logo{width:40px;height:40px}
.sh-head h1{margin:0;font-size:26px;color:var(--ink)}
.sh-head .sh-sub{font-size:14px;color:var(--ink-soft);line-height:1.2;margin-top:2px}
.sh-wallet{display:flex;align-items:center;gap:7px;background:var(--slot);border:2px solid var(--line);border-bottom-width:4px;border-radius:14px;padding:5px 11px 5px 9px;font-size:19px;color:var(--ink)}
.sh-wallet canvas{width:20px;height:20px}
.sh-wallet.bump{animation:bump .35s}
.sh-earn{grid-column:1/-1;display:flex;gap:10px;align-items:flex-start;background:var(--field);border:2px dashed var(--line);border-radius:14px;padding:8px 10px;font-size:14px;line-height:1.4;color:var(--ink-soft)}
.sh-earn b{color:var(--ink);font-weight:600}
.sh-earn canvas{flex:0 0 auto;width:22px;height:22px;margin-top:1px}
.sh-tabs{position:sticky;top:0;z-index:3;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:10px 0 8px;background:var(--ground)}
.sh-tab{display:grid;grid-template-rows:34px auto;justify-items:center;align-items:center;row-gap:2px;border:2px solid var(--line);border-bottom-width:4px;border-radius:16px;background:var(--slot);
  padding:6px 4px 5px;font-family:var(--f-ui);font-weight:600;font-size:15px;color:var(--ink-soft);min-height:62px}
.sh-tab canvas{height:30px;width:auto} /* (app.js snaps it to a crisp size; the 34px row keeps every label on one line) */
.sh-tab[aria-selected="true"]{background:var(--panel);border-color:var(--sun-edge);color:var(--ink);box-shadow:inset 0 -4px 0 var(--sun)}
.sh-tab:focus-visible{outline:3px solid var(--focus);outline-offset:2px}
.sh-intro{font-size:14px;line-height:1.4;color:var(--ink-soft);margin:2px 4px 10px}
.sh-jump{display:inline-flex;align-items:center;gap:4px;margin:4px 0 0;border:2px solid var(--line);border-bottom-width:3px;border-radius:10px;background:var(--panel);padding:2px 10px;
  font-family:var(--f-ui);font-weight:600;font-size:14px;color:var(--ink)}
.sh-jump canvas{display:block;margin:-3px 0}
.sh-list{display:grid;gap:12px}
.sh-sec{font-size:22px;margin:22px 2px 2px;color:#96461c}
.sh-sec-sub{margin:0 2px 10px;font-size:14px;color:var(--ink-soft);font-weight:600}
.sh-list.fruit{grid-template-columns:1fr 1fr;gap:10px}
.sh-card{background:var(--panel);border:2px solid var(--line);border-bottom:5px solid var(--edge);border-radius:20px;padding:12px;display:grid;grid-template-columns:92px 1fr;gap:2px 12px;align-items:start}
.sh-info{min-width:0;align-self:center}
.sh-art{position:relative;display:grid;place-items:center;height:92px;border-radius:16px;background:var(--slot);border:2px solid var(--line)}
.sh-art canvas{display:block;animation:sh-bob 1.2s steps(1) infinite}
.sh-card:nth-child(2n) .sh-art canvas{animation-delay:-.6s}
@keyframes sh-bob{50%{transform:translateY(-3px)}}
@media (prefers-reduced-motion: reduce){.sh-art canvas{animation:none}}
.sh-own{position:absolute;top:-8px;right:-8px;min-width:26px;height:26px;padding:0 6px;display:grid;place-items:center;border-radius:13px;background:var(--sun);border:2px solid var(--sun-edge);
  font-family:var(--f-ui);font-weight:700;font-size:14.5px;color:#4a3210}
.sh-title{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;margin-top:2px}
.sh-title h3{margin:0;font-family:var(--f-px);font-weight:700;font-size:21px;line-height:1.05;color:var(--ink)}
.sh-blurb{margin:4px 0 0;font-size:14px;line-height:1.35;color:var(--ink-soft)}
.sh-bonded{display:inline-block;margin:6px 0 0;border-radius:9px;padding:1px 9px;background:#e4f5d8;border:2px solid #a8d890;font-family:var(--f-ui);font-weight:600;font-size:14px;line-height:1.35;color:#2f6a26}
.sh-facts{grid-column:1/-1;margin:10px 0 0;display:grid;gap:7px}
.sh-fact{display:grid;grid-template-columns:64px 1fr;gap:8px;align-items:start;font-size:14px;line-height:1.35}
.sh-fact dt{font-family:var(--f-ui);font-weight:600;font-size:13.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-soft);padding-top:3px}
.sh-fact dd{margin:0;display:flex;flex-wrap:wrap;gap:4px 5px;align-items:center}
.sh-chip{display:inline-flex;align-items:center;gap:4px;border-radius:8px;padding:1px 7px;font-family:var(--f-ui);font-weight:600;font-size:13.5px;line-height:18px;color:#fff;white-space:nowrap}
.sh-chip.neg{background:#f6dcd6!important;color:#8a2a33}
.sh-chip.soft{background:var(--slot);color:var(--ink);border:1px solid var(--line)}
.sh-chip i{display:inline-block;width:8px;height:8px;border-radius:50%;background:currentColor}
.sh-chip canvas{display:block}
.sh-move{display:inline-flex;align-items:center;gap:5px;background:var(--field);border:2px solid var(--line);border-radius:9px;padding:0 7px;font-size:14px;font-weight:600;line-height:20px}
.sh-move i{width:9px;height:9px;border-radius:3px;display:inline-block}
.sh-move.best{background:#fff1c9;border-color:var(--sun-edge)}
.sh-mnote{flex-basis:100%;font-size:14px;line-height:1.3;color:var(--ink-soft)}
.sh-bond{display:inline-flex;align-items:center;gap:6px;font-weight:600}
.sh-bond canvas{width:26px;height:26px}
.sh-buy{grid-column:1/-1;display:flex;align-items:center;gap:10px;margin-top:12px;padding-top:10px;border-top:2px dashed var(--line)}
.sh-status{flex:1;font-size:14px;line-height:1.3;color:var(--ink-soft)}
.sh-status b{color:var(--ink);font-weight:600}
.sh-status .short{color:#a3402f;font-weight:600}
.sh-price{display:inline-flex;align-items:center;gap:6px;font-size:17px;padding:7px 12px 6px;white-space:nowrap}
.sh-price canvas{width:18px;height:18px}
.sh-price.short{background:var(--slot);border-color:var(--line);color:var(--ink-soft)}
.sh-card.mini{grid-template-columns:1fr;text-align:center;padding:10px 10px 10px;gap:0}
.sh-card.mini .sh-art{height:72px}
.sh-card.mini .sh-title{justify-content:center;margin-top:8px}
.sh-card.mini .sh-title h3{font-size:17px}
.sh-card.mini .sh-blurb{font-size:14px;min-height:2.7em}
.sh-card.mini .sh-gives{display:flex;flex-wrap:wrap;justify-content:center;gap:4px;margin-top:6px}
.sh-card.mini .sh-buy{flex-direction:column;gap:6px;margin-top:10px;padding-top:8px}
.sh-card.mini .sh-price{width:100%;justify-content:center}
.sh-card.mini .sh-status{text-align:center}
.sh-foot{margin:14px 4px 0;font-size:14px;line-height:1.4;color:var(--ink-soft);text-align:center}
.m-body .sh-m-price{display:flex;align-items:center;justify-content:center;gap:6px;font-family:var(--f-px);font-weight:600;font-size:18px;margin:0 0 8px;color:var(--ink)}
.m-body .sh-m-price canvas{width:18px;height:18px}
.m-body p.sh-m-left{text-align:center;font-size:15px;color:var(--ink-soft);margin:-4px 0 10px}
.m-body p.sh-m-odds{text-align:center;font-size:14px;color:var(--ink-soft);margin:0}
.m-body .sh-m-note{background:var(--field);border:2px solid var(--line);border-radius:12px;padding:8px 10px;font-size:15px;line-height:1.4}
.sh-spark{position:absolute;width:10px;height:10px;pointer-events:none;image-rendering:pixelated;animation:sh-spark 1.1s ease-out forwards}
@keyframes sh-spark{0%{transform:translate(0,0) scale(.4);opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(1.2);opacity:0}}
@media (prefers-reduced-motion: reduce){.sh-spark{display:none}}

/* gumball machine */
.sh-tabs.four{grid-template-columns:repeat(4,1fr);gap:5px}
.sh-tabs.four .sh-tab{font-size:14px;padding:6px 2px 5px}
.sh-gb{display:grid;gap:12px}
.sh-gb-stage{position:relative;height:300px;overflow:hidden;border-radius:22px;border:2px solid var(--line);border-bottom:5px solid var(--edge);
  background:radial-gradient(circle at 50% 40%, #fffbe9 0 38%, transparent 39%), linear-gradient(#ffeec4, #fde3a7)}
.sh-gb-stage::before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.6) 18%, transparent 20%);background-size:26px 26px;opacity:.7}
.sh-gb-floor{position:absolute;left:0;right:0;bottom:0;height:34px;background:var(--slot);border-top:3px solid var(--edge)}
.sh-gb-machine{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);display:block}
.sh-gb-stage.shake .sh-gb-machine{animation:sh-gb-shake .16s steps(2) infinite}
@keyframes sh-gb-shake{50%{transform:translateX(calc(-50% + 2px))}}
.sh-gb-ball{position:absolute;padding:0;border:0;background:none;display:block;touch-action:manipulation;z-index:2}
.sh-gb-ball::before{content:"";position:absolute;inset:-16px}
.sh-gb-ball canvas{display:block}
.sh-gb-ball.small{left:calc(50% - 21px);top:213px;--drop:25px;--bx:108px}
.sh-gb-ball.mega{left:calc(50% - 32px);top:202px;--drop:15px;--bx:104px}
.sh-gb-ball.mega .gb{filter:drop-shadow(0 0 7px rgba(255,236,110,.95)) drop-shadow(0 0 2px #ffffff)}
.sh-gb-ball .tw{position:absolute;display:block;animation:sh-gb-tw 1.1s steps(2) infinite;pointer-events:none}
.sh-gb-ball .tw:nth-of-type(2){animation-delay:-.35s}.sh-gb-ball .tw:nth-of-type(3){animation-delay:-.7s}
@keyframes sh-gb-tw{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.2;transform:scale(.5)}}
.sh-gb-ball.opening .tw{display:none}
.sh-gb-ball.rolling{animation:sh-gb-roll .95s cubic-bezier(.3,.6,.4,1) forwards;pointer-events:none}
.sh-gb-ball.ready,.sh-gb-ball.opening{transform:translate(var(--bx),var(--drop))}
.sh-gb-ball.ready .gb{animation:sh-gb-wait .9s ease-in-out infinite}
.sh-gb-ball.opening .gb{animation:sh-gb-pop .32s ease-out forwards}
@keyframes sh-gb-roll{
  0%{transform:translate(0,-6px) scale(.3) rotate(0)}
  14%{transform:translate(0,0) scale(1) rotate(0)}
  30%{transform:translate(6px,var(--drop)) rotate(60deg)}
  62%{transform:translate(calc(var(--bx) * .82),var(--drop)) rotate(400deg)}
  76%{transform:translate(calc(var(--bx) * .94),calc(var(--drop) - 12px)) rotate(560deg)}
  90%{transform:translate(var(--bx),var(--drop)) rotate(680deg)}
  100%{transform:translate(var(--bx),var(--drop)) rotate(720deg)}}
@keyframes sh-gb-wait{0%,100%{transform:translateY(0)}30%{transform:translateY(-8px)}55%{transform:translateY(0) scale(1.08,.92)}70%{transform:translateY(-3px)}}
@keyframes sh-gb-pop{0%{transform:scale(1)}40%{transform:scale(1.35)}100%{transform:scale(1.8);opacity:0}}
.sh-gb-tap{position:absolute;left:50%;bottom:calc(100% + 10px);transform:translateX(-50%);white-space:nowrap;background:var(--ink);color:var(--panel);font-family:var(--f-ui);font-weight:700;font-size:16.5px;
  border-radius:10px;padding:4px 10px;pointer-events:none;animation:sh-gb-hint 1s ease-in-out infinite}
.sh-gb-tap::after{content:"";position:absolute;left:50%;top:100%;margin-left:-6px;border:6px solid transparent;border-top-color:var(--ink)}
@keyframes sh-gb-hint{50%{transform:translate(-50%,-4px)}}
.sh-gb-ball:not(.ready) .sh-gb-tap{display:none}
.sh-gb-say{margin:-2px 4px 0;text-align:center;font-family:var(--f-px);font-weight:600;font-size:17px;line-height:1.25;color:var(--ink);min-height:1.25em}
.sh-gb-buys{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.sh-gb-opt{display:grid;gap:5px;align-content:start}
.sh-gb-buy{display:grid;justify-items:center;align-content:center;gap:5px;width:100%;min-height:128px;padding:10px 6px 8px;font-size:18px}
.sh-gb-buy canvas{display:block}
.sh-gb-buy .sh-gb-pr{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.55);border-radius:10px;padding:2px 10px 1px}
.sh-gb-buy .sh-gb-pr canvas{width:18px;height:18px}
.sh-gb-buy .num{font-size:19px}
.btn.sh-gb-mega{background:linear-gradient(#efe0ff,#c9a2f0);border-color:#7a52b0;color:#3a2160}
.sh-gb-buy[disabled]{background:var(--slot);border-color:var(--line);color:var(--ink-soft);cursor:default}
.sh-gb-buy[disabled]:active{transform:none;border-bottom-width:5px;margin-bottom:0}
.sh-gb-buy[disabled] canvas{opacity:.55}
.sh-gb-why{margin:0;text-align:center;font-size:14px;line-height:1.3;color:var(--ink-soft)}
.sh-gb-why b{color:#a3402f}
@media (prefers-reduced-motion: reduce){.sh-gb-ball.rolling{animation-duration:.01s}.sh-gb-ball.ready .gb,.sh-gb-ball .tw,.sh-gb-tap,.sh-gb-stage.shake .sh-gb-machine{animation:none}}

/* what's inside: real odds, from the D.GUMBALL weights */
.sh-odds{background:var(--field);border:2px dashed var(--line);border-radius:16px;padding:10px 12px 12px}
.sh-odds h3{margin:0;display:flex;align-items:center;gap:8px;font-family:var(--f-px);font-weight:700;font-size:17px;color:var(--ink)}
.sh-odds h3 canvas{display:block;flex:0 0 auto}
.sh-odds-g{margin-top:10px}
.sh-rar{display:inline-block;margin:0 0 5px;border-radius:8px;padding:0 8px;font-family:var(--f-ui);font-weight:700;font-size:14px;line-height:20px;color:#fff}
.sh-rar.often{background:#3f9a3a}.sh-rar.some{background:#3c86c8}.sh-rar.rare{background:#8a58c8}.sh-rar.super{background:linear-gradient(90deg,#c98a10,#d8567e)}
.sh-pzs{display:flex;flex-wrap:wrap;gap:6px}
.sh-pz{display:inline-grid;grid-template-columns:auto auto;align-items:center;column-gap:6px;background:var(--panel);border:2px solid var(--line);border-radius:12px;padding:3px 10px 3px 5px;text-align:left}
.sh-pz canvas{grid-row:1/3;display:block;height:24px;width:auto}
.sh-pz b{font-weight:600;font-size:14px;line-height:1.15;color:var(--ink)}
.sh-pz small{font-size:13px;line-height:1.15;color:var(--ink-soft);font-variant-numeric:tabular-nums}
.sh-odds-note{margin:0 4px;font-size:14px;line-height:1.4;color:var(--ink-soft);text-align:center}

/* seed packets: a grid of every plant (locked ones show how to unlock them) */
.sh-seeds{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:10px}
.sh-seed{position:relative;display:grid;justify-items:center;gap:3px;background:var(--panel);border:2px solid var(--line);border-bottom:5px solid var(--edge);border-radius:18px;padding:10px 8px 9px;text-align:center;color:var(--ink)}
.sh-seed>canvas{display:block}
.sh-seed h3{margin:2px 0 0;font-family:var(--f-px);font-weight:400;font-size:17px;line-height:1.05}
.sh-seed .sh-evo{font-size:12.5px;line-height:1.25;color:var(--ink-soft);font-weight:600}
.sh-seed .sh-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:3px}
.sh-seed .sh-price{margin-top:4px;width:100%;justify-content:center;font-size:16px;padding:6px 8px 5px}
.sh-seed.locked{background:var(--slot);border-style:dashed;border-bottom-style:solid}
.sh-seed.locked>canvas{filter:brightness(0) opacity(.28)}
.sh-seed .sh-lock{font-size:12.5px;line-height:1.3;color:var(--ink-soft);font-weight:600;margin-top:4px}
.sh-seed .sh-lock b{display:block;color:var(--ink);font-size:13px}
.sh-seed .sh-own{top:-8px;right:-6px}
.sh-new{position:absolute;top:-9px;left:-6px;background:var(--berry);color:#fff;border-radius:9px;padding:0 7px;font:700 12.5px/20px var(--f-ui)}
/* the Fusion Lab */
.sh-lab{background:linear-gradient(#f4ecff,#e6dafa);border:2px solid #b8a0e0;border-bottom:5px solid #7a5ab0;border-radius:22px;padding:12px}
.sh-lab h2{margin:0 0 2px;font-family:var(--f-px);font-weight:400;font-size:24px;color:#4a2f7a;text-align:center}
.sh-lab-sub{margin:0 0 10px;text-align:center;font-size:13.5px;color:#5a4a7a;line-height:1.35}
.sh-lab-row{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;align-items:center;gap:4px}
.sh-slot{display:grid;justify-items:center;align-content:center;gap:2px;min-height:118px;background:#fffdf8;border:2px dashed #a890d0;border-radius:16px;padding:6px 4px;color:var(--ink);font:600 13px var(--f-ui);text-align:center}
.sh-slot.full{border-style:solid;border-color:#7a5ab0}
.sh-slot canvas{display:block}
.sh-slot b{font-size:13.5px;line-height:1.15}
.sh-slot small{font-size:12px;color:var(--ink-soft)}
.sh-slot .sh-plus{font:400 34px var(--f-px);color:#a890d0;line-height:1}
.sh-op{font:400 26px var(--f-px);color:#7a5ab0}
.sh-result{background:#fff8dc;border-color:#d8b048}
.sh-lab-go{margin-top:12px;width:100%}
.sh-lab-why{margin:8px 2px 0;text-align:center;font-size:13.5px;color:#7a2a3a;font-weight:600}
.sh-lab-info{margin-top:10px;display:grid;gap:6px;font-size:13.5px;line-height:1.35}
.sh-lab-info .sh-chips{display:flex;flex-wrap:wrap;gap:4px}
.sh-pickbox{display:grid;gap:8px;margin-top:8px}
.sh-fi{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;text-align:left;background:var(--field);border:2px solid var(--line);border-bottom-width:4px;border-radius:14px;padding:6px 10px;color:var(--ink);width:100%}
.sh-fi canvas{width:48px;height:48px}
.sh-fi b{display:block;font-size:16px}.sh-fi small{display:block;font-size:13px;color:var(--ink-soft);line-height:1.3}
.sh-fi[disabled]{opacity:.45}
`;
  function injectCSS() { if (document.getElementById('sh-css')) return; const st = document.createElement('style'); st.id = 'sh-css'; st.textContent = CSS; document.head.appendChild(st); }

  // ---------- helpers ----------
  // copy a sprite into a canvas at an integer scale, sized from the sprite itself
  function put(cv, src, scale) {
    cv.width = src.width; cv.height = src.height;
    const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, cv.width, cv.height); x.drawImage(src, 0, 0);
    if (scale) { cv.style.width = PX.artW(src) * scale + 'px'; cv.style.height = PX.artH(src) * scale + 'px'; }
    cv.classList.add('px');
  }
  // pad a sprite to a square so the modal's square sprite box doesn't stretch it
  function square(src) {
    const n = Math.max(src.width, src.height), c = document.createElement('canvas'); c.width = n; c.height = n;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, Math.floor((n - src.width) / 2), n - src.height); return PX.keepK(src, c);
  }
  // <canvas data-sh="coin"> and friends are painted after innerHTML
  function hydrate(root) {
    root.querySelectorAll('canvas[data-sh]').forEach(cv => {
      const [k, id] = cv.dataset.sh.split(':');
      let src = null;
      try {
        if (k === 'coin') src = PS.ui.icon('coin');
        else if (k === 'critter') src = PX.critter(id);
        else if (k === 'egg') src = PX.item('egg', id.replace('~', ':'));
        else if (k === 'plant') src = PX.sprig(JSON.parse(decodeURIComponent(id)), { eyes: 'happy', mouth: 'open' });
        else if (k === 'fitem') src = PX.item('fitem', id);
        else if (k === 'core') src = PX.item('core', id);
        else if (k === 'shard') src = PX.item('shard', id);
        else if (k === 'element') src = PX.item('element', id);
        else if (k === 'fruit') src = PX.item('fruit', id);
        else if (k === 'icon') src = PS.ui.icon(id);
        else if (k === 'bigcoin') src = PX.item('bigcoin');
        else if (k === 'fx') src = PX.fx('bigspark', '#' + id);
        else if (ART.kinds.includes(k)) src = ART.item(k, id);
      } catch (e) { console.error('shop art', k, id, e); }
      if (!src) return;
      put(cv, src, +cv.dataset.scale || 0);
      delete cv.dataset.sh;
    });
  }
  const coin = () => '<canvas data-sh="coin"></canvas>';
  const firstOf = (tbl, pref) => (tbl && tbl[pref] ? pref : Object.keys(tbl || {})[0] || pref);
  const lookAttr = L => encodeURIComponent(JSON.stringify(L));

  // ---------- gumball art ----------
  // Uses pixel.js's sprites when there: PX.gumballMachine(frame), PX.gumballColors, PX.item('gumball', i). Stand-ins keep it drawable.
  const ART = (() => {
    const GB = ['#e5535f', '#f6a83a', '#fbf236', '#6abe30', '#5fcde4', '#639bff', '#9a6ad0', '#f7b6c8'];
    const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
    const mix = (a, b, k) => '#' + rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * k).toString(16).padStart(2, '0')).join('');
    const ramp3 = c => [mix(c, '#ffffff', 0.45), c, mix(c, '#222034', 0.35)];
    const colors = () => (Array.isArray(PX.gumballColors) && PX.gumballColors.length ? PX.gumballColors : GB);
    const G = (w, h) => new PX.Grid(w, h);
    const layer = (g, draw) => { const t = G(g.w, g.h); draw(t); t.outline(); g.merge(t); };
    const cache = {};
    function item(kind, id) {
      const key = kind + ':' + id; if (cache[key]) return cache[key];
      let c = null;
      try { c = PX.item('gumball', id); } catch (e) { c = null; }
      if (!c || PX.artW(c) === 9) { const g = G(7, 7); g.ell(3.5, 3.5, 2.6, 2.6, ramp3(colors()[(+id || 0) % colors().length])); g.outline(); g.set(2, 2, '#ffffff'); c = g.canvas(); }
      return (cache[key] = c);
    }
    function standMachine(frame) {
      const RED = ['#f07a84', '#d24552', '#8a2433'], MET = ['#ffffff', '#dfe8fb', '#9badb7'], g = G(40, 60);
      layer(g, t => t.rect(8, 55, 7, 3, RED[2]).rect(25, 55, 7, 3, RED[2]));
      layer(g, t => { t.poly([[9, 35], [31, 35], [33, 56], [7, 56]], RED[1]); t.ell(20, 44, 16, 14, RED, 0, (x, y) => t.filled(x, y)); });
      layer(g, t => t.ell(20, 19, 15, 14.5, '#eaf7ff'));
      const balls = [[13, 28], [18, 29], [23, 29], [28, 27], [11, 24], [16, 25], [21, 25], [26, 24], [30, 22], [14, 20], [19, 21], [24, 20], [10, 19], [28, 18], [17, 16], [22, 16]];
      const glass = (x, y) => g.get(x, y) === '#eaf7ff';
      balls.forEach(([x, y], i) => { const R = ramp3(colors()[(i * 3) % colors().length]); g.ell(x, y, 2.4, 2.4, R, 0, glass); g.set(x - 1, y - 1, R[0]); });
      layer(g, t => t.rect(15, 2, 10, 4, RED[1]).rect(15, 2, 3, 4, RED[0]).rect(22, 2, 3, 4, RED[2]));
      layer(g, t => t.ell(20, 42, 5, 5, MET));
      if (frame === 3) layer(g, t => t.rect(15, 47, 10, 6, '#45283c').rect(14, 53, 12, 2, MET[2]));
      else layer(g, t => t.rect(15, 47, 10, 6, MET[1]).rect(15, 47, 10, 1, MET[0]));
      return g.canvas();
    }
    const mcache = {};
    function machine(frame) {
      frame = frame | 0;
      if (typeof PX.gumballMachine === 'function') { try { const c = PX.gumballMachine(frame); if (c && c.width) return c; } catch (e) { /* fall back */ } }
      return mcache[frame] || (mcache[frame] = standMachine(frame));
    }
    let tab = null;
    function tabIcon() {
      if (tab) return tab;
      const g = G(16, 20), RED = ['#f07a84', '#d24552', '#8a2433'];
      layer(g, t => t.poly([[3, 12], [13, 12], [14, 19], [2, 19]], RED[1]));
      layer(g, t => t.ell(8, 7, 6.2, 6, '#eaf7ff'));
      [[5, 9], [8, 10], [11, 9], [6, 6], [10, 6], [8, 4]].forEach(([x, y], i) => g.ell(x, y, 1.3, 1.3, colors()[(i * 3) % colors().length], 0, (a, b) => g.get(a, b) === '#eaf7ff'));
      g.set(5, 3, '#ffffff');
      layer(g, t => t.rect(6, 15, 4, 2, '#45283c'));
      return (tab = g.canvas());
    }
    return { kinds: ['gumball'], item, machine, tabIcon, colors };
  })();
  const statChip = (st, v) => { const M = D.STAT_META[st]; if (!M) return ''; return `<span class="sh-chip ${v < 0 ? 'neg' : ''}" style="background:${M.color}">${v > 0 ? '+' : '−'}${Math.abs(v)} ${M.label}</span>`; };
  const elChip = el => { const E = D.ELEMENTS[el] || D.ELEMENTS.normal; return `<span class="sh-chip" style="background:${E.color}">${E.label}</span>`; };
  const moveChip = (id, best) => { const m = D.MOVES[id]; if (!m) return ''; const E = D.ELEMENTS[m.el] || D.ELEMENTS.normal; return `<span class="sh-move ${best ? 'best' : ''}" title="${esc(m.desc || '')}"><i style="background:${E.color}"></i>${best ? '★ ' : ''}${esc(m.name)}</span>`; };
  const seedsWaiting = (kind, sp) => PS.S.eggs.filter(e => e.kind === kind && (!sp || e.species === sp)).length;
  const owned = id => (state.items()[id] || 0);

  // ---------- coin display ----------
  // While a gumball spins, the shop's coin numbers (and the HUD, through PS.ui.freezeCoins) hold the total from just after paying,
  // so a coin prize isn't given away before the ball opens. It is let go when the prize shows, or on any way out (tab, screen, 60 s).
  let heldCoins = null, hudHeld = false, holdT = 0;
  const coinsNow = () => (heldCoins == null ? PS.S.coins : heldCoins);
  function hud(on) {
    if (on === hudHeld) return; hudHeld = on;
    try { if (PS.ui && typeof PS.ui.freezeCoins === 'function') PS.ui.freezeCoins(on); } catch (e) { console.error(e); }
  }
  function holdCoins(v) { heldCoins = Math.max(0, v); clearTimeout(holdT); holdT = setTimeout(() => releaseCoins(false), 60000); }
  function releaseCoins(bump) {
    clearTimeout(holdT); holdT = 0;
    const was = heldCoins != null; heldCoins = null; hud(false);
    if (was) { if (bump) wantBump = true; later(1); }
  }
  // updates are collected and done once, right after the tap that caused them: "Buy 5" is one refresh, not eleven page redraws
  let queued = false, need = 0, wantBump = false; // need: 1 = coin totals and buy buttons, 2 = lists and counts
  function later(bits) {
    need |= bits;
    if (!visible || !root) { dirty = true; return; }
    if (heldCoins != null || queued) return; // a spinning gumball waits for the reveal (releaseCoins asks again)
    queued = true; Promise.resolve().then(flush);
  }
  function flush() {
    queued = false;
    if (!visible || !root) { if (need) dirty = true; need = 0; return; }
    if (heldCoins != null) return;
    const n = need; need = 0;
    if ((n & 2) && tab !== 'gumball') { const bump = wantBump; render(); if (bump) bumpWallet(); return; }
    refreshCoins();
  }
  function bumpWallet() { const w = root && root.querySelector('.sh-wallet'); if (!w) return; w.classList.remove('bump'); void w.offsetWidth; w.classList.add('bump'); }
  // coin totals, buy-button states and "coins short" notes, in place
  function refreshCoins() {
    if (!root) return;
    const coins = coinsNow(), w = root.querySelector('.sh-wallet');
    if (w) w.querySelector('.num').textContent = fmt(coins);
    root.querySelectorAll('[data-buy]').forEach(b => {
      const [k, id] = b.dataset.buy.split(':'), short = priceOf(k, id) > coins;
      b.classList.toggle('short', short);
      if (b.classList.contains('sh-price')) b.classList.toggle('primary', !short);
    });
    root.querySelectorAll('[data-st]').forEach(el => { const [k, id] = el.dataset.st.split(':'); el.innerHTML = statusHTML(k, id); });
    if (tab === 'gumball') {
      const buys = root.querySelector('.sh-gb-buys'); if (buys) { buys.innerHTML = gbBuysHTML(); hydrate(buys); }
      const say = root.querySelector('.sh-gb-say'); if (say) say.textContent = gbSay();
    }
    if (wantBump) { wantBump = false; bumpWallet(); }
  }

  // ---------- catalogue ----------
  function priceOf(kind, id) {
    if (kind === 'seed') return +(D.PLANTS[id] || {}).price || 0;
    if (kind === 'special') return +(D.SEEDS[id] || {}).price || 0;
    if (kind === 'fitem') return +(D.FUSION_ITEMS[id] || {}).price || 0;
    if (kind === 'fruit') return +(D.FRUITS[id] || {}).price || 0;
    return 0;
  }
  function itemInfo(kind, id) {
    try {
      if (kind === 'seed' && D.PLANTS[id]) return { name: `${D.PLANTS[id].name} seeds`, price: priceOf(kind, id), src: PX.item('egg', 'normal:' + id) };
      if (kind === 'special' && D.SEEDS[id] && D.SEEDS[id].price > 0) return { name: D.SEEDS[id].name, price: priceOf(kind, id), src: PX.item('egg', id) };
      if (kind === 'fitem' && D.FUSION_ITEMS[id]) return { name: D.FUSION_ITEMS[id].name, price: priceOf(kind, id), src: PX.item('fitem', id) };
      if (kind === 'fruit' && D.FRUITS[id]) return { name: D.FRUITS[id].name, price: priceOf(kind, id), src: PX.item('fruit', id) };
    } catch (e) { console.error(e); }
    return null;
  }
  // the note beside a buy button; recomputed in place when coins change
  function statusHTML(kind, id) {
    const short = priceOf(kind, id) - coinsNow();
    if (kind === 'fruit') { const n = PS.S.fruits[id] || 0; return short > 0 ? `<span class="short">${fmt(short)} short</span>` : n ? `You have <b>${n}</b>` : 'None yet'; }
    const notes = [];
    if (kind === 'special') { const n = seedsWaiting(id); if (n) notes.push(`<b>${n}</b> waiting in the Garden`); }
    if (kind === 'fitem') { const n = owned(id); if (n) notes.push(`You have <b>${n}</b>`); }
    if (short > 0) notes.unshift(`<span class="short">${fmt(short)} coins short</span>`);
    return notes.length ? notes.join('<br>') : 'You can afford this';
  }
  function buyRow(kind, id) {
    const price = priceOf(kind, id), short = price > coinsNow();
    return `<div class="sh-buy"><div class="sh-status" data-st="${kind}:${id}">${statusHTML(kind, id)}</div>
      <button class="btn ${short ? 'short' : 'primary'} sh-price" data-buy="${kind}:${id}" aria-label="Buy for ${fmt(price)} coins">${coin()}<span class="num">${fmt(price)}</span></button></div>`;
  }
  // one plant in the seed grid: unlocked ones can be bought, locked ones say how to unlock them
  function seedCard(id) {
    const P = D.PLANTS[id], open = state.isUnlocked(id), price = P.price, short = price > coinsNow(), waiting = seedsWaiting('normal', id);
    const isNew = open && !PS.S.seen['shopseed:' + id];
    const growing = PS.S.sprouts.filter(s => s.species === id).length;
    if (!open) return `<article class="sh-seed locked"><canvas data-sh="plant:${lookAttr({ species: id, stage: 0 })}" data-scale="2"></canvas><h3>???</h3>
      <div class="sh-lock"><b>Locked</b>${esc(state.unlockHint(id))}</div></article>`;
    return `<article class="sh-seed">${isNew ? '<span class="sh-new">New!</span>' : ''}${waiting ? `<span class="sh-own" title="Seed packets waiting in the Garden">${waiting}</span>` : ''}
      <canvas data-sh="egg:normal~${id}" data-scale="2"></canvas><h3>${esc(P.name)}</h3>
      <div class="sh-chips">${elChip(P.el)}<span class="sh-chip soft">${esc(D.ROLES[P.role].label)}</span></div>
      <div class="sh-evo">→ ${esc(P.names[1])} → ${esc(P.names[2])}${growing ? `<br>You have ${growing}` : ''}</div>
      <button class="btn ${short ? 'short' : 'primary'} sh-price" data-buy="seed:${id}" aria-label="Buy ${esc(P.name)} seeds for ${fmt(price)} coins">${coin()}<span class="num">${fmt(price)}</span></button></article>`;
  }
  function specialCard(id) {
    const e = D.SEEDS[id], n = seedsWaiting(id);
    const hw = e.hatchWith === 'random' ? 'A random element' : e.hatchWith && D.ELEMENT_INFO[e.hatchWith] ? `${D.ELEMENT_INFO[e.hatchWith].name} element` : null;
    return `<article class="sh-card">
      <div class="sh-art"><canvas data-sh="egg:${id}" data-scale="3"></canvas>${n ? `<span class="sh-own" title="Waiting in the Garden">${n}</span>` : ''}</div>
      <div class="sh-info"><div class="sh-title"><h3>${esc(e.name)}</h3>${e.spooky ? '<span class="sh-chip" style="background:#df7126">Spooky</span>' : ''}</div>
      <p class="sh-blurb">${esc(e.desc || '')}</p></div>
      <dl class="sh-facts">
        <div class="sh-fact"><dt>Plant</dt><dd>A random plant you've unlocked</dd></div>
        ${e.bonus ? `<div class="sh-fact"><dt>Bonus</dt><dd><span class="sh-chip soft">+${e.bonus} XP in every stat</span></dd></div>` : ''}
        ${hw ? `<div class="sh-fact"><dt>Born with</dt><dd><span class="sh-chip soft">${esc(hw)}</span></dd></div>` : ''}
        <div class="sh-fact"><dt>Plant it</dt><dd>Tap it ${e.taps || 5} times in the Garden</dd></div>
      </dl>
      ${buyRow('special', id)}
    </article>`;
  }
  function fitemCard(id) {
    const I = D.FUSION_ITEMS[id], n = owned(id), mv = D.MOVES[I.move];
    return `<article class="sh-card">
      <div class="sh-art"><canvas data-sh="fitem:${id}" data-scale="4"></canvas>${n ? `<span class="sh-own" title="You have ${n}">${n}</span>` : ''}</div>
      <div class="sh-info"><div class="sh-title"><h3>${esc(I.name)}</h3>${elChip(I.el)}</div>
      <p class="sh-blurb">${esc(I.blurb)} Makes a <b>${esc(I.form.replace('{stage}', 'Peashooter').replace('{pre}', 'Pea'))}</b>.</p></div>
      <dl class="sh-facts">
        <div class="sh-fact"><dt>Boosts</dt><dd>${Object.entries(I.stats).map(([k, v]) => `<span class="sh-chip soft">+${v} ${D.STAT_META[k].label} levels</span>`).join('')}</dd></div>
        ${mv ? `<div class="sh-fact"><dt>Move</dt><dd>${moveChip(I.move)}<span class="sh-mnote">${esc(mv.desc)}</span></dd></div>` : ''}
      </dl>
      ${buyRow('fitem', id)}
    </article>`;
  }
  function fruitCard(id) {
    const f = D.FRUITS[id], n = PS.S.fruits[id] || 0;
    const gives = Object.entries(f.gives || {}).map(([k, v]) => statChip(k, v));
    if (Object.keys(f.gives || {}).length === 5) gives.splice(0, gives.length, `<span class="sh-chip soft">+${f.gives.run} XP to all 5 stats</span>`);
    if (f.happy) gives.push(`<span class="sh-chip soft">+${f.happy} happy</span>`);
    const short = priceOf('fruit', id) > coinsNow();
    return `<article class="sh-card mini">
      <div class="sh-art"><canvas data-sh="fruit:${id}" data-scale="4"></canvas>${n ? `<span class="sh-own" title="You have ${n}">${n}</span>` : ''}</div>
      <div class="sh-title"><h3>${esc(f.name)}</h3></div>
      <p class="sh-blurb">${esc(f.desc || '')}</p>
      <div class="sh-gives">${gives.join('')}</div>
      <div class="sh-buy">
        <button class="btn ${short ? 'short' : 'primary'} sh-price" data-buy="fruit:${id}" aria-label="Buy for ${fmt(f.price)} coins">${coin()}<span class="num">${fmt(f.price)}</span></button>
        <div class="sh-status" data-st="fruit:${id}">${statusHTML('fruit', id)}</div>
      </div>
    </article>`;
  }

  // ---------- Fusion Lab ----------
  // lab.a = a plant id, lab.b = a plant id or lab.item = a fusion item id. A fused plant can't be fused again (two-mix max).
  const lab = { a: null, b: null, item: null };
  function labState() {
    const A = lab.a && state.get(lab.a), B = lab.b && state.get(lab.b);
    if (A && A.fuse) lab.a = null; if (B && (B.fuse || B === A)) lab.b = null; if (lab.item && !owned(lab.item)) lab.item = null;
    return { A: lab.a && state.get(lab.a), B: lab.b && state.get(lab.b), I: lab.item };
  }
  function labWhy(A, B, I) {
    if (!A) return 'Pick a plant to fuse.';
    if (!B && !I) return 'Now pick a second plant or a fusion item.';
    const cost = I ? D.FUSION.costItem : D.FUSION.costPlants;
    if (PS.S.coins < cost) return `You need ${fmt(cost - PS.S.coins)} more coins.`;
    return '';
  }
  function plantSlot(s, which, label) {
    if (!s) return `<button class="sh-slot" data-lab="${which}" type="button"><span class="sh-plus">+</span><b>${label}</b><small>Tap to choose</small></button>`;
    return `<button class="sh-slot full" data-lab="${which}" type="button"><canvas data-sh="plant:${lookAttr(state.lookOf(s))}" data-scale="2"></canvas><b>${esc(s.name)}</b><small>${esc(state.formInfo(s).name)}</small></button>`;
  }
  function labHTML() {
    const { A, B, I } = labState(), cost = I ? D.FUSION.costItem : D.FUSION.costPlants;
    const second = I ? `<button class="sh-slot full" data-lab="b" type="button"><canvas data-sh="fitem:${I}" data-scale="3"></canvas><b>${esc(D.FUSION_ITEMS[I].name)}</b><small>Fusion item</small></button>` : plantSlot(B, 'b', 'Plant or item');
    const pv = A && (B || I) ? state.fusePreview(A, B, I) : null, why = labWhy(A, B, I);
    const result = pv ? `<div class="sh-slot sh-result"><canvas data-sh="plant:${lookAttr(pv.look)}" data-scale="2"></canvas><b>${esc(pv.name)}</b><small>New!</small></div>`
      : `<div class="sh-slot"><span class="sh-plus">?</span><small>Your fusion</small></div>`;
    const info = pv ? `<div class="sh-lab-info"><div><b>Types:</b> <span class="sh-chips">${pv.els.map(elChip).join('')}</span></div>
        <div><b>New moves:</b> <span class="sh-chips">${pv.moves.map(m => moveChip(m)).join('') || 'None'}</span></div>
        <div>${I ? `${esc(A.name)} keeps everything and gets the ${esc(D.FUSION_ITEMS[I].name)} look, type, move and stat boosts. The item is used up.`
          : `${esc(A.name)} and ${esc(B.name)} become <b>one</b> plant with the best level of every stat and all their elements. ${esc(A.name)}'s body, ${esc(B.name)}'s trait.`}</div></div>` : '';
    return `<section class="sh-lab">
      <h2>Fusion Lab</h2>
      <p class="sh-lab-sub">Mix a plant with another plant or a fusion item. A fused plant can't be fused again.</p>
      <div class="sh-lab-row">${plantSlot(A, 'a', 'First plant')}<span class="sh-op">+</span>${second}<span class="sh-op">=</span>${result}</div>
      ${info}
      <button class="btn go wide sh-lab-go" data-fuse ${why ? 'disabled' : ''}>Fuse! ${coin()}<span class="num">${fmt(cost)}</span></button>
      ${why ? `<p class="sh-lab-why">${esc(why)}</p>` : ''}
    </section>`;
  }
  function pickLab(which) {
    const { A } = labState();
    const choosePlant = (title, other) => PS.ui.pickSprout({ title, eyebrow: 'Fusion Lab',
      note: 'Fused plants can\'t be fused again.',
      filter: s => (s.fuse ? 'Already fused' : other && s.id === other ? 'Already picked' : true),
      extra: s => esc(state.elementsOf(s).map(e => D.ELEMENTS[e].label).join(' / ')),
      onPick: s => { if (which === 'a') { lab.a = s.id; if (lab.b === s.id) lab.b = null; } else { lab.b = s.id; lab.item = null; } PX.Sound.play('pop'); renderLab(); } });
    if (which === 'a') { choosePlant('First plant', lab.b); return; }
    if (!A) { PS.ui.toast('Pick the first plant first.'); return; }
    const itemIds = Object.keys(D.FUSION_ITEMS).filter(id => owned(id) > 0);
    PS.ui.modal({ eyebrow: 'Fusion Lab', title: `Fuse ${esc(A.name)} with…`, buttons: [{ label: 'Cancel' }],
      html: `<div class="sh-pickbox"><button class="sh-fi" data-pk="plant" type="button"><canvas data-sh="plant:${lookAttr({ species: 'sunflower', stage: 0 })}"></canvas><span><b>Another plant</b><small>Both plants become one new plant.</small></span><span class="tag">Plant</span></button>
        ${Object.keys(D.FUSION_ITEMS).map(id => { const I = D.FUSION_ITEMS[id], n = owned(id); return `<button class="sh-fi" data-pk="${id}" type="button" ${n ? '' : 'disabled'}><canvas data-sh="fitem:${id}"></canvas><span><b>${esc(I.name)}</b><small>${n ? `You have ${n}` : 'Buy one below, or win one'}</small></span><span class="tag">${n ? 'Item' : 'None'}</span></button>`; }).join('')}</div>`,
      mount(card, close) {
        hydrate(card);
        card.querySelectorAll('[data-pk]').forEach(b => b.onclick = () => {
          close(); const k = b.dataset.pk;
          if (k === 'plant') setTimeout(() => choosePlant('Second plant', lab.a), 0);
          else { lab.item = k; lab.b = null; PX.Sound.play('pop'); renderLab(); }
        });
        if (!itemIds.length) { const p = document.createElement('p'); p.className = 'bk-ver'; p.textContent = 'You have no fusion items yet. Buy them below, or win them in races, battles, gumballs and the Garden.'; card.querySelector('.sh-pickbox').appendChild(p); }
      } });
  }
  function renderLab() { const box = root && root.querySelector('[data-labbox]'); if (!box) return; box.innerHTML = labHTML(); hydrate(box); }
  // ---------- the fusion reveal ----------
  // The two plants (or the plant and its fusion item) swirl together, there's a big flash, and the new plant pops out
  // with sunburst rays and sparkles. About 2.8 seconds; a tap skips to the end.
  function fusionReveal(a, b, after, name, done) {
    const ov = document.createElement('div'); ov.className = 'sh-fx'; ov.innerHTML = '<canvas></canvas><b></b>'; document.body.appendChild(ov);
    const cv = ov.querySelector('canvas'), label = ov.querySelector('b'), x = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
    label.textContent = name;
    const W = () => cv.clientWidth, H = () => cv.clientHeight;
    const size = () => { cv.width = Math.round(W() * dpr); cv.height = Math.round(H() * dpr); };
    size();
    const sparks = Array.from({ length: 40 }, () => ({ a: Math.random() * 6.283, r: 0, v: 60 + Math.random() * 220, s: 2 + Math.random() * 3, c: ['#fff6c8', '#ffd6f2', '#c8f7ff', '#d8ffb0'][Math.floor(Math.random() * 4)] }));
    let t0 = performance.now(), ended = false, boomed = false, popped = false;
    const draw = (c, cx, cy, sc, rot, alpha) => { // an art canvas, centred, at sc css px per art px
      const w = PX.artW(c) * sc * dpr, h = PX.artH(c) * sc * dpr;
      x.save(); x.globalAlpha = alpha == null ? 1 : alpha; x.translate(cx * dpr, cy * dpr); if (rot) x.rotate(rot); x.imageSmoothingEnabled = false; x.drawImage(c, -w / 2, -h / 2, w, h); x.restore();
    };
    const finish = () => { if (ended) return; ended = true; ov.remove(); done(); };
    ov.addEventListener('pointerdown', e => { e.preventDefault(); if (performance.now() - t0 > 300) finish(); });
    PX.Sound.play('whoosh');
    const frame = now => {
      if (ended) return;
      if (cv.width !== Math.round(W() * dpr)) size();
      const T = (now - t0) / 1000, cx = W() / 2, cy = H() * 0.45, sc = Math.max(4, Math.floor(Math.min(W(), H()) / 64));
      x.clearRect(0, 0, cv.width, cv.height);
      if (T < 1.15) { // the two swirl in toward each other, faster and faster
        const k = T / 1.15, rad = (1 - k * k) * Math.min(W(), H()) * 0.28, ang = k * k * 9;
        draw(a, cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad * 0.6, sc, Math.sin(T * 9) * 0.15 * k);
        draw(b, cx - Math.cos(ang) * rad, cy - Math.sin(ang) * rad * 0.6, b.k ? sc : sc * 1.4, -Math.sin(T * 9) * 0.15 * k);
        x.fillStyle = 'rgba(255,246,200,' + (0.15 + 0.5 * k) + ')'; x.beginPath(); x.arc(cx * dpr, cy * dpr, (8 + 30 * k) * dpr, 0, 6.283); x.fill();
      } else {
        if (!boomed) { boomed = true; PX.Sound.play('evolve'); PX.buzz(50); }
        const k = Math.min(1, (T - 1.15) / 0.35);
        // sunburst rays turning slowly behind the new plant
        x.save(); x.translate(cx * dpr, cy * dpr); x.rotate(T * 0.6);
        for (let i = 0; i < 14; i++) { x.rotate(6.283 / 14); x.fillStyle = i % 2 ? 'rgba(255,240,170,.28)' : 'rgba(255,214,242,.22)'; x.beginPath(); x.moveTo(0, 0); x.lineTo(-22 * dpr, -Math.max(W(), H()) * dpr); x.lineTo(22 * dpr, -Math.max(W(), H()) * dpr); x.closePath(); x.fill(); }
        x.restore();
        for (const p of sparks) { p.r += p.v * 0.016; p.v *= 0.985; const px = cx + Math.cos(p.a) * p.r, py = cy + Math.sin(p.a) * p.r * 0.8; x.fillStyle = p.c; x.fillRect((px - p.s / 2) * dpr, (py - p.s / 2) * dpr, p.s * dpr, p.s * dpr); }
        const pop = k < 1 ? 0.3 + 1.0 * k : 1.3 - 0.3 * Math.min(1, (T - 1.5) / 0.25);
        if (!popped && T > 1.3) { popped = true; PX.Sound.play('chime'); label.style.opacity = 1; }
        draw(after, cx, cy + Math.sin(T * 4) * 3, sc * 1.35 * Math.max(0.3, pop), 0);
        const fl = 1 - Math.min(1, (T - 1.15) / 0.3); // the white flash
        if (fl > 0) { x.fillStyle = 'rgba(255,255,255,' + fl + ')'; x.fillRect(0, 0, cv.width, cv.height); }
      }
      if (T > 2.9) { finish(); return; }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
  function doFuse() {
    const { A, B, I } = labState(); if (labWhy(A, B, I)) return;
    const go = () => {
      const sa = PX.sprig(state.lookOf(A), { eyes: 'happy', mouth: 'open' }), sb = I ? PX.item('fitem', I) : PX.sprig(state.lookOf(B), { eyes: 'happy', mouth: 'open' });
      PS.ui.hold(true); // (pop-ups the fusion causes, like an evolution, wait until the reveal has played)
      const s = I ? state.fuseItem(A.id, I) : state.fusePlants(A.id, B.id);
      if (!s) { PS.ui.hold(false); PX.Sound.play('miss'); PS.ui.toast('That fusion didn\'t work.'); return; }
      lab.a = null; lab.b = null; lab.item = null; renderLab(); later(3);
      const fi = state.formInfo(s);
      fusionReveal(sa, sb, PX.sprig(state.lookOf(s), { eyes: 'happy', mouth: 'open', arms: 'up' }), fi.name, () => { PS.ui.modal({ eyebrow: 'Fusion complete!', title: `${esc(s.name)} is now a ${esc(fi.name)}!`, sprite: s, pose: { eyes: 'happy', mouth: 'open', arms: 'up' },
        html: `<p>Types: ${state.elementsOf(s).map(e => D.ELEMENTS[e].label).join(' and ')}.</p><p><b>New moves:</b> ${state.fusionMoves(s).map(m => D.MOVES[m].name).join(', ')}</p>`,
        buttons: [{ label: 'See its page', kind: 'go', onClick: () => PS.ui.go('sprouts', { id: s.id }) }, { label: 'Awesome!', kind: 'primary' }], mount: card => celebrate(card) }); PS.ui.hold(false); });
    };
    if (I) { go(); return; }
    PS.ui.modal({ eyebrow: 'Fusion Lab', title: `Fuse ${esc(A.name)} and ${esc(B.name)}?`, row: true,
      html: `<p>They will become <b>one</b> new plant: a ${esc(state.fusePreview(A, B).name)}. You can't undo a fusion.</p>`,
      buttons: [{ label: 'Not yet' }, { label: 'Fuse them!', kind: 'go', onClick: () => { setTimeout(go, 0); } }] });
  }

  const TABS = [
    { id: 'seeds', label: 'Seeds', icon: () => PX.item('egg', 'normal:peashooter'), intro: 'Every plant you unlock goes on sale here. Win races and battles to unlock new plants!' },
    { id: 'fusion', label: 'Fusion', icon: () => PX.item('fitem', 'extrashooter'), intro: 'Fuse plants together, or fuse a plant with a fusion item, to make something new.' },
    { id: 'fruit', label: 'Fruit', icon: () => PX.item('fruit', 'apple'), intro: 'Fruit trains one stat and keeps plants happy. Plant Food and Golden Fruit train every stat.' },
    { id: 'gumball', label: 'Gumballs', icon: () => ART.tabIcon(), intro: 'Turn the crank for a surprise prize!' },
  ];

  // ---------- gumball odds, straight from the D.GUMBALL[tier].prizes weights ----------
  const PRIZE = { // label + icon per prize type
    coins: ['Coins', () => 'bigcoin'], fruit: ['3 fruits', () => 'fruit:apple'], goldfruit: ['Plant Food or Golden Fruit', () => 'fruit:plantfood'],
    shard: ['2 element shards', () => 'shard:fire'], core: ['Element core', () => 'core:magic'], seed: ['Seed packet', () => 'egg:normal~peashooter'],
    fitem: ['Fusion item', () => 'fitem:knight'], specialseed: ['Special seeds', () => 'egg:ghost'], goldenseed: ['Golden seeds', () => 'egg:golden'], rainbowseed: ['Rainbow seeds', () => 'egg:rainbow'],
  };
  function prizeLook(k) {
    if (PRIZE[k]) return { label: PRIZE[k][0], icon: PRIZE[k][1]() };
    return { label: cap(k.replace(/[_-]+/g, ' ')), icon: 'gumball:3' };
  }
  // kid words for how likely a prize is; parents also get the "1 in N". The word is picked from the same rounded N that is shown.
  const RARITY = [{ id: 'often', label: 'Often', max: 6 }, { id: 'some', label: 'Sometimes', max: 25 }, { id: 'rare', label: 'Rare', max: 100 }, { id: 'super', label: 'Super rare', max: Infinity }];
  const nOf = p => { const n = 1 / p, d = Math.pow(10, Math.max(0, Math.floor(Math.log10(n)) - 1)); return Math.round(n / d) * d; }; // two significant figures: 4, 12, 660
  const rarityOf = p => (p >= 0.5 ? RARITY[0] : RARITY.find(r => nOf(p) <= r.max) || RARITY[RARITY.length - 1]);
  function oneIn(p) {
    if (!(p > 0)) return 'never';
    if (p >= 0.995) return 'every time';
    if (p >= 0.5) return `${Math.round(p * 10)} in 10`;
    return `1 in ${fmt(nOf(p))}`;
  }
  function oddsOf(tier) {
    const G = D.GUMBALL[tier], list = G && Array.isArray(G.prizes) ? G.prizes.filter(x => Array.isArray(x) && +x[1] > 0) : [];
    const tot = list.reduce((a, x) => a + +x[1], 0), by = {};
    if (!(tot > 0)) return [];
    for (const [k, w] of list) by[k] = (by[k] || 0) + +w;
    return Object.entries(by).map(([k, w]) => ({ k, p: w / tot })).sort((a, b) => b.p - a.p);
  }
  function oddsHTML(tier) {
    const G = D.GUMBALL[tier], odds = oddsOf(tier); if (!G || !odds.length) return '';
    const groups = RARITY.map(r => ({ r, list: odds.filter(o => rarityOf(o.p) === r) })).filter(g => g.list.length);
    return `<section class="sh-odds"><h3><canvas data-sh="gumball:${tier === 'mega' ? 6 : 0}" data-scale="3"></canvas>What's inside a ${esc(G.name || 'gumball')}?</h3>
      ${groups.map(g => `<div class="sh-odds-g"><span class="sh-rar ${g.r.id}">${g.r.label}</span><div class="sh-pzs">${g.list.map(o => { const L = prizeLook(o.k); return `<span class="sh-pz"><canvas data-sh="${L.icon}"></canvas><b>${esc(L.label)}</b><small>${oneIn(o.p)}</small></span>`; }).join('')}</div></div>`).join('')}</section>`;
  }
  // which D.GUMBALL prize key a result came from (seed packets all come back as type 'egg')
  function prizeKey(r, tier) {
    const keys = oddsOf(tier).map(o => o.k), has = k => keys.includes(k);
    if (r.type !== 'egg') return has(r.type) ? r.type : null;
    const kind = r.egg ? r.egg.kind : 'normal', k = kind === 'normal' ? 'seed' : kind === 'golden' ? 'goldenseed' : kind === 'rainbow' ? 'rainbowseed' : 'specialseed';
    return has(k) ? k : null;
  }

  // ---------- gumball machine ----------
  // gb.phase: idle -> crank -> rolling -> ready (waiting for a tap) -> opening -> shown (prize modal) -> idle.
  // The prize is already in the save when the crank starts (state.gumball pays out), so leaving mid-way loses nothing.
  const gb = { phase: 'idle', tier: 'small', res: null, frame: 0 };
  const GB_SCALE = 4, CRANK = [1, 2, 1, 2, 0, 3], CRANK_MS = 150, ROLL_MS = 950;
  function gbSay() {
    if (gb.phase === 'crank') return 'Crank, crank, crank…';
    if (gb.phase === 'rolling') return 'Here it comes!';
    if (gb.phase === 'ready') return `Tap your ${gb.tier === 'mega' ? 'mega ' : ''}gumball to open it!`;
    if (gb.phase === 'opening' || gb.phase === 'shown') return 'Pop!';
    return coinsNow() < ((D.GUMBALL.small || {}).price || 0) ? 'Win races and battles to earn coins!' : 'Pick a gumball below.';
  }
  function gbBallHTML() {
    if (!['rolling', 'ready', 'opening'].includes(gb.phase) || !gb.res) return '';
    const big = gb.tier === 'mega';
    const tw = big ? [[-12, 4, 'fff27a'], [58, -4, 'ffffff'], [50, 50, 'f7b6c8']].map(([x, y, c]) => `<canvas class="tw" data-sh="fx:${c}" data-scale="3" style="left:${x}px;top:${y}px"></canvas>`).join('') : '';
    return `<button class="sh-gb-ball ${big ? 'mega' : 'small'} ${gb.phase}" data-gb-open aria-label="Open your gumball">
      <canvas class="gb" data-sh="gumball:${gb.res.color}" data-scale="${big ? 9 : 6}"></canvas>${tw}<span class="sh-gb-tap">Tap me!</span></button>`;
  }
  function gbBuysHTML() {
    const busy = gb.phase !== 'idle', coins = coinsNow();
    return ['small', 'mega'].filter(t => D.GUMBALL[t]).map(tier => {
      const G = D.GUMBALL[tier], short = G.price - coins, big = tier === 'mega';
      const why = short > 0 ? `You need <b>${fmt(short)}</b> more coins` : busy ? 'Open your gumball first' : big ? 'Bigger, shinier prizes!' : 'A little surprise';
      return `<div class="sh-gb-opt"><button class="btn ${big ? 'sh-gb-mega' : 'primary'} sh-gb-buy" data-gumball="${tier}" ${short > 0 || busy ? 'disabled' : ''} aria-label="${esc(G.name)} for ${fmt(G.price)} coins">
        <canvas data-sh="gumball:${big ? 6 : 0}" data-scale="${big ? 6 : 4}"></canvas><span>${esc(G.name)}</span>
        <span class="sh-gb-pr">${coin()}<span class="num">${fmt(G.price)}</span></span></button>
        <p class="sh-gb-why">${why}</p></div>`;
    }).join('');
  }
  function gumballHTML() {
    return `<div class="sh-gb">
      <div class="sh-gb-stage ${gb.phase === 'crank' ? 'shake' : ''}"><div class="sh-gb-floor"></div><canvas class="px sh-gb-machine" data-gb-machine></canvas>${gbBallHTML()}</div>
      <p class="sh-gb-say" aria-live="polite">${gbSay()}</p>
      <div class="sh-gb-buys">${gbBuysHTML()}</div>
      ${['small', 'mega'].map(oddsHTML).join('')}
      <p class="sh-odds-note">Every gumball has one prize. Seed packets are always plants you've unlocked. If your core pouch is full, a core turns into 3 shards.</p>
    </div>`;
  }
  function drawMachine() {
    const cv = root && root.querySelector('[data-gb-machine]'); if (!cv) return;
    put(cv, ART.machine(gb.frame), GB_SCALE);
  }
  // refresh just the machine area (keeps the page and its scroll position still)
  function refreshGumball() {
    if (!root || tab !== 'gumball') return;
    const stage = root.querySelector('.sh-gb-stage'); if (!stage) return;
    stage.classList.toggle('shake', gb.phase === 'crank');
    const ball = stage.querySelector('.sh-gb-ball'), want = gbBallHTML();
    if (!want && ball) ball.remove();
    else if (want && !ball) { stage.insertAdjacentHTML('beforeend', want); hydrate(stage); }
    else if (ball) ball.className = `sh-gb-ball ${gb.tier === 'mega' ? 'mega' : 'small'} ${gb.phase}`;
    drawMachine();
    root.querySelector('.sh-gb-say').textContent = gbSay();
    const buys = root.querySelector('.sh-gb-buys'); buys.innerHTML = gbBuysHTML(); hydrate(buys);
  }
  // scroll so the machine sits just under the sticky tabs (the buttons fit below it on a phone)
  function showMachine(smooth) {
    const sc = root && root.querySelector('.sh-scroll'), intro = root && root.querySelector('.sh-intro'), tabs = root && root.querySelector('.sh-tabs');
    if (!sc || !intro || !tabs || tab !== 'gumball') return;
    const top = Math.max(0, intro.offsetTop - tabs.offsetHeight - 2);
    if (Math.abs(sc.scrollTop - top) < 4) return;
    if (smooth && sc.scrollTo) sc.scrollTo({ top, behavior: 'smooth' }); else sc.scrollTop = top;
  }
  function buyGumball(tier) {
    if (gb.phase !== 'idle') return;
    const G = D.GUMBALL[tier]; if (!G) return;
    if (PS.S.coins < G.price) { PX.Sound.play('miss'); PS.ui.toast(`You need ${fmt(G.price - PS.S.coins)} more coins for a ${G.name.toLowerCase()}.`, 2800); return; }
    holdNews(true); // "New seed packet!" toasts wait for the reveal instead of spoiling the surprise
    holdCoins(PS.S.coins - G.price); // the price shows as paid; a coin prize shows when the ball opens
    let armed = true;
    // freeze the HUD right after it shows the payment and before any coin prize lands (both happen inside state.gumball)
    const off = PS.on('coins', e => { if (armed && e.n < 0) { armed = false; hud(true); } });
    let res = null;
    try { res = state.gumball(tier); } catch (err) { console.error(err); }
    armed = false; if (typeof off === 'function') off();
    if (!res || !res.ok) { releaseCoins(false); holdNews(false); PX.Sound.play('miss'); PS.ui.toast('Not enough coins.'); return; }
    hud(true);
    Object.assign(gb, { phase: 'crank', tier, res, frame: 0 });
    PX.buzz(10);
    refreshCoins();
    refreshGumball();
    showMachine(true);
    CRANK.forEach((f, i) => setTimeout(() => {
      gb.frame = f;
      if (f === 3) { gb.phase = 'rolling'; PX.Sound.play('pop'); } else PX.Sound.play('tick');
      refreshGumball();
    }, CRANK_MS * (i + 1)));
    setTimeout(() => { if (gb.phase !== 'rolling') return; gb.phase = 'ready'; PX.Sound.play('thud'); PX.buzz(15); refreshGumball(); }, CRANK_MS * CRANK.length + ROLL_MS);
  }
  function openGumball() {
    if (gb.phase !== 'ready' || !gb.res) return;
    gb.phase = 'opening';
    PX.Sound.play('crack'); PX.buzz(25);
    const stage = root.querySelector('.sh-gb-stage'), ball = stage && stage.querySelector('.sh-gb-ball');
    refreshGumball();
    if (stage && ball) {
      const sr = stage.getBoundingClientRect(), br = ball.getBoundingClientRect();
      burst(stage, br.left - sr.left + br.width / 2, br.top - sr.top + br.height / 2, gb.tier === 'mega' ? 22 : 14, gb.tier === 'mega' ? 90 : 60);
    }
    setTimeout(showPrize, 420);
  }
  function prizeArt(r) {
    try {
      if (r.type === 'coins') return PX.item('bigcoin');
      if (r.type === 'fruit' || r.type === 'goldfruit') return PX.item('fruit', r.id);
      if (r.type === 'shard') return PX.item('shard', r.id);
      if (r.type === 'core') return PX.item('core', r.id);
      if (r.type === 'fitem') return PX.item('fitem', r.id);
      if (r.type === 'egg' && r.egg) return PX.item('egg', r.egg.kind + ':' + r.egg.species);
    } catch (e) { console.error(e); }
    return ART.item('gumball', r.color);
  }
  let held = false;
  function holdNews(on) { if (on === held || !PS.ui.hold) return; held = on; PS.ui.hold(on); }
  function showPrize() {
    holdNews(false);
    const r = gb.res; if (!r) { gb.phase = 'idle'; releaseCoins(false); refreshGumball(); return; }
    gb.phase = 'shown';
    releaseCoins(r.type === 'coins'); // the HUD and wallet catch up now, with the prize
    // honest words: say how rare the prize really is (from the same weights as the odds list) instead of "Jackpot!"
    const G = D.GUMBALL[gb.tier] || {}, key = prizeKey(r, gb.tier), o = key ? oddsOf(gb.tier).find(x => x.k === key) : null, rar = o ? rarityOf(o.p) : null;
    const special = !!rar && (rar.id === 'rare' || rar.id === 'super');
    PX.Sound.play(special ? 'evolve' : 'level');
    const isEgg = r.type === 'egg' && r.egg;
    const buttons = [{ label: 'Yay!', kind: 'primary' }];
    if (r.type === 'fitem') buttons.push({ label: 'Open the Fusion Lab', onClick: () => { leaveGumball(); tab = 'fusion'; render(); root.querySelector('.sh-scroll').scrollTop = 0; } });
    else if (isEgg || ['shard', 'core', 'fruit', 'goldfruit'].includes(r.type)) {
      buttons.push({ label: 'Go to the Garden', onClick: () => {
        const egg = isEgg ? r.egg : null;
        if (egg && D.AREAS[egg.area] && egg.area !== PS.S.area) { PS.S.area = egg.area; PS.emit('area', { area: egg.area }); PS.save(); }
        PS.ui.go('garden');
      } });
    }
    const text = special ? String(r.text || '').replace(/^[^.!?]*!\s+(?=\S)/, '') : String(r.text || ''); // drop hype like "The jackpot!"; the odds line says it better
    PS.ui.modal({
      eyebrow: rar && rar.id === 'super' ? 'Super rare!' : special ? 'Rare prize!' : gb.tier === 'mega' ? 'Mega gumball prize' : 'Gumball prize',
      title: esc(r.title || 'A prize!'), sprite: square(prizeArt(r)),
      html: `<p>${esc(text)}</p>${special ? `<p class="sh-m-odds">About ${oneIn(o.p)} ${esc(String(G.name || 'gumball').toLowerCase())}s has one.</p>` : ''}`,
      buttons, mount: card => celebrate(card),
      onClose: () => { gb.phase = 'idle'; gb.res = null; gb.frame = 0; refreshGumball(); },
    });
  }
  // leaving the gumball tab or the shop mid-spin: never leave the coins frozen or the news held back
  function leaveGumball() { holdNews(false); releaseCoins(false); }

  // ---------- scene ----------
  let root, tab = 'seeds', dirty = false, visible = false;
  function listHTML() {
    if (tab === 'seeds') {
      const ids = Object.keys(D.PLANTS), open = ids.filter(id => state.isUnlocked(id)), shut = ids.filter(id => !state.isUnlocked(id));
      const html = `<h2 class="sh-sec px-title">Plant seeds <span class="sh-sec-sub">(${open.length} of ${ids.length} unlocked)</span></h2>
        <div class="sh-seeds">${open.concat(shut).map(seedCard).join('')}</div>
        <h2 class="sh-sec px-title">Special seed packets</h2><p class="sh-sec-sub">A random plant you've unlocked, with a special look and a head start.</p>
        <div class="sh-list">${D.SHOP_SEEDS.filter(id => D.SEEDS[id]).map(specialCard).join('')}</div>`;
      for (const id of open) PS.S.seen['shopseed:' + id] = true; // "New!" shows once
      return html;
    }
    if (tab === 'fusion') return `<div data-labbox>${labHTML()}</div>
      <h2 class="sh-sec px-title">Fusion items</h2><p class="sh-sec-sub">Fuse one onto a plant to give it a new look, a type, a move and some stat levels. Also found in races, battles, gumballs and (rarely) the Garden.</p>
      <div class="sh-list">${Object.keys(D.FUSION_ITEMS).map(fitemCard).join('')}</div>`;
    if (tab === 'gumball') return gumballHTML();
    return `<div class="sh-list fruit">${Object.keys(D.FRUITS).map(fruitCard).join('')}</div>`;
  }
  function render() {
    dirty = false; need = 0; wantBump = false;
    const sc = root.querySelector('.sh-scroll'), keep = sc ? sc.scrollTop : 0;
    const T = TABS.find(x => x.id === tab) || TABS[0];
    root.innerHTML = `<div class="sh-scroll"><div class="sh-wrap">
      <header class="panel sh-head">
        <canvas class="sh-logo" data-sh="icon:shop" data-scale="0"></canvas>
        <div><h1 class="px-title">Crazy Dave's Shop</h1><div class="sh-sub">Seeds, fusions, fruit and gumballs</div></div>
        <div class="sh-wallet" title="Your coins">${coin()}<span class="num">${fmt(coinsNow())}</span></div>
        <div class="sh-earn"><canvas data-sh="icon:race" data-scale="0"></canvas><div><b>Earn coins</b> by racing and battling zombies. Higher tiers pay much more. Coins also drop in the Garden.</div></div>
      </header>
      <div class="sh-tabs four" role="tablist">${TABS.map(x => `<button class="sh-tab" role="tab" data-tab="${x.id}" aria-selected="${x.id === tab}"><canvas data-tabicon="${x.id}"></canvas>${x.label}</button>`).join('')}</div>
      <p class="sh-intro">${T.intro}</p>
      ${listHTML()}
      <p class="sh-foot">${tab === 'gumball' ? 'Seed packets, shards, cores and fruit go to the Garden. Fusion items go to the Fusion Lab.'
        : tab === 'fusion' ? 'Fused plants keep their elements, and can still evolve and take new elements.' : 'Everything you buy goes to the Garden. Seed packets wait in the grass, and fruit goes in your fruit tray.'}</p>
    </div></div>`;
    hydrate(root);
    root.querySelectorAll('canvas[data-tabicon]').forEach(cv => put(cv, TABS.find(x => x.id === cv.dataset.tabicon).icon()));
    drawMachine();
    root.querySelector('.sh-scroll').scrollTop = keep;
  }

  // ---------- buying ----------
  function whatHappens(kind, id) {
    const here = esc((D.AREAS[PS.S.area] || D.AREAS.frontyard).name);
    if (kind === 'seed') return `It will appear in the ${here} in the Garden. Tap it ${D.SEEDS.normal.taps} times to plant it and grow a new ${esc(D.PLANTS[id].name)}.`;
    if (kind === 'special') { const e = D.SEEDS[id]; return `It will appear in the ${here} in the Garden. Tap it ${e.taps || 5} times to grow a surprise plant you've unlocked.`; }
    if (kind === 'fitem') return 'It goes to your fusion items. Fuse it onto any plant here in the Fusion Lab.';
    return 'It goes in your fruit tray in the Garden. Feed it to any plant.';
  }
  const TITLE = { seed: 'Seed packet', special: 'Special seeds', fitem: 'Fusion item', fruit: 'Fruit' };
  function confirmBuy(kind, id) {
    const info = itemInfo(kind, id); if (!info) return;
    if (heldCoins != null) { PX.Sound.play('miss'); showMachine(true); return; } // a gumball is waiting: open it first (toasts are held until it opens)
    const coins = PS.S.coins;
    if (coins < info.price) {
      PX.Sound.play('miss');
      PS.ui.toast(`You need ${fmt(info.price - coins)} more coins for ${info.name}.`, 2800);
      return;
    }
    const buttons = [];
    if (kind === 'fruit' || kind === 'seed') {
      const maxN = Math.floor(coins / info.price);
      buttons.push({ label: `Buy 1 for ${fmt(info.price)}`, kind: 'primary', onClick: () => doBuy(kind, id, 1) });
      if (maxN >= 5) buttons.push({ label: `Buy 5 for ${fmt(info.price * 5)}`, kind: 'go', onClick: () => doBuy(kind, id, 5) });
      buttons.push({ label: 'Not now' });
    } else {
      buttons.push({ label: 'Not now' }, { label: 'Buy it', kind: 'primary', onClick: () => doBuy(kind, id, 1) });
    }
    const what = kind === 'seed' ? esc(info.name) : `the ${esc(info.name)}`;
    const have = kind === 'fitem' ? owned(id) : 0;
    PS.ui.modal({
      eyebrow: TITLE[kind] || 'Shop', title: `Buy ${what}?`, sprite: square(info.src),
      html: `<p class="sh-m-price">${coin()}<span class="num">${fmt(info.price)}</span></p>
        <p class="sh-m-left">You have ${fmt(coins)} coins. You'd have ${fmt(coins - info.price)} left.${have ? ` You already have ${have}.` : ''}</p>
        <p class="sh-m-note">${whatHappens(kind, id)}</p>`,
      row: kind !== 'fruit' && kind !== 'seed', buttons, mount: card => hydrate(card),
    });
  }
  function doBuy(kind, id, n) {
    const info = itemInfo(kind, id); if (!info) return;
    let got = 0;
    for (let i = 0; i < (n || 1); i++) { if (state.buy(kind, id)) got++; else break; }
    if (!got) { PX.Sound.play('miss'); PS.ui.toast(PS.S.coins < info.price ? 'Not enough coins.' : 'That can\'t be bought right now.'); return; }
    PX.Sound.play('level'); PX.buzz(25);
    let title, body, area = PS.S.area, buttons = null;
    if (kind === 'seed' || kind === 'special') {
      const egg = PS.S.eggs[PS.S.eggs.length - 1]; area = egg ? egg.area : area;
      title = got > 1 ? `${got} × ${esc(info.name)}!` : `You got ${kind === 'seed' ? '' : 'a '}${esc(info.name)}!`;
      body = `<p>${got > 1 ? 'They are' : 'It is'} waiting in the ${esc((D.AREAS[area] || D.AREAS.frontyard).name)} in the Garden. Tap ${got > 1 ? 'each one' : 'it'} ${(D.SEEDS[kind === 'seed' ? 'normal' : id] || {}).taps || 5} times to plant ${got > 1 ? 'them' : 'it'}.</p>`;
    } else if (kind === 'fitem') {
      title = `You got a ${esc(info.name)}!`;
      body = `<p>It's in your fusion items${owned(id) > 1 ? ` (you have ${owned(id)})` : ''}. Fuse it onto a plant in the Fusion Lab.</p>`;
      buttons = [{ label: 'Fuse it now', kind: 'go', onClick: () => { tab = 'fusion'; lab.item = id; lab.b = null; render(); root.querySelector('.sh-scroll').scrollTop = 0; } }, { label: 'Keep shopping' }];
    } else {
      title = got > 1 ? `${got} × ${esc(info.name)}!` : `One ${esc(info.name)}!`;
      body = `<p>${got > 1 ? 'They are' : 'It is'} in your fruit tray in the Garden. Feed ${got > 1 ? 'them' : 'it'} to a plant there. You now have ${PS.S.fruits[id] || got}.</p>`;
    }
    PS.ui.modal({
      eyebrow: 'Bought', title, sprite: square(info.src), html: body,
      buttons: buttons || [
        { label: 'Go to the Garden', kind: 'go', onClick: () => { if (area !== PS.S.area) { PS.S.area = area; PS.emit('area', { area }); PS.save(); } PS.ui.go('garden'); } },
        { label: 'Keep shopping' },
      ],
      mount: card => celebrate(card),
    });
  }
  // a little burst of pixel sparkles around the modal sprite
  function celebrate(card) {
    card.style.position = 'relative';
    const sp = card.querySelector('.m-sprite'); if (!sp) return;
    burst(card, sp.offsetLeft + sp.offsetWidth / 2, sp.offsetTop + sp.offsetHeight / 2, 14, 70);
  }
  // n sparkles flying out from (cx, cy) inside a positioned box
  function burst(box, cx, cy, n, dist) {
    const cols = ['#fbf236', '#f7b6c8', '#9fd8ff', '#99e550', '#ffffff'];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, r = dist + Math.random() * 30, c = document.createElement('canvas');
      put(c, PX.fx(i % 3 ? 'spark' : 'bigspark', cols[i % cols.length]));
      c.className = 'px sh-spark';
      c.style.cssText = `left:${cx - 5}px;top:${cy - 5}px;z-index:3;--dx:${Math.cos(a) * r}px;--dy:${Math.sin(a) * r}px;animation-delay:${(i % 4) * 0.05}s`;
      box.appendChild(c);
      setTimeout(() => c.remove(), 1400);
    }
  }

  // ---------- wiring ----------
  function onClick(e) {
    const t = e.target.closest('[data-tab]');
    if (t) {
      if (t.dataset.tab !== tab) { if (tab === 'gumball') leaveGumball(); tab = t.dataset.tab; PX.Sound.play('tick'); render(); root.querySelector('.sh-scroll').scrollTop = 0; showMachine(false); }
      return;
    }
    const lb = e.target.closest('[data-lab]');
    if (lb) { PX.Sound.play('tick'); pickLab(lb.dataset.lab); return; }
    if (e.target.closest('[data-fuse]')) { doFuse(); return; }
    const b = e.target.closest('[data-buy]');
    if (b) { PX.Sound.play('pop'); const [k, id] = b.dataset.buy.split(':'); confirmBuy(k, id); return; }
    const g = e.target.closest('[data-gumball]');
    if (g) { if (!g.disabled) buyGumball(g.dataset.gumball); return; }
    if (e.target.closest('[data-gb-open]')) openGumball();
  }
  PS.scenes.shop = {
    mount(el) {
      injectCSS(); root = el;
      root.addEventListener('click', onClick);
      PS.on('coins', e => { if (heldCoins != null) return; if (e.n > 0) wantBump = true; later(1); });
      ['pouch', 'egg:new', 'egg:hatch', 'items', 'sprout:update', 'sprout:sold', 'unlock', 'fusion'].forEach(ev => PS.on(ev, () => later(2)));
      PS.on('reset', () => { releaseCoins(false); later(3); });
      render();
    },
    show(params) {
      visible = true;
      if (gb.phase === 'shown' && PS.ui.modalOpen === false) { gb.phase = 'idle'; gb.res = null; gb.frame = 0; dirty = true; } // the prize card was closed some other way
      const jump = params && params.tab && TABS.some(x => x.id === params.tab);
      if (jump) { tab = params.tab; dirty = true; }
      if (dirty) render();
      if (params && params.fuse && state.get(params.fuse)) { tab = 'fusion'; lab.a = params.fuse; dirty = true; render(); }
      if (jump) { root.querySelector('.sh-scroll').scrollTop = 0; showMachine(false); }
    },
    hide() { visible = false; leaveGumball(); },
    frame() {},
  };
})();
