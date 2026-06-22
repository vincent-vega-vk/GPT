/*
 * SIMSOC 6 (remake) - match animation
 * Plays out a pre-simulated match (the engine fixes the scoreline and the
 * goal timeline; this is the "fully automated" view where the manager only
 * controls speed and substitutions). Pure canvas, no DOM access - it talks
 * back through callbacks supplied by the UI.
 */
;(function (root) {
  'use strict';

  function rand(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  function create(canvas, match, cb) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const mx = 28, my = 26, topStand = 22;          // pitch insets + crowd band
    const F = { x0: mx, y0: my + topStand, x1: W - mx, y1: H - my };
    const midY = (F.y0 + F.y1) / 2;

    // home/away name pools for commentary + sprites
    const homeIsUser = match.home;
    const homeNames = (homeIsUser ? match.userPlayers : match.oppPlayers).map(p => p.forename + ' ' + p.surname);
    const awayNames = (homeIsUser ? match.oppPlayers : match.userPlayers).map(p => p.forename + ' ' + p.surname);

    // build sprite formations (home attacks right, away attacks left)
    function buildTeam(side, names) {
      const dir = side === 'home' ? 1 : -1;
      const goalX = side === 'home' ? F.x0 + 10 : F.x1 - 10;
      const slots = [
        { rx: 0.04, ry: 0.5, role: 'G' },
        { rx: 0.20, ry: 0.20, role: 'D' }, { rx: 0.20, ry: 0.42, role: 'D' },
        { rx: 0.20, ry: 0.58, role: 'D' }, { rx: 0.20, ry: 0.80, role: 'D' },
        { rx: 0.42, ry: 0.22, role: 'M' }, { rx: 0.42, ry: 0.42, role: 'M' },
        { rx: 0.42, ry: 0.58, role: 'M' }, { rx: 0.42, ry: 0.78, role: 'M' },
        { rx: 0.62, ry: 0.36, role: 'A' }, { rx: 0.62, ry: 0.64, role: 'A' }
      ];
      const pull = { G: 0.02, D: 0.16, M: 0.32, A: 0.5 };
      return slots.map((s, i) => {
        const rx = side === 'home' ? s.rx : (1 - s.rx);
        const bx = lerp(F.x0, F.x1, rx);
        const by = lerp(F.y0, F.y1, s.ry);
        return {
          side, role: s.role, name: names[i] || ('Player ' + (i + 1)),
          x: bx, y: by, bx, by, dir, goalX, pull: pull[s.role],
          jx: rand(0, 6.28), jy: rand(0, 6.28)
        };
      });
    }
    const home = buildTeam('home', homeNames);
    const away = buildTeam('away', awayNames);
    const all = home.concat(away);

    const ball = { x: (F.x0 + F.x1) / 2, y: midY, tx: (F.x0 + F.x1) / 2, ty: midY };
    let possession = Math.random() < 0.5 ? 'home' : 'away';
    let carrier = null;

    // state
    let minute = 0, hg = 0, ag = 0, fired = 0, speed = 5, running = true, finished = false, celebrate = false;
    let flash = null;            // { text, t }
    let raf = 0, last = 0;
    const events = match.events.slice().sort((a, b) => a.minute - b.minute);

    /* ---- drawing ----------------------------------------------------- */
    function drawPitch() {
      // crowd band
      ctx.fillStyle = '#6b6b6b'; ctx.fillRect(0, 0, W, my + topStand);
      for (let r = 0; r < 3; r++) {
        for (let x = 6; x < W - 6; x += 9) {
          const c = ['#c83737', '#d6d6d6', '#3a6fd6', '#d6c23a'][(x + r) % 4];
          ctx.fillStyle = c; ctx.fillRect(x, 4 + r * 7, 6, 5);
        }
      }
      // grass + mow stripes
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = i % 2 ? '#27a127' : '#239523';
        const x = lerp(F.x0, F.x1, i / 10), x2 = lerp(F.x0, F.x1, (i + 1) / 10);
        ctx.fillRect(x, F.y0, x2 - x + 1, F.y1 - F.y0);
      }
      // markings
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2;
      ctx.strokeRect(F.x0, F.y0, F.x1 - F.x0, F.y1 - F.y0);
      ctx.beginPath(); ctx.moveTo((F.x0 + F.x1) / 2, F.y0); ctx.lineTo((F.x0 + F.x1) / 2, F.y1); ctx.stroke();
      ctx.beginPath(); ctx.arc((F.x0 + F.x1) / 2, midY, 26, 0, 6.2832); ctx.stroke();
      const boxH = (F.y1 - F.y0) * 0.5, boxW = 42;
      ctx.strokeRect(F.x0, midY - boxH / 2, boxW, boxH);
      ctx.strokeRect(F.x1 - boxW, midY - boxH / 2, boxW, boxH);
      // goals
      ctx.lineWidth = 3; ctx.strokeStyle = '#fff';
      ctx.strokeRect(F.x0 - 7, midY - 16, 7, 32);
      ctx.strokeRect(F.x1, midY - 16, 7, 32);
    }

    function drawPlayer(p) {
      const isKeeper = p.role === 'G';
      let shirt, head;
      if (p.side === 'home') { shirt = isKeeper ? '#1fa01f' : '#1840d0'; head = '#f0c89a'; }
      else { shirt = isKeeper ? '#e08a1f' : '#e8e8e8'; head = '#e0b488'; }
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 6, 5, 2.2, 0, 0, 6.28); ctx.fill();
      // body
      ctx.fillStyle = shirt; ctx.fillRect(p.x - 3, p.y - 3, 6, 8);
      if (p.side === 'home' && !isKeeper) { // stripes
        ctx.fillStyle = '#fff'; ctx.fillRect(p.x - 1, p.y - 3, 2, 8);
      }
      // head
      ctx.fillStyle = head; ctx.beginPath(); ctx.arc(p.x, p.y - 5, 2.4, 0, 6.28); ctx.fill();
      // carrier marker
      if (p === carrier) { ctx.strokeStyle = '#ff0'; ctx.lineWidth = 1; ctx.strokeRect(p.x - 4, p.y - 8, 8, 14); }
    }

    function drawBall() {
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(ball.x, ball.y + 3, 3, 1.4, 0, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ball.x, ball.y, 2.6, 0, 6.28); ctx.fill();
      ctx.strokeStyle = '#000'; ctx.lineWidth = .6; ctx.stroke();
    }

    function draw() {
      drawPitch();
      all.forEach(drawPlayer);
      drawBall();
      if (flash) {
        ctx.fillStyle = 'rgba(0,0,0,' + (0.45 * flash.t) + ')';
        ctx.fillRect(0, midY - 26, W, 52);
        ctx.fillStyle = 'rgba(255,255,0,' + flash.t + ')';
        ctx.font = 'bold 26px Tahoma'; ctx.textAlign = 'center';
        ctx.fillText(flash.text, W / 2, midY + 9);
        ctx.textAlign = 'left';
      }
    }

    /* ---- simulation of the cosmetic movement ------------------------- */
    function step(dt) {
      // choose ball carrier = possession-side player nearest the ball
      let best = 1e9; carrier = null;
      (possession === 'home' ? home : away).forEach(p => {
        if (p.role === 'G') return;
        const d = (p.x - ball.x) ** 2 + (p.y - ball.y) ** 2;
        if (d < best) { best = d; carrier = p; }
      });
      // when a goal is about to happen the scoring side drives at the right end (FM-style build-up)
      const nextEv = events[fired];
      const imminent = nextEv && nextEv.minute - minute < 1.5 && nextEv.minute - minute >= 0;
      if (imminent) {
        possession = nextEv.side;
        const dir = nextEv.side === 'home' ? 1 : -1;
        ball.tx = dir > 0 ? F.x1 - 10 : F.x0 + 10;
        ball.ty = midY + (Math.random() - 0.5) * 30;
      } else if (!celebrate && (Math.random() < 0.012 * speed || Math.abs(ball.x - ball.tx) + Math.abs(ball.y - ball.ty) < 6)) {
        const dir = possession === 'home' ? 1 : -1;
        const toGoal = Math.random() < 0.45;
        ball.tx = toGoal ? (dir > 0 ? F.x1 - 14 : F.x0 + 14) : rand(F.x0 + 20, F.x1 - 20);
        ball.ty = toGoal ? rand(midY - 30, midY + 30) : rand(F.y0 + 10, F.y1 - 10);
        if (Math.random() < 0.4) possession = possession === 'home' ? 'away' : 'home'; // turnover
      }
      const bs = 0.06 * speed;
      ball.x = lerp(ball.x, carrier ? lerp(ball.tx, carrier.x, 0.35) : ball.tx, bs);
      ball.y = lerp(ball.y, carrier ? lerp(ball.ty, carrier.y, 0.35) : ball.ty, bs);

      // players ease between formation base and the ball, with jitter
      all.forEach(p => {
        p.jx += dt * 2; p.jy += dt * 2.3;
        const pull = p.pull * (p.side === possession ? 1 : 0.7);
        let tx = lerp(p.bx, ball.x, pull) + Math.sin(p.jx) * 4;
        let ty = lerp(p.by, ball.y, pull) + Math.cos(p.jy) * 4;
        if (p.role === 'G') { tx = p.bx; ty = clamp(ball.y, midY - 18, midY + 18); }
        const sp = 0.05 * speed + 0.02;
        p.x = clamp(lerp(p.x, tx, sp), F.x0 - 6, F.x1 + 6);
        p.y = clamp(lerp(p.y, ty, sp), F.y0 - 4, F.y1 + 4);
      });
    }

    function triggerGoal(ev) {
      if (ev.side === 'home') hg++; else ag++;
      const dir = ev.side === 'home' ? 1 : -1;             // the goal that was attacked
      ball.x = dir > 0 ? F.x1 + 1 : F.x0 - 1;              // the ball nestles in the net
      ball.y = midY + (Math.random() - 0.5) * 18;
      ball.tx = ball.x; ball.ty = ball.y;
      celebrate = true;                                    // hold on the goal, then kick off
      flash = { text: 'GOAL!', t: 1.5, side: ev.side };
      cb.onScore && cb.onScore(ev.side, ev.scorer, ev.minute, hg, ag);
    }

    /* ---- timed colour: cards, injuries, automatic substitutions ------ */
    const cardsT = (match.cards || []).slice().sort((a, b) => a.minute - b.minute);
    const injT = (match.injuries || []).slice().sort((a, b) => a.minute - b.minute);
    const subT = (match.subs || []).slice().sort((a, b) => a.minute - b.minute);
    let fc = 0, fi = 0, fs = 0;
    function applySubSprite(sv) {
      const team = sv.side === 'home' ? home : away;
      const p = team.find(pl => pl.name === sv.off) || team.find(pl => pl.role !== 'G');
      if (p) p.name = sv.on;
    }
    function processTimed(mins) {
      while (fc < cardsT.length && cardsT[fc].minute <= mins) { cb.onCard && cb.onCard(cardsT[fc]); fc++; }
      while (fi < injT.length && injT[fi].minute <= mins) { cb.onInjury && cb.onInjury(injT[fi]); fi++; }
      while (fs < subT.length && subT[fs].minute <= mins) { applySubSprite(subT[fs]); cb.onSub && cb.onSub(subT[fs]); fs++; }
    }

    function drawFullTime() {
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, midY - 22, W, 44);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Tahoma'; ctx.textAlign = 'center';
      ctx.fillText('FULL TIME', W / 2, midY + 8); ctx.textAlign = 'left';
    }

    /* ---- main loop --------------------------------------------------- */
    function frame(ts) {
      if (!last) last = ts;
      let dt = (ts - last) / 1000; last = ts;
      dt = Math.min(dt, 0.05);

      if (running && !finished) {
        minute += dt * speed * 3.2;              // ~ full match in a sensible time
        if (minute > 90) minute = 90;
        while (fired < events.length && events[fired].minute <= minute) { triggerGoal(events[fired]); fired++; }
        processTimed(minute);
        cb.onMinute && cb.onMinute(minute);
        if (carrier) {
          const opp = (carrier.side === 'home' ? away : home);
          let nb = 1e9, on = null;
          opp.forEach(p => { const d = (p.x - ball.x) ** 2 + (p.y - ball.y) ** 2; if (d < nb) { nb = d; on = p; } });
          cb.onBall && cb.onBall(
            carrier.side === 'home' ? carrier.name : (on && on.name),
            carrier.side === 'away' ? carrier.name : (on && on.name)
          );
        }
        if (minute >= 90) finish();
      }
      if (!finished) {                            // freeze the players once the whistle goes
        step(dt);
        if (flash) {
          flash.t -= dt * 1.1;
          if (flash.t <= 0) {
            if (celebrate) {                                   // restart from the centre, conceding side kicks off
              possession = flash.side === 'home' ? 'away' : 'home';
              ball.x = (F.x0 + F.x1) / 2; ball.y = midY; ball.tx = ball.x; ball.ty = midY; celebrate = false;
            }
            flash = null;
          }
        }
        draw();
        raf = requestAnimationFrame(frame);
      } else {
        draw(); drawFullTime();                   // one final, static frame
      }
    }

    function finish() {
      if (finished) return;
      finished = true; running = false;
      while (fired < events.length) { triggerGoal(events[fired]); fired++; }   // sync score to engine
      processTimed(90);                                                        // flush remaining events
      minute = 90;
      cb.onMinute && cb.onMinute(90);
      draw(); drawFullTime();
      cb.onFullTime && cb.onFullTime(hg, ag);
    }

    raf = requestAnimationFrame(frame);

    return {
      setSpeed(v) { speed = clamp(+v, 1, 12); },
      pause() { running = false; },
      resume() { if (!finished) { running = true; last = 0; raf = requestAnimationFrame(frame); } },
      skip() { finish(); },
      stop() { cancelAnimationFrame(raf); finished = true; },
      get score() { return { hg, ag }; }
    };
  }

  root.SimSocMatch = { create };
})(typeof self !== 'undefined' ? self : this);
