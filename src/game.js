/* ===================================================================== GAME
   State, HUD, dialogue engine (go/resolve with trait modifiers), per-client
   node builder, negotiation, verdict, 3-client career, boot.
============================================================================ */
(function(){
'use strict';
const E=window.ENGINE,K=window.CONTENT;
const {rnd,pick,clamp}=E;const {eur,price,take}=K;
const $=id=>document.getElementById(id);

/* ---------------------------------------------------------------- AUDIO */
let AC=null;
function beep(f=440,d=.08,type='square',g=.04){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();const o=AC.createOscillator(),v=AC.createGain();o.type=type;o.frequency.value=f;v.gain.value=g;o.connect(v);v.connect(AC.destination);o.start();v.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+d);o.stop(AC.currentTime+d);}catch(e){}}
const sfx={click:()=>beep(520,.06),ok:()=>{beep(660,.1,'triangle');setTimeout(()=>beep(990,.14,'triangle'),90);},ko:()=>{beep(220,.18,'sawtooth');setTimeout(()=>beep(160,.25,'sawtooth'),120);},money:()=>{beep(880,.05);setTimeout(()=>beep(1320,.08),60);},spray:()=>beep(2400,.25,'sine',.02),alarm:()=>{for(let i=0;i<4;i++)setTimeout(()=>beep(i%2?700:900,.2,'square',.03),i*220);},win:()=>{[523,659,784,1046].forEach((f,i)=>setTimeout(()=>beep(f,.25,'triangle',.05),i*120));}};

/* ---------------------------------------------------------------- STATE */
const CAREER={clients:3,done:0,used:[],results:[],budget:2000,total:0};
let S=null,C=null,NODES=null,nodeId=null;
function newState(){return {budget:CAREER.budget,fiducia:50,interesse:20,rep:60,scene:0,attempts:0,round:1,counter:null,price:null,units:0,spent:0,flags:{}};}

/* ---------------------------------------------------------------- HUD */
function refreshHUD(){
  $('v-budget').textContent=eur(S.budget);$('b-budget').style.width=clamp(S.budget/3000*100,0,100)+'%';
  ['fiducia','interesse','rep'].forEach(k=>{$('v-'+k).textContent=Math.round(S[k]);$('b-'+k).style.width=clamp(S[k],0,100)+'%';});
  $('client-n').textContent='Cliente '+(CAREER.done+1)+'/'+CAREER.clients;
  renderDossier();
}
function renderDossier(){
  if(!C)return;const d=$('dossier');
  const traits=C.dm.traits.map(t=>C.intel.includes(t)?'<li><b>'+K.TRAITS[t].label+'</b> · '+K.TRAITS[t].desc+'</li>':'<li class="unk"><b>???</b> · tratto sconosciuto</li>').join('');
  d.innerHTML='<div class="dh"><span class="dlogo" style="background:'+C.company.col+'"></span><div><b>'+C.company.name+'</b><small>'+C.company.sector+' · '+C.company.tag+'</small></div></div>'+
    '<div class="drow"><span>Decisore</span><b>'+C.dm.full+'</b><small>'+C.dm.role+'</small></div>'+
    '<div class="drow"><span>Dolore</span><small>'+C.company.pain+'</small></div>'+
    (C.pet?'<div class="drow"><span>In ufficio</span><small>'+C.pet.name+' ('+{dog:'carlino',cat:'gatta',parrot:'pappagallo',goat:'capra',pigeon:'piccione'}[C.pet.kind]+')</small></div>':'')+
    '<div class="drow"><span>Tratti</span><ul>'+traits+'</ul></div>'+
    (C.secretKnown?'<div class="drow"><span>Segreto</span><small>'+C.secret.text(C.dm)+'</small></div>':'')+
    (S.flags.targetKnown?'<div class="drow"><span>Prezzo che vuole</span><b>'+price(target())+'</b><small>minimo del tuo capo: '+price(floorPrice())+'</small></div>':'');
}
function pop(text,kind){const d=document.createElement('div');d.className='pop '+kind;d.textContent=text;d.style.left=(25+Math.random()*50)+'%';d.style.top=(25+Math.random()*30)+'%';$('fx').appendChild(d);setTimeout(()=>d.remove(),1700);}
function applyFx(fx){if(!fx)return;const names={fiducia:'Fiducia',interesse:'Interesse',rep:'Reputazione'};let i=0;Object.keys(fx).forEach(k=>{const v=Math.round(fx[k]);if(!v||!(k in names))return;setTimeout(()=>{S[k]=clamp(S[k]+v,0,100);pop((v>0?'+':'')+v+' '+names[k],v>0?'good':'bad');refreshHUD();if(E.getChar('dm')){E.emote('dm',k==='fiducia'?(v>0?'heart':'angry'):k==='interesse'?(v>0?'fire':'zzz'):(v>0?'star':'skull'));}},i*240);i++;});}
function spend(n){if(!n)return;S.budget-=n;S.spent+=n;pop('−'+eur(n)+' €','money');sfx.money();E.emote('tu','money');refreshHUD();}
function target(){return C.target-(S.flags.ancoraBassa?1:0);}
function floorPrice(){return C.boss.floor+(S.flags.floorUp?.5:0);}

/* ---------------------------------------------------------------- SPEAKERS */
function speakerInfo(id){
  const map={narr:['Narratore','#f2b63a'],tu:['Tu','#2f4f9e'],dm:[C.dm.full+' · '+C.dm.role,C.company.col],tech:[C.tech.name+' · Qualità e sicurezza','#777'],rival:[C.rival.name+' · Cacca-Away','#2e7d4f'],assistant:['Assistente di direzione','#8e5bb5'],pet:[C.pet?C.pet.name:'Animale','#c9ad7f'],kid:['Bambino con palloncino','#e07a3a'],journalist:['Giornalista · Il Resto del Carlino','#8a5a2a'],inspector:['Ispettrice ASL','#1f6fb2'],ceo:['Amministratore Delegato','#111'],boss:[C.boss.name+' · il tuo capo','#111'],venue:['Sconosciuto','#999']};
  if(map[id])return map[id];const g=C.gates.find(x=>x.id===id);if(g)return [g.name+' · '+g.label,'#3a8f7a'];return ['...','#999'];
}
function say(speaker,text){
  const sp=speakerInfo(speaker);$('who').textContent=sp[0];$('dot').style.background=sp[1];$('line').innerHTML=text;
  const plain=text.replace(/<[^>]+>/g,'');
  if(speaker==='narr'||speaker==='boss'){E.silence();}else if(speaker==='pet'){E.speak('pet',plain);}else{if(E.getChar(speaker))E.speak(speaker,plain);else E.silence();}
}

/* ---------------------------------------------------------------- TIMER */
let timerId=null,timerLeft=0;
function patience(){return 25*(C.dm.traits.includes('frettoloso')?K.TRAITS.frettoloso.patience:1);}
function startTimer(onExpire){stopTimer();const P=patience();timerLeft=P;$('timer').hidden=false;$('timer-i').style.width='100%';timerId=setInterval(()=>{timerLeft-=.25;$('timer-i').style.width=(timerLeft/P*100)+'%';if(timerLeft<=0){stopTimer();onExpire();}},250);}
function stopTimer(){if(timerId)clearInterval(timerId);timerId=null;$('timer').hidden=true;}
const NAG={dm:['"Allora? Ho altre tre riunioni."','"Mi sta facendo perdere tempo."','Guarda l\'orologio. Poi guarda te.','"Posso aiutarla a trovare le parole?"'],gate:['"Signore? È ancora lì?"','Torna a fare quello che faceva. Tu resti lì.','"Tutto bene?"'],tech:['"Aspetto una risposta."','Annota qualcosa. Non è un complimento.'],narr:['Il tempo passa. Nessuno ti aspetta.','Esiti troppo. Si nota.'],rival:['"Se non sa cosa dire, parlo io."'],venue:['La persona davanti a te guarda il telefono.']};
function nagLoop(sp){return function expire(){applyFx({fiducia:-6});const key=NAG[sp]?sp:(sp&&sp.startsWith('gate')?'gate':'narr');say(sp==='narr'?'narr':sp,pick(NAG[key]));E.mood(sp,'angry');E.sweat('tu');startTimer(expire);};}

/* ---------------------------------------------------------------- CHOICES */
function traitMods(tags){const fx={},m={chance:0};(tags||[]).forEach(tag=>{C.dm.traits.forEach(t=>{const mod=K.TRAITS[t].tags[tag];if(!mod)return;Object.keys(mod).forEach(k=>{if(k==='chance')m.chance+=mod[k];else fx[k]=(fx[k]||0)+mod[k];});});});return {fx,chance:m.chance};}
function hintFor(tags){const hints=[];(tags||[]).forEach(tag=>{C.dm.traits.forEach(t=>{if(!C.intel.includes(t))return;const mod=K.TRAITS[t].tags[tag];if(!mod)return;const good=(mod.fiducia||0)+(mod.interesse||0)+(mod.chance||0)*40>0;hints.push(good?'👍 '+K.TRAITS[t].label:'👎 '+K.TRAITS[t].label);});});return hints;}
function renderChoices(list){
  const box=$('choices');box.innerHTML='';box.className='choices'+(list.length>3?' many':'');
  list.forEach(ch=>{
    const b=document.createElement('button');b.className='btn'+(ch.primary?' primary':'');
    const l=document.createElement('span');l.textContent=ch.label;b.appendChild(l);
    const m=document.createElement('span');m.className='meta';
    if(ch.cost){const c=document.createElement('span');c.className='chip cost';c.textContent='−'+eur(ch.cost)+' €';m.appendChild(c);}
    if(ch.risk!=null){const r=document.createElement('span');r.className='chip risk';r.textContent='🎲 ~'+Math.round(clamp(ch.risk,.02,.98)*100)+'%';m.appendChild(r);}
    (ch.hints||[]).forEach(h=>{const r=document.createElement('span');r.className='chip hint';r.textContent=h;m.appendChild(r);});
    if(m.children.length)b.appendChild(m);
    if(ch.cost&&ch.cost>S.budget){b.disabled=true;b.title='Budget insufficiente';}
    b.onclick=()=>{sfx.click();stopTimer();ch.go();};box.appendChild(b);
  });
}

