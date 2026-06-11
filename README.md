# METAL RUSH — Mission 1: Tempesta nel Deserto

Run & gun a scorrimento orizzontale in stile **Metal Slug**, scritto in puro
HTML5 Canvas + WebAudio. Nessuna dipendenza, nessun asset esterno: tutta la
pixel-art è disegnata proceduralmente e tutti gli effetti sonori e la musica
sono sintetizzati al volo.

![genere](https://img.shields.io/badge/genere-run%20%26%20gun-orange)

## Come si gioca

Apri `index.html` nel browser (doppio click) **oppure** servi la cartella:

```bash
python3 -m http.server 8000
# poi apri http://localhost:8000
```

## Comandi

| Tasto | Azione |
|---|---|
| `←` `→` / `A` `D` | muoviti |
| `↑` / `W` | mira in alto |
| `↓` / `S` | abbassati · entra/esci dal tank · guida la discesa col paracadute |
| `Z` / `J` | spara (nel tank: mitragliatrice) |
| `X` / `K` / `SPAZIO` | salta |
| `C` / `L` | granata (nel tank: colpo di cannone) |
| `ENTER` | start / pausa |
| `M` | musica e audio on/off |

## Cosa trovi nella missione

- **Soldati ribelli** con pistola e coltello, **bazooka**, **fucilieri** appostati,
  **nidi di mitragliatrice** tra i sandbag e **elicotteri** che sganciano bombe.
- **POW da liberare**: ti regalano armi (HEAVY MG, SPREAD), granate e medaglie.
- Il **tank SLUG**: salici sopra con `↓`, ha 6 punti vita, mitragliatrice e
  30 colpi di cannone. Si può anche saltare!
- Armi raccoglibili: **Heavy Machine Gun** (raffica veloce) e **Spread**
  (rosa di 3 colpi), più scorte di granate.
- Boss finale: lo **STEEL RHINO**, un carro corazzato con cannone orientabile,
  mitragliatrice e — sotto il 45% di vita — una modalità furia.
- 3 vite, respawn col paracadute, invincibilità temporanea all'atterraggio,
  punteggio con best salvato in `localStorage`.

## Note tecniche

- Risoluzione interna 480×270 upscalata 2× con `image-rendering: pixelated`.
- Game loop a timestep fisso (60 Hz) con accumulatore; input edge-triggered
  che sopravvive ai frame senza step.
- Sprite definiti come mappe di caratteri e "cotti" su canvas offscreen
  (con variante specchiata) al boot.
- Sfondo a 4 livelli di parallasse (cielo/sole, montagne, dune e rovine,
  terreno con palme e rocce) generato proceduralmente con hash deterministico.
- SFX e musica (basso + batteria a 132 BPM) sintetizzati con WebAudio,
  scheduler con lookahead.
