/* ===================================================================== ENGINE
   Canvas renderer: layered rooms with parallax, shaded cartoon characters with
   a real walk cycle, gaze tracking, moods, emotes, pets, particles, camera,
   speech bubbles. Exposes window.ENGINE.
============================================================================ */
(function(){
'use strict';
const W=960,H=540,DPR=2,WORLD=1280;
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
cv.width=W*DPR;cv.height=H*DPR;
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rnd=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const lerp=(a,b,t)=>a+(b-a)*t;
const TAU=Math.PI*2;
let T=0,last=performance.now();

/* ---------------------------------------------------------------- COLORS */
function hex2rgb(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return [n>>16&255,n>>8&255,n&255];}
function shade(h,f){const [r,g,b]=hex2rgb(h);const m=f<0?0:255;const a=Math.abs(f);return 'rgb('+Math.round(lerp(r,m,a))+','+Math.round(lerp(g,m,a))+','+Math.round(lerp(b,m,a))+')';}
function rgba(h,a){const [r,g,b]=hex2rgb(h);return 'rgba('+r+','+g+','+b+','+a+')';}
function rr(c,x,y,w,h,r){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function blob(c,x,y,rx,ry){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);}
const OUT='#1e1a24';

/* ---------------------------------------------------------------- STATE */
const cam={x:W/2,y:H/2,z:1,tx:W/2,ty:H/2,tz:1,shake:0,drift:Math.random()*10};
let scene=null;
let bubble=null;
let overlayFx={flash:0,dark:0,red:0,tint:null};
let particles=[];
let emotes=[];
let floaters=[];

/* ---------------------------------------------------------------- CHARACTERS */
const SKINS=['#f6d6bd','#f0c8a0','#e8b894','#d9a57c','#c68c5a','#a5693f','#8d5a3a','#6b4226'];
const HAIRC=['#1a1a1a','#2b1d12','#4a2b1a','#6b3f1d','#a0522d','#c98a3a','#e0c070','#999999','#d8d8d8','#7a1f1f'];
const STYLES_F=['bob','long','bun','ponytail','curly','short','pixie'];
const STYLES_M=['short','buzz','side','curly','bald','short','slick'];
const SUITS=['#2f4f9e','#1f2a44','#3b3b4a','#4a2a5a','#2a4a3a','#6b2a2a','#333333','#8a5a2a','#2a5a7a'];
const DRESSES=['#b3263a','#8e5bb5','#1f6fb2','#2e7d4f','#c94f7c','#e07a3a','#333333','#4a5a8a'];

function randomLook(role,g){
  g=g||(Math.random()<.5?'f':'m');
  const L={g,skin:pick(SKINS),hair:pick(HAIRC),hairStyle:g==='f'?pick(STYLES_F):pick(STYLES_M),glasses:Math.random()<.3?pick(['round','square']):null,
    top:g==='f'?pick(DRESSES):pick(SUITS),bottom:pick(['#1f2a44','#2a2a2a','#3b3b4a','#4a3a2a','#555']),shoes:pick(['#1a1a1a','#3a2a1a','#5a2a2a']),
    tie:g==='m'&&Math.random()<.7?pick(['#f2b63a','#b3263a','#2a7a9a','#333']):null,beard:g==='m'&&Math.random()<.3,age:Math.random()<.25?'old':'adult',
    lips:g==='f'?'#b23a4a':null,hat:null,prop:null,uniform:null,blush:false};
  if(L.age==='old')L.hair=pick(['#999','#d8d8d8','#bbb']);
  switch(role){
    case 'player':L.top='#2f4f9e';L.bottom='#1f2a44';L.tie='#f2b63a';L.prop='briefcase';L.hairStyle=g==='f'?'bob':'short';break;
    case 'exec':L.top=g==='f'?pick(['#b3263a','#4a2a5a','#1f6fb2','#333']):pick(['#1f2a44','#333','#4a2a5a']);L.prop=pick(['tablet','folder','phone',null]);L.glasses=Math.random()<.5?pick(['round','square']):null;break;
    case 'reception':L.prop='headset';L.top=pick(['#3a8f7a','#2a5a7a','#8a4a6a']);break;
    case 'security':L.top='#2c3e50';L.bottom='#1b2733';L.hat='cap';L.tie=null;L.prop=Math.random()<.5?'radio':null;L.hairStyle=g==='f'?'bun':'bald';break;
    case 'assistant':L.prop='tray';L.top=pick(['#8e5bb5','#5a7ce0','#3a8f7a']);break;
    case 'tech':L.uniform='labcoat';L.glasses=pick(['round','square']);L.prop='clipboard';break;
    case 'nurse':L.uniform='scrubs';L.hat='nursecap';L.prop='clipboard';break;
    case 'soldier':L.uniform='camo';L.hat='beret';L.tie=null;L.hairStyle='buzz';break;
    case 'pilot':L.top='#1f2a44';L.hat='pilot';L.tie='#f2b63a';break;
    case 'concierge':L.top='#8a6a2a';L.hat='bellhop';L.tie=null;L.prop='keys';break;
    case 'nun':L.uniform='habit';L.hairStyle='veil';L.tie=null;L.prop='rosary';break;
    case 'rival':L.top='#2e7d4f';L.tie='#f2b63a';L.prop='briefcase2';L.hairStyle='slick';L.hair='#1a1a1a';L.beard=false;break;
    case 'boss':L.top='#111';L.tie='#b3263a';L.prop='cigar';L.age='old';L.hair='#bbb';L.hairStyle='side';break;
    case 'journalist':L.prop='camera';L.top='#8a5a2a';L.hat='press';break;
    case 'inspector':L.uniform='labcoat';L.prop='clipboard';L.hat=null;L.glasses='square';break;
    case 'kid':L.top=pick(['#e07a3a','#5a7ce0','#c94f7c']);L.bottom='#2a4a8a';L.tie=null;L.glasses=null;L.beard=false;L.age='kid';L.hairStyle=g==='f'?'ponytail':'short';L.prop=Math.random()<.5?'balloon':null;break;
    case 'courier':L.top='#f0a020';L.hat='cap';L.prop='box';L.tie=null;break;
    case 'chef':L.uniform='chef';L.hat='toque';L.tie=null;break;
    case 'worker':L.uniform='vest';L.hat='hardhat';L.tie=null;break;
    case 'ceo':L.top='#111';L.tie='#999';L.age='old';L.hair='#ccc';L.hairStyle=g==='f'?'bun':'side';L.prop='phone';break;
    case 'plumber':L.uniform='overall';L.hat='cap';L.prop='wrench';L.tie=null;break;
    case 'priest':L.uniform='cassock';L.tie=null;L.hairStyle='short';break;
  }
  return L;
}
function makeChar(o){
  const c=Object.assign({id:'x',name:'',x:400,y:470,tx:400,scale:1,facing:1,walking:false,talking:0,mood:'neutral',phase:Math.random()*TAU,nextWander:rnd(1,3),blink:0,nextBlink:rnd(1,4),gesture:0,speed:70,lock:false,range:[200,1000],look:null,sweat:0,bounce:0,extra:false,crosser:false,visible:true,gaze:{x:0,y:0}},o);
  c.look=c.look||randomLook(c.role||'random',c.g);c.g=c.look.g;
  return c;
}

/* ---- walk/idle pose */
function pose(p,t){
  const walk=p.walking,ph=t*8.5+p.phase;
  const s=walk?Math.sin(ph):0,cs=walk?Math.cos(ph):0;
  const bob=walk?Math.abs(Math.sin(ph))*4:Math.sin(t*2+p.phase)*1.8+(p.bounce>0?-Math.abs(Math.sin(t*18))*10:0);
  const liftL=walk?Math.max(0,Math.sin(ph))*12:0,liftR=walk?Math.max(0,-Math.sin(ph))*12:0;
  return {bob,lf:{x:-8+s*18,y:-liftL},rf:{x:8-s*18,y:-liftR},armL:walk?-s:0,armR:walk?s:0,lean:walk?3:0,cs};
}

/* ---- character renderer: feet at (x,y), height ≈ 180 at scale 1 */
function drawPerson(c,p,t){
  const L=p.look,sc=p.scale*(L.age==='kid'?.62:1),P=pose(p,t);
  const moodMap={neutral:0,happy:1,angry:2,sad:3,surprised:4,nervous:5,bored:6};
  const m=moodMap[p.mood]||0;
  c.save();c.translate(p.x,p.y);
  // shadow
  c.fillStyle='rgba(10,8,20,.28)';blob(c,0,2,26*sc,8*sc);c.fill();
  c.scale(p.facing*sc,sc);c.translate(0,-P.bob);
  c.lineJoin='round';c.lineCap='round';
  const top=L.uniform==='labcoat'?'#f2f2f2':L.uniform==='scrubs'?'#5fb3a1':L.uniform==='camo'?'#5a6b3a':L.uniform==='habit'||L.uniform==='cassock'?'#222':L.uniform==='chef'?'#f6f6f6':L.uniform==='vest'?'#f0a020':L.uniform==='overall'?'#3a5a9a':L.top;
  const bottom=L.uniform==='scrubs'?'#4a9a8a':L.uniform==='camo'?'#4a5a2a':L.uniform==='habit'||L.uniform==='cassock'?'#222':L.uniform==='overall'?'#3a5a9a':L.bottom;
  const limb=(x1,y1,x2,y2,x3,y3,w,col)=>{c.strokeStyle=OUT;c.lineWidth=w+4;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.lineTo(x3,y3);c.stroke();c.strokeStyle=col;c.lineWidth=w;c.stroke();};
  // legs (hip -> knee -> foot)
  const hipY=-78;
  [['l',-9,P.lf],['r',9,P.rf]].forEach(([k,hx,f])=>{
    const kx=(hx+f.x)/2+(f.y<0?10:2),ky=(hipY+f.y)/2+8;
    limb(hx,hipY,kx,ky,f.x,f.y-6,12,bottom);
    c.fillStyle=OUT;rr(c,f.x-11,f.y-9,24,11,5);c.fill();c.fillStyle=L.shoes;rr(c,f.x-9,f.y-8,20,8,4);c.fill();
  });
  if(L.uniform==='habit'||L.uniform==='cassock'){c.fillStyle=OUT;c.beginPath();c.moveTo(-26,-80);c.lineTo(26,-80);c.lineTo(34,-4);c.lineTo(-34,-4);c.closePath();c.fill();c.fillStyle='#222';c.beginPath();c.moveTo(-24,-80);c.lineTo(24,-80);c.lineTo(31,-6);c.lineTo(-31,-6);c.closePath();c.fill();}
  // torso
  const torso=()=>{c.beginPath();c.moveTo(-24,-138);c.quadraticCurveTo(-30,-110,-22,-74);c.lineTo(22,-74);c.quadraticCurveTo(30,-110,24,-138);c.quadraticCurveTo(0,-144,-24,-138);c.closePath();};
  c.fillStyle=OUT;c.save();c.translate(0,0);torso();c.lineWidth=4;c.strokeStyle=OUT;c.stroke();c.restore();
  const g=c.createLinearGradient(-24,0,24,0);g.addColorStop(0,shade(top,-.25));g.addColorStop(.45,top);g.addColorStop(1,shade(top,.12));c.fillStyle=g;torso();c.fill();
  if(L.uniform==='labcoat'){c.fillStyle='#dcdcdc';c.beginPath();c.moveTo(-3,-138);c.lineTo(3,-138);c.lineTo(3,-74);c.lineTo(-3,-74);c.fill();c.fillStyle='#3a8fd0';rr(c,8,-128,10,6,1);c.fill();}
  else if(L.uniform==='vest'){c.fillStyle='#ddd';c.fillRect(-22,-118,44,5);c.fillRect(-22,-100,44,5);}
  else if(L.uniform==='camo'){c.fillStyle='#3a4a22';for(let i=0;i<6;i++){blob(c,-14+(i*9)%28,-130+(i*17)%56,6,4);c.fill();}}
  else if(L.uniform==='chef'){c.fillStyle='#ccc';for(let i=0;i<3;i++){c.beginPath();c.arc(-8,-128+i*14,2,0,TAU);c.arc(8,-128+i*14,2,0,TAU);c.fill();}}
  else if(L.uniform==='scrubs'){c.fillStyle=shade(top,-.3);c.beginPath();c.moveTo(-8,-138);c.lineTo(0,-128);c.lineTo(8,-138);c.fill();c.fillStyle='#fff';rr(c,6,-120,14,10,1);c.fill();c.fillStyle='#e03030';c.fillRect(11,-118,4,6);c.fillRect(9,-116,8,2);}
  else if(L.uniform==='overall'){c.fillStyle='#2a4a8a';c.fillRect(-12,-138,6,30);c.fillRect(6,-138,6,30);c.fillStyle='#f0a020';rr(c,-10,-110,20,14,2);c.fill();}
  else if(L.uniform==='cassock'){c.fillStyle='#fff';c.fillRect(-7,-138,14,6);}
  else if(L.uniform!=='habit'){ // shirt + lapels
    c.fillStyle='#fff';c.beginPath();c.moveTo(-9,-138);c.lineTo(0,-108);c.lineTo(9,-138);c.closePath();c.fill();
    c.fillStyle=shade(top,-.3);c.beginPath();c.moveTo(-24,-138);c.lineTo(-9,-138);c.lineTo(-4,-100);c.lineTo(-18,-110);c.closePath();c.fill();c.beginPath();c.moveTo(24,-138);c.lineTo(9,-138);c.lineTo(4,-100);c.lineTo(18,-110);c.closePath();c.fill();
    if(L.tie){c.fillStyle=L.tie;c.beginPath();c.moveTo(0,-134);c.lineTo(-4,-110);c.lineTo(0,-96);c.lineTo(4,-110);c.closePath();c.fill();}
    else if(L.g==='f'){c.fillStyle='#f2d7a0';c.beginPath();c.arc(0,-124,3,0,TAU);c.fill();}
  }
  // arms
  const sh=-132,shx=22;
  const talk=p.talking>0;
  let hl=[-30,-78+Math.sin(t*2+p.phase)*2],hr=[30,-78+Math.sin(t*2+p.phase+1)*2];
  let el=[-28,-106],er=[28,-106];
  if(p.walking){hl=[-10+P.armL*-22,-84];hr=[10+P.armR*-22+4,-84];el=[-26+P.armL*-10,-108];er=[26+P.armR*-10,-108];}
  if(!p.walking){
    if(p.mood==='angry'){hl=[12,-104];hr=[-10,-100];el=[-30,-104];er=[30,-100];}
    else if(p.mood==='bored'){hr=[14,-120];er=[34,-110];}
    else if(p.mood==='nervous'){hl=[-6,-96];hr=[6,-96];el=[-28,-104];er=[28,-104];}
    if(talk){hr=[40,-110+Math.sin(t*7)*10];er=[36,-118];if(Math.sin(t*1.3+p.phase)>.2){hl=[-40,-100+Math.sin(t*5)*8];el=[-36,-116];}}
    if(p.gesture>0){hr=[36,-150+Math.sin(t*9)*5];er=[38,-128];}
    if(L.prop==='tray'){hl=[-22,-96];el=[-30,-108];}
    if(L.prop==='phone'&&!talk){hr=[14,-128];er=[30,-110];}
    if(L.prop==='clipboard'){hl=[-16,-98];el=[-30,-110];}
    if(L.prop==='camera'&&p.gesture>0){hl=[-6,-128];hr=[8,-128];el=[-30,-118];er=[30,-118];}
  }
  limb(-shx,sh,el[0],el[1],hl[0],hl[1],11,top);limb(shx,sh,er[0],er[1],hr[0],hr[1],11,top);
  const hand=(x,y)=>{c.fillStyle=OUT;c.beginPath();c.arc(x,y,8,0,TAU);c.fill();c.fillStyle=L.skin;c.beginPath();c.arc(x,y,6,0,TAU);c.fill();};
  hand(hl[0],hl[1]);hand(hr[0],hr[1]);
  drawProp(c,L.prop,hl,hr,t,p);
  // neck + head
  c.fillStyle=OUT;rr(c,-9,-150,18,16,4);c.fill();c.fillStyle=shade(L.skin,-.2);rr(c,-7,-148,14,14,3);c.fill();
  const hy=-168;
  drawHairBack(c,L,hy);
  c.fillStyle=OUT;blob(c,0,hy,22,24);c.fill();
  const hg=c.createRadialGradient(-6,hy-8,4,0,hy,26);hg.addColorStop(0,shade(L.skin,.12));hg.addColorStop(1,shade(L.skin,-.12));c.fillStyle=hg;blob(c,0,hy,20,22);c.fill();
  c.fillStyle=L.skin;blob(c,-20,hy+2,5,7);c.fill();c.fillStyle=OUT;c.lineWidth=2;blob(c,-20,hy+2,5,7);c.stroke();
  // face
  const gx=clamp(p.gaze.x,-1,1)*2.2*p.facing,gy=clamp(p.gaze.y,-1,1)*1.5;
  const blink=p.blink>0;
  const eye=(x)=>{c.fillStyle='#fff';blob(c,x,hy-2,5,blink?0.6:5.5-(m===1?1.2:0)-(m===6?2:0));c.fill();if(!blink){c.fillStyle='#1a1a1a';blob(c,x+gx,hy-2+gy,2.6,m===4?3.4:2.8);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(x+gx-1,hy-4+gy,.9,0,TAU);c.fill();}
    c.strokeStyle=OUT;c.lineWidth=1.5;blob(c,x,hy-2,5,blink?0.6:5.5-(m===1?1.2:0)-(m===6?2:0));c.stroke();
    if(m===2){c.fillStyle=L.skin;c.beginPath();c.moveTo(x-6,hy-9);c.lineTo(x+6,hy-4);c.lineTo(x+6,hy-10);c.closePath();c.fill();}};
  eye(4);eye(15);
  if(L.glasses){c.strokeStyle='#222';c.lineWidth=2;if(L.glasses==='round'){c.beginPath();c.arc(4,hy-2,7,0,TAU);c.stroke();c.beginPath();c.arc(15,hy-2,7,0,TAU);c.stroke();}else{c.strokeRect(-3,hy-8,14,12);c.strokeRect(9,hy-8,14,12);}c.beginPath();c.moveTo(11,hy-2);c.lineTo(9,hy-2);c.stroke();c.fillStyle='rgba(255,255,255,.18)';c.fillRect(-2,hy-7,12,10);}
  // brows
  c.strokeStyle=L.hair==='#d8d8d8'?'#777':shade(L.hair,-.1);c.lineWidth=2.6;c.beginPath();
  const by=hy-11;
  if(m===2){c.moveTo(-1,by-2);c.lineTo(8,by+2);c.moveTo(11,by+2);c.lineTo(20,by-2);}
  else if(m===4){c.moveTo(-1,by-4);c.lineTo(8,by-6);c.moveTo(11,by-6);c.lineTo(20,by-4);}
  else if(m===3||m===5){c.moveTo(-1,by+2);c.lineTo(8,by-1);c.moveTo(11,by-1);c.lineTo(20,by+2);}
  else if(m===1){c.moveTo(-1,by);c.lineTo(8,by-3);c.moveTo(11,by-3);c.lineTo(20,by);}
  else{c.moveTo(-1,by);c.lineTo(8,by-1);c.moveTo(11,by-1);c.lineTo(20,by);}
  c.stroke();
  // nose
  c.strokeStyle=shade(L.skin,-.35);c.lineWidth=1.6;c.beginPath();c.moveTo(12,hy+1);c.lineTo(14,hy+7);c.lineTo(10,hy+8);c.stroke();
  // mouth
  const my=hy+14;
  if(talk){const k=Math.floor((t*11+p.phase)%4);const o=[2,6,4,8][k];c.fillStyle='#5a1a1a';c.strokeStyle=OUT;c.lineWidth=1.5;blob(c,10,my,4+o*.3,o);c.fill();c.stroke();if(o>5){c.fillStyle='#fff';c.fillRect(7,my-o+1,7,2.5);}}
  else if(m===1){c.strokeStyle=OUT;c.lineWidth=2;c.beginPath();c.arc(9,my-3,6,.2,Math.PI-.2);c.stroke();}
  else if(m===2){c.strokeStyle=OUT;c.lineWidth=2;c.beginPath();c.arc(9,my+5,6,Math.PI+.3,-.3);c.stroke();}
  else if(m===3){c.strokeStyle=OUT;c.lineWidth=2;c.beginPath();c.arc(9,my+4,5,Math.PI+.4,-.4);c.stroke();}
  else if(m===4){c.fillStyle='#5a1a1a';blob(c,10,my,3.5,5);c.fill();}
  else if(m===5){c.strokeStyle=OUT;c.lineWidth=2;c.beginPath();c.moveTo(4,my);c.quadraticCurveTo(7,my-3,10,my);c.quadraticCurveTo(13,my+3,16,my);c.stroke();}
  else{c.strokeStyle=OUT;c.lineWidth=2;c.beginPath();c.moveTo(5,my);c.lineTo(15,my);c.stroke();}
  if(L.lips&&!talk){c.strokeStyle=L.lips;c.lineWidth=1.2;c.beginPath();c.moveTo(5,my-1);c.lineTo(15,my-1);c.stroke();}
  if(L.beard){c.fillStyle=L.hair;c.beginPath();c.moveTo(-14,hy+6);c.quadraticCurveTo(0,hy+34,18,hy+8);c.quadraticCurveTo(10,hy+20,-14,hy+6);c.fill();c.fillStyle=L.skin;blob(c,10,my,6,4);c.fill();}
  if(m===1||L.blush){c.fillStyle='rgba(230,90,110,.28)';blob(c,0,hy+8,5,3);c.fill();blob(c,19,hy+8,4,3);c.fill();}
  drawHairFront(c,L,hy);
  drawHat(c,L,hy);
  if(p.sweat>0){c.fillStyle='#8fd3ff';c.strokeStyle=OUT;c.lineWidth=1.5;const sy=hy-10+((t*40)%18);c.beginPath();c.moveTo(-18,sy-6);c.quadraticCurveTo(-24,sy+4,-18,sy+6);c.quadraticCurveTo(-12,sy+4,-18,sy-6);c.fill();c.stroke();}
  c.restore();
  // mirrored elements (not flipped): name tag
  if(p.name&&!p.extra){c.save();c.font='700 11px Nunito, sans-serif';c.textAlign='center';const w=c.measureText(p.name).width+12;c.fillStyle='rgba(20,16,30,.72)';rr(c,p.x-w/2,p.y+8,w,16,8);c.fill();c.fillStyle='#fff';c.fillText(p.name,p.x,p.y+20);c.restore();}
}
function drawHairBack(c,L,hy){
  c.fillStyle=L.hair;const s=L.hairStyle;
  if(s==='long'){c.fillStyle=OUT;rr(c,-25,hy-20,50,70,14);c.fill();c.fillStyle=L.hair;rr(c,-23,hy-18,46,66,12);c.fill();}
  if(s==='bob'){c.fillStyle=OUT;rr(c,-25,hy-22,50,54,16);c.fill();c.fillStyle=L.hair;rr(c,-23,hy-20,46,50,14);c.fill();}
  if(s==='ponytail'){c.fillStyle=OUT;rr(c,-30,hy-10,16,50,8);c.fill();c.fillStyle=L.hair;rr(c,-28,hy-8,12,46,6);c.fill();}
  if(s==='curly'){c.fillStyle=OUT;for(let i=0;i<7;i++){blob(c,-22+i*7,hy-18+Math.abs(3-i)*3,9,9);c.fill();}c.fillStyle=L.hair;for(let i=0;i<7;i++){blob(c,-22+i*7,hy-18+Math.abs(3-i)*3,7,7);c.fill();}}
  if(s==='veil'){c.fillStyle=OUT;rr(c,-28,hy-28,56,80,14);c.fill();c.fillStyle='#222';rr(c,-26,hy-26,52,76,12);c.fill();c.fillStyle='#fff';rr(c,-24,hy-24,48,14,6);c.fill();}
}
function drawHairFront(c,L,hy){
  const s=L.hairStyle;c.fillStyle=OUT;
  const cap=(ry,extra)=>{c.fillStyle=OUT;c.beginPath();c.ellipse(0,hy-8,24,ry+2,0,Math.PI,0);c.fill();c.fillStyle=L.hair;c.beginPath();c.ellipse(0,hy-8,22,ry,0,Math.PI,0);c.fill();if(extra)extra();};
  if(s==='short')cap(18,()=>{c.fillStyle=L.hair;c.beginPath();c.moveTo(-22,hy-8);c.lineTo(-22,hy+4);c.lineTo(-14,hy-6);c.fill();});
  if(s==='buzz')cap(14);
  if(s==='slick')cap(16,()=>{c.fillStyle=shade(L.hair,.3);c.beginPath();c.ellipse(-6,hy-20,10,3,-.3,0,TAU);c.fill();});
  if(s==='side')cap(16,()=>{c.fillStyle=L.hair;c.beginPath();c.moveTo(-22,hy-10);c.quadraticCurveTo(0,hy-30,22,hy-14);c.lineTo(22,hy-4);c.quadraticCurveTo(10,hy-16,-22,hy);c.fill();});
  if(s==='bob'||s==='long')cap(18,()=>{c.fillStyle=L.hair;c.beginPath();c.moveTo(-22,hy-8);c.quadraticCurveTo(-10,hy-30,14,hy-20);c.lineTo(22,hy-6);c.quadraticCurveTo(4,hy-20,-16,hy+2);c.fill();});
  if(s==='bun')cap(16,()=>{c.fillStyle=OUT;blob(c,-10,hy-28,11,10);c.fill();c.fillStyle=L.hair;blob(c,-10,hy-28,9,8);c.fill();});
  if(s==='ponytail')cap(17);
  if(s==='pixie')cap(16,()=>{c.fillStyle=L.hair;c.beginPath();c.moveTo(-20,hy-12);c.lineTo(-26,hy+2);c.lineTo(-10,hy-8);c.fill();});
  if(s==='curly'){c.fillStyle=OUT;for(let i=0;i<6;i++){blob(c,-18+i*7.5,hy-22+Math.abs(2.5-i)*2,9,9);c.fill();}c.fillStyle=L.hair;for(let i=0;i<6;i++){blob(c,-18+i*7.5,hy-22+Math.abs(2.5-i)*2,7,7);c.fill();}}
  if(s==='bald'){c.fillStyle=L.hair;blob(c,-19,hy-4,5,8);c.fill();blob(c,20,hy-4,4,7);c.fill();c.fillStyle='rgba(255,255,255,.25)';blob(c,-4,hy-16,7,3);c.fill();}
  if(s==='veil'){}
}
function drawHat(c,L,hy){
  if(!L.hat)return;c.fillStyle=OUT;
  const H=L.hat;
  if(H==='cap'){c.fillStyle=OUT;c.beginPath();c.ellipse(0,hy-12,25,16,0,Math.PI,0);c.fill();c.fillStyle='#1b2733';c.beginPath();c.ellipse(0,hy-12,23,14,0,Math.PI,0);c.fill();c.fillStyle=OUT;rr(c,-4,hy-16,36,7,3);c.fill();c.fillStyle='#1b2733';rr(c,-2,hy-15,32,5,2);c.fill();c.fillStyle='#f2b63a';rr(c,-6,hy-26,12,5,1);c.fill();}
  if(H==='nursecap'){c.fillStyle=OUT;rr(c,-16,hy-34,32,16,3);c.fill();c.fillStyle='#fff';rr(c,-14,hy-32,28,12,2);c.fill();c.fillStyle='#e03030';c.fillRect(-2,hy-30,4,8);c.fillRect(-4,hy-28,8,4);}
  if(H==='beret'){c.fillStyle=OUT;c.beginPath();c.ellipse(-4,hy-24,27,12,-.15,0,TAU);c.fill();c.fillStyle='#8a1a1a';c.beginPath();c.ellipse(-4,hy-24,25,10,-.15,0,TAU);c.fill();}
  if(H==='pilot'){c.fillStyle=OUT;rr(c,-24,hy-28,48,12,3);c.fill();c.fillStyle='#1f2a44';rr(c,-22,hy-26,44,8,2);c.fill();c.fillStyle='#f2b63a';rr(c,-6,hy-26,12,4,1);c.fill();c.fillStyle=OUT;rr(c,-6,hy-22,34,5,2);c.fill();}
  if(H==='bellhop'){c.fillStyle=OUT;rr(c,-18,hy-36,36,18,3);c.fill();c.fillStyle='#8a2a2a';rr(c,-16,hy-34,32,14,2);c.fill();c.fillStyle='#f2b63a';c.fillRect(-16,hy-22,32,2);}
  if(H==='press'){c.fillStyle=OUT;rr(c,-26,hy-22,52,10,3);c.fill();rr(c,-18,hy-34,36,14,3);c.fill();c.fillStyle='#5a4a3a';rr(c,-24,hy-20,48,6,2);c.fill();rr(c,-16,hy-32,32,12,2);c.fill();c.fillStyle='#fff';rr(c,-10,hy-30,20,7,1);c.fill();c.fillStyle='#222';c.font='900 6px Nunito';c.textAlign='center';c.fillText('PRESS',0,hy-24);}
  if(H==='toque'){c.fillStyle=OUT;rr(c,-18,hy-56,36,38,10);c.fill();c.fillStyle='#fff';rr(c,-16,hy-54,32,34,8);c.fill();}
  if(H==='hardhat'){c.fillStyle=OUT;c.beginPath();c.ellipse(0,hy-14,27,20,0,Math.PI,0);c.fill();c.fillStyle='#f2b63a';c.beginPath();c.ellipse(0,hy-14,25,18,0,Math.PI,0);c.fill();c.fillStyle=OUT;rr(c,-28,hy-16,56,5,2);c.fill();}
}
function drawProp(c,prop,hl,hr,t,p){
  if(!prop)return;
  const [lx,ly]=hl,[rx,ry]=hr;
  switch(prop){
    case 'briefcase':case 'briefcase2':c.fillStyle=OUT;rr(c,lx-15,ly+2,30,24,4);c.fill();c.fillStyle=prop==='briefcase'?'#6b3f1d':'#1b3a2a';rr(c,lx-13,ly+4,26,20,3);c.fill();c.fillStyle='#f2b63a';c.fillRect(lx-4,ly+12,8,4);break;
    case 'tray':c.fillStyle=OUT;rr(c,lx-20,ly-6,40,7,3);c.fill();c.fillStyle='#9aa';rr(c,lx-18,ly-5,36,4,2);c.fill();for(let i=0;i<2;i++){c.fillStyle=OUT;rr(c,lx-14+i*16,ly-18,14,13,3);c.fill();c.fillStyle='#fff';rr(c,lx-12+i*16,ly-16,10,10,2);c.fill();c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=1.5;c.beginPath();c.moveTo(lx-8+i*16,ly-18);c.quadraticCurveTo(lx-4+i*16+Math.sin(t*3+i)*4,ly-26,lx-8+i*16,ly-34);c.stroke();}break;
    case 'tablet':c.fillStyle=OUT;rr(c,lx-12,ly-18,24,30,3);c.fill();c.fillStyle='#8fd3ff';rr(c,lx-10,ly-16,20,26,2);c.fill();c.fillStyle='#fff';c.fillRect(lx-7,ly-12,14,2);c.fillRect(lx-7,ly-7,10,2);c.fillRect(lx-7,ly-2,12,2);break;
    case 'folder':c.fillStyle=OUT;rr(c,lx-14,ly-16,28,26,2);c.fill();c.fillStyle='#e8c070';rr(c,lx-12,ly-14,24,22,1);c.fill();break;
    case 'phone':c.fillStyle=OUT;rr(c,rx-6,ry-14,12,22,3);c.fill();c.fillStyle='#8fd3ff';rr(c,rx-4,ry-12,8,18,2);c.fill();break;
    case 'clipboard':c.fillStyle=OUT;rr(c,lx-12,ly-18,24,30,2);c.fill();c.fillStyle='#b58a5a';rr(c,lx-10,ly-16,20,26,1);c.fill();c.fillStyle='#fff';rr(c,lx-8,ly-12,16,20,1);c.fill();c.fillStyle='#888';for(let i=0;i<3;i++)c.fillRect(lx-6,ly-8+i*5,12,1.5);break;
    case 'radio':c.fillStyle=OUT;rr(c,rx-6,ry-12,12,18,2);c.fill();c.fillStyle='#333';rr(c,rx-4,ry-10,8,14,1);c.fill();c.fillRect(rx-1,ry-20,2,10);break;
    case 'keys':c.strokeStyle='#f2b63a';c.lineWidth=3;c.beginPath();c.arc(lx,ly+8,5,0,TAU);c.stroke();c.fillStyle='#f2b63a';c.fillRect(lx+3,ly+6,10,3);break;
    case 'rosary':c.strokeStyle='#8a6a3a';c.lineWidth=2;c.beginPath();c.moveTo(lx,ly);c.quadraticCurveTo(lx+4,ly+20,lx+2,ly+30);c.stroke();c.fillStyle='#f2b63a';c.fillRect(lx,ly+30,4,8);c.fillRect(lx-2,ly+32,8,3);break;
    case 'cigar':c.fillStyle='#5a3a1a';rr(c,rx-2,ry-6,16,5,2);c.fill();c.fillStyle='#ff6a2a';c.fillRect(rx+12,ry-5,3,3);c.fillStyle='rgba(200,200,200,.5)';c.beginPath();c.arc(rx+16+Math.sin(t*2)*3,ry-14-((t*20)%14),4,0,TAU);c.fill();break;
    case 'camera':c.fillStyle=OUT;rr(c,lx-14,ly-16,30,22,3);c.fill();c.fillStyle='#333';rr(c,lx-12,ly-14,26,18,2);c.fill();c.fillStyle='#222';c.beginPath();c.arc(lx+2,ly-5,6,0,TAU);c.fill();c.fillStyle='#8fd3ff';c.beginPath();c.arc(lx+2,ly-5,3,0,TAU);c.fill();break;
    case 'balloon':c.strokeStyle='#555';c.lineWidth=1;c.beginPath();c.moveTo(rx,ry);c.lineTo(rx+6+Math.sin(t*2)*4,ry-50);c.stroke();c.fillStyle=OUT;blob(c,rx+6+Math.sin(t*2)*4,ry-64,13,16);c.fill();c.fillStyle='#e0392c';blob(c,rx+6+Math.sin(t*2)*4,ry-64,11,14);c.fill();c.fillStyle='rgba(255,255,255,.4)';blob(c,rx+2+Math.sin(t*2)*4,ry-70,3,5);c.fill();break;
    case 'box':c.fillStyle=OUT;rr(c,-26,-104,52,34,2);c.fill();c.fillStyle='#c48a3f';rr(c,-24,-102,48,30,1);c.fill();c.fillStyle='#8a5a22';c.fillRect(-24,-90,48,3);break;
    case 'wrench':c.strokeStyle='#999';c.lineWidth=5;c.beginPath();c.moveTo(rx,ry);c.lineTo(rx+6,ry+24);c.stroke();c.fillStyle='#999';c.beginPath();c.arc(rx,ry-2,7,0,TAU);c.fill();break;
    case 'headset':break;
  }
  if(prop==='headset'){/* drawn on head */}
}

/* ---------------------------------------------------------------- PETS */
function makePet(kind,x){return {kind,x,y:498,tx:x,range:[150,1100],facing:1,walking:false,phase:Math.random()*6,nextWander:1,talking:0,speed:kind==='cat'?90:kind==='parrot'?160:kind==='goat'?55:kind==='pigeon'?120:70,lock:false,fly:kind==='parrot'||kind==='pigeon',alt:0,sleep:false,name:''};}
function drawPet(c,d,t){
  const walk=d.walking,bob=walk?Math.abs(Math.sin(t*12+d.phase))*3:Math.sin(t*2.5)*1.2;
  c.save();c.translate(d.x,d.y);c.fillStyle='rgba(10,8,20,.22)';blob(c,0,0,26,6);c.fill();c.scale(d.facing,1);c.translate(0,-bob-(d.fly?d.alt:0));
  c.lineCap='round';
  const outline=(fn,fill)=>{c.fillStyle=OUT;c.save();c.lineWidth=4;c.strokeStyle=OUT;fn();c.stroke();c.restore();c.fillStyle=fill;fn();c.fill();};
  if(d.kind==='dog'){
    c.strokeStyle=OUT;c.lineWidth=9;const sw=walk?Math.sin(t*12+d.phase)*7:0;c.beginPath();c.moveTo(-14,-14);c.lineTo(-14+sw,0);c.moveTo(-6,-14);c.lineTo(-6-sw,0);c.moveTo(8,-14);c.lineTo(8-sw,0);c.moveTo(16,-14);c.lineTo(16+sw,0);c.stroke();c.strokeStyle='#b89a6a';c.lineWidth=5;c.stroke();
    outline(()=>blob(c,0,-20,24,13),'#c9ad7f');
    c.strokeStyle=OUT;c.lineWidth=7;c.beginPath();c.moveTo(-22,-24);c.quadraticCurveTo(-34,-38,-24,-40);c.stroke();c.strokeStyle='#c9ad7f';c.lineWidth=4;c.stroke();
    outline(()=>c.arc(22,-30,13,0,TAU),'#c9ad7f');
    c.fillStyle='#3a2a1a';blob(c,28,-28,8,6);c.fill();c.beginPath();c.moveTo(12,-40);c.lineTo(18,-30);c.lineTo(8,-32);c.fill();c.beginPath();c.moveTo(30,-42);c.lineTo(34,-30);c.lineTo(24,-34);c.fill();
    c.fillStyle='#fff';blob(c,20,-33,3.5,d.sleep?.5:3.5);c.fill();blob(c,31,-33,3.5,d.sleep?.5:3.5);c.fill();if(!d.sleep){c.fillStyle='#000';c.beginPath();c.arc(21,-33,1.8,0,TAU);c.arc(32,-33,1.8,0,TAU);c.fill();}
    if(d.talking>0){c.fillStyle='#e07a8a';blob(c,32,-22,3,4+Math.abs(Math.sin(t*10))*2);c.fill();}
  }
  if(d.kind==='cat'){
    c.strokeStyle=OUT;c.lineWidth=7;const sw=walk?Math.sin(t*12+d.phase)*6:0;c.beginPath();c.moveTo(-12,-12);c.lineTo(-12+sw,0);c.moveTo(-4,-12);c.lineTo(-4-sw,0);c.moveTo(8,-12);c.lineTo(8-sw,0);c.moveTo(14,-12);c.lineTo(14+sw,0);c.stroke();c.strokeStyle='#555';c.lineWidth=4;c.stroke();
    outline(()=>blob(c,0,-18,22,10),'#555');
    c.strokeStyle=OUT;c.lineWidth=6;c.beginPath();c.moveTo(-20,-20);c.quadraticCurveTo(-36,-30+Math.sin(t*3)*8,-30,-44);c.stroke();c.strokeStyle='#555';c.lineWidth=3.5;c.stroke();
    outline(()=>c.arc(20,-28,10,0,TAU),'#555');
    c.fillStyle=OUT;c.beginPath();c.moveTo(12,-36);c.lineTo(14,-46);c.lineTo(20,-37);c.fill();c.beginPath();c.moveTo(22,-37);c.lineTo(27,-46);c.lineTo(29,-36);c.fill();
    c.fillStyle='#8fe08f';blob(c,17,-30,2.5,d.sleep?.5:3);c.fill();blob(c,25,-30,2.5,d.sleep?.5:3);c.fill();c.fillStyle='#000';if(!d.sleep){blob(c,17,-30,.8,2.6);c.fill();blob(c,25,-30,.8,2.6);c.fill();}
    c.strokeStyle='#ddd';c.lineWidth=1;for(let i=-1;i<=1;i++){c.beginPath();c.moveTo(24,-25+i*2);c.lineTo(36,-27+i*4);c.stroke();}
  }
  if(d.kind==='goat'){
    c.strokeStyle=OUT;c.lineWidth=8;const sw=walk?Math.sin(t*10+d.phase)*8:0;c.beginPath();c.moveTo(-16,-22);c.lineTo(-16+sw,0);c.moveTo(-6,-22);c.lineTo(-6-sw,0);c.moveTo(10,-22);c.lineTo(10-sw,0);c.moveTo(20,-22);c.lineTo(20+sw,0);c.stroke();c.strokeStyle='#ddd';c.lineWidth=5;c.stroke();
    outline(()=>blob(c,0,-30,28,15),'#eee');
    outline(()=>blob(c,26,-46,11,9),'#eee');c.fillStyle=OUT;c.beginPath();c.moveTo(20,-54);c.lineTo(16,-66);c.lineTo(24,-56);c.fill();c.beginPath();c.moveTo(30,-54);c.lineTo(34,-66);c.lineTo(26,-56);c.fill();
    c.fillStyle='#000';blob(c,30,-47,2,2.5);c.fill();c.fillStyle='#ddd';c.beginPath();c.moveTo(32,-40);c.lineTo(36,-30);c.lineTo(28,-38);c.fill();
    c.fillStyle='#e8a0a0';blob(c,36,-45,2.5,2);c.fill();
  }
  if(d.kind==='parrot'||d.kind==='pigeon'){
    const col=d.kind==='parrot'?'#e03030':'#8a8aa0',wing=d.kind==='parrot'?'#2a9a3a':'#6a6a80';
    const flap=d.fly&&(walk||d.alt>0)?Math.sin(t*22)*14:Math.sin(t*2)*2;
    c.strokeStyle=OUT;c.lineWidth=4;c.beginPath();c.moveTo(-3,-10);c.lineTo(-5,0);c.moveTo(4,-10);c.lineTo(6,0);c.stroke();c.strokeStyle='#e0a020';c.lineWidth=2;c.stroke();
    outline(()=>blob(c,0,-18,13,9),col);
    outline(()=>{c.beginPath();c.moveTo(-4,-20);c.quadraticCurveTo(-14,-22-flap,-22,-16-flap);c.lineTo(-6,-14);c.closePath();},wing);
    outline(()=>c.arc(10,-26,6,0,TAU),col);
    c.fillStyle='#e0a020';c.beginPath();c.moveTo(15,-27);c.lineTo(22,-24);c.lineTo(15,-22);c.fill();c.fillStyle='#fff';blob(c,11,-27,2,2);c.fill();c.fillStyle='#000';blob(c,11.5,-27,1,1);c.fill();
    if(d.kind==='parrot'){c.fillStyle='#2a60d0';c.beginPath();c.moveTo(-10,-20);c.lineTo(-24,-10);c.lineTo(-18,-20);c.fill();}
  }
  c.restore();
  if(d.name){c.save();c.font='700 10px Nunito';c.textAlign='center';c.fillStyle='rgba(20,16,30,.6)';const w=c.measureText(d.name).width+10;rr(c,d.x-w/2,d.y+6,w,14,7);c.fill();c.fillStyle='#fff';c.fillText(d.name,d.x,d.y+16);c.restore();}
}
function drawPoop(c,x,y,s){c.save();c.translate(x,y);c.scale(s,s);c.fillStyle=OUT;blob(c,0,-5,18,9);c.fill();c.fillStyle='#6b3f1d';blob(c,0,-5,16,7);c.fill();blob(c,0,-13,12,6);c.fill();blob(c,1,-20,8,5);c.fill();c.strokeStyle='#6b3f1d';c.lineWidth=3;c.beginPath();c.moveTo(0,-25);c.quadraticCurveTo(6,-30,4,-33);c.stroke();
  c.fillStyle='#fff';c.beginPath();c.arc(-4,-13,2.5,0,TAU);c.arc(4,-13,2.5,0,TAU);c.fill();c.fillStyle='#000';c.beginPath();c.arc(-3.5,-13,1.2,0,TAU);c.arc(4.5,-13,1.2,0,TAU);c.fill();
  c.strokeStyle='rgba(120,160,120,.8)';c.lineWidth=1.5;for(let i=-1;i<=1;i++){c.beginPath();c.moveTo(i*8,-28);c.quadraticCurveTo(i*8+3,-36,i*8,-42);c.stroke();}c.restore();}

/* ---------------------------------------------------------------- ROOMS */
/* room: {wall,floor,gloss,accent,logo,name,windows:[{x,y,w,h,view}],items:[{t,x,y,...}],weather,night,extrasRate,extraRoles,floorY} */
function drawView(c,x,y,w,h,view,t,night,weather){
  c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
  const g=c.createLinearGradient(0,y,0,y+h);
  if(night){g.addColorStop(0,'#0b1030');g.addColorStop(1,'#2a2a55');}
  else if(weather==='tramonto'){g.addColorStop(0,'#ff8a4a');g.addColorStop(1,'#ffd27a');}
  else if(weather==='pioggia'){g.addColorStop(0,'#6a7a8a');g.addColorStop(1,'#a0aab5');}
  else{g.addColorStop(0,'#5fa8ff');g.addColorStop(1,'#cfe8ff');}
  c.fillStyle=g;c.fillRect(x,y,w,h);
  if(night){c.fillStyle='#fff';for(let i=0;i<20;i++){const sx=x+((i*53)%w),sy=y+((i*37)%(h*.6));c.globalAlpha=.4+Math.abs(Math.sin(t*2+i))*.6;c.fillRect(sx,sy,2,2);}c.globalAlpha=1;c.fillStyle='#fff8d0';c.beginPath();c.arc(x+w*.8,y+h*.2,16,0,TAU);c.fill();}
  else if(weather!=='pioggia'){c.fillStyle='rgba(255,255,255,.9)';for(let i=0;i<3;i++){const cx=x+((t*10+i*140)%(w+80))-40,cy=y+20+i*28;blob(c,cx,cy,30,11);c.fill();blob(c,cx+20,cy-8,20,11);c.fill();}}
  if(view==='city'){c.fillStyle=night?'#141a30':'#2a3a4a';for(let i=0;i<Math.ceil(w/34);i++){const bh=40+((i*37)%90);c.fillRect(x+i*34,y+h-bh,28,bh);if(night){c.fillStyle='#ffe080';for(let k=0;k<4;k++)if(((i*7+k*3)%5)<3)c.fillRect(x+i*34+6+(k%2)*12,y+h-bh+10+Math.floor(k/2)*18,6,6);c.fillStyle='#141a30';}}}
  if(view==='sea'){c.fillStyle=night?'#102040':'#2a6fb0';c.fillRect(x,y+h*.55,w,h);c.strokeStyle='rgba(255,255,255,.5)';c.lineWidth=2;for(let i=0;i<5;i++){c.beginPath();const yy=y+h*.6+i*14;for(let k=0;k<=w;k+=10)c.lineTo(x+k,yy+Math.sin(k*.08+t*2+i)*3);c.stroke();}c.fillStyle='#fff';const bx=x+((t*15)%(w+60))-30;c.beginPath();c.moveTo(bx,y+h*.56);c.lineTo(bx+30,y+h*.56);c.lineTo(bx+24,y+h*.62);c.lineTo(bx+6,y+h*.62);c.fill();c.beginPath();c.moveTo(bx+15,y+h*.56);c.lineTo(bx+15,y+h*.4);c.lineTo(bx+28,y+h*.54);c.fill();}
  if(view==='park'){c.fillStyle=night?'#1a3a1a':'#5fa05a';c.fillRect(x,y+h*.6,w,h);c.fillStyle=night?'#122a12':'#2e7d4f';for(let i=0;i<Math.ceil(w/50);i++){blob(c,x+25+i*50,y+h*.55,20,26);c.fill();c.fillStyle='#5a3a1a';c.fillRect(x+22+i*50,y+h*.6,6,14);c.fillStyle=night?'#122a12':'#2e7d4f';}}
  if(view==='runway'){c.fillStyle='#555';c.fillRect(x,y+h*.65,w,h);c.fillStyle='#fff';for(let i=0;i<Math.ceil(w/40);i++)c.fillRect(x+i*40,y+h*.8,20,3);const px=x+((t*60)%(w+200))-100;c.fillStyle='#eee';blob(c,px,y+h*.35,40,8);c.fill();c.beginPath();c.moveTo(px-10,y+h*.35);c.lineTo(px-30,y+h*.2);c.lineTo(px-20,y+h*.35);c.fill();c.fillStyle='#e03030';c.fillRect(px+20,y+h*.33,14,4);}
  if(view==='mountains'){c.fillStyle=night?'#223':'#7a8aa0';for(let i=0;i<4;i++){c.beginPath();c.moveTo(x+i*w/3-40,y+h);c.lineTo(x+i*w/3+40,y+h*.3);c.lineTo(x+i*w/3+120,y+h);c.fill();}c.fillStyle='#fff';for(let i=0;i<4;i++){c.beginPath();c.moveTo(x+i*w/3+28,y+h*.42);c.lineTo(x+i*w/3+40,y+h*.3);c.lineTo(x+i*w/3+52,y+h*.42);c.fill();}}
  if(view==='zoo'){c.fillStyle='#7aa05a';c.fillRect(x,y+h*.6,w,h);c.fillStyle='#777';for(let i=0;i<Math.ceil(w/14);i++)c.fillRect(x+i*14,y+h*.3,3,h*.7);const gx=x+((t*20)%(w+40))-20;c.fillStyle='#d9b45a';c.fillRect(gx,y+h*.45,8,h*.2);blob(c,gx+4,y+h*.42,8,5);c.fill();}
  if(weather==='pioggia'){c.strokeStyle='rgba(200,220,255,.5)';c.lineWidth=1;for(let i=0;i<40;i++){const rx=x+((i*31+t*200)%w),ry=y+((i*53+t*500)%h);c.beginPath();c.moveTo(rx,ry);c.lineTo(rx-2,ry+10);c.stroke();}}
  if(weather==='neve'){c.fillStyle='#fff';for(let i=0;i<30;i++){const sx=x+((i*31+Math.sin(t+i)*20)%w),sy=y+((i*53+t*40)%h);c.beginPath();c.arc(sx,sy,2,0,TAU);c.fill();}}
  c.restore();
}
const ITEMS={
  desk(c,i,t){c.fillStyle=OUT;rr(c,i.x-2,i.y-2,i.w+4,34,8);c.fill();const g=c.createLinearGradient(0,i.y,0,i.y+30);g.addColorStop(0,shade(i.col||'#8a6a4a',.15));g.addColorStop(1,i.col||'#8a6a4a');c.fillStyle=g;rr(c,i.x,i.y,i.w,30,6);c.fill();c.fillStyle=shade(i.col||'#8a6a4a',-.3);c.fillRect(i.x+14,i.y+30,16,70);c.fillRect(i.x+i.w-30,i.y+30,16,70);
    if(i.monitor!==false){c.fillStyle=OUT;rr(c,i.x+i.w-130,i.y-62,96,64,4);c.fill();c.fillStyle='#8fd3ff';rr(c,i.x+i.w-126,i.y-58,88,54,2);c.fill();c.fillStyle='#223';c.font='700 9px Nunito';c.textAlign='left';c.fillText(i.text||'Q4 · +12%',i.x+i.w-118,i.y-40);c.fillStyle='#e05a4f';c.fillRect(i.x+i.w-118,i.y-30,20+Math.sin(t)*6,5);c.fillStyle='#3fbf7f';c.fillRect(i.x+i.w-118,i.y-22,40+Math.cos(t*.7)*8,5);c.fillStyle=OUT;c.fillRect(i.x+i.w-90,i.y-2,16,4);}
    if(i.lamp){c.fillStyle=OUT;c.fillRect(i.x+20,i.y-40,4,40);c.fillStyle='#2e7d4f';c.beginPath();c.moveTo(i.x+4,i.y-40);c.lineTo(i.x+40,i.y-40);c.lineTo(i.x+32,i.y-54);c.lineTo(i.x+12,i.y-54);c.fill();c.fillStyle='rgba(255,230,150,.35)';c.beginPath();c.moveTo(i.x+4,i.y-40);c.lineTo(i.x+40,i.y-40);c.lineTo(i.x+50,i.y);c.lineTo(i.x-6,i.y);c.fill();}
    if(i.papers){c.fillStyle='#fff';c.save();c.translate(i.x+60,i.y+6);c.rotate(-.1);c.fillRect(0,0,30,16);c.restore();c.fillRect(i.x+70,i.y+8,30,16);}},
  counter(c,i,t){c.fillStyle=OUT;rr(c,i.x-2,i.y-2,i.w+4,70,8);c.fill();const g=c.createLinearGradient(0,i.y,0,i.y+66);g.addColorStop(0,shade(i.col,.2));g.addColorStop(1,shade(i.col,-.2));c.fillStyle=g;rr(c,i.x,i.y,i.w,66,6);c.fill();c.fillStyle='rgba(255,255,255,.15)';c.fillRect(i.x+8,i.y+8,i.w-16,4);c.fillStyle='#fff';c.font='900 14px Nunito';c.textAlign='center';c.fillText(i.text||'RECEPTION',i.x+i.w/2,i.y+42);c.fillStyle=OUT;rr(c,i.x+i.w-80,i.y-34,50,34,3);c.fill();c.fillStyle='#8fd3ff';rr(c,i.x+i.w-77,i.y-31,44,26,2);c.fill();if(i.bell){c.fillStyle='#f2b63a';c.beginPath();c.arc(i.x+40,i.y-6,8,Math.PI,0);c.fill();c.fillRect(i.x+30,i.y-6,20,3);}},
  plant(c,i,t){c.fillStyle=OUT;rr(c,i.x-22,i.y-42,44,46,6);c.fill();c.fillStyle=i.pot||'#9a6a3a';rr(c,i.x-20,i.y-40,40,42,5);c.fill();c.fillStyle='#2e7d4f';for(let k=0;k<6;k++){c.save();c.translate(i.x,i.y-40);c.rotate(-1.2+k*.5+Math.sin(t*1.5+k)*.05);c.fillStyle=OUT;blob(c,0,-28,10,32);c.fill();c.fillStyle=k%2?'#2e7d4f':'#3f9f5a';blob(c,0,-28,8,30);c.fill();c.restore();}},
  elevator(c,i,t){const open=Math.max(0,Math.sin(t*.5+1))*36;c.fillStyle=OUT;rr(c,i.x-6,i.y-6,132,196,4);c.fill();c.fillStyle='#9a9aa5';rr(c,i.x,i.y,120,190,2);c.fill();c.fillStyle='#3a3a44';c.fillRect(i.x+8,i.y+10,104,180);c.fillStyle='#c8ccd4';c.fillRect(i.x+8,i.y+10,52-open,180);c.fillRect(i.x+60+open,i.y+10,52-open,180);c.fillStyle='rgba(255,255,255,.25)';c.fillRect(i.x+12,i.y+14,10,172);c.fillStyle='#222';rr(c,i.x+40,i.y-26,40,18,3);c.fill();c.fillStyle='#ff5a3a';c.font='900 11px Nunito';c.textAlign='center';c.fillText(open>2?'▲ '+(i.floor||3):'▼ 0',i.x+60,i.y-13);},
  sign(c,i,t){c.save();c.textAlign='center';c.font='900 '+(i.size||34)+'px "Luckiest Guy", Impact, sans-serif';c.lineWidth=6;c.strokeStyle=OUT;c.strokeText(i.text,i.x,i.y);c.fillStyle=i.col||'#fff';c.fillText(i.text,i.x,i.y);if(i.sub){c.font='700 12px Nunito';c.fillStyle=i.subcol||'#888';c.fillText(i.sub,i.x,i.y+20);}c.restore();},
  logo(c,i,t){const r=i.r||26;c.save();c.translate(i.x,i.y);c.fillStyle=OUT;c.beginPath();c.arc(0,0,r+3,0,TAU);c.fill();c.fillStyle=i.col;c.beginPath();c.arc(0,0,r,0,TAU);c.fill();c.fillStyle='#fff';c.strokeStyle='#fff';c.lineWidth=4;
    switch(i.shape){case 'leaf':c.beginPath();c.moveTo(-r*.5,r*.5);c.quadraticCurveTo(-r*.5,-r*.6,r*.5,-r*.5);c.quadraticCurveTo(r*.5,r*.5,-r*.5,r*.5);c.fill();break;case 'cross':c.fillRect(-r*.2,-r*.6,r*.4,r*1.2);c.fillRect(-r*.6,-r*.2,r*1.2,r*.4);break;case 'star':c.beginPath();for(let k=0;k<10;k++){const a=k*Math.PI/5-Math.PI/2,rr2=k%2?r*.3:r*.65;c.lineTo(Math.cos(a)*rr2,Math.sin(a)*rr2);}c.fill();break;case 'shield':c.beginPath();c.moveTo(-r*.5,-r*.5);c.lineTo(r*.5,-r*.5);c.lineTo(r*.5,r*.1);c.quadraticCurveTo(0,r*.7,-r*.5,r*.1);c.fill();break;case 'plane':c.beginPath();c.moveTo(-r*.6,r*.2);c.lineTo(r*.6,-r*.3);c.lineTo(r*.2,r*.1);c.lineTo(-r*.1,r*.5);c.fill();break;case 'paw':c.beginPath();c.arc(0,r*.2,r*.3,0,TAU);c.fill();for(let k=0;k<4;k++){c.beginPath();c.arc(-r*.45+k*r*.3,-r*.25-(k%3?r*.12:0),r*.12,0,TAU);c.fill();}break;case 'anchor':c.beginPath();c.arc(0,-r*.4,r*.12,0,TAU);c.stroke();c.beginPath();c.moveTo(0,-r*.3);c.lineTo(0,r*.5);c.stroke();c.beginPath();c.arc(0,r*.1,r*.45,.3,Math.PI-.3);c.stroke();break;case 'sun':c.beginPath();c.arc(0,0,r*.3,0,TAU);c.fill();for(let k=0;k<8;k++){const a=k*Math.PI/4;c.beginPath();c.moveTo(Math.cos(a)*r*.45,Math.sin(a)*r*.45);c.lineTo(Math.cos(a)*r*.7,Math.sin(a)*r*.7);c.stroke();}break;case 'dumbbell':c.fillRect(-r*.5,-r*.12,r,r*.24);c.fillRect(-r*.65,-r*.35,r*.2,r*.7);c.fillRect(r*.45,-r*.35,r*.2,r*.7);break;case 'train':c.fillRect(-r*.6,-r*.3,r*1.2,r*.6);c.fillStyle=i.col;c.fillRect(-r*.4,-r*.2,r*.3,r*.25);c.fillRect(r*.1,-r*.2,r*.3,r*.25);break;case 'guitar':c.beginPath();c.arc(-r*.1,r*.2,r*.35,0,TAU);c.fill();c.fillRect(r*.1,-r*.6,r*.12,r*.9);break;case 'cup':c.fillRect(-r*.4,-r*.3,r*.7,r*.7);c.beginPath();c.arc(r*.35,0,r*.2,-1.3,1.3);c.stroke();break;case 'wheel':c.beginPath();c.arc(0,0,r*.5,0,TAU);c.stroke();for(let k=0;k<4;k++){c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(k*Math.PI/2)*r*.5,Math.sin(k*Math.PI/2)*r*.5);c.stroke();}break;case 'book':c.fillRect(-r*.5,-r*.4,r*.45,r*.8);c.fillRect(r*.05,-r*.4,r*.45,r*.8);break;default:c.beginPath();c.arc(0,0,r*.4,0,TAU);c.fill();}
    c.restore();if(i.text){c.save();c.font='900 '+(i.size||22)+'px Nunito';c.textAlign='left';c.lineWidth=5;c.strokeStyle=OUT;c.strokeText(i.text,i.x+r+12,i.y+8);c.fillStyle=i.col;c.fillText(i.text,i.x+r+12,i.y+8);c.restore();}},
  sofa(c,i,t){c.fillStyle=OUT;rr(c,i.x-3,i.y-33,i.w+6,66,10);c.fill();c.fillStyle=shade(i.col,-.25);rr(c,i.x,i.y-30,i.w,60,8);c.fill();c.fillStyle=i.col;rr(c,i.x+6,i.y-8,i.w-12,30,6);c.fill();c.fillStyle=shade(i.col,.1);rr(c,i.x+6,i.y-26,i.w-12,22,6);c.fill();c.fillStyle=OUT;rr(c,i.x,i.y-30,14,60,6);c.fill();rr(c,i.x+i.w-14,i.y-30,14,60,6);c.fill();c.fillStyle=shade(i.col,-.1);rr(c,i.x+2,i.y-28,10,56,5);c.fill();rr(c,i.x+i.w-12,i.y-28,10,56,5);c.fill();},
  cooler(c,i,t){c.fillStyle=OUT;rr(c,i.x-16,i.y-100,32,100,4);c.fill();c.fillStyle='#ddd';rr(c,i.x-14,i.y-98,28,96,3);c.fill();c.fillStyle=OUT;rr(c,i.x-14,i.y-140,28,44,8);c.fill();c.fillStyle='#8fd3ff';rr(c,i.x-12,i.y-138,24,40,7);c.fill();c.fillStyle='rgba(255,255,255,.7)';const by=i.y-104-((t*25+i.x)%34);c.beginPath();c.arc(i.x-2+Math.sin(t*3)*3,by,3,0,TAU);c.fill();c.fillStyle='#3a8fd0';c.fillRect(i.x-10,i.y-80,8,6);c.fillStyle='#e03030';c.fillRect(i.x+2,i.y-80,8,6);},
  coffee(c,i,t){c.fillStyle=OUT;rr(c,i.x-24,i.y-90,48,90,4);c.fill();c.fillStyle='#333';rr(c,i.x-22,i.y-88,44,86,3);c.fill();c.fillStyle='#8fd3ff';rr(c,i.x-14,i.y-80,28,16,2);c.fill();c.fillStyle='#e03030';c.beginPath();c.arc(i.x-8,i.y-56,3,0,TAU);c.fill();c.fillStyle='#3fbf7f';c.beginPath();c.arc(i.x+2,i.y-56,3,0,TAU);c.fill();c.fillStyle='#111';c.fillRect(i.x-12,i.y-46,24,30);c.fillStyle='#fff';rr(c,i.x-5,i.y-26,10,9,2);c.fill();c.strokeStyle='rgba(255,255,255,.5)';c.lineWidth=1.5;c.beginPath();c.moveTo(i.x,i.y-28);c.quadraticCurveTo(i.x+4+Math.sin(t*3)*3,i.y-36,i.x,i.y-44);c.stroke();},
  vending(c,i,t){c.fillStyle=OUT;rr(c,i.x-30,i.y-130,60,130,4);c.fill();c.fillStyle='#e03030';rr(c,i.x-28,i.y-128,56,126,3);c.fill();c.fillStyle='#223';c.fillRect(i.x-22,i.y-118,44,70);const cols=['#f2b63a','#3fbf7f','#5aa9ff','#fff','#e07a3a','#c94f7c'];for(let r=0;r<3;r++)for(let k=0;k<3;k++){c.fillStyle=cols[(r*3+k)%6];c.fillRect(i.x-18+k*14,i.y-114+r*22,10,16);}c.fillStyle=Math.sin(t*3)>0?'#3fbf7f':'#1a6a3f';c.fillRect(i.x+10,i.y-40,8,8);c.fillStyle='#111';c.fillRect(i.x-22,i.y-30,44,18);},
  whiteboard(c,i,t){c.fillStyle=OUT;rr(c,i.x-4,i.y-4,i.w+8,i.h+8,4);c.fill();c.fillStyle='#fff';c.fillRect(i.x,i.y,i.w,i.h);c.fillStyle='#223';c.font='900 16px Nunito';c.textAlign='left';c.fillText(i.title||'Obiettivi Q4',i.x+14,i.y+28);c.strokeStyle='#e05a4f';c.lineWidth=3;c.beginPath();for(let k=0;k<=10;k++){const px=i.x+14+k*(i.w-28)/10,py=i.y+i.h-14-Math.abs(Math.sin(k*.9+i.x))*(i.h*.5)-k*2;k?c.lineTo(px,py):c.moveTo(px,py);}c.stroke();c.fillStyle='#3a8f7a';c.font='700 11px Nunito';c.fillText(i.note||'novità: +15%',i.x+14,i.y+i.h-20);c.fillStyle='#e03030';c.fillRect(i.x+i.w-40,i.y+i.h-8,24,6);},
  screen(c,i,t){const k=Math.floor(t/3.2)%i.slides.length,s=i.slides[k];c.fillStyle=OUT;rr(c,i.x-6,i.y-6,i.w+12,i.h+12,4);c.fill();c.fillStyle='#111';c.fillRect(i.x,i.y,i.w,i.h);c.fillStyle='#fff';c.fillRect(i.x+8,i.y+8,i.w-16,i.h-16);c.textAlign='center';c.fillStyle='#223';c.font='900 18px Nunito';c.fillText(s[0],i.x+i.w/2,i.y+i.h*.42);c.font='700 12px Nunito';c.fillStyle='#b3263a';c.fillText(s[1],i.x+i.w/2,i.y+i.h*.62);c.fillStyle='#f2b63a';c.fillRect(i.x+8,i.y+i.h-16,(i.w-16)*((t%3.2)/3.2),5);},
  table(c,i,t){c.fillStyle=OUT;c.beginPath();c.moveTo(i.x-3,i.y);c.lineTo(i.x+i.w+3,i.y);c.lineTo(i.x+i.w+60,i.y+52);c.lineTo(i.x-60,i.y+52);c.closePath();c.fill();const g=c.createLinearGradient(0,i.y,0,i.y+50);g.addColorStop(0,shade(i.col||'#8a6a4a',.15));g.addColorStop(1,i.col||'#8a6a4a');c.fillStyle=g;c.beginPath();c.moveTo(i.x,i.y);c.lineTo(i.x+i.w,i.y);c.lineTo(i.x+i.w+56,i.y+50);c.lineTo(i.x-56,i.y+50);c.closePath();c.fill();c.fillStyle=shade(i.col||'#8a6a4a',-.3);c.fillRect(i.x-56,i.y+50,i.w+112,14);c.fillStyle='#fff';for(let k=0;k<5;k++){rr(c,i.x+20+k*(i.w-60)/4,i.y+12,36,22,3);c.fill();}c.fillStyle='#f2b63a';rr(c,i.x+i.w/2-10,i.y-30,20,36,4);c.fill();c.fillStyle=OUT;c.fillRect(i.x+i.w/2-6,i.y-38,12,10);c.fillStyle='#fff';c.font='900 7px Nunito';c.textAlign='center';c.fillText('PP',i.x+i.w/2,i.y-8);},
  painting(c,i,t){c.fillStyle='#5a3a1a';rr(c,i.x-4,i.y-4,i.w+8,i.h+8,2);c.fill();c.fillStyle=OUT;c.fillRect(i.x-1,i.y-1,i.w+2,i.h+2);const g=c.createLinearGradient(0,i.y,0,i.y+i.h);g.addColorStop(0,i.a||'#6fb5ff');g.addColorStop(1,i.b||'#2e7d4f');c.fillStyle=g;c.fillRect(i.x,i.y,i.w,i.h);c.fillStyle='rgba(0,0,0,.25)';blob(c,i.x+i.w*.5,i.y+i.h*.7,i.w*.3,i.h*.15);c.fill();},
  aquarium(c,i,t){c.fillStyle=OUT;rr(c,i.x-3,i.y-3,i.w+6,i.h+6,4);c.fill();const g=c.createLinearGradient(0,i.y,0,i.y+i.h);g.addColorStop(0,'#5fb8e8');g.addColorStop(1,'#1f6fb2');c.fillStyle=g;c.fillRect(i.x,i.y,i.w,i.h);c.fillStyle='#c9a24a';c.fillRect(i.x,i.y+i.h-10,i.w,10);c.fillStyle='#2e7d4f';for(let k=0;k<3;k++){c.save();c.translate(i.x+20+k*30,i.y+i.h-10);c.rotate(Math.sin(t*2+k)*.15);c.fillRect(-2,-30,4,30);c.restore();}
    for(let k=0;k<3;k++){const fx=i.x+10+((t*(30+k*10)+k*60)%(i.w-20)),dir=Math.floor((t*(30+k*10)+k*60)/(i.w-20))%2?-1:1,fy=i.y+20+k*18+Math.sin(t*3+k)*5;c.save();c.translate(fx,fy);c.scale(dir,1);c.fillStyle=['#ff8a3a','#ffd23a','#3ad0ff'][k];blob(c,0,0,8,4);c.fill();c.beginPath();c.moveTo(-6,0);c.lineTo(-12,-4);c.lineTo(-12,4);c.fill();c.fillStyle='#000';c.beginPath();c.arc(4,-1,1,0,TAU);c.fill();c.restore();}
    c.fillStyle='rgba(255,255,255,.6)';const by=i.y+i.h-14-((t*30+i.x)%(i.h-20));c.beginPath();c.arc(i.x+i.w-14,by,2,0,TAU);c.fill();},
  flag(c,i,t){c.fillStyle=OUT;c.fillRect(i.x-2,i.y-120,4,120);c.fillStyle='#ccc';c.fillRect(i.x-1,i.y-120,2,120);const cols=i.cols||['#009246','#fff','#ce2b37'];for(let k=0;k<3;k++){c.fillStyle=cols[k];c.beginPath();for(let s=0;s<=10;s++){const px=i.x+2+k*14+s*1.4,py=i.y-118+Math.sin(t*4+s*.6+k)*2;s?c.lineTo(px,py):c.moveTo(px,py);}for(let s=10;s>=0;s--){const px=i.x+2+k*14+s*1.4,py=i.y-90+Math.sin(t*4+s*.6+k)*2;c.lineTo(px,py);}c.fill();}},
  booth(c,i,t){c.fillStyle=OUT;rr(c,i.x-3,i.y-3,i.w+6,i.h+6,4);c.fill();const g=c.createLinearGradient(0,i.y,0,i.y+i.h);g.addColorStop(0,shade(i.col,.15));g.addColorStop(1,shade(i.col,-.15));c.fillStyle=g;c.fillRect(i.x,i.y,i.w,i.h);c.fillStyle='#fff';rr(c,i.x+10,i.y+18,i.w-20,38,3);c.fill();c.fillStyle='#222';c.font='900 15px Nunito';c.textAlign='center';c.fillText(i.text,i.x+i.w/2,i.y+43);c.fillStyle='rgba(0,0,0,.18)';c.fillRect(i.x,i.y+i.h-18,i.w,18);
    if(i.balloon){const bx=i.x+i.w-20,by=i.y-30+Math.sin(t*1.5+i.x)*6;c.strokeStyle='#555';c.lineWidth=1;c.beginPath();c.moveTo(bx,by+16);c.lineTo(bx+Math.sin(t+i.x)*4,i.y+10);c.stroke();c.fillStyle=OUT;blob(c,bx,by,15,19);c.fill();c.fillStyle=i.balloon;blob(c,bx,by,13,17);c.fill();c.fillStyle='rgba(255,255,255,.4)';blob(c,bx-4,by-6,3,5);c.fill();}},
  chandelier(c,i,t){c.strokeStyle='#c9a24a';c.lineWidth=2;c.beginPath();c.moveTo(i.x,0);c.lineTo(i.x,i.y-30);c.stroke();c.fillStyle='#c9a24a';for(let k=0;k<5;k++){const a=k*TAU/5+t*.2;c.beginPath();c.arc(i.x+Math.cos(a)*30,i.y+Math.sin(a)*8,5,0,TAU);c.fill();c.fillStyle='rgba(255,240,180,.5)';c.beginPath();c.arc(i.x+Math.cos(a)*30,i.y+Math.sin(a)*8,10,0,TAU);c.fill();c.fillStyle='#c9a24a';}c.beginPath();c.arc(i.x,i.y-30,6,0,TAU);c.fill();},
  bed(c,i,t){c.fillStyle=OUT;rr(c,i.x-3,i.y-33,i.w+6,54,6);c.fill();c.fillStyle='#fff';rr(c,i.x,i.y-30,i.w,48,4);c.fill();c.fillStyle='#8fd3ff';rr(c,i.x+40,i.y-26,i.w-50,30,4);c.fill();c.fillStyle='#fff';rr(c,i.x+6,i.y-26,30,20,4);c.fill();c.fillStyle='#999';c.fillRect(i.x+4,i.y+18,6,30);c.fillRect(i.x+i.w-10,i.y+18,6,30);c.fillStyle='#223';c.fillRect(i.x+i.w+10,i.y-80,3,100);c.fillStyle='#8fd3ff';rr(c,i.x+i.w+2,i.y-100,20,30,4);c.fill();c.strokeStyle='#8fd3ff';c.lineWidth=1.5;c.beginPath();c.moveTo(i.x+i.w+12,i.y-70);c.quadraticCurveTo(i.x+i.w+30,i.y-40,i.x+i.w+20,i.y-10);c.stroke();},
  barrier(c,i,t){const up=Math.max(0,Math.sin(t*.4))*1.2;c.fillStyle=OUT;rr(c,i.x-12,i.y-70,24,70,3);c.fill();c.fillStyle='#ddd';rr(c,i.x-10,i.y-68,20,66,2);c.fill();c.save();c.translate(i.x,i.y-60);c.rotate(-up);c.fillStyle=OUT;rr(c,0,-5,i.w,10,4);c.fill();for(let k=0;k<Math.floor(i.w/20);k++){c.fillStyle=k%2?'#fff':'#e03030';c.fillRect(2+k*20,-3,18,6);}c.restore();},
  turnstile(c,i,t){c.fillStyle=OUT;rr(c,i.x-8,i.y-60,16,60,3);c.fill();c.fillStyle='#999';rr(c,i.x-6,i.y-58,12,56,2);c.fill();c.save();c.translate(i.x,i.y-40);c.rotate(t*.8);c.strokeStyle='#bbb';c.lineWidth=5;for(let k=0;k<3;k++){c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(k*2.09)*30,Math.sin(k*2.09)*10);c.stroke();}c.restore();c.fillStyle=Math.sin(t*2)>0?'#3fbf7f':'#e03030';c.beginPath();c.arc(i.x,i.y-54,3,0,TAU);c.fill();},
  shelf(c,i,t){c.fillStyle=OUT;rr(c,i.x-3,i.y-3,i.w+6,i.h+6,3);c.fill();c.fillStyle='#6a4a2a';c.fillRect(i.x,i.y,i.w,i.h);const cols=['#e05a4f','#3a8f7a','#f2b63a','#5a7ce0','#b35aa0','#fff','#223'];for(let r=0;r<3;r++){c.fillStyle='#4a3a2a';c.fillRect(i.x,i.y+r*(i.h/3)+i.h/3-4,i.w,4);for(let k=0;k<Math.floor(i.w/14);k++){c.fillStyle=cols[(r*5+k*3)%7];c.fillRect(i.x+4+k*14,i.y+r*(i.h/3)+8,9,i.h/3-14);}}},
  cage(c,i,t){c.fillStyle='#555';for(let k=0;k<Math.floor(i.w/12);k++)c.fillRect(i.x+k*12,i.y,3,i.h);c.fillRect(i.x,i.y,i.w,4);c.fillRect(i.x,i.y+i.h-4,i.w,4);const mx=i.x+i.w/2+Math.sin(t*1.2)*(i.w/2-20);c.fillStyle=OUT;blob(c,mx,i.y+i.h-30,14,16);c.fill();c.fillStyle='#8a5a3a';blob(c,mx,i.y+i.h-30,12,14);c.fill();c.fillStyle='#e8c8a0';blob(c,mx,i.y+i.h-28,7,6);c.fill();c.fillStyle='#000';c.beginPath();c.arc(mx-3,i.y+i.h-30,1.2,0,TAU);c.arc(mx+3,i.y+i.h-30,1.2,0,TAU);c.fill();c.strokeStyle='#8a5a3a';c.lineWidth=3;c.beginPath();c.moveTo(mx,i.y+i.h-16);c.quadraticCurveTo(mx+20,i.y+i.h-10+Math.sin(t*4)*10,mx+10,i.y+i.h-46);c.stroke();},
  stage(c,i,t){c.fillStyle=OUT;rr(c,i.x-3,i.y-3,i.w+6,36,4);c.fill();c.fillStyle='#333';rr(c,i.x,i.y,i.w,30,3);c.fill();for(let k=0;k<5;k++){c.fillStyle=['#e03030','#3fbf7f','#5aa9ff','#f2b63a','#c94f7c'][(k+Math.floor(t*2))%5];c.globalAlpha=.25;c.beginPath();c.moveTo(i.x+30+k*(i.w-60)/4,i.y-180);c.lineTo(i.x+k*(i.w-60)/4,i.y);c.lineTo(i.x+60+k*(i.w-60)/4,i.y);c.fill();c.globalAlpha=1;}c.fillStyle='#222';for(let k=0;k<2;k++){c.fillRect(i.x+10+k*(i.w-50),i.y-70,40,70);c.fillStyle='#111';c.beginPath();c.arc(i.x+30+k*(i.w-50),i.y-50,12,0,TAU);c.arc(i.x+30+k*(i.w-50),i.y-20,12,0,TAU);c.fill();c.fillStyle='#222';}},
  lockers(c,i,t){c.fillStyle=OUT;rr(c,i.x-3,i.y-3,i.w+6,i.h+6,3);c.fill();for(let k=0;k<Math.floor(i.w/34);k++){c.fillStyle=k%2?'#4a7ab0':'#5a8ac0';c.fillRect(i.x+k*34,i.y,32,i.h);c.fillStyle='#223';c.fillRect(i.x+k*34+22,i.y+i.h/2-6,4,12);c.fillStyle='rgba(255,255,255,.15)';c.fillRect(i.x+k*34+4,i.y+8,24,3);c.fillRect(i.x+k*34+4,i.y+16,24,3);}},
  toys(c,i,t){const cols=['#e05a4f','#3fbf7f','#5aa9ff','#f2b63a'];for(let k=0;k<4;k++){c.fillStyle=OUT;rr(c,i.x+k*30-2,i.y-26-(k%2)*18-2,28,28,5);c.fill();c.fillStyle=cols[k];rr(c,i.x+k*30,i.y-26-(k%2)*18,24,24,4);c.fill();c.fillStyle='#fff';c.font='900 14px Nunito';c.textAlign='center';c.fillText('ABCD'[k],i.x+k*30+12,i.y-8-(k%2)*18);}c.fillStyle=OUT;blob(c,i.x+140,i.y-16,18,18);c.fill();c.fillStyle='#e03030';blob(c,i.x+140,i.y-16,16,16);c.fill();c.fillStyle='#fff';c.fillRect(i.x+124,i.y-20,32,6);},
  dumbbells(c,i,t){for(let k=0;k<3;k++){const x=i.x+k*50;c.fillStyle=OUT;rr(c,x-24,i.y-14,48,8,3);c.fill();c.fillStyle='#333';rr(c,x-22,i.y-13,44,6,2);c.fill();c.fillStyle=OUT;rr(c,x-30,i.y-24,12,28,3);c.fill();rr(c,x+18,i.y-24,12,28,3);c.fill();c.fillStyle='#555';rr(c,x-28,i.y-22,8,24,2);c.fill();rr(c,x+20,i.y-22,8,24,2);c.fill();}},
  seats(c,i,t){for(let r=0;r<i.rows;r++)for(let k=0;k<i.cols;k++){const x=i.x+k*40+r*8,y=i.y+r*30;c.fillStyle=OUT;rr(c,x-2,y-28,36,32,4);c.fill();c.fillStyle=shade(i.col,r*-.1);rr(c,x,y-26,32,28,3);c.fill();}},
  bar(c,i,t){c.fillStyle=OUT;rr(c,i.x-3,i.y-3,i.w+6,74,6);c.fill();c.fillStyle='#4a2a1a';rr(c,i.x,i.y,i.w,70,4);c.fill();c.fillStyle='#8a5a3a';c.fillRect(i.x,i.y,i.w,10);for(let k=0;k<Math.floor(i.w/40);k++){c.fillStyle=['#f2b63a','#3fbf7f','#e03030','#5aa9ff'][k%4];rr(c,i.x+10+k*40,i.y-80,14,36,3);c.fill();c.fillStyle='#fff';c.fillRect(i.x+12+k*40,i.y-70,10,6);}c.fillStyle='#5a3a2a';c.fillRect(i.x-10,i.y-100,i.w+20,8);c.fillStyle='#222';rr(c,i.x+i.w-110,i.y-60,90,50,3);c.fill();c.fillStyle='#3fbf7f';c.fillRect(i.x+i.w-104,i.y-54,78,38);c.fillStyle='#fff';c.font='900 10px Nunito';c.textAlign='center';c.fillText(Math.floor(t)%2?'JUVE 1 - 1 INTER':'JUVE 1 - 1 INTER  '+(80+Math.floor(t)%10)+"'",i.x+i.w-65,i.y-32);},
  lounge(c,i,t){c.fillStyle=OUT;rr(c,i.x-3,i.y-3,i.w+6,30,3);c.fill();c.fillStyle='#223';rr(c,i.x,i.y,i.w,24,2);c.fill();c.fillStyle='#f2b63a';c.font='900 11px Nunito';c.textAlign='left';const rows=['AZ 2051 ROMA FCO   10:40  IMBARCO','LH 1842 MONACO     11:05  IN ORARIO','FR 9321 LONDRA     11:20  '+(Math.sin(t*3)>0?'RITARDO':'       ')];c.fillText(rows[Math.floor(t/2)%3],i.x+8,i.y+16);},
  gondola(c,i,t){c.fillStyle=OUT;rr(c,i.x-3,i.y-3,i.w+6,i.h+6,3);c.fill();c.fillStyle='#ddd';c.fillRect(i.x,i.y,i.w,i.h);const cols=['#e05a4f','#3a8f7a','#f2b63a','#5a7ce0','#b35aa0','#fff'];for(let r=0;r<3;r++){c.fillStyle='#bbb';c.fillRect(i.x,i.y+r*(i.h/3)+i.h/3-5,i.w,5);for(let k=0;k<Math.floor(i.w/18);k++){c.fillStyle=OUT;rr(c,i.x+4+k*18-1,i.y+r*(i.h/3)+6-1,13,i.h/3-14,2);c.fill();c.fillStyle=cols[(r+k)%6];rr(c,i.x+4+k*18,i.y+r*(i.h/3)+6,11,i.h/3-16,2);c.fill();}}c.fillStyle='#e03030';c.font='900 12px Nunito';c.textAlign='center';c.fillStyle=OUT;rr(c,i.x+i.w/2-50,i.y-24,100,20,4);c.fill();c.fillStyle='#fff';c.fillText('OFFERTA -30%',i.x+i.w/2,i.y-10);},
  tent(c,i,t){c.fillStyle='#fff';c.beginPath();c.moveTo(i.x,i.y);c.lineTo(i.x+i.w/2,i.y-120);c.lineTo(i.x+i.w,i.y);c.fill();c.strokeStyle='#ddd';c.lineWidth=2;for(let k=1;k<6;k++){c.beginPath();c.moveTo(i.x+k*i.w/6,i.y);c.lineTo(i.x+i.w/2,i.y-120);c.stroke();}for(let k=0;k<8;k++){c.fillStyle=['#f2b63a','#e05a4f','#3fbf7f','#5aa9ff'][k%4];c.beginPath();c.moveTo(i.x+k*i.w/8,i.y+2);c.lineTo(i.x+(k+.5)*i.w/8,i.y+16+Math.sin(t*3+k)*2);c.lineTo(i.x+(k+1)*i.w/8,i.y+2);c.fill();}},
  cake(c,i,t){c.fillStyle=OUT;rr(c,i.x-42,i.y-8,84,10,3);c.fill();c.fillStyle='#fff';rr(c,i.x-40,i.y-7,80,8,2);c.fill();c.fillStyle='#fff';rr(c,i.x-34,i.y-36,68,30,4);c.fill();rr(c,i.x-24,i.y-58,48,24,4);c.fill();rr(c,i.x-14,i.y-74,28,18,4);c.fill();c.fillStyle='#f5b5c5';c.fillRect(i.x-34,i.y-16,68,4);c.fillRect(i.x-24,i.y-40,48,4);c.fillStyle=OUT;rr(c,i.x-6,i.y-96,4,22,1);c.fill();rr(c,i.x+2,i.y-96,4,22,1);c.fill();c.fillStyle='#fff';c.fillRect(i.x-5,i.y-94,2,18);c.fillRect(i.x+3,i.y-94,2,18);c.fillStyle='#223';c.fillRect(i.x-8,i.y-108,4,12);c.fillRect(i.x+4,i.y-108,4,12);c.fillStyle='#f2b63a';c.fillRect(i.x-7,i.y-108,2,6);c.fillRect(i.x+5,i.y-108,2,6);},
  cart(c,i,t){c.fillStyle=OUT;rr(c,i.x-24,i.y-44,48,30,4);c.fill();c.fillStyle='#bbb';rr(c,i.x-22,i.y-42,44,26,3);c.fill();c.strokeStyle='#888';c.lineWidth=1.5;for(let k=0;k<4;k++){c.beginPath();c.moveTo(i.x-22+k*12,i.y-42);c.lineTo(i.x-22+k*12,i.y-16);c.stroke();}c.fillStyle='#223';c.beginPath();c.arc(i.x-16,i.y-8,5,0,TAU);c.arc(i.x+16,i.y-8,5,0,TAU);c.fill();c.strokeStyle='#888';c.lineWidth=3;c.beginPath();c.moveTo(i.x+22,i.y-44);c.lineTo(i.x+34,i.y-56);c.stroke();},
  clock(c,i,t){c.fillStyle=OUT;c.beginPath();c.arc(i.x,i.y,i.r+3,0,TAU);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(i.x,i.y,i.r,0,TAU);c.fill();c.strokeStyle='#222';c.lineWidth=2;const h=i.hour||10,mn=(t*2)%60;c.beginPath();c.moveTo(i.x,i.y);c.lineTo(i.x+Math.cos((h/12+mn/720)*TAU-Math.PI/2)*i.r*.5,i.y+Math.sin((h/12+mn/720)*TAU-Math.PI/2)*i.r*.5);c.stroke();c.lineWidth=1.5;c.beginPath();c.moveTo(i.x,i.y);c.lineTo(i.x+Math.cos(mn/60*TAU-Math.PI/2)*i.r*.75,i.y+Math.sin(mn/60*TAU-Math.PI/2)*i.r*.75);c.stroke();c.strokeStyle='#e03030';c.lineWidth=1;c.beginPath();c.moveTo(i.x,i.y);c.lineTo(i.x+Math.cos(t*TAU/6-Math.PI/2)*i.r*.8,i.y+Math.sin(t*TAU/6-Math.PI/2)*i.r*.8);c.stroke();},
  lights(c,i,t){for(let k=0;k<i.n;k++){const x=i.x+k*i.gap;c.fillStyle='#223';c.fillRect(x-1,0,2,20);c.fillStyle=OUT;rr(c,x-30,18,60,10,4);c.fill();c.fillStyle='#eee';rr(c,x-28,19,56,8,3);c.fill();c.fillStyle=i.flicker&&Math.sin(t*20+k)>.9?'rgba(255,240,180,.05)':'rgba(255,240,180,.1)';c.beginPath();c.moveTo(x-30,28);c.lineTo(x+30,28);c.lineTo(x+120,340);c.lineTo(x-120,340);c.fill();}},
  monitorwall(c,i,t){for(let r=0;r<2;r++)for(let k=0;k<3;k++){const x=i.x+k*74,y=i.y+r*54;c.fillStyle=OUT;rr(c,x-2,y-2,70,50,3);c.fill();c.fillStyle=(r*3+k+Math.floor(t))%4===0?'#2a8f5f':'#3fbf7f';c.fillRect(x,y,66,46);c.fillStyle='#223';c.font='700 8px Nunito';c.textAlign='center';c.fillText('CAM '+(r*3+k+1),x+33,y+28);c.fillStyle='rgba(0,0,0,.3)';c.fillRect(x+10,y+34+Math.sin(t*2+k)*4,20,6);}},
};
function drawRoom(c,R,t){
  const night=R.night,fy=R.floorY||330;
  // wall
  const wg=c.createLinearGradient(0,0,0,fy);wg.addColorStop(0,shade(R.wall,night?-.5:-.05));wg.addColorStop(1,shade(R.wall,night?-.4:.08));c.fillStyle=wg;c.fillRect(-200,-100,WORLD+400,fy+100);
  if(R.wallStyle==='panel'){c.fillStyle='rgba(0,0,0,.06)';for(let k=0;k<WORLD/120;k++)c.fillRect(k*120,0,2,fy);c.fillRect(0,fy-60,WORLD,3);}
  if(R.wallStyle==='brick'){c.fillStyle='rgba(0,0,0,.08)';for(let r=0;r<fy/22;r++){for(let k=0;k<WORLD/44;k++)c.fillRect(k*44+(r%2)*22,r*22,42,20);}}
  if(R.wallStyle==='tile'){c.strokeStyle='rgba(0,0,0,.08)';c.lineWidth=1;for(let k=0;k<WORLD/40;k++){c.beginPath();c.moveTo(k*40,0);c.lineTo(k*40,fy);c.stroke();}for(let r=0;r<fy/40;r++){c.beginPath();c.moveTo(0,r*40);c.lineTo(WORLD,r*40);c.stroke();}}
  if(R.wallStyle==='stripes'){c.fillStyle='rgba(255,255,255,.08)';for(let k=0;k<WORLD/60;k++)c.fillRect(k*60,0,30,fy);}
  if(R.wallStyle==='glass'){c.fillStyle='rgba(255,255,255,.12)';for(let k=0;k<WORLD/90;k++)c.fillRect(k*90,0,4,fy);c.fillStyle='rgba(0,0,0,.1)';c.fillRect(0,fy-8,WORLD,8);}
  if(R.wallStyle==='sky'){const sg=c.createLinearGradient(0,0,0,fy);sg.addColorStop(0,night?'#0b1030':R.weather==='tramonto'?'#ff8a4a':'#5fa8ff');sg.addColorStop(1,night?'#2a2a55':R.weather==='tramonto'?'#ffd27a':'#cfe8ff');c.fillStyle=sg;c.fillRect(-200,-100,WORLD+400,fy+100);c.fillStyle='rgba(255,255,255,.9)';for(let i=0;i<5;i++){const cx=((t*12+i*300)%(WORLD+200))-100,cy=40+i*45;blob(c,cx,cy,50,16);c.fill();blob(c,cx+36,cy-12,34,16);c.fill();}}
  // skirting
  c.fillStyle='rgba(0,0,0,.12)';c.fillRect(-200,fy-10,WORLD+400,10);
  // windows
  (R.windows||[]).forEach(w=>{c.fillStyle=OUT;rr(c,w.x-8,w.y-8,w.w+16,w.h+16,4);c.fill();drawView(c,w.x,w.y,w.w,w.h,w.view,t,night,R.weather);c.fillStyle='rgba(255,255,255,.18)';c.beginPath();c.moveTo(w.x,w.y);c.lineTo(w.x+w.w*.35,w.y);c.lineTo(w.x,w.y+w.h*.6);c.fill();c.fillStyle=OUT;c.fillRect(w.x+w.w/2-3,w.y,6,w.h);c.fillRect(w.x,w.y+w.h/2-3,w.w,6);
    if(!night){c.fillStyle='rgba(255,240,200,.08)';c.beginPath();c.moveTo(w.x,w.y+w.h);c.lineTo(w.x+w.w,w.y+w.h);c.lineTo(w.x+w.w+120,fy+200);c.lineTo(w.x-120,fy+200);c.fill();}});
  // floor
  const fg=c.createLinearGradient(0,fy,0,H+60);fg.addColorStop(0,shade(R.floor,night?-.3:.12));fg.addColorStop(1,shade(R.floor,night?-.55:-.25));c.fillStyle=fg;c.fillRect(-200,fy,WORLD+400,H-fy+100);
  if(R.floorStyle==='tiles'){c.strokeStyle='rgba(0,0,0,.1)';c.lineWidth=1;for(let r=0;r<8;r++){c.beginPath();c.moveTo(-200,fy+r*r*4+r*10);c.lineTo(WORLD+200,fy+r*r*4+r*10);c.stroke();}for(let k=-6;k<WORLD/70+6;k++){c.beginPath();c.moveTo(k*70,fy);c.lineTo(k*70-(k*70-WORLD/2)*.5,H+60);c.stroke();}}
  if(R.floorStyle==='wood'){c.strokeStyle='rgba(0,0,0,.1)';c.lineWidth=1;for(let r=0;r<12;r++){c.beginPath();c.moveTo(-200,fy+r*18);c.lineTo(WORLD+200,fy+r*18);c.stroke();}}
  if(R.floorStyle==='carpet'){c.fillStyle='rgba(255,255,255,.05)';for(let r=0;r<9;r++)for(let k=0;k<WORLD/40;k++)if((r+k)%2)c.fillRect(k*40,fy+r*24,40,24);}
  if(R.floorStyle==='grass'){c.fillStyle='rgba(0,0,0,.12)';for(let k=0;k<200;k++){const gx=(k*131)%WORLD,gy=fy+(k*71)%(H-fy);c.fillRect(gx,gy,2,5);}}
  if(R.floorStyle==='marble'){c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=1.5;for(let k=0;k<10;k++){c.beginPath();c.moveTo(k*140,fy+10);c.quadraticCurveTo(k*140+60,fy+100,k*140+20,H+40);c.stroke();}}
  // items
  (R.items||[]).forEach(i=>{if(ITEMS[i.t])ITEMS[i.t](c,i,t);});
}

