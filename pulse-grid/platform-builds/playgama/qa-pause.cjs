// Isolated Playgama build lifecycle regression check; run: node qa-pause.cjs
// No network, SDK account, ad requests or browser storage required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
const ctx = new Proxy({}, {get(t, p) {return t[p] ?? (() => {});}, set(t,p,v) {t[p]=v;return true;}});
const els = {}, listeners = {}, hostListeners = {};
function element(id) {
  return els[id] ??= {
    id, hidden: false, textContent: '', style: {}, onclick: null,
    classList: {add(){},remove(){}}, getContext(){return ctx},
    setAttribute(){},addEventListener(){},appendChild(){}
  };
}
const doc = {
  hidden:false, getElementById:element,
  addEventListener(type, fn){listeners[type] = fn;}
};
const bridge = {
  EVENT_NAME: {PAUSE_STATE_CHANGED:'PAUSE_STATE_CHANGED', AUDIO_STATE_CHANGED:'AUDIO_STATE_CHANGED'},
  platform: {
    isAudioEnabled: true,
    sendMessage(){return Promise.resolve();},
    on(type, fn){hostListeners[type]=fn;}
  },
  advertisement: {isInterstitialSupported:false}
};
class SilentAudio {
  pause(){}
  play(){return Promise.resolve();}
}
const gameFactory = new Function(
  'window','document','bridge','Audio','performance','requestAnimationFrame',
  'cancelAnimationFrame','location','URL','URLSearchParams','navigator',
  'setTimeout','clearTimeout',
  source + '\nreturn {snapshot:()=>({active,paused,autoPaused,platformPauseActive}),start,pause};'
);
const game = gameFactory(
  {__PULSE_PG_SAVED:{}}, doc, bridge, SilentAudio, {now:()=>100},
  ()=>1,()=>{}, {href:'https://example.org/',search:''},
  URL,URLSearchParams,{},()=>1,()=>{}
);
let passed=0;
function check(name, expectation) {
  const actual=game.snapshot();
  for(const [key,value] of Object.entries(expectation))
    assert.equal(actual[key],value,name+' / '+key);
  passed++;
}
function hidden(value){doc.hidden=value;listeners.visibilitychange();}
function hostPaused(value){hostListeners.PAUSE_STATE_CHANGED(value);}
game.start(false); check('start', {active:true,paused:false});
hidden(true); check('background pauses', {active:true,paused:true,autoPaused:true});
hidden(false);check('visible resumes automatic pause',{paused:false,autoPaused:false});
game.pause(); hidden(true); hidden(false);
check('manual pause preserved',{paused:true,autoPaused:false});game.pause();
hostPaused(true);check('host pause',{paused:true,autoPaused:true,platformPauseActive:true});
hidden(true); hidden(false);
check('host pause holds through app visibility',{paused:true,platformPauseActive:true});
hostPaused(false);check('host release resumes',{paused:false,autoPaused:false});
hidden(true);hostPaused(true);hostPaused(false);
check('host release while hidden stays paused',{paused:true,autoPaused:true});
hidden(false);check('visible after host release resumes',{paused:false,autoPaused:false});
hostPaused(true);game.pause();
check('manual resume cannot override host pause',{paused:true,platformPauseActive:true});
console.log('Playgama pause lifecycle: '+passed+' checks passed');
