/* =========================================================================
   METAL RUSH — Mission 1: Tempesta nel Deserto
   Run & gun a scorrimento orizzontale in stile Metal Slug.
   Puro HTML5 Canvas + WebAudio, nessun asset esterno.
   ========================================================================= */
'use strict';
(() => {

// ------------------------------------------------------------------ setup
const cvs = document.getElementById('game');
const ctx = cvs.getContext('2d');
const VIEW_W = 480, VIEW_H = 270, SCALE = 2;
ctx.imageSmoothingEnabled = false;

const GROUND  = 240;
const LEVEL_W = 6000;
const GRAV    = 560;
const ARENA_CAM = 5520;   // camera bloccata qui durante il boss
const ARENA_L   = 5532;

// ------------------------------------------------------------------ input
const keys = Object.create(null);
const pressed = Object.create(null);
const PREVENT = new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space',
  'KeyZ','KeyX','KeyC','KeyJ','KeyK','KeyL','KeyW','KeyA','KeyS','KeyD','Enter','KeyM','KeyP']);
addEventListener('keydown', e => {
  if (PREVENT.has(e.code)) e.preventDefault();
  ensureAudio();
  if (!e.repeat) pressed[e.code] = true;
  keys[e.code] = true;
});
addEventListener('keyup', e => { keys[e.code] = false; });
const key = (...c) => c.some(k => keys[k]);
const tap = (...c) => { for (const k of c) if (pressed[k]) { pressed[k] = false; return true; } return false; };
const clearPressed = () => { for (const k in pressed) delete pressed[k]; };

const K_L = ['ArrowLeft','KeyA'],  K_R = ['ArrowRight','KeyD'];
const K_U = ['ArrowUp','KeyW'],    K_D = ['ArrowDown','KeyS'];
const K_SHOOT = ['KeyZ','KeyJ'],   K_JUMP = ['KeyX','KeyK','Space'], K_GREN = ['KeyC','KeyL'];

// ------------------------------------------------------------------ utils
const clamp = (v,a,b) => v<a?a:(v>b?b:v);
const lerp  = (a,b,t) => a+(b-a)*t;
const rnd   = (a=1,b) => b===undefined ? Math.random()*a : a+Math.random()*(b-a);
const hash  = n => { const x = Math.sin(n*127.1+13.7)*43758.5453; return x-Math.floor(x); };
const aabb  = (a,b) => a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;
const dist2 = (x1,y1,x2,y2) => { const dx=x1-x2, dy=y1-y2; return dx*dx+dy*dy; };
const zpad  = (n,l) => String(n).padStart(l,'0');

// ------------------------------------------------------------------ audio
let actx=null, master=null, musicGain=null, muted=false;
let noiseBuf=null, musicTimer=null, musicAt=0, musicStep=0, musicOn=false;

function ensureAudio(){
  if (!actx) {
    try {
      actx = new (window.AudioContext||window.webkitAudioContext)();
      master = actx.createGain(); master.gain.value = 0.5; master.connect(actx.destination);
      musicGain = actx.createGain(); musicGain.gain.value = 0.30; musicGain.connect(master);
    } catch(e) { return; }
  }
  if (actx.state === 'suspended') actx.resume();
}
function getNoise(){
  if (!noiseBuf) {
    noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
  }
  return noiseBuf;
}
function tone(f0,f1,dur,type,vol,when=0,dest){
  if (!actx || muted) return;
  const t = actx.currentTime + when;
  const o = actx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(Math.max(1,f0), t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1,f1), t+dur);
  const g = actx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t+dur);
  o.connect(g); g.connect(dest||master);
  o.start(t); o.stop(t+dur+0.03);
}
function noise(dur,vol,fc0,fc1,when=0,dest){
  if (!actx || muted) return;
  const t = actx.currentTime + when;
  const src = actx.createBufferSource(); src.buffer = getNoise(); src.loop = true;
  const f = actx.createBiquadFilter(); f.type = 'lowpass';
  f.frequency.setValueAtTime(Math.max(40,fc0), t);
  f.frequency.exponentialRampToValueAtTime(Math.max(40,fc1), t+dur);
  const g = actx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t+dur);
  src.connect(f); f.connect(g); g.connect(dest||master);
  src.start(t); src.stop(t+dur+0.03);
}
function sfx(n){
  if (!actx || muted) return;
  switch(n){
    case 'shot':   tone(700,180,.08,'square',.16); noise(.05,.10,3000,800); break;
    case 'hmg':    tone(520,140,.06,'square',.13); noise(.04,.09,2500,700); break;
    case 'spread': noise(.14,.28,1200,200); tone(220,70,.12,'square',.18); break;
    case 'eshot':  tone(430,160,.09,'square',.08); break;
    case 'boom':   noise(.45,.45,900,80); tone(110,38,.35,'sine',.45); break;
    case 'bigboom':noise(.8,.55,700,60); tone(90,30,.6,'sine',.55); tone(62,24,.7,'triangle',.35,.05); break;
    case 'toss':   tone(260,520,.10,'sine',.08); break;
    case 'jump':   tone(190,400,.09,'square',.06); break;
    case 'pickup': tone(660,660,.06,'square',.13); tone(990,990,.09,'square',.13,.07); break;
    case 'pow':    tone(440,880,.12,'square',.11); tone(880,1320,.10,'square',.09,.11); break;
    case 'death':  tone(400,60,.5,'sawtooth',.22); noise(.3,.18,1500,200); break;
    case 'cannon': noise(.25,.35,600,120); tone(140,50,.2,'sine',.35); break;
    case 'click':  tone(900,700,.03,'square',.07); break;
    case 'enter':  tone(200,90,.15,'square',.14); noise(.1,.08,800,300); break;
    case 'hitmetal': tone(1200,300,.05,'square',.10); break;
    case 'alarm':  for (let i=0;i<4;i++) tone(i%2?620:780, i%2?620:780, .12, 'square', .11, i*.16); break;
    case 'win': { const ns=[523,659,784,1047,784,1047]; ns.forEach((f,i)=>tone(f,f,.14,'square',.14,i*.13)); break; }
  }
}
function musicTick(){
  if (!actx || !musicOn || muted) return;
  const e8 = 60/132/2;                      // un ottavo a 132 bpm
  const roots = [110,110,87.31,98];         // A A F G
  while (musicAt < actx.currentTime + 0.30) {
    const step = musicStep % 32;
    const bar  = (musicStep >> 3) % 4;
    const when = Math.max(0, musicAt - actx.currentTime);
    const root = roots[bar];
    tone(step%2 ? root : root/2, step%2 ? root : root/2, e8*0.85, 'square', .085, when, musicGain);
    if (step%8===0) tone(150,40,.12,'sine',.40,when,musicGain);
    if (step%8===4) noise(.08,.20,1800,400,when,musicGain);
    if (step%2===0) noise(.03,.05,6000,3000,when,musicGain);
    musicAt += e8; musicStep++;
  }
}
function startMusic(){ if(!actx) return; musicOn=true; musicAt=actx.currentTime+0.1; musicStep=0;
  if(!musicTimer) musicTimer=setInterval(musicTick,90); }
function stopMusic(){ musicOn=false; }

// ------------------------------------------------------------------ sprite
const PAL = {
  k:'#14141a', s:'#eab287', S:'#c98a5e', h:'#e8b03c',
  w:'#eee9da', W:'#c2bcab', g:'#4f6a3d', G:'#3a4f2c',
  b:'#7a4f2a', B:'#5a3a1f', n:'#23232b', t:'#b59a5e',
  T:'#8a7444', r:'#c23535', d:'#8a6a42', y:'#ffd23f', o:'#ff7f2a'
};
function bake(rows){
  const w = Math.max(...rows.map(r=>r.length)), h = rows.length;
  const c = document.createElement('canvas'); c.width=w; c.height=h;
  const g = c.getContext('2d');
  rows.forEach((row,j) => { for (let i=0;i<row.length;i++){ const col=PAL[row[i]]; if(col){ g.fillStyle=col; g.fillRect(i,j,1,1); } } });
  return c;
}
function flipC(c){
  const f=document.createElement('canvas'); f.width=c.width; f.height=c.height;
  const g=f.getContext('2d'); g.translate(c.width,0); g.scale(-1,1); g.drawImage(c,0,0);
  return f;
}
function spr(rows){ const r=bake(rows); return { r, l:flipC(r), w:r.width, h:r.height }; }
const remap = (rows,from,to) => rows.map(r => r.split('').map(ch => ch===from?to:ch).join(''));

