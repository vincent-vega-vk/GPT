/* CLOSER · UI base: helper DOM, icone, audio, coriandoli, stato, router, modali */
(function (g) {
  'use strict';
  const CL = g.CL;
  const UI = (CL.ui = { screens: {} });

  /* ───── DOM ───── */
  UI.h = function h(tag, props) {
    const el = document.createElement(tag);
    if (props) {
      for (const k in props) {
        const v = props[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    const add = (c) => {
      if (c == null || c === false) return;
      if (Array.isArray(c)) c.forEach(add);
      else el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
    };
    for (let i = 2; i < arguments.length; i++) add(arguments[i]);
    return el;
  };
  const h = UI.h;
  /* svuota e riempie un nodo accettando figli annidati, null e array (replaceChildren non lo fa) */
  UI.fill = (el, ...kids) => {
    el.replaceChildren();
    const add = (c) => { if (c == null || c === false) return; if (Array.isArray(c)) c.forEach(add); else el.appendChild(c.nodeType ? c : document.createTextNode(String(c))); };
    kids.forEach(add);
    return el;
  };
  UI.$ = (sel, root) => (root || document).querySelector(sel);

  /* ───── Icone (tratto 1.8, griglia 24) ───── */
  const ICONS = {
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    se: '<path d="M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.5 2.5-2.3-.5-.5-2.3z"/>',
    exec: '<path d="M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
    ref: '<path d="M3 10v4l11 4V6zM14 8l5-2v12l-5-2M6 14l1 5h3l-1-4"/>',
    desk: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>',
    legal: '<path d="M12 4v16M6 20h12M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5a3 3 0 0 1 0 6M18 14c2 .8 3 2.7 3 6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 5 5"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    next: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
    auto: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
    vol: '<path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
    mute: '<path d="M4 9v6h4l5 4V5L8 9zM17 9l5 6M22 9l-5 6"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 13v4M9 21h6M10 17h4v4h-4z"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M9 7h6"/>',
    swords: '<path d="m4 4 9 9M20 4l-9 9M3 21l4-4M21 21l-4-4M9 15l-3 3M15 15l3 3"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    building: '<path d="M4 21V5l8-2v18M12 9h8v12M4 21h16M8 8h1M8 12h1M8 16h1M16 13h1M16 17h1"/>',
  };
  UI.ic = (name, cls) => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('class', 'i' + (cls ? ' ' + cls : ''));
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = ICONS[name] || '';
    return s;
  };

  UI.initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  UI.avatar = (cast, small) => h('div', { class: 'av' + (small ? ' av--sm' : ''), style: { '--h': cast.hue }, 'aria-hidden': 'true' }, UI.initials(cast.name));

  /* ───── Stato & impostazioni ───── */
  const S = (UI.S = { screen: 'home', run: null, deal: null, sc: null, phase: 'choose', dojo: null, res: null, openDash: false });
  const defaults = { name: '', hard: false, timer: false, sound: false, theme: 'auto', wild: true, fast: false };
  UI.settings = Object.assign({}, defaults, (CL.store.read().settings || {}));
  UI.saveSettings = () => { CL.playerName = UI.settings.name || ''; CL.store.patch((o) => { o.settings = UI.settings; }); };
  CL.playerName = UI.settings.name || '';
  /* se la pagina è incorporata (es. artifact) l'host può già avere impostato data-theme: "auto" lo rispetta */
  const hostTheme = document.documentElement.getAttribute('data-theme');
  UI.applyTheme = () => {
    const r = document.documentElement;
    if (UI.settings.theme === 'auto') { if (hostTheme) r.setAttribute('data-theme', hostTheme); else r.removeAttribute('data-theme'); }
    else r.setAttribute('data-theme', UI.settings.theme);
  };
  UI.records = () => {
    const o = CL.store.read();
    return Object.assign({ runs: [], badges: {}, dojo: { best: 0 } }, o.records || {});
  };
  UI.saveRecords = (fn) => CL.store.patch((o) => { o.records = Object.assign({ runs: [], badges: {}, dojo: { best: 0 } }, o.records || {}); fn(o.records); });

  /* ───── Audio (WebAudio, solo dopo un gesto e se attivo) ───── */
  let actx = null;
  const tone = (f, t0, d, type, vol) => {
    const o = actx.createOscillator(), gn = actx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, actx.currentTime + t0);
    gn.gain.setValueAtTime(0.0001, actx.currentTime + t0);
    gn.gain.exponentialRampToValueAtTime(vol || 0.07, actx.currentTime + t0 + 0.012);
    gn.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + t0 + d);
    o.connect(gn).connect(actx.destination);
    o.start(actx.currentTime + t0); o.stop(actx.currentTime + t0 + d + 0.03);
  };
  UI.sfx = (kind) => {
    if (!UI.settings.sound) return;
    try {
      actx = actx || new (g.AudioContext || g.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const seq = {
        pick: [[520, 0, 0.05, 'triangle']],
        q3: [[523, 0, 0.1], [659, 0.08, 0.1], [784, 0.16, 0.18]],
        q2: [[523, 0, 0.1], [659, 0.09, 0.14]],
        q1: [[330, 0, 0.16, 'triangle']],
        q0: [[196, 0, 0.2, 'sawtooth', 0.04], [147, 0.14, 0.26, 'sawtooth', 0.04]],
        stamp: [[90, 0, 0.18, 'sine', 0.2], [60, 0.02, 0.22, 'sine', 0.2]],
        win: [[523, 0, 0.12], [659, 0.1, 0.12], [784, 0.2, 0.12], [1047, 0.3, 0.3]],
        lose: [[392, 0, 0.18, 'triangle'], [330, 0.16, 0.18, 'triangle'], [262, 0.32, 0.4, 'triangle']],
        tick: [[880, 0, 0.04, 'square', 0.03]],
        phone: [[880, 0, 0.07, 'sine', 0.05], [880, 0.12, 0.07, 'sine', 0.05], [880, 0.5, 0.07, 'sine', 0.05], [880, 0.62, 0.07, 'sine', 0.05]],
        ping: [[1318, 0, 0.08, 'sine', 0.05], [1760, 0.07, 0.14, 'sine', 0.04]],
        alert: [[660, 0, 0.12, 'square', 0.05], [440, 0.14, 0.12, 'square', 0.05], [660, 0.28, 0.12, 'square', 0.05], [440, 0.42, 0.2, 'square', 0.05]],
        door: [[120, 0, 0.12, 'sine', 0.12], [90, 0.1, 0.18, 'sine', 0.1]],
      }[kind];
      if (seq) seq.forEach((n) => tone(n[0], n[1], n[2], n[3], n[4]));
    } catch (e) { /* audio non disponibile */ }
  };

  /* ───── Coriandoli ───── */
  UI.confetti = () => {
    if (g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = h('canvas', { class: 'confetti', 'aria-hidden': 'true' });
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d');
    const dpr = Math.min(2, g.devicePixelRatio || 1);
    const W = (cv.width = innerWidth * dpr), H = (cv.height = innerHeight * dpr);
    const cs = getComputedStyle(document.documentElement);
    const cols = ['--accent', '--good', '--warn', '--bad', '--ink'].map((v) => cs.getPropertyValue(v).trim() || '#2346d4');
    const P = Array.from({ length: 130 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.25, y: H * 0.36, vx: (Math.random() - 0.5) * 16 * dpr, vy: (-Math.random() * 15 - 5) * dpr,
      w: (6 + Math.random() * 7) * dpr, hgt: (3 + Math.random() * 5) * dpr, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4, c: cols[(Math.random() * cols.length) | 0],
    }));
    let t0 = performance.now();
    setTimeout(() => cv.remove(), 4200);
    (function step(t) {
      const dt = Math.min(2, (t - t0) / 16.7); t0 = t;
      ctx.clearRect(0, 0, W, H);
      let alive = 0;
      P.forEach((p) => {
        p.vy += 0.42 * dpr * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.vx *= 0.995;
        if (p.y < H + 30) alive++;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.hgt / 2, p.w, p.hgt); ctx.restore();
      });
      if (alive && cv.isConnected) requestAnimationFrame(step); else cv.remove();
    })(t0);
  };

  /* ───── Toast, modali ───── */
  UI.toast = (msg) => {
    const el = h('div', { class: 'toast', role: 'status' }, msg);
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2400);
  };
  let openModals = 0;
  UI.modal = (build) => {
    const prev = document.activeElement;
    const scrim = h('div', { class: 'scrim' });
    const close = () => {
      scrim.remove(); openModals--; document.removeEventListener('keydown', onKey, true);
      if (prev && prev.focus) { try { prev.focus(); } catch (e) { /* noop */ } }
    };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    scrim.addEventListener('mousedown', (e) => { if (e.target === scrim) close(); });
    const box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' });
    box.appendChild(build(close));
    scrim.appendChild(box);
    document.body.appendChild(scrim);
    openModals++; document.addEventListener('keydown', onKey, true);
    const f = box.querySelector('[data-autofocus]') || box.querySelector('button');
    if (f) f.focus();
    return close;
  };
  UI.modalOpen = () => openModals > 0;

  /* ───── Router ───── */
  UI.go = (screen, extra) => {
    if (UI.ambience && !['play', 'forecast', 'closing', 'debrief'].includes(screen)) UI.ambience.stop();
    S.rv++; /* annulla eventuali riproduzioni di scena in corso */
    S.screen = screen;
    if (extra) Object.assign(S, extra);
    UI.render();
    g.scrollTo(0, 0);
  };
  UI.render = () => {
    const app = UI.$('#app');
    app.replaceChildren();
    const fn = UI.screens[S.screen];
    app.appendChild(fn());
    UI.syncTopbar();
    const hd = app.querySelector('[data-focus]');
    if (hd) { hd.setAttribute('tabindex', '-1'); hd.focus({ preventScroll: true }); }
  };

  /* ───── Topbar ───── */
  UI.syncTopbar = () => {
    const bar = UI.$('#topbar');
    bar.replaceChildren();
    const themeIcon = { auto: 'auto', light: 'sun', dark: 'moon' }[UI.settings.theme];
    bar.appendChild(h('div', { class: 'wrap' },
      h('button', { class: 'brand', 'aria-label': 'Torna alla home', onclick: () => UI.confirmLeave(() => UI.go('home')) }, h('b', null, 'Closer'), h('span', null, 'Simulatore AE')),
      h('div', { class: 'grow' }),
      S.run && S.run.mode === 'career' && S.screen !== 'home' && S.screen !== 'summary'
        ? h('div', { class: 'row gap-8 small muted', 'aria-label': 'Stato trimestre' },
          h('span', { class: 'row gap-4' }, UI.ic('clock'), `Sett. ${CL.week(S.run)}/${CL.CONFIG.weeks}`),
          h('span', { class: 'row gap-4' }, UI.ic('shield'), `Rep. ${S.run.rep}`))
        : null,
      h('button', { class: 'iconbtn', 'aria-label': 'Come si gioca', title: 'Come si gioca', onclick: () => UI.howto() }, UI.ic('info')),
      h('button', { class: 'iconbtn', 'aria-label': 'Audio', 'aria-pressed': String(UI.settings.sound), title: 'Audio', onclick: () => { UI.settings.sound = !UI.settings.sound; UI.saveSettings(); UI.sfx('pick'); UI.syncTopbar(); if (UI.ambience) UI.ambience.refresh(); if (S.screen === 'home') UI.render(); } }, UI.ic(UI.settings.sound ? 'vol' : 'mute')),
      h('button', { class: 'iconbtn', 'aria-label': 'Tema: ' + UI.settings.theme, title: 'Tema', onclick: () => { const order = ['auto', 'light', 'dark']; UI.settings.theme = order[(order.indexOf(UI.settings.theme) + 1) % 3]; UI.saveSettings(); UI.applyTheme(); UI.syncTopbar(); } }, UI.ic(themeIcon)),
    ));
  };

  /* uscita dalla partita (verso la home): conferma inline, niente confirm() nativo */
  UI.confirmLeave = (fn) => {
    const career = S.run && S.run.mode === 'career' && !['home', 'summary', 'briefing'].includes(S.screen) && S.run.results.length > 0;
    const inGame = S.screen === 'play' || S.screen === 'dojo' || career;
    if (!inGame) return fn();
    UI.modal((close) => h('div', null,
      h('header', null, h('div', { class: 'grow' }, h('h3', { class: 'display', style: { fontSize: '28px' } }, 'Uscire dalla partita?'))),
      h('div', { class: 'body' }, h('p', { class: 'muted' }, 'I progressi in corso andranno persi.')),
      h('footer', null,
        h('button', { class: 'btn btn--primary', 'data-autofocus': '', onclick: () => { close(); UI.stopTimer && UI.stopTimer(); UI.stopDojoTimer && UI.stopDojoTimer(); S.run = null; S.deal = null; fn(); } }, 'Esci'),
        h('button', { class: 'btn', onclick: close }, 'Resta'))));
  };

  /* ───── Utilità di formato ───── */
  UI.signed = (n) => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0');
  UI.stars = (n) => '★'.repeat(n) + '☆'.repeat(4 - n);
  UI.meterLabel = (k) => CL.METERS.find((m) => m.k === k).label;
})(typeof window !== 'undefined' ? window : globalThis);
