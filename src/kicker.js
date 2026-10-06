/* Super Rigori World Cup — animazione del rigorista (pura, senza DOM)
 *
 * Il tempo `t` è relativo al contatto col pallone (t = 0). Rincorsa a passi pianificati (i piedi restano a terra
 * durante l'appoggio), caricamento, piede d'appoggio accanto alla palla, colpo, accompagnamento, esultanza o sconforto.
 */
(function (root) {
  'use strict';
  const PK = (root.PK = root.PK || {});
  const M = PK.M;
  const mat = M.mat;
  const { lerp, clamp, smooth } = M;

  const BALL = { x: 0, y: 0.11, z: 0 };
  const AY = 0.07; // altezza della caviglia da terra
  const T_RUN = 1.3; // durata massima della rincorsa prima del contatto

  const v3 = (x, y, z) => ({ x, y, z });
  const lv = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) });

  /** interpola ricorsivamente campi numerici e vettori di due pose */
  function blend(a, b, k) {
    if (k <= 0) return a;
    if (k >= 1) return b;
    const out = {};
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    keys.forEach((key) => {
      const x = a[key], y = b[key];
      if (typeof x === 'number' && typeof y === 'number') out[key] = lerp(x, y, k);
      else if (x && y && typeof x === 'object' && 'x' in x && 'y' in x) out[key] = lv(x, y, k);
      else out[key] = y !== undefined ? y : x;
    });
    return out;
  }

  class Kicker {
    /**
     * opts: { foot:'R'|'L', aimX (m), seed }
     */
    constructor(opts) {
      opts = opts || {};
      this.foot = opts.foot || 'R';
      this.s = this.foot === 'R' ? 1 : -1;
      this.aimX = opts.aimX || 0;
      this.Trun = T_RUN;
      const s = this.s;
      this.S = v3(-1.5 * s, 0, -3.15); // partenza
      this.PC = v3(-0.17 * s, 0.9, -0.3); // bacino al contatto
      this.PF = v3(-0.3 * s, AY, -0.05); // piede d'appoggio
      const dx = this.PC.x - this.S.x, dz = this.PC.z - this.S.z, l = Math.hypot(dx, dz);
      this.head = v3(dx / l, 0, dz / l); // direzione di corsa
      this.perp = v3(this.head.z, 0, -this.head.x); // a destra della direzione di corsa
      this.yaw0 = Math.atan2(this.head.x, this.head.z);
      this.mood = null;
      this._buildSteps();
    }

    /** posizione planimetrica del bacino lungo la rincorsa */
    pathXZ(t) {
      const tau = clamp((t + this.Trun) / this.Trun, 0, 1);
      // accelerazione dolce all'inizio, quasi costante, lieve frenata finale
      const sp = tau * tau * (3 - 2 * tau) * 0.55 + tau * 0.45;
      return v3(lerp(this.S.x, this.PC.x, sp), 0, lerp(this.S.z, this.PC.z, sp));
    }

    footSpot(t, lateral) {
      const p = this.pathXZ(t);
      return v3(p.x + this.head.x * 0.2 + this.perp.x * lateral, AY, p.z + this.head.z * 0.2 + this.perp.z * lateral);
    }

    _buildSteps() {
      const s = this.s;
      const rest = (sign) => v3(this.S.x + this.perp.x * 0.11 * sign, AY, this.S.z + this.perp.z * 0.11 * sign);
      // piede destro del personaggio = +perp, sinistro = -perp (in senso di corsa)
      // il piede "di tiro" è quello del lato s; il piede d'appoggio l'altro
      const kickSign = s, plantSign = -s;
      const kRest = rest(kickSign), pRest = rest(plantSign);
      const k0 = this.footSpot(-1.06, 0.1 * kickSign);
      const p1 = this.footSpot(-0.74, 0.1 * plantSign);
      const k1 = this.footSpot(-0.42, 0.1 * kickSign);
      this.kick = {
        rest: kRest,
        swings: [
          { t0: -1.3, t1: -1.06, a: kRest, b: k0, h: 0.2 },
          { t0: -0.72, t1: -0.42, a: k0, b: k1, h: 0.2 },
        ],
        land: k1,
      };
      this.plant = {
        rest: pRest,
        swings: [
          { t0: -1.04, t1: -0.74, a: pRest, b: p1, h: 0.2 },
          { t0: -0.4, t1: -0.1, a: p1, b: this.PF, h: 0.17 },
        ],
      };
    }

    _footAlong(f, t) {
      let pos = f.rest;
      for (const sw of f.swings) {
        if (t < sw.t0) return pos;
        if (t <= sw.t1) {
          const u = (t - sw.t0) / (sw.t1 - sw.t0);
          const e = u * u * (3 - 2 * u);
          const p = lv(sw.a, sw.b, e);
          p.y = AY + sw.h * Math.sin(Math.PI * u);
          return p;
        }
        pos = sw.b;
      }
      return pos;
    }

    setMood(type, t0, dir) {
      this.mood = { type, t0, dir: dir || 1 };
    }

    /** posa "di gioco" (senza stati d'animo) a tempo t */
    basePose(t) {
      const s = this.s;
      const P = { scale: 1.0, legPole: v3(0, 0, 1), toeL: 0.34, toeR: 0.34, armPoleWorld: false };
      const run = clamp((t + this.Trun) / this.Trun, 0, 1);
      const running = t > -this.Trun;
      // bacino
      let px, pz;
      const pathP = this.pathXZ(Math.min(t, 0));
      px = pathP.x; pz = pathP.z;
      if (t > 0) {
        const k = 1 - Math.exp(-t / 0.16);
        px += this.head.x * 0.26 * k;
        pz += this.head.z * 0.26 * k;
      }
      const bob = running && t < 0 ? 0.022 * Math.sin((t / 0.32) * Math.PI * 2 + 0.6) : 0;
      let py = running ? 0.87 + bob : 0.9;
      if (t > -0.12) py = lerp(py, 0.9, smooth((t + 0.12) / 0.12));
      P.pelvis = v3(px, py, pz);
      // orientamento
      const yawK = Math.atan2(this.aimX - px, 11 - pz) * 0.5;
      const turn = smooth((t + 0.55) / 0.5);
      P.yaw = running ? lerp(this.yaw0, yawK, turn) : Math.atan2(BALL.x - this.S.x, BALL.z - this.S.z) * 0.5;
      P.lean = running ? lerp(0.18, -0.08, smooth((t + 0.35) / 0.3)) : 0.04;
      P.roll = running ? s * 0.12 * smooth((t + 0.4) / 0.35) : 0;
      P.twist = 0;
      P.headYaw = 0;
      P.headPitch = running ? lerp(0.12, 0.48, smooth((t + 0.5) / 0.4)) : -0.05; // guarda la palla al tiro

      // piedi
      let kickF = this._footAlong(this.kick, t);
      let plantF = this._footAlong(this.plant, t);
      if (t >= -0.32) {
        // dal punto in cui lascia terra: caricamento e colpo
        const l0 = this.kick.land;
        const back = v3(P.pelvis.x + 0.1 * s, 0.5, P.pelvis.z - 0.62);
        const contact = v3(BALL.x + 0.0, 0.175, BALL.z - 0.19);
        const fol = v3(-0.25 * s, 0.82, 0.72);
        if (t < -0.09) {
          const u = smooth((t + 0.32) / 0.23);
          kickF = lv(l0, back, u);
          kickF.y = Math.max(kickF.y, AY + 0.1 * Math.sin(Math.PI * u) + (back.y - AY) * u);
        } else if (t < 0) {
          const u = (t + 0.09) / 0.09;
          kickF = lv(back, contact, u * u);
          kickF.y = lerp(back.y, contact.y, u * u) + 0.03 * Math.sin(Math.PI * u);
        } else if (t < 0.28) {
          const u = Math.sqrt(t / 0.28);
          kickF = lv(contact, fol, u);
        } else {
          const u = smooth((t - 0.28) / 0.45);
          const land = v3(-0.12 * s, AY, 0.62);
          kickF = lv(fol, land, u);
        }
      }
      if (t > 0.12) {
        const k = smooth((t - 0.12) / 0.5);
        plantF = v3(this.PF.x + (-0.12 * s - this.PF.x) * k * 0.4, AY, this.PF.z + 0.62 * k);
      }
      const toe = t >= -0.09 && t < 0.3 ? 0.9 : 0.34;
      // piedi nel riferimento personaggio: s=+1 destro tira (footR), s=-1 sinistro (footL)
      if (s === 1) { P.footR = kickF; P.footL = plantF; P.toeR = toe; P.toeL = 0.34; }
      else { P.footL = kickF; P.footR = plantF; P.toeL = toe; P.toeR = 0.34; }

      // braccia
      const shY = py + 0.5 * 0.97;
      const swing = (foot) => clamp(((foot.x - px) * this.head.x + (foot.z - pz) * this.head.z) / 0.45, -1, 1);
      const armPose = (sideSign) => {
        // sideSign: +1 = braccio destro del personaggio
        const sameFoot = sideSign === 1 ? P.footR : P.footL;
        const ph = -swing(sameFoot);
        const lat = 0.24 * sideSign;
        const base = v3(px + this.perp.x * lat, shY - 0.4 + 0.08 * Math.abs(ph), pz + this.perp.z * lat);
        return v3(base.x + this.head.x * 0.28 * ph, base.y, base.z + this.head.z * 0.28 * ph);
      };
      let hR, hL;
      if (!running) {
        // mani sui fianchi
        hR = v3(px + 0.23, py + 0.12, pz - 0.02);
        hL = v3(px - 0.23, py + 0.12, pz - 0.02);
        P.armPoleR = v3(1, 0.1, -0.4); P.armPoleL = v3(-1, 0.1, -0.4);
      } else {
        hR = armPose(1); hL = armPose(-1);
        const k = smooth((t + 0.3) / 0.22);
        if (k > 0) {
          // al tiro: braccio opposto aperto per l'equilibrio, braccio del piede di tiro che attraversa il corpo
          const open = v3(px + 0.75 * -s, shY - 0.05, pz + 0.25);
          const cross = v3(px + 0.18 * -s, shY - 0.3, pz + 0.3);
          if (s === 1) { hL = lv(hL, open, k); hR = lv(hR, cross, k); }
          else { hR = lv(hR, open, k); hL = lv(hL, cross, k); }
        }
        P.armPoleR = v3(0.5, -0.4, -0.7); P.armPoleL = v3(-0.5, -0.4, -0.7);
      }
      P.handR = hR; P.handL = hL;
      return P;
    }

    moodPose(base, t) {
      const m = this.mood;
      const k = clamp((t - m.t0) / 0.55, 0, 1);
      const e = smooth(k);
      const tt = t - m.t0;
      const P = JSON.parse(JSON.stringify(base));
      const px = base.pelvis.x, pz = base.pelvis.z;
      if (m.type === 'cheer') {
        // si gira verso la telecamera e corre con le braccia alzate, poi salta
        const spd = 2.6;
        const run = clamp(tt - 0.35, 0, 99);
        const z = base.pelvis.z - spd * Math.min(run, 1.2) * 1.0;
        const x = base.pelvis.x + (m.dir || 1) * 0.5 * Math.min(run, 1.2);
        P.yaw = lerp(base.yaw, Math.PI + (m.dir || 1) * 0.15, smooth(tt / 0.4));
        const ph = run * 9.5;
        const jump = run > 1.2 ? Math.abs(Math.sin((run - 1.2) * 6)) * 0.35 : 0;
        P.pelvis = v3(x, 0.88 + 0.05 * Math.abs(Math.sin(ph)) + jump, z);
        P.lean = lerp(base.lean, -0.1, e);
        P.roll = 0;
        P.headPitch = lerp(base.headPitch, -0.25, e);
        // gambe in corsa (nel riferimento del mondo, ruotate dalla direzione z-)
        const mv = run > 0 && run < 1.2;
        const fwd = v3(Math.sin(P.yaw), 0, Math.cos(P.yaw));
        const side = v3(Math.cos(P.yaw), 0, -Math.sin(P.yaw));
        const leg = (sg) => {
          const c = Math.cos(ph + (sg > 0 ? 0 : Math.PI)), sn = Math.sin(ph + (sg > 0 ? 0 : Math.PI));
          const amp = mv ? 0.4 : 0.0;
          return v3(x + side.x * 0.1 * sg + fwd.x * (amp * c), AY + (mv ? Math.max(0, -sn) * 0.2 : 0), z + side.z * 0.1 * sg + fwd.z * (amp * c));
        };
        const fr = leg(1), fl = leg(-1);
        P.footR = lv(base.footR, fr, e); P.footL = lv(base.footL, fl, e);
        P.toeR = 0.34; P.toeL = 0.34;
        // braccia alzate a V con pugni
        const shY = P.pelvis.y + 0.48;
        const arm = (sg) => v3(x + side.x * 0.62 * sg, shY + 0.62 + 0.05 * Math.sin(tt * 10 + sg), z + side.z * 0.62 * sg + 0.1);
        P.handR = lv(base.handR, arm(1), e); P.handL = lv(base.handL, arm(-1), e);
        P.armPoleR = v3(1, -0.2, -0.2); P.armPoleL = v3(-1, -0.2, -0.2);
      } else if (m.type === 'sad') {
        P.yaw = lerp(base.yaw, base.yaw * 0.3, e);
        P.pelvis = v3(px, lerp(base.pelvis.y, 0.52, e), pz);
        P.lean = lerp(base.lean, 0.55, e);
        P.roll = 0;
        P.headPitch = lerp(base.headPitch, 0.6, e);
        const cy = Math.cos(P.yaw), sy = Math.sin(P.yaw);
        const rel = (dx, dz) => v3(px + dx * cy + dz * sy, AY, pz - dx * sy + dz * cy);
        P.footR = lv(base.footR, rel(0.18, 0.1), e);
        P.footL = lv(base.footL, rel(-0.18, -0.5), e);
        P.toeL = 0.2;
        const head = v3(px, P.pelvis.y + 0.95, pz + 0.18);
        P.handR = lv(base.handR, v3(head.x + 0.13, head.y + 0.05, head.z), e);
        P.handL = lv(base.handL, v3(head.x - 0.13, head.y + 0.05, head.z), e);
        P.armPoleR = v3(1, 0.2, -0.5); P.armPoleL = v3(-1, 0.2, -0.5);
      }
      return P;
    }

    /** posa Rig a tempo t */
    pose(t) {
      let P = this.basePose(this.mood ? Math.min(t, this.mood.t0) : t);
      if (this.mood && t > this.mood.t0) P = this.moodPose(this.basePose(Math.min(t, this.mood.t0)), t);
      else if (this.mood && t <= this.mood.t0) P = this.basePose(t);
      const out = Object.assign({}, P);
      out.R = mat.rotY(P.yaw);
      return out;
    }

    skeleton(t) {
      return PK.Rig.solve(this.pose(t));
    }
  }

  Kicker.T_RUN = T_RUN;
  Kicker.BALL = BALL;
  PK.Kicker = Kicker;
  PK.blendPose = blend;
  if (typeof module !== 'undefined' && module.exports) module.exports = PK;
})(typeof window !== 'undefined' ? window : globalThis);
