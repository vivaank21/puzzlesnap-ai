/**
 * puzzle.js
 * ---------
 * Runs on /play. Slices the captured (already-enhanced) photo into a
 * grid of canvas pieces entirely client-side, then handles drag/drop,
 * magnetic snapping, timer, moves, hints, pause/resume, restart,
 * confetti/fireworks, and score submission.
 *
 * The source photo lives only as a data URL in sessionStorage and a
 * couple of in-memory <canvas> elements - it is explicitly deleted the
 * moment the puzzle is solved, and also cleared if this page is
 * refreshed or closed, per the app's privacy-first design.
 */

const GRID_SIZES = { easy: 3, medium: 4, hard: 5, expert: 6 };

const boardEl = document.getElementById('puzzleBoard');
const boardOverlay = document.getElementById('boardOverlay');
const referenceThumb = document.getElementById('referenceThumb');
const timerEl = document.getElementById('statTimer');
const movesEl = document.getElementById('statMoves');
const progressFill = document.getElementById('progressFill');
const progressLabel = document.getElementById('progressLabel');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');
const hintBtn = document.getElementById('hintBtn');
const previewBtn = document.getElementById('previewBtn');
const difficultyLabel = document.getElementById('currentDifficultyLabel');
const victoryTemplate = document.getElementById('victoryOverlay');

let sourceImage = null;
let difficulty = sessionStorage.getItem('ps_difficulty') || 'medium';
let gridSize = GRID_SIZES[difficulty] || 4;

let pieces = [];           // { el, canvas, row, col, correctX, correctY, x, y, size, placed }
let boardSize = 0;
let pieceSize = 0;
let moves = 0;
let hintsUsed = 0;
let elapsedSeconds = 0;
let timerHandle = null;
let paused = false;
let solved = false;

function boot() {
  const dataUrl = sessionStorage.getItem('ps_captured_image');
  if (!dataUrl) {
    window.location.href = '/capture';
    return;
  }
  difficultyLabel.textContent = difficulty[0].toUpperCase() + difficulty.slice(1) + ` (${gridSize}\u00d7${gridSize})`;
  referenceThumb.src = dataUrl;

  sourceImage = new Image();
  sourceImage.onload = () => buildPuzzle();
  sourceImage.src = dataUrl;

  bindControls();
  startTimer();
}

function bindControls() {
  pauseBtn.addEventListener('click', togglePause);
  restartBtn.addEventListener('click', restartPuzzle);
  hintBtn.addEventListener('click', useHint);
  previewBtn.addEventListener('mousedown', () => boardOverlay.classList.add('show', 'preview-mode'));
  previewBtn.addEventListener('mouseup', () => boardOverlay.classList.remove('show', 'preview-mode'));
  previewBtn.addEventListener('mouseleave', () => boardOverlay.classList.remove('show', 'preview-mode'));
  previewBtn.addEventListener('touchstart', (e) => { e.preventDefault(); boardOverlay.classList.add('show', 'preview-mode'); });
  previewBtn.addEventListener('touchend', () => boardOverlay.classList.remove('show', 'preview-mode'));

  window.addEventListener('beforeunload', () => {
    // Honor the "deleted on refresh / session end" privacy guarantee.
    sessionStorage.removeItem('ps_captured_image');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === ' ') { e.preventDefault(); togglePause(); }
    if (e.key.toLowerCase() === 'h') useHint();
    if (e.key.toLowerCase() === 'r') restartPuzzle();
  });
}

/* ---------------- Build & slice ---------------- */

function buildPuzzle() {
  boardEl.innerHTML = '';
  pieces = [];
  moves = 0;
  hintsUsed = 0;
  elapsedSeconds = 0;
  solved = false;
  updateStats();

  boardSize = boardEl.clientWidth;
  pieceSize = boardSize / gridSize;

  // Source image is itself square (server always crops to square), so a
  // uniform sw/sh slice maps cleanly to a uniform piece grid.
  const srcSize = Math.min(sourceImage.naturalWidth, sourceImage.naturalHeight);
  const srcSlice = srcSize / gridSize;

  const order = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) order.push({ row, col });
  }

  order.forEach(({ row, col }) => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(pieceSize);
    canvas.height = Math.round(pieceSize);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      sourceImage,
      col * srcSlice, row * srcSlice, srcSlice, srcSlice,
      0, 0, canvas.width, canvas.height
    );

    const el = document.createElement('div');
    el.className = 'puzzle-piece';
    el.style.width = pieceSize + 'px';
    el.style.height = pieceSize + 'px';
    el.appendChild(canvas);

    const correctX = col * pieceSize;
    const correctY = row * pieceSize;

    const piece = { el, row, col, correctX, correctY, x: 0, y: 0, placed: false };
    pieces.push(piece);
    boardEl.appendChild(el);

    attachDragHandlers(piece);
  });

  scatterPieces();
}