/* ---------------------------------------------------------------- SCENES */
function castFor(n){
  const T=C.dm.look;
  const dm=()=>E.makeChar({id:'dm',name:C.dm.last,x:640,range:[500,800],facing:-1,look:C.dm.look,speed:75});
  const tu=(x)=>E.makeChar({id:'tu',name:'Tu',x:x||320,range:[180,460],role:'player',look:PLAYER_LOOK});
  const assistant=()=>E.makeChar({id:'assistant',name:'',x:-80,range:[-100,1400],y:420,scale:.85,speed:95,crosser:true,role:'assistant',nextWander:rnd(4,9)});
  switch(n){
    case 1:{const cast=[tu(380)];const v=C.venue;const npcRole={fiera:'worker',lounge:'pilot',golf:'random',matrimonio:'chef',convegno:'journalist',bar:'chef',treno:'capotreno'}[v];cast.push(E.makeChar({id:'venue',name:'',x:820,range:[640,1000],facing:-1,role:npcRole==='capotreno'?'pilot':npcRole,speed:45}));return cast;}
    case 2:{const cast=[tu(300)];C.gates.forEach((g,i)=>{const behind=g.type==='reception'||g.type==='nurse'||g.type==='concierge'||g.type==='barista';cast.push(E.makeChar({id:g.id,name:g.name,x:behind?695:200+i*120,range:behind?[640,760]:[120,520],y:behind?300:470,scale:behind?.8:1,facing:-1,role:g.role,g:g.g,speed:behind?18:50}));});cast.push(assistant());return cast;}
    case 3:{return [tu(300),dm(),assistant()];}
    case 4:case 5:{const cast=[tu(260),dm(),E.makeChar({id:'tech',name:C.tech.last,x:860,range:[760,980],facing:-1,role:'tech',look:TECH_LOOK,speed:35}),assistant()];if(n===5)cast.pop();return cast;}
    case 6:{const d=dm();d.speed=110;d.range=[460,900];return [tu(280),d,assistant()];}
  }
}
let PLAYER_LOOK=null,TECH_LOOK=null;
const SCENE_TITLES={1:['La caccia alla lead',()=>K.VENUES[C.venue].title],2:['La fortezza',()=>'Sede '+C.company.name],3:['La presentazione',()=>'Ufficio di '+C.dm.last+' · 3° piano'],4:['Obiezioni e imprevisti',()=>'Sala riunioni'],5:['La trattativa',()=>'Sala riunioni'],6:['La decisione',()=>'Ufficio di '+C.dm.last+' · ore 18:40']};
function loadScene(n){
  S.scene=n;
  const room=n===1?K.roomVenue(C):n===2?K.roomLobby(C):n===3?K.roomOffice(C,false):n===6?K.roomOffice(C,true):K.roomMeeting(C);
  const pets=[];if((n===3||n===6)&&C.pet){const p=E.makePet(C.pet.kind,420);p.name=C.pet.name;if(n===6){p.sleep=true;p.x=p.tx=760;}if(p.fly)p.range=[160,1100];pets.push(p);}
  E.load(room,castFor(n),pets);
  $('tag').innerHTML='Scena <b>'+n+'</b>/6 · '+SCENE_TITLES[n][0]+' · <span style="opacity:.7">'+SCENE_TITLES[n][1]()+'</span>';
  const card=$('scard');card.querySelector('b').textContent='Scena '+n;card.querySelector('h3').textContent=SCENE_TITLES[n][0];card.querySelector('p').textContent=SCENE_TITLES[n][1]();card.classList.remove('show');void card.offsetWidth;card.classList.add('show');
}

/* ---------------------------------------------------------------- ANIMATIONS */
const ANIM={
  petPoop(){const p=E.pet(C.pet.kind);if(!p)return;p.lock=true;p.walking=false;p.tx=p.x;p.talking=1;setTimeout(()=>{E.poop(p.x-p.facing*30,p.y+2,1);p.lock=false;},700);setTimeout(()=>{E.walk('tu',(E.scene.poop?E.scene.poop.x:p.x)-50,()=>{E.getChar('tu').gesture=1.5;});},1200);setTimeout(()=>{if(E.scene.poop){sfx.spray();E.spray(E.scene.poop.x,E.scene.poop.y);E.scene.poop.life=.4;}E.mood('dm','surprised');E.bounce('dm');E.emote('dm','star');setTimeout(()=>E.mood('dm','happy'),800);},2600);},
  petNope(){const p=E.pet(C.pet.kind);if(p){p.lock=true;p.walking=false;p.talking=1;setTimeout(()=>{p.lock=false;},2500);}const tu=E.getChar('tu');if(tu){tu.gesture=2;setTimeout(()=>{sfx.spray();E.spray(tu.x+40,tu.y-60);},900);}E.emote('dm','question');},
  sprayFail(){const tu=E.getChar('tu');if(tu){sfx.spray();E.spray(tu.x+30,tu.y-70);}E.emote('dm','question');},
  sprayOk(){const tu=E.getChar('tu');if(tu){tu.gesture=1.5;sfx.spray();E.spray(tu.x+50,tu.y-30);setTimeout(()=>E.sparkle(tu.x+50,tu.y-30),500);}},
  selfDemo(){const tu=E.getChar('tu');if(!tu)return;E.lock('tu',true);setTimeout(()=>E.poop(tu.x+30,tu.y+2,.8),800);setTimeout(()=>{if(E.scene.poop){sfx.spray();E.spray(E.scene.poop.x,E.scene.poop.y);E.scene.poop.life=.4;}E.lock('tu',false);},2200);const a=E.getChar('assistant');if(a){a.walking=true;a.x=-60;a.facing=1;a.tx=200;a.nextWander=99;setTimeout(()=>{a.talking=1.5;a.mood='surprised';a.gesture=1.5;E.emote('assistant','angry');},1500);}E.mood('dm','surprised');E.sweat('dm');},
  rivalEnter(){E.add(E.makeChar({id:'rival',name:C.rival.last,x:-80,range:[900,1100],role:'rival',facing:1,speed:120,visible:true}));E.enter('rival','left',1000,()=>{E.mood('rival','happy');E.getChar('rival').gesture=1;});E.mood('dm','surprised');},
  phone(){const tu=E.getChar('tu');if(tu){tu.look.prop='phone';tu.talking=3;setTimeout(()=>{tu.look.prop='briefcase';},4000);}E.shake(.4);},
  journalist(){E.add(E.makeChar({id:'journalist',name:'Stampa',x:-80,range:[120,300],role:'journalist',g:'f',facing:1,speed:110}));E.enter('journalist','left',200,()=>{E.getChar('journalist').gesture=2;});},
  flash(){setTimeout(()=>{E.flash();beep(1800,.1,'sine',.03);},600);setTimeout(()=>E.flash(),1200);},
  inspector(){E.add(E.makeChar({id:'inspector',name:'ASL',x:1360,range:[900,1100],role:'inspector',g:'f',facing:-1,speed:90}));E.enter('inspector','right',1000);E.mood('dm','nervous');E.sweat('dm');},
  blackout(){E.blackout(true);E.shake(.5);beep(80,.6,'sawtooth',.05);},
  blackoutOff(){setTimeout(()=>E.blackout(false),600);},
  kid(){E.add(E.makeChar({id:'kid',name:'',x:-60,range:[150,900],role:'kid',speed:150,facing:1}));E.enter('kid','left',rnd(400,600),()=>{E.bounce('kid');E.getChar('kid').mood='happy';});E.mood('dm','surprised');},
  alarm(){E.alarm(true);sfx.alarm();E.shake(1);E.scene.cast.forEach(c=>{if(c.id!=='tu'&&!c.crosser){c.mood='surprised';}});},
  alarmOff(){E.alarm(false);},
  leak(){const tu=E.getChar('tu');if(tu){E.stain(tu.x+10,tu.y+4);E.sweat('tu');E.mood('tu','nervous');}E.mood('dm','surprised');},
  ceo(){E.add(E.makeChar({id:'ceo',name:'AD',x:1360,range:[850,1000],role:'ceo',facing:-1,speed:130}));E.enter('ceo','right',900,()=>{E.getChar('ceo').mood='bored';});E.mood('dm','nervous');E.scene.cast.forEach(c=>{if(c.id==='tech')c.mood='nervous';});setTimeout(()=>E.leave('ceo','right'),9000);},
  pigeon(){const p=E.makePet('pigeon',1300);p.range=[300,900];p.alt=100;p.walking=true;p.tx=620;p.facing=-1;E.scene.pets.push(p);setTimeout(()=>{E.poop(620,E.scene.room.floorY+60,.6);E.mood('tech','angry');E.emote('tech','angry');},1800);setTimeout(()=>{p.tx=1400;p.walking=true;},3500);},
  news(){E.mood('dm','surprised');E.emote('dm','question');const d=E.getChar('dm');if(d){d.look.prop='phone';d.gesture=1;setTimeout(()=>{d.look.prop='tablet';},5000);}},
  kicked(){const g=E.scene.cast.find(c=>c.role==='security'||c.role==='soldier'||c.role==='worker')||E.add(E.makeChar({id:'guard',name:'Vigilanza',x:-80,range:[0,1200],role:'security',speed:140}));const tu=E.getChar('tu');if(g&&tu){E.walk(g.id,tu.x+60,()=>{E.mood(g.id,'angry');setTimeout(()=>{E.leave('tu','left');E.leave(g.id,'left');},700);});}},
  pace(){const d=E.getChar('dm');if(d){d.speed=120;d.nextWander=0;}},
  assistantIn(){const a=E.getChar('assistant');if(a){a.crosser=false;a.y=470;a.scale=1;a.x=-60;a.facing=1;a.name='Assistente';E.walk('assistant',420);}},
  handshake(){const d=E.getChar('dm'),tu=E.getChar('tu');if(d&&tu){E.walk('dm',tu.x+90,()=>{E.mood('dm','happy');d.gesture=1.5;tu.gesture=1.5;E.sparkle(tu.x+45,tu.y-110);});}},
  confetti(){E.confetti();sfx.win();},
  courier(){const c=E.add(E.makeChar({id:'courier',name:'',x:-80,range:[0,1300],role:'courier',speed:120}));E.walk('courier',1000,()=>E.leave('courier','right'));const tu=E.getChar('tu');if(tu){setTimeout(()=>{E.walk('tu',940);},300);}},
  petCatch(){const p=E.pet(C.pet?C.pet.kind:'dog');if(!p)return;p.tx=200;p.walking=true;setTimeout(()=>E.walk('tu',250,()=>{p.lock=true;p.walking=false;E.emote('tu','heart');}),400);},
};
function mood(id,m){E.mood(id,m);}

