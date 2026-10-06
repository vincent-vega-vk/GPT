/* Super Rigori World Cup — torneo: 32 squadre, 8 gironi da 4, ottavi, quarti, semifinali, finalina e finale.
 * Tabellone identico a quello dei Mondiali 2022. Le partite non giocate dall'utente sono simulate
 * con lo stesso regolamento dei rigori (PK.Shootout) usando i rating delle squadre. */
(function (root) {
  'use strict';
  const PK = (root.PK = root.PK || {});
  const M = PK.M;
  const GROUP_IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  const STAGE_LABEL = {
    G1: 'Fase a gironi · Giornata 1',
    G2: 'Fase a gironi · Giornata 2',
    G3: 'Fase a gironi · Giornata 3',
    R16: 'Ottavi di finale',
    QF: 'Quarti di finale',
    SF: 'Semifinali',
    '3P': 'Finale 3º/4º posto',
    F: 'FINALE',
  };

  /** Probabilità di segnare di un rigorista contro un portiere (usata solo per le simulazioni) */
  function pScore(kickerAtk, gk) {
    return M.clamp(0.745 + (kickerAtk - gk) * 0.0042, 0.55, 0.9);
  }

  class Tournament {
    constructor(opts) {
      opts = opts || {};
      this.player = opts.player || null;
      this.seed = opts.seed != null ? opts.seed : (Math.random() * 1e9) | 0;
      this.difficulty = opts.difficulty || 'normal';
      this.rng = M.rng(this.seed);
      this.results = {}; // id -> result
      this.rounds = [];
      this.roundIndex = 0;
      this.scorers = {}; // "CODE|nome" -> gol
      this.groups = this._draw();
      this.over = false;
      this.champion = null;
      this._buildGroupRounds();
    }

    // ------------------------------------------------------------ sorteggio
    _draw() {
      const teams = PK.TEAMS.slice().sort((a, b) => PK.teamOverall(b) - PK.teamOverall(a));
      const pots = [0, 1, 2, 3].map((i) => teams.slice(i * 8, i * 8 + 8));
      const rng = this.rng;
      for (let attempt = 0; attempt < 500; attempt++) {
        const groups = GROUP_IDS.map((id) => ({ id, teams: [] }));
        let ok = true;
        for (let p = 0; p < 4 && ok; p++) {
          const order = M.shuffle(rng, pots[p]);
          const slots = M.shuffle(rng, groups);
          // assegna ogni squadra al primo gruppo valido (max 2 UEFA, max 1 per le altre confederazioni)
          const free = slots.slice();
          for (const t of order) {
            const idx = free.findIndex((g) => {
              const n = g.teams.filter((x) => PK.TEAM[x].conf === t.conf).length;
              return t.conf === 'UEFA' ? n < 2 : n < 1;
            });
            if (idx < 0) { ok = false; break; }
            free[idx].teams.push(t.code);
            free.splice(idx, 1);
          }
        }
        if (ok) return groups;
      }
      // fallback senza vincoli
      const groups = GROUP_IDS.map((id) => ({ id, teams: [] }));
      pots.forEach((pot) => M.shuffle(rng, pot).forEach((t, i) => groups[i].teams.push(t.code)));
      return groups;
    }

    _buildGroupRounds() {
      // calendario del Mondiale 2022: 1v2 3v4 | 4v2 1v3 | 4v1 2v3
      const sched = [
        [[0, 1], [2, 3]],
        [[3, 1], [0, 2]],
        [[3, 0], [1, 2]],
      ];
      sched.forEach((pairs, d) => {
        const matches = [];
        this.groups.forEach((g) => {
          pairs.forEach((p, k) => {
            matches.push({ id: `G${d + 1}-${g.id}-${k + 1}`, stage: 'G' + (d + 1), group: g.id, a: g.teams[p[0]], b: g.teams[p[1]], result: null });
          });
        });
        this.rounds.push({ id: 'G' + (d + 1), stage: 'group', label: STAGE_LABEL['G' + (d + 1)], matches });
      });
    }

    // -------------------------------------------------------------- accessi
    get round() { return this.rounds[this.roundIndex] || null; }
    stageLabel(id) { return STAGE_LABEL[id] || id; }
    team(code) { return PK.TEAM[code]; }
    group(id) { return this.groups.find((g) => g.id === id); }
    findMatch(id) {
      for (const r of this.rounds) for (const m of r.matches) if (m.id === id) return m;
      return null;
    }
    isKnockout(round) { return round && round.stage === 'ko'; }

    /** La partita del giocatore nel turno corrente (null se eliminato / nessuna) */
    playerMatch() {
      const r = this.round;
      if (!r || !this.player) return null;
      return r.matches.find((m) => !m.result && (m.a === this.player || m.b === this.player)) || null;
    }
    /** Il giocatore è ancora in gioco? */
    playerAlive() {
      if (!this.player || this.over) return false;
      return !this.eliminated(this.player);
    }
    eliminated(code) {
      // fuori nei gironi?
      if (this.rounds.length > 3) {
        // i gironi sono conclusi: eliminato se non è nel tabellone o ha perso un turno KO
        let inBracket = false;
        for (const r of this.rounds.slice(3)) {
          for (const m of r.matches) {
            if (m.a === code || m.b === code) {
              inBracket = true;
              if (m.result && m.result.winner && m.stage !== '3P') {
                const w = m.result.winner === 'A' ? m.a : m.b;
                if (w !== code) return true;
              }
            }
          }
        }
        return !inBracket;
      }
      return false;
    }

    // ------------------------------------------------------------ risultati
    /** Risultato di una serie di rigori: { goals:{A,B}, winner, kicks:[{team,scored,kicker}], first, sudden } */
    recordResult(matchId, result) {
      const m = this.findMatch(matchId);
      if (!m) throw new Error('partita sconosciuta ' + matchId);
      m.result = result;
      this.results[matchId] = result;
      (result.kicks || []).forEach((k) => {
        if (k.scored && k.kicker) {
          const code = k.team === 'A' ? m.a : m.b;
          const key = code + '|' + k.kicker;
          this.scorers[key] = (this.scorers[key] || 0) + 1;
        }
      });
    }

    /** Simula una partita tra due squadre non giocata dall'utente */
    simulate(m) {
      const A = PK.TEAM[m.a], B = PK.TEAM[m.b];
      const ko = m.stage !== 'G1' && m.stage !== 'G2' && m.stage !== 'G3';
      const first = this.rng() < 0.5 ? 'A' : 'B';
      const so = new PK.Shootout(ko ? 'knockout' : 'group', first);
      const sqA = PK.buildSquad(A), sqB = PK.buildSquad(B);
      const kicks = [];
      let guard = 0;
      while (!so.over && guard++ < 60) {
        const team = so.next;
        const T = team === 'A' ? A : B, O = team === 'A' ? B : A;
        const sq = team === 'A' ? sqA : sqB;
        const kicker = sq.kickers[so.nextIndex % sq.kickers.length];
        const atk = (T.atk + (kicker.acc + kicker.comp) * 50 - 80) * 0.5 + T.atk * 0.5;
        const sc = this.rng() < pScore(atk, O.gk);
        so.record(team, sc);
        kicks.push({ team, scored: sc, kicker: kicker.name, idx: so.taken[team] - 1 });
      }
      return { goals: { A: so.goals.A, B: so.goals.B }, winner: so.winner, kicks, first, sudden: so.taken.A > so.K || so.taken.B > so.K, sim: true };
    }

    /** Simula tutte le partite rimaste senza risultato nel turno corrente (tranne quelle del giocatore se `keepPlayer`) */
    simulateRound(keepPlayer) {
      const r = this.round;
      if (!r) return;
      r.matches.forEach((m) => {
        if (m.result) return;
        if (keepPlayer && this.player && (m.a === this.player || m.b === this.player)) return;
        this.recordResult(m.id, this.simulate(m));
      });
    }

    roundComplete() {
      const r = this.round;
      return !!r && r.matches.every((m) => m.result);
    }

    /** Se il turno corrente è completo passa al successivo creando gli incontri a eliminazione diretta */
    advance() {
      if (!this.roundComplete()) return false;
      const r = this.round;
      if (r.id === 'G3') this._buildR16();
      else if (r.id === 'R16') this._buildKO('QF', 'Quarti di finale', [[4, 5], [0, 1], [6, 7], [2, 3]], 'R16');
      else if (r.id === 'QF') this._buildKO('SF', 'Semifinali', [[0, 1], [2, 3]], 'QF');
      else if (r.id === 'SF') {
        this._buildFinals();
      } else if (r.id === '3P') {
        // dopo la finalina si gioca la finale
        this.roundIndex++;
        return true;
      } else if (r.id === 'F') {
        const m = r.matches[0];
        this.champion = m.result.winner === 'A' ? m.a : m.b;
        this.over = true;
        return true;
      }
      this.roundIndex++;
      return true;
    }

    winnerOf(m) { return m.result.winner === 'A' ? m.a : m.b; }
    loserOf(m) { return m.result.winner === 'A' ? m.b : m.a; }

    _buildR16() {
      const st = {};
      this.groups.forEach((g) => (st[g.id] = this.standings(g.id).map((s) => s.code)));
      const P = (g, pos) => st[g][pos - 1];
      const pairs = [
        [P('A', 1), P('B', 2)], [P('C', 1), P('D', 2)], [P('B', 1), P('A', 2)], [P('D', 1), P('C', 2)],
        [P('E', 1), P('F', 2)], [P('G', 1), P('H', 2)], [P('F', 1), P('E', 2)], [P('H', 1), P('G', 2)],
      ];
      this.rounds.push({
        id: 'R16', stage: 'ko', label: STAGE_LABEL.R16,
        matches: pairs.map((p, i) => ({ id: 'R16-' + (i + 1), stage: 'R16', a: p[0], b: p[1], result: null })),
      });
    }

    _buildKO(id, label, links, prevId) {
      const prev = this.rounds.find((r) => r.id === prevId);
      this.rounds.push({
        id, stage: 'ko', label,
        matches: links.map((l, i) => ({
          id: id + '-' + (i + 1), stage: id,
          a: this.winnerOf(prev.matches[l[0]]), b: this.winnerOf(prev.matches[l[1]]), result: null,
        })),
      });
    }

    _buildFinals() {
      const sf = this.rounds.find((r) => r.id === 'SF');
      this.rounds.push({
        id: '3P', stage: 'ko', label: STAGE_LABEL['3P'],
        matches: [{ id: '3P-1', stage: '3P', a: this.loserOf(sf.matches[0]), b: this.loserOf(sf.matches[1]), result: null }],
      });
      this.rounds.push({
        id: 'F', stage: 'ko', label: STAGE_LABEL.F,
        matches: [{ id: 'F-1', stage: 'F', a: this.winnerOf(sf.matches[0]), b: this.winnerOf(sf.matches[1]), result: null }],
      });
    }

    // ------------------------------------------------------------ classifiche
    _rows(groupId, onlyAmong) {
      const g = this.group(groupId);
      const rows = {};
      g.teams.forEach((c) => (rows[c] = { code: c, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }));
      this.rounds.slice(0, 3).forEach((r) =>
        r.matches.forEach((m) => {
          if (m.group !== groupId || !m.result) return;
          if (onlyAmong && !(onlyAmong.includes(m.a) && onlyAmong.includes(m.b))) return;
          const a = rows[m.a], b = rows[m.b], res = m.result;
          a.p++; b.p++;
          a.gf += res.goals.A; a.ga += res.goals.B;
          b.gf += res.goals.B; b.ga += res.goals.A;
          if (res.winner === 'A') { a.w++; b.l++; a.pts += 3; }
          else if (res.winner === 'B') { b.w++; a.l++; b.pts += 3; }
          else { a.d++; b.d++; a.pts++; b.pts++; }
        })
      );
      Object.values(rows).forEach((r) => (r.gd = r.gf - r.ga));
      return rows;
    }

    /** Classifica di un girone: punti, differenza reti, gol fatti, scontri diretti, sorteggio */
    standings(groupId) {
      const rows = this._rows(groupId);
      const list = Object.values(rows);
      const lots = M.rng(this.seed ^ M.hash('lots' + groupId));
      list.forEach((r) => (r.lot = lots()));
      const cmp = (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf;
      list.sort(cmp);
      // spareggi: scontri diretti tra le squadre ancora pari
      let i = 0;
      while (i < list.length) {
        let j = i + 1;
        while (j < list.length && cmp(list[i], list[j]) === 0) j++;
        if (j - i > 1) {
          const codes = list.slice(i, j).map((r) => r.code);
          const h2h = this._rows(groupId, codes);
          const sub = list.slice(i, j).sort((a, b) => cmp(h2h[a.code], h2h[b.code]) || a.lot - b.lot);
          for (let k = i; k < j; k++) list[k] = sub[k - i];
        }
        i = j;
      }
      return list;
    }

    groupDone(groupId) {
      return this.rounds.slice(0, 3).every((r) => r.matches.filter((m) => m.group === groupId).every((m) => m.result));
    }

    topScorers(n = 5) {
      return Object.entries(this.scorers)
        .map(([k, v]) => ({ code: k.split('|')[0], name: k.split('|')[1], goals: v }))
        .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name))
        .slice(0, n);
    }

    /** Fase raggiunta dal giocatore (testo) */
    playerStageText() {
      const p = this.player;
      if (!p) return '';
      if (this.champion === p) return 'Campione del Mondo';
      const ko = this.rounds.slice(3);
      if (!ko.length) return 'Fase a gironi';
      let last = null;
      ko.forEach((r) => r.matches.forEach((m) => { if (m.a === p || m.b === p) last = { r, m }; }));
      if (!last) return 'Fase a gironi';
      const { r, m } = last;
      if (r.id === 'F') return m.result ? 'Finalista' : 'In finale';
      if (r.id === '3P') return m.result ? (this.winnerOf(m) === p ? 'Terzo posto' : 'Quarto posto') : 'Finale 3º posto';
      return { R16: 'Ottavi di finale', QF: 'Quarti di finale', SF: 'Semifinali' }[r.id];
    }

    // ---------------------------------------------------------- persistenza
    toJSON() {
      return {
        v: 1, player: this.player, seed: this.seed, difficulty: this.difficulty, roundIndex: this.roundIndex,
        rounds: this.rounds, scorers: this.scorers, groups: this.groups, over: this.over, champion: this.champion,
      };
    }
    static fromJSON(o) {
      const t = new Tournament({ player: o.player, seed: o.seed, difficulty: o.difficulty });
      t.rounds = o.rounds;
      t.roundIndex = o.roundIndex;
      t.scorers = o.scorers;
      t.groups = o.groups;
      t.over = o.over;
      t.champion = o.champion;
      return t;
    }
  }

  Tournament.STAGE_LABEL = STAGE_LABEL;
  Tournament.pScore = pScore;
  PK.Tournament = Tournament;
  if (typeof module !== 'undefined' && module.exports) module.exports = PK;
})(typeof window !== 'undefined' ? window : globalThis);
