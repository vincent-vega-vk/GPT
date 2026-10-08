# SAP Quest — Guida per chi scrive i contenuti

Gioco stile Duolingo per un **Account Executive SAP in Italia** (focus Life Sciences e Consumer Products). Lingua: **italiano** (dai del "tu"), termini SAP in inglese come nel parlato reale. Tono: diretto, un po' di ironia, mai paternalistico. Data di riferimento dei contenuti: **ottobre 2026**.

## Principio n.1: nessuna informazione inventata
- Cerca con `WebSearch` (mode `standard`; `extended` solo per fatti difficili). `WebFetch` verso i domini SAP spesso **non funziona**: lavora sugli snippet e incrocia **almeno 2 fonti** per ogni numero/data/nome.
- Se non riesci a verificare un dato volatile: **non metterlo**. Meglio una domanda concettuale stabile.
- Solo informazioni **pubbliche**. Mai prezzi di listino, sconti reali, quote, policy interne SAP, dettagli di clienti reali.
- Non dichiarare cosa un cliente reale (Angelini, Menarini, ecc.) usa o non usa: usa scenari generici ("un'azienda farmaceutica italiana a controllo familiare").
- Competitor: solo fatti verificabili e datati. Niente FUD.

## Principio n.2: i dati che invecchiano vanno nei **fatti** (`facts`), non nel testo
Un dato è *volatile* se è un numero, una data, un nome commerciale, una quota, un evento futuro, uno stato di disponibilità, una persona in un ruolo. Questi vanno in `data/facts/<mondo>.json` e nelle domande si usa il segnaposto `{{chiave}}`.
Il gioco sostituisce `{{chiave}}` col valore corrente e mostra data/fonte/affidabilità. Quando il fatto viene aggiornato, **tutte** le domande si aggiornano da sole.

Formato fatto (chiave = `<idmondo>.<nome_in_snake_case>`, es. `w03.rise_term_years`):
```json
"w03.esempio": {
  "label": "Descrizione breve del dato",
  "value": "testo da mostrare, già formattato in italiano",
  "asOf": "2026-07-23",        // data a cui si riferisce il dato
  "checked": "2026-10-08",     // data in cui TU l'hai verificato (oggi)
  "staleAfter": "2026-10-21",  // dopo questa data è sospetto: prossimo evento che lo cambia, oppure checked + 90 giorni (dati rapidi) / 180 (dati lenti)
  "source": "https://...",     // URL REALE che hai visto nei risultati. Mai inventare URL.
  "confidence": "primary|secondary|low",  // primary = fonte ufficiale SAP/ente; secondary = stampa/analisti/consulenze; low = fonte debole
  "note": "facoltativo: limiti, ambiguità, cosa riverificare"
}
```
- I **fatti condivisi** `sap.*` sono in `data/facts/shared.json` (risultati Q2 2026, outlook, ECC, naming, acquisizioni, eventi). **Usali, non duplicarli e non modificarli.** Leggili prima di scrivere.
- Una domanda può usare `{{chiave}}` in `q`, nelle opzioni, in `exp`, nelle `points` della lezione. Il valore sostituisce il segnaposto **in modo letterale**: scrivi la frase in modo che regga grammaticalmente con qualunque valore ("Il CCB di Q2 2026 è {{sap.q2_26.ccb}}.").
- Non mettere un segnaposto dentro opzioni se i distrattori potrebbero coincidere con un valore futuro plausibile.
- **Dati stabili** (definizioni, concetti, metodi di vendita, architettura) restano testo normale: non gonfiare i facts.
- Se un fatto ha `confidence: secondary` o `low`, la domanda dovrebbe essere formulata in modo prudente.

## Struttura dei file che consegni (per ogni mondo assegnato)
| File | Contenuto |
|---|---|
| `data/worlds/<id>-<slug>.json` | `{"id":"w02","levels":[ ... ]}` (metadati del mondo stanno in `data/curriculum.json`) |
| `data/assessment/<id>-<slug>.json` | `{"id":"w02","items":[ 6 domande ]}` |
| `data/facts/<id>-<slug>.json` | oggetto `{ "<chiave>": {fatto}, ... }` (può essere `{}` solo se davvero non servono) |

