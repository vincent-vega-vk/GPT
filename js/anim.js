/* ============================================================
   GEOPOLITICA 2026 — Animazioni militari (GEO.anim)
   Riproduce s.lastResolution su un canvas sovrapposto alla mappa (#fx)
   e disegna gli effetti ambientali. Specifica: docs/military-engine.md §10.
   Nessuna dipendenza; il modulo si carica anche in Node (le funzioni di
   disegno richiedono un contesto 2D, play() in Node si risolve subito).

   API della specifica
   -------------------
   GEO.anim.init({ canvas, proj, provPos, nationColor, flag, ...extra })
     canvas            canvas degli effetti, sovrapposto alla mappa con le stesse dimensioni CSS
     proj(lon,lat)     -> [x,y] in pixel CSS; richiamata a ogni frame (segue zoom e trascinamento)
     provPos(id)       -> [lon,lat] di provincia o mare (ripiego: GEO.military.provPos, GEO.PROVINCES, GEO.SEAS)
     nationColor(id)   -> colore CSS;  flag(id) -> emoji  (ripiego: GEO.NATIONS)
   GEO.anim.drawUnit(ctx, x, y, unit, opts)  gettone (esercito = scudo con stella, flotta = nave);
     usato anche dalla mappa statica. opts: size (raggio in px), color, flag (false = nessuna),
     alpha, scale, rotation, selected, mine, suppressed, dislodged, ghost, tint {color,a}, shadow (false)
   GEO.anim.play(resolution, { speed, onPhase, onDone }) -> Promise<{ skipped, turn }>
     onPhase(key, { label, icon, index, count, turn })  all'inizio di ogni fase
     onDone({ skipped, turn })                          alla fine (anche dopo skip)
   GEO.anim.skip()   GEO.anim.setSpeed(x)   GEO.anim.isPlaying()
   GEO.anim.setAmbient({ orders, fronts, selected })
     orders   [{ type:'move'|'support'|'hold'|'convoy', from?, to?, target?, at?, owner?, unit? }]
              (move: from->to; support: from->target[->to]; hold: at; convoy: from->at(flotta)->to;
               se manca `from` si usa la posizione dell'unità `unit` presa da `units`, se fornito)
     fronts   [provId | [provA, provB] | {a, b}]  province (o coppie) del fronte, pulsano in rosso
     selected provId | unità {loc} | null              alone dell'unità selezionata
     units    facoltativo: elenco unità per risolvere gli ordini senza `from`

   Extra (documentati qui)
   -----------------------
   init: unitSize (numero o funzione, raggio dei gettoni, predefinito 10), isMine(id) (bordo dorato),
         nationPos(id) -> [lon,lat] punto di lancio di missili e stormi (predefinito: capitale),
         nationName(id), provName(id) (nomi nelle etichette), provPath(ctx,id) (traccia la cella
         della provincia: l'onda di conquista viene ritagliata su di essa), shakeTarget (elemento da far
         tremare, predefinito il genitore del canvas, null = mai), banners (false = niente titolo di fase
         sul canvas), reducedMotion (forza la modalità a movimento ridotto; predefinito: preferenza del sistema)
   play: banner (false = niente titolo di fase), progress (false = niente barra di avanzamento)
   GEO.anim.resize(w, h, dpr)   forza le dimensioni (altrimenti lette da clientWidth/clientHeight a ogni frame)
   GEO.anim.pause() / resume() / isPaused()   pausa manuale (la pausa con scheda nascosta è automatica)
   GEO.anim.stop()              come skip()
   GEO.anim.plan(resolution)    -> { phases:[{key,label,icon,start,dur}], total }  (puro, anche in Node)
   GEO.anim.destroy()           ferma il ciclo e rimuove gli ascoltatori
   GEO.anim.PHASES, GEO.anim.easing

   Nota per la mappa statica: durante la riproduzione il canvas degli effetti disegna TUTTE le unità
   (dallo stato `before` a `after`); la mappa deve omettere i propri gettoni finché isPlaying() è true.
   ============================================================ */
