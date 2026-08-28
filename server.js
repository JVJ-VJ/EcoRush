/**
 * ECO RUSH — Central Event Server & Live SSE Backend
 * Native Node.js (Zero external npm dependencies)
 * Features:
 *  - Persistent File-Backed Database (data/scores.json)
 *  - Real-Time Server-Sent Events (SSE) Broadcast for Cross-Device Synchronization
 *  - REST API for Leaderboard & Stats
 *  - LAN IP Discovery for Mobile Event Access
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'scores.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Active SSE client connections
const sseClients = new Set();

/**
 * Read scores safely from disk
 */
function readScores() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('[SERVER] Error reading scores database:', e);
    return [];
  }
}

/**
 * Write scores safely to disk (atomic replace, max 100 entries)
 */
function writeScores(scores) {
  try {
    const sorted = [...scores].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
    const top100 = sorted.slice(0, 100);
    const tempFile = DB_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(top100, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
    return top100;
  } catch (e) {
    console.error('[SERVER] Error saving scores database:', e);
    return scores;
  }
}

/**
 * Calculate event statistics
 */
function calculateStats(scores) {
  const uniquePlayers = new Set(scores.map(s => String(s.name || '').toLowerCase().trim())).size;
  const topScore = scores.length > 0 ? Math.max(...scores.map(s => Number(s.score) || 0)) : 0;
  const champion = scores.length > 0 ? scores[0] : null;

  return {
    totalGames: scores.length,
    uniquePlayers: uniquePlayers,
    topScore: topScore,
    status: "LIVE",
    champion: champion
  };
}

/**
 * Broadcast payload to all connected SSE clients (Admin dashboards, displays)
 */
function broadcastLeaderboard() {
  const scores = readScores();
  const stats = calculateStats(scores);
  const payload = JSON.stringify({
    type: "LEADERBOARD_UPDATE",
    timestamp: Date.now(),
    scores: scores.slice(0, 20),
    allScoresCount: scores.length,
    stats: stats,
    champion: stats.champion
  });

  const message = `event: message\ndata: ${payload}\n\n`;

  for (const res of sseClients) {
    try {
      res.write(message);
    } catch (err) {
      sseClients.delete(res);
    }
  }
}

/**
 * MIME types for static files
 */
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

/**
 * Find local network IPv4 address for LAN sharing
 */
function getLocalNetworkIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

/**
 * HTTP Request Handler
 */
const server = http.createServer((req, res) => {
  // Global CORS Headers for seamless multi-device / network requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlPath = req.url.split('?')[0];

  // 1. API: GET /api/leaderboard
  if (req.method === 'GET' && urlPath === '/api/leaderboard') {
    const scores = readScores();
    const stats = calculateStats(scores);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: true,
      scores: scores.slice(0, 20),
      allScores: scores,
      stats: stats,
      champion: stats.champion
    }));
    return;
  }

  // 2. API: POST /api/leaderboard
  if (req.method === 'POST' && urlPath === '/api/leaderboard') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const name = String(data.name || '').trim();
        const team = String(data.team || '').trim();
        const age = Number(data.age) || 0;
        const score = Number(data.score);
        const badge = String(data.badge || '').trim();

        if (!name || !team || isNaN(score)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid score submission payload' }));
          return;
        }

        const newEntry = {
          id: 'score_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          name: name,
          team: team,
          age: age,
          score: score,
          badge: badge,
          submittedAt: new Date().toISOString()
        };

        const existingScores = readScores();
        existingScores.push(newEntry);
        const updatedScores = writeScores(existingScores);
        const stats = calculateStats(updatedScores);

        // Immediate broadcast to all connected devices via SSE
        broadcastLeaderboard();

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          entry: newEntry,
          stats: stats
        }));
      } catch (err) {
        console.error('[SERVER] Failed to process POST /api/leaderboard:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Internal Server Error' }));
      }
    });
    return;
  }

  // 3. API: GET /api/leaderboard/stream (Server-Sent Events)
  if (req.method === 'GET' && urlPath === '/api/leaderboard/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    res.write(': connected\n\n');
    sseClients.add(res);

    // Send immediate initial snapshot
    const scores = readScores();
    const stats = calculateStats(scores);
    const initialPayload = JSON.stringify({
      type: "INITIAL_SNAPSHOT",
      timestamp: Date.now(),
      scores: scores.slice(0, 20),
      allScoresCount: scores.length,
      stats: stats,
      champion: stats.champion
    });
    res.write(`event: message\ndata: ${initialPayload}\n\n`);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // 4. Static File Routing
  let filePath = '';
  if (urlPath === '/' || urlPath === '/player') {
    filePath = path.join(__dirname, 'player.html');
  } else if (urlPath === '/admin') {
    filePath = path.join(__dirname, 'admin.html');
  } else {
    filePath = path.join(__dirname, urlPath);
  }

  // Normalize path and prevent directory traversal
  const safePath = path.normalize(filePath);
  if (!safePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(safePath);
    stream.pipe(res);
  });
});

// Periodic SSE Keepalive Heartbeat every 15s
const keepaliveInterval = setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(': keepalive\n\n');
    } catch (e) {
      sseClients.delete(client);
    }
  }
}, 15000);
if (keepaliveInterval.unref) keepaliveInterval.unref();

// Start listening on 0.0.0.0 for multi-device network access
server.listen(PORT, '0.0.0.0', () => {
  const lanIp = getLocalNetworkIp();
  console.log('\n======================================================');
  console.log('   🌍 ECO RUSH EVENT SERVER IS LIVE & READY!         ');
  console.log('======================================================');
  console.log(`📡 Local Host:       http://localhost:${PORT}`);
  console.log(`📱 Player URL (LAN):  http://${lanIp}:${PORT}/player`);
  console.log(`💻 Admin URL (LAN):   http://${lanIp}:${PORT}/admin`);
  console.log('------------------------------------------------------');
  console.log('✨ All devices on the same WiFi network can connect!');
  console.log('======================================================\n');
});

// Export server instance for test suites
module.exports = server;
