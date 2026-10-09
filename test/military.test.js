#!/usr/bin/env node
// Test black-box dell'aggiudicatore militare in stile Diplomacy.
// Basati SOLO sulla specifica docs/military-engine.md (§3, §4, §5): usano esclusivamente
// GEO.military.setMap(nodes), GEO.military.resetMap() e GEO.military.adjudicate(units, orders, ctx).
// La mappa è un sottoinsieme sintetico della mappa classica di Diplomacy (SPA, STP e BUL con una sola costa).
// I casi sono ispirati al DATC (sezioni 6.A, 6.C, 6.D, 6.E, 6.F) più le regole specifiche del gioco (§5).
//
// Uso:   node test/military.test.js [filtro]
//        filtro opzionale: esegue solo i casi il cui codice o nome contiene il testo (es. "6.D", "guarnigione").
//        MILITARY_MODULE=percorso/modulo.js node test/military.test.js  per provare un'altra implementazione.
'use strict';
const path = require('path');

// ---------------------------------------------------------------------------------------------
// Caricamento del modulo
// ---------------------------------------------------------------------------------------------
const MODULE = process.env.MILITARY_MODULE
  ? path.resolve(process.env.MILITARY_MODULE)
  : path.join(__dirname, '..', 'js', 'military.js');
let M = null, loadError = null;
try {
  require(MODULE);
  M = globalThis.GEO && globalThis.GEO.military;
} catch (e) { loadError = e; }
if (!M || typeof M.adjudicate !== 'function' || typeof M.setMap !== 'function') {
  console.error('✗ impossibile usare GEO.military da ' + path.relative(process.cwd(), MODULE) +
    (loadError ? ': ' + String(loadError.message).split('\n')[0] : ': setMap/adjudicate assenti'));
  process.exit(1);
}

// ---------------------------------------------------------------------------------------------
// Mappa sintetica (sottoinsieme della mappa classica)
// ---------------------------------------------------------------------------------------------
// Mari e mari confinanti.
const SEA_ADJ = {
  NAO: ['NWG', 'IRI', 'MAO'],
  NWG: ['NAO', 'NTH'],
  NTH: ['NWG', 'SKA', 'HEL', 'ENG'],
  ENG: ['NTH', 'IRI', 'MAO'],
  IRI: ['NAO', 'MAO', 'ENG'],
  MAO: ['NAO', 'IRI', 'ENG', 'WES'],
  HEL: ['NTH'],
  SKA: ['NTH'],
  BAL: ['BOT'],
  BOT: ['BAL'],
  WES: ['MAO', 'LYO', 'TYS'],
  LYO: ['WES', 'TYS'],
  TYS: ['LYO', 'WES', 'ION'],
  ION: ['TYS', 'ADR', 'AEG', 'EAS'],
  ADR: ['ION'],
  AEG: ['ION', 'EAS'],
  EAS: ['ION', 'AEG'],
  BLA: [],
};
// Province costiere e mari su cui si affacciano.
const COAST_SEAS = {
  CLY: ['NAO', 'NWG'], EDI: ['NWG', 'NTH'], LVP: ['NAO', 'IRI'], YOR: ['NTH'], WAL: ['IRI', 'ENG'], LON: ['NTH', 'ENG'],
  NWY: ['NWG', 'NTH', 'SKA'], SWE: ['SKA', 'BAL', 'BOT'], FIN: ['BOT'], STP: ['BOT'], LVN: ['BAL', 'BOT'],
  PRU: ['BAL'], BER: ['BAL'], KIE: ['BAL', 'HEL'], DEN: ['HEL', 'NTH', 'SKA', 'BAL'], HOL: ['NTH', 'HEL'],
  BEL: ['NTH', 'ENG'], PIC: ['ENG'], BRE: ['ENG', 'MAO'], GAS: ['MAO'], SPA: ['MAO', 'WES', 'LYO'], POR: ['MAO'],
  MAR: ['LYO'], PIE: ['LYO'], TUS: ['LYO', 'TYS'], ROM: ['TYS'], NAP: ['TYS', 'ION'], APU: ['ADR', 'ION'],
  VEN: ['ADR'], TRI: ['ADR'], ALB: ['ADR', 'ION'], GRE: ['ION', 'AEG'], BUL: ['AEG', 'BLA'], CON: ['AEG', 'BLA'],
  SMY: ['AEG', 'EAS'], ANK: ['BLA'], ARM: ['BLA'], SEV: ['BLA'], RUM: ['BLA'],
};
// Confini terrestri (eserciti), liste complete: la simmetria viene verificata all'avvio.
const LAND_ADJ = {
  CLY: 'EDI LVP', EDI: 'CLY LVP YOR', LVP: 'CLY EDI YOR WAL', YOR: 'EDI LVP WAL LON', WAL: 'LVP YOR LON', LON: 'YOR WAL',
  NWY: 'SWE FIN STP', SWE: 'NWY FIN DEN', FIN: 'NWY SWE STP', STP: 'NWY FIN LVN MOS',
  DEN: 'SWE KIE', KIE: 'DEN HOL RUH MUN BER', BER: 'KIE MUN SIL PRU', PRU: 'BER SIL WAR LVN',
  LVN: 'PRU WAR MOS STP', MOS: 'STP LVN WAR UKR SEV', WAR: 'PRU SIL GAL UKR MOS LVN', UKR: 'WAR GAL RUM SEV MOS',
  SEV: 'UKR RUM ARM MOS', ARM: 'SEV ANK SMY', ANK: 'CON SMY ARM', SMY: 'CON ANK ARM', CON: 'BUL ANK SMY',
  BUL: 'RUM SER GRE CON', RUM: 'BUL SER BUD GAL UKR SEV', GRE: 'BUL SER ALB', ALB: 'TRI SER GRE',
  SER: 'BUD RUM BUL GRE ALB TRI', TRI: 'VEN TYR VIE BUD SER ALB', BUD: 'VIE GAL RUM SER TRI',
  VIE: 'BOH GAL BUD TRI TYR', GAL: 'BOH SIL WAR UKR RUM BUD VIE', BOH: 'MUN SIL GAL VIE TYR',
  SIL: 'BER PRU WAR GAL BOH MUN', MUN: 'KIE BER SIL BOH TYR BUR RUH', RUH: 'HOL KIE MUN BUR BEL',
  HOL: 'BEL RUH KIE', BEL: 'PIC BUR RUH HOL', PIC: 'BRE PAR BUR BEL', BRE: 'PIC PAR GAS', PAR: 'BRE PIC BUR GAS',
  BUR: 'PAR PIC BEL RUH MUN MAR GAS', GAS: 'BRE PAR BUR MAR SPA', MAR: 'GAS BUR PIE SPA', SPA: 'POR GAS MAR',
  POR: 'SPA', PIE: 'MAR TYR VEN TUS', TYR: 'MUN BOH VIE TRI VEN PIE', VEN: 'PIE TYR TRI APU ROM TUS',
  TUS: 'PIE VEN ROM', ROM: 'TUS VEN APU NAP', APU: 'VEN ROM NAP', NAP: 'ROM APU',
};
// Coppie di province costiere collegate per flotta (costa comune), come nella mappa classica.
const FLEET_COAST_PAIRS = (
  'CLY-EDI CLY-LVP EDI-YOR LVP-WAL YOR-LON WAL-LON NWY-SWE SWE-FIN SWE-DEN FIN-STP STP-LVN LVN-PRU PRU-BER ' +
  'BER-KIE KIE-DEN KIE-HOL HOL-BEL BEL-PIC PIC-BRE BRE-GAS GAS-SPA SPA-POR SPA-MAR MAR-PIE PIE-TUS TUS-ROM ' +
  'ROM-NAP NAP-APU APU-VEN VEN-TRI TRI-ALB ALB-GRE GRE-BUL BUL-CON BUL-RUM CON-SMY CON-ANK ANK-ARM ARM-SEV SEV-RUM'
).split(' ').map(s => s.split('-'));

