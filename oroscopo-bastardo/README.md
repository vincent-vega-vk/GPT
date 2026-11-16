# Oroscopo Bastardo

App di satira astrologica per iPhone: 999 letture per segno, scelte ogni giorno in base alla posizione reale di Sole, Luna e pianeti, più la compatibilità tra due segni. Interfaccia web (Vite, JavaScript senza framework) dentro un guscio nativo iOS (Capacitor).

## Comandi

```bash
npm install        # dipendenze
npm run dev        # sviluppo nel browser
npm test           # prove automatiche: cielo, oracolo, libreria
npm run contenuti  # controlla i testi scritti a mano
npm run build      # rigenera le letture e costruisce dist/
npm run ios        # build + sincronizza + apre Xcode (solo su Mac)
```

## Come nasce una lettura

1. `src/cielo.js` calcola le longitudini geocentriche di Sole, Luna e pianeti sullo zodiaco tropicale, con [Astronomy Engine](https://github.com/cosinekitty/astronomy), senza rete.
2. `src/oracolo.js` trova il corpo dominante: per ognuno dei nove corpi somma la forza dell'aspetto con il tuo segno e un rumore che dipende dall'impronta del cielo.
3. Il dominante decide il reparto (111 letture per corpo, 9 × 111 = 999); l'impronta del cielo decide quale delle 111. L'app ricorda le ultime 600 mostrate e non le ripete.
4. La lettura del giorno usa il cielo di mezzogiorno, quindi resta la stessa fino a sera. «Chiedi di nuovo» usa il cielo dell'istante, al milionesimo di grado.

Bastardometro, presagi e variazione giornaliera della compatibilità usano gli stessi aspetti.

## I testi

Tutto in `content/`, con le regole in `content/GUIDA-DI-STILE.md`:

| File | Contenuto |
| --- | --- |
| `tratti-1/2/3.mjs` | 48 difetti per segno (576) |
| `sentenze-1/2.mjs` | 45 previsioni per pianeta (405) |
| `chiuse.mjs` | 12 chiuse per pianeta e 60 generiche (168) |
| `coppie.mjs` | 78 verdetti di compatibilità |

`scripts/genera-letture.mjs` compone ogni lettura come tratto + sentenza + chiusa e scrive `public/data/letture/<segno>.json`: 11.988 testi tutti diversi, anche tra segni. Dopo aver cambiato i testi: `npm run contenuti && npm run build`.

## Pubblicare sull'App Store

Servono un Mac con Xcode aggiornato e l'iscrizione all'Apple Developer Program (99 USD l'anno).

1. `npm install && npm run ios`: si apre `ios/App/App.xcodeproj`.
2. In Xcode, target **App** › Signing & Capabilities: scegli il tuo Team. Se l'identificativo `it.oroscopobastardo.app` è già preso, cambialo lì e in `capacitor.config.json`.
3. Prova su un iPhone vero: notifiche, condivisione e vibrazione non sono verificabili dal browser.
4. Su [App Store Connect](https://appstoreconnect.apple.com) crea la nuova app con lo stesso identificativo e incolla i testi di `store/scheda-app-store.md`.
5. Pubblica `public/privacy.html` su un indirizzo pubblico e inseriscilo come URL dell'informativa. Serve anche un URL di supporto.
6. In Xcode: destinazione **Any iOS Device**, poi Product › Archive › Distribute App › App Store Connect.
7. Carica le schermate di `store/schermate/`, compila classificazione per età e privacy come indicato nella scheda, invia in revisione.

L'app è solo per iPhone e solo in verticale, quindi bastano le schermate da 6,9".

A ogni modifica, `.github/workflows/oroscopo-bastardo.yml` esegue le prove e compila il progetto Xcode per il simulatore su un runner macOS. La build non è firmata: dice che il progetto compila, non sostituisce la prova su un iPhone.

## Struttura

```
content/   testi scritti a mano
scripts/   generatore delle letture, controllo dei testi, icone, schermate
src/       cielo.js · oracolo.js · main.js · style.css · testi.js · glifi.js · nativo.js
public/    letture generate, icone, manifest, privacy
ios/       progetto Xcode (Capacitor, Swift Package Manager)
store/     icona, schermate e testi per l'App Store
test/      prove automatiche
```
