import '@fontsource/anton/latin-400.css';
import '@fontsource-variable/space-grotesk/wght.css';
import '@fontsource/space-mono/latin-400.css';
import '@fontsource/space-mono/latin-700.css';
import './style.css';

import { SEGNI, NOMI_CORPI, LETTURE_PER_SEGNO } from './segni.js';
import { cielo, dettagli, FASI, CORPI, soleAllaNascita, longitudiVeloci } from './cielo.js';
import {
  letturaDelGiorno, letturaAdesso, bastardometro, presagi, compatibilita, sfigaCosmica,
  hash, chiaveGiorno, mezzogiorno,
} from './oracolo.js';
import * as T from './testi.js';
import { glifo, icona, lunaSVG } from './glifi.js';
import { nativo, avvio, tocco, condividi, programmaNotifiche } from './nativo.js';
import { accendiStelle } from './stelle.js';
import { tipografia } from './tipografia.js';
import coppie from '../content/coppie.mjs';

// --- helpers ------------------------------------------------------------------

const $ = (sel, radice = document) => radice.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (x, decimali = 0) => x.toLocaleString('it-IT', { minimumFractionDigits: decimali, maximumFractionDigits: decimali });
const due = (n) => String(n).padStart(2, '0');
const gradiMinuti = (g) => {
  let gradi = Math.floor(g), minuti = Math.round((g - gradi) * 60);
  if (minuti === 60) { gradi += 1; minuti = 0; }
  return `${gradi}°${due(minuti)}′`;
};
const dataLunga = (d) => new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
const dataBreve = (d) => new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
const oraSecondi = (d) => `${due(d.getHours())}:${due(d.getMinutes())}:${due(d.getSeconds())}`;
const giorniA = (d) => Math.max(0, Math.round((d - Date.now()) / 86400e3));
const traGiorni = (d) => { const g = giorniA(d); return g === 0 ? 'oggi' : g === 1 ? 'domani' : `tra ${g} giorni`; };
const scegliDa = (lista, seme) => lista[hash(seme) % lista.length];
const nomeFrase = (corpo) => (corpo === 'sole' ? 'Il Sole' : corpo === 'luna' ? 'La Luna' : NOMI_CORPI[corpo]);

// --- persistence --------------------------------------------------------------

const CHIAVE = 'oroscopo-bastardo.v1';
const VUOTA = { segno: null, giorni: {}, recenti: {}, coppia: null, notifiche: { attive: false, ora: '08:30' } };

function carica() {
  try {
    const m = { ...VUOTA, ...JSON.parse(localStorage.getItem(CHIAVE) || '{}') };
    if (!Number.isInteger(m.segno) || m.segno < 0 || m.segno > 11) m.segno = null;
    return m;
  } catch {
    return structuredClone(VUOTA);
  }
}
const memoria = carica();
function salva() {
  try { localStorage.setItem(CHIAVE, JSON.stringify(memoria)); } catch { /* private mode: the app still works */ }
}

// Remembers the last 600 readings shown per sign, so nothing comes back for a long while.
function ricorda(id, n) {
  memoria.recenti[id] = [...(memoria.recenti[id] || []).filter((x) => x !== n), n].slice(-600);
}
// Keep only the last 40 days of daily assignments.
function pota() {
  const giorni = Object.keys(memoria.giorni).sort();
  for (const g of giorni.slice(0, Math.max(0, giorni.length - 40))) delete memoria.giorni[g];
}

// --- reading library ------------------------------------------------------------

