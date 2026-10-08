# Quota Quest

Gioco in stile Duolingo per imparare SAP, pensato per un **Account Executive SAP in Italia** (focus Life Sciences e Consumer Products).
Percorso a mondi e livelli, assessment adattivo iniziale, esercizi di 7 tipi, ripasso dilazionato, streak/XP/badge e una sezione **Novità** con lo stato di aggiornamento dei contenuti.

> Progetto non ufficiale, non affiliato né approvato da SAP SE. I marchi citati appartengono ai rispettivi proprietari.
> Solo informazioni pubbliche: per prezzi, sconti e policy fai sempre riferimento ai canali interni ufficiali.

## Giocare
- Apri `index.html` in un browser (funziona anche da file locale: i dati sono in `data/bundle.js`), oppure `python3 -m http.server -d sap-quest` e vai su <http://localhost:8000>.
- Con GitHub Pages attivo il gioco si pubblica da solo (vedi sotto).
- Il progresso è salvato nel browser (`localStorage`). Dal Profilo puoi esportare/importare un codice di backup. Dentro Claude (Artifact) viene salvato anche sul tuo profilo e sincronizzato tra dispositivi.

## Come restano aggiornate le informazioni
Il principio: **ogni dato che invecchia è un "fatto"**, non testo sparso nelle domande.

| Meccanismo | Cosa fa | Dove |
|---|---|---|
| **Fatti con data, fonte, affidabilità** | Numeri, date, nomi commerciali, eventi vivono in `data/facts/*.json`; le domande usano `{{chiave}}`. Aggiorni un fatto una volta e cambia in tutte le domande. | `data/facts/`, `CONTENT_GUIDE.md` |
| **Scadenza esplicita** | Ogni fatto ha `staleAfter`. Dopo quella data il gioco lo mostra come "da riverificare" nelle spiegazioni e nella scheda Novità. | `assets/engine.js` (`factStatus`) |
| **Indice d'impatto** | `data/facts-index.json` dice quali domande/lezioni usano ogni fatto: serve per riscrivere quelle che non sono più vere. | `tools/build.py` |
| **Notizie quotidiane** | Un job giornaliero scarica SAP News Center e una rassegna stampa e aggiorna `data/news.json`. | `tools/fetch_news.py`, workflow `quota-quest.yml` |
| **Issue sui fatti scaduti** | Lo stesso job apre/aggiorna una issue con i fatti scaduti o in scadenza entro 14 giorni. | `tools/stale_report.py` |
| **Riverifica assistita** | Procedura per un agente o una persona: cerca i valori attuali, aggiorna i fatti, riscrive le domande impattate, valida. | `tools/REFRESH_PROMPT.md` |

Limite onesto: i job automatici scaricano notizie e **segnalano** cosa è scaduto, ma la **riverifica dei contenuti** richiede un agente o una persona (e fonti ufficiali). Senza quel passaggio i fatti scadono e il gioco lo dice, non li aggiorna da solo.

Le date a partire dalle quali un fatto è sospetto sono scelte dagli autori: prossimo evento che lo cambia (es. i risultati Q3 del 21 ottobre 2026) oppure 90/180 giorni.

## Struttura
```
index.html                 pagina del gioco
assets/engine.js           logica pura (esercizi, sessioni, SRS, assessment, streak, badge) - testata in Node
assets/app.js              interfaccia
assets/style.css           stile (tema chiaro/scuro)
data/curriculum.json       mondi, titoli, numero di livelli, ambito di ogni mondo
data/worlds/*.json         livelli: lezione lampo + esercizi
data/assessment/*.json     pool di domande per l'assessment (6 per mondo: 2 facili, 2 medie, 2 difficili)
data/facts/*.json          fatti con data, fonte, affidabilità, scadenza
data/news.json             notizie (generato)
data/bundle.js             tutto il contenuto in un file (generato da tools/build.py)
tools/validate.py          validatore di schema e qualità
tools/build.py             genera bundle, indice fatti, sito (--dist) e pagina unica per Artifact (--artifact)
tools/test_engine.js       test del motore
CONTENT_GUIDE.md           contratto per chi scrive i contenuti
```

## Comandi
```bash
python3 tools/validate.py            # valida contenuti (0 errori richiesti)
node tools/test_engine.js            # test del motore
python3 tools/build.py               # rigenera data/bundle.js e data/facts-index.json
python3 tools/stale_report.py        # fatti scaduti o in scadenza
python3 tools/fetch_news.py          # scarica le notizie
python3 tools/build.py --dist _site  # sito statico pronto da pubblicare
```

## Automazioni GitHub (`.github/workflows/quota-quest.yml`)
- **Pull request**: validazione contenuti, test del motore, controllo che `data/bundle.js` sia aggiornato.
- **Ogni giorno 05:30 UTC**: notizie, rebuild, report fatti scaduti → commit e issue.
- **Push su main / manuale**: pubblicazione su GitHub Pages.

Requisiti: i workflow schedulati partono solo dal branch predefinito (quindi dopo il merge su `main`); per Pages serve *Settings → Pages → Source: GitHub Actions* (su repo privati dipende dal piano GitHub).

## Cosa non fa
- Non conosce prezzi, sconti, quote o policy interne di SAP.
- Non sostituisce SAP Learning, il Sales University o i canali interni.
- L'assessment è una stima (2 domande per area): serve a scegliere da dove partire, non a certificare competenze.
