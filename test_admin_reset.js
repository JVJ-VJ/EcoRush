/**
 * ECO RUSH — Admin Leaderboard Reset Verification Suite
 * Validates:
 *   1. Wrong password rejection (HTTP 401 & no data modified)
 *   2. Server-side password verification (NSS2026)
 *   3. File database data/scores.json cleared to []
 *   4. Real-time SSE broadcast to multiple connected Admin dashboards
 *   5. Non-interruption of active playing players
 *   6. Seamless new submissions into the freshly reset leaderboard
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const TEST_PORT = 3097;
process.env.PORT = TEST_PORT;
process.env.ECO_RUSH_RESET_PASSWORD = "NSS2026";

const DB_FILE = path.join(__dirname, 'data', 'scores.json');
if (fs.existsSync(DB_FILE)) {
  fs.unlinkSync(DB_FILE);
}

// Start Server
const server = require('./server.js');
const ACTUAL_PORT = server.address() ? server.address().port : TEST_PORT;

console.log("==========================================================");
console.log("   ECO RUSH ADMIN LEADERBOARD RESET TEST SUITE            ");
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

async function postJson(pathUrl, data) {
  const payload = JSON.stringify(data);
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: ACTUAL_PORT,
      path: pathUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body || '{}') });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runResetTests() {
  try {
    const storageCode = fs.readFileSync(path.join(__dirname, 'js/storage.js'), 'utf8');
    const adminCode = fs.readFileSync(path.join(__dirname, 'js/admin.js'), 'utf8');

    // 1. POPULATE INITIAL TEST SCORES
    console.log("--- 1. Populate Initial Leaderboard with 3 Players ---");
    await postJson('/api/leaderboard', { name: "Alice", team: "Solar Crew", age: 21, score: 480, badge: "👑 Ultimate Planet Protector" });
    await postJson('/api/leaderboard', { name: "Bob", team: "Wind Team", age: 23, score: 360, badge: "🌍 Planet Protector" });
    await postJson('/api/leaderboard', { name: "Charlie", team: "Eco Squad", age: 20, score: 260, badge: "🌱 Green Champion" });

    // 2. SETUP ADMIN A AND ADMIN B (MULTIPLE DEVICES)
    console.log("\n--- 2. Connect Admin Device A and Admin Device B ---");
    const adminADoc = createDocumentMock([
      'admin-pin-screen', 'admin-dashboard', 'admin-pin-input', 'pin-error',
      'stat-players', 'stat-top-score', 'stat-games', 'stat-status',
      'champion-card', 'admin-live-players', 'live-players-count-badge',
      'admin-scores', 'admin-search', 'btn-refresh', 'reset-modal',
      'reset-password-input', 'reset-error', 'btn-confirm-reset', 'admin-toast'
    ]);

    const adminBDoc = createDocumentMock([
      'admin-pin-screen', 'admin-dashboard', 'admin-pin-input', 'pin-error',
      'stat-players', 'stat-top-score', 'stat-games', 'stat-status',
      'champion-card', 'admin-live-players', 'live-players-count-badge',
      'admin-scores', 'admin-search', 'btn-refresh', 'reset-modal',
      'reset-password-input', 'reset-error', 'btn-confirm-reset', 'admin-toast'
    ]);

    function createAdminSandbox(doc) {
      const store = {};
      const sb = {
        window: {
          location: { protocol: 'http:', origin: `http://localhost:${ACTUAL_PORT}` },
          sessionStorage: {
            getItem: (k) => store[k] || null,
            setItem: (k, v) => { store[k] = String(v); },
            removeItem: (k) => { delete store[k]; }
          },
          localStorage: { getItem: () => null, setItem: () => {} },
          EventSource: NodeEventSourceMock,
          fetch: global.fetch || require('undici').fetch,
          document: doc,
          console: console,
          setTimeout: setTimeout,
          clearTimeout: clearTimeout
        },
        document: doc,
        sessionStorage: {
          getItem: (k) => store[k] || null,
          setItem: (k, v) => { store[k] = String(v); },
          removeItem: (k) => { delete store[k]; }
        },
        localStorage: { getItem: () => null, setItem: () => {} },
        EventSource: NodeEventSourceMock,
        fetch: global.fetch || require('undici').fetch,
        console: console,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout
      };
      vm.createContext(sb);
      vm.runInContext(storageCode, sb);
      vm.runInContext(adminCode, sb);
      return sb;
    }

    const adminASandbox = createAdminSandbox(adminADoc);
    const adminBSandbox = createAdminSandbox(adminBDoc);

    // Unlock Admin A & B
    adminADoc.getElementById('admin-pin-input').value = '1234';
    adminASandbox.window.verifyPin();

    adminBDoc.getElementById('admin-pin-input').value = '1234';
    adminBSandbox.window.verifyPin();

    await new Promise(r => setTimeout(r, 400));

    assert(adminADoc.getElementById('stat-players').textContent == 3, "Admin A sees 3 players");
    assert(adminBDoc.getElementById('stat-players').textContent == 3, "Admin B sees 3 players");
    assert(adminADoc.getElementById('champion-card').innerHTML.includes("Alice"), "Admin A sees Alice as Champion");
    assert(adminBDoc.getElementById('champion-card').innerHTML.includes("Alice"), "Admin B sees Alice as Champion");

    // 3. REGISTER AN ACTIVE PLAYING PLAYER (DAVE)
    console.log("\n--- 3. Register Active Playing Player (Dave) ---");
    await postJson('/api/player/progress', {
      sessionId: 'sess_dave_123',
      name: 'Dave',
      team: 'Water Warriors',
      age: 22,
      currentRound: 2,
      currentQuestion: 3,
      roundName: '💧 WATER RESCUE',
      score: 48,
      combo: 3,
      status: 'PLAYING'
    });

    await new Promise(r => setTimeout(r, 300));
    assert(adminADoc.getElementById('admin-live-players').innerHTML.includes("Dave"), "Admin A sees Dave in Live Players");
    assert(adminBDoc.getElementById('admin-live-players').innerHTML.includes("Dave"), "Admin B sees Dave in Live Players");

    // 4. ATTEMPT RESET WITH WRONG PASSWORD
    console.log("\n--- 4. Attempt Reset with WRONG password (WRONG123) ---");
    adminADoc.getElementById('reset-password-input').value = 'WRONG123';
    await adminASandbox.window.submitResetLeaderboard();

    await new Promise(r => setTimeout(r, 300));

    assert(adminADoc.getElementById('reset-error').textContent.includes("INVALID PASSWORD"), "Admin A UI shows ❌ INVALID PASSWORD");
    assert(adminADoc.getElementById('stat-players').textContent == 3, "Admin A leaderboard remains unchanged (3 players)");
    assert(adminBDoc.getElementById('stat-players').textContent == 3, "Admin B leaderboard remains unchanged (3 players)");

    const scoresBeforeReset = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    assert(scoresBeforeReset.length === 3, "data/scores.json still contains 3 scores after rejected reset");

    // 5. ATTEMPT RESET WITH EMPTY PASSWORD
    console.log("\n--- 5. Attempt Reset with Empty Password ---");
    adminADoc.getElementById('reset-password-input').value = '';
    await adminASandbox.window.submitResetLeaderboard();
    assert(adminADoc.getElementById('reset-error').textContent.includes("Please enter the reset password"), "Empty password rejected client-side");

    // 6. PERFORM SUCCESSFUL RESET WITH NSS2026 FROM ADMIN A
    console.log("\n--- 6. Perform Successful Reset with NSS2026 from Admin A ---");
    adminADoc.getElementById('reset-password-input').value = 'NSS2026';
    await adminASandbox.window.submitResetLeaderboard();

    await new Promise(r => setTimeout(r, 600));

    // Verify Server Disk Database
    const scoresAfterReset = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    assert(Array.isArray(scoresAfterReset) && scoresAfterReset.length === 0, "data/scores.json is cleared to [] on disk");

    // Verify Admin A UI Auto-Updated via SSE
    assert(adminADoc.getElementById('stat-players').textContent == 0, "Admin A Total Players updated to 0");
    assert(adminADoc.getElementById('stat-top-score').textContent == 0, "Admin A Top Score updated to 0");
    assert(adminADoc.getElementById('stat-games').textContent == 0, "Admin A Games Completed updated to 0");
    assert(adminADoc.getElementById('champion-card').innerHTML.includes("No Current Champion"), "Admin A Champion spotlight shows 'No Current Champion'");
    assert(adminADoc.getElementById('admin-scores').innerHTML.includes("NO COMPLETED GAMES YET"), "Admin A Leaderboard table shows 'NO COMPLETED GAMES YET'");

    // Verify Admin B (Other Device) Auto-Updated via SSE without refreshing
    assert(adminBDoc.getElementById('stat-players').textContent == 0, "Admin B (Device 2) Total Players auto-updated to 0 via SSE");
    assert(adminBDoc.getElementById('stat-top-score').textContent == 0, "Admin B (Device 2) Top Score auto-updated to 0 via SSE");
    assert(adminBDoc.getElementById('stat-games').textContent == 0, "Admin B (Device 2) Games Completed auto-updated to 0 via SSE");
    assert(adminBDoc.getElementById('champion-card').innerHTML.includes("No Current Champion"), "Admin B (Device 2) Champion auto-updated to 'No Current Champion'");
    assert(adminBDoc.getElementById('admin-scores').innerHTML.includes("NO COMPLETED GAMES YET"), "Admin B (Device 2) Leaderboard table auto-updated to empty");

    // Verify Active Players NOT Interrupted
    assert(adminADoc.getElementById('admin-live-players').innerHTML.includes("Dave"), "Active player Dave still present in Admin A Live Players table");
    assert(adminBDoc.getElementById('admin-live-players').innerHTML.includes("Dave"), "Active player Dave still present in Admin B Live Players table");

    // 7. ACTIVE PLAYER DAVE FINISHES GAME AFTER RESET
    console.log("\n--- 7. Dave Finishes Game and Submits New Score After Reset ---");
    await postJson('/api/leaderboard', {
      name: "Dave",
      team: "Water Warriors",
      age: 22,
      score: 500,
      badge: "👑 Ultimate Planet Protector",
      sessionId: "sess_dave_123"
    });

    await new Promise(r => setTimeout(r, 600));

    // Verify Dave is removed from Live Players and crowned #1 in Completed Leaderboard
    assert(!adminADoc.getElementById('admin-live-players').innerHTML.includes("Dave"), "Dave removed from Live Players after game completion");
    assert(adminADoc.getElementById('stat-players').textContent == 1, "Admin A shows 1 player in new leaderboard");
    assert(adminADoc.getElementById('stat-top-score').textContent == 500, "Admin A shows top score 500 ⭐");
    assert(adminADoc.getElementById('champion-card').innerHTML.includes("Dave"), "Dave crowned Champion in Admin A");
    assert(adminBDoc.getElementById('champion-card').innerHTML.includes("Dave"), "Dave crowned Champion in Admin B via SSE");

    console.log("\n==========================================================");
    console.log(`ADMIN RESET VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==========================================================");

    server.close(() => {
      process.exit(failed > 0 ? 1 : 0);
    });
    setTimeout(() => process.exit(failed > 0 ? 1 : 0), 500);
  } catch (e) {
    console.error("Admin reset test error:", e);
    server.close();
    process.exit(1);
  }
}

runResetTests();
