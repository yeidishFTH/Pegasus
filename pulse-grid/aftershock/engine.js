/* AFTERSHOCK — deterministic gameplay. No renderer, network or third-party code. */
(function(root){
'use strict';
const copy=o=>JSON.parse(JSON.stringify(o));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const LEVELS=[
 {name:['Wake-up call','קריאת השכמה'],note:['Borrow a body. Break the routine.','גוף חדש. דרך חדשה לברוח.'],par:6,start:{x:-5,z:6},exit:{x:5,z:-7},
  docks:[{x:-5,z:6,type:'spring'},{x:-4,z:1.6,type:'steel'}],
  walls:[{x:0,z:-1,w:14.6,d:.35,h:2.8,kind:'glass'}],holes:[],
  cells:[{x:-5,z:3.6},{x:-1,z:-3},{x:4.8,z:-4.5}],battery:null},
 {name:['A little attraction','משיכה קטנה'],note:['Some things are better pulled than pushed.','יש דברים שעדיף למשוך, לא לדחוף.'],par:9,start:{x:-5,z:6.5},exit:{x:5,z:-7},
  docks:[{x:-5,z:6.5,type:'spring'},{x:-5,z:1.4,type:'steel'},{x:4.4,z:-2.4,type:'magnet'}],
  walls:[{x:-5,z:3.8,w:4.2,d:.55,h:.9,kind:'rail'},{x:0,z:-.25,w:14.6,d:.35,h:2.8,kind:'glass'},
   {x:-4.5,z:-4.7,w:2.7,d:2.7,h:2.5,kind:'cage'}],
  holes:[{x:1,z:2.1,w:2.1,d:2.6}],
  cells:[{x:-5,z:1.4},{x:-4.5,z:-4.7,magnetic:true},{x:5,z:-5}],battery:null},
 {name:['Beautiful trouble','בלגן יפה'],note:['Break through. Or find your own way around.','לשבור את הדרך. או למצוא אחת משלך.'],par:11,start:{x:0,z:6.6},exit:{x:0,z:-7.2},
  docks:[{x:0,z:6.6,type:'spring'},{x:-5,z:2.3,type:'steel'},{x:5,z:2.3,type:'magnet'},{x:5.9,z:-2,type:'spring'},{x:-5.5,z:-3.7,type:'magnet'}],
  walls:[{x:0,z:3.7,w:3.5,d:.7,h:1,kind:'rail'},{x:0,z:-.6,w:3.1,d:1.3,h:2.9,kind:'solid'},
   {x:-3.9,z:-.6,w:4.6,d:.35,h:2.8,kind:'glass'},{x:3.9,z:-.6,w:4.6,d:.35,h:2.8,kind:'glass'},
   {x:-3,z:-5.2,w:2.5,d:2.5,h:2.5,kind:'cage'},{x:2.6,z:-4.2,w:2.2,d:.65,h:.9,kind:'rail'}],
  holes:[{x:0,z:1.2,w:2.1,d:1.7}],
  cells:[{x:-5.8,z:4.2},{x:-3,z:-5.2,magnetic:true},{x:5.3,z:-5.6}],battery:{x:-4.7,z:.65,r:1,spent:false}}
];
function create(level=0){const l=copy(LEVELS[clamp(level,0,2)]);return {level:clamp(level,0,2),...l,
 p:{...l.start,y:.55,vx:0,vz:0,vy:0,type:'spring',fall:0},checkpoint:{...l.start,type:'spring'},
 walls:l.walls.map(w=>({...w,broken:false})),cells:l.cells.map(c=>({...c,taken:false})),moves:0,falls:0,elapsed:0,won:false,lastDock:0,events:[],undo:null};}
function snapshot(s){const x=copy(s);x.undo=null;x.events=[];return x;}
function undo(s){if(!s.undo)return false;const saved=copy(s.undo);Object.keys(s).forEach(k=>delete s[k]);Object.assign(s,saved,{undo:null,events:[{kind:'undo'}]});return true;}
function launch(s,dx,dz){if(s.won||s.p.fall)return false;const n=Math.hypot(dx,dz);if(n<.16)return false;s.undo=snapshot(s);const speed=clamp(n,1.5,16);s.p.vx=dx/n*speed;s.p.vz=dz/n*speed;
 s.p.vy=s.p.type==='spring'?7.7:2.1;s.moves++;s.events.push({kind:'launch',type:s.p.type});return true;}
function contact(p,w){const qx=clamp(p.x,w.x-w.w/2,w.x+w.w/2),qz=clamp(p.z,w.z-w.d/2,w.z+w.d/2);let dx=p.x-qx,dz=p.z-qz,n=Math.hypot(dx,dz);
 if(n>=.53)return null;if(n<.0001){const edges=[{v:Math.abs(p.x-(w.x-w.w/2)),x:-1,z:0},{v:Math.abs(p.x-(w.x+w.w/2)),x:1,z:0},{v:Math.abs(p.z-(w.z-w.d/2)),x:0,z:-1},{v:Math.abs(p.z-(w.z+w.d/2)),x:0,z:1}].sort((a,b)=>a.v-b.v);return {x:edges[0].x,z:edges[0].z,push:.53+edges[0].v};}
 return{x:dx/n,z:dz/n,push:.53-n};}
function breakWall(s,w){w.broken=true;s.events.push({kind:'break',x:w.x,z:w.z,w:w.w,d:w.d,h:w.h});}
function step(s,dt){if(s.won||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.025);s.elapsed+=dt;const p=s.p;
 if(p.fall){p.fall+=dt;p.y-=dt*5;if(p.fall>.6){Object.assign(p,{x:s.checkpoint.x,z:s.checkpoint.z,type:s.checkpoint.type,y:.55,vx:0,vz:0,vy:0,fall:0});s.falls++;s.events.push({kind:'respawn'});}return;}
 p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt;p.vy-=17.5*dt;
 if(p.y<.55){if(p.vy<-3)s.events.push({kind:'land',force:-p.vy,x:p.x,z:p.z});p.y=.55;p.vy=0;}
 const damping=Math.exp(-(p.y>.57?.18:2.2)*dt);p.vx*=damping;p.vz*=damping;
 if(Math.hypot(p.vx,p.vz)<.1){p.vx=0;p.vz=0;}
 for(const axis of ['x','z']){const lim=axis==='x'?7.18:8.18;if(Math.abs(p[axis])>lim){p[axis]=clamp(p[axis],-lim,lim);p['v'+axis]*=-.55;s.events.push({kind:'bump'});}}
 for(const w of s.walls){if(w.broken||p.y-.50>w.h)continue;const hit=contact(p,w);if(!hit)continue;
  if(w.kind==='glass'&&p.type==='steel'&&Math.hypot(p.vx,p.vz)>2.4){breakWall(s,w);p.vx*=.82;p.vz*=.82;continue;}
  p.x+=hit.x*hit.push;p.z+=hit.z*hit.push;const v=p.vx*hit.x+p.vz*hit.z;if(v<0){p.vx-=1.55*v*hit.x;p.vz-=1.55*v*hit.z;if(v<-1.1)s.events.push({kind:'bump',glass:w.kind==='glass'});}}
 const b=s.battery;if(b&&!b.spent&&dist(p,b)<1&&p.y<1.8&&p.type==='steel'&&Math.hypot(p.vx,p.vz)>2){b.spent=true;s.events.push({kind:'pulse',x:b.x,z:b.z});for(const w of s.walls)if(w.kind==='glass'&&!w.broken&&dist(w,b)<10)breakWall(s,w);}
 for(const h of s.holes)if(p.y<.65&&Math.abs(p.x-h.x)<h.w/2-.1&&Math.abs(p.z-h.z)<h.d/2-.1){p.fall=.001;s.events.push({kind:'fall'});return;}
 for(let i=0;i<s.docks.length;i++){const d=s.docks[i];if(dist(p,d)<.92&&p.y<1.05&&s.lastDock!==i){const prev=p.type;p.type=d.type;s.checkpoint={x:d.x,z:d.z,type:d.type};s.lastDock=i;if(prev!==d.type)s.events.push({kind:'swap',type:d.type,x:p.x,z:p.z});}}
 if(s.lastDock!==null&&dist(p,s.docks[s.lastDock])>1.65)s.lastDock=null;
 for(const c of s.cells){if(c.taken)continue;let d=dist(p,c);if(p.type==='magnet'&&d<4){const k=Math.min(1,dt*(c.magnetic?4.2:3.2));c.x+=(p.x-c.x)*k;c.z+=(p.z-c.z)*k;d=dist(p,c);}
  if(d<.8&&p.y<2.2&&(!c.magnetic||p.type==='magnet')){c.taken=true;s.events.push({kind:'collect',x:c.x,z:c.z});}}
 if(s.cells.every(c=>c.taken)&&dist(p,s.exit)<1.1&&p.y<1.15){s.won=true;p.vx=p.vz=p.vy=0;s.events.push({kind:'win'});}}
function advance(s,seconds){for(let t=0;t<seconds;t+=1/120)step(s,1/120);return s;}
root.AftershockCore={LEVELS,create,step,launch,undo,advance,snapshot,clamp,dist};
})(typeof window!=='undefined'?window:globalThis);
