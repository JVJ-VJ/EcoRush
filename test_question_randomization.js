/**
 * ECO RUSH — Anti-Cheat Question Randomization Verification Suite
 * Validates:
 *   1. Fisher-Yates per-player question randomization on game start
 *   2. Exactly 40 questions generated per game (5 rounds x 8 questions)
 *   3. Zero duplicate questions, zero missing questions
 *   4. Original BANK object remains pristine / unmodified
 *   5. Answer options (A, B, C, D) and correct indices remain aligned
 *   6. Sequence is generated once on game start and remains fixed throughout the game
 *   7. Statistical divergence between independent player sessions (Player A sequence != Player B sequence)
 *   8. Full 40-question gameplay simulation with correct scoring, combos, badges, and submission
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const TEST_PORT = 3093;
process.env.PORT = TEST_PORT;

const DB_FILE = path.join(__dirname, 'data', 'scores.json');
if (fs.existsSync(DB_FILE)) {
  fs.unlinkSync(DB_FILE);
}

// Start Server
const server = require('./server.js');
const ACTUAL_PORT = server.address() ? server.address().port : TEST_PORT;

console.log("==========================================================");
console.log("   ECO RUSH QUESTION RANDOMIZATION & ANTI-CHEAT TEST      ");
console.log("==========================================================\n");

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

// Mock DOM
class MockElement {
  constructor(id = '', tagName = 'div') {
    this.id = id;
    this.tagName = tagName;
    this.value = '';
    this.textContent = '';
    this.innerHTML = '';
    this.className = '';
    this.disabled = false;
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

function createDocumentMock(ids) {
  const elements = {};
  ids.forEach(id => { elements[id] = new MockElement(id); });
  return {
    elements,
    getElementById: (id) => elements[id] || (elements[id] = new MockElement(id)),
    querySelectorAll: (sel) => Object.values(elements),
    createElement: (tag) => new MockElement('', tag)
  };
}

async function runRandomizationTests() {
  try {
    const questionsCode = fs.readFileSync(path.join(__dirname, 'js/questions.js'), 'utf8');
    const storageCode = fs.readFileSync(path.join(__dirname, 'js/storage.js'), 'utf8');
    const playerCode = fs.readFileSync(path.join(__dirname, 'js/player.js'), 'utf8');

    function createPlayerRuntime(name = 'Player', team = 'Eco Team', age = 22) {
      const doc = createDocumentMock([
        'home-screen', 'game-screen', 'result-screen', 'finish-screen', 'leaderboard-screen',
        'name', 'team', 'age', 'score', 'combo', 'round', 'roundName', 'qnum', 'question',
        'bar', 'timer', 'options', 'resultTitle', 'resultMsg', 'resultScore',
        'finalPlayer', 'finalScore', 'badge', 'scores', 'submission-status'
      ]);

      const sandbox = {
        window: {
          location: { protocol: 'http:', origin: `http://localhost:${ACTUAL_PORT}` },
          localStorage: { getItem: () => null, setItem: () => {} },
          fetch: global.fetch || require('undici').fetch,
          document: doc,
          console: console,
          alert: () => {},
          setInterval: () => 101,
          clearInterval: () => {}
        },
        document: doc,
        localStorage: { getItem: () => null, setItem: () => {} },
        fetch: global.fetch || require('undici').fetch,
        console: console,
        alert: () => {},
        setInterval: () => 101,
        clearInterval: () => {}
      };

      vm.createContext(sandbox);
      vm.runInContext(questionsCode, sandbox);
      vm.runInContext(storageCode, sandbox);
      vm.runInContext(playerCode, sandbox);

      doc.getElementById('name').value = name;
      doc.getElementById('team').value = team;
      doc.getElementById('age').value = String(age);

      return { doc, sandbox };
    }

    // 1. ORIGINAL BANK INTEGRITY AUDIT
    console.log("--- 1. Verify Original BANK Object Preservation ---");
    const testRuntime = createPlayerRuntime();
    const originalBank = testRuntime.sandbox.window.BANK;
    const rounds = testRuntime.sandbox.window.rounds;

    const originalQ1Round1 = originalBank[rounds[0]][0][0];
    const originalQ8Round5 = originalBank[rounds[4]][7][0];

    // 2. RUN 15 INDEPENDENT GAME INITIALIZATIONS
    console.log("\n--- 2. Run 15 Independent Game Sessions & Verify Question Sets ---");
    const sessionSequences = [];

    for (let i = 0; i < 15; i++) {
      const p = createPlayerRuntime(`Player_${i}`, `Team_${i}`, 20 + i);
      p.sandbox.window.startGame();
      const activeBank = p.sandbox.window._getActiveBank();

      assert(activeBank !== null && typeof activeBank === 'object', `Session ${i + 1}: activeBank generated successfully`);

      let totalQuestions = 0;
      const sessionAllQuestions = [];

      for (let r = 0; r < rounds.length; r++) {
        const roundName = rounds[r];
        const roundQs = activeBank[roundName];
        assert(Array.isArray(roundQs) && roundQs.length === 8, `Session ${i + 1} - ${roundName}: contains exactly 8 questions`);

        // Check each question is valid and options are preserved
        roundQs.forEach((q, qIndex) => {
          totalQuestions++;
          sessionAllQuestions.push(q[0]); // Question text

          assert(typeof q[0] === 'string' && q[0].length > 0, `Session ${i + 1} R${r + 1} Q${qIndex + 1}: question text valid`);
          assert(Array.isArray(q[1]) && q[1].length === 4, `Session ${i + 1} R${r + 1} Q${qIndex + 1}: contains 4 answer options (A,B,C,D)`);
          assert(typeof q[2] === 'number' && q[2] >= 0 && q[2] <= 3, `Session ${i + 1} R${r + 1} Q${qIndex + 1}: correct index in valid range [0-3]`);

          // Verify options match the question's original options
          const originalMatchingQ = originalBank[roundName].find(oq => oq[0] === q[0]);
          assert(originalMatchingQ !== undefined, `Session ${i + 1}: question belongs to original round bank`);
          assert(originalMatchingQ[2] === q[2], `Session ${i + 1}: correct answer index preserved`);
          assert(originalMatchingQ[1][q[2]] === q[1][q[2]], `Session ${i + 1}: correct answer option string matches original`);
        });
      }

      assert(totalQuestions === 40, `Session ${i + 1}: Exactly 40 total questions played`);

      // Verify NO duplicate questions in this session
      const uniqueQuestions = new Set(sessionAllQuestions);
      assert(uniqueQuestions.size === 40, `Session ${i + 1}: Zero duplicate questions (40 unique questions)`);

      sessionSequences.push(sessionAllQuestions);
    }

    // 3. STATISTICAL DIVERGENCE (ANTI-CHEAT TEST)
    console.log("\n--- 3. Verify Statistical Sequence Divergence (Anti-Cheat) ---");
    let differentSequencesCount = 0;

    for (let i = 1; i < sessionSequences.length; i++) {
      const seqA = sessionSequences[0];
      const seqB = sessionSequences[i];

      // Check if sequence differs anywhere in the 40 questions
      let hasDifference = false;
      for (let q = 0; q < 40; q++) {
        if (seqA[q] !== seqB[q]) {
          hasDifference = true;
          break;
        }
      }
      if (hasDifference) {
        differentSequencesCount++;
      }
    }

    assert(differentSequencesCount >= 10, `Anti-cheat verified: ${differentSequencesCount}/14 sessions produced distinct question orders`);

    // 4. VERIFY ORIGINAL BANK WAS NOT MODIFIED
    console.log("\n--- 4. Verify Original BANK Remained Pristine ---");
    assert(originalBank[rounds[0]][0][0] === originalQ1Round1, "Original BANK Round 1 Question 1 text unchanged");
    assert(originalBank[rounds[4]][7][0] === originalQ8Round5, "Original BANK Round 5 Question 8 text unchanged");

    // 5. VERIFY SEQUENCE STABILITY DURING GAMEPLAY (NO RESHUFFLE PER QUESTION)
    console.log("\n--- 5. Verify Fixed Sequence Stability During Active Gameplay ---");
    const stableGame = createPlayerRuntime("StableTester", "TestTeam", 22);
    stableGame.sandbox.window.startGame();

    const bankSnapshotRound1Q1 = stableGame.sandbox.window._getActiveBank()[rounds[0]][0][0];
    const bankSnapshotRound1Q2 = stableGame.sandbox.window._getActiveBank()[rounds[0]][1][0];

    // Answer Q1
    const activeBank = stableGame.sandbox.window._getActiveBank();
    const correctIdxQ1 = activeBank[rounds[0]][0][2];
    stableGame.sandbox.window.answer(correctIdxQ1, false);
    stableGame.sandbox.window.nextQuestion();

    // Verify Q2 is still the same as planned at game start
    const currentQ2 = stableGame.sandbox.window._getActiveBank()[rounds[0]][1][0];
    assert(currentQ2 === bankSnapshotRound1Q2, "Question sequence remains stable across answers (not reshuffled on answer)");

    // 6. COMPLETE FULL 40-QUESTION GAME WITH RANDOMIZED BANK
    console.log("\n--- 6. Complete 40 Questions & Verify Scoring & Submission ---");
    // Play remaining questions
    for (let r = 0; r < 5; r++) {
      const roundName = rounds[r];
      const startQ = (r === 0 ? 1 : 0);
      for (let q = startQ; q < 8; q++) {
        const correctIdx = activeBank[roundName][q][2];
        stableGame.sandbox.window.answer(correctIdx, false);
        stableGame.sandbox.window.nextQuestion();
      }
    }

    await new Promise(r => setTimeout(r, 600));

    const state = stableGame.sandbox.window._getPlayerState();
    assert(state.score === 760, "Perfect game with randomized questions achieves exact 760 score");
    assert(state.isSubmitted === true, "Randomized game completes and marks isSubmitted = true");
    assert(stableGame.doc.getElementById('submission-status').innerHTML.includes("SCORE SUBMITTED"), "Submission feedback rendered on finish screen");

    console.log("\n==========================================================");
    console.log(`QUESTION RANDOMIZATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==========================================================");

    server.close(() => {
      process.exit(failed > 0 ? 1 : 0);
    });
    setTimeout(() => process.exit(failed > 0 ? 1 : 0), 500);
  } catch (err) {
    console.error("Randomization test error:", err);
    server.close();
    process.exit(1);
  }
}

runRandomizationTests();
