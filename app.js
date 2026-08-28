/**
 * ECO RUSH - Exact Functional Implementation & Engine
 * Preserves 100% of game logic, question data, progression, scoring, and storage.
 */

const BANK = {
  "♻️ WASTE WARRIOR": [
    ["A banana peel belongs mainly in:", ["Wet/organic waste", "E-waste", "Glass waste", "Metal waste"], 0],
    ["Your old phone retires. What should you do?", ["Throw it with food waste", "Give it to an e-waste collection point", "Throw it into a river", "Burn it"], 1],
    ["Which is the eco-smart shopping choice?", ["Take a new plastic bag every time", "Carry a reusable bag", "Take five bags just in case", "Throw the bag away immediately"], 1],
    ["A clean glass bottle can often be:", ["Reused or recycled", "Thrown into a river", "Mixed with food waste", "Burned"], 0],
    ["Which is a sneaky waste problem?", ["Repairing things", "Throwing batteries into normal waste", "Reusing containers", "Buying only what you need"], 1],
    ["You have a cardboard box. Best option?", ["Reuse or recycle it", "Pour oil on it", "Throw it in a lake", "Burn it indoors"], 0],
    ["Which habit creates less waste?", ["Repair before replacing", "Replace everything immediately", "Buy unnecessary duplicates", "Throw reusable items away"], 0],
    ["TRICK QUESTION 😈 Recycling is:", ["The only environmental solution", "Useful, but reducing and reusing can come first", "A reason to buy unlimited things", "A way to make waste disappear"], 1]
  ],
  "💧 WATER RESCUE": [
    ["A tap is dripping all day. What should you do?", ["Ignore it", "Fix or report the leak", "Open another tap", "Decorate the tap"], 1],
    ["Rainwater harvesting means:", ["Collecting and storing rainwater", "Making rain fall", "Boiling rain", "Sending rain into drains"], 0],
    ["Which shower habit saves water?", ["Taking shorter showers", "Leaving the shower running", "Taking extra-long showers", "Running the shower for fun"], 0],
    ["Which can reduce garden water use?", ["Watering appropriately", "Flooding the garden", "Leaving a hose running", "Watering the road"], 0],
    ["Why should chemicals not be poured into drains?", ["They can pollute water", "They make rivers cleaner", "They create drinking water", "They help fish breathe"], 0],
    ["A river has lots of plastic. Best long-term solution?", ["Keep adding plastic", "Prevent litter and improve waste collection", "Move the plastic somewhere else", "Ignore it"], 1],
    ["Which is a simple water-saving habit?", ["Turn off the tap while brushing", "Keep the tap running", "Wash one spoon for 20 minutes", "Ignore leaks"], 0],
    ["The city's reservoir is low. Best plan?", ["Waste more water", "Fix leaks and reduce unnecessary use", "Pollute another lake", "Ignore the problem"], 1]
  ],
  "🌳 FOREST GUARDIAN": [
    ["Deforestation means:", ["Loss or removal of forests", "Planting flowers", "Cleaning beaches", "Recycling paper"], 0],
    ["Why are forests important?", ["They support ecosystems and biodiversity", "They create plastic", "They stop all rain", "They remove every pollutant"], 0],
    ["Which action helps wildlife?", ["Protecting habitats", "Destroying nesting areas", "Dumping waste in forests", "Taking wild animals home"], 0],
    ["A healthy tree is blocking your view. Best response?", ["Consider alternatives before cutting it", "Cut every tree", "Pour chemicals on it", "Burn it"], 0],
    ["Which saves paper?", ["Use both sides when practical", "Print everything twice", "Throw unused paper away", "Photocopy blank pages"], 0],
    ["Why isn't planting trees a magic solution?", ["Trees don't matter", "Existing forests and reducing pollution also matter", "Trees cause pollution", "Trees eliminate the need for clean energy"], 1],
    ["When a habitat is destroyed, who can be affected?", ["Local wildlife", "Only rocks", "Only buildings", "Nobody"], 0],
    ["A healthy forest contains:", ["Only one species", "Plants, animals, soil and water working together", "No insects", "Only trees"], 1]
  ],
  "⚡ ENERGY BATTLE": [
    ["Which is renewable energy?", ["Solar energy", "Coal", "Diesel", "Petrol"], 0],
    ["You leave a room for a long time. What should you do?", ["Turn off unnecessary lights", "Turn on more lights", "Leave everything running", "Open the refrigerator"], 0],
    ["For a short trip, which can reduce fuel use?", ["Walk or cycle when safe", "Drive around unnecessarily", "Leave the car idling", "Take a separate car every time"], 0],
    ["Why are LED bulbs useful?", ["They generally use less electricity", "They create coal", "They need no electricity", "They create sunlight"], 0],
    ["Energy efficiency means:", ["Getting the same useful result with less energy", "Wasting electricity", "Using energy for no reason", "Leaving everything switched on"], 0],
    ["A charger isn't being used. What is sensible?", ["Unplug or switch it off when appropriate", "Add more chargers", "Leave it running forever", "Put it in water"], 0],
    ["Which pair is renewable?", ["Wind and solar", "Coal and petrol", "Diesel and coal", "Petrol and gas"], 0],
    ["TRICK QUESTION 😈 Buying something new is:", ["Always greener", "Not necessarily; repair and reuse can be better", "Always pollution-free", "Always better than repairing"], 1]
  ],
  "🚨 PLANET FINAL BATTLE": [
    ["Your city has overflowing waste bins. Best solution?", ["Improve waste reduction, sorting and collection", "Move rubbish to a park", "Burn everything openly", "Throw it into a river"], 0],
    ["A school wants to save electricity. Best plan?", ["Efficient lights + switch-off habits", "Keep every light on", "Buy more extension cords", "Run fans in empty rooms"], 0],
    ["Which plan protects water?", ["Fix leaks and reduce waste", "Use water faster", "Dump waste into drains", "Ignore pollution"], 0],
    ["A forest project wants maximum benefit. Better approach?", ["Protect habitats and plant suitable trees", "Plant random trees everywhere", "Remove wildlife", "Replace forests with plastic trees"], 0],
    ["What is an environmental superpower?", ["One giant action once", "Consistent smart choices and teamwork", "Doing nothing", "Blaming everyone else"], 1],
    ["TRICKY 😈 If something is recyclable, can you throw it anywhere?", ["Yes", "No, proper collection and sorting still matter", "Only into rivers", "Only into food waste"], 1],
    ["Your team has 100 Eco Coins. Best investment?", ["Waste, water, habitat and energy improvements", "Disposable products", "A plastic statue", "A landfill in the playground"], 0],
    ["👑 FINAL BOSS: What can make the biggest difference?", ["The planet is someone else's problem", "Good choices + good systems + teamwork", "Recycling means we can waste anything", "Only one person can save Earth"], 1]
  ]
};

