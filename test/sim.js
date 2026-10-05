// Simulazione headless: gioca N partite con giocatore passivo per verificare la stabilità del motore.
const path = require('path');
require(path.join(__dirname, '../js/data.js'));
require(path.join(__dirname, '../js/engine.js'));
require(path.join(__dirname, '../js/ai.js'));
const { GEO } = globalThis; const E = GEO.engine;

const games = +process.argv[2] || 3; const turns = +process.argv[3] || 40;
let fails = 0;
for (let g = 0; g < games; g++) {
  const player = GEO.NATIONS[g % GEO.NATIONS.length].id;
  const s = E.newGame({ player, difficulty: 'normale', length: turns, seed: 1000 + g });
  try {
    for (let t = 0; t < turns && !s.gameOver; t++) {
      // giocatore: risponde a caso alle proposte, sceglie opzione 0 degli eventi, a volte fa cose
      while (s.pendingEvents.length) E.resolveEvent(s, 0, 0);
      s.pending.slice().forEach(p => E.answerProposal(s, p.id, E.rand() < 0.5));
      if (t === 2) E.trade(s, 'S:DEF', 20);
      if (t === 3) E.propose(s, player, GEO.NATIONS[(g + 1) % GEO.NATIONS.length].id, 'commercio');
      if (t === 10) E.trade(s, 'S:DEF', -10);
      E.endTurn(s);
      // invarianti
      for (const id of E.ids(s)) { const n = s.nations[id]; if (!(n.gdp > 0) || isNaN(n.stability) || isNaN(n.army) || isNaN(n.treasury)) throw new Error(`NaN/invalid in ${id} turn ${t}: gdp=${n.gdp} stab=${n.stability} army=${n.army} treas=${n.treasury}`); }
      Object.values(s.market.indexes).forEach(i => { if (!(i.price > 0)) throw new Error('bad index'); });
      JSON.stringify(s);
    }
    const r = E.ranking(s).slice(0, 5).map(x => `${x.id}:${x.score}`).join(' ');
    console.log(`Partita ${g + 1} (${player}) ok — turno ${s.turn}, guerre attive ${s.wars.length}, news ${s.news.length}, nukes usate: ${s.news.filter(n => n.kind === 'nuke').length}, fine: ${s.gameOver ? s.gameOver.type : '-'}. Top5: ${r}`);
    const p = s.nations[player];
    console.log(`   ${player}: PIL ${Math.round(p.gdp)} stab ${p.stability.toFixed(0)} tesoro ${p.treasury.toFixed(0)} army ${p.army.toFixed(0)} tech ${JSON.stringify(p.tech)} debt ${p.debt.toFixed(0)} portafoglio ${E.portfolioValue(s).toFixed(1)}`);
  } catch (e) { fails++; console.error(`Partita ${g + 1} (${player}) FALLITA:`, e.stack); }
}
console.log(fails ? `${fails} partite fallite` : 'Tutte le simulazioni completate senza errori.');
process.exit(fails ? 1 : 0);
