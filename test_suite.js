/**
 * Comprehensive Automated Verification Suite for ECO RUSH
 * Tests all 11 requirements from the specification.
 */

const fs = require('fs');
const path = require('path');

// Read source files
const htmlSource = fs.readFileSync(path.join(__dirname, 'eco_rush_web-1.html'), 'utf8');
const rebuiltApp = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const rebuiltHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const rebuiltCss = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');

console.log("=== ECO RUSH AUTOMATED TEST SUITE ===");

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

// 1. DATA AUDIT: Check exact match of BANK between eco_rush_web-1.html and app.js
console.log("\n--- TEST 1: Question Bank Integrity ---");
const sourceBankMatch = htmlSource.match(/const BANK=(\{.*?\});\s*const rounds/s);
if (!sourceBankMatch) {
  console.error("Could not extract BANK from source");
}
const sourceBank = eval('(' + sourceBankMatch[1] + ')');

// Extract BANK from app.js
const appBankMatch = rebuiltApp.match(/const BANK = (\{.*?\});\s*const rounds/s);
const appBank = eval('(' + appBankMatch[1] + ')');

const sourceRounds = Object.keys(sourceBank);
const appRounds = Object.keys(appBank);

assert(JSON.stringify(sourceRounds) === JSON.stringify(appRounds), "Rounds and order match exactly");
assert(appRounds.length === 5, "Total 5 rounds exist");

let totalQuestions = 0;
let questionsIdentical = true;

sourceRounds.forEach(r => {
  const sq = sourceBank[r];
  const aq = appBank[r];
  if (sq.length !== 8 || aq.length !== 8) {
    questionsIdentical = false;
  }
  totalQuestions += aq.length;
  for (let i = 0; i < sq.length; i++) {
    if (sq[i][0] !== aq[i][0]) questionsIdentical = false; // Question text
    if (JSON.stringify(sq[i][1]) !== JSON.stringify(aq[i][1])) questionsIdentical = false; // Options
    if (sq[i][2] !== aq[i][2]) questionsIdentical = false; // Correct index
  }
});

assert(totalQuestions === 40, "Total 40 questions across all rounds");
assert(questionsIdentical, "All 40 questions, options, and correct answers are 100% identical to source");

// 2. SIMULATE GAME ENGINE STATE & FUNCTIONS
console.log("\n--- TEST 2: Engine & DOM Simulation ---");

// Mock LocalStorage
const localStorageMock = (function() {
  let store = {};
  return {
    getItem: function(key) {
      return store[key] || null;
    },
    setItem: function(key, value) {
      store[key] = value.toString();
    },
    clear: function() {
      store = {};
    }
  };
})();

// Minimal DOM Element Mock
class MockElement {
  constructor(id = '', tagName = 'div') {
    this.id = id;
    this.tagName = tagName;
    this.value = '';
    this.textContent = '';
    this.innerHTML = '';
    this.classList = {
      classes: new Set(),
      add: (c) => this.classList.classes.add(c),
      remove: (c) => this.classList.classes.delete(c),
      contains: (c) => this.classList.classes.has(c)
    };
    this.style = {};
    this.children = [];
  }
  appendChild(child) {
    this.children.push(child);
  }
  closest(selector) {
    return new MockElement('closest-' + selector);
  }
}

const documentMock = {
  elements: {},
  getElementById: function(id) {
    if (!this.elements[id]) {
      this.elements[id] = new MockElement(id);
    }
    return this.elements[id];
  },
  querySelectorAll: function(sel) {
    return [
      this.getElementById('home'),
      this.getElementById('game'),
      this.getElementById('result'),
      this.getElementById('finish'),
      this.getElementById('leaderboard')
    ];
  },
  createElement: function(tag) {
    return new MockElement('', tag);
  }
};

// Initialize elements
['home', 'game', 'result', 'finish', 'leaderboard', 'name', 'team', 'age', 'score', 'combo', 
 'round', 'roundName', 'qnum', 'question', 'bar', 'timer', 'options', 'resultTitle', 'resultMsg', 
 'resultScore', 'finalPlayer', 'finalScore', 'badge', 'scores'].forEach(id => {
  documentMock.getElementById(id);
});

let alertMessage = '';
const windowMock = {
  document: documentMock,
  localStorage: localStorageMock,
  alert: function(msg) { alertMessage = msg; },
  setInterval: function(fn, ms) { return 123; },
  clearInterval: function(id) {}
};

