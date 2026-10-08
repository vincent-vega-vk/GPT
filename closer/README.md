# CLOSER · il simulatore dell'Account Executive

> 13 settimane. Una quota. Otto trattative vere. In prima persona.

Gioco di decisioni sul ruolo dell'Account Executive in vendite enterprise (software B2B, mercato italiano). Ogni trattativa è uno scenario ramificato con stakeholder, trappole e conseguenze ritardate, vissuto **dagli occhi dell'AE**: vedi la stanza, senti i pensieri, scegli cosa dire e cosa fare. Funziona in qualunque browser, su desktop e mobile, senza server né dipendenze.

**Per giocare:** apri `dist/closer.html`. È un unico file autosufficiente (CSS e JS inclusi). I font vengono caricati da Google Fonts se c'è rete; offline il gioco usa i font di sistema.

Tutte le aziende, le persone e le cifre sono di fantasia. Il fornitore ("Nexora") non esiste.

## Cosa c'è nella v2

- **Immersione in prima persona.** Ogni scena ha un *viewport soggettivo* (videochiamata, riunione, giro in stabilimento, scrivania, telefono, email, auto) con l'ambiente dello scenario; il testo è in seconda persona presente, con i tuoi pensieri (`think`), i messaggi (`chat`, `mail`) e le battute degli interlocutori. Scegli *cosa dire*: la battuta viene pronunciata e il mondo reagisce prima del feedback del coach.
- **Ogni scenario ha una identità propria**: tema grafico, ambiente sonoro sintetizzato, scena d'apertura (cold open), quadro di comando con widget specifici (CRM contro realtà, termsheet, kanban dei binari, registro di conformità, salute dell'account, clock…) che cambiano davvero con le tue mosse.
- **Forecast con la manager.** A metà trimestre e a fine trimestre Marta, la tua manager, rivede la pipeline e **ti mette sotto torchio**: sfida le categorie (Commit / Best case / Pipeline), chiede le prove sulle lettere MEDDPICC scoperte, controlla i deal non lavorati. Come rispondi sposta la sua fiducia, la reputazione e la probabilità dei deal; l'accuratezza del forecast alimenta un *kicker* di commissione.
- **Variabili aleatorie.** *Imprevisti* (eventi che si inseriscono nel mezzo della trattativa, specifici per scenario o generici: un'opportunità, un contrattempo, un dilemma) e *shock del giorno di chiusura* (il CFO lascia, l'ispezione congela, la banca nega il leasing, oppure una buona notizia). La loro gravità dipende dallo **stato in cui hai portato il deal**: chi ha multi-threading e un piano scritto si protegge, chi ha un solo contatto no. Si possono disattivare dalle impostazioni.
- **Deal in attesa.** Un deal "sigillato" non si chiude subito: la firma si risolve a fine trimestre, dopo il forecast e gli shock.

## Cosa si impara

| Scenario | Ambiente | Tema | Trappola tipica |
|---|---|---|---|
| **Il Champion Fantasma** · FarmaVita (pharma) | Laboratorio / compliance | Multi-threading, Economic Buyer, business case, give-get | Un solo contatto entusiasta e un CRM in "Commit" |
| **Il Titolare** · Meccanica Brenta (PMI familiare) | Officina / relazione | Relazione, concorrente locale, stakeholder resistente | Promettere una data per chiudere subito |
| **Ultimo Giorno del Trimestre** · Terrasole (alimentare) | Ufficio di sera / tempo reale | Negoziazione con gli Acquisti, ancoraggio, soglia LEP, forecast onesto | Cedere l'ultima richiesta senza scambio |
| **La Gara** · ASL Valle Serena (sanità pubblica) | Burocrazia / correttezza | Gara pubblica, par condicio, partner con conflitto | Il contatto "riservato" col RUP |
| **Il Cavallo di Troia** · Lumina Retail (retail) | Negozio / dati sul campo | Displacement di un incumbent, pilota con criteri, coesistenza | Il pilota gratuito senza criteri di successo |
| **Rinnovo a Rischio** · BioNova (biotech) | Salute dell'account | Account in sofferenza, nuovo sponsor, pricing a risultato | Vendere espansione con i ticket aperti |
| **Il Deal Zombie** · Logistica Adriatica (trasporti) | Porto / scetticismo | Qualificazione, compelling event, right-sizing, quando andarsene | Il deal da €900k "in Commit" da 14 mesi |
| **Il Paper Process** · Meridiana Energia (utility) | Sala di controllo / orologio | Sicurezza, responsabilità contrattuale, residenza dei dati, poteri di firma | Dichiarare "conforme" ciò che non si può dimostrare; la side letter |

Più il **Dojo delle obiezioni**: 16 obiezioni reali, 8 per giro, 4 risposte ciascuna graduate da "cintura nera" a "errore".

## Come funziona