function buildNodes() {
  const nodes = {};
  const landAdj = {};
  for (const [p, s] of Object.entries(LAND_ADJ)) landAdj[p] = s.split(' ');
  for (const s of Object.keys(SEA_ADJ)) {
    const coasts = Object.keys(COAST_SEAS).filter(c => COAST_SEAS[c].includes(s));
    nodes[s] = { kind: 'sea', armyAdj: [], fleetAdj: SEA_ADJ[s].concat(coasts) };
  }
  for (const p of Object.keys(landAdj)) {
    if (COAST_SEAS[p]) {
      const coastNb = FLEET_COAST_PAIRS.filter(pr => pr.includes(p)).map(pr => (pr[0] === p ? pr[1] : pr[0]));
      nodes[p] = { kind: 'coast', armyAdj: landAdj[p].slice(), fleetAdj: COAST_SEAS[p].concat(coastNb) };
    } else {
      nodes[p] = { kind: 'land', armyAdj: landAdj[p].slice(), fleetAdj: [] };
    }
  }
  return nodes;
}
const NODES = buildNodes();

// Autoverifica della mappa di test (un errore qui è un errore del test, non del modulo).
(function validateMap() {
  const errs = [];
  for (const [id, n] of Object.entries(NODES)) {
    for (const k of ['armyAdj', 'fleetAdj']) {
      for (const o of n[k]) {
        if (!NODES[o]) errs.push(`${id}.${k} -> ${o} inesistente`);
        else if (!NODES[o][k].includes(id)) errs.push(`${id}.${k} -> ${o} non simmetrico`);
      }
    }
    if (n.kind === 'sea' && n.armyAdj.length) errs.push(`${id}: un mare non ha adiacenze terrestri`);
    if (n.kind === 'land' && n.fleetAdj.length) errs.push(`${id}: una provincia interna non ha adiacenze navali`);
  }
  // Ogni coppia costiera per flotta deve essere confinante via terra e condividere un mare (§1).
  for (const [a, b] of FLEET_COAST_PAIRS) {
    if (!NODES[a].armyAdj.includes(b)) errs.push(`${a}-${b}: coppia navale non confinante`);
    if (!COAST_SEAS[a].some(s => COAST_SEAS[b].includes(s))) errs.push(`${a}-${b}: nessun mare in comune`);
  }
  // Viceversa: province costiere confinanti con un mare in comune devono essere collegate per flotta.
  for (const a of Object.keys(COAST_SEAS)) {
    for (const b of NODES[a].armyAdj) {
      if (COAST_SEAS[b] && COAST_SEAS[a].some(s => COAST_SEAS[b].includes(s)) && !NODES[a].fleetAdj.includes(b))
        errs.push(`${a}-${b}: mare in comune ma nessun collegamento navale`);
    }
  }
  if (errs.length) { console.error('✗ mappa di test incoerente:\n  ' + errs.join('\n  ')); process.exit(1); }
})();

M.setMap(NODES);

// ---------------------------------------------------------------------------------------------
// Notazione degli scenari
//   'ENG A LON - BEL'          movimento
//   'ENG A LON H'              mantenimento
//   'ENG A LON'                nessun ordine (vale hold)
//   'ENG F NTH S A LON - BEL'  supporto al movimento (target LON, to BEL)
//   'ENG F NTH S A LON'        supporto al mantenimento (to assente)
//   'ENG F NTH S A LON - LON'  supporto al mantenimento (to === target)
//   'ENG F NTH C A LON - BEL'  convoglio
// Attese:
//   moves:     insieme ESATTO dei movimenti riusciti 'DA-A'
//   dislodged: insieme ESATTO delle unità sloggiate 'PROVINCIA<ORIGINE_ATTACCANTE' (by = unità in ORIGINE)
//   results:   { PROVINCIA: valore | [valori ammessi] | '*' (non controllato) }
//   Default dei risultati non indicati: movimento riuscito 'ok'; movimento fallito 'bounced';
//   hold 'ok'; ordine mancante 'ok' (o assente); sloggiata 'dislodged' (oppure, se aveva un ordine
//   attivo, il risultato di quell'ordine: 'bounced' per movimento, 'cut' per supporto, 'void' per convoglio).
// ---------------------------------------------------------------------------------------------
function parseLine(line) {
  const tk = line.trim().split(/\s+/);
  const [owner, type, loc, ...rest] = tk;
  if (!owner || (type !== 'A' && type !== 'F') || !NODES[loc]) throw new Error('riga non valida: ' + line);
  let order = null;
  if (rest.length === 0) order = null;
  else if (rest[0] === 'H') order = { type: 'hold' };
  else if (rest[0] === '-') order = { type: 'move', to: rest[1] };
  else if (rest[0] === 'S') {
    order = { type: 'support', target: rest[2] };
    if (rest[3] === '-') order.to = rest[4];
  } else if (rest[0] === 'C') order = { type: 'convoy', from: rest[2], to: rest[4] };
  else throw new Error('ordine non riconosciuto: ' + line);
  return { owner, type, loc, order };
}

function build(sc) {
  const units = [], orders = {}, byLoc = {}, info = {};
  sc.units.forEach((line, i) => {
    const p = parseLine(line);
    if (byLoc[p.loc]) throw new Error('due unità in ' + p.loc);
    const u = { id: i + 1, owner: p.owner, type: p.type, loc: p.loc };
    if ((sc.suppressed || []).includes(p.loc)) u.suppressed = true;
    units.push(u); byLoc[p.loc] = u; info[p.loc] = p;
    if (p.order) orders[u.id] = Object.assign({ unit: u.id }, p.order);
  });
  return { units, orders, byLoc, info };
}

const pairKey = (a, b) => [a, b].sort().join('|');
function makeCtx(opt, byLoc) {
  opt = opt || {}; byLoc = byLoc || {};
  const peace = new Set((opt.peace || []).map(([a, b]) => pairKey(a, b)));
  const atWar = (a, b) => a !== b && !peace.has(pairKey(a, b));
  const byId = obj => {
    const o = {};
    for (const [loc, v] of Object.entries(obj || {})) {
      if (!byLoc[loc]) throw new Error('bonus per provincia senza unità: ' + loc);
      o[byLoc[loc].id] = v;
    }
    return o;
  };
  const hold = byId(opt.holdBonus), atk = byId(opt.attackBonus), air = byId(opt.airBonus);
  const gar = opt.garrison || {};
  const uid = u => (u && typeof u === 'object' ? u.id : u);
  const ctx = {
    atWar,
    friendly: (a, b) => a === b || !atWar(a, b),
    canEnter: opt.canEnter || (() => true),
    holdBonus: u => hold[uid(u)] || 0,
    attackBonus: (u /* , to */) => atk[uid(u)] || 0,
    airBonus: air,
    garrison: p => (gar[p] ? Object.assign({}, gar[p]) : null),
  };
  if (opt.graph) ctx.graph = { node: id => opt.graph[id] || null };
  return ctx;
}

function runScenario(sc) {
  const b = build(sc);
  const ctx = makeCtx(sc, b.byLoc);
  const r = M.adjudicate(b.units, b.orders, ctx);
  return { b, r, ctx };
}

const fmt = v => (Array.isArray(v) ? (v.length === 1 ? fmtOne(v[0]) : v.map(fmtOne).join(' | ')) : fmtOne(v));
const fmtOne = v => (v === undefined ? '(assente)' : JSON.stringify(v));
const fmtSet = a => '[' + a.slice().sort().join(', ') + ']';

