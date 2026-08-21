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
const LEVEL_DURATION = 18;
const POINTS_PER_SECOND = 10;
const CLEAR_BONUS = 50;
const CLEAN_BONUS = 100;
const BIRD_CLEAN_BONUS = 50;
const STAR_MULTIPLIERS = [2, 2, 3];
const LEADERBOARD_LIMIT = 10;
const GATE_LEAD_TIME = 2.2;
const WARP_DURATION = 0.9;
const PLAYER_START_X = 150;
const AUTO_RETRY_MS = 1100;

const WORLDS = [
  {
    id: "spark",
    name: "Spark Fields",
    tagline: "Jump school",
    levels: 8,
    teach: "Tap to jump — twice in the air for a double jump!",
    allow: { spikes: true, stairs: false, orbs: false, pits: false, birds: false },
  },
  {
    id: "steps",
    name: "Step Towers",
    tagline: "Climb time",
    levels: 8,
    teach: "Land on the bright block tops to climb. Bumping the pillar is safe!",
    allow: { spikes: true, stairs: true, orbs: false, pits: false, birds: false },
  },
  {
    id: "orbs",
    name: "Orb Bridges",
    tagline: "Precision hops",
    levels: 8,
    teach: "Hop the glowing orbs. Falling between them hits spikes!",
    allow: { spikes: true, stairs: true, orbs: true, pits: false, birds: false },
  },
  {
    id: "pits",
    name: "Spring Hollows",
    tagline: "Bounce back",
    levels: 8,
    teach: "Miss the orbs and you fall — use the spring in the pit!",
    allow: { spikes: true, stairs: true, orbs: true, pits: true, birds: false },
  },
  {
    id: "birds",
    name: "Bird Winds",
    tagline: "Watch the skies",
    levels: 8,
    teach: "Birds shove you back to the level start. Dodge or duck!",
    allow: { spikes: true, stairs: true, orbs: true, pits: true, birds: true },
  },
  {
    id: "quantum",
    name: "Quantum Rush",
    tagline: "Everything mixes",
    levels: 8,
    teach: "All hazards are live. Reach the quantum gate!",
    allow: { spikes: true, stairs: true, orbs: true, pits: true, birds: true },
  },
];

const TOTAL_LEVELS = WORLDS.reduce((sum, world) => sum + world.levels, 0);

const STORAGE = {
  best: "khoiDashBest",
  unlocked: "khoiDashUnlocked",
  character: "khoiDashCharacter",
  leaderboard: "khoiDashLeaderboard",
  stars: "khoiDashStars",
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
let pickups = [];
let floatTexts = [];
let particles = [];
let suctionParticles = [];
let quantumGate = null;
let warpTime = 0;
let distanceToBird = 500;
let distanceToStar = 520;
let levelStartScore = 0;
let birdHitFlash = 0;
let scoreFlash = 0;
let lastMultiplier = 1;
let deathsThisLevel = 0;
let birdHitsThisLevel = 0;
let orbLandsThisLevel = 0;
let autoRetryTimer = 0;
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
let character = null;
let draftCharacter = null;
let starMap = {};

const worldNameEl = document.querySelector("#worldName");
const worldLevelEl = document.querySelector("#worldLevel");
const starsEl = document.querySelector("#starsDisplay");

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

function loadStars() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE.stars) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function saveStars() {
  try {
    localStorage.setItem(STORAGE.stars, JSON.stringify(starMap));
  } catch {
    // Ignore quota / private-mode storage failures.
  }
}

function saveBestScore(value) {
  try {
    localStorage.setItem(STORAGE.best, String(value));
  } catch {
    // Ignore quota / private-mode storage failures.
  }
}

function saveUnlockedLevel(level) {
  try {
    localStorage.setItem(STORAGE.unlocked, String(level));
  } catch {
    // Ignore quota / private-mode storage failures.
  }
}

function getWorldInfo(level) {
  let remaining = level;
  for (let i = 0; i < WORLDS.length; i++) {
    const world = WORLDS[i];
    if (remaining <= world.levels) {
      return { world, worldIndex: i, levelInWorld: remaining, worldNumber: i + 1 };
    }
    remaining -= world.levels;
  }
  const last = WORLDS[WORLDS.length - 1];
  return { world: last, worldIndex: WORLDS.length - 1, levelInWorld: last.levels, worldNumber: WORLDS.length };
}

function currentWorldInfo() {
  return getWorldInfo(currentLevel);
}

function worldLocalDifficulty() {
  const info = currentWorldInfo();
  const within = (info.levelInWorld - 1) / Math.max(1, info.world.levels - 1);
  return Math.min(1, info.worldIndex / (WORLDS.length - 1) * 0.55 + within * 0.45);
}

function levelDifficulty() {
  return worldLocalDifficulty();
}

function totalStarsEarned() {
  return Object.values(starMap).reduce((sum, value) => sum + Number(value || 0), 0);
}

