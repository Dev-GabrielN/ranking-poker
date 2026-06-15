let TORNEIOS = [];
let PROXIMO_TORNEIO = null;
let POKER_CHIP_SETUP = null;

const medals = ["🏆", "🥈", "🥉"];
const pontosPorPosicao = [10, 7, 5];
let pointsChart = null;
let pokerSetupExpanded = false;
let selectedPokerPlayers = null;

async function carregarDados() {
  const [torneiosResponse, pokerSetupResponse] = await Promise.all([
    fetch("./torneios.json"),
    fetch("./poker-chip-setup.json")
  ]);

  if (!torneiosResponse.ok) {
    throw new Error(`Não foi possível carregar torneios.json: ${torneiosResponse.status}`);
  }

  if (!pokerSetupResponse.ok) {
    throw new Error(`Não foi possível carregar poker-chip-setup.json: ${pokerSetupResponse.status}`);
  }

  const [dados, pokerSetupDados] = await Promise.all([
    torneiosResponse.json(),
    pokerSetupResponse.json()
  ]);

  if (!dados || !Array.isArray(dados.torneios)) {
    throw new Error('JSON inválido: propriedade "torneios" ausente.');
  }

  if (!pokerSetupDados || !pokerSetupDados.pokerChipSetup) {
    throw new Error('JSON inválido: propriedade "pokerChipSetup" ausente.');
  }

  return {
    proximoTorneio: dados.proximoTorneio || null,
    torneios: dados.torneios.sort((a, b) => b.numero - a.numero),
    pokerChipSetup: pokerSetupDados.pokerChipSetup
  };
}

function formatDate(dateString) {
  if (!dateString) return "";

  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatMinutes(value) {
  return `${value} min`;
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

function renderPokerBlindRows(levels) {
  return levels.map((item) => {
    if (item.type === "break") {
      return `
        <tr class="blind-break">
          <td colspan="4">
            <strong>${item.label.replace(" / Color-up", "")}</strong>
            <span>${item.description}</span>
          </td>
        </tr>
      `;
    }

    return `
      <tr>
        <td>${item.level}${item.optional ? " (opcional)" : ""}</td>
        <td>${formatNumber(item.smallBlind)}</td>
        <td>${formatNumber(item.bigBlind)}</td>
        <td>${formatMinutes(item.durationMinutes)}</td>
      </tr>
    `;
  }).join("");
}

function bindPokerSetupEvents() {
  const toggle = document.getElementById("pokerSetupToggle");

  if (toggle) {
    toggle.addEventListener("click", () => {
      pokerSetupExpanded = !pokerSetupExpanded;
      renderPokerChipSetup();
    });
  }

  document.querySelectorAll("[data-poker-players]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedPokerPlayers = Number(button.dataset.pokerPlayers);
      renderPokerChipSetup();
    });
  });
}

