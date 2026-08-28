/**
 * ECO RUSH — Centralized Storage & Utility Module
 * Key: "ecoRushScores"
 * Preserves exact persistence, sorting, capping, and security rules.
 */

const EcoStorage = (function() {
  const STORAGE_KEY = "ecoRushScores";

  function getScores() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("EcoStorage: Failed to read scores from localStorage", e);
      return [];
    }
  }

  function saveScore(entry) {
    if (!entry || typeof entry !== "object") return [];
    
    let scores = getScores();
    scores.push({
      name: String(entry.name || "").trim(),
      team: String(entry.team || "").trim(),
      age: Number(entry.age) || 0,
      score: Number(entry.score) || 0,
      badge: String(entry.badge || "")
    });

    // Sort descending: highest score first
    scores.sort((a, b) => b.score - a.score);

    // Keep top 100
    const top100 = scores.slice(0, 100);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(top100));
    } catch (e) {
      console.error("EcoStorage: Failed to save scores to localStorage", e);
    }

    return top100;
  }

  function getStats() {
    const scores = getScores();
    const uniquePlayers = new Set(scores.map(s => String(s.name).toLowerCase().trim())).size;
    const topScore = scores.length > 0 ? Math.max(...scores.map(s => Number(s.score) || 0)) : 0;

    return {
      totalGames: scores.length,
      uniquePlayers: uniquePlayers,
      topScore: topScore,
      status: "LIVE"
    };
  }

  function getChampion() {
    const scores = getScores();
    if (!scores.length) return null;
    return scores[0];
  }

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

  return {
    STORAGE_KEY,
    getScores,
    saveScore,
    getStats,
    getChampion,
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