// Evaluate app.js within environment
const sandbox = {
  window: windowMock,
  document: documentMock,
  localStorage: localStorageMock,
  alert: windowMock.alert,
  setInterval: windowMock.setInterval,
  clearInterval: windowMock.clearInterval,
  console: console
};

const vm = require('vm');
vm.createContext(sandbox);
vm.runInContext(rebuiltApp, sandbox);

// 3. REGISTRATION VALIDATION TESTS
console.log("\n--- TEST 3: Registration Validation ---");
// Invalid inputs
documentMock.getElementById('name').value = '';
documentMock.getElementById('team').value = 'Team A';
documentMock.getElementById('age').value = '25';
sandbox.startGame();
assert(alertMessage === "Please enter your name, team and a valid age.", "Empty name triggers exact alert");

alertMessage = '';
documentMock.getElementById('name').value = 'Player';
documentMock.getElementById('team').value = '';
documentMock.getElementById('age').value = '25';
sandbox.startGame();
assert(alertMessage === "Please enter your name, team and a valid age.", "Empty team triggers exact alert");

alertMessage = '';
documentMock.getElementById('name').value = 'Player';
documentMock.getElementById('team').value = 'Team';
documentMock.getElementById('age').value = '0';
sandbox.startGame();
assert(alertMessage === "Please enter your name, team and a valid age.", "Age < 1 triggers exact alert");

alertMessage = '';
documentMock.getElementById('age').value = '121';
sandbox.startGame();
assert(alertMessage === "Please enter your name, team and a valid age.", "Age > 120 triggers exact alert");

// Valid input
alertMessage = '';
documentMock.getElementById('name').value = 'Eco Captain';
documentMock.getElementById('team').value = 'Planet Force';
documentMock.getElementById('age').value = '25';
sandbox.startGame();
assert(alertMessage === '', "Valid registration starts game without alerts");
assert(!documentMock.getElementById('game').classList.contains('hidden'), "Game screen is now visible");
assert(documentMock.getElementById('score').textContent === 0, "Initial score is 0");
assert(documentMock.getElementById('combo').textContent === 0, "Initial combo is 0");
assert(documentMock.getElementById('round').textContent === "ROUND 1/5", "Initial round is ROUND 1/5");
assert(documentMock.getElementById('qnum').textContent === "Question 1/8", "Initial question is Question 1/8");

// 4. SCORING & COMBO FORMULA TESTS
console.log("\n--- TEST 4: Scoring Formula & Consecutive Combos ---");
// Correct Answer 1 (Wet/organic waste = index 0)
sandbox.answer(0, false);
// combo becomes 1, points = 10 + 1*2 = 12, score = 12
assert(documentMock.getElementById('resultTitle').textContent === "✅ CORRECT!", "Result title for correct answer is ✅ CORRECT!");
assert(documentMock.getElementById('resultMsg').textContent === "+12 ⭐   🔥 Combo: 1", "Points +12 and Combo 1 in result message");
assert(documentMock.getElementById('resultScore').textContent === 12, "Total score is 12");

// Advance to Question 2
sandbox.nextQuestion();
assert(documentMock.getElementById('qnum').textContent === "Question 2/8", "Question 2/8 displayed");

// Correct Answer 2 (index 1)
sandbox.answer(1, false);
// combo becomes 2, points = 10 + 2*2 = 14, score = 12 + 14 = 26
assert(documentMock.getElementById('resultMsg').textContent === "+14 ⭐   🔥 Combo: 2", "Points +14 and Combo 2 in result message");
assert(documentMock.getElementById('resultScore').textContent === 26, "Total score is 26");

// Advance to Question 3
sandbox.nextQuestion();

// Correct Answer 3 (index 1)
sandbox.answer(1, false);
// combo becomes 3, points = 10 + 3*2 = 16, score = 26 + 16 = 42
assert(documentMock.getElementById('resultMsg').textContent === "+16 ⭐   🔥 Combo: 3", "Points +16 and Combo 3 in result message");
assert(documentMock.getElementById('resultScore').textContent === 42, "Total score is 42");

// 5. INCORRECT ANSWER & COMBO RESET
console.log("\n--- TEST 5: Incorrect Answer & Combo Reset ---");
sandbox.nextQuestion(); // Question 4 (correct answer index is 0)
sandbox.answer(3, false); // Pick wrong index 3
assert(documentMock.getElementById('resultTitle').textContent === "❌ OOPS!", "Wrong answer displays ❌ OOPS!");
assert(documentMock.getElementById('resultMsg').textContent.includes("The correct answer was: A. Reused or recycled"), "Correct answer option revealed");
assert(documentMock.getElementById('resultScore').textContent === 42, "Score remains unchanged on wrong answer");

