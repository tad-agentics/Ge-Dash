const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const previewCanvas = document.querySelector("#characterPreview");
const previewCtx = previewCanvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const bestEl = document.querySelector("#bestScore");
const levelEl = document.querySelector("#level");
const levelProgressEl = document.querySelector("#levelProgress");
const messageEl = document.querySelector("#gameMessage");
const restartButton = document.querySelector("#restartButton");
const soundButton = document.querySelector("#soundButton");
const fullscreenButton = document.querySelector("#fullscreenButton");
const gameShell = document.querySelector(".game-shell");
const playerNameDisplay = document.querySelector("#playerNameDisplay");
const playerNameInput = document.querySelector("#playerNameInput");
const characterButton = document.querySelector("#characterButton");
const leaderboardButton = document.querySelector("#leaderboardButton");
const characterModal = document.querySelector("#characterModal");
const leaderboardModal = document.querySelector("#leaderboardModal");
const closeCharacter = document.querySelector("#closeCharacter");
const closeLeaderboard = document.querySelector("#closeLeaderboard");
const saveCharacter = document.querySelector("#saveCharacter");
const clearLeaderboard = document.querySelector("#clearLeaderboard");
const presetOptions = document.querySelector("#presetOptions");
const shapeOptions = document.querySelector("#shapeOptions");
const faceOptions = document.querySelector("#faceOptions");
const colorOptions = document.querySelector("#colorOptions");
const characterSummary = document.querySelector("#characterSummary");
const leaderboardList = document.querySelector("#leaderboardList");
const leaderboardEmpty = document.querySelector("#leaderboardEmpty");

const W = canvas.width;
const H = canvas.height;
const groundY = 445;
const TOTAL_LEVELS = 62;
const LEVEL_DURATION = 20;
const POINTS_PER_SECOND = 10;
const LEADERBOARD_LIMIT = 10;
const GATE_LEAD_TIME = 2.4;
const WARP_DURATION = 0.9;
const PLAYER_START_X = 150;
const STORAGE = {
  best: "khoiDashBest",
  unlocked: "khoiDashUnlocked",
  character: "khoiDashCharacter",
  leaderboard: "khoiDashLeaderboard",
};

const SHAPES = [
  { id: "square", label: "Square" },
  { id: "circle", label: "Circle" },
  { id: "triangle", label: "Triangle" },
  { id: "diamond", label: "Diamond" },
  { id: "hexagon", label: "Hexagon" },
  { id: "star", label: "Star" },
];

const FACES = [
  { id: "smile", label: "Smile" },
  { id: "wink", label: "Wink" },
  { id: "surprised", label: "Surprised" },
  { id: "cool", label: "Cool" },
  { id: "silly", label: "Silly" },
  { id: "determined", label: "Determined" },
];

const COLORS = [
  { id: "teal", label: "Teal", value: "#76f7d2" },
  { id: "pink", label: "Pink", value: "#ff5ea8" },
  { id: "yellow", label: "Yellow", value: "#ffe66d" },
  { id: "sky", label: "Sky", value: "#7f94ff" },
  { id: "lavender", label: "Lavender", value: "#c9a0ff" },
  { id: "orange", label: "Orange", value: "#ff9f43" },
];

const PRESETS = [
  { id: "dash", name: "Dash", shape: "square", face: "smile", color: "teal" },
  { id: "spike", name: "Spike", shape: "triangle", face: "determined", color: "pink" },
  { id: "orbit", name: "Orbit", shape: "circle", face: "cool", color: "yellow" },
  { id: "prism", name: "Prism", shape: "diamond", face: "surprised", color: "sky" },
  { id: "hex", name: "Hex", shape: "hexagon", face: "wink", color: "lavender" },
  { id: "nova", name: "Nova", shape: "star", face: "silly", color: "orange" },
];

const player = { x: 150, y: groundY - 46, size: 46, velocityY: 0, rotation: 0, scale: 1, alpha: 1 };
let jumpsUsed = 0;
let obstacles = [];
let birds = [];
let particles = [];
let suctionParticles = [];
let quantumGate = null;
let warpTime = 0;
let distanceToBird = 500;
let levelStartScore = 0;
let birdHitFlash = 0;
let state = "ready";
let score = 0;
let levelTime = 0;
let currentLevel = Math.min(TOTAL_LEVELS, Math.max(1, Number(localStorage.getItem(STORAGE.unlocked) || 1)));
let speed = 7;
let distanceToNext = 430;
let lastTime = 0;
let soundOn = true;
let audioContext;
let best = Number(localStorage.getItem(STORAGE.best) || 0);
let character = loadCharacter();
let draftCharacter = { ...character };

bestEl.textContent = best;
levelEl.textContent = currentLevel;
messageEl.querySelector("h2").textContent = `Level ${currentLevel} of ${TOTAL_LEVELS}`;
updatePlayerNameDisplay();

function defaultCharacter() {
  return { name: "Dash", shape: "square", face: "smile", color: "teal", preset: "dash" };
}

function loadCharacter() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE.character) || "null");
    if (!saved) return defaultCharacter();
    const shapeOk = SHAPES.some((item) => item.id === saved.shape);
    const faceOk = FACES.some((item) => item.id === saved.face);
    const colorOk = COLORS.some((item) => item.id === saved.color);
    const name = String(saved.name || "Dash").trim().slice(0, 16) || "Dash";
    return {
      name,
      shape: shapeOk ? saved.shape : "square",
      face: faceOk ? saved.face : "smile",
      color: colorOk ? saved.color : "teal",
      preset: typeof saved.preset === "string" ? saved.preset : null,
    };
  } catch {
    return defaultCharacter();
  }
}

function saveCharacterData(next) {
  character = {
    ...next,
    name: String(next.name || "Dash").trim().slice(0, 16) || "Dash",
  };
  localStorage.setItem(STORAGE.character, JSON.stringify(character));
  updatePlayerNameDisplay();
}

function updatePlayerNameDisplay() {
  playerNameDisplay.textContent = character.name;
}