function scatterPieces() {
  const margin = pieceSize * 0.15;
  pieces.forEach((p) => {
    let x, y, tooClose;
    let attempts = 0;
    do {
      x = margin + Math.random() * (boardSize - pieceSize - margin * 2);
      y = margin + Math.random() * (boardSize - pieceSize - margin * 2);
      tooClose = Math.hypot(x - p.correctX, y - p.correctY) < pieceSize * 0.6;
      attempts++;
    } while (tooClose && attempts < 12);
    placePieceAt(p, x, y, false);
    p.placed = false;
    p.el.classList.remove('placed', 'hinted');
  });
  // randomize stacking order so it doesn't read as a tidy grid
  pieces
    .slice()
    .sort(() => Math.random() - 0.5)
    .forEach((p) => boardEl.appendChild(p.el));
}

function placePieceAt(piece, x, y, animate) {
  piece.x = x;
  piece.y = y;
  piece.el.style.transition = animate ? 'left .25s var(--ease), top .25s var(--ease)' : 'none';
  piece.el.style.left = x + 'px';
  piece.el.style.top = y + 'px';
}

/* ---------------- Drag & drop (pointer events: mouse + touch) ---------------- */

function attachDragHandlers(piece) {
  let dragging = false;
  let startX, startY, originX, originY;

  piece.el.addEventListener('pointerdown', (e) => {
    if (paused || solved || piece.placed) return;
    dragging = true;
    piece.el.setPointerCapture(e.pointerId);
    piece.el.classList.add('dragging');
    boardEl.appendChild(piece.el); // bring to front
    startX = e.clientX;
    startY = e.clientY;
    originX = piece.x;
    originY = piece.y;
  });

  piece.el.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    let nx = clamp(originX + dx, -pieceSize * 0.3, boardSize - pieceSize * 0.7);
    let ny = clamp(originY + dy, -pieceSize * 0.3, boardSize - pieceSize * 0.7);
    placePieceAt(piece, nx, ny, false);
  });

  piece.el.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    piece.el.classList.remove('dragging');

    const moved = Math.hypot(piece.x - originX, piece.y - originY) > 4;
    if (moved) {
      moves++;
      updateStats();
    }

    const distToCorrect = Math.hypot(piece.x - piece.correctX, piece.y - piece.correctY);
    if (distToCorrect < pieceSize * 0.28) {
      snapPiece(piece);
    } else {
      placePieceAt(piece, piece.x, piece.y, true);
    }
  });
}

function snapPiece(piece) {
  placePieceAt(piece, piece.correctX, piece.correctY, true);
  piece.placed = true;
  piece.el.classList.add('placed');
  piece.el.classList.remove('hinted');
  piece.el.style.cursor = 'default';
  window.PSAudio && PSAudio.correct();
  checkCompletion();
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

/* ---------------- Stats / timer ---------------- */

function startTimer() {
  clearInterval(timerHandle);
  timerHandle = setInterval(() => {
    if (paused || solved) return;
    elapsedSeconds++;
    updateStats();
  }, 1000);
}

function updateStats() {
  const m = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const s = String(elapsedSeconds % 60).padStart(2, '0');
  timerEl.textContent = `${m}:${s}`;
  movesEl.textContent = moves;

  const placedCount = pieces.filter((p) => p.placed).length;
  const pct = pieces.length ? Math.round((placedCount / pieces.length) * 100) : 0;
  progressFill.style.width = pct + '%';
  progressLabel.textContent = `${placedCount} / ${pieces.length} pieces`;
}

function checkCompletion() {
  if (pieces.every((p) => p.placed)) {
    solved = true;
    clearInterval(timerHandle);
    submitScoreAndCelebrate();
  }
}

/* ---------------- Controls ---------------- */

function togglePause() {
  if (solved) return;
  paused = !paused;
  boardOverlay.classList.toggle('show', paused);
  boardOverlay.innerHTML = paused
    ? `<i class="fa-solid fa-pause" style="font-size:2rem;color:var(--violet-soft)"></i><h3 style="font-family:var(--font-display)">Paused</h3><p style="color:var(--text-muted)">Press space or click Resume to continue</p>`
    : '';
  pauseBtn.innerHTML = paused
    ? '<i class="fa-solid fa-play"></i> Resume'
    : '<i class="fa-solid fa-pause"></i> Pause';
  pieces.forEach((p) => (p.el.style.pointerEvents = paused ? 'none' : 'auto'));
}

function restartPuzzle() {
  if (paused) togglePause();
  scatterPieces();
  moves = 0;
  hintsUsed = 0;
  elapsedSeconds = 0;
  solved = false;
  updateStats();
}

function useHint() {
  if (solved || paused) return;
  const unplaced = pieces.filter((p) => !p.placed);
  if (!unplaced.length) return;
  hintsUsed++;
  window.PSAudio && PSAudio.notify();

  const target = unplaced[Math.floor(Math.random() * unplaced.length)];
  pieces.forEach((p) => p.el.classList.remove('hinted'));
  target.el.classList.add('hinted');

  // Briefly nudge it toward its home, then let go so it still counts as a move.
  const ghost = document.createElement('div');
  ghost.style.cssText = `position:absolute;left:${target.correctX}px;top:${target.correctY}px;width:${pieceSize}px;height:${pieceSize}px;border:2px dashed var(--gold);border-radius:4px;pointer-events:none;opacity:.8;z-index:40;`;
  boardEl.appendChild(ghost);
  setTimeout(() => ghost.remove(), 1600);
}

/* ---------------- Victory ---------------- */

async function submitScoreAndCelebrate() {
  window.PSAudio && PSAudio.victory();
  let score = 0;
  try {
    const res = await fetch('/api/session/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        difficulty,
        completion_time: elapsedSeconds,
        total_moves: moves,
        hints_used: hintsUsed,
      }),
    });
    const data = await res.json();
    score = data.score || 0;
  } catch (e) {
    score = 0;
  }

  // Privacy: the photo's job is done - drop every in-memory reference.
  sessionStorage.removeItem('ps_captured_image');
  sourceImage = null;

  renderVictory(score);
  launchConfetti();
}