const biblioteca = new Map();
function letture(id) {
  if (!biblioteca.has(id)) {
    const richiesta = fetch(`${import.meta.env.BASE_URL}data/letture/${id}.json`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .catch((e) => { biblioteca.delete(id); throw e; });
    biblioteca.set(id, richiesta);
  }
  return biblioteca.get(id);
}

// --- state ----------------------------------------------------------------------

const stato = { scheda: 'oggi', oggi: null, errore: false, battito: 0, stampa: false };

async function preparaOggi() {
  const segno = memoria.segno;
  const id = SEGNI[segno].id;
  const adesso = new Date();
  const g = chiaveGiorno(adesso);
  memoria.giorni[g] ??= {};
  const salvata = memoria.giorni[g][id];
  const giorno = letturaDelGiorno(segno, adesso, salvata ? [] : memoria.recenti[id] || []);
  if (salvata) giorno.n = salvata;
  else { memoria.giorni[g][id] = giorno.n; ricorda(id, giorno.n); pota(); salva(); }

  const base = {
    segno, giorno, corrente: giorno, testo: null,
    metro: bastardometro(giorno.cielo, segno, giorno.seme),
    presagi: presagi(giorno.cielo, segno, giorno.seme),
    adesso: cielo(adesso),
  };
  try {
    base.testo = (await letture(id))[giorno.n - 1];
    stato.errore = false;
  } catch {
    stato.errore = true;
  }
  stato.oggi = base;
}

// --- shared pieces ----------------------------------------------------------------

function barraAlta() {
  return `<header class="barra">
    <p class="marchio" aria-label="Oroscopo Bastardo">OROSCOPO <b>BASTARDO</b></p>
    <button class="tondo" data-azione="regola" aria-label="Impostazioni">${icona('regola')}</button>
  </header>`;
}

function schede() {
  const voce = (id, nome) => `<button class="scheda${stato.scheda === id ? ' attiva' : ''}" data-azione="scheda" data-scheda="${id}" ${stato.scheda === id ? 'aria-current="page"' : ''}>${icona(id)}<span>${nome}</span></button>`;
  return `<nav class="schede" aria-label="Sezioni">${voce('oggi', 'Oggi')}${voce('coppia', 'Coppia')}${voce('cielo', 'Cielo')}</nav>`;
}

function tacche(valore, classe = '') {
  return `<div class="tacche ${classe}" role="img" aria-label="${valore} su 100"><i style="width:${valore}%"></i></div>`;
}

function codiceBarre(seme) {
  let x = 0, h = hash(seme);
  const barre = [];
  for (let i = 0; i < 46; i++) {
    h = hash(`${h}|${i}`);
    const w = 1 + (h % 3);
    barre.push(`<rect x="${x}" width="${w}" height="10"/>`);
    x += w + 1 + ((h >>> 4) % 2);
  }
  return `<svg class="barre" viewBox="0 0 ${x} 10" preserveAspectRatio="none" aria-hidden="true">${barre.join('')}</svg>`;
}

function grigliaSegni(azione, scelto = null) {
  return `<div class="griglia-segni">${SEGNI.map((s, i) => `
    <button class="tessera el-${s.elemento}${i === scelto ? ' scelta' : ''}" data-azione="${azione}" data-segno="${i}">
      ${glifo(s.id)}<strong>${s.nome}</strong><small>${s.date}</small>
    </button>`).join('')}</div>`;
}

// --- welcome ----------------------------------------------------------------------

function vistaBenvenuto() {
  return `<main class="vista benvenuto">
    <p class="marchio grande" aria-label="Oroscopo Bastardo">OROSCOPO<br><b>BASTARDO</b></p>
    <p class="sottotitolo">${num(LETTURE_PER_SEGNO)} letture per segno, scelte dal cielo vero. Nessuna gentile.</p>
    <h2>Di che segno sei?</h2>
    <p class="nota">Tanto la colpa è tua lo stesso.</p>
    ${grigliaSegni('scegli-segno')}
    ${moduloNascita()}
  </main>`;
}

function moduloNascita() {
  return `<section class="nascita">
    <label for="nascita">Non lo sai? Lo calcolo dalla data di nascita</label>
    <div class="riga"><input id="nascita" type="date" min="1900-01-01" max="${chiaveGiorno(new Date())}"><button class="btn" data-azione="calcola-nascita">Calcola</button></div>
    <div id="esito-nascita" aria-live="polite"></div>
  </section>`;
}

function calcolaNascita() {
  const esito = $('#esito-nascita');
  const valore = $('#nascita').value;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valore);
  if (!m) { esito.innerHTML = '<p class="nota">Serve una data. Anche approssimativa, ma una data.</p>'; return; }
  const sole = soleAllaNascita(+m[1], +m[2], +m[3]);
  const s = SEGNI[sole.segno];
  const battuta = scegliDa(['Condoglianze.', 'Si spiega tutto.', 'Le stelle erano già al corrente.', 'Nessuno è perfetto, ma così è troppo.'], valore);
  esito.innerHTML = `<div class="esito el-${s.elemento}">
    ${glifo(s.id)}
    <p><strong>Sole a ${gradiMinuti(sole.gradi)} ${s.dell}.</strong> ${battuta}</p>
    ${sole.cuspide ? '<p class="nota">Sei sul confine tra due segni: l’ora di nascita può spostarti. Se non ti torna, scegli a mano.</p>' : ''}
    <button class="btn pieno" data-azione="scegli-segno" data-segno="${sole.segno}">Sono ${s.art}</button>
  </div>`;
}

