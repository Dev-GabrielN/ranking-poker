let TORNEIOS = [];
let PROXIMO_TORNEIO = null;

const medals = ["🏆", "🥈", "🥉"];
const pontosPorPosicao = [10, 7, 5];
let pointsChart = null;

async function carregarDados() {
  const response = await fetch("./torneios.json");

  if (!response.ok) {
    throw new Error(`Não foi possível carregar torneios.json: ${response.status}`);
  }

  const dados = await response.json();

  if (!dados || !Array.isArray(dados.torneios)) {
    throw new Error('JSON inválido: propriedade "torneios" ausente.');
  }

  return {
    proximoTorneio: dados.proximoTorneio || null,
    torneios: dados.torneios.sort((a, b) => b.numero - a.numero)
  };
}

function formatDate(dateString) {
  if (!dateString) return "";

  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function pontosDaColocacao(index) {
  return pontosPorPosicao[index] ?? 3;
}

function createPlayerStats() {
  const players = new Map();

  TORNEIOS.forEach((torneio) => {
    torneio.colocacoes.forEach((nome, index) => {
      if (!players.has(nome)) {
        players.set(nome, {
          nome,
          pontos: 0,
          ouros: 0,
          pratas: 0,
          bronzes: 0,
          participacoes: 0
        });
      }

      const jogador = players.get(nome);
      jogador.pontos += pontosDaColocacao(index);
      jogador.participacoes += 1;

      if (index === 0) jogador.ouros += 1;
      if (index === 1) jogador.pratas += 1;
      if (index === 2) jogador.bronzes += 1;
    });
  });

  return Array.from(players.values()).sort((a, b) =>
    b.pontos - a.pontos ||
    b.ouros - a.ouros ||
    b.pratas - a.pratas ||
    b.bronzes - a.bronzes ||
    b.participacoes - a.participacoes ||
    a.nome.localeCompare(b.nome, "pt-BR")
  );
}

function renderNextEvent() {
  const el = document.getElementById("nextEvent");

  if (!PROXIMO_TORNEIO) {
    el.innerHTML = "";
    return;
  }

  const e = PROXIMO_TORNEIO;
  const regras = [...e.premiacao, ...e.estrutura]
    .map((regra) => `<li>${regra}</li>`)
    .join("");

  const maos = e.rankingMaos
    .map((mao, index) => `<span>${index + 1}. ${mao}</span>`)
    .join("");

  el.innerHTML = `
    <article class="next-event-card">
      <div>
        <span class="event-status">${e.status}</span>
        <p class="section-label">Joguinho de Poker ♠️</p>
        <h2 class="event-title">${e.numero}º Torneio de Poker</h2>
        <p class="event-lead">
          Previsão para o sábado da terceira semana de junho. A data e o local ainda precisam ser confirmados.
        </p>

        <div class="event-meta">
          <div class="event-meta-item">
            <span>Data prevista</span>
            <strong>${formatDate(e.dataPrevista)}</strong>
          </div>
          <div class="event-meta-item">
            <span>Horário previsto</span>
            <strong>${e.horarioPrevisto} · Chegada ${e.chegadaRecomendada}</strong>
          </div>
          <div class="event-meta-item">
            <span>Modalidade</span>
            <strong>${e.modalidade}</strong>
          </div>
          <div class="event-meta-item">
            <span>Local previsto</span>
            <strong>${e.localPrevisto}</strong>
          </div>
          <div class="event-meta-item">
            <span>Buy-in</span>
            <strong>${e.buyIn}</strong>
          </div>
          <div class="event-meta-item">
            <span>Stack / entrada tardia</span>
            <strong>${e.stackInicial}<br>${e.entradaTardia}</strong>
          </div>
        </div>
      </div>

      <aside class="rules-card">
        <p class="section-label">Regras da mesa</p>
        <h4>Texas Hold’em No Limit</h4>
        <ul class="rules-list">${regras}</ul>

        <div class="hand-ranking">
          <p class="hand-ranking-title">Ranking das mãos · referência PokerStars</p>
          <div class="hands-pills">${maos}</div>
          <a class="official-link" href="${e.referencia.url}" target="_blank" rel="noopener noreferrer">
            ${e.referencia.titulo} ↗
          </a>
        </div>
      </aside>
    </article>
  `;
}

function renderLastWinner() {
  const latest = TORNEIOS[0];
  const card = document.getElementById("lastWinnerCard");

  if (!latest) {
    card.innerHTML = "<p>Nenhum torneio cadastrado.</p>";
    return;
  }

  card.innerHTML = `
    <div class="crown">🏆</div>
    <h3>Último campeão</h3>
    <p class="winner-name">${latest.colocacoes[0]}</p>
    <p class="tournament-number">${latest.numero}º Torneio de Poker · ${formatDate(latest.data)}</p>
  `;
}

function renderStats(players) {
  const lider = players[0];
  const maisOuros = Math.max(...players.map((player) => player.ouros), 0);
  const campeoes = players
    .filter((player) => player.ouros === maisOuros && maisOuros > 0)
    .map((player) => player.nome)
    .join(" / ");

  document.getElementById("stats").innerHTML = `
    <article class="stat-card">
      <p>Torneios realizados</p>
      <strong>${TORNEIOS.length}</strong>
    </article>
    <article class="stat-card">
      <p>Jogadores</p>
      <strong>${players.length}</strong>
    </article>
    <article class="stat-card">
      <p>Líder em pontos</p>
      <strong>${lider ? lider.pontos : 0}</strong>
    </article>
    <article class="stat-card highlight">
      <p>Mais ouros</p>
      <strong>${campeoes || "-"}</strong>
    </article>
  `;
}

function renderRanking(players) {
  const body = document.getElementById("rankingBody");

  body.innerHTML = players.map((player, index) => `
    <tr>
      <td class="position">${index + 1}º</td>
      <td class="player">${player.nome}</td>
      <td class="points-value">${player.pontos}</td>
      <td class="medal-value">${player.ouros}</td>
      <td class="medal-value">${player.pratas}</td>
      <td class="medal-value">${player.bronzes}</td>
      <td>${player.participacoes}</td>
    </tr>
  `).join("");
}

function renderPointsChart(players) {
  const context = document.getElementById("winsChart");

  if (pointsChart) pointsChart.destroy();

  pointsChart = new Chart(context, {
    type: "bar",
    data: {
      labels: players.map((player) => player.nome.split(" ")[0]),
      datasets: [
        {
          label: "Pontos",
          data: players.map((player) => player.pontos),
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
            stepSize: 5,
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

  grid.innerHTML = filtered.map((torneio) => `
    <article class="tournament-card">
      <header class="tournament-card-header">
        <div>
          <h4>✨ ${torneio.numero}º Torneio</h4>
          <span class="players-count">${formatDate(torneio.data)}</span>
        </div>
        <span class="players-count">${torneio.colocacoes.length} jogadores</span>
      </header>
      <div class="podium">
        ${torneio.colocacoes.map((nome, index) => `
          <div class="result-line ${index < 3 ? `top-${index + 1}` : ""}">
            <span class="name">${index < 3 ? medals[index] : "🎖️"} ${nome}</span>
            <span class="place">${index + 1}º · ${pontosDaColocacao(index)} pts</span>
          </div>
        `).join("")}
      </div>
    </article>
  `).join("");
}

function renderUpdatedAt() {
  const latest = TORNEIOS[0];
  const updatedAt = document.getElementById("updatedAt");

  updatedAt.textContent = latest
    ? `Último jogo: ${latest.numero}º Torneio · ${formatDate(latest.data)}`
    : "Nenhum jogo registrado";
}

function renderError(error) {
  console.error(error);

  document.getElementById("nextEvent").innerHTML = `
    <p class="empty">Não foi possível carregar as informações do próximo torneio.</p>
  `;

  document.getElementById("lastWinnerCard").innerHTML = `
    <h3>Erro ao carregar resultados</h3>
    <p class="description">Confira o arquivo <strong>torneios.json</strong>.</p>
  `;

  document.getElementById("tournamentsGrid").innerHTML = `
    <p class="empty">Não foi possível carregar o histórico.</p>
  `;
}

async function initialize() {
  try {
    const dados = await carregarDados();

    PROXIMO_TORNEIO = dados.proximoTorneio;
    TORNEIOS = dados.torneios;

    const players = createPlayerStats();

    renderNextEvent();
    renderUpdatedAt();
    renderLastWinner();
    renderStats(players);
    renderRanking(players);
    renderPointsChart(players);
    renderTournamentOptions();
    renderTournaments();
  } catch (error) {
    renderError(error);
  }
}

document.addEventListener("DOMContentLoaded", initialize);
