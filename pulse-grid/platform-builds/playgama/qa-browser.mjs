// Real Chromium UI smoke for the isolated Playgama build; host SDK is explicitly mocked.
// The mock intentionally rejects game_ready to catch unhandled SDK promises without blocking free gameplay.
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
window.__qa={messages:[],events:{},writes:[],adPlacements:[]};
window.bridge={
 initialize:async()=>true,
 EVENT_NAME:{PAUSE_STATE_CHANGED:'host_pause', AUDIO_STATE_CHANGED:'host_audio'},
 platform:{language:'en',isAudioEnabled:true,sendMessage:function(s){window.__qa.messages.push(s);return s==='game_ready' ? Promise.reject(new Error('QA-only host readiness rejection')) : Promise.resolve()},on:function(evt,handler){window.__qa.events[evt]=handler}},
 storage:{get:async keys=>keys.map(()=>null),set:async(keys,values)=>{window.__qa.writes.push({keys,values})}},
 advertisement:{isInterstitialSupported:false,showInterstitial:async(placement)=>{window.__qa.adPlacements.push(placement);throw new Error('QA-only simulated ad no-fill');}}
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
    // Release gate: every compressed sound must be present locally in the ZIP.
    // Read content through the same HTTP server used by Chromium; no external audio.
    const assets=await page.evaluate(async()=>{
      const tracks=['bong_001','click_002','confirmation_001','error_004','maximize_003','minimize_004','music-loop'];
      return Promise.all(tracks.flatMap(t=>['ogg','mp3'].map(ext=>'/audio/'+t+'.'+ext)).map(async path=>{
        const response=await fetch(path);
        return {path,status:response.status,size:(await response.arrayBuffer()).byteLength};
      }));
    });
    assert.equal(assets.length,14);
    assert.ok(assets.every(a=>a.status===200&&a.size>256),mode.name+' missing sound asset: '+JSON.stringify(assets));
    assert.equal(await page.locator('#soundToggle').getAttribute('aria-pressed'),'false','sound must default OFF');
    assert.equal(await page.locator('#overlay').isVisible(),true);
    await page.locator('#start').click();
    await page.waitForFunction(()=>document.getElementById('overlay').hidden);
    // Audio is opt-in. Verify that the host can mute it during platform events
    // and that the player can turn it back off without leaving audio playing.
    await page.locator('#soundToggle').click();
    assert.equal(await page.locator('#soundToggle').getAttribute('aria-pressed'),'true');
    await page.waitForFunction(()=>typeof musicTrack!=='undefined'&&musicTrack!==null);
    const audioInfo=await page.evaluate(()=>({
      cueCount:soundPlayers.size,
      local:[musicTrack,...soundPlayers.values()].every(a=>new URL(a.src).origin===location.origin),
      formats:[musicTrack,...soundPlayers.values()].map(a=>new URL(a.src).pathname.split('.').pop())
    }));
    assert.equal(audioInfo.cueCount,6);
    assert.equal(audioInfo.local,true,'audio URL leaked to external origin');
    assert.ok(audioInfo.formats.every(ext=>ext==='ogg'||ext==='mp3'));
    await page.evaluate(()=>window.__qa.events.host_audio(false));
    assert.equal(await page.evaluate(()=>[musicTrack,...soundPlayers.values()].every(a=>a.paused)),true,'host mute must pause all game audio');
    await page.evaluate(()=>window.__qa.events.host_audio(true));
    await page.locator('#soundToggle').click();
    assert.equal(await page.locator('#soundToggle').getAttribute('aria-pressed'),'false','player mute failed');
    assert.equal(await page.evaluate(()=>[musicTrack,...soundPlayers.values()].every(a=>a.paused)),true,'player mute must pause all game audio');
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
    // Revenue-share gate: request an interstitial only at game over when the
    // host supports it. A rejected/no-fill ad must never trap the player.
    const adSupported = mode.name === 'desktop';
    await page.evaluate(supported => { bridge.advertisement.isInterstitialSupported = supported; }, adSupported);
    await page.evaluate(() => end()); // Deterministically reach game over after a valid gameplay start.
    await page.waitForFunction(() => document.getElementById('overTitle').textContent === 'GAME OVER');
    const ads = await page.evaluate(() => window.__qa.adPlacements);
    assert.deepEqual(ads, adSupported ? ['game_over'] : [], mode.name+' incorrect interstitial placement/support handling');
    await page.locator('#start').click();
    await page.waitForFunction(() => active && document.getElementById('overlay').hidden);
    assert.equal(await page.evaluate(() => window.__qa.messages.filter(x => x === 'level_started').length), 2, 'no-fill ad blocked replay');
    await page.waitForTimeout(50); // Give the simulated rejected Promise a turn to surface unhandled errors.
    assert.equal(errors.length,0,JSON.stringify(errors));
    console.log('PASS '+mode.name+' load/play/score/pause/host events/game-over ad no-fill/replay');
    await context.close();
  }
  console.log('PASS all browser smoke tests (Playgama Bridge mocked; actual host integration still requires review)');
} finally {
  if(browser) await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
