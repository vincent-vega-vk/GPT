# CLOSER v2 · Specifica (fonte di verità per moduli e contenuti)

Obiettivi della v2, richiesti dal committente:

1. **Immersione in prima persona.** Il giocatore *è* l'Account Executive: vede la scena dai suoi occhi (viewport soggettivo), sente il suo pensiero, parla con la sua voce.
2. **Ogni scenario cambia.** Tema visivo, ambiente sonoro, tipo di scena e **widget firma** diversi per scenario: non lo stesso gioco con testi diversi.
3. **Forecast call con il manager (Marta)** che sfida le tue previsioni usando i dati reali del tuo CRM.
4. **Variabili aleatorie**: imprevisti *dentro* gli scenari e shock *dopo* (il giorno della chiusura). La gravità dipende da quanto ti sei preparato (multi-threading, paper, piano di chiusura…).

Il gioco è in italiano, ambientato in vendite enterprise in Italia. Tutti i nomi sono di fantasia. Il fornitore è "Nexora". Il rivale ricorrente è "Vertex Systems".

---

## 0. Convenzioni di scrittura (valgono per ogni testo)

- **Voce narrante**: seconda persona, **presente** ("Entri nella sala. Il telefono vibra sulla scrivania."). Frasi brevi, dettagli sensoriali concreti (rumori, luce, temperatura, oggetti), **mai** didascalie sul "cosa imparerai".
- **Pensiero del protagonista** (`think`): prima persona, presente, asciutto ("Quattro mesi. E ho parlato solo con lei.").
- **Dialoghi**: italiano d'azienda credibile, non da manuale. Con i clienti formali si dà del *Lei*; Marta (la manager) dà del *tu*. Niente slogan, niente "sinergie". Ogni personaggio ha un registro suo (Gianni Brenta parla in modo diretto e un po' vecchio stile, Valeria Conti è precisa e glaciale, ecc.).
- **Niente emoji.** Virgolette tipografiche “ ” e apostrofo ’. Cifre in italiano (€480k, 14 mesi).
- **Coerenza**: non cambiare fatti, nomi, cifre, ruoli, date degli scenari esistenti. Puoi aggiungere dettagli, mai contraddire.
- **Equità**: la risposta "giusta" non deve mai essere riconoscibile dal tono del testo del pulsante (stessa lunghezza e stesso registro tra le opzioni). Le scorciatoie devono essere *allettanti*, non caricature.
- **Segnaposto** utilizzabili in qualunque stringa mostrata al giocatore: `{nome}` (nome del giocatore, o "collega" se vuoto), `{client}` (nome del cliente), `{contact}` (nome del champion/contatto principale, da `sc.fc.people.C`), `{buyer}` (Economic Buyer, da `sc.fc.people.E`). Usali con parsimonia.

---

## 1. Tipi di riga di scena

