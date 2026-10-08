/* Quota Quest - motore di gioco. Logica pura, nessun accesso al DOM.
   Browser: window.QQ   |   Node: require('./engine.js') */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QQ = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PH = /\{\{([^{}]*)\}\}/g;
  var INTERVALS = [0, 1, 3, 7, 16, 35]; // giorni di attesa per box Leitner
  var MAX_BOX = 5;
  var HEARTS = { lesson: 3, roleplay: 3, boss: 5, review: 5, practice: 5 };

  /* ------------------------------------------------------------ utilità */
  function iso(d) {
    d = d || new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  function parseISO(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); }
  function diffDays(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 86400000); }
  function addDays(s, n) { var d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); }
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, r) {
    r = r || Math.random;
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }
  function sameSet(a, b) {
    if (a.length !== b.length) return false;
    var s = a.slice().sort(), t = b.slice().sort();
    for (var i = 0; i < s.length; i++) if (s[i] !== t[i]) return false;
    return true;
  }
  function worldOf(id) { return String(id).split('-')[0]; }

  /* -------------------------------------------------------------- fatti */
  function fill(s, facts, used) {
    if (typeof s !== 'string') return s;
    return s.replace(PH, function (_, k) {
      k = k.trim();
      var f = facts[k];
      if (!f) return '[dato mancante]';
      if (used) used[k] = 1;
      return f.value;
    });
  }
  /* ok | soon (scade entro 14 giorni) | stale (oltre staleAfter) | missing */
  function factStatus(f, today) {
    if (!f) return 'missing';
    if (today > f.staleAfter) return 'stale';
    if (diffDays(today, f.staleAfter) <= 14) return 'soon';
    return 'ok';
  }
  function contentStatus(bundle, today) {
    var out = { total: 0, ok: 0, soon: 0, stale: 0, byConf: { primary: 0, secondary: 0, low: 0 }, stale_list: [], soon_list: [] };
    Object.keys(bundle.facts).forEach(function (k) {
      var f = bundle.facts[k], s = factStatus(f, today);
      out.total++; out[s]++;
      out.byConf[f.confidence] = (out.byConf[f.confidence] || 0) + 1;
      if (s === 'stale') out.stale_list.push(k);
      if (s === 'soon') out.soon_list.push(k);
    });
    return out;
  }

  /* ------------------------------------------------- preparare esercizi */
  /* Trasforma un esercizio del bundle in una versione pronta da giocare:
     segnaposto sostituiti, opzioni mescolate, funzione grade() per correggere. */
  function prepare(ex, facts, r) {
    r = r || Math.random;
    var used = {};
    var F = function (s) { return fill(s, facts, used); };
    var o = {
      id: ex.id, t: ex.t, diff: ex.diff || null,
      q: F(ex.q || (ex.t === 'match' ? 'Abbina gli elementi' : '')),
      exp: F(ex.exp),
      ctx: ex.ctx ? { who: F(ex.ctx.who), say: F(ex.ctx.say) } : null
    };
    var n, perm, i;
    switch (ex.t) {
      case 'mcq': case 'fill': case 'multi':
        perm = shuffle(range(ex.o.length), r);
        o.options = perm.map(function (p) { return F(ex.o[p]); });
        var right = ex.t === 'multi' ? ex.a : [ex.a];
        o.correctIdx = perm.map(function (p, d) { return right.indexOf(p) >= 0 ? d : -1; }).filter(function (d) { return d >= 0; });
        o.solution = o.correctIdx.map(function (d) { return o.options[d]; });
        o.grade = ex.t === 'multi'
          ? function (sel) { return { ok: sameSet(sel, o.correctIdx) }; }
          : function (sel) { return { ok: o.correctIdx[0] === sel }; };
        break;
      case 'tf':
        o.solution = [ex.a ? 'Vero' : 'Falso'];
        o.grade = function (v) { return { ok: v === ex.a }; };
        break;
      case 'match':
        n = ex.pairs.length;
        var li = shuffle(range(n), r), ri = shuffle(range(n), r);
        o.left = li.map(function (p) { return F(ex.pairs[p][0]); });
        o.right = ri.map(function (p) { return F(ex.pairs[p][1]); });
        o.leftOrig = li; o.rightOrig = ri;
        o.isPair = function (l, rr) { return li[l] === ri[rr]; };
        o.solution = ex.pairs.map(function (p) { return F(p[0]) + '  →  ' + F(p[1]); });
        o.grade = function (pairs) {
          var wrong = pairs.filter(function (p) { return !o.isPair(p[0], p[1]); });
          return { ok: pairs.length === n && wrong.length === 0, wrong: wrong };
        };
        break;
      case 'order':
        n = ex.items.length;
        var tries = 0;
        do { perm = shuffle(range(n), r); tries++; }
        while (tries < 6 && perm.every(function (p, d) { return p === d; }));
        o.items = perm.map(function (p) { return F(ex.items[p]); });
        o.itemOrig = perm;
        o.solution = ex.items.map(function (s, k) { return (k + 1) + '. ' + F(s); });
        o.grade = function (seq) {
          var wrong = [];
          seq.forEach(function (d, pos) { if (perm[d] !== pos) wrong.push(pos); });
          return { ok: seq.length === n && wrong.length === 0, wrong: wrong };
        };
        break;
      case 'bucket':
        n = ex.items.length;
        perm = shuffle(range(n), r);
        o.buckets = ex.buckets.map(F);
        o.items = perm.map(function (p) { return F(ex.items[p][0]); });
        o.itemBucket = perm.map(function (p) { return ex.items[p][1]; });
        o.solution = ex.buckets.map(function (b, bi) {
          return F(b) + ': ' + ex.items.filter(function (it) { return it[1] === bi; }).map(function (it) { return F(it[0]); }).join('; ');
        });
        o.grade = function (assign) {
          var wrong = [];
          assign.forEach(function (b, d) { if (b !== o.itemBucket[d]) wrong.push(d); });
          return { ok: assign.length === n && wrong.length === 0, wrong: wrong };
        };
        break;
      default:
        throw new Error('tipo esercizio sconosciuto: ' + ex.t);
    }
    o.factKeys = Object.keys(used);
    o.fresh = function () { return prepare(ex, facts, r); };
    return o;
  }

  /* ------------------------------------------------------------ sessione */
  /* Coda di esercizi con cuori. Un errore rimette l'esercizio in fondo alla coda
     (come Duolingo): per completare il livello bisogna rispondere giusto. */
  function Session(exercises, kind) {
    this.kind = kind || 'lesson';
    this.queue = exercises.slice();
    this.total = exercises.length;
    this.maxHearts = HEARTS[this.kind] != null ? HEARTS[this.kind] : 3;
    this.hearts = this.maxHearts;
    this.rec = {};            // id -> {first: bool, tries: n}
    this.firstTry = 0;        // risposte giuste al primo colpo
    this.mistakes = 0;        // esercizi sbagliati almeno una volta
    this.failed = false;
    this.log = [];            // [{id, ok, first}] per SRS e statistiche
  }
  Session.prototype.current = function () { return this.queue[0] || null; };
  Session.prototype.done = function () { return this.failed || this.queue.length === 0; };
  Session.prototype.progress = function () {
    var solved = this.total - this.queue.length;
    return this.total ? solved / this.total : 1;
  };
  Session.prototype.submit = function (ok) {
    var cur = this.queue.shift();
    var r = this.rec[cur.id] || (this.rec[cur.id] = { first: true, tries: 0 });
    r.tries++;
    var isFirst = r.tries === 1;
    this.log.push({ id: cur.id, ok: ok, first: isFirst });
    if (ok) {
      if (isFirst) this.firstTry++;
    } else {
      if (isFirst) {
        this.mistakes++;
        this.hearts = Math.max(0, this.hearts - 1);
        if (this.hearts === 0) this.failed = true;
      }
      r.first = false;
      this.queue.push(cur.fresh ? cur.fresh() : cur);
    }
    return { ok: ok, heartsLeft: this.hearts, failed: this.failed, finished: this.done() };
  };
  Session.prototype.accuracy = function () { return this.total ? this.firstTry / this.total : 1; };
  Session.prototype.stars = function () {
    if (this.failed) return 0;
    var m = this.mistakes;
    if (this.kind === 'boss') return m <= 1 ? 3 : m <= 3 ? 2 : 1;
    return m === 0 ? 3 : m === 1 ? 2 : 1;
  };
  Session.prototype.xp = function (replay) {
    if (this.failed) return Math.round(this.firstTry);
    var base;
    if (this.kind === 'review' || this.kind === 'practice') base = 3 + this.firstTry;
    else base = (this.kind === 'boss' ? 25 : 10) + 2 * this.firstTry + (this.stars() === 3 ? 5 : 0);
    return replay ? Math.max(1, Math.floor(base / 2)) : base;
  };

  /* --------------------------------------------------------------- stato */
  function newState() {
    return {
      v: 1, updatedAt: 0, name: '',
      xp: 0,
      streak: { count: 0, best: 0, last: null, freezes: 1 },
      daily: { date: null, xp: 0, goal: 30 },
      levels: {},                 // levelId -> {stars, plays, skipped?}
      srs: {},                    // exId -> [box, dueISO, lapses]
      acc: {},                    // worldId -> [giuste, totali]
      assessment: null,           // {date, results:{wid:{score,answers}}, credited:[levelId]}
      badges: {},                 // id -> data
      stats: { answered: 0, correct: 0, reviews: 0, sessions: 0 },
      settings: { sound: true, theme: 'auto' }
    };
  }
  function migrate(s) {
    var base = newState();
    if (!s || typeof s !== 'object') return base;
    var out = {};
    Object.keys(base).forEach(function (k) {
      var b = base[k], v = s[k];
      if (b && typeof b === 'object' && !Array.isArray(b)) out[k] = Object.assign({}, b, v && typeof v === 'object' ? v : {});
      else out[k] = v === undefined ? b : v;
    });
    if (s.assessment) out.assessment = s.assessment;
    return out;
  }
  function touchActivity(st, xpGained, today) {
    st.xp += xpGained;
    if (st.daily.date !== today) { st.daily.date = today; st.daily.xp = 0; }
    st.daily.xp += xpGained;
    var s = st.streak;
    if (s.last !== today) {
      var gap = s.last ? diffDays(s.last, today) : null;
      if (gap === 1) s.count++;
      else if (gap === 2 && s.freezes > 0) { s.freezes--; s.count++; }
      else s.count = 1;
      s.last = today;
      if (s.count > s.best) s.best = s.count;
      if (s.count > 0 && s.count % 7 === 0 && s.freezes < 2) s.freezes++;
    }
  }
  function streakAlive(st, today) {
    var s = st.streak;
    if (!s.last) return false;
    var gap = diffDays(s.last, today);
    return gap <= 1 || (gap === 2 && s.freezes > 0);
  }
  function recordAnswers(st, log, today) {
    log.forEach(function (e) {
      st.stats.answered++;
      if (e.ok) st.stats.correct++;
      var w = worldOf(e.id), a = st.acc[w] || (st.acc[w] = [0, 0]);
      a[1]++; if (e.ok) a[0]++;
      // SRS: aggiorna con il primo tentativo; i ritentativi non alzano il box
      if (e.first) srsRecord(st, e.id, e.ok, today);
    });
  }

  /* ----------------------------------------------------------------- SRS */
  function srsRecord(st, id, ok, today) {
    var cur = st.srs[id] || [0, today, 0];
    var box = cur[0], lapses = cur[2];
    if (ok) box = Math.min(MAX_BOX, box + 1);
    else { box = Math.max(0, box - 2); lapses++; }
    st.srs[id] = [box, ok ? addDays(today, INTERVALS[box]) : today, lapses];
  }
  function dueIds(st, today, limit) {
    var arr = Object.keys(st.srs).filter(function (id) { return st.srs[id][1] <= today; });
    arr.sort(function (a, b) {
      var x = st.srs[a], y = st.srs[b];
      return x[0] - y[0] || (x[1] < y[1] ? -1 : x[1] > y[1] ? 1 : 0);
    });
    return limit ? arr.slice(0, limit) : arr;
  }

  /* ------------------------------------------------------ indice contenuti */
  function buildIndex(bundle) {
    var idx = { ex: {}, level: {}, world: {}, worldOfLevel: {} };
    bundle.worlds.forEach(function (w) {
      idx.world[w.id] = w;
      w.levels.forEach(function (lv, i) {
        idx.level[lv.id] = lv;
        idx.worldOfLevel[lv.id] = w.id;
        lv.ex.forEach(function (e) { idx.ex[e.id] = { ex: e, world: w.id, level: lv.id }; });
      });
    });
    Object.keys(bundle.assessment || {}).forEach(function (wid) {
      bundle.assessment[wid].forEach(function (e) { idx.ex[e.id] = { ex: e, world: wid, level: null }; });
    });
    return idx;
  }

  /* ------------------------------------------------------------- percorso */
  function levelDone(st, lid) { return !!st.levels[lid]; }
  function isUnlocked(world, i, st) { return i === 0 || levelDone(st, world.levels[i - 1].id); }
  function worldProgress(world, st) {
    var done = 0;
    world.levels.forEach(function (lv) { if (levelDone(st, lv.id)) done++; });
    var total = world.levels.length;
    var stars = 0;
    world.levels.forEach(function (lv) { var l = st.levels[lv.id]; if (l) stars += l.stars || 0; });
    return { done: done, total: total, pct: total ? done / total : 0, complete: total > 0 && done === total, stars: stars };
  }
  function firstOpenLevel(world, st) {
    for (var i = 0; i < world.levels.length; i++) if (!levelDone(st, world.levels[i].id)) return i;
    return -1;
  }
  /* Prossimo livello consigliato: nel mondo più debole (da assessment) non finito,
     altrimenti il primo mondo non finito. */
  function nextUp(bundle, st) {
    var order = bundle.worlds.filter(function (w) { return !w.missing && w.levels.length; }).map(function (w) { return w.id; });
    if (st.assessment) {
      var res = st.assessment.results;
      order = order.slice().sort(function (a, b) {
        var sa = res[a] ? res[a].score : 1.5, sb = res[b] ? res[b].score : 1.5;
        return sa - sb || order.indexOf(a) - order.indexOf(b);
      });
    }
    for (var i = 0; i < order.length; i++) {
      var w = bundle.worlds.filter(function (x) { return x.id === order[i]; })[0];
      var li = firstOpenLevel(w, st);
      if (li >= 0) return { world: w, index: li, level: w.levels[li] };
    }
    return null;
  }
  function completeLevel(st, levelId, stars, today) {
    var cur = st.levels[levelId];
    var replay = !!cur && !cur.skipped;
    st.levels[levelId] = {
      stars: Math.max(stars, cur && !cur.skipped ? cur.stars || 0 : 0),
      plays: (cur && cur.plays || 0) + 1
    };
    return replay;
  }

  /* ----------------------------------------------------------- assessment */
  var SCORE_LABEL = ['Da zero', 'Base', 'Operativo', 'Esperto'];
  var CREDIT_SHARE = [0, 0.12, 0.35, 0.7]; // quota di livelli (boss escluso) accreditata

  function Assessment(bundle, r) {
    this.r = r || Math.random;
    this.pool = bundle.assessment;
    var ids = bundle.worlds.filter(function (w) { return !w.missing && bundle.assessment[w.id] && bundle.assessment[w.id].length; })
      .map(function (w) { return w.id; });
    this.order = shuffle(ids, this.r);
    this.per = {};
    ids.forEach(function (w) { this.per[w] = { asked: [], answers: [] }; }, this);
    this.step = 0;                          // 0..2*n
    this.total = ids.length * 2;
    this.cur = null;
  }
  Assessment.prototype.next = function () {
    if (this.step >= this.total) { this.cur = null; return null; }
    var n = this.order.length, wid = this.order[this.step % n];
    var p = this.per[wid], k = p.answers.length;
    var want = k === 0 ? 2 : (p.answers[0] ? 3 : 1);
    var avail = this.pool[wid].filter(function (e) { return p.asked.indexOf(e.id) < 0; });
    var pick = avail.filter(function (e) { return e.diff === want; });
    if (!pick.length) pick = avail;
    var item = pick[Math.floor(this.r() * pick.length)];
    p.asked.push(item.id);
    this.cur = { world: wid, item: item, n: this.step + 1 };
    return this.cur;
  };
  Assessment.prototype.answer = function (ok) {
    this.per[this.cur.world].answers.push(!!ok);
    this.step++;
  };
  Assessment.prototype.results = function () {
    var out = {};
    Object.keys(this.per).forEach(function (w) {
      var a = this.per[w].answers;
      out[w] = { score: a[0] ? (a[1] ? 3 : 2) : (a[1] ? 1 : 0), answers: a.slice() };
    }, this);
    return out;
  };
  function planFromAssessment(results, bundle) {
    var credited = [];
    bundle.worlds.forEach(function (w) {
      var r = results[w.id];
      if (!r || w.missing) return;
      var body = w.levels.filter(function (lv) { return lv.kind !== 'boss'; });
      var k = Math.floor(body.length * CREDIT_SHARE[r.score]);
      for (var i = 0; i < k; i++) credited.push(body[i].id);
    });
    var scores = Object.keys(results).map(function (w) { return results[w].score; });
    var avg = scores.length ? scores.reduce(function (a, b) { return a + b; }, 0) / scores.length : 0;
    var rank = avg < 0.6 ? 'Rookie' : avg < 1.4 ? 'Junior AE' : avg < 2.2 ? 'Account Executive' : avg < 2.7 ? 'Senior AE' : 'Strategic AE';
    var weakest = Object.keys(results).sort(function (a, b) { return results[a].score - results[b].score; }).slice(0, 3);
    return { credited: credited, avg: avg, rank: rank, weakest: weakest };
  }
  function applyAssessment(st, results, bundle, today) {
    var plan = planFromAssessment(results, bundle);
    plan.credited.forEach(function (lid) {
      if (!st.levels[lid]) st.levels[lid] = { stars: 2, plays: 0, skipped: true };
    });
    st.assessment = { date: today, results: results, credited: plan.credited, rank: plan.rank, avg: plan.avg };
    return plan;
  }

  /* ---------------------------------------------------------------- badge */
  var BADGES = [
    { id: 'first', title: 'Primo passo', desc: 'Completa il tuo primo livello', test: function (s, c) { return c.played >= 1; } },
    { id: 'assessed', title: 'Punto di partenza', desc: 'Completa l\'assessment', test: function (s) { return !!s.assessment; } },
    { id: 'perfect', title: 'Zero errori', desc: 'Chiudi un livello a 3 stelle', test: function (s, c) { return c.threeStar >= 1; } },
    { id: 'streak3', title: 'Tre di fila', desc: 'Streak di 3 giorni', test: function (s) { return s.streak.best >= 3; } },
    { id: 'streak7', title: 'Settimana piena', desc: 'Streak di 7 giorni', test: function (s) { return s.streak.best >= 7; } },
    { id: 'streak30', title: 'Mese da top performer', desc: 'Streak di 30 giorni', test: function (s) { return s.streak.best >= 30; } },
    { id: 'boss', title: 'Boss abbattuto', desc: 'Supera il tuo primo boss di mondo', test: function (s, c) { return c.bosses >= 1; } },
    { id: 'world', title: 'Mondo completato', desc: 'Completa tutti i livelli di un mondo', test: function (s, c) { return c.worldsDone >= 1; } },
    { id: 'reviewer', title: 'Memoria d\'acciaio', desc: 'Completa 5 sessioni di ripasso', test: function (s) { return s.stats.reviews >= 5; } },
    { id: 'xp500', title: '500 XP', desc: 'Raggiungi 500 XP', test: function (s) { return s.xp >= 500; } },
    { id: 'xp2500', title: '2.500 XP', desc: 'Raggiungi 2.500 XP', test: function (s) { return s.xp >= 2500; } },
    { id: 'xp10000', title: '10.000 XP', desc: 'Raggiungi 10.000 XP', test: function (s) { return s.xp >= 10000; } },
    { id: 'lv50', title: '50 livelli', desc: 'Gioca 50 livelli', test: function (s, c) { return c.played >= 50; } },
    { id: 'lv100', title: '100 livelli', desc: 'Gioca 100 livelli', test: function (s, c) { return c.played >= 100; } },
    { id: 'lv200', title: 'Quota raggiunta', desc: 'Gioca 200 livelli', test: function (s, c) { return c.played >= 200; } }
  ];
  function badgeContext(st, bundle) {
    var c = { played: 0, threeStar: 0, bosses: 0, worldsDone: 0 };
    Object.keys(st.levels).forEach(function (id) {
      var l = st.levels[id];
      if (l.skipped) return;
      c.played++;
      if (l.stars === 3) c.threeStar++;
    });
    bundle.worlds.forEach(function (w) {
      if (!w.levels.length) return;
      var boss = w.levels[w.levels.length - 1];
      if (st.levels[boss.id] && !st.levels[boss.id].skipped) c.bosses++;
      if (worldProgress(w, st).complete) c.worldsDone++;
    });
    return c;
  }
  function evaluateBadges(st, bundle, today) {
    var ctx = badgeContext(st, bundle), fresh = [];
    BADGES.forEach(function (b) {
      if (!st.badges[b.id] && b.test(st, ctx)) { st.badges[b.id] = today; fresh.push(b); }
    });
    return fresh;
  }

  /* ----------------------------------------------- export/import progressi */
  function toB64(str) {
    if (typeof Buffer !== 'undefined') return Buffer.from(str, 'utf8').toString('base64');
    return btoa(unescape(encodeURIComponent(str)));
  }
  function fromB64(b64) {
    if (typeof Buffer !== 'undefined') return Buffer.from(b64, 'base64').toString('utf8');
    return decodeURIComponent(escape(atob(b64)));
  }
  function exportCode(st) { return 'QQ1.' + toB64(JSON.stringify(st)); }
  function importCode(code) {
    code = String(code || '').trim();
    if (code.indexOf('QQ1.') !== 0) throw new Error('Codice non riconosciuto');
    var obj = JSON.parse(fromB64(code.slice(4)));
    if (!obj || obj.v !== 1 || typeof obj.levels !== 'object') throw new Error('Codice non valido');
    return migrate(obj);
  }

  return {
    iso: iso, parseISO: parseISO, diffDays: diffDays, addDays: addDays, rng: rng, shuffle: shuffle, worldOf: worldOf,
    fill: fill, factStatus: factStatus, contentStatus: contentStatus,
    prepare: prepare, Session: Session, HEARTS: HEARTS,
    newState: newState, migrate: migrate, touchActivity: touchActivity, streakAlive: streakAlive, recordAnswers: recordAnswers,
    srsRecord: srsRecord, dueIds: dueIds, INTERVALS: INTERVALS,
    buildIndex: buildIndex, levelDone: levelDone, isUnlocked: isUnlocked, worldProgress: worldProgress,
    firstOpenLevel: firstOpenLevel, nextUp: nextUp, completeLevel: completeLevel,
    Assessment: Assessment, planFromAssessment: planFromAssessment, applyAssessment: applyAssessment,
    SCORE_LABEL: SCORE_LABEL, CREDIT_SHARE: CREDIT_SHARE,
    BADGES: BADGES, evaluateBadges: evaluateBadges, badgeContext: badgeContext,
    exportCode: exportCode, importCode: importCode
  };
});