const P_TORSO = [
  '.....hhhh.....',
  '....hhhhhh....',
  '....ssssss....',
  '....sskssk....',
  '....ssssss....',
  '.....ssss.....',
  '....wwwwww....',
  '...wwwwwwww...',
  '..sswwwwwwss..',
  '..ss.wwww.ss..',
  '....gggggg....'
];
const L_IDLE = [
  '....gggggg....',
  '....gg..gg....',
  '....gg..gg....',
  '....gg..gg....',
  '....gg..gg....',
  '...bbb..bbb...',
  '...bbb..bbb...'
];
const L_R0 = [
  '...ggggggg....',
  '...ggg..ggg...',
  '..ggg....ggg..',
  '..bb......gg..',
  '.bbb......bbb.',
  '..........bbb.',
  '..............'
];
const L_R1 = [
  '....gggggg....',
  '....ggggg.....',
  '....gg.gg.....',
  '....gg.bb.....',
  '...gbb........',
  '...bbb........',
  '..............'
];
const L_R2 = [
  '...ggggggg....',
  '...ggg..ggg...',
  '...gg....ggg..',
  '...gg.....bb..',
  '..bbb.....bbb.',
  '..bbb.........',
  '..............'
];
const L_JUMP = [
  '....gggggg....',
  '...ggg..ggg...',
  '...gg....gg...',
  '...bbb...bb...',
  '...bbb........',
  '..............',
  '..............'
];
const P_CROUCH = [
  '.....hhhh.....',
  '....hhhhhh....',
  '....ssssss....',
  '....sskssk....',
  '....ssssss....',
  '....wwwwww....',
  '..swwwwwwws...',
  '..swwwwwwws...',
  '..gggggggg....',
  '..ggg...ggg...',
  '..bbb...bbb...'
];
const E_TORSO = [
  '....rrrrr.....',
  '...rrrrrrr....',
  '....ssssss....',
  '....sskssk....',
  '....ssssss....',
  '.....ssss.....',
  '....tttttt....',
  '...tttttttt...',
  '..ssttttttss..',
  '..ss.tttt.ss..',
  '....TTTTTT....'
];
const POW_MAP = [
  '....dddd....',
  '...dddddd...',
  '...ssssss...',
  '...sskssk...',
  '...ssssss...',
  '..dddddddd..',
  '..dddddddd..',
  '..dddddddd..',
  '...dddddd...',
  '..dd....dd..',
  '..bb....bb..',
  '..bb....bb..'
];
const tl = m => remap(m,'g','t');
const SP = {
  pIdle: spr(P_TORSO.concat(L_IDLE)),
  pRun: [spr(P_TORSO.concat(L_R0)), spr(P_TORSO.concat(L_R1)), spr(P_TORSO.concat(L_R2))],
  pJump: spr(P_TORSO.concat(L_JUMP)),
  pCrouch: spr(P_CROUCH),
  eIdle: spr(E_TORSO.concat(remap(tl(L_IDLE),'G','T'))),
  eRun: [spr(E_TORSO.concat(tl(L_R0))), spr(E_TORSO.concat(tl(L_R1))), spr(E_TORSO.concat(tl(L_R2)))],
  pow: spr(POW_MAP)
};
function drawSpr(s, x, y, dir){ ctx.drawImage(dir<0?s.l:s.r, Math.round(x), Math.round(y)); }

// ------------------------------------------------------------------ stato
let state='title', stateT=0, paused=false, tGlobal=0;
let score=0, best=0;
try { best = +(localStorage.getItem('mr_best')||0); } catch(e) {}
function saveBest(){ best=Math.max(best,score); try{ localStorage.setItem('mr_best',String(best)); }catch(e){} }

let camX=0, shakeT=0, shakeDur=0, shakeMag=0;
function shake(m,d){ shakeMag=Math.max(shakeMag,m); shakeDur=Math.max(shakeDur,d); shakeT=Math.max(shakeT,d); }

let SOLIDS, enemies, pbullets, ebullets, grenades, shells, pickups, pows, parts, texts, booms, vehicles, heliTriggers;
let player, boss=null, bossActive=false, bossDoneT=-1, banner=null, winT=-1;

// ------------------------------------------------------------------ fisica
function moveX(o, dt){
  o.x += o.vx*dt;
  for (const s of SOLIDS){
    if (s.oneWay || !aabb(o,s)) continue;
    if (o.vx > 0) o.x = s.x - o.w;
    else if (o.vx < 0) o.x = s.x + s.w;
  }
  o.x = clamp(o.x, 2, LEVEL_W - o.w - 2);
}
function moveY(o, dt){
  const prevB = o.y + o.h;
  o.y += o.vy*dt;
  o.onG = false;
  for (const s of SOLIDS){
    if (!aabb(o,s)) continue;
    if (o.vy >= 0 && prevB <= s.y + 0.6){ o.y = s.y - o.h; o.vy = 0; o.onG = true; }
    else if (!s.oneWay && o.vy < 0){ o.y = s.y + s.h; o.vy = 0; }
  }
}
function pointSolid(x,y){
  if (y >= GROUND) return true;
  for (const s of SOLIDS){
    if (!s.oneWay && x>=s.x && x<=s.x+s.w && y>=s.y && y<=s.y+s.h) return true;
  }
  return false;
}

// ------------------------------------------------------------------ effetti
function spark(x,y,n=4,col='#ffd23f'){
  for (let i=0;i<n;i++) parts.push({x,y,vx:rnd(-80,80),vy:rnd(-90,20),g:300,t:0,life:rnd(.15,.35),col,sz:1});
}
function smoke(x,y,n=3){
  for (let i=0;i<n;i++) parts.push({x:x+rnd(-4,4),y:y+rnd(-4,4),vx:rnd(-12,12),vy:rnd(-40,-12),g:-30,t:0,life:rnd(.5,1.0),col:'#8a8a90',sz:rnd(2,4),smoke:true});
}
function casing(x,y,dir){
  parts.push({x,y,vx:-dir*rnd(20,50),vy:rnd(-90,-50),g:420,t:0,life:.5,col:'#d8b04a',sz:1});
}
function ragdoll(x,y,s,dir){
  parts.push({x,y,vx:rnd(-40,40)-dir*30,vy:rnd(-180,-120),g:480,t:0,life:.9,spr:s,dir,rot:0,rv:rnd(-9,9)});
}
function addText(x,y,str,col='#fff'){ texts.push({x,y,str,col,t:0}); }

function boomAt(x,y,r,dmg,side,big){
  booms.push({x,y,r,t:0,dur:.45});
  spark(x,y,8,'#ff7f2a'); smoke(x,y,4);
  shake(big?4:2.5,.25);
  sfx(big?'bigboom':'boom');
  if (side==='p'){
    for (const e of enemies){
      if (e.dead) continue;
      const ex=e.x+e.w/2, ey=e.y+e.h/2;
      if (dist2(x,y,ex,ey) < (r+e.w/2)*(r+e.w/2)) hurtEnemy(e,dmg);
    }
  } else {
    if (player.inVeh){
      const v=player.inVeh;
      if (dist2(x,y,v.x+v.w/2,v.y+v.h/2) < (r+14)*(r+14)) hitVehicle(v,2);
    } else if (!player.dead && player.inv<=0){
      if (dist2(x,y,player.x+player.w/2,player.y+player.h/2) < (r+7)*(r+7)) killPlayer();
    }
  }
}

// ------------------------------------------------------------------ player
function makePlayer(x){
  return { x, y:GROUND-18, w:10, h:18, vx:0, vy:0, dir:1, onG:false, crouch:false,
    anim:0, fireT:0, inv:0, lives:3, grenN:8, weapon:'P', ammo:0,
    dead:false, deadT:0, deathX:x, rot:0, inVeh:null, coyote:0, jbuf:0, chute:false, shootHold:0 };
}
function weaponName(p){ return p.weapon==='H' ? 'HEAVY MG '+p.ammo : p.weapon==='S' ? 'SPREAD '+p.ammo : 'PISTOL ∞'; }

function firePlayer(p, aim){
  // aim: {dx,dy} normalizzato
  const rate = p.weapon==='H' ? .085 : p.weapon==='S' ? .30 : .17;
  if (p.fireT > 0) return;
  p.fireT = rate;
  let mx, my;
  const cx = p.x+p.w/2;
  if (aim.dy < 0)      { mx = cx + p.dir*4; my = p.y - 10; }
  else if (aim.dy > 0) { mx = cx;           my = p.y + p.h + 8; }
  else                 { mx = cx + p.dir*14; my = p.y + (p.crouch?6:9); }
  const mk = (a,sp,dmg,life) => pbullets.push({x:mx,y:my,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,dmg,t:0,life});
  const base = Math.atan2(aim.dy, aim.dy!==0 ? 0.0001*p.dir : aim.dx);
  if (p.weapon==='S'){
    for (const off of [-0.21,0,0.21]) mk(base+off, 300, 2, .55);
    p.ammo--; sfx('spread'); shake(1.5,.1);
  } else if (p.weapon==='H'){
    mk(base+rnd(-.04,.04), 340, 1, .9);
    p.ammo--; sfx('hmg');
  } else {
    mk(base, 320, 1, .9);
    sfx('shot');
  }
  casing(cx, p.y+8, p.dir);
  p.muzzle = {x:mx, y:my, t:.05};
  if (p.ammo<=0 && p.weapon!=='P'){ p.weapon='P'; addText(p.x, p.y-8, 'PISTOL', '#ffd23f'); }
}

function killPlayer(){
  const p = player;
  if (p.dead || p.inv>0) return;
  p.dead = true; p.deadT = 0; p.lives--;
  p.deathX = clamp(p.x, camX+24, camX+VIEW_W-34);
  if (bossActive) p.deathX = Math.max(p.deathX, ARENA_L+10);
  p.vy = -200; p.vx = -p.dir*40; p.rot = 0;
  p.weapon='P'; p.ammo=0;
  sfx('death'); shake(3,.3);
}
function respawn(){
  const p = player;
  if (p.lives < 0){ saveBest(); state='over'; stateT=0; stopMusic(); return; }
  p.dead=false; p.x=p.deathX; p.y=-26; p.vx=0; p.vy=70; p.chute=true;
  p.inv=2.6; p.grenN=Math.max(p.grenN,6); p.crouch=false; p.h=18;
}
function hitVehicle(v,dmg){
  if (v.inv>0 || v.dead) return;
  v.hp -= dmg; v.inv=.35; v.flash=.1; sfx('hitmetal');
  if (v.hp<=0){
    v.dead=true;
    boomAt(v.x+v.w/2, v.y+v.h/2, 30, 0, 'none', true);
    smoke(v.x+v.w/2, v.y, 8);
    if (player.inVeh===v){
      player.inVeh=null; player.inv=1.5;
      player.x=v.x+v.w/2-5; player.y=v.y-22; player.vy=-160;
      addText(player.x, player.y-6, 'EJECT!', '#ff7f2a');
    }
  }
}