Una **riga di scena** è un oggetto con uno di questi formati. Ogni riga può avere `if: (d) => bool` (filtro) e `sfx: 'phone'|'ping'|'alert'|'door'|'stamp'` (stinger audio, solo se l'audio è attivo).

| Forma | Significato |
|---|---|
| `{ n: 'testo' }` | Narrazione (seconda persona, presente). |
| `{ think: 'testo' }` | Pensiero del protagonista (prima persona). Mostrato in corsivo, con marcatore "Pensi". |
| `{ w: 'chiave', a: 'azione/linguaggio del corpo', t: 'parlato' }` | Battuta di un personaggio. `chiave` è una chiave di `sc.cast` (oppure del cast generico: `marta`, `davide`, `collega`, `cliente`). `a` è facoltativo e breve ("guarda l’orologio"). |
| `{ mail: { from, subj }, t: 'testo' }` | Email ricevuta. |
| `{ chat: { from: 'chiave', app: 'Teams' }, t: 'testo' }` | Messaggio in chat/WhatsApp/SMS (mostrato come bolla del telefono). |

## 2. Campi dei nodi (`sc.nodes[id]`)

Esistenti (invariati): `where, scene, prompt, hint, tip, choices, enter, t` (secondi del timer).

Nuovi:

- `when`: stringa breve del momento ("Lunedì · 09:10", "Giorno 3 di 11", "17:42"). Mostrata nel viewport e nel widget `clock`.
- `view`: tipo di vista soggettiva. Uno tra: `'call'` (videochiamata sul laptop), `'meeting'` (in una stanza, tavolo davanti a te), `'walk'` (cammini in uno stabilimento/negozio/magazzino), `'desk'` (la tua scrivania con CRM e telefono), `'phone'` (al telefono/chat), `'mail'` (leggi una email sul laptop), `'car'` (sei in auto). Se assente, il viewport lo deduce da `where`.
- `bg`: facoltativo, sovrascrive lo sfondo di `sc.theme.bg` per quel nodo (es. `'night'` per una scena serale).
- `scene` può essere un array **oppure** una funzione `(d) => array`.

## 3. Campi delle scelte (`ch(id, q, t, r, fx, extra)`)

- `t`: testo del **pulsante**. Intenzione/battuta del giocatore, prima persona, ≤ 220 caratteri. Stesso registro e lunghezza tra le opzioni dello stesso nodo.
- `r`: **lettura della mossa** (coaching): 1–3 frasi che spiegano cosa è successo *e perché*. Non ripetere parola per parola `react`. Può essere una funzione `(d) => string`.
- **Nuovi** (in `extra`):
  - `say`: la battuta effettivamente pronunciata dal giocatore nella trascrizione (prima persona, naturale, parlata). Se assente si usa `t`. Può essere più lunga e più "recitata" di `t`. Se la scelta è un'azione e non una battuta, `say` descrive l'azione in prima persona.
  - `react`: array di **righe di scena** (1–4) che mostrano la reazione immediata del mondo (battute dei personaggi, narrazione, `think`). È il momento di maggiore immersione: qui il cliente risponde, il silenzio pesa, il telefono vibra. Può essere una funzione `(d) => array`.
  - `fx` può essere una funzione `(d) => oggetto` (effetti sensibili allo stato).

Regola: **non cambiare** `q`, `fx`, `mp`, `mpx`, `set`, `integ`, `jolly`, `next` nelle scelte esistenti. Solo `t` (rifinitura), `r` (rifinitura) e i campi nuovi `say`/`react`.

## 4. Campi dello scenario

```js
theme: {
  id: 'lab',                 // = id del tema (classe CSS .th-lab)
  label: 'Laboratori GxP · Latina',
  bg: 'lab',                 // sfondo del viewport: lab|factory|night|public|retail|clinic|port|control|office
  accent: '#0e7c86',         // colore d'accento in tema chiaro
  accentDark: '#4fd1c5',     // colore d'accento in tema scuro
  ambience: 'lab',           // ambiente sonoro: lab|factory|office|public|retail|clinic|port|control
  motto: 'Compliance prima di tutto',  // una riga, mostrata nella intro
},
intro: {                      // "cold open" prima del nodo 1 (saltabile)
  when: 'Lunedì · 07:50', where: 'In auto verso Latina', view: 'car',
  scene: [ ...righe di scena (4–7), ultima riga porta al nodo 1... ],
},
hud: [                        // 2–3 widget "firma" dello scenario, aggiornati a ogni mossa
  { type: 'stakeholders', title: 'Mappa del potere', build: (d) => [ ...dati... ] },
],
wild: [ ...imprevisti dentro lo scenario (vedi §6)... ],
shocks: [ ...shock del giorno di chiusura (vedi §7)... ],
fc: {                         // dati per le forecast call (vedi §8)
  crm: 'Commit al 90%: «Mirko dice che ci siamo»',
  people: { E: 'Aldo Fabbri (AD)', C: 'Mirko Tesei', Dp: '…', P: '…', M: '…', I: '…', Dc: '…', Co: '…' },
  risk: 'Il rischio che Marta si aspetta tu sappia nominare (1 frase).',
  custom: [ ...domande specifiche di Marta (vedi §8)... ],
},
```

## 5. Stato del deal `d` (disponibile nelle funzioni `if`, `build`, `fx`, `r`, `react`, `hit`)

```js
d.sc            // lo scenario
d.m             // { trust, value, urgency, control, risk }  (0..100)
d.mp            // Set di chiavi MEDDPICC: 'M','E','Dc','Dp','P','I','C','Co'
d.flags         // oggetto di flag impostati dalle scelte (set:{...})
d.disc          // sconto promesso (punti %)
d.list          // listino ACV (k€)
d.hist          // storia delle mosse: [{ node, id, q, t, r, ... }]
d.node          // id del nodo corrente
```
Nelle funzioni dei widget usa solo questi campi, **senza effetti collaterali**, e rispondi sempre anche a stato iniziale (hist vuoto).

## 6. Imprevisti dentro lo scenario (`sc.wild`) — variabili aleatorie #1

Dopo una mossa, con probabilità ~30% (max 2 per trattativa), il motore **inserisce** un nodo extra prima di proseguire. Serve a far sentire che il mondo non è un copione: arriva il guasto, la telefonata, la notizia. **La gravità dipende da come ti sei preparato**: lo stesso imprevisto è una catastrofe per chi ha un solo contatto e una nota a margine per chi ha fatto multi-threading.

```js
{
  id: 'champion_ko',                 // univoco nello scenario
  title: 'Il champion è fuori gioco',  // mostrato come titolo dell'allarme "Imprevisto"
  w: 1,                              // peso (1–3)
  after: ['n2', 'n3'],               // nodi dopo i quali può comparire (null = ovunque)
  if: (d) => true,                   // condizione di eleggibilità (opzionale)
  node: {                            // un nodo normale, con le stesse regole di §2
    when, view, bg, scene: (d) => [ ...righe, con varianti in base a d.mp / d.flags... ],
    prompt, hint, tip,
    choices: [ ch('a', q, t, r, fx, { next: 'RET', say, react }), ... ],   // 3–4 scelte, tutte con next: 'RET'
  },
}
```

Regole di progetto:
- **Per scenario: 4–5 imprevisti**: almeno 2 *negativi* (ostacolo), 1 *positivo* (opportunità: va colta bene), 1 *ambiguo* (dilemma, il vantaggio ha un costo). Devono essere **specifici dello scenario** (nomi, ambiente, tema), non generici.
- `next` di tutte le scelte è la stringa `'RET'` (torna al flusso normale).
- Non usare `jolly` più di una volta per nodo. Non impostare `integ` a meno che sia una scorciatoia etica.
- `fx` entro ±14 sui meter (`t v u c r`), entro ±10 su `d`. Gli imprevisti non devono decidere da soli l'esito: spostano la probabilità di 5–20 punti al massimo, nel bene e nel male.
- **Sensibilità allo stato**: almeno 2 dei 4–5 devono avere `scene`/`r`/`fx` funzioni di `d` (es. se `d.mp.has('E')` il danno è dimezzato e la scena lo racconta).
- Ogni nodo deve avere almeno 1 scelta con `q >= 2` e almeno 1 con `q <= 1`.
- I nodi imprevisto sono nodi normali: `where`, `when`, `view`, `scene`, `prompt`, `hint`, `tip` obbligatori.

Gli imprevisti **generici** (valgono per tutti gli scenari) sono in `src/js/34-wild-generic.js` → `CL.wildGeneric`, stessa forma.

## 7. Shock del giorno di chiusura (`sc.shocks`) — variabili aleatorie #2

Tutte le trattative giocate restano **in sospeso** fino al **giorno di chiusura** (fine trimestre). Quel giorno, per ogni trattativa, con probabilità ~60% interviene **uno shock** (negativo o positivo) *prima* della firma. Chi ha preparato bene (protetto) subisce poco; chi no, subisce molto.

```js
{
  id: 'cfo_cambia',
  title: 'Il CFO lascia l’azienda',
  kind: 'neg',                  // 'neg' | 'pos'
  w: 1,                         // peso
  if: (d) => true,              // eleggibilità (es. 'pos' solo se d.mp.has('E'))
  hit: (d) => !(d.mp.has('E') && d.mp.has('C')),   // true = la trattativa è VULNERABILE (subisce il colpo pieno)
  dp: -0.30,                    // variazione della probabilità di chiusura se vulnerabile (neg: -0.12..-0.45, pos: +0.05..+0.15)
  dpProt: -0.03,                // variazione se protetta (neg: -0.00..-0.06; pos: = dp se hit, altrimenti 0)
  hitText: '…',                 // 2–3 frasi: cosa succede (se vulnerabile). Può contenere {client}.
  protText: '…',                // 2–3 frasi: cosa succede se eri protetto (tono diverso: "lo sapevi, avevi un piano")
}
```
Regole: **per scenario 3 shock** (2 negativi, 1 positivo), specifici e plausibili. `hit` deve dipendere da **scelte reali** del giocatore (`d.mp`, `d.flags`, `d.m.*`), così che prepararsi paghi. Testi in seconda persona presente come narrazione, con un dettaglio concreto.

Gli shock **generici** sono in `src/js/32-shocks.js` → `CL.shocksGeneric`.

## 8. Forecast call con Marta

Marta Colombo (Sales Director) è sveglia, ironica, esigente ed **equa**. Dà del *tu*. Si basa sui dati del CRM (il MEDDPICC che hai compilato), non sulle impressioni. Non umilia mai: sfida, poi aiuta se sei onesto. Premia la franchezza, punisce il bluff, non sopporta il sandbagging.

Due call per trimestre: **a metà** (settimana ≥ 6) e **finale** (prima della chiusura). In ciascuna il giocatore assegna a ogni trattativa in sospeso una categoria (**Commit**, **Best Case**, **Pipeline**, **Fuori**), poi Marta *sfida* le chiamate che non tornano:

| Tipo di sfida | Quando |
|---|---|
| `gap:<L>` (evidence) | Hai chiamato più in alto di quanto i dati sostengono. Marta punta sul **primo buco** del MEDDPICC (L ∈ E, Dp, P, M, C, I, Dc, Co) oppure su `disc` (sconto oltre soglia), `cap` (un tetto strutturale è attivo), `meters` (meter bassi senza lettere mancanti). |
| `sandbag` | Hai chiamato più in basso di quanto i dati sostengono. |
| `risk` | La chiamata torna, ma Marta chiede: "cosa può farlo saltare?". |
| `unworked` | Hai messo in Commit/Best Case una trattativa che non hai mai lavorato. |
| `coverage` | Domanda globale: la quota è coperta? Cosa fai nelle prossime settimane? |
| `custom` | Domande specifiche dello scenario (`sc.fc.custom`). |

### 8.1 `sc.fc.custom` (2–3 per scenario)

```js
{
  id: 'rinaldi_scritto',
  if: (d) => true,                  // quando ha senso farla
  has: (d) => !!d.flags.ebEngaged,  // true = il giocatore HA davvero l'evidenza richiesta
  q: 'Rinaldi ti ha dato il sì per iscritto, o è un “ci siamo” a voce?',   // battuta di Marta
  evidence: 'Sì: mail di ieri alle 18:20, in copia Valeria. La inoltro.',  // opzione disponibile solo se has(d) è true
  honest:   'A voce. Ho una call giovedì per averlo per iscritto: fino ad allora lo tengo in Best Case.',  // sempre disponibile
  bluff:    'Per iscritto, sì. Ho tutto.',                                // disponibile solo se has(d) è false
  vague:    'Mi ha detto che è fatta, di lui mi fido.',                    // sempre disponibile
  react: { evidence: 'Marta annuisce…', honest: '…', bluffCaught: '…', bluffPassed: '…', vague: '…' },   // risposte di Marta (stringhe)
}
```

### 8.2 Banca di testo generica `CL.FCBANK` (file `33-fc-gaps.js` e `35-fc-misc.js`)

Struttura esatta (tutte le chiavi **obbligatorie**; array di stringhe, minimo il numero indicato). Le stringhe di Marta sono **solo il parlato** (niente didascalie); quelle del giocatore sono in prima persona. Segnaposto utilizzabili: `{client}`, `{title}`, `{who}` (persona di riferimento per quella lettera: `sc.fc.people[L]`), `{claim}` (categoria dichiarata, es. "Commit"), `{truth}` (categoria che i dati sostengono), `{acv}` (ACV netto, es. "€410k"), `{p}` (probabilità interna in %, es. "62%"), `{nome}`.

```js
CL.FCBANK = {
  open:   { mid: [≥3], final: [≥3] },       // Marta apre la call: ciascuna è un array di righe-di-scena [{w:'marta',a:'…',t:'…'}, …] (2–3 righe)
  sheet:  { mid: [≥2], final: [≥2] },       // frase con cui Marta invita a compilare il foglio (stringa)
  gaps: {                                   // una voce per ciascuna lettera E, Dp, P, M, C, I, Dc, Co e per disc, cap, meters
    E: {
      q: [≥3],                              // Marta: la domanda di evidenza ("Chi è l’Economic Buyer di {client} e quando l’hai visto?")
      honest: [≥3],                         // giocatore: ammette il buco e ricolloca ("Hai ragione: {who}…")
      bluff: [≥3],                          // giocatore: sostiene di avere ciò che non ha (allettante, plausibile)
      vague: [≥2],                          // giocatore: risposta evasiva ("Il cliente è entusiasta…")
      react: { honest: [≥2], bluffCaught: [≥2], bluffPassed: [≥2], vague: [≥2] },  // Marta
    },
    /* … Dp, P, M, C, I, Dc, Co, disc, cap, meters … stessa forma … */
  },
  sandbag:  { q:[≥3], correct:[≥3], stay:[≥2], vague:[≥2], react:{ correct:[≥2], stay:[≥2], vague:[≥2] } },
  risk:     { q:[≥3], name:[≥3], overconf:[≥2], vague:[≥2], react:{ name:[≥2], overconf:[≥2], vague:[≥2] } },
  unworked: { q:[≥3], honest:[≥3], bluff:[≥2], plan:[≥2], react:{ honest:[≥2], bluffCaught:[≥2], bluffPassed:[≥2], plan:[≥2] } },
  coverage: { q:[≥3], honest:[≥3], optimistic:[≥3], vague:[≥2], react:{ honest:[≥2], optimistic:[≥2], vague:[≥2] } },
  wrap:     { good:[≥3], mixed:[≥3], bad:[≥3] },          // chiusura della call (stringhe di Marta), per qualità complessiva
  closing:  { intro:[≥3], won:[≥3], lost:[≥3], slip:[≥3], fcGood:[≥3], fcBad:[≥3], fcMixed:[≥3] },  // giorno di chiusura (stringhe di Marta)
};
```

Regola di tono per i **bluff**: devono suonare *plausibili e invitanti* (è ciò che dice un AE sotto pressione), mai ridicoli. Le risposte `honest` devono costare un po' (orgoglio) ma aprire a un aiuto concreto.

## 9. Contratto del modulo **viewport** (`src/js/45-ui-viewport.js` + `src/viewport.css`)

Disegna il **punto di vista soggettivo** in SVG procedurale (nessuna immagine esterna). Interfaccia:

```js
const vp = CL.ui.makeViewport();           // → { el, set(state), speak(key|'you'|null), destroy() }
container.appendChild(vp.el);
vp.set({
  theme: { bg: 'lab', accent: '#0e7c86', accentDark: '#4fd1c5' },   // da sc.theme (accent facoltativi)
  view: 'call',                                                      // vedi §2
  people: [ { key:'elisa', name:'Elisa Marchetti', role:'VP Operations', hue:205, stance:'ally' } ],  // massimo 5
  when: 'Lunedì · 09:10',
  where: 'Call · Teams',
  caption: 'Chiamata · 12:41',     // facoltativa (cronometro/indicazione diegetica)
});
vp.speak('elisa');                 // evidenzia chi parla (senza ridisegnare la scena); 'you' = parli tu; null = silenzio
```
- `stance` ∈ `'champion'|'ally'|'neutral'|'skeptic'|'hostile'|'unknown'|undefined`: se presente, un indicatore discreto (puntino colorato + etichetta breve) accanto al nome.
- Sfondi `bg`: `lab, factory, night, public, retail, clinic, port, control, office`. Viste: `call, meeting, walk, desk, phone, mail, car`. Ogni combinazione sfondo×vista deve risultare **coerente**: `call`, `desk`, `phone`, `mail` usano come ambiente *la tua* postazione (office/night) con i colori del tema; `meeting`, `walk` e `car` usano lo sfondo del tema come ambiente reale.
- **Prima persona**: in primo piano **le tue mani/braccia** o oggetti tuoi (penna, quaderno, laptop, telefono, volante, tablet) ancorati al bordo inferiore; i personaggi sono *davanti* a te. Niente avatar del giocatore.
- Persone: busti stilizzati generati da `key`+`hue` (carnagione, capelli, occhiali, colletto variano in modo deterministico dal `key`). Chi parla è più nitido, leggermente più grande, con archi sonori; gli altri sono attenuati. Etichetta nome+ruolo in piccolo.
- Overlay discreto: `when`/`where` in alto a sinistra, `caption` in alto a destra.
- Aspect ratio 16:6.5 (desktop) con `viewBox` fisso, scalabile (`preserveAspectRatio="xMidYMid slice"`), altezza min 170px su mobile. Funziona in **tema chiaro e scuro** usando le variabili CSS del gioco (`--surface`, `--ink`, `--line`, `--accent`, `--bg`…) e `color-mix()`; per il tema scuro l'ambiente si scurisce e le luci restano calde. Rispetta `prefers-reduced-motion` (nessuna animazione).
- Animazioni sobrie: respiro leggero del parlante, pulsazione dell'indicatore "mic live", cambio parlante con transizione 200ms.
- Accessibilità: l'SVG ha `role="img"` e `aria-label` che descrive la scena ("Videochiamata con Elisa Marchetti"); è **decorativo** rispetto al testo.
- Nessuna dipendenza oltre a `CL.ui.h` (DOM helper) e a `CL.ui.initials`. Non toccare `style.css`.

## 10. Contratto del modulo **widget** (`src/js/46-ui-widgets.js` + `src/widgets.css`)

```js
const el = CL.ui.widget(type, title, data, prevData);   // → HTMLElement (da inserire nel cruscotto)
```
`prevData` è l'ultimo `data` mostrato (può essere `null`): le righe/celle cambiate vanno **evidenziate** per ~1.8 s con una classe `.chg` e una transizione (il giocatore deve *vedere* cosa si è mosso). Larghezza di riferimento: **316px** (colonna del cruscotto desktop), ma deve essere fluido fino a 300px e usare bene fino a 640px (mobile a tutta larghezza). Tutti i colori da variabili CSS del gioco (`--surface`, `--surface-2`, `--ink`, `--ink-2`, `--ink-3`, `--line`, `--line-2`, `--accent`, `--good`, `--good-tint`, `--warn`, `--warn-tint`, `--bad`, `--bad-tint`, `--accent-tint`) con tema chiaro/scuro automatico. Nessun emoji.

Tipi e forma dei dati:

| `type` | `data` | Uso |
|---|---|---|
| `stakeholders` | `[{ who:'elisa', name:'Elisa Marchetti', role:'VP Operations', stance:'champion'\|'ally'\|'neutral'\|'skeptic'\|'hostile'\|'unknown', note:'testo breve', hue:205 }]` | Mappa del potere: avatar, ruolo, **posizione** (pillola colorata) e nota. |
| `clock` | `{ label:'Fine trimestre', time:'17:42', deadline:'18:00', pct:0..1, urgent:bool, sub:'testo' }` **oppure** `{ days:11, of:11, label:'Giorni alla firma', sub }` | Orologio digitale con barra/anello di avanzamento verso la scadenza. |
| `termsheet` | `{ cols:['Richiesta','Nostra posizione','Stato'], rows:[{ k:'Sconto', ask:'30%', ours:'12%', st:'open'\|'traded'\|'won'\|'lost'\|'blocked' }] }` | Foglio di negoziazione. |
| `board` | `{ cols:[{ title:'Sicurezza', cards:[{ t:'Questionario 320 domande', st:'todo'\|'doing'\|'done'\|'blocked', k:'sec1' }] }] }` | Kanban a colonne con carte colorate per stato. |
| `kpis` | `[{ k:'adozione', label:'Adozione', value:'52%', delta:'+17', tone:'good'\|'bad'\|'warn'\|'neutral', spark:[numeri…], target:'70%' }]` | Tessere KPI con sparkline SVG e obiettivo. |
| `scorecard` | `[{ k:'budget', label:'Budget approvato', crm:'Sì', real:'No', st:'good'\|'bad'\|'warn' }]` | "CRM vs realtà": due colonne a confronto per voce. |
| `timeline` | `{ items:[{ k:'t1', t:'15 ott', label:'Richiesta budget', st:'done'\|'now'\|'todo'\|'late' }] }` | Linea del tempo verticale compatta. |
| `checklist` | `[{ k:'c1', t:'Chiarimento formale inviato', st:'done'\|'todo'\|'bad'\|'warn', note:'testo breve' }]` | Lista di controllo con spunte/avvisi. |
| `scoreboard` | `{ rows:[{ k:'tec', label:'Tecnica', max:70, us:52, them:58 }], total:{ us, them, max:100 }, caption:'stima' }` | Punteggi a barre contrapposte, con totale. |

- Il titolo (`title`) è una riga `h4` in stile cruscotto (maiuscolo, mono, letter-spacing) coerente con le altre sezioni del cruscotto del gioco.
- Se `data` è `null`/vuoto: mostra uno stato vuoto sobrio.
- Esporre anche `CL.ui.widgetTypes` (array dei tipi supportati).

## 11. Cast generico (disponibile in tutte le scene)

`marta` (Marta Colombo, Sales Director, hue 348), `davide` (Davide Ferri, Solution Engineer, hue 175), `collega` (Collega di team, hue 60), `cliente` (Il tuo contatto, hue 210). Lo scenario può ridefinire queste chiavi nel proprio `cast`.

## 12. Proprietà dei file (per evitare conflitti nel lavoro in parallelo)

| File | Proprietario |
|---|---|
| `src/js/00-core.js`, `10-engine.js`, `11-*.js`, `12-forecast.js`, `4*-ui-*.js` (tranne 45/46), `90-main.js`, `style.css`, `index.html`, `build.mjs`, `tests/validate.mjs` | motore/UI (non modificare) |
| `src/js/45-ui-viewport.js`, `src/viewport.css`, `tests/demo-viewport.html` | agente viewport |
| `src/js/46-ui-widgets.js`, `src/widgets.css`, `tests/demo-widgets.html` | agente widget |
| `src/js/32-shocks.js`, `src/js/34-wild-generic.js` | agente banca generica |
| `src/js/33-fc-gaps.js` | agente banca forecast A |
| `src/js/35-fc-misc.js` | agente banca forecast B |
| `src/js/2x-sc-*.js` | agente di ciascuno scenario (fase successiva) |

## 13. Note operative emerse dalla riscrittura degli otto scenari

- **Esclusioni dai banchi generici.** Campi opzionali del scenario: `noWild: ['id', …]` (imprevisti generici da non estrarre), `noShock: ['id', …]` (shock generici da non estrarre), `fc.skipGaps: ['E', 'C', 'disc', …]` (lettere MEDDPICC che in questo scenario non si possono guadagnare, e `'disc'` se lo sconto non si negozia, così non diventano il “divario” di una sfida di Marta). Usali quando un generico ripete un fatto già dello scenario (stesso concorrente, stessa offerta) o ne contraddice il registro (scenari “a tempo”, gare pubbliche). `validate-banks.mjs` segnala gli id inesistenti.
- **Quando vengono valutate le funzioni dei testi.** `scene`, `when`, `view`, `bg` e le righe di `scene(d)` vedono lo stato *prima* della scelta. `r(d)` e `react(d)` vedono lo stato *dopo* l'applicazione di `fx`, `mp`, `set` della mossa appena fatta, ma la mossa non è ancora in `d.hist` (quindi `picked(d, node, id)` per la scelta in corso è falso: usa i flag). `t` e `say` sono stringhe statiche: se una battuta dipende dallo stato va scritta in forma neutra.
- **Shock e domande di Marta lavorano su uno stato ricostruito.** `CL.pseudoDeal` restituisce un deal con `hist: []`: `hit(d)`, `if(d)` degli shock e `has(d)`/`if(d)` delle domande `fc.custom` possono leggere `d.mp`, `d.flags`, `d.m`, `d.disc`, ma **non** `d.hist`. Per “essere protetto” poggia su un flag.
- **Cartelli, tempo e luogo.** Se un nodo ha `when`, il viewport mostra l'ora a parte: scrivi `where` come luogo (`Videocall · Teams`), senza ripetere giorno e ora (se li ripeti, l'interfaccia li toglie dal cartello ma restano nella lettura per gli screen reader).
- **Viste e persone.** Chi scrive in chat o per email non è nella stanza: compare nel viewport solo nelle viste a distanza (`call`, `phone`, `mail`, `car`, `desk`), non in `meeting` e `walk`. Nella vista `mail` il mittente è quello della prima riga `{ mail: { from, subj } }` del nodo.
- **I finali (`endings`) sono stringhe statiche**: scrivili validi per ogni percorso che porta a quell'esito.
- **Domande di Marta (`fc.custom`): l'opzione `honest` è offerta solo a chi NON ha l'evidenza** (`has(d)` falso). Chi ha davvero fatto la cosa vede `evidence` e `vague`; `bluff` compare solo a chi non ce l'ha. Scrivi `honest` come “non ce l'ho”, vero per ogni percorso in cui `has(d)` è falso, ed `evidence` come un fatto garantito dai soli flag che compongono `has(d)`.
- **Indizi di forma.** `node tests/lengthbias.mjs <id>` deve passare: la risposta migliore non è la più lunga, la correlazione tra qualità e lunghezza resta sotto 0,35 (in valore assoluto), la categoria del forecast compare in tutte le opzioni di una domanda o in nessuna; per il dojo la risposta da cintura nera non è la più lunga in più del 40% delle obiezioni.
