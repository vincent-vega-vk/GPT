# CLOSER · il simulatore dell'Account Executive

> 13 settimane. Una quota. Otto trattative vere.

Gioco di decisioni sul ruolo dell'Account Executive in vendite enterprise (software B2B, mercato italiano). Ogni trattativa è uno scenario ramificato con stakeholder, trappole e conseguenze ritardate. Funziona in qualunque browser, su desktop e mobile, senza server né dipendenze.

**Per giocare:** apri `dist/closer.html`. È un unico file autosufficiente (CSS e JS inclusi). I font vengono caricati da Google Fonts se c'è rete; offline il gioco usa i font di sistema.

Tutte le aziende, le persone e le cifre sono di fantasia. Il fornitore ("Nexora") non esiste.

## Cosa si impara

| Scenario | Tema | Trappola tipica |
|---|---|---|
| **Il Champion Fantasma** · FarmaVita (pharma) | Multi-threading, Economic Buyer, business case, give-get | Un solo contatto entusiasta e un CRM in "Commit" |
| **Il Titolare** · Meccanica Brenta (PMI familiare) | Relazione, concorrente locale, stakeholder resistente | Promettere una data per chiudere subito |
| **Ultimo Giorno del Trimestre** · Terrasole (alimentare) | Negoziazione con gli Acquisti, ancoraggio, soglia LEP, forecast onesto | Cedere l'ultima richiesta senza scambio |
| **La Gara** · ASL Valle Serena (sanità pubblica) | Gara pubblica, par condicio, partner con conflitto | Il contatto "riservato" col RUP |
| **Il Cavallo di Troia** · Lumina Retail (retail) | Displacement di un incumbent, pilota con criteri, coesistenza | Il pilota gratuito senza criteri di successo |
| **Rinnovo a Rischio** · BioNova (biotech) | Account in sofferenza, nuovo sponsor, pricing a risultato | Vendere espansione con i ticket aperti |
| **Il Deal Zombie** · Logistica Adriatica (trasporti) | Qualificazione, compelling event, right-sizing, quando andarsene | Il deal da €900k "in Commit" da 14 mesi |
| **Il Paper Process** · Meridiana Energia (utility) | Sicurezza, responsabilità contrattuale, residenza dei dati, poteri di firma | Dichiarare "conforme" ciò che non si può dimostrare; la side letter |

Più il **Dojo delle obiezioni**: 16 obiezioni reali, 8 per giro, 4 risposte ciascuna graduate da "cintura nera" a "errore".

## Come funziona

- **Trimestre**: 13 settimane e 12 di lavoro. Ogni trattativa costa 2–3 settimane e ha una finestra di disponibilità (il calendario la mostra). Non si giocano tutte: bisogna scegliere, ispezionare (gratis), rinunciare.
- **Cruscotto del deal**: Fiducia, Valore, Urgenza, Controllo, Rischio più il checklist **MEDDPICC**. Da qui nasce la probabilità di chiusura (modello di gioco, non statistica reale). Alcuni errori impongono un **tetto** esplicito (es. "senza Economic Buyer il deal non supera il 30%") e il gioco lo mostra.
- **Sconto e soglia LEP**: fino alla soglia lo sconto è autonomo; oltre servono contropartite (give-get) o il Deal Desk. Senza approvazione il Deal Desk blocca lo sconto promesso e il cliente se ne accorge.
- **Jolly** (limitati): Sales Engineer ×3, Executive Sponsor ×2, Referenza ×2, Deal Desk ×2, Legal ×1. Spesso esiste un'alternativa gratuita quasi altrettanto buona: il gioco premia l'uso efficiente.
- **Reputazione**: promesse irrealistiche, omissioni, side letter e forecast gonfiati pagano subito e costano dopo (a volte nello stesso scenario, con una conseguenza ritardata).
- **Interludi**: eventi casuali tra un deal e l'altro (pipeline review, promo del concorrente, opportunità lampo, la tentazione di una promessa di roadmap…).
- **Commissione**: 6% fino alla quota, 12% oltre. Quota €1,7 M. **Senza rete** (cruscotto nascosto) vale +10%. **Pressione** aggiunge un timer a ogni decisione.
- Le opzioni sono **mescolate** a ogni mossa: la risposta giusta non sta mai nello stesso posto. Tasti: `1`–`5` scelgono, `Invio` continua, `Esc` chiude le finestre.

## Struttura del progetto

