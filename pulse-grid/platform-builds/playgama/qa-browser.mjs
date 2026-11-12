// Real Chromium UI smoke for the isolated Playgama build; host SDK is explicitly mocked.
// Run from repo root: npm install --no-save playwright-core@1.57.0 && node pulse-grid/platform-builds/playgama/qa-browser.mjs
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, resolve, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = resolve('pulse-grid/platform-builds/playgama');
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.ogg':'audio/ogg','.mp3':'audio/mpeg'};
const server = createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://local.test').pathname);
    const file = resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + '/')) { res.writeHead(403).end(); return; }
    const bytes = await readFile(file);
    res.writeHead(200, {'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'}).end(bytes);
  } catch { res.writeHead(404).end('not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1',resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const errors = [];
const sdkMock = `
window.__qa={messages:[],events:{},writes:[]};
window.bridge={
 initialize:async()=>true,
 EVENT_NAME:{PAUSE_STATE_CHANGED:'host_pause', AUDIO_STATE_CHANGED:'host_audio'},
 platform:{language:'en',isAudioEnabled:true,sendMessage:function(s){window.__qa.messages.push(s);return Promise.resolve()},on:function(evt,handler){window.__qa.events[evt]=handler}},
 storage:{get:async keys=>keys.map(()=>null),set:async(keys,values)=>{window.__qa.writes.push({keys,values})}},
 advertisement:{isInterstitialSupported:false,showInterstitial:async()=>{}}
};
`;
let browser;
try {
  browser = await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
  for (const mode of [
    {name:'desktop',viewport:{width:1280,height:900},isMobile:false,hasTouch:false},
    {name:'mobile',viewport:{width:390,height:844},isMobile:true,hasTouch:true}
  ]) {
    const context = await browser.newContext({ viewport:mode.viewport,isMobile:mode.isMobile,hasTouch:mode.hasTouch});
    const page = await context.newPage();
    page.on('pageerror',e=>errors.push(mode.name+': '+e.message));
    await page.route('https://bridge.playgama.com/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:sdkMock}));
    const response=await page.goto(origin+'/index.html',{waitUntil:'domcontentloaded'});
    assert.equal(response.status(),200,mode.name+' index failed');
    await page.waitForFunction(()=>window.__qa?.messages.includes('game_ready'),{timeout:15000});
    assert.equal(await page.locator('#start').count(),1);
    assert.equal(await page.locator('#overlay').isVisible(),true);
    await page.locator('#start').click();
    await page.waitForFunction(()=>document.getElementById('overlay').hidden);
    const started=await page.evaluate(()=>window.__qa.messages.includes('level_started'));
    assert.equal(started,true,'start lifecycle absent');
    if(mode.isMobile) {
      const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
      assert.ok(dims.scroll<=dims.viewport+2,'horizontal overflow on mobile: '+JSON.stringify(dims));
      await page.locator('#rot').click();
      await page.locator('#drop').click();
    } else {
      await page.keyboard.press('Space');
    }
    assert.ok(Number((await page.locator('#score').textContent()).replace(/,/g,''))>0,'score never increased');
    await page.locator('#pause').click();
    assert.equal(await page.locator('#overTitle').textContent(),'PAUSED');
    await page.locator('#start').click();
    assert.equal(await page.locator('#overlay').isVisible(),false);
    await page.evaluate(()=>window.__qa.events.host_pause(true));
    await page.waitForFunction(()=>document.getElementById('overTitle').textContent==='PAUSED');
    await page.evaluate(()=>window.__qa.events.host_pause(false));
    await page.waitForFunction(()=>document.getElementById('overlay').hidden);
    assert.equal(errors.length,0,JSON.stringify(errors));
    console.log('PASS '+mode.name+' load/play/score/manual pause/host pause/resume');
    await context.close();
  }
  console.log('PASS all browser smoke tests (Playgama Bridge mocked; actual host integration still requires review)');
} finally {
  if(browser) await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
