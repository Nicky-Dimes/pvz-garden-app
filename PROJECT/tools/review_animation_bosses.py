import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'verification'
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  c=await b.new_context(viewport={'width':1180,'height':1050},record_video_dir=str(O/'video-bosses'),record_video_size={'width':1180,'height':1050})
  page=await c.new_page();errors=[];failed=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('response',lambda r:failed.append({'url':r.url,'status':r.status}) if r.status>=400 else None)
  await page.goto('http://127.0.0.1:8770/_animation-review.html',wait_until='load')
  await page.wait_for_function('document.querySelector("#boss").options.length>=11',timeout=30000)
  results={}
  for id in ['gargantuar','sphinx','darkdragon','tomorrowtron','warwagon','gondola','plankwalker','frostmammoth','sharktronic','mechasaur','masher']:
   await page.select_option('#boss',id);await page.select_option('#clip','attack');await page.wait_for_timeout(300)
   if id in ['sphinx','darkdragon','tomorrowtron','warwagon','gondola']:await page.screenshot(path=str(O/(id+'-reference-runtime.png')))
   await page.click('#battle');await page.locator('#game').scroll_into_view_if_needed()
   await page.wait_for_function('(id)=>document.querySelector("#game").contentWindow.__battle.V?.boss?.id===id',arg=id)
   await page.wait_for_timeout(3400)
   game=page.frames[1]
   await game.locator('#scr-battle').screenshot(path=str(O/(id+'-game-battle.png')))
   results[id]=await game.evaluate('({id:__battle.V.boss.id,canvasCount:document.querySelectorAll("#scr-battle canvas").length})')
   await game.evaluate('__battle.forfeit()')
  await page.set_viewport_size({'width':390,'height':844})
  game=page.frames[1];await game.evaluate('PS.ui.go("garden");__garden.focusCamera()');await page.locator('#game').scroll_into_view_if_needed();await page.wait_for_timeout(500)
  await page.screenshot(path=str(O/'phone-review-game.png'))
  results['phone']=await game.evaluate('({width:innerWidth,scrollWidth:document.documentElement.scrollWidth})')
  results['pageErrors']=errors;results['failedRequests']=failed
  (O/'boss-browser-results.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps({'bosses':len(results)-3,'pageErrors':errors,'failedRequests':failed,'phone':results['phone']}),flush=True)
  await c.close();await b.close()
asyncio.run(main())
