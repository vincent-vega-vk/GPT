/*
 * SIMSOC 6 (remake) - data layer
 * Seeded RNG, name pools, club lists and player/squad generation.
 * Written as a UMD module so it loads in the browser (window.SimSocData)
 * and under Node (require) for the headless test harness.
 */
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SimSocData = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---- deterministic RNG (mulberry32) ---------------------------------- */
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const ri = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1)); // inclusive
  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

  /* ---- name pools ------------------------------------------------------ */
  const FORENAMES = [
    'Tony', 'Ian', 'Matthew', 'Kevin', 'Christopher', 'Barrie', 'Stuart', 'Mike',
    'Mark', 'Darren', 'Stacy', 'Rob', 'Norman', 'Eddie', 'Dave', 'Andrew',
    'Michael', 'Stewart', 'Steve', 'Clive', 'Lee', 'Greg', 'Tony', 'Brian',
    'Chris', 'John', 'Jason', 'Paul', 'Gary', 'Neil', 'Scott', 'Wayne',
    'Lee', 'Carl', 'Dean', 'Craig', 'Glen', 'Ryan', 'Adam', 'Danny',
    'Sean', 'Nicky', 'Terry', 'Barry', 'Alan', 'Keith', 'Trevor', 'Russell',
    'Marcus', 'Leon', 'Dale', 'Shaun', 'Jamie', 'Ashley', 'Damien', 'Frank'
  ];
  const SURNAMES = [
    'Elliott', 'Evans', 'Carbon', 'Dix', 'Fuller', 'Hart', 'Rae', 'Whitlow',
    'Bonner', 'Butcher', 'Coldicott', 'Cross', 'Graves', 'Youds', 'Comer', 'Martin',
    'Taylor', 'Ball', 'Buckley', 'Howarth', 'Lee', 'Thorpe', 'Rigg', 'Preston',
    'Pragnell', 'Foster', 'Lightfoot', 'Stockwell', 'Denilson', 'Peacock', 'Gittens',
    'Sinclair', 'Askey', 'Wright', 'Christie', 'Richards', 'Fettis', 'Johnson',
    'Pearce', 'Hughes', 'Barnes', 'Walsh', 'Lowe', 'Newton', 'Brooker', 'Reid',
    'Holmes', 'Dyer', 'Connor', 'Brennan', 'Salmon', 'Carter', 'Webb', 'Mortimer',
    'Bircham', 'Charles', 'Okafor', 'Mendez', 'Larsson', 'Bergkamp', 'Vialli'
  ];

  /* ---- the Conference (your league) ------------------------------------
   * Index 0 is the club the player manages by default. 22 clubs => 42 games.
   * `tier` (1 strongest .. 5 weakest) biases the strength of generated squads.
   */
  const CONFERENCE = [
    { name: 'Romford',            tier: 4 },
    { name: 'Slough Town',        tier: 3 },
    { name: 'Dagenham',           tier: 3 },
    { name: 'Hereford United',    tier: 1 },
    { name: 'Yeovil Town',        tier: 1 },
    { name: 'Woking',             tier: 2 },
    { name: 'Stevenage Borough',  tier: 1 },
    { name: 'Kidderminster Harr', tier: 2 },
    { name: 'Macclesfield Town',  tier: 2 },
    { name: 'Cheltenham Town',    tier: 2 },
    { name: 'Rushden & Diamonds', tier: 1 },
    { name: 'Telford United',     tier: 3 },
    { name: 'Welling United',     tier: 3 },
    { name: 'Kettering Town',     tier: 3 },
    { name: 'Morecambe',          tier: 3 },
    { name: 'Northwich Victoria', tier: 4 },
    { name: 'Dover Athletic',     tier: 4 },
    { name: 'Farnborough Town',   tier: 4 },
    { name: 'Hayes',              tier: 4 },
    { name: 'Leek Town',          tier: 5 },
    { name: 'Southport',          tier: 5 },
    { name: 'Gateshead',          tier: 5 }
  ];

  /* ---- broader club pool for the open transfer market ------------------ */
  const ENGLISH_CLUBS = [
    'Watford', 'Mansfield Town', 'Chelsea', 'Torquay United', 'Carlisle United',
    'Crewe Alexandra', 'Walsall', 'Wigan Athletic', 'Brentford', 'Colchester United',
    'Cardiff City', 'Exeter City', 'Rochdale', 'Hull City', 'Lincoln City',
    'Barnet', 'Leyton Orient', 'Swansea City', 'Notts County', 'Hartlepool United'
  ];
  const EURO_CLUBS = [
    'Paris St Germain', 'Ajax', 'FC Porto', 'Anderlecht', 'Feyenoord',
    'Sporting Lisbon', 'Celtic', 'Rangers', 'Hibernian', 'Sampdoria',
    'Bordeaux', 'PSV Eindhoven', 'Benfica', 'Galatasaray', 'Club Brugge'
  ];

  const POSITIONS = ['G', 'D', 'M', 'A'];
  const POS_NAME = { G: 'Goalkeeper', D: 'Defender', M: 'Midfielder', A: 'Attacker' };

  /* ---- value of a player given his skill ------------------------------- */
  function valueOf(skill, rng) {
    const base = 20000 + skill * skill * 14;
    const noise = rng ? (0.92 + rng() * 0.16) : 1; // +/-8%
    return Math.round(base * noise / 1) ;
  }

  let _id = 1;
  function nextId() { return _id++; }

  /* ---- one player ------------------------------------------------------ */
  function generatePlayer(rng, opts) {
    opts = opts || {};
    const pos = opts.pos || pick(rng, POSITIONS);
    // skill band: tier 1 (strong) -> higher skill; tier 5 (weak) -> lower.
    const tier = opts.tier == null ? 3 : opts.tier;
    const centre = 64 - (tier - 1) * 8;            // t1~64, t5~32
    let skill = Math.round(centre + (rng() - 0.5) * 34);
    if (opts.skill != null) skill = opts.skill;
    skill = Math.max(12, Math.min(96, skill));
    const fit = opts.fit != null ? opts.fit : ri(rng, 60, 100);
    return {
      id: nextId(),
      forename: pick(rng, FORENAMES),
      surname: pick(rng, SURNAMES),
      pos,
      skill,
      fit,
      injured: rng() < 0.05,
      appsSeason: 0, goalsSeason: 0,
      appsTotal: opts.appsTotal || 0, goalsTotal: opts.goalsTotal || 0,
      transferListed: false,
      value: valueOf(skill, rng)
    };
  }

  /* ---- a full squad (realistic position spread) ------------------------ */
  function generateSquad(rng, tier) {
    const plan = ['G', 'G',
      'D', 'D', 'D', 'D', 'D', 'D',
      'M', 'M', 'M', 'M', 'M', 'M',
      'A', 'A', 'A', 'A'];
    return plan.map(pos => generatePlayer(rng, { pos, tier }));
  }

  /* ---- a club -------------------------------------------------------- */
  // starting balance scales with the club's tier (stronger clubs are richer)
  const TIER_FUNDS = { 1: 520000, 2: 380000, 3: 270000, 4: 195000, 5: 120000 };
  function generateClub(rng, def) {
    const base = TIER_FUNDS[def.tier] || 200000;
    return {
      name: def.name,
      tier: def.tier,
      isUser: false,
      players: generateSquad(rng, def.tier),
      balance: Math.round(base * (0.85 + rng() * 0.3))
    };
  }

  return {
    makeRng, ri, pick,
    FORENAMES, SURNAMES,
    CONFERENCE, ENGLISH_CLUBS, EURO_CLUBS,
    POSITIONS, POS_NAME,
    valueOf, generatePlayer, generateSquad, generateClub
  };
});
