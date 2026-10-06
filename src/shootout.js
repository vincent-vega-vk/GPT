/* Super Rigori World Cup — regolamento della serie di rigori (puro, senza DOM)
 *
 *  - kick alternati A/B, serie da 5 per squadra
 *  - modalità 'knockout': terminazione anticipata quando una squadra non può più essere raggiunta,
 *    poi oltranza (a coppie di tiri) fino a quando, a parità di rigori battuti, c'è una differenza reti
 *  - modalità 'group': si battono sempre tutti e 5 i rigori; il pareggio è ammesso (1 punto)
 */
(function (root) {
  'use strict';
  const PK = (root.PK = root.PK || {});
  const other = (t) => (t === 'A' ? 'B' : 'A');

  class Shootout {
    constructor(mode = 'knockout', first = 'A', perSide = 5) {
      this.mode = mode;
      this.first = first;
      this.K = perSide;
      this.kicks = []; // {team, scored, idx}
      this.goals = { A: 0, B: 0 };
      this.taken = { A: 0, B: 0 };
      this.over = false;
      this.winner = null; // 'A' | 'B' | null (pareggio solo nei gironi)
    }

    get next() {
      return this.kicks.length % 2 === 0 ? this.first : other(this.first);
    }
    get sudden() {
      return this.taken.A >= this.K && this.taken.B >= this.K;
    }
    /** indice (0-based) del prossimo rigore della squadra che deve battere */
    get nextIndex() {
      return this.taken[this.next];
    }

    record(team, scored) {
      if (this.over) throw new Error('serie già conclusa');
      if (team !== this.next) throw new Error('turno sbagliato: tocca a ' + this.next);
      this.kicks.push({ team, scored: !!scored, idx: this.taken[team] });
      this.taken[team]++;
      if (scored) this.goals[team]++;
      this._check();
      return this.over;
    }

    _check() {
      const { A: gA, B: gB } = this.goals;
      const tA = this.taken.A, tB = this.taken.B, K = this.K;
      if (this.mode === 'group') {
        if (tA >= K && tB >= K) this._end(gA > gB ? 'A' : gB > gA ? 'B' : null);
        return;
      }
      if (tA < K || tB < K) {
        // fase regolare: terminazione anticipata
        const remA = Math.max(0, K - tA), remB = Math.max(0, K - tB);
        if (gA > gB + remB) return this._end('A');
        if (gB > gA + remA) return this._end('B');
        return;
      }
      // oltranza: decide solo a parità di tiri battuti
      if (tA === tB && gA !== gB) this._end(gA > gB ? 'A' : 'B');
    }

    _end(w) {
      this.over = true;
      this.winner = w;
    }

    /** Situazione del prossimo tiro, per pressione psicologica / commento */
    situation() {
      const team = this.next, opp = other(team);
      const K = this.K;
      const tT = this.taken[team], tO = this.taken[opp];
      const gT = this.goals[team], gO = this.goals[opp];
      const sudden = this.sudden;
      let mustScore = false, matchPoint = false;
      if (this.mode === 'group') {
        const remT = K - tT - 1, remO = K - tO;
        mustScore = false;
        matchPoint = false;
        return { team, sudden: false, mustScore, matchPoint, round: tT + 1, pressure: 0.15 + 0.1 * (tT / K), decisive: false, remT, remO };
      }
      if (tT >= K) {
        // oltranza: siamo nel turno (tT === tO) o chi calcia per secondo (tT === tO - 1... )
        if (team === this.first) {
          // calcio per primo il turno: non decide ancora
          mustScore = false;
          matchPoint = false;
        } else {
          // secondo: se l'altro ha segnato nel turno, dobbiamo segnare; se ha sbagliato, segnando vinciamo
          const last = this.kicks[this.kicks.length - 1];
          mustScore = !!(last && last.scored);
          matchPoint = !!(last && !last.scored);
        }
      } else {
        const remT = K - tT - 1; // dopo questo tiro
        const remO = Math.max(0, K - tO);
        // se sbaglio ora e l'avversario ha già più gol di quanti ne potrei raggiungere -> devo segnare
        mustScore = gO > gT + remT;
        // se segno ora e l'avversario non può raggiungermi -> tiro decisivo
        matchPoint = gT + 1 > gO + remO;
      }
      let pressure = 0.2 + 0.1 * Math.min(tT, 4);
      if (matchPoint) pressure = 0.78;
      if (mustScore) pressure = 0.95;
      if (sudden) pressure = Math.max(pressure, 0.88);
      return { team, sudden, mustScore, matchPoint, round: tT + 1, pressure: Math.min(1, pressure), decisive: mustScore || matchPoint };
    }

    toJSON() {
      return { mode: this.mode, first: this.first, K: this.K, kicks: this.kicks.slice(), goals: this.goals, taken: this.taken, over: this.over, winner: this.winner };
    }
    static other(t) {
      return other(t);
    }
  }

  PK.Shootout = Shootout;
  if (typeof module !== 'undefined' && module.exports) module.exports = PK;
})(typeof window !== 'undefined' ? window : globalThis);
