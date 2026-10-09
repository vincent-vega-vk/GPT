# Engine militare stile Diplomacy — specifica

Questo documento è il contratto tra i moduli. Ogni modulo deve rispettarlo alla lettera.
Lingua dei testi a schermo: italiano. Codice: JavaScript ES2020 senza dipendenze, eseguibile sia nel browser sia in Node (pattern `(function(root){...})(globalThis)` già usato in `js/*.js`).

## 1. Mappa

Fonte: `js/provinces.js` (generato da `tools/build_provinces.js`).

- `GEO.PROVINCES[id]` con `id = "<NAZ>.<indice regione>"`, ad esempio `ITA.0`.
  Campi: `id, nation, idx, name, lon, lat, seas[] (id mari), coastal (bool), adj[] (province terrestri confinanti), corridors[] (province raggiungibili via corridoio attraverso un paese non giocabile), corridorVia{}, sc (centro di rifornimento), capital`.
- `GEO.SEAS[id]` con `id = "S.<SIGLA>"`, ad esempio `S.CMD`. Campi: `id, name, lon, lat, adj[] (mari confinanti), coasts[] (province costiere)`.
- `GEO.LAND_NEIGHBORS[NAZ]` = nazioni confinanti via terra o corridoio, derivate dal grafo.
- Una provincia corrisponde a `s.nations[nation].regions[idx]`; il controllore è `region.controller || nation`.

Movimenti ammessi:
- **Esercito (A)**: da provincia a provincia in `adj ∪ corridors`. Non entra mai in mare. Può attraversare il mare solo con un convoglio.
- **Flotta (F)**: da un mare ai mari in `adj` e alle province costiere in `coasts`; da una provincia costiera ai suoi `seas` e alle province costiere in `adj` con cui condivide almeno un mare. Non entra in province interne.
- **Province irradiate** (`region.irradiatedUntil > s.turn`): nessuna unità può entrarci o supportare un movimento verso di esse; le unità già presenti vengono distrutte dall'attacco nucleare.

## 2. Unità

`s.units = [{ id, owner, type: 'A'|'F', loc, suppressed?: bool }]`, `s.unitSeq` contatore. **Una sola unità per provincia o mare**, come in Diplomacy.

Capacità (ricalcolate a ogni turno):
- eserciti: `clamp(round(n.army / 15), 1, 8)`;
- flotte: `clamp(round(n.navy / 20), 0, 6)` se la nazione ha almeno una provincia costiera, altrimenti 0;
- stormi aerei (non sulla mappa, solo ordini): `clamp(round(n.air / 25), 0, 4)`.

Perdite: un esercito distrutto toglie 7 punti a `n.army`, una flotta 10 a `n.navy`. Così la capacità scende e l'unità torna solo quando il bilancio militare la ricostruisce.

## 3. Ordini (uno per unità)

```js
{ unit: id, type: 'hold' }
{ unit: id, type: 'move', to: provId }                 // esercito non adiacente => via convoglio se esiste una catena di flotte che convogliano
{ unit: id, type: 'support', target: provId, to?: provId } // to assente o === target: supporto al mantenimento; altrimenti supporto al movimento target -> to
{ unit: id, type: 'convoy', from: provId, to: provId }  // solo flotte in mare
```

Ordini aerei (per nazione, max = stormi): `{ owner, type: 'air', mode: 'support'|'cover', unit?: unitId, prov?: provId }`.
- `support`: +1 alla forza dell'unità indicata (attacco o difesa), se la sua posizione o la sua destinazione è entro 2 passi del grafo (terra o mare) da una provincia controllata dalla nazione o da un alleato.
- `cover`: annulla un supporto aereo nemico che riguarda un'unità posizionata in `prov` o che attacca `prov`.

Ordini preliminari (risolti prima dei movimenti, già esistenti nel motore):
- `strike` `{ type:'strike', target: nazione, prov?: provId, count }`: i colpi a segno si calcolano come oggi. Se `prov` contiene un'unità nemica: con ≥ 10 colpi l'unità è **soppressa** (il suo supporto è tagliato e non riceve supporto aereo in questo turno); con ≥ 40 colpi è **distrutta**.
- `nuke` `{ type:'nuke', target, prov?, count }`: distrugge ogni unità nella provincia colpita e la irradia per 5 turni.

## 4. Validità

Un ordine non valido diventa `hold` e genera l'evento `invalid` con il motivo in italiano.

