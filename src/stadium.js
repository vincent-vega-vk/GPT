/* Super Rigori World Cup — stadio: tribune panoramiche, prato a bande, linee, cartelloni LED, porta con rete deformabile */
(function (root) {
  'use strict';
  const PK = (root.PK = root.PK || {});
  const M = PK.M;
  const GOAL = PK.Phys.GOAL;
  const deg = Math.PI / 180;

  const PAN = { ppr: 1300, yawMax: 50 * deg, top: 24 * deg, w: Math.round(2 * 50 * deg * 1300), h: Math.round(34 * deg * 1300) };
  const ang2y = (a) => (PAN.top - a) * PAN.ppr;

  const SKINS = ['#f2cba8', '#e3b58a', '#c98f62', '#a8704a', '#7a4a2a', '#5a3520'];

  // ----------------------------------------------------------- panorama tribuna
  function makePanorama(opts) {
    opts = opts || {};
    const w = PAN.w, h = PAN.h;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const rng = M.rng(opts.seed || 1);
    const colA = opts.colA || '#d62839', colB = opts.colB || '#2a6fdb';
    const mixed = ['#e63946', '#ffffff', '#2b6cb0', '#f4c430', '#2f9e44', '#ff8a3d', '#8e44ad', '#222'];

    // cielo notturno / sottotetto
    let gr = g.createLinearGradient(0, 0, 0, ang2y(12 * deg));
    gr.addColorStop(0, '#03040a');
    gr.addColorStop(1, '#141a36');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    // travi del tetto
    g.strokeStyle = 'rgba(120,140,200,0.16)';
    g.lineWidth = 2;
    for (let i = -6; i < 20; i++) {
      g.beginPath();
      g.moveTo(i * 150, 0);
      g.lineTo(i * 150 + 260, ang2y(12 * deg));
      g.stroke();
    }
    // base tribuna
    g.fillStyle = '#0b0e1c';
    g.fillRect(0, ang2y(12.5 * deg), w, h);

    // spettatori
    const yTop = ang2y(12.5 * deg), yBot = ang2y(-9.5 * deg);
    let y = yTop;
    while (y < yBot) {
      const k = (y - yTop) / (yBot - yTop);
      const rowH = 7 + 10 * k, dx = 8.5 + 8 * k;
      const lit = 0.5 + 0.55 * k;
      for (let x = -rng() * dx; x < w; x += dx) {
        const u = x / w + (rng() - 0.5) * 0.4;
        const base = u < 0.5 ? colA : colB;
        const col = rng() < 0.52 ? base : mixed[Math.floor(rng() * mixed.length)];
        g.fillStyle = M.shade(col, lit - 1 + (rng() - 0.5) * 0.2);
        g.fillRect(x, y + rowH * 0.42, dx * 0.86, rowH * 0.75);
        g.fillStyle = M.shade(SKINS[Math.floor(rng() * SKINS.length)], lit - 1);
        g.beginPath();
        g.arc(x + dx * 0.43, y + rowH * 0.3, rowH * 0.27, 0, 7);
        g.fill();
        if (rng() < 0.04) {
          // braccia alzate / sciarpe
          g.fillStyle = M.shade(col, 0.25);
          g.fillRect(x + dx * 0.1, y - rowH * 0.25, 2.2, rowH * 0.6);
        }
      }
      y += rowH * 0.78;
    }
    // corrimano e separazioni dei settori
    for (let i = 0; i < 3; i++) {
      const yy = yTop + ((yBot - yTop) * (i + 1)) / 4;
      g.fillStyle = 'rgba(10,12,28,0.65)';
      g.fillRect(0, yy, w, 5);
      g.fillStyle = 'rgba(160,175,230,0.25)';
      g.fillRect(0, yy + 5, w, 1.5);
    }
    // striscioni
    const banners = ['#d62839', '#ffd23a', '#2a6fdb', '#ffffff', '#2f9e44'];
    for (let i = 0; i < 9; i++) {
      const bx = rng() * (w - 260), by = yTop + (yBot - yTop) * (0.18 + rng() * 0.6);
      const bw = 110 + rng() * 150, bh = 28 + rng() * 14;
      const c1 = banners[Math.floor(rng() * banners.length)], c2 = banners[Math.floor(rng() * banners.length)];
      g.fillStyle = c1; g.fillRect(bx, by, bw, bh);
      g.fillStyle = c2; g.fillRect(bx, by + bh * 0.38, bw, bh * 0.24);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(bx, by + bh - 3, bw, 3);
    }
    // bordo luminoso del tetto
    g.fillStyle = 'rgba(190,210,255,0.85)';
    g.fillRect(0, yTop - 5, w, 3);
    g.fillStyle = 'rgba(190,210,255,0.18)';
    g.fillRect(0, yTop - 16, w, 16);
    // faretti
    g.globalCompositeOperation = 'lighter';
    [[-0.66, 19], [0.66, 19], [-0.2, 21], [0.25, 20.5]].forEach((l) => {
      const lx = (PAN.yawMax + l[0]) * PAN.ppr, ly = ang2y(l[1] * deg);
      const rg = g.createRadialGradient(lx, ly, 0, lx, ly, 190);
      rg.addColorStop(0, 'rgba(255,252,235,0.95)');
      rg.addColorStop(0.1, 'rgba(255,245,210,0.55)');
      rg.addColorStop(0.45, 'rgba(160,190,255,0.12)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg;
      g.fillRect(lx - 200, ly - 200, 400, 400);
      for (let a = 0; a < 3; a++)
        for (let b = 0; b < 5; b++) {
          g.fillStyle = 'rgba(255,255,240,0.9)';
          g.fillRect(lx - 28 + b * 12, ly - 14 + a * 10, 8, 6);
        }
    });
    g.globalCompositeOperation = 'source-over';
    // base scura sotto la tribuna e vignettatura laterale
    g.fillStyle = '#080a14';
    g.fillRect(0, yBot, w, h - yBot);
    ['left', 'right'].forEach((side) => {
      const gx = side === 'left' ? 0 : w;
      const vg = g.createLinearGradient(gx, 0, side === 'left' ? 260 : w - 260, 0);
      vg.addColorStop(0, 'rgba(3,4,10,0.95)');
      vg.addColorStop(1, 'rgba(3,4,10,0)');
      g.fillStyle = vg;
      g.fillRect(side === 'left' ? 0 : w - 260, 0, 260, h);
    });
    return c;
  }

  function drawBackdrop(ctx, cam, pano, t, energy) {
    ctx.fillStyle = '#04050c';
    ctx.fillRect(0, 0, cam.w, cam.h);
    const farSide = cam.fwd.z >= 0;
    const img = farSide ? pano.far : pano.near;
    if (!img) return;
    const relYaw = farSide ? cam.yaw : Math.atan2(-cam.fwd.x, -cam.fwd.z);
    const f = cam.f, k = f / PAN.ppr;
    const dx = cam.cx + cam.shakeX + f * (-PAN.yawMax - relYaw);
    const dy = cam.cy + cam.shakeY - f * (PAN.top - cam.pitch);
    const bands = 9, bh = img.height / bands;
    for (let b = 0; b < bands; b++) {
      const sy = b * bh;
      let off = 0;
      if (energy > 0.02 && b >= 3 && b <= 7) off = -Math.abs(Math.sin(t * 7 + b * 0.8)) * energy * 5 * k;
      ctx.drawImage(img, 0, sy, img.width, bh + 1, dx, dy + sy * k + off, img.width * k, (bh + 1) * k);
    }
  }

  // ------------------------------------------------------------------- campo
  const PITCH = { xMax: 60, zMin: -45, zMax: 16.5 };

  function drawPitch(ctx, cam) {
    const X = PITCH.xMax;
    cam.fillPoly(ctx, [{ x: -X, y: 0, z: PITCH.zMin }, { x: X, y: 0, z: PITCH.zMin }, { x: X, y: 0, z: PITCH.zMax }, { x: -X, y: 0, z: PITCH.zMax }], '#1d7433');
    let i = 0;
    for (let z = -44; z < PITCH.zMax; z += 5.5, i++) {
      const z1 = Math.min(z + 5.5, PITCH.zMax);
      const d = cam.depth({ x: 0, y: 0, z: (z + z1) / 2 });
      const fog = M.clamp((d - 14) / 70, 0, 0.55);
      const base = i % 2 ? '#2f9a47' : '#27883d';
      const col = M.mix(base, '#10281f', fog);
      cam.fillPoly(ctx, [{ x: -X, y: 0, z }, { x: X, y: 0, z }, { x: X, y: 0, z: z1 }, { x: -X, y: 0, z: z1 }], col, col, 0.8);
    }
    // erba consumata sul dischetto e davanti alla porta
    blob(ctx, cam, 0, 0, 0.55, 0.5, 'rgba(120,110,50,0.38)');
    blob(ctx, cam, 0, 10.2, 3.2, 1.1, 'rgba(110,100,45,0.18)');
  }

  function blob(ctx, cam, cx, cz, rx, rz, fill) {
    const pts = [];
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * M.PI2;
      pts.push({ x: cx + Math.cos(a) * rx, y: 0.002, z: cz + Math.sin(a) * rz });
    }
    cam.fillPoly(ctx, pts, fill);
  }

  function ribbon(ctx, cam, a, b, wid, fill) {
    const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
    const nx = (-dz / l) * wid / 2, nz = (dx / l) * wid / 2;
    cam.fillPoly(ctx, [
      { x: a.x + nx, y: 0.004, z: a.z + nz }, { x: b.x + nx, y: 0.004, z: b.z + nz },
      { x: b.x - nx, y: 0.004, z: b.z - nz }, { x: a.x - nx, y: 0.004, z: a.z - nz },
    ], fill);
  }

  function drawLines(ctx, cam) {
    const W = 0.13, c = 'rgba(245,250,245,0.92)';
    const L = (x0, z0, x1, z1) => ribbon(ctx, cam, { x: x0, z: z0 }, { x: x1, z: z1 }, W, c);
    const Z = GOAL.Z;
    L(-40, Z, 40, Z); // linea di porta
    const six = 9.16, pen = 20.16;
    L(-six, Z, -six, Z - 5.5); L(six, Z, six, Z - 5.5); L(-six, Z - 5.5, six, Z - 5.5);
    L(-pen, Z, -pen, Z - 16.5); L(pen, Z, pen, Z - 16.5); L(-pen, Z - 16.5, pen, Z - 16.5);
    // semicerchio dell'area
    let prev = null;
    for (let a = -53.1; a <= 53.1; a += 4.4) {
      const r = a * deg;
      const p = { x: 9.15 * Math.sin(r), z: -9.15 * Math.cos(r) };
      if (prev) ribbon(ctx, cam, prev, p, W, c);
      prev = p;
    }
    blob(ctx, cam, 0, 0, 0.12, 0.12, 'rgba(250,252,250,0.96)'); // dischetto
  }

  function drawBoards(ctx, cam, t) {
    const z = GOAL.BOARD, h = 0.95, seg = 3;
    const front = cam.pos.z < z;
    const labels = ['SUPER RIGORI', 'WORLD CUP', 'RIGORE!', 'GOOOL!', 'PENALTY CUP', 'TIRO DEL DRAGO'];
    const pal = [['#ff2e63', '#ffd23a'], ['#08d9d6', '#0b132b'], ['#ffd23a', '#d62839'], ['#9b5de5', '#fee440'], ['#00f5d4', '#0b132b'], ['#f15bb5', '#ffd23a']];
    for (let i = -9; i < 9; i++) {
      const x0 = i * seg, x1 = x0 + seg;
      const idx = ((i % 6) + 6) % 6;
      const flick = 0.82 + 0.18 * Math.sin(t * 3 + i * 1.7);
      cam.fillPoly(ctx, [{ x: x0, y: 0, z }, { x: x1, y: 0, z }, { x: x1, y: h, z }, { x: x0, y: h, z }], front ? M.shade(pal[idx][0], -0.65 + 0.35 * flick) : '#101420', '#05060c', 1);
      if (front) {
        cam.onPlane(ctx, { x: x0 + 0.1, y: 0.14, z }, { x: 0.01, y: 0, z: 0 }, { x: 0, y: 0.01, z: 0 }, () => {
          ctx.font = 'italic 900 52px Impact, "Arial Black", sans-serif';
          ctx.textBaseline = 'alphabetic';
          ctx.scale(1, -1); // asse y del piano punta in alto
          ctx.fillStyle = pal[idx][1];
          ctx.shadowColor = pal[idx][1];
          ctx.shadowBlur = 6;
          ctx.textAlign = 'left';
          let txt = labels[idx];
          ctx.save();
          ctx.scale(1, 1);
          ctx.fillText(txt, 0, 0, seg * 100 - 20);
          ctx.restore();
        });
      }
    }
    // retro dei cartelloni (spessore)
    cam.strokeLine(ctx, { x: -27, y: h, z }, { x: 27, y: h, z }, '#e9edf7', 0.04, 1);
  }

  // ------------------------------------------------------------ porta e rete
  const NETC = 'rgba(236,242,252,0.5)';
  function goalNetLines(ctx, cam, net) {
    ctx.strokeStyle = NETC;
    ctx.lineJoin = 'round';
    const nx = net.nx, ny = net.ny;
    const nodes = new Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) nodes[j * nx + i] = cam.project(net.node(i, j));
    const sAvg = (nodes[Math.floor((ny * nx) / 2)] || { s: 60 }).s;
    ctx.lineWidth = M.clamp(sAvg * 0.0085, 0.6, 1.5);
    ctx.beginPath();
    for (let j = 0; j < ny; j++) {
      let pen = false;
      for (let i = 0; i < nx; i++) {
        const p = nodes[j * nx + i];
        if (!p) { pen = false; continue; }
        if (!pen) { ctx.moveTo(p.x, p.y); pen = true; } else ctx.lineTo(p.x, p.y);
      }
    }
    for (let i = 0; i < nx; i++) {
      let pen = false;
      for (let j = 0; j < ny; j++) {
        const p = nodes[j * nx + i];
        if (!p) { pen = false; continue; }
        if (!pen) { ctx.moveTo(p.x, p.y); pen = true; } else ctx.lineTo(p.x, p.y);
      }
    }
    ctx.stroke();
  }

  function goalSideNets(ctx, cam) {
    ctx.strokeStyle = NETC;
    const PX = GOAL.PX, Z = GOAL.Z, H = GOAL.H;
    const bz = PK.Phys.backZ;
    ctx.beginPath();
    const mv = (a, b) => {
      const l = cam.line(a, b);
      if (l) { ctx.moveTo(l[0].x, l[0].y); ctx.lineTo(l[1].x, l[1].y); }
    };
    const sAvg = (cam.project({ x: 0, y: 1.2, z: Z }) || { s: 60 }).s;
    ctx.lineWidth = M.clamp(sAvg * 0.0075, 0.5, 1.3);
    for (const sx of [-PX, PX]) {
      for (let k = 0; k <= 8; k++) {
        const y = (k * H) / 8;
        mv({ x: sx, y, z: Z }, { x: sx, y, z: bz(y) });
      }
      for (let m = 1; m <= 5; m++) {
        const z = Z + (m * GOAL.D1) / 5;
        const yTop = z <= Z + GOAL.D0 ? H : Math.max(0, H - ((z - (Z + GOAL.D0)) / (GOAL.D1 - GOAL.D0)) * H);
        mv({ x: sx, y: 0, z }, { x: sx, y: yTop, z });
      }
    }
    ctx.stroke();
  }

  function goalRoof(ctx, cam) {
    ctx.strokeStyle = NETC;
    const PX = GOAL.PX, Z = GOAL.Z, H = GOAL.H;
    const sAvg = (cam.project({ x: 0, y: H, z: Z + 0.5 }) || { s: 60 }).s;
    ctx.lineWidth = M.clamp(sAvg * 0.0075, 0.5, 1.3);
    ctx.beginPath();
    const mv = (a, b) => {
      const l = cam.line(a, b);
      if (l) { ctx.moveTo(l[0].x, l[0].y); ctx.lineTo(l[1].x, l[1].y); }
    };
    for (let i = 0; i <= 24; i++) mv({ x: -PX + (i * 2 * PX) / 24, y: H, z: Z }, { x: -PX + (i * 2 * PX) / 24, y: H, z: Z + GOAL.D0 });
    for (let m = 0; m <= 3; m++) mv({ x: -PX, y: H, z: Z + (m * GOAL.D0) / 3 }, { x: PX, y: H, z: Z + (m * GOAL.D0) / 3 });
    ctx.stroke();
  }

  function goalFrame(ctx, cam) {
    const PX = GOAL.PX, Z = GOAL.Z, BY = GOAL.BY, PR = GOAL.PR;
    // montanti posteriori e traverse sottili
    const thin = (a, b) => cam.strokeLine(ctx, a, b, 'rgba(225,232,245,0.75)', 0.045, 1);
    for (const sx of [-PX, PX]) {
      thin({ x: sx, y: BY, z: Z }, { x: sx, y: GOAL.H, z: Z + GOAL.D0 });
      thin({ x: sx, y: GOAL.H, z: Z + GOAL.D0 }, { x: sx, y: 0, z: Z + GOAL.D1 });
      thin({ x: sx, y: 0.02, z: Z }, { x: sx, y: 0.02, z: Z + GOAL.D1 });
    }
    thin({ x: -PX, y: 0.02, z: Z + GOAL.D1 }, { x: PX, y: 0.02, z: Z + GOAL.D1 });
    thin({ x: -PX, y: GOAL.H, z: Z + GOAL.D0 }, { x: PX, y: GOAL.H, z: Z + GOAL.D0 });
    // pali e traversa: cilindro bianco con contorno
    const post = (a, b) => {
      cam.strokeLine(ctx, a, b, '#222a3a', (PR + 0.016) * 2, 1.6);
      cam.strokeLine(ctx, a, b, '#f5f7fb', PR * 2, 1.2);
      cam.strokeLine(ctx, a, b, 'rgba(255,255,255,1)', PR * 0.7, 0.6);
    };
    post({ x: -PX, y: 0, z: Z }, { x: -PX, y: BY + PR, z: Z });
    post({ x: PX, y: 0, z: Z }, { x: PX, y: BY + PR, z: Z });
    post({ x: -PX - PR, y: BY, z: Z }, { x: PX + PR, y: BY, z: Z });
  }

  /** Disegnabili della porta, ordinati per profondità insieme ai personaggi */
  function goalDrawables(cam, net) {
    const far = cam.behindGoal ? -1e6 : 1e6;
    const roofKey = cam.pos.y > GOAL.H + 0.05 || cam.behindGoal ? -1e6 + 1 : 1e6 - 1;
    return [
      { key: far, draw: (ctx) => { goalNetLines(ctx, cam, net); } },
      { key: far - 1, draw: (ctx) => { goalSideNets(ctx, cam); } },
      { key: roofKey, draw: (ctx) => { goalRoof(ctx, cam); } },
      { key: cam.depth({ x: 0, y: 1.2, z: GOAL.Z }), draw: (ctx) => { goalFrame(ctx, cam); } },
    ];
  }

  function groundShadow(ctx, cam, x, z, rx, rz, alpha) {
    blob(ctx, cam, x, z, rx, rz, `rgba(0,10,5,${alpha})`);
  }

  PK.Stadium = { PAN, makePanorama, drawBackdrop, drawPitch, drawLines, drawBoards, goalDrawables, groundShadow, blob };
  if (typeof module !== 'undefined' && module.exports) module.exports = PK;
})(typeof window !== 'undefined' ? window : globalThis);
