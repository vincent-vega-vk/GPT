/* Super Rigori World Cup — HUD in-partita (HTML sopra il canvas) */
(function (root) {
  'use strict';
  const PK = (root.PK = root.PK || {});
  const doc = root.document;

  // ------------------------------------------------------------- bandiere come immagini
  const flagCache = {};
  PK.flagURL = function (team, w, h) {
    w = w || 64; h = h || 42;
    const key = team.code + w;
    if (flagCache[key]) return flagCache[key];
    const c = doc.createElement('canvas');
    c.width = w * 2; c.height = h * 2;
    const g = c.getContext('2d');
    PK.drawFlag(g, team.flag, 0, 0, w * 2, h * 2);
    // lieve riflesso lucido
    const gr = g.createLinearGradient(0, 0, 0, h * 2);
    gr.addColorStop(0, 'rgba(255,255,255,0.28)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.2)');
    g.fillStyle = gr; g.fillRect(0, 0, w * 2, h * 2);
    return (flagCache[key] = c.toDataURL());
  };

  const HUD = {
    els: null,
    handlers: {},
    init() {
      const $ = (id) => doc.getElementById(id);
      this.els = {
        root: $('hud'), sb: $('scoreboard'), stage: $('stage-label'), kinfo: $('kick-info'),
        a: $('team-a'), b: $('team-b'), comm: $('commentary'), prompt: $('prompt'),
        ctlKick: $('ctl-kick'), ctlSave: $('ctl-save'), power: $('power'), zone: $('power-zone'), fill: $('power-fill'), cursor: $('power-cursor'),
        btnKick: $('btn-kick'), btnSuper: $('btn-super'), btnSuper2: $('btn-super2'), spin: $('spin'),
        pressure: $('pressure'),
      };
      const e = this.els;
      e.btnKick.addEventListener('pointerdown', (ev) => { ev.preventDefault(); ev.stopPropagation(); this.handlers.kick && this.handlers.kick(); });
      [e.btnSuper, e.btnSuper2].forEach((b) => b.addEventListener('pointerdown', (ev) => { ev.preventDefault(); ev.stopPropagation(); this.handlers.super && this.handlers.super(); }));
      e.spin.querySelectorAll('button').forEach((b) =>
        b.addEventListener('pointerdown', (ev) => { ev.preventDefault(); ev.stopPropagation(); this.handlers.spin && this.handlers.spin(+b.dataset.spin); })
      );
    },
    bind(h) { this.handlers = h || {}; },
    show(on) { this.els.root.classList.toggle('hidden', !on); },

    setTeams(A, B, playerSide) {
      const e = this.els;
      [[e.a, A, 'A'], [e.b, B, 'B']].forEach(([el, t, side]) => {
        el.querySelector('.flag').src = PK.flagURL(t);
        el.querySelector('.code').textContent = t.code;
        el.querySelector('.name').textContent = t.name;
        el.classList.toggle('me', playerSide === side);
      });
    },
    setStage(label, mode) {
      this.els.stage.textContent = label || '';
      this.els.stage.dataset.mode = mode || '';
    },
    setScore(a, b) {
      const e = this.els;
      const sa = e.a.querySelector('.score'), sb = e.b.querySelector('.score');
      [[sa, a], [sb, b]].forEach(([el, v]) => {
        if (el.textContent !== String(v)) {
          el.textContent = v;
          el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
        }
      });
    },
    /** results: {A:[bool], B:[bool]} ; n = numero di pallini; cur = {team, idx} */
    setDots(results, n, cur) {
      [['A', this.els.a], ['B', this.els.b]].forEach(([side, el]) => {
        const box = el.querySelector('.dots');
        let html = '';
        for (let i = 0; i < n; i++) {
          const r = results[side][i];
          let cls = 'dot';
          if (r === true) cls += ' goal';
          else if (r === false) cls += ' miss';
          if (cur && cur.team === side && cur.idx === i) cls += ' cur';
          if (i >= 5) cls += ' sd';
          html += `<i class="${cls}"></i>`;
        }
        box.innerHTML = html;
      });
    },
    setSuper(charges, playerSide, armed) {
      const e = this.els;
      ['A', 'B'].forEach((side) => {
        const box = (side === 'A' ? e.a : e.b).querySelector('.supers');
        const c = charges[side];
        box.innerHTML = '<b title="Super tiro">⚡' + c.kick + '</b><b class="gk" title="Super parata">🧤' + c.save + '</b>';
      });
      const my = playerSide ? charges[playerSide] : { kick: 0, save: 0 };
      e.btnSuper.classList.toggle('armed', !!armed);
      e.btnSuper2.classList.toggle('armed', !!armed);
      e.btnSuper.disabled = my.kick <= 0;
      e.btnSuper2.disabled = my.save <= 0;
      e.btnSuper.querySelector('.n').textContent = my.kick;
      e.btnSuper2.querySelector('.n').textContent = my.save;
    },
    comment(text) {
      const el = this.els.comm;
      el.textContent = text;
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    },
    setKicker(name, number, team, sit) {
      const el = this.els.kinfo;
      const fl = '<img src="' + PK.flagURL(team, 28, 18) + '" alt="">';
      el.innerHTML = fl + `<b>#${number}</b> ${name}` + (sit && sit.pressure > 0.75 ? ' <em>🔥</em>' : '');
    },
    setPrompt(text) {
      const el = this.els.prompt;
      el.textContent = text || '';
      el.classList.toggle('hidden', !text);
    },
    setMode(mode) {
      const e = this.els;
      e.ctlKick.classList.toggle('hidden', mode !== 'kick');
      e.ctlSave.classList.toggle('hidden', mode !== 'save');
    },
    setPower(p, zone, armed) {
      const e = this.els;
      if (p == null) {
        e.power.classList.remove('live');
        e.fill.style.width = '0%';
        e.cursor.style.left = '0%';
      } else {
        e.power.classList.add('live');
        e.fill.style.width = (p * 100).toFixed(1) + '%';
        e.cursor.style.left = (p * 100).toFixed(1) + '%';
        e.power.classList.toggle('inzone', p >= zone.lo && p <= zone.hi);
      }
      e.zone.style.left = zone.lo * 100 + '%';
      e.zone.style.width = (zone.hi - zone.lo) * 100 + '%';
      e.power.classList.toggle('armed', !!armed);
    },
    setSpin(c) {
      this.els.spin.querySelectorAll('button').forEach((b) => b.classList.toggle('on', +b.dataset.spin === c));
    },
  };
  PK.HUD = HUD;
})(typeof window !== 'undefined' ? window : globalThis);
