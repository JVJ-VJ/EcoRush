/**
 * ECO RUSH — Automated Verification Suite v2
 * Comprehensive tests for Player + Admin Two-Page System
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log("==================================================");
console.log("   ECO RUSH TWO-PAGE REDESIGN VERIFICATION SUITE  ");
console.log("==================================================\n");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

// 1. DATA AUDIT: Check exact match of BANK between eco_rush_web-1.html and js/questions.js
console.log("--- 1. Question Bank Integrity Audit ---");
let srcPath = path.join(__dirname, 'eco_rush_web-1.html');
if (!fs.existsSync(srcPath)) {
  srcPath = 'C:\\Users\\jenil\\Downloads\\eco_rush_web-1.html';
}
const originalSource = fs.existsSync(srcPath) ? fs.readFileSync(srcPath, 'utf8') : '';
const originalBankMatch = originalSource.match(/const BANK=(\{.*?\});\s*const rounds/s);
const originalBank = eval('(' + originalBankMatch[1] + ')');

const questionsModule = require('./js/questions.js');
const newBank = questionsModule.BANK;
const newRounds = questionsModule.rounds;

assert(JSON.stringify(Object.keys(originalBank)) === JSON.stringify(newRounds), "Rounds list & order 100% matches original");
assert(newRounds.length === 5, "Total 5 rounds exist");

let totalQuestions = 0;
let bankExactMatch = true;

newRounds.forEach(r => {
  const oq = originalBank[r];
  const nq = newBank[r];
  if (oq.length !== 8 || nq.length !== 8) bankExactMatch = false;
  totalQuestions += nq.length;
  for (let i = 0; i < oq.length; i++) {
    if (oq[i][0] !== nq[i][0]) bankExactMatch = false;
    if (JSON.stringify(oq[i][1]) !== JSON.stringify(nq[i][1])) bankExactMatch = false;
    if (oq[i][2] !== nq[i][2]) bankExactMatch = false;
  }
});

assert(totalQuestions === 40, "Total 40 questions present");
assert(bankExactMatch, "All 40 questions, answers & correct indices are 100% identical to source");

// 2. STORAGE MODULE & BADGE THRESHOLD TESTS
console.log("\n--- 2. Storage Module & Logic ---");
const EcoStorage = require('./js/storage.js');

// Mock localStorage
const mockStorage = (function() {
  let store = {};
  return {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    clear: () => { store = {}; }
  };
})();
global.localStorage = mockStorage;

// Clear storage
mockStorage.clear();

assert(EcoStorage.STORAGE_KEY === "ecoRushScores", "Preserved exact storage key 'ecoRushScores'");
assert(EcoStorage.getScores().length === 0, "Initial score list is empty");
assert(EcoStorage.getStats().totalGames === 0, "Stats show 0 games when empty");
assert(EcoStorage.getStats().uniquePlayers === 0, "Stats show 0 unique players when empty");
assert(EcoStorage.getStats().topScore === 0, "Stats show 0 top score when empty");
assert(EcoStorage.getChampion() === null, "Champion is null when no scores exist (no fake data)");

// Badge threshold checks
assert(EcoStorage.calculateBadge(450) === "👑 Ultimate Planet Protector", "Score 450 -> 👑 Ultimate Planet Protector");
assert(EcoStorage.calculateBadge(500) === "👑 Ultimate Planet Protector", "Score 500 -> 👑 Ultimate Planet Protector");
assert(EcoStorage.calculateBadge(449) === "🌍 Planet Protector", "Score 449 -> 🌍 Planet Protector");
assert(EcoStorage.calculateBadge(350) === "🌍 Planet Protector", "Score 350 -> 🌍 Planet Protector");
assert(EcoStorage.calculateBadge(349) === "🌱 Green Champion", "Score 349 -> 🌱 Green Champion");
assert(EcoStorage.calculateBadge(250) === "🌱 Green Champion", "Score 250 -> 🌱 Green Champion");
assert(EcoStorage.calculateBadge(249) === "🍃 Eco Explorer", "Score 249 -> 🍃 Eco Explorer");
assert(EcoStorage.calculateBadge(0) === "🍃 Eco Explorer", "Score 0 -> 🍃 Eco Explorer");

// Save score & sorting test
EcoStorage.saveScore({ name: "Player B", team: "Team Beta", age: 22, score: 320, badge: "🌱 Green Champion" });
EcoStorage.saveScore({ name: "Player A", team: "Team Alpha", age: 24, score: 480, badge: "👑 Ultimate Planet Protector" });
EcoStorage.saveScore({ name: "Player C", team: "Team Gamma", age: 20, score: 210, badge: "🍃 Eco Explorer" });

const scores = EcoStorage.getScores();
assert(scores.length === 3, "3 scores saved");
assert(scores[0].name === "Player A" && scores[0].score === 480, "Sorted highest score first (Player A #1)");
assert(scores[1].name === "Player B" && scores[1].score === 320, "Player B #2");
assert(scores[2].name === "Player C" && scores[2].score === 210, "Player C #3");

const stats = EcoStorage.getStats();
assert(stats.totalGames === 3, "Stats reflect 3 total games");
assert(stats.uniquePlayers === 3, "Stats reflect 3 unique players");
assert(stats.topScore === 480, "Stats reflect 480 top score");

const champ = EcoStorage.getChampion();
assert(champ.name === "Player A" && champ.score === 480, "Champion accurately points to Player A");

// Top 100 limit test
for (let i = 0; i < 110; i++) {
  EcoStorage.saveScore({ name: `User ${i}`, team: "Test", age: 25, score: i * 2, badge: "🌱 Green Champion" });
}
assert(EcoStorage.getScores().length === 100, "Storage enforces strict max 100 entries");

// 3. DOM & PLAYER ENGINE SIMULATION
console.log("\n--- 3. Player Game Engine Simulation ---");
class MockElement {
  constructor(id = '', tagName = 'div') {
    this.id = id;
    this.tagName = tagName;
    this.value = '';
    this.textContent = '';
    this.innerHTML = '';
    this.classList = {
      set: new Set(),
      add: (c) => this.classList.set.add(c),
      remove: (c) => this.classList.set.delete(c),
      contains: (c) => this.classList.set.has(c)
    };
    this.style = {};
    this.children = [];
    this.listeners = {};
  }
  appendChild(child) { this.children.push(child); }
  closest(selector) { return new MockElement('closest-' + selector); }
  addEventListener(event, handler) { this.listeners[event] = handler; }
  focus() {}
}

const docMock = {
  elements: {},
  getElementById: function(id) {
    if (!this.elements[id]) this.elements[id] = new MockElement(id);
    return this.elements[id];
  },
  querySelectorAll: function(sel) {
    return [
      this.getElementById('home-screen'),
      this.getElementById('game-screen'),
      this.getElementById('result-screen'),
      this.getElementById('finish-screen'),
      this.getElementById('leaderboard-screen')
    ];
  },
  createElement: function(tag) {
    return new MockElement('', tag);
  }
};

['home-screen', 'game-screen', 'result-screen', 'finish-screen', 'leaderboard-screen',
 'name', 'team', 'age', 'score', 'combo', 'round', 'roundName', 'qnum', 'question',
 'bar', 'timer', 'options', 'resultTitle', 'resultMsg', 'resultScore',
 'finalPlayer', 'finalScore', 'badge', 'scores'].forEach(id => docMock.getElementById(id));

let alertMsg = '';
const playerSandbox = {
  window: {},
  document: docMock,
  localStorage: mockStorage,
  EcoStorage: EcoStorage,
  BANK: newBank,
  rounds: newRounds,
  alert: (m) => { alertMsg = m; },
  setInterval: () => 999,
  clearInterval: () => {}
};
playerSandbox.window = playerSandbox;

const playerCode = fs.readFileSync(path.join(__dirname, 'js/player.js'), 'utf8');
vm.createContext(playerSandbox);
vm.runInContext(playerCode, playerSandbox);

// Test Registration Validation
docMock.getElementById('name').value = '';
docMock.getElementById('team').value = 'Team';
docMock.getElementById('age').value = '25';
playerSandbox.startGame();
assert(alertMsg === "Please enter your name, team and a valid age.", "Registration blocks empty name");

alertMsg = '';
docMock.getElementById('name').value = 'Eco Runner';
docMock.getElementById('team').value = 'Planet Team';
docMock.getElementById('age').value = '22';
playerSandbox.startGame();
assert(alertMsg === '', "Valid registration initiates game");
assert(!docMock.getElementById('game-screen').classList.contains('hidden'), "Game screen is shown");

// Test Scoring Sequence
// Q1: Wet/organic waste (index 0)
playerSandbox.answer(0, false);
assert(docMock.getElementById('resultTitle').textContent === "✅ CORRECT!", "Q1 answer is ✅ CORRECT!");
assert(docMock.getElementById('resultMsg').innerHTML.includes("+12 ⭐"), "Q1 awards +12 points");
assert(docMock.getElementById('resultMsg').innerHTML.includes("Combo: 1"), "Q1 combo is 1");
assert(docMock.getElementById('resultScore').textContent === 12, "Score is 12");

// Q2: E-waste (index 1)
playerSandbox.nextQuestion();
playerSandbox.answer(1, false);
assert(docMock.getElementById('resultMsg').innerHTML.includes("+14 ⭐"), "Q2 awards +14 points");
assert(docMock.getElementById('resultMsg').innerHTML.includes("Combo: 2"), "Q2 combo is 2");
assert(docMock.getElementById('resultScore').textContent === 26, "Score is 26");

// Q3: Wrong answer
playerSandbox.nextQuestion();
playerSandbox.answer(0, false); // Wrong
assert(docMock.getElementById('resultTitle').textContent === "❌ OOPS!", "Wrong answer gives ❌ OOPS!");
assert(docMock.getElementById('resultScore').textContent === 26, "Score unchanged on wrong answer (26)");

// Q4: Timeout
playerSandbox.nextQuestion();
playerSandbox.answer(-1, true); // Timeout
assert(docMock.getElementById('resultTitle').textContent === "⏰ TIME'S UP!", "Timeout gives ⏰ TIME'S UP!");
assert(docMock.getElementById('resultScore').textContent === 26, "Score unchanged on timeout (26)");

// Q5: Correct answer after reset
playerSandbox.nextQuestion();
playerSandbox.answer(newBank[newRounds[0]][4][2], false);
assert(docMock.getElementById('resultMsg').innerHTML.includes("+12 ⭐"), "Correct after reset starts back at +12 points");

// 4. ADMIN DASHBOARD & LIVE FILTERING TESTS
console.log("\n--- 4. Admin Control Center Tests ---");
// Prepare test scores in storage
mockStorage.clear();
EcoStorage.saveScore({ name: "Alice", team: "Solar Crew", age: 24, score: 470, badge: "👑 Ultimate Planet Protector" });
EcoStorage.saveScore({ name: "Bob", team: "Wind Force", age: 22, score: 360, badge: "🌍 Planet Protector" });
EcoStorage.saveScore({ name: "Charlie", team: "Tree Guard", age: 26, score: 260, badge: "🌱 Green Champion" });
EcoStorage.saveScore({ name: "Dana", team: "Water Save", age: 19, score: 180, badge: "🍃 Eco Explorer" });

const adminDocMock = {
  elements: {},
  getElementById: function(id) {
    if (!this.elements[id]) this.elements[id] = new MockElement(id);
    return this.elements[id];
  },
  querySelectorAll: function(sel) {
    return [new MockElement('filter-btn')];
  },
  addEventListener: () => {}
};

['admin-pin-screen', 'admin-dashboard', 'admin-pin-input', 'pin-error',
 'stat-players', 'stat-top-score', 'stat-games', 'stat-status',
 'champion-card', 'admin-scores', 'admin-search', 'btn-refresh'].forEach(id => adminDocMock.getElementById(id));

const mockFetch = async (url) => {
  const scores = EcoStorage.getScoresLocal();
  return {
    ok: true,
    json: async () => ({
      success: true,
      scores: scores.slice(0, 20),
      allScores: scores,
      stats: EcoStorage.getStatsLocal(),
      champion: EcoStorage.getChampionLocal()
    })
  };
};
global.fetch = mockFetch;

const adminSandbox = {
  window: {
    addEventListener: () => {},
    fetch: mockFetch
  },
  document: adminDocMock,
  sessionStorage: mockStorage,
  EcoStorage: EcoStorage,
  fetch: mockFetch,
  setTimeout: (fn) => fn()
};
adminSandbox.window.sessionStorage = mockStorage;
adminSandbox.window.EcoStorage = EcoStorage;
adminSandbox.window.document = adminDocMock;

const adminCode = fs.readFileSync(path.join(__dirname, 'js/admin.js'), 'utf8');
vm.createContext(adminSandbox);
vm.runInContext(adminCode, adminSandbox);

(async function() {
  // Test PIN verification
  adminDocMock.getElementById('admin-pin-input').value = 'wrong_pin';
  adminSandbox.window.verifyPin();
  assert(adminDocMock.getElementById('pin-error').textContent.includes("Invalid"), "Blocks invalid PIN");

  adminDocMock.getElementById('admin-pin-input').value = '1234';
  adminSandbox.window.verifyPin();
  assert(adminDocMock.getElementById('pin-error').textContent === '', "Accepts valid PIN (1234)");
  assert(!adminDocMock.getElementById('admin-dashboard').classList.contains('hidden'), "Unlocks dashboard screen");

  // Wait for async loadInitialData
  await new Promise(r => setTimeout(r, 50));

  // Verify Dashboard Stats Display
  assert(Number(adminDocMock.getElementById('stat-players').textContent) === 4, "Admin stats show 4 players");
  assert(Number(adminDocMock.getElementById('stat-top-score').textContent) === 470, "Admin stats show 470 top score");
  assert(Number(adminDocMock.getElementById('stat-games').textContent) === 4, "Admin stats show 4 games");

  // Verify Champion spotlight
  const champHtml = adminDocMock.getElementById('champion-card').innerHTML;
  assert(champHtml.includes("Alice"), "Champion card highlights Alice");
  assert(champHtml.includes("470"), "Champion card shows score 470");
  assert(champHtml.includes("👑 Ultimate Planet Protector"), "Champion card shows Ultimate badge");

  // Verify Table Rows
  const tableHtml = adminDocMock.getElementById('admin-scores').innerHTML;
  assert(tableHtml.includes("Alice") && tableHtml.includes("Bob") && tableHtml.includes("Charlie") && tableHtml.includes("Dana"), "Leaderboard lists all participants");

  // Test Search Filter Functionality
  adminDocMock.getElementById('admin-search').value = 'solar';
  // Re-render
  adminSandbox.window.renderDashboard();
  const searchResultHtml = adminDocMock.getElementById('admin-scores').innerHTML;
  assert(searchResultHtml.includes("Alice"), "Search 'solar' includes Solar Crew player");

  // 5. SECURITY & ESCAPING TEST
  console.log("\n--- 5. Security & Sanitization ---");
  const dangerousInput = `<script>alert('xss')</script>&"`;
  const safeOutput = EcoStorage.esc(dangerousInput);
  assert(!safeOutput.includes("<script>"), "HTML tags sanitized");
  assert(safeOutput === "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;&amp;&quot;", "Special characters sanitized exactly");

  console.log("\n==================================================");
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) process.exit(1);
})();
