/* FinQuest — applicazione: stato, percorso, lezioni, ricompense, schermate */
(function (root) {
  const FQ = root.FQ;
  const U = FQ.U, h = U.h, C = FQ.Charts, E = FQ.Engine;
  const App = (FQ.App = {});
  const KEY = 'finquest.v1';
  const MAXH = 5, REGEN_MIN = 20, REFILL_COST = 300, FREEZE_COST = 200;

  /* ====================== STATO ====================== */
  const def = () => ({
    v: 1, t: 0, name: '', created: U.today(), goal: 20, start: 1, unlocked: 1,
    xp: 0, coins: 100, hearts: MAXH, hTs: Date.now(), streak: 0, best: 0, last: null, freeze: 0,
    days: {}, prog: {}, mist: [], stats: { ans: 0, ok: 0, ses: 0, perf: 0, sims: 0, charts: 0, calcs: 0, combo: 0, time: 0 },
    badges: {}, quests: null, set: { sound: true, relax: false, theme: 'system' }, onb: false, unit: null,
  });
  let S = def();
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(def(), JSON.parse(raw)); } catch (e) { /* storage non disponibile */ }
    S.stats = Object.assign(def().stats, S.stats || {});
    S.set = Object.assign(def().set, S.set || {});
  }
  function save(skipSync) {
    S.t = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignora */ }
    if (!skipSync) Sync.push();
  }
  App.state = () => S;

  /* Sincronizzazione opzionale con il db dell’artifact (per chi può scrivere) */
  const Sync = {
    ref: null, busy: false, pending: false, timer: null,
    async init() {
      try {
        if (!root.claude || !root.claude.use) return;
        const [db, user] = await Promise.all([root.claude.use('db'), root.claude.use('user')]);
        if (!db || !user) return;
        const id = await user.id();
        if (!id) return;
        this.ref = db.doc('data/users/' + id + '/progress');
        const snap = await this.ref.get();
        if (snap.exists) {
          const d = snap.data();
          const cloud = d && typeof d.s === 'string' ? JSON.parse(d.s) : null;
          if (cloud && cloud.t > S.t) {
            S = Object.assign(def(), cloud);
            S.stats = Object.assign(def().stats, S.stats || {});
            S.set = Object.assign(def().set, S.set || {});
            try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignora */ }
            if (U.$('#lesson').hidden) boot();
            toast('Progressi sincronizzati dal tuo account');
            return;
          }
        }
        this.push(true);
      } catch (e) { this.ref = null; }
    },
    push(now) {
      if (!this.ref) return;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.write(), now ? 0 : 2500);
    },
    async write() {
      if (!this.ref) return;
      if (this.busy) { this.pending = true; return; }
      this.busy = true;
      try { await this.ref.set({ s: JSON.stringify(S), t: S.t }); } catch (e) { if (e && e.code === 'invalid_argument') this.ref = null; }
      this.busy = false;
      if (this.pending) { this.pending = false; this.write(); }
    },
  };

  /* ====================== SUONI ====================== */
  let AC = null;
  function tone(f, dur, type = 'sine', when = 0, vol = 0.07) {
    if (!AC) return;
    const t0 = AC.currentTime + when;
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(AC.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  App.sfx = function (k) {
    if (!S.set.sound) return;
    try {
      if (!AC) { const A = root.AudioContext || root.webkitAudioContext; if (!A) return; AC = new A(); }
      if (AC.state === 'suspended') AC.resume();
    } catch (e) { return; }
    if (k === 'ok') { tone(659, 0.1, 'triangle'); tone(988, 0.16, 'triangle', 0.08); }
    else if (k === 'wrong') { tone(220, 0.16, 'sawtooth', 0, 0.035); tone(165, 0.22, 'sawtooth', 0.09, 0.035); }
    else if (k === 'tap') tone(540, 0.035, 'triangle', 0, 0.03);
    else if (k === 'done') [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', i * 0.09));
    else if (k === 'coin') { tone(1319, 0.06, 'square', 0, 0.025); tone(1760, 0.1, 'square', 0.05, 0.025); }
  };

  /* ====================== PROGRESSI ====================== */
  const stars = (lv, si) => { const p = S.prog[lv]; return p ? Number(p[si]) || 0 : 0; };
  function setStars(lv, si, n) {
    const p = (S.prog[lv] || '0'.repeat(20)).split('');
    p[si] = String(Math.max(Number(p[si]) || 0, n));
    S.prog[lv] = p.join('');
  }
  const levelDone = (lv) => stars(lv, 19) > 0;
  const levelCount = (lv) => { const p = S.prog[lv]; return p ? p.split('').filter((x) => x !== '0').length : 0; };
  function isOpen(lv, si) {
    if (lv < S.unlocked) return true;
    if (si === 0) return lv === S.unlocked || levelDone(lv - 1);
    return stars(lv, si - 1) > 0;
  }
  function frontier() {
    for (let lv = S.unlocked; lv <= 100; lv++) for (let si = 0; si < 20; si++) {
      if (!stars(lv, si)) return isOpen(lv, si) ? { lv, si } : null;
    }
    return { lv: 100, si: 19 };
  }
  const maxReached = () => { const f = frontier(); return Math.max(S.unlocked, f ? f.lv : 100, ...Object.keys(S.prog).map(Number)); };
  const stagesDone = () => Object.values(S.prog).reduce((a, p) => a + p.split('').filter((x) => x !== '0').length, 0);
  const levelsDone = () => FQ.LEVELS.filter((l) => levelDone(l.id)).length;

  /* ====================== VITE, SERIE, OBIETTIVI ====================== */
  function regen() {
    if (S.hearts >= MAXH) { S.hTs = Date.now(); return; }
    const k = Math.floor((Date.now() - S.hTs) / (REGEN_MIN * 60000));
    if (k > 0) { S.hearts = Math.min(MAXH, S.hearts + k); S.hTs += k * REGEN_MIN * 60000; if (S.hearts >= MAXH) S.hTs = Date.now(); }
  }
  const nextHeartIn = () => Math.max(0, S.hTs + REGEN_MIN * 60000 - Date.now());
  function checkStreak() {
    if (!S.last) return;
    const gap = U.dayDiff(S.last, U.today());
    if (gap > 1 + S.freeze) S.streak = 0;
  }
  function bumpStreak() {
    const t = U.today();
    if (S.last === t) return false;
    if (S.last) {
      const gap = U.dayDiff(S.last, t);
      if (gap === 1) S.streak++;
      else if (gap > 1 && S.freeze >= gap - 1) { S.freeze -= gap - 1; S.streak++; }
      else S.streak = 1;
    } else S.streak = 1;
    S.last = t;
    S.best = Math.max(S.best, S.streak);
    return true;
  }
  const todayXp = () => S.days[U.today()] || 0;

  const QT = [
    { id: 'xp', t: (n) => `Guadagna ${n} XP`, n: [30, 50, 80], c: 20 },
    { id: 'stages', t: (n) => `Completa ${n} tappe`, n: [2, 3, 4], c: 20 },
    { id: 'charts', t: (n) => `Rispondi bene a ${n} domande sui grafici`, n: [3, 5], c: 15 },
    { id: 'calcs', t: (n) => `Risolvi correttamente ${n} calcoli`, n: [3, 5], c: 15 },
    { id: 'perfect', t: () => 'Completa una tappa senza errori', n: [1], c: 25 },
    { id: 'combo', t: (n) => `Fai una serie di ${n} risposte giuste`, n: [5, 8], c: 15 },
  ];
  function quests() {
    const t = U.today();
    if (!S.quests || S.quests.day !== t) {
      const r = U.rng(U.hash(t + (S.created || '')));
      S.quests = { day: t, list: r.sample(QT, 3).map((q) => ({ id: q.id, n: r.pick(q.n), p: 0, claimed: false })) };
    }
    return S.quests.list;
  }
  function questProgress(ev) {
    quests().forEach((q) => {
      if (q.id === 'combo') q.p = Math.max(q.p, ev.combo || 0);
      else q.p += ev[q.id] || 0;
      q.p = Math.min(q.p, q.n);
    });
  }

  const BADGES = [
    { id: 'first', n: 'Primo passo', d: 'Completa la tua prima tappa', i: '🌱', t: () => S.stats.ses >= 1 },
    { id: 'lvl', n: 'Esame superato', d: 'Supera il tuo primo esame di livello', i: '🎓', t: () => levelsDone() >= 1 },
    { id: 'lvl10', n: 'Dieci livelli', d: 'Completa 10 livelli', i: '🔟', t: () => levelsDone() >= 10 },
    { id: 'lvl50', n: 'Metà percorso', d: 'Completa 50 livelli', i: '🏔️', t: () => levelsDone() >= 50 },
    { id: 's3', n: 'Costanza', d: 'Serie di 3 giorni', i: '🔥', t: () => S.best >= 3 },
    { id: 's7', n: 'Settimana d’oro', d: 'Serie di 7 giorni', i: '📅', t: () => S.best >= 7 },
    { id: 's30', n: 'Interesse composto', d: 'Serie di 30 giorni', i: '❄️', t: () => S.best >= 30 },
    { id: 'perf', n: 'Impeccabile', d: 'Una tappa senza errori', i: '💎', t: () => S.stats.perf >= 1 },
    { id: 'perf10', n: 'Precisione chirurgica', d: '10 tappe senza errori', i: '🎯', t: () => S.stats.perf >= 10 },
    { id: 'combo10', n: 'In striscia', d: '10 risposte giuste di fila', i: '⚡', t: () => S.stats.combo >= 10 },
    { id: 'xp1k', n: 'Mille XP', d: 'Raggiungi 1.000 XP', i: '🥉', t: () => S.xp >= 1000 },
    { id: 'xp5k', n: 'Cinquemila XP', d: 'Raggiungi 5.000 XP', i: '🥈', t: () => S.xp >= 5000 },
    { id: 'xp20k', n: 'Ventimila XP', d: 'Raggiungi 20.000 XP', i: '🥇', t: () => S.xp >= 20000 },
    { id: 'chart', n: 'Occhio da analista', d: '50 grafici letti correttamente', i: '📈', t: () => S.stats.charts >= 50 },
    { id: 'calc', n: 'Mente matematica', d: '50 calcoli corretti', i: '🧮', t: () => S.stats.calcs >= 50 },
    { id: 'sim', n: 'Trader disciplinato', d: '10 simulazioni superate', i: '🕹️', t: () => S.stats.sims >= 10 },
    ...FQ.UNITS.map((u) => ({ id: 'u' + u.id, n: u.title, d: `Completa l’unità ${u.id}`, i: '🏅', unit: u.id, t: () => FQ.LEVELS.filter((l) => l.unit === u.id).every((l) => levelDone(l.id)) })),
    { id: 'master', n: 'Investitore consapevole', d: 'Supera l’esame del livello 100', i: '👑', t: () => levelDone(100) },
  ];
  function checkBadges() {
    const fresh = [];
    BADGES.forEach((b) => { if (!S.badges[b.id] && b.t()) { S.badges[b.id] = U.today(); fresh.push(b); } });
    return fresh;
  }

  /* ====================== MASCOTTE ====================== */
  App.toro = function (mood = 'happy', size = 96) {
    const mouth = mood === 'sad' ? '<path d="M51 92 Q60 86 69 92" fill="none" style="stroke:var(--ink)" stroke-width="3" stroke-linecap="round"/>'
      : mood === 'wow' ? '<ellipse cx="60" cy="90" rx="4.5" ry="5.5" style="fill:var(--ink)"/>'
        : '<path d="M51 88 Q60 96 69 88" fill="none" style="stroke:var(--ink)" stroke-width="3" stroke-linecap="round"/>';
    const brow = mood === 'sad' ? '<path d="M36 42 L50 47 M84 42 L70 47" style="stroke:var(--ink)" stroke-width="3" stroke-linecap="round"/>' : '';
    return `<svg class="toro" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true">
      <path d="M30 40 C14 36 8 22 14 10 C20 24 28 28 40 30Z" style="fill:var(--horn)"/>
      <path d="M90 40 C106 36 112 22 106 10 C100 24 92 28 80 30Z" style="fill:var(--horn)"/>
      <ellipse cx="22" cy="50" rx="11" ry="7" style="fill:var(--mascot-d)" transform="rotate(-20 22 50)"/>
      <ellipse cx="98" cy="50" rx="11" ry="7" style="fill:var(--mascot-d)" transform="rotate(20 98 50)"/>
      <rect x="26" y="26" width="68" height="76" rx="32" style="fill:var(--mascot)"/>
      <path d="M50 28 Q60 40 70 28" style="fill:var(--mascot-d)"/>
      <ellipse cx="60" cy="80" rx="26" ry="18" style="fill:var(--snout)"/>
      <circle cx="51" cy="77" r="3.2" style="fill:var(--ink)"/><circle cx="69" cy="77" r="3.2" style="fill:var(--ink)"/>
      <circle cx="45" cy="55" r="8" fill="#fff"/><circle cx="75" cy="55" r="8" fill="#fff"/>
      <circle cx="47" cy="56" r="4.2" style="fill:var(--ink)"/><circle cx="73" cy="56" r="4.2" style="fill:var(--ink)"/>
      <circle cx="48.5" cy="54.5" r="1.4" fill="#fff"/><circle cx="74.5" cy="54.5" r="1.4" fill="#fff"/>
      ${brow}${mouth}
    </svg>`;
  };

  /* ====================== UI DI BASE ====================== */
  let tab = 'path';
  const shell = {};
  function buildShell() {
    const app = U.$('#app');
    app.innerHTML = '';
    const navItems = [['path', '🧭', 'Percorso'], ['practice', '🏋️', 'Allenamento'], ['glossary', '📚', 'Glossario'], ['goals', '🏆', 'Traguardi'], ['profile', '👤', 'Profilo']];
    const navBtn = (cls) => navItems.map(([k, i, n]) => h('button', { class: cls + ' nav-' + k, type: 'button', 'data-tab': k, onclick: () => go(k) }, h('span', { class: 'nav-i', 'aria-hidden': 'true' }, i), h('span', { class: 'nav-t' }, n)));
    shell.rail = h('aside', { class: 'rail' }, h('div', { class: 'brand' }, h('span', { class: 'brand-mark', html: App.toro('happy', 34) }), h('span', { class: 'brand-name' }, 'FinQuest')), h('nav', { class: 'rail-nav' }, navBtn('rail-b')));
    shell.top = h('header', { class: 'topbar' });
    shell.main = h('main', { id: 'main', tabindex: '-1' });
    shell.side = h('aside', { class: 'side' });
    shell.tabs = h('nav', { class: 'tabbar' }, navBtn('tab-b'));
    app.append(shell.rail, h('div', { class: 'col' }, shell.top, shell.main), shell.side, shell.tabs);
  }
  function go(k) {
    tab = k;
    App.sfx('tap');
    render();
    shell.main.scrollTop = 0;
    root.scrollTo && root.scrollTo(0, 0);
  }
  function statChips() {
    regen();
    const hearts = S.set.relax ? '∞' : S.hearts;
    return h('div', { class: 'chips' },
      h('button', { class: 'chip chip-streak' + (S.last === U.today() ? ' lit' : ''), type: 'button', title: 'Serie di giorni', onclick: () => go('goals') }, h('span', { 'aria-hidden': 'true' }, '🔥'), h('b', null, S.streak)),
      h('button', { class: 'chip chip-coin', type: 'button', title: 'Monete', onclick: openShop }, h('span', { 'aria-hidden': 'true' }, '🪙'), h('b', null, U.nf(S.coins))),
      h('button', { class: 'chip chip-heart', type: 'button', title: 'Vite', onclick: openShop }, h('span', { 'aria-hidden': 'true' }, '❤️'), h('b', null, hearts)),
    );
  }
  function goalRing(size = 64) {
    const p = Math.min(1, todayXp() / S.goal);
    const R = size / 2 - 6, c = 2 * Math.PI * R;
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="ring" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${R}" class="ring-bg"/><circle cx="${size / 2}" cy="${size / 2}" r="${R}" class="ring-fg" stroke-dasharray="${(c * p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
  }
  function renderSide() {
    const qs = quests();
    shell.side.innerHTML = '';
    shell.side.append(
      statChips(),
      h('section', { class: 'panel goal-panel' }, h('div', { class: 'goal-ring', html: goalRing(68) }), h('div', null, h('h3', null, 'Obiettivo di oggi'), h('p', { class: 'mono' }, `${todayXp()} / ${S.goal} XP`), h('p', { class: 'muted small' }, todayXp() >= S.goal ? 'Raggiunto. Ottimo lavoro!' : 'Ogni tappa vale almeno 10 XP.'))),
      h('section', { class: 'panel' }, h('h3', null, 'Missioni giornaliere'), ...qs.map(questRow), h('button', { class: 'link', type: 'button', onclick: () => go('goals') }, 'Vedi tutti i traguardi')),
      h('section', { class: 'panel muted small' }, h('p', null, 'FinQuest è un gioco didattico: non è consulenza finanziaria. I dati dei grafici sono simulati.')),
    );
  }
  function questRow(q) {
    const T = QT.find((x) => x.id === q.id);
    const done = q.p >= q.n;
    return h('div', { class: 'quest' + (done ? ' done' : '') },
      h('div', { class: 'quest-t' }, T.t(q.n)),
      h('div', { class: 'bar' }, h('i', { style: { width: (q.p / q.n) * 100 + '%' } })),
      h('div', { class: 'quest-r' }, h('span', { class: 'mono small' }, `${q.p}/${q.n}`),
        done && !q.claimed ? h('button', { class: 'btn btn-gold btn-xs', type: 'button', onclick: () => { q.claimed = true; S.coins += T.c; App.sfx('coin'); save(); toast(`+${T.c} monete`); refreshAll(); } }, `Riscuoti ${T.c} 🪙`)
          : h('span', { class: 'small muted' }, q.claimed ? 'Riscossa' : `${T.c} 🪙`)));
  }
  function renderTop(title) {
    shell.top.innerHTML = '';
    shell.top.append(h('div', { class: 'top-title' }, h('span', { class: 'brand-mark sm', html: App.toro('happy', 26) }), h('span', null, title)), statChips());
  }
  function render() {
    U.$$('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    const titles = { path: 'Percorso', practice: 'Allenamento', glossary: 'Glossario', goals: 'Traguardi', profile: 'Profilo' };
    renderTop(titles[tab]);
    renderSide();
    shell.main.innerHTML = '';
    ({ path: viewPath, practice: viewPractice, glossary: viewGlossary, goals: viewGoals, profile: viewProfile })[tab]();
  }
  function refreshAll() { if (U.$('#app .rail')) render(); }

  function toast(msg) {
    const t = U.$('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.tm);
    toast.tm = setTimeout(() => t.classList.remove('show'), 2600);
  }
  App.toast = toast;

  function modal(content, opts = {}) {
    const m = U.$('#modal');
    m.innerHTML = '';
    const box = h('div', { class: 'modal-box' + (opts.wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true' });
    const close = () => { m.hidden = true; m.innerHTML = ''; opts.onClose && opts.onClose(); };
    if (!opts.noClose) box.append(h('button', { class: 'modal-x', type: 'button', 'aria-label': 'Chiudi', onclick: close }, '✕'));
    box.append(content);
    m.append(box);
    m.hidden = false;
    m.onclick = (e) => { if (e.target === m && !opts.noClose) close(); };
    const f = box.querySelector('button:not(.modal-x), input');
    f && f.focus({ preventScroll: true });
    return close;
  }

  /* ====================== PERCORSO ====================== */
  function viewPath() {
    const f = frontier();
    if (S.unit == null) S.unit = f ? E.level(f.lv).unit : 1;
    const unit = FQ.UNITS[S.unit - 1];
    const main = shell.main;
    main.append(ticker());
    // selettore di unità
    const sel = h('div', { class: 'unit-tabs', role: 'tablist', 'aria-label': 'Unità' });
    FQ.UNITS.forEach((u) => {
      const lvls = FQ.LEVELS.filter((l) => l.unit === u.id);
      const pct = lvls.reduce((a, l) => a + levelCount(l.id), 0) / 200;
      const locked = lvls[0].id > maxReached();
      sel.append(h('button', { class: `unit-tab ${u.color}` + (u.id === S.unit ? ' on' : '') + (locked ? ' locked' : ''), type: 'button', role: 'tab', 'aria-selected': u.id === S.unit ? 'true' : 'false', onclick: () => { S.unit = u.id; save(true); render(); } },
        h('span', { class: 'ut-n' }, u.id), h('i', { class: 'ut-bar', style: { width: pct * 100 + '%' } })));
    });
    main.append(sel);
    const firstLv = (unit.id - 1) * 10 + 1;
    const lockedUnit = firstLv > maxReached();
    main.append(h('section', { class: `unit-banner ${unit.color}` },
      h('div', { class: 'ub-text' }, h('p', { class: 'eyebrow' }, `Unità ${unit.id} · ${unit.tag}`), h('h2', null, unit.title), h('p', null, unit.desc)),
      h('div', { class: 'ub-act' },
        lockedUnit ? h('button', { class: 'btn btn-light', type: 'button', onclick: () => jumpTest(unit.id) }, 'Salta qui con un test') : null,
        h('span', { class: 'ub-count mono' }, `${FQ.LEVELS.filter((l) => l.unit === unit.id && levelDone(l.id)).length}/10 livelli`))));
    FQ.LEVELS.filter((l) => l.unit === unit.id).forEach((L) => main.append(levelBlock(L, f)));
    const nav = h('div', { class: 'unit-nav' },
      unit.id > 1 ? h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { S.unit--; render(); } }, '← Unità precedente') : h('span'),
      unit.id < 10 ? h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { S.unit++; render(); } }, 'Unità successiva →') : h('span'));
    main.append(nav);
    // scorri fino alla tappa corrente
    requestAnimationFrame(() => {
      const cur = U.$('.node.current');
      if (cur && !viewPath.scrolled) { cur.scrollIntoView({ block: 'center' }); viewPath.scrolled = true; }
    });
  }
  function ticker() {
    const acc = S.stats.ans ? Math.round((S.stats.ok / S.stats.ans) * 100) : 0;
    const f = frontier();
    const items = [
      ['FQX', `${U.nf(S.xp)} XP`, todayXp() ? `▲ +${todayXp()} oggi` : '— oggi', todayXp() ? 'up' : ''],
      ['SERIE', `${S.streak} gg`, S.streak >= S.best && S.streak ? '▲ record' : `max ${S.best}`, S.streak ? 'up' : ''],
      ['PRECISIONE', `${acc}%`, `${U.nf(S.stats.ans)} risposte`, ''],
      ['LIVELLO', f ? `${f.lv}` : '100', f ? E.level(f.lv).title : 'completato', ''],
      ['TAPPE', `${stagesDone()}/2000`, `${levelsDone()} livelli`, ''],
      ['MONETE', U.nf(S.coins), `${S.freeze} congela-serie`, ''],
    ];
    const line = items.map(([k, v, d, c]) => `<span class="tk"><b>${U.esc(k)}</b> <span class="mono">${U.esc(v)}</span> <em class="${c}">${U.esc(d)}</em></span>`).join('<span class="tk-sep">•</span>');
    return h('div', { class: 'ticker', 'aria-label': 'Il tuo andamento' }, h('div', { class: 'ticker-in', html: line + '<span class="tk-sep">•</span>' + line }));
  }
  const OFF = [0, 44, 72, 44, 0, -44, -72, -44];
  function levelBlock(L, f) {
    const c = E.content(L.id);
    const n = levelCount(L.id);
    const unitCol = FQ.UNITS[L.unit - 1].color;
    const blk = h('section', { class: 'level ' + unitCol, id: 'lv-' + L.id });
    blk.append(h('div', { class: 'lvl-head' },
      h('span', { class: 'lvl-icon', 'aria-hidden': 'true' }, L.icon),
      h('div', { class: 'lvl-t' }, h('p', { class: 'eyebrow' }, `Livello ${L.id}` + (levelDone(L.id) ? ' · completato' : '')), h('h3', null, L.title), c ? h('p', { class: 'small muted' }, c.intro) : null),
      h('div', { class: 'lvl-side' }, h('span', { class: 'mono small' }, `${n}/20`), h('button', { class: 'btn btn-ghost btn-xs', type: 'button', onclick: () => openGuide(L.id), disabled: !c }, 'Guida'))));
    const path = h('div', { class: 'path' });
    FQ.STAGES.forEach((stg, si) => {
      const st = stars(L.id, si);
      const open = isOpen(L.id, si);
      const isCur = f && f.lv === L.id && f.si === si;
      const big = stg.k === 'boss' || stg.k === 'check';
      const node = h('button', {
        class: `node ${st ? 'done' : open ? 'open' : 'locked'}${isCur ? ' current' : ''}${big ? ' big' : ''} k-${stg.k}`,
        type: 'button', style: { '--x': OFF[si % 8] + 'px' },
        'aria-label': `Tappa ${si + 1}: ${stg.name}${st ? `, ${st} stelle` : open ? '' : ', bloccata'}`,
        onclick: (e) => nodePop(L, si, e.currentTarget),
      }, h('span', { class: 'node-i', 'aria-hidden': 'true' }, open || st ? stg.icon : '🔒'),
        st ? h('span', { class: 'node-stars', 'aria-hidden': 'true' }, '★'.repeat(st) + '☆'.repeat(3 - st)) : null,
        isCur ? h('span', { class: 'node-flag' }, 'INIZIA') : null);
      path.append(h('div', { class: 'node-row' }, node));
    });
    blk.append(path);
    return blk;
  }
  function nodePop(L, si, el) {
    App.sfx('tap');
    const old = U.$('.pop'); if (old) { const same = old.dataset.k === L.id + '-' + si; old.remove(); if (same) return; }
    const stg = FQ.STAGES[si];
    const open = isOpen(L.id, si), st = stars(L.id, si);
    const xp = stg.k === 'boss' ? 30 : stg.k === 'timed' ? '10+' : 10;
    const pop = h('div', { class: 'pop', 'data-k': L.id + '-' + si },
      h('p', { class: 'eyebrow' }, `Livello ${L.id} · tappa ${si + 1} di 20`),
      h('h4', null, stg.name),
      h('p', { class: 'small' }, stageDesc(stg.k)),
      open ? h('button', { class: 'btn btn-primary', type: 'button', onclick: () => { pop.remove(); startStage(L.id, si); } }, st ? `Ripeti · +${xp} XP` : `Inizia · +${xp} XP`)
        : h('p', { class: 'small muted' }, 'Completa le tappe precedenti per sbloccare questa.'));
    el.parentElement.append(pop);
    pop.scrollIntoView({ block: 'nearest', behavior: U.reducedMotion() ? 'auto' : 'smooth' });
  }
  function stageDesc(k) {
    return {
      intro: 'Le idee base del livello con schede illustrate e prime domande.', vocab: 'Abbina termini e definizioni: il vocabolario del mercato.', deep: 'Altri concetti chiave, con domande di verifica.',
      tf: 'Sette affermazioni: vere o false?', calc: 'Esercizi numerici con dati realistici.', chart: 'Interpreta grafici di prezzo e dati.', mix: 'Un po’ di tutto: domande, calcoli e grafici.',
      scen: 'Situazioni concrete in cui devi scegliere cosa fare.', fill: 'Completa le frasi con la parola giusta.', check: 'Checkpoint di metà livello: supera la prova e apri il forziere.',
      info: 'Le ultime schede del livello e un riepilogo.', sort: 'Metti in ordine e classifica concetti.', calc2: 'Calcoli più impegnativi, risposta libera.', chart2: 'Grafici più difficili, anche dai livelli precedenti.',
      decide: 'Decisioni d’investimento e una simulazione.', timed: '75 secondi: rispondi a più domande che puoi. Niente vite perse.', myth: 'Smonta i miti e gli errori più comuni.',
      sim: 'Simulazione interattiva: mettiti alla prova sul mercato.', review: 'Ripasso del livello e di quello precedente.', boss: 'Esame finale: serve il 75% per superare il livello.',
    }[k];
  }

  function openGuide(lv) {
    const L = E.level(lv), c = E.content(lv);
    if (!c) return;
    const box = h('div', { class: 'guide' },
      h('p', { class: 'eyebrow' }, `Guida · Livello ${lv}`), h('h2', null, `${L.icon} ${L.title}`), h('p', { class: 'lead' }, c.intro),
      h('div', { class: 'guide-cards' }, c.cards.map((cd) => cardView(cd))),
      h('h3', null, 'Parole chiave'),
      h('dl', { class: 'terms' }, c.terms.flatMap(([t, d]) => [h('dt', null, t), h('dd', null, d)])),
      h('div', { class: 'tip' }, h('b', null, 'Da portare a casa · '), c.tip));
    modal(box, { wide: true });
  }

  /* ====================== SCHEDE INFOGRAFICHE ====================== */
  function visual(v) {
    if (!v) return null;
    const wrap = h('div', { class: 'vis vis-' + v.k });
    switch (v.k) {
      case 'stat': wrap.append(h('div', { class: 'vis-big' }, v.n), h('div', { class: 'vis-lbl' }, v.l)); break;
      case 'vs': wrap.append(h('div', { class: 'vs-a' }, h('b', null, v.a[0]), h('span', null, v.a[1])), h('div', { class: 'vs-x', 'aria-hidden': 'true' }, 'vs'), h('div', { class: 'vs-b' }, h('b', null, v.b[0]), h('span', null, v.b[1]))); break;
      case 'steps': wrap.append(h('ol', null, v.s.map((s) => h('li', null, s)))); break;
      case 'bars': wrap.innerHTML = C.bars({ d: v.d, unit: v.u === '%' ? '%' : '', labels: true, fmtv: (x) => U.nf(x, 2) + (v.u ? (v.u === '%' ? '%' : ' ' + v.u) : ''), h: 180, label: 'Grafico a barre' }).svg; break;
      case 'pie': wrap.innerHTML = C.pie({ d: v.d, label: 'Composizione' }).svg; break;
      case 'formula': wrap.append(h('div', { class: 'formula mono' }, v.f)); if (v.n) wrap.append(h('div', { class: 'formula-n' }, v.n)); break;
      case 'icons': wrap.append(h('ul', null, v.d.map(([i, l]) => h('li', null, h('span', { class: 'ic', 'aria-hidden': 'true' }, i), h('span', null, l))))); break;
      case 'scale': {
        const bar = h('div', { class: 'scale-bar' });
        v.d.forEach(([l, p], i) => { const x = U.clamp(p, 2, 98); bar.append(h('div', { class: 'scale-pt' + (i % 2 ? ' lo' : ''), style: { left: x + '%' } }, h('i'), h('span', { style: { transform: `translateX(-${x}%)` } }, l))); });
        wrap.append(h('div', { class: 'scale-ends' }, h('span', null, v.a), h('span', null, v.b)), bar);
        break;
      }
    }
    return wrap;
  }
  function cardView(cd) {
    return h('article', { class: 'icard' }, visual(cd.v), h('h3', null, cd.t), h('p', null, cd.x));
  }

  /* ====================== ESERCIZI ====================== */
  const R = {};
  function figure(vis) {
    if (!vis) return null;
    const fig = h('figure', { class: 'fig' });
    fig.innerHTML = vis.svg + (vis.legend || '') + (vis.cap ? `<figcaption>${U.esc(vis.cap)}</figcaption>` : '');
    if (vis.hover) attachHover(fig, vis.hover);
    return fig;
  }
  function attachHover(fig, H) {
    const svg = fig.querySelector('svg');
    if (!svg || !H || !H.s.length) return;
    const tip = h('div', { class: 'tip-pop', hidden: true });
    fig.append(tip);
    fig.classList.add('has-hover');
    const ns = 'http://www.w3.org/2000/svg';
    const vline = document.createElementNS(ns, 'line');
    vline.setAttribute('class', 'c-cross'); vline.setAttribute('y1', H.top); vline.setAttribute('y2', H.bot); vline.style.display = 'none';
    svg.append(vline);
    const dots = H.s.map((s) => { const c = document.createElementNS(ns, 'circle'); c.setAttribute('r', 4.5); c.style.fill = `var(--${s.c})`; c.style.stroke = 'var(--surface)'; c.style.strokeWidth = '2px'; c.style.display = 'none'; svg.append(c); return c; });
    const fmt = (v) => (H.yfmt === 'pct' ? U.nf(v, 2) + '%' : H.yfmt === 'eur' ? U.eur(v) : U.nf(v, Math.abs(v) < 10 ? 2 : 1));
    function move(ev) {
      const rc = svg.getBoundingClientRect();
      const x = ((ev.clientX - rc.left) / rc.width) * H.w;
      const i = U.clamp(Math.round((x - H.x0) / (H.dx || 1)), 0, H.n - 1);
      const px = H.x0 + i * H.dx;
      vline.setAttribute('x1', px); vline.setAttribute('x2', px); vline.style.display = '';
      let rows = '';
      H.s.forEach((s, k) => {
        if (s.v[i] == null) { dots[k].style.display = 'none'; return; }
        dots[k].setAttribute('cx', px); dots[k].setAttribute('cy', s.y[i]); dots[k].style.display = '';
        rows += `<div><i style="background:var(--${s.c})"></i>${U.esc(s.n)} <b>${fmt(s.v[i])}</b></div>`;
      });
      const head = H.xl ? H.xl[i] : `Punto ${i + 1}`;
      tip.innerHTML = `<div class="tp-h">${U.esc(head)}</div>${rows}`;
      tip.hidden = false;
      const fr = fig.getBoundingClientRect();
      const left = ev.clientX - fr.left;
      tip.style.left = U.clamp(left + 12, 4, fr.width - 150) + 'px';
      tip.style.top = Math.max(4, ev.clientY - fr.top - 60) + 'px';
    }
    const hide = () => { tip.hidden = true; vline.style.display = 'none'; dots.forEach((d) => (d.style.display = 'none')); };
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerdown', move);
    svg.addEventListener('pointerleave', hide);
  }
  function optButtons(options, api, cls = '', onPick) {
    let sel = -1;
    const short = options.every((o) => String(o).length <= 26);
    const box = h('div', { class: 'opts' + (short ? ' opts-grid' : '') + ' ' + cls, role: 'radiogroup' });
    const btns = options.map((o, i) => {
      const b = h('button', { class: 'opt', type: 'button', role: 'radio', 'aria-checked': 'false', onclick: () => pick(i) }, h('kbd', { 'aria-hidden': 'true' }, String(i + 1)), h('span', null, o));
      box.append(b);
      return b;
    });
    function pick(i) {
      if (btns[i].disabled) return;
      sel = i;
      btns.forEach((b, j) => { b.classList.toggle('sel', j === i); b.setAttribute('aria-checked', j === i ? 'true' : 'false'); });
      App.sfx('tap');
      api.setReady(true);
      onPick && onPick(i);
    }
    return { box, btns, get sel() { return sel; }, pick };
  }
  function markOpts(o, correctIdx) {
    o.btns.forEach((b, j) => { b.disabled = true; if (j === correctIdx) b.classList.add('right'); else if (j === o.sel) b.classList.add('wrong'); });
  }

  R.card = (ex, api) => { api.setReady(true); return { el: h('div', { class: 'ex ex-card' }, h('p', { class: 'eyebrow' }, 'Scheda'), cardView(ex.card)), check: () => ({ info: true }) }; };

  R.mcq = (ex, api) => {
    const o = optButtons(ex.options, api, ex.mono ? 'mono-opts' : '');
    const el = h('div', { class: 'ex ex-mcq' }, h('h2', { class: 'q' }, ex.prompt), ex.quote ? h('blockquote', { class: 'quote' }, ex.quote) : null, figure(ex.visual), o.box);
    return { el, keys: (n) => o.pick(n), check() { markOpts(o, ex.answer); return { ok: o.sel === ex.answer, answer: ex.options[ex.answer], exp: ex.exp }; } };
  };

  R.tf = (ex, api) => {
    const o = optButtons(['Vero', 'Falso'], api, 'tf-opts');
    const el = h('div', { class: 'ex ex-tf' }, h('p', { class: 'eyebrow' }, 'Vero o falso?'), h('blockquote', { class: 'quote big' }, ex.prompt), o.box);
    const correct = ex.answer ? 0 : 1;
    return { el, keys: (n) => n < 2 && o.pick(n), check() { markOpts(o, correct); return { ok: o.sel === correct, answer: ex.answer ? 'Vero' : 'Falso', exp: ex.exp }; } };
  };

  R.fill = (ex, api) => {
    const blank = h('span', { class: 'blank' }, ' ');
    const o = optButtons(ex.options, api, 'chips', (i) => { blank.textContent = ex.options[i]; blank.classList.add('filled'); });
    const el = h('div', { class: 'ex ex-fill' }, h('p', { class: 'eyebrow' }, 'Completa la frase'), h('p', { class: 'sentence' }, ex.pre, blank, ex.post), o.box);
    return { el, keys: (n) => o.pick(n), check() { markOpts(o, ex.answer); const ok = o.sel === ex.answer; blank.classList.add(ok ? 'ok' : 'ko'); return { ok, answer: ex.options[ex.answer], exp: ex.exp }; } };
  };

  R.match = (ex, api) => {
    const r = U.rng(U.seed());
    const left = r.shuffle(ex.pairs.map((p, i) => ({ t: p[0], i })));
    const right = r.shuffle(ex.pairs.map((p, i) => ({ t: p[1], i })));
    let selL = null, selR = null, done = 0, wrong = 0;
    const colL = h('div', { class: 'mcol' }), colR = h('div', { class: 'mcol mcol-r' });
    const mk = (it, side) => {
      const b = h('button', { class: 'mitem', type: 'button', onclick: () => tapItem(side, it, b) }, it.t);
      it.b = b;
      (side === 'L' ? colL : colR).append(b);
    };
    left.forEach((it) => mk(it, 'L'));
    right.forEach((it) => mk(it, 'R'));
    function tapItem(side, it, b) {
      if (b.classList.contains('matched')) return;
      App.sfx('tap');
      if (side === 'L') { selL = it; left.forEach((x) => x.b.classList.toggle('sel', x === it)); }
      else { selR = it; right.forEach((x) => x.b.classList.toggle('sel', x === it)); }
      if (selL && selR) {
        const a = selL, c = selR;
        selL = selR = null;
        if (a.i === c.i) {
          [a.b, c.b].forEach((x) => { x.classList.remove('sel'); x.classList.add('matched'); x.disabled = true; });
          done++;
          App.sfx('ok');
          if (done === ex.pairs.length) { api.setReady(true); api.autoCheck(); }
        } else {
          wrong++;
          [a.b, c.b].forEach((x) => { x.classList.remove('sel'); x.classList.add('bad'); setTimeout(() => x.classList.remove('bad'), 450); });
          App.sfx('wrong');
        }
      }
    }
    const el = h('div', { class: 'ex ex-match' }, h('h2', { class: 'q' }, 'Abbina ogni termine alla sua definizione'), h('div', { class: 'mgrid' }, colL, colR));
    return { el, check: () => ({ ok: wrong < 2, answer: wrong >= 2 ? 'Abbinamenti corretti evidenziati' : null, exp: wrong ? `Hai fatto ${wrong} abbinament${wrong === 1 ? 'o' : 'i'} sbagliat${wrong === 1 ? 'o' : 'i'}. ${wrong >= 2 ? 'Rivedi i termini nella guida del livello.' : ''}` : 'Tutti gli abbinamenti al primo colpo!' }) };
  };

  R.order = (ex, api) => {
    const ans = h('ol', { class: 'order-ans', 'aria-label': 'La tua sequenza' });
    const bank = h('div', { class: 'order-bank' });
    const placed = [];
    const btns = ex.shuffled.map((t) => {
      const b = h('button', { class: 'chip-btn', type: 'button', onclick: () => move(t, b) }, t);
      bank.append(b);
      return b;
    });
    function move(t, b) {
      App.sfx('tap');
      if (b.parentElement === bank) { placed.push(t); ans.append(h('li', null, b)); }
      else { placed.splice(placed.indexOf(t), 1); const li = b.parentElement; bank.append(b); li.remove(); }
      api.setReady(placed.length === ex.items.length);
    }
    const el = h('div', { class: 'ex ex-order' }, h('h2', { class: 'q' }, ex.prompt), h('p', { class: 'small muted' }, 'Tocca gli elementi nell’ordine giusto. Tocca di nuovo per toglierli.'), ans, bank);
    return { el, check() {
      const ok = placed.every((t, i) => t === ex.items[i]);
      U.$$('li', ans).forEach((li, i) => li.classList.add(placed[i] === ex.items[i] ? 'ok' : 'ko'));
      btns.forEach((b) => (b.disabled = true));
      return { ok, answer: ex.items.map((t, i) => `${i + 1}. ${t}`).join('  ·  '), exp: ex.exp };
    } };
  };

  R.cat = (ex, api) => {
    const assign = ex.items.map(() => -1);
    const rows = ex.items.map((it, i) => {
      const segs = ex.groups.map((g, gi) => h('button', { class: 'seg-b', type: 'button', onclick: () => { assign[i] = gi; segs.forEach((s, k) => s.classList.toggle('on', k === gi)); App.sfx('tap'); api.setReady(assign.every((a) => a >= 0)); } }, g));
      const row = h('div', { class: 'cat-row' }, h('span', { class: 'cat-t' }, it.t), h('div', { class: 'seg' }, segs));
      row.segs = segs;
      return row;
    });
    const el = h('div', { class: 'ex ex-cat' }, h('h2', { class: 'q' }, ex.prompt), h('div', { class: 'cat-list' }, rows));
    return { el, check() {
      let ok = true;
      rows.forEach((row, i) => { const good = assign[i] === ex.items[i].g; ok = ok && good; row.classList.add(good ? 'ok' : 'ko'); row.segs.forEach((s, k) => { s.disabled = true; if (k === ex.items[i].g) s.classList.add('right'); }); });
      return { ok, answer: ex.groups.map((g, gi) => `${g}: ${ex.items.filter((x) => x.g === gi).map((x) => x.t).join(', ')}`).join(' — '), exp: null };
    } };
  };

  R.scen = (ex, api) => {
    const o = optButtons(ex.options, api, 'scen-opts');
    const el = h('div', { class: 'ex ex-scen' },
      h('div', { class: 'story' }, h('p', { class: 'eyebrow' }, 'Situazione'), h('p', null, ex.story)),
      h('h2', { class: 'q' }, ex.prompt), o.box);
    return { el, keys: (n) => o.pick(n), check() {
      markOpts(o, ex.answer);
      const ok = o.sel === ex.answer;
      return { ok, answer: ex.options[ex.answer], exp: ok ? ex.feedback[o.sel] : `${ex.feedback[o.sel]} Scelta migliore: ${ex.feedback[ex.answer]}` };
    } };
  };

  R.num = (ex, api) => {
    const inp = h('input', { class: 'num-in mono', type: 'text', inputmode: 'decimal', autocomplete: 'off', id: 'num-answer', 'aria-label': 'La tua risposta', placeholder: '0' });
    inp.addEventListener('input', () => api.setReady(isFinite(U.parseNum(inp.value))));
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); api.submit(); } });
    const el = h('div', { class: 'ex ex-num' }, h('h2', { class: 'q' }, ex.prompt), figure(ex.visual),
      h('div', { class: 'num-row' }, inp, ex.unit ? h('span', { class: 'num-u' }, ex.unit) : null),
      h('p', { class: 'small muted' }, 'Scrivi il numero (puoi usare la virgola per i decimali). Accettiamo un piccolo arrotondamento.'));
    setTimeout(() => inp.focus({ preventScroll: true }), 60);
    return { el, check() {
      const v = U.parseNum(inp.value);
      const ok = Math.abs(v - ex.answer) <= ex.tol;
      inp.disabled = true;
      inp.classList.add(ok ? 'ok' : 'ko');
      return { ok, answer: ex.display, exp: ex.exp };
    } };
  };

  R.sim = (ex, api, rng) => {
    const k = ex.spec.kind;
    const sim = k === 'trade' ? FQ.Sims.trade(ex.spec, api) : k === 'alloc' ? FQ.Sims.alloc(ex.spec, api) : FQ.Sims.lab(ex.spec, api, rng);
    const title = k === 'trade' ? 'Sala trading' : k === 'alloc' ? (ex.spec.preset === 'budget' ? 'Gestisci lo stipendio' : 'Costruisci il portafoglio') : 'Laboratorio';
    return { el: h('div', { class: 'ex ex-sim' }, h('p', { class: 'eyebrow' }, 'Simulazione'), h('h2', { class: 'q' }, title), sim.el), check: () => sim.check(), sim: true };
  };

  /* ====================== SESSIONE DI GIOCO ====================== */
  const PRAISE = ['Ottimo!', 'Esatto!', 'Perfetto!', 'Ben fatto!', 'Giusto!', 'Bravo!', 'Centrato!'];
  function runSession(cfg) {
    const ov = U.$('#lesson');
    const st = { q: cfg.items.map((x) => ({ ex: x, retry: false })), i: 0, graded: 0, ok: 0, combo: 0, maxCombo: 0, wrongRefs: [], start: Date.now(), charts: 0, calcs: 0, sims: 0, simsOk: 0, ended: false, results: [] };
    const timed = cfg.mode === 'timed';
    const usesHearts = cfg.kind === 'stage' && cfg.mode === 'normal' && !S.set.relax;
    let timeLeft = cfg.seconds || 0, tInt = null;
    ov.innerHTML = '';
    ov.hidden = false;
    document.body.classList.add('in-lesson');
    const bar = h('div', { class: 'lprog' }, h('i'));
    const hearts = h('div', { class: 'lhearts' });
    const comboEl = h('div', { class: 'lcombo', 'aria-live': 'polite' });
    const head = h('header', { class: 'lhead' },
      h('button', { class: 'lclose', type: 'button', 'aria-label': 'Esci dalla lezione', onclick: quit }, '✕'),
      bar, comboEl, hearts);
    const body = h('div', { class: 'lbody' });
    const foot = h('footer', { class: 'lfoot' });
    const ctx = h('p', { class: 'lctx' }, cfg.title || '');
    ov.append(head, h('div', { class: 'lscroll' }, ctx, body), foot);
    let cur = null, phase = 'answer', ready = false;
    const api = {
      setReady(v) { ready = v; btn.disabled = !v; },
      autoCheck() { setTimeout(() => phase === 'answer' && doCheck(), 250); },
      submit() { if (ready && phase === 'answer') doCheck(); },
    };
    const btn = h('button', { class: 'btn btn-primary lbtn', type: 'button', onclick: () => (phase === 'answer' ? doCheck() : next()) }, 'Verifica');
    const fb = h('div', { class: 'fb', 'aria-live': 'assertive' });
    foot.append(h('div', { class: 'lfoot-in' }, fb, btn));

    function updHead() {
      const total = st.q.length;
      bar.firstChild.style.width = (st.i / total) * 100 + '%';
      if (timed) hearts.innerHTML = `<span class="ltimer mono ${timeLeft <= 10 ? 'neg' : ''}">⏱ ${timeLeft}s</span>`;
      else hearts.innerHTML = usesHearts ? `<span class="lh">❤️ <b>${S.hearts}</b></span>` : cfg.kind === 'stage' && cfg.mode === 'boss' ? '<span class="lh">👑 Esame</span>' : '<span class="lh">∞</span>';
      comboEl.textContent = st.combo >= 3 ? `🔥 ${st.combo} di fila` : '';
      comboEl.classList.toggle('show', st.combo >= 3);
    }
    function show() {
      if (st.i >= st.q.length) return finish();
      const item = st.q[st.i];
      const ex = item.ex;
      phase = 'answer';
      body.innerHTML = '';
      fb.innerHTML = ''; fb.className = 'fb';
      foot.className = 'lfoot';
      cur = (R[ex.type] || R.mcq)(ex, api, U.rng(U.seed()));
      if (item.retry) body.append(h('p', { class: 'retry-tag' }, '↻ Riproviamo questa'));
      body.append(cur.el);
      btn.textContent = ex.type === 'card' ? 'Continua' : cur.sim ? 'Concludi' : 'Verifica';
      api.setReady(ex.type === 'card');
      if (ex.type === 'card') { phase = 'info'; btn.disabled = false; }
      updHead();
      U.$('.lscroll', ov).scrollTop = 0;
    }
    function doCheck() {
      if (phase !== 'answer' || !ready) return;
      const item = st.q[st.i];
      const ex = item.ex;
      const res = cur.check();
      if (res.info) return next();
      phase = 'feedback';
      const graded = !item.retry;
      if (graded) {
        st.graded++;
        if (res.ok) st.ok++;
        S.stats.ans++;
        if (res.ok) S.stats.ok++;
        if (ex.tag === 'chart' && res.ok) st.charts++;
        if (ex.tag === 'calc' && res.ok) st.calcs++;
        if (ex.type === 'sim') { st.sims++; if (res.ok) st.simsOk++; }
        st.results.push({ ok: res.ok, ex });
      }
      if (res.ok) { st.combo++; st.maxCombo = Math.max(st.maxCombo, st.combo); App.sfx('ok'); }
      else {
        st.combo = 0; App.sfx('wrong');
        if (ex.ref && ex.type !== 'sim') st.wrongRefs.push(ex.ref);
        if (!item.retry && !timed && ex.type !== 'sim' && cfg.mode !== 'boss' && cfg.kind !== 'placement' && cfg.kind !== 'jump') st.q.push({ ex, retry: true });
        if (usesHearts) { if (S.hearts >= MAXH) S.hTs = Date.now(); S.hearts = Math.max(0, S.hearts - 1); }
      }
      foot.className = 'lfoot ' + (res.ok ? 'is-ok' : 'is-ko');
      fb.innerHTML = '';
      fb.append(...[h('div', { class: 'fb-h' }, h('span', { class: 'fb-ic', 'aria-hidden': 'true' }, res.ok ? '✔' : '✖'), res.ok ? U.rng(U.seed()).pick(PRAISE) : 'Non proprio.'),
        !res.ok && res.answer ? h('p', { class: 'fb-ans' }, h('b', null, 'Risposta corretta: '), res.answer) : null,
        res.exp ? h('p', { class: 'fb-exp' }, res.exp) : null].filter(Boolean));
      btn.textContent = 'Continua';
      btn.disabled = false;
      updHead();
      if (cfg.kind === 'placement' && cfg.onAnswer) cfg.onAnswer(ex, res.ok, st);
      if (timed) setTimeout(() => phase === 'feedback' && next(), res.ok ? 650 : 1400);
      btn.focus({ preventScroll: true });
    }
    function next() {
      if (st.ended) return;
      if (usesHearts && S.hearts <= 0) return outOfHearts();
      if (cfg.stopWhen && cfg.stopWhen(st)) return finish();
      st.i++;
      show();
    }
    function outOfHearts() {
      const close = modal(h('div', { class: 'center' },
        h('div', { html: App.toro('sad', 90) }),
        h('h2', null, 'Hai finito le vite'),
        h('p', null, `Le vite si ricaricano da sole: una ogni ${REGEN_MIN} minuti. Puoi anche allenarti per recuperarne una, o ricaricarle con le monete.`),
        h('div', { class: 'btn-col' },
          h('button', { class: 'btn btn-gold', type: 'button', disabled: S.coins < REFILL_COST, onclick: () => { S.coins -= REFILL_COST; S.hearts = MAXH; save(); App.sfx('coin'); close(); st.i++; show(); } }, `Ricarica tutte le vite · ${REFILL_COST} 🪙`),
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { close(); end(false); } }, 'Esci dalla tappa'))), { noClose: true });
    }
    function quit() {
      if (st.ended) return;
      const close = modal(h('div', { class: 'center' },
        h('div', { html: App.toro('sad', 80) }),
        h('h2', null, 'Vuoi uscire?'),
        h('p', null, 'Se esci adesso perdi i progressi di questa tappa.'),
        h('div', { class: 'btn-col' },
          h('button', { class: 'btn btn-primary', type: 'button', onclick: () => close() }, 'Continua a giocare'),
          h('button', { class: 'btn btn-ghost danger', type: 'button', onclick: () => { close(); end(false); } }, 'Esci'))));
    }
    function end(completed) {
      st.ended = true;
      clearInterval(tInt);
      document.removeEventListener('keydown', onKey);
      // salva comunque gli errori per il ripasso
      addMistakes(st.wrongRefs);
      save();
      ov.hidden = true; ov.innerHTML = '';
      document.body.classList.remove('in-lesson');
      if (!completed) { refreshAll(); cfg.onQuit && cfg.onQuit(); }
    }
    function finish() {
      if (st.ended) return;
      const secs = Math.round((Date.now() - st.start) / 1000);
      end(true);
      const acc = st.graded ? st.ok / st.graded : 1;
      const out = { acc, ok: st.ok, graded: st.graded, secs, maxCombo: st.maxCombo, st };
      cfg.onDone(out);
    }
    function onKey(e) {
      if (U.$('#modal') && !U.$('#modal').hidden) return;
      if (e.target && e.target.tagName === 'INPUT' && e.key !== 'Enter') return;
      if (e.key === 'Enter') { e.preventDefault(); if (phase === 'answer') { if (ready) doCheck(); } else next(); }
      else if (e.key === 'Escape') quit();
      else if (/^[1-9]$/.test(e.key) && phase === 'answer' && cur && cur.keys) cur.keys(Number(e.key) - 1);
    }
    document.addEventListener('keydown', onKey);
    if (timed) {
      tInt = setInterval(() => {
        timeLeft--;
        updHead();
        if (timeLeft <= 0) { clearInterval(tInt); finish(); }
      }, 1000);
    }
    show();
  }
  function addMistakes(refs) {
    refs.forEach((rf) => {
      const key = JSON.stringify(rf);
      S.mist = S.mist.filter((m) => JSON.stringify(m) !== key);
      S.mist.unshift(rf);
    });
    S.mist = S.mist.slice(0, 40);
  }

  /* ---------- avvio di una tappa ---------- */
  function startStage(lv, si) {
    regen();
    const stg = FQ.STAGES[si];
    const sess = E.build(lv, si);
    const usesHearts = sess.mode === 'normal' && !S.set.relax;
    if (usesHearts && S.hearts <= 0) return openShop(true);
    runSession({
      kind: 'stage', mode: sess.mode, seconds: sess.seconds, items: sess.items,
      title: `Livello ${lv} · ${stg.icon} ${stg.name}`,
      onDone: (res) => stageDone(lv, si, sess, res),
    });
  }

  function reward(res, opts) {
    // XP, monete, missioni, serie, badge
    const perfect = res.graded > 0 && res.ok === res.graded;
    let xp = opts.base + res.ok + (perfect ? 5 : 0) + Math.floor(res.maxCombo / 5) * 2;
    if (opts.xpOverride != null) xp = opts.xpOverride;
    const coins = opts.coins || 0;
    const t = U.today();
    const wasBelowGoal = todayXp() < S.goal;
    S.xp += xp;
    S.days[t] = (S.days[t] || 0) + xp;
    S.coins += coins;
    S.stats.ses++;
    if (perfect && opts.countPerfect) S.stats.perf++;
    S.stats.combo = Math.max(S.stats.combo, res.maxCombo);
    S.stats.charts += res.st.charts;
    S.stats.calcs += res.st.calcs;
    S.stats.sims += res.st.simsOk;
    S.stats.time += res.secs;
    const streakUp = opts.streak !== false && bumpStreak();
    questProgress({ xp, stages: opts.stage ? 1 : 0, charts: res.st.charts, calcs: res.st.calcs, perfect: perfect && opts.stage ? 1 : 0, combo: res.maxCombo });
    const goalHit = wasBelowGoal && todayXp() >= S.goal;
    if (goalHit) S.coins += 10;
    const badges = checkBadges();
    save();
    return { xp, coins: coins + (goalHit ? 10 : 0), perfect, streakUp, goalHit, badges };
  }

  function stageDone(lv, si, sess, res) {
    const stg = FQ.STAGES[si];
    let passed = true, starsN;
    if (sess.mode === 'boss') passed = res.acc >= sess.pass;
    if (sess.mode === 'timed') { passed = res.ok >= 6; starsN = res.ok >= 12 ? 3 : res.ok >= 9 ? 2 : 1; }
    if (starsN == null) starsN = res.acc >= 0.9 ? 3 : res.acc >= 0.7 ? 2 : 1;
    if (!passed) {
      const rw = reward(res, { base: 3, stage: false, countPerfect: false });
      return results({ title: sess.mode === 'boss' ? 'Esame non superato' : 'Quasi!', sub: sess.mode === 'boss' ? `Serve almeno il ${Math.round(sess.pass * 100)}% di risposte corrette. Hai fatto ${Math.round(res.acc * 100)}%.` : 'Servono almeno 6 risposte corrette nel tempo.', mood: 'sad', res, rw, stars: 0, retry: () => startStage(lv, si) });
    }
    const firstTime = !stars(lv, si);
    setStars(lv, si, starsN);
    const base = sess.mode === 'boss' ? 25 : sess.mode === 'timed' ? 8 : 10;
    let coins = 4 + starsN * 2;
    if (stg.k === 'check' && firstTime) coins += 40;
    if (stg.k === 'boss' && firstTime) coins += 30;
    const rw = reward(res, { base, stage: true, coins, countPerfect: true });
    const levelUp = stg.k === 'boss';
    if (levelUp && lv < 100 && firstTime) S.unit = E.level(lv + 1).unit;
    save();
    results({
      title: levelUp ? `Livello ${lv} superato!` : stg.k === 'check' && firstTime ? 'Forziere aperto!' : 'Tappa completata!',
      sub: levelUp ? (lv < 100 ? `Hai sbloccato il livello ${lv + 1}: ${E.level(lv + 1).title}.` : 'Hai completato tutto il percorso. Sei un investitore consapevole!') : `${stg.icon} ${stg.name} · Livello ${lv}`,
      mood: res.acc >= 0.7 ? 'happy' : 'wow', res, rw, stars: starsN, confetti: levelUp || rw.perfect, chest: stg.k === 'check' && firstTime,
      tip: levelUp ? E.content(lv) && E.content(lv).tip : null,
    });
  }

  function results(o) {
    const box = h('div', { class: 'results' },
      h('div', { class: 'res-mascot', html: App.toro(o.mood, 110) }),
      h('h2', null, o.title),
      h('p', { class: 'muted' }, o.sub),
      o.stars ? h('div', { class: 'res-stars', 'aria-label': `${o.stars} stelle su 3` }, [1, 2, 3].map((k) => h('span', { class: 'rs' + (k <= o.stars ? ' on' : ''), style: { animationDelay: k * 0.18 + 's' } }, '★'))) : null,
      o.chest ? h('div', { class: 'chest', 'aria-hidden': 'true' }, '🧰') : null,
      h('div', { class: 'res-tiles' },
        h('div', { class: 'rt rt-xp' }, h('span', null, 'XP'), h('b', { class: 'mono' }, '+' + o.rw.xp)),
        h('div', { class: 'rt rt-acc' }, h('span', null, 'Precisione'), h('b', { class: 'mono' }, Math.round(o.res.acc * 100) + '%')),
        h('div', { class: 'rt rt-time' }, h('span', null, 'Tempo'), h('b', { class: 'mono' }, `${Math.floor(o.res.secs / 60)}:${String(o.res.secs % 60).padStart(2, '0')}`)),
        o.rw.coins ? h('div', { class: 'rt rt-coin' }, h('span', null, 'Monete'), h('b', { class: 'mono' }, '+' + o.rw.coins)) : h('div', { class: 'rt' }, h('span', null, 'Combo max'), h('b', { class: 'mono' }, o.res.maxCombo))),
      o.rw.streakUp ? h('p', { class: 'res-note' }, `🔥 Serie: ${S.streak} giorn${S.streak === 1 ? 'o' : 'i'}!`) : null,
      o.rw.goalHit ? h('p', { class: 'res-note' }, '🎯 Obiettivo giornaliero raggiunto: +10 monete') : null,
      ...o.rw.badges.map((b) => h('p', { class: 'res-note badge-note' }, `${b.i} Nuovo traguardo: ${b.n}`)),
      o.tip ? h('div', { class: 'tip' }, h('b', null, 'Da portare a casa · '), o.tip) : null,
      h('div', { class: 'btn-col' },
        o.retry ? h('button', { class: 'btn btn-primary', type: 'button', onclick: () => { close(); o.retry(); } }, 'Riprova') : null,
        h('button', { class: o.retry ? 'btn btn-ghost' : 'btn btn-primary', type: 'button', onclick: () => close() }, 'Continua')));
    App.sfx(o.mood === 'sad' ? 'wrong' : 'done');
    const close = modal(box, { noClose: true, onClose: () => { viewPath.scrolled = false; refreshAll(); o.after && o.after(); } });
    if (o.confetti) confetti();
  }

  function confetti() {
    if (U.reducedMotion()) return;
    const cv = h('canvas', { class: 'confetti', 'aria-hidden': 'true' });
    document.body.append(cv);
    const ctx = cv.getContext('2d');
    const W = (cv.width = innerWidth), Hh = (cv.height = innerHeight);
    const cs = getComputedStyle(document.documentElement);
    const cols = ['--accent', '--gold', '--s1', '--s2', '--s5', '--up'].map((v) => cs.getPropertyValue(v).trim() || '#0f8a5f');
    const P = Array.from({ length: 140 }, () => ({ x: Math.random() * W, y: -20 - Math.random() * Hh * 0.5, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, r: 4 + Math.random() * 5, a: Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)] }));
    const t0 = performance.now();
    (function fr(t) {
      ctx.clearRect(0, 0, W, Hh);
      P.forEach((p) => { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.a += 0.1; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); });
      if (t - t0 < 2600) requestAnimationFrame(fr); else cv.remove();
    })(t0);
  }

  /* ====================== NEGOZIO ====================== */
  function openShop(fromBlock) {
    regen();
    const nh = nextHeartIn();
    const box = h('div', { class: 'shop' },
      h('h2', null, fromBlock === true ? 'Servono vite per continuare' : 'Negozio'),
      h('div', { class: 'shop-stats' }, statChips()),
      S.set.relax ? h('p', { class: 'small muted' }, 'Modalità relax attiva: le vite sono illimitate.') :
        h('p', { class: 'small muted' }, S.hearts >= MAXH ? 'Hai tutte le vite.' : `Prossima vita tra ${Math.floor(nh / 60000)}:${String(Math.floor((nh % 60000) / 1000)).padStart(2, '0')} minuti. Completare un allenamento ti regala una vita.`),
      h('div', { class: 'shop-items' },
        shopItem('❤️', 'Ricarica vite', `Torna a ${MAXH} vite`, REFILL_COST, S.hearts >= MAXH || S.set.relax, () => { S.hearts = MAXH; }),
        shopItem('🧊', 'Congela serie', `Protegge la serie per un giorno saltato (hai ${S.freeze}/2)`, FREEZE_COST, S.freeze >= 2, () => { S.freeze++; })),
      fromBlock === true ? h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { close(); go('practice'); } }, 'Vai all’allenamento') : null);
    function shopItem(i, n, d, cost, disabled, fn) {
      return h('div', { class: 'shop-item' }, h('span', { class: 'si-i', 'aria-hidden': 'true' }, i), h('div', null, h('b', null, n), h('p', { class: 'small muted' }, d)),
        h('button', { class: 'btn btn-gold btn-sm', type: 'button', disabled: disabled || S.coins < cost, onclick: () => { S.coins -= cost; fn(); App.sfx('coin'); save(); close(); toast('Acquisto completato'); refreshAll(); } }, `${cost} 🪙`));
    }
    const close = modal(box);
  }

  /* ====================== ALLENAMENTO ====================== */
  function openLevels() {
    const mr = maxReached();
    const out = [];
    for (let lv = 1; lv <= Math.min(100, mr); lv++) if (lv < S.unlocked || levelCount(lv) > 0) out.push(lv);
    return out.length ? out : [Math.max(1, Math.min(mr, 100))];
  }
  function practiceDone(title) {
    return (res) => {
      const rw = reward(res, { base: 5, stage: false, countPerfect: false });
      const gotHeart = S.hearts < MAXH;
      if (gotHeart) S.hearts++;
      save();
      results({ title, sub: gotHeart ? 'Allenamento completato: +1 vita ❤️' : 'Allenamento completato', mood: 'happy', res, rw, stars: 0 });
    };
  }
  function viewPractice() {
    const m = shell.main;
    const cards = [
      { i: '🩹', t: 'Ripasso errori', d: S.mist.length ? `${S.mist.length} domande da rivedere, dalle tue risposte sbagliate.` : 'Nessun errore da rivedere. Ottimo!', dis: !S.mist.length, fn: () => {
        const r = U.rng(U.seed());
        const items = S.mist.slice(0, 8).map((rf) => E.fromRef(rf, r)).filter(Boolean);
        const used = S.mist.slice(0, 8);
        runSession({ kind: 'practice', mode: 'normal', items, title: '🩹 Ripasso errori', onDone: (res) => {
          // rimuove gli errori risolti
          res.st.results.forEach((x, k) => { if (x.ok && used[k]) S.mist = S.mist.filter((mm) => JSON.stringify(mm) !== JSON.stringify(used[k])); });
          practiceDone('Ripasso completato')(res);
        } });
      } },
      { i: '⚡', t: 'Allenamento rapido', d: '10 domande miste dai livelli che hai già affrontato.', fn: () => runSession({ kind: 'practice', mode: 'normal', items: E.mixed(openLevels(), 10), title: '⚡ Allenamento rapido', onDone: practiceDone('Allenamento completato') }) },
      { i: '⏱️', t: 'Sfida a tempo', d: '90 secondi, più risposte possibili. Niente vite in gioco.', fn: () => runSession({ kind: 'practice', mode: 'timed', seconds: 90, items: E.mixed(openLevels(), 24, null, { quick: true }), title: '⏱️ Sfida a tempo', onDone: practiceDone('Tempo scaduto!') }) },
      { i: '🕹️', t: 'Sala trading', d: 'Simula operazioni su un titolo: stop loss, commissioni, disciplina.', fn: () => runSession({ kind: 'practice', mode: 'normal', items: [{ type: 'sim', spec: FQ.Sims.tradeSpec(U.rng(U.seed()), 0.5) }], title: '🕹️ Sala trading', onDone: practiceDone('Sessione di trading chiusa') }) },
      { i: '🥧', t: 'Costruisci un portafoglio', d: 'Un investitore, un obiettivo: trova l’allocazione giusta.', fn: () => runSession({ kind: 'practice', mode: 'normal', items: [{ type: 'sim', spec: FQ.Sims.allocSpec(U.rng(U.seed()), 0.5, 'port') }], title: '🥧 Portafoglio', onDone: practiceDone('Portafoglio valutato') }) },
      { i: '🧪', t: 'Laboratorio interesse composto', d: 'Gioca con capitale, versamenti, tassi e anni.', fn: () => runSession({ kind: 'practice', mode: 'normal', items: [{ type: 'sim', spec: FQ.Sims.labSpec(U.rng(U.seed()), 0.5, 'compound') }], title: '🧪 Laboratorio', onDone: practiceDone('Esperimento completato') }) },
      { i: '📉', t: 'Palestra dei grafici', d: '8 grafici da interpretare: trend, candele, supporti, RSI e altro.', fn: () => {
        const r = U.rng(U.seed());
        const keys = U.uniq(openLevels().flatMap((l) => E.level(l).chart));
        const items = Array.from({ length: 8 }, () => Object.assign(C.gen[r.pick(keys)](r, 0.5), {}));
        runSession({ kind: 'practice', mode: 'normal', items, title: '📉 Palestra dei grafici', onDone: practiceDone('Allenamento grafici completato') });
      } },
      { i: '🧮', t: 'Palestra dei calcoli', d: '8 calcoli finanziari dai livelli sbloccati.', fn: () => {
        const r = U.rng(U.seed());
        const keys = U.uniq(openLevels().flatMap((l) => E.level(l).calc));
        const items = Array.from({ length: 8 }, (_, i) => FQ.Calc.make(r.pick(keys), r, 0.5, i % 2 ? 'num' : 'mcq'));
        runSession({ kind: 'practice', mode: 'normal', items, title: '🧮 Palestra dei calcoli', onDone: practiceDone('Allenamento calcoli completato') });
      } },
    ];
    m.append(h('div', { class: 'page-head' }, h('h1', null, 'Allenamento'), h('p', { class: 'muted' }, 'Ripassa, recupera vite e mettiti alla prova senza limiti. Ogni allenamento completato regala una vita.')),
      h('div', { class: 'grid-cards' }, cards.map((c) => h('button', { class: 'pcard', type: 'button', disabled: c.dis, onclick: c.fn }, h('span', { class: 'pc-i', 'aria-hidden': 'true' }, c.i), h('b', null, c.t), h('span', { class: 'small muted' }, c.d)))));
  }

  /* ====================== GLOSSARIO ====================== */
  function viewGlossary() {
    const m = shell.main;
    const mr = maxReached();
    const inp = h('input', { type: 'search', id: 'gloss-q', class: 'search', placeholder: 'Cerca un termine…', 'aria-label': 'Cerca nel glossario' });
    const list = h('div', { class: 'gloss' });
    const all = [];
    FQ.LEVELS.forEach((L) => { const c = E.content(L.id); if (c) c.terms.forEach(([t, d]) => all.push({ t, d, lv: L.id, unit: L.unit, open: L.id <= mr })); });
    function draw() {
      const q = inp.value.trim().toLowerCase();
      list.innerHTML = '';
      FQ.UNITS.forEach((u) => {
        const items = all.filter((x) => x.unit === u.id && (!q || x.t.toLowerCase().includes(q) || x.d.toLowerCase().includes(q)));
        if (!items.length) return;
        const open = items.filter((x) => x.open);
        const sec = h('section', { class: 'gloss-u ' + u.color }, h('h2', null, h('span', { class: 'eyebrow' }, `Unità ${u.id}`), ' ', u.title));
        if (!open.length) sec.append(h('p', { class: 'small muted' }, `${items.length} termini · raggiungi l’unità ${u.id} per sbloccarli.`));
        else sec.append(h('dl', { class: 'terms' }, open.flatMap((x) => [h('dt', null, x.t, h('span', { class: 'lv-tag mono' }, 'L' + x.lv)), h('dd', null, x.d)])));
        if (open.length && open.length < items.length) sec.append(h('p', { class: 'small muted' }, `+${items.length - open.length} termini ancora bloccati`));
        list.append(sec);
      });
      if (!list.children.length) list.append(h('p', { class: 'muted' }, 'Nessun termine trovato.'));
    }
    inp.addEventListener('input', draw);
    m.append(h('div', { class: 'page-head' }, h('h1', null, 'Glossario'), h('p', { class: 'muted' }, `${all.filter((x) => x.open).length} termini sbloccati su ${all.length}.`)), inp, list);
    draw();
  }

  /* ====================== TRAGUARDI ====================== */
  function viewGoals() {
    const m = shell.main;
    m.append(h('div', { class: 'page-head' }, h('h1', null, 'Traguardi'), h('p', { class: 'muted' }, 'Missioni di oggi, serie e medaglie.')));
    m.append(h('section', { class: 'panel goal-panel big' }, h('div', { class: 'goal-ring', html: goalRing(88) }),
      h('div', null, h('h3', null, 'Obiettivo giornaliero'), h('p', { class: 'mono' }, `${todayXp()} / ${S.goal} XP`), h('p', { class: 'small muted' }, `Serie attuale ${S.streak} · record ${S.best} · congela-serie ${S.freeze}/2`))));
    m.append(h('section', { class: 'panel' }, h('h3', null, 'Missioni giornaliere'), ...quests().map(questRow)));
    // settimana
    const days = Array.from({ length: 7 }, (_, i) => U.addDays(U.today(), i - 6));
    m.append(h('section', { class: 'panel' }, h('h3', null, 'Ultimi 7 giorni'), h('div', { class: 'week' }, days.map((d) => {
      const x = S.days[d] || 0;
      const wd = new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short' });
      return h('div', { class: 'wd' + (x >= S.goal ? ' hit' : x ? ' some' : '') }, h('span', { class: 'wd-dot', 'aria-hidden': 'true' }, x >= S.goal ? '🔥' : x ? '•' : ''), h('span', { class: 'small' }, wd), h('span', { class: 'mono small' }, x));
    }))));
    const got = BADGES.filter((b) => S.badges[b.id]).length;
    m.append(h('section', { class: 'panel' }, h('h3', null, `Medaglie · ${got}/${BADGES.length}`),
      h('div', { class: 'badges' }, BADGES.map((b) => h('div', { class: 'badge' + (S.badges[b.id] ? ' on' : '') + (b.unit ? ' ' + FQ.UNITS[b.unit - 1].color : '') }, h('span', { class: 'b-i', 'aria-hidden': 'true' }, b.i), h('b', null, b.n), h('span', { class: 'small muted' }, b.d))))));
  }

  /* ====================== PROFILO ====================== */
  function viewProfile() {
    const m = shell.main;
    const acc = S.stats.ans ? Math.round((S.stats.ok / S.stats.ans) * 100) : 0;
    const nameIn = h('input', { type: 'text', id: 'pf-name', value: S.name, placeholder: 'Il tuo nome', maxlength: 30, 'aria-label': 'Nome' });
    nameIn.addEventListener('change', () => { S.name = nameIn.value.trim(); save(); toast('Nome salvato'); });
    m.append(h('div', { class: 'profile-head' }, h('div', { html: App.toro('happy', 84) }), h('div', null, nameIn, h('p', { class: 'small muted' }, `In FinQuest dal ${new Date(S.created + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })} · partenza: ${FQ.STARTS.find((s) => s.level === S.start)?.name || 'Livello ' + S.start}`))));
    const tiles = [['XP totali', U.nf(S.xp)], ['Serie record', S.best + ' gg'], ['Tappe', `${stagesDone()}/2000`], ['Livelli', `${levelsDone()}/100`], ['Precisione', acc + '%'], ['Medaglie', Object.keys(S.badges).length]];
    m.append(h('div', { class: 'tiles' }, tiles.map(([k, v]) => h('div', { class: 'tile' }, h('span', { class: 'small muted' }, k), h('b', { class: 'mono' }, v)))));
    const days = Array.from({ length: 14 }, (_, i) => U.addDays(U.today(), i - 13));
    const xpd = days.map((d) => [new Date(d + 'T12:00:00').getDate() + '', S.days[d] || 0]);
    m.append(h('section', { class: 'panel' }, h('h3', null, 'XP negli ultimi 14 giorni'), h('figure', { class: 'fig', html: C.bars({ d: xpd, col: 'accent', h: 170, label: 'XP giornalieri' }).svg })));
    // impostazioni
    const goalSel = h('select', { id: 'pf-goal', 'aria-label': 'Obiettivo giornaliero' }, [[10, 'Rilassato · 10 XP'], [20, 'Normale · 20 XP'], [30, 'Serio · 30 XP'], [50, 'Intenso · 50 XP']].map(([v, t]) => h('option', { value: v, selected: S.goal === v }, t)));
    goalSel.addEventListener('change', () => { S.goal = Number(goalSel.value); save(); render(); });
    const themeSel = h('select', { id: 'pf-theme', 'aria-label': 'Tema' }, [['system', 'Come il sistema'], ['light', 'Chiaro'], ['dark', 'Scuro']].map(([v, t]) => h('option', { value: v, selected: S.set.theme === v }, t)));
    themeSel.addEventListener('change', () => { S.set.theme = themeSel.value; applyTheme(); save(); });
    const tog = (k, label, desc) => {
      const c = h('input', { type: 'checkbox', id: 'pf-' + k, checked: S.set[k] });
      c.addEventListener('change', () => { S.set[k] = c.checked; save(); renderSide(); renderTop('Profilo'); });
      return h('label', { class: 'set-row', for: 'pf-' + k }, h('div', null, h('b', null, label), h('p', { class: 'small muted' }, desc)), c);
    };
    m.append(h('section', { class: 'panel settings' }, h('h3', null, 'Impostazioni'),
      h('label', { class: 'set-row', for: 'pf-goal' }, h('div', null, h('b', null, 'Obiettivo giornaliero'), h('p', { class: 'small muted' }, 'Quanti XP vuoi fare ogni giorno.')), goalSel),
      tog('sound', 'Effetti sonori', 'Suoni per risposte giuste, sbagliate e traguardi.'),
      tog('relax', 'Modalità relax', 'Vite illimitate: sbagliare non blocca le lezioni.'),
      h('label', { class: 'set-row', for: 'pf-theme' }, h('div', null, h('b', null, 'Tema'), h('p', { class: 'small muted' }, 'Chiaro, scuro o automatico.')), themeSel)));
    // salvataggio
    const area = h('textarea', { id: 'pf-code', rows: 3, placeholder: 'Incolla qui un codice di salvataggio…', 'aria-label': 'Codice di salvataggio' });
    m.append(h('section', { class: 'panel' }, h('h3', null, 'Salvataggio'),
      h('p', { class: 'small muted' }, 'I progressi restano in questo browser' + (Sync.ref ? ' e nel tuo account.' : '.') + ' Per spostarli su un altro dispositivo copia il codice e incollalo lì.'),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: copyCode }, 'Copia codice'),
        h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => importCode(area.value) }, 'Importa codice')),
      area,
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => placementFlow(true) }, 'Rifai il test di posizionamento'),
        h('button', { class: 'btn btn-ghost btn-sm danger', type: 'button', onclick: confirmReset }, 'Azzera tutti i progressi'))));
    function copyCode() {
      const code = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
      area.value = code;
      const okc = () => toast('Codice copiato');
      try { navigator.clipboard.writeText(code).then(okc, () => { area.select(); toast('Seleziona e copia il codice'); }); } catch (e) { area.select(); toast('Seleziona e copia il codice'); }
    }
    function importCode(code) {
      try {
        const d = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
        if (!d || d.v !== 1 || typeof d.prog !== 'object') throw new Error('x');
        S = Object.assign(def(), d);
        S.t = Date.now();
        save(); toast('Progressi importati'); render();
      } catch (e) { toast('Codice non valido: controlla di averlo copiato per intero'); }
    }
    function confirmReset() {
      const close = modal(h('div', { class: 'center' }, h('h2', null, 'Azzerare tutto?'), h('p', null, 'XP, serie, stelle e medaglie verranno cancellati. Non si può annullare.'),
        h('div', { class: 'btn-col' }, h('button', { class: 'btn btn-danger', type: 'button', onclick: () => { S = def(); save(); close(); boot(); } }, 'Sì, azzera'), h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => close() }, 'Annulla'))));
    }
  }

  /* ====================== TEST DI SALTO E POSIZIONAMENTO ====================== */
  function jumpTest(unitId) {
    const first = (unitId - 1) * 10 + 1;
    const lvls = [];
    for (let l = Math.max(1, Math.min(S.unlocked, first - 10)); l < first; l++) lvls.push(l);
    const items = E.mixed(lvls, 12);
    const close = modal(h('div', { class: 'center' }, h('div', { html: App.toro('wow', 84) }), h('h2', null, `Salta all’unità ${unitId}`),
      h('p', null, `12 domande sui livelli ${lvls[0]}–${lvls[lvls.length - 1]}. Con almeno 10 risposte corrette sblocchi l’unità ${unitId}. Non perdi vite.`),
      h('div', { class: 'btn-col' }, h('button', { class: 'btn btn-primary', type: 'button', onclick: () => { close(); go2(); } }, 'Inizia il test'), h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => close() }, 'Non ora'))));
    function go2() {
      runSession({ kind: 'jump', mode: 'normal', items, title: `Test di salto · Unità ${unitId}`, onDone: (res) => {
        const pass = res.ok >= 10;
        const rw = reward(res, { base: pass ? 15 : 3, stage: false });
        if (pass) { S.unlocked = Math.max(S.unlocked, first); S.unit = unitId; save(); }
        results({ title: pass ? `Unità ${unitId} sbloccata!` : 'Test non superato', sub: pass ? 'Puoi giocare qualsiasi tappa dei livelli precedenti quando vuoi.' : `Hai risposto bene a ${res.ok} domande su 12: ne servono 10.`, mood: pass ? 'happy' : 'sad', res, rw, stars: 0, confetti: pass });
      } });
    }
  }

  function placementFlow(fromProfile) {
    const items = E.placement();
    let stopUnit = null;
    const perUnit = {};
    runSession({
      kind: 'placement', mode: 'normal', items, title: 'Test di posizionamento',
      onAnswer: (ex, ok) => {
        const u = ex.unitTag;
        perUnit[u] = perUnit[u] || { ok: 0, n: 0 };
        perUnit[u].n++; if (ok) perUnit[u].ok++;
        const wrongTot = Object.values(perUnit).reduce((a, x) => a + (x.n - x.ok), 0);
        if (stopUnit == null && (perUnit[u].n - perUnit[u].ok >= 2 || wrongTot >= 3)) stopUnit = u;
      },
      stopWhen: () => stopUnit != null,
      onDone: (res) => {
        const u = stopUnit || 10;
        const unitStart = stopUnit == null ? 81 : Math.max(1, (u - 1) * 10 + 1);
        const pick = FQ.STARTS.slice().reverse().find((s) => s.level <= unitStart) || FQ.STARTS[0];
        S.start = pick.level; S.unlocked = Math.max(fromProfile ? S.unlocked : 1, pick.level); S.unit = E.level(S.unlocked).unit; S.onb = true;
        const rw = reward(res, { base: 5, stage: false, streak: false });
        save();
        results({ title: `Partenza consigliata: ${pick.name}`, sub: `Inizi dal livello ${pick.level} · ${E.level(pick.level).title}. I livelli precedenti restano aperti per il ripasso.`, mood: 'wow', res, rw, stars: 0, after: () => { if (!fromProfile) boot(); } });
      },
      onQuit: () => { if (!fromProfile) onboarding(2); },
    });
  }

  /* ====================== ONBOARDING ====================== */
  function onboarding(step = 0) {
    const app = U.$('#app');
    app.innerHTML = '';
    const wrap = h('div', { class: 'onb' });
    app.append(wrap);
    if (step === 0) {
      wrap.append(h('div', { class: 'onb-hero', html: App.toro('happy', 150) }),
        h('h1', null, 'FinQuest'),
        h('p', { class: 'lead' }, 'Impara come funzionano i mercati finanziari, cinque minuti al giorno.'),
        h('ul', { class: 'onb-list' },
          h('li', null, h('b', null, '100 livelli'), ' dal budget ai derivati'),
          h('li', null, h('b', null, '20 tappe'), ' per livello: quiz, grafici, calcoli, situazioni, simulazioni'),
          h('li', null, h('b', null, 'Serie, XP e medaglie'), ' per restare costante')),
        h('button', { class: 'btn btn-primary btn-lg', type: 'button', onclick: () => onboarding(1) }, 'Inizia'),
        h('p', { class: 'small muted' }, 'Gioco didattico, non consulenza finanziaria.'));
    } else if (step === 1) {
      const nameIn = h('input', { type: 'text', id: 'onb-name', placeholder: 'Come ti chiami? (facoltativo)', maxlength: 30, value: S.name, 'aria-label': 'Nome' });
      const goals = [[10, 'Rilassato', '5 min al giorno'], [20, 'Normale', '10 min al giorno'], [30, 'Serio', '15 min al giorno'], [50, 'Intenso', '25 min al giorno']];
      const g = h('div', { class: 'onb-opts' }, goals.map(([v, t, d]) => h('button', { class: 'onb-opt' + (S.goal === v ? ' sel' : ''), type: 'button', onclick: (e) => { S.goal = v; U.$$('.onb-opt', g).forEach((b) => b.classList.toggle('sel', b === e.currentTarget)); } }, h('b', null, t), h('span', { class: 'small muted' }, `${d} · ${v} XP`))));
      wrap.append(h('p', { class: 'eyebrow' }, 'Passo 1 di 2'), h('h2', null, 'Il tuo obiettivo giornaliero'), nameIn, g,
        h('button', { class: 'btn btn-primary btn-lg', type: 'button', onclick: () => { S.name = nameIn.value.trim(); save(); onboarding(2); } }, 'Continua'));
    } else {
      wrap.append(h('p', { class: 'eyebrow' }, 'Passo 2 di 2'), h('h2', null, 'Da dove vuoi partire?'),
        h('div', { class: 'onb-opts' }, FQ.STARTS.map((s) => h('button', { class: 'onb-opt start ' + FQ.UNITS[E.level(s.level).unit - 1].color, type: 'button', onclick: () => {
          S.start = s.level; S.unlocked = s.level; S.unit = E.level(s.level).unit; S.onb = true; save(); boot();
        } }, h('b', null, s.name), h('span', { class: 'small' }, `Livello ${s.level} · ${E.level(s.level).title}`), h('span', { class: 'small muted' }, s.desc)))),
        h('button', { class: 'btn btn-gold btn-lg', type: 'button', onclick: () => placementFlow(false) }, 'Non so: fai il test di posizionamento'),
        h('p', { class: 'small muted' }, 'Fino a 20 domande, dalle basi ai derivati. Il test si ferma quando trova il tuo livello.'));
    }
  }

  /* ====================== AVVIO ====================== */
  function applyTheme() {
    const r = document.documentElement;
    if (S.set.theme === 'system') { if (r.dataset.fqTheme) { r.removeAttribute('data-theme'); delete r.dataset.fqTheme; } }
    else { r.setAttribute('data-theme', S.set.theme); r.dataset.fqTheme = '1'; }
  }
  function boot() {
    regen(); checkStreak(); quests();
    applyTheme();
    if (!S.onb) return onboarding(0);
    buildShell();
    tab = 'path';
    viewPath.scrolled = false;
    render();
  }
  App.start = function () {
    load();
    boot();
    Sync.init();
    setInterval(() => { const before = S.hearts; regen(); if (S.hearts !== before) { save(true); if (U.$('#lesson').hidden) refreshAll(); } }, 30000);
  };
})(typeof window !== 'undefined' ? window : globalThis);