```
closer/
├─ src/
│  ├─ index.html          # elenco degli script/CSS (sorgente della build)
│  ├─ style.css
│  └─ js/
│     ├─ 00-core.js       # namespace, RNG, storage, costanti (quota, jolly, MEDDPICC)
│     ├─ 10-engine.js     # stato del deal, probabilità, sconto/LEP, esito, trimestre, badge
│     ├─ 20…27-sc-*.js    # gli 8 scenari (dati puri)
│     ├─ 30-dojo.js       # obiezioni
│     ├─ 31-events.js     # interludi di carriera
│     ├─ 40…44-ui-*.js    # interfaccia (DOM vanilla, nessuna libreria)
│     └─ 90-main.js       # avvio e scorciatoie da tastiera
├─ build.mjs              # inline di CSS+JS → dist/closer.html
├─ dist/closer.html       # gioco pronto, un solo file
└─ tests/
   ├─ validate.mjs        # struttura degli scenari + calibrazione (percorso migliore/peggiore/casuale)
   ├─ simulate.mjs        # Monte Carlo del trimestre per profili di abilità
   ├─ e2e.mjs             # Playwright: trimestre, dojo, allenamento, mobile, screenshot
   └─ robust.mjs          # Playwright: policy casuali, senza rete, timer, squalifica, abbandono, overflow
```

Il motore (`00`, `10`) non tocca il DOM: gli scenari e le simulazioni girano in Node puro.

## Comandi

```bash
node build.mjs            # rigenera dist/closer.html
node tests/validate.mjs   # valida i contenuti (grafo dei nodi, jolly, MEDDPICC, calibrazione)
node tests/simulate.mjs   # distribuzione dei risultati per profilo di abilità
npm test                  # tutto, incluso il test UI (richiede Playwright e Chromium)
```

### Calibrazione attuale (1.500 trimestri simulati per profilo, `npm run simulate`)

| Profilo | Quota media | Vittorie |
|---|---|---|
| Esperto con piano ottimo | ~139% | 4,9 |
| Esperto, deal scelti a vista | ~129% | 4,5 |
| Solo mosse "solide o migliori" (q≥2) | ~90% | 3,0 |
| Solo mosse "non errori gravi" (q≥1) | ~37% | 1,2 |
| Scelte casuali | ~12% | 0,5 |

## Aggiungere uno scenario

Crea `src/js/28-sc-nome.js`, chiama `CL.registerScenario({...})` e aggiungi il file a `src/index.html`. Schema essenziale:

```js
{
  id, title, client, sector, hook, brief, scout, teaches: [],
  list: 480,            // k€ di ACV a listino
  cost: 3,              // settimane
  window: [1, 8],       // finestra di disponibilità
  stars: 3, lep: 15, slip: 0.3, crm: { cat, prob },
  cast: { chiave: { name, role, hue } },
  start: { t, v, u, c, r, have: ['I'] },   // Fiducia, Valore, Urgenza, Controllo, Rischio, MEDDPICC già acquisiti
  caps: [{ id, max, if: (d) => …, why }],  // tetti alla probabilità
  nodes: { n1: { where, scene: [...], prompt, hint, tip, choices: [ch(id, q, testo, risultato, fx, extra)] } },
  endings: { won, lost, slip, disq? },
  lessons: [{ if: (d) => …, good, t }],
}
```

- `fx`: `t v u c r` (meter), `d` (sconto in punti), `l` (variazione del listino in k€).
- `extra`: `mp` / `mpx` (MEDDPICC guadagnati/persi), `set` (flag), `integ` (reputazione), `jolly` (`se|exec|ref|desk|legal`), `next` (id del nodo, funzione `(d) => id`, `'END'` o `'DQ'`).
- `q` è la qualità della mossa (0 errore, 1 discutibile, 2 solida, 3 da closer): guida il feedback ed è usata dai test di calibrazione.

Dopo l'aggiunta, `node tests/validate.mjs` segnala nodi irraggiungibili, `next` rotti, percorsi migliore/peggiore fuori scala e nodi senza almeno due scelte libere (senza jolly).

## Note di progetto e limiti

- **Probabilità** = logistica su una combinazione pesata di meter, copertura MEDDPICC, rischio e sconto, con tetti per gli errori strutturali. Sopra il 90% la firma è considerata certa (un deal condotto bene non deve dipendere da un dado sfortunato). È un modello didattico, non una previsione.
- **Il contenuto è un'opinione ragionata**, non una verità universale: metodologie (MEDDPICC, give-get, mutual close plan, challenger) sono rese in forma pratica e semplificata. Le parti normative (gare pubbliche, residenza dei dati, poteri di firma) sono descritte in modo generico e non sostituiscono la consulenza legale.
- Nessun dato esce dal browser. Il browser salva solo preferenze, record e badge in `localStorage` (con degradazione silenziosa se non disponibile).
