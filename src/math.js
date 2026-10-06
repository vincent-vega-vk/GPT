/* Super Rigori World Cup — utilità matematiche (vettori 3D, matrici 3x3, RNG) */
(function (root) {
  'use strict';
  const PK = (root.PK = root.PK || {});
  const M = (PK.M = {});

  M.PI2 = Math.PI * 2;
  M.clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  M.lerp = (a, b, t) => a + (b - a) * t;
  M.sstep = (a, b, x) => {
    const t = M.clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  M.smooth = (t) => M.sstep(0, 1, t);
  M.damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
  M.sign = (x) => (x < 0 ? -1 : 1);

  // ---- vettori {x,y,z} ----
  M.v3 = (x = 0, y = 0, z = 0) => ({ x, y, z });
  M.add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
  M.sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
  M.mul = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
  M.addS = (a, b, s) => ({ x: a.x + b.x * s, y: a.y + b.y * s, z: a.z + b.z * s });
  M.dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  M.cross = (a, b) => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  });
  M.len = (a) => Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
  M.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  M.norm = (a) => {
    const l = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z) || 1;
    return { x: a.x / l, y: a.y / l, z: a.z / l };
  };
  M.lerp3 = (a, b, t) => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  });

  // ---- matrici 3x3 row-major ----
  const mat = (M.mat = {});
  mat.ident = () => [1, 0, 0, 0, 1, 0, 0, 0, 1];
  mat.rotX = (a) => {
    const c = Math.cos(a), s = Math.sin(a);
    return [1, 0, 0, 0, c, -s, 0, s, c];
  };
  mat.rotY = (a) => {
    const c = Math.cos(a), s = Math.sin(a);
    return [c, 0, s, 0, 1, 0, -s, 0, c];
  };
  mat.rotZ = (a) => {
    const c = Math.cos(a), s = Math.sin(a);
    return [c, -s, 0, s, c, 0, 0, 0, 1];
  };
  mat.mul = (a, b) => {
    const r = new Array(9);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
    return r;
  };
  mat.apply = (m, v) => ({
    x: m[0] * v.x + m[1] * v.y + m[2] * v.z,
    y: m[3] * v.x + m[4] * v.y + m[5] * v.z,
    z: m[6] * v.x + m[7] * v.y + m[8] * v.z,
  });
  mat.col = (m, j) => ({ x: m[j], y: m[3 + j], z: m[6 + j] });
  /** Rotazione di `ang` radianti attorno all'asse unitario (Rodrigues) */
  mat.axisAngle = (ax, ay, az, ang) => {
    const c = Math.cos(ang), s = Math.sin(ang), t = 1 - c;
    return [
      t * ax * ax + c, t * ax * ay - s * az, t * ax * az + s * ay,
      t * ax * ay + s * az, t * ay * ay + c, t * ay * az - s * ax,
      t * ax * az - s * ay, t * ay * az + s * ax, t * az * az + c,
    ];
  };
  /** Ri-ortonormalizza (Gram-Schmidt) per evitare derive numeriche */
  mat.orthonormalize = (m) => {
    let c0 = M.norm({ x: m[0], y: m[3], z: m[6] });
    let c1 = { x: m[1], y: m[4], z: m[7] };
    const d = M.dot(c0, c1);
    c1 = M.norm({ x: c1.x - c0.x * d, y: c1.y - c0.y * d, z: c1.z - c0.z * d });
    const c2 = M.cross(c0, c1);
    return [c0.x, c1.x, c2.x, c0.y, c1.y, c2.y, c0.z, c1.z, c2.z];
  };

  // ---- RNG deterministico ----
  M.rng = (seed) => {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  M.hash = (str) => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  };
  M.gauss = (rng) => {
    let u = 0;
    while (u === 0) u = rng();
    const v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v);
  };
  M.pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];
  M.shuffle = (rng, arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  /** Colori */
  M.hexToRgb = (h) => {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  M.rgb = (r, g, b, a) =>
    a === undefined
      ? `rgb(${r | 0},${g | 0},${b | 0})`
      : `rgba(${r | 0},${g | 0},${b | 0},${a})`;
  M.mix = (c1, c2, t) => {
    const a = M.hexToRgb(c1), b = M.hexToRgb(c2);
    return M.rgb(M.lerp(a[0], b[0], t), M.lerp(a[1], b[1], t), M.lerp(a[2], b[2], t));
  };
  M.shade = (c, k) => {
    const a = M.hexToRgb(c);
    return k >= 0
      ? M.rgb(M.lerp(a[0], 255, k), M.lerp(a[1], 255, k), M.lerp(a[2], 255, k))
      : M.rgb(a[0] * (1 + k), a[1] * (1 + k), a[2] * (1 + k));
  };
  M.colorDist = (c1, c2) => {
    const a = M.hexToRgb(c1), b = M.hexToRgb(c2);
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PK;
})(typeof window !== 'undefined' ? window : globalThis);
