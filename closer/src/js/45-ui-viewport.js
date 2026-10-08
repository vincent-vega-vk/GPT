/* CLOSER · viewport soggettivo (SPEC-V2 §9)
   Disegna in SVG procedurale il punto di vista del giocatore, in prima persona: nove ambienti, sette viste e persone
   (busti deterministici da key+hue). Nessuna immagine esterna; dipende solo da CL.ui.h. Stili in viewport.css.

     const vp = CL.ui.makeViewport();        // → { el, set(state), speak(key | 'you' | null), destroy() }
     container.appendChild(vp.el);
     vp.set({ theme: { bg, accent, accentDark }, view, people: [{ key, name, role, hue, stance }], when, where, caption });
     vp.speak('elisa');                      // evidenzia chi parla senza ridisegnare la scena; 'you' = parli tu

   bg:    lab · factory · night · public · retail · clinic · port · control · office
   view:  call · meeting · walk · desk · phone · mail · car   (se assente si deduce da "where")
   Le viste call, desk, phone e mail usano la TUA postazione (office, o night per lo sfondo night) come ambiente e mostrano
   l'ambiente dell'interlocutore nei riquadri; meeting, walk e car usano lo sfondo del tema.
   Campi facoltativi: people[].g ('f'|'m', altrimenti dedotto dal nome), state.mail { from, subj } (vista mail),
   state.mode ('chat'|'call', vista phone). Massimo 5 persone. Rispetta prefers-reduced-motion e il tema chiaro/scuro. */
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
    const pickW = (w, v) => { let i = 0, t = v * w.reduce((s, x) => s + x, 0); while (i < w.length - 1 && t >= w[i]) { t -= w[i]; i++; } return i; };
    a = { fem, sk: (r() * 5) | 0, hs: fem ? (r() * 4) | 0 : pickW([34, 30, 11, 25], r()), hc: HAIRC[pickW([17, 20, 20, 14, 7, 8, 8, 6], r())], gl: r() < 0.4, of: (r() * 4) | 0, tilt: (r() - 0.5) * 5, beard: !fem && r() < 0.34, st: r() < 0.3, jit: (r() - 0.5) * 2 };
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

  let TG = '';   /* prefisso id dell'istanza corrente (gradiente di volume dei vestiti) */
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
    o += pa(`M20 3C42 6 56 14 61 24C65 35 66 70 67 ${len}L32 ${len}Z`, 'bk', 0.1) + frp(torso, `url(#${TG}tg)`);
    o += ps(`M-52 36C-55 80 -56 130 -56 ${len}`, 'bk', 1.2, 0.16) + ps(`M52 36C55 80 56 130 56 ${len}`, 'bk', 1.2, 0.16);
    if (full) o += el(-65, len + 8, 7, 11, 'sk') + el(65, len + 8, 7, 11, 'sk');
    /* collo (sopra il colletto non: dietro) e testa */
    let hd = '';
    hd += pa('M-8.6 -28L-8.6 3L8.6 3L8.6 -28Z', 'sk') + pa('M-8.6 -24C-4 -14 4 -14 8.6 -24L8.6 -12C4 -6 -4 -6 -8.6 -12Z', 'ss', 0.55);
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
    o += gp(hd, `translate(0 5) rotate(${f(a.tilt)} 0 -20)`);
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
    const a = attrs(p), sc = o.s || Math.min(h / 128, w / 150), ny = o.ny != null ? o.ny : h * 0.8;
    const hue = Number.isFinite(+p.hue) ? +p.hue : hash(p.key) % 360;
    return `<g transform="${T(w / 2, ny, sc)}"><g class="vp-pp" data-k="${esc(p.key)}"><g class="vp-pers" style="--h:${f(hue)};--sk:var(--sk${a.sk});--hr0:${a.hc}"><g class="vp-bu">${bust(p)}</g></g></g></g>`;
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

  /* ═════════════ AMBIENTI: laboratorio, stabilimento, ufficio pubblico ═════════════ */
  const rep = (n, fn) => { let s = ''; for (let i = 0; i < n; i++) s += fn(i); return s; };
  /* vetreria da laboratorio, base a (x,y) */
  const erlen = (x, y, h, liq) => { const w = h * 0.62; return pg([x - w / 2, y, x + w / 2, y, x + w * 0.12, y - h * 0.55, x + w * 0.12, y - h, x - w * 0.12, y - h, x - w * 0.12, y - h * 0.55], 'ga', 0.85) + (liq ? pg([x - w * 0.46, y - 0.5, x + w * 0.46, y - 0.5, x + w * 0.26, y - h * 0.32, x - w * 0.26, y - h * 0.32], liq, 0.9) : '') + rc(x - w * 0.16, y - h - 2, w * 0.32, 3, 'gb') + ln(x - w * 0.34, y - h * 0.28, x - w * 0.18, y - h * 0.5, 'wh', 1.2, 0.7, 1); };
  const beaker = (x, y, w, h, liq) => rc(x - w / 2, y - h, w, h, 'ga', 0.8, 2) + (liq ? rc(x - w / 2 + 1, y - h * 0.58, w - 2, h * 0.58 - 0.5, liq, 0.9, 1.5) : '') + ln(x - w / 2 + 3, y - h + 4, x - w / 2 + 3, y - 5, 'wh', 1.2, 0.7, 1) + rc(x - w / 2 - 1, y - h - 1, w + 2, 2, 'gb');
  const rflask = (x, y, r, liq) => ci(x, y - r, r, 'ga', 0.85) + (liq ? pa(`M${f(x - r * 0.92)} ${f(y - r * 0.7)}A${r} ${r} 0 0 0 ${f(x + r * 0.92)} ${f(y - r * 0.7)}Z`, liq, 0.9) : '') + rc(x - r * 0.22, y - r * 2 - r * 0.8, r * 0.44, r * 0.9, 'ga', 0.85) + rc(x - r * 0.3, y - r * 2 - r * 0.88, r * 0.6, 3, 'gb');
  const cylinder = (x, y, w, h, liq) => rc(x - w / 2, y - h, w, h, 'ga', 0.8, 1.5) + (liq ? rc(x - w / 2 + 1, y - h * 0.5, w - 2, h * 0.5 - 0.5, liq, 0.9) : '') + rc(x - w, y - 2, w * 2, 3, 'gb', 0.9, 1) + ln(x - w / 2 + 2, y - h + 3, x - w / 2 + 2, y - 4, 'wh', 1, 0.6, 1);
  const hazard = (x, y, s) => gp(rc(-22, -22, 44, 44, 'ha', null, 7) + pa('M0 -13L13 10H-13Z', 'hb') + pa('M0 -8.5L8.6 6.5H-8.6Z', 'ha') + rc(-1.4, -4, 2.8, 6.4, 'hb', null, 1) + ci(0, 4.2, 1.5, 'hb'), T(x, y, s));
  /* cifra a sette segmenti */
  function seg7(x, y, s, d, cls) {
    const S = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' }[d] || '';
    const P = { a: [3, 0, 10, 3], b: [13, 3, 3, 10], c: [13, 15, 3, 10], d: [3, 25, 10, 3], e: [0, 15, 3, 10], f: [0, 3, 3, 10], g: [3, 12.5, 10, 3] };
    return gp(S.split('').map((k) => rc(P[k][0], P[k][1], P[k][2], P[k][3], cls, null, 1.2)).join(''), T(x, y, s));
  }

  ROOM.lab = (c) => {
    let o = rc(0, 0, VW, 296, 'wa');
    o += rep(15, (i) => rc(i * 64 + 30, 29, 1, 267, 'wb', 0.55));
    o += rc(0, 0, VW, 26, 'ca') + rc(0, 26, VW, 3, 'wb');
    [[60, 210], [375, 210], [690, 210]].forEach((l) => { o += glow(c, l[0] + l[1] / 2, 38, l[1] * 0.62, 42, 'lb', 0.55) + rc(l[0], 8, l[1], 9, 'la') + rc(l[0], 17, l[1], 2, 'wb'); });
    o += rc(0, 124, VW, 7, 'ac', 0.9) + rc(0, 131, VW, 2, 'wh', 0.5);
    /* pensili con vetrinetta */
    o += rc(26, 50, 288, 70, 'ib', null, 3);
    [0, 1, 2, 3].forEach((i) => {
      const x = 30 + i * 70.5; o += rc(x, 54, 67, 62, i % 2 ? 'ia' : 'ga', i % 2 ? 1 : 0.55, 2) + rc(x + 1, 55, 65, 60, 'bk', 0, 2);
      if (i % 2) o += rc(x + 28, 82, 11, 3, 'ic', null, 1.5); else o += rc(x + 6, 84, 55, 2.4, 'ib', 0.7) + rc(x + 8, 70, 7, 14, 'hc', 0.8, 1) + rc(x + 18, 66, 8, 18, 'ha', 0.8, 1) + rc(x + 29, 72, 7, 12, 'ga', 1, 1) + rc(x + 40, 68, 9, 16, 'hc', 0.65, 1) + rc(x + 52, 74, 6, 10, 'ib', 0.8, 1);
    });
    /* vetrata verso il corridoio e porta con segnaletica */
    o += rc(578, 44, 304, 150, 'ib', null, 3) + rc(584, 50, 292, 138, 'ga', 0.75, 2) + rc(584, 50, 292, 138, 'wc', 0.45, 2) + rc(724, 50, 4, 138, 'ib') + pg([600, 50, 650, 50, 612, 188, 584, 188], 'wh', 0.14);
    o += rc(740, 70, 54, 118, 'wc', 0.7, 2) + rc(748, 126, 6, 14, 'ic', null, 2) + hazard(654, 98, 1);
    o += rc(578, 180, 304, 9, 'ha') + rep(12, (i) => pg([584 + i * 26, 189, 596 + i * 26, 180, 610 + i * 26, 180, 598 + i * 26, 189], 'hb', 0.9));
    /* bancone in acciaio */
    o += rc(0, 218, VW, 78, 'ib') + rep(12, (i) => rc(i * 80 + 4, 222, 74, 66, 'ia', null, 2) + rc(i * 80 + 30, 232, 22, 3, 'ic', null, 1.5)) + rc(0, 288, VW, 8, 'da', 0.85);
    o += rc(0, 206, VW, 12, 'ic') + rc(0, 206, VW, 2.5, 'wh', 0.6) + rc(0, 218, VW, 3, 'bk', 0.12);
    /* vetreria e strumenti: sinistra */
    o += erlen(66, 206, 46, 'hc') + rflask(104, 206, 15, 'ha') + beaker(146, 206, 24, 34, 'hc') + cylinder(180, 206, 11, 50, 'ha') + erlen(212, 206, 38, null) + beaker(246, 206, 20, 26, 'ga');
    o += rc(274, 190, 36, 16, 'ia', null, 2) + rc(278, 176, 28, 14, 'da', null, 2) + rc(281, 180, 22, 6, 'ha', 0.9, 1);
    /* bilancia analitica */
    o += gp(rc(-30, -16, 60, 16, 'ia', null, 3) + rc(-24, -50, 48, 34, 'ga', 0.55, 3) + rc(-24, -50, 48, 34, 'ib', 0, 3) + ps('M-24 -50H24V-16H-24Z', 'ib', 1.6) + rc(-10, -24, 20, 4, 'ic', null, 2) + rc(-20, -12, 18, 7, 'da', null, 1.5) + rc(-18, -10.5, 6, 4, 'la', 0.9) + rc(-9, -10.5, 2, 4, 'la', 0.9) + rc(-5, -10.5, 6, 4, 'la', 0.9), T(372, 206));
    o += rc(420, 168, 78, 38, 'ia', null, 3) + rc(426, 174, 44, 26, 'da', null, 2) + ps('M430 192L440 184L450 190L462 178', 'hc', 1.8) + ci(482, 182, 3.5, 'ha') + ci(482, 193, 3.5, 'hb') + rc(404, 154, 70, 3, 'ic');
    /* cappa chimica */
    o += rc(630, 80, 190, 126, 'ia', null, 3) + rc(636, 92, 178, 100, 'ga', 0.6, 2) + rc(636, 92, 178, 100, 'wh', 0.18, 2) + pg([656, 92, 700, 92, 666, 192, 636, 192], 'wh', 0.22) + rc(630, 80, 190, 8, 'ib') + rc(636, 192, 178, 5, 'ic') + rc(660, 52, 44, 30, 'ib') + rc(668, 36, 28, 18, 'ia');
    o += rflask(700, 190, 12, 'hc') + beaker(742, 190, 22, 28, 'ha') + erlen(776, 190, 30, 'hb') + rc(724, 144, 52, 4, 'ib', 0.5);
    o += rep(2, (i) => ci(826 + i * 14, 120, 5, i ? 'ha' : 'hc')) + hazard(872, 112, 0.72);
    /* pavimento in resina */
    const [d, u] = lg(c, 'v', [[0, 'fc'], [1, 'fa']]);
    o += rc(0, 296, VW, 94, 'fa') + d + fr(0, 296, VW, 94, u) + rc(0, 296, VW, 3, 'fb', 0.6);
    [90, 300, 560, 790].forEach((x) => { o += rc(x, 296, 14, 94, 'la', 0.07); });
    o += ln(0, 330, VW, 330, 'fb', 1, 0.35) + ln(0, 372, VW, 372, 'fb', 1, 0.3);
    return o;
  };

  ROOM.factory = (c) => {
    const r = rng(52);
    let o = rc(0, 0, VW, 296, 'wa');
    /* tetto, capriate, lucernari */
    o += rc(0, 0, VW, 20, 'ca') + rep(5, (i) => rc(i * 200 + 30, 2, 140, 11, 'gb', 0.85));
    o += rc(0, 62, VW, 6, 'hb') + rc(0, 16, VW, 4, 'hb');
    o += ps('M0 66' + rep(17, (i) => `L${i * 60 + 30} 20L${i * 60 + 60} 66`), 'hb', 3.4, 0.9);
    o += rc(0, 68, VW, 3, 'bk', 0.12);
    /* fascio di luce dai lucernari */
    [[60, 150], [260, 150], [460, 150], [660, 150], [860, 150]].forEach((s, i) => { o += pg([s[0], 14, s[0] + 110, 14, s[0] + 220 + i * 6, 300, s[0] + 60 + i * 6, 300], 'la', 0.07); });
    /* parete: fascia di finestre e pannelli */
    o += rc(0, 72, VW, 62, 'ga', 0.8) + rep(16, (i) => rc(i * 62 + 6, 72, 4, 62, 'hb', 0.85)) + rc(0, 104, VW, 3, 'hb', 0.7) + pg([60, 72, 150, 72, 110, 134, 20, 134], 'wh', 0.12) + pg([520, 72, 610, 72, 570, 134, 480, 134], 'wh', 0.12);
    o += rc(0, 134, VW, 5, 'hb', 0.9) + rep(24, (i) => rc(i * 40, 139, 1, 157, 'wb', 0.6));
    o += rc(0, 168, VW, 2, 'wb', 0.8) + rc(0, 176, VW, 5, 'ia', 0.85) + rc(0, 176, VW, 1.6, 'ic', 0.7) + rep(10, (i) => rc(i * 100 + 18, 170, 5, 16, 'ib'));
    /* quadro elettrico e segnaletica */
    o += rc(868, 190, 62, 84, 'ib', null, 3) + rc(874, 196, 50, 72, 'ia', null, 2) + pg([899, 208, 914, 236, 884, 236], 'ha') + rc(897, 217, 4, 9, 'hb') + ci(899, 231, 1.8, 'hb');
    /* lampade a campana color ambra */
    [[140, 78], [372, 84], [612, 80], [836, 86]].forEach((l) => { o += glow(c, l[0], l[1] + 44, 94, 64, 'lb', 0.5) + ln(l[0], 66, l[0], l[1], 'hb', 1.6) + pg([l[0] - 7, l[1], l[0] + 7, l[1], l[0] + 28, l[1] + 28, l[0] - 28, l[1] + 28], 'da') + rc(l[0] - 28, l[1] + 27, 56, 3, 'ha') + el(l[0], l[1] + 31, 22, 4.5, 'la') + glow(c, l[0], l[1] + 32, 26, 16, 'la', 0.9); });
    /* tornio (sinistra) */
    o += rc(36, 236, 296, 24, 'ib', null, 3) + rc(44, 260, 28, 36, 'ia') + rc(296, 260, 28, 36, 'ia') + rc(40, 258, 284, 6, 'da', 0.6);
    o += rc(40, 190, 86, 70, 'ia', null, 4) + rc(46, 196, 74, 12, 'ic', 0.7, 2) + rc(46, 214, 52, 36, 'ib', 0.55, 3) + rc(104, 214, 12, 30, 'hc', 0.95, 2) + ci(126, 238, 26, 'ib') + ci(126, 238, 20, 'da') + ci(126, 238, 7, 'ic') + rep(3, (i) => rc(124, 238, 5, 28, 'ic', null, 1.5).replace('<rect', `<rect transform="rotate(${i * 120} 126 238)"`));
    o += pg([128, 206, 232, 206, 238, 238, 128, 244], 'ga', 0.4) + ps('M128 206L232 206L238 238', 'ha', 3) + rc(186, 226, 34, 12, 'ib', null, 2) + rc(196, 214, 14, 14, 'ia', null, 2) + rc(262, 214, 42, 34, 'ia', null, 3) + rc(272, 226, 22, 3, 'ic') + ln(130, 242, 262, 242, 'ic', 3.5, 0.8, 1);
    /* fresatrice (destra) */
    o += rc(662, 262, 228, 12, 'ib', null, 2) + rc(718, 274, 88, 22, 'ia') + rc(700, 110, 56, 156, 'ia', null, 3) + rc(706, 116, 10, 144, 'ic', 0.45, 2) + rc(640, 86, 166, 62, 'ia', null, 5) + rc(646, 92, 154, 8, 'ic', 0.6, 3) + rc(756, 148, 14, 54, 'da') + pg([746, 200, 780, 200, 764, 226], 'ic') + rc(698, 236, 140, 20, 'ib', null, 3) + rc(712, 244, 112, 3, 'da', 0.5);
    o += rc(836, 140, 56, 82, 'da', null, 4) + rc(842, 148, 44, 28, 'ga', null, 2) + ps('M846 168L853 158L860 164L868 154L880 162', 'ha', 1.6) + rc(844, 184, 40, 4, 'ha', 0.8, 2) + rep(4, (i) => ci(848 + i * 10, 200, 2.6, i % 2 ? 'hb' : 'ha'));
    /* scaffale con cassette azzurre */
    o += ln(414, 150, 414, 296, 'ib', 3) + ln(536, 150, 536, 296, 'ib', 3) + rep(4, (i) => rc(414, 188 + i * 36, 122, 4, 'ib')) + rep(4, (i) => rep(3, (j) => rc(420 + j * 38, 154 + i * 36, 32, 30, (i + j) % 3 ? 'ic' : 'hc', 0.95, 2) + rc(426 + j * 38, 161 + i * 36, 20, 4, 'ib', 0.55, 1)));
    /* pavimento in cemento con strisce gialle */
    const [d, u] = lg(c, 'v', [[0, 'fc'], [1, 'fa']]);
    o += rc(0, 296, VW, 94, 'fa') + d + fr(0, 296, VW, 94, u) + rc(0, 296, VW, 3, 'fb', 0.7);
    o += rc(14, 302, 340, 7, 'ha') + rc(630, 302, 316, 7, 'ha') + rep(14, (i) => pg([20 + i * 24, 309, 32 + i * 24, 302, 44 + i * 24, 302, 32 + i * 24, 309], 'hb', 0.85));
    o += rc(0, 356, VW, 6, 'ha', 0.9) + ln(0, 336, VW, 336, 'fb', 1, 0.3);
    /* polvere nella luce */
    o += rep(34, () => ci(60 + r() * 840, 40 + r() * 250, 0.8 + r() * 1.2, 'la', 0.25 + r() * 0.5));
    return o;
  };

  ROOM.public = (c) => {
    const r = rng(63);
    let o = rc(0, 0, VW, 296, 'wa');
    o += rc(0, 148, VW, 148, 'ha', 0.9) + rc(0, 146, VW, 6, 'wc') + rc(0, 152, VW, 3, 'bk', 0.1);
    o += rc(0, 0, VW, 22, 'ca') + rc(0, 22, VW, 3, 'wb');
    [[130, 190], [600, 190]].forEach((l) => { o += glow(c, l[0] + l[1] / 2, 34, 120, 38, 'lb', 0.45) + rc(l[0], 7, l[1], 9, 'la') + rc(l[0], 16, l[1], 2, 'wb'); });
    /* bacheca di sughero con avvisi */
    o += rc(52, 42, 252, 128, 'ia', null, 3) + rc(58, 48, 240, 116, 'hb', null, 2);
    o += rep(70, () => ci(62 + r() * 232, 52 + r() * 108, 0.9, 'ib', 0.25));
    [[70, 58, 56, 44, 'wc'], [136, 56, 44, 56, 'la'], [190, 60, 50, 40, 'wc'], [248, 58, 40, 48, 'ga'], [72, 112, 46, 42, 'ga'], [128, 122, 56, 36, 'wc'], [194, 114, 38, 46, 'la'], [242, 112, 48, 44, 'wc']].forEach((n, i) => {
      o += gp(rc(0, 0, n[2], n[3], n[4], 1, 1) + rc(5, 7, n[2] - 10, 2.4, 'da', 0.4) + rc(5, 14, n[2] - 16, 2, 'da', 0.3) + rc(5, 20, n[2] - 12, 2, 'da', 0.3) + rc(5, n[3] - 12, n[2] * 0.4, 5, i % 3 ? 'ac' : 'bd', 0.7) + ci(n[2] / 2, 2.5, 2.3, 'bd'), T(n[0], n[1], 1, ((i * 37) % 7) - 3));
    });
    /* tabellone con il numero chiamato */
    o += rc(640, 38, 150, 56, 'da', null, 4) + rc(646, 44, 138, 44, 'bk', 0.85, 2) + seg7(690, 52, 1.1, 1, 'bd') + seg7(720, 52, 1.1, 7, 'bd') + rc(660, 54, 22, 4, 'bd', 0.9) + rc(654, 76, 120, 3, 'bd', 0.35) + rc(644, 92, 142, 3, 'ib', 0.5);
    /* finestra con veneziane */
    o += rc(344, 56, 200, 100, 'ib', null, 2) + rc(350, 62, 188, 88, 'ga') + rep(8, (i) => rc(350, 64 + i * 11, 188, 6, 'wc', 0.88)) + rc(344, 156, 200, 6, 'wc');
    /* scaffale con faldoni, schedario */
    o += rc(812, 56, 118, 156, 'ib', null, 2) + rep(4, (i) => rc(816, 60 + i * 38, 110, 36, 'wb') + books(818, 94 + i * 38, 106, 28, r, ['bd', 'hc', 'ga', 'ia', 'wc', 'ib', 'hb'], 10, 16) + rc(814, 96 + i * 38, 114, 3, 'ia'));
    o += rc(692, 164, 98, 132, 'ib', null, 3) + rep(3, (i) => rc(698, 170 + i * 40, 86, 34, 'ic', null, 2) + rc(729, 183 + i * 40, 24, 5, 'da', 0.6, 2) + rc(704, 176 + i * 40, 22, 6, 'wc', 0.9, 1));
    /* sedute d'attesa */
    o += rep(3, (i) => gp(rc(-24, -30, 48, 26, 'hc', null, 6) + rc(-26, -6, 52, 12, 'hc', null, 4) + rc(-3, 6, 6, 18, 'da') + rc(-14, 22, 28, 3, 'da') + rc(-24, -30, 48, 5, 'wh', 0.18, 3), T(70 + i * 62, 272)));
    /* linoleum */
    const [d, u] = lg(c, 'v', [[0, 'fc'], [1, 'fa']]);
    o += rc(0, 296, VW, 94, 'fa') + d + fr(0, 296, VW, 94, u) + rc(0, 296, VW, 4, 'fb', 0.5);
    o += rep(80, () => rc(r() * 950, 300 + r() * 88, 2 + r() * 3, 1.4, r() < 0.5 ? 'fb' : 'fc', 0.55));
    return o;
  };

  /* ═════════════ AMBIENTI: negozio, clinica biotech, porto, sala di controllo ═════════════ */
  /* capi appesi su un'asta: x0..x1, y = asta */
  function rail(x0, x1, y, r, cols) {
    let o = '', x = x0 + 6;
    while (x < x1 - 8) {
      const w = 12 + r() * 9, c = cols[(r() * cols.length) | 0], hh = 44 + r() * 20;
      o += ln(x, y - 1, x, y + 5, 'ic', 1.2) + pa(`M${f(x - w / 2)} ${f(y + 6)}L${f(x + w / 2)} ${f(y + 6)}L${f(x + w / 2 + 1)} ${f(y + 6 + hh)}L${f(x - w / 2 - 1)} ${f(y + 6 + hh)}Z`, c) + rc(x - w / 2, y + 6, w, 4, 'wh', 0.16);
      x += w * 0.7 + 3;
    }
    return o;
  }
  /* pila di capi piegati */
  const stack = (x, y, w, cols, r) => rep(3 + ((r() * 3) | 0), (i) => rc(x, y - (i + 1) * 7, w, 6.4, cols[(r() * cols.length) | 0], null, 1.5));
  const spotCan = (x, y) => pg([x - 5, y, x + 5, y, x + 7, y + 11, x - 7, y + 11], 'da') + rc(x - 1.2, y - 10, 2.4, 10, 'da') + ell(x, y + 12, 6, 1.8);
  const ell = (x, y, rx, ry) => el(x, y, rx, ry, 'la');
  const mannequin = (x, y, cloth, belt) => gp(
    rc(-2.5, 62, 5, 90, 'ib') + el(0, 154, 24, 5, 'ib') + el(0, 154, 24, 5, 'bk', 0.15) +
    pa('M-4 -6C-4 -10 4 -10 4 -6L5 8L-5 8Z', 'ic') + pa('M-22 14C-20 6 -9 4 0 4C9 4 20 6 22 14L26 30C20 42 19 56 22 66L-22 66C-19 56 -20 42 -26 30Z', cloth) +
    pa('M-22 64L22 64L34 134C20 140 -20 140 -34 134Z', cloth) + rc(-22, 62, 44, 5, belt || 'da', 0.9) + ln(0, 66, 0, 134, 'bk', 1, 0.12) + pa('M-22 14C-20 6 -9 4 0 4C9 4 20 6 22 14L26 30L16 28L14 14Z', 'wh', 0.12), T(x, y));

  ROOM.retail = (c) => {
    const r = rng(74);
    let o = rc(0, 0, VW, 296, 'wa') + rc(720, 0, 240, 296, 'at') + rc(718, 0, 3, 296, 'wb', 0.5);
    o += rc(0, 0, VW, 22, 'ca') + rc(0, 22, VW, 3, 'wb');
    /* binario con faretti e coni di luce */
    o += rc(34, 28, 892, 5, 'da') + rep(7, (i) => { const x = 110 + i * 125; return pg([x - 6, 44, x + 6, 44, x + 70, 296, x - 70, 296], 'la', 0.09) + spotCan(x, 33) + glow(c, x, 50, 12, 6, 'la', 0.9); });
    /* vetrina a sinistra */
    o += rc(0, 36, 112, 260, 'ga', 0.9) + rc(0, 36, 112, 260, 'wh', 0.3) + rc(108, 36, 6, 260, 'ib') + pg([10, 36, 56, 36, 30, 296, 0, 296], 'wh', 0.3) + rc(0, 36, 6, 260, 'ib');
    o += rep(3, (i) => rc(30 + i * 24, 214 - i * 12, 12, 82 + i * 12, 'wh', 0.12));
    /* mensole a muro con pile di maglie */
    const cols = ['ha', 'hb', 'hc', 'wc', 'ia', 'ic'];
    o += rep(3, (i) => rc(150, 82 + i * 52, 150, 4, 'ia') + stack(156, 82 + i * 52, 34, cols, r) + stack(200, 82 + i * 52, 30, cols, r) + stack(240, 82 + i * 52, 34, cols, r));
    /* stendino a sinistra e a destra */
    const drawRack = (x0, x1, seed) => { const rr = rng(seed); return ln(x0, 176, x1, 176, 'ic', 3.4) + rc(x0 - 2, 174, 4, 122, 'ic') + rc(x1 - 2, 174, 4, 122, 'ic') + rc(x0 - 14, 292, 28, 4, 'ic') + rc(x1 - 14, 292, 28, 4, 'ic') + rail(x0, x1, 176, rr, ['ha', 'hb', 'hc', 'wc', 'ib', 'ia', 'da']); };
    o += drawRack(130, 318, 5) + drawRack(666, 906, 9);
    /* manichini */
    o += mannequin(392, 130, 'ha', 'hb') + mannequin(572, 142, 'hb', 'hc');
    /* pavimento lucido con riflessi */
    const [d, u] = lg(c, 'v', [[0, 'fc'], [1, 'fa']]);
    o += rc(0, 296, VW, 94, 'fa') + d + fr(0, 296, VW, 94, u) + rc(0, 296, VW, 3, 'fb', 0.5);
    o += rep(7, (i) => { const x = 110 + i * 125; return pg([x - 40, 296, x + 40, 296, x + 90, 390, x - 90, 390], 'la', 0.07); });
    [[392, 'ha'], [572, 'hb']].forEach((m) => { o += rc(m[0] - 20, 298, 40, 38, m[1], 0.14, 6); });
    o += ln(0, 330, VW, 330, 'fb', 1, 0.3) + ln(0, 372, VW, 372, 'fb', 1, 0.28);
    return o;
  };

  ROOM.clinic = (c) => {
    let o = rc(0, 0, VW, 296, 'wa');
    /* vetrate che affacciano su un secondo laboratorio */
    [[14, 300], [326, 300], [638, 308]].forEach((p, i) => { o += rc(p[0], 40, p[1], 246, 'wc', 0.75, 2) + rc(p[0] + 4, 44, p[1] - 8, 130, 'ga', 0.5, 1); o += rc(p[0] + 4, 182, p[1] - 8, 60, 'ib', 0.18) + rc(p[0] + 4, 174, p[1] - 8, 7, 'ic', 0.4); });
    o += rep(3, (i) => rc(30 + i * 100, 184, 60, 4, 'ib', 0.35) + rc(46 + i * 100, 196, 22, 16, 'ga', 0.4, 2)) + rep(3, (i) => rc(350 + i * 90, 190, 64, 3, 'ib', 0.3));
    o += rc(0, 0, VW, 28, 'ca') + rc(0, 28, VW, 3, 'wb') + rc(90, 9, 780, 7, 'la') + rc(90, 16, 780, 2, 'lb', 0.6) + glow(c, 480, 36, 440, 34, 'lb', 0.5);
    o += rep(4, (i) => rc(i * 312 + 5, 36, 6, 254, 'ia') + rc(i * 312 + 5, 36, 2, 254, 'wh', 0.5));
    o += rc(0, 262, VW, 34, 'ia', 0.6) + rc(0, 262, VW, 3, 'wh', 0.6);
    /* bioreattore */
    o += rc(60, 258, 168, 6, 'ib') + rc(76, 252, 136, 8, 'ia') + rc(96, 76, 96, 8, 'ib') + rc(112, 48, 64, 30, 'ia', null, 3) + rc(120, 40, 48, 10, 'ib') + rc(140, 84, 8, 96, 'ic', 0.9) + rc(116, 176, 56, 5, 'ic', 0.9);
    o += rc(94, 82, 100, 172, 'ga', 0.62, 14) + rc(95, 160, 98, 94, 'hb', 0.7, 13) + ps('M94 96V240', 'wh', 1.6, 0.55) + ps('M185 96V240', 'bk', 1.2, 0.12);
    o += rep(10, (i) => ci(108 + ((i * 29) % 78), 232 - ((i * 47) % 70), 1.4 + (i % 3) * 0.7, 'wh', 0.6)) + rc(90, 70, 108, 14, 'ib', null, 3) + rc(104, 252, 80, 8, 'ib', null, 2);
    o += ps('M196 98C230 98 230 150 262 150', 'ib', 3.4) + ps('M196 110C222 110 226 172 252 172', 'ha', 2.6, 0.9) + rc(236, 128, 64, 130, 'ia', null, 4) + rc(242, 136, 52, 36, 'da', null, 3) + ps('M246 164L255 152L264 158L275 144L288 150', 'hb', 1.8) + rep(3, (i) => ci(250 + i * 14, 186, 3, i === 1 ? 'hc' : 'hb')) + rc(246, 200, 44, 40, 'ib', 0.4, 2);
    /* cappa a flusso laminare */
    o += rc(632, 112, 238, 152, 'ia', null, 5) + rc(640, 122, 222, 96, 'ga', 0.6, 3) + pg([652, 122, 712, 122, 674, 218, 640, 218], 'wh', 0.26) + ps('M640 122H862V218H640Z', 'ib', 2) + rc(632, 218, 238, 8, 'ic') + rc(640, 100, 222, 10, 'ib', null, 2) + rc(652, 104, 130, 2.6, 'hb') + rc(800, 100, 22, 10, 'hb', 0.9, 2);
    o += rc(672, 190, 20, 28, 'wc', 0.9, 2) + rc(698, 198, 14, 20, 'ga', 0.9, 2) + rc(724, 180, 4, 38, 'ib') + rc(718, 176, 16, 8, 'ib', null, 2) + rc(760, 196, 62, 22, 'wc', 0.85, 2) + rep(5, (i) => rc(766 + i * 11, 200, 7, 14, 'hc', 0.75, 1.5)) + rc(642, 228, 218, 32, 'ib', 0.45) + rep(3, (i) => rc(650 + i * 70, 232, 62, 24, 'ia', null, 2));
    /* schermo con curve di crescita */
    o += rc(336, 52, 134, 80, 'da', null, 4) + rc(342, 58, 122, 68, 'bk', 0.55, 2) + ps('M350 118V68M350 118H458', 'ib', 1.2, 0.8) + ps('M352 112C372 106 380 92 398 84S432 70 456 66', 'hb', 2.2) + ps('M352 114C376 112 396 104 420 98S444 90 456 86', 'ha', 2) + ps('M352 116C376 116 410 112 456 108', 'hc', 1.8, 0.9);
    /* porta stagna */
    o += rc(900, 82, 50, 202, 'ia', null, 3) + rc(906, 90, 38, 60, 'ga', 0.6, 2) + rc(910, 168, 6, 18, 'ic') + rc(908, 62, 34, 14, 'ha', null, 3) + rc(912, 66, 26, 3, 'wh', 0.8) + rc(912, 71, 18, 2, 'wh', 0.6);
    /* pavimento chiaro con linea guida */
    const [d, u] = lg(c, 'v', [[0, 'fc'], [1, 'fa']]);
    o += rc(0, 296, VW, 94, 'fa') + d + fr(0, 296, VW, 94, u) + rc(0, 296, VW, 3, 'fb', 0.5) + rc(0, 346, VW, 5, 'ha', 0.55) + pg([140, 296, 300, 296, 360, 390, 150, 390], 'wh', 0.1) + pg([660, 296, 760, 296, 830, 390, 700, 390], 'wh', 0.08);
    return o;
  };

  /* panorama del porto all'alba: parte lontana (cielo, mare, nave, gru lontane) */
  function panoFar(c) {
    const [sd, su] = lg(c, 'v', [[0, 's1'], [0.55, 's2'], [1, 's3']]);
    const [md, mu] = lg(c, 'v', [[0, 'ga'], [1, 'gb']]);
    let o = sd + fr(0, 0, VW, 178, su);
    o += glow(c, 720, 170, 300, 120, 'lb', 0.75) + ci(720, 160, 26, 'la', 0.95) + ci(720, 160, 40, 'lb', 0.28);
    o += el(210, 52, 150, 7, 'wh', 0.45) + el(560, 86, 190, 6, 'wh', 0.4) + el(850, 40, 120, 6, 'wh', 0.45) + el(380, 118, 120, 5, 'wh', 0.35);
    /* mare */
    o += md + fr(0, 176, VW, 70, mu) + rc(0, 176, VW, 2, 'wh', 0.5);
    o += rep(16, (i) => rc(640 + ((i * 41) % 150) - (i % 3) * 20, 180 + i * 3.8, 40 + (i % 4) * 14, 1.6, 'la', 0.6 - i * 0.02, 1)) + rep(14, (i) => rc(60 + ((i * 97) % 880), 184 + (i * 13) % 56, 30 + (i % 5) * 12, 1.2, 'wh', 0.3, 1));
    /* lontananze: nave, gru lontane, frangiflutti */
    o += pg([500, 172, 640, 172, 628, 160, 520, 160], 'da', 0.42) + rc(548, 148, 50, 12, 'da', 0.4) + rc(560, 138, 14, 10, 'da', 0.4) + rc(560, 150, 4, 4, 'la', 0.7);
    o += rep(4, (i) => gp(pg([-8, 0, 8, 0, 6, -34, -6, -34], 'da', 0.22) + rc(-22, -36, 56, 3, 'da', 0.22), T(404 + i * 38, 176)));
    o += rc(0, 174, VW, 5, 'da', 0.22);
    o += ps('M214 66l7 5l7 -5M246 84l6 4l6 -4M606 58l7 5l7 -5M896 98l6 4l6 -4', 'da', 1.8, 0.7);
    return o;
  }
  /* parte vicina: banchina, container, gru a cavalletto, nebbia */
  function panoNear(c) {
    const r = rng(97);
    let o = '';
    /* banchina */
    const [qd, qu] = lg(c, 'v', [[0, 'fc'], [1, 'fa']]);
    o += rc(0, 238, VW, 58, 'fb') + rc(0, 240, VW, 4, 'fc', 0.8) + qd + fr(0, 244, VW, 52, qu) + rep(6, (i) => ln(i * 190 - 20, 296, i * 190 + 30, 244, 'fb', 1.2, 0.5));
    o += rep(5, (i) => ci(120 + i * 190, 242, 3, 'da', 0.8) + rc(118 + i * 190, 242, 4, 6, 'da', 0.8));
    /* container impilati (destra) */
    const CC = ['ia', 'ib', 'ic', 'ha', 'hb', 'hc'];
    const cont = (x, y, w, h, k) => rc(x, y, w, h, k, null, 0.8) + rep(Math.floor(w / 5), (i) => rc(x + 2 + i * 5, y + 2, 1.4, h - 4, 'bk', 0.17)) + rc(x, y, w, 2, 'wh', 0.2) + rc(x, y + h - 2, w, 2, 'bk', 0.2);
    let ct = '';
    for (let row = 0; row < 3; row++) { let x = 690 - row * 16 + ((row * 31) % 20); while (x < 970) { const w = 46 + r() * 2, k = CC[(r() * CC.length) | 0]; ct += cont(x, 238 - (row + 1) * 21, w, 20, k); x += w + 1.5; } }
    o += ct;
    /* gru a cavalletto (sinistra) */
    o += gp(
      pg([-12, 0, 8, 0, 14, -176, -6, -176], 'da') + pg([100, 0, 120, 0, 114, -176, 94, -176], 'da') + rc(-10, -176, 128, 12, 'da') +
      ps('M-6 -164L8 -100L-12 -40M114 -164L100 -100L120 -40', 'da', 2.4) + ps('M-12 -90H8M-8 -50H8M100 -90H120M104 -50H116', 'da', 2) +
      pg([-30, -178, 400, -190, 400, -182, -30, -168], 'da') + ps('M-24 -176L40 -196L104 -182L170 -198L236 -184L302 -198L368 -188', 'da', 2.2) + rc(-34, -172, 40, 14, 'ic', null, 2) +
      rc(300, -186, 34, 12, 'da') + ln(310, -174, 310, -90, 'da', 1.4) + ln(326, -174, 326, -90, 'da', 1.4) + rc(288, -90, 56, 22, 'ia', null, 1) + rep(5, (i) => rc(290 + i * 11, -88, 1.4, 18, 'bk', 0.2)) + ci(400, -186, 2.6, 'bd') + rc(-10, -150, 20, 26, 'ic', 0.9, 2),
      T(76, 244, 1.0));
    o += ci(76 + 400, 244 - 186, 4.2, 'bd', 0.9);
    /* nebbia */
    const [fd, fu] = lg(c, 'v', [[0, 'wh', 0], [0.5, 'wh', 0.46], [1, 'wh', 0]]);
    o += fd + fr(0, 146, VW, 70, fu) + fr(0, 214, VW, 54, fu, 0.55);
    return o;
  }
  ROOM.port = (c) => {
    /* riunione in un container-ufficio con vetrata sul porto: cornice interna */
    let o = panoFar(c) + panoNear(c);
    o += rc(0, 0, VW, 20, 'wb') + rc(0, 20, VW, 3, 'ia', 0.7) + rc(0, 0, 44, 296, 'wb') + rc(916, 0, 44, 296, 'wb') + rc(44, 0, 3, 296, 'ia', 0.6) + rc(913, 0, 3, 296, 'ia', 0.6);
    o += rc(330, 20, 7, 276, 'wb') + rc(626, 20, 7, 276, 'wb') + rc(330, 20, 2, 276, 'wh', 0.35) + rc(626, 20, 2, 276, 'wh', 0.35);
    o += rc(0, 282, VW, 14, 'wb') + rc(0, 282, VW, 2.5, 'wh', 0.5) + pg([120, 22, 220, 22, 160, 282, 60, 282], 'wh', 0.07);
    return o;
  };

  ROOM.control = (c) => {
    let o = rc(0, 0, VW, 296, 'wa') + rc(0, 0, VW, 296, 'bk', 0.18);
    o += rc(0, 0, VW, 16, 'ca') + rc(60, 6, 840, 2.4, 'hc', 0.8) + rc(60, 11, 840, 1.6, 'lb', 0.6);
    /* video-wall */
    o += rc(86, 22, 788, 160, 'da', null, 4) + glow(c, 480, 188, 420, 56, 'ha', 0.22);
    const sw = 188, shh = 74;
    const panel = (k, x, y) => {
      let s = rc(x, y, sw, shh, 'ga', null, 2);
      const gx = (i) => x + 8 + i * ((sw - 16) / 6);
      if (k === 0) s += ps(`M${x + 14} ${y + 56}H${x + 70}V${y + 28}H${x + 124}M${x + 70} ${y + 56}H${x + 100}V${y + 44}H${x + 170}`, 'ha', 1.6) + ci(x + 70, y + 56, 3, 'hb') + ci(x + 124, y + 28, 3, 'ha') + ci(x + 170, y + 44, 3, 'ha') + rc(x + 14, y + 10, 40, 4, 'ha', 0.6);
      if (k === 1) s += ps(`M${x + 12} ${y + 60}L${gx(1)} ${y + 40}L${gx(2)} ${y + 50}L${gx(3)} ${y + 26}L${gx(4)} ${y + 38}L${gx(5)} ${y + 18}L${x + sw - 12} ${y + 30}`, 'ha', 1.8) + ps(`M${x + 12} ${y + 64}L${gx(2)} ${y + 56}L${gx(3)} ${y + 58}L${gx(5)} ${y + 46}L${x + sw - 12} ${y + 50}`, 'hb', 1.6) + ln(x + 10, y + 66, x + sw - 10, y + 66, 'gb', 1, 0.8);
      if (k === 2) s += rep(9, (i) => rc(x + 12 + i * 18, y + 66 - (14 + ((i * 23) % 40)), 11, 14 + ((i * 23) % 40), i % 4 === 2 ? 'hb' : 'ha', 0.9, 1));
      if (k === 3) s += pa(`M${x + 20} ${y + 40}C${x + 30} ${y + 14} ${x + 62} ${y + 12} ${x + 80} ${y + 28}C${x + 100} ${y + 46} ${x + 70} ${y + 64} ${x + 40} ${y + 62}Z`, 'gb', 0.9) + pa(`M${x + 100} ${y + 20}C${x + 130} ${y + 10} ${x + 168} ${y + 24} ${x + 160} ${y + 48}C${x + 150} ${y + 64} ${x + 112} ${y + 58} ${x + 104} ${y + 42}Z`, 'gb', 0.9) + ci(x + 50, y + 38, 3, 'hb') + ci(x + 134, y + 36, 3, 'bd') + ci(x + 70, y + 50, 2.4, 'ha');
      if (k === 4) s += rep(6, (i) => rc(x + 10, y + 10 + i * 10, 80 + ((i * 37) % 70), 4, i === 3 ? 'hb' : 'ha', 0.65, 1));
      if (k === 5) s += rep(3, (i) => ps(`M${x + 24 + i * 56} ${y + 56}A20 20 0 1 1 ${x + 64 + i * 56} ${y + 56}`, i === 1 ? 'hb' : 'ha', 3.4) + ln(x + 44 + i * 56, y + 46, x + 52 + i * 56 - i * 6, y + 30, 'wh', 1.6, 0.9, 1));
      if (k === 6) s += ps(`M${x + 8} ${y + 38}` + rep(18, (i) => `Q${x + 8 + i * 10 + 5} ${y + 38 - (i % 2 ? 18 : -18)} ${x + 8 + (i + 1) * 10} ${y + 38}`), 'hc', 1.8) + ln(x + 8, y + 38, x + sw - 8, y + 38, 'gb', 1, 0.6);
      if (k === 7) s += rep(48, (i) => rc(x + 10 + (i % 12) * 14, y + 10 + Math.floor(i / 12) * 15, 11, 11, ((i * 7) % 11) > 8 ? 'bd' : ((i * 5) % 7) > 4 ? 'hb' : 'ha', 0.55, 1));
      return s + rc(x, y, sw, shh, 'bk', 0, 2) + rc(x, y, sw, 2, 'wh', 0.1);
    };
    const order = [0, 1, 2, 3, 4, 5, 6, 7];
    o += order.map((k, i) => panel(k, 92 + (i % 4) * (sw + 6), 26 + Math.floor(i / 4) * (shh + 6))).join('');
    /* consolle laterali con monitor */
    const consolle = (x, flip) => {
      let s = rc(x, 224, 280, 12, 'ic') + rc(x, 236, 280, 60, 'ib') + rc(x, 236, 280, 3, 'bk', 0.25) + rep(5, (i) => rc(x + 10 + i * 54, 246, 46, 40, 'ia', null, 2));
      s += rep(3, (i) => rc(x + 20 + i * 86, 168, 72, 52, 'da', null, 3) + rc(x + 24 + i * 86, 172, 64, 44, 'ga', null, 2) + ps(`M${x + 28 + i * 86} ${210}L${x + 42 + i * 86} 194L${x + 56 + i * 86} 200L${x + 70 + i * 86} 182L${x + 84 + i * 86} 188`, i % 2 ? 'hb' : 'ha', 1.6) + rc(x + 52 + i * 86, 220, 16, 4, 'da'));
      return s + rc(x + 60, 227, 120, 5, 'da', 0.8, 2);
    };
    o += consolle(18) + consolle(662);
    o += glow(c, 90, 214, 60, 28, 'la', 0.5) + glow(c, 880, 214, 60, 28, 'la', 0.5);
    o += rep(18, (i) => ci(330 + i * 17, 200, 2.2, i % 5 === 0 ? 'hb' : i % 7 === 3 ? 'bd' : 'ha', 0.85)) + rc(322, 193, 312, 14, 'da', 0.5, 3);
    /* sedie di spalle */
    o += rep(2, (i) => gp(pa('M-20 0C-22 -26 -14 -40 0 -40C14 -40 22 -26 20 0Z', 'da') + rc(-2.5, 0, 5, 26, 'da') + rc(-18, 26, 36, 4, 'da') + rc(-18, 3, 36, 12, 'bk', 0.25, 5), T(i ? 836 : 124, 258, 1.05)));
    /* pavimento sopraelevato con il riflesso dei monitor */
    const [d, u] = lg(c, 'v', [[0, 'fc'], [1, 'fa']]);
    o += rc(0, 296, VW, 94, 'fa') + d + fr(0, 296, VW, 94, u) + rc(0, 296, VW, 3, 'ha', 0.25);
    o += pg([120, 296, 840, 296, 920, 390, 40, 390], 'ha', 0.07) + rep(6, (i) => ln(i * 190 - 30, 296, i * 200 - 100, 390, 'fb', 1, 0.5)) + ln(0, 336, VW, 336, 'fb', 1, 0.4) + ln(0, 372, VW, 372, 'fb', 1, 0.4);
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
  function hand(x, y, s, rot, mirror) {
    let h = pa('M-26 150L-23 24Q-23 10 -12 10L12 10Q23 10 23 24L26 150Z', 'sl') + pa('M2 22L-1 150L10 150L9 22Z', 'sd', 0.4);
    h += rc(-24.5, 2, 49, 14, 'cf', 1, 3.5) + rc(-24.5, 13, 49, 3, 'bk', 0.1, 1.5);
    h += pa('M-18.5 9C-22.5 -5 -25 -20 -23 -35L23 -35C25 -20 22.5 -5 18.5 9Z', 'hd');
    h += pa('M10 -30C14 -22 15 -12 12 6L18.5 9C22.5 -5 25 -20 23 -35Z', 'hh', 0.5);
    [{ x: -18.6, l: 27, a: -5 }, { x: -9.2, l: 34, a: -1.5 }, { x: 0.2, l: 31, a: 2 }, { x: 9.6, l: 24, a: 6.5 }].forEach((fg) => {
      h += gp(rc(fg.x, -35 - fg.l, 9.2, fg.l + 8, 'hd', null, 4.6) + rc(fg.x + 6.4, -33 - fg.l, 2.6, fg.l + 4, 'hh', 0.4, 1.3) + el(fg.x + 4.6, -35 - fg.l + 5, 2.6, 3.2, 'wh', 0.16), `rotate(${fg.a} ${fg.x + 4.6} -35)`);
    });
    h += el(-24.5, -9, 6, 17, 'hd', null, -30) + el(-23.2, -10, 2.4, 11, 'hh', 0.4, -30) + el(-27.4, -22, 3, 3.6, 'wh', 0.16);
    h += ps('M-17 -34Q-14 -31 -10.5 -34M-8 -34Q-4.8 -30.6 -1.2 -34M1.6 -34Q4.8 -30.6 8.2 -34M11 -34Q14.4 -31 17.4 -34', 'hh', 1.2, 0.55);
    return gp(gp(h, mirror ? 'scale(-1 1)' : ''), T(x, y, s, rot));
  }
  /* le due mani sulla tastiera (laptop) */
  const typing = (cx, y, s) => hand(cx - 108, y, s, 8, true) + hand(cx + 108, y, s, -8, false);

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
    s += rc(x, y, w, h, 'db', null, 14);
    s += ci(cx, y + 6, 1.8, 'dv', 0.5);
    return { svg: s, sx: x + 12, sy: y + 14, sw: w - 24, sh: h - 26 };
  }
  /* riflesso diagonale sul vetro dello schermo */
  const sheen = (x, y, w, h) => pg([x + w * 0.55, y, x + w * 0.78, y, x + w * 0.38, y + h, x + w * 0.15, y + h], 'wh', 0.06);
  /* tazza di caffè vista dall'alto-in-avanti */
  const mug = (x, y, s, cls) => gp(el(0, 4, 17, 5.5, 'bk', 0.2) + pa('M-15 -16L15 -16L13 2Q0 8 -13 2Z', cls || 'wc') + el(0, -16, 15, 5, cls || 'wc') + el(0, -15.5, 12.5, 3.6, 'ia') + ps('M15 -12Q25 -12 24 -4Q23 2 13 -2', cls || 'wc', 3), T(x, y, s));
  /* telefono appoggiato (schermo acceso), ruotato */
  function phoneFlat(x, y, s, rot, lit) {
    let o = rc(-24, -46, 48, 92, 'db', null, 8) + ps('M-23 -38V38', 'wh', 1, 0.28) + rc(-21, -43, 42, 86, lit ? 'sf' : 'bk', null, 6) + (lit ? '' : pg([-4, -43, 14, -43, -10, 43, -21, 43, -21, 20], 'wh', 0.08) + rc(-8, -40, 16, 3, 'bk', 0.9, 1.5));
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
      o += rc(L.sx, by, L.sw, 22, 'sg') + ci(L.sx + L.sw / 2 - 54, by + 11, 7, 'li').replace('class="k-li"', 'class="k-li vp-micself"') + ci(L.sx + L.sw / 2 - 28, by + 11, 7, 'li') + ci(L.sx + L.sw / 2 - 2, by + 11, 7, 'li') + rc(L.sx + L.sw / 2 + 20, by + 4, 40, 14, 'bd', null, 7) + ci(L.sx + 16, by + 11, 3, 'go');
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
      (n ? tileRects(n, ax, ay, aw, ah) : []).forEach((r, i) => {
        const p = c.people[i], x = r[0], y = r[1], w = r[2], h = r[3], a = attrs(p);
        const wide = w / h > 2.1, s = Math.min(h / 130, w / 150), ny = h * 0.16 + 80 * s, px = (wide ? w * 0.68 : w / 2) + a.jit * 3;
        const inner = tileBg(c, c.bg, w, h) + person(p, px, ny, s, { noarc: true }) + `<rect class="vp-dim" width="${f(w)}" height="${f(h)}"/>`;
        ppl += `<g class="vp-tl" data-k="${esc(p.key)}">${clip(x, y, w, h, inner)}<rect class="vp-ring" x="${f(x + 0.5)}" y="${f(y + 0.5)}" width="${f(w - 1)}" height="${f(h - 1)}" rx="3"/>${micBadge(x + w - 14, y + 14)}</g>`;
        if (wide) lb += lbl(p, x + 6 + w * 0.24, y + h - 6, w * 0.48, { bottom: true, cls: 'vp-lb--t' });
        else lb += lbl(p, x + w / 2, y + h - 5, w - 10, { bottom: true, one: h < 130, cls: 'vp-lb--t' });
      });
      return { ppl, fg: typing(480, 428, 1.5), lbl: lb };
    },
  };

  /* ═════════════ VISTA: riunione (tavolo davanti a te) ═════════════ */
  const TABLE = { lab: ['ia', 'ib'], factory: ['ic', 'ib'], night: ['ia', 'ib'], public: ['ia', 'ib'], retail: ['ia', 'ib'], clinic: ['ia', 'ib'], port: ['hc', 'hb'], control: ['ia', 'ib'], office: ['ia', 'ib'] };
  const SEAT = { 1: [0, 1.3], 2: [260, 1.2], 3: [230, 1.1], 4: [182, 1.0], 5: [150, 0.92] };

  /* quaderno aperto con appunti a mano (visto dall'alto in avanti) */
  function notebook(c, x, y, s) {
    const r = rng(9);
    let o = gp(pg([-12, 8, 328, 8, 352, 62, -36, 62], 'ac') + pg([-8, 4, 322, 4, 342, 58, -26, 58], 'pp') + pg([-8, 4, 322, 4, 326, 10, -10, 10], 'bk', 0.1), '');
    for (let i = 0; i < 4; i++) o += ln(-4 - i * 5, 16 + i * 10, 318 + i * 6, 16 + i * 10, 'li', 1, 0.7);
    /* grafia: tratti ondulati */
    [[12, 18, 138], [12, 28, 170], [14, 38, 92], [14, 48, 156]].forEach((l, i) => {
      let d = `M${l[0] + 8 - i * 3} ${l[1]}`;
      for (let k = 0; k < l[2] / 9; k++) d += `q${(2 + r() * 3).toFixed(1)} ${(-3 + r() * 6).toFixed(1)} ${(3 + r() * 4).toFixed(1)} 0`;
      o += ps(d, 'pn', 1.1, 0.78);
    });
    o += ps('M214 22H300M214 32H284M226 44H300', 'pn', 1, 0.5) + ps('M212 14l9 9m0-9l-9 9', 'bd', 1.3, 0.8);
    o += rep(14, (i) => ci(2 + i * 24, 6, 2.6, 'bk', 0.55) + rc(2 + i * 24 - 1, 2, 2, 8, 'dv', 0.7));
    return gp(o, T(x, y, s));
  }
  /* penna tra pollice e indice (si disegna sopra la mano) */
  const pen = (x, y, s, rot) => gp(ln(-10, -78, 14, -8, 'pn', 4.6, null, 1) + ln(-9.4, -76, -12, -84, 'da', 2.6, null, 1) + ln(10, -22, 16, -4, 'ac', 3, null, 1) + ln(-6, -62, 6, -28, 'wh', 1, 0.35, 1), T(x, y, s, rot));

  VIEW.meeting = {
    env(c) {
      return pal(c.bg, ROOM[c.bg](c));
    },
    dyn(c) {
      const n = c.n, sp = (SEAT[n] || SEAT[5])[0], sc = (SEAT[n] || SEAT[5])[1];
      let ppl = '', lb = '', cups = '';
      c.people.forEach((p, i) => {
        const a = attrs(p), x = 480 + (i - (n - 1) / 2) * sp + a.jit * 5;
        const stand = a.st && n > 1;
        ppl += person(p, x, (stand ? 192 : 232) + a.jit * 5, sc * (stand ? 1.04 : 1));
        lb += lbl(p, x, 318, n === 1 ? 190 : Math.min(158, sp - 6), { bottom: true });
      });
      cups += mug(104, 330, 1.05, 'wc') + mug(866, 328, 0.95, 'wh');
      const [tt, te] = TABLE[c.bg] || TABLE.office;
      const [sd, su] = lg(c, 'v', [[0, 'wh', 0.16], [0.5, 'wh', 0.0], [1, 'bk', 0.3]]);
      let fg = pal(c.bg, pg([84, 292, 876, 292, 976, 392, -16, 392], tt) + sd + frg([84, 292, 876, 292, 976, 392, -16, 392], su) + pg([84, 292, 876, 292, 878, 297, 82, 297], te) + pg([84, 297, 876, 297, 880, 300, 80, 300], 'bk', 0.18) + pg([180, 296, 300, 296, 200, 392, 40, 392], 'wh', 0.08) + cups);
      /* documenti, telefono, quaderno e mani */
      fg += gp(rc(0, 0, 92, 56, 'pp', null, 1.5) + rc(5, -4, 92, 56, 'pp', null, 1.5) + [10, 18, 26, 34].map((yy, k) => ln(14, yy, 84 - (k % 2) * 16, yy, 'li', 1.2, 0.9)).join('') + rc(14, 40, 26, 6, 'ac', 0.7, 2), T(726, 352, 1, -5));
      fg += gp(rc(-18, -34, 36, 68, 'db', null, 7) + rc(-15, -31, 30, 62, 'bk', 0.9, 5) + ci(0, -22, 2.2, 'dv', 0.5), T(96, 366, 1, 14));
      fg += notebook(c, 316, 346, 1.0) + hand(176, 452, 1.55, 8, true) + hand(648, 456, 1.55, -18, false) + pen(646, 410, 1.15, -18);
      return { ppl, fg, lbl: lb };
    },
  };

  /* ═════════════ VISTA: cammini nello spazio (prospettiva a un punto di fuga) ═════════════ */
  const flat = (a) => [].concat.apply([], a);
  const WLK = { F: 470, YH: 130, EYE: 1.6 };

  function world(c, W2, H, D) {
    const F = WLK.F, YH = WLK.YH, EYE = WLK.EYE, Zn = 1.3;
    const P = (X, Y, Z) => [480 + F * X / Z, YH + F * (EYE - Y) / Z];
    const Q = [];
    const add = (z, s) => { Q.push([z, s]); };
    const w = {
      P, W2, H, D, Zn, Q, add,
      poly: (pts, cls, o) => pg(flat(pts), cls, o),
      box(x0, x1, y0, y1, z0, z1, cls, o, ribs) {
        z0 = Math.max(z0, Zn);
        const q = (a, k, op) => pg(flat(a), k, op);
        let s = '';
        if (y1 < EYE) s += q([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], cls[1], o);
        if (y0 > EYE) s += q([P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1)], cls[2], o);
        if (x1 <= 0) s += q([P(x1, y0, z0), P(x1, y0, z1), P(x1, y1, z1), P(x1, y1, z0)], cls[2], o);
        else if (x0 >= 0) s += q([P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0)], cls[2], o);
        s += q([P(x0, y0, z0), P(x1, y0, z0), P(x1, y1, z0), P(x0, y1, z0)], cls[0], o);
        if (ribs) {
          const X = x1 <= 0 ? x1 : x0, step = Math.max(0.5, (z1 - z0) / 14);
          let d = '';
          for (let z = z0 + step * 0.5; z < z1; z += step) { const a = P(X, y0 + 0.1, z), b = P(X, y1 - 0.1, z); d += `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`; }
          s += `<path d="${d}" class="s-bk" stroke-width="1" stroke-opacity=".2"/>`;
        }
        add((z0 + z1) / 2, s);
      },
      /* rettangolo sulla parete laterale (side -1 sinistra, +1 destra) */
      wq(side, z0, z1, y0, y1, cls, o, bare) {
        z0 = Math.max(z0, Zn);
        const X = side * W2, s = pg(flat([P(X, y0, z0), P(X, y0, z1), P(X, y1, z1), P(X, y1, z0)]), cls, o);
        if (bare) return s;
        add((z0 + z1) / 2 + 0.01, s);
      },
      cq(x0, x1, z0, z1, cls, o, y) { z0 = Math.max(z0, Zn); y = y == null ? H : y; return pg(flat([P(x0, y, z0), P(x1, y, z0), P(x1, y, z1), P(x0, y, z1)]), cls, o); },
      fq(x0, x1, z0, z1, cls, o) { z0 = Math.max(z0, Zn); return pg(flat([P(x0, 0, z0), P(x1, 0, z0), P(x1, 0, z1), P(x0, 0, z1)]), cls, o); },
      /* sprite verticale (cartoncino) alto hm metri con la base in (X,Y,Z); fn disegna in unità locali con base y=0 e altezza uh */
      bb(X, Y, Z, hm, fn, uh) { const p = P(X, Y, Z), k = WLK.F * hm / Z / uh; add(Z, gp(fn, `translate(${f(p[0])} ${f(p[1])}) scale(${f(k * 1000) / 1000})`)); },
      glow(X, Y, Z, rm, tok, a, asp) { const p = P(X, Y, Z), r = WLK.F * rm / Z; return glow(c, p[0], p[1], r, r * (asp || 0.7), tok, a); },
      flush() { Q.sort((a, b) => b[0] - a[0]); return Q.map((q) => q[1]).join(''); },
    };
    return w;
  }

  /* struttura comune: sfondo/parete di fondo, pareti laterali, soffitto, pavimento e linee di fuga */
  function walkFrame(c, w, cfg) {
    const { P, W2, H, D, Zn } = w;
    const far = [P(-W2, H, D), P(W2, H, D), P(W2, 0, D), P(-W2, 0, D)];
    const fx = far[0][0], fy = far[0][1], fw = far[1][0] - far[0][0], fh = far[3][1] - far[0][1];
    let o = rc(0, 0, VW, VH, cfg.sky || 'ca');
    o += `<svg x="${f(fx)}" y="${f(fy)}" width="${f(fw)}" height="${f(fh)}" viewBox="0 0 960 296" preserveAspectRatio="xMidYMid slice" overflow="hidden">${cfg.farSvg || ''}</svg>`;
    o += w.fq(-W2, W2, Zn, D, cfg.floor || 'fa');
    o += w.poly([P(-W2, 0, Zn), P(-W2, H, Zn), P(-W2, H, D), P(-W2, 0, D)], cfg.wallL || 'wb') + w.poly([P(W2, 0, Zn), P(W2, H, Zn), P(W2, H, D), P(W2, 0, D)], cfg.wallR || 'wa');
    if (cfg.ceil !== false) o += w.cq(-W2, W2, Zn, D, cfg.ceil || 'ca');
    /* linee del pavimento */
    for (let x = -Math.floor(W2); x <= Math.floor(W2); x += cfg.gx || 1.5) o += ln(...P(x, 0, Zn), ...P(x, 0, D), 'fb', 1, 0.34);
    for (let z = 2; z < D; z += cfg.gz || (z < 6 ? 1.5 : z < 11 ? 2.5 : 4)) o += ln(...P(-W2, 0, z), ...P(W2, 0, z), 'fb', 1, 0.22);
    return o;
  }

  /* ═════════════ VISTA: scenografie del cammino per ambiente ═════════════ */
  const WALK = {};
  const lightsRow = (w, zs, wd, cls, tok, a) => zs.map((z) => w.cq(-wd, wd, z - 0.45, z + 0.45, cls || 'la') + w.glow(0, w.H, z, wd * 1.5, tok || 'lb', a == null ? 0.35 : a, 0.5)).join('');

  WALK.lab = (c) => {
    const w = world(c, 3.6, 3.4, 16);
    let o = walkFrame(c, w, { farSvg: pal('lab', ROOM.lab(c)), wallL: 'wb', wallR: 'wa' });
    [-1, 1].forEach((sd) => w.wq(sd, 1.3, 16, 1.15, 1.27, 'ac', 0.95));
    [[4.4, 7.4], [8.0, 11.0], [11.6, 14.6]].forEach((s, i) => {
      w.box(-3.6, -2.7, 0, 0.9, s[0], s[1], ['ia', 'ic', 'ib']);
      w.box(-3.6, -3.25, 1.45, 2.3, s[0], s[1], ['ia', 'ic', 'ib']);
      w.bb(-3.05, 0.9, s[0] + 0.7, 0.34, erlen(0, 0, 46, 'hc'), 46);
      w.bb(-3.05, 0.9, s[0] + 1.5, 0.28, rflask(0, 0, 15, 'ha'), 44);
      w.bb(-3.05, 0.9, s[0] + 2.3, 0.3, beaker(0, 0, 24, 34, 'hc'), 34);
    });
    /* parete vetrata a destra con porte */
    [[3.0, 5.7], [6.3, 9.0], [9.6, 12.3], [12.9, 15.6]].forEach((s) => { w.wq(1, s[0], s[1], 0.12, 2.7, 'ga', 0.5); w.wq(1, s[0], s[1], 0.12, 2.7, 'wh', 0.1); });
    [5.7, 9.0, 12.3].forEach((z) => w.wq(1, z, z + 0.6, 0, 2.9, 'ha', 0.95));
    w.box(2.6, 3.6, 0, 2.3, 9.8, 11.6, ['ia', 'ic', 'ib']);
    w.wq(1, 3.0, 15.6, 2.7, 2.78, 'ib', 0.8);
    o += w.fq(-0.06, 0.06, w.Zn, 16, 'hc', 0.8) + lightsRow(w, [3, 6, 9, 12, 15], 0.9, 'la');
    return o + w.flush();
  };

  WALK.factory = (c) => {
    const w = world(c, 6, 6.5, 24), H = w.H;
    let o = walkFrame(c, w, { farSvg: pal('factory', ROOM.factory(c)), wallL: 'wb', wallR: 'wa', ceil: 'ca', gx: 2 });
    [-1, 1].forEach((sd) => { w.wq(sd, 1.3, 24, 3.6, 5.2, 'ga', 0.85); for (let z = 3; z < 24; z += 3) w.wq(sd, z, z + 0.18, 3.6, 5.2, 'hb', 0.85); w.wq(sd, 1.3, 24, 1.4, 1.5, 'ia', 0.9); });
    for (let z = 4; z < 24; z += 4.5) o += ln(...w.P(-6, H, z), ...w.P(6, H, z), 'hb', Math.max(1, 28 / z), 0.9) + ln(...w.P(-6, H - 1.1, z), ...w.P(0, H, z), 'hb', Math.max(0.8, 18 / z), 0.7) + ln(...w.P(6, H - 1.1, z), ...w.P(0, H, z), 'hb', Math.max(0.8, 18 / z), 0.7);
    [5.5, 9.5, 13.5, 17.5, 21].forEach((z) => { o += w.glow(-2.4, 4.6, z, 2.6, 'lb', 0.4) + w.glow(2.4, 4.6, z, 2.6, 'lb', 0.4); });
    [5.5, 9.5, 13.5, 17.5, 21].forEach((z) => [-2.4, 2.4].forEach((x) => w.bb(x, 5.2, z, 0.9, pg([-4, -12, 4, -12, 18, 0, -18, 0], 'da') + rc(-18, -1, 36, 3, 'ha') + el(0, 2, 14, 3.2, 'la') + rc(-0.8, -26, 1.6, 14, 'hb'), 12)));
    /* macchine utensili */
    w.box(-5.7, -3.6, 0, 1.1, 5, 8.4, ['ib', 'ic', 'ia']); w.box(-5.7, -4.5, 1.1, 2.0, 5, 6.3, ['ia', 'ic', 'ib']); w.box(-5.2, -4.4, 2.0, 2.18, 5.1, 6.1, ['ic', 'ic', 'ic']);
    w.box(-5.7, -4.0, 0, 2.0, 11, 13.5, ['ia', 'ic', 'ib']); w.box(-5.7, -4.9, 2.0, 2.6, 11, 12.4, ['hc', 'hc', 'ib']);
    w.box(3.7, 5.7, 0, 1.15, 8.5, 11.5, ['ib', 'ic', 'ia']); w.box(5.0, 5.7, 1.15, 3.3, 8.7, 9.4, ['ia', 'ic', 'ib']); w.box(4.0, 5.7, 2.6, 3.5, 8.5, 10.2, ['ia', 'ic', 'ib']);
    w.box(3.7, 5.7, 0, 2.0, 15, 17.5, ['ia', 'ic', 'ib']);
    
    /* strisce gialle di sicurezza e luce dai lucernari */
    o += w.fq(-3.55, -3.4, w.Zn, 24, 'ha') + w.fq(3.4, 3.55, w.Zn, 24, 'ha');
    [4, 8, 12, 16].forEach((z) => { o += w.poly([w.P(-1.5, 0, z), w.P(1.5, 0, z), w.P(2.2, 0, z + 2.6), w.P(-0.8, 0, z + 2.6)], 'la', 0.1); });
    return o + w.flush();
  };

  WALK.public = (c) => {
    const w = world(c, 2.1, 3.0, 17);
    let o = walkFrame(c, w, { farSvg: pal('public', ROOM.public(c)), wallL: 'wb', wallR: 'wa', floor: 'fa', gx: 1 });
    [-1, 1].forEach((sd) => { w.wq(sd, 1.3, 17, 0, 1.25, 'ha', 1); w.wq(sd, 1.3, 17, 1.25, 1.31, 'wc', 1); });
    [4, 8, 12].forEach((z) => { w.wq(-1, z - 0.5, z + 0.5, 0, 2.15, 'ia'); w.wq(-1, z - 0.3, z + 0.3, 1.1, 1.9, 'ga', 0.9); w.wq(-1, z - 0.1, z + 0.1, 2.25, 2.4, 'hc'); });
    [6, 10, 14].forEach((z) => { w.wq(1, z - 0.5, z + 0.5, 0, 2.15, 'ia'); w.wq(1, z - 0.3, z + 0.3, 1.1, 1.9, 'ga', 0.9); w.wq(1, z - 0.1, z + 0.1, 2.25, 2.4, 'hc'); });
    w.wq(1, 2.4, 4.4, 0.9, 2.0, 'ia'); w.wq(1, 2.5, 4.3, 1.0, 1.9, 'hb');
    [5.2, 5.9, 6.6].forEach((z) => { w.box(-2.1, -1.65, 0.42, 0.5, z - 0.25, z + 0.25, ['hc', 'hc', 'hc']); w.box(-2.1, -2.0, 0.5, 0.95, z - 0.25, z + 0.25, ['hc', 'hc', 'hc']); w.box(-2.0, -1.95, 0, 0.42, z - 0.2, z - 0.15, ['da', 'da', 'da']); });
    w.box(1.5, 2.1, 0, 1.4, 8.2, 8.9, ['ic', 'ic', 'ib']); w.box(1.5, 2.1, 0, 1.4, 11.2, 11.9, ['ic', 'ic', 'ib']);
    o += lightsRow(w, [3, 6.5, 10, 13.5], 0.45, 'la', 'lb', 0.4);
    return o + w.flush();
  };

  WALK.retail = (c) => {
    const w = world(c, 4.5, 3.8, 18);
    let o = walkFrame(c, w, { farSvg: pal('retail', ROOM.retail(c)), wallL: 'wb', wallR: 'wa', floor: 'fc', gx: 1.5 });
    w.wq(1, 5, 17, 0.3, 3.4, 'at', 1);
    [-1, 1].forEach((sd) => { for (let i = 0; i < 3; i++) w.wq(sd, 4 + i * 4.6, 7.4 + i * 4.6, 1.3 + (i % 2) * 0.3, 1.36 + (i % 2) * 0.3, 'ia'); });
    const col = ['ha', 'hb', 'hc', 'wc', 'ia', 'ha', 'hb'];
    [[5.0, 7.0], [7.8, 9.8], [10.6, 12.6], [13.4, 15.4]].forEach((s, i) => {
      w.box(-4.1, -3.0, 0.45, 1.55, s[0], s[1], [col[i], 'ic', col[i + 1]]); w.box(-4.1, -3.0, 1.55, 1.62, s[0], s[1], ['ic', 'ic', 'ic']);
      w.box(-4.1, -4.05, 0, 1.6, s[0], s[0] + 0.05, ['ic', 'ic', 'ic']); w.box(-3.05, -3.0, 0, 1.6, s[0], s[0] + 0.05, ['ic', 'ic', 'ic']);
      w.box(3.0, 4.1, 0.45, 1.55, s[0] + 0.6, s[1] + 0.6, [col[i + 2], 'ic', col[i + 3]]); w.box(3.0, 4.1, 1.55, 1.62, s[0] + 0.6, s[1] + 0.6, ['ic', 'ic', 'ic']);
    });
    w.box(-1.1, 1.1, 0, 0.85, 12.5, 14.2, ['ia', 'ic', 'ib']); w.box(-0.8, -0.1, 0.85, 0.95, 12.7, 13.4, ['ha', 'ha', 'ha']); w.box(0.1, 0.8, 0.85, 1.0, 12.8, 13.5, ['hb', 'hb', 'hb']);
    w.bb(-2.2, 0, 10.5, 1.7, mannequin(0, 0, 'ha', 'hb'), 154);
    w.bb(2.0, 0, 7.4, 1.7, mannequin(0, 0, 'hb', 'hc'), 154);
    o += w.cq(-3.2, -3.1, w.Zn, 18, 'da', 1) + w.cq(3.1, 3.2, w.Zn, 18, 'da', 1);
    [4, 7, 10, 13, 16].forEach((z) => { o += w.glow(-3.15, 3.7, z, 1.1, 'la', 0.5) + w.glow(3.15, 3.7, z, 1.1, 'la', 0.5) + w.poly([w.P(-3.1, 3.7, z), w.P(-2.9, 3.7, z), w.P(-1.6, 0, z + 0.6), w.P(-3.4, 0, z + 0.6)], 'la', 0.07) + w.poly([w.P(3.1, 3.7, z), w.P(2.9, 3.7, z), w.P(1.6, 0, z + 0.6), w.P(3.4, 0, z + 0.6)], 'la', 0.07); });
    return o + w.flush();
  };

  WALK.clinic = (c) => {
    const w = world(c, 3.2, 3.2, 18);
    let o = walkFrame(c, w, { farSvg: pal('clinic', ROOM.clinic(c)), wallL: 'ga', wallR: 'wa', floor: 'fa', gx: 1.6 });
    [-1, 1].forEach((sd) => {
      w.wq(sd, 1.3, 18, 0.1, 2.9, 'ga', 0.45); w.wq(sd, 1.3, 18, 0.1, 2.9, 'wh', 0.1);
      for (let z = 2; z < 18; z += 2.2) w.wq(sd, z, z + 0.1, 0, 3.2, 'ia', 0.95);
      w.wq(sd, 1.3, 18, 0, 0.12, 'ia'); w.wq(sd, 1.3, 18, 2.9, 3.2, 'ia', 0.9);
    });
    /* attrezzature oltre il vetro */
    [[5.0, 'L'], [9.5, 'L'], [13.5, 'L'], [6.8, 'R'], [11.5, 'R']].forEach((e) => { const X = e[1] === 'L' ? -4.4 : 4.4; w.box(X - 0.6, X + 0.6, 0, 1.5, e[0], e[0] + 1.6, ['ic', 'ic', 'ib'], 0.8); w.box(X - 0.4, X + 0.4, 1.5, 2.2, e[0] + 0.2, e[0] + 1.2, ['ga', 'ga', 'ga'], 0.55); });
    o += w.fq(-0.09, 0.09, w.Zn, 18, 'ha', 0.9) + lightsRow(w, [3, 6, 9, 12, 15], 1.1, 'la', 'lb', 0.3) + w.cq(-2.4, -2.3, w.Zn, 18, 'la', 0.8) + w.cq(2.3, 2.4, w.Zn, 18, 'la', 0.8);
    return o + w.flush();
  };

  WALK.port = (c) => {
    const w = world(c, 9, 14, 60);
    const CC = ['ia', 'ib', 'ic', 'ha', 'hb', 'hc'];
    const r = rng(133);
    let o = `<g transform="translate(0 -46)">${panoFar(c)}</g>`;
    /* banchina */
    const [qd, qu] = lg(c, 'v', [[0, 'fb'], [1, 'fa']]);
    o += w.fq(-9, 9, w.Zn, 60, 'fa') + qd + frg(flat([w.P(-9, 0, w.Zn), w.P(9, 0, w.Zn), w.P(9, 0, 60), w.P(-9, 0, 60)]), qu, 0.5);
    for (let x = -9; x <= 9; x += 3) o += ln(...w.P(x, 0, w.Zn), ...w.P(x, 0, 60), 'fb', 1, 0.3);
    for (let z = 2; z < 60; z += z < 8 ? 2 : z < 20 ? 4 : 10) o += ln(...w.P(-9, 0, z), ...w.P(9, 0, z), 'fb', 1, 0.25);
    o += w.fq(-3.55, -3.4, w.Zn, 60, 'ha') + w.fq(3.4, 3.55, w.Zn, 60, 'ha') + w.fq(-0.05, 0.05, w.Zn, 60, 'wh', 0.5);
    /* pile di container su entrambi i lati */
    [-1, 1].forEach((sd) => {
      for (let z = 6.0; z < 52; z += 6.4) for (let row = 0; row < 3; row++) {
        if (r() < 0.12 && row > 0) continue;
        const k = CC[(r() * CC.length) | 0];
        for (let col = 0; col < 2; col++) { const xa = sd < 0 ? -6.2 - col * 2.5 : 3.7 + col * 2.5; w.box(xa, xa + 2.4, row * 2.7, row * 2.7 + 2.6, z, z + 6.1, [col ? CC[(r() * CC.length) | 0] : k, 'wh', k], null, true); }
      }
    });
    /* pali delle luci */
    [8, 16, 26, 40].forEach((z) => { w.box(-3.9, -3.75, 0, 9, z, z + 0.15, ['da', 'da', 'da']); w.box(-4.2, -3.5, 9, 9.3, z - 0.1, z + 0.4, ['la', 'la', 'la']); });
    o += w.flush();
    const [fd, fu] = lg(c, 'v', [[0, 'wh', 0], [0.5, 'wh', 0.4], [1, 'wh', 0]]);
    o += fd + fr(0, 118, VW, 70, fu, 0.9) + glow(c, 720, 150, 260, 60, 'lb', 0.4);
    return o;
  };

  WALK.control = (c) => {
    const w = world(c, 5, 3.6, 16);
    let o = walkFrame(c, w, { farSvg: pal('control', ROOM.control(c)), wallL: 'wb', wallR: 'wa', floor: 'fa', sky: 'wb', ceil: 'ca', gx: 1.7 });
    [-1, 1].forEach((sd) => { for (let z = 5; z < 16; z += 2.5) { const x0 = sd < 0 ? -5 : 3.6, x1 = sd < 0 ? -3.6 : 5; w.box(x0, x1, 0, 0.74, z, z + 2.1, ['ib', 'ic', 'ia']); w.box(sd < 0 ? -4.3 : 4.0, sd < 0 ? -4.0 : 4.3, 0.74, 1.24, z + 0.4, z + 1.7, ['da', 'da', 'ga']); } });
    [-1, 1].forEach((sd) => { for (let z = 4; z < 16; z += 2.5) { w.glow(sd * 3.9, 1.0, z + 1.1, 0.55, 'ha', 0.35); } w.wq(sd, 1.3, 16, 1.5, 2.9, 'da', 0.5); });
    [-1, 1].forEach((sd) => { for (let z = 5; z < 16; z += 2.5) { w.bb(sd * 2.9, 0, z + 1.0, 1.05, pa('M-20 0C-22 -26 -14 -40 0 -40C14 -40 22 -26 20 0Z', 'da') + rc(-2.5, 0, 5, 26, 'da') + rc(-18, 26, 36, 4, 'da'), 56); } });
    o += w.cq(-0.12, 0.12, w.Zn, 16, 'hc', 0.85) + w.cq(-2.5, -2.38, w.Zn, 16, 'ha', 0.7) + w.cq(2.38, 2.5, w.Zn, 16, 'hb', 0.7);
    o += w.fq(-1.2, 1.2, 10, 16, 'ha', 0.08) + glow(c, 480, 175, 230, 55, 'ha', 0.22);
    return o + w.flush();
  };

  /* open space: uffici di giorno (office) e di sera (night) */
  function walkOffice(c, night) {
    const w = world(c, 5, 3.2, 18), nm = night ? 'night' : 'office';
    let o = walkFrame(c, w, { farSvg: pal(nm, ROOM[nm](c)), wallL: 'wb', wallR: 'wa', floor: 'fa', gx: 1.6 });
    /* vetrata a destra con il cielo */
    const [sd, su] = lg(c, 'v', [[0, 's1'], [0.7, 's2'], [1, 's3']]);
    o += sd + frg(flat([w.P(5, 0.1, 2), w.P(5, 0.1, 18), w.P(5, 3.0, 18), w.P(5, 3.0, 2)]), su);
    if (night) { const r = rng(5); for (let i = 0; i < 70; i++) { const z = 3 + r() * 14.5, y = 0.2 + r() * 2.6, p = w.P(5, y, z); o += rc(p[0] - 1, p[1] - 1, 2.4, 2.4, 'la', 0.8); } }
    for (let z = 2; z < 18; z += 2) o += w.wq(1, z, z + 0.1, 0, 3.2, 'ia', 0.95, true);
    o += w.wq(1, 1.3, 18, 0, 0.14, 'wb', 1, true);
    [-1, 1].forEach((sdn) => {
      for (let z = 5; z < 17; z += 3.1) {
        const x0 = sdn < 0 ? -4.9 : 2.5, x1 = sdn < 0 ? -2.5 : 4.0;
        w.box(x0, x1, 0.68, 0.74, z, z + 1.5, ['ic', 'ic', 'ia']);
        w.box(sdn < 0 ? -4.9 : 2.5, sdn < 0 ? -4.85 : 2.55, 0, 0.68, z, z + 1.5, ['ib', 'ib', 'ib']); w.box(sdn < 0 ? -2.55 : 3.95, sdn < 0 ? -2.5 : 4.0, 0, 0.68, z, z + 1.5, ['ib', 'ib', 'ib']);
        w.box(sdn < 0 ? -3.9 : 3.0, sdn < 0 ? -3.0 : 3.9, 0.74, 1.2, z + 0.5, z + 0.95, ['da', 'da', night && z > 6 ? 'hc' : 'ga']);
        w.box(sdn < 0 ? -4.9 : 4.0, sdn < 0 ? -4.8 : 4.1, 0.74, 1.3, z, z + 1.5, ['at', 'at', 'at']);
        if (night && z > 5) w.add(z, w.glow(sdn * 3.3, 0.9, z + 0.4, 0.5, 'la', 0.5));
      }
    });
    w.bb(-2.0, 0, 8.6, 1.2, plant(0, 0, 1, 'ac'), 44);
    o += lightsRow(w, [3, 6, 9, 12, 15], night ? 0.5 : 0.9, 'la', 'lb', night ? 0.25 : 0.3);
    return o + w.flush();
  }
  WALK.office = (c) => walkOffice(c, false);
  WALK.night = (c) => walkOffice(c, true);

  /* tablet tenuto con due mani: si vede solo il bordo superiore in basso */
  function tablet(c, x, y) {
    let o = gp(rc(-212, 0, 424, 90, 'db', null, 18) + rc(-203, 9, 406, 80, 'sf', null, 9) + rc(-203, 9, 406, 17, 'ac', 0.92, 0) + rc(-196, 14, 56, 6, 'wh', 0.85, 3) + rc(-190, 36, 150, 7, 'li', null, 3) + rc(-190, 50, 110, 7, 'li', null, 3) + rc(-20, 36, 190, 30, 'sg', null, 4) + rc(184, 14, 12, 6, 'wh', 0.85, 3), T(x, y));
    o += pg([x - 270, 392, x - 246, 364, x - 206, 372, x - 224, 392], 'sl') + pg([x - 252, 366, x - 208, 373, x - 210, 381, x - 254, 374], 'cf') + el(x - 204, y + 22, 15, 24, 'hd', null, 28) + el(x - 196, y + 8, 6, 15, 'hd', null, 62);
    o += pg([x + 270, 392, x + 246, 364, x + 206, 372, x + 224, 392], 'sl') + pg([x + 252, 366, x + 208, 373, x + 210, 381, x + 254, 374], 'cf') + el(x + 204, y + 22, 15, 24, 'hd', null, -28) + el(x + 196, y + 8, 6, 15, 'hd', null, -62);
    return o;
  }

  VIEW.walk = {
    env(c) { return (WALK[c.bg] || WALK.office)(c); },
    dyn(c) {
      const n = c.n, F = WLK.F;
      const POS = { 1: [[0, 3.8]], 2: [[-0.78, 4.0], [0.78, 4.0]], 3: [[-1.45, 4.3], [0, 4.8], [1.45, 4.3]], 4: [[-2.15, 4.5], [-0.72, 4.0], [0.72, 4.0], [2.15, 4.5]], 5: [[-2.9, 4.9], [-1.45, 4.15], [0, 4.7], [1.45, 4.15], [2.9, 4.9]] };
      const L = (POS[n] || []).map((q, i) => ({ p: c.people[i], X: q[0] + attrs(c.people[i]).jit * 0.06, Z: q[1] + attrs(c.people[i]).jit * 0.08 }));
      let ppl = '', lb = '';
      L.slice().sort((a, b) => b.Z - a.Z).forEach((q) => {
        const s = F * 1.75 / q.Z / 342, fy = WLK.YH + F * WLK.EYE / q.Z, sx = 480 + F * q.X / q.Z;
        ppl += person(q.p, sx, fy - 262 * s, s, { full: true });
      });
      const xs = L.map((q) => 480 + F * q.X / q.Z);
      L.forEach((q, i) => {
        const fy = WLK.YH + F * WLK.EYE / q.Z;
        let wd = 150;
        if (n === 1) wd = 190; else { for (let j = 0; j < n; j++) if (j !== i) wd = Math.min(wd, Math.abs(xs[j] - xs[i]) - 8); }
        lb += lbl(q.p, xs[i], fy + 5, Math.max(70, wd));
      });
      return { ppl, fg: tablet(c, 480, 366), lbl: lb };
    },
  };

  /* ═════════════ VISTA: la tua scrivania (CRM, telefono, tazza, parete dei contatti) ═════════════ */
  /* scheda-contatto appuntata: ritratto + didascalia (etichetta HTML) */
  function contactCard(c, p, x, y, w, h, rot) {
    const ph = h * 0.62;
    const back = rc(4, 5, w, h, 'bk', 0.2, 2);
    const photo = clip(6, 6, w - 12, ph, tileBg(c, c.bg, w - 12, ph) + portrait(p, w - 12, ph, { s: Math.min(ph / 124, (w - 12) / 150) }));
    return `<g transform="translate(${f(x)} ${f(y)}) rotate(${rot} ${f(w / 2)} 8)"><g class="vp-cd" data-k="${esc(p.key)}"><g class="vp-lift">${back}${rc(0, 0, w, h, 'pp', null, 2)}${photo}<rect class="vp-ring2" x="6" y="6" width="${f(w - 12)}" height="${f(ph)}"/>${ci(w / 2, 5, 3.8, 'bd')}${ci(w / 2 - 1, 4, 1.4, 'wh', 0.7)}</g></g></g>`;
  }

  VIEW.desk = {
    env(c) {
      const L = laptop(c, 258, 134, 392, 164, 40);
      c.scr = L;
      let o = ROOM[c.own](c);
      /* bacheca di sughero sulla parete */
      o += rc(112, 6, 736, 124, 'ib', null, 4) + rc(117, 11, 726, 114, 'ia', null, 2) + rc(117, 11, 726, 114, 'hc', 0.22, 2) + rep(110, (i) => ci(120 + ((i * 53) % 720), 14 + ((i * 29) % 106), 0.9 + (i % 3) * 0.3, 'ib', 0.3));
      o += deskTop(c, 298);
      o += glow(c, 454, 306, 300, 40, 'wh', 0.1);
      o += mug(150, 350, 1.6, 'wc') + ps('M142 306q-6 -10 0 -18t0 -14M156 308q-6 -10 0 -18t0 -14', 'wh', 2.2, 0.35);
      o += L.svg + rc(L.sx, L.sy, L.sw, L.sh, 'sf', null, 4);
      /* CRM: intestazione, righe con fase e importi */
      o += rc(L.sx, L.sy, L.sw, 15, 'ac', 0.95) + rc(L.sx + 8, L.sy + 5, 48, 5, 'wh', 0.9, 2.5) + rc(L.sx + L.sw - 56, L.sy + 5, 48, 5, 'wh', 0.5, 2.5);
      const stages = [['go', 'Commit'], ['wn', 'Best'], ['i3', 'Pipe'], ['go', 'Commit'], ['wn', 'Best'], ['i3', 'Pipe']];
      stages.forEach((s, i) => {
        const y = L.sy + 20 + i * 20;
        o += rc(L.sx + 6, y, L.sw - 12, 17, i === 1 ? 'ac' : 'sg', i === 1 ? 0.14 : 1, 2.5) + ci(L.sx + 15, y + 8.5, 4, i % 2 ? 'wn' : 'go') + rc(L.sx + 26, y + 4, 62 + (i * 13) % 40, 4, 'ik', 0.55, 2) + rc(L.sx + 26, y + 10, 40 + (i * 7) % 30, 3, 'i3', 0.6, 1.5);
        o += rc(L.sx + L.sw - 126, y + 3, 40, 11, s[0], 0.2, 5.5) + rc(L.sx + L.sw - 120, y + 7, 28, 3, s[0], 0.9, 1.5) + rc(L.sx + L.sw - 70, y + 5, 54, 6, 'ik', 0.35, 3);
      });
      o += sheen(L.sx, L.sy, L.sw, L.sh);
      return pal(c.own, o) + phoneFlat(792, 346, 1.55, -9, true);
    },
    dyn(c) {
      const n = c.n, w = n <= 4 ? 130 : 128, h = 120, sp = n <= 3 ? 156 : n === 4 ? 152 : 144;
      let lb = '', cards = '', str = '';
      const pts = [];
      c.people.forEach((p, i) => {
        const a = attrs(p), x = 480 + (i - (n - 1) / 2) * sp - w / 2, y = 14 + (i % 2) * 4 + a.jit * 2, rot = a.jit * 1.4;
        pts.push([x + w / 2, y + 5]);
        cards += contactCard(c, p, x, y, w, h, rot.toFixed(1));
        lb += lbl(p, x + w / 2, y + h * 0.62 + 11, w - 10, { cls: 'vp-lb--card' });
      });
      pts.forEach((p, i) => { if (i) str += ps(`M${f(pts[i - 1][0])} ${f(pts[i - 1][1])}Q${f((pts[i - 1][0] + p[0]) / 2)} ${f(Math.max(pts[i - 1][1], p[1]) + 24)} ${f(p[0])} ${f(p[1])}`, 'bd', 1.5, 0.75); });
      if (!n) {
        cards += rep(4, (i) => gp(rc(0, 0, 54, 54, ['la', 'hc', 'ha', 'wc'][i], 0.95, 1) + rc(7, 12, 40, 3, 'da', 0.35) + rc(7, 20, 30, 3, 'da', 0.3) + ci(27, 5, 3.3, 'bd'), T(190 + i * 150, 20 + (i % 2) * 20, 1, i * 3 - 4)));
        cards += gp(rc(0, 0, 76, 88, 'pp', null, 2) + rc(0, 0, 76, 17, 'bd', 0.85, 2) + rep(3, (r) => rep(5, (cc) => rc(6 + cc * 13, 24 + r * 17, 9, 11, 'i3', 0.35, 1.5))), T(676, 16, 1, 2));
      }
      return { ppl: str + cards, fg: typing(454, 424, 1.45), lbl: lb };
    },
  };

  /* ═════════════ VISTA: telefono in mano (chiamata o chat) ═════════════ */
  const isChat = (st) => st.mode === 'chat' || (st.mode !== 'call' && /chat|whatsapp|\bsms\b|messagg|teams chat|slack/i.test(String(st.where || '') + ' ' + String(st.caption || '')));

  /* avatar tondo con ritratto: cerchio di raggio r centrato in (x,y) */
  function avatarCircle(c, p, x, y, r, cls) {
    const id = c.nid();
    return `<g class="vp-cd" data-k="${esc(p.key)}"><defs><clipPath id="${id}"><circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/></clipPath></defs><circle class="vp-pulse" cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="none" stroke="currentColor" style="color:var(--vp-accent)" stroke-width="2"/><g clip-path="url(#${id})">${rc(x - r, y - r, r * 2, r * 2, 'wa')}${gp(tileBg(c, c.bg, r * 2, r * 2), T(x - r, y - r))}${gp(portrait(p, r * 2, r * 2, { s: r / 62, ny: r * 1.42 }), T(x - r, y - r))}</g><circle class="vp-ring2" cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/></g>`;
  }

  VIEW.phone = {
    env(c) {
      let o = ROOM[c.own](c) + deskTop(c, 298);
      const [hd, hu] = lg(c, 'v', [[0, 'wa', 0.46], [1, 'wa', 0.2]]);
      o += hd + fr(0, 0, VW, VH, hu);
      return pal(c.own, o) + `<rect width="${VW}" height="${VH}" fill="none"/>`;
    },
    dyn(c) {
      const st = c.st, n = c.n, chat = isChat(st);
      const PW = 176, PH = 340, cx = 500, cy = 200;
      const [bd, bu] = lg(c, 'v', [[0, 'ad', 1], [1, 'bk', 0.95]]);
      let o = el(cx + 10, cy + PH / 2 + 4, PW * 0.7, 16, 'bk', 0.25);
      let ph = rc(-PW / 2 - 6, -PH / 2 - 6, PW + 12, PH + 12, 'db', null, 26) + rc(-PW / 2, -PH / 2, PW, PH, 'bk', null, 21);
      let lb = '';
      const sw = PW - 12, sh = PH - 14, sx0 = -sw / 2, sy0 = -sh / 2;
      if (!chat) {
        ph += bd + fr(sx0, sy0, sw, sh, bu, null, 16) + rc(-26, sy0 + 5, 52, 12, 'bk', 0.95, 6) + rc(sx0 + 12, sy0 + 9, 22, 4, 'wh', 0.8, 2) + rc(sx0 + sw - 34, sy0 + 9, 22, 4, 'wh', 0.8, 2);
        const slots = n <= 1 ? [[0, -98, 40]] : n === 2 ? [[-36, -92, 30], [36, -92, 30]] : n === 3 ? [[-48, -96, 25], [0, -96, 25], [48, -96, 25]] : n === 4 ? [[-34, -110, 21], [34, -110, 21], [-34, -48, 21], [34, -48, 21]] : [[-46, -116, 19], [0, -116, 19], [46, -116, 19], [-24, -54, 19], [24, -54, 19]];
        if (!n) {
          ph += rep(12, (i) => ci(-44 + (i % 3) * 44, -104 + Math.floor(i / 3) * 36, 14, 'wh', 0.16) + rc(-47 + (i % 3) * 44, -105 + Math.floor(i / 3) * 36, 6, 2.4, 'wh', 0.7, 1));
        }
        const lbPos = [];
        c.people.forEach((p, i) => { const s = slots[i]; ph += avatarCircle(c, p, s[0], s[1], s[2]); lbPos.push([cx + s[0], cy + s[1] + s[2] + 5, s[2]]); });
        /* controlli di chiamata */
        ph += [-54, 0, 54].map((bx) => ci(bx, 78, 17, 'wh', 0.22)).join('') + ci(0, 126, 22, 'bd') + rc(-9, 123.5, 18, 5, 'wh', 1, 2.5).replace('class="k-wh"', 'class="k-wh" transform="rotate(135 0 126)"');
        ph += rc(-61, 74, 14, 9, 'wh', 0.85, 2.5) + rc(-7, 73, 14, 10, 'wh', 0.85, 3) + rc(47, 73, 14, 10, 'wh', 0.85, 3);
        if (n === 1) lb += lbl(c.people[0], lbPos[0][0], lbPos[0][1], 160, { cls: 'vp-lb--ph' });
        else if (n > 1) { const yb = Math.max.apply(null, lbPos.map((q) => q[1])) + 0; c.people.forEach((p) => { lb += lbl(p, cx, yb, 150, { cls: 'vp-lb--ph vp-lb--sp' }); }); }
        if (st.caption || n) lb += tx(cx - 70, cy + (n >= 4 ? 24 : 14), 140, '<span>In chiamata</span>', 'vp-tx--c vp-tx--m vp-tx--w vp-tx--l1');
      } else {
        const who = c.people[0];
        ph += rc(sx0, sy0, sw, sh, 'sf', null, 16) + rc(sx0, sy0, sw, 40, 'ad', 1, 16) + rc(sx0, sy0 + 20, sw, 20, 'ad', 1);
        ph += rc(-26, sy0 + 5, 52, 12, 'bk', 0.95, 6) + rc(sx0 + 12, sy0 + 9, 22, 4, 'wh', 0.8, 2) + rc(sx0 + sw - 34, sy0 + 9, 22, 4, 'wh', 0.8, 2);
        if (who) ph += avatarCircle(c, who, sx0 + 28, sy0 + 40, 14);
        ph += ps(`M${f(sx0 + 12)} ${f(sy0 + 40)}l-5 -5m5 5l-5 5`, 'wh', 1.8, 0.9);
        const bub = [[-1, 66, 0.9], [1, 54, 1], [-1, 80, 0.9], [1, 40, 1], [-1, 60, 0.9]];
        bub.forEach((b, i) => { const y = sy0 + 62 + i * 38, wd = b[1] + 24; ph += rc(b[0] < 0 ? sx0 + 10 : sx0 + sw - 10 - wd, y, wd, 28, b[0] < 0 ? 'sg' : 'ac', b[0] < 0 ? 1 : 0.9, 11) + rc(b[0] < 0 ? sx0 + 20 : sx0 + sw - 10 - wd + 10, y + 8, wd - 20, 4, b[0] < 0 ? 'i3' : 'wh', 0.7, 2) + rc(b[0] < 0 ? sx0 + 20 : sx0 + sw - 10 - wd + 10, y + 16, (wd - 20) * 0.6, 4, b[0] < 0 ? 'i3' : 'wh', 0.5, 2); });
        ph += rc(sx0 + 8, sy0 + sh - 38, sw - 16, 28, 'sg', null, 14) + rc(sx0 + 20, sy0 + sh - 28, 70, 4, 'i3', 0.5, 2) + ci(sx0 + sw - 26, sy0 + sh - 24, 9, 'ac');
        if (who) lb += lbl(who, cx + sx0 + 70, cy + sy0 + 4, 100, { cls: 'vp-lb--ph', one: true });
      }
      ph += pg([sx0 + sw * 0.5, -PH / 2 + 2, sx0 + sw * 0.82, -PH / 2 + 2, sx0 + sw * 0.28, PH / 2 - 2, sx0 - 2, PH / 2 - 2], 'wh', 0.05);
      o += gp(ph, `translate(${cx} ${cy}) rotate(-4)`);
      /* mano che regge il telefono */
      let hh = '';
      hh += pa('M-62 150C-70 188 -50 220 -6 232L84 232C106 212 104 182 94 150Z', 'hd');
      [[-34, 46], [-6, 22], [22, 0]].forEach((q) => { hh += ''; });
      hh += rc(86, -62, 20, 34, 'hd', null, 10) + rc(88, -22, 20, 36, 'hd', null, 10) + rc(88, 18, 20, 36, 'hd', null, 10) + rc(84, 58, 20, 34, 'hd', null, 10) + ln(88, -28, 106, -28, 'hh', 1.2, 0.7) + ln(88, 12, 108, 12, 'hh', 1.2, 0.7) + ln(86, 52, 104, 52, 'hh', 1.2, 0.7);
      hh += el(-80, 74, 15, 42, 'hd', null, 14) + pa('M-92 56C-90 70 -88 84 -84 96', 'hh', 0.5);
      let fg = gp(hh, `translate(${cx} ${cy}) rotate(-4)`);
      fg += pg([cx + 40, 392, cx + 70, 356, cx + 226, 372, cx + 214, 392], 'sl');
      return { ppl: o, fg, lbl: lb };
    },
  };

  /* ═════════════ VISTA: email aperta sul laptop ═════════════ */
  VIEW.mail = {
    env(c) {
      const L = laptop(c, 170, 24, 620, 268, 62);
      c.scr = L;
      const { sx, sy, sw, sh } = L;
      let o = ROOM[c.own](c) + deskTop(c, 296) + mug(96, 338, 1.5, 'wc') + phoneFlat(878, 326, 1.15, 12, true) + glow(c, 480, 300, 380, 60, 'wh', 0.1);
      o += L.svg + rc(sx, sy, sw, sh, 'sf', null, 5);
      /* client di posta: barra, cartelle, elenco messaggi */
      o += rc(sx, sy, sw, 20, 'sg') + ci(sx + 11, sy + 10, 3, 'bd') + ci(sx + 21, sy + 10, 3, 'wn') + ci(sx + 31, sy + 10, 3, 'go') + rc(sx + sw / 2 - 70, sy + 4.5, 140, 11, 'li', 0.9, 5.5) + rc(sx + sw - 54, sy + 5, 44, 10, 'ac', 0.9, 5);
      o += rc(sx, sy + 20, 84, sh - 20, 'sg') + rc(sx, sy + 20, 84, 1, 'li');
      ['ac', 'i3', 'i3', 'i3', 'i3'].forEach((k, i) => { o += rc(sx + 8, sy + 32 + i * 22, 7, 7, k, k === 'ac' ? 1 : 0.55, 2) + rc(sx + 20, sy + 33 + i * 22, 44 - (i % 3) * 8, 5, i ? 'i3' : 'ik', i ? 0.45 : 0.7, 2.5); });
      o += rc(sx + 84, sy + 20, 1, sh - 20, 'li') + rc(sx + 244, sy + 20, 1, sh - 20, 'li');
      for (let i = 0; i < 5; i++) {
        const y = sy + 24 + i * 44;
        o += rc(sx + 86, y, 158, 42, i === 0 ? 'ac' : 'sf', i === 0 ? 0.13 : 1) + (i === 0 ? rc(sx + 86, y, 3, 42, 'ac') : '') + rc(sx + 86, y + 41, 158, 1, 'li', 0.8);
        o += ci(sx + 106, y + 16, 8, ['hc', 'ha', 'ac', 'wn', 'i3'][i], 0.85) + rc(sx + 122, y + 9, 70 - (i % 3) * 10, 5, 'ik', i === 0 ? 0.75 : 0.5, 2.5) + rc(sx + 122, y + 19, 108 - (i % 2) * 24, 4, 'i3', 0.6, 2) + rc(sx + 122, y + 28, 86 - (i % 3) * 14, 4, 'i3', 0.4, 2);
      }
      o += sheen(sx, sy, sw, sh);
      return pal(c.own, o);
    },
    dyn(c) {
      const L = c.scr, { sx, sy, sw, sh } = L, st = c.st, mail = st.mail || {};
      const x0 = sx + 244, wp = sw - 244;
      const sender = c.people[0] || { key: 'mittente', name: mail.from || 'Mittente', role: '', hue: 210 };
      const fromName = mail.from || sender.name;
      let ppl = '', lb = '';
      ppl += avatarCircle(c, sender, x0 + 30, sy + 52, 20);
      c.people.slice(1, 5).forEach((p, i) => { ppl += avatarCircle(c, p, sx + sw - 22 - i * 17, sy + 40, 9); });
      const tm = /\d{1,2}[:.]\d{2}/.exec(String(st.when || st.caption || ''));
      lb += tx(x0 + 58, sy + 27, wp - 58 - (c.n > 1 ? 74 : 12), `<b>${esc(fromName)}</b>`, 'vp-tx--l1');
      lb += tx(x0 + 58, sy + 57, wp - 58 - (c.n > 1 ? 74 : 12), esc(sender.role || (tm ? 'Oggi alle ' + tm[0] : 'Posta in arrivo')), 'vp-tx--m vp-tx--l1');
      lb += tx(x0 + 12, sy + 88, wp - 24, `<b>${esc(mail.subj || st.caption || st.where || 'Nessun oggetto')}</b>`, 'vp-tx--l2');
      ppl += rc(x0 + 12, sy + 152, wp - 24, 1, 'li');
      [0.96, 0.9, 0.97, 0.62].forEach((k, i) => { ppl += rc(x0 + 12, sy + 162 + i * 11, (wp - 24) * k, 4, 'i3', 0.45, 2); });
      ppl += rc(x0 + 12, sy + sh - 34, 118, 22, 'sg', null, 5) + rc(x0 + 20, sy + sh - 27, 8, 9, 'i3', 0.6, 2) + rc(x0 + 34, sy + sh - 25, 84, 4, 'i3', 0.5, 2) + rc(x0 + 34, sy + sh - 19, 56, 3, 'i3', 0.35, 1.5);
      ppl += rc(x0 + wp - 70, sy + sh - 34, 58, 22, 'ac', 0.95, 5) + rc(x0 + wp - 60, sy + sh - 25, 38, 4, 'wh', 0.9, 2);
      return { ppl, fg: typing(480, 428, 1.5), lbl: lb };
    },
  };

  /* ═════════════ VISTA: in auto (cruscotto, volante, strada) ═════════════ */
  const HY = 152, VPX = 548;
  /* profilo dell'orizzonte per ambiente (base a y = HY) */
  const HORIZON = {
    lab: () => el(300, HY + 6, 380, 22, 'wb', 0.7) + el(760, HY + 8, 300, 18, 'wb', 0.6) + rc(120, HY - 26, 150, 26, 'wc') + rc(120, HY - 30, 150, 4, 'ia') + rc(290, HY - 38, 100, 38, 'wc') + rc(290, HY - 42, 100, 4, 'ia') + rc(410, HY - 18, 56, 18, 'ia', 0.8) + rc(420, HY - 62, 8, 62, 'ib') + rc(398, HY - 62, 52, 5, 'ha') + [60, 84, 640, 668, 700, 840, 872].map((x, i) => pg([x - 11, HY, x + 11, HY, x, HY - 40 - (i % 3) * 8], 'hc', 0.9)).join(''),
    factory: () => el(240, HY + 8, 330, 24, 'hb', 0.28) + el(780, HY + 10, 360, 28, 'hb', 0.25) + [[110, 150], [330, 120], [500, 90]].map((s) => pg([s[0], HY, s[0], HY - 28, s[0] + s[1] * 0.25, HY - 42, s[0] + s[1] * 0.25, HY - 28, s[0] + s[1] * 0.5, HY - 42, s[0] + s[1] * 0.5, HY - 28, s[0] + s[1] * 0.75, HY - 42, s[0] + s[1] * 0.75, HY - 28, s[0] + s[1], HY - 28, s[0] + s[1], HY], 'wc')).join('') + rc(150, HY - 76, 6, 38, 'ib') + [640, 676, 712, 748, 796, 832].map((x, i) => el(x, HY - 20, 5, 28 + (i % 3) * 6, 'ha', 0.9)).join(''),
    night: (c) => { const r = rng(17); return clip(0, HY - 90, VW, 90, skyline(0, VW, 90, r, { hmin: 22, hmax: 80, wmin: 22, wmax: 54, c: 'da', o: 0.82, lit: 'la', pl: 0.3 })); },
    public: () => el(500, HY + 6, 520, 20, 'ha', 0.35) + [140, 230, 320, 640, 730, 830].map((x, i) => rc(x, HY - 22 - (i % 3) * 6, 56, 22 + (i % 3) * 6, 'wc') + pg([x - 4, HY - 22 - (i % 3) * 6, x + 60, HY - 22 - (i % 3) * 6, x + 28, HY - 44 - (i % 3) * 6], 'bd', 0.75)).join('') + rc(420, HY - 70, 22, 70, 'wc') + pg([416, HY - 70, 446, HY - 70, 431, HY - 92], 'ia') + rc(425, HY - 58, 12, 14, 'da', 0.5) + [60, 600, 880].map((x) => ci(x, HY - 14, 15, 'hc', 0.85) + rc(x - 2, HY - 2, 4, 6, 'ib')).join(''),
    retail: () => [[90, 90], [200, 120], [640, 110], [770, 100]].map((s, i) => rc(s[0], HY - 28, s[1], 28, 'wc') + rc(s[0], HY - 28, s[1], 5, ['ha', 'hb', 'hc', 'ha'][i]) + rc(s[0] + 8, HY - 16, s[1] - 16, 12, 'ga', 0.9)).join('') + rc(500, HY - 66, 6, 66, 'da') + rc(480, HY - 84, 46, 20, 'ha', null, 3) + rc(486, HY - 78, 34, 3, 'wh', 0.8) + rc(486, HY - 72, 22, 3, 'wh', 0.6),
    clinic: () => el(500, HY + 6, 480, 16, 'hb', 0.2) + [[120, 54, 74], [190, 40, 52], [660, 60, 80], [740, 44, 58], [810, 56, 66]].map((s) => rc(s[0], HY - s[2], s[1], s[2], 'ga', 0.95) + [0, 1, 2, 3, 4, 5].map((k) => ln(s[0], HY - s[2] + k * (s[2] / 6), s[0] + s[1], HY - s[2] + k * (s[2] / 6), 'wh', 1, 0.5)).join('') + pg([s[0] + s[1] * 0.2, HY - s[2], s[0] + s[1] * 0.55, HY - s[2], s[0] + s[1] * 0.2, HY, s[0] - s[1] * 0.1, HY], 'wh', 0.16)).join('') + [60, 340, 600, 900].map((x) => ci(x, HY - 12, 12, 'hb', 0.8) + rc(x - 1.5, HY - 2, 3, 5, 'ib')).join(''),
    port: () => rc(0, HY - 6, VW, 8, 'ga', 0.9) + [[130, 60], [210, 74], [700, 66], [830, 54]].map((s) => pg([s[0], HY, s[0] + 6, HY, s[0] + 10, HY - s[1], s[0] + 2, HY - s[1]], 'da', 0.75) + rc(s[0] - 14, HY - s[1], 60, 3, 'da', 0.75)).join('') + [300, 346, 392, 440, 560, 606, 652].map((x, i) => rc(x, HY - 14 - (i % 2) * 8, 42, 14 + (i % 2) * 8, ['ia', 'ib', 'ic', 'ha', 'hb', 'ia', 'ib'][i], 0.95)).join(''),
    control: () => el(280, HY + 8, 340, 22, 'wb', 0.5) + el(800, HY + 8, 320, 20, 'wb', 0.45) + [[150, 62], [260, 48], [720, 58], [850, 66]].map((s) => rc(s[0] - 1.5, HY - s[1], 3, s[1], 'wh', 0.9) + ci(s[0], HY - s[1], 3, 'wh') + [0, 120, 240].map((a) => ln(s[0], HY - s[1], s[0] + Math.sin(a * Math.PI / 180) * 26, HY - s[1] - Math.cos(a * Math.PI / 180) * 26, 'wh', 2, 0.9, 1)).join('')).join('') + [400, 560].map((x) => ps(`M${x - 12} ${HY}L${x - 5} ${HY - 38}L${x + 5} ${HY - 38}L${x + 12} ${HY}M${x - 20} ${HY - 30}H${x + 20}M${x - 14} ${HY - 38}H${x + 14}`, 'da', 1.6, 0.8)).join('') + ps(`M400 ${HY - 34}Q480 ${HY - 24} 560 ${HY - 34}`, 'da', 1, 0.7),
    office: (c) => { const r = rng(23); return clip(0, HY - 100, VW, 100, skyline(0, VW, 100, r, { hmin: 24, hmax: 92, wmin: 24, wmax: 56, c: 'da', o: 0.22, gap: 1 }) + skyline(0, VW, 100, r, { hmin: 14, hmax: 56, wmin: 26, wmax: 60, c: 'da', o: 0.34, gap: 1 })); },
  };

  /* mano che stringe il volante (pugno) con avambraccio che sale dal bordo inferiore */
  function fist(x, y, rot, mirror) {
    let o = gp(pg([-20, 12, 22, 12, 58, 160, 6, 160], 'sl') + rc(-24, 0, 46, 14, 'cf', null, 4), '');
    o += gp(rc(-24, -16, 50, 30, 'hd', null, 13) + ln(-8, -14, -8, 12, 'hh', 1.2, 0.7) + ln(4, -14, 4, 12, 'hh', 1.2, 0.7) + ln(15, -14, 15, 12, 'hh', 1.2, 0.7) + el(-16, -19, 12, 7, 'hd', null, -18), '');
    return gp(gp(o, mirror ? 'scale(-1 1)' : ''), T(x, y, 1, rot));
  }

  VIEW.car = {
    env(c) {
      const [sd, su] = lg(c, 'v', [[0, 's1'], [0.7, 's2'], [1, 's3']]);
      let o = sd + fr(0, 0, VW, HY, su) + glow(c, 700, HY - 6, 260, 50, 'lb', 0.5);
      o += el(200, 40, 130, 8, 'wh', 0.4) + el(640, 62, 170, 7, 'wh', 0.34);
      o += (HORIZON[c.bg] || HORIZON.office)(c);
      /* campagna/città ai lati e carreggiata */
      const [gd, gu] = lg(c, 'v', [[0, 'fc'], [1, 'fa']]);
      o += rc(0, HY, VW, 300 - HY, 'fa') + gd + fr(0, HY, VW, 300 - HY, gu);
      o += pg([VPX - 2, HY, VPX + 2, HY, 960, 300, 70, 300], 'bk', 0.55) + pg([VPX - 2, HY, VPX + 2, HY, 880, 300, 150, 300], 'bk', 0.12);
      o += ln(VPX - 1, HY, 66, 300, 'wh', 2.2, 0.85) + ln(VPX + 1, HY, 970, 300, 'wh', 2.2, 0.85);
      for (let k = 0; k < 7; k++) { const t0 = Math.pow(k / 7, 1.9), t1 = Math.pow((k + 0.45) / 7, 1.9), y0 = HY + (300 - HY) * t0, y1 = HY + (300 - HY) * t1, wd0 = 0.5 + 6 * t0, wd1 = 0.5 + 6 * t1; o += pg([VPX - wd0 / 2 + 0.1, y0, VPX + wd0 / 2 + 0.1, y0, VPX + wd1 / 2 + 0.1 + (t1 * 10), y1, VPX - wd1 / 2 + 0.1 + (t1 * 10), y1], 'wh', 0.85); }
      /* guardrail e lampioni */
      o += ps(`M${VPX - 8} ${HY + 1}L130 ${HY + 100}`, 'ib', 2, 0.55) + ps(`M${VPX + 8} ${HY + 1}L930 ${HY + 100}`, 'ib', 2, 0.55);
      [[0.16, -1], [0.34, -1], [0.58, -1], [0.2, 1], [0.42, 1], [0.68, 1]].forEach((p) => { const t = p[0], y = HY + (300 - HY) * t, x = VPX + p[1] * (30 + 480 * t), hh = 90 * t + 6; o += rc(x - 1.2 * (0.5 + t * 3), y - hh, 1.2 + t * 4, hh, 'da', 0.8) + rc(x - 7 * (0.5 + t), y - hh - 2, 10 * (0.5 + t), 2 + t * 3, 'da', 0.85); });
      /* veicolo davanti */
      o += rc(VPX - 22, HY + 8, 26, 17, 'ib', 0.95, 2) + rc(VPX - 20, HY + 11, 22, 6, 'ga', 0.75) + ci(VPX - 18, HY + 22, 2, 'bd') + ci(VPX - 4, HY + 22, 2, 'bd') + rc(VPX - 22, HY + 24, 26, 2, 'bk', 0.4);
      /* montanti, specchietto, cruscotto */
      o += pg([0, 0, 76, 0, 38, 296, 0, 296], 'db') + pg([960, 0, 892, 0, 928, 296, 960, 296], 'db') + pg([60, 0, 76, 0, 38, 296, 30, 296], 'wh', 0.07) + pg([896, 0, 892, 0, 928, 296, 934, 296], 'wh', 0.07);
      o += rc(560, 8, 150, 38, 'db', null, 12) + rc(566, 13, 138, 28, 's2', 0.7, 8) + pg([580, 13, 610, 13, 590, 41, 566, 41], 'wh', 0.18) + rc(626, 0, 8, 10, 'db');
      o += pg([120, 0, 330, 0, 250, 296, 30, 296], 'wh', 0.04);
      const [dd, du] = lg(c, 'v', [[0, 'db'], [1, 'bk']]);
      o += pa('M0 296Q480 262 960 296L960 392L0 392Z', 'db') + dd + frp('M0 296Q480 262 960 296L960 392L0 392Z', du, 0.5) + ps('M0 296Q480 262 960 296', 'wh', 1.4, 0.16);
      o += rc(430, 260, 124, 66, 'bk', null, 7) + rc(435, 265, 114, 56, 'ga', 0.8, 4) + ps('M440 306C456 296 466 292 484 286S520 282 544 270', 'ac', 3, 0.9) + ps('M440 282L474 282L484 300L544 300', 'wh', 1.4, 0.4) + ci(512, 290, 4, 'wn') + rc(440, 270, 30, 5, 'wh', 0.55, 2);
      o += rc(570, 296, 52, 6, 'bk', 0.8, 3) + rep(5, (i) => ln(574 + i * 9, 298, 574 + i * 9, 301, 'kb', 1.2));
      /* quadro strumenti */
      o += rc(184, 292, 232, 66, 'bk', null, 12) + rc(190, 298, 220, 52, 'da', null, 9) + [226, 374].map((x) => ci(x, 326, 22, 'bk') + ps(`M${x - 17} ${336}A19 19 0 1 1 ${x + 17} ${336}`, 'ha', 2.4, 0.9) + ln(x, 326, x + 11, 316, 'bd', 2, null, 1) + ci(x, 326, 3, 'wh')).join('') + rc(284, 318, 32, 12, 'bk', null, 3) + rc(288, 322, 16, 3, 'ha', 0.9) + rc(288, 327, 24, 2, 'ha', 0.5);
      return pal(c.bg, o);
    },
    dyn(c) {
      const n = c.n;
      let fg = '';
      /* volante e mani */
      fg += `<g>${ps('M188 414C170 372 186 316 236 292C262 280 338 280 364 292C414 316 430 372 412 414', 'db', 24)}${ps('M200 400C186 362 198 322 240 302C264 292 336 292 360 302', 'kb', 3, 0.45)}${rc(272, 276, 56, 10, 'bd', 0.9, 3)}${ps('M178 398C230 372 370 372 422 398', 'db', 20)}${el(300, 394, 52, 24, 'db')}${el(300, 391, 40, 16, 'kb', 0.3)}</g>`;
      fg += fist(212, 330, 24, false) + fist(388, 330, -24, true);
      /* telefono sul supporto */
      const px = 676, py = 322, PW = 118, PH = 196;
      let ph = rc(-PW / 2 - 5, -PH / 2 - 5, PW + 10, PH + 10, 'bk', null, 16) + rc(-PW / 2, -PH / 2, PW, PH, 'bk', null, 12);
      const [bd, bu] = lg(c, 'v', [[0, 'ad', 1], [1, 'bk', 0.95]]);
      const sw = PW - 8, sh = PH - 10;
      ph += bd + fr(-sw / 2, -sh / 2, sw, sh, bu, null, 10) + rc(-16, -sh / 2 + 3, 32, 7, 'bk', 0.95, 3.5);
      const slots = n <= 1 ? [[0, -34, 30]] : n === 2 ? [[-24, -38, 22], [24, -38, 22]] : n === 3 ? [[-30, -46, 17], [0, -46, 17], [30, -46, 17]] : n === 4 ? [[-22, -52, 18], [22, -52, 18], [-22, -14, 18], [22, -14, 18]] : [[-30, -54, 15], [0, -54, 15], [30, -54, 15], [-15, -22, 15], [15, -22, 15]];
      c.people.forEach((p, i) => { ph += avatarCircle(c, p, slots[i][0], slots[i][1], slots[i][2]); });
      if (!n) ph += rep(12, (i) => ci(-24 + (i % 3) * 24, -48 + Math.floor(i / 3) * 22, 8, 'wh', 0.16));
      ph += [-30, 0, 30].map((bx) => ci(bx, 42, 10, 'wh', 0.22)).join('') + ci(0, 72, 13, 'bd') + rc(-6, 70.4, 12, 3.4, 'wh', 1, 1.7).replace('class="k-wh"', 'class="k-wh" transform="rotate(135 0 72)"');
      let fx = gp(ph, `translate(${px} ${py}) rotate(3)`);
      fx = gp(rc(-12, 70, 24, 70, 'db').replace('<rect', '<rect transform="translate(0 0)"'), `translate(${px} ${py + 40})`) + fx;
      fg = fx + fg;
      /* etichetta: nome e ruolo di chi parla (una per persona; il CSS mostra quella attiva) */
      const lb = c.people.map((p) => lbl(p, px - 4, py - PH / 2 - 8, 168, { bottom: true, cls: 'vp-lb--car vp-lb--sp' })).join('');
      return { ppl: '', fg, lbl: lb };
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
    svg.innerHTML = `<defs><linearGradient id="${uid}tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".13"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient></defs><g class="vp-g1"></g><g class="vp-g2"></g><g class="vp-g3"></g><g class="vp-g4"></g>`;
    const gEnv = svg.childNodes[1], gPpl = svg.childNodes[2], gFg = svg.childNodes[3], gFx = svg.childNodes[4];
    gFx.innerHTML = `<g class="vp-you" transform="translate(480 384)"><path d="M-34 0C-28 -14 28 -14 34 0" class="s-ac" stroke-width="2.6" stroke-linecap="round"/><path d="M-58 0C-46 -24 46 -24 58 0" class="s-ac" stroke-width="2.6" stroke-linecap="round"/><path d="M-84 0C-66 -34 66 -34 84 0" class="s-ac" stroke-width="2.6" stroke-linecap="round"/></g>`;
    const lbBox = h('div', { class: 'vp-lbls' });
    const ov = h('div', { class: 'vp-ov', 'aria-hidden': 'true' }, lbBox);
    const tWhen = h('span'), tWhere = h('span');
    const t1 = h('div', { class: 'vp-tag vp-t1', hidden: '' }, tWhen, tWhere);
    const tCap = h('span');
    const t2 = h('div', { class: 'vp-tag vp-t2', hidden: '' }, h('i'), tCap);
    const tags = h('div', { class: 'vp-tags', 'aria-hidden': 'true' }, t1, t2);
    const root = h('div', { class: 'vp' }, svg, ov);                       /* la scena */
    const el = h('div', { class: 'vp-root' }, tags, root);                 /* involucro: scena + barra/overlay dei tag */

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
      tags.hidden = !when && !where && !cap;

      svg.setAttribute('aria-label', `${VIEW_LABEL[view]}${people.length ? ' con ' + joinNames(people.map((p) => p.name)) : ''} · ${BG_LABEL[bg]}`);

      const c = { nid, bg, own, amb, view, people, n: people.length, st };
      TG = uid;
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
      if (el.parentNode) el.parentNode.removeChild(el);
      envCache.clear();
      gEnv.innerHTML = gPpl.innerHTML = gFg.innerHTML = '';
      lbBox.innerHTML = '';
    }

    return { el, set, speak, destroy };
  };

  UI.viewportBgs = BGS.slice();
  UI.viewportViews = VIEWS.slice();
  UI.viewportDeduce = deduceView;
})(typeof window !== 'undefined' ? window : globalThis);