function getColor(colorId) {
  return COLORS.find((item) => item.id === colorId)?.value || COLORS[0].value;
}

function getLabel(list, id) {
  return list.find((item) => item.id === id)?.label || id;
}

function loadLeaderboard() {
  try {
    const rows = JSON.parse(localStorage.getItem(STORAGE.leaderboard) || "[]");
    if (!Array.isArray(rows)) return [];
    return rows
      .filter((row) => row && typeof row.score === "number" && row.name)
      .slice(0, LEADERBOARD_LIMIT);
  } catch {
    return [];
  }
}

function saveLeaderboard(rows) {
  localStorage.setItem(STORAGE.leaderboard, JSON.stringify(rows.slice(0, LEADERBOARD_LIMIT)));
}

function submitScore(finalScore, levelReached) {
  const entry = {
    name: character.name,
    score: Math.floor(finalScore),
    level: levelReached,
    shape: character.shape,
    face: character.face,
    color: character.color,
    at: Date.now(),
  };
  const rows = loadLeaderboard();
  rows.push(entry);
  rows.sort((a, b) => b.score - a.score || b.level - a.level || a.at - b.at);
  saveLeaderboard(rows);
  return rows.findIndex((row) => row.at === entry.at) + 1;
}

function beep(frequency, duration, volume = 0.05) {
  if (!soundOn) return;
  audioContext ??= new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.frequency.value = frequency;
  oscillator.type = "square";
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function levelDifficulty() {
  return (currentLevel - 1) / Math.max(1, TOTAL_LEVELS - 1);
}

function scheduleNextBird() {
  const difficulty = levelDifficulty();
  // Keep early levels mostly bird-free; appear as occasional mid/late hazards.
  if (difficulty < 0.12) {
    distanceToBird = Number.POSITIVE_INFINITY;
    return;
  }
  const minGap = 1100 - difficulty * 350;
  const spread = 1600 - difficulty * 700;
  distanceToBird = minGap + Math.random() * Math.max(400, spread);
  // Sometimes skip an extra beat so packs don't feel constant.
  if (Math.random() > 0.35 + difficulty * 0.4) {
    distanceToBird += 500 + Math.random() * 700;
  }
}

function spawnBird() {
  const difficulty = levelDifficulty();
  const flockChance = Math.max(0, (difficulty - 0.45) * 0.45);
  const count = Math.random() < flockChance ? (Math.random() < difficulty * 0.3 ? 3 : 2) : 1;
  const baseY = groundY - (95 + Math.random() * (110 + difficulty * 90));
  const dive = Math.random() < difficulty * 0.35;
  for (let i = 0; i < count; i++) {
    birds.push({
      x: W + 50 + i * 34,
      y: baseY + (i - (count - 1) / 2) * 26,
      width: 34,
      height: 22,
      wing: Math.random() * Math.PI * 2,
      bob: Math.random() * Math.PI * 2,
      extraSpeed: 1.2 + difficulty * 3.8 + Math.random() * (1 + difficulty * 2),
      dive,
      divePhase: 0,
    });
  }
  scheduleNextBird();
}

function overlapsBird(bird) {
  const pad = 6;
  return (
    player.x + player.size - pad > bird.x &&
    player.x + pad < bird.x + bird.width &&
    player.y + player.size - pad > bird.y &&
    player.y + pad < bird.y + bird.height
  );
}

function burstFeathers(atX, atY) {
  for (let i = 0; i < 14; i++) {
    particles.push({
      x: atX,
      y: atY,
      vx: (Math.random() - 0.5) * 8,
      vy: -Math.random() * 6 - 1,
      life: 0.8 + Math.random() * 0.5,
      feather: true,
    });
  }
}

function bounceToLevelStart() {
  const hitX = player.x + player.size / 2;
  const hitY = player.y + player.size / 2;
  burstFeathers(hitX, hitY);
  beep(180, 0.12, 0.07);
  beep(140, 0.18, 0.06);

  birds = [];
  obstacles = [];
  suctionParticles = [];
  quantumGate = null;
  warpTime = 0;
  levelTime = 0;
  score = levelStartScore;
  scheduleNextBird();
  distanceToNext = 280 + Math.random() * 120;
  Object.assign(player, {
    x: PLAYER_START_X,
    y: groundY - player.size,
    velocityY: 0,
    rotation: 0,
    scale: 1,
    alpha: 1,
  });
  jumpsUsed = 0;
  birdHitFlash = 1;
  scoreEl.textContent = Math.floor(score);
  levelProgressEl.style.width = "0%";
}

function startLevel(resetScore = false) {
  obstacles = [];
  birds = [];
  particles = [];
  suctionParticles = [];
  quantumGate = null;
  warpTime = 0;
  birdHitFlash = 0;
  if (resetScore) score = 0;
  levelStartScore = score;
  levelTime = 0;
  speed = 6.5 + levelDifficulty() * 5.5;
  distanceToNext = 430;
  scheduleNextBird();
  Object.assign(player, {
    x: PLAYER_START_X,
    y: groundY - player.size,
    velocityY: 0,
    rotation: 0,
    scale: 1,
    alpha: 1,
  });
  jumpsUsed = 0;
  scoreEl.textContent = Math.floor(score);
  levelEl.textContent = currentLevel;
  levelProgressEl.style.width = "0%";
  state = "playing";
  messageEl.classList.add("hidden");
}

function act() {
  if (characterModal.classList.contains("hidden") === false) return;
  if (leaderboardModal.classList.contains("hidden") === false) return;
  if (state === "warping") return;
  if (state !== "playing") return startLevel(["ready", "over", "complete", "finished"].includes(state));
  if (jumpsUsed < 2) {
    player.velocityY = jumpsUsed === 0 ? -17.2 : -14.5;
    jumpsUsed += 1;
    beep(jumpsUsed === 1 ? 560 : 760, 0.08);
    for (let i = 0; i < 7; i++) {
      particles.push({
        x: player.x + 15,
        y: groundY,
        vx: -Math.random() * 3,
        vy: -Math.random() * 3,
        life: 1,
      });
    }
  }
}

function spawnQuantumGate() {
  const travel = Math.max(420, speed * 60 * 1.35);
  quantumGate = {
    x: player.x + player.size / 2 + travel,
    cy: groundY - 110,
    rx: 42,
    ry: 110,
    spin: 0,
    open: 0,
    pulse: 0,
  };
  distanceToNext = Number.POSITIVE_INFINITY;
  distanceToBird = Number.POSITIVE_INFINITY;
  birds = [];
  obstacles = obstacles.filter((o) => o.x + o.width < quantumGate.x - 120);
  beep(420, 0.12, 0.06);
  beep(640, 0.18, 0.05);
}

function spawnSuctionBurst(count, strength = 1) {
  if (!quantumGate) return;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 40 + Math.random() * 160 * strength;
    suctionParticles.push({
      x: quantumGate.x + Math.cos(angle) * radius,
      y: quantumGate.cy + Math.sin(angle) * radius * 0.72,
      angle,
      radius,
      spin: (Math.random() < 0.5 ? -1 : 1) * (0.04 + Math.random() * 0.08),
      size: 2 + Math.random() * 5,
      life: 0.55 + Math.random() * 0.7,
      hue: Math.random(),
    });
  }
}

