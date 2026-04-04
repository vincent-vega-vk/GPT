const HOSTS_2026 = ["Stati Uniti", "Messico", "Canada"];

const confederations = [
  {
    key: "AFC",
    name: "AFC (Asia)",
    slots: 8,
    suggestions: ["Giappone", "Corea del Sud", "Iran", "Australia", "Arabia Saudita", "Qatar", "Iraq", "Emirati Arabi Uniti"],
  },
  {
    key: "CAF",
    name: "CAF (Africa)",
    slots: 9,
    suggestions: ["Marocco", "Senegal", "Egitto", "Nigeria", "Costa d'Avorio", "Tunisia", "Ghana", "Algeria", "Camerun"],
  },
  {
    key: "CONCACAF",
    name: "CONCACAF (Nord/Centro America)",
    slots: 6,
    lockedTeams: HOSTS_2026,
    suggestions: [...HOSTS_2026, "Costa Rica", "Giamaica", "Panama"],
  },
  {
    key: "CONMEBOL",
    name: "CONMEBOL (Sud America)",
    slots: 6,
    suggestions: ["Argentina", "Brasile", "Uruguay", "Colombia", "Ecuador", "Cile"],
  },
  {
    key: "OFC",
    name: "OFC (Oceania)",
    slots: 1,
    suggestions: ["Nuova Zelanda"],
  },
  {
    key: "UEFA",
    name: "UEFA (Europa)",
    slots: 16,
    suggestions: ["Spagna", "Francia", "Inghilterra", "Germania", "Italia", "Portogallo", "Paesi Bassi", "Belgio", "Croazia", "Danimarca", "Svizzera", "Turchia", "Austria", "Serbia", "Ucraina", "Polonia"],
  },
  {
    key: "PLAYOFF",
    name: "Playoff intercontinentale",
    slots: 2,
    suggestions: ["Perù", "Sudafrica"],
  },
];

const state = {
  teams: [],
  rankings: new Map(),
};

const slotsContainer = document.getElementById("slots-container");
const validationMessage = document.getElementById("validationMessage");
const rankingsTable = document.getElementById("rankingsTable");
const results = document.getElementById("results");

function normalizeName(name) {
  return name.trim().toLowerCase();
}

