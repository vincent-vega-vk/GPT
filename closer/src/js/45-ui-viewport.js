/* CLOSER · viewport soggettivo
   Disegna in SVG procedurale il punto di vista del giocatore: ambienti (9), viste (7) e persone (busti deterministici).
   Contratto (docs/SPEC-V2.md §9):  const vp = CL.ui.makeViewport();  vp.el  vp.set(state)  vp.speak(key|'you'|null)  vp.destroy()
   Nessuna immagine esterna, nessuna dipendenza oltre a CL.ui.h e CL.ui.initials. Stili in viewport.css. */
(function (g) {
  'use strict';
  const CL = g.CL, UI = CL && CL.ui;
  if (!UI) return;
  const NS = 'http://www.w3.org/2000/svg';
  const VW = 960, VH = 390;
  let SEQ = 0;

  /* ───── utilità ───── */
  const f = (n) => Math.round(n * 10) / 10;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hash = (s) => { let x = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; };
  const rng = (seed) => CL.rng(seed);
  const BGS = ['lab', 'factory', 'night', 'public', 'retail', 'clinic', 'port', 'control', 'office'];
  const VIEWS = ['call', 'meeting', 'walk', 'desk', 'phone', 'mail', 'car'];
  const OWN = { call: 1, desk: 1, phone: 1, mail: 1 };      // viste che usano la TUA postazione (office/night) come ambiente
  const VIEW_LABEL = { call: 'Videochiamata', meeting: 'Riunione', walk: 'Visita sul posto', desk: 'La tua scrivania', phone: 'Telefonata', mail: 'Email', car: 'In auto' };
  const BG_LABEL = { lab: 'laboratorio farmaceutico', factory: 'stabilimento meccanico', night: 'ufficio di sera', public: 'ufficio pubblico', retail: 'negozio di moda', clinic: 'laboratorio biotech', port: 'porto adriatico', control: 'sala di controllo', office: 'ufficio' };
  const STANCE_LABEL = { champion: 'Champion', ally: 'Alleato', neutral: 'Neutrale', skeptic: 'Scettico', hostile: 'Ostile', unknown: 'Ignoto' };

  /* deduce la vista dal testo di "where" quando il nodo non la dichiara */
  function deduceView(where) {
    const w = String(where || '').toLowerCase();
    if (/telefon|chiamata|whatsapp|\bsms\b|\bchat\b/.test(w) && !/video/.test(w)) return 'phone';
    if (/call|teams|zoom|meet\b|video|remot/.test(w)) return 'call';
    if (/e-?mail|posta|\bmail\b/.test(w)) return 'mail';
    if (/\bauto\b|in macchina|strada|autostrada|parcheggio|viaggio|tangenziale/.test(w)) return 'car';
    if (/scrivania|\bdesk\b|crm|ufficio nexora|da casa|pipeline/.test(w)) return 'desk';
    if (/stabilimento|reparto|magazzino|negozio|cantiere|\bporto\b|laborator|visita|giro|banchina|sala controllo|impianto|punto vendita/.test(w)) return 'walk';
    return 'meeting';
  }

  /* ───── primitive SVG (stringhe). Le classi k-/s-/t- sono definite in viewport.css ───── */
  const A = (o) => (o == null ? '' : ` fill-opacity="${o}"`);
  const rc = (x, y, w, h, c, o, r) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${r ? ` rx="${r}"` : ''} class="k-${c}"${A(o)}/>`;
  const ci = (x, y, r, c, o) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" class="k-${c}"${A(o)}/>`;
  const el = (x, y, rx, ry, c, o, rot) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" class="k-${c}"${A(o)}${rot ? ` transform="rotate(${rot} ${f(x)} ${f(y)})"` : ''}/>`;
  const pg = (pts, c, o) => `<polygon points="${pts.map(f).join(' ')}" class="k-${c}"${A(o)}/>`;
  const pa = (d, c, o) => `<path d="${d}" class="k-${c}"${A(o)}/>`;
  const ln = (x1, y1, x2, y2, c, w, o, cap) => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" class="s-${c}" stroke-width="${w || 1}"${o != null ? ` stroke-opacity="${o}"` : ''}${cap ? ' stroke-linecap="round"' : ''}/>`;
  const ps = (d, c, w, o, dash) => `<path d="${d}" class="s-${c}" stroke-width="${w || 1}" stroke-linecap="round" stroke-linejoin="round"${o != null ? ` stroke-opacity="${o}"` : ''}${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  const gp = (inner, tr, extra) => `<g${tr ? ` transform="${tr}"` : ''}${extra || ''}>${inner}</g>`;
  const T = (x, y, s, rot) => `translate(${f(x)} ${f(y)})${s != null && s !== 1 ? ` scale(${f(s * 100) / 100})` : ''}${rot ? ` rotate(${rot})` : ''}`;
  const fr = (x, y, w, h, ref, o, r) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${r ? ` rx="${r}"` : ''} fill="${ref}"${o != null ? ` fill-opacity="${o}"` : ''}/>`;
  const frp = (d, ref, o) => `<path d="${d}" fill="${ref}"${o != null ? ` fill-opacity="${o}"` : ''}/>`;
  const frc = (x, y, r, ref, o) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${ref}"${o != null ? ` fill-opacity="${o}"` : ''}/>`;
  const fre = (x, y, rx, ry, ref, o) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="${ref}"${o != null ? ` fill-opacity="${o}"` : ''}/>`;
  const frg = (pts, ref, o) => `<polygon points="${pts.map(f).join(' ')}" fill="${ref}"${o != null ? ` fill-opacity="${o}"` : ''}/>`;
  /* sotto-svg che ritaglia il contenuto (coordinate locali) */
  const clip = (x, y, w, h, inner) => `<svg x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" overflow="hidden">${inner}</svg>`;

  /* gradienti: ritornano [definizione, riferimento]; gli id sono unici per istanza (c.nid) */
  const stp = (s) => `<stop offset="${s[0]}" class="t-${s[1]}"${s[2] != null ? ` stop-opacity="${s[2]}"` : ''}/>`;
  function lg(c, dir, stops) {
    const id = c.nid(), d = dir === 'v' ? [0, 0, 0, 1] : dir === 'h' ? [0, 0, 1, 0] : dir;
    return [`<defs><linearGradient id="${id}" x1="${d[0]}" y1="${d[1]}" x2="${d[2]}" y2="${d[3]}">${stops.map(stp).join('')}</linearGradient></defs>`, `url(#${id})`];
  }
  function rg(c, stops, cx, cy, r) {
    const id = c.nid();
    return [`<defs><radialGradient id="${id}" cx="${cx == null ? 0.5 : cx}" cy="${cy == null ? 0.5 : cy}" r="${r == null ? 0.5 : r}">${stops.map(stp).join('')}</radialGradient></defs>`, `url(#${id})`];
  }
  /* alone di luce (ellisse con gradiente radiale) */
  function glow(c, x, y, rx, ry, tok, a) {
    const [d, u] = rg(c, [[0, tok, a == null ? 0.55 : a], [1, tok, 0]]);
    return d + fre(x, y, rx, ry, u);
  }
  /* palette scoped: tutto ciò che sta dentro usa i token dell'ambiente indicato */
  const pal = (name, inner) => `<g data-pal="${name}">${inner}</g>`;

  /* ═════════════ PERSONE ═════════════ */
  const HAIRC = ['#17151a', '#2b211b', '#43301f', '#6a4a2e', '#a67c3d', '#858a92', '#7a3c27', '#c9c9cc'];
  const FEM_EXC = /^(beatrice|alice|irene|rachele|carmen|ester|noemi|miriam|ines|elen[ae]|ginevra|nives|ruth|giorgia|sofia|gioia|isabel|mercede|ludovica)$/;
  const MAS_A = /^(luca|andrea|nicola|mattia|elia|gianluca|tommaso|jacopo|enea|saba|battista|gianbattista|mirko|gianni)$/;
  const GENERIC = /^(il|la|lo|le|i|gli|un|una|collega|cliente|team|responsabile)$/;
  function isFem(p) {
    if (p.g) return p.g === 'f';
    const txt = (p.role || '') + ' ' + (p.name || '');
    if (/trice\b|\bssa\b|dottoressa|signora|sig\.ra|dott\.ssa|presidentessa|\bdirettrice/i.test(txt)) return true;
    const first = String(p.name || p.key || '').trim().split(/\s+/)[0].toLowerCase().replace(/[^a-zàèéìòù]/g, '');
    if (!first || GENERIC.test(first)) return (hash(p.key || p.name || 'x') & 1) === 1;
    if (FEM_EXC.test(first)) return true;
    if (MAS_A.test(first)) return false;
    return /a$/.test(first);
  }
  const ACACHE = new Map();
  function attrs(p) {
    const k = (p.key || '') + '|' + (p.name || '');
    let a = ACACHE.get(k);
    if (a) return a;
    const r = rng(hash(k)), fem = isFem(p);
    a = { fem, sk: (r() * 5) | 0, hs: (r() * 4) | 0, hc: HAIRC[(r() * HAIRC.length) | 0], gl: r() < 0.4, of: (r() * 4) | 0, tilt: (r() - 0.5) * 5, beard: !fem && r() < 0.34, st: r() < 0.3, jit: (r() - 0.5) * 2 };
    if (fem && a.of === 0) a.of = 1;
    if (ACACHE.size > 300) ACACHE.clear();
    ACACHE.set(k, a);
    return a;
  }

  /* Busto: origine = base del collo, testa centrata a (0,-46). full = figura intera (altezza ≈ 342 unità, piedi a y=266) */
  const HEAD = 'M-20 -48C-20 -63 -11 -72 0 -72C11 -72 20 -63 20 -48C20 -39 17 -31 11 -25C7 -21 3.5 -19 0 -19C-3.5 -19 -7 -21 -11 -25C-17 -31 -20 -39 -20 -48Z';
  const HAIR_BACK = [
    'M-23 -60C-31 -38 -29 -4 -26 16C-20 22 -12 20 -8 14L-8 -26L8 -26L8 14C12 20 20 22 26 16C29 -4 31 -38 23 -60C19 -79 -19 -79 -23 -60Z',      // lunghi
    'M-24 -60C-28 -42 -27 -26 -22 -14C-14 -9 14 -9 22 -14C27 -26 28 -42 24 -60C19 -80 -19 -80 -24 -60Z',                                    // caschetto
    'M-20 -54C-22 -40 -19 -28 -14 -22L14 -22C19 -28 22 -40 20 -54Z',                                                                         // raccolti
    'M-27 -60C-36 -36 -33 -2 -27 20C-19 26 -11 21 -7 13L-7 -26L7 -26L7 13C11 21 19 26 27 20C33 -2 36 -36 27 -60C21 -81 -21 -81 -27 -60Z',     // mossi
  ];
  const HAIR_FRONT_F = [
    'M-21 -49C-24 -73 -5 -80 8 -77C20 -74 24 -63 21 -49C19 -57 15 -62 8 -64C-1 -60 -12 -57 -21 -49Z',
    'M-22 -50C-24 -74 -6 -81 6 -78C19 -75 25 -63 22 -50C20 -58 12 -64 0 -64C-12 -64 -20 -58 -22 -50Z',
    'M-20.5 -50C-22 -72 -8 -78 1 -78C13 -78 22 -70 20.5 -50C19 -59 12 -65 0 -65C-12 -65 -19 -59 -20.5 -50Z',
    'M-21 -49C-24 -73 -5 -80 8 -77C20 -74 24 -63 21 -49C19 -57 15 -62 8 -64C-1 -60 -12 -57 -21 -49Z',
  ];
  const LOCKS = 'M-22 -36C-27 -16 -27 6 -23 24L-12 24C-14 6 -16 -16 -18 -34Z M22 -36C27 -16 27 6 23 24L12 24C14 6 16 -16 18 -34Z';
  const HAIR_FRONT_M = [
    'M-20.5 -50C-23 -74 -9 -79 0 -79C11 -79 24 -74 20.5 -50C19 -58 14 -64.5 0 -65C-14 -64.5 -19 -58 -20.5 -50Z',
    'M-20.5 -50C-22 -78 5 -86 18 -75C24 -69 22.5 -58 20.5 -50C18 -60 8 -67 -6 -65C-12 -64 -17 -59 -20.5 -50Z',
    'M-20.5 -47C-21.5 -58 -20 -64 -16 -68C-17.5 -60 -17.5 -52 -16.5 -44Z M20.5 -47C21.5 -58 20 -64 16 -68C17.5 -60 17.5 -52 16.5 -44Z',
    null,
  ];
  const BEARD = 'M-19.5 -46C-19.5 -26 -11 -17.5 0 -17C11 -17.5 19.5 -26 19.5 -46C16 -34 9 -31.5 0 -31.5C-9 -31.5 -16 -34 -19.5 -46Z';

  function bust(p, full) {
    const a = attrs(p), len = full ? 178 : 170;
    let o = '';
    /* ombra a terra e gambe (figura intera) */
    if (full) {
      o += el(0, 268, 54, 8, 'bk', 0.22);
      o += pa('M-40 170L-3 170L-4 258L-38 258Z', 'tr') + pa('M40 170L3 170L4 258L38 258Z', 'tr');
      o += el(-21, 262, 19, 6, 'sx') + el(21, 262, 19, 6, 'sx');
    }
    /* capelli dietro */
    if (a.fem) o += pa(HAIR_BACK[a.hs], 'hr') + (a.hs === 2 ? ci(0, -80, 9, 'hr') : '');
    /* torso e abito */
    const torso = `M-8 -2C-30 0 -53 6 -61 24C-65 35 -66 70 -67 ${len}L67 ${len}C66 70 65 35 61 24C53 6 30 0 8 -2Z`;
    const of = a.of;
    if (of <= 1) {
      o += pa(torso, 'jk');
      o += of === 0 ? pa('M-9.5 -2L0 54L9.5 -2Z', 'sh') : pa('M-9.5 -2L0 46L9.5 -2Z', 'cl') + pa('M-8 -2L0 24L8 -2Z', 'sk');
      o += pa('M-9.5 -2L-31 9L-19 62L0 54Z', 'jd') + pa('M9.5 -2L31 9L19 62L0 54Z', 'jd');
      if (of === 0) {
        o += pa('M-9.5 -3.5L-18 6L-8 15L0 1Z', 'sh') + pa('M9.5 -3.5L18 6L8 15L0 1Z', 'sh');
        o += pa('M-3.2 5L3.2 5L4.6 22L0 56L-4.6 22Z', 'cb') + pa('M-3.6 2L3.6 2L3.1 9L-3.1 9Z', 'cd');
        if (!a.fem) o += pa('M-41 40L-30 38L-31 44L-42 45Z', 'cb');
      } else if (a.fem) o += ps('M-9 6C-4 16 4 16 9 6', 'hy', 1.2, 0.9);
      o += ln(0, 54, 0, len, 'jd', 1.2, 0.8);
    } else if (of === 2) {
      o += pa(torso, 'cl') + pa('M-6 -2L0 10L6 -2Z', 'sk');
      o += pa('M-9 -3L-20 7L-10 15L0 3Z', 'cb') + pa('M9 -3L20 7L10 15L0 3Z', 'cb');
      o += ln(0, 5, 0, len, 'cd', 1.4, 0.8) + ci(0, 40, 1.4, 'cd') + ci(0, 62, 1.4, 'cd') + ci(0, 84, 1.4, 'cd');
    } else {
      o += pa(torso, 'cl') + pa('M-14 -3C-11 13 11 13 14 -3Z', 'sh') + pa('M-9 -3C-6 5 6 5 9 -3Z', 'sk');
      o += ps('M-14 -3C-11 13 11 13 14 -3', 'cd', 1.6, 0.8);
      o += ln(-30, len - 8, 30, len - 8, 'cd', 1, 0.5);
    }
    o += pa(`M20 3C42 6 56 14 61 24C65 35 66 70 67 ${len}L32 ${len}Z`, 'bk', 0.1);
    o += ps(`M-52 36C-55 80 -56 130 -56 ${len}`, 'bk', 1.2, 0.16) + ps(`M52 36C55 80 56 130 56 ${len}`, 'bk', 1.2, 0.16);
    if (full) o += el(-65, len + 8, 7, 11, 'sk') + el(65, len + 8, 7, 11, 'sk');
    /* collo (sopra il colletto non: dietro) e testa */
    let hd = '';
    hd += pa('M-8 -28L-8 3L8 3L8 -28Z', 'sk') + pa('M-8 -24C-4 -14 4 -14 8 -24L8 -12C4 -6 -4 -6 -8 -12Z', 'ss', 0.55);
    hd += el(-20.4, -46, 3.4, 5.6, 'sk') + el(20.4, -46, 3.4, 5.6, 'sk');
    hd += pa(HEAD, 'sk');
    hd += pa('M2 -72C13 -72 20 -66 20 -48C20 -30 11 -20 0 -19C6 -28 7 -50 2 -72Z', 'ss', 0.38);
    if (a.beard) hd += pa(BEARD, 'hr', 0.96);
    hd += el(-8, -48, 1.9, 1.4, 'ey') + el(8, -48, 1.9, 1.4, 'ey');
    hd += ps('M-12.5 -53.5L-4.5 -54.8M4.5 -54.8L12.5 -53.5', 'hr', 1.7);
    hd += ps('M0.8 -48C2.8 -42 3.2 -39.5 0 -38.5', 'ss', 1.3, 0.9);
    hd += ps('M-5.5 -30C-2 -27.4 2 -27.4 5.5 -30', 'mo', 1.5);
    /* capelli davanti */
    if (a.fem) {
      hd += pa(HAIR_FRONT_F[a.hs], 'hr');
    } else if (a.hs === 3) {
      hd += pa('M-20.5 -50C-22 -72 -8 -78 0 -78C10 -78 22 -72 20.5 -50C19 -58 12 -63 0 -63C-12 -63 -19 -58 -20.5 -50Z', 'hr');
      [[-15, -67, 9], [-5, -74, 10], [7, -74, 10], [16, -67, 9], [-20, -57, 6.5], [20, -57, 6.5]].forEach((c) => { hd += ci(c[0], c[1], c[2], 'hr'); });
    } else {
      hd += pa(HAIR_FRONT_M[a.hs], 'hr');
      if (a.hs === 2) hd += el(-5, -67, 9, 3.6, 'hy', 0.18);
    }
    if (a.hs !== 2 || a.fem) hd += ps('M-9 -73C-1 -76 8 -74 13 -69', 'hy', 1.6, 0.45);
    if (a.gl) {
      hd += `<rect x="-17.5" y="-53.5" width="14" height="11" rx="4" class="s-ey" stroke-width="1.7"/><rect x="3.5" y="-53.5" width="14" height="11" rx="4" class="s-ey" stroke-width="1.7"/>`;
      hd += ps('M-3.5 -49.5Q0 -51 3.5 -49.5M-17.5 -50L-20.6 -49M17.5 -50L20.6 -49', 'ey', 1.5);
      hd += `<rect x="-17.5" y="-53.5" width="14" height="11" rx="4" class="k-wh" fill-opacity=".14"/><rect x="3.5" y="-53.5" width="14" height="11" rx="4" class="k-wh" fill-opacity=".14"/>`;
    }
    o += gp(hd, `rotate(${f(a.tilt)} 0 -20)`);
    if (a.fem && (a.hs === 0 || a.hs === 3)) o += pa(LOCKS, 'hr');
    return o;
  }

  /* archi sonori (visibili solo quando la persona parla) */
  const ARCS = (() => {
    const side = (s) => gp(`<path d="M30 -64C36 -57 36 -45 30 -38" class="s-ac" stroke-width="2.4" stroke-linecap="round"/><path d="M38 -71C47 -61 47 -41 38 -31" class="s-ac" stroke-width="2.4" stroke-linecap="round"/><path d="M46 -78C58 -64 58 -38 46 -24" class="s-ac" stroke-width="2.4" stroke-linecap="round"/>`, s < 0 ? 'scale(-1 1)' : '');
    return `<g class="vp-arc">${side(1)}${side(-1)}</g>`;
  })();

  /* persona completa, posizionata: (x, y) = base del collo; s = scala */
  function person(p, x, y, s, o) {
    o = o || {};
    const a = attrs(p), hue = Number.isFinite(+p.hue) ? +p.hue : hash(p.key) % 360;
    const st = `--h:${f(hue)};--sk:var(--sk${a.sk});--hr0:${a.hc}`;
    const kk = esc(p.key);
    return `<g transform="${T(x, y, s)}"><g class="vp-pp" data-k="${kk}"><g class="vp-pers" style="${st}"><g class="vp-bu">${bust(p, o.full)}</g>${o.noarc ? '' : ARCS}</g></g></g>`;
  }
  /* ritratto per tessere, schede, avatar: finestra rettangolare con il busto in primo piano */
  function portrait(p, w, h, o) {
    o = o || {};
    const sc = o.s || Math.min(h / 128, w / 150), ny = o.ny != null ? o.ny : h * 0.8;
    return `<g class="vp-pp" data-k="${esc(p.key)}"><g class="vp-pers" style="--h:${f(Number.isFinite(+p.hue) ? +p.hue : hash(p.key) % 360)};--sk:var(--sk${attrs(p).sk});--hr0:${attrs(p).hc}"><g class="vp-bu" transform="${T(w / 2, ny, sc)}">${bust(p)}</g></g></g>`;
  }

  /* ═════════════ AMBIENTI: elementi comuni ═════════════ */
  /* fila di libri / faldoni appoggiata su y (baseline) */
  function books(x, y, w, hmax, r, cols, wmin, wmax) {
    const C = cols || ['ha', 'hb', 'hc', 'ac', 'ib', 'wc', 'ia', 'da'];
    let o = '', cx = x;
    while (cx < x + w - (wmin || 6)) {
      const bw = Math.min(x + w - cx, (wmin || 6) + r() * ((wmax || 13) - (wmin || 6))), bh = hmax * (0.7 + r() * 0.3);
      o += rc(cx, y - bh, bw, bh, C[(r() * C.length) | 0]);
      if (bw > 7) o += rc(cx + 1.5, y - bh + 4, bw - 3, 2, 'wh', 0.35);
      cx += bw + 0.8;
      if (r() < 0.08) cx += 5;
    }
    return o;
  }
  function plant(x, y, s, pot) {
    let o = '';
    [[-15, -30, -34], [0, -40, 0], [15, -30, 34], [-8, -22, -16], [9, -20, 16], [-1, -26, 5]].forEach((l, i) => { o += el(l[0], l[1], 6.5, 17, i % 2 ? 'hb' : 'ha', null, l[2]); });
    o += pg([-11, -16, 11, -16, 8, 0, -8, 0], pot || 'hc') + rc(-12, -18, 24, 4, pot || 'hc', 0.8, 1.5);
    return gp(o, T(x, y, s));
  }
  function clock(x, y, r, hh, mm) {
    let o = ci(x, y, r + 3, 'da') + ci(x, y, r, 'wc');
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; o += ln(x + Math.sin(a) * (r - 2), y - Math.cos(a) * (r - 2), x + Math.sin(a) * (r - (i % 3 ? 5 : 7.5)), y - Math.cos(a) * (r - (i % 3 ? 5 : 7.5)), 'da', i % 3 ? 1 : 1.8); }
    const ah = (hh % 12 + mm / 60) * Math.PI / 6, am = mm * Math.PI / 30;
    o += ln(x, y, x + Math.sin(ah) * r * 0.5, y - Math.cos(ah) * r * 0.5, 'da', 2.4, null, 1) + ln(x, y, x + Math.sin(am) * r * 0.78, y - Math.cos(am) * r * 0.78, 'da', 1.6, null, 1) + ci(x, y, 2, 'da');
    return o;
  }
  /* skyline: edifici casuali con finestre accese in un unico path */
  function skyline(x0, x1, yb, r, o) {
    let out = '', win = '', win2 = '', x = x0;
    while (x < x1) {
      const w = o.wmin + r() * (o.wmax - o.wmin), hh = o.hmin + r() * (o.hmax - o.hmin);
      out += rc(x, yb - hh, w, hh + 2, o.c, o.o);
      if (r() < 0.25) out += rc(x + w * 0.3, yb - hh - 6, w * 0.12, 7, o.c, o.o);
      if (o.lit) {
        const cw = 3.4, ch = 4.4, gx = 3.4, gy = 4.6;
        for (let wy = yb - hh + 7; wy < yb - 8; wy += ch + gy) for (let wx = x + 4; wx < x + w - cw - 2; wx += cw + gx) {
          const q = r();
          if (q < o.pl) win += `M${f(wx)} ${f(wy)}h${cw}v${ch}h-${cw}z`; else if (q < o.pl * 1.25) win2 += `M${f(wx)} ${f(wy)}h${cw}v${ch}h-${cw}z`;
        }
      }
      x += w + (o.gap || 0);
    }
    return out + (win ? `<path d="${win}" class="k-${o.lit}"/>` : '') + (win2 ? `<path d="${win2}" class="k-gb" fill-opacity=".8"/>` : '');
  }
  /* piano della scrivania (visto dall'alto-in-avanti), y0 = bordo lontano */
  function deskTop(c, y0, cls) {
    const [d, u] = lg(c, 'v', [[0, 'bk', 0], [1, 'bk', 0.34]]);
    let o = rc(0, y0, VW, VH - y0, cls || 'ia') + d + fr(0, y0, VW, VH - y0, u) + rc(0, y0, VW, 4, 'ic') + rc(0, y0 + 4, VW, 3, 'bk', 0.12);
    [[y0 + 22, 0.2], [y0 + 41, 0.14], [y0 + 63, 0.2], [y0 + 86, 0.12]].forEach((l, i) => { o += ps(`M${i % 2 ? 40 : 0} ${f(l[0])}H${VW - (i % 2 ? 0 : 60)}`, 'ib', 1, l[1]); });
    return o;
  }
  /* parete con zoccolo e striscia a soffitto (base di molti ambienti) */
  const wallBase = (c, y1, wcls) => rc(0, 0, VW, y1, wcls || 'wa');

  /* ═════════════ AMBIENTI: elevazioni frontali ═════════════ */
  const ROOM = {};

  ROOM.office = (c) => {
    const r = rng(21);
    const [sd, su] = lg(c, 'v', [[0, 's1'], [0.6, 's2'], [1, 's3']]);
    let o = rc(0, 0, VW, 296, 'wa') + rc(0, 0, 250, 296, 'at') + rc(250, 0, 3, 296, 'wb', 0.6);
    o += rc(0, 0, VW, 14, 'ca') + rc(0, 14, VW, 2, 'wb') + rc(330, 5, 300, 4, 'la', 0.9);
    /* finestra con skyline */
    const wx = 560, wy = 40, ww = 330, wh = 204;
    o += rc(wx - 7, wy - 7, ww + 14, wh + 14, 'wc') + sd + fr(wx, wy, ww, wh, su);
    o += glow(c, wx + 250, wy + 40, 140, 60, 'la', 0.5);
    o += clip(wx, wy, ww, wh, skyline(0, ww, wh - 6, r, { hmin: 40, hmax: 110, wmin: 22, wmax: 48, c: 'da', o: 0.13, gap: 1 }) + skyline(0, ww, wh, r, { hmin: 24, hmax: 78, wmin: 24, wmax: 54, c: 'da', o: 0.26, gap: 2 }) + el(70, 40, 38, 9, 'wh', 0.75) + el(240, 62, 46, 8, 'wh', 0.6));
    o += rc(wx + ww / 3 - 2.5, wy, 5, wh, 'wc') + rc(wx + ww * 2 / 3 - 2.5, wy, 5, wh, 'wc') + rc(wx, wy + wh * 0.62, ww, 5, 'wc');
    o += rc(wx - 12, wy + wh + 7, ww + 24, 7, 'wc') + rc(wx - 12, wy + wh + 14, ww + 24, 3, 'bk', 0.12);
    o += pg([wx + 20, wy, wx + 110, wy, wx - 10, wy + wh, wx - 100, wy + wh], 'wh', 0.1);
    /* libreria a sinistra */
    o += rc(36, 70, 196, 226, 'ib') + rc(41, 75, 186, 216, 'ia');
    [[75, 4], [127, 4], [179, 4], [231, 4]].forEach((s) => { o += rc(41, s[0] + 46, 186, 5, 'ib'); });
    o += books(46, 121, 170, 38, r) + books(46, 173, 100, 36, r, ['ha', 'hb', 'hc', 'ac', 'wc']) + plant(190, 173, 0.9, 'ac');
    o += books(46, 225, 84, 36, r, ['wc', 'ic', 'ac', 'ib'], 14, 22) + rc(142, 233, 30, 28, 'wc') + rc(146, 238, 22, 4, 'ac') + rc(182, 240, 30, 21, 'hc', 0.9, 2);
    o += books(46, 277, 170, 34, r, ['da', 'ib', 'ic', 'ac', 'wb'], 10, 18);
    /* lavagna bianca */
    o += rc(290, 58, 220, 128, 'ib', null, 3) + rc(295, 63, 210, 118, 'wc', null, 2);
    o += ps('M310 88C330 76 350 100 372 86S410 76 430 90', 'ac', 3, 0.85) + ps('M310 112H452M310 128H420', 'da', 2, 0.4) + ps('M318 152C340 140 360 164 380 150', 'hb', 2.4, 0.7);
    o += rc(462, 78, 30, 28, 'hc', 0.95, 1) + rc(462, 112, 30, 28, 'la', 1, 1) + rc(462, 146, 30, 22, 'ha', 0.9, 1);
    o += rc(290, 190, 220, 5, 'ib') + rc(318, 186, 38, 4, 'ac') + rc(372, 187, 26, 3, 'da', 0.6);
    o += rc(0, 290, VW, 6, 'wb');
    return o;
  };

  ROOM.night = (c) => {
    const r = rng(33);
    const [sd, su] = lg(c, 'v', [[0, 's1'], [0.58, 's2'], [1, 's3']]);
    let o = sd + fr(0, 0, VW, 296, su);
    o += glow(c, 640, 250, 460, 120, 's3', 0.65);
    o += clip(0, 120, VW, 176, skyline(0, VW, 170, r, { hmin: 34, hmax: 96, wmin: 26, wmax: 60, c: 'da', o: 0.34, gap: 1 }));
    o += clip(0, 120, VW, 176, skyline(0, VW, 176, r, { hmin: 38, hmax: 124, wmin: 30, wmax: 78, c: 'da', o: 0.8, lit: 'la', pl: 0.3, gap: 1 }));
    /* interno: montanti, davanzale, riflessi */
    [150, 330, 510, 690, 870].forEach((x) => { o += rc(x - 3.5, 0, 7, 262, 'ia') + rc(x - 1, 0, 2, 262, 'ic', 0.35); });
    o += rc(0, 24, VW, 6, 'ia') + rc(0, 262, VW, 34, 'wb') + rc(0, 262, VW, 3, 'ic', 0.45);
    o += pg([300, 30, 400, 30, 250, 262, 150, 262], 'gb', 0.05) + pg([620, 30, 660, 30, 540, 262, 500, 262], 'gb', 0.05);
    /* postazioni vuote controluce */
    const ws = (x, y, s, lit) => gp(
      rc(-34, -2, 68, 4, 'da') + rc(-32, 2, 3, 30, 'da') + rc(29, 2, 3, 30, 'da') + rc(-19, -33, 38, 25, 'da') + rc(-3, -9, 6, 8, 'da') +
      (lit ? rc(-16, -30, 32, 19, 'hc', 0.4) + rc(-16, -30, 32, 3, 'gb', 0.35) : rc(-16, -30, 32, 19, 'ga', 0.07)) +
      pa('M-12 8C-14 -8 -10 -14 0 -14C10 -14 14 -8 12 8Z', 'da', 0.92) + rc(-2, 6, 4, 18, 'da') + rc(-12, 24, 24, 3, 'da'), T(x, y, s));
    o += ws(236, 248, 0.82) + ws(420, 252, 0.9, true) + ws(742, 250, 0.86) + ws(868, 246, 0.76, true);
    o += rc(0, 0, VW, 22, 'ca') + rc(0, 22, VW, 2, 'wb') + rc(360, 8, 140, 5, 'la', 0.75);
    /* pilastro con orologio */
    o += rc(0, 0, 138, 296, 'wa') + rc(0, 0, 138, 296, 'bk', 0.12) + rc(134, 0, 4, 296, 'wc', 0.25) + rc(0, 0, 138, 22, 'ca');
    o += clock(70, 110, 30, 6, 52) + rc(34, 170, 72, 3, 'ic', 0.4);
    /* lampada da scrivania accesa */
    o += glow(c, 596, 238, 90, 60, 'la', 0.5) + ps('M600 262L596 238L612 222', 'da', 3) + pa('M606 218L622 218L630 232L600 232Z', 'da') + el(614, 233, 17, 3.5, 'la', 0.9);
    o += rc(0, 290, VW, 6, 'wb', 0.9);
    return o;
  };

  /* ═════════════ PRIMO PIANO: etichette, mani, oggetti tuoi ═════════════ */
  /* etichetta nome+ruolo (HTML sovrapposto, posizionata in coordinate del viewBox) */
  function lbl(p, x, y, w, o) {
    o = o || {};
    const nm = String(p.name || p.key || ''), parts = nm.split(/\s+/), first = parts[0], rest = parts.slice(1).join(' ');
    const st = p.stance && STANCE_LABEL[p.stance] ? p.stance : '';
    return `<div class="vp-lb${o.bottom ? ' vp-lb--b' : ''}${o.one ? ' vp-lb--1' : ''}${o.cls ? ' ' + o.cls : ''}" data-k="${esc(p.key)}"${st ? ` data-s="${st}"` : ''} style="--x:${f(x)};--y:${f(y)};--w:${f(w)}"><span class="vp-n"><i class="vp-sd"></i><b>${esc(first)}${rest ? ` <span class="vp-n2">${esc(rest)}</span>` : ''}</b>${st ? `<em class="vp-st">${STANCE_LABEL[st]}</em>` : ''}</span>${p.role ? `<span class="vp-r">${esc(p.role)}</span>` : ''}</div>`;
  }
  /* testo diegetico (HTML) ancorato nello spazio del viewBox */
  const tx = (x, y, w, html, cls) => `<div class="vp-tx${cls ? ' ' + cls : ''}" style="--x:${f(x)};--y:${f(y)};--w:${f(w)}">${html}</div>`;

  /* mano destra vista da dietro, dita verso l'alto; origine = centro del polso. mirror = mano sinistra */
  function hand(x, y, s, rot, mirror, o) {
    o = o || {};
    let h = pa('M-25 130L-23 22Q-23 12 -13 12L13 12Q23 12 23 22L25 130Z', 'sl') + pa('M-4 24L-6 130L8 130L7 24Z', 'sd', 0.35);
    h += rc(-23.5, 4, 47, 13, 'cf', 1, 3);
    h += pa('M-17 8C-21 -8 -23 -24 -20 -40L20 -40C23 -24 21 -8 17 8Z', 'hd');
    [[-17.8, 24], [-8.2, 31], [1.4, 29], [11, 23]].forEach((fg, i) => { h += rc(fg[0], -40 - fg[1], 9.2, fg[1] + 8, 'hd', null, 4.6); if (i) h += ln(fg[0] + 0.2, -42, fg[0] + 0.2, -40 - fg[1] + 6, 'hh', 0.9, 0.7); });
    h += el(-22.5, -7, 5.4, 14, 'hd', null, -22) + pa('M-17 -2C-14 -12 -14 -24 -15 -34', 'hh', 0.35);
    h += ps('M-14 -40Q-14 -36 -10 -36M-5 -40Q-5 -36 0 -36M5 -40Q5 -36 9 -36', 'hh', 1, 0.55);
    return gp(gp(h, mirror ? 'scale(-1 1)' : ''), T(x, y, s, rot));
  }
  /* le due mani sulla tastiera (laptop) */
  const typing = (cx, y, s) => hand(cx - 112, y, s, 7, true) + hand(cx + 112, y, s, -7, false);

  /* laptop visto da chi lo usa: schermo frontale + piano tastiera in prospettiva. (x,y,w,h) = cornice esterna dello schermo */
  function laptop(c, x, y, w, h, dh) {
    dh = dh || Math.round(h * 0.23);
    const hy = y + h, ext = 18, sp = dh * 0.5, cx = x + w / 2;
    let s = el(cx, hy + dh + 8, w * 0.56, 13, 'bk', 0.2);
    s += pg([x - ext, hy - 3, x + w + ext, hy - 3, x + w + ext + sp, hy + dh, x - ext - sp, hy + dh], 'dv');
    s += pg([x - ext - sp, hy + dh, x + w + ext + sp, hy + dh, x + w + ext + sp - 3, hy + dh + 8, x - ext - sp + 3, hy + dh + 8], 'kb');
    s += pg([x - ext, hy - 3, x + w + ext, hy - 3, x + w + ext + 2, hy + 3, x - ext - 2, hy + 3], 'db', 0.45);
    const rows = 5;
    for (let i = 0; i < rows; i++) {
      const yy = hy + 8 + i * ((dh - 24) / (rows - 1)), k = i / rows;
      s += ps(`M${f(x - ext + 14 - sp * k * 0.3)} ${f(yy)}H${f(x + w + ext - 14 + sp * k * 0.3)}`, 'db', 5 + k * 1.4, 0.3, `${9 + k * 3} ${3.6 + k}`);
    }
    s += rc(cx - 52, hy + dh - 15, 104, 10, 'kb', 0.4, 3);
    s += rc(x, y, w, h, 'db', null, 14) + rc(x + 1, y + 1, w - 2, h - 2, 'bk', 0.0, 13);
    s += ci(cx, y + 6, 1.8, 'dv', 0.5);
    return { svg: s, sx: x + 12, sy: y + 14, sw: w - 24, sh: h - 26 };
  }
  /* riflesso diagonale sul vetro dello schermo */
  const sheen = (x, y, w, h) => pg([x + w * 0.55, y, x + w * 0.78, y, x + w * 0.38, y + h, x + w * 0.15, y + h], 'wh', 0.06);
  /* tazza di caffè vista dall'alto-in-avanti */
  const mug = (x, y, s, cls) => gp(el(0, 4, 17, 5.5, 'bk', 0.2) + pa('M-15 -16L15 -16L13 2Q0 8 -13 2Z', cls || 'wc') + el(0, -16, 15, 5, cls || 'wc') + el(0, -15.5, 12.5, 3.6, 'ia') + pa('M15 -12Q25 -12 24 -4Q23 2 13 0', 'wc', 0) + ps('M15 -12Q25 -12 24 -4Q23 2 13 -2', cls || 'wc', 3), T(x, y, s));
  /* telefono appoggiato (schermo acceso), ruotato */
  function phoneFlat(x, y, s, rot, lit) {
    let o = rc(-24, -46, 48, 92, 'db', null, 8) + rc(-21, -43, 42, 86, lit ? 'sf' : 'bk', null, 6);
    if (lit) o += rc(-21, -43, 42, 18, 'ac', 0.9, 6) + rc(-21, -33, 42, 8, 'ac', 0.9) + ci(0, -4, 11, 'ac', 0.25) + rc(-14, 16, 28, 5, 'li') + rc(-10, 25, 20, 5, 'li') + rc(-15, 34, 11, 5, 'bd', 0.9, 2) + rc(4, 34, 11, 5, 'go', 0.9, 2);
    return gp(el(3, 6, 28, 50, 'bk', 0.18) + o, T(x, y, s, rot));
  }

  /* ═════════════ VISTE ═════════════ */
  const VIEW = {};

  /* sfondi in miniatura per i riquadri della videochiamata (ambiente dell'interlocutore) */
  const TBG = {
    lab: (c, w, h) => rc(0, 0, w, h, 'wa') + rc(0, 0, w, h * 0.1, 'ca') + rc(w * 0.3, h * 0.03, w * 0.4, h * 0.03, 'la') + rc(0, h * 0.5, w * 0.28, 3, 'ia') + pg([w * 0.08, h * 0.5, w * 0.19, h * 0.5, w * 0.16, h * 0.4, w * 0.11, h * 0.4], 'ga') + pg([w * 0.11, h * 0.4, w * 0.16, h * 0.4, w * 0.15, h * 0.33, w * 0.12, h * 0.33], 'hc', 0.8) + rc(w * 0.76, h * 0.2, w * 0.14, h * 0.18, 'ha', null, 3) + pg([w * 0.83, h * 0.235, w * 0.865, h * 0.3, w * 0.795, h * 0.3], 'hb') + rc(0, h * 0.82, w, h * 0.18, 'ia'),
    factory: (c, w, h) => rc(0, 0, w, h, 'wb') + rc(0, 0, w, h * 0.12, 'ca') + rc(w * 0.62, h * 0.38, w * 0.36, h * 0.5, 'ia') + rc(w * 0.66, h * 0.3, w * 0.14, h * 0.1, 'ib') + rc(w * 0.7, h * 0.46, w * 0.24, h * 0.1, 'da', 0.5) + glow(c, w * 0.2, h * 0.16, w * 0.3, h * 0.26, 'la', 0.6) + pa(`M${f(w * 0.2 - 12)} ${f(h * 0.1)}L${f(w * 0.2 + 12)} ${f(h * 0.1)}L${f(w * 0.2 + 7)} ${f(h * 0.2)}L${f(w * 0.2 - 7)} ${f(h * 0.2)}Z`, 'da') + rc(0, h * 0.9, w, h * 0.1, 'ha'),
    night: (c, w, h) => { const [d, u] = lg(c, 'v', [[0, 's1'], [0.7, 's2'], [1, 's3']]); const r = rng(5 + (w | 0)); return d + fr(0, 0, w, h, u) + clip(0, 0, w, h, skyline(0, w, h * 0.78, r, { hmin: h * 0.14, hmax: h * 0.5, wmin: 16, wmax: 34, c: 'da', o: 0.8, lit: 'la', pl: 0.3 })) + rc(w * 0.48, 0, 4, h, 'ia'); },
    public: (c, w, h) => rc(0, 0, w, h, 'wa') + rc(0, h * 0.5, w, h * 0.5, 'ha', 0.85) + rc(0, h * 0.5, w, 3, 'wc') + rc(w * 0.06, h * 0.12, w * 0.26, h * 0.34, 'hb') + rc(w * 0.09, h * 0.18, w * 0.08, h * 0.12, 'wc', 0.95) + rc(w * 0.2, h * 0.2, w * 0.09, h * 0.16, 'la', 0.95) + rc(w * 0.7, h * 0.1, w * 0.22, h * 0.4, 'ia') + rc(w * 0.72, h * 0.14, w * 0.18, 2, 'ib'),
    retail: (c, w, h) => rc(0, 0, w, h, 'wa') + rc(w * 0.6, 0, w * 0.4, h, 'wb', 0.5) + ln(w * 0.54, h * 0.3, w * 1.0, h * 0.3, 'ib', 2) + [0, 1, 2, 3].map((i) => pg([w * (0.58 + i * 0.1), h * 0.3, w * (0.66 + i * 0.1), h * 0.3, w * (0.65 + i * 0.1), h * 0.62, w * (0.59 + i * 0.1), h * 0.62], ['ha', 'hb', 'hc', 'ha'][i], 0.95)).join('') + pg([w * 0.1, 0, w * 0.2, 0, w * 0.3, h, w * 0.0, h], 'la', 0.12),
    clinic: (c, w, h) => rc(0, 0, w, h, 'wa') + rc(w * 0.46, 0, 3, h, 'ib', 0.6) + rc(w * 0.08, h * 0.22, w * 0.16, h * 0.56, 'ga', 0.9, 6) + rc(w * 0.08, h * 0.5, w * 0.16, h * 0.28, 'hb', 0.65, 6) + rc(w * 0.1, h * 0.14, w * 0.12, h * 0.08, 'ib') + rc(w * 0.66, h * 0.16, w * 0.28, h * 0.22, 'da', 0.85, 3) + ps(`M${f(w * 0.68)} ${f(h * 0.34)}L${f(w * 0.76)} ${f(h * 0.26)}L${f(w * 0.82)} ${f(h * 0.3)}L${f(w * 0.92)} ${f(h * 0.2)}`, 'hb', 2),
    port: (c, w, h) => { const [d, u] = lg(c, 'v', [[0, 's1'], [0.6, 's2'], [1, 's3']]); return d + fr(0, 0, w, h, u) + rc(0, h * 0.58, w, h * 0.42, 'ga', 0.9) + pg([w * 0.62, h * 0.58, w * 0.7, h * 0.14, w * 0.74, h * 0.14, w * 0.8, h * 0.58], 'da', 0.8) + rc(w * 0.5, h * 0.14, w * 0.5, 3, 'da', 0.85) + rc(w * 0.04, h * 0.44, w * 0.2, h * 0.16, 'ia') + rc(w * 0.26, h * 0.48, w * 0.2, h * 0.12, 'ib') + rc(0, h * 0.5, w, h * 0.12, 'wh', 0.25); },
    control: (c, w, h) => rc(0, 0, w, h, 'wb') + [0, 1, 2].map((i) => rc(w * (0.04 + i * 0.32), h * 0.1, w * 0.28, h * 0.34, 'ga', null, 2) + ps(`M${f(w * (0.06 + i * 0.32))} ${f(h * 0.36)}L${f(w * (0.12 + i * 0.32))} ${f(h * 0.24)}L${f(w * (0.18 + i * 0.32))} ${f(h * 0.3)}L${f(w * (0.28 + i * 0.32))} ${f(h * 0.18)}`, i % 2 ? 'hb' : 'ha', 1.8)).join(''),
    office: (c, w, h) => { const [d, u] = lg(c, 'v', [[0, 's1'], [1, 's3']]); return rc(0, 0, w, h, 'wa') + d + fr(w * 0.58, h * 0.1, w * 0.36, h * 0.46, u) + rc(w * 0.58, h * 0.1, w * 0.36, h * 0.46, 'da', 0.1) + rc(w * 0.75, h * 0.1, 3, h * 0.46, 'wc') + plant(w * 0.12, h * 0.62, Math.max(0.5, h / 230), 'ac'); },
  };
  /* sfondo "sfocato" con un tocco di colore dalla tinta della persona */
  const tileBg = (c, bg, w, h) => pal(bg, (TBG[bg] || TBG.office)(c, w, h) + rc(0, 0, w, h, 'wa', 0.12));

  /* griglia dei riquadri nello schermo */
  function tileRects(n, ax, ay, aw, ah) {
    const g = 6;
    if (n <= 1) { const w = Math.min(aw, 440); return [[ax + (aw - w) / 2, ay, w, ah]]; }
    if (n === 2) { const w = (aw - g) / 2; return [[ax, ay, w, ah], [ax + w + g, ay, w, ah]]; }
    if (n === 3) { const w = (aw - 2 * g) / 3; return [0, 1, 2].map((i) => [ax + i * (w + g), ay, w, ah]); }
    const hh = (ah - g) / 2;
    if (n === 4) { const w = (aw - g) / 2; return [[ax, ay, w, hh], [ax + w + g, ay, w, hh], [ax, ay + hh + g, w, hh], [ax + w + g, ay + hh + g, w, hh]]; }
    const w3 = (aw - 2 * g) / 3, w2 = (aw - g) / 2;
    return [[ax, ay, w3, hh], [ax + w3 + g, ay, w3, hh], [ax + 2 * (w3 + g), ay, w3, hh], [ax, ay + hh + g, w2, hh], [ax + w2 + g, ay + hh + g, w2, hh]];
  }
  function micBadge(mx, my) {
    const glyph = rc(mx - 1.8, my - 4.8, 3.6, 6.6, 'wh', 1, 1.8) + ps(`M${f(mx - 3.7)} ${f(my + 0.4)}a3.7 3.7 0 0 0 7.4 0M${f(mx)} ${f(my + 4.1)}V${f(my + 5.6)}`, 'wh', 1.1);
    return `<g class="vp-mon"><circle class="vp-pulse s-go" cx="${f(mx)}" cy="${f(my)}" r="8" stroke-width="1.6"/>${ci(mx, my, 8.5, 'go')}${glyph}</g><g class="vp-moff">${ci(mx, my, 8.5, 'bk', 0.58)}${glyph}${ln(mx - 4.5, my - 4.8, mx + 4.5, my + 4.8, 'wh', 1.5, null, 1)}</g>`;
  }

  VIEW.call = {
    env(c) {
      const L = laptop(c, 170, 24, 620, 268, 62);
      c.scr = L;
      let o = ROOM[c.own](c) + deskTop(c, 296);
      o += mug(96, 338, 1.5, 'wc') + phoneFlat(878, 326, 1.15, 12, false);
      o += glow(c, 480, 300, 380, 60, 'wh', 0.1);
      o += L.svg + rc(L.sx, L.sy, L.sw, L.sh, 'sf', null, 5);
      /* interfaccia dell'app di videochiamata */
      o += rc(L.sx, L.sy, L.sw, 18, 'sg', null, 0) + ci(L.sx + 12, L.sy + 9, 3, 'bd') + ci(L.sx + 22, L.sy + 9, 3, 'wn') + ci(L.sx + 32, L.sy + 9, 3, 'go') + rc(L.sx + L.sw / 2 - 50, L.sy + 5, 100, 8, 'li', 0.9, 4);
      const by = L.sy + L.sh - 22;
      o += rc(L.sx, by, L.sw, 22, 'sg') + ci(L.sx + L.sw / 2 - 54, by + 11, 7, 'li') + ci(L.sx + L.sw / 2 - 28, by + 11, 7, 'li') + ci(L.sx + L.sw / 2 - 2, by + 11, 7, 'li') + rc(L.sx + L.sw / 2 + 20, by + 4, 40, 14, 'bd', null, 7) + ci(L.sx + 16, by + 11, 3, 'go');
      return pal(c.own, o);
    },
    dyn(c) {
      const L = c.scr, n = c.n;
      let ppl = '', lb = '';
      const ax = L.sx + 8, ay = L.sy + 22, aw = L.sw - 16, ah = L.sh - 22 - 22 - 8;
      if (!n) {
        ppl += rc(ax, ay, aw, ah, 'sg', null, 4) + rc(ax + 22, ay + 18, aw - 44, ah - 36, 'sf', null, 3) + rc(ax + 40, ay + 36, 180, 10, 'ac', 0.85, 3);
        for (let i = 0; i < 4; i++) ppl += rc(ax + 40, ay + 60 + i * 20, 220 - (i % 2) * 70, 6, 'li', null, 3);
        ppl += rc(ax + aw * 0.58, ay + 40, aw * 0.3, ah * 0.5, 'ac', 0.18, 4) + ps(`M${f(ax + aw * 0.6)} ${f(ay + ah * 0.62)}L${f(ax + aw * 0.68)} ${f(ay + ah * 0.46)}L${f(ax + aw * 0.75)} ${f(ay + ah * 0.54)}L${f(ax + aw * 0.85)} ${f(ay + ah * 0.34)}`, 'ac', 2.4);
      }
      tileRects(n, ax, ay, aw, ah).forEach((r, i) => {
        const p = c.people[i], x = r[0], y = r[1], w = r[2], h = r[3], a = attrs(p);
        const s = Math.min(h / 130, w / 150), ny = h * 0.16 + 80 * s;
        const inner = tileBg(c, c.bg, w, h) + gp(gp(person(p, w / 2 + a.jit * 3, ny, s, { noarc: true }), ''), '') + `<rect class="vp-dim" width="${f(w)}" height="${f(h)}"/>`;
        ppl += `<g class="vp-tl" data-k="${esc(p.key)}">${clip(x, y, w, h, inner)}<rect class="vp-ring" x="${f(x + 0.5)}" y="${f(y + 0.5)}" width="${f(w - 1)}" height="${f(h - 1)}" rx="3"/>${micBadge(x + w - 14, y + 14)}</g>`;
        lb += lbl(p, x + w / 2, y + h - 5, w - 10, { bottom: true, one: h < 130 });
      });
      return { ppl, fg: typing(480, 428, 1.5), lbl: lb };
    },
  };

  /* ═════════════ MOTORE DEL VIEWPORT ═════════════ */
  const reduced = () => !!(g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const joinNames = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1]);

  UI.makeViewport = function () {
    const h = UI.h, uid = 'vp' + (++SEQ) + '-';
    let gid = 0;
    const nid = () => uid + (++gid);
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'vp-svg');
    svg.setAttribute('viewBox', `0 0 ${VW} ${VH}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Scena');
    svg.innerHTML = '<g class="vp-g1"></g><g class="vp-g2"></g><g class="vp-g3"></g><g class="vp-g4"></g>';
    const gEnv = svg.childNodes[0], gPpl = svg.childNodes[1], gFg = svg.childNodes[2], gFx = svg.childNodes[3];
    gFx.innerHTML = `<g class="vp-you" transform="translate(480 384)"><path d="M-34 0C-28 -14 28 -14 34 0" class="s-ac" stroke-width="2.6" stroke-linecap="round"/><path d="M-58 0C-46 -24 46 -24 58 0" class="s-ac" stroke-width="2.6" stroke-linecap="round"/><path d="M-84 0C-66 -34 66 -34 84 0" class="s-ac" stroke-width="2.6" stroke-linecap="round"/></g>`;
    const lbBox = h('div', { class: 'vp-lbls' });
    const ov = h('div', { class: 'vp-ov', 'aria-hidden': 'true' }, lbBox);
    const tWhen = h('span'), tWhere = h('span');
    const t1 = h('div', { class: 'vp-tag vp-t1', hidden: '' }, tWhen, tWhere);
    const tCap = h('span');
    const t2 = h('div', { class: 'vp-tag vp-t2', hidden: '' }, h('i'), tCap);
    const tags = h('div', { class: 'vp-tags', 'aria-hidden': 'true' }, t1, t2);
    const root = h('div', { class: 'vp' }, svg, ov, tags);

    let spk = null, envKey = '', pplKey = '', first = true;
    const envCache = new Map();

    function applySpeak() {
      let has = false;
      root.classList.toggle('you', spk === 'you');
      const nodes = root.querySelectorAll('[data-k]');
      for (let i = 0; i < nodes.length; i++) {
        const on = spk != null && spk !== 'you' && nodes[i].getAttribute('data-k') === spk;
        nodes[i].classList.toggle('on', on);
        if (on) has = true;
      }
      root.classList.toggle('has-spk', has);
    }

    function set(st) {
      st = st || {};
      const th = st.theme || {};
      const bg = BGS.indexOf(th.bg) >= 0 ? th.bg : 'office';
      const view = VIEWS.indexOf(st.view) >= 0 ? st.view : deduceView(st.where);
      const people = (Array.isArray(st.people) ? st.people : []).filter((p) => p && p.key != null).slice(0, 5)
        .map((p) => ({ key: String(p.key), name: p.name || String(p.key), role: p.role || '', hue: p.hue, stance: p.stance, g: p.g }));
      const own = bg === 'night' ? 'night' : 'office';
      const amb = OWN[view] ? own : bg;

      if (th.accent) root.style.setProperty('--ac-l', th.accent); else root.style.removeProperty('--ac-l');
      if (th.accentDark) root.style.setProperty('--ac-d', th.accentDark); else root.style.removeProperty('--ac-d');
      root.setAttribute('data-bg', bg);
      root.setAttribute('data-view', view);
      root.setAttribute('data-pal', amb);

      /* overlay testuale */
      const when = st.when ? String(st.when) : '', where = st.where ? String(st.where) : '', cap = st.caption ? String(st.caption) : '';
      tWhen.innerHTML = when ? `<b>${esc(when)}</b>` : '';
      tWhen.hidden = !when;
      tWhere.textContent = where;
      tWhere.hidden = !where;
      t1.hidden = !when && !where;
      tCap.textContent = cap;
      t2.hidden = !cap;

      svg.setAttribute('aria-label', `${VIEW_LABEL[view]}${people.length ? ' con ' + joinNames(people.map((p) => p.name)) : ''} · ${BG_LABEL[bg]}`);

      const c = { nid, bg, own, amb, view, people, n: people.length, st };
      const V = VIEW[view] || VIEW.call;
      const ek = view + '|' + bg;
      const pk = people.map((p) => [p.key, p.name, p.role, p.hue, p.stance, p.g].join('~')).join('|') + '#' + (view === 'mail' || view === 'phone' || view === 'car' ? JSON.stringify([st.mail, st.caption, st.mode]) : '');
      const envChanged = ek !== envKey;
      if (envChanged) {
        let e = envCache.get(ek);
        if (!e) {
          const html = V.env(c);
          e = { html, scr: c.scr, extra: c.extra };
          if (envCache.size > 10) envCache.delete(envCache.keys().next().value);
          envCache.set(ek, e);
        }
        c.scr = e.scr; c.extra = e.extra;
        gEnv.innerHTML = e.html;
        envKey = ek;
      } else {
        const e = envCache.get(ek);
        if (e) { c.scr = e.scr; c.extra = e.extra; }
      }
      if (envChanged || pk !== pplKey) {
        const d = V.dyn(c);
        gPpl.innerHTML = d.ppl || '';
        gFg.innerHTML = d.fg || '';
        lbBox.innerHTML = d.lbl || '';
        pplKey = pk;
        applySpeak();
      }
      if (envChanged && !first && !reduced() && svg.animate) svg.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 280, easing: 'ease-out' });
      first = false;
    }

    function speak(key) {
      spk = key == null || key === '' ? null : String(key);
      applySpeak();
    }
    function destroy() {
      if (root.parentNode) root.parentNode.removeChild(root);
      envCache.clear();
      gEnv.innerHTML = gPpl.innerHTML = gFg.innerHTML = '';
      lbBox.innerHTML = '';
    }

    return { el: root, set, speak, destroy };
  };

  UI.viewportBgs = BGS.slice();
  UI.viewportViews = VIEWS.slice();
  UI.viewportDeduce = deduceView;
})(typeof window !== 'undefined' ? window : globalThis);
