/*
 * SIMSOC 6 (remake) - UI core
 * Hash router, the app shell (top bar with Continue, sidebar navigation),
 * shared components (club & player links, flags, crests, rating chips,
 * sortable tables, line charts), modals, toasts, saves and keyboard.
 * Pages live in ui-pages.js and the match day in ui-match.js.
 */
;(function () {
  'use strict';
  const E = window.SimSocEngine, D = window.SimSocData, Live = window.SimSocLive, Store = window.SimSocStore;
  const UI = window.SimUI = { pages: {}, acts: {}, S: null, route: 'title', args: [], tables: {}, slot: 'auto' };
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));
  UI.$ = $; UI.$$ = $$;

  /* ===================== formatting helpers ========================== */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => (n < 0 ? '-' : '') + '£' + Math.round(Math.abs(n)).toLocaleString('en-GB');
  function moneyShort(n) {
    const a = Math.abs(n), sg = n < 0 ? '-' : '';
    if (a >= 1e6) return sg + '£' + (a / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace(/\.?0+$/, '') + 'm';
    if (a >= 1e4) return sg + '£' + Math.round(a / 1000) + 'k';
    return sg + '£' + Math.round(a).toLocaleString('en-GB');
  }
  const pct = x => Math.round(x * 100) + '%';
  const ordinal = n => E.ordinal(n);
  UI.esc = esc; UI.money = money; UI.moneyShort = moneyShort; UI.pct = pct; UI.ordinal = ordinal;
  UI.date = (iso, long) => E.formatDate(iso, long);

  /* ===================== icons ===================================== */
  const P = d => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  const ICONS = {
    home: P('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
    inbox: P('<path d="M4 13l2-8h12l2 8"/><path d="M4 13v6h16v-6h-5l-1 2h-4l-1-2z"/>'),
    squad: P('<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2c2.9.3 5.5 2.6 5.5 5.8"/>'),
    tactics: P('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18"/><circle cx="12" cy="12" r="2.6"/><path d="M8 7l2 2M16 7l-2 2M8 17l2-2"/>'),
    fixtures: P('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M7 14h3M14 14h3M7 17h3"/>'),
    comps: P('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4M9 21h6M10 17h4"/>'),
    transfers: P('<path d="M4 8h13l-3-3M20 16H7l3 3"/>'),
    stats: P('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    finance: P('<circle cx="12" cy="12" r="9"/><path d="M15 8.5c-.6-.9-1.7-1.5-3-1.5-1.9 0-3 1-3 2.3 0 3.2 6 1.6 6 4.9 0 1.3-1.2 2.3-3 2.3-1.4 0-2.6-.6-3.2-1.6M12 5.5v13"/>'),
    board: P('<path d="M4 21V9l8-5 8 5v12"/><path d="M9 21v-7h6v7"/>'),
    career: P('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>'),
    honours: P('<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/>'),
    jobs: P('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>'),
    save: P('<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>'),
    plus: P('<path d="M12 5v14M5 12h14"/>'),
    menu: P('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    play: P('<path d="M7 5l12 7-12 7z"/>'),
    pause: P('<path d="M8 5v14M16 5v14"/>'),
    world: P('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>'),
    help: P('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 1-1 1.7M12 17h.01"/>'),
    star: P('<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/>'),
    bolt: P('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
    sub: P('<path d="M7 17V7M4 10l3-3 3 3M17 7v10M14 14l3 3 3-3"/>')
  };
  UI.icon = n => ICONS[n] || '';

  /* ===================== flags & crests ============================= */
  const FL = {
    ENG: ['cross', '#fff', '#ce1124'], SCO: ['saltire', '#005eb8', '#fff'], WAL: ['h', '#fff', '#00ab39'], NIR: ['cross', '#fff', '#c8102e'],
    IRL: ['v', '#169b62', '#fff', '#ff883e'], ITA: ['v', '#009246', '#fff', '#ce2b37'], FRA: ['v', '#0055a4', '#fff', '#ef4135'],
    GER: ['h', '#111', '#dd0000', '#ffce00'], NED: ['h', '#ae1c28', '#fff', '#21468b'], ESP: ['h', '#aa151b', '#f1bf00', '#f1bf00', '#aa151b'],
    POR: ['v', '#006600', '#ff0000', '#ff0000'], BEL: ['v', '#111', '#fdda24', '#ef3340'], TUR: ['moon', '#e30a17', '#fff'],
    GRE: ['h', '#0d5eaf', '#fff', '#0d5eaf', '#fff', '#0d5eaf'], RUS: ['h', '#fff', '#0039a6', '#d52b1e'], UKR: ['h', '#0057b7', '#ffd700'],
    ROU: ['v', '#002b7f', '#fcd116', '#ce1126'], YUG: ['h', '#0c4076', '#fff', '#c6363c'], CRO: ['h', '#ff0000', '#fff', '#171796'],
    CZE: ['tri', '#fff', '#d7141a', '#11457e'], POL: ['h', '#fff', '#dc143c'], HUN: ['h', '#ce2939', '#fff', '#477050'], SVK: ['h', '#fff', '#0b4ea2', '#ee1c25'],
    NOR: ['nordic', '#ba0c2f', '#fff', '#00205b'], DEN: ['nordic', '#c8102e', '#fff'], SWE: ['nordic', '#006aa7', '#fecc00'], FIN: ['nordic', '#fff', '#002f6c'],
    SUI: ['swiss', '#d52b1e', '#fff'], AUT: ['h', '#ed2939', '#fff', '#ed2939'], ISR: ['h', '#fff', '#0038b8', '#fff', '#fff', '#0038b8', '#fff'],
    CYP: ['plain', '#fff'], GEO: ['cross', '#fff', '#ff0000'], BUL: ['h', '#fff', '#00966e', '#d62612'], SLO: ['h', '#fff', '#005da4', '#ed1c24'],
    BRA: ['brazil', '#009c3b', '#ffdf00', '#002776'], ARG: ['h', '#74acdf', '#fff', '#74acdf'], URU: ['h', '#fff', '#0038a8', '#fff', '#0038a8', '#fff'],
    COL: ['h', '#fcd116', '#fcd116', '#003893', '#ce1126'], NGA: ['v', '#008751', '#fff', '#008751'], GHA: ['h', '#ce1126', '#fcd116', '#006b3f'],
    CMR: ['v', '#007a5e', '#ce1126', '#fcd116'], LBR: ['h', '#bf0a30', '#fff', '#bf0a30', '#fff', '#bf0a30'], AUS: ['plain', '#00008b'],
    USA: ['h', '#b22234', '#fff', '#b22234', '#fff', '#b22234', '#fff', '#b22234'], EUR: ['eu', '#003399', '#ffcc00']
  };
  function flagSvg(code) {
    const f = FL[code] || ['plain', '#555'];
    const k = f[0], c = f.slice(1);
    let b = '';
    if (k === 'v') c.forEach((col, i) => { b += '<rect x="' + (30 / c.length * i) + '" y="0" width="' + (30 / c.length + 0.3) + '" height="20" fill="' + col + '"/>'; });
    else if (k === 'h') c.forEach((col, i) => { b += '<rect x="0" y="' + (20 / c.length * i) + '" width="30" height="' + (20 / c.length + 0.3) + '" fill="' + col + '"/>'; });
    else if (k === 'cross') b = '<rect width="30" height="20" fill="' + c[0] + '"/><rect x="12.5" width="5" height="20" fill="' + c[1] + '"/><rect y="7.5" width="30" height="5" fill="' + c[1] + '"/>';
    else if (k === 'saltire') b = '<rect width="30" height="20" fill="' + c[0] + '"/><path d="M0 0L30 20M30 0L0 20" stroke="' + c[1] + '" stroke-width="3.4"/>';
    else if (k === 'nordic') b = '<rect width="30" height="20" fill="' + c[0] + '"/><rect x="8" width="5" height="20" fill="' + c[1] + '"/><rect y="7.5" width="30" height="5" fill="' + c[1] + '"/>' +
      (c[2] ? '<rect x="9.3" width="2.4" height="20" fill="' + c[2] + '"/><rect y="8.8" width="30" height="2.4" fill="' + c[2] + '"/>' : '');
    else if (k === 'swiss') b = '<rect width="30" height="20" fill="' + c[0] + '"/><rect x="13" y="4" width="4" height="12" fill="#fff"/><rect x="9" y="8" width="12" height="4" fill="#fff"/>';
    else if (k === 'moon') b = '<rect width="30" height="20" fill="' + c[0] + '"/><circle cx="12" cy="10" r="5" fill="#fff"/><circle cx="13.5" cy="10" r="4" fill="' + c[0] + '"/>';
    else if (k === 'tri') b = '<rect width="30" height="10" fill="' + c[0] + '"/><rect y="10" width="30" height="10" fill="' + c[1] + '"/><path d="M0 0L14 10L0 20z" fill="' + c[2] + '"/>';
    else if (k === 'brazil') b = '<rect width="30" height="20" fill="' + c[0] + '"/><path d="M15 2L28 10L15 18L2 10z" fill="' + c[1] + '"/><circle cx="15" cy="10" r="4.4" fill="' + c[2] + '"/>';
    else if (k === 'eu') { b = '<rect width="30" height="20" fill="' + c[0] + '"/>'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; b += '<circle cx="' + (15 + Math.cos(a) * 6).toFixed(2) + '" cy="' + (10 + Math.sin(a) * 6).toFixed(2) + '" r="0.9" fill="' + c[1] + '"/>'; } }
    else b = '<rect width="30" height="20" fill="' + c[0] + '"/>';
    return '<svg viewBox="0 0 30 20" preserveAspectRatio="none">' + b + '</svg>';
  }
  UI.flag = (code, title) => code ? '<span class="flag" title="' + esc(title || D.NATIONS[code] || code) + '">' + flagSvg(code) + '</span>' : '';
  UI.nationName = code => (code === 'EUR' ? 'Europe' : (D.NATIONS[code] || code));

  function crest(club, cls) {
    const k = club && club.kit ? club.kit : ['#555', '#999'];
    return '<span class="crest ' + (cls || '') + '" style="--c1:' + k[0] + ';--c2:' + k[1] + '"></span>';
  }
  UI.crest = crest;
  const isMine = ci => UI.S && ci === UI.S.userClub;
  UI.isMine = isMine;
  // a club name that links to its page; your own club is always red + bold
  function clubLink(ci, opts) {
    opts = opts || {};
    const S = UI.S;
    if (ci == null || ci < 0 || !S.clubs[ci]) return '<span class="muted">' + esc(opts.fallback || '—') + '</span>';
    const c = S.clubs[ci];
    return '<a class="club-link' + (isMine(ci) ? ' me' : '') + '" data-go="club/' + ci + '" title="' + esc(c.name) + '">' + (opts.crest === false ? '' : crest(c)) +
      '<span class="nm">' + esc(opts.short && c.name.length > 18 ? c.name.slice(0, 17) + '…' : c.name) + '</span></a>';
  }
  UI.clubLink = clubLink;
  UI.clubByName = (name, opts) => { const ci = E.clubIndexByName(UI.S, name); return ci >= 0 ? clubLink(ci, opts) : '<span>' + esc(name) + '</span>'; };
  UI.meName = name => (UI.S && name === E.user(UI.S).name ? '<span class="me">' + esc(name) + '</span>' : esc(name));
  function playerLink(p, opts) {
    opts = opts || {};
    const mine = UI.S && E.user(UI.S).players.some(x => x.id === p.id);
    const nm = opts.short ? p.surname : (p.forename + ' ' + p.surname);
    return '<a class="player-link' + (mine && opts.markMine ? ' me' : '') + '" data-go="player/' + p.id + '">' + (opts.flag === false ? '' : UI.flag(p.nat)) + esc(nm) + '</a>';
  }
  UI.playerLink = playerLink;
  UI.playerById = id => { const f = E.findPlayer(UI.S, id); return f ? f.p : null; };
  UI.pos = pos => '<span class="pos ' + pos + '" title="' + esc(D.POS_NAME[pos]) + '">' + pos + '</span>';
  UI.form = arr => '<span class="form">' + (arr || []).map(r => '<i class="' + r + '">' + r + '</i>').join('') + (arr && arr.length ? '' : '<span class="faint small">—</span>') + '</span>';
  UI.rating = v => {
    if (v == null || isNaN(v)) return '<span class="rt r0">–</span>';
    const c = v < 6 ? 'r1' : v < 6.8 ? 'r2' : v < 7.6 ? 'r3' : 'r4';
    return '<span class="rt ' + c + '">' + Number(v).toFixed(1) + '</span>';
  };
  UI.stars = (v100, max) => {
    const n = Math.max(0.5, Math.min(5, Math.round((v100 / 20) * 2) / 2));
    let out = '';
    for (let i = 1; i <= 5; i++) out += i <= n ? '★' : (i - 0.5 === n ? '<span style="opacity:.6">★</span>' : '<span class="off">★</span>');
    return '<span class="stars" title="' + Math.round(v100) + '/100">' + out + '</span>';
  };
  UI.potStars = p => UI.stars(Math.max(10, (p.pot - 20) / 79 * 100));
  UI.skillBar = (v, max) => '<span class="skillbar"><b>' + v + '</b><span class="bar" style="flex:1"><span style="width:' + Math.max(2, Math.min(100, v / (max || 99) * 100)) + '%"></span></span></span>';
  UI.fitBar = f => '<span class="bar fit ' + (f < 60 ? 'low' : f < 80 ? 'mid' : '') + '" title="Fitness ' + Math.round(f) + '%"><span style="width:' + Math.max(2, f) + '%"></span></span>';
  UI.tagsFor = p => {
    const t = [];
    if (p.injuredFor > 0) t.push('<span class="tag inj" title="Injured">Inj ' + p.injuredFor + '</span>');
    if (p.suspendedFor > 0) t.push('<span class="tag ban" title="Suspended">Ban ' + p.suspendedFor + '</span>');
    if (p.transferListed) t.push('<span class="tag list">Listed</span>');
    if ((p.contract || 0) <= 1 && UI.S && E.user(UI.S).players.includes(p)) t.push('<span class="tag exp" title="Contract expires this summer">Exp</span>');
    return t.join(' ');
  };
  UI.avgRating = p => (p.rN ? p.rSum / p.rN : null);
  UI.compTag = (id, name) => {
    const S = UI.S;
    if (id === 'league') return '<span class="tag lg">League</span>';
    const c = S.cups[id];
    if (c && c.nation === 'EUR') return '<span class="tag eur">' + esc(name || c.name) + '</span>';
    return '<span class="tag cup">' + esc(name || (c ? c.name : id)) + '</span>';
  };
  UI.resultChip = (gf, ga) => { const r = gf > ga ? 'W' : gf === ga ? 'D' : 'L'; return '<span class="result-chip ' + r + '">' + r + '</span>'; };

  /* ===================== sortable tables ============================ */
  // cols: [{key, label, num, sort:fn|false, html:fn(row), cls, title}]
  UI.table = function (id, cols, rows, opts) {
    opts = opts || {};
    const st = UI.tables[id] || (UI.tables[id] = { key: opts.sortKey || null, dir: opts.sortDir || -1 });
    let data = rows.slice();
    const col = cols.find(c => c.key === st.key);
    if (col && col.sort !== false) {
      const get = typeof col.sort === 'function' ? col.sort : (r => r[col.key]);
      data.sort((a, b) => { const x = get(a), y = get(b); return (x > y ? 1 : x < y ? -1 : 0) * st.dir; });
    }
    if (opts.limit && data.length > opts.limit) data = data.slice(0, opts.limit);
    let h = '<div class="tbl-wrap"' + (opts.maxHeight ? ' style="max-height:' + opts.maxHeight + 'px;overflow-y:auto"' : '') + '><table class="tbl' + (opts.compact ? ' compact' : '') + '"><thead><tr>';
    cols.forEach(c => {
      const sortable = c.sort !== false && c.key;
      h += '<th class="' + (c.num ? 'num ' : '') + (sortable ? 'sortable ' : '') + (st.key === c.key ? 'sorted' : '') + '"' +
        (sortable ? ' data-sort="' + id + '|' + c.key + '"' : '') + (c.title ? ' title="' + esc(c.title) + '"' : '') + '>' + esc(c.label || '') +
        (st.key === c.key ? (st.dir > 0 ? ' ▲' : ' ▼') : '') + '</th>';
    });
    h += '</tr></thead><tbody>';
    if (!data.length) h += '<tr><td colspan="' + cols.length + '" class="center muted" style="padding:18px">' + esc(opts.empty || 'Nothing here yet.') + '</td></tr>';
    data.forEach(r => {
      const attrs = opts.rowAttrs ? opts.rowAttrs(r) : '';
      h += '<tr ' + attrs + '>';
      cols.forEach(c => { h += '<td class="' + (c.num ? 'num ' : '') + (c.cls ? (typeof c.cls === 'function' ? c.cls(r) : c.cls) : '') + '">' + (c.html ? c.html(r) : esc(r[c.key])) + '</td>'; });
      h += '</tr>';
    });
    return h + '</tbody></table></div>';
  };

  /* ===================== line chart (single series) ================== */
  // points: [{x, y, label}] ; opts: {invert, yMin, yMax, fmt, height, color, xLabel}
  let chartSeq = 0;
  UI.lineChart = function (points, opts) {
    opts = opts || {};
    const id = 'ch' + (++chartSeq);
    if (!points.length) return '<div class="empty small">No data yet — play some matches.</div>';
    const Wd = opts.width || 600, Ht = opts.height || 180, pl = opts.width && opts.width < 420 ? 30 : 46, pr = 12, pt = 12, pb = 24;
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    const x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    let y0 = opts.yMin != null ? opts.yMin : Math.min.apply(null, ys), y1 = opts.yMax != null ? opts.yMax : Math.max.apply(null, ys);
    if (y0 === y1) { y0 -= 1; y1 += 1; }
    const sx = x => pl + (x1 === x0 ? 0.5 : (x - x0) / (x1 - x0)) * (Wd - pl - pr);
    const sy = y => { const t = (y - y0) / (y1 - y0); return opts.invert ? pt + t * (Ht - pt - pb) : Ht - pb - t * (Ht - pt - pb); };
    const col = opts.color || 'var(--accent)';
    let g = '';
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const v = y0 + (y1 - y0) * i / ticks, yy = sy(v);
      g += '<line x1="' + pl + '" x2="' + (Wd - pr) + '" y1="' + yy + '" y2="' + yy + '" stroke="#263553" stroke-width="1"/>' +
        '<text x="' + (pl - 6) + '" y="' + (yy + 4) + '" fill="#8391ad" font-size="11" text-anchor="end">' + esc(opts.fmt ? opts.fmt(v) : Math.round(v)) + '</text>';
    }
    const d = points.map((p, i) => (i ? 'L' : 'M') + sx(p.x).toFixed(1) + ' ' + sy(p.y).toFixed(1)).join(' ');
    const lastP = points[points.length - 1];
    const svg = '<svg viewBox="0 0 ' + Wd + ' ' + Ht + '" role="img" aria-label="' + esc(opts.title || 'chart') + '">' + g +
      '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + sx(lastP.x) + '" cy="' + sy(lastP.y) + '" r="4" fill="' + col + '" stroke="#162033" stroke-width="2"/>' +
      '<text x="' + pl + '" y="' + (Ht - 6) + '" fill="#5d6b88" font-size="11">' + esc(opts.xLabel || '') + '</text>' +
      '<line class="xh" x1="0" x2="0" y1="' + pt + '" y2="' + (Ht - pb) + '" stroke="#8391ad" stroke-dasharray="3 3" opacity="0"/>' +
      '<circle class="xd" r="5" fill="' + col + '" stroke="#fff" stroke-width="2" opacity="0"/>' +
      '<rect class="hit" x="' + pl + '" y="0" width="' + (Wd - pl - pr) + '" height="' + Ht + '" fill="transparent"/></svg>';
    UI._charts = UI._charts || {};
    UI._charts[id] = { pts: points.map(p => ({ x: sx(p.x), y: sy(p.y), label: p.label })), Wd: Wd };
    return '<div class="chart" data-chart="' + id + '">' + svg + '<div class="tip"></div></div>';
  };
  function chartHover(e) {
    const el = e.target.closest('.chart'); if (!el) return;
    const meta = UI._charts && UI._charts[el.dataset.chart]; if (!meta) return;
    const svg = el.querySelector('svg'), r = svg.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * meta.Wd;
    let best = meta.pts[0];
    meta.pts.forEach(p => { if (Math.abs(p.x - x) < Math.abs(best.x - x)) best = p; });
    const xh = svg.querySelector('.xh'), xd = svg.querySelector('.xd'), tip = el.querySelector('.tip');
    xh.setAttribute('x1', best.x); xh.setAttribute('x2', best.x); xh.setAttribute('opacity', '1');
    xd.setAttribute('cx', best.x); xd.setAttribute('cy', best.y); xd.setAttribute('opacity', '1');
    tip.innerHTML = best.label; tip.classList.add('on');
    tip.style.left = (best.x / meta.Wd * r.width) + 'px'; tip.style.top = (best.y / (svg.viewBox.baseVal.height) * r.height) + 'px';
  }
  function chartLeave(e) {
    const el = e.target.closest('.chart'); if (!el) return;
    el.querySelectorAll('.xh,.xd').forEach(n => n.setAttribute('opacity', '0'));
    const tip = el.querySelector('.tip'); if (tip) tip.classList.remove('on');
  }

  /* ===================== modal & toasts ============================= */
  UI.modal = function (o) {
    const root = $('#modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'backdrop';
    wrap.innerHTML = '<div class="modal ' + (o.wide ? 'wide' : '') + '" role="dialog" aria-modal="true"><div class="mh"><h3>' + esc(o.title || '') + '</h3></div>' +
      '<div class="mb">' + (o.body || '') + '</div><div class="mf"></div></div>';
    const foot = wrap.querySelector('.mf');
    const close = () => { wrap.remove(); UI._modalPrimary = null; };
    (o.buttons || [{ label: 'OK', primary: true }]).forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'btn ' + (b.cls || (b.primary ? 'primary' : ''));
      btn.textContent = b.label;
      btn.onclick = () => { const keep = b.onClick && b.onClick(wrap) === false; if (!keep) close(); };
      foot.appendChild(btn);
      if (b.primary) UI._modalPrimary = btn;
    });
    if (o.dismiss !== false) wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
    root.appendChild(wrap);
    if (o.onOpen) o.onOpen(wrap, close);
    return close;
  };
  UI.confirm = (title, text, okLabel, danger) => new Promise(res => {
    UI.modal({ title: title, body: '<p style="margin:0">' + text + '</p>',
      buttons: [{ label: 'Cancel', cls: 'ghost', onClick: () => res(false) }, { label: okLabel || 'OK', cls: danger ? 'danger' : 'primary', primary: true, onClick: () => res(true) }] });
  });
  UI.toast = function (msg, kind, ms) {
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.textContent = msg;
    $('#toasts').appendChild(t);
    while ($('#toasts').children.length > 5) $('#toasts').firstChild.remove();
    setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, ms || 4500);
  };
  UI.flushNotices = function () {
    const S = UI.S; if (!S || !S.notices) return;
    const list = S.notices.splice(0);
    const show = list.filter(n => !/^Loan interest/.test(n)).slice(-4);
    show.forEach(n => UI.toast(n, /DEBT|Knocked out|sent off|Injury|relegated/i.test(n) ? 'bad' : /Congratulations|PROMOTED|Signed|Sold/i.test(n) ? 'good' : ''));
  };

  /* ===================== saving ===================================== */
  let saveTimer = null;
  function meta() {
    const S = UI.S, c = E.user(S);
    return { club: c.name, kit: c.kit, division: E.userDiv(S).name, season: E.seasonLabel(S), date: E.currentDate(S), manager: S.manager.name };
  }
  UI.save = function (now) {
    if (!UI.S) return Promise.resolve();
    clearTimeout(saveTimer);
    const run = () => Store.save('auto', E.serialize(UI.S), meta()).catch(() => {});
    if (now) return run();
    saveTimer = setTimeout(run, 250);
    return Promise.resolve();
  };
  UI.saveTo = slot => Store.save(slot, E.serialize(UI.S), meta());
  UI.loadFrom = slot => Store.load(slot).then(raw => {
    if (!raw) throw new Error('Empty slot');
    const S = E.deserialize(raw);
    if (!E.isCompatible(S)) throw new Error('This save is from an older version of the game.');
    UI.setState(S);
    return S;
  });
  UI.setState = function (S) {
    UI.S = S;
    UI.tables = {};
    document.body.classList.remove('title-mode');
    UI.applyClubTheme();
  };
  UI.applyClubTheme = function () {
    const S = UI.S; if (!S) return;
    const k = E.user(S).kit || ['#3d8bff', '#fff'];
    const hex = k[0].replace('#', ''), v = parseInt(hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex, 16);
    const lum = ((v >> 16) * 0.299 + ((v >> 8) & 255) * 0.587 + (v & 255) * 0.114);
    // very dark / very light club colours make poor accents on a dark UI: fall back to the secondary colour or the default blue
    let c1 = k[0], c2 = k[1];
    if (lum < 80) { c1 = k[1]; c2 = k[0]; }
    if (lum > 235 && c1 === k[0]) { c1 = k[1]; c2 = k[0]; }
    document.documentElement.style.setProperty('--club', c1);
    document.documentElement.style.setProperty('--club2', c2);
  };

  /* ===================== router ===================================== */
  UI.page = (name, def) => { UI.pages[name] = def; };
  UI.go = function (route, replace) {
    const h = '#/' + route;
    if (location.hash === h) UI.render();
    else if (replace) { history.replaceState(null, '', h); UI.render(); }
    else location.hash = h;
  };
  UI.parse = function () {
    const raw = (location.hash || '').replace(/^#\/?/, '');
    const parts = raw.split('/').filter(Boolean).map(decodeURIComponent);
    return { name: parts[0] || (UI.S ? 'home' : 'title'), args: parts.slice(1) };
  };
  UI.render = function () {
    const r = UI.parse();
    if (!UI.S && ['title', 'new', 'load', 'help'].indexOf(r.name) < 0) { r.name = 'title'; r.args = []; }
    if (UI.route === 'match' && r.name !== 'match' && UI.onLeaveMatch) UI.onLeaveMatch();
    UI.route = r.name; UI.args = r.args;
    const pg = UI.pages[r.name] || UI.pages.home;
    document.body.classList.toggle('title-mode', !!pg.bare || !UI.S);
    document.body.classList.remove('nav-open');
    const view = $('#view');
    try {
      view.innerHTML = pg.render(r.args) || '';
    } catch (e) {
      console.error(e);
      view.innerHTML = '<div class="empty">Something went wrong rendering this page: ' + esc(e.message) + '</div>';
    }
    if (pg.after) { try { pg.after(view, r.args); } catch (e) { console.error(e); } }
    if (!UI.keepScroll) view.scrollTop = 0;
    UI.keepScroll = false;
    UI.renderShell();
  };
  UI.refresh = function () { UI.keepScroll = true; const st = $('#view').scrollTop; UI.render(); $('#view').scrollTop = st; };

  /* ===================== shell ====================================== */
  const NAV = [
    ['Overview', [['home', 'Home', 'home'], ['inbox', 'Inbox', 'inbox']]],
    ['Your team', [['squad', 'Squad', 'squad'], ['tactics', 'Tactics', 'tactics'], ['fixtures', 'Fixtures & Results', 'fixtures']]],
    ['Football world', [['competitions', 'Competitions', 'comps'], ['transfers', 'Transfers', 'transfers'], ['stats', 'Statistics', 'stats']]],
    ['Club', [['finances', 'Finances', 'finance'], ['board', 'Board & Objectives', 'board']]],
    ['Manager', [['career', 'My Career', 'career'], ['honours', 'Hall of Fame', 'honours'], ['jobs', 'Job Centre', 'jobs']]],
    ['Game', [['saves', 'Save / Load', 'save'], ['help', 'How to play', 'help']]]
  ];
  const NAV_GROUP = { player: 'squad', club: 'competitions', league: 'competitions', cup: 'competitions', match: 'home', roundup: 'home', review: 'career', inbox: 'inbox' };
  UI.renderShell = function () {
    const S = UI.S;
    if (!S) return;
    const active = NAV_GROUP[UI.route] || UI.route;
    const unread = E.unreadCount(S);
    $('#sidebar').innerHTML = NAV.map(g => '<div class="nav-sec">' + g[0] + '</div>' + g[1].map(it =>
      '<a class="nav-item' + (active === it[0] ? ' active' : '') + '" data-go="' + it[0] + '">' + UI.icon(it[2]) + '<span>' + it[1] + '</span>' +
      (it[0] === 'inbox' && unread ? '<span class="badge red">' + unread + '</span>' : '') +
      (it[0] === 'jobs' && S.sacked ? '<span class="badge amber">!</span>' : '') + '</a>').join('')).join('');
    const c = E.user(S), dv = E.userDiv(S);
    const pos = E.leaguePosition(S, c.name);
    $('#tb-club').innerHTML = crest(c) + '<div style="min-width:0"><div class="tb-name me">' + esc(c.name) + '</div><div class="tb-sub">' +
      UI.flag(dv.nation) + ' ' + esc(dv.name) + ' · ' + ordinal(pos) + '</div></div>';
    $('#tb-club').setAttribute('data-go', 'club/' + S.userClub);
    $('#tb-date').innerHTML = '<b>' + esc(E.formatDate(E.currentDate(S))) + '</b><span>Season ' + E.seasonLabel(S) + '</span>';
    const bal = c.balance;
    $('#tb-money').textContent = moneyShort(bal);
    $('#tb-money').classList.toggle('neg', bal < 0);
    $('#tb-money').title = 'Bank balance: ' + money(bal) + (S.debt ? ' · loan ' + money(S.debt) : '');
    $('#tb-inbox').innerHTML = UI.icon('inbox') + (unread ? '<span class="count">' + unread + '</span>' : '');
    const btn = $('#btn-continue');
    const lbl = UI.continueLabel();
    btn.innerHTML = esc(lbl.text) + '<kbd>Space</kbd>';
    btn.classList.toggle('match', !!lbl.match);
    btn.disabled = !!lbl.disabled;
  };
  // what "Continue" does from here
  UI.continueLabel = function () {
    const S = UI.S;
    if (UI.route === 'match' && UI.matchCtl) return UI.matchCtl.label();
    if (S.sacked) return { text: 'Find a job', match: false };
    if (S.pendingReview && UI.route !== 'review') return { text: 'Season review', match: false };
    if (UI.route === 'roundup') return { text: 'Continue', match: false };
    return { text: 'Continue', match: E.nextOpponent(S) != null && isUserDayNow() };
  };
  function isUserDayNow() {
    const S = UI.S, opp = E.nextOpponent(S);
    return !!opp;
  }
  UI.advance = function () {
    const S = UI.S;
    if (!S) return;
    if (UI.route === 'match' && UI.matchCtl) return UI.matchCtl.primary();
    if (S.sacked) { UI.go('jobs'); return; }
    if (S.pendingReview && UI.route !== 'review') { UI.go('review'); return; }
    if (UI.route === 'review') { S.pendingReview = null; UI.save(); }
    if (UI.route === 'roundup') { UI.go('home'); return; }
    const season = S.season;
    E.prepareNextUserMatch(S);
    UI.flushNotices();
    UI.save();
    if (S.pendingReview && S.season !== season) { UI.go('review'); return; }
    if (E.nextOpponent(S)) UI.go('match');
    else UI.go('home');
  };

  /* ===================== events ===================================== */
  function onClick(e) {
    const t = e.target;
    const sort = t.closest('[data-sort]');
    if (sort) {
      const [id, key] = sort.dataset.sort.split('|');
      const st = UI.tables[id] || (UI.tables[id] = { key: null, dir: -1 });
      if (st.key === key) st.dir = -st.dir; else { st.key = key; st.dir = -1; }
      UI.refresh(); return;
    }
    const act = t.closest('[data-act]');
    if (act && UI.acts[act.dataset.act]) { e.preventDefault(); UI.acts[act.dataset.act](act, e); return; }
    const go = t.closest('[data-go]');
    if (go) { e.preventDefault(); UI.go(go.dataset.go); return; }
  }
  function onKey(e) {
    const tag = (e.target && e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    if (e.code === 'Space' || e.key === ' ') {
      if (tag === 'button') return;                         // a focused button handles space itself
      e.preventDefault();
      if (UI._modalPrimary) { UI._modalPrimary.click(); return; }
      if (!UI.S) { const b = $('[data-primary]'); if (b) b.click(); return; }
      UI.advance();
    } else if (e.key === 'Escape') {
      const bd = $('#modal-root .backdrop'); if (bd) bd.remove();
      UI._modalPrimary = null;
    }
  }

  /* ===================== boot ======================================= */
  UI.startCareer = function (seed, clubIndex, opts) {
    const S = E.newGame(seed, clubIndex, opts);
    UI.setState(S);
    UI.save(true);
    return S;
  };
  function boot() {
    $('#nav-toggle').innerHTML = UI.icon('menu');
    $('#nav-toggle').onclick = () => document.body.classList.toggle('nav-open');
    $('#scrim').onclick = () => document.body.classList.remove('nav-open');
    $('#btn-continue').onclick = () => UI.advance();
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousemove', e => { if (e.target.closest && e.target.closest('.chart')) chartHover(e); });
    document.addEventListener('mouseout', e => { if (e.target.closest && e.target.closest('.chart') && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.chart'))) chartLeave(e); });
    window.addEventListener('hashchange', UI.render);
    const q = new URLSearchParams(location.search);
    const seed = q.has('seed') ? (parseInt(q.get('seed'), 10) >>> 0) : ((Math.random() * 1e9) >>> 0);
    if (q.has('club')) {                                   // automation / power-user shortcut: straight into a career
      UI.startCareer(seed, parseInt(q.get('club'), 10) || 0, { difficulty: q.get('diff') || 'normal', managerName: q.get('name') || 'The Gaffer' });
      UI.go(q.get('route') || 'home', true);
      return;
    }
    if (q.has('fresh')) { UI.newSeed = seed; UI.go('new', true); return; }
    UI.newSeed = seed;
    Store.meta('auto').then(m => { UI.autoMeta = m; UI.render(); }).catch(() => UI.render());
  }

  /* ---- automation hook (screenshots & play-tests) ------------------- */
  window.SIMSOC_TEST = {
    advance(n) {
      const S = UI.S;
      for (let i = 0; i < n; i++) {
        if (S.sacked) { E.chooseClub(S, E.eligibleClubs(S, S.reputation)[0]); continue; }
        E.prepareNextUserMatch(S);
        const m = E.playUserMatch(S);
        if (!m) break;
        E.commitUserResult(S, m);
      }
      S.notices.length = 0;
      UI.save(); UI.render();
    },
    state() { return UI.S; },
    go(r) { UI.go(r); },
    save() { return UI.save(true); }
  };

  document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0));
})();
