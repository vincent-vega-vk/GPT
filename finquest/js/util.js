/* FinQuest — utilità: RNG con seme, formattazione italiana, helper DOM */
(function (root) {
  const FQ = (root.FQ = root.FQ || {});
  const U = (FQ.U = {});

  // RNG deterministico (mulberry32)
  U.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    const r = function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    r.range = (lo, hi) => lo + r() * (hi - lo);
    r.step = (lo, hi, st) => lo + st * Math.floor(r() * (Math.floor((hi - lo) / st) + 1));
    r.chance = (p) => r() < p;
    r.normal = () => {
      let u = 0, v = 0;
      while (!u) u = r();
      while (!v) v = r();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    r.shuffle = (arr) => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    r.sample = (arr, n) => r.shuffle(arr).slice(0, n);
    return r;
  };
  U.seed = () => Math.floor(Math.random() * 2 ** 31);

  // Formattazione numeri in italiano
  const nfCache = {};
  U.nf = function (x, dec = 0, min) {
    const key = dec + ':' + (min == null ? dec : min);
    if (!nfCache[key]) nfCache[key] = new Intl.NumberFormat('it-IT', { maximumFractionDigits: dec, minimumFractionDigits: min == null ? 0 : min });
    if (Object.is(x, -0)) x = 0;
    return nfCache[key].format(x);
  };
  U.eur = (x, dec = 0) => U.nf(x, dec, dec) + ' €';
  U.eurA = (x, dec = 2) => U.nf(x, dec) + ' €'; // senza zeri forzati
  U.pct = (x, dec = 1) => U.nf(x, dec) + '%';
  U.signPct = (x, dec = 1) => (x > 0 ? '+' : x < 0 ? '−' : '') + U.nf(Math.abs(x), dec) + '%';
  U.round = (x, d = 0) => { const m = 10 ** d; return Math.round(x * m) / m; };

  // Converte input utente ("1.234,5", "1234.5", "12,5 %", "€ 300") in numero
  U.parseNum = function (s) {
    if (s == null) return NaN;
    s = String(s).trim().replace(/[€%\s]/g, '').replace(/[−–]/g, '-');
    if (!s) return NaN;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '');
    else if (/^-?\d{1,3}\.\d{3}$/.test(s)) s = s.replace('.', ''); // "1.500" = 1500
    return Number(s);
  };

  U.clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  U.sum = (a) => a.reduce((s, x) => s + x, 0);
  U.mean = (a) => U.sum(a) / a.length;
  U.std = (a) => { const m = U.mean(a); return Math.sqrt(U.mean(a.map((x) => (x - m) ** 2))); };
  U.uniq = (a) => [...new Set(a)];

  // Date locali (YYYY-MM-DD)
  U.today = (d = new Date()) => {
    const z = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
  };
  U.dayDiff = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
  U.addDays = (day, n) => { const d = new Date(day + 'T12:00:00'); d.setDate(d.getDate() + n); return U.today(d); };
  U.hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

  // DOM
  U.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.h = function (tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') for (const sk in v) { if (sk.startsWith('--')) el.style.setProperty(sk, v[sk]); else el.style[sk] = v[sk]; }
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.appendChild(typeof kid === 'string' || typeof kid === 'number' ? document.createTextNode(String(kid)) : kid);
    }
    return el;
  };
  U.$ = (sel, ctx = document) => ctx.querySelector(sel);
  U.$$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  U.reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
})(typeof window !== 'undefined' ? window : globalThis);
