/*
 * SIMSOC 6 (remake) - 2D match view
 * A top-down pitch in the classic manager-game style: 22 shirts in their
 * formation shape, a ball that is passed around, and attacks / shots / goals
 * choreographed from the live engine's minute-by-minute events. Pure canvas;
 * the UI feeds it one simulated minute at a time.
 */
;(function (root) {
  'use strict';
  const PW = 105, PH = 68;                          // pitch in metres
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const SHOTS = { goal: 1, saved: 1, wide: 1, blocked: 1, pen_saved: 1, pen_miss: 1 };

  function create(canvas, cfg) {
    const ctx = canvas.getContext('2d');
    const Live = root.SimSocLive;
    let W = 0, H = 0, dpr = 1, scale = 1, ox = 0, oy = 0;
    function resize() {
      dpr = Math.min(2, root.devicePixelRatio || 1);
      const cw = canvas.clientWidth || 700, ch = Math.round(cw * PH / PW);
      canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
      W = canvas.width; H = canvas.height;
      const m = 3.2;                                  // margin (m) around the touchlines
      scale = Math.min(W / (PW + m * 2), H / (PH + m * 2));
      ox = (W - PW * scale) / 2; oy = (H - PH * scale) / 2;
    }
    resize();
    const X = x => ox + x * scale, Y = y => oy + y * scale;

    function team(side, c) {
      const lay = Live.layout(c.formation || '442');
      return {
        side: side, kit: c.kit || ['#c00', '#fff'], gkKit: side === 'home' ? '#f2c94c' : '#56ccf2',
        players: lay.map((L, i) => {
          const bx = side === 'home' ? 3 + L.x * 70 : PW - 3 - L.x * 70, by = L.y * PH;
          return { slot: i, role: L.role, lx: L.x, ly: L.y, x: bx, y: by, tx: bx, ty: by, num: i + 1, name: '', off: false, jx: Math.random() * 6, jy: Math.random() * 6 };
        })
      };
    }
    const T = { home: team('home', cfg.home || {}), away: team('away', cfg.away || {}) };
    const ball = { x: PW / 2, y: PH / 2, z: 0, path: [], t0: 0, carrier: null };
    let poss = 'home', running = true, raf = 0, last = 0, flash = null, celebrate = 0, frozen = false;

    /* ---- shape: where each player wants to be ---------------------- */
    function targets(dt) {
      ['home', 'away'].forEach(side => {
        const tm = T[side], dir = side === 'home' ? 1 : -1, inPoss = poss === side;
        const bxRel = side === 'home' ? ball.x : PW - ball.x;          // ball distance from this team's goal
        const push = inPoss ? clamp((bxRel - 35) * 0.55 + 6, -4, 26) : clamp((bxRel - 52) * 0.35 - 3, -9, 12);
        tm.players.forEach(p => {
          if (p.off) return;
          p.jx += dt * 1.3; p.jy += dt * 1.1;
          let xRel = 3 + p.lx * 70 + (p.role === 'G' ? clamp(push * 0.18, -1, 6) : push * (p.role === 'D' ? 0.8 : p.role === 'M' ? 1 : 1.05));
          const floor = { G: 2, D: 12, M: 24, A: 36 }[p.role] || 10;     // the shape never collapses onto the goal line
          xRel = Math.max(floor, xRel);
          let y = p.ly * PH;
          y = lerp(y, ball.y, p.role === 'G' ? 0.12 : inPoss ? 0.1 : 0.22);
          xRel = clamp(xRel, 1.5, PW - 2);
          let tx = side === 'home' ? xRel : PW - xRel;
          // the two nearest out-of-possession players press the ball
          p.tx = tx + Math.sin(p.jx) * 1.4; p.ty = clamp(y + Math.cos(p.jy) * 1.4, 1, PH - 1);
        });
        if (!inPoss) {
          const near = tm.players.filter(p => !p.off && p.role !== 'G').sort((a, b) => d2(a, ball) - d2(b, ball)).slice(0, 2);
          near.forEach((p, k) => { p.tx = lerp(p.tx, ball.x - dir * (k ? 4 : 1.5), 0.7); p.ty = lerp(p.ty, ball.y + (k ? 3 : 0), 0.7); });
        }
        if (ball.carrier && ball.carrier.side === side) {
          const c = ball.carrier.p; c.tx = ball.x - dir * 0.8; c.ty = ball.y;
        }
      });
    }
    function d2(a, b) { return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y); }
    function pickMate(side, zoneX, zoneY) {
      const ps = T[side].players.filter(p => !p.off && p.role !== 'G');
      if (!ps.length) return null;
      let best = null, bd = 1e9;
      ps.forEach(p => { const d = (p.x - zoneX) ** 2 + (p.y - zoneY) ** 2 + Math.random() * 120; if (d < bd) { bd = d; best = p; } });
      return best;
    }

    /* ---- ball choreography for one simulated minute ------------------ */
    function planMinute(info) {
      const dur = Math.max(250, info.duration || 1000);
      if (info.poss) poss = info.poss;
      const evs = info.events || [];
      const shot = evs.find(e => SHOTS[e.type]);
      const pts = [];
      const side = shot ? shot.side : poss;
      const dir = side === 'home' ? 1 : -1;
      const goalX = side === 'home' ? PW : 0;
      if (celebrate > 0) { celebrate--; resetCentre(); return; }
      if (evs.some(e => e.type === 'ko' || e.type === 'ht' || e.type === 'et')) resetCentre();
      if (shot) {
        poss = side;
        const n1 = pickMate(side, lerp(ball.x, goalX, 0.45), lerp(ball.y, PH / 2, 0.4));
        const n2 = pickMate(side, goalX - dir * 16, PH / 2 + (Math.random() - 0.5) * 22);
        if (n1) pts.push({ x: n1.x, y: n1.y, p: n1, side: side });
        if (n2) pts.push({ x: goalX - dir * (shot.type === 'goal' && /pen/.test(shot.type) ? 11 : 14 + Math.random() * 8), y: PH / 2 + (Math.random() - 0.5) * 20, p: n2, side: side });
        const gy = PH / 2 + (Math.random() - 0.5) * 6;
        if (shot.type === 'goal') pts.push({ x: goalX + dir * 1.4, y: gy, shot: true, goal: true });
        else if (shot.type === 'saved' || shot.type === 'pen_saved') pts.push({ x: goalX - dir * 1.5, y: gy, shot: true, save: true });
        else if (shot.type === 'blocked') pts.push({ x: goalX - dir * 20, y: PH / 2 + (Math.random() - 0.5) * 16, shot: true });
        else pts.push({ x: goalX + dir * 2.5, y: PH / 2 + (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 5), shot: true });
        if (shot.type === 'goal') { celebrate = 1; flash = { side: side, t: 0 }; }
      } else {
        const hops = 2 + Math.floor(Math.random() * 2);
        let zx = ball.x, zy = ball.y;
        for (let i = 0; i < hops; i++) {
          zx = clamp(zx + dir * (4 + Math.random() * 12) * (info.attack ? 1.6 : 1), 8, PW - 8); zy = clamp(zy + (Math.random() - 0.5) * 26, 6, PH - 6);
          const m = pickMate(poss, zx, zy);
          if (m) pts.push({ x: m.x, y: m.y, p: m, side: poss });
        }
        if (evs.some(e => e.type === 'corner')) { const cs = evs.find(e => e.type === 'corner').side; const gx = cs === 'home' ? PW - 0.5 : 0.5; pts.push({ x: gx, y: Math.random() < 0.5 ? 0.5 : PH - 0.5 }); }
      }
      // schedule
      const now = performance.now();
      let t = now;
      const seg = dur / Math.max(1, pts.length);
      ball.path = pts.map(p => { t += seg; return Object.assign(p, { at: t, from: null }); });
      ball.t0 = now;
    }
    function resetCentre() { ball.x = PW / 2; ball.y = PH / 2; ball.path = []; ball.carrier = null; }

    function stepBall(now) {
      if (!ball.path.length) return;
      const p = ball.path[0];
      if (!p.from) p.from = { x: ball.x, y: ball.y, t: ball.t0 };
      const k = clamp((now - p.from.t) / Math.max(1, p.at - p.from.t), 0, 1), e = ease(k);
      const tx = p.p ? p.p.x : p.x, ty = p.p ? p.p.y : p.y;
      ball.x = lerp(p.from.x, tx, e); ball.y = lerp(p.from.y, ty, e);
      ball.z = p.shot ? Math.sin(Math.PI * k) * 1.2 : Math.sin(Math.PI * k) * 0.4;
      if (k >= 1) {
        ball.path.shift();
        ball.carrier = p.p ? { p: p.p, side: p.side } : null;
        if (ball.path[0]) ball.path[0].from = { x: ball.x, y: ball.y, t: now };
        ball.t0 = now;
      }
    }

    /* ---- drawing -------------------------------------------------- */
    function drawPitch() {
      const g = ctx;
      g.fillStyle = '#16602c'; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 12; i++) {
        g.fillStyle = i % 2 ? '#1d7436' : '#1a6b31';
        g.fillRect(X(i * PW / 12), Y(0), PW / 12 * scale + 1, PH * scale);
      }
      g.strokeStyle = 'rgba(255,255,255,.82)'; g.lineWidth = Math.max(1.5, scale * 0.14);
      g.strokeRect(X(0), Y(0), PW * scale, PH * scale);
      g.beginPath(); g.moveTo(X(PW / 2), Y(0)); g.lineTo(X(PW / 2), Y(PH)); g.stroke();
      g.beginPath(); g.arc(X(PW / 2), Y(PH / 2), 9.15 * scale, 0, Math.PI * 2); g.stroke();
      dot(PW / 2, PH / 2, 0.35);
      [0, 1].forEach(s => {
        const x0 = s ? PW : 0, d = s ? -1 : 1;
        g.strokeRect(X(Math.min(x0, x0 + d * 16.5)), Y(PH / 2 - 20.16), 16.5 * scale, 40.32 * scale);
        g.strokeRect(X(Math.min(x0, x0 + d * 5.5)), Y(PH / 2 - 9.16), 5.5 * scale, 18.32 * scale);
        dot(x0 + d * 11, PH / 2, 0.3);
        g.beginPath(); g.arc(X(x0 + d * 11), Y(PH / 2), 9.15 * scale, s ? Math.PI - 0.93 : -0.93, s ? Math.PI + 0.93 : 0.93); g.stroke();
        g.save(); g.lineWidth = Math.max(2, scale * 0.25); g.strokeStyle = '#fff';
        g.strokeRect(X(s ? PW : -2), Y(PH / 2 - 3.66), 2 * scale, 7.32 * scale); g.restore();
      });
    }
    function dot(x, y, r) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(X(x), Y(y), r * scale, 0, Math.PI * 2); ctx.fill(); }
    function drawPlayer(tm, p) {
      if (p.off) return;
      const r = Math.max(6, 1.55 * scale), x = X(p.x), y = Y(p.y);
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x + r * 0.25, y + r * 0.35, r, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      const isG = p.role === 'G';
      ctx.fillStyle = isG ? tm.gkKit : tm.kit[0];
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = Math.max(1.4, r * 0.22); ctx.strokeStyle = isG ? '#111' : tm.kit[1]; ctx.stroke();
      ctx.fillStyle = isG ? '#111' : tm.kit[1];
      ctx.font = '700 ' + Math.round(r * 1.05) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(p.num), x, y + 0.5);
      if (ball.carrier && ball.carrier.p === p && p.name) {
        ctx.font = '600 ' + Math.round(r * 1.05) + 'px system-ui, sans-serif';
        const tw = ctx.measureText(p.name).width + 8;
        ctx.fillStyle = 'rgba(6,12,22,.78)'; ctx.fillRect(x - tw / 2, y - r * 2.9, tw, r * 1.5);
        ctx.fillStyle = '#fff'; ctx.fillText(p.name, x, y - r * 2.15);
      }
    }
    function drawBall() {
      const r = Math.max(3, 0.55 * scale), x = X(ball.x), y = Y(ball.y);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x + ball.z * scale * 0.4, y + r * 0.6 + ball.z * scale * 0.3, r, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y - ball.z * scale * 0.6, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#222'; ctx.lineWidth = 1; ctx.stroke();
    }
    function draw() {
      drawPitch();
      T.home.players.forEach(p => drawPlayer(T.home, p));
      T.away.players.forEach(p => drawPlayer(T.away, p));
      drawBall();
      if (frozen) {
        ctx.fillStyle = 'rgba(6,12,22,.55)'; ctx.fillRect(0, H / 2 - 28 * dpr, W, 56 * dpr);
        ctx.fillStyle = '#fff'; ctx.font = '800 ' + Math.round(26 * dpr) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(frozen, W / 2, H / 2);
      }
    }
    function frame(ts) {
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016; last = ts;
      if (running && !frozen) {
        stepBall(ts);
        targets(dt);
        const sp = Math.min(1, dt * 3.2);
        ['home', 'away'].forEach(s => T[s].players.forEach(p => { p.x = lerp(p.x, p.tx, sp); p.y = lerp(p.y, p.ty, sp); }));
      }
      draw();
      raf = root.requestAnimationFrame(frame);
    }
    raf = root.requestAnimationFrame(frame);
    const onResize = () => resize();
    root.addEventListener('resize', onResize);

    return {
      setPlayers(side, list) {
        const tm = T[side];
        tm.players.forEach(p => { p.off = true; });
        list.forEach(lp => {
          const p = tm.players[lp.slot];
          if (!p) return;
          if (lp.role && lp.role !== p.role) p.role = lp.role;
          p.off = !!lp.off; p.num = lp.num != null ? lp.num : p.num; p.name = lp.name || p.name;
        });
      },
      minute(info) { if (!frozen) planMinute(info); },
      freeze(text) { frozen = text || false; },
      setRunning(v) { running = !!v; },
      flash() { const f = flash; flash = null; return f; },
      destroy() { root.cancelAnimationFrame(raf); root.removeEventListener('resize', onResize); }
    };
  }
  root.SimSocPitch = { create: create };
})(typeof self !== 'undefined' ? self : this);
