# Guida di stile — Oroscopo Bastardo

Tutti i testi dell'app rispettano queste regole. Il controllo automatico è `node scripts/controlla-contenuti.mjs content/<file>.mjs`.

## Voce

- Seconda persona singolare, presente o futuro. Cinica, secca, cattiva ma complice: prende in giro chi legge come farebbe un amico stronzo, non un bullo.
- Il bersaglio sono comportamenti e vizi: ego, pigrizia, indecisione, ex, colleghi, chat, soldi, palestra, riunioni, parenti, buoni propositi.
- La battuta sta in fondo alla frase. Concreto batte astratto: «l'umido», «il vocale di quattro minuti», «la riunione che poteva essere una mail».
- Parolacce leggere e rare, al massimo una ogni otto righe: stronzate, cazzate, culo, sfiga, palle. Niente bestemmie.

## Mai

- Aspetto fisico, peso, età come insulto, malattie, lutti, morte, suicidio, autolesionismo, violenza reale, droghe.
- Etnie, nazionalità, religione, orientamento, identità di genere, disabilità, politica.
- Persone reali. Marchi solo se indispensabili: meglio «la chat», «i social», «l'app di incontri».
- Consigli medici, legali o finanziari presi sul serio.

## Neutro di genere

Chi legge può essere chiunque: nessun aggettivo o participio concordato con il «tu».

| No | Sì |
| --- | --- |
| Sei convinto di avere ragione | Hai la certezza di avere ragione |
| Ti sei svegliato male | Il risveglio è andato male |
| Sei stanco | Hai le batterie a terra |
| Sei bravo a sparire | Sparire ti riesce benissimo |
| Da solo | Per conto tuo |

Vanno bene: verbi con «avere», nomi («sei un disastro», «sei una frana»), aggettivi in -e («insopportabile», «capace», «felice»), infiniti. Anche le altre persone restano neutre: «chi ti piace», «la persona che frequenti», «un ex», «chi ti sta accanto».

## Forma

- Stringhe JavaScript tra virgolette doppie. Dentro: apostrofo semplice `'`, mai virgolette doppie; per il parlato «caporali».
- Niente emoji, segnaposto, a capo, doppi spazi. Ogni riga finisce con un segno di punteggiatura.
- Ogni riga vive per conto suo: non rimanda ad altre righe e non ripete un'idea già usata nello stesso file.

## I tre pezzi di una lettura

Una lettura è composta da: **tratto** (chi sei) + **sentenza** (cosa ti succede oggi) + **chiusa** (cosa farne). I pezzi si combinano liberamente, quindi ognuno deve reggere accanto a qualsiasi altro.

- **Tratto** (45–125 caratteri): difetto tipico del segno, senza tempo. Non è una previsione e non parla di «oggi».
- **Sentenza** (60–165 caratteri): previsione per oggi, legata al tema del pianeta.
- **Chiusa** (25–95 caratteri): consiglio o morale finale, breve.

## Temi dei pianeti

| Tema | Di cosa parla |
| --- | --- |
| sole | ego, protagonismo, autostima, figuracce in pubblico |
| luna | umore, drammi, sonno, fame nervosa, nostalgia, famiglia |
| mercurio | chat, mail, vocali, fraintendimenti, tecnologia, mezzi di trasporto |
| venere | amore, sesso, ex, app di incontri, coppia, vanità |
| marte | litigi, rabbia, palestra, competizione, traffico, impulsività |
| giove | soldi, fortuna, eccessi, cibo e alcol, shopping, promesse esagerate |
| saturno | lavoro, capi, scadenze, burocrazia, responsabilità |
| urano | caos, imprevisti, colpi di scena, cose che si rompono, cambi di programma |
| nettuno | illusioni, autoinganno, procrastinazione, sogni, spiritualità da discount |