function updateWorldHud() {
  const info = currentWorldInfo();
  if (worldNameEl) worldNameEl.textContent = info.world.name;
  if (worldLevelEl) worldLevelEl.textContent = `${info.levelInWorld}/${info.world.levels}`;
  if (levelEl) levelEl.textContent = String(currentLevel);
}

function updateStarsHud() {
  if (starsEl) starsEl.textContent = String(totalStarsEarned());
}

function showReadyMessage() {
  const info = currentWorldInfo();
  messageEl.innerHTML = `<p class="message-kicker">${info.world.name}</p><h2>${info.world.teach}</h2><p>Level ${info.levelInWorld}/${info.world.levels} · Tap, click, or press <kbd>Space</kbd></p>`;
  messageEl.classList.remove("hidden");
}

function awardStarsForClear() {
  let stars = 1;
  if (deathsThisLevel === 0) stars += 1;
  if (birdHitsThisLevel === 0 && deathsThisLevel === 0) stars += 1;
  const key = String(currentLevel);
  const previous = Number(starMap[key] || 0);
  if (stars > previous) {
    starMap[key] = stars;
    saveStars();
    updateStarsHud();
  }
  return { stars, previous };
}

character = loadCharacter();
draftCharacter = { ...character };
starMap = loadStars();
bestEl.textContent = best;
updateWorldHud();
updateStarsHud();
updatePlayerNameDisplay();
showReadyMessage();

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
  try {
    localStorage.setItem(STORAGE.leaderboard, JSON.stringify(rows.slice(0, LEADERBOARD_LIMIT)));
  } catch {
    // Ignore quota / private-mode storage failures.
  }
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
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioContext ??= new AC();
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    const safeVolume = Math.max(0.0001, volume);
    oscillator.frequency.value = frequency;
    oscillator.type = "square";
    gain.gain.setValueAtTime(safeVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.01, duration));
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + Math.max(0.01, duration));
  } catch {
    // Audio must never halt the game loop (mobile AudioContext quirks).
  }
}

function scheduleNextStar() {
  distanceToStar = 620 + Math.random() * 980;
}

function spawnScoreStar() {
  const y = groundY - (70 + Math.random() * 170);
  pickups.push({
    type: "star",
    x: W + 36,
    y,
    baseY: y,
    r: 15,
    spin: Math.random() * Math.PI,
    bob: Math.random() * Math.PI * 2,
  });
  scheduleNextStar();
}

function collectScoreStars() {
  const cx = player.x + player.size / 2;
  const cy = player.y + player.size / 2;
  pickups = pickups.filter((star) => {
    const dx = cx - star.x;
    const dy = cy - star.y;
    const reach = player.size * 0.55 + star.r;
    if (dx * dx + dy * dy <= reach * reach) {
      const mult = STAR_MULTIPLIERS[Math.floor(Math.random() * STAR_MULTIPLIERS.length)];
      const before = Math.floor(score);
      score = Math.floor(Math.max(before, 5) * mult);
      lastMultiplier = mult;
      scoreFlash = 1.2;
      scoreEl.textContent = Math.floor(score);
      floatTexts.push({
        x: cx,
        y: cy - 20,
        text: `×${mult}!`,
        life: 1.1,
        vy: -1.4,
      });
      beep(660, 0.07, 0.06);
      beep(990, 0.12, 0.07);
      for (let i = 0; i < 12; i++) {
        particles.push({
          x: star.x,
          y: star.y,
          vx: (Math.random() - 0.5) * 7,
          vy: -Math.random() * 5 - 1,
          life: 0.7 + Math.random() * 0.4,
          starBit: true,
        });
      }
      return false;
    }
    return star.x + star.r > -30;
  });
}

function updatePickups(dt) {
  pickups.forEach((star) => {
    star.x -= speed * dt;
    star.spin += 0.12 * dt;
    star.bob += 0.1 * dt;
    star.y = star.baseY + Math.sin(star.bob) * 6;
  });
  collectScoreStars();
}

function updateFloatTexts(dt, elapsedSeconds) {
  floatTexts.forEach((item) => {
    item.y += item.vy * dt;
    item.life -= elapsedSeconds;
  });
  floatTexts = floatTexts.filter((item) => item.life > 0);
}

function drawScoreStars() {
  pickups.forEach((star) => {
    ctx.save();
    ctx.translate(star.x, star.y);
    ctx.rotate(star.spin);
    ctx.shadowColor = "#ffe66d";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#ffe66d";
    drawShapePath(ctx, star.r * 2, "star");
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff6c2";
    drawShapePath(ctx, star.r * 1.15, "star");
    ctx.fill();
    ctx.restore();
  });
}

function drawFloatTexts() {
  floatTexts.forEach((item) => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, item.life));
    ctx.fillStyle = "#ffe66d";
    ctx.strokeStyle = "#11152a";
    ctx.lineWidth = 4;
    ctx.font = "900 28px ui-rounded, sans-serif";
    ctx.textAlign = "center";
    ctx.strokeText(item.text, item.x, item.y);
    ctx.fillText(item.text, item.x, item.y);
    ctx.restore();
  });
  ctx.globalAlpha = 1;
}

