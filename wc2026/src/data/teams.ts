import type { Player, Team, Position, Personality, TacticalStyle, Mentality } from '../types';

let playerIdCounter = 0;
function nextId() { return `p${++playerIdCounter}`; }

function rnd(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

const personalities: Personality[] = ['Leader', 'Professional', 'Temperamental', 'Reserved', 'Ambitious', 'Maverick'];

function makePlayer(
  name: string, position: Position, role: string, rating: number,
  age: number, opts?: Partial<Player>
): Player {
  return {
    id: nextId(),
    name,
    age,
    position,
    role,
    rating: Math.max(55, Math.min(99, rating)),
    form: rnd(5, 9),
    fitness: rnd(82, 100),
    morale: rnd(72, 92),
    experience: Math.min(99, Math.max(10, age - 16 + rnd(5, 20))),
    personality: pick(personalities),
    injuryRisk: rnd(1, 8),
    bigMatchMentality: rnd(4, 10),
    penaltyAbility: rnd(4, 10),
    isInjured: false,
    injuredUntilRound: null,
    isSuspended: false,
    yellowCards: 0,
    goals: 0,
    assists: 0,
    matchRatings: [],
    isInStartingXI: false,
    ...opts,
  };
}

function generatePlayers(
  _teamName: string,
  baseRating: number,
  starPlayers: Array<{ name: string; position: Position; role: string; rating: number; age: number }>,
  nationality: string
): Player[] {
  const players: Player[] = [];

  // Add star players
  for (const sp of starPlayers) {
    players.push(makePlayer(sp.name, sp.position, sp.role, sp.rating, sp.age, {
      personality: sp.rating >= baseRating + 5 ? pick(['Leader', 'Maverick', 'Ambitious']) as Personality : pick(personalities),
      bigMatchMentality: sp.rating >= baseRating + 3 ? rnd(7, 10) : rnd(5, 9),
    }));
  }

  // Fill remaining spots
  const positions: Array<{ pos: Position; role: string }> = [
    { pos: 'GK', role: 'Goalkeeper' }, { pos: 'GK', role: 'Backup Keeper' },
    { pos: 'CB', role: 'Centre Back' }, { pos: 'CB', role: 'Centre Back' }, { pos: 'CB', role: 'Ball-Playing CB' },
    { pos: 'RB', role: 'Right Back' }, { pos: 'LB', role: 'Left Back' },
    { pos: 'CDM', role: 'Defensive Midfielder' }, { pos: 'CDM', role: 'Ball Winner' },
    { pos: 'CM', role: 'Box-to-Box' }, { pos: 'CM', role: 'Central Midfielder' },
    { pos: 'CAM', role: 'Attacking Midfielder' },
    { pos: 'RW', role: 'Right Winger' }, { pos: 'LW', role: 'Left Winger' },
    { pos: 'ST', role: 'Striker' }, { pos: 'ST', role: 'Second Striker' }, { pos: 'CF', role: 'Centre Forward' },
  ];

  const usedPositions = starPlayers.map(s => s.position);
  const fillerPositions = positions.filter(p => {
    const count = usedPositions.filter(u => u === p.pos).length;
    const total = positions.filter(pp => pp.pos === p.pos).length;
    return count < total;
  });

  let i = 0;
  while (players.length < 23 && i < fillerPositions.length) {
    const fp = fillerPositions[i++];
    const rating = baseRating + rnd(-12, -3);
    const age = fp.pos === 'GK' ? rnd(24, 35) : rnd(20, 32);
    const lastName = pick(getLastNames(nationality));
    players.push(makePlayer(lastName, fp.pos, fp.role, rating, age));
  }

  // Ensure exactly 23 players
  while (players.length < 23) {
    const pos = pick(['CM', 'CB', 'ST', 'RB'] as Position[]);
    const rating = baseRating + rnd(-13, -5);
    const lastName = pick(getLastNames(nationality));
    players.push(makePlayer(lastName, pos, 'Squad Player', rating, rnd(20, 30)));
  }

  // Set starting XI (first 11 non-GK + 1 GK)
  let xiCount = 0;
  let gkSet = false;
  for (const p of players) {
    if (xiCount >= 11) break;
    if (p.position === 'GK' && !gkSet) { p.isInStartingXI = true; gkSet = true; xiCount++; }
    else if (p.position !== 'GK') { p.isInStartingXI = true; xiCount++; }
  }

  return players;
}

function getLastNames(nationality: string): string[] {
  const names: Record<string, string[]> = {
    'american': ['Johnson', 'Williams', 'Smith', 'Weah', 'Adams', 'Turner', 'McKennie', 'Musah', 'Reyna', 'Pulisic', 'Sargent', 'Ferreira', 'Balogun', 'Pepi', 'Carter'],
    'panamanian': ['Rodríguez', 'Murillo', 'Davis', 'Córdoba', 'Godoy', 'Fajardo', 'Carrasquilla', 'Blackburn', 'Taylor', 'Arosemena'],
    'albanian': ['Broja', 'Bajrami', 'Asllani', 'Daku', 'Mitaj', 'Gjasula', 'Hysaj', 'Ismajli', 'Ramadani', 'Berisha'],
    'ukrainian': ['Mudryk', 'Zinchenko', 'Yaremchuk', 'Malinovskyi', 'Dovbyk', 'Tsygankov', 'Sudakov', 'Mykolenko', 'Zabarnyi', 'Lunin'],
    'argentinian': ['García', 'López', 'Martínez', 'González', 'Fernández', 'Rodríguez', 'Pereyra', 'Simeone', 'Paredes', 'Dybala'],
    'chilean': ['Alexis', 'Vidal', 'Aránguiz', 'Bravo', 'Medel', 'Vargas', 'Pulgar', 'Isla', 'Maripán', 'Dávila'],
    'peruvian': ['Guerrero', 'Cueva', 'Flores', 'Carrillo', 'Trauco', 'Tapia', 'Peña', 'Reyna', 'Abram', 'Callens'],
    'austrian': ['Alaba', 'Sabitzer', 'Laimer', 'Arnautovic', 'Gregoritsch', 'Wöber', 'Grillitsch', 'Baumgartner', 'Ranftl', 'Posch'],
    'mexican': ['Jiménez', 'Guardado', 'Herrera', 'Lozano', 'Antuna', 'Sánchez', 'Martín', 'Álvarez', 'Arteaga', 'Moreno'],
    'jamaican': ['Bailey', 'Antonio', 'Nicholson', 'Reid', 'Brown', 'Morrison', 'Campbell', 'Thomas', 'Latibeaudiere', 'Shaffelburg'],
    'venezuelan': ['Soteldo', 'Rondón', 'Herrera', 'Martínez', 'Mago', 'Casseres', 'Otero', 'Flores', 'Peñaranda', 'Rivas'],
    'iranian': ['Taremi', 'Jahanbakhsh', 'Gholizadeh', 'Beiranvand', 'Azmoun', 'Mohammadi', 'Pouraliganji', 'Ezatolahi', 'Hosseini', 'Hajisafi'],
    'french': ['Dupont', 'Laurent', 'Bernard', 'Petit', 'Lefebvre', 'Fontaine', 'Renard', 'Mercier', 'Guerin', 'Leclerc'],
    'belgian': ['Hazard', 'De Bruyne', 'Lukaku', 'Courtois', 'Alderweireld', 'Vertonghen', 'Mertens', 'Carrasco', 'Trossard', 'Castagne'],
    'israeli': ['Dabbur', 'Solomon', 'Haziza', 'Peretz', 'Nachmias', 'Glazer', 'Bitton', 'Einbinder', 'Saba', 'Cohen'],
    'paraguayan': ['Almiron', 'Sanabria', 'Enciso', 'Gamarra', 'Cubas', 'Alderete', 'Villasanti', 'Sosa', 'Rojas', 'Espinoza'],
    'spanish': ['García', 'López', 'Martínez', 'Sánchez', 'Pérez', 'González', 'Rodríguez', 'Fernández', 'Torres', 'Moreno'],
    'dutch': ['Van Dijk', 'De Jong', 'Depay', 'Dumfries', 'Blind', 'Bergwijn', 'Simons', 'Weghorst', 'Timber', 'Gakpo'],
    'croatian': ['Perić', 'Kovačić', 'Vlašić', 'Sosa', 'Gvardiol', 'Budimir', 'Kramarić', 'Brozović', 'Pasalić', 'Sutalo'],
    'egyptian': ['Salah', 'Trezeguet', 'Elmohamady', 'Hegazy', 'Hamdy', 'Nabil', 'Ramadan', 'Ibrahim', 'Oraby', 'Mostafa'],
    'brazilian': ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Rodrigues', 'Ferreira', 'Alves', 'Costa', 'Pereira'],
    'colombian': ['Falcao', 'James', 'Cuadrado', 'Ospina', 'Sánchez', 'Arias', 'Borja', 'Carrascal', 'Moreno', 'Cuesta'],
    'ecuadorian': ['Valencia', 'Estupiñán', 'Caicedo', 'Plata', 'Minda', 'Ibarra', 'Sarmiento', 'Preciado', 'Cifuentes', 'Angulo'],
    'nigerian': ['Osimhen', 'Lookman', 'Iwobi', 'Ndidi', 'Musa', 'Ejuke', 'Chukwueze', 'Simon', 'Bassey', 'Omeruo'],
    'canadian': ['Davies', 'David', 'Larin', 'Hutchinson', 'Johnston', 'Cornelius', 'Eustaquio', 'Buchanan', 'Vitoria', 'Adekugbe'],
    'moroccan': ['Ziyech', 'En-Nesyri', 'Hakimi', 'Amrabat', 'Ounahi', 'Mazraoui', 'Bounou', 'El Yamiq', 'Dari', 'Zaroury'],
    'senegalese': ['Mané', 'Gueye', 'Sarr', 'Diallo', 'Koulibaly', 'Niakhate', 'Sow', 'Ndiaye', 'Mendy', 'Diedhiou'],
    'uzbek': ['Shomurodov', 'Ergashev', 'Jaloliddinov', 'Komilov', 'Tursunov', 'Yusupov', 'Masharipov', 'Suyunov', 'Nishonov', 'Alibaev'],
    'portuguese': ['Sousa', 'Ferreira', 'Costa', 'Carvalho', 'Silva', 'Alves', 'Mendes', 'Tavares', 'Neves', 'Guerreiro'],
    'turkish': ['Calhanoglu', 'Yazici', 'Akman', 'Demiral', 'Soyuncu', 'Yilmaz', 'Guler', 'Kabak', 'Celik', 'Unal'],
    'polish': ['Lewandowski', 'Zielinski', 'Szymanski', 'Bednarek', 'Frankowski', 'Milik', 'Kaminski', 'Bielik', 'Cash', 'Kiwior'],
    'uruguayan': ['Suárez', 'Cavani', 'Valverde', 'Bentancur', 'Araújo', 'De Arrascaeta', 'Giménez', 'Viña', 'Pellistri', 'Gómez'],
    'german': ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann'],
    'scottish': ['McTominay', 'Robertson', 'Tierney', 'Cooper', 'Adams', 'Christie', 'McGinn', 'McLaughlin', 'Porteous', 'Dykes'],
    'hungarian': ['Szoboszlai', 'Sallai', 'Styles', 'Nagy', 'Kleinheisler', 'Fiola', 'Orban', 'Gulácsi', 'Nego', 'Bolla'],
    'japanese': ['Minamino', 'Doan', 'Kubo', 'Ito', 'Kamada', 'Tanaka', 'Maeda', 'Yoshida', 'Tomiyasu', 'Nagatomo'],
    'english': ['Henderson', 'Southgate', 'Trippier', 'Phillips', 'Sterling', 'Grealish', 'Foden', 'Rashford', 'Walker', 'Maguire'],
    'serbian': ['Milinković', 'Tadić', 'Jović', 'Vlahović', 'Lukić', 'Kostić', 'Pavlović', 'Lazović', 'Gudelj', 'Milenkovic'],
    'danish': ['Eriksen', 'Braithwaite', 'Höjbjerg', 'Maehle', 'Christensen', 'Dolberg', 'Skov', 'Andersen', 'Bah', 'Damsgaard'],
    'saudi': ['Al-Dawsari', 'Al-Shahrani', 'Abdullah', 'Al-Buraikan', 'Kanno', 'Al-Abed', 'Tambakti', 'Madkhali', 'Al-Ghannam', 'Sulaiman'],
    'swiss': ['Xhaka', 'Shaqiri', 'Sommer', 'Akanji', 'Embolo', 'Vargas', 'Widmer', 'Freuler', 'Zuber', 'Okafor'],
    'south_korean': ['Son', 'Hwang', 'Kim', 'Lee', 'Park', 'Cho', 'Jung', 'Na', 'Kwon', 'Moon'],
    'cameroonian': ['Aboubakar', 'Choupo-Moting', 'Toko Ekambi', 'Ngamaleu', 'Onana', 'Mbeumo', 'Castelletto', 'Fai', 'Kunde', 'Wooh'],
    'australian': ['Leckie', 'Hrustic', 'Irvine', 'Degenek', 'MacLaren', 'Duke', 'Rowles', 'Atkinson', 'Baccus', 'Grant'],
    'italian': ['Barella', 'Verratti', 'Donnarumma', 'Bonucci', 'Chiellini', 'Immobile', 'Chiesa', 'Insigne', 'Locatelli', 'Bastoni'],
    'czech': ['Schick', 'Soucek', 'Coufal', 'Kral', 'Hlozek', 'Barak', 'Sadilek', 'Lingr', 'Jurasek', 'Provod'],
    'slovak': ['Skriniar', 'Duda', 'Lobotka', 'Haraslin', 'Schranz', 'Weiss', 'Strelec', 'Suslov', 'Vavro', 'Gyomber'],
    'newzealand': ['Wood', 'Payne', 'Waine', 'Old', 'Jones', 'Thomas', 'Cacace', 'Bell', 'Taylor', 'McGarry'],
  };
  return names[nationality] || ['Brown', 'Smith', 'Jones', 'Wilson', 'Taylor', 'Anderson', 'Davis', 'Martinez', 'Garcia', 'Thompson'];
}

function makeTeam(
  id: string, name: string, shortName: string, flag: string, confederation: string, groupId: string,
  overall: number, atk: number, mid: number, def: number, gk: number,
  tacticalIdentity: TacticalStyle, mentality: Mentality, footballCulture: string,
  mediaPressure: number, fanExpectations: number, tournamentExperience: number,
  formation: string, nationality: string,
  starPlayers: Array<{ name: string; position: Position; role: string; rating: number; age: number }>
): Team {
  const form = Array.from({ length: 5 }, () => pick([-1, 0, 0, 1, 1]));
  return {
    id, name, shortName, flag, confederation, groupId,
    overall, attack: atk, midfield: mid, defense: def, goalkeeper: gk,
    depth: overall - rnd(5, 15),
    tacticalIdentity, mentality, footballCulture, mediaPressure, fanExpectations,
    chemistry: rnd(70, 90),
    form, tournamentExperience,
    isPlayerTeam: false,
    players: generatePlayers(name, overall, starPlayers, nationality),
    tactics: {
      formation, style: tacticalIdentity, mentality,
      pressingIntensity: mentality === 'attacking' || mentality === 'ultra-attacking' ? rnd(6, 9) : rnd(3, 7),
      defensiveLine: mentality === 'defensive' ? rnd(3, 5) : rnd(5, 8),
      tempo: rnd(5, 8), buildUpStyle: 'mixed', attackingWidth: rnd(5, 8),
    },
    groupPoints: 0, groupGD: 0, groupGF: 0, groupGA: 0, groupMatchesPlayed: 0,
  };
}

export function generateTournamentTeams(): Record<string, Team> {
  const teams: Team[] = [
    // Group A
    makeTeam('usa', 'United States', 'USA', '🇺🇸', 'CONCACAF', 'A', 79, 78, 80, 78, 77,
      'pressing', 'attacking', 'Athletic, high-energy football with growing club talent', 7, 6, 5, '4-3-3', 'american',
      [{ name: 'Christian Pulisic', position: 'LW', role: 'Winger', rating: 85, age: 26 },
       { name: 'Weston McKennie', position: 'CM', role: 'Box-to-Box', rating: 81, age: 26 },
       { name: 'Yunus Musah', position: 'CM', role: 'Central Midfielder', rating: 80, age: 22 },
       { name: 'Tyler Adams', position: 'CDM', role: 'Defensive Midfielder', rating: 81, age: 26 },
       { name: 'Giovanni Reyna', position: 'CAM', role: 'Attacking Midfielder', rating: 82, age: 23 },
       { name: 'Tim Weah', position: 'RW', role: 'Winger', rating: 79, age: 24 },
       { name: 'Ricardo Pepi', position: 'ST', role: 'Striker', rating: 78, age: 22 },
       { name: 'Sergino Dest', position: 'RB', role: 'Right Back', rating: 78, age: 24 },
       { name: 'Folarin Balogun', position: 'ST', role: 'Forward', rating: 80, age: 23 },
       { name: 'Matt Turner', position: 'GK', role: 'Goalkeeper', rating: 78, age: 30 }]),

    makeTeam('panama', 'Panama', 'PAN', '🇵🇦', 'CONCACAF', 'A', 66, 64, 65, 68, 63,
      'counter', 'defensive', 'Organized and physical with dangerous set pieces', 4, 3, 4, '4-4-2', 'panamanian',
      [{ name: 'Rolando Blackburn', position: 'ST', role: 'Striker', rating: 70, age: 29 },
       { name: 'Cecilio Waterman', position: 'ST', role: 'Forward', rating: 68, age: 27 },
       { name: 'Edgardo Fajardo', position: 'CM', role: 'Midfielder', rating: 67, age: 28 },
       { name: 'Adalberto Carrasquilla', position: 'CDM', role: 'Defensive Mid', rating: 69, age: 25 }]),

    makeTeam('albania', 'Albania', 'ALB', '🇦🇱', 'UEFA', 'A', 69, 68, 69, 70, 65,
      'counter', 'balanced', 'Passionate and physical Balkan football with set-piece threat', 4, 3, 3, '4-2-3-1', 'albanian',
      [{ name: 'Armando Broja', position: 'ST', role: 'Striker', rating: 76, age: 23 },
       { name: 'Nedim Bajrami', position: 'CAM', role: 'Attacking Mid', rating: 73, age: 24 },
       { name: 'Kristjan Asllani', position: 'CDM', role: 'Holding Mid', rating: 74, age: 22 },
       { name: 'Jasir Asani', position: 'LW', role: 'Winger', rating: 70, age: 28 },
       { name: 'Taulant Xhaka', position: 'CM', role: 'Midfielder', rating: 69, age: 33 },
       { name: 'Etrit Berisha', position: 'GK', role: 'Goalkeeper', rating: 70, age: 35 }]),

    makeTeam('ukraine', 'Ukraine', 'UKR', '🇺🇦', 'UEFA', 'A', 74, 73, 74, 75, 72,
      'possession', 'attacking', 'Technical and industrious Eastern European style', 5, 5, 5, '4-3-3', 'ukrainian',
      [{ name: 'Mykhaylo Mudryk', position: 'LW', role: 'Winger', rating: 82, age: 24 },
       { name: 'Oleksandr Zinchenko', position: 'LB', role: 'Left Back', rating: 82, age: 27 },
       { name: 'Artem Dovbyk', position: 'ST', role: 'Striker', rating: 82, age: 27 },
       { name: 'Mykola Matviyenko', position: 'CB', role: 'Centre Back', rating: 76, age: 28 },
       { name: 'Georgiy Sudakov', position: 'CM', role: 'Creative Mid', rating: 78, age: 22 },
       { name: 'Viktor Tsygankov', position: 'RW', role: 'Winger', rating: 76, age: 26 },
       { name: 'Andriy Lunin', position: 'GK', role: 'Goalkeeper', rating: 80, age: 25 },
       { name: 'Illia Zabarnyi', position: 'CB', role: 'Centre Back', rating: 77, age: 22 }]),

    // Group B
    makeTeam('argentina', 'Argentina', 'ARG', '🇦🇷', 'CONMEBOL', 'B', 92, 93, 91, 89, 88,
      'tiki-taka', 'attacking', 'World-class technical football built around individual genius', 10, 10, 10, '4-3-3', 'argentinian',
      [{ name: 'Lionel Messi', position: 'CF', role: 'Free Roaming Forward', rating: 96, age: 38 },
       { name: 'Lautaro Martínez', position: 'ST', role: 'Striker', rating: 90, age: 27 },
       { name: 'Rodrigo De Paul', position: 'CM', role: 'Box-to-Box', rating: 85, age: 31 },
       { name: 'Alexis Mac Allister', position: 'CM', role: 'Dynamic Midfielder', rating: 86, age: 26 },
       { name: 'Enzo Fernández', position: 'CDM', role: 'Deep Lying Playmaker', rating: 87, age: 24 },
       { name: 'Ángel Di María', position: 'RW', role: 'Winger', rating: 84, age: 37 },
       { name: 'Cristian Romero', position: 'CB', role: 'Ball-Playing CB', rating: 87, age: 27 },
       { name: 'Lisandro Martínez', position: 'CB', role: 'Centre Back', rating: 86, age: 27 },
       { name: 'Nicolás Tagliafico', position: 'LB', role: 'Left Back', rating: 80, age: 32 },
       { name: 'Nahuel Molina', position: 'RB', role: 'Right Back', rating: 81, age: 27 },
       { name: 'Emiliano Martínez', position: 'GK', role: 'Goalkeeper', rating: 90, age: 32 },
       { name: 'Julián Álvarez', position: 'ST', role: 'Forward', rating: 87, age: 25 }]),

    makeTeam('chile', 'Chile', 'CHI', '🇨🇱', 'CONMEBOL', 'B', 70, 70, 71, 70, 67,
      'pressing', 'attacking', 'High-intensity pressing machine with Championship pedigree', 6, 5, 5, '4-3-3', 'chilean',
      [{ name: 'Alexis Sánchez', position: 'LW', role: 'Winger', rating: 80, age: 36 },
       { name: 'Arturo Vidal', position: 'CM', role: 'Box-to-Box', rating: 76, age: 37 },
       { name: 'Claudio Bravo', position: 'GK', role: 'Goalkeeper', rating: 74, age: 41 },
       { name: 'Gary Medel', position: 'CDM', role: 'Ball Winner', rating: 73, age: 37 },
       { name: 'Eduardo Vargas', position: 'ST', role: 'Striker', rating: 74, age: 34 },
       { name: 'Ben Brereton Díaz', position: 'ST', role: 'Forward', rating: 76, age: 25 }]),

    makeTeam('peru', 'Peru', 'PER', '🇵🇪', 'CONMEBOL', 'B', 69, 68, 70, 68, 68,
      'counter', 'balanced', 'Organized and passionate South American football', 5, 4, 4, '4-2-3-1', 'peruvian',
      [{ name: 'Paolo Guerrero', position: 'ST', role: 'Striker', rating: 74, age: 40 },
       { name: 'André Carrillo', position: 'RW', role: 'Winger', rating: 76, age: 33 },
       { name: 'Renato Tapia', position: 'CDM', role: 'Defensive Mid', rating: 75, age: 29 },
       { name: 'Gianluca Lapadula', position: 'ST', role: 'Forward', rating: 73, age: 34 }]),

    makeTeam('austria', 'Austria', 'AUT', '🇦🇹', 'UEFA', 'B', 77, 77, 78, 75, 74,
      'pressing', 'attacking', 'Modern pressing football built on Bundesliga quality', 6, 5, 5, '4-3-3', 'austrian',
      [{ name: 'David Alaba', position: 'CB', role: 'Ball-Playing CB', rating: 85, age: 33 },
       { name: 'Marcel Sabitzer', position: 'CM', role: 'Box-to-Box', rating: 82, age: 31 },
       { name: 'Konrad Laimer', position: 'CM', role: 'Energetic Midfielder', rating: 81, age: 27 },
       { name: 'Marko Arnautovic', position: 'ST', role: 'Target Man', rating: 80, age: 35 },
       { name: 'Christoph Baumgartner', position: 'CAM', role: 'Attacking Mid', rating: 79, age: 25 },
       { name: 'Michael Gregoritsch', position: 'ST', role: 'Forward', rating: 77, age: 30 },
       { name: 'Patrick Pentz', position: 'GK', role: 'Goalkeeper', rating: 76, age: 26 }]),

    // Group C
    makeTeam('mexico', 'Mexico', 'MEX', '🇲🇽', 'CONCACAF', 'C', 75, 75, 75, 75, 73,
      'possession', 'balanced', 'Technical possession football from a passionate footballing nation', 8, 7, 7, '4-3-3', 'mexican',
      [{ name: 'Hirving Lozano', position: 'RW', role: 'Winger', rating: 83, age: 29 },
       { name: 'Raúl Jiménez', position: 'ST', role: 'Striker', rating: 81, age: 33 },
       { name: 'Edson Álvarez', position: 'CDM', role: 'Defensive Mid', rating: 82, age: 27 },
       { name: 'Andrés Guardado', position: 'CM', role: 'Veteran Playmaker', rating: 76, age: 38 },
       { name: 'Héctor Herrera', position: 'CM', role: 'Midfielder', rating: 77, age: 34 },
       { name: 'Carlos Vela', position: 'CF', role: 'False 9', rating: 79, age: 35 },
       { name: 'Alexis Vega', position: 'LW', role: 'Winger', rating: 76, age: 28 },
       { name: 'Santiago Giménez', position: 'ST', role: 'Forward', rating: 80, age: 24 },
       { name: 'Guillermo Ochoa', position: 'GK', role: 'Goalkeeper', rating: 79, age: 39 }]),

    makeTeam('jamaica', 'Jamaica', 'JAM', '🇯🇲', 'CONCACAF', 'C', 64, 65, 62, 63, 60,
      'counter', 'balanced', 'Athletic and energetic Caribbean football with Premier League quality', 4, 3, 3, '4-4-2', 'jamaican',
      [{ name: 'Leon Bailey', position: 'LW', role: 'Winger', rating: 81, age: 27 },
       { name: 'Michail Antonio', position: 'ST', role: 'Target Man', rating: 77, age: 34 },
       { name: 'Bobby Reid', position: 'CAM', role: 'Attacking Mid', rating: 70, age: 30 }]),

    makeTeam('venezuela', 'Venezuela', 'VEN', '🇻🇪', 'CONMEBOL', 'C', 68, 69, 67, 68, 65,
      'counter', 'balanced', 'South American physicality with growing technical quality', 4, 3, 3, '4-4-2', 'venezuelan',
      [{ name: 'Salomón Rondón', position: 'ST', role: 'Target Man', rating: 74, age: 35 },
       { name: 'Yeferson Soteldo', position: 'LW', role: 'Winger', rating: 76, age: 27 },
       { name: 'Tomás Rincón', position: 'CDM', role: 'Defensive Mid', rating: 72, age: 36 },
       { name: 'Darwin Machís', position: 'RW', role: 'Winger', rating: 73, age: 32 }]),

    makeTeam('iran', 'Iran', 'IRN', '🇮🇷', 'AFC', 'C', 72, 71, 72, 72, 70,
      'low-block', 'defensive', 'Disciplined and organized Asian football with dangerous counters', 5, 4, 4, '4-5-1', 'iranian',
      [{ name: 'Mehdi Taremi', position: 'ST', role: 'Striker', rating: 81, age: 32 },
       { name: 'Sardar Azmoun', position: 'ST', role: 'Forward', rating: 79, age: 30 },
       { name: 'Alireza Jahanbakhsh', position: 'RW', role: 'Winger', rating: 77, age: 31 },
       { name: 'Ali Gholizadeh', position: 'LW', role: 'Winger', rating: 75, age: 27 },
       { name: 'Alireza Beiranvand', position: 'GK', role: 'Goalkeeper', rating: 78, age: 32 }]),

    // Group D
    makeTeam('france', 'France', 'FRA', '🇫🇷', 'UEFA', 'D', 91, 92, 90, 90, 89,
      'pressing', 'attacking', 'World-class depth with electric pace and individual brilliance', 10, 9, 9, '4-3-3', 'french',
      [{ name: 'Kylian Mbappé', position: 'ST', role: 'Target Man/Pace', rating: 95, age: 27 },
       { name: 'Antoine Griezmann', position: 'CF', role: 'Second Striker', rating: 88, age: 35 },
       { name: 'Aurélien Tchouaméni', position: 'CDM', role: 'Defensive Mid', rating: 87, age: 25 },
       { name: 'Marcus Thuram', position: 'LW', role: 'Forward', rating: 86, age: 27 },
       { name: 'Ousmane Dembélé', position: 'RW', role: 'Winger', rating: 86, age: 28 },
       { name: 'Adrien Rabiot', position: 'CM', role: 'Box-to-Box', rating: 83, age: 30 },
       { name: 'Jules Koundé', position: 'RB', role: 'Right Back', rating: 86, age: 26 },
       { name: 'William Saliba', position: 'CB', role: 'Centre Back', rating: 87, age: 24 },
       { name: 'Raphaël Varane', position: 'CB', role: 'Centre Back', rating: 83, age: 32 },
       { name: 'Theo Hernández', position: 'LB', role: 'Left Back', rating: 85, age: 27 },
       { name: 'Mike Maignan', position: 'GK', role: 'Goalkeeper', rating: 87, age: 29 },
       { name: 'Eduardo Camavinga', position: 'CM', role: 'Dynamic Midfielder', rating: 85, age: 22 }]),

    makeTeam('belgium', 'Belgium', 'BEL', '🇧🇪', 'UEFA', 'D', 83, 84, 83, 82, 80,
      'possession', 'attacking', 'Golden generation transitioning to new era with quality throughout', 8, 7, 7, '4-3-3', 'belgian',
      [{ name: 'Kevin De Bruyne', position: 'CAM', role: 'Playmaker', rating: 91, age: 33 },
       { name: 'Romelu Lukaku', position: 'ST', role: 'Target Man', rating: 85, age: 31 },
       { name: 'Thibaut Courtois', position: 'GK', role: 'Goalkeeper', rating: 91, age: 33 },
       { name: 'Alexis Saelemaekers', position: 'RW', role: 'Winger', rating: 78, age: 25 },
       { name: 'Leandro Trossard', position: 'LW', role: 'Winger', rating: 82, age: 30 },
       { name: 'Amadou Onana', position: 'CDM', role: 'Physical Mid', rating: 81, age: 23 },
       { name: 'Arthur Theate', position: 'CB', role: 'Centre Back', rating: 79, age: 24 },
       { name: 'Yannick Carrasco', position: 'LM', role: 'Wide Midfielder', rating: 80, age: 31 }]),

    makeTeam('israel', 'Israel', 'ISR', '🇮🇱', 'UEFA', 'D', 68, 68, 67, 69, 65,
      'counter', 'balanced', 'Organized European-style football with quality attackers', 4, 3, 3, '4-4-2', 'israeli',
      [{ name: 'Eran Zahavi', position: 'ST', role: 'Striker', rating: 75, age: 37 },
       { name: 'Munas Dabbur', position: 'CF', role: 'Forward', rating: 73, age: 32 },
       { name: 'Manor Solomon', position: 'LW', role: 'Winger', rating: 73, age: 25 }]),

    makeTeam('paraguay', 'Paraguay', 'PAR', '🇵🇾', 'CONMEBOL', 'D', 68, 67, 68, 70, 65,
      'counter', 'defensive', 'Physical and well-organized South American defensive side', 4, 3, 4, '4-4-2', 'paraguayan',
      [{ name: 'Miguel Almirón', position: 'CAM', role: 'Attacking Mid', rating: 79, age: 31 },
       { name: 'Antonio Sanabria', position: 'ST', role: 'Striker', rating: 76, age: 28 },
       { name: 'Ángel Romero', position: 'RW', role: 'Winger', rating: 74, age: 33 }]),

    // Group E
    makeTeam('spain', 'Spain', 'ESP', '🇪🇸', 'UEFA', 'E', 90, 91, 91, 88, 86,
      'tiki-taka', 'attacking', 'Masters of possession football with the most complete squad in Europe', 10, 9, 10, '4-3-3', 'spanish',
      [{ name: 'Pedri', position: 'CM', role: 'Creative Midfielder', rating: 89, age: 23 },
       { name: 'Gavi', position: 'CM', role: 'Dynamic Midfielder', rating: 87, age: 20 },
       { name: 'Rodrigo Hernández', position: 'CDM', role: 'Defensive Mid', rating: 88, age: 23 },
       { name: 'Ferran Torres', position: 'RW', role: 'Winger', rating: 82, age: 25 },
       { name: 'Álvaro Morata', position: 'ST', role: 'Target Man', rating: 83, age: 32 },
       { name: 'Alejandro Balde', position: 'LB', role: 'Left Back', rating: 82, age: 21 },
       { name: 'Dani Carvajal', position: 'RB', role: 'Right Back', rating: 84, age: 32 },
       { name: 'Aymeric Laporte', position: 'CB', role: 'Centre Back', rating: 84, age: 31 },
       { name: 'Pau Cubarsi', position: 'CB', role: 'Ball-Playing CB', rating: 82, age: 18 },
       { name: 'Unai Simón', position: 'GK', role: 'Goalkeeper', rating: 83, age: 28 },
       { name: 'Nico Williams', position: 'LW', role: 'Winger', rating: 85, age: 22 },
       { name: 'Lamine Yamal', position: 'RW', role: 'Winger', rating: 88, age: 18 }]),

    makeTeam('netherlands', 'Netherlands', 'NED', '🇳🇱', 'UEFA', 'E', 86, 87, 85, 85, 82,
      'pressing', 'attacking', 'Attacking total football tradition with world-class forwards', 9, 8, 8, '4-3-3', 'dutch',
      [{ name: 'Virgil van Dijk', position: 'CB', role: 'Centre Back', rating: 89, age: 34 },
       { name: 'Frenkie de Jong', position: 'CM', role: 'Creative Mid', rating: 87, age: 27 },
       { name: 'Memphis Depay', position: 'ST', role: 'Forward', rating: 82, age: 31 },
       { name: 'Cody Gakpo', position: 'LW', role: 'Winger', rating: 83, age: 26 },
       { name: 'Xavi Simons', position: 'CAM', role: 'Attacking Mid', rating: 82, age: 23 },
       { name: 'Denzel Dumfries', position: 'RB', role: 'Right Back', rating: 82, age: 29 },
       { name: 'Jurriën Timber', position: 'CB', role: 'Centre Back', rating: 83, age: 23 },
       { name: 'Bart Verbruggen', position: 'GK', role: 'Goalkeeper', rating: 80, age: 22 },
       { name: 'Ryan Gravenberch', position: 'CM', role: 'Box-to-Box', rating: 82, age: 23 }]),

    makeTeam('croatia', 'Croatia', 'CRO', '🇭🇷', 'UEFA', 'E', 80, 79, 82, 79, 78,
      'possession', 'balanced', 'Technically gifted Balkan side with a golden generation', 7, 6, 7, '4-3-3', 'croatian',
      [{ name: 'Luka Modrić', position: 'CM', role: 'Playmaker', rating: 88, age: 40 },
       { name: 'Ivan Perišić', position: 'LM', role: 'Wide Midfielder', rating: 82, age: 36 },
       { name: 'Marcelo Brozović', position: 'CDM', role: 'Deep Playmaker', rating: 85, age: 32 },
       { name: 'Mateo Kovačić', position: 'CM', role: 'Dynamic Mid', rating: 85, age: 31 },
       { name: 'Andrej Kramarić', position: 'ST', role: 'Striker', rating: 82, age: 34 },
       { name: 'Joško Gvardiol', position: 'LB', role: 'Left Back', rating: 86, age: 23 },
       { name: 'Nikola Vlašić', position: 'CAM', role: 'Attacking Mid', rating: 80, age: 27 },
       { name: 'Dominik Livakovic', position: 'GK', role: 'Goalkeeper', rating: 83, age: 29 }]),

    makeTeam('egypt', 'Egypt', 'EGY', '🇪🇬', 'CAF', 'E', 70, 73, 68, 68, 70,
      'counter', 'balanced', 'One man team built around their world-class captain', 6, 6, 4, '4-2-3-1', 'egyptian',
      [{ name: 'Mohamed Salah', position: 'RW', role: 'Winger', rating: 90, age: 34 },
       { name: 'Mostafa Mohamed', position: 'ST', role: 'Striker', rating: 75, age: 27 },
       { name: 'Omar Marmoush', position: 'CAM', role: 'Attacking Mid', rating: 79, age: 26 },
       { name: 'Ahmed Elmohamady', position: 'RB', role: 'Right Back', rating: 71, age: 37 },
       { name: 'Mohamed Abou Gabal', position: 'GK', role: 'Goalkeeper', rating: 74, age: 33 }]),

    // Group F
    makeTeam('brazil', 'Brazil', 'BRA', '🇧🇷', 'CONMEBOL', 'F', 90, 92, 89, 88, 87,
      'possession', 'attacking', 'Beautiful jogo bonito football with world-class flair and depth', 10, 10, 9, '4-2-3-1', 'brazilian',
      [{ name: 'Vinícius Júnior', position: 'LW', role: 'Winger', rating: 92, age: 24 },
       { name: 'Rodrygo Goes', position: 'RW', role: 'Winger', rating: 86, age: 24 },
       { name: 'Neymar Jr', position: 'CF', role: 'Free Roaming Forward', rating: 87, age: 34 },
       { name: 'Casemiro', position: 'CDM', role: 'Destroyer', rating: 85, age: 33 },
       { name: 'Bruno Guimarães', position: 'CM', role: 'Box-to-Box', rating: 86, age: 27 },
       { name: 'Lucas Paquetá', position: 'CAM', role: 'Playmaker', rating: 85, age: 27 },
       { name: 'Marquinhos', position: 'CB', role: 'Ball-Playing CB', rating: 85, age: 31 },
       { name: 'Gabriel Magalhães', position: 'CB', role: 'Centre Back', rating: 84, age: 27 },
       { name: 'Danilo', position: 'RB', role: 'Right Back', rating: 80, age: 33 },
       { name: 'Alex Sandro', position: 'LB', role: 'Left Back', rating: 79, age: 34 },
       { name: 'Alisson Becker', position: 'GK', role: 'Goalkeeper', rating: 91, age: 32 },
       { name: 'Endrick', position: 'ST', role: 'Striker', rating: 82, age: 18 }]),

    makeTeam('colombia', 'Colombia', 'COL', '🇨🇴', 'CONMEBOL', 'F', 82, 83, 82, 80, 78,
      'counter', 'attacking', 'Skillful South American football with a rich history of creativity', 7, 6, 6, '4-4-2', 'colombian',
      [{ name: 'James Rodríguez', position: 'CAM', role: 'Playmaker', rating: 84, age: 34 },
       { name: 'Luis Díaz', position: 'LW', role: 'Winger', rating: 87, age: 27 },
       { name: 'Falcao García', position: 'ST', role: 'Target Man', rating: 75, age: 40 },
       { name: 'Juan Cuadrado', position: 'RW', role: 'Winger', rating: 79, age: 36 },
       { name: 'Yerry Mina', position: 'CB', role: 'Centre Back', rating: 80, age: 30 },
       { name: 'Jhon Córdoba', position: 'ST', role: 'Forward', rating: 79, age: 31 },
       { name: 'Richard Ríos', position: 'CM', role: 'Midfielder', rating: 79, age: 24 },
       { name: 'Camilo Vargas', position: 'GK', role: 'Goalkeeper', rating: 77, age: 32 },
       { name: 'Daniel Muñoz', position: 'RB', role: 'Right Back', rating: 78, age: 28 }]),

    makeTeam('ecuador', 'Ecuador', 'ECU', '🇪🇨', 'CONMEBOL', 'F', 72, 72, 71, 73, 69,
      'counter', 'balanced', 'Physical South American side with pace on the counter', 5, 4, 4, '4-4-2', 'ecuadorian',
      [{ name: 'Enner Valencia', position: 'ST', role: 'Striker', rating: 77, age: 35 },
       { name: 'Pervis Estupiñán', position: 'LB', role: 'Left Back', rating: 80, age: 26 },
       { name: 'Moisés Caicedo', position: 'CDM', role: 'Defensive Mid', rating: 82, age: 23 },
       { name: 'Gonzalo Plata', position: 'RW', role: 'Winger', rating: 76, age: 23 },
       { name: 'Jeremy Sarmiento', position: 'LW', role: 'Winger', rating: 74, age: 23 }]),

    makeTeam('nigeria', 'Nigeria', 'NGA', '🇳🇬', 'CAF', 'F', 76, 78, 74, 74, 72,
      'counter', 'attacking', 'Explosive and athletic African football with world-class forwards', 6, 6, 5, '4-3-3', 'nigerian',
      [{ name: 'Victor Osimhen', position: 'ST', role: 'Striker', rating: 88, age: 26 },
       { name: 'Ademola Lookman', position: 'RW', role: 'Winger', rating: 82, age: 27 },
       { name: 'Alex Iwobi', position: 'CAM', role: 'Attacking Mid', rating: 78, age: 28 },
       { name: 'Wilfred Ndidi', position: 'CDM', role: 'Ball Winner', rating: 80, age: 28 },
       { name: 'Samuel Chukwueze', position: 'LW', role: 'Winger', rating: 79, age: 25 },
       { name: 'Calvin Bassey', position: 'CB', role: 'Centre Back', rating: 77, age: 25 },
       { name: 'Stanley Nwabali', position: 'GK', role: 'Goalkeeper', rating: 76, age: 28 }]),

    // Group G
    makeTeam('canada', 'Canada', 'CAN', '🇨🇦', 'CONCACAF', 'G', 76, 77, 75, 75, 73,
      'pressing', 'attacking', 'Energetic pressing team with world-class pace and physicality', 6, 6, 5, '4-3-3', 'canadian',
      [{ name: 'Alphonso Davies', position: 'LB', role: 'Left Back', rating: 88, age: 24 },
       { name: 'Jonathan David', position: 'ST', role: 'Striker', rating: 84, age: 24 },
       { name: 'Cyle Larin', position: 'ST', role: 'Target Man', rating: 78, age: 29 },
       { name: 'Stephen Eustáquio', position: 'CM', role: 'Midfielder', rating: 78, age: 27 },
       { name: 'Tajon Buchanan', position: 'RW', role: 'Winger', rating: 79, age: 25 },
       { name: 'Atiba Hutchinson', position: 'CDM', role: 'Veteran Mid', rating: 73, age: 41 },
       { name: 'Alistair Johnston', position: 'RB', role: 'Right Back', rating: 77, age: 26 },
       { name: 'Milan Borjan', position: 'GK', role: 'Goalkeeper', rating: 76, age: 36 }]),

    makeTeam('morocco', 'Morocco', 'MAR', '🇲🇦', 'CAF', 'G', 81, 80, 82, 82, 80,
      'compact', 'defensive', 'Disciplined and resilient Atlas Lions with dangerous counters', 7, 7, 7, '4-5-1', 'moroccan',
      [{ name: 'Hakim Ziyech', position: 'RW', role: 'Winger', rating: 82, age: 32 },
       { name: 'Youssef En-Nesyri', position: 'ST', role: 'Target Man', rating: 82, age: 27 },
       { name: 'Achraf Hakimi', position: 'RB', role: 'Right Back', rating: 88, age: 26 },
       { name: 'Sofyan Amrabat', position: 'CDM', role: 'Defensive Mid', rating: 82, age: 28 },
       { name: 'Azzedine Ounahi', position: 'CM', role: 'Box-to-Box', rating: 79, age: 24 },
       { name: 'Nayef Aguerd', position: 'CB', role: 'Centre Back', rating: 80, age: 28 },
       { name: 'Romain Saïss', position: 'CB', role: 'Centre Back', rating: 78, age: 34 },
       { name: 'Yassine Bounou', position: 'GK', role: 'Goalkeeper', rating: 84, age: 33 },
       { name: 'Noussair Mazraoui', position: 'RB', role: 'Right Back', rating: 80, age: 27 }]),

    makeTeam('senegal', 'Senegal', 'SEN', '🇸🇳', 'CAF', 'G', 79, 79, 78, 79, 76,
      'counter', 'attacking', 'Athletic African champions with physical dominance and pace', 6, 6, 6, '4-3-3', 'senegalese',
      [{ name: 'Sadio Mané', position: 'LW', role: 'Winger', rating: 86, age: 34 },
       { name: 'Édouard Mendy', position: 'GK', role: 'Goalkeeper', rating: 82, age: 32 },
       { name: 'Kalidou Koulibaly', position: 'CB', role: 'Centre Back', rating: 84, age: 33 },
       { name: 'Idrissa Gueye', position: 'CDM', role: 'Ball Winner', rating: 79, age: 35 },
       { name: 'Ismaïla Sarr', position: 'RW', role: 'Winger', rating: 80, age: 26 },
       { name: 'Famara Diedhiou', position: 'ST', role: 'Target Man', rating: 77, age: 32 },
       { name: 'Nampalys Mendy', position: 'CM', role: 'Defensive Mid', rating: 75, age: 32 }]),

    makeTeam('uzbekistan', 'Uzbekistan', 'UZB', '🇺🇿', 'AFC', 'G', 65, 65, 64, 65, 63,
      'counter', 'balanced', 'Improving Central Asian football with growing infrastructure', 3, 3, 2, '4-4-2', 'uzbek',
      [{ name: 'Eldor Shomurodov', position: 'ST', role: 'Striker', rating: 72, age: 29 },
       { name: 'Otabek Shukurov', position: 'CM', role: 'Midfielder', rating: 67, age: 26 },
       { name: 'Jasur Yakhshiboev', position: 'ST', role: 'Forward', rating: 67, age: 27 }]),

    // Group H
    makeTeam('portugal', 'Portugal', 'POR', '🇵🇹', 'UEFA', 'H', 88, 90, 87, 85, 84,
      'possession', 'attacking', 'Technically superior side led by the all-time great Cristiano', 9, 8, 8, '4-3-3', 'portuguese',
      [{ name: 'Cristiano Ronaldo', position: 'ST', role: 'Goal Machine', rating: 88, age: 41 },
       { name: 'Bruno Fernandes', position: 'CAM', role: 'Playmaker', rating: 88, age: 30 },
       { name: 'Bernardo Silva', position: 'RW', role: 'Winger', rating: 88, age: 30 },
       { name: 'Rafael Leão', position: 'LW', role: 'Winger', rating: 86, age: 25 },
       { name: 'Rúben Dias', position: 'CB', role: 'Centre Back', rating: 88, age: 28 },
       { name: 'João Cancelo', position: 'RB', role: 'Right Back', rating: 85, age: 31 },
       { name: 'Nuno Mendes', position: 'LB', role: 'Left Back', rating: 83, age: 22 },
       { name: 'Rúben Neves', position: 'CDM', role: 'Defensive Mid', rating: 82, age: 28 },
       { name: 'Diogo Jota', position: 'CF', role: 'Forward', rating: 84, age: 28 },
       { name: 'Rui Patrício', position: 'GK', role: 'Goalkeeper', rating: 82, age: 36 },
       { name: 'João Félix', position: 'LW', role: 'Creative Forward', rating: 83, age: 25 },
       { name: 'Vitinha', position: 'CM', role: 'Midfielder', rating: 82, age: 25 }]),

    makeTeam('turkey', 'Turkey', 'TUR', '🇹🇷', 'UEFA', 'H', 77, 78, 77, 76, 73,
      'vertical', 'attacking', 'Passionate and physical football with technical flair from Europe', 6, 6, 5, '4-3-3', 'turkish',
      [{ name: 'Hakan Çalhanoğlu', position: 'CDM', role: 'Deep Playmaker', rating: 85, age: 31 },
       { name: 'Kerem Aktürkoğlu', position: 'LW', role: 'Winger', rating: 80, age: 26 },
       { name: 'Arda Güler', position: 'CAM', role: 'Young Playmaker', rating: 83, age: 20 },
       { name: 'Burak Yılmaz', position: 'ST', role: 'Target Man', rating: 74, age: 39 },
       { name: 'Merih Demiral', position: 'CB', role: 'Centre Back', rating: 81, age: 26 },
       { name: 'Çağlar Söyüncü', position: 'CB', role: 'Centre Back', rating: 79, age: 28 },
       { name: 'Mert Günok', position: 'GK', role: 'Goalkeeper', rating: 77, age: 35 }]),

    makeTeam('poland', 'Poland', 'POL', '🇵🇱', 'UEFA', 'H', 75, 76, 74, 74, 73,
      'counter', 'balanced', 'Direct and physical European football centered around their striker', 6, 5, 5, '4-4-2', 'polish',
      [{ name: 'Robert Lewandowski', position: 'ST', role: 'Striker', rating: 91, age: 37 },
       { name: 'Piotr Zieliński', position: 'CAM', role: 'Playmaker', rating: 82, age: 30 },
       { name: 'Wojciech Szczęsny', position: 'GK', role: 'Goalkeeper', rating: 82, age: 35 },
       { name: 'Jan Bednarek', position: 'CB', role: 'Centre Back', rating: 78, age: 29 },
       { name: 'Krzysztof Piątek', position: 'ST', role: 'Forward', rating: 76, age: 29 },
       { name: 'Bartosz Salamon', position: 'CB', role: 'Centre Back', rating: 74, age: 34 }]),

    makeTeam('uruguay', 'Uruguay', 'URU', '🇺🇾', 'CONMEBOL', 'H', 81, 81, 81, 81, 78,
      'direct', 'balanced', 'Gritty South American football with world-class experience', 7, 6, 7, '4-3-3', 'uruguayan',
      [{ name: 'Federico Valverde', position: 'CM', role: 'Box-to-Box', rating: 88, age: 26 },
       { name: 'Rodrigo Bentancur', position: 'CDM', role: 'Defensive Mid', rating: 83, age: 27 },
       { name: 'Darwin Núñez', position: 'ST', role: 'Striker', rating: 85, age: 25 },
       { name: 'Luis Suárez', position: 'ST', role: 'Veteran Forward', rating: 79, age: 39 },
       { name: 'Ronald Araújo', position: 'CB', role: 'Centre Back', rating: 85, age: 25 },
       { name: 'José María Giménez', position: 'CB', role: 'Centre Back', rating: 82, age: 30 },
       { name: 'Guillermo Varela', position: 'RB', role: 'Right Back', rating: 78, age: 31 },
       { name: 'Sebastián Coates', position: 'CB', role: 'Centre Back', rating: 79, age: 34 },
       { name: 'Sergio Rochet', position: 'GK', role: 'Goalkeeper', rating: 80, age: 29 }]),

    // Group I
    makeTeam('germany', 'Germany', 'GER', '🇩🇪', 'UEFA', 'I', 88, 88, 89, 87, 86,
      'gegenpress', 'attacking', 'Die Mannschaft - engineering precision meets relentless pressing', 10, 9, 9, '4-3-3', 'german',
      [{ name: 'Joshua Kimmich', position: 'CDM', role: 'Deep Playmaker', rating: 89, age: 29 },
       { name: 'Jamal Musiala', position: 'CAM', role: 'Young Genius', rating: 89, age: 22 },
       { name: 'Florian Wirtz', position: 'CAM', role: 'Attacking Mid', rating: 88, age: 21 },
       { name: 'Leroy Sané', position: 'RW', role: 'Winger', rating: 84, age: 29 },
       { name: 'Kai Havertz', position: 'CF', role: 'Versatile Forward', rating: 83, age: 26 },
       { name: 'Ilkay Gündoğan', position: 'CM', role: 'Playmaker', rating: 84, age: 35 },
       { name: 'Antonio Rüdiger', position: 'CB', role: 'Ball-Playing CB', rating: 85, age: 32 },
       { name: 'Jonathan Tah', position: 'CB', role: 'Centre Back', rating: 82, age: 29 },
       { name: 'Manuel Neuer', position: 'GK', role: 'Sweeper Keeper', rating: 86, age: 40 },
       { name: 'David Raum', position: 'LB', role: 'Left Back', rating: 80, age: 26 },
       { name: 'Serge Gnabry', position: 'RW', role: 'Winger', rating: 82, age: 30 },
       { name: 'Thomas Müller', position: 'CF', role: 'Raumdeuter', rating: 82, age: 36 }]),

    makeTeam('scotland', 'Scotland', 'SCO', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'UEFA', 'I', 72, 70, 73, 73, 71,
      'pressing', 'balanced', 'Passionate Tartan Army with Premier League quality throughout', 5, 4, 4, '4-3-3', 'scottish',
      [{ name: 'Scott McTominay', position: 'CM', role: 'Box-to-Box', rating: 78, age: 27 },
       { name: 'Andy Robertson', position: 'LB', role: 'Left Back', rating: 83, age: 32 },
       { name: 'Kieran Tierney', position: 'LB', role: 'Left Back', rating: 78, age: 27 },
       { name: 'John McGinn', position: 'CM', role: 'Midfielder', rating: 78, age: 30 },
       { name: 'Che Adams', position: 'ST', role: 'Striker', rating: 74, age: 29 },
       { name: 'Ryan Christie', position: 'CAM', role: 'Attacking Mid', rating: 73, age: 29 },
       { name: 'Angus Gunn', position: 'GK', role: 'Goalkeeper', rating: 74, age: 28 }]),

    makeTeam('hungary', 'Hungary', 'HUN', '🇭🇺', 'UEFA', 'I', 73, 72, 73, 73, 72,
      'counter', 'balanced', 'Physically dominant European team with pace on the counter', 5, 4, 4, '3-5-2', 'hungarian',
      [{ name: 'Dominik Szoboszlai', position: 'CAM', role: 'Playmaker', rating: 84, age: 24 },
       { name: 'Roland Sallai', position: 'RW', role: 'Winger', rating: 77, age: 27 },
       { name: 'Péter Gulácsi', position: 'GK', role: 'Goalkeeper', rating: 78, age: 34 },
       { name: 'Ádám Szalai', position: 'ST', role: 'Target Man', rating: 73, age: 36 },
       { name: 'Willi Orbán', position: 'CB', role: 'Centre Back', rating: 76, age: 31 }]),

    makeTeam('japan', 'Japan', 'JPN', '🇯🇵', 'AFC', 'I', 81, 81, 82, 79, 78,
      'pressing', 'attacking', 'Disciplined tactical football blending Asian dedication with technical quality', 7, 6, 7, '4-3-3', 'japanese',
      [{ name: 'Takumi Minamino', position: 'CF', role: 'Second Striker', rating: 80, age: 30 },
       { name: 'Ritsu Doan', position: 'RW', role: 'Winger', rating: 81, age: 26 },
       { name: 'Takefusa Kubo', position: 'RW', role: 'Winger', rating: 82, age: 23 },
       { name: 'Junya Ito', position: 'RW', role: 'Winger', rating: 79, age: 31 },
       { name: 'Wataru Endo', position: 'CDM', role: 'Defensive Mid', rating: 80, age: 31 },
       { name: 'Hidemasa Morita', position: 'CM', role: 'Midfielder', rating: 77, age: 30 },
       { name: 'Kaoru Mitoma', position: 'LW', role: 'Winger', rating: 83, age: 27 },
       { name: 'Ayase Ueda', position: 'ST', role: 'Striker', rating: 79, age: 26 },
       { name: 'Maya Yoshida', position: 'CB', role: 'Centre Back', rating: 75, age: 36 },
       { name: 'Shuichi Gonda', position: 'GK', role: 'Goalkeeper', rating: 76, age: 34 }]),

    // Group J
    makeTeam('england', 'England', 'ENG', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'UEFA', 'J', 88, 89, 87, 87, 87,
      'pressing', 'attacking', "Three Lions with elite Premier League depth and world-class talent", 10, 8, 8, '4-3-3', 'english',
      [{ name: 'Harry Kane', position: 'ST', role: 'Target Man/Playmaker', rating: 91, age: 33 },
       { name: 'Jude Bellingham', position: 'CAM', role: 'Complete Midfielder', rating: 91, age: 22 },
       { name: 'Phil Foden', position: 'LW', role: 'Winger', rating: 88, age: 26 },
       { name: 'Bukayo Saka', position: 'RW', role: 'Winger', rating: 88, age: 22 },
       { name: 'Declan Rice', position: 'CDM', role: 'Defensive Mid', rating: 87, age: 26 },
       { name: 'Trent Alexander-Arnold', position: 'RB', role: 'Right Back', rating: 86, age: 27 },
       { name: 'Kyle Walker', position: 'RB', role: 'Right Back', rating: 82, age: 36 },
       { name: 'John Stones', position: 'CB', role: 'Ball-Playing CB', rating: 83, age: 32 },
       { name: 'Marc Guehi', position: 'CB', role: 'Centre Back', rating: 82, age: 24 },
       { name: 'Luke Shaw', position: 'LB', role: 'Left Back', rating: 80, age: 29 },
       { name: 'Jordan Pickford', position: 'GK', role: 'Goalkeeper', rating: 82, age: 32 },
       { name: 'Marcus Rashford', position: 'LW', role: 'Winger', rating: 82, age: 28 }]),

    makeTeam('serbia', 'Serbia', 'SRB', '🇷🇸', 'UEFA', 'J', 78, 79, 77, 78, 74,
      'direct', 'attacking', 'Physical and direct Balkan side with deadly strikers', 6, 5, 5, '3-4-3', 'serbian',
      [{ name: 'Aleksandar Mitrović', position: 'ST', role: 'Target Man', rating: 83, age: 30 },
       { name: 'Dušan Vlahović', position: 'ST', role: 'Striker', rating: 84, age: 25 },
       { name: 'Dušan Tadić', position: 'LW', role: 'Winger', rating: 82, age: 36 },
       { name: 'Sergej Milinković-Savić', position: 'CM', role: 'Box-to-Box', rating: 84, age: 30 },
       { name: 'Filip Kostić', position: 'LM', role: 'Wide Mid', rating: 79, age: 32 },
       { name: 'Nikola Milenkovic', position: 'CB', role: 'Centre Back', rating: 79, age: 27 },
       { name: 'Predrag Rajković', position: 'GK', role: 'Goalkeeper', rating: 77, age: 29 }]),

    makeTeam('denmark', 'Denmark', 'DEN', '🇩🇰', 'UEFA', 'J', 80, 79, 81, 80, 78,
      'possession', 'balanced', 'Solid and organized Scandinavian side with Premier League quality', 6, 6, 6, '4-3-3', 'danish',
      [{ name: 'Christian Eriksen', position: 'CAM', role: 'Playmaker', rating: 84, age: 34 },
       { name: 'Pierre-Emile Höjbjerg', position: 'CDM', role: 'Defensive Mid', rating: 82, age: 29 },
       { name: 'Rasmus Höjlund', position: 'ST', role: 'Striker', rating: 82, age: 22 },
       { name: 'Joakim Mæhle', position: 'RB', role: 'Right Back', rating: 78, age: 27 },
       { name: 'Andreas Christensen', position: 'CB', role: 'Centre Back', rating: 82, age: 29 },
       { name: 'Kasper Schmeichel', position: 'GK', role: 'Goalkeeper', rating: 79, age: 38 },
       { name: 'Mikkel Damsgaard', position: 'CM', role: 'Attacking Mid', rating: 78, age: 24 }]),

    makeTeam('saudi_arabia', 'Saudi Arabia', 'KSA', '🇸🇦', 'AFC', 'J', 70, 70, 69, 70, 68,
      'low-block', 'defensive', 'Organized and disciplined Asian football with surprising quality', 5, 4, 3, '4-5-1', 'saudi',
      [{ name: 'Salem Al-Dawsari', position: 'LW', role: 'Winger', rating: 78, age: 33 },
       { name: 'Feras Al-Buraikan', position: 'ST', role: 'Striker', rating: 74, age: 23 },
       { name: 'Mohamed Kanno', position: 'CDM', role: 'Defensive Mid', rating: 74, age: 29 },
       { name: 'Mohammed Al-Owais', position: 'GK', role: 'Goalkeeper', rating: 76, age: 32 }]),

    // Group K
    makeTeam('switzerland', 'Switzerland', 'SUI', '🇨🇭', 'UEFA', 'K', 79, 78, 80, 79, 79,
      'compact', 'defensive', 'Tactically disciplined Swiss football with organized defending', 6, 5, 6, '3-4-2-1', 'swiss',
      [{ name: 'Granit Xhaka', position: 'CDM', role: 'Defensive Mid', rating: 83, age: 32 },
       { name: 'Xherdan Shaqiri', position: 'RW', role: 'Winger', rating: 79, age: 33 },
       { name: 'Yann Sommer', position: 'GK', role: 'Goalkeeper', rating: 84, age: 36 },
       { name: 'Manuel Akanji', position: 'CB', role: 'Centre Back', rating: 84, age: 29 },
       { name: 'Breel Embolo', position: 'ST', role: 'Striker', rating: 78, age: 27 },
       { name: 'Rubén Vargas', position: 'LW', role: 'Winger', rating: 76, age: 26 },
       { name: 'Remo Freuler', position: 'CM', role: 'Midfielder', rating: 78, age: 32 },
       { name: 'Dan Ndoye', position: 'RW', role: 'Winger', rating: 76, age: 24 }]),

    makeTeam('south_korea', 'South Korea', 'KOR', '🇰🇷', 'AFC', 'K', 78, 79, 77, 77, 75,
      'counter', 'balanced', 'Disciplined and athletic Asian football with world-class individuals', 6, 6, 6, '4-3-3', 'south_korean',
      [{ name: 'Son Heung-min', position: 'LW', role: 'Winger', rating: 88, age: 34 },
       { name: 'Hwang Hee-chan', position: 'ST', role: 'Striker', rating: 79, age: 28 },
       { name: 'Lee Kang-in', position: 'CAM', role: 'Attacking Mid', rating: 80, age: 23 },
       { name: 'Kim Min-jae', position: 'CB', role: 'Centre Back', rating: 86, age: 28 },
       { name: 'Hwang In-beom', position: 'CM', role: 'Midfielder', rating: 77, age: 28 },
       { name: 'Jo Hyeon-woo', position: 'GK', role: 'Goalkeeper', rating: 76, age: 30 }]),

    makeTeam('cameroon', 'Cameroon', 'CMR', '🇨🇲', 'CAF', 'K', 72, 73, 71, 72, 69,
      'direct', 'attacking', 'Athletic and physical African football with raw talent', 5, 4, 4, '4-3-3', 'cameroonian',
      [{ name: 'Vincent Aboubakar', position: 'ST', role: 'Target Man', rating: 79, age: 32 },
       { name: 'Eric Maxim Choupo-Moting', position: 'ST', role: 'Forward', rating: 77, age: 36 },
       { name: 'Karl Toko Ekambi', position: 'LW', role: 'Winger', rating: 77, age: 32 },
       { name: 'Bryan Mbeumo', position: 'RW', role: 'Winger', rating: 79, age: 25 },
       { name: 'André Onana', position: 'GK', role: 'Goalkeeper', rating: 83, age: 28 },
       { name: 'Michael Ngadeu-Ngadjui', position: 'CB', role: 'Centre Back', rating: 74, age: 34 }]),

    makeTeam('australia', 'Australia', 'AUS', '🇦🇺', 'AFC', 'K', 74, 73, 73, 74, 72,
      'counter', 'balanced', 'Determined Socceroos with physical European-based players', 5, 4, 4, '4-4-2', 'australian',
      [{ name: 'Mathew Leckie', position: 'RW', role: 'Winger', rating: 77, age: 34 },
       { name: 'Mitchell Duke', position: 'ST', role: 'Target Man', rating: 74, age: 34 },
       { name: 'Jackson Irvine', position: 'CM', role: 'Box-to-Box', rating: 75, age: 31 },
       { name: 'Mat Ryan', position: 'GK', role: 'Goalkeeper', rating: 77, age: 33 },
       { name: 'Harry Souttar', position: 'CB', role: 'Centre Back', rating: 76, age: 26 }]),

    // Group L
    makeTeam('italy', 'Italy', 'ITA', '🇮🇹', 'UEFA', 'L', 84, 83, 84, 85, 84,
      'compact', 'balanced', 'Tactical masters with defensive excellence and creative flair', 9, 8, 8, '3-5-2', 'italian',
      [{ name: 'Gianluigi Donnarumma', position: 'GK', role: 'Goalkeeper', rating: 88, age: 26 },
       { name: 'Federico Barella', position: 'CM', role: 'Box-to-Box', rating: 86, age: 27 },
       { name: 'Marco Verratti', position: 'CM', role: 'Midfield Maestro', rating: 84, age: 32 },
       { name: 'Ciro Immobile', position: 'ST', role: 'Striker', rating: 82, age: 35 },
       { name: 'Federico Chiesa', position: 'RW', role: 'Winger', rating: 83, age: 27 },
       { name: 'Lorenzo Pellegrini', position: 'CAM', role: 'Attacking Mid', rating: 80, age: 28 },
       { name: 'Alessandro Bastoni', position: 'CB', role: 'Ball-Playing CB', rating: 85, age: 25 },
       { name: 'Giovanni Di Lorenzo', position: 'RB', role: 'Right Back', rating: 81, age: 31 },
       { name: 'Davide Calabria', position: 'RB', role: 'Right Back', rating: 78, age: 28 },
       { name: 'Giacomo Raspadori', position: 'CF', role: 'Versatile Forward', rating: 79, age: 24 },
       { name: 'Nicolò Barella', position: 'CM', role: 'Dynamic Midfielder', rating: 86, age: 27 }]),

    makeTeam('czech_republic', 'Czech Republic', 'CZE', '🇨🇿', 'UEFA', 'L', 75, 75, 74, 75, 73,
      'direct', 'balanced', 'Solid Central European football with proven Bundesliga quality', 5, 4, 5, '4-2-3-1', 'czech',
      [{ name: 'Patrik Schick', position: 'ST', role: 'Striker', rating: 82, age: 29 },
       { name: 'Tomáš Souček', position: 'CM', role: 'Box-to-Box', rating: 81, age: 29 },
       { name: 'Vladimír Coufal', position: 'RB', role: 'Right Back', rating: 77, age: 32 },
       { name: 'Adam Hložek', position: 'LW', role: 'Winger', rating: 79, age: 22 },
       { name: 'Jiří Pavlenka', position: 'GK', role: 'Goalkeeper', rating: 76, age: 32 }]),

    makeTeam('slovakia', 'Slovakia', 'SVK', '🇸🇰', 'UEFA', 'L', 72, 71, 72, 73, 70,
      'compact', 'defensive', 'Organized and resilient Eastern European defensive football', 4, 3, 4, '4-5-1', 'slovak',
      [{ name: 'Milan Škriniar', position: 'CB', role: 'Centre Back', rating: 82, age: 29 },
       { name: 'Ondrej Duda', position: 'CAM', role: 'Attacking Mid', rating: 76, age: 30 },
       { name: 'Stanislav Lobotka', position: 'CDM', role: 'Deep Playmaker', rating: 80, age: 30 },
       { name: 'Robert Bozeník', position: 'ST', role: 'Striker', rating: 73, age: 25 },
       { name: 'Martin Dúbravka', position: 'GK', role: 'Goalkeeper', rating: 77, age: 35 }]),

    makeTeam('new_zealand', 'New Zealand', 'NZL', '🇳🇿', 'OFC', 'L', 63, 62, 62, 63, 61,
      'counter', 'defensive', 'Hardworking Oceanian side punching above their weight', 3, 2, 2, '4-5-1', 'newzealand',
      [{ name: 'Chris Wood', position: 'ST', role: 'Target Man', rating: 75, age: 33 },
       { name: 'Clayton Lewis', position: 'CM', role: 'Midfielder', rating: 67, age: 27 },
       { name: 'Stefan Marinovic', position: 'GK', role: 'Goalkeeper', rating: 65, age: 33 }]),
  ];

  const result: Record<string, Team> = {};
  for (const t of teams) {
    result[t.id] = t;
  }
  return result;
}

export function getTeamById(teams: Record<string, Team>, id: string): Team {
  const t = teams[id];
  if (!t) throw new Error(`Team not found: ${id}`);
  return t;
}
