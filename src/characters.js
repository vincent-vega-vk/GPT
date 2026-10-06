/* Super Rigori World Cup — disegno di pallone (icosaedro troncato che ruota) e personaggi cel-shaded */
(function (root) {
  'use strict';
  const PK = (root.PK = root.PK || {});
  const M = PK.M;
  const mat = M.mat;
  const OUT = '#0d1020';

  // ------------------------------------------------------------ geometria pallone
  const BallGeo = (function () {
    const PHI = (1 + Math.sqrt(5)) / 2;
    const base = [[0, 1, 3 * PHI], [1, 2 + PHI, 2 * PHI], [PHI, 2, 2 * PHI + 1]];
    const verts = [];
    base.forEach((t) => {
      for (let r = 0; r < 3; r++) {
        const a = [t[r % 3], t[(r + 1) % 3], t[(r + 2) % 3]];
        const sg = a.map((x) => (x === 0 ? [1] : [1, -1]));
        sg[0].forEach((s0) => sg[1].forEach((s1) => sg[2].forEach((s2) => verts.push({ x: a[0] * s0, y: a[1] * s1, z: a[2] * s2 }))));
      }
    });
    verts.forEach((v) => { const l = Math.hypot(v.x, v.y, v.z); v.x /= l; v.y /= l; v.z /= l; });
    let min = 9;
    for (let i = 0; i < verts.length; i++) for (let j = i + 1; j < verts.length; j++) min = Math.min(min, M.dist(verts[i], verts[j]));
    const edges = [];
    for (let i = 0; i < verts.length; i++) for (let j = i + 1; j < verts.length; j++) if (M.dist(verts[i], verts[j]) < min * 1.02) edges.push([i, j]);
    // pentagoni: 12 direzioni dell'icosaedro
    const dirs = [];
    [[0, 1, PHI], [1, PHI, 0], [PHI, 0, 1]].forEach((t) => [1, -1].forEach((s1) => [1, -1].forEach((s2) => dirs.push(M.norm({ x: t[0] * (t[0] === 0 ? 1 : s1), y: t[1] * (t[1] === 0 ? 1 : (t[0] === 0 ? s1 : s2)), z: t[2] * (t[2] === 0 ? 1 : s2) })))));
    // elimina duplicati
    const uniq = [];
    dirs.forEach((d) => { if (!uniq.some((u) => M.dist(u, d) < 1e-3)) uniq.push(d); });
    const pent = uniq.map((d) => {
      const idx = verts.map((v, i) => ({ i, dot: M.dot(v, d) })).sort((a, b) => b.dot - a.dot).slice(0, 5).map((o) => o.i);
      // ordina per angolo attorno a d
      const a0 = M.norm(M.cross(d, Math.abs(d.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 }));
      const a1 = M.cross(d, a0);
      idx.sort((p, q) => Math.atan2(M.dot(verts[p], a1), M.dot(verts[p], a0)) - Math.atan2(M.dot(verts[q], a1), M.dot(verts[q], a0)));
      return { d, idx };
    });
    return { verts, edges, pent };
  })();

  // -------------------------------------------------------------------- pallone
  /**
   * ball: {p, rot}; opts: {trail:[{p,a}], glow:{c1,c2,r}, squash}
   */
  function drawBall(ctx, cam, ball, opts) {
    opts = opts || {};
    const c = cam.project(ball.p);
    if (!c) return;
    const r = PK.Phys.BR * c.s;
    if (r < 0.8) return;
    // scia di movimento
    if (opts.trail && opts.trail.length) {
      let prev = null;
      opts.trail.forEach((tp, i) => {
        const q = cam.project(tp.p);
        if (!q) return;
        const rr = PK.Phys.BR * q.s;
        ctx.globalAlpha = tp.a;
        ctx.fillStyle = opts.trailColor || 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(q.x, q.y, rr * (0.55 + 0.4 * (i / opts.trail.length)), 0, 7);
        ctx.fill();
        if (prev) {
          ctx.strokeStyle = opts.trailColor || 'rgba(255,255,255,0.9)';
          ctx.lineWidth = rr * 1.1;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
        prev = q;
      });
      ctx.globalAlpha = 1;
    }
    if (opts.glow) {
      const g = ctx.createRadialGradient(c.x, c.y, r * 0.6, c.x, c.y, r * (opts.glow.r || 3.4));
      g.addColorStop(0, opts.glow.c1);
      g.addColorStop(1, opts.glow.c2);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r * (opts.glow.r || 3.4), 0, 7);
      ctx.fill();
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, 7);
    ctx.clip();
    // base chiara con luce da sinistra-alto
    const g = ctx.createRadialGradient(c.x - r * 0.35, c.y - r * 0.4, r * 0.1, c.x, c.y, r * 1.05);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.55, '#e4e9f2');
    g.addColorStop(1, '#8e99b2');
    ctx.fillStyle = g;
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    const toCam = M.norm(M.sub(cam.pos, ball.p));
    const R = ball.rot || mat.ident();
    const sv = BallGeo.verts.map((v) => {
      const w = mat.apply(R, v);
      return { x: c.x + M.dot(w, cam.right) * r, y: c.y - M.dot(w, cam.up) * r, f: M.dot(w, toCam) };
    });
    // cuciture
    ctx.strokeStyle = 'rgba(30,38,60,0.5)';
    ctx.lineWidth = Math.max(0.6, r * 0.05);
    ctx.beginPath();
    BallGeo.edges.forEach(([i, j]) => {
      if (sv[i].f > -0.1 || sv[j].f > -0.1) { ctx.moveTo(sv[i].x, sv[i].y); ctx.lineTo(sv[j].x, sv[j].y); }
    });
    ctx.stroke();
    // pentagoni neri
    ctx.fillStyle = '#12151f';
    BallGeo.pent.forEach((p) => {
      const pts = p.idx.map((i) => sv[i]);
      const cf = (pts[0].f + pts[1].f + pts[2].f + pts[3].f + pts[4].f) / 5;
      if (cf < -0.12) return;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < 5; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.fill();
    });
    // ombreggiatura e riflesso
    const sh = ctx.createRadialGradient(c.x - r * 0.3, c.y - r * 0.35, r * 0.2, c.x, c.y, r);
    sh.addColorStop(0, 'rgba(255,255,255,0)');
    sh.addColorStop(0.7, 'rgba(10,15,40,0.06)');
    sh.addColorStop(1, 'rgba(10,15,40,0.5)');
    ctx.fillStyle = sh;
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.ellipse(c.x - r * 0.38, c.y - r * 0.42, r * 0.2, r * 0.12, -0.7, 0, 7);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = Math.max(0.8, r * 0.07);
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, 7);
    ctx.stroke();
  }

  function drawBallShadow(ctx, cam, ball) {
    const h = Math.max(0, ball.p.y - PK.Phys.BR);
    const a = 0.34 / (1 + h * 1.2);
    PK.Stadium.groundShadow(ctx, cam, ball.p.x + h * 0.15, ball.p.z + h * 0.1, 0.16 + h * 0.06, 0.16 + h * 0.06, a);
  }

  // ------------------------------------------------------------------ personaggi
  function capsule(ctx, pa, pb, w, fill, ol, hi) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = w + ol * 2;
    ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
    ctx.strokeStyle = fill;
    ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
    if (hi !== false && w > 5) {
      ctx.strokeStyle = M.shade(fill, 0.28);
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = w * 0.28;
      const ox = -w * 0.18, oy = -w * 0.14;
      ctx.beginPath(); ctx.moveTo(pa.x + ox, pa.y + oy); ctx.lineTo(pb.x + ox, pb.y + oy); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function hairShape(ctx, style, front) {
    // coordinate locali: testa = cerchio unitario
    if (style === 1) {
      // spuntoni stile anime
      ctx.beginPath();
      const n = 7;
      for (let i = 0; i <= n; i++) {
        const a = Math.PI * (1.05 + (0.9 * i) / n);
        const rIn = 0.98, rOut = 1.55 + (i % 2 ? 0.0 : 0.22);
        if (i === 0) ctx.moveTo(Math.cos(a) * rIn, Math.sin(a) * rIn);
        const am = Math.PI * (1.05 + (0.9 * (i + 0.5)) / n);
        ctx.lineTo(Math.cos(am) * rOut, Math.sin(am) * rOut);
        const an = Math.PI * (1.05 + (0.9 * (i + 1)) / n);
        ctx.lineTo(Math.cos(an) * rIn, Math.sin(an) * rIn);
      }
      ctx.closePath();
    } else if (style === 2) {
      ctx.beginPath();
      ctx.arc(0, -0.12, 1.28, 0, 7);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, style === 3 ? 1.03 : 1.1, Math.PI * 0.95, Math.PI * 2.05);
      ctx.quadraticCurveTo(0.5, front ? -0.55 : -0.2, 0, front ? -0.5 : -0.3);
      ctx.quadraticCurveTo(-0.5, front ? -0.55 : -0.2, -1.05, -0.2);
      ctx.closePath();
    }
  }

  function drawHead(ctx, cam, sk, L) {
    const hc = cam.project(sk.head);
    if (!hc) return;
    const r = 0.125 * sk.sc * 1.14 * hc.s;
    const toCam = M.norm(M.sub(cam.pos, sk.head));
    const facing = M.dot(sk.headFwd, toCam);
    const u = M.dot(sk.headFwd, cam.right), v = M.dot(sk.headFwd, cam.up);
    const upx = M.dot(sk.headUp, cam.right), upy = M.dot(sk.headUp, cam.up);
    const roll = Math.atan2(upx, upy);
    const ol = Math.max(1, r * 0.09);
    ctx.save();
    ctx.translate(hc.x, hc.y);
    ctx.rotate(roll);
    ctx.lineJoin = 'round';
    const front = facing > 0.0;
    // capelli dietro (afro / lunghi)
    if (L.hairStyle === 2) {
      ctx.save(); ctx.scale(r, r);
      hairShape(ctx, 2, front);
      ctx.fillStyle = L.hair; ctx.fill();
      ctx.lineWidth = ol / r; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.restore();
    }
    // cranio
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7);
    ctx.fillStyle = L.skin; ctx.fill();
    ctx.lineWidth = ol; ctx.strokeStyle = OUT; ctx.stroke();
    if (!front) {
      // retro della testa: capelli
      ctx.beginPath(); ctx.arc(0, 0, r * 0.96, 0, 7);
      ctx.fillStyle = L.hairStyle === 3 ? M.mix(L.skin, L.hair, 0.55) : L.hair; ctx.fill();
      if (L.hairStyle === 1) {
        ctx.save(); ctx.scale(r, r); hairShape(ctx, 1, false);
        ctx.fillStyle = L.hair; ctx.fill(); ctx.lineWidth = ol / r; ctx.strokeStyle = OUT; ctx.stroke(); ctx.restore();
      }
      ctx.restore();
      return;
    }
    // volto: si sposta/stringe in base alla rotazione della testa
    ctx.restore();
    ctx.save();
    ctx.translate(hc.x + u * r * 0.55, hc.y - v * r * 0.55);
    ctx.rotate(roll);
    const sq = Math.sqrt(Math.max(0.2, 1 - u * u * 0.8));
    ctx.scale(sq, 1);
    const ex = 0.38 * r, ey = 0.04 * r;
    const expr = L.expr || 'normal';
    [-1, 1].forEach((sg) => {
      ctx.beginPath();
      ctx.ellipse(sg * ex, ey, r * 0.22, expr === 'focus' ? r * 0.15 : r * 0.2, 0, 0, 7);
      ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.lineWidth = ol * 0.8; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.beginPath();
      ctx.arc(sg * ex + u * r * 0.06, ey + (v < 0 ? -v : 0) * r * 0.08, r * 0.125, 0, 7);
      ctx.fillStyle = L.eye || '#2a1b10'; ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(sg * ex - r * 0.04 + u * r * 0.06, ey - r * 0.05, r * 0.045, 0, 7); ctx.fill();
      // sopracciglio
      ctx.strokeStyle = M.shade(L.hair, -0.3); ctx.lineWidth = Math.max(1.2, r * 0.1); ctx.lineCap = 'round';
      ctx.beginPath();
      const by = -r * 0.3;
      if (expr === 'focus' || expr === 'shout') { ctx.moveTo(sg * ex * 1.6, by - r * 0.1); ctx.lineTo(sg * ex * 0.35, by + r * 0.06); }
      else if (expr === 'sad') { ctx.moveTo(sg * ex * 1.6, by + r * 0.06); ctx.lineTo(sg * ex * 0.35, by - r * 0.1); }
      else { ctx.moveTo(sg * ex * 1.5, by); ctx.lineTo(sg * ex * 0.4, by - r * 0.02); }
      ctx.stroke();
    });
    // bocca
    ctx.strokeStyle = '#3a1410'; ctx.lineWidth = Math.max(1, r * 0.07);
    ctx.beginPath();
    if (expr === 'shout') { ctx.ellipse(0, r * 0.52, r * 0.2, r * 0.17, 0, 0, 7); ctx.fillStyle = '#5a1418'; ctx.fill(); }
    else if (expr === 'focus') { ctx.moveTo(-r * 0.15, r * 0.5); ctx.lineTo(r * 0.15, r * 0.5); }
    else if (expr === 'sad') { ctx.arc(0, r * 0.68, r * 0.17, Math.PI * 1.15, Math.PI * 1.85); }
    else { ctx.arc(0, r * 0.4, r * 0.17, Math.PI * 0.2, Math.PI * 0.8); }
    ctx.stroke();
    ctx.restore();
    // capelli frontali
    ctx.save();
    ctx.translate(hc.x, hc.y); ctx.rotate(roll); ctx.scale(r, r);
    if (L.hairStyle !== 2) hairShape(ctx, L.hairStyle, true);
    else { ctx.beginPath(); ctx.arc(0, -0.45, 0.9, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); }
    ctx.fillStyle = L.hairStyle === 3 ? M.mix(L.skin, L.hair, 0.5) : L.hair;
    ctx.fill(); ctx.lineWidth = ol / r; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.restore();
  }

  /**
   * Disegna un personaggio (scheletro risolto `sk`). L: {skin,hair,hairStyle,shirt,trim,shorts,socks,boots,gloves,number,name,expr,eye}
   */
  function drawHumanoid(ctx, cam, sk, L) {
    const P = (p) => cam.project(p);
    const pel = P(sk.pelvis);
    if (!pel) return;
    const ol = M.clamp(pel.s * 0.012, 1, 3.2);
    const items = [];
    const cap = (a, b, rM, fill, hi) => {
      const pa = P(a), pb = P(b);
      if (!pa || !pb) return;
      const it = { z: (pa.z + pb.z) / 2, fn: () => capsule(ctx, pa, pb, rM * 2 * ((pa.s + pb.s) / 2), fill, ol, hi) };
      items.push(it);
      return it;
    };
    const lerp3 = M.lerp3;
    const s = sk.sc;
    const boots = L.boots || '#15171f';
    // gambe
    [['R', sk.hipR, sk.kneeR, sk.ankleR, sk.toeR], ['L', sk.hipL, sk.kneeL, sk.ankleL, sk.toeL]].forEach(([, hip, knee, ank, toe]) => {
      const mid = lerp3(hip, knee, 0.56);
      cap(hip, mid, 0.105 * s, L.shorts);
      cap(mid, knee, 0.082 * s, L.skin);
      cap(knee, ank, 0.07 * s, L.socks);
      cap(lerp3(knee, ank, 0.04), lerp3(knee, ank, 0.2), 0.074 * s, L.trim || L.socks, false);
      cap(ank, toe, 0.06 * s, boots);
    });
    // bacino/pantaloncini
    cap(sk.hipL, sk.hipR, 0.115 * s, L.shorts);
    // busto
    const pS = [sk.shoulderL, sk.shoulderR, lerp3(sk.hipR, sk.chest, 0.1), lerp3(sk.hipL, sk.chest, 0.1)].map(P);
    const pc = P(sk.chest);
    if (pS.every(Boolean) && pc) {
      const wpx = 0.1 * s * pc.s;
      const toCam = M.norm(M.sub(cam.pos, sk.chest));
      const fwd = mat.apply(sk.Rc, { x: 0, y: 0, z: 1 });
      const frontView = M.dot(fwd, toCam) > 0;
      items.push({
        z: pc.z + 0.02,
        fn: () => {
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(pS[0].x, pS[0].y); ctx.lineTo(pS[1].x, pS[1].y); ctx.lineTo(pS[2].x, pS[2].y); ctx.lineTo(pS[3].x, pS[3].y); ctx.closePath();
          ctx.strokeStyle = OUT; ctx.lineWidth = wpx * 2 + ol * 2; ctx.stroke();
          ctx.fillStyle = L.shirt; ctx.fill();
          ctx.strokeStyle = L.shirt; ctx.lineWidth = wpx * 2; ctx.stroke();
          // bande laterali + riflesso
          ctx.strokeStyle = M.shade(L.shirt, 0.22); ctx.globalAlpha = 0.45; ctx.lineWidth = wpx * 0.7;
          ctx.beginPath(); ctx.moveTo(pS[0].x + wpx * 0.5, pS[0].y); ctx.lineTo(pS[3].x + wpx * 0.5, pS[3].y); ctx.stroke();
          ctx.globalAlpha = 1;
          if (L.trim) {
            ctx.strokeStyle = L.trim; ctx.lineWidth = Math.max(1.2, wpx * 0.22);
            ctx.beginPath(); ctx.moveTo(pS[0].x, pS[0].y); ctx.lineTo(pS[1].x, pS[1].y); ctx.stroke();
          }
          // numero sulla schiena / sul petto
          const right = mat.apply(sk.Rc, { x: 1, y: 0, z: 0 });
          const up = mat.apply(sk.Rc, { x: 0, y: 1, z: 0 });
          const o = M.addS(M.addS(sk.pelvis, up, 0.3 * s), fwd, frontView ? 0.1 : -0.1);
          const p0 = cam.project(o), p1 = cam.project(M.add(o, right));
          const sign = p0 && p1 && p1.x - p0.x < 0 ? -1 : 1;
          const ax = M.mul(right, 0.01 * sign), ay = M.mul(up, 0.01);
          if (!frontView && L.number != null) {
            cam.onPlane(ctx, o, ax, ay, () => {
              ctx.scale(1, -1);
              ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.lineWidth = 3; ctx.strokeStyle = OUT;
              ctx.font = '900 24px Impact, "Arial Black", sans-serif';
              ctx.fillStyle = L.trim || '#fff';
              ctx.strokeText(String(L.number), 0, 0); ctx.fillText(String(L.number), 0, 0);
              if (L.name) { ctx.font = '700 8.5px "Arial Black", sans-serif'; ctx.fillText(L.name.toUpperCase().slice(0, 11), 0, -21); }
            });
          } else if (frontView) {
            cam.onPlane(ctx, o, ax, ay, () => {
              ctx.scale(1, -1);
              ctx.beginPath(); ctx.arc(-6 * sign, -8, 2.8, 0, 7);
              ctx.fillStyle = L.trim || '#fff'; ctx.globalAlpha = 0.8; ctx.fill(); ctx.globalAlpha = 1;
            });
          }
        },
      });
    }
    // braccia
    [['R', sk.shoulderR, sk.elbowR, sk.wristR, sk.handTipR], ['L', sk.shoulderL, sk.elbowL, sk.wristL, sk.handTipL]].forEach(([, sh, el, wr, tip]) => {
      const mid = lerp3(sh, el, 0.62);
      cap(sh, mid, 0.066 * s, L.shirt);
      cap(mid, el, 0.052 * s, L.skin);
      cap(el, wr, 0.05 * s, L.skin);
      if (L.gloves) {
        cap(wr, tip, 0.088 * s, L.gloves);
        cap(lerp3(wr, tip, 0.1), lerp3(wr, tip, 0.35), 0.092 * s, '#ffffff', false);
      } else cap(wr, tip, 0.052 * s, L.skin);
    });
    // collo
    const neckIt = cap(sk.chest, sk.neck, 0.05 * s, L.skin);
    if (neckIt) neckIt.z += 0.35; // il collo sta sempre dietro la testa e sopra al busto
    // testa
    const ph = P(sk.head);
    if (ph) items.push({ z: ph.z - 0.01, fn: () => drawHead(ctx, cam, sk, L) });
    items.sort((a, b) => b.z - a.z);
    for (const it of items) it.fn();
  }

  /** Ombra a terra dei personaggi: proiezione verticale dei segmenti */
  function drawHumanoidShadow(ctx, cam, sk, alpha) {
    const g = (p) => cam.project({ x: p.x + p.y * 0.12, y: 0.004, z: p.z + p.y * 0.1 });
    const segs = [[sk.hipR, sk.kneeR], [sk.kneeR, sk.ankleR], [sk.ankleR, sk.toeR], [sk.hipL, sk.kneeL], [sk.kneeL, sk.ankleL], [sk.ankleL, sk.toeL],
      [sk.pelvis, sk.chest], [sk.shoulderL, sk.shoulderR], [sk.shoulderR, sk.elbowR], [sk.elbowR, sk.wristR], [sk.shoulderL, sk.elbowL], [sk.elbowL, sk.wristL], [sk.chest, sk.head], [sk.hipL, sk.hipR]];
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(0,12,6,${alpha || 0.3})`;
    segs.forEach(([a, b]) => {
      const pa = g(a), pb = g(b);
      if (!pa || !pb) return;
      ctx.lineWidth = Math.max(2, 0.14 * ((pa.s + pb.s) / 2) * 0.5);
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
    });
    ctx.restore();
  }

  PK.Chars = { drawBall, drawBallShadow, drawHumanoid, drawHumanoidShadow, BallGeo };
  if (typeof module !== 'undefined' && module.exports) module.exports = PK;
})(typeof window !== 'undefined' ? window : globalThis);
