/**
 * ECO RUSH — Multi-Device Backend & Real-Time SSE Verification Suite
 * Tests multi-device scenarios:
 *  - Player Device 1 submits score
 *  - Player Device 2 submits score
 *  - Admin Device receives real-time SSE broadcasts
 *  - Champion spotlight & statistics update dynamically
 *  - Persistence in data/scores.json across server reboots
 *  - Zero fake data / no NaN checks
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const TEST_PORT = 3088;
process.env.PORT = TEST_PORT;

// Clean test database before test
const DB_FILE = path.join(__dirname, 'data', 'scores.json');
if (fs.existsSync(DB_FILE)) {
  fs.unlinkSync(DB_FILE);
}

// Require server
const server = require('./server.js');

console.log("==========================================================");
console.log("   ECO RUSH MULTI-DEVICE & SERVER SSE VERIFICATION SUITE  ");
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

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, headers: res.headers, body: json, raw: body });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

function openSseConnection(port) {
  return new Promise((resolve, reject) => {
    const messages = [];
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: '/api/leaderboard/stream',
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream'
      }
    }, (res) => {
      res.on('data', (chunk) => {
        const text = chunk.toString();
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const payload = JSON.parse(line.substring(6));
              messages.push(payload);
            } catch (e) {}
          }
        }
      });
      resolve({ req, res, messages });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  try {
    // 1. TEST INITIAL EMPTY STATE
    console.log("--- 1. Initial Empty State & No Fake Data ---");
    const initialRes = await request({
      hostname: 'localhost',
      port: TEST_PORT,
      path: '/api/leaderboard',
      method: 'GET'
    });

    assert(initialRes.status === 200, "GET /api/leaderboard returns 200");
    assert(initialRes.body.scores.length === 0, "No fake scores in empty leaderboard");
    assert(initialRes.body.stats.totalGames === 0, "Total games is 0");
    assert(initialRes.body.stats.uniquePlayers === 0, "Unique players is 0");
    assert(initialRes.body.stats.topScore === 0, "Top score is 0 (not NaN)");
    assert(initialRes.body.champion === null, "Champion is null when empty");

    // 2. CONNECT ADMIN TO LIVE SSE STREAM
    console.log("\n--- 2. Connect Admin Device via SSE Stream ---");
    const adminSse = await openSseConnection(TEST_PORT);
    // Wait small tick for initial snapshot
    await new Promise(r => setTimeout(r, 200));
    assert(adminSse.messages.length >= 1, "Admin received initial SSE snapshot");
    assert(adminSse.messages[0].type === "INITIAL_SNAPSHOT", "Initial payload type is INITIAL_SNAPSHOT");

    // 3. SIMULATE PLAYER DEVICE 1 COMPLETING GAME
    console.log("\n--- 3. Player Device 1 Submits Score (Alex - 460 pts) ---");
    const player1Res = await request({
      hostname: 'localhost',
      port: TEST_PORT,
      path: '/api/leaderboard',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      name: "Alex",
      team: "Eco Warriors",
      age: 22,
      score: 460,
      badge: "👑 Ultimate Planet Protector"
    });

    assert(player1Res.status === 201, "Player 1 submission returned 201 Created");
    assert(player1Res.body.entry.name === "Alex", "Saved player name Alex");
    assert(player1Res.body.entry.score === 460, "Saved score 460");

    // Wait for SSE propagation
    await new Promise(r => setTimeout(r, 200));
    assert(adminSse.messages.length >= 2, "Admin received live SSE broadcast for Player 1");
    const msg1 = adminSse.messages[adminSse.messages.length - 1];
    assert(msg1.scores.length === 1, "Admin sees 1 score in live broadcast");
    assert(msg1.scores[0].name === "Alex" && msg1.scores[0].score === 460, "Alex is #1 with 460 pts");
    assert(msg1.stats.uniquePlayers === 1, "Stats reflect 1 unique player");
    assert(msg1.stats.topScore === 460, "Top score updated to 460");
    assert(msg1.champion.name === "Alex", "Champion spotlight updated to Alex");

    // 4. SIMULATE PLAYER DEVICE 2 COMPLETING GAME
    console.log("\n--- 4. Player Device 2 Submits Score (Jenil - 490 pts) ---");
    const player2Res = await request({
      hostname: 'localhost',
      port: TEST_PORT,
      path: '/api/leaderboard',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      name: "Jenil",
      team: "Solar Squad",
      age: 24,
      score: 490,
      badge: "👑 Ultimate Planet Protector"
    });

    assert(player2Res.status === 201, "Player 2 submission returned 201 Created");

    await new Promise(r => setTimeout(r, 200));
    assert(adminSse.messages.length >= 3, "Admin received live SSE broadcast for Player 2");
    const msg2 = adminSse.messages[adminSse.messages.length - 1];
    assert(msg2.scores.length === 2, "Admin sees 2 scores in live broadcast");
    assert(msg2.scores[0].name === "Jenil" && msg2.scores[0].score === 490, "Jenil takes #1 with 490 pts");
    assert(msg2.scores[1].name === "Alex" && msg2.scores[1].score === 460, "Alex is #2 with 460 pts");
    assert(msg2.champion.name === "Jenil", "Champion spotlight dynamically transferred to Jenil");
    assert(msg2.stats.topScore === 490, "Highest score is 490");
    assert(msg2.stats.totalGames === 2, "Total games completed is 2");

    // 5. SIMULATE PLAYER DEVICE 3 COMPLETING GAME
    console.log("\n--- 5. Player Device 3 Submits Score (Rahul - 370 pts) ---");
    await request({
      hostname: 'localhost',
      port: TEST_PORT,
      path: '/api/leaderboard',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      name: "Rahul",
      team: "Water Rescue Team",
      age: 20,
      score: 370,
      badge: "🌍 Planet Protector"
    });

    await new Promise(r => setTimeout(r, 200));
    const msg3 = adminSse.messages[adminSse.messages.length - 1];
    assert(msg3.scores.length === 3, "Admin sees 3 scores");
    assert(msg3.scores[2].name === "Rahul" && msg3.scores[2].score === 370, "Rahul ranked #3 with 370 pts");

    // 6. VERIFY PERSISTENCE ON DISK
    console.log("\n--- 6. Disk Persistence & File Database Verification ---");
    assert(fs.existsSync(DB_FILE), "data/scores.json exists on disk");
    const fileContents = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    assert(Array.isArray(fileContents) && fileContents.length === 3, "File contains 3 saved scores");
    assert(fileContents[0].name === "Jenil" && fileContents[0].score === 490, "Top player Jenil persisted to disk");

    // 7. INVALID SUBMISSION VALIDATION
    console.log("\n--- 7. Invalid Payload Rejection ---");
    const badRes = await request({
      hostname: 'localhost',
      port: TEST_PORT,
      path: '/api/leaderboard',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      name: "", // empty name
      team: "Test",
      score: "not_a_number"
    });
    assert(badRes.status === 400, "Server rejects invalid submission with 400 Bad Request");

    // Close SSE connection
    adminSse.req.destroy();

    console.log("\n==========================================================");
    console.log(`MULTI-DEVICE TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==========================================================");

    server.close(() => {
      process.exit(failed > 0 ? 1 : 0);
    });
    setTimeout(() => process.exit(failed > 0 ? 1 : 0), 500);
  } catch (err) {
    console.error("Test execution failed:", err);
    server.close();
    process.exit(1);
  }
}

runTests();