function scheduleNextBird() {
  const info = currentWorldInfo();
  if (!info.world.allow.birds) {
    distanceToBird = Number.POSITIVE_INFINITY;
    return;
  }
  const difficulty = levelDifficulty();
  const minGap = 1400 - difficulty * 400;
  const spread = 1800 - difficulty * 700;
  distanceToBird = minGap + Math.random() * Math.max(500, spread);
  if (Math.random() > 0.25 + difficulty * 0.35) {
    distanceToBird += 700 + Math.random() * 900;
  }
}

function spawnBird() {
  const info = currentWorldInfo();
  if (!info.world.allow.birds) {
    scheduleNextBird();
    return;
  }
  const difficulty = levelDifficulty();
  const flockChance = Math.max(0, (difficulty - 0.55) * 0.35);
  const count = Math.random() < flockChance ? 2 : 1;
  const baseY = groundY - (100 + Math.random() * (100 + difficulty * 70));
  const dive = info.worldIndex >= 5 && Math.random() < difficulty * 0.3;
  beep(880, 0.05, 0.03);
  for (let i = 0; i < count; i++) {
    birds.push({
      x: W + 80 + i * 40,
      y: baseY + (i - (count - 1) / 2) * 28,
      width: 34,
      height: 22,
      wing: Math.random() * Math.PI * 2,
      bob: Math.random() * Math.PI * 2,
      extraSpeed: 1.0 + difficulty * 2.8 + Math.random() * (1 + difficulty),
      dive,
      divePhase: 0,
      warn: 1,
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
  birdHitsThisLevel += 1;

  birds = [];
  obstacles = [];
  pickups = [];
  suctionParticles = [];
  quantumGate = null;
  warpTime = 0;
  levelTime = 0;
  score = levelStartScore;
  scheduleNextBird();
  scheduleNextStar();
  distanceToNext = 320 + Math.random() * 140;
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
  if (autoRetryTimer) {
    clearTimeout(autoRetryTimer);
    autoRetryTimer = 0;
  }
  obstacles = [];
  birds = [];
  pickups = [];
  floatTexts = [];
  particles = [];
  suctionParticles = [];
  quantumGate = null;
  warpTime = 0;
  birdHitFlash = 0;
  scoreFlash = 0;
  if (resetScore) {
    score = 0;
    deathsThisLevel = 0;
    birdHitsThisLevel = 0;
    orbLandsThisLevel = 0;
  }
  // Fresh attempt from a continue/clear resets clean-run tracking.
  if (state === "ready" || state === "complete" || state === "finished") {
    deathsThisLevel = 0;
    birdHitsThisLevel = 0;
    orbLandsThisLevel = 0;
  }
  levelStartScore = score;
  levelTime = 0;
  const info = currentWorldInfo();
  speed = 5.8 + info.worldIndex * 0.55 + (info.levelInWorld - 1) * 0.12;
  // Step Towers plays better a touch slower while learning climbs.
  if (info.worldIndex === 1) speed *= 0.86;
  distanceToNext = 400;
  scheduleNextBird();
  scheduleNextStar();
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
  updateWorldHud();
  levelProgressEl.style.width = "0%";
  state = "playing";
  messageEl.classList.add("hidden");
}

function act() {
  if (characterModal.classList.contains("hidden") === false) return;
  if (leaderboardModal.classList.contains("hidden") === false) return;
  // Tap skips a stuck/slow warp so level clear can never soft-lock input.
  if (state === "warping") {
    completeLevel();
    return;
  }
  if (state !== "playing") {
    if (autoRetryTimer) {
      clearTimeout(autoRetryTimer);
      autoRetryTimer = 0;
    }
    return startLevel(["ready", "over", "complete", "finished"].includes(state));
  }
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
  distanceToStar = Number.POSITIVE_INFINITY;
  birds = [];
  pickups = [];
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
  if (state === "warping" || state === "complete" || state === "finished") return;
  state = "warping";
  warpTime = 0;
  jumpsUsed = 2;
  player.velocityY = 0;
  obstacles = [];
  birds = [];
  pickups = [];
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
  if (state === "over" || state === "complete" || state === "finished" || state === "warping") return;
  state = "over";
  deathsThisLevel += 1;
  quantumGate = null;
  birds = [];
  suctionParticles = [];
  player.scale = 1;
  player.alpha = 1;
  beep(110, 0.3, 0.08);
  const finalScore = Math.floor(score);
  best = Math.max(best, finalScore);
  saveBestScore(best);
  bestEl.textContent = best;
  const info = currentWorldInfo();
  messageEl.innerHTML = `<p class="message-kicker">${info.world.name}</p><h2>Ouch!</h2><p>${finalScore} pts · Auto-retry… or tap now</p>`;
  messageEl.classList.remove("hidden");
  if (autoRetryTimer) clearTimeout(autoRetryTimer);
  autoRetryTimer = setTimeout(() => {
    autoRetryTimer = 0;
    if (state === "over") startLevel(false);
  }, AUTO_RETRY_MS);
}

function completeLevel() {
  if (state === "complete" || state === "finished") return;

  state = "complete";
  obstacles = [];
  birds = [];
  pickups = [];
  floatTexts = [];
  suctionParticles = [];
  quantumGate = null;
  warpTime = WARP_DURATION;
  player.scale = 1;
  player.alpha = 1;
  if (autoRetryTimer) {
    clearTimeout(autoRetryTimer);
    autoRetryTimer = 0;
  }

  let bonus = CLEAR_BONUS;
  let starText = "★☆☆";
  let finalScore = Math.floor(score);

  try {
    beep(880, 0.25, 0.07);

    if (deathsThisLevel === 0) bonus += CLEAN_BONUS;
    if (birdHitsThisLevel === 0 && deathsThisLevel === 0) bonus += BIRD_CLEAN_BONUS;
    score += bonus;
    const starResult = awardStarsForClear();
    starText = "★".repeat(starResult.stars) + "☆".repeat(3 - starResult.stars);

    finalScore = Math.floor(score);
    best = Math.max(best, finalScore);
    saveBestScore(best);
    bestEl.textContent = best;
    scoreEl.textContent = finalScore;

    const info = currentWorldInfo();
    if (currentLevel === TOTAL_LEVELS) {
      state = "finished";
      let rankText = "";
      try {
        const rank = submitScore(finalScore, currentLevel);
        rankText = rank > 0 && rank <= LEADERBOARD_LIMIT ? ` · Board #${rank}` : "";
      } catch {
        rankText = "";
      }
      messageEl.innerHTML = `<p class="message-kicker">Campaign clear!</p><h2>Dash Master!</h2><p>${starText} · ${finalScore} pts (+${bonus})${rankText}</p><p>Tap for endless rematch on the final world</p>`;
    } else {
      const completed = info.levelInWorld;
      const worldName = info.world.name;
      currentLevel += 1;
      saveUnlockedLevel(currentLevel);
      updateWorldHud();
      const next = currentWorldInfo();
      const worldClear = completed === info.world.levels;
      messageEl.innerHTML = worldClear
        ? `<p class="message-kicker">${worldName} clear!</p><h2>${next.world.name}</h2><p>${starText} · +${bonus} bonus · ${next.world.teach}</p>`
        : `<p class="message-kicker">Gate cleared!</p><h2>${starText}</h2><p>+${bonus} bonus · Next ${next.levelInWorld}/${next.world.levels} · Tap to continue</p>`;
    }
  } catch {
    messageEl.innerHTML = `<p class="message-kicker">Gate cleared!</p><h2>Nice!</h2><p>Tap to continue</p>`;
  }

  messageEl.classList.remove("hidden");
}

function spawnSpikeCluster() {
  const difficulty = levelDifficulty();
  const clusterSize = Math.random() < difficulty * 0.45 ? (Math.random() < difficulty * 0.25 ? 3 : 2) : 1;
  const spikeWidth = 40;
  obstacles.push({
    type: "spike",
    x: W + 30,
    width: spikeWidth * clusterSize,
    height: 40 + difficulty * 8,
  });
  const minGap = 270 - difficulty * 40;
  const randomGap = 280 - difficulty * 90;
  distanceToNext = minGap + Math.random() * randomGap;
}

function spawnStaircase() {
  const difficulty = levelDifficulty();
  const info = currentWorldInfo();
  const stepWorld = info.worldIndex === 1;
  let x = W + 50;
  const spikeWidth = stepWorld ? 32 : 36;
  const spikePairWidth = spikeWidth * 2;
  const spikeHeight = stepWorld ? 30 + difficulty * 4 : 38 + difficulty * 6;
  const scale = stepWorld ? 0.78 + Math.min(0.12, (info.levelInWorld - 1) * 0.015) : info.levelInWorld <= 3 ? 0.9 : 1;
  // Wider gaps in Step Towers so a normal jump clears the spikes.
  const betweenGap = stepWorld ? 132 + difficulty * 8 : 92 + difficulty * 8;
  let steps = [
    { width: 72 * scale, height: (stepWorld ? 52 : 70) * scale },
    { width: 96 * scale, height: (stepWorld ? 96 : 128) * scale },
    { width: 112 * scale, height: (stepWorld ? 138 : 188) * scale },
  ];
  // Early Step Towers stages use only two shorter pillars.
  if (stepWorld && info.levelInWorld <= 4) steps = steps.slice(0, 2);

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    obstacles.push({ type: "block", x, width: step.width, height: step.height });
    x += step.width;
    if (i < steps.length - 1) {
      const spikeX = x + (betweenGap - spikePairWidth) / 2;
      obstacles.push({ type: "spike", x: spikeX, width: spikePairWidth, height: spikeHeight });
      x += betweenGap;
    }
  }

  distanceToNext = (stepWorld ? 460 : 380) + Math.random() * (260 - difficulty * 70);
}

function spawnOrbBridge() {
  const difficulty = levelDifficulty();
  const info = currentWorldInfo();
  let x = W + 45;
  const spikeCount = info.levelInWorld <= 3 ? 4 : 6;
  const spikeWidth = 40;
  const spikeHeight = 40 + difficulty * 5;
  const orbRadius = 15;
  const orbBaseY = groundY - spikeHeight - 62 - difficulty * 8;

  obstacles.push({ type: "block", x, width: 80, height: 54 });
  x += 82;

  for (let i = 0; i < spikeCount; i++) {
    const sx = x + i * spikeWidth;
    obstacles.push({ type: "spike", x: sx, width: spikeWidth, height: spikeHeight });
    obstacles.push({
      type: "orb",
      x: sx + spikeWidth / 2,
      baseY: orbBaseY,
      y: orbBaseY,
      radius: orbRadius,
      width: orbRadius * 2,
      bob: i * 0.7,
    });
  }
  x += spikeCount * spikeWidth + 8;
  obstacles.push({ type: "block", x, width: 80, height: 54 });
  distanceToNext = 380 + Math.random() * 180;
}

function spawnOrbPit() {
  const difficulty = levelDifficulty();
  let x = W + 45;
  const ledgeHeight = 58;
  const ledgeWidth = 88;

  obstacles.push({ type: "block", x, width: ledgeWidth, height: ledgeHeight });
  x += ledgeWidth + 2;

  const spikeCount = 6;
  const spikeWidth = 38;
  const spikeHeight = 42 + difficulty * 6;
  const orbRadius = 15;
  const orbBaseY = groundY - spikeHeight - 58 - difficulty * 10;

  for (let i = 0; i < spikeCount; i++) {
    const sx = x + i * spikeWidth;
    obstacles.push({ type: "spike", x: sx, width: spikeWidth, height: spikeHeight });
    obstacles.push({
      type: "orb",
      x: sx + spikeWidth / 2,
      baseY: orbBaseY,
      y: orbBaseY,
      radius: orbRadius,
      width: orbRadius * 2,
      bob: i * 0.7,
    });
  }
  x += spikeCount * spikeWidth + 10;

  const pitWidth = 128 + difficulty * 24;
  obstacles.push({ type: "pit", x, width: pitWidth, height: H - groundY + 80 });
  obstacles.push({
    type: "spring",
    x: x + 12,
    width: pitWidth - 24,
    y: groundY + 78,
    height: 20,
  });
  x += pitWidth;
  obstacles.push({ type: "block", x, width: 86, height: ledgeHeight });
  distanceToNext = 390 + Math.random() * (220 - difficulty * 70);
}

function spawnObstacle() {
  const info = currentWorldInfo();
  const allow = info.world.allow;
  const difficulty = levelDifficulty();
  const options = [];
  if (allow.spikes) options.push("spikes");
  if (allow.stairs) options.push("stairs");
  if (allow.orbs && !allow.pits) options.push("orbs");
  if (allow.pits) options.push("pits");
  if (allow.stairs && allow.spikes && info.worldIndex >= 1) options.push("stairs");

  // Prefer teaching the world's new toy on early levels.
  if (info.levelInWorld <= 2) {
    if (info.worldIndex === 1 && allow.stairs) return spawnStaircase();
    if (info.worldIndex === 2 && allow.orbs) return spawnOrbBridge();
    if (info.worldIndex === 3 && allow.pits) return spawnOrbPit();
    if (info.worldIndex === 0) return spawnSpikeCluster();
  }

  // Step Towers: mix in more plain spikes so climbs have breathing room.
  if (info.worldIndex === 1) {
    if (Math.random() < 0.55) return spawnSpikeCluster();
    return spawnStaircase();
  }

  const roll = Math.random();
  if (allow.pits && roll < 0.28 + difficulty * 0.15) return spawnOrbPit();
  if (allow.orbs && !allow.pits && roll < 0.45) return spawnOrbBridge();
  if (allow.orbs && allow.pits && roll < 0.2) return spawnOrbBridge();
  if (allow.stairs && roll < 0.55) return spawnStaircase();
  return spawnSpikeCluster();
}

function overlapsSpike(o) {
  if (o.type !== "spike") return false;
  const pad = 8;
  return player.x + player.size - pad > o.x && player.x + pad < o.x + o.width && player.y + player.size - 5 > groundY - o.height;
}

function blockTop(o) {
  return groundY - o.height;
}

function isOverPit() {
  const mid = player.x + player.size / 2;
  return obstacles.some((o) => o.type === "pit" && mid > o.x + 4 && mid < o.x + o.width - 4);
}

function isLandingOnBlock(o) {
  if (o.type !== "block" || player.velocityY < 0) return false;
  const pad = 6;
  const top = blockTop(o);
  const foot = player.y + player.size;
  const overlapsX = player.x + player.size - pad > o.x && player.x + pad < o.x + o.width;
  return overlapsX && foot >= top && foot <= top + 18 && player.y < top;
}

function isLandingOnOrb(o) {
  if (o.type !== "orb" || player.velocityY < 0) return false;
  const pad = 3;
  const top = o.y - o.radius;
  const foot = player.y + player.size;
  const overlapsX =
    player.x + player.size - pad > o.x - o.radius * 0.9 &&
    player.x + pad < o.x + o.radius * 0.9;
  return overlapsX && foot >= top && foot <= top + 16 && player.y < top;
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
    if (isLandingOnBlock(o)) {
      player.y = blockTop(o) - player.size;
      player.velocityY = 0;
      jumpsUsed = 0;
      player.rotation = Math.round(player.rotation / (Math.PI / 2)) * (Math.PI / 2);
      return true;
    }
    if (isLandingOnOrb(o)) {
      player.y = o.y - o.radius - player.size;
      player.velocityY = 0;
      jumpsUsed = 0;
      player.rotation = Math.round(player.rotation / (Math.PI / 2)) * (Math.PI / 2);
      if (!o.landed) {
        o.landed = true;
        orbLandsThisLevel += 1;
        beep(720, 0.05, 0.04);
      }
      return true;
    }
  }
  return false;
}

function resolveSpring() {
  for (const o of obstacles) {
    if (o.type !== "spring" || player.velocityY < 0) continue;
    const pad = 4;
    const top = o.y;
    const foot = player.y + player.size;
    const overlapsX = player.x + player.size - pad > o.x && player.x + pad < o.x + o.width;
    if (!overlapsX || foot < top || foot > top + 24) continue;
    player.y = top - player.size;
    player.velocityY = -21.5 - levelDifficulty() * 1.8;
    jumpsUsed = 1;
    o.squash = 1;
    beep(240, 0.06, 0.05);
    beep(520, 0.1, 0.06);
    for (let i = 0; i < 8; i++) {
      particles.push({
        x: player.x + player.size / 2,
        y: top,
        vx: (Math.random() - 0.5) * 5,
        vy: -Math.random() * 5 - 2,
        life: 0.7,
      });
    }
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

  if (resolveSpring()) {
    // launched upward from trampoline
  }

  const onPlatform = resolvePlatformLanding();
  if (!onPlatform && player.y >= groundY - player.size && !isOverPit()) {
    player.y = groundY - player.size;
    player.velocityY = 0;
    jumpsUsed = 0;
    player.rotation = Math.round(player.rotation / (Math.PI / 2)) * (Math.PI / 2);
  } else if (!onPlatform && player.velocityY !== 0) {
    player.rotation += 0.09 * dt;
  }

  if (player.y > H + 60) {
    endGame();
    return;
  }

  if (!quantumGate) {
    distanceToNext -= speed * dt;
    if (distanceToNext <= 0) spawnObstacle();
    distanceToBird -= speed * dt;
    if (distanceToBird <= 0) spawnBird();
    distanceToStar -= speed * dt;
    if (distanceToStar <= 0) spawnScoreStar();
  }

  obstacles.forEach((o) => {
    o.x -= speed * dt;
    if (o.type === "orb") {
      o.bob += 0.08 * dt;
      o.y = o.baseY + Math.sin(o.bob) * 5;
    }
    if (o.type === "spring" && o.squash > 0) {
      o.squash = Math.max(0, o.squash - elapsedSeconds * 4);
    }
  });
  obstacles = obstacles.filter((o) => {
    const right = o.type === "orb" ? o.x + o.radius : o.x + o.width;
    return right > -40;
  });

  // Keep standing on platforms after they scroll under the player.
  if (player.velocityY >= 0) resolvePlatformLanding();

  if (obstacles.some(overlapsSpike)) {
    endGame();
    return;
  }

  updateBirds(dt);
  updatePickups(dt);
  updateFloatTexts(dt, elapsedSeconds);
  if (scoreFlash > 0) scoreFlash = Math.max(0, scoreFlash - elapsedSeconds * 1.6);

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
    pickups = [];
    updateGate(dt, elapsedSeconds);
    updateSuctionParticles(dt);
  }
}

function makeStarField(count) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * groundY,
      r: Math.random() < 0.15 ? 1.8 + Math.random() * 1.4 : 0.6 + Math.random() * 1.1,
      twinkle: Math.random() * Math.PI * 2,
      speed: 0.004 + Math.random() * 0.01,
      layer: Math.random() < 0.35 ? 0.25 : Math.random() < 0.7 ? 0.55 : 1,
      tint: Math.random() < 0.2 ? "#9ef6ff" : Math.random() < 0.35 ? "#c9a0ff" : "#ffffff",
    });
  }
  return stars;
}

