/* ============================================================
   Bounce (Breakout) helpers + component
   ============================================================ */

// Fixed internal resolution — physics are device-independent; the canvas
// bitmap is scaled to fit the column via CSS.
const BOUNCE_W       = 360;
const BOUNCE_H       = 480;
const BOUNCE_PADDLE_W = 64;
const BOUNCE_PADDLE_H = 10;
const BOUNCE_PADDLE_Y = BOUNCE_H - 30;
const BOUNCE_BALL_R  = 6;
const BOUNCE_COLS    = 9;
const BOUNCE_BRICK_H = 16;
const BOUNCE_TOP     = 44;          // y offset of the first brick row
const BOUNCE_MARGIN  = 16;
const BOUNCE_GAP_X   = 5;
const BOUNCE_GAP_Y   = 6;
const BOUNCE_BASE_SPEED = 3.6;      // px per 1/60s step at level 1
const BOUNCE_MAX_SPEED  = 7.2;      // speed-up cap
const BOUNCE_MAX_ANGLE  = Math.PI / 3;   // 60° max paddle deflection
const BOUNCE_PADDLE_KEY_SPEED = 7;  // px/step when steering by key/dpad
const BOUNCE_LIVES   = 3;
const BOUNCE_LEVEL_BONUS = 100;
const BOUNCE_FIXED_DT = 1000 / 60;
const BOUNCE_SUBSTEPS = 3;          // anti-tunneling integration substeps
const BOUNCE_BEST_KEY = 'puzzlechain_bounce_best';

// Points by row (top rows are harder to reach, so worth more); fallback 10.
const BOUNCE_ROW_POINTS = [50, 50, 30, 30, 20, 10, 10, 10];
const BOUNCE_ROW_COLORS = [C.rose, C.gold, C.emerald, C.violet, C.accent];

function bounceClamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

function bounceLoadBest() {
  try { return parseInt(localStorage.getItem(BOUNCE_BEST_KEY) || '0', 10) || 0; } catch { return 0; }
}
function bounceSaveBest(v) {
  try { localStorage.setItem(BOUNCE_BEST_KEY, String(v)); } catch {}
}

function bounceSpeedForLevel(level) {
  return Math.min(BOUNCE_BASE_SPEED + (level - 1) * 0.5, BOUNCE_MAX_SPEED);
}

// Build the brick wall for a level — denser (more rows) as levels climb.
function bounceBuildBricks(level) {
  const rows = Math.min(4 + (level - 1), 8);
  const brickW = (BOUNCE_W - 2 * BOUNCE_MARGIN - (BOUNCE_COLS - 1) * BOUNCE_GAP_X) / BOUNCE_COLS;
  const bricks = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < BOUNCE_COLS; c++) {
      bricks.push({
        x: BOUNCE_MARGIN + c * (brickW + BOUNCE_GAP_X),
        y: BOUNCE_TOP + r * (BOUNCE_BRICK_H + BOUNCE_GAP_Y),
        w: brickW,
        h: BOUNCE_BRICK_H,
        alive: true,
        points: BOUNCE_ROW_POINTS[r] != null ? BOUNCE_ROW_POINTS[r] : 10,
        color: BOUNCE_ROW_COLORS[r % BOUNCE_ROW_COLORS.length],
      });
    }
  }
  return bricks;
}

function bounceShareText(score, level, secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `I scored ${score.toLocaleString()} on Bounce 🧱 — reached level ${level} · ${m}:${s}`;
}

/* ============================================================
   Power-ups system (Bounce & Zuma)
   ============================================================ */