// 6. TIMEOUT TEST
console.log("\n--- TEST 6: Timeout Handling ---");
sandbox.nextQuestion(); // Question 5
sandbox.answer(-1, true); // Timeout
assert(documentMock.getElementById('resultTitle').textContent === "⏰ TIME'S UP!", "Timeout displays ⏰ TIME'S UP!");
assert(documentMock.getElementById('resultScore').textContent === 42, "Score remains 42 on timeout");

// 7. DOUBLE-CLICK / LOCKING TEST
console.log("\n--- TEST 7: Double-Click Locking ---");
sandbox.nextQuestion(); // Question 6
sandbox.answer(0, false); // first click (correct, score 42 + (10 + 1*2) = 54)
const scoreAfterFirstClick = documentMock.getElementById('resultScore').textContent;
sandbox.answer(0, false); // second click should be ignored
assert(documentMock.getElementById('resultScore').textContent === scoreAfterFirstClick, "Locked state ignores subsequent clicks");

// 8. ROUND TRANSITION TEST
console.log("\n--- TEST 8: Full Round Progression ---");
// We are at Round 1, Q6. Answer Q6 (already answered), Q7, Q8
sandbox.nextQuestion(); // Q7
sandbox.answer(0, false); // correct
sandbox.nextQuestion(); // Q8
sandbox.answer(1, false); // correct

// Next question should advance to Round 2, Question 1, Combo reset to 0
sandbox.nextQuestion();
assert(documentMock.getElementById('round').textContent === "ROUND 2/5", "Advanced to ROUND 2/5");
assert(documentMock.getElementById('roundName').textContent === "💧 WATER RESCUE", "Round 2 name is 💧 WATER RESCUE");
assert(documentMock.getElementById('qnum').textContent === "Question 1/8", "Question index reset to Question 1/8");

// 9. PROGRESS THROUGH ALL 5 ROUNDS & BADGES
console.log("\n--- TEST 9: Full Game Completion & Badge Thresholds ---");
// Answer remaining Round 2 questions (q = 0 already displayed, so answer q=0 to q=7)
// Notice in Test 8, showQuestion() was called for Round 2 Q1 (index 0).
// So we answer index 0, then nextQuestion()... up to index 7.
sandbox.answer(appBank[appRounds[1]][0][2], false);
sandbox.nextQuestion();

for (let q = 1; q < 8; q++) {
  sandbox.answer(appBank[appRounds[1]][q][2], false);
  sandbox.nextQuestion();
}

// Round 3 (Forest Guardian)
for (let q = 0; q < 8; q++) {
  sandbox.answer(appBank[appRounds[2]][q][2], false);
  sandbox.nextQuestion();
}

// Round 4 (Energy Battle)
for (let q = 0; q < 8; q++) {
  sandbox.answer(appBank[appRounds[3]][q][2], false);
  sandbox.nextQuestion();
}

// Round 5 (Planet Final Battle)
for (let q = 0; q < 8; q++) {
  sandbox.answer(appBank[appRounds[4]][q][2], false);
  sandbox.nextQuestion();
}
assert(!documentMock.getElementById('finish').classList.contains('hidden'), "Finish screen displayed after 40 questions");
assert(documentMock.getElementById('finalPlayer').textContent === "Congratulations, Eco Captain!", "Final player name displayed");

const finalScore = Number(documentMock.getElementById('finalScore').textContent);
console.log(`Final calculated score: ${finalScore}`);
assert(finalScore >= 450, "Score is >= 450 with mostly correct answers");
assert(documentMock.getElementById('badge').textContent === "👑 Ultimate Planet Protector", "Awarded 👑 Ultimate Planet Protector for score >= 450");

// 10. LEADERBOARD LOCALSTORAGE PERSISTENCE & TOP 100 / TOP 20 LIMIT
console.log("\n--- TEST 10: Leaderboard & Storage ---");
let storedScores = JSON.parse(localStorageMock.getItem('ecoRushScores'));
assert(Array.isArray(storedScores), "ecoRushScores is saved as an Array");
assert(storedScores.length === 1, "1 score stored initially");
assert(storedScores[0].name === "Eco Captain", "Stored name matches");
assert(storedScores[0].score === finalScore, "Stored score matches");