function shapeErrors(r) {
  const errs = [];
  if (!r || typeof r !== 'object') return ['adjudicate non ha restituito un oggetto'];
  if (!r.results || typeof r.results !== 'object') errs.push('results assente');
  if (!Array.isArray(r.dislodged)) errs.push('dislodged non è un array');
  if (!Array.isArray(r.moves)) errs.push('moves non è un array');
  if (!Array.isArray(r.events)) errs.push('events non è un array');
  return errs;
}

function cmpSet(label, expected, got, errs) {
  const e = expected.slice().sort(), g = got.slice().sort();
  if (e.length !== g.length || e.some((x, i) => x !== g[i]))
    errs.push(`${label} — atteso: ${fmtSet(expected)}  ottenuto: ${fmtSet(got)}`);
}

const ALT_WHEN_DISLODGED = { move: ['bounced'], support: ['cut'], convoy: ['void'], hold: [], none: [] };

function checkScenario(sc) {
  const { b, r } = runScenario(sc);
  const errs = shapeErrors(r);
  if (errs.length) return errs;
  const locOf = {};
  b.units.forEach(u => { locOf[String(u.id)] = u.loc; });

  // Movimenti riusciti
  const gotMoves = r.moves.map(m => `${m && m.from}-${m && m.to}`);
  for (const m of r.moves) {
    if (!m || locOf[String(m.unitId)] !== m.from)
      errs.push(`moves: la voce ${JSON.stringify(m)} non corrisponde all'unità che si trovava in "from"`);
  }
  cmpSet('movimenti riusciti', sc.moves || [], gotMoves, errs);

  // Unità sloggiate (si ignorano eventuali voci senza unitId, come una guarnigione implicita)
  const real = r.dislodged.filter(d => d && d.unitId != null);
  const gotDis = real.map(d => `${locOf[String(d.unitId)] || '?' + d.unitId}<${d.from}`);
  cmpSet('unità sloggiate (provincia<origine attaccante)', sc.dislodged || [], gotDis, errs);
  for (const d of real) {
    const loc = locOf[String(d.unitId)];
    if (!loc) continue;
    if (d.loc !== loc) errs.push(`dislodged ${loc}: loc atteso ${JSON.stringify(loc)}, ottenuto ${JSON.stringify(d.loc)}`);
    if ((sc.dislodged || []).includes(`${loc}<${d.from}`)) {
      const att = b.byLoc[d.from];
      if (!att || String(d.by) !== String(att.id))
        errs.push(`dislodged ${loc}: by atteso ${att ? att.id : null} (unità in ${d.from}), ottenuto ${JSON.stringify(d.by)}`);
    }
  }

  // Risultati per unità
  const moved = new Set((sc.moves || []).map(s => s.split('-')[0]));
  const disl = new Set((sc.dislodged || []).map(s => s.split('<')[0]));
  for (const u of b.units) {
    const p = b.info[u.loc];
    const kind = p.order ? p.order.type : 'none';
    let exp;
    if (sc.results && Object.prototype.hasOwnProperty.call(sc.results, u.loc)) exp = sc.results[u.loc];
    else if (disl.has(u.loc)) exp = ['dislodged'].concat(ALT_WHEN_DISLODGED[kind]);
    else if (moved.has(u.loc)) exp = 'ok';
    else if (kind === 'move') exp = 'bounced';
    else if (kind === 'hold') exp = 'ok';
    else if (kind === 'none') exp = ['ok', undefined];
    else continue;
    if (exp === '*') continue;
    const okVals = Array.isArray(exp) ? exp : [exp];
    const got = r.results[u.id];
    if (!okVals.includes(got))
      errs.push(`risultato ${u.loc} (${p.owner} ${u.type}${p.order ? ' ' + p.order.type : ''}) — atteso: ${fmt(okVals)}  ottenuto: ${fmtOne(got)}`);
  }
  if (typeof sc.check === 'function') errs.push(...(sc.check(r, b) || []));
  return errs;
}

// ---------------------------------------------------------------------------------------------
// Registro dei casi
// ---------------------------------------------------------------------------------------------
const CASES = [];
let currentSection = '';
const section = title => { currentSection = title; };
const S = (code, name, sc) => CASES.push({ code, name, section: currentSection, run: () => checkScenario(sc), sc });
const T = (code, name, fn) => CASES.push({ code, name, section: currentSection, run: fn });

// ============================================================================================
section('6.A — Movimenti di base e validità');
// ============================================================================================
S('A.01', 'Movimento semplice verso provincia vuota', {
  units: ['GER A MUN - RUH'], moves: ['MUN-RUH'],
});
S('6.A.1', 'Movimento verso provincia non adiacente: invalid', {
  units: ['ENG F NTH - PIC'], moves: [], results: { NTH: 'invalid' },
});
S('6.A.2', 'Esercito che non può entrare in mare: invalid', {
  units: ['ENG A LVP - IRI'], moves: [], results: { LVP: 'invalid' },
});
S('6.A.3', 'Flotta che non può entrare in provincia interna: invalid', {
  units: ['GER F KIE - MUN'], moves: [], results: { KIE: 'invalid' },
});
S('6.A.4', 'Movimento verso la propria provincia: invalid', {
  units: ['GER F KIE - KIE'], moves: [], results: { KIE: 'invalid' },
});
S('6.A.7', 'Solo gli eserciti possono essere convogliati', {
  units: ['ENG F LON - BEL', 'ENG F NTH C A LON - BEL'], moves: [],
  results: { LON: 'invalid', NTH: ['invalid', 'void'] },
});
S('6.A.8', 'Supporto al mantenimento di se stessi non ammesso', {
  units: ['ITA A VEN - TRI', 'ITA A TYR S A VEN - TRI', 'AUS F TRI S F TRI'],
  moves: ['VEN-TRI'], dislodged: ['TRI<VEN'], results: { TRI: ['dislodged', 'invalid'], TYR: 'ok' },
});
S('6.A.9', 'Le flotte devono seguire la costa (ROM-VEN senza mare comune)', {
  units: ['ITA F ROM - VEN'], moves: [], results: { ROM: 'invalid' },
});
S('6.A.10', 'Supporto verso destinazione irraggiungibile: invalid', {
  units: ['AUS A VEN H', 'ITA F ROM S A APU - VEN', 'ITA A APU - VEN'], moves: [], results: { ROM: 'invalid' },
});
S('6.A.11', 'Rimbalzo semplice: stallo a parità, la provincia resta vuota', {
  units: ['AUS A VIE - TYR', 'ITA A VEN - TYR'], moves: [],
});
S('6.A.12', 'Rimbalzo di tre unità', {
  units: ['AUS A VIE - TYR', 'GER A MUN - TYR', 'ITA A VEN - TYR'], moves: [],
});
S('A.02', 'Stallo nella provincia appena lasciata: resta vuota', {
  units: ['ITA A TYR - PIE', 'AUS A VIE - TYR', 'GER A MUN - TYR'], moves: ['TYR-PIE'],
});
S('A.03', 'Ordine mancante vale hold', {
  units: ['GER A MUN', 'FRA A BUR - MUN'], moves: [],
});
S('A.04', 'Ordine non valido diventa hold e può ricevere supporto al mantenimento', {
  units: ['ITA A VEN - ADR', 'ITA A TYR S A VEN', 'AUS A TRI - VEN', 'AUS F ADR S A TRI - VEN'],
  moves: [], results: { VEN: 'invalid', TYR: 'ok', ADR: 'ok' },
});
S('A.05', "Evento 'invalid' con motivo e proprietario", {
  units: ['ENG A LVP - IRI'], moves: [], results: { LVP: 'invalid' },
  check: (r, b) => {
    const id = String(b.byLoc.LVP.id);
    const ev = r.events.find(e => e && e.type === 'invalid' && String(e.unit) === id);
    if (!ev) return [`nessun evento {type:'invalid', unit:${id}} — eventi ottenuti: ${JSON.stringify(r.events)}`];
    const errs = [];
    if (typeof ev.reason !== 'string' || !ev.reason.trim()) errs.push(`evento invalid senza motivo: ${JSON.stringify(ev)}`);
    if (ev.owner !== 'ENG') errs.push(`evento invalid: owner atteso "ENG", ottenuto ${fmtOne(ev.owner)}`);
    return errs;
  },
});

