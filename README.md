# 🌍 ECO RUSH — Event Gaming & Live Leaderboard Platform

ECO RUSH is an interactive, event-ready environmental quiz game designed for live competitions, schools, workshops, and green hackathons.

---

## 🚀 Quick Start

Open either page directly in any modern browser:

- **Player Experience**: Open [`player.html`](player.html) or [`index.html`](index.html)
- **Admin Control Center**: Open [`admin.html`](admin.html)

> Default Event Admin PIN: **`1234`** (or `eco2025`)

---

## 📁 Architecture & File Layout

```text
Eco Rush/
├── player.html            # Dedicated player registration & 40-question gameplay
├── admin.html             # Event control center & live syncing leaderboard
├── index.html             # Unified launcher redirecting to player.html
│
├── css/
│   ├── shared.css         # Typography, dark emerald palette & glassmorphism
│   ├── player.css         # Player HUD, 20s glowing timer & gaming cards
│   └── admin.css          # Metrics grid, champion banner & leaderboard table
│
├── js/
│   ├── questions.js       # Exact 5-round, 40-question authoritative bank
│   ├── storage.js         # Centralized localStorage API ("ecoRushScores")
│   ├── player.js          # Player engine, timers, scoring & combo streak
│   └── admin.js           # PIN authentication, live search, filters & sync
│
├── test_suite_v2.js       # Automated verification test suite
└── README.md              # Documentation
```

---

## 🎮 Game Rules & Progression

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

1. **Security Gate**: Protected by client-side event PIN (configured in `js/admin.js`).
2. **Real-time Live Synchronization**: Admin dashboard automatically updates when players complete games in other browser tabs on the same origin via `window.addEventListener('storage', ...)`.
3. **Event Metrics**: Real-time stats for Total Players, Top Score, Games Completed, and Live Status.
4. **Current Champion Spotlight**: Instant recognition banner for the highest-scoring participant.
5. **Search & Filter**: Search players/teams and filter by badge category dynamically without altering stored scores.
6. **Persistence**: Scores saved under `ecoRushScores` (top 100 preserved, top 20 displayed).