/* ---------------------------------------------------------------- BUBBLES */
function wrap(c,text,max){const words=text.split(' ');const lines=[];let cur='';words.forEach(w=>{const test=cur?cur+' '+w:w;if(c.measureText(test).width>max&&cur){lines.push(cur);cur=w;}else cur=test;});if(cur)lines.push(cur);return lines;}
function drawBubble(c,b,t){
  const who=b.char;if(!who)return;
  const full=b.text;const shown=Math.min(full.length,Math.floor((t-b.t0)*42));const txt=full.slice(0,shown);
  c.save();c.font='700 14px Nunito, sans-serif';const lines=wrap(c,txt,250);const lw=Math.max(60,...wrap(c,full,250).map(l=>c.measureText(l).width))+28;const lh=19,bh=lines.length*lh+18;
  const hx=who.x,hy=who.y-185*(who.scale||1)*(who.look&&who.look.age==='kid'?.62:1);
  let bx=clamp(hx-lw/2,cam.x-W/2/cam.z+10,cam.x+W/2/cam.z-lw-10),by=hy-bh-16;
  c.fillStyle=OUT;rr(c,bx-2,by-2,lw+4,bh+4,12);c.fill();c.fillStyle='#fffdf6';rr(c,bx,by,lw,bh,10);c.fill();
  c.fillStyle='#fffdf6';c.beginPath();c.moveTo(hx-8,by+bh-1);c.lineTo(hx+8,by+bh-1);c.lineTo(hx,by+bh+12);c.closePath();c.fill();c.strokeStyle=OUT;c.lineWidth=2;c.beginPath();c.moveTo(hx-8,by+bh);c.lineTo(hx,by+bh+12);c.lineTo(hx+8,by+bh);c.stroke();
  c.fillStyle='#1c1a17';c.textAlign='left';lines.forEach((l,i)=>c.fillText(l,bx+14,by+14+i*lh+4));
  c.restore();
}

