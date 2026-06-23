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
  let S, squadSelId = null, tmSelId = null, anim = null, chooseSelIdx = 0, leagueDivView = 0, bracketCup = null, chooseMode = 'new', lastXIMode = 'best';

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
      E.chooseClub(S, parseInt(params.get('club'), 10) || 0);
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
  // wrap the club you manage in red + bold wherever its name is shown
  function meName(name) { return S && name === E.user(S).name ? '<span class="me">' + name + '</span>' : name; }
  function isMine(name) { return S && name === E.user(S).name; }

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
    $('mgr-rating').textContent = S.managerRating;
    if ($('chk-explayers') && $('chk-explayers').checked) {          // show former players instead
      const ex = (S.exPlayers || []).slice().reverse();
      renderGrid('squad-grid', ex.map((p, i) => Object.assign({ id: 'ex' + i }, p)), p =>
        '<td>' + p.surname + '</td><td>' + p.forename + '</td><td>' + posCell(p.pos) + '</td>' +
        '<td class="num">' + p.skill + '</td><td class="num">' + (p.age || '') + '</td>' +
        '<td class="small" colspan="2">S' + p.season + ' · ' + (p.reason || '') + '</td>' +
        '<td class="num">' + p.appsTotal + '</td><td class="num">' + p.goalsTotal + '</td>', null, null);
      if (!ex.length) renderGrid('squad-grid', [{ id: 0 }], () => '<td colspan="9" class="center small">No former players yet.</td>', null, null);
      return;
    }
    const players = sortSquad(club.players);
    if (squadSelId == null && players.length) squadSelId = players[0].id;
    renderGrid('squad-grid', players, p =>
      '<td>' + p.surname +
        (p.injuredFor > 0 ? ' <span class="red" title="injured">+' + p.injuredFor + '</span>' : '') +
        (p.suspendedFor > 0 ? ' <span class="red" title="suspended">susp ' + p.suspendedFor + '</span>' : '') + '</td>' +
      '<td>' + p.forename + '</td><td>' + posCell(p.pos) + '</td>' +
      '<td class="num">' + p.skill + '</td><td class="num">' + p.age + '</td>' +
      '<td class="num">' + p.appsSeason + '</td><td class="num">' + p.goalsSeason + '</td>' +
      '<td class="num">' + p.appsTotal + '</td><td class="num">' + p.goalsTotal + '</td>',
      p => { squadSelId = p.id; renderSquadSide(); renderSquad(); }, squadSelId);
    renderSquadSide();
  }
  function selectedSquadPlayer() { return E.user(S).players.find(p => p.id === squadSelId); }
  function renderSquadSide() {
    const p = selectedSquadPlayer(); if (!p) return;
    $('edit-forename').value = p.forename;
    $('edit-surname').value = p.surname;
    $('sel-info').textContent = D.POS_NAME[p.pos] + ' · age ' + p.age + ' · skill ' + p.skill + ' · ' + money(p.value);
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
    const fitIds = new Set(E.availablePlayers(club).map(p => p.id));
    const reserves = club.players.filter(p => !inUse.has(p.id) && fitIds.has(p.id));
    const out = club.players.filter(p => !inUse.has(p.id) && !fitIds.has(p.id));   // injured / suspended / unfit

    const pRow = p => '<td>' + p.surname + '</td><td>' + p.forename + '</td><td>' + posCell(p.pos) +
      '</td><td class="num">' + p.skill + '</td><td class="num">' + p.fit + '</td>';
    const reason = p => p.injuredFor > 0 ? 'Inj ' + p.injuredFor : p.suspendedFor > 0 ? 'Susp ' + p.suspendedFor : 'Unfit';
    const outRow = p => '<td>' + p.surname + '</td><td>' + p.forename + '</td><td>' + posCell(p.pos) +
      '</td><td class="num">' + p.skill + '</td><td class="num red" title="unavailable">' + reason(p) + '</td>';

    renderGrid('xi-grid', sortSquad(xi), pRow, p => { moveToReserves(p.id); renderTeam(); });
    renderGrid('subs-grid', subs, pRow, p => { moveToReserves(p.id); renderTeam(); });
    const resRows = sortSquad(reserves).concat(sortSquad(out));
    renderGrid('res-grid', resRows, p => fitIds.has(p.id) ? pRow(p) : outRow(p),
      p => { if (fitIds.has(p.id)) { addFromReserves(p.id); renderTeam(); } });

    // ratings
    const hr = E.userRatings(S), ar = E.clubRatings(opp.club);
    $('rt-home-name').textContent = club.name;
    $('rt-away-name').textContent = opp.club.name;
    $('rt-h-def').textContent = hr.defence; $('rt-h-mid').textContent = hr.midfield;
    $('rt-h-att').textContent = hr.attack; $('rt-h-mor').textContent = hr.morale;
    $('rt-a-def').textContent = ar.defence; $('rt-a-mid').textContent = ar.midfield;
    $('rt-a-att').textContent = ar.attack; $('rt-a-mor').textContent = ar.morale;

    $('league-name').textContent = opp.compName;        // division name, or e.g. "FA Cup — Last 16"
    $('opp-name').textContent = opp.club.name;
    $('btn-venue').textContent = opp.home ? 'Home' : 'Away';
    $('team-mgr').textContent = S.managerRating;
    if ($('sel-formation')) $('sel-formation').value = (S.selection.formation || '442');
  }
  // re-pick the XI with the given picker mode, honouring the chosen formation
  function pickXI(mode) {
    lastXIMode = mode;
    const b = E.bestXI(E.user(S), { mode: mode, formation: S.selection.formation || '442' });
    S.selection.xi = b.xi; S.selection.subs = b.subs; S.selection.formation = b.formation;
    renderTeam();
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
  let matchEnded = false;
  function bxAdd(cls, minute, html) {
    const log = $('bx-events');
    const d = document.createElement('div'); d.className = 'ev ' + (cls || '');
    d.innerHTML = '<span class="min">' + Math.round(minute) + "'</span>" + html;
    log.appendChild(d); log.parentElement.scrollTop = log.parentElement.scrollHeight;
  }
  function toRoundup() { renderRoundup(); show('screen-roundup'); flushNotices(); save(); }
  // fewer than 8 fit players -> the match is conceded; no animation, straight to the round-up
  function attemptForfeit() {
    if (E.availablePlayers(E.user(S)).length >= 8) return false;
    const m = E.playUserMatch(S);
    if (!m) return false;
    E.commitUserResult(S, m);
    toast('Walkover — you could not field 8 fit players. The match is forfeited ' + m.hg + ' - ' + m.ag + '.', 7000);
    toRoundup();
    return true;
  }
  function startMatch() {
    if (attemptForfeit()) return;
    if (S.selection.xi.length !== 11) return toast('Pick exactly 11 starters (you have ' + S.selection.xi.length + ').');
    if (S.selection.subs.length < 1) return toast('Pick at least one substitute.');
    const match = E.playUserMatch(S);
    if (!match) return;
    window._match = match; matchEnded = false;
    const sideName = side => side === 'home' ? match.homeName : match.awayName;
    $('m-home').textContent = match.homeName;
    $('m-away').textContent = match.awayName;
    $('m-hg').textContent = '0'; $('m-ag').textContent = '0';
    $('m-bar').style.width = '0%';
    $('m-event').textContent = match.compName || 'League';
    $('m-status').textContent = 'Kick off!';
    $('m-continue').classList.add('hidden');
    $('m-ball-home').textContent = '—'; $('m-ball-away').textContent = '—';
    $('bx-events').innerHTML = '';
    ['poss', 'shots', 'sot', 'cor', 'foul'].forEach(k => { $('bx-' + k + '-h').textContent = '–'; $('bx-' + k + '-a').textContent = '–'; });
    show('screen-match');

    if (anim) anim.stop();
    anim = M.create($('pitch'), match, {
      onScore: (side, name, minute, hg, ag) => {
        $('m-hg').textContent = hg; $('m-ag').textContent = ag;
        $('m-event').textContent = Math.round(minute) + "'  GOAL!  " + name + ' (' + sideName(side) + ')';
        bxAdd('goal', minute, '&#9917; <b>GOAL</b> — ' + name + ' <span class="l">(' + sideName(side) + ')</span>');
      },
      onCard: c => bxAdd(c.color === 'R' ? 'rc' : 'yc', c.minute, (c.color === 'R' ? '&#9632; Red card' : '&#9632; Booking') + ' — ' + c.name + ' <span class="l">(' + sideName(c.side) + ')</span>'),
      onInjury: iv => bxAdd('inj', iv.minute, '&#10010; Injury — ' + iv.name + ' <span class="l">(' + sideName(iv.side) + ')</span>'),
      onSub: sv => bxAdd('sub', sv.minute, '&#8644; Sub — ' + sv.on + ' for ' + sv.off + ' <span class="l">(' + sideName(sv.side) + ')</span>'),
      onMinute: m => {
        $('m-bar').style.width = (m / 90 * 100) + '%';
        $('m-status').textContent = m >= 90 ? 'Full time' : Math.floor(m) + ' mins';
      },
      onBall: (h, a) => { if (h) $('m-ball-home').textContent = h; if (a) $('m-ball-away').textContent = a; },
      onFullTime: () => finishMatch(match)
    });
    anim.setSpeed($('m-speed').value);
  }
  function finishMatch(match) {
    if (matchEnded) return;                       // onFullTime can fire once; guard double commit
    matchEnded = true;
    const st = match.stats;
    $('bx-poss-h').textContent = st.possHome; $('bx-poss-a').textContent = st.possAway;
    $('bx-shots-h').textContent = st.shotsHome; $('bx-shots-a').textContent = st.shotsAway;
    $('bx-sot-h').textContent = st.sotHome; $('bx-sot-a').textContent = st.sotAway;
    $('bx-cor-h').textContent = st.cornersHome; $('bx-cor-a').textContent = st.cornersAway;
    $('bx-foul-h').textContent = st.foulsHome; $('bx-foul-a').textContent = st.foulsAway;
    const res = E.commitUserResult(S, match);
    let txt = 'Full time: ' + match.homeName + ' ' + res.hg + ' - ' + res.ag + ' ' + match.awayName;
    if (res.agg) txt += ' (agg ' + res.agg + ')';
    if (res.winnerName) txt += (res.pens ? ' — on pens, ' : ' — ') + res.winnerName + ' go through';
    $('m-event').textContent = txt;
    $('m-continue').classList.remove('hidden');
    save();
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
      '<td class="num">' + p.age + '</td>' +
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
      '<td class="num">' + r.pos + '</td><td>' + meName(r.name) + '</td>' +
      '<td class="num">' + r.P + '</td><td class="num">' + r.W + '</td><td class="num">' + r.D + '</td>' +
      '<td class="num">' + r.L + '</td><td class="num">' + r.F + '</td><td class="num">' + r.A + '</td>' +
      '<td class="num">' + (r.GD > 0 ? '+' : '') + r.GD + '</td><td class="num bold">' + r.Pts + '</td>',
      null, null);
    const uName = E.user(S).name;
    // top scorers for the division being viewed (only that competition)
    let sc = E.topScorers(S, 18, d);
    if (userHere && !sc.some(x => x.club === uName)) {     // surface my own leading scorer in my division
      const mine = E.topScorers(S, 99999, d).filter(x => x.club === uName);
      if (mine.length) sc = sc.concat([mine[0]]);
    }
    renderGrid('ts-grid', sc.map((x, i) => Object.assign({ id: i }, x)), x =>
      '<td>' + (isMine(x.club) ? '<span class="me">' + x.name + '</span>' : x.name) + '</td>' +
      '<td>' + meName(x.club) + '</td><td class="num bold">' + x.goals + '</td>', null, null);
    $('ts-title').textContent = 'Top Scorers — ' + S.divisions[d].name;
    $('lg-title').textContent = S.divisions[d].name + (userHere ? '  (your division)' : '');
    $('lg-prev').disabled = (d === 0);
    $('lg-next').disabled = (d === S.divisions.length - 1);
    const totalMd = E.userLeagueRounds(S);
    const playedMd = S.divisions[S.userDivision].table[E.user(S).name].P;
    $('lg-season').textContent = 'Season ' + S.season + '  ·  Matchday ' + Math.min(playedMd, totalMd) +
      ' of ' + totalMd + '  ·  ' + E.user(S).name + ' ' + E.ordinal(E.leaguePosition(S, E.user(S).name)) +
      ' in ' + S.divisions[S.userDivision].name;
  }

  /* ===================== CLASSIFIED RESULTS ========================= */
  function renderResults() {
    const lr = E.lastRoundResults(S);
    renderGrid('rs-grid', lr.games.map((g, i) => Object.assign({ id: i }, g)), g => {
      const fmt = side => g.scorers.filter(x => x.s === side).map(x => x.n + " " + x.m + "'").join(', ');
      const h = fmt('home'), a = fmt('away');
      const sc = [h && '<b>' + g.home + ':</b> ' + h, a && '<b>' + g.away + ':</b> ' + a].filter(Boolean).join(' &nbsp; ');
      return '<td>' + meName(g.home) + '</td><td class="num bold">' + g.hg + ' - ' + g.ag + '</td><td>' + meName(g.away) + '</td>' +
        '<td class="small">' + (sc || '&mdash;') + '</td>';
    }, null, null);
    $('rs-title').textContent = S.divisions[S.userDivision].name + ' — ' +
      (lr.round != null ? 'Round ' + (lr.round + 1) + ' results' : 'no matches played yet');
    $('rs-info').textContent = lr.games.length + ' matches in your division';
  }

  /* ===================== HONOURS (roll of honour) =================== */
  function renderHonours() {
    const h = S.honours.slice().reverse();
    const leagueRows = [];
    h.forEach(rec => rec.divisions.forEach(d => leagueRows.push({ season: rec.season, name: d.name, first: d.first, second: d.second, third: d.third })));
    renderGrid('hon-grid', leagueRows.map((r, i) => Object.assign({ id: i }, r)), r =>
      '<td class="num">' + r.season + '</td><td>' + r.name + '</td>' +
      '<td class="bold">' + meName(r.first || '—') + '</td><td>' + meName(r.second || '—') + '</td><td>' + meName(r.third || '—') + '</td>',
      null, null);
    const cupRows = [];
    h.forEach(rec => rec.cups.forEach(c => cupRows.push({ season: rec.season, name: c.name, winner: c.winner })));
    renderGrid('honc-grid', cupRows.map((r, i) => Object.assign({ id: i }, r)), r =>
      '<td class="num">' + r.season + '</td><td>' + r.name + '</td><td class="bold">' + meName(r.winner || '—') + '</td>',
      null, null);
    // total trophies per club, with the breakdown by competition
    const tally = E.honoursTally(S);
    if (tally.length) {
      renderGrid('hont-grid', tally.map((t, i) => Object.assign({ id: i }, t)), t => {
        const parts = Object.keys(t).filter(k => k !== 'club' && k !== 'total' && k !== 'id').sort().map(k => k + ' ×' + t[k]);
        return '<td>' + meName(t.club) + '</td><td class="num bold">' + t.total + '</td><td class="small">' + parts.join(', ') + '</td>';
      }, null, null);
    } else {
      renderGrid('hont-grid', [{ id: 0 }], () => '<td colspan="3" class="center small">No trophies won yet.</td>', null, null);
    }
    $('hon-info').textContent = S.honours.length
      ? S.honours.length + ' season(s) in the books'
      : 'No seasons completed yet — the roll of honour fills up at the end of each season.';
  }

  /* ===================== MY CAREER ================================== */
  function renderCareer() {
    const car = (S.career || []).slice().reverse();
    if (car.length) {
      renderGrid('car-grid', car.map((c, i) => Object.assign({ id: i }, c)), c =>
        '<td class="num">' + c.season + '</td><td>' + meName(c.club) + '</td><td>' + c.division + '</td>' +
        '<td class="num">' + E.ordinal(c.position) + '</td>' +
        '<td class="small">' + (c.trophies && c.trophies.length ? c.trophies.join(', ') : '—') + '</td>', null, null);
    } else {
      renderGrid('car-grid', [{ id: 0 }], () => '<td colspan="5" class="center small">No completed seasons yet — your career record fills in as seasons end.</td>', null, null);
    }
    const trophies = (S.career || []).reduce((n, c) => n + (c.trophies ? c.trophies.length : 0), 0);
    $('car-sum').innerHTML = 'Manager of ' + meName(E.user(S).name) + '  —  ' + (S.career || []).length + ' season(s) completed, ' + trophies + ' trophy(ies) won';
    $('car-now').innerHTML = 'This season (' + S.season + '): ' + meName(E.user(S).name) + ' in ' + S.divisions[S.userDivision].name +
      ', currently ' + E.ordinal(E.leaguePosition(S, E.user(S).name)) + ', manager rating ' + S.managerRating + '%.';
    $('car-info').textContent = (S.career || []).length + ' season(s) in your managerial record.';
  }

  /* ===================== RESULTS ROUND-UP =========================== */
  function renderRoundup() {
    const body = $('ru-body'); body.innerHTML = '';
    const ru = S.roundup || [];
    if (!ru.length) { body.innerHTML = '<div class="ev">Nothing else was simulated.</div>'; }
    ru.forEach(entry => entry.groups.forEach(g => {
      const h = document.createElement('h4'); h.textContent = g.group; body.appendChild(h);
      g.games.forEach(gm => {
        const hh = isMine(gm.home) ? meName(gm.home) : (gm.winner && gm.winner === gm.home ? '<b>' + gm.home + '</b>' : gm.home);
        const aa = isMine(gm.away) ? meName(gm.away) : (gm.winner && gm.winner === gm.away ? '<b>' + gm.away + '</b>' : gm.away);
        const d = document.createElement('div'); d.className = 'res';
        d.innerHTML = '<div class="h">' + hh + '</div><div class="sc">' + (gm.score || '') +
          (gm.pens ? ' <span class="pk">p</span>' : '') + '</div><div class="a">' + aa + '</div>' +
          (gm.agg ? '<div class="small" style="flex-basis:100%;text-align:center;color:#666">' + gm.agg + '</div>' : '');
        body.appendChild(d);
      });
    }));
    const r = S.lastResult;
    $('ru-info').innerHTML = r ? r.comp + ': ' + meName(r.homeName) + ' ' + r.hg + '-' + r.ag + ' ' + meName(r.awayName) : '';
  }

  /* ===================== CUP BRACKETS =============================== */
  function renderBracketTabs() {
    const tabs = $('bk-tabs'); tabs.innerHTML = '';
    E.cupIds(S).forEach(id => {
      const b = document.createElement('button'); b.className = 'spacer';
      b.textContent = E.cupBracket(S, id).name;
      b.onclick = () => { bracketCup = id; renderBracket(); };
      tabs.appendChild(b);
    });
  }
  function renderBracket() {
    const ids = E.cupIds(S); const body = $('bk-body');
    if (!ids.length) { body.innerHTML = 'No cups in progress.'; $('bk-title').textContent = ''; return; }
    if (!bracketCup || ids.indexOf(bracketCup) < 0) bracketCup = ids[0];
    const br = E.cupBracket(S, bracketCup);
    $('bk-title').innerHTML = br.name + (br.winner ? '  —  Winners: ' + meName(br.winner) : '');
    body.innerHTML = '';
    br.rounds.forEach(rd => {
      const col = document.createElement('div'); col.className = 'bcol';
      const rn = document.createElement('div'); rn.className = 'rname'; rn.textContent = rd.name; col.appendChild(rn);
      rd.ties.forEach(t => {
        const d = document.createElement('div'); d.className = 'tie';
        if (t.away === '(bye)') { d.innerHTML = '<div class="w">' + meName(t.home) + '</div><div class="l">(bye)</div>'; }
        else {
          const sc = t.score ? '<span class="sc">' + t.score + (t.pens ? ' p' : '') + '</span>' : '';
          const hw = t.winner === t.home, aw = t.winner === t.away;
          d.innerHTML = '<div class="' + (hw ? 'w' : (t.winner ? 'l' : '')) + '">' + meName(t.home) + sc + '</div>' +
            '<div class="' + (aw ? 'w' : (t.winner ? 'l' : '')) + '">' + meName(t.away) + '</div>' +
            (t.agg ? '<div class="l" style="font-size:10px">' + t.agg + '</div>' : '');
        }
        col.appendChild(d);
      });
      body.appendChild(col);
    });
    // top scorers for this cup only
    const sc = E.topScorersForCup(S, bracketCup, 30);
    if (sc.length) {
      renderGrid('bk-scorers', sc.map((x, i) => Object.assign({ id: i }, x)), x =>
        '<td>' + (isMine(x.club) ? '<span class="me">' + x.name + '</span>' : x.name) + '</td>' +
        '<td>' + meName(x.club) + '</td><td class="num bold">' + x.goals + '</td>', null, null);
    } else {
      renderGrid('bk-scorers', [{ id: 0 }], () => '<td colspan="3" class="center small">No goals scored yet.</td>', null, null);
    }
  }

  /* ===================== HEAD TO HEAD =============================== */
  function renderHistory(oppName) {
    const recs = E.historyVs(S, oppName);
    $('h2h-title').textContent = E.user(S).name + '  vs  ' + oppName;
    let w = 0, d = 0, l = 0, gf = 0, ga = 0;
    recs.forEach(h => { const our = h.home ? h.hg : h.ag, their = h.home ? h.ag : h.hg; gf += our; ga += their; if (our > their) w++; else if (our === their) d++; else l++; });
    $('h2h-sum').textContent = recs.length ? ('Played ' + recs.length + ' — won ' + w + ', drawn ' + d + ', lost ' + l + ' (goals ' + gf + '-' + ga + ')') : 'You have never faced ' + oppName + '.';
    renderGrid('h2h-grid', recs.slice().reverse().map((h, i) => Object.assign({ id: i }, h)), h => {
      const our = h.home ? h.hg : h.ag, their = h.home ? h.ag : h.hg;
      const cls = our > their ? 'pos-G' : our === their ? '' : 'red';
      return '<td class="num">' + h.season + '</td><td>' + h.compName + '</td><td>' + (h.home ? 'Home' : 'Away') + '</td>' +
        '<td class="num"><span class="' + cls + '">' + h.hg + ' - ' + h.ag + (h.pens ? ' p' : '') + '</span></td>';
    }, null, null);
  }

  /* ===================== FINANCES =================================== */
  function renderFinance() {
    $('fin-balance').textContent = money(E.user(S).balance);
    $('fin-debt').textContent = money(S.debt || 0);
    $('fin-cap').textContent = money(E.loanCap(S));
  }

  /* ===================== CHOOSE CLUB ================================= */
  function bottomMembers() { return S.divisions[S.divisions.length - 1].members; }
  // candidates in the chooser: every bottom-tier club for a brand-new game, or the
  // clubs willing to hire you (reputation-gated) when you resign mid-career.
  function chooseCandidates() {
    if (chooseMode === 'resign') {
      return E.eligibleClubs(S, S.managerRating).slice()
        .sort((a, b) => S.clubs[a].division - S.clubs[b].division || E.clubOverall(S.clubs[b]) - E.clubOverall(S.clubs[a]));
    }
    return bottomMembers();
  }
  function renderChoose() {
    const resign = chooseMode === 'resign';
    const members = chooseCandidates();
    if (members.indexOf(chooseSelIdx) < 0) chooseSelIdx = members[0];
    const bottomName = S.divisions[S.divisions.length - 1].name;
    $('choose-band').textContent = resign ? 'Managerial vacancies' : 'League ' + bottomName;
    $('choose-head').textContent = resign ? 'Choose your next club' : 'Choose a club to manage';
    $('choose-sub').textContent = resign
      ? 'On a manager rating of ' + S.managerRating + '%, these ' + members.length + ' clubs would take you on — do better to be offered bigger jobs.'
      : 'Take charge of any club in the ' + bottomName + ' for your first season in management.';
    $('choose-col2').textContent = resign ? 'Division' : 'Prospects';
    $('choose-confirm').innerHTML = resign ? 'Take Over &raquo;' : 'Take Charge &raquo;';
    const col2 = c => resign ? S.divisions[c.division].name : E.difficultyLabel(c.tier);
    const rows = members.map(i => ({ id: i, club: S.clubs[i] }));
    renderGrid('choose-grid', rows, r => {
      const c = r.club;
      return '<td class="bold">' + c.name + '</td>' +
        '<td>' + col2(c) + '</td>' +
        '<td class="num">' + E.clubOverall(c) + '</td>' +
        '<td class="num">' + c.players.length + '</td>' +
        '<td class="num">' + Math.round(c.balance).toLocaleString('en-GB') + '</td>';
    }, r => { chooseSelIdx = r.id; renderChoose(); }, chooseSelIdx);
    const c = S.clubs[chooseSelIdx];
    $('choose-sel-name').textContent = c ? c.name + '  (' + col2(c) + ')' : '—';
  }
  function confirmClub() {
    const resign = chooseMode === 'resign';
    E.chooseClub(S, chooseSelIdx);                 // also rebuilds the season's domestic cups so you're in the draw
    chooseMode = 'new';
    squadSelId = null; tmSelId = null; leagueDivView = S.userDivision; bracketCup = null;
    save();
    renderAll();
    show('screen-squad');
    toast((resign ? 'New job — you now manage ' : 'You are now the manager of ') + E.user(S).name + '. Good luck!', 6000);
  }

  function renderAll() { renderSquad(); }

  /* ===================== EVENT WIRING ================================= */
  function wire() {
    // squad
    $('btn-play').onclick = () => { E.prepareNextUserMatch(S); flushNotices(); renderTeam(); show('screen-team'); save(); };
    $('btn-transfer').onclick = () => { renderTransfer(); show('screen-transfer'); };
    $('btn-league').onclick = () => { leagueDivView = S.userDivision; renderLeague(); show('screen-league'); };
    $('btn-results').onclick = () => { renderResults(); show('screen-results'); };
    $('btn-honours').onclick = () => { renderHonours(); show('screen-honours'); };
    $('btn-cups').onclick = () => { renderBracketTabs(); renderBracket(); show('screen-bracket'); };
    $('btn-finance').onclick = () => { renderFinance(); show('screen-finance'); };
    $('btn-career').onclick = () => { renderCareer(); show('screen-career'); };
    $('chk-explayers').onchange = () => { squadSelId = null; renderSquad(); };
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
    $('btn-resign').onclick = () => {
      const cand = E.eligibleClubs(S, S.managerRating);
      if (!confirm('Resign as manager of ' + E.user(S).name + '?\n\nWith a ' + S.managerRating + '% rating, ' + cand.length + ' club(s) would offer you a job.')) return;
      chooseMode = 'resign'; chooseSelIdx = cand[0];
      renderChoose(); show('screen-choose');
    };

    // choose-club screen
    $('choose-confirm').onclick = confirmClub;
    $('choose-random').onclick = () => { chooseSelIdx = Math.floor(Math.random() * S.clubs.length); renderChoose(); };

    // team selector
    $('btn-team-back').onclick = () => { save(); renderSquad(); show('screen-squad'); };
    $('btn-bestxi').onclick = () => pickXI('best');
    $('btn-freshxi').onclick = () => pickXI('fresh');
    $('btn-mixxi').onclick = () => pickXI('mix');
    $('btn-clear').onclick = () => { S.selection.xi = []; S.selection.subs = []; renderTeam(); };
    $('sel-formation').onchange = e => { S.selection.formation = e.target.value; pickXI(lastXIMode); };
    $('btn-action').onclick = startMatch;
    $('btn-simulate').onclick = () => {           // instant result, no animation
      if (attemptForfeit()) return;
      if (S.selection.xi.length !== 11) return toast('Pick exactly 11 starters (you have ' + S.selection.xi.length + ').');
      if (S.selection.subs.length < 1) return toast('Pick at least one substitute.');
      const m = E.playUserMatch(S); if (!m) return;
      E.commitUserResult(S, m);
      toRoundup();
    };
    $('btn-history').onclick = () => {           // head-to-head vs the upcoming opponent
      const o = E.nextOpponent(S);
      if (!o) return toast('No upcoming match.');
      renderHistory(o.club.name); show('screen-history');
    };
    $('btn-venue').onclick = () => toast('The venue is fixed by the fixture list.');
    $('h2h-close').onclick = () => { renderTeam(); show('screen-team'); };

    // match
    $('m-speed').oninput = e => { if (anim) anim.setSpeed(e.target.value); };
    $('m-skip').onclick = () => { if (anim) anim.skip(); };
    $('m-continue').onclick = () => { renderRoundup(); show('screen-roundup'); flushNotices(); };
    $('ru-ok').onclick = () => {
      squadSelId = null; renderSquad(); show('screen-squad');
      if (S.day === 0 && S.season > 1) { renderHonours(); show('screen-honours'); }   // a season just ended
    };
    $('ru-tables').onclick = () => { leagueDivView = S.userDivision; renderLeague(); show('screen-league'); };
    $('ru-cups').onclick = () => { renderBracketTabs(); renderBracket(); show('screen-bracket'); };

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
    $('hon-close').onclick = () => { renderSquad(); show('screen-squad'); };
    $('car-close').onclick = () => { renderSquad(); show('screen-squad'); };
    $('bk-close').onclick = () => { renderSquad(); show('screen-squad'); };

    // finances / loans
    $('fin-close').onclick = () => { renderSquad(); show('screen-squad'); };
    $('fin-borrow').onclick = () => { const r = E.takeLoan(S, parseInt($('fin-amount').value, 10)); toast(r.msg); renderFinance(); renderSquad(); save(); };
    $('fin-repay').onclick = () => { const r = E.repayLoan(S, parseInt($('fin-amount').value, 10)); toast(r.msg); renderFinance(); renderSquad(); save(); };

    // title-bar close buttons -> back to squad (the chooser is excluded so it
    // can't be dismissed without picking a club)
    document.querySelectorAll('.win:not(#screen-choose) .t-btn').forEach(b => { if (b.textContent === '×') b.onclick = () => { renderSquad(); show('screen-squad'); }; });

    // spacebar advances the current screen (presses its primary "next" button)
    document.addEventListener('keydown', e => {
      if (e.code !== 'Space' && e.key !== ' ' && e.keyCode !== 32) return;
      const tag = (e.target && e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea' || tag === 'button') return;   // don't hijack typing / focused buttons
      const btn = primaryButton();
      if (btn && !btn.disabled && !btn.classList.contains('hidden')) { e.preventDefault(); btn.click(); }
    });
  }
  // the "advance" button for the screen currently on top
  const PRIMARY = {
    'screen-choose': 'choose-confirm', 'screen-squad': 'btn-play', 'screen-team': 'btn-action',
    'screen-roundup': 'ru-ok', 'screen-league': 'lg-close', 'screen-results': 'rs-close',
    'screen-honours': 'hon-close', 'screen-career': 'car-close', 'screen-bracket': 'bk-close',
    'screen-history': 'h2h-close', 'screen-finance': 'fin-close', 'screen-transfer': 'tm-close'
  };
  function primaryButton() {
    const scr = Array.prototype.find.call(document.querySelectorAll('.win'), w => !w.classList.contains('hidden'));
    if (!scr) return null;
    if (scr.id === 'screen-match') { const c = $('m-continue'); return (c && !c.classList.contains('hidden')) ? c : $('m-skip'); }
    const id = PRIMARY[scr.id];
    return id ? $(id) : null;
  }

  /* ---- automation hook (used by the screenshot tool & manual testing) - */
  window.SIMSOC_TEST = {
    advance(n) {
      for (let i = 0; i < n; i++) {
        E.prepareNextUserMatch(S);
        const m = E.playUserMatch(S);
        if (!m) break;
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
