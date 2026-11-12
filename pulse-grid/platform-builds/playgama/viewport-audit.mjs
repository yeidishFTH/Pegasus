// Diagnostic, isolated review build only. This does not publish or approve a game.
// Playgama's technical requirements 1.6.1–1.6.8 require a scroll-free
// viewport, visible playfield and controls across supported aspect ratios.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright-core';
const root = resolve('pulse-grid/platform-builds/playgama');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const server=createServer(async (req,res)=>{
  try{
    const path=resolve(root,'.'+new URL(req.url,'http://local.test').pathname);
    if(path!==root&&!path.startsWith(root+'/')){res.writeHead(403).end();return;}
    const bytes=await readFile(path);
    res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream'}).end(bytes);
  }catch{res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base='http://127.0.0.1:'+server.address().port;
const sdkMock="window.bridge={initialize:async()=>true,EVENT_NAME:{PAUSE_STATE_CHANGED:'host_pause',AUDIO_STATE_CHANGED:'host_audio'},platform:{language:'en',isAudioEnabled:true,sendMessage:async()=>{},on:()=>{}},storage:{get:async k=>k.map(()=>null),set:async()=>{}},advertisement:{isInterstitialSupported:false,showInterstitial:async()=>{}}};";
const sizes=[
  ['portrait-390',390,844,true],
  ['compact-320',320,568,true],
  ['square-640',640,640,true],
  ['landscape-844',844,390,true],
  ['desktop-1280',1280,800,false]
];
let browser;
const issues=[];
try{
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
  for(const [name,width,height,isMobile] of sizes){
    const context=await browser.newContext({viewport:{width,height},isMobile,hasTouch:isMobile});
    const page=await context.newPage();
    await page.route('https://bridge.playgama.com/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:sdkMock}));
    const response=await page.goto(base+'/index.html',{waitUntil:'domcontentloaded'});
    if(response.status()!==200)throw Error(name+' failed to load');
    await page.locator('#start').waitFor({timeout:15000});
    await page.locator('#start').click();
    await page.waitForFunction(()=>document.getElementById('overlay').hidden);
    const result=await page.evaluate(()=>{
      const rect=(selector)=>{
        const el=document.querySelector(selector);
        if(!el)return null;
        const r=el.getBoundingClientRect();
        return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),
        visible:!!(r.width&&r.height),fits:r.left>=-2&&r.top>=-2&&r.right<=innerWidth+2&&r.bottom<=innerHeight+2};
      };
      return {window:[innerWidth,innerHeight],document:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],
        overflowX:document.documentElement.scrollWidth>innerWidth+2,
        overflowY:document.documentElement.scrollHeight>innerHeight+2,
        board:rect('#board'),controls:rect('.controls'),pause:rect('#pause'),sound:rect('#soundToggle')};
    });
    console.log('VIEWPORT '+name+' '+JSON.stringify(result));
    if(result.overflowX||result.overflowY||!result.board?.fits||!result.pause?.fits||!result.sound?.fits||
      (isMobile&&(!result.controls?.visible||!result.controls?.fits))){
      issues.push(name);
    }
    await context.close();
  }
  if(issues.length)console.log('LAYOUT_REVIEW_REQUIRED '+issues.join(',')+'; no submission or approval');
  else console.log('LAYOUT_PRECHECK_PASS (mock SDK; real device still required)');
  if(process.env.STRICT_LAYOUT==='1'&&issues.length)process.exitCode=1;
}finally{
  if(browser)await browser.close();
  await new Promise(done=>server.close(done));
}
