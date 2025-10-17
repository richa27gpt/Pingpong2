// Simple Pong game
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const W = canvas.width;
const H = canvas.height;

// Paddle settings
const P_W = 10;
const P_H = 100;
const P_MARGIN = 10;
const PLAYER_SPEED = 6;
const AI_MAX_SPEED = 4.2;

// Ball settings
const BALL_RADIUS = 8;
const BALL_BASE_SPEED = 5;
const BALL_SPEED_INC = 1.03;
const BALL_MAX_SPEED = 14;

// Game state
let playerScore = 0;
let computerScore = 0;

const leftPaddle = {
  x: P_MARGIN,
  y: (H - P_H) / 2,
  w: P_W,
  h: P_H,
  speed: PLAYER_SPEED,
};

const rightPaddle = {
  x: W - P_MARGIN - P_W,
  y: (H - P_H) / 2,
  w: P_W,
  h: P_H,
  speed: AI_MAX_SPEED,
};

let ball = {
  x: W / 2,
  y: H / 2,
  r: BALL_RADIUS,
  speed: BALL_BASE_SPEED,
  vx: BALL_BASE_SPEED,
  vy: 0,
};

let keys = { up: false, down: false };
let mouseY = null;

// Utility
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function resetBall(direction = (Math.random() < 0.5 ? -1 : 1)) {
  ball.x = W / 2;
  ball.y = H / 2;
  ball.speed = BALL_BASE_SPEED;
  const angle = (Math.random() * Math.PI / 4) - (Math.PI / 8); // -22.5 to +22.5 deg
  ball.vx = direction * ball.speed * Math.cos(angle);
  ball.vy = ball.speed * Math.sin(angle);
}

// Input
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseY = e.clientY - rect.top;
  // set center of paddle to mouse
  leftPaddle.y = clamp(mouseY - leftPaddle.h / 2, 0, H - leftPaddle.h);
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') keys.up = true;
  if (e.key === 'ArrowDown') keys.down = true;
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowUp') keys.up = false;
  if (e.key === 'ArrowDown') keys.down = false;
});

// Collision helpers
function rectCircleCollision(rx, ry, rw, rh, cx, cy, cr) {
  // Find closest point to circle within the rectangle
  const closestX = clamp(cx, rx, rx + rw);
  const closestY = clamp(cy, ry, ry + rh);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return (dx * dx + dy * dy) <= (cr * cr);
}

// Draw UI
function drawNet() {
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  const step = 16;
  for (let y = 0; y < H; y += step) {
    ctx.fillRect(W / 2 - 1, y + 4, 2, step / 2);
  }
}

function draw() {
  // Clear
  ctx.clearRect(0, 0, W, H);

  // Background subtle panel
  ctx.fillStyle = 'rgba(10,18,30,0.04)';
  ctx.fillRect(0, 0, W, H);

  // Net
  drawNet();

  // Paddles
  ctx.fillStyle = '#00ff9c';
  ctx.fillRect(leftPaddle.x, leftPaddle.y, leftPaddle.w, leftPaddle.h);
  ctx.fillStyle = '#67d3ff';
  ctx.fillRect(rightPaddle.x, rightPaddle.y, rightPaddle.w, rightPaddle.h);

  // Ball
  ctx.beginPath();
  ctx.fillStyle = '#ffffff';
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();

  // Scores (the page has scoreboard too; draw small center text)
  ctx.fillStyle = 'rgba(230,238,246,0.08)';
  ctx.font = '20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${playerScore}  —  ${computerScore}`, W / 2, 30);
}

function updatePaddles() {
  // Player keys override mouse a bit: if keys pressed move up/down
  if (keys.up) leftPaddle.y -= leftPaddle.speed;
  if (keys.down) leftPaddle.y += leftPaddle.speed;

  // Constrain
  leftPaddle.y = clamp(leftPaddle.y, 0, H - leftPaddle.h);

  // Computer AI: move toward ball but limited speed
  const paddleCenter = rightPaddle.y + rightPaddle.h / 2;
  // if ball is moving toward the AI, track faster; if moving away, slowly center
  const target = (ball.vx > 0) ? ball.y : H / 2;
  const diff = target - paddleCenter;
  const move = clamp(diff, -rightPaddle.speed, rightPaddle.speed);
  rightPaddle.y += move;
  rightPaddle.y = clamp(rightPaddle.y, 0, H - rightPaddle.h);
}

function handleBallCollisions() {
  // Top / Bottom walls
  if (ball.y - ball.r <= 0) {
    ball.y = ball.r;
    ball.vy = -ball.vy;
  } else if (ball.y + ball.r >= H) {
    ball.y = H - ball.r;
    ball.vy = -ball.vy;
  }

  // Left paddle
  if (ball.vx < 0) {
    if (rectCircleCollision(leftPaddle.x, leftPaddle.y, leftPaddle.w, leftPaddle.h, ball.x, ball.y, ball.r)) {
      // compute hit position relative to paddle center (-1..1)
      const relativeY = (ball.y - (leftPaddle.y + leftPaddle.h / 2)) / (leftPaddle.h / 2);
      const maxBounceAngle = Math.PI / 3; // 60 degrees
      const bounceAngle = relativeY * maxBounceAngle;
      ball.speed = Math.min(ball.speed * BALL_SPEED_INC, BALL_MAX_SPEED);
      ball.vx = Math.abs(ball.speed * Math.cos(bounceAngle));
      ball.vy = ball.speed * Math.sin(bounceAngle);
      // push ball out of paddle to prevent sticking
      ball.x = leftPaddle.x + leftPaddle.w + ball.r + 0.1;
    }
  } else { // Right paddle
    if (rectCircleCollision(rightPaddle.x, rightPaddle.y, rightPaddle.w, rightPaddle.h, ball.x, ball.y, ball.r)) {
      const relativeY = (ball.y - (rightPaddle.y + rightPaddle.h / 2)) / (rightPaddle.h / 2);
      const maxBounceAngle = Math.PI / 3;
      const bounceAngle = relativeY * maxBounceAngle;
      ball.speed = Math.min(ball.speed * BALL_SPEED_INC, BALL_MAX_SPEED);
      ball.vx = -Math.abs(ball.speed * Math.cos(bounceAngle));
      ball.vy = ball.speed * Math.sin(bounceAngle);
      ball.x = rightPaddle.x - ball.r - 0.1;
    }
  }

  // Left / Right edges -> score
  if (ball.x + ball.r < 0) {
    // Computer scores
    computerScore += 1;
    updateScoreboard();
    resetBall(1);
    // small pause effect
  } else if (ball.x - ball.r > W) {
    // Player scores
    playerScore += 1;
    updateScoreboard();
    resetBall(-1);
  }
}

function updateScoreboard() {
  document.getElementById('playerScore').textContent = playerScore;
  document.getElementById('computerScore').textContent = computerScore;
}

function update() {
  // Move ball
  ball.x += ball.vx;
  ball.y += ball.vy;

  updatePaddles();
  handleBallCollisions();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// Start
resetBall();
updateScoreboard();
requestAnimationFrame(loop);