function beginWarp() {
  if (state === "warping") return;
  state = "warping";
  warpTime = 0;
  jumpsUsed = 2;
  player.velocityY = 0;
  obstacles = [];
  birds = [];
  spawnSuctionBurst(28, 1.2);
  beep(520, 0.1, 0.06);
  beep(760, 0.12, 0.06);
  beep(980, 0.2, 0.07);
}

function updateSuctionParticles(dt) {
  if (!quantumGate) {
    suctionParticles = [];
    return;
  }
  suctionParticles.forEach((p) => {
    p.angle += p.spin * dt;
    p.radius = Math.max(2, p.radius - (8 + p.radius * 0.12) * dt);
    p.x = quantumGate.x + Math.cos(p.angle) * p.radius;
    p.y = quantumGate.cy + Math.sin(p.angle) * p.radius * 0.68;
    p.life -= 0.018 * dt;
  });
  suctionParticles = suctionParticles.filter((p) => p.life > 0 && p.radius > 2);
}

function updateGate(dt, elapsedSeconds) {
  if (!quantumGate) return;
  quantumGate.spin += 0.08 * dt;
  quantumGate.pulse += elapsedSeconds * 6;
  quantumGate.open = Math.min(1, quantumGate.open + elapsedSeconds * 2.2);
  quantumGate.x -= speed * dt;

  const playerCenterX = player.x + player.size / 2;
  const playerCenterY = player.y + player.size / 2;
  const dx = quantumGate.x - playerCenterX;
  const pullRange = 340;
  const proximity = Math.max(0, 1 - Math.max(0, dx) / pullRange);

  if (dx > -player.size * 0.2) {
    const runBoost = 2.2 + proximity * 7.5;
    player.x += runBoost * dt;
    player.y += (quantumGate.cy - playerCenterY) * proximity * 0.06 * dt;
    if (proximity > 0.15 && Math.random() < proximity * 0.55 * dt) spawnSuctionBurst(2 + Math.floor(proximity * 3), 0.7 + proximity);
    if (proximity > 0.4 && Math.floor(quantumGate.pulse * 3) !== Math.floor((quantumGate.pulse - elapsedSeconds * 6) * 3)) {
      beep(280 + proximity * 620, 0.035, 0.02);
    }
  }

  if (dx < player.size * 0.3 && Math.abs(playerCenterY - quantumGate.cy) < quantumGate.ry * 0.9) {
    beginWarp();
  } else if (quantumGate.x < player.x - 20) {
    beginWarp();
  }
}

function updateWarp(dt, elapsedSeconds) {
  if (!quantumGate) {
    completeLevel();
    return;
  }
  warpTime += elapsedSeconds;
  quantumGate.spin += 0.22 * dt;
  quantumGate.pulse += elapsedSeconds * 10;
  quantumGate.x -= speed * 0.25 * dt;

  const targetX = quantumGate.x - player.size / 2;
  const targetY = quantumGate.cy - player.size / 2;
  player.x += (targetX - player.x) * Math.min(1, 0.18 * dt);
  player.y += (targetY - player.y) * Math.min(1, 0.18 * dt);
  player.rotation += 0.35 * dt;
  player.scale = Math.max(0.05, 1 - warpTime / WARP_DURATION);
  player.alpha = Math.max(0, 1 - (warpTime / WARP_DURATION) * 1.1);
  if (Math.random() < 0.8 * dt) spawnSuctionBurst(3, 1.4);
  updateSuctionParticles(dt);

  if (warpTime >= WARP_DURATION) completeLevel();
}

function endGame() {
  state = "over";
  quantumGate = null;
  birds = [];
  suctionParticles = [];
  player.scale = 1;
  player.alpha = 1;
  beep(110, 0.3, 0.08);
  const finalScore = Math.floor(score);
  best = Math.max(best, finalScore);
  localStorage.setItem(STORAGE.best, best);
  bestEl.textContent = best;
  const rank = submitScore(finalScore, currentLevel);
  const rankText = rank > 0 && rank <= LEADERBOARD_LIMIT ? ` · Board #${rank}` : "";
  messageEl.innerHTML = `<p class="message-kicker">Level ${currentLevel}</p><h2>Try again!</h2><p>${finalScore} points${rankText} · Tap, click, or press <kbd>Space</kbd></p>`;
  messageEl.classList.remove("hidden");
}

