# FinQuest

Gioco in stile Duolingo per imparare come funzionano i mercati finanziari e come muoversi al loro interno.
**100 livelli × 20 tappe = 2.000 tappe**, divisi in 10 unità, dal budget personale ai derivati.

## Come si gioca

Apri `dist/finquest.html` nel browser: è un file unico e funziona anche offline.
Per lo sviluppo apri `index.html`, che carica i file separati.

- **Punto di partenza a scelta:** Principiante (L1), Base (L11), Intermedio (L31), Avanzato (L61), Esperto (L81),
  oppure un **test di posizionamento** adattivo che si ferma quando trova il tuo livello.
- **Test di salto:** da ogni unità bloccata puoi sbloccarla rispondendo bene a 10 domande su 12.
- **Meccaniche di gioco:** XP, serie di giorni con congela-serie, vite che si ricaricano, monete, missioni giornaliere,
  27 medaglie, obiettivo giornaliero. La modalità relax rende le vite illimitate.
- **Ripasso:** gli errori vengono riproposti a fine tappa e raccolti in "Ripasso errori".

## Le 20 tappe di ogni livello

| # | Tappa | Contenuto |
|---|---|---|
| 1 | Introduzione | schede infografiche + prime domande |
| 2 | Parole chiave | abbinamenti termine/definizione |
| 3 | Approfondimento | altre schede + quiz |
| 4 | Vero o falso | 7 affermazioni |
| 5 | Numeri in gioco | calcoli finanziari a scelta multipla |
| 6 | Leggi il grafico | grafici generati (candele, trend, RSI…) |
| 7 | Mettiti alla prova | mix di tutti i tipi |
| 8 | Situazione reale | decisioni in casi concreti |
| 9 | Completa la frase | frasi con parola mancante |
| 10 | Checkpoint | prova mista + forziere di monete |
| 11 | Infografica | ultime schede + classificazione |
| 12 | Classifica e ordina | ordinamenti e categorie |
| 13 | Calcolo avanzato | calcoli con risposta libera |
| 14 | Analisi grafica | grafici più difficili, anche dei livelli precedenti |
| 15 | Decisione d’investimento | situazioni + simulazione |
| 16 | Sfida a tempo | 75 secondi, senza perdere vite |
| 17 | Errori comuni | miti da smontare |
| 18 | Simulazione di mercato | sala trading, portafoglio, budget o laboratorio |
| 19 | Ripasso totale | livello attuale + precedente |
| 20 | Esame del livello | 12 domande, serve il 75% |

## Tipi di esercizio

Schede infografiche (8 tipi di visual), scelta multipla, vero/falso, abbinamenti, completamento, ordinamento,
classificazione, situazioni con feedback per ogni scelta, calcoli con inserimento libero, lettura di grafici
(19 generatori: trend, candele giapponesi, supporti/resistenze, medie mobili, RSI, volumi, drawdown,
curva dei rendimenti, payoff delle opzioni, ciclo economico…) e 4 simulazioni interattive:

- **Sala trading:** compri e vendi giorno per giorno con stop loss e commissioni; la missione premia il controllo del rischio, non la fortuna.
- **Costruisci il portafoglio:** allocazione azioni/obbligazioni/liquidità per un profilo di investitore.
- **Gestisci lo stipendio:** budget con spese essenziali e obiettivo di risparmio.
- **Laboratorio:** interesse composto, inflazione e impatto dei costi, con grafico in tempo reale.

I numeri di calcoli, grafici e simulazioni sono generati a caso a ogni partita (67 formule finanziarie), quindi le tappe si possono rigiocare.

## Struttura

```
finquest/
  index.html            versione di sviluppo
  dist/finquest.html    versione in un unico file (generata)
  css/style.css
  js/util.js            RNG, formattazione italiana, helper DOM
  js/curriculum.js      10 unità, 100 livelli, 20 tappe
  js/charts.js          grafici SVG + generatori di domande sui grafici
  js/calc.js            generatori di esercizi di calcolo
  js/sims.js            simulazioni interattive
  js/engine.js          costruzione delle sessioni di ogni tappa
  js/app.js             interfaccia, progressi, ricompense
  js/content.js         contenuti uniti (generato)
  content/LNNN.js       contenuti testuali di ogni livello
  CONTENT_GUIDE.md      formato e regole per scrivere i contenuti
  tools/                validazione, build e test
```

## Comandi

```bash
node finquest/tools/validate.js      # controlla i contenuti (conteggi, opzioni, formato)
node finquest/tools/build.js         # rigenera js/content.js e dist/finquest.html
node finquest/tools/selftest.js      # stress test di tutti i generatori e di 6.000 sessioni
node finquest/tools/uitest.js DIR    # test end-to-end con Playwright e screenshot in DIR
```

## Progressi

I progressi restano nel browser (localStorage). Dal profilo puoi copiare un codice di salvataggio e importarlo su un altro dispositivo.
Pubblicato come Artifact su claude.ai, il gioco sincronizza anche i progressi nel tuo account, se puoi scrivere sull’artifact.

FinQuest è un gioco didattico: non è consulenza finanziaria. Grafici e prezzi sono simulati.
