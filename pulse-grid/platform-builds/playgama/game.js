// Local scores are optional: keep the game playable in private browsing and
// storage-restricted environments (no account or server-side storage).
function storageGet(key){return window.__PULSE_PG_SAVED?.[key]??null}
function sendLifecycle(event){try{Promise.resolve(bridge.platform.sendMessage(event)).catch(()=>{});}catch(e){}}
function storageSet(key,value){window.__PULSE_PG_SAVED[key]=String(value);Promise.resolve(bridge.storage.set([key],[String(value)])).catch(()=>{})}
const W=10,H=20,C=32,cv=document.getElementById('board'),cx=cv.getContext('2d'),nc=document.getElementById('next'),nx=nc.getContext('2d');
const shapes=[[[1,1,1,1]],[[1,1],[1,1]],[[0,1,0],[1,1,1]],[[0,1,1],[1,1,0]],[[1,1,0],[0,1,1]],[[1,0,0],[1,1,1]],[[0,0,1],[1,1,1]]];
const palette=['#47e8f0','#fff181','#c78fff','#6df9ba','#ff789a','#76a8ff','#ffb46c'];let grid=[],cur=null,next=null,stored=-1,heldUsed=false,bag=[],score=0,lines=0,level=1,active=false,paused=false,dailyMode=false,seed=0,last=0,acc=0,raf=0,best=Number(storageGet('pulsegrid-best')||0);document.getElementById('best').textContent=best.toLocaleString();const $=id=>document.getElementById(id);
function random(){if(!dailyMode)return Math.random();seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296}
function refill(){bag=[0,1,2,3,4,5,6];for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]]}}
function take(){if(!bag.length)refill();const k=bag.pop();return {k,m:shapes[k].map(r=>[...r]),x:3,y:-1}}
function coll(p,dx=0,dy=0,m=p.m){return m.some((row,y)=>row.some((v,x)=>v && (p.x+x+dx<0||p.x+x+dx>=W||p.y+y+dy>=H||(p.y+y+dy>=0&&grid[p.y+y+dy]?.[p.x+x+dx]>=0))))}
function newPiece(){cur=next||take();next=take();cur.x=Math.floor((W-cur.m[0].length)/2);cur.y=-1;heldUsed=false;if(coll(cur)){end()}paintNext()}
function rotate(){if(!active||paused)return;const m=cur.m[0].map((_,i)=>cur.m.map(row=>row[i]).reverse());for(const dx of [0,-1,1,-2,2])if(!coll(cur,dx,0,m)){cur.x+=dx;cur.m=m;soundCue("rotate");return}}
function move(dx){if(active&&!paused&&!coll(cur,dx))cur.x+=dx}
function step(){if(!coll(cur,0,1)){cur.y++;return}lock()}


// Optional, independently synthesized sound effects; off by default.
// No audio is downloaded and AudioContext is created only on user action.
let soundEnabled=false,soundContext=null;
function shortTone(freq,duration=.07,type='sine',volume=.017,delay=0){
 if(!soundEnabled||!soundContext||!window.__PULSE_PG_AUDIO_ALLOWED)return;
 try{
  const at=soundContext.currentTime+delay;
  const oscillator=soundContext.createOscillator();
  const amp=soundContext.createGain();
  oscillator.type=type;
  oscillator.frequency.setValueAtTime(freq,at);
  amp.gain.setValueAtTime(Math.max(.001,volume),at);
  amp.gain.exponentialRampToValueAtTime(.001,at+duration);
  oscillator.connect(amp);amp.connect(soundContext.destination);
  oscillator.start(at);oscillator.stop(at+duration+.02);
 }catch(e){}
}
function soundCue(cue,strength=1){
 if(!soundEnabled)return;
 if(cue==='rotate')shortTone(520,.045,'sine',.012);
 else if(cue==='land')shortTone(155,.04,'triangle',.012);
 else if(cue==='hold')shortTone(380,.065,'sine',.014);
 else if(cue==='start'){shortTone(440,.06,'sine',.02);shortTone(660,.08,'sine',.018,.085);}
 else if(cue==='clear'){
   const notes=[523.25,659.26,783.99,1046.5];
   for(let i=0;i<Math.min(4,strength+1);i++)shortTone(notes[i],.12,'sine',.023,.055*i);
 }
 else if(cue==='end'){shortTone(370,.1,'sine',.016);shortTone(294,.13,'sine',.014,.11);}
}
function showSoundState(){
 const button=$('soundToggle');button.textContent=soundEnabled?'🔊 SOUND ON':'🔇 SOUND OFF';
 button.setAttribute('aria-pressed',String(soundEnabled));
 button.setAttribute('aria-label',soundEnabled?'Disable game sound effects':'Enable optional game sound effects');
}
function toggleSound(){if(!window.__PULSE_PG_AUDIO_ALLOWED){flash('AUDIO DISABLED BY PLATFORM');return;}
 if(soundEnabled){
  soundEnabled=false;
  if(soundContext?.suspend)Promise.resolve(soundContext.suspend()).catch(()=>{});
  showSoundState();return;
 }
 const Constructor=window.AudioContext||window.webkitAudioContext;
 if(!Constructor){flash('SOUND NOT AVAILABLE');return;}
 try{
  if(!soundContext)soundContext=new Constructor();
  const started=soundContext.resume?.();
  soundEnabled=true;showSoundState();
  if(started&&typeof started.catch==='function')started.catch(()=>{soundEnabled=false;showSoundState()});
  soundCue('start');
 }catch(e){soundEnabled=false;showSoundState();flash('SOUND NOT AVAILABLE');}
}

