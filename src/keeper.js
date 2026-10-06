/* Super Rigori World Cup — portiere: posa di attesa, tuffo cinematico a portata limitata, capsule di collisione */
(function (root) {
  'use strict';
  const PK = (root.PK = root.PK || {});
  const M = PK.M;
  const mat = M.mat;
  const { clamp, lerp } = M;

  const REACH = 1.23; // bacino -> punta delle mani con braccia tese lungo l'asse del corpo

  class Keeper {
    constructor(opts) {
      opts = opts || {};
      this.z0 = 10.88;
      this.sc = opts.scale || 1.04;
      this.dive = null;
      this.special = false;
      this.mood = null; // {type:'cheer'|'sad', t0}
      this.seed = opts.seed || 0;
    }

    swayX(t) {
      return 0.2 * Math.sin(2.1 * t + 0.7 + this.seed);
    }

    /** Lancia il tuffo verso `target` {x,y} (punto sul piano della porta). Ritorna false se già in tuffo. */
    command(t, target, opts) {
      if (this.dive) return false;
      opts = opts || {};
      const special = !!opts.special;
      const x0 = this.swayX(t);
      const maxLat = special ? 3.9 : 3.15;
      const maxH = special ? 3.05 : 2.75;
      const Hx = clamp(target.x, -maxLat, maxLat);
      const Hy = clamp(target.y, 0.12, maxH);
      const dist = Math.hypot(Hx - x0, Hy - 1.2);
      const speed = opts.speedMul || 1;
      const Te = (special ? 0.09 + 0.07 * dist : 0.13 + 0.115 * dist) / speed;
      const dir = Hx >= x0 ? 1 : -1;
      const theta = clamp(Math.atan2(Math.abs(Hx - x0), Math.max(Hy - 0.5, 0.1)), 0, 1.45);
      const axis = { x: dir * Math.sin(theta), y: Math.cos(theta) };
      // lunghezza effettiva bacino->mani: si accorcia (braccia piegate) se il bacino non può scendere sotto 0.3 m
      const Lh = clamp(Math.min(REACH, (Hy - 0.3) / Math.max(Math.cos(theta), 0.05)), 0.45, REACH);
      const pf = { x: Hx - axis.x * Lh, y: Hy - axis.y * Lh, z: this.z0 };
      this.dive = { t0: t, lag: 0.05, Te, x0, H: { x: Hx, y: Hy }, special, dir, theta, pf, axis, Lh };
      this.special = special;
      return true;
    }

    /** Il portiere ha una posa di esultanza/sconforto dopo il tiro */
    setMood(type, t) {
      this.mood = { type, t0: t };
    }

    pose(t) {
      const sc = this.sc, z0 = this.z0;
      const d = this.dive;
      const R0 = mat.rotY(Math.PI);
      const pose = { scale: sc, legPole: { x: 0, y: 0, z: 1 }, armPoleWorld: true,
        armPoleR: { x: -1, y: -0.4, z: 0.3 }, armPoleL: { x: 1, y: -0.4, z: 0.3 } };

      if (!d || t < d.t0) {
        // ---- posizione d'attesa: ginocchia flesse, mani larghe davanti al petto
        const x0 = this.swayX(t);
        const bob = 0.018 * Math.sin(5.2 * t);
        pose.R = R0;
        pose.pelvis = { x: x0, y: 0.84 + bob, z: z0 };
        pose.lean = 0.12;
        pose.handR = { x: x0 - 0.46, y: 1.16 + bob, z: z0 - 0.4 };
        pose.handL = { x: x0 + 0.46, y: 1.16 + bob, z: z0 - 0.4 };
        pose.footR = { x: x0 - 0.3, y: 0.07, z: z0 + 0.02 };
        pose.footL = { x: x0 + 0.3, y: 0.07, z: z0 + 0.02 };
        pose.headPitch = 0;
        if (this.mood) this._applyMood(pose, t);
        return pose;
      }

      // ---- tuffo
      const tau = t - d.t0 - d.lag;
      const u = clamp(tau / d.Te, 0, 1);
      const s = 1 - (1 - u) * (1 - u);
      const fall = clamp((tau - d.Te) / 0.4, 0, 1);
      const fe = fall * fall * (3 - 2 * fall);
      const x0 = d.x0;
      const th = d.theta + (1.5 - d.theta) * fe * 0.55;
      const axis = { x: d.dir * Math.sin(th), y: Math.cos(th) };
      const p0 = { x: x0, y: 0.84 };
      const hop = 0.28 * Math.sin(Math.PI * s) * (d.H.y > 1.0 ? 1 : 0.5);
      let py = lerp(p0.y, d.pf.y, s) + hop;
      py = lerp(py, 0.22, fe);
      const px = lerp(p0.x, d.pf.x, s) + d.dir * 0.15 * fe;
      pose.R = mat.mul(mat.rotZ(-d.dir * th), R0);
      pose.pelvis = { x: px, y: Math.max(py, 0.2), z: z0 };
      pose.lean = 0.05 + 0.25 * s;
      pose.headPitch = -0.25 * s; // guarda la palla
      // mani: raggiungono il bersaglio; poi seguono il corpo che cade
      const h0 = { x: x0, y: 1.16 };
      const Hf = d.H;
      const hx = lerp(h0.x, Hf.x, s) + (px - d.pf.x) * fe;
      const hy = Math.max(lerp(h0.y, Hf.y, s) - (d.pf.y - Math.max(py, 0.2)) * fe, 0.1);
      const perp = { x: Math.cos(th) * d.dir, y: -Math.sin(th) };
      const hz = z0 - lerp(0.4, 0.08, s);
      // la mano "guida" è quella dal lato del tuffo; l'altra la segue ravvicinata
      const lead = { x: hx, y: hy, z: hz };
      const trail = { x: hx - perp.x * 0.16 - axis.x * 0.1, y: hy - perp.y * 0.16 - axis.y * 0.1, z: hz };
      if (d.dir > 0) { pose.handL = lead; pose.handR = trail; } else { pose.handR = lead; pose.handL = trail; }
      // gambe: a terra finché non spinge, poi in linea col corpo
      const kk = M.smooth(clamp(s * 1.7, 0, 1));
      const fx = (sign) => ({
        x: lerp(x0 + sign * 0.3, pose.pelvis.x - axis.x * 0.86 + perp.x * 0.09 * sign, kk),
        y: Math.max(lerp(0.07, pose.pelvis.y - axis.y * 0.86 + perp.y * 0.09 * sign, kk), 0.07),
        z: z0 + 0.02,
      });
      pose.footL = fx(1);
      pose.footR = fx(-1);
      pose.armPoleR = { x: -0.3, y: -1, z: 0 };
      pose.armPoleL = { x: 0.3, y: -1, z: 0 };
      return pose;
    }

    _applyMood(pose, t) {
      const m = this.mood;
      const k = clamp((t - m.t0) / 0.5, 0, 1);
      if (m.type === 'cheer') {
        const x0 = pose.pelvis.x;
        const j = Math.abs(Math.sin((t - m.t0) * 7)) * 0.12 * k;
        pose.pelvis.y += j;
        pose.footR.y += j; pose.footL.y += j;
        pose.handR = { x: x0 - 0.45, y: lerp(pose.handR.y, 2.1 + j, k), z: pose.handR.z + 0.25 * k };
        pose.handL = { x: x0 + 0.45, y: lerp(pose.handL.y, 2.1 + j, k), z: pose.handL.z + 0.25 * k };
        pose.armPoleR = { x: -1, y: -0.2, z: 0 }; pose.armPoleL = { x: 1, y: -0.2, z: 0 };
        pose.headPitch = -0.2 * k;
      } else if (m.type === 'sad') {
        pose.pelvis.y = lerp(pose.pelvis.y, 0.5, k);
        pose.lean = lerp(pose.lean, 0.5, k);
        const x0 = pose.pelvis.x;
        pose.handR = { x: x0 - 0.12, y: lerp(pose.handR.y, 1.2, k), z: pose.handR.z + 0.1 };
        pose.handL = { x: x0 + 0.12, y: lerp(pose.handL.y, 1.2, k), z: pose.handL.z + 0.1 };
        pose.headPitch = 0.5 * k;
        pose.footR = { x: x0 - 0.3, y: 0.07, z: this.z0 + 0.25 * k };
        pose.footL = { x: x0 + 0.3, y: 0.07, z: this.z0 + 0.05 };
      }
    }

    skeleton(t) {
      return PK.Rig.solve(this.pose(t));
    }

    gloveRadius(t) {
      if (!this.special || !this.dive) return 0.12;
      const k = clamp((t - this.dive.t0) / 0.3, 0, 1);
      return 0.12 + 0.12 * k;
    }

    /** Capsule con velocità (differenza finita) per la collisione con la palla */
    capsules(t) {
      const dt = 0.004;
      const sk1 = this.skeleton(t), sk0 = this.skeleton(t - dt);
      const gr = this.gloveRadius(t);
      const c1 = PK.Rig.capsules(sk1, gr), c0 = PK.Rig.capsules(sk0, gr);
      for (let i = 0; i < c1.length; i++) {
        const a = c1[i], b = c0[i];
        a.va = { x: (a.a.x - b.a.x) / dt, y: (a.a.y - b.a.y) / dt, z: (a.a.z - b.a.z) / dt };
        a.vb = { x: (a.b.x - b.b.x) / dt, y: (a.b.y - b.b.y) / dt, z: (a.b.z - b.b.z) / dt };
      }
      return { caps: c1, sk: sk1 };
    }
  }

  Keeper.REACH = REACH;
  PK.Keeper = Keeper;
  if (typeof module !== 'undefined' && module.exports) module.exports = PK;
})(typeof window !== 'undefined' ? window : globalThis);