// --- today ------------------------------------------------------------------------

function scontrino(o) {
  const s = SEGNI[o.segno];
  const l = o.corrente;
  const dom = l.dominante;
  const asp = dom.aspetto;
  const quando = l.cielo.quando;
  const commento = scegliDa(T.COMMENTI_ASPETTO[asp ? asp.id : 'nessuno'], `${l.seme}|commento`).replace('{P}', nomeFrase(dom.corpo));
  const dove = `in ${SEGNI[dom.segnoCorpo].nome}${dom.retro ? ', moto retrogrado' : ''}`;
  const titoloDom = asp ? `${NOMI_CORPI[dom.corpo]} in ${asp.nome}` : `${NOMI_CORPI[dom.corpo]}, nessun aspetto`;
  const corpoTesto = stato.errore || !o.testo
    ? `<p class="verdetto">Le stelle non rispondono. Capita anche a loro.</p><button class="btn scuro" data-azione="ricarica">Riprova</button>`
    : `<p class="verdetto">${esc(o.testo)}</p>`;

  return `<article class="scontrino${stato.stampa ? ' stampa' : ''}" id="scontrino" aria-live="polite">
    <div class="timbro" aria-hidden="true">${T.ETICHETTE_TEMA[l.tema]}</div>
    <p class="sc-testa">SCONTRINO<br>COSMICO</p>
    <p class="sc-riga">${dataLunga(quando)}<br>cielo delle ${l.istantanea ? oraSecondi(quando) : '12:00'}</p>
    <hr>
    <dl class="sc-voci">
      <div><dt>Lettura n.</dt><dd><b>${l.n}</b> / ${LETTURE_PER_SEGNO}</dd></div>
      <div><dt>Segno</dt><dd>${s.nome}</dd></div>
      <div><dt>Reparto</dt><dd>${T.ETICHETTE_TEMA[l.tema]} (${NOMI_CORPI[l.tema]})</dd></div>
    </dl>
    <hr>
    ${corpoTesto}
    <hr>
    <dl class="sc-voci">
      <div><dt>Dominante</dt><dd>${titoloDom}</dd></div>
      <div><dt>Posizione</dt><dd>${dove}${asp ? ` · orb ${num(asp.orb, 1)}°` : ''}</dd></div>
    </dl>
    <p class="sc-nota">${commento}</p>
    <hr>
    <div class="sc-totale"><span>Totale giornata</span><strong>${num(o.metro.voto, 1)}<small> / 10</small></strong></div>
    <p class="sc-nota">${T.commentoVoto(o.metro.voto)}</p>
    ${codiceBarre(l.seme)}
    <p class="sc-codice">${String(l.n).padStart(4, '0')} · SOLE ${l.cielo.corpi.sole.lon.toFixed(4)}° · LUNA ${l.cielo.corpi.luna.lon.toFixed(4)}°</p>
    <p class="sc-riga centro">Niente resi. Niente rimborsi. Niente scuse.</p>
  </article>`;
}

function azioniLettura(o) {
  return `<div class="azioni" id="azioni">
    <button class="btn pieno" data-azione="riprova">${icona('ricarica')}<span>Chiedi di nuovo alle stelle</span></button>
    <button class="btn" data-azione="condividi-lettura" aria-label="Condividi la lettura">${icona('condividi')}</button>
  </div>
  ${o.corrente.istantanea
    ? `<p class="nota centro">Lettura calcolata sul cielo di questo istante. <button class="link" data-azione="torna-giorno">Torna a quella del giorno</button></p>`
    : `<p class="nota centro">Non ti piace? Il cielo si muove: ogni richiesta pesca dalla posizione esatta di Luna e pianeti in quel momento.</p>`}`;
}