function updatePlayer(p, dt){
  p.inv -= dt; p.fireT -= dt;
  if (p.muzzle) { p.muzzle.t-=dt; if(p.muzzle.t<=0) p.muzzle=null; }

  if (p.dead){
    p.deadT += dt;
    p.vy += GRAV*dt; p.x += p.vx*dt; p.y += p.vy*dt; p.rot += 8*dt;
    if (p.deadT > 1.4) respawn();
    return;
  }
  if (p.chute){
    p.vy = Math.min(p.vy + GRAV*dt, 130);
    p.vx = ((key(...K_R)?1:0)-(key(...K_L)?1:0)) * 42;   // si può guidare la discesa
    p.x += p.vx*dt; p.y += p.vy*dt;
    moveY(p, 0);
    if (p.onG || p.y+p.h >= GROUND){
      p.y=Math.min(p.y,GROUND-p.h); p.chute=false; p.onG=true;
      p.inv=2.2;                                          // mercy invincibility all'atterraggio
    }
    return;
  }

  // dentro il tank: i comandi vanno al veicolo
  if (p.inVeh){
    const v = p.inVeh;
    updateSlugControls(v, dt);
    p.x = v.x + v.w/2 - p.w/2; p.y = v.y - 10;
    if (tap(...K_D)){ // esci
      p.inVeh=null; v.occ=false;
      p.x=v.x+v.w/2-5; p.y=v.y-22; p.vy=-140; p.inv=.8;
    }
    return;
  }

  const L=key(...K_L), R=key(...K_R), U=key(...K_U), D=key(...K_D);

  // entra nel tank
  for (const v of vehicles){
    if (!v.dead && !v.occ && aabb(p, {x:v.x-10,y:v.y-14,w:v.w+20,h:v.h+14}) && tap(...K_D)){
      p.inVeh=v; v.occ=true; p.crouch=false; p.h=18;
      addText(v.x+6, v.y-16, 'SLUG!', '#ffd23f'); sfx('pickup');
      return;
    }
  }

  // crouch
  const wantCrouch = D && p.onG;
  if (wantCrouch && p.h!==12){ p.y+=6; p.h=12; p.crouch=true; }
  else if (!wantCrouch && p.h!==18){ p.y-=6; p.h=18; p.crouch=false; }

  const sp = p.crouch ? 32 : 92;
  p.vx = ((R?1:0)-(L?1:0)) * sp;
  if (R) p.dir=1; else if (L) p.dir=-1;

  // salto con coyote-time e jump-buffer
  p.coyote = p.onG ? .08 : p.coyote - dt;
  p.jbuf = tap(...K_JUMP) ? .12 : p.jbuf - dt;
  if (p.jbuf>0 && p.coyote>0){
    if (p.crouch){ p.y-=6; p.h=18; p.crouch=false; }
    p.vy = -245; p.jbuf=0; p.coyote=0; p.onG=false; sfx('jump');
  }

  p.vy = Math.min(p.vy + GRAV*dt, 300);
  moveX(p, dt);
  moveY(p, dt);
  if (bossActive) p.x = clamp(p.x, ARENA_L, LEVEL_W - p.w - 6);
  if (p.y > VIEW_H + 60) { p.inv=0; killPlayer(); return; }

  // animazione corsa
  if (p.onG && Math.abs(p.vx)>1) p.anim += dt*10; else if (p.onG) p.anim = 0;

  // fuoco
  if (key(...K_SHOOT)){
    const aim = U ? {dx:0,dy:-1} : (!p.onG && D) ? {dx:0,dy:1} : {dx:p.dir,dy:0};
    firePlayer(p, aim);
  }
  // granata
  if (tap(...K_GREN)){
    if (p.grenN>0){
      p.grenN--;
      grenades.push({x:p.x+p.w/2, y:p.y+4, vx:p.dir*120+p.vx*.4, vy:-180, t:0, bounced:false});
      sfx('toss');
    } else sfx('click');
  }

  // raccolte
  for (const it of pickups){
    if (it.got || !aabb(p,{x:it.x,y:it.y,w:12,h:10})) continue;
    it.got=true; sfx('pickup');
    if (it.type==='H'){ p.weapon='H'; p.ammo=(p.weapon==='H'?p.ammo:0)+200; addText(it.x,it.y-8,'HEAVY MG!','#ffd23f'); }
    else if (it.type==='S'){ p.weapon='S'; p.ammo=(p.weapon==='S'?p.ammo:0)+60; addText(it.x,it.y-8,'SPREAD!','#ff7f2a'); }
    else if (it.type==='G'){ p.grenN+=6; addText(it.x,it.y-8,'+6 GRANATE','#9adb4f'); }
    else { score+=1000; addText(it.x,it.y-8,'+1000','#ffd23f'); }
  }
  // POW
  for (const w of pows){
    if (w.freed || !aabb(p,{x:w.x,y:w.y,w:12,h:12})) continue;
    w.freed=true; w.t=0; score+=500; sfx('pow');
    addText(w.x, w.y-10, 'GRAZIE!', '#9adb4f');
    addText(w.x, w.y-18, '+500', '#ffd23f');
    pickups.push({x:w.x+2, y:GROUND-10, type:w.gift, bob:rnd(6)});
  }
}

// ------------------------------------------------------------------ slug (tank)
function makeSlug(x){
  return { x, y:GROUND-20, w:42, h:20, vx:0, vy:0, dir:1, hp:6, maxHp:6, shells:30,
    occ:false, dead:false, fireT:0, canT:0, inv:0, flash:0, tread:0, onG:true };
}
function updateSlugControls(v, dt){
  const L=key(...K_L), R=key(...K_R), U=key(...K_U);
  v.vx = ((R?1:0)-(L?1:0)) * 72;
  if (R) v.dir=1; else if (L) v.dir=-1;
  if (tap(...K_JUMP) && v.onG){ v.vy=-150; sfx('jump'); }
  v.fireT-=dt; v.canT-=dt;
  if (key(...K_SHOOT) && v.fireT<=0){
    v.fireT=.09;
    const ang = U ? (v.dir>0 ? -0.9 : Math.PI+0.9) : (v.dir>0?0:Math.PI);
    const mx=v.x+v.w/2+Math.cos(ang)*20, my=v.y+2+Math.sin(ang)*12;
    pbullets.push({x:mx,y:my,vx:Math.cos(ang)*340,vy:Math.sin(ang)*340,dmg:1,t:0,life:.9});
    sfx('hmg'); casing(v.x+v.w/2, v.y, v.dir);
  }
  if (tap(...K_GREN)){
    if (v.shells>0 && v.canT<=0){
      v.shells--; v.canT=.5;
      const vx = U ? v.dir*50 : v.dir*170;
      const vy = U ? -260 : -120;
      shells.push({x:v.x+v.w/2+v.dir*16, y:v.y, vx, vy, g:420, from:'p', t:0, kind:'cshell'});
      sfx('cannon'); shake(2,.15);
    } else sfx('click');
  }
}
function updateSlug(v, dt){
  v.inv-=dt; v.flash-=dt;
  if (v.dead) return;
  if (!v.occ) v.vx = 0;
  v.vy = Math.min(v.vy + GRAV*dt, 300);
  moveX(v, dt); moveY(v, dt);
  if (bossActive && v.occ) v.x = clamp(v.x, ARENA_L, LEVEL_W - v.w - 6);
  v.tread += Math.abs(v.vx)*dt*.4;
}

// ------------------------------------------------------------------ nemici
function mkSoldier(x, floor=GROUND){ return {type:'sold', x, y:floor-18, w:10, h:18, hp:1, dir:-1, anim:0,
  awake:false, flash:0, dead:false, shootCd:rnd(.8,1.8), knifeCd:0, windup:-1, score:100, home:x}; }
function mkBazooka(x, floor=GROUND){ return {type:'baz', x, y:floor-18, w:10, h:18, hp:2, dir:-1,
  awake:false, flash:0, dead:false, cd:rnd(.6,1.4), score:200}; }
function mkRifle(x, floor=GROUND){ return {type:'rifle', x, y:floor-18, w:10, h:18, hp:2, dir:-1,
  awake:false, flash:0, dead:false, cd:rnd(.6,1.6), bN:0, bT:0, score:150}; }
function mkTurret(x){ return {type:'turret', x:x-15, y:GROUND-14, w:30, h:14, hp:6, dir:-1,
  awake:false, flash:0, dead:false, cd:1, bN:0, bT:0, score:500}; }
function mkHeli(x){ return {type:'heli', x, y:64, w:44, h:16, hp:8, dir:-1, t:rnd(10),
  awake:true, flash:0, dead:false, cd:1.2, falling:false, vy:0, rot:0, score:1000}; }
function mkBoss(){ return {type:'boss', x:5998, y:GROUND-46, w:104, h:46, hp:70, maxHp:70, dir:-1,
  awake:true, flash:0, dead:false, entering:true, cd:1.6, bN:0, bT:0, mode:'idle', tx:0,
  deadT:-1, barrel:Math.PI, tread:0, score:5000}; }

