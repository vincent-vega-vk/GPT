/* Super Rigori World Cup — effetti in stile anime anni '80: linee cinetiche, onomatopee, pannelli con gli occhi,
 * tiri speciali, scie infuocate, particelle e coriandoli */
(function (root) {
  'use strict';
  const PK = (root.PK = root.PK || {});
  const M = PK.M;
  const TAU = Math.PI * 2;
  const FONT = 'Impact, "Arial Black", "Haettenschweiler", sans-serif';

  const rnd = (seed) => M.rng(seed);

  // -------------------------------------------------------------- linee cinetiche
  /** Linee radiali da manga attorno a (cx,cy). inner = frazione del raggio vuota al centro */
  function speedLines(ctx, w, h, cx, cy, t, o) {
    o = o || {};
    const n = o.count || 90, inner = (o.inner != null ? o.inner : 0.35) * Math.hypot(w, h) / 2;
    const outer = Math.hypot(w, h) * 0.75;
    const rng = rnd(Math.floor(t * (o.fps || 14)) * 7919 + 3);
    ctx.save();
    ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rng() * 0.08;
      const r0 = inner * (0.85 + rng() * 0.6);
      const wd = (0.006 + rng() * 0.02) * (o.thick || 1);
      ctx.fillStyle = o.colors ? o.colors[i % o.colors.length] : '#ffffff';
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a - wd) * outer, cy + Math.sin(a - wd) * outer);
      ctx.lineTo(cx + Math.cos(a + wd) * outer, cy + Math.sin(a + wd) * outer);
      ctx.lineTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /** Strisce parallele orizzontali/diagonali (sensazione di velocità) */
  function streaks(ctx, w, h, ang, t, o) {
    o = o || {};
    const rng = rnd(Math.floor(t * 20) * 31 + 5);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(ang);
    const n = o.count || 40, L = Math.hypot(w, h);
    ctx.fillStyle = o.color || 'rgba(255,255,255,0.8)';
    ctx.globalAlpha = o.alpha != null ? o.alpha : 0.6;
    for (let i = 0; i < n; i++) {
      const y = (rng() - 0.5) * L, len = L * (0.15 + rng() * 0.5), x = (rng() - 0.5) * L;
      ctx.fillRect(x, y, len, 1 + rng() * 3);
    }
    ctx.restore();
  }

  function flash(ctx, w, h, a, color) {
    if (a <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, a);
    ctx.fillStyle = color || '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  function vignette(ctx, w, h, a) {
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.6);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(2,4,14,${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function letterbox(ctx, w, h, k) {
    const bh = h * 0.11 * k;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, bh);
    ctx.fillRect(0, h - bh, w, bh);
  }

  // ------------------------------------------------------------ testo "manga"
  /** Testo con contorno spesso e animazione di comparsa con rimbalzo (tt = secondi dall'inizio) */
  function bigText(ctx, text, x, y, size, o) {
    o = o || {};
    const tt = o.tt != null ? o.tt : 99;
    const pop = tt < 0.28 ? 1 + 0.5 * Math.sin((tt / 0.28) * Math.PI) * (1 - tt / 0.28) + (1 - Math.min(1, tt / 0.12)) * -0.6 : 1;
    const sc = Math.max(0.01, pop) * (o.scale || 1);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(o.rot || 0);
    ctx.scale(sc, sc);
    if (o.skew) ctx.transform(1, 0, o.skew, 1, 0, 0);
    ctx.font = `italic 900 ${size}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = size * 0.4; }
    ctx.lineWidth = size * 0.26;
    ctx.strokeStyle = o.outer || '#0a0a14';
    ctx.strokeText(text, 0, 0);
    ctx.shadowBlur = 0;
    ctx.lineWidth = size * 0.12;
    ctx.strokeStyle = o.stroke || '#ffffff';
    ctx.strokeText(text, 0, 0);
    const g = ctx.createLinearGradient(0, -size * 0.5, 0, size * 0.5);
    const cols = o.colors || ['#fff7a8', '#ffc400', '#ff5a1f'];
    g.addColorStop(0, cols[0]); g.addColorStop(0.5, cols[1]); g.addColorStop(1, cols[2]);
    ctx.fillStyle = g;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  /** Banner diagonale a tutto schermo ("GOOOL!", "PARATA!"...). tt = tempo dall'inizio, dur = durata totale */
  function banner(ctx, w, h, tt, dur, o) {
    const k = Math.min(1, tt / 0.18);
    const out = tt > dur - 0.3 ? Math.max(0, (dur - tt) / 0.3) : 1;
    const a = Math.min(k, out);
    if (a <= 0) return;
    const cy = h * 0.42;
    const bh = h * 0.2;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, cy);
    ctx.rotate(-0.07);
    const slide = (1 - Math.min(1, tt / 0.2)) * w;
    ctx.translate(-slide, 0);
    const g = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2);
    g.addColorStop(0, o.c1 || '#ff3d6b'); g.addColorStop(1, o.c2 || '#7a0a2a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-w, -bh / 2); ctx.lineTo(w, -bh / 2 - 12); ctx.lineTo(w, bh / 2 - 12); ctx.lineTo(-w, bh / 2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(-w, -bh / 2 - 3, w * 2, 5);
    ctx.fillRect(-w, bh / 2 - 2, w * 2, 5);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = a;
    bigText(ctx, o.text, w / 2, cy - slide * 0.0, Math.min(h * 0.2, w * 0.14), { tt, rot: -0.07, colors: o.colors, glow: o.glow || '#ffd23a', skew: -0.12 });
    if (o.sub) {
      ctx.font = `italic 800 ${Math.round(h * 0.04)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#000'; ctx.shadowBlur = 8;
      ctx.fillText(o.sub, w / 2, cy + bh * 0.62);
    }
    ctx.restore();
  }

  // --------------------------------------------------------- occhi (primo piano)
  function eye(ctx, cx, cy, ew, eh, o, flip) {
    ctx.save();
    ctx.translate(cx, cy);
    if (flip) ctx.scale(-1, 1);
    // sclera
    ctx.beginPath();
    ctx.moveTo(-ew / 2, eh * 0.12);
    ctx.bezierCurveTo(-ew * 0.28, -eh * 0.62, ew * 0.28, -eh * 0.7, ew / 2, -eh * 0.05);
    ctx.bezierCurveTo(ew * 0.25, eh * 0.55, -ew * 0.28, eh * 0.6, -ew / 2, eh * 0.12);
    ctx.closePath();
    ctx.fillStyle = '#fbfbff';
    ctx.fill();
    ctx.save();
    ctx.clip();
    // iride
    const ir = eh * 0.62, ix = (o.look || 0) * ew * 0.12, iy = -eh * 0.02;
    const g = ctx.createRadialGradient(ix, iy, ir * 0.1, ix, iy, ir);
    g.addColorStop(0, '#05060c');
    g.addColorStop(0.35, o.iris || '#2a7fff');
    g.addColorStop(1, M.shade(o.iris || '#2a7fff', -0.6));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(ix, iy, ir, 0, TAU); ctx.fill();
    ctx.fillStyle = '#05060c';
    ctx.beginPath(); ctx.arc(ix, iy, ir * 0.38, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ix - ir * 0.32, iy - ir * 0.34, ir * 0.22, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(ix + ir * 0.3, iy + ir * 0.32, ir * 0.1, 0, TAU); ctx.fill();
    // ombra della palpebra
    const sh = ctx.createLinearGradient(0, -eh * 0.6, 0, 0);
    sh.addColorStop(0, 'rgba(0,0,0,0.55)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh; ctx.fillRect(-ew, -eh, ew * 2, eh);
    ctx.restore();
    // palpebra superiore spessa + ciglia
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0a0a14';
    ctx.lineWidth = eh * 0.2;
    ctx.beginPath();
    ctx.moveTo(-ew * 0.52, eh * 0.14);
    ctx.bezierCurveTo(-ew * 0.28, -eh * 0.66, ew * 0.28, -eh * 0.74, ew * 0.54, -eh * 0.12);
    ctx.stroke();
    ctx.lineWidth = eh * 0.1;
    ctx.beginPath(); ctx.moveTo(ew * 0.5, -eh * 0.1); ctx.lineTo(ew * 0.66, -eh * 0.3); ctx.stroke();
    ctx.lineWidth = eh * 0.06;
    ctx.beginPath();
    ctx.moveTo(-ew * 0.48, eh * 0.16);
    ctx.bezierCurveTo(-ew * 0.25, eh * 0.52, ew * 0.25, eh * 0.52, ew * 0.45, eh * 0.04);
    ctx.stroke();
    // sopracciglio
    ctx.fillStyle = o.brow || '#1a120c';
    ctx.beginPath();
    const ang = o.browAng != null ? o.browAng : 0.28;
    ctx.moveTo(-ew * 0.62, -eh * (1.05 - ang * 1.2));
    ctx.lineTo(ew * 0.55, -eh * (1.0 + ang * 0.9));
    ctx.lineTo(ew * 0.58, -eh * (1.42 + ang * 0.8));
    ctx.lineTo(-ew * 0.6, -eh * (1.3 - ang * 1.0));
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  /** Pannello con gli occhi: skin = colore pelle, intense = 0..1 (aumenta le righe e il bagliore) */
  function eyesPanel(ctx, x, y, w, h, o) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, o.bg1 || '#14306b'); g.addColorStop(1, o.bg2 || '#050a1c');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    speedLines(ctx, w, h, x + w / 2, y + h / 2, o.t, { inner: 0.22, count: 70, colors: o.lines || ['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.25)'], alpha: 0.9 });
    // fascia del viso
    const bandH = h * 0.5, by = y + h * 0.22;
    ctx.fillStyle = o.skin || '#e8b98f';
    ctx.fillRect(x - 10, by, w + 20, bandH);
    const shade = ctx.createLinearGradient(0, by, 0, by + bandH);
    shade.addColorStop(0, 'rgba(60,20,10,0.55)'); shade.addColorStop(0.3, 'rgba(60,20,10,0)'); shade.addColorStop(1, 'rgba(60,20,10,0.25)');
    ctx.fillStyle = shade; ctx.fillRect(x - 10, by, w + 20, bandH);
    // ciuffo di capelli che scende sulla fronte
    ctx.fillStyle = o.hair || '#1a120c';
    ctx.beginPath();
    ctx.moveTo(x - 10, by - 6);
    for (let i = 0; i <= 8; i++) ctx.lineTo(x - 10 + ((w + 20) * i) / 8, by + (i % 2 ? 0.13 : -0.02) * bandH);
    ctx.lineTo(x + w + 10, by - 40); ctx.lineTo(x - 10, by - 40);
    ctx.closePath(); ctx.fill();
    const ew = w * 0.3, eh = bandH * 0.36;
    const ey = by + bandH * 0.52;
    const pulse = 1 + 0.015 * Math.sin(o.t * 22) * (o.intense || 0);
    eye(ctx, x + w * 0.3, ey, ew * pulse, eh * pulse, { iris: o.iris, brow: o.hair, browAng: o.browAng, look: o.look }, false);
    eye(ctx, x + w * 0.7, ey, ew * pulse, eh * pulse, { iris: o.iris, brow: o.hair, browAng: o.browAng, look: o.look }, true);
    // goccia di sudore
    if (o.sweat) {
      const sx = x + w * 0.86, sy = by + bandH * 0.05 + ((o.t * 40) % 20);
      ctx.fillStyle = 'rgba(190,235,255,0.95)'; ctx.strokeStyle = '#0a0a14'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx, sy - 14); ctx.quadraticCurveTo(sx + 11, sy + 4, sx, sy + 10); ctx.quadraticCurveTo(sx - 11, sy + 4, sx, sy - 14); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Schermata "versus" prima del rigore: due pannelli diagonali con gli occhi di rigorista e portiere.
   * data: { kicker:{name, number, code, skin, hair, iris, flag}, keeper:{...}, mode:'full'|'quick', tt, dur, sub }
   */
  function versus(ctx, w, h, d) {
    const tt = d.tt, dur = d.dur;
    const inK = M.smooth(tt / 0.22), outK = M.smooth((dur - tt) / 0.2);
    const k = Math.min(inK, outK);
    if (k <= 0.001) return;
    const sk = (1 - k) * w;
    // pannello rigorista (alto-sinistra)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-sk, 0); ctx.lineTo(w * 0.62 - sk, 0); ctx.lineTo(w * 0.46 - sk, h * 0.54); ctx.lineTo(-sk, h * 0.54); ctx.closePath();
    ctx.clip();
    eyesPanel(ctx, -sk, 0, w * 0.64, h * 0.56, { t: tt, skin: d.kicker.skin, hair: d.kicker.hair, iris: d.kicker.iris || '#2a7fff', bg1: '#1b3f95', bg2: '#050a1c', browAng: 0.34, sweat: d.pressure > 0.7, intense: d.pressure });
    ctx.restore();
    // pannello portiere (basso-destra)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(w * 0.54 + sk, h * 0.46); ctx.lineTo(w + sk, h * 0.46); ctx.lineTo(w + sk, h); ctx.lineTo(w * 0.38 + sk, h); ctx.closePath();
    ctx.clip();
    eyesPanel(ctx, w * 0.36 + sk, h * 0.44, w * 0.64, h * 0.56, { t: tt, skin: d.keeper.skin, hair: d.keeper.hair, iris: d.keeper.iris || '#e8402a', bg1: '#a3182a', bg2: '#1c050a', lines: ['rgba(255,230,180,0.85)', 'rgba(255,255,255,0.2)'], browAng: 0.3, intense: d.pressure });
    ctx.restore();
    // diagonale luminosa
    ctx.save();
    ctx.globalAlpha = k;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(w * 0.62, 0); ctx.lineTo(w * 0.46, h * 0.54); ctx.lineTo(0, h * 0.54); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w, h * 0.46); ctx.lineTo(w * 0.54, h * 0.46); ctx.lineTo(w * 0.38, h); ctx.stroke();
    ctx.restore();
    // didascalie
    const cap = (txt, sub, x, y, align) => {
      ctx.save();
      ctx.globalAlpha = k;
      ctx.textAlign = align;
      ctx.font = `italic 900 ${Math.round(h * 0.075)}px ${FONT}`;
      ctx.lineWidth = 8; ctx.strokeStyle = '#05060f'; ctx.lineJoin = 'round';
      ctx.strokeText(txt, x, y); ctx.fillStyle = '#fff'; ctx.fillText(txt, x, y);
      ctx.font = `italic 800 ${Math.round(h * 0.034)}px ${FONT}`;
      ctx.lineWidth = 5; ctx.strokeText(sub, x, y + h * 0.05); ctx.fillStyle = '#ffd23a'; ctx.fillText(sub, x, y + h * 0.05);
      ctx.restore();
    };
    cap(d.kicker.name.toUpperCase(), `#${d.kicker.number} · ${d.kicker.sub || 'RIGORISTA'}`, w * 0.04 - sk * 0.2, h * 0.62, 'left');
    cap(d.keeper.name.toUpperCase(), `#${d.keeper.number} · ${d.keeper.sub || 'PORTIERE'}`, w * 0.96 + sk * 0.2, h * 0.38, 'right');
    // VS centrale
    const vs = 1 + 0.12 * Math.sin(tt * 16);
    bigText(ctx, 'VS', w * 0.5, h * 0.5, h * 0.19 * vs, { tt, rot: -0.1, colors: ['#ffffff', '#ffe36a', '#ff8a1f'], glow: '#ff5a1f' });
    if (d.sub) {
      ctx.save(); ctx.globalAlpha = k;
      ctx.textAlign = 'center'; ctx.font = `italic 800 ${Math.round(h * 0.04)}px ${FONT}`;
      ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 8;
      ctx.fillText(d.sub, w / 2, h * 0.93);
      ctx.restore();
    }
    flash(ctx, w, h, Math.max(0, 1 - tt / 0.16) * 0.8);
  }

  // ------------------------------------------------------------ tiri speciali
  const FAMILY = { dragon: 'spiral', tornado: 'spiral', plasma: 'spiral', fire: 'fire', lightning: 'bolt', meteor: 'streak', shock: 'streak', nova: 'streak', claw: 'streak', ghost: 'ghost' };

  /** Intro a tutto schermo del tiro speciale: sfondo scuro, raggi colorati e nome della mossa */
  function specialIntro(ctx, w, h, tt, dur, spec, who, sub) {
    const a = Math.min(1, tt / 0.1) * Math.min(1, Math.max(0, (dur - tt) / 0.15));
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a * 0.72;
    ctx.fillStyle = '#02030a';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = a;
    speedLines(ctx, w, h, w / 2, h * 0.55, tt, { inner: 0.1, count: 110, colors: [spec.col[0], spec.col[2], spec.col[1]], alpha: 0.9, thick: 1.4, fps: 18 });
    const g = ctx.createRadialGradient(w / 2, h * 0.55, 0, w / 2, h * 0.55, h * 0.7);
    g.addColorStop(0, spec.col[2] + 'cc'); g.addColorStop(0.4, spec.col[0] + '55'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = a;
    // nome della mossa, grande e inclinato
    bigText(ctx, spec.name.toUpperCase() + '!!', w / 2, h * 0.43, Math.min(h * 0.17, w * 0.085), { tt, rot: -0.09, colors: ['#ffffff', spec.col[2], spec.col[0]], glow: spec.col[0], stroke: spec.col[1], skew: -0.15 });
    ctx.font = `italic 800 ${Math.round(h * 0.045)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff'; ctx.shadowColor = spec.col[0]; ctx.shadowBlur = 14;
    ctx.fillText(who, w / 2, h * 0.58);
    if (sub) { ctx.font = `800 ${Math.round(h * 0.03)}px ${FONT}`; ctx.fillStyle = spec.col[2]; ctx.fillText(sub, w / 2, h * 0.64); }
    ctx.restore();
    flash(ctx, w, h, Math.max(0, 1 - tt / 0.12) * 0.9);
  }

  /** Scia/aura del pallone in base al tipo di tiro speciale */
  function ballFx(ctx, cam, kind, ball, trail, cols, t) {
    const c = cam.project(ball.p);
    if (!c) return;
    const R = PK.Phys.BR * c.s;
    const fam = FAMILY[kind] || 'fire';
    const pts = [];
    (trail || []).forEach((tp) => { const q = cam.project(tp.p); if (q) pts.push({ x: q.x, y: q.y, s: q.s, a: tp.a }); });
    pts.push({ x: c.x, y: c.y, s: c.s, a: 1 });
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const rng = rnd(Math.floor(t * 24) * 131 + 7);
    // alone
    const g = ctx.createRadialGradient(c.x, c.y, R * 0.4, c.x, c.y, R * 4.2);
    g.addColorStop(0, cols[0] + 'cc'); g.addColorStop(0.35, cols[1] + '55'); g.addColorStop(1, cols[1] + '00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, R * 4.2, 0, TAU); ctx.fill();
    if (fam === 'fire') {
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], k = i / pts.length;
        const r = R * (0.4 + 1.5 * k) * (0.8 + 0.4 * Math.sin(t * 30 + i));
        const gg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.2);
        gg.addColorStop(0, cols[2] + 'dd'); gg.addColorStop(0.4, cols[0] + '99'); gg.addColorStop(1, cols[1] + '00');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(p.x, p.y - r * 0.3 * (1 - k), r * 2.2, 0, TAU); ctx.fill();
      }
      for (let f = 0; f < 6; f++) {
        const a = rng() * TAU, l = R * (2 + rng() * 3);
        ctx.strokeStyle = cols[f % 2 ? 0 : 2] + 'cc'; ctx.lineWidth = R * (0.25 + rng() * 0.3);
        ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.quadraticCurveTo(c.x + Math.cos(a) * l * 0.5 + 6, c.y + Math.sin(a) * l * 0.5, c.x + Math.cos(a) * l, c.y + Math.sin(a) * l); ctx.stroke();
      }
    } else if (fam === 'bolt') {
      for (let b = 0; b < 6; b++) {
        let x = c.x, y = c.y;
        const a = rng() * TAU, len = R * (3 + rng() * 5);
        ctx.strokeStyle = b % 2 ? cols[2] : cols[0]; ctx.lineWidth = R * (0.12 + rng() * 0.12);
        ctx.shadowColor = cols[1]; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let s = 1; s <= 6; s++) {
          x = c.x + Math.cos(a) * (len * s) / 6 + (rng() - 0.5) * R * 1.2;
          y = c.y + Math.sin(a) * (len * s) / 6 + (rng() - 0.5) * R * 1.2;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // scia elettrica lungo la traiettoria
      ctx.shadowBlur = 0;
      ctx.strokeStyle = cols[1] + 'aa'; ctx.lineWidth = R * 0.7;
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x + (rng() - 0.5) * R * 0.6, p.y + (rng() - 0.5) * R * 0.6) : ctx.moveTo(p.x, p.y))); ctx.stroke();
    } else if (fam === 'spiral') {
      for (let h = 0; h < 3; h++) {
        ctx.strokeStyle = [cols[0], cols[2], cols[1]][h] + 'dd';
        ctx.lineWidth = R * (0.5 - h * 0.1);
        ctx.beginPath();
        pts.forEach((p, i) => {
          const q = pts[Math.min(i + 1, pts.length - 1)], pr = pts[Math.max(i - 1, 0)];
          let dx = q.x - pr.x, dy = q.y - pr.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
          const off = Math.sin(t * 20 + i * 0.7 + h * 2.1) * R * (0.5 + 1.8 * (i / pts.length));
          const x = p.x - dy * off, y = p.y + dx * off;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.stroke();
      }
    } else if (fam === 'streak') {
      ctx.strokeStyle = cols[2] + 'ee';
      for (let w = 0; w < 3; w++) {
        ctx.lineWidth = R * (1.5 - w * 0.5);
        ctx.strokeStyle = [cols[1] + '66', cols[0] + 'aa', cols[2] + 'ff'][w];
        ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
      }
      if (kind === 'nova' || kind === 'shock') {
        for (let r = 0; r < 3; r++) {
          const rr = R * (1.5 + ((t * 5 + r / 3) % 1) * 4);
          ctx.strokeStyle = cols[0] + Math.floor(200 * (1 - ((t * 5 + r / 3) % 1))).toString(16).padStart(2, '0');
          ctx.lineWidth = R * 0.25;
          ctx.beginPath(); ctx.arc(c.x, c.y, rr, 0, TAU); ctx.stroke();
        }
      }
      if (kind === 'claw') {
        ctx.strokeStyle = cols[0]; ctx.lineWidth = R * 0.18;
        for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(c.x - R * 4 + k * R * 0.6, c.y - R * 3); ctx.lineTo(c.x + R * 4 + k * R * 0.6, c.y + R * 3); ctx.stroke(); }
      }
      for (let r = 0; r < 12; r++) {
        const a = rng() * TAU, l = R * (1.6 + rng() * 3.5);
        ctx.strokeStyle = cols[2]; ctx.lineWidth = Math.max(1, R * 0.07);
        ctx.beginPath(); ctx.moveTo(c.x + Math.cos(a) * R * 1.1, c.y + Math.sin(a) * R * 1.1); ctx.lineTo(c.x + Math.cos(a) * l, c.y + Math.sin(a) * l); ctx.stroke();
      }
    } else if (fam === 'ghost') {
      pts.forEach((p, i) => {
        if (i % 2) return;
        ctx.globalAlpha = 0.12 + 0.28 * (i / pts.length);
        ctx.fillStyle = cols[i % 4 === 0 ? 0 : 1];
        ctx.beginPath(); ctx.arc(p.x + Math.sin(t * 30 + i) * R * 0.5, p.y, R * (0.8 + 0.3 * Math.sin(i)), 0, TAU); ctx.fill();
      });
    }
    ctx.restore();
  }

  // --------------------------------------------------------------- particelle
  class Particles {
    constructor() { this.list = []; this.rng = M.rng(99); }
    emit(o) { this.list.push(Object.assign({ life: 1, max: 1, size: 0.1, vx: 0, vy: 0, vz: 0, g: 9.8, drag: 0, col: '#fff', type: 'dot', add: false, rot: 0, vr: 0, fade: true }, o, { max: o.life || 1 })); }
    burst(type, p, n, o) {
      o = o || {};
      for (let i = 0; i < n; i++) {
        const a = this.rng() * TAU, up = this.rng();
        const sp = (o.speed || 3) * (0.3 + this.rng());
        this.emit({
          type, x: p.x, y: p.y, z: p.z,
          vx: Math.cos(a) * sp * (o.flat ? 1 : 0.7), vy: (o.up != null ? o.up : 2) * (0.3 + up), vz: Math.sin(a) * sp * (o.flat ? 1 : 0.7),
          life: (o.life || 1) * (0.6 + this.rng() * 0.6), size: (o.size || 0.1) * (0.6 + this.rng() * 0.8),
          col: Array.isArray(o.col) ? o.col[Math.floor(this.rng() * o.col.length)] : o.col || '#fff',
          g: o.g != null ? o.g : 9.8, add: !!o.add, rot: this.rng() * TAU, vr: (this.rng() - 0.5) * 12, drag: o.drag || 0,
        });
      }
    }
    update(dt) {
      for (let i = this.list.length - 1; i >= 0; i--) {
        const p = this.list[i];
        p.life -= dt;
        if (p.life <= 0) { this.list.splice(i, 1); continue; }
        p.vy -= p.g * dt;
        const d = Math.exp(-p.drag * dt);
        p.vx *= d; p.vz *= d; if (p.drag) p.vy *= d;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.y < 0.02 && p.type !== 'spark') { p.y = 0.02; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; }
        p.rot += p.vr * dt;
      }
    }
    draw(ctx, cam) {
      ctx.save();
      for (const p of this.list) {
        const q = cam.project(p);
        if (!q) continue;
        const k = p.life / p.max;
        const r = Math.max(0.8, p.size * q.s);
        ctx.globalAlpha = p.fade ? Math.min(1, k * 1.6) : 1;
        ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
        ctx.fillStyle = p.col;
        if (p.type === 'conf') {
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(p.rot); ctx.scale(1, Math.abs(Math.sin(p.rot * 1.7)) + 0.15);
          ctx.fillRect(-r, -r * 0.55, r * 2, r * 1.1); ctx.restore();
        } else if (p.type === 'star') {
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(p.rot);
          ctx.beginPath(); for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.35 : r * 1.4; ctx.lineTo(Math.cos((i * Math.PI) / 4) * rr, Math.sin((i * Math.PI) / 4) * rr); }
          ctx.closePath(); ctx.fill(); ctx.restore();
        } else {
          ctx.beginPath(); ctx.arc(q.x, q.y, r * (p.type === 'flame' ? 0.6 + k : 1), 0, TAU); ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  // ------------------------------------------------- flash dei fotografi nel pubblico
  function crowdFlashes(ctx, w, h, t, n, areaTop, areaBottom) {
    const rng = rnd(Math.floor(t * 9) * 977 + 11);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const x = rng() * w, y = areaTop + rng() * (areaBottom - areaTop), r = 2 + rng() * 5;
      const ph = (t * 9) % 1;
      const a = Math.max(0, 1 - ph * 2.5);
      if (a <= 0) continue;
      ctx.fillStyle = `rgba(255,255,240,${a})`;
      ctx.fillRect(x - r * 2.2, y - 0.6, r * 4.4, 1.2);
      ctx.fillRect(x - 0.6, y - r * 2.2, 1.2, r * 4.4);
      ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  PK.FX = { speedLines, streaks, flash, vignette, letterbox, bigText, banner, eyesPanel, versus, specialIntro, ballFx, Particles, crowdFlashes, eye };
  if (typeof module !== 'undefined' && module.exports) module.exports = PK;
})(typeof window !== 'undefined' ? window : globalThis);