- Movimento verso provincia terrestre: ammesso se il controllore è la nazione stessa, un nemico in guerra, oppure un alleato (trattato di difesa o blocco difensivo comune: *accesso militare*). Vietato verso nazioni neutrali.
- Supporto a un movimento verso una provincia controllata o occupata da una nazione X: il supportante deve essere in guerra con X, oppure X è lui stesso o un alleato (provincia vuota amica).
- Il supportante deve poter raggiungere la provincia di destinazione del supporto con un movimento proprio (senza convoglio).
- Convoglio: la flotta deve essere in mare, l'esercito convogliato in una provincia costiera, la destinazione costiera.

## 5. Aggiudicazione

Regole di Diplomacy (edizione 2000, compatibili con i casi base del DATC):

- Forza d'attacco = 1 + supporti validi non tagliati + supporti aerei non annullati.
- Forza di tenuta = 1 + supporti al mantenimento validi (se l'unità non si muove; un'unità che si muove e fallisce difende con forza 1).
- Forza di contesa (prevent) = forza dei movimenti concorrenti verso la stessa provincia.
- Un movimento riesce se la sua forza supera la forza di tenuta del bersaglio e ogni forza concorrente. **Pareggio = stallo**: nessuno entra.
- Il supporto è tagliato da qualunque attacco alla provincia del supportante, tranne quello proveniente dalla provincia verso cui è diretto il supporto; un supportante sloggiato perde comunque il supporto.
- Scontro frontale (A→B e B→A): vince la forza maggiore, il perdente è sloggiato; in pareggio entrambi restano.
- Un'unità non può sloggiare un'unità **amica** (stessa nazione, o nazione con cui non è in guerra). I supporti di una nazione non contano per sloggiare una sua unità o di un suo alleato.
- Movimenti circolari (A→B, B→C, C→A) riescono tutti se nessuno è ostacolato.
- Convoglio: fallisce se una flotta della catena viene sloggiata. Un esercito convogliato non taglia il supporto di unità che attaccano una flotta del proprio convoglio. Paradossi: regola di Szykman (il convoglio paradossale non avviene).
- **Capitale**: una capitale vuota il cui proprietario è in guerra ha una guarnigione implicita di forza 1 (2 se il proprietario ha la Guardia pretoriana o la visione Fortezza). Un'unità del proprietario che tiene la propria capitale ha +1 di tenuta.
- **Visione Fortezza**: +1 di tenuta alle unità del proprietario nelle province di casa.
- Il combattimento è **deterministico**: nessun dado.

Funzione pura (testabile senza stato di gioco):

```js
GEO.military.adjudicate(units, orders, ctx) -> { results, dislodged, moves, events }
// units: [{id, owner, type, loc, suppressed?}]
// orders: { [unitId]: order }  (gli ordini mancanti valgono hold)
// ctx: {
//   graph: { node(id) -> {kind:'land'|'coast'|'sea', armyAdj:[], fleetAdj:[]} },
//   atWar(a, b) -> bool, friendly(a, b) -> bool (true se stessa nazione o non in guerra),
//   canEnter(owner, provId) -> bool, holdBonus(unit) -> int, attackBonus(unit, to) -> int,
//   airBonus: { [unitId]: int }, garrison(provId) -> { owner, strength } | null
// }
// results[unitId] = 'ok' | 'bounced' | 'cut' | 'dislodged' | 'void' | 'invalid'
// dislodged: [{ unitId, by: unitId|null, from: provId(attacker origin), loc }]
// moves: [{ unitId, from, to }]  (solo i movimenti riusciti)
```

`GEO.military.setMap(nodes)` sostituisce il grafo (per i test) e `GEO.military.resetMap()` torna a quello di `GEO.PROVINCES/SEAS`. `nodes = { id: { kind, armyAdj, fleetAdj } }`.

## 6. Turno militare

`GEO.military.resolveTurn(s, extraOrders)` è chiamata da `E.endTurn` dopo missili e testate. Passi:

