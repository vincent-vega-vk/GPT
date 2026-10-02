/*
 * SIMSOC 6 (remake) - live match engine
 * A minute-by-minute simulation of one match. Unlike the quick Poisson model
 * used for the rest of the world, this one reacts to the manager: formation
 * and players in each slot (with an out-of-position penalty), mentality,
 * pressing and tempo, fatigue, substitutions, red cards, the half-time team
 * talk, extra time and penalty shoot-outs. It produces a commentary feed,
 * a box score, live player ratings and the goal/card/injury timeline the
 * engine commits afterwards. Pure logic (UMD) so it runs in Node tests too.
 */
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./data'));
  } else {
    root.SimSocLive = factory(root.SimSocData);
  }
})(typeof self !== 'undefined' ? self : this, function (Data) {
  'use strict';

  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const fullName = p => p.forename + ' ' + p.surname;
  const shortName = p => p.surname;

  /* ---- formations: the role of each of the 11 slots ------------------- */
  const FORMATIONS = {
    '442': ['G', 'D', 'D', 'D', 'D', 'M', 'M', 'M', 'M', 'A', 'A'],
    '433': ['G', 'D', 'D', 'D', 'D', 'M', 'M', 'M', 'A', 'A', 'A'],
    '451': ['G', 'D', 'D', 'D', 'D', 'M', 'M', 'M', 'M', 'M', 'A'],
    '352': ['G', 'D', 'D', 'D', 'M', 'M', 'M', 'M', 'M', 'A', 'A'],
    '343': ['G', 'D', 'D', 'D', 'M', 'M', 'M', 'M', 'A', 'A', 'A'],
    '532': ['G', 'D', 'D', 'D', 'D', 'D', 'M', 'M', 'M', 'A', 'A'],
    '541': ['G', 'D', 'D', 'D', 'D', 'D', 'M', 'M', 'M', 'M', 'A']
  };
  const FORMATION_NAMES = { '442': '4-4-2', '433': '4-3-3', '451': '4-5-1', '352': '3-5-2', '343': '3-4-3', '532': '5-3-2', '541': '5-4-1' };
  // slot coordinates: x 0 (own goal) .. 1 (opponent goal), y 0 .. 1 across the pitch
  const LINE_Y = {
    1: [0.5], 2: [0.34, 0.66], 3: [0.22, 0.5, 0.78], 4: [0.14, 0.38, 0.62, 0.86], 5: [0.1, 0.3, 0.5, 0.7, 0.9]
  };
  function layout(formation) {
    const roles = FORMATIONS[formation] || FORMATIONS['442'];
    const count = { D: 0, M: 0, A: 0 };
    roles.forEach(r => { if (r !== 'G') count[r]++; });
    const seen = { D: 0, M: 0, A: 0 }, X = { D: 0.22, M: 0.47, A: 0.72 };
    return roles.map(r => {
      if (r === 'G') return { role: 'G', x: 0.05, y: 0.5 };
      const i = seen[r]++, ys = LINE_Y[count[r]];
      let x = X[r];
      if (r === 'M' && count.M === 5 && (i === 0 || i === 4)) x += 0.05;           // wing-backs / wide men push on
      if (r === 'M' && count.M >= 4 && (i === 2) && count.M === 5) x -= 0.06;       // a holding midfielder
      if (r === 'A' && count.A === 3 && (i === 0 || i === 2)) x -= 0.03;
      return { role: r, x: x, y: ys[i] };
    });
  }
  // how well a player of position `pos` performs in a slot of role `role`
  const SUIT = {
    G: { G: 1, D: 0.3, M: 0.25, A: 0.2 },
    D: { G: 0.25, D: 1, M: 0.78, A: 0.6 },
    M: { G: 0.25, D: 0.8, M: 1, A: 0.82 },
    A: { G: 0.2, D: 0.55, M: 0.8, A: 1 }
  };
  const suit = (pos, role) => (SUIT[pos] || SUIT.M)[role] || 0.5;

  const MENTALITY = ['Very defensive', 'Defensive', 'Balanced', 'Attacking', 'Very attacking'];   // index = m + 2
  const PRESSING = ['Low', 'Medium', 'High'];
  const TEMPO = ['Patient', 'Normal', 'Direct'];
  const TALKS = {
    praise: 'Praise the players', encourage: 'Encourage', demand: 'Demand more', calm: 'Calm them down'
  };

  // commentary templates
  const T = {
    ko: ['{team} get us under way.', 'And we are off! {team} kick off.'],
    goal: ['GOAL! {s} slots it past {gk}!', 'GOAL! {s} smashes it into the roof of the net!', 'GOAL! {s} heads home at the far post!',
      'GOAL! A cool finish from {s}!', 'GOAL! {s} curls it beyond {gk} into the corner!', 'GOAL! {s} pounces on the loose ball!'],
    assist: [' Great ball from {a}.', ' {a} with the assist.', ' Superb work from {a} to set it up.'],
    saved: ['{s} tries his luck — {gk} saves.', '{s} gets a shot away but {gk} is equal to it.', 'Good save! {gk} denies {s}.',
      '{gk} tips {s}\'s effort over the bar.'],
    wide: ['{s} drags his shot wide.', '{s} fires over the bar.', '{s} curls it just past the post!', '{s} snatches at it and misses the target.'],
    blocked: ['{s}\'s strike is blocked by {d}.', '{d} throws himself in front of {s}\'s shot.'],
    corner: ['Corner to {team}.'],
    foul: ['{f} brings down {v}.', 'Free kick to {team2} after {f}\'s challenge on {v}.', '{f} is penalised for a foul on {v}.'],
    yellow: ['Yellow card: {f} goes into the book.', '{f} is booked for that challenge.'],
    red: ['RED CARD! {f} is sent off!'],
    second: ['Second yellow for {f} — he\'s off!'],
    pen: ['PENALTY to {team}! {f} brings down {v} in the box.'],
    penGoal: ['{s} sends {gk} the wrong way. GOAL!'],
    penSaved: ['{gk} SAVES the penalty from {s}!'],
    penMiss: ['{s} blazes the penalty over the bar!'],
    injury: ['{p} goes down injured and needs treatment.', '{p} is hurt and signals to the bench.'],
    sub: ['Substitution for {team}: {on} replaces {off}.'],
    chance: ['{team} keep the ball well.', '{p} looks for an opening.', 'Patient build-up from {team}.',
      '{p} wins the ball back in midfield.', '{p} drives forward down the flank.', 'A long ball from {p} is cleared.'],
    ht: ['Half-time: {score}.'],
    et: ['We are going to extra time!'],
    ft: ['Full-time: {score}.']
  };

  /* ===================================================================== */
  function create(cfg) {
    const rng = Data.makeRng((cfg.seed >>> 0) || 1);
    const silent = !!cfg.silent;
    const tie = cfg.tie || null;                     // {single:true} or {firstLeg:{hg,ag}} (from THIS home side's view)
    const homeAdv = cfg.neutral ? 1 : 1.1;

    function mkSide(sideKey, c) {
      const formation = FORMATIONS[c.formation] ? c.formation : '442';
      const roles = FORMATIONS[formation];
      const xi = (c.players || []).slice(0, 11);
      const s = {
        key: sideKey, name: c.name, kit: c.kit || ['#c00', '#fff'], isUser: !!c.isUser,
        formation: formation, roles: roles,
        mentality: clamp(c.mentality | 0, -2, 2), pressing: clamp(c.pressing == null ? 1 : c.pressing, 0, 2), tempo: clamp(c.tempo == null ? 1 : c.tempo, 0, 2),
        morale: c.morale == null ? 50 : c.morale, talk: 1, boost: c.boost || 1,
        onPitch: [], bench: (c.bench || []).slice(0, 7), used: [], subsUsed: 0, maxSubs: c.maxSubs || 3, reds: 0,
        autoSubs: c.autoSubs !== false,
        stats: { shots: 0, sot: 0, xg: 0, corners: 0, fouls: 0, yellows: 0, reds: 0, poss: 0 }
      };
      xi.forEach((p, i) => s.onPitch.push(entry(p, roles[i] || 'M', i)));
      return s;
    }
    function entry(p, role, slot) {
      return { p: p, id: p.id, role: role, slot: slot, cond: clamp(p.fit == null ? 90 : p.fit, 20, 100), rating: 6.3,
        goals: 0, assists: 0, yc: 0, rc: false, off: false, injured: false, cameOn: null };
    }
    const H = mkSide('home', cfg.home), A = mkSide('away', cfg.away);
    const sides = { home: H, away: A };
    const other = s => (s === H ? A : H);
    H.onPitch.concat(A.onPitch).forEach(e => { e.cameOn = 0; });

    let minute = 0, hg = 0, ag = 0, finished = false, half = 1, extraTime = false, maxMinute = 90;
    let pendingTalk = false, talkDone = false;
    const feed = [], goals = [], cards = [], injuries = [], subs = [];
    const momentum = [];                             // +1 home attack, -1 away attack, 0 nothing (per minute)
    let shootout = null, lastPoss = 'home';
    let cache = null, cacheAt = -10;

    const say = (minuteN, type, side, tpl, vars, extra) => {
      const ev = Object.assign({ minute: minuteN, type: type, side: side ? side.key : null }, extra || {});
      if (!silent && tpl) {
        let txt = Data.pick(rng, T[tpl]);
        Object.keys(vars || {}).forEach(k => { txt = txt.split('{' + k + '}').join(vars[k]); });
        ev.text = txt;
      }
      feed.push(ev);
      return ev;
    };

    /* ---- strength --------------------------------------------------- */
    function active(s) { return s.onPitch.filter(e => !e.off); }
    function condF(e) { return 0.62 + 0.38 * e.cond / 100; }
    function contrib(e) { return e.p.skill * suit(e.p.pos, e.role) * condF(e); }
    function units(s) {
      const on = active(s);
      const by = { G: [], D: [], M: [], A: [] };
      on.forEach(e => by[e.role].push(contrib(e)));
      const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
      const nD = s.roles.filter(r => r === 'D').length, nM = s.roles.filter(r => r === 'M').length, nA = s.roles.filter(r => r === 'A').length;
      let gk = by.G.length ? by.G[0] : 22;
      let def = avg(by.D) * (0.7 + 0.075 * nD), mid = avg(by.M) * (0.7 + 0.075 * nM), att = avg(by.A) * (0.75 + 0.125 * nA);
      if (!by.D.length) def = mid * 0.6; if (!by.M.length) mid = (def + att) * 0.4; if (!by.A.length) att = mid * 0.65;
      const red = Math.pow(0.9, s.reds);
      const mor = 0.94 + (s.morale / 100) * 0.12;
      const k = red * mor * s.talk * s.boost;
      return { gk: gk, def: def * k, mid: mid * k, att: att * k };
    }
    function strengths() {
      if (cache && minute - cacheAt < 3) return cache;
      cache = { home: units(H), away: units(A) }; cacheAt = minute;
      return cache;
    }
    function invalidate() { cache = null; }

    /* ---- helpers ---------------------------------------------------- */
    function pickWeighted(list, wf) {
      let tot = 0; const w = list.map(x => { const v = Math.max(0, wf(x)); tot += v; return v; });
      if (tot <= 0) return list[0];
      let r = rng() * tot;
      for (let i = 0; i < list.length; i++) { r -= w[i]; if (r <= 0) return list[i]; }
      return list[list.length - 1];
    }
    const SHOOT_W = { A: 1, M: 0.42, D: 0.1, G: 0 }, ASSIST_W = { A: 0.65, M: 1, D: 0.3, G: 0.03 };
    function keeper(s) { return active(s).find(e => e.role === 'G') || active(s).find(e => e.p.pos === 'G') || null; }
    function nm(e) { return e ? shortName(e.p) : 'the keeper'; }
    function bump(e, d) { if (e) e.rating = clamp(e.rating + d, 3, 10); }

    /* ---- one shot ------------------------------------------------------ */
    function shot(s, opts) {
      opts = opts || {};
      const d = other(s), on = active(s).filter(e => e.role !== 'G' || active(s).length < 3);
      if (!on.length) return;
      const shooter = opts.shooter || pickWeighted(on, e => SHOOT_W[e.role] * (0.5 + e.p.skill / 100) * condF(e));
      const gk = keeper(d);
      let q = opts.q != null ? opts.q : (rng() < 0.05 ? 0.3 + rng() * 0.3 : 0.02 + 0.27 * Math.pow(rng(), 2.6));
      if (opts.q == null) q *= 1 + 0.07 * d.mentality;              // an open, attacking opponent leaves space to counter
      const kf = clamp(1 + (shooter.p.skill - (gk ? gk.p.skill * suit(gk.p.pos, 'G') : 25)) / 220, 0.8, 1.3);
      const pGoal = clamp(q * kf, 0.01, 0.92);
      s.stats.shots++; s.stats.xg += q;
      const r = rng();
      if (r < pGoal) {
        s.stats.sot++;
        let assister = null;
        if (!opts.pen && rng() < 0.78) {
          const cand = active(s).filter(e => e !== shooter);
          if (cand.length) assister = pickWeighted(cand, e => ASSIST_W[e.role] * (0.5 + e.p.skill / 100));
        }
        scoreGoal(s, shooter, assister, opts.pen, gk);
      } else if (r < pGoal + 0.27) {
        s.stats.sot++;
        bump(shooter, 0.08); bump(gk, 0.22);
        say(minute, opts.pen ? 'pen_saved' : 'saved', s, opts.pen ? 'penSaved' : 'saved', { s: nm(shooter), gk: nm(gk) }, { playerId: shooter.id });
        if (!opts.pen && rng() < 0.3) corner(s);
      } else if (r < pGoal + 0.44 && !opts.pen) {
        const blocker = pickWeighted(active(d).filter(e => e.role !== 'G'), e => (e.role === 'D' ? 1 : 0.4));
        bump(blocker, 0.1);
        say(minute, 'blocked', s, 'blocked', { s: nm(shooter), d: nm(blocker) }, { playerId: shooter.id });
        if (rng() < 0.45) corner(s);
      } else {
        bump(shooter, -0.05);
        say(minute, opts.pen ? 'pen_miss' : 'wide', s, opts.pen ? 'penMiss' : 'wide', { s: nm(shooter) }, { playerId: shooter.id });
      }
    }
    function scoreGoal(s, scorer, assister, pen, gk) {
      if (s === H) hg++; else ag++;
      scorer.goals++; bump(scorer, 1.05);
      if (assister) { assister.assists++; bump(assister, 0.5); }
      const d = other(s);
      bump(keeper(d), -0.35);
      active(d).forEach(e => { if (e.role === 'D') bump(e, -0.1); });
      goals.push({ minute: minute, side: s.key, scorerId: scorer.id, scorer: fullName(scorer.p), pos: scorer.p.pos,
        assistId: assister ? assister.id : null, assister: assister ? fullName(assister.p) : null, pen: !!pen });
      const ev = say(minute, 'goal', s, pen ? 'penGoal' : 'goal', { s: nm(scorer), gk: nm(gk) },
        { playerId: scorer.id, hg: hg, ag: ag, scorer: fullName(scorer.p), assister: assister ? fullName(assister.p) : null, pen: !!pen });
      if (ev.text && assister) ev.text += Data.pick(rng, T.assist).split('{a}').join(nm(assister));
      invalidate();
    }
    function corner(s) {
      s.stats.corners++;
      say(minute, 'corner', s, 'corner', { team: s.name });
      if (rng() < 0.17) {
        const aerial = active(s).filter(e => e.role === 'D' || e.role === 'A');
        if (aerial.length) shot(s, { shooter: pickWeighted(aerial, e => 0.5 + e.p.skill / 100), q: 0.05 + rng() * 0.16 });
      }
    }

    /* ---- discipline / injuries --------------------------------------- */
    function foul(att) {
      const def = other(att);
      const f = pickWeighted(active(def).filter(e => e.role !== 'G'), e => (e.role === 'D' ? 1.2 : e.role === 'M' ? 1 : 0.5));
      const v = pickWeighted(active(att).filter(e => e.role !== 'G'), e => (e.role === 'A' ? 1.2 : 1));
      if (!f || !v) return;
      def.stats.fouls++; bump(f, -0.04);
      const sv = { f: nm(f), v: nm(v), team: att.name, team2: att.name };
      const inBox = rng() < 0.013;
      if (inBox) {
        say(minute, 'pen', att, 'pen', sv);
        const takers = active(att).filter(e => e.role !== 'G').sort((a, b) => b.p.skill - a.p.skill);
        shot(att, { shooter: takers[0], q: 0.76, pen: true });
      } else if (rng() < 0.12) say(minute, 'foul', def, 'foul', sv);
      // cards
      const rc = rng();
      const pressPenalty = 1 + 0.15 * (def.pressing - 1);
      if (rc < 0.0045) sendOff(def, f, false);
      else if (rc < 0.13 * pressPenalty) {
        f.yc++; def.stats.yellows++; bump(f, -0.3);
        if (f.yc >= 2) sendOff(def, f, true);
        else {
          cards.push({ minute: minute, side: def.key, id: f.id, name: fullName(f.p), color: 'Y' });
          say(minute, 'yellow', def, 'yellow', sv, { playerId: f.id });
        }
      }
    }
    function sendOff(s, e, second) {
      e.rc = true; e.off = true; s.reds++; s.stats.reds++; bump(e, -1.3);
      cards.push({ minute: minute, side: s.key, id: e.id, name: fullName(e.p), color: 'R', second: !!second });
      say(minute, 'red', s, second ? 'second' : 'red', { f: nm(e) }, { playerId: e.id });
      // a keeper sent off: an outfielder goes in goal
      if (e.role === 'G') {
        const stand = active(s).filter(x => x.role !== 'G').sort((a, b) => a.p.skill - b.p.skill)[0];
        if (stand) stand.role = 'G';
      }
      invalidate();
    }
    function injure(s) {
      const cand = active(s);
      if (!cand.length) return;
      const e = pickWeighted(cand, x => 1.3 - x.cond / 100);
      e.injured = true;
      const games = rng() < 0.55 ? Data.ri(rng, 1, 2) : rng() < 0.75 ? Data.ri(rng, 3, 5) : Data.ri(rng, 6, 12);
      injuries.push({ minute: minute, side: s.key, id: e.id, name: fullName(e.p), games: games });
      say(minute, 'injury', s, 'injury', { p: nm(e) }, { playerId: e.id });
      if (s.isUser && !s.autoSubs && s.subsUsed < s.maxSubs && s.bench.length) { e.needsSub = true; return; }
      if (!autoReplace(s, e)) { e.off = true; invalidate(); }
    }

    /* ---- substitutions --------------------------------------------- */
    function bestBenchFor(s, role) {
      const avail = s.bench.filter(p => !s.used.includes(p.id));
      if (!avail.length) return null;
      return avail.slice().sort((a, b) => b.skill * suit(b.pos, role) - a.skill * suit(a.pos, role))[0];
    }
    function doSub(s, offE, onP) {
      if (!offE || !onP || offE.off || s.subsUsed >= s.maxSubs) return false;
      if (s.used.includes(onP.id) || !s.bench.find(p => p.id === onP.id)) return false;
      offE.off = true; offE.subbedOff = minute;
      const ne = entry(onP, offE.role, offE.slot); ne.cameOn = minute;
      s.onPitch.push(ne); s.used.push(onP.id); s.subsUsed++;
      subs.push({ minute: minute, side: s.key, off: fullName(offE.p), on: fullName(onP), offId: offE.id, onId: onP.id });
      say(minute, 'sub', s, 'sub', { team: s.name, on: fullName(onP), off: fullName(offE.p) }, { onId: onP.id, offId: offE.id });
      invalidate();
      return true;
    }
    function autoReplace(s, offE) {
      if (s.subsUsed >= s.maxSubs) return false;
      const onP = bestBenchFor(s, offE.role);
      return onP ? doSub(s, offE, onP) : false;
    }
    function aiManage(s) {
      // tactics: chase the game or shut up shop
      const diff = s === H ? hg - ag : ag - hg;
      if (!s.isUser) {
        if (minute >= 60 && diff < 0) s.mentality = minute >= 78 ? 2 : 1;
        else if (minute >= 75 && diff > 0) s.mentality = -1;
        else if (minute >= 80 && diff === 0 && s.mentality < 1 && rng() < 0.5) s.mentality = 1;
      }
      if (!s.autoSubs) return;
      if ([58, 67, 76, 84].indexOf(minute) < 0 || s.subsUsed >= s.maxSubs) return;
      const on = active(s).filter(e => e.role !== 'G');
      if (!on.length) return;
      const tired = on.slice().sort((a, b) => (a.cond + a.rating * 6) - (b.cond + b.rating * 6))[0];
      if (tired.cond < 72 || tired.rating < 6.0 || (diff < 0 && minute >= 67)) {
        let role = tired.role;
        let onP = bestBenchFor(s, role);
        if (diff < 0 && minute >= 67) { const att = bestBenchFor(s, 'A'); if (att && att.pos === 'A') { onP = att; } }
        if (onP) doSub(s, tired, onP);
      }
    }

    /* ---- one minute --------------------------------------------------- */
    function step() {
      if (finished || pendingTalk) return [];
      const from = feed.length;
      minute++;
      if (minute === 1) say(1, 'ko', H, 'ko', { team: H.name });
      // fatigue
      [H, A].forEach(s => active(s).forEach(e => {
        let drain = 0.15 + 0.045 * s.pressing + 0.03 * s.tempo + (e.p.age > 30 ? 0.04 : 0) + (e.role === 'G' ? -0.1 : 0);
        e.cond = clamp(e.cond - Math.max(0.03, drain) * (0.8 + rng() * 0.4), 15, 100);
      }));
      aiManage(H); aiManage(A);
      const st = strengths(), h = st.home, a = st.away;
      // possession
      let pH = h.mid / (h.mid + a.mid + 0.001);
      pH = clamp(pH + 0.025 * (H.mentality - A.mentality) * 0.5 + 0.03 * (H.pressing - A.pressing) + (homeAdv > 1 ? 0.02 : 0), 0.22, 0.78);
      const att = rng() < pH ? H : A, def = other(att);
      att.stats.poss++; lastPoss = att.key;
      const sa = att === H ? h : a, sd = att === H ? a : h;
      const ratio = (sa.att * 0.62 + sa.mid * 0.38) / (sd.def * 0.66 + sd.mid * 0.34 + 0.001);
      let p = 0.225 * Math.pow(ratio, 0.72)
        * (1 + 0.12 * att.mentality) * (1 + 0.1 * def.mentality)
        * (1 + 0.07 * (att.tempo - 1)) * (1 + 0.035 * (def.tempo - 1)) * (1 - 0.045 * (def.pressing - 1))
        * (att === H ? homeAdv : 1);
      if (extraTime) p *= 0.85;
      let attacked = 0;
      if (rng() < p) { attacked = att === H ? 1 : -1; shot(att); }
      else if (!silent && rng() < 0.07) {
        const pl = Data.pick(rng, active(att).filter(e => e.role !== 'G').concat(active(att)));
        say(minute, 'chance', att, 'chance', { team: att.name, p: nm(pl) });
      }
      momentum.push(attacked);
      if (rng() < 0.235) foul(att);
      if (rng() < 0.012) corner(att);
      [H, A].forEach(s => { if (rng() < 0.0019) injure(s); });

      // half-time / full-time / extra time
      if (minute === 45) {
        say(45, 'ht', null, 'ht', { score: H.name + ' ' + hg + '-' + ag + ' ' + A.name });
        half = 2;
        if (H.isUser || A.isUser) pendingTalk = !cfg.autoTalk;
        aiTalk();
      }
      if (minute >= maxMinute) endOfTime();
      return feed.slice(from);
    }
    function aiTalk() {
      [H, A].forEach(s => { if (!s.isUser || cfg.autoTalk) { s.talk = 1 + (rng() * 0.03 - 0.005); } });
      if (cfg.autoTalk) talkDone = true;
    }
    function tieLevel() {
      if (!tie) return false;
      if (tie.single) return hg === ag;
      if (tie.firstLeg) {                           // this match is the 2nd leg; firstLeg from THIS home side's view
        const aggH = hg + tie.firstLeg.ag, aggA = ag + tie.firstLeg.hg;   // home side here was away in leg 1
        if (aggH !== aggA) return false;
        const awayGoalsH = tie.firstLeg.ag, awayGoalsA = ag;
        return awayGoalsH === awayGoalsA;
      }
      return false;
    }
    function endOfTime() {
      if (!extraTime && tieLevel()) {
        extraTime = true; maxMinute = 120;
        say(90, 'et', null, 'et', {});
        return;
      }
      if (tie && tieLevel()) runShootout();
      finishMatch();
    }
    function runShootout() {
      const takers = s => active(s).slice().sort((x, y) => (y.role === 'G' ? -1 : 0) - (x.role === 'G' ? -1 : 0) || y.p.skill - x.p.skill);
      const tk = { home: takers(H), away: takers(A) };
      const gks = { home: keeper(H), away: keeper(A) };
      const score = { home: 0, away: 0 }, kicks = [];
      const conv = (t, g) => clamp(0.74 + (t.p.skill - (g ? g.p.skill : 30)) / 260, 0.5, 0.92);
      let round = 0;
      while (round < 30) {
        ['home', 'away'].forEach(k => {
          const list = tk[k]; const t = list[round % list.length]; const g = gks[k === 'home' ? 'away' : 'home'];
          const ok = rng() < conv(t, g);
          if (ok) score[k]++;
          kicks.push({ side: k, name: fullName(t.p), scored: ok });
        });
        round++;
        if (round >= 5 && score.home !== score.away) break;
        if (round < 5) {
          const left = 5 - round;
          if (score.home > score.away + left || score.away > score.home + left) break;
        }
      }
      shootout = { home: score.home, away: score.away, winner: score.home > score.away ? 'home' : 'away', kicks: kicks };
      say(maxMinute, 'shootout', null, null, {}, { text: 'Penalty shoot-out: ' + H.name + ' ' + score.home + '-' + score.away + ' ' + A.name + '. ' + (shootout.winner === 'home' ? H.name : A.name) + ' win!' });
    }
    function finishMatch() {
      if (finished) return;
      finished = true; pendingTalk = false;
      // final rating adjustments
      [H, A].forEach(s => {
        const gf = s === H ? hg : ag, ga = s === H ? ag : hg;
        const all = s.onPitch;
        const avgSkill = all.reduce((x, e) => x + e.p.skill, 0) / Math.max(1, all.length);
        all.forEach(e => {
          let r = e.rating + (gf > ga ? 0.35 : gf < ga ? -0.25 : 0.05);
          if (ga === 0 && (e.role === 'G' || e.role === 'D')) r += e.role === 'G' ? 0.5 : 0.3;
          r += (e.p.skill - avgSkill) / 60 + (rng() - 0.5) * 0.7;
          const played = (e.off ? (e.subbedOff || minute) : minute) - (e.cameOn || 0);
          if (played < 20) r = 6.0 + (r - 6.0) * 0.5;
          e.rating = clamp(Math.round(r * 10) / 10, 3, 10);
        });
      });
      say(maxMinute, 'ft', null, 'ft', { score: H.name + ' ' + hg + '-' + ag + ' ' + A.name });
    }

    /* ---- public API ------------------------------------------------- */
    function stats() {
      const t = H.stats.poss + A.stats.poss || 1;
      const possHome = Math.round(H.stats.poss / t * 100);
      return {
        possHome: possHome, possAway: 100 - possHome,
        shotsHome: H.stats.shots, shotsAway: A.stats.shots, sotHome: H.stats.sot, sotAway: A.stats.sot,
        cornersHome: H.stats.corners, cornersAway: A.stats.corners, foulsHome: H.stats.fouls, foulsAway: A.stats.fouls,
        xgHome: Math.round(H.stats.xg * 100) / 100, xgAway: Math.round(A.stats.xg * 100) / 100,
        yellowsHome: H.stats.yellows, yellowsAway: A.stats.yellows, redsHome: H.stats.reds, redsAway: A.stats.reds
      };
    }
    function sideView(s) {
      return {
        name: s.name, kit: s.kit, formation: s.formation, mentality: s.mentality, pressing: s.pressing, tempo: s.tempo,
        subsLeft: s.maxSubs - s.subsUsed, isUser: s.isUser,
        lineup: s.onPitch.map(e => ({ id: e.id, name: fullName(e.p), short: shortName(e.p), pos: e.p.pos, role: e.role, slot: e.slot,
          rating: Math.round(e.rating * 10) / 10, cond: Math.round(e.cond), goals: e.goals, assists: e.assists, yc: e.yc, rc: e.rc,
          off: e.off, injured: e.injured, needsSub: !!e.needsSub, cameOn: e.cameOn, skill: e.p.skill })),
        bench: s.bench.filter(p => !s.used.includes(p.id)).map(p => ({ id: p.id, name: fullName(p), short: shortName(p), pos: p.pos, skill: p.skill, fit: p.fit }))
      };
    }
    function runToEnd(maxSteps) {
      let g = 0;
      while (!finished && g++ < (maxSteps || 400)) {
        if (pendingTalk) teamTalk('encourage');
        step();
      }
      return api;
    }
    function teamTalk(kind) {
      if (!pendingTalk && talkDone) return { ok: false, text: 'The team talk has already been given.' };
      const s = H.isUser ? H : A, diff = s === H ? hg - ag : ag - hg;
      const st = strengths(), mine = s === H ? st.home : st.away, theirs = s === H ? st.away : st.home;
      const stronger = (mine.att + mine.mid + mine.def) > (theirs.att + theirs.mid + theirs.def) * 1.03;
      const table = {
        praise: diff > 0 ? 0.045 : diff === 0 ? 0.0 : -0.03,
        encourage: diff > 0 ? 0.01 : 0.03,
        demand: diff > 0 ? -0.03 : diff === 0 ? (stronger ? 0.03 : -0.01) : (stronger ? 0.055 : 0.01),
        calm: diff > 0 ? 0.03 : diff === 0 ? 0.015 : -0.015
      };
      const eff = (table[kind] != null ? table[kind] : 0.02) + (rng() - 0.5) * 0.02;
      s.talk = 1 + eff;
      pendingTalk = false; talkDone = true; invalidate();
      const text = eff >= 0.035 ? 'The players look fired up for the second half!' : eff >= 0.015 ? 'The players respond well.'
        : eff >= -0.005 ? 'The players seem unmoved.' : 'That talk did not go down well — heads have dropped.';
      say(45, 'talk', s, null, {}, { text: 'Team talk (' + (TALKS[kind] || kind) + '): ' + text });
      return { ok: true, text: text, effect: eff };
    }
    const api = {
      step: step,
      runToEnd: runToEnd,
      teamTalk: teamTalk,
      setMentality(sideKey, m) { const s = sides[sideKey]; if (s) { s.mentality = clamp(m | 0, -2, 2); invalidate(); } },
      setPressing(sideKey, v) { const s = sides[sideKey]; if (s) { s.pressing = clamp(v | 0, 0, 2); invalidate(); } },
      setTempo(sideKey, v) { const s = sides[sideKey]; if (s) { s.tempo = clamp(v | 0, 0, 2); invalidate(); } },
      setAutoSubs(sideKey, v) { const s = sides[sideKey]; if (s) s.autoSubs = !!v; },
      substitute(sideKey, offId, onId) {
        const s = sides[sideKey]; if (!s) return { ok: false, msg: 'No such side.' };
        if (s.subsUsed >= s.maxSubs) return { ok: false, msg: 'No substitutions left.' };
        const offE = s.onPitch.find(e => e.id === offId && !e.off);
        const onP = s.bench.find(p => p.id === onId && !s.used.includes(p.id));
        if (!offE || !onP) return { ok: false, msg: 'Pick a player on the pitch and one on the bench.' };
        offE.needsSub = false;
        return doSub(s, offE, onP) ? { ok: true } : { ok: false, msg: 'Substitution not allowed.' };
      },
      get minute() { return minute; },
      get finished() { return finished; },
      get halfTime() { return pendingTalk; },
      get extraTime() { return extraTime; },
      get maxMinute() { return maxMinute; },
      get score() { return { hg: hg, ag: ag }; },
      get feed() { return feed; },
      get momentum() { return momentum; },
      get poss() { return lastPoss; },
      state() {
        return { minute: minute, hg: hg, ag: ag, finished: finished, halfTime: pendingTalk, extraTime: extraTime,
          home: sideView(H), away: sideView(A), stats: stats(), shootout: shootout };
      },
      result() {
        const ratings = {}, apps = { home: [], away: [] };
        [H, A].forEach(s => s.onPitch.forEach(e => { ratings[e.id] = e.rating; apps[s.key].push(e.id); }));
        let best = null;
        [H, A].forEach(s => s.onPitch.forEach(e => { if (!best || e.rating > best.e.rating) best = { e: e, s: s }; }));
        return {
          hg: hg, ag: ag, events: goals.slice(), cards: cards.slice(), injuries: injuries.slice(), subs: subs.slice(),
          stats: stats(), ratings: ratings, apps: apps, extraTime: extraTime, shootout: shootout,
          assists: goals.filter(g => g.assistId != null).map(g => ({ side: g.side, id: g.assistId })),
          potm: best ? { id: best.e.id, name: fullName(best.e.p), side: best.s.key, rating: best.e.rating } : null,
          feed: feed.filter(f => f.text).map(f => ({ minute: f.minute, type: f.type, side: f.side, text: f.text }))
        };
      }
    };
    return api;
  }

  /* ---- quick win/draw/loss estimate for a configuration (Monte Carlo) - */
  function predict(cfg, n) {
    n = n || 120;
    let w = 0, d = 0, l = 0, gf = 0, ga = 0;
    for (let i = 0; i < n; i++) {
      const m = create(Object.assign({}, cfg, { seed: (cfg.seed + i * 7919) >>> 0, silent: true, autoTalk: true, tie: null }));
      m.runToEnd();
      const sc = m.score;
      const userHome = !!cfg.home.isUser;
      const us = userHome ? sc.hg : sc.ag, them = userHome ? sc.ag : sc.hg;
      gf += us; ga += them;
      if (us > them) w++; else if (us === them) d++; else l++;
    }
    return { win: w / n, draw: d / n, loss: l / n, gf: gf / n, ga: ga / n };
  }

  return { create, predict, FORMATIONS, FORMATION_NAMES, layout, suit, SUIT, MENTALITY, PRESSING, TEMPO, TALKS };
});
