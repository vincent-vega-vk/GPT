// Microcopy tied to the live sky and to the interface. Same voice rules as content/GUIDA-DI-STILE.md.

export const ETICHETTE_TEMA = {
  sole: 'Ego', luna: 'Umore', mercurio: 'Parole', venere: 'Amore', marte: 'Guerra',
  giove: 'Soldi', saturno: 'Doveri', urano: 'Caos', nettuno: 'Illusioni',
};

// Indexed like FASI in cielo.js.
export const COMMENTI_FASE = [
  [
    'Buio totale: la Luna non si fa vedere. Ha capito l’aria che tira.',
    'Luna nuova: si ricomincia da zero. Che per te è una posizione familiare.',
    'Nessuna luce in cielo stanotte. Ottimo per i buoni propositi: non li vede nessuno.',
    'La Luna si è presa una pausa. Tu non puoi, ma grazie per l’interesse.',
  ],
  [
    'Una falce sottile, appena accennata. Come il tuo impegno.',
    'La Luna cresce piano. Almeno qualcosa, da queste parti, cresce.',
    'Il cielo sorride di sbieco. Sta ridendo di te, non con te.',
    'Si vede uno spicchio di Luna. È tutto l’ottimismo disponibile per oggi.',
  ],
  [
    'Luna illuminata a metà. Tu oggi punti a molto meno.',
    'Metà luce e metà ombra. Indovina quale metà ti riguarda.',
    'La Luna è arrivata a metà del lavoro. Prendi esempio, una volta tanto.',
    'Mezza Luna in cielo. Bicchiere mezzo vuoto, ovviamente.',
  ],
  [
    'La Luna si gonfia verso il pieno. Anche il tuo ego, ma con meno grazia.',
    'Quasi piena, non ancora. La storia della tua vita.',
    'Manca poco alla Luna piena. Inizia a preparare le scuse.',
    'La Luna accumula luce. Tu accumuli notifiche non lette.',
  ],
  [
    'Luna piena: qualsiasi cosa tu faccia stanotte, avrai un alibi astronomico.',
    'Illuminata al massimo. Lei. Tu resti come ieri.',
    'Luna piena: dormirai male e darai la colpa a lei. Stavolta, in effetti, c’entra.',
    'Luna piena: stanotte risponderai alle storie degli ex. Non dire che il cielo non ti aveva avvisato.',
  ],
  [
    'La Luna inizia a calare. Non è l’unica cosa in ribasso.',
    'Il meglio è passato. Vale per la Luna, per carità.',
    'La Luna perde luce un po’ per sera. Tu perdi tempo con la stessa costanza.',
    'Fase calante: ottima per liberarsi del superfluo. Comincia dalle tue opinioni.',
  ],
  [
    'Resta mezza Luna e la voglia di fare è già finita.',
    'La Luna è a metà della discesa. Tu sei in vantaggio.',
    'Mezza Luna, ma quella sbagliata. C’era da aspettarselo.',
    'Ultimo quarto: il cielo chiude i conti. I tuoi non tornano.',
  ],
  [
    'Resta una falce sottile. La Luna stacca, e fa bene.',
    'La Luna sta finendo le batterie. Benvenuta nel club.',
    'Un filo di Luna prima del buio. Anche lei ne ha abbastanza di questo mese.',
    'La Luna si assottiglia e sparisce. Tecnica che conosci bene, nelle chat.',
  ],
];

// Indexed by sign.
export const LUNA_NEL_SEGNO = [
  ['Luna in Ariete: si litiga prima e si pensa dopo. Più del solito, intendo.', 'Con la Luna in Ariete la pazienza è esaurita in tutto il sistema solare.'],
  ['Luna in Toro: fame, divano e nessuna intenzione di muoversi. Il cielo ti somiglia.', 'La Luna in Toro vuole solo mangiare e stare comoda. Finalmente un transito onesto.'],
  ['Luna in Gemelli: tutti parlano, nessuno ascolta. Una chat di gruppo, in pratica.', 'Con la Luna in Gemelli cambierai idea tre volte prima di pranzo. Sulle stesse cose.'],
  ['Luna in Cancro: lacrime facili e foto vecchie. Telefono lontano dopo le undici.', 'La Luna è a casa sua, in Cancro. Qualcuno piangerà per uno spot pubblicitario: tu.'],
  ['Luna in Leone: tutti vogliono l’applauso. Il pubblico, purtroppo, è finito.', 'Con la Luna in Leone il dramma è garantito. Porta i popcorn o porta il copione.'],
  ['Luna in Vergine: oggi noterai ogni difetto altrui. I tuoi restano fuori inventario.', 'La Luna in Vergine fa le pulci a tutto. Anche a questa frase, probabilmente.'],
  ['Luna in Bilancia: decidere qualcosa oggi è statisticamente improbabile.', 'Con la Luna in Bilancia si va tutti d’accordo. In faccia.'],
  ['Luna in Scorpione: i sospetti aumentano, le prove no.', 'La Luna in Scorpione non perdona. Tu fai finta, ma nemmeno tu.'],
  ['Luna in Sagittario: voglia di mollare tutto e partire. Il conto in banca dissente.', 'Con la Luna in Sagittario si dice la verità. Preparati a pentirtene.'],
  ['Luna in Capricorno: emozioni rimandate a data da destinarsi.', 'La Luna in Capricorno lavora anche di notte. Non prendere esempio.'],
  ['Luna in Acquario: tutti distanti, tutti originali, tutti uguali.', 'Con la Luna in Acquario le emozioni sono teoriche. Comodo, no?'],
  ['Luna in Pesci: la realtà è facoltativa fino a nuovo avviso.', 'La Luna in Pesci confonde sogni e programmi. Tu lo fai da sempre, senza scuse astronomiche.'],
];