`<id>-<slug>` esatti sono in `data/curriculum.json`. Il numero di livelli per mondo è **vincolante**. Leggi lo `scope` del tuo mondo: è l'elenco di cosa deve essere coperto. Verifica prima i dati ATTUALI (ottobre 2026) dove lo scope dice "ATTUALE/verifica".

## Livello
```json
{
  "id": "w02-l03",              // wNN-lKK, KK da 01 consecutivo, 2 cifre
  "title": "Greenfield o brownfield?",   // max 34 caratteri, evocativo
  "kind": "lesson",             // "lesson" | "roleplay" (>= metà esercizi con ctx) | "boss" (solo l'ULTIMO livello del mondo)
  "lesson": {
    "points": ["3-5 punti brevi (max 240 car.) che INSEGNANO ciò che verrà chiesto", "..."],
    "ae": "In trattativa: una frase pratica per l'AE (max 240 car.)"   // consigliata
  },
  "ex": [ ...esercizi... ]      // lesson/roleplay: 4-6 (target 5); boss: 8-10
}
```
Ogni livello = **mini-lezione + esercizi che la verificano**. Il giocatore può non sapere nulla: la lezione deve bastare per rispondere. Progressione: i primi livelli sono fondamenta, poi cresce la difficoltà; il boss mescola tutto il mondo (anche livelli precedenti) e include almeno 2 scenari.
Varietà: ogni livello con 5 esercizi usa **almeno 3 tipi diversi** di esercizio. Almeno **un esercizio per livello è uno scenario/applicazione pratica da AE** (non solo definizioni). Ogni tanto un livello `roleplay`.

## Tipi di esercizio
Campi comuni: `t` (tipo), `q` (testo, max 240), `exp` (spiegazione mostrata dopo la risposta, 20-420 car.: dì **perché**, non solo "è giusto"), `diff` (1-3, facoltativo), `ctx` (facoltativo: `{"who":"CFO","say":"frase del cliente"}`, max 300 car., per scenari).

| `t` | campi specifici | note |
|---|---|---|
| `mcq` | `o`: 3-4 opzioni (max 90 car.), `a`: indice corretto | Il gioco **mescola** le opzioni: non preoccuparti della posizione. Distrattori plausibili, di pari lunghezza. VIETATO "tutte/nessuna delle precedenti". |
| `tf` | `a`: true/false | `q` è un'affermazione. Bilancia vero/falso nel mondo (~50/50). |
| `multi` | `o`: 4-5, `a`: lista indici (>=2 e almeno una opzione sbagliata) | "Seleziona tutte le corrette". |
| `fill` | `q` con esattamente un `___`, `o`: 3-4, `a` | Frase da completare. |
| `match` | `pairs`: 4-5 coppie `[sinistra, destra]` (sx max 50, dx max 70) | Associa termine-definizione/prodotto-funzione. Elementi unici. |
| `order` | `items`: 3-6 passi **nell'ordine corretto** (max 80 car.) | Il gioco li mescola. Per sequenze davvero ordinate (processo, fasi, priorità). |
| `bucket` | `buckets`: 2-3 nomi (max 30), `items`: 4-8 coppie `[testo, indiceBucket]` | Classifica; ogni bucket usato almeno una volta. |