function completeLevel() {
  state = "complete";
  obstacles = [];
  birds = [];
  suctionParticles = [];
  quantumGate = null;
  player.scale = 1;
  player.alpha = 1;
  beep(880, 0.25, 0.07);
  const finalScore = Math.floor(score);
  best = Math.max(best, finalScore);
  localStorage.setItem(STORAGE.best, best);
  bestEl.textContent = best;
  if (currentLevel === TOTAL_LEVELS) {
    state = "finished";
    const rank = submitScore(finalScore, currentLevel);
    const rankText = rank > 0 && rank <= LEADERBOARD_LIMIT ? ` · Board #${rank}` : "";
    messageEl.innerHTML = `<p class="message-kicker">All 62 levels complete!</p><h2>You are a Dash Master!</h2><p>Final score: ${finalScore}${rankText} · Tap to play level 62 again</p>`;
  } else {
    const completedLevel = currentLevel;
    currentLevel += 1;
    localStorage.setItem(STORAGE.unlocked, currentLevel);
    levelEl.textContent = currentLevel;
    messageEl.innerHTML = `<p class="message-kicker">Quantum gate cleared!</p><h2>Level ${completedLevel} → ${currentLevel}</h2><p>Tap, click, or press <kbd>Space</kbd> to dash on</p>`;
  }
  messageEl.classList.remove("hidden");
}

function spawnSpikeCluster() {
  const difficulty = levelDifficulty();
  const clusterSize = Math.random() < difficulty * 0.55 ? (Math.random() < difficulty * 0.3 ? 3 : 2) : 1;
  const spikeWidth = 40;
  obstacles.push({
    type: "spike",
    x: W + 30,
    width: spikeWidth * clusterSize,
    height: 42 + difficulty * 10,
  });
  const minGap = 245 - difficulty * 45;
  const randomGap = 260 - difficulty * 100;
  distanceToNext = minGap + Math.random() * randomGap;
}

function spawnStaircase() {
  const difficulty = levelDifficulty();
  let x = W + 50;
  const spikeWidth = 36;
  const spikePairWidth = spikeWidth * 2;
  const spikeHeight = 40 + difficulty * 8;
  // Ascending steps: short → mid → tall, with 2 spikes in each gap.
  const steps = [
    { width: 68, height: 74 },
    { width: 96, height: 138 },
    { width: 124, height: 205 },
  ];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    obstacles.push({ type: "block", x, width: step.width, height: step.height });
    x += step.width + 4;
    if (i < steps.length - 1) {
      obstacles.push({ type: "spike", x, width: spikePairWidth, height: spikeHeight });
      x += spikePairWidth + 4;
    }
  }

  distanceToNext = 340 + Math.random() * (240 - difficulty * 90);
}

function spawnObstacle() {
  const difficulty = levelDifficulty();
  if (Math.random() < 0.42 + difficulty * 0.28) spawnStaircase();
  else spawnSpikeCluster();
}

function overlapsSpike(o) {
  if (o.type !== "spike") return false;
  const pad = 8;
  return player.x + player.size - pad > o.x && player.x + pad < o.x + o.width && player.y + player.size - 5 > groundY - o.height;
}

function blockTop(o) {
  return groundY - o.height;
}

function isLandingOnBlock(o) {
  if (o.type !== "block" || player.velocityY < 0) return false;
  const pad = 6;
  const top = blockTop(o);
  const foot = player.y + player.size;
  const overlapsX = player.x + player.size - pad > o.x && player.x + pad < o.x + o.width;
  return overlapsX && foot >= top && foot <= top + 18 && player.y < top;
}

function overlapsBlockBody(o) {
  if (o.type !== "block") return false;
  const pad = 8;
  const top = blockTop(o);
  const foot = player.y + player.size;
  if (foot <= top + 3) return false;
  if (Math.abs(foot - top) <= 10 && player.velocityY >= 0) return false;
  return (
    player.x + player.size - pad > o.x &&
    player.x + pad < o.x + o.width &&
    player.y + player.size - pad > top &&
    player.y + pad < groundY
  );
}

function resolvePlatformLanding() {
  for (const o of obstacles) {
    if (!isLandingOnBlock(o)) continue;
    player.y = blockTop(o) - player.size;
    player.velocityY = 0;
    jumpsUsed = 0;
    player.rotation = Math.round(player.rotation / (Math.PI / 2)) * (Math.PI / 2);
    return true;
  }
  return false;
}

function updateBirds(dt) {
  const difficulty = levelDifficulty();
  birds.forEach((bird) => {
    bird.x -= (speed + bird.extraSpeed) * dt;
    bird.wing += (0.35 + difficulty * 0.2) * dt;
    bird.bob += 0.12 * dt;
    bird.y += Math.sin(bird.bob) * 0.55 * dt;
    if (bird.dive) {
      bird.divePhase += 0.05 * dt;
      bird.y += Math.sin(bird.divePhase) * (0.8 + difficulty * 1.4) * dt;
    }
  });
  birds = birds.filter((bird) => bird.x + bird.width > -40);
  if (birds.some(overlapsBird)) {
    bounceToLevelStart();
  }
}

function update(dt, elapsedSeconds) {
  if (state === "warping") {
    updateWarp(dt, elapsedSeconds);
    return;
  }
  if (state !== "playing") return;

  if (birdHitFlash > 0) birdHitFlash = Math.max(0, birdHitFlash - elapsedSeconds * 2.2);

  player.velocityY += 0.92 * dt;
  player.y += player.velocityY * dt;

  const onPlatform = resolvePlatformLanding();
  if (!onPlatform && player.y >= groundY - player.size) {
    player.y = groundY - player.size;
    player.velocityY = 0;
    jumpsUsed = 0;
    player.rotation = Math.round(player.rotation / (Math.PI / 2)) * (Math.PI / 2);
  } else if (!onPlatform) {
    player.rotation += 0.09 * dt;
  }

  if (!quantumGate) {
    distanceToNext -= speed * dt;
    if (distanceToNext <= 0) spawnObstacle();
    distanceToBird -= speed * dt;
    if (distanceToBird <= 0) spawnBird();
  }

  obstacles.forEach((o) => {
    o.x -= speed * dt;
  });
  obstacles = obstacles.filter((o) => o.x + o.width > -20);

  // Keep standing on platforms after they scroll under the player.
  if (player.velocityY >= 0) resolvePlatformLanding();

  if (obstacles.some(overlapsSpike) || obstacles.some(overlapsBlockBody)) {
    endGame();
    return;
  }

  updateBirds(dt);

  particles.forEach((p) => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 0.15 * dt;
    p.life -= 0.025 * dt;
  });
  particles = particles.filter((p) => p.life > 0);

  if (!quantumGate) {
    levelTime += elapsedSeconds;
    score += POINTS_PER_SECOND * elapsedSeconds;
    scoreEl.textContent = Math.floor(score);
    levelProgressEl.style.width = `${Math.min(100, (levelTime / LEVEL_DURATION) * 100)}%`;
    if (levelTime >= LEVEL_DURATION - GATE_LEAD_TIME) spawnQuantumGate();
  } else {
    levelProgressEl.style.width = "100%";
    birds = [];
    updateGate(dt, elapsedSeconds);
    updateSuctionParticles(dt);
  }
}

