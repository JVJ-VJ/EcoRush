/**
 * ECO RUSH — Live Player Progress & Real-Time Admin Monitoring Test Suite
 * Validates:
 *   1. Active session registration on game start (POST /api/player/progress)
 *   2. Live progress updates after questions (Round, Q, Score, Combo, Status)
 *   3. Real-time SSE delivery to Admin Live Players table
 *   4. Concurrent multi-player active progress tracking
 *   5. Seamless transition from Live Players to Completed Leaderboard on Q40 completion
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const TEST_PORT = 3095;
process.env.PORT = TEST_PORT;

// Clean test database before test
const DB_FILE = path.join(__dirname, 'data', 'scores.json');
if (fs.existsSync(DB_FILE)) {
  fs.unlinkSync(DB_FILE);
}

// Start Server
const server = require('./server.js');
const ACTUAL_PORT = server.address() ? server.address().port : TEST_PORT;

console.log("==========================================================");
console.log("   ECO RUSH LIVE PLAYER PROGRESS VERIFICATION SUITE       ");
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

class NodeEventSourceMock {
  constructor(url) {
    this.url = url;
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    
    const parsedUrl = new URL(url);
    this.req = http.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || ACTUAL_PORT,
      path: parsedUrl.pathname,
      method: 'GET',
      headers: { 'Accept': 'text/event-stream' }
    }, (res) => {
      if (this.onopen) this.onopen();
      let buffer = '';
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6);
            if (this.onmessage) {
              this.onmessage({ data: dataStr });
            }
          }
        }
      });
    });
    this.req.on('error', (e) => {
      if (this.onerror) this.onerror(e);
    });
    this.req.end();
  }
  close() {
    if (this.req) this.req.destroy();
  }
}

async function runLiveProgressTests() {
  try {
    const questionsCode = fs.readFileSync(path.join(__dirname, 'js/questions.js'), 'utf8');
    const storageCode = fs.readFileSync(path.join(__dirname, 'js/storage.js'), 'utf8');
    const playerCode = fs.readFileSync(path.join(__dirname, 'js/player.js'), 'utf8');
    const adminCode = fs.readFileSync(path.join(__dirname, 'js/admin.js'), 'utf8');

    // 1. SETUP ADMIN DASHBOARD (DEVICE B)
    console.log("--- 1. Initialize Admin Dashboard with SSE ---");
    const adminDoc = createDocumentMock([
      'admin-pin-screen', 'admin-dashboard', 'admin-pin-input', 'pin-error',
      'stat-players', 'stat-top-score', 'stat-games', 'stat-status',
      'champion-card', 'admin-live-players', 'live-players-count-badge',
      'admin-scores', 'admin-search', 'btn-refresh'
    ]);

    const adminSessionStore = {};
    const adminSandbox = {
      window: {
        location: { protocol: 'http:', origin: `http://localhost:${ACTUAL_PORT}` },
        sessionStorage: {
          getItem: (k) => adminSessionStore[k] || null,
          setItem: (k, v) => { adminSessionStore[k] = String(v); },
          removeItem: (k) => { delete adminSessionStore[k]; }
        },
        localStorage: { getItem: () => null, setItem: () => {} },
        EventSource: NodeEventSourceMock,
        fetch: global.fetch || require('undici').fetch,
        document: adminDoc,
        console: console,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout
      },
      document: adminDoc,
      sessionStorage: {
        getItem: (k) => adminSessionStore[k] || null,
        setItem: (k, v) => { adminSessionStore[k] = String(v); },
        removeItem: (k) => { delete adminSessionStore[k]; }
      },
      localStorage: { getItem: () => null, setItem: () => {} },
      EventSource: NodeEventSourceMock,
      fetch: global.fetch || require('undici').fetch,
      console: console,
      setTimeout: setTimeout,
      clearTimeout: clearTimeout
    };

    vm.createContext(adminSandbox);
    vm.runInContext(storageCode, adminSandbox);
    vm.runInContext(adminCode, adminSandbox);

    // Unlock Admin PIN
    adminDoc.getElementById('admin-pin-input').value = '1234';
    adminSandbox.window.verifyPin();
    await new Promise(r => setTimeout(r, 300));

    assert(adminDoc.getElementById('live-players-count-badge').textContent.includes("0 Playing"), "Initial live count badge is 0 Playing Now");
    assert(adminDoc.getElementById('admin-live-players').innerHTML.includes("No players currently in a game"), "Live players table shows clean empty state");

    // 2. PLAYER A STARTS GAME ON PHONE A
    console.log("\n--- 2. Player A Starts Game on Phone A (Alex - Solar Squad) ---");
    const playerADoc = createDocumentMock([
      'home-screen', 'game-screen', 'result-screen', 'finish-screen', 'leaderboard-screen',
      'name', 'team', 'age', 'score', 'combo', 'round', 'roundName', 'qnum', 'question',
      'bar', 'timer', 'options', 'resultTitle', 'resultMsg', 'resultScore',
      'finalPlayer', 'finalScore', 'badge', 'scores', 'submission-status'
    ]);

    const playerASandbox = {
      window: {
        location: { protocol: 'http:', origin: `http://localhost:${ACTUAL_PORT}` },
        localStorage: { getItem: () => null, setItem: () => {} },
        fetch: global.fetch || require('undici').fetch,
        document: playerADoc,
        console: console,
        alert: () => {},
        setInterval: () => 101,
        clearInterval: () => {}
      },
      document: playerADoc,
      localStorage: { getItem: () => null, setItem: () => {} },
      fetch: global.fetch || require('undici').fetch,
      console: console,
      alert: () => {},
      setInterval: () => 101,
      clearInterval: () => {}
    };

    vm.createContext(playerASandbox);
    vm.runInContext(questionsCode, playerASandbox);
    vm.runInContext(storageCode, playerASandbox);
    vm.runInContext(playerCode, playerASandbox);

    playerADoc.getElementById('name').value = 'Alex';
    playerADoc.getElementById('team').value = 'Solar Squad';
    playerADoc.getElementById('age').value = '20';
    playerASandbox.window.startGame();

    // Allow async live progress POST & SSE
    await new Promise(r => setTimeout(r, 400));

    assert(adminDoc.getElementById('live-players-count-badge').textContent.includes("1 Playing"), "Admin shows '1 Playing Now'");
    assert(adminDoc.getElementById('admin-live-players').innerHTML.includes("Alex"), "Admin Live table shows Alex");
    assert(adminDoc.getElementById('admin-live-players').innerHTML.includes("Solar Squad"), "Admin Live table shows Solar Squad");
    assert(adminDoc.getElementById('admin-live-players').innerHTML.includes("Round 1/5"), "Admin Live table shows Round 1/5");

    // 3. PLAYER B STARTS GAME ON PHONE B (CONCURRENT LIVE PLAYERS)
    console.log("\n--- 3. Player B Starts Game on Phone B (Jenil - Wind Force) ---");
    const playerBDoc = createDocumentMock([
      'home-screen', 'game-screen', 'result-screen', 'finish-screen', 'leaderboard-screen',
      'name', 'team', 'age', 'score', 'combo', 'round', 'roundName', 'qnum', 'question',
      'bar', 'timer', 'options', 'resultTitle', 'resultMsg', 'resultScore',
      'finalPlayer', 'finalScore', 'badge', 'scores', 'submission-status'
    ]);

    const playerBSandbox = {
      window: {
        location: { protocol: 'http:', origin: `http://localhost:${ACTUAL_PORT}` },
        localStorage: { getItem: () => null, setItem: () => {} },
        fetch: global.fetch || require('undici').fetch,
        document: playerBDoc,
        console: console,
        alert: () => {},
        setInterval: () => 102,
        clearInterval: () => {}
      },
      document: playerBDoc,
      localStorage: { getItem: () => null, setItem: () => {} },
      fetch: global.fetch || require('undici').fetch,
      console: console,
      alert: () => {},
      setInterval: () => 102,
      clearInterval: () => {}
    };

    vm.createContext(playerBSandbox);
    vm.runInContext(questionsCode, playerBSandbox);
    vm.runInContext(storageCode, playerBSandbox);
    vm.runInContext(playerCode, playerBSandbox);

    playerBDoc.getElementById('name').value = 'Jenil';
    playerBDoc.getElementById('team').value = 'Wind Force';
    playerBDoc.getElementById('age').value = '24';
    playerBSandbox.window.startGame();

    await new Promise(r => setTimeout(r, 400));

    assert(adminDoc.getElementById('live-players-count-badge').textContent.includes("2 Playing"), "Admin shows '2 Playing Now'");
    assert(adminDoc.getElementById('admin-live-players').innerHTML.includes("Alex") && adminDoc.getElementById('admin-live-players').innerHTML.includes("Jenil"), "Admin Live table shows both Alex and Jenil concurrently");

    // 4. PLAYER A ANSWERS QUESTIONS (PROGRESS UPDATES)
    console.log("\n--- 4. Player A Answers Q1 to Q5 ---");
    const rounds = playerASandbox.window.rounds;
    const activeBankA = playerASandbox.window._getActiveBank() || playerASandbox.window.BANK;

    // Player A answers Q1 to Q5
    for (let q = 0; q < 4; q++) {
      const correctIndex = activeBankA[rounds[0]][q][2];
      playerASandbox.window.answer(correctIndex, false);
      playerASandbox.window.nextQuestion();
    }
    // Answer Q5
    playerASandbox.window.answer(activeBankA[rounds[0]][4][2], false);

    await new Promise(r => setTimeout(r, 400));

    const liveHtml = adminDoc.getElementById('admin-live-players').innerHTML;
    assert(liveHtml.includes("Question 5/8") || liveHtml.includes("Q5"), "Admin live progress shows Alex reached Question 5");
    assert(liveHtml.includes("🔥 5"), "Admin live progress shows Alex combo 🔥 5");

    // 5. PLAYER A COMPLETES ALL 40 QUESTIONS
    console.log("\n--- 5. Player A Finishes Game (Q40 Complete) ---");
    // Advance to Q6
    playerASandbox.window.nextQuestion();

    // Finish remaining of Round 1
    for (let q = 5; q < 8; q++) {
      const correctIndex = activeBankA[rounds[0]][q][2];
      playerASandbox.window.answer(correctIndex, false);
      playerASandbox.window.nextQuestion();
    }

    // Play Rounds 2 to 5
    for (let r = 1; r < 5; r++) {
      for (let q = 0; q < 8; q++) {
        const correctIndex = activeBankA[rounds[r]][q][2];
        playerASandbox.window.answer(correctIndex, false);
        playerASandbox.window.nextQuestion();
      }
    }

    await new Promise(r => setTimeout(r, 800));

    // Verify Player A is REMOVED from Live Players and ADDED to Completed Leaderboard
    const liveAfterFinish = adminDoc.getElementById('admin-live-players').innerHTML;
    const completedAfterFinish = adminDoc.getElementById('admin-scores').innerHTML;

    assert(!liveAfterFinish.includes("Alex"), "Alex removed from LIVE PLAYERS table upon completing game");
    assert(liveAfterFinish.includes("Jenil"), "Jenil remains in LIVE PLAYERS table playing independently");
    assert(adminDoc.getElementById('live-players-count-badge').textContent.includes("1 Playing"), "Live count badge decrements to 1 Playing Now");
    assert(completedAfterFinish.includes("Alex"), "Alex appears in COMPLETED LEADERBOARD");
    assert(adminDoc.getElementById('champion-card').innerHTML.includes("Alex"), "Alex crowned Champion in spotlight");

    // 6. PLAYER B FINISHES GAME
    console.log("\n--- 6. Player B Finishes Game ---");
    const activeBankB = playerBSandbox.window._getActiveBank() || playerBSandbox.window.BANK;
    for (let r = 0; r < 5; r++) {
      for (let q = 0; q < 8; q++) {
        const correctIndex = activeBankB[rounds[r]][q][2];
        playerBSandbox.window.answer(correctIndex, false);
        playerBSandbox.window.nextQuestion();
      }
    }

    await new Promise(r => setTimeout(r, 800));

    const finalLive = adminDoc.getElementById('admin-live-players').innerHTML;
    const finalCompleted = adminDoc.getElementById('admin-scores').innerHTML;

    assert(adminDoc.getElementById('live-players-count-badge').textContent.includes("0 Playing"), "Live count returns to 0 Playing Now");
    assert(finalLive.includes("No players currently in a game"), "Live table returns to empty state");
    assert(finalCompleted.includes("Alex") && finalCompleted.includes("Jenil"), "Completed Leaderboard lists both Alex and Jenil");
    assert(adminDoc.getElementById('stat-games').textContent === 2, "Completed games count is 2");

    console.log("\n==========================================================");
    console.log(`LIVE PROGRESS VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==========================================================");

    server.close(() => {
      process.exit(failed > 0 ? 1 : 0);
    });
    setTimeout(() => process.exit(failed > 0 ? 1 : 0), 500);
  } catch (e) {
    console.error("Live progress test error:", e);
    server.close();
    process.exit(1);
  }
}

runLiveProgressTests();
