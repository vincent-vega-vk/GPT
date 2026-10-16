/*
 * SIMSOC 6 (remake) - data layer
 * Seeded RNG, the football world (nations, leagues, clubs, kit colours),
 * per-nation name pools, the economy tables and player / squad generation.
 * Written as a UMD module so it loads in the browser (window.SimSocData)
 * and under Node (require) for the headless test harness.
 *
 * Every player is procedurally generated. Club names are the real-world
 * clubs of the late 90s (facts); player names are random combinations from
 * per-nation pools, with a guard that re-rolls any combination that would
 * reproduce a famous real player of the era.
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
  function hashStr(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function weighted(rng, table) {          // table: {key: weight}
    let tot = 0; for (const k in table) tot += table[k];
    let r = rng() * tot;
    for (const k in table) { r -= table[k]; if (r <= 0) return k; }
    return Object.keys(table)[0];
  }

  /* ---- nations ---------------------------------------------------------- */
  const NATIONS = {
    ENG: 'England', SCO: 'Scotland', WAL: 'Wales', NIR: 'Northern Ireland', IRL: 'Ireland',
    ITA: 'Italy', ESP: 'Spain', GER: 'Germany', FRA: 'France', NED: 'Netherlands', POR: 'Portugal',
    BEL: 'Belgium', TUR: 'Turkey', GRE: 'Greece', RUS: 'Russia', UKR: 'Ukraine', ROU: 'Romania',
    YUG: 'Yugoslavia', CRO: 'Croatia', CZE: 'Czech Republic', POL: 'Poland', HUN: 'Hungary',
    SVK: 'Slovakia', NOR: 'Norway', DEN: 'Denmark', SWE: 'Sweden', FIN: 'Finland', SUI: 'Switzerland',
    AUT: 'Austria', ISR: 'Israel', CYP: 'Cyprus', GEO: 'Georgia', BUL: 'Bulgaria', SLO: 'Slovenia',
    BRA: 'Brazil', ARG: 'Argentina', URU: 'Uruguay', COL: 'Colombia', NGA: 'Nigeria', GHA: 'Ghana',
    CMR: 'Cameroon', LBR: 'Liberia', AUS: 'Australia', USA: 'USA'
  };

  /* ---- name pools (90s flavour, per culture) ---------------------------- */
  const POOLS = {
    british: {
      f: ['Tony', 'Ian', 'Matthew', 'Kevin', 'Stuart', 'Mark', 'Darren', 'Rob', 'Eddie', 'Dave', 'Andrew', 'Michael', 'Steve', 'Lee',
        'Chris', 'John', 'Jason', 'Paul', 'Gary', 'Neil', 'Scott', 'Wayne', 'Carl', 'Dean', 'Craig', 'Ryan', 'Danny', 'Sean', 'Alan',
        'Keith', 'Graham', 'Nigel', 'Trevor', 'Jamie', 'Robbie', 'Gareth', 'Jimmy', 'Phil', 'Martin', 'Colin', 'Simon', 'Mick'],
      s: ['Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson', 'Davies', 'Robinson', 'Wright', 'Thompson', 'Evans',
        'Walker', 'White', 'Roberts', 'Green', 'Hall', 'Wood', 'Jackson', 'Clarke', 'Elliott', 'Fuller', 'Hart', 'Cross', 'Graves',
        'Ball', 'Lee', 'Foster', 'Pearce', 'Hughes', 'Barnes', 'Reid', 'Carter', 'Webb', 'Sinclair', 'Lightfoot', 'Bircham', 'Charles',
        'Peacock', 'Brooker', 'Mortimer', 'Pragnell', 'Dixon', 'Adams', 'Keown', 'Platt', 'Merson', 'Sherwood', 'Batty', 'Ince',
        'Southgate', 'Redknapp', 'Fowler', 'Ferdinand', 'Dublin', 'Sutton', 'Wise', 'Townsend', 'Stone', 'Speed', 'Palmer', 'Hinchcliffe']
    },
    scottish: {
      f: ['Ally', 'Gordon', 'Craig', 'Colin', 'Tosh', 'Jim', 'Billy', 'Kenny', 'Stuart', 'John', 'Paul', 'Darren', 'Scott', 'Neil',
        'Andy', 'Gary', 'Derek', 'Tommy', 'Brian', 'Ian', 'Jackie', 'Davie', 'Callum', 'Fraser'],
      s: ['McAllister', 'McStay', 'McCoist', 'Durie', 'Gough', 'Hendry', 'Boyd', 'McKinlay', 'Collins', 'Lambert', 'Burley',
        'Gallacher', 'McCann', 'Ferguson', 'Wallace', 'Robertson', 'Campbell', 'Stewart', 'Murray', 'Paterson', 'Duffy', 'Kerr',
        'Black', 'Gray', 'Hamilton', 'McLeish', 'Calderwood', 'Jess', 'Booth', 'Whyte', 'McNamara', 'Weir']
    },
    italian: {
      f: ['Paolo', 'Marco', 'Alessandro', 'Roberto', 'Gianluca', 'Francesco', 'Fabio', 'Christian', 'Filippo', 'Andrea', 'Giuseppe',
        'Luca', 'Massimo', 'Stefano', 'Daniele', 'Antonio', 'Gianfranco', 'Enrico', 'Simone', 'Giovanni', 'Lorenzo', 'Dino', 'Angelo',
        'Demetrio', 'Moreno', 'Attilio', 'Ciro', 'Diego', 'Alessio', 'Gennaro'],
      s: ['Rossi', 'Bianchi', 'Russo', 'Ferrari', 'Esposito', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo',
        'Conti', 'De Luca', 'Costa', 'Giordano', 'Mancini', 'Rizzo', 'Lombardi', 'Moretti', 'Barbieri', 'Fontana', 'Santoro', 'Mariani',
        'Rinaldi', 'Caruso', 'Ferri', 'Galli', 'Martini', 'Leone', 'Longo', 'Gentile', 'Martinelli', 'Vitale', 'Serra', 'Coppola',
        'Maldini', 'Baggio', 'Zola', 'Vialli', 'Costacurta', 'Albertini', 'Di Matteo', 'Ravanelli', 'Inzaghi', 'Cannavaro', 'Di Livio',
        'Fuser', 'Peruzzi', 'Nesta', 'Panucci', 'Chiesa', 'Casiraghi', 'Signori', 'Pagliuca', 'Bergomi', 'Ferrara', 'Tacchinardi']
    },
    spanish: {
      f: ['Carlos', 'Raul', 'Fernando', 'Jose', 'Pedro', 'Sergio', 'Luis', 'Juan', 'Manuel', 'Javier', 'Miguel', 'Antonio', 'Francisco',
        'Alberto', 'Ivan', 'Ruben', 'Julen', 'Kiko', 'Alfonso', 'Fran', 'Guillermo', 'Rafael', 'Jordi', 'Albert', 'Txiki', 'Aitor'],
      s: ['Garcia', 'Martinez', 'Lopez', 'Sanchez', 'Gonzalez', 'Perez', 'Rodriguez', 'Fernandez', 'Gomez', 'Martin', 'Jimenez',
        'Ruiz', 'Hernandez', 'Diaz', 'Moreno', 'Alvarez', 'Romero', 'Navarro', 'Torres', 'Dominguez', 'Vazquez', 'Ramos', 'Gil',
        'Serrano', 'Blanco', 'Molina', 'Hierro', 'Guardiola', 'Morientes', 'Amancio', 'Sergi', 'Nadal', 'Alkorta', 'Mendieta',
        'Etxeberria', 'Urzaiz', 'Salinas', 'Caminero', 'Luque', 'Bakero', 'Goikoetxea', 'Valeron']
    },
    portuguese: {
      f: ['Rui', 'Joao', 'Nuno', 'Paulo', 'Jorge', 'Fernando', 'Luis', 'Vitor', 'Ricardo', 'Hugo', 'Sergio', 'Carlos', 'Pedro', 'Manuel',
        'Jose', 'Mario', 'Antonio', 'Tiago', 'Abel', 'Dimas'],
      s: ['Silva', 'Santos', 'Ferreira', 'Pereira', 'Oliveira', 'Costa', 'Rodrigues', 'Martins', 'Sousa', 'Fernandes', 'Goncalves',
        'Gomes', 'Lopes', 'Marques', 'Alves', 'Almeida', 'Ribeiro', 'Pinto', 'Carvalho', 'Teixeira', 'Couto', 'Baia', 'Secretario',
        'Paneira', 'Folha', 'Capucho', 'Oceano', 'Barbosa', 'Rocha', 'Moreira']
    },
    brazilian: {
      f: ['Marcio', 'Claudio', 'Edmilson', 'Leonardo', 'Flavio', 'Jose', 'Mauro', 'Sergio', 'Wagner', 'Andre', 'Rodrigo', 'Fabio',
        'Ze', 'Alex', 'Emerson', 'Juninho', 'Zinho', 'Edilson', 'Marcos', 'Roberto', 'Paulo', 'Giovanni', 'Luizao', 'Elber'],
      s: ['Silva', 'Santos', 'Souza', 'Oliveira', 'Pereira', 'Lima', 'Costa', 'Ferreira', 'Almeida', 'Carvalho', 'Gomes', 'Ribeiro',
        'Martins', 'Rocha', 'Barbosa', 'Araujo', 'Cardoso', 'Teixeira', 'Moreira', 'Nascimento', 'Dias', 'Mendes', 'Jardel', 'Amaral',
        'Conceicao', 'Cruz', 'Aldair', 'Junior', 'Paulista', 'Baiano']
    },
    latam: {
      f: ['Gabriel', 'Diego', 'Juan', 'Hernan', 'Ariel', 'Claudio', 'Marcelo', 'Javier', 'Matias', 'Carlos', 'Sebastian', 'Pablo',
        'Roberto', 'Martin', 'Fernando', 'Alvaro', 'Enzo', 'Faustino', 'Freddy', 'Rene', 'Gustavo', 'Nelson'],
      s: ['Batistuta', 'Veron', 'Simeone', 'Crespo', 'Ortega', 'Zanetti', 'Almeyda', 'Sensini', 'Ayala', 'Balbo', 'Caniggia',
        'Redondo', 'Gallardo', 'Lopez', 'Fernandez', 'Gonzalez', 'Rodriguez', 'Gutierrez', 'Francescoli', 'Recoba', 'Montero',
        'Poyet', 'Valderrama', 'Asprilla', 'Rincon', 'Aristizabal', 'Valencia', 'Sorin', 'Chamot', 'Vivas']
    },
    french: {
      f: ['Thierry', 'Zinedine', 'Didier', 'Laurent', 'Patrick', 'Christophe', 'Sylvain', 'Emmanuel', 'Youri', 'Robert', 'Fabien',
        'Bixente', 'Marcel', 'Lilian', 'Frank', 'Vincent', 'Nicolas', 'Olivier', 'Stephane', 'Eric', 'Bruno', 'Pascal', 'Ibrahim',
        'Alain', 'Franck', 'Florian', 'David', 'Ludovic', 'Mickael', 'Jean-Pierre'],
      s: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent',
        'Lefebvre', 'Michel', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'Andre', 'Mercier', 'Dupont',
        'Lambert', 'Bonnet', 'Francois', 'Zidane', 'Henry', 'Deschamps', 'Blanc', 'Vieira', 'Djorkaeff', 'Karembeu', 'Dugarry',
        'Lizarazu', 'Guivarch', 'Pires', 'Wiltord', 'Candela', 'Boghossian', 'Pedros', 'Ginola', 'Thuram', 'Desailly', 'Leboeuf']
    },
    german: {
      f: ['Lothar', 'Jurgen', 'Oliver', 'Stefan', 'Dennis', 'Marc', 'Thomas', 'Andreas', 'Markus', 'Michael', 'Christian', 'Jens',
        'Uwe', 'Matthias', 'Mario', 'Carsten', 'Dieter', 'Steffen', 'Thorsten', 'Ulf', 'Bernd', 'Sven', 'Frank', 'Jorg', 'Karsten'],
      s: ['Muller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Koch', 'Richter',
        'Klein', 'Wolf', 'Schroder', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun', 'Kruger', 'Hartmann', 'Lange', 'Matthaus',
        'Klinsmann', 'Kahn', 'Sammer', 'Bierhoff', 'Kohler', 'Moller', 'Hassler', 'Ziege', 'Effenberg', 'Basler', 'Helmer', 'Bobic',
        'Jancker', 'Kirsten', 'Kopke', 'Reuter', 'Freund', 'Hamann', 'Heinrich', 'Ricken', 'Babbel']
    },
    dutch: {
      f: ['Edwin', 'Patrick', 'Dennis', 'Marc', 'Frank', 'Ronald', 'Clarence', 'Edgar', 'Jaap', 'Wim', 'Arthur', 'Giovanni', 'Pierre',
        'Jimmy', 'Ruud', 'Phillip', 'Boudewijn', 'Winston', 'Michael', 'Peter', 'Jan', 'Bert', 'Kees', 'Johan', 'Danny', 'Aron'],
      s: ['de Jong', 'Jansen', 'de Vries', 'van den Berg', 'van Dijk', 'Bakker', 'Janssen', 'Visser', 'Smit', 'Meijer', 'de Boer',
        'Mulder', 'de Groot', 'Bos', 'Vos', 'Peters', 'Hendriks', 'van Leeuwen', 'Dekker', 'Brouwer', 'Bergkamp', 'Kluivert', 'Davids',
        'Seedorf', 'Overmars', 'Cocu', 'Stam', 'Reiziger', 'Numan', 'Zenden', 'Bosvelt', 'Witschge', 'Winter', 'Hoekstra',
        'van Hooijdonk', 'Makaay', 'Bogarde', 'Jonk']
    },
    nordic: {
      f: ['Henrik', 'Brian', 'Michael', 'Ole', 'Jesper', 'Stig', 'Tore', 'Kjetil', 'Jan', 'Thomas', 'Peter', 'Morten', 'Lars', 'Anders',
        'Erik', 'Mikael', 'Kennet', 'Tomas', 'Jonas', 'Patrik', 'Jari', 'Sami'],
      s: ['Larsson', 'Laudrup', 'Hansen', 'Johansen', 'Olsen', 'Nielsen', 'Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson',
        'Pedersen', 'Jensen', 'Solskjaer', 'Flo', 'Rekdal', 'Berg', 'Iversen', 'Schmeichel', 'Helveg', 'Tomasson', 'Brolin', 'Dahlin',
        'Ravelli', 'Thern', 'Ingesson', 'Alexandersson', 'Mjallby', 'Litmanen', 'Hyypia']
    },
    eastern: {
      f: ['Andriy', 'Davor', 'Georgi', 'Krassimir', 'Igor', 'Dragan', 'Hristo', 'Pavel', 'Gheorghe', 'Dan', 'Viorel', 'Predrag',
        'Sinisa', 'Zvonimir', 'Robert', 'Slaven', 'Aljosa', 'Dejan', 'Savo', 'Vladimir', 'Sergei', 'Dmitri', 'Valeri', 'Oleg',
        'Alexander', 'Tomas', 'Karel', 'Jiri', 'Radoslav', 'Lubos', 'Marek', 'Piotr', 'Tomasz', 'Jerzy', 'Zoltan', 'Florin'],
      s: ['Shevchenko', 'Rebrov', 'Suker', 'Boban', 'Prosinecki', 'Mihajlovic', 'Stoichkov', 'Balakov', 'Hagi', 'Popescu', 'Petrescu',
        'Lacatus', 'Ilie', 'Mijatovic', 'Savicevic', 'Stojkovic', 'Jugovic', 'Nedved', 'Poborsky', 'Berger', 'Smicer', 'Kuka',
        'Karpin', 'Mostovoi', 'Kanchelskis', 'Radchenko', 'Onopko', 'Kolyvanov', 'Kovalenko', 'Petrov', 'Ivanov', 'Popov', 'Novak',
        'Kowalski', 'Nowak', 'Wisniewski', 'Dudek', 'Juskowiak', 'Horvath', 'Kovacs', 'Bilic', 'Stimac', 'Jarni', 'Asanovic']
    },
    turkgreek: {
      f: ['Hakan', 'Emre', 'Tugay', 'Arif', 'Ogun', 'Sergen', 'Rustu', 'Okan', 'Abdullah', 'Tayfun', 'Yiorgos', 'Nikos', 'Vasilis',
        'Dimitris', 'Stelios', 'Theodoros', 'Kostas', 'Angelos', 'Panagiotis', 'Christos', 'Eyal', 'Avi', 'Haim'],
      s: ['Sukur', 'Unsal', 'Kerimoglu', 'Temizkan', 'Erdem', 'Ozalan', 'Recber', 'Buruk', 'Yalcin', 'Korkmaz', 'Georgiadis',
        'Machlas', 'Tsiartas', 'Zagorakis', 'Nikolaidis', 'Anastopoulos', 'Papadopoulos', 'Ouzounidis', 'Dabizas', 'Konstantinidis',
        'Alexandris', 'Berkovic', 'Revivo', 'Banin']
    },
    african: {
      f: ['Nwankwo', 'Jay-Jay', 'Abedi', 'George', 'Sunday', 'Finidi', 'Taribo', 'Daniel', 'Emmanuel', 'Samuel', 'Rigobert',
        'Patrick', 'Celestine', 'Victor', 'Tijani', 'Uche', 'Samson', 'Kalusha', 'Lucas', 'Joseph', 'Marc-Vivien', 'Pierre', 'Alain',
        'Raymond', 'Augustine', 'Kwame'],
      s: ['Kanu', 'Okocha', 'Pele', 'Weah', 'Yekini', 'Okafor', 'Amokachi', 'Babayaro', 'West', 'Oliseh', 'Ikpeba', 'Amunike',
        'Babangida', 'Yeboah', 'Song', 'Foe', 'Wome', 'Mboma', 'Kalla', 'Bwalya', 'Radebe', 'Fish', 'Masinga', 'Addo', 'Boateng',
        'Kuffour', 'Lamptey', 'Mensah', 'Okoronkwo', 'Etoo']
    }
  };
  const NAT_POOL = {
    ENG: 'british', WAL: 'british', NIR: 'british', IRL: 'british', AUS: 'british', USA: 'british', SCO: 'scottish',
    ITA: 'italian', ESP: 'spanish', POR: 'portuguese', BRA: 'brazilian', ARG: 'latam', URU: 'latam', COL: 'latam',
    FRA: 'french', BEL: 'french', GER: 'german', AUT: 'german', SUI: 'german', NED: 'dutch',
    DEN: 'nordic', SWE: 'nordic', NOR: 'nordic', FIN: 'nordic',
    RUS: 'eastern', UKR: 'eastern', CRO: 'eastern', YUG: 'eastern', ROU: 'eastern', BUL: 'eastern', CZE: 'eastern',
    SVK: 'eastern', POL: 'eastern', HUN: 'eastern', SLO: 'eastern', GEO: 'eastern',
    TUR: 'turkgreek', GRE: 'turkgreek', CYP: 'turkgreek', ISR: 'turkgreek',
    NGA: 'african', GHA: 'african', CMR: 'african', LBR: 'african'
  };
  // where imports come from (weights) - a 90s mix
  const IMPORT_WEIGHTS = {
    BRA: 12, ARG: 8, FRA: 8, NED: 7, ITA: 5, ESP: 5, GER: 6, POR: 5, NGA: 5, GHA: 3, CMR: 3, DEN: 4, SWE: 4, NOR: 4,
    CRO: 4, YUG: 4, RUS: 3, UKR: 2, CZE: 3, ROU: 3, BUL: 2, URU: 3, COL: 2, BEL: 3, IRL: 4, SCO: 4, WAL: 2, AUS: 2,
    USA: 1, GRE: 1, TUR: 1, SUI: 2, AUT: 1, FIN: 1
  };
  // famous real players of the era: a generated combination matching one of these is re-rolled
  const FAMOUS = new Set(('Paolo Maldini|Roberto Baggio|Dino Baggio|Gianfranco Zola|Gianluca Vialli|Alessandro Costacurta|Demetrio Albertini|' +
    'Roberto Di Matteo|Fabrizio Ravanelli|Filippo Inzaghi|Fabio Cannavaro|Angelo Di Livio|Diego Fuser|Angelo Peruzzi|Alessandro Nesta|' +
    'Christian Panucci|Enrico Chiesa|Pierluigi Casiraghi|Giuseppe Signori|Gianluca Pagliuca|Giuseppe Bergomi|Ciro Ferrara|' +
    'Alessio Tacchinardi|Moreno Torricelli|Francesco Totti|Alessandro Del Piero|Christian Vieri|Roberto Mancini|Attilio Lombardo|' +
    'Zinedine Zidane|Thierry Henry|Didier Deschamps|Laurent Blanc|Patrick Vieira|Emmanuel Petit|Youri Djorkaeff|Christian Karembeu|' +
    'Christophe Dugarry|Bixente Lizarazu|Stephane Guivarch|Robert Pires|Sylvain Wiltord|Vincent Candela|Alain Boghossian|' +
    'Lilian Thuram|Marcel Desailly|Frank Leboeuf|Fabien Barthez|David Ginola|Eric Cantona|Jean-Pierre Papin|Nicolas Anelka|' +
    'Lothar Matthaus|Jurgen Klinsmann|Oliver Kahn|Matthias Sammer|Oliver Bierhoff|Jurgen Kohler|Andreas Moller|Thomas Hassler|' +
    'Christian Ziege|Stefan Effenberg|Mario Basler|Thomas Helmer|Carsten Jancker|Ulf Kirsten|Andreas Kopke|Stefan Reuter|' +
    'Steffen Freund|Jorg Heinrich|Lars Ricken|Markus Babbel|Dennis Bergkamp|Patrick Kluivert|Edgar Davids|Clarence Seedorf|' +
    'Marc Overmars|Phillip Cocu|Jaap Stam|Michael Reiziger|Arthur Numan|Boudewijn Zenden|Frank de Boer|Ronald de Boer|' +
    'Pierre van Hooijdonk|Winston Bogarde|Aron Winter|Wim Jonk|Henrik Larsson|Brian Laudrup|Michael Laudrup|Peter Schmeichel|' +
    'Thomas Helveg|Thomas Brolin|Martin Dahlin|Kennet Andersson|Jari Litmanen|Sami Hyypia|Andriy Shevchenko|Sergei Rebrov|' +
    'Davor Suker|Zvonimir Boban|Robert Prosinecki|Sinisa Mihajlovic|Hristo Stoichkov|Krassimir Balakov|Gheorghe Hagi|' +
    'Gheorghe Popescu|Dan Petrescu|Predrag Mijatovic|Dejan Savicevic|Dragan Stojkovic|Vladimir Jugovic|Pavel Nedved|Karel Poborsky|' +
    'Patrik Berger|Vladimir Smicer|Pavel Kuka|Valeri Karpin|Alexander Mostovoi|Igor Kolyvanov|Slaven Bilic|Igor Stimac|' +
    'Robert Jarni|Aljosa Asanovic|Hakan Sukur|Tugay Kerimoglu|Rustu Recber|Okan Buruk|Sergen Yalcin|Ogun Temizkan|' +
    'Nikos Machlas|Vasilis Tsiartas|Theodoros Zagorakis|Eyal Berkovic|Haim Revivo|Nwankwo Kanu|Jay-Jay Okocha|Abedi Pele|' +
    'George Weah|Daniel Amokachi|Celestine Babayaro|Taribo West|Sunday Oliseh|Victor Ikpeba|Emmanuel Amunike|Tijani Babangida|' +
    'Rigobert Song|Marc-Vivien Foe|Patrick Mboma|Kalusha Bwalya|Lucas Radebe|Samuel Kuffour|Gabriel Batistuta|Diego Simeone|' +
    'Hernan Crespo|Ariel Ortega|Javier Zanetti|Matias Almeyda|Roberto Sensini|Roberto Ayala|Claudio Caniggia|Fernando Redondo|' +
    'Marcelo Gallardo|Claudio Lopez|Enzo Francescoli|Alvaro Recoba|Gustavo Poyet|Carlos Valderrama|Faustino Asprilla|' +
    'Freddy Rincon|Rene Higuita|Fernando Hierro|Fernando Morientes|Miguel Nadal|Julen Guerrero|Kiko Narvaez|Alfonso Perez|' +
    'Ivan de la Pena|Luis Figo|Fernando Couto|Paulo Sousa|Vitor Baia|Jorge Costa|Nuno Gomes|Sergio Conceicao|Abel Xavier|' +
    'Mario Jardel|Marcio Santos|Leonardo Araujo|Flavio Conceicao|Andre Cruz|Mauro Silva|Marcio Amoroso|Paulo Futre|' +
    'Tony Adams|Paul Ince|David Platt|Stuart Pearce|Gareth Southgate|Jamie Redknapp|Paul Merson|Ian Wright|Robbie Fowler|' +
    'Les Ferdinand|Chris Sutton|Dion Dublin|Dennis Wise|Andy Townsend|Steve Stone|Gary Speed|Mark Hughes|Ian Rush|David Batty|' +
    'Martin Keown|Lee Dixon|Gary McAllister|Colin Hendry|Ally McCoist|Paul McStay|Gordon Durie|John Collins|Paul Lambert|' +
    'Craig Burley|Tom Boyd|Kevin Gallacher|Darren Jackson|Gary Palmer').split('|'));

  /* ---- clubs: kit colours ---------------------------------------------- */
  const KITS = {
    'Manchester United': ['#da291c', '#ffffff'], 'Arsenal': ['#db0007', '#ffffff'], 'Liverpool': ['#c8102e', '#f5e663'],
    'Newcastle United': ['#111111', '#ffffff'], 'Chelsea': ['#034694', '#ffffff'], 'Aston Villa': ['#7a003c', '#94bee5'],
    'Leeds United': ['#ffffff', '#1d428a'], 'Blackburn Rovers': ['#009ee0', '#ffffff'], 'Tottenham Hotspur': ['#ffffff', '#132257'],
    'Everton': ['#003399', '#ffffff'], 'West Ham United': ['#7a263a', '#1bb1e7'], 'Middlesbrough': ['#e11b22', '#ffffff'],
    'Derby County': ['#ffffff', '#111111'], 'Leicester City': ['#003090', '#fdbe11'], 'Sheffield Wednesday': ['#0055a5', '#ffffff'],
    'Coventry City': ['#5cbfeb', '#ffffff'], 'Southampton': ['#d71920', '#ffffff'], 'Wimbledon': ['#0b1e6b', '#ffd700'],
    'Nottingham Forest': ['#dd0000', '#ffffff'], 'Sunderland': ['#eb172b', '#ffffff'], 'Manchester City': ['#6cabdd', '#ffffff'],
    'Bolton Wanderers': ['#ffffff', '#1c2b4a'], 'Charlton Athletic': ['#d4021d', '#ffffff'], 'Ipswich Town': ['#0033a0', '#ffffff'],
    'Wolverhampton W': ['#fdb913', '#231f20'], 'Norwich City': ['#fff200', '#00a650'], 'Crystal Palace': ['#1b458f', '#c4122e'],
    'Romford': ['#2b2f84', '#f4c430'], 'Juventus': ['#111111', '#ffffff'], 'AC Milan': ['#fb090b', '#111111'],
    'Inter Milan': ['#0a2fa0', '#111111'], 'Lazio': ['#87d8f7', '#ffffff'], 'Parma': ['#ffd700', '#0047ab'], 'AS Roma': ['#8e1f2f', '#f0bc42'],
    'Fiorentina': ['#592c82', '#ffffff'], 'Sampdoria': ['#1b5497', '#ffffff'], 'Napoli': ['#12a0d7', '#ffffff'], 'Torino': ['#8a1e03', '#ffffff'],
    'Udinese': ['#111111', '#ffffff'], 'Bologna': ['#a2242f', '#1a2f48'], 'Atalanta': ['#1e71b8', '#111111'],
    'Real Madrid': ['#ffffff', '#febe10'], 'Barcelona': ['#a50044', '#004d98'], 'Atletico Madrid': ['#cb3524', '#ffffff'],
    'Valencia': ['#ffffff', '#111111'], 'Deportivo': ['#0047ab', '#ffffff'], 'Athletic Bilbao': ['#ee2523', '#ffffff'],
    'Sevilla': ['#ffffff', '#d4021d'], 'Real Betis': ['#00954c', '#ffffff'], 'Real Sociedad': ['#0067b1', '#ffffff'],
    'Celta Vigo': ['#8ac3ee', '#ffffff'], 'Bayern Munich': ['#dc052d', '#ffffff'], 'Borussia Dortmund': ['#fde100', '#111111'],
    'Bayer Leverkusen': ['#e32221', '#111111'], 'Schalke 04': ['#004d9d', '#ffffff'], 'Werder Bremen': ['#1d9053', '#ffffff'],
    'Stuttgart': ['#ffffff', '#e32219'], 'Hamburg': ['#ffffff', '#0a3f86'], 'Kaiserslautern': ['#d10a11', '#ffffff'],
    'Marseille': ['#ffffff', '#2faee0'], 'AS Monaco': ['#e7221b', '#ffffff'], 'Lyon': ['#ffffff', '#da0812'],
    'Paris St Germain': ['#004170', '#da291c'], 'Bordeaux': ['#14214b', '#ffffff'], 'Nantes': ['#fcd405', '#00843d'],
    'RC Lens': ['#ffe000', '#d00000'], 'Auxerre': ['#ffffff', '#0047ab'], 'Ajax': ['#ffffff', '#d2122e'], 'PSV Eindhoven': ['#ed1c24', '#ffffff'],
    'Feyenoord': ['#e30613', '#ffffff'], 'Vitesse': ['#fdd700', '#111111'], 'FC Porto': ['#00428c', '#ffffff'], 'Benfica': ['#e20612', '#ffffff'],
    'Sporting Lisbon': ['#008057', '#ffffff'], 'Boavista': ['#111111', '#ffffff'], 'Celtic': ['#018749', '#ffffff'], 'Rangers': ['#1b458f', '#ffffff'],
    'Hearts': ['#8e1c2f', '#ffffff'], 'Aberdeen': ['#e30613', '#ffffff'], 'Hibernian': ['#00704a', '#ffffff'],
    'Galatasaray': ['#a90432', '#fdb912'], 'Fenerbahce': ['#004a9f', '#fff200'], 'Besiktas': ['#111111', '#ffffff'],
    'Olympiacos': ['#e2001a', '#ffffff'], 'Panathinaikos': ['#007a33', '#ffffff'], 'Dynamo Kyiv': ['#ffffff', '#0a5eb0'],
    'Spartak Moscow': ['#d8001b', '#ffffff'], 'Red Star Belgrade': ['#dd0000', '#ffffff'], 'Steaua Bucharest': ['#e30613', '#0e47a1'],
    'Anderlecht': ['#4c2a85', '#ffffff'], 'Club Brugge': ['#0067ce', '#111111'], 'Rosenborg': ['#ffffff', '#111111'],
    'Sparta Prague': ['#a50021', '#ffffff'], 'Brondby': ['#fde100', '#00539b'], 'IFK Gothenburg': ['#0a3f86', '#ffffff']
  };
  const KIT_PALETTE = [['#c8102e', '#ffffff'], ['#0b3d91', '#ffffff'], ['#111111', '#ffffff'], ['#ffffff', '#c8102e'], ['#006a4e', '#ffffff'],
    ['#ffd100', '#111111'], ['#6a1b9a', '#ffffff'], ['#f37021', '#111111'], ['#5cbfeb', '#0b3d91'], ['#8b1a1a', '#5cbfeb'],
    ['#ffffff', '#0b3d91'], ['#1d9053', '#ffd100'], ['#e30613', '#111111'], ['#003399', '#ffd100']];
  function kitFor(name) { return KITS[name] || KIT_PALETTE[hashStr(name) % KIT_PALETTE.length]; }

  /* ---- the world: leagues by nation ------------------------------------
   * `level` (1 elite .. 4 non-league) drives the economy and job prestige;
   * `base` is the typical skill of a mid-table player; club `t` (1 title
   * favourite .. 5 relegation fodder) shifts each squad around that base.
   * England comes first so its four tiers are divisions 0..3.
   */
  const C = (name, t) => ({ name: name, t: t });
  const CONFERENCE = [
    C('Romford', 3), C('Slough Town', 3), C('Dagenham', 3), C('Hereford United', 1), C('Yeovil Town', 1), C('Woking', 2),
    C('Stevenage Borough', 1), C('Kidderminster Harr', 2), C('Macclesfield Town', 2), C('Cheltenham Town', 2),
    C('Rushden & Diamonds', 1), C('Telford United', 3), C('Welling United', 3), C('Kettering Town', 3), C('Morecambe', 3),
    C('Northwich Victoria', 4), C('Dover Athletic', 4), C('Farnborough Town', 4), C('Hayes', 4), C('Leek Town', 5),
    C('Southport', 5), C('Gateshead', 5)
  ].map(c => ({ name: c.name, tier: c.t, t: c.t }));

  const LEAGUES = [
    { id: 'eng1', nation: 'ENG', name: 'Premier Division', tier: 1, level: 1, base: 68, clubs: [
      C('Manchester United', 1), C('Arsenal', 1), C('Liverpool', 1), C('Newcastle United', 1), C('Chelsea', 2), C('Aston Villa', 2),
      C('Leeds United', 2), C('Blackburn Rovers', 2), C('Tottenham Hotspur', 2), C('Everton', 3), C('West Ham United', 3),
      C('Middlesbrough', 3), C('Derby County', 3), C('Leicester City', 3), C('Sheffield Wednesday', 3), C('Coventry City', 4),
      C('Southampton', 4), C('Wimbledon', 4), C('Nottingham Forest', 4), C('Sunderland', 5)] },
    { id: 'eng2', nation: 'ENG', name: 'Division One', tier: 2, level: 2, base: 58, clubs: [
      C('Manchester City', 1), C('Bolton Wanderers', 1), C('Charlton Athletic', 2), C('Barnsley', 2), C('Bradford City', 3),
      C('Ipswich Town', 2), C('Wolverhampton W', 2), C('Birmingham City', 2), C('Norwich City', 3), C('Sheffield United', 2),
      C('Huddersfield Town', 4), C('Stockport County', 4), C('Crystal Palace', 3), C('Queens Park Rangers', 3), C('Portsmouth', 4),
      C('Tranmere Rovers', 4), C('Bristol City', 3), C('Oxford United', 4), C('Grimsby Town', 4), C('Port Vale', 5),
      C('Swindon Town', 5), C('West Bromwich Albion', 3)] },
    { id: 'eng3', nation: 'ENG', name: 'Division Two', tier: 3, level: 3, base: 50, clubs: [
      C('Fulham', 1), C('Burnley', 3), C('Gillingham', 2), C('Wrexham', 3), C('Preston North End', 2), C('Bournemouth', 3),
      C('Luton Town', 3), C('Millwall', 2), C('Blackpool', 4), C('Bristol Rovers', 4), C('Wycombe Wanderers', 4),
      C('Chesterfield', 4), C('Plymouth Argyle', 4), C('Reading', 2), C('Stoke City', 1), C('Wigan Athletic', 3),
      C('Notts County', 5), C('Watford', 1), C('Brentford', 3), C('Cardiff City', 4), C('Walsall', 4), C('Colchester United', 5)] },
    { id: 'eng4', nation: 'ENG', name: 'Conference', tier: 4, level: 4, base: 42, clubs: CONFERENCE.map(c => C(c.name, c.t)) },
    { id: 'ita1', nation: 'ITA', name: 'Serie A', tier: 1, level: 1, base: 70, clubs: [
      C('Juventus', 1), C('AC Milan', 1), C('Inter Milan', 1), C('Lazio', 1), C('Parma', 1), C('AS Roma', 2), C('Fiorentina', 2),
      C('Sampdoria', 2), C('Udinese', 2), C('Bologna', 3), C('Vicenza', 3), C('Napoli', 3), C('Atalanta', 3), C('Piacenza', 4),
      C('Bari', 4), C('Empoli', 4), C('Brescia', 5), C('Lecce', 5)] },
    { id: 'ita2', nation: 'ITA', name: 'Serie B', tier: 2, level: 2, base: 57, clubs: [
      C('Torino', 1), C('Cagliari', 1), C('Perugia', 2), C('Genoa', 2), C('Verona', 2), C('Salernitana', 2), C('Venezia', 3),
      C('Reggina', 3), C('Cremonese', 3), C('Cosenza', 4), C('Padova', 3), C('Pescara', 3), C('Ravenna', 4), C('Chievo', 4),
      C('Monza', 4), C('Treviso', 5), C('Foggia', 4), C('Lucchese', 5), C('Ternana', 4), C('Reggiana', 5)] },
    { id: 'esp1', nation: 'ESP', name: 'La Liga', tier: 1, level: 1, base: 69, clubs: [
      C('Real Madrid', 1), C('Barcelona', 1), C('Atletico Madrid', 1), C('Valencia', 2), C('Deportivo', 2), C('Real Betis', 2),
      C('Athletic Bilbao', 2), C('Real Sociedad', 2), C('Celta Vigo', 3), C('Real Zaragoza', 3), C('Espanyol', 3), C('Mallorca', 3),
      C('Tenerife', 3), C('Sevilla', 3), C('Valladolid', 4), C('Oviedo', 4), C('Racing Santander', 4), C('Rayo Vallecano', 5),
      C('Compostela', 5), C('Salamanca', 5)] },
    { id: 'ger1', nation: 'GER', name: 'Bundesliga', tier: 1, level: 1, base: 67, clubs: [
      C('Bayern Munich', 1), C('Borussia Dortmund', 1), C('Bayer Leverkusen', 1), C('Schalke 04', 2), C('Kaiserslautern', 2),
      C('Stuttgart', 2), C('Werder Bremen', 3), C('Hamburg', 3), C('Hertha Berlin', 3), C('1860 Munich', 3), C('Wolfsburg', 4),
      C('Moenchengladbach', 4), C('FC Cologne', 4), C('Hansa Rostock', 4), C('VfL Bochum', 4), C('Freiburg', 5),
      C('Arminia Bielefeld', 5), C('Karlsruher SC', 5)] },
    { id: 'fra1', nation: 'FRA', name: 'Division 1', tier: 1, level: 2, base: 63, clubs: [
      C('Marseille', 1), C('Paris St Germain', 1), C('AS Monaco', 1), C('Bordeaux', 2), C('Lyon', 2), C('Auxerre', 2), C('Nantes', 2),
      C('RC Lens', 2), C('Montpellier', 3), C('Strasbourg', 3), C('Rennes', 3), C('FC Metz', 3), C('Bastia', 4), C('Guingamp', 4),
      C('Toulouse', 4), C('Le Havre', 4), C('Lille', 5), C('Cannes', 5)] },
    { id: 'ned1', nation: 'NED', name: 'Eredivisie', tier: 1, level: 2, base: 61, clubs: [
      C('Ajax', 1), C('PSV Eindhoven', 1), C('Feyenoord', 1), C('Vitesse', 2), C('Heerenveen', 2), C('Willem II', 2), C('Roda JC', 3),
      C('FC Twente', 3), C('NAC Breda', 3), C('Sparta Rotterdam', 3), C('FC Utrecht', 3), C('AZ Alkmaar', 4), C('NEC', 4),
      C('Fortuna Sittard', 4), C('Groningen', 4), C('De Graafschap', 5), C('RKC Waalwijk', 5), C('Volendam', 5)] },
    { id: 'por1', nation: 'POR', name: 'Primeira Liga', tier: 1, level: 2, base: 59, clubs: [
      C('FC Porto', 1), C('Benfica', 1), C('Sporting Lisbon', 1), C('Boavista', 2), C('Vitoria Guimaraes', 2), C('SC Braga', 2),
      C('Maritimo', 3), C('Salgueiros', 3), C('Uniao Leiria', 3), C('Belenenses', 3), C('Vitoria Setubal', 3), C('Estrela Amadora', 4),
      C('Farense', 4), C('Rio Ave', 4), C('Academica', 4), C('Campomaiorense', 5), C('Chaves', 5), C('Alverca', 5)] },
    { id: 'sco1', nation: 'SCO', name: 'Scottish Premier', tier: 1, level: 2, base: 56, legs: 4, clubs: [
      C('Celtic', 1), C('Rangers', 1), C('Hearts', 2), C('Aberdeen', 3), C('Kilmarnock', 3), C('Hibernian', 3), C('Dundee United', 3),
      C('Motherwell', 4), C('Dunfermline', 4), C('St Johnstone', 5)] }
  ];
  // per-nation rules: clubs swapped between consecutive tiers, domestic cups, European places
  const NATION_RULES = {
    ENG: { name: 'England', swap: 3, cups: [{ id: 'fa', name: 'FA Cup', size: 64 }, { id: 'leaguecup', name: 'League Cup', size: 64 }], cl: 4, uefa: 5 },
    ITA: { name: 'Italy', swap: 4, cups: [{ id: 'coppaitalia', name: 'Coppa Italia', size: 32 }], cl: 4, uefa: 5 },
    ESP: { name: 'Spain', swap: 0, cups: [{ id: 'copadelrey', name: 'Copa del Rey', size: 16 }], cl: 4, uefa: 5 },
    GER: { name: 'Germany', swap: 0, cups: [{ id: 'dfbpokal', name: 'DFB-Pokal', size: 16 }], cl: 4, uefa: 4 },
    FRA: { name: 'France', swap: 0, cups: [{ id: 'coupedefrance', name: 'Coupe de France', size: 16 }], cl: 4, uefa: 4 },
    NED: { name: 'Netherlands', swap: 0, cups: [{ id: 'knvbcup', name: 'KNVB Cup', size: 16 }], cl: 3, uefa: 3 },
    POR: { name: 'Portugal', swap: 0, cups: [{ id: 'tacaportugal', name: 'Taca de Portugal', size: 16 }], cl: 3, uefa: 3 },
    SCO: { name: 'Scotland', swap: 0, cups: [{ id: 'scottishcup', name: 'Scottish Cup', size: 8 }], cl: 2, uefa: 2 }
  };
  const NATION_ORDER = ['ENG', 'ITA', 'ESP', 'GER', 'FRA', 'NED', 'POR', 'SCO'];

  // continental clubs with no simulated league: they fill out the European cups
  const REST_OF_EUROPE = [
    ['Anderlecht', 'BEL', 2], ['Club Brugge', 'BEL', 2], ['Standard Liege', 'BEL', 3], ['Genk', 'BEL', 3], ['Lierse', 'BEL', 4],
    ['AA Gent', 'BEL', 4], ['Lokeren', 'BEL', 4], ['Mouscron', 'BEL', 4], ['Germinal Ekeren', 'BEL', 4],
    ['Galatasaray', 'TUR', 2], ['Fenerbahce', 'TUR', 2], ['Besiktas', 'TUR', 2], ['Trabzonspor', 'TUR', 3],
    ['Panathinaikos', 'GRE', 2], ['Olympiacos', 'GRE', 2], ['AEK Athens', 'GRE', 3], ['PAOK', 'GRE', 3],
    ['Spartak Moscow', 'RUS', 2], ['CSKA Moscow', 'RUS', 3], ['Lokomotiv Moscow', 'RUS', 3], ['Dynamo Moscow', 'RUS', 3],
    ['Zenit', 'RUS', 3], ['Alania Vladikavkaz', 'RUS', 4], ['Rotor Volgograd', 'RUS', 4],
    ['Dynamo Kyiv', 'UKR', 1], ['Shakhtar Donetsk', 'UKR', 3], ['Dnipro', 'UKR', 4],
    ['Steaua Bucharest', 'ROU', 3], ['Rapid Bucharest', 'ROU', 3], ['Dinamo Bucharest', 'ROU', 4],
    ['Red Star Belgrade', 'YUG', 3], ['Partizan Belgrade', 'YUG', 3], ['Dinamo Zagreb', 'CRO', 3], ['Hajduk Split', 'CRO', 3],
    ['Sparta Prague', 'CZE', 2], ['Slavia Prague', 'CZE', 3], ['Sigma Olomouc', 'CZE', 4],
    ['Legia Warsaw', 'POL', 3], ['Widzew Lodz', 'POL', 4], ['Wisla Krakow', 'POL', 4], ['Ferencvaros', 'HUN', 4], ['MTK', 'HUN', 4],
    ['Slovan Bratislava', 'SVK', 4], ['Rosenborg', 'NOR', 2], ['Molde', 'NOR', 3], ['Viking', 'NOR', 4],
    ['Brondby', 'DEN', 3], ['FC Copenhagen', 'DEN', 3], ['AaB Aalborg', 'DEN', 4], ['AGF', 'DEN', 4],
    ['IFK Gothenburg', 'SWE', 3], ['Helsingborg', 'SWE', 4], ['AIK', 'SWE', 4], ['Malmo FF', 'SWE', 4],
    ['Grasshoppers', 'SUI', 3], ['FC Basel', 'SUI', 4], ['Servette', 'SUI', 4], ['Lausanne', 'SUI', 4], ['FC Zurich', 'SUI', 4],
    ['Sturm Graz', 'AUT', 3], ['Rapid Vienna', 'AUT', 4], ['Austria Vienna', 'AUT', 4], ['Austria Salzburg', 'AUT', 4],
    ['Maccabi Haifa', 'ISR', 4], ['Maccabi Tel Aviv', 'ISR', 4], ['Hapoel Tel Aviv', 'ISR', 4], ['Beitar Jerusalem', 'ISR', 4],
    ['APOEL', 'CYP', 5], ['Anorthosis', 'CYP', 5], ['Dinamo Tbilisi', 'GEO', 5], ['Levski Sofia', 'BUL', 4], ['CSKA Sofia', 'BUL', 4],
    ['Litex Lovech', 'BUL', 5], ['Maribor', 'SLO', 5], ['HJK Helsinki', 'FIN', 5]
  ].map(r => ({ name: r[0], nation: r[1], t: r[2] }));
  const REST_BASE = 56;

  // ---- legacy exports (kept for compatibility) ----
  const CLUBS_PER_DIVISION = 22;
  const DIVISION_DEFS = LEAGUES.filter(l => l.nation === 'ENG').map(l => ({ name: l.name, size: l.clubs.length }));
  const FOREIGN_CLUBS = REST_OF_EUROPE.map(r => r.name);

  /* ---- economy, by league level --------------------------------------- */
  const ECON = {
    1: { cap: [24000, 55000], ticket: 12, tv: 60000, funds: [3500000, 14000000], loan: 8000000, prize: 160000, wageMul: 1.0 },
    2: { cap: [9000, 30000], ticket: 9, tv: 16000, funds: [700000, 3200000], loan: 3000000, prize: 45000, wageMul: 0.82 },
    3: { cap: [5000, 15000], ticket: 7, tv: 4500, funds: [220000, 850000], loan: 1200000, prize: 15000, wageMul: 0.66 },
    4: { cap: [1800, 5500], ticket: 6, tv: 1300, funds: [90000, 320000], loan: 500000, prize: 5000, wageMul: 0.55 }
  };

  const POSITIONS = ['G', 'D', 'M', 'A'];
  const POS_NAME = { G: 'Goalkeeper', D: 'Defender', M: 'Midfielder', A: 'Attacker' };

  /* ---- value / wage of a player --------------------------------------- */
  // convex: a skill-40 journeyman ~£45k, skill-70 ~£600k, skill-90 ~£3.3m, skill-99 ~£7m
  function valueOf(skill, rng, age, pot) {
    let base = 8000 * Math.pow(1.09, skill - 20);
    if (age != null && age <= 23 && pot != null && pot > skill) base *= 1 + (pot - skill) / 60;   // young talent premium
    const ageF = age == null ? 1 : age <= 29 ? 1 : age <= 31 ? 0.8 : age <= 33 ? 0.55 : 0.35;
    const noise = rng ? (0.92 + rng() * 0.16) : 1;
    const v = base * ageF * noise;
    return v < 100000 ? Math.round(v / 500) * 500 : Math.round(v / 5000) * 5000;
  }
  function recomputeValue(p, rng) { p.value = valueOf(p.skill, rng, p.age, p.pot); return p.value; }
  // weekly wage for a player signing at a club of the given league level
  function wageFor(p, level) {
    const w = (70 + (p.value || valueOf(p.skill, null, p.age, p.pot)) * 0.0042) * (ECON[level] || ECON[2]).wageMul;
    return w < 1000 ? Math.round(w / 10) * 10 : Math.round(w / 50) * 50;
  }

  let _id = 1;
  function nextId() { return _id++; }
  function setNextId(n) { if (n > _id) _id = n; }

  /* ---- names ---------------------------------------------------------- */
  function nameFor(rng, nat) {
    const pool = POOLS[NAT_POOL[nat] || 'british'];
    let f = pick(rng, pool.f), s = pick(rng, pool.s), guard = 0;
    while (FAMOUS.has(f + ' ' + s) && guard++ < 8) f = pick(rng, pool.f);
    return { forename: f, surname: s };
  }
  function nationalityFor(rng, clubNation) {
    if (!clubNation || rng() < 0.16) return weighted(rng, IMPORT_WEIGHTS);
    if (clubNation === 'ENG') return weighted(rng, { ENG: 78, SCO: 8, WAL: 5, IRL: 6, NIR: 3 });
    return clubNation;
  }

  /* ---- one player ------------------------------------------------------ */
  function generatePlayer(rng, opts) {
    opts = opts || {};
    const pos = opts.pos || pick(rng, POSITIONS);
    const centre = opts.centre != null ? opts.centre : (opts.tier == null ? 53 : 72 - (opts.tier - 1) * 8);
    let skill = Math.round(centre + (rng() - 0.5) * 28);
    if (rng() < 0.035) skill += ri(rng, 10, 24);            // rare elite talents (reach the 90s)
    if (opts.skill != null) skill = opts.skill;
    skill = Math.max(20, Math.min(99, skill));
    const age = opts.age != null ? opts.age : 17 + Math.floor(((rng() + rng() + rng()) / 3) * 17);
    const growth = age <= 19 ? ri(rng, 4, 26) : age <= 21 ? ri(rng, 2, 18) : age <= 24 ? ri(rng, 0, 10) : age <= 27 ? ri(rng, 0, 4) : 0;
    const pot = Math.max(skill, Math.min(99, skill + growth));
    const fit = opts.fit != null ? opts.fit : ri(rng, 72, 100);
    const injuredFor = opts.injuredFor != null ? opts.injuredFor : (rng() < 0.04 ? ri(rng, 1, 5) : 0);
    const nat = opts.nat || nationalityFor(rng, opts.nation);
    const nm = nameFor(rng, nat);
    const p = {
      id: nextId(),
      forename: nm.forename, surname: nm.surname, nat: nat,
      pos, skill, pot, age, fit,
      retireAge: opts.retireAge != null ? opts.retireAge : ri(rng, 35, 40),
      injuredFor, injured: injuredFor > 0,
      yellows: 0, suspendedFor: 0,
      appsSeason: 0, goalsSeason: 0, lgGoals: 0, assistsSeason: 0, rSum: 0, rN: 0, form: [], potm: 0,
      appsTotal: opts.appsTotal || 0, goalsTotal: opts.goalsTotal || 0, assistsTotal: 0,
      transferListed: false,
      contract: ri(rng, 1, 4),
      value: 0, wage: 0
    };
    p.value = valueOf(skill, rng, age, pot);
    p.wage = wageFor(p, opts.level || 2);
    return p;
  }

  /* ---- a full squad (realistic position spread) ------------------------ */
  function generateSquad(rng, centre, nation, level) {
    const plan = ['G', 'G', 'G', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'A', 'A', 'A', 'A'];
    return plan.map((pos, i) => generatePlayer(rng, { pos, centre: centre - (i === 2 ? 8 : 0), nation, level }));
  }

  /* ---- a club --------------------------------------------------------- */
  function clubCentre(base, t) { return base + (3 - t) * 5.5; }
  function generateClub(rng, def) {
    const level = def.level || 2;
    const centre = def.centre != null ? def.centre : clubCentre(def.base || 55, def.tier || 3);
    const e = ECON[level] || ECON[2];
    const strength = (5 - (def.tier || 3)) / 4;                     // 0 weakest .. 1 strongest
    const kit = kitFor(def.name);
    const club = {
      name: def.name,
      tier: def.tier || 3,
      nation: def.nation || 'ENG',
      isUser: false,
      kit: kit,
      players: generateSquad(rng, centre, def.nation, level),
      balance: Math.round((e.funds[0] + (e.funds[1] - e.funds[0]) * strength) * (0.85 + rng() * 0.3) / 1000) * 1000,
      capacity: Math.round((e.cap[0] + (e.cap[1] - e.cap[0]) * (strength * 0.75 + rng() * 0.25)) / 100) * 100,
      manager: (() => { const n = nameFor(rng, def.nation === 'ENG' ? pick(rng, ['ENG', 'ENG', 'SCO', 'IRL']) : def.nation); return n.forename + ' ' + n.surname; })()
    };
    club.players.forEach(p => { p.club = club.name; });
    return club;
  }

  return {
    makeRng, ri, pick, hashStr, weighted,
    NATIONS, POOLS, NAT_POOL, IMPORT_WEIGHTS, FAMOUS,
    KITS, kitFor, LEAGUES, NATION_RULES, NATION_ORDER, REST_OF_EUROPE, REST_BASE, CONFERENCE,
    CLUBS_PER_DIVISION, DIVISION_DEFS, FOREIGN_CLUBS, ECON,
    POSITIONS, POS_NAME,
    valueOf, recomputeValue, wageFor, nameFor, nationalityFor,
    generatePlayer, generateSquad, generateClub, clubCentre, nextId, setNextId
  };
});