function pannelloMetro(o) {
  const riga = (id) => {
    const v = o.metro[id];
    return `<div class="metro-riga">
      <div class="metro-testa"><span>${T.METRO[id].nome}</span><strong>${v}</strong></div>
      ${tacche(v, id === 'sfiga' ? 'rossa' : '')}
      <p>${T.METRO[id].fasce[T.fascia(v)]}</p>
    </div>`;
  };
  return `<section class="pannello">
    <h2>Bastardometro</h2>
    ${['amore', 'lavoro', 'soldi', 'sfiga'].map(riga).join('')}
  </section>`;
}

function pannelloLuna(c) {
  const fase = FASI[c.luna.faseIdx];
  const segnoLuna = SEGNI[c.corpi.luna.segno];
  const giorno = chiaveGiorno(c.quando);
  const retro = CORPI.filter((id) => c.corpi[id].retro);
  return `<section class="pannello">
    <h2>Il cielo, purtroppo</h2>
    <div class="luna-riga">
      ${lunaSVG(c.luna.fase, `${fase.nome}, illuminata al ${Math.round(c.luna.illum * 100)} per cento`)}
      <div>
        <h3>${fase.nome}</h3>
        <p class="dato">in ${segnoLuna.nome} · illuminata al ${Math.round(c.luna.illum * 100)}%</p>
        <p>${scegliDa(T.COMMENTI_FASE[c.luna.faseIdx], `${giorno}|fase`)}</p>
      </div>
    </div>
    <p class="riga-cielo">${scegliDa(T.LUNA_NEL_SEGNO[c.corpi.luna.segno], `${giorno}|lunasegno`)}</p>
    ${retro.length
      ? retro.slice(0, 3).map((id) => `<p class="riga-cielo"><span class="bollo">R</span>${scegliDa(T.RETROGRADI[id], `${giorno}|${id}`)}</p>`).join('')
      : `<p class="riga-cielo">${T.NESSUN_RETROGRADO}</p>`}
  </section>`;
}

function pannelloPresagi(o) {
  const ev = SEGNI[o.presagi.evitare];
  return `<section class="presagi">
    <div class="presagio el-${ev.elemento}"><small>${T.PRESAGI.evitare}</small>${glifo(ev.id)}<strong>${ev.nome}</strong></div>
    <div class="presagio"><small>${T.PRESAGI.ora}</small><b>${o.presagi.ora}</b></div>
    <div class="presagio"><small>${T.PRESAGI.numero}</small><b>${o.presagi.numero}</b></div>
  </section>`;
}

function vistaOggi() {
  const o = stato.oggi;
  const s = SEGNI[o.segno];
  return `<header class="testata el-${s.elemento}">
      <button class="glifo-grande" data-azione="cambia-segno" aria-label="Cambia segno">${glifo(s.id)}</button>
      <div>
        <p class="occhiello">${dataLunga(new Date())}</p>
        <h1>${s.nome}</h1>
        <button class="link" data-azione="cambia-segno">${s.date} · cambia segno</button>
      </div>
    </header>
    ${scontrino(o)}
    ${azioniLettura(o)}
    ${pannelloMetro(o)}
    ${pannelloPresagi(o)}
    ${pannelloLuna(o.adesso)}
    <p class="disclaimer">${T.DISCLAIMER}</p>`;
}

// --- couple -----------------------------------------------------------------------

function coppiaCorrente() {
  if (Array.isArray(memoria.coppia) && memoria.coppia.every((x) => Number.isInteger(x) && x >= 0 && x < 12)) return memoria.coppia;
  return [memoria.segno, (memoria.segno + 6) % 12];
}

