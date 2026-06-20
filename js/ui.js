/*
 * SIMSOC 6 (remake) - UI layer
 * Renders the windows, handles input and drives the match animation.
 */
(function () {
  'use strict';
  const E = window.SimSocEngine, D = window.SimSocData, M = window.SimSocMatch;
  const $ = id => document.getElementById(id);
  const fullName = E.fullName;
  const money = n => '£' + Math.round(n).toLocaleString('en-GB');
  const SAVE_KEY = 'simsoc6.save';

  /* ---- game state ----------------------------------------------------- */
  let S, squadSelId = null, tmSelId = null, anim = null, subsUsed = 0, chooseSelIdx = 0, leagueDivView = 0;

  const params = new URLSearchParams(location.search);
  function boot() {
    const seed = params.has('seed') ? parseInt(params.get('seed'), 10) >>> 0 : 12345;
    if (!params.has('fresh')) {
      try { const raw = localStorage.getItem(SAVE_KEY); if (raw) S = E.deserialize(raw); } catch (e) {}
    }
    if (S) { renderAll(); show('screen-squad'); return; }   // resume a saved game
    // brand new game: build the world, then let the player choose a club
    S = E.newGame(seed);
    if (params.has('club')) {                                // automation / power-user shortcut
      E.setUserClub(S, parseInt(params.get('club'), 10) || 0);
      save(); renderAll(); show('screen-squad'); return;
    }
    chooseSelIdx = 0;
    renderChoose();
    show('screen-choose');
  }
  function save() { try { localStorage.setItem(SAVE_KEY, E.serialize(S)); } catch (e) {} }

  /* ---- generic helpers ------------------------------------------------ */
  function show(id) {
    document.querySelectorAll('.win').forEach(w => w.classList.add('hidden'));
    $(id).classList.remove('hidden');
  }
  function toast(msg, ms) {
    const t = document.createElement('div'); t.className = 't'; t.textContent = msg;
    $('toast').appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, ms || 4200);
  }
  function flushNotices() { (S.notices || []).splice(0).forEach(n => toast(n, 6000)); }
  function posCell(pos) { return '<span class="pos pos-' + pos + '">' + pos + '</span>'; }

  // render a player grid body. cols: array of {get, cls}. clickable rows.
  function renderGrid(tbodySel, rows, build, onClick, selId) {
    const tb = $(tbodySel).querySelector('tbody');
    tb.innerHTML = '';
    rows.forEach((row, i) => {
      const tr = document.createElement('tr');
      if (i % 2) tr.className = 'alt';
      if (selId != null && row.id === selId) tr.className = 'sel';
      tr.innerHTML = build(row);
      if (onClick) tr.addEventListener('click', () => onClick(row));
      tb.appendChild(tr);
    });
  }
  const posOrder = { G: 0, D: 1, M: 2, A: 3 };
  function sortSquad(players) {
    return players.slice().sort((a, b) => posOrder[a.pos] - posOrder[b.pos] || b.skill - a.skill);
  }

  /* ===================== SQUAD SCREEN ================================= */
  function renderSquad() {
    const club = E.user(S);
    const players = sortSquad(club.players);
    if (squadSelId == null && players.length) squadSelId = players[0].id;
    renderGrid('squad-grid', players, p =>
      '<td>' + p.surname + (p.injuredFor > 0 ? ' <span class="red" title="injured">+' + p.injuredFor + '</span>' : '') + '</td>' +
      '<td>' + p.forename + '</td><td>' + posCell(p.pos) + '</td>' +
      '<td class="num">' + p.skill + '</td>' +
      '<td class="num">' + p.appsSeason + '</td><td class="num">' + p.goalsSeason + '</td>' +
      '<td class="num">' + p.appsTotal + '</td><td class="num">' + p.goalsTotal + '</td>',
      p => { squadSelId = p.id; renderSquadSide(); renderSquad(); }, squadSelId);
    renderSquadSide();
    $('mgr-rating').textContent = S.managerRating;
  }
  function selectedSquadPlayer() { return E.user(S).players.find(p => p.id === squadSelId); }
  function renderSquadSide() {
    const p = selectedSquadPlayer(); if (!p) return;
    $('edit-forename').value = p.forename;
    $('edit-surname').value = p.surname;
    $('chk-list').checked = !!p.transferListed;
  }

  /* ===================== TEAM SELECTOR =============================== */
  function renderTeam() {
    const club = E.user(S);
    const opp = E.nextOpponent(S);
    if (!opp) return;
    const xi = E.playersByIds(club, S.selection.xi);
    const subs = E.playersByIds(club, S.selection.subs);
    const inUse = new Set(S.selection.xi.concat(S.selection.subs));
    const reserves = E.availablePlayers(club).filter(p => !inUse.has(p.id));
    const injured = club.players.filter(p => p.injured || p.fit <= 0);

    const pRow = p => '<td>' + p.surname + '</td><td>' + p.forename + '</td><td>' + posCell(p.pos) +
      '</td><td class="num">' + p.skill + '</td><td class="num">' + p.fit + '</td>';

    renderGrid('xi-grid', sortSquad(xi), pRow, p => { moveToReserves(p.id); renderTeam(); });
    renderGrid('subs-grid', subs, pRow, p => { moveToReserves(p.id); renderTeam(); });
    const resRows = sortSquad(reserves).concat(injured.map(p => Object.assign({}, p)));
    renderGrid('res-grid', resRows, p =>
      (p.injuredFor > 0 || p.fit <= 0)
        ? '<td>' + p.surname + '</td><td>' + p.forename + '</td><td>' + posCell(p.pos) + '</td><td class="num">' + p.skill + '</td><td class="num red">' + (p.injuredFor > 0 ? 'Inj ' + p.injuredFor : 'Unfit') + '</td>'
        : pRow(p),
      p => { if (!(p.injuredFor > 0 || p.fit <= 0)) { addFromReserves(p.id); renderTeam(); } });

    // ratings
    const hr = E.userRatings(S), ar = E.clubRatings(opp.club);
    $('rt-home-name').textContent = club.name;
    $('rt-away-name').textContent = opp.club.name;
    $('rt-h-def').textContent = hr.defence; $('rt-h-mid').textContent = hr.midfield;
    $('rt-h-att').textContent = hr.attack; $('rt-h-mor').textContent = hr.morale;
    $('rt-a-def').textContent = ar.defence; $('rt-a-mid').textContent = ar.midfield;
    $('rt-a-att').textContent = ar.attack; $('rt-a-mor').textContent = ar.morale;

    $('league-name').textContent = S.divisions[S.userDivision].name;
    $('opp-name').textContent = opp.club.name;
    $('btn-venue').textContent = opp.home ? 'Home' : 'Away';
    $('team-mgr').textContent = S.managerRating;
  }
  function moveToReserves(id) {
    S.selection.xi = S.selection.xi.filter(x => x !== id);
    S.selection.subs = S.selection.subs.filter(x => x !== id);
  }
  function addFromReserves(id) {
    if (S.selection.xi.length < 11) S.selection.xi.push(id);
    else if (S.selection.subs.length < 5) S.selection.subs.push(id);
    else toast('Squad full - 11 starters and up to 5 subs.');
  }

  /* ===================== MATCH SCREEN ================================= */
  function startMatch() {
    if (S.selection.xi.length !== 11) return toast('Pick exactly 11 starters (you have ' + S.selection.xi.length + ').');
    if (S.selection.subs.length < 1) return toast('Pick at least one substitute.');
    const match = E.playUserMatch(S);
    if (!match) return;
    window._match = match; subsUsed = 0;
    $('m-home').textContent = match.homeName;
    $('m-away').textContent = match.awayName;
    $('m-hg').textContent = '0'; $('m-ag').textContent = '0';
    $('m-bar').style.width = '0%';
    $('m-event').textContent = 'League';
    $('m-status').textContent = 'Kick off!';
    $('m-continue').classList.add('hidden');
    $('m-ball-home').textContent = '—'; $('m-ball-away').textContent = '—';
    show('screen-match');

    if (anim) anim.stop();
    anim = M.create($('pitch'), match, {
      onScore: (side, name, minute, hg, ag) => {
        $('m-hg').textContent = hg; $('m-ag').textContent = ag;
        $('m-event').textContent = Math.round(minute) + "'  GOAL!  " + name +
          ' (' + (side === 'home' ? match.homeName : match.awayName) + ')';
      },
      onMinute: m => {
        $('m-bar').style.width = (m / 90 * 100) + '%';
        $('m-status').textContent = m >= 90 ? 'Full time' : Math.floor(m) + ' mins';
      },
      onBall: (h, a) => { if (h) $('m-ball-home').textContent = h; if (a) $('m-ball-away').textContent = a; },
      onFullTime: (hg, ag) => finishMatch(match)
    });
    anim.setSpeed($('m-speed').value);
  }
  function finishMatch(match) {
    const res = E.commitUserResult(S, match);
    $('m-event').textContent = 'Full time: ' + match.homeName + ' ' + res.hg + ' - ' + res.ag + ' ' + match.awayName;
    $('m-continue').classList.remove('hidden');
    flushNotices();
    save();
  }
  function doSub() {
    if (!anim) return;
    if (subsUsed >= 3) return toast('No substitutions remaining.');
    const club = E.user(S);
    const xiOutfield = E.playersByIds(club, S.selection.xi).filter(p => p.pos !== 'G');
    const subPlayers = E.playersByIds(club, S.selection.subs);
    if (!subPlayers.length) return toast('No substitutes available.');
    const out = xiOutfield.slice().sort((a, b) => a.fit - b.fit)[0];
    const inP = subPlayers.slice().sort((a, b) => b.skill - a.skill)[0];
    S.selection.xi[S.selection.xi.indexOf(out.id)] = inP.id;
    S.selection.subs[S.selection.subs.indexOf(inP.id)] = out.id;
    const userSide = window._match && window._match.home ? 'home' : 'away';
    anim.substitute(userSide, fullName(out), fullName(inP));
    subsUsed++;
    toast('Substitution: ' + fullName(inP) + ' replaces ' + fullName(out) + '.');
  }

  /* ===================== TRANSFER MARKET ============================= */
  function tmFilters() {
    return {
      search: $('tm-search').value.trim(),
      pos: { G: $('f-G').checked, D: $('f-D').checked, M: $('f-M').checked, A: $('f-A').checked },
      includeEuropean: $('f-euro').checked,
      sortBySkill: $('f-sort').checked,
      includeUnlisted: $('f-unlisted').checked
    };
  }
  function renderTransfer() {
    const list = E.marketList(S, tmFilters());
    if (!list.find(p => p.id === tmSelId)) tmSelId = list.length ? list[0].id : null;
    renderGrid('tm-grid', list, p =>
      '<td>' + p.surname + ', ' + p.forename + (p.source !== 'pool' ? ' <span class="small" title="not listed - costs a premium">·</span>' : '') + '</td>' +
      '<td class="num"><span class="pos-' + p.pos + '">' + p.skill + '</span></td>' +
      '<td>' + posCell(p.pos) + '</td>' +
      '<td class="num">' + Math.round(p.price).toLocaleString('en-GB') + '</td>' +
      '<td>' + p.fromClub + (p.european ? ' *' : '') + '</td>',
      p => { tmSelId = p.id; renderTransfer(); }, tmSelId);
    $('tm-funds').textContent = Math.round(E.user(S).balance).toLocaleString('en-GB');
  }

  /* ===================== LEAGUE TABLES ============================== */
  function renderLeague() {
    const d = leagueDivView;
    const userHere = (d === S.userDivision);
    const table = E.standings(S, d);
    renderGrid('lg-grid', table.map((r, i) => Object.assign({ id: r.name, pos: i + 1 }, r)), r =>
      '<td class="num">' + r.pos + '</td><td' + (r.isUser ? ' class="bold"' : '') + '>' + r.name + '</td>' +
      '<td class="num">' + r.P + '</td><td class="num">' + r.W + '</td><td class="num">' + r.D + '</td>' +
      '<td class="num">' + r.L + '</td><td class="num">' + r.F + '</td><td class="num">' + r.A + '</td>' +
      '<td class="num">' + (r.GD > 0 ? '+' : '') + r.GD + '</td><td class="num bold">' + r.Pts + '</td>',
      null, userHere ? E.user(S).name : null);
    const sc = E.topScorers(S, 16);
    renderGrid('ts-grid', sc.map((x, i) => Object.assign({ id: i }, x)), x =>
      '<td>' + x.name + '</td><td>' + x.club + '</td><td class="num bold">' + x.goals + '</td>', null, null);
    $('lg-title').textContent = S.divisions[d].name + (userHere ? '  (your division)' : '');
    $('lg-prev').disabled = (d === 0);
    $('lg-next').disabled = (d === S.divisions.length - 1);
    $('lg-season').textContent = 'Season ' + S.season + '  ·  Round ' + Math.min(S.round + 1, E.totalRounds()) +
      ' of ' + E.totalRounds() + '  ·  ' + E.user(S).name + ' ' + E.ordinal(E.leaguePosition(S, E.user(S).name)) +
      ' in ' + S.divisions[S.userDivision].name;
  }

  /* ===================== CLASSIFIED RESULTS ========================= */
  function renderResults() {
    const lr = E.lastRoundResults(S);
    renderGrid('rs-grid', lr.games.map((g, i) => Object.assign({ id: i }, g)), g => {
      const fmt = side => g.scorers.filter(x => x.s === side).map(x => x.n + " " + x.m + "'").join(', ');
      const h = fmt('home'), a = fmt('away');
      const sc = [h && '<b>' + g.home + ':</b> ' + h, a && '<b>' + g.away + ':</b> ' + a].filter(Boolean).join(' &nbsp; ');
      return '<td>' + g.home + '</td><td class="num bold">' + g.hg + ' - ' + g.ag + '</td><td>' + g.away + '</td>' +
        '<td class="small">' + (sc || '&mdash;') + '</td>';
    }, null, null);
    $('rs-title').textContent = S.divisions[S.userDivision].name + ' — ' +
      (lr.round != null ? 'Round ' + (lr.round + 1) + ' results' : 'no matches played yet');
    $('rs-info').textContent = lr.games.length + ' matches in your division';
  }

  /* ===================== CHOOSE CLUB ================================= */
  function bottomMembers() { return S.divisions[S.divisions.length - 1].members; }
  function renderChoose() {
    const members = bottomMembers();
    if (members.indexOf(chooseSelIdx) < 0) chooseSelIdx = members[0];
    const rows = members.map(i => ({ id: i, club: S.clubs[i] }));
    renderGrid('choose-grid', rows, r => {
      const c = r.club;
      return '<td class="bold">' + c.name + '</td>' +
        '<td>' + E.difficultyLabel(c.tier) + '</td>' +
        '<td class="num">' + E.clubOverall(c) + '</td>' +
        '<td class="num">' + c.players.length + '</td>' +
        '<td class="num">' + Math.round(c.balance).toLocaleString('en-GB') + '</td>';
    }, r => { chooseSelIdx = r.id; renderChoose(); }, chooseSelIdx);
    const c = S.clubs[chooseSelIdx];
    $('choose-sel-name').textContent = c ? c.name + '  (' + E.difficultyLabel(c.tier) + ')' : '—';
  }
  function confirmClub() {
    E.setUserClub(S, chooseSelIdx);
    squadSelId = null;
    save();
    renderAll();
    show('screen-squad');
    toast('You are now the manager of ' + E.user(S).name + '. Good luck!', 6000);
  }

  function renderAll() { renderSquad(); }

  /* ===================== EVENT WIRING ================================= */
  function wire() {
    // squad
    $('btn-play').onclick = () => { S.selection = E.defaultSelection(S); renderTeam(); show('screen-team'); };
    $('btn-transfer').onclick = () => { renderTransfer(); show('screen-transfer'); };
    $('btn-league').onclick = () => { leagueDivView = S.userDivision; renderLeague(); show('screen-league'); };
    $('btn-results').onclick = () => { renderResults(); show('screen-results'); };
    $('edit-forename').oninput = e => { const p = selectedSquadPlayer(); if (p) { p.forename = e.target.value; renderSquad(); save(); } };
    $('edit-surname').oninput = e => { const p = selectedSquadPlayer(); if (p) { p.surname = e.target.value; renderSquad(); save(); } };
    // ticking the box sells the highlighted player immediately
    $('chk-list').onchange = e => {
      if (!e.target.checked) return;
      const p = selectedSquadPlayer(); if (!p) { e.target.checked = false; return; }
      if (!confirm('Sell ' + fullName(p) + ' now for about ' + money(p.value * 0.95) + '?')) { e.target.checked = false; return; }
      const r = E.sellPlayer(S, p.id);
      toast(r.ok ? 'Sold ' + fullName(r.player) + ' for ' + money(r.fee) + '.' : r.msg);
      e.target.checked = false; squadSelId = null; renderSquad(); save();
    };
    $('btn-analysis').onclick = () => {
      const p = selectedSquadPlayer(); if (!p) return;
      toast(fullName(p) + ' — ' + D.POS_NAME[p.pos] + ', age ' + p.age + '. Skill ' + p.skill + ', fitness ' + p.fit + '%' +
        (p.injuredFor > 0 ? ' (injured, ' + p.injuredFor + ' to go)' : '') +
        '. ' + p.appsSeason + ' apps / ' + p.goalsSeason + ' goals this season. Valued at ' + money(p.value) + '.', 7000);
    };
    $('btn-train').onclick = () => {
      const r = E.train(S);
      toast(r.ok ? 'Good session — fitness up across the squad' + (r.improved ? ', ' + r.improved + ' youngster(s) improved.' : '.') : r.msg);
      renderSquad(); save();
    };
    $('btn-resign').onclick = () => {
      if (!confirm('Resign as manager and start a new game?')) return;
      try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
      S = E.newGame((Math.random() * 1e9) >>> 0);
      squadSelId = null; chooseSelIdx = 0; renderChoose(); show('screen-choose');
    };

    // choose-club screen
    $('choose-confirm').onclick = confirmClub;
    $('choose-random').onclick = () => { chooseSelIdx = Math.floor(Math.random() * S.clubs.length); renderChoose(); };

    // team selector
    $('btn-team-back').onclick = () => { save(); renderSquad(); show('screen-squad'); };
    $('btn-bestxi').onclick = () => { const b = E.bestXI(E.user(S)); S.selection.xi = b.xi; S.selection.subs = b.subs; renderTeam(); };
    $('btn-clear').onclick = () => { S.selection.xi = []; S.selection.subs = []; renderTeam(); };
    $('btn-action').onclick = startMatch;
    $('btn-history').onclick = () => {
      if (!S.lastResult) return toast('No matches played yet.');
      const r = S.lastResult;
      toast('Last result: ' + r.homeName + ' ' + r.hg + ' - ' + r.ag + ' ' + r.awayName +
        (r.scorers.length ? '. Scorers: ' + r.scorers.map(x => x.name + " " + x.minute + "'").join(', ') : ''), 8000);
    };
    $('btn-venue').onclick = () => toast('The venue is fixed by the fixture list.');

    // match
    $('m-speed').oninput = e => { if (anim) anim.setSpeed(e.target.value); };
    $('m-sub').onclick = doSub;
    $('m-skip').onclick = () => { if (anim) anim.skip(); };
    $('m-continue').onclick = () => {
      squadSelId = null; renderSquad(); show('screen-squad'); flushNotices();
      if (S.round === 0 && S.season > 1) { renderLeague(); }
    };

    // transfer market
    ['tm-search'].forEach(id => $(id).oninput = renderTransfer);
    ['f-G', 'f-D', 'f-M', 'f-A', 'f-euro', 'f-sort', 'f-unlisted'].forEach(id => $(id).onchange = renderTransfer);
    $('tm-bid').onclick = () => {
      if (tmSelId == null) return;
      const r = E.bid(S, tmSelId);
      toast(r.ok ? 'Signed ' + fullName(r.player) + ' for ' + money(r.fee) + '!' : r.msg);
      tmSelId = null; renderTransfer(); renderSquad(); save();
    };
    $('tm-unlisted').onclick = () => {
      const pos = D.POSITIONS[Math.floor(Math.random() * 4)];
      const r = E.signUnlisted(S, pos);
      toast(r.ok ? 'Signed unlisted ' + fullName(r.player) + ' (' + r.player.pos + ', skill ' + r.player.skill + ').' : r.msg);
      renderTransfer(); renderSquad(); save();
    };
    $('tm-close').onclick = () => { renderSquad(); show('screen-squad'); flushNotices(); };

    // league tables (with division switcher) + classified results
    $('lg-prev').onclick = () => { leagueDivView = Math.max(0, leagueDivView - 1); renderLeague(); };
    $('lg-next').onclick = () => { leagueDivView = Math.min(S.divisions.length - 1, leagueDivView + 1); renderLeague(); };
    $('lg-close').onclick = () => { renderSquad(); show('screen-squad'); };
    $('rs-close').onclick = () => { renderSquad(); show('screen-squad'); };

    // title-bar close buttons -> back to squad (the chooser is excluded so it
    // can't be dismissed without picking a club)
    document.querySelectorAll('.win:not(#screen-choose) .t-btn').forEach(b => { if (b.textContent === '×') b.onclick = () => { renderSquad(); show('screen-squad'); }; });
  }

  /* ---- automation hook (used by the screenshot tool & manual testing) - */
  window.SIMSOC_TEST = {
    advance(n) {
      for (let i = 0; i < n && E.nextOpponent(S); i++) {
        const m = E.playUserMatch(S);
        S.selection = E.defaultSelection(S);
        E.commitUserResult(S, m);
      }
      save(); squadSelId = null; renderSquad();
    },
    state() { return S; },
    show
  };

  /* ---- go ------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => { wire(); boot(); });
  if (document.readyState !== 'loading') { wire(); boot(); }
})();
