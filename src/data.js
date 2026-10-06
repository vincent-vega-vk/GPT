/* Super Rigori World Cup — dati: squadre, bandiere, giocatori fittizi, tiri speciali */
(function (root) {
  'use strict';
  const PK = (root.PK = root.PK || {});
  const M = PK.M;

  // ------------------------------------------------------------------ squadre
  // atk = precisione/potenza dei rigoristi, gk = bravura del portiere (0-100)
  const T = (code, name, conf, atk, gk, shirt, trim, shorts, socks, pool, flag) => ({
    code, name, conf, atk, gk, pool,
    kit: { shirt, trim, shorts, socks },
    flag,
  });

  const G = '#009246', W = '#ffffff', R = '#ce2b37', BLK = '#111111', Y = '#fcd116', BL = '#0055a4';

  PK.TEAMS = [
    T('BRA', 'Brasile', 'CONMEBOL', 91, 84, '#ffd800', '#0a8f3c', '#1650b4', '#ffffff', 'pt',
      { t: 'solid', c: '#0a9a3f', o: [{ k: 'dia', c: '#ffdf00' }, { k: 'disc', x: .5, y: .5, r: .2, c: '#1d3f9a' }] }),
    T('FRA', 'Francia', 'UEFA', 90, 87, '#1b3f95', '#ffffff', '#ffffff', '#c8102e', 'fr',
      { t: 'v', c: ['#0055a4', W, '#ef4135'] }),
    T('ARG', 'Argentina', 'CONMEBOL', 89, 89, '#7ec8ee', '#ffffff', '#111111', '#ffffff', 'es',
      { t: 'h', c: ['#74acdf', W, '#74acdf'], o: [{ k: 'disc', x: .5, y: .5, r: .09, c: '#f6b40e' }] }),
    T('ENG', 'Inghilterra', 'UEFA', 87, 85, '#f4f4f4', '#1b2a6b', '#1b2a6b', '#ffffff', 'en',
      { t: 'solid', c: W, o: [{ k: 'cross', c: '#cf142b', w: .17, x: .5 }] }),
    T('ESP', 'Spagna', 'UEFA', 88, 84, '#d6182a', '#ffd800', '#1b2a6b', '#d6182a', 'es',
      { t: 'h', c: ['#aa151b', '#f1bf00', '#aa151b'], w: [1, 2, 1] }),
    T('GER', 'Germania', 'UEFA', 87, 85, '#f2f2f2', '#111111', '#111111', '#f2f2f2', 'de',
      { t: 'h', c: ['#000000', '#dd0000', '#ffce00'] }),
    T('POR', 'Portogallo', 'UEFA', 87, 81, '#a3122a', '#0a6b32', '#0a6b32', '#a3122a', 'pt',
      { t: 'v', c: ['#046a38', '#da291c'], w: [2, 3], o: [{ k: 'disc', x: .4, y: .5, r: .17, c: '#ffe000' }, { k: 'disc', x: .4, y: .5, r: .09, c: '#da291c' }] }),
    T('NED', 'Paesi Bassi', 'UEFA', 85, 84, '#ff6a13', '#111111', '#ff6a13', '#ff6a13', 'nl',
      { t: 'h', c: ['#ae1c28', W, '#21468b'] }),
    T('ITA', 'Italia', 'UEFA', 85, 88, '#1e5bd8', '#ffffff', '#ffffff', '#1e5bd8', 'it',
      { t: 'v', c: [G, W, R] }),
    T('BEL', 'Belgio', 'UEFA', 83, 80, '#c8102e', '#111111', '#c8102e', '#c8102e', 'nl',
      { t: 'v', c: [BLK, Y, '#ef3340'] }),
    T('CRO', 'Croazia', 'UEFA', 80, 88, '#f4f4f4', '#d6182a', '#ffffff', '#d6182a', 'hr',
      { t: 'h', c: ['#ff0000', W, '#171796'], o: [{ k: 'check', x: .5, y: .5, w: .22, h: .32 }] }),
    T('URU', 'Uruguay', 'CONMEBOL', 83, 82, '#6fb7e6', '#111111', '#111111', '#111111', 'es',
      { t: 'h', c: [W, '#0038a8', W, '#0038a8', W, '#0038a8', W, '#0038a8', W], o: [{ k: 'rect', x: 0, y: 0, w: .4, h: 5 / 9, c: W }, { k: 'disc', x: .2, y: 5 / 18, r: .1, c: '#fcd116' }] }),
    T('COL', 'Colombia', 'CONMEBOL', 82, 79, '#fcd116', '#003893', '#003893', '#fcd116', 'es',
      { t: 'h', c: ['#fcd116', '#003893', '#ce1126'], w: [2, 1, 1] }),
    T('MAR', 'Marocco', 'CAF', 79, 87, '#c1272d', '#006233', '#c1272d', '#c1272d', 'ar',
      { t: 'solid', c: '#c1272d', o: [{ k: 'starline', x: .5, y: .5, r: .23, c: '#006233' }] }),
    T('JPN', 'Giappone', 'AFC', 80, 77, '#1c3a9a', '#ffffff', '#1c3a9a', '#1c3a9a', 'jp',
      { t: 'solid', c: W, o: [{ k: 'disc', x: .5, y: .5, r: .24, c: '#bc002d' }] }),
    T('MEX', 'Messico', 'CONCACAF', 78, 80, '#0a7a3a', '#ffffff', '#ffffff', '#c8102e', 'es',
      { t: 'v', c: ['#006847', W, '#ce1126'], o: [{ k: 'disc', x: .5, y: .5, r: .09, c: '#8a5a2b' }] }),
    T('USA', 'Stati Uniti', 'CONCACAF', 78, 79, '#f6f6f6', '#1b2a6b', '#1b2a6b', '#c8102e', 'en',
      { t: 'h', c: [R, W, R, W, R, W, R, W, R, W, R, W, R], o: [{ k: 'rect', x: 0, y: 0, w: .42, h: 7 / 13, c: '#3c3b6e' }, { k: 'dots', x: 0, y: 0, w: .42, h: 7 / 13 }] }),
    T('SEN', 'Senegal', 'CAF', 79, 77, '#f4f4f4', '#00853f', '#00853f', '#f4f4f4', 'af',
      { t: 'v', c: ['#00853f', '#fdef42', '#e31b23'], o: [{ k: 'star', x: .5, y: .5, r: .17, c: '#00853f' }] }),
    T('SUI', 'Svizzera', 'UEFA', 76, 79, '#d52b1e', '#ffffff', '#ffffff', '#d52b1e', 'de',
      { t: 'solid', c: '#d52b1e', o: [{ k: 'swiss', c: W }] }),
    T('DEN', 'Danimarca', 'UEFA', 77, 78, '#c8102e', '#ffffff', '#ffffff', '#c8102e', 'da',
      { t: 'solid', c: '#c8102e', o: [{ k: 'cross', c: W, w: .13, x: .36 }] }),
    T('POL', 'Polonia', 'UEFA', 76, 80, '#f4f4f4', '#dc143c', '#dc143c', '#f4f4f4', 'pl',
      { t: 'h', c: [W, '#dc143c'] }),
    T('KOR', 'Corea del Sud', 'AFC', 77, 75, '#c8102e', '#111111', '#111111', '#c8102e', 'kr',
      { t: 'solid', c: W, o: [{ k: 'taeg' }] }),
    T('NGA', 'Nigeria', 'CAF', 77, 72, '#2a9d3f', '#ffffff', '#2a9d3f', '#ffffff', 'af',
      { t: 'v', c: ['#008751', W, '#008751'] }),
    T('EGY', 'Egitto', 'CAF', 75, 78, '#d6182a', '#111111', '#111111', '#d6182a', 'ar',
      { t: 'h', c: ['#ce1126', W, BLK], o: [{ k: 'disc', x: .5, y: .5, r: .09, c: '#c09300' }] }),
    T('CIV', 'Costa d\'Avorio', 'CAF', 76, 72, '#f77f00', '#ffffff', '#ffffff', '#f77f00', 'af',
      { t: 'v', c: ['#f77f00', W, '#009e60'] }),
    T('CHI', 'Cile', 'CONMEBOL', 74, 75, '#d52b1e', '#ffffff', '#1b3f95', '#d52b1e', 'es',
      { t: 'h', c: [W, '#d52b1e'], o: [{ k: 'rect', x: 0, y: 0, w: .33, h: .5, c: '#0039a6' }, { k: 'star', x: .165, y: .25, r: .1, c: W }] }),
    T('ECU', 'Ecuador', 'CONMEBOL', 74, 73, '#ffd100', '#034ea2', '#034ea2', '#ffd100', 'es',
      { t: 'h', c: ['#ffd100', '#034ea2', '#ed1c24'], w: [2, 1, 1], o: [{ k: 'disc', x: .5, y: .5, r: .1, c: '#8a6b3a' }] }),
    T('AUS', 'Australia', 'AFC', 71, 74, '#ffcd00', '#00843d', '#00843d', '#ffcd00', 'en',
      { t: 'solid', c: '#00247d', o: [{ k: 'union' }, { k: 'star', x: .25, y: .76, r: .09, c: W }, { k: 'dots', x: .55, y: .1, w: .35, h: .8 }] }),
    T('IRN', 'Iran', 'AFC', 72, 72, '#f4f4f4', '#da0000', '#da0000', '#f4f4f4', 'fa',
      { t: 'h', c: ['#239f40', W, '#da0000'], o: [{ k: 'disc', x: .5, y: .5, r: .07, c: '#da0000' }] }),
    T('GHA', 'Ghana', 'CAF', 73, 71, '#f4f4f4', '#006b3f', '#006b3f', '#f4f4f4', 'af',
      { t: 'h', c: ['#ce1126', '#fcd116', '#006b3f'], o: [{ k: 'star', x: .5, y: .5, r: .14, c: BLK }] }),
    T('CAN', 'Canada', 'CONCACAF', 72, 71, '#d52b1e', '#ffffff', '#d52b1e', '#d52b1e', 'en',
      { t: 'v', c: ['#d52b1e', W, '#d52b1e'], w: [1, 2, 1], o: [{ k: 'star', x: .5, y: .52, r: .2, c: '#d52b1e', n: 11, inner: .6 }] }),
    T('KSA', 'Arabia Saudita', 'AFC', 69, 70, '#e9f5ec', '#006c35', '#ffffff', '#e9f5ec', 'ar',
      { t: 'solid', c: '#006c35', o: [{ k: 'rect', x: .22, y: .3, w: .56, h: .09, c: W }, { k: 'rect', x: .24, y: .62, w: .52, h: .045, c: W }] }),
  ];

  PK.TEAM = {};
  PK.TEAMS.forEach((t) => (PK.TEAM[t.code] = t));
  PK.teamOverall = (t) => (t.atk + t.gk) / 2;

  // --------------------------------------------------------------- bandiere
  function star(ctx, cx, cy, r, n, inner) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / n;
      const rr = i % 2 === 0 ? r : r * inner;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }

  /** Disegna una bandiera (rettangolo x,y,w,h) a partire dalla descrizione vettoriale. */
  PK.drawFlag = function (ctx, flag, x, y, w, h) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    const cs = flag.c;
    if (flag.t === 'solid') {
      ctx.fillStyle = cs;
      ctx.fillRect(x, y, w, h);
    } else {
      const ws = flag.w || cs.map(() => 1);
      const tot = ws.reduce((a, b) => a + b, 0);
      let acc = 0;
      cs.forEach((c, i) => {
        ctx.fillStyle = c;
        const f0 = acc / tot, f1 = (acc + ws[i]) / tot;
        if (flag.t === 'h') ctx.fillRect(x, y + h * f0, w, h * (f1 - f0) + 0.6);
        else ctx.fillRect(x + w * f0, y, w * (f1 - f0) + 0.6, h);
        acc += ws[i];
      });
    }
    (flag.o || []).forEach((o) => {
      ctx.fillStyle = o.c || '#fff';
      ctx.strokeStyle = o.c || '#fff';
      switch (o.k) {
        case 'disc':
          ctx.beginPath();
          ctx.arc(x + o.x * w, y + o.y * h, o.r * h * 1.6 > o.r * w ? o.r * w : o.r * h * 1.6, 0, 7);
          ctx.fill();
          break;
        case 'dia':
          ctx.beginPath();
          ctx.moveTo(x + w * 0.5, y + h * 0.1);
          ctx.lineTo(x + w * 0.92, y + h * 0.5);
          ctx.lineTo(x + w * 0.5, y + h * 0.9);
          ctx.lineTo(x + w * 0.08, y + h * 0.5);
          ctx.closePath();
          ctx.fill();
          break;
        case 'rect':
          ctx.fillRect(x + o.x * w, y + o.y * h, o.w * w, o.h * h);
          break;
        case 'cross':
          ctx.fillRect(x, y + h * (0.5 - o.w / 2), w, h * o.w);
          ctx.fillRect(x + w * o.x - (h * o.w) / 2, y, h * o.w, h);
          break;
        case 'swiss': {
          const a = h * 0.2, l = h * 0.62;
          ctx.fillRect(x + w / 2 - a / 2, y + h / 2 - l / 2, a, l);
          ctx.fillRect(x + w / 2 - l / 2, y + h / 2 - a / 2, l, a);
          break;
        }
        case 'star':
          star(ctx, x + o.x * w, y + o.y * h, o.r * h * 1.6, o.n || 5, o.inner || 0.4);
          ctx.fill();
          break;
        case 'starline':
          ctx.lineWidth = Math.max(1, h * 0.06);
          star(ctx, x + o.x * w, y + o.y * h, o.r * h * 1.9, 5, 0.4);
          ctx.stroke();
          break;
        case 'check': {
          const bw = o.w * w, bh = o.h * h, bx = x + o.x * w - bw / 2, by = y + o.y * h - bh / 2;
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(bx, by, bw, bh);
          ctx.fillStyle = '#fff';
          for (let i = 0; i < 5; i++)
            for (let j = 0; j < 5; j++)
              if ((i + j) % 2 === 0) ctx.fillRect(bx + (bw / 5) * i, by + (bh / 5) * j, bw / 5, bh / 5);
          break;
        }
        case 'dots': {
          ctx.fillStyle = '#fff';
          const nx = 4, ny = 3;
          for (let i = 0; i < nx; i++)
            for (let j = 0; j < ny; j++)
              ctx.fillRect(x + (o.x + (o.w * (i + 0.5)) / nx) * w - 0.8, y + (o.y + (o.h * (j + 0.5)) / ny) * h - 0.8, 1.6, 1.6);
          break;
        }
        case 'taeg':
          ctx.beginPath();
          ctx.arc(x + w / 2, y + h / 2, h * 0.27, Math.PI, 0);
          ctx.fillStyle = '#cd2e3a';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x + w / 2, y + h / 2, h * 0.27, 0, Math.PI);
          ctx.fillStyle = '#0047a0';
          ctx.fill();
          ctx.fillStyle = '#000';
          [[0.12, 0.2], [0.88, 0.2], [0.12, 0.8], [0.88, 0.8]].forEach((p) => ctx.fillRect(x + p[0] * w - h * 0.1, y + p[1] * h - h * 0.05, h * 0.2, h * 0.1));
          break;
        case 'union':
          ctx.fillStyle = '#fff';
          ctx.fillRect(x, y, w * 0.5, h * 0.5);
          ctx.fillStyle = '#cf142b';
          ctx.fillRect(x, y + h * 0.2, w * 0.5, h * 0.1);
          ctx.fillRect(x + w * 0.2, y, w * 0.1, h * 0.5);
          break;
      }
    });
    ctx.restore();
  };

  // ------------------------------------------------------ nomi dei giocatori
  const NAMES = {
    it: ['Ferrante', 'Bellini', 'Marchetti', 'Conti', 'De Luca', 'Rinaldi', 'Gallo', 'Fontana', 'Moretti', 'Caruso', 'Greco', 'Lombardi', 'Barone', 'Santoro', 'Vitale', 'Orlando', 'Pellegrini', 'Serra'],
    fr: ['Marchand', 'Delorme', 'Lefèvre', 'Girard', 'Moreau', 'Dubois', 'Renaud', 'Colin', 'Fabre', 'Lambert', 'Perrin', 'Garnier', 'Chevalier', 'Rousseau', 'Mercier', 'Blanc', 'Faure', 'Brun'],
    de: ['Hartmann', 'Kessler', 'Brandt', 'Vogel', 'Lindner', 'Albrecht', 'Neumann', 'Reuter', 'Köhler', 'Sommer', 'Engel', 'Pohl', 'Richter', 'Voss', 'Dietrich', 'Haas', 'Kaiser', 'Winter'],
    es: ['Navarro', 'Ibáñez', 'Cordero', 'Salazar', 'Quintero', 'Maldonado', 'Escobar', 'Valdés', 'Herrera', 'Montoya', 'Paredes', 'Castaño', 'Bustos', 'Ledesma', 'Arriaga', 'Cabrera', 'Sandoval', 'Villalba'],
    en: ['Hargreaves', 'Whitmore', 'Callahan', 'Pemberton', 'Sutherland', 'Radcliffe', 'Merrick', 'Thornton', 'Ashford', 'Kendrick', 'Lockwood', 'Prescott', 'Holloway', 'Garrett', 'Winslow', 'Calloway', 'Rowan', 'Dalton'],
    pt: ['Albuquerque', 'Bragança', 'Carvalho', 'Figueira', 'Nogueira', 'Teixeira', 'Camargo', 'Barreto', 'Fonseca', 'Macedo', 'Pacheco', 'Resende', 'Siqueira', 'Valadares', 'Guimarães', 'Rangel', 'Sampaio', 'Tavares'],
    nl: ['Van Rijn', 'De Wit', 'Bakker', 'Vermeulen', 'Hendriks', 'Mulder', 'Dekker', 'Jacobs', 'Visser', 'Smeets', 'Peeters', 'Claes', 'Maes', 'Wouters', 'Verbeek', 'Brouwer', 'Janssens', 'Kuipers'],
    hr: ['Kovač', 'Perić', 'Babić', 'Marković', 'Jurić', 'Novak', 'Vidović', 'Tomić', 'Radić', 'Matić', 'Knežević', 'Lovrić', 'Pavlović', 'Bošnjak', 'Šimunić', 'Grgić', 'Božić', 'Vuković'],
    da: ['Lindegaard', 'Holm', 'Mørk', 'Skov', 'Brandt', 'Thygesen', 'Kjær', 'Nygaard', 'Vestergaard', 'Lund', 'Dahl', 'Bech', 'Frandsen', 'Krogh', 'Overgaard', 'Sørensen', 'Mikkelsen', 'Hald'],
    pl: ['Nowicki', 'Zieliński', 'Kamiński', 'Wójcik', 'Mazur', 'Krawczyk', 'Pawlak', 'Michalski', 'Sikora', 'Baran', 'Dudek', 'Zając', 'Kubiak', 'Sadowski', 'Wrona', 'Jasiński', 'Cieślak', 'Górski'],
    ar: ['Haddad', 'Mansour', 'El Idrissi', 'Benali', 'Saleh', 'Farouk', 'Zahran', 'Nasser', 'Al Harbi', 'Kareem', 'Bouzid', 'Tahiri', 'Samir', 'Qasim', 'Rashid', 'Amrani', 'Fahd', 'Jalil'],
    fa: ['Rahimi', 'Karimi', 'Hosseini', 'Moradi', 'Ghorbani', 'Tehrani', 'Bagheri', 'Nazari', 'Farhadi', 'Soltani', 'Zand', 'Pakzad', 'Rostami', 'Daneshvar', 'Azizi', 'Kamali', 'Shirazi', 'Parsa'],
    af: ['Mensah', 'Okafor', 'Diallo', 'Traoré', 'Adeyemi', 'Kouassi', 'Sarr', 'Balogun', 'Boateng', 'Coulibaly', 'Ndiaye', 'Owusu', 'Eze', 'Kone', 'Fofana', 'Abiodun', 'Gueye', 'Asante'],
    jp: ['Takeda', 'Hayashi', 'Morita', 'Kuroda', 'Fujimoto', 'Aoki', 'Nakamura', 'Sakamoto', 'Ishikawa', 'Matsuda', 'Yamashiro', 'Okabe', 'Tachibana', 'Kitano', 'Shirota', 'Hoshino', 'Mizuno', 'Arakawa'],
    kr: ['Seo', 'Baek', 'Yoon', 'Hwang', 'Jeon', 'Moon', 'Ahn', 'Shin', 'Han', 'Kwon', 'Ryu', 'Nam', 'Gu', 'Cha', 'Lim', 'Song', 'Min', 'Do'],
  };
  const INITIALS = 'ABCDEFGHJKLMNPRSTVZ';
  const SKIN = {
    light: ['#f6d3b8', '#f0c5a0', '#ebbd96'],
    mid: ['#d9a77a', '#cf9a6c', '#c58b5c'],
    tan: ['#b9824f', '#a97245', '#9b6a40'],
    dark: ['#7a4a2a', '#6a3f24', '#58331d', '#4a2a18'],
  };
  const SKINW = {
    it: ['light', 'light', 'mid'], fr: ['light', 'mid', 'dark'], de: ['light', 'light', 'mid', 'dark'], es: ['light', 'mid', 'mid', 'tan'],
    en: ['light', 'light', 'mid', 'dark'], pt: ['light', 'mid', 'tan', 'dark'], nl: ['light', 'light', 'mid', 'dark'], hr: ['light', 'light', 'mid'],
    da: ['light', 'light', 'light'], pl: ['light', 'light', 'light'], ar: ['mid', 'tan', 'tan', 'light'], fa: ['mid', 'mid', 'light'],
    af: ['dark', 'dark', 'dark', 'tan'], jp: ['light', 'mid'], kr: ['light', 'mid'],
  };
  const HAIRC = {
    default: ['#1a1410', '#2a1c12', '#3b2616', '#5b3a1c', '#8a5a2b', '#caa24a'],
    nordic: ['#caa24a', '#e6c46b', '#5b3a1c', '#8a5a2b', '#1a1410'],
    dark: ['#0e0a08', '#16100c', '#241812'],
  };
  const HAIRPOOL = { da: 'nordic', pl: 'nordic', de: 'nordic', nl: 'nordic', en: 'nordic', af: 'dark', jp: 'dark', kr: 'dark', ar: 'dark', fa: 'dark', it: 'default', fr: 'default', es: 'default', pt: 'default', hr: 'default' };

  /** Genera (deterministicamente) la rosa di 11 giocatori di una squadra: [0]=portiere, [1..10]=rigoristi in ordine di calcio. */
  PK.buildSquad = function (team) {
    if (team._squad) return team._squad;
    const rng = M.rng(M.hash('squad:' + team.code));
    const pool = M.shuffle(rng, NAMES[team.pool] || NAMES.en);
    const skinKeys = SKINW[team.pool] || SKINW.en;
    const hairKey = HAIRPOOL[team.pool] || 'default';
    const nums = M.shuffle(rng, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 14, 15, 17, 18, 19, 20, 21, 22]);
    const mk = (i, nm, num, isGK) => {
      const sk = SKIN[M.pick(rng, skinKeys)];
      const hairs = HAIRC[hairKey];
      return {
        i,
        name: nm,
        initial: INITIALS[Math.floor(rng() * INITIALS.length)],
        number: num,
        skin: M.pick(rng, sk),
        hair: M.pick(rng, hairs),
        hairStyle: Math.floor(rng() * 4),
        foot: rng() < 0.8 ? 'R' : 'L',
        // statistiche del rigorista (0..1): potenza, precisione, freddezza
        pow: M.clamp(team.atk / 100 + (rng() - 0.5) * 0.14, 0.4, 0.99),
        acc: M.clamp(team.atk / 100 + (rng() - 0.5) * 0.16, 0.4, 0.99),
        comp: M.clamp(team.atk / 100 + (rng() - 0.5) * 0.2, 0.35, 0.99),
        special: (M.hash(team.code + i) + i) % PK.SPECIALS.length,
        isGK,
      };
    };
    const squad = [mk(0, pool[0], 1, true)];
    for (let i = 1; i <= 10; i++) squad.push(mk(i, pool[i], nums[i - 1], false));
    // il migliore (per precisione+freddezza) calcia per ultimo tra i primi cinque: ordine "da allenatore"
    const kickers = squad.slice(1).sort((a, b) => b.acc + b.comp - (a.acc + a.comp));
    const top5 = kickers.slice(0, 5);
    const order = [top5[1], top5[2], top5[3], top5[4], top5[0], ...kickers.slice(5)];
    // il portiere calcia come ultimo (dopo tutti i 10 di movimento) — ordine ciclico
    const gk = squad[0];
    gk.pow = 0.5; gk.acc = 0.5; gk.comp = 0.6;
    team._squad = { gk, kickers: [...order, gk], all: squad };
    team._squad.gk.keeperSpecial = M.hash(team.code) % 5;
    return team._squad;
  };

  // ---------------------------------------------------------------- speciali
  PK.SPECIALS = [
    { id: 'drago', name: 'Tiro del Drago', col: ['#2bff88', '#00a050', '#fff6a8'], fx: 'dragon', spin: 1.0, wobble: 0.0, speed: 1.12 },
    { id: 'cometa', name: 'Cometa Infuocata', col: ['#ff7a18', '#ff2a00', '#ffe9a0'], fx: 'fire', spin: 0.0, wobble: 0.0, speed: 1.18 },
    { id: 'fulmine', name: 'Fulmine Sonico', col: ['#ffee33', '#33b4ff', '#ffffff'], fx: 'lightning', spin: 0.0, wobble: 0.8, speed: 1.15 },
    { id: 'tornado', name: 'Tornado Selvaggio', col: ['#bdf3ff', '#4ac0ff', '#ffffff'], fx: 'tornado', spin: 1.7, wobble: 0.0, speed: 1.08 },
    { id: 'meteora', name: 'Meteora d\'Argento', col: ['#e8f0ff', '#8fb2ff', '#ffffff'], fx: 'meteor', spin: 0.0, wobble: 0.0, speed: 1.2 },
    { id: 'artiglio', name: 'Artiglio Scarlatto', col: ['#ff3355', '#8a0020', '#ffd0d8'], fx: 'claw', spin: 0.8, wobble: 0.35, speed: 1.14 },
    { id: 'boomerang', name: 'Raggio Boomerang', col: ['#c46bff', '#5b1fd6', '#f1d9ff'], fx: 'plasma', spin: 2.1, wobble: 0.0, speed: 1.06 },
    { id: 'cannone', name: 'Cannone Aureo', col: ['#ffd23a', '#ff8f00', '#fff6c8'], fx: 'shock', spin: 0.0, wobble: 0.0, speed: 1.22 },
    { id: 'fantasma', name: 'Tiro Fantasma', col: ['#9b7bff', '#2a1a66', '#d9ccff'], fx: 'ghost', spin: 0.0, wobble: 1.3, speed: 1.1 },
    { id: 'supernova', name: 'Supernova', col: ['#ffffff', '#ffd0f0', '#ff68c0'], fx: 'nova', spin: 0.4, wobble: 0.0, speed: 1.2 },
  ];
  PK.KEEPER_SPECIALS = ['Mano Divina', 'Muro d\'Acciaio', 'Artiglio d\'Aquila', 'Guanto del Titano', 'Scudo Cosmico'];

  // ------------------------------------------------------------------ divise
  const KEEPER_KITS = [
    { shirt: '#ffe600', trim: '#111111', shorts: '#111111', socks: '#ffe600', gloves: '#ff3d2e' },
    { shirt: '#18c46c', trim: '#ffffff', shorts: '#0d5c36', socks: '#18c46c', gloves: '#fff200' },
    { shirt: '#ff7a1a', trim: '#111111', shorts: '#111111', socks: '#ff7a1a', gloves: '#27d7ff' },
    { shirt: '#e53dd3', trim: '#ffffff', shorts: '#4a0f45', socks: '#e53dd3', gloves: '#fff200' },
    { shirt: '#27d7ff', trim: '#10305c', shorts: '#10305c', socks: '#27d7ff', gloves: '#ff3d2e' },
    { shirt: '#2a2a33', trim: '#ffdf00', shorts: '#2a2a33', socks: '#2a2a33', gloves: '#ffdf00' },
  ];
  PK.pickKits = function (a, b, ownerSeed) {
    const ka = Object.assign({}, a.kit);
    let kb = Object.assign({}, b.kit);
    if (M.colorDist(ka.shirt, kb.shirt) < 130) {
      // seconda maglia: invertita (bianca o scura)
      const dark = M.colorDist(kb.shirt, '#ffffff') < 160;
      kb = dark
        ? { shirt: '#1d2230', trim: kb.trim === '#ffffff' ? kb.socks : kb.trim, shorts: '#1d2230', socks: '#1d2230' }
        : { shirt: '#f4f4f4', trim: kb.shirt, shorts: '#f4f4f4', socks: kb.shirt };
    }
    const ok = (k) => M.colorDist(k.shirt, ka.shirt) > 120 && M.colorDist(k.shirt, kb.shirt) > 120;
    const pick = (excl) => {
      const list = KEEPER_KITS.filter(ok);
      const L = list.length ? list : KEEPER_KITS;
      return L[(ownerSeed + excl) % L.length];
    };
    return { a: ka, b: kb, gkA: pick(1), gkB: pick(3) };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PK;
})(typeof window !== 'undefined' ? window : globalThis);
