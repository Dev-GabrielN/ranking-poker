/*
  DADOS DO SITE
  Os resultados dos torneios ficam no arquivo separado: torneios.json.

  COMO ATUALIZAR:
  1. Abra o arquivo torneios.json.
  2. Adicione o próximo torneio no array.
  3. Faça commit no GitHub.
  O ranking, os pódios e o gráfico serão recalculados automaticamente.
*/

let TORNEIOS = [];
const medals = ["🏆", "🥈", "🥉"];
let winsChart = null;

async function carregarTorneios() {
  const response = await fetch("./torneios.json");

  if (!response.ok) {
    throw new Error(`Não foi possível carregar torneios.json: ${response.status}`);
  }

  const dados = await response.json();

  if (!Array.isArray(dados)) {
    throw new Error("O arquivo torneios.json precisa conter uma lista de torneios.");
  }

  return dados.sort((a, b) => b.numero - a.numero);
}

function createPlayerStats() {
  const players = new Map();

  TORNEIOS.forEach((torneio) => {
    torneio.colocacoes.forEach((nome, index) => {
      if (!players.has(nome)) {
        players.set(nome, {
          nome,
          vitorias: 0,
          podios: 0,
          participacoes: 0,
          melhorColocacao: Infinity
        });
      }

      const jogador = players.get(nome);
      jogador.participacoes += 1;
      jogador.melhorColocacao = Math.min(jogador.melhorColocacao, index + 1);

      if (index === 0) jogador.vitorias += 1;
      if (index <= 2) jogador.podios += 1;
    });
  });

  return Array.from(players.values()).sort((a, b) =>
    b.vitorias - a.vitorias ||
    b.podios - a.podios ||
    a.melhorColocacao - b.melhorColocacao ||
    b.participacoes - a.participacoes ||
    a.nome.localeCompare(b.nome, "pt-BR")
  );
}

function formatDate(dateString) {
  if (!dateString) return "";

  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function renderLastWinner() {
  const latest = TORNEIOS[0];
  const card = document.getElementById("lastWinnerCard");

  if (!latest) {
    card.innerHTML = "<p>Nenhum torneio cadastrado.</p>";
    return;
  }

  const data = latest.data ? ` · ${formatDate(latest.data)}` : "";

  card.innerHTML = `
    <div class="crown">🏆</div>
    <h3>Último campeão</h3>
    <p class="winner-name">${latest.colocacoes[0]}</p>
    <p class="tournament-number">${latest.numero}º Torneio de Poker${data}</p>
  `;
}

function renderStats(players) {
  const totalPlayers = players.length;
  const leader = players[0];
  const topWins = leader ? leader.vitorias : 0;
  const leaders = players
    .filter((player) => player.vitorias === topWins && topWins > 0)
    .map((player) => player.nome)
    .join(" / ");

  document.getElementById("stats").innerHTML = `
    <article class="stat-card">
      <p>Torneios</p>
      <strong>${TORNEIOS.length}</strong>
    </article>
    <article class="stat-card">
      <p>Jogadores</p>
      <strong>${totalPlayers}</strong>
    </article>
    <article class="stat-card">
      <p>Vitórias líderes</p>
      <strong>${topWins}</strong>
    </article>
    <article class="stat-card highlight">
      <p>Maior campeão</p>
      <strong>${leaders || "-"}</strong>
    </article>
  `;
}

function renderRanking(players) {
  const body = document.getElementById("rankingBody");

  body.innerHTML = players.map((player, index) => `
    <tr>
      <td class="position">${index + 1}º</td>
      <td class="player">${player.nome}</td>
      <td class="gold-value">${player.vitorias}</td>
      <td>${player.podios}</td>
      <td>${player.participacoes}</td>
    </tr>
  `).join("");
}

function renderWinsChart(players) {
  const context = document.getElementById("winsChart");

  if (winsChart) winsChart.destroy();

  winsChart = new Chart(context, {
    type: "bar",
    data: {
      labels: players.map((player) => player.nome.split(" ")[0]),
      datasets: [
        {
          label: "Vitórias",
          data: players.map((player) => player.vitorias),
          backgroundColor: "rgba(226, 184, 93, 0.75)",
          borderColor: "#e2b85d",
          borderWidth: 1,
          borderRadius: 8,
          maxBarThickness: 40
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#102d24",
          titleColor: "#f7f3eb",
          bodyColor: "#f4d58d",
          padding: 12
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#a6b6ad" }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#a6b6ad",
            stepSize: 1,
            precision: 0
          },
          grid: { color: "rgba(255, 255, 255, 0.06)" }
        }
      }
    }
  });
}

function renderTournamentOptions() {
  const filter = document.getElementById("tournamentFilter");

  filter.innerHTML = `
    <option value="all">Todos os torneios</option>
    ${TORNEIOS.map((torneio) => (
      `<option value="${torneio.numero}">${torneio.numero}º Torneio</option>`
    )).join("")}
  `;

  filter.addEventListener("change", () => renderTournaments(filter.value));
}

function renderTournaments(selected = "all") {
  const grid = document.getElementById("tournamentsGrid");
  const filtered = selected === "all"
    ? TORNEIOS
    : TORNEIOS.filter((torneio) => torneio.numero === Number(selected));

  if (!filtered.length) {
    grid.innerHTML = `<p class="empty">Nenhum torneio encontrado.</p>`;
    return;
  }

  grid.innerHTML = filtered.map((torneio) => {
    const data = torneio.data ? formatDate(torneio.data) : "";

    return `
      <article class="tournament-card">
        <header class="tournament-card-header">
          <div>
            <h4>✨ ${torneio.numero}º Torneio</h4>
            ${data ? `<span class="players-count">${data}</span>` : ""}
          </div>
          <span class="players-count">${torneio.colocacoes.length} jogadores</span>
        </header>
        <div class="podium">
          ${torneio.colocacoes.map((nome, index) => `
            <div class="result-line ${index < 3 ? `top-${index + 1}` : ""}">
              <span class="name">${index < 3 ? medals[index] : "🎖️"} ${nome}</span>
              <span class="place">${index + 1}º</span>
            </div>
          `).join("")}
        </div>
      </article>
    `;
  }).join("");
}

function renderUpdatedAt() {
  const latest = TORNEIOS[0];

  if (!latest) {
    document.getElementById("updatedAt").textContent = "Sem resultados";
    return;
  }

  const data = latest.data ? ` · ${formatDate(latest.data)}` : "";
  document.getElementById("updatedAt").textContent = `Até o ${latest.numero}º torneio${data}`;
}

function renderError(error) {
  console.error(error);

  document.getElementById("lastWinnerCard").innerHTML = `
    <h3>Erro ao carregar resultados</h3>
    <p class="description">Confira se o arquivo <strong>torneios.json</strong> está na mesma pasta do site.</p>
  `;

  document.getElementById("tournamentsGrid").innerHTML = `
    <p class="empty">Não foi possível carregar o histórico dos torneios.</p>
  `;
}

async function initialize() {
  try {
    TORNEIOS = await carregarTorneios();
    const players = createPlayerStats();

    renderUpdatedAt();
    renderLastWinner();
    renderStats(players);
    renderRanking(players);
    renderWinsChart(players);
    renderTournamentOptions();
    renderTournaments();
  } catch (error) {
    renderError(error);
  }
}

document.addEventListener("DOMContentLoaded", initialize);