/* ---------------------------------------------------------------- EMOTES / PARTICLES */
function drawEmote(c,e,t){
  const a=Math.min(1,e.life*2),y=e.y-(1.2-e.life)*30;c.save();c.globalAlpha=a;c.translate(e.x,y);c.scale(1.1,1.1);
  switch(e.kind){
    case 'heart':c.fillStyle='#e0395a';c.beginPath();c.moveTo(0,8);c.bezierCurveTo(-14,-4,-8,-16,0,-8);c.bezierCurveTo(8,-16,14,-4,0,8);c.fill();break;
    case 'fire':c.fillStyle='#ff6a2a';c.beginPath();c.moveTo(0,-14);c.quadraticCurveTo(12,-2,6,8);c.quadraticCurveTo(0,14,-6,8);c.quadraticCurveTo(-12,-2,0,-14);c.fill();c.fillStyle='#ffd23a';blob(c,0,4,4,6);c.fill();break;
    case 'angry':c.strokeStyle='#e0392c';c.lineWidth=3;for(let k=0;k<4;k++){const ang=k*Math.PI/2+Math.PI/4;c.beginPath();c.moveTo(Math.cos(ang)*4,Math.sin(ang)*4);c.lineTo(Math.cos(ang)*12,Math.sin(ang)*12);c.stroke();}break;
    case 'money':c.fillStyle='#3fbf7f';c.font='900 20px Nunito';c.textAlign='center';c.strokeStyle=OUT;c.lineWidth=3;c.strokeText('€',0,7);c.fillText('€',0,7);break;
    case 'zzz':c.fillStyle='#8fa0c0';c.font='900 16px Nunito';c.textAlign='center';c.fillText('z',0,0);c.font='900 11px Nunito';c.fillText('z',8,-10);break;
    case 'question':c.fillStyle='#f2b63a';c.font='900 22px Nunito';c.textAlign='center';c.strokeStyle=OUT;c.lineWidth=3;c.strokeText('?',0,8);c.fillText('?',0,8);break;
    case 'sweat':c.fillStyle='#8fd3ff';c.beginPath();c.moveTo(0,-10);c.quadraticCurveTo(8,4,0,8);c.quadraticCurveTo(-8,4,0,-10);c.fill();break;
    case 'laugh':c.fillStyle='#f2b63a';c.font='900 16px Nunito';c.textAlign='center';c.fillText('AH AH',0,4);break;
    case 'star':c.fillStyle='#ffd23a';c.beginPath();for(let k=0;k<10;k++){const ang=k*Math.PI/5-Math.PI/2,r=k%2?4:10;c.lineTo(Math.cos(ang)*r,Math.sin(ang)*r);}c.fill();break;
    case 'skull':c.fillStyle='#eee';c.beginPath();c.arc(0,-2,8,0,TAU);c.fill();c.fillRect(-5,4,10,5);c.fillStyle='#222';c.beginPath();c.arc(-3,-3,2.5,0,TAU);c.arc(3,-3,2.5,0,TAU);c.fill();break;
  }
  c.restore();
}