Esempi:
```json
{"t":"mcq","q":"Un CFO dice: «Perché dovrei migrare ora?». Qual è la risposta migliore?","ctx":{"who":"CFO","say":"Il nostro ECC funziona. Perché dovrei migrare ora?"},
 "o":["Ti chiedo prima quali processi di chiusura oggi ti costano di più, poi collego la data di manutenzione a quel costo.","La manutenzione standard finisce: se non migri sei fuori supporto.","Perché lo dicono gli analisti.","Ti mando la brochure di RISE."],"a":0,
 "exp":"Prima il problema del cliente, poi la leva temporale. Usare solo la scadenza è vendita per paura e invita all'obiezione sulla manutenzione estesa."}
{"t":"fill","q":"La manutenzione standard di ECC 6.0 EHP6-8 termina il ___.","o":["{{sap.ecc.mainstream_end}}","31 dicembre 2025","30 giugno 2028"],"a":0,"exp":"..."}
{"t":"order","q":"Metti in ordine le fasi di una discovery efficace","items":["Prepara ipotesi sul cliente","Apri con l'obiettivo della call","Fai domande aperte sul problema","Quantifica l'impatto","Concorda il prossimo passo"],"exp":"..."}
{"t":"bucket","q":"Public o private edition?","buckets":["Cloud ERP (public)","Cloud ERP Private"],"items":[["Standard e best practice, aggiornamenti frequenti",0],["Maggiore personalizzazione e controllo dei tempi di upgrade",1],["Multi-tenant",0],["Single-tenant",1]],"exp":"..."}
```
Nota JSON: usa virgolette dritte `"` per il JSON; dentro le stringhe italiane usa «caporali» o apostrofi ’ per citazioni. Nessun HTML. Nessun emoji dentro le opzioni (vanno bene in `lesson.ae` e titoli con parsimonia).

## Assessment (pool per mondo)
6 domande **di sola verifica** (nessuna lezione) per un test adattivo: **2 con `diff:1`, 2 con `diff:2`, 2 con `diff:3`**. Tipi ammessi: `mcq`, `tf`, `fill`, `multi`. diff 1 = lo sa chi ha visto SAP in superficie; diff 2 = lo sa un AE operativo; diff 3 = lo sa un AE senior/esperto del tema. Devono essere **indipendenti** dalle lezioni (formula diversa) e coprire parti diverse dello scope.

## Bias di scrittura: la risposta giusta non deve "vedersi"
Un giocatore furbo non deve poter indovinare dalla forma. Il validatore lo controlla (errore a livello di mondo):
- **Lunghezza**: la risposta giusta non deve essere la più lunga nella maggior parte delle domande (soglia: max 45% dei mcq/fill) né la più corta; rapporto medio di lunghezza corretta/distrattori tra 0,80 e 1,25. Errore tipico: la giusta è articolata e specifica, i distrattori sono tre parole.
  Rimedi: dai ai distrattori la **stessa struttura, specificità e lunghezza** della giusta; scrivi distrattori "quasi giusti" (vero ma per un altro prodotto/edizione/periodo, o corretto ma non risponde alla domanda); se la giusta ha una clausola ("... perché ..."), mettila anche nei distrattori; in circa un quarto delle domande fai in modo che la giusta sia la più corta.
- **Assoluti**: evita "sempre, mai, solo, tutti, nessuno, garantisce" quasi solo nei distrattori (si indovina dal tono). Usali anche in risposte giuste, oppure togli gli assoluti.
- Non far essere la giusta l'unica opzione con numeri, nomi di prodotto o dettagli concreti.
- Distrattori mai assurdi o ironici: devono essere errori che un AE reale potrebbe commettere.

## Qualità: checklist prima di consegnare
1. Ogni risposta corretta è davvero corretta **a ottobre 2026**, e ogni distrattore davvero sbagliato (ma plausibile).
2. Nessuna domanda ambigua o a trabocchetto linguistico. Nessuna dipendenza dal ricordare l'ordine delle opzioni.
3. Nessuna ripetizione: ogni `q` è unica nel mondo.
4. Le spiegazioni insegnano e, quando serve, dicono **come usarlo col cliente**.
5. Ogni dato volatile passa dai `facts` con fonte reale.
6. `python3 tools/validate.py --world <id>` passa con **0 errori** (e leggi i warning).

## Cosa NON fare
- Non toccare file di altri mondi, `shared.json`, `curriculum.json`, `tools/`, `assets/`. Non fare commit/push git.
- Non inventare URL, numeri, nomi di prodotto, date, persone.
- Non copiare testi da fonti: riformula.
