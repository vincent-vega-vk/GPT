/*
 * SIMSOC 6 (remake) - match day
 * Preview (opposition report + the assistant's Monte Carlo advice), the live
 * match (2D pitch, commentary, stats, live ratings, other scores, mentality,
 * substitutions, half-time team talk) and the full-time summary.
 */
;(function () {
  'use strict';
  const UI = window.SimUI, E = window.SimSocEngine, D = window.SimSocData, Live = window.SimSocLive, Pitch = window.SimSocPitch;
  const esc = UI.esc, ms = UI.moneyShort, $ = UI.$;
  const S = () => UI.S;
  const SPEEDS = [[1, '1×', 720], [2, '2×', 360], [4, '4×', 150], [8, '8×', 55]];
  let mt = null;                                         // the match in progress
  let speed = 2;
  try { speed = +localStorage.getItem('simsoc6.speed') || 2; } catch (e) { /* ignore */ }

  function dayKey() { const s = S(); return s.season + '|' + s.day + '|' + s.userClub; }
  function resetIfStale() {
    if (mt && mt.key !== dayKey() && mt.phase !== 'fulltime') stopLoop(), mt = null;
    if (mt && mt.phase === 'fulltime' && mt.key !== mt.doneKey) { /* a finished match: keep until Continue */ }
  }
  const card = (title, body, cls) => '<section class="card ' + (cls || '') + '">' + (title ? '<div class="card-head"><h3>' + title + '</h3></div>' : '') + body + '</section>';

  /* ---- controller used by the top bar / spacebar --------------------- */
  UI.matchCtl = {
    label() {
      if (!mt || mt.phase === 'preview') return E.nextOpponent(S()) ? { text: 'Kick off', match: true } : { text: 'Continue', match: false };
      if (mt.phase === 'live') return mt.live.halfTime ? { text: 'Team talk', match: true } : { text: 'Skip to full time', match: true };
      return { text: 'Continue', match: false };
    },
    primary() {
      if (!mt || mt.phase === 'preview') { if (E.nextOpponent(S())) kickOff(false); else UI.go('home'); return; }
      if (mt.phase === 'live') { if (mt.live.halfTime) openTalk(); else skipToEnd(); return; }
      finishAndLeave();
    }
  };
  UI.onLeaveMatch = function () {
    if (!mt) return;
    if (mt.phase === 'live') {                            // leaving mid-match: the assistant sees it out
      stopLoop();
      if (mt.live.halfTime) mt.live.teamTalk('encourage');
      mt.live.runToEnd();
      commit();
      const r = mt.live.score;
      UI.toast('Full time: ' + mt.cfg.home.name + ' ' + r.hg + '-' + r.ag + ' ' + mt.cfg.away.name + ' (finished by your assistant).');
    }
    if (mt.renderer) { mt.renderer.destroy(); mt.renderer = null; }
    if (mt.phase === 'fulltime') mt = null;
    else if (mt.phase === 'preview') mt = null;
  };

  /* ================================================================ *
   * PAGE
   * ================================================================ */
  UI.page('match', {
    render() {
      const s = S();
      resetIfStale();
      if (mt && (mt.phase === 'live' || mt.phase === 'fulltime')) return mt.phase === 'live' ? liveSkeleton() : fullTimeView();
      const opp = E.nextOpponent(s);
      if (!opp) return '<div class="page-head"><div class="grow"><h1>Match day</h1><div class="sub">No match today.</div></div></div><div class="empty">Press Continue to move on to your next fixture.</div>';
      mt = { phase: 'preview', key: dayKey() };
      return previewView(opp);
    },
    after() {
      if (mt && mt.phase === 'live') mountLive();
    }
  });

  /* ---- preview ------------------------------------------------------- */
  let pvCache = null;
  function previewData() {
    const s = S(), t = s.tactics;
    const k = dayKey() + '|' + s.selection.xi.join(',') + '|' + s.selection.formation + '|' + t.pressing + '|' + t.tempo;
    if (!pvCache || pvCache.k !== k) pvCache = { k: k, v: E.matchPreview(s, 70) };
    return pvCache.v;
  }
  function previewView(opp) {
    const s = S(), uc = E.user(s), ui = s.userClub, oi = opp.clubIndex;
    const homeIdx = opp.home ? ui : oi, awayIdx = opp.home ? oi : ui;
    const fit = E.availablePlayers(uc).length;
    const head = '<div class="scorebar"><div class="team">' + UI.crest(s.clubs[homeIdx], 'lg') + UI.clubLink(homeIdx, { crest: false }) + '</div>' +
      '<div><span class="comp">' + esc(opp.compName) + '</span><div class="score" style="font-size:22px">v</div><span class="comp">' + esc(E.formatDate(opp.date)) + (opp.neutral ? ' · neutral venue' : '') + '</span></div>' +
      '<div class="team away">' + UI.clubLink(awayIdx, { crest: false }) + UI.crest(s.clubs[awayIdx], 'lg') + '</div></div>';
    if (fit < 8) {
      return head + card('Walkover', '<p>You only have <b class="bad">' + fit + '</b> fit players — fewer than the 8 needed to start a match. The game will be awarded 3-0 to ' + UI.clubLink(oi) + '.</p>' +
        '<p class="muted small">Sign players in the transfer market or wait for injuries and bans to clear.</p><div class="row"><button class="btn danger" data-act="mtForfeit">Concede the match (0-3)</button>' +
        '<button class="btn" data-go="transfers">Transfer market</button></div>');
    }
    const pv = previewData();
    const xi = E.playersByIds(uc, s.selection.xi.filter(x => x != null));
    const valid = xi.filter(E.isFit).length;
    const ratingRow = (lab, a, b) => '<span class="muted">' + lab + '</span><div class="prob"><span style="width:' + (a / (a + b) * 100) + '%;background:var(--club)"></span><span style="width:' + (b / (a + b) * 100) + '%;background:#55607a"></span></div><span class="small">' + a + ':' + b + '</span>';
    const report = '<div class="row small" style="margin-bottom:10px"><span>' + (pv.oppPos ? UI.ordinal(pv.oppPos) + ' in ' + esc(pv.oppDivision) : esc(pv.oppDivision)) + '</span><span class="spacer"></span>' + UI.form(pv.oppForm) + '</div>' +
      '<div class="small muted">Manager ' + esc(pv.oppManager) + ' · usually ' + esc(Live.FORMATION_NAMES[pv.oppFormation] || pv.oppFormation) + '</div>' +
      '<div class="ratings-mini" style="margin:12px 0">' + ratingRow('Defence', pv.userRatings.defence, pv.oppRatings.defence) + ratingRow('Midfield', pv.userRatings.midfield, pv.oppRatings.midfield) +
      ratingRow('Attack', pv.userRatings.attack, pv.oppRatings.attack) + ratingRow('Morale', pv.userRatings.morale, pv.oppRatings.morale) + '</div>' +
      '<div class="small muted">Key players</div>' + pv.oppKey.map(p => '<div class="row small" style="padding:3px 0">' + UI.pos(p.pos) + '<a class="player-link" data-go="player/' + p.id + '">' + esc(p.name) + '</a><span class="spacer"></span><b>' + p.skill + '</b></div>').join('') +
      (pv.oppScorers.length ? '<div class="small muted" style="margin-top:8px">Top scorers</div>' + pv.oppScorers.map(p => '<div class="row small" style="padding:2px 0"><a class="player-link" data-go="player/' + p.id + '">' + esc(p.name) + '</a><span class="spacer"></span><b>' + p.goals + '</b></div>').join('') : '');
    const mrows = pv.byMentality.map(m => '<div class="row-m' + (m.mentality === pv.recommended.mentality ? ' best' : '') + (m.mentality === s.tactics.mentality ? ' cur' : '') + '" >' +
      '<button class="btn sm ' + (m.mentality === s.tactics.mentality ? 'primary' : '') + '" data-act="mtMent" data-v="' + m.mentality + '">' + esc(m.label) + '</button>' +
      '<div class="prob" title="Win ' + UI.pct(m.win) + ' · draw ' + UI.pct(m.draw) + ' · loss ' + UI.pct(m.loss) + '"><span style="width:' + m.win * 100 + '%;background:var(--good)"></span><span style="width:' + m.draw * 100 + '%;background:#6b7590"></span><span style="width:' + m.loss * 100 + '%;background:var(--bad)"></span></div>' +
      '<span class="small num">' + UI.pct(m.win) + '</span></div>').join('');
    const advice = '<div class="stack" style="gap:6px;margin-bottom:12px">' + pv.tips.map(t => '<div class="small">• ' + esc(t) + '</div>').join('') + '</div>' +
      '<div class="small" style="margin-bottom:8px">Your assistant simulated the game with every mentality: <b class="good">' + esc(pv.recommended.label) + '</b> gives the best chance (' +
      UI.pct(pv.recommended.win) + ' win, ' + UI.pct(pv.recommended.draw) + ' draw).</div><div class="mentality-table">' + mrows + '</div>' +
      '<div class="legend"><span><i style="background:var(--good)"></i>Win</span><span><i style="background:#6b7590"></i>Draw</span><span><i style="background:var(--bad)"></i>Loss</span><span>Bars: win / draw / loss chance</span></div>';
    const roles = Live.FORMATIONS[s.selection.formation] || Live.FORMATIONS['442'];
    const lineup = '<div class="lineup-list">' + s.selection.xi.map((id, i) => {
      const p = id != null ? uc.players.find(x => x.id === id) : null;
      if (!p) return '<div class="lp"><span class="pos ' + roles[i] + '">' + roles[i] + '</span><span class="bad">Empty</span><span></span><span></span></div>';
      return '<div class="lp"><span class="pos ' + roles[i] + '">' + roles[i] + '</span><span class="ellip">' + UI.playerLink(p, { flag: false }) + (Live.suit(p.pos, roles[i]) < 1 ? ' <span class="tag exp" title="Out of position">' + p.pos + '</span>' : '') + ' ' + UI.tagsFor(p) + '</span>' +
        UI.fitBar(p.fit) + '<b class="num">' + p.skill + '</b></div>';
    }).join('') + '</div><div class="small muted" style="margin-top:8px">Bench: ' + (E.playersByIds(uc, s.selection.subs).map(p => esc(p.surname)).join(', ') || 'none') + '</div>';
    const h2h = pv.h2h.length ? (() => { let w = 0, d = 0, l = 0; pv.h2h.forEach(h => { const a = h.home ? h.hg : h.ag, b = h.home ? h.ag : h.hg; if (a > b) w++; else if (a === b) d++; else l++; }); return 'Head to head: P' + pv.h2h.length + ' W' + w + ' D' + d + ' L' + l; })() : 'You have never played them.';
    const t = opp.tie, firstLeg = t && opp.leg === 1 && t.l1h != null ? '<span class="tag cup">First leg: ' + esc(s.clubs[t.home].name) + ' ' + t.l1h + '-' + t.l1a + ' ' + esc(s.clubs[t.away].name) + '</span>' : '';
    return head +
      '<div class="row" style="margin-bottom:14px">' + UI.compTag(opp.comp, opp.comp === 'league' ? 'League' : null) + firstLeg + '<span class="muted small">' + (opp.home ? 'Home' : 'Away') + ' · expected crowd ' +
      (pv.attendance || 0).toLocaleString('en-GB') + ' · ' + esc(h2h) + '</span><span class="spacer"></span>' +
      (valid < 11 ? '<span class="badge red">' + valid + '/11 fit starters</span>' : '') +
      '<button class="btn" data-act="mtQuick">' + UI.icon('bolt') + ' Quick result</button><button class="btn go lg" data-act="mtKick">' + UI.icon('play') + ' Kick off</button></div>' +
      '<div class="grid cols-3">' + card('Opposition report: ' + esc(pv.opponent), report) + card('Assistant\'s advice', advice) +
      card('Your team · ' + esc(Live.FORMATION_NAMES[s.selection.formation] || ''), lineup + '<div class="row" style="margin-top:12px"><button class="btn sm" data-go="tactics">Edit tactics</button>' +
        '<button class="btn sm" data-act="mtPick" data-v="fresh">Pick Fresh XI</button><button class="btn sm" data-act="mtPick" data-v="best">Pick Best XI</button></div>' +
        '<label class="check small" style="margin-top:10px"><input type="checkbox" data-act="mtAutoSubs"' + (s.tactics.autoSubs !== false ? ' checked' : '') + '> Assistant makes substitutions</label>') + '</div>';
  }
  UI.acts.mtMent = el => { S().tactics.mentality = +el.dataset.v; UI.save(); UI.refresh(); };
  UI.acts.mtPick = el => { const s = S(), b = E.bestXI(E.user(s), { formation: s.selection.formation, mode: el.dataset.v }); s.selection.xi = b.xi; s.selection.subs = b.subs; s.tactics.pickMode = el.dataset.v; UI.save(); UI.refresh(); };
  UI.acts.mtAutoSubs = el => { S().tactics.autoSubs = el.checked; UI.save(); };
  UI.acts.mtKick = () => kickOff(false);
  UI.acts.mtQuick = () => kickOff(true);
  UI.acts.mtForfeit = () => {
    const s = S(), m = E.playUserMatch(s);
    if (!m) return;
    E.commitUserResult(s, m);
    mt = { phase: 'fulltime', key: 'done', forfeit: m, cfg: { home: { name: m.homeName }, away: { name: m.awayName } } };
    UI.flushNotices(); UI.save(); UI.refresh();
  };

  /* ---- kick off ------------------------------------------------------- */
  function teamReady() {
    const s = S(), uc = E.user(s);
    const ids = s.selection.xi.filter(x => x != null);
    return ids.length === 11 && E.playersByIds(uc, ids).every(E.isFit) && new Set(ids).size === 11;
  }
  function kickOff(quick) {
    const s = S();
    if (!E.nextOpponent(s)) return;
    if (E.availablePlayers(E.user(s)).length < 8) { UI.acts.mtForfeit(); return; }
    if (!teamReady()) {
      UI.confirm('Your team is not complete', 'You need 11 fit starters. Let the assistant fill the gaps in your line-up?', 'Fill the gaps').then(ok => {
        if (!ok) return;
        s.selection = E.repairSelection(s, { xi: s.selection.xi.slice(), subs: s.selection.subs.slice(), formation: s.selection.formation }, E.nextOpponent(s));
        UI.save(); kickOff(quick);
      });
      return;
    }
    const lm = E.createLiveMatch(s, { autoTalk: !!quick });
    if (!lm || lm.forfeit) return;
    mt = { phase: 'live', key: dayKey(), live: lm.live, meta: lm.meta, cfg: lm.cfg, userKey: lm.meta.home ? 'home' : 'away', fed: 0, tab: 'feed', paused: false,
      ticker: E.previewOtherResults(s), tickerShown: {}, lastGoalShown: 0 };
    if (quick) { mt.live.runToEnd(); endMatch(); return; }
    UI.render();
  }

  /* ---- live view ------------------------------------------------------ */
  function liveSkeleton() {
    const s = S(), c = mt.cfg;
    const hi = E.clubIndexByName(s, c.home.name), ai = E.clubIndexByName(s, c.away.name);
    return '<div class="scorebar" style="--home:' + c.home.kit[0] + ';--away:' + c.away.kit[0] + '"><div class="team">' + UI.crest(s.clubs[hi], 'lg') + UI.clubLink(hi, { crest: false }) + '</div>' +
      '<div><span class="comp">' + esc(mt.meta.compName) + '</span><div class="score" id="mt-score">0 - 0</div><span class="clock" id="mt-clock">KICK OFF</span><span class="comp" id="mt-agg"></span></div>' +
      '<div class="team away">' + UI.clubLink(ai, { crest: false }) + UI.crest(s.clubs[ai], 'lg') + '</div></div>' +
      '<div class="match-layout"><div class="stack"><div class="card" style="padding:10px"><div class="pitch-wrap"><canvas id="pitch-canvas"></canvas><div id="mt-goal"></div></div>' +
      '<div class="momentum" id="mt-momentum" title="Momentum: who has been attacking"></div>' +
      '<div class="match-ctl"><button class="btn" data-act="mtPause" id="mt-pause">' + UI.icon('pause') + ' Pause</button>' +
      '<div class="seg">' + SPEEDS.map(x => '<button class="' + (x[0] === speed ? 'on' : '') + '" data-act="mtSpeed" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
      '<span class="spacer"></span><button class="btn" data-act="mtSubs" id="mt-subs">' + UI.icon('sub') + ' Substitutions</button><button class="btn" data-act="mtSkip">Skip to full time</button></div>' +
      '<div class="match-ctl"><span class="small muted">Mentality</span><div class="seg" id="mt-ment"></div><label class="check small"><input type="checkbox" data-act="mtLiveAutoSubs"' + (S().tactics.autoSubs !== false ? ' checked' : '') + '> Assistant makes subs</label></div></div></div>' +
      '<div class="card flush"><div class="tabs" style="padding:0 10px;margin-bottom:0" id="mt-tabs">' + [['feed', 'Commentary'], ['stats', 'Stats'], ['ratings', 'Ratings'], ['scores', 'Other scores']].map(t =>
        '<a class="tab' + (t[0] === mt.tab ? ' active' : '') + '" data-act="mtTab" data-v="' + t[0] + '">' + t[1] + '</a>').join('') + '</div><div id="mt-panel" style="padding:12px 14px"></div></div></div>';
  }
  function mountLive() {
    const s = S(), c = mt.cfg;
    if (mt.renderer) mt.renderer.destroy();
    mt.renderer = Pitch.create($('#pitch-canvas'), { home: { kit: c.home.kit, formation: c.home.formation }, away: { kit: c.away.kit, formation: c.away.formation } });
    syncPlayers();
    mt.feedEl = null;
    updateAll(true);
    startLoop();
  }
  function syncPlayers() {
    const st = mt.live.state();
    ['home', 'away'].forEach(k => {
      const list = [];
      const bySlot = {};
      st[k].lineup.forEach(p => { if (!p.off) bySlot[p.slot] = p; });
      Object.keys(bySlot).forEach(sl => { const p = bySlot[sl]; list.push({ slot: +sl, role: p.role, num: +sl + 1, name: p.short, off: false }); });
      mt.renderer.setPlayers(k, list);
    });
  }
  function startLoop() {
    stopLoop();
    const ms_ = (SPEEDS.find(x => x[0] === speed) || SPEEDS[1])[2];
    mt.timer = setInterval(tick, ms_);
  }
  function stopLoop() { if (mt && mt.timer) { clearInterval(mt.timer); mt.timer = null; } }
  function tick() {
    if (!mt || mt.phase !== 'live' || mt.paused) return;
    const lv = mt.live;
    if (lv.halfTime) { stopLoop(); mt.renderer.freeze('HALF TIME'); updateAll(); openTalk(); return; }
    if (lv.finished) { endMatch(); return; }
    const prev = { hg: lv.score.hg, ag: lv.score.ag };
    const evs = lv.step();
    const ms_ = (SPEEDS.find(x => x[0] === speed) || SPEEDS[1])[2];
    if (evs.some(e => e.type === 'sub' || e.type === 'red')) syncPlayers();
    mt.renderer.minute({ poss: lv.poss, events: evs, duration: ms_ * 0.95, attack: lv.momentum[lv.momentum.length - 1] !== 0 });
    const goal = evs.find(e => e.type === 'goal');
    const inj = evs.find(e => e.type === 'injury' && e.side === mt.userKey);
    if (goal) {
      // keep the scoreboard (and commentary) quiet until the ball is in the net, then let the moment breathe
      mt.shown = prev;
      setTimeout(() => { if (!mt || mt.phase !== 'live') return; mt.shown = null; showGoal(goal); updateAll(); }, ms_ * 0.8);
      if (speed <= 4) { stopLoop(); setTimeout(() => { if (mt && mt.phase === 'live' && !mt.paused) startLoop(); }, ms_ + 1400); }
    } else mt.shown = null;
    updateAll();
    if (inj) {
      const me = lv.state()[mt.userKey].lineup.find(p => p.id === inj.playerId);
      if (me && me.needsSub) { mt.paused = true; UI.toast(me.name + ' is injured — make a substitution.', 'bad'); openSubs(); }
    }
    if (lv.finished) endMatch();
  }
  function showGoal(g) {
    const box = $('#mt-goal'); if (!box) return;
    const side = mt.cfg[g.side];
    const mine = side.isUser;
    box.innerHTML = '<div class="goal-flash" style="color:' + (mine ? '#fff' : '#ffd0d0') + '">GOAL!<div style="font-size:18px;font-weight:700;margin-top:-10px">' + esc(g.scorer || '') + '</div></div>';
  }
  function clockText() {
    const lv = mt.live;
    if (lv.finished) return 'FULL TIME';
    if (lv.halfTime) return 'HALF TIME';
    return lv.minute + "'" + (lv.extraTime ? ' ET' : '');
  }
  function updateAll() {
    if (!mt || !$('#mt-score')) return;
    const lv = mt.live, sc = mt.shown || lv.score, st = lv.state();
    $('#mt-score').textContent = sc.hg + ' - ' + sc.ag;
    $('#mt-clock').textContent = clockText();
    const t = mt.meta.tie;
    if (t && mt.meta.leg === 1 && t.l1h != null) $('#mt-agg').textContent = 'Aggregate ' + (sc.hg + t.l1a) + '-' + (sc.ag + t.l1h);
    // mentality control
    const um = st[mt.userKey].mentality;
    $('#mt-ment').innerHTML = [[-2, 'V.Def'], [-1, 'Def'], [0, 'Bal'], [1, 'Att'], [2, 'V.Att']].map(x => '<button class="' + (x[0] === um ? 'on' : '') + '" data-act="mtLiveMent" data-v="' + x[0] + '">' + x[1] + '</button>').join('');
    $('#mt-subs').innerHTML = UI.icon('sub') + ' Subs (' + st[mt.userKey].subsLeft + ' left)';
    $('#mt-pause').innerHTML = mt.paused ? UI.icon('play') + ' Resume' : UI.icon('pause') + ' Pause';
    // momentum (last 30 minutes)
    const mom = lv.momentum.slice(-30), hk = mt.cfg.home.kit[0], ak = mt.cfg.away.kit[0];
    $('#mt-momentum').innerHTML = mom.map(v => '<i style="height:' + (v ? 100 : 18) + '%;background:' + (v > 0 ? hk : v < 0 ? ak : '#2a3550') + ';align-self:' + (v < 0 ? 'flex-end' : v > 0 ? 'flex-start' : 'center') + '"></i>').join('');
    renderPanel(st);
    UI.renderShell();
  }
  function renderPanel(st) {
    const p = $('#mt-panel'); if (!p) return;
    const lv = mt.live;
    if (mt.tab === 'feed') {
      const f = lv.feed.filter(x => x.text && !(mt.shown && x.minute >= lv.minute));
      p.innerHTML = '<div class="feed">' + f.slice().reverse().map(x => '<div class="ln ' + x.type + '"><span class="m">' + (x.minute ? x.minute + "'" : '') + '</span><span class="t">' + esc(x.text) + '</span></div>').join('') + '</div>';
    } else if (mt.tab === 'stats') {
      const s = st.stats, hk = mt.cfg.home.kit[0], ak = mt.cfg.away.kit[0];
      const line = (lab, a, b, fmt) => { const t = (a + b) || 1; return '<div class="statline" style="--home:' + hk + ';--away:' + ak + '"><b class="num">' + (fmt ? fmt(a) : a) + '</b><div><div class="lab">' + lab + '</div><div class="bars"><span><i style="width:' + (a / t * 100) + '%"></i></span><span><i style="width:' + (b / t * 100) + '%"></i></span></div></div><b>' + (fmt ? fmt(b) : b) + '</b></div>'; };
      p.innerHTML = line('Possession %', s.possHome, s.possAway) + line('Shots', s.shotsHome, s.shotsAway) + line('On target', s.sotHome, s.sotAway) +
        line('Expected goals', s.xgHome, s.xgAway, v => v.toFixed(2)) + line('Corners', s.cornersHome, s.cornersAway) + line('Fouls', s.foulsHome, s.foulsAway) +
        line('Yellow cards', s.yellowsHome, s.yellowsAway) + line('Red cards', s.redsHome, s.redsAway);
    } else if (mt.tab === 'ratings') {
      const col = k => '<div><div class="bold small" style="margin-bottom:6px">' + UI.meName(st[k].name) + '</div><div class="lineup-list">' + st[k].lineup.map(x => '<div class="lp' + (x.off ? ' off' : '') + '"><span class="pos ' + x.role + '">' + x.role + '</span><span class="ellip">' +
        esc(x.short) + (x.goals ? ' ⚽' + (x.goals > 1 ? '×' + x.goals : '') : '') + (x.yc ? ' <span class="tag ban">Y</span>' : '') + (x.rc ? ' <span class="tag inj">R</span>' : '') + (x.injured ? ' <span class="tag inj">Inj</span>' : '') +
        (x.cameOn ? ' <span class="tiny good">' + x.cameOn + "'</span>" : '') + '</span>' + UI.fitBar(x.cond) + UI.rating(x.rating) + '</div>').join('') + '</div></div>';
      p.innerHTML = '<div class="grid cols-2">' + col('home') + col('away') + '</div>';
    } else {
      const m = mt.live.minute;
      if (!mt.ticker.length) { p.innerHTML = '<div class="muted small">No other matches in your competition today.</div>'; return; }
      p.innerHTML = '<div class="ticker">' + mt.ticker.map((g, i) => {
        const h = g.goals.filter(x => x.side === 'home' && x.minute <= m).length, a = g.goals.filter(x => x.side === 'away' && x.minute <= m).length;
        const key = h + '-' + a, flash = mt.tickerShown[i] != null && mt.tickerShown[i] !== key;
        mt.tickerShown[i] = key;
        return '<div class="tk' + (flash ? ' flash' : '') + '"><span class="h ellip">' + UI.meName(g.home) + '</span><span class="sc">' + key + '</span><span class="ellip">' + UI.meName(g.away) + '</span></div>';
      }).join('') + '</div>';
    }
  }
  UI.acts.mtTab = el => { mt.tab = el.dataset.v; document.querySelectorAll('#mt-tabs .tab').forEach(t => t.classList.toggle('active', t.dataset.v === mt.tab)); renderPanel(mt.live.state()); };
  UI.acts.mtPause = () => { mt.paused = !mt.paused; if (!mt.paused && !mt.timer && !mt.live.halfTime) startLoop(); updateAll(); };
  UI.acts.mtSpeed = el => {
    speed = +el.dataset.v; try { localStorage.setItem('simsoc6.speed', String(speed)); } catch (e) { /* ignore */ }
    document.querySelectorAll('.match-ctl .seg button[data-act="mtSpeed"]').forEach(b => b.classList.toggle('on', +b.dataset.v === speed));
    if (mt && mt.timer) startLoop();
  };
  UI.acts.mtSkip = () => skipToEnd();
  UI.acts.mtLiveMent = el => { mt.live.setMentality(mt.userKey, +el.dataset.v); S().tactics.mentality = +el.dataset.v; updateAll(); };
  UI.acts.mtLiveAutoSubs = el => { mt.live.setAutoSubs(mt.userKey, el.checked); S().tactics.autoSubs = el.checked; };
  UI.acts.mtSubs = () => openSubs();

  function openSubs() {
    const st = mt.live.state()[mt.userKey];
    if (st.subsLeft <= 0) { UI.toast('You have used all your substitutions.'); if (mt.paused && !mt.live.halfTime) { mt.paused = false; updateAll(); } return; }
    const wasPaused = mt.paused; mt.paused = true;
    const on = st.lineup.filter(p => !p.off), bench = st.bench;
    const need = on.find(p => p.needsSub);
    UI.modal({ title: 'Substitution (' + st.subsLeft + ' left)', body:
      '<div class="grid cols-2"><label class="field"><span>Take off</span><select class="input" id="sub-off">' + on.map(p => '<option value="' + p.id + '"' + (need && need.id === p.id ? ' selected' : '') + '>' + esc(p.role + ' · ' + p.name + ' (' + p.rating.toFixed(1) + ', fit ' + p.cond + '%)' + (p.injured ? ' — INJURED' : '')) + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>Bring on</span><select class="input" id="sub-on">' + bench.map(p => '<option value="' + p.id + '">' + esc(p.pos + ' · ' + p.name + ' (skill ' + p.skill + ')') + '</option>').join('') + '</select></label></div>' +
      '<p class="small muted">The substitute takes over the same position on the pitch.</p>',
      buttons: [{ label: 'Cancel', cls: 'ghost', onClick: () => { mt.paused = wasPaused && !need; updateAll(); } },
        { label: 'Make substitution', primary: true, onClick: () => {
          const r = mt.live.substitute(mt.userKey, +$('#sub-off').value, +$('#sub-on').value);
          if (!r.ok) UI.toast(r.msg, 'bad'); else syncPlayers();
          mt.paused = wasPaused && false; updateAll();
        } }] });
  }

  /* ---- half-time team talk ------------------------------------------- */
  function openTalk() {
    const lv = mt.live, sc = lv.score, us = mt.userKey === 'home' ? sc.hg - sc.ag : sc.ag - sc.hg;
    const sit = us > 0 ? 'You lead ' + Math.max(sc.hg, sc.ag) + '-' + Math.min(sc.hg, sc.ag) + ' at the break.' : us < 0 ? 'You trail ' + Math.min(sc.hg, sc.ag) + '-' + Math.max(sc.hg, sc.ag) + ' at the break.' : 'It is level at ' + sc.hg + '-' + sc.ag + ' at half-time.';
    let close = null;
    const talk = kind => {
      const r = lv.teamTalk(kind);
      if (close) close();
      if (r.ok) UI.toast(r.text, r.effect >= 0.015 ? 'good' : r.effect < -0.005 ? 'bad' : '');
      mt.renderer.freeze(false); mt.paused = false; updateAll(); startLoop();
    };
    UI._talk = talk;
    close = UI.modal({ title: 'Half-time team talk', dismiss: false, body: '<p style="margin-top:0">' + esc(sit) + ' What do you tell the players?</p><div class="talk-opts">' +
      [['praise', 'Praise', 'Well done — keep it up. Best when you are ahead.'], ['encourage', 'Encourage', 'Calm, positive words. Rarely goes wrong.'],
        ['demand', 'Demand more', 'Fire them up. Works when a better side is not winning.'], ['calm', 'Calm down', 'Keep heads cool to protect a lead.']]
        .map(o => '<button data-act="mtTalk" data-v="' + o[0] + '"><b>' + o[1] + '</b><span class="small muted">' + o[2] + '</span></button>').join('') + '</div>',
      buttons: [{ label: 'Encourage (default)', primary: true, onClick: () => { talk('encourage'); return false; } }] });
  }
  UI.acts.mtTalk = el => { if (UI._talk) UI._talk(el.dataset.v); };

  /* ---- end of the match ---------------------------------------------- */
  function skipToEnd() {
    if (!mt || mt.phase !== 'live') return;
    stopLoop();
    const bd = document.querySelector('#modal-root .backdrop'); if (bd) bd.remove(); UI._modalPrimary = null;
    if (mt.live.halfTime) mt.live.teamTalk('encourage');
    mt.live.runToEnd();
    endMatch();
  }
  function commit() {
    if (mt.committed) return;
    const s = S();
    const match = E.liveToMatch(s, mt.meta, mt.live);
    E.commitUserResult(s, match);
    mt.committed = true; mt.match = match;
    UI.save();
  }
  function endMatch() {
    stopLoop();
    if (mt.renderer) { mt.renderer.destroy(); mt.renderer = null; }
    commit();
    mt.phase = 'fulltime';
    UI.flushNotices();
    UI.render();
  }
  function finishAndLeave() {
    mt = null;
    UI.go('roundup');
  }
  function fullTimeView() {
    const s = S();
    if (mt.forfeit) {
      const m = mt.forfeit;
      return '<div class="scorebar"><div class="team">' + UI.clubByName(m.homeName) + '</div><div><div class="score">' + m.hg + ' - ' + m.ag + '</div><span class="clock">WALKOVER</span></div><div class="team away">' + UI.clubByName(m.awayName) + '</div></div>' +
        card('', '<p>You could not field eight fit players, so the match was awarded to your opponents.</p><button class="btn go" data-act="mtDone">Continue ▸</button>');
    }
    const r = mt.live.result(), st = mt.live.state(), c = mt.cfg;
    const hi = E.clubIndexByName(s, c.home.name), ai = E.clubIndexByName(s, c.away.name);
    const scorers = side => r.events.filter(e => e.side === side).map(e => esc(e.scorer.split(' ').slice(-1)[0]) + ' ' + e.minute + "'" + (e.pen ? ' (pen)' : '')).join(', ') || '&nbsp;';
    const us = mt.userKey, gf = us === 'home' ? r.hg : r.ag, ga = us === 'home' ? r.ag : r.hg;
    const verdict = gf > ga ? '<span class="good">Victory!</span>' : gf === ga ? 'A draw.' : '<span class="bad">Defeat.</span>';
    const lr = s.lastResult || {};
    const tieNote = lr.winnerName ? '<div class="small" style="margin-top:6px">' + (lr.agg ? 'Aggregate ' + esc(lr.agg) + ' · ' : '') + UI.meName(lr.winnerName) + ' go through' + (lr.pens ? ' on penalties' : '') + '</div>' : '';
    const shoot = r.shootout ? '<div class="small" style="margin-top:6px">Penalties: ' + r.shootout.home + '-' + r.shootout.away + '</div>' : '';
    const rat = k => st[k].lineup.slice().sort((a, b) => b.rating - a.rating).map(x => '<div class="lp' + (x.off && !x.cameOn ? '' : '') + '"><span class="pos ' + x.role + '">' + x.role + '</span><span class="ellip">' +
      '<a class="player-link" data-go="player/' + x.id + '">' + esc(x.name) + '</a>' + (x.goals ? ' ⚽' + (x.goals > 1 ? '×' + x.goals : '') : '') + (x.assists ? ' <span class="tiny muted">A' + x.assists + '</span>' : '') + '</span><span></span>' + UI.rating(x.rating) + '</div>').join('');
    const sts = r.stats;
    const statRow = (l, a, b) => '<tr><td class="num">' + a + '</td><td class="center muted small">' + l + '</td><td>' + b + '</td></tr>';
    return '<div class="scorebar"><div class="team">' + UI.crest(s.clubs[hi], 'lg') + UI.clubLink(hi, { crest: false }) + '</div><div><span class="comp">' + esc(mt.meta.compName) + '</span>' +
      '<div class="score">' + r.hg + ' - ' + r.ag + '</div><span class="clock">' + (r.extraTime ? 'AFTER EXTRA TIME' : 'FULL TIME') + '</span></div><div class="team away">' + UI.clubLink(ai, { crest: false }) + UI.crest(s.clubs[ai], 'lg') + '</div></div>' +
      '<div class="row small muted" style="margin:-4px 0 14px"><span style="flex:1;text-align:right">' + scorers('home') + '</span><span style="width:60px"></span><span style="flex:1">' + scorers('away') + '</span></div>' +
      '<div class="grid cols-3">' + card('Result', '<div style="font-size:22px;font-weight:800">' + verdict + '</div>' + tieNote + shoot +
        (r.potm ? '<div style="margin-top:12px" class="small muted">Player of the match</div><div class="bold">' + esc(r.potm.name) + ' ' + UI.rating(r.potm.rating) + '</div>' : '') +
        '<div style="margin-top:16px"><button class="btn go lg" data-act="mtDone">Continue ▸</button></div>') +
      card('Match stats', '<table class="tbl compact"><tbody>' + statRow('Possession %', sts.possHome, sts.possAway) + statRow('Shots', sts.shotsHome, sts.shotsAway) + statRow('On target', sts.sotHome, sts.sotAway) +
        statRow('xG', sts.xgHome.toFixed(2), sts.xgAway.toFixed(2)) + statRow('Corners', sts.cornersHome, sts.cornersAway) + statRow('Fouls', sts.foulsHome, sts.foulsAway) +
        statRow('Bookings', sts.yellowsHome, sts.yellowsAway) + statRow('Sent off', sts.redsHome, sts.redsAway) + '</tbody></table>') +
      card('Player ratings — ' + UI.meName(st[us].name), '<div class="lineup-list">' + rat(us) + '</div>') + '</div>' +
      '<div style="height:16px"></div>' + card('Match report', '<div class="feed" style="height:260px">' + r.feed.slice().reverse().map(x => '<div class="ln ' + x.type + '"><span class="m">' + (x.minute ? x.minute + "'" : '') + '</span><span class="t">' + esc(x.text) + '</span></div>').join('') + '</div>');
  }
  UI.acts.mtDone = () => finishAndLeave();
})();
