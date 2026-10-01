/* FinQuest — grafici SVG e generatori di esercizi "leggi il grafico" */
(function (root) {
  const FQ = (root.FQ = root.FQ || {});
  const U = FQ.U;
  const C = (FQ.Charts = {});

  const W = 360, H = 210;
  const M = { l: 46, r: 14, t: 14, b: 28 };

  // ---------- serie sintetiche ----------
  C.walk = function (r, n, start, drift, vol) {
    const v = [start];
    for (let i = 1; i < n; i++) v.push(Math.max(0.5, v[i - 1] * (1 + drift + vol * r.normal())));
    return v;
  };
  C.sma = (v, p) => v.map((_, i) => (i < p - 1 ? null : U.mean(v.slice(i - p + 1, i + 1))));
  C.ema = (v, p) => { const k = 2 / (p + 1); const out = []; v.forEach((x, i) => out.push(i ? x * k + out[i - 1] * (1 - k) : x)); return out; };
  C.rsi = function (v, p = 14) {
    const out = v.map(() => null);
    let g = 0, l = 0;
    for (let i = 1; i <= p; i++) { const d = v[i] - v[i - 1]; d > 0 ? (g += d) : (l -= d); }
    g /= p; l /= p;
    out[p] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
    for (let i = p + 1; i < v.length; i++) {
      const d = v[i] - v[i - 1];
      g = (g * (p - 1) + Math.max(d, 0)) / p;
      l = (l * (p - 1) + Math.max(-d, 0)) / p;
      out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
    }
    return out;
  };
  C.ohlc = function (r, closes, vol = 0.012) {
    return closes.map((c, i) => {
      const o = i ? closes[i - 1] * (1 + vol * 0.25 * r.normal()) : c * (1 + vol * 0.4 * r.normal());
      const hi = Math.max(o, c) * (1 + Math.abs(r.normal()) * vol * 0.6);
      const lo = Math.min(o, c) * (1 - Math.abs(r.normal()) * vol * 0.6);
      return { o, h: hi, l: lo, c };
    });
  };
  C.maxDD = function (v) {
    let peak = v[0], pi = 0, best = 0, bp = 0, bt = 0;
    v.forEach((x, i) => {
      if (x > peak) { peak = x; pi = i; }
      const dd = (x - peak) / peak;
      if (dd < best) { best = dd; bp = pi; bt = i; }
    });
    return { dd: best, peak: bp, trough: bt };
  };

  // ---------- scale ----------
  C.ticks = function (min, max, n = 4) {
    if (max === min) { max += 1; min -= 1; }
    const raw = (max - min) / n;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const e = raw / mag;
    const step = (e >= 7 ? 10 : e >= 3.5 ? 5 : e >= 1.5 ? 2 : 1) * mag;
    const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
    const t = [];
    for (let x = lo; x <= hi + step / 2; x += step) t.push(U.round(x, 8));
    return { lo, hi, step, t };
  };
  const dec = (step) => (step >= 1 ? 0 : step >= 0.1 ? 1 : 2);

  function frame(o) {
    const w = o.w || W, h = o.h || H;
    const m = Object.assign({}, M, o.m || {});
    return { w, h, m, pw: w - m.l - m.r, ph: h - m.t - m.b };
  }
  const svgOpen = (f, label, extra = '') => `<svg class="chart" viewBox="0 0 ${f.w} ${f.h}" role="img" aria-label="${U.esc(label || 'Grafico')}" ${extra}>`;
  const txt = (x, y, s, cls = 'c-lbl', anchor = 'middle', ext = '') => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="${cls}" text-anchor="${anchor}" ${ext}>${U.esc(s)}</text>`;
  const pathOf = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');

  function yAxis(f, tk, fmt, sy) {
    let s = '';
    tk.t.forEach((t) => {
      const y = sy(t);
      s += `<line x1="${f.m.l}" x2="${f.w - f.m.r}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" class="c-grid"/>`;
      s += txt(f.m.l - 6, y + 3.5, fmt(t), 'c-lbl', 'end');
    });
    return s;
  }
  function xLabels(f, xl, sx) {
    return (xl || []).map(([i, s]) => txt(sx(i), f.h - f.m.b + 16, s)).join('');
  }

  /* Grafico a linee.
     o = { series:[{v:[], col:'s1', name, w, dash, area}], xl:[[i,label]], yfmt, hl:[{y,label,col}], marks:[{s,i,label,pos}], ymin, ymax, zero, h, label, hover } */
  C.line = function (o) {
    const f = frame(o);
    const all = o.series.flatMap((s) => s.v.filter((x) => x != null));
    if (o.hl) o.hl.forEach((l) => all.push(l.y));
    let lo = o.ymin != null ? o.ymin : Math.min(...all), hi = o.ymax != null ? o.ymax : Math.max(...all);
    if (o.zero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
    const pad = (hi - lo) * 0.06;
    const tk = C.ticks(lo - (o.ymin != null ? 0 : pad), hi + (o.ymax != null ? 0 : pad), o.nt || 4);
    const n = Math.max(...o.series.map((s) => s.v.length));
    const sx = (i) => f.m.l + (n === 1 ? f.pw / 2 : (i * f.pw) / (n - 1));
    const sy = (y) => f.m.t + f.ph - ((y - tk.lo) / (tk.hi - tk.lo)) * f.ph;
    const fmt = o.yfmt || ((t) => U.nf(t, dec(tk.step)));
    const hov = { x0: f.m.l, dx: n > 1 ? f.pw / (n - 1) : 0, n, s: [], xl: o.xlAll || null, yfmt: o.yfmtName || 'num', top: f.m.t, bot: f.h - f.m.b, w: f.w, h: f.h };
    let s = svgOpen(f, o.label);
    s += yAxis(f, tk, fmt, sy);
    if (o.zero) s += `<line x1="${f.m.l}" x2="${f.w - f.m.r}" y1="${sy(0)}" y2="${sy(0)}" class="c-zero"/>`;
    (o.bands || []).forEach((b) => {
      s += `<rect x="${f.m.l}" width="${f.pw}" y="${sy(b.hi).toFixed(1)}" height="${(sy(b.lo) - sy(b.hi)).toFixed(1)}" style="fill:var(--${b.col || 'band'})" opacity="${b.op || 0.14}"/>`;
    });
    o.series.forEach((se) => {
      const pts = [];
      se.v.forEach((y, i) => { if (y != null) pts.push([sx(i), sy(y)]); });
      if (se.area && pts.length) {
        s += `<path d="${pathOf(pts)}L${pts[pts.length - 1][0].toFixed(1)} ${sy(Math.max(tk.lo, 0))}L${pts[0][0].toFixed(1)} ${sy(Math.max(tk.lo, 0))}Z" style="fill:var(--${se.col})" opacity="0.12"/>`;
      }
      s += `<path d="${pathOf(pts)}" fill="none" style="stroke:var(--${se.col});stroke-width:${se.w || 2}px" ${se.dash ? 'stroke-dasharray="5 4"' : ''} stroke-linejoin="round" stroke-linecap="round"/>`;
      if (se.dots) pts.forEach((p) => { s += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.2" style="fill:var(--${se.col});stroke:var(--surface);stroke-width:1.5px"/>`; });
      if (se.name) hov.s.push({ n: se.name, c: se.col, v: se.v.map((y) => (y == null ? null : U.round(y, 4))), y: se.v.map((y) => (y == null ? null : U.round(sy(y), 1))) });
    });
    (o.hl || []).forEach((l) => {
      const y = sy(l.y);
      s += `<line x1="${f.m.l}" x2="${f.w - f.m.r}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" style="stroke:var(--${l.col || 'ink2'})" stroke-width="1.5" stroke-dasharray="4 3"/>`;
      if (l.label) s += txt(f.w - f.m.r - 2, y - 4, l.label, 'c-lbl c-strong', 'end');
    });
    (o.marks || []).forEach((mk) => {
      const se = o.series[mk.s || 0];
      const x = sx(mk.i), y = sy(se.v[mk.i]);
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" style="fill:var(--${mk.col || se.col});stroke:var(--surface);stroke-width:2px"/>`;
      if (mk.label) {
        const above = mk.pos !== 'below';
        const anchor = x < f.m.l + 40 ? 'start' : x > f.w - f.m.r - 40 ? 'end' : 'middle';
        s += txt(x, above ? y - 10 : y + 18, mk.label, 'c-lbl c-strong', anchor);
      }
    });
    s += xLabels(f, o.xl, sx);
    s += '</svg>';
    return { svg: s, hover: o.hover === false ? null : hov };
  };

  /* Candele giapponesi: o = { c:[{o,h,l,c}], xl, hl, ma:[{v,col,name}], hi:index evidenziato, label } */
  C.candles = function (o) {
    const f = frame(o);
    const all = o.c.flatMap((k) => [k.h, k.l]);
    (o.hl || []).forEach((l) => all.push(l.y));
    const lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo) * 0.06;
    const tk = C.ticks(lo - pad, hi + pad, o.nt || 4);
    const n = o.c.length;
    const dx = f.pw / n;
    const sx = (i) => f.m.l + dx * (i + 0.5);
    const sy = (y) => f.m.t + f.ph - ((y - tk.lo) / (tk.hi - tk.lo)) * f.ph;
    let s = svgOpen(f, o.label || 'Grafico a candele');
    s += yAxis(f, tk, o.yfmt || ((t) => U.nf(t, dec(tk.step))), sy);
    if (o.hiIdx != null) s += `<rect x="${(sx(o.hiIdx) - dx * 0.75).toFixed(1)}" y="${f.m.t}" width="${(dx * 1.5).toFixed(1)}" height="${f.ph}" rx="4" style="fill:var(--accent)" opacity="0.12"/>`;
    const bw = Math.max(2, Math.min(dx * 0.62, o.maxBody || 26));
    o.c.forEach((k, i) => {
      const up = k.c >= k.o;
      const col = Math.abs(k.c - k.o) < (tk.hi - tk.lo) * 0.004 ? 'ink2' : up ? 'up' : 'down';
      const x = sx(i);
      s += `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${sy(k.h).toFixed(1)}" y2="${sy(k.l).toFixed(1)}" style="stroke:var(--${col})" stroke-width="${o.big ? 2.5 : 1.3}"/>`;
      const y1 = sy(Math.max(k.o, k.c)), y2 = sy(Math.min(k.o, k.c));
      s += `<rect x="${(x - bw / 2).toFixed(1)}" y="${y1.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1.5, y2 - y1).toFixed(1)}" rx="1.5" style="fill:var(--${col})"/>`;
    });
    (o.ma || []).forEach((m) => {
      const pts = [];
      m.v.forEach((y, i) => { if (y != null) pts.push([sx(i), sy(y)]); });
      s += `<path d="${pathOf(pts)}" fill="none" style="stroke:var(--${m.col})" stroke-width="2"/>`;
    });
    (o.hl || []).forEach((l) => {
      const y = sy(l.y);
      s += `<line x1="${f.m.l}" x2="${f.w - f.m.r}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" style="stroke:var(--${l.col || 'ink2'})" stroke-width="1.5" stroke-dasharray="4 3"/>`;
      if (l.label) s += txt(f.w - f.m.r - 2, y - 4, l.label, 'c-lbl c-strong', 'end');
    });
    (o.notes || []).forEach((nt) => { s += txt(nt.x, sy(nt.y) + (nt.dy || 0), nt.t, 'c-lbl c-strong', nt.a || 'start'); });
    s += xLabels(f, o.xl, sx);
    s += '</svg>';
    return { svg: s };
  };

  /* Barre: o = { d:[[label, val]], unit, labels:bool, col, colNeg, hiIdx, label, hideIdx } */
  C.bars = function (o) {
    const f = frame(o);
    const vals = o.d.map((x) => x[1]);
    const lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
    const tk = C.ticks(lo, hi + (hi - lo) * 0.08, o.nt || 4);
    const n = o.d.length;
    const dx = f.pw / n;
    const bw = Math.min(dx * 0.62, 44);
    const sy = (y) => f.m.t + f.ph - ((y - tk.lo) / (tk.hi - tk.lo)) * f.ph;
    const fmt = (t) => U.nf(t, dec(tk.step)) + (o.unit === '%' ? '%' : '');
    let s = svgOpen(f, o.label || 'Grafico a barre');
    s += yAxis(f, tk, fmt, sy);
    s += `<line x1="${f.m.l}" x2="${f.w - f.m.r}" y1="${sy(0)}" y2="${sy(0)}" class="c-zero"/>`;
    o.d.forEach(([lab, v], i) => {
      const x = f.m.l + dx * (i + 0.5);
      const y0 = sy(0), y1 = sy(v);
      const col = v < 0 ? o.colNeg || 'down' : o.col || 's1';
      const top = Math.min(y0, y1), hgt = Math.max(1, Math.abs(y1 - y0));
      const r = Math.min(4, hgt / 2);
      // barra con estremità arrotondata lontano dalla base
      if (v >= 0) s += `<path d="M${(x - bw / 2).toFixed(1)} ${y0}V${(top + r).toFixed(1)}Q${(x - bw / 2).toFixed(1)} ${top.toFixed(1)} ${(x - bw / 2 + r).toFixed(1)} ${top.toFixed(1)}H${(x + bw / 2 - r).toFixed(1)}Q${(x + bw / 2).toFixed(1)} ${top.toFixed(1)} ${(x + bw / 2).toFixed(1)} ${(top + r).toFixed(1)}V${y0}Z" style="fill:var(--${col})" ${o.hiIdx === i ? 'class="c-hi"' : ''}/>`;
      else s += `<path d="M${(x - bw / 2).toFixed(1)} ${y0}V${(top + hgt - r).toFixed(1)}Q${(x - bw / 2).toFixed(1)} ${(top + hgt).toFixed(1)} ${(x - bw / 2 + r).toFixed(1)} ${(top + hgt).toFixed(1)}H${(x + bw / 2 - r).toFixed(1)}Q${(x + bw / 2).toFixed(1)} ${(top + hgt).toFixed(1)} ${(x + bw / 2).toFixed(1)} ${(top + hgt - r).toFixed(1)}V${y0}Z" style="fill:var(--${col})"/>`;
      if (o.labels && o.hideIdx !== i) {
        const ly = v >= 0 ? y1 - 5 : y1 + 13;
        s += txt(x, ly, (o.fmtv || fmt)(v), 'c-lbl c-strong');
      }
      if (o.hideIdx === i) s += txt(x, y1 - 5, '?', 'c-lbl c-strong');
      s += txt(x, f.h - f.m.b + 16, lab);
    });
    s += '</svg>';
    return { svg: s };
  };

  /* Ciambella: o = { d:[[label, val]], center } — legenda HTML separata */
  const PIE_COLS = ['s1', 's2', 's3', 's4', 's5', 's7'];
  C.pie = function (o) {
    const tot = U.sum(o.d.map((x) => x[1]));
    const cx = 100, cy = 100, R = 84, r = 52;
    let a = -Math.PI / 2;
    let s = `<div class="pie-wrap"><svg class="chart pie" viewBox="0 0 200 200" role="img" aria-label="${U.esc(o.label || 'Grafico a torta')}">`;
    o.d.forEach(([, v], i) => {
      const da = (v / tot) * Math.PI * 2;
      const a2 = a + da;
      const large = da > Math.PI ? 1 : 0;
      const p = (ang, rad) => [cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)].map((z) => z.toFixed(2)).join(' ');
      if (da >= Math.PI * 2 - 1e-6) s += `<circle cx="${cx}" cy="${cy}" r="${(R + r) / 2}" fill="none" style="stroke:var(--${PIE_COLS[i % 6]})" stroke-width="${R - r}"/>`;
      else s += `<path d="M${p(a, R)}A${R} ${R} 0 ${large} 1 ${p(a2, R)}L${p(a2, r)}A${r} ${r} 0 ${large} 0 ${p(a, r)}Z" style="fill:var(--${PIE_COLS[i % 6]});stroke:var(--surface);stroke-width:2px"/>`;
      a = a2;
    });
    if (o.center) s += `<text x="100" y="96" text-anchor="middle" class="c-big">${U.esc(o.center[0])}</text><text x="100" y="116" text-anchor="middle" class="c-lbl">${U.esc(o.center[1])}</text>`;
    s += '</svg><ul class="legend">';
    o.d.forEach(([lab, v], i) => {
      s += `<li><span class="sw" style="background:var(--${PIE_COLS[i % 6]})"></span><span>${U.esc(lab)}</span><b>${o.hideVals ? '' : U.nf((v / tot) * 100, 0) + '%'}</b></li>`;
    });
    s += '</ul></div>';
    return { svg: s };
  };

  C.legend = (items) => '<ul class="legend legend-row">' + items.map(([lab, col, dash]) => `<li><span class="sw ${dash ? 'sw-dash' : ''}" style="background:var(--${col})"></span><span>${U.esc(lab)}</span></li>`).join('') + '</ul>';

  // ---------- helper per costruire domande ----------
  const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  C.MONTHS = MONTHS;

  // opzioni numeriche plausibili e ben distinte
  C.numOpts = function (r, correct, fmt, extra = [], n = 4) {
    const seen = new Set([fmt(correct)]);
    const out = [];
    const tryAdd = (x) => {
      if (!isFinite(x) || out.length >= n - 1) return;
      const s = fmt(x);
      if (seen.has(s)) return;
      seen.add(s); out.push(s);
    };
    extra.forEach(tryAdd);
    const mults = r.shuffle([0.5, 0.75, 1.25, 1.5, 0.6, 1.35, 2, 0.85, 1.15]);
    for (const k of mults) tryAdd(correct === 0 ? (k - 1) * 10 : correct * k);
    for (let i = 1; out.length < n - 1 && i < 30; i++) tryAdd(correct + i * (Math.abs(correct) * 0.1 + 1));
    return { correct: fmt(correct), wrong: out };
  };

  function mc(r, q, correct, wrong, exp, visual, extra) {
    const opts = r.shuffle([correct, ...wrong]);
    return Object.assign({ type: 'mcq', prompt: q, options: opts, answer: opts.indexOf(correct), exp, visual, tag: 'chart' }, extra || {});
  }
  C.mc = mc;

  // ---------- generatori di esercizi ----------
  const G = (C.gen = {});

  G.trend = function (r, d) {
    const kind = r.pick(['up', 'down', 'side']);
    let v;
    for (let k = 0; k < 80; k++) {
      const vol = 0.009 + 0.012 * d;
      if (kind === 'side') {
        const ph = r.range(0, 6);
        v = Array.from({ length: 40 }, (_, i) => 100 * (1 + 0.045 * Math.sin(i / 3.2 + ph) + vol * 0.8 * r.normal()));
      } else v = C.walk(r, 40, 100, kind === 'up' ? 0.006 : -0.006, vol);
      const ch = v[39] / v[0] - 1;
      const firstHalf = U.mean(v.slice(0, 10)), lastHalf = U.mean(v.slice(30));
      if (kind === 'up' && ch > 0.14 && lastHalf > firstHalf * 1.1) break;
      if (kind === 'down' && ch < -0.13 && lastHalf < firstHalf * 0.9) break;
      if (kind === 'side' && Math.abs(ch) < 0.03 && Math.abs(lastHalf / firstHalf - 1) < 0.03) break;
    }
    const ch = C.line({ series: [{ v, col: 's1', name: 'Prezzo', area: true }], xl: [[0, 'Inizio'], [39, 'Oggi']], label: 'Andamento del prezzo' });
    const L = { up: 'Rialzista (uptrend)', down: 'Ribassista (downtrend)', side: 'Laterale (trading range)' };
    const E = {
      up: 'Massimi e minimi sempre più alti: è un trend rialzista. Il trend descrive il passato, non garantisce il futuro.',
      down: 'Massimi e minimi sempre più bassi: è un trend ribassista.',
      side: 'Il prezzo oscilla tra due livelli senza una direzione chiara: è una fase laterale.',
    };
    return mc(r, 'Che tipo di trend mostra il grafico?', L[kind], Object.keys(L).filter((k) => k !== kind).map((k) => L[k]), E[kind], ch);
  };

  G.maxmin = function (r, d) {
    let v;
    for (let k = 0; k < 60; k++) {
      v = C.walk(r, 12, r.int(40, 160), r.range(-0.01, 0.015), 0.07);
      const s = v.slice().sort((a, b) => b - a);
      if ((s[0] - s[1]) / s[0] > 0.035 && (s[10] - s[11]) / s[11] > 0.035) break;
    }
    v = v.map((x) => U.round(x, 1));
    const ch = C.line({ series: [{ v, col: 's1', name: 'Prezzo €', dots: true }], xl: MONTHS.map((m, i) => [i, i % 2 ? '' : m]).filter((x) => x[1]), xlAll: MONTHS, label: 'Prezzo mensile' });
    const variant = r.pick(['maxM', 'minM', 'maxV', 'minV']);
    const imax = v.indexOf(Math.max(...v)), imin = v.indexOf(Math.min(...v));
    if (variant === 'maxM' || variant === 'minM') {
      const idx = variant === 'maxM' ? imax : imin;
      const wrong = r.sample(MONTHS.map((m, i) => i).filter((i) => i !== idx), 3).map((i) => MONTHS[i]);
      return mc(r, `In quale mese il prezzo ha toccato il ${variant === 'maxM' ? 'massimo' : 'minimo'}?`, MONTHS[idx], wrong,
        `Il punto più ${variant === 'maxM' ? 'alto' : 'basso'} della linea è a ${MONTHS[idx]} (${U.eurA(v[idx], 1)}). Puoi passare sul grafico per leggere i valori.`, ch);
    }
    const val = variant === 'maxV' ? v[imax] : v[imin];
    const span = Math.max(...v) - Math.min(...v);
    const fmt = (x) => U.eur(Math.round(x));
    const o = C.numOpts(r, val, fmt, [val + span * 0.35, val - span * 0.35, val + span * 0.7, val - span * 0.7].filter((x) => x > 0));
    return mc(r, `Qual è stato, circa, il prezzo ${variant === 'maxV' ? 'massimo' : 'minimo'} dell’anno?`, o.correct, o.wrong,
      `Il ${variant === 'maxV' ? 'massimo' : 'minimo'} è di circa ${U.eurA(val, 1)} (${MONTHS[variant === 'maxV' ? imax : imin]}).`, ch);
  };

  G.chg = function (r, d) {
    const a = r.step(40, 200, 5);
    let pctc = r.pick([-30, -25, -20, -15, -12, -10, 8, 10, 12, 15, 20, 25, 30, 40, 50]);
    const b = U.round(a * (1 + pctc / 100), 2);
    const v = C.walk(r, 12, a, 0, 0.04);
    const adj = v.map((x, i) => x + ((b - v[11]) * i) / 11); // forza l'ultimo valore
    adj[0] = a; adj[11] = b;
    const ch = C.line({ series: [{ v: adj, col: 's1', name: 'Prezzo €' }], xl: [[0, 'Gen'], [11, 'Dic']], xlAll: MONTHS,
      marks: [{ i: 0, label: U.eurA(a, 2), pos: adj[0] > adj[1] ? 'above' : 'below' }, { i: 11, label: U.eurA(b, 2) }], label: 'Prezzo da inizio a fine anno' });
    const real = ((b - a) / a) * 100;
    const fmt = (x) => U.signPct(x, 1);
    const o = C.numOpts(r, real, fmt, [((b - a) / b) * 100, -real, (b - a)]);
    return mc(r, 'Di quanto è variato il prezzo da gennaio a dicembre?', o.correct, o.wrong,
      `Variazione % = (finale − iniziale) ÷ iniziale = (${U.nf(b, 2)} − ${U.nf(a, 2)}) ÷ ${U.nf(a, 2)} = ${U.signPct(real, 1)}.`, ch);
  };

  G.candle = function (r, d) {
    const variant = d < 0.3 ? r.pick(['dir', 'close']) : r.pick(['name', 'name', 'close', 'dir']);
    if (variant === 'close') {
      const up = r.chance(0.5);
      const base = r.step(20, 90, 10);
      const o = up ? base : base + 8, c = up ? base + 8 : base;
      const k = { o, c, h: Math.max(o, c) + 4, l: Math.min(o, c) - 4 };
      const ch = C.candles({ c: [k], big: true, maxBody: 60, nt: 8, label: 'Una candela', m: { l: 120, r: 120 } });
      return mc(r, `Questa candela è ${up ? 'verde (rialzista)' : 'rossa (ribassista)'}. Qual è il prezzo di chiusura?`, U.eur(c), [U.eur(o), U.eur(k.h), U.eur(k.l)],
        up ? 'In una candela rialzista l’apertura è in basso e la chiusura in alto nel corpo; le ombre mostrano massimo e minimo.' : 'In una candela ribassista l’apertura è in alto e la chiusura in basso nel corpo.', ch);
    }
    const kinds = variant === 'dir' ? ['bull', 'bear'] : ['bull', 'bear', 'doji', 'hammer', 'shooting', 'engulf'];
    const kind = r.pick(kinds);
    const ctxTrend = kind === 'hammer' || kind === 'engulf' ? -0.012 : kind === 'shooting' ? 0.012 : r.range(-0.004, 0.004);
    const closes = C.walk(r, 7, 100, ctxTrend, 0.006);
    const cs = C.ohlc(r, closes, 0.01);
    const last = closes[6];
    const rng = last * 0.05;
    let K;
    if (kind === 'bull') K = { o: last, c: last + rng, h: last + rng * 1.1, l: last - rng * 0.1 };
    if (kind === 'bear') K = { o: last, c: last - rng, h: last + rng * 0.1, l: last - rng * 1.1 };
    if (kind === 'doji') K = { o: last, c: last + rng * 0.01, h: last + rng * 0.7, l: last - rng * 0.7 };
    if (kind === 'hammer') K = { o: last - rng * 0.05, c: last + rng * 0.2, h: last + rng * 0.25, l: last - rng * 0.9 };
    if (kind === 'shooting') K = { o: last + rng * 0.05, c: last - rng * 0.2, h: last + rng * 0.9, l: last - rng * 0.25 };
    if (kind === 'engulf') {
      cs[6] = { o: last + rng * 0.3, c: last - rng * 0.2, h: last + rng * 0.4, l: last - rng * 0.3 };
      K = { o: last - rng * 0.35, c: last + rng * 0.6, h: last + rng * 0.7, l: last - rng * 0.45 };
    }
    cs.push(K);
    const ch = C.candles({ c: cs, hiIdx: 7, label: 'Grafico a candele con candela evidenziata' });
    if (variant === 'dir') {
      const up = kind === 'bull';
      return mc(r, 'La candela evidenziata è rialzista o ribassista?', up ? 'Rialzista: chiusura sopra l’apertura' : 'Ribassista: chiusura sotto l’apertura',
        [up ? 'Ribassista: chiusura sotto l’apertura' : 'Rialzista: chiusura sopra l’apertura', 'Neutra: apertura uguale alla chiusura'],
        'Il colore e la posizione del corpo dicono se il prezzo ha chiuso sopra (verde) o sotto (rosso) l’apertura.', ch);
    }
    const N = { bull: 'Candela rialzista piena', bear: 'Candela ribassista piena', doji: 'Doji', hammer: 'Martello (hammer)', shooting: 'Stella cadente (shooting star)', engulf: 'Engulfing rialzista' };
    const E = {
      bull: 'Corpo verde ampio e ombre corte: i compratori hanno dominato la seduta.',
      bear: 'Corpo rosso ampio e ombre corte: i venditori hanno dominato la seduta.',
      doji: 'Apertura e chiusura quasi uguali con ombre su entrambi i lati: indecisione.',
      hammer: 'Corpo piccolo in alto e lunga ombra inferiore dopo un ribasso: i compratori hanno respinto i minimi. Serve conferma.',
      shooting: 'Corpo piccolo in basso e lunga ombra superiore dopo un rialzo: i venditori hanno respinto i massimi. Serve conferma.',
      engulf: 'Il corpo verde "avvolge" completamente il corpo rosso precedente: possibile inversione rialzista, da confermare.',
    };
    const wrong = r.sample(Object.keys(N).filter((k) => k !== kind), 3).map((k) => N[k]);
    return mc(r, 'Come si chiama la figura della candela evidenziata?', N[kind], wrong, E[kind], ch);
  };

  G.sr = function (r, d) {
    const S = r.step(40, 120, 10), R = S + r.pick([10, 20]);
    const n = 48;
    const v = [];
    let ph = r.range(0, 3);
    for (let i = 0; i < n; i++) v.push(S + (R - S) * (0.5 + 0.46 * Math.sin(i / 2.6 + ph)) + (R - S) * 0.035 * r.normal());
    const breakout = d > 0.45 && r.chance(0.5);
    if (breakout) for (let i = 40; i < n; i++) v[i] = R + (R - S) * ((i - 39) * 0.12) + (R - S) * 0.03 * r.normal();
    const ch = C.line({ series: [{ v, col: 's1', name: 'Prezzo €' }], xl: [[0, 'Inizio'], [n - 1, 'Oggi']], nt: 5, label: 'Prezzo che oscilla in un canale' });
    if (breakout) {
      return mc(r, `Il prezzo ha rotto al rialzo la resistenza a ${R} €. Secondo l’analisi tecnica, quale livello può diventare il nuovo supporto?`, U.eur(R), [U.eur(S), U.eur(R + (R - S)), U.eur((S + R) / 2)],
        'Inversione di polarità: una resistenza rotta tende a diventare supporto. È una tendenza, non una regola fissa.', ch);
    }
    const askR = r.chance(0.5);
    return mc(r, `Qual è il livello di ${askR ? 'resistenza' : 'supporto'} del canale?`, U.eur(askR ? R : S), [U.eur(askR ? S : R), U.eur((S + R) / 2), U.eur(askR ? R + (R - S) : S - (R - S))],
      askR ? `Il prezzo si ferma più volte vicino a ${R} €: lì l’offerta prevale (resistenza).` : `Il prezzo rimbalza più volte vicino a ${S} €: lì la domanda prevale (supporto).`, ch);
  };

  G.ma = function (r, d) {
    const golden = r.chance(0.5);
    const variant = d < 0.35 ? 'above' : r.pick(['cross', 'cross', 'above']);
    let v, f, s, ok = false;
    for (let k = 0; k < 120 && !ok; k++) {
      const a = C.walk(r, 50, 100, golden ? -0.004 : 0.004, 0.011);
      const b = C.walk(r, 40, a[49], golden ? 0.009 : -0.009, 0.011);
      v = a.concat(b.slice(1));
      f = C.sma(v, 10); s = C.sma(v, 30);
      // ultimo incrocio nella finestra visibile e nella direzione voluta
      let last = null;
      for (let i = 41; i < v.length; i++) {
        if (f[i - 1] == null || s[i - 1] == null) continue;
        const pd = f[i - 1] - s[i - 1], cd = f[i] - s[i];
        if (pd <= 0 && cd > 0) last = 'g';
        if (pd >= 0 && cd < 0) last = 'd';
      }
      ok = last === (golden ? 'g' : 'd') && (golden ? f[v.length - 1] > s[v.length - 1] * 1.01 : f[v.length - 1] < s[v.length - 1] * 0.99);
    }
    const st = 29;
    const cut = (x) => x.slice(st);
    const ch = C.line({ series: [{ v: cut(v), col: 'ink2', w: 1.4, name: 'Prezzo' }, { v: cut(f), col: 's1', name: 'Media veloce (10)' }, { v: cut(s), col: 's2', name: 'Media lenta (30)' }],
      xl: [[0, 'Inizio'], [v.length - st - 1, 'Oggi']], label: 'Prezzo con due medie mobili' });
    ch.legend = C.legend([['Prezzo', 'ink2'], ['Media veloce (10)', 's1'], ['Media lenta (30)', 's2']]);
    if (variant === 'above') {
      const above = v[v.length - 1] > s[v.length - 1];
      return mc(r, 'Alla fine del grafico il prezzo si trova sopra o sotto la media mobile lenta?', above ? 'Sopra la media lenta' : 'Sotto la media lenta', [above ? 'Sotto la media lenta' : 'Sopra la media lenta', 'Esattamente sulla media lenta'],
        'Un prezzo stabilmente sopra la media lenta è spesso letto come trend positivo, sotto come trend negativo. È un filtro, non una previsione.', ch);
    }
    return mc(r, 'Che segnale mostra l’ultimo incrocio tra le due medie mobili?', golden ? 'Golden cross (segnale rialzista)' : 'Death cross (segnale ribassista)',
      [golden ? 'Death cross (segnale ribassista)' : 'Golden cross (segnale rialzista)', 'Nessun incrocio: le medie sono parallele'],
      golden ? 'La media veloce taglia dal basso verso l’alto quella lenta: golden cross. I segnali delle medie arrivano in ritardo e possono essere falsi.' : 'La media veloce taglia dall’alto verso il basso quella lenta: death cross. Segnale in ritardo, da usare con prudenza.', ch);
  };

  G.volat = function (r, d) {
    const aCalm = r.chance(0.5);
    let A, B;
    for (let k = 0; k < 60; k++) {
      A = C.walk(r, 36, 100, 0.002, aCalm ? 0.008 : 0.035);
      B = C.walk(r, 36, 100, 0.002, aCalm ? 0.035 : 0.008);
      if (Math.abs(A[35] / B[35] - 1) < 0.12) break;
    }
    const ch = C.line({ series: [{ v: A, col: 's1', name: 'Titolo A' }, { v: B, col: 's2', name: 'Titolo B' }], xl: [[0, 'Inizio'], [35, 'Fine']], label: 'Due titoli a confronto' });
    ch.legend = C.legend([['Titolo A', 's1'], ['Titolo B', 's2']]);
    const ask = d > 0.5 && r.chance(0.5) ? 'low' : 'high';
    const hi = aCalm ? 'Titolo B' : 'Titolo A', lo = aCalm ? 'Titolo A' : 'Titolo B';
    if (ask === 'low') return mc(r, 'Quale titolo ha la deviazione standard dei rendimenti più bassa?', lo, [hi, 'È uguale per entrambi'], `${lo} oscilla meno attorno alla sua tendenza: volatilità (deviazione standard) più bassa.`, ch);
    return mc(r, 'Quale dei due titoli è più volatile?', hi, [lo, 'Hanno la stessa volatilità'], `${hi} fa oscillazioni molto più ampie: più volatilità significa più incertezza sul risultato, anche se il punto di arrivo è simile.`, ch);
  };

  G.ddchart = function (r, d) {
    const peak = r.step(100, 200, 10);
    const ddp = r.pick([20, 25, 30, 35, 40, 50]);
    const trough = U.round(peak * (1 - ddp / 100), 2);
    const v = [];
    const up = C.walk(r, 14, peak * 0.75, 0, 0.02);
    up.forEach((x, i) => v.push(x + ((peak - up[13]) * i) / 13));
    v[13] = peak;
    const dn = C.walk(r, 12, peak, 0, 0.02);
    dn.forEach((x, i) => { if (i) v.push(x + ((trough - dn[11]) * i) / 11); });
    v[24] = trough;
    const rec = C.walk(r, 12, trough, 0.012, 0.02);
    rec.forEach((x, i) => { if (i) v.push(Math.min(x, peak * 0.97)); });
    for (let i = 0; i < v.length; i++) { if (i !== 13 && v[i] >= peak) v[i] = peak * 0.985; if (i !== 24 && v[i] <= trough) v[i] = trough * 1.015; }
    const ch = C.line({ series: [{ v, col: 's1', name: 'Valore €', area: true }], xl: [[0, 'Inizio'], [v.length - 1, 'Oggi']],
      marks: [{ i: 13, label: 'Picco ' + U.eur(peak) }, { i: 24, label: 'Minimo ' + U.eurA(trough, 0), pos: 'below', col: 'down' }], label: 'Andamento con un drawdown' });
    const fmt = (x) => U.signPct(x, 0);
    if (d > 0.5 && r.chance(0.5)) {
      const need = (peak / trough - 1) * 100;
      const o = C.numOpts(r, need, (x) => '+' + U.nf(x, 0) + '%', [ddp, ddp * 1.5]);
      return mc(r, 'Di quanto deve salire il valore dal minimo per tornare al picco?', o.correct, o.wrong,
        `Recupero = picco ÷ minimo − 1 = ${U.nf(peak, 0)} ÷ ${U.nf(trough, 0)} − 1 ≈ +${U.nf(need, 0)}%. Le perdite pesano più dei guadagni necessari a recuperarle.`, ch);
    }
    const o = C.numOpts(r, -ddp, fmt, [-(peak - trough) / trough * 100, -ddp / 2, -(ddp + 10)]);
    return mc(r, 'Qual è il drawdown massimo (dal picco al minimo)?', o.correct, o.wrong, `Drawdown = (minimo − picco) ÷ picco = (${U.nf(trough, 0)} − ${U.nf(peak, 0)}) ÷ ${U.nf(peak, 0)} = −${ddp}%.`, ch);
  };

  G.bars = function (r, d) {
    const n = 6;
    let vals;
    for (let k = 0; k < 50; k++) {
      vals = Array.from({ length: n }, () => r.step(-20, 30, 1));
      const s = vals.slice().sort((a, b) => a - b);
      if (s[0] < 0 && s[1] !== s[0] && s[n - 1] !== s[n - 2] && vals.filter((x) => x < 0).length <= 3) break;
    }
    const labs = vals.map((_, i) => 'Anno ' + (i + 1));
    const variant = r.pick(d < 0.4 ? ['worst', 'best', 'neg'] : ['worst', 'best', 'neg', 'avg', 'avg']);
    const showLabels = variant === 'avg';
    const ch = C.bars({ d: labs.map((l, i) => [l.replace('Anno ', 'A'), vals[i]]), unit: '%', labels: showLabels, label: 'Rendimenti annuali' });
    if (variant === 'worst' || variant === 'best') {
      const idx = vals.indexOf(variant === 'worst' ? Math.min(...vals) : Math.max(...vals));
      const wrong = r.sample(labs.filter((_, i) => i !== idx), 3);
      return mc(r, `Rendimenti annuali di un fondo (esempio). In quale anno il risultato è stato ${variant === 'worst' ? 'peggiore' : 'migliore'}?`, labs[idx], wrong,
        `La barra ${variant === 'worst' ? 'più in basso' : 'più alta'} è l’${labs[idx]} (${U.signPct(vals[idx], 0)}).`, ch);
    }
    if (variant === 'neg') {
      const k = vals.filter((x) => x < 0).length;
      const o = C.numOpts(r, k, (x) => String(Math.round(x)), [k + 1, k - 1, k + 2, n - k].filter((x) => x >= 0 && x <= n));
      return mc(r, 'Rendimenti annuali di un fondo (esempio). In quanti anni il fondo ha perso valore?', o.correct, o.wrong, `Le barre sotto lo zero (in rosso) sono ${k}: anche un buon investimento attraversa anni negativi.`, ch);
    }
    const avg = U.mean(vals);
    const o = C.numOpts(r, avg, (x) => U.signPct(x, 1), [U.sum(vals.filter((x) => x > 0)) / n, U.mean(vals.map(Math.abs)), U.sum(vals) / (n - 1)]);
    return mc(r, 'Qual è il rendimento medio aritmetico annuo nei 6 anni?', o.correct, o.wrong, `Somma dei rendimenti (${U.nf(U.sum(vals), 0)}%) ÷ 6 = ${U.signPct(avg, 1)}. Nota: la media aritmetica sovrastima la crescita composta effettiva.`, ch);
  };

  G.pie = function (r, d) {
    const sets = [
      ['Azioni', 'Obbligazioni', 'Liquidità', 'Oro'],
      ['Azioni Europa', 'Azioni USA', 'Obbligazioni', 'Liquidità'],
      ['Affitto', 'Spesa', 'Trasporti', 'Svago', 'Risparmio'],
      ['Tecnologia', 'Finanza', 'Salute', 'Energia'],
    ];
    const labs = r.pick(sets);
    let w;
    for (let k = 0; k < 50; k++) {
      w = labs.map(() => r.step(5, 50, 5));
      const s = U.sum(w);
      w = w.map((x) => Math.round((x / s) * 20) * 5);
      const diff = 100 - U.sum(w);
      w[0] += diff;
      const sorted = w.slice().sort((a, b) => b - a);
      if (w.every((x) => x >= 5) && sorted[0] !== sorted[1]) break;
    }
    const data = labs.map((l, i) => [l, w[i]]);
    const variant = r.pick(['max', 'sum', 'eur']);
    const ch = C.pie({ d: data, label: 'Composizione' });
    if (variant === 'max') {
      const i = w.indexOf(Math.max(...w));
      return mc(r, 'Quale voce pesa di più nella composizione?', labs[i], r.sample(labs.filter((_, j) => j !== i), Math.min(3, labs.length - 1)), `${labs[i]} è la fetta più grande (${w[i]}%).`, ch);
    }
    if (variant === 'sum') {
      const [i, j] = r.sample(labs.map((_, k) => k), 2);
      const s = w[i] + w[j];
      const o = C.numOpts(r, s, (x) => U.nf(Math.round(x), 0) + '%', [100 - s, Math.abs(w[i] - w[j]), s + 10]);
      return mc(r, `Quanto pesano insieme ${labs[i]} e ${labs[j]}?`, o.correct, o.wrong, `${w[i]}% + ${w[j]}% = ${s}%.`, ch);
    }
    const tot = r.pick([10000, 20000, 25000, 40000, 50000]);
    const i = r.int(0, labs.length - 1);
    const val = (tot * w[i]) / 100;
    const o = C.numOpts(r, val, (x) => U.eur(Math.round(x)), [tot * (100 - w[i]) / 100, tot / labs.length, val * 10]);
    return mc(r, `Su un totale di ${U.eur(tot)}, quanti euro corrispondono a “${labs[i]}”?`, o.correct, o.wrong, `${U.eur(tot)} × ${w[i]}% = ${U.eur(val)}.`, ch);
  };

  const MAT = ['3m', '6m', '1a', '2a', '5a', '10a', '30a'];
  const MATY = [0.25, 0.5, 1, 2, 5, 10, 30];
  G.curve = function (r, d) {
    const shape = r.pick(['normal', 'inverted', 'flat']);
    const base = r.range(1.5, 3.5);
    const y = MATY.map((t) => {
      const k = Math.log(1 + t) / Math.log(31);
      if (shape === 'normal') return base + 2.2 * k + 0.05 * r.normal();
      if (shape === 'inverted') return base + 1.8 - 1.6 * k + 0.05 * r.normal();
      return base + 0.12 * Math.sin(t) + 0.04 * r.normal();
    }).map((x) => U.round(x, 2));
    const variant = d > 0.5 && r.chance(0.5) ? 'spread' : 'shape';
    const ch = C.line({ series: [{ v: y, col: 's1', name: 'Rendimento %', dots: true }], xl: MAT.map((m, i) => [i, m]), xlAll: MAT, yfmt: (t) => U.nf(t, 1) + '%', yfmtName: 'pct',
      marks: variant === 'spread' ? [{ i: 3, label: U.pct(y[3], 2), pos: 'below' }, { i: 5, label: U.pct(y[5], 2) }] : [], ymin: 0, label: 'Curva dei rendimenti' });
    if (variant === 'spread') {
      const bp = Math.round((y[5] - y[3]) * 100);
      const o = C.numOpts(r, bp, (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + U.nf(Math.abs(Math.round(x)), 0) + ' pb', [-bp, bp * 10, Math.round(bp / 10)]);
      return mc(r, 'Qual è lo spread tra il rendimento a 10 anni e quello a 2 anni, in punti base?', o.correct, o.wrong, `(${U.nf(y[5], 2)}% − ${U.nf(y[3], 2)}%) = ${U.nf(y[5] - y[3], 2)} punti percentuali = ${bp} punti base (1 pb = 0,01%).`, ch);
    }
    const N = { normal: 'Normale (inclinata positivamente)', inverted: 'Invertita', flat: 'Piatta' };
    const E = {
      normal: 'Rendimenti più alti sulle scadenze lunghe: chi presta più a lungo chiede un premio. È la forma più comune.',
      inverted: 'Le scadenze brevi rendono più delle lunghe: storicamente è spesso comparsa prima di recessioni, ma non è un orologio preciso.',
      flat: 'Rendimenti simili su tutte le scadenze: fase di transizione o incertezza sulle prospettive.',
    };
    return mc(r, 'Che forma ha questa curva dei rendimenti?', N[shape], Object.keys(N).filter((k) => k !== shape).map((k) => N[k]), E[shape], ch);
  };

  G.growth = function (r, d) {
    const rate = r.pick([5, 6, 7, 8]);
    const P = 10000, Y = 30;
    const simple = Array.from({ length: Y + 1 }, (_, t) => P * (1 + (rate / 100) * t));
    const comp = Array.from({ length: Y + 1 }, (_, t) => P * (1 + rate / 100) ** t);
    const swap = r.chance(0.5);
    const A = swap ? comp : simple, B = swap ? simple : comp;
    const ch = C.line({ series: [{ v: A, col: 's1', name: 'Linea A' }, { v: B, col: 's2', name: 'Linea B' }], xl: [[0, 'Anno 0'], [10, '10'], [20, '20'], [30, '30']], yfmt: (t) => U.nf(t / 1000, 0) + 'k', yfmtName: 'eur', label: 'Crescita di 10.000 €' });
    ch.legend = C.legend([['Linea A', 's1'], ['Linea B', 's2']]);
    if (d > 0.45 && r.chance(0.5)) {
      const fv = comp[Y];
      const o = C.numOpts(r, fv, (x) => U.eur(Math.round(x / 1000) * 1000), [simple[Y], P * (1 + rate / 100 * Y) * 1.5, fv * 1.6]);
      return mc(r, `10.000 € al ${rate}% annuo composto per 30 anni: quanto valgono circa alla fine?`, o.correct, o.wrong, `10.000 × (1 + ${rate}%)^30 ≈ ${U.eur(Math.round(fv))}. Con l’interesse semplice sarebbero solo ${U.eur(simple[Y])}.`, ch);
    }
    const correct = swap ? 'Linea A' : 'Linea B';
    return mc(r, `Entrambe le linee partono da 10.000 € al ${rate}% annuo. Quale rappresenta l’interesse composto?`, correct, [swap ? 'Linea B' : 'Linea A', 'Sono identiche'],
      'L’interesse composto produce una curva che accelera (gli interessi generano altri interessi); quello semplice cresce in linea retta.', ch);
  };

  G.infl = function (r, d) {
    const i = r.pick([2, 3, 4, 5]);
    const yrs = [0, 5, 10, 15, 20];
    const v = yrs.map((t) => 100 / (1 + i / 100) ** t);
    const ch = C.bars({ d: yrs.map((t, k) => [t ? `${t} anni` : 'Oggi', U.round(v[k], 1)]), labels: true, hideIdx: 4, fmtv: (x) => U.nf(x, 0) + ' €', col: 's1', label: 'Potere d’acquisto di 100 €' });
    const o = C.numOpts(r, v[4], (x) => U.eur(Math.round(x)), [100 - i * 20, 100 * (1 + i / 100) ** 20, 100 - i * 10]);
    return mc(r, `Con inflazione costante al ${i}% annuo, quanto “vale” oggi, in potere d’acquisto, una banconota da 100 € tenuta ferma 20 anni?`, o.correct, o.wrong,
      `100 ÷ (1 + ${i}%)^20 ≈ ${U.eur(Math.round(v[4]))}. L’inflazione erode in modo composto il denaro fermo.`, ch);
  };

  G.volume = function (r, d) {
    const conf = r.chance(0.5);
    const R = r.step(50, 100, 10);
    const n = 40;
    const v = [];
    for (let i = 0; i < 32; i++) v.push(R * (0.93 + 0.055 * Math.sin(i / 2.2) + 0.012 * r.normal()));
    for (let i = 32; i < n; i++) v.push(R * (1.01 + (i - 31) * (conf ? 0.012 : 0.006) + 0.01 * r.normal()));
    const vol = v.map((_, i) => (i < 32 ? r.range(80, 120) : conf ? r.range(220, 320) : r.range(45, 75)));
    const top = C.line({ series: [{ v, col: 's1', name: 'Prezzo €' }], hl: [{ y: R, label: 'Resistenza', col: 'ink2' }], h: 150, m: { b: 10 }, label: 'Prezzo e rottura della resistenza' });
    const bot = C.bars({ d: vol.map((x, i) => [i === 0 ? '' : i === n - 1 ? '' : '', x]), h: 80, m: { t: 6, b: 8 }, col: 's7', nt: 2, label: 'Volumi' });
    top.svg += bot.svg.replace('class="chart"', 'class="chart chart-sub"');
    top.cap = 'Sopra: prezzo. Sotto: volumi scambiati per seduta.';
    return mc(r, 'Il prezzo ha superato la resistenza. Il breakout è confermato dai volumi?', conf ? 'Sì: i volumi aumentano molto durante la rottura' : 'No: volumi deboli, rischio di falso breakout',
      [conf ? 'No: volumi deboli, rischio di falso breakout' : 'Sì: i volumi aumentano molto durante la rottura', 'I volumi non danno informazioni sulle rotture'],
      conf ? 'Volumi alti durante la rottura indicano partecipazione ampia: segnale più affidabile (ma mai certo).' : 'Una rottura con volumi bassi coinvolge pochi operatori: più probabile che il prezzo rientri.', top);
  };

  G.rsi = function (r, d) {
    const zone = r.pick(['ob', 'os', 'neu']);
    let v, rs;
    for (let k = 0; k < 150; k++) {
      const a = C.walk(r, 30, 100, 0, 0.012);
      const drift = zone === 'ob' ? 0.012 : zone === 'os' ? -0.012 : 0;
      const b = C.walk(r, 16, a[29], drift, zone === 'neu' ? 0.012 : 0.006);
      v = a.concat(b.slice(1));
      rs = C.rsi(v, 14);
      const L = rs[rs.length - 1];
      if ((zone === 'ob' && L > 74) || (zone === 'os' && L < 26) || (zone === 'neu' && L > 42 && L < 58)) break;
    }
    const top = C.line({ series: [{ v, col: 's1', name: 'Prezzo' }], h: 140, m: { b: 8 }, label: 'Prezzo' });
    const bot = C.line({ series: [{ v: rs, col: 's7', name: 'RSI' }], h: 104, m: { t: 16, b: 18 }, ymin: 0, ymax: 100, nt: 2, hl: [{ y: 70, label: '70', col: 'down' }, { y: 30, label: '30', col: 'up' }], label: 'RSI 14' });
    top.svg += bot.svg.replace('class="chart"', 'class="chart chart-sub"');
    top.cap = 'Sopra: prezzo. Sotto: RSI a 14 periodi (0-100).';
    const N = { ob: 'Ipercomprato (sopra 70)', os: 'Ipervenduto (sotto 30)', neu: 'Zona neutra (tra 30 e 70)' };
    const E = {
      ob: 'L’RSI sopra 70 indica rialzi forti e rapidi. Non è un segnale di vendita automatico: in un trend forte può restare alto a lungo.',
      os: 'L’RSI sotto 30 indica ribassi forti e rapidi. Non garantisce un rimbalzo: serve conferma.',
      neu: 'L’RSI tra 30 e 70 non segnala eccessi di momentum.',
    };
    return mc(r, 'In quale zona si trova l’RSI alla fine del grafico?', N[zone], Object.keys(N).filter((k) => k !== zone).map((k) => N[k]), E[zone], top);
  };

  G.divers = function (r, d) {
    let A, B, P;
    for (let k = 0; k < 60; k++) {
      A = [100]; B = [100];
      for (let i = 1; i < 40; i++) {
        const z = r.normal(), e = r.normal();
        A.push(A[i - 1] * (1 + 0.003 + 0.03 * z));
        B.push(B[i - 1] * (1 + 0.003 + 0.03 * (-0.8 * z + 0.6 * e)));
      }
      P = A.map((a, i) => (a + B[i]) / 2);
      const ra = A.slice(1).map((x, i) => x / A[i] - 1), rp = P.slice(1).map((x, i) => x / P[i] - 1);
      if (U.std(rp) < U.std(ra) * 0.5) break;
    }
    const order = r.shuffle([0, 1, 2]);
    const raw = [A, B, P];
    const names = ['Linea 1', 'Linea 2', 'Linea 3'];
    const cols = ['s1', 's2', 's3'];
    const series = order.map((k, j) => ({ v: raw[k], col: cols[j], name: names[j], w: k === 2 ? 2.4 : 1.6 }));
    const ch = C.line({ series, xl: [[0, 'Inizio'], [39, 'Fine']], label: 'Due asset e un portafoglio misto' });
    ch.legend = C.legend(names.map((n, j) => [n, cols[j]]));
    const pj = order.indexOf(2);
    return mc(r, 'Due asset con correlazione negativa e un portafoglio 50/50 composto da entrambi. Quale linea è il portafoglio?', names[pj], names.filter((_, j) => j !== pj).concat(['Non si può capire']).slice(0, 3),
      'Quando un asset scende l’altro tende a salire: mescolati, le oscillazioni si compensano e la linea del portafoglio è molto più regolare.', ch);
  };

  G.pattern = function (r, d) {
    const kind = r.pick(['dtop', 'dbot', 'hs', 'ihs']);
    const K = {
      dtop: [[0, 60], [8, 90], [13, 75], [19, 90], [26, 62], [31, 55]],
      dbot: [[0, 90], [8, 60], [13, 75], [19, 60], [26, 88], [31, 95]],
      hs: [[0, 55], [5, 78], [9, 68], [15, 92], [21, 68], [25, 78], [31, 56]],
      ihs: [[0, 95], [5, 72], [9, 82], [15, 58], [21, 82], [25, 72], [31, 94]],
    }[kind];
    const v = [];
    for (let i = 0; i < 32; i++) {
      let j = 0;
      while (j < K.length - 2 && K[j + 1][0] < i) j++;
      const [x0, y0] = K[j], [x1, y1] = K[j + 1];
      const t = (i - x0) / (x1 - x0);
      v.push(y0 + (y1 - y0) * U.clamp(t, 0, 1) + 1.4 * r.normal());
    }
    const neck = kind === 'dtop' ? 75 : kind === 'dbot' ? 75 : 68;
    const ch = C.line({ series: [{ v, col: 's1', name: 'Prezzo' }], hl: d > 0.5 ? [{ y: kind === 'ihs' ? 82 : neck, col: 'ink2', label: 'Neckline' }] : [], xl: [[0, 'Inizio'], [31, 'Oggi']], label: 'Figura di prezzo' });
    const N = { dtop: 'Doppio massimo', dbot: 'Doppio minimo', hs: 'Testa e spalle', ihs: 'Testa e spalle rovesciato' };
    const E = {
      dtop: 'Due massimi simili separati da un minimo: se il prezzo rompe la neckline al ribasso, possibile inversione ribassista.',
      dbot: 'Due minimi simili separati da un massimo: la rottura della neckline al rialzo suggerisce inversione rialzista.',
      hs: 'Tre massimi con quello centrale più alto: classica figura di inversione ribassista, valida solo con rottura della neckline.',
      ihs: 'Tre minimi con quello centrale più basso: figura di inversione rialzista, da confermare con la rottura della neckline.',
    };
    return mc(r, 'Quale figura grafica riconosci?', N[kind], Object.keys(N).filter((k) => k !== kind).map((k) => N[k]), E[kind], ch);
  };

  G.payoff = function (r, d) {
    const pos = r.pick(['lc', 'lp', 'sc', 'sp']);
    const K = r.step(40, 120, 10), p = r.step(2, 8, 1);
    const xs = Array.from({ length: 41 }, (_, i) => K * 0.6 + (K * 0.8 * i) / 40);
    const pay = xs.map((S) => {
      if (pos === 'lc') return Math.max(S - K, 0) - p;
      if (pos === 'lp') return Math.max(K - S, 0) - p;
      if (pos === 'sc') return p - Math.max(S - K, 0);
      return p - Math.max(K - S, 0);
    });
    const ch = C.line({ series: [{ v: pay, col: 's1', name: 'Profitto/perdita €' }], zero: true, xl: [[0, U.nf(xs[0], 0)], [20, U.nf(K, 0)], [40, U.nf(xs[40], 0)]],
      xlAll: xs.map((x) => 'Sottostante ' + U.nf(x, 1) + ' €'), label: 'Profitto e perdita a scadenza' });
    ch.cap = 'Asse orizzontale: prezzo del sottostante a scadenza. Asse verticale: profitto o perdita per azione.';
    const N = { lc: 'Acquisto di una call', lp: 'Acquisto di una put', sc: 'Vendita di una call', sp: 'Vendita di una put' };
    if (d > 0.5 && (pos === 'lc' || pos === 'lp') && r.chance(0.6)) {
      const be = pos === 'lc' ? K + p : K - p;
      return mc(r, `${N[pos]} con strike ${K} € e premio ${p} €. Qual è il prezzo di pareggio a scadenza?`, U.eur(be), [U.eur(pos === 'lc' ? K - p : K + p), U.eur(K), U.eur(K + 2 * p * (pos === 'lc' ? 1 : -1))],
        pos === 'lc' ? `Call: pareggio = strike + premio = ${K} + ${p} = ${K + p} €.` : `Put: pareggio = strike − premio = ${K} − ${p} = ${K - p} €.`, ch);
    }
    const E = {
      lc: 'Perdita limitata al premio, guadagno che cresce se il sottostante sale sopra lo strike.',
      lp: 'Perdita limitata al premio, guadagno che cresce se il sottostante scende sotto lo strike.',
      sc: 'Guadagno limitato al premio incassato, perdita potenzialmente illimitata se il sottostante sale.',
      sp: 'Guadagno limitato al premio, perdita elevata se il sottostante crolla sotto lo strike.',
    };
    return mc(r, 'Quale posizione in opzioni produce questo profilo di profitto a scadenza?', N[pos], Object.keys(N).filter((k) => k !== pos).map((k) => N[k]), E[pos], ch);
  };

  G.cycle = function (r, d) {
    const phase = r.pick(['exp', 'peak', 'contr', 'trough']);
    const v = Array.from({ length: 48 }, (_, i) => 100 + i * 0.25 + 6 * Math.sin(i / 4) + 0.5 * r.normal());
    // punti caratteristici del seno (sin(i/4)): picco a i≈4π/2*... scegli indici
    const idx = { peak: Math.round(4 * (Math.PI / 2 + 2 * Math.PI)), trough: Math.round(4 * (1.5 * Math.PI)), exp: Math.round(4 * (2 * Math.PI)), contr: Math.round(4 * Math.PI) }[phase];
    const ch = C.line({ series: [{ v, col: 's1', name: 'Attività economica' }], marks: [{ i: idx, col: 'accent' }], xl: [[0, 'Tempo →']], label: 'Ciclo economico', hover: false });
    const N = { exp: 'Espansione', peak: 'Picco', contr: 'Contrazione', trough: 'Minimo (fondo del ciclo)' };
    const E = {
      exp: 'L’attività cresce: occupazione, consumi e utili aziendali tendono a salire.',
      peak: 'L’economia è al massimo del ciclo: spesso inflazione e tassi elevati, la crescita rallenta.',
      contr: 'L’attività rallenta o cala; se il calo è marcato e duraturo si parla di recessione.',
      trough: 'Il punto più basso: da qui di solito inizia la ripresa.',
    };
    return mc(r, 'In quale fase del ciclo economico si trova il punto evidenziato?', N[phase], Object.keys(N).filter((k) => k !== phase).map((k) => N[k]), E[phase], ch);
  };

  C.KEYS = Object.keys(G);
})(typeof window !== 'undefined' ? window : globalThis);