export const RETROGRADI = {
  mercurio: ['Mercurio retrogrado: rileggi prima di inviare. Anzi, non inviare.', 'Mercurio retrogrado. Stavolta la colpa è davvero sua, ma solo stavolta.'],
  venere: ['Venere retrograda: gli ex tornano. Tu fai finta di non essere in casa.', 'Venere retrograda: l’amore fa marcia indietro. Lasciagli spazio per la manovra.'],
  marte: ['Marte retrogrado: tanta rabbia e nessuna voglia di alzarsi per usarla.', 'Marte retrogrado: i litigi arrivano in differita, ma arrivano.'],
  giove: ['Giove retrogrado: la fortuna c’è, ma ha sbagliato indirizzo.', 'Giove retrogrado: gli eccessi di ieri presentano il conto oggi.'],
  saturno: ['Saturno retrogrado: le scadenze rimandate tornano tutte insieme.', 'Saturno retrogrado: il karma ripassa a controllare i compiti.'],
  urano: ['Urano retrogrado: il caos rallenta. Era ora, ma non durerà.', 'Urano retrogrado: gli imprevisti di oggi sono repliche. Li hai già visti.'],
  nettuno: ['Nettuno retrogrado: le illusioni scadono. Controlla la data sulle tue.', 'Nettuno retrogrado: cala la nebbia e si vede come stanno le cose. Mi dispiace.'],
  plutone: ['Plutone retrogrado: trasformazione interiore in corso. Tempo stimato: qualche secolo.', 'Plutone retrogrado: non è nemmeno più un pianeta e ce l’ha comunque con te.'],
};
export const NESSUN_RETROGRADO = 'Nessun pianeta retrogrado: oggi non hai scuse astronomiche.';

// Why this body rules the day. {P} = body name.
export const COMMENTI_ASPETTO = {
  congiunzione: ['{P} è nel tuo segno e non ha intenzione di andarsene.', '{P} ti sta letteralmente addosso.', '{P} ti cammina sopra. Con gli scarponi.'],
  sestile: ['{P} ti dà una mano. Piccola, e controvoglia.', '{P} oggi è dalla tua parte, più o meno.', '{P} ti strizza l’occhio. Non montarti la testa.'],
  quadratura: ['{P} ti mette i bastoni tra le ruote, con metodo.', '{P} oggi ti rema contro. Ha anche ragione.', '{P} ti guarda storto da novanta gradi.'],
  trigono: ['{P} ti favorisce. Vedi di non sprecarlo come al solito.', '{P} ti spiana la strada. Riuscirai a inciampare lo stesso.', '{P} è in armonia con te. Qualcuno doveva pur esserlo.'],
  opposizione: ['{P} ti fissa dall’altra parte del cielo. Non è uno sguardo d’intesa.', '{P} ti sta di fronte e non arretra.', '{P} gioca contro, e gioca in casa.'],
  nessuno: ['{P} non ti guarda nemmeno, ma decide lo stesso.', '{P} comanda oggi senza un vero motivo. Come certi capi.', '{P} non ha aspetti con te. Decide lo stesso, per puro gusto.'],
};

// Five bands per gauge: 0–19, 20–39, 40–59, 60–79, 80–100.
export const METRO = {
  amore: { nome: 'Amore', fasce: ['Meglio un gatto.', 'Tira aria di «ti devo parlare».', 'Tiepido, come la pizza di ieri.', 'Qualcuno ti sopporta. Non indagare.', 'Stelle generose: non rovinare tutto parlando.'] },
  lavoro: { nome: 'Lavoro', fasce: ['Fingi un guasto alla linea.', 'Giornata da testa bassa e cuffie.', 'Farai il minimo. Come sempre, ma con stile.', 'Produci quasi quanto dici ai colloqui.', 'Oggi rendi. Occhio: poi se lo aspettano.'] },
  soldi: { nome: 'Soldi', fasce: ['Il portafoglio chiede asilo.', 'Non guardare l’estratto conto.', 'Né fame né gloria: mediocrità.', 'Un caffè te lo puoi permettere.', 'Giornata buona per i soldi. Degli altri, forse.'] },
  sfiga: { nome: 'Sfiga', fasce: ['La sfortuna oggi ha altro da fare.', 'Rischio basso: inciampi veniali.', 'Sfiga nella media stagionale.', 'Non firmare, non guidare, non rispondere.', 'Resta a letto. Anche lì, con prudenza.'] },
};
export const fascia = (v) => Math.min(4, Math.floor(v / 20));