function vistaCoppia() {
  const [a, b] = coppiaCorrente();
  const c = compatibilita(a, b, cielo(mezzogiorno(new Date())));
  const testo = coppie[c.chiave];
  const f = T.fasciaCoppia(c.totale);
  const bottone = (i, lato, etichetta) => `<button class="scelta-segno el-${SEGNI[i].elemento}" data-azione="scegli-coppia" data-lato="${lato}">
      <small>${etichetta}</small>${glifo(SEGNI[i].id)}<strong>${SEGNI[i].nome}</strong></button>`;
  const voce = (id) => `<div class="metro-riga"><div class="metro-testa"><span>${T.VOCI_COPPIA[id]}</span><strong>${c.voci[id]}</strong></div>${tacche(c.voci[id], id === 'litigi' ? 'rossa' : '')}</div>`;
  const delta = c.oggi ? c.oggi.delta : 0;
  const segnoTransito = c.oggi ? SEGNI[c.oggi.segnoCorpo].nome : '';

  return `<header class="titolo-vista">
      <h1>Compatibilità</h1>
      <p>Due segni entrano in una relazione. Vediamo chi ne esce.</p>
    </header>
    <div class="duello">${bottone(a, 0, 'Tu')}<span class="per" aria-hidden="true">+</span>${bottone(b, 1, 'L’altra persona')}</div>
    <section class="verdetto-coppia">
      <p class="percento">${c.totale}<small>%</small></p>
      <p class="fascia">${f.nome}</p>
      <h2>${esc(tipografia(testo.t))}</h2>
      <p class="testo-coppia">${esc(tipografia(testo.x))}</p>
      <p class="dato">${c.aspetto.nome} · ${c.aspetto.gradi}° · ${c.stessoElemento ? `stesso elemento: ${c.stessoElemento}` : `${SEGNI[a].elemento} + ${SEGNI[b].elemento}`}</p>
      <p class="riga-cielo">${T.ASPETTO_COPPIA[c.dist]}</p>
    </section>
    <section class="pannello">
      <h2>Voce per voce</h2>
      ${['letto', 'dialogo', 'litigi', 'portafoglio'].map(voce).join('')}
    </section>
    <section class="pannello">
      <h2>Oggi</h2>
      <div class="sc-totale chiaro"><span>Base ${c.base}% · cielo di oggi</span><strong class="${delta < 0 ? 'giu' : delta > 0 ? 'su' : ''}">${delta > 0 ? '+' : delta < 0 ? '−' : ''}${Math.abs(delta)}</strong></div>
      <p>${T.commentoOggiCoppia(c.oggi, segnoTransito)}</p>
      <p class="dato">Scadenza stimata: ${f.scadenza}.</p>
    </section>
    <div class="azioni"><button class="btn pieno" data-azione="condividi-coppia">${icona('condividi')}<span>Condividi il verdetto</span></button></div>
    <p class="disclaimer">${T.DISCLAIMER}</p>`;
}

// --- sky --------------------------------------------------------------------------