function hurtEnemy(e, dmg){
  if (e.dead) return;
  e.hp -= dmg; e.flash = .09;
  if (e.type!=='boss') e.awake = true;
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e){
  e.dead = true;
  score += e.score;
  addText(e.x, e.y-10, '+'+e.score, '#ffd23f');
  if (e.type==='sold'||e.type==='baz'||e.type==='rifle'){
    ragdoll(e.x, e.y, SP.eIdle, e.dir);
    spark(e.x+5, e.y+8, 5, '#eee9da'); smoke(e.x+5,e.y+8,2);
    sfx('eshot');
  } else if (e.type==='heli'){
    e.dead=false; e.falling=true; e.hp=999; // cade e poi esplode
  } else if (e.type==='boss'){
    e.dead=false; e.deadT=0;     // sequenza di esplosioni gestita nell'update
  } else {
    boomAt(e.x+e.w/2, e.y+e.h/2, 22, 0, 'none');
  }
}
function eBullet(x,y,tx,ty,sp){
  const d = Math.max(20, Math.hypot(tx-x,ty-y));
  ebullets.push({x,y,vx:(tx-x)/d*sp,vy:(ty-y)/d*sp,t:0});
  sfx('eshot');
}

function updateEnemy(e, dt){
  const p = player;
  const px = p.x+p.w/2, py = p.y+p.h/2;
  const ex = e.x+e.w/2, ey = e.y+e.h/2;
  const dx = px-ex, adx = Math.abs(dx);
  e.flash -= dt;
  if (!e.awake){ e.awake = adx < 300; if (!e.awake) return; }
  const targetable = !p.dead && !p.chute;

  switch(e.type){
    case 'sold': {
      e.dir = dx<0?-1:1;
      e.knifeCd -= dt; e.shootCd -= dt;
      if (e.windup>=0){
        e.windup += dt;
        if (e.windup > .22){
          e.windup = -1;
          if (targetable && adx<22 && Math.abs(py-ey)<14 && !p.inVeh && p.inv<=0) killPlayer();
        }
      } else if (targetable && adx<16 && Math.abs(py-ey)<14 && e.knifeCd<=0 && !p.inVeh){
        e.windup=0; e.knifeCd=1.1;
      } else if (targetable && adx>=40 && adx<210 && Math.abs(py-ey)<40 && e.shootCd<=0){
        e.shootCd = rnd(1.4,2.4);
        eBullet(ex+e.dir*8, e.y+8, px, p.inVeh? ey : py, 135);
      } else if (adx>30 && adx<260){
        e.x += e.dir*38*dt; e.anim += dt*9;
        const fx = e.x + (e.dir>0? e.w+2 : -2);
        if (pointSolid(fx, e.y+e.h-4)) e.x -= e.dir*38*dt;
      }
      break;
    }
    case 'baz': {
      e.dir = dx<0?-1:1; e.cd -= dt;
      if (targetable && adx<290 && e.cd<=0){
        e.cd = 2.6;
        const T=1.0;
        const vx = clamp((px-ex)/T, -200, 200);
        const vy = (py-ey)/T - 0.5*420*T;
        shells.push({x:ex, y:e.y+2, vx, vy, g:420, from:'e', t:0, kind:'rocket'});
        sfx('cannon');
      }
      break;
    }
    case 'rifle': {
      e.dir = dx<0?-1:1; e.cd -= dt;
      if (e.bN>0){
        e.bT -= dt;
        if (e.bT<=0){ e.bT=.14; e.bN--; eBullet(ex+e.dir*9, e.y+7, px, py, 150); }
      } else if (targetable && adx<270 && e.cd<=0){ e.cd=2.2; e.bN=3; e.bT=0; }
      break;
    }
    case 'turret': {
      e.dir = dx<0?-1:1; e.cd -= dt;
      if (e.bN>0){
        e.bT -= dt;
        if (e.bT<=0){
          e.bT=.13; e.bN--;
          const ty = clamp(py, ey-20, ey+6);
          eBullet(ex+e.dir*14, e.y+4, px, ty, 155);
        }
      } else if (targetable && adx<260 && e.cd<=0){ e.cd=2.8; e.bN=4; e.bT=0; }
      break;
    }
    case 'heli': {
      e.t += dt;
      if (e.falling){
        e.vy += 300*dt; e.y += e.vy*dt; e.rot += 4*dt; e.x += e.dir*30*dt;
        smoke(ex, ey, 1);
        if (e.y+e.h >= GROUND-2){ e.dead=true; boomAt(ex, GROUND-8, 26, 0, 'none', true); }
        return;
      }
      const tx = px + Math.sin(e.t*.7)*70;
      e.x += clamp(tx-ex, -55, 55)*dt;
      e.y = 56 + Math.sin(e.t*2)*7;
      e.dir = dx<0?-1:1;
      e.cd -= dt;
      if (targetable && adx<90 && e.cd<=0){
        e.cd = 1.7;
        shells.push({x:ex, y:e.y+e.h, vx:clamp(dx,-30,30)*.5, vy:30, g:330, from:'e', t:0, kind:'bomb'});
      }
      break;
    }
    case 'boss': updateBoss(e, dt, px, py); break;
  }
}

function updateBoss(b, dt, px, py){
  const bx = b.x+b.w/2;
  b.tread += Math.abs(b.vxNow||0)*dt*.4;
  // mira della canna
  const tipx = b.x+10, tipy = b.y+8;
  const want = Math.atan2(clamp(py-tipy,-60,30), px-tipx);
  b.barrel += clamp(want-b.barrel, -1.5*dt, 1.5*dt);

  if (b.deadT >= 0){ // sequenza di morte
    b.deadT += dt;
    if (b.deadT < 1.8){
      if (Math.random()<dt*9) boomAt(b.x+rnd(0,b.w), b.y+rnd(0,b.h), 16, 0, 'none');
    } else {
      b.dead = true;
      boomAt(bx, b.y+b.h/2, 46, 0, 'none', true);
      bossActive = false; bossDoneT = 0;
    }
    return;
  }
  if (b.entering){
    b.x -= 36*dt; b.vxNow=-36;
    if (b.x <= 5856){ b.entering=false; b.cd=1.0; b.vxNow=0; }
    return;
  }
  const rage = b.hp < b.maxHp*0.45;
  if (rage && Math.random()<dt*4) smoke(b.x+rnd(0,b.w), b.y+rnd(0,10), 1);
  b.cd -= dt;
  b.vxNow = 0;

  if (b.mode==='move'){
    const d = b.tx - b.x;
    if (Math.abs(d) < 4 || (b.moveT-=dt) <= 0){ b.mode='idle'; b.cd=rage?.8:1.3; }
    else { const s = (rage?44:30)*Math.sign(d); b.x += s*dt; b.vxNow=s; }
  } else if (b.mode==='mg'){
    b.bT -= dt;
    if (b.bT<=0 && b.bN>0){
      b.bN--; b.bT=.11;
      const a = b.barrel + rnd(-.08,.08);
      ebullets.push({x:tipx+Math.cos(a)*26, y:tipy+Math.sin(a)*26, vx:Math.cos(a)*165, vy:Math.sin(a)*165, t:0});
      sfx('eshot');
    }
    if (b.bN<=0){ b.mode='idle'; b.cd=rage?.9:1.5; }
  } else if (b.mode==='cannon'){
    b.bT -= dt;
    if (b.bT<=0 && b.bN>0){
      b.bN--; b.bT=.5;
      const T=.9;
      const mx = tipx+Math.cos(b.barrel)*28, my=tipy+Math.sin(b.barrel)*28;
      const vx = clamp((px-mx)/T + rnd(-20,20), -230, 230);
      const vy = (GROUND-6-my)/T - 0.5*420*T;
      shells.push({x:mx,y:my,vx,vy,g:420,from:'e',t:0,kind:'cshell'});
      sfx('cannon'); shake(2,.15);
    }
    if (b.bN<=0){ b.mode='idle'; b.cd=rage?.7:1.4; }
  } else if (b.cd<=0){
    const r = Math.random();
    if (r<.34){ b.mode='move'; b.tx = clamp(px+rnd(90,150), 5640, 5880); b.moveT=2.4; }
    else if (r<.67){ b.mode='mg'; b.bN=rage?10:7; b.bT=.3; }
    else { b.mode='cannon'; b.bN=rage?4:3; b.bT=.3; }
  }
}

// ------------------------------------------------------------------ POW / livello
function mkPow(x, gift){ return {x, y:GROUND-12, w:12, h:12, gift, freed:false, t:0, done:false}; }

function buildLevel(){
  SOLIDS = [
    {x:-60, y:GROUND, w:LEVEL_W+120, h:60},
    {x:500,  y:206, w:54,  h:34, deco:'crate'},
    {x:1230, y:192, w:110, h:10, deco:'stone', oneWay:true},
    {x:1640, y:210, w:46,  h:30, deco:'crate'},
    {x:2870, y:194, w:90,  h:10, deco:'stone', oneWay:true},
    {x:3040, y:162, w:90,  h:10, deco:'stone', oneWay:true},
    {x:4470, y:198, w:80,  h:10, deco:'stone', oneWay:true},
    {x:5260, y:204, w:50,  h:36, deco:'crate'}
  ];
  enemies = [];
  const S = x => enemies.push(mkSoldier(x));
  [330,430,580,900,1040,1320,1500,1560,1950,2010,2070,2480,3180,3340,3700,4420,4520,4900,5050,5200].forEach(S);
  enemies.push(mkBazooka(1280, 192));
  enemies.push(mkBazooka(2150));
  enemies.push(mkBazooka(3620));
  enemies.push(mkBazooka(4700));
  enemies.push(mkRifle(2900, 194));
  enemies.push(mkRifle(3070, 162));
  enemies.push(mkRifle(4495, 198));
  enemies.push(mkTurret(980));
  enemies.push(mkTurret(3260));
  enemies.push(mkTurret(4850));
  heliTriggers = [2350, 3850];
  pows = [mkPow(700,'H'), mkPow(2700,'S'), mkPow(4200,'G'), mkPow(5300,'M')];
  pickups = [{x:1652, y:198, type:'G', bob:0}];
  vehicles = [makeSlug(1750)];
  pbullets=[]; ebullets=[]; grenades=[]; shells=[]; parts=[]; texts=[]; booms=[];
  boss=null; bossActive=false; bossDoneT=-1; winT=-1;
  camX=0; banner={text:'MISSION START', t:0, dur:2};
}
function resetGame(){
  score=0;
  buildLevel();
  player=makePlayer(40);
}