function renderVictory(score) {
  boardOverlay.innerHTML = `
    <h2 style="font-family:var(--font-display);font-size:1.8rem;margin-bottom:6px;">Solved! 🎉</h2>
    <div class="victory-score" id="victoryScoreNum">0</div>
    <div class="victory-stats">
      <div><div class="v-num">${timerEl.textContent}</div><div class="v-lbl">Time</div></div>
      <div><div class="v-num">${moves}</div><div class="v-lbl">Moves</div></div>
      <div><div class="v-num">${hintsUsed}</div><div class="v-lbl">Hints</div></div>
      <div><div class="v-num">${difficulty}</div><div class="v-lbl">Difficulty</div></div>
    </div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
      <a href="/capture" class="ps-btn ps-btn-primary"><i class="fa-solid fa-camera"></i> New Photo</a>
      <a href="/leaderboard" class="ps-btn ps-btn-secondary"><i class="fa-solid fa-ranking-star"></i> Leaderboard</a>
    </div>
  `;
  boardOverlay.classList.add('show');

  const counterEl = document.getElementById('victoryScoreNum');
  if (window.gsap) {
    gsap.fromTo(
      { val: 0 },
      { val: 0 },
      {}
    );
    let obj = { val: 0 };
    gsap.to(obj, {
      val: score,
      duration: 1.4,
      ease: 'power2.out',
      onUpdate: () => (counterEl.textContent = Math.round(obj.val)),
    });
  } else {
    counterEl.textContent = score;
  }
}

/* ---------------- Confetti + fireworks (canvas) ---------------- */

function launchConfetti() {
  const canvas = document.getElementById('fxCanvas');
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const colors = ['#7c5cff', '#33e1ed', '#ff6b6b', '#ffc857', '#4ade80'];

  const confetti = Array.from({ length: 160 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.5,
    r: 4 + Math.random() * 5,
    c: colors[Math.floor(Math.random() * colors.length)],
    vy: 2 + Math.random() * 3,
    vx: (Math.random() - 0.5) * 2,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.2,
  }));

  const fireworks = [];
  function spawnFirework() {
    const fx = canvas.width * (0.2 + Math.random() * 0.6);
    const fy = canvas.height * (0.2 + Math.random() * 0.35);
    const color = colors[Math.floor(Math.random() * colors.length)];
    for (let i = 0; i < 36; i++) {
      const angle = (Math.PI * 2 * i) / 36;
      const speed = 2 + Math.random() * 2.5;
      fireworks.push({
        x: fx, y: fy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 60 + Math.random() * 20,
        c: color,
      });
    }
  }
  spawnFirework();
  setTimeout(spawnFirework, 500);
  setTimeout(spawnFirework, 1000);

  let frame = 0;
  const maxFrames = 240;
  function tick() {
    frame++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    confetti.forEach((p) => {
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
      ctx.restore();
    });

    for (let i = fireworks.length - 1; i >= 0; i--) {
      const f = fireworks[i];
      f.x += f.vx; f.y += f.vy; f.vy += 0.04; f.life--;
      ctx.globalAlpha = Math.max(f.life / 80, 0);
      ctx.fillStyle = f.c;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (f.life <= 0) fireworks.splice(i, 1);
    }

    if (frame < maxFrames) {
      requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  tick();
}

boot();