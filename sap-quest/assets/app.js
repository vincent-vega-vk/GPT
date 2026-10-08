/* Quota Quest - interfaccia. Dipende da window.SQ_DATA (data/bundle.js) e window.QQ (engine.js). */
(function () {
  'use strict';
  var D = window.SQ_DATA, QQ = window.QQ;
  var root = document.getElementById('app');
  if (!root) return;
  if (!D || !QQ) { root.textContent = 'Impossibile caricare i dati del gioco.'; return; }

  var IDX = QQ.buildIndex(D);
  var FACTS = D.facts || {};
  var WORLDS = D.worlds;
  var PLAYABLE = WORLDS.filter(function (w) { return !w.missing && w.levels.length; });
  var LS_KEY = 'quotaquest.v1';
  var NS = 'http://www.w3.org/2000/svg';
  var PH = /\{\{([^{}]*)\}\}/g;

  /* ================================================================ util */
  function today() { return QQ.iso(); }
  function add(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(function (x) { add(el, x); });
    else el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function sv(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] != null) el.setAttribute(k, attrs[k]); });
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function fmtDate(s) {
    if (!s) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) { var p = s.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
    var d = new Date(s);
    return isNaN(d) ? s : d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } }
  function hueOf(w) { return Math.round((215 + WORLDS.indexOf(w) * 25.7) % 360); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  /* ---------------------------------------------------------------- icone */
  var ICONS = {
    heart: ['f', 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'],
    flame: ['f', 'M12 2s6 4.5 6 11a6 6 0 0 1-12 0c0-2.2 1-4 2.2-5.3.1 1.6.8 2.6 1.9 3C10 7.5 12 5.6 12 2z'],
    bolt: ['f', 'M13 2L4 14h6.5L10 22l9-12.5h-6.2L13 2z'],
    star: ['f', 'M12 2.5l2.95 6 6.55.95-4.75 4.6 1.15 6.5L12 17.4 6.1 20.55l1.15-6.5L2.5 9.45l6.55-.95L12 2.5z'],
    crown: ['f', 'M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8z'],
    play: ['f', 'M7 4.5v15l13-7.5-13-7.5z'],
    lock: ['s', 'M7 11V8a5 5 0 0 1 10 0v3 M5 11h14v10H5z'],
    check: ['s', 'M5 12.5l4.5 4.5L19 7.5'],
    x: ['s', 'M6 6l12 12M18 6L6 18'],
    chev: ['s', 'M6 9l6 6 6-6'],
    path: ['s', 'M3 11l9-8 9 8 M5 9.5V21h5v-6h4v6h5V9.5'],
    review: ['s', 'M4 12a8 8 0 0 1 14-5.3L20 9 M20 4v5h-5 M20 12a8 8 0 0 1-14 5.3L4 15 M4 20v-5h5'],
    rss: ['s', 'M5 19.01v.01 M5 11a8 8 0 0 1 8 8 M5 5a14 14 0 0 1 14 14'],
    user: ['s', 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8'],
    chat: ['s', 'M4 5h16v11H9l-5 4V5z'],
    book: ['s', 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15z M4 20.5A2.5 2.5 0 0 0 6.5 23H20'],
    trophy: ['s', 'M8 4h8v5a4 4 0 0 1-8 0V4z M5 5h3v3a3 3 0 0 1-3-3z M19 5h-3v3a3 3 0 0 0 3-3z M12 13v4 M9 21h6 M10 17h4']
  };
  function icon(name, size, extra) {
    var d = ICONS[name], s = size || 20;
    var a = { width: s, height: s, viewBox: '0 0 24 24', 'aria-hidden': 'true', 'class': extra || '' };
    if (d[0] === 'f') { a.fill = 'currentColor'; return sv('svg', a, sv('path', { d: d[1] })); }
    a.fill = 'none'; a.stroke = 'currentColor'; a['stroke-width'] = 2.6; a['stroke-linecap'] = 'round'; a['stroke-linejoin'] = 'round';
    return sv('svg', a, sv('path', { d: d[1] }));
  }
  function starsRow(n, size, max) {
    var out = h('div', { class: 'nstars', 'aria-label': n + ' stelle su ' + (max || 3) });
    for (var i = 0; i < (max || 3); i++) {
      var s = icon('star', size || 14);
      s.style.color = i < n ? 'var(--xp)' : 'var(--locked)';
      out.appendChild(s);
    }
    return out;
  }
  /* Mascotte: Quotino, una ventiquattrore con occhi e cravatta mancante */
  function mascot(size, mood) {
    var mouth;
    if (mood === 'sad') mouth = sv('path', { d: 'M47 92q13-11 26 0', fill: 'none', stroke: '#fff', 'stroke-width': 5, 'stroke-linecap': 'round' });
    else if (mood === 'cheer') mouth = sv('g', null, sv('path', { d: 'M42 80h36a18 16 0 0 1-36 0z', style: 'fill:var(--ink)' }), sv('path', { d: 'M50 94q10-7 20 0', style: 'fill:var(--bad)' }));
    else if (mood === 'think') mouth = sv('circle', { cx: 66, cy: 88, r: 5, fill: 'none', stroke: '#fff', 'stroke-width': 4 });
    else mouth = sv('path', { d: 'M44 82q16 16 32 0', fill: 'none', stroke: '#fff', 'stroke-width': 5, 'stroke-linecap': 'round' });
    var brow = mood === 'sad'
      ? [sv('path', { d: 'M32 38l20 6', stroke: '#fff', 'stroke-width': 4, 'stroke-linecap': 'round' }), sv('path', { d: 'M88 38l-20 6', stroke: '#fff', 'stroke-width': 4, 'stroke-linecap': 'round' })]
      : null;
    return sv('svg', { 'class': 'mascot' + (mood === 'cheer' ? ' bounce' : ''), width: size, height: size, viewBox: '0 0 120 120', role: 'img', 'aria-label': 'Quotino, la mascotte' },
      sv('path', { d: 'M42 36v-8a6 6 0 0 1 6-6h24a6 6 0 0 1 6 6v8', fill: 'none', 'stroke-width': 8, 'stroke-linecap': 'round', style: 'stroke:var(--primary-deep)' }),
      sv('rect', { x: 12, y: 32, width: 96, height: 76, rx: 22, style: 'fill:var(--primary)' }),
      sv('rect', { x: 12, y: 62, width: 96, height: 9, style: 'fill:rgba(0,0,0,.16)' }),
      sv('rect', { x: 52, y: 58, width: 16, height: 18, rx: 4, style: 'fill:var(--xp)' }),
      sv('g', { 'class': 'eye-l' }, sv('circle', { cx: 42, cy: 50, r: 9.5, fill: '#fff' }), sv('circle', { cx: 43.5, cy: 51.5, r: 4.8, fill: '#0f1a35' })),
      sv('g', { 'class': 'eye-r' }, sv('circle', { cx: 78, cy: 50, r: 9.5, fill: '#fff' }), sv('circle', { cx: 79.5, cy: 51.5, r: 4.8, fill: '#0f1a35' })),
      brow, mouth
    );
  }

  /* ----------------------------------------------------------- effetti */
  var AC = null;
  function tone(f, t0, dur, type, vol) {
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, AC.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, AC.currentTime + t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + t0 + dur);
    o.connect(g); g.connect(AC.destination);
    o.start(AC.currentTime + t0); o.stop(AC.currentTime + t0 + dur + 0.05);
  }
  function sfx(kind) {
    if (!S || !S.settings.sound) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === 'suspended') AC.resume();
      if (kind === 'tap') tone(520, 0, 0.05, 'triangle', 0.05);
      else if (kind === 'ok') { tone(660, 0, 0.12, 'sine'); tone(880, 0.1, 0.18, 'sine'); }
      else if (kind === 'bad') { tone(220, 0, 0.18, 'sawtooth', 0.07); tone(165, 0.14, 0.24, 'sawtooth', 0.07); }
      else if (kind === 'win') [523, 659, 784, 1046].forEach(function (f, i) { tone(f, i * 0.11, 0.25, 'triangle', 0.1); });
    } catch (e) { /* audio non disponibile */ }
  }
  function reducedMotion() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function confetti() {
    if (reducedMotion()) return;
    var c = h('canvas', { 'class': 'confetti', 'aria-hidden': 'true' });
    c.width = window.innerWidth; c.height = window.innerHeight;
    document.body.appendChild(c);
    var ctx = c.getContext('2d'), cols = ['#2c59f5', '#f0a000', '#11994a', '#e03e45', '#a64bf4', '#00b3c7'];
    var ps = [];
    for (var i = 0; i < 110; i++) ps.push({ x: c.width / 2, y: c.height * 0.35, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 13 - 3, s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: pick(cols) });
    var t0 = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, c.width, c.height);
      ps.forEach(function (p) {
        p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.6); ctx.restore();
      });
      if (t - t0 < 2200) requestAnimationFrame(frame); else c.remove();
    })(t0);
  }
  function toast(msg) {
    var t = h('div', { 'class': 'toast', role: 'status', text: msg });
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2400);
  }

  /* ================================================== stato e salvataggio */
  var S = loadState();
  function loadState() {
    try { var raw = localStorage.getItem(LS_KEY); if (raw) return QQ.migrate(JSON.parse(raw)); } catch (e) { /* storage non disponibile */ }
    return QQ.newState();
  }
  function persistLocal() { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { /* ignora */ } }
  function save() { S.updatedAt = Date.now(); persistLocal(); Cloud.push(); }

  /* Salvataggio sul profilo dell'utente (capability db+user) quando la pagina gira dentro Claude.
     Se non disponibile, il gioco usa solo localStorage + codice di backup. */
  var Cloud = {
    ref: null, status: 'locale', timer: null, busy: false, again: false,
    init: function () {
      var c = window.claude;
      if (!c || typeof c.use !== 'function') return;
      Promise.all([c.use('db'), c.use('user')]).then(function (r) {
        var db = r[0], user = r[1];
        if (!db || !user) return null;
        return user.id().then(function (id) {
          if (!id) return null;
          Cloud.ref = db.doc('data/users/' + id + '/progress');
          Cloud.status = 'sincronizzato';
          return Cloud.ref.get().then(function (snap) {
            var d = snap.exists ? snap.data() : null, remote = null;
            if (d && typeof d.state === 'string') { try { remote = QQ.migrate(JSON.parse(d.state)); } catch (e) { remote = null; } }
            if (remote && (remote.updatedAt || 0) > (S.updatedAt || 0)) {
              S = remote; persistLocal(); applyTheme(); toast('Progressi sincronizzati'); render();
            } else if (S.updatedAt) Cloud.push(true);
          });
        });
      }).catch(function () { Cloud.status = 'errore'; });
    },
    push: function (now) {
      if (!Cloud.ref) return;
      clearTimeout(Cloud.timer);
      Cloud.timer = setTimeout(Cloud.flush, now ? 60 : 2500);
    },
    flush: function () {
      if (!Cloud.ref) return;
      if (Cloud.busy) { Cloud.again = true; return; }
      Cloud.busy = true;
      Cloud.ref.set({ v: 1, updatedAt: S.updatedAt, state: JSON.stringify(S) }).then(
        function () { Cloud.status = 'sincronizzato'; },
        function () { Cloud.status = 'errore'; }
      ).then(function () { Cloud.busy = false; if (Cloud.again) { Cloud.again = false; Cloud.push(); } });
    }
  };

  var themeSetByUs = false;
  function applyTheme() {
    var el = document.documentElement, t = S.settings.theme;
    if (t === 'light' || t === 'dark') { el.setAttribute('data-theme', t); themeSetByUs = true; }
    else if (themeSetByUs) { el.removeAttribute('data-theme'); themeSetByUs = false; }
  }

  /* ============================================================== fatti */
  var factUsage = null;
  function factsInStrings(strs) {
    var seen = {};
    strs.forEach(function (s) { if (typeof s === 'string') s.replace(PH, function (_, k) { seen[k.trim()] = 1; return ''; }); });
    return Object.keys(seen);
  }
  function collectStrings(x, out) {
    if (typeof x === 'string') out.push(x);
    else if (Array.isArray(x)) x.forEach(function (i) { collectStrings(i, out); });
    else if (x && typeof x === 'object') Object.keys(x).forEach(function (k) { collectStrings(x[k], out); });
    return out;
  }
  function levelFactKeys(lv) { return factsInStrings(collectStrings([lv.lesson, lv.ex], [])); }
  function usageCounts() {
    if (factUsage) return factUsage;
    factUsage = {};
    Object.keys(IDX.ex).forEach(function (id) {
      factsInStrings(collectStrings(IDX.ex[id].ex, [])).forEach(function (k) { factUsage[k] = (factUsage[k] || 0) + 1; });
    });
    return factUsage;
  }
  var CONF = { primary: 'fonte ufficiale', secondary: 'fonte secondaria', low: 'fonte debole' };
  function statusPill(st) {
    if (st === 'stale') return h('span', { 'class': 'pill warn', text: 'Da riverificare' });
    if (st === 'soon') return h('span', { 'class': 'pill warn', text: 'In scadenza' });
    return h('span', { 'class': 'pill good', text: 'Aggiornato' });
  }
  function factChip(key) {
    var f = FACTS[key], st = QQ.factStatus(f, today());
    if (!f) return null;
    var txt = 'Dato al ' + fmtDate(f.asOf) + ' · ' + host(f.source) + ' · ' + CONF[f.confidence] + (st === 'stale' ? ' · da riverificare' : '');
    return h('a', { 'class': 'fact-chip' + (st === 'stale' ? ' stale' : ''), href: f.source, target: '_blank', rel: 'noopener noreferrer', title: f.label, text: txt });
  }

  /* ============================================================ rendering */
  var V = { tab: 'path', open: {}, filter: '' };
  var player = null;

  function render() {
    var y = window.scrollY;
    root.textContent = '';
    if (!S.onboarded) { root.appendChild(viewWelcome()); return; }
    var body;
    if (V.tab === 'review') body = tabReview();
    else if (V.tab === 'news') body = tabNews();
    else if (V.tab === 'me') body = tabProfile();
    else body = tabPath();
    root.appendChild(h('div', { 'class': 'shell' }, topbar(), h('main', { 'class': 'stack', style: 'margin-top:14px' }, body)));
    root.appendChild(tabbar());
    window.scrollTo(0, y);
  }
  function go(tab) { V.tab = tab; render(); window.scrollTo(0, 0); }

  function topbar() {
    var t = today(), alive = QQ.streakAlive(S, t);
    var goal = S.daily.goal || 30, dxp = S.daily.date === t ? S.daily.xp : 0;
    var pct = Math.min(1, dxp / goal), C = 2 * Math.PI * 15;
    var ring = h('div', { 'class': 'ring', role: 'img', 'aria-label': 'Obiettivo giornaliero: ' + dxp + ' XP su ' + goal },
      sv('svg', { viewBox: '0 0 38 38', width: 38, height: 38 },
        sv('circle', { 'class': 'bg', cx: 19, cy: 19, r: 15 }),
        sv('circle', { 'class': 'fg', cx: 19, cy: 19, r: 15, 'stroke-dasharray': C.toFixed(1), 'stroke-dashoffset': (C * (1 - pct)).toFixed(1) })),
      h('div', { 'class': 't', text: pct >= 1 ? '✓' : Math.round(pct * 100) + '%' }));
    return h('header', { 'class': 'topbar' }, h('div', { 'class': 'topbar-in' },
      h('div', { 'class': 'brand' }, mascot(30, 'happy'), h('span', { text: 'Quota Quest' })),
      h('span', { 'class': 'stat flame' + (alive ? '' : ' off'), title: 'Giorni consecutivi' }, icon('flame', 20), h('span', { 'class': 'num', text: alive ? S.streak.count : 0 })),
      h('span', { 'class': 'stat xp', title: 'Punti esperienza' }, icon('bolt', 20), h('span', { 'class': 'num', text: S.xp })),
      ring));
  }
  function tabbar() {
    var due = QQ.dueIds(S, today()).filter(function (id) { return IDX.ex[id]; }).length;
    var stale = QQ.contentStatus(D, today()).stale;
    function tab(id, label, ic, badge, soft) {
      return h('button', { 'class': 'tab', type: 'button', 'aria-current': V.tab === id ? 'page' : null, onclick: function () { go(id); } },
        icon(ic, 24), h('span', { text: label }), badge ? h('span', { 'class': 'dot' + (soft ? ' warn' : ''), text: badge > 99 ? '99+' : badge }) : null);
    }
    return h('nav', { 'class': 'tabbar', 'aria-label': 'Sezioni' }, h('div', { 'class': 'tabbar-in' },
      tab('path', 'Percorso', 'path'), tab('review', 'Ripasso', 'review', due), tab('news', 'Novità', 'rss', stale, true), tab('me', 'Profilo', 'user')));
  }

  /* ----------------------------------------------------------- benvenuto */
  function viewWelcome() {
    var input = h('input', { type: 'text', id: 'nm', placeholder: 'Come ti chiami? (facoltativo)', maxlength: 24, 'aria-label': 'Il tuo nome', style: 'width:100%;text-align:center' });
    function start(path) {
      S.onboarded = true; S.name = input.value.trim().slice(0, 24); save();
      if (path === 'assess') startAssessment(); else { S.assessSkipped = true; save(); render(); }
    }
    return h('div', { 'class': 'welcome' },
      mascot(132, 'cheer'),
      h('h1', { text: 'Quota Quest' }),
      h('p', { 'class': 'muted', style: 'font-size:18px', text: 'Impara SAP giocando. ' + D.meta.levels + ' livelli in ' + PLAYABLE.length + ' mondi, dati con data e fonte.' }),
      input,
      h('div', { 'class': 'stack', style: 'width:100%' },
        h('button', { 'class': 'btn block', type: 'button', onclick: function () { start('assess'); } }, 'Fai l\'assessment'),
        h('p', { 'class': 'small muted', text: 'Circa 8 minuti, nessun cuore da perdere. Serve a capire da dove partire.' }),
        h('button', { 'class': 'btn alt block', type: 'button', onclick: function () { start('zero'); } }, 'Parto da zero')),
      h('p', { 'class': 'tiny muted', text: 'Progetto non ufficiale, non affiliato né approvato da SAP SE. I marchi citati appartengono ai rispettivi proprietari. Contenuti basati su fonti pubbliche.' }));
  }

  /* ------------------------------------------------------------ percorso */
  function tabPath() {
    var out = [], t = today();
    var up = QQ.nextUp(D, S);
    if (!S.assessment) {
      out.push(h('section', { 'class': 'card callout accent' },
        h('div', { 'class': 'hero' }, mascot(64, 'think'), h('div', null, h('h2', { text: 'Parti dal punto giusto' }), h('p', { 'class': 'muted small', text: S.assessSkipped ? 'Puoi fare l\'assessment quando vuoi: ti consiglia da dove partire.' : 'Un test adattivo di ' + PLAYABLE.length * 2 + ' domande: ti dice dove sei forte e dove no.' }))),
        h('button', { 'class': 'btn block', type: 'button', onclick: startAssessment }, 'Fai l\'assessment')));
    }
    var due = QQ.dueIds(S, t).filter(function (id) { return IDX.ex[id]; }).length;
    if (due) {
      out.push(h('section', { 'class': 'card row', style: 'justify-content:space-between' },
        h('div', { 'class': 'grow' }, h('b', { text: plural(due, 'domanda', 'domande') + ' da ripassare' }), h('div', { 'class': 'small muted', text: 'Il ripasso dilazionato è ciò che fa restare le cose in testa.' })),
        h('button', { 'class': 'btn sm', type: 'button', onclick: function () { startReview(); } }, 'Ripassa')));
    }
    if (up) {
      var uh = hueOf(up.world);
      out.push(h('section', { 'class': 'card', style: '--wh:' + uh },
        h('div', { 'class': 'eyebrow', text: S.name ? 'Ciao ' + S.name + ', si riparte da' : 'Si riparte da' }),
        h('h2', { style: 'margin:4px 0 2px', text: up.level.title }),
        h('p', { 'class': 'muted small', text: up.world.icon + ' ' + up.world.title + ' · livello ' + (up.index + 1) + ' di ' + up.world.levels.length }),
        h('button', { 'class': 'btn block', style: 'margin-top:12px', type: 'button', onclick: function () { V.open[up.world.id] = true; openSheet(up.world, up.index); } }, 'Continua')));
    } else if (PLAYABLE.length) {
      out.push(h('section', { 'class': 'card', style: 'text-align:center' }, h('h2', { text: 'Hai completato tutto!' }), h('p', { 'class': 'muted', text: 'Passa al Ripasso e tieni d\'occhio le Novità: i contenuti si aggiornano.' })));
    }
    out.push(worldJump(up));
    var weak = S.assessment ? S.assessment.results : null;
    WORLDS.forEach(function (w) { out.push(worldSection(w, up, weak)); });
    return out;
  }
  function worldJump(up) {
    var strip = h('div', { 'class': 'worldjump', role: 'list', 'aria-label': 'Mondi' });
    PLAYABLE.forEach(function (w) {
      var p = QQ.worldProgress(w, S);
      strip.appendChild(h('button', { 'class': 'jump', type: 'button', role: 'listitem', style: '--wh:' + hueOf(w), title: w.title, 'aria-current': up && up.world.id === w.id ? 'true' : null,
        onclick: function () { V.open[w.id] = true; render(); var el = document.getElementById('world-' + w.id); if (el) el.scrollIntoView({ block: 'start' }); } },
        h('div', { 'class': 'b' + (p.complete ? ' done' : ''), text: w.icon }), h('span', { 'class': 'l', text: w.title })));
    });
    return strip;
  }
  function worldSection(w, up, weak) {
    var hue = hueOf(w);
    if (w.missing || !w.levels.length) {
      return h('section', { 'class': 'world', style: '--wh:' + hue }, h('div', { 'class': 'whead', style: 'opacity:.6' }, h('div', { 'class': 'ic', text: w.icon }), h('div', null, h('h3', { text: w.title }), h('div', { 'class': 'sub', text: 'In arrivo' })), h('span')));
    }
    var p = QQ.worldProgress(w, S), open = !!V.open[w.id] || (up && up.world.id === w.id && V.open[w.id] !== false);
    var rec = weak && weak[w.id] && weak[w.id].score <= 1 && !p.complete;
    var head = h('button', { 'class': 'whead', type: 'button', 'aria-expanded': open ? 'true' : 'false', onclick: function () { V.open[w.id] = !open; render(); } },
      h('div', { 'class': 'ic', 'aria-hidden': 'true', text: w.icon }),
      h('div', { 'class': 'grow' },
        h('div', { 'class': 'row', style: 'gap:6px' }, h('h3', { text: w.title }), rec ? h('span', { 'class': 'pill prim', text: 'Consigliato' }) : null, p.complete ? h('span', { 'class': 'pill good', text: 'Completato' }) : null),
        h('div', { 'class': 'sub', text: w.subtitle + ' · ' + p.done + '/' + p.total }),
        h('div', { 'class': 'bar' }, h('i', { style: 'width:' + Math.round(p.pct * 100) + '%' }))),
      h('span', { 'class': 'chev' }, icon('chev', 22)));
    var sec = h('section', { 'class': 'world', id: 'world-' + w.id, style: '--wh:' + hue }, head);
    if (open) sec.appendChild(pathNodes(w, up));
    return sec;
  }
  function pathNodes(w, up) {
    var path = h('div', { 'class': 'path' });
    w.levels.forEach(function (lv, i) {
      var rec = S.levels[lv.id], unlocked = QQ.isUnlocked(w, i, S);
      var done = rec && !rec.skipped, skipped = rec && rec.skipped;
      var current = !rec && unlocked;
      var boss = lv.kind === 'boss';
      var cls = 'node' + (boss ? ' boss' : '') + (current ? ' current' : '') + (!unlocked && !rec ? ' locked' : '') + (skipped ? ' skipped' : '');
      var ic = !unlocked && !rec ? icon('lock', 28) : done ? icon('check', 32) : skipped ? icon('check', 28) : boss ? icon('crown', 36) : lv.kind === 'roleplay' ? icon('chat', 30) : icon(current ? 'play' : 'book', 30);
      var btn = h('button', { 'class': cls, type: 'button', 'aria-label': lv.title + (done ? ', completato' : !unlocked && !rec ? ', bloccato' : ''), onclick: function () {
        if (!unlocked && !rec) { toast('Completa prima «' + w.levels[i - 1].title + '»'); return; }
        openSheet(w, i);
      } }, ic);
      var off = Math.round(Math.sin(i * 1.15) * 58);
      path.appendChild(h('div', { 'class': 'node-wrap' + (current ? ' cur' : ''), style: '--off:' + off + 'px' },
        current ? h('div', { 'class': 'bubble', text: boss ? 'BOSS' : 'INIZIA' }) : null,
        btn,
        done ? starsRow(rec.stars, 14) : null,
        h('div', { 'class': 'nlabel', text: lv.title })));
    });
    return path;
  }

  /* --------------------------------------------------------- scheda livello */
  function openSheet(w, i) {
    var lv = w.levels[i], rec = S.levels[lv.id], hue = hueOf(w);
    var keys = levelFactKeys(lv), st = QQ.contentStatus({ facts: keys.reduce(function (a, k) { if (FACTS[k]) a[k] = FACTS[k]; return a; }, {}) }, today());
    var kindLabel = lv.kind === 'boss' ? 'Boss del mondo' : lv.kind === 'roleplay' ? 'Roleplay' : 'Lezione + esercizi';
    var mins = Math.max(2, Math.round(lv.ex.length * 0.6));
    function close() { scrim.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    var teaser = lv.lesson && lv.lesson.points && lv.lesson.points[0] ? QQ.fill(lv.lesson.points[0], FACTS) : '';
    var scrim = h('div', { 'class': 'scrim', onclick: function (e) { if (e.target === scrim) close(); } },
      h('div', { 'class': 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': lv.title, style: '--wh:' + hue },
        h('div', { 'class': 'grab' }),
        h('div', { 'class': 'eyebrow', text: w.icon + ' ' + w.title + ' · ' + (i + 1) + '/' + w.levels.length }),
        h('h3', { text: lv.title }),
        h('div', { 'class': 'row' },
          h('span', { 'class': 'pill', text: kindLabel }), h('span', { 'class': 'pill', text: plural(lv.ex.length, 'esercizio', 'esercizi') }), h('span', { 'class': 'pill', text: '~' + mins + ' min' }),
          st.stale || st.soon ? h('span', { 'class': 'pill warn', text: 'Dati da riverificare' }) : null,
          rec && rec.skipped ? h('span', { 'class': 'pill prim', text: 'Accreditato dall\'assessment' }) : null),
        teaser ? h('p', { 'class': 'muted', text: teaser }) : null,
        rec && !rec.skipped ? h('div', { 'class': 'row' }, starsRow(rec.stars, 22), h('span', { 'class': 'small muted', text: 'Giocato ' + rec.plays + (rec.plays === 1 ? ' volta' : ' volte') })) : null,
        h('button', { 'class': 'btn block', type: 'button', onclick: function () { close(); startLevel(w, i, false); } }, rec ? 'Rigioca con lezione' : 'Inizia'),
        rec ? h('button', { 'class': 'btn alt block', type: 'button', onclick: function () { close(); startLevel(w, i, true); } }, 'Solo esercizi') : null,
        h('button', { 'class': 'btn ghost block', type: 'button', onclick: close }, 'Chiudi')));
    document.addEventListener('keydown', onKey);
    document.body.appendChild(scrim);
  }

  /* ========================================================= flusso di gioco */
  function startLevel(w, i, skipLesson) {
    var lv = w.levels[i];
    var exs = lv.ex.map(function (e) { return QQ.prepare(e, FACTS); });
    var sess = new QQ.Session(exs, lv.kind);
    openPlayer({
      title: lv.title, hue: hueOf(w), session: sess, world: w, index: i, level: lv,
      lesson: skipLesson ? null : lv.lesson, factKeys: levelFactKeys(lv),
      onFinish: function (ctx) { finishLevel(w, i, ctx); }
    });
  }
  function startReview() {
    var t = today();
    var ids = QQ.dueIds(S, t, 60).filter(function (id) { return IDX.ex[id]; }).slice(0, 10);
    var label = 'Ripasso';
    if (!ids.length) { ids = practiceIds(10); label = 'Allenamento mirato'; }
    if (!ids.length) { toast('Gioca prima qualche livello: poi qui trovi cosa ripassare'); return; }
    var kind = label === 'Ripasso' ? 'review' : 'practice';
    var sess = new QQ.Session(ids.map(function (id) { return QQ.prepare(IDX.ex[id].ex, FACTS); }), kind);
    openPlayer({ title: label, hue: 215, session: sess, lesson: null, onFinish: function (ctx) { finishPractice(kind, ctx); } });
  }
  function weakestWorlds() {
    var arr = PLAYABLE.map(function (w) {
      var a = S.acc[w.id], played = w.levels.some(function (lv) { return S.levels[lv.id]; });
      var ratio = a && a[1] >= 5 ? a[0] / a[1] : (S.assessment && S.assessment.results[w.id] ? S.assessment.results[w.id].score / 3 : 0.5);
      return { w: w, ratio: ratio, played: played };
    }).filter(function (x) { return x.played; });
    arr.sort(function (a, b) { return a.ratio - b.ratio; });
    return arr;
  }
  function practiceIds(n) {
    var ws = weakestWorlds();
    for (var k = 0; k < ws.length; k++) {
      var w = ws[k].w, pool = [];
      w.levels.forEach(function (lv) { if (S.levels[lv.id]) lv.ex.forEach(function (e) { pool.push(e.id); }); });
      if (pool.length) return QQ.shuffle(pool).slice(0, n);
    }
    return [];
  }

  function openPlayer(cfg) {
    if (player) player.destroy();
    player = new Player(cfg);
  }

  function Player(cfg) {
    var self = this, sess = cfg.session, assess = cfg.assessment || null, p = null, ctrl = null, locked = false, aLog = [];
    var el = h('div', { 'class': 'play', style: '--wh:' + (cfg.hue || 215), role: 'dialog', 'aria-modal': 'true', 'aria-label': cfg.title });
    var prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.appendChild(el);
    root.setAttribute('aria-hidden', 'true');

    this.destroy = function () {
      document.removeEventListener('keydown', onKey);
      var ask = document.getElementById('exit-ask'); if (ask) ask.remove();
      Array.prototype.forEach.call(document.querySelectorAll('.confetti'), function (c) { c.remove(); });
      el.remove(); document.documentElement.style.overflow = prevOverflow; root.removeAttribute('aria-hidden');
      if (player === self) player = null;
    };
    function exit() { self.destroy(); render(); }

    function head(progress, withHearts) {
      var hearts = withHearts ? h('div', { 'class': 'hearts', 'aria-label': sess.hearts + ' cuori' }, icon('heart', 24), h('span', { 'class': 'num', text: sess.hearts })) : null;
      return h('div', { 'class': 'play-head' },
        h('button', { 'class': 'iconbtn', type: 'button', 'aria-label': 'Esci', onclick: askExit }, icon('x', 24)),
        h('div', { 'class': 'pbar', role: 'progressbar', 'aria-valuenow': Math.round(progress * 100), 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('i', { style: 'width:' + Math.max(3, Math.round(progress * 100)) + '%' })),
        hearts);
    }
    function frame(headEl, bodyEl, footEl) {
      el.textContent = '';
      el.appendChild(headEl);
      el.appendChild(h('div', { 'class': 'play-body' }, h('div', { 'class': 'play-in' }, bodyEl)));
      el.appendChild(footEl);
      var pb = el.querySelector('.play-body'); if (pb) pb.scrollTop = 0;
    }
    function footBar(buttons, cls) { return h('div', { 'class': 'play-foot' + (cls ? ' ' + cls : '') }, h('div', { 'class': 'foot-in' }, buttons)); }

    function askExit() {
      if (document.getElementById('exit-ask')) return;
      var scrim = h('div', { 'class': 'scrim', id: 'exit-ask', onclick: function (e) { if (e.target === scrim) scrim.remove(); } },
        h('div', { 'class': 'sheet', role: 'alertdialog', 'aria-label': 'Vuoi uscire?' },
          h('div', { 'class': 'grab' }),
          h('h3', { text: 'Vuoi uscire?' }),
          h('p', { 'class': 'muted', text: assess ? 'L\'assessment va rifatto da capo.' : step === 'result' ? 'Hai già salvato il risultato.' : 'Il progresso di questo livello andrà perso.' }),
          h('div', { 'class': 'foot-actions' },
            h('button', { 'class': 'btn alt', type: 'button', onclick: function () { scrim.remove(); } }, 'Resta'),
            h('button', { 'class': 'btn bad', type: 'button', onclick: function () { scrim.remove(); exit(); } }, 'Esci'))));
      document.body.appendChild(scrim);
    }
    var step = 'lesson';

    /* --- lezione */
    function showLesson() {
      step = 'lesson';
      var L = cfg.lesson, used = {};
      var pts = (L.points || []).map(function (t) { return h('li', { text: QQ.fill(t, FACTS, used) }); });
      var body = h('div', { 'class': 'lesson' },
        h('div', { 'class': 'eyebrow', text: (cfg.world ? cfg.world.icon + ' ' + cfg.world.title + ' · ' : '') + 'Lezione lampo' }),
        h('h2', { text: cfg.title }),
        h('ul', { 'class': 'points' }, pts),
        L.ae ? h('div', { 'class': 'ae' }, h('b', { text: 'In trattativa: ' }), QQ.fill(L.ae, FACTS, used)) : null,
        h('div', { 'class': 'facts' }, Object.keys(used).map(factChip)));
      frame(head(0, false), body, footBar(h('button', { 'class': 'btn block', type: 'button', onclick: function () { showExercise(); } }, 'Ho capito, si parte')));
    }

    /* --- esercizio */
    function showExercise(keep) {
      step = 'ex'; locked = false;
      if (assess) {
        if (!keep || !p) {
          var nx = assess.next();
          if (!nx) return finishAssessment();
          p = QQ.prepare(nx.item, FACTS);
        }
      } else {
        if (sess.done()) return doFinish();
        if (!keep || !p || sess.current().id !== p.id) p = sess.current();
      }
      var prog = assess ? assess.step / assess.total : sess.progress();
      var withHearts = !assess;
      var body = h('div', { 'class': 'stack', 'aria-live': 'polite' });
      body.appendChild(h('div', { 'class': 'q-label', text: assess ? 'Domanda ' + (assess.step + 1) + ' di ' + assess.total : typeLabel(p) }));
      if (p.ctx) body.appendChild(h('div', { 'class': 'ctx' }, h('div', { 'class': 'av', 'aria-hidden': 'true', text: '💬' }), h('div', { 'class': 'say' }, h('div', { 'class': 'who', text: p.ctx.who }), h('div', { text: p.ctx.say }))));
      var qEl;
      if (p.t === 'fill') {
        var parts = p.q.split('___'), blank = h('span', { 'class': 'blank empty', text: 'xxxxx' });
        qEl = h('div', { 'class': 'q' }, parts[0], blank, parts.slice(1).join('___'));
        ctrl = mountChoice(p, onChange); ctrl.setBlank(blank);
      } else {
        qEl = h('div', { 'class': 'q', text: p.q });
        ctrl = p.t === 'mcq' || p.t === 'multi' ? mountChoice(p, onChange) : p.t === 'tf' ? mountTF(p, onChange) : p.t === 'match' ? mountMatch(p, onChange) : p.t === 'order' ? mountOrder(p, onChange) : mountBucket(p, onChange);
      }
      body.appendChild(qEl);
      body.appendChild(ctrl.el);
      var check = h('button', { 'class': 'btn block', type: 'button', id: 'check', disabled: true, onclick: function () { doCheck(false); } }, 'Controlla');
      var btns = assess ? h('div', { 'class': 'foot-actions' }, h('button', { 'class': 'btn alt', type: 'button', onclick: function () { doCheck(true); } }, 'Non lo so'), check) : check;
      frame(head(prog, withHearts), body, footBar(btns));
      function onChange() { check.disabled = !ctrl.ready(); }
      onChange();
    }
    function typeLabel(x) {
      return { mcq: 'Scegli la risposta', fill: 'Completa la frase', multi: 'Seleziona tutte le corrette', tf: 'Vero o falso?', match: 'Abbina le coppie', order: 'Metti in ordine', bucket: 'Classifica' }[x.t];
    }
    function doCheck(dontKnow) {
      if (locked) return; locked = true;
      var g = { ok: false }, ok = false;
      if (!dontKnow) {
        g = p.grade(ctrl.answer());
        ok = g.ok && !(ctrl.mistakes && ctrl.mistakes() > 0);
      }
      if (assess) {
        aLog.push({ id: p.id, ok: ok, first: true });
        assess.answer(ok);
        sfx('tap');
        showExercise();
        return;
      }
      var r = sess.submit(ok);
      ctrl.reveal(g, ok);
      sfx(ok ? 'ok' : 'bad');
      step = 'fb';
      var hearts = el.querySelector('.hearts');
      if (hearts && !ok && r.heartsLeft < sess.maxHearts) { hearts.querySelector('.num').textContent = r.heartsLeft; hearts.classList.add('hit'); }
      var foot = el.querySelector('.play-foot');
      foot.className = 'play-foot ' + (ok ? 'good' : 'bad');
      var inner = h('div', { 'class': 'foot-in' });
      inner.appendChild(h('div', { 'class': 'fb-title' }, icon(ok ? 'check' : 'x', 26), ok ? pick(['Esatto!', 'Perfetto!', 'Ottimo!', 'Così si fa!', 'Preciso!']) : (dontKnow ? 'Nessun problema' : pick(['Non proprio', 'Quasi', 'Occhio qui', 'Può capitare']))));
      if (!ok) {
        var sol = p.solution || [];
        inner.appendChild(h('div', { 'class': 'fb-sol' }, h('div', { 'class': 'small muted', text: 'Risposta corretta' }), sol.length > 1 ? h('ul', { style: 'margin:2px 0 0;padding-left:18px' }, sol.map(function (s) { return h('li', { text: s }); })) : h('div', { text: sol[0] || '' })));
        if (ctrl.mistakes && ctrl.mistakes() > 0 && g.ok) inner.appendChild(h('div', { 'class': 'small', text: 'Hai sbagliato ' + plural(ctrl.mistakes(), 'abbinamento', 'abbinamenti') + ' prima di trovare quelli giusti.' }));
      }
      inner.appendChild(h('div', { 'class': 'fb-exp', text: p.exp }));
      var chips = (p.factKeys || []).map(factChip).filter(Boolean);
      if (chips.length) inner.appendChild(h('div', { 'class': 'facts' }, chips));
      if (!ok && !r.failed) inner.appendChild(h('div', { 'class': 'tiny muted', text: 'Questa domanda tornerà alla fine del livello.' }));
      var cont = h('button', { 'class': 'btn block ' + (ok ? 'good' : 'bad'), type: 'button', id: 'cont', onclick: next }, r.finished ? (r.failed ? 'Vedi risultato' : 'Fine') : 'Continua');
      inner.appendChild(cont);
      foot.textContent = ''; foot.appendChild(inner);
      var fb = foot.querySelector('.fb-exp'); void fb;
      cont.focus({ preventScroll: true });
    }
    function next() {
      if (sess.done()) return doFinish();
      showExercise();
    }
    function doFinish() { step = 'done'; cfg.onFinish({ session: sess, player: self }); }
    function finishAssessment() { step = 'done'; cfg.onFinish({ log: aLog, assessment: assess, player: self }); }

    function onKey(e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.key === 'Escape') { askExit(); return; }
      if (document.getElementById('exit-ask')) return;
      if (e.key === 'Enter') {
        var c = document.getElementById('cont') || document.getElementById('check');
        if (c && !c.disabled) { e.preventDefault(); c.click(); }
      } else if (/^[1-5]$/.test(e.key) && step === 'ex' && ctrl && ctrl.key) ctrl.key(+e.key);
    }
    document.addEventListener('keydown', onKey);

    /* --- schermate di fine, riusabili da fuori */
    this.frame = frame; this.head = head; this.footBar = footBar; this.exit = exit;
    this.setStep = function (s) { step = s; };
    this.debug = function () { return { p: p, ctrl: ctrl, sess: sess, step: step }; };
    if (cfg.lesson) showLesson(); else showExercise();
  }

  /* ------------------------------------------------- componenti esercizi */
  function mountChoice(p, onChange) {
    var multi = p.t === 'multi', sel = -1, picked = [], locked = false, btns = [], blank = null;
    var wrap = h('div', { 'class': 'opts', role: multi ? 'group' : 'radiogroup' });
    p.options.forEach(function (txt, i) {
      var b = h('button', { type: 'button', 'class': 'opt', role: multi ? 'checkbox' : 'radio', 'aria-checked': 'false', onclick: function () { choose(i); } },
        h('span', { 'class': 'key', 'aria-hidden': 'true', text: String(i + 1) }), h('span', { text: txt }));
      btns.push(b); wrap.appendChild(b);
    });
    function choose(i) {
      if (locked) return;
      if (multi) { var k = picked.indexOf(i); if (k >= 0) picked.splice(k, 1); else picked.push(i); } else sel = i;
      btns.forEach(function (b, j) {
        var on = multi ? picked.indexOf(j) >= 0 : sel === j;
        b.classList.toggle('sel', on); b.setAttribute('aria-checked', on ? 'true' : 'false');
      });
      if (blank) { blank.textContent = sel >= 0 ? p.options[sel] : 'xxxxx'; blank.classList.toggle('empty', sel < 0); }
      sfx('tap'); onChange();
    }
    return {
      el: wrap,
      setBlank: function (b) { blank = b; },
      answer: function () { return multi ? picked.slice() : sel; },
      ready: function () { return multi ? picked.length > 0 : sel >= 0; },
      key: function (n) { if (n - 1 < btns.length) choose(n - 1); },
      reveal: function () {
        locked = true;
        btns.forEach(function (b, j) {
          var right = p.correctIdx.indexOf(j) >= 0, chosen = multi ? picked.indexOf(j) >= 0 : sel === j;
          b.disabled = true; b.classList.remove('sel');
          if (right && chosen) b.classList.add('is-right');
          else if (right) b.classList.add(multi ? 'is-miss' : 'is-right');
          else if (chosen) b.classList.add('is-wrong');
          else b.classList.add('is-dim');
        });
      }
    };
  }
  function mountTF(p, onChange) {
    var val = null, locked = false, bs = [];
    var wrap = h('div', { 'class': 'tfbtns', role: 'radiogroup' });
    [[true, 'Vero'], [false, 'Falso']].forEach(function (o) {
      var b = h('button', { type: 'button', 'class': 'opt', role: 'radio', 'aria-checked': 'false', onclick: function () { choose(o[0]); } }, h('span', { text: o[1] }));
      b._v = o[0]; bs.push(b); wrap.appendChild(b);
    });
    function choose(v) {
      if (locked) return; val = v;
      bs.forEach(function (b) { var on = b._v === v; b.classList.toggle('sel', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); });
      sfx('tap'); onChange();
    }
    return {
      el: wrap, answer: function () { return val; }, ready: function () { return val !== null; },
      key: function (n) { if (n === 1) choose(true); else if (n === 2) choose(false); },
      reveal: function () {
        locked = true;
        var truth = p.solution[0] === 'Vero';
        bs.forEach(function (b) { b.disabled = true; b.classList.remove('sel'); if (b._v === truth) b.classList.add('is-right'); else if (b._v === val) b.classList.add('is-wrong'); else b.classList.add('is-dim'); });
      }
    };
  }
  function mountMatch(p, onChange) {
    var n = p.left.length, selL = -1, locked = false, pairs = [], miss = 0, lb = [], rb = [], doneL = {}, doneR = {};
    var colL = h('div', { 'class': 'mcol' }), colR = h('div', { 'class': 'mcol' });
    p.left.forEach(function (t, i) { var b = h('button', { type: 'button', 'class': 'mchip', text: t, onclick: function () { tapL(i); } }); lb.push(b); colL.appendChild(b); });
    p.right.forEach(function (t, j) { var b = h('button', { type: 'button', 'class': 'mchip', text: t, onclick: function () { tapR(j); } }); rb.push(b); colR.appendChild(b); });
    function tapL(i) {
      if (locked || doneL[i]) return;
      selL = i; lb.forEach(function (b, k) { b.classList.toggle('sel', k === i); }); sfx('tap');
    }
    function tapR(j) {
      if (locked || doneR[j] || selL < 0) return;
      var i = selL;
      if (p.isPair(i, j)) {
        pairs.push([i, j]); doneL[i] = doneR[j] = true; selL = -1;
        lb[i].classList.remove('sel'); lb[i].classList.add('done'); rb[j].classList.add('done'); lb[i].disabled = rb[j].disabled = true;
        sfx('tap'); onChange();
      } else {
        miss++; selL = -1; sfx('bad');
        lb[i].classList.remove('sel'); lb[i].classList.add('wrong'); rb[j].classList.add('wrong');
        setTimeout(function () { lb[i].classList.remove('wrong'); rb[j].classList.remove('wrong'); }, 450);
      }
    }
    return {
      el: h('div', { 'class': 'stack', style: 'gap:8px' }, h('div', { 'class': 'small muted', text: 'Tocca un elemento a sinistra, poi la sua coppia a destra.' }), h('div', { 'class': 'matchgrid' }, colL, colR)),
      answer: function () { return pairs; }, ready: function () { return pairs.length === n; }, mistakes: function () { return miss; },
      reveal: function () { locked = true; }
    };
  }
  function mountOrder(p, onChange) {
    var seq = [], locked = false;
    var slots = h('div', { 'class': 'slots', 'aria-live': 'polite' }), bank = h('div', { 'class': 'bank' });
    var chips = p.items.map(function (t, i) { return h('button', { type: 'button', 'class': 'ochip', text: t, onclick: function () { addI(i); } }); });
    chips.forEach(function (c) { bank.appendChild(c); });
    function paint() {
      slots.textContent = '';
      if (!seq.length) slots.appendChild(h('div', { 'class': 'slots-hint', text: 'Tocca gli elementi nell\'ordine giusto' }));
      seq.forEach(function (d, pos) {
        slots.appendChild(h('div', { 'class': 'slot' }, h('span', { 'class': 'n', text: pos + 1 }),
          h('button', { type: 'button', 'class': 'ochip', text: p.items[d], onclick: function () { removeAt(pos); } })));
      });
      chips.forEach(function (c, i) { c.classList.toggle('used', seq.indexOf(i) >= 0); });
    }
    function addI(i) { if (locked || seq.indexOf(i) >= 0) return; seq.push(i); sfx('tap'); paint(); onChange(); }
    function removeAt(pos) { if (locked) return; seq.splice(pos, 1); paint(); onChange(); }
    paint();
    return {
      el: h('div', { 'class': 'stack' }, slots, bank),
      answer: function () { return seq.slice(); }, ready: function () { return seq.length === p.items.length; },
      reveal: function (g) {
        locked = true; bank.style.display = 'none';
        var wrong = g.wrong || [];
        Array.prototype.forEach.call(slots.querySelectorAll('.ochip'), function (c, pos) { c.disabled = true; c.classList.add(wrong.indexOf(pos) >= 0 ? 'is-wrong' : 'is-right'); });
      }
    };
  }
  function mountBucket(p, onChange) {
    var assign = p.items.map(function () { return -1; }), locked = false, rows = [];
    var wrap = h('div', { 'class': 'stack', style: 'gap:10px' });
    p.items.forEach(function (t, i) {
      var btns = p.buckets.map(function (bn, bi) { return h('button', { type: 'button', 'class': 'bkbtn', text: bn, onclick: function () { setB(i, bi); } }); });
      var row = h('div', { 'class': 'bkrow' }, h('div', { style: 'font-weight:600', text: t }), h('div', { 'class': 'bkbtns' }, btns));
      rows.push({ row: row, btns: btns }); wrap.appendChild(row);
    });
    function setB(i, bi) {
      if (locked) return; assign[i] = bi;
      rows[i].btns.forEach(function (b, j) { b.classList.toggle('sel', j === bi); }); sfx('tap'); onChange();
    }
    return {
      el: wrap, answer: function () { return assign.slice(); },
      ready: function () { return assign.every(function (a) { return a >= 0; }); },
      reveal: function (g) {
        locked = true; var wrong = g.wrong || [];
        rows.forEach(function (r, i) {
          var bad = wrong.indexOf(i) >= 0;
          r.row.classList.add(bad ? 'is-wrong' : 'is-right');
          r.btns.forEach(function (b) { b.disabled = true; });
          if (bad) r.btns[p.itemBucket[i]].textContent = '✓ ' + p.buckets[p.itemBucket[i]];
        });
      }
    };
  }

  /* ============================================================= risultati */
  function resultScreen(pl, o) {
    var stars = o.failed ? null : starsEl(o.stars);
    var tiles = h('div', { 'class': 'tiles' },
      h('div', { 'class': 'tile xp' }, h('b', { 'class': 'num', text: '+' + o.xp }), h('span', { 'class': 'tiny muted', text: 'XP' })),
      h('div', { 'class': 'tile ac' }, h('b', { 'class': 'num', text: Math.round(o.accuracy * 100) + '%' }), h('span', { 'class': 'tiny muted', text: 'Al primo colpo' })),
      h('div', { 'class': 'tile st' }, h('b', { 'class': 'num', text: S.streak.count }), h('span', { 'class': 'tiny muted', text: 'Giorni di fila' })));
    var body = h('div', { 'class': 'result' },
      mascot(120, o.failed ? 'sad' : 'cheer'),
      h('h2', { text: o.title }),
      o.sub ? h('p', { 'class': 'muted', text: o.sub }) : null,
      stars, tiles,
      o.badges && o.badges.length ? h('div', { 'class': 'card', style: 'width:100%' }, h('div', { 'class': 'eyebrow', text: 'Nuovi badge' }), h('div', { 'class': 'badges center', style: 'margin-top:8px' }, o.badges.map(function (b) { return badgeEl(b, true); }))) : null,
      o.note ? h('p', { 'class': 'small muted', text: o.note }) : null);
    var actions = h('div', { 'class': 'foot-actions' },
      o.retry ? h('button', { 'class': 'btn alt', type: 'button', onclick: o.retry }, 'Riprova') : null,
      h('button', { 'class': 'btn' + (o.failed ? ' alt' : ' good'), type: 'button', id: 'cont', onclick: o.done || pl.exit }, o.failed ? 'Esci' : 'Continua'));
    pl.frame(h('div', { 'class': 'play-head' }, h('div', { 'class': 'pbar' }, h('i', { style: 'width:100%' }))), body, pl.footBar(actions));
    pl.setStep('result');
    if (!o.failed) { sfx('win'); confetti(); }
  }
  function starsEl(n) {
    var d = h('div', { 'class': 'stars', 'aria-label': n + ' stelle su 3' });
    for (var i = 0; i < 3; i++) { var s = icon('star', 54, 's'); s.style.color = i < n ? 'var(--xp)' : 'var(--locked)'; d.appendChild(s); }
    return d;
  }
  function finishLevel(w, i, ctx) {
    var sess = ctx.session, lv = w.levels[i], t = today();
    var rec = S.levels[lv.id], replay = !!rec && !rec.skipped;
    QQ.recordAnswers(S, sess.log, t);
    var failed = sess.failed, stars = sess.stars(), xp = sess.xp(replay);
    if (!failed) QQ.completeLevel(S, lv.id, stars, t);
    S.stats.sessions++;
    QQ.touchActivity(S, xp, t);
    var badges = QQ.evaluateBadges(S, D, t);
    save();
    var wp = QQ.worldProgress(w, S), boss = lv.kind === 'boss';
    var keys = levelFactKeys(lv), stale = keys.filter(function (k) { return QQ.factStatus(FACTS[k], t) === 'stale'; }).length;
    var title = failed ? 'Cuori finiti' : boss ? 'Boss sconfitto!' : 'Livello completato!';
    var sub = failed ? 'Rileggi la lezione e riprova: gli errori fanno parte del gioco.' : wp.complete ? 'Hai completato «' + w.title + '». Mondo chiuso!' : lv.title;
    resultScreen(ctx.player, {
      failed: failed, stars: stars, xp: xp, accuracy: sess.accuracy(), title: title, sub: sub, badges: badges,
      note: stale ? 'Alcuni dati di questo livello sono da riverificare: guarda la scheda Novità.' : null,
      retry: failed ? function () { ctx.player.destroy(); startLevel(w, i, false); } : null,
      done: function () { ctx.player.destroy(); if (!failed && i + 1 < w.levels.length) V.open[w.id] = true; render(); }
    });
    if (wp.complete && !failed) setTimeout(confetti, 600);
  }
  function finishPractice(kind, ctx) {
    var sess = ctx.session, t = today();
    QQ.recordAnswers(S, sess.log, t);
    var xp = sess.xp(false);
    if (kind === 'review' && !sess.failed) S.stats.reviews++;
    S.stats.sessions++;
    QQ.touchActivity(S, xp, t);
    var badges = QQ.evaluateBadges(S, D, t);
    save();
    resultScreen(ctx.player, {
      failed: sess.failed, stars: sess.stars(), xp: xp, accuracy: sess.accuracy(), badges: badges,
      title: sess.failed ? 'Sessione interrotta' : kind === 'review' ? 'Ripasso completato!' : 'Allenamento completato!',
      sub: sess.failed ? 'Troppi errori per oggi: riprova più tardi.' : 'Ripassare a intervalli fa restare le cose in testa.',
      done: function () { ctx.player.destroy(); render(); }
    });
  }

  /* ============================================================ assessment */
  function startAssessment() {
    if (!PLAYABLE.length) { toast('I contenuti non sono ancora disponibili'); return; }
    var a = new QQ.Assessment(D);
    openPlayer({
      title: 'Assessment', hue: 215, session: new QQ.Session([], 'practice'), lesson: {
        points: [
          a.total + ' domande, circa ' + Math.max(5, Math.round(a.total * 0.3)) + ' minuti, nessun cuore da perdere.',
          'Le domande si adattano: se rispondi bene diventano più difficili, altrimenti più semplici.',
          '«Non lo so» è una risposta valida e utile: meglio dichiararlo che indovinare.',
          'È una stima: due domande per area hanno un margine d\'errore alto. Puoi rifarlo quando vuoi.'
        ], ae: 'Alla fine vedi la mappa delle tue competenze e i livelli già padroneggiati vengono accreditati.'
      }, assessment: a, onFinish: finishAssessmentFlow
    });
  }
  function finishAssessmentFlow(ctx) {
    var t = today(), a = ctx.assessment, res = a.results();
    QQ.recordAnswers(S, ctx.log, t);
    var plan = QQ.applyAssessment(S, res, D, t);
    S.assessSkipped = false;
    QQ.touchActivity(S, 50, t);
    var badges = QQ.evaluateBadges(S, D, t);
    save();
    var pl = ctx.player;
    var order = PLAYABLE.filter(function (w) { return res[w.id]; }).sort(function (x, y) { return res[x.id].score - res[y.id].score; });
    var body = h('div', { 'class': 'stack' },
      h('div', { 'class': 'result' }, mascot(104, 'cheer'), h('h2', { text: plan.rank }), h('p', { 'class': 'muted', text: 'Il tuo livello stimato. ' + plural(plan.credited.length, 'livello accreditato', 'livelli accreditati') + ' per ciò che già sai.' })),
      h('div', { 'class': 'card' }, radarSVG(res)),
      h('div', { 'class': 'card' }, h('div', { 'class': 'eyebrow', text: 'Da dove conviene partire' }), h('div', { 'class': 'legend', style: 'margin-top:6px' }, order.map(function (w) {
        return h('div', { 'class': 'lg' }, h('span', { 'aria-hidden': 'true', text: w.icon }), h('span', { text: w.title }), h('span', { 'class': 'pill ' + (res[w.id].score >= 2 ? 'good' : res[w.id].score === 0 ? 'bad' : ''), text: QQ.SCORE_LABEL[res[w.id].score] }));
      }))),
      badges.length ? h('div', { 'class': 'card' }, h('div', { 'class': 'eyebrow', text: 'Nuovi badge' }), h('div', { 'class': 'badges center', style: 'margin-top:8px' }, badges.map(function (b) { return badgeEl(b, true); }))) : null,
      h('p', { 'class': 'small muted', text: '+50 XP per aver completato l\'assessment. Le domande sbagliate finiscono nel Ripasso, con spiegazione.' }));
    pl.frame(h('div', { 'class': 'play-head' }, h('div', { 'class': 'pbar' }, h('i', { style: 'width:100%' }))), body,
      pl.footBar(h('button', { 'class': 'btn good block', type: 'button', id: 'cont', onclick: function () { pl.destroy(); V.tab = 'path'; var up = QQ.nextUp(D, S); if (up) V.open[up.world.id] = true; render(); window.scrollTo(0, 0); } }, 'Inizia il percorso')));
    pl.setStep('result');
    sfx('win'); confetti();
  }
  function radarSVG(res) {
    var ws = PLAYABLE.filter(function (w) { return res[w.id]; }), N = ws.length, cx = 150, cy = 150, R = 92;
    function pt(i, f) { var a = -Math.PI / 2 + i * 2 * Math.PI / N; return [cx + Math.cos(a) * R * f, cy + Math.sin(a) * R * f]; }
    function poly(f) { return ws.map(function (_, i) { return pt(i, f).map(function (v) { return v.toFixed(1); }).join(','); }).join(' '); }
    var svg = sv('svg', { 'class': 'radar', viewBox: '0 0 300 300', width: '100%', role: 'img', 'aria-label': 'Radar delle competenze per area' });
    [1 / 3, 2 / 3, 1].forEach(function (f) { svg.appendChild(sv('polygon', { 'class': 'ring-l', points: poly(f) })); });
    ws.forEach(function (_, i) { var p = pt(i, 1); svg.appendChild(sv('line', { 'class': 'axis', x1: cx, y1: cy, x2: p[0].toFixed(1), y2: p[1].toFixed(1) })); });
    var pts = ws.map(function (w, i) { return pt(i, (res[w.id].score + 0.3) / 3.3).map(function (v) { return v.toFixed(1); }).join(','); }).join(' ');
    svg.appendChild(sv('polygon', { 'class': 'area', points: pts }));
    ws.forEach(function (w, i) {
      var q = pt(i, (res[w.id].score + 0.3) / 3.3); svg.appendChild(sv('circle', { 'class': 'pt', cx: q[0].toFixed(1), cy: q[1].toFixed(1), r: 4 }));
      var l = pt(i, 1.2), tx = sv('text', { x: l[0].toFixed(1), y: (l[1] + 5).toFixed(1), 'text-anchor': 'middle', 'font-size': 16 }); tx.textContent = w.icon; svg.appendChild(tx);
    });
    return svg;
  }

  /* ================================================================ ripasso */
  function tabReview() {
    var t = today(), out = [];
    var due = QQ.dueIds(S, t).filter(function (id) { return IDX.ex[id]; });
    var total = Object.keys(S.srs).filter(function (id) { return IDX.ex[id]; }).length;
    out.push(h('section', { 'class': 'card stack' },
      h('div', { 'class': 'hero' }, mascot(72, due.length ? 'think' : 'happy'), h('div', null, h('h2', { text: due.length ? plural(due.length, 'domanda', 'domande') + ' da ripassare' : 'Tutto in pari' }), h('p', { 'class': 'muted small', text: total ? total + ' domande nel tuo mazzo di ripasso.' : 'Il mazzo si riempie mentre giochi.' }))),
      h('button', { 'class': 'btn block', type: 'button', onclick: startReview }, due.length ? 'Inizia il ripasso' : 'Allenamento mirato'),
      h('p', { 'class': 'small muted', text: 'Come funziona: ogni risposta giusta allunga l\'intervallo (1, 3, 7, 16, 35 giorni), ogni errore lo accorcia. Le domande sbagliate nell\'assessment sono già nel mazzo.' })));
    var ws = PLAYABLE.map(function (w) { var a = S.acc[w.id]; return { w: w, a: a }; }).filter(function (x) { return x.a && x.a[1] > 0; });
    if (ws.length) {
      out.push(h('section', { 'class': 'card' }, h('div', { 'class': 'eyebrow', text: 'Precisione per area' }), h('div', { 'class': 'legend', style: 'margin-top:6px' }, ws.map(function (x) {
        var pct = Math.round(100 * x.a[0] / x.a[1]);
        return h('div', { 'class': 'lg', style: '--wh:' + hueOf(x.w) }, h('span', { 'aria-hidden': 'true', text: x.w.icon }),
          h('div', null, h('div', { 'class': 'small', text: x.w.title }), h('div', { 'class': 'bar', style: 'margin-top:3px' }, h('i', { style: 'width:' + pct + '%' }))),
          h('span', { 'class': 'num small', style: 'font-weight:800', text: pct + '%' }));
      }))));
    }
    return out;
  }

  /* ================================================================== novità */
  function tabNews() {
    var t = today(), st = QQ.contentStatus(D, t), out = [];
    var news = (D.news && D.news.items) || [];
    out.push(h('section', { 'class': 'card stack' },
      h('div', { 'class': 'eyebrow', text: 'Stato dei contenuti' }),
      h('div', { 'class': 'kpis' },
        h('div', { 'class': 'kpi' }, h('span', { 'class': 'big-num num', text: st.total }), h('span', { 'class': 'tiny muted', text: 'fatti tracciati' })),
        h('div', { 'class': 'kpi' }, h('span', { 'class': 'big-num num', style: st.stale ? 'color:var(--bad)' : '', text: st.stale }), h('span', { 'class': 'tiny muted', text: 'da riverificare' })),
        h('div', { 'class': 'kpi' }, h('span', { 'class': 'big-num num', style: st.soon ? 'color:var(--warn)' : '', text: st.soon }), h('span', { 'class': 'tiny muted', text: 'in scadenza (14 gg)' }))),
      h('p', { 'class': 'small muted' }, 'Contenuti verificati al ', h('b', { text: fmtDate(D.meta.contentDate) }), '. Ogni numero, data o nome che può cambiare è un «fatto» con data, fonte e affidabilità: quando scade, il gioco lo segnala e l\'aggiornamento lo sostituisce in tutte le domande insieme.'),
      h('p', { 'class': 'small muted', text: 'Affidabilità: ' + (st.byConf.primary || 0) + ' ufficiali, ' + (st.byConf.secondary || 0) + ' da fonti secondarie, ' + (st.byConf.low || 0) + ' deboli. Verifica sempre sui canali ufficiali SAP prima di usare un dato in una proposta.' })));
    var recheck = Object.keys(FACTS).filter(function (k) { return QQ.factStatus(FACTS[k], t) !== 'ok'; }).sort(function (a, b) { return FACTS[a].staleAfter < FACTS[b].staleAfter ? -1 : 1; });
    if (recheck.length) out.push(h('section', { 'class': 'card' }, h('div', { 'class': 'eyebrow', text: 'Da riverificare' }), h('div', null, recheck.map(function (k) { return factRow(k); }))));
    out.push(h('section', { 'class': 'card' },
      h('div', { 'class': 'row', style: 'justify-content:space-between' }, h('div', { 'class': 'eyebrow', text: 'Radar notizie' }), D.news && D.news.fetchedAt ? h('span', { 'class': 'tiny muted', text: 'aggiornato ' + fmtDate(D.news.fetchedAt) }) : null),
      news.length ? h('div', null, news.filter(function (n) { return n && /^https?:\/\//i.test(n.link || '') && n.title; }).slice(0, 12).map(function (n) {
        return h('a', { 'class': 'news', href: n.link, target: '_blank', rel: 'noopener noreferrer' }, h('span', { 'class': 'tiny muted', text: (n.source || '') + (n.date ? ' · ' + fmtDate(n.date) : '') }), h('b', { text: n.title }), n.summary ? h('span', { 'class': 'small muted', text: n.summary }) : null);
      })) : h('p', { 'class': 'muted small', style: 'margin-top:8px', text: 'Nessuna notizia in questa versione. Il feed (SAP News Center e rassegna stampa) viene aggiornato ogni giorno dall\'automazione del repository.' })));
    var search = h('input', { 'class': 'search', type: 'text', id: 'ff', placeholder: 'Cerca un fatto (es. backlog, ECC, Joule)', value: V.filter, 'aria-label': 'Cerca tra i fatti' });
    var list = h('div');
    function paint() {
      list.textContent = '';
      var q = V.filter.trim().toLowerCase();
      Object.keys(FACTS).filter(function (k) { return !q || (k + ' ' + FACTS[k].label + ' ' + FACTS[k].value).toLowerCase().indexOf(q) >= 0; })
        .sort(function (a, b) { return FACTS[a].label.localeCompare(FACTS[b].label, 'it'); }).slice(0, 80)
        .forEach(function (k) { list.appendChild(factRow(k)); });
      if (!list.firstChild) list.appendChild(h('p', { 'class': 'muted small', text: 'Nessun fatto corrisponde.' }));
    }
    search.addEventListener('input', function () { V.filter = search.value; paint(); });
    paint();
    out.push(h('section', { 'class': 'card stack' }, h('div', { 'class': 'eyebrow', text: 'Tutti i fatti e le fonti' }), search, list));
    return out;
  }
  function factRow(k) {
    var f = FACTS[k], st = QQ.factStatus(f, today()), n = usageCounts()[k] || 0;
    return h('details', { 'class': 'fact' },
      h('summary', null, h('div', null, h('b', { text: f.label }), h('div', { 'class': 'small muted', text: f.value })), statusPill(st)),
      h('dl', null,
        h('dt', { text: 'Riferito al' }), h('dd', { text: fmtDate(f.asOf) }),
        h('dt', { text: 'Verificato il' }), h('dd', { text: fmtDate(f.checked) }),
        h('dt', { text: 'Valido fino al' }), h('dd', { text: fmtDate(f.staleAfter) }),
        h('dt', { text: 'Affidabilità' }), h('dd', { text: CONF[f.confidence] }),
        h('dt', { text: 'Usato in' }), h('dd', { text: plural(n, 'domanda', 'domande') }),
        h('dt', { text: 'Fonte' }), h('dd', null, h('a', { href: f.source, target: '_blank', rel: 'noopener noreferrer', text: host(f.source) })),
        f.note ? [h('dt', { text: 'Nota' }), h('dd', { text: f.note })] : null));
  }

  /* ================================================================= profilo */
  function badgeEl(b, got) {
    return h('div', { 'class': 'badge' + (got ? '' : ' off'), title: b.desc }, h('div', { 'class': 'm' }, icon(b.id.indexOf('streak') === 0 ? 'flame' : b.id === 'boss' ? 'crown' : b.id.indexOf('xp') === 0 ? 'bolt' : 'trophy', 24)), h('b', { text: b.title }));
  }
  function tabProfile() {
    var out = [], t = today();
    var played = 0, stars = 0;
    Object.keys(S.levels).forEach(function (id) { var l = S.levels[id]; if (!l.skipped) { played++; stars += l.stars || 0; } });
    var acc = S.stats.answered ? Math.round(100 * S.stats.correct / S.stats.answered) : 0;
    var nameIn = h('input', { type: 'text', id: 'nm2', value: S.name || '', placeholder: 'Il tuo nome', maxlength: 24, 'aria-label': 'Il tuo nome' });
    nameIn.addEventListener('change', function () { S.name = nameIn.value.trim().slice(0, 24); save(); toast('Salvato'); });
    out.push(h('section', { 'class': 'card stack' },
      h('div', { 'class': 'hero' }, mascot(72, 'happy'), h('div', null, h('h2', { text: S.name || 'Il tuo profilo' }), h('p', { 'class': 'muted', text: S.assessment ? S.assessment.rank : 'Fai l\'assessment per scoprire il tuo livello' }))),
      nameIn,
      h('div', { 'class': 'kpis' },
        h('div', { 'class': 'kpi' }, h('span', { 'class': 'big-num num', text: played }), h('span', { 'class': 'tiny muted', text: 'livelli giocati' })),
        h('div', { 'class': 'kpi' }, h('span', { 'class': 'big-num num', text: acc + '%' }), h('span', { 'class': 'tiny muted', text: 'risposte giuste' })),
        h('div', { 'class': 'kpi' }, h('span', { 'class': 'big-num num', text: S.streak.best }), h('span', { 'class': 'tiny muted', text: 'streak record' })))));
    if (S.assessment) {
      out.push(h('section', { 'class': 'card stack' }, h('div', { 'class': 'eyebrow', text: 'Mappa delle competenze · ' + fmtDate(S.assessment.date) }), radarSVG(S.assessment.results),
        h('button', { 'class': 'btn alt block', type: 'button', onclick: startAssessment }, 'Rifai l\'assessment'),
        h('p', { 'class': 'tiny muted', text: 'Rifarlo non cancella i livelli già completati.' })));
    } else {
      out.push(h('section', { 'class': 'card stack' }, h('div', { 'class': 'eyebrow', text: 'Assessment' }), h('p', { 'class': 'muted', text: 'Non l\'hai ancora fatto. Dura circa 8 minuti.' }), h('button', { 'class': 'btn block', type: 'button', onclick: startAssessment }, 'Fai l\'assessment')));
    }
    out.push(h('section', { 'class': 'card stack' }, h('div', { 'class': 'eyebrow', text: 'Badge · ' + Object.keys(S.badges).length + '/' + QQ.BADGES.length }),
      h('div', { 'class': 'badges' }, QQ.BADGES.map(function (b) { return badgeEl(b, !!S.badges[b.id]); }))));

    function toggle(label, key, onset) {
      var b = h('button', { 'class': 'toggle', type: 'button', role: 'switch', 'aria-checked': S.settings[key] ? 'true' : 'false', 'aria-label': label, onclick: function () {
        S.settings[key] = !S.settings[key]; b.setAttribute('aria-checked', S.settings[key] ? 'true' : 'false'); save(); if (onset) onset(); } });
      return h('div', { 'class': 'switch' }, h('span', { text: label }), b);
    }
    var theme = h('select', { id: 'thm', 'aria-label': 'Tema' }, [['auto', 'Automatico'], ['light', 'Chiaro'], ['dark', 'Scuro']].map(function (o) { return h('option', { value: o[0], selected: S.settings.theme === o[0] ? true : null, text: o[1] }); }));
    theme.addEventListener('change', function () { S.settings.theme = theme.value; applyTheme(); save(); });
    var goal = h('select', { id: 'gl', 'aria-label': 'Obiettivo giornaliero' }, [20, 30, 50, 100].map(function (g) { return h('option', { value: g, selected: S.daily.goal === g ? true : null, text: g + ' XP al giorno' }); }));
    goal.addEventListener('change', function () { S.daily.goal = +goal.value; save(); render(); });
    out.push(h('section', { 'class': 'card' }, h('div', { 'class': 'eyebrow', text: 'Impostazioni' }),
      toggle('Suoni', 'sound'),
      h('div', { 'class': 'switch' }, h('span', { text: 'Tema' }), theme),
      h('div', { 'class': 'switch' }, h('span', { text: 'Obiettivo' }), goal)));

    var code = h('textarea', { id: 'bk', 'aria-label': 'Codice di backup', placeholder: 'Incolla qui un codice di backup per importare i progressi', spellcheck: 'false' });
    var resetStep = 0, rbtn;
    rbtn = h('button', { 'class': 'btn ghost block', type: 'button', onclick: function () {
      if (!resetStep) { resetStep = 1; rbtn.textContent = 'Sicuro? Tocca di nuovo per cancellare tutto'; rbtn.className = 'btn bad block'; return; }
      var keep = S.settings; S = QQ.newState(); S.settings = keep; S.updatedAt = Date.now(); persistLocal(); Cloud.push(true); toast('Progressi azzerati'); render();
    } }, 'Azzera i progressi');
    out.push(h('section', { 'class': 'card stack' }, h('div', { 'class': 'eyebrow', text: 'I tuoi dati' }),
      h('p', { 'class': 'small muted', text: 'Salvataggio: ' + (Cloud.status === 'sincronizzato' ? 'sul tuo profilo (sincronizzato tra dispositivi) e in questo browser.' : Cloud.status === 'errore' ? 'solo in questo browser (la sincronizzazione ha dato errore).' : 'solo in questo browser. Per non perdere i progressi esporta un codice di backup.') }),
      h('div', { 'class': 'row' },
        h('button', { 'class': 'btn alt sm', type: 'button', onclick: function () {
          var c = QQ.exportCode(S); code.value = c;
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(c).then(function () { toast('Codice copiato'); }, function () { code.select(); toast('Seleziona e copia il codice'); });
          else { code.select(); toast('Seleziona e copia il codice'); }
        } }, 'Esporta backup'),
        h('button', { 'class': 'btn alt sm', type: 'button', onclick: function () {
          try { var ns = QQ.importCode(code.value); S = ns; S.updatedAt = Date.now(); persistLocal(); Cloud.push(true); applyTheme(); toast('Progressi importati'); render(); }
          catch (e) { toast('Codice non valido'); }
        } }, 'Importa')),
      code, rbtn));
    out.push(h('section', { 'class': 'small muted stack', style: 'padding:4px 4px 12px' },
      h('p', { text: D.meta.levels + ' livelli · ' + D.meta.exercises + ' esercizi · ' + D.meta.assessmentItems + ' domande di assessment · ' + D.meta.facts + ' fatti con fonte.' }),
      h('p', { text: 'Progetto non ufficiale, non affiliato né approvato da SAP SE. I marchi citati appartengono ai rispettivi proprietari. Solo informazioni pubbliche: per prezzi, sconti e policy fai riferimento ai canali interni ufficiali.' })));
    void t; void stars;
    return out;
  }

  /* ================================================================== avvio */
  applyTheme();
  render();
  Cloud.init();
  window.QuotaQuest = { get state() { return S; }, data: D, engine: QQ, render: render, startLevel: startLevel, startAssessment: startAssessment, startReview: startReview, player: function () { return player && player.debug(); }, version: 1 };
})();
