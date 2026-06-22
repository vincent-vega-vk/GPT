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

  /* ---- name pools (international, for that epic 90s feel) -------------- */
  const FORENAMES = [
    // British / Irish
    'Tony', 'Ian', 'Matthew', 'Kevin', 'Stuart', 'Mark', 'Darren', 'Rob', 'Eddie', 'Dave',
    'Andrew', 'Michael', 'Steve', 'Lee', 'Chris', 'John', 'Jason', 'Paul', 'Gary', 'Neil',
    'Scott', 'Wayne', 'Carl', 'Dean', 'Craig', 'Ryan', 'Danny', 'Sean', 'Alan', 'Keith',
    // Italian
    'Paolo', 'Marco', 'Alessandro', 'Roberto', 'Gianluca', 'Francesco', 'Fabio', 'Christian', 'Filippo', 'Andrea',
    // Spanish / Portuguese
    'Carlos', 'Raul', 'Fernando', 'Jose', 'Pedro', 'Sergio', 'Luis', 'Rui', 'Joao', 'Nuno',
    // French
    'Thierry', 'Zinedine', 'Didier', 'Laurent', 'Patrick', 'Christophe', 'Sylvain', 'Emmanuel', 'Youri', 'Robert',
    // German / Dutch / Nordic
    'Lothar', 'Jurgen', 'Oliver', 'Stefan', 'Dennis', 'Marc', 'Edwin', 'Patrick', 'Henrik', 'Brian',
    // South American / African / Eastern Europe
    'Gabriel', 'Rivaldo', 'Romario', 'Diego', 'Juan', 'Hidetoshi', 'Nwankwo', 'Jay-Jay', 'Hristo', 'Pavel',
    'Andriy', 'Davor', 'Georgi', 'Krassimir', 'Igor', 'Dragan', 'Emre', 'Hakan', 'Abedi', 'Tony'
  ];
  const SURNAMES = [
    // British / Irish
    'Elliott', 'Evans', 'Fuller', 'Hart', 'Cross', 'Graves', 'Taylor', 'Ball', 'Lee', 'Foster',
    'Wright', 'Johnson', 'Pearce', 'Hughes', 'Barnes', 'Reid', 'Carter', 'Webb', 'Sinclair', 'Sheringham',
    // Italian
    'Maldini', 'Baggio', 'Zola', 'Vialli', 'Costacurta', 'Albertini', 'Di Matteo', 'Ravanelli', 'Inzaghi', 'Cannavaro',
    // Spanish / Portuguese
    'Hierro', 'Guardiola', 'Raul', 'Morientes', 'Figo', 'Rui Costa', 'Couto', 'Sousa', 'Amancio', 'Sergi',
    // French
    'Zidane', 'Henry', 'Deschamps', 'Blanc', 'Vieira', 'Petit', 'Djorkaeff', 'Karembeu', 'Dugarry', 'Lizarazu',
    // German / Dutch / Nordic
    'Matthaus', 'Klinsmann', 'Kahn', 'Sammer', 'Bergkamp', 'Kluivert', 'Davids', 'Seedorf', 'Larsson', 'Laudrup',
    // South American / African / Eastern Europe / Asia
    'Ronaldo', 'Rivaldo', 'Romario', 'Batistuta', 'Veron', 'Nakata', 'Kanu', 'Okocha', 'Stoichkov', 'Nedved',
    'Shevchenko', 'Suker', 'Hagi', 'Mihajlovic', 'Boban', 'Prosinecki', 'Hakan', 'Pele', 'Weah', 'Yekini',
    'Mendez', 'Okafor', 'Lightfoot', 'Bircham', 'Charles', 'Denilson', 'Peacock', 'Brooker', 'Mortimer', 'Pragnell'
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

  /* ---- the division pyramid -------------------------------------------
   * Top (level 1) to bottom (the Conference, where a new manager starts).
   * Each division holds CLUBS_PER_DIVISION clubs; the bottom division uses the
   * CONFERENCE list above, the upper divisions draw from UPPER_CLUBS.
   */
  const CLUBS_PER_DIVISION = 22;
  const DIVISION_DEFS = [
    { name: 'Premier Division', tierBase: 1, size: 20 },
    { name: 'Division One',     tierBase: 2, size: 22 },
    { name: 'Division Two',     tierBase: 3, size: 22 },
    { name: 'Conference',       tierBase: 4, size: 22 }
  ];
  // 66 clubs for the three divisions above the Conference (22 each, in order)
  const UPPER_CLUBS = [
    // Premier Division
    'Arsenal', 'Aston Villa', 'Liverpool', 'Manchester United', 'Manchester City',
    'Tottenham Hotspur', 'Everton', 'Newcastle United', 'Leeds United', 'West Ham United',
    'Blackburn Rovers', 'Leicester City', 'Derby County', 'Middlesbrough', 'Sheffield Wednesday',
    'Coventry City', 'Southampton', 'Sunderland', 'Nottingham Forest', 'Wimbledon',
    'Bolton Wanderers', 'Charlton Athletic',
    // Division One
    'Barnsley', 'Bradford City', 'Ipswich Town', 'Wolverhampton W', 'Birmingham City',
    'Norwich City', 'Sheffield United', 'Huddersfield Town', 'Stockport County', 'Crystal Palace',
    'Queens Park Rangers', 'Portsmouth', 'Tranmere Rovers', 'Bristol City', 'Oxford United',
    'Grimsby Town', 'Port Vale', 'Swindon Town', 'Bury', 'Fulham',
    'Burnley', 'Gillingham',
    // Division Two
    'Wrexham', 'Preston North End', 'Bournemouth', 'Luton Town', 'Millwall',
    'Blackpool', 'Bristol Rovers', 'Wycombe Wanderers', 'Chesterfield', 'Plymouth Argyle',
    'Darlington', 'Scunthorpe United', 'Shrewsbury Town', 'Cambridge United', 'Brighton & Hove',
    'Reading', 'Stoke City', 'Wigan Athletic', 'Notts County', 'Colchester United',
    'Brentford', 'Cardiff City'
  ];

  // continental clubs that fill out the European competitions (knockout only).
  // A 64-team Champions League + 64-team UEFA Cup need a deep pool.
  const FOREIGN_CLUBS = [
    // Spain
    'Real Madrid', 'Barcelona', 'Atletico Madrid', 'Valencia', 'Deportivo', 'Real Sociedad', 'Athletic Bilbao',
    'Real Betis', 'Sevilla', 'Celta Vigo', 'Zaragoza', 'Espanyol', 'Tenerife', 'Mallorca', 'Valladolid',
    // Italy
    'Juventus', 'AC Milan', 'Inter Milan', 'AS Roma', 'Lazio', 'Parma', 'Fiorentina', 'Napoli', 'Sampdoria',
    'Torino', 'Udinese', 'Bologna', 'Vicenza', 'Cagliari', 'Perugia', 'Brescia',
    // Germany
    'Bayern Munich', 'Borussia Dortmund', 'Bayer Leverkusen', 'Schalke 04', 'Werder Bremen', 'Stuttgart',
    'Hamburg', 'Kaiserslautern', 'Moenchengladbach', 'FC Cologne', 'Hertha Berlin', 'Wolfsburg', 'Freiburg',
    // France
    'Marseille', 'AS Monaco', 'Lyon', 'Paris St Germain', 'Bordeaux', 'Auxerre', 'Nantes', 'RC Lens',
    'Montpellier', 'Strasbourg', 'FC Metz', 'Bastia', 'Rennes', 'Guingamp',
    // Netherlands
    'Ajax', 'PSV Eindhoven', 'Feyenoord', 'Vitesse', 'Roda JC', 'FC Twente', 'Heerenveen', 'Willem II', 'AZ Alkmaar',
    // Portugal
    'FC Porto', 'Benfica', 'Sporting Lisbon', 'Boavista', 'Vitoria Guimaraes', 'SC Braga', 'Maritimo',
    // Belgium
    'Anderlecht', 'Club Brugge', 'Standard Liege', 'Genk', 'Lierse', 'AA Gent',
    // Scotland
    'Celtic', 'Rangers', 'Hearts', 'Aberdeen', 'Hibernian', 'Kilmarnock', 'Dundee United',
    // Turkey / Greece
    'Galatasaray', 'Fenerbahce', 'Besiktas', 'Trabzonspor', 'Panathinaikos', 'Olympiacos', 'AEK Athens', 'PAOK',
    // Russia / Ukraine
    'Spartak Moscow', 'CSKA Moscow', 'Dynamo Kyiv', 'Shakhtar Donetsk', 'Lokomotiv Moscow', 'Dynamo Moscow', 'Zenit',
    // Central / Eastern Europe
    'Steaua Bucharest', 'Rapid Bucharest', 'Red Star Belgrade', 'Partizan Belgrade', 'Dinamo Zagreb', 'Hajduk Split',
    'Sparta Prague', 'Slavia Prague', 'Legia Warsaw', 'Widzew Lodz', 'Ferencvaros', 'Slovan Bratislava',
    // Scandinavia
    'Rosenborg', 'Brondby', 'FC Copenhagen', 'IFK Gothenburg', 'Helsingborg', 'Molde', 'AaB Aalborg',
    // Alpine / others
    'Grasshoppers', 'FC Basel', 'Servette', 'Sturm Graz', 'Rapid Vienna', 'Austria Vienna', 'Maccabi Haifa',
    'APOEL', 'Dinamo Tbilisi', 'Levski Sofia', 'CSKA Sofia', 'Maccabi Tel Aviv', 'Hapoel Tel Aviv'
  ];

  const POSITIONS = ['G', 'D', 'M', 'A'];
  const POS_NAME = { G: 'Goalkeeper', D: 'Defender', M: 'Midfielder', A: 'Attacker' };

  /* ---- value of a player given his skill (and age) --------------------- */
  function valueOf(skill, rng, age) {
    let base = 20000 + skill * skill * 14;
    if (skill > 80) base += (skill - 80) * (skill - 80) * 1500;   // stars cost a premium
    const ageF = age == null ? 1 : age <= 20 ? 0.9 : age <= 29 ? 1 : age <= 32 ? 0.78 : 0.5;
    const noise = rng ? (0.92 + rng() * 0.16) : 1;                // +/-8%
    return Math.round(base * ageF * noise);
  }
  // re-price a player after his skill / age changes
  function recomputeValue(p, rng) { p.value = valueOf(p.skill, rng, p.age); return p.value; }

  let _id = 1;
  function nextId() { return _id++; }

  /* ---- one player ------------------------------------------------------ */
  function generatePlayer(rng, opts) {
    opts = opts || {};
    const pos = opts.pos || pick(rng, POSITIONS);
    const tier = opts.tier == null ? 3 : opts.tier;
    const centre = 70 - (tier - 1) * 8.5;            // t1~70, t5~36
    let skill = Math.round(centre + (rng() - 0.5) * 32);
    if (rng() < 0.04) skill += ri(rng, 12, 26);      // rare elite talents (reach the 90s)
    if (opts.skill != null) skill = opts.skill;
    skill = Math.max(20, Math.min(99, skill));
    const age = opts.age != null ? opts.age : ri(rng, 17, 33);
    const fit = opts.fit != null ? opts.fit : ri(rng, 70, 100);
    const injuredFor = opts.injuredFor != null ? opts.injuredFor : (rng() < 0.05 ? ri(rng, 1, 5) : 0);
    return {
      id: nextId(),
      forename: pick(rng, FORENAMES),
      surname: pick(rng, SURNAMES),
      pos, skill, age, fit,
      retireAge: opts.retireAge != null ? opts.retireAge : ri(rng, 35, 40),
      injuredFor, injured: injuredFor > 0,
      appsSeason: 0, goalsSeason: 0,
      appsTotal: opts.appsTotal || 0, goalsTotal: opts.goalsTotal || 0,
      transferListed: false,
      value: valueOf(skill, rng, age)
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
    CONFERENCE, ENGLISH_CLUBS, EURO_CLUBS, FOREIGN_CLUBS,
    CLUBS_PER_DIVISION, DIVISION_DEFS, UPPER_CLUBS,
    POSITIONS, POS_NAME,
    valueOf, recomputeValue, generatePlayer, generateSquad, generateClub
  };
});
