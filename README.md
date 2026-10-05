# 🌐 Geopolitica 2026 — Grand Strategy a turni

Un gioco di strategia geopolitica ispirato a *Diplomacy*, giocabile direttamente nel browser senza installazione. Governi una delle 33 nazioni del mondo partendo dallo stato (approssimato) dell'autunno 2026 e ti confronti con le altre, guidate da un'intelligenza artificiale con personalità diverse.

**Avvio:** apri `index.html` in un browser moderno (Chrome, Firefox, Edge, Safari). Nessun server né build necessari.

## Cosa c'è dentro

| Area | Meccaniche |
|---|---|
| 🏛️ Governo | Bilancio trimestrale ripartito tra Difesa, Ricerca, Welfare, Infrastrutture e Diplomazia. Deficit/surplus, debito, stabilità, consenso, reputazione, elezioni. |
| 📈 Borsa | Indice mondiale, 33 indici nazionali, 6 settori (Tech, Energia, Difesa, Agro, Finanza, Oro) e 5 materie prime (petrolio, gas, grano, chip, terre rare). I prezzi reagiscono a guerre, sanzioni, shock, tecnologia. Investi il tesoro sapendo in anticipo cosa farai. |
| 🔬 Tecnologia | 9 rami: IA, Semiconduttori, Energia, Spazio, Cyber, Ipersonici, Biotech, Quantistica, Difesa antimissile. Dipendenza dai chip ed embarghi tecnologici, spionaggio, intelligence satellitare. |
| 🤝 Diplomazia | Accordi commerciali, patti di non aggressione, alleanze difensive, blocchi (NATO, UE, BRICS+, SCO, CSTO, AUKUS, QUAD, OPEC+...), ultimatum, aiuti, sanzioni, destabilizzazione, cyberattacchi, Consiglio di Sicurezza ONU con veto dei P5. |
| ⚔️ Guerra | Ordini simultanei a fine turno (come in Diplomacy): invasioni regione per regione, capitolazioni e stati satellite, attacchi missilistici con intercettazione, cyberattacchi, armi nucleari con rappresaglia (MAD), ombrello nucleare, fallout globale. |
| 📰 Eventi | Elezioni, scandali, proteste, scoperte, pandemie, crisi finanziarie, shock petroliferi, colpi di stato, carestie, svolte nell'IA... con scelte che hanno conseguenze. |
| 🏆 Vittoria | Egemonica, Tecnologica, Diplomatica o per punteggio alla scadenza. Sconfitta per capitolazione o rivoluzione. |

Salvataggio automatico nel browser a ogni turno, più esportazione/importazione su file JSON. Ogni partita è riproducibile dato il *seed*.

## Struttura

```
index.html        pagina e layout
css/style.css     tema scuro, layout a tre colonne, modali
js/data.js        nazioni, relazioni, trattati, eventi, tecnologie, mappa
js/engine.js      motore: economia, mercati, ricerca, guerra, diplomazia, ONU, eventi
js/ai.js          decisioni delle nazioni IA (bilancio, guerre, pace, proposte)
js/ui.js          interfaccia, mappa su canvas con zoom, pannelli, modali
test/sim.js       simulazione headless per verificare la stabilità del motore
```

Test del motore (richiede Node.js):

```
node test/sim.js 6 40     # 6 partite da 40 turni con giocatore passivo
```

## Note

I dati di partenza (PIL, popolazione, forze armate, testate, tecnologie, relazioni, guerre in corso) sono approssimazioni a scopo ludico dello stato del mondo nell'autunno 2026, non fonti ufficiali. Il bilanciamento privilegia la giocabilità rispetto al realismo.
