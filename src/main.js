/* Super Rigori World Cup — avvio, ciclo di gioco, input e flusso del torneo */
(function (root) {
  'use strict';
  const PK = (root.PK = root.PK || {});
  const M = PK.M;
  const doc = root.document;
  const SAVE_KEY = 'superrigori.v1';

  // ------------------------------------------------------------ persistenza (con try/catch)
  const store = {
    get() { try { return JSON.parse(root.localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return null; } },
    set(v) { try { root.localStorage.setItem(SAVE_KEY, JSON.stringify(v)); } catch (e) { /* ignorato */ } },
    clear() { try { root.localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignorato */ } },
  };

  const G = (PK.Game = {
    canvas: null, ctx: null, w: 1280, h: 720, dpr: 1,
    tour: null, match: null, screen: 'title', paused: false,
    settings: { difficulty: 'normal', muted: false },
    hubTab: 'match', lastRound: null, lastResult: null, lastMatch: null,
    attract: null, now: 0, auto: false,

    init() {
      this.canvas = doc.getElementById('stage');
      this.ctx = this.canvas.getContext('2d');
      PK.HUD.init();
      const saved = store.get();
      if (saved && saved.settings) Object.assign(this.settings, saved.settings);
      PK.Audio.setMuted(!!this.settings.muted);
      this.syncMuteButton();
      this.attract = new Attract();
      this.resize();
      root.addEventListener('resize', () => this.resize());
      root.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 150));
      this.bindInput();
      PK.HUD.bind({
        kick: () => this.match && this.match.pressKick(),
        spin: (c) => this.match && this.match.setCurve(this.match.curve === c && c !== 0 ? 0 : c),
        super: () => this.match && this.match.toggleSuper(),
      });
      doc.getElementById('btn-mute').addEventListener('pointerdown', (e) => { e.stopPropagation(); PK.Audio.resume(); this.settings.muted = PK.Audio.toggleMute(); this.syncMuteButton(); this.persist(); });
      doc.getElementById('btn-pause').addEventListener('pointerdown', (e) => { e.stopPropagation(); this.pause(); });
      PK.Screens.title(this);
      let last = performance.now();
      const loop = (t) => {
        const dt = Math.min(0.1, (t - last) / 1000);
        last = t;
        this.now = t / 1000;
        this.frame(dt);
        root.requestAnimationFrame(loop);
      };
      root.requestAnimationFrame(loop);
    },

    syncMuteButton() {
      const b = doc.getElementById('btn-mute');
      if (b) b.textContent = this.settings.muted ? '🔇' : '🔊';
    },

    persist() {
      store.set({ settings: this.settings, tour: this.tour ? this.tour.toJSON() : null });
    },
    hasSave() {
      const s = store.get();
      return !!(s && s.tour && !s.tour.over);
    },

    // ------------------------------------------------------------------- canvas
    resize() {
      const dpr = Math.min(root.devicePixelRatio || 1, 2);
      let w = root.innerWidth, h = root.innerHeight;
      let scale = dpr;
      const maxPx = 2.4e6;
      if (w * h * scale * scale > maxPx) scale = Math.sqrt(maxPx / (w * h));
      this.dpr = scale;
      this.w = Math.round(w * scale); this.h = Math.round(h * scale);
      this.canvas.width = this.w; this.canvas.height = this.h;
      if (this.match) this.match.resize(this.w, this.h);
      const hint = doc.getElementById('rotate-hint');
      if (hint) hint.classList.toggle('on', h > w);
    },

    toCanvas(e) {
      const r = this.canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * this.w, y: ((e.clientY - r.top) / r.height) * this.h };
    },

    bindInput() {
      const cv = this.canvas;
      cv.addEventListener('pointermove', (e) => {
        if (!this.match || this.paused) return;
        if (e.pointerType === 'touch' && !(e.buttons & 1) && e.pressure === 0) return;
        const p = this.toCanvas(e);
        this.match.onCanvasPoint(p.x, p.y, e.pointerType, false);
      });
      cv.addEventListener('pointerdown', (e) => {
        PK.Audio.resume();
        if (!this.match || this.paused) return;
        e.preventDefault();
        const p = this.toCanvas(e);
        this.match.onCanvasPoint(p.x, p.y, e.pointerType, false);
        this.match.onCanvasPoint(p.x, p.y, e.pointerType, true);
      });
      root.addEventListener('keydown', (e) => {
        PK.Audio.resume();
        if (e.code === 'Escape') { if (this.match) this.pause(); return; }
        if (e.code === 'KeyM') { this.settings.muted = PK.Audio.toggleMute(); this.syncMuteButton(); this.persist(); return; }
        if (!this.match || this.paused) return;
        if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
        if (!e.repeat) this.match.key(e.code, true);
        else this.match.keys[e.code] = true;
      });
      root.addEventListener('keyup', (e) => { if (this.match) this.match.key(e.code, false); });
      root.addEventListener('blur', () => { if (this.match && !this.paused) this.pause(); });
    },

    // -------------------------------------------------------------------- ciclo
    frame(dt) {
      const ctx = this.ctx;
      if (this.match && !this.paused) {
        this.match.update(dt);
        this.match.draw(ctx, this.w, this.h);
      } else if (this.match && this.paused) {
        // fermo: ridisegna l'ultimo stato
        this.match.draw(ctx, this.w, this.h);
      } else {
        this.attract.draw(ctx, this.w, this.h, dt, this.screen);
      }
    },

    // ----------------------------------------------------------------- navigazione
    pause() {
      if (!this.match || this.paused || this.match.phase === 'end') return;
      this.paused = true;
      PK.Screens.pause(this);
    },
    resume() {
      this.paused = false;
      PK.Screens.clear();
    },
    quitMatch() {
      this.paused = false;
      this.match = null;
      PK.HUD.show(false);
      PK.Screens.clear();
      this.persist();
      if (this.tour) PK.Screens.hub(this); else PK.Screens.title(this);
    },

    newTournament(code) {
      this.tour = new PK.Tournament({ player: code, difficulty: this.settings.difficulty });
      this.persist();
      PK.Screens.draw(this);
    },
    continueTournament() {
      const s = store.get();
      if (!s || !s.tour) return;
      this.tour = PK.Tournament.fromJSON(s.tour);
      if (s.settings) Object.assign(this.settings, s.settings);
      PK.Screens.hub(this);
    },

    /** avvia la partita del giocatore nel turno corrente */
    playNext(auto) {
      const t = this.tour;
      const m = t.playerMatch();
      if (!m) return;
      PK.Audio.resume();
      const ko = t.round.stage === 'ko';
      PK.Screens.clear();
      PK.HUD.show(true);
      this.lastMatch = m;
      this.paused = false;
      this.match = new PK.Match({
        teamA: PK.TEAM[m.a], teamB: PK.TEAM[m.b], playerSide: m.a === t.player ? 'A' : 'B',
        mode: ko ? 'knockout' : 'group', stage: m.stage, label: t.round.label, difficulty: this.settings.difficulty,
        auto: !!auto || this.auto, first: this.forceFirst || null,
        onFinish: (res) => this.afterMatch(m, res),
      });
      this.match.resize(this.w, this.h);
    },

    simulatePlayerMatch() {
      const t = this.tour;
      const m = t.playerMatch();
      if (!m) return;
      this.afterMatch(m, t.simulate(m), true);
    },

    afterMatch(m, result, simulated) {
      const t = this.tour;
      this.match = null;
      PK.HUD.show(false);
      t.recordResult(m.id, result);
      t.simulateRound(false);
      this.lastRound = t.round;
      this.lastResult = { match: m, result, simulated: !!simulated, roundLabel: t.round.label, roundStage: t.round.stage, group: m.group || null };
      t.advance();
      this.persist();
      PK.Screens.result(this);
    },

    /** dopo la schermata dei risultati: prossimo turno, eliminazione o fine torneo */
    afterResult() {
      const t = this.tour;
      if (t.over) return PK.Screens.end(this);
      if (!t.playerMatch()) return PK.Screens.end(this);
      PK.Screens.hub(this);
    },

    simulateRest() {
      const t = this.tour;
      let guard = 0;
      while (!t.over && guard++ < 12) {
        t.simulateRound(false);
        t.advance();
      }
      this.persist();
      PK.Screens.end(this);
    },

    /** partita dimostrativa IA contro IA (fuori dal torneo) */
    startDemo() {
      const top = PK.TEAMS.slice().sort((a, b) => PK.teamOverall(b) - PK.teamOverall(a)).slice(0, 12);
      const a = top[Math.floor(Math.random() * top.length)];
      let b = a;
      while (b === a) b = top[Math.floor(Math.random() * top.length)];
      PK.Audio.resume();
      PK.Screens.clear();
      PK.HUD.show(true);
      this.tour = null;
      this.paused = false;
      this.match = new PK.Match({
        teamA: a, teamB: b, playerSide: null, mode: 'knockout', stage: 'F', label: 'Demo — Finale', difficulty: this.settings.difficulty, auto: true,
        onFinish: () => this.toTitle(),
      });
      this.match.resize(this.w, this.h);
    },

    toTitle() {
      this.match = null;
      PK.HUD.show(false);
      PK.Screens.title(this);
    },
  });

  // ------------------------------------------------- sfondo animato per i menu
  class Attract {
    constructor() {
      this.cam = new PK.Camera();
      const a = PK.TEAM.ITA, b = PK.TEAM.BRA;
      this.kits = PK.pickKits(a, b, 2);
      this.pano = {
        far: PK.Stadium.makePanorama({ seed: 5, colA: this.kits.a.shirt, colB: this.kits.b.shirt }),
        near: PK.Stadium.makePanorama({ seed: 6, colA: this.kits.b.shirt, colB: this.kits.a.shirt }),
      };
      this.keeper = new PK.Keeper({});
      this.sim = new PK.Phys.Sim(this.keeper, { t0: 0 });
      this.sq = PK.buildSquad(a); this.sq2 = PK.buildSquad(b);
      this.kicker = new PK.Kicker({ foot: 'R', aimX: 2 });
      this.t = 0;
      this.fx = new PK.FX.Particles();
      this.champion = null;
      this.skip = 0;
    }
    setChampion(team) { this.champion = team; this.fx.list.length = 0; this.cT = 0; }
    draw(ctx, w, h, dt, screen) {
      this.skip = (this.skip + 1) % 2;
      this.t += dt;
      if (screen !== 'champion' && this.skip) return; // 30 fps sui menu
      const cam = this.cam;
      cam.setSize(w, h);
      const k = this.t * 0.12;
      cam.pos = { x: Math.sin(k) * 3.2, y: 2.4 + Math.sin(k * 1.7) * 0.4, z: -8.5 + Math.cos(k * 0.8) * 1.2 };
      cam.target = { x: Math.sin(k) * 0.5, y: 1.2, z: 11 };
      cam.f = cam.baseF() * 1.35;
      this.keeper.dive = null;
      const gsk = this.keeper.skeleton(this.t);
      const ksk = this.kicker.skeleton(-1.4);
      const kit = this.kits.a;
      const look = (p, kt, gk) => ({ skin: p.skin, hair: p.hair, hairStyle: p.hairStyle, shirt: kt.shirt, trim: kt.trim, shorts: kt.shorts, socks: kt.socks, gloves: gk ? kt.gloves : null, number: p.number, name: p.name, expr: 'focus' });
      PK.Scene.draw(ctx, cam, {
        t: this.t, energy: screen === 'champion' ? 0.9 : 0.25, pano: this.pano, net: this.sim.net,
        keeper: { sk: gsk, look: look(this.sq2.gk, this.kits.gkB, true) },
        kicker: { sk: ksk, look: look(this.sq.kickers[4], kit, false) },
        ball: this.sim.ball, ballOpts: {},
      });
      PK.FX.crowdFlashes(ctx, w, h, this.t, screen === 'champion' ? 34 : 10, h * 0.02, h * 0.36);
      if (screen === 'champion') {
        this.cT = (this.cT || 0) + dt;
        if (Math.random() < 0.5) this.fx.burst('conf', { x: (Math.random() - 0.5) * 8, y: 6, z: 8 }, 4, { speed: 2, up: 1, life: 4, size: 0.1, col: [this.champion ? this.champion.kit.shirt : '#fff', '#ffd23a', '#ffffff', '#ff3d6b'], g: 2.2 });
        this.fx.update(dt);
        this.fx.draw(ctx, cam);
      }
      PK.FX.vignette(ctx, w, h, 0.5);
    }
  }

  if (doc.readyState === 'loading') root.addEventListener('DOMContentLoaded', () => G.init());
  else G.init();
})(typeof window !== 'undefined' ? window : globalThis);