/* ---------------------------------------------------------------- NODE BUILDER */
function buildNodes(){
  const N={};const dm=C.dm,co=C.company,g=(m,f)=>dm.g==='f'?f:m;
  const lead=(calda,tiepida,fredda)=>()=>({calda,tiepida,fredda})[C.lead||'fredda'];
  const intel=(n)=>{const unknown=dm.traits.filter(t=>!C.intel.includes(t));take(unknown,n).forEach(t=>C.intel.push(t));};
  const intelText=()=>{const known=C.intel.map(t=>K.TRAITS[t].label.toLowerCase());return known.length?' Scopri che '+dm.ref+' è: <em>'+known.join(', ')+'</em>.':'';};
  /* ===== PHASE 1 ===== */
  const V=C.venue;const vn=K.VENUES[V];
  const P1={
    fiera:[
      {label:'Fermo il primo che passa con un badge BUYER',chance:.3,ok:{text:`Il tipo si ferma, guarda il flacone e ride. "Cerchi ${dm.name}, ${co.name}. ${co.pain[0].toUpperCase()+co.pain.slice(1)}. Padiglione C." Hai un nome.`,set:{lead:'tiepida'},next:'p1_channel'},ko:{text:`"Pino, piacere. Scope, spazzoloni, mocio. Ti racconto come ho iniziato nel '91..." Venti minuti dopo sai tutto delle scope.`,speaker:'venue',next:'p1_again',mood:'happy'}},
      {label:'Offro un caffè al barista, che sa tutto di tutti',cost:80,chance:.8,ok:{text:`Il barista abbassa la voce: "${dm.full}, ${dm.role} di ${co.name}. Questo è il cellulare. Non dirle chi te l'ha dato." E poi un dettaglio in più.`,set:{lead:'calda'},intel:1,next:'p1_channel'},ko:{text:`"Mai sentita." Si tiene il caffè, la mancia e la tua dignità.`,next:'p1_again'}},
      {label:'Compro la lista buyer dall\'organizzazione',cost:250,ok:{text:`Lista in mano, 40 pagine. Riga 212: "${dm.name}, ${dm.role}, ${co.name}, email aziendale". In nota: due righe di profilo.`,set:{lead:'tiepida'},intel:2,next:'p1_channel'}},
      {label:'Mi siedo al bar e cerco su LinkedIn',ok:{text:`Un'ora di scroll. "${dm.name} · ${dm.role} @ ${co.name} · ${co.tag}". Nessun contatto diretto, ma almeno sai chi cerchi.`,set:{lead:'fredda'},next:'p1_channel'}},
      {label:'Mi infilo nel convegno "Buyer Talk" senza pass',chance:.5,ok:{text:`Sul palco, ${dm.ref} in persona: "${co.pain}". Ti segni ogni parola. Alla fine le porgi un biglietto.`,set:{lead:'tiepida'},intel:2,next:'p1_channel'},ko:{text:`La hostess ti chiede il pass. Non ce l'hai. La hostess ha un fischietto.`,fx:{rep:-5},next:'p1_again'}},
    ],
    lounge:[
      {label:'Chiedo al barman chi è la persona più importante della sala',cost:50,chance:.7,ok:{text:`"Quella col tablet: ${dm.full}, ${co.name}. Terzo spritz, volo in ritardo." Un indizio in più nel conto.`,set:{lead:'calda',dmHere:true},intel:1,next:'p1_direct'},ko:{text:`"Qui sono tutti importanti, signore." Ti fa pagare lo spritz.`,next:'p1_again'}},
      {label:'Mi siedo accanto a chi ha il laptop con il logo più grande',chance:.45,ok:{text:`Il logo è di ${co.name}. La persona è ${dm.ref}. Alza gli occhi. "Posso aiutarla?"`,set:{lead:'calda',dmHere:true},next:'p1_direct'},ko:{text:`Il logo è di una banca. La persona ti vende un fondo pensione.`,next:'p1_again'}},
      {label:'Spruzzo Pulisci Pupù nel bagno della lounge e aspetto i commenti',chance:.5,ok:{text:`Esce ${dm.ref}: "Che profumo di pino, chi è stato?" Tu alzi il flacone. Lei alza un sopracciglio.`,set:{lead:'calda',dmHere:true},next:'p1_direct'},ko:{text:`Esce un signore anziano commosso. "Mi ricorda la Val Gardena." Vi abbracciate. Nessun ordine.`,next:'p1_again'}},
      {label:'Mi collego al wifi e cerco su LinkedIn chi vola oggi per Bologna',ok:{text:`Trovi ${dm.name}, ${dm.role} di ${co.name}, "in viaggio per lavoro". Hai il nome e nient'altro.`,set:{lead:'fredda'},next:'p1_channel'}},
    ],
    golf:[
      {label:'Mi unisco al gruppo alla buca 9 fingendo di saper giocare',chance:.4,ok:{text:`Tiri un colpo decente per puro caso. "Bel tiro!" dice ${dm.ref}. Camminate insieme fino alla buca 10.`,set:{lead:'calda',dmHere:true},intel:1,next:'p1_direct'},ko:{text:`La pallina finisce nel laghetto. Il caddy ride. ${dm.Ref} no.`,fx:{rep:-3},next:'p1_again'}},
      {label:'Offro da bere a tutta la club house',cost:200,chance:.75,ok:{text:`Alla terza bottiglia, il presidente del club ti presenta ${dm.ref}. "Ha il problema che risolvi tu." Scopri qualcosa su di lei.`,set:{lead:'calda',dmHere:true},intel:2,next:'p1_direct'},ko:{text:`Tutti bevono. Nessuno si presenta. Il conto arriva comunque.`,next:'p1_again'}},
      {label:'Corrompo il caddy per sapere chi decide i budget',cost:60,ok:{text:`"${dm.full}, ${co.name}. Gioca sempre il giovedì. Odia perdere." Il caddy sa tutto.`,set:{lead:'tiepida'},intel:1,next:'p1_channel'}},
      {label:'Mi siedo al bar e cerco su LinkedIn chi è socio qui',ok:{text:`Trovi ${dm.name}, ${dm.role} di ${co.name}. Socia dal 2019. Hai il nome.`,set:{lead:'fredda'},next:'p1_channel'}},
    ],
    matrimonio:[
      {label:'Chiedo a mia zia chi è quella persona elegante al tavolo degli sposi',ok:{text:`"${dm.name}! ${g('Il cugino','La cugina')} della sposa. Lavora in ${co.name}, ${g('un pezzo grosso','una pezzo grosso')}." La zia sa tutto, e aggiunge dettagli.`,set:{lead:'calda',dmHere:true},intel:2,next:'p1_direct'}},
      {label:'Faccio un brindisi improvvisato e cito il prodotto',chance:.45,ok:{text:`"Agli sposi: che la vostra vita sia pulita come un tappeto dopo Pulisci Pupù!" Risate. ${dm.Ref} si avvicina: "Cos'è Pulisci Pupù?"`,set:{lead:'calda',dmHere:true},next:'p1_direct'},ko:{text:`Silenzio. La sposa piange. Tuo cugino non ti parla più.`,fx:{rep:-10},next:'p1_again'}},
      {label:'Ballo con la madre della sposa per farmi presentare',cost:0,chance:.6,ok:{text:`Un valzer e mezzo. "Devi conoscere ${dm.name}, lavora in ${co.name}." Ti porta al tavolo.`,set:{lead:'calda',dmHere:true},intel:1,next:'p1_direct'},ko:{text:`Le pesti un piede. Due. Il valzer finisce in pronto soccorso.`,fx:{rep:-5},next:'p1_again'}},
      {label:'Lascio un flacone con biglietto da visita in ogni bomboniera',cost:120,ok:{text:`Sessanta bomboniere, sessanta flaconi. Lunedì ti chiama ${dm.ref}: "Era lei, al matrimonio?"`,set:{lead:'calda'},next:'p1_channel'}},
    ],
    convegno:[
      {label:'Faccio una domanda provocatoria al microfono citando il prodotto',chance:.5,ok:{text:`"E la pupù? Nessuno parla di pupù." Risate in sala. Al coffee break ${dm.ref} ti cerca: "Lei è quello della pupù."`,set:{lead:'calda',dmHere:true},next:'p1_direct'},ko:{text:`Il moderatore ti toglie il microfono. Qualcuno ti filma. Il video fa 40 visualizzazioni.`,fx:{rep:-6},next:'p1_again'}},
      {label:'Compro l\'elenco partecipanti dalla hostess',cost:150,ok:{text:`Trecento nomi. Uno solo conta: ${dm.full}, ${co.name}, posto B12. Con nota del segretario.`,set:{lead:'tiepida'},intel:1,next:'p1_channel'}},
      {label:'Al coffee break blocco il relatore e mi faccio presentare',chance:.55,ok:{text:`Il relatore conosce tutti. "${dm.name}! Vieni, c'è uno che devi sentire." Funziona.`,set:{lead:'calda',dmHere:true},intel:1,next:'p1_direct'},ko:{text:`Il relatore vuole venderti il suo libro. Lo compri. 32 euro.`,cost:32,next:'p1_again'}},
      {label:'Scansiono i badge con il telefono mentre la gente passa',ok:{text:`Tra gli sguardi strani, trovi il badge giusto: ${dm.name}, ${co.name}. Nome e azienda. Niente di più.`,set:{lead:'fredda'},next:'p1_channel'}},
    ],
    bar:[
      {label:'Chiedo al barista chi prende il caffè più caro',cost:30,chance:.8,ok:{text:`"${dm.full}. Marocchino doppio, alle 8:20 precise. Paga con la carta aziendale di ${co.name}." Sono le 8:15.`,set:{lead:'calda',dmHere:true},intel:1,next:'p1_direct'},ko:{text:`"Qui pagano tutti un euro." Ti guarda male.`,next:'p1_again'}},
      {label:'Offro il caffè a tutti quelli con il badge aziendale',cost:90,chance:.65,ok:{text:`Dodici caffè. L'undicesimo è di ${dm.ref}. "Chi è il generoso?" Sei tu.`,set:{lead:'calda',dmHere:true},next:'p1_direct'},ko:{text:`Dodici caffè a dodici stagisti. Uno ti chiede un lavoro.`,next:'p1_again'}},
      {label:'Lascio un flacone sul bancone con scritto "provalo nel bagno del bar"',chance:.5,ok:{text:`Il bagno del bar diventa leggenda. Il barista ti presenta ${dm.ref}: "È lei che l'ha chiesto per primo."`,set:{lead:'calda',dmHere:true},next:'p1_direct'},ko:{text:`Qualcuno lo ruba. Il barista dice che era buono. Non hai più il flacone.`,next:'p1_again'}},
      {label:'Leggo i nomi sui badge riflessi nello specchio dietro il bancone',ok:{text:`Specchio, badge, nome: ${dm.name}, ${co.name}. Entra in sede alle 8:30. Hai un nome.`,set:{lead:'fredda'},next:'p1_channel'}},
    ],
    treno:[
      {label:'Chiedo al capotreno chi viaggia in Business con biglietto aziendale',cost:40,chance:.7,ok:{text:`"Carrozza 2, posto 4A: ${dm.full}. Ha chiesto tre volte dove sia il bagno pulito." Hai un nome e una pista.`,set:{lead:'calda',dmHere:true},intel:1,next:'p1_direct'},ko:{text:`"Non posso dare informazioni sui passeggeri." Ti fa anche la multa per il bagaglio.`,cost:20,next:'p1_again'}},
      {label:'Spruzzo il bagno della carrozza e aspetto chi esce sorridendo',chance:.55,ok:{text:`Esce ${dm.ref}, stupita: "Finalmente un bagno decente." Tu: "Posso spiegarle perché."`,set:{lead:'calda',dmHere:true},next:'p1_direct'},ko:{text:`Esce un bambino che ha spruzzato tutto il flacone sul sedile. Sua madre ti guarda.`,fx:{rep:-4},next:'p1_again'}},
      {label:'Guardo di nascosto il laptop di chi mi sta davanti',chance:.5,ok:{text:`Sullo schermo: "${co.name} · Piano acquisti Q4 · ${dm.name}". È ${dm.ref}. Chiude il laptop e ti guarda.`,set:{lead:'calda',dmHere:true},next:'p1_direct'},ko:{text:`Sullo schermo: solitario. L'uomo ti vede. "Vuole giocare?"`,next:'p1_again'}},
      {label:'Cerco su LinkedIn chi di ${co.name} viaggia oggi'.replace('${co.name}',co.name),ok:{text:`"${dm.name} · ${dm.role} · in viaggio verso Milano". Hai il nome.`,set:{lead:'fredda'},next:'p1_channel'}},
    ],
  }[V];
  N.p1_intro={scene:1,speaker:'narr',text:vn.intro(),choices:P1};
  N.p1_again={scene:1,speaker:'narr',text:pick(['Riprova. La giornata è lunga.','Niente. Ma sei ancora in gioco.','Prossimo tentativo. Il flacone è ancora in tasca.']),choices:P1};
  N.p1_direct={scene:1,speaker:'dm',text:`"Lei chi è, esattamente?"`,onEnter(){if(!E.getChar('dm')){E.add(E.makeChar({id:'dm',name:dm.last,x:1360,range:[600,800],role:'exec',look:dm.look,facing:-1,speed:110}));E.enter('dm','right',700);}},choices:[
    {label:`"Venti secondi e un prodotto che le farà ridere e poi guadagnare. Poi sparisco."`,tags:['breve'],ok:{text:`Venti secondi dopo: "Giovedì alle 10, in sede. Non mi faccia pentire."`,fx:{interesse:10,fiducia:4},set:{lead:'calda',appuntamento:true},next:'p2_start'}},
    {label:`Le porgi il flacone senza dire niente`,tags:['breve','umorismo'],chance:.55,ok:{text:`Legge l'etichetta. Ride forte. "Giovedì alle 10. Questa la voglio sentire."`,fx:{interesse:15},set:{lead:'calda',appuntamento:true},next:'p2_start',mood:'happy'},ko:{text:`Legge l'etichetta. "Tenga pure." Se ne va. Hai comunque il nome.`,set:{lead:'tiepida'},next:'p1_channel'}},
    {label:`"Sono il futuro fornitore di ${co.name}. Lei ancora non lo sa."`,tags:['adulazione','bluff'],chance:.45,ok:{text:`"Sicuro di sé." Sorride. "Venga giovedì. Vediamo se è vero."`,fx:{interesse:8},set:{lead:'calda',appuntamento:true},next:'p2_start'},ko:{text:`"Ne ho già troppi di quelli che lo sanno prima di me." Se ne va. Hai il nome.`,fx:{fiducia:-5},set:{lead:'tiepida'},next:'p1_channel'}},
    {label:`"Nessuno. Buona giornata." (la segui su LinkedIn un'ora dopo)`,tags:['onesto'],ok:{text:`Accetta il collegamento. Non risponde al messaggio. Hai il nome e un'ora persa.`,set:{lead:'fredda'},next:'p1_channel'}},
  ]};
  N.p1_channel={scene:1,speaker:'narr',text:()=>`Obiettivo: <em>${dm.full}</em>, ${dm.role} di ${co.name}.${intelText()} Come la contatti per avere un appuntamento?`,choices:[
    {label:'Email con oggetto: "La rivoluzione parte dal bagno"',chance:lead(.55,.3,.15),ok:{text:`Due giorni dopo: "Curiosa. Giovedì ore 10, quindici minuti. Non uno di più."`,set:{appuntamento:true},fx:{interesse:5},next:'p2_start'},ko:{text:`Silenzio. L'email è finita nello spam, o peggio: l'ha letta.`,next:'p2_start'}},
    {label:'Telefonata diretta',chance:lead(.6,.25,.1),ok:{text:`"Ha trenta secondi." Li usi tutti. "Giovedì alle 10. Non mi faccia pentire."`,speaker:'dm',set:{appuntamento:true},fx:{fiducia:5},next:'p2_start'},ko:{text:`Centralino: "${g('Il Dottore','La Dottoressa')} è in riunione." Lo sarà per sempre, a quanto pare.`,next:'p2_start'}},
    {label:'Messaggio LinkedIn con il video del prodotto',chance:lead(.5,.35,.3),ok:{text:`Visualizzato. Risposta: una faccina che ride. Poi: "Ok, giovedì alle 10. Questa la voglio sentire."`,set:{appuntamento:true},fx:{interesse:8},next:'p2_start'},ko:{text:`Visualizzato. Nessuna risposta. Il video ha tre like: tuo, di tua madre e di Pino.`,next:'p2_start'}},
    {label:'Pago un informatore per un dossier completo',cost:180,ok:{text:`Tre pagine. Abitudini, debolezze, un segreto.`,intel:3,secret:true,next:'p1_channel2'}},
    {label:'Niente contatti: giovedì mi presento in sede',ok:{text:`Decisione presa. Sede ${co.name}, giovedì ore 9. Senza appuntamento, con molta faccia tosta.`,next:'p2_start'}},
  ]};
  N.p1_channel2={scene:1,speaker:'narr',text:()=>`Dossier letto.${intelText()} ${C.secretKnown?'<em>Segreto</em>: '+C.secret.text(dm):''} Ora: come la contatti?`,choices:()=>N.p1_channel.choices.filter(c=>!c.cost)};
  /* ===== PHASE 2 ===== */
  N.p2_start={scene:2,redirect:()=>S.flags.appuntamento?'p2_warm':'p2_gate0'};
  const g0=C.gates[0];
  N.p2_warm={scene:2,speaker:g0.id,text:`"Buongiorno, benvenuto in ${co.name}. Ha un appuntamento?"`,choices:[
    {label:`"Sì, ${dm.full} alle 10. Mi aspetta."`,ok:{text:`"Confermo. Terzo piano, l'assistente la accompagna."`,speaker:g0.id,fx:{fiducia:5},next:'p2_lobbyevent'}},
    {label:`"Sì. E le ho portato un omaggio: un flacone di Pulisci Pupù."`,chance:.5,ok:{text:`Legge l'etichetta e scoppia a ridere. "È il regalo più strano della mia carriera. Terzo piano!"`,speaker:g0.id,fx:{rep:5,fiducia:5},next:'p2_lobbyevent',mood:'happy'},ko:{text:`Guarda il flacone come se fosse radioattivo. "...Terzo piano."`,speaker:g0.id,next:'p2_lobbyevent'}},
  ]};
  C.gates.forEach((gt,i)=>{
    const next=i+1<C.gates.length?'p2_gate'+(i+1):'p2_lobbyevent';
    const dis=pick(K.DISGUISES);
    const greet={reception:`"Buongiorno. Ha un appuntamento con qualcuno?"`,security:`"Documento e motivo della visita."`,assistant:`"${g('Il Dottore','La Dottoressa')} non riceve senza appuntamento. Posso prendere un messaggio."`,concierge:`"Benvenuto al ${co.name}. È nostro ospite?"`,nurse:`"Orario visite finito. Lei è un parente?"`,soldier:`"ALT. Chi va là?"`,nun:`"Buongiorno, figliolo. Cosa la porta qui?"`,bidello:`"Le lezioni sono iniziate. Lei chi è?"`,keeper:`"L'ingresso visitatori è dall'altra parte. Qui ci sono gli uffici."`,trainer:`"Tesserato? No? Allora niente."`,steward:`"Area riservata al personale. Badge?"`,barista:`"Il caffè è di là. Qui si entra solo con l'appuntamento."`,roadie:`"Backstage. Pass?"`,capotreno:`"Biglietto, prego. E motivo della visita agli uffici."`,tassista:`"${g('Il Presidente','La Presidente')} è in riunione. Da sempre."`}[gt.type];
    N['p2_gate'+i]={scene:2,speaker:gt.id,text:()=>(i>0?`Secondo filtro: <em>${gt.name}</em>, ${gt.label.toLowerCase()}. `:'')+greet+(S.attempts>0?` <small>(tentativi rimasti: ${4-S.attempts})</small>`:''),onEnter(){E.focus(null);},choices:()=>[
      {label:`Persuasione: "Ho un prodotto che ${dm.ref} deve assolutamente vedere."`,chance:()=>gt.persuade+S.fiducia/400,ok:{text:pick([`Sospira. "Ha un buco alle 11. Dieci minuti. Se mi fa fare brutta figura, me la pagherà."`,`"Lei ha una faccia onesta. Terzo piano, e non l'ho detto io."`]),speaker:gt.id,next,mood:'happy'},ko:{text:pick([`"Lasci pure una brochure, la farò avere." Traduzione: cestino.`,`"No." Torna a fare quello che faceva.`]),speaker:gt.id,attempt:true,next:'p2_gate'+i}},
      {label:`Mazzetta a ${gt.name}`,cost:gt.cost,chance:gt.corr,tags:['mazzetta'],ok:{text:pick([`La banconota sparisce in un gesto da prestigiatore. "Ascensore B. Io non l'ho mai vista."`,`"Guarda caso si è liberato uno slot." Sorride senza sorridere.`]),speaker:gt.id,set:{bribed:true},next,mood:'happy'},ko:{text:pick([`"Mi sta offrendo una MAZZETTA?" Si tiene i soldi comunque.`,`"Sono incorruttibile." Pausa. "Cioè, costo di più."`]),speaker:gt.id,fx:{rep:-18},attempt:true,next:'p2_gate'+i,mood:'angry'}},
      {label:`Bluff: "Ho appuntamento alle 10 con ${dm.full}."`,chance:.3,tags:['bluff'],ok:{text:`Non controlla nemmeno. "Terzo piano."`,speaker:gt.id,set:{bluff:true},next},ko:{text:`Controlla. "Non risulta nulla." Il tono cambia.`,speaker:gt.id,fx:{rep:-12},attempt:true,next:'p2_gate'+i,mood:'angry'}},
      {label:`Travestimento da ${dis[0]}: ${dis[1]}`,chance:.42,ok:{text:`Funziona. "Terzo piano, faccia in fretta." Giri a destra invece che a sinistra.`,speaker:gt.id,set:{intruso:true},next,look:dis[2]},ko:{text:`"${dis[0][0].toUpperCase()+dis[0].slice(1)}? Con quella valigetta?" Chiama qualcuno.`,speaker:gt.id,fx:{rep:-20},attempt:true,next:'p2_gate'+i,mood:'angry'}},
      {label:`Aspetto nella hall che passi ${dm.ref}`,chance:.35,ok:{text:`Le porte dell'ascensore si aprono. ${dm.Ref}, al telefono, attraversa la hall a passo di carica.`,next:'p2_pitch'},ko:{text:`Due ore. Passano tutti tranne ${dm.ref}. Qualcuno ti porta un bicchiere d'acqua, per pietà.`,attempt:true,next:'p2_gate'+i}},
      {label:`Mi infilo dietro il corriere con i pacchi`,chance:.4,ok:{text:`Dentro! Il corriere ti guarda, tu gli fai l'occhiolino. Terzo piano.`,set:{intruso:true},next,anim:'courier'},ko:{text:`Una mano sul colletto. "Fuori."`,speaker:gt.id,fx:{rep:-25},attempt:true,next:'p2_gate'+i,mood:'angry'}},
    ]};
  });
  N.p2_pitch={scene:2,speaker:'dm',text:`"...sì, poi ti richiamo." Chiude la chiamata. "Lei chi è?"`,onEnter(){if(!E.getChar('dm')){E.add(E.makeChar({id:'dm',name:dm.last,x:1000,range:[700,900],role:'exec',look:dm.look,facing:-1,speed:120}));E.walk('dm',560);}},choices:[
    {label:`"${dm.first} ${dm.last}? Ho venti secondi e un prodotto che le farà ridere e poi guadagnare."`,tags:['breve'],ok:{text:`Si ferma. "Venti secondi. Vada." Venti secondi dopo: "Salga."`,speaker:'dm',fx:{interesse:10},next:'p3_intro'}},
    {label:`"Scusi, le è caduto questo." (le porgi un flacone di Pulisci Pupù)`,tags:['umorismo'],chance:.5,ok:{text:`Legge l'etichetta. Ride forte, da sola, in mezzo alla hall. "Salga. Questa la voglio sentire."`,speaker:'dm',fx:{interesse:15},next:'p3_intro',mood:'happy'},ko:{text:`"Tenga pure." Entra in ascensore. Le porte si chiudono sul tuo sorriso.`,speaker:'dm',attempt:true,next:'p2_gate0'}},
    {label:`"Sono qui per il colloquio delle 10."`,tags:['bluff'],ok:{text:`"Non facciamo colloqui." Porte chiuse.`,speaker:'dm',fx:{rep:-5},attempt:true,next:'p2_gate0'}},
  ]};
  N.p2_over={scene:2,speaker:'narr',text:`Ti accompagnano fuori con delicatezza. Poi ti mostrano la foto appesa in guardiola: la tua, con sopra scritto NON FAR ENTRARE.`,onEnter(){ANIM.kicked();},end:'cacciato'};
  const events=['rivalLobby','elevator'].concat(C.pet?['lostPet']:[]);
  const ev=pick(events);
  N.p2_lobbyevent={scene:2,redirect:()=>Math.random()<.55?'p2_ev_'+ev:'p3_intro'};
  N.p2_ev_rivalLobby={scene:2,speaker:'narr',text:`Sul divano della hall, con una valigetta verde: <em>${C.rival.name}</em>, agente di Cacca-Away. Aspetta anche lui ${dm.ref}. Vi riconoscete come due pistoleri.`,onEnter(){E.add(E.makeChar({id:'rival',name:C.rival.last,x:1100,range:[950,1150],role:'rival',facing:-1,speed:60}));},choices:[
    {label:`Chiacchiero con lui da "collega" per farmi scappare informazioni`,chance:.6,ok:{text:`Parla troppo. "${dm.Ref}? Guarda che è ${pick(dm.traits.map(t=>K.TRAITS[t].label.toLowerCase()))}, fidati." Grazie, collega.`,speaker:'rival',intel:1,next:'p3_intro'},ko:{text:`"Bel tentativo." Sorride e mette le cuffie.`,speaker:'rival',next:'p3_intro'}},
    {label:`Dico alla reception che il signore ha un malore e serve un'ambulanza`,chance:.5,tags:['crudele'],ok:{text:`Arrivano in tre con la barella. ${C.rival.name} protesta, lo portano via per "precauzione". Il suo slot è tuo.`,fx:{interesse:5,rep:-8},next:'p3_intro'},ko:{text:`La reception lo chiede a lui. "Sto benissimo." Tutti ti guardano.`,fx:{rep:-15},next:'p3_intro'}},
    {label:`Gli offro il caffè e lo lascio parlare del suo prodotto`,tags:['onesto'],ok:{text:`Trenta minuti di monologo. Scopri che Cacca-Away copre l'odore e basta. Argomento in tasca.`,set:{rivalWeak:true},next:'p3_intro'}},
  ]};
  N.p2_ev_elevator={scene:2,speaker:'narr',text:`Ascensore. Tra il secondo e il terzo piano si ferma. Luci basse, silenzio. Accanto a te, ${dm.ref}. Otto minuti insieme, senza via di fuga.`,onEnter(){E.add(E.makeChar({id:'dm',name:dm.last,x:960,range:[900,1000],role:'exec',look:dm.look,facing:-1,speed:30}));E.walk('tu',880,()=>E.lock('tu',true));E.blackout(true);setTimeout(()=>E.blackout(false),8000);},choices:[
    {label:`"Otto minuti. Le racconto una storia vera." (storia del prodotto)`,tags:['storia'],ok:{text:`Ascolta. Alla fine: "Ok. Quando riparte, lei viene con me."`,speaker:'dm',fx:{fiducia:12,interesse:6},next:'p3_intro'}},
    {label:`Silenzio professionale`,tags:['breve','formale'],ok:{text:`Otto minuti di silenzio. Quando riparte: "Almeno non è uno che parla."`,speaker:'dm',fx:{fiducia:6},next:'p3_intro'}},
    {label:`"Sa che in un ascensore fermo l'odore si concentra? Ho la soluzione." (spruzzi)`,tags:['umorismo','sporco'],chance:.5,ok:{text:`Profumo di pino nell'ascensore. Ride. "Lei è matto. Salga con me."`,speaker:'dm',fx:{interesse:12,fiducia:4},anim:'sprayOk',next:'p3_intro',mood:'happy'},ko:{text:`Tossisce per sei minuti. "Mai. Più." Però sale con te, per vendetta.`,speaker:'dm',fx:{fiducia:-12},anim:'sprayFail',next:'p3_intro',mood:'angry'}},
  ]};
  N.p2_ev_lostPet={scene:2,speaker:'narr',text:`Un ${{dog:'carlino',cat:'gatta',parrot:'pappagallo',goat:'capra',pigeon:'piccione'}[C.pet?C.pet.kind:'dog']} attraversa la hall di corsa. Dietro, un'assistente urla: "${C.pet?C.pet.name:'Pupo'}! Torna qui! È ${g('del Dottore','della Dottoressa')}!"`,onEnter(){const p=E.makePet(C.pet.kind,1300);p.range=[100,1100];p.walking=true;p.tx=150;p.facing=-1;p.speed=140;E.scene.pets.push(p);},choices:[
    {label:`Lo acchiappo con un pezzo del mio panino`,chance:.7,tags:['animali'],ok:{text:`Preso. Lo riconsegni in braccio ${g('al Dottore','alla Dottoressa')} in persona, che scende di corsa. "Lei chi è?" "Il suo prossimo fornitore."`,fx:{fiducia:15,interesse:5},anim:'petCatch',intel:1,next:'p3_intro'},ko:{text:`Ti mordicchia e scappa. L'assistente ti guarda come se fosse colpa tua.`,fx:{fiducia:-4},next:'p3_intro'}},
    {label:`Spruzzo Pulisci Pupù sul pavimento dove è passato, per sicurezza`,tags:['sporco','umorismo'],ok:{text:`Nessuno capisce perché. Ma la hall profuma di pino per tutto il giorno. La reception se lo ricorderà.`,fx:{rep:4},anim:'sprayOk',next:'p3_intro'}},
    {label:`Non è un mio problema`,tags:['crudele'],ok:{text:`Lo prendono dopo venti minuti. ${dm.Ref} ti ha visto, dalla scala, non muovere un dito.`,fx:{fiducia:-10},next:'p3_intro'}},
  ]};
  /* ===== PHASE 3 ===== */
  const openers=C.openers.map(o=>({label:o.label(C),tags:o.tags,ok:{text:o.react(C),speaker:'dm',fx:o.fx,next:'p3_product'}}));
  N.p3_intro={scene:3,speaker:'dm',text:()=>S.flags.intruso?`"Come è arrivato fin qui? ...Lasci stare, ormai è dentro. Cinque minuti.${C.pet?' E '+C.pet.name+' la tiene d\'occhio.':''}"`:S.flags.bluff?`"Non risultava nessun appuntamento. Ha dieci minuti per spiegarmi perché non dovrei chiamare la vigilanza."`:`"Si accomodi. Dieci minuti, poi ho il comitato acquisti. Mi dica."`,
    onEnter(){if(S.flags.intruso){applyFx({fiducia:-10});mood('dm','angry');}if(S.flags.bluff){applyFx({fiducia:-6});}if(S.flags.bribed&&dm.traits.includes('etico')&&Math.random()<.5){setTimeout(()=>{say('dm',`"Ah, e mi hanno detto della mancia alla reception. Qui non si usa."`);applyFx({fiducia:-15,rep:-5});mood('dm','angry');},1500);}},
    choices:()=>openers.concat(C.secretKnown?[{label:C.secret.opener(dm),tags:[],hints:['🔑 segreto'],ok:{text:`Si ferma. "Come fa a saperlo?" Poi sorride. Hai la sua attenzione totale.`,speaker:'dm',fx:C.secret.fx,next:'p3_product',mood:'happy'}}]:[])};
  const variants=take(Object.keys(K.VARIANTS).filter(v=>v!==co.variant),2).concat([co.variant]);
  N.p3_product={scene:3,speaker:'dm',text:`"Pulisci... Pupù. Sul serio si chiama così? E quale versione mi sta proponendo, esattamente?"`,choices:K.shuffle(variants).map(v=>({label:`Pulisci Pupù ${K.VARIANTS[v]}`,tags:[],ok:v===co.variant?{text:`"${K.VARIANTS[v].split(' (')[0]}." Annuisce. "È esattamente quello che ci serve."`,speaker:'dm',fx:{interesse:12,fiducia:5},next:'p3_demo'}:{text:`"${K.VARIANTS[v].split(' (')[0]}? Per ${co.tag.split(',')[0]}?" Ti guarda come un alieno. "Avete altro?"`,speaker:'dm',fx:{interesse:-6,fiducia:-3},next:'p3_demo'}}))};
  const demos=C.demos.map(d=>{const base={label:d.label,tags:d.tags};if(d.chance!=null){base.chance=d.chance;base.ok=Object.assign({next:'p4_intro',speaker:d.ok.speaker||'narr'},d.ok);base.ko=Object.assign({next:'p4_intro',speaker:d.ko.speaker||'narr'},d.ko);}else{base.ok={text:d.react,speaker:'dm',fx:d.fx,anim:d.anim,next:'p4_intro'};}return base;});
  N.p3_demo={scene:3,speaker:'dm',text:`"Belle parole. Mi faccia vedere che funziona."${C.pet?` ${C.pet.name} gira per l'ufficio con l'aria di chi ha mangiato troppo.`:''}`,choices:demos};
  /* ===== PHASE 4 ===== */
  N.p4_intro={scene:4,speaker:'narr',text:`Sala riunioni. ${dm.Ref} ha convocato <em>${C.tech.name}</em>, responsabile qualità e sicurezza. L'assistente serve il caffè camminando come su un campo minato.`,next:'p4_obj0'};
  C.objections.forEach((oid,i)=>{const O=K.OBJECTIONS[oid];const next=i===1?'p4_twist':i+1<C.objections.length?'p4_obj'+(i+1):'p5_intro';
    N['p4_obj'+i]={scene:4,speaker:O.speaker,text:O.text(C),choices:()=>O.choices(C).map(ch=>wrapChoice(ch,next,O.speaker))};});
  const TW=K.TWISTS[C.twist];
  N.p4_twist={scene:4,speaker:TW.speaker||'narr',text:TW.text(C),onEnter(){if(TW.anim&&ANIM[TW.anim])ANIM[TW.anim]();},choices:()=>TW.choices(C).map(ch=>wrapChoice(ch,'p4_obj2','dm'))};
  /* ===== PHASE 5 ===== */
  N.p5_intro={scene:5,speaker:'dm',text:()=>`"Parliamo di numeri. Ordine iniziale: <em>${eur(C.units)} flaconi</em>. Il mio prezzo d'ingresso ideale è <em>${price(target())}</em>. Il suo costo industriale, se non sbaglio, è intorno ai 3. Mi faccia la sua proposta."`,onEnter(){S.flags.targetKnown=true;refreshHUD();},next:'p5_round'};
  N.p5_round={scene:5,custom:'negotiation'};
  /* ===== PHASE 6 ===== */
  N.p6_intro={scene:6,speaker:'narr',text:`Ore 18:40. ${dm.Ref} cammina avanti e indietro. L'assistente entra ed esce. Il telefono squilla.${C.pet?' '+C.pet.name+' dorme, o finge.':''}`,onEnter(){ANIM.pace();},next:'p6_b0'};
  const beats=take(K.BEATS,2).map(b=>b(C));
  beats.forEach((b,i)=>{N['p6_b'+i]={scene:6,speaker:b.speaker,text:b.text,onEnter(){if(b.anim&&ANIM[b.anim])ANIM[b.anim]();},next:i+1<beats.length?'p6_b'+(i+1):'p6_verdict'};});
  N.p6_verdict={scene:6,custom:'verdict'};
  return N;
}
function wrapChoice(ch,next,defaultSpeaker){
  const out={label:ch.label,tags:ch.tags,cost:ch.cost};
  if(ch.chance!=null){out.chance=ch.chance;out.ok=Object.assign({next,speaker:ch.ok.speaker||defaultSpeaker},ch.ok);out.ko=Object.assign({next,speaker:ch.ko.speaker||defaultSpeaker},ch.ko);}
  else out.ok={text:ch.react,speaker:ch.speaker||defaultSpeaker,fx:ch.fx,set:ch.set,anim:ch.anim,mood:ch.mood,emote:ch.emote,next};
  return out;
}