const rounds = Object.keys(BANK);
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

function hideAll() {
  document.querySelectorAll("section").forEach(x => x.classList.add("hidden"));
}

function home() {
  clearInterval(timer);
  timer = null;
  locked = false;
  hideAll();
  const homeEl = document.getElementById("home");
  if (homeEl) {
    homeEl.classList.remove("hidden");
  }
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
  showQuestion();
}

function showQuestion() {
  clearInterval(timer);
  timer = null;
  locked = false;
  hideAll();
  
  const gameEl = document.getElementById("game");
  if (gameEl) gameEl.classList.remove("hidden");

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
  const timerContainer = timerEl ? timerEl.closest(".timer") : null;

  if (scoreEl) scoreEl.textContent = score;
  if (comboEl) comboEl.textContent = combo;
  if (roundEl) roundEl.textContent = `ROUND ${ri + 1}/5`;
  if (roundNameEl) roundNameEl.textContent = rounds[ri];
  if (qnumEl) qnumEl.textContent = `Question ${qi + 1}/8`;
  if (questionEl) questionEl.textContent = q[0];
  if (barEl) barEl.style.width = `${(ri * 8 + qi) / 40 * 100}%`;

  if (timerContainer) {
    timerContainer.classList.remove("urgent");
  }

  const box = document.getElementById("options");
  if (box) {
    box.innerHTML = "";
    q[1].forEach((o, i) => {
      let b = document.createElement("button");
      b.className = "option";
      b.id = `option-${i}`;
      b.textContent = String.fromCharCode(65 + i) + ". " + o;
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
  }

  if (resultMsgEl) {
    resultMsgEl.textContent = ok
      ? `+${points} ⭐   🔥 Combo: ${combo}`
      : `The correct answer was: ${String.fromCharCode(65 + q[2])}. ${q[1][q[2]]}`;
  }

  if (resultScoreEl) {
    resultScoreEl.textContent = score;
  }

  hideAll();
  const resultEl = document.getElementById("result");
  if (resultEl) resultEl.classList.remove("hidden");
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

function finish() {
  clearInterval(timer);
  timer = null;

  let badge = score >= 450
    ? "👑 Ultimate Planet Protector"
    : score >= 350
    ? "🌍 Planet Protector"
    : score >= 250
    ? "🌱 Green Champion"
    : "🍃 Eco Explorer";

  let scores = [];
  try {
    scores = JSON.parse(localStorage.getItem("ecoRushScores") || "[]");
    if (!Array.isArray(scores)) scores = [];
  } catch (e) {
    scores = [];
  }

  scores.push({ name: player, team, age, score, badge });
  scores.sort((a, b) => b.score - a.score);
  
  try {
    localStorage.setItem("ecoRushScores", JSON.stringify(scores.slice(0, 100)));
  } catch (e) {
    console.error("Unable to save to localStorage:", e);
  }

  hideAll();
  const finishEl = document.getElementById("finish");
  if (finishEl) finishEl.classList.remove("hidden");

  const finalPlayerEl = document.getElementById("finalPlayer");
  const finalScoreEl = document.getElementById("finalScore");
  const badgeEl = document.getElementById("badge");

  if (finalPlayerEl) finalPlayerEl.textContent = `Congratulations, ${player}!`;
  if (finalScoreEl) finalScoreEl.textContent = score;
  if (badgeEl) badgeEl.textContent = badge;
}

function showLeaderboard() {
  clearInterval(timer);
  timer = null;
  hideAll();
  
  const lbEl = document.getElementById("leaderboard");
  if (lbEl) lbEl.classList.remove("hidden");

  let s = [];
  try {
    s = JSON.parse(localStorage.getItem("ecoRushScores") || "[]");
    if (!Array.isArray(s)) s = [];
  } catch (e) {
    s = [];
  }

  const scoresContainer = document.getElementById("scores");
  if (!scoresContainer) return;

  if (!s.length) {
    scoresContainer.innerHTML = '<p class="center empty-lead">No scores yet!<br>Be the first Planet Protector 🌍</p>';
    return;
  }

  let rows = s
    .slice(0, 20)
    .map(
      (x, i) =>
        `<tr>
          <td class="rank-cell">#${i + 1}</td>
          <td class="player-cell">${esc(x.name)}</td>
          <td class="team-cell">${esc(x.team)}</td>
          <td class="score-cell">${Number(x.score) || 0}</td>
          <td class="badge-cell">${esc(x.badge)}</td>
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

function esc(s) {
  return String(s).replace(
    /[&<>"']/g,
    m =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[m])
  );
}

// Expose globally for HTML onclick attributes and external runners
window.BANK = BANK;
window.rounds = rounds;
window.startGame = startGame;
window.showQuestion = showQuestion;
window.answer = answer;
window.nextQuestion = nextQuestion;
window.finish = finish;
window.showLeaderboard = showLeaderboard;
window.home = home;
window.esc = esc;
window.hideAll = hideAll;