export function commentoVoto(voto) {
  if (voto < 3) return 'Giornata da dimenticare, prima ancora di viverla.';
  if (voto < 5) return 'Insufficiente. Come ti dicevano a scuola.';
  if (voto < 6.5) return 'Sufficienza stiracchiata, per pietà delle stelle.';
  if (voto < 8) return 'Giornata decente. Non farci l’abitudine.';
  return 'Giornata ottima. Sospetta, quindi.';
}

export const PRESAGI = {
  evitare: 'Segno da evitare',
  ora: 'Ora peggiore',
  numero: 'Numero sfigato',
};

// --- compatibility ---

// Indexed by distance in signs (0…6).
export const ASPETTO_COPPIA = [
  'Stesso segno: stessi difetti, moltiplicati per due.',
  'Segni vicini di casa: si salutano e non si capiscono.',
  'Sestile: si intendono senza troppa fatica. Sospetto.',
  'Quadratura: novanta gradi di attrito puro.',
  'Trigono: stesso elemento, stessa lunghezza d’onda, stessi vizi.',
  'Quinconce: due lingue diverse e nessun vocabolario.',
  'Opposizione: attrazione fatale, con l’accento su fatale.',
];

export function fasciaCoppia(p) {
  if (p < 25) return { nome: 'Scappate', scadenza: 'un weekend lungo' };
  if (p < 40) return { nome: 'Sconsigliato dal cielo', scadenza: 'tre mesi, a essere generosi' };
  if (p < 55) return { nome: 'Si può fare, ma perché', scadenza: 'fino al primo trasloco' };
  if (p < 70) return { nome: 'Funzionicchia', scadenza: 'qualche anno, con manutenzione' };
  if (p < 85) return { nome: 'Funziona, purtroppo', scadenza: 'lunga: fatevene una ragione' };
  return { nome: 'Coppia insopportabile, per gli altri', scadenza: 'nessuna: gli amici sono avvisati' };
}

export const VOCI_COPPIA = {
  letto: 'Letto',
  dialogo: 'Dialogo',
  litigi: 'Litigi',
  portafoglio: 'Portafoglio',
};

// {S} = sign the body is crossing today.
export function commentoOggiCoppia(oggi, nomeSegno) {
  if (!oggi || oggi.delta === 0) return 'Il cielo di oggi non sposta nulla: arrangiatevi.';
  const su = oggi.delta > 0;
  switch (oggi.corpo) {
    case 'venere': return su ? `Venere in ${nomeSegno} oggi vi dà una spinta.` : `Venere in ${nomeSegno} oggi vi guarda male.`;
    case 'luna': return su ? `La Luna in ${nomeSegno} oggi vi tiene buoni.` : `La Luna in ${nomeSegno} oggi vi dà sui nervi.`;
    case 'marte': return `Marte in ${nomeSegno} oggi cerca la rissa tra voi.`;
    default: return 'Venere retrograda: oggi tornano a galla vecchie storie.';
  }
}

// --- notifications, onboarding, misc ---

export const NOTIFICHE = [
  'Le stelle hanno parlato. Non ti piacerà.',
  'La tua lettura di oggi è pronta. Siediti.',
  'Il cielo ha un’opinione su di te. Indovina quale.',
  'Oggi poteva andare peggio. Apri e scopri come.',
  'Mercurio ha qualcosa da dirti. Non è un complimento.',
  'Nuovo giorno, stessa storia. Però con altri pianeti.',
  'Il tuo oroscopo ti aspetta. Lui almeno è puntuale.',
  'La Luna si è mossa. Tu?',
  'Previsione pronta. Le stelle declinano ogni responsabilità.',
  'Buongiorno. Si fa per dire.',
  'Apri pure: la giornata non migliora ignorandola.',
  'Le stelle ti hanno pensato. Con un certo fastidio.',
  'Lettura del giorno in consegna. Non si accettano resi.',
  'C’è posta dal cosmo. Mittente poco gentile.',
];

export const DISCLAIMER =
  'Le posizioni di Sole, Luna e pianeti sono calcolate davvero, sul tuo telefono. Tutto il resto è satira: se la prendi sul serio, il problema non sono le stelle.';
