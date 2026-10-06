/* Super Rigori World Cup — controller di una partita (serie di rigori): stati, input, IA, camera, effetti */
(function (root) {
  'use strict';
  const PK = (root.PK = root.PK || {});
  const M = PK.M;
  const { clamp, lerp } = M;
  const GOAL = PK.Phys.GOAL;
  const other = (t) => (t === 'A' ? 'B' : 'A');
  const ZONE = { lo: 0.72, hi: 0.88 };
  const CAM = {
    broadcast: { pos: { x: 0, y: 3.1, z: -12.6 }, tgt: { x: 0, y: 0.25, z: 11 }, zoom: 1.32 },
    goal: { pos: { x: 0, y: 2.2, z: -4.0 }, tgt: { x: 0, y: 1.2, z: 11 }, zoom: 1.5 },
  };
  const ZONES = {
    KeyQ: [-2.7, 2.0], KeyW: [0, 2.1], KeyE: [2.7, 2.0],
    KeyA: [-2.7, 1.1], KeyS: [0, 1.4], KeyD: [2.7, 1.1],
    KeyZ: [-2.7, 0.35], KeyX: [0, 0.4], KeyC: [2.7, 0.35],
    ArrowLeft: [-2.7, 1.1], ArrowRight: [2.7, 1.1], ArrowUp: [0, 2.1], ArrowDown: [0, 0.4],
  };
  const HUMAN_ERR = { easy: 0.8, normal: 1, hard: 1.1, legend: 1.2 };

  const NOHUD = new Proxy({}, { get: () => () => {} });
  const HUD = () => PK.HUD || NOHUD;
  const A = () => PK.Audio || NOHUD;

  const LINES = {
    goal: ['GOOOOL! Che rigore!', 'Il portiere non ha scampo!', 'Una freddezza glaciale!', 'Rete! Il pubblico esplode!', 'Angolino perfetto!', 'Un missile in rete!'],
    goalSpecial: ['INCREDIBILE! Il tiro ha spezzato le mani del portiere!', 'Una potenza sovrumana!', 'Nemmeno un muro l\'avrebbe fermato!'],
    saved: ['PARATA! Il portiere ci arriva!', 'Che riflessi! Respinto!', 'Il portiere indovina l\'angolo!', 'Che mano! Salvataggio incredibile!'],
    savedSpecial: ['PARATA SOVRUMANA! Il portiere è un gigante!', 'La mano divina ferma il tiro!', 'Un muro d\'acciaio! Impossibile segnare!'],
    post: ['PALO! Che sfortuna!', 'Il legno dice no!', 'Pallone sul palo, brividi!'],
    bar: ['TRAVERSA! Per un centimetro!', 'Il tiro esplode sulla traversa!'],
    wide: ['Fuori! Un errore che pesa!', 'Il pallone sfila a lato!', 'Clamoroso, calcia fuori!'],
    over: ['Alle stelle! Che errore!', 'Sopra la traversa!', 'Pallone in tribuna!'],
    postGoal: ['Palo e GOL! Che fortuna!', 'Il legno lo aiuta, è dentro!'],
  };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  class Match {
    /**
     * opts: { teamA, teamB, playerSide:'A'|'B'|null, mode:'group'|'knockout', stage:'G1'..'F', label, difficulty, auto, onFinish, seed }
     */
    constructor(opts) {
      this.o = opts;
      this.A = opts.teamA; this.B = opts.teamB;
      this.playerSide = opts.playerSide || null;
      this.auto = !!opts.auto;
      this.difficulty = opts.difficulty || 'normal';
      this.diff = PK.AI.DIFF[this.difficulty];
      this.isFinal = opts.stage === 'F';
      this.rng = M.rng((opts.seed != null ? opts.seed : Date.now()) >>> 0);
      this.squads = { A: PK.buildSquad(this.A), B: PK.buildSquad(this.B) };
      this.teams = { A: this.A, B: this.B };
      const kits = PK.pickKits(this.A, this.B, M.hash(this.A.code + this.B.code) % 7);
      this.kits = { A: kits.a, B: kits.b };
      this.gkKits = { A: kits.gkA, B: kits.gkB };
      this.first = opts.first || (this.rng() < 0.5 ? 'A' : 'B');
      this.so = new PK.Shootout(opts.mode || 'knockout', this.first);
      this.charges = { A: { kick: 1, save: 1 }, B: { kick: 1, save: 1 } };
      this.suddenGiven = false;
      this.history = { L: 0, R: 0, C: 0 };
      this.results = { A: [], B: [] };
      this.kickLog = [];
      this.cam = new PK.Camera();
      this.cam.setSize(1280, 720);
      this.w = 1280; this.h = 720;
      this.fx = new PK.FX.Particles();
      this.texts = [];
      this.t = 0;
      this.phase = 'load';
      this.pt = 0;
      this.dolly = 0; this.dollyTarget = 0;
      this.shake = 0;
      this.energy = 0.15;
      this.hitStop = 0;
      this.hitInfo = null;
      this.flashA = 0;
      this.bannerInfo = null;
      this.keys = {};
      this.reticle = { x: 0, y: 1.2 };
      this.aim = { x: 0, y: 1.2 };
      this.curve = 0;
      this.armed = false;
      this.timeScale = 1;
      this.finished = false;
      this.kickNo = 0;
      this.diveMarker = null;
      this.pano = {
        far: PK.Stadium.makePanorama({ seed: 11, colA: this.kits.A.shirt, colB: this.kits.B.shirt }),
        near: PK.Stadium.makePanorama({ seed: 23, colA: this.kits.B.shirt, colB: this.kits.A.shirt }),
      };
      this.setup();
    }

    // ------------------------------------------------------------------ setup
    setup() {
      const H = HUD();
      H.setTeams(this.A, this.B, this.playerSide);
      H.setStage(this.o.label || '', this.so.mode);
      this._refreshHud();
      this.kickNo = 0;
      this._prepareKick();
      this.phase = 'coin';
      this.pt = 0;
      const firstName = this.teams[this.first].name;
      H.comment(`Sorteggio: batte per prima ${firstName}.`);
      A().whistle();
    }

    _refreshHud() {
      const H = HUD();
      H.setScore(this.so.goals.A, this.so.goals.B);
      H.setDots(this.results, Math.max(this.so.K, this.so.taken.A, this.so.taken.B), this.so.over ? null : { team: this.so.next, idx: this.so.nextIndex });
      H.setSuper(this.charges, this.playerSide, this.armed);
    }

    squadOf(team) { return this.squads[team]; }
    kitLook(p, kit, isGK, expr) {
      return {
        skin: p.skin, hair: p.hair, hairStyle: p.hairStyle, shirt: kit.shirt, trim: kit.trim, shorts: kit.shorts, socks: kit.socks,
        gloves: isGK ? kit.gloves : null, number: p.number, name: p.name, expr: expr || 'focus',
      };
    }

    // ---------------------------------------------------------- inizio rigore
    /** crea gli oggetti di scena del prossimo rigore (senza HUD né contatori) */
    _prepareKick() {
      const so = this.so;
      this.team = so.next;
      this.opp = other(this.team);
      this.humanKicks = this.team === this.playerSide && !this.auto;
      this.humanKeeps = this.opp === this.playerSide && !this.auto;
      const sq = this.squads[this.team];
      this.kickerP = sq.kickers[so.nextIndex % sq.kickers.length];
      this.keeperP = this.squads[this.opp].gk;
      this.sit = so.situation();
      this.kicker = new PK.Kicker({ foot: this.kickerP.foot, aimX: 0 });
      this.keeper = new PK.Keeper({ seed: this.kickNo * 1.7 });
      this.sim = new PK.Phys.Sim(this.keeper, { t0: 0, onEvent: (e) => this.onSimEvent(e) });
      this.tContact = Infinity;
      this.launched = false;
      this.shot = null;
      this.plan = null;
      this.planDone = false;
      this.special = null;
      this.keeperSpecial = false;
      this.trail = [];
      this.lastTrailT = 0;
      this.timeScale = 1;
      this.armed = false;
      this.resultInfo = null;
      this.moodSet = false;
      this.humanDove = false;
      this.texts = [];
      this.wobAmp = 0.035 + 0.17 * this.sit.pressure * (1.12 - this.kickerP.comp);
      this.wobPhase = this.rng() * 6;
      this.power = 0;
      this.powerT = 0;
      this.pressureBeat = 0;
      this.disp = 1.25 * PK.AI.kickSigma(this.kickerP, 0.8, this.sit.pressure, { sweet: true, errMul: HUMAN_ERR[this.difficulty] });
    }

    beginKick() {
      const so = this.so;
      this._prepareKick();
      if (so.sudden && !this.suddenGiven) {
        this.suddenGiven = true;
        ['A', 'B'].forEach((k) => { this.charges[k].kick++; this.charges[k].save++; });
      }
      this.kickNo++;
      this.dollyTarget = 0;
      const H = HUD();
      this._refreshHud();
      const tn = this.teams[this.team].name;
      const num = so.nextIndex + 1;
      const info = so.sudden ? `Oltranza — ${tn}` : `Rigore ${num} — ${tn}`;
      H.setKicker(`${this.kickerP.initial}. ${this.kickerP.name}`, this.kickerP.number, this.teams[this.team], this.sit);
      H.comment(info + (this.sit.mustScore ? ' · DEVE SEGNARE!' : this.sit.matchPoint ? ' · può chiudere la partita' : ''));
      this._enterPhase('after-setup');
    }

    _enterPhase(x) {
      // intro pannelli se il rigore è importante
      const important = this.kickNo === 1 || this.sit.decisive || this.sit.sudden || this.isFinal;
      if (important) {
        this.phase = 'intro';
        this.pt = 0;
        this.introDur = this.kickNo === 1 || this.sit.decisive || this.sit.sudden ? 2.0 : 1.15;
        A().whoosh();
      } else this._startControl();
      void x;
    }

    _startControl() {
      const H = HUD();
      this.pt = 0;
      if (this.auto) {
        this.phase = 'ready';
        this.readyT = 0.6;
        H.setMode('none');
        return;
      }
      if (this.humanKicks) {
        this.phase = 'aim';
        H.setMode('kick');
        H.setPrompt('Mira con il mouse/dito, poi premi TIRA e blocca la potenza nella zona verde');
        H.setPower(null, ZONE, false);
        H.setSpin(this.curve);
        this._refreshHud();
      } else {
        this.phase = 'ready';
        this.readyT = 1.1 + this.rng() * 0.9;
        H.setMode('save');
        H.setPrompt('PORTIERE! Clicca/tocca dove tuffarti (Q W E / A S D / Z X C). Puoi anticipare il tiro!');
      }
    }

    // ------------------------------------------------------------------ input
    onCanvasPoint(x, y, pointerType, down) {
      this.lastPt = { x, y };
      if (this.phase === 'aim' || this.phase === 'power') {
        const p = this.cam.unprojectZ(x, y - (pointerType === 'touch' ? this.h * 0.09 : 0), GOAL.Z);
        if (p) { this.aim.x = clamp(p.x, -5.2, 5.2); this.aim.y = clamp(p.y, 0.05, 3.5); }
      }
      if (!down) return;
      if (this.phase === 'intro') { this.pt = this.introDur; return; }
      if (this.phase === 'result' && this.pt > 0.7) { this.pt = 99; return; }
      if (this.phase === 'end') { this.advanceFromEnd(); return; }
      if (this.humanKicks && pointerType !== 'touch') this.pressKick();
      else if (this.humanKeeps && ['ready', 'run', 'flight'].includes(this.phase)) {
        const p = this.cam.unprojectZ(x, y, GOAL.Z);
        if (p) this.humanDive({ x: p.x, y: clamp(p.y, 0.1, 3.0) });
      }
    }

    key(code, down) {
      this.keys[code] = down;
      if (!down) return;
      if (this.phase === 'intro') { this.pt = this.introDur; return; }
      if (this.phase === 'result' && this.pt > 0.7) { this.pt = 99; return; }
      if (this.phase === 'end') { this.advanceFromEnd(); return; }
      if (code === 'KeyF') this.toggleSuper();
      if (this.humanKicks) {
        if (code === 'Space' || code === 'Enter') this.pressKick();
        if (code === 'KeyQ') this.setCurve(this.curve === -1 ? 0 : -1);
        if (code === 'KeyE') this.setCurve(this.curve === 1 ? 0 : 1);
      } else if (this.humanKeeps && ZONES[code] && ['ready', 'run', 'flight'].includes(this.phase)) {
        const z = ZONES[code];
        this.humanDive({ x: z[0], y: z[1] });
      }
    }

    setCurve(c) { this.curve = c; HUD().setSpin(c); A().tick(); }

    toggleSuper() {
      const side = this.playerSide;
      if (!side || this.auto) return;
      const ch = this.charges[side];
      const need = this.humanKicks ? ch.kick : ch.save;
      if (need <= 0) { HUD().comment('Nessun SUPER disponibile!'); return; }
      if (this.sim && this.sim.launched && this.humanKicks) return;
      this.armed = !this.armed;
      HUD().setSuper(this.charges, this.playerSide, this.armed);
      this.armed ? A().select() : A().tick();
    }

    pressKick() {
      if (this.phase === 'aim') {
        this.phase = 'power';
        this.powerT = 0;
        this.power = 0;
        HUD().setPrompt('Ferma la barra nella zona verde per un tiro perfetto!');
        A().tick();
      } else if (this.phase === 'power') {
        this.lockPower();
      }
    }

    humanDive(target) {
      if (this.humanDove || !this.sim || this.sim.result) return;
      let special = false;
      if (this.armed && this.charges[this.playerSide].save > 0) {
        special = true;
        this.charges[this.playerSide].save--;
        this.armed = false;
        this.keeperSpecial = true;
        const ks = PK.KEEPER_SPECIALS[this.keeperP.keeperSpecial % PK.KEEPER_SPECIALS.length];
        this.hitStop = 0.75;
        this.hitInfo = { kind: 'keeper', name: ks, who: this.keeperP.name, spec: { col: ['#ffd23a', '#ff8f00', '#fff6c8'], name: ks } };
        A().special();
        this._refreshHud();
      }
      this.humanDove = true;
      this.keeper.command(this.sim.t, target, { special });
      this.diveMarker = { x: target.x, y: target.y, t0: this.t };
      HUD().setPrompt('');
      A().whoosh();
      if (this.phase === 'ready') this.startRun();
    }

    // ----------------------------------------------------------------- potenza
    lockPower() {
      const p = this.power;
      const sweet = p >= ZONE.lo && p <= ZONE.hi;
      const over = p > ZONE.hi ? 1.0 + (p - ZONE.hi) * 3.2 : 1;
      const ch = this.charges[this.team];
      let spec = null;
      if (this.armed && sweet && ch.kick > 0) {
        ch.kick--;
        spec = PK.SPECIALS[this.kickerP.special];
      }
      const sigma = PK.AI.kickSigma(this.kickerP, p, this.sit.pressure, { sweet, errMul: HUMAN_ERR[this.difficulty] }) * over;
      const aimPt = { x: this.reticle.x, y: this.reticle.y };
      const target = PK.AI.applyError(aimPt, sigma, this.rng);
      this.shot = { target, power: Math.max(p, 0.25), curve: this.curve, spec, sigma, aimPt, sweet };
      this.history[aimPt.x < -1.2 ? 'L' : aimPt.x > 1.2 ? 'R' : 'C']++;
      this.kicker.aimX = target.x;
      A().tick();
      HUD().setMode('none');
      HUD().setPower(null, ZONE, false);
      HUD().setPrompt('');
      if (this.armed && !spec) HUD().comment('Fuori dalla zona verde: tiro normale');
      this.armed = false;
      this.startRun();
    }

    startRun() {
      if (this.phase === 'run' || this.phase === 'flight') return;
      this.phase = 'run';
      this.pt = 0;
      this.tContact = this.sim.t + PK.Kicker.T_RUN;
      A().whistle();
      HUD().setPrompt(this.humanKeeps ? 'TUFFATI!' : '');
      if (!this.humanKicks && !this.humanKeeps) HUD().setMode('none');
      // piano del portiere AI (quando tira l'umano o in modalità auto)
      if (!this.humanKeeps) {
        this.plan = PK.AI.keeperPlan({
          rng: this.rng, difficulty: this.difficulty, gk: this.teams[this.opp].gk,
          history: this.team === this.playerSide ? this.history : null, specialLeft: this.charges[this.opp].save, sit: this.sit,
        });
        if (this.plan.special) this.charges[this.opp].save--, (this.keeperSpecial = true);
      }
    }

    // ------------------------------------------------------------------ contatto
    doContact() {
      this.launched = true;
      const team = this.team;
      if (!this.shot) {
        // rigorista AI
        const dive = this.keeper.dive ? this.keeper.dive.dir : 0;
        const ch = PK.AI.kickerChoice(this.kickerP, {
          rng: this.rng, difficulty: this.difficulty, sit: this.sit, specialLeft: this.charges[team].kick, keeperDir: dive,
        });
        let spec = null;
        if (ch.special && this.charges[team].kick > 0) { this.charges[team].kick--; spec = PK.SPECIALS[this.kickerP.special]; }
        const target = PK.AI.applyError(ch.target, ch.sigma, this.rng);
        this.shot = { target, power: ch.power, curve: ch.curve, spec, sigma: ch.sigma };
        this.kicker.aimX = target.x;
      }
      const s = this.shot;
      const solved = PK.Phys.solveShot(s.target, s.power, s.curve, s.spec, { curveSign: s.target.x < 0 ? -1 : 1, phase: 0.7 + this.kickNo });
      this.special = s.spec;
      // scontro tra super: decide se sfonda
      if (this.special && this.keeperSpecial) {
        const kp = this.kickerP.pow * 100;
        const gp = this.teams[this.opp].gk;
        this.sim.breakThrough = this.rng() < clamp(0.5 + (kp - gp) * 0.012, 0.25, 0.75);
      }
      this.sim.launch({ v: solved.v, w: solved.w, wob: solved.wob, special: !!this.special });
      this.solved = solved;
      this.phase = 'flight';
      this.pt = 0;
      this.dollyTarget = 1;
      this.shake = Math.max(this.shake, 5 + 8 * s.power);
      this.flashA = this.special ? 0.9 : 0.25;
      // zolle di terra
      this.fx.burst('dust', { x: 0, y: 0.05, z: -0.1 }, 16, { speed: 3.4, up: 3, life: 0.9, size: 0.05, col: ['#3a7a2e', '#2a6a28', '#5a8a3a', '#6b5a2a'] });
      A().kick(s.power);
      this.timeScale = this.humanKeeps ? this.diff.slow : 0.55;
      if (this.special) {
        this.hitStop = 0.95;
        this.hitInfo = { kind: 'kick', name: this.special.name, who: this.kickerP.name, spec: this.special };
        this.timeScale = 0.3;
        A().special();
      }
      HUD().setPrompt(this.humanKeeps ? 'Tuffati!' : '');
      const kmh = Math.round(solved.speed * 3.6);
      this.speedText = `${kmh} km/h`;
    }

    // ------------------------------------------------------------- eventi fisici
    onSimEvent(ev) {
      const sim = this.sim;
      const wp = (x, y, z) => ({ x, y, z });
      switch (ev.type) {
        case 'post': case 'bar':
          this.shake = Math.max(this.shake, 14);
          ev.type === 'post' ? A().post() : A().bar();
          this.fx.burst('spark', wp(ev.x, ev.y, GOAL.Z - 0.1), 18, { speed: 4, up: 2, life: 0.6, size: 0.035, col: ['#fff6a8', '#ffd23a', '#ffffff'], add: true });
          this.addText('CLANG!', ev.x, ev.y, GOAL.Z, 0.075, ['#ffffff', '#cfe6ff', '#6fa8ff']);
          this.flashA = Math.max(this.flashA, 0.3);
          A().oooh(1);
          break;
        case 'keeper':
          this.shake = Math.max(this.shake, 12);
          A().save();
          this.fx.burst('spark', wp(ev.x, ev.y, ev.z || GOAL.Z - 0.2), 14, { speed: 3.4, up: 1.5, life: 0.5, size: 0.03, col: ['#ffffff', '#9fd6ff'], add: true });
          this.addText(this.keeperSpecial ? 'BAAAM!' : 'PAF!', ev.x, ev.y + 0.2, GOAL.Z - 0.3, 0.07, this.keeperSpecial ? ['#fff7a8', '#ffc400', '#ff5a1f'] : ['#ffffff', '#bfe3ff', '#4aa8ff']);
          break;
        case 'catch':
          this.shake = 10;
          A().catch();
          this.addText('PRESA!', ev.x, ev.y + 0.2, GOAL.Z - 0.3, 0.07, ['#ffffff', '#bfe3ff', '#4aa8ff']);
          break;
        case 'clash':
          this.shake = 26; this.flashA = 0.9; A().boom();
          this.addText('SCONTRO!!', 0, 1.5, GOAL.Z - 0.4, 0.13, ['#ffffff', '#ffd23a', '#ff3d2e']);
          this.fx.burst('spark', wp(ev.x, ev.y, GOAL.Z - 0.2), 40, { speed: 7, up: 3, life: 0.9, size: 0.05, col: ['#fff', '#ffd23a', '#ff8f00'], add: true });
          break;
        case 'break':
          this.shake = 30; this.flashA = 1; A().boom();
          this.addText('SFONDA!!', 0, 1.6, GOAL.Z - 0.4, 0.14, ['#fff7a8', '#ffc400', '#ff3d2e']);
          this.fx.burst('spark', wp(ev.x, ev.y, GOAL.Z - 0.2), 50, { speed: 8, up: 3, life: 1, size: 0.05, col: ['#fff', '#ffd23a', '#ff3d2e'], add: true });
          break;
        case 'net':
          this.shake = Math.max(this.shake, 8 + ev.speed * 0.3);
          A().net(ev.speed);
          this.addText('SHWAAK!', ev.x, ev.y + 0.3, GOAL.Z + 1.2, 0.065, ['#ffffff', '#ffe36a', '#ff8a1f']);
          break;
        case 'bounce':
          A().bounce(ev.vn);
          break;
        case 'result':
          this.onResult(ev.result);
          break;
        default:
      }
      void sim;
    }

    addText(text, x, y, z, size, colors) {
      this.texts.push({ text, p: { x, y, z }, t0: this.t, dur: 1.1, size, colors, rot: (Math.random() - 0.5) * 0.4 });
    }

    // ----------------------------------------------------------------- risultato
    onResult(res) {
      if (this.resultInfo) return;
      const type = res.type;
      const scored = type === 'goal';
      const sp = !!this.special;
      let banner, line, mood = 'sad', kmood = 'sad';
      const crowd = this.teams[this.team].code;
      void crowd;
      if (scored) {
        banner = sp && res.broke ? { text: 'SUPER GOL!', c1: '#ff9a1f', c2: '#8a1a00', sub: this.special.name } : { text: 'GOOOL!', c1: '#ff3d6b', c2: '#7a0a2a', sub: `${this.kickerP.name} · ${this.speedText || ''}` };
        line = res.woodHit ? pick(LINES.postGoal) : sp ? pick(LINES.goalSpecial) : pick(LINES.goal);
        mood = 'cheer'; kmood = 'sad';
        A().cheer(1.0);
      } else if (type === 'saved') {
        const ks = this.keeperSpecial;
        banner = ks ? { text: 'SUPER PARATA!', c1: '#ffd23a', c2: '#a35a00', sub: PK.KEEPER_SPECIALS[this.keeperP.keeperSpecial % 5] } : { text: 'PARATA!', c1: '#2aa8ff', c2: '#0a2a6a', sub: this.keeperP.name };
        line = ks ? pick(LINES.savedSpecial) : pick(LINES.saved);
        mood = 'sad'; kmood = 'cheer';
        A().cheer(0.8); A().groan(0.6);
      } else if (type === 'post' || this.sim.woodHit) {
        const bar = this.sim.events.some((e) => e.type === 'bar');
        banner = { text: bar ? 'TRAVERSA!' : 'PALO!', c1: '#c9d3e8', c2: '#3a4560', sub: 'Il legno nega il gol' };
        line = bar ? pick(LINES.bar) : pick(LINES.post);
        A().groan(1.0);
      } else {
        const over = type === 'over';
        banner = { text: over ? 'ALTO!' : 'FUORI!', c1: '#b0b8c8', c2: '#3a3f4f', sub: this.kickerP.name };
        line = over ? pick(LINES.over) : pick(LINES.wide);
        A().boo(1);
      }
      const decisive = this.sit.decisive;
      this.resultInfo = { type, scored, banner, line, res };
      HUD().comment(line);
      this.bannerInfo = { t0: this.t, dur: 2.0, ...banner };
      this.energy = scored ? 1 : type === 'saved' ? 0.8 : 0.35;
      const tk = this.sim.t - this.tContact;
      this.kicker.setMood(mood === 'cheer' ? 'cheer' : 'sad', Math.max(0.25, tk), this.rng() < 0.5 ? 1 : -1);
      this.keeper.setMood(kmood === 'cheer' ? 'cheer' : 'sad', this.sim.t);
      this.moodSet = true;
      this.dollyTarget = scored ? 0.3 : type === 'saved' ? 0.7 : 0.5;
      if (scored) this.fx.burst('conf', { x: 0, y: 3.2, z: GOAL.Z - 2 }, 90, { speed: 5, up: 4, life: 2.8, size: 0.08, col: [this.kits[this.team].shirt, this.kits[this.team].trim, '#ffd23a', '#ffffff'], g: 3 });
      void decisive;
      this.phase = 'result';
      this.pt = 0;
      HUD().setPrompt('');
      HUD().setMode('none');
    }

    commitKick() {
      const sc = !!(this.resultInfo && this.resultInfo.scored);
      this.so.record(this.team, sc);
      this.results[this.team].push(sc);
      this.kickLog.push({ team: this.team, scored: sc, kicker: this.kickerP.name, idx: this.so.taken[this.team] - 1 });
      this._refreshHud();
      if (this.so.over) this.finish();
      else this.beginKick();
    }

    finish() {
      this.phase = 'end';
      this.pt = 0;
      this.dollyTarget = 0;
      const so = this.so;
      this.result = {
        goals: { A: so.goals.A, B: so.goals.B }, winner: so.winner, kicks: this.kickLog.slice(), first: this.first,
        sudden: so.taken.A > so.K || so.taken.B > so.K, sim: false,
      };
      HUD().setMode('none');
      HUD().setPrompt('');
      const w = so.winner;
      HUD().comment(w ? `FINE! Vince ${this.teams[w].name} ${so.goals[w]}-${so.goals[other(w)]} ai rigori` : `FINE! Pareggio ${so.goals.A}-${so.goals.B}`);
      A().whistle();
      setTimeout(() => A().whistle(), 400);
      if (w) A().cheer(1.2);
    }

    // ------------------------------------------------------------------ update
    resize(w, h) {
      this.w = w; this.h = h;
      this.cam.setSize(w, h);
    }

    update(dtReal) {
      const dt = Math.min(dtReal, 0.05);
      this.t += dt;
      this.pt += dt;
      this.shake *= Math.exp(-9 * dt);
      this.flashA = Math.max(0, this.flashA - dt * 2.2);
      this.fx.update(dt);
      this.energy = M.damp(this.energy, this.phase === 'result' ? this.energy : 0.18 + 0.4 * (this.sit ? this.sit.pressure : 0.2), 0.7, dt);
      this.texts = this.texts.filter((tx) => this.t - tx.t0 < tx.dur);
      this.crowdT = (this.crowdT || 0) - dt;
      if (this.crowdT <= 0) { this.crowdT = 0.6; A().crowd(this.energy); }
      const ph = this.phase;
      if (ph === 'coin') {
        if (this.pt > 2.4) this.beginKick();
      } else if (ph === 'intro') {
        if (this.pt >= this.introDur) this._startControl();
        this.stepSim(dt);
      } else if (ph === 'aim' || ph === 'power') {
        this.updateAim(dt);
        this.stepSim(dt);
      } else if (ph === 'ready') {
        this.stepSim(dt);
        if (this.pt > this.readyT) this.startRun();
      } else if (ph === 'run' || ph === 'flight') {
        if (this.hitStop > 0) {
          this.hitStop -= dt;
          if (this.hitStop <= 0) { this.hitStop = 0; this.hitInfo = null; A().whoosh(); }
        } else {
          this.stepSim(dt * this.timeScale);
          this.afterStep();
        }
      } else if (ph === 'result') {
        // torna alla velocità normale
        this.timeScale = M.damp(this.timeScale, 1, 5, dt);
        this.stepSim(dt * this.timeScale);
        if (this.pt > 2.7) {
          this.commitKick();
        }
      } else if (ph === 'end') {
        this.stepSim(dt);
        if (this.pt > 1.0 && this.auto && !this.finished) this._deliver();
      }
      this.updateCamera(dt);
      // tensione: battito cardiaco
      if ((ph === 'aim' || ph === 'power' || ph === 'ready') && this.sit && this.sit.pressure > 0.7) {
        this.pressureBeat -= dt;
        if (this.pressureBeat <= 0) { this.pressureBeat = 0.95; A().heartbeat(this.sit.pressure); this.beatPulse = 1; }
      }
      this.beatPulse = Math.max(0, (this.beatPulse || 0) - dt * 3);
    }

    stepSim(dt) {
      if (!this.sim) return;
      this.sim.advance(dt);
    }

    afterStep() {
      const sim = this.sim;
      // contatto
      if (!this.launched && sim.t >= this.tContact) this.doContact();
      // portiere AI
      if (this.plan && !this.planDone && !this.humanKeeps) {
        const p = this.plan;
        if (p.mode === 'early' && sim.t >= this.tContact + p.t) {
          this.planDone = true;
          this.keeper.command(sim.t, p.target, { special: p.special });
          if (p.special) this.aiKeeperSpecialFx();
        } else if (p.mode === 'react' && this.launched && sim.sinceLaunch >= p.t) {
          this.planDone = true;
          const tg = PK.AI.keeperReadTarget(sim, p, this.rng);
          this.keeper.command(sim.t, tg, { special: p.special });
          if (p.special) this.aiKeeperSpecialFx();
        }
      }
      // scia del pallone
      if (this.launched && sim.t - this.lastTrailT > 1 / 120) {
        this.lastTrailT = sim.t;
        this.trail.push({ p: { x: sim.ball.p.x, y: sim.ball.p.y, z: sim.ball.p.z } });
        if (this.trail.length > (this.special ? 22 : 11)) this.trail.shift();
      }
      // fiamme / scintille speciali
      if (this.special && this.launched && !sim.result) {
        const b = sim.ball.p;
        this.fx.burst('flame', b, 1, { speed: 0.6, up: 0.4, life: 0.5, size: 0.07, col: [this.special.col[0], this.special.col[1]], g: 0, add: true });
      }
      // zoom del tempo: rallenta sul finale del volo vicino alla porta
      if (this.launched && !sim.result) {
        const z = sim.ball.p.z;
        if (z > 8 && !this.humanKeeps) this.timeScale = M.damp(this.timeScale, this.special ? 0.22 : 0.4, 4, 0.016);
      }
    }

    aiKeeperSpecialFx() {
      if (this.humanKeeps) return;
      const ks = PK.KEEPER_SPECIALS[this.keeperP.keeperSpecial % 5];
      this.hitStop = 0.7;
      this.hitInfo = { kind: 'keeper', name: ks, who: this.keeperP.name, spec: { col: ['#ffd23a', '#ff8f00', '#fff6c8'], name: ks } };
      A().special();
    }

    _deliver() {
      if (this.finished) return;
      this.finished = true;
      this.o.onFinish && this.o.onFinish(this.result);
    }

    /** chiamato dal pulsante "Continua" al termine */
    deliver() { this._deliver(); }

    updateAim(dt) {
      const k = this.keys;
      const sp = 3.4 * dt;
      if (k.ArrowLeft || k.KeyA) this.aim.x -= sp;
      if (k.ArrowRight || k.KeyD) this.aim.x += sp;
      if (k.ArrowUp || k.KeyW) this.aim.y += sp * 0.8;
      if (k.ArrowDown || k.KeyS) this.aim.y -= sp * 0.8;
      this.aim.x = clamp(this.aim.x, -5.2, 5.2);
      this.aim.y = clamp(this.aim.y, 0.05, 3.5);
      const tt = this.t + this.wobPhase;
      const A0 = this.wobAmp;
      this.reticle.x = this.aim.x + A0 * (Math.sin(1.7 * tt + 0.3) + 0.6 * Math.sin(3.1 * tt));
      this.reticle.y = this.aim.y + A0 * (Math.cos(1.3 * tt) + 0.5 * Math.sin(2.7 * tt + 1));
      if (this.phase === 'power') {
        this.powerT += dt;
        let p = (this.powerT % 2.1) / 1.05;
        if (p > 1) p = 2 - p;
        this.power = p;
        HUD().setPower(p, ZONE, this.armed);
      }
    }

    updateCamera(dt) {
      this.dolly = M.damp(this.dolly, this.dollyTarget, this.dollyTarget > this.dolly ? 9 : 2.2, dt);
      const b = CAM.broadcast, g = CAM.goal, k = this.dolly;
      const cam = this.cam;
      const sway = Math.sin(this.t * 0.4) * 0.08 * (1 - k);
      const bp = this.sim ? this.sim.ball.p : { x: 0, y: 0.1, z: 0 };
      const follow = this.launched ? 1 : 0;
      cam.pos = { x: lerp(b.pos.x, g.pos.x, k) + sway, y: lerp(b.pos.y, g.pos.y, k), z: lerp(b.pos.z, g.pos.z, k) };
      cam.target = {
        x: lerp(b.tgt.x, g.tgt.x, k) + clamp(bp.x, -4, 4) * 0.4 * k * follow,
        y: lerp(b.tgt.y, g.tgt.y, k) + (clamp(bp.y, 0, 3) - 1.0) * 0.18 * k * follow,
        z: lerp(b.tgt.z, g.tgt.z, k),
      };
      cam.f = cam.baseF() * lerp(b.zoom, g.zoom, k) * (1 + 0.06 * Math.min(1, this.shake / 20));
      cam.shakeX = (Math.random() - 0.5) * this.shake;
      cam.shakeY = (Math.random() - 0.5) * this.shake;
    }

    // ------------------------------------------------------------------- disegno
    draw(ctx, w, h) {
      if (w !== this.w || h !== this.h) this.resize(w, h);
      const cam = this.cam;
      const sim = this.sim;
      if (!sim) { ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, w, h); return; }
      // tempo del rigorista (relativo al contatto)
      const tk = Number.isFinite(this.tContact) ? sim.t - this.tContact : -PK.Kicker.T_RUN - 0.02;
      const ksk = this.kicker.skeleton(this.hitStop > 0 && this.hitInfo && this.hitInfo.kind === 'kick' ? 0 : tk);
      const gsk = this.keeper.skeleton(sim.t);
      const kExpr = this.phase === 'result' ? (this.resultInfo && this.resultInfo.scored ? 'shout' : 'sad') : (this.sit && this.sit.pressure > 0.7 ? 'focus' : 'focus');
      const gExpr = this.phase === 'result' ? (this.resultInfo && this.resultInfo.type === 'saved' ? 'shout' : 'sad') : 'focus';
      const kit = this.kits[this.team || 'A'], gkit = this.gkKits[this.opp || 'B'];
      const ballOpts = { trail: this.trailAlpha(), trailColor: this.special ? this.special.col[2] : 'rgba(255,255,255,0.9)' };
      PK.Scene.draw(ctx, cam, {
        t: this.t, energy: this.energy, pano: this.pano, net: sim.net,
        keeper: { sk: gsk, look: this.kitLook(this.keeperP || this.squads.B.gk, gkit, true, gExpr) },
        kicker: this.kickerP ? { sk: ksk, look: this.kitLook(this.kickerP, kit, false, kExpr) } : null,
        ball: sim.ball, ballOpts,
      });
      if (this.special && this.launched && sim.ball && !sim.result) PK.FX.ballFx(ctx, cam, this.special.fx, sim.ball, this.trailAlpha(), this.special.col, this.t);
      if (this.keeperSpecial && this.keeper.dive && this.keeper.dive.special) this.drawKeeperAura(ctx, gsk);
      this.fx.draw(ctx, cam);
      // proiezioni 3D -> 2D dei testi onomatopeici
      this.texts.forEach((tx) => {
        const q = cam.project(tx.p);
        if (!q) return;
        const tt = this.t - tx.t0;
        ctx.save();
        ctx.globalAlpha = clamp(1 - (tt - 0.7) / 0.4, 0, 1);
        PK.FX.bigText(ctx, tx.text, q.x, q.y - tt * 14, tx.size * q.s * 1.3, { tt, rot: tx.rot, colors: tx.colors, glow: tx.colors[1] });
        ctx.restore();
      });
      // linee cinetiche e crowd flashes
      const flying = this.phase === 'flight' && this.launched && !sim.result && this.hitStop <= 0;
      if (flying) {
        const bq = cam.project(sim.ball.p);
        if (bq) PK.FX.speedLines(ctx, w, h, bq.x, bq.y, this.t, { inner: 0.42, count: 46, alpha: this.special ? 0.7 : 0.3, colors: this.special ? [this.special.col[0], '#fff'] : ['#fff'] });
      }
      PK.FX.crowdFlashes(ctx, w, h, this.t, this.isFinal ? 26 : 8 + 14 * this.energy, h * 0.02, h * 0.36);
      if (this.sit && this.sit.pressure > 0.75 && (this.phase === 'aim' || this.phase === 'power' || this.phase === 'ready')) {
        PK.FX.vignette(ctx, w, h, 0.35 + 0.35 * (this.beatPulse || 0));
      } else PK.FX.vignette(ctx, w, h, 0.28);
      if (this.phase === 'aim' || this.phase === 'power') this.drawReticle(ctx);
      if (this.diveMarker && this.t - this.diveMarker.t0 < 0.5) this.drawDiveMarker(ctx);
      // pannelli e cinematiche
      if (this.phase === 'intro') this.drawIntro(ctx, w, h);
      if (this.hitStop > 0 && this.hitInfo) {
        const dur = this.hitInfo.kind === 'kick' ? 0.95 : 0.75;
        const tt = dur - this.hitStop;
        const pl = this.hitInfo.kind === 'kick' ? this.teams[this.team] : this.teams[this.opp];
        PK.FX.specialIntro(ctx, w, h, tt, dur, this.hitInfo.spec, this.hitInfo.who.toUpperCase() + ` (${pl.code})`, this.hitInfo.kind === 'kick' ? 'SUPER TIRO' : 'SUPER PARATA');
      }
      if (this.bannerInfo && this.phase === 'result') {
        const tt = this.t - this.bannerInfo.t0;
        PK.FX.banner(ctx, w, h, tt, this.bannerInfo.dur, this.bannerInfo);
      }
      if (this.phase === 'coin') this.drawCoin(ctx, w, h);
      if (this.flashA > 0) PK.FX.flash(ctx, w, h, this.flashA * (this.special ? 0.9 : 0.5));
      if (this.phase === 'end') this.drawEnd(ctx, w, h);
    }

    trailAlpha() {
      const n = this.trail ? this.trail.length : 0;
      return (this.trail || []).map((p, i) => ({ p: p.p, a: 0.05 + 0.3 * (i / Math.max(1, n)) }));
    }

    drawKeeperAura(ctx, gsk) {
      const cam = this.cam;
      [gsk.handTipR, gsk.handTipL].forEach((p) => {
        const q = cam.project(p);
        if (!q) return;
        const r = 0.45 * q.s;
        const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, r);
        g.addColorStop(0, 'rgba(255,246,200,0.95)'); g.addColorStop(0.4, 'rgba(255,200,60,0.5)'); g.addColorStop(1, 'rgba(255,140,0,0)');
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 7); ctx.fill(); ctx.restore();
      });
    }

    drawReticle(ctx) {
      const cam = this.cam;
      const q = cam.project({ x: this.reticle.x, y: this.reticle.y, z: GOAL.Z });
      if (!q) return;
      const t = this.t;
      const pr = this.sit ? this.sit.pressure : 0.3;
      const col = pr > 0.85 ? '#ff4d4d' : pr > 0.6 ? '#ffb13d' : '#ffffff';
      const u = this.h / 720;
      const r = Math.max(14 * u, this.disp * q.s);
      ctx.save();
      ctx.translate(q.x, q.y);
      ctx.scale(u, u);
      ctx.translate(0, 0);
      // anello di dispersione (r è già in px: va diviso per la scala)
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.globalAlpha = 0.55;
      ctx.setLineDash([6, 6]); ctx.lineDashOffset = -t * 20;
      ctx.beginPath(); ctx.arc(0, 0, r / u, 0, 7); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      // mirino
      const pulse = 1 + 0.07 * Math.sin(t * 8) + 0.12 * (this.beatPulse || 0);
      const s = 17 * pulse;
      ctx.lineWidth = 3.2; ctx.strokeStyle = '#0a0a14';
      for (const pass of [0, 1]) {
        ctx.strokeStyle = pass ? col : '#0a0a14'; ctx.lineWidth = pass ? 2.2 : 5;
        ctx.beginPath();
        ctx.arc(0, 0, s, 0, 7);
        ctx.moveTo(-s * 1.7, 0); ctx.lineTo(-s * 0.55, 0); ctx.moveTo(s * 1.7, 0); ctx.lineTo(s * 0.55, 0);
        ctx.moveTo(0, -s * 1.7); ctx.lineTo(0, -s * 0.55); ctx.moveTo(0, s * 1.7); ctx.lineTo(0, s * 0.55);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawDiveMarker(ctx) {
      const q = this.cam.project({ x: this.diveMarker.x, y: this.diveMarker.y, z: GOAL.Z });
      if (!q) return;
      const k = (this.t - this.diveMarker.t0) / 0.5;
      ctx.save();
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = '#7fd4ff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(q.x, q.y, 10 + k * 40, 0, 7); ctx.stroke();
      ctx.restore();
    }

    drawIntro(ctx, w, h) {
      const kp = this.kickerP, gp = this.keeperP;
      const full = this.introDur > 1.5;
      let sub = '';
      if (this.sit.sudden) sub = 'OLTRANZA — ogni errore può essere fatale';
      else if (this.sit.mustScore) sub = 'SE SBAGLIA, È FINITA!';
      else if (this.sit.matchPoint) sub = 'Un gol per chiudere la partita';
      else if (this.kickNo === 1) sub = this.o.label || '';
      else if (this.isFinal) sub = 'FINALE DEL MONDIALE';
      PK.FX.versus(ctx, w, h, {
        tt: this.pt, dur: this.introDur, pressure: this.sit.pressure, sub,
        kicker: { name: kp.name, number: kp.number, skin: kp.skin, hair: kp.hair, iris: this.irisFor(kp), sub: this.teams[this.team].name.toUpperCase() },
        keeper: { name: gp.name, number: gp.number, skin: gp.skin, hair: gp.hair, iris: this.irisFor(gp, 1), sub: this.teams[this.opp].name.toUpperCase() },
        mode: full ? 'full' : 'quick',
      });
    }

    irisFor(p, off) {
      const cols = ['#2a7fff', '#3aa05a', '#8a5a2b', '#2a2a3a', '#7a4ad8', '#2a9fb0'];
      return cols[(p.number + (off || 0)) % cols.length];
    }

    drawCoin(ctx, w, h) {
      const tt = this.pt;
      const a = Math.min(1, tt / 0.3) * Math.min(1, (2.4 - tt) / 0.3);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(2,4,14,0.55)';
      ctx.fillRect(0, 0, w, h);
      const spin = tt < 1.4 ? tt * 16 : Math.PI * 16 * 0.0 + 22.4;
      const y = h * 0.45 - Math.sin(Math.min(1, tt / 1.4) * Math.PI) * h * 0.18;
      ctx.translate(w / 2, y);
      const sc = Math.abs(Math.cos(spin));
      ctx.scale(1, Math.max(0.08, sc));
      const g = ctx.createRadialGradient(-10, -10, 4, 0, 0, 56);
      g.addColorStop(0, '#fff6b0'); g.addColorStop(0.6, '#ffc400'); g.addColorStop(1, '#a86a00');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 56, 0, 7); ctx.fill();
      ctx.lineWidth = 5; ctx.strokeStyle = '#7a4a00'; ctx.stroke();
      ctx.restore();
      if (tt > 1.4) {
        const f = this.teams[this.first];
        ctx.save();
        ctx.globalAlpha = a;
        PK.FX.bigText(ctx, 'SORTEGGIO', w / 2, h * 0.68, Math.min(h * 0.11, w * 0.07), { tt: tt - 1.4 });
        ctx.font = `italic 800 ${Math.round(h * 0.05)}px Impact, sans-serif`;
        ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 8;
        ctx.fillText(`Batte per prima ${f.name}`, w / 2, h * 0.77);
        ctx.restore();
      }
    }

    drawEnd(ctx, w, h) {
      const tt = this.pt;
      const k = M.smooth(tt / 0.5);
      ctx.save();
      ctx.globalAlpha = k * 0.7;
      ctx.fillStyle = '#02030a';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      const r = this.result;
      if (!r) return;
      const wn = r.winner;
      PK.FX.bigText(ctx, 'FINE!', w / 2, h * 0.3, Math.min(h * 0.2, w * 0.13), { tt, rot: -0.06 });
      const score = `${this.teams.A.code} ${r.goals.A} - ${r.goals.B} ${this.teams.B.code}`;
      PK.FX.bigText(ctx, score, w / 2, h * 0.5, Math.min(h * 0.15, w * 0.1), { tt: tt - 0.2, colors: ['#ffffff', '#cfe6ff', '#6fa8ff'] });
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = `italic 800 ${Math.round(h * 0.05)}px Impact, sans-serif`;
      ctx.fillStyle = '#ffd23a'; ctx.shadowColor = '#000'; ctx.shadowBlur = 10;
      const txt = wn ? `Vince ${this.teams[wn].name} ai rigori` : 'Pareggio ai rigori';
      ctx.fillText(txt, w / 2, h * 0.63);
      if (tt > 1.0) { ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(h * 0.032)}px sans-serif`; ctx.fillText('Tocca o premi un tasto per continuare', w / 2, h * 0.74); }
      ctx.restore();
    }

    /** continuazione dopo la schermata finale */
    advanceFromEnd() {
      if (this.phase === 'end' && this.pt > 1.0) this._deliver();
    }
  }

  Match.ZONE = ZONE;
  PK.Match = Match;
  if (typeof module !== 'undefined' && module.exports) module.exports = PK;
})(typeof window !== 'undefined' ? window : globalThis);
