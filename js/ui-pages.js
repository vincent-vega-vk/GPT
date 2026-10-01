/*
 * SIMSOC 6 (remake) - pages
 * Every screen of the manager game, rendered as HTML strings into #view.
 * Interactions go through data-go (navigation) and data-act (UI.acts).
 */
;(function () {
  'use strict';
  const UI = window.SimUI, E = window.SimSocEngine, D = window.SimSocData, Live = window.SimSocLive, Store = window.SimSocStore;
  const esc = UI.esc, money = UI.money, ms = UI.moneyShort, $ = UI.$, $$ = UI.$$;
  const S = () => UI.S;
  const head = (title, sub, right) => '<div class="page-head"><div class="grow"><h1>' + title + '</h1>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>' + (right || '') + '</div>';
  const card = (title, body, opts) => {
    opts = opts || {};
    return '<section class="card ' + (opts.cls || '') + '"' + (opts.style ? ' style="' + opts.style + '"' : '') + '>' + (title ? '<div class="card-head"><h3>' + title + '</h3>' +
      (opts.more ? '<a class="more" data-go="' + opts.more[1] + '">' + opts.more[0] + ' →</a>' : '') + (opts.right || '') + '</div>' : '') + body + '</section>';
  };
  const tabs = (items, active, base) => '<div class="tabs">' + items.map(t => '<a class="tab' + (t[0] === active ? ' active' : '') + '" data-go="' + base + t[0] + '">' + t[1] + '</a>').join('') + '</div>';
  const seg = (act, opts, cur, extra) => '<div class="seg">' + opts.map(o => '<button class="' + (String(o[0]) === String(cur) ? 'on' : '') + '" data-act="' + act + '" data-v="' + o[0] + '"' + (extra || '') + (o[2] ? ' title="' + esc(o[2]) + '"' : '') + '>' + o[1] + '</button>').join('') + '</div>';
  const kpi = (k, v, s) => '<div class="kpi"><div class="k">' + k + '</div><div class="v">' + v + '</div>' + (s ? '<div class="s">' + s + '</div>' : '') + '</div>';
  const meter = (v, col) => '<div class="meter"><span style="width:' + Math.max(2, Math.min(100, v)) + '%;background:' + col + '"></span></div>';
  const confColor = v => (v < 25 ? 'var(--bad)' : v < 50 ? 'var(--warn)' : 'var(--good)');
  function nextFixture() {
    const s = S(), opp = E.nextOpponent(s);
    if (opp) return { opp: opp.clubIndex, home: opp.home, date: opp.date, compName: opp.compName, comp: opp.comp, ready: true };
    const f = E.clubFixtures(s, s.userClub).find(x => !x.played && x.day >= s.day);
    return f ? { opp: f.opp, home: f.home, date: f.date, compName: f.compName, comp: f.comp, ready: false } : null;
  }
  UI.nextFixture = nextFixture;

  /* ================================================================ *
   * TITLE & NEW CAREER
   * ================================================================ */
  UI.page('title', {
    bare: true,
    render() {
      const m = UI.autoMeta;
      return '<div class="hero"><div class="logo">SIMSOC<span>6</span></div>' +
        '<p>Take charge of any club across eight footballing nations — from the Conference to Serie A. Build a squad, set your tactics, ' +
        'watch every match live and climb all the way to European glory.</p>' +
        (m ? '<div class="card" style="max-width:520px;margin:0 auto 18px;text-align:left"><div class="row nowrap">' +
          '<span class="crest lg" style="--c1:' + (m.kit ? m.kit[0] : '#3d8bff') + ';--c2:' + (m.kit ? m.kit[1] : '#fff') + '"></span><div class="grow" style="min-width:0">' +
          '<div class="bold me" style="font-size:18px">' + esc(m.club) + '</div><div class="muted small">' + esc(m.manager || '') + ' · ' + esc(m.division) + ' · ' + esc(m.season) +
          ' · ' + esc(E.formatDate(m.date)) + '</div></div><button class="btn go lg" data-act="loadAuto" data-primary="1">Continue career</button></div></div>' : '') +
        '<div class="actions"><button class="btn primary lg" data-go="new"' + (m ? '' : ' data-primary="1"') + '>' + UI.icon('plus') + ' New career</button>' +
        '<button class="btn lg" data-go="load">' + UI.icon('save') + ' Load game</button><button class="btn ghost lg" data-go="help">How to play</button></div>' +
        '<div class="kpis" style="max-width:860px;margin:34px auto 0">' + kpi('Nations', '8', 'England to Scotland') + kpi('Leagues', '12', 'with promotion & relegation') +
        kpi('Clubs', '300+', 'plus 75 European guests') + kpi('Cups', '13', 'FA Cup to Champions League') + '</div></div>';
    }
  });
  UI.acts.loadAuto = () => UI.loadFrom('auto').then(() => { UI.toast('Welcome back, ' + UI.S.manager.name + '.', 'good'); UI.go('home'); })
    .catch(e => UI.toast(e.message, 'bad'));

  UI.page('new', {
    bare: true,
    render() {
      const n = UI.newCfg = UI.newCfg || { name: 'The Gaffer', diff: 'normal', nation: 'ENG', division: 3, club: null };
      if (!UI.preview) UI.preview = E.newGame(UI.newSeed || 12345);
      const P = UI.preview;
      const pr = UI._prevPrestige || (UI._prevPrestige = E.prestigeMap(P));
      const nats = D.NATION_ORDER;
      const divs = P.divisions.map((d, i) => i).filter(i => P.divisions[i].nation === n.nation);
      if (divs.indexOf(n.division) < 0) n.division = divs[0];
      const members = P.divisions[n.division].members.slice().sort((a, b) => pr[b] - pr[a]);
      const prevS = UI.S; UI.S = P;               // render links against the preview world
      const clubs = members.map(ci => {
        const c = P.clubs[ci];
        return '<div class="club-card' + (n.club === ci ? ' on' : '') + '" data-act="newClub" data-ci="' + ci + '">' + UI.crest(c, 'lg') +
          '<div class="bold ellip">' + esc(c.name) + '</div><div class="meta">' + UI.stars(pr[ci]) + ' · ' + esc(E.difficultyLabel(c.tier)) +
          '<br>Squad ' + E.clubOverall(c) + ' · Budget ' + ms(c.balance) + '</div></div>';
      }).join('');
      UI.S = prevS;
      const chosen = n.club != null ? P.clubs[n.club] : null;
      return '<div class="wizard">' + head('Start a new career', 'Pick your name, a difficulty and the club you want to manage.') +
        '<div class="grid cols-2" style="margin-bottom:16px">' +
        card('Manager', '<div class="field"><span>Your name</span><input class="input" id="new-name" maxlength="28" value="' + esc(n.name) + '"></div>') +
        card('Difficulty', seg('newDiff', [['easy', 'Easy', 'More money, a patient board, a stronger team'], ['normal', 'Normal'], ['hard', 'Hard', 'Tight budgets and an impatient board']], n.diff) +
          '<div class="small muted" style="margin-top:8px">' + ({ easy: 'Bigger budget, the board never sacks you and your team plays above itself.', normal: 'The intended balance — your team gets a slight edge from good management.', hard: 'Less money, a demanding board and no favours.' })[n.diff] + '</div>') +
        '</div>' +
        card('Nation', '<div class="nation-grid">' + nats.map(c => '<div class="nation-card' + (c === n.nation ? ' on' : '') + '" data-act="newNation" data-v="' + c + '">' + UI.flag(c) +
          '<div><div class="bold">' + esc(D.NATION_RULES[c].name) + '</div><div class="small muted">' + P.divisions.filter(d => d.nation === c).map(d => d.name).join(', ') + '</div></div></div>').join('') + '</div>') +
        '<div style="height:16px"></div>' +
        card('Club', (divs.length > 1 ? '<div style="margin-bottom:12px">' + seg('newDiv', divs.map(i => [i, P.divisions[i].name]), n.division) + '</div>' : '') +
          '<div class="small muted" style="margin-bottom:10px">' + (n.nation === 'ENG' && n.division === 3 ? 'The classic SIMSOC challenge: start in the Conference and climb the pyramid.' : 'Stars show the job\'s prestige — bigger clubs expect more.') + '</div>' +
          '<div class="club-cards">' + clubs + '</div>') +
        '<div class="row" style="margin:18px 0 40px"><button class="btn ghost" data-go="title">← Back</button><div class="spacer"></div>' +
        (chosen ? '<span class="muted">You will manage <b class="me">' + esc(chosen.name) + '</b></span>' : '<span class="muted">Choose a club to continue</span>') +
        '<button class="btn go lg" data-act="newStart" data-primary="1"' + (chosen ? '' : ' disabled') + '>Start career ▸</button></div></div>';
    },
    after() { const i = $('#new-name'); if (i) i.oninput = () => { UI.newCfg.name = i.value; }; }
  });
  UI.acts.newDiff = el => { UI.newCfg.diff = el.dataset.v; UI.refresh(); };
  UI.acts.newNation = el => { UI.newCfg.nation = el.dataset.v; UI.newCfg.division = -1; UI.newCfg.club = null; UI.refresh(); };
  UI.acts.newDiv = el => { UI.newCfg.division = +el.dataset.v; UI.newCfg.club = null; UI.refresh(); };
  UI.acts.newClub = el => { UI.newCfg.club = +el.dataset.ci; UI.refresh(); };
  UI.acts.newStart = () => {
    const n = UI.newCfg; if (n.club == null) return;
    const name = (n.name || '').trim() || 'The Gaffer';
    UI.startCareer(UI.newSeed || 12345, n.club, { difficulty: n.diff, managerName: name });
    UI.preview = null; UI._prevPrestige = null;
    UI.toast('You are the new manager of ' + E.user(UI.S).name + '. Good luck, ' + name + '!', 'good', 6000);
    UI.go('home');
  };

  /* ================================================================ *
   * HOME
   * ================================================================ */
  UI.page('home', {
    render() {
      const s = S(), c = E.user(s), dv = E.userDiv(s), ui = s.userClub;
      const nf = nextFixture();
      let next = '<div class="empty">No more fixtures this season — press Continue.</div>';
      if (nf) {
        const oc = s.clubs[nf.opp], d = oc.division >= 0 ? s.divisions[oc.division] : null;
        const home = nf.home ? ui : nf.opp, away = nf.home ? nf.opp : ui;
        const side = ci => '<div class="side">' + UI.crest(s.clubs[ci], 'lg') + '<div class="nm">' + UI.clubLink(ci, { crest: false }) + '</div>' +
          UI.form(E.clubForm(s, ci)) + (s.clubs[ci].division >= 0 ? '<div class="small muted">' + ordinalIn(ci) + '</div>' : '<div class="small muted">' + UI.flag(s.clubs[ci].nation) + ' ' + esc(UI.nationName(s.clubs[ci].nation)) + '</div>') + '</div>';
        next = '<div class="versus">' + side(home) + '<div class="mid"><b>VS</b>' + esc(E.formatDate(nf.date)) + '</div>' + side(away) + '</div>' +
          '<div class="row" style="margin-top:14px;justify-content:center">' + UI.compTag(nf.comp, nf.compName) + '<span class="muted small">' + (nf.home ? 'Home' : 'Away') + (d ? ' · ' + esc(d.name) : '') + '</span></div>' +
          '<div class="row" style="margin-top:14px;justify-content:center"><button class="btn go" data-act="advance">' + (nf.ready ? 'Go to match day ▸' : 'Continue to match day ▸') + '</button>' +
          '<button class="btn" data-go="tactics">Tactics</button></div>';
      }
      const lr = s.lastResult;
      const last = lr ? '<div class="res" style="font-size:15px"><div class="h">' + UI.clubByName(lr.homeName) + '</div><div class="sc">' + lr.hg + ' - ' + lr.ag + '</div><div class="a">' + UI.clubByName(lr.awayName) + '</div>' +
        (lr.agg || lr.winnerName ? '<div class="note">' + (lr.agg ? 'agg ' + esc(lr.agg) + ' · ' : '') + (lr.winnerName ? UI.meName(lr.winnerName) + ' through' + (lr.pens ? ' on penalties' : '') : '') + '</div>' : '') + '</div>' +
        '<div class="small muted" style="margin-top:8px">' + esc(lr.comp) + (lr.scorers.length ? ' · ' + lr.scorers.map(x => esc(x.name.split(' ').slice(-1)[0]) + ' ' + x.minute + "'").join(', ') : '') + '</div>' : '<div class="muted">No matches played yet this season.</div>';
      // mini table around the user
      const st = E.standings(s), zones = E.tableZones(s, s.userDivision), me = st.findIndex(r => r.idx === ui);
      const lo = Math.max(0, Math.min(me - 3, st.length - 7)), rows = st.slice(lo, lo + 7);
      const mini = '<div class="tbl-wrap"><table class="tbl compact mini"><thead><tr><th></th><th>#</th><th>Club</th><th class="num">P</th><th class="num">GD</th><th class="num">Pts</th></tr></thead><tbody>' +
        rows.map(r => { const pos = st.indexOf(r) + 1; return '<tr class="' + (r.idx === ui ? 'mine' : '') + '"><td class="zone ' + (zones[pos] || '') + '"></td><td>' + pos + '</td><td>' + UI.clubLink(r.idx, { short: true }) +
          '</td><td class="num">' + r.P + '</td><td class="num">' + (r.GD > 0 ? '+' : '') + r.GD + '</td><td class="num bold">' + r.Pts + '</td></tr>'; }).join('') + '</tbody></table></div>';
      const posChart = UI.lineChart(s.posHistory.map(h => ({ x: h.md, y: h.pos, label: 'Matchday ' + h.md + ': ' + UI.ordinal(h.pos) })),
        { invert: true, yMin: 1, yMax: dv.members.length, width: 340, height: 170, xLabel: 'League position by matchday', title: 'League position' });
      // inbox preview
      const msgs = s.inbox.slice(0, 5).map(m => '<div class="msg' + (m.read ? '' : ' unread') + '" data-go="inbox/' + m.id + '"><span class="dot"></span><span class="subj">' + esc(m.subject) +
        '</span><span class="meta"><span>' + esc(m.from) + '</span><span>' + esc(E.formatDate(m.date, false)) + '</span></span></div>').join('') || '<div class="muted">No messages.</div>';
      // squad alerts
      const inj = c.players.filter(p => p.injuredFor > 0), ban = c.players.filter(p => p.suspendedFor > 0), tired = c.players.filter(p => p.fit < 65 && !(p.injuredFor > 0));
      const exp = c.players.filter(p => (p.contract || 0) <= 1);
      const alert = (lab, list, fn) => list.length ? '<div style="margin-bottom:8px"><div class="small muted">' + lab + '</div>' + list.slice(0, 6).map(p => '<div class="row" style="gap:6px;margin-top:3px">' + UI.pos(p.pos) + UI.playerLink(p, { flag: false }) + '<span class="spacer"></span>' + fn(p) + '</div>').join('') + '</div>' : '';
      const alerts = (alert('Injured', inj, p => '<span class="tag inj">' + p.injuredFor + ' match' + (p.injuredFor > 1 ? 'es' : '') + '</span>') +
        alert('Suspended', ban, p => '<span class="tag ban">' + p.suspendedFor + '</span>') + alert('Low fitness', tired, p => UI.fitBar(p.fit)) +
        alert('Contract expiring', exp, p => '<button class="btn sm" data-act="renew" data-id="' + p.id + '">Renew</button>')) || '<div class="muted">Everyone is fit and available.</div>';
      const obj = s.board.objective || {};
      const fin = E.financeSummary(s);
      const newsHtml = s.news.slice(0, 8).map(n => '<div class="news-item"><span class="when">' + esc(E.formatDate(n.date, false).split(' ').slice(1).join(' ')) + '</span><span>' + linkify(n.text) + '</span></div>').join('') || '<div class="muted">Quiet so far.</div>';
      const rec = s.seasonRecord;
      return head('Welcome back, ' + esc(s.manager.name), esc(c.name) + ' · ' + esc(dv.name) + ' · Season ' + E.seasonLabel(s),
        '<div class="row"><button class="btn" data-go="squad">' + UI.icon('squad') + ' Squad</button><button class="btn" data-go="transfers">' + UI.icon('transfers') + ' Transfers</button></div>') +
        '<div class="home-grid">' +
        '<div class="stack">' + card('Next match', next) + card('Last result', last, { more: s.roundup && s.roundup.length ? ['Round-up', 'roundup'] : null }) +
          card('Around the world', newsHtml) + '</div>' +
        '<div class="stack">' + card(esc(dv.name), mini + '<div class="row small muted" style="margin-top:10px"><span>Record ' + rec.W + '-' + rec.D + '-' + rec.L + '</span><span class="spacer"></span>' + UI.form(E.clubForm(s, ui)) + '</div>', { more: ['Full table', 'league/' + s.userDivision] }) +
          card('Season so far', posChart) + card('Squad status', alerts, { more: ['Squad', 'squad'] }) + '</div>' +
        '<div class="stack">' + card('Inbox', '<div class="list" style="margin:-6px -16px">' + msgs + '</div>', { more: ['Open inbox', 'inbox'] }) +
          card('The board', '<div class="small muted">Objective</div><div class="bold" style="margin:2px 0 10px">' + esc(obj.label || '—') + '</div>' +
            '<div class="row small"><span class="muted">Confidence</span><span class="spacer"></span><b>' + Math.round(s.board.confidence) + '%</b></div>' + meter(s.board.confidence, confColor(s.board.confidence)) +
            '<div class="row small" style="margin-top:10px"><span class="muted">Reputation</span><span class="spacer"></span>' + UI.stars(s.reputation) + '</div>', { more: ['Board', 'board'] }) +
          card('Finances', '<div class="row"><div><div class="small muted">Balance</div><div class="bold" style="font-size:20px">' + ms(fin.balance) + '</div></div><div class="spacer"></div>' +
            '<div class="num"><div class="small muted">Wages / week</div><div class="bold">' + ms(fin.wageBill) + '</div></div></div>' +
            (fin.debt ? '<div class="small bad" style="margin-top:6px">Loan outstanding: ' + money(fin.debt) + '</div>' : ''), { more: ['Finances', 'finances'] }) + '</div>' +
        '</div>';
    }
  });
  function ordinalIn(ci) { const s = S(), c = s.clubs[ci]; return UI.ordinal(E.leaguePosition(s, c.name, c.division)) + ' in ' + esc(s.divisions[c.division].name); }
  // turn club names inside a news line into links
  function linkify(text) {
    const s = S();
    let out = esc(text);
    const names = s.clubs.map((c, i) => [c.name, i]).filter(x => text.indexOf(x[0]) >= 0).sort((a, b) => b[0].length - a[0].length);
    const used = [];
    names.forEach(([nm, i]) => {
      if (used.some(u => u.indexOf(nm) >= 0)) return;
      used.push(nm);
      out = out.split(esc(nm)).join('<a class="' + (i === s.userClub ? 'me' : 'bold') + '" data-go="club/' + i + '">' + esc(nm) + '</a>');
    });
    return out;
  }
  UI.linkify = linkify;
  UI.acts.advance = () => UI.advance();

  /* ================================================================ *
   * INBOX
   * ================================================================ */
  const CATS = [['all', 'All'], ['board', 'Board'], ['transfer', 'Transfers'], ['competition', 'Competitions'], ['medical', 'Medical'], ['assistant', 'Staff']];
  UI.page('inbox', {
    render(args) {
      const s = S(), cat = UI.inboxCat || 'all';
      const list = s.inbox.filter(m => cat === 'all' || m.cat === cat || (cat === 'assistant' && (m.cat === 'scout' || m.cat === 'assistant')));
      let id = args[0] ? +args[0] : (list[0] && list[0].id);
      const m = s.inbox.find(x => x.id === id);
      if (m && !m.read) E.markRead(s, m.id);
      const items = list.map(x => '<div class="msg' + (x.read ? '' : ' unread') + (m && x.id === m.id ? ' sel' : '') + '" data-go="inbox/' + x.id + '"><span class="dot"></span><span class="subj">' + esc(x.subject) + '</span>' +
        '<span class="meta"><span>' + esc(x.from) + '</span><span>' + esc(E.formatDate(x.date, false)) + '</span>' + (x.actions && !x.resolved && x.actions.some(a => a.cmd !== 'go') ? '<span class="tag exp">Action</span>' : '') + '</span></div>').join('') ||
        '<div class="empty" style="margin:14px">No messages here.</div>';
      const detail = m ? '<div class="small muted">' + esc(m.from) + ' · ' + esc(E.formatDate(m.date)) + '</div><h2 style="margin:6px 0 16px;font-size:20px">' + esc(m.subject) + '</h2>' +
        '<div class="msg-body">' + linkify(m.body) + '</div>' +
        (m.actions ? '<div class="msg-actions">' + m.actions.map((a, i) => '<button class="btn ' + (a.cmd === 'go' ? '' : i === 0 ? 'primary' : '') + '" data-act="inboxAct" data-msg="' + m.id + '" data-idx="' + i + '"' +
          (m.resolved && a.cmd !== 'go' ? ' disabled' : '') + '>' + esc(a.label) + '</button>').join('') + '</div>' : '') +
        (m.resolved ? '<div class="resolved">✓ ' + esc(m.resolved) + '</div>' : '') : '<div class="empty">Select a message.</div>';
      return head('Inbox', E.unreadCount(s) + ' unread', '<button class="btn sm" data-act="readAll">Mark all read</button>') +
        '<div class="chips" style="margin-bottom:12px">' + CATS.map(c => '<span class="chip' + (c[0] === cat ? ' on' : '') + '" data-act="inboxCat" data-v="' + c[0] + '">' + c[1] + '</span>').join('') + '</div>' +
        '<div class="inbox"><div class="card flush list">' + items + '</div><div class="card" style="overflow-y:auto">' + detail + '</div></div>';
    }
  });
  UI.acts.inboxCat = el => { UI.inboxCat = el.dataset.v; UI.go('inbox'); };
  UI.acts.readAll = () => { S().inbox.forEach(m => { m.read = true; }); UI.save(); UI.refresh(); };
  UI.acts.inboxAct = el => {
    const r = E.inboxAction(S(), +el.dataset.msg, +el.dataset.idx);
    if (r.msg) UI.toast(r.msg, r.ok ? 'good' : 'bad');
    UI.flushNotices(); UI.applyClubTheme(); UI.save();
    if (r.route) UI.go(r.route); else UI.refresh();
  };

  /* ================================================================ *
   * SQUAD
   * ================================================================ */
  UI.page('squad', {
    render() {
      const s = S(), c = E.user(s), f = UI.squadFilter || 'all';
      if (f === 'ex') {
        const ex = s.exPlayers.slice().reverse();
        return head('Squad', 'Former players') + filterChips(f) + card('', UI.table('ex', [
          { key: 'pos', label: 'Pos', html: r => UI.pos(r.pos) }, { key: 'name', label: 'Name', sort: r => r.surname, html: r => UI.flag(r.nat) + ' ' + esc(r.forename + ' ' + r.surname) },
          { key: 'age', label: 'Age', num: 1 }, { key: 'skill', label: 'Skill', num: 1 }, { key: 'appsTotal', label: 'Apps', num: 1 }, { key: 'goalsTotal', label: 'Goals', num: 1 },
          { key: 'season', label: 'Season', num: 1, html: r => esc(E.seasonLabel(s, r.season)) }, { key: 'reason', label: 'Left', html: r => '<span class="muted">' + esc(r.reason) + '</span>' }
        ], ex.map(x => Object.assign({ name: x.surname }, x)), { empty: 'No former players yet.' }), { cls: 'flush' });
      }
      const list = c.players.filter(p => f === 'all' || p.pos === f).map(p => Object.assign({ avg: UI.avgRating(p) || 0 }, p, { _p: p }));
      const order = { G: 0, D: 1, M: 2, A: 3 };
      const totalValue = c.players.reduce((a, p) => a + p.value, 0), avgAge = c.players.reduce((a, p) => a + p.age, 0) / c.players.length;
      const st = UI.tables.squad || (UI.tables.squad = { key: 'pos', dir: 1 });
      const table = UI.table('squad', [
        { key: 'pos', label: 'Pos', sort: r => order[r.pos] * 100 - r.skill / 100, html: r => UI.pos(r.pos) },
        { key: 'surname', label: 'Name', html: r => UI.playerLink(r._p) + ' ' + UI.tagsFor(r._p) },
        { key: 'age', label: 'Age', num: 1 },
        { key: 'skill', label: 'Skill', html: r => UI.skillBar(r.skill), title: 'Current ability (20-99)' },
        { key: 'pot', label: 'Potential', html: r => UI.potStars(r) },
        { key: 'fit', label: 'Fitness', html: r => UI.fitBar(r.fit) },
        { key: 'avg', label: 'Avg Rtg', num: 1, html: r => UI.rating(r.avg || null) },
        { key: 'appsSeason', label: 'Apps', num: 1 }, { key: 'goalsSeason', label: 'Gls', num: 1 }, { key: 'assistsSeason', label: 'Ast', num: 1 },
        { key: 'value', label: 'Value', num: 1, html: r => ms(r.value) }, { key: 'wage', label: 'Wage/wk', num: 1, html: r => ms(r.wage) },
        { key: 'contract', label: 'Contract', num: 1, html: r => (r.contract <= 1 ? '<span class="warn">' + r.contract + ' yr</span>' : r.contract + ' yrs') }
      ], list, { rowAttrs: r => 'class="click" data-go="player/' + r.id + '"' });
      return head('Squad', esc(c.name) + ' · ' + c.players.length + ' / ' + E.MAX_SQUAD + ' players',
        '<div class="row"><button class="btn" data-go="tactics">' + UI.icon('tactics') + ' Tactics</button><button class="btn" data-go="transfers">' + UI.icon('transfers') + ' Transfer market</button></div>') +
        '<div class="kpis" style="margin-bottom:16px">' + kpi('Squad size', c.players.length + ' / ' + E.MAX_SQUAD, c.players.length >= E.MAX_SQUAD ? 'Full — sell before you buy' : (E.MAX_SQUAD - c.players.length) + ' places free') +
        kpi('Average age', avgAge.toFixed(1)) + kpi('Squad value', ms(totalValue)) + kpi('Wage bill', ms(E.wageBill(s)) + '<span class="small muted"> /wk</span>') +
        kpi('Unavailable', c.players.filter(p => !E.isFit(p)).length, 'injured or suspended') + '</div>' + filterChips(f) + card('', table, { cls: 'flush' });
    }
  });
  function filterChips(f) {
    return '<div class="chips" style="margin-bottom:12px">' + [['all', 'All'], ['G', 'Goalkeepers'], ['D', 'Defenders'], ['M', 'Midfielders'], ['A', 'Attackers'], ['ex', 'Ex-players']]
      .map(c => '<span class="chip' + (c[0] === f ? ' on' : '') + '" data-act="squadFilter" data-v="' + c[0] + '">' + c[1] + '</span>').join('') + '</div>';
  }
  UI.acts.squadFilter = el => { UI.squadFilter = el.dataset.v; UI.refresh(); };

  /* ================================================================ *
   * PLAYER PROFILE
   * ================================================================ */
  UI.page('player', {
    render(args) {
      const s = S(), v = E.playerView(s, +args[0]);
      if (!v) return head('Player not found') + '<div class="empty">This player has left the game world.</div>';
      if (v.ex) return head(esc(v.ex.forename + ' ' + v.ex.surname), 'Former player') + card('', '<p>' + esc(v.ex.reason) + ' (' + E.seasonLabel(s, v.ex.season) + ').</p><p class="muted">' +
        v.ex.appsTotal + ' appearances, ' + v.ex.goalsTotal + ' goals for the club.</p>');
      const p = v.p, avg = v.avgRating;
      const attr = '<div class="attrs">' + v.attrs.map(a => '<div class="attr"><span>' + esc(a.name) + '</span><b class="av' + (a.value <= 5 ? 1 : a.value <= 10 ? 2 : a.value <= 15 ? 3 : 4) + '">' + a.value + '</b></div>').join('') + '</div>';
      const club = v.clubIndex >= 0 ? UI.clubLink(v.clubIndex) : '<span class="muted">Free agent</span>';
      const formRow = (p.form || []).length ? (p.form || []).map(r => UI.rating(r)).join(' ') : '<span class="muted">No matches yet</span>';
      let actions = '';
      if (v.mine) {
        actions = '<div class="stack"><button class="btn danger" data-act="sellPlayer" data-id="' + p.id + '">Sell now for ' + ms(Math.round(p.value * 0.95)) + '</button>' +
          '<button class="btn" data-act="toggleList" data-id="' + p.id + '">' + (p.transferListed ? 'Remove from transfer list' : 'Add to transfer list') + '</button>' +
          '<button class="btn" data-act="renew" data-id="' + p.id + '">Offer new contract (' + ms(v.renewal.wage) + '/wk, ' + v.renewal.years + ' yrs)</button>' +
          '<button class="btn ghost" data-act="release" data-id="' + p.id + '">Release (pay up the contract)</button></div>' +
          (v.offers.length ? '<div style="margin-top:14px">' + v.offers.map(o => '<div class="row small"><span>' + UI.clubLink(o.club) + ' bid <b>' + ms(o.amount) + '</b></span><span class="spacer"></span>' +
            '<button class="btn sm go" data-act="acceptOffer" data-id="' + o.id + '">Accept</button></div>').join('') + '</div>' : '');
      } else {
        const fund = E.user(s).balance;
        actions = '<div class="stack"><div class="row"><span class="muted">Asking price</span><span class="spacer"></span><b style="font-size:18px">' + ms(v.askingPrice) + '</b></div>' +
          '<button class="btn go" data-act="bid" data-id="' + p.id + '"' + (fund < v.askingPrice ? ' disabled title="Not enough funds"' : '') + '>Sign for ' + ms(v.askingPrice) + '</button>' +
          '<button class="btn" data-act="shortlist" data-id="' + p.id + '">' + (v.shortlisted ? '★ On your shortlist' : '☆ Add to shortlist') + '</button>' +
          '<div class="small muted">Funds available: ' + ms(fund) + ' · Squad ' + E.user(s).players.length + '/' + E.MAX_SQUAD + '</div></div>';
      }
      const statRow = (k, val) => '<div class="row small" style="padding:5px 0;border-bottom:1px solid rgba(38,53,83,.55)"><span class="muted">' + k + '</span><span class="spacer"></span><b>' + val + '</b></div>';
      return '<div class="page-head"><div class="row nowrap grow" style="gap:16px">' + (v.clubIndex >= 0 ? UI.crest(s.clubs[v.clubIndex], 'xl') : '') +
        '<div style="min-width:0"><h1>' + UI.flag(p.nat) + ' ' + esc(p.forename + ' ' + p.surname) + '</h1><div class="sub row" style="gap:8px;margin-top:6px">' + UI.pos(p.pos) +
        '<span>' + esc(D.POS_NAME[p.pos]) + '</span><span>· ' + p.age + ' years old</span><span>· ' + esc(D.NATIONS[p.nat] || p.nat) + '</span><span>· ' + club + '</span> ' + UI.tagsFor(p) + '</div></div></div>' +
        '<button class="btn ghost" onclick="history.back()">← Back</button></div>' +
        '<div class="kpis" style="margin-bottom:16px">' + kpi('Ability', p.skill + '<span class="small muted"> / 99</span>', UI.potStars(p) + ' potential') + kpi('Value', ms(p.value)) +
        kpi('Wage', ms(p.wage) + '<span class="small muted"> /wk</span>', p.contract ? p.contract + ' yr contract' : 'No contract') + kpi('Fitness', Math.round(p.fit) + '%', UI.fitBar(p.fit)) +
        kpi('Avg rating', avg ? avg.toFixed(2) : '–', (p.rN || 0) + ' rated games') + '</div>' +
        '<div class="grid cols-3">' + card('Attributes', attr, { cls: 'span-2' }) + card(v.mine ? 'Manage' : 'Transfer', actions) +
        card('This season', statRow('Appearances', p.appsSeason) + statRow('Goals (all comps)', p.goalsSeason) + statRow('League goals', p.lgGoals || 0) + statRow('Assists', p.assistsSeason || 0) +
          statRow('Player of the match', p.potm || 0) + statRow('Yellow cards (toward ban)', p.yellows || 0) + '<div style="margin-top:10px" class="small muted">Last 5 ratings</div><div style="margin-top:6px">' + formRow + '</div>') +
        card('Career', statRow('Appearances', p.appsTotal) + statRow('Goals', p.goalsTotal) + statRow('Assists', p.assistsTotal || 0) + statRow('Retires around', p.retireAge)) +
        card('Development', '<div class="small muted">Current ability</div>' + UI.skillBar(p.skill) + '<div class="small muted" style="margin-top:10px">Potential ability</div>' + UI.skillBar(p.pot) +
          '<p class="small muted" style="margin-top:12px">Abilities are re-rolled each summer: youngsters tend to grow toward their potential, veterans fade — with plenty of surprises.</p>') + '</div>';
    }
  });
  UI.acts.sellPlayer = el => {
    const s = S(), p = E.user(s).players.find(x => x.id === +el.dataset.id); if (!p) return;
    UI.confirm('Sell ' + p.forename + ' ' + p.surname + '?', 'He leaves immediately and ' + money(Math.round(p.value * 0.95)) + ' goes into the bank.', 'Sell now', true).then(ok => {
      if (!ok) return;
      const r = E.sellPlayer(s, p.id);
      UI.toast(r.ok ? 'Sold ' + p.surname + ' for ' + ms(r.fee) + '.' : r.msg, r.ok ? 'good' : 'bad');
      s.notices.length = 0; UI.save(); if (r.ok) UI.go('squad'); else UI.refresh();
    });
  };
  UI.acts.toggleList = el => { const p = E.user(S()).players.find(x => x.id === +el.dataset.id); if (p) { E.setTransferListed(S(), p.id, !p.transferListed); UI.save(); UI.refresh(); } };
  UI.acts.renew = el => {
    const s = S(), p = E.user(s).players.find(x => x.id === +el.dataset.id); if (!p) return;
    const t = E.renewalTerms(s, p);
    UI.confirm('New contract for ' + p.surname, 'He asks for <b>' + money(t.wage) + ' a week</b> (now ' + money(p.wage) + ') on a ' + t.years + '-year deal.', 'Agree terms').then(ok => {
      if (!ok) return;
      const r = E.renewContract(s, p.id); s.notices.length = 0;
      UI.toast(r.msg, r.ok ? 'good' : 'bad'); UI.save(); UI.refresh();
    });
  };
  UI.acts.release = el => {
    const s = S(), p = E.user(s).players.find(x => x.id === +el.dataset.id); if (!p) return;
    const comp = Math.round((p.wage || 0) * 12 * Math.max(0, p.contract || 0));
    UI.confirm('Release ' + p.surname + '?', 'Paying up his contract costs ' + money(comp) + '.', 'Release', true).then(ok => {
      if (!ok) return;
      const r = E.releasePlayer(s, p.id); s.notices.length = 0;
      UI.toast(r.msg, r.ok ? 'good' : 'bad'); UI.save(); if (r.ok) UI.go('squad'); else UI.refresh();
    });
  };
  UI.acts.bid = el => {
    const s = S(), id = +el.dataset.id, v = E.playerView(s, id); if (!v || v.mine) return;
    UI.confirm('Sign ' + v.p.forename + ' ' + v.p.surname + '?', 'Fee <b>' + money(v.askingPrice) + '</b>, wages about <b>' + money(D.wageFor(v.p, E.userDiv(s).level)) + '/wk</b>. ' +
      'Funds after the deal: ' + money(E.user(s).balance - v.askingPrice) + '.', 'Sign him').then(ok => {
      if (!ok) return;
      const r = E.bid(s, id); s.notices.length = 0;
      UI.toast(r.ok ? 'Signed ' + r.player.surname + ' for ' + ms(r.fee) + '!' : r.msg, r.ok ? 'good' : 'bad');
      UI.save(); UI.refresh();
    });
  };
  UI.acts.shortlist = el => { const on = E.toggleShortlist(S(), +el.dataset.id); UI.toast(on ? 'Added to your shortlist.' : 'Removed from your shortlist.'); UI.save(); UI.refresh(); };
  UI.acts.acceptOffer = el => { const r = E.acceptBid(S(), +el.dataset.id); UI.toast(r.msg, r.ok ? 'good' : 'bad'); UI.save(); if (r.ok) UI.go('squad'); else UI.refresh(); };

  /* ================================================================ *
   * TACTICS
   * ================================================================ */
  const MENT_HELP = ['Park the bus: few chances either way — the underdog\'s friend.', 'Sit deeper and stay compact.', 'A balanced approach.',
    'Push on and create more — but leave space behind.', 'All-out attack: lots of chances at both ends.'];
  UI.page('tactics', {
    render() {
      const s = S(), c = E.user(s), sel = s.selection, t = s.tactics;
      const roles = Live.FORMATIONS[sel.formation] || Live.FORMATIONS['442'];
      const lay = Live.layout(sel.formation);
      const byId = {}; c.players.forEach(p => { byId[p.id] = p; });
      const pick = UI.tacSel || null;
      let slots = '';
      lay.forEach((L, i) => {
        const id = sel.xi[i], p = id != null ? byId[id] : null;
        const oop = p && Live.suit(p.pos, L.role) < 1;
        const isSel = pick && pick.kind === 'slot' && pick.slot === i;
        slots += '<div class="slot' + (L.role === 'G' ? ' gk' : '') + (p ? '' : ' empty') + (oop ? ' oop' : '') + (isSel ? ' sel' : '') + '" style="left:' + (L.y * 100) + '%;top:' + ((1 - L.x) * 92 + 2) + '%" data-act="tacPick" data-kind="slot" data-slot="' + i + '"' +
          (oop ? ' title="Out of position: a ' + D.POS_NAME[p.pos] + ' playing as ' + D.POS_NAME[L.role] + '"' : '') + '>' +
          '<span class="role">' + L.role + '</span><span class="shirt">' + (p ? p.skill : '+') + '</span>' +
          '<span class="label">' + (p ? esc(p.surname) : 'Empty') + '</span>' + (p ? '<span class="fitline"><span style="width:' + p.fit + '%;background:' + (p.fit < 60 ? 'var(--bad)' : p.fit < 80 ? 'var(--warn)' : 'var(--good)') + '"></span></span>' : '') + '</div>';
      });
      const lines = '<svg class="lines" viewBox="0 0 68 92" preserveAspectRatio="none"><g fill="none" stroke="rgba(255,255,255,.55)" stroke-width=".35">' +
        '<rect x="1" y="1" width="66" height="90"/><line x1="1" y1="46" x2="67" y2="46"/><circle cx="34" cy="46" r="8"/>' +
        '<rect x="14" y="1" width="40" height="15"/><rect x="24" y="1" width="20" height="5"/><rect x="14" y="76" width="40" height="15"/><rect x="24" y="86" width="20" height="5"/></g></svg>';
      const inXI = new Set(sel.xi.filter(x => x != null)), onBench = new Set(sel.subs);
      const prow = (p, kind) => {
        const na = !E.isFit(p);
        const isSel = pick && pick.kind === kind && pick.id === p.id;
        return '<div class="prow' + (na ? ' na' : '') + (isSel ? ' sel' : '') + '" data-act="tacPick" data-kind="' + kind + '" data-id="' + p.id + '">' + UI.pos(p.pos) +
          '<span class="ellip">' + esc(p.forename.charAt(0) + '. ' + p.surname) + ' ' + UI.tagsFor(p) + '</span><b class="num">' + p.skill + '</b>' + UI.fitBar(p.fit) + '<span class="small muted num">' + p.age + '</span></div>';
      };
      const bench = sel.subs.map(id => byId[id]).filter(Boolean).map(p => prow(p, 'bench')).join('') || '<div class="muted small">No substitutes picked.</div>';
      const order = { G: 0, D: 1, M: 2, A: 3 };
      const reserves = c.players.filter(p => !inXI.has(p.id) && !onBench.has(p.id)).sort((a, b) => (E.isFit(b) - E.isFit(a)) || order[a.pos] - order[b.pos] || b.skill - a.skill).map(p => prow(p, 'res')).join('') || '<div class="muted small">Nobody left.</div>';
      // ratings vs next opponent
      const nf = nextFixture(), ur = E.userRatings(s);
      let vs = '';
      if (nf) {
        const or = E.clubRatings(s.clubs[nf.opp], E.moraleOf(s, s.clubs[nf.opp]));
        const rowR = (lab, a, b) => '<span class="muted">' + lab + '</span><div class="prob"><span style="width:' + (a / (a + b) * 100) + '%;background:var(--club)"></span><span style="width:' + (b / (a + b) * 100) + '%;background:#55607a"></span></div><span class="small">' + a + ':' + b + '</span>';
        vs = '<div class="small muted" style="margin-bottom:8px">You vs ' + UI.clubLink(nf.opp) + '</div><div class="ratings-mini">' + rowR('Defence', ur.defence, or.defence) + rowR('Midfield', ur.midfield, or.midfield) +
          rowR('Attack', ur.attack, or.attack) + rowR('Morale', ur.morale, or.morale) + '</div>';
      }
      const valid = sel.xi.filter(x => x != null && byId[x]).length;
      return head('Tactics', 'Formation, mentality and the team for ' + (nf ? 'the game against ' + esc(s.clubs[nf.opp].name) : 'the next match'),
        '<div class="row">' + (valid === 11 ? '<span class="badge green">11 picked</span>' : '<span class="badge red">' + valid + '/11 picked</span>') +
        (nf && nf.ready ? '<button class="btn go" data-go="match">Match day ▸</button>' : '') + '</div>') +
        '<div class="tactics"><div class="stack">' + card('', '<div class="pitch-board">' + lines + slots + '</div>' +
          '<div class="small muted" style="margin-top:10px">Click a player, then another player or a position, to swap them. Amber rings mark players out of position.</div>') + '</div>' +
        '<div class="stack">' +
          card('Formation', seg('tacFormation', Object.keys(Live.FORMATIONS).map(f => [f, Live.FORMATION_NAMES[f]]), sel.formation)) +
          card('Team instructions', '<div class="field"><span>Mentality</span>' + seg('tacMent', [[-2, 'V. Def'], [-1, 'Defensive'], [0, 'Balanced'], [1, 'Attacking'], [2, 'V. Att']], t.mentality) +
            '<span class="small muted">' + MENT_HELP[t.mentality + 2] + '</span></div>' +
            '<div class="row" style="margin-top:12px;align-items:flex-start"><div class="field"><span>Pressing</span>' + seg('tacPress', [[0, 'Low'], [1, 'Medium'], [2, 'High']], t.pressing) + '</div>' +
            '<div class="field"><span>Tempo</span>' + seg('tacTempo', [[0, 'Patient'], [1, 'Normal'], [2, 'Direct']], t.tempo) + '</div></div>' +
            '<div class="small muted" style="margin-top:8px">High pressing wins the ball back but tires legs and costs fouls; a direct tempo makes the game more open.</div>') +
          card('Selection', '<div class="row" style="gap:8px"><button class="btn sm" data-act="tacAuto" data-v="best">Pick Best XI</button><button class="btn sm" data-act="tacAuto" data-v="fresh">Pick Fresh XI</button>' +
            '<button class="btn sm" data-act="tacAuto" data-v="mix">Best + Fresh XI</button><button class="btn sm ghost" data-act="tacClear">Clear</button></div>' +
            '<div class="stack" style="margin-top:12px;gap:8px"><label class="check"><input type="checkbox" data-act="tacAutoPick"' + (t.autoPick !== false ? ' checked' : '') + '> Assistant picks the team before every match (' +
            ({ best: 'Best XI', fresh: 'Fresh XI', mix: 'Best + Fresh' })[t.pickMode || 'best'] + ')</label>' +
            '<label class="check"><input type="checkbox" data-act="tacAutoSubs"' + (t.autoSubs !== false ? ' checked' : '') + '> Assistant makes the substitutions during matches</label></div>') +
          (vs ? card('Team ratings', vs) : '') +
          card('Substitutes (' + sel.subs.length + '/5)', '<div class="plist">' + bench + '</div>') +
          card('Reserves', '<div class="plist" style="max-height:340px;overflow-y:auto">' + reserves + '</div>') +
        '</div></div>';
    }
  });
  function manual() { const t = S().tactics; if (t.autoPick !== false) { t.autoPick = false; UI.toast('Your team, your choice: the assistant will keep your line-up (fixing only injuries and bans).'); } }
  UI.acts.tacFormation = el => { const s = S(); s.selection.formation = el.dataset.v; if (s.tactics.autoPick !== false) { const b = E.bestXI(E.user(s), { formation: el.dataset.v, mode: s.tactics.pickMode }); s.selection.xi = b.xi; s.selection.subs = b.subs; } UI.save(); UI.refresh(); };
  UI.acts.tacMent = el => { S().tactics.mentality = +el.dataset.v; UI.save(); UI.refresh(); };
  UI.acts.tacPress = el => { S().tactics.pressing = +el.dataset.v; UI.save(); UI.refresh(); };
  UI.acts.tacTempo = el => { S().tactics.tempo = +el.dataset.v; UI.save(); UI.refresh(); };
  UI.acts.tacAuto = el => {
    const s = S(), b = E.bestXI(E.user(s), { formation: s.selection.formation, mode: el.dataset.v });
    s.selection.xi = b.xi; s.selection.subs = b.subs; s.tactics.pickMode = el.dataset.v; UI.tacSel = null; UI.save(); UI.refresh();
  };
  UI.acts.tacClear = () => { const s = S(); s.selection.xi = new Array(11).fill(null); s.selection.subs = []; manual(); UI.tacSel = null; UI.save(); UI.refresh(); };
  UI.acts.tacAutoPick = el => { S().tactics.autoPick = el.checked; UI.save(); };
  UI.acts.tacAutoSubs = el => { S().tactics.autoSubs = el.checked; UI.save(); };
  UI.acts.tacPick = el => {
    const s = S(), sel = s.selection, k = el.dataset.kind;
    const cur = k === 'slot' ? { kind: 'slot', slot: +el.dataset.slot, id: sel.xi[+el.dataset.slot] } : { kind: k, id: +el.dataset.id };
    const p = cur.id != null ? E.user(s).players.find(x => x.id === cur.id) : null;
    if (k !== 'slot' && p && !E.isFit(p)) { UI.toast(p.surname + ' is unavailable.', 'bad'); return; }
    const prev = UI.tacSel;
    if (!prev) { UI.tacSel = cur; UI.refresh(); return; }
    if (prev.kind === cur.kind && (prev.kind === 'slot' ? prev.slot === cur.slot : prev.id === cur.id)) { UI.tacSel = null; UI.refresh(); return; }
    swap(sel, prev, cur);
    manual(); UI.tacSel = null; UI.save(); UI.refresh();
  };
  function swap(sel, a, b) {
    while (sel.xi.length < 11) sel.xi.push(null);
    const get = x => (x.kind === 'slot' ? sel.xi[x.slot] : x.id);
    const put = (x, id) => {
      if (x.kind === 'slot') sel.xi[x.slot] = id;
      else if (x.kind === 'bench') { const i = sel.subs.indexOf(x.id); if (id == null) sel.subs.splice(i, 1); else sel.subs[i] = id; }
      // reserves have no position: whoever is displaced simply drops to the reserves
    };
    const ia = get(a), ib = get(b);
    if (a.kind === 'res' && b.kind === 'res') return;
    if (a.kind === 'res' || b.kind === 'res') {
      const res = a.kind === 'res' ? a : b, other = a.kind === 'res' ? b : a;
      if (other.kind === 'bench' && other.id == null) return;
      put(other, res.id);
      return;
    }
    if (a.kind === 'bench' && b.kind === 'bench') return;
    put(a, ib); put(b, ia);
    sel.subs = sel.subs.filter(x => x != null);
  }

  /* ================================================================ *
   * FIXTURES
   * ================================================================ */
  UI.page('fixtures', {
    render(args) {
      const s = S(), ci = args[0] != null ? +args[0] : s.userClub;
      const b = fixturesBody(ci);
      return head('Fixtures & Results', (ci === s.userClub ? 'All competitions' : esc(s.clubs[ci].name)) + ' · Season ' + E.seasonLabel(s) + ' · ' + b.summary) + b.html;
    }
  });
  function fixturesBody(ci) {
      const s = S(), f = UI.fxFilter || 'all';
      const list = E.clubFixtures(s, ci).filter(x => f === 'all' || (f === 'league' ? x.comp === 'league' : x.comp !== 'league'));
      const nextIdx = list.findIndex(x => !x.played);
      const rows = list.map((x, i) => '<tr class="' + (i === nextIdx ? 'sel' : '') + '"><td class="small">' + esc(E.formatDate(x.date)) + '</td><td>' + UI.compTag(x.comp, x.short) + '</td>' +
        '<td class="center">' + (x.home ? 'H' : 'A') + '</td><td>' + UI.clubLink(x.opp) + '</td><td class="num">' +
        (x.played ? UI.resultChip(x.gf, x.ga) + ' <b>' + x.gf + '-' + x.ga + '</b>' : (i === nextIdx ? '<span class="tag exp">Next</span>' : '<span class="faint">—</span>')) + '</td>' +
        '<td class="small muted ellip" style="max-width:360px">' + esc(x.note || '') + (x.scorers.length ? ' ' + esc(x.scorers.join(', ')) : '') + '</td></tr>').join('');
      const done = list.filter(x => x.played), w = done.filter(x => x.gf > x.ga).length, d = done.filter(x => x.gf === x.ga).length;
      return { summary: w + 'W ' + d + 'D ' + (done.length - w - d) + 'L',
        html: '<div class="chips" style="margin-bottom:12px">' + [['all', 'All'], ['league', 'League'], ['cups', 'Cups']].map(c => '<span class="chip' + (c[0] === f ? ' on' : '') + '" data-act="fxFilter" data-v="' + c[0] + '">' + c[1] + '</span>').join('') + '</div>' +
        card('', '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Competition</th><th class="center">H/A</th><th>Opponent</th><th class="num">Result</th><th>Notes</th></tr></thead><tbody>' + (rows || '<tr><td colspan="6" class="center muted" style="padding:18px">No fixtures.</td></tr>') + '</tbody></table></div>', { cls: 'flush' }) };
  }
  UI.acts.fxFilter = el => { UI.fxFilter = el.dataset.v; UI.refresh(); };

  /* ================================================================ *
   * COMPETITIONS HUB, LEAGUES, CUPS
   * ================================================================ */
  UI.page('competitions', {
    render() {
      const s = S(), nv = E.nationsView(s);
      const userNat = E.userDiv(s).nation;
      const cur = UI.compNation || userNat;
      const n = nv.find(x => x.code === cur) || nv[0];
      const leagues = n.divisions.map(d => {
        const dv = s.divisions[d], st = E.standings(s, d), lead = st[0], mine = dv.members.indexOf(s.userClub) >= 0;
        const played = Math.max(...st.map(r => r.P));
        return '<div class="card" style="cursor:pointer" data-go="league/' + d + '"><div class="row nowrap">' + UI.flag(dv.nation) + '<h3 style="font-size:17px">' + esc(dv.name) + '</h3><span class="spacer"></span>' +
          (mine ? '<span class="badge red">You</span>' : '') + '</div><div class="small muted" style="margin:6px 0 10px">Tier ' + dv.tier + ' · ' + dv.members.length + ' clubs · matchday ' + played + ' of ' + E.divisionRounds(s, d) + '</div>' +
          st.slice(0, 3).map((r, i) => '<div class="row small" style="margin:3px 0"><span class="muted" style="width:16px">' + (i + 1) + '</span>' + UI.clubLink(r.idx, { short: true }) + '<span class="spacer"></span><b>' + r.Pts + '</b></div>').join('') +
          (mine ? '<div class="row small" style="margin-top:6px"><span class="muted">Your position</span><span class="spacer"></span><b class="me">' + UI.ordinal(E.leaguePosition(s, E.user(s).name, d)) + '</b></div>' : '') + '</div>';
      }).join('');
      const cups = n.cups.map(id => {
        const c = s.cups[id], br = E.cupBracket(s, id), live = c.rounds[c.rounds.length - 1];
        const userIn = c.participants.indexOf(s.userClub) >= 0, alive = userIn && c.winner == null && live.ties.some(t => t.winner == null && (t.home === s.userClub || t.away === s.userClub));
        return '<div class="card" style="cursor:pointer" data-go="cup/' + id + '"><div class="row nowrap">' + UI.icon('comps').replace('<svg', '<svg width="18" height="18"') + '<h3 style="font-size:16px">' + esc(c.name) + '</h3><span class="spacer"></span>' +
          (alive ? '<span class="badge green">In it</span>' : userIn ? '<span class="badge">Out</span>' : '') + '</div><div class="small muted" style="margin-top:6px">' + c.participants.length + ' clubs · ' +
          (br.winner ? 'Winners: ' + UI.meName(br.winner) : 'Now: ' + esc(live.name)) + '</div></div>';
      }).join('');
      return head('Competitions', 'Every league and cup in the game world') +
        '<div class="chips" style="margin-bottom:16px">' + nv.map(x => '<span class="chip' + (x.code === n.code ? ' on' : '') + '" data-act="compNation" data-v="' + x.code + '">' + UI.flag(x.code) + ' ' + esc(x.name) + '</span>').join('') + '</div>' +
        (leagues ? '<div class="grid cols-3" style="margin-bottom:16px">' + leagues + '</div>' : '') + (cups ? '<h3 class="muted" style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;margin:6px 0 10px">Cups</h3><div class="grid cols-3">' + cups + '</div>' : '');
    }
  });
  UI.acts.compNation = el => { UI.compNation = el.dataset.v; UI.refresh(); };

  UI.page('league', {
    render(args) {
      const s = S(), d = args[0] != null ? +args[0] : s.userDivision, tab = args[1] || 'table', dv = s.divisions[d];
      if (!dv) return '<div class="empty">Unknown league.</div>';
      const sisters = s.divisions.map((x, i) => i).filter(i => s.divisions[i].nation === dv.nation);
      const sw = sisters.length > 1 ? '<div class="seg">' + sisters.map(i => '<button class="' + (i === d ? 'on' : '') + '" data-go="league/' + i + '/' + tab + '">' + esc(s.divisions[i].name) + '</button>').join('') + '</div>' : '';
      let body = '';
      if (tab === 'table') body = leagueTable(d);
      else if (tab === 'results') body = leagueResults(d, args[2]);
      else body = leagueStats(d);
      return head(UI.flag(dv.nation) + ' ' + esc(dv.name), esc(UI.nationName(dv.nation)) + ' · tier ' + dv.tier + ' · ' + dv.members.length + ' clubs', sw) +
        tabs([['table', 'Table'], ['results', 'Results & fixtures'], ['stats', 'Stats & scorers']], tab, 'league/' + d + '/') + body;
    }
  });
  function leagueTable(d) {
    const s = S(), st = E.standings(s, d), z = E.tableZones(s, d);
    const rows = st.map((r, i) => '<tr class="click' + (r.idx === s.userClub ? ' mine' : '') + '" data-go="club/' + r.idx + '"><td class="zone ' + (z[i + 1] || '') + '"></td><td class="num">' + (i + 1) + '</td><td>' + UI.clubLink(r.idx) + '</td>' +
      '<td class="num">' + r.P + '</td><td class="num">' + r.W + '</td><td class="num">' + r.D + '</td><td class="num">' + r.L + '</td><td class="num">' + r.F + '</td><td class="num">' + r.A + '</td>' +
      '<td class="num">' + (r.GD > 0 ? '+' : '') + r.GD + '</td><td class="num bold">' + r.Pts + '</td><td>' + UI.form(r.form) + '</td></tr>').join('');
    const used = new Set(Object.values(z));
    const legend = '<div class="legend">' + (used.has('cl') ? '<span><i style="background:#2f6bff"></i>Champions League</span>' : '') + (used.has('uefa') ? '<span><i style="background:#9b6dff"></i>UEFA Cup</span>' : '') +
      (used.has('promo') ? '<span><i style="background:var(--good)"></i>Promotion</span>' : '') + (used.has('releg') ? '<span><i style="background:var(--bad)"></i>Relegation</span>' : '') + '</div>';
    return '<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(260px,320px)">' +
      card('', '<div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th class="num">#</th><th>Club</th><th class="num">P</th><th class="num">W</th><th class="num">D</th><th class="num">L</th><th class="num">F</th><th class="num">A</th><th class="num">GD</th><th class="num">Pts</th><th>Form</th></tr></thead><tbody>' + rows + '</tbody></table></div>' + '<div style="padding:0 14px 12px">' + legend + '</div>', { cls: 'flush' }) +
      card('Top scorers — ' + esc(s.divisions[d].name), scorerList(E.leagueLeaders(s, d, 12).scorers, 'goals'), { more: ['All stats', 'league/' + d + '/stats'] }) + '</div>';
  }
  function scorerList(rows, unit) {
    if (!rows.length) return '<div class="muted small">No goals yet.</div>';
    return rows.map((r, i) => '<div class="row nowrap small" style="padding:4px 0;border-bottom:1px solid rgba(38,53,83,.5)"><span class="muted" style="width:18px">' + (i + 1) + '</span>' +
      '<div style="min-width:0;flex:1"><div class="ellip"><a class="player-link' + (UI.isMine(r.clubIdx) ? ' me' : '') + '" data-go="player/' + r.id + '">' + esc(r.name) + '</a></div><div class="tiny ellip">' + UI.clubLink(r.clubIdx, { crest: false }) + '</div></div>' +
      '<b>' + (typeof r.value === 'number' && r.value % 1 ? r.value.toFixed(2) : r.value) + '</b></div>').join('');
  }
  UI.scorerList = scorerList;
  function leagueResults(d, md) {
    const s = S(), dv = s.divisions[d], total = E.divisionRounds(s, d);
    const last = dv.results.length ? Math.max(...dv.results.map(r => r.round)) : -1;
    let r = md != null ? Math.max(0, Math.min(total - 1, +md - 1)) : Math.max(0, last);
    const rr = E.roundResults(s, d, r);
    const nav = '<div class="row" style="margin-bottom:12px"><button class="btn sm" data-go="league/' + d + '/results/' + r + '"' + (r <= 0 ? ' disabled' : '') + '>‹ Prev</button>' +
      '<b>Matchday ' + (r + 1) + ' of ' + total + '</b><button class="btn sm" data-go="league/' + d + '/results/' + (r + 2) + '"' + (r >= total - 1 ? ' disabled' : '') + '>Next ›</button></div>';
    const games = rr.games.length ? rr.games.map(g => '<div class="res"><div class="h">' + UI.clubLink(g.homeIdx) + '</div><div class="sc">' + g.hg + ' - ' + g.ag + '</div><div class="a">' + UI.clubLink(g.awayIdx) + '</div>' +
      (g.scorers.length ? '<div class="note">' + esc(g.scorers.map(x => x.n.split(' ').slice(-1)[0] + ' ' + x.m + "'").join(', ')) + '</div>' : '') + '</div>').join('')
      : rr.fixtures.map(g => '<div class="res"><div class="h">' + UI.clubLink(g.homeIdx) + '</div><div class="sc faint">v</div><div class="a">' + UI.clubLink(g.awayIdx) + '</div></div>').join('');
    return card('', nav + games);
  }
  function leagueStats(d) {
    const s = S(), L = E.leagueLeaders(s, d, 15);
    const teams = UI.table('lgteams' + d, [
      { key: 'name', label: 'Club', html: r => UI.clubLink(r.idx) }, { key: 'P', label: 'P', num: 1 }, { key: 'F', label: 'Scored', num: 1 }, { key: 'A', label: 'Conceded', num: 1 },
      { key: 'gpg', label: 'Goals/game', num: 1 }, { key: 'cpg', label: 'Conceded/game', num: 1 }, { key: 'form', label: 'Form', sort: false, html: r => UI.form(r.form) }
    ], L.teams, { compact: true, sortKey: 'F' });
    return '<div class="grid cols-4" style="margin-bottom:16px">' + card('Top scorers', scorerList(L.scorers)) + card('Assists', scorerList(L.assists)) +
      card('Best average rating', scorerList(L.ratings)) + card('Player of the match awards', scorerList(L.potm)) + '</div>' + card('Team statistics', teams, { cls: 'flush' });
  }

  UI.page('cup', {
    render(args) {
      const s = S(), id = args[0], tab = args[1] || 'bracket', br = E.cupBracket(s, id);
      if (!br) return head('Cup') + '<div class="empty">This competition has not been drawn this season.</div>';
      const c = s.cups[id];
      const status = c.participants.indexOf(s.userClub) < 0 ? 'You are not in this competition.' : (c.winner === s.userClub ? 'You won it!' :
        (c.rounds[c.rounds.length - 1].ties.some(t => t.winner == null && (t.home === s.userClub || t.away === s.userClub)) ? 'You are still in it.' : 'You have been knocked out.'));
      let body;
      if (tab === 'scorers') body = card('Top scorers — ' + esc(br.name) + ' only', scorerList(E.topScorersForCup(s, id, 30).map(x => ({ id: x.id, name: x.name, clubIdx: E.clubIndexByName(s, x.club), value: x.goals }))));
      else {
        const cols = br.rounds.map(rd => '<div class="bcol"><div class="rname">' + esc(rd.name) + '</div>' + rd.ties.map(t => {
          const hw = t.winner && t.winner === t.home, aw = t.winner && t.winner === t.away;
          return '<div class="tie"><div class="tl"><span class="' + (hw ? 'w' : t.winner ? 'l' : '') + '">' + UI.clubLink(t.homeIdx, { short: true }) + '</span></div>' +
            '<div class="tl"><span class="' + (aw ? 'w' : t.winner ? 'l' : '') + '">' + (t.awayIdx < 0 ? '(bye)' : UI.clubLink(t.awayIdx, { short: true })) + '</span></div>' +
            (t.score ? '<div class="agg">' + esc(t.score) + (t.agg ? ' · ' + esc(t.agg) : '') + (t.pens ? ' · pens' + (t.shootout ? ' ' + esc(t.shootout) : '') : '') + '</div>' : '') + '</div>';
        }).join('') + '</div>').join('');
        const remaining = [];
        for (let k = br.rounds.length; k < br.totalRounds; k++) { const n = Math.pow(2, br.totalRounds - k); remaining.push('<div class="bcol"><div class="rname">' + esc(n === 2 ? 'Final' : n === 4 ? 'Semi-finals' : n === 8 ? 'Quarter-finals' : 'Round of ' + n) + '</div><div class="empty small">To be drawn</div></div>'); }
        body = card('', '<div class="bracket">' + cols + remaining.join('') + '</div>');
      }
      return head((c.nation === 'EUR' ? UI.flag('EUR') : UI.flag(c.nation)) + ' ' + esc(br.name), esc(status) + (br.winner ? ' · Winners: ' + UI.meName(br.winner) : '') +
        (c.twoLeg ? ' · two-legged ties, single-match final' : ' · single-match ties, penalties if level')) +
        tabs([['bracket', 'Draw & results'], ['scorers', 'Top scorers']], tab, 'cup/' + id + '/') + body;
    }
  });

  /* ================================================================ *
   * CLUB PAGE
   * ================================================================ */
  UI.page('club', {
    render(args) {
      const s = S(), ci = +args[0], c = s.clubs[ci], tab = args[1] || 'overview';
      if (!c) return '<div class="empty">Unknown club.</div>';
      const dv = c.division >= 0 ? s.divisions[c.division] : null, mine = ci === s.userClub;
      const pos = dv ? E.leaguePosition(s, c.name, c.division) : null;
      let body = '';
      if (tab === 'squad') {
        body = card('', UI.table('club' + ci, [
          { key: 'pos', label: 'Pos', sort: r => ({ G: 0, D: 1, M: 2, A: 3 })[r.pos] * 100 - r.skill / 100, html: r => UI.pos(r.pos) },
          { key: 'surname', label: 'Name', html: r => UI.playerLink(r._p) + ' ' + (r.transferListed ? '<span class="tag list">Listed</span>' : '') },
          { key: 'age', label: 'Age', num: 1 }, { key: 'skill', label: 'Skill', html: r => UI.skillBar(r.skill) }, { key: 'pot', label: 'Potential', html: r => UI.potStars(r) },
          { key: 'avg', label: 'Avg Rtg', num: 1, html: r => UI.rating(r.avg || null) }, { key: 'appsSeason', label: 'Apps', num: 1 }, { key: 'goalsSeason', label: 'Gls', num: 1 },
          { key: 'value', label: 'Value', num: 1, html: r => ms(r.value) }
        ], c.players.map(p => Object.assign({ avg: UI.avgRating(p) || 0 }, p, { _p: p })), { rowAttrs: r => 'class="click" data-go="player/' + r.id + '"', sortKey: 'pos', sortDir: 1 }), { cls: 'flush' });
      } else if (tab === 'fixtures') {
        body = fixturesBody(ci).html;
      } else {
        const fx = E.clubFixtures(s, ci), upcoming = fx.filter(x => !x.played).slice(0, 4), recent = fx.filter(x => x.played).slice(-5).reverse();
        const fxRow = x => '<div class="row nowrap small" style="padding:5px 0;border-bottom:1px solid rgba(38,53,83,.5)"><span class="muted" style="width:86px">' + esc(E.formatDate(x.date, false)) + '</span>' +
          '<span style="width:18px">' + (x.home ? 'H' : 'A') + '</span>' + UI.clubLink(x.opp, { short: true }) + '<span class="spacer"></span>' + (x.played ? UI.resultChip(x.gf, x.ga) + ' <b>' + x.gf + '-' + x.ga + '</b>' : UI.compTag(x.comp, x.short)) + '</div>';
        const stars = c.players.slice().sort((a, b) => b.skill - a.skill).slice(0, 5);
        const tally = E.honoursTally(s).find(t => t.club === c.name);
        const h2h = !mine ? E.historyVs(s, c.name) : [];
        let w = 0, d2 = 0, l = 0; h2h.forEach(h => { const a = h.home ? h.hg : h.ag, b = h.home ? h.ag : h.hg; if (a > b) w++; else if (a === b) d2++; else l++; });
        body = '<div class="grid cols-3">' + card('Upcoming', upcoming.map(fxRow).join('') || '<div class="muted small">Nothing scheduled.</div>') +
          card('Recent results', recent.map(fxRow).join('') || '<div class="muted small">No results yet.</div>') +
          card('Key players', stars.map(p => '<div class="row nowrap small" style="padding:4px 0">' + UI.pos(p.pos) + UI.playerLink(p) + '<span class="spacer"></span><b>' + p.skill + '</b></div>').join('')) +
          card('Trophies (since you arrived in the game)', tally ? Object.keys(tally).filter(k => k !== 'club' && k !== 'total').map(k => '<div class="row small"><span>' + esc(k) + '</span><span class="spacer"></span><b>' + tally[k] + '</b></div>').join('') : '<div class="muted small">None yet.</div>') +
          (mine ? '' : card('Head to head with you', h2h.length ? '<div class="bold" style="margin-bottom:8px">P' + h2h.length + ' W' + w + ' D' + d2 + ' L' + l + '</div>' +
            h2h.slice(-6).reverse().map(h => '<div class="row small"><span class="muted">' + esc(E.seasonLabel(s, h.season)) + '</span><span>' + esc(h.compName.split(' — ')[0]) + '</span><span class="spacer"></span><span>' + (h.home ? 'H' : 'A') + '</span><b>' + h.hg + '-' + h.ag + '</b></div>').join('') : '<div class="muted small">You have never met.</div>')) +
          card('Club', '<div class="row small"><span class="muted">Manager</span><span class="spacer"></span><b>' + esc(mine ? s.manager.name : c.manager) + '</b></div>' +
            '<div class="row small"><span class="muted">Stadium capacity</span><span class="spacer"></span><b>' + (c.capacity || 0).toLocaleString('en-GB') + '</b></div>' +
            '<div class="row small"><span class="muted">Squad strength</span><span class="spacer"></span><b>' + E.clubOverall(c) + '</b></div>' +
            '<div class="row small"><span class="muted">Preferred shape</span><span class="spacer"></span><b>' + esc(Live.FORMATION_NAMES[mine ? s.selection.formation : c.formation] || '4-4-2') + '</b></div>' +
            (mine ? '<div class="row small"><span class="muted">Balance</span><span class="spacer"></span><b>' + ms(c.balance) + '</b></div>' : '')) + '</div>';
      }
      return '<div class="page-head"><div class="row nowrap grow" style="gap:16px">' + UI.crest(c, 'xl') + '<div style="min-width:0"><h1 class="' + (mine ? 'me' : '') + '">' + esc(c.name) + '</h1>' +
        '<div class="sub row" style="gap:8px;margin-top:6px">' + UI.flag(dv ? dv.nation : c.nation) + (dv ? '<a data-go="league/' + c.division + '" class="bold">' + esc(dv.name) + '</a><span>· ' + UI.ordinal(pos) + '</span>' : '<span>' + esc(UI.nationName(c.nation)) + ' · European guest</span>') +
        '<span>· form</span>' + UI.form(E.clubForm(s, ci)) + '</div></div></div><button class="btn ghost" onclick="history.back()">← Back</button></div>' +
        tabs([['overview', 'Overview'], ['squad', 'Squad'], ['fixtures', 'Fixtures']], tab, 'club/' + ci + '/') + body;
    }
  });

  /* ================================================================ *
   * TRANSFERS
   * ================================================================ */
  UI.page('transfers', {
    render(args) {
      const s = S(), tab = args[0] || 'search', c = E.user(s);
      const tf = UI.tf = UI.tf || { q: '', pos: { G: true, D: true, M: true, A: true }, maxPrice: '', minSkill: '', maxAge: '', league: '', unlisted: false, sort: 'skill', page: 0 };
      const offers = s.offers.filter(o => !o.done);
      const hdr = head('Transfers', 'Funds ' + money(c.balance) + ' · Squad ' + c.players.length + '/' + E.MAX_SQUAD + ' · Wage bill ' + ms(E.wageBill(s)) + '/wk',
        '<button class="btn" data-act="scout">' + UI.icon('bolt') + ' Scout an unknown player</button>') +
        tabs([['search', 'Player search'], ['shortlist', 'Shortlist (' + s.shortlist.length + ')'], ['offers', 'Offers for your players (' + offers.length + ')'], ['history', 'Transfer history']], tab, 'transfers/');
      const row = p => Object.assign({}, p, { _p: p });
      const cols = [
        { key: 'pos', label: 'Pos', sort: r => ({ G: 0, D: 1, M: 2, A: 3 })[r.pos], html: r => UI.pos(r.pos) },
        { key: 'surname', label: 'Name', html: r => UI.playerLink(r) },
        { key: 'age', label: 'Age', num: 1 }, { key: 'skill', label: 'Skill', num: 1, html: r => '<b>' + r.skill + '</b>' }, { key: 'pot', label: 'Potential', html: r => UI.potStars(r) },
        { key: 'fromClub', label: 'Club', html: r => (typeof r.source === 'number' ? UI.clubLink(r.source, { short: true }) : '<span class="muted">Free agent</span>') + (r.listed && typeof r.source === 'number' ? ' <span class="tag list">Listed</span>' : '') },
        { key: 'price', label: 'Price', num: 1, html: r => '<b class="' + (r.price > c.balance ? 'bad' : '') + '">' + ms(r.price) + '</b>' },
        { key: 'act', label: '', sort: false, html: r => '<button class="btn sm go" data-act="bid" data-id="' + r.id + '"' + (r.price > c.balance || c.players.length >= E.MAX_SQUAD ? ' disabled' : '') + '>Sign</button> ' +
          '<button class="btn sm ghost" data-act="shortlist" data-id="' + r.id + '" title="Shortlist">' + (s.shortlist.indexOf(r.id) >= 0 ? '★' : '☆') + '</button>' }
      ];
      if (tab === 'shortlist') {
        const list = s.shortlist.map(id => E.playerView(s, id)).filter(v => v && v.p && !v.mine).map(v => Object.assign(row(v.p), { price: v.askingPrice, source: v.clubIndex >= 0 ? v.clubIndex : 'pool', listed: v.p.transferListed || v.clubIndex < 0 }));
        return hdr + card('', UI.table('short', cols, list, { empty: 'Your shortlist is empty — star players in the search to track them.' }), { cls: 'flush' });
      }
      if (tab === 'offers') {
        const list = offers.map(o => { const p = E.user(s).players.find(x => x.id === o.playerId); return p ? '<div class="row" style="padding:10px 0;border-bottom:1px solid var(--line)">' + UI.pos(p.pos) + UI.playerLink(p) +
          '<span class="muted">valued ' + ms(p.value) + '</span><span class="spacer"></span>' + UI.clubLink(o.club) + '<b style="font-size:16px">' + ms(o.amount) + '</b><button class="btn sm go" data-act="acceptOffer" data-id="' + o.id + '">Accept</button>' +
          '<button class="btn sm" data-act="rejectOffer" data-id="' + o.id + '">Reject</button></div>' : ''; }).join('');
        return hdr + card('', list || '<div class="empty">No offers on the table. Clubs bid for your best players from time to time — watch the inbox.</div>');
      }
      if (tab === 'history') {
        const list = s.transferLog.map(t => '<tr><td class="small">' + esc(E.formatDate(t.date)) + '</td><td>' + (t.dir === 'in' ? '<span class="tag list">In</span>' : '<span class="tag exp">Out</span>') + '</td><td class="bold">' +
          (t.id ? '<a data-go="player/' + t.id + '">' + esc(t.name) + '</a>' : esc(t.name)) + '</td><td>' + UI.clubByName(t.dir === 'in' ? t.from : t.to) + '</td><td class="num">' + ms(t.fee) + '</td></tr>').join('');
        return hdr + card('', '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th></th><th>Player</th><th>Club</th><th class="num">Fee</th></tr></thead><tbody>' + (list || '<tr><td colspan="5" class="center muted" style="padding:18px">No deals yet.</td></tr>') + '</tbody></table></div>', { cls: 'flush' });
      }
      const filters = { search: tf.q, pos: tf.pos, includeUnlisted: tf.unlisted, sortBySkill: true, sort: tf.sort,
        maxPrice: tf.maxPrice !== '' ? +tf.maxPrice : null, minSkill: tf.minSkill !== '' ? +tf.minSkill : null, maxAge: tf.maxAge !== '' ? +tf.maxAge : null, league: tf.league === '' ? null : tf.league };
      const all = E.marketList(s, filters), per = 40, pages = Math.max(1, Math.ceil(all.length / per));
      tf.page = Math.min(tf.page, pages - 1);
      const pageRows = all.slice(tf.page * per, tf.page * per + per).map(p => Object.assign({}, p, { _p: p }));
      const lgOpts = '<option value="">All clubs & free agents</option><option value="free"' + (tf.league === 'free' ? ' selected' : '') + '>Free agents only</option>' +
        s.divisions.map((dv, i) => '<option value="' + i + '"' + (String(tf.league) === String(i) ? ' selected' : '') + '>' + esc(dv.name) + ' (' + esc(UI.nationName(dv.nation)) + ')</option>').join('');
      const fbar = '<div class="card" style="margin-bottom:12px"><div class="row" style="align-items:flex-end">' +
        '<label class="field" style="flex:1;min-width:160px"><span>Name</span><input class="input" data-tf="q" value="' + esc(tf.q) + '" placeholder="Search players"></label>' +
        '<label class="field"><span>Max price (£)</span><input class="input" data-tf="maxPrice" type="number" step="10000" style="width:130px" value="' + esc(tf.maxPrice) + '"></label>' +
        '<label class="field"><span>Min skill</span><input class="input" data-tf="minSkill" type="number" style="width:84px" value="' + esc(tf.minSkill) + '"></label>' +
        '<label class="field"><span>Max age</span><input class="input" data-tf="maxAge" type="number" style="width:84px" value="' + esc(tf.maxAge) + '"></label>' +
        '<label class="field"><span>Where</span><select class="input" data-tf="league">' + lgOpts + '</select></label>' +
        '<label class="field"><span>Sort</span><select class="input" data-tf="sort">' + [['skill', 'Skill'], ['pot', 'Potential'], ['price', 'Price (low)'], ['age', 'Age (young)']].map(o => '<option value="' + o[0] + '"' + (tf.sort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></label></div>' +
        '<div class="row" style="margin-top:12px"><div class="chips">' + ['G', 'D', 'M', 'A'].map(p => '<span class="chip' + (tf.pos[p] ? ' on' : '') + '" data-act="tfPos" data-v="' + p + '">' + esc(D.POS_NAME[p]) + 's</span>').join('') + '</div><span class="spacer"></span>' +
        '<label class="check"><input type="checkbox" data-tf="unlisted"' + (tf.unlisted ? ' checked' : '') + '> Include players not for sale (+60% to prise them away)</label></div></div>';
      const pager = '<div class="row" style="padding:10px 14px"><span class="muted small">' + all.length + ' players</span><span class="spacer"></span><button class="btn sm" data-act="tfPage" data-v="-1"' + (tf.page <= 0 ? ' disabled' : '') + '>‹</button>' +
        '<span class="small">Page ' + (tf.page + 1) + ' / ' + pages + '</span><button class="btn sm" data-act="tfPage" data-v="1"' + (tf.page >= pages - 1 ? ' disabled' : '') + '>›</button></div>';
      UI.tables.market = { key: null, dir: -1 };
      return hdr + fbar + card('', UI.table('market', cols.map(c => Object.assign({}, c, { sort: false })), pageRows) + pager, { cls: 'flush' });
    },
    after(view) {
      $$('[data-tf]', view).forEach(el => {
        const k = el.dataset.tf;
        const apply = () => { UI.tf[k] = el.type === 'checkbox' ? el.checked : el.value; UI.tf.page = 0; UI.refresh(); const again = $('[data-tf="' + k + '"]'); if (again && el.type !== 'checkbox' && el.tagName !== 'SELECT') { again.focus(); again.setSelectionRange && again.setSelectionRange(again.value.length, again.value.length); } };
        if (el.tagName === 'SELECT' || el.type === 'checkbox') el.onchange = apply;
        else { let t; el.oninput = () => { clearTimeout(t); t = setTimeout(apply, 350); }; }
      });
    }
  });
  UI.acts.tfPos = el => { UI.tf.pos[el.dataset.v] = !UI.tf.pos[el.dataset.v]; UI.tf.page = 0; UI.refresh(); };
  UI.acts.tfPage = el => { UI.tf.page += +el.dataset.v; UI.refresh(); };
  UI.acts.rejectOffer = el => { const o = S().offers.find(x => x.id === +el.dataset.id); if (o) { o.done = true; o.result = 'rejected'; UI.toast('Offer rejected.'); UI.save(); UI.refresh(); } };
  UI.acts.scout = () => {
    UI.modal({ title: 'Scout an unknown player', body: '<p>Your scouts can find an unattached player for a modest fee (around 60% of his value). Pick a position:</p>',
      buttons: ['G', 'D', 'M', 'A'].map(p => ({ label: D.POS_NAME[p], primary: p === 'M', onClick: () => {
        const r = E.signUnlisted(S(), p); S().notices.length = 0;
        UI.toast(r.ok ? 'Signed ' + r.player.forename + ' ' + r.player.surname + ' (' + r.player.pos + ', skill ' + r.player.skill + ').' : r.msg, r.ok ? 'good' : 'bad');
        UI.save(); UI.refresh();
      } })).concat([{ label: 'Cancel', cls: 'ghost' }]) });
  };

  /* ================================================================ *
   * FINANCES
   * ================================================================ */
  UI.page('finances', {
    render() {
      const s = S(), f = E.financeSummary(s), se = f.season;
      const inc = [['Gate receipts', se.gate], ['TV & sponsorship', se.tv], ['Prize money', se.prize], ['Player sales', se.sales]];
      const out = [['Wages', se.wages], ['Transfer fees', se.purchases], ['Loan interest (added to debt)', se.interest]];
      const mx = Math.max(1, ...inc.map(x => x[1]), ...out.map(x => x[1]));
      const bars = (list, col) => list.map(x => '<div style="margin:8px 0"><div class="row small"><span>' + x[0] + '</span><span class="spacer"></span><b>' + money(x[1]) + '</b></div>' +
        '<div class="bar lg" style="margin-top:4px"><span style="width:' + (x[1] / mx * 100) + '%;background:' + col + '"></span></div></div>').join('');
      const chart = UI.lineChart(f.history.map(h => ({ x: h.day, y: h.balance, label: E.formatDate(h.date) + ': ' + money(h.balance) })), { fmt: v => ms(v), width: 1100, height: 240, xLabel: 'Bank balance through the season', title: 'Balance' });
      const last = f.last;
      return head('Finances', esc(E.user(s).name) + ' · Season ' + E.seasonLabel(s)) +
        '<div class="kpis" style="margin-bottom:16px">' + kpi('Bank balance', '<span class="' + (f.balance < 0 ? 'bad' : '') + '">' + ms(f.balance) + '</span>') +
        kpi('Wage bill', ms(f.wageBill) + '<span class="small muted"> /wk</span>', ms(f.wageBill * 42) + ' a season') + kpi('TV & sponsors', ms(f.tvWeekly) + '<span class="small muted"> /wk</span>') +
        kpi('Last home gate', f.lastGate ? ms(f.lastGate.amount) : '–', f.lastGate ? f.lastGate.attendance.toLocaleString('en-GB') + ' of ' + f.capacity.toLocaleString('en-GB') : 'capacity ' + f.capacity.toLocaleString('en-GB')) +
        kpi('Loan', '<span class="' + (f.debt ? 'bad' : '') + '">' + ms(f.debt) + '</span>', 'limit ' + ms(f.loanCap)) + '</div>' +
        '<div class="grid cols-2">' + card('Income this season', bars(inc, 'var(--good)')) + card('Spending this season', bars(out, 'var(--bad)')) +
        card('Balance', chart, { cls: 'span-2' }) +
        card('Bank loan', '<p class="small muted" style="margin-top:0">Borrow up to ' + money(f.loanCap) + '. Interest of about 2% is added to the debt every week. ' +
          'If the account stays overdrawn for too long the board will sell your most valuable player.</p><div class="row"><input class="input" id="loan-amt" type="number" step="10000" value="' +
          Math.min(Math.max(50000, Math.round(f.loanCap / 4 / 10000) * 10000), f.loanCap) + '" style="width:160px"><button class="btn primary" data-act="loan" data-v="borrow">Borrow</button>' +
          '<button class="btn" data-act="loan" data-v="repay"' + (f.debt ? '' : ' disabled') + '>Repay</button></div>') +
        card('Last season', last ? '<div class="small">' + [['Gate', last.gate], ['TV', last.tv], ['Prizes', last.prize], ['Sales', last.sales], ['Wages', -last.wages], ['Purchases', -last.purchases]]
          .map(x => '<div class="row"><span class="muted">' + x[0] + '</span><span class="spacer"></span><b class="' + (x[1] < 0 ? 'bad' : '') + '">' + money(x[1]) + '</b></div>').join('') + '</div>' : '<div class="muted">This is your first season.</div>') + '</div>';
    }
  });
  UI.acts.loan = el => {
    const amt = +($('#loan-amt').value || 0), s = S();
    const r = el.dataset.v === 'borrow' ? E.takeLoan(s, amt) : E.repayLoan(s, amt);
    UI.toast(r.msg, r.ok ? 'good' : 'bad'); UI.save(); UI.refresh();
  };

  /* ================================================================ *
   * BOARD, JOBS, CAREER, HALL OF FAME
   * ================================================================ */
  UI.page('board', {
    render() {
      const s = S(), b = s.board, o = b.objective || {}, pos = E.leaguePosition(s, E.user(s).name), c = b.confidence;
      const mood = c >= 75 ? 'The board is delighted with your work.' : c >= 50 ? 'The board is satisfied.' : c >= 30 ? 'The board is growing concerned.' : c >= 15 ? 'Your job is under threat.' : 'You are on the brink of the sack.';
      return head('Board & Objectives', esc(E.user(s).name) + ' · ' + esc(E.userDiv(s).name)) +
        '<div class="grid cols-3">' + card('Season objective', '<div class="bold" style="font-size:20px">' + esc(o.label || '—') + '</div>' +
          '<div class="small muted" style="margin-top:6px">Target: finish ' + (o.target ? UI.ordinal(o.target) + ' or better' : '—') + ' · currently ' + UI.ordinal(pos) + '</div>' +
          '<div style="margin-top:12px">' + (o.target && pos <= o.target ? '<span class="badge green">On track</span>' : '<span class="badge amber">Behind target</span>') + '</div>') +
        card('Board confidence', '<div class="row"><b style="font-size:26px">' + Math.round(c) + '%</b><span class="spacer"></span></div>' + meter(c, confColor(c)) + '<p class="small" style="margin-bottom:0">' + mood + '</p>' +
          (s.difficulty === 'easy' ? '<p class="small muted">On Easy the board never sacks you.</p>' : '')) +
        card('Your standing', '<div class="row small"><span class="muted">Reputation</span><span class="spacer"></span>' + UI.stars(s.reputation) + '</div>' +
          '<div class="row small" style="margin-top:6px"><span class="muted">Manager rating</span><span class="spacer"></span><b>' + s.managerRating + '%</b></div>' +
          '<div class="row small" style="margin-top:6px"><span class="muted">This season</span><span class="spacer"></span><b>W' + s.seasonRecord.W + ' D' + s.seasonRecord.D + ' L' + s.seasonRecord.L + '</b></div>' +
          '<p class="small muted">A strong reputation brings job offers from bigger clubs — check the Job Centre.</p>') +
        card('Awards', s.awards.length ? s.awards.slice().reverse().map(a => '<div class="row small"><span>' + esc(a.award) + '</span><span class="spacer"></span><span class="muted">' + esc(E.formatDate(a.date)) + '</span></div>').join('') : '<div class="muted small">No awards yet.</div>', { cls: 'span-2' }) +
        card('Resign', '<p class="small muted" style="margin-top:0">Fancy a new challenge? Resign and pick from the clubs that would hire someone with your reputation. Your loan debt stays with this club.</p><button class="btn danger" data-go="jobs">Resign & find a new club</button>') + '</div>';
    }
  });
  UI.page('jobs', {
    render() {
      const s = S(), pr = E.prestigeMap(s);
      const list = E.eligibleClubs(s, s.reputation).slice(0, 80);
      const rows = list.map(ci => {
        const c = s.clubs[ci], dv = s.divisions[c.division];
        return '<tr><td>' + UI.clubLink(ci) + '</td><td>' + UI.flag(dv.nation) + ' ' + esc(dv.name) + '</td><td>' + UI.stars(pr[ci]) + '</td><td class="num">' + E.clubOverall(c) + '</td>' +
          '<td class="num">' + ms(c.balance) + '</td><td class="num">' + UI.ordinal(E.leaguePosition(s, c.name, c.division)) + '</td><td class="num"><button class="btn sm go" data-act="takeJob" data-ci="' + ci + '">Take the job</button></td></tr>';
      }).join('');
      return head('Job Centre', s.sacked ? '<span class="bad bold">You are out of work.</span> Clubs that would consider you:' : 'Clubs that would hire a manager with your reputation (' + Math.round(s.reputation) + '/100)') +
        (s.sacked ? '<div class="card" style="border-color:var(--bad);margin-bottom:16px"><b>You were sacked by ' + esc(E.user(s).name) + '.</b> <span class="muted">Pick a new club to carry on your career.</span></div>' : '') +
        card('', '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Club</th><th>League</th><th>Prestige</th><th class="num">Squad</th><th class="num">Budget</th><th class="num">Position</th><th></th></tr></thead><tbody>' +
          (rows || '<tr><td colspan="7" class="center muted" style="padding:18px">No vacancies at the moment.</td></tr>') + '</tbody></table></div>', { cls: 'flush' });
    }
  });
  UI.acts.takeJob = el => {
    const s = S(), ci = +el.dataset.ci, c = s.clubs[ci];
    UI.confirm('Become manager of ' + c.name + '?', s.sacked ? 'They are ready to appoint you straight away.' : 'You will leave ' + esc(E.user(s).name) + ' immediately. Any loan debt stays behind.', 'Take the job').then(ok => {
      if (!ok) return;
      const from = E.user(s).name;
      E.chooseClub(s, ci);
      if (!s.sacked) E.news(s, s.manager.name + ' leaves ' + from + ' to take over at ' + c.name + '.', 'manager');
      s.notices.length = 0; UI.applyClubTheme(); UI.tables = {}; UI.save();
      UI.toast('Welcome to ' + c.name + '!', 'good'); UI.go('home');
    });
  };
  UI.page('career', {
    render() {
      const s = S(), car = s.career.slice().reverse(), rec = s.record;
      const trophies = s.career.reduce((a, c) => a + (c.trophies ? c.trophies.length : 0), 0);
      const clubs = new Set(s.career.map(c => c.club).concat([E.user(s).name])).size;
      const rows = car.map(c => '<tr><td>' + esc(c.label || E.seasonLabel(s, c.season)) + '</td><td>' + UI.clubByName(c.club) + '</td><td>' + esc(c.division) + '</td><td class="num">' + UI.ordinal(c.position) + '</td>' +
        '<td class="num">' + (c.record ? c.record.W + '-' + c.record.D + '-' + c.record.L : '') + '</td><td class="small">' + esc(c.objective || '') + (c.objective ? (c.met ? ' <span class="good">✓</span>' : ' <span class="bad">✗</span>') : '') + '</td>' +
        '<td class="small">' + (c.trophies && c.trophies.length ? '<b class="warn">' + esc(c.trophies.join(', ')) + '</b>' : '<span class="faint">—</span>') + (c.note ? ' <span class="muted">' + esc(c.note) + '</span>' : '') + '</td></tr>').join('');
      return head('My Career', esc(s.manager.name) + ' · now managing <span class="me">' + esc(E.user(s).name) + '</span>') +
        '<div class="kpis" style="margin-bottom:16px">' + kpi('Seasons', s.career.filter(c => !c.note).length) + kpi('Matches', rec.P, rec.W + 'W ' + rec.D + 'D ' + rec.L + 'L') +
        kpi('Win rate', rec.P ? Math.round(rec.W / rec.P * 100) + '%' : '–') + kpi('Trophies', trophies) + kpi('Clubs managed', clubs) + kpi('Reputation', UI.stars(s.reputation)) + '</div>' +
        card('Season by season', '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Season</th><th>Club</th><th>Division</th><th class="num">Finished</th><th class="num">W-D-L</th><th>Objective</th><th>Trophies</th></tr></thead><tbody>' +
          (rows || '<tr><td colspan="7" class="center muted" style="padding:18px">Your first season is under way — your record fills in as seasons end.</td></tr>') + '</tbody></table></div>', { cls: 'flush' }) +
        '<div style="height:16px"></div>' + card('Manager awards', s.awards.length ? s.awards.slice().reverse().map(a => '<div class="row small"><span>' + esc(a.award) + '</span><span class="spacer"></span><span class="muted">' + esc(E.formatDate(a.date)) + '</span></div>').join('') : '<div class="muted small">No awards yet — win four in a row to be Manager of the Month.</div>');
    }
  });
  UI.page('honours', {
    render(args) {
      const s = S(), tab = args[0] || 'seasons', nat = UI.honNation || 'ALL';
      const nats = [['ALL', 'All nations']].concat(D.NATION_ORDER.map(n => [n, D.NATION_RULES[n].name])).concat([['EUR', 'Europe']]);
      const chips = '<div class="chips" style="margin-bottom:14px">' + nats.map(n => '<span class="chip' + (n[0] === nat ? ' on' : '') + '" data-act="honNation" data-v="' + n[0] + '">' + (n[0] !== 'ALL' ? UI.flag(n[0]) + ' ' : '') + esc(n[1]) + '</span>').join('') + '</div>';
      const keep = x => nat === 'ALL' || x.nation === nat;
      let body = '';
      if (!s.honours.length) body = '<div class="empty">The roll of honour fills up at the end of each season.</div>';
      else if (tab === 'totals') {
        const cupNat = {}; s.honours.forEach(h => { h.cups.forEach(c => { cupNat[c.name] = c.nation; }); h.divisions.forEach(d => { cupNat[d.name + ' title'] = d.nation; }); });
        const tally = E.honoursTally(s).map(t => {
          const parts = Object.keys(t).filter(k => k !== 'club' && k !== 'total' && (nat === 'ALL' || cupNat[k] === nat));
          return { club: t.club, total: parts.reduce((a, k) => a + t[k], 0), parts: parts.sort().map(k => esc(k) + ' ×' + t[k]).join(', ') };
        }).filter(t => t.total > 0).sort((a, b) => b.total - a.total || a.club.localeCompare(b.club));
        body = card('Trophies won — total per club, with the breakdown by competition', '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Club</th><th class="num">Total</th><th>Breakdown</th></tr></thead><tbody>' +
          tally.map(t => '<tr><td>' + UI.clubByName(t.club) + '</td><td class="num bold">' + t.total + '</td><td class="small muted" style="white-space:normal">' + t.parts + '</td></tr>').join('') + '</tbody></table></div>');
      } else if (tab === 'awards') {
        body = s.honours.slice().reverse().map(h => card(esc(h.label || E.seasonLabel(s, h.season)), '<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>League</th><th>Golden boot</th><th class="num">Goals</th><th>Player of the season</th><th class="num">Avg</th></tr></thead><tbody>' +
          (h.awards || []).filter(keep).map(a => '<tr><td>' + UI.flag(a.nation) + ' ' + esc(a.division) + '</td><td>' + (a.boot ? esc(a.boot.name) + ' <span class="muted">(' + UI.meName(a.boot.club) + ')</span>' : '—') + '</td><td class="num">' + (a.boot ? a.boot.goals : '') + '</td>' +
            '<td>' + (a.player ? esc(a.player.name) + ' <span class="muted">(' + UI.meName(a.player.club) + ')</span>' : '—') + '</td><td class="num">' + (a.player ? a.player.rating.toFixed(2) : '') + '</td></tr>').join('') + '</tbody></table></div>', { cls: '' })).join('<div style="height:12px"></div>');
      } else {
        body = s.honours.slice().reverse().map(h => card(esc(h.label || E.seasonLabel(s, h.season)), '<div class="grid cols-2"><div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Division</th><th>Champions</th><th>Runners-up</th><th>Third</th></tr></thead><tbody>' +
          h.divisions.filter(keep).map(d => '<tr><td>' + UI.flag(d.nation) + ' ' + esc(d.name) + '</td><td class="bold">' + UI.clubByName(d.first, { crest: false }) + '</td><td>' + UI.clubByName(d.second, { crest: false }) + '</td><td>' + UI.clubByName(d.third, { crest: false }) + '</td></tr>').join('') +
          '</tbody></table></div><div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Cup</th><th>Winners</th></tr></thead><tbody>' +
          h.cups.filter(keep).map(c => '<tr><td>' + UI.flag(c.nation) + ' ' + esc(c.name) + '</td><td class="bold">' + (c.winner === '—' ? '—' : UI.clubByName(c.winner, { crest: false })) + '</td></tr>').join('') + '</tbody></table></div></div>')).join('<div style="height:12px"></div>');
      }
      return head('Hall of Fame', 'Champions, cup winners and awards from every season') + tabs([['seasons', 'By season'], ['totals', 'Trophy count by club'], ['awards', 'Awards']], tab, 'honours/') + chips + body;
    }
  });
  UI.acts.honNation = el => { UI.honNation = el.dataset.v; UI.refresh(); };

  /* ================================================================ *
   * STATS
   * ================================================================ */
  UI.page('stats', {
    render(args) {
      const s = S(), d = args[0] != null ? +args[0] : s.userDivision, c = E.user(s);
      const opts = s.divisions.map((dv, i) => '<option value="' + i + '"' + (i === d ? ' selected' : '') + '>' + esc(dv.name) + ' (' + esc(UI.nationName(dv.nation)) + ')</option>').join('');
      const mine = c.players.slice().filter(p => p.appsSeason > 0);
      const top = (arr, k, lab) => arr.slice().sort((a, b) => b[k] - a[k]).slice(0, 5).filter(p => p[k] > 0).map(p => '<div class="row small" style="padding:3px 0">' + UI.pos(p.pos) + UI.playerLink(p) + '<span class="spacer"></span><b>' + p[k] + '</b></div>').join('') || '<div class="muted small">—</div>';
      const rated = mine.filter(p => p.rN >= 2).sort((a, b) => b.rSum / b.rN - a.rSum / a.rN).slice(0, 5).map(p => '<div class="row small" style="padding:3px 0">' + UI.pos(p.pos) + UI.playerLink(p) + '<span class="spacer"></span>' + UI.rating(p.rSum / p.rN) + '</div>').join('') || '<div class="muted small">—</div>';
      return head('Statistics', 'League leaders and your own numbers', '<select class="input" id="stats-league">' + opts + '</select>') +
        '<div class="grid cols-3" style="margin-bottom:16px">' + card('<span class="me">' + esc(c.name) + '</span> — goals', top(mine, 'goalsSeason')) + card('Assists', top(mine, 'assistsSeason')) + card('Best rated', rated) + '</div>' +
        leagueStats(d);
    },
    after() { const sel = $('#stats-league'); if (sel) sel.onchange = () => UI.go('stats/' + sel.value); }
  });

  /* ================================================================ *
   * ROUND-UP & SEASON REVIEW
   * ================================================================ */
  UI.page('roundup', {
    render() {
      const s = S(), ru = s.roundup || [], lr = s.lastResult;
      const userNat = E.userDiv(s).nation, nat = UI.ruNation || 'MINE';
      const groups = [];
      ru.forEach(entry => entry.groups.forEach(g => groups.push(Object.assign({ title: entry.title }, g))));
      const hasUser = g => g.games.some(x => x.homeIdx === s.userClub || x.awayIdx === s.userClub);
      const keep = g => nat === 'ALL' || (nat === 'MINE' ? (g.nation === userNat || g.nation === 'EUR' || hasUser(g)) : g.nation === nat);
      const sel = groups.filter(keep).sort((a, b) => hasUser(b) - hasUser(a));
      const nats = [['MINE', 'My competitions'], ['ALL', 'Everything']].concat(D.NATION_ORDER.map(n => [n, D.NATION_RULES[n].name])).concat([['EUR', 'Europe']]);
      const hero = lr ? card('Your result', '<div class="res" style="font-size:17px"><div class="h">' + UI.clubByName(lr.homeName) + '</div><div class="sc" style="font-size:20px">' + lr.hg + ' - ' + lr.ag + '</div><div class="a">' + UI.clubByName(lr.awayName) + '</div>' +
        (lr.agg || lr.winnerName ? '<div class="note">' + (lr.agg ? 'aggregate ' + esc(lr.agg) + ' · ' : '') + (lr.winnerName ? UI.meName(lr.winnerName) + ' go through' + (lr.pens ? ' on penalties' : '') : '') + '</div>' : '') + '</div>' +
        '<div class="small muted center" style="margin-top:8px">' + esc(lr.comp) + (lr.scorers.length ? ' · ' + lr.scorers.map(x => esc(x.name) + ' ' + x.minute + "'").join(', ') : '') + '</div>') : '';
      const body = sel.map(g => '<div class="res-group"><h4>' + UI.flag(g.nation) + ' ' + esc(g.group) + '</h4>' + g.games.map(x => '<div class="res"><div class="h">' + UI.clubLink(x.homeIdx, { short: true }) + '</div>' +
        '<div class="sc">' + esc(x.score || 'v') + (x.pens ? '<span class="tiny" style="color:var(--warn)"> p</span>' : '') + '</div><div class="a">' + UI.clubLink(x.awayIdx, { short: true }) + '</div>' +
        (x.agg ? '<div class="note">' + esc(x.agg) + (x.winner ? ' · ' + UI.meName(x.winner) + ' through' : '') + '</div>' : '') + '</div>').join('') + '</div>').join('') || '<div class="empty">Nothing else was played.</div>';
      return head('Results round-up', 'Everything played since your last match', '<div class="row"><button class="btn" data-go="league/' + s.userDivision + '">Tables</button><button class="btn" data-go="competitions">Cups</button>' +
        '<button class="btn go" data-act="advance">Continue ▸</button></div>') + hero + '<div style="height:12px"></div>' +
        '<div class="chips" style="margin-bottom:12px">' + nats.map(n => '<span class="chip' + (n[0] === nat ? ' on' : '') + '" data-act="ruNation" data-v="' + n[0] + '">' + (n[0] !== 'ALL' && n[0] !== 'MINE' ? UI.flag(n[0]) + ' ' : '') + esc(n[1]) + '</span>').join('') + '</div>' +
        '<div class="grid cols-2">' + card('', body.slice(0, Math.ceil(body.length / 1))) + card('Tables', miniTables(sel)) + '</div>';
    }
  });
  function miniTables(groups) {
    const s = S(), ds = [];
    groups.forEach(g => { if (g.division != null && ds.indexOf(g.division) < 0) ds.push(g.division); });
    if (ds.indexOf(s.userDivision) < 0) ds.unshift(s.userDivision);
    return ds.slice(0, 3).map(d => {
      const st = E.standings(s, d), z = E.tableZones(s, d);
      return '<h4 style="margin:4px 0 8px;font-size:13px">' + UI.flag(s.divisions[d].nation) + ' ' + esc(s.divisions[d].name) + '</h4><table class="tbl compact"><tbody>' +
        st.map((r, i) => '<tr class="' + (r.idx === s.userClub ? 'mine' : '') + '"><td class="zone ' + (z[i + 1] || '') + '"></td><td class="num">' + (i + 1) + '</td><td>' + UI.clubLink(r.idx, { short: true }) + '</td><td class="num">' + r.P + '</td><td class="num bold">' + r.Pts + '</td></tr>').join('') +
        '</tbody></table><div style="height:14px"></div>';
    }).join('');
  }
  UI.acts.ruNation = el => { UI.ruNation = el.dataset.v; UI.refresh(); };

  UI.page('review', {
    render() {
      const s = S(), r = s.pendingReview || s._lastReview;
      if (!r) return head('Season review') + '<div class="empty">No season has finished yet.</div>';
      Object.defineProperty(s, '_lastReview', { value: r, enumerable: false, writable: true, configurable: true });
      const big = r.sacked ? 'Sacked' : UI.ordinal(r.position);
      return head('Season review ' + esc(r.label), esc(r.club) + ' · ' + esc(r.division), '<button class="btn go" data-act="advance">Continue to ' + esc(E.seasonLabel(s)) + ' ▸</button>') +
        '<div class="kpis" style="margin-bottom:16px">' + kpi('Final position', '<span class="me">' + big + '</span>', esc(r.division)) +
        kpi('Objective', r.met ? '<span class="good">Achieved</span>' : '<span class="bad">Missed</span>', esc(r.objective)) +
        kpi('Record', r.record.W + '-' + r.record.D + '-' + r.record.L, 'W-D-L, all competitions') + kpi('Prize money', ms(r.prize)) + kpi('Reputation', UI.stars(r.reputation)) + '</div>' +
        (r.promoted ? '<div class="card" style="border-color:var(--good);margin-bottom:16px"><b class="good" style="font-size:18px">PROMOTED!</b> <span class="muted">Next season you play in the ' + esc(E.userDiv(s).name) + '.</span></div>' : '') +
        (r.relegated ? '<div class="card" style="border-color:var(--bad);margin-bottom:16px"><b class="bad" style="font-size:18px">Relegated.</b> <span class="muted">Next season: ' + esc(E.userDiv(s).name) + '.</span></div>' : '') +
        (r.trophies.length ? '<div class="card" style="border-color:var(--warn);margin-bottom:16px"><b class="warn" style="font-size:18px">Trophies: ' + esc(r.trophies.join(', ')) + '</b></div>' : '') +
        '<div class="card" style="margin-bottom:16px">' + esc(r.verdict) + '</div>' +
        '<div class="grid cols-3">' + card('Champions', r.champions.map(c => '<div class="row small" style="padding:3px 0">' + UI.flag(c.nation) + '<span class="muted">' + esc(c.division) + '</span><span class="spacer"></span>' + UI.meName(c.club) + '</div>').join('')) +
        card('Cup winners', r.cups.map(c => '<div class="row small" style="padding:3px 0">' + UI.flag(c.nation) + '<span class="muted">' + esc(c.name) + '</span><span class="spacer"></span>' + UI.meName(c.winner) + '</div>').join('')) +
        card('Awards', r.awards.map(a => '<div class="small" style="padding:4px 0;border-bottom:1px solid rgba(38,53,83,.5)">' + UI.flag(a.nation) + ' <b>' + esc(a.division) + '</b><br>' +
          (a.boot ? 'Golden boot: ' + esc(a.boot.name) + ' (' + UI.meName(a.boot.club) + ', ' + a.boot.goals + ')' : '') + (a.player ? '<br>Player of the season: ' + esc(a.player.name) + ' (' + UI.meName(a.player.club) + ')' : '') + '</div>').join('')) + '</div>';
    }
  });

  /* ================================================================ *
   * SAVES & HELP
   * ================================================================ */
  const SLOTS = [['auto', 'Autosave'], ['slot1', 'Slot 1'], ['slot2', 'Slot 2'], ['slot3', 'Slot 3']];
  function savesPage() {
    const metas = UI._slotMeta || {};
    const rows = SLOTS.map(([id, label]) => {
      const m = metas[id];
      return '<div class="card"><div class="row nowrap">' + (m ? '<span class="crest lg" style="--c1:' + (m.kit ? m.kit[0] : '#555') + ';--c2:' + (m.kit ? m.kit[1] : '#999') + '"></span>' : '') +
        '<div class="grow" style="min-width:0"><div class="small muted">' + label + '</div>' + (m ? '<div class="bold">' + esc(m.club) + ' · ' + esc(m.season) + '</div><div class="small muted">' + esc(m.manager || '') + ' · ' +
        esc(m.division) + ' · ' + esc(E.formatDate(m.date)) + ' · saved ' + new Date(m.savedAt).toLocaleString() + '</div>' : '<div class="muted">Empty</div>') + '</div>' +
        (m ? '<button class="btn primary" data-act="slotLoad" data-v="' + id + '">Load</button>' : '') + (UI.S && id !== 'auto' ? '<button class="btn" data-act="slotSave" data-v="' + id + '">Save here</button>' : '') +
        (m && id !== 'auto' ? '<button class="btn ghost" data-act="slotDel" data-v="' + id + '">Delete</button>' : '') + '</div></div>';
    }).join('');
    return '<div class="wizard">' + head('Save / Load', 'The game autosaves after every match. Use the slots to keep separate careers.', UI.S ? '' : '<button class="btn ghost" data-go="title">← Back</button>') +
      '<div class="stack">' + rows + '</div>' + (UI.S ? '<div class="row" style="margin-top:18px"><button class="btn" data-act="newCareer">' + UI.icon('plus') + ' Start a new career</button></div>' : '') + '</div>';
  }
  function loadMetas() {
    Store.list(SLOTS.map(x => x[0])).then(list => {
      const m = {}; list.forEach(x => { m[x.slot] = x.meta; });
      const changed = JSON.stringify(m) !== JSON.stringify(UI._slotMeta || null);
      UI._slotMeta = m;
      if (changed && (UI.route === 'saves' || UI.route === 'load')) UI.refresh();
    });
  }
  UI.page('saves', { render: savesPage, after: loadMetas });
  UI.page('load', { bare: true, render: savesPage, after: loadMetas });
  UI.acts.slotLoad = el => UI.loadFrom(el.dataset.v).then(() => { UI.toast('Game loaded.', 'good'); UI.go('home'); }).catch(e => UI.toast(e.message, 'bad'));
  UI.acts.slotSave = el => UI.saveTo(el.dataset.v).then(() => { UI.toast('Saved to ' + el.dataset.v + '.', 'good'); loadMetas(); });
  UI.acts.slotDel = el => UI.confirm('Delete this save?', 'This cannot be undone.', 'Delete', true).then(ok => { if (ok) Store.remove(el.dataset.v).then(loadMetas); });
  UI.acts.newCareer = () => UI.confirm('Start a new career?', 'Your current game stays in the autosave until the new one overwrites it. Save it to a slot first if you want to keep it.', 'New career').then(ok => {
    if (ok) { UI.S = null; UI.preview = null; UI.newCfg = null; UI.newSeed = (Math.random() * 1e9) >>> 0; UI.go('new'); }
  });

  UI.page('help', {
    bare: false,
    render() {
      const li = (a, b) => '<div class="row" style="align-items:flex-start;padding:7px 0;border-bottom:1px solid rgba(38,53,83,.5)"><b style="width:190px;flex:none">' + a + '</b><span class="muted">' + b + '</span></div>';
      return '<div class="wizard">' + head('How to play', 'A quick guide to managing in SIMSOC 6', UI.S ? '' : '<button class="btn ghost" data-go="title">← Back</button>') +
        '<div class="grid cols-2">' + card('The basics',
          li('Continue / Space', 'Moves the game on to your next match. Every other result in Europe is played in the background.') +
          li('Match day', 'Read the opposition report and the assistant\'s advice, then kick off live or take a quick result.') +
          li('During the match', 'Change mentality, make substitutions and give the half-time team talk. Space skips to full time.') +
          li('Round-up', 'After each game you see every result from every competition, then the tables.')) +
        card('Winning matches',
          li('Mentality', 'Underdogs should sit deep (fewer chances for both sides); favourites should attack. The assistant tests every option for you before each game.') +
          li('Fitness & rotation', 'Starting drains fitness. "Pick Fresh XI" rests tired legs; tired players are weaker and get injured.') +
          li('Positions', 'Players out of position (amber ring on the tactics board) perform worse.') +
          li('Team talk', 'Praise when winning, demand more when a stronger team is behind, encourage when level.')) +
        card('Running the club',
          li('Transfers', 'Buy from the open market or prise unlisted players away for a premium. Selling is instant. Max 23 players.') +
          li('Wages & contracts', 'Wages are paid weekly. Renew contracts before the summer or players leave for free.') +
          li('Loans', 'Borrow when you need to, but interest grows weekly and a long overdraft forces a sale.') +
          li('The board', 'Meet the season objective. Fall too far short and you will be sacked (not on Easy).')) +
        card('Your career',
          li('Reputation', 'Results raise your reputation. Bigger clubs then offer you their job — or resign and pick one at the Job Centre.') +
          li('The world', 'Eight nations, twelve leagues with promotion and relegation, domestic cups and the two-legged European cups.') +
          li('Rules', 'Fewer than 8 fit players means a 0-3 walkover. Five bookings or a red card bring a ban. No byes in any draw.') +
          li('Saving', 'The game autosaves after every match; use the Save / Load slots for extra careers.')) + '</div></div>';
    }
  });
})();
