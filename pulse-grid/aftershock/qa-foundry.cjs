'use strict';
// Regression gate for the standalone AFTERSHOCK FOUNDRY six-room physics build.
// Test the actual embedded simulation source rather than the older four-room modular prototype.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, 'foundry.html'), 'utf8');
const marker = 'Deterministic planar + ballistic simulation, fixed 120Hz step.';
const markerAt = html.indexOf(marker);
assert.ok(markerAt !== -1, 'Foundry simulation marker was removed');
const open = html.lastIndexOf('<script>', markerAt);
const close = html.indexOf('</script>', markerAt);
assert.ok(open >= 0 && close > open, 'Could not isolate the standalone physics script');
const sandbox = { module: { exports: {} } };
vm.runInNewContext(html.slice(open + '<script>'.length, close), sandbox,
  { filename: 'foundry-physics.js', timeout: 5000 });
const { Phys, LEVELS, TYPES } = sandbox.module.exports;
assert.ok(Phys && LEVELS && TYPES, 'Physics module must export its actual game model');
assert.equal(LEVELS.length, 6, 'Publisher advertises six real selectable rooms');
assert.equal(new Set(LEVELS.map(l => l.id)).size, 6, 'Room IDs must be unique');

function checkFinite(s) {
  for (const o of [...s.bodies, ...s.crates]) {
    for (const key of ['x','z','vx','vz'])
      assert.ok(Number.isFinite(o[key]), 'Non-finite ' + key + ' in room ' + (s.index + 1));
  }
}
for (const [i, level] of LEVELS.entries()) {
  assert.equal(level.bodies.length, 3, 'Room ' + (i+1) + ' must have three playable bodies');
  assert.equal(level.bodies.map(x => x[0]).join(','), 'spring,steel,magnet',
    'Room ' + (i+1) + ' missing body type');
  assert.equal(level.cores.length, 3, 'Room ' + (i+1) + ' must have three objective cores');
  assert.equal(level.exit.length, 2);
  const s = Phys.create(i);
  assert.equal(s.complete, false);
  assert.equal(s.cores.filter(c => c.collected).length, 0);
  assert.equal(s.shots, 0);
  assert.equal(Phys.shoot(s, NaN, 0), false, 'Invalid aim must not produce a shot');
  assert.equal(Phys.shoot(s, 0.01, 0.02), false, 'Tiny canceled drags must not count');
  assert.equal(s.shots, 0);
  for (let k=0; k<120; k++) Phys.step(s, 1/120);
  checkFinite(s);
  assert.equal(s.complete, false, 'Stationary start must not auto-complete room ' + (i+1));
  const copy = Phys.clone(s);
  copy.cores[0].collected = true;
  assert.equal(s.cores[0].collected, false, 'Undo/snapshot clones must be independent');
}
{
  const s = Phys.create(3), sw=s.switches.find(x=>x.weight), crate=s.crates.find(x=>x.ferrous);
  assert.ok(sw && crate, 'Room 4 must have a physical iron weight and brass socket');
  assert.equal(s.gateOpen, false);
  crate.x=sw.x; crate.z=sw.z; crate.vx=crate.vz=0;
  Phys.step(s, 1/120);
  assert.equal(sw.on, true, 'Physical weight on socket must activate it');
  assert.equal(s.gateOpen, true, 'Socket must power the room 4 bridge');
  for(let i=0;i<120;i++) Phys.step(s, 1/120);
  assert.ok(s.bridge.open > .9, 'Bridge must physically lower over time');
}
{
  const s=Phys.create(4);
  assert.ok(LEVELS[4].conveyors?.length, 'Room 5 must have a conveyor mechanism');
  const belt=LEVELS[4].conveyors[0], crate=s.crates.find(x=>x.ferrous);
  assert.ok(crate);
  crate.x=belt.x; crate.z=belt.z; crate.vx=crate.vz=0;
  Phys.step(s, 1/120);
  assert.ok(crate.vz < 0, 'Conveyor must exert a real force on an iron weight');
}
{
  const s=Phys.create(5);
  assert.equal(LEVELS[5].physicalChain, true);
  assert.equal(s.gateOpen, false, 'Domino gate starts closed');
  const first=s.dominoes[0], steel=s.bodies.find(b=>b.type==='steel');
  assert.ok(first && steel);
  steel.x=first.x; steel.z=first.z+.55; steel.y=0; steel.vx=0; steel.vz=-9; steel.vy=0;
  for(let i=0;i<540;i++) Phys.step(s, 1/120);
  assert.ok(s.dominoes.some(d=>d.fall>.25), 'Physical collision must topple at least one domino');
  assert.ok(s.dominoes.filter(d=>d.fall>.25).length>1, 'Falling dominoes must transmit a chain reaction');
  assert.equal(s.chainTriggered, true, 'Falling domino chain must reach the physical relay');
  assert.equal(s.gateOpen, true, 'Relay must unlock the room 6 gate');
  checkFinite(s);
}
console.log('PASS AFTERSHOCK FOUNDRY: 6-room simulation + steel, magnet bridge, conveyor, domino chain and no auto-win');

 
// Execute the real share handler in a mobile-browser mock. Sharing is always
// initiated by the player's button, never by page load or an automated post.
async function testSharing() {
  const begin=html.indexOf('async function shareResult(){');
  const end=html.indexOf('\nfunction processEvents()',begin);
  assert.ok(begin>=0 && end>begin,'AFTERSHOCK share handler must exist');
  const shareScript=html.slice(begin,end)+'\nshareResult()';
  function fixture(lang, shareMode) {
    const observed={shared:null,copied:null,toasts:[]};
    const nav={
      clipboard:{async writeText(value){observed.copied=value;}}
    };
    if(shareMode!=='unavailable')nav.share=async value=>{
      if(shareMode==='cancel')throw Object.assign(new Error('User dismissed share'),{name:'AbortError'});
      if(shareMode==='blocked')throw new Error('Web Share not permitted');
      observed.shared=value;
    };
    const ctx={
      navigator:nav,location:{protocol:'https:',origin:'https://pulse-grid-arcade.onrender.com',pathname:'/aftershock/foundry.html'},
      settings:{lang},state:{index:1,shots:7,bonus:{collected:true}},
      LEVELS,score:()=>3,t:key=>key,toast:value=>observed.toasts.push(value)
    };
    return {observed,execute:()=>vm.runInNewContext(shareScript,ctx,{timeout:1500})};
  }
  const english=fixture('en','success');await english.execute();
  assert.match(english.observed.shared.text,/7 launches/);
  assert.match(english.observed.shared.text,/secret spark found/);
  assert.ok(english.observed.shared.title.includes(LEVELS[1].name[0]));
  assert.equal(english.observed.shared.url,'https://pulse-grid-arcade.onrender.com/aftershock/foundry.html?room=2');
  assert.equal(english.observed.copied,null,'Successful native share must not also copy');
  const hebrew=fixture('he','success');await hebrew.execute();
  assert.ok(hebrew.observed.shared.text.includes(LEVELS[1].name[1]),'Hebrew share must name the actual room in Hebrew');
  assert.match(hebrew.observed.shared.text,/7 שיגורים/);
  const desktop=fixture('en','unavailable');await desktop.execute();
  assert.match(desktop.observed.copied,/\?room=2/);
  assert.deepEqual(desktop.observed.toasts,['copied']);
  const canceled=fixture('en','cancel');await canceled.execute();
  assert.equal(canceled.observed.copied,null,'Canceling share must not force clipboard');
  assert.deepEqual(canceled.observed.toasts,[]);
  const blocked=fixture('he','blocked');await blocked.execute();
  assert.match(blocked.observed.copied,/7 שיגורים/,'Rejected native sharing should fall back to copy');
  assert.ok(html.includes('playable six-room browser prologue'));
  assert.ok(html.includes('פרולוג משחקי בן שש זירות'));
  console.log('PASS AFTERSHOCK result sharing: bilingual native share, user cancellation and clipboard fallback');
}
testSharing().catch(error=>{console.error(error);process.exitCode=1;});