function drawBackground(time) {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, "#151f51");
  gradient.addColorStop(1, "#54226c");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = "#7f94ff";
  ctx.lineWidth = 2;
  const offset = (time * 0.02) % 80;
  for (let x = -80 - offset; x < W + 80; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 180, groundY);
    ctx.stroke();
  }
  for (let y = 45; y < groundY; y += 55) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#10162f";
  ctx.fillRect(0, groundY, W, H - groundY);
  ctx.fillStyle = getColor(character.color);
  ctx.fillRect(0, groundY, W, 7);
  ctx.fillStyle = "#1d2a51";
  for (let x = -((time * speed * 0.03) % 48); x < W; x += 48) ctx.fillRect(x, groundY + 22, 26, 8);
}

function drawShapePath(target, size, shape) {
  const half = size / 2;
  target.beginPath();
  switch (shape) {
    case "circle":
      target.arc(0, 0, half, 0, Math.PI * 2);
      break;
    case "triangle":
      target.moveTo(0, -half);
      target.lineTo(half, half * 0.85);
      target.lineTo(-half, half * 0.85);
      target.closePath();
      break;
    case "diamond":
      target.moveTo(0, -half);
      target.lineTo(half, 0);
      target.lineTo(0, half);
      target.lineTo(-half, 0);
      target.closePath();
      break;
    case "hexagon": {
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const x = Math.cos(angle) * half;
        const y = Math.sin(angle) * half;
        if (i === 0) target.moveTo(x, y);
        else target.lineTo(x, y);
      }
      target.closePath();
      break;
    }
    case "star": {
      const spikes = 5;
      const outer = half;
      const inner = half * 0.45;
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outer : inner;
        const angle = (Math.PI * i) / spikes - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) target.moveTo(x, y);
        else target.lineTo(x, y);
      }
      target.closePath();
      break;
    }
    case "square":
    default:
      target.rect(-half, -half, size, size);
      break;
  }
}

