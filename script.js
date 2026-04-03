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
    suggestions: ["Stati Uniti", "Messico", "Canada", "Costa Rica", "Giamaica", "Panama"],
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

function buildSlotsUI() {
  slotsContainer.innerHTML = "";
  confederations.forEach((confed) => {
    const wrapper = document.createElement("div");
    wrapper.className = "confed";
    wrapper.innerHTML = `
      <h3>${confed.name}</h3>
      <p>Slot disponibili: <strong>${confed.slots}</strong></p>
      <textarea id="input-${confed.key}" placeholder="Inserisci una nazionale per riga"></textarea>
    `;
    slotsContainer.appendChild(wrapper);
  });
}

function normalizeLines(value) {
  return value
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
}

function collectTeams() {
  const teams = [];
  const errors = [];
  const seen = new Set();

  confederations.forEach((confed) => {
    const textarea = document.getElementById(`input-${confed.key}`);
    const lines = normalizeLines(textarea.value);

    if (lines.length !== confed.slots) {
      errors.push(`${confed.name}: hai inserito ${lines.length}/${confed.slots} squadre.`);
    }

    lines.forEach((team) => {
      const key = team.toLowerCase();
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

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function inferBasePower(confed) {
  switch (confed) {
    case "UEFA":
      return randomInt(72, 93);
    case "CONMEBOL":
      return randomInt(74, 94);
    case "CONCACAF":
      return randomInt(62, 86);
    case "CAF":
      return randomInt(64, 88);
    case "AFC":
      return randomInt(60, 85);
    case "OFC":
      return randomInt(55, 74);
    case "PLAYOFF":
      return randomInt(58, 82);
    default:
      return randomInt(60, 80);
  }
}

function generateRankings() {
  if (!state.teams.length) {
    showMessage("Valida prima le squadre.", true);
    return;
  }

  state.rankings.clear();
  state.teams.forEach((team) => {
    state.rankings.set(team.name, inferBasePower(team.confed));
  });

  renderRankingTable();
  showMessage("Power ranking generato. Puoi modificarlo manualmente.");
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

function showMessage(text, isError = false) {
  validationMessage.className = `message ${isError ? "error" : "ok"}`;
  validationMessage.textContent = text;
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
      state.rankings.set(team.name, inferBasePower(team.confed));
    }
  });

  renderRankingTable();
  showMessage("Selezione valida: 48 squadre pronte.");
  return true;
}

function probabilityAWin(teamA, teamB) {
  const pa = state.rankings.get(teamA.name) ?? 70;
  const pb = state.rankings.get(teamB.name) ?? 70;
  const diff = pa - pb;
  const logistic = 1 / (1 + Math.exp(-diff / 8));
  return Math.max(0.15, Math.min(0.75, logistic));
}

function simulateMatch(teamA, teamB, allowDraw = true) {
  const pAWin = probabilityAWin(teamA, teamB);
  const drawChance = allowDraw ? 0.22 : 0;
  const roll = Math.random();

  const strengthA = state.rankings.get(teamA.name) ?? 70;
  const strengthB = state.rankings.get(teamB.name) ?? 70;

  if (roll < pAWin - drawChance / 2) {
    const goalsA = randomInt(1, Math.max(1, Math.floor(strengthA / 25)) + 2);
    const goalsB = randomInt(0, Math.max(0, goalsA - 1));
    return { goalsA, goalsB, winner: teamA.name };
  }

  if (roll < pAWin + drawChance / 2 && allowDraw) {
    const goals = randomInt(0, 2);
    return { goalsA: goals, goalsB: goals, winner: null };
  }

  const goalsB = randomInt(1, Math.max(1, Math.floor(strengthB / 25)) + 2);
  const goalsA = randomInt(0, Math.max(0, goalsB - 1));
  return { goalsA, goalsB, winner: teamB.name };
}

function createGroups(teams) {
  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  const groups = [];
  for (let i = 0; i < 12; i++) {
    groups.push({ name: `Gruppo ${String.fromCharCode(65 + i)}`, teams: shuffled.slice(i * 4, i * 4 + 4) });
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
  };
}

function simulateGroup(group) {
  const table = new Map(group.teams.map((t) => [t.name, initStandingRow(t)]));

  for (let i = 0; i < group.teams.length; i++) {
    for (let j = i + 1; j < group.teams.length; j++) {
      const a = group.teams[i];
      const b = group.teams[j];
      const match = simulateMatch(a, b, true);

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

  const standings = [...table.values()]
    .map((row) => ({ ...row, gd: row.gf - row.ga }))
    .sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || y.wins - x.wins || x.team.name.localeCompare(y.team.name));

  return { group, standings };
}

function simulateKnockoutBracket(roundTeams) {
  let teams = [...roundTeams];
  const rounds = [];
  const labels = ["Sedicesimi", "Ottavi", "Quarti", "Semifinali", "Finale"];
  let roundIndex = 0;

  while (teams.length > 1) {
    const matches = [];
    const winners = [];
    for (let i = 0; i < teams.length; i += 2) {
      const a = teams[i];
      const b = teams[i + 1];
      let match = simulateMatch(a, b, false);

      if (match.goalsA === match.goalsB) {
        const penWinner = Math.random() < 0.5 ? a : b;
        match = { ...match, winner: penWinner.name, penalties: true };
      }

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

  // read potentially edited values
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

  const bestThirds = thirds
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || b.wins - a.wins)
    .slice(0, 8)
    .map((row) => row.team);

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
            `<tr><td>${idx + 1}</td><td>${r.team.name}</td><td>${r.pts}</td><td>${r.gf}</td><td>${r.ga}</td><td>${r.gd}</td></tr>`
        )
        .join("");
      return `
      <div class="group-card">
        <h3>${group.name}</h3>
        <table>
          <thead><tr><th>#</th><th>Team</th><th>Pt</th><th>GF</th><th>GA</th><th>GD</th></tr></thead>
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
          const pen = m.penalties ? " (dcr)" : "";
          return `<li>${m.a.name} ${m.goalsA}-${m.goalsB} ${m.b.name} → <strong>${m.winner}</strong>${pen}</li>`;
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
    textarea.value = confed.suggestions.join("\n");
  });
  showMessage("Auto-compilazione effettuata. Premi 'Valida selezione'.");
}

buildSlotsUI();

document.getElementById("autoFillBtn").addEventListener("click", autoFill);
document.getElementById("validateBtn").addEventListener("click", validateSelection);
document.getElementById("generateRankingsBtn").addEventListener("click", generateRankings);
document.getElementById("simulateBtn").addEventListener("click", simulateTournament);