// ============================================================================================
section('6.C — Movimenti circolari e catene');
// ============================================================================================
S('6.C.1', 'Movimento circolare a tre', {
  units: ['TUR F ANK - CON', 'TUR A CON - SMY', 'TUR A SMY - ANK'],
  moves: ['ANK-CON', 'CON-SMY', 'SMY-ANK'],
});
S('6.C.2', 'Movimento circolare a tre con supporto', {
  units: ['TUR F ANK - CON', 'TUR A CON - SMY', 'TUR A SMY - ANK', 'TUR A BUL S F ANK - CON'],
  moves: ['ANK-CON', 'CON-SMY', 'SMY-ANK'], results: { BUL: 'ok' },
});
S('6.C.3', 'Movimento circolare con un elemento bloccato', {
  units: ['TUR F ANK - CON', 'TUR A CON - SMY', 'TUR A SMY - ANK', 'TUR A BUL - CON'], moves: [],
});
S('6.C.4', 'Movimento circolare con convoglio attaccato (non sloggiato)', {
  units: ['AUS A TRI - SER', 'AUS A SER - BUL', 'TUR A BUL - TRI', 'TUR F AEG C A BUL - TRI',
    'TUR F ION C A BUL - TRI', 'TUR F ADR C A BUL - TRI', 'ITA F NAP - ION'],
  moves: ['TRI-SER', 'SER-BUL', 'BUL-TRI'],
});
S('6.C.5', 'Movimento circolare interrotto da una flotta del convoglio sloggiata', {
  units: ['AUS A TRI - SER', 'AUS A SER - BUL', 'TUR A BUL - TRI', 'TUR F AEG C A BUL - TRI',
    'TUR F ION C A BUL - TRI', 'TUR F ADR C A BUL - TRI', 'ITA F NAP - ION', 'ITA F APU S F NAP - ION'],
  moves: ['NAP-ION'], dislodged: ['ION<NAP'], results: { BUL: ['bounced', 'void'], APU: 'ok' },
});
S('6.C.6', 'Scambio di due eserciti tramite due convogli', {
  units: ['ENG F NTH C A LON - BEL', 'ENG A LON - BEL', 'FRA F ENG C A BEL - LON', 'FRA A BEL - LON'],
  moves: ['LON-BEL', 'BEL-LON'],
});
S('6.C.7', 'Scambio via convoglio interrotto da un terzo esercito', {
  units: ['ENG F NTH C A LON - BEL', 'ENG A LON - BEL', 'FRA F ENG C A BEL - LON', 'FRA A BEL - LON',
    'FRA A BUR - BEL'],
  moves: [],
});
S('C.01', 'Catena di movimenti (ognuno entra nella provincia lasciata)', {
  units: ['AUS A BOH - GAL', 'AUS A GAL - UKR', 'GER A MUN - BOH'],
  moves: ['BOH-GAL', 'GAL-UKR', 'MUN-BOH'],
});
S('C.02', 'Catena di movimenti con la testa bloccata: nessuno si muove', {
  units: ['AUS A BOH - GAL', 'AUS A GAL - UKR', 'GER A MUN - BOH', 'RUS A UKR H'], moves: [],
});

