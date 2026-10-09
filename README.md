# 🌐 Geopolitica 2026 — Grand Strategy a turni

Un gioco di strategia geopolitica ispirato a *Diplomacy*, giocabile direttamente nel browser senza installazione. Governi una delle 59 nazioni del mondo per decenni, partendo dallo stato (approssimato) dell'autunno 2026, scegli il futuro del paese con politiche e visioni di lungo periodo e ti confronti con le altre, guidate da un'intelligenza artificiale con personalità diverse.

**Avvio:** apri `index.html` in un browser moderno (Chrome, Firefox, Edge, Safari). Nessun server né build necessari.

## Cosa c'è dentro

| Area | Meccaniche |
|---|---|
| 🏛️ Governo | Bilancio trimestrale ripartito tra Difesa, Ricerca, Welfare, Infrastrutture e Diplomazia. Deficit/surplus, debito, inflazione, stabilità, consenso, reputazione. |
| 🧭 Politiche | 11 ambiti (fisco, commercio, modello economico, immigrazione, welfare, energia e clima, dottrina militare, estera e nucleare, tecnologia, istituzioni) con opzioni esclusive, costi di riforma e effetti duraturi; definiscono l'ideologia che avvicina o allontana le altre nazioni. **Visione nazionale** di lungo periodo (tecnologica, fortezza, commerciale, verde, egemonica, democratica, ordine) con obiettivi e traguardi. |
| 🌍 Ecosistema | Clima globale alimentato dalle emissioni di tutti (disastri, carestie, instabilità), blocchi fondati dal giocatore, uscita da NATO/UE, ondate democratiche e populiste, cronaca storica del regno. |
| 🗺️ Mappa | Confini reali (Natural Earth 110m) con 176 paesi, 9 modalità (stato, relazioni, potenza, stabilità, regime, blocchi, PIL pro capite, emissioni, guerre), occupazioni a strisce, zone irradiate, zoom e trascinamento. |
| 👑 Potere | Ogni partita segue i **mandati politici**: in democrazia si vota alla scadenza (consenso, crescita, inflazione, opposizione, media). Perdere le elezioni porta all'opposizione (campagna, mozioni, piazza, coalizioni per tornare); golpe e rivolte all'esilio (reti clandestine, pressioni, insurrezione). La partita continua per decenni, anche senza limite. Stratagemmi per restare al potere: campagna elettorale, controllo dei media, rinvio del voto, stato di emergenza, riforma costituzionale, brogli, purga e partito unico (autocrazia). In autocrazia conta la **lealtà delle élite**: sotto 25 rischi il golpe. Richiami ed espulsione dall'UE, sanzioni delle democrazie. |
| 💰 Tesoro | Oltre alla borsa: ripaga il debito, finanzia progetti (infrastrutture, sanità, istruzione, riarmo, welfare, salvataggio bancario, ricostruzione, stretta monetaria, campagna elettorale, regalie alle élite), compra 15 **capacità nazionali** permanenti (servizi segreti, propaganda, forze speciali, guardia pretoriana, scudo cyber, flotta d'alto mare, banca centrale, polo tecnologico, riserve strategiche, scudo antimissile, triade nucleare, programma nucleare, stato di sorveglianza, fondo sovrano) e investe in **imprese di stato** settoriali con dividendi. |
| 📈 Borsa | Indice mondiale, 33 indici nazionali, 6 settori (Tech, Energia, Difesa, Agro, Finanza, Oro) e 5 materie prime (petrolio, gas, grano, chip, terre rare). I prezzi reagiscono a guerre, sanzioni, shock, tecnologia. Investi il tesoro sapendo in anticipo cosa farai. |
| 🔬 Tecnologia | 9 rami: IA, Semiconduttori, Energia, Spazio, Cyber, Ipersonici, Biotech, Quantistica, Difesa antimissile. Dipendenza dai chip ed embarghi tecnologici, spionaggio, intelligence satellitare. |
| 🤝 Diplomazia | Accordi commerciali, patti di non aggressione, alleanze difensive, blocchi (NATO, UE, BRICS+, SCO, CSTO, AUKUS, QUAD, OPEC+...), ultimatum, aiuti, sanzioni, destabilizzazione, cyberattacchi, Consiglio di Sicurezza ONU con veto dei P5. |
| ⚔️ Guerra | **Engine in stile Diplomacy**: 192 province e 43 mari su confini reali, eserciti e flotte (una unità per provincia), ordini di movimento, supporto e convoglio risolti simultaneamente con l'algoritmo di Kruijswijk (stalli, tagli del supporto, scontri frontali, movimenti circolari, convogli, regola di Szykman), ritirate, conquiste, capitolazione alla caduta della capitale, aggiustamenti delle unità in base al bilancio militare, stormi aerei, missili che sopprimono o distruggono unità, accordi con l'IA che può tradire. Risoluzione riprodotta in **animazione** (missili balistici, esplosioni, testate nucleari, movimenti, battaglie, conquiste). Inoltre: invasioni regione per regione, capitolazioni con riparazioni e stati satellite, insurrezioni nei territori occupati, salve missilistiche con intercettazione e saturazione, cyberattacchi, armi nucleari con rappresaglia (MAD), ombrello nucleare e triade. Un attacco nucleare **stermina milioni di persone** e irradia regioni per 5 turni; solo dopo inizia il ripopolamento. |
| 💀 Brutalità | Inflazione e iperinflazione, default sovrano, carestie, profughi dalle guerre vicine, attentati (anche mortali), terrorismo, scioperi, golpe militari, operazioni coperte delle IA ostili, ultimatum ai deboli. |
| 📰 Eventi | Elezioni, scandali, proteste, scoperte, pandemie, crisi finanziarie, shock petroliferi, colpi di stato, carestie, svolte nell'IA... con scelte che hanno conseguenze. |
| 🏆 Vittoria | Egemonica, Tecnologica, Diplomatica o per punteggio alla scadenza. Sconfitta per capitolazione o rivoluzione. |

Salvataggio automatico nel browser a ogni turno, più esportazione/importazione su file JSON. Ogni partita è riproducibile dato il *seed*.

## Struttura

```
index.html        pagina e layout
css/style.css     tema scuro, layout a tre colonne, modali
js/data.js        nazioni, relazioni, trattati, eventi, tecnologie, mappa
js/engine.js      motore: economia, mercati, ricerca, guerra, diplomazia, ONU, eventi
js/politics.js    mandati, elezioni, regimi, opposizione/esilio, politiche, visioni, inflazione, tesoro
js/world.js       confini reali dei paesi (Natural Earth 110m, dominio pubblico)
js/provinces.js   grafo province/mari (GENERATO da tools/build_provinces.js da data/provinces/*.json)
js/military.js    engine militare stile Diplomacy (aggiudicazione, ritirate, conquiste, aggiustamenti, accordi)
js/military_ai.js ordini militari delle nazioni IA
js/anim.js        animazioni della risoluzione e gettoni delle unità
docs/military-engine.md  specifica dell'engine militare
js/ai.js          decisioni delle nazioni IA (bilancio, guerre, pace, proposte)
js/ui.js          interfaccia, mappa su canvas con zoom, pannelli, modali
test/sim.js       simulazione headless per verificare la stabilità del motore
```

Test del motore (richiede Node.js):

```
node test/sim.js 6 40          # 6 partite da 40 turni con giocatore passivo
node test/military.test.js     # test dell'aggiudicatore (casi ispirati al DATC)
node tools/build_provinces.js  # rigenera js/provinces.js dopo aver modificato data/provinces/
```

## Note

I dati di partenza (PIL, popolazione, forze armate, testate, tecnologie, relazioni, guerre in corso) sono approssimazioni a scopo ludico dello stato del mondo nell'autunno 2026, non fonti ufficiali. Il bilanciamento privilegia la giocabilità rispetto al realismo.