function celebrateClear(rows){
 if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const stage=$('clearEffects');if(!stage)return;
 const max=Math.min(10+rows*5,30);
 for(let i=0;i<max;i++){
  const particle=document.createElement('span');particle.className='clear-particle';
  particle.style.setProperty('--dx',(Math.random()*280-140).toFixed(0)+'px');
  particle.style.setProperty('--dy',(Math.random()*230-150).toFixed(0)+'px');
  particle.style.setProperty('--rot',(Math.random()*650-325).toFixed(0)+'deg');
  particle.style.setProperty('--color',palette[Math.floor(Math.random()*palette.length)]);
  particle.style.animationDelay=(Math.random()*.12).toFixed(2)+'s';
  particle.addEventListener('animationend',()=>particle.remove(),{once:true});
  stage.appendChild(particle);
 }
 const scoreView=$('score');scoreView.classList.remove('score-pop');
 void scoreView.offsetWidth;scoreView.classList.add('score-pop');
 scoreView.addEventListener('animationend',()=>scoreView.classList.remove('score-pop'),{once:true});
}

function lock(){cur.m.forEach((row,y)=>row.forEach((v,x)=>{if(v&&cur.y+y>=0)grid[cur.y+y][cur.x+x]=cur.k}));let count=0;for(let y=H-1;y>=0;){if(grid[y].every(v=>v>=0)){grid.splice(y,1);grid.unshift(Array(W).fill(-1));count++}else y--}if(count){lines+=count;score+=[0,100,300,500,800][count]*level;level=1+Math.floor(lines/10);flash(count===4?'QUAD CLEAR!':count+' LINE'+(count>1?'S':''));celebrateClear(count);soundCue('clear',count)}else soundCue('land');newPiece();update()}
function drop(){if(!active||paused)return;let n=0;while(!coll(cur,0,1)){cur.y++;n++}score+=n*2;lock()}
function soft(){if(!active||paused)return;if(!coll(cur,0,1)){cur.y++;score++;update()}else lock()}
function hold(){if(!active||paused||heldUsed)return;const old=cur.k;if(stored<0){stored=old;newPiece()}else{cur={k:stored,m:shapes[stored].map(r=>[...r]),x:3,y:-1};stored=old;if(coll(cur)){end()}}heldUsed=true; soundCue('hold');$('held').textContent=stored<0?'EMPTY':['I','O','T','S','Z','J','L'][stored]}
let goalAnnounced=false;
function update(){
 $('score').textContent=score.toLocaleString();
 $('lines').textContent=lines;
 $('level').textContent=level;
 const progress=Math.min(2000,Math.max(0,score));
 const percent=Math.min(100,Math.round(progress/20));
 $('progressFill').style.width=percent+'%';
 $('goalPct').textContent=percent+'%';
 $('progressTrack').setAttribute('aria-valuenow',String(progress));
 $('goalStatus').textContent=score>=2000?'Goal reached! Keep playing if you want.':(2000-progress).toLocaleString()+' points to your personal goal.';
 if(score>=2000&&!goalAnnounced){
   goalAnnounced=true;
   if(active)flash('PERSONAL GOAL COMPLETE!');
   $('challengeProgress').classList.add('progress-complete');
 }
}
function rounded(g,x,y,s,r){g.beginPath();g.roundRect(x,y,s,s,r);g.fill()}
function square(g,x,y,s,k,alpha=1){g.save();g.globalAlpha=alpha;g.fillStyle=palette[k];g.shadowColor=palette[k];g.shadowBlur=s*.35;rounded(g,x+2,y+2,s-4,5);g.shadowBlur=0;g.fillStyle='#ffffff65';g.fillRect(x+6,y+5,s-12,3);g.fillStyle='#09142755';g.fillRect(x+5,y+s-10,s-10,4);g.restore()}
function paint(){cx.fillStyle='#0b1026';cx.fillRect(0,0,320,640);cx.lineWidth=1;cx.strokeStyle='#ffffff0b';for(let x=0;x<=W;x++){cx.beginPath();cx.moveTo(x*C,0);cx.lineTo(x*C,H*C);cx.stroke()}for(let y=0;y<=H;y++){cx.beginPath();cx.moveTo(0,y*C);cx.lineTo(W*C,y*C);cx.stroke()}grid.forEach((r,y)=>r.forEach((k,x)=>{if(k>=0)square(cx,x*C,y*C,C,k)}));if(cur&&active){let gy=cur.y;while(!coll({...cur,y:gy},0,1))gy++;cur.m.forEach((r,y)=>r.forEach((v,x)=>{if(v&&gy+y>=0)square(cx,(cur.x+x)*C,(gy+y)*C,C,cur.k,.19)}));cur.m.forEach((r,y)=>r.forEach((v,x)=>{if(v&&cur.y+y>=0)square(cx,(cur.x+x)*C,(cur.y+y)*C,C,cur.k)}))}}
function paintNext(){nx.clearRect(0,0,120,110);if(!next)return;const m=next.m,s=26,offx=(120-m[0].length*s)/2,offy=(110-m.length*s)/2;m.forEach((r,y)=>r.forEach((v,x)=>{if(v)square(nx,offx+x*s,offy+y*s,s,next.k)}))}
function overlay(title,desc,button){$('overTitle').textContent=title;$('overDesc').textContent=desc;$('start').textContent=button;$('overlay').hidden=false}
function end(){active=false;cancelAnimationFrame(raf);sendLifecycle('level_failed');if(score>best){best=score;storageSet('pulsegrid-best',best);$('best').textContent=best.toLocaleString()}if(dailyMode){const key='pulsegrid-daily-'+new Date().toISOString().slice(0,10);if(score>Number(storageGet(key)||0))storageSet(key,score)}overlay('GAME OVER','Score: '+score.toLocaleString()+' • '+lines+' lines','PLAY AGAIN');$('shareOverlay').hidden=false;$('supportOverlay').hidden=false;soundCue('end');try{if(bridge.advertisement.isInterstitialSupported)bridge.advertisement.showInterstitial('game_over')}catch(e){} }
function start(mode=dailyMode){dailyMode=mode;seed=Number(new Date().toISOString().slice(0,10).replaceAll('-',''))>>>0;grid=Array.from({length:H},()=>Array(W).fill(-1));score=0;level=1;lines=0;goalAnnounced=false;$('challengeProgress').classList.remove('progress-complete');cur=null;next=null;stored=-1;heldUsed=false;bag=[];active=true;paused=false;last=performance.now();acc=0;$('held').textContent='EMPTY';$('overlay').hidden=true;$('shareOverlay').hidden=true;$('supportOverlay').hidden=true;update();newPiece();soundCue('start');cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);sendLifecycle('level_started')}
function loop(t){const delta=Math.min(t-last,100);last=t;if(active&&!paused){acc+=delta;if(acc>Math.max(85,850*Math.pow(.84,level-1))){step();acc=0}}paint();if(active)raf=requestAnimationFrame(loop)}
function pause(){if(!active)return;paused=!paused;sendLifecycle(paused?'level_paused':'level_resumed');if(paused){cancelAnimationFrame(raf);overlay('PAUSED','Keep your focus. Resume when ready.','RESUME');$('shareOverlay').hidden=true;$('supportOverlay').hidden=true}else{$('overlay').hidden=true;last=performance.now();raf=requestAnimationFrame(loop)}}
function flash(msg){$('toast').textContent=msg;clearTimeout(flash.t);flash.t=setTimeout(()=>$('toast').textContent='',1000)}
$('start').onclick=()=>paused?pause():start();$('dailyStart').onclick=()=>start(true);$('hold').onclick=hold;$('pause').onclick=pause;$('soundToggle').onclick=toggleSound;$('left').onclick=()=>{move(-1);paint()};$('right').onclick=()=>{move(1);paint()};$('rot').onclick=()=>{rotate();paint()};$('drop').onclick=()=>{drop();paint()};
// Do not silently lose a run when players switch apps or take a call.
document.addEventListener('visibilitychange',()=>{if(document.hidden&&active&&!paused)pause()});
document.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Space'].includes(e.code))e.preventDefault();if(e.repeat&&['Space','KeyC','KeyP','ArrowUp'].includes(e.code))return;switch(e.code){case'ArrowLeft':case'KeyA':move(-1);break;case'ArrowRight':case'KeyD':move(1);break;case'ArrowUp':case'KeyW':rotate();break;case'ArrowDown':case'KeyS':soft();break;case'Space':drop();break;case'KeyC':hold();break;case'KeyP':pause();break}paint()});
let startX=0,startY=0;cv.addEventListener('touchstart',e=>{startX=e.touches[0].clientX;startY=e.touches[0].clientY},{passive:true});cv.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-startX,dy=e.changedTouches[0].clientY-startY;if(Math.abs(dx)>35&&Math.abs(dx)>Math.abs(dy)){move(dx>0?1:-1)}else if(dy>45){drop()}else rotate();paint()},{passive:true});