// ------------------------------------------------------------------ update
function update(dt){
  tGlobal += dt;
  if (shakeT>0) shakeT-=dt;

  if (state==='title'){
    if (tap('Enter')){ resetGame(); state='play'; stateT=0; sfx('enter'); startMusic(); }
    return;
  }
  if (state==='over' || state==='win'){
    stateT+=dt;
    if (stateT>.8 && tap('Enter')){ state='title'; stateT=0; }
    return;
  }
  // ---- play
  if (tap('Enter','KeyP')){ paused=!paused; }
  if (tap('KeyM')){ muted=!muted; if(master) master.gain.value=muted?0:0.5; }
  if (paused) return;
  stateT+=dt;
  if (banner){ banner.t+=dt; if(banner.t>banner.dur) banner=null; }

  updatePlayer(player, dt);
  for (const v of vehicles) updateSlug(v, dt);

  // trigger elicotteri
  for (let i=heliTriggers.length-1;i>=0;i--){
    if (player.x > heliTriggers[i]-240){
      enemies.push(mkHeli(camX+VIEW_W+40));
      heliTriggers.splice(i,1);
      sfx('alarm');
    }
  }
  // trigger boss
  if (!boss && player.x > 5560){
    boss = mkBoss(); enemies.push(boss);
    bossActive = true;
    banner = {text:'WARNING!', t:0, dur:2.2};
    sfx('alarm'); stopMusic();
    setTimeout(()=>{ if(state==='play') startMusic(); }, 1800);
  }
  if (bossDoneT>=0){
    bossDoneT += dt;
    if (winT<0 && bossDoneT>1.6){
      winT=0; score+=5000; saveBest();
      state='win'; stateT=0; stopMusic(); sfx('win');
    }
  }

  for (const e of enemies) if (!e.dead) updateEnemy(e, dt);
  enemies = enemies.filter(e=>!e.dead);

  // proiettili giocatore
  for (const b of pbullets){
    b.t+=dt; b.x+=b.vx*dt; b.y+=b.vy*dt;
    if (b.t>b.life || pointSolid(b.x,b.y)){ b.del=true; if(pointSolid(b.x,b.y)) spark(b.x,b.y,3); continue; }
    for (const e of enemies){
      if (e.dead || e.falling || (e.type==='boss'&&e.deadT>=0)) continue;
      if (!e.awake && e.type!=='boss') { if (Math.abs(e.x-b.x)<320) e.awake=true; }
      if (b.x>e.x && b.x<e.x+e.w && b.y>e.y && b.y<e.y+e.h){
        b.del=true; hurtEnemy(e,b.dmg); spark(b.x,b.y,3,'#fff'); break;
      }
    }
  }
  pbullets = pbullets.filter(b=>!b.del);

  // proiettili nemici
  for (const b of ebullets){
    b.t+=dt; b.x+=b.vx*dt; b.y+=b.vy*dt;
    if (b.t>3 || pointSolid(b.x,b.y)){ b.del=true; continue; }
    if (player.inVeh){
      const v=player.inVeh;
      if (b.x>v.x && b.x<v.x+v.w && b.y>v.y && b.y<v.y+v.h){ b.del=true; hitVehicle(v,1); }
    } else if (!player.dead && player.inv<=0 && !player.chute){
      const p=player;
      if (b.x>p.x+1 && b.x<p.x+p.w-1 && b.y>p.y+1 && b.y<p.y+p.h){ b.del=true; killPlayer(); }
    }
  }
  ebullets = ebullets.filter(b=>!b.del);

  // granate giocatore
  for (const g of grenades){
    g.t+=dt; g.vy+=480*dt; g.x+=g.vx*dt; g.y+=g.vy*dt;
    let hitE=false;
    for (const e of enemies){
      if (!e.dead && !e.falling && g.x>e.x-2 && g.x<e.x+e.w+2 && g.y>e.y-2 && g.y<e.y+e.h+2){ hitE=true; break; }
    }
    if (g.y>=GROUND-2 || pointSolid(g.x,g.y)){
      if (!g.bounced && g.vy>0 && !hitE){ g.bounced=true; g.y=Math.min(g.y,GROUND-2); g.vy*=-0.42; g.vx*=0.7; }
      else { g.del=true; boomAt(g.x,Math.min(g.y,GROUND-4),26,4,'p'); }
    } else if (hitE || g.t>2.2){ g.del=true; boomAt(g.x,g.y,26,4,'p'); }
  }
  grenades = grenades.filter(g=>!g.del);

  // colpi esplosivi (razzi / bombe / cannonate)
  for (const s of shells){
    s.t+=dt; s.vy+=s.g*dt; s.x+=s.vx*dt; s.y+=s.vy*dt;
    if (s.kind==='rocket' && Math.random()<dt*30) smoke(s.x,s.y,1);
    let det=false;
    if (s.y>=GROUND-1 || pointSolid(s.x,s.y) || s.t>3) det=true;
    if (s.from==='e' && !det){
      if (player.inVeh){
        const v=player.inVeh;
        if (s.x>v.x-2 && s.x<v.x+v.w+2 && s.y>v.y-2 && s.y<v.y+v.h+2) det=true;
      } else if (!player.dead && s.x>player.x-3 && s.x<player.x+player.w+3 && s.y>player.y-3 && s.y<player.y+player.h+3) det=true;
    }
    if (s.from==='p' && !det){
      for (const e of enemies){
        if (!e.dead && !e.falling && s.x>e.x-2 && s.x<e.x+e.w+2 && s.y>e.y-2 && s.y<e.y+e.h+2){ det=true; break; }
      }
    }
    if (det){
      s.del=true;
      const y=Math.min(s.y,GROUND-4);
      if (s.from==='p') boomAt(s.x,y,24,5,'p',true);
      else boomAt(s.x,y,s.kind==='cshell'?22:18,0,'e');
    }
  }
  shells = shells.filter(s=>!s.del);

  // POW liberati che corrono via
  for (const w of pows){
    if (!w.freed || w.done) continue;
    w.t+=dt; w.x-=55*dt; w.y = GROUND-12 - Math.abs(Math.sin(w.t*10))*3;
    if (w.t>2.4) w.done=true;
  }
  // particelle
  for (const pa of parts){
    pa.t+=dt; pa.vy+=(pa.g||0)*dt; pa.x+=pa.vx*dt; pa.y+=pa.vy*dt;
    if (pa.rot!==undefined) pa.rot+=pa.rv*dt;
    if (pa.t>pa.life) pa.del=true;
  }
  parts = parts.filter(p=>!p.del);
  for (const t of texts){ t.t+=dt; t.y-=18*dt; if(t.t>0.9) t.del=true; }
  texts = texts.filter(t=>!t.del);
  for (const b of booms){ b.t+=dt; if(b.t>b.dur) b.del=true; }
  booms = booms.filter(b=>!b.del);
  pickups = pickups.filter(i=>!i.got);

  // camera
  let target;
  if (bossActive || bossDoneT>=0) target = ARENA_CAM;
  else {
    const fx = player.dead ? player.deathX : (player.inVeh ? player.inVeh.x+10 : player.x);
    target = clamp(fx-170, 0, LEVEL_W-VIEW_W);
  }
  camX = lerp(camX, target, Math.min(1, dt*6));
}