function normalizeLines(value) {
  return value
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


function buildSlotsUI() {
  slotsContainer.innerHTML = "";

  confederations.forEach((confed) => {
    const wrapper = document.createElement("div");
    wrapper.className = "confed";

    const title = document.createElement("h3");
    title.textContent = confed.name;

    const slots = document.createElement("p");
    slots.innerHTML = `Slot disponibili: <strong>${confed.slots}</strong>`;

    const textarea = document.createElement("textarea");
    textarea.id = `input-${confed.key}`;
    textarea.placeholder = "Inserisci una nazionale per riga";

    wrapper.appendChild(title);
    wrapper.appendChild(slots);

    if (confed.lockedTeams?.length) {
      const locked = document.createElement("p");
      locked.className = "note";
      locked.textContent = `Ospitanti fisse: ${confed.lockedTeams.join(", ")}.`;
      wrapper.appendChild(locked);
    }

    wrapper.appendChild(textarea);
    slotsContainer.appendChild(wrapper);
  });
}

function inferBasePower(confed, teamName = "") {
  const topTier = new Set(["Argentina", "Brasile", "Francia", "Spagna", "Inghilterra", "Germania", "Portogallo"]);
  const midHigh = new Set(["Italia", "Paesi Bassi", "Belgio", "Uruguay", "Croazia", "Colombia", "Marocco"]);

  if (topTier.has(teamName)) return randomInt(88, 96);
  if (midHigh.has(teamName)) return randomInt(80, 90);

  switch (confed) {
    case "UEFA":
      return randomInt(68, 90);
    case "CONMEBOL":
      return randomInt(69, 91);
    case "CONCACAF":
      return randomInt(60, 84);
    case "CAF":
      return randomInt(62, 86);
    case "AFC":
      return randomInt(58, 83);
    case "OFC":
      return randomInt(52, 72);
    case "PLAYOFF":
      return randomInt(56, 80);
    default:
      return randomInt(60, 80);
  }
}

function readConfederationSelection(confed) {
  const textarea = document.getElementById(`input-${confed.key}`);
  const listed = normalizeLines(textarea.value);

  const locked = confed.lockedTeams ?? [];
  const lockedMap = new Set(locked.map(normalizeName));

  const filtered = listed.filter((name) => !lockedMap.has(normalizeName(name)));
  return [...locked, ...filtered];
}

function collectTeams() {
  const teams = [];
  const errors = [];
  const seen = new Set();

  confederations.forEach((confed) => {
    const lines = readConfederationSelection(confed);

    if (lines.length !== confed.slots) {
      errors.push(`${confed.name}: hai inserito ${lines.length}/${confed.slots} squadre (incluse eventuali ospitanti fisse).`);
    }

    lines.forEach((team) => {
      const key = normalizeName(team);
      if (seen.has(key)) {
        errors.push(`Squadra duplicata: ${team}`);
      } else {
        seen.add(key);
        teams.push({ name: team, confed: confed.key });
      }
    });
  });

  if (teams.length !== 48) {
    errors.push(`Totale squadre non valido: ${teams.length}/48.`);
  }

  return { teams, errors };
}

function showMessage(text, isError = false) {
  validationMessage.className = `message ${isError ? "error" : "ok"}`;
  validationMessage.textContent = text;
}

function renderRankingTable() {
  if (!state.teams.length) {
    rankingsTable.innerHTML = "";
    return;
  }

  const sorted = [...state.teams].sort((a, b) => a.name.localeCompare(b.name));

  const rows = sorted
    .map((team) => {
      const value = state.rankings.get(team.name) ?? 70;
      return `
        <tr>
          <td>${team.name}</td>
          <td>${team.confed}</td>
          <td><input type="number" min="1" max="100" data-team="${team.name}" value="${value}" /></td>
        </tr>
      `;
    })
    .join("");

  rankingsTable.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Nazionale</th><th>Confederazione</th><th>Power</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  rankingsTable.querySelectorAll("input[type='number']").forEach((input) => {
    input.addEventListener("change", (e) => {
      const team = e.target.dataset.team;
      const power = Math.max(1, Math.min(100, Number(e.target.value) || 1));
      e.target.value = String(power);
      state.rankings.set(team, power);
    });
  });
}

function validateSelection() {
  const { teams, errors } = collectTeams();

  if (errors.length) {
    state.teams = [];
    rankingsTable.innerHTML = "";
    showMessage(errors.join(" "), true);
    return false;
  }

  state.teams = teams;
  teams.forEach((team) => {
    if (!state.rankings.has(team.name)) {
      state.rankings.set(team.name, inferBasePower(team.confed, team.name));
    }
  });

  renderRankingTable();
  showMessage("Selezione valida: 48 squadre pronte.");
  return true;
}

function generateRankings() {
  if (!state.teams.length && !validateSelection()) {
    return;
  }

  state.rankings.clear();
  state.teams.forEach((team) => {
    state.rankings.set(team.name, inferBasePower(team.confed, team.name));
  });

  renderRankingTable();
  showMessage("Power ranking generato. Puoi modificarlo manualmente.");
}

function probabilityAWin(teamA, teamB) {
  const pa = state.rankings.get(teamA.name) ?? 70;
  const pb = state.rankings.get(teamB.name) ?? 70;
  const diff = pa - pb;
  const logistic = 1 / (1 + Math.exp(-diff / 9));
  return Math.max(0.12, Math.min(0.78, logistic));
}

function simulateMatch(teamA, teamB, { allowDraw = true } = {}) {
  const pAWin = probabilityAWin(teamA, teamB);
  const drawChance = allowDraw ? 0.24 : 0;
  const roll = Math.random();

  const strengthA = state.rankings.get(teamA.name) ?? 70;
  const strengthB = state.rankings.get(teamB.name) ?? 70;

  if (roll < pAWin - drawChance / 2) {
    const goalsA = randomInt(1, Math.max(1, Math.floor(strengthA / 24)) + 2);
    const goalsB = randomInt(0, Math.max(0, goalsA - 1));
    return { goalsA, goalsB, winner: teamA.name };
  }

  if (roll < pAWin + drawChance / 2 && allowDraw) {
    const goals = randomInt(0, 3);
    return { goalsA: goals, goalsB: goals, winner: null };
  }

  const goalsB = randomInt(1, Math.max(1, Math.floor(strengthB / 24)) + 2);
  const goalsA = randomInt(0, Math.max(0, goalsB - 1));
  return { goalsA, goalsB, winner: teamB.name };
}

function confedLimitForGroup(confed) {
  return confed === "UEFA" ? 2 : 1;
}

function canEnterGroup(team, group) {
  const count = group.teams.filter((t) => t.confed === team.confed).length;
  return count < confedLimitForGroup(team.confed);
}

function backtrackingPlace(potTeams, groups, idx = 0) {
  if (idx >= potTeams.length) return true;

  const team = potTeams[idx];
  const candidateOrder = groups
    .map((g, i) => ({ i, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map((v) => v.i);

  for (const groupIndex of candidateOrder) {
    const group = groups[groupIndex];
    if (group.teams.length >= 4) continue;
    if (!canEnterGroup(team, group)) continue;

    group.teams.push(team);
    if (backtrackingPlace(potTeams, groups, idx + 1)) return true;
    group.teams.pop();
  }

  return false;
}

function createGroups(teams) {
  const sorted = [...teams].sort((a, b) => (state.rankings.get(b.name) ?? 70) - (state.rankings.get(a.name) ?? 70));
  const pots = [sorted.slice(0, 12), sorted.slice(12, 24), sorted.slice(24, 36), sorted.slice(36, 48)];

  const groups = Array.from({ length: 12 }, (_, i) => ({
    name: `Gruppo ${String.fromCharCode(65 + i)}`,
    teams: [],
  }));

  // Hosts in groups A, B, C (style FIFA drawing exposure for hosts)
  const hosts = HOSTS_2026
    .map((h) => teams.find((t) => normalizeName(t.name) === normalizeName(h)))
    .filter(Boolean);

  hosts.forEach((host, i) => {
    groups[i].teams.push(host);
  });

  for (let p = 0; p < pots.length; p++) {
    const potTeams = pots[p]
      .filter((t) => !hosts.some((h) => h.name === t.name))
      .sort(() => Math.random() - 0.5);

    const ok = backtrackingPlace(potTeams, groups);
    if (!ok) {
      // fallback soft: random fill if constraints impossible
      const leftovers = [...potTeams];
      groups.forEach((group) => {
        while (group.teams.length < Math.min(4, p + 1) && leftovers.length) {
          group.teams.push(leftovers.pop());
        }
      });
    }
  }

  return groups;
}

function initStandingRow(team) {
  return {
    team,
    pts: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    wins: 0,
    fairPlay: randomInt(-10, 0),
  };
}

function applyGroupTieBreakers(rows) {
  return [...rows].sort(
    (x, y) =>
      y.pts - x.pts ||
      y.gd - x.gd ||
      y.gf - x.gf ||
      y.wins - x.wins ||
      y.fairPlay - x.fairPlay ||
      x.team.name.localeCompare(y.team.name)
  );
}

function simulateGroup(group) {
  const table = new Map(group.teams.map((t) => [t.name, initStandingRow(t)]));

  for (let i = 0; i < group.teams.length; i++) {
    for (let j = i + 1; j < group.teams.length; j++) {
      const a = group.teams[i];
      const b = group.teams[j];
      const match = simulateMatch(a, b, { allowDraw: true });

      const rowA = table.get(a.name);
      const rowB = table.get(b.name);

      rowA.gf += match.goalsA;
      rowA.ga += match.goalsB;
      rowB.gf += match.goalsB;
      rowB.ga += match.goalsA;

      if (match.goalsA > match.goalsB) {
        rowA.pts += 3;
        rowA.wins += 1;
      } else if (match.goalsB > match.goalsA) {
        rowB.pts += 3;
        rowB.wins += 1;
      } else {
        rowA.pts += 1;
        rowB.pts += 1;
      }
    }
  }

  const standings = applyGroupTieBreakers(
    [...table.values()].map((row) => ({ ...row, gd: row.gf - row.ga }))
  );

  return { group, standings };
}

function simulateKnockoutMatch(teamA, teamB) {
  const regular = simulateMatch(teamA, teamB, { allowDraw: true });
  if (regular.goalsA !== regular.goalsB) return { ...regular, penalties: false };

  const extraA = randomInt(0, 1);
  const extraB = randomInt(0, 1);
  const finalA = regular.goalsA + extraA;
  const finalB = regular.goalsB + extraB;

  if (finalA !== finalB) {
    return {
      goalsA: finalA,
      goalsB: finalB,
      winner: finalA > finalB ? teamA.name : teamB.name,
      penalties: false,
      extraTime: true,
    };
  }

  const penWinner = Math.random() < 0.5 ? teamA : teamB;
  return {
    goalsA: finalA,
    goalsB: finalB,
    winner: penWinner.name,
    penalties: true,
    extraTime: true,
  };
}

function simulateKnockoutBracket(roundOf32Teams) {
  let teams = [...roundOf32Teams];
  const rounds = [];
  const labels = ["Sedicesimi", "Ottavi", "Quarti", "Semifinali", "Finale"];
  let roundIndex = 0;

  while (teams.length > 1) {
    const matches = [];
    const winners = [];

    for (let i = 0; i < teams.length; i += 2) {
      const a = teams[i];
      const b = teams[i + 1];
      const match = simulateKnockoutMatch(a, b);

      winners.push(teams.find((t) => t.name === match.winner));
      matches.push({ a, b, ...match });
    }

    rounds.push({ label: labels[roundIndex] || `Round ${roundIndex + 1}`, matches });
    teams = winners;
    roundIndex += 1;
  }

  return { rounds, champion: teams[0] };
}

function simulateTournament() {
  if (!validateSelection()) return;

  rankingsTable.querySelectorAll("input[type='number']").forEach((input) => {
    const team = input.dataset.team;
    const value = Math.max(1, Math.min(100, Number(input.value) || 1));
    state.rankings.set(team, value);
  });

  const groups = createGroups(state.teams);
  const simulatedGroups = groups.map(simulateGroup);

  const top2 = [];
  const thirds = [];

  simulatedGroups.forEach((g) => {
    top2.push(g.standings[0].team, g.standings[1].team);
    thirds.push(g.standings[2]);
  });

  const bestThirds = applyGroupTieBreakers(thirds).slice(0, 8).map((row) => row.team);
  const roundOf32 = [...top2, ...bestThirds].sort(() => Math.random() - 0.5);
  const knockout = simulateKnockoutBracket(roundOf32);

  renderResults(simulatedGroups, bestThirds, knockout);
}

function renderResults(groupResults, bestThirds, knockout) {
  const groupsHtml = groupResults
    .map(({ group, standings }) => {
      const rows = standings
        .map(
          (r, idx) =>
            `<tr><td>${idx + 1}</td><td>${r.team.name}</td><td>${r.pts}</td><td>${r.gf}</td><td>${r.ga}</td><td>${r.gd}</td><td>${r.fairPlay}</td></tr>`
        )
        .join("");
      return `
      <div class="group-card">
        <h3>${group.name}</h3>
        <table>
          <thead><tr><th>#</th><th>Team</th><th>Pt</th><th>GF</th><th>GA</th><th>GD</th><th>FP</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    })
    .join("");

  const bestThirdsHtml = bestThirds.map((t) => `<li>${t.name}</li>`).join("");

  const knockoutHtml = knockout.rounds
    .map((round) => {
      const items = round.matches
        .map((m) => {
          const et = m.extraTime ? " dts" : "";
          const pen = m.penalties ? " dcr" : "";
          return `<li>${m.a.name} ${m.goalsA}-${m.goalsB} ${m.b.name} → <strong>${m.winner}</strong>${et}${pen}</li>`;
        })
        .join("");

      return `<h3>${round.label}</h3><ul class="knockout-list">${items}</ul>`;
    })
    .join("");

  results.innerHTML = `
    <h3>🏆 Campione: ${knockout.champion.name}</h3>
    <h3>Fase a gironi (12 gruppi)</h3>
    <div class="group-grid">${groupsHtml}</div>
    <h3>Migliori terze qualificate (8)</h3>
    <ul>${bestThirdsHtml}</ul>
    <h3>Fase a eliminazione diretta</h3>
    ${knockoutHtml}
  `;
}

function autoFill() {
  confederations.forEach((confed) => {
    const textarea = document.getElementById(`input-${confed.key}`);
    const suggested = confed.suggestions.filter((name, idx, arr) => arr.indexOf(name) === idx);
    textarea.value = suggested.join("\n");
  });
  showMessage("Auto-compilazione effettuata. Premi 'Valida selezione'.");
}

buildSlotsUI();
autoFill();

document.getElementById("autoFillBtn").addEventListener("click", autoFill);
document.getElementById("validateBtn").addEventListener("click", validateSelection);
document.getElementById("generateRankingsBtn").addEventListener("click", generateRankings);
document.getElementById("simulateBtn").addEventListener("click", simulateTournament);