// ============================================================================================
section('6.D — Supporti e sloggiamenti');
// ============================================================================================
S('D.01', 'Supporto al movimento', {
  units: ['AUS A TRI - VEN', 'AUS F ADR S A TRI - VEN', 'ITA A VEN H'],
  moves: ['TRI-VEN'], dislodged: ['VEN<TRI'], results: { ADR: 'ok' },
});
S('6.D.1', 'Il supporto al mantenimento impedisce lo sloggiamento', {
  units: ['AUS F ADR S A TRI - VEN', 'AUS A TRI - VEN', 'ITA A VEN H', 'ITA A TYR S A VEN'],
  moves: [], results: { TYR: 'ok', ADR: 'ok' },
});
S('D.02', 'Supporto al mantenimento espresso con to === target', {
  units: ['AUS F ADR S A TRI - VEN', 'AUS A TRI - VEN', 'ITA A VEN H', 'ITA A TYR S A VEN - VEN'],
  moves: [], results: { TYR: 'ok' },
});
S('6.D.2', 'Un movimento taglia il supporto al mantenimento', {
  units: ['AUS F ADR S A TRI - VEN', 'AUS A TRI - VEN', 'AUS A VIE - TYR', 'ITA A VEN H', 'ITA A TYR S A VEN'],
  moves: ['TRI-VEN'], dislodged: ['VEN<TRI'], results: { TYR: 'cut', ADR: 'ok' },
});
S('6.D.3', 'Un movimento taglia il supporto al movimento', {
  units: ['AUS F ADR S A TRI - VEN', 'AUS A TRI - VEN', 'ITA A VEN H', 'ITA F ION - ADR'],
  moves: [], results: { ADR: 'cut' },
});
S('6.D.4', "Supporto al mantenimento di un'unità che supporta un mantenimento", {
  units: ['GER A BER S F KIE', 'GER F KIE S A BER', 'RUS F BAL S A PRU - BER', 'RUS A PRU - BER'],
  moves: [], results: { BER: 'cut', KIE: 'ok', BAL: 'ok' },
});
S('6.D.5', "Supporto al mantenimento di un'unità che supporta un movimento", {
  units: ['GER A BER S A MUN - SIL', 'GER F KIE S A BER', 'GER A MUN - SIL', 'RUS F BAL S A PRU - BER', 'RUS A PRU - BER'],
  moves: ['MUN-SIL'], results: { BER: 'cut', KIE: 'ok' },
});
S('6.D.6', "Supporto al mantenimento di una flotta che convoglia", {
  units: ['GER A BER - SWE', 'GER F BAL C A BER - SWE', 'GER F PRU S F BAL', 'RUS F LVN - BAL', 'RUS F BOT S F LVN - BAL'],
  moves: ['BER-SWE'], results: { PRU: 'ok' },
});
S('6.D.7', "Il supporto al mantenimento non vale per un'unità che si muove", {
  units: ['GER F BAL - SWE', 'GER F PRU S F BAL', 'RUS F LVN - BAL', 'RUS F BOT S F LVN - BAL', 'RUS A FIN - SWE'],
  moves: ['LVN-BAL'], dislodged: ['BAL<LVN'], results: { PRU: '*' },
});
S('6.D.9', "Il supporto al movimento non vale per un'unità che resta ferma", {
  units: ['ITA A VEN - TRI', 'ITA A TYR S A VEN - TRI', 'AUS A ALB S A TRI - SER', 'AUS A TRI H'],
  moves: ['VEN-TRI'], dislodged: ['TRI<VEN'], results: { ALB: '*' },
});
S('6.D.10', 'Un\'unità non può sloggiare un\'unità della propria nazione', {
  units: ['GER A BER H', 'GER F KIE - BER', 'GER A MUN S F KIE - BER'], moves: [],
});
S('6.D.11', 'Nessun auto-sloggiamento di un\'unità che resta per un rimbalzo', {
  units: ['GER A BER - PRU', 'GER F KIE - BER', 'GER A MUN S F KIE - BER', 'RUS A WAR - PRU'], moves: [],
});
S('6.D.12', 'Il supporto non conta contro la propria unità', {
  units: ['AUS F TRI H', 'AUS A VIE S A VEN - TRI', 'ITA A VEN - TRI'], moves: [], results: { VIE: '*' },
});
S('6.D.13', 'Il supporto non conta contro la propria unità rimasta per un rimbalzo', {
  units: ['AUS F TRI - ADR', 'AUS A VIE S A VEN - TRI', 'ITA A VEN - TRI', 'ITA F APU - ADR'],
  moves: [], results: { VIE: '*' },
});
S('6.D.14', 'Il supporto straniero non basta a evitare lo sloggiamento', {
  units: ['AUS F TRI H', 'AUS A VIE S A VEN - TRI', 'ITA A VEN - TRI', 'ITA A TYR S A VEN - TRI', 'ITA F ADR S A VEN - TRI'],
  moves: ['VEN-TRI'], dislodged: ['TRI<VEN'], results: { VIE: '*' },
});
S('6.D.15', 'Eccezione del taglio: il difensore non taglia il supporto contro se stesso', {
  units: ['RUS F CON S F BLA - ANK', 'RUS F BLA - ANK', 'TUR F ANK - CON'],
  moves: ['BLA-ANK'], dislodged: ['ANK<BLA'], results: { CON: 'ok' },
});
S('6.D.16', 'Convogliare un esercito che sloggia un\'unità della stessa nazione del convoglio', {
  units: ['ENG A LON H', 'ENG F NTH C A BEL - LON', 'FRA F ENG S A BEL - LON', 'FRA A BEL - LON'],
  moves: ['BEL-LON'], dislodged: ['LON<BEL'], results: { NTH: '*' },
});
S('6.D.17', 'Il supportante sloggiato perde il supporto', {
  units: ['RUS F CON S F BLA - ANK', 'RUS F BLA - ANK', 'TUR F ANK - CON', 'TUR A SMY S F ANK - CON', 'TUR A ARM - ANK'],
  moves: ['ANK-CON'], dislodged: ['CON<ANK'], results: { SMY: 'ok' },
});
S('6.D.18', 'Un supportante che sopravvive mantiene il supporto', {
  units: ['RUS F CON S F BLA - ANK', 'RUS F BLA - ANK', 'RUS A BUL S F CON', 'TUR F ANK - CON',
    'TUR A SMY S F ANK - CON', 'TUR A ARM - ANK'],
  moves: ['BLA-ANK'], dislodged: ['ANK<BLA'], results: { CON: 'ok', BUL: 'ok' },
});
S('6.D.20', 'Un\'unità non taglia il supporto della propria nazione', {
  units: ['ENG F LON S F NTH - ENG', 'ENG F NTH - ENG', 'ENG A YOR - LON', 'FRA F ENG H'],
  moves: ['NTH-ENG'], dislodged: ['ENG<NTH'], results: { LON: 'ok' },
});
S('6.D.21', 'Lo sloggiamento del tagliatore non annulla il taglio del supporto', {
  units: ['AUS F TRI H', 'ITA A VEN - TRI', 'ITA A TYR S A VEN - TRI', 'GER A MUN - TYR',
    'RUS A SIL - MUN', 'RUS A BER S A SIL - MUN'],
  moves: ['SIL-MUN'], dislodged: ['MUN<SIL'], results: { TYR: 'cut' },
});
S('6.D.22', 'Un movimento impossibile di flotta non può essere supportato', {
  units: ['GER F KIE - MUN', 'GER A BUR S F KIE - MUN', 'RUS A MUN - KIE', 'RUS A BER S A MUN - KIE'],
  moves: ['MUN-KIE'], dislodged: ['KIE<MUN'], results: { KIE: ['dislodged', 'invalid'], BUR: '*' },
});
S('6.D.24', 'Un movimento impossibile di esercito (in mare) non può essere supportato', {
  units: ['FRA A MAR - LYO', 'FRA F SPA S A MAR - LYO', 'ITA F LYO H', 'TUR F TYS S F WES - LYO', 'TUR F WES - LYO'],
  moves: ['WES-LYO'], dislodged: ['LYO<WES'], results: { MAR: 'invalid', SPA: '*' },
});
S('6.D.33', 'Supporto non richiesto ammesso', {
  units: ['AUS A SER - BUD', 'AUS A VIE - BUD', 'RUS A GAL S A SER - BUD', 'TUR A BUL - SER'],
  moves: ['SER-BUD', 'BUL-SER'], results: { GAL: 'ok' },
});
S('6.D.34', 'Supporto verso la propria provincia non ammesso', {
  units: ['GER A BER - PRU', 'GER A SIL S A BER - PRU', 'GER F BAL S A BER - PRU', 'ITA A PRU S A LVN - PRU',
    'RUS A WAR S A LVN - PRU', 'RUS A LVN - PRU'],
  moves: ['BER-PRU'], dislodged: ['PRU<BER'], results: { PRU: ['dislodged', 'invalid'] },
});