window.__PULSE_PG_AUDIO_ALLOWED=bridge.platform.isAudioEnabled!==false;
let platformForcedPause=false;
bridge.platform.on(bridge.EVENT_NAME.PAUSE_STATE_CHANGED,function(hostPaused){
  if(hostPaused&&active&&!paused){platformForcedPause=true;pause()}
  else if(!hostPaused&&platformForcedPause){platformForcedPause=false;if(active&&paused)pause()}
});
bridge.platform.on(bridge.EVENT_NAME.AUDIO_STATE_CHANGED,function(allowed){
  window.__PULSE_PG_AUDIO_ALLOWED=allowed!==false;
  if(!allowed&&soundContext?.suspend)Promise.resolve(soundContext.suspend()).catch(()=>{});
  else if(allowed&&soundEnabled&&soundContext?.resume)Promise.resolve(soundContext.resume()).catch(()=>{});
});

const date=new Date().toISOString().slice(0,10);$('daily').innerHTML='<span class="chip">'+date+'</span><br>Same random seed for everyone. Beat your own best and share it. Daily best on this device: <b>'+Number(storageGet('pulsegrid-daily-'+date)||0).toLocaleString()+'</b>';
$('shareOverlay').hidden=true;$('share').hidden=true;$('invite').hidden=true;$('share').onclick=async()=>{const link=new URL(location.href);link.searchParams.set('challenge',String(Math.max(score,best)));link.searchParams.set('src','friend');const msg='PULSE GRID — I scored '+Math.max(score,best).toLocaleString()+' points. Think you can beat me? '+link.href;try{if(navigator.share)await navigator.share({title:'PULSE GRID',text:msg});else{await navigator.clipboard.writeText(msg);flash('SCORE LINK COPIED')}}catch(e){flash('SHARE CANCELLED')}};const challenge=new URLSearchParams(location.search).get('challenge');if(challenge&&/^\d{1,9}$/.test(challenge)){const target=Number(challenge);$('challengeBox').hidden=false;$('challengeBox').textContent='⚡ A friend challenged you to beat '+target.toLocaleString()+' points. You got this!';$('overTitle').textContent='BEAT '+target.toLocaleString();$('overDesc').textContent='A friend challenged you. Start your run.';$('start').textContent='ACCEPT CHALLENGE'}
// A friendly, shareable target: no invented score, no collected player data.
$('invite').onclick=async()=>{const u=new URL(location.href);u.searchParams.delete('challenge');u.searchParams.set('goal','2000');u.searchParams.set('src','invite');const msg='Can you score 2,000 in PULSE GRID? Free browser challenge — no download or signup. '+u.href;try{if(navigator.share)await navigator.share({title:'PULSE GRID — 2,000 point challenge',text:msg});else{await navigator.clipboard.writeText(msg);flash('CHALLENGE LINK COPIED')}}catch(e){flash('SHARE CANCELLED')}};
const goalParam=new URLSearchParams(location.search).get('goal');if(!challenge&&goalParam&&/^\d{1,7}$/.test(goalParam)){const goal=Number(goalParam);if(goal>=100&&goal<=1000000){$('challengeBox').hidden=false;$('challengeBox').textContent='⚡ Daily goal: reach '+goal.toLocaleString()+' points. Free to play.';$('overTitle').textContent='GO FOR '+goal.toLocaleString();$('overDesc').textContent='Think you can reach the score target?';$('start').textContent='TRY THE CHALLENGE'}}
grid=Array.from({length:H},()=>Array(W).fill(-1));paint();bridge.platform.sendMessage('game_ready');
