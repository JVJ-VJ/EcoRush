/**
 * ECO RUSH — End-to-End Real Browser Engine Verification Test
 * Tests full runtime pipeline:
 *   Real Player Engine (js/player.js)
 *   -> Real HTTP POST /api/leaderboard (js/storage.js)
 *   -> Real Server (server.js)
 *   -> Real File Storage (data/scores.json)
 *   -> Real SSE Broadcast (/api/leaderboard/stream)
 *   -> Real Admin Engine (js/admin.js)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const TEST_PORT = 3099;
process.env.PORT = TEST_PORT;

// Clean test database before test
const DB_FILE = path.join(__dirname, 'data', 'scores.json');
if (fs.existsSync(DB_FILE)) {
  fs.unlinkSync(DB_FILE);
}

// Start Real Server
const server = require('./server.js');
const ACTUAL_PORT = server.address() ? server.address().port : TEST_PORT;

console.log("==========================================================");
console.log("   ECO RUSH END-TO-END REAL RUNTIME PIPELINE TEST         ");
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

// Minimal DOM Mock Element
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

// Minimal EventSource Mock connecting to actual Node HTTP SSE stream
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
        buffer = lines.pop(); // keep last incomplete line
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

async function runEndToEnd() {
  try {
    const questionsCode = fs.readFileSync(path.join(__dirname, 'js/questions.js'), 'utf8');
    const storageCode = fs.readFileSync(path.join(__dirname, 'js/storage.js'), 'utf8');
    const playerCode = fs.readFileSync(path.join(__dirname, 'js/player.js'), 'utf8');
    const adminCode = fs.readFileSync(path.join(__dirname, 'js/admin.js'), 'utf8');

    // 1. SETUP DEVICE B (ADMIN CLIENT RUNTIME)
    console.log("--- 1. Initialize Admin Runtime (Device B) ---");
    const adminDoc = createDocumentMock([
      'admin-pin-screen', 'admin-dashboard', 'admin-pin-input', 'pin-error',
      'stat-players', 'stat-top-score', 'stat-games', 'stat-status',
      'champion-card', 'admin-scores', 'admin-search', 'btn-refresh'
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
        localStorage: {
          getItem: () => null,
          setItem: () => {}
        },
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
      localStorage: {
        getItem: () => null,
        setItem: () => {}
      },
      EventSource: NodeEventSourceMock,
      fetch: global.fetch || require('undici').fetch,
      console: console,
      setTimeout: setTimeout,
      clearTimeout: clearTimeout
    };

    vm.createContext(adminSandbox);
    vm.runInContext(storageCode, adminSandbox);
    vm.runInContext(adminCode, adminSandbox);

    // Enter PIN
    adminDoc.getElementById('admin-pin-input').value = '1234';
    adminSandbox.window.verifyPin();
    assert(adminDoc.getElementById('pin-error').textContent === '', "Admin PIN 1234 accepted");
    assert(!adminDoc.getElementById('admin-dashboard').classList.contains('hidden'), "Admin dashboard unlocked");

    // Wait for initial SSE connection & snapshot
    await new Promise(r => setTimeout(r, 300));
    assert(adminDoc.getElementById('stat-players').textContent === 0, "Initial admin players is 0");
    assert(adminDoc.getElementById('stat-top-score').textContent === 0, "Initial admin top score is 0");
    assert(adminDoc.getElementById('champion-card').innerHTML.includes("No Current Champion"), "Initial champion is empty");

    // 2. SETUP DEVICE A (PLAYER 1 RUNTIME)
    console.log("\n--- 2. Player 1 Plays on Device A (Alex - Eco Team - Age 20) ---");
    const player1Doc = createDocumentMock([
      'home-screen', 'game-screen', 'result-screen', 'finish-screen', 'leaderboard-screen',
      'name', 'team', 'age', 'score', 'combo', 'round', 'roundName', 'qnum', 'question',
      'bar', 'timer', 'options', 'resultTitle', 'resultMsg', 'resultScore',
      'finalPlayer', 'finalScore', 'badge', 'scores', 'submission-status'
    ]);

    const player1Sandbox = {
      window: {
        location: { protocol: 'http:', origin: `http://localhost:${ACTUAL_PORT}` },
        localStorage: { getItem: () => null, setItem: () => {} },
        fetch: global.fetch || require('undici').fetch,
        document: player1Doc,
        console: console,
        alert: (m) => console.log("[PLAYER 1 ALERT]:", m),
        setInterval: () => 101,
        clearInterval: () => {}
      },
      document: player1Doc,
      localStorage: { getItem: () => null, setItem: () => {} },
      fetch: global.fetch || require('undici').fetch,
      console: console,
      alert: (m) => console.log("[PLAYER 1 ALERT]:", m),
      setInterval: () => 101,
      clearInterval: () => {}
    };

    vm.createContext(player1Sandbox);
    vm.runInContext(questionsCode, player1Sandbox);
    vm.runInContext(storageCode, player1Sandbox);
    vm.runInContext(playerCode, player1Sandbox);

    // Register Player 1
    player1Doc.getElementById('name').value = 'Alex';
    player1Doc.getElementById('team').value = 'Eco Team';
    player1Doc.getElementById('age').value = '20';
    player1Sandbox.window.startGame();

    // Answer questions to simulate realistic game
    const bank = player1Sandbox.window.BANK;
    const rounds = player1Sandbox.window.rounds;

    // Simulate answering all 40 questions correctly
    for (let r = 0; r < 5; r++) {
      for (let q = 0; q < 8; q++) {
        const correctIndex = bank[rounds[r]][q][2];
        player1Sandbox.window.answer(correctIndex, false);
        if (r < 4 || q < 7) {
          player1Sandbox.window.nextQuestion();
        }
      }
    }

    // Advance to finish
    player1Sandbox.window.nextQuestion();
    assert(!player1Doc.getElementById('finish-screen').classList.contains('hidden'), "Player 1 reaches Finish screen");
    assert(player1Doc.getElementById('finalPlayer').textContent.includes("Alex"), "Player 1 name displayed on finish screen");

    const player1Score = Number(player1Doc.getElementById('finalScore').textContent);
    console.log(`Player 1 Final Score: ${player1Score}`);
    assert(player1Score >= 450, "Player 1 score calculated correctly (>=450)");

    // Wait for async HTTP POST submission and SSE propagation
    await new Promise(r => setTimeout(r, 600));

    // Verify Player 1 UI submission status
    assert(player1Doc.getElementById('submission-status').innerHTML.includes("SCORE SUBMITTED"), "Player 1 UI shows 'SCORE SUBMITTED'");

    // 3. VERIFY REAL-TIME UPDATE ON DEVICE B (ADMIN) WITHOUT REFRESH
    console.log("\n--- 3. Verify Real-Time SSE Reception on Admin (Device B) ---");
    assert(adminDoc.getElementById('stat-players').textContent === 1, "Admin auto-updated to 1 player");
    assert(adminDoc.getElementById('stat-top-score').textContent === player1Score, `Admin auto-updated top score to ${player1Score}`);
    assert(adminDoc.getElementById('stat-games').textContent === 1, "Admin auto-updated to 1 game completed");
    assert(adminDoc.getElementById('champion-card').innerHTML.includes("Alex"), "Admin champion spotlight auto-updated to Alex");
    assert(adminDoc.getElementById('admin-scores').innerHTML.includes("Alex"), "Admin live leaderboard table includes Alex");

    // 4. SETUP DEVICE C (PLAYER 2 RUNTIME)
    console.log("\n--- 4. Player 2 Plays on Device C (Jenil - Planet Force - Age 24) ---");
    const player2Doc = createDocumentMock([
      'home-screen', 'game-screen', 'result-screen', 'finish-screen', 'leaderboard-screen',
      'name', 'team', 'age', 'score', 'combo', 'round', 'roundName', 'qnum', 'question',
      'bar', 'timer', 'options', 'resultTitle', 'resultMsg', 'resultScore',
      'finalPlayer', 'finalScore', 'badge', 'scores', 'submission-status'
    ]);

    const player2Sandbox = {
      window: {
        location: { protocol: 'http:', origin: `http://localhost:${ACTUAL_PORT}` },
        localStorage: { getItem: () => null, setItem: () => {} },
        fetch: global.fetch || require('undici').fetch,
        document: player2Doc,
        console: console,
        alert: () => {},
        setInterval: () => 102,
        clearInterval: () => {}
      },
      document: player2Doc,
      localStorage: { getItem: () => null, setItem: () => {} },
      fetch: global.fetch || require('undici').fetch,
      console: console,
      alert: () => {},
      setInterval: () => 102,
      clearInterval: () => {}
    };

    vm.createContext(player2Sandbox);
    vm.runInContext(questionsCode, player2Sandbox);
    vm.runInContext(storageCode, player2Sandbox);
    vm.runInContext(playerCode, player2Sandbox);

    // Register Player 2
    player2Doc.getElementById('name').value = 'Jenil';
    player2Doc.getElementById('team').value = 'Planet Force';
    player2Doc.getElementById('age').value = '24';
    player2Sandbox.window.startGame();

    // Play 40 questions (all correct)
    for (let r = 0; r < 5; r++) {
      for (let q = 0; q < 8; q++) {
        const correctIndex = bank[rounds[r]][q][2];
        player2Sandbox.window.answer(correctIndex, false);
        if (r < 4 || q < 7) {
          player2Sandbox.window.nextQuestion();
        }
      }
    }
    player2Sandbox.window.nextQuestion();

    // Wait for submission
    await new Promise(r => setTimeout(r, 600));
    assert(player2Doc.getElementById('submission-status').innerHTML.includes("SCORE SUBMITTED"), "Player 2 UI shows 'SCORE SUBMITTED'");

    // 5. VERIFY SECOND REAL-TIME UPDATE ON ADMIN
    console.log("\n--- 5. Verify Second Live Update on Admin ---");
    assert(adminDoc.getElementById('stat-players').textContent === 2, "Admin auto-updated to 2 players");
    assert(adminDoc.getElementById('stat-games').textContent === 2, "Admin auto-updated to 2 games completed");
    assert(adminDoc.getElementById('admin-scores').innerHTML.includes("Alex") && adminDoc.getElementById('admin-scores').innerHTML.includes("Jenil"), "Admin table lists both players");

    // 6. VERIFY PERSISTENCE ON DISK (data/scores.json)
    console.log("\n--- 6. Verify Server File Database on Disk ---");
    assert(fs.existsSync(DB_FILE), "data/scores.json exists");
    const dbData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    assert(dbData.length === 2, "data/scores.json contains both completed player records");
    assert(dbData.some(d => d.name === "Alex") && dbData.some(d => d.name === "Jenil"), "Both Alex and Jenil stored in data/scores.json");

    console.log("\n==========================================================");
    console.log(`END-TO-END PIPELINE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==========================================================");

    server.close(() => {
      process.exit(failed > 0 ? 1 : 0);
    });
    setTimeout(() => process.exit(failed > 0 ? 1 : 0), 500);
  } catch (e) {
    console.error("End-to-end test error:", e);
    server.close();
    process.exit(1);
  }
}

runEndToEnd();