- **Trimestre**: 13 settimane e 12 di lavoro. Ogni trattativa costa 2–3 settimane e ha una finestra di disponibilità (il calendario la mostra). Non si giocano tutte: bisogna scegliere, ispezionare (gratis), rinunciare.
- **Cruscotto del deal**: Fiducia, Valore, Urgenza, Controllo, Rischio più il checklist **MEDDPICC**. Da qui nasce la probabilità di chiusura (modello di gioco, non statistica reale). Alcuni errori impongono un **tetto** esplicito (es. "senza Economic Buyer il deal non supera il 30%") e il gioco lo mostra.
- **Sconto e soglia LEP**: fino alla soglia lo sconto è autonomo; oltre servono contropartite (give-get) o il Deal Desk. Senza approvazione il Deal Desk blocca lo sconto promesso e il cliente se ne accorge.
- **Jolly** (limitati): Sales Engineer ×3, Executive Sponsor ×2, Referenza ×2, Deal Desk ×2, Legal ×1. Spesso esiste un'alternativa gratuita quasi altrettanto buona: il gioco premia l'uso efficiente.
- **Reputazione**: promesse irrealistiche, omissioni, side letter e forecast gonfiati pagano subito e costano dopo (a volte nello stesso scenario, con una conseguenza ritardata).
- **Forecast**: due revisioni con Marta (a metà e a fine trimestre). Le sue domande dipendono da *dove la tua dichiarazione si distanzia dalla verità* (deal sovrastimati, sandbagging, lettere MEDDPICC scoperte). Rispondi con dati, non con speranza: la fiducia di Marta si guadagna e si perde, e sopra/sotto soglia sblocca o taglia risorse (Executive Sponsor extra).
- **Interludi**: eventi casuali tra un deal e l'altro (pipeline review, promo del concorrente, opportunità lampo, la tentazione di una promessa di roadmap…).
- **Commissione**: 6% fino alla quota, 12% oltre, più un kicker per l'accuratezza del forecast. Quota €1,7 M. **Senza rete** (cruscotto nascosto) vale +10%. **Pressione** aggiunge un timer a ogni decisione.
- Le opzioni sono **mescolate** a ogni mossa: la risposta giusta non sta mai nello stesso posto. Tasti: `1`–`5` scelgono, `Invio` continua (o completa la scena in corso), `Esc` chiude le finestre.
- **Impostazioni**: nome, difficoltà, timer, suoni e ambiente sonoro, tema chiaro/scuro, imprevisti on/off, modalità veloce (scene senza animazione di battitura).

## Struttura del progetto

```
closer/
├─ docs/SPEC-V2.md        # contratto dei dati v2 (righe di scena, wild, shock, forecast, widget, viewport)
├─ src/
│  ├─ index.html          # elenco degli script/CSS (sorgente della build)
│  ├─ style.css · viewport.css · widgets.css
│  └─ js/
│     ├─ 00-core.js       # namespace, RNG, storage, costanti (quota, jolly, MEDDPICC), cast e helper
│     ├─ 10-engine.js     # stato del deal, probabilità, sconto/LEP, imprevisti, shock, deal sigillati, trimestre, badge
│     ├─ 12-forecast.js   # motore del forecast: categorie, sfide, fiducia della manager, accuratezza
│     ├─ 20…27-sc-*.js    # gli 8 scenari (dati puri: nodi, widget, wild, shock, domande di Marta)
│     ├─ 30-dojo.js       # obiezioni
│     ├─ 31-events.js     # interludi di carriera
│     ├─ 32-shocks.js     # shock generici
│     ├─ 33-fc-gaps.js    # sfide di forecast per “divario” (banca testi)
│     ├─ 34-wild-generic.js # imprevisti generici
│     ├─ 35-fc-misc.js    # banca testi di Marta (apertura, scheda, sandbagging, rischio, chiusura…)
│     ├─ 40…44-ui-*.js    # interfaccia (DOM vanilla, nessuna libreria)
│     ├─ 45-ui-viewport.js # viewport soggettivo (SVG procedurale)
│     ├─ 46-ui-widgets.js # libreria di widget del quadro di comando
│     ├─ 47-ui-audio.js   # effetti e ambienti sonori (WebAudio, nessun file audio)
│     ├─ 48-ui-forecast.js # schermata di forecast con la manager
│     └─ 90-main.js       # avvio e scorciatoie da tastiera
├─ build.mjs              # inline di CSS+JS → dist/closer.html (con --artifact: frammento per l'incorporamento)
├─ dist/closer.html       # gioco pronto, un solo file
└─ tests/
   ├─ validate.mjs        # struttura degli scenari + calibrazione (percorso migliore/peggiore/casuale)
   ├─ validate-banks.mjs  # banche testuali v2 (wild, shock, forecast); --strict controlla ogni scenario
   ├─ mechanics-check.mjs # diff della meccanica di uno scenario rispetto a una versione git (deve restare invariata)
   ├─ simulate.mjs        # Monte Carlo del trimestre per profili di abilità
   ├─ preview.mjs         # anteprima visiva: screenshot di intro, scene, imprevisti, shock, cruscotto
   ├─ e2e.mjs             # Playwright: trimestre, forecast, dojo, allenamento, mobile, screenshot
   └─ robust.mjs          # Playwright: policy casuali, senza rete, timer, squalifica, abbandono, overflow
```

