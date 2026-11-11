import asyncio,json,time
from pathlib import Path
from playwright.async_api import async_playwright
P=Path(__file__).resolve().parents[1];O=P.parent/'verification/runtime-agent';O.mkdir(parents=True,exist_ok=True)
fixture=json.loads((P/'tools/test-saves/pvz-animation-review.json').read_text());fixture['clockOffset']=300000-int(time.time()*1000)%(30*60000)
fixture.setdefault('arcade',{})['clawGift']=1
fixture['arcade']['unl']={k:1 for k in ['bowl','whack','vase','sun','pairs','match','gallery','mower','claw']}
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);c=await b.new_context(viewport={'width':1024,'height':768});await c.add_init_script('localStorage.setItem("pvzg:save:v1:runtimeagent",'+json.dumps(json.dumps(fixture))+');')
  page=await c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));await page.goto('http://127.0.0.1:8770/?save=runtimeagent');await page.wait_for_function('window.PX?.v2ai&&window.__garden&&window.PS?.almanac');await page.wait_for_timeout(800)
  await page.evaluate('''() => { window.__poseTrace=[]; const orig=PX.v2ai.pose; PX.v2ai.pose=function(L,P,time,progress){const r=orig(L,P,time,progress);if(L?.zombie==='basic')__poseTrace.push({clip:r.animClip,frame:r.animFrame,time,progress});return r;}; }''')
  await page.evaluate('PS.almanac.open("z","basic")');await page.wait_for_timeout(300);await page.evaluate('__poseTrace=[]');await page.locator('[data-pghero]').click();await page.wait_for_timeout(1300)
  almanac=await page.evaluate('({frames:[...new Set(__poseTrace.filter(p=>p.clip==="attack").map(p=>p.frame))],count:__poseTrace.length})')
  print('almanac',almanac,flush=True)
  await page.evaluate('PS.ui.go("garden");__garden.raidNow();if(__garden.raid)__garden.raid.t=0')
  await page.wait_for_function('__garden.raid?.phase==="fight"');await page.wait_for_function('__garden.raid.zs.length>0',timeout=15000)
  await page.evaluate('''() => { const raid=__garden.raid;raid.zs=raid.zs.slice(0,1);const z=raid.zs[0];z.kind='basic';z.costume='witch';z.x=__garden.cam.x+100;z.y=__garden.cam.y+140;z.hp=99999;z.hitT=0;z.chomp=0;raid.queue=[];window.__eventCalls=[];const orig=PX.eventZombie;PX.eventZombie=function(k,c,P){if(k==='basic')__eventCalls.push({P,t:performance.now()});return orig(k,c,P);};__poseTrace=[]; }''')
  await page.wait_for_timeout(1400)
  costume=await page.evaluate('({calls:__eventCalls.length,frames:[...new Set(__poseTrace.filter(p=>p.clip==="walk").map(p=>p.frame))]})')
  print('costume',costume,flush=True)
  await page.screenshot(path=str(O/'garden-costume-probe.png'))
  await page.evaluate('PS.ui.go("arcade");__arcade.start("whack")')
  await page.wait_for_function('!!__arcade.game');await page.wait_for_timeout(500)
  await page.evaluate('''() => {const g=__arcade.game;g.st='play';g.t=0;g.spawnT=999;g.holes.fill(null);g.holes[0]={kind:'basic',look:'basic',gold:true,friend:false,hitT:0,st:'up',rise:1,upFor:99,t:.2};__poseTrace=[];}''')
  await page.wait_for_timeout(650)
  arcade=await page.evaluate('({frames:[...new Set(__poseTrace.filter(p=>p.clip==="attack").map(p=>p.frame))],game:__arcade.game?.def.id})')
  print('arcade',arcade,flush=True)
  await page.screenshot(path=str(O/'ipad-arcade-gold-animation.png'))
  await page.set_viewport_size({'width':390,'height':844});await page.wait_for_timeout(250)
  phone=await page.evaluate('({width:innerWidth,scrollWidth:document.documentElement.scrollWidth})')
  await page.screenshot(path=str(O/'phone-arcade-gold-animation.png'))
  assert almanac['frames']==[0,1,2],almanac
  assert sorted(costume['frames'])==[0,1,2,3],costume
  assert arcade['frames']==[0,1,2],arcade
  assert not errors,errors
  assert phone['width']==phone['scrollWidth'],phone
  result={'almanac':almanac,'costume':costume,'arcade':arcade,'phone':phone,'errors':errors};(O/'probe.json').write_text(json.dumps(result,indent=2)+'\n');await b.close()
asyncio.run(main())