/* ---------------------------------------------------------------- ENGINE */
function go(id){
  const n=NODES[id];if(!n){console.error('missing node',id);return;}nodeId=id;
  if(n.scene!==S.scene)loadScene(n.scene);
  if(n.redirect){const r=n.redirect();if(r)return go(r);}
  if(n.onEnter)n.onEnter();
  if(n.custom==='negotiation')return renderNegotiation();
  if(n.custom==='verdict')return renderVerdict();
  const text=typeof n.text==='function'?n.text():n.text;
  say(n.speaker,text);
  if(n.end){renderChoices([{label:'Vedi il risultato',primary:true,go:()=>endClient(n.end)}]);return;}
  if(n.next){renderChoices([{label:'Continua',primary:true,go:()=>go(n.next)}]);return;}
  const list=(typeof n.choices==='function'?n.choices():n.choices).map(ch=>{
    let risk=typeof ch.chance==='function'?ch.chance():ch.chance;
    const mods=traitMods(ch.tags);if(risk!=null)risk=clamp(risk+mods.chance,.02,.98);
    return {label:ch.label,cost:ch.cost,risk:ch.chance!=null?risk:null,hints:(ch.hints||[]).concat(hintFor(ch.tags)),go:()=>resolve(ch,risk,mods)};
  });
  renderChoices(list);
  startTimer(nagLoop(n.speaker));
}
function resolve(ch,risk,mods){
  stopTimer();if(ch.cost)spend(ch.cost);
  const tu=E.getChar('tu');if(tu){tu.talking=1.6;tu.gesture=1;}
  let out=ch.ok;
  if(ch.chance!=null){const roll=Math.random();out=roll<risk?ch.ok:ch.ko;(roll<risk?sfx.ok:sfx.ko)();if(roll>=risk)E.sweat('tu');}
  if(out.attempt)S.attempts++;
  if(out.set)Object.assign(S.flags,out.set);if(out.set&&out.set.lead)C.lead=out.set.lead;
  if(out.intel){const unknown=C.dm.traits.filter(t=>!C.intel.includes(t));take(unknown,out.intel).forEach(t=>C.intel.push(t));refreshHUD();}
  if(out.secret){C.secretKnown=true;refreshHUD();}
  if(out.look&&tu){tu.look=E.randomLook(out.look,tu.look.g);tu.look.prop='briefcase';}
  if(out.mood)E.mood(out.speaker==='narr'?'dm':(out.speaker||'dm'),out.mood);
  if(out.emote)E.emote('dm',out.emote);
  if(out.anim&&ANIM[out.anim])ANIM[out.anim]();
  const fx=Object.assign({},out.fx||{});Object.keys(mods.fx).forEach(k=>fx[k]=(fx[k]||0)+mods.fx[k]);
  const nextId=out.next;
  const show=()=>{say(out.speaker||'narr',out.text||'...');applyFx(fx);
    if(S.attempts>=4&&nextId&&nextId.startsWith('p2_gate')){renderChoices([{label:'Continua',primary:true,go:()=>go('p2_over')}]);return;}
    renderChoices([{label:'Continua',primary:true,go:()=>go(nextId)}]);};
  if(out.delay){$('choices').innerHTML='';say('narr','...');setTimeout(show,out.delay);}else show();
}