1. Ordini: giocatore da `s.milOrders` (solo se governa), IA da `GEO.militaryAI.orders(s)`; i mancanti valgono hold. Ordini aerei da `s.airOrders` e dall'IA.
2. Accordi con il giocatore (`s.agreements`): l'IA che ha accettato decide se onorarli in base a lealtà e relazioni; dopo l'aggiudicazione, un accordo non rispettato genera l'evento `betrayal`, relazioni −30 e notizia.
3. Validazione, poi `adjudicate`.
4. Applicazione: le unità si spostano; le sloggiate si **ritirano** automaticamente verso una provincia adiacente libera, non contesa, non quella da cui è venuto l'attaccante, accessibile; preferendo il territorio proprio. Senza ritirata possibile sono distrutte.
5. Occupazione: un esercito che termina in una provincia terrestre controllata da un nemico ne prende il controllo (`region.controller = owner`); un esercito che torna in una propria provincia occupata la libera (`controller = null`). Le flotte non conquistano. Presa la capitale: `E.capitulate(s, perdente, vincitore)`.
6. Aggiustamenti (come l'inverno di Diplomacy, ma a ogni turno): se le unità sono meno della capacità si costruiscono al massimo 2 unità per turno nelle province di casa con centro di rifornimento, controllate e libere (flotte solo se costiere; se non ci sono porti liberi la flotta nasce in un mare adiacente libero). Se sono di più si sciolgono le più lontane dal fronte.
7. Salva `s.lastResolution = { turn, before: [unità prima], after: [unità dopo], orders: {...}, events: [...] }` per la riproduzione animata.

Eventi (ordinati per fase, ognuno con `phase` = `'strike'|'nuke'|'air'|'move'|'battle'|'retreat'|'capture'|'adjust'|'diplomacy'`):

```js
{ phase:'strike', type:'strike', from: nazione, prov, count, hits, suppressed?: unitId, destroyed?: unitId }
{ phase:'nuke', type:'nuke', from, prov, hits, destroyed: [unitId] }
{ phase:'air', type:'air', owner, mode, unit?, prov?, cancelled?: bool }
{ phase:'move', type:'move', unit, owner, utype, from, to, ok: bool, convoy?: [seaIds] }
{ phase:'move', type:'support', unit, owner, from, target, to, cut: bool }
{ phase:'move', type:'hold', unit, owner, at }
{ phase:'battle', type:'battle', at, attackers: [unitId], defender: unitId|null, winner: unitId|null, strengths: {unitId: n} }
{ phase:'battle', type:'bounce', unit, from, to }
{ phase:'retreat', type:'dislodge', unit, owner, at, by }
{ phase:'retreat', type:'retreat', unit, owner, from, to }
{ phase:'retreat', type:'destroy', unit, owner, at, reason }
{ phase:'capture', type:'capture', prov, from: vecchio controllore, to: nuovo controllore, capital: bool }
{ phase:'adjust', type:'build', unit, owner, utype, at }
{ phase:'adjust', type:'disband', unit, owner, at }
{ phase:'diplomacy', type:'betrayal', from, to, text }
{ phase:'*', type:'invalid', unit, owner, reason }
```

## 7. Integrazione con il motore

- `GEO.military.init(s)`: crea le unità iniziali. Eserciti nelle province di casa (capitale per prima, poi per quota di PIL). Gli eserciti in eccesso vanno in province vuote di alleati (presenza avanzata, per esempio USA in Polonia o Giappone). Flotte nei porti di casa liberi, poi in mari adiacenti liberi; schieramenti realistici preferiti quando possibili: USA `S.PHS, S.CMD, S.PGF, S.WAT, S.EPA`; Russia `S.BLK, S.BAL, S.BAR, S.OKH`; Cina `S.SCS, S.ECS, S.YEL`; Regno Unito `S.NTH, S.NAT`; Francia `S.WMD, S.ATE`; Giappone `S.SOJ`; India `S.ARS, S.BOB`; Italia `S.CMD` (se libero), Turchia `S.AEG`, Iran `S.PGF` (se libero, altrimenti `S.ARS`).
- `GEO.military.canReach(s, from, to)` sostituisce `E.canReach`: `{ok:true, mult:1}` se c'è contatto terrestre tra territori controllati; `{ok:true, mult:0.6, naval:true}` se `from` ha flotte e `to` ha province costiere; altrimenti `{ok:false}`.
- `GEO.military.onPeace(s, a, b)`: le unità di `a` in territorio di `b` (e viceversa) tornano nella provincia propria libera più vicina, oppure vengono sciolte.
- `GEO.military.onCapitulate(s, perdente, vincitore)`: gli eserciti del perdente fuori casa vengono sciolti; il resto si adegua alla capacità ridotta nel passo di aggiustamento.
- `GEO.military.unitsOf(s, nazione)`, `GEO.military.caps(s, nazione)`, `GEO.military.unitAt(s, provId)`, `GEO.military.legalMoves(s, unitId)` (destinazioni ammesse per l'interfaccia), `GEO.military.legalSupports(s, unitId)`, `GEO.military.provName(id)`, `GEO.military.provPos(id) -> [lon, lat]`.
- Insurrezione: una regione occupata senza un'unità dell'occupante al suo interno può liberarsi (probabilità esistente in `economyStep`).

## 8. Accordi in stile Diplomacy

`GEO.military.requestAgreement(s, from, to, kind, params) -> { ok, reason }` dove `from` è il giocatore e `to` un'IA.

- `support_move` `{ unitFrom: provId, to: provId }`: l'IA supporta con una sua unità adiacente il movimento del giocatore.
- `support_hold` `{ prov }`: l'IA supporta il mantenimento della provincia del giocatore.
- `dmz` `{ prov }`: l'IA si impegna a non entrare nella provincia.
- `access` `{}`: accesso militare per 8 turni (gli eserciti del giocatore possono entrare nel suo territorio).

L'IA accetta in base a relazioni, interessi (nemico comune) e personalità. A ogni turno decide se onorarlo con probabilità `0.55 + lealtà × 0.4 + (relazioni − 50) / 200`, limitata a [0,05; 0,98]. Gli accordi valgono un turno, tranne `access`.

## 9. IA militare (`js/military_ai.js`)

`GEO.militaryAI.orders(s) -> { orders: {unitId: order}, air: [ordini aerei], strikes: [ordini strike con prov] }` per tutte le nazioni non controllate dal giocatore.

- In guerra: difendi le province minacciate (tieni e supporta); attacca province nemiche adiacenti dove `attaccanti + supporti > tenuta stimata`, con priorità a centri di rifornimento e capitali; coordina i supporti tra unità proprie e alleate; avanza verso il nemico con BFS; le flotte controllano i mari verso le coste nemiche e convogliano gli eserciti per le guerre oltremare.
- In pace: guarnigione; se un vicino ha intenzioni ostili (`GEO.AI.warIntent > 0.02`), sposta eserciti verso quel confine; gli interventisti schierano unità presso alleati in guerra.
- Onora o tradisce gli accordi con il giocatore come da §8.
- Prestazioni: tutta la pianificazione di un turno deve costare meno di 30 ms in Node con 59 nazioni.

## 10. Animazioni (`js/anim.js`)

`GEO.anim` disegna su un canvas sovrapposto alla mappa (`#fx`).

- `GEO.anim.init({ canvas, proj, provPos, nationColor, flag })` dove `proj(lon,lat)->[x,y]` e `provPos(id)->[lon,lat]`.
- `GEO.anim.drawUnit(ctx, x, y, unit, opts)`: gettone dell'unità (esercito = scudo arrotondato con stella, flotta = sagoma di nave), colore della nazione, bandiera piccola. Usato anche dalla mappa statica.
- `GEO.anim.play(resolution, { speed, onPhase, onDone }) -> Promise`: riproduce `s.lastResolution` per fasi:
  1. missili con traiettoria balistica, scia e lampi di intercettazione; colpi a segno con esplosione;
  2. testate nucleari: lampo bianco, onda d'urto ad anelli, bagliore persistente;
  3. stormi aerei che sorvolano la provincia;
  4. movimenti simultanei dei gettoni con interpolazione morbida; supporti come linee tratteggiate che si disegnano; convogli come tratteggio sul mare;
  5. battaglie: scintille ed esplosioni nelle province contese, rimbalzo dei movimenti in stallo;
  6. ritirate e distruzioni (tremolio e dissolvenza con detriti);
  7. conquiste: onda di colore dalla provincia;
  8. costruzioni: comparsa con scala elastica; scioglimenti: dissolvenza.
- `GEO.anim.skip()`, `GEO.anim.setSpeed(x)`, `GEO.anim.isPlaying()`.
- Effetti ambientali sempre attivi a basso costo: frecce degli ordini con tratteggio animato, pulsazione dei fronti di guerra, alone dell'unità selezionata.
- Nessuna libreria esterna; `requestAnimationFrame`; il canvas di effetti si ridimensiona con la mappa e usa `devicePixelRatio`.

## 11. Interfaccia

- Mappa: celle provinciali (Voronoi degli ancoraggi ritagliato sul poligono reale del paese), confini provinciali sottili, centri di rifornimento con un punto, capitali con una stella, etichette dei mari con lo zoom, gettoni delle unità.
- Inserimento ordini in stile Diplomacy: clic su una propria unità, poi clic sulla destinazione (movimento), oppure tasto o pulsante per supporto e convoglio; frecce degli ordini sulla mappa.
- Pannello Militare: elenco unità con ordine corrente e menu, stormi aerei, missili e testate su provincia, richieste di accordo agli alleati.
- Barra delle fasi del turno: Diplomazia → Ordini → Risoluzione → Ritirate → Aggiustamenti.
- Dopo "Fine turno": riproduzione animata della risoluzione con controlli Salta e velocità, poi il rapporto. Pulsante "Rivedi ultimo turno".