// ============================================================================================
section('6.E — Scontri frontali e guarnigioni assediate');
// ============================================================================================
S('E.01', 'Scontro frontale senza supporto: entrambi restano', {
  units: ['GER A MUN - BOH', 'AUS A BOH - MUN'], moves: [],
});
S('E.02', 'Scontro frontale con supporto: il perdente è sloggiato', {
  units: ['GER A MUN - BOH', 'GER A SIL S A MUN - BOH', 'AUS A BOH - MUN'],
  moves: ['MUN-BOH'], dislodged: ['BOH<MUN'], results: { SIL: 'ok' },
});
S('6.E.1', "L'unità sloggiata nello scontro frontale non ha effetto sulla provincia dell'attaccante", {
  units: ['GER A BER - PRU', 'GER F KIE - BER', 'GER A SIL S A BER - PRU', 'RUS A PRU - BER'],
  moves: ['BER-PRU', 'KIE-BER'], dislodged: ['PRU<BER'],
});
S('6.E.2', 'Nessun auto-sloggiamento nello scontro frontale', {
  units: ['GER A BER - KIE', 'GER F KIE - BER', 'GER A MUN S A BER - KIE'], moves: [],
});
S('6.E.3', 'Nessun aiuto a sloggiare la propria unità', {
  units: ['GER A BER - KIE', 'GER A MUN S F KIE - BER', 'ENG F KIE - BER'], moves: [], results: { MUN: '*' },
});
S('6.E.4', 'Il perdente non sloggiato ha ancora effetto', {
  units: ['GER F HOL - NTH', 'GER F HEL S F HOL - NTH', 'GER F SKA S F HOL - NTH', 'FRA F NTH - HOL',
    'FRA F BEL S F NTH - HOL', 'ENG F EDI S F NWG - NTH', 'ENG F YOR S F NWG - NTH', 'ENG F NWG - NTH',
    'AUS A KIE S A RUH - HOL', 'AUS A RUH - HOL'],
  moves: [],
});
S('6.E.5', 'Il perdente sloggiato da un altro esercito ha ancora effetto', {
  units: ['GER F HOL - NTH', 'GER F HEL S F HOL - NTH', 'GER F SKA S F HOL - NTH', 'FRA F NTH - HOL',
    'FRA F BEL S F NTH - HOL', 'ENG F EDI S F NWG - NTH', 'ENG F YOR S F NWG - NTH', 'ENG F NWG - NTH',
    'ENG F LON S F NWG - NTH', 'AUS A KIE S A RUH - HOL', 'AUS A RUH - HOL'],
  moves: ['NWG-NTH'], dislodged: ['NTH<NWG'],
});
S('6.E.6', 'Non sloggiato a causa del proprio supporto: ha ancora effetto', {
  units: ['GER F HOL - NTH', 'GER F HEL S F HOL - NTH', 'FRA F NTH - HOL', 'FRA F BEL S F NTH - HOL',
    'FRA F ENG S F HOL - NTH', 'AUS A KIE S A RUH - HOL', 'AUS A RUH - HOL'],
  moves: [], results: { ENG: '*' },
});
S('E.03', 'Guarnigione assediata: due attacchi uguali si annullano', {
  units: ['AUS A BOH H', 'GER A MUN - BOH', 'GER A SIL S A MUN - BOH', 'RUS A GAL - BOH', 'RUS A VIE S A GAL - BOH'],
  moves: [],
});
S('6.E.7', 'Guarnigione assediata senza auto-sloggiamento', {
  units: ['ENG F NTH H', 'ENG F YOR S F NWY - NTH', 'GER F HOL S F HEL - NTH', 'GER F HEL - NTH',
    'RUS F SKA S F NWY - NTH', 'RUS F NWY - NTH'],
  moves: [], results: { YOR: '*' },
});
S('6.E.8', 'Guarnigione assediata con scontro frontale senza auto-sloggiamento', {
  units: ['ENG F NTH - NWY', 'ENG F YOR S F NWY - NTH', 'GER F HOL S F HEL - NTH', 'GER F HEL - NTH',
    'RUS F SKA S F NWY - NTH', 'RUS F NWY - NTH'],
  moves: [], results: { YOR: '*' },
});
S('6.E.9', 'Quasi auto-sloggiamento: la guarnigione se ne va', {
  units: ['ENG F NTH - NWG', 'ENG F YOR S F NWY - NTH', 'GER F HOL S F HEL - NTH', 'GER F HEL - NTH',
    'RUS F SKA S F NWY - NTH', 'RUS F NWY - NTH'],
  moves: ['NTH-NWG', 'NWY-NTH'],
});
S('6.E.12', 'Il supporto contro la propria unità serve comunque a contendere', {
  units: ['AUS A BUD - RUM', 'AUS A SER S A VIE - BUD', 'ITA A VIE - BUD', 'RUS A GAL - BUD', 'RUS A RUM S A GAL - BUD'],
  moves: [], results: { RUM: 'ok', SER: '*' },
});
S('6.E.13', 'Guarnigione assediata da tre nazioni', {
  units: ['ENG F EDI S F YOR - NTH', 'ENG F YOR - NTH', 'FRA F BEL - NTH', 'FRA F ENG S F BEL - NTH',
    'GER F NTH H', 'RUS F NWG - NTH', 'RUS F NWY S F NWG - NTH'],
  moves: [],
});
S('6.E.14', 'Uno scontro frontale illegale difende comunque', {
  units: ['ENG A LVP - EDI', 'RUS F EDI - LVP'], moves: [], results: { EDI: 'invalid' },
});
S('6.E.15', 'Scontro frontale "amichevole" con supporti incrociati', {
  units: ['ENG F HOL S A RUH - KIE', 'ENG A RUH - KIE', 'FRA A KIE - BER', 'FRA A MUN S A KIE - BER',
    'FRA A SIL S A KIE - BER', 'GER A BER - KIE', 'GER F DEN S A BER - KIE', 'GER F HEL S A BER - KIE',
    'RUS F BAL S A PRU - BER', 'RUS A PRU - BER'],
  moves: [],
});

// ============================================================================================
section('6.F — Convogli');
// ============================================================================================
S('F.01', 'Convoglio semplice', {
  units: ['ENG A LON - HOL', 'ENG F NTH C A LON - HOL'], moves: ['LON-HOL'],
});
S('F.02', 'Convoglio a più flotte (ENG + NTH)', {
  units: ['FRA A BRE - DEN', 'FRA F ENG C A BRE - DEN', 'FRA F NTH C A BRE - DEN'], moves: ['BRE-DEN'],
});
S('F.03', 'Convoglio interrotto: la flotta viene sloggiata', {
  units: ['ENG A LON - HOL', 'ENG F NTH C A LON - HOL', 'GER F SKA - NTH', 'GER F HEL S F SKA - NTH'],
  moves: ['SKA-NTH'], dislodged: ['NTH<SKA'], results: { LON: ['bounced', 'void'], HEL: 'ok' },
});
S('F.04', 'Convoglio a più flotte interrotto: la flotta intermedia viene sloggiata', {
  units: ['FRA A BRE - DEN', 'FRA F ENG C A BRE - DEN', 'FRA F NTH C A BRE - DEN', 'GER F SKA - NTH', 'GER F HEL S F SKA - NTH'],
  moves: ['SKA-NTH'], dislodged: ['NTH<SKA'], results: { BRE: ['bounced', 'void'] },
});
S('F.05', 'Esercito non adiacente senza flotte che convogliano: non si muove', {
  units: ['ENG A LON - HOL', 'ENG F NTH H'], moves: [], results: { LON: ['invalid', 'bounced', 'void'] },
});
S('F.06', 'Convoglio verso provincia interna: ordine di convoglio invalid', {
  units: ['ENG A LON - RUH', 'ENG F NTH C A LON - RUH'], moves: [],
  results: { LON: ['invalid', 'bounced', 'void'], NTH: 'invalid' },
});
S('6.F.1', 'Nessun convoglio da flotte in province costiere', {
  units: ['TUR A GRE - SEV', 'TUR F AEG C A GRE - SEV', 'TUR F CON C A GRE - SEV', 'TUR F BLA C A GRE - SEV'],
  moves: [], results: { GRE: ['invalid', 'bounced', 'void'], CON: 'invalid', AEG: '*', BLA: '*' },
});
S('6.F.2', 'Un esercito convogliato può rimbalzare', {
  units: ['ENG F ENG C A LON - BRE', 'ENG A LON - BRE', 'FRA A PAR - BRE'], moves: [],
});
S('6.F.3', 'Un esercito convogliato può ricevere supporto', {
  units: ['ENG F ENG C A LON - BRE', 'ENG A LON - BRE', 'ENG F MAO S A LON - BRE', 'FRA A PAR - BRE'],
  moves: ['LON-BRE'], results: { MAO: 'ok' },
});
S('6.F.4', 'Attacco a una flotta del convoglio: il convoglio non è interrotto', {
  units: ['ENG F NTH C A LON - HOL', 'ENG A LON - HOL', 'GER F SKA - NTH'], moves: ['LON-HOL'],
});
S('6.F.5', 'Convoglio assediato non interrotto', {
  units: ['ENG F NTH C A LON - HOL', 'ENG A LON - HOL', 'FRA F ENG - NTH', 'FRA F BEL S F ENG - NTH',
    'GER F SKA - NTH', 'GER F DEN S F SKA - NTH'],
  moves: ['LON-HOL'],
});
S('6.F.6', 'Un convoglio sloggiato non taglia il supporto', {
  units: ['ENG F NTH C A LON - HOL', 'ENG A LON - HOL', 'GER A HOL S A BEL', 'GER A BEL S A HOL',
    'GER F HEL S F SKA - NTH', 'GER F SKA - NTH', 'FRA A PIC - BEL', 'FRA A BUR S A PIC - BEL'],
  moves: ['SKA-NTH'], dislodged: ['NTH<SKA'], results: { LON: ['bounced', 'void'], HOL: 'ok', BEL: 'cut' },
});
S('6.F.8', 'Un convoglio sloggiato non causa rimbalzo', {
  units: ['ENG F NTH C A LON - HOL', 'ENG A LON - HOL', 'GER F HEL S F SKA - NTH', 'GER F SKA - NTH', 'GER A BEL - HOL'],
  moves: ['SKA-NTH', 'BEL-HOL'], dislodged: ['NTH<SKA'], results: { LON: ['bounced', 'void'] },
});
S('6.F.14', "L'esercito convogliato non taglia il supporto contro il proprio convoglio (Szykman)", {
  units: ['ENG F LON S F WAL - ENG', 'ENG F WAL - ENG', 'FRA A BRE - LON', 'FRA F ENG C A BRE - LON'],
  moves: ['WAL-ENG'], dislodged: ['ENG<WAL'], results: { BRE: ['bounced', 'void'], LON: 'ok' },
});
S('6.F.15', 'Paradosso semplice con un secondo convoglio indipendente', {
  units: ['ENG F LON S F WAL - ENG', 'ENG F WAL - ENG', 'FRA A BRE - LON', 'FRA F ENG C A BRE - LON',
    'ITA F IRI C A POR - WAL', 'ITA F MAO C A POR - WAL', 'ITA A POR - WAL'],
  moves: ['WAL-ENG', 'POR-WAL'], dislodged: ['ENG<WAL'], results: { BRE: ['bounced', 'void'], LON: 'ok' },
});

