/* Super Rigori World Cup — camera prospettica con clipping, primitive 3D su canvas 2D */
(function (root) {
  'use strict';
  const PK = (root.PK = root.PK || {});
  const M = PK.M;

  class Camera {
    constructor() {
      this.pos = { x: 0, y: 2.2, z: -6 };
      this.target = { x: 0, y: 1.1, z: 11 };
      this.f = 1300;
      this.w = 1280; this.h = 720;
      this.cx = 640; this.cy = 360;
      this.near = 0.25;
      this.shakeX = 0; this.shakeY = 0;
      this.right = { x: 1, y: 0, z: 0 }; this.up = { x: 0, y: 1, z: 0 }; this.fwd = { x: 0, y: 0, z: 1 };
      this.yaw = 0; this.pitch = 0;
      this.behindGoal = false;
    }
    setSize(w, h) {
      this.w = w; this.h = h; this.cx = w / 2; this.cy = h / 2;
    }
    /** focale base: la porta occupa ~46% della larghezza in 16:9, ma mai più larga dello schermo in verticale */
    baseF() {
      return Math.min(this.h * 1.9, this.w * 1.08);
    }
    update() {
      const p = this.pos, t = this.target;
      const fwd = M.norm({ x: t.x - p.x, y: t.y - p.y, z: t.z - p.z });
      let right = M.cross({ x: 0, y: 1, z: 0 }, fwd);
      if (M.len(right) < 1e-6) right = { x: 1, y: 0, z: 0 };
      right = M.norm(right);
      const up = M.cross(fwd, right);
      this.fwd = fwd; this.right = right; this.up = up;
      this.yaw = Math.atan2(fwd.x, fwd.z);
      this.pitch = Math.asin(M.clamp(fwd.y, -1, 1));
      this.behindGoal = p.z > 11.5;
    }
    view(p) {
      const v = { x: p.x - this.pos.x, y: p.y - this.pos.y, z: p.z - this.pos.z };
      return {
        x: v.x * this.right.x + v.y * this.right.y + v.z * this.right.z,
        y: v.x * this.up.x + v.y * this.up.y + v.z * this.up.z,
        z: v.x * this.fwd.x + v.y * this.fwd.y + v.z * this.fwd.z,
      };
    }
    /** -> {x,y,z (profondità),s (px per metro)} oppure null se dietro il piano vicino */
    project(p) {
      const v = this.view(p);
      if (v.z < this.near) return null;
      const s = this.f / v.z;
      return { x: this.cx + v.x * s + this.shakeX, y: this.cy - v.y * s + this.shakeY, z: v.z, s };
    }
    projectView(v) {
      const s = this.f / v.z;
      return { x: this.cx + v.x * s + this.shakeX, y: this.cy - v.y * s + this.shakeY, z: v.z, s };
    }
    depth(p) {
      return this.view(p).z;
    }
    /** punto del mondo sul piano z = planeZ sotto il pixel (sx,sy) */
    unprojectZ(sx, sy, planeZ) {
      const dx = (sx - this.cx - this.shakeX) / this.f, dy = -(sy - this.cy - this.shakeY) / this.f;
      const d = {
        x: this.fwd.x + this.right.x * dx + this.up.x * dy,
        y: this.fwd.y + this.right.y * dx + this.up.y * dy,
        z: this.fwd.z + this.right.z * dx + this.up.z * dy,
      };
      if (Math.abs(d.z) < 1e-6) return null;
      const t = (planeZ - this.pos.z) / d.z;
      return { x: this.pos.x + d.x * t, y: this.pos.y + d.y * t, z: planeZ };
    }
    /** proietta poligono 3D con clipping sul piano vicino; ritorna array di {x,y,z} schermo */
    clipPoly(pts) {
      const vs = pts.map((p) => this.view(p));
      const out = [];
      const n = vs.length, nz = this.near;
      for (let i = 0; i < n; i++) {
        const a = vs[i], b = vs[(i + 1) % n];
        const ina = a.z >= nz, inb = b.z >= nz;
        if (ina) out.push(a);
        if (ina !== inb) {
          const t = (nz - a.z) / (b.z - a.z);
          out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: nz });
        }
      }
      return out.map((v) => this.projectView(v));
    }
    fillPoly(ctx, pts, fill, stroke, lw) {
      const q = this.clipPoly(pts);
      if (q.length < 3) return false;
      ctx.beginPath();
      ctx.moveTo(q[0].x, q[0].y);
      for (let i = 1; i < q.length; i++) ctx.lineTo(q[i].x, q[i].y);
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
      return true;
    }
    /** linea 3D con clipping (ritorna i due punti schermo o null) */
    line(a, b) {
      let va = this.view(a), vb = this.view(b);
      const nz = this.near;
      if (va.z < nz && vb.z < nz) return null;
      if (va.z < nz) { const t = (nz - va.z) / (vb.z - va.z); va = { x: va.x + (vb.x - va.x) * t, y: va.y + (vb.y - va.y) * t, z: nz }; }
      else if (vb.z < nz) { const t = (nz - vb.z) / (va.z - vb.z); vb = { x: vb.x + (va.x - vb.x) * t, y: vb.y + (va.y - vb.y) * t, z: nz }; }
      return [this.projectView(va), this.projectView(vb)];
    }
    strokeLine(ctx, a, b, color, wMeters, minPx) {
      const l = this.line(a, b);
      if (!l) return;
      const mid = (l[0].s + l[1].s) / 2;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(minPx || 0.6, wMeters * mid);
      ctx.beginPath();
      ctx.moveTo(l[0].x, l[0].y);
      ctx.lineTo(l[1].x, l[1].y);
      ctx.stroke();
    }
    /**
     * Applica una trasformazione affine al piano definito da origin + (axisX, axisY) (vettori 3D, 1 unità = |axis|)
     * così che il contenuto 2D disegnato in `fn` aderisca al piano (numeri sulle maglie, scritte sui cartelloni)
     */
    onPlane(ctx, origin, ax, ay, fn) {
      const p0 = this.project(origin);
      const p1 = this.project(M.add(origin, ax));
      const p2 = this.project(M.add(origin, ay));
      if (!p0 || !p1 || !p2) return;
      ctx.save();
      ctx.transform(p1.x - p0.x, p1.y - p0.y, p2.x - p0.x, p2.y - p0.y, p0.x, p0.y);
      fn();
      ctx.restore();
    }
  }

  PK.Camera = Camera;
  if (typeof module !== 'undefined' && module.exports) module.exports = PK;
})(typeof window !== 'undefined' ? window : globalThis);