(function (root) {
  'use strict';
  const GEO = root.GEO = root.GEO || {};

  // ---------- Utilità -------------------------------------------------------
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const Ease = {
    linear: (t) => t,
    inQuad: (t) => t * t,
    outQuad: (t) => t * (2 - t),
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outQuart: (t) => 1 - Math.pow(1 - t, 4),
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    outElastic: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
  };
  function rng(seed) {
    let a = (seed >>> 0) || 0x9e3779b9;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) { s = String(s); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const FONT = "'Segoe UI', system-ui, -apple-system, Roboto, 'Helvetica Neue', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji'";
  const EMOJI = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";

  // ---------- Colori --------------------------------------------------------
  const colCache = new Map();
  function parseColor(c) {
    const hit = colCache.get(c); if (hit) return hit;
    let r = 136, g = 136, b = 136;
    if (typeof c === 'string') {
      const s = c.trim();
      if (s[0] === '#') {
        let h = s.slice(1); if (h.length === 3 || h.length === 4) h = h.split('').map((x) => x + x).join('');
        r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16);
      } else {
        const m = s.match(/rgba?\(([^)]+)\)/i);
        if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); r = p[0]; g = p[1]; b = p[2]; }
      }
    }
    if (![r, g, b].every(Number.isFinite)) { r = g = b = 136; }
    const out = [r, g, b]; if (colCache.size > 500) colCache.clear(); colCache.set(c, out); return out;
  }
  const rgba = (c, a) => { const p = parseColor(c); return `rgba(${p[0] | 0},${p[1] | 0},${p[2] | 0},${a})`; };
  const shade = (c, t) => { const p = parseColor(c), k = t >= 0 ? 255 : 0, f = Math.abs(t); return `rgb(${Math.round(p[0] + (k - p[0]) * f)},${Math.round(p[1] + (k - p[1]) * f)},${Math.round(p[2] + (k - p[2]) * f)})`; };
  const mixCol = (c1, c2, t) => { const a = parseColor(c1), b = parseColor(c2); return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`; };
  const luma = (c) => { const p = parseColor(c); return (0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]) / 255; };
  function fallbackColor(id) { const h = hashStr(id) % 360, s = 0.62, l = 0.52; const f = (n) => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(v * 255).toString(16).padStart(2, '0'); }; return `#${f(0)}${f(8)}${f(4)}`; }

  // ---------- Configurazione e risolutori -----------------------------------
  const cfg = { canvas: null, ctx: null, proj: null, provPos: null, nationColor: null, flag: null, nationPos: null, nationName: null, provName: null, provPath: null, unitSize: 10, isMine: null, shakeTarget: undefined, banners: true, reducedMotion: null };
  let natIdx = null, natLen = -1;
  function nationRec(id) {
    const N = GEO.NATIONS; if (!N || id == null) return null;
    if (Array.isArray(N)) { if (N.length !== natLen) { natIdx = {}; N.forEach((n) => { if (n && n.id) natIdx[n.id] = n; }); natLen = N.length; } return natIdx[id] || null; }
    return N[id] || null;
  }
  const safe = (fn, ...a) => { try { return fn(...a); } catch (e) { return null; } };
  function colorOf(id) { let c = cfg.nationColor ? safe(cfg.nationColor, id) : null; if (!c) { const n = nationRec(id); c = n && n.color; } return c || fallbackColor(id || '?'); }
  function flagOf(id) { if (cfg.flag) { const f = safe(cfg.flag, id); if (f != null) return f; } const n = nationRec(id); return (n && n.flag) || ''; }
  function nationNameOf(id) { if (cfg.nationName) { const v = safe(cfg.nationName, id); if (v) return v; } const n = nationRec(id); return (n && n.name) || String(id || ''); }
  function provNameOf(id) {
    if (cfg.provName) { const v = safe(cfg.provName, id); if (v) return v; }
    const M = GEO.military; if (M && typeof M.provName === 'function') { const v = safe(M.provName, id); if (v && v !== id) return v; }
    const P = (GEO.PROVINCES && GEO.PROVINCES[id]) || (GEO.SEAS && GEO.SEAS[id]); return (P && P.name) || String(id || '');
  }
  function llOf(id) {
    if (id == null) return null;
    let p = cfg.provPos ? safe(cfg.provPos, id) : null;
    if (!p) { const M = GEO.military; if (M && typeof M.provPos === 'function') p = safe(M.provPos, id); }
    if (!p) { const P = (GEO.PROVINCES && GEO.PROVINCES[id]) || (GEO.SEAS && GEO.SEAS[id]); if (P) p = [P.lon, P.lat]; }
    return p && Number.isFinite(p[0]) && Number.isFinite(p[1]) ? p : null;
  }
  function nationLL(id) {
    if (id == null) return null;
    if (cfg.nationPos) { const p = safe(cfg.nationPos, id); if (p) return p; }
    const n = nationRec(id); if (n && Number.isFinite(n.lon) && Number.isFinite(n.lat)) return [n.lon, n.lat];
    const P = GEO.PROVINCES; if (P) { let any = null; for (const k in P) { const q = P[k]; if (q.nation !== id) continue; if (q.capital) return [q.lon, q.lat]; if (!any) any = [q.lon, q.lat]; } if (any) return any; }
    return null;
  }
  const nationOfProv = (id) => { const P = GEO.PROVINCES && GEO.PROVINCES[id]; return P ? P.nation : String(id || '').split('.')[0]; };
  const isMine = (owner) => !!(cfg.isMine && safe(cfg.isMine, owner));
  const unitR = () => { const v = typeof cfg.unitSize === 'function' ? safe(cfg.unitSize) : cfg.unitSize; return Number.isFinite(v) && v > 0 ? v : 10; };
  function reduced() {
    if (cfg.reducedMotion != null) return !!cfg.reducedMotion;
    try { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }

  // ---------- Stato del frame e ancore --------------------------------------
  // Un'ancora è: id di provincia/mare | {unit:id} (posizione corrente del gettone) | {ll:[lon,lat]} |
  // {xy:[x,y]} | {lerp:[a,b,f]} | {off:a, dx, dy} | {push:a, away:b, px}
  const F = { T: 0, now: 0, W: 0, H: 0, R: 10, ZS: 1, pos: new Map(), cache: new Map() };
  function scr(id) {
    if (F.cache.has(id)) return F.cache.get(id);
    let p = null; const ll = llOf(id);
    if (ll && cfg.proj) { const q = safe(cfg.proj, ll[0], ll[1]); if (q && Number.isFinite(q[0]) && Number.isFinite(q[1])) p = q; }
    F.cache.set(id, p); return p;
  }
  function A(a) {
    if (a == null) return null;
    if (typeof a === 'string') return scr(a);
    if (a.unit !== undefined) return F.pos.get(a.unit) || (a.at ? A(a.at) : null);
    if (a.ll) { const q = cfg.proj ? safe(cfg.proj, a.ll[0], a.ll[1]) : null; return q && Number.isFinite(q[0]) ? q : null; }
    if (a.xy) return a.xy;
    if (a.lerp) { const p = A(a.lerp[0]), q = A(a.lerp[1]); if (!p || !q) return p || q; return [lerp(p[0], q[0], a.lerp[2]), lerp(p[1], q[1], a.lerp[2])]; }
    if (a.off !== undefined) { const p = A(a.off); return p ? [p[0] + (a.dx || 0) * F.ZS, p[1] + (a.dy || 0) * F.ZS] : null; }
    if (a.push !== undefined) {
      const p = A(a.push); if (!p) return null; const q = a.away != null ? A(a.away) : null; let dx = 0.7, dy = -0.7;
      if (q) { const ex = p[0] - q[0], ey = p[1] - q[1], L = Math.hypot(ex, ey); if (L > 0.5) { dx = ex / L; dy = ey / L; } }
      return [p[0] + dx * a.px * F.ZS, p[1] + dy * a.px * F.ZS];
    }
    return null;
  }
  function alongPath(path, e) {
    const pts = []; for (const a of path) { const q = A(a); if (q) pts.push(q); }
    if (!pts.length) return null; if (pts.length === 1) return [pts[0][0], pts[0][1]];
    const L = []; let tot = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(d); tot += d; }
    if (tot < 1e-6) return [pts[0][0], pts[0][1]];
    let d = e * tot;
    for (let i = 0; i < L.length; i++) {
      if (d <= L[i] || i === L.length - 1) { const f = L[i] > 0 ? d / L[i] : 0; return [lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f)]; }
      d -= L[i];
    }
    return [pts[pts.length - 1][0], pts[pts.length - 1][1]];
  }
  function kv(keys, T, def) {
    if (!keys.length) return def;
    if (T <= keys[0].t) return keys[0].v;
    for (let i = 1; i < keys.length; i++) { const b = keys[i]; if (T < b.t) { const a = keys[i - 1]; return lerp(a.v, b.v, (b.ease || Ease.linear)((T - a.t) / ((b.t - a.t) || 1))); } }
    return keys[keys.length - 1].v;
  }

  // ---------- Primitive di disegno -------------------------------------------
  function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath(); }
  function radial(c, x, y, r, stops) { if (!(r > 0.2)) return; const g = c.createRadialGradient(x, y, 0, x, y, r); for (const s of stops) g.addColorStop(s[0], s[1]); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  function starPath(c, cx, cy, R, r, n) { n = n || 5; c.beginPath(); for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, q = i % 2 ? r : R; const x = cx + Math.cos(a) * q, y = cy + Math.sin(a) * q; if (i) c.lineTo(x, y); else c.moveTo(x, y); } c.closePath(); }
  function arrowHead(c, x, y, ang, s) { c.beginPath(); c.moveTo(x + Math.cos(ang) * s, y + Math.sin(ang) * s); c.lineTo(x + Math.cos(ang + 2.5) * s, y + Math.sin(ang + 2.5) * s); c.lineTo(x + Math.cos(ang - 2.5) * s, y + Math.sin(ang - 2.5) * s); c.closePath(); }
  function trefoil(c, x, y, r) {
    c.save(); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = '#ffd60a'; c.fill(); c.lineWidth = Math.max(0.8, r * 0.12); c.strokeStyle = '#1a1405'; c.stroke();
    c.fillStyle = '#1a1405';
    for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * TAU / 3; c.beginPath(); c.arc(x, y, r * 0.82, a - 0.52, a + 0.52); c.arc(x, y, r * 0.26, a + 0.52, a - 0.52, true); c.closePath(); c.fill(); }
    c.beginPath(); c.arc(x, y, r * 0.15, 0, TAU); c.fill(); c.restore();
  }
  function wrapText(c, text, maxW) {
    const words = String(text).split(/\s+/).filter(Boolean); const lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (cur && c.measureText(t).width > maxW) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur);
    if (lines.length > 3) { lines.length = 3; lines[2] = lines[2].replace(/\s*\S*$/, '') + '…'; }
    return lines;
  }
  // Etichetta con fondo scuro (ancorata in basso al centro, con piccolo becco).
  function chip(c, x, y, o, alpha, scale) {
    if (alpha <= 0.01) return;
    const fs = o.size || 12, fs2 = fs - 1.5;
    if (!o._lay) {
      c.font = `700 ${fs}px ${FONT}`; const head = (o.icon ? o.icon + '  ' : '') + (o.text || ''); const wh = c.measureText(head).width;
      let sub = [], ws = 0;
      if (o.sub) { c.font = `500 ${fs2}px ${FONT}`; sub = wrapText(c, o.sub, Math.max(wh, o.maxW || 190)); ws = Math.max(...sub.map((s) => c.measureText(s).width)); }
      o._lay = { head, sub, w: Math.ceil(Math.max(wh, ws) + 18), h: Math.ceil(fs + 11 + sub.length * (fs2 + 3)) };
    }
    const L = o._lay;
    x = clamp(x, L.w / 2 + 4, Math.max(L.w / 2 + 4, F.W - L.w / 2 - 4)); y = Math.max(y, L.h + 6);
    c.save(); c.globalAlpha *= alpha; c.translate(x, y); if (scale !== 1) c.scale(scale, scale);
    const x0 = -L.w / 2, y0 = -L.h - 5, acc = o.accent || '#e6ebf5';
    c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 8; c.shadowOffsetY = 2;
    rr(c, x0, y0, L.w, L.h, 7); c.fillStyle = 'rgba(8,12,24,.9)'; c.fill(); c.shadowColor = 'transparent';
    c.lineWidth = 1.3; c.strokeStyle = rgba(acc, 0.95); c.stroke();
    c.beginPath(); c.moveTo(-5, -5.5); c.lineTo(0, 0); c.lineTo(5, -5.5); c.closePath(); c.fillStyle = rgba(acc, 0.95); c.fill();
    c.textAlign = 'center'; c.textBaseline = 'top';
    c.font = `700 ${fs}px ${FONT}`; c.fillStyle = o.color || '#f4f7ff'; c.fillText(L.head, 0, y0 + 5.5);
    if (L.sub.length) { c.font = `500 ${fs2}px ${FONT}`; c.fillStyle = '#c3cce0'; L.sub.forEach((s, i) => c.fillText(s, 0, y0 + 6 + fs + 3 + i * (fs2 + 3))); }
    c.restore();
  }

  // ---------- Gettoni delle unità --------------------------------------------
  // r = raggio nominale del gettone. Esercito: scudo alto 2.2r; flotta: nave larga ~2.6r.
  function shieldPath(c, r) {
    const h = r * 2.2, w = h * 0.84, t = -h / 2, b = h / 2, k = h * 0.17, hw = w / 2;
    c.beginPath(); c.moveTo(-hw + k, t); c.lineTo(hw - k, t); c.quadraticCurveTo(hw, t, hw, t + k); c.lineTo(hw, t + h * 0.4);
    c.bezierCurveTo(hw, t + h * 0.74, w * 0.2, b - h * 0.07, 0, b); c.bezierCurveTo(-w * 0.2, b - h * 0.07, -hw, t + h * 0.74, -hw, t + h * 0.4);
    c.lineTo(-hw, t + k); c.quadraticCurveTo(-hw, t, -hw + k, t); c.closePath();
  }
  const SHIP_OY = 0.16; // spostamento verticale per centrare otticamente la nave
  function hullPath(c, r) {
    const h = r * 1.7, W = h * 1.55, oy = h * SHIP_OY;
    c.beginPath(); c.moveTo(-0.47 * W, -0.04 * h + oy); c.lineTo(0.40 * W, -0.04 * h + oy); c.lineTo(0.56 * W, -0.19 * h + oy);
    c.lineTo(0.38 * W, 0.28 * h + oy); c.lineTo(-0.38 * W, 0.28 * h + oy); c.quadraticCurveTo(-0.5 * W, 0.22 * h + oy, -0.47 * W, -0.04 * h + oy); c.closePath();
  }
  function superPath(c, r, add) {
    const h = r * 1.7, W = h * 1.55, oy = h * SHIP_OY;
    if (!add) c.beginPath();
    c.rect(-0.27 * W, -0.31 * h + oy, 0.33 * W, 0.28 * h);   // blocco principale
    c.rect(-0.18 * W, -0.52 * h + oy, 0.15 * W, 0.22 * h);   // plancia
    c.rect(0.13 * W, -0.19 * h + oy, 0.13 * W, 0.16 * h);    // torretta prodiera
    c.rect(-0.42 * W, -0.17 * h + oy, 0.11 * W, 0.14 * h);   // torretta poppiera
  }
  function tokenPath(c, type, r) { if (type === 'F') { hullPath(c, r); superPath(c, r, true); } else shieldPath(c, r); }
  function paintArmy(c, r, color, mine, shadow) {
    const h = r * 2.2, w = h * 0.84;
    shieldPath(c, r);
    c.save(); if (shadow) { c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = r * 0.65; c.shadowOffsetY = r * 0.22; }
    const g = c.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, shade(color, 0.32)); g.addColorStop(0.5, color); g.addColorStop(1, shade(color, -0.38));
    c.fillStyle = g; c.fill(); c.restore();
    c.save(); shieldPath(c, r); c.clip();
    c.fillStyle = 'rgba(255,255,255,.16)'; c.beginPath(); c.ellipse(-w * 0.1, -h * 0.42, w * 0.55, h * 0.24, -0.25, 0, TAU); c.fill(); c.restore();
    c.lineJoin = 'round'; c.lineWidth = Math.max(1.1, r * 0.19); c.strokeStyle = '#0a0f1e'; shieldPath(c, r); c.stroke();
    c.save(); c.scale(0.8, 0.8); shieldPath(c, r); c.restore(); c.lineWidth = Math.max(0.6, r * 0.075); c.strokeStyle = 'rgba(255,255,255,.38)'; c.stroke();
    const dark = luma(color) > 0.68;
    starPath(c, 0, -h * 0.035, r * 0.6, r * 0.25, 5);
    c.save(); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = r * 0.25; c.fillStyle = dark ? '#18213a' : '#ffffff'; c.fill(); c.restore();
    c.lineWidth = Math.max(0.5, r * 0.06); c.strokeStyle = dark ? 'rgba(255,255,255,.4)' : 'rgba(10,15,30,.35)'; c.stroke();
    if (mine) { c.lineWidth = Math.max(1, r * 0.14); c.strokeStyle = '#ffe08a'; c.save(); c.scale(1.13, 1.1); shieldPath(c, r); c.restore(); c.stroke(); }
  }
  function paintFleet(c, r, color, mine, shadow) {
    const h = r * 1.7, W = h * 1.55, oy = h * SHIP_OY;
    // scia e onde
    c.lineCap = 'round'; c.lineWidth = Math.max(1, h * 0.075); c.strokeStyle = 'rgba(160,215,255,.9)';
    c.beginPath(); for (let i = 0; i <= 24; i++) { const x = lerp(-0.6 * W, 0.6 * W, i / 24), y = 0.37 * h + oy + Math.sin(i / 24 * TAU * 2.5) * h * 0.045; if (i) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke();
    c.lineWidth = Math.max(0.8, h * 0.06); c.strokeStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.moveTo(0.44 * W, 0.2 * h + oy); c.lineTo(0.6 * W, 0.33 * h + oy); c.stroke();
    // albero
    c.strokeStyle = '#0a0f1e'; c.lineWidth = Math.max(0.9, h * 0.07);
    c.beginPath(); c.moveTo(-0.105 * W, -0.5 * h + oy); c.lineTo(-0.105 * W, -0.8 * h + oy); c.moveTo(-0.18 * W, -0.68 * h + oy); c.lineTo(-0.03 * W, -0.68 * h + oy); c.stroke();
    // cannoni
    c.lineWidth = Math.max(1, h * 0.08); c.beginPath(); c.moveTo(0.22 * W, -0.12 * h + oy); c.lineTo(0.42 * W, -0.2 * h + oy); c.moveTo(-0.38 * W, -0.11 * h + oy); c.lineTo(-0.54 * W, -0.17 * h + oy); c.stroke();
    // scafo
    hullPath(c, r);
    c.save(); if (shadow) { c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = r * 0.65; c.shadowOffsetY = r * 0.22; }
    const g = c.createLinearGradient(0, -0.05 * h + oy, 0, 0.3 * h + oy); g.addColorStop(0, shade(color, 0.25)); g.addColorStop(0.55, color); g.addColorStop(1, shade(color, -0.42));
    c.fillStyle = g; c.fill(); c.restore();
    c.lineJoin = 'round'; c.lineWidth = Math.max(1.1, r * 0.17); c.strokeStyle = '#0a0f1e'; c.stroke();
    c.lineWidth = Math.max(0.6, h * 0.05); c.strokeStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.moveTo(-0.42 * W, 0.17 * h + oy); c.lineTo(0.43 * W, 0.17 * h + oy); c.stroke();
    // sovrastruttura
    superPath(c, r); const sg = c.createLinearGradient(0, -0.52 * h + oy, 0, -0.03 * h + oy); sg.addColorStop(0, mixCol(color, '#eef2fa', 0.62)); sg.addColorStop(1, mixCol(color, '#aab4c8', 0.45));
    c.fillStyle = sg; c.fill(); c.lineWidth = Math.max(0.9, r * 0.13); c.strokeStyle = '#0a0f1e'; c.stroke();
    c.fillStyle = 'rgba(15,25,45,.85)'; c.fillRect(-0.16 * W, -0.47 * h + oy, 0.11 * W, 0.06 * h);
    if (mine) { c.lineWidth = Math.max(1, r * 0.14); c.strokeStyle = '#ffe08a'; c.beginPath(); c.moveTo(-0.5 * W, 0.47 * h + oy); c.lineTo(0.5 * W, 0.47 * h + oy); c.stroke(); }
  }
  function paintFlag(c, type, r, flag) {
    if (!flag || r < 6.5) return;
    let x, y; if (type === 'F') { const h = r * 1.7; x = 0.4 * h * 1.55; y = -0.5 * h + h * SHIP_OY; } else { x = r * 0.86; y = -r * 1.0; }
    const fw = r * 1.15, fh = r * 0.86;
    rr(c, x - fw / 2, y - fh / 2, fw, fh, r * 0.18); c.fillStyle = 'rgba(8,12,24,.92)'; c.fill(); c.lineWidth = Math.max(0.6, r * 0.08); c.strokeStyle = 'rgba(255,255,255,.55)'; c.stroke();
    c.font = `${(r * 0.82).toFixed(1)}px ${EMOJI}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText(flag, x, y + r * 0.05);
  }
  function paintUnit(c, type, r, color, flag, mine, shadow) { if (type === 'F') paintFleet(c, r, color, mine, shadow); else paintArmy(c, r, color, mine, shadow); paintFlag(c, type, r, flag); }

  // Cache degli sprite (il gettone è disegnato una volta per colore/bandiera/dimensione/scala pixel).
  const sprites = new Map();
  function makeCanvas(w, h) {
    if (typeof document !== 'undefined' && document.createElement) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
    return null;
  }
  function sprite(type, r, color, flag, mine, shadow, px) {
    const key = `${type}|${r.toFixed(2)}|${color}|${flag}|${mine ? 1 : 0}|${shadow ? 1 : 0}|${px}`;
    let s = sprites.get(key); if (s) return s;
    const w = Math.ceil(r * 3.4 + 10), h = Math.ceil(r * 3.4 + 10);
    const cv = makeCanvas(Math.ceil(w * px), Math.ceil(h * px)); if (!cv) return null;
    const c = cv.getContext('2d'); if (!c) return null;
    c.scale(px, px); c.translate(w / 2, h / 2); paintUnit(c, type, r, color, flag, mine, shadow);
    s = { cv, w, h }; if (sprites.size > 700) sprites.clear(); sprites.set(key, s); return s;
  }
  function drawUnit(ctx, x, y, unit, opts) {
    if (!ctx || !unit) return;
    opts = opts || {};
    const r = opts.size > 0 ? opts.size : unitR();
    const alpha = opts.alpha == null ? 1 : opts.alpha; if (alpha <= 0.004) return;
    const scale = opts.scale == null ? 1 : opts.scale; if (scale <= 0.01) return;
    const type = unit.type === 'F' ? 'F' : 'A';
    const color = opts.color || colorOf(unit.owner);
    const flag = opts.flag === false ? '' : (opts.flag || flagOf(unit.owner) || '');
    const mine = opts.mine != null ? !!opts.mine : isMine(unit.owner);
    const shadow = opts.shadow !== false;
    ctx.save();
    ctx.globalAlpha *= alpha; ctx.translate(x, y); if (opts.rotation) ctx.rotate(opts.rotation); if (scale !== 1) ctx.scale(scale, scale);
    if (opts.ghost) {
      tokenPath(ctx, type, r); ctx.fillStyle = rgba(color, 0.22); ctx.fill(); ctx.setLineDash([3, 3]); ctx.lineWidth = 1.4; ctx.strokeStyle = rgba(shade(color, 0.4), 0.9); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore(); return;
    }
    if (opts.selected) {
      ctx.save(); ctx.shadowColor = 'rgba(255,214,90,.95)'; ctx.shadowBlur = r * 1.1; ctx.lineWidth = Math.max(2, r * 0.32); ctx.strokeStyle = '#ffd65a';
      ctx.save(); ctx.scale(1.12, 1.1); tokenPath(ctx, type, r); ctx.restore(); ctx.stroke(); ctx.restore();
    }
    let px = 1; if (typeof ctx.getTransform === 'function') { const m = ctx.getTransform(); px = Math.hypot(m.a, m.b) / scale || 1; }
    px = clamp(Math.round(px * 4) / 4, 1, 4);
    const sp = sprite(type, r, color, flag, mine, shadow, px);
    if (sp) ctx.drawImage(sp.cv, -sp.w / 2, -sp.h / 2, sp.w, sp.h); else paintUnit(ctx, type, r, color, flag, mine, shadow);
    if (opts.suppressed) {
      tokenPath(ctx, type, r); ctx.fillStyle = 'rgba(16,20,30,.58)'; ctx.fill();
      ctx.setLineDash([2.5, 2.5]); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(205,214,232,.85)'; ctx.beginPath(); ctx.arc(0, 0, r * 1.55, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      const bx = -r * 0.95, by = r * 0.85, br = Math.max(3.5, r * 0.42);
      ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fillStyle = '#2a3046'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#cfd6e6'; ctx.stroke();
      ctx.beginPath(); ctx.arc(bx, by, br * 0.55, 0, TAU); ctx.moveTo(bx - br * 0.4, by + br * 0.4); ctx.lineTo(bx + br * 0.4, by - br * 0.4); ctx.stroke();
    }
    if (opts.dislodged) {
      ctx.lineWidth = Math.max(1.6, r * 0.24); ctx.strokeStyle = '#ff4d4d'; ctx.save(); ctx.scale(1.12, 1.1); tokenPath(ctx, type, r); ctx.restore(); ctx.stroke();
      const bx = -r * 0.95, by = r * 0.85, br = Math.max(3.5, r * 0.42);
      ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fillStyle = '#e02424'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `800 ${(br * 1.5).toFixed(1)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', bx, by + br * 0.08);
    }
    if (opts.tint && opts.tint.a > 0.01) { tokenPath(ctx, type, r); ctx.fillStyle = rgba(opts.tint.color || '#ffffff', clamp01(opts.tint.a)); ctx.fill(); }
    ctx.restore();
  }

  // ---------- Fasi -----------------------------------------------------------
  const PHASES = [
    { key: 'strike', label: 'Attacchi missilistici', icon: '🚀', color: '#ff8a3d' },
    { key: 'nuke', label: 'Attacchi nucleari', icon: '☢️', color: '#d4ff4a' },
    { key: 'air', label: 'Operazioni aeree', icon: '✈️', color: '#7cc4ff' },
    { key: 'move', label: 'Movimenti simultanei', icon: '➡️', color: '#a5b8ff' },
    { key: 'battle', label: 'Battaglie', icon: '⚔️', color: '#ff5c5c' },
    { key: 'retreat', label: 'Ritirate', icon: '🏃', color: '#ffb020' },
    { key: 'capture', label: 'Conquiste', icon: '🚩', color: '#3ddc84' },
    { key: 'adjust', label: 'Costruzioni e scioglimenti', icon: '🛠️', color: '#5eead4' },
    { key: 'diplomacy', label: 'Accordi e tradimenti', icon: '🤝', color: '#f472b6' },
  ];
  const PHASE_OF_TYPE = { strike: 'strike', nuke: 'nuke', air: 'air', move: 'move', support: 'move', hold: 'move', convoy: 'move', battle: 'battle', bounce: 'battle', dislodge: 'retreat', retreat: 'retreat', destroy: 'retreat', capture: 'capture', build: 'adjust', disband: 'adjust', betrayal: 'diplomacy' };
  const GAP = 170;

  // ---------- Effetti (stateless: tutto è funzione del tempo T) --------------
  function fxLabel(o) {
    const dur = o.dur || 1400;
    return { t0: o.t0, t1: o.t0 + dur, layer: 'over', draw(c, T) {
      const p = A(o.at); if (!p) return; const l = T - o.t0;
      const a = Math.min(clamp01(l / 180), clamp01((dur - l) / 300)); const k = clamp01(l / 260);
      const lift = (F.R * 1.3 + 7) + (o.slot || 0) * 30;
      chip(c, p[0], p[1] - lift + (1 - Ease.outCubic(k)) * 8, o, a, 0.9 + 0.1 * Ease.outBack(k));
    } };
  }
  function fxExplosion(o) {
    const R = rng(o.seed), S = o.size || 12;
    const sparks = []; for (let i = 0; i < 20; i++) sparks.push({ a: R() * TAU, v: 60 + R() * 190, life: 350 + R() * 480, len: 3 + R() * 7, w: 0.8 + R() * 1.4 });
    const smoke = []; for (let i = 0; i < 7; i++) smoke.push({ a: R() * TAU, d: 2 + R() * 9, rise: 8 + R() * 14, r: 3.5 + R() * 5, d0: R() * 220 });
    return { t0: o.t0, t1: o.t0 + 1900, layer: 'over', draw(c, T) {
      const p = A(o.at); if (!p) return; const l = T - o.t0, z = F.ZS * S / 12, x = p[0], y = p[1];
      for (const s of smoke) {
        const q = (l - 140 - s.d0) / 1450; if (q <= 0 || q >= 1) continue;
        const sx = x + Math.cos(s.a) * s.d * z * (1 + q), sy = y + Math.sin(s.a) * s.d * z * 0.6 - s.rise * q * z * 2.2;
        c.fillStyle = `rgba(46,44,52,${(0.42 * (1 - q) * Math.min(1, q * 6)).toFixed(3)})`; c.beginPath(); c.arc(sx, sy, s.r * z * (1 + q * 1.9), 0, TAU); c.fill();
      }
      c.save(); c.globalCompositeOperation = 'lighter';
      if (l < 1700) radial(c, x, y, 28 * z, [[0, `rgba(255,120,40,${(0.5 * (1 - l / 1700)).toFixed(3)})`], [1, 'rgba(255,60,20,0)']]);
      if (l < 760) {
        const k = clamp01(l / 320), r = S * z * (0.35 + 0.95 * Ease.outCubic(k)), a = l < 200 ? 1 : 1 - (l - 200) / 560;
        radial(c, x, y, r, [[0, `rgba(255,255,242,${a})`], [0.25, `rgba(255,228,140,${a})`], [0.6, `rgba(255,128,40,${a * 0.85})`], [1, 'rgba(200,40,10,0)']]);
      }
      if (l < 540) { const k = l / 540; c.strokeStyle = `rgba(255,236,200,${(0.75 * (1 - k)).toFixed(3)})`; c.lineWidth = 2.4 * (1 - k) + 0.5; c.beginPath(); c.arc(x, y, S * z * (0.5 + 2.2 * Ease.outCubic(k)), 0, TAU); c.stroke(); }
      c.lineCap = 'round';
      for (const s of sparks) {
        if (l >= s.life || l < 0) continue; const t = l / 1000, k = l / s.life;
        const d = s.v * (1 - Math.exp(-3.2 * t)) / 3.2 * z, px = x + Math.cos(s.a) * d, py = y + Math.sin(s.a) * d + 46 * t * t * z;
        const tl = s.len * z * (1 - k * 0.7);
        c.strokeStyle = `rgba(255,${(200 + 55 * (1 - k)) | 0},${(130 * (1 - k)) | 0},${(1 - k).toFixed(3)})`; c.lineWidth = s.w * z;
        c.beginPath(); c.moveTo(px - Math.cos(s.a) * tl, py - Math.sin(s.a) * tl); c.lineTo(px, py); c.stroke();
      }
      c.restore();
    } };
  }
  function fxMissile(o) {
    const big = !!o.big, R = rng(o.seed);
    const qx = (R() - 0.5) * 60;
    const flash = []; for (let i = 0; i < 10; i++) flash.push({ a: R() * TAU, v: 0.6 + R() * 0.8 });
    return { t0: o.t0, t1: o.t0 + o.dur + (o.hit ? 60 : 900), layer: 'over', draw(c, T) {
      const l = T - o.t0; if (l < 0) return; const z = F.ZS;
      const P2 = A(o.to); if (!P2) return;
      const P0 = A(o.from) || [P2[0] - 280 * z, P2[1] - 260 * z];
      const dist = Math.hypot(P2[0] - P0[0], P2[1] - P0[1]);
      const h = clamp(dist * 0.45, 70 * z, (big ? 340 : 270) * z);
      const C = [(P0[0] + P2[0]) / 2 + (o.side || 0) * dist * 0.14, Math.min(P0[1], P2[1]) - h];
      const bez = (u) => { const v = 1 - u; return [v * v * P0[0] + 2 * v * u * C[0] + u * u * P2[0], v * v * P0[1] + 2 * v * u * C[1] + u * u * P2[1]]; };
      const ur = l / o.dur, uEnd = o.hit ? 1 : o.uInt, u = Math.min(ur, uEnd);
      if (l < 380) { c.save(); c.globalCompositeOperation = 'lighter'; radial(c, P0[0], P0[1], (big ? 22 : 13) * z, [[0, `rgba(255,236,190,${(1 - l / 380).toFixed(3)})`], [1, 'rgba(255,140,40,0)']]); c.restore(); }
      if (ur <= uEnd) {
        for (let k = 1; k <= 14; k++) {
          const uk = u - k * 0.03; if (uk <= 0) break; const age = k * 0.03 * o.dur; const q = bez(uk);
          const a = 0.26 * (1 - age / (o.dur * 0.42)); if (a <= 0) break;
          c.fillStyle = `rgba(170,170,182,${a.toFixed(3)})`; c.beginPath(); c.arc(q[0], q[1], (1.4 + age * 0.0065) * z * (big ? 1.7 : 1), 0, TAU); c.fill();
        }
        c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
        const u0 = Math.max(0, u - (big ? 0.24 : 0.18)), N = 14; let prev = bez(u0);
        for (let s = 1; s <= N; s++) {
          const q = bez(u0 + (u - u0) * s / N), a = s / N;
          c.strokeStyle = big ? `rgba(220,255,140,${(a * 0.9).toFixed(3)})` : `rgba(255,${(170 + 70 * a) | 0},${(90 + 90 * a) | 0},${(a * 0.9).toFixed(3)})`;
          c.lineWidth = (0.5 + 2.4 * a) * z * (big ? 1.6 : 1); c.beginPath(); c.moveTo(prev[0], prev[1]); c.lineTo(q[0], q[1]); c.stroke(); prev = q;
        }
        const hd = bez(u);
        radial(c, hd[0], hd[1], (big ? 13 : 8) * z, [[0, 'rgba(255,255,255,1)'], [0.3, big ? 'rgba(230,255,150,.9)' : 'rgba(255,210,130,.9)'], [1, 'rgba(255,120,30,0)']]);
        c.restore();
      }
      if (!o.hit) {
        const tI = o.uInt * o.dur, fly = 0.22 * o.dur, tL = tI - fly, I = bez(o.uInt), Q0 = [P2[0] + qx * z, P2[1] + 4 * z];
        if (l >= tL && l < tI) {
          const p = Ease.inQuad((l - tL) / fly), ip = [lerp(Q0[0], I[0], p), lerp(Q0[1], I[1], p)], pt = Math.max(0, p - 0.4), tp = [lerp(Q0[0], I[0], pt), lerp(Q0[1], I[1], pt)];
          c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createLinearGradient(tp[0], tp[1], ip[0], ip[1]); g.addColorStop(0, 'rgba(120,220,255,0)'); g.addColorStop(1, 'rgba(160,235,255,.95)');
          c.strokeStyle = g; c.lineWidth = 1.6 * z; c.beginPath(); c.moveTo(tp[0], tp[1]); c.lineTo(ip[0], ip[1]); c.stroke(); radial(c, ip[0], ip[1], 5 * z, [[0, 'rgba(230,250,255,1)'], [1, 'rgba(120,220,255,0)']]); c.restore();
        }
        if (l >= tI && l < tI + 820) {
          const q = (l - tI) / 820; c.save(); c.globalCompositeOperation = 'lighter';
          radial(c, I[0], I[1], (5 + 20 * Ease.outCubic(Math.min(1, q * 2.2))) * z, [[0, `rgba(255,255,255,${(1 - q).toFixed(3)})`], [0.35, `rgba(150,230,255,${(0.85 * (1 - q)).toFixed(3)})`], [1, 'rgba(80,160,255,0)']]);
          c.strokeStyle = `rgba(200,240,255,${(1 - q).toFixed(3)})`; c.lineWidth = 1.2 * z; c.lineCap = 'round';
          for (const f of flash) { const r1 = (4 + 14 * q * f.v) * z, r2 = r1 + 5 * z * (1 - q); c.beginPath(); c.moveTo(I[0] + Math.cos(f.a) * r1, I[1] + Math.sin(f.a) * r1 + 10 * q * q * z); c.lineTo(I[0] + Math.cos(f.a) * r2, I[1] + Math.sin(f.a) * r2 + 10 * q * q * z); c.stroke(); }
          c.restore();
          if (q > 0.15) { const s = (q - 0.15) / 0.85; c.fillStyle = `rgba(90,90,104,${(0.35 * (1 - s)).toFixed(3)})`; c.beginPath(); c.arc(I[0], I[1] - 4 * s * z, (4 + 7 * s) * z, 0, TAU); c.fill(); }
        }
      }
    } };
  }
  function fxReticle(o) {
    return { t0: o.t0, t1: o.t1 + 120, layer: 'over', draw(c, T) {
      const p = A(o.at); if (!p) return; const l = T - o.t0, z = F.ZS, a = Math.min(clamp01(l / 200), clamp01((o.t1 + 120 - T) / 120));
      const r = (18 + 3 * Math.sin(l / 70)) * z;
      c.save(); c.globalAlpha *= a; c.strokeStyle = 'rgba(255,60,60,.95)'; c.lineWidth = 1.6; c.setLineDash([5, 4]); c.lineDashOffset = -l / 25;
      c.beginPath(); c.arc(p[0], p[1], r, 0, TAU); c.stroke(); c.setLineDash([]);
      c.beginPath(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { c.moveTo(p[0] + dx * r * 0.55, p[1] + dy * r * 0.55); c.lineTo(p[0] + dx * r * 1.35, p[1] + dy * r * 1.35); } c.stroke();
      if (Math.floor(l / 220) % 2 === 0) trefoil(c, p[0] + r * 0.95, p[1] - r * 0.95, 6 * z);
      c.restore();
    } };
  }
  function fxFlash(o) {
    return { t0: o.t0, t1: o.t0 + o.dur, layer: 'top', draw(c, T) {
      const l = T - o.t0, m = reduced() ? 0.35 : 1;
      let a = l < 50 ? l / 50 : l < 170 ? 1 : Math.pow(1 - (l - 170) / (o.dur - 170), 2);
      a *= m; if (a <= 0.003) return;
      c.fillStyle = l < 300 ? `rgba(255,255,255,${a.toFixed(3)})` : `rgba(255,246,228,${a.toFixed(3)})`; c.fillRect(0, 0, F.W, F.H);
    } };
  }
  function fxNuke(o) {
    const R = rng(o.seed);
    const puffs = []; for (let i = 0; i < 10; i++) puffs.push({ a: (i / 10) * TAU + R() * 0.3, rj: 0.75 + R() * 0.35, s: 0.55 + R() * 0.32 });
    const embers = []; for (let i = 0; i < 36; i++) embers.push({ a: -Math.PI / 2 + (R() - 0.5) * 2.4, v: 40 + R() * 120, life: 900 + R() * 1400, d0: R() * 500 });
    return { t0: o.t0, t1: o.t0 + 4400, layer: 'over', draw(c, T) {
      const p = A(o.at); if (!p) return; const l = T - o.t0; if (l < 0) return; const z = F.ZS, x = p[0], y = p[1];
      const fade = 1 - clamp01((l - 2700) / 1600);
      // polvere alla base
      const dq = Ease.outCubic(clamp01(l / 2600));
      c.fillStyle = `rgba(122,98,82,${(0.42 * (1 - clamp01((l - 1900) / 2300))).toFixed(3)})`; c.beginPath(); c.ellipse(x, y + 2 * z, (14 + 56 * dq) * z, (5 + 13 * dq) * z, 0, 0, TAU); c.fill();
      // onde d'urto ad anelli (in prospettiva)
      [0, 150, 330].forEach((d, i) => {
        const k = (l - d) / 1450; if (k <= 0 || k >= 1) return; const r = (12 + 160 * Ease.outCubic(k)) * z;
        c.strokeStyle = ['rgba(255,255,255,', 'rgba(255,214,140,', 'rgba(255,128,60,'][i] + (Math.pow(1 - k, 1.4) * 0.92).toFixed(3) + ')';
        c.lineWidth = (7 * (1 - k) + 1) * z; c.beginPath(); c.ellipse(x, y, r, r * 0.62, 0, 0, TAU); c.stroke();
        if (i === 0) { c.fillStyle = `rgba(255,240,220,${(0.12 * (1 - k)).toFixed(3)})`; c.fill(); }
      });
      // fungo: stelo
      const H = 80 * z * Ease.outCubic(clamp01((l - 120) / 1750));
      if (H > 1 && fade > 0) {
        const g = c.createLinearGradient(0, y, 0, y - H); g.addColorStop(0, `rgba(255,176,86,${(0.92 * fade).toFixed(3)})`); g.addColorStop(0.5, `rgba(196,94,52,${(0.78 * fade).toFixed(3)})`); g.addColorStop(1, `rgba(112,72,62,${(0.66 * fade).toFixed(3)})`);
        const wb = 10 * z, wt = 5.5 * z; c.fillStyle = g; c.beginPath(); c.moveTo(x - wb, y); c.quadraticCurveTo(x - wt * 0.55, y - H * 0.5, x - wt, y - H); c.lineTo(x + wt, y - H); c.quadraticCurveTo(x + wt * 0.55, y - H * 0.5, x + wb, y); c.closePath(); c.fill();
      }
      // fungo: cappello luminoso
      if (l > 180 && fade > 0) {
        const ck = Ease.outCubic(clamp01((l - 180) / 2000)), cx = x, cy = y - H - 4 * z, rx = (10 + 28 * ck) * z, ry = (7 + 13 * ck) * z;
        c.save(); c.globalCompositeOperation = 'lighter'; radial(c, cx, cy + ry * 0.35, rx * 1.35, [[0, `rgba(255,190,90,${(0.55 * fade).toFixed(3)})`], [1, 'rgba(255,90,30,0)']]); c.restore();
        for (const pf of puffs) {
          const px = cx + Math.cos(pf.a) * rx * 0.68 * pf.rj, py = cy + Math.sin(pf.a) * ry * 0.5 * pf.rj, pr = ry * pf.s * 1.3;
          const g = c.createRadialGradient(px, py + pr * 0.4, pr * 0.05, px, py, pr);
          g.addColorStop(0, `rgba(255,206,128,${(0.95 * fade).toFixed(3)})`); g.addColorStop(0.5, `rgba(212,108,60,${(0.9 * fade).toFixed(3)})`); g.addColorStop(1, 'rgba(84,54,48,0)');
          c.fillStyle = g; c.beginPath(); c.arc(px, py, pr, 0, TAU); c.fill();
        }
        c.save(); c.globalCompositeOperation = 'lighter'; radial(c, cx, cy, rx * 0.75, [[0, `rgba(255,240,200,${(0.6 * fade * (1 - ck * 0.55)).toFixed(3)})`], [1, 'rgba(255,190,110,0)']]); c.restore();
        if (l > 500 && l < 2700) { const k = (l - 500) / 2200; c.strokeStyle = `rgba(236,238,248,${(0.4 * Math.sin(Math.PI * k)).toFixed(3)})`; c.lineWidth = 2 * z; c.beginPath(); c.ellipse(x, y - H * 0.55, (8 + 24 * k) * z, (3 + 6 * k) * z, 0, 0, TAU); c.stroke(); }
      }
      // palla di fuoco che sale nel cappello
      if (l < 2700) {
        const k = clamp01(l / 380), r = (8 + 30 * Ease.outCubic(k)) * z * (1 - 0.3 * clamp01((l - 900) / 1800)), a = l < 900 ? 1 : 1 - (l - 900) / 1800;
        const fy = y - H * 0.92 * Ease.inOutSine(clamp01((l - 200) / 1750));
        c.save(); c.globalCompositeOperation = 'lighter';
        radial(c, x, fy, r, [[0, `rgba(255,255,255,${a.toFixed(3)})`], [0.2, `rgba(255,250,205,${a.toFixed(3)})`], [0.5, `rgba(255,172,62,${(a * 0.9).toFixed(3)})`], [0.8, `rgba(222,62,22,${(a * 0.5).toFixed(3)})`], [1, 'rgba(160,20,10,0)']]);
        if (l < 650) radial(c, x, y, 110 * z, [[0, `rgba(255,255,255,${(0.9 * (1 - l / 650)).toFixed(3)})`], [1, 'rgba(255,240,200,0)']]);
        c.lineCap = 'round';
        for (const e of embers) {
          const q = (l - e.d0) / e.life; if (q <= 0 || q >= 1) continue; const t = (l - e.d0) / 1000, d = e.v * (1 - Math.exp(-2 * t)) / 2 * z;
          const ex = x + Math.cos(e.a) * d, ey = y + Math.sin(e.a) * d - 10 * t * z;
          c.fillStyle = `rgba(255,${(180 + 60 * (1 - q)) | 0},90,${(0.9 * (1 - q)).toFixed(3)})`; c.beginPath(); c.arc(ex, ey, 1.3 * z, 0, TAU); c.fill();
        }
        c.restore();
      }
    } };
  }
  function fxNukeGlow(o) {
    return { t0: o.t0, t1: Infinity, layer: 'under', draw(c, T) {
      const p = A(o.at); if (!p) return; const l = T - o.t0, z = F.ZS, a = clamp01(l / 900);
      const r = (34 + 4 * Math.sin(l / 380)) * z;
      c.save(); c.globalCompositeOperation = 'lighter';
      radial(c, p[0], p[1], r, [[0, `rgba(210,255,90,${(0.42 * a).toFixed(3)})`], [0.55, `rgba(150,230,60,${(0.2 * a).toFixed(3)})`], [1, 'rgba(120,200,40,0)']]);
      c.restore();
      c.save(); c.globalAlpha *= a; trefoil(c, p[0], p[1], 7 * z); c.restore();
    } };
  }
  function jetShape(c, x, y, ang, z, color) {
    c.save(); c.translate(x, y); c.rotate(ang); c.scale(z, z);
    c.beginPath(); c.moveTo(10, 0); c.lineTo(3, -1.7); c.lineTo(-2, -8.5); c.lineTo(-4.6, -8.5); c.lineTo(-3.2, -1.9); c.lineTo(-7.2, -1.7); c.lineTo(-9.6, -4.6); c.lineTo(-11, -4.6); c.lineTo(-10, 0);
    c.lineTo(-11, 4.6); c.lineTo(-9.6, 4.6); c.lineTo(-7.2, 1.7); c.lineTo(-3.2, 1.9); c.lineTo(-4.6, 8.5); c.lineTo(-2, 8.5); c.lineTo(3, 1.7); c.closePath();
    if (color) { c.fillStyle = '#e9eef8'; c.fill(); c.lineWidth = 0.9; c.strokeStyle = '#0b1020'; c.stroke(); c.strokeStyle = color; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-8.5, 0); c.lineTo(5, 0); c.stroke(); c.fillStyle = '#20314f'; c.beginPath(); c.ellipse(5.2, 0, 1.8, 0.9, 0, 0, TAU); c.fill(); }
    else { c.fillStyle = 'rgba(0,0,0,.28)'; c.fill(); }
    c.restore();
  }
  function fxAir(o) {
    const R = rng(o.seed), dur = o.dur;
    const flak = []; for (let i = 0; i < 8; i++) flak.push({ dx: (R() - 0.5) * 50, dy: (R() - 0.5) * 34 - 10, t: R() * 700 });
    return { t0: o.t0, t1: o.t0 + dur + 900, layer: 'over', draw(c, T) {
      const P = A(o.at); if (!P) return; const l = T - o.t0, z = F.ZS;
      let d = [0.97, -0.24]; const O = o.origin ? A(o.origin) : null;
      if (O) { const dx = P[0] - O[0], dy = P[1] - O[1], L = Math.hypot(dx, dy); if (L > 30) d = [dx / L, dy / L]; }
      const n = [-d[1], d[0]], Lp = 230 * z, e = clamp01(l / dur), ang = Math.atan2(d[1], d[0]), pass = l - dur * 0.5;
      // effetti sulla provincia
      if (o.cancelled) {
        for (const f of flak) { const q = (pass + 300 - f.t) / 650; if (q <= 0 || q >= 1) continue; const fx = P[0] + f.dx * z, fy = P[1] + f.dy * z;
          c.save(); c.globalCompositeOperation = 'lighter'; if (q < 0.25) radial(c, fx, fy, 6 * z, [[0, 'rgba(255,220,150,.95)'], [1, 'rgba(255,120,40,0)']]); c.restore();
          c.fillStyle = `rgba(40,40,46,${(0.55 * (1 - q)).toFixed(3)})`; c.beginPath(); c.arc(fx, fy, (3 + 6 * q) * z, 0, TAU); c.fill(); }
      } else if (o.mode === 'cover') {
        const q = clamp01((pass + 150) / 450), out = clamp01((dur * 0.5 + 900 - pass - 200) / 400);
        if (q > 0 && out > 0) {
          const r = 30 * z * Ease.outBack(q); c.save(); c.globalAlpha *= out;
          const g = c.createRadialGradient(P[0], P[1], r * 0.2, P[0], P[1], r); g.addColorStop(0, 'rgba(124,196,255,0)'); g.addColorStop(0.8, 'rgba(124,196,255,.18)'); g.addColorStop(1, 'rgba(160,215,255,.55)');
          c.fillStyle = g; c.beginPath(); c.ellipse(P[0], P[1], r, r * 0.8, 0, Math.PI, TAU); c.closePath(); c.fill();
          c.strokeStyle = 'rgba(180,225,255,.9)'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(P[0], P[1], r, r * 0.8, 0, Math.PI, TAU); c.stroke();
          c.setLineDash([3, 4]); c.lineDashOffset = -l / 30; c.beginPath(); c.ellipse(P[0], P[1], r, r * 0.28, 0, 0, TAU); c.stroke(); c.setLineDash([]); c.restore();
        }
      } else if (pass > 0 && pass < 950) {
        const q = pass / 950; c.strokeStyle = `rgba(61,220,132,${(0.9 * (1 - q)).toFixed(3)})`; c.lineWidth = 2.5 * (1 - q) + 0.5;
        for (const off of [0, 0.25]) { const qq = clamp01(q - off); if (qq <= 0) continue; c.beginPath(); c.arc(P[0], P[1], (10 + 26 * Ease.outCubic(qq)) * z, 0, TAU); c.stroke(); }
      }
      if (l > dur) return;
      const lead = [P[0] - d[0] * Lp + d[0] * 2 * Lp * e, P[1] - d[1] * Lp + d[1] * 2 * Lp * e];
      const fadeIn = Math.min(clamp01(l / 200), clamp01((dur - l) / 200));
      c.save(); c.globalAlpha *= fadeIn;
      const wing = [[0, 0], [-17, 14], [-17, -14]];
      for (let i = 0; i < wing.length; i++) {
        const [ox, oy] = wing[i]; const jx = lead[0] + (d[0] * ox + n[0] * oy) * z, jy = lead[1] + (d[1] * ox + n[1] * oy) * z;
        const tl = Math.min(2 * Lp * e, 120 * z), tx = jx - d[0] * tl, ty = jy - d[1] * tl;
        const g = c.createLinearGradient(tx, ty, jx, jy); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, o.cancelled && i === 2 ? 'rgba(70,70,80,.7)' : 'rgba(255,255,255,.6)');
        c.strokeStyle = g; c.lineWidth = (o.cancelled && i === 2 ? 3 : 1.5) * z; c.beginPath(); c.moveTo(tx, ty); c.lineTo(jx - d[0] * 9 * z, jy - d[1] * 9 * z); c.stroke();
        jetShape(c, jx + 7 * z, jy + 13 * z, ang, z * 0.9, null);
        jetShape(c, jx, jy, ang, z, o.color);
      }
      c.restore();
    } };
  }
  function curvePoints(F0, F1, bend, n) {
    const mx = (F0[0] + F1[0]) / 2, my = (F0[1] + F1[1]) / 2, dx = F1[0] - F0[0], dy = F1[1] - F0[1];
    const C = [mx - dy * bend, my + dx * bend], out = [];
    for (let i = 0; i <= n; i++) { const u = i / n, v = 1 - u; out.push([v * v * F0[0] + 2 * v * u * C[0] + u * u * F1[0], v * v * F0[1] + 2 * v * u * C[1] + u * u * F1[1]]); }
    return out;
  }
  function strokePoly(c, pts, upto) {
    const n = pts.length - 1, m = clamp(upto, 0, 1) * n; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    const k = Math.floor(m); for (let i = 1; i <= k; i++) c.lineTo(pts[i][0], pts[i][1]);
    if (k < n) { const f = m - k; c.lineTo(lerp(pts[k][0], pts[k + 1][0], f), lerp(pts[k][1], pts[k + 1][1], f)); }
    c.stroke();
  }
  function polyAt(pts, u) { const n = pts.length - 1, m = clamp(u, 0, 1) * n, k = Math.min(n - 1, Math.floor(m)), f = m - k; return [lerp(pts[k][0], pts[k + 1][0], f), lerp(pts[k][1], pts[k + 1][1], f)]; }
  function fxSupport(o) {
    return { t0: o.t0, t1: o.t0 + 6e4, layer: 'under', draw(c, T) {
      const end = o.tEnd || o.t0 + 1800; if (T > end + 350) return;
      const F0 = A({ unit: o.unit, at: o.from }), Tg = A(o.target); if (!F0 || !Tg) return;
      const isMove = o.to && o.to !== o.target; let E1 = Tg;
      if (isMove) { const D = A(o.to); if (D) E1 = [lerp(Tg[0], D[0], 0.6), lerp(Tg[1], D[1], 0.6)]; }
      const l = T - o.t0, pr = Ease.outCubic(clamp01(l / 750)), z = F.ZS;
      const dist = Math.hypot(E1[0] - F0[0], E1[1] - F0[1]); if (dist < 2) return;
      const back = Math.min(dist * 0.3, F.R * 1.1), ux = (E1[0] - F0[0]) / dist, uy = (E1[1] - F0[1]) / dist;
      const S0 = [F0[0] + ux * back, F0[1] + uy * back], S1 = isMove ? E1 : [E1[0] - ux * F.R * 1.3, E1[1] - uy * F.R * 1.3];
      const pts = curvePoints(S0, S1, 0.12, 22);
      let col = shade(o.color, 0.35), alpha = 1;
      const tc = o.tCut || (o.t0 + 950);
      if (o.cut && T > tc) { const q = clamp01((T - tc) / 650); col = mixCol(col, '#ff4d4d', clamp01(q * 2)); alpha = 1 - 0.65 * q; }
      if (T > end) alpha *= 1 - clamp01((T - end) / 350);
      c.save(); c.globalAlpha *= alpha; c.lineCap = 'round';
      c.strokeStyle = 'rgba(5,8,16,.55)'; c.lineWidth = 4.2 * z; c.setLineDash([]); strokePoly(c, pts, pr);
      c.strokeStyle = col; c.lineWidth = 2.1 * z; c.setLineDash([6 * z, 5 * z]); c.lineDashOffset = -l / 28; strokePoly(c, pts, pr); c.setLineDash([]);
      if (pr > 0.98) {
        const a = pts[pts.length - 2], b = pts[pts.length - 1], ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        if (isMove) { c.fillStyle = col; arrowHead(c, b[0], b[1], ang, 6 * z); c.fill(); }
        else { c.strokeStyle = col; c.lineWidth = 1.8 * z; c.setLineDash([4, 3]); c.lineDashOffset = l / 40; c.beginPath(); c.arc(Tg[0], Tg[1], F.R * 1.6, 0, TAU); c.stroke(); c.setLineDash([]); }
      }
      if (o.cut && T > tc) {
        const q = clamp01((T - tc) / 260), m = polyAt(pts, 0.5), s = 6 * z * Ease.outBack(q);
        c.strokeStyle = '#0b1020'; c.lineWidth = 4.5 * z; c.beginPath(); c.moveTo(m[0] - s, m[1] - s); c.lineTo(m[0] + s, m[1] + s); c.moveTo(m[0] + s, m[1] - s); c.lineTo(m[0] - s, m[1] + s); c.stroke();
        c.strokeStyle = '#ff4d4d'; c.lineWidth = 2.4 * z; c.stroke();
      }
      c.restore();
    } };
  }
  function fxMoveArrow(o) {
    return { t0: o.t0, t1: o.t0 + 6e4, layer: 'under', draw(c, T) {
      const end = o.tEnd || o.t0 + 1500; if (T > end + 450) return;
      const pts = []; for (const a of o.path) { const q = A(a); if (q) pts.push(q); } if (pts.length < 2) return;
      const l = T - o.t0, pr = Ease.outCubic(clamp01(l / 550)), z = F.ZS;
      let alpha = 0.75 * (T > end ? 1 - clamp01((T - end) / 450) : 1);
      const fail = o.tFail && T > o.tFail ? clamp01((T - o.tFail) / 300) : 0;
      const L = pts.slice(); const a0 = L[L.length - 2], b0 = L[L.length - 1], dd = Math.hypot(b0[0] - a0[0], b0[1] - a0[1]);
      if (dd > 1) { const cut = Math.min(dd * 0.45, F.R * 1.25); L[L.length - 1] = [b0[0] - (b0[0] - a0[0]) / dd * cut, b0[1] - (b0[1] - a0[1]) / dd * cut]; }
      const col = fail ? mixCol(shade(o.color, 0.3), '#ff5c5c', fail) : shade(o.color, 0.3);
      c.save(); c.globalAlpha *= alpha; c.lineCap = 'round'; c.lineJoin = 'round';
      c.strokeStyle = 'rgba(5,8,16,.5)'; c.lineWidth = 4.5 * z; strokePoly(c, L, pr);
      c.strokeStyle = col; c.lineWidth = 2.3 * z; c.setLineDash([8 * z, 6 * z]); c.lineDashOffset = -l / 22; strokePoly(c, L, pr); c.setLineDash([]);
      if (pr > 0.97) { const a = L[L.length - 2], b = L[L.length - 1]; c.fillStyle = col; arrowHead(c, b[0], b[1], Math.atan2(b[1] - a[1], b[0] - a[0]), 7 * z); c.fill(); }
      if (fail && o.block) {
        const bp = A(o.block); if (bp) { const a = pts[pts.length - 2], b = pts[pts.length - 1], ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2, s = 9 * z * Ease.outBack(fail);
          c.strokeStyle = '#0b1020'; c.lineWidth = 5 * z; c.beginPath(); c.moveTo(bp[0] - Math.cos(ang) * s, bp[1] - Math.sin(ang) * s); c.lineTo(bp[0] + Math.cos(ang) * s, bp[1] + Math.sin(ang) * s); c.stroke();
          c.strokeStyle = '#ff5c5c'; c.lineWidth = 2.6 * z; c.stroke(); }
      }
      c.restore();
    } };
  }
  function fxConvoy(o) {
    return { t0: o.t0, t1: o.t0 + 6e4, layer: 'under', draw(c, T) {
      const end = o.tEnd || o.t0 + 2000; if (T > end + 500) return;
      const pts = []; for (const a of o.path) { const q = A(a); if (q) pts.push(q); } if (pts.length < 2) return;
      const l = T - o.t0, z = F.ZS, a = Math.min(clamp01(l / 300), 1 - clamp01((T - end) / 500));
      c.save(); c.globalAlpha *= a; c.lineCap = 'round';
      c.strokeStyle = 'rgba(110,220,255,.25)'; c.lineWidth = 7 * z; c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
      c.strokeStyle = 'rgba(150,232,255,.95)'; c.lineWidth = 2.6 * z; c.setLineDash([0.1, 6 * z]); c.lineDashOffset = -l / 18; c.stroke(); c.setLineDash([]);
      for (const s of o.seas) {
        const p = A(s); if (!p) continue; const r = (F.R * 1.7 + 2 * Math.sin(l / 160)) * 1;
        c.strokeStyle = 'rgba(150,232,255,.85)'; c.lineWidth = 1.5; c.beginPath(); c.arc(p[0], p[1], r, 0, TAU); c.stroke();
        c.strokeStyle = 'rgba(150,232,255,.55)'; c.lineWidth = 1.2; c.beginPath();
        for (let w = -1; w <= 1; w += 2) { for (let i = 0; i <= 10; i++) { const xx = p[0] - r * 0.6 + r * 1.2 * i / 10, yy = p[1] + w * r * 1.25 + Math.sin(i / 10 * TAU + l / 200) * 1.6 * z; if (i) c.lineTo(xx, yy); else c.moveTo(xx, yy); } }
        c.stroke();
      }
      c.restore();
    } };
  }
  function fxHold(o) {
    return { t0: o.t0, t1: o.t0 + 1300, layer: 'under', draw(c, T) {
      const p = A(o.at); if (!p) return; const q = (T - o.t0) / 1300;
      c.save(); c.strokeStyle = rgba(shade(o.color, 0.5), (0.7 * (1 - q)).toFixed(3)); c.lineWidth = 2; c.setLineDash([4, 3]); c.lineDashOffset = T / 40;
      c.beginPath(); c.arc(p[0], p[1], F.R * (1.45 + 0.5 * Ease.outCubic(q)), 0, TAU); c.stroke(); c.restore();
    } };
  }
  function swords(c, x, y, s) {
    c.save(); c.translate(x, y); c.lineCap = 'round';
    for (const sg of [1, -1]) {
      c.save(); c.rotate(sg * Math.PI / 4);
      c.strokeStyle = '#0b1020'; c.lineWidth = 4.2 * s; c.beginPath(); c.moveTo(0, -10 * s); c.lineTo(0, 9 * s); c.stroke();
      c.strokeStyle = '#eef2fa'; c.lineWidth = 2.2 * s; c.beginPath(); c.moveTo(0, -10 * s); c.lineTo(0, 4.5 * s); c.stroke();
      c.strokeStyle = '#f5b942'; c.lineWidth = 2.4 * s; c.beginPath(); c.moveTo(-4 * s, 4.8 * s); c.lineTo(4 * s, 4.8 * s); c.stroke();
      c.strokeStyle = '#9a6a3a'; c.lineWidth = 2.2 * s; c.beginPath(); c.moveTo(0, 6 * s); c.lineTo(0, 9 * s); c.stroke();
      c.restore();
    }
    c.restore();
  }
  function fxBattle(o) {
    const R = rng(o.seed);
    const sparks = []; for (let i = 0; i < 30; i++) sparks.push({ a: R() * TAU, v: 70 + R() * 170, life: 300 + R() * 500, d0: R() * 500, w: 0.7 + R() * 1.2 });
    const booms = [0, 150, 320].map((d) => ({ d, dx: (R() - 0.5) * 18, dy: (R() - 0.5) * 12, s: 8 + R() * 4 }));
    return { t0: o.t0, t1: o.t1, layer: 'over', draw(c, T) {
      const C = A(o.at); if (!C) return; const z = F.ZS, l2 = T - o.tClash;
      let ax = 0, ay = 0, na = 0; for (const id of o.attackers) { const p = F.pos.get(id); if (p) { ax += p[0]; ay += p[1]; na++; } }
      const ctr = na ? [lerp(C[0], ax / na, 0.45), lerp(C[1], ay / na, 0.45)] : C;
      // scintille e piccole esplosioni
      if (l2 > -60 && l2 < 1100) {
        c.save(); c.globalCompositeOperation = 'lighter';
        if (l2 < 160) radial(c, ctr[0], ctr[1], 26 * z, [[0, `rgba(255,255,230,${(0.95 * (1 - Math.max(0, l2) / 160)).toFixed(3)})`], [1, 'rgba(255,190,90,0)']]);
        for (const b of booms) {
          const l = l2 - b.d; if (l < 0 || l > 650) continue; const k = clamp01(l / 260), r = b.s * z * (0.4 + Ease.outCubic(k)), a = l < 160 ? 1 : 1 - (l - 160) / 490;
          radial(c, ctr[0] + b.dx * z, ctr[1] + b.dy * z, r, [[0, `rgba(255,255,236,${a.toFixed(3)})`], [0.3, `rgba(255,214,120,${a.toFixed(3)})`], [0.7, `rgba(255,110,40,${(a * 0.7).toFixed(3)})`], [1, 'rgba(180,30,10,0)']]);
        }
        c.lineCap = 'round';
        for (const s of sparks) {
          const l = l2 - s.d0; if (l < 0 || l >= s.life) continue; const t = l / 1000, k = l / s.life, d = s.v * (1 - Math.exp(-4 * t)) / 4 * z;
          const px = ctr[0] + Math.cos(s.a) * d, py = ctr[1] + Math.sin(s.a) * d + 30 * t * t * z;
          c.strokeStyle = `rgba(255,${(215 + 40 * (1 - k)) | 0},${(140 * (1 - k)) | 0},${(1 - k).toFixed(3)})`; c.lineWidth = s.w * z;
          c.beginPath(); c.moveTo(px - Math.cos(s.a) * 5 * z * (1 - k), py - Math.sin(s.a) * 5 * z * (1 - k)); c.lineTo(px, py); c.stroke();
        }
        c.restore();
      }
      // spade incrociate
      if (l2 > -260 && l2 < 1000) {
        const q = clamp01((l2 + 260) / 300), out = clamp01((1000 - l2) / 300);
        c.save(); c.globalAlpha *= out; swords(c, ctr[0], ctr[1] - F.R * 2.4, z * 0.9 * Ease.outBack(q)); c.restore();
      }
      // forze in campo
      const l = T - o.t0, a = Math.min(clamp01(l / 200), clamp01((o.t1 - T) / 260));
      if (a > 0 && o.strengths) {
        c.save(); c.globalAlpha *= a;
        for (const id of Object.keys(o.strengths)) {
          let p = F.pos.get(id); const garrison = !p; if (!p) p = C;
          const n = o.strengths[id], won = l2 > 0 && o.winner != null && String(o.winner) === String(id), lost = l2 > 0 && !won && (o.winner != null || o.attackers.length > 1);
          const txt = (garrison ? '🏰 ' : '') + n; c.font = `800 ${11 * Math.max(0.9, z)}px ${FONT}`; const w = c.measureText(txt).width + 10, h = 15 * Math.max(0.9, z);
          const x = p[0] + F.R * 1.2, y = p[1] - F.R * 1.2 - h / 2 - (garrison ? F.R * 1.6 : 0);
          rr(c, x - w / 2, y - h / 2, w, h, h / 2);
          c.fillStyle = won ? '#f5b942' : lost ? 'rgba(40,46,64,.92)' : 'rgba(8,12,24,.92)'; c.fill();
          c.lineWidth = 1.3; c.strokeStyle = won ? '#fff2c4' : lost ? 'rgba(150,160,185,.6)' : 'rgba(255,255,255,.75)'; c.stroke();
          c.fillStyle = won ? '#1a1200' : lost ? '#9aa5bd' : '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, x, y + 0.5);
        }
        c.restore();
      }
    } };
  }
  function fxPuff(o) {
    const R = rng(o.seed), n = o.n || 6, col = o.color || '150,128,100';
    const ps = []; for (let i = 0; i < n; i++) ps.push({ a: R() * TAU, v: 6 + R() * 12, r: 2 + R() * 3, d0: R() * 120 });
    return { t0: o.t0, t1: o.t0 + 1100, layer: o.layer || 'under', draw(c, T) {
      const p = A(o.at); if (!p) return; const z = F.ZS;
      for (const s of ps) { const q = (T - o.t0 - s.d0) / 900; if (q <= 0 || q >= 1) continue; const d = s.v * Ease.outCubic(q) * z;
        c.fillStyle = `rgba(${col},${(0.5 * (1 - q)).toFixed(3)})`; c.beginPath(); c.arc(p[0] + Math.cos(s.a) * d, p[1] + Math.sin(s.a) * d * 0.5 + F.R * 0.6 - 4 * q * z, s.r * z * (1 + q), 0, TAU); c.fill(); }
    } };
  }
  function fxDebris(o) {
    const R = rng(o.seed), col = o.color || '#888';
    const sh = []; for (let i = 0; i < 16; i++) sh.push({ a: -Math.PI / 2 + (R() - 0.5) * 2.6, v: 60 + R() * 120, s: 1.5 + R() * 2.8, spin: (R() - 0.5) * 18, c: R() < 0.5 ? shade(col, -0.35) : R() < 0.5 ? '#6b7280' : '#2b2f3a', life: 700 + R() * 500 });
    return { t0: o.t0, t1: o.t0 + 1300, layer: 'over', draw(c, T) {
      const p = A(o.at); if (!p) return; const l = T - o.t0, z = F.ZS;
      for (const s of sh) {
        if (l >= s.life) continue; const t = l / 1000, k = l / s.life;
        const x = p[0] + Math.cos(s.a) * s.v * t * z, y = p[1] + Math.sin(s.a) * s.v * t * z + 260 * t * t * z;
        c.save(); c.globalAlpha *= 1 - k * k; c.translate(x, y); c.rotate(s.spin * t); c.fillStyle = s.c;
        c.beginPath(); c.moveTo(-s.s * z, -s.s * 0.6 * z); c.lineTo(s.s * z, -s.s * 0.2 * z); c.lineTo(-s.s * 0.2 * z, s.s * 0.8 * z); c.closePath(); c.fill(); c.restore();
      }
    } };
  }
  function fxCapture(o) {
    return { t0: o.t0, t1: o.t0 + (o.capital ? 2000 : 1600), layer: 'under', draw(c, T) {
      const p = A(o.at); if (!p) return; const l = T - o.t0, z = F.ZS, col = o.color;
      c.save();
      let Rm = 46 * z;
      if (cfg.provPath) { c.beginPath(); const ok = safe(cfg.provPath, c, o.at); if (ok !== false) { c.clip(); Rm = 150 * z; } }
      const tint = Math.min(clamp01(l / 250), 1 - clamp01((l - 900) / 700));
      if (tint > 0) radial(c, p[0], p[1], Rm * 0.9, [[0, rgba(col, 0.42 * tint)], [0.7, rgba(col, 0.25 * tint)], [1, rgba(col, 0)]]);
      for (const d of [0, 220, 440]) {
        const q = (l - d) / 950; if (q <= 0 || q >= 1) continue; const r = Rm * Ease.outCubic(q), w = Math.max(4, 14 * z * (1 - q * 0.5));
        const g = c.createRadialGradient(p[0], p[1], Math.max(0, r - w), p[0], p[1], r + 1);
        g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.7, rgba(shade(col, 0.25), 0.75 * (1 - q))); g.addColorStop(1, rgba(col, 0));
        c.fillStyle = g; c.beginPath(); c.arc(p[0], p[1], r + 1, 0, TAU); c.fill();
      }
      c.restore();
      if (o.capital && l < 2000) {
        const a = Math.min(clamp01(l / 200), clamp01((2000 - l) / 500)), rot = l / 900;
        c.save(); c.globalAlpha *= a; c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 14; i++) { const an = rot + i * TAU / 14, r1 = F.R * 1.6, r2 = r1 + (24 + 10 * Math.sin(l / 120 + i)) * z;
          const g = c.createLinearGradient(p[0] + Math.cos(an) * r1, p[1] + Math.sin(an) * r1, p[0] + Math.cos(an) * r2, p[1] + Math.sin(an) * r2);
          g.addColorStop(0, 'rgba(255,214,90,.85)'); g.addColorStop(1, 'rgba(255,214,90,0)'); c.strokeStyle = g; c.lineWidth = 3 * z; c.beginPath(); c.moveTo(p[0] + Math.cos(an) * r1, p[1] + Math.sin(an) * r1); c.lineTo(p[0] + Math.cos(an) * r2, p[1] + Math.sin(an) * r2); c.stroke(); }
        c.restore();
        const q = clamp01(l / 700); c.save(); c.globalAlpha *= a; starPath(c, p[0], p[1] - F.R * 2.2, 8 * z * Ease.outElastic(q), 3.4 * z * Ease.outElastic(q), 5);
        c.fillStyle = '#ffd65a'; c.fill(); c.lineWidth = 1.2; c.strokeStyle = '#3a2a00'; c.stroke(); c.restore();
      }
    } };
  }
  function fxBuild(o) {
    const R = rng(o.seed); const sp = []; for (let i = 0; i < 10; i++) sp.push({ a: i * TAU / 10 + R() * 0.3, v: 0.7 + R() * 0.5 });
    return { t0: o.t0, t1: o.t0 + 1300, layer: 'under', draw(c, T) {
      const p = A(o.at); if (!p) return; const l = T - o.t0, z = F.ZS, col = shade(o.color, 0.45);
      c.save(); c.globalCompositeOperation = 'lighter';
      if (l < 900) { const a = Math.sin(Math.PI * clamp01(l / 900)); const g = c.createLinearGradient(0, p[1] - 70 * z, 0, p[1]); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, rgba(col, 0.55 * a)); c.fillStyle = g; c.fillRect(p[0] - 7 * z, p[1] - 70 * z, 14 * z, 70 * z); }
      const q = clamp01(l / 1100);
      c.strokeStyle = rgba(col, 0.8 * (1 - q)); c.lineWidth = 2; c.beginPath(); c.ellipse(p[0], p[1] + F.R * 0.4, F.R * (1 + 1.4 * Ease.outCubic(q)), F.R * 0.45 * (1 + 1.4 * Ease.outCubic(q)), 0, 0, TAU); c.stroke();
      for (const s of sp) { const r = F.R * (1.1 + 1.8 * Ease.outCubic(q) * s.v), x = p[0] + Math.cos(s.a + l / 900) * r, y = p[1] + Math.sin(s.a + l / 900) * r * 0.75, k = 2.6 * z * (1 - q);
        c.fillStyle = rgba('#ffffff', 0.9 * (1 - q)); c.beginPath(); c.moveTo(x, y - k); c.lineTo(x + k * 0.5, y); c.lineTo(x, y + k); c.lineTo(x - k * 0.5, y); c.closePath(); c.fill(); }
      c.restore();
    } };
  }
  function fxBanner(o) {
    const dur = 1500;
    return { t0: o.t0, t1: o.t0 + dur, layer: 'top', isBanner: true, draw(c, T) {
      const l = T - o.t0, a = Math.min(clamp01(l / 260), clamp01((dur - l) / 380)); if (a <= 0) return;
      const k = Ease.outBack(clamp01(l / 380)), x = F.W / 2, y = clamp(F.H * 0.17, 64, 120);
      c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(0.86 + 0.14 * k, 0.86 + 0.14 * k);
      c.font = `800 21px ${FONT}`; const t = `${o.icon}  ${o.label}`; const w = c.measureText(t).width;
      const lw = (w / 2 + 26) + 70 * Ease.outCubic(clamp01(l / 600));
      const g = c.createLinearGradient(-lw, 0, lw, 0); g.addColorStop(0, rgba(o.color, 0)); g.addColorStop(0.5, rgba(o.color, 0.25)); g.addColorStop(1, rgba(o.color, 0));
      c.fillStyle = 'rgba(6,9,18,.6)'; rr(c, -w / 2 - 22, -24, w + 44, 48, 12); c.fill();
      c.fillStyle = g; c.fillRect(-lw, -24, lw * 2, 48);
      c.strokeStyle = rgba(o.color, 0.9); c.lineWidth = 1.5; c.beginPath(); c.moveTo(-lw, 24); c.lineTo(lw, 24); c.moveTo(-lw * 0.6, -24); c.lineTo(lw * 0.6, -24); c.stroke();
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = rgba(o.color, 0.8); c.shadowBlur = 14; c.fillStyle = '#ffffff'; c.fillText(t, 0, -1);
      c.shadowBlur = 0; c.font = `700 10px ${FONT}`; c.fillStyle = rgba(shade(o.color, 0.4), 0.95); c.fillText(o.sub.toUpperCase(), 0, -33);
      c.restore();
    } };
  }
  function fxBetrayal(o) {
    const R = rng(o.seed); const crack = [[-1, -0.1]]; for (let i = 1; i < 9; i++) crack.push([-1 + i * 0.25, (R() - 0.5) * 0.9]); crack.push([1, 0.15]);
    return { t0: o.t0, t1: o.t0 + o.dur, layer: 'top', draw(c, T) {
      const l = T - o.t0, a = Math.min(clamp01(l / 250), clamp01((o.dur - l) / 380)); if (a <= 0) return;
      const pulse = 0.5 + 0.5 * Math.sin(l / 160);
      c.save(); c.globalAlpha *= a;
      const vg = c.createRadialGradient(F.W / 2, F.H / 2, Math.min(F.W, F.H) * 0.3, F.W / 2, F.H / 2, Math.max(F.W, F.H) * 0.75);
      vg.addColorStop(0, 'rgba(255,0,40,0)'); vg.addColorStop(1, `rgba(200,0,40,${(0.22 + 0.12 * pulse).toFixed(3)})`); c.fillStyle = vg; c.fillRect(0, 0, F.W, F.H);
      const w = Math.min(470, F.W - 32), h = 124, k = Ease.outBack(clamp01(l / 380));
      c.translate(F.W / 2, F.H * 0.42); c.scale(0.8 + 0.2 * k, 0.8 + 0.2 * k);
      c.shadowColor = 'rgba(0,0,0,.7)'; c.shadowBlur = 24; rr(c, -w / 2, -h / 2, w, h, 14);
      const g = c.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#42101b'); g.addColorStop(1, '#16050a'); c.fillStyle = g; c.fill(); c.shadowBlur = 0;
      c.lineWidth = 1.6; c.strokeStyle = '#ff4d6d'; c.stroke();
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `800 19px ${FONT}`; c.fillStyle = '#ff8fa3'; c.fillText('💔  TRADIMENTO', 0, -h / 2 + 24);
      c.font = `700 14px ${FONT}`; c.fillStyle = '#ffffff';
      c.fillText(`${flagOf(o.from)} ${nationNameOf(o.from)}  ha tradito  ${flagOf(o.to)} ${nationNameOf(o.to)}`, 0, -h / 2 + 52);
      if (o.text) { c.font = `500 12px ${FONT}`; c.fillStyle = '#f1d5da'; const lines = o._lines || (o._lines = wrapText(c, o.text, w - 36).slice(0, 2)); lines.forEach((s, i) => c.fillText(s, 0, -h / 2 + 78 + i * 16)); }
      const ck = clamp01((l - 300) / 450);
      if (ck > 0) {
        c.save(); rr(c, -w / 2, -h / 2, w, h, 14); c.clip(); c.strokeStyle = 'rgba(255,230,235,.9)'; c.lineWidth = 1.4; c.shadowColor = 'rgba(255,80,110,.9)'; c.shadowBlur = 8;
        c.beginPath(); const n = crack.length - 1, m = ck * n;
        for (let i = 0; i <= Math.floor(m); i++) { const p = crack[i], x = p[0] * w / 2, y = p[1] * h / 2; if (i) c.lineTo(x, y); else c.moveTo(x, y); }
        const i0 = Math.floor(m); if (i0 < n) { const f = m - i0, p = crack[i0], q = crack[i0 + 1]; c.lineTo(lerp(p[0], q[0], f) * w / 2, lerp(p[1], q[1], f) * h / 2); }
        c.stroke(); c.restore();
      }
      c.restore();
    } };
  }

  // ---------- Costruzione della timeline -------------------------------------
  function build(res) {
    res = res || {};
    const events = (Array.isArray(res.events) ? res.events : []).filter((e) => e && typeof e === 'object');
    const before = Array.isArray(res.before) ? res.before.filter((u) => u && u.id != null) : [];
    const after = Array.isArray(res.after) ? res.after.filter((u) => u && u.id != null) : [];
    const R = rng(hashStr('turno' + (res.turn || 0) + ':' + events.length));
    const seed = () => (R() * 4294967296) >>> 0;
    const toks = new Map(), afterById = new Map(after.map((u) => [u.id, u]));
    const effects = [], shakes = [], phases = [];
    const mkTok = (u, home, hidden) => {
      const t = { id: u.id, unit: { id: u.id, owner: u.owner, type: u.type === 'F' || u.utype === 'F' ? 'F' : 'A' }, home, segs: [], alphaK: hidden ? [{ t: -1, v: 0 }] : [], scaleK: [], shakes: [], tints: [], sup: null, dis: null, hideAt: Infinity, endA: home, busy: -Infinity, hidden: !!hidden, built: false };
      toks.set(u.id, t); return t;
    };
    before.forEach((u) => { if (u.loc && !toks.has(u.id)) mkTok(u, u.loc, false); });
    after.forEach((u) => { if (u.loc && !toks.has(u.id)) mkTok(u, u.loc, true); });
    const addSeg = (tok, s) => {
      if (!tok) return; const d = s.t1 - s.t0; if (s.t0 < tok.busy) { s.t0 = tok.busy; s.t1 = s.t0 + d; }
      s.path = [tok.endA].concat(s.path.slice(1)); s.ease = s.ease || Ease.inOutCubic; tok.segs.push(s); tok.endA = s.path[s.path.length - 1]; tok.busy = s.t1;
    };
    // etichette impilate per ancora
    const slots = new Map();
    const label = (o) => {
      const key = typeof o.at === 'string' ? o.at : o.at && o.at.unit !== undefined ? 'u:' + o.at.unit : JSON.stringify(o.at);
      const t0 = o.t0, t1 = o.t0 + (o.dur || 1400); const list = slots.get(key) || []; let s = 0;
      while (list.some((x) => x.s === s && x.t0 < t1 && t0 < x.t1)) s++;
      list.push({ s, t0, t1 }); slots.set(key, list); o.slot = s; effects.push(fxLabel(o));
    };
    const unitAnchor = (id, fallback) => (toks.has(id) ? { unit: id, at: fallback } : fallback);
    const kill = (tok, t, why) => {
      if (!tok || tok.hideAt < Infinity) return;
      tok.shakes.push({ t, dur: 520, amp: 3.2 }); tok.tints.push({ t, dur: 560, color: '#ff3b30', flicker: true });
      effects.push(fxExplosion({ at: { unit: tok.id }, t0: t + 420, size: 10, seed: seed() }));
      effects.push(fxDebris({ at: { unit: tok.id }, t0: t + 420, seed: seed(), color: colorOf(tok.unit.owner) }));
      tok.alphaK.push({ t: t + 420, v: 1 }, { t: t + 950, v: 0, ease: Ease.inQuad }); tok.scaleK.push({ t: t + 420, v: 1 }, { t: t + 950, v: 0.55 }); tok.hideAt = t + 950;
      label({ at: { unit: tok.id }, t0: t + 200, dur: 1500, icon: '💥', text: 'Unità distrutta', sub: why || '', accent: '#ff5c5c' });
    };
    const launch = (from, prov) => { const ll = nationLL(from); return ll ? { ll } : { off: prov, dx: -280, dy: -250 }; };

    const byPhase = {}; PHASES.forEach((p) => (byPhase[p.key] = []));
    const invalid = [];
    events.forEach((e) => { if (e.type === 'invalid') { invalid.push(e); return; } let ph = byPhase[e.phase] ? e.phase : PHASE_OF_TYPE[e.type]; if (ph && byPhase[ph]) byPhase[ph].push(e); });
    const moves = byPhase.move.filter((e) => e.type === 'move' && e.unit != null && e.to);
    const moveOf = new Map(moves.map((m) => [m.unit, m]));
    const bounced = new Set(byPhase.battle.filter((e) => e.type === 'bounce').map((e) => e.unit));
    const battles = byPhase.battle.filter((e) => e.type === 'battle' && e.at);
    const battleAt = new Map(battles.map((b) => [b.at, b]));
    const dislodgeEv = new Map(byPhase.retreat.filter((e) => e.type === 'dislodge').map((e) => [e.unit, e]));
    const metaOf = (k) => PHASES.find((p) => p.key === k);
    const phaseList = [];
    let t = 120;
    const open = (key) => { const p = Object.assign({}, metaOf(key), { start: t, dur: 0 }); phaseList.push(p); return p; };
    const close = (p, end) => { p.dur = Math.max(400, end - p.start); t = p.start + p.dur + GAP; };

    // 1. Missili
    if (byPhase.strike.length) {
      const P = open('strike'), evs = byPhase.strike, stag = Math.min(420, 1600 / evs.length); let end = P.start + 600;
      evs.forEach((e, i) => {
        const t0 = P.start + 200 + i * stag, count = Math.max(0, +e.count || 0), hits = Math.max(0, +e.hits || 0);
        const nVis = clamp(Math.ceil(Math.log2(count + 1)) || 1, 1, 6), visHits = hits > 0 ? clamp(Math.round(nVis * hits / Math.max(1, count)), 1, nVis) : 0;
        const org = launch(e.from, e.prov); let first = Infinity, last = t0 + 1200;
        for (let k = 0; k < nVis; k++) {
          const isHit = Math.floor((k + 1) * visHits / nVis) > Math.floor(k * visHits / nVis);
          const tk = t0 + k * 130, fl = 1150 + R() * 260, tgt = isHit ? { off: e.prov, dx: (R() - 0.5) * 20, dy: (R() - 0.5) * 12 } : e.prov;
          effects.push(fxMissile({ from: { off: org, dx: (R() - 0.5) * 12, dy: (R() - 0.5) * 8 }, to: tgt, t0: tk, dur: fl, hit: isHit, uInt: 0.6 + R() * 0.2, side: (R() - 0.5), seed: seed() }));
          if (isHit) { effects.push(fxExplosion({ at: tgt, t0: tk + fl, size: 11 + R() * 5, seed: seed() })); first = Math.min(first, tk + fl); }
          last = Math.max(last, tk + fl);
        }
        if (first < Infinity) shakes.push({ t: first, dur: 320, amp: 2.5 });
        label({ at: e.prov, t0: last + 120, dur: 1700, icon: '🎯', text: `${hits} colpi a segno su ${count}`, sub: `${flagOf(e.from)} ${nationNameOf(e.from)} → ${provNameOf(e.prov)}`, accent: '#ff8a3d' });
        const ti = first < Infinity ? first : last;
        if (e.suppressed != null && toks.has(e.suppressed)) {
          const tok = toks.get(e.suppressed); tok.sup = [ti + 80, Infinity]; tok.tints.push({ t: ti, dur: 260, color: '#ffffff' }); tok.shakes.push({ t: ti, dur: 300, amp: 2 });
          label({ at: { unit: tok.id }, t0: ti + 250, dur: 1500, icon: '⊘', text: 'Unità soppressa', sub: 'supporto tagliato, niente supporto aereo', accent: '#aab4c8' });
        }
        if (e.destroyed != null && toks.has(e.destroyed)) kill(toks.get(e.destroyed), ti + 40, 'Colpita dai missili');
        end = Math.max(end, last + 1900);
      });
      close(P, end);
    }
    // 2. Testate nucleari
    if (byPhase.nuke.length) {
      const P = open('nuke'); let end = P.start + 600;
      byPhase.nuke.forEach((e, i) => {
        const t0 = P.start + 200 + i * 1600, fl = 1250, ti = t0 + fl;
        effects.push(fxReticle({ at: e.prov, t0, t1: ti }));
        effects.push(fxMissile({ from: launch(e.from, e.prov), to: e.prov, t0, dur: fl, hit: true, big: true, side: 0.1, seed: seed() }));
        effects.push(fxFlash({ t0: ti, dur: 1050 }));
        effects.push(fxNuke({ at: e.prov, t0: ti, seed: seed() }));
        effects.push(fxNukeGlow({ at: e.prov, t0: ti + 1300 }));
        shakes.push({ t: ti, dur: 1150, amp: 9 });
        const dest = (Array.isArray(e.destroyed) ? e.destroyed : e.destroyed != null ? [e.destroyed] : []).filter((id) => toks.has(id));
        dest.forEach((id) => { const tok = toks.get(id); tok.tints.push({ t: ti - 20, dur: 300, color: '#ffffff', max: 1 }); tok.alphaK.push({ t: ti + 30, v: 1 }, { t: ti + 300, v: 0 }); tok.hideAt = ti + 300; });
        label({ at: e.prov, t0: ti + 900, dur: 2200, icon: '☢️', text: `Attacco nucleare su ${provNameOf(e.prov)}`, sub: (dest.length ? `${dest.length === 1 ? '1 unità distrutta' : dest.length + ' unità distrutte'} · ` : '') + 'provincia irradiata per 5 turni', accent: '#d4ff4a' });
        end = Math.max(end, ti + 3300);
      });
      close(P, end);
    }
    // 3. Stormi aerei
    if (byPhase.air.length) {
      const P = open('air'), evs = byPhase.air, stag = Math.min(240, 900 / evs.length); let end = P.start + 600;
      evs.forEach((e, i) => {
        const t0 = P.start + 150 + i * stag, dur = 1550, at = e.unit != null && toks.has(e.unit) ? { unit: e.unit, at: e.prov } : e.prov;
        const ll = nationLL(e.owner);
        effects.push(fxAir({ at, origin: ll ? { ll } : null, color: colorOf(e.owner), mode: e.mode, cancelled: !!e.cancelled, t0, dur, seed: seed() }));
        const who = `${flagOf(e.owner)} ${nationNameOf(e.owner)}`;
        if (e.cancelled) label({ at, t0: t0 + dur * 0.55, dur: 1500, icon: '✖', text: 'Supporto aereo annullato', sub: `${who} · intercettato dalla copertura nemica`, accent: '#ff5c5c' });
        else if (e.mode === 'cover') label({ at, t0: t0 + dur * 0.5, dur: 1500, icon: '🛡️', text: 'Copertura aerea', sub: who, accent: '#7cc4ff' });
        else label({ at, t0: t0 + dur * 0.5, dur: 1500, icon: '✈️', text: '+1 supporto aereo', sub: who, accent: '#3ddc84' });
        end = Math.max(end, t0 + dur + 1500);
      });
      close(P, end);
    }
    // 4. Movimenti (+ ordini non validi)
    const contested = [], pushed = new Set();
    const supFx = [], arrowFx = [], convoyFx = [];
    if (byPhase.move.length || invalid.length) {
      const P = open('move'), S0 = P.start; let end = S0 + 1650;
      byPhase.move.forEach((e) => {
        if (e.type === 'hold') effects.push(fxHold({ at: unitAnchor(e.unit, e.at), t0: S0 + 80, color: colorOf(e.owner) }));
        else if (e.type === 'support') { const f = fxSupport({ unit: e.unit, from: e.from, target: e.target, to: e.to, cut: !!e.cut, color: colorOf(e.owner), t0: S0 + 120, tCut: S0 + 1000 }); supFx.push(f); effects.push(f); }
      });
      moves.forEach((m) => {
        const tok = toks.get(m.unit), from = m.from || (tok && tok.home), conv = Array.isArray(m.convoy) ? m.convoy.filter(Boolean) : [];
        if (!from) return;
        const pts = [from].concat(conv, [m.to]);
        const isCont = m.ok === false || bounced.has(m.unit) || battleAt.has(m.to);
        const last = pts[pts.length - 2], ap = { lerp: [last, m.to, 0.42] };
        const ar = fxMoveArrow({ path: pts, color: colorOf(m.owner != null ? m.owner : tok && tok.unit.owner), t0: S0 + 40, block: m.ok === false || bounced.has(m.unit) ? ap : null });
        arrowFx.push({ fx: ar, m, isCont }); effects.push(ar);
        if (conv.length) { const cf = fxConvoy({ path: pts, seas: conv, t0: S0 }); convoyFx.push(cf); effects.push(cf); label({ at: conv[0], t0: S0 + 250, dur: 1500, icon: '⚓', text: 'Convoglio', sub: conv.map(provNameOf).join(' → '), accent: '#7ee0ff' }); }
        if (!tok) return;
        if (!isCont) { addSeg(tok, { t0: S0 + 150, t1: S0 + 1450, path: pts, ease: Ease.inOutCubic }); ar.tEnd = S0 + 1500; }
        else { addSeg(tok, { t0: S0 + 150, t1: S0 + 1250, path: pts.slice(0, -1).concat([ap]), ease: Ease.outCubic }); contested.push({ m, tok, ap, pts, ar }); }
      });
      invalid.forEach((e, i) => {
        const at = unitAnchor(e.unit, e.at || (toks.get(e.unit) || {}).home);
        label({ at, t0: S0 + 100 + i * 90, dur: 2300, icon: '✖', text: 'Ordine non valido', sub: e.reason || '', accent: '#ff5c5c', maxW: 220 });
        end = Math.max(end, S0 + 2400 + i * 90);
      });
      close(P, end);
    }
    // 5. Battaglie e rimbalzi
    let battleEnd = t;
    if (battles.length || contested.length || bounced.size) {
      const P = open('battle'), B = P.start, D = 1900, tc = B + 450;
      battles.forEach((b, i) => {
        const tcl = tc + (i % 3) * 60;
        effects.push(fxBattle({ at: b.at, attackers: Array.isArray(b.attackers) ? b.attackers : [], defender: b.defender, winner: b.winner, strengths: b.strengths || {}, t0: B + 60, t1: B + D - 60, tClash: tcl, seed: seed() }));
        shakes.push({ t: tcl, dur: 260, amp: 1.6 });
        const win = b.winner != null ? (toks.get(b.winner) || null) : null;
        let txt, acc, sub = '';
        if (b.winner == null) { txt = 'Stallo'; acc = '#ffd166'; sub = 'forze pari: nessuno entra'; }
        else if (b.defender != null && String(b.winner) === String(b.defender)) { txt = 'Difesa riuscita'; acc = '#7cc4ff'; }
        else { txt = 'Sfondamento'; acc = '#ff8a3d'; }
        if (win) sub = `${flagOf(win.unit.owner)} ${nationNameOf(win.unit.owner)}` + (sub ? ' · ' + sub : '');
        label({ at: b.at, t0: tcl + 380, dur: 1300, icon: '⚔️', text: txt, sub: sub || provNameOf(b.at), accent: acc });
      });
      contested.forEach(({ m, tok, ap, pts, ar }) => {
        const won = m.ok !== false && !bounced.has(m.unit);
        const tcl = tc + ((battles.findIndex((b) => b.at === m.to) % 3 + 3) % 3) * 60;
        if (won) { addSeg(tok, { t0: tcl + 220, t1: tcl + 760, path: [ap, m.to], ease: Ease.outCubic }); ar.tEnd = tcl + 760; }
        else {
          addSeg(tok, { t0: tcl + 130, t1: tcl + 830, path: [ap].concat(pts.slice(0, -1).reverse()), ease: Ease.outBack }); ar.tFail = tcl; ar.tEnd = tcl + 900;
          tok.shakes.push({ t: tcl, dur: 320, amp: 2.2 }); effects.push(fxPuff({ at: ap, t0: tcl, seed: seed(), n: 5, color: '200,190,170', layer: 'over' }));
        }
      });
      // difensori sloggiati: spinti indietro dall'urto
      const pushedDone = new Set();
      battles.forEach((b) => {
        const def = b.defender; if (def == null || !toks.has(def)) return;
        const dislodged = dislodgeEv.has(def) || (b.winner != null && String(b.winner) !== String(def));
        if (!dislodged) return;
        const tok = toks.get(def), att = b.winner != null ? moveOf.get(b.winner) : null, tcl = tc;
        const away = dislodgeEv.get(def) && moveOf.get(dislodgeEv.get(def).by) ? moveOf.get(dislodgeEv.get(def).by).from : att ? att.from : null;
        const base = typeof tok.endA === 'string' ? tok.endA : b.at;
        addSeg(tok, { t0: tcl + 160, t1: tcl + 520, path: [base, { push: base, away, px: 17 }], ease: Ease.outBack });
        tok.shakes.push({ t: tcl + 100, dur: 450, amp: 3.2 }); tok.dis = [tcl + 160, Infinity]; pushedDone.add(def);
      });
      pushedDone.forEach((id) => pushed.add(id));
      close(P, B + D);
      battleEnd = B + D;
    }
    const moveEnd = phaseList.length ? phaseList[phaseList.length - 1].start + phaseList[phaseList.length - 1].dur : t;
    supFx.forEach((f) => (f.tEnd = Math.max(moveEnd, battleEnd) - 200));
    convoyFx.forEach((f) => (f.tEnd = Math.max(moveEnd, battleEnd) - 200));
    arrowFx.forEach(({ fx }) => { if (!fx.tEnd) fx.tEnd = moveEnd; });
    // fine della soppressione con la fine dei combattimenti
    toks.forEach((tok) => { if (tok.sup) tok.sup[1] = Math.max(moveEnd, battleEnd); });
    // 6. Ritirate e distruzioni
    if (byPhase.retreat.length) {
      const P = open('retreat'), R0 = P.start; let end = R0 + 1400;
      byPhase.retreat.forEach((e) => {
        const tok = toks.get(e.unit); if (!tok) return;
        if (e.type === 'dislodge') {
          if (!pushed.has(e.unit)) { const away = moveOf.get(e.by) ? moveOf.get(e.by).from : null, base = e.at || tok.endA; addSeg(tok, { t0: R0 + 40, t1: R0 + 380, path: [base, { push: base, away, px: 17 }], ease: Ease.outBack }); tok.shakes.push({ t: R0 + 40, dur: 400, amp: 3 }); tok.dis = [R0 + 40, Infinity]; pushed.add(e.unit); }
          const rt = byPhase.retreat.find((x) => x.type === 'retreat' && x.unit === e.unit);
          label({ at: { unit: e.unit }, t0: R0 + 60, dur: 1100, icon: '⚠️', text: 'Unità sloggiata', sub: rt ? `ritirata verso ${provNameOf(rt.to)}` : provNameOf(e.at), accent: '#ffb020' });
        } else if (e.type === 'retreat') {
          if (tok.dis) tok.dis[1] = R0 + 420;
          effects.push(fxPuff({ at: { unit: e.unit }, t0: R0 + 420, seed: seed(), n: 7 }));
          addSeg(tok, { t0: R0 + 420, t1: R0 + 1250, path: [e.from || tok.endA, e.to], ease: Ease.inOutCubic, hop: 9 });
          end = Math.max(end, R0 + 1500);
        } else if (e.type === 'destroy') {
          if (tok.dis) tok.dis[1] = R0 + 900;
          kill(tok, R0 + 380, e.reason || 'Nessuna ritirata possibile');
          end = Math.max(end, R0 + 1900);
        }
      });
      close(P, end);
    }
    // 7. Conquiste
    if (byPhase.capture.length) {
      const P = open('capture'), evs = byPhase.capture, stag = Math.min(220, 1000 / evs.length); let end = P.start + 900;
      evs.forEach((e, i) => {
        const t0 = P.start + 100 + i * stag, col = colorOf(e.to), lib = e.to === nationOfProv(e.prov);
        effects.push(fxCapture({ at: e.prov, color: col, t0, capital: !!e.capital }));
        if (e.capital) shakes.push({ t: t0 + 120, dur: 520, amp: 4 });
        label({ at: e.prov, t0: t0 + 280, dur: e.capital ? 1900 : 1500, icon: flagOf(e.to) || '🚩', text: e.capital ? 'Capitale conquistata!' : lib ? 'Provincia liberata' : 'Provincia conquistata', sub: `${provNameOf(e.prov)} · ${nationNameOf(e.to)}`, accent: e.capital ? '#ffd65a' : col });
        end = Math.max(end, t0 + (e.capital ? 2200 : 1750));
      });
      close(P, end);
    }
    // 8. Costruzioni e scioglimenti
    if (byPhase.adjust.length) {
      const P = open('adjust'), evs = byPhase.adjust, stag = Math.min(200, 900 / evs.length); let end = P.start + 900;
      evs.forEach((e, i) => {
        const t0 = P.start + 100 + i * stag;
        if (e.type === 'build') {
          let tok = toks.get(e.unit); const at = e.at || (tok && tok.home); if (!at) return;
          if (!tok) tok = mkTok({ id: e.unit, owner: e.owner, type: e.utype }, at, true);
          if (tok.hidden && !tok.built) { tok.home = at; tok.endA = at; }
          if (e.utype) tok.unit.type = e.utype === 'F' ? 'F' : 'A';
          tok.built = true; tok.alphaK.push({ t: t0, v: 0 }, { t: t0 + 120, v: 1 }); tok.scaleK.push({ t: -1, v: 0.01 }, { t: t0, v: 0.01 }, { t: t0 + 900, v: 1, ease: Ease.outElastic });
          effects.push(fxBuild({ at, t0, color: colorOf(e.owner != null ? e.owner : tok.unit.owner), seed: seed() }));
          label({ at, t0: t0 + 250, dur: 1300, icon: '＋', text: tok.unit.type === 'F' ? 'Nuova flotta' : 'Nuovo esercito', sub: provNameOf(at), accent: '#5eead4' });
          end = Math.max(end, t0 + 1600);
        } else if (e.type === 'disband') {
          const tok = toks.get(e.unit); if (!tok || tok.hideAt < Infinity) return;
          tok.alphaK.push({ t: t0, v: 1 }, { t: t0 + 850, v: 0, ease: Ease.inQuad }); tok.scaleK.push({ t: t0, v: 1 }, { t: t0 + 850, v: 0.7 }); tok.hideAt = t0 + 850;
          effects.push(fxPuff({ at: { unit: e.unit }, t0: t0 + 100, seed: seed(), n: 8, color: '170,178,196', layer: 'over' }));
          label({ at: { unit: e.unit }, t0: t0 + 80, dur: 1300, icon: '🕊️', text: 'Unità sciolta', sub: e.reason || 'oltre la capacità militare', accent: '#9aa5bd' });
          end = Math.max(end, t0 + 1500);
        }
      });
      close(P, end);
    }
    // 9. Diplomazia: tradimenti
    if (byPhase.diplomacy.length) {
      const P = open('diplomacy'); let end = P.start + 600;
      byPhase.diplomacy.forEach((e, i) => {
        const t0 = P.start + 100 + i * 2500;
        if (e.type === 'betrayal') { effects.push(fxBetrayal({ t0, dur: 2350, from: e.from, to: e.to, text: e.text, seed: seed() })); end = Math.max(end, t0 + 2400); }
      });
      close(P, end);
    }
    // Assestamento finale: tutto coincide con `after`
    const tS = t; let settle = false;
    toks.forEach((tok) => {
      const a = afterById.get(tok.id);
      if (a) {
        if (tok.hideAt < Infinity) { tok.alphaK.push({ t: tS, v: 0 }, { t: tS + 300, v: 1 }); tok.hideAt = Infinity; settle = true; }
        if (tok.hidden && !tok.built) { tok.alphaK.push({ t: tS, v: 0 }, { t: tS + 350, v: 1 }); settle = true; }
        if (tok.endA !== a.loc) { addSeg(tok, { t0: tS, t1: tS + 450, path: [tok.endA, a.loc], ease: Ease.inOutCubic }); settle = true; }
        if (tok.dis) tok.dis[1] = Math.min(tok.dis[1], tS);
        if (a.type) tok.unit.type = a.type === 'F' ? 'F' : 'A'; if (a.owner != null) tok.unit.owner = a.owner;
      } else if (after.length && tok.hideAt === Infinity) {
        tok.alphaK.push({ t: tS, v: 1 }, { t: tS + 450, v: 0 }); tok.hideAt = tS + 450; settle = true;
      }
      tok.alphaK.sort((x, y) => x.t - y.t); tok.scaleK.sort((x, y) => x.t - y.t);
    });
    const total = tS + (settle ? 520 : 120);
    phaseList.forEach((p, i) => effects.push(fxBanner({ t0: p.start, label: p.label, icon: p.icon, color: p.color, sub: `Turno ${res.turn != null ? res.turn : '—'} · fase ${i + 1} di ${phaseList.length}` })));
    effects.sort((x, y) => x.t0 - y.t0);
    return {
      turn: res.turn, total, phases: phaseList, shakes,
      tokens: Array.from(toks.values()),
      under: effects.filter((f) => f.layer === 'under'), over: effects.filter((f) => f.layer === 'over'),
      top: effects.filter((f) => f.layer === 'top'),
    };
  }

  // ---------- Ciclo di disegno -----------------------------------------------
  let play = null, speed = 1, rafId = 0, last = 0, lastAmb = 0, manualPause = false, hidden = false, cleared = true, shakeOn = false;
  const amb = { orders: [], fronts: [], selected: null, units: null };
  const hasRaf = () => typeof root.requestAnimationFrame === 'function';
  const ambientActive = () => !!(amb.orders.length || amb.fronts.length || amb.selected);
  function sizeCanvas(force) {
    const c = cfg.canvas; if (!c) return false;
    const dpr = force && force.dpr ? force.dpr : (root.devicePixelRatio || 1);
    const w = force && force.w ? force.w : (c.clientWidth || (c.getBoundingClientRect ? c.getBoundingClientRect().width : 0) || c.width / dpr);
    const h = force && force.h ? force.h : (c.clientHeight || (c.getBoundingClientRect ? c.getBoundingClientRect().height : 0) || c.height / dpr);
    if (!(w > 0 && h > 0)) return false;
    const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
    if (Math.abs(c.width - bw) > 1 || Math.abs(c.height - bh) > 1) { c.width = bw; c.height = bh; }
    F.W = w; F.H = h; F.dpr = dpr;
    cfg.ctx.setTransform(c.width / w, 0, 0, c.height / h, 0, 0);
    return true;
  }
  function applyShake(T) {
    if (!play) return;
    const el = cfg.shakeTarget === undefined ? (cfg.canvas && cfg.canvas.parentElement) : cfg.shakeTarget;
    if (!el || !el.style) return;
    let x = 0, y = 0;
    if (!reduced()) for (const s of play.shakes) { const l = T - s.t; if (l < 0 || l > s.dur) continue; const k = Math.pow(1 - l / s.dur, 1.6); x += Math.sin(l * 0.13 + s.t) * s.amp * k; y += Math.cos(l * 0.097 + s.t) * s.amp * k * 0.8; }
    if (Math.abs(x) + Math.abs(y) > 0.05) {
      if (!shakeOn) { play.shakeEl = el; play.shakePrev = el.style.transform || ''; }
      el.style.transform = `${play.shakePrev} translate(${x.toFixed(2)}px,${y.toFixed(2)}px)`; shakeOn = true;
    }
    else if (shakeOn) { el.style.transform = play.shakePrev || ''; shakeOn = false; }
  }
  function resetShake() { if (shakeOn && play && play.shakeEl) play.shakeEl.style.transform = play.shakePrev || ''; shakeOn = false; }
  function drawToken(c, tok, alpha, T) {
    const p = tok._p, r = F.R; let sx = 0, sy = 0, tint = null;
    for (const s of tok.shakes) { const l = T - s.t; if (l >= 0 && l < s.dur) { const k = 1 - l / s.dur; sx += Math.sin(l * 0.11) * s.amp * k; sy += Math.cos(l * 0.083) * s.amp * k * 0.6; } }
    for (const ti of tok.tints) { const l = T - ti.t; if (l >= 0 && l < ti.dur) { const a = ti.flicker ? (Math.floor(l / 70) % 2 ? 0.7 : 0.1) : 1 - l / ti.dur; tint = { color: ti.color, a: a * (ti.max || 0.85) }; } }
    const m = tok._m || 0, lift = m * r * 0.45;
    if (m > 0.02) { c.fillStyle = `rgba(0,0,0,${(0.28 * m * alpha).toFixed(3)})`; c.beginPath(); c.ellipse(p[0], p[1] + r * 0.95, r * 1.05, r * 0.38, 0, 0, TAU); c.fill(); }
    const sc = kv(tok.scaleK, T, 1) * (1 + 0.1 * m);
    drawUnit(c, p[0] + sx, p[1] + sy - lift, tok.unit, { size: r, alpha, scale: sc, tint, suppressed: !!(tok.sup && T >= tok.sup[0] && T < tok.sup[1]), dislodged: !!(tok.dis && T >= tok.dis[0] && T < tok.dis[1]) });
  }
  function tokenPos(tok, T) {
    const segs = tok.segs; let s = null;
    for (let i = segs.length - 1; i >= 0; i--) if (segs[i].t0 <= T) { s = segs[i]; break; }
    if (!s) { tok._m = 0; return A(segs.length ? segs[0].path[0] : tok.home); }
    if (T >= s.t1) { tok._m = 0; return A(s.path[s.path.length - 1]); }
    const k = (T - s.t0) / (s.t1 - s.t0), p = alongPath(s.path, s.ease(k));
    if (p && s.hop) p[1] -= Math.sin(Math.PI * k) * s.hop * F.ZS;
    tok._m = Math.sin(Math.PI * k); return p;
  }
  function drawProgress(c, T) {
    const pl = play, y = F.H - 3, w = F.W; if (pl.opts.progress === false) return;
    c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(0, y, w, 3);
    const k = clamp01(T / pl.total), g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#f5b942'); g.addColorStop(1, '#ff5c5c');
    c.fillStyle = g; c.fillRect(0, y, w * k, 3);
    c.fillStyle = 'rgba(10,15,30,.9)'; for (const p of pl.phases) c.fillRect(w * p.start / pl.total - 1, y, 2, 3);
    const cur = pl.phases.filter((p) => T >= p.start).pop();
    if (cur) {
      c.font = `700 11px ${FONT}`; const txt = `${cur.icon}  ${cur.label}`; const tw = c.measureText(txt).width + 16;
      const x0 = w - tw - 8; rr(c, x0, y - 26, tw, 20, 10); c.fillStyle = 'rgba(8,12,24,.78)'; c.fill(); c.strokeStyle = rgba(cur.color, 0.8); c.lineWidth = 1; c.stroke();
      c.fillStyle = '#e6ebf5'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(txt, x0 + 8, y - 16);
    }
  }
  function drawPlayback(c, T) {
    const pl = play;
    F.pos.clear();
    for (const tok of pl.tokens) { const p = tokenPos(tok, T); tok._p = p; if (p) F.pos.set(tok.id, p); }
    for (const fx of pl.under) { if (T >= fx.t0 && T < fx.t1) fx.draw(c, T); }
    const vis = [];
    for (const tok of pl.tokens) { if (!tok._p || T >= tok.hideAt) continue; const a = kv(tok.alphaK, T, 1); if (a > 0.01) vis.push([tok, a]); }
    vis.sort((a, b) => (a[0]._m > 0.02) - (b[0]._m > 0.02) || a[0]._p[1] - b[0]._p[1]);
    for (const [tok, a] of vis) drawToken(c, tok, a, T);
    for (const fx of pl.over) { if (T >= fx.t0 && T < fx.t1) fx.draw(c, T); }
    const showBanner = pl.opts.banner !== false && cfg.banners !== false;
    for (const fx of pl.top) { if (T >= fx.t0 && T < fx.t1 && (showBanner || !fx.isBanner)) fx.draw(c, T); }
    drawProgress(c, T);
  }
  // Effetti ambientali (basso costo, ~30 fps)
  function ambPos(a) { return a == null ? null : typeof a === 'string' ? scr(a) : Array.isArray(a) ? A({ ll: a }) : a.loc ? scr(a.loc) : a.at ? scr(a.at) : null; }
  function drawAmbient(c, now, dim) {
    const z = F.ZS, r = F.R;
    // fronti di guerra
    amb.fronts.forEach((f, i) => {
      const ph = now / 520 + i * 0.7, k = 0.5 + 0.5 * Math.sin(ph);
      if (typeof f === 'string') {
        const p = scr(f); if (!p) return; const R2 = (r * 2.1 + 4 * k) * 1;
        radial(c, p[0], p[1], R2, [[0, `rgba(255,70,70,${((0.12 + 0.14 * k) * dim).toFixed(3)})`], [0.65, `rgba(255,60,60,${((0.06 + 0.07 * k) * dim).toFixed(3)})`], [1, 'rgba(255,50,50,0)']]);
        c.strokeStyle = `rgba(255,92,92,${((0.25 + 0.3 * k) * dim).toFixed(3)})`; c.lineWidth = 1.2; c.beginPath(); c.arc(p[0], p[1], r * 1.5 + 3 * k, 0, TAU); c.stroke();
      } else {
        const a = scr(Array.isArray(f) ? f[0] : f.a), b = scr(Array.isArray(f) ? f[1] : f.b); if (!a || !b) return;
        c.save(); c.lineCap = 'round'; c.strokeStyle = `rgba(255,70,70,${((0.12 + 0.12 * k) * dim).toFixed(3)})`; c.lineWidth = (7 + 3 * k) * z; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
        c.strokeStyle = `rgba(255,120,120,${((0.45 + 0.3 * k) * dim).toFixed(3)})`; c.lineWidth = 1.5; c.setLineDash([3, 5]); c.lineDashOffset = -now / 50; c.stroke(); c.setLineDash([]); c.restore();
      }
    });
    if (dim < 1) return;
    // ordini
    const unitBy = amb.units ? new Map(amb.units.map((u) => [u.id, u])) : null;
    for (const o of amb.orders) {
      if (!o) continue; const u = unitBy && o.unit != null ? unitBy.get(o.unit) : null;
      const owner = o.owner != null ? o.owner : u && u.owner, at = o.at || (u && u.loc), from = o.from || at;
      const col = o.color || (owner != null ? shade(colorOf(owner), 0.35) : '#ffe08a');
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
      if (o.type === 'move') {
        const a = scr(from), b = scr(o.to); if (a && b) {
          const d = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d > 2) {
            const ux = (b[0] - a[0]) / d, uy = (b[1] - a[1]) / d, s0 = [a[0] + ux * r * 1.2, a[1] + uy * r * 1.2], s1 = [b[0] - ux * r * 1.3, b[1] - uy * r * 1.3];
            const pts = curvePoints(s0, s1, 0.1, 16);
            c.strokeStyle = 'rgba(5,8,16,.6)'; c.lineWidth = 5 * z; strokePoly(c, pts, 1);
            c.strokeStyle = col; c.lineWidth = 2.6 * z; c.setLineDash([9 * z, 6 * z]); c.lineDashOffset = -now / 24; strokePoly(c, pts, 1); c.setLineDash([]);
            const p1 = pts[pts.length - 2], p2 = pts[pts.length - 1]; c.fillStyle = col; arrowHead(c, p2[0], p2[1], Math.atan2(p2[1] - p1[1], p2[0] - p1[0]), 7.5 * z); c.fill();
          }
        }
      } else if (o.type === 'support') {
        const a = scr(from), tg = scr(o.target); if (a && tg) {
          let e = tg; const mv = o.to && o.to !== o.target; if (mv) { const d = scr(o.to); if (d) e = [lerp(tg[0], d[0], 0.55), lerp(tg[1], d[1], 0.55)]; }
          const pts = curvePoints(a, e, 0.14, 16); c.strokeStyle = 'rgba(5,8,16,.5)'; c.lineWidth = 4 * z; strokePoly(c, pts, 1);
          c.strokeStyle = 'rgba(130,205,255,.95)'; c.lineWidth = 1.9 * z; c.setLineDash([5 * z, 4 * z]); c.lineDashOffset = -now / 30; strokePoly(c, pts, 1); c.setLineDash([]);
          c.beginPath(); c.arc(e[0], e[1], mv ? 3.5 * z : r * 1.55, 0, TAU); c.stroke();
        }
      } else if (o.type === 'convoy') {
        const a = scr(o.from), f = scr(at), b = scr(o.to); if (a && b) {
          c.strokeStyle = 'rgba(110,225,215,.95)'; c.lineWidth = 2.3 * z; c.setLineDash([0.1, 6 * z]); c.lineDashOffset = -now / 20;
          c.beginPath(); c.moveTo(a[0], a[1]); if (f) c.quadraticCurveTo(f[0], f[1], b[0], b[1]); else c.lineTo(b[0], b[1]); c.stroke(); c.setLineDash([]);
        }
      } else if (o.type === 'hold') {
        const p = scr(at || from); if (p) { c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.6; c.setLineDash([4, 3]); c.lineDashOffset = now / 60; c.beginPath(); c.arc(p[0], p[1], r * 1.5, 0, TAU); c.stroke(); c.setLineDash([]); }
      }
      c.restore();
    }
    // unità selezionata
    const sp = ambPos(amb.selected);
    if (sp) {
      const k = 0.5 + 0.5 * Math.sin(now / 260);
      c.save(); c.globalCompositeOperation = 'lighter'; radial(c, sp[0], sp[1], r * 2.6, [[0, `rgba(255,214,90,${(0.2 + 0.12 * k).toFixed(3)})`], [1, 'rgba(255,214,90,0)']]); c.restore();
      c.save(); c.strokeStyle = 'rgba(255,214,90,.95)'; c.lineWidth = 2; c.setLineDash([6, 5]); c.lineDashOffset = -now / 25;
      c.beginPath(); c.arc(sp[0], sp[1], r * 1.75 + 2 * k, 0, TAU); c.stroke(); c.setLineDash([]);
      c.strokeStyle = `rgba(255,214,90,${(0.5 * (1 - k)).toFixed(3)})`; c.lineWidth = 1.2; c.beginPath(); c.arc(sp[0], sp[1], r * (2 + 0.8 * k), 0, TAU); c.stroke(); c.restore();
    }
  }
  function frame(now) {
    rafId = 0;
    if (hidden || !cfg.canvas || !cfg.ctx) { last = 0; return; }
    const dt = last ? Math.min(64, Math.max(0, now - last)) : 16; last = now;
    if (!play && ambientActive() && now - lastAmb < 32) { schedule(); return; }
    if (play && !manualPause) play.clock += dt * speed;
    if (!sizeCanvas()) { schedule(); return; }
    F.now = now; F.cache.clear(); F.R = unitR(); F.ZS = clamp(F.R / 10, 0.6, 1.5);
    const c = cfg.ctx; c.clearRect(0, 0, F.W, F.H); cleared = false;
    if (play) {
      const T = Math.min(play.clock, play.total); F.T = T;
      while (play.phaseIdx < play.phases.length && T >= play.phases[play.phaseIdx].start) {
        const p = play.phases[play.phaseIdx], i = play.phaseIdx++;
        if (play.opts.onPhase) { try { play.opts.onPhase(p.key, { label: p.label, icon: p.icon, index: i, count: play.phases.length, turn: play.turn }); } catch (e) { /* callback dell'host */ } }
      }
      if (amb.fronts.length) drawAmbient(c, now, 0.45);
      drawPlayback(c, T);
      applyShake(T);
      if (play.clock >= play.total) finish(false);
    } else {
      lastAmb = now;
      if (ambientActive()) drawAmbient(c, now, 1);
    }
    if (play || ambientActive()) schedule();
    else { c.clearRect(0, 0, F.W, F.H); cleared = true; last = 0; }
  }
  function schedule() { if (!rafId && hasRaf() && !hidden && cfg.canvas) rafId = root.requestAnimationFrame(frame); }
  function clearCanvas() { if (cfg.ctx && cfg.canvas && !cleared) { cfg.ctx.save(); cfg.ctx.setTransform(1, 0, 0, 1, 0, 0); cfg.ctx.clearRect(0, 0, cfg.canvas.width, cfg.canvas.height); cfg.ctx.restore(); cleared = true; } }
  function finish(skipped) {
    const pl = play; if (!pl) return;
    resetShake(); play = null; manualPause = false;
    if (!ambientActive()) clearCanvas(); else schedule();
    const out = { skipped: !!skipped, turn: pl.turn };
    if (pl.opts.onDone) { try { pl.opts.onDone(out); } catch (e) { /* callback dell'host */ } }
    pl.resolve(out);
  }
  function onVisibility() {
    hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    if (hidden) { if (rafId && typeof root.cancelAnimationFrame === 'function') root.cancelAnimationFrame(rafId); rafId = 0; last = 0; resetShake(); }
    else schedule();
  }
  let listening = false;

  // ---------- API pubblica ---------------------------------------------------
  GEO.anim = {
    PHASES: PHASES.map((p) => Object.assign({}, p)),
    easing: Ease,
    init(opts) {
      opts = opts || {};
      Object.keys(opts).forEach((k) => { if (k in cfg && k !== 'ctx') cfg[k] = opts[k]; });
      cfg.ctx = cfg.canvas && cfg.canvas.getContext ? cfg.canvas.getContext('2d') : null;
      if (cfg.canvas && cfg.canvas.style && !cfg.canvas.style.pointerEvents) cfg.canvas.style.pointerEvents = 'none';
      if (!listening && typeof document !== 'undefined' && document.addEventListener) { document.addEventListener('visibilitychange', onVisibility); listening = true; hidden = document.visibilityState === 'hidden'; }
      sprites.clear(); cleared = false; clearCanvas();
      if (play || ambientActive()) schedule();
      return GEO.anim;
    },
    drawUnit,
    play(resolution, opts) {
      opts = opts || {};
      if (play) finish(true);
      if (opts.speed != null) GEO.anim.setSpeed(opts.speed);
      const pl = build(resolution);
      if (!cfg.canvas || !cfg.ctx || !hasRaf()) {
        const out = { skipped: true, turn: pl.turn, headless: true };
        if (opts.onDone) { try { opts.onDone(out); } catch (e) { /* ignora */ } }
        return Promise.resolve(out);
      }
      return new Promise((resolve) => {
        play = Object.assign(pl, { clock: 0, phaseIdx: 0, opts, resolve });
        last = 0; schedule();
      });
    },
    skip() { if (play) finish(true); },
    stop() { if (play) finish(true); },
    setSpeed(x) { const v = +x; if (Number.isFinite(v) && v > 0) speed = clamp(v, 0.1, 8); return speed; },
    getSpeed() { return speed; },
    isPlaying() { return !!play; },
    pause() { manualPause = true; },
    resume() { manualPause = false; last = 0; schedule(); },
    isPaused() { return manualPause || hidden; },
    setAmbient(a) {
      a = a || {};
      amb.orders = Array.isArray(a.orders) ? a.orders.filter(Boolean) : [];
      amb.fronts = Array.isArray(a.fronts) ? a.fronts.filter(Boolean) : [];
      amb.selected = a.selected || null; amb.units = Array.isArray(a.units) ? a.units : null;
      if (ambientActive() || play) schedule(); else if (!play) clearCanvas();
    },
    resize(w, h, dpr) { if (!cfg.canvas || !cfg.ctx) return; sizeCanvas({ w, h, dpr }); cleared = false; if (play || ambientActive()) schedule(); else clearCanvas(); },
    plan(resolution) { const pl = build(resolution); return { total: pl.total, phases: pl.phases.map((p) => ({ key: p.key, label: p.label, icon: p.icon, start: p.start, dur: p.dur })) }; },
    destroy() {
      if (play) finish(true);
      if (rafId && typeof root.cancelAnimationFrame === 'function') root.cancelAnimationFrame(rafId); rafId = 0;
      if (listening && typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility); listening = false;
      clearCanvas(); amb.orders = []; amb.fronts = []; amb.selected = null; cfg.canvas = null; cfg.ctx = null;
    },
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