/* ---------------------------------------------------------------- UPDATE */
let extraTimer=1,speakerId=null;
function spawnExtra(){
  const R=scene.room;const roles=R.extraRoles||['random'];const fromLeft=Math.random()<.5,back=Math.random()<.45;
  const role=pick(roles);
  const e=makeChar({id:'extra',name:'',role,x:fromLeft?-80:WORLD+80,y:back?R.floorY+50:R.floorY+170,scale:back?.72:1,facing:fromLeft?1:-1,walking:true,speed:rnd(50,110),extra:true});
  if(role==='kid'){e.y=R.floorY+160;e.speed=rnd(90,140);}
  scene.extras.push(e);
}
function update(dt){
  T+=dt;if(!scene)return;
  const R=scene.room;
  if(R.extrasRate>0){extraTimer-=dt;if(extraTimer<=0){spawnExtra();extraTimer=rnd(1.2,3.5)/(R.extrasRate/2);}}
  scene.extras.forEach(e=>{e.x+=e.facing*e.speed*dt;});scene.extras=scene.extras.filter(e=>e.x>-120&&e.x<WORLD+120);
  const tu=scene.cast.find(c=>c.id==='tu');
  scene.cast.concat(scene.extras).forEach(p=>{
    p.nextBlink-=dt;if(p.nextBlink<=0){p.blink=.12;p.nextBlink=rnd(1.5,5);}if(p.blink>0)p.blink-=dt;
    if(p.talking>0)p.talking-=dt;if(p.gesture>0)p.gesture-=dt;if(p.sweat>0)p.sweat-=dt;if(p.bounce>0)p.bounce-=dt;
    // gaze
    let target=null;if(p.extra){target=null;}else if(speakerId&&p.id!==speakerId){target=scene.cast.find(c=>c.id===speakerId);}else if(p.id!=='tu'){target=tu;}
    const gx=target?clamp((target.x-p.x)/300,-1,1):Math.sin(T*.7+p.phase)*.3,gy=target?clamp((target.y-p.y)/200,-1,1):0;
    p.gaze.x=lerp(p.gaze.x,gx,dt*6);p.gaze.y=lerp(p.gaze.y,gy,dt*6);
    if(p.extra)return;
    if(p.crosser){
      if(!p.walking){p.nextWander-=dt;if(p.nextWander<=0){p.walking=true;p.x=Math.random()<.5?-80:WORLD+80;p.facing=p.x<0?1:-1;p.tx=p.x<0?WORLD+80:-80;}}
      else{p.x+=p.facing*p.speed*dt;if((p.facing>0&&p.x>=p.tx)||(p.facing<0&&p.x<=p.tx)){p.walking=false;p.nextWander=rnd(7,16);}}
      return;
    }
    if(p.lock){p.walking=false;return;}
    if(p.walking){const d=p.tx-p.x;const step=p.speed*dt;if(Math.abs(d)<=step){p.x=p.tx;p.walking=false;p.nextWander=rnd(1.5,5);if(p.onArrive){const f=p.onArrive;p.onArrive=null;f();}}else{p.x+=Math.sign(d)*step;p.facing=Math.sign(d);}}
    else{p.nextWander-=dt;if(p.nextWander<=0&&!reduceMotion&&!p.still){p.tx=clamp(rnd(p.range[0],p.range[1]),40,WORLD-40);p.walking=Math.abs(p.tx-p.x)>15;}
      if(p.id!=='tu'&&tu&&Math.random()<.03)p.facing=Math.sign(tu.x-p.x)||1;
      else if(p.id==='tu'&&speakerId&&speakerId!=='tu'){const sp=scene.cast.find(c=>c.id===speakerId);if(sp)p.facing=Math.sign(sp.x-p.x)||1;}
    }
  });
  scene.pets.forEach(d=>{if(d.talking>0)d.talking-=dt;if(d.sleep)return;
    if(d.walking){const dd=d.tx-d.x,st=d.speed*dt;if(Math.abs(dd)<=st){d.x=d.tx;d.walking=false;d.nextWander=rnd(1,4);if(d.fly)d.alt=0;}else{d.x+=Math.sign(dd)*st;d.facing=Math.sign(dd);if(d.fly)d.alt=Math.min(120,d.alt+dt*200);}}
    else{d.nextWander-=dt;if(d.nextWander<=0&&!d.lock){d.tx=rnd(d.range[0],d.range[1]);d.walking=true;}}});
  if(scene.poop){scene.poop.life-=dt;if(scene.poop.life<=0)scene.poop=null;}
  particles.forEach(s=>{s.x+=s.vx*dt;s.y+=s.vy*dt;s.vy+=(s.g||20)*dt;s.life-=dt;});particles=particles.filter(s=>s.life>0);
  emotes.forEach(e=>e.life-=dt);emotes=emotes.filter(e=>e.life>0);
  if(scene.stain&&scene.stain.fade){scene.stain.a-=dt*.8;if(scene.stain.a<=0)scene.stain=null;}
  // camera
  cam.drift+=dt;
  const dz=reduceMotion?1:cam.tz;
  cam.x=lerp(cam.x,cam.tx+(reduceMotion?0:Math.sin(cam.drift*.3)*6),dt*1.6);cam.y=lerp(cam.y,cam.ty,dt*1.6);cam.z=lerp(cam.z,dz,dt*1.4);
  if(cam.shake>0)cam.shake-=dt;
  overlayFx.flash=Math.max(0,overlayFx.flash-dt*2);overlayFx.red=Math.max(0,overlayFx.red-dt*.5);
  if(overlayFx.darkTarget!=null)overlayFx.dark=lerp(overlayFx.dark,overlayFx.darkTarget,dt*3);
}

