/**
 * ECO RUSH — Player Game Engine
 * Preserves 100% of the game logic, scoring, progression, timers, and question flow.
 * Submits final score to the shared event backend upon completing all 40 questions.
 */

(function() {
  let player = "";
  let team = "";
  let age = 0;
  let ri = 0;
  let qi = 0;
  let score = 0;
  let combo = 0;
  let time = 20;
  let timer = null;
  let locked = false;
  let isSubmitting = false;
  let isSubmitted = false;

  function hideAllScreens() {
    document.querySelectorAll(".screen-section").forEach(el => el.classList.add("hidden"));
  }

  function showScreen(id) {
    hideAllScreens();
    const el = document.getElementById(id);
    if (el) el.classList.remove("hidden");
  }

  function home() {
    clearInterval(timer);
    timer = null;
    locked = false;
    isSubmitting = false;
    isSubmitted = false;
    showScreen("home-screen");
  }

  function startGame() {
    const nameInput = document.getElementById("name");
    const teamInput = document.getElementById("team");
    const ageInput = document.getElementById("age");

    player = nameInput ? nameInput.value.trim() : "";
    team = teamInput ? teamInput.value.trim() : "";
    age = ageInput ? Number(ageInput.value) : 0;

    if (!player || !team || !age || age < 1 || age > 120) {
      alert("Please enter your name, team and a valid age.");
      return;
    }

    ri = 0;
    qi = 0;
    score = 0;
    combo = 0;
    isSubmitting = false;
    isSubmitted = false;
    showQuestion();
  }

  function showQuestion() {
    clearInterval(timer);
    timer = null;
    locked = false;
    showScreen("game-screen");

    const qs = BANK[rounds[ri]];
    const q = qs[qi];

    const scoreEl = document.getElementById("score");
    const comboEl = document.getElementById("combo");
    const roundEl = document.getElementById("round");
    const roundNameEl = document.getElementById("roundName");
    const qnumEl = document.getElementById("qnum");
    const questionEl = document.getElementById("question");
    const barEl = document.getElementById("bar");
    const timerEl = document.getElementById("timer");
    const timerContainer = timerEl ? timerEl.closest(".timer-container") : null;

    if (scoreEl) scoreEl.textContent = score;
    if (comboEl) comboEl.textContent = combo;
    if (roundEl) roundEl.textContent = `ROUND ${ri + 1}/5`;
    if (roundNameEl) roundNameEl.textContent = rounds[ri];
    if (qnumEl) qnumEl.textContent = `Question ${qi + 1}/8`;
    if (questionEl) questionEl.textContent = q[0];
    if (barEl) barEl.style.width = `${((ri * 8 + qi) / 40) * 100}%`;

    if (timerContainer) {
      timerContainer.classList.remove("urgent");
    }

    const box = document.getElementById("options");
    if (box) {
      box.innerHTML = "";
      q[1].forEach((o, i) => {
        const b = document.createElement("button");
        b.className = "option-btn";
        b.id = `option-${i}`;
        b.type = "button";
        b.innerHTML = `<span class="opt-prefix">${String.fromCharCode(65 + i)}</span> <span class="opt-text">${EcoStorage.esc(o)}</span>`;
        b.onclick = () => answer(i, false);
        box.appendChild(b);
      });
    }

    time = 20;
    if (timerEl) timerEl.textContent = time;

    timer = setInterval(() => {
      time--;
      if (timerEl) timerEl.textContent = time;
      if (time <= 5 && timerContainer) {
        timerContainer.classList.add("urgent");
      }
      if (time <= 0) {
        clearInterval(timer);
        timer = null;
        answer(-1, true);
      }
    }, 1000);
  }

  function answer(a, timeout) {
    if (locked) return;
    locked = true;
    clearInterval(timer);
    timer = null;

    const q = BANK[rounds[ri]][qi];
    const ok = a === q[2];
    let points = 0;

    if (ok) {
      combo++;
      points = 10 + combo * 2;
      score += points;
    } else {
      combo = 0;
    }

    const resultTitleEl = document.getElementById("resultTitle");
    const resultMsgEl = document.getElementById("resultMsg");
    const resultScoreEl = document.getElementById("resultScore");

    if (resultTitleEl) {
      resultTitleEl.textContent = ok ? "✅ CORRECT!" : (timeout ? "⏰ TIME'S UP!" : "❌ OOPS!");
      resultTitleEl.className = ok ? "result-title success" : "result-title danger";
    }

    if (resultMsgEl) {
      resultMsgEl.innerHTML = ok
        ? `<span class="points-badge">+${points} ⭐</span> &nbsp; <span class="combo-badge">🔥 Combo: ${combo}</span>`
        : `The correct answer was: <strong>${String.fromCharCode(65 + q[2])}. ${EcoStorage.esc(q[1][q[2]])}</strong>`;
    }

    if (resultScoreEl) {
      resultScoreEl.textContent = score;
    }

    showScreen("result-screen");
  }

  function nextQuestion() {
    qi++;
    if (qi >= 8) {
      ri++;
      qi = 0;
      combo = 0;
    }
    if (ri >= 5) {
      finish();
    } else {
      showQuestion();
    }
  }

  async function finish() {
    clearInterval(timer);
    timer = null;

    const badge = EcoStorage.calculateBadge(score);

    showScreen("finish-screen");

    const finalPlayerEl = document.getElementById("finalPlayer");
    const finalScoreEl = document.getElementById("finalScore");
    const badgeEl = document.getElementById("badge");

    if (finalPlayerEl) finalPlayerEl.textContent = `Congratulations, ${player}!`;
    if (finalScoreEl) finalScoreEl.textContent = score;
    if (badgeEl) badgeEl.textContent = badge;

    // Trigger score submission to shared backend
    await handleScoreSubmission(badge);
  }

  async function handleScoreSubmission(badge) {
    if (isSubmitted || isSubmitting) return;
    isSubmitting = true;

    const statusContainer = document.getElementById("submission-status");
    if (statusContainer) {
      statusContainer.innerHTML = '<span class="status-loading">🔄 Saving score to live event leaderboard...</span>';
    }

    try {
      await EcoStorage.submitScore({
        name: player,
        team: team,
        age: age,
        score: score,
        badge: badge
      });

      isSubmitted = true;
      isSubmitting = false;

      if (statusContainer) {
        statusContainer.innerHTML = '<span class="status-success">✅ Score Saved to Live Leaderboard!</span>';
      }
    } catch (err) {
      console.error("Score submission error:", err);
      isSubmitting = false;

      if (statusContainer) {
        statusContainer.innerHTML = `
          <div class="status-error">
            <p>⚠️ Unable to submit score. Please check your connection and try again.</p>
            <button class="btn-retry" type="button" onclick="window.retrySubmission()">🔄 Retry Submission</button>
          </div>
        `;
      }
    }
  }

  async function retrySubmission() {
    const badge = EcoStorage.calculateBadge(score);
    await handleScoreSubmission(badge);
  }

  async function showLeaderboard() {
    clearInterval(timer);
    timer = null;
    showScreen("leaderboard-screen");

    const scoresContainer = document.getElementById("scores");
    if (!scoresContainer) return;

    scoresContainer.innerHTML = '<div class="center" style="padding: 20px;"><p class="text-muted">Loading live leaderboard...</p></div>';

    const data = await EcoStorage.fetchLeaderboard();
    const s = data.scores || [];

    if (!s.length) {
      scoresContainer.innerHTML = '<div class="empty-state"><p class="center">No scores yet!<br>Be the first Planet Protector 🌍</p></div>';
      return;
    }

    const rows = s
      .slice(0, 20)
      .map(
        (x, i) =>
          `<tr>
            <td class="rank-cell">#${i + 1}</td>
            <td class="player-cell">${EcoStorage.esc(x.name)}</td>
            <td class="team-cell">${EcoStorage.esc(x.team)}</td>
            <td class="score-cell">${Number(x.score) || 0}</td>
            <td class="badge-cell">${EcoStorage.esc(x.badge)}</td>
          </tr>`
      )
      .join("");

    scoresContainer.innerHTML = `
      <div class="table-responsive">
        <table class="leader">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Team</th>
              <th>Score</th>
              <th>Badge</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  // Expose globally for HTML elements and testing
  window.startGame = startGame;
  window.showQuestion = showQuestion;
  window.answer = answer;
  window.nextQuestion = nextQuestion;
  window.finish = finish;
  window.retrySubmission = retrySubmission;
  window.showLeaderboard = showLeaderboard;
  window.home = home;

  // Export game state getters for tests
  window._getPlayerState = () => ({ player, team, age, ri, qi, score, combo, time, locked, isSubmitted });
})();
