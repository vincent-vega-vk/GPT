# Procedura di aggiornamento contenuti (per un agente o per una persona)

Obiettivo: tenere Quota Quest allineato alle informazioni SAP più recenti **senza inventare nulla**.
Frequenza consigliata: settimanale, e subito dopo gli eventi che cambiano molti dati (risultati trimestrali, Sapphire, TechEd, annunci di prodotto, scadenze normative).

## 0. Prima di toccare qualsiasi cosa
1. `git pull` e leggi `sap-quest/CONTENT_GUIDE.md` (schema, regole sui fatti e sulle fonti).
2. `python3 sap-quest/tools/build.py` poi `python3 sap-quest/tools/stale_report.py --within 21` per l'elenco dei fatti scaduti o in scadenza e di quante domande li usano.

## 1. Riverifica dei fatti (cuore dell'aggiornamento)
Per ogni fatto nell'elenco:
1. Cerca il valore attuale con `WebSearch` (fonte ufficiale SAP o ente per prima; incrocia almeno 2 fonti per numeri, date e nomi). I domini SAP spesso non sono raggiungibili con `WebFetch`: lavora sugli snippet.
2. Aggiorna in `sap-quest/data/facts/*.json`: `value`, `asOf` (data a cui si riferisce il dato), `checked` (oggi), `staleAfter` (prossimo evento che lo cambia, oppure checked + 90 giorni per dati rapidi / 180 per dati lenti), `source` (URL reale visto nei risultati), `confidence` (`primary` solo se fonte ufficiale), `note` se serve.
3. Se il valore non si riesce a verificare: **non** spostare `staleAfter` in avanti. Lascia il fatto scaduto (il gioco lo segnala) oppure abbassa `confidence` e spiega in `note`.
4. Se il cambiamento è **semantico** (un prodotto rinominato o ritirato, una scadenza spostata, un'offerta cambiata), guarda `sap-quest/data/facts-index.json` per sapere quali domande e lezioni usano quel fatto e riscrivi quelle che non sono più vere. Una domanda corretta con il vecchio valore ma sbagliata con il nuovo è un bug.

## 2. Cose nuove che il gioco non sa ancora
Cerca novità dall'ultimo aggiornamento (usa `sap-quest/data/news.json` come spunto): risultati trimestrali, acquisizioni, annunci Joule/Business Data Cloud/RISE/GROW, cambi di naming, date normative italiane/UE rilevanti per Life Sciences e Consumer Products.
- Aggiungi **pochi** fatti e modifica **pochi** livelli: solo ciò che è importante per un AE e verificato.
- Non cambiare il numero di livelli per mondo senza aggiornare `data/curriculum.json`.

## 3. Controlli prima di pubblicare
```
python3 sap-quest/tools/validate.py      # 0 errori
node sap-quest/tools/test_engine.js      # tutti ok
python3 sap-quest/tools/build.py         # rigenera data/bundle.js e facts-index.json
```
Poi commit con messaggio del tipo `content: riverifica fatti (Q3 2026, Joule, ECC)` e push sul branch di lavoro. Non aprire PR se non richiesto.

## Regole che non si negoziano
- Mai inventare numeri, date, nomi, URL. Mai prezzi di listino, sconti, quote o policy interne SAP: solo informazioni pubbliche.
- Nessun fatto `primary` senza fonte ufficiale realmente consultata.
- Non attribuire a clienti reali scelte tecnologiche.
- Se qualcosa non torna, lascia una nota in `note` e segnalalo nel riepilogo finale invece di forzare un valore.

## Riepilogo finale (max 200 parole)
Fatti aggiornati (chiave, vecchio → nuovo), domande/lezioni riscritte, fatti rimasti scaduti e perché, nuove aggiunte, esito di validazione e test.