const POWERUP_DURATION_MS = 10000;
const POWERUP_SPAWN_RATE = 0.1;
const POWERUP_RADIUS = 12;
const POWERUP_TYPES = {
  bounce: ['multi-ball', 'larger-paddle', 'slower-ball', 'laser'],
  zuma: ['multi-shot', 'faster-shot', 'color-switch', 'chain-clear'],
};
const POWERUP_ICONS = {
  'multi-ball': '🔄',
  'larger-paddle': '⬆️',
  'slower-ball': '🐢',
  'laser': '⚡',
  'multi-shot': '🔄',
  'faster-shot': '💨',
  'color-switch': '🎨',
  'chain-clear': '✂️',
};

function spawnPowerup(x, y, typeArray) {
  const type = typeArray[Math.floor(Math.random() * typeArray.length)];
  return {
    id: `pu_${Date.now()}_${Math.random()}`,
    type,
    x, y,
    vx: (Math.random() - 0.5) * 1.2,
    vy: 1.5,
    radius: POWERUP_RADIUS,
    spawnedAt: Date.now(),
    caught: false,
  };
}

function updatePowerup(pu, scale) {
  pu.x += pu.vx * scale;
  pu.y += pu.vy * scale;
  pu.vy += 0.1 * scale;
}

function BounceGame({ onWin, onStepChange, resetKey }) {
  const [score, setScore]   = useState(0);
  const [lives, setLives]   = useState(BOUNCE_LIVES);
  const [level, setLevel]   = useState(1);
  const [started, setStarted] = useState(false);
  const [done, setDone]     = useState(false);
  const [activeTab, setActiveTab] = useState('game');
  const [bestScore, setBestScore] = useState(() => bounceLoadBest());
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [isMock, setIsMock] = useState(false);
  const [activePowerups, setActivePowerups] = useState([]);

  // Leaderboard tab state (mirrors Snake)
  const [lb, setLb]               = useState(null);
  const [lbLoading, setLbLoading] = useState(false);
  const [lbError, setLbError]     = useState(false);

  // Canvas + simulation refs (the hot loop mutates these, not React state).
  const canvasRef   = useRef(null);
  const ctxRef      = useRef(null);
  const rafRef      = useRef(null);
  const lastTsRef   = useRef(null);
  const accRef      = useRef(0);

  const paddleRef   = useRef(BOUNCE_W / 2);
  const ballRef     = useRef({ x: BOUNCE_W / 2, y: BOUNCE_PADDLE_Y - BOUNCE_BALL_R - 1, vx: 0, vy: 0 });
  const bricksRef   = useRef(bounceBuildBricks(1));
  const speedRef    = useRef(bounceSpeedForLevel(1));
  const scoreRef    = useRef(0);
  const livesRef    = useRef(BOUNCE_LIVES);
  const levelRef    = useRef(1);
  const brokenRef   = useRef(0);
  const elapsedRef  = useRef(0);
  const launchedRef = useRef(false);
  const startedRef  = useRef(false);
  const doneRef     = useRef(false);
  const submittedRef = useRef(false);
  const leftRef     = useRef(false);
  const rightRef    = useRef(false);

  // Power-ups refs
  const ballsRef    = useRef([{ x: BOUNCE_W / 2, y: BOUNCE_PADDLE_Y - BOUNCE_BALL_R - 1, vx: 0, vy: 0 }]);
  const powerUpsRef = useRef([]);
  const activePowerupsRef = useRef([]);
  const basePaddleWRef = useRef(BOUNCE_PADDLE_W);
  const baseSpeedRef = useRef(bounceSpeedForLevel(1));
  const laserLoadedRef = useRef(0);

  // Latest-closure prop refs so listeners/loop mount once.
  const onWinRef = useRef(onWin);        onWinRef.current = onWin;
  const onStepRef = useRef(onStepChange); onStepRef.current = onStepChange;

  const loopRunning = activeTab === 'game' && !done;
  const timerRunning = started && !done && activeTab === 'game';

  const fmtSecs = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

  useEffect(() => {
    if (window.usernode && typeof window.usernode.isMockEnabled === 'function') {
      window.usernode.isMockEnabled().then(m => setIsMock(!!m)).catch(() => {});
    }
  }, []);

  // Elapsed-time clock (pauses when not actively playing).
  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => { elapsedRef.current += 1; setElapsedSecs(elapsedRef.current); }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  const resetBallToPaddle = () => {
    ballsRef.current = [{ x: paddleRef.current, y: BOUNCE_PADDLE_Y - BOUNCE_BALL_R - 1, vx: 0, vy: 0 }];
  };

  const handleNewGame = () => {
    paddleRef.current = BOUNCE_W / 2;
    basePaddleWRef.current = BOUNCE_PADDLE_W;
    bricksRef.current = bounceBuildBricks(1);
    speedRef.current = bounceSpeedForLevel(1);
    baseSpeedRef.current = bounceSpeedForLevel(1);
    scoreRef.current = 0;
    livesRef.current = BOUNCE_LIVES;
    levelRef.current = 1;
    brokenRef.current = 0;
    elapsedRef.current = 0;
    launchedRef.current = false;
    startedRef.current = false;
    doneRef.current = false;
    submittedRef.current = false;
    leftRef.current = false;
    rightRef.current = false;
    accRef.current = 0;
    lastTsRef.current = null;
    powerUpsRef.current = [];
    activePowerupsRef.current = [];
    laserLoadedRef.current = 0;
    resetBallToPaddle();
    setScore(0); setLives(BOUNCE_LIVES); setLevel(1);
    setStarted(false); setDone(false); setElapsedSecs(0); setActivePowerups([]);
  };

  useEffect(() => {
    if (!resetKey) return;
    handleNewGame();
  }, [resetKey]);

  const submitScore = async (finalScore, finalLevel, secs) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setBestScore(prev => {
      if (finalScore > prev) { bounceSaveBest(finalScore); return finalScore; }
      return prev;
    });
    try {
      await api('/api/bounce/score', {
        method: 'POST',
        body: JSON.stringify({ score: finalScore, level: finalLevel, timeSecs: secs }),
      });
    } catch {}
  };

  const launch = () => {
    if (doneRef.current || launchedRef.current) return;
    launchedRef.current = true;
    if (!startedRef.current) { startedRef.current = true; setStarted(true); }
    const speed = speedRef.current;
    const ball = ballRef.current;
    ball.vx = speed * 0.4;
    ball.vy = -Math.sqrt(Math.max(0.01, speed * speed - ball.vx * ball.vx));
  };
  const launchRef = useRef(launch);
  launchRef.current = launch;

  const endGame = () => {
    doneRef.current = true;
    setDone(true);
    const finalScore = scoreRef.current;
    const lvl = levelRef.current;
    const secs = elapsedRef.current;
    submitScore(finalScore, lvl, secs);
    onWinRef.current && onWinRef.current(finalScore, brokenRef.current, secs, {
      share: bounceShareText(finalScore, lvl, secs),
    });
  };

  const nextLevel = () => {
    scoreRef.current += BOUNCE_LEVEL_BONUS;
    setScore(scoreRef.current);
    const lvl = levelRef.current + 1;
    levelRef.current = lvl;
    setLevel(lvl);
    speedRef.current = bounceSpeedForLevel(lvl);
    bricksRef.current = bounceBuildBricks(lvl);
    launchedRef.current = false;
    resetBallToPaddle();
  };

  const loseLife = () => {
    const remaining = livesRef.current - 1;
    livesRef.current = remaining;
    setLives(remaining);
    if (remaining <= 0) { endGame(); return; }
    launchedRef.current = false;
    resetBallToPaddle();
  };

  const stepBall = (scale) => {
    const balls = ballsRef.current;
    const bricks = bricksRef.current;
    const px = paddleRef.current;
    const paddleW = basePaddleWRef.current * (1 + activePowerupsRef.current.filter(p => p.type === 'larger-paddle').reduce((a, p) => a + 0.5 * p.stacks, 0));

    for (let ballIdx = 0; ballIdx < balls.length; ballIdx++) {
      const ball = balls[ballIdx];
      ball.x += ball.vx * scale;
      ball.y += ball.vy * scale;

      if (ball.x - BOUNCE_BALL_R < 0) { ball.x = BOUNCE_BALL_R; ball.vx = Math.abs(ball.vx); }
      else if (ball.x + BOUNCE_BALL_R > BOUNCE_W) { ball.x = BOUNCE_W - BOUNCE_BALL_R; ball.vx = -Math.abs(ball.vx); }
      if (ball.y - BOUNCE_BALL_R < 0) { ball.y = BOUNCE_BALL_R; ball.vy = Math.abs(ball.vy); }

      if (ball.vy > 0 &&
          ball.y + BOUNCE_BALL_R >= BOUNCE_PADDLE_Y &&
          ball.y + BOUNCE_BALL_R <= BOUNCE_PADDLE_Y + BOUNCE_PADDLE_H + 8 &&
          ball.x >= px - paddleW / 2 - BOUNCE_BALL_R &&
          ball.x <= px + paddleW / 2 + BOUNCE_BALL_R) {
        const hit = bounceClamp((ball.x - px) / (paddleW / 2), -1, 1);
        const angle = hit * BOUNCE_MAX_ANGLE;
        const speed = speedRef.current;
        ball.vx = speed * Math.sin(angle);
        ball.vy = -Math.abs(speed * Math.cos(angle));
        ball.y = BOUNCE_PADDLE_Y - BOUNCE_BALL_R - 1;
      }

      for (let i = 0; i < bricks.length; i++) {
        const b = bricks[i];
        if (!b.alive) continue;
        const ox = Math.min(ball.x + BOUNCE_BALL_R, b.x + b.w) - Math.max(ball.x - BOUNCE_BALL_R, b.x);
        const oy = Math.min(ball.y + BOUNCE_BALL_R, b.y + b.h) - Math.max(ball.y - BOUNCE_BALL_R, b.y);
        if (ox > 0 && oy > 0) {
          if (laserLoadedRef.current > 0) {
            const col = Math.floor((b.x - BOUNCE_MARGIN) / ((BOUNCE_W - 2 * BOUNCE_MARGIN - (BOUNCE_COLS - 1) * BOUNCE_GAP_X) / BOUNCE_COLS + BOUNCE_GAP_X));
            for (let j = 0; j < bricks.length; j++) {
              const br = bricks[j];
              const brickCol = Math.floor((br.x - BOUNCE_MARGIN) / ((BOUNCE_W - 2 * BOUNCE_MARGIN - (BOUNCE_COLS - 1) * BOUNCE_GAP_X) / BOUNCE_COLS + BOUNCE_GAP_X));
              if (brickCol === col && br.alive) {
                br.alive = false;
                brokenRef.current += 1;
                scoreRef.current += br.points;
              }
            }
            laserLoadedRef.current -= 1;
          } else {
            b.alive = false;
            brokenRef.current += 1;
            scoreRef.current += b.points;
          }
          setScore(scoreRef.current);
          onStepRef.current && onStepRef.current(brokenRef.current);
          if (Math.random() < POWERUP_SPAWN_RATE) {
            powerUpsRef.current.push(spawnPowerup(b.x + b.w / 2, b.y + b.h / 2, POWERUP_TYPES.bounce));
          }
          if (ox < oy) { ball.vx = -ball.vx; ball.x += (ball.vx > 0 ? 1 : -1) * ox; }
          else { ball.vy = -ball.vy; ball.y += (ball.vy > 0 ? 1 : -1) * oy; }
          if (bricks.every(x => !x.alive)) { nextLevel(); return true; }
          break;
        }
      }

      if (ball.y - BOUNCE_BALL_R > BOUNCE_H) {
        balls.splice(ballIdx, 1);
        ballIdx--;
        if (balls.length === 0) { loseLife(); return true; }
      }
    }
    return false;
  };

  const update = () => {
    const now = Date.now();
    const paddleW = basePaddleWRef.current * (1 + activePowerupsRef.current.filter(p => p.type === 'larger-paddle').reduce((a, p) => a + 0.5 * p.stacks, 0));

    let px = paddleRef.current;
    if (leftRef.current) px -= BOUNCE_PADDLE_KEY_SPEED;
    if (rightRef.current) px += BOUNCE_PADDLE_KEY_SPEED;
    paddleRef.current = bounceClamp(px, paddleW / 2, BOUNCE_W - paddleW / 2);

    // Update power-ups in flight
    for (let i = powerUpsRef.current.length - 1; i >= 0; i--) {
      const pu = powerUpsRef.current[i];
      updatePowerup(pu, 1);

      if (!pu.caught && pu.y + pu.radius >= BOUNCE_PADDLE_Y && pu.x >= paddleRef.current - paddleW / 2 - 20 && pu.x <= paddleRef.current + paddleW / 2 + 20) {
        pu.caught = true;
        const existing = activePowerupsRef.current.find(p => p.type === pu.type);
        if (pu.type === 'multi-ball') {
          if (ballsRef.current.length > 0) {
            const firstBall = ballsRef.current[0];
            const newBall = {
              x: firstBall.x + 10,
              y: firstBall.y,
              vx: firstBall.vx * Math.cos(Math.PI / 6) - firstBall.vy * Math.sin(Math.PI / 6),
              vy: firstBall.vx * Math.sin(Math.PI / 6) + firstBall.vy * Math.cos(Math.PI / 6),
            };
            ballsRef.current.push(newBall);
          }
        }
        if (existing) {
          existing.stacks += 1;
          existing.startedAt = now;
        } else {
          activePowerupsRef.current.push({ type: pu.type, startedAt: now, stacks: 1 });
        }
        setActivePowerups([...activePowerupsRef.current]);
        powerUpsRef.current.splice(i, 1);
      } else if (pu.y > BOUNCE_H + 50) {
        powerUpsRef.current.splice(i, 1);
      }
    }

    // Update active power-ups duration
    for (let i = activePowerupsRef.current.length - 1; i >= 0; i--) {
      const ap = activePowerupsRef.current[i];
      if (now - ap.startedAt > POWERUP_DURATION_MS) {
        if (ap.type === 'multi-shot') { } // handled in zuma
        activePowerupsRef.current.splice(i, 1);
      }
    }
    if (activePowerupsRef.current.length === 0 && powerUpsRef.current.length === 0) {
      setActivePowerups([]);
    }

    // Apply speed multiplier
    const slowPower = activePowerupsRef.current.find(p => p.type === 'slower-ball');
    if (slowPower) {
      speedRef.current = baseSpeedRef.current * Math.pow(0.7, slowPower.stacks);
    } else {
      speedRef.current = baseSpeedRef.current;
    }

    if (!launchedRef.current) { resetBallToPaddle(); return; }
    for (let i = 0; i < BOUNCE_SUBSTEPS; i++) {
      if (stepBall(1 / BOUNCE_SUBSTEPS)) return;
    }
  };

  const draw = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.clearRect(0, 0, BOUNCE_W, BOUNCE_H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, BOUNCE_W, BOUNCE_H);
    const bricks = bricksRef.current;
    for (let i = 0; i < bricks.length; i++) {
      const b = bricks[i];
      if (!b.alive) continue;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }

    // Draw power-ups in flight
    for (let i = 0; i < powerUpsRef.current.length; i++) {
      const pu = powerUpsRef.current[i];
      ctx.save();
      ctx.translate(pu.x, pu.y);
      const rotation = ((Date.now() - pu.spawnedAt) / 100) % (Math.PI * 2);
      ctx.rotate(rotation);
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(POWERUP_ICONS[pu.type], 0, 0);
      ctx.restore();

      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(pu.x, pu.y + pu.radius + 3, pu.radius * 0.7, pu.radius * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = C.text;
    const px = paddleRef.current;
    const paddleW = basePaddleWRef.current * (1 + activePowerupsRef.current.filter(p => p.type === 'larger-paddle').reduce((a, p) => a + 0.5 * p.stacks, 0));
    ctx.fillRect(px - paddleW / 2, BOUNCE_PADDLE_Y, paddleW, BOUNCE_PADDLE_H);

    const balls = ballsRef.current;
    ctx.fillStyle = C.gold;
    for (let i = 0; i < balls.length; i++) {
      const ball = balls[i];
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BOUNCE_BALL_R, 0, Math.PI * 2);
      ctx.fill();
    }

    if (startedRef.current && !launchedRef.current && !doneRef.current) {
      ctx.fillStyle = C.text;
      ctx.font = '600 14px "Space Grotesk", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Tap or press Space to launch', BOUNCE_W / 2, BOUNCE_H / 2);
    }
  };

  // Animation loop — fixed-timestep accumulator so physics are frame-rate
  // independent; re-armed whenever play resumes (tab switch / not done).
  useEffect(() => {
    if (!loopRunning) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = BOUNCE_W * dpr;
    canvas.height = BOUNCE_H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxRef.current = ctx;
    lastTsRef.current = null;
    accRef.current = 0;

    const loop = (ts) => {
      rafRef.current = requestAnimationFrame(loop);
      if (lastTsRef.current == null) lastTsRef.current = ts;
      let dt = ts - lastTsRef.current;
      lastTsRef.current = ts;
      if (dt > 50) dt = 50;            // clamp after a backgrounded tab
      accRef.current += dt;
      let guard = 0;
      while (accRef.current >= BOUNCE_FIXED_DT && guard < 5) {
        update();
        accRef.current -= BOUNCE_FIXED_DT;
        guard += 1;
        if (doneRef.current) break;
      }
      draw();
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [loopRunning]);

  // Keyboard — mounted once, latest-closure via refs.
  useEffect(() => {
    const down = (e) => {
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') { e.preventDefault(); leftRef.current = true; }
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') { e.preventDefault(); rightRef.current = true; }
      else if (k === ' ' || k === 'Spacebar') { e.preventDefault(); launchRef.current(); }
    };
    const up = (e) => {
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') leftRef.current = false;
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') rightRef.current = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // Map a pointer's clientX onto the internal board coordinate and steer.
  const pointerToPaddle = (clientX) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    const x = (clientX - rect.left) / rect.width * BOUNCE_W;
    paddleRef.current = bounceClamp(x, BOUNCE_PADDLE_W / 2, BOUNCE_W - BOUNCE_PADDLE_W / 2);
  };
  const handleMouseMove = (e) => pointerToPaddle(e.clientX);
  const handleTouchMove = (e) => { if (e.touches[0]) { e.preventDefault(); pointerToPaddle(e.touches[0].clientX); } };
  const handleTouchStart = (e) => { if (e.touches[0]) pointerToPaddle(e.touches[0].clientX); launch(); };

  const loadLeaderboard = async () => {
    setLbLoading(true);
    setLbError(false);
    const { ok, body } = await api('/api/bounce/leaderboard');
    if (ok && body) setLb(body);
    else setLbError(true);
    setLbLoading(false);
  };

  return (
    <div>
      {isMock && <div className="t2048-banner">Local best score — leaderboard syncs to your account when live</div>}

      {activeTab === 'game' && (
        <div>
          <div className="status-bar">
            <div className="pill">
              <div className="plabel">Score</div>
              <div className="pvalue mono">{score.toLocaleString()}</div>
            </div>
            <div className="pill">
              <div className="plabel">Best</div>
              <div className="pvalue mono">{bestScore.toLocaleString()}</div>
            </div>
            <div className="pill">
              <div className="plabel">Lives</div>
              <div className="pvalue">{'●'.repeat(Math.max(0, lives)) || '—'}</div>
            </div>
            <div className="pill">
              <div className="plabel">Level</div>
              <div className="pvalue mono">{level}</div>
            </div>
            <div className="pill">
              <div className="plabel">Time</div>
              <div className="pvalue time">{fmtSecs(elapsedSecs)}</div>
            </div>
            {activePowerups.map((ap, idx) => {
              const now = Date.now();
              const elapsed = now - ap.startedAt;
              const remaining = Math.max(0, Math.ceil((POWERUP_DURATION_MS - elapsed) / 1000));
              return (
                <div key={idx} className="pill" style={{ background: C.emerald + '22', border: `1px solid ${C.emerald}` }}>
                  <div className="plabel" style={{ fontSize: '0.75rem' }}>
                    {POWERUP_ICONS[ap.type]} {remaining}s {ap.stacks > 1 ? `×${ap.stacks}` : ''}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bounce-board-wrap">
            <canvas
              ref={canvasRef}
              className="bounce-canvas"
              onMouseMove={handleMouseMove}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onClick={() => launch()}
            />
            {!started && !done && (
              <div className="bounce-start-overlay" onClick={() => launch()}>
                <div style={{ fontSize: '2rem' }}>🧱</div>
                <div>Move to aim, then tap / press Space to launch</div>
              </div>
            )}
          </div>

          <div className="bounce-dpad">
            <button
              aria-label="Left"
              onPointerDown={(e) => { e.preventDefault(); leftRef.current = true; }}
              onPointerUp={() => { leftRef.current = false; }}
              onPointerLeave={() => { leftRef.current = false; }}
            >◀</button>
            <button
              aria-label="Right"
              onPointerDown={(e) => { e.preventDefault(); rightRef.current = true; }}
              onPointerUp={() => { rightRef.current = false; }}
              onPointerLeave={() => { rightRef.current = false; }}
            >▶</button>
          </div>

          <div className="bounce-controls">
            <button onClick={handleNewGame}>↺ New Game</button>
          </div>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div>
          {lbLoading && <div className="snake-lb-empty">Loading…</div>}
          {!lbLoading && lbError && (
            <div className="snake-lb-empty">Leaderboard unavailable — your score is still saved locally.</div>
          )}
          {!lbLoading && !lbError && lb && (
            (() => {
              const top = lb.top || [];
              const me = lb.me || null;
              const meInTop = me && top.some(row => row.rank === me.rank);
              if (top.length === 0) {
                return <div className="snake-lb-empty">No scores yet — be the first to play!</div>;
              }
              return (
                <div className="snake-lb-list">
                  {top.map(row => (
                    <div key={row.rank} className={'snake-lb-row' + (me && row.rank === me.rank ? ' snake-lb-me' : '')}>
                      <span className="snake-lb-rank">#{row.rank}</span>
                      <span className="snake-lb-name">{row.username || 'anon'}</span>
                      <span className="snake-lb-score">{Number(row.bestScore).toLocaleString()}</span>
                    </div>
                  ))}
                  {me && !meInTop && (
                    <div>
                      <div className="snake-lb-divider">···</div>
                      <div className="snake-lb-row snake-lb-me">
                        <span className="snake-lb-rank">#{me.rank}</span>
                        <span className="snake-lb-name">{me.username || 'You'}</span>
                        <span className="snake-lb-score">{Number(me.bestScore).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>
      )}

      <div className="t2048-bottom-nav">
        {['game', 'leaderboard'].map(tab => (
          <button
            key={tab}
            className={'t2048-tab' + (activeTab === tab ? ' active' : '')}
            onClick={() => { setActiveTab(tab); if (tab === 'leaderboard') loadLeaderboard(); }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}
