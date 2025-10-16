// Classic Pong - script.js
(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // Hi-DPI scaling
  function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight || (width * 500 / 800);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Game constants
  const STAGE_W = 800;
  const STAGE_H = 500;

  // Paddles
  const PADDLE_W = 12;
  const PADDLE_H = 90;
  const PADDLE_SPEED = 6;

  // Ball
  const BALL_R = 8;
  const BALL_SPEED_BASE = 4;
  const BALL_SPEED_INC = 0.2;
  const MAX_BALL_SPEED = 12;

  // Game state
  let playerScore = 0;
  let aiScore = 0;
  let running = false;
  let paused = false;

  // Entities
  const player = {
    x: 20,
    y: (STAGE_H - PADDLE_H) / 2,
    w: PADDLE_W,
    h: PADDLE_H,
    dy: 0
  };

  const ai = {
    x: STAGE_W - 20 - PADDLE_W,
    y: (STAGE_H - PADDLE_H) / 2,
    w: PADDLE_W,
    h: PADDLE_H,
    dy: 0
  };

  const ball = {
    x: STAGE_W / 2,
    y: STAGE_H / 2,
    r: BALL_R,
    vx: 0,
    vy: 0,
    speed: BALL_SPEED_BASE
  };

  // Controls
  const keys = {
    ArrowUp: false,
    ArrowDown: false,
    KeyW: false,
    KeyS: false
  };

  document.addEventListener('keydown', (e) => {
    if (e.code in keys) keys[e.code] = true;
    if (e.code === 'Space') togglePause();
  });
  document.addEventListener('keyup', (e) => {
    if (e.code in keys) keys[e.code] = false;
  });

  // Buttons and score elements
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const playerScoreEl = document.getElementById('playerScore');
  const aiScoreEl = document.getElementById('aiScore');

  startBtn.addEventListener('click', startGame);
  pauseBtn.addEventListener('click', togglePause);
  resetBtn.addEventListener('click', resetGame);

  // Initialize ball velocity
  function resetBall(direction) {
    ball.x = STAGE_W / 2;
    ball.y = STAGE_H / 2;
    ball.speed = BALL_SPEED_BASE;
    // direction: 1 means to player's right (AI), -1 means to player's left
    const angle = (Math.random() * Math.PI / 4) - (Math.PI / 8); // -22.5deg..22.5deg
    const dir = direction || (Math.random() < 0.5 ? 1 : -1);
    ball.vx = Math.cos(angle) * ball.speed * dir;
    ball.vy = Math.sin(angle) * ball.speed;
  }

  function startGame() {
    if (!running) {
      running = true;
      paused = false;
      // center everything
      player.y = (STAGE_H - PADDLE_H) / 2;
      ai.y = (STAGE_H - PADDLE_H) / 2;
      playerScore = 0;
      aiScore = 0;
      updateScoreUI();
      resetBall((Math.random() < 0.5) ? 1 : -1);
      lastTime = performance.now();
      requestAnimationFrame(loop);
    } else {
      // If already running, unpause
      paused = false;
    }
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    if (!paused) {
      lastTime = performance.now();
      requestAnimationFrame(loop);
    }
  }

  function resetGame() {
    running = false;
    paused = false;
    playerScore = 0;
    aiScore = 0;
    updateScoreUI();
    player.y = (STAGE_H - PADDLE_H) / 2;
    ai.y = (STAGE_H - PADDLE_H) / 2;
    resetBall();
    pauseBtn.textContent = 'Pause';
    // Immediately render a fresh frame
    render();
  }

  function updateScoreUI() {
    playerScoreEl.textContent = String(playerScore);
    aiScoreEl.textContent = String(aiScore);
  }

  // Collision helpers
  function rectIntersect(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  // Main loop
  let lastTime = 0;
  function loop(timestamp) {
    if (!running || paused) return;
    const dt = Math.min(40, timestamp - lastTime); // clamp delta to avoid big jumps
    lastTime = timestamp;

    update(dt / 16.666); // normalize to ~60fps ticks
    render();
    requestAnimationFrame(loop);
  }

  function update(delta) {
    // Player input
    let move = 0;
    if (keys.KeyW || keys.ArrowUp) move = -1;
    if (keys.KeyS || keys.ArrowDown) move = 1;
    player.dy = move * PADDLE_SPEED;
    player.y += player.dy * delta;

    // Clamp player paddle
    player.y = Math.max(0, Math.min(STAGE_H - player.h, player.y));

    // AI - simple predictive / smoothing follow
    // AI target is ball center; use lerp and cap speed
    const aiCenter = ai.y + ai.h / 2;
    const diff = (ball.y - aiCenter);
    // AI difficulty: lerp factor or max speed
    const aiMaxSpeed = 4.5;
    ai.dy = Math.max(-aiMaxSpeed, Math.min(aiMaxSpeed, diff * 0.12));
    ai.y += ai.dy * delta;
    ai.y = Math.max(0, Math.min(STAGE_H - ai.h, ai.y));

    // Ball movement
    ball.x += ball.vx * delta;
    ball.y += ball.vy * delta;

    // Top & bottom wall collision
    if (ball.y - ball.r < 0) {
      ball.y = ball.r;
      ball.vy = -ball.vy;
    } else if (ball.y + ball.r > STAGE_H) {
      ball.y = STAGE_H - ball.r;
      ball.vy = -ball.vy;
    }

    // Paddle collisions
    // Player paddle
    if (rectIntersect(ball.x - ball.r, ball.y - ball.r, ball.r * 2, ball.r * 2,
                      player.x, player.y, player.w, player.h)) {
      // Move ball out to avoid sticking
      ball.x = player.x + player.w + ball.r;
      // Compute hit position relative to paddle center (-1..1)
      const relativeIntersectY = (ball.y - (player.y + player.h / 2)) / (player.h / 2);
      const bounceAngle = relativeIntersectY * (Math.PI / 3); // up to 60 degrees
      const dir = 1; // to the right
      // increase speed mildly
      ball.speed = Math.min(MAX_BALL_SPEED, ball.speed + BALL_SPEED_INC);
      ball.vx = Math.cos(bounceAngle) * ball.speed * dir;
      ball.vy = Math.sin(bounceAngle) * ball.speed;
    }

    // AI paddle
    if (rectIntersect(ball.x - ball.r, ball.y - ball.r, ball.r * 2, ball.r * 2,
                      ai.x, ai.y, ai.w, ai.h)) {
      ball.x = ai.x - ball.r;
      const relativeIntersectY = (ball.y - (ai.y + ai.h / 2)) / (ai.h / 2);
      const bounceAngle = relativeIntersectY * (Math.PI / 3);
      const dir = -1; // to the left
      ball.speed = Math.min(MAX_BALL_SPEED, ball.speed + BALL_SPEED_INC);
      ball.vx = Math.cos(bounceAngle) * ball.speed * dir;
      ball.vy = Math.sin(bounceAngle) * ball.speed;
    }

    // Scoring
    if (ball.x - ball.r < 0) {
      // AI scores
      aiScore++;
      updateScoreUI();
      resetBall(1);
    } else if (ball.x + ball.r > STAGE_W) {
      // Player scores
      playerScore++;
      updateScoreUI();
      resetBall(-1);
    }
  }

  // Drawing
  function drawRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  function drawCircle(x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawNet() {
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    const step = 18;
    for (let y = 10; y < STAGE_H; y += step) {
      ctx.beginPath();
      ctx.moveTo(STAGE_W / 2, y);
      ctx.lineTo(STAGE_W / 2, y + step / 2);
      ctx.stroke();
    }
  }

  function render() {
    // Clear
    ctx.clearRect(0, 0, STAGE_W, STAGE_H);

    // Background subtle
    const grd = ctx.createLinearGradient(0, 0, 0, STAGE_H);
    grd.addColorStop(0, 'rgba(255,255,255,0.01)');
    grd.addColorStop(1, 'rgba(255,255,255,0.00)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);

    // Center net
    drawNet();

    // Paddles
    drawRect(player.x, player.y, player.w, player.h, '#e6e6e6');
    drawRect(ai.x, ai.y, ai.w, ai.h, '#e6e6e6');

    // Ball (with slight glow)
    ctx.save();
    ctx.shadowColor = 'rgba(230,230,230,0.06)';
    ctx.shadowBlur = 12;
    drawCircle(ball.x, ball.y, ball.r, '#ffffff');
    ctx.restore();

    // Scores and HUD are drawn via DOM; but draw subtle top bars
    // Mini corners
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect(0, 0, STAGE_W, 28);
  }

  // Initial render to show static game before starting
  resetBall();
  render();
})();