/* ---------------------------------------------------------------- DRAW */
function draw(){
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,W,H);
  if(!scene){ctx.fillStyle='#141a2b';ctx.fillRect(0,0,W,H);return;}
  const R=scene.room;
  ctx.save();
  const sx=cam.shake>0?rnd(-6,6)*cam.shake:0,sy=cam.shake>0?rnd(-4,4)*cam.shake:0;
  ctx.translate(W/2+sx,H/2+sy);ctx.scale(cam.z,cam.z);ctx.translate(-cam.x,-cam.y);
  // parallax background: shift wall by a fraction
  ctx.save();ctx.translate((cam.x-W/2)*.12,0);drawRoom(ctx,R,T);ctx.restore();
  if(scene.stain){ctx.fillStyle='rgba(70,40,20,'+scene.stain.a+')';blob(ctx,scene.stain.x,scene.stain.y,36,10);ctx.fill();}
  const layer=[];
  scene.extras.forEach(p=>layer.push({p,z:p.y}));scene.cast.forEach(p=>{if(p.visible!==false)layer.push({p,z:p.y});});
  scene.pets.forEach(d=>layer.push({pet:d,z:d.y}));if(scene.poop)layer.push({poop:scene.poop,z:scene.poop.y});
  layer.sort((a,b)=>a.z-b.z);
  layer.forEach(l=>{
    if(l.pet)drawPet(ctx,l.pet,T);
    else if(l.poop)drawPoop(ctx,l.poop.x,l.poop.y,l.poop.s);
    else{ if(R.gloss&&!reduceMotion){ctx.save();ctx.globalAlpha=.13;ctx.translate(l.p.x,l.p.y+4);ctx.scale(1,-.55);ctx.translate(-l.p.x,-l.p.y);drawPersonNoName(ctx,l.p,T);ctx.restore();}
      drawPerson(ctx,l.p,T);}
  });
  (R.front||[]).forEach(i=>{if(ITEMS[i.t])ITEMS[i.t](ctx,i,T);});
  particles.forEach(s=>{ctx.fillStyle=s.col||'rgba(120,255,180,'+Math.min(1,s.life)+')';ctx.globalAlpha=Math.min(1,s.life);ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,TAU);ctx.fill();ctx.globalAlpha=1;});
  emotes.forEach(e=>drawEmote(ctx,e,T));
  if(bubble)drawBubble(ctx,bubble,T);
  ctx.restore();
  // overlays
  if(R.night||overlayFx.dark>0){ctx.fillStyle='rgba(5,5,20,'+(R.night?.25:0)+')';ctx.fillRect(0,0,W,H);}
  if(overlayFx.dark>0.01){ctx.fillStyle='rgba(0,0,0,'+overlayFx.dark+')';ctx.fillRect(0,0,W,H);}
  if(overlayFx.red>0){ctx.fillStyle='rgba(255,30,30,'+(Math.abs(Math.sin(T*8))*.25*overlayFx.red)+')';ctx.fillRect(0,0,W,H);}
  if(overlayFx.flash>0){ctx.fillStyle='rgba(255,255,255,'+overlayFx.flash+')';ctx.fillRect(0,0,W,H);}
  const v=ctx.createRadialGradient(W/2,H/2,H*.45,W/2,H/2,H*.95);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.42)');ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
  // film grain-ish scanline
  ctx.fillStyle='rgba(255,255,255,.025)';for(let y=0;y<H;y+=4)ctx.fillRect(0,y,W,1);
}
function drawPersonNoName(c,p,t){const n=p.name;p.name='';drawPerson(c,p,t);p.name=n;}
function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;update(dt);draw();requestAnimationFrame(loop);}
requestAnimationFrame(loop);

