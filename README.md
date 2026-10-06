# ⚽ SUPER RIGORI — Coppa del Mondo

Una Coppa del Mondo giocata **solo ai calci di rigore**: 32 nazionali, 8 gironi, ottavi, quarti, semifinali, finalina e **finale**, con fisica realistica del pallone e delle parate e l'impostazione scenografica degli anime sportivi anni '80 (primi piani degli occhi, linee cinetiche, tiri e parate speciali con tanto di nome della mossa, onomatopee, rallenty e ripetizioni).

Funziona nel browser, senza installare nulla e senza dipendenze: **apri `dist/super-rigori.html`** (file singolo) oppure `index.html` (versione di sviluppo). Va bene anche su telefono, in orizzontale.

---

## Come si gioca

### Quando CALCI
1. **Mira** con il mouse (o trascinando il dito, o con le frecce). Il mirino *trema* tanto più quanto il rigore è decisivo; l'anello tratteggiato mostra quanto si disperderà il tiro.
2. Premi **TIRA** (`Spazio` / clic): parte la barra di potenza. Premi di nuovo per fermarla.
3. Nella **zona verde** il tiro è pulito. Troppa potenza = tiro sporco, troppo poca = parabile.
4. **Effetto**: `Q` / `E` (o i pulsanti ↶ ↷) fanno curvare il pallone (effetto Magnus reale).

### Quando PARI
- **Clicca o tocca** il punto della porta dove vuoi tuffarti, oppure usa la griglia 3×3 `Q W E / A S D / Z X C` (anche le frecce).
- Puoi **anticipare** il rigorista, ma lui può leggerti e calciare dall'altra parte.
- Dopo il calcio il tempo rallenta (più o meno a seconda della difficoltà) per farti leggere la traiettoria.
- Il portiere ha una portata fisica reale: gli angoli alti calciati forte sono quasi imparabili… senza una SUPER PARATA.

### ⚡ Tiri e parate SPECIALI
Ogni squadra ha **1 SUPER TIRO** e **1 SUPER PARATA** a partita (+1 ciascuno all'oltranza).
- **Super tiro**: premi `⚡ SUPER` (`F`) prima di tirare e ferma la barra nella zona dorata. 10 mosse diverse (Tiro del Drago, Cometa Infuocata, Fulmine Sonico, Tornado Selvaggio, Meteora d'Argento, Artiglio Scarlatto, Raggio Boomerang, Cannone Aureo, Tiro Fantasma, Supernova), ognuna con scia e fisica proprie.
- **Super parata**: attivala prima di tuffarti per avere portata e velocità sovrumane.
- Se si scontrano, il tiro può **sfondare le mani** del portiere.

### Tasti
| Azione | Tasto |
|---|---|
| Mira | mouse / frecce / WASD |
| Tira / blocca la potenza | `Spazio`, `Invio` o clic |
| Effetto sinistra / destra | `Q` / `E` |
| Super (tiro o parata) | `F` |
| Tuffo (portiere) | clic/tocco sulla porta, `Q W E A S D Z X C`, frecce |
| Pausa | `Esc` |
| Audio | `M` |

---

## Il torneo

- **32 squadre** estratte in 8 gironi da 4 (4 fasce di forza; max 2 UEFA e 1 per le altre confederazioni per girone).
- **Gironi**: ogni partita è una serie di 5 rigori a testa (si battono sempre tutti). Vittoria **3 punti**, pareggio **1**. Classifica: punti, differenza reti, gol fatti, scontri diretti, sorteggio. Passano le prime due.
- **Fase a eliminazione diretta**: tabellone identico a quello di Qatar 2022 (1A-2B, 1C-2D, 1B-2A, 1D-2C, 1E-2F, 1G-2H, 1F-2E, 1H-2G…), finale per il 3º posto e **finalissima**.
- **Regolamento dei rigori** (IFAB): tiri alternati, sorteggio di chi comincia, **terminazione anticipata** quando una squadra non può più essere raggiunta, poi **oltranza** a coppie di tiri.
- La finale ha una messa in scena dedicata: Coppa sul campo, pubblico in delirio, intro con i primi piani prima di ogni tiro e ripetizioni.
- Il torneo viene **salvato automaticamente** (`localStorage`); la partita in corso, se abbandonata, si rigioca.
- 4 difficoltà: Facile, Normale, Difficile, Leggenda.

Nomi dei giocatori e rose sono di fantasia. Il progetto è un omaggio allo stile degli anime sportivi classici, non è affiliato a FIFA né ad alcuna serie.

---

## Sotto il cofano

Tutto in JavaScript puro e Canvas 2D: un piccolo motore 3D scritto a mano (prospettiva, clipping, ordinamento per profondità), nessuna libreria, nessun asset esterno (audio incluso: è sintetizzato con WebAudio).

```
src/
  math.js        vettori, matrici, RNG deterministico
  data.js        32 squadre, bandiere vettoriali, rose di fantasia, 10 tiri speciali
  shootout.js    regolamento dei rigori (terminazione anticipata, oltranza, pressione)
  tournament.js  gironi, spareggi, tabellone Qatar 2022, simulazione delle altre partite
  rig.js         scheletro umano con IK a due ossa (disegno + collisioni)
  keeper.js      portiere: attesa, tuffo con portata limitata, capsule di collisione
  kicker.js      rincorsa a passi pianificati, colpo, esultanza/sconforto
  physics.js     pallone: resistenza, Magnus, rimbalzi con attrito, pali, rete elastica, parate
  ai.js          rigoristi e portieri AI (errore di esecuzione, lettura, guess)
  camera.js      camera prospettica con clipping
  stadium.js     tribune panoramiche, prato, linee, cartelloni LED, porta e rete
  characters.js  pallone (icosaedro troncato che ruota) e personaggi cel-shaded
  scene.js       compositore di scena
  fx.js          linee cinetiche, onomatopee, occhi, intro speciali, scie, particelle
  audio.js       effetti sonori sintetizzati
  hud.js         tabellone, barra di potenza, pulsanti
  match.js       controller di partita: stati, input, camera, replay
  screens.js     menu, scelta squadra, gironi, tabellone, risultati, finale
  main.js        avvio, ciclo di gioco, flusso del torneo, salvataggio
```

**Fisica** (`physics.js`, passo fisso 1/480 s, deterministica, quindi riproducibile nelle ripetizioni): gravità, resistenza quadratica, forza di Magnus con coefficiente di portanza empirico, rimbalzo con attrito di Coulomb e scambio con lo spin, rotolamento, pali e traversa come cilindri da 12 cm, rete a onde elastiche con isteresi, mani guantate/braccia/busto/gambe del portiere come capsule con velocità (parata, deviazione, presa). Il tiro viene risolto numericamente: dato il punto mirato, spin e potenza, si ricava la velocità iniziale con cui la traiettoria reale lo attraversa.

**Calibrazione**: `tests/calib.js` simula migliaia di rigori AI contro AI con la fisica vera (obiettivo ~75–85% di gol, parate 8–14%, qualche palo/fuori).

### Sviluppo
```bash
npm test          # regolamento + torneo + fisica + fuzz (~10 s)
npm run calib     # calibrazione statistica AI vs AI
npm run build     # genera dist/super-rigori.html (file singolo)
npm start         # server locale su http://localhost:8080 (opzionale)
```
`tools/*.js` contiene gli script Playwright usati per il collaudo visivo (partita giocata via script, torneo completo accelerato, prestazioni su telefono, fogli di contatto di pose ed effetti).
