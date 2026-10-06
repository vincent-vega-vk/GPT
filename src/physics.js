/* Super Rigori World Cup — fisica del rigore (puro, senza DOM, deterministico)
 *
 *  - resistenza dell'aria quadratica + forza di Magnus (effetto)
 *  - rimbalzo sul terreno con attrito di Coulomb e conservazione del momento angolare
 *  - pali e traversa come cilindri (r = 6 cm), rete con onde elastiche, porta a norma (7,32 x 2,44 m)
 *  - portiere = capsule (mani guantate, braccia, busto, gambe) con velocità: parate, deviazioni, prese
 */
(function (root) {
  'use strict';
  const PK = (root.PK = root.PK || {});
  const M = PK.M;
  const mat = M.mat;

  const G = 9.81, RHO = 1.2, CD = 0.25;
  const BR = 0.11, MASS = 0.43, AREA = Math.PI * BR * BR;
  const GOAL = { Z: 11, HW: 3.66, H: 2.44, PR: 0.06, PX: 3.72, BY: 2.5, D0: 1.0, D1: 2.0, BOARD: 15.5 };
  const NY = (GOAL.D1 - GOAL.D0) / GOAL.H;
  const NLEN = Math.sqrt(1 + NY * NY);
  const NET_N = { x: 0, y: NY / NLEN, z: 1 / NLEN }; // normale (uscente) della rete di fondo
  const H = 1 / 480; // passo fisico

  const backZ = (y) => GOAL.Z + GOAL.D0 + ((GOAL.H - M.clamp(y, 0, GOAL.H)) / GOAL.H) * (GOAL.D1 - GOAL.D0);

  // --------------------------------------------------------------- aerodinamica
  function accel(v, w, wob, tl) {
    const sp = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    let ax = 0, ay = -G, az = 0;
    if (sp > 0.01) {
      const kd = ((0.5 * RHO * CD * AREA) / MASS) * sp;
      ax -= kd * v.x; ay -= kd * v.y; az -= kd * v.z;
      const wl = Math.sqrt(w.x * w.x + w.y * w.y + w.z * w.z);
      if (wl > 0.1) {
        const CL = 1 / (2 + sp / (BR * wl));
        const km = ((0.5 * RHO * AREA) / MASS) * CL * sp / wl;
        // a = km * (w x v)
        ax += km * (w.y * v.z - w.z * v.y);
        ay += km * (w.z * v.x - w.x * v.z);
        az += km * (w.x * v.y - w.y * v.x);
      }
    }
    if (wob) {
      ax += wob.amp * Math.sin(M.PI2 * wob.f * tl + wob.p1);
      ay += wob.amp * 0.5 * Math.sin(M.PI2 * wob.f * 1.17 * tl + wob.p2);
    }
    return { ax, ay, az };
  }

  /** Volo semplificato (senza ostacoli) dal dischetto: serve al solutore di tiro e al portiere AI */
  function flight(p0, v0, w0, wob, tl0, maxT) {
    const p = { x: p0.x, y: p0.y, z: p0.z }, v = { x: v0.x, y: v0.y, z: v0.z }, w = { x: w0.x, y: w0.y, z: w0.z };
    const h = 1 / 240;
    let t = 0;
    maxT = maxT || 2.2;
    while (t < maxT) {
      const a = accel(v, w, wob, (tl0 || 0) + t);
      v.x += a.ax * h; v.y += a.ay * h; v.z += a.az * h;
      const pz = p.z, px = p.x, py = p.y;
      p.x += v.x * h; p.y += v.y * h; p.z += v.z * h;
      if (p.y < BR) {
        p.y = BR;
        if (v.y < 0) { v.y = -v.y * 0.62; v.x *= 0.93; v.z *= 0.93; }
      }
      t += h;
      if (pz < GOAL.Z && p.z >= GOAL.Z) {
        const f = (GOAL.Z - pz) / (p.z - pz);
        return { ok: true, x: px + (p.x - px) * f, y: py + (p.y - py) * f, t: t - h + h * f };
      }
    }
    return { ok: false, x: p.x, y: p.y, t };
  }

  /** Velocità iniziale (e spin) tali che, in assenza di ostacoli, la palla attraversi il piano di porta in `target` */
  function solveShot(target, power, curve, special, opts) {
    opts = opts || {};
    const spMul = special ? special.speed : 1;
    const speed = (16 + 17 * power) * spMul;
    let wy = curve * (60 + 70 * power);
    if (special && special.spin > 0) wy = (curve || opts.curveSign || 1) * (60 + 70 * power) * special.spin;
    const w = { x: opts.topspin || 0, y: wy, z: 0 };
    const wob = special && special.wobble > 0 ? { amp: special.wobble * 6, f: 5, p1: opts.phase || 0.7, p2: (opts.phase || 0.7) * 1.9 } : null;
    const p0 = { x: 0, y: BR, z: 0 };
    let aim = { x: target.x, y: target.y };
    let v0 = null, res = null;
    for (let it = 0; it < 12; it++) {
      const dx = aim.x, dy = aim.y - BR, dz = GOAL.Z;
      const L = Math.hypot(dx, dy, dz);
      v0 = { x: (dx / L) * speed, y: (dy / L) * speed, z: (dz / L) * speed };
      res = flight(p0, v0, w, wob, 0);
      if (!res.ok) { aim.y += 0.6; continue; }
      const ex = target.x - res.x, ey = target.y - res.y;
      if (Math.abs(ex) < 0.008 && Math.abs(ey) < 0.008) break;
      aim.x += ex * 0.95; aim.y += ey * 0.95;
    }
    return { v: v0, w, speed, T: res ? res.t : 0.5, wob, cross: res };
  }

  /** Dove (x,y) e quando (t) la palla attraverserà il piano di porta se nessuno la tocca */
  function predictCrossing(ball, wob, tl) {
    return flight(ball.p, ball.v, ball.w, wob, tl || 0, 1.6);
  }

  // ---------------------------------------------------------------------- rete
  class Net {
    constructor() {
      this.nx = 25; this.ny = 9;
      this.dx = (2 * GOAL.PX) / (this.nx - 1);
      this.dy = GOAL.H / (this.ny - 1);
      this.u = new Float32Array(this.nx * this.ny);
      this.vel = new Float32Array(this.nx * this.ny);
      this.acc = 0;
    }
    idx(i, j) { return j * this.nx + i; }
    press(x, y, pen) {
      const rad = 0.6, sig = 0.28;
      const i0 = Math.max(1, Math.floor((x + GOAL.PX - rad) / this.dx)), i1 = Math.min(this.nx - 2, Math.ceil((x + GOAL.PX + rad) / this.dx));
      const j0 = Math.max(1, Math.floor((y - rad) / this.dy)), j1 = Math.min(this.ny - 2, Math.ceil((y + rad) / this.dy));
      for (let j = j0; j <= j1; j++)
        for (let i = i0; i <= i1; i++) {
          const dx = -GOAL.PX + i * this.dx - x, dy = j * this.dy - y;
          const wgt = Math.exp(-(dx * dx + dy * dy) / (2 * sig * sig));
          const tgt = pen * wgt;
          const k = this.idx(i, j);
          if (this.u[k] < tgt) this.u[k] = tgt;
        }
    }
    step(dt) {
      const nx = this.nx, ny = this.ny, u = this.u, vel = this.vel;
      const c2 = 6.0 * 6.0, g = 3.2;
      const idx2 = 1 / (this.dx * this.dx), idy2 = 1 / (this.dy * this.dy);
      for (let j = 1; j < ny - 1; j++)
        for (let i = 1; i < nx - 1; i++) {
          const k = j * nx + i;
          const lap = (u[k + 1] + u[k - 1] - 2 * u[k]) * idx2 + (u[k + nx] + u[k - nx] - 2 * u[k]) * idy2;
          vel[k] += (c2 * lap - g * vel[k]) * dt;
        }
      for (let j = 1; j < ny - 1; j++)
        for (let i = 1; i < nx - 1; i++) {
          const k = j * nx + i;
          u[k] += vel[k] * dt;
        }
    }
    /** posizione mondo del nodo (i,j) della rete di fondo */
    node(i, j) {
      const y = j * this.dy, u = this.u[j * this.nx + i];
      return { x: -GOAL.PX + i * this.dx, y: y + NET_N.y * u, z: backZ(y) + NET_N.z * u };
    }
  }

  // ------------------------------------------------------------------ geometria
  function segClosest(A, B, P) {
    const abx = B.x - A.x, aby = B.y - A.y, abz = B.z - A.z;
    const l2 = abx * abx + aby * aby + abz * abz;
    let t = l2 < 1e-12 ? 0 : ((P.x - A.x) * abx + (P.y - A.y) * aby + (P.z - A.z) * abz) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return { x: A.x + abx * t, y: A.y + aby * t, z: A.z + abz * t, t };
  }

  const WOOD = [
    { a: { x: -GOAL.PX, y: 0, z: GOAL.Z }, b: { x: -GOAL.PX, y: GOAL.BY, z: GOAL.Z }, name: 'post' },
    { a: { x: GOAL.PX, y: 0, z: GOAL.Z }, b: { x: GOAL.PX, y: GOAL.BY, z: GOAL.Z }, name: 'post' },
    { a: { x: -GOAL.PX, y: GOAL.BY, z: GOAL.Z }, b: { x: GOAL.PX, y: GOAL.BY, z: GOAL.Z }, name: 'bar' },
  ];

  // ----------------------------------------------------------------------- Sim
  class Sim {
    /**
     * keeper: istanza di PK.Keeper (oppure null); opts: { onEvent, t0, kickSpecial, breakThrough }
     */
    constructor(keeper, opts) {
      opts = opts || {};
      this.keeper = keeper;
      this.onEvent = opts.onEvent || null;
      this.t = opts.t0 != null ? opts.t0 : -1.2;
      this.acc = 0;
      this.step = 0;
      this.ball = { p: { x: 0, y: BR, z: 0 }, v: { x: 0, y: 0, z: 0 }, w: { x: 0, y: 0, z: 0 }, rot: mat.ident(), held: null };
      this.net = new Net();
      this.launched = false;
      this.tLaunch = 0;
      this.wob = null;
      this.shotSpecial = false;
      this.breakThrough = !!opts.breakThrough;
      this.broke = false;
      this.keeperTouched = false;
      this.woodHit = false;
      this.crossed = false;
      this.result = null;
      this.resultT = 0;
      this.settled = false;
      this.minKeeperDist = 9;
      this.events = [];
      this.ballSpeedAtLaunch = 0;
      this.maxNetU = 0;
    }

    emit(type, data) {
      const ev = Object.assign({ type, t: this.t }, data || {});
      this.events.push(ev);
      if (this.onEvent) this.onEvent(ev);
    }

    launch(shot) {
      const b = this.ball;
      b.v = { x: shot.v.x, y: shot.v.y, z: shot.v.z };
      b.w = { x: shot.w.x, y: shot.w.y, z: shot.w.z };
      this.wob = shot.wob || null;
      this.shotSpecial = !!shot.special;
      this.launched = true;
      this.tLaunch = this.t;
      this.ballSpeedAtLaunch = Math.hypot(b.v.x, b.v.y, b.v.z);
      this.emit('kick', { speed: this.ballSpeedAtLaunch });
    }

    get sinceLaunch() { return this.t - this.tLaunch; }

    /** Avanza il tempo di simulazione di `dt` secondi a passi fissi */
    advance(dt) {
      this.acc += dt;
      let n = 0;
      while (this.acc >= H && n < 4000) {
        this.acc -= H;
        this._step(H);
        n++;
      }
    }

    _step(h) {
      this.t += h;
      this.step++;
      if (!this.launched) return;
      const b = this.ball;
      if (b.held) {
        this._followHeld();
        this._check(b.p.x, b.p.y, b.p.z);
        return;
      }
      const tl = this.t - this.tLaunch;
      const p = b.p, v = b.v, w = b.w;
      const px = p.x, py = p.y, pz = p.z;
      const a = accel(v, w, this.wob, tl);
      v.x += a.ax * h; v.y += a.ay * h; v.z += a.az * h;
      p.x += v.x * h; p.y += v.y * h; p.z += v.z * h;
      const air = p.y > BR + 0.01 ? 1 : 0;
      const dec = 1 - 0.06 * h * air;
      w.x *= dec; w.y *= dec; w.z *= dec;
      const wl = Math.sqrt(w.x * w.x + w.y * w.y + w.z * w.z);
      if (wl > 1e-3) {
        b.rot = mat.mul(mat.axisAngle(w.x / wl, w.y / wl, w.z / wl, wl * h), b.rot);
        if ((this.step & 255) === 0) b.rot = mat.orthonormalize(b.rot);
      }
      this._wood();
      this._keeper();
      this._ground(h);
      this._nets(h);
      if (p.z + BR > GOAL.BOARD) {
        p.z = GOAL.BOARD - BR;
        if (v.z > 0) { v.z *= -0.35; v.x *= 0.8; v.y *= 0.8; this.emit('board', { speed: Math.abs(v.z) }); }
      }
      if ((this.step & 1) === 0) this.net.step(2 * h);
      this._check(px, py, pz);
    }

    _ground(h) {
      const b = this.ball, p = b.p, v = b.v, w = b.w;
      if (p.y >= BR) return;
      p.y = BR;
      const MU = 0.42;
      const ux = v.x + BR * w.z, uz = v.z - BR * w.x; // velocità del punto di contatto
      const ut = Math.hypot(ux, uz);
      if (v.y < -0.6) {
        const vn = -v.y;
        const e = vn < 2 ? 0.35 : 0.64;
        const Jn = (1 + e) * vn;
        if (ut > 1e-6) {
          const Jt = Math.min(MU * Jn, ut / 3.5);
          const dvx = (-Jt * ux) / ut, dvz = (-Jt * uz) / ut;
          v.x += dvx; v.z += dvz;
          w.x += -dvz / (0.4 * BR);
          w.z += dvx / (0.4 * BR);
        }
        v.y = e * vn;
        if (vn > 2.5) this.emit('bounce', { vn });
      } else {
        // appoggio/rotolamento
        v.y = 0;
        if (ut > 0.05) {
          const dv = Math.min(MU * G * h, ut / 3.5);
          const dvx = (-dv * ux) / ut, dvz = (-dv * uz) / ut;
          v.x += dvx; v.z += dvz;
          w.x += -dvz / (0.4 * BR);
          w.z += dvx / (0.4 * BR);
        } else {
          const sp = Math.hypot(v.x, v.z);
          if (sp > 1e-4) {
            const k = Math.max(0, sp - 0.55 * h) / sp;
            v.x *= k; v.z *= k;
          } else { v.x = 0; v.z = 0; }
          w.x = v.z / BR; w.z = -v.x / BR;
        }
        w.y *= 1 - 0.8 * h;
      }
    }

    _wood() {
      const b = this.ball, p = b.p, v = b.v;
      if (p.z < GOAL.Z - 0.4 || p.z > GOAL.Z + 0.4) return;
      for (const s of WOOD) {
        const c = segClosest(s.a, s.b, p);
        const dx = p.x - c.x, dy = p.y - c.y, dz = p.z - c.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const rr = BR + GOAL.PR;
        if (d < rr && d > 1e-6) {
          const nx = dx / d, ny = dy / d, nz = dz / d;
          const vn = v.x * nx + v.y * ny + v.z * nz;
          if (vn < 0) {
            const e = 0.58;
            v.x -= (1 + e) * vn * nx; v.y -= (1 + e) * vn * ny; v.z -= (1 + e) * vn * nz;
            v.x *= 0.96; v.y *= 0.96; v.z *= 0.96;
            this.woodHit = true;
            this.emit(s.name, { speed: -vn, x: p.x, y: p.y });
          }
          p.x = c.x + nx * rr; p.y = c.y + ny * rr; p.z = c.z + nz * rr;
        }
      }
    }

    _keeper() {
      const K = this.keeper;
      if (!K) return;
      const b = this.ball, p = b.p, v = b.v;
      if (p.z < GOAL.Z - 1.6 || p.z > GOAL.Z + 0.3) return;
      if (this.broke) return;
      const { caps } = K.capsules(this.t);
      for (let ci = 0; ci < caps.length; ci++) {
        const cp = caps[ci];
        const c = segClosest(cp.a, cp.b, p);
        const dx = p.x - c.x, dy = p.y - c.y, dz = p.z - c.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (!this.keeperTouched && d < this.minKeeperDist) this.minKeeperDist = d - cp.r - BR;
        const rr = BR + cp.r;
        if (d >= rr) continue;
        const nx = d > 1e-6 ? dx / d : 0, ny = d > 1e-6 ? dy / d : 1, nz = d > 1e-6 ? dz / d : 0;
        const vcx = cp.va.x + (cp.vb.x - cp.va.x) * c.t, vcy = cp.va.y + (cp.vb.y - cp.va.y) * c.t, vcz = cp.va.z + (cp.vb.z - cp.va.z) * c.t;
        let rx = v.x - vcx, ry = v.y - vcy, rz = v.z - vcz;
        const vn = rx * nx + ry * ny + rz * nz;
        p.x = c.x + nx * (rr + 0.001); p.y = c.y + ny * (rr + 0.001); p.z = c.z + nz * (rr + 0.001);
        if (vn >= 0) continue;
        const rel = Math.sqrt(rx * rx + ry * ry + rz * rz);
        const first = !this.keeperTouched;
        this.keeperTouched = true;
        // scontro di super-tecniche: la tiro può "sfondare" le mani
        if (K.special && this.shotSpecial && first) {
          if (this.breakThrough) {
            this.broke = true;
            v.x *= 0.8; v.y *= 0.8; v.z *= 0.8;
            this.emit('break', { x: p.x, y: p.y, tag: cp.tag });
            return;
          }
          this.emit('clash', { x: p.x, y: p.y });
        }
        const catchLimit = K.special ? 46 : 13.5;
        if (cp.tag === 'hand' && rel < catchLimit && !(this.shotSpecial && K.special)) {
          b.held = { idx: ci };
          v.x = vcx; v.y = vcy; v.z = vcz;
          this.emit('catch', { x: p.x, y: p.y, tag: cp.tag });
          return;
        }
        const e = cp.tag === 'hand' ? (K.special ? 0.55 : 0.3) : 0.2;
        rx -= (1 + e) * vn * nx; ry -= (1 + e) * vn * ny; rz -= (1 + e) * vn * nz;
        const k = 0.9;
        v.x = vcx + rx * k; v.y = vcy + ry * k; v.z = vcz + rz * k;
        this.emit('keeper', { x: p.x, y: p.y, tag: cp.tag, speed: rel });
      }
    }

    _followHeld() {
      const b = this.ball;
      const { caps } = this.keeper.capsules(this.t);
      const cp = caps[b.held.idx];
      b.p = { x: (cp.a.x + cp.b.x) / 2, y: (cp.a.y + cp.b.y) / 2 - 0.02, z: (cp.a.z + cp.b.z) / 2 - 0.08 };
      b.v = { x: 0, y: 0, z: 0 };
      b.w = { x: 0, y: 0, z: 0 };
    }

    _spring(nx, ny, nz, pen, k, c, h) {
      const v = this.ball.v;
      const vn = v.x * nx + v.y * ny + v.z * nz;
      // isteresi: in carico la rete è rigida e smorzata, in scarico restituisce pochissima energia (e ≈ 0.2)
      const an = vn > 0 ? -(k * pen + c * vn) : -(0.05 * k * pen);
      v.x += nx * an * h; v.y += ny * an * h; v.z += nz * an * h;
      // attrito della rete
      const f = 1 - 5 * h;
      const tx = v.x - nx * vn, ty = v.y - ny * vn, tz = v.z - nz * vn;
      v.x -= tx * (1 - f); v.y -= ty * (1 - f); v.z -= tz * (1 - f);
    }

    _nets(h) {
      const b = this.ball, p = b.p, v = b.v;
      if (p.z < GOAL.Z - 0.15) return;
      const inX = Math.abs(p.x) < GOAL.PX;
      if (!inX || p.y > GOAL.H + 0.02) return;
      const K = 576, C = 40;
      // rete di fondo (piano inclinato)
      const d = (p.z - (GOAL.Z + GOAL.D1)) * NET_N.z + p.y * NET_N.y;
      const pen = d + BR;
      if (pen > 0) {
        this._spring(NET_N.x, NET_N.y, NET_N.z, pen, K, C, h);
        this.net.press(p.x, p.y, pen);
        if (pen > this.maxNetU) this.maxNetU = pen;
        if (!this.netHit) { this.netHit = true; this.emit('net', { speed: Math.hypot(v.x, v.y, v.z), x: p.x, y: p.y }); }
      }
      // reti laterali
      const bz = backZ(p.y);
      if (p.z < bz + 0.2) {
        const sx = p.x >= 0 ? 1 : -1;
        const penS = Math.abs(p.x) + BR - GOAL.PX;
        if (penS > 0) this._spring(sx, 0, 0, penS, K, C, h);
      }
      // tettuccio
      if (p.z < GOAL.Z + GOAL.D0 + 0.2) {
        const penR = p.y + BR - GOAL.H;
        if (penR > 0) this._spring(0, 1, 0, penR, K, C, h);
      }
    }

    _check(px, py, pz) {
      if (this.result) {
        if (!this.settled) {
          const b = this.ball;
          const sp = Math.hypot(b.v.x, b.v.y, b.v.z);
          const since = this.t - this.resultT;
          if ((since > 1.4 && sp < 0.7) || since > 4) this.settled = true;
        }
        return;
      }
      const b = this.ball, p = b.p, v = b.v;
      const since = this.t - this.tLaunch;
      if (b.held) return this._finish('saved', { held: true });
      if (!this.crossed && pz < GOAL.Z && p.z >= GOAL.Z) {
        this.crossed = true;
        const inside = Math.abs(p.x) < GOAL.PX && p.y < GOAL.BY;
        if (inside) return this._finish('goal', {});
        return this._finish(this.woodHit && !this.keeperTouched ? 'post' : p.y > GOAL.H ? 'over' : 'wide', {});
      }
      if ((this.keeperTouched || this.woodHit) && p.z < GOAL.Z - 1.1 && v.z < 0)
        return this._finish(this.keeperTouched ? 'saved' : 'post', {});
      const sp = Math.hypot(v.x, v.y, v.z);
      if (since > 0.4 && sp < 0.4 && p.z < GOAL.Z) return this._finish(this.keeperTouched ? 'saved' : 'short', {});
      if (since > 7) return this._finish(this.keeperTouched ? 'saved' : 'wide', {});
    }

    _finish(type, extra) {
      this.result = Object.assign({ type, t: this.t, woodHit: this.woodHit, keeperTouched: this.keeperTouched, special: this.shotSpecial, broke: this.broke, minKeeperDist: this.minKeeperDist }, extra);
      this.resultT = this.t;
      this.emit('result', { result: this.result });
    }
  }

  PK.Phys = { GOAL, BR, backZ, NET_N, Net, Sim, solveShot, predictCrossing, flight, accel, segClosest, H };
  if (typeof module !== 'undefined' && module.exports) module.exports = PK;
})(typeof window !== 'undefined' ? window : globalThis);