const galaxyStars = makeStarField(140);

function drawBackground(time) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#07051a");
  sky.addColorStop(0.45, "#140b2e");
  sky.addColorStop(0.78, "#1a0a28");
  sky.addColorStop(1, "#0a0618");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Nebula clouds
  const nebulae = [
    { x: W * 0.22, y: groundY * 0.28, r: 220, c0: "rgba(88, 42, 160, 0.35)", c1: "rgba(88, 42, 160, 0)" },
    { x: W * 0.72, y: groundY * 0.22, r: 260, c0: "rgba(30, 110, 170, 0.28)", c1: "rgba(30, 110, 170, 0)" },
    { x: W * 0.55, y: groundY * 0.55, r: 240, c0: "rgba(160, 40, 110, 0.22)", c1: "rgba(160, 40, 110, 0)" },
    { x: W * 0.12, y: groundY * 0.62, r: 160, c0: "rgba(60, 180, 200, 0.12)", c1: "rgba(60, 180, 200, 0)" },
  ];
  nebulae.forEach((n) => {
    const g = ctx.createRadialGradient(n.x, n.y, 10, n.x, n.y, n.r);
    g.addColorStop(0, n.c0);
    g.addColorStop(1, n.c1);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Soft galaxy band
  ctx.save();
  ctx.translate(W * 0.62, groundY * 0.34);
  ctx.rotate(-0.45);
  const band = ctx.createLinearGradient(-280, 0, 280, 0);
  band.addColorStop(0, "rgba(255,255,255,0)");
  band.addColorStop(0.5, "rgba(210, 190, 255, 0.14)");
  band.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = band;
  ctx.beginPath();
  ctx.ellipse(0, 0, 300, 48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Parallax twinkling stars
  const scroll = (time * 0.03 * speed) % W;
  galaxyStars.forEach((star) => {
    const x = ((star.x - scroll * star.layer) % W + W) % W;
    const alpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * star.speed + star.twinkle));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = star.tint;
    ctx.beginPath();
    ctx.arc(x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Distant planets
  ctx.fillStyle = "#6ecbff22";
  ctx.beginPath();
  ctx.arc(W * 0.88, groundY * 0.18, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#9ef6ff44";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(W * 0.88, groundY * 0.18, 42, 10, -0.3, 0, Math.PI * 2);
  ctx.stroke();

  // Cosmic ground shelf
  const groundGrad = ctx.createLinearGradient(0, groundY, 0, H);
  groundGrad.addColorStop(0, "#12102a");
  groundGrad.addColorStop(1, "#070514");
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, groundY, W, H - groundY);
  ctx.fillStyle = getColor(character.color);
  ctx.shadowColor = getColor(character.color);
  ctx.shadowBlur = 12;
  ctx.fillRect(0, groundY, W, 7);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#2a2455";
  for (let x = -((time * speed * 0.03) % 48); x < W; x += 48) ctx.fillRect(x, groundY + 22, 26, 8);
  ctx.fillStyle = "#ffffff10";
  for (let x = -((time * speed * 0.02) % 70); x < W; x += 70) {
    ctx.beginPath();
    ctx.arc(x + 18, groundY + 40, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
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
    if (o.type === "pit") {
      ctx.fillStyle = "#050814";
      ctx.fillRect(o.x, groundY - 2, o.width, H - groundY + 2);
      ctx.fillStyle = "#1a1030";
      ctx.fillRect(o.x, groundY + 28, o.width, H - groundY - 28);
      ctx.strokeStyle = "#76f7d255";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(o.x, groundY);
      ctx.lineTo(o.x, H);
      ctx.moveTo(o.x + o.width, groundY);
      ctx.lineTo(o.x + o.width, H);
      ctx.stroke();
      return;
    }

    if (o.type === "spring") {
      const squash = o.squash || 0;
      const top = o.y + squash * 8;
      const height = Math.max(8, o.height - squash * 8);
      ctx.shadowColor = "#ff9f43";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#ff9f43";
      ctx.fillRect(o.x, top, o.width, height);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ffe66d";
      ctx.lineWidth = 3;
      for (let i = 1; i <= 4; i++) {
        const x = o.x + (o.width * i) / 5;
        ctx.beginPath();
        ctx.moveTo(x, top + 3);
        ctx.lineTo(x - 4, top + height - 3);
        ctx.lineTo(x + 4, top + height - 3);
        ctx.stroke();
      }
      ctx.fillStyle = "#fff6c2";
      ctx.fillRect(o.x + 6, top, o.width - 12, 5);
      return;
    }

    if (o.type === "orb") {
      const pulse = 1 + Math.sin((o.bob || 0) * 2) * 0.08;
      ctx.shadowColor = "#9ef6ff";
      ctx.shadowBlur = 18;
      ctx.strokeStyle = "#9ef6ff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.radius * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#9ef6ff44";
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.radius - 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffffcc";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.radius + 7 + Math.sin((o.bob || 0) * 3) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#ffffffaa";
      ctx.beginPath();
      ctx.arc(o.x - 3, o.y - 3, 3, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (o.type === "block") {
      const top = blockTop(o);
      ctx.shadowColor = "#7f94ff";
      ctx.shadowBlur = 14;
      const body = ctx.createLinearGradient(o.x, top, o.x, groundY);
      body.addColorStop(0, "#4b5bb8");
      body.addColorStop(1, "#2a335f");
      ctx.fillStyle = body;
      ctx.fillRect(o.x, top, o.width, o.height);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff18";
      ctx.fillRect(o.x + 8, top + 16, Math.max(12, o.width - 16), o.height - 28);
      // Safe landing top
      ctx.fillStyle = "#76f7d2";
      ctx.fillRect(o.x - 2, top - 2, o.width + 4, 10);
      ctx.fillStyle = "#d7fff4";
      ctx.fillRect(o.x + 6, top, Math.max(10, o.width - 12), 4);
      return;
    }

    if (o.type !== "spike") return;

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
    const near = bird.x < player.x + 280;
    ctx.save();
    ctx.translate(bodyX, bodyY);
    if (near) {
      ctx.shadowColor = "#ff5ea8";
      ctx.shadowBlur = 18;
      ctx.strokeStyle = "#ff5ea888";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = near ? "#2a1838" : "#1b243f";
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

    ctx.strokeStyle = near ? "#ff5ea8" : "#c9a0ff";
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
    } else if (p.starBit) {
      ctx.fillStyle = "#ffe66d";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = particleColor;
      ctx.fillRect(p.x, p.y, 6, 6);
    }
  });
  ctx.globalAlpha = 1;
  drawObstacles();
  drawScoreStars();
  drawBirds();
  drawSuctionParticles();
  drawQuantumGate(time);
  drawPlayer();
  drawFloatTexts();
  if (scoreFlash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.35, scoreFlash * 0.28);
    ctx.fillStyle = "#ffe66d";
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = Math.min(1, scoreFlash);
    ctx.fillStyle = "#ffe66d";
    ctx.strokeStyle = "#11152a";
    ctx.lineWidth = 5;
    ctx.font = "900 42px ui-rounded, sans-serif";
    ctx.textAlign = "center";
    ctx.strokeText(`×${lastMultiplier}`, W / 2, 90);
    ctx.fillText(`×${lastMultiplier}`, W / 2, 90);
    ctx.restore();
  }
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
  try {
    update(dt, elapsedSeconds);
    draw(time);
  } catch (err) {
    // Keep RAF alive — a single frame error must not freeze the game.
    console.warn("Khoi-Dash frame error:", err);
    if (state === "warping") {
      try {
        completeLevel();
      } catch {
        state = "complete";
        messageEl.classList.remove("hidden");
      }
    }
  }
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
restartButton.addEventListener("click", () => {
  deathsThisLevel = 0;
  birdHitsThisLevel = 0;
  orbLandsThisLevel = 0;
  startLevel(true);
});
soundButton.addEventListener("click", () => {
  soundOn = !soundOn;
  soundButton.textContent = soundOn ? "Sound" : "Muted";
  soundButton.setAttribute("aria-label", soundOn ? "Mute sound" : "Unmute sound");
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

function prefersImmersiveFallback() {
  const ua = navigator.userAgent || "";
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
  const narrow = window.matchMedia?.("(max-width: 900px)")?.matches;
  return iOS || !canUseFullscreenApi() || Boolean(coarse && narrow);
}

function isImmersive() {
  return document.body.classList.contains("is-immersive") || Boolean(getFullscreenElement());
}

function syncFullscreenButton() {
  const active = isImmersive();
  fullscreenButton.textContent = active ? "Exit" : "Full";
  fullscreenButton.setAttribute("aria-pressed", active ? "true" : "false");
  fullscreenButton.setAttribute("aria-label", active ? "Exit fullscreen" : "Enter fullscreen");
  document.body.classList.toggle("is-fullscreen", active);
}

function applyImmersiveShell() {
  document.body.classList.add("is-immersive");
  window.scrollTo(0, 0);
  gameShell.scrollIntoView({ block: "start", inline: "nearest" });
}

async function enterFullscreen() {
  if (prefersImmersiveFallback()) {
    applyImmersiveShell();
    syncFullscreenButton();
    return;
  }

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
    applyImmersiveShell();
  }

  // Some mobile browsers resolve without actually entering fullscreen.
  if (!getFullscreenElement()) applyImmersiveShell();
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
fullscreenButton.title = prefersImmersiveFallback()
  ? "Fill the screen for play"
  : "Toggle fullscreen";
syncFullscreenButton();

// Phones: start in play-focused immersive shell so the canvas isn't tiny.
if (prefersImmersiveFallback()) {
  applyImmersiveShell();
  syncFullscreenButton();
}

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
