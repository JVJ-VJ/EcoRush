/**
 * ECO RUSH — Client-Server Storage & Real-Time Sync Module
 * Communicates with the central backend server (REST API + SSE Stream).
 * Preserves exact badge formulas, sanitization, and live progress reporting.
 */

const EcoStorage = (function() {
  const STORAGE_KEY = "ecoRushScores";

  // Base URL resolution: use window.location.origin for http/https (supports LAN IP / Render / localhost),
  // and fallback to http://localhost:3000 if opened directly via file:// or headless Node
  function getApiUrl(path) {
    if (typeof window !== "undefined" && window.location && window.location.origin && window.location.protocol.startsWith("http")) {
      return window.location.origin + path;
    }
    return "http://localhost:3000" + path;
  }

  /**
   * Fetch current leaderboard, stats, and live players from the central server
   */
  async function fetchLeaderboard() {
    const url = getApiUrl("/api/leaderboard");
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      
      // Update local cache
      if (data.allScores && Array.isArray(data.allScores)) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.allScores));
        } catch (e) {}
      }

      return data;
    } catch (e) {
      console.warn("EcoStorage: Server unreachable, reading from local fallback", e);
      const fallbackScores = getScoresLocal();
      return {
        success: false,
        scores: fallbackScores.slice(0, 20),
        allScores: fallbackScores,
        stats: {
          totalGames: fallbackScores.length,
          uniquePlayers: new Set(fallbackScores.map(s => String(s.name).toLowerCase().trim())).size,
          topScore: fallbackScores.length > 0 ? Math.max(...fallbackScores.map(s => Number(s.score) || 0)) : 0,
          status: "OFFLINE",
          champion: fallbackScores.length > 0 ? fallbackScores[0] : null
        },
        champion: fallbackScores.length > 0 ? fallbackScores[0] : null,
        livePlayers: []
      };
    }
  }

  /**
   * Report live active gameplay progress to the central server
   */
  async function updateLiveProgress(progressData) {
    if (!progressData || !progressData.sessionId || !progressData.name) return;
    const url = getApiUrl("/api/player/progress");
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(progressData)
      });
    } catch (e) {
      // Non-blocking: background update should not interrupt gameplay
    }
  }

  /**
   * Submit completed player score to the central server
   */
  async function submitScore(entry) {
    if (!entry || typeof entry !== "object") {
      throw new Error("Invalid score submission object");
    }

    const payload = {
      name: String(entry.name || "").trim(),
      team: String(entry.team || "").trim(),
      age: Number(entry.age) || 0,
      score: Number(entry.score) || 0,
      badge: String(entry.badge || ""),
      sessionId: String(entry.sessionId || "")
    };

    // Save to local cache
    saveScoreLocal(payload);

    const url = getApiUrl("/api/leaderboard");
    console.log(`[ECO RUSH] Submitting leaderboard result to ${url}:`, payload);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    const result = await res.json();
    console.log("[ECO RUSH] Leaderboard submission response:", result);
    return result;
  }

  /**
   * Admin Reset Leaderboard via Server API
   */
  async function resetLeaderboard(password) {
    const url = getApiUrl("/api/admin/reset-leaderboard");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password: String(password || "") })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Invalid reset password");
    }

    // Clear local cache
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    } catch (e) {}

    return data;
  }

  /**
   * Subscribe to live SSE leaderboard & live player updates across all connected devices
   */
  function subscribeLiveUpdates(onUpdate) {
    if (typeof EventSource === "undefined") {
      console.warn("EcoStorage: EventSource not supported in this browser");
      return null;
    }

    let source = null;
    let reconnectTimeout = null;
    const url = getApiUrl("/api/leaderboard/stream");

    function connect() {
      try {
        console.log(`[ADMIN] Connecting to SSE at ${url}...`);
        source = new EventSource(url);

        source.onopen = function() {
          console.log("[ADMIN] SSE connected");
        };

        source.onmessage = function(event) {
          try {
            const data = JSON.parse(event.data);
            console.log("[ADMIN] Leaderboard/Progress update received:", data);
            if (typeof onUpdate === "function") {
              onUpdate(data);
            }
          } catch (e) {
            console.error("EcoStorage: Failed to parse SSE message", e);
          }
        };

        source.onerror = function(err) {
          console.warn("[ADMIN] SSE connection error, attempting reconnect in 3s...", err);
          if (source) {
            source.close();
            source = null;
          }
          clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(connect, 3000);
        };
      } catch (e) {
        console.error("EcoStorage: Failed to initialize EventSource", e);
      }
    }

    connect();

    return {
      close: function() {
        clearTimeout(reconnectTimeout);
        if (source) source.close();
      }
    };
  }

  /**
   * Local storage cache helpers (for offline / instant read)
   */
  function getScoresLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveScoreLocal(entry) {
    try {
      let scores = getScoresLocal();
      scores.push(entry);
      scores.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scores.slice(0, 100)));
    } catch (e) {}
  }

  /**
   * Exact badge threshold calculation
   */
  function calculateBadge(score) {
    const num = Number(score) || 0;
    return num >= 450
      ? "👑 Ultimate Planet Protector"
      : num >= 350
      ? "🌍 Planet Protector"
      : num >= 250
      ? "🌱 Green Champion"
      : "🍃 Eco Explorer";
  }

  /**
   * XSS sanitization
   */
  function esc(s) {
    return String(s || "").replace(
      /[&<>"']/g,
      m =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        }[m])
    );
  }

  function getStatsLocal() {
    const scores = getScoresLocal();
    const uniquePlayers = new Set(scores.map(s => String(s.name).toLowerCase().trim())).size;
    const topScore = scores.length > 0 ? Math.max(...scores.map(s => Number(s.score) || 0)) : 0;
    return {
      totalGames: scores.length,
      uniquePlayers: uniquePlayers,
      topScore: topScore,
      status: "LIVE"
    };
  }

  function getChampionLocal() {
    const scores = getScoresLocal();
    return scores.length > 0 ? scores[0] : null;
  }

  return {
    STORAGE_KEY,
    fetchLeaderboard,
    updateLiveProgress,
    submitScore,
    resetLeaderboard,
    subscribeLiveUpdates,
    getScoresLocal,
    getScores: getScoresLocal,
    saveScoreLocal,
    saveScore: saveScoreLocal,
    getStats: getStatsLocal,
    getStatsLocal: getStatsLocal,
    getChampion: getChampionLocal,
    getChampionLocal: getChampionLocal,
    calculateBadge,
    esc
  };
})();

// Attach globally for browser / Node environments
if (typeof window !== "undefined") {
  window.EcoStorage = EcoStorage;
  window.esc = EcoStorage.esc;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = EcoStorage;
}
