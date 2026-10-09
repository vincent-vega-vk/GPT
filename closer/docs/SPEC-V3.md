# CLOSER · SPEC v3 · i casi reali

Si aggiunge a `SPEC-V2.md` (che resta valida per scene, scelte, imprevisti, shock, forecast, widget, viewport) e a `REALISM.md` (l'asticella di realismo). Qui sono solo le novità del contratto dati e del motore.

## 1. Famiglie, tier, etichette

Ogni scenario ha:

```js
CL.registerScenario({
  id: 'falco-trasporti',          // unico, kebab-case
  family: 'logistica',            // una delle otto famiglie (farmavita, brenta, terrasole, asl, lumina, bionova, logistica, meridiana)
  tier: 'real',                   // 'real' = caso da campo (carriera e allenamento); 'guided' = caso didattico (allenamento; in carriera solo se la famiglia non ha casi reali)
  label: 'Falco Trasporti · piattaforma di tracking',   // nome NEUTRO mostrato prima del verdetto
  teaser: 'Gruppo logistico di Brescia: tracking in tempo reale su 600 mezzi. Il CRM dice Commit.',   // come lo descrive il CRM: neutro, ottimista, senza svelare nulla
  title: 'La firma che dipende dall’assicuratore',          // titolo didattico: compare SOLO nel debrief
  client, sector, hook, brief, scout, teaches, list, cost, window, stars, lep, slip, crm, cast, start, caps, ...   // come in v2
});
```

Ogni trimestre di carriera sorteggia **una trattativa per famiglia** tra i casi `real` della famiglia, preferendo quello visto meno di recente. `label` e `teaser` non devono mai rivelare la trappola né il mondo nascosto; `hook` e `title` (che la rivelano) si vedono solo nel debrief.

## 2. Mondi nascosti

```js
worlds: [
  { id: 'cassa', w: 1, note: 'Il vero blocco è la cassa: l’azienda aspetta un finanziamento.', flags: { h_cassa: true }, mods: { u: -6 } },
  { id: 'cugino', w: 1, note: 'La direttrice non decide: decide il cugino del titolare, socio di minoranza.', flags: { h_cugino: true } },
],
```

- A ogni partita il motore sceglie un mondo (evitando l'ultimo giocato di quel caso) e imposta `d.world` e i flag `h_*` indicati. `mods` sposta i meter di partenza (`t v u c r`).
- **I flag `h_*` sono la verità nascosta.** Non si mostrano mai direttamente e non alimentano widget, cartelli o testi prima che il giocatore abbia modo di saperlo. Il giocatore *scopre* con le scelte: i flag di scoperta (`k_*`, "known") si impostano con `set` quando una mossa fa emergere un fatto, ed è da quelli (e solo da quelli) che dipendono widget e forecast (`has(d)`).
- Le scene dipendono dal mondo in modo **indiziario**: le stesse parole del cliente hanno sfumature diverse nei due mondi (un silenzio, un'esitazione, una risposta a un'altra domanda), mai un cartello. C'è anche rumore uguale in entrambi i mondi.
- **Il mondo cambia la mossa giusta.** `q`, `fx`, `mp`, `mpx`, `set`, `integ`, `next` possono essere funzioni di `d`: `q: (d) => (d.flags.h_cassa ? 3 : 1)`, `fx: (d) => (d.flags.h_cugino ? { t: 8, c: 6 } : { t: 2 })`, ecc. `q` è la valutazione che compare nel debrief e nei test; **la probabilità di chiusura dipende solo da fx, mp, set, d, l**: se vuoi che un mondo renda sbagliata una mossa, devi cambiare anche gli effetti, non solo la `q`.
- Test: `node tests/worldcheck.mjs <id>` gioca il percorso migliore di un mondo negli altri; il rimpianto minimo deve essere ≥ 12 punti e i percorsi migliori non possono coincidere.
- Funzioni di `d`: leggono solo `d.flags`, `d.mp`, `d.m`, `d.disc`, `d.hist`, `d.world`, `d.node`. Mai effetti collaterali.
- I wild e gli shock dello scenario possono dipendere dal mondo (`if: (d) => d.flags.h_cugino`); i generici no.

## 3. Alea nelle reazioni (fortuna)

Dopo una mossa, con probabilità ~8–20% (più alta per le mosse a rischio, più bassa se la fiducia è alta) il mondo reagisce in modo imprevisto: una battuta di fortuna o sfortuna (±3–5 su un meter) si aggiunge alla reazione. Una scelta può dichiarare `var: 0` (prudente), `1` (default) o `2` (a rischio). Lo scenario può sostituire le frasi con `luck: { good: [{ t, fx }], bad: [{ t, fx }] }` (le frasi generiche sono in `CL.LUCK`). Spenta con "Imprevisti: no".

## 4. Allenatore a fine trattativa

In carriera il commento (qualità, lettura, lezione) non compare dopo ogni mossa ma nel debrief (impostazione "Allenatore a ogni mossa" per riaverlo). Durante la trattativa si capisce com'è andata dai fatti: reazioni, meter, cosa succede nei nodi dopo. Quindi **`r` e `tip` si scrivono per il debrief**: spiegano cosa è successo nel mondo, perché la mossa valeva *in quel mondo*, cosa avrebbe cambiato l'altro. Possono dipendere da `d.world` (`r: (d) => d.flags.h_cassa ? '…' : '…'`). `react` (la reazione immediata) invece è ciò che il giocatore vede subito: non applaude e non boccia.

## 5. File e test

- Un caso per file: `src/js/60-sc-<id>.js` (il prefisso `60-` è obbligatorio, i test caricano `^(00|[1-3]\d|60)-`). Il file va elencato in `src/index.html` (il build salta quelli mancanti).
- `node tests/validate.mjs` (per mondo: percorso migliore, peggiore, casuale), `node tests/validate-banks.mjs --strict`, `node tests/lengthbias.mjs <id>` (per mondo), `node tests/worldcheck.mjs <id>`, `node tests/play-cli.mjs` (gioco alla cieca da terminale: `new`, `pick`, `show`, `hint`, `list`), `node tests/simulate.mjs`.
- Calibrazione per ogni mondo: percorso migliore (con jolly) ≥ 85%, senza jolly ≥ 78%, peggiore ≤ 10%, scelte casuali ≤ 18%, solo mosse "q≥2 secondo il manuale" ≤ 75% in almeno un mondo (se il manuale basta, il caso è scontato).
- Struttura dei nodi: 7–9 nodi, con almeno due percorsi diversi e almeno un nodo che compare solo in uno dei mondi o dopo certe scelte (`next: (d) => …`). Le scelte di ogni nodo sono 3–5 e variano di numero tra i nodi; qualche opzione compare solo se `if(d)` (ciò che hai scoperto o fatto).

## 6. Cosa resta uguale

Tutto il resto di SPEC-V2 (theme, intro, hud, wild, shocks, fc, endings, lessons, noWild/noShock, fc.skipGaps, e le regole di forma di `lengthbias`).
