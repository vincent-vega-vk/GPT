/* CLOSER · widget firma del cruscotto (spec §10)
   CL.ui.widget(type, title, data, prevData) → HTMLElement
   Dipende solo da CL.ui.h e CL.ui.initials. Stili in src/widgets.css.
   Le righe cambiate rispetto a prevData ricevono la classe .chg per 1,8 s. */
(function (g) {
  'use strict';
  const CL = g.CL, UI = CL.ui, h = UI.h;
  const NS = 'http://www.w3.org/2000/svg';
  const CHG_MS = 1800;

  /* ───────────── utilità ───────────── */
  const T = (x) => (x == null ? '' : String(x));
  const A = (x) => (Array.isArray(x) ? x : []);
  const clamp01 = (n) => (isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);
  const pad2 = (n) => String(n).padStart(2, '0');
  const fmtN = (n) => n.toLocaleString('it-IT', { maximumFractionDigits: 1 });
  const plural = (n, one, many) => (n === 1 ? one : many);
  const cssVar = (el, name, val) => { el.style.setProperty(name, val); return el; };

  /* "52%" → 52 · "€1,28 M" → 1.28 · "1.200" → 1200 */
  const NUM_RE = /-?\d{1,3}(?:\.\d{3})+(?:,\d+)?|-?\d+(?:[.,]\d+)?/;
  const norm = (s) => T(s).replace(/[−–]/g, '-');
  function parseNum(s) {
    const m = NUM_RE.exec(norm(s));
    if (!m) return NaN;
    const v = m[0];
    return parseFloat(/^-?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(v) ? v.replace(/\./g, '').replace(',', '.') : v.replace(',', '.'));
  }
  const unitOf = (s) => norm(s).replace(NUM_RE, '#');

  /* differenza leggibile tra due valori omogenei: "30%" → "12%" = "−18 pt" */
  function diffText(a, b) {
    const x = parseNum(a), y = parseNum(b);
    if (!isFinite(x) || !isFinite(y) || x === y || unitOf(a) !== unitOf(b)) return '';
    const u = unitOf(a), suf = u.slice(u.indexOf('#') + 1);
    return (y > x ? '+' : '−') + fmtN(Math.abs(y - x)) + (suf.trim() === '%' ? ' pt' : suf);
  }

  const hashHue = (s) => { let x = 7; for (const c of T(s)) x = (x * 31 + c.charCodeAt(0)) % 360; return x; };

  /* ───────────── SVG ───────────── */
  const sv = (tag, attrs, ...kids) => {
    const el = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) { const v = attrs[k]; if (v != null && v !== false) el.setAttribute(k, v); }
    kids.forEach((c) => c && el.appendChild(c));
    return el;
  };
  /* icone a tratto (griglia 24). Le varianti "badge" hanno disco pieno (.b) e segno (.g). */
  const ICO = {
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    bang: '<path d="M12 6v8M12 18h.01"/>',
    ban: '<circle cx="12" cy="12" r="8.2"/><path d="m6.3 6.3 11.4 11.4"/>',
    half: '<circle cx="12" cy="12" r="8"/><path class="f" d="M12 4a8 8 0 0 1 0 16z"/>',
    circle: '<circle cx="12" cy="12" r="8"/>',
    dots: '<circle class="f" cx="6" cy="12" r="1.7"/><circle class="f" cx="12" cy="12" r="1.7"/><circle class="f" cx="18" cy="12" r="1.7"/>',
    swap: '<path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/>',
    up: '<path d="M12 19V6M6.5 11.5 12 6l5.5 5.5"/>',
    down: '<path d="M12 5v13M6.5 12.5 12 18l5.5-5.5"/>',
    arrow: '<path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5"/>',
    eq: '<path d="M6 9.5h12M6 14.5h12"/>',
    approx: '<path d="M5 9.5c2-2 4-2 7 0s5 2 7 0M5 15c2-2 4-2 7 0s5 2 7 0"/>',
    neq: '<path d="M6 9.5h12M6 14.5h12M9.5 19 14.5 5"/>',
    okB: '<circle class="b" cx="12" cy="12" r="10"/><path class="g" d="m7.6 12.4 3 3 5.8-6.4"/>',
    badB: '<circle class="b" cx="12" cy="12" r="10"/><path class="g" d="m8.4 8.4 7.2 7.2M15.6 8.4l-7.2 7.2"/>',
    warnB: '<path class="b" d="M12 2.6c.6 0 1.2.3 1.5.9l8.3 14.6c.7 1.2-.2 2.7-1.5 2.7H3.7c-1.3 0-2.2-1.5-1.5-2.7L10.5 3.5c.3-.6.9-.9 1.5-.9z"/><path class="g" d="M12 9.5v4.6M12 17.2h.01"/>',
    q: '<path d="M9.3 9.2a2.8 2.8 0 1 1 4.2 2.4c-.9.5-1.5 1.1-1.5 2.1M12 17.4h.01"/>',
  };
  const ic = (name, cls) => {
    const s = sv('svg', { viewBox: '0 0 24 24', class: 'wg-i' + (cls ? ' ' + cls : ''), 'aria-hidden': 'true', focusable: 'false' });
    s.innerHTML = ICO[name] || '';
    return s;
  };

  /* ───────────── confronto con prevData ───────────── */
  const keyOf = (r, i) => {
    if (r && typeof r === 'object') {
      if (r.k != null) return 'k:' + r.k;
      if (r.who != null) return 'w:' + r.who;
      if (r.name != null) return 'n:' + r.name;
      if (r.label != null) return 'l:' + r.label;
    }
    return 'i:' + i;
  };
  const sig = (r) => { try { return JSON.stringify(r); } catch (e) { return String(Math.random()); } };

  function flash(el, kind) {
    el.classList.add('chg');
    if (kind === 'new') el.classList.add('chg-new');
    setTimeout(() => el.classList.remove('chg', 'chg-new'), CHG_MS);
  }

  /* prevList: array di righe dell’ultimo data mostrato (o null). Senza base nessuna evidenziazione. */
  function tracker(prevList) {
    const m = new Map();
    A(prevList).forEach((r, i) => m.set(keyOf(r, i), { sig: sig(r), row: r }));
    const names = [];
    return {
      base: m.size > 0,
      names,
      prevRow(r, i) { const e = m.get(keyOf(r, i)); return e ? e.row : null; },
      kind(r, i) {
        if (!m.size) return null;
        const e = m.get(keyOf(r, i));
        if (!e) return 'new';
        return e.sig === sig(r) ? null : 'chg';
      },
      mark(el, r, i, label) {
        const kd = this.kind(r, i);
        if (kd) { flash(el, kd); names.push(label); }
        return kd;
      },
    };
  }

  /* ───────────── componenti comuni ───────────── */
  let uid = 0;

  function wrap(type, title, meta, body, cls) {
    return h('section', { class: 'wg wg--' + type + (cls ? ' ' + cls : ''), 'data-wg': type, role: 'group', 'aria-label': title || null },
      title ? h('h4', { class: 'wg-h' }, h('span', { class: 't' }, title), meta ? h('span', { class: 'm' }, meta) : null) : null,
      body);
  }

  const EMPTY = {
    stakeholders: 'Ancora nessun nome sulla mappa.',
    clock: 'Nessuna scadenza fissata.',
    termsheet: 'Nessuna richiesta sul tavolo.',
    board: 'Nessuna attività in corso.',
    kpis: 'Nessun indicatore disponibile.',
    scorecard: 'Nessuna voce da confrontare.',
    timeline: 'Nessuna tappa definita.',
    checklist: 'Nessuna voce in elenco.',
    scoreboard: 'Nessun punteggio disponibile.',
    _: 'Dati non disponibili.',
  };
  const empty = (type) => h('div', { class: 'wg-empty' }, ic('circle'), h('span', null, EMPTY[type] || EMPTY._));

  /* pillola di stato: s = { cls, label, ic, solid, ex } */
  const pill = (s, extra) => h('span', { class: 'wg-pill is-' + s.cls + (s.solid ? ' is-solid' : '') + (s.ex ? ' is-' + s.ex : '') },
    s.ic ? ic(s.ic) : null, extra || null, s.label);

  /* barra segmentata + legenda. parts: [{ n, cls, label, ex }] */
  function segbar(parts, prevParts, thin) {
    const bar = h('div', {
      class: 'wg-seg' + (thin ? ' is-thin' : ''), role: 'img',
      'aria-label': parts.filter((p) => p.n).map((p) => p.label + ' ' + p.n).join(', ') || 'Nessuna voce',
    });
    parts.forEach((p, i) => {
      const pn = prevParts && prevParts[i] ? prevParts[i].n : null;
      if (!(p.n > 0 || pn > 0)) return;
      const seg = h('i', { class: 'is-' + p.cls + (p.ex ? ' is-' + p.ex : '') + (p.n ? '' : ' is-gone') });
      seg.style.flexGrow = String(p.n);
      if (pn != null && pn !== p.n) { cssVar(seg, '--n0', String(pn)); seg.classList.add('go'); }
      bar.appendChild(seg);
    });
    return bar;
  }
  const legend = (parts) => h('div', { class: 'wg-leg' }, parts.filter((p) => p.n > 0).map((p) =>
    h('span', { class: 'is-' + p.cls + (p.ex ? ' is-' + p.ex : '') }, h('i'), p.label + ' ', h('b', null, String(p.n)))));
  const summary = (parts, prevParts) => h('div', { class: 'wg-sum' }, segbar(parts, prevParts), legend(parts));
  const count = (list, fn) => list.reduce((a, r) => a + (fn(r) ? 1 : 0), 0);

  /* barra di progresso con animazione dal valore precedente (--w0) */
  function meter(frac, prevFrac, cls) {
    const i = h('i', { class: cls || null });
    i.style.width = (clamp01(frac) * 100).toFixed(1) + '%';
    if (prevFrac != null && Math.abs(prevFrac - frac) > 0.004) { cssVar(i, '--w0', (clamp01(prevFrac) * 100).toFixed(1) + '%'); i.classList.add('go'); }
    return i;
  }

  /* ═════════════ 1 · stakeholders · mappa del potere ═════════════ */
  const STANCE = {
    champion: { cls: 'good', label: 'Champion', rank: 4, solid: true },
    ally: { cls: 'good', label: 'Alleato', rank: 3 },
    neutral: { cls: 'mute', label: 'Neutrale', rank: 2 },
    skeptic: { cls: 'warn', label: 'Scettico', rank: 1 },
    hostile: { cls: 'bad', label: 'Ostile', rank: 0, solid: true },
    unknown: { cls: 'mute', label: 'Non mappato', rank: -1, ex: 'dash' },
  };
  const stanceOf = (p) => STANCE[p && p.stance] || STANCE.unknown;
  const SH_GROUPS = [
    { id: 'fav', cls: 'good', label: 'A favore', has: (s) => s === 'champion' || s === 'ally' },
    { id: 'neu', cls: 'mute', label: 'Neutrali', has: (s) => s === 'neutral' },
    { id: 'unk', cls: 'mute', ex: 'dash', label: 'Non mappati', has: (s) => !STANCE[s] || s === 'unknown' },
    { id: 'skp', cls: 'warn', label: 'Scettici', has: (s) => s === 'skeptic' },
    { id: 'hos', cls: 'bad', label: 'Ostili', has: (s) => s === 'hostile' },
  ];
  const shParts = (rows) => SH_GROUPS.map((g2) => ({ n: count(rows, (p) => g2.has(p && p.stance)), cls: g2.cls, ex: g2.ex, label: g2.label }));

  function avatar(p, st) {
    const unknown = !p.name;
    return h('span', { class: 'wg-av' + (st.ex ? ' is-dash' : ''), 'aria-hidden': 'true' }, unknown ? '?' : UI.initials(T(p.name)));
  }

  function stakeholders(data, prev) {
    const rows = A(data).filter(Boolean);
    if (!rows.length) return null;
    const tr = tracker(prev);
    const prevRows = A(prev).filter(Boolean);
    const list = h('ul', { class: 'wg-list' });
    rows.forEach((p, i) => {
      const st = stanceOf(p);
      const pr = tr.prevRow(p, i);
      let dir = null;
      if (pr && pr.stance !== p.stance) {
        const a = stanceOf(pr).rank, b = st.rank;
        dir = a >= 0 && b >= 0 ? (b > a ? 'up' : 'down') : null;
      }
      const av = avatar(p, st);
      cssVar(av, '--h', String(p.hue != null ? p.hue : hashHue(p.who || p.name)));
      const li = h('li', { class: 'wg-row wg-c wg-sh is-' + st.cls + (st.ex ? ' is-' + st.ex : '') },
        av,
        h('div', { class: 'wg-sh-main' },
          h('div', { class: 'wg-sh-top' },
            h('b', { class: 'wg-name' }, p.name ? T(p.name) : 'Persona da identificare'),
            pill(st, dir ? ic(dir, 'wg-dir') : null)),
          p.role ? h('div', { class: 'wg-role' }, T(p.role)) : null,
          p.note ? h('p', { class: 'wg-note' }, T(p.note)) : null));
      tr.mark(li, p, i, p.name || p.who || 'persona');
      list.appendChild(li);
    });
    const fav = count(rows, (p) => SH_GROUPS[0].has(p.stance));
    return {
      meta: `${fav}/${rows.length} a favore`,
      body: [summary(shParts(rows), prevRows.length ? shParts(prevRows) : null), list],
      names: tr.names,
    };
  }

  /* ═════════════ 2 · clock · orologio / conto alla rovescia ═════════════ */
  const hm = (s) => { const m = /^\s*(\d{1,2})\s*[:.h]\s*(\d{2})/.exec(T(s)); return m ? +m[1] * 60 + +m[2] : NaN; };
  const R_RING = 46, C_RING = 2 * Math.PI * R_RING;

  function dial(p, prevP) {
    const svg = sv('svg', { viewBox: '0 0 120 120', class: 'wg-dial', 'aria-hidden': 'true', focusable: 'false' });
    let minor = '', major = '';
    for (let i = 0; i < 60; i++) {
      const a = ((i * 6 - 90) * Math.PI) / 180, big = i % 5 === 0, r1 = big ? 52.5 : 54.5, r2 = 58.2;
      const seg = `M${(60 + r1 * Math.cos(a)).toFixed(2)} ${(60 + r1 * Math.sin(a)).toFixed(2)}L${(60 + r2 * Math.cos(a)).toFixed(2)} ${(60 + r2 * Math.sin(a)).toFixed(2)}`;
      if (big) major += seg; else minor += seg;
    }
    svg.appendChild(sv('path', { d: minor, class: 'tk' }));
    svg.appendChild(sv('path', { d: major, class: 'tk tk--major' }));
    svg.appendChild(sv('circle', { cx: 60, cy: 60, r: R_RING, class: 'trk' }));
    const arc = sv('circle', {
      cx: 60, cy: 60, r: R_RING, class: 'arc', transform: 'rotate(-90 60 60)',
      'stroke-dasharray': C_RING.toFixed(2), 'stroke-dashoffset': (C_RING * (1 - p)).toFixed(2),
    });
    if (p < 0.004) arc.setAttribute('class', 'arc is-zero');
    const hand = sv('g', { class: 'hand' }, sv('circle', { class: 'halo', cx: 60, cy: 60 - R_RING, r: 9 }), sv('circle', { class: 'dot', cx: 60, cy: 60 - R_RING, r: 4.8 }));
    hand.style.transform = `rotate(${(p * 360).toFixed(1)}deg)`;
    if (prevP != null && Math.abs(prevP - p) > 0.004) {
      const st = (el, k, v) => el.style.setProperty(k, v);
      st(arc, '--o0', (C_RING * (1 - prevP)).toFixed(2)); arc.classList.add('go');
      st(hand, '--a0', (prevP * 360).toFixed(1) + 'deg'); hand.classList.add('go');
    }
    svg.appendChild(arc);
    svg.appendChild(hand);
    return svg;
  }

  function remFmt(min) {
    if (min < 0) return { big: 'Scaduto', unit: '' };
    if (min === 0) return { big: 'Adesso', unit: '' };
    if (min < 60) return { big: String(min), unit: 'min' };
    return { big: `${Math.floor(min / 60)} h ${pad2(min % 60)}`, unit: '' };
  }

  function clock(d, prev) {
    if (!d || typeof d !== 'object' || (d.time == null && d.days == null && d.pct == null)) return null;
    const isDays = d.days != null;
    const pctOf = (x) => {
      if (!x || typeof x !== 'object') return null;
      if (x.days != null) { const of = +x.of > 0 ? +x.of : Math.max(+x.days, 1); return x.pct != null ? clamp01(+x.pct) : clamp01(1 - +x.days / of); }
      return x.pct != null ? clamp01(+x.pct) : null;
    };
    const p = pctOf(d) == null ? 0 : pctOf(d);
    const prevP = pctOf(prev);
    const urgent = !!d.urgent;
    const tone = urgent ? 'bad' : p >= 0.8 ? 'warn' : 'acc';

    /* cifre al centro del quadrante */
    let digits;
    if (isDays) {
      const n = Math.max(0, Math.round(+d.days) || 0);
      digits = h('div', { class: 'wg-dig is-days' }, h('b', null, String(n)), h('small', null, plural(n, 'giorno', 'giorni')));
    } else {
      const tm = /^\s*(\d{1,2})[:.](\d{2})\s*(.*)$/.exec(T(d.time));
      if (tm) {
        digits = h('div', { class: 'wg-dig' },
          h('span', { class: 'hm' }, pad2(+tm[1]), h('span', { class: 'colon' }, ':'), tm[2]),
          h('small', null, tm[3] || 'ora'));
      } else {
        const raw = T(d.time);
        digits = h('div', { class: 'wg-dig' + (raw.length > 5 ? ' is-long' : '') }, h('span', { class: 'hm' }, raw), h('small', null, 'ora'));
      }
    }

    /* colonna destra */
    const label = d.label ? T(d.label) : (isDays ? 'Giorni alla scadenza' : 'Alla scadenza');
    const head = h('div', { class: 'wg-clk-lab' }, h('span', null, label), urgent ? pill({ cls: 'bad', label: 'Urgente', solid: true }) : null);
    let right;
    if (isDays) {
      const of = +d.of > 0 ? Math.round(+d.of) : Math.max(Math.round(+d.days) || 1, 1);
      const left = Math.max(0, Math.round(+d.days) || 0);
      const done = Math.max(0, Math.min(of, of - left));
      const prevDone = prev && prev.days != null ? Math.max(0, Math.min(of, of - Math.max(0, Math.round(+prev.days) || 0))) : null;
      let track;
      if (of <= 31) {
        track = h('div', { class: 'wg-days', role: 'img', 'aria-label': `${done} giorni trascorsi su ${of}` });
        for (let i = 0; i < of; i++) {
          const on = i < done;
          const cell = h('i', { class: on ? 'on' : (i === done ? 'cur' : null) });
          if (prevDone != null && prevDone !== done && ((i >= prevDone && i < done) || (i >= done && i < prevDone))) cell.classList.add('flip');
          track.appendChild(cell);
        }
      } else {
        track = h('div', { class: 'wg-bar', role: 'img', 'aria-label': `${done} giorni trascorsi su ${of}` }, meter(done / of, prevDone != null ? prevDone / of : null));
      }
      right = h('div', { class: 'wg-clk-r' }, head, track,
        h('div', { class: 'wg-clk-dl' }, h('b', null, String(done)), ` di ${of} giorni trascorsi`));
    } else {
      const t1 = hm(d.time), t2 = hm(d.deadline);
      const rem = isFinite(t1) && isFinite(t2) ? remFmt(t2 - t1) : null;
      let big;
      if (rem) big = h('div', { class: 'wg-clk-rem' + (rem.unit ? '' : ' is-word') }, h('b', null, rem.big), rem.unit ? h('u', null, rem.unit) : null);
      else if (d.deadline) big = h('div', { class: 'wg-clk-rem is-word' }, h('b', null, T(d.deadline)));
      else big = h('div', { class: 'wg-clk-rem' }, h('b', null, String(Math.round(p * 100))), h('u', null, '%'));
      const cap = rem ? (rem.unit || rem.big.indexOf(' h ') > 0 ? 'Mancano' : 'Stato') : (d.deadline ? 'Scadenza' : 'Trascorso');
      right = h('div', { class: 'wg-clk-r' }, head,
        h('div', { class: 'wg-clk-cap' }, cap),
        big,
        rem && d.deadline ? h('div', { class: 'wg-clk-dl' }, 'Scadenza ', h('b', null, T(d.deadline))) : null);
    }

    const face = h('div', { class: 'wg-face' }, dial(p, prevP), digits);
    const el = h('div', { class: 'wg-clk wg-c is-' + tone + (urgent ? ' is-urgent' : '') + (isDays ? ' is-days' : '') },
      face, right, d.sub ? h('p', { class: 'wg-clk-sub' }, T(d.sub)) : null);

    const names = [];
    if (prev && typeof prev === 'object' && sig(prev) !== sig(d)) { flash(el, 'chg'); names.push(label); }
    return { meta: '', body: el, names };
  }

  /* ═════════════ 3 · termsheet · foglio di negoziazione ═════════════ */
  const TS = {
    open: { cls: 'warn', label: 'Aperto', ic: 'dots' },
    traded: { cls: 'acc', label: 'Scambiato', ic: 'swap' },
    won: { cls: 'good', label: 'Ottenuto', ic: 'check' },
    lost: { cls: 'bad', label: 'Perso', ic: 'x' },
    blocked: { cls: 'bad', label: 'Bloccato', ic: 'ban', ex: 'hatch' },
  };
  const TS_ORDER = ['won', 'traded', 'open', 'blocked', 'lost'];
  const tsParts = (rows) => TS_ORDER.map((k) => ({ n: count(rows, (r) => r.st === k), cls: TS[k].cls, ex: TS[k].ex === 'hatch' ? 'dash' : null, label: TS[k].label }));

  function termsheet(d, prev) {
    const rows = A(d && d.rows).filter(Boolean);
    if (!rows.length) return null;
    const cols = A(d.cols).map(T);
    const c0 = cols[0] || 'Richiesta', c1 = cols[1] || 'Nostra posizione', c2 = cols[2] || 'Stato';
    const prevRows = A(prev && prev.rows).filter(Boolean);
    const tr = tracker(prevRows);
    const list = h('ul', { class: 'wg-list' });
    rows.forEach((r, i) => {
      const st = TS[r.st] || TS.open;
      let dt = diffText(r.ask, r.ours);
      if (dt.length > 8) dt = '';
      const li = h('li', { class: 'wg-row wg-c wg-ts is-' + st.cls + (st.ex ? ' is-' + st.ex : '') },
        h('b', { class: 'wg-ts-k' }, T(r.k)),
        h('div', { class: 'wg-ts-ask' }, h('span', { class: 'wg-lbl' }, c0), h('span', { class: 'wg-ts-v' }, T(r.ask) || '—')),
        h('div', { class: 'wg-ts-gap', 'aria-hidden': 'true' }, ic('arrow'), dt ? h('span', null, dt) : null),
        h('div', { class: 'wg-ts-ours' }, h('span', { class: 'wg-lbl' }, c1), h('span', { class: 'wg-ts-v' }, T(r.ours) || '—')),
        h('span', { class: 'wg-ts-st', title: c2 }, pill(st)));
      tr.mark(li, r, i, r.k);
      list.appendChild(li);
    });
    const head = h('div', { class: 'wg-ts-head', 'aria-hidden': 'true' }, h('span'), h('span', null, c0), h('span'), h('span', null, c1), h('span', null, c2));
    const open = count(rows, (r) => r.st === 'open' || r.st === 'blocked' || !TS[r.st]);
    return {
      meta: open ? `${open} ${plural(open, 'aperta', 'aperte')}` : 'tutte chiuse',
      body: [summary(tsParts(rows), prevRows.length ? tsParts(prevRows) : null), head, list],
      names: tr.names,
    };
  }

  /* ═════════════ 4 · board · kanban ═════════════ */
  const BD = {
    todo: { cls: 'mute', label: 'Da fare', ic: 'circle', ex: 'dash' },
    doing: { cls: 'acc', label: 'In corso', ic: 'half' },
    done: { cls: 'good', label: 'Fatto', ic: 'check' },
    blocked: { cls: 'bad', label: 'Bloccato', ic: 'ban', ex: 'hatch' },
  };
  const BD_ORDER = ['done', 'doing', 'blocked', 'todo'];
  const bdParts = (cards) => BD_ORDER.map((k) => ({ n: count(cards, (c) => c.st === k), cls: BD[k].cls, ex: k === 'todo' ? 'dash' : null, label: BD[k].label }));
  const flatBoard = (d) => A(d && d.cols).filter(Boolean).flatMap((l, li) => A(l.cards).filter(Boolean).map((c) => Object.assign({}, c, { k: c.k != null ? c.k : T(l.title) + '/' + T(c.t), _lane: li })));

  function board(d, prev) {
    const lanes = A(d && d.cols).filter(Boolean);
    if (!lanes.length) return null;
    const flat = flatBoard(d), prevFlat = flatBoard(prev);
    if (!flat.length && !lanes.length) return null;
    const tr = tracker(prevFlat);
    const wrapEl = h('div', { class: 'wg-bd', 'data-n': String(Math.min(lanes.length, 5)) });
    let idx = 0;
    lanes.forEach((lane, li) => {
      const cards = A(lane.cards).filter(Boolean);
      const done = count(cards, (c) => c.st === 'done');
      const ul = h('ul', { class: 'wg-cards' });
      cards.forEach((c) => {
        const st = BD[c.st] || BD.todo;
        const item = flat[idx];
        const li2 = h('li', { class: 'wg-card wg-c is-' + st.cls + (st.ex ? ' is-' + st.ex : ''), title: st.label },
          ic(st.ic), h('span', { class: 'wg-card-t' }, T(c.t)), h('span', { class: 'wg-sr' }, ' (' + st.label.toLowerCase() + ')'));
        tr.mark(li2, item, idx, c.t);
        idx++;
        ul.appendChild(li2);
      });
      if (!cards.length) ul.appendChild(h('li', { class: 'wg-lane-none' }, 'Nessuna attività'));
      const prevCards = prevFlat.filter((c) => c._lane === li);
      wrapEl.appendChild(h('section', { class: 'wg-lane', 'aria-label': T(lane.title) },
        h('header', { class: 'wg-lane-h' }, h('b', null, T(lane.title)), h('span', null, `${done}/${cards.length}`)),
        cards.length ? segbar(bdParts(cards), prevCards.length ? bdParts(prevCards) : null, true) : null,
        ul));
    });
    const doneAll = count(flat, (c) => c.st === 'done');
    return {
      meta: `${doneAll}/${flat.length} fatte`,
      body: [summary(bdParts(flat), prevFlat.length ? bdParts(prevFlat) : null), wrapEl],
      names: tr.names,
    };
  }

  /* ═════════════ 5 · kpis · tessere con sparkline ═════════════ */
  function spark(vals, tone, target) {
    const v = A(vals).map(Number).filter(isFinite);
    if (!v.length) return null;
    let min = Math.min(...v), max = Math.max(...v);
    const last = v[v.length - 1];
    const tv = parseNum(target);
    const useT = isFinite(tv) && Math.abs(tv - last) <= 3 * Math.max(max - min, Math.abs(last) * 0.5, 1);
    if (useT) { min = Math.min(min, tv); max = Math.max(max, tv); }
    const W = 100, H = 100, px = 3.5, py = 16, rng = max - min;
    const X = (i) => (v.length === 1 ? W - px : px + ((W - 2 * px) * i) / (v.length - 1));
    const Y = (x) => (rng === 0 ? H / 2 : H - py - ((H - 2 * py) * (x - min)) / rng);
    const pts = v.map((x, i) => `${X(i).toFixed(2)} ${Y(x).toFixed(2)}`);
    const id = 'wgsg' + ++uid;
    const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', class: 'wg-spark-svg', 'aria-hidden': 'true', focusable: 'false' },
      sv('defs', null, sv('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 }, sv('stop', { offset: '0', 'stop-opacity': '.30' }), sv('stop', { offset: '1', 'stop-opacity': '0' }))));
    if (useT) svg.appendChild(sv('path', { class: 'tgt', d: `M0 ${Y(tv).toFixed(2)}H${W}`, 'vector-effect': 'non-scaling-stroke' }));
    if (v.length > 1) {
      svg.appendChild(sv('path', { class: 'area', d: `M${pts.join('L')}L${X(v.length - 1).toFixed(2)} ${H}L${X(0).toFixed(2)} ${H}Z`, fill: `url(#${id})` }));
      svg.appendChild(sv('path', { class: 'ln', d: `M${pts.join('L')}`, 'vector-effect': 'non-scaling-stroke' }));
    }
    const ex = X(v.length - 1).toFixed(2), ey = Y(last).toFixed(2);
    svg.appendChild(sv('path', { class: 'halo', d: `M${ex} ${ey}h0`, 'vector-effect': 'non-scaling-stroke' }));
    svg.appendChild(sv('path', { class: 'rng', d: `M${ex} ${ey}h0`, 'vector-effect': 'non-scaling-stroke' }));
    svg.appendChild(sv('path', { class: 'dot', d: `M${ex} ${ey}h0`, 'vector-effect': 'non-scaling-stroke' }));
    return h('div', { class: 'wg-spark', role: 'img', 'aria-label': v.length > 1 ? `Andamento da ${fmtN(v[0])} a ${fmtN(last)}` : `Valore ${fmtN(last)}` }, svg);
  }

  const TONE = { good: 'good', bad: 'bad', warn: 'warn' };

  function kpis(data, prev) {
    const rows = A(data).filter(Boolean);
    if (!rows.length) return null;
    const tr = tracker(prev);
    const grid = h('div', { class: 'wg-kpis' });
    rows.forEach((r, i) => {
      const tone = TONE[r.tone] || 'acc';
      const dl = T(r.delta).trim();
      const dir = /^\+/.test(dl) ? 'up' : /^[-−–]/.test(dl) ? 'down' : null;
      const value = T(r.value);
      const vN = parseNum(r.value), tN = parseNum(r.target);
      const bullet = isFinite(vN) && isFinite(tN) && tN > 0 && vN >= 0 && unitOf(r.value) === unitOf(r.target);
      const pr = tr.prevRow(r, i);
      let foot = null;
      if (r.target != null && r.target !== '') {
        foot = h('div', { class: 'wg-kpi-foot' },
          h('div', { class: 'wg-ft' }, h('span', { class: 'wg-lbl' }, 'Obiettivo'), h('b', null, T(r.target))));
        if (bullet) {
          const mx = Math.max(vN, tN);
          const pv = pr ? parseNum(pr.value) : NaN;
          const bar = h('div', { class: 'wg-bullet', 'aria-hidden': 'true' }, meter(vN / mx, isFinite(pv) && pv >= 0 ? pv / Math.max(pv, tN) : null), h('u'));
          bar.lastChild.style.left = (clamp01(tN / mx) * 100).toFixed(1) + '%';
          foot.appendChild(bar);
        }
      }
      const art = h('article', { class: 'wg-kpi wg-c is-' + tone },
        h('span', { class: 'wg-lbl' }, T(r.label)),
        h('div', { class: 'wg-kpi-vr' },
          h('div', { class: 'wg-kpi-v' + (value.length > 8 ? ' is-s' : '') }, value || '—'),
          dl ? h('span', { class: 'wg-delta is-' + tone }, dir ? ic(dir) : null, dl) : null),
        spark(r.spark, tone, r.target),
        foot);
      tr.mark(art, r, i, r.label || r.k);
      grid.appendChild(art);
    });
    return { meta: '', body: grid, names: tr.names };
  }

  /* ═════════════ 6 · scorecard · CRM vs realtà ═════════════ */
  const SC = {
    good: { cls: 'good', label: 'Confermato', glyph: 'eq', ic: 'okB' },
    warn: { cls: 'warn', label: 'Parziale', glyph: 'approx', ic: 'warnB' },
    bad: { cls: 'bad', label: 'Smentito', glyph: 'neq', ic: 'badB' },
  };
  const SC_ORDER = ['good', 'warn', 'bad'];
  const scParts = (rows) => SC_ORDER.map((k) => ({ n: count(rows, (r) => (SC[r.st] ? r.st : 'warn') === k), cls: SC[k].cls, label: SC[k].label }));

  function scorecard(data, prev) {
    const rows = A(data).filter(Boolean);
    if (!rows.length) return null;
    const prevRows = A(prev).filter(Boolean);
    const tr = tracker(prevRows);
    const list = h('ul', { class: 'wg-list' });
    rows.forEach((r, i) => {
      const st = SC[r.st] || SC.warn;
      const li = h('li', { class: 'wg-row wg-c wg-sc is-' + st.cls },
        h('div', { class: 'wg-sc-l' }, ic(st.ic, 'wg-sc-ic'), h('b', null, T(r.label))),
        h('div', { class: 'wg-sc-crm' }, h('span', { class: 'wg-sr' }, 'Nel CRM: '), h('span', { class: 'wg-sc-v' }, T(r.crm) || '—')),
        h('div', { class: 'wg-sc-vs', 'aria-hidden': 'true' }, ic(st.glyph)),
        h('div', { class: 'wg-sc-real' }, h('span', { class: 'wg-sr' }, 'Nella realtà: '), h('span', { class: 'wg-sc-v' }, T(r.real) || '—')),
        h('span', { class: 'wg-sr' }, ' (' + st.label.toLowerCase() + ')'));
      tr.mark(li, r, i, r.label);
      list.appendChild(li);
    });
    const head = h('div', { class: 'wg-sc-head', 'aria-hidden': 'true' }, h('span'), h('span', null, 'Nel CRM'), h('span'), h('span', null, 'Nella realtà'));
    const ok = count(rows, (r) => r.st === 'good');
    return {
      meta: `${ok}/${rows.length} confermati`,
      body: [summary(scParts(rows), prevRows.length ? scParts(prevRows) : null), head, list],
      names: tr.names,
    };
  }

  /* ═════════════ 7 · timeline ═════════════ */
  const TL = {
    done: { cls: 'good', label: 'Fatto' },
    now: { cls: 'acc', label: 'Ora', solid: true },
    todo: { cls: 'mute', label: 'Da fare' },
    late: { cls: 'bad', label: 'In ritardo', solid: true },
  };

  function timeline(d, prev) {
    const items = A(d && d.items).filter(Boolean);
    if (!items.length) return null;
    const tr = tracker(A(prev && prev.items));
    const list = h('ol', { class: 'wg-tl' });
    items.forEach((it, i) => {
      const st = TL[it.st] || TL.todo, key = TL[it.st] ? it.st : 'todo';
      const node = h('span', { class: 'wg-node' }, key === 'done' ? ic('check') : key === 'late' ? ic('bang') : key === 'now' ? h('i') : null);
      const li = h('li', { class: 'wg-tli wg-c is-' + st.cls + ' st-' + key + (i === 0 ? ' is-first' : '') + (i === items.length - 1 ? ' is-last' : '') },
        h('time', { class: 'wg-tl-t' }, T(it.t)),
        h('span', { class: 'wg-tl-rail' }, node),
        h('div', { class: 'wg-tl-b' }, h('span', { class: 'wg-tl-l' }, T(it.label)), key === 'now' || key === 'late' ? pill(st) : null));
      tr.mark(li, it, i, it.label);
      list.appendChild(li);
    });
    const done = count(items, (it) => it.st === 'done');
    return { meta: `${done}/${items.length} tappe`, body: list, names: tr.names };
  }

  /* ═════════════ 8 · checklist ═════════════ */
  const CK = {
    done: { cls: 'good', ic: 'check', label: 'Fatto' },
    todo: { cls: 'mute', ic: null, label: 'Da fare' },
    bad: { cls: 'bad', ic: 'x', label: 'Problema' },
    warn: { cls: 'warn', ic: 'bang', label: 'Attenzione' },
  };

  function checklist(data, prev) {
    const rows = A(data).filter(Boolean);
    if (!rows.length) return null;
    const tr = tracker(prev);
    const list = h('ul', { class: 'wg-list is-tight' });
    rows.forEach((r, i) => {
      const st = CK[r.st] || CK.todo;
      const li = h('li', { class: 'wg-row wg-c wg-ck is-' + st.cls + (r.st === 'done' ? ' is-done' : '') },
        h('span', { class: 'wg-box' }, st.ic ? ic(st.ic) : null),
        h('div', { class: 'wg-ck-b' }, h('span', { class: 'wg-ck-t' }, T(r.t)), r.note ? h('span', { class: 'wg-ck-n' }, T(r.note)) : null),
        h('span', { class: 'wg-sr' }, ' (' + st.label.toLowerCase() + ')'));
      tr.mark(li, r, i, r.t);
      list.appendChild(li);
    });
    const done = count(rows, (r) => r.st === 'done');
    const ko = count(rows, (r) => r.st === 'bad' || r.st === 'warn');
    return { meta: `${done}/${rows.length}${ko ? ` · ${ko} da risolvere` : ''}`, body: list, names: tr.names };
  }

  /* ═════════════ 9 · scoreboard · barre contrapposte ═════════════ */
  const num0 = (x) => { const n = parseFloat(x); return isFinite(n) ? n : 0; };

  function pair(us, them, max, prevUs, prevThem, thick) {
    const fu = clamp01(us / max), ft = clamp01(them / max);
    const cell = (cls, f, pf) => h('div', { class: 'wg-trk is-' + cls }, meter(f, pf));
    const pu = prevUs != null ? clamp01(prevUs / max) : null, pt = prevThem != null ? clamp01(prevThem / max) : null;
    const nUs = h('b', { class: 'wg-n is-us' + (us >= them ? ' lead' : '') }, fmtN(us));
    const nTh = h('b', { class: 'wg-n is-them' + (them > us ? ' lead' : '') }, fmtN(them));
    return h('div', { class: 'wg-pair' + (thick ? ' is-thick' : '') }, nUs, cell('us', fu, pu), cell('them', ft, pt), nTh);
  }

  function scoreboard(d, prev) {
    const rows = A(d && d.rows).filter(Boolean);
    if (!rows.length) return null;
    const lab = A(d.labels).map(T);
    const L = [lab[0] || 'Noi', lab[1] || 'Rivale'];
    const tr = tracker(A(prev && prev.rows));
    const list = h('ul', { class: 'wg-list' });
    rows.forEach((r, i) => {
      const max = num0(r.max) > 0 ? num0(r.max) : 100, us = Math.max(0, num0(r.us)), them = Math.max(0, num0(r.them));
      const pr = tr.prevRow(r, i);
      const df = Math.round((us - them) * 10) / 10;
      const li = h('li', { class: 'wg-row wg-c wg-sb' },
        h('div', { class: 'wg-sb-top' },
          h('span', { class: 'wg-sb-l' }, T(r.label), h('em', null, ' / ' + fmtN(max))),
          h('span', { class: 'wg-gap ' + (df > 0 ? 'is-good' : df < 0 ? 'is-bad' : 'is-mute') }, df === 0 ? 'pari' : (df > 0 ? '+' : '−') + fmtN(Math.abs(df)))),
        pair(us, them, max, pr ? num0(pr.us) : null, pr ? num0(pr.them) : null));
      tr.mark(li, r, i, r.label);
      list.appendChild(li);
    });
    /* totale */
    const sumMax = rows.reduce((a, r) => a + (num0(r.max) > 0 ? num0(r.max) : 100), 0);
    const tt = d.total || {};
    const tUs = tt.us != null ? num0(tt.us) : rows.reduce((a, r) => a + num0(r.us), 0);
    const tTh = tt.them != null ? num0(tt.them) : rows.reduce((a, r) => a + num0(r.them), 0);
    const tMax = num0(tt.max) > 0 ? num0(tt.max) : sumMax;
    const pt = prev && prev.total ? prev.total : null;
    const df = Math.round((tUs - tTh) * 10) / 10;
    const verdict = df === 0 ? 'Parità' : `${L[0]} ${df > 0 ? 'avanti' : 'indietro'} di ${fmtN(Math.abs(df))} ${plural(Math.abs(df), 'punto', 'punti')}`;
    const total = h('div', { class: 'wg-sb-total wg-c ' + (df > 0 ? 'is-good' : df < 0 ? 'is-bad' : 'is-mute') },
      h('div', { class: 'wg-sb-big' },
        h('b', { class: 'is-us' + (tUs >= tTh ? ' lead' : '') }, fmtN(tUs)),
        h('span', { class: 'wg-lbl' }, `Totale su ${fmtN(tMax)}`),
        h('b', { class: 'is-them' + (tTh > tUs ? ' lead' : '') }, fmtN(tTh))),
      pair(tUs, tTh, tMax, pt ? num0(pt.us) : null, pt ? num0(pt.them) : null, true),
      h('p', { class: 'wg-sb-verdict' }, verdict),
      d.caption ? h('p', { class: 'wg-sb-cap' }, T(d.caption)) : null);
    if (pt && sig(pt) !== sig(d.total)) { flash(total, 'chg'); tr.names.push('Totale'); }
    const legendEl = h('div', { class: 'wg-sb-leg', 'aria-hidden': 'true' }, h('span', { class: 'is-us' }, h('i'), L[0]), h('span', { class: 'is-them' }, L[1], h('i')));
    return { meta: '', body: [legendEl, list, total], names: tr.names };
  }

  /* ───────────── registro ed esportazione ───────────── */
  const BUILD = { stakeholders, clock, termsheet, board, kpis, scorecard, timeline, checklist, scoreboard };
  UI.widgetTypes = Object.keys(BUILD);
  UI.widgetChgMs = CHG_MS;

  UI.widget = function widget(type, title, data, prevData) {
    const fn = BUILD[type];
    let r = null;
    if (fn) {
      try { r = fn(data == null ? null : data, prevData == null ? null : prevData); } catch (e) { if (g.console) g.console.error('[widget ' + type + ']', e); }
    }
    const root = r ? wrap(type, title, r.meta, r.body, r.cls) : wrap(type, title, '', empty(type), 'is-empty');
    if (r && r.names && r.names.length) root.appendChild(h('span', { class: 'wg-sr' }, 'Aggiornato: ' + r.names.join(', ') + '.'));
    return root;
  };
})(typeof window !== 'undefined' ? window : globalThis);