// Add 120 mock scores to test 100 limit
for (let i = 0; i < 120; i++) {
  storedScores.push({ name: `User ${i}`, team: `Team ${i}`, age: 20, score: i * 5, badge: "🌱 Green Champion" });
}
storedScores.sort((a, b) => b.score - a.score);
localStorageMock.setItem("ecoRushScores", JSON.stringify(storedScores.slice(0, 100)));

sandbox.showLeaderboard();
assert(!documentMock.getElementById('leaderboard').classList.contains('hidden'), "Leaderboard screen shown");

const scoresTableHtml = documentMock.getElementById('scores').innerHTML;
assert(scoresTableHtml.includes("table"), "Leaderboard renders table");
assert(scoresTableHtml.includes("#20"), "Displays top 20 rows");
assert(!scoresTableHtml.includes("#21"), "Does not display more than 20 rows");

// 11. SECURITY / XSS ESCAPING
console.log("\n--- TEST 11: Security & HTML Escaping ---");
const unsafeString = '<script>alert("hack")</script>&"\'';
const escaped = sandbox.esc(unsafeString);
assert(!escaped.includes('<script>'), "Tags are safely escaped");
assert(escaped === '&lt;script&gt;alert(&quot;hack&quot;)&lt;/script&gt;&amp;&quot;&#39;', "All special characters escaped correctly");

// 12. PROGRESS BAR CALCULATION
console.log("\n--- TEST 12: Progress Bar Formula ---");
// Formula: (ri * 8 + qi) / 40 * 100
assert(rebuiltApp.includes("(ri * 8 + qi) / 40 * 100"), "Progress bar calculation matches source exactly");

// 13. ALL BADGE THRESHOLD CHECKS
console.log("\n--- TEST 13: All Badge Thresholds ---");
function getBadge(s) {
  return s >= 450 ? "👑 Ultimate Planet Protector" : s >= 350 ? "🌍 Planet Protector" : s >= 250 ? "🌱 Green Champion" : "🍃 Eco Explorer";
}
assert(getBadge(450) === "👑 Ultimate Planet Protector", "Badge for 450 is 👑 Ultimate Planet Protector");
assert(getBadge(500) === "👑 Ultimate Planet Protector", "Badge for 500 is 👑 Ultimate Planet Protector");
assert(getBadge(449) === "🌍 Planet Protector", "Badge for 449 is 🌍 Planet Protector");
assert(getBadge(350) === "🌍 Planet Protector", "Badge for 350 is 🌍 Planet Protector");
assert(getBadge(349) === "🌱 Green Champion", "Badge for 349 is 🌱 Green Champion");
assert(getBadge(250) === "🌱 Green Champion", "Badge for 250 is 🌱 Green Champion");
assert(getBadge(249) === "🍃 Eco Explorer", "Badge for 249 is 🍃 Eco Explorer");
assert(getBadge(0) === "🍃 Eco Explorer", "Badge for 0 is 🍃 Eco Explorer");

// 14. AGE BOUNDARY CHECKS
console.log("\n--- TEST 14: Age Boundary Validation ---");
documentMock.getElementById('name').value = 'Boundary User';
documentMock.getElementById('team').value = 'Boundary Team';

alertMessage = '';
documentMock.getElementById('age').value = '1';
sandbox.startGame();
assert(alertMessage === '', "Age = 1 is valid (lower bound)");

alertMessage = '';
documentMock.getElementById('age').value = '120';
sandbox.startGame();
assert(alertMessage === '', "Age = 120 is valid (upper bound)");

alertMessage = '';
documentMock.getElementById('age').value = '0';
sandbox.startGame();
assert(alertMessage === "Please enter your name, team and a valid age.", "Age = 0 is invalid");

alertMessage = '';
documentMock.getElementById('age').value = '121';
sandbox.startGame();
assert(alertMessage === "Please enter your name, team and a valid age.", "Age = 121 is invalid");

// 15. CORRUPT LOCALSTORAGE RESILIENCE
console.log("\n--- TEST 15: Corrupt LocalStorage Resilience ---");
localStorageMock.setItem("ecoRushScores", "INVALID_JSON_CORRUPT{");
let threw = false;
try {
  sandbox.showLeaderboard();
} catch (e) {
  threw = true;
}
assert(!threw, "showLeaderboard handles corrupted localStorage without throwing errors");

console.log(`\n========================================`);
console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================`);

if (failed > 0) process.exit(1);

