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

const player = { x: 150, y: groundY - 46, size: 46, velocityY: 0, rotation: 0 };
let jumpsUsed = 0;
let obstacles = [];
let particles = [];
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

function startLevel(resetScore = false) {
  obstacles = [];
  particles = [];
  if (resetScore) score = 0;
  levelTime = 0;
  speed = 6.5 + ((currentLevel - 1) / (TOTAL_LEVELS - 1)) * 5.5;
  distanceToNext = 430;
  Object.assign(player, { y: groundY - player.size, velocityY: 0, rotation: 0 });
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
  if (state !== "playing") return startLevel(["ready", "over", "finished"].includes(state));
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

function endGame() {
  state = "over";
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
    messageEl.innerHTML = `<p class="message-kicker">Level ${completedLevel} complete!</p><h2>Next: Level ${currentLevel}</h2><p>Tap, click, or press <kbd>Space</kbd> to continue</p>`;
  }
  messageEl.classList.remove("hidden");
}

function spawnObstacle() {
  const difficulty = (currentLevel - 1) / (TOTAL_LEVELS - 1);
  const clusterSize = Math.random() < difficulty * 0.55 ? (Math.random() < difficulty * 0.3 ? 3 : 2) : 1;
  const spikeWidth = 40;
  obstacles.push({ x: W + 30, width: spikeWidth * clusterSize, height: 42 + difficulty * 10 });
  const minGap = 245 - difficulty * 45;
  const randomGap = 260 - difficulty * 100;
  distanceToNext = minGap + Math.random() * randomGap;
}

function overlapsSpike(o) {
  const pad = 8;
  return player.x + player.size - pad > o.x && player.x + pad < o.x + o.width && player.y + player.size - 5 > groundY - o.height;
}

function update(dt, elapsedSeconds) {
  if (state !== "playing") return;
  player.velocityY += 0.92 * dt;
  player.y += player.velocityY * dt;
  if (player.y >= groundY - player.size) {
    player.y = groundY - player.size;
    player.velocityY = 0;
    jumpsUsed = 0;
    player.rotation = Math.round(player.rotation / (Math.PI / 2)) * (Math.PI / 2);
  } else {
    player.rotation += 0.09 * dt;
  }

  distanceToNext -= speed * dt;
  if (distanceToNext <= 0) spawnObstacle();
  obstacles.forEach((o) => {
    o.x -= speed * dt;
  });
  obstacles = obstacles.filter((o) => o.x + o.width > -20);
  if (obstacles.some(overlapsSpike)) {
    endGame();
    return;
  }

  particles.forEach((p) => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 0.15 * dt;
    p.life -= 0.025 * dt;
  });
  particles = particles.filter((p) => p.life > 0);
  levelTime += elapsedSeconds;
  score += POINTS_PER_SECOND * elapsedSeconds;
  scoreEl.textContent = Math.floor(score);
  levelProgressEl.style.width = `${Math.min(100, (levelTime / LEVEL_DURATION) * 100)}%`;
  if (levelTime >= LEVEL_DURATION) completeLevel();
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
  ctx.translate(player.x + player.size / 2, player.y + player.size / 2);
  ctx.rotate(player.rotation);
  paintCharacter(ctx, character, player.size, true);
  ctx.restore();
}

function drawObstacles() {
  ctx.fillStyle = "#ff5ea8";
  ctx.shadowColor = "#ff5ea8";
  ctx.shadowBlur = 16;
  obstacles.forEach((o) => {
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
  });
  ctx.shadowBlur = 0;
}

function draw(time) {
  drawBackground(time);
  const particleColor = getColor(character.color);
  particles.forEach((p) => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = particleColor;
    ctx.fillRect(p.x, p.y, 6, 6);
  });
  ctx.globalAlpha = 1;
  drawObstacles();
  drawPlayer();
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
