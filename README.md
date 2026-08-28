# 🌍 ECO RUSH — Multi-Device Live Event Platform

ECO RUSH is an interactive, event-ready environmental gaming and live leaderboard platform designed for live competitions, schools, workshops, and green hackathons.

It supports **multiple concurrent player devices (smartphones, tablets, laptops)** communicating in real-time with an **Admin Control Center** over local WiFi or a hosted server.

---

## 🚀 Quick Start (Running the Event Server)

### 1. Start the Central Backend Server
From the project directory, run:

```bash
node server.js
```

The server will automatically detect your local WiFi / LAN IP address and display:

```text
======================================================
   🌍 ECO RUSH EVENT SERVER IS LIVE & READY!         
======================================================
📡 Local Host:       http://localhost:3000
📱 Player URL (LAN):  http://192.168.x.x:3000/player
💻 Admin URL (LAN):   http://192.168.x.x:3000/admin
------------------------------------------------------
✨ All devices on the same WiFi network can connect!
======================================================
```

### 2. Connect Player Devices
- Have players open `http://<YOUR-LAN-IP>:3000/player` (or scan a QR code pointing to this URL) on their mobile phones or tablets.
- They register their **Name**, **Team**, and **Age**, then complete the 40-question challenge.

### 3. Open Admin Control Center
- Open `http://<YOUR-LAN-IP>:3000/admin` (or `http://localhost:3000/admin` on the host laptop/projector).
- Enter the Event Admin PIN: **`1234`** (or `eco2025`).
- The live leaderboard will automatically receive real-time push updates via **Server-Sent Events (SSE)** whenever any player finishes a game on their device!

---

## 🏗️ Architecture Overview

```text
[ Player Phone 1 ] ──┐
                     │ POST /api/leaderboard (Score Result)
[ Player Phone 2 ] ──┼──────────────────────────────────► [ ECO RUSH SERVER ]
                     │                                     (Node.js server.js)
                     │ GET /api/leaderboard/stream                 │
[ Admin Laptop ]   ──┴◄─────────────────────────────────           ▼
                        (Real-time SSE Broadcast)           [ data/scores.json ]
                                                            (Server Persistence)
```

---

## 📁 File Structure

```text
Eco Rush/
├── server.js              # Central Node.js HTTP + SSE server & static file host
├── data/
│   └── scores.json        # File-backed database (persists across server restarts)
│
├── player.html            # Player registration & 40-question gameplay
├── admin.html             # Admin live event dashboard & leaderboard
├── index.html             # Entry point launcher (routes to /player)
│
├── css/
│   ├── shared.css         # Typography, dark emerald palette & glassmorphism
│   ├── player.css         # Gaming HUD, 20s glowing timer & answer cards
│   └── admin.css          # Metrics grid, champion banner, search/filter & PIN screen
│
├── js/
│   ├── questions.js       # Exact 5-round, 40-question authoritative bank
│   ├── storage.js         # Centralized REST & SSE client synchronization
│   ├── player.js          # Player state machine, 20s timers, locking & scoring
│   └── admin.js           # PIN authentication, live SSE listener, search & filters
│
├── test_multi_device.js   # Multi-device concurrent simulation test (31 passed)
├── test_suite_v2.js       # Core game logic verification test (55 passed)
└── README.md              # Documentation
```

---

## 🎮 Game Rules & Progression (100% Preserved)

- **5 Rounds × 8 Questions = 40 Total Questions**:
  1. `♻️ WASTE WARRIOR`
  2. `💧 WATER RESCUE`
  3. `🌳 FOREST GUARDIAN`
  4. `⚡ ENERGY BATTLE`
  5. `🚨 PLANET FINAL BATTLE`
- **20-Second Countdown**: Each question must be answered within 20s or it times out as incorrect.
- **Scoring Formula**:
  - Correct answer: $\text{Points} = 10 + \text{Combo} \times 2$, $\text{Score} += \text{Points}$, $\text{Combo}++$
  - Incorrect / Timeout: $\text{Combo} = 0$, Score unchanged.
  - Round boundary reset: Combo resets to 0 at the start of each new round.
- **Awarded Badges**:
  - $\ge 450 \text{ pts}$: `👑 Ultimate Planet Protector`
  - $\ge 350 \text{ pts}$: `🌍 Planet Protector`
  - $\ge 250 \text{ pts}$: `🌱 Green Champion`
  - $< 250 \text{ pts}$: `🍃 Eco Explorer`

---

## 🔐 Admin Control Center Features

1. **Client-Side PIN Gate**: Configurable in `js/admin.js` (Default PIN: `1234`).
2. **Real-time Live Synchronization**: Admin dashboard automatically updates when players complete games on other devices via Server-Sent Events (`GET /api/leaderboard/stream`).
3. **Live Event Metrics**: Summary cards for **Total Players** (unique count), **Top Score**, **Games Completed**, and **Status** (`LIVE`).
4. **Current Champion Spotlight**: Instant recognition card for the highest-scoring player.
5. **Real-Time Search & Category Filters**: Search players/teams and filter by badge category dynamically without altering stored scores.
6. **Robust Persistence**: Top 100 entries safely persisted to `data/scores.json` on disk, unaffected by server restarts.
7. **Zero Fake Data**: Shows clean empty states when no scores exist yet (0 players, 0 games, null champion, no NaN).