function vistaCielo() {
  const adesso = new Date();
  const c = cielo(adesso);
  const d = dettagli(adesso);
  const fase = FASI[c.luna.faseIdx];
  const sfiga = sfigaCosmica(c);
  const giorno = chiaveGiorno(adesso);
  const minutiLuce = Math.floor(d.luceSole / 60), secondiLuce = Math.round(d.luceSole % 60);

  const righe = CORPI.map((id) => {
    const p = c.corpi[id];
    const s = SEGNI[p.segno];
    return `<tr class="el-${s.elemento}"><th scope="row">${NOMI_CORPI[id]}</th><td>${glifo(s.id)}<span>${s.nome}</span></td><td>${gradiMinuti(p.gradi)}</td><td>${p.retro ? '<span class="bollo">R</span>' : ''}</td></tr>`;
  }).join('');

  const eventi = [
    d.lunaPiena && { quando: d.lunaPiena, nome: 'Luna piena', nota: 'Prepara un alibi.' },
    d.lunaNuova && { quando: d.lunaNuova, nome: 'Luna nuova', nota: 'Si riparte da zero. Di nuovo.' },
    { quando: d.apside.quando, nome: d.apside.perigeo ? 'Luna al perigeo' : 'Luna all’apogeo', nota: d.apside.perigeo ? `Si avvicina a ${num(Math.round(d.apside.km))} km. Fossi in lei non lo farei.` : `Si allontana a ${num(Math.round(d.apside.km))} km. Come darle torto.` },
    d.stagione && { quando: d.stagione.quando, nome: d.stagione.nome, nota: 'Cambia la stagione, non tu.' },
  ].filter(Boolean).sort((x, y) => x.quando - y.quando);

  return `<header class="titolo-vista">
      <h1>Il cielo adesso</h1>
      <p class="dato"><span id="orologio">${oraSecondi(adesso)}</span> · ${dataLunga(adesso)}</p>
    </header>
    <section class="luna-grande">
      ${lunaSVG(c.luna.fase, fase.nome)}
      <h2>${fase.nome}</h2>
      <p class="dato">illuminata al ${num(c.luna.illum * 100, 1)}% · ${num(c.luna.eta, 1)} giorni di età</p>
      <p>${scegliDa(T.COMMENTI_FASE[c.luna.faseIdx], `${giorno}|fase`)}</p>
    </section>
    <section class="pannello">
      <h2>In diretta</h2>
      <dl class="diretta">
        <div><dt>Longitudine della Luna</dt><dd id="lon-luna">${c.corpi.luna.lon.toFixed(5)}°</dd></div>
        <div><dt>Longitudine del Sole</dt><dd id="lon-sole">${c.corpi.sole.lon.toFixed(5)}°</dd></div>
        <div><dt>Distanza della Luna</dt><dd>${num(Math.round(d.lunaKm))} km</dd></div>
        <div><dt>Distanza del Sole</dt><dd>${num(d.soleKm / 1e6, 2)} mln km</dd></div>
      </dl>
      <p>La luce che ti arriva adesso è partita dal Sole ${minutiLuce} minuti e ${secondiLuce} secondi fa. Arriva in ritardo anche lei.</p>
    </section>
    <section class="pannello">
      <h2>Chi sta dove</h2>
      <table class="pianeti"><tbody>${righe}</tbody></table>
      ${sfiga.retrogradi.length
        ? sfiga.retrogradi.map((id) => `<p class="riga-cielo"><span class="bollo">R</span>${scegliDa(T.RETROGRADI[id], `${giorno}|${id}`)}</p>`).join('')
        : `<p class="riga-cielo">${T.NESSUN_RETROGRADO}</p>`}
    </section>
    <section class="pannello">
      <h2>Indice di sfiga cosmica</h2>
      <div class="sc-totale chiaro"><span>${sfiga.retrogradi.length} retrogradi · ${sfiga.tensioni.length} ${sfiga.tensioni.length === 1 ? 'aspetto teso' : 'aspetti tesi'}</span><strong>${sfiga.indice}<small> / 100</small></strong></div>
      ${tacche(sfiga.indice, 'rossa')}
      ${sfiga.tensioni.slice(0, 3).map((t) => `<p class="riga-cielo">${NOMI_CORPI[t.a]} e ${NOMI_CORPI[t.b]} in ${t.nome} (orb ${num(t.orb, 1)}°).</p>`).join('')}
      <p class="nota">Dati veri, formula inventata. Come tutta l’astrologia, ma almeno lo diciamo.</p>
    </section>
    <section class="pannello">
      <h2>Prossimi guai</h2>
      <ul class="eventi">${eventi.map((e) => `<li><div><strong>${e.nome}</strong><span class="dato">${traGiorni(e.quando)}</span></div><p class="dato">${dataBreve(e.quando)}</p><p>${e.nota}</p></li>`).join('')}</ul>
    </section>
    <p class="disclaimer">${T.DISCLAIMER}</p>`;
}

function battito() {
  clearInterval(stato.battito);
  if (stato.scheda !== 'cielo') return;
  stato.battito = setInterval(() => {
    const orologio = $('#orologio');
    if (!orologio) return;
    const adesso = new Date();
    const lon = longitudiVeloci(adesso);
    orologio.textContent = oraSecondi(adesso);
    $('#lon-luna').textContent = `${lon.luna.toFixed(5)}°`;
    $('#lon-sole').textContent = `${lon.sole.toFixed(5)}°`;
  }, 1000);
}

// --- sheets -----------------------------------------------------------------------

function apriFoglio(html) {
  chiudiFoglio();
  const foglio = document.createElement('div');
  foglio.className = 'velo';
  foglio.id = 'velo';
  foglio.innerHTML = `<div class="foglio" role="dialog" aria-modal="true">
    <button class="tondo chiudi" data-azione="chiudi-foglio" aria-label="Chiudi">${icona('chiudi')}</button>${html}</div>`;
  foglio.addEventListener('click', (e) => { if (e.target === foglio) chiudiFoglio(); });
  document.body.append(foglio);
  $('.chiudi', foglio).focus({ preventScroll: true });
}
function chiudiFoglio() { $('#velo')?.remove(); }

function foglioSegni(titolo, nota, azione, scelto) {
  apriFoglio(`<h2>${titolo}</h2><p class="nota">${nota}</p>${grigliaSegni(azione, scelto)}`);
}