// ============================================================================================
section('§5 — Regole specifiche del gioco');
// ============================================================================================
S('G.01', 'Nazioni non in guerra: un\'unità amica non viene sloggiata', {
  units: ['FRA A MAR - PIE', 'FRA F LYO S A MAR - PIE', 'ITA A PIE H'], peace: [['FRA', 'ITA']],
  moves: [], results: { LYO: '*' },
});
S('G.02', 'Scontro frontale tra nazioni non in guerra: nessuno è sloggiato', {
  units: ['FRA A MAR - PIE', 'FRA F LYO S A MAR - PIE', 'ITA A PIE - MAR'], peace: [['FRA', 'ITA']],
  moves: [], results: { LYO: '*' },
});
S('G.03', 'I supporti di una nazione amica del difensore non contano per sloggiarlo', {
  units: ['RUS A BOH H', 'GER A MUN - BOH', 'ITA A TYR S A MUN - BOH'], peace: [['ITA', 'RUS']],
  moves: [], results: { TYR: '*' },
});
S('G.04', 'Controprova di G.03: in guerra lo stesso supporto sloggia', {
  units: ['RUS A BOH H', 'GER A MUN - BOH', 'ITA A TYR S A MUN - BOH'],
  moves: ['MUN-BOH'], dislodged: ['BOH<MUN'], results: { TYR: 'ok' },
});
const GAR1 = { PAR: { owner: 'FRA', strength: 1 } };
const GAR2 = { PAR: { owner: 'FRA', strength: 2 } };
S('G.05', 'Guarnigione della capitale (forza 1) respinge un attacco singolo', {
  units: ['GER A BUR - PAR'], garrison: GAR1, moves: [],
});
S('G.06', 'Guarnigione forza 1 cede a un attacco con un supporto', {
  units: ['GER A BUR - PAR', 'GER A PIC S A BUR - PAR'], garrison: GAR1, moves: ['BUR-PAR'], results: { PIC: 'ok' },
});
S('G.07', 'Guarnigione forza 2 respinge un attacco con un supporto', {
  units: ['GER A BUR - PAR', 'GER A PIC S A BUR - PAR'], garrison: GAR2, moves: [],
});
S('G.08', 'Guarnigione forza 2 cede a un attacco con due supporti', {
  units: ['GER A BUR - PAR', 'GER A PIC S A BUR - PAR', 'GER A GAS S A BUR - PAR'], garrison: GAR2, moves: ['BUR-PAR'],
});
S('G.09', 'La guarnigione non ostacola le unità del proprietario', {
  units: ['FRA A BUR - PAR'], garrison: GAR1, moves: ['BUR-PAR'],
});
S('G.10', 'Unità soppressa: il suo supporto al mantenimento è tagliato', {
  units: ['AUS A BOH H', 'AUS A VIE S A BOH', 'GER A MUN - BOH', 'GER A SIL S A MUN - BOH'], suppressed: ['VIE'],
  moves: ['MUN-BOH'], dislodged: ['BOH<MUN'], results: { VIE: 'cut', SIL: 'ok' },
});
S('G.11', 'Controprova di G.10: senza soppressione il supporto regge', {
  units: ['AUS A BOH H', 'AUS A VIE S A BOH', 'GER A MUN - BOH', 'GER A SIL S A MUN - BOH'],
  moves: [], results: { VIE: 'ok', SIL: 'ok' },
});
S('G.12', 'Unità soppressa: il suo supporto al movimento è tagliato', {
  units: ['AUS A BOH H', 'GER A MUN - BOH', 'GER A SIL S A MUN - BOH'], suppressed: ['SIL'],
  moves: [], results: { SIL: 'cut' },
});
S('G.13', 'Unità soppressa non riceve supporto aereo', {
  units: ['AUS A BOH H', 'GER A MUN - BOH'], suppressed: ['MUN'], airBonus: { MUN: 1 }, moves: [],
});
S('G.14', 'Il bonus aereo rompe uno stallo', {
  units: ['GER A MUN - BOH', 'AUS A VIE - BOH'], airBonus: { MUN: 1 }, moves: ['MUN-BOH'],
});
S('G.15', "Il bonus aereo in attacco sloggia un'unità in tenuta", {
  units: ['GER A MUN - BOH', 'AUS A BOH H'], airBonus: { MUN: 1 }, moves: ['MUN-BOH'], dislodged: ['BOH<MUN'],
});
S('G.16', 'Il bonus aereo in difesa respinge un attacco supportato', {
  units: ['AUS A BOH H', 'GER A MUN - BOH', 'GER A SIL S A MUN - BOH'], airBonus: { BOH: 1 }, moves: [],
});
S('G.17', 'holdBonus della capitale: +1 di tenuta respinge un attacco supportato', {
  units: ['FRA A PAR H', 'GER A BUR - PAR', 'GER A PIC S A BUR - PAR'], holdBonus: { PAR: 1 }, moves: [],
});
S('G.18', 'holdBonus superato da un attacco con due supporti', {
  units: ['FRA A PAR H', 'GER A BUR - PAR', 'GER A PIC S A BUR - PAR', 'GER A GAS S A BUR - PAR'], holdBonus: { PAR: 1 },
  moves: ['BUR-PAR'], dislodged: ['PAR<BUR'],
});
S('G.19', "attackBonus: +1 all'attacco sloggia un'unità in tenuta", {
  units: ['GER A BUR - PAR', 'FRA A PAR H'], attackBonus: { BUR: 1 }, moves: ['BUR-PAR'], dislodged: ['PAR<BUR'],
});
S('G.20', 'canEnter falso: movimento invalid (le altre destinazioni restano ammesse)', {
  units: ['GER A RUH - BEL', 'GER A MUN - BUR'], canEnter: (owner, prov) => !(owner === 'GER' && prov === 'BEL'),
  moves: ['MUN-BUR'], results: { RUH: 'invalid' },
});

// ---- Determinismo e purezza ----
const SC_COMPLEX = CASES.find(c => c.code === '6.E.15').sc;
const SC_CONVOY = CASES.find(c => c.code === '6.C.4').sc;
const SC_SUPPORT = CASES.find(c => c.code === '6.D.21').sc;
const sortedJSON = a => JSON.stringify(a.map(x => JSON.stringify(x)).sort());