Il motore (`00`, `10`, `12`) non tocca il DOM: gli scenari e le simulazioni girano in Node puro.

## Comandi

```bash
node build.mjs            # rigenera dist/closer.html
node tests/validate.mjs   # valida i contenuti (grafo dei nodi, jolly, MEDDPICC, calibrazione)
node tests/validate-banks.mjs --strict   # copertura v2 di ogni scenario (wild, shock, forecast, widget)
node tests/mechanics-check.mjs farmavita # la meccanica non è cambiata rispetto a git HEAD
node tests/simulate.mjs   # distribuzione dei risultati per profilo di abilità
node tests/preview.mjs --sc=asl --out=/tmp/anteprima [--policy=best|random|q0] [--mobile] [--dark] [--wild=<id>] [--shocks] [--hud] [--fc]
npm test                  # tutto, incluso il test UI (richiede Playwright e Chromium)
```

## Aggiungere uno scenario

Crea `src/js/28-sc-nome.js`, chiama `CL.registerScenario({...})` e aggiungi il file a `src/index.html`. Lo schema completo (righe di scena, wild, shock, forecast, widget, viewport) è in `docs/SPEC-V2.md`; lo scenario di riferimento è `20-sc-farmavita.js`. Schema essenziale:

```js
{
  id, title, client, sector, hook, brief, scout, teaches: [],
  list: 480,            // k€ di ACV a listino
  cost: 3,              // settimane
  window: [1, 8],       // finestra di disponibilità
  stars: 3, lep: 15, slip: 0.3, crm: { cat, prob },
  cast: { chiave: { name, role, hue } },
  theme: { id, bg, accent, accentDark, ambience, motto },
  intro: { when, where, view, scene: [...] },
  hud: [ { type: 'stakeholders' | 'scorecard' | 'timeline' | …, title, build: (d) => … } ],
  start: { t, v, u, c, r, have: ['I'] },   // Fiducia, Valore, Urgenza, Controllo, Rischio, MEDDPICC già acquisiti
  caps: [{ id, max, if: (d) => …, why }],  // tetti alla probabilità
  nodes: { n1: { when, where, view, scene: [...], prompt, hint, tip, choices: [ch(id, q, testo, risultato, fx, extra)] } },
  wild: [...], shocks: [...], fc: { crm, people, risk, custom },
  endings: { won, lost, slip, disq? },
  lessons: [{ if: (d) => …, good, t }],
}
```

- `fx`: `t v u c r` (meter), `d` (sconto in punti), `l` (variazione del listino in k€).
- `extra`: `mp` / `mpx` (MEDDPICC guadagnati/persi), `set` (flag), `integ` (reputazione), `jolly` (`se|exec|ref|desk|legal`), `next` (id del nodo, funzione `(d) => id`, `'END'` o `'DQ'`), `say` (la battuta effettivamente pronunciata) e `react` (la reazione del mondo).
- `q` è la qualità della mossa (0 errore, 1 discutibile, 2 solida, 3 da closer): guida il feedback ed è usata dai test di calibrazione.

Dopo l'aggiunta, `node tests/validate.mjs` segnala nodi irraggiungibili, `next` rotti, percorsi migliore/peggiore fuori scala e nodi senza almeno due scelte libere (senza jolly); `validate-banks.mjs --strict` verifica la copertura v2.

## Note di progetto e limiti

- **Probabilità** = logistica su una combinazione pesata di meter, copertura MEDDPICC, rischio e sconto, con tetti per gli errori strutturali. Sopra il 90% la firma è considerata certa (un deal condotto bene non deve dipendere da un dado sfortunato). È un modello didattico, non una previsione.
- **Il contenuto è un'opinione ragionata**, non una verità universale: metodologie (MEDDPICC, give-get, mutual close plan, challenger) sono rese in forma pratica e semplificata. Le parti normative (gare pubbliche, residenza dei dati, poteri di firma) sono descritte in modo generico e non sostituiscono la consulenza legale.
- Il viewport è una rappresentazione stilizzata e procedurale (SVG), non una ripresa fotografica: serve a dare luogo, luce e presenza, non realismo grafico.
- Nessun dato esce dal browser. Il browser salva solo preferenze, record e badge in `localStorage` (con degradazione silenziosa se non disponibile).
