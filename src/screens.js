/* Super Rigori World Cup — schermate del torneo (HTML): titolo, scelta squadra, gironi, tabellone, risultati, finale */
(function (root) {
  'use strict';
  const PK = (root.PK = root.PK || {});
  const doc = root.document;
  const $ = (id) => doc.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const flag = (code, cls) => `<img class="${cls || ''}" src="${PK.flagURL(PK.TEAM[code])}" alt="${code}">`;
  const starsFor = (t) => {
    const n = Math.max(1, Math.min(5, Math.round((PK.teamOverall(t) - 66) / 4.6)));
    return '★'.repeat(n) + '<span class="dim">' + '★'.repeat(5 - n) + '</span>';
  };
  const DIFFS = [['easy', 'Facile'], ['normal', 'Normale'], ['hard', 'Difficile'], ['legend', 'Leggenda']];

  function set(html, name) {
    const s = $('screen');
    s.classList.remove('hidden');
    s.innerHTML = html;
    s.scrollTop = 0;
    PK.Game.screen = name;
  }
  const bind = (id, fn) => { const e = $(id); if (e) e.addEventListener('click', () => { PK.Audio.resume(); fn(e); }); };
  const sfx = () => PK.Audio.click();

  function diffSeg(G) {
    return `<div class="seg" id="diffseg">${DIFFS.map(([k, n]) => `<button data-d="${k}" class="${G.settings.difficulty === k ? 'on' : ''}">${n}</button>`).join('')}</div>`;
  }
  function bindDiff(G) {
    doc.querySelectorAll('#diffseg button').forEach((b) =>
      b.addEventListener('click', () => {
        G.settings.difficulty = b.dataset.d;
        if (G.tour) G.tour.difficulty = b.dataset.d;
        G.persist(); sfx();
        doc.querySelectorAll('#diffseg button').forEach((x) => x.classList.toggle('on', x === b));
      })
    );
  }

  // --------------------------------------------------------------------- tabelle
  function tableHTML(t, gid, mine) {
    const st = t.standings(gid);
    const done = t.groupDone(gid);
    return `<table class="tbl"><thead><tr><th class="t">Squadra</th><th>G</th><th>V</th><th>N</th><th>P</th><th>DR</th><th>Pt</th></tr></thead><tbody>${st
      .map((r, i) => {
        const cls = [i < 2 && done ? 'q' : '', r.code === mine ? 'me' : ''].join(' ');
        return `<tr class="${cls}"><td class="t">${flag(r.code)}${esc(PK.TEAM[r.code].name)}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gd > 0 ? '+' : ''}${r.gd}</td><td class="pts">${r.pts}</td></tr>`;
      })
      .join('')}</tbody></table>`;
  }
  function groupsHTML(t, mine, anim) {
    return `<div class="groups">${t.groups
      .map((g, i) => {
        const my = g.teams.includes(mine);
        return `<div class="gcard ${my ? 'mine' : ''}" style="${anim ? `animation-delay:${i * 0.12}s` : ''}"><h3><span>GIRONE ${g.id}</span>${my ? '<span class="stars">★ il tuo</span>' : ''}</h3>${tableHTML(t, g.id, mine)}</div>`;
      })
      .join('')}</div>`;
  }
  function fixtureHTML(m, mine) {
    const r = m.result;
    const me = m.a === mine || m.b === mine;
    const sc = r ? `${r.goals.A} - ${r.goals.B}` : 'vs';
    const wa = r && r.winner === 'A', wb = r && r.winner === 'B';
    return `<div class="fx ${me ? 'me' : ''}"><div class="tm ${wa ? 'w' : ''}">${flag(m.a)}${esc(PK.TEAM[m.a].name)}</div><div class="sc">${sc}</div><div class="tm r ${wb ? 'w' : ''}">${esc(PK.TEAM[m.b].name)}${flag(m.b)}</div></div>`;
  }
  function bracketHTML(t, mine) {
    const cols = [['R16', 'Ottavi', 8], ['QF', 'Quarti', 4], ['SF', 'Semifinali', 2], ['F', 'Finale', 1]];
    const box = (m) => {
      if (!m) return `<div class="bm"><div class="dim">— da definire —</div><div class="dim">— da definire —</div></div>`;
      const r = m.result;
      const row = (code, side) => `<div class="${r && r.winner === side ? 'win' : ''}">${flag(code)}<span>${PK.TEAM[code].code}</span><span class="s">${r ? r.goals[side] : ''}</span></div>`;
      return `<div class="bm ${m.a === mine || m.b === mine ? 'mine' : ''}">${row(m.a, 'A')}${row(m.b, 'B')}</div>`;
    };
    let html = '<div class="bracket">';
    cols.forEach(([id, title, n]) => {
      const rd = t.rounds.find((r) => r.id === id);
      html += `<div class="bcol"><h4>${title}</h4>`;
      for (let i = 0; i < n; i++) html += box(rd ? rd.matches[i] : null);
      html += '</div>';
    });
    html += '</div>';
    const tp = t.rounds.find((r) => r.id === '3P');
    if (tp) html += `<div class="panel"><h3 style="color:var(--cyan);margin-bottom:6px">Finale 3º/4º posto</h3>${fixtureHTML(tp.matches[0], mine)}</div>`;
    return html;
  }

  // ----------------------------------------------------------------------- schermate
  const Screens = {
    clear() {
      const s = $('screen');
      s.classList.add('hidden');
      s.innerHTML = '';
    },

    title(G) {
      G.match = null;
      const saved = G.hasSave();
      let contLabel = '';
      if (saved) {
        const s = JSON.parse(root.localStorage.getItem('superrigori.v1'));
        const t = PK.Tournament.fromJSON(s.tour);
        contLabel = `${PK.TEAM[t.player].name} · ${t.round ? t.round.label : ''}`;
      }
      set(`<div class="wrap" style="min-height:100%;justify-content:center">
        <div class="logo"><span class="l1">SUPER RIGORI</span><span class="l2">COPPA DEL MONDO</span><div class="l3">32 nazionali · solo calci di rigore · una sola coppa</div></div>
        <div class="menu">
          <button class="btn primary" id="b-new">NUOVO MONDIALE</button>
          ${saved ? `<button class="btn gold" id="b-cont">CONTINUA<br><small style="font-size:13px;letter-spacing:1px">${esc(contLabel)}</small></button>` : ''}
          <button class="btn" id="b-how">COME SI GIOCA</button>
          <button class="btn" id="b-opt">OPZIONI</button>
          <button class="btn small ghost" id="b-demo">▶ GUARDA UNA DEMO</button>
        </div>
        <div class="center sub">Nomi e giocatori sono di fantasia · Ispirato ai grandi classici animati del calcio</div>
      </div>`, 'title');
      bind('b-new', () => { sfx(); Screens.teams(G); });
      bind('b-cont', () => { sfx(); G.continueTournament(); });
      bind('b-how', () => { sfx(); Screens.howto(G); });
      bind('b-opt', () => { sfx(); Screens.options(G); });
      bind('b-demo', () => { sfx(); G.startDemo(); });
    },

    howto(G) {
      set(`<div class="wrap">
        <div class="title-bar"><h2>COME SI GIOCA</h2><button class="btn small" id="b-back">← INDIETRO</button></div>
        <div class="help">
          <div class="panel"><h3>🎯 Quando CALCI</h3><ol>
            <li><b>Mira</b> muovendo il mouse (o trascinando il dito, o con le <kbd>frecce</kbd>) sul punto della porta. Più il momento è decisivo, più il mirino <b>trema</b>!</li>
            <li>Premi <b>TIRA</b> (<kbd>Spazio</kbd> / clic): parte una barra di potenza. Premila di nuovo per fermarla.</li>
            <li>Nella <b style="color:var(--green)">zona verde</b> il tiro è pulito e preciso; troppa potenza = tiro sporco, troppo poca = parabile.</li>
            <li><b>Effetto</b>: <kbd>Q</kbd> / <kbd>E</kbd> (o ↶ ↷) fa curvare il pallone, con fisica reale (effetto Magnus).</li>
            <li>L'anello tratteggiato attorno al mirino mostra quanto si disperde il tiro.</li></ol></div>
          <div class="panel"><h3>🧤 Quando PARI</h3><ol>
            <li><b>Clicca o tocca</b> il punto della porta dove vuoi tuffarti, oppure usa la tastiera: <kbd>Q W E</kbd> / <kbd>A S D</kbd> / <kbd>Z X C</kbd> (griglia 3×3 della porta).</li>
            <li>Puoi <b>anticipare</b> il rigorista… ma lui può leggerti e calciare dalla parte opposta!</li>
            <li>Dopo il calcio il tempo rallenta: leggi la traiettoria e tuffati. Più ritardi, meno spazio puoi coprire.</li>
            <li>Il portiere ha una portata reale: gli angoli alti a tutta potenza sono quasi imparabili… senza una SUPER PARATA.</li></ol></div>
          <div class="panel"><h3>⚡ Tiri e parate SPECIALI</h3><ul>
            <li>Ogni squadra ha <b>1 SUPER TIRO</b> e <b>1 SUPER PARATA</b> a partita (+1 ciascuno se si va all'oltranza).</li>
            <li><b>Super tiro</b>: premi <b>⚡ SUPER</b> (<kbd>F</kbd>) prima di tirare e ferma la barra nella zona <span style="color:var(--gold)">dorata</span>: tiro più veloce, con scia infuocata e nome della mossa!</li>
            <li><b>Super parata</b>: attiva ⚡ prima di tuffarti: portata e velocità sovrumane.</li>
            <li>Se si scontrano… il tiro può <b>sfondare le mani</b> del portiere!</li></ul></div>
          <div class="panel"><h3>🏆 Il Mondiale</h3><ul>
            <li>32 squadre in 8 gironi da 4. Ogni partita è una serie di <b>5 rigori a testa</b> (nei gironi si battono sempre tutti).</li>
            <li>Vittoria <b>3 punti</b>, pareggio <b>1</b>. Classifica: punti, differenza reti, gol fatti, scontri diretti, sorteggio. Passano le prime 2.</li>
            <li>Ottavi, quarti, semifinali, finalina e <b>finale</b> a eliminazione diretta: si ferma appena una squadra non può più essere raggiunta; poi <b>oltranza</b>.</li>
            <li>Il tabellone è quello dei Mondiali 2022 (1A-2B, 1C-2D…). Il progresso viene salvato automaticamente.</li></ul></div>
        </div></div>`, 'howto');
      bind('b-back', () => { sfx(); Screens.title(G); });
    },

    options(G) {
      set(`<div class="wrap" style="max-width:640px">
        <div class="title-bar"><h2>OPZIONI</h2><button class="btn small" id="b-back">← INDIETRO</button></div>
        <div class="panel"><h3 style="margin-bottom:8px;color:var(--gold)">Difficoltà</h3>${diffSeg(G)}
          <p class="sub">Cambia la precisione dei rigoristi avversari, la prontezza dei portieri e quanto rallenta il tempo quando pari.</p></div>
        <div class="panel"><h3 style="margin-bottom:8px;color:var(--gold)">Audio</h3>
          <button class="btn small" id="b-mute">${G.settings.muted ? '🔇 Audio disattivato' : '🔊 Audio attivo'}</button></div>
        <div class="panel"><h3 style="margin-bottom:8px;color:var(--gold)">Dati</h3>
          <button class="btn small ghost" id="b-reset">Cancella il salvataggio</button></div>
      </div>`, 'options');
      bindDiff(G);
      bind('b-back', () => { sfx(); Screens.title(G); });
      bind('b-mute', (e) => { G.settings.muted = PK.Audio.toggleMute(); G.syncMuteButton(); G.persist(); e.textContent = G.settings.muted ? '🔇 Audio disattivato' : '🔊 Audio attivo'; });
      bind('b-reset', (e) => { G.tour = null; try { root.localStorage.removeItem('superrigori.v1'); } catch (x) { /* ok */ } G.persist(); e.textContent = 'Salvataggio cancellato'; });
    },

    teams(G) {
      G.pickCode = G.pickCode || null;
      const sorted = PK.TEAMS.slice().sort((a, b) => PK.teamOverall(b) - PK.teamOverall(a));
      const card = (t) => `<button class="tcard ${G.pickCode === t.code ? 'sel' : ''}" data-c="${t.code}">
        <img class="fl" src="${PK.flagURL(t, 96, 64)}" alt="${t.code}"><div class="nm">${esc(t.name)}</div>
        <div class="stars">${starsFor(t)}</div>
        <div class="bars"><span>ATT</span><div class="bar"><i style="width:${t.atk}%"></i></div><span>POR</span><div class="bar gk"><i style="width:${t.gk}%"></i></div></div></button>`;
      set(`<div class="wrap">
        <div class="title-bar"><h2>SCEGLI LA TUA NAZIONALE</h2><button class="btn small" id="b-back">← INDIETRO</button></div>
        <div class="row" style="justify-content:space-between"><span class="sub">Difficoltà:</span>${diffSeg(G)}</div>
        <div class="teams" id="teams">${sorted.map(card).join('')}</div>
        <div class="row" style="position:sticky;bottom:0;padding:10px;background:linear-gradient(0deg,rgba(3,5,18,.95),transparent)"><button class="btn primary" id="b-ok" ${G.pickCode ? '' : 'disabled style="opacity:.4"'}>${G.pickCode ? 'GIOCA CON ' + esc(PK.TEAM[G.pickCode].name.toUpperCase()) + '!' : 'SCEGLI UNA SQUADRA'}</button></div>
      </div>`, 'teams');
      bindDiff(G);
      bind('b-back', () => { sfx(); Screens.title(G); });
      doc.querySelectorAll('.tcard').forEach((c) =>
        c.addEventListener('click', () => {
          PK.Audio.resume(); PK.Audio.select();
          G.pickCode = c.dataset.c;
          doc.querySelectorAll('.tcard').forEach((x) => x.classList.toggle('sel', x === c));
          const ok = $('b-ok');
          ok.disabled = false; ok.style.opacity = 1;
          ok.textContent = 'GIOCA CON ' + PK.TEAM[G.pickCode].name.toUpperCase() + '!';
        })
      );
      bind('b-ok', () => { if (!G.pickCode) return; PK.Audio.coin(); G.newTournament(G.pickCode); });
    },

    draw(G) {
      const t = G.tour;
      set(`<div class="wrap">
        <div class="title-bar"><h2>SORTEGGIO DEI GIRONI</h2></div>
        <div class="panel center">${flag(t.player, 'fl')} <b style="font-family:var(--disp);font-size:24px">${esc(PK.TEAM[t.player].name)}</b> è nel <b style="color:var(--gold)">GIRONE ${t.groups.find((g) => g.teams.includes(t.player)).id}</b>. Passano le prime due.</div>
        ${groupsHTML(t, t.player, true)}
        <div class="row"><button class="btn primary" id="b-go">VAI AL TORNEO!</button></div>
      </div>`, 'draw');
      PK.Audio.fanfare();
      bind('b-go', () => { sfx(); G.hubTab = 'match'; Screens.hub(G); });
    },

    hub(G) {
      const t = G.tour;
      const T = PK.TEAM[t.player];
      const m = t.playerMatch();
      const tab = G.hubTab || 'match';
      let body = '';
      if (tab === 'match') {
        if (m) {
          const A = PK.TEAM[m.a], B = PK.TEAM[m.b];
          const ko = t.round.stage === 'ko';
          const opp = m.a === t.player ? B : A;
          body += `<div class="panel next"><div class="tm"><img src="${PK.flagURL(A, 160, 106)}" alt="">${'<b>' + esc(A.name) + '</b>'}<span class="stars">${starsFor(A)}</span></div><div class="vs">VS</div><div class="tm"><img src="${PK.flagURL(B, 160, 106)}" alt=""><b>${esc(B.name)}</b><span class="stars">${starsFor(B)}</span></div></div>
            <div class="panel center"><span class="chip ${ko ? 'r' : 'g'}">${esc(t.round.label)}</span>
              <p style="margin:8px 0 2px">${ko ? 'Eliminazione diretta: 5 rigori a testa, poi oltranza. Chi perde è fuori!' : 'Girone: 5 rigori a testa. Vittoria 3 punti, pareggio 1 punto.'}</p>
              <p class="sub" style="margin:0">Avversario: <b>${esc(opp.name)}</b> — attacco ${opp.atk}, portiere ${opp.gk}</p></div>
            <div class="row"><button class="btn primary" id="b-play">GIOCA LA PARTITA!</button><button class="btn small ghost" id="b-sim">Simula partita</button></div>
            <div class="panel"><h3 style="color:var(--cyan);margin-bottom:8px">${esc(t.round.label)} — tutte le partite</h3><div class="fixt">${t.round.matches.map((x) => fixtureHTML(x, t.player)).join('')}</div></div>`;
        } else {
          body += `<div class="panel center">Non ci sono partite da giocare per la tua squadra.</div>`;
        }
      } else if (tab === 'groups') {
        body += groupsHTML(t, t.player, false);
      } else {
        body += bracketHTML(t, t.player);
      }
      set(`<div class="wrap">
        <div class="title-bar"><div style="display:flex;align-items:center;gap:10px">${flag(t.player, 'fl')}<h2>${esc(T.name.toUpperCase())}</h2></div><button class="btn small ghost" id="b-menu">☰ MENU</button></div>
        <div class="tabs"><button class="tab ${tab === 'match' ? 'on' : ''}" data-t="match">PARTITA</button><button class="tab ${tab === 'groups' ? 'on' : ''}" data-t="groups">GIRONI</button><button class="tab ${tab === 'bracket' ? 'on' : ''}" data-t="bracket">TABELLONE</button></div>
        ${body}
      </div>`, 'hub');
      doc.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => { sfx(); G.hubTab = b.dataset.t; Screens.hub(G); }));
      bind('b-menu', () => { G.persist(); Screens.title(G); });
      bind('b-play', () => G.playNext());
      bind('b-sim', () => G.simulatePlayerMatch());
    },

    pause(G) {
      set(`<div class="wrap" style="max-width:520px;min-height:100%;justify-content:center">
        <div class="logo"><span class="l2" style="font-size:54px;letter-spacing:6px">PAUSA</span></div>
        <div class="menu">
          <button class="btn primary" id="b-res">RIPRENDI</button>
          <button class="btn small" id="b-pm">${G.settings.muted ? '🔇 Audio disattivato' : '🔊 Audio attivo'}</button>
          <button class="btn small ghost" id="b-quit">ABBANDONA LA PARTITA</button>
        </div></div>`, 'pause');
      bind('b-res', () => G.resume());
      bind('b-pm', (e) => { G.settings.muted = PK.Audio.toggleMute(); G.syncMuteButton(); G.persist(); e.textContent = G.settings.muted ? '🔇 Audio disattivato' : '🔊 Audio attivo'; });
      bind('b-quit', () => G.quitMatch());
    },

    result(G) {
      const t = G.tour, { match: m, result: r } = G.lastResult;
      const mine = t.player;
      const A = PK.TEAM[m.a], B = PK.TEAM[m.b];
      const iAmA = m.a === mine;
      const won = r.winner ? (r.winner === 'A') === iAmA : null;
      const ko = G.lastResult.roundStage === 'ko';
      let verdict = won === null ? 'PAREGGIO' : won ? 'VITTORIA!' : 'SCONFITTA';
      let vcls = won === null ? 'draw' : won ? 'win' : 'lose';
      let extra = '';
      if (ko) {
        if (won) {
          const nxt = t.round && t.playerMatch() ? `Avanzi: <b>${esc(t.round.label)}</b>` : t.over ? '' : 'Sei in finale/ai quarti!';
          extra = `<div class="panel center">${nxt}</div>`;
        } else extra = `<div class="panel center"><b style="color:var(--red)">Eliminato.</b> Il tuo Mondiale finisce qui: ${esc(t.playerStageText())}.</div>`;
      }
      const seq = (side) => {
        const ks = r.kicks.filter((k) => k.team === side);
        return `<div class="kicks">${ks.map((k, i) => `<div class="kk"><i class="${k.scored ? '' : 'm'}"></i>${i + 1}</div>`).join('')}</div>`;
      };
      let table = '';
      if (G.lastResult.roundStage !== 'ko' && m.group) {
        table = `<div class="panel"><h3 style="color:var(--cyan);margin-bottom:8px">Classifica Girone ${m.group}</h3>${tableHTML(t, m.group, mine)}</div>`;
      }
      const round = G.lastRound;
      set(`<div class="wrap">
        <div class="panel res-card">
          <div class="chip y">${esc(G.lastResult.roundLabel)}</div>
          <div class="row" style="margin-top:8px">${flag(m.a, 'fl')}<b style="font-family:var(--disp);font-size:26px">${esc(A.name)}</b></div>
          <div class="big-score">${r.goals.A} - ${r.goals.B}</div>
          <div class="row"><b style="font-family:var(--disp);font-size:26px">${esc(B.name)}</b>${flag(m.b, 'fl')}</div>
          <div class="verdict ${vcls}">${verdict}</div>
          <div class="sub">${r.sudden ? 'Deciso all\'oltranza' : 'Serie regolare di rigori'}${G.lastResult.simulated ? ' · simulata' : ''}</div>
          <div class="row" style="margin-top:10px;flex-direction:column;align-items:stretch;gap:8px"><div><span class="sub">${esc(A.code)}</span>${seq('A')}</div><div><span class="sub">${esc(B.code)}</span>${seq('B')}</div></div>
        </div>
        ${extra}${table}
        <div class="panel"><h3 style="color:var(--cyan);margin-bottom:8px">Risultati — ${esc(G.lastResult.roundLabel)}</h3><div class="fixt">${round.matches.map((x) => fixtureHTML(x, mine)).join('')}</div></div>
        <div class="row"><button class="btn primary" id="b-next">CONTINUA</button></div>
      </div>`, 'result');
      if (won) PK.Audio.fanfare();
      bind('b-next', () => { sfx(); G.afterResult(); });
    },

    end(G) {
      const t = G.tour;
      const mine = t.player;
      const champ = t.champion;
      const iWon = champ === mine;
      const scorers = t.topScorers(5);
      const final = t.rounds.find((r) => r.id === 'F');
      const fm = final && final.matches[0];
      G.persist();
      const scorersHTML = scorers.length ? `<ul class="scorers">${scorers.map((s) => `<li>${flag(s.code)}${esc(s.name)} <span class="sub">(${PK.TEAM[s.code].code})</span><span class="g">${s.goals}</span></li>`).join('')}</ul>` : '<p class="sub">Nessun marcatore.</p>';
      if (t.over) {
        const C = PK.TEAM[champ];
        G.screen = 'champion';
        G.attract.setChampion(C);
        set(`<div class="wrap champ" style="min-height:100%;justify-content:center">
          <canvas id="trophy" width="260" height="320" style="margin:0 auto;display:block;animation:floaty2 2.6s ease-in-out infinite;filter:drop-shadow(0 0 30px #ffd23a)"></canvas>
          <div class="chip y" style="align-self:center">${iWon ? 'COMPLIMENTI!' : 'CAMPIONE DEL MONDO'}</div>
          <h1>${iWon ? 'SEI CAMPIONE DEL MONDO!' : esc(C.name.toUpperCase())}</h1>
          <div class="row">${flag(champ, 'fl')}${fm ? `<span class="sub">Finale: ${esc(PK.TEAM[fm.a].name)} ${fm.result.goals.A}-${fm.result.goals.B} ${esc(PK.TEAM[fm.b].name)}</span>` : ''}</div>
          <div class="panel" style="text-align:left;max-width:520px;margin:0 auto;width:100%"><h3 style="color:var(--gold);margin-bottom:6px">Il tuo cammino</h3><p style="margin:0 0 8px">${esc(PK.TEAM[mine].name)}: <b>${esc(t.playerStageText())}</b></p>
          <h3 style="color:var(--gold);margin:8px 0 6px">Capocannonieri</h3>${scorersHTML}</div>
          <div class="row"><button class="btn gold" id="b-new">NUOVO MONDIALE</button><button class="btn small" id="b-menu">MENU</button></div>
        </div>`, 'champion');
        drawTrophy($('trophy'), C.kit.shirt);
        if (iWon) PK.Audio.fanfare(); else PK.Audio.cheer(1);
        bind('b-new', () => { sfx(); G.tour = null; G.persist(); Screens.teams(G); });
        bind('b-menu', () => { sfx(); G.attract.champion = null; Screens.title(G); });
        return;
      }
      // eliminato: si può continuare a seguire il torneo
      set(`<div class="wrap" style="max-width:720px;min-height:100%;justify-content:center">
        <div class="panel res-card"><div class="chip r">TORNEO CONCLUSO PER TE</div>
          <div class="row" style="margin:10px 0">${flag(mine, 'fl')}<h1 style="font-size:clamp(30px,7vw,56px)">${esc(PK.TEAM[mine].name.toUpperCase())}</h1></div>
          <div class="verdict lose" style="font-size:clamp(26px,5vw,42px)">${esc(t.playerStageText().toUpperCase())}</div>
          <p class="sub">Non è andata come volevi… ma i rigori sono una lotteria che premia il coraggio. Riprova!</p></div>
        <div class="panel"><h3 style="color:var(--gold);margin-bottom:6px">Capocannonieri finora</h3>${scorersHTML}</div>
        <div class="row"><button class="btn gold" id="b-rest">SEGUI IL RESTO DEL TORNEO</button><button class="btn primary" id="b-new">NUOVO MONDIALE</button><button class="btn small" id="b-menu">MENU</button></div>
      </div>`, 'end');
      bind('b-rest', () => { sfx(); G.simulateRest(); });
      bind('b-new', () => { sfx(); G.tour = null; G.persist(); Screens.teams(G); });
      bind('b-menu', () => { sfx(); Screens.title(G); });
    },
  };

  // ------------------------------------------------------------------ trofeo
  function drawTrophy(cv, accent) {
    if (!cv) return;
    const g = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    g.clearRect(0, 0, w, h);
    const gold = g.createLinearGradient(0, 0, w, 0);
    gold.addColorStop(0, '#a86a00'); gold.addColorStop(0.3, '#ffe27a'); gold.addColorStop(0.5, '#fff6c8'); gold.addColorStop(0.7, '#ffc400'); gold.addColorStop(1, '#8a5200');
    const cx = w / 2;
    g.lineJoin = 'round';
    g.strokeStyle = '#4a2c00'; g.lineWidth = 5;
    // base
    g.fillStyle = '#1b1b24';
    g.beginPath(); g.roundRect ? g.roundRect(cx - 80, h - 44, 160, 34, 6) : g.rect(cx - 80, h - 44, 160, 34); g.fill(); g.stroke();
    g.fillStyle = accent || '#2a47b8';
    g.fillRect(cx - 70, h - 36, 140, 18);
    g.fillStyle = gold;
    g.beginPath(); g.moveTo(cx - 60, h - 44); g.lineTo(cx - 40, h - 80); g.lineTo(cx + 40, h - 80); g.lineTo(cx + 60, h - 44); g.closePath(); g.fill(); g.stroke();
    // stelo
    g.beginPath(); g.moveTo(cx - 16, h - 80); g.quadraticCurveTo(cx - 6, h - 130, cx - 30, h - 150); g.lineTo(cx + 30, h - 150); g.quadraticCurveTo(cx + 6, h - 130, cx + 16, h - 80); g.closePath(); g.fill(); g.stroke();
    // coppa
    g.beginPath(); g.moveTo(cx - 82, 36); g.lineTo(cx + 82, 36); g.quadraticCurveTo(cx + 88, 160, cx, h - 150); g.quadraticCurveTo(cx - 88, 160, cx - 82, 36); g.closePath(); g.fill(); g.stroke();
    // manici
    g.lineWidth = 12; g.strokeStyle = '#4a2c00';
    [-1, 1].forEach((s) => { g.beginPath(); g.moveTo(cx + s * 80, 52); g.bezierCurveTo(cx + s * 135, 40, cx + s * 130, 130, cx + s * 70, 126); g.stroke(); });
    g.lineWidth = 6; g.strokeStyle = gold;
    [-1, 1].forEach((s) => { g.beginPath(); g.moveTo(cx + s * 80, 52); g.bezierCurveTo(cx + s * 135, 40, cx + s * 130, 130, cx + s * 70, 126); g.stroke(); });
    // globo e riflessi
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.beginPath(); g.ellipse(cx - 40, 90, 12, 50, 0.15, 0, 7); g.fill();
    g.fillStyle = 'rgba(70,30,0,0.25)';
    g.beginPath(); g.arc(cx, 84, 36, 0, 7); g.fill();
    g.fillStyle = '#fff6c8';
    g.beginPath(); g.arc(cx, 84, 28, 0, 7); g.fill();
    g.strokeStyle = 'rgba(120,70,0,0.6)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx - 28, 84); g.lineTo(cx + 28, 84); g.moveTo(cx, 56); g.lineTo(cx, 112); g.stroke();
  }

  PK.Screens = Screens;
})(typeof window !== 'undefined' ? window : globalThis);
