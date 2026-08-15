const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const bestEl = document.querySelector("#bestScore");
const levelEl = document.querySelector("#level");
const levelProgressEl = document.querySelector("#levelProgress");
const messageEl = document.querySelector("#gameMessage");
const restartButton = document.querySelector("#restartButton");
const soundButton = document.querySelector("#soundButton");

const W = canvas.width;
const H = canvas.height;
const groundY = 445;
const TOTAL_LEVELS = 62;
const LEVEL_DURATION = 20;
const POINTS_PER_SECOND = 10;
const player = { x: 150, y: groundY - 46, size: 46, velocityY: 0, rotation: 0 };
let jumpsUsed = 0;
let obstacles = [];
let particles = [];
let state = "ready";
let score = 0;
let levelTime = 0;
let currentLevel = Math.min(TOTAL_LEVELS, Math.max(1, Number(localStorage.getItem("khoiDashUnlocked") || 1)));
let speed = 7;
let distanceToNext = 430;
let lastTime = 0;
let soundOn = true;
let audioContext;
let best = Number(localStorage.getItem("khoiDashBest") || 0);
bestEl.textContent = best;
levelEl.textContent = currentLevel;
messageEl.querySelector("h2").textContent = `Level ${currentLevel} of ${TOTAL_LEVELS}`;

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
  if (state !== "playing") return startLevel(["ready", "over", "finished"].includes(state));
  if (jumpsUsed < 2) {
    player.velocityY = jumpsUsed === 0 ? -17.2 : -14.5;
    jumpsUsed += 1;
    beep(jumpsUsed === 1 ? 560 : 760, 0.08);
    for (let i = 0; i < 7; i++) particles.push({ x: player.x + 15, y: groundY, vx: -Math.random() * 3, vy: -Math.random() * 3, life: 1 });
  }
}

function endGame() {
  state = "over";
  beep(110, 0.3, 0.08);
  best = Math.max(best, Math.floor(score));
  localStorage.setItem("khoiDashBest", best);
  bestEl.textContent = best;
  messageEl.innerHTML = `<p class="message-kicker">Level ${currentLevel}</p><h2>Try again!</h2><p>${Math.floor(score)} points · Tap, click, or press <kbd>Space</kbd></p>`;
  messageEl.classList.remove("hidden");
}

function completeLevel() {
  state = "complete";
  obstacles = [];
  beep(880, 0.25, 0.07);
  best = Math.max(best, Math.floor(score));
  localStorage.setItem("khoiDashBest", best);
  bestEl.textContent = best;
  if (currentLevel === TOTAL_LEVELS) {
    state = "finished";
    messageEl.innerHTML = `<p class="message-kicker">All 62 levels complete!</p><h2>You are a Dash Master!</h2><p>Final score: ${Math.floor(score)} · Tap to play level 62 again</p>`;
  } else {
    const completedLevel = currentLevel;
    currentLevel += 1;
    localStorage.setItem("khoiDashUnlocked", currentLevel);
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
  obstacles.forEach((o) => o.x -= speed * dt);
  obstacles = obstacles.filter((o) => o.x + o.width > -20);
  if (obstacles.some(overlapsSpike)) {
    endGame();
    return;
  }

  particles.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.15 * dt; p.life -= 0.025 * dt; });
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
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 180, groundY); ctx.stroke();
  }
  for (let y = 45; y < groundY; y += 55) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#10162f";
  ctx.fillRect(0, groundY, W, H - groundY);
  ctx.fillStyle = "#76f7d2";
  ctx.fillRect(0, groundY, W, 7);
  ctx.fillStyle = "#1d2a51";
  for (let x = -((time * speed * 0.03) % 48); x < W; x += 48) ctx.fillRect(x, groundY + 22, 26, 8);
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x + player.size / 2, player.y + player.size / 2);
  ctx.rotate(player.rotation);
  ctx.shadowColor = "#76f7d2";
  ctx.shadowBlur = 20;
  ctx.fillStyle = "#76f7d2";
  ctx.fillRect(-23, -23, 46, 46);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#172039";
  ctx.fillRect(-13, -10, 8, 10);
  ctx.fillRect(5, -10, 8, 10);
  ctx.fillRect(-12, 9, 24, 5);
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
  particles.forEach((p) => { ctx.globalAlpha = p.life; ctx.fillStyle = "#76f7d2"; ctx.fillRect(p.x, p.y, 6, 6); });
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

window.addEventListener("keydown", (event) => {
  if (["Space", "ArrowUp", "KeyW"].includes(event.code)) { event.preventDefault(); act(); }
});
canvas.addEventListener("pointerdown", act);
messageEl.addEventListener("pointerdown", act);
restartButton.addEventListener("click", () => startLevel(true));
soundButton.addEventListener("click", () => {
  soundOn = !soundOn;
  soundButton.textContent = `Sound: ${soundOn ? "on" : "off"}`;
});

requestAnimationFrame(loop);