function renderPokerChipSetup() {
  const setupEl = document.getElementById("pokerSetup");

  if (!setupEl || !POKER_CHIP_SETUP) return;

  const distributions = POKER_CHIP_SETUP.distributions || [];
  const selectedDistribution = distributions.find((item) => item.players === selectedPokerPlayers)
    || distributions[0];

  if (!selectedDistribution) {
    setupEl.innerHTML = "";
    return;
  }

  selectedPokerPlayers = selectedDistribution.players;

  const chipsById = new Map((POKER_CHIP_SETUP.chips || []).map((chip) => [chip.id, chip]));
  const playerOptions = distributions.map((distribution) => `
    <button
      class="player-tab ${distribution.players === selectedDistribution.players ? "active" : ""}"
      type="button"
      data-poker-players="${distribution.players}"
      aria-pressed="${distribution.players === selectedDistribution.players}"
    >
      ${distribution.players} jogadores
    </button>
  `).join("");

  const chipRows = selectedDistribution.chipsPerPlayer.map((item) => {
    const chip = chipsById.get(item.chipId) || {
      id: item.chipId,
      colorName: item.chipId,
      value: 0
    };

    return `
      <tr>
        <td>
          <span class="chip-color-label">
            <span class="chip-swatch chip-${chip.id}"></span>
            ${chip.colorName}
          </span>
        </td>
        <td>${formatNumber(chip.value)}</td>
        <td>${formatNumber(item.quantity)}</td>
        <td>${formatNumber(item.used)}</td>
        <td>${formatNumber(item.remaining)}</td>
        <td>${formatNumber(item.valuePerPlayer)}</td>
      </tr>
    `;
  }).join("");

  const blindStructure = POKER_CHIP_SETUP.blindStructure;
  const blindNotes = blindStructure.notes
    .map((note) => `<li>${note}</li>`)
    .join("");

  setupEl.innerHTML = `
    <article class="poker-setup-panel">
      <button
        class="setup-toggle"
        id="pokerSetupToggle"
        type="button"
        aria-expanded="${pokerSetupExpanded}"
        aria-controls="pokerSetupContent"
      >
        <span>
          <span class="section-label">Consulta rápida</span>
          <strong>${POKER_CHIP_SETUP.title}</strong>
          <small>${POKER_CHIP_SETUP.targetDuration} · maleta organizada por jogadores</small>
        </span>
        <span class="setup-toggle-icon" aria-hidden="true">${pokerSetupExpanded ? "−" : "+"}</span>
      </button>

      <div class="setup-content" id="pokerSetupContent" ${pokerSetupExpanded ? "" : "hidden"}>
        <p class="setup-description">${POKER_CHIP_SETUP.description}</p>

        <div class="player-tabs" aria-label="Selecionar quantidade de jogadores">
          ${playerOptions}
        </div>

        <div class="setup-metrics">
          <div>
            <span>Quantidade</span>
            <strong>${selectedDistribution.players} jogadores</strong>
          </div>
          <div>
            <span>Stack por jogador</span>
            <strong>${formatNumber(selectedDistribution.stackPerPlayer)}</strong>
          </div>
          <div>
            <span>Total em jogo</span>
            <strong>${formatNumber(selectedDistribution.totalInPlay)}</strong>
          </div>
        </div>

        <p class="green-chip-note">${POKER_CHIP_SETUP.greenChipNote}</p>

        <div class="setup-block">
          <div class="setup-block-title">
            <h4>Distribuição por jogador</h4>
            <span>Fichas usadas e sobras da maleta</span>
          </div>
          <div class="table-wrapper">
            <table class="setup-table chip-distribution-table">
              <thead>
                <tr>
                  <th>Cor</th>
                  <th>Valor</th>
                  <th>Por jogador</th>
                  <th>Usado</th>
                  <th>Sobra</th>
                  <th>Valor/jogador</th>
                </tr>
              </thead>
              <tbody>${chipRows}</tbody>
            </table>
          </div>
        </div>

        <div class="setup-block">
          <div class="setup-block-title">
            <h4>Estrutura de blinds</h4>
            <span>Níveis de ${formatMinutes(blindStructure.defaultLevelDurationMinutes)} · break de ${formatMinutes(blindStructure.breakDurationMinutes)}</span>
          </div>
          <div class="table-wrapper">
            <table class="setup-table blind-table">
              <thead>
                <tr>
                  <th>Nível</th>
                  <th>SB</th>
                  <th>BB</th>
                  <th>Tempo</th>
                </tr>
              </thead>
              <tbody>${renderPokerBlindRows(blindStructure.levels)}</tbody>
            </table>
          </div>
          <ul class="setup-notes">${blindNotes}</ul>
        </div>
      </div>
    </article>
  `;

  bindPokerSetupEvents();
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

  document.getElementById("pokerSetup").innerHTML = `
    <p class="empty">Não foi possível carregar a distribuição de fichas e blinds.</p>
  `;
}

async function initialize() {
  try {
    const dados = await carregarDados();

    PROXIMO_TORNEIO = dados.proximoTorneio;
    TORNEIOS = dados.torneios;
    POKER_CHIP_SETUP = dados.pokerChipSetup;

    const players = createPlayerStats();

    renderNextEvent();
    renderUpdatedAt();
    renderLastWinner();
    renderStats(players);
    renderRanking(players);
    renderPointsChart(players);
    renderTournamentOptions();
    renderTournaments();
    renderPokerChipSetup();
  } catch (error) {
    renderError(error);
  }
}

document.addEventListener("DOMContentLoaded", initialize);
