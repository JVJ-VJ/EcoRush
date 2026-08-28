/**
 * ECO RUSH — Admin Control Center & Live Event Dashboard
 * Connects to central backend with real-time Server-Sent Events (SSE) synchronization.
 * Monitors both active live players in progress and completed leaderboard rankings.
 */

(function() {
  const ADMIN_PIN = "1234";

  let isAuthenticated = false;
  let activeFilter = "ALL";
  let searchQuery = "";
  let currentScores = [];
  let currentLivePlayers = [];
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
      console.log("[ADMIN] Loading leaderboard and live players...");
      const data = await EcoStorage.fetchLeaderboard();
      currentScores = data.allScores || data.scores || [];
      currentLivePlayers = data.livePlayers || [];
      currentStats = data.stats || { totalGames: 0, uniquePlayers: 0, topScore: 0, status: "LIVE" };
      currentChampion = data.champion || null;
      renderAll();
    } catch (e) {
      console.error("[ADMIN] Failed to load initial admin data:", e);
    }
  }

  function handleLiveUpdate(payload) {
    if (!payload) return;

    console.log("[ADMIN] Real-time update received:", payload);

    if (payload.allScores) {
      currentScores = payload.allScores;
    } else if (payload.scores) {
      currentScores = payload.scores;
    }
    if (payload.livePlayers !== undefined) {
      currentLivePlayers = payload.livePlayers;
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
    renderLivePlayers();
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

  /**
   * Render Active Players in Progress (Real-Time Live State)
   */
  function renderLivePlayers() {
    const container = document.getElementById("admin-live-players");
    const countBadge = document.getElementById("live-players-count-badge");
    if (!container) return;

    const count = currentLivePlayers.length;
    if (countBadge) {
      countBadge.textContent = count === 1 ? "1 Playing Now" : `${count} Playing Now`;
      countBadge.className = count > 0 ? "live-count-pill active-pulse" : "live-count-pill";
    }

    if (!count) {
      container.innerHTML = `
        <div class="live-empty-state">
          <div class="live-empty-icon">🎮</div>
          <p>No players currently in a game.<br><span class="text-muted" style="font-size: 13px;">When players join and answer questions, their real-time progress will appear here!</span></p>
        </div>
      `;
      return;
    }

    const rows = currentLivePlayers.map(p => {
      const roundNum = p.currentRound || 1;
      const qNum = p.currentQuestion || 1;
      const overallProgress = Math.min(40, ((roundNum - 1) * 8 + qNum));
      const percent = Math.round((overallProgress / 40) * 100);

      return `
        <tr class="live-player-row">
          <td class="player-cell">
            <strong>${EcoStorage.esc(p.name)}</strong>
            <span class="text-muted" style="font-size: 12px; margin-left: 4px;">(Age ${p.age || "N/A"})</span>
          </td>
          <td class="team-cell">${EcoStorage.esc(p.team)}</td>
          <td class="round-cell">
            <span class="round-badge">Round ${roundNum}/5</span>
            <div class="round-subtext">${EcoStorage.esc(p.roundName || "")}</div>
          </td>
          <td class="q-progress-cell">
            <div class="live-q-badge">Question ${qNum}/8</div>
            <div class="mini-progress-bar">
              <div class="mini-progress-fill" style="width: ${percent}%"></div>
            </div>
            <span class="progress-subtext">${overallProgress}/40 (${percent}%)</span>
          </td>
          <td class="score-cell"><strong>${Number(p.score) || 0} ⭐</strong></td>
          <td class="combo-cell">${Number(p.combo) > 0 ? `<span class="combo-live-tag">🔥 ${p.combo}</span>` : `<span class="text-muted">-</span>`}</td>
          <td class="status-cell"><span class="badge-live-pulse">🟢 PLAYING</span></td>
        </tr>
      `;
    }).join("");

    container.innerHTML = `
      <div class="table-responsive">
        <table class="leader live-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Team</th>
              <th>Round</th>
              <th>Progress</th>
              <th>Live Score</th>
              <th>Combo</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render Completed Leaderboard
   */
  function renderLeaderboard() {
    const scoresContainer = document.getElementById("admin-scores");
    if (!scoresContainer) return;

    if (!currentScores.length) {
      scoresContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🏆</div>
          <h3>NO COMPLETED GAMES YET</h3>
          <p>Completed player scores will appear here automatically when participants finish all 40 questions.</p>
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

  // Reset Leaderboard Modal Handling
  let isResetting = false;

  function openResetModal() {
    const modal = document.getElementById("reset-modal");
    const pwdInput = document.getElementById("reset-password-input");
    const errorEl = document.getElementById("reset-error");
    if (errorEl) errorEl.textContent = "";
    if (pwdInput) {
      pwdInput.value = "";
      pwdInput.disabled = false;
    }
    const resetBtn = document.getElementById("btn-confirm-reset");
    if (resetBtn) {
      resetBtn.disabled = false;
      resetBtn.textContent = "RESET";
    }
    if (modal) modal.classList.remove("hidden");
    if (pwdInput) setTimeout(() => pwdInput.focus(), 100);
  }

  function closeResetModal() {
    if (isResetting) return;
    const modal = document.getElementById("reset-modal");
    if (modal) modal.classList.add("hidden");
    const pwdInput = document.getElementById("reset-password-input");
    if (pwdInput) pwdInput.value = "";
    const errorEl = document.getElementById("reset-error");
    if (errorEl) errorEl.textContent = "";
  }

  async function submitResetLeaderboard() {
    if (isResetting) return;

    const pwdInput = document.getElementById("reset-password-input");
    const errorEl = document.getElementById("reset-error");
    const resetBtn = document.getElementById("btn-confirm-reset");
    const entered = pwdInput ? pwdInput.value.trim() : "";

    if (!entered) {
      if (errorEl) errorEl.textContent = "Please enter the reset password.";
      if (pwdInput) pwdInput.focus();
      return;
    }

    isResetting = true;
    if (errorEl) errorEl.textContent = "";
    if (resetBtn) {
      resetBtn.disabled = true;
      resetBtn.textContent = "Resetting...";
    }
    if (pwdInput) pwdInput.disabled = true;

    try {
      const res = await EcoStorage.resetLeaderboard(entered);
      console.log("[ADMIN] Leaderboard reset result:", res);

      // Close modal on success
      isResetting = false;
      closeResetModal();

      // Show temporary confirmation toast
      showToast("✅ LEADERBOARD RESET — All completed results have been cleared.");

      // Refresh data from server
      await loadInitialData();
    } catch (err) {
      console.error("[ADMIN] Leaderboard reset failed:", err);
      isResetting = false;
      if (resetBtn) {
        resetBtn.disabled = false;
        resetBtn.textContent = "RESET";
      }
      if (pwdInput) {
        pwdInput.disabled = false;
        pwdInput.focus();
      }
      if (errorEl) {
        errorEl.textContent = "❌ INVALID PASSWORD";
      }
    }
  }

  function showToast(message) {
    const toast = document.getElementById("admin-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove("hidden");
    toast.classList.add("visible");
    setTimeout(() => {
      toast.classList.remove("visible");
      setTimeout(() => toast.classList.add("hidden"), 300);
    }, 4000);
  }

  window.verifyPin = verifyPin;
  window.setFilter = setFilter;
  window.manualRefresh = manualRefresh;
  window.logout = logout;
  window.openResetModal = openResetModal;
  window.closeResetModal = closeResetModal;
  window.submitResetLeaderboard = submitResetLeaderboard;
  window.renderDashboard = renderAll;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAdmin);
  } else {
    initAdmin();
  }
})();