T('G.21', 'Determinismo: due chiamate identiche danno lo stesso risultato', () => {
  const errs = [];
  for (const sc of [SC_COMPLEX, SC_CONVOY, SC_SUPPORT]) {
    const b = build(sc);
    const ctx = makeCtx(sc, b.byLoc);
    const r1 = JSON.stringify(M.adjudicate(b.units, b.orders, ctx));
    const r2 = JSON.stringify(M.adjudicate(b.units, b.orders, ctx));
    const b2 = build(sc);
    const r3 = JSON.stringify(M.adjudicate(b2.units, b2.orders, makeCtx(sc, b2.byLoc)));
    if (r1 !== r2 || r1 !== r3) errs.push(`scenario ${sc.units[0]}…: risultati diversi tra chiamate ripetute\n      1ª: ${r1}\n      2ª: ${r2 === r1 ? r3 : r2}`);
  }
  return errs;
});
T('G.22', "Determinismo: il risultato non dipende dall'ordine di unità e ordini", () => {
  const errs = [];
  for (const sc of [SC_COMPLEX, SC_CONVOY, SC_SUPPORT]) {
    const b = build(sc);
    const r1 = M.adjudicate(b.units, b.orders, makeCtx(sc, b.byLoc));
    const units2 = b.units.slice().reverse();
    const orders2 = {};
    Object.keys(b.orders).reverse().forEach(k => { orders2[k] = b.orders[k]; });
    const r2 = M.adjudicate(units2, orders2, makeCtx(sc, b.byLoc));
    const norm = r => JSON.stringify({
      results: Object.keys(r.results).sort().map(k => [k, r.results[k]]),
      moves: sortedJSON(r.moves), dislodged: sortedJSON(r.dislodged),
    });
    if (norm(r1) !== norm(r2)) errs.push(`scenario ${sc.units[0]}…: atteso ${norm(r1)}  ottenuto (ordine inverso) ${norm(r2)}`);
  }
  return errs;
});
T('G.23', 'Funzione pura: unità, ordini e contesto non vengono modificati', () => {
  const errs = [];
  for (const sc of [SC_COMPLEX, SC_CONVOY, SC_SUPPORT, CASES.find(c => c.code === 'G.10').sc]) {
    const b = build(sc);
    const ctx = makeCtx(Object.assign({ airBonus: {} }, sc), b.byLoc);
    const before = JSON.stringify([b.units, b.orders, ctx.airBonus]);
    M.adjudicate(b.units, b.orders, ctx);
    const after = JSON.stringify([b.units, b.orders, ctx.airBonus]);
    if (before !== after) errs.push(`input modificati — prima: ${before}\n      dopo: ${after}`);
  }
  return errs;
});
T('G.24', 'Input vuoto: nessun movimento, nessuno sloggiamento', () => {
  const r = M.adjudicate([], {}, makeCtx({}));
  const errs = shapeErrors(r);
  if (errs.length) return errs;
  if (r.moves.length || r.dislodged.length || Object.keys(r.results).length)
    errs.push(`atteso risultato vuoto, ottenuto ${JSON.stringify(r)}`);
  return errs;
});

// ============================================================================================
section('Grafo: setMap / resetMap / ctx.graph');
// ============================================================================================
T('M.01', 'setMap sostituisce il grafo (mappa minima a tre province)', () => {
  const errs = [];
  try {
    M.setMap({
      X1: { kind: 'land', armyAdj: ['X2'], fleetAdj: [] },
      X2: { kind: 'land', armyAdj: ['X1', 'X3'], fleetAdj: [] },
      X3: { kind: 'land', armyAdj: ['X2'], fleetAdj: [] },
    });
    const ctx = makeCtx({});
    const r1 = M.adjudicate([{ id: 1, owner: 'GER', type: 'A', loc: 'X1' }], { 1: { unit: 1, type: 'move', to: 'X2' } }, ctx);
    if (!(r1.results[1] === 'ok' && r1.moves.length === 1 && r1.moves[0].to === 'X2'))
      errs.push(`X1-X2 (adiacenti): atteso ok, ottenuto ${JSON.stringify(r1.results)} moves ${JSON.stringify(r1.moves)}`);
    const r2 = M.adjudicate([{ id: 1, owner: 'GER', type: 'A', loc: 'X1' }], { 1: { unit: 1, type: 'move', to: 'X3' } }, ctx);
    if (r2.results[1] !== 'invalid' || r2.moves.length)
      errs.push(`X1-X3 (non adiacenti): atteso invalid, ottenuto ${JSON.stringify(r2.results)} moves ${JSON.stringify(r2.moves)}`);
  } finally { M.setMap(NODES); }
  const r3 = checkScenario({ units: ['GER A MUN - RUH'], moves: ['MUN-RUH'] });
  if (r3.length) errs.push('dopo setMap(NODES) la mappa di test non è ripristinata: ' + r3.join('; '));
  return errs;
});
T('M.02', 'resetMap non genera errori anche senza js/provinces.js; setMap ripristina la mappa di test', () => {
  const errs = [];
  if (typeof M.resetMap !== 'function') return ['GEO.military.resetMap non è una funzione'];
  try {
    M.resetMap();
    const r = M.adjudicate([], {}, makeCtx({}));
    errs.push(...shapeErrors(r));
  } catch (e) {
    errs.push('eccezione dopo resetMap: ' + (e && e.message));
  } finally { M.setMap(NODES); }
  const r2 = checkScenario({ units: ['GER A MUN - RUH'], moves: ['MUN-RUH'] });
  if (r2.length) errs.push('dopo setMap(NODES): ' + r2.join('; '));
  return errs;
});
T('M.03', "ctx.graph esplicito (node(id)) viene usato dall'aggiudicatore", () => {
  const errs = [];
  if (typeof M.resetMap !== 'function') return ['GEO.military.resetMap non è una funzione'];
  try {
    M.resetMap();
    errs.push(...checkScenario({ units: ['GER A MUN - RUH'], moves: ['MUN-RUH'], graph: NODES }));
    errs.push(...checkScenario({ units: ['ENG A LVP - IRI'], moves: [], results: { LVP: 'invalid' }, graph: NODES }));
    errs.push(...checkScenario({
      units: ['AUS A TRI - VEN', 'AUS F ADR S A TRI - VEN', 'ITA A VEN H'], graph: NODES,
      moves: ['TRI-VEN'], dislodged: ['VEN<TRI'], results: { ADR: 'ok' },
    }));
  } finally { M.setMap(NODES); }
  return errs;
});

// ---------------------------------------------------------------------------------------------
// Esecuzione
// ---------------------------------------------------------------------------------------------
const filter = (process.argv[2] || '').toLowerCase();
const selected = CASES.filter(c => !filter || c.code.toLowerCase().includes(filter) || c.name.toLowerCase().includes(filter));
let pass = 0;
const failed = [];
let lastSection = null;
for (const c of selected) {
  if (c.section !== lastSection) { console.log('\n' + c.section); lastSection = c.section; }
  let errs;
  try { errs = c.run() || []; } catch (e) { errs = ['eccezione: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' / ') : e)]; }
  if (!errs.length) { pass++; console.log(`  ✓ [${c.code}] ${c.name}`); }
  else {
    failed.push(c);
    console.log(`  ✗ [${c.code}] ${c.name}`);
    for (const e of errs) console.log('      ' + e);
  }
}
console.log(`\nRiepilogo: ${pass}/${selected.length} casi superati` + (failed.length ? `, ${failed.length} falliti: ${failed.map(c => c.code).join(', ')}` : '.'));
process.exit(failed.length ? 1 : 0);