// ------------------------------------------------------------------ render: sfondo
function drawSky(){
  const g = ctx.createLinearGradient(0,0,0,VIEW_H);
  g.addColorStop(0,'#2e1a4a'); g.addColorStop(.55,'#b14a2e'); g.addColorStop(.85,'#e8a04c');
  ctx.fillStyle=g; ctx.fillRect(0,0,VIEW_W,VIEW_H);
  // sole
  ctx.fillStyle='rgba(255,220,160,.25)'; ctx.beginPath(); ctx.arc(372,62,34,0,7); ctx.fill();
  ctx.fillStyle='#ffd9a0'; ctx.beginPath(); ctx.arc(372,62,24,0,7); ctx.fill();
  // nuvole striate
  ctx.fillStyle='rgba(255,170,110,.35)';
  for (let k=0;k<8;k++){
    const wx = k*200, off=(camX*.25)%200;
    const x = ((wx-off)%(VIEW_W+260))-130+ (hash(k)*90);
    ctx.fillRect(x, 28+hash(k+9)*70, 90+hash(k+3)*60, 3);
    ctx.fillRect(x+18, 32+hash(k+9)*70, 60, 2);
  }
  // montagne lontane
  ctx.fillStyle='#3f2a4d';
  const base1 = camX*.15;
  for (let k=Math.floor(base1/140)-1; k<base1/140+5; k++){
    const x=k*140-base1, h=42+hash(k)*52;
    ctx.beginPath(); ctx.moveTo(x-72,GROUND); ctx.lineTo(x, GROUND-h); ctx.lineTo(x+78,GROUND); ctx.fill();
  }
  // dune / rovine medie
  const base2 = camX*.4;
  for (let k=Math.floor(base2/200)-1; k<base2/200+4; k++){
    const x=k*200-base2, v=hash(k*3+1);
    ctx.fillStyle='#6e3a30';
    if (v<.55){
      ctx.beginPath(); ctx.arc(x+60, GROUND+26, 64, Math.PI, 0); ctx.fill();
    } else {
      const bw=46+v*40, bh=34+hash(k+7)*30;
      ctx.fillRect(x+20, GROUND-bh, bw, bh);
      ctx.fillRect(x+20+bw*.2, GROUND-bh-8, bw*.35, 8);
      ctx.fillStyle='#57291f';
      for (let wy=0;wy<2;wy++) for (let wxx=0;wxx<3;wxx++){
        if (hash(k*9+wy*3+wxx)>.4) ctx.fillRect(x+26+wxx*(bw/3.4), GROUND-bh+6+wy*14, 6, 8);
      }
    }
  }
}
function drawGround(){
  const x0 = Math.floor(camX/16)*16-16, x1 = camX+VIEW_W+16;
  ctx.fillStyle='#e8c98c'; ctx.fillRect(x0,GROUND,x1-x0,2);
  ctx.fillStyle='#d8a35c'; ctx.fillRect(x0,GROUND+2,x1-x0,5);
  ctx.fillStyle='#b9824a'; ctx.fillRect(x0,GROUND+7,x1-x0,VIEW_H-GROUND);
  ctx.fillStyle='#a06f3c';
  for (let x=x0;x<x1;x+=16){
    const i=x/16;
    if (hash(i)>.4) ctx.fillRect(x+hash(i+1)*12, GROUND+9+hash(i+2)*16, 3, 2);
    if (hash(i+5)>.6) ctx.fillRect(x+hash(i+3)*12, GROUND+12+hash(i+4)*10, 2, 2);
  }
  // oggetti di scena: palme e rocce
  for (let k=0;k<40;k++){
    const px = k*260+hash(k)*180;
    if (px<camX-40 || px>camX+VIEW_W+40) continue;
    if (hash(k+50)<.5){
      // palma
      const h=26+hash(k)*16;
      ctx.fillStyle='#6b4a2b'; ctx.fillRect(px, GROUND-h, 3, h);
      ctx.fillStyle='#3e5e33';
      for (let a=0;a<5;a++){
        const ang=-Math.PI/2 + (a-2)*.5;
        ctx.beginPath(); ctx.ellipse(px+1+Math.cos(ang)*9, GROUND-h+Math.sin(ang)*7, 9, 3, ang, 0, 7); ctx.fill();
      }
    } else {
      ctx.fillStyle='#8a6a42'; ctx.beginPath(); ctx.arc(px, GROUND, 5+hash(k+2)*5, Math.PI, 0); ctx.fill();
    }
  }
  // cartello
  if (300>camX-40 && 300<camX+VIEW_W+40){
    ctx.fillStyle='#6b4a2b'; ctx.fillRect(300,GROUND-18,2,18);
    ctx.fillStyle='#c2a468'; ctx.fillRect(290,GROUND-26,24,10);
    ctx.fillStyle='#3a2c18'; ctx.font='7px monospace'; ctx.fillText('BOSS→',292,GROUND-18);
  }
  // piattaforme
  for (const s of SOLIDS){
    if (!s.deco) continue;
    if (s.deco==='crate'){
      for (let cy=s.y; cy<s.y+s.h; cy+=17){
        for (let cx=s.x; cx<s.x+s.w; cx+=18){
          const w=Math.min(18,s.x+s.w-cx), h=Math.min(17,s.y+s.h-cy);
          ctx.fillStyle='#8a5a2c'; ctx.fillRect(cx,cy,w,h);
          ctx.strokeStyle='#5a3a1f'; ctx.lineWidth=1; ctx.strokeRect(cx+.5,cy+.5,w-1,h-1);
          ctx.strokeStyle='#a06f3c';
          ctx.beginPath(); ctx.moveTo(cx+2,cy+2); ctx.lineTo(cx+w-2,cy+h-2);
          ctx.moveTo(cx+w-2,cy+2); ctx.lineTo(cx+2,cy+h-2); ctx.stroke();
        }
      }
    } else {
      ctx.fillStyle='#9a948a'; ctx.fillRect(s.x,s.y,s.w,s.h);
      ctx.fillStyle='#b5afa2'; ctx.fillRect(s.x,s.y,s.w,2);
      ctx.fillStyle='#6e685e';
      for (let cx=s.x+6; cx<s.x+s.w-4; cx+=14) ctx.fillRect(cx, s.y+4, 4, 2);
    }
  }
}

