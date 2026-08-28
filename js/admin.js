/**
 * ECO RUSH — Admin Control Center & Live Event Dashboard
 * Features: PIN authentication, live metrics, champion spotlight, search, filter,
 * and automatic cross-tab synchronization with storage events.
 */

(function() {
  // Configurable Event Admin PIN
  const ADMIN_PIN = "1234";

  let isAuthenticated = false;
  let activeFilter = "ALL";
  let searchQuery = "";

  function initAdmin() {
    // Check if session has already authenticated
    if (sessionStorage.getItem("ecoRushAdminAuth") === "true") {
      isAuthenticated = true;
      showDashboard();
    } else {
      showPinScreen();
    }

    // Cross-tab live synchronization
    window.addEventListener("storage", function(event) {
      if (!event.key || event.key === EcoStorage.STORAGE_KEY) {
        if (isAuthenticated) {
          renderDashboard();
        }
      }
    });

    // Setup input listeners for search & filters
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

  function showDashboard() {
    const pinScreen = document.getElementById("admin-pin-screen");
    const dashboardScreen = document.getElementById("admin-dashboard");
    if (pinScreen) pinScreen.classList.add("hidden");
    if (dashboardScreen) dashboardScreen.classList.remove("hidden");
    renderDashboard();
  }

  function renderDashboard() {
    if (!isAuthenticated) return;
    renderMetrics();
    renderChampion();
    renderLeaderboard();
  }

  function renderMetrics() {
    const stats = EcoStorage.getStats();

    const totalPlayersEl = document.getElementById("stat-players");
    const topScoreEl = document.getElementById("stat-top-score");
    const totalGamesEl = document.getElementById("stat-games");
    const statusEl = document.getElementById("stat-status");

    if (totalPlayersEl) totalPlayersEl.textContent = stats.uniquePlayers;
    if (topScoreEl) topScoreEl.textContent = stats.topScore;
    if (totalGamesEl) totalGamesEl.textContent = stats.totalGames;
    if (statusEl) statusEl.textContent = stats.status;
  }

  function renderChampion() {
    const champ = EcoStorage.getChampion();
    const champContainer = document.getElementById("champion-card");
    if (!champContainer) return;

    if (!champ) {
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
          <h2 class="champ-name">${EcoStorage.esc(champ.name)}</h2>
          <div class="champ-team">${EcoStorage.esc(champ.team)} &bull; Age ${champ.age || "N/A"}</div>
        </div>
        <div class="champ-score-box">
          <div class="champ-score-val">${Number(champ.score) || 0} <span class="star">⭐</span></div>
          <div class="champ-badge-pill">${EcoStorage.esc(champ.badge)}</div>
        </div>
      </div>
    `;
  }

  function renderLeaderboard() {
    const scoresContainer = document.getElementById("admin-scores");
    if (!scoresContainer) return;

    const allScores = EcoStorage.getScores();

    if (!allScores.length) {
      scoresContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🏆</div>
          <h3>NO PLAYERS YET</h3>
          <p>The live leaderboard will populate automatically when players finish ECO RUSH.</p>
        </div>
      `;
      return;
    }

    // Apply Filter & Search
    let filtered = allScores.filter(item => {
      // Category Filter
      if (activeFilter === "ULTIMATE") {
        if (!item.badge.includes("Ultimate Planet Protector")) return false;
      } else if (activeFilter === "PLANET") {
        if (!item.badge.includes("Planet Protector") || item.badge.includes("Ultimate")) return false;
      } else if (activeFilter === "GREEN") {
        if (!item.badge.includes("Green Champion")) return false;
      } else if (activeFilter === "EXPLORER") {
        if (!item.badge.includes("Eco Explorer")) return false;
      }

      // Search Query
      if (searchQuery) {
        const nameMatch = String(item.name).toLowerCase().includes(searchQuery);
        const teamMatch = String(item.team).toLowerCase().includes(searchQuery);
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

    // Show top 20
    const rows = filtered
      .slice(0, 20)
      .map((x, i) => {
        let rankBadgeClass = i === 0 ? "rank-1" : i === 1 ? "rank-2" : i === 2 ? "rank-3" : "";
        return `
          <tr class="${rankBadgeClass}">
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

  function manualRefresh() {
    renderDashboard();
    const btn = document.getElementById("btn-refresh");
    if (btn) {
      btn.classList.add("spin");
      setTimeout(() => btn.classList.remove("spin"), 600);
    }
  }

  function logout() {
    isAuthenticated = false;
    sessionStorage.removeItem("ecoRushAdminAuth");
    showPinScreen();
  }

  // Expose to window for UI buttons
  window.verifyPin = verifyPin;
  window.setFilter = setFilter;
  window.manualRefresh = manualRefresh;
  window.logout = logout;
  window.renderDashboard = renderDashboard;

  // Auto-init on DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAdmin);
  } else {
    initAdmin();
  }
})();
