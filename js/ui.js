/* ============================================================
   GEOPOLITICA 2026 — Interfaccia utente
   ============================================================ */
(function () {
  const E = GEO.engine;
  let S = null;            // stato di gioco
  let sel = null;          // nazione selezionata
  let leftTab = 'governo', rightTab = 'nazione', newsFilter = 'tutto', lineMode = 0;
  const $ = (id) => document.getElementById(id);
  const fmt = (n, d = 0) => (n === undefined || n === null || isNaN(n)) ? '–' : Number(n).toLocaleString('it-IT', { maximumFractionDigits: d, minimumFractionDigits: d });
  const pct = (n, d = 1) => (n >= 0 ? '+' : '') + fmt(n, d) + '%';
  const sign = (n) => n > 0 ? 'pos' : n < 0 ? 'neg' : '';
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const N = (id) => S.nations[id];
  const me = () => S.nations[S.player];
  const flagName = (id) => { const n = N(id); return `${n.flag} ${n.name}`; };

  // ---------- Sparkline SVG -----------------------------------------------
  const spark = (hist, w = 70, h = 20, color) => {
    const h2 = hist.slice(-30); if (h2.length < 2) return '';
    const min = Math.min(...h2), max = Math.max(...h2), rng = max - min || 1;
    const pts = h2.map((v, i) => `${(i / (h2.length - 1) * w).toFixed(1)},${(h - (v - min) / rng * (h - 2) - 1).toFixed(1)}`).join(' ');
    const c = color || (h2[h2.length - 1] >= h2[0] ? '#3ddc84' : '#ff5c5c');
    return `<svg class="spark" width="${w}" height="${h}"><polyline fill="none" stroke="${c}" stroke-width="1.5" points="${pts}"/></svg>`;
  };
  const chg = (hist) => hist.length > 1 ? (hist[hist.length - 1] / hist[hist.length - 2] - 1) * 100 : 0;
  const bar = (v, max = 100, cls = '') => `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v / max * 100))}%"></i></div>`;
  const relLabel = (r) => r >= 70 ? 'Alleato stretto' : r >= 40 ? 'Amichevole' : r >= 10 ? 'Cordiale' : r > -10 ? 'Neutrale' : r > -40 ? 'Freddo' : r > -70 ? 'Ostile' : 'Nemico';
  const relColor = (r) => r >= 40 ? 'var(--green)' : r >= 10 ? '#9be7b6' : r > -10 ? 'var(--muted)' : r > -40 ? 'var(--orange)' : 'var(--red)';

  // ---------- Modali -------------------------------------------------------
  const modalStack = [];
  function openModal({ title, body, foot, wide, onClose }) {
    const m = $('modal'); m.classList.remove('hidden');
    m.innerHTML = `<div class="modal-card" ${wide ? 'style="width:min(1100px,100%)"' : ''}><div class="modal-head"><span>${title}</span>${onClose !== null ? '<button class="small" id="modalX">✕</button>' : ''}</div><div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}</div>`;
    const x = $('modalX'); if (x) x.onclick = () => { closeModal(); if (onClose) onClose(); };
    return m;
  }
  function closeModal() { $('modal').classList.add('hidden'); $('modal').innerHTML = ''; }
  function confirmDlg(title, text, okLabel, cb, danger) {
    openModal({ title, body: `<p>${text}</p>`, foot: `<button id="cNo">Annulla</button><button id="cYes" class="${danger ? 'danger' : 'primary'}">${okLabel}</button>` });
    $('cNo').onclick = closeModal; $('cYes').onclick = () => { closeModal(); cb(); };
  }
  function toast(text) { if (!S) return; E.news(S, text, 'sys', [S.player]); renderNews(); const first = $('news').firstElementChild; if (first) first.classList.add('ticker'); }

  // ---------- Setup partita -----------------------------------------------
  function showSetup() {
    let chosen = 'ITA', diff = 'normale', len = 40;
    const tier = (n) => n.gdp > 10000 ? 'Superpotenza' : n.gdp > 2000 ? 'Grande potenza' : n.gdp > 800 ? 'Potenza media' : 'Sfida estrema';
    const cards = GEO.NATIONS.map(n => `<div class="ncard ${n.id === chosen ? 'sel' : ''}" data-id="${n.id}"><div class="f">${n.flag}</div><div class="n">${n.name}</div><div class="tier">${tier(n)}</div><div class="s">PIL ${fmt(n.gdp)} mld · Pop ${fmt(n.pop)} M<br>Esercito ${n.army} · Testate ${n.nukes}<br>Tech media ${(Object.values(n.tech).reduce((a, b) => a + b, 0) / 9).toFixed(1)} · ${GEO.PERSONAS[n.persona].label}</div></div>`).join('');
    openModal({
      wide: true, onClose: null,
      title: '🌐 Nuova partita — scegli la nazione da governare',
      body: `<div class="hero"><h1>GEOPOLITICA 2026</h1><p>Un grand strategy a turni ispirato a Diplomacy: guida una nazione per decenni attraverso mandati, elezioni, riforme, alleanze, borsa, tecnologia, guerre e crisi. Perdere il potere non chiude la partita: si torna dall'opposizione o dall'esilio. Il mondo parte dallo stato reale dell'autunno 2026; ogni turno è un trimestre.</p></div>
        <div class="row"><label>Difficoltà <select id="setDiff">${Object.entries(GEO.DIFFICULTY).map(([k, v]) => `<option value="${k}" ${k === diff ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>
        <label>Durata <select id="setLen"><option value="40">40 turni (10 anni)</option><option value="80" selected>80 turni (20 anni)</option><option value="120">120 turni (30 anni)</option><option value="200">200 turni (50 anni)</option><option value="9999">Senza limite</option></select></label>
        <label>Visione nazionale <select id="setVision"><option value="">Scegli dopo</option>${Object.entries(GEO.VISIONS).map(([k, v]) => `<option value="${k}">${v.icon} ${v.name}</option>`).join('')}</select></label>
        <label>Mandato politico <select id="setMandate"><option value="12">12 turni (3 anni)</option><option value="16" selected>16 turni (4 anni)</option><option value="20">20 turni (5 anni)</option></select></label>
        <label>Seed (opzionale) <input type="number" id="setSeed" placeholder="casuale" style="width:110px"></label></div>
        <div class="nation-grid" id="nationGrid">${cards}</div>`,
      foot: `<button id="setHelp">❓ Come si gioca</button><button id="setStart" class="primary">Inizia la partita ▶</button>`,
    });
    $('nationGrid').onclick = (e) => { const c = e.target.closest('.ncard'); if (!c) return; chosen = c.dataset.id; document.querySelectorAll('.ncard').forEach(x => x.classList.toggle('sel', x.dataset.id === chosen)); };
    $('setHelp').onclick = () => { showHelp(() => showSetup()); };
    $('setStart').onclick = () => {
      diff = $('setDiff').value; len = +$('setLen').value; const seedV = $('setSeed').value;
      S = E.newGame({ player: chosen, difficulty: diff, length: len, seed: seedV ? +seedV : undefined, mandateLen: +$('setMandate').value, vision: $('setVision').value || null });
      sel = null; closeModal(); $('game').classList.remove('hidden'); renderAll(); resizeMap();
      const pm = me(); toast(`Benvenuto, leader di ${flagName(S.player)}. ${pm.regime === 'democrazia' ? `Il tuo mandato dura ${pm.politics.mandateLen} turni: alle elezioni del T${pm.politics.nextElection} dovrai avere il consenso dalla tua parte.` : 'Governi un regime non democratico: la tua sopravvivenza dipende dalla lealtà delle élite.'} Premi <b>Fine turno</b> quando sei pronto.`);
    };
  }

  // ---------- Aiuto ---------------------------------------------------------
  function showHelp(back) {
    openModal({
      title: '❓ Come si gioca', wide: true,
      body: `<div class="help">
      <p><b>Obiettivo.</b> Diventare la prima potenza mondiale entro la fine della partita. Il <b>Punteggio di potenza</b> somma PIL effettivo, forza militare, tecnologia, stabilità, alleati e territorio. Vittorie anticipate: <b>Egemonica</b> (punteggio +60% sul secondo), <b>Tecnologica</b> (tutte le tecnologie ≥ 9), <b>Diplomatica</b> (tu e i tuoi alleati > 62% del PIL mondiale). Sconfitta: capitolazione o rivoluzione.</p>
      <h3>🏛️ Governo</h3><p>Ogni trimestre disponi di un bilancio pari al 2,5% del PIL. Ripartiscilo tra Difesa, Ricerca, Welfare, Infrastrutture e Diplomazia. Il moltiplicatore di spesa sopra 1,0 stimola la crescita ma gonfia il debito; sotto 1,0 accumula tesoro. Debito > 100% del PIL frena la crescita; > 160% rischia una crisi.</p>
      <h3>🔬 Tecnologia</h3><p>Scegli un focus di ricerca: l'80% dei punti va lì, il resto si spalma. L'<b>IA</b> non può superare <i>Semiconduttori + 3</i> senza accesso ai chip (produttori con livello ≥ 8 che non ti sanzionano). Difesa aerea e Ipersonici decidono quanti missili vanno a segno. Spazio ≥ 6 rivela le intenzioni ostili, ≥ 9 gli ordini nemici.</p>
      <h3>🪖 Militare & balistica</h3><p>Gli ordini militari si risolvono <b>simultaneamente</b> a fine turno, come in Diplomacy. <b>Invasione</b>: serve confine terrestre, vicinanza marittima o marina ≥ 35. La capitale è attaccabile solo dopo aver preso metà delle altre regioni; se cade, lo stato capitola. <b>Attacco missilistico</b>: danneggia economia, esercito e stabilità, intercettato in base alla Difesa aerea. <b>Attacco nucleare</b>: devastante, ma scatena rappresaglia (MAD), sanzioni mondiali, risoluzioni ONU e fallout che deprime l'economia globale.</p>
      <h3>🤝 Diplomazia</h3><p>Accordi commerciali, patti di non aggressione, alleanze difensive, ultimatum, aiuti, sanzioni, embargo sui chip, spionaggio, destabilizzazione, cyberattacchi. Le IA valutano relazioni, reputazione, interessi e paura. Violare un patto distrugge la reputazione. La NATO, il CSTO e l'AUKUS sono blocchi di difesa: attaccare un membro significa affrontare tutti. Le aggressioni senza <i>casus belli</i> (rivendicazione o sanzioni subite) provocano sanzioni e un voto all'ONU, dove i cinque membri permanenti hanno il veto.</p>
      <h3>📈 Borsa</h3><p>Investi il tesoro in indici nazionali, settori (Tech, Energia, Difesa, Agro, Finanza, Oro) e materie prime (petrolio, gas, grano, chip, terre rare). Le guerre gonfiano la Difesa e l'Oro, gli shock petroliferi l'Energia, le sanzioni ai produttori i prezzi delle materie prime. Sai in anticipo cosa farai: usalo.</p>
      <h3>📰 Eventi</h3><p>Elezioni, scandali, cyberattacchi, proteste, scoperte, pandemie, crisi finanziarie, colpi di stato: ogni scelta ha conseguenze. Le proposte delle altre nazioni arrivano a inizio turno.</p>
      <h3>🧭 Politiche e visione</h3><p>Nella tab <b>Politiche</b> scegli la linea del paese in 11 ambiti (fisco, commercio, modello economico, immigrazione, welfare, energia e clima, dottrina militare, dottrina estera, dottrina nucleare, tecnologia, istituzioni). Ogni riforma costa, richiede 8 turni prima di cambiare di nuovo e ha effetti duraturi su crescita, debito, stabilità, consenso, inflazione, ricerca, emissioni, relazioni e deterrenza. Le politiche definiscono la tua <b>ideologia</b>: i paesi affini si avvicinano, gli altri si allontanano. La <b>Visione nazionale</b> (cambiabile ogni 24 turni) orienta il lungo periodo: superpotenza tecnologica, fortezza, impero commerciale, potenza verde, egemonia regionale, faro della democrazia, ordine e grandezza.</p>
      <h3>🌍 Ecosistema globale</h3><p>Il clima si riscalda con le emissioni di tutti: più disastri, raccolti peggiori, instabilità. Puoi <b>fondare blocchi</b> di difesa o commerciali, invitare nazioni, uscire da NATO o UE. Le ondate democratiche o populiste cambiano gli equilibri interni di decine di paesi.</p>
      <h3>👑 Potere e mandato</h3><p>Ogni mandato dura un numero fisso di turni. In <b>democrazia</b> alla scadenza si vota: la probabilità di vittoria dipende da consenso, crescita, inflazione, opposizione e controllo dei media. Perdere le elezioni ti manda <b>all'opposizione</b>: il nuovo governo segue la sua linea, tu accumuli capitale politico e lavori per tornare (campagna, mozioni, piazza, coalizioni). Un golpe o una rivolta ti mandano in <b>esilio</b>, da cui si rientra con reti clandestine, pressioni internazionali o insurrezioni. Un attentato mortale passa il potere al tuo successore. La partita dura quanto scegli, anche senza limite. Puoi restare al potere con stratagemmi: campagna elettorale, controllo dei media, rinvio delle elezioni, stato di emergenza, riforma costituzionale, brogli, fino alla <b>purga</b> che instaura un'autocrazia. Ogni passo costa relazioni con l'Occidente, libertà di stampa e può farti espellere dall'UE. In <b>autocrazia</b> non si vota, ma conta la <b>lealtà delle élite</b>: se scende sotto 25 rischi un colpo di stato. La Guardia pretoriana ti protegge.</p>
      <h3>💰 Tesoro</h3><p>Il tesoro non serve solo alla borsa: ripaga il debito, finanzia progetti (infrastrutture, sanità, istruzione, riarmo, welfare, salvataggi bancari, ricostruzione, stretta monetaria), compra <b>capacità nazionali</b> permanenti (servizi segreti, propaganda, forze speciali, guardia pretoriana, scudo cyber, flotta, banca centrale, polo tecnologico, riserve strategiche, scudo antimissile, triade nucleare, programma nucleare, stato di sorveglianza, fondo sovrano) e investe in <b>imprese di stato</b> settoriali che pagano dividendi.</p>
      <h3>💀 Brutalità</h3><p>Inflazione, default sovrano, carestie, insurrezioni nei territori occupati, profughi dalle guerre vicine, attentati, terrorismo, scioperi, golpe. Un attacco nucleare stermina milioni di persone e irradia regioni per 5 turni: solo dopo inizia il ripopolamento. Le IA sono più aggressive, lanciano ultimatum, destabilizzano i nemici e colpiscono i deboli.</p>
      <p class="muted small">I dati iniziali sono approssimazioni dello stato del mondo nell'autunno 2026 a scopo ludico. Ogni partita è deterministica dato il seed.</p></div>`,
      foot: `<button id="helpOk" class="primary">Chiudi</button>`, onClose: back,
    });
    $('helpOk').onclick = () => { closeModal(); if (back) back(); };
  }

  // ---------- HUD -----------------------------------------------------------
  function renderHud() {
    const p = me(); const rank = E.rankOf(S, S.player);
    const port = E.portfolioValue(S);
    $('hud').innerHTML = `<span class="chip">📅 <b>${E.dateLabel(S)}</b> · turno ${S.turn}/${S.maxTurns}</span>
      <span class="chip">${p.flag} <b>${p.name}</b> · #${rank}</span>
      <span class="chip">PIL <b>${fmt(E.effGdp(S, p))}</b> mld <span class="${sign(p.lastGrowth - 0)}">${pct(p.lastGrowth)}</span></span>
      <span class="chip">💰 Tesoro <b>${fmt(p.treasury)}</b> ${port > 0 ? `· Portafoglio ${fmt(port)}` : ''}</span>
      <span class="chip">⚖️ Stabilità <b class="${p.stability < 40 ? 'bad' : ''}">${fmt(p.stability)}</b></span>
      <span class="chip">⭐ Potenza <b>${E.score(S, p)}</b></span>
      ${mandateChip(p)}
      ${S.pending.length ? `<span class="chip warn">📨 ${S.pending.length} proposte</span>` : ''}${S.orders.length ? `<span class="chip">🎯 ${S.orders.length} ordini</span>` : ''}`;
  }

  function mandateChip(p) {
    const pol = p.politics; if (!pol) return '';
    if (S.playerStatus === 'opposizione') return `<span class="chip danger">🪧 All'opposizione · governa ${p.rivalName} · voto tra ${Math.max(0, S.statusUntil - S.turn)} · sostegno ${fmt(pol.opposition)}</span>`;
    if (S.playerStatus === 'esilio') return `<span class="chip danger">🕯️ In esilio · ${p.rivalName} · sostegno ${fmt(pol.opposition)}</span>`;
    if (p.regime === 'autocrazia') return `<span class="chip ${pol.loyalty < 35 ? 'danger' : ''}">👑 Lealtà élite <b>${fmt(pol.loyalty)}</b></span>`;
    const left = pol.nextElection - S.turn; const wp = Math.round(GEO.politics.winProb(S, p) * 100);
    return `<span class="chip ${left <= 3 && wp < 50 ? 'danger' : ''}">🗳️ ${pol.emergency ? 'Elezioni sospese' : `Elezioni tra <b>${left}</b> · vittoria ${wp}%`}</span>`;
  }
  // ---------- Pannello sinistro ---------------------------------------------
  function renderLeft() {
    const p = me(); const el = $('leftPanel');
    document.querySelectorAll('#leftTabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === leftTab));
    if (leftTab === 'governo') el.innerHTML = govPanel(p);
    else if (leftTab === 'potere') el.innerHTML = powerPanel(p);
    else if (leftTab === 'politiche') el.innerHTML = policiesPanel(p);
    else if (leftTab === 'tesoro') el.innerHTML = treasuryPanel(p);
    else if (leftTab === 'tech') el.innerHTML = techPanel(p);
    else if (leftTab === 'mil') el.innerHTML = milPanel(p);
    else el.innerHTML = marketPanel(p);
    bindLeft();
  }

  function govPanel(p) {
    const B = p.budget; const bq = E.budgetQ(S, p);
    const sliders = [['military', '🪖 Difesa'], ['research', '🔬 Ricerca'], ['welfare', '🏥 Welfare'], ['infra', '🏗️ Infrastrutture'], ['diplomacy', '🕊️ Diplomazia & intelligence']];
    const intel = S.intel || [];
    const occ = p.regions.filter(r => r.controller && r.controller !== p.id);
    const held = E.controlledRegions(S, p.id).filter(x => x.owner !== p.id);
    return `
      <div class="stat-grid">
        <div class="stat"><div class="l">PIL effettivo</div><div class="v">${fmt(E.effGdp(S, p))} <span class="small muted">mld</span></div></div>
        <div class="stat"><div class="l">Crescita annua</div><div class="v ${sign(p.lastGrowth)}">${pct(p.lastGrowth)}</div></div>
        <div class="stat"><div class="l">Stabilità</div><div class="v">${fmt(p.stability)}</div>${bar(p.stability)}</div>
        <div class="stat"><div class="l">Consenso</div><div class="v">${fmt(p.approval)}</div>${bar(p.approval)}</div>
        <div class="stat"><div class="l">Debito / PIL</div><div class="v ${p.debt > 120 ? 'bad' : p.debt > 90 ? 'warn' : ''}">${fmt(p.debt)}%</div></div>
        <div class="stat"><div class="l">Tesoro (fondo sovrano)</div><div class="v">${fmt(p.treasury)} <span class="small muted">mld</span></div></div>
        <div class="stat"><div class="l">Reputazione</div><div class="v">${fmt(p.reputation)}</div>${bar(p.reputation)}</div>
        <div class="stat"><div class="l">Popolazione</div><div class="v">${fmt(p.pop, 1)} <span class="small muted">M</span>${p.recovering ? ' <span class="small good">↑ ripopolamento</span>' : p.pop < p.popPeak * 0.98 ? ` <span class="small bad">−${fmt(p.popPeak - p.pop, 1)} M</span>` : ''}</div></div>
        <div class="stat"><div class="l">Inflazione</div><div class="v ${p.inflation > 8 ? 'bad' : p.inflation > 5 ? 'warn' : ''}">${fmt(p.inflation, 1)}%</div></div>
        <div class="stat"><div class="l">Regime</div><div class="v"><span class="regime-tag regime-${p.regime}">${p.regime}</span></div></div>
      </div>
      ${p.defaultUntil && p.defaultUntil > S.turn ? `<div class="box alert">In default: nessun deficit possibile fino al turno ${p.defaultUntil}.</div>` : ''}
      ${E.playerGoverns(S, S.player) ? '' : `<div class="box alert">Non sei al governo: il bilancio è deciso da ${p.rivalName}.</div>`}
      <h4>Bilancio trimestrale: ${fmt(bq * p.spendMult)} mld</h4>
      ${sliders.map(([k, l]) => `<div class="slider-row"><div class="lbl"><span>${l}</span><span><b id="bv_${k}">${Math.round(B[k] * 100)}%</b> · ${fmt(bq * p.spendMult * B[k])} mld</span></div><input type="range" min="2" max="70" value="${Math.round(B[k] * 100)}" data-budget="${k}" ${E.playerGoverns(S, S.player) ? '' : 'disabled'}></div>`).join('')}
      <div class="slider-row"><div class="lbl"><span>Moltiplicatore di spesa (deficit/surplus)</span><b id="smv">${p.spendMult.toFixed(2)}×</b></div><input type="range" min="70" max="140" value="${Math.round(p.spendMult * 100)}" id="spendMult"><div class="small muted">&gt;1,0: stimolo e debito ↑ · &lt;1,0: austerità, il risparmio va al tesoro</div></div>
      <div class="small muted">Export materie prime: +${fmt(p.lastExport || 0)} mld/trim · Blocchi: ${p.blocs.map(b => `<span class="tag">${GEO.BLOCS[b].name}</span>`).join('') || '—'}</div>
      <h4>Regioni</h4>
      ${p.regions.map(r => `<div class="region ${r.controller && r.controller !== p.id ? 'occ' : ''}"><span>${r.capital ? '★ ' : ''}${r.name}${r.irradiatedUntil && r.irradiatedUntil > S.turn ? ` <span class="bad">☢️ irradiata fino al T${r.irradiatedUntil}</span>` : ''}</span><span>${Math.round(r.share * 100)}% ${r.controller && r.controller !== p.id ? `· occupata da ${N(r.controller).flag}` : ''}</span></div>`).join('')}
      ${held.length ? `<div class="small" style="margin-top:4px">Territori occupati: ${held.map(x => `<span class="tag war">${N(x.owner).flag} ${x.region.name}</span>`).join('')}</div>` : ''}
      ${p.suzerain ? `<div class="box alert">Sei uno stato satellite di ${flagName(p.suzerain)}.</div>` : ''}
      ${p.tribute ? `<div class="box alert">Paghi un tributo del ${p.tribute.pct * 100}% del PIL a ${flagName(p.tribute.to)} per altri ${p.tribute.turns} turni.</div>` : ''}
      <h4>Intelligence</h4>
      ${p.tech.space + p.tech.cyber * 0.5 < 6 ? `<div class="small muted">Servono Spazio+Cyber/2 ≥ 6 per leggere le intenzioni degli altri stati.</div>` : intel.length ? intel.map(i => `<div class="box ${i.level > 0.05 ? 'alert' : ''}" style="padding:6px 8px;margin-bottom:4px">${i.text}</div>`).join('') : '<div class="small muted">Nessuna minaccia rilevata.</div>'}
      ${S.pending.length ? `<button class="primary" id="btnProposals" style="width:100%;margin-top:8px">📨 Rispondi a ${S.pending.length} proposte</button>` : ''}
      ${S.pendingEvents.length ? `<button class="primary" id="btnEvents" style="width:100%;margin-top:8px">📌 ${S.pendingEvents.length} eventi in attesa</button>` : ''}`;
  }

  function powerPanel(p) {
    const pol = p.politics; const PL = GEO.politics;
    if (S.playerStatus !== 'governo') {
      const opp = Object.entries(PL.OPP_ACTIONS).filter(([k, a]) => a.status === S.playerStatus).map(([k, a]) => { const ok = (!a.req || a.req(p)) && S.political >= a.pts; return `<div class="perk ${ok ? '' : 'locked'}"><div class="ic">${a.icon}</div><div class="b"><div class="t">${a.name}</div><div class="d">${a.desc}</div></div><button class="small" data-opp="${k}" ${ok ? '' : 'disabled'}>${a.pts} pt</button></div>`; }).join('');
      return `<div class="box alert"><b>${S.playerStatus === 'opposizione' ? '🪧 Sei all’opposizione' : '🕯️ Sei in esilio'}</b> · governa <b>${p.rivalName}</b> (${GEO.PERSONAS[p.persona].label})<div class="small" style="margin-top:4px">${S.playerStatus === 'opposizione' ? `Prossima finestra elettorale al T${S.statusUntil} (tra ${Math.max(0, S.statusUntil - S.turn)} turni). Vinci se il tuo sostegno supera il consenso del governo.` : `Il regime può crollare dal T${S.statusUntil} se la stabilità è bassa; oppure organizza l'insurrezione.`}</div></div>
        <div class="stat-grid"><div class="stat"><div class="l">Il tuo sostegno</div><div class="v">${fmt(pol.opposition)}</div>${bar(pol.opposition)}</div><div class="stat"><div class="l">Consenso del governo</div><div class="v">${fmt(p.approval)}</div>${bar(p.approval)}</div><div class="stat"><div class="l">Capitale politico</div><div class="v">${S.political} <span class="small muted">/10 (+2/turno)</span></div></div><div class="stat"><div class="l">Stabilità del paese</div><div class="v">${fmt(p.stability)}</div>${bar(p.stability)}</div></div>
        <h4>Azioni</h4>${opp}
        <div class="small muted">Il governo rivale decide bilancio, ricerca, guerre e diplomazia secondo la sua personalità. Puoi solo osservare e preparare il ritorno.</div>`;
    }
    const dem = p.regime !== 'autocrazia';
    const elapsed = pol.mandateLen ? pol.mandateLen - (pol.nextElection - S.turn) : 0;
    const wp = dem ? Math.round(PL.winProb(S, p) * 100) : null;
    const actions = Object.entries(PL.ACTIONS).map(([k, a]) => { const ok = a.req(p, S); const cost = Math.round(E.effGdp(S, p) * a.costPct / 100); const active = k === 'emergency' && pol.emergency; return `<div class="perk ${ok ? '' : 'locked'}"><div class="ic">${a.icon}</div><div class="b"><div class="t">${a.name}${active ? ' <span class="good">(attivo)</span>' : ''}${k === 'rig' && pol.rigged ? ' <span class="warn">(predisposti)</span>' : ''}</div><div class="d">${a.desc}${ok ? '' : ` <span class="warn">${a.reqText}</span>`}</div></div><button class="small ${k === 'purge' ? 'danger' : ''}" data-regime="${k}" ${ok ? '' : 'disabled'}>${active ? 'Revoca' : cost ? cost + ' mld' : 'Esegui'}</button></div>`; }).join('');
    return `<div class="box info"><span class="regime-tag regime-${p.regime}">${p.regime.toUpperCase()}</span> · mandato n. ${pol.terms}${p.suzerain ? ' · stato satellite' : ''}
      ${dem ? `<div class="small" style="margin-top:6px">Mandato: turno ${elapsed}/${pol.mandateLen} · ${pol.emergency ? '<b class="warn">elezioni sospese (stato di emergenza)</b>' : `elezioni al T${pol.nextElection} (tra ${pol.nextElection - S.turn} turni)`}</div><div class="mandate"><i style="width:${Math.min(100, elapsed / pol.mandateLen * 100)}%"></i></div>
      <div class="row"><label>Proiezione di vittoria</label><b class="${wp >= 55 ? 'good' : wp >= 40 ? 'warn' : 'bad'}">${wp}%</b></div>${bar(wp)}` : `<div class="small" style="margin-top:6px">Nessuna elezione. Il potere si regge sulla lealtà delle élite militari ed economiche.</div>`}
      </div>
      <div class="stat-grid">
        <div class="stat"><div class="l">Consenso popolare</div><div class="v">${fmt(p.approval)}</div>${bar(p.approval)}</div>
        ${dem ? `<div class="stat"><div class="l">Forza dell'opposizione</div><div class="v ${pol.opposition > 60 ? 'bad' : ''}">${fmt(pol.opposition)}</div>${bar(pol.opposition)}</div>` : `<div class="stat"><div class="l">Lealtà delle élite</div><div class="v ${pol.loyalty < 35 ? 'bad' : ''}">${fmt(pol.loyalty)}</div>${bar(pol.loyalty)}</div>`}
        <div class="stat"><div class="l">Libertà di stampa</div><div class="v">${fmt(pol.pressFreedom)}</div>${bar(pol.pressFreedom)}</div>
        <div class="stat"><div class="l">Stabilità</div><div class="v">${fmt(p.stability)}</div>${bar(p.stability)}</div>
      </div>
      <div class="small muted" style="margin:6px 0">${pol.mediaControl ? '<span class="tag sanc">media controllati</span>' : ''}${pol.emergency ? '<span class="tag war">stato di emergenza</span>' : ''}${pol.postponements ? `<span class="tag">${pol.postponements} rinvii</span>` : ''}${p.perks.guard ? '<span class="tag ally">guardia pretoriana</span>' : ''}${p.perks.surveillance ? '<span class="tag">sorveglianza</span>' : ''}${pol.euWarnings && p.blocs.includes('EU') ? `<span class="tag sanc">UE: ${pol.euWarnings} richiami</span>` : ''}</div>
      ${dem ? `<div class="small muted">Cosa pesa sul voto: consenso (${fmt(p.approval)}), crescita (${pct(p.lastGrowth)}), inflazione (${fmt(p.inflation, 1)}%), opposizione, controllo dei media, stabilità, esaurimento bellico. In regime ibrido +20 punti.</div>` : `<div class="small muted">Cosa pesa sulla lealtà: spesa militare (ora ${Math.round(p.budget.military * 100)}%), crescita, sanzioni subite, esaurimento bellico, inflazione, regalie, Guardia pretoriana. Sotto 25: rischio golpe ogni turno.</div>`}
      ${p.suzerain ? `<div class="box alert">⛓️ Stato satellite di ${flagName(p.suzerain)}: tributo ${p.tribute ? p.tribute.pct * 100 + '% del PIL' : 'concluso'}. <button class="small danger" id="btnRebel">✊ Ribellati</button></div>` : ''}
      <h4>Stratagemmi di potere</h4>${actions}`;
  }

  function policiesPanel(p) {
    const PL = GEO.politics; const gov = E.playerGoverns(S, S.player);
    const v = p.vision ? GEO.VISIONS[p.vision] : null; const canChange = !p.vision || S.turn - p.visionSince >= 24;
    const ideo = PL.ideology(p);
    const cost = Math.max(3, Math.round(E.effGdp(S, p) * 0.003));
    const cats = Object.entries(GEO.POLICIES).map(([ck, C]) => { const cur = p.policies[ck]; const cd = (p.policyCooldown || {})[ck] || 0; return `<div class="box" style="padding:8px 10px"><div style="display:flex;justify-content:space-between"><b>${C.icon} ${C.name}</b><span class="small muted">${cd > S.turn ? `riforma dal T${cd}` : `riforma: ${cost} mld`}</span></div>
      ${Object.entries(C.options).map(([ok, o]) => { const active = ok === cur; const req = o.req && !o.req(p, S); return `<div class="policy ${active ? 'active' : ''} ${req ? 'locked' : ''}"><div class="b"><div class="t">${o.name}${active ? ' <span class="good">● in vigore</span>' : ''}</div><div class="d">${o.desc}</div></div>${active ? '' : `<button class="small" data-policy="${ck}:${ok}" ${(!gov || req || cd > S.turn) ? 'disabled' : ''}>Adotta</button>`}</div>`; }).join('')}</div>`; }).join('');
    return `<div class="box info"><h4 style="margin-top:0">🧭 Visione nazionale</h4>${v ? `<div><b>${v.icon} ${v.name}</b> <span class="small muted">dal T${p.visionSince}</span><div class="small">${v.desc}</div><div class="small muted">Obiettivo: ${v.goal}</div></div>` : '<div class="small warn">Nessuna visione scelta: il paese naviga a vista.</div>'}
      <button class="small primary" id="btnVision" style="margin-top:6px" ${gov && canChange ? '' : 'disabled'}>${v ? (canChange ? 'Cambia visione (1% PIL)' : `Cambiabile dal T${p.visionSince + 24}`) : 'Scegli la visione (gratis)'}</button></div>
      <div class="small muted" style="margin-bottom:8px">Ideologia: ${ideo.lib > 0.8 ? 'liberale' : ideo.lib < -0.8 ? 'autoritaria' : 'intermedia'} · ${ideo.market > 0.5 ? 'pro-mercato' : ideo.market < -0.5 ? 'statalista' : 'mista'}. Le nazioni ideologicamente affini si avvicinano da sole.${gov ? '' : ' <b class="warn">Non sei al governo: le riforme sono bloccate.</b>'}</div>
      ${cats}`;
  }
  function showVisionPicker() {
    const p = me();
    openModal({ title: '🧭 Scegli il futuro della nazione', body: Object.entries(GEO.VISIONS).map(([k, v]) => `<button class="option" data-vis="${k}" ${p.vision === k ? 'disabled' : ''}><b>${v.icon} ${v.name}</b><span class="fx">${v.desc}<br>Obiettivo di lungo periodo: ${v.goal}</span></button>`).join(''), foot: '<button id="visNo">Annulla</button>' });
    $('visNo').onclick = closeModal;
    document.querySelectorAll('[data-vis]').forEach(b => b.onclick = () => { const r = GEO.politics.setVision(S, S.player, b.dataset.vis); closeModal(); renderAll(); if (!r.ok) toast('⚠️ ' + r.reason); });
  }

  function treasuryPanel(p) {
    const PL = GEO.politics; const eff = E.effGdp(S, p);
    const perks = Object.entries(GEO.PERKS).map(([k, d]) => { const owned = !!p.perks[k]; const c = PL.cost(S, p, d); const r = owned ? null : PL.canBuyPerk(S, p, k); return `<div class="perk ${owned ? 'owned' : r.ok ? '' : 'locked'}"><div class="ic">${d.icon}</div><div class="b"><div class="t">${d.name}${owned ? ' <span class="good">✓</span>' : ''}</div><div class="d">${d.desc}${!owned && !r.ok && r.reason !== `Servono ${c} mld.` ? ` <span class="warn">${r.reason}</span>` : ''}</div></div>${owned ? '' : `<button class="small" data-perk="${k}" ${r.ok ? '' : 'disabled'}>${c} mld</button>`}</div>`; }).join('');
    const projects = Object.entries(GEO.PROJECTS).map(([k, d]) => { const c = PL.cost(S, p, d); const r = PL.canRunProject(S, p, k); const active = p.boosts.find(b => b.key === k); return `<div class="perk ${r.ok ? '' : 'locked'}"><div class="ic">${d.icon}</div><div class="b"><div class="t">${d.name}${active ? ` <span class="good">(attivo fino al T${active.until})</span>` : ''}</div><div class="d">${d.desc}${!r.ok && !r.reason.startsWith('Servono') ? ` <span class="warn">${r.reason}</span>` : ''}</div></div><button class="small" data-project="${k}" ${r.ok ? '' : 'disabled'}>${c} mld</button></div>`; }).join('');
    const soe = GEO.SOE_SECTORS.map(k => { const cap = p.enterprises[k] || 0; const sec = GEO.SECTORS[k]; return `<tr><td>${sec.icon} ${sec.name}</td><td class="right">${cap ? fmt(cap) : '—'}</td><td class="right ${sign(chg(S.market.sectors[k].hist))}">${pct(chg(S.market.sectors[k].hist))}</td><td><button class="small ok" data-soe-in="${k}">+</button><button class="small danger" data-soe-out="${k}" ${cap ? '' : 'disabled'}>−</button></td></tr>`; }).join('');
    return `<div class="box info"><b>Tesoro: ${fmt(p.treasury)} mld</b> · PIL ${fmt(eff)} · debito ${fmt(p.debt)}% ${p.debt > 100 ? '<span class="bad">(frena la crescita)</span>' : p.debt < 60 ? '<span class="good">(bonus crescita)</span>' : ''}<br><span class="small muted">Entrate: export ${fmt(p.lastExport || 0)} + dividendi ${fmt(p.lastDividends || 0)} + surplus di bilancio. Il tesoro cresce con un moltiplicatore di spesa < 1.</span></div>
      <h4>💳 Ripaga il debito</h4><div class="row"><input type="number" id="debtAmt" value="${Math.max(1, Math.min(100, Math.floor(p.treasury / 4)))}" min="1" style="width:100px"> mld <button class="small primary" id="payDebt">Ripaga</button><span class="small muted">≈ −${fmt(Math.max(1, Math.min(100, Math.floor(p.treasury / 4))) / eff * 100, 2)} punti</span></div>
      <h4>🏗️ Progetti</h4>${projects}
      <h4>🏭 Imprese di stato</h4><div class="small muted" style="margin-bottom:4px">Partecipazioni in settori strategici: dividendi ~1,2%/turno più l'andamento del settore. Disinvestire costa il 5% (0 con Fondo sovrano).</div>
      <div class="row"><label>Importo (mld)</label><input type="number" id="soeAmt" value="${Math.max(1, Math.min(50, Math.floor(p.treasury / 5)))}" min="1" style="width:90px"></div>
      <table><tr><th>Settore</th><th class="right">Capitale</th><th class="right">Settore</th><th></th></tr>${soe}</table>
      <h4>⭐ Capacità nazionali</h4>${perks}`;
  }

  function techPanel(p) {
    const rp = E.researchPoints(S, p, (p.lastBudget ? p.lastBudget.research : E.budgetQ(S, p) * p.budget.research));
    const access = E.hasChipAccess(S, p);
    const top = (t) => E.ranking(S).map(r => N(r.id)).sort((a, b) => b.tech[t] - a.tech[t])[0];
    return `<div class="box info"><b>${fmt(rp)} punti ricerca/trimestre</b> · media tech ${E.avgTech(p).toFixed(1)}<br><span class="small muted">Costo prossimo livello: 40·(liv+1)^1,5. Il focus riceve l'80%.</span></div>
      ${p.chipBlocked ? `<div class="box alert">⛔ Ricerca IA bloccata: senza accesso ai chip avanzati l'IA non può superare Semiconduttori + 3. Sviluppa i semiconduttori o migliora le relazioni con Taiwan, Corea del Sud, USA o Giappone.</div>` : access ? '' : `<div class="box alert">⚠️ Nessun accesso ai chip avanzati.</div>`}
      ${Object.entries(GEO.TECHS).map(([k, t]) => { const lv = p.tech[k]; const cost = E.techCost(lv); const prog = p.techProg[k] || 0; const tp = top(k); return `<div class="tech-row"><input type="radio" name="focus" value="${k}" ${p.researchFocus === k ? 'checked' : ''} ${lv >= 10 ? 'disabled' : ''} title="Imposta come focus"><div class="nm"><div>${t.icon} <b>${t.name}</b> <span class="small muted">leader: ${tp.flag} ${tp.tech[k]}</span></div>${bar(lv >= 10 ? 100 : prog / cost * 100, 100)}<div class="small muted">${t.desc}</div></div><div class="lv">${lv}</div></div>`; }).join('')}
      <h4>Spionaggio</h4><div class="small muted">Seleziona una nazione sulla mappa e usa "Spionaggio tecnologico" per rubare progressi su tecnologie in cui è più avanti.</div>`;
  }

  function milPanel(p) {
    const wars = E.warsOf(S, S.player);
    const enemies = E.enemiesOf(S, S.player);
    const cost = 3;
    return `<div class="stat-grid">
        <div class="stat"><div class="l">Esercito</div><div class="v">${fmt(p.army)}</div>${bar(p.army, 110)}</div>
        <div class="stat"><div class="l">Marina</div><div class="v">${fmt(p.navy)}</div>${bar(p.navy)}</div>
        <div class="stat"><div class="l">Aeronautica</div><div class="v">${fmt(p.air)}</div>${bar(p.air)}</div>
        <div class="stat"><div class="l">Prontezza</div><div class="v">${fmt(p.readiness)}%</div>${bar(p.readiness)}</div>
        <div class="stat"><div class="l">🚀 Missili balistici</div><div class="v">${fmt(p.missiles)}</div></div>
        <div class="stat"><div class="l">☢️ Testate nucleari</div><div class="v">${fmt(p.nukes)}</div></div>
        <div class="stat"><div class="l">Potenza militare</div><div class="v">${fmt(E.milPower(p))}</div></div>
        <div class="stat"><div class="l">Esaurimento bellico</div><div class="v ${p.exhaustion > 40 ? 'bad' : ''}">${fmt(p.exhaustion)}</div>${bar(p.exhaustion)}</div>
      </div>
      <div class="small muted" style="margin-top:6px">Difesa aerea liv. ${p.tech.defense} (intercetta ~${Math.min(92, p.tech.defense * 8)}% dei missili nemici base) · Ipersonici liv. ${p.tech.hyper}</div>
      <div class="row" style="margin-top:8px"><button class="small" id="buyMissiles">Acquista 20 missili (${cost * 20} mld)</button><button class="small" id="ordMobilize">Mobilitazione generale (+20 prontezza, 15 mld)</button></div>
      ${p.nuclearProgram !== undefined && p.nukes === 0 ? `<div class="box info">☢️ Programma nucleare segreto: ${Math.round(p.nuclearProgram * 100)}%. Difesa > 40% del bilancio lo accelera.</div>` : ''}
      <h4>Guerre in corso</h4>
      ${wars.length ? wars.map(w => `<div class="box" style="padding:6px 8px"><b>${w.label}</b><br><span class="small">Attaccanti: ${w.attackers.map(flagName).join(', ')}<br>Difensori: ${w.defenders.map(flagName).join(', ')}</span></div>`).join('') : '<div class="small muted">In pace. Per attaccare, dichiara guerra dal pannello della nazione.</div>'}
      <h4>Ordini per questo turno</h4>
      ${S.orders.length ? S.orders.map((o, i) => `<div class="order"><span>${orderLabel(o)}</span><button class="small danger" data-rm="${i}">✕</button></div>`).join('') : '<div class="small muted">Nessun ordine. Gli ordini si risolvono simultaneamente a fine turno.</div>'}
      ${enemies.length ? `<h4>Nuovo ordine</h4><div class="row"><select id="ordTarget">${enemies.map(e => `<option value="${e}">${flagName(e)}</option>`).join('')}</select></div>
      <div class="actions-grid"><button id="ordInvade">⚔️ Invasione</button><button id="ordStrike">🚀 Attacco missilistico</button><button id="ordCyber">💻 Cyberattacco</button><button id="ordNuke" class="danger" ${p.nukes ? '' : 'disabled'}>☢️ Attacco nucleare</button></div>` : ''}`;
  }
  const orderLabel = (o) => ({ invade: `⚔️ Invasione di ${o.region} (${flagName(o.target)})${o.allIn ? ' — assalto totale' : ''}`, strike: `🚀 ${o.count} missili su ${flagName(o.target)}`, nuke: `☢️ ${o.count} testate su ${flagName(o.target)}`, cyber: `💻 Cyberattacco a ${flagName(o.target)}`, mobilize: '🪖 Mobilitazione generale' }[o.type]);

  function marketPanel(p) {
    const M = S.market; const H = S.portfolio.holdings;
    const row = (key, name, obj, unit = '') => { const c = chg(obj.hist); const h = H[key]; return `<tr><td>${name}</td><td class="right">${fmt(obj.price, 1)}${unit}</td><td class="right ${sign(c)}">${pct(c)}</td><td>${spark(obj.hist)}</td><td class="right small">${h ? fmt(h.units * obj.price) : ''}</td><td><button class="small ok" data-buy="${key}">+</button><button class="small danger" data-sell="${key}" ${h ? '' : 'disabled'}>−</button></td></tr>`; };
    const pv = E.portfolioValue(S); const cost = Object.values(H).reduce((a, h) => a + h.cost, 0);
    return `<div class="box info"><div class="row"><label>Importo operazione (mld)</label><input type="number" id="tradeAmt" value="${Math.max(1, Math.min(50, Math.floor(p.treasury / 4)))}" min="1" style="width:90px"></div>
      <div class="small">Tesoro: <b>${fmt(p.treasury)}</b> · Portafoglio: <b>${fmt(pv)}</b> (<span class="${sign(pv - cost)}">${pct(cost ? (pv / cost - 1) * 100 : 0)}</span>) · Realizzato: <span class="${sign(S.portfolio.realized)}">${fmt(S.portfolio.realized)}</span>${Object.keys(H).length ? ` · <button class="small" id="sellAll">Liquida tutto</button>` : ''}</div></div>
      <table><tr><th>Asset</th><th class="right">Prezzo</th><th class="right">Var.</th><th></th><th class="right">Posiz.</th><th></th></tr>
      ${row('W:ALL', '🌍 Indice mondiale', M.world)}
      ${Object.entries(GEO.SECTORS).map(([k, v]) => row('S:' + k, v.icon + ' ' + v.name, M.sectors[k])).join('')}
      ${Object.entries(GEO.COMMODITIES).map(([k, v]) => row('C:' + k, v.icon + ' ' + v.name, M.commodities[k], '')).join('')}
      </table>
      <h4>Indici nazionali</h4>
      <table>${E.ranking(S).slice(0, 33).map(r => row('N:' + r.id, N(r.id).flag + ' ' + N(r.id).name, M.indexes[r.id])).join('')}</table>
      <div class="small muted" style="margin-top:6px">Crescita mondiale: ${pct(S.worldGrowth || 2.6)} · Fallout nucleare: ${fmt(S.fallout, 2)}</div>`;
  }

  function bindLeft() {
    document.querySelectorAll('[data-budget]').forEach(inp => inp.oninput = () => {
      const p = me(); const k = inp.dataset.budget; const v = +inp.value / 100; const others = Object.keys(p.budget).filter(x => x !== k);
      const rest = 1 - v; const sumO = others.reduce((a, x) => a + p.budget[x], 0);
      p.budget[k] = v; others.forEach(x => p.budget[x] = sumO > 0 ? p.budget[x] / sumO * rest : rest / others.length);
      Object.keys(p.budget).forEach(x => { const b = $('bv_' + x); if (b) b.textContent = Math.round(p.budget[x] * 100) + '%'; const i = document.querySelector(`[data-budget="${x}"]`); if (i && x !== k) i.value = Math.round(p.budget[x] * 100); });
    });
    document.querySelectorAll('[data-budget]').forEach(inp => inp.onchange = () => renderLeft());
    const sm = $('spendMult'); if (sm) { sm.oninput = () => { me().spendMult = +sm.value / 100; $('smv').textContent = me().spendMult.toFixed(2) + '×'; }; sm.onchange = renderLeft; }
    document.querySelectorAll('input[name=focus]').forEach(r => r.onchange = () => { me().researchFocus = r.value; renderLeft(); });
    const bm = $('buyMissiles'); if (bm) bm.onclick = () => { const p = me(); if (p.treasury < 60) return toast('Tesoro insufficiente.'); p.treasury -= 60; p.missiles += 20; renderAll(); };
    const mob = $('ordMobilize'); if (mob) mob.onclick = () => { if (me().treasury < 15) return toast('Tesoro insufficiente.'); E.addOrder(S, { type: 'mobilize', cost: 15 }); renderAll(); };
    document.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { E.removeOrder(S, +b.dataset.rm); renderAll(); });
    const tgt = () => $('ordTarget').value;
    const inv = $('ordInvade'); if (inv) inv.onclick = () => orderInvade(tgt());
    const st = $('ordStrike'); if (st) st.onclick = () => orderStrike(tgt());
    const cy = $('ordCyber'); if (cy) cy.onclick = () => { E.addOrder(S, { type: 'cyber', target: tgt() }); renderAll(); };
    const nk = $('ordNuke'); if (nk) nk.onclick = () => orderNuke(tgt());
    const bp = $('btnProposals'); if (bp) bp.onclick = showProposals;
    const PL = GEO.politics;
    const act = (fn) => { const r = fn(); renderAll(); if (!r.ok) toast(`⚠️ ${r.reason}`); };
    const pd = $('payDebt'); if (pd) pd.onclick = () => act(() => PL.payDebt(S, S.player, +$('debtAmt').value));
    const bv = $('btnVision'); if (bv) bv.onclick = showVisionPicker;
    document.querySelectorAll('[data-policy]').forEach(b => b.onclick = () => { const [c, o] = b.dataset.policy.split(':'); const C = GEO.POLICIES[c]; confirmDlg(`${C.icon} ${C.name}: ${C.options[o].name}`, `${C.options[o].desc}<br><br>Costo ${Math.max(3, Math.round(E.effGdp(S, me()) * 0.003))} mld, stabilità −3 e consenso −2 per la transizione, nessun'altra riforma in questo ambito per 8 turni.`, 'Adotta', () => act(() => PL.setPolicy(S, S.player, c, o))); });
    document.querySelectorAll('[data-opp]').forEach(b => b.onclick = () => act(() => PL.doOppAction(S, b.dataset.opp)));
    const rb = $('btnRebel'); if (rb) rb.onclick = () => confirmDlg('✊ Ribellione', `Rompi la tutela di ${flagName(me().suzerain)}: niente più tributo, ma è probabile che il suzerain ti dichiari guerra.`, 'Ribellati', () => act(() => PL.rebel(S)), true);
    document.querySelectorAll('[data-perk]').forEach(b => b.onclick = () => { const d = GEO.PERKS[b.dataset.perk]; confirmDlg(`${d.icon} ${d.name}`, `${d.desc}<br><br>Costo: <b>${PL.cost(S, me(), d)} mld</b>. Acquisto permanente.`, 'Acquista', () => act(() => PL.buyPerk(S, S.player, b.dataset.perk))); });
    document.querySelectorAll('[data-project]').forEach(b => b.onclick = () => act(() => PL.runProject(S, S.player, b.dataset.project)));
    document.querySelectorAll('[data-soe-in]').forEach(b => b.onclick = () => act(() => PL.investSOE(S, S.player, b.dataset.soeIn, +$('soeAmt').value)));
    document.querySelectorAll('[data-soe-out]').forEach(b => b.onclick = () => act(() => PL.divestSOE(S, S.player, b.dataset.soeOut, +$('soeAmt').value)));
    document.querySelectorAll('[data-regime]').forEach(b => b.onclick = () => { const k = b.dataset.regime; const a = PL.ACTIONS[k]; if (k === 'emergency' && me().politics.emergency) return act(() => PL.doAction(S, S.player, k)); confirmDlg(`${a.icon} ${a.name}`, `${a.desc}<br><br>${k === 'purge' ? '<b class="bad">Irreversibile senza una transizione democratica.</b>' : ''}`, 'Procedi', () => act(() => PL.doAction(S, S.player, k)), k === 'purge' || k === 'rig'); });
    const be = $('btnEvents'); if (be) be.onclick = showEvents;
    document.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { const amt = +$('tradeAmt').value; const r = E.trade(S, b.dataset.buy, amt); if (!r.ok) toast(r.reason); renderAll(); });
    document.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => { const amt = +$('tradeAmt').value; const r = E.trade(S, b.dataset.sell, -amt); if (!r.ok) toast(r.reason); renderAll(); });
    const sa = $('sellAll'); if (sa) sa.onclick = () => { Object.keys(S.portfolio.holdings).forEach(k => E.trade(S, k, -1e12)); renderAll(); };
  }

  function orderInvade(target) {
    const t = N(target); const reach = E.canReach(S, S.player, target);
    if (!reach.ok) return toast(`Non puoi raggiungere ${t.name}: serve un confine, vicinanza marittima o marina ≥ 35.`);
    const regions = t.regions.filter(r => (r.controller || target) === target);
    const p = me();
    const ratio = (E.milPower(p) * reach.mult) / Math.max(1, E.milPower(t) * 1.5);
    openModal({ title: `⚔️ Invasione di ${flagName(target)}`, body: `<p>Rapporto di forze stimato: <b class="${ratio > 1.3 ? 'good' : ratio > 0.9 ? 'warn' : 'bad'}">${ratio.toFixed(2)}</b> ${reach.naval ? '(sbarco anfibio: −40%)' : ''}. La capitale ★ è attaccabile solo dopo aver preso metà delle altre regioni.</p>
      <div class="row"><label>Regione obiettivo <select id="invRegion">${regions.map(r => `<option value="${r.name}">${r.capital ? '★ ' : ''}${r.name} (${Math.round(r.share * 100)}% PIL)</option>`).join('')}</select></label></div>
      <div class="row"><label><input type="checkbox" id="invAllIn"> Assalto totale (+25% potenza, perdite +40%)</label></div>`, foot: `<button id="invNo">Annulla</button><button id="invOk" class="danger">Ordina l'offensiva</button>` });
    $('invNo').onclick = closeModal; $('invOk').onclick = () => { E.addOrder(S, { type: 'invade', target, region: $('invRegion').value, allIn: $('invAllIn').checked }); closeModal(); renderAll(); };
  }
  function orderStrike(target) {
    const p = me(); const t = N(target);
    const intercept = Math.max(2, Math.min(92, Math.round((t.tech.defense * 0.08 + t.tech.space * 0.01 - p.tech.hyper * 0.05) * 100)));
    openModal({ title: `🚀 Attacco missilistico su ${flagName(target)}`, body: `<p>Hai <b>${p.missiles}</b> missili. Intercettazione stimata: <b>${intercept}%</b>. Ogni missile a segno: −0,12% PIL, −0,25 esercito, −0,2 stabilità al bersaglio.</p><div class="row"><label>Numero missili <input type="number" id="strikeN" value="${Math.min(p.missiles, 50)}" min="1" max="${p.missiles}"></label></div>`, foot: `<button id="sNo">Annulla</button><button id="sOk" class="danger">Ordina il lancio</button>` });
    $('sNo').onclick = closeModal; $('sOk').onclick = () => { const n = Math.max(1, Math.min(p.missiles, +$('strikeN').value)); E.addOrder(S, { type: 'strike', target, count: n }); closeModal(); renderAll(); };
  }
  function orderNuke(target) {
    const p = me(); const t = N(target);
    openModal({ title: `☢️ ATTACCO NUCLEARE su ${flagName(target)}`, body: `<div class="box alert"><b>Attenzione.</b> ${t.nukes > 0 ? `${t.name} possiede ${t.nukes} testate: la rappresaglia è certa (distruzione reciproca assicurata).` : `${t.name} non ha armi nucleari${E.alliesOf(S, target).some(a => N(a).nukes > 50) ? ', ma un suo alleato nucleare potrebbe rispondere' : ''}.`} Il mondo intero ti sanzionerà, la tua reputazione crollerà, l'ONU voterà contro di te, il fallout deprimerà l'economia globale per anni e la tua stabilità interna precipiterà.</div><div class="row"><label>Testate <input type="number" id="nukeN" value="${Math.min(p.nukes, 5)}" min="1" max="${p.nukes}"></label></div>`, foot: `<button id="nNo" class="primary">Torna indietro</button><button id="nOk" class="danger">Autorizzo il lancio</button>` });
    $('nNo').onclick = closeModal; $('nOk').onclick = () => { const n = Math.max(1, Math.min(p.nukes, +$('nukeN').value)); closeModal(); confirmDlg('Conferma finale', `Confermi il lancio di ${n} testate nucleari su ${t.name}? Non si torna indietro.`, 'LANCIO', () => { E.addOrder(S, { type: 'nuke', target, count: n }); renderAll(); }, true); };
  }

  // ---------- Pannello destro -----------------------------------------------
  function renderRight() {
    const el = $('rightPanel');
    document.querySelectorAll('#rightTabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === rightTab));
    if (rightTab === 'nazione') el.innerHTML = sel && sel !== S.player ? nationPanel(N(sel)) : `<div class="muted">Seleziona una nazione sulla mappa o dalle classifiche per vedere dettagli, confronto e azioni diplomatiche.</div><h4>Relazioni principali</h4>${relationsTable()}`;
    else if (rightTab === 'rank') el.innerHTML = rankPanel();
    else el.innerHTML = worldPanel();
    bindRight();
  }
  function relationsTable() {
    const ids = E.alive(S).filter(id => id !== S.player).sort((a, b) => E.getRel(S, S.player, b) - E.getRel(S, S.player, a));
    return `<table>${ids.map(id => { const r = E.getRel(S, S.player, id); return `<tr class="click" data-sel="${id}"><td>${flagName(id)}</td><td style="width:40%">${bar(r + 100, 200, 'rel')}</td><td class="right" style="color:${relColor(r)}">${r}</td></tr>`; }).join('')}</table>`;
  }

  function nationPanel(n) {
    const p = me(); const id = n.id; const rel = E.getRel(S, S.player, id);
    const war = E.atWar(S, S.player, id);
    const treaties = E.treatiesOf(S, id).filter(t => t.a === S.player || t.b === S.player);
    const allies = E.alliesOf(S, id); const enemies = E.enemiesOf(S, id);
    const sancOn = E.sanctionsOn(S, id); const iSanc = E.isSanctioning(S, S.player, id); const theySanc = E.isSanctioning(S, id, S.player);
    const cmp = (l, a, b, d = 0, suffix = '') => `<tr><td>${l}</td><td class="${a > b ? 'good' : a < b ? 'bad' : ''}">${fmt(a, d)}${suffix}</td><td>${fmt(b, d)}${suffix}</td></tr>`;
    const P = GEO.PERSONAS[n.persona];
    const canReach = E.canReach(S, S.player, id);
    const peaceBtns = war ? `<button data-act="pace_bianca">🕊️ Pace bianca</button><button data-act="pace_annessione">🕊️ Pace con annessioni</button><button data-act="pace_tributo">🕊️ Pace con tributo</button>` : '';
    return `<div style="display:flex;gap:10px;align-items:center"><div style="font-size:40px">${n.flag}</div><div><h3 style="margin:0">${n.name}</h3><div class="small muted">${n.regime} · ${P.label} · ${n.continent}</div><div class="small muted">${P.desc}</div></div></div>
      <div style="margin:8px 0">${n.blocs.map(b => `<span class="tag">${GEO.BLOCS[b].name}</span>`).join('')} ${war ? '<span class="tag war">IN GUERRA CON TE</span>' : ''} ${treaties.map(t => `<span class="tag ${t.type === 'difesa' ? 'ally' : t.type === 'commercio' ? 'trade' : ''}">${t.type}${t.expires ? ' (fino T' + t.expires + ')' : ''}</span>`).join('')} ${iSanc ? '<span class="tag sanc">tu la sanzioni</span>' : ''} ${theySanc ? '<span class="tag sanc">ti sanziona</span>' : ''} ${n.suzerain ? `<span class="tag">satellite di ${N(n.suzerain).flag}</span>` : ''}</div>
      <div class="row"><label>Relazioni con te: <b style="color:${relColor(rel)}">${rel} · ${relLabel(rel)}</b></label></div>${bar(rel + 100, 200, 'rel')}
      ${(() => { const pr = GEO.PROFILES[id] || {}; return `<div class="small muted" style="margin:4px 0">🏛️ ${pr.capital || '—'} · ${pr.title || ''} · ISU ${pr.hdi ?? '—'} · PIL pro capite ${fmt(E.effGdp(S, n) / n.pop * 1000)} $ · disoccupazione ${pr.unemp ?? '—'}% · età mediana ${pr.medianAge ?? '—'} · CO₂ ${fmt((pr.co2 || 0) * (E.mods(n).co2 || 1))} Mt</div>`; })()}
      <div class="small" style="margin:4px 0">${n.vision ? `${GEO.VISIONS[n.vision].icon} ${GEO.VISIONS[n.vision].name} · ` : ''}${['esteri', 'difesa', 'nucleare', 'energia'].map(c => GEO.POLICIES[c].options[n.policies[c]].name).join(' · ')}</div>
      <div class="small" style="margin:6px 0"><span class="regime-tag regime-${n.regime}">${n.regime}</span> ${n.politics && n.politics.nextElection ? `· elezioni al T${n.politics.nextElection}` : n.politics ? `· lealtà élite ${fmt(n.politics.loyalty)}` : ''} · inflazione ${fmt(n.inflation, 1)}% · capacità: ${Object.keys(n.perks).map(k => GEO.PERKS[k].icon).join(' ') || '—'}</div>
      <div class="small" style="margin:6px 0">Reputazione ${fmt(n.reputation)} · Alleati: ${allies.length ? allies.map(a => N(a).flag).join(' ') : '—'} · Nemici: ${enemies.length ? enemies.map(a => N(a).flag).join(' ') : '—'} · Sanzionata da ${sancOn.length} paesi</div>
      <table class="compare"><tr><th></th><th>${n.flag} loro</th><th>${p.flag} tu</th></tr>
      ${cmp('PIL (mld)', E.effGdp(S, n), E.effGdp(S, p))}${cmp('Crescita', n.lastGrowth, p.lastGrowth, 1, '%')}${cmp('Potenza militare', E.milPower(n), E.milPower(p))}${cmp('Esercito / Marina / Aero', n.army, p.army)}${cmp('Missili', n.missiles, p.missiles)}${cmp('Testate nucleari', n.nukes, p.nukes)}${cmp('Difesa aerea', n.tech.defense, p.tech.defense)}${cmp('Tech media', E.avgTech(n), E.avgTech(p), 1)}${cmp('IA / Chip', n.tech.ai, p.tech.ai)}${cmp('Stabilità', n.stability, p.stability)}${cmp('Tesoro', n.treasury, p.treasury)}${cmp('Punteggio', E.score(S, n), E.score(S, p))}</table>
      <div class="small muted" style="margin-top:4px">Regioni: ${n.regions.map(r => `${r.capital ? '★' : ''}${r.name}${r.controller && r.controller !== id ? ` <span class="bad">[${N(r.controller).flag}]</span>` : ''}`).join(' · ')}</div>
      <div class="small muted">Risorse: ${Object.entries(n.res).filter(([k, v]) => v >= 5).map(([k, v]) => `${GEO.COMMODITIES[k].icon} ${v}`).join(' ') || 'importatore'} · Raggiungibile: ${canReach.ok ? (canReach.naval ? 'via mare' : 'sì') : 'no'}</div>
      <h4>Diplomazia</h4>
      <div class="actions-grid">
        ${war ? peaceBtns : `<button data-act="commercio">🤝 Accordo commerciale</button><button data-act="nonaggressione">📜 Non aggressione</button><button data-act="alleanza">🛡️ Alleanza difensiva</button><button data-act="ultimatum">⚠️ Ultimatum</button>`}
        ${E.warsOf(S, S.player).length && !war ? `<button data-act="entrata_guerra">🪖 Chiedi intervento</button>` : ''}
        <button data-act="aiuti">💵 Aiuti economici</button><button data-act="aiuti_mil">🎖️ Aiuti militari</button>
        ${iSanc ? `<button data-act="revoca">✅ Revoca sanzioni</button>` : `<button data-act="sanzioni">🚫 Sanzioni</button>`}
        ${p.tech.semis >= 8 && !E.isSanctioning(S, S.player, id, 'tech') ? `<button data-act="embargo">🔲 Embargo chip</button>` : ''}
        <button data-act="spionaggio">🕵️ Spionaggio tecnologico</button><button data-act="destabilizza">🔥 Destabilizza</button>
        ${treaties.length ? `<button data-act="rompi">✂️ Rompi trattato</button>` : ''}
        ${!war ? `<button data-act="guerra" class="danger">⚔️ Dichiara guerra</button>` : `<button data-act="ordini" class="danger">🎯 Ordini militari</button>`}
      </div>
      <div id="actResult" class="small" style="margin-top:8px"></div>`;
  }

  function rankPanel() {
    const rank = E.ranking(S);
    const top = rank.slice(0, 6);
    const colors = ['#f5b942', '#4f8cff', '#ff5c5c', '#3ddc84', '#b388ff', '#ff9f43'];
    const hist = top.map((r, i) => ({ id: r.id, h: S.scoreHist[r.id] || [], c: colors[i] }));
    const maxLen = Math.max(...hist.map(x => x.h.length)); const all = hist.flatMap(x => x.h); const mn = Math.min(...all), mx = Math.max(...all); const W = 330, H = 110;
    const lines = hist.map(x => `<polyline fill="none" stroke="${x.c}" stroke-width="2" points="${x.h.map((v, i) => `${(i / Math.max(1, maxLen - 1) * W).toFixed(1)},${(H - (v - mn) / (mx - mn || 1) * (H - 6) - 3).toFixed(1)}`).join(' ')}"/>`).join('');
    return `<h4>Punteggio di potenza nel tempo</h4><svg width="${W}" height="${H}" style="background:var(--bg3);border-radius:8px">${lines}</svg><div class="small">${hist.map(x => `<span style="color:${x.c}">■ ${N(x.id).flag} ${N(x.id).name}</span>`).join(' ')}</div>
      <table style="margin-top:8px"><tr><th>#</th><th>Nazione</th><th class="right">Punti</th><th class="right">PIL</th><th class="right">Mil.</th><th class="right">Tech</th><th class="right">Stab.</th></tr>
      ${rank.map((r, i) => { const n = N(r.id); return `<tr class="click ${r.id === S.player ? 'me' : ''}" data-sel="${r.id}"><td>${i + 1}</td><td>${n.flag} ${n.name}</td><td class="right"><b>${r.score}</b></td><td class="right">${fmt(E.effGdp(S, n))}</td><td class="right">${fmt(E.milPower(n))}</td><td class="right">${E.avgTech(n).toFixed(1)}</td><td class="right">${fmt(n.stability)}</td></tr>`; }).join('')}</table>`;
  }

  function worldPanel() {
    const wars = S.wars.map(w => `<div class="box" style="padding:6px 8px"><b>${w.label}</b> <span class="small muted">dal T${w.since}</span><br><span class="small">⚔️ ${w.attackers.map(flagName).join(', ')}<br>🛡️ ${w.defenders.map(flagName).join(', ')}</span></div>`).join('') || '<div class="small muted">Nessuna guerra in corso.</div>';
    const un = S.un.slice(0, 6).map(u => `<div class="small" style="margin-bottom:4px">T${u.turn}: contro ${N(u.aggressor).flag} ${N(u.aggressor).name} (${u.kind}) — ${u.yes}/${u.no}${u.veto.length ? ', veto ' + u.veto.map(v => N(v).flag).join('') : ''} → <b>${u.passed ? 'approvata' : 'respinta'}</b></div>`).join('') || '<div class="small muted">Nessuna risoluzione.</div>';
    const mySanc = S.sanctions.filter(x => x.to === S.player).map(x => `<span class="tag sanc">${N(x.from).flag} ${x.type}</span>`).join('') || '<span class="muted">nessuna</span>';
    const treaties = E.treatiesOf(S, S.player).map(t => `<span class="tag ${t.type === 'difesa' ? 'ally' : t.type === 'commercio' ? 'trade' : ''}">${N(t.a === S.player ? t.b : t.a).flag} ${t.type}</span>`).join('') || '<span class="muted">nessuno</span>';
    const blocs = Object.entries(GEO.BLOCS).concat(Object.entries(S.customBlocs || {})).map(([k, b]) => { const mem = E.alive(S).filter(id => N(id).blocs.includes(k)); return mem.length ? `<div class="small"><b style="color:${b.color}">${b.name}</b>${b.defense ? ' 🛡️' : ''}: ${mem.map(id => N(id).flag).join(' ')}</div>` : ''; }).join('');
    const com = Object.entries(GEO.COMMODITIES).map(([k, c]) => { const prod = E.alive(S).filter(id => (N(id).res[k] || 0) >= 6).map(id => N(id).flag).join(''); return `<div class="small">${c.icon} ${c.name}: <b>${fmt(S.market.commodities[k].price, 0)}</b> ${c.unit} · produttori ${prod}</div>`; }).join('');
    const cl = S.climate || { temp: 1.3, co2: 0, hist: [] };
    const climate = `<div class="box ${cl.temp > 1.8 ? 'alert' : 'info'}" style="padding:8px 10px">🌡️ Riscaldamento globale: <b>+${cl.temp.toFixed(2)} °C</b> · emissioni ${fmt(cl.co2 / 1000, 1)} Gt/anno ${spark(cl.hist, 90, 22, '#ff9f43')}<div class="small muted">Sopra +1,6 °C aumentano disastri e carestie; sopra +1,8 °C catastrofi continentali. Le tue emissioni: ${fmt((GEO.PROFILES[S.player] || { co2: 0 }).co2 * (E.mods(me()).co2 || 1) * Math.sqrt(me().gdp / me().gdp0))} Mt (politica energetica: ${GEO.POLICIES.energia.options[me().policies.energia].name}).</div></div>`;
    const custom = Object.entries(S.customBlocs || {}).map(([k, b]) => { const mem = E.alive(S).filter(id => N(id).blocs.includes(k)); const cands = E.alive(S).filter(id => !N(id).blocs.includes(k) && id !== S.player); return `<div class="box" style="padding:8px 10px"><b style="color:${b.color}">${b.name}</b> <span class="small muted">${b.defense ? 'difesa' : ''}${b.defense && b.trade ? ' + ' : ''}${b.trade ? 'commercio' : ''} · fondato da ${N(b.founder).flag}</span><div class="small">Membri: ${mem.map(id => N(id).flag).join(' ')}</div>${b.founder === S.player ? `<div class="row" style="margin-top:4px"><select data-invsel="${k}">${cands.map(id => `<option value="${id}">${N(id).flag} ${N(id).name} (${E.getRel(S, S.player, id)})</option>`).join('')}</select><button class="small ok" data-invite="${k}">Invita</button></div>` : ''}</div>`; }).join('');
    const found = E.playerGoverns(S, S.player) ? `<div class="row"><input type="text" id="blocName" placeholder="Nome del blocco" style="flex:1"><select id="blocType"><option value="difesa">Difesa</option><option value="commercio">Commercio</option><option value="entrambi">Entrambi</option></select><button class="small primary" id="btnFound">Fonda</button></div>` : '';
    const mine = me().blocs.map(k => `<span class="tag">${E.bloc(S, k).name} <button class="small danger" data-leave="${k}" title="Esci" ${E.playerGoverns(S, S.player) ? '' : 'disabled'}>✕</button></span>`).join(' ') || '<span class="muted">nessuno</span>';
    const hist = (S.history || []).slice(0, 40).map(h => `<div class="news-item ${h.kind}"><span class="d">${h.date}</span>${esc(h.text)}</div>`).join('') || '<div class="small muted">Ancora nulla da raccontare.</div>';
    const ach = Object.entries(S.achievements || {}).map(([k, t]) => `<span class="tag ally">🏆 ${k} (T${t})</span>`).join(' ');
    return `<h4>Clima</h4>${climate}<h4>Guerre (${S.wars.length})</h4>${wars}<h4>I tuoi blocchi</h4><div>${mine}</div>${found}${custom}<h4>Sanzioni contro di te</h4><div>${mySanc}</div><h4>I tuoi trattati</h4><div>${treaties}</div><h4>ONU — Consiglio di Sicurezza</h4>${un}<h4>Blocchi mondiali</h4>${blocs}<h4>Materie prime</h4>${com}<h4>Cronaca del tuo regno</h4>${ach ? `<div style="margin-bottom:6px">${ach}</div>` : ''}${hist}`;
  }

  function bindRight() {
    document.querySelectorAll('[data-sel]').forEach(r => r.onclick = () => { sel = r.dataset.sel; rightTab = 'nazione'; renderRight(); drawMap(); });
    const bf = $('btnFound'); if (bf) bf.onclick = () => { const name = ($('blocName').value || '').trim(); if (!name) return toast('Dai un nome al blocco.'); if (me().treasury < 20) return toast('Servono 20 mld per fondare un blocco.'); me().treasury -= 20; E.foundBloc(S, S.player, name, $('blocType').value); renderAll(); };
    document.querySelectorAll('[data-invite]').forEach(b => b.onclick = () => { const k = b.dataset.invite; const to = document.querySelector(`[data-invsel="${k}"]`).value; const r = E.inviteBloc(S, S.player, to, k); renderAll(); toast(r.ok ? `${flagName(to)} aderisce al blocco.` : `${flagName(to)} rifiuta: ${r.reason}`); });
    document.querySelectorAll('[data-leave]').forEach(b => b.onclick = () => confirmDlg('Uscita dal blocco', `Uscire da ${E.bloc(S, b.dataset.leave).name}? Relazioni −20 con i membri${b.dataset.leave === 'EU' ? ', PIL −4%' : ''}.`, 'Esci', () => { E.leaveBloc(S, S.player, b.dataset.leave); renderAll(); }, true));
    document.querySelectorAll('[data-act]').forEach(b => b.onclick = () => doAction(b.dataset.act));
  }

  function showResult(ok, text) { const el = $('actResult'); if (el) el.innerHTML = `<div class="box ${ok ? 'info' : 'alert'}" style="padding:6px 8px">${text}</div>`; toast(text); }

  function doAction(act) {
    const id = sel; const n = N(id); const p = me();
    const propose = (type, terms, okText) => { const r = E.propose(S, S.player, id, type, terms); renderAll(); showResult(r.ok, r.ok ? okText : `${n.flag} ${n.name} rifiuta: ${r.reason}`); };
    switch (act) {
      case 'commercio': propose('commercio', {}, `${n.name} accetta l'accordo commerciale.`); break;
      case 'nonaggressione': propose('nonaggressione', {}, `${n.name} firma il patto di non aggressione.`); break;
      case 'alleanza': propose('alleanza', {}, `${n.name} accetta l'alleanza difensiva!`); break;
      case 'pace_bianca': propose('pace', { kind: 'bianca' }, `${n.name} accetta la pace bianca.`); break;
      case 'pace_annessione': propose('pace', { kind: 'annessione' }, `${n.name} accetta la pace e cede le regioni occupate.`); break;
      case 'pace_tributo': propose('pace', { kind: 'tributo' }, `${n.name} accetta la pace e pagherà un tributo.`); break;
      case 'entrata_guerra': {
        const enemies = E.enemiesOf(S, S.player);
        openModal({ title: 'Richiesta di intervento', body: `<div class="row"><label>Contro chi? <select id="ewT">${enemies.map(e => `<option value="${e}">${flagName(e)}</option>`).join('')}</select></label></div>`, foot: `<button id="ewNo">Annulla</button><button id="ewOk" class="primary">Chiedi</button>` });
        $('ewNo').onclick = closeModal; $('ewOk').onclick = () => { const t = $('ewT').value; closeModal(); propose('entrata_guerra', { target: t }, `${n.name} entra in guerra al tuo fianco!`); }; break;
      }
      case 'ultimatum': {
        const regions = n.regions.filter(r => !r.capital && (r.controller || id) === id);
        openModal({ title: `⚠️ Ultimatum a ${flagName(id)}`, body: `<p>Un ultimatum respinto costa relazioni e credibilità. Funziona solo con una schiacciante superiorità militare (rapporto ≥ 2 per un tributo, ≥ 3 per una regione) e contro stati non nucleari.</p><div class="row"><label>Richiesta <select id="ultK"><option value="tributo">Tributo (3% del loro PIL)</option>${regions.length ? '<option value="regione">Cessione di una regione</option>' : ''}</select></label><label>Regione <select id="ultR">${regions.map(r => `<option value="${r.name}">${r.name}</option>`).join('')}</select></label></div>`, foot: `<button id="uNo">Annulla</button><button id="uOk" class="danger">Invia ultimatum</button>` });
        $('uNo').onclick = closeModal; $('uOk').onclick = () => { const k = $('ultK').value, r = $('ultR').value; closeModal(); propose('ultimatum', { kind: k, region: r }, `${n.name} cede alle tue richieste!`); }; break;
      }
      case 'aiuti': case 'aiuti_mil': {
        const kind = act === 'aiuti' ? 'economici' : 'militari';
        openModal({ title: `Aiuti ${kind} a ${flagName(id)}`, body: `<p>Tesoro disponibile: ${fmt(p.treasury)} mld. ${kind === 'militari' ? 'Gli aiuti militari rafforzano esercito e missili del destinatario e irritano i suoi nemici.' : 'Gli aiuti economici migliorano stabilità e relazioni.'}</p><div class="row"><label>Importo (mld) <input type="number" id="aidAmt" value="${Math.min(50, Math.floor(p.treasury / 2))}" min="1" max="${Math.floor(p.treasury)}"></label></div>`, foot: `<button id="aNo">Annulla</button><button id="aOk" class="primary">Invia</button>` });
        $('aNo').onclick = closeModal; $('aOk').onclick = () => { const amt = +$('aidAmt').value; closeModal(); const ok = E.sendAid(S, S.player, id, amt, kind); renderAll(); showResult(ok, ok ? `Inviati ${amt} mld di aiuti ${kind} a ${n.name}.` : 'Importo non valido o tesoro insufficiente.'); }; break;
      }
      case 'sanzioni': confirmDlg('Sanzioni', `Imporre sanzioni economiche a ${n.name}? Danneggia la loro crescita in proporzione al tuo PIL, rompe gli accordi commerciali e peggiora le relazioni.`, 'Sanziona', () => { E.sanction(S, S.player, id); renderAll(); showResult(true, `Sanzioni imposte a ${n.name}.`); }); break;
      case 'embargo': confirmDlg('Embargo chip', `Bloccare l'export di semiconduttori avanzati verso ${n.name}? La loro ricerca sull'IA si fermerà se non hanno altre fonti.`, 'Embargo', () => { E.sanction(S, S.player, id, 'tech'); renderAll(); showResult(true, `Embargo tecnologico contro ${n.name}.`); }); break;
      case 'revoca': E.liftSanctions(S, S.player, id); renderAll(); showResult(true, `Sanzioni revocate a ${n.name}.`); break;
      case 'spionaggio': {
        const techs = Object.entries(GEO.TECHS).filter(([k]) => n.tech[k] > p.tech[k]);
        if (!techs.length) return showResult(false, `${n.name} non è più avanti di te in nessuna tecnologia.`);
        openModal({ title: `🕵️ Spionaggio contro ${flagName(id)}`, body: `<p>Probabilità di successo ≈ ${Math.round(E.clamp(0.35 + p.tech.cyber * 0.04 + p.tech.space * 0.02 - n.tech.quantum * 0.04 - n.tech.cyber * 0.02, 0.05, 0.9) * 100)}%. Costo: 10 mld. Se scoperto, −20 relazioni.</p><div class="row"><label>Tecnologia <select id="spyT">${techs.map(([k, t]) => `<option value="${k}">${t.icon} ${t.name} (loro ${n.tech[k]}, tu ${p.tech[k]})</option>`).join('')}</select></label></div>`, foot: `<button id="spNo">Annulla</button><button id="spOk" class="primary">Avvia operazione</button>` });
        $('spNo').onclick = closeModal; $('spOk').onclick = () => { if (p.treasury < 10) return toast('Tesoro insufficiente.'); p.treasury -= 10; const t = $('spyT').value; closeModal(); const r = E.espionage(S, S.player, id, t); renderAll(); showResult(r.success, `Operazione ${r.success ? 'riuscita: progressi rubati in ' + GEO.TECHS[t].name : 'fallita'}${r.caught ? '. Le tue spie sono state scoperte!' : '.'}`); }; break;
      }
      case 'destabilizza': confirmDlg('Operazione coperta', `Finanziare opposizione e disinformazione in ${n.name}? Costo 20 mld. Riduce la loro stabilità; se scoperto, −30 relazioni e reputazione.`, 'Autorizza', () => { if (p.treasury < 20) return toast('Tesoro insufficiente.'); p.treasury -= 20; const r = E.destabilize(S, S.player, id); renderAll(); showResult(!r.caught, `Stabilità di ${n.name} ridotta di ${r.eff.toFixed(1)}.${r.caught ? ' Operazione scoperta!' : ''}`); }); break;
      case 'rompi': {
        const ts = E.treatiesOf(S, id).filter(t => t.a === S.player || t.b === S.player);
        openModal({ title: 'Rompi trattato', body: `<div class="row"><label>Trattato <select id="brT">${ts.map(t => `<option value="${t.type}">${t.type}</option>`).join('')}</select></label></div><p class="small muted">−15 reputazione, −25 relazioni.</p>`, foot: `<button id="brNo">Annulla</button><button id="brOk" class="danger">Straccia</button>` });
        $('brNo').onclick = closeModal; $('brOk').onclick = () => { E.breakTreaty(S, S.player, id, $('brT').value); closeModal(); renderAll(); }; break;
      }
      case 'guerra': {
        const allies = E.alliesOf(S, id).filter(a => a !== S.player);
        const casus = (p.claims && p.claims[id]) || E.isSanctioning(S, id, S.player);
        confirmDlg('⚔️ Dichiarazione di guerra', `Dichiarare guerra a ${flagName(id)}?<br><br>Alleati che potrebbero intervenire: ${allies.length ? allies.map(flagName).join(', ') : 'nessuno'}.<br>Armi nucleari del bersaglio: ${n.nukes}.<br>Casus belli: ${casus ? 'sì' : '<b class="bad">no</b> (sanzioni, voto ONU, −reputazione)'}.${E.hasTreaty(S, S.player, id, 'nonaggressione') ? '<br><b class="bad">Violeresti un patto di non aggressione (−25 reputazione).</b>' : ''}`, 'Dichiara guerra', () => { E.declareWar(S, S.player, id); leftTab = 'mil'; renderAll(); }, true); break;
      }
      case 'ordini': leftTab = 'mil'; renderLeft(); break;
    }
  }

  // ---------- Proposte ed eventi ---------------------------------------------
  function showProposals(then) {
    if (!S.pending.length) { if (then) then(); return; }
    const body = S.pending.map(p => `<div class="proposal" id="prop_${p.id}"><div><b>${N(p.from).flag} ${N(p.from).name}</b> · ${GEO.PERSONAS[N(p.from).persona].label} · relazioni ${E.getRel(S, S.player, p.from)}<br>${p.text}</div><div style="display:flex;gap:6px;flex-shrink:0"><button class="ok" data-acc="${p.id}">Accetta</button><button class="danger" data-rej="${p.id}">Rifiuta</button></div></div>`).join('');
    openModal({ title: '📨 Proposte diplomatiche', body, foot: `<button id="propLater">Decidi più tardi</button>`, onClose: then });
    $('propLater').onclick = () => { closeModal(); if (then) then(); };
    const handle = (id, acc) => { E.answerProposal(S, id, acc); const el = $('prop_' + id); if (el) el.remove(); renderAll(); if (!S.pending.length) { closeModal(); if (then) then(); } };
    document.querySelectorAll('[data-acc]').forEach(b => b.onclick = () => handle(+b.dataset.acc, true));
    document.querySelectorAll('[data-rej]').forEach(b => b.onclick = () => handle(+b.dataset.rej, false));
  }
  const fxLabel = (fx) => Object.entries(fx).map(([k, v]) => ({ stability: `stabilità ${v > 0 ? '+' : ''}${v}`, approval: `consenso ${v > 0 ? '+' : ''}${v}`, debt: `debito ${v > 0 ? '+' : ''}${v}%`, growth: `crescita ${v > 0 ? '+' : ''}${v}%`, treasury: `tesoro ${v > 0 ? '+' : ''}${v} mld`, gdpPct: `PIL ${v}%`, military: `esercito +${v}`, relAll: `relazioni con tutti ${v}`, relDem: `relazioni con le democrazie ${v}`, relSuspect: `relazioni col sospettato ${v}`, cyberHit: 'cyberattacco di rappresaglia', techProg: 'progresso tecnologico', techProgAll: `progresso in tutte le tech ${v > 0 ? '+' : ''}${v}`, res: 'nuove risorse', risk: 'rischio di conseguenze', enemyMissiles: `missili nemici ${v}`, enemyStability: `stabilità nemica ${v}`, inflation: `inflazione ${v > 0 ? '+' : ''}${v}`, loyalty: `lealtà élite ${v > 0 ? '+' : ''}${v}`, opposition: `opposizione ${v > 0 ? '+' : ''}${v}`, pressFreedom: `libertà di stampa ${v}` }[k] || k)).join(' · ');
  function showEvents(then) {
    if (!S.pendingEvents.length) { if (then) then(); return; }
    const pe = S.pendingEvents[0]; const ev = GEO.EVENTS.find(e => e.id === pe.id);
    const text = ev.text.replace('{s}', flagName(pe.suspect)).replace('{n}', flagName(S.player)).replace('{deathNote}', 'Sei sopravvissuto per miracolo.');
    openModal({ title: `📌 ${ev.title}`, onClose: null, body: `<p>${text}</p>${ev.options.map((o, i) => `<button class="option" data-opt="${i}">${o.label.replace('{s}', flagName(pe.suspect))}<span class="fx">${fxLabel(o.fx) || 'nessun effetto diretto'}</span></button>`).join('')}` });
    document.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => { E.resolveEvent(S, 0, +b.dataset.opt); closeModal(); renderAll(); showEvents(then); });
  }

  // ---------- Fine turno -----------------------------------------------------
  function endTurn() {
    if (!S || S.gameOver) return;
    if (S.pendingEvents.length) return showEvents(() => endTurn());
    E.endTurn(S);
    save(true);
    renderAll();
    if (S.gameOver) return showGameOver();
    showTurnReport(() => showAlerts(() => showEvents(() => showProposals())));
  }
  function showAlerts(then) {
    if (!S.alerts || !S.alerts.length) { if (then) then(); return; }
    const a = S.alerts.shift();
    openModal({ title: a.title, onClose: null, body: `<div>${a.text}</div>`, foot: `<button id="alOk" class="primary">Continua</button>` });
    $('alOk').onclick = () => { closeModal(); showAlerts(then); };
  }
  function showTurnReport(then) {
    const p = me(); const last = S.turn - 1;
    const items = S.news.filter(n => n.turn === last && n.kind !== 'sys' && n.actors && n.actors.includes(S.player));
    const world = S.news.filter(n => n.turn === last && ['war', 'nuke', 'un'].includes(n.kind) && !(n.actors && n.actors.includes(S.player))).slice(0, 6);
    const sh = S.scoreHist[S.player]; const dScore = sh.length > 1 ? sh[sh.length - 1] - sh[sh.length - 2] : 0;
    const pv = E.portfolioValue(S); const cost = Object.values(S.portfolio.holdings).reduce((a, h) => a + h.cost, 0);
    if (!items.length && !world.length && !S.pendingEvents.length && !S.pending.length && !(S.alerts && S.alerts.length)) { if (then) then(); return; }
    openModal({ title: `📋 Rapporto del trimestre — ${E.dateLabel(S)}`, onClose: then, body: `
      <div class="stat-grid" style="grid-template-columns:repeat(4,1fr)">
        <div class="stat"><div class="l">Crescita</div><div class="v ${sign(p.lastGrowth)}">${pct(p.lastGrowth)}</div></div>
        <div class="stat"><div class="l">Stabilità</div><div class="v">${fmt(p.stability)} <span class="small ${sign(p.stability - p.prevStability)}">${(p.stability - p.prevStability >= 0 ? '+' : '') + fmt(p.stability - p.prevStability, 1)}</span></div></div>
        <div class="stat"><div class="l">Potenza</div><div class="v">${E.score(S, p)} <span class="small ${sign(dScore)}">${dScore >= 0 ? '+' : ''}${dScore}</span></div></div>
        <div class="stat"><div class="l">Portafoglio</div><div class="v">${fmt(pv)} <span class="small ${sign(pv - cost)}">${cost ? pct((pv / cost - 1) * 100) : ''}</span></div></div>
        <div class="stat"><div class="l">Inflazione</div><div class="v ${p.inflation > 8 ? 'bad' : ''}">${fmt(p.inflation, 1)}%</div></div>
        <div class="stat"><div class="l">${p.regime === 'autocrazia' ? 'Lealtà élite' : 'Elezioni tra'}</div><div class="v">${p.regime === 'autocrazia' ? fmt(p.politics.loyalty) : p.politics.emergency ? 'sospese' : (p.politics.nextElection - S.turn) + ' turni'}</div></div>
        <div class="stat"><div class="l">Tesoro</div><div class="v">${fmt(p.treasury)}</div></div>
        <div class="stat"><div class="l">Debito</div><div class="v">${fmt(p.debt)}%</div></div>
      </div>
      ${items.length ? `<h4>Ti riguarda</h4>${items.map(n => `<div class="news-item ${n.kind}">${esc(n.text)}</div>`).join('')}` : ''}
      ${world.length ? `<h4>Nel mondo</h4>${world.map(n => `<div class="news-item ${n.kind}">${esc(n.text)}</div>`).join('')}` : ''}
      ${S.pendingEvents.length ? `<p class="warn">📌 ${S.pendingEvents.length} eventi richiedono una decisione.</p>` : ''}${S.pending.length ? `<p class="warn">📨 ${S.pending.length} proposte diplomatiche in attesa.</p>` : ''}`, foot: `<button id="trOk" class="primary">Continua</button>` });
    $('trOk').onclick = () => { closeModal(); if (then) then(); };
  }
  function showGameOver() {
    const g = S.gameOver; const rank = E.ranking(S); const p = me();
    openModal({ title: g.type === 'vittoria' ? '🏆 VITTORIA' : g.type === 'sconfitta' ? '💀 SCONFITTA' : '🏁 Fine della partita', onClose: null, body: `<div class="score-big">${E.score(S, p)} punti</div><p class="center">${g.text}</p><div class="small muted">Traguardi: ${Object.keys(S.achievements || {}).join(', ') || 'nessuno'} · Mandati: ${p.politics.terms} · Riforme e svolte: ${(S.history || []).filter(h => h.kind === 'policy').length}</div><table><tr><th>#</th><th>Nazione</th><th class="right">Punti</th></tr>${rank.slice(0, 10).map((r, i) => `<tr class="${r.id === S.player ? 'me' : ''}"><td>${i + 1}</td><td>${flagName(r.id)}</td><td class="right">${r.score}</td></tr>`).join('')}</table>`, foot: `<button id="goCont">Continua a osservare</button><button id="goNew" class="primary">Nuova partita</button>` });
    $('goCont').onclick = () => { closeModal(); S.gameOver = null; S.maxTurns += 1000; };
    $('goNew').onclick = () => { closeModal(); showSetup(); };
  }

  // ---------- Notiziario -------------------------------------------------------
  function renderNews() {
    const filters = [['tutto', 'Tutto'], ['me', 'Mi riguarda'], ['war', 'Guerra'], ['dip', 'Diplomazia'], ['eco', 'Economia'], ['tech', 'Tech'], ['event', 'Eventi'], ['un', 'ONU']];
    $('newsFilters').innerHTML = filters.map(([k, l]) => `<button class="${newsFilter === k ? 'primary' : ''}" data-nf="${k}">${l}</button>`).join('');
    document.querySelectorAll('[data-nf]').forEach(b => b.onclick = () => { newsFilter = b.dataset.nf; renderNews(); });
    const list = S.news.filter(n => newsFilter === 'tutto' || (newsFilter === 'me' ? n.actors && n.actors.includes(S.player) : n.kind === newsFilter || (newsFilter === 'war' && n.kind === 'nuke')));
    $('news').innerHTML = list.slice(0, 120).map(n => `<div class="news-item ${n.kind} ${n.actors && n.actors.includes(S.player) ? 'me' : ''}"><span class="d">${n.date}</span>${n.kind === 'sys' ? n.text : esc(n.text)}</div>`).join('');
  }

  // ---------- Mappa (confini reali Natural Earth) ----------------------------
  const canvas = $('map'); const ctx = canvas.getContext('2d');
  let mapW = 0, mapH = 0, hover = null, mapMode = 'stato';
  const view = { k: 1, tx: 0, ty: 0 };
  let base = { s: 1, ox: 0, oy: 0 };
  const proj = (lon, lat) => [(base.ox + (lon + 180) * base.s) * view.k + view.tx, (base.oy + (84 - lat) * base.s) * view.k + view.ty];
  const invProj = (x, y) => [((x - view.tx) / view.k - base.ox) / base.s - 180, 84 - ((y - view.ty) / view.k - base.oy) / base.s];
  const WORLD = GEO.WORLD || {}; const labelPt = {}, bboxes = {}, areas = {};
  const ringArea = (r) => { let a = 0; for (let i = 0; i < r.length; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length]; a += x1 * y2 - x2 * y1; } return a / 2; };
  const ringCentroid = (r) => { let cx = 0, cy = 0, a = 0; for (let i = 0; i < r.length; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length]; const f = x1 * y2 - x2 * y1; cx += (x1 + x2) * f; cy += (y1 + y2) * f; a += f; } a *= 0.5; return a ? [cx / (6 * a), cy / (6 * a)] : r[0]; };
  Object.entries(WORLD).forEach(([iso, polys]) => { let best = null, minx = 999, miny = 999, maxx = -999, maxy = -999, tot = 0; polys.forEach(r => { const a = Math.abs(ringArea(r)); tot += a; if (!best || a > best.a) best = { a, r }; r.forEach(([x, y]) => { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }); }); labelPt[iso] = best ? ringCentroid(best.r) : [0, 0]; bboxes[iso] = [minx, miny, maxx, maxy]; areas[iso] = tot; });
  Object.assign(labelPt, { USA: [-98, 39.5], CAN: [-105, 60], RUS: [95, 62], FRA: [2.5, 46.5], NOR: [9, 61.5], CHL: [-70.5, -27], ARG: [-64, -37], IDN: [113, -1], PHL: [122, 12], MYS: [102, 4], NZL: [172, -42], JPN: [138, 36.5], GBR: [-2, 53.5], ITA: [12.5, 42.5], VNM: [106, 16], GRC: [22, 39.5], HRV: [16, 45] });
  const pointInRing = (x, y, r) => { let inside = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside; } return inside; };
  const isoAt = (lon, lat) => { for (const iso of Object.keys(WORLD)) { const b = bboxes[iso]; if (lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) continue; if (WORLD[iso].some(r => pointInRing(lon, lat, r))) return iso; } return null; };
  function resizeMap() { const r = $('mapWrap').getBoundingClientRect(); const dpr = window.devicePixelRatio || 1; mapW = r.width; mapH = r.height; canvas.width = mapW * dpr; canvas.height = mapH * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); const sc = Math.min(mapW / 360, mapH / 144) * 1.04; base = { s: sc, ox: (mapW - 360 * sc) / 2, oy: (mapH - 144 * sc) / 2 }; drawMap(); }
  function zoomAt(mx, my, factor) { const k2 = Math.max(1, Math.min(8, view.k * factor)); const f = k2 / view.k; view.tx = mx - (mx - view.tx) * f; view.ty = my - (my - view.ty) * f; view.k = k2; clampView(); drawMap(); }
  function clampView() { if (view.k === 1) { view.tx = 0; view.ty = 0; return; } view.tx = Math.min(0, Math.max(mapW - mapW * view.k, view.tx)); view.ty = Math.min(0, Math.max(mapH - mapH * view.k, view.ty)); }
  let drag = null;
  canvas.addEventListener('wheel', (e) => { if (!S) return; e.preventDefault(); const r = canvas.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.25 : 0.8); }, { passive: false });
  canvas.addEventListener('mousedown', (e) => { drag = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty, moved: false }; });
  window.addEventListener('mouseup', () => { if (drag) setTimeout(() => { drag = null; }, 0); });
  canvas.addEventListener('dblclick', () => { view.k = 1; view.tx = 0; view.ty = 0; drawMap(); });

  const lerp = (a, b, t) => a + (b - a) * t;
  const hex2 = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (c1, c2, t) => { const a = hex2(c1), b = hex2(c2); t = Math.max(0, Math.min(1, t)); return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`; };
  const seq = (t) => t < 0.5 ? mix('#24304f', '#3b82f6', t * 2) : mix('#3b82f6', '#f5b942', (t - 0.5) * 2);
  const div = (t) => t < 0.5 ? mix('#ff5c5c', '#39415c', t * 2) : mix('#39415c', '#3ddc84', (t - 0.5) * 2);
  function nationStatus(id) {
    if (id === S.player) return { c: '#f5b942', l: 'Tu' };
    if (E.atWar(S, S.player, id)) return { c: '#ff5c5c', l: 'Nemico' };
    if (E.alliesOf(S, S.player).includes(id)) return { c: '#4f8cff', l: 'Alleato' };
    if (E.isSanctioning(S, S.player, id) || E.isSanctioning(S, id, S.player)) return { c: '#ff9f43', l: 'Sanzioni' };
    if (E.hasTreaty(S, S.player, id, 'commercio') || E.hasTreaty(S, S.player, id, 'nonaggressione')) return { c: '#3ddc84', l: 'Partner' };
    return { c: '#4b5a7e', l: 'Neutrale' };
  }
  const MODES = { stato: 'Stato', relazioni: 'Relazioni', potenza: 'Potenza', stabilita: 'Stabilità', regime: 'Regime', blocchi: 'Blocchi', pil: 'PIL pro capite', clima: 'Emissioni', guerre: 'Guerre' };
  function modeColor(id, ctxData) {
    const n = N(id); if (!n) return null;
    switch (mapMode) {
      case 'stato': return nationStatus(id).c;
      case 'relazioni': return id === S.player ? '#f5b942' : div((E.getRel(S, S.player, id) + 100) / 200);
      case 'potenza': return seq(Math.sqrt(E.score(S, n) / ctxData.maxScore));
      case 'stabilita': return n.stability < 50 ? mix('#ff5c5c', '#39415c', n.stability / 50) : mix('#39415c', '#3ddc84', (n.stability - 50) / 50);
      case 'regime': return { democrazia: '#3b82f6', ibrido: '#f59e0b', autocrazia: '#dc2626' }[n.regime];
      case 'blocchi': { const d = n.blocs.find(b => E.bloc(S, b).defense) || n.blocs.find(b => E.bloc(S, b).trade) || n.blocs[0]; return d ? E.bloc(S, d).color : '#39415c'; }
      case 'pil': return seq(Math.log(Math.max(1, E.effGdp(S, n) / n.pop * 1000)) / Math.log(90000));
      case 'clima': { const pr = GEO.PROFILES[id]; const t = pr ? Math.sqrt(pr.co2 * (E.mods(n).co2 || 1) / n.pop / 20) : 0; return mix('#3ddc84', '#ff5c5c', t); }
      case 'guerre': return E.warsOf(S, id).length ? (E.warsOf(S, id).some(w => w.attackers.includes(id)) ? '#ff5c5c' : '#ff9f43') : '#39415c';
    }
    return '#39415c';
  }
  function pathOf(iso) { ctx.beginPath(); WORLD[iso].forEach(r => { r.forEach(([lon, lat], i) => { const [x, y] = proj(lon, lat); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); }); }
  function drawMap() {
    if (!S || !mapW) return;
    ctx.clearRect(0, 0, mapW, mapH);
    const g = ctx.createLinearGradient(0, 0, 0, mapH); g.addColorStop(0, '#0b1326'); g.addColorStop(1, '#060a14'); ctx.fillStyle = g; ctx.fillRect(0, 0, mapW, mapH);
    ctx.strokeStyle = 'rgba(255,255,255,.035)'; ctx.lineWidth = 1;
    for (let lon = -180; lon <= 180; lon += 30) { const [x] = proj(lon, 0); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, mapH); ctx.stroke(); }
    for (let lat = -60; lat <= 80; lat += 20) { const [, y] = proj(0, lat); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(mapW, y); ctx.stroke(); }
    const rank = E.ranking(S); const ctxData = { maxScore: rank[0].score };
    // paesi
    Object.keys(WORLD).forEach(iso => {
      const playable = !!S.nations[iso]; pathOf(iso);
      ctx.fillStyle = playable ? modeColor(iso, ctxData) : '#1b2338'; ctx.fill();
      ctx.strokeStyle = playable ? 'rgba(10,14,28,.9)' : 'rgba(40,50,80,.8)'; ctx.lineWidth = playable ? 0.9 : 0.6; ctx.stroke();
    });
    // occupazioni (strisce nel colore dell'occupante) e irradiazioni
    E.alive(S).forEach(id => {
      const n = N(id); if (!WORLD[id]) return;
      const occ = n.regions.filter(r => r.controller && r.controller !== id);
      if (occ.length) { const by = occ.sort((a, b) => b.share - a.share)[0].controller; const share = E.occupiedShare(n); ctx.save(); pathOf(id); ctx.clip(); const b = bboxes[id]; const [x0, y0] = proj(b[0], b[3]), [x1, y1] = proj(b[2], b[1]); ctx.strokeStyle = N(by).color; ctx.lineWidth = 2; const step = 7; for (let x = x0 - (y1 - y0); x < x1; x += step) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + (y1 - y0), y1); ctx.stroke(); } ctx.restore(); ctx.save(); pathOf(id); ctx.clip(); ctx.fillStyle = `rgba(255,60,60,${0.15 + share * 0.3})`; ctx.fillRect(0, 0, mapW, mapH); ctx.restore(); }
      if (n.regions.some(r => r.irradiatedUntil && r.irradiatedUntil > S.turn)) { ctx.save(); pathOf(id); ctx.clip(); ctx.fillStyle = 'rgba(200,255,80,.18)'; ctx.fillRect(0, 0, mapW, mapH); ctx.restore(); }
    });
    // evidenziazioni
    if (hover && WORLD[hover]) { pathOf(hover); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.5; ctx.stroke(); }
    if (sel && WORLD[sel]) { pathOf(sel); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.stroke(); }
    if (WORLD[S.player]) { pathOf(S.player); ctx.strokeStyle = '#f5b942'; ctx.lineWidth = 2; ctx.stroke(); }
    // linee
    const pos = {}; E.alive(S).forEach(id => { const lp = labelPt[id] || [N(id).lon, N(id).lat]; pos[id] = proj(lp[0], lp[1]); });
    const line = (a, b, color, dash, w = 1.5) => { if (!pos[a] || !pos[b]) return; ctx.beginPath(); ctx.setLineDash(dash || []); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.moveTo(...pos[a]); ctx.lineTo(...pos[b]); ctx.stroke(); ctx.setLineDash([]); };
    const arrow = (a, b, color) => { if (!pos[a] || !pos[b]) return; const [x1, y1] = pos[a], [x2, y2] = pos[b]; const ang = Math.atan2(y2 - y1, x2 - x1); line(a, b, color, [], 2); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - 9 * Math.cos(ang - 0.4), y2 - 9 * Math.sin(ang - 0.4)); ctx.lineTo(x2 - 9 * Math.cos(ang + 0.4), y2 - 9 * Math.sin(ang + 0.4)); ctx.closePath(); ctx.fill(); };
    if (lineMode !== 2) S.wars.forEach(w => w.attackers.forEach(a => w.defenders.forEach(d => arrow(a, d, 'rgba(255,92,92,.85)'))));
    if (lineMode === 0) S.treaties.filter(t => t.type === 'difesa').forEach(t => line(t.a, t.b, 'rgba(79,140,255,.3)', [4, 4], 1));
    if (lineMode === 1) { S.treaties.filter(t => t.a === S.player || t.b === S.player).forEach(t => line(t.a, t.b, t.type === 'difesa' ? 'rgba(79,140,255,.8)' : 'rgba(61,220,132,.6)', t.type === 'difesa' ? [] : [4, 4], 1.5)); S.sanctions.filter(x => x.from === S.player || x.to === S.player).forEach(x => line(x.from, x.to, 'rgba(255,159,67,.5)', [2, 4], 1)); }
    // etichette e icone
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    E.alive(S).forEach(id => {
      const n = N(id); const [x, y] = pos[id]; const big = (areas[id] || 0) > 60 || view.k >= 2.2 || id === sel || id === S.player || (areas[id] || 0) > 15 && view.k >= 1.5;
      if (!big) return;
      const fs = Math.min(13, 9 + Math.sqrt(areas[id] || 1) / 8 + view.k); ctx.font = `${id === S.player ? 'bold ' : ''}${fs}px Segoe UI, sans-serif`;
      const label = `${n.name}`; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(5,8,16,.85)'; ctx.strokeText(label, x, y); ctx.fillStyle = id === S.player ? '#ffe08a' : '#e6ebf5'; ctx.fillText(label, x, y);
      const icons = (E.warsOf(S, id).length ? '⚔️' : '') + (n.nukes > 0 ? '☢' : '') + (n.suzerain ? '⛓' : '') + (n.regions.some(r => r.irradiatedUntil > S.turn) ? '☣' : '');
      if (icons) { ctx.font = `${Math.max(9, fs - 1)}px sans-serif`; ctx.fillStyle = '#fff'; ctx.fillText(icons, x, y + fs); }
    });
    if (view.k > 1) { ctx.font = '11px sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillText(`zoom ${view.k.toFixed(1)}× · doppio clic per resettare`, mapW - 10, mapH - 36); }
    renderLegend();
  }
  function renderLegend() {
    const L = { stato: [['#f5b942', 'Tu'], ['#4f8cff', 'Alleati'], ['#ff5c5c', 'Nemici'], ['#ff9f43', 'Sanzioni'], ['#3ddc84', 'Partner'], ['#4b5a7e', 'Neutrali'], ['#1b2338', 'Stati minori']],
      relazioni: [['#ff5c5c', 'Ostile'], ['#39415c', 'Neutrale'], ['#3ddc84', 'Amichevole']], potenza: [['#24304f', 'Bassa'], ['#3b82f6', 'Media'], ['#f5b942', 'Alta']], stabilita: [['#ff5c5c', 'Instabile'], ['#39415c', 'Media'], ['#3ddc84', 'Solida']],
      regime: [['#3b82f6', 'Democrazia'], ['#f59e0b', 'Ibrido'], ['#dc2626', 'Autocrazia']], blocchi: Object.entries(GEO.BLOCS).filter(([k, b]) => b.defense || b.trade).map(([k, b]) => [b.color, b.name]).concat(Object.values(S.customBlocs || {}).map(b => [b.color, b.name])),
      pil: [['#24304f', 'Povero'], ['#3b82f6', 'Medio'], ['#f5b942', 'Ricco']], clima: [['#3ddc84', 'Basse'], ['#ff5c5c', 'Alte (pro capite)']], guerre: [['#ff5c5c', 'Aggressore'], ['#ff9f43', 'Difensore'], ['#39415c', 'In pace']] }[mapMode] || [];
    $('mapLegend').innerHTML = L.map(([c, l]) => `<span style="--c:${c}">${l}</span>`).join('') + '<span style="--c:#ff5c5c">▨ occupazione</span><span style="--c:#c8ff50">☣ irradiata</span>';
  }
  function hitNation(mx, my) { const [lon, lat] = invProj(mx, my); return isoAt(lon, lat); }
  canvas.addEventListener('mousemove', (e) => {
    if (!S) return; const r = canvas.getBoundingClientRect(); const tt = $('tooltip');
    if (drag && e.buttons === 1) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true; if (drag.moved) { view.tx = drag.tx + dx; view.ty = drag.ty + dy; clampView(); drawMap(); tt.classList.add('hidden'); return; } }
    const iso = hitNation(e.clientX - r.left, e.clientY - r.top);
    if (iso !== hover) { hover = iso; drawMap(); }
    if (!iso) { tt.classList.add('hidden'); return; }
    const n = N(iso);
    if (!n) { tt.innerHTML = `<b>${GEO.WORLD_NAMES[iso] || iso}</b> <span class="muted">stato minore</span>`; }
    else { const rel = E.getRel(S, S.player, iso); const st = nationStatus(iso); const pr = GEO.PROFILES[iso] || {};
      tt.innerHTML = `<b>${n.flag} ${n.name}</b> <span class="muted">#${E.rankOf(S, iso)} · ${st.l}</span><br><span class="muted">${pr.capital || ''} · ${n.regime}${n.vision ? ' · ' + GEO.VISIONS[n.vision].icon : ''}</span><br>PIL ${fmt(E.effGdp(S, n))} mld (${pct(n.lastGrowth)}) · Stab. ${fmt(n.stability)} · Infl. ${fmt(n.inflation, 1)}%<br>Mil. ${fmt(E.milPower(n))} · ☢️ ${n.nukes} · Tech ${E.avgTech(n).toFixed(1)}<br>${iso !== S.player ? `Relazioni: <span style="color:${relColor(rel)}">${rel} (${relLabel(rel)})</span>` : `Punteggio ${E.score(S, n)}`}${E.warsOf(S, iso).length ? `<br><span class="bad">In guerra: ${E.enemiesOf(S, iso).map(x => N(x).flag).join(' ')}</span>` : ''}`; }
    tt.classList.remove('hidden'); tt.style.left = Math.min(e.clientX - r.left + 14, mapW - 270) + 'px'; tt.style.top = Math.min(e.clientY - r.top + 14, mapH - 110) + 'px';
  });
  canvas.addEventListener('mouseleave', () => { $('tooltip').classList.add('hidden'); hover = null; drawMap(); });
  canvas.addEventListener('click', (e) => { if (!S || (drag && drag.moved)) return; const r = canvas.getBoundingClientRect(); const id = hitNation(e.clientX - r.left, e.clientY - r.top); if (id && S.nations[id]) { sel = id; rightTab = 'nazione'; renderRight(); drawMap(); } });
  const ctl = document.createElement('div'); ctl.id = 'mapCtl'; ctl.innerHTML = `<select id="mapMode">${Object.entries(MODES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select><button class="small" id="btnLines">Linee: tutte</button><button class="small zb" id="btnZoomIn" title="Zoom avanti">+</button><button class="small zb" id="btnZoomOut" title="Zoom indietro">&minus;</button>`; $('mapWrap').appendChild(ctl);
  $('mapMode').onchange = () => { mapMode = $('mapMode').value; drawMap(); };
  $('btnZoomIn').onclick = () => zoomAt(mapW / 2, mapH / 2, 1.3); $('btnZoomOut').onclick = () => zoomAt(mapW / 2, mapH / 2, 0.75);
  $('btnLines').onclick = () => { lineMode = (lineMode + 1) % 3; $('btnLines').textContent = ['Linee: tutte', 'Linee: le mie', 'Linee: nessuna'][lineMode]; drawMap(); };
  window.addEventListener('resize', () => { if (S) resizeMap(); });

  // ---------- Salvataggi ----------------------------------------------------
  const KEY = 'geopolitica2026_save';
  function save(auto) { try { localStorage.setItem(KEY, E.serialize(S)); if (!auto) toast('Partita salvata nel browser.'); } catch (e) { if (!auto) toast('Salvataggio fallito: ' + e.message); } }
  function load() { try { const j = localStorage.getItem(KEY); if (!j) return toast('Nessun salvataggio trovato.'); S = E.deserialize(j); sel = null; closeModal(); $('game').classList.remove('hidden'); renderAll(); resizeMap(); toast('Partita caricata.'); } catch (e) { toast('Caricamento fallito: ' + e.message); } }

  // ---------- Render generale --------------------------------------------------
  function renderAll() { if (!S) return; renderHud(); renderLeft(); renderRight(); renderNews(); drawMap(); $('btnEnd').disabled = !!S.gameOver; }

  // ---------- Eventi globali UI -------------------------------------------------
  document.querySelectorAll('#leftTabs button').forEach(b => b.onclick = () => { leftTab = b.dataset.tab; renderLeft(); });
  document.querySelectorAll('#rightTabs button').forEach(b => b.onclick = () => { rightTab = b.dataset.tab; renderRight(); });
  $('btnEnd').onclick = endTurn;
  $('btnHelp').onclick = () => showHelp();
  $('btnSave').onclick = () => save(false);
  $('btnLoad').onclick = load;
  $('btnNew').onclick = () => { if (S) confirmDlg('Nuova partita', 'Abbandonare la partita corrente?', 'Nuova partita', showSetup); else showSetup(); };
  $('btnExport').onclick = () => { if (!S) return; const blob = new Blob([E.serialize(S)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `geopolitica2026_${S.player}_T${S.turn}.json`; a.click(); };
  $('btnImport').onclick = () => $('fileImport').click();
  $('fileImport').onchange = (e) => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { try { S = E.deserialize(rd.result); sel = null; closeModal(); $('game').classList.remove('hidden'); renderAll(); resizeMap(); toast('Salvataggio importato.'); } catch (err) { toast('File non valido.'); } }; rd.readAsText(f); e.target.value = ''; };
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.ctrlKey && S && $('modal').classList.contains('hidden')) endTurn(); if (e.key === 'Escape' && !$('modal').classList.contains('hidden') && $('modalX')) closeModal(); });

  window.GEO_UI = { proj: (lon, lat) => proj(lon, lat), state: () => S, labelPt: (id) => labelPt[id], setMode: (m) => { mapMode = m; $('mapMode').value = m; drawMap(); } };
  // Avvio
  if (localStorage.getItem(KEY)) {
    openModal({ title: '🌐 Geopolitica 2026', onClose: null, body: '<p>È presente una partita salvata nel browser.</p>', foot: '<button id="stNew">Nuova partita</button><button id="stLoad" class="primary">Continua la partita</button>' });
    $('stNew').onclick = showSetup; $('stLoad').onclick = load;
  } else showSetup();
})();