// ------------------------------------------------------------------ render: attori
function drawPlayer(p){
  if (p.inVeh) return;
  if (p.inv>0 && !p.dead && Math.floor(tGlobal*14)%2===0 && !p.chute) return; // blink
  const dx = Math.round(p.x-2), dy = Math.round(p.y);
  if (p.dead){
    ctx.save(); ctx.translate(p.x+5, p.y+9); ctx.rotate(p.rot*p.dir);
    ctx.drawImage(p.dir<0?SP.pJump.l:SP.pJump.r, -7, -9); ctx.restore();
    return;
  }
  if (p.chute){
    drawSpr(SP.pJump, dx, dy, p.dir);
    ctx.fillStyle='#eee9da';
    ctx.beginPath(); ctx.arc(p.x+5, p.y-14, 12, Math.PI, 0); ctx.fill();
    ctx.strokeStyle='#c2bcab';
    ctx.beginPath();
    ctx.moveTo(p.x-7,p.y-13); ctx.lineTo(p.x+2,p.y+2);
    ctx.moveTo(p.x+17,p.y-13); ctx.lineTo(p.x+8,p.y+2);
    ctx.stroke();
    return;
  }
  let s;
  if (p.crouch) s = SP.pCrouch;
  else if (!p.onG) s = SP.pJump;
  else if (Math.abs(p.vx)>1) s = SP.pRun[Math.floor(p.anim)%3];
  else s = SP.pIdle;
  drawSpr(s, dx, p.crouch? dy+1 : dy, p.dir);
  // arma
  const cx = p.x+p.w/2;
  const U=key(...K_U), D=key(...K_D);
  ctx.fillStyle=PAL.n;
  if (U){
    ctx.fillRect(Math.round(cx+p.dir*3)-1, dy-9, 2, 10);
  } else if (!p.onG && D){
    ctx.fillRect(Math.round(cx)-1, dy+p.h-2, 2, 9);
  } else {
    const gy = p.crouch ? dy+6 : dy+8;
    ctx.fillRect(Math.round(p.dir>0? cx+3 : cx-3-9), gy, 9, 2);
  }
  if (p.muzzle){
    ctx.fillStyle='#ffd23f';
    ctx.fillRect(p.muzzle.x-2,p.muzzle.y-2,4,4);
    ctx.fillStyle='#fff'; ctx.fillRect(p.muzzle.x-1,p.muzzle.y-1,2,2);
  }
}
function drawSoldier(e){
  let s;
  if (e.type==='sold' && Math.abs(e.animV||0)>=0) s = e.anim>0 ? SP.eRun[Math.floor(e.anim)%3] : SP.eIdle;
  else s = SP.eIdle;
  drawSpr(s, Math.round(e.x-2), Math.round(e.y), e.dir);
  ctx.fillStyle=PAL.n;
  const cx=e.x+e.w/2, dy=Math.round(e.y);
  if (e.type==='baz'){
    ctx.save(); ctx.translate(cx, dy+6); ctx.rotate(e.dir>0?-.45:.45+(e.dir>0?0:Math.PI));
    ctx.fillRect(e.dir>0?-3:-11, -2, 14, 4); ctx.restore();
  } else {
    const len = e.type==='rifle' ? 11 : 7;
    ctx.fillRect(Math.round(e.dir>0? cx+3 : cx-3-len), dy+8, len, 2);
  }
  if (e.windup>=0){ ctx.fillStyle='#fff'; ctx.fillRect(cx+e.dir*7-1, dy+4, 3, 3); }
  if (e.flash>0){ ctx.fillStyle='rgba(255,255,255,.75)'; ctx.fillRect(e.x-2,e.y,14,e.h); }
}
function drawTurret(e){
  ctx.fillStyle='#23232b';
  ctx.fillRect(e.x+e.w/2-2 + (e.dir>0?0:-14), e.y+2, 16, 3);
  for (let i=0;i<4;i++){
    const bx=e.x+i*8, by=e.y+e.h-5;
    ctx.fillStyle = i%2 ? '#b59a5e' : '#a08850';
    ctx.beginPath(); ctx.ellipse(bx+5,by,6,4,0,0,7); ctx.fill();
  }
  for (let i=0;i<3;i++){
    const bx=e.x+4+i*8, by=e.y+e.h-11;
    ctx.fillStyle = i%2 ? '#a08850' : '#b59a5e';
    ctx.beginPath(); ctx.ellipse(bx+5,by,6,4,0,0,7); ctx.fill();
  }
  ctx.fillStyle='#3c3f45'; ctx.fillRect(e.x+e.w/2-5, e.y, 10, 6);
  if (e.flash>0){ ctx.fillStyle='rgba(255,255,255,.7)'; ctx.fillRect(e.x,e.y-2,e.w,e.h+2); }
}
function drawHeli(e){
  ctx.save();
  ctx.translate(e.x+e.w/2, e.y+e.h/2);
  if (e.falling) ctx.rotate(e.rot*.25);
  ctx.scale(e.dir<0?1:-1,1); // di base guarda a sinistra
  ctx.fillStyle='#44503a';
  ctx.beginPath(); ctx.ellipse(0,0,20,8,0,0,7); ctx.fill();
  ctx.fillStyle='#5a6a4c'; ctx.fillRect(8,-7,18,4);     // trave di coda
  ctx.fillStyle='#44503a'; ctx.fillRect(24,-12,3,8);    // pinna
  ctx.fillStyle='#9fc6d8'; ctx.beginPath(); ctx.arc(-10,-2,5,0,7); ctx.fill(); // abitacolo
  ctx.strokeStyle='#23232b'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(-12,8); ctx.lineTo(-12,11); ctx.moveTo(8,8); ctx.lineTo(8,11);
  ctx.moveTo(-16,11); ctx.lineTo(12,11); ctx.stroke();  // pattini
  const rw = (Math.floor(tGlobal*30)%2) ? 26 : 10;      // rotore
  ctx.fillStyle='#23232b'; ctx.fillRect(-rw,-12,rw*2,2);
  ctx.fillRect(23,-14,1,6);
  ctx.restore();
  if (e.flash>0){ ctx.fillStyle='rgba(255,255,255,.6)'; ctx.fillRect(e.x-4,e.y-8,e.w+8,e.h+12); }
}
function drawSlug(v){
  const x=Math.round(v.x), y=Math.round(v.y);
  // cingoli
  ctx.fillStyle='#2e2e36'; ctx.fillRect(x,y+12,v.w,8);
  ctx.fillStyle='#4a4a55';
  for (let i=0;i<6;i++) ctx.fillRect(x+3+((i*7+Math.floor(v.tread))%(v.w-6)), y+15, 3, 2);
  // scafo
  ctx.fillStyle = v.dead ? '#3a3a3a' : '#5e7042';
  ctx.fillRect(x+1,y+4,v.w-2,9);
  ctx.fillStyle = v.dead ? '#2a2a2a' : '#49582f';
  ctx.fillRect(x+1,y+10,v.w-2,3);
  if (!v.dead){
    // torretta
    ctx.fillStyle='#6c8050'; ctx.fillRect(x+12,y-4,18,9);
    ctx.fillStyle='#5e7042'; ctx.fillRect(x+14,y-7,12,4);
    const U = v.occ && key(...K_U);
    ctx.fillStyle='#2e2e36';
    if (U) ctx.fillRect(x+(v.dir>0?26:12), y-16, 3, 12);
    else ctx.fillRect(v.dir>0? x+28 : x-4, y-2, 18, 3);
    // stella
    ctx.fillStyle='#eee9da'; ctx.fillRect(x+5,y+6,4,4);
    if (v.occ){ ctx.fillStyle=PAL.s; ctx.fillRect(x+18,y-10,5,4); ctx.fillStyle=PAL.h; ctx.fillRect(x+18,y-12,5,2); }
  } else {
    smoke(v.x+v.w/2, v.y+4, 0);
    ctx.fillStyle='#222'; ctx.fillRect(x+10,y-2,20,6);
  }
  if (v.flash>0){ ctx.fillStyle='rgba(255,255,255,.6)'; ctx.fillRect(x-2,y-8,v.w+4,v.h+8); }
  if (!v.occ && !v.dead){
    const p=player;
    if (!p.dead && !p.inVeh && aabb(p,{x:v.x-6,y:v.y-14,w:v.w+12,h:v.h+14})){
      drawTextC('↓ SALI', v.x+v.w/2, v.y-26, '#ffd23f');
    }
  }
}
function drawBoss(b){
  const x=Math.round(b.x), y=Math.round(b.y);
  // cingoli
  ctx.fillStyle='#26262c'; ctx.fillRect(x,y+32,b.w,14);
  ctx.fillStyle='#3f3f48';
  for (let i=0;i<12;i++) ctx.fillRect(x+4+((i*9+Math.floor(b.tread))%(b.w-8)), y+38, 4, 3);
  ctx.fillStyle='#1c1c22'; ctx.fillRect(x+2,y+44,b.w-4,2);
  // scafo
  ctx.fillStyle='#5a5e66'; ctx.fillRect(x+2,y+14,b.w-4,18);
  ctx.fillStyle='#454952'; ctx.fillRect(x+2,y+26,b.w-4,6);
  ctx.fillStyle='#6e7280'; ctx.fillRect(x+2,y+14,b.w-4,3);
  ctx.fillStyle='#8e2424'; ctx.fillRect(x+2,y+19,b.w-4,2);
  // torretta
  ctx.fillStyle='#4a4e58'; ctx.fillRect(x+4,y+2,34,14);
  ctx.fillStyle='#5a5e66'; ctx.fillRect(x+6,y,30,4);
  // teschio
  ctx.fillStyle='#eee9da'; ctx.fillRect(x+56,y+18,10,8);
  ctx.fillStyle='#14141a'; ctx.fillRect(x+58,y+20,2,3); ctx.fillRect(x+62,y+20,2,3);
  // antenna
  ctx.strokeStyle='#23232b'; ctx.beginPath(); ctx.moveTo(x+36,y+2); ctx.lineTo(x+40,y-10); ctx.stroke();
  // canna principale orientabile
  ctx.save(); ctx.translate(x+10, y+8); ctx.rotate(b.barrel);
  ctx.fillStyle='#2e2e36'; ctx.fillRect(0,-3,30,6);
  ctx.fillStyle='#1c1c22'; ctx.fillRect(26,-4,5,8);
  ctx.restore();
  if (b.flash>0){ ctx.fillStyle='rgba(255,255,255,.5)'; ctx.fillRect(x-2,y-2,b.w+4,b.h+4); }
}
function drawPow(w){
  if (w.done) return;
  drawSpr(SP.pow, Math.round(w.x-1), Math.round(w.y), w.freed?-1:1);
  if (!w.freed){
    ctx.strokeStyle='#5a3a1f';
    ctx.beginPath(); ctx.moveTo(w.x,w.y+6); ctx.lineTo(w.x+11,w.y+8); ctx.stroke();
    if (Math.floor(tGlobal*2)%2===0) drawTextC('HELP!', w.x+6, w.y-10, '#fff');
  }
}
function drawPickup(it){
  const y = it.y + Math.sin(tGlobal*3+it.bob)*1.5;
  if (it.type==='M'){
    ctx.fillStyle='#ffd23f'; ctx.beginPath(); ctx.arc(it.x+6,y+5,5,0,7); ctx.fill();
    ctx.fillStyle='#d8a017'; ctx.beginPath(); ctx.arc(it.x+6,y+5,3,0,7); ctx.fill();
    return;
  }
  ctx.fillStyle='#8a5a2c'; ctx.fillRect(it.x,y,12,10);
  ctx.strokeStyle='#5a3a1f'; ctx.strokeRect(it.x+.5,y+.5,11,9);
  ctx.fillStyle = it.type==='H' ? '#c23535' : it.type==='S' ? '#ff7f2a' : '#9adb4f';
  ctx.font='bold 8px monospace'; ctx.textBaseline='top';
  ctx.fillText(it.type, it.x+3.5, y+1);
}
function drawBullets(){
  for (const b of pbullets){
    ctx.fillStyle='#ffd23f';
    if (Math.abs(b.vy)>Math.abs(b.vx)) ctx.fillRect(b.x-1,b.y-2,2,5); else ctx.fillRect(b.x-2,b.y-1,5,2);
    ctx.fillStyle='#fff'; ctx.fillRect(b.x-1,b.y-1,2,2);
  }
  for (const b of ebullets){
    ctx.fillStyle='#ff6a4a'; ctx.fillRect(b.x-2,b.y-2,4,4);
    ctx.fillStyle='#ffd9a0'; ctx.fillRect(b.x-1,b.y-1,2,2);
  }
  for (const g of grenades){
    ctx.save(); ctx.translate(g.x,g.y); ctx.rotate(g.t*9);
    ctx.fillStyle='#3a4f2c'; ctx.fillRect(-3,-4,6,8);
    ctx.fillStyle='#8a8a90'; ctx.fillRect(-1,-6,2,2);
    ctx.restore();
  }
  for (const s of shells){
    ctx.save(); ctx.translate(s.x,s.y); ctx.rotate(Math.atan2(s.vy,s.vx));
    if (s.kind==='bomb'){ ctx.fillStyle='#2e2e36'; ctx.fillRect(-4,-3,8,6); ctx.fillStyle='#5a5e66'; ctx.fillRect(-6,-2,2,4); }
    else { ctx.fillStyle = s.from==='p' ? '#d8b04a' : '#8e2424'; ctx.fillRect(-4,-2,9,4); ctx.fillStyle='#ffd23f'; ctx.fillRect(4,-1,2,2); }
    ctx.restore();
  }
}
function drawParts(){
  for (const pa of parts){
    const k = 1 - pa.t/pa.life;
    if (pa.spr){
      ctx.save(); ctx.translate(pa.x+5,pa.y+9); ctx.rotate(pa.rot); ctx.globalAlpha=Math.min(1,k*2);
      ctx.drawImage(pa.dir<0?pa.spr.l:pa.spr.r,-7,-9); ctx.restore(); ctx.globalAlpha=1;
    } else if (pa.smoke){
      ctx.globalAlpha = k*.5; ctx.fillStyle=pa.col;
      ctx.beginPath(); ctx.arc(pa.x,pa.y,pa.sz*(1.4-k*.4),0,7); ctx.fill(); ctx.globalAlpha=1;
    } else {
      ctx.globalAlpha = Math.min(1,k*1.6); ctx.fillStyle=pa.col;
      ctx.fillRect(pa.x,pa.y,pa.sz+1,pa.sz+1); ctx.globalAlpha=1;
    }
  }
}
function drawBooms(){
  for (const b of booms){
    const p = b.t/b.dur;
    const r = b.r*(.35+.85*p);
    ctx.globalAlpha = 1-p;
    ctx.fillStyle='#ff7f2a'; ctx.beginPath(); ctx.arc(b.x,b.y,r,0,7); ctx.fill();
    ctx.fillStyle='#ffd23f'; ctx.beginPath(); ctx.arc(b.x,b.y,r*.62,0,7); ctx.fill();
    if (p<.4){ ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(b.x,b.y,r*.3,0,7); ctx.fill(); }
    ctx.globalAlpha=1;
  }
}