function foglioRegola() {
  const s = SEGNI[memoria.segno];
  const n = memoria.notifiche;
  apriFoglio(`<h2>Impostazioni</h2>
    <section class="gruppo">
      <h3>Il tuo segno</h3>
      <div class="riga-regola el-${s.elemento}">${glifo(s.id)}<strong>${s.nome}</strong><button class="btn" data-azione="cambia-segno">Cambia</button></div>
      ${moduloNascita()}
    </section>
    <section class="gruppo">
      <h3>Promemoria quotidiano</h3>
      ${nativo ? `<label class="interruttore"><input type="checkbox" id="notifiche" ${n.attive ? 'checked' : ''}><span>Avvisami quando la lettura è pronta</span></label>
        <label class="riga-regola">Ora<input type="time" id="ora-notifiche" value="${n.ora}"></label>
        <p class="nota" id="esito-notifiche">Una notifica al giorno, mai due. Se non apri l’app per due settimane smettiamo da soli.</p>`
      : '<p class="nota">I promemoria arrivano con l’app per iPhone. Qui sul web le stelle aspettano te.</p>'}
    </section>
    <section class="gruppo">
      <h3>Come funziona</h3>
      <p class="nota">Ogni segno ha ${num(LETTURE_PER_SEGNO)} letture: 111 per ciascuno dei nove corpi celesti. Ogni giorno l’app calcola dove sono Sole, Luna e pianeti, trova chi comanda sul tuo segno e pesca la lettura da quel reparto. Nessun dato lascia il telefono.</p>
      <p class="nota">${T.DISCLAIMER}</p>
      <p class="nota">Versione ${__VERSIONE__} · effemeridi: Astronomy Engine (MIT).</p>
    </section>`);
}

async function aggiornaNotifiche() {
  const n = memoria.notifiche;
  n.attive = $('#notifiche').checked;
  n.ora = $('#ora-notifiche').value || '08:30';
  const esito = await programmaNotifiche(n.attive, n.ora);
  if (esito === 'negate') {
    n.attive = false;
    $('#notifiche').checked = false;
    $('#esito-notifiche').textContent = 'Notifiche bloccate: attivale da Impostazioni › Notifiche › Oroscopo Bastardo.';
  } else if (esito === 'attive') {
    $('#esito-notifiche').textContent = `Fatto: ogni giorno alle ${n.ora}. Poi non dire che non ti avevamo avvisato.`;
  } else if (esito === 'spente') {
    $('#esito-notifiche').textContent = 'Promemoria spenti. Le stelle parleranno lo stesso, da sole.';
  }
  salva();
}

let avvisoTimer = 0;
function avviso(testo) {
  let el = $('#avviso');
  if (!el) { el = document.createElement('div'); el.id = 'avviso'; el.className = 'avviso'; el.setAttribute('role', 'status'); document.body.append(el); }
  el.textContent = testo;
  el.classList.add('visibile');
  clearTimeout(avvisoTimer);
  avvisoTimer = setTimeout(() => el.classList.remove('visibile'), 2200);
}

// --- rendering --------------------------------------------------------------------

function disegna({ inCima = true } = {}) {
  const app = $('#app');
  if (memoria.segno == null) {
    app.innerHTML = vistaBenvenuto();
    return;
  }
  const corpo = stato.scheda === 'oggi' ? vistaOggi() : stato.scheda === 'coppia' ? vistaCoppia() : vistaCielo();
  app.innerHTML = `${barraAlta()}<main class="vista" id="vista" data-scheda="${stato.scheda}">${corpo}</main>${schede()}`;
  if (inCima) $('#vista').scrollTop = 0;
  stato.stampa = false;
  battito();
}

async function apri(scheda) {
  stato.scheda = scheda;
  if (scheda === 'oggi' && (!stato.oggi || stato.oggi.segno !== memoria.segno || stato.oggi.giorno.giorno !== chiaveGiorno(new Date()))) {
    stato.stampa = true;
    await preparaOggi();
  }
  disegna();
}

function ristampa() {
  stato.stampa = true;
  $('#scontrino').outerHTML = scontrino(stato.oggi);
  $('#azioni').nextElementSibling.remove();
  $('#azioni').outerHTML = azioniLettura(stato.oggi);
  stato.stampa = false;
  $('#vista').scrollTo({ top: 0, behavior: 'smooth' });
}

