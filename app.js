let TORNEIOS = [];
let PROXIMO_TORNEIO = null;
const medals = ["🏆", "🥈", "🥉"];
let winsChart = null;

async function carregarDados() {
  const response = await fetch("./torneios.json");
  if (!response.ok) throw new Error(`Não foi possível carregar torneios.json: ${response.status}`);
  const dados = await response.json();
  if (!dados || !Array.isArray(dados.torneios)) throw new Error('JSON inválido: propriedade "torneios" ausente.');
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
function createPlayerStats() {
  const players = new Map();
  TORNEIOS.forEach(t => t.colocacoes.forEach((nome, index) => {
    if (!players.has(nome)) players.set(nome, { nome, vitorias: 0, podios: 0, participacoes: 0, melhorColocacao: Infinity });
    const p = players.get(nome);
    p.participacoes++;
    p.melhorColocacao = Math.min(p.melhorColocacao, index + 1);
    if (index === 0) p.vitorias++;
    if (index <= 2) p.podios++;
  }));
  return [...players.values()].sort((a,b) => b.vitorias-a.vitorias || b.podios-a.podios || a.melhorColocacao-b.melhorColocacao || b.participacoes-a.participacoes || a.nome.localeCompare(b.nome, "pt-BR"));
}
function renderNextEvent() {
  const el = document.getElementById("nextEvent");
  if (!PROXIMO_TORNEIO) { el.innerHTML = ""; return; }
  const e = PROXIMO_TORNEIO;
  const regras = [...e.premiacao, ...e.estrutura].map(regra => `<li>${regra}</li>`).join("");
  const maos = e.rankingMaos.map((mao, i) => `<span>${i+1}. ${mao}</span>`).join("");
  el.innerHTML = `
    <article class="next-event-card">
      <div>
        <span class="event-status">${e.status}</span>
        <p class="section-label">Joguinho de Poker ♠️</p>
        <h2 class="event-title">${e.numero}º Torneio de Poker</h2>
        <p class="event-lead">Previsão para o sábado da terceira semana de junho. A data e o local ainda precisam ser confirmados.</p>
        <div class="event-meta">
          <div class="event-meta-item"><span>Data prevista</span><strong>${formatDate(e.dataPrevista)}</strong></div>
          <div class="event-meta-item"><span>Horário previsto</span><strong>${e.horarioPrevisto} · Chegada ${e.chegadaRecomendada}</strong></div>
          <div class="event-meta-item"><span>Modalidade</span><strong>${e.modalidade}</strong></div>
          <div class="event-meta-item"><span>Local previsto</span><strong>${e.localPrevisto}</strong></div>
          <div class="event-meta-item"><span>Buy-in</span><strong>${e.buyIn}</strong></div>
          <div class="event-meta-item"><span>Stack / entrada tardia</span><strong>${e.stackInicial}<br>${e.entradaTardia}</strong></div>
        </div>
      </div>
      <aside class="rules-card">
        <p class="section-label">Regras da mesa</p>
        <h4>Texas Hold’em No Limit</h4>
        <ul class="rules-list">${regras}</ul>
        <div class="hand-ranking">
          <p class="hand-ranking-title">Ranking das mãos · referência PokerStars</p>
          <div class="hands-pills">${maos}</div>
          <a class="official-link" href="${e.referencia.url}" target="_blank" rel="noopener noreferrer">${e.referencia.titulo} ↗</a>
        </div>
      </aside>
    </article>`;
}
function renderLastWinner() {
  const t = TORNEIOS[0], card = document.getElementById("lastWinnerCard");
  if (!t) { card.innerHTML = "<p>Nenhum torneio cadastrado.</p>"; return; }
  card.innerHTML = `<div class="crown">🏆</div><h3>Último campeão</h3><p class="winner-name">${t.colocacoes[0]}</p><p class="tournament-number">${t.numero}º Torneio de Poker · ${formatDate(t.data)}</p>`;
}
function renderStats(players) {
  const topWins = players[0]?.vitorias || 0;
  const leaders = players.filter(p => p.vitorias === topWins && topWins > 0).map(p => p.nome).join(" / ");
  document.getElementById("stats").innerHTML = `
    <article class="stat-card"><p>Torneios realizados</p><strong>${TORNEIOS.length}</strong></article>
    <article class="stat-card"><p>Jogadores</p><strong>${players.length}</strong></article>
    <article class="stat-card"><p>Vitórias líderes</p><strong>${topWins}</strong></article>
    <article class="stat-card highlight"><p>Maior campeão</p><strong>${leaders || "-"}</strong></article>`;
}
function renderRanking(players) {
  document.getElementById("rankingBody").innerHTML = players.map((p, i) => `<tr><td class="position">${i+1}º</td><td class="player">${p.nome}</td><td class="gold-value">${p.vitorias}</td><td>${p.podios}</td><td>${p.participacoes}</td></tr>`).join("");
}
function renderWinsChart(players) {
  if (winsChart) winsChart.destroy();
  winsChart = new Chart(document.getElementById("winsChart"), {
    type: "bar",
    data: { labels: players.map(p => p.nome.split(" ")[0]), datasets: [{ label: "Vitórias", data: players.map(p => p.vitorias), backgroundColor: "rgba(226, 184, 93, 0.75)", borderColor: "#e2b85d", borderWidth: 1, borderRadius: 8, maxBarThickness: 40 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: "#102d24", titleColor: "#f7f3eb", bodyColor: "#f4d58d", padding: 12 } }, scales: { x: { grid: { display: false }, ticks: { color: "#a6b6ad" } }, y: { beginAtZero: true, ticks: { color: "#a6b6ad", stepSize: 1, precision: 0 }, grid: { color: "rgba(255, 255, 255, 0.06)" } } } }
  });
}
function renderTournamentOptions() {
  const f = document.getElementById("tournamentFilter");
  f.innerHTML = `<option value="all">Todos os torneios</option>${TORNEIOS.map(t => `<option value="${t.numero}">${t.numero}º Torneio</option>`).join("")}`;
  f.addEventListener("change", () => renderTournaments(f.value));
}
function renderTournaments(selected = "all") {
  const filtered = selected === "all" ? TORNEIOS : TORNEIOS.filter(t => t.numero === Number(selected));
  document.getElementById("tournamentsGrid").innerHTML = filtered.map(t => `
    <article class="tournament-card">
      <header class="tournament-card-header"><div><h4>✨ ${t.numero}º Torneio</h4><span class="players-count">${formatDate(t.data)}</span></div><span class="players-count">${t.colocacoes.length} jogadores</span></header>
      <div class="podium">${t.colocacoes.map((nome, i) => `<div class="result-line ${i < 3 ? `top-${i+1}` : ""}"><span class="name">${i < 3 ? medals[i] : "🎖️"} ${nome}</span><span class="place">${i+1}º</span></div>`).join("")}</div>
    </article>`).join("");
}
function renderUpdatedAt() {
  const t = TORNEIOS[0];
  document.getElementById("updatedAt").textContent = t ? `Até o ${t.numero}º torneio · ${formatDate(t.data)}` : "Sem resultados";
}
function renderError(error) {
  console.error(error);
  document.getElementById("nextEvent").innerHTML = `<p class="empty">Não foi possível carregar as informações do próximo torneio.</p>`;
  document.getElementById("lastWinnerCard").innerHTML = `<h3>Erro ao carregar resultados</h3><p class="description">Confira o arquivo <strong>torneios.json</strong>.</p>`;
  document.getElementById("tournamentsGrid").innerHTML = `<p class="empty">Não foi possível carregar o histórico.</p>`;
}
async function initialize() {
  try {
    const dados = await carregarDados();
    PROXIMO_TORNEIO = dados.proximoTorneio;
    TORNEIOS = dados.torneios;
    const players = createPlayerStats();
    renderNextEvent(); renderUpdatedAt(); renderLastWinner(); renderStats(players); renderRanking(players); renderWinsChart(players); renderTournamentOptions(); renderTournaments();
  } catch (error) { renderError(error); }
}
document.addEventListener("DOMContentLoaded", initialize);
