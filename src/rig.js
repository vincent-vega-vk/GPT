/* Super Rigori World Cup — scheletro umano: IK a due ossa, usato sia per il disegno sia per le collisioni
 *
 * Sistema di riferimento del mondo (mancino): x = destra, y = su, z = verso la porta.
 * Locale del personaggio: +x = sua destra, +y = alto, +z = davanti.
 */
(function (root) {
  'use strict';
  const PK = (root.PK = root.PK || {});
  const M = PK.M;
  const mat = M.mat;

  const D = {
    thigh: 0.45, shin: 0.44, upper: 0.29, fore: 0.26, hand: 0.1,
    torso: 0.5, neck: 0.09, head: 0.13, shW: 0.21, hipW: 0.1, foot: 0.21, ankleH: 0.07,
  };

  /** IK a due ossa: restituisce {mid, end} ; il segmento viene accorciato/clampato se il bersaglio è fuori portata */
  function ik2(A, T, l1, l2, pole) {
    let dx = T.x - A.x, dy = T.y - A.y, dz = T.z - A.z;
    let d = Math.hypot(dx, dy, dz);
    if (d < 1e-6) { dx = 0; dy = -1; dz = 0; d = 1; }
    const ux = dx / d, uy = dy / d, uz = dz / d;
    const maxd = l1 + l2 - 1e-4, mind = Math.abs(l1 - l2) + 1e-3;
    const dc = d > maxd ? maxd : d < mind ? mind : d;
    const a = (l1 * l1 - l2 * l2 + dc * dc) / (2 * dc);
    const h = Math.sqrt(Math.max(l1 * l1 - a * a, 0));
    const pu = pole.x * ux + pole.y * uy + pole.z * uz;
    let px = pole.x - ux * pu, py = pole.y - uy * pu, pz = pole.z - uz * pu;
    let pl = Math.hypot(px, py, pz);
    if (pl < 1e-5) { px = 0; py = 0; pz = 1; pl = 1; }
    px /= pl; py /= pl; pz /= pl;
    return {
      mid: { x: A.x + ux * a + px * h, y: A.y + uy * a + py * h, z: A.z + uz * a + pz * h },
      end: { x: A.x + ux * dc, y: A.y + uy * dc, z: A.z + uz * dc },
    };
  }

  /**
   * pose: { pelvis, R (3x3 radice), lean, twist, headYaw, headPitch, footL, footR (caviglie), handL, handR (polsi),
   *         toeL, toeR (beccheggio piede), legPole, armPoleL, armPoleR (in locale), scale }
   */
  function solve(pose) {
    const R = pose.R || mat.ident();
    const L = (v) => mat.apply(R, v); // locale -> mondo (radice)
    const sc = pose.scale || 1;
    const pel = pose.pelvis;
    const lean = pose.lean || 0, twist = pose.twist || 0;
    const Rc = mat.mul(R, mat.mul(mat.rotZ(pose.roll || 0), mat.mul(mat.rotX(lean), mat.rotY(twist))));
    const C = (v) => mat.apply(Rc, v);
    const chest = M.add(pel, C({ x: 0, y: D.torso * sc, z: 0 }));
    const Rh = mat.mul(Rc, mat.mul(mat.rotY(pose.headYaw || 0), mat.rotX(pose.headPitch || 0)));
    const neck = M.add(chest, C({ x: 0, y: D.neck * sc, z: 0 }));
    const head = M.add(neck, mat.apply(Rh, { x: 0, y: D.head * 1.0 * sc, z: 0.0 }));
    const sh = D.shW * sc;
    const shoulderR = M.add(chest, C({ x: sh, y: -0.03, z: 0 }));
    const shoulderL = M.add(chest, C({ x: -sh, y: -0.03, z: 0 }));
    const hipR = M.add(pel, L({ x: D.hipW * sc, y: -0.04, z: 0 }));
    const hipL = M.add(pel, L({ x: -D.hipW * sc, y: -0.04, z: 0 }));

    const lp = pose.legPole || { x: 0, y: 0, z: 1 };
    const apR = pose.armPoleR || { x: 0.5, y: -0.4, z: -0.6 };
    const apL = pose.armPoleL || { x: -0.5, y: -0.4, z: -0.6 };
    const legR = ik2(hipR, pose.footR, D.thigh * sc, D.shin * sc, L({ x: lp.x + 0.12, y: lp.y, z: lp.z }));
    const legL = ik2(hipL, pose.footL, D.thigh * sc, D.shin * sc, L({ x: lp.x - 0.12, y: lp.y, z: lp.z }));
    const armR = ik2(shoulderR, pose.handR, D.upper * sc, D.fore * sc, pose.armPoleWorld ? apR : C(apR));
    const armL = ik2(shoulderL, pose.handL, D.upper * sc, D.fore * sc, pose.armPoleWorld ? apL : C(apL));

    const toe = (ankle, pitch, yaw) => {
      const Rf = mat.mul(R, mat.mul(mat.rotY(yaw || 0), mat.rotX(pitch == null ? 0.34 : pitch)));
      return M.add(ankle, mat.apply(Rf, { x: 0, y: 0, z: D.foot * sc }));
    };
    const handTip = (el, wr) => {
      const d = M.norm(M.sub(wr, el));
      return M.addS(wr, d, D.hand * sc);
    };
    return {
      sc, R, Rc, Rh,
      pelvis: pel, chest, neck, head,
      headFwd: mat.apply(Rh, { x: 0, y: 0, z: 1 }),
      headUp: mat.apply(Rh, { x: 0, y: 1, z: 0 }),
      headRight: mat.apply(Rh, { x: 1, y: 0, z: 0 }),
      shoulderR, shoulderL, hipR, hipL,
      elbowR: armR.mid, wristR: armR.end, handTipR: handTip(armR.mid, armR.end),
      elbowL: armL.mid, wristL: armL.end, handTipL: handTip(armL.mid, armL.end),
      kneeR: legR.mid, ankleR: legR.end, toeR: toe(legR.end, pose.toeR, pose.footYawR),
      kneeL: legL.mid, ankleL: legL.end, toeL: toe(legL.end, pose.toeL, pose.footYawL),
    };
  }

  /** Capsule di collisione {a,b,r,tag} dello scheletro risolto */
  function capsules(sk, glove) {
    const s = sk.sc;
    const gr = glove || 0.12;
    return [
      { a: sk.pelvis, b: sk.chest, r: 0.19 * s, tag: 'torso' },
      { a: sk.head, b: sk.head, r: 0.125 * s, tag: 'head' },
      { a: sk.shoulderR, b: sk.elbowR, r: 0.06 * s, tag: 'arm' },
      { a: sk.elbowR, b: sk.wristR, r: 0.055 * s, tag: 'arm' },
      { a: sk.wristR, b: sk.handTipR, r: gr, tag: 'hand' },
      { a: sk.shoulderL, b: sk.elbowL, r: 0.06 * s, tag: 'arm' },
      { a: sk.elbowL, b: sk.wristL, r: 0.055 * s, tag: 'arm' },
      { a: sk.wristL, b: sk.handTipL, r: gr, tag: 'hand' },
      { a: sk.hipR, b: sk.kneeR, r: 0.095 * s, tag: 'leg' },
      { a: sk.kneeR, b: sk.ankleR, r: 0.07 * s, tag: 'leg' },
      { a: sk.ankleR, b: sk.toeR, r: 0.06 * s, tag: 'leg' },
      { a: sk.hipL, b: sk.kneeL, r: 0.095 * s, tag: 'leg' },
      { a: sk.kneeL, b: sk.ankleL, r: 0.07 * s, tag: 'leg' },
      { a: sk.ankleL, b: sk.toeL, r: 0.06 * s, tag: 'leg' },
    ];
  }

  PK.Rig = { D, solve, capsules, ik2 };
  if (typeof module !== 'undefined' && module.exports) module.exports = PK;
})(typeof window !== 'undefined' ? window : globalThis);