/* ---------------------------------------------------------------- NEGOTIATION */
function renderNegotiation(){
  E.mood('dm','neutral');const tgt=target(),fl=floorPrice(),counter=S.counter;const tirchio=C.dm.traits.includes('tirchio');
  say('dm',S.round===1?`"La ascolto. Prezzo al flacone e condizioni."`:`"Round ${S.round}. A <em>${price(counter)}</em> siamo già d'accordo, se vuole chiudere subito. Altrimenti mi stupisca."`);
  const box=$('choices');box.innerHTML='';box.className='choices';
  const wrap=document.createElement('div');wrap.className='negoz';
  const prices=[tgt+5,tgt+3.5,tgt+2.5,tgt+1.5,tgt+1,tgt+.5,tgt,tgt-.5,tgt-1].map(p=>Math.round(p*2)/2).filter(p=>p>=3);if(counter&&!prices.includes(counter))prices.push(counter);const uniq=[...new Set(prices)].sort((a,b)=>b-a);
  const allowed=uniq.filter(p=>p>=fl);let p0=counter&&counter>=fl?counter:(allowed.find(p=>p<=tgt+1.5)||allowed[allowed.length-1]||uniq[0]),lever='none';
  wrap.innerHTML='<h4>Prezzo al flacone · costo 3 € · il tuo capo vieta di scendere sotto '+price(fl)+'</h4>';
  const pr=document.createElement('div');pr.className='prices';
  uniq.forEach(p=>{const bt=document.createElement('button');bt.className='pbtn';bt.textContent=price(p)+(p===counter?' ★':'');bt.setAttribute('aria-pressed',p===p0);if(p<fl){bt.disabled=true;bt.title='Sotto il minimo del capo';}bt.onclick=()=>{p0=p;pr.querySelectorAll('.pbtn').forEach(x=>x.setAttribute('aria-pressed',false));bt.setAttribute('aria-pressed',true);sfx.click();};pr.appendChild(bt);});
  wrap.appendChild(pr);
  const h2=document.createElement('h4');h2.textContent='Una leva per questo round';wrap.appendChild(h2);
  const LEV=[['none',{t:'Nessuna leva',d:'Prezzo nudo e crudo.',bonus:0,cost:0}]].concat(C.levers.map(l=>[l,K.LEVERS[l]]));
  const lv=document.createElement('div');lv.className='levers';
  LEV.forEach(([k,L])=>{const lab=document.createElement('label');lab.className='lev';const r=document.createElement('input');r.type='radio';r.name='lever';r.id='lev-'+k;r.value=k;r.checked=k==='none';if(L.cost>S.budget||S.flags['lev_'+k])r.disabled=true;r.onchange=()=>{lever=k;sfx.click();};const sp=document.createElement('span');sp.innerHTML='<b>'+L.t+(L.cost?' <span class="chip cost">−'+eur(L.cost)+' €</span>':'')+(S.flags['lev_'+k]?' <span class="chip">già usata</span>':'')+'</b>'+L.d;lab.appendChild(r);lab.appendChild(sp);lv.appendChild(lab);});
  wrap.appendChild(lv);
  const sub=document.createElement('button');sub.className='btn primary';sub.textContent='Proponi '+price(p0);
  pr.addEventListener('click',()=>{sub.textContent='Proponi '+price(p0);});
  sub.onclick=()=>{sfx.click();stopTimer();const L=LEV.find(x=>x[0]===lever)[1];if(L.cost)spend(L.cost);if(lever!=='none')S.flags['lev_'+lever]=true;
    const base=(S.interesse*.5+S.fiducia*.3+S.rep*.2)/100;
    let bonus=L.bonus;let bribeFail=false;
    if(L.bribe){if(C.dm.traits.includes('etico')){bonus=-1;bribeFail=true;}else if(!C.dm.traits.includes('corruttibile')){bonus=.1;if(Math.random()<.35)bribeFail=true;}}
    let p=base-(p0-tgt)*.14*(tirchio?K.TRAITS.tirchio.priceMul:1)+bonus-(S.round-1)*.04+(S.flags.urgenza?.1:0)+(S.flags.rivalWeak?.05:0);
    if(counter&&p0<=counter)p=Math.max(p,.95);p=clamp(p,.03,.97);
    const tu=E.getChar('tu');if(tu){tu.talking=2;tu.gesture=1.4;}
    if(L.units)S.units=C.units*L.units;else if(!S.units)S.units=C.units;
    if(bribeFail&&C.dm.traits.includes('etico')){sfx.ko();E.mood('dm','angry');E.emote('dm','angry');say('dm',`"Un weekend alle terme." Si alza. "Mi sta corrompendo. Nel mio ufficio." Chiama l'assistente. "Accompagna il signore alla porta."`);applyFx({fiducia:-40,rep:-30});S.price=null;renderChoices([{label:'Aspetta il verdetto',primary:true,go:()=>go('p6_intro')}]);return;}
    if(Math.random()<p){sfx.ok();S.price=p0;E.mood('dm','happy');ANIM.handshake();
      say('dm',`"${price(p0)}${L.units?', '+eur(S.units)+' pezzi':''}${lever==='pay90'?', a 90 giorni':''}${bribeFail?'. E quel weekend non l\'ho mai sentito nominare':''}. Va bene. Firmo l'intesa preliminare, la decisione finale la prendo stasera con il comitato."`);applyFx({fiducia:5,interesse:5});if(bribeFail)applyFx({rep:-20});
      renderChoices([{label:'Stringi la mano',primary:true,go:()=>go('p6_intro')}]);}
    else{sfx.ko();E.mood('dm','angry');const c=Math.max(fl,Math.max(tgt,Math.round((p0-1.5)*2)/2));S.counter=c;if(bribeFail)applyFx({rep:-20});
      if(S.round>=3){say('dm',`"Non ci siamo. Ci devo pensare. L'assistente la accompagna in sala d'attesa."`);applyFx({interesse:-10});S.price=null;renderChoices([{label:'Aspetta il verdetto',primary:true,go:()=>go('p6_intro')}]);}
      else{S.round++;say('dm',pick([`"Troppo. A <em>${price(c)}</em> ci possiamo parlare. Riprovi."`,`"${price(p0)}? Per uno spray?" Scrive <em>${price(c)}</em> su un foglio e lo gira verso di te.`,`"No." Pausa. "${price(c)}. E non lo ripeto."`]));applyFx({interesse:-4});renderChoices([{label:'Nuova proposta',primary:true,go:()=>go('p5_round')}]);}}
  };
  wrap.appendChild(sub);box.appendChild(wrap);
  startTimer(nagLoop('dm'));
}