// ------------------------------------------------------------------ testo / HUD
function drawTextC(s, x, y, col, font){
  ctx.font = font||'bold 8px monospace'; ctx.textBaseline='top';
  const w = ctx.measureText(s).width;
  drawTextO(s, x-w/2, y, col);
}
function drawTextO(s, x, y, col){
  ctx.fillStyle='#14141a';
  ctx.fillText(s,x+1,y); ctx.fillText(s,x-1,y); ctx.fillText(s,x,y+1); ctx.fillText(s,x,y-1);
  ctx.fillStyle=col; ctx.fillText(s,x,y);
}
function drawHUD(){
  ctx.font='bold 8px monospace'; ctx.textBaseline='top';
  // vite
  for (let i=0;i<Math.max(0,player.lives);i++){
    const x=6+i*9;
    ctx.fillStyle=PAL.h; ctx.fillRect(x,6,6,2);
    ctx.fillStyle=PAL.s; ctx.fillRect(x,8,6,3);
    ctx.fillStyle=PAL.w; ctx.fillRect(x,11,6,3);
  }
  drawTextO('x'+Math.max(0,player.lives), 6+Math.max(1,player.lives)*9+2, 7, '#fff');
  // granate
  ctx.fillStyle='#3a4f2c'; ctx.fillRect(6,18,5,7); ctx.fillStyle='#8a8a90'; ctx.fillRect(7,16,2,2);
  drawTextO('x'+player.grenN, 14, 18, '#fff');
  // arma
  drawTextO(weaponName(player), 6, 28, '#ffd23f');
  if (player.inVeh) drawTextO('SLUG ♥'+player.inVeh.hp+' ●'+player.inVeh.shells, 6, 38, '#9adb4f');
  // punteggio
  const sc='SCORE '+zpad(score,7);
  ctx.font='bold 8px monospace';
  drawTextO(sc, VIEW_W-6-ctx.measureText(sc).width, 7, '#fff');
  // barra boss
  if (boss && bossActive && !boss.entering){
    const bw=200, x=(VIEW_W-bw)/2, y=VIEW_H-16;
    drawTextC('STEEL RHINO', VIEW_W/2, y-10, '#ff6a4a');
    ctx.fillStyle='#14141a'; ctx.fillRect(x-2,y-2,bw+4,10);
    ctx.fillStyle='#3a3a44'; ctx.fillRect(x,y,bw,6);
    ctx.fillStyle='#c23535'; ctx.fillRect(x,y,bw*Math.max(0,boss.hp)/boss.maxHp,6);
    ctx.fillStyle='#ff8a6a'; ctx.fillRect(x,y,bw*Math.max(0,boss.hp)/boss.maxHp,2);
  }
  if (banner && state==='play'){
    const a = banner.t<.3 ? banner.t/.3 : banner.t>banner.dur-.4 ? (banner.dur-banner.t)/.4 : 1;
    ctx.globalAlpha=Math.max(0,a);
    const warn = banner.text==='WARNING!';
    drawTextC(banner.text, VIEW_W/2, 96, warn?'#ff4a3a':'#ffd23f', 'bold 22px monospace');
    ctx.globalAlpha=1;
  }
  if (paused){
    ctx.fillStyle='rgba(10,10,16,.55)'; ctx.fillRect(0,0,VIEW_W,VIEW_H);
    drawTextC('PAUSA', VIEW_W/2, 120, '#fff', 'bold 18px monospace');
    drawTextC('ENTER per riprendere', VIEW_W/2, 145, '#c2bcab');
  }
}

// ------------------------------------------------------------------ schermate
function drawTitle(){
  drawSky();
  ctx.save();
  ctx.translate(-Math.round(camX), 0);
  drawGround();
  ctx.restore();
  ctx.fillStyle='rgba(12,8,20,.45)'; ctx.fillRect(0,0,VIEW_W,VIEW_H);

  ctx.textBaseline='top';
  ctx.font='bold 44px monospace';
  const t1='METAL', t2='RUSH';
  const w1=ctx.measureText(t1).width;
  ctx.fillStyle='#14141a'; ctx.fillText(t1,(VIEW_W-w1)/2+3,40+3);
  ctx.fillStyle='#ff7f2a'; ctx.fillText(t1,(VIEW_W-w1)/2,40);
  ctx.fillStyle='#ffd23f'; ctx.fillText(t1,(VIEW_W-w1)/2,38);
  const w2=ctx.measureText(t2).width;
  ctx.fillStyle='#14141a'; ctx.fillText(t2,(VIEW_W-w2)/2+3,80+3);
  ctx.fillStyle='#c23535'; ctx.fillText(t2,(VIEW_W-w2)/2,80);
  ctx.fillStyle='#ff8a6a'; ctx.fillText(t2,(VIEW_W-w2)/2,78);

  drawTextC('MISSION 1 · TEMPESTA NEL DESERTO', VIEW_W/2, 128, '#eee9da');
  if (Math.floor(tGlobal*2)%2===0) drawTextC('PREMI ENTER', VIEW_W/2, 152, '#ffd23f', 'bold 12px monospace');
  drawTextC('Z spara · X salta · C granata · ↓ entra nel tank', VIEW_W/2, 180, '#c2bcab');
  drawTextC('Libera i prigionieri · Ruba lo SLUG · Abbatti lo STEEL RHINO', VIEW_W/2, 194, '#8a8a96');
  if (best>0) drawTextC('BEST '+zpad(best,7), VIEW_W/2, 216, '#ffd23f');

  // mascotte
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(SP.pIdle.r, 18, 150, 14*4, 18*4);
  ctx.drawImage(SP.eIdle.l, 406, 150, 14*4, 18*4);
}
function drawEnd(winMode){
  ctx.fillStyle = winMode? 'rgba(10,20,12,.6)' : 'rgba(24,8,8,.6)';
  ctx.fillRect(0,0,VIEW_W,VIEW_H);
  drawTextC(winMode?'MISSION COMPLETE!':'GAME OVER', VIEW_W/2, 86, winMode?'#9adb4f':'#ff4a3a', 'bold 26px monospace');
  drawTextC('SCORE '+zpad(score,7), VIEW_W/2, 130, '#ffd23f', 'bold 12px monospace');
  drawTextC('BEST  '+zpad(best,7), VIEW_W/2, 148, '#eee9da', 'bold 12px monospace');
  if (stateT>.8 && Math.floor(tGlobal*2)%2===0)
    drawTextC('PREMI ENTER', VIEW_W/2, 184, '#fff', 'bold 10px monospace');
}

// ------------------------------------------------------------------ render
function render(){
  ctx.setTransform(SCALE,0,0,SCALE,0,0);
  if (state==='title'){ camX=(tGlobal*18)%(LEVEL_W-VIEW_W); drawTitle(); return; }

  drawSky();
  let ox=0, oy=0;
  if (shakeT>0 && shakeDur>0){
    const k=shakeT/shakeDur;
    ox=rnd(-1,1)*shakeMag*k; oy=rnd(-1,1)*shakeMag*k;
    if (shakeT-0.016<=0){ shakeMag=0; shakeDur=0; }
  }
  ctx.save();
  ctx.translate(Math.round(-camX+ox), Math.round(oy));
  drawGround();
  for (const w of pows) drawPow(w);
  for (const it of pickups) drawPickup(it);
  for (const v of vehicles) drawSlug(v);
  for (const e of enemies){
    if (e.type==='turret') drawTurret(e);
    else if (e.type==='heli') drawHeli(e);
    else if (e.type==='boss') drawBoss(e);
    else drawSoldier(e);
  }
  drawPlayer(player);
  drawBullets();
  drawBooms();
  drawParts();
  for (const t of texts){
    ctx.globalAlpha = 1-Math.max(0,(t.t-.5)/.4);
    drawTextC(t.str, t.x, t.y, t.col);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  drawHUD();
  if (state==='over') drawEnd(false);
  if (state==='win')  drawEnd(true);
}

// ------------------------------------------------------------------ loop
buildLevel();           // così anche il titolo ha lo scenario alle spalle
let last = performance.now(), acc = 0;
const STEP = 1/60;
function frame(now){
  requestAnimationFrame(frame);   // pianificato subito: un errore non uccide il loop
  acc += Math.min(0.1, (now-last)/1000);
  last = now;
  let stepped = false;
  while (acc >= STEP){ update(STEP); acc -= STEP; stepped = true; }
  if (stepped) clearPressed();   // mai buttare i "tap" nei frame senza step
  render();
}
requestAnimationFrame(frame);

// hook di debug per test automatici (innocuo in gioco normale)
window.__MR = {
  get s(){ return { state, score, player, boss, enemies, camX, bossActive, vehicles }; },
  get input(){ return { keys: Object.assign({},keys), pressed: Object.assign({},pressed) }; },
  warp(x){ if (player){ player.x = x; player.deathX = x; camX = clamp(x-170, 0, LEVEL_W-VIEW_W); } }
};

})();