function drawFace(target, size, face, ink) {
  const eyeY = -size * 0.12;
  const eyeW = size * 0.12;
  const eyeH = size * 0.16;
  const leftX = -size * 0.22;
  const rightX = size * 0.1;
  target.fillStyle = ink;
  target.strokeStyle = ink;
  target.lineWidth = Math.max(2, size * 0.05);
  target.lineCap = "round";
  target.lineJoin = "round";

  const drawEye = (x, closed = false, tall = false) => {
    if (closed) {
      target.beginPath();
      target.moveTo(x, eyeY);
      target.lineTo(x + eyeW, eyeY);
      target.stroke();
      return;
    }
    const h = tall ? eyeH * 1.35 : eyeH;
    target.fillRect(x, eyeY - h / 2, eyeW, h);
  };

  switch (face) {
    case "wink":
      drawEye(leftX, true);
      drawEye(rightX);
      target.beginPath();
      target.arc(0, size * 0.18, size * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
      target.stroke();
      break;
    case "surprised":
      drawEye(leftX, false, true);
      drawEye(rightX, false, true);
      target.beginPath();
      target.arc(0, size * 0.2, size * 0.1, 0, Math.PI * 2);
      target.fill();
      break;
    case "cool":
      target.fillRect(leftX - 2, eyeY - eyeH * 0.35, eyeW * 2.1, eyeH * 0.7);
      target.fillRect(rightX - 2, eyeY - eyeH * 0.35, eyeW * 2.1, eyeH * 0.7);
      target.fillRect(leftX + eyeW * 1.6, eyeY - 1, rightX - leftX - eyeW * 0.8, 3);
      target.beginPath();
      target.moveTo(-size * 0.12, size * 0.2);
      target.lineTo(size * 0.14, size * 0.2);
      target.stroke();
      break;
    case "silly":
      drawEye(leftX);
      drawEye(rightX);
      target.beginPath();
      target.arc(size * 0.02, size * 0.18, size * 0.16, 0.05 * Math.PI, 0.95 * Math.PI);
      target.lineTo(-size * 0.14, size * 0.18);
      target.fill();
      break;
    case "determined":
      drawEye(leftX);
      drawEye(rightX);
      target.beginPath();
      target.moveTo(leftX - 2, eyeY - eyeH);
      target.lineTo(leftX + eyeW + 2, eyeY - eyeH * 0.45);
      target.moveTo(rightX + eyeW + 2, eyeY - eyeH);
      target.lineTo(rightX - 2, eyeY - eyeH * 0.45);
      target.stroke();
      target.beginPath();
      target.moveTo(-size * 0.14, size * 0.22);
      target.lineTo(size * 0.14, size * 0.18);
      target.stroke();
      break;
    case "smile":
    default:
      drawEye(leftX);
      drawEye(rightX);
      target.beginPath();
      target.arc(0, size * 0.14, size * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
      target.stroke();
      break;
  }
}

function paintCharacter(target, options, size = 46, withGlow = true) {
  const fill = getColor(options.color);
  const ink = "#172039";
  if (withGlow) {
    target.shadowColor = fill;
    target.shadowBlur = size * 0.45;
  }
  target.fillStyle = fill;
  drawShapePath(target, size, options.shape);
  target.fill();
  target.shadowBlur = 0;
  drawFace(target, size, options.face, ink);
}

function drawPlayer() {
  ctx.save();
  ctx.globalAlpha = player.alpha;
  ctx.translate(player.x + player.size / 2, player.y + player.size / 2);
  ctx.rotate(player.rotation);
  ctx.scale(player.scale, player.scale * (0.85 + player.scale * 0.15));
  paintCharacter(ctx, character, player.size, true);
  ctx.restore();
}

function drawObstacles() {
  obstacles.forEach((o) => {
    if (o.type === "block") {
      const top = blockTop(o);
      ctx.shadowColor = "#7f94ff";
      ctx.shadowBlur = 14;
      const gradient = ctx.createLinearGradient(o.x, top, o.x, groundY);
      gradient.addColorStop(0, "#9aa8ff");
      gradient.addColorStop(1, "#3b4a9a");
      ctx.fillStyle = gradient;
      ctx.fillRect(o.x, top, o.width, o.height);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#76f7d2";
      ctx.fillRect(o.x, top, o.width, 6);
      ctx.fillStyle = "#ffffff22";
      ctx.fillRect(o.x + 8, top + 14, Math.max(12, o.width - 16), 10);
      return;
    }

    ctx.fillStyle = "#ff5ea8";
    ctx.shadowColor = "#ff5ea8";
    ctx.shadowBlur = 16;
    const count = Math.max(1, Math.round(o.width / 40));
    for (let i = 0; i < count; i++) {
      const x = o.x + (o.width / count) * i;
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x + o.width / count / 2, groundY - o.height);
      ctx.lineTo(x + o.width / count, groundY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  });
}

function drawBirds() {
  birds.forEach((bird) => {
    const flap = Math.sin(bird.wing);
    const bodyY = bird.y + bird.height / 2;
    const bodyX = bird.x + bird.width / 2;
    ctx.save();
    ctx.translate(bodyX, bodyY);

    ctx.fillStyle = "#1b243f";
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffb347";
    ctx.beginPath();
    ctx.moveTo(-16, -1);
    ctx.lineTo(-24, 2);
    ctx.lineTo(-16, 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#f4f7ff";
    ctx.beginPath();
    ctx.arc(-8, -2, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#11152a";
    ctx.beginPath();
    ctx.arc(-8.5, -2, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#c9a0ff";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(2, -2);
    ctx.quadraticCurveTo(12, -18 - flap * 10, 22, -4 - flap * 6);
    ctx.moveTo(2, 2);
    ctx.quadraticCurveTo(12, 16 + flap * 10, 22, 4 + flap * 6);
    ctx.stroke();

    ctx.fillStyle = "#7f94ff";
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(18, -4);
    ctx.lineTo(18, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
}

function drawSuctionParticles() {
  suctionParticles.forEach((p) => {
    const tint = p.hue > 0.5 ? "#9ef6ff" : "#c9a0ff";
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
    ctx.fillStyle = tint;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.4 + (1 - p.radius / 180)), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawQuantumGate(time) {
  if (!quantumGate) return;
  const { x, cy, rx, ry, spin, open, pulse } = quantumGate;
  const openRx = rx * (0.55 + open * 0.45);
  const openRy = ry * (0.7 + open * 0.3);
  const suck = state === "warping" ? 1 : Math.max(0, 1 - Math.max(0, x - (player.x + player.size)) / 340);

  ctx.save();
  ctx.translate(x, cy);

  // Pull streaks / vacuum lines
  ctx.globalAlpha = 0.18 + suck * 0.35;
  ctx.strokeStyle = "#9ef6ff";
  ctx.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    const y = -openRy + (openRy * 2 * i) / 9;
    const length = 30 + suck * 90 + Math.sin(pulse + i) * 12;
    ctx.beginPath();
    ctx.moveTo(-length, y * 0.85);
    ctx.quadraticCurveTo(-length * 0.35, y, 0, y * 0.25);
    ctx.stroke();
  }

  // Outer glow
  const glow = ctx.createRadialGradient(0, 0, 8, 0, 0, openRy * 1.15);
  glow.addColorStop(0, `rgba(158, 246, 255, ${0.35 + suck * 0.35})`);
  glow.addColorStop(0.45, `rgba(127, 148, 255, ${0.18 + suck * 0.2})`);
  glow.addColorStop(1, "rgba(8, 11, 29, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(0, 0, openRx * 1.8, openRy * 1.15, 0, 0, Math.PI * 2);
  ctx.fill();

  // Event horizon
  ctx.globalAlpha = 0.9;
  const core = ctx.createRadialGradient(0, 0, 2, 0, 0, openRx);
  core.addColorStop(0, "#ffffff");
  core.addColorStop(0.2, "#d7b4ff");
  core.addColorStop(0.55, "#2a1b6a");
  core.addColorStop(1, "#050714");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.ellipse(0, 0, openRx * 0.72, openRy * 0.78, 0, 0, Math.PI * 2);
  ctx.fill();

  // Spinning quantum rings
  for (let ring = 0; ring < 3; ring++) {
    ctx.globalAlpha = 0.55 + ring * 0.12;
    ctx.strokeStyle = ring === 1 ? "#76f7d2" : ring === 2 ? "#ffe66d" : "#7f94ff";
    ctx.lineWidth = 3 - ring * 0.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, openRx * (0.85 + ring * 0.18), openRy * (0.9 + ring * 0.08), spin * (ring % 2 === 0 ? 1 : -1.3) + ring, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Hex lattice ticks
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = "#ffffffaa";
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const angle = spin * 1.4 + (Math.PI / 3) * i;
    ctx.beginPath();
    ctx.ellipse(0, 0, openRx * 1.05, openRy, angle * 0.15, angle, angle + 0.45);
    ctx.stroke();
  }

  // Inward pulse ripples
  ctx.globalAlpha = 0.35 + suck * 0.4;
  ctx.strokeStyle = "#9ef6ff";
  for (let i = 0; i < 3; i++) {
    const t = (pulse * 0.2 + i / 3) % 1;
    const ripple = 1.35 - t * 0.85;
    ctx.lineWidth = 2;
    ctx.globalAlpha = (1 - t) * (0.25 + suck * 0.45);
    ctx.beginPath();
    ctx.ellipse(0, 0, openRx * ripple, openRy * ripple, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Gate posts
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#d7defa";
  ctx.shadowColor = "#7f94ff";
  ctx.shadowBlur = 18;
  ctx.fillRect(-8, -openRy - 18, 16, openRy * 2 + 36);
  ctx.fillStyle = "#76f7d2";
  ctx.fillRect(-4, -openRy - 10, 8, openRy * 2 + 20);
  ctx.shadowBlur = 0;

  // Floating label spark
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "#9ef6ff";
  ctx.font = "700 14px ui-rounded, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("QUANTUM GATE", 0, -openRy - 28);
  ctx.restore();
  ctx.globalAlpha = 1;

  // Ambient suck dust drifting from left
  if (suck > 0.05) {
    ctx.save();
    ctx.strokeStyle = `rgba(158, 246, 255, ${0.12 + suck * 0.25})`;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const y = cy - openRy + ((time * 0.05 + i * 37) % (openRy * 2));
      const len = 40 + suck * 70;
      ctx.beginPath();
      ctx.moveTo(x - 40 - len, y);
      ctx.lineTo(x - 18, cy + (y - cy) * 0.2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function draw(time) {
  drawBackground(time);
  const particleColor = getColor(character.color);
  particles.forEach((p) => {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
    if (p.feather) {
      ctx.fillStyle = "#e8ddff";
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.life * 4);
      ctx.fillRect(-2, -5, 4, 10);
      ctx.restore();
    } else {
      ctx.fillStyle = particleColor;
      ctx.fillRect(p.x, p.y, 6, 6);
    }
  });
  ctx.globalAlpha = 1;
  drawObstacles();
  drawBirds();
  drawSuctionParticles();
  drawQuantumGate(time);
  drawPlayer();
  if (birdHitFlash > 0) {
    ctx.save();
    ctx.globalAlpha = birdHitFlash * 0.35;
    ctx.fillStyle = "#c9a0ff";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (state === "warping" && quantumGate) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.85, warpTime / WARP_DURATION);
    ctx.fillStyle = "#f4f7ff";
    ctx.beginPath();
    ctx.ellipse(quantumGate.x, quantumGate.cy, 18 + warpTime * 40, 24 + warpTime * 50, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function loop(time) {
  const elapsedSeconds = Math.min((time - lastTime) / 1000 || 1 / 60, 0.25);
  const dt = Math.min(elapsedSeconds * 60, 2);
  lastTime = time;
  update(dt, elapsedSeconds);
  draw(time);
  requestAnimationFrame(loop);
}

function matchPreset(options) {
  return PRESETS.find(
    (preset) =>
      preset.shape === options.shape &&
      preset.face === options.face &&
      preset.color === options.color
  )?.id || null;
}

function syncDraftFromInputs() {
  draftCharacter.name = playerNameInput.value.trim().slice(0, 16) || "Dash";
  draftCharacter.preset = matchPreset(draftCharacter);
}

function renderPreview() {
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  previewCtx.fillStyle = "#10162f";
  previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
  previewCtx.save();
  previewCtx.translate(previewCanvas.width / 2, previewCanvas.height / 2);
  paintCharacter(previewCtx, draftCharacter, 72, true);
  previewCtx.restore();
  characterSummary.textContent = `${getLabel(SHAPES, draftCharacter.shape)} · ${getLabel(FACES, draftCharacter.face)} · ${getLabel(COLORS, draftCharacter.color)}`;
}

function makeOptionButton(label, selected, onClick, swatch) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `option-button${selected ? " selected" : ""}`;
  button.setAttribute("aria-pressed", selected ? "true" : "false");
  if (swatch) {
    const chip = document.createElement("span");
    chip.className = "color-swatch";
    chip.style.background = swatch;
    button.append(chip);
  }
  const text = document.createElement("span");
  text.textContent = label;
  button.append(text);
  button.addEventListener("click", onClick);
  return button;
}

function renderOptionGroups() {
  presetOptions.replaceChildren(
    ...PRESETS.map((preset) =>
      makeOptionButton(preset.name, draftCharacter.preset === preset.id, () => {
        draftCharacter = { ...preset };
        playerNameInput.value = draftCharacter.name;
        renderCharacterEditor();
      })
    )
  );

  shapeOptions.replaceChildren(
    ...SHAPES.map((shape) =>
      makeOptionButton(shape.label, draftCharacter.shape === shape.id, () => {
        draftCharacter.shape = shape.id;
        draftCharacter.preset = matchPreset(draftCharacter);
        renderCharacterEditor();
      })
    )
  );

  faceOptions.replaceChildren(
    ...FACES.map((face) =>
      makeOptionButton(face.label, draftCharacter.face === face.id, () => {
        draftCharacter.face = face.id;
        draftCharacter.preset = matchPreset(draftCharacter);
        renderCharacterEditor();
      })
    )
  );

  colorOptions.replaceChildren(
    ...COLORS.map((color) =>
      makeOptionButton(
        color.label,
        draftCharacter.color === color.id,
        () => {
          draftCharacter.color = color.id;
          draftCharacter.preset = matchPreset(draftCharacter);
          renderCharacterEditor();
        },
        color.value
      )
    )
  );
}

function renderCharacterEditor() {
  renderOptionGroups();
  renderPreview();
}

function openModal(modal) {
  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closeModal(modal) {
  modal.classList.add("hidden");
  if (characterModal.classList.contains("hidden") && leaderboardModal.classList.contains("hidden")) {
    document.body.classList.remove("modal-open");
  }
}

function openCharacterModal() {
  draftCharacter = { ...character };
  playerNameInput.value = draftCharacter.name;
  renderCharacterEditor();
  closeModal(leaderboardModal);
  openModal(characterModal);
  playerNameInput.focus();
  playerNameInput.select();
}

function renderLeaderboard() {
  const rows = loadLeaderboard();
  leaderboardList.replaceChildren();
  if (!rows.length) {
    leaderboardEmpty.classList.remove("hidden");
    return;
  }
  leaderboardEmpty.classList.add("hidden");
  rows.forEach((row, index) => {
    const item = document.createElement("li");
    item.className = "leaderboard-item";

    const rank = document.createElement("span");
    rank.className = "leaderboard-rank";
    rank.textContent = `${index + 1}`;

    const mini = document.createElement("canvas");
    mini.width = 44;
    mini.height = 44;
    mini.className = "leaderboard-avatar";
    mini.setAttribute("aria-hidden", "true");
    const miniCtx = mini.getContext("2d");
    miniCtx.translate(22, 22);
    paintCharacter(miniCtx, row, 28, false);

    const meta = document.createElement("div");
    meta.className = "leaderboard-meta";
    meta.innerHTML = `<strong>${escapeHtml(row.name)}</strong><span>Level ${row.level} · ${getLabel(SHAPES, row.shape)} · ${getLabel(FACES, row.face)}</span>`;

    const points = document.createElement("strong");
    points.className = "leaderboard-score";
    points.textContent = String(row.score);

    item.append(rank, mini, meta, points);
    leaderboardList.append(item);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function openLeaderboardModal() {
  renderLeaderboard();
  closeModal(characterModal);
  openModal(leaderboardModal);
}

window.addEventListener("keydown", (event) => {
  if (event.code === "Escape") {
    closeModal(characterModal);
    closeModal(leaderboardModal);
    return;
  }
  if (["Space", "ArrowUp", "KeyW"].includes(event.code)) {
    if (event.target === playerNameInput) return;
    event.preventDefault();
    act();
  }
});

function tapPlay(event) {
  event.preventDefault();
  act();
}
canvas.addEventListener("pointerdown", tapPlay);
messageEl.addEventListener("pointerdown", tapPlay);
document.addEventListener(
  "touchmove",
  (event) => {
    if (event.target.closest(".canvas-wrap")) event.preventDefault();
  },
  { passive: false }
);
restartButton.addEventListener("click", () => startLevel(true));
soundButton.addEventListener("click", () => {
  soundOn = !soundOn;
  soundButton.textContent = `Sound: ${soundOn ? "on" : "off"}`;
});

function getFullscreenElement() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement ||
    null
  );
}

function canUseFullscreenApi() {
  const target = document.documentElement;
  return Boolean(
    target.requestFullscreen ||
      target.webkitRequestFullscreen ||
      target.webkitRequestFullScreen ||
      target.msRequestFullscreen
  );
}

function isImmersive() {
  return document.body.classList.contains("is-immersive") || Boolean(getFullscreenElement());
}

function syncFullscreenButton() {
  const active = isImmersive();
  fullscreenButton.textContent = active ? "Exit full" : "Full";
  fullscreenButton.setAttribute("aria-pressed", active ? "true" : "false");
  fullscreenButton.setAttribute("aria-label", active ? "Exit fullscreen" : "Enter fullscreen");
  document.body.classList.toggle("is-fullscreen", active);
}

async function enterFullscreen() {
  const target = document.documentElement;
  try {
    if (target.requestFullscreen) {
      try {
        await target.requestFullscreen({ navigationUI: "hide" });
      } catch {
        await target.requestFullscreen();
      }
    } else if (target.webkitRequestFullscreen) {
      target.webkitRequestFullscreen();
    } else if (target.webkitRequestFullScreen) {
      target.webkitRequestFullScreen();
    } else if (target.msRequestFullscreen) {
      target.msRequestFullscreen();
    } else {
      throw new Error("Fullscreen API unavailable");
    }
  } catch {
    document.body.classList.add("is-immersive");
    gameShell.scrollIntoView({ block: "center", inline: "nearest" });
  }
  syncFullscreenButton();
}

async function exitFullscreen() {
  document.body.classList.remove("is-immersive");
  try {
    if (getFullscreenElement()) {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
    }
  } catch {
    /* ignore */
  }
  syncFullscreenButton();
}

async function toggleFullscreen() {
  if (isImmersive()) await exitFullscreen();
  else await enterFullscreen();
}

fullscreenButton.addEventListener("click", (event) => {
  event.preventDefault();
  toggleFullscreen();
});
document.addEventListener("fullscreenchange", syncFullscreenButton);
document.addEventListener("webkitfullscreenchange", syncFullscreenButton);
document.addEventListener("MSFullscreenChange", syncFullscreenButton);
window.addEventListener("keydown", (event) => {
  if (event.code === "KeyF" && !event.metaKey && !event.ctrlKey && !event.altKey) {
    if (event.target === playerNameInput) return;
    event.preventDefault();
    toggleFullscreen();
  }
});
if (!canUseFullscreenApi()) {
  fullscreenButton.title = "Immersive view (best available on this device)";
}
syncFullscreenButton();

characterButton.addEventListener("click", openCharacterModal);
leaderboardButton.addEventListener("click", openLeaderboardModal);
closeCharacter.addEventListener("click", () => closeModal(characterModal));
closeLeaderboard.addEventListener("click", () => closeModal(leaderboardModal));
saveCharacter.addEventListener("click", () => {
  syncDraftFromInputs();
  saveCharacterData(draftCharacter);
  closeModal(characterModal);
  beep(660, 0.08);
});
playerNameInput.addEventListener("input", () => {
  draftCharacter.name = playerNameInput.value.slice(0, 16);
});
playerNameInput.addEventListener("keydown", (event) => {
  if (event.code === "Enter") {
    event.preventDefault();
    saveCharacter.click();
  }
});
clearLeaderboard.addEventListener("click", () => {
  saveLeaderboard([]);
  renderLeaderboard();
});
characterModal.addEventListener("click", (event) => {
  if (event.target === characterModal) closeModal(characterModal);
});
leaderboardModal.addEventListener("click", (event) => {
  if (event.target === leaderboardModal) closeModal(leaderboardModal);
});

requestAnimationFrame(loop);