/* ---------------------------------------------------------------- API */
const E={
  W,H,WORLD,rnd,pick,clamp,makeChar,makePet,randomLook,
  get scene(){return scene;},get T(){return T;},
  load(room,cast,pets){scene={room,cast:cast||[],extras:[],pets:pets||[],poop:null,stain:null};extraTimer=.3;bubble=null;speakerId=null;particles=[];emotes=[];cam.x=cam.tx=W/2+100;cam.y=cam.ty=H/2;cam.z=cam.tz=1;overlayFx={flash:0,dark:0,red:0,darkTarget:0};},
  getChar(id){return scene?scene.cast.find(c=>c.id===id):null;},
  add(ch){scene.cast.push(ch);return ch;},
  remove(id){if(scene)scene.cast=scene.cast.filter(c=>c.id!==id);},
  speak(id,text,dur){speakerId=id;const c=E.getChar(id);scene.cast.forEach(x=>x.talking=0);
    if(c){c.talking=dur||clamp(text.length*.045,1.5,7);c.gesture=.8;bubble={char:c,text,t0:T};const tu=E.getChar('tu');if(tu&&c!==tu){c.facing=Math.sign(tu.x-c.x)||1;tu.facing=Math.sign(c.x-tu.x)||1;}
      E.focus(c.x,c.y-80,1.12);}
    else{bubble=null;E.focus(null);}
    const pet=scene.pets.find(p=>p.kind===id||id==='pet');if(pet){pet.talking=2;if(!c){bubble={char:{x:pet.x,y:pet.y+120,scale:1,look:null},text,t0:T};E.focus(pet.x,pet.y-60,1.15);}}},
  silence(){bubble=null;speakerId=null;E.focus(null);},
  focus(x,y,z){if(x==null){cam.tx=clamp(W/2+100,W/2,WORLD-W/2);cam.ty=H/2;cam.tz=1;return;}cam.tx=clamp(x,W/2/(z||1),WORLD-W/2/(z||1));cam.ty=clamp(y,H/2/(z||1)+(z>1?-10:0),H-H/2/(z||1));cam.tz=z||1.1;},
  shake(a){cam.shake=a||1;},flash(){overlayFx.flash=1;},alarm(on){overlayFx.red=on?3:0;},blackout(on){overlayFx.darkTarget=on?.85:0;},
  emote(id,kind){const c=E.getChar(id);if(!c)return;emotes.push({x:c.x+rnd(-10,10),y:c.y-200*c.scale,kind,life:1.2});},
  spray(x,y){for(let i=0;i<46;i++)particles.push({x:x+rnd(-10,10),y:y-rnd(10,40),vx:rnd(-70,70),vy:rnd(-100,-10),r:rnd(2,5),life:rnd(.6,1.5),g:30});},
  sparkle(x,y){for(let i=0;i<20;i++)particles.push({x,y,vx:rnd(-80,80),vy:rnd(-120,-20),r:rnd(1.5,3),life:rnd(.5,1.2),col:'#ffd23a',g:60});},
  confetti(){for(let i=0;i<120;i++)particles.push({x:cam.x+rnd(-480,480),y:cam.y-300,vx:rnd(-30,30),vy:rnd(20,120),r:rnd(2,4),life:rnd(2,4),col:pick(['#e0395a','#3fbf7f','#5aa9ff','#f2b63a','#c94f7c']),g:10});},
  poop(x,y,s){scene.poop={x,y,s:s||1,life:99};return scene.poop;},
  stain(x,y){scene.stain={x,y,a:.8};},
  walk(id,tx,cb){const c=E.getChar(id);if(!c)return;c.lock=false;c.tx=clamp(tx,40,WORLD-40);c.walking=Math.abs(c.tx-c.x)>4;c.onArrive=cb||null;if(!c.walking&&cb)cb();},
  enter(id,from,tx,cb){const c=E.getChar(id);if(!c)return;c.visible=true;c.x=from==='left'?-80:WORLD+80;c.facing=from==='left'?1:-1;E.walk(id,tx,cb);},
  leave(id,to){const c=E.getChar(id);if(!c)return;c.lock=false;c.still=true;E.walk(id,to==='left'?-100:WORLD+100,()=>{c.visible=false;});},
  mood(id,m){const c=E.getChar(id);if(c)c.mood=m;},
  bounce(id){const c=E.getChar(id);if(c)c.bounce=1;},
  sweat(id){const c=E.getChar(id);if(c)c.sweat=3;},
  lock(id,v){const c=E.getChar(id);if(c){c.lock=v;if(v)c.walking=false;}},
  pet(kind){return scene?scene.pets.find(p=>p.kind===kind):null;},
};
window.ENGINE=E;
})();
