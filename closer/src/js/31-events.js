/* Interludi di carriera: piccoli eventi tra un deal e l'altro.
   eff: energy (costo in settimane), rep, jolly{}, mods{t,v,u,c,r} (bonus di partenza sui deal successivi), quick{acv,p} */
(function (g) {
  'use strict';
  const CL = g.CL;

  CL.events = [
    {
      id: 'forecast', title: `Pipeline review con Marta`, where: `Call · venerdì 16:00`,
      scene: [
        { w: 'marta', a: `scorre il CRM`, t: `Dimmi onestamente dove siamo. Ho bisogno di numeri su cui costruire, non di numeri che mi piacciono.` },
      ],
      cast: { marta: { name: `Marta Colombo`, role: `La tua Sales Director`, hue: 348 } },
      choices: [
        { id: 'a', t: `Ti do il quadro reale: cosa è solido, cosa è a rischio e cosa mi serve da te per sbloccarlo.`, r: `Marta prende appunti: “Questo è il modo giusto”. Ti ricambia con un’ora di Deal Desk in più per il resto del trimestre.`, eff: { rep: 5, jolly: { desk: 1 } } },
        { id: 'b', t: `Sono ottimista: la maggior parte dei deal è in Commit.`, r: `Marta ti guarda un secondo di troppo. La tua credibilità sul forecast scende, e il prossimo review sarà più duro.`, eff: { rep: -8 } },
        { id: 'c', t: `Dico che è difficile e che il trimestre è pesante: meglio non esporsi.`, r: `Marta ridimensiona il forecast. Se vincerai, sarà un successo a sorpresa. Se perdi, avevi avvisato. Un forecast difensivo non è onesto, è solo comodo.`, eff: { rep: -2 } },
      ],
    },
    {
      id: 'battlecard', title: `Vertex lancia una promo aggressiva`, where: `Email · lunedì 08:40`,
      scene: [
        { n: `Il tuo principale concorrente annuncia sconti del 40% “per chi firma entro il trimestre”. In giro per i clienti, la voce corre.` },
      ],
      choices: [
        { id: 'a', t: `Dedico una settimana a preparare con Davide una battlecard onesta: dove vinciamo, dove perdiamo, come reagire.`, r: `La battlecard è chiara e sincera. Entri nei prossimi incontri con più sicurezza e con risposte pronte.`, eff: { energy: 1, mods: { t: 3, c: 3 } } },
        { id: 'b', t: `Ignoro: il prezzo non è il nostro gioco, ci penserò caso per caso.`, r: `Nei prossimi incontri la promo viene citata più di una volta. Rispondi sul momento, e non sempre bene.`, eff: { mods: { r: 4 } } },
        { id: 'c', t: `Faccio girare la voce che gli sconti di Vertex nascondono costi di servizio.`, r: `Qualcuno lo riferisce a Vertex. Un cliente ti chiama: “Non mi piace chi parla male degli altri”.`, eff: { rep: -6, mods: { t: -2 } } },
      ],
    },
    {
      id: 'quickwin', title: `Opportunità lampo`, where: `Messaggio · mercoledì 12:30`,
      scene: [
        { n: `Un partner ti segnala una PMI che vuole il modulo base e sembra decisa a firmare. Valore: circa €70k, ma ti chiede una settimana di attenzione.` },
      ],
      choices: [
        { id: 'a', t: `La prendo: una settimana, una firma piccola ma quasi sicura.`, r: `La PMI è pratica e diretta. In cinque giorni raccogli firma e anticipo.`, eff: { energy: 1, quick: { acv: 60, p: 0.85 } } },
        { id: 'b', t: `La passo a un collega junior: la mia energia è per i deal grandi.`, r: `Il collega la prende volentieri. Un favore che ricorderà.`, eff: { rep: 2 } },
      ],
    },
    {
      id: 'shadow', title: `Shadowing con un senior`, where: `Corridoio · giovedì 09:15`,
      scene: [
        { n: `Un account executive senior ti propone di seguirlo per una giornata di call: negoziazioni vere, con clienti veri.` },
      ],
      choices: [
        { id: 'a', t: `Accetto: una giornata a imparare vale più di un manuale.`, r: `Ascolti tre negoziazioni. Impari più dell’ultimo corso e il senior ti presenta un suo cliente soddisfatto, disponibile a farti da referenza.`, eff: { energy: 1, jolly: { ref: 1 }, mods: { c: 2 } } },
        { id: 'b', t: `Rifiuto: ho troppe cose da fare.`, r: `Il senior alza le spalle. Capita. L’occasione non tornerà presto.`, eff: {} },
      ],
    },
    {
      id: 'referral', title: `Un cliente ti segnala un amico`, where: `Email · martedì 18:20`,
      scene: [
        { mail: { from: `Un cliente soddisfatto`, subj: `Un collega che dovresti sentire` }, t: `Ho parlato di voi a un collega di un’altra azienda. Se ti fa comodo, ti presento: ha un problema simile al mio.` },
      ],
      choices: [
        { id: 'a', t: `Ringrazio e chiedo un’introduzione calda, con due righe di contesto.`, r: `L’introduzione è calda e preparata. Il cliente accetta anche di fare da referenza per altri.`, eff: { jolly: { ref: 1 }, rep: 2 } },
        { id: 'b', t: `Ringrazio e basta, ci penserò.`, r: `Il collega viene contattato da altri. Un’occasione educatamente lasciata passare.`, eff: {} },
      ],
    },
    {
      id: 'ethics', title: `Il consiglio del collega`, where: `Mensa · mercoledì 13:10`,
      scene: [
        { n: `Un collega con quota raggiunta ti dà un consiglio da amico.` },
        { w: 'collega', a: `a bassa voce`, t: `Se ti manca poco, prometti la feature in roadmap per il terzo trimestre. Tanto nessuno controlla. Io faccio così da anni.` },
      ],
      cast: { collega: { name: `Collega di team`, role: `Account Executive senior`, hue: 60 } },
      choices: [
        { id: 'a', t: `Lo ringrazio, ma io le promesse di roadmap non le faccio.`, r: `Il collega scrolla le spalle. A fine trimestre, quando uno dei suoi clienti chiede conto di una feature mai uscita, capirai perché hai fatto bene.`, eff: { rep: 4 } },
        { id: 'b', t: `Ottimo suggerimento: uso la promessa di roadmap come leva sui prossimi deal.`, r: `Nei prossimi incontri la leva funziona: i clienti si fidano un po’ di più. Ma hai appena contratto un debito che qualcun altro, prima o poi, ti farà pagare.`, eff: { rep: -10, mods: { t: 4 } } },
        { id: 'c', t: `Ne parlo con Marta: è una pratica che mette a rischio l’azienda.`, r: `Marta ti ringrazia in privato, senza fare nomi. Una scelta scomoda, ma pulita.`, eff: { rep: 3, energy: 0 } },
      ],
    },
    {
      id: 'training', title: `Workshop di negoziazione`, where: `Invito · lunedì 09:00`,
      scene: [
        { n: `L’azienda organizza una giornata interna di negoziazione con un trainer esterno. Posti limitati, partecipazione volontaria.` },
      ],
      choices: [
        { id: 'a', t: `Partecipo: la negoziazione si allena come un muscolo.`, r: `Esci con tre schemi nuovi e un’abitudine che non dimenticherai: nessun “give” senza un “get”.`, eff: { energy: 1, mods: { c: 4, v: 2 } } },
        { id: 'b', t: `Salto: ho una pipeline da lavorare.`, r: `Una settimana libera per i tuoi deal. Gli altri tornano con nuove frasi da sfoggiare.`, eff: {} },
      ],
    },
  ];

  /* applica l'effetto di una scelta evento; ritorna riepilogo testuale */
  CL.applyEvent = (run, ev, choiceId) => {
    const c = ev.choices.find((x) => x.id === choiceId);
    const e = c.eff || {};
    const log = [];
    if (e.energy) { run.spent += e.energy; log.push(`−${e.energy} settimana`); }
    if (e.rep) { run.rep = CL.clamp(run.rep + e.rep, 0, 100); log.push(`${e.rep > 0 ? '+' : '−'}${Math.abs(e.rep)} reputazione`); }
    if (e.jolly) Object.keys(e.jolly).forEach((k) => { run.jolly[k] += e.jolly[k]; log.push(`+${e.jolly[k]} ${CL.JOLLY[k].name}`); });
    if (e.mods) {
      run.mods = run.mods || {};
      const lab = { t: 'Fiducia', v: 'Valore', u: 'Urgenza', c: 'Controllo', r: 'Rischio' };
      Object.keys(e.mods).forEach((k) => { run.mods[k] = (run.mods[k] || 0) + e.mods[k]; log.push(`${e.mods[k] > 0 ? '+' : '−'}${Math.abs(e.mods[k])} ${lab[k]} di partenza`); });
    }
    let quick = null;
    if (e.quick) {
      const win = run.rnd() < e.quick.p;
      quick = { win, acv: win ? e.quick.acv : 0 };
      if (win) { run.bonusAcv += e.quick.acv; run.bonusDeals.push({ label: ev.title, acv: e.quick.acv }); log.push(`+${CL.fmtK(e.quick.acv)} chiusi`); }
      else log.push(`la PMI rimanda`);
    }
    run.eventsSeen[ev.id] = true;
    run.eventLog.push({ id: ev.id, choice: choiceId });
    return { text: c.r, log, quick };
  };

  CL.pickEvent = (run) => {
    if (run.mode !== 'career' || run.eventLog.length >= 3) return null;
    if (CL.energy(run) <= 1) return null;
    if (run.rnd() > 0.65) return null;
    const pool = CL.events.filter((e) => !run.eventsSeen[e.id]);
    if (!pool.length) return null;
    return pool[Math.floor(run.rnd() * pool.length)];
  };
})(typeof window !== 'undefined' ? window : globalThis);
