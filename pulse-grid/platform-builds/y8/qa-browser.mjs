// PULSE GRID Y8 isolated Chromium smoke, with a fake local-only SDK.
// Does NOT contact Y8, serve ads, use real publisher IDs, or submit the game.
// Run from repository root after: npm install --no-save --no-package-lock playwright-core@1.57.0
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const root = resolve('pulse-grid/platform-builds/y8');
const html = await readFile(resolve(root, 'index.html'), 'utf8');
assert.match(html, /window\.PULSE_Y8_APP_ID\s*=\s*""\s*;/);
assert.match(html, /window\.PULSE_Y8_GAME_ID\s*=\s*""\s*;/);
assert.doesNotMatch(html, /(?:paypal\.me|paypal\.com|window\.open\(|navigator\.share\()/i);
const server = createServer((_req, res) => {
  res.writeHead(200, {'content-type':'text/html; charset=utf-8','cache-control':'no-store'}).end(html);
});
await new Promise(ok=>server.listen(0, '127.0.0.1', ok));
const origin = 'http://127.0.0.1:' + server.address().port;
const sdkMock = `
window.__qa={inits:[],ads:[],sdkLoaded:true};
const stub={
 init:function(config,ads){window.__qa.inits.push({config,ads:!!ads});return Promise.resolve();},
 showAd:function(options){window.__qa.ads.push(options.name);return Promise.reject(new Error('QA simulated no-fill'));}
};
window.y8={
 sdk:()=>stub,
 emitReadyEvent:()=>window.dispatchEvent(new Event('y8sdk.ready'))
};
queueMicrotask(()=>window.y8.emitReadyEvent());
`;
let browser;
try {
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
  for(const mode of [
    {name:'desktop-no-IDs',width:1280,height:900,mobile:false,configured:false},
    {name:'mobile-no-IDs',width:390,height:844,mobile:true,configured:false},
    {name:'desktop-fake-IDs',width:1280,height:900,mobile:false,configured:true},
    {name:'mobile-fake-IDs',width:390,height:844,mobile:true,configured:true}
  ]){
    const context=await browser.newContext({viewport:{width:mode.width,height:mode.height},isMobile:mode.mobile,hasTouch:mode.mobile});
    const page=await context.newPage();
    const pageErrors=[];
    page.on('pageerror', e=>pageErrors.push(e.message));
    await page.route('https://cdn.y8.com/minimal-sdk/2-0/y8.min.js',r=>r.fulfill({status:200,contentType:'application/javascript',body:sdkMock}));
    await page.route(origin+'/index.html',r=>{
      const source=mode.configured ? html.replace('window.PULSE_Y8_APP_ID = "";','window.PULSE_Y8_APP_ID = "QA-LOCAL-APP";').replace('window.PULSE_Y8_GAME_ID = "";','window.PULSE_Y8_GAME_ID = "QA-LOCAL-GAME";') : html;
      return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:source});
    });
    await page.route('https://fonts.googleapis.com/**',r=>r.abort());
    await page.route('https://fonts.gstatic.com/**',r=>r.abort());
    const response=await page.goto(origin+'/index.html',{waitUntil:'domcontentloaded',timeout:15000});
    assert.equal(response.status(),200);
    await page.waitForFunction(()=>window.__qa?.sdkLoaded,{timeout:10000});
    await page.waitForTimeout(60);
    assert.equal(await page.locator('#overlay').isVisible(),true);
    assert.equal(await page.locator('#soundToggle').getAttribute('aria-pressed'),'false');
    const ext=await page.locator('a[href^="https://"],a[href^="http://"]').count();
    assert.equal(ext,0,'publisher build should not show offsite links');
    const initialized=await page.evaluate(()=>window.__qa.inits);
    assert.equal(initialized.length,mode.configured?1:0,'SDK init must require a real developer app ID');
    if(mode.configured){
      assert.equal(initialized[0].config.appId,'QA-LOCAL-APP');
      assert.equal(initialized[0].ads,true);
    }
    await page.locator('#start').click();
    await page.waitForFunction(()=>active && document.getElementById('overlay').hidden);
    if(mode.mobile){
      const widths=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth}));
      assert.ok(widths.page<=widths.viewport+2,'horizontal page overflow: '+JSON.stringify(widths));
      await page.locator('#rot').click();
      await page.locator('#drop').click();
    } else {
      await page.keyboard.press('Space');
    }
    assert.ok(await page.evaluate(()=>score>0),'gameplay did not change score');
    assert.deepEqual(await page.evaluate(()=>window.__qa.ads),[],'no ad during gameplay');
    await page.locator('#pause').click();
    assert.equal(await page.locator('#overTitle').textContent(),'PAUSED');
    await page.locator('#start').click();
    await page.waitForFunction(()=>active && document.getElementById('overlay').hidden);
    await page.evaluate(()=>end());
    assert.equal(await page.locator('#overTitle').textContent(),'GAME OVER');
    await page.waitForTimeout(60);
    const after=await page.evaluate(()=>window.__qa.ads);
    assert.deepEqual(after,mode.configured?['round-complete']:[],'Y8 interstitial must only occur after game over and with IDs');
    await page.locator('#start').click();
    await page.waitForFunction(()=>active && document.getElementById('overlay').hidden);
    assert.deepEqual(pageErrors,[],'uncaught browser exception');
    console.log('PASS '+mode.name+' start/score/pause/end/SDK/replay/no-fill');
    await context.close();
  }
} finally {
  if(browser) await browser.close();
  await new Promise(ok=>server.close(ok));
}
console.log('PASS Y8 isolated browser smoke; real Y8 SDK, IDs and portal review remain unverified.');