/* ---------------------------------------------------------------- VERDICT */
function outcome(){
  if(S.rep<15)return 'cacciato';
  const score=S.interesse*.45+S.fiducia*.35+S.rep*.2+(S.price?10:-10)+(S.flags.esclusiva?3:0)+(S.flags.urgenza?4:0);
  if(score>=85)return 'mega';if(score>=62)return 'deal';if(score>=45)return 'pilota';return 'no';
}
const VERDICT={
  mega:{title:'MEGA ORDINE',grade:'S',text:()=>`"Ho deciso. <em>${eur(S.units*3)} flaconi</em>, esclusiva nazionale, lancio tra un mese in tutte le sedi.${C.pet?' E voglio '+C.pet.name+' sulla confezione.':''}"`,units:()=>S.units*3},
  deal:{title:'ORDINE FIRMATO',grade:'A',text:()=>`"Facciamo l'ordine: <em>${eur(S.units)} flaconi</em>. Se vende, raddoppiamo. Se non vende, lei non è mai esistito."`,units:()=>S.units},
  pilota:{title:'TEST PILOTA',grade:'B',text:()=>`"Test pilota: <em>${eur(Math.min(S.units,2000))} flaconi</em> in poche sedi. Se funziona ne riparliamo. Se non funziona, non ne riparliamo."`,units:()=>Math.min(S.units,2000)},
  no:{title:'NESSUN ORDINE',grade:'C',text:()=>`"No. La presentazione mi è piaciuta, ma non mi fido abbastanza. Lasci pure il flacone${C.pet?', per '+C.pet.name:''}."`,units:()=>0},
  cacciato:{title:'CACCIATO',grade:'D',text:()=>`"Vigilanza? Può accompagnare il signore? E stavolta fino al parcheggio."`,units:()=>0},
};
function renderVerdict(){
  const o=outcome();const v=VERDICT[o];if(!S.units)S.units=C.units;
  E.lock('dm',true);E.mood('dm',o==='mega'||o==='deal'?'happy':o==='no'||o==='cacciato'?'angry':'neutral');E.focus(E.getChar('dm').x,E.getChar('dm').y-90,1.25);
  if(o!=='no'&&o!=='cacciato'&&!S.price)S.price=target();
  say('dm',v.text());
  if(o==='cacciato')ANIM.kicked();if(o==='mega')setTimeout(()=>ANIM.confetti(),800);
  renderChoices([{label:'Vedi il risultato',primary:true,go:()=>endClient(o)}]);
}
function endClient(o){
  stopTimer();const v=VERDICT[o];const units=v.units();const pr=S.price||0;const ricavo=units*pr;const margine=units*(pr-3);const netto=margine-S.spent;
  CAREER.done++;CAREER.used.push(C.company.id);CAREER.results.push({company:C.company.name,dm:C.dm.full,grade:v.grade,title:v.title,netto,units,price:pr});CAREER.total+=netto;
  CAREER.budget=clamp(Math.round(S.budget+1000+Math.max(0,netto)*.05),500,4000);
  const last=CAREER.done>=CAREER.clients;
  const card=document.createElement('div');card.className='card';
  card.innerHTML='<div class="grade">'+v.grade+'</div><h2>'+v.title+'</h2><p><b>'+C.company.name+'</b> · '+C.dm.full+'</p><p>'+v.text().replace(/<\/?em>/g,'')+'</p>'+
   '<div class="ledger"><span>Prezzo concordato</span><b>'+(pr?price(pr):'—')+'</b><span>Flaconi</span><b>'+eur(units)+'</b><span>Ricavo</span><b>'+eur(ricavo)+' €</b><span>Margine lordo (costo 3 €)</span><b>'+eur(margine)+' €</b><span>Speso in informatori, mazzette e promo</span><b>−'+eur(S.spent)+' €</b><span class="tot">Risultato netto</span><b class="tot">'+eur(netto)+' €</b></div>'+
   '<p class="help">Fiducia '+Math.round(S.fiducia)+' · Interesse '+Math.round(S.interesse)+' · Reputazione '+Math.round(S.rep)+' · Tratti scoperti '+C.intel.length+'/3'+(S.flags.esclusiva?' · Esclusiva concessa':'')+(S.flags.ancoraBassa?' · Hai ancorato tu il prezzo in basso':'')+'</p>'+
   (last?careerSummary():'<p class="help">Prossimo cliente con <b>'+eur(CAREER.budget)+' €</b> di budget (residuo + 1.000 € + 5% dell\'utile).</p>')+
   '<button class="btn primary" id="again">'+(last?'Nuova carriera':'Prossimo cliente ('+(CAREER.done+1)+'/'+CAREER.clients+')')+'</button>';
  const ov=$('overlay');ov.innerHTML='';ov.appendChild(card);ov.hidden=false;
  $('again').onclick=()=>{sfx.click();ov.innerHTML='';if(last){CAREER.done=0;CAREER.used=[];CAREER.results=[];CAREER.budget=2000;CAREER.total=0;}ov.hidden=true;startClient();};
  (o==='mega'||o==='deal')?sfx.win():sfx.ko();
}
function careerSummary(){
  const rows=CAREER.results.map(r=>'<span>'+r.company+' <small>('+r.grade+' · '+r.title.toLowerCase()+')</small></span><b>'+eur(r.netto)+' €</b>').join('');
  const rank=CAREER.total>=400000?'Leggenda della pupù':CAREER.total>=150000?'Direttore commerciale':CAREER.total>=40000?'Venditore solido':CAREER.total>0?'Apprendista':'Riciclato nelle scope';
  return '<h2>Trimestre chiuso</h2><div class="ledger">'+rows+'<span class="tot">Totale trimestre</span><b class="tot">'+eur(CAREER.total)+' €</b></div><p><b>Titolo guadagnato:</b> '+rank+'</p>';
}

/* ---------------------------------------------------------------- BOOT */
function startClient(){
  S=newState();C=K.buildGame(CAREER.used);C.secretKnown=false;C.lead='fredda';
  if(!PLAYER_LOOK){PLAYER_LOOK=E.randomLook('player');}TECH_LOOK=E.randomLook('tech');
  NODES=buildNodes();S.scene=0;refreshHUD();go('p1_intro');
}
function start(){
  S=newState();refreshHUD();
  $('play').onclick=()=>{sfx.click();$('overlay').hidden=true;startClient();};
  $('dossier-toggle').onclick=()=>{$('dossier').classList.toggle('open');};
}
start();
})();
