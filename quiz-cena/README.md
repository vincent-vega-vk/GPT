# Quiz della cena

Quiz live per la cena clienti: il conduttore avvia e fa avanzare le domande dal telefono, gli ospiti rispondono dal loro. Un solo file (`index.html`), nessun server: i dati passano da un Realtime Database Firebase gratuito.

## Prima volta

1. Su console.firebase.google.com crea un progetto, poi Build → Realtime Database → località Belgio → modalità test.
2. Impostazioni progetto → "Le tue app" → icona `</>` → registra l'app e copia il blocco `firebaseConfig`.
3. Apri `index.html?host=new`, incolla il blocco, salva. Compare la lobby con il QR code.
4. Salva il "link conduttore": riporta a quella partita da qualsiasi telefono.

## Durante la cena

- Il quiz parte solo al tuo tocco su "Avvia", quando vedi abbastanza collegati.
- 20 secondi a domanda; puoi chiudere prima se hanno risposto tutti. Tieni lo schermo acceso: è il tuo telefono a chiudere le domande.
- Alla fine, tre tocchi svelano il 3°, il 2° e il 1° posto su tutti i telefoni.
- "Nuova partita" crea una gara pulita: usala per le prove.

## Regole dei punti

- Risposta giusta: 500 punti più fino a 500 di bonus velocità.
- Le domande sulla propria azienda valgono 0 (spegnibile dalla lobby).
- Chi scrive "SAP" come azienda gioca ma resta fuori classifica.

## Dopo la cena

La modalità test di Firebase scade dopo 30 giorni. Elimina il progetto Firebase quando hai finito.
