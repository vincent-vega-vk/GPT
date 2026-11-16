# Biscotto della Sfiga

Web app installabile su iPhone (PWA): si strappa la bustina, si spezza il biscotto
della fortuna e il bigliettino ti insulta.

- `index.html` — tutta l'app (grafica SVG, suoni generati al volo, frasi).
- `manifest.webmanifest`, `sw.js`, `icon-*.png` — installazione e uso offline.

## Mettere l'app sull'iPhone

1. Pubblica la cartella con GitHub Pages (Settings → Pages → Deploy from a branch).
2. Apri `https://<utente>.github.io/GPT/biscotto/` in Safari.
3. Condividi → **Aggiungi alla schermata Home**.

## Aggiungere frasi

Sono nell'array `FORTUNES` in cima allo script di `index.html`: una riga per frase.