async function riprova() {
  const o = stato.oggi;
  const id = SEGNI[o.segno].id;
  tocco(true);
  try {
    const lista = await letture(id);
    const l = letturaAdesso(o.segno, new Date(), memoria.recenti[id] || []);
    ricorda(id, l.n);
    salva();
    o.corrente = l;
    o.testo = lista[l.n - 1];
    stato.errore = false;
  } catch {
    stato.errore = true;
  }
  ristampa();
}

function testoCondivisione() {
  const o = stato.oggi;
  const s = SEGNI[o.segno];
  return `${s.nome} · Oroscopo Bastardo, lettura n. ${o.corrente.n} di ${LETTURE_PER_SEGNO}\n\n${o.testo}\n\nTotale giornata: ${num(o.metro.voto, 1)}/10`;
}

function testoCondivisioneCoppia() {
  const [a, b] = coppiaCorrente();
  const c = compatibilita(a, b, cielo(mezzogiorno(new Date())));
  const testo = coppie[c.chiave];
  return `${SEGNI[a].nome} × ${SEGNI[b].nome}: ${c.totale}% · ${tipografia(testo.t)}\n\n${tipografia(testo.x)}\n\nOroscopo Bastardo`;
}

// --- events -----------------------------------------------------------------------

const AZIONI = {
  'scheda': (el) => { if (el.dataset.scheda !== stato.scheda) { tocco(); apri(el.dataset.scheda); } },
  'scegli-segno': (el) => {
    memoria.segno = Number(el.dataset.segno);
    salva();
    chiudiFoglio();
    tocco(true);
    apri('oggi');
  },
  'cambia-segno': () => foglioSegni('Cambia segno', 'Cambiare segno non cambia te. Ma prova pure.', 'scegli-segno', memoria.segno),
  'calcola-nascita': calcolaNascita,
  'riprova': riprova,
  'ricarica': async () => { await preparaOggi(); disegna(); },
  'torna-giorno': async () => {
    const o = stato.oggi;
    o.corrente = o.giorno;
    try { o.testo = (await letture(SEGNI[o.segno].id))[o.giorno.n - 1]; } catch { stato.errore = true; }
    ristampa();
  },
  'condividi-lettura': async () => {
    if (!stato.oggi.testo) return;
    if ((await condividi('Oroscopo Bastardo', testoCondivisione())) === 'copiato') avviso('Copiato negli appunti. Fanne buon uso.');
  },
  'condividi-coppia': async () => {
    if ((await condividi('Oroscopo Bastardo', testoCondivisioneCoppia())) === 'copiato') avviso('Copiato negli appunti. Fanne buon uso.');
  },
  'scegli-coppia': (el) => {
    const lato = Number(el.dataset.lato);
    stato.lato = lato;
    foglioSegni(lato === 0 ? 'Primo segno' : 'Secondo segno', lato === 0 ? 'Di solito sei tu. Di solito.' : 'La persona che ti piace, che sopporti o che vuoi smascherare.', 'imposta-coppia', coppiaCorrente()[lato]);
  },
  'imposta-coppia': (el) => {
    const coppia = coppiaCorrente().slice();
    coppia[stato.lato] = Number(el.dataset.segno);
    memoria.coppia = coppia;
    salva();
    chiudiFoglio();
    tocco(true);
    disegna({ inCima: false });
  },
  'regola': foglioRegola,
  'chiudi-foglio': chiudiFoglio,
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-azione]');
  if (el && AZIONI[el.dataset.azione]) AZIONI[el.dataset.azione](el);
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'notifiche' || e.target.id === 'ora-notifiche') aggiornaNotifiche();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') chiudiFoglio(); });

// Back from background: new day, new reading; and keep the reminders topped up.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || memoria.segno == null) return;
  if (stato.oggi && stato.oggi.giorno.giorno !== chiaveGiorno(new Date())) apri(stato.scheda);
});

// --- start ------------------------------------------------------------------------

avvio();
accendiStelle($('#stelle'), chiaveGiorno(new Date()));
if (memoria.segno == null) disegna();
else apri('oggi');
if (memoria.notifiche.attive) programmaNotifiche(true, memoria.notifiche.ora);
if (!nativo && 'serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
