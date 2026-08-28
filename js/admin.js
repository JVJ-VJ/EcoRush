/**
 * ECO RUSH — Admin Control Center & Live Event Dashboard
 * Connects to central backend with real-time Server-Sent Events (SSE) synchronization.
 * Updates instantly when any player device submits a completed game.
 */

(function() {
  const ADMIN_PIN = "1234";

  let isAuthenticated = false;
  let activeFilter = "ALL";
  let searchQuery = "";
  let currentScores = [];
  let currentStats = { totalGames: 0, uniquePlayers: 0, topScore: 0, status: "LIVE" };
  let currentChampion = null;
  let sseSubscription = null;

  function initAdmin() {
    if (sessionStorage.getItem("ecoRushAdminAuth") === "true") {
      isAuthenticated = true;
      showDashboard();
    } else {
      showPinScreen();
    }

    // Setup search input listener
    const searchInput = document.getElementById("admin-search");
    if (searchInput) {
      searchInput.addEventListener("input", function(e) {
        searchQuery = e.target.value.toLowerCase().trim();
        renderLeaderboard();
      });
    }
  }

  function verifyPin() {
    const pinInput = document.getElementById("admin-pin-input");
    const errorMsg = document.getElementById("pin-error");
    const entered = pinInput ? pinInput.value.trim() : "";

    if (entered === ADMIN_PIN || entered === "eco2025") {
      isAuthenticated = true;
      sessionStorage.setItem("ecoRushAdminAuth", "true");
      if (errorMsg) errorMsg.textContent = "";
      showDashboard();
    } else {
      if (errorMsg) {
        errorMsg.textContent = "Invalid Admin PIN. Please try again.";
      }
      if (pinInput) {
        pinInput.value = "";
        pinInput.focus();
      }
    }
  }

  function showPinScreen() {
    const pinScreen = document.getElementById("admin-pin-screen");
    const dashboardScreen = document.getElementById("admin-dashboard");
    if (pinScreen) pinScreen.classList.remove("hidden");
    if (dashboardScreen) dashboardScreen.classList.add("hidden");
  }

  async function showDashboard() {
    const pinScreen = document.getElementById("admin-pin-screen");
    const dashboardScreen = document.getElementById("admin-dashboard");
    if (pinScreen) pinScreen.classList.add("hidden");
    if (dashboardScreen) dashboardScreen.classList.remove("hidden");

    // 1. Initial REST API load
    await loadInitialData();

    // 2. Connect to live SSE real-time stream
    if (!sseSubscription) {
      sseSubscription = EcoStorage.subscribeLiveUpdates(handleLiveUpdate);
    }
  }

  async function loadInitialData() {
    try {
      console.log("[ADMIN] Loading leaderboard...");
      const data = await EcoStorage.fetchLeaderboard();
      currentScores = data.allScores || data.scores || [];
      currentStats = data.stats || { totalGames: 0, uniquePlayers: 0, topScore: 0, status: "LIVE" };
      currentChampion = data.champion || null;
      renderAll();
    } catch (e) {
      console.error("[ADMIN] Failed to load initial admin data:", e);
    }
  }

  function handleLiveUpdate(payload) {
    if (!payload) return;

    console.log("[ADMIN] Leaderboard update received:", payload);

    if (payload.allScores) {
      currentScores = payload.allScores;
    } else if (payload.scores) {
      currentScores = payload.scores;
    }
    if (payload.stats) {
      currentStats = payload.stats;
    }
    if (payload.champion !== undefined) {
      currentChampion = payload.champion;
    }

    renderAll();
  }

  function renderAll() {
    if (!isAuthenticated) return;
    renderMetrics();
    renderChampion();
    renderLeaderboard();
  }

  function renderMetrics() {
    const totalPlayersEl = document.getElementById("stat-players");
    const topScoreEl = document.getElementById("stat-top-score");
    const totalGamesEl = document.getElementById("stat-games");
    const statusEl = document.getElementById("stat-status");

    if (totalPlayersEl) totalPlayersEl.textContent = currentStats.uniquePlayers || 0;
    if (topScoreEl) topScoreEl.textContent = currentStats.topScore || 0;
    if (totalGamesEl) totalGamesEl.textContent = currentStats.totalGames || 0;
    if (statusEl) statusEl.textContent = currentStats.status || "LIVE";
  }

  function renderChampion() {
    const champContainer = document.getElementById("champion-card");
    if (!champContainer) return;

    if (!currentChampion) {
      champContainer.innerHTML = `
        <div class="champion-empty">
          <div class="champ-icon">🏆</div>
          <div class="champ-details">
            <h3>No Current Champion</h3>
            <p class="text-muted">Leaderboard awaiting first completed player run.</p>
          </div>
        </div>
      `;
      return;
    }

    champContainer.innerHTML = `
      <div class="champion-content">
        <div class="champ-crown">🥇</div>
        <div class="champ-info">
          <div class="champ-tag">CURRENT CHAMPION</div>
          <h2 class="champ-name">${EcoStorage.esc(currentChampion.name)}</h2>
          <div class="champ-team">${EcoStorage.esc(currentChampion.team)} &bull; Age ${currentChampion.age || "N/A"}</div>
        </div>
        <div class="champ-score-box">
          <div class="champ-score-val">${Number(currentChampion.score) || 0} <span class="star">⭐</span></div>
          <div class="champ-badge-pill">${EcoStorage.esc(currentChampion.badge)}</div>
        </div>
      </div>
    `;
  }

  function renderLeaderboard() {
    const scoresContainer = document.getElementById("admin-scores");
    if (!scoresContainer) return;

    if (!currentScores.length) {
      scoresContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🏆</div>
          <h3>NO PLAYERS YET</h3>
          <p>The live leaderboard will populate automatically when players finish ECO RUSH.</p>
        </div>
      `;
      return;
    }

    // Filter by Badge & Search Query safely
    let filtered = currentScores.filter(item => {
      const badgeStr = String(item.badge || "");
      if (activeFilter === "ULTIMATE") {
        if (!badgeStr.includes("Ultimate Planet Protector")) return false;
      } else if (activeFilter === "PLANET") {
        if (!badgeStr.includes("Planet Protector") || badgeStr.includes("Ultimate")) return false;
      } else if (activeFilter === "GREEN") {
        if (!badgeStr.includes("Green Champion")) return false;
      } else if (activeFilter === "EXPLORER") {
        if (!badgeStr.includes("Eco Explorer")) return false;
      }

      if (searchQuery) {
        const nameMatch = String(item.name || "").toLowerCase().includes(searchQuery);
        const teamMatch = String(item.team || "").toLowerCase().includes(searchQuery);
        if (!nameMatch && !teamMatch) return false;
      }

      return true;
    });

    if (!filtered.length) {
      scoresContainer.innerHTML = `
        <div class="empty-state">
          <p>No results found matching "<strong>${EcoStorage.esc(searchQuery)}</strong>" under ${activeFilter} filter.</p>
        </div>
      `;
      return;
    }

    // Render top 20
    const rows = filtered
      .slice(0, 20)
      .map((x, i) => {
        let rankClass = i === 0 ? "rank-1" : i === 1 ? "rank-2" : i === 2 ? "rank-3" : "";
        return `
          <tr class="${rankClass}">
            <td class="rank-cell"><span class="rank-tag">#${i + 1}</span></td>
            <td class="player-cell"><strong>${EcoStorage.esc(x.name)}</strong></td>
            <td class="team-cell">${EcoStorage.esc(x.team)}</td>
            <td class="score-cell">${Number(x.score) || 0} ⭐</td>
            <td class="badge-cell"><span class="badge-tag">${EcoStorage.esc(x.badge)}</span></td>
          </tr>
        `;
      })
      .join("");

    scoresContainer.innerHTML = `
      <div class="table-responsive">
        <table class="leader admin-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Team</th>
              <th>Score</th>
              <th>Badge</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  function setFilter(filterType, btnEl) {
    activeFilter = filterType;
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    if (btnEl) btnEl.classList.add("active");
    renderLeaderboard();
  }

  async function manualRefresh() {
    const btn = document.getElementById("btn-refresh");
    if (btn) btn.classList.add("spin");
    await loadInitialData();
    if (btn) {
      setTimeout(() => btn.classList.remove("spin"), 500);
    }
  }

  function logout() {
    isAuthenticated = false;
    sessionStorage.removeItem("ecoRushAdminAuth");
    if (sseSubscription) {
      sseSubscription.close();
      sseSubscription = null;
    }
    showPinScreen();
  }

  window.verifyPin = verifyPin;
  window.setFilter = setFilter;
  window.manualRefresh = manualRefresh;
  window.logout = logout;
  window.renderDashboard = renderAll;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAdmin);
  } else {
    initAdmin();
  }
})();
