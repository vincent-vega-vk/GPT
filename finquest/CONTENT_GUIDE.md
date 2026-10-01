# FinQuest — guida ai contenuti

Ogni livello ha un file `content/LNNN.js` (es. `content/L007.js`) che chiama `FQC(id, {...})`.
Il motore genera le 20 tappe del livello mescolando questi contenuti con esercizi di calcolo,
grafici e simulazioni generati automaticamente (quelli non vanno scritti qui).

Lingua: italiano corretto, tono chiaro, diretto, amichevole ma professionale. Seconda persona singolare ("tu").
Contesto: italiano/europeo dove ha senso (euro, BTP, BOT, Borsa Italiana, FTSE MIB, CONSOB, BCE, ESMA).

## Struttura (conteggi ESATTI)

```js
FQC(7, {
  intro: 'Una frase che presenta il livello (max 160 caratteri).',
  cards: [ /* 6 schede infografiche */
    { t: 'Titolo breve', x: 'Spiegazione in 1-3 frasi (max 280 caratteri).', v: VISUAL },
  ],
  terms: [ /* 8 coppie termine → definizione */
    ['Termine', 'Definizione breve e precisa (max 110 caratteri), senza ripetere il termine.'],
  ],
  tf: [ /* 10 affermazioni: almeno 4 vere e almeno 4 false */
    ['Affermazione.', true, 'Perché è vera/falsa (max 170 caratteri).'],
  ],
  mcq: [ /* 8 domande a scelta multipla */
    { q: 'Domanda?', a: 'Risposta corretta', w: ['Errata 1', 'Errata 2', 'Errata 3'], e: 'Spiegazione (max 170).' },
  ],
  fill: [ /* 5 frasi da completare: ___ compare UNA sola volta */
    { s: 'La ___ è la perdita di potere d’acquisto della moneta.', a: 'inflazione', w: ['deflazione', 'liquidità', 'cedola'] },
  ],
  order: [ /* 2 esercizi di ordinamento: elementi già nell'ordine CORRETTO (4 o 5) */
    { q: 'Ordina dal meno rischioso al più rischioso', i: ['Conto deposito', 'BTP', 'ETF azionario', 'Singola azione'], e: 'Spiegazione.' },
  ],
  cat: [ /* 2 esercizi di classificazione: 2 gruppi, 3-4 elementi ciascuno */
    { q: 'Spesa fissa o variabile?', g: [['Fissa', ['Affitto', 'Rata del mutuo', 'Abbonamento']], ['Variabile', ['Cene fuori', 'Vestiti', 'Viaggi']]] },
  ],
  scen: [ /* 4 situazioni con 3 opzioni, ESATTAMENTE una ok:true */
    { s: 'Situazione concreta (max 300 caratteri).', q: 'Cosa fai?', o: [
      { t: 'Opzione A', ok: true, f: 'Feedback: perché è la scelta migliore.' },
      { t: 'Opzione B', ok: false, f: 'Feedback: cosa non va.' },
      { t: 'Opzione C', ok: false, f: 'Feedback: cosa non va.' },
    ] },
  ],
  tip: 'Un consiglio pratico finale da portare a casa (max 200 caratteri).',
});
```

## Visual delle schede (`v`)

Scegli quello che spiega meglio il concetto; varia i tipi all’interno del livello (almeno 4 tipi diversi su 6 schede).

| tipo | forma | uso |
|---|---|---|
| stat | `{ k: 'stat', n: '26%', l: 'aliquota su plusvalenze azionarie' }` | un numero chiave |
| vs | `{ k: 'vs', a: ['Azioni', 'Proprietà dell’azienda'], b: ['Obbligazioni', 'Prestito all’azienda'] }` | confronto tra 2 cose |
| steps | `{ k: 'steps', s: ['Ordine', 'Book', 'Esecuzione', 'Regolamento'] }` | processo (3-5 passi) |
| bars | `{ k: 'bars', d: [['Anno 1', 100], ['Anno 10', 197]], u: '€' }` | 2-6 valori numerici (anche negativi) |
| pie | `{ k: 'pie', d: [['Bisogni', 50], ['Desideri', 30], ['Risparmio', 20]] }` | composizione: somma = 100 |
| formula | `{ k: 'formula', f: 'Rendimento reale ≈ nominale − inflazione', n: 'Es.: 5% − 2% = 3%' }` | formula + esempio (n opzionale) |
| icons | `{ k: 'icons', d: [['🏦', 'Banca'], ['📈', 'Borsa'], ['💼', 'Broker']] }` | 2-4 elementi con emoji |
| scale | `{ k: 'scale', a: 'Rischio basso', b: 'Rischio alto', d: [['Conto deposito', 8], ['BTP', 30], ['ETF azionario', 70]] }` | posizioni 0-100 su uno spettro (2-5 voci) |

## Regole di qualità (importanti)

1. **Correttezza prima di tutto.** Niente dati inventati spacciati per precisi. Numeri storici solo se noti e
   arrotondati ("circa", "storicamente"). Nessun dato legato a una data recente (tassi attuali, prezzi attuali).
2. **Non è consulenza.** Mai "compra X". Insegna principi, rischi, costi, trade-off.
3. **Fisco italiano** (se citato): plusvalenze 26%; titoli di Stato italiani e white list 12,5%;
   imposta di bollo 0,2% annuo sul dossier titoli; conto deposito bollo 0,2%; conto corrente 34,20 € sopra 5.000 € di giacenza media.
   Per le cripto scrivi che hanno un'aliquota specifica che cambia con le leggi di bilancio, senza dare un numero.
4. **Opzioni di risposta plausibili e di lunghezza simile**: la risposta giusta non deve essere riconoscibile perché più lunga.
   Niente "tutte le precedenti", niente doppie negazioni.
5. **Tutte diverse**: nessun duplicato fra termini, risposte errate uguali alla corretta, elementi di cat ripetuti.
6. **Varietà**: i 10 tf, 8 mcq e 4 scen devono coprire tutto l’argomento del livello, non ripetere la stessa idea.
   Includi almeno 2 tf o mcq su **errori comuni / miti** (servono alla tappa "Errori comuni").
7. Le `scen` sono decisioni realistiche di una persona (nomi italiani vari, età e situazioni diverse).
   L’opzione giusta è la più prudente/razionale, ma non sempre la più ovvia; i feedback insegnano qualcosa.
8. Usa `’` (apostrofo tipografico) oppure `'` dentro stringhe delimitate da apici: se usi `'` come delimitatore,
   l’apostrofo nel testo deve essere `’` oppure escapato `\'`. Consiglio: usa sempre `’` nel testo.
9. Difficoltà coerente con il livello (1 = principiante assoluto, 100 = esperto). Livelli alti: termini tecnici, casi sfumati.
10. Niente HTML nelle stringhe. Emoji solo nei visual `icons`.

Validazione: `node finquest/tools/validate.js` (oppure con un id: `node finquest/tools/validate.js 7`).
