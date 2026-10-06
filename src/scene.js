/* Super Rigori World Cup — compositore di scena: disegna lo stadio e ordina per profondità gli oggetti dinamici */
(function (root) {
  'use strict';
  const PK = (root.PK = root.PK || {});
  const M = PK.M;
  const S = PK.Stadium, C = PK.Chars;

  /**
   * st: { t, energy, pano, net, keeper:{sk,look}, kicker:{sk,look}|null, ball:{p,rot}, ballOpts, extra:[{key,draw}] }
   */
  let ghost = null;
  /** disegna `fn` su un livello offscreen e lo compone con opacità `a` (niente doppie sovrapposizioni) */
  function withAlpha(ctx, a, fn) {
    if (a >= 0.98) return fn(ctx);
    const cv = ctx.canvas;
    if (!ghost || ghost.width !== cv.width || ghost.height !== cv.height) {
      ghost = cv.ownerDocument.createElement('canvas');
      ghost.width = cv.width; ghost.height = cv.height;
    }
    const g = ghost.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, ghost.width, ghost.height);
    fn(g);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.drawImage(ghost, 0, 0);
    ctx.restore();
  }

  function draw(ctx, cam, st) {
    cam.update();
    S.drawBackdrop(ctx, cam, st.pano, st.t, st.energy || 0);
    S.drawPitch(ctx, cam);
    S.drawLines(ctx, cam);
    S.drawBoards(ctx, cam, st.t);
    // ombre a terra
    if (st.keeper) C.drawHumanoidShadow(ctx, cam, st.keeper.sk, 0.3);
    if (st.kicker) C.drawHumanoidShadow(ctx, cam, st.kicker.sk, 0.3);
    if (st.ball) C.drawBallShadow(ctx, cam, st.ball);
    // oggetti ordinati per profondità (dal più lontano)
    const list = S.goalDrawables(cam, st.net);
    if (st.keeper) list.push({ key: cam.depth(st.keeper.sk.pelvis), draw: (c) => C.drawHumanoid(c, cam, st.keeper.sk, st.keeper.look) });
    if (st.kicker) {
      const kd = cam.depth(st.kicker.sk.pelvis);
      // se il rigorista è troppo vicino alla camera diventa semitrasparente (non copre l'azione)
      const ka = M.clamp((kd - 3.6) / 3.8, 0.2, 1);
      list.push({ key: kd, draw: (c) => withAlpha(c, ka, (g) => C.drawHumanoid(g, cam, st.kicker.sk, st.kicker.look)) });
    }
    if (st.ball) list.push({ key: cam.depth(st.ball.p) + (cam.behindGoal ? 0 : 0), draw: (c) => C.drawBall(c, cam, st.ball, st.ballOpts) });
    (st.extra || []).forEach((e) => list.push(e));
    list.sort((a, b) => b.key - a.key);
    for (const o of list) o.draw(ctx);
  }

  PK.Scene = { draw };
  if (typeof module !== 'undefined' && module.exports) module.exports = PK;
})(typeof window !== 'undefined' ? window : globalThis);
