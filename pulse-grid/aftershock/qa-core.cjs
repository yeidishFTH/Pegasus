const assert=require('node:assert/strict');
require('./engine.js');
const C=globalThis.AftershockCore;
const results=[];
function test(name,fn){fn();results.push({name,status:'PASS'});}
function fireTo(s,x,z,type){let best=null;const base=Math.atan2(z-s.p.z,x-s.p.x);
 for(let a=-2;a<=2;a++)for(let v=1.5;v<=16;v+=.075){const angle=base+a*.025,dx=Math.cos(angle)*v,dz=Math.sin(angle)*v,q=C.snapshot(s);C.launch(q,dx,dz);C.advance(q,4.2);const cost=Math.hypot(q.p.x-x,q.p.z-z)+(q.falls>s.falls?40:0)+(type&&q.p.type!==type?8:0);if(!best||cost<best.cost)best={cost,dx,dz,p:q.p};}
 C.launch(s,best.dx,best.dz);C.advance(s,4.2);s.events=[];return {dx:best.dx,dz:best.dz,at:[s.p.x,s.p.z],type:s.p.type,cost:best.cost};}

test('Clockwork Shift has a movable crate and pressure switch',()=>{
 const s=C.create(3);assert.equal(C.LEVELS.length,4);assert.equal(s.crates.length,1);assert.equal(s.plates.length,1);
 assert.ok(s.walls.some(w=>w.kind==='force'&&!w.broken));
});
test('Steel impacts move physical crates and emit impact event',()=>{
 const s=C.create(3),c=s.crates[0];s.p={...s.p,x:c.x-1.2,z:c.z,type:'steel',vx:9,vz:0,vy:0,y:.55};
 const before=c.x;C.advance(s,.3);assert.ok(c.x>before+.2,JSON.stringify(c));assert.ok(s.events.some(e=>e.kind==='crateHit'));
});
test('FLUX pulls steel crates with continuous force',()=>{
 const s=C.create(3),c=s.crates[0];s.p={...s.p,x:0,z:1,type:'magnet',vx:0,vz:0,vy:0,y:.55};
 const before=C.dist(c,s.p);C.advance(s,.3);assert.ok(C.dist(c,s.p)<before-.05,JSON.stringify(c));
});
test('Pressure switch unlocks central gate and latches',()=>{
 const s=C.create(3),c=s.crates[0],p=s.plates[0];c.x=p.x;c.z=p.z;
 C.step(s,1/120);assert.equal(p.active,true);assert.equal(s.walls.find(w=>w.kind==='force').broken,true);
 c.x=4;c.z=1;C.advance(s,.25);assert.equal(p.active,true);assert.ok(s.events.some(e=>e.kind==='unlock'));
});
test('Undo restores both movable crate and switch state',()=>{
 const s=C.create(3);C.launch(s,3,-3);s.crates[0].x=s.plates[0].x;s.crates[0].z=s.plates[0].z;
 C.step(s,1/120);assert.equal(s.plates[0].active,true);assert.equal(C.undo(s),true);
 assert.equal(s.plates[0].active,false);assert.equal(s.walls.find(w=>w.kind==='force').broken,false);
});
const traces=[];
for(let level=0;level<3;level++)test(`Room ${level+1} completes through real launches, no teleportation`,()=>{const s=C.create(level),path=level===0?[[-5,3.6],[-4,1.6,'steel'],[-1,-3],[4.8,-4.5],[5,-7]]:level===1?[[-5,1.4,'steel'],[0,-2],[4.4,-2.4,'magnet'],[-2,-4.7,'magnet'],[5,-5],[5,-7]]:[[-5.8,4.2],[-5,2.3,'steel'],[-4.7,-2.8],[-5.5,-3.7,'magnet'],[-5.4,-2.6],[4.6,-2.5],[5.3,-5.6],[0,-7.2]];const trace=[];for(const [x,z,type]of path)trace.push(fireTo(s,x,z,type));traces.push({level,trace,moves:s.moves,won:s.won,falls:s.falls,cells:s.cells});assert.equal(s.won,true,JSON.stringify(traces.at(-1)));assert.equal(s.falls,0);});
test('Room 3 alternative route completes without breaking glass',()=>{const s=C.create(2),trace=[];for(const [x,z,type]of[[-5.8,4.2],[5,2.3,'magnet'],[7.05,1],[7.05,-2.7],[5.3,-5.6],[5,-7.1],[0,-7.2]])trace.push(fireTo(s,x,z,type));traces.push({level:2,alternative:true,trace,moves:s.moves,won:s.won,walls:s.walls});assert.equal(s.won,true,JSON.stringify(traces.at(-1)));assert.ok(s.walls.filter(w=>w.kind==='glass').every(w=>!w.broken));});
test('Spring cannot break glass',()=>{let s=C.create(0);C.launch(s,0,-16);C.advance(s,3);assert.equal(s.walls[0].broken,false);});
test('Steel cannot break glass at negligible speed',()=>{let s=C.create(0);s.p={...s.p,x:0,z:-.4,type:'steel',vx:0,vz:-.2};C.advance(s,.5);assert.equal(s.walls[0].broken,false);});
test('Magnet recovers caged energy without moving through the cage',()=>{let s=C.create(1);s.p={...s.p,x:-2,z:-4.7,type:'magnet'};C.advance(s,2);assert.equal(s.cells[1].taken,true);assert.ok(s.p.x>-3.1);});
test('Non-magnet cannot collect a magnetic energy cell',()=>{let s=C.create(1);s.walls=[];s.p={...s.p,x:-4.5,z:-4.7,type:'spring'};C.advance(s,1);assert.equal(s.cells[1].taken,false);});
test('Undo restores position, moves, cells, and glass',()=>{const s=C.create(0);s.p={...s.p,x:0,z:1,type:'steel'};const before=C.snapshot(s);C.launch(s,0,-12);C.advance(s,3);assert.ok(s.walls[0].broken);assert.equal(C.undo(s),true);assert.deepEqual(s.p,before.p);assert.equal(s.moves,before.moves);assert.deepEqual(s.cells,before.cells);assert.deepEqual(s.walls,before.walls);assert.equal(C.undo(s),false);});
test('Pit returns to checkpoint without destroying recovered sparks',()=>{const s=C.create(1);s.cells[0].taken=true;s.p={...s.p,x:1,z:2.1};C.advance(s,1);assert.equal(s.falls,1);assert.equal(s.p.x,s.checkpoint.x);assert.equal(s.cells[0].taken,true);});
test('Exit cannot finish before all three cells are recovered',()=>{const s=C.create(0);s.p.x=s.exit.x;s.p.z=s.exit.z;C.advance(s,1);assert.equal(s.won,false);});
test('Launch count does not increment for canceled tiny drags',()=>{const s=C.create(0);assert.equal(C.launch(s,.01,.01),false);assert.equal(s.moves,0);});
test('Randomized launch stress stays finite and inside arena bounds',()=>{let seed=191;const rnd=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);for(let l=0;l<3;l++){const s=C.create(l);for(let k=0;k<150;k++){C.launch(s,(rnd()-.5)*40,(rnd()-.5)*40);C.advance(s,1);for(const n of['x','y','z','vx','vy','vz'])assert.ok(Number.isFinite(s.p[n]));assert.ok(Math.abs(s.p.x)<=7.19);assert.ok(Math.abs(s.p.z)<=8.19);s.events=[];}}});
test('Clockwork Room 4 completes via real player launches without using the pressure-plate shortcut',()=>{
 const s=C.create(3);
 const shots=[[-4.26,-3.51],[.39,-3.26],[4.51,-.66],[9.36,.03],[-1.17,-7.67],[6.54,1.87],[.34,-1.97],[-11.11,1.94],[0,-3.5]];
 for(const [dx,dz] of shots){assert.equal(C.launch(s,dx,dz),true);C.advance(s,3.7);s.events=[];}
 assert.equal(s.won,true,'Room 4 must be winnable by normal launches');
 assert.equal(s.falls,0);
 assert.ok(s.cells.every(c=>c.taken));
 assert.equal(s.walls.find(w=>w.kind==='force').broken,false,'Outer route must remain a valid alternate solution');
});
require('node:fs').writeFileSync(require('node:path').join(__dirname,'qa-core-results.json'),JSON.stringify({results,traces},null,2));console.log(JSON.stringify({tests:results.length,results,solutions:traces.map(t=>({room:t.level+1,alternative:!!t.alternative,moves:t.moves,won:t.won}))},null,2));
