import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'verification'
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage']);page=await b.new_page(viewport={'width':1180,'height':1050});errors=[];failed=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('response',lambda r:failed.append(r.url) if r.status>=400 else None)
  await page.goto('http://127.0.0.1:8770/_animation-review.html');await page.wait_for_function('document.querySelector("#plantfamily").options.length>=6')
  families=await page.locator('#plantfamily option').evaluate_all('(options)=>options.map(o=>o.value)')
  for id in families:
   await page.select_option('#plantfamily',id);await page.select_option('#plantclip','attack');await page.evaluate('scrollTo(0,document.querySelector("#plantfamily").getBoundingClientRect().top+scrollY-20)');await page.wait_for_timeout(300);await page.screenshot(path=str(O/(id+'-reference-runtime.png')))
  game=page;await game.set_viewport_size({'width':1024,'height':768});await game.goto('http://127.0.0.1:8770/index.html?save=animationreview');await game.wait_for_function('!!window.__garden');await game.wait_for_timeout(600);await game.evaluate('PS.ui.go("garden");__garden.focusCamera()');await game.wait_for_timeout(300);await game.screenshot(path=str(O/'ipad-current-garden.png'))
  await game.set_viewport_size({'width':390,'height':844});await game.wait_for_timeout(300);await game.evaluate('__garden.focusCamera()');await game.screenshot(path=str(O/'phone-current-garden.png'))
  result={'families':len(families),'ids':families,'errors':errors,'failedRequests':failed,'phone':await game.evaluate('({width:innerWidth,scrollWidth:document.documentElement.scrollWidth})')};assert not errors and not failed,result;assert result['phone']['width']==result['phone']['scrollWidth'];(O/'plant-browser-results.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));await b.close()
asyncio.run(main())
