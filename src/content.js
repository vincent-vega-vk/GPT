/* ===================================================================== CONTENT
   Everything random: companies, decision makers, traits, gatekeepers, venues,
   rooms, choice pools, twists, levers. buildGame() returns a fresh context C
   and a dialogue tree NODES generated for that client.
============================================================================ */
(function(){
'use strict';
const {rnd,pick,clamp,WORLD}=window.ENGINE;
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const take=(a,n)=>shuffle(a).slice(0,n);
const eur=n=>Math.round(n).toLocaleString('it-IT');
const price=p=>p.toFixed(2).replace('.',',')+' €';

/* ---------------------------------------------------------------- NAMES */
const FIRST_F=['Marta','Giulia','Chiara','Federica','Silvia','Laura','Valentina','Elena','Roberta','Paola','Simona','Alessia','Ludovica','Benedetta','Carla','Serena','Irene','Monica','Daniela','Antonella'];
const FIRST_M=['Marco','Luca','Andrea','Giovanni','Paolo','Francesco','Matteo','Roberto','Stefano','Alberto','Massimo','Fabio','Gianluca','Enrico','Tommaso','Davide','Riccardo','Claudio','Sergio','Vittorio'];
const LAST=['Bellini','Rossi','Ferrari','Esposito','Colombo','Ricci','Greco','Bruno','Gallo','Conti','Mancini','Costa','Fontana','Moretti','Barbieri','Santoro','Marini','Rinaldi','Caruso','Ferraro','Lombardi','Vitale','Serra','Pellegrini','De Luca','Gatti','Sala','Parisi','Longo','Testa','Pagano','Bianchi','Romano','Galli','Martini','Ferretti'];
const PETNAMES={dog:['Napoleone','Brontolo','Pupo','Garibaldi','Spritz','Churchill','Polpetta'],cat:['Cleopatra','Mefisto','Nutella','Agente Smith','Biscotto'],parrot:['Capitano','Rocco','Pavarotti','Sbarbatello'],goat:['Heidi','Tyson','Salvini'],pigeon:['Piccione','Piero','Il Sindaco']};
function person(g){g=g||(Math.random()<.5?'f':'m');return {g,first:g==='f'?pick(FIRST_F):pick(FIRST_M),last:pick(LAST)};}

/* ---------------------------------------------------------------- TRAITS */
const TRAITS={
  numeri:{label:'Vuole numeri',desc:'Dati e margini la convincono, le storie la annoiano.',tags:{dati:{interesse:8,fiducia:3},storia:{interesse:-6}}},
  gioviale:{label:'Gioviale',desc:'Ride volentieri: l\'umorismo paga, la formalità stanca.',tags:{umorismo:{fiducia:8,interesse:5},formale:{fiducia:-4}}},
  scettico:{label:'Scettico',desc:'Verifica tutto. I bluff vengono scoperti più spesso.',tags:{bluff:{chance:-.22},onesto:{fiducia:7}}},
  igienista:{label:'Igienista',desc:'Terrorizzato dai germi: la parola "sanifica" è musica. Le demo sporche no.',tags:{sporco:{fiducia:-15,interesse:-5},sanifica:{interesse:9}}},
  frettoloso:{label:'Frettoloso',desc:'Pazienza dimezzata. Le frasi brevi vincono.',tags:{breve:{fiducia:6},lungo:{fiducia:-8}},patience:.55},
  vanitoso:{label:'Vanitoso',desc:'Le lusinghe funzionano davvero.',tags:{adulazione:{fiducia:14,interesse:6}}},
  etico:{label:'Etico',desc:'Se scopre una mazzetta è finita. Premia l\'onestà.',tags:{mazzetta:{rep:-20,fiducia:-10},onesto:{fiducia:8}}},
  corruttibile:{label:'Corruttibile',desc:'Un "regalo personale" in trattativa può chiudere tutto.',tags:{mazzetta:{chance:.3}}},
  animalista:{label:'Animalista',desc:'Ama gli animali: le demo con l\'animale incantano, le battute crudeli no.',tags:{animali:{interesse:12,fiducia:5},crudele:{fiducia:-20}}},
  burocrate:{label:'Burocrate',desc:'Vuole certificazioni, allegati e protocolli.',tags:{certificazioni:{fiducia:9,interesse:4},bluff:{chance:-.1}}},
  tecnofilo:{label:'Tecnofilo',desc:'App, QR code, dashboard: tutto ciò che è digitale lo eccita.',tags:{tech:{interesse:11}}},
  tirchio:{label:'Tirchio',desc:'Il prezzo pesa il doppio. Le leve gratuite valgono oro.',tags:{},priceMul:1.6},
  nostalgico:{label:'Nostalgico',desc:'Si commuove con le storie e i ricordi.',tags:{storia:{interesse:10,fiducia:6},dati:{interesse:-4}}},
};
const TRAIT_IDS=Object.keys(TRAITS);

/* ---------------------------------------------------------------- COMPANIES */
const COMPANIES=[
  {id:'iperfresco',name:'IperFresco',sector:'grande distribuzione',tag:'412 supermercati',col:'#2e7d4f',logo:'leaf',units:[20000,60000],target:[4.5,6],role:{f:'Direttrice Acquisti',m:'Direttore Acquisti'},pain:'il reparto casa è fermo da tre anni',setting:'gdo',variant:'classic',pets:['dog','cat']},
  {id:'ospedale',name:'Ospedale San Clemente',sector:'sanità',tag:'900 posti letto',col:'#1f6fb2',logo:'cross',units:[6000,18000],target:[6,8.5],role:{f:'Direttrice Sanitaria',m:'Direttore Sanitario'},pain:'il reparto di geriatria è un campo di battaglia',setting:'ospedale',variant:'medical',pets:['cat']},
  {id:'hotel',name:'Grand Hotel Miramare',sector:'hospitality',tag:'5 stelle, 240 camere',col:'#8a6a2a',logo:'star',units:[3000,9000],target:[8,11],role:{f:'Direttrice Generale',m:'Direttore Generale'},pain:'gli ospiti con cani lasciano ricordini sui tappeti persiani',setting:'hotel',variant:'luxe',pets:['dog','parrot']},
  {id:'comune',name:'Comune di Castelpupo',sector:'pubblica amministrazione',tag:'48.000 abitanti, 12 parchi',col:'#b3263a',logo:'shield',units:[10000,30000],target:[3.5,5],role:{f:'Assessora all\'Ambiente',m:'Assessore all\'Ambiente'},pain:'i parchi sono un campo minato di cacche di cane',setting:'comune',variant:'industrial',pets:['dog','pigeon']},
  {id:'aerolinea',name:'VolaBene Airlines',sector:'trasporto aereo',tag:'38 aerei, 4 milioni di passeggeri',col:'#2a3a8a',logo:'plane',units:[15000,40000],target:[5,7],role:{f:'Procurement Manager',m:'Procurement Manager'},pain:'i bagni degli aerei di ritorno da Ibiza',setting:'aeroporto',variant:'industrial',pets:['cat']},
  {id:'zoo',name:'Zoo Safari Pianura',sector:'parchi zoologici',tag:'1.200 animali, 600.000 visitatori',col:'#5a8a2a',logo:'paw',units:[8000,25000],target:[4,6],role:{f:'Direttrice dello Zoo',m:'Direttore dello Zoo'},pain:'gli elefanti producono 100 kg al giorno. A testa.',setting:'zoo',variant:'pet',pets:['goat','parrot']},
  {id:'crociere',name:'Crociere Nettuno',sector:'turismo',tag:'6 navi, 18.000 cabine',col:'#1a4a7a',logo:'anchor',units:[20000,50000],target:[6,8],role:{f:'Responsabile Acquisti di Flotta',m:'Responsabile Acquisti di Flotta'},pain:'mare mosso più buffet illimitato: faccia lei i conti',setting:'porto',variant:'luxe',pets:['parrot','dog']},
  {id:'asili',name:'Asili Nido Girotondo',sector:'infanzia',tag:'64 asili in Lombardia',col:'#e07a3a',logo:'sun',units:[5000,15000],target:[4,6],role:{f:'Coordinatrice Pedagogica',m:'Coordinatore Pedagogico'},pain:'640 bambini e zero controllo degli sfinteri',setting:'asilo',variant:'kids',pets:['cat']},
  {id:'palestre',name:'FitZone Palestre',sector:'fitness',tag:'90 club, 200.000 iscritti',col:'#e0392c',logo:'dumbbell',units:[6000,20000],target:[5,7],role:{f:'Head of Operations',m:'Head of Operations'},pain:'gli spogliatoi del lunedì mattina',setting:'palestra',variant:'classic',pets:['dog']},
  {id:'treni',name:'TrenoRapido',sector:'trasporto ferroviario',tag:'320 treni al giorno',col:'#8a1a1a',logo:'train',units:[25000,70000],target:[3.5,5.5],role:{f:'Direttrice Servizi di Bordo',m:'Direttore Servizi di Bordo'},pain:'i bagni della Milano-Reggio Calabria',setting:'stazione',variant:'industrial',pets:['pigeon']},
  {id:'festival',name:'Festival Rock del Fango',sector:'eventi',tag:'3 giorni, 80.000 persone, 40 bagni chimici',col:'#5a2a8a',logo:'guitar',units:[10000,30000],target:[3,5],role:{f:'Direttrice di Produzione',m:'Direttore di Produzione'},pain:'quaranta bagni chimici per ottantamila persone',setting:'festival',variant:'industrial',pets:['dog','goat']},
  {id:'autogrill',name:'AutoStop Aree di Servizio',sector:'ristorazione autostradale',tag:'210 aree su tutta la rete',col:'#e07a20',logo:'cup',units:[20000,60000],target:[4,6],role:{f:'Category Manager',m:'Category Manager'},pain:'i bagni di Ferragosto sulla A1',setting:'autogrill',variant:'classic',pets:['dog','cat']},
  {id:'caserma',name:'Caserma Garibaldi',sector:'difesa',tag:'2.400 reclute',col:'#4a5a2a',logo:'shield',units:[15000,40000],target:[3.5,5],role:{f:'Colonnella',m:'Colonnello'},pain:'le latrine dopo il rancio del giovedì',setting:'caserma',variant:'industrial',pets:['dog']},
  {id:'petstore',name:'Pet Paradise Store',sector:'retail per animali',tag:'140 negozi',col:'#c94f7c',logo:'paw',units:[10000,30000],target:[5,7.5],role:{f:'Buyer Senior',m:'Buyer Senior'},pain:'i clienti entrano col cane e il cane entra con un piano',setting:'petstore',variant:'pet',pets:['dog','cat','parrot']},
  {id:'scuole',name:'Istituto Comprensivo Manzoni',sector:'istruzione',tag:'1.800 alunni, 3 plessi',col:'#2a6a9a',logo:'book',units:[4000,12000],target:[3,4.5],role:{f:'Dirigente Scolastica',m:'Dirigente Scolastico'},pain:'i bagni della scuola media. Basta la parola.',setting:'scuola',variant:'kids',pets:['cat']},
  {id:'taxi',name:'Cooperativa TaxiBlu',sector:'trasporto urbano',tag:'1.100 auto',col:'#2a8ac0',logo:'wheel',units:[3000,8000],target:[5,7],role:{f:'Presidente',m:'Presidente'},pain:'i clienti del sabato notte',setting:'taxi',variant:'classic',pets:['dog']},
];
const VARIANTS={classic:'Classic',kids:'Kids (senza profumo, tappo a prova di bimbo)',pet:'Pet (enzimi per cani, gatti e capre)',industrial:'Industrial (tanica da 5 litri, nebulizzatore)',luxe:'Luxe (profumo di fico e vetiver)',medical:'Medical (sanificante ospedaliero)'};

/* ---------------------------------------------------------------- GATEKEEPERS */
const GATES={
  reception:{label:'Reception',role:'reception',cost:[100,220],corr:.65,persuade:.28,g:'f'},
  security:{label:'Vigilanza',role:'security',cost:[40,90],corr:.5,persuade:.12,g:'m'},
  assistant:{label:'Assistente',role:'assistant',cost:[250,420],corr:.85,persuade:.35},
  concierge:{label:'Concierge',role:'concierge',cost:[150,260],corr:.75,persuade:.3,g:'m'},
  nurse:{label:'Caposala',role:'nurse',cost:[80,160],corr:.3,persuade:.4,g:'f'},
  soldier:{label:'Sentinella',role:'soldier',cost:[30,70],corr:.2,persuade:.1,g:'m'},
  nun:{label:'Suora portinaia',role:'nun',cost:[50,100],corr:.08,persuade:.5,g:'f'},
  bidello:{label:'Bidello',role:'worker',cost:[40,90],corr:.75,persuade:.4,g:'m'},
  keeper:{label:'Guardiano',role:'worker',cost:[50,110],corr:.6,persuade:.35},
  trainer:{label:'Personal trainer',role:'worker',cost:[60,120],corr:.55,persuade:.3},
  steward:{label:'Steward di terra',role:'pilot',cost:[80,150],corr:.5,persuade:.3},
  barista:{label:'Barista',role:'chef',cost:[30,70],corr:.8,persuade:.45,g:'m'},
  roadie:{label:'Roadie',role:'worker',cost:[40,90],corr:.9,persuade:.4,g:'m'},
  capotreno:{label:'Capotreno',role:'pilot',cost:[60,120],corr:.4,persuade:.3},
  tassista:{label:'Tassista di turno',role:'worker',cost:[40,90],corr:.7,persuade:.45,g:'m'},
};
const GATES_BY_SETTING={gdo:['reception','security','assistant'],ospedale:['reception','nurse','security'],hotel:['concierge','reception','assistant'],comune:['security','reception','assistant'],aeroporto:['steward','security','reception'],zoo:['keeper','reception','security'],porto:['concierge','security','steward'],asilo:['nun','reception','assistant'],palestra:['trainer','reception','security'],stazione:['capotreno','security','reception'],festival:['roadie','security','assistant'],autogrill:['barista','reception','security'],caserma:['soldier','soldier','assistant'],petstore:['reception','keeper','security'],scuola:['bidello','nun','reception'],taxi:['tassista','reception','security']};
const DISGUISES=[['idraulico','"Sono l\'idraulico. Mi hanno chiamato per una perdita al terzo piano."','plumber'],['ispettore ASL','"Ispezione ASL a sorpresa. Mi faccia passare o chiudo tutto."','inspector'],['corriere','"Pacco urgente, firma del destinatario obbligatoria."','courier'],['prete','"Benedizione annuale degli uffici. Dove trovo la direzione?"','priest'],['tecnico delle fotocopiatrici','"Manutenzione fotocopiatrici. Sa quante ne ho viste esplodere?"','worker'],['giornalista','"Reportage sulle eccellenze italiane. La direzione mi aspetta."','journalist']];

/* ---------------------------------------------------------------- VENUES (phase 1) */
const VENUES={
  fiera:{title:'Fiera HYGIENIKA · Rimini',intro:()=>`Fiera <em>HYGIENIKA</em>, Rimini. Padiglioni infiniti, moquette blu, caffè a 3 euro. Ti serve un decisore vero: qualcuno che firmi ordini da migliaia di pezzi.`,extraRoles:['random','random','courier','worker']},
  lounge:{title:'Lounge · Aeroporto di Linate',intro:()=>`Lounge business di Linate, ore 7:40. Tutti fingono di lavorare. Tu hai un flacone di Pulisci Pupù nel bagaglio a mano e un volo in ritardo: ottanta minuti per trovare un decisore.`,extraRoles:['pilot','random','random']},
  golf:{title:'Golf Club Le Querce',intro:()=>`Golf Club Le Querce, buca 9. Sei stato invitato da un amico che non gioca. Qui, tra un putt e un prosecco, si decidono budget da milioni.`,extraRoles:['random','worker']},
  matrimonio:{title:'Matrimonio di tuo cugino · Tendone',intro:()=>`Il matrimonio di tuo cugino Dino. Tendone, tavolo 14, tra gli zii. Tu hai la valigetta sotto la sedia. Sì, hai portato la valigetta a un matrimonio.`,extraRoles:['random','random','kid','chef']},
  convegno:{title:'Convegno "Retail Futuro" · Milano',intro:()=>`Convegno <em>Retail Futuro</em>. Trecento persone in platea, un relatore che dice "disruption" ogni nove secondi. Tu sei in terza fila con un piano.`,extraRoles:['random','journalist']},
  bar:{title:'Bar dello Sport · sotto la sede',intro:()=>`Bar dello Sport, di fronte alla sede del cliente. Ore 8:10. Il caffè dei dipendenti passa tutto da qui. Anche quello dei dirigenti.`,extraRoles:['random','random','worker','chef']},
  treno:{title:'Frecciarossa 9612 · carrozza 4',intro:()=>`Frecciarossa Roma-Milano, carrozza 4, posto 7C. Tre ore. Davanti a te, un sacco di gente in giacca con il laptop aperto. Qualcuno di loro decide.`,extraRoles:['random','capotreno']},
};

/* ---------------------------------------------------------------- ROOMS */
const THEMES={
  gdo:{wall:'#e9efe6',wallStyle:'panel',floor:'#cfd6cc',floorStyle:'tiles',gloss:true,view:'city',lobby:[{t:'gondola',x:60,y:170,w:300,h:150},{t:'cart',x:420,y:430},{t:'vending',x:1180,y:330}],office:[{t:'shelf',x:400,y:120,w:150,h:170}],meeting:[{t:'cart',x:1150,y:440}],extras:['random','random','courier','worker']},
  ospedale:{wall:'#e6f0f6',wallStyle:'tile',floor:'#d8e4ec',floorStyle:'tiles',gloss:true,view:'park',lobby:[{t:'bed',x:80,y:300,w:200},{t:'cooler',x:440,y:330},{t:'vending',x:1180,y:330}],office:[{t:'painting',x:400,y:100,w:120,h:90,a:'#8fd3ff',b:'#1f6fb2'},{t:'cooler',x:480,y:330}],meeting:[{t:'cooler',x:1150,y:330}],extras:['nurse','random','tech','random']},
  hotel:{wall:'#f0e6d0',wallStyle:'stripes',floor:'#7a2a2a',floorStyle:'carpet',gloss:false,view:'sea',lobby:[{t:'chandelier',x:400,y:90},{t:'chandelier',x:900,y:90},{t:'sofa',x:80,y:300,w:220,col:'#8a1a2a'},{t:'plant',x:440,y:330,pot:'#c9a24a'},{t:'plant',x:1200,y:330,pot:'#c9a24a'}],office:[{t:'painting',x:400,y:90,w:130,h:100,a:'#ffd27a',b:'#8a6a2a'},{t:'plant',x:480,y:330,pot:'#c9a24a'}],meeting:[{t:'chandelier',x:640,y:60},{t:'plant',x:1150,y:330,pot:'#c9a24a'}],extras:['concierge','random','chef','random']},
  comune:{wall:'#efe8dc',wallStyle:'panel',floor:'#d9d2c4',floorStyle:'marble',gloss:true,view:'park',lobby:[{t:'flag',x:120,y:330},{t:'flag',x:170,y:330,cols:['#0a3a8a','#0a3a8a','#0a3a8a']},{t:'painting',x:240,y:90,w:160,h:120,a:'#cfe8ff',b:'#5a3a1a'},{t:'sofa',x:1080,y:300,w:180,col:'#2a4a7a'}],office:[{t:'flag',x:470,y:330},{t:'painting',x:380,y:90,w:120,h:90,a:'#cfe8ff',b:'#5a3a1a'}],meeting:[{t:'flag',x:1180,y:330},{t:'flag',x:1220,y:330,cols:['#0a3a8a','#0a3a8a','#0a3a8a']}],extras:['random','soldier','priest','random']},
  aeroporto:{wall:'#e8ecf2',wallStyle:'glass',floor:'#c8ccd4',floorStyle:'tiles',gloss:true,view:'runway',lobby:[{t:'lounge',x:60,y:70,w:420},{t:'seats',x:80,y:300,rows:1,cols:5,col:'#2a3a8a'},{t:'vending',x:1180,y:330}],office:[{t:'painting',x:390,y:90,w:140,h:90,a:'#5fa8ff',b:'#2a3a8a'}],meeting:[{t:'lounge',x:800,y:60,w:420}],extras:['pilot','random','random','courier','kid']},
  zoo:{wall:'#dfe8c8',wallStyle:'brick',floor:'#9aa070',floorStyle:'grass',gloss:false,view:'zoo',lobby:[{t:'cage',x:60,y:110,w:260,h:220},{t:'plant',x:440,y:330},{t:'plant',x:1200,y:330}],office:[{t:'cage',x:380,y:140,w:180,h:190}],meeting:[{t:'plant',x:1150,y:330},{t:'plant',x:120,y:330}],extras:['kid','random','worker','kid']},
  porto:{wall:'#dde8f0',wallStyle:'stripes',floor:'#8a6a4a',floorStyle:'wood',gloss:true,view:'sea',lobby:[{t:'painting',x:100,y:80,w:200,h:130,a:'#5fa8ff',b:'#1a4a7a'},{t:'sofa',x:120,y:300,w:200,col:'#1a4a7a'},{t:'plant',x:1200,y:330}],office:[{t:'painting',x:380,y:90,w:150,h:100,a:'#5fa8ff',b:'#1a4a7a'}],meeting:[{t:'painting',x:1080,y:80,w:150,h:100,a:'#5fa8ff',b:'#1a4a7a'}],extras:['pilot','random','chef','random']},
  asilo:{wall:'#fff3c4',wallStyle:'plain',floor:'#f2c4a0',floorStyle:'carpet',gloss:false,view:'park',lobby:[{t:'toys',x:80,y:330},{t:'lockers',x:1080,y:150,w:180,h:180}],office:[{t:'toys',x:400,y:330},{t:'painting',x:380,y:90,w:140,h:100,a:'#ffd27a',b:'#e07a3a'}],meeting:[{t:'toys',x:1100,y:330}],extras:['kid','kid','random','nun']},
  palestra:{wall:'#3a3a44',wallStyle:'brick',floor:'#555',floorStyle:'wood',gloss:true,view:'city',lobby:[{t:'dumbbells',x:120,y:330},{t:'lockers',x:1060,y:150,w:200,h:180},{t:'cooler',x:440,y:330}],office:[{t:'dumbbells',x:420,y:330},{t:'painting',x:380,y:90,w:140,h:100,a:'#e0392c',b:'#222'}],meeting:[{t:'dumbbells',x:1120,y:330}],extras:['random','worker','random'],dark:true},
  stazione:{wall:'#e4e4e8',wallStyle:'tile',floor:'#b8b8c0',floorStyle:'tiles',gloss:true,view:'city',lobby:[{t:'lounge',x:60,y:70,w:420},{t:'seats',x:80,y:300,rows:1,cols:4,col:'#8a1a1a'},{t:'vending',x:1180,y:330}],office:[{t:'clock',x:450,y:110,r:28,hour:9},{t:'painting',x:380,y:160,w:140,h:90,a:'#cfe8ff',b:'#8a1a1a'}],meeting:[{t:'clock',x:1150,y:110,r:30,hour:11}],extras:['random','courier','soldier','random']},
  festival:{wall:'#5fa8ff',wallStyle:'sky',floor:'#6a5a3a',floorStyle:'grass',gloss:false,view:null,lobby:[{t:'stage',x:60,y:300,w:400},{t:'bar',x:1000,y:280,w:260}],office:[{t:'stage',x:360,y:300,w:200}],meeting:[{t:'bar',x:1020,y:280,w:240}],extras:['random','worker','kid','random'],noWindows:true},
  autogrill:{wall:'#f3ead8',wallStyle:'panel',floor:'#c9b89a',floorStyle:'tiles',gloss:true,view:'mountains',lobby:[{t:'bar',x:60,y:280,w:380},{t:'gondola',x:1020,y:170,w:240,h:150}],office:[{t:'shelf',x:400,y:120,w:150,h:170}],meeting:[{t:'coffee',x:1180,y:330}],extras:['random','courier','chef','random']},
  caserma:{wall:'#dcdccc',wallStyle:'brick',floor:'#9a9a80',floorStyle:'tiles',gloss:false,view:'park',lobby:[{t:'barrier',x:200,y:330,w:200},{t:'flag',x:120,y:330},{t:'flag',x:1200,y:330}],office:[{t:'flag',x:470,y:330},{t:'painting',x:380,y:90,w:120,h:90,a:'#8a8a6a',b:'#4a5a2a'}],meeting:[{t:'flag',x:1180,y:330}],extras:['soldier','soldier','random']},
  petstore:{wall:'#fbe6ee',wallStyle:'panel',floor:'#d8c8b8',floorStyle:'tiles',gloss:true,view:'city',lobby:[{t:'gondola',x:60,y:170,w:300,h:150},{t:'cage',x:1040,y:140,w:200,h:190}],office:[{t:'aquarium',x:380,y:140,w:160,h:110}],meeting:[{t:'aquarium',x:1060,y:140,w:160,h:110}],extras:['random','kid','courier','random']},
  scuola:{wall:'#e8f0d8',wallStyle:'tile',floor:'#c8c0a8',floorStyle:'tiles',gloss:false,view:'park',lobby:[{t:'lockers',x:60,y:150,w:240,h:180},{t:'whiteboard',x:1060,y:80,w:200,h:140,title:'Verifica di chimica',note:'media 5,5'}],office:[{t:'shelf',x:400,y:120,w:150,h:170}],meeting:[{t:'lockers',x:1060,y:150,w:200,h:180}],extras:['kid','kid','random','random']},
  taxi:{wall:'#e6ecf2',wallStyle:'panel',floor:'#bbb',floorStyle:'tiles',gloss:true,view:'city',lobby:[{t:'seats',x:80,y:300,rows:1,cols:4,col:'#2a8ac0'},{t:'vending',x:1180,y:330},{t:'cooler',x:460,y:330}],office:[{t:'painting',x:380,y:90,w:140,h:100,a:'#2a8ac0',b:'#222'}],meeting:[{t:'cooler',x:1150,y:330}],extras:['random','courier','random']},
};
function env(){const w=pick(['sole','sole','pioggia','tramonto','neve']);return {weather:w};}
function roomLobby(C){const T=THEMES[C.company.setting],col=C.company.col;
  const items=[{t:'lights',x:200,gap:300,n:4},{t:'logo',x:C.company.name.length>18?480:560,y:70,col,shape:C.company.logo,text:C.company.name,r:26,size:C.company.name.length>22?20:C.company.name.length>16?24:30},{t:'elevator',x:900,y:140,floor:3}].concat(T.lobby);
  return {front:[{t:'counter',x:560,y:300,w:270,col:col,text:'RECEPTION',bell:true}],wall:T.wall,wallStyle:T.wallStyle,floor:T.floor,floorStyle:T.floorStyle,gloss:T.gloss,floorY:330,weather:C.weather,night:false,windows:T.noWindows||!T.view?[]:[{x:40,y:70,w:200,h:150,view:T.view}].filter(()=>T.wallStyle!=='sky'),items,extrasRate:5,extraRoles:T.extras};}
function indoor(T){return T.wallStyle==='sky'?Object.assign({},T,{wall:'#efe8dc',wallStyle:'panel',floor:'#8a6a4a',floorStyle:'wood',gloss:false,noWindows:false,view:'park'}):T;}
function roomOffice(C,night){const T=indoor(THEMES[C.company.setting]),col=C.company.col;
  const items=[{t:'lights',x:300,gap:380,n:3},{t:'whiteboard',x:60,y:70,w:300,h:180,title:'Q4 · '+C.company.sector,note:C.company.pain.slice(0,34)},{t:'desk',x:640,y:320,w:380,lamp:true,papers:true,text:C.company.name.slice(0,16)},{t:'logo',x:1140,y:120,col,shape:C.company.logo,r:30},{t:'clock',x:470,y:100,r:26,hour:night?18:10},{t:'plant',x:560,y:330}].concat(T.office);
  return {wall:T.wall,wallStyle:T.wallStyle,floor:T.floor,floorStyle:T.floorStyle,gloss:T.gloss,floorY:330,weather:night?'tramonto':C.weather,night,windows:T.noWindows?[]:[{x:640,y:60,w:360,h:210,view:T.view||'park'}],items,extrasRate:0,extraRoles:T.extras};}
function roomMeeting(C){const T=indoor(THEMES[C.company.setting]),col=C.company.col;
  const items=[{t:'lights',x:250,gap:300,n:4},{t:'screen',x:420,y:50,w:320,h:170,slides:[['PULISCI PUPÙ','Fai dove vuoi. Pulisci dove vuoi.'],['IL PROBLEMA',C.company.pain.slice(0,40)],['LA SOLUZIONE','4 secondi · odore: '+(C.company.variant==='luxe'?'fico e vetiver':'pino')],['IL MARGINE','3 € costo · '+eur(C.units)+' pezzi'],['LA GAMMA',VARIANTS[C.company.variant].split(' (')[0]]]},{t:'table',x:230,y:330,w:760,col:T.dark?'#333':'#8a6a4a'},{t:'logo',x:120,y:110,col,shape:C.company.logo,r:30},{t:'plant',x:60,y:330}].concat(T.meeting);
  return {wall:T.wall,wallStyle:T.wallStyle,floor:T.floor,floorStyle:T.floorStyle,gloss:T.gloss,floorY:330,weather:C.weather,night:false,windows:T.noWindows?[]:[{x:60,y:60,w:260,h:200,view:T.view||'city'},{x:820,y:60,w:260,h:200,view:T.view||'city'}].filter(w=>!(w.x===60&&T.meeting.some(i=>i.x<340&&i.y<300))),items,extrasRate:0,extraRoles:T.extras};}
function roomVenue(C){const v=C.venue,col=C.company.col;const base={floorY:330,weather:C.weather,night:false,extrasRate:6,extraRoles:VENUES[v].extraRoles};
  switch(v){
    case 'fiera':return Object.assign(base,{wall:'#dfe7f1',wallStyle:'panel',floor:'#8f9bb0',floorStyle:'tiles',gloss:true,windows:[],items:[{t:'lights',x:150,gap:260,n:5},{t:'sign',x:640,y:80,text:'HYGIENIKA 2026 · RIMINI',col:'#fff',sub:'IL SALONE DELLA PULIZIA PROFESSIONALE',subcol:'#e05a4f'},{t:'booth',x:40,y:180,w:170,h:150,col:'#e05a4f',text:'PULITO!',balloon:'#f2b63a'},{t:'booth',x:240,y:180,w:170,h:150,col:'#3a8f7a',text:'SCOPE 3000',balloon:'#e05a4f'},{t:'booth',x:450,y:180,w:170,h:150,col:'#f2b63a',text:'IGIENIKA'},{t:'booth',x:660,y:180,w:170,h:150,col:'#5a7ce0',text:'BIDET PRO',balloon:'#3fbf7f'},{t:'booth',x:870,y:180,w:170,h:150,col:'#b35aa0',text:'AROMA',balloon:'#5aa9ff'},{t:'booth',x:1080,y:180,w:170,h:150,col:'#2e7d4f',text:'MOCIO KING'},{t:'bar',x:1000,y:420,w:200}]});
    case 'lounge':return Object.assign(base,{wall:'#e8ecf2',wallStyle:'glass',floor:'#c8ccd4',floorStyle:'tiles',gloss:true,windows:[{x:60,y:60,w:420,h:210,view:'runway'},{x:760,y:60,w:420,h:210,view:'runway'}],items:[{t:'lounge',x:500,y:50,w:240},{t:'seats',x:120,y:300,rows:1,cols:6,col:'#2a3a8a'},{t:'sofa',x:800,y:300,w:220,col:'#2a3a8a'},{t:'bar',x:1050,y:400,w:200},{t:'plant',x:560,y:330}]});
    case 'golf':return Object.assign(base,{wall:'#5fa8ff',wallStyle:'sky',floor:'#5a9a3a',floorStyle:'grass',gloss:false,windows:[],extrasRate:2,items:[{t:'flag',x:300,y:330,cols:['#e03030','#e03030','#e03030']},{t:'flag',x:900,y:330,cols:['#fff','#fff','#fff']},{t:'plant',x:120,y:330,pot:'#5a3a1a'},{t:'plant',x:1150,y:330,pot:'#5a3a1a'},{t:'bar',x:520,y:290,w:240},{t:'cart',x:1050,y:440}]});
    case 'matrimonio':return Object.assign(base,{wall:'#5fa8ff',wallStyle:'sky',floor:'#7aa05a',floorStyle:'grass',gloss:false,windows:[],items:[{t:'tent',x:100,y:200,w:1080},{t:'cake',x:640,y:330},{t:'table',x:200,y:340,w:300,col:'#fff'},{t:'table',x:820,y:340,w:300,col:'#fff'},{t:'bar',x:40,y:280,w:140}]});
    case 'convegno':return Object.assign(base,{wall:'#2a2a3a',wallStyle:'panel',floor:'#444',floorStyle:'carpet',gloss:false,windows:[],extrasRate:2,items:[{t:'stage',x:300,y:300,w:700},{t:'screen',x:430,y:60,w:440,h:200,slides:[['RETAIL FUTURO','la disruption che cambia tutto'],['OMNICANALITÀ','(nessuno sa cosa vuol dire)'],['AI + RETAIL','sinergie esponenziali'],['Q&A','domande dal pubblico: 0']]},{t:'seats',x:80,y:420,rows:2,cols:6,col:'#8a1a1a'},{t:'seats',x:820,y:420,rows:2,cols:6,col:'#8a1a1a'}]});
    case 'bar':return Object.assign(base,{wall:'#f3ead8',wallStyle:'tile',floor:'#9a7a5a',floorStyle:'tiles',gloss:true,windows:[{x:60,y:70,w:300,h:180,view:'city'}],items:[{t:'bar',x:460,y:270,w:420},{t:'coffee',x:520,y:270},{t:'seats',x:940,y:320,rows:1,cols:4,col:'#5a3a1a'},{t:'vending',x:1200,y:330},{t:'painting',x:1000,y:90,w:160,h:110,a:'#e03030',b:'#222'}]});
    case 'treno':return Object.assign(base,{wall:'#e4e4ea',wallStyle:'panel',floor:'#8a2a2a',floorStyle:'carpet',gloss:false,extrasRate:1.5,windows:[{x:40,y:60,w:320,h:150,view:'mountains'},{x:480,y:60,w:320,h:150,view:'mountains'},{x:920,y:60,w:320,h:150,view:'mountains'}],items:[{t:'seats',x:60,y:320,rows:1,cols:5,col:'#8a1a1a'},{t:'seats',x:760,y:320,rows:1,cols:5,col:'#8a1a1a'},{t:'lounge',x:380,y:230,w:520}]});
  }
}

/* ---------------------------------------------------------------- GAME BUILD */
function buildGame(usedCompanies){
  const pool=COMPANIES.filter(c=>!usedCompanies.includes(c.id));
  const company=pick(pool.length?pool:COMPANIES);
  const dm=person();dm.role=company.role[dm.g];dm.title=dm.g==='f'?'Dott.ssa':'Dott.';
  if(company.id==='caserma'){dm.title=dm.g==='f'?'Colonnella':'Colonnello';}
  dm.name=dm.first+' '+dm.last;dm.full=dm.title+' '+dm.name;dm.ref=(dm.g==='f'?'la ':'il ')+dm.title+' '+dm.last;dm.Ref=dm.ref[0].toUpperCase()+dm.ref.slice(1);
  dm.traits=take(TRAIT_IDS.filter(t=>!(company.id==='caserma'&&t==='gioviale')),3);
  dm.look=window.ENGINE.randomLook('exec',dm.g);if(company.setting==='caserma')dm.look.uniform='camo',dm.look.hat='beret';if(company.setting==='ospedale')dm.look.uniform='labcoat';if(company.setting==='palestra')dm.look.uniform='vest';
  const gateTypes=take(GATES_BY_SETTING[company.setting],Math.random()<.45?2:1);
  const gates=gateTypes.map(t=>{const G=GATES[t];const p=person(G.g);return {type:t,label:G.label,role:G.role,g:p.g,first:p.first,last:p.last,name:G.label==='Suora portinaia'?'Suor '+p.first:p.first,cost:Math.round(rnd(G.cost[0],G.cost[1])/10)*10,corr:G.corr+rnd(-.1,.1),persuade:G.persuade+rnd(-.05,.08),id:'gate'+t};});
  const tech=person();tech.name='Ing. '+tech.last;
  const rival=person('m');rival.name=rival.first+' '+rival.last;
  const boss={name:'Commendator Pupetti',floor:Math.round(rnd(3.4,4.6)*2)/2};
  const petKind=Math.random()<.8?pick(company.pets):null;
  const pet=petKind?{kind:petKind,name:pick(PETNAMES[petKind])}:null;
  const target=Math.round(rnd(company.target[0],company.target[1])*2)/2;
  const units=Math.round(rnd(company.units[0],company.units[1])/1000)*1000;
  const C={company,dm,gates,tech,rival,boss,pet,target,units,venue:pick(Object.keys(VENUES)),weather:env().weather,intel:[],secret:pick(SECRETS),twist:null,objections:[],levers:[],flags:{}};
  C.objections=take(OBJ_IDS,3);C.twist=pick(TWIST_IDS.filter(t=>!TWISTS[t].needs||TWISTS[t].needs(C)));
  C.levers=take(LEVER_IDS.filter(l=>l!=='bribe'),4);if(dm.traits.includes('corruttibile'))C.levers.push('bribe');
  C.openers=take(OPENERS,4);C.demos=buildDemos(C);
  return C;
}
const SECRETS=[
  {id:'cane',text:dm=>`${dm.Ref} ha un cane che si chiama Pupo e ne parla più che dei figli.`,opener:dm=>`"Prima di iniziare: come sta Pupo?"`,fx:{fiducia:18,interesse:8}},
  {id:'promozione',text:dm=>`${dm.Ref} è stat${dm.g==='f'?'a':'o'} promoss${dm.g==='f'?'a':'o'} ieri e nessuno le ha ancora fatto i complimenti.`,opener:dm=>`"Congratulazioni per la promozione. Era ora."`,fx:{fiducia:14,interesse:10}},
  {id:'cacca-away',text:dm=>`${dm.Ref} ha litigato furiosamente con Cacca-Away l'anno scorso per una fornitura difettosa.`,opener:dm=>`"So com'è andata con Cacca-Away. Noi non vi lasceremo mai con le scatole vuote."`,fx:{fiducia:12,interesse:14}},
  {id:'juve',text:dm=>`${dm.Ref} è tifos${dm.g==='f'?'a':'o'} della Juventus e ieri sera ha perso in casa.`,opener:dm=>`"Serata difficile ieri. Parliamo di cose che funzionano, allora."`,fx:{fiducia:12,interesse:6}},
  {id:'budget',text:dm=>`${dm.Ref} deve spendere il budget residuo entro fine mese o lo perde.`,opener:dm=>`"Fine mese, budget da chiudere. Io ho una soluzione pronta a magazzino."`,fx:{fiducia:6,interesse:18}},
  {id:'nipote',text:dm=>`${dm.Ref} ha un nipotino di due anni che la domenica distrugge il divano bianco.`,opener:dm=>`"Mi hanno detto del divano bianco. Ho una soluzione."`,fx:{fiducia:16,interesse:10}},
];
const OPENERS=[
  {label:(C)=>`"Ogni giorno in Italia produciamo 9 milioni di chili di... materiale. E nessuno ha un piano."`,tags:['dati'],fx:{interesse:12,fiducia:4},react:(C)=>`"Un piano." Posa la penna. "Continui."`},
  {label:(C)=>`"Immagini: ${C.company.pain}. Poi immagini quattro secondi di spray, e basta."`,tags:['storia'],fx:{interesse:10,fiducia:8},react:(C)=>`Chiude gli occhi un secondo. "Ho vissuto esattamente quella scena."`},
  {label:(C)=>`"Che ufficio. Si vede che chi comanda qui ha gusto."`,tags:['adulazione'],fx:{fiducia:-8},react:(C)=>`"Ha nove minuti."`},
  {label:(C)=>`"Non le dico niente. Guardi." (tiri fuori il flacone)`,tags:['breve'],fx:{interesse:6},react:(C)=>`Alza un sopracciglio. "Vada."`},
  {label:(C)=>`"${C.company.name}: ${C.company.tag}. Moltiplichi per un problema al giorno ciascuno."`,tags:['dati','breve'],fx:{interesse:9,fiducia:5},react:(C)=>`"Lei ha fatto i compiti." Non è un complimento, ma quasi.`},
  {label:(C)=>`"Le racconto una barzelletta sulla pupù. Poi le vendo la soluzione."`,tags:['umorismo'],fx:{interesse:5,fiducia:2},react:(C)=>`Non ride. Poi ride. Poi smette di colpo. "Vada avanti."`},
  {label:(C)=>`"Ho un'app con QR code: ogni flacone traccia dove e quando è stato usato. Dashboard in tempo reale."`,tags:['tech'],fx:{interesse:7},react:(C)=>`"Una dashboard. Per la pupù." Pausa. "Interessante, in effetti."`},
  {label:(C)=>`"Certificazione in corso, scheda tecnica allegata, protocollo di test in tre fasi. Tutto qui dentro."`,tags:['certificazioni','formale'],fx:{fiducia:8,interesse:3},react:(C)=>`Sfoglia la cartellina. "Finalmente qualcuno che porta la carta."`},
  {label:(C)=>`"Glielo dico onestamente: è un prodotto strano. Ma funziona, e lei lo sa già."`,tags:['onesto','breve'],fx:{fiducia:10,interesse:4},react:(C)=>`"Strano è poco." Però si siede più comoda.`},
  {label:(C)=>`"Ho letto che ${C.company.name} ha avuto un anno difficile. Posso rendere almeno i bagni più facili."`,tags:['storia','dati'],fx:{interesse:6,fiducia:3},react:(C)=>`"Chi le ha detto che è stato difficile?" Lo è stato.`},
];
function buildDemos(C){
  const d=[];const p=C.pet;const dmRef=C.dm.ref;
  if(p){const n=p.name;const sub={dog:`${n} il carlino`,cat:`${n} la gatta dell'ufficio`,parrot:`${n} il pappagallo`,goat:`${n} la capra mascotte`,pigeon:`${n}, il piccione che vive sul davanzale`}[p.kind];
    d.push({label:`"${n} sarà il nostro testimonial." (indichi ${sub})`,tags:['animali'],chance:p.kind==='parrot'||p.kind==='pigeon'?.6:.75,ok:{text:`${sub[0].toUpperCase()+sub.slice(1)}, da professionista, lascia un ricordino sul pavimento. Uno spruzzo: sparito. Odore: ${C.company.variant==='luxe'?'fico e vetiver':'pino'}. ${C.dm.Ref} si alza in piedi.`,fx:{interesse:25,fiducia:10},anim:'petPoop',delay:3200,mood:'happy'},ko:{text:`${n} ti guarda, sbadiglia e si gira dall'altra parte. Niente. Spruzzi nell'aria per riempire il silenzio.`,fx:{interesse:-5},anim:'petNope',speaker:'pet'}});}
  d.push({label:`"Le mostro il video sul telefono."`,tags:['tech'],fx:{interesse:5},react:`"Un video. Ne ho visti mille, con mille effetti speciali."`});
  d.push({label:`Demo su una pupù di plastilina portata da casa`,tags:[],fx:{fiducia:-8,interesse:3},anim:'sprayFail',react:`"È plastilina." "È una simulazione." "È plastilina."`});
  d.push({label:`"Faccio una dimostrazione in prima persona. Qui. Adesso."`,tags:['sporco','umorismo'],chance:.5,ok:{text:`Qualcuno entra col caffè e urla. ${C.dm.Ref} non batte ciglio. Spruzzi: sparito. "Ok. Questo non l'avevo mai visto. E non lo rivedrò."`,fx:{interesse:20,fiducia:-15,rep:-15},anim:'selfDemo',delay:2600},ko:{text:`L'assistente entra col caffè, lo rovescia, scivola. Chiamano la vigilanza al terzo piano. Il flacone, almeno, funziona.`,fx:{rep:-40,fiducia:-20,interesse:5},anim:'selfDemo',delay:2600,mood:'angry'}});
  d.push({label:`"Lo provi lei sul mio braccio: una goccia di salsa barbecue, uno spruzzo." (porgi il flacone)`,tags:['onesto'],chance:.7,ok:{text:`Spruzza. La macchia svanisce, il braccio profuma di pino. ${C.dm.Ref} guarda il flacone come un gioiello.`,fx:{interesse:14,fiducia:8},anim:'sprayOk'},ko:{text:`Spruzza troppo forte: ti prende in un occhio. "Brucia?" "No." Brucia.`,fx:{fiducia:3,interesse:2},anim:'sprayFail'}});
  return take(d,4).concat(p?[]:[]);
}

/* ---------------------------------------------------------------- OBJECTIONS */
const OBJECTIONS={
  prezzo:{speaker:'dm',text:C=>`"Cacca-Away ci ha offerto un prodotto simile a <em>${price(C.target-1)}</em> al flacone. Perché dovrei pagare di più?"`,choices:C=>[
    {label:`"Cacca-Away copre l'odore. Noi eliminiamo la causa. Test comparativo, qui, adesso."`,tags:['dati'],fx:{interesse:15},react:`"La causa." Guarda il responsabile qualità, che annuisce di mezzo millimetro.`},
    {label:`"Vi faccio ${price(C.target-1.1)}."`,tags:[],fx:{interesse:5},set:{ancoraBassa:true},react:`"${price(C.target-1.1)}. Segnato." Hai appena regalato il tuo margine prima ancora di trattare.`},
    {label:`"Cacca-Away è stata ritirata dal mercato in Germania."`,tags:['bluff'],chance:.5,ok:{text:`"Davvero?" Scrive. Non controlla.`,fx:{interesse:10}},ko:{text:`${C.tech.name}: "Ho lavorato lì tre anni. Non è vero." Silenzio nella sala.`,fx:{fiducia:-30},speaker:'tech',mood:'angry'}},
    {label:`"Esclusiva nazionale per ${C.company.name} per dodici mesi."`,tags:['dati'],fx:{interesse:12},set:{esclusiva:true},react:`Scrive "esclusiva" e lo sottolinea due volte. "Interessante."`},
  ]},
  cert:{speaker:'tech',text:C=>`"${C.tech.name}, qualità e sicurezza. Composizione? Certificazioni? Scheda di sicurezza?"`,choices:C=>[
    {label:`"Enzimi proteolitici, tensioattivi vegetali, profumo di pino. Test dermatologici fatti, certificazione in corso."`,tags:['onesto','certificazioni'],fx:{fiducia:12},react:`"In corso." Annota. "Almeno è onesto. È raro."`,speaker:'tech'},
    {label:`"Certificato CE, ISO 9001, FDA e testato dalla NASA."`,tags:['bluff'],chance:.4,ok:{text:`"Dalla NASA." Non chiede altro. Per ora.`,fx:{interesse:10},speaker:'tech'},ko:{text:`Apre il laptop. "La NASA non certifica spray. L'FDA non certifica in Italia. La ISO 9001 non riguarda il prodotto." Tre su tre.`,fx:{fiducia:-25,rep:-10},speaker:'tech',mood:'angry'}},
    {label:`"Ingegnere, preferisco parlare di risultati."`,tags:['breve'],fx:{fiducia:-8},react:`"E io preferisco parlare di chimica. Siamo in due a restare delusi."`,speaker:'tech'},
    {label:`"Le lascio la scheda tecnica, il protocollo di test e il numero del nostro chimico. Mi chiami lui, non me."`,tags:['certificazioni','onesto'],fx:{fiducia:9,interesse:3},react:`Prende il foglio. Per la prima volta sembra quasi contento.`,speaker:'tech'},
  ]},
  refs:{speaker:'dm',text:C=>`"Chi lo sta già usando?"`,choices:C=>[
    {label:`"Nessuno. Lei sarebbe la prima. E la prima si prende il mercato."`,tags:['onesto'],fx:{fiducia:10,interesse:6},react:`"La prima." Le piace la parola, si vede.`},
    {label:`"Esselunga e Conad stanno facendo i test."`,tags:['bluff'],chance:.45,ok:{text:`"Conad." Stringe gli occhi. "Allora dobbiamo muoverci."`,fx:{interesse:15}},ko:{text:`"La buyer di Conad è mia cugina." Prende il telefono. Lo posa. "Non serve, vero?"`,fx:{fiducia:-35,rep:-10},mood:'angry'}},
    {label:`"L'esercito svizzero."`,tags:['umorismo'],chance:.5,ok:{text:`${C.tech.name} ride. Per la prima volta nella sua vita, a giudicare dalle facce.`,fx:{interesse:10,fiducia:5},emote:'laugh'},ko:{text:`Silenzio. Qualcuno tossisce.`,fx:{fiducia:-10}}},
    {label:`"Tre B&B in Romagna e un canile. Piccoli, ma con recensioni vere." (le mostri)`,tags:['onesto','dati'],fx:{fiducia:8,interesse:5},react:`Legge le recensioni. "'Ha salvato il nostro matrimonio.' Ok, questa la voglio sentire."`},
  ]},
  disgusto:{speaker:'dm',text:C=>`"Il problema è uno solo: è disgustoso."`,choices:C=>[
    {label:`"Disgustosa è la realtà senza Pulisci Pupù."`,tags:['breve'],fx:{interesse:10},react:`"Slogan da cartellone. Però funziona."`},
    {label:`"I suoi clienti hanno cani, bambini e nonni. Nessuno si scandalizza dei pannolini."`,tags:['dati'],fx:{fiducia:10,interesse:12},react:`"Pannolini." Annuisce lentamente.`},
    {label:`"Sì."`,tags:['onesto','breve'],chance:.5,ok:{text:`Lunga pausa. "Mi piace chi non si arrampica sugli specchi."`,fx:{fiducia:15}},ko:{text:`"Sì?" Guarda l'orologio.`,fx:{fiducia:-10}}},
    {label:`"Lo chiamiamo 'sanificante enzimatico multisuperficie'. Suona meglio?"`,tags:['sanifica','umorismo'],fx:{interesse:8,fiducia:4},react:`"Suona come qualcosa che compro." Ride, poco.`},
  ]},
  legale:{speaker:'dm',text:C=>`"E se un bambino lo beve? Cosa dice il nostro ufficio legale?"`,choices:C=>[
    {label:`"Tappo a prova di bambino, formula atossica, scheda di sicurezza allegata. Lo beve, vomita, finisce lì."`,tags:['certificazioni','onesto'],fx:{fiducia:12,interesse:4},react:`"'Finisce lì.' Lo scrivo nella mail al legale, così come l'ha detto."`},
    {label:`"Nessun bambino ha mai voluto bere qualcosa che si chiama Pulisci Pupù."`,tags:['umorismo'],fx:{interesse:6,fiducia:3},react:`"Argomento inattaccabile, in effetti."`},
    {label:`"Il legale lo pago io, se serve."`,tags:['bluff'],chance:.4,ok:{text:`"Mi piace la gente che si prende responsabilità."`,fx:{fiducia:8}},ko:{text:`"Con quale budget?" Pausa lunga. "Ecco."`,fx:{fiducia:-12}}},
  ]},
  plastica:{speaker:'dm',text:C=>`"${eur(C.units)} flaconi di plastica. Il nostro report di sostenibilità mi uccide."`,choices:C=>[
    {label:`"Flacone in PET riciclato al 100% e ricarica in busta da un litro. Meno plastica di una bottiglia d'acqua."`,tags:['dati','certificazioni'],fx:{interesse:12,fiducia:6},react:`"Ricarica in busta." Scrive. "Questo lo voglio nel contratto."`},
    {label:`"Pensi alla plastica dei sacchetti per la cacca che non userete più."`,tags:['umorismo','dati'],fx:{interesse:8},react:`Fa i conti a mente. "Touché."`},
    {label:`"La sostenibilità è un tema importante." (non aggiungi altro)`,tags:['formale'],fx:{fiducia:-6},react:`"Lo è." Aspetta. Non arriva niente.`},
  ]},
  nome:{speaker:'dm',text:C=>`"Il nome. 'Pulisci Pupù'. Non posso metterlo in un ordine d'acquisto da ${eur(C.units)} pezzi."`,choices:C=>[
    {label:`"Se lo ricorda già, vero? Appunto."`,tags:['breve','umorismo'],fx:{interesse:8},react:`Ride, contro la sua volontà. "Touché."`},
    {label:`"È provvisorio. Il marketing sta valutando ExcrementoZero."`,tags:['umorismo'],fx:{fiducia:-5,interesse:-5},react:`"Tenga Pulisci Pupù. Mi creda."`},
    {label:`"Sull'ordine scriviamo 'Sanificante enzimatico PP'. Sullo scaffale, il nome che vende."`,tags:['dati','onesto'],fx:{fiducia:9,interesse:7},react:`"PP." Lo scrive. "Va bene, PP."`},
  ]},
  tempi:{speaker:'dm',text:C=>`"Mi serve in trenta giorni, in tutte le ${C.company.tag.split(',')[0]}. Ce la fate?"`,choices:C=>[
    {label:`"Sì." (è un bluff: la linea produce la metà)`,tags:['bluff'],chance:.45,ok:{text:`"Bene." Non chiede il piano di consegna. Pregherai per un mese.`,fx:{interesse:10}},ko:{text:`"Mi mostri il piano di produzione." Non ce l'hai. Lo vede.`,fx:{fiducia:-20}}},
    {label:`"Metà in trenta giorni, il resto in sessanta. Preferisco dirglielo ora che tra un mese."`,tags:['onesto'],fx:{fiducia:14,interesse:3},react:`"Finalmente uno che dice i tempi veri."`},
    {label:`"Se mi dà l'ordine oggi, partiamo stanotte."`,tags:['breve'],fx:{interesse:6,fiducia:2},react:`"Stanotte." Sorride. "Vediamo."`},
  ]},
  produzione:{speaker:'tech',text:C=>`"Dove lo producete? Chi lo fa? Da quanto esiste l'azienda?"`,choices:C=>[
    {label:`"Stabilimento a Lodi, 14 dipendenti, tre anni di vita. Piccoli ma veloci."`,tags:['onesto','dati'],fx:{fiducia:11},react:`"Lodi." Annuisce. "Almeno non è un garage."`,speaker:'tech'},
    {label:`"Produzione in Svizzera, con un partner che preferisce restare anonimo."`,tags:['bluff'],chance:.4,ok:{text:`"Svizzero." Sembra impressionato.`,fx:{interesse:6},speaker:'tech'},ko:{text:`"Anonimo." Scrive 'anonimo' con tre punti interrogativi.`,fx:{fiducia:-18},speaker:'tech',mood:'angry'}},
    {label:`"Lo faccio io in cantina, Ingegnere. Ma lo faccio bene."`,tags:['umorismo','onesto'],chance:.5,ok:{text:`Ride. "Almeno è sincero. Venga a trovarci con una fattura vera, però."`,fx:{fiducia:8,interesse:4},speaker:'tech'},ko:{text:`Non ride. "In cantina."`,fx:{fiducia:-14},speaker:'tech'}},
  ]},
  animali:{speaker:'dm',text:C=>`"È testato sugli animali?"`,choices:C=>[
    {label:`"Testato CON gli animali. Sono i nostri migliori clienti."`,tags:['umorismo','animali'],fx:{interesse:8,fiducia:4},react:`"Con." Sorride. "Ok."`},
    {label:`"No. Solo su volontari umani. Due stagisti, per la precisione."`,tags:['onesto','umorismo'],fx:{fiducia:8},react:`"Gli stagisti stanno bene?" "Uno è ancora con noi."`},
    {label:`"Sì, abbiamo un laboratorio con 200 cavie."`,tags:['crudele','bluff'],chance:.5,ok:{text:`"Capisco." Non capisce. Passa oltre.`,fx:{interesse:2}},ko:{text:`Si irrigidisce. "Duecento cavie. Per la pupù."`,fx:{fiducia:-18},mood:'angry'}},
  ]},
  app:{speaker:'dm',text:C=>`"Mi hanno detto che avete un'app. A cosa serve un'app per uno spray?"`,choices:C=>[
    {label:`"Traccia i consumi per sede, avvisa quando riordinare, genera il report di igiene per le ispezioni."`,tags:['tech','dati'],fx:{interesse:12,fiducia:4},react:`"Report per le ispezioni." Lo scrive in grande.`},
    {label:`"A niente. L'ha voluta il marketing."`,tags:['onesto','umorismo'],fx:{fiducia:9},react:`Ride forte. "Almeno lo ammette."`},
    {label:`"Ha l'intelligenza artificiale."`,tags:['bluff','tech'],chance:.5,ok:{text:`"Ah." Sembra bastare.`,fx:{interesse:6}},ko:{text:`"Che fa, esattamente, l'intelligenza artificiale?" Non lo sai.`,fx:{fiducia:-10}}},
  ]},
};
const OBJ_IDS=Object.keys(OBJECTIONS);

/* ---------------------------------------------------------------- TWISTS */
const TWISTS={
  rival:{text:C=>`La porta si apre. <em>${C.rival.name}</em>, agente di Cacca-Away, con una valigetta verde e un sorriso da dentifricio. "Scusate il ritardo. Ho un'offerta che non potete rifiutare."`,anim:'rivalEnter',speaker:'narr',choices:C=>[
    {label:`"Prego, si accomodi. Facciamo il test comparativo insieme." (spruzzi i due prodotti)`,tags:['dati'],chance:.65,ok:{text:`Il suo copre, il tuo cancella. ${C.rival.name} smette di sorridere.`,fx:{interesse:18,fiducia:8},anim:'sprayOk'},ko:{text:`Il tuo flacone si inceppa. Il suo no. ${C.rival.name} ti offre il suo. Gentile.`,fx:{interesse:-12},anim:'sprayFail'}},
    {label:`"${C.rival.name}! Come sta sua moglie? Ah, scusi, è vero."`,tags:['umorismo','crudele'],chance:.5,ok:{text:`${C.dm.Ref} ride senza volerlo. ${C.rival.name} arrossisce.`,fx:{interesse:6,fiducia:3}},ko:{text:`Nessuno ride. ${C.rival.name}: "Sono vedovo." Silenzio.`,fx:{fiducia:-15,rep:-10},mood:'angry'}},
    {label:`Lo ignori e continui con la tua presentazione`,tags:['formale','breve'],fx:{fiducia:4,interesse:2},react:`${C.rival.name} aspetta in piedi. Dopo tre minuti si siede. Dopo cinque, se ne va.`},
  ]},
  boss:{text:C=>`Il tuo telefono vibra: è il ${C.boss.name}, il tuo capo. "Senti, ho fatto i conti. Sotto i ${price(C.boss.floor+.5)} non firmare niente. Niente, capito?"`,anim:'phone',speaker:'narr',choices:C=>[
    {label:`"Capito, Commendatore." (chiudi e sorridi a tutti)`,tags:[],fx:{},set:{floorUp:true},react:`Il prezzo minimo è salito. ${C.dm.Ref} ti guarda: "Problemi?" "Nessuno."`},
    {label:`"Commendatore, qui c'è un ordine da ${eur(C.units)} pezzi. Mi lasci lavorare." (chiudi)`,tags:['onesto'],chance:.55,ok:{text:`Richiama. Non rispondi. ${C.dm.Ref} apprezza: "Uno che decide."`,fx:{fiducia:8}},ko:{text:`Richiama sei volte. La sesta rispondi. "Sei licenziato se scendi sotto." Sudi.`,fx:{fiducia:-6},set:{floorUp:true}}},
    {label:`Metti il vivavoce per sbaglio`,tags:['umorismo'],chance:.5,ok:{text:`Tutta la sala sente "non firmare niente". ${C.dm.Ref} ride: "Allora il suo capo non vuole vendere. Peggio per lui."`,fx:{interesse:8,fiducia:-4}},ko:{text:`Tutta la sala sente "quelli di ${C.company.name} sono dei polli". Silenzio.`,fx:{fiducia:-25,rep:-10},mood:'angry'}},
  ]},
  journalist:{text:C=>`Entra una giornalista con un fotografo del Resto del Carlino. "Stiamo facendo un servizio sulle eccellenze locali. Possiamo fare una foto?"`,anim:'journalist',speaker:'narr',choices:C=>[
    {label:`"Certo! ${C.company.name} e Pulisci Pupù, insieme per un futuro pulito." (posi col flacone)`,tags:['adulazione'],chance:.6,ok:{text:`Flash. ${C.dm.Ref} sorride nella foto. Domani sarà sul giornale con il flacone in mano. Ormai è dentro.`,fx:{interesse:15,fiducia:5},anim:'flash'},ko:{text:`Flash. ${C.dm.Ref} è venuta con gli occhi chiusi e il flacone in primo piano. "Questa foto non esce." Esce.`,fx:{fiducia:-12,rep:5},anim:'flash',mood:'angry'}},
    {label:`"Senza foto, grazie. Siamo in riunione."`,tags:['formale','breve'],fx:{fiducia:6},react:`${C.dm.Ref} ti è grata. La giornalista no.`},
    {label:`Fai la foto, ma solo tu col flacone`,tags:['umorismo'],fx:{rep:10,interesse:-3},react:`Domani sul giornale: "L'uomo della pupù". Tua madre ritaglia l'articolo.`,anim:'flash'},
  ]},
  inspector:{text:C=>`Bussano. Ispettrice ASL, controllo a sorpresa. "Cos'è quel flacone senza etichetta sul tavolo?"`,anim:'inspector',speaker:'narr',choices:C=>[
    {label:`"Un campione di laboratorio, scheda tecnica qui, lotto numero 0001." (la consegni)`,tags:['certificazioni','onesto'],fx:{fiducia:12,interesse:4},react:`Legge. Annuisce. "In regola. Strano, ma in regola." ${C.dm.Ref} tira un sospiro.`},
    {label:`Lo nascondi sotto il tavolo`,tags:['bluff'],chance:.4,ok:{text:`Non lo vede. ${C.dm.Ref} sì. Vi guardate come due complici.`,fx:{fiducia:5,interesse:3}},ko:{text:`Lo vede. "Perché lo nasconde?" Verbale. ${C.dm.Ref} è rossa di rabbia.`,fx:{fiducia:-22,rep:-15},mood:'angry'}},
    {label:`"Lo provi lei. Prego." (indichi il tappeto)`,tags:['umorismo'],chance:.5,ok:{text:`L'ispettrice spruzza su una macchia di caffè. Sparita. "Me ne lasci uno."`,fx:{interesse:12,rep:5},anim:'sprayOk'},ko:{text:`"Non è una demo, è un'ispezione." Verbale per 'atteggiamento non collaborativo'.`,fx:{fiducia:-10,rep:-8}}},
  ]},
  blackout:{text:C=>`Blackout. Buio totale, solo le luci d'emergenza. Qualcuno urla "la fotocopiatrice!". Siete tutti fermi al buio.`,anim:'blackout',speaker:'narr',choices:C=>[
    {label:`"Il flacone ha il tappo fosforescente. Ecco, lo vedete? Pensato per i bagni di notte."`,tags:['tech','dati'],fx:{interesse:12,fiducia:4},react:`Nel buio, una lucina verde. "Geniale", dice una voce. È ${C.dm.ref}.`,anim:'blackoutOff'},
    {label:`Racconti una storia di paura sulla pupù`,tags:['umorismo','storia'],chance:.5,ok:{text:`Quando torna la luce stanno ridendo tutti. Anche ${C.tech.name}.`,fx:{fiducia:10,interesse:4},anim:'blackoutOff',emote:'laugh'},ko:{text:`Quando torna la luce, ${C.dm.Ref} ti guarda con pietà.`,fx:{fiducia:-8},anim:'blackoutOff'}},
    {label:`Aspetti in silenzio che torni la luce`,tags:['breve'],fx:{fiducia:2},react:`Quattro minuti di silenzio. Torna la luce. "Dove eravamo?"`,anim:'blackoutOff'},
  ]},
  kid:{text:C=>`Un bambino entra di corsa con un palloncino. "${C.dm.g==='f'?'Mamma':'Papà'}, ho fame!" È il figlio di ${C.dm.ref}. Guarda il flacone. "Cos'è?"`,anim:'kid',speaker:'narr',choices:C=>[
    {label:`"È uno spray magico che fa sparire la pupù." (lo lasci spruzzare in aria)`,tags:['storia','animali'],fx:{fiducia:14,interesse:8},react:`Il bambino ride per tre minuti. ${C.dm.Ref} si scioglie. "Ok, questo ha vinto lui."`,anim:'sprayOk'},
    {label:`"Non è per i bambini." (lo allontani)`,tags:['formale'],fx:{fiducia:-10},react:`Il bambino piange. ${C.dm.Ref} ti guarda come un criminale.`,mood:'angry'},
    {label:`Gli regali il palloncino con il logo Pulisci Pupù`,tags:['umorismo'],fx:{fiducia:6,interesse:4,rep:3},react:`Esce felice. Il logo girerà per tutta la sede per una settimana.`},
  ]},
  alarm:{text:C=>`ALLARME ANTINCENDIO. Sirena, luci rosse, tutti in piedi. Prova di evacuazione: dieci minuti nel piazzale, in fila, con ${C.dm.ref} accanto.`,anim:'alarm',speaker:'narr',choices:C=>[
    {label:`"Dieci minuti in piazzale. Le racconto come è nato il prodotto." (storia vera)`,tags:['storia','onesto'],fx:{fiducia:12,interesse:6},react:`Nel piazzale, sotto la sirena, ascolta davvero. "Capisco perché ci crede."`,anim:'alarmOff'},
    {label:`Ne approfitti per spruzzare le aiuole del piazzale`,tags:['sporco'],chance:.55,ok:{text:`Le aiuole del piazzale, dopo anni di cani del quartiere, profumano di pino. Il personale applaude.`,fx:{interesse:14,rep:5},anim:'alarmOff'},ko:{text:`Il responsabile della sicurezza ti vede "manomettere il piazzale". Verbale.`,fx:{rep:-12,fiducia:-6},anim:'alarmOff'}},
    {label:`Stai in silenzio, come tutti`,tags:['breve'],fx:{fiducia:3},react:`Fine prova. Si rientra. Nessun danno, nessun guadagno.`,anim:'alarmOff'},
  ]},
  leak:{text:C=>`Un odore di pino invade la sala. Il flacone nella tua valigetta si è aperto. Sta colando sul tappeto. Tutti lo guardano.`,anim:'leak',speaker:'narr',choices:C=>[
    {label:`"E questo, signori, è l'odore della fiducia." (apri la valigetta: il tappeto sotto è immacolato)`,tags:['umorismo','dati'],chance:.6,ok:{text:`Il tappeto sotto la valigetta è più pulito di quello intorno. Un alone bianco perfetto. "Però."`,fx:{interesse:14,fiducia:4}},ko:{text:`Il tappeto è bagnato e basta. "Però" non lo dice nessuno.`,fx:{fiducia:-8,rep:-4}}},
    {label:`Ti scusi e asciughi tutto con la giacca`,tags:['onesto'],fx:{fiducia:6,rep:-3},react:`Giacca rovinata. ${C.dm.Ref}: "Almeno si prende le sue responsabilità."`},
    {label:`Fai finta di niente`,tags:['bluff'],fx:{fiducia:-10},react:`Il tappeto gocciola per tutta la riunione. Nessuno lo dice. Tutti lo pensano.`},
  ]},
  ceo:{text:C=>`La porta si apre senza bussare. L'Amministratore Delegato. "Ho trenta secondi tra due riunioni. Mi dica in una frase perché dovremmo comprare... quello."`,anim:'ceo',speaker:'narr',choices:C=>[
    {label:`"Perché ${C.company.pain}, e questo lo risolve in quattro secondi."`,tags:['breve','dati'],fx:{interesse:16,fiducia:6},react:`L'AD guarda ${C.dm.ref}. "Chiudetela." Esce.`},
    {label:`"Perché i vostri concorrenti lo compreranno la prossima settimana."`,tags:['bluff','breve'],chance:.5,ok:{text:`"Chi?" "Non posso dirlo." L'AD sorride. "Furbo." Esce.`,fx:{interesse:12}},ko:{text:`"Chi?" "Non posso dirlo." "Allora non lo sa." Esce.`,fx:{fiducia:-14}}},
    {label:`Inizi la presentazione dall'inizio`,tags:['lungo'],fx:{fiducia:-12,interesse:-4},react:`Al secondo slide l'AD è già uscito. ${C.dm.Ref} fissa il tavolo.`,mood:'angry'},
  ]},
  pigeon:{text:C=>`Un piccione entra dalla finestra, fa due giri sopra il tavolo e lascia il suo contributo sui documenti di ${C.tech.name}.`,anim:'pigeon',speaker:'narr',choices:C=>[
    {label:`Uno spruzzo sui documenti. (senza dire niente)`,tags:['breve','sporco'],chance:.8,ok:{text:`Il documento è pulito, asciutto e profuma di pino. ${C.tech.name} lo annusa due volte. "...Pino."`,fx:{interesse:18,fiducia:8},anim:'sprayOk'},ko:{text:`Il documento è pulito, ma l'inchiostro è sparito con la pupù. ${C.tech.name} aveva solo quella copia.`,fx:{interesse:6,fiducia:-10},anim:'sprayOk'}},
    {label:`"Testimonial non pagato, signori."`,tags:['umorismo'],fx:{interesse:7,fiducia:3},react:`Ridono. Il documento resta sporco. Spruzzi dopo. Funziona.`,anim:'sprayOk'},
    {label:`Insegui il piccione`,tags:['crudele'],fx:{fiducia:-8,rep:-4},react:`Il piccione vince. Tu sudi. Il documento resta sporco.`},
  ]},
  recall:{text:C=>`${C.dm.Ref} riceve una notifica, legge, impallidisce. "Cacca-Away ha appena ritirato un lotto. Reazioni allergiche in tre regioni." Ti guarda.`,anim:'news',speaker:'narr',choices:C=>[
    {label:`"Mi dispiace per loro. Il nostro è testato: ecco i report dermatologici."`,tags:['onesto','certificazioni'],fx:{fiducia:14,interesse:12},react:`"Testato." Sfoglia. "Allora parliamo seriamente."`},
    {label:`"Ve l'avevo detto."`,tags:['umorismo','breve'],chance:.5,ok:{text:`Ride, nervosa. "Me l'aveva detto."`,fx:{interesse:10}},ko:{text:`"Non me l'aveva detto." Non ride.`,fx:{fiducia:-6,interesse:4}}},
    {label:`"Posso coprire il loro buco in quindici giorni, se chiudiamo oggi."`,tags:['dati'],fx:{interesse:18,fiducia:-2},set:{urgenza:true},react:`"Quindici giorni." Guarda l'orologio. "Allora chiudiamo oggi."`},
  ]},
};
const TWIST_IDS=Object.keys(TWISTS);

/* ---------------------------------------------------------------- LEVERS */
const LEVERS={
  pay90:{t:'Pagamento a 90 giorni',d:'Migliora la sua cassa. Costa a te, non ora.',bonus:.12,cost:0},
  samples:{t:'Campioni gratis in tutte le sedi',d:'Costa 300 € del tuo budget.',bonus:.15,cost:300},
  promo:{t:'Promo in-store a carico nostro',d:'Costa 600 €. Tutti adorano le promo pagate dagli altri.',bonus:.25,cost:600},
  volume:{t:'Volume minimo raddoppiato',d:'Più ricavo per te, ma spaventa.',bonus:-.15,cost:0,units:2},
  training:{t:'Formazione del personale inclusa',d:'Un pomeriggio con il tuo chimico. Gratis.',bonus:.1,cost:0},
  cobrand:{t:'Co-branding sulla confezione',d:'Il loro logo sul flacone. Vanità per tutti.',bonus:.13,cost:150},
  renewal:{t:'Sconto 10% sul riordino',d:'Costa domani, non oggi.',bonus:.1,cost:0},
  returns:{t:'Reso dell\'invenduto a 6 mesi',d:'Rischio tuo, serenità sua.',bonus:.18,cost:0,risk:true},
  bribe:{t:'"Regalo personale" (weekend alle terme)',d:'Costa 400 €. Se è corruttibile, funziona. Se qualcuno lo scopre, no.',bonus:.35,cost:400,bribe:true},
};
const LEVER_IDS=Object.keys(LEVERS);

/* ---------------------------------------------------------------- VERDICT BEATS */
const BEATS=[
  C=>({speaker:'dm',text:`(al telefono) "...sì ${C.tech.name}, ho letto la sua nota. ...Capisco. ...No. Decido io."`,anim:'phone'}),
  C=>({speaker:'narr',text:`${C.dm.Ref} cammina avanti e indietro. Si ferma davanti alla finestra. Fuori, ${C.weather==='pioggia'?'piove sul parcheggio':C.weather==='neve'?'nevica sulle auto':'il tramonto incendia il parcheggio'}.`,anim:'pace'}),
  C=>({speaker:'assistant',text:`"${C.dm.g==='f'?'Dottoressa':'Dottore'}, il comitato acquisti aspetta. E la vigilanza chiede se deve salire."`,anim:'assistantIn'}),
  C=>({speaker:'narr',text:`${C.pet?C.pet.name+' dorme sotto la scrivania. O finge.':'La macchina del caffè gorgoglia da sola.'} Il flacone è sul tavolo, al centro, come un imputato.`}),
  C=>({speaker:'dm',text:`"${eur(C.units)} pezzi. ${C.company.tag}. Se sbaglio, me lo ricordano per dieci anni."`}),
  C=>({speaker:'narr',text:`Il telefono squilla di nuovo. ${C.dm.Ref} non risponde. Guarda te. Poi il flacone. Poi te.`}),
];

/* ---------------------------------------------------------------- EXPORT */
window.CONTENT={TRAITS,COMPANIES,VARIANTS,GATES,DISGUISES,VENUES,THEMES,OBJECTIONS,TWISTS,LEVERS,BEATS,SECRETS,buildGame,roomLobby,roomOffice,roomMeeting,roomVenue,eur,price,take,shuffle,person};
})();
