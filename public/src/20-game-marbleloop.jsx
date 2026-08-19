/* ============================================================
   Zuma — frog shooter (Classic, leaderboard)
   ============================================================ */
const ZUMA_W = 300, ZUMA_H = 400;
const ZUMA_BALL_R = 11;
const ZUMA_DIAM = ZUMA_BALL_R * 2 + 2;
const ZUMA_SHOT_SPEED = 300;
const FROG_X = 150, FROG_Y = 218;
const ZUMA_COLORS_ALL = ['#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

const ZUMA_STORY_BANDS = 5;
const ZUMA_PATH_S = [
  {x:28,y:32},{x:75,y:25},{x:135,y:22},{x:195,y:25},{x:250,y:34},
  {x:276,y:58},{x:278,y:100},{x:268,y:138},{x:245,y:162},
  {x:208,y:175},{x:165,y:180},{x:122,y:175},{x:82,y:162},
  {x:52,y:138},{x:28,y:108},{x:18,y:155},{x:22,y:195},
  {x:42,y:228},{x:78,y:248},{x:120,y:256},{x:162,y:258},
  {x:205,y:255},{x:245,y:242},{x:268,y:220},
  {x:274,y:268},{x:265,y:308},{x:242,y:338},{x:208,y:358},
  {x:170,y:370},{x:148,y:374},
];

const ZUMA_PATH_L3 = [
  {x:28,y:32},{x:75,y:25},{x:135,y:22},{x:195,y:25},{x:250,y:34},
  {x:276,y:58},{x:278,y:100},{x:268,y:138},{x:245,y:162},
  {x:208,y:175},{x:165,y:180},{x:122,y:175},{x:82,y:162},
  {x:52,y:138},{x:28,y:108},{x:18,y:155},{x:22,y:195},
  {x:42,y:228},{x:78,y:248},{x:120,y:256},{x:162,y:258},
  {x:205,y:255},{x:245,y:242},{x:268,y:220},
  {x:255,y:248},{x:225,y:262},{x:188,y:268},{x:150,y:270},
  {x:112,y:268},{x:78,y:260},{x:52,y:245},{x:32,y:270},
  {x:26,y:300},{x:32,y:328},{x:52,y:350},{x:88,y:368},
  {x:125,y:377},{x:148,y:380},
];

/* #176 — the three authored levels stay as the free-play run, and a
   PARAMETRIC ladder sits beside them for story and arcade. The bottleneck here
   was always paths (the path IS the level, and there are two), so the ladder
   varies the things that actually change difficulty on a fixed track — ball
   count, chain speed and colour count — and alternates the two paths so
   consecutive rungs do not look identical. */
function zumaLevelForBand(band, bandCount) {
  const t = bandCount > 1 ? band / (bandCount - 1) : 0;
  return {
    path: band % 2 === 0 ? ZUMA_PATH_S : ZUMA_PATH_L3,
    ballCount: Math.round(20 + 22 * t),
    speed: Math.round(9 + 20 * t),
    colors: t < 0.34 ? 4 : t < 0.75 ? 5 : 6,
  };
}

const ZUMA_LEVELS = [
  { path: ZUMA_PATH_S,  ballCount: 20, speed: 9,  colors: 4 },
  { path: ZUMA_PATH_S,  ballCount: 26, speed: 15, colors: 4 },
  { path: ZUMA_PATH_L3, ballCount: 32, speed: 23, colors: 5 },
];

function zumaComputePathData(waypoints) {
  const cumDists = [0];
  for (let i = 1; i < waypoints.length; i++) {
    const dx = waypoints[i].x - waypoints[i-1].x;
    const dy = waypoints[i].y - waypoints[i-1].y;
    cumDists.push(cumDists[i-1] + Math.hypot(dx, dy));
  }
  return { waypoints, cumDists, totalLen: cumDists[cumDists.length - 1] };
}

function zumaPointAtDist(pd, dist) {
  const { waypoints: wps, cumDists: cd } = pd;
  if (dist <= 0) return wps[0];
  const last = cd.length - 1;
  if (dist >= cd[last]) return wps[last];
  let lo = 0, hi = last - 1;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (cd[m+1] < dist) lo = m + 1; else hi = m;
  }
  const t = (dist - cd[lo]) / (cd[lo+1] - cd[lo]);
  return { x: wps[lo].x + t*(wps[lo+1].x - wps[lo].x), y: wps[lo].y + t*(wps[lo+1].y - wps[lo].y) };
}

function zumaBuildChain(count, numColors) {
  const balls = [];
  for (let i = 0; i < count; i++) {
    balls.push({ color: ZUMA_COLORS_ALL[Math.floor(Math.random() * numColors)], dist: -i * ZUMA_DIAM });
  }
  return balls;
}

function zumaRandColor(numColors) {
  return ZUMA_COLORS_ALL[Math.floor(Math.random() * numColors)];
}

function zumaCheckMatches(chain, idx) {
  if (chain.length === 0 || idx < 0 || idx >= chain.length) return 0;
  const color = chain[idx].color;
  let lo = idx, hi = idx;
  while (lo > 0 && chain[lo-1].color === color) lo--;
  while (hi < chain.length-1 && chain[hi+1].color === color) hi++;
  const runLen = hi - lo + 1;
  if (runLen < 3) return 0;
  chain.splice(lo, runLen);
  let extra = 0;
  if (lo > 0 && lo < chain.length) {
    const needed = chain[lo-1].dist - ZUMA_DIAM;
    const shift = needed - chain[lo].dist;
    if (shift > 1) {
      for (let i = lo; i < chain.length; i++) chain[i].dist += shift;
      if (chain[lo-1].color === chain[lo].color) extra += zumaCheckMatches(chain, lo);
    }
  }
  return runLen + extra;
}

function ZumaGame({ onWin, onStepChange, resetKey, playMode, band }) {
  const { useState, useEffect, useRef } = React;
  /* One level, chosen by mode. Story plays exactly its band; arcade maps its
     three difficulties onto the same ladder; free play keeps the original
     three-level run untouched. */
  const modeLevels = useRef(null);
  if (!modeLevels.current) {
    if (playMode === 'story') {
      modeLevels.current = [zumaLevelForBand(Math.max(0, band || 0), ZUMA_STORY_BANDS)];
    } else if (playMode === 'arcade') {
      const i = Math.max(0, ARCADE_BANDS.findIndex(b => b.id === band));
      modeLevels.current = [zumaLevelForBand(Math.round((i / 2) * (ZUMA_STORY_BANDS - 1)), ZUMA_STORY_BANDS)];
    }
  }
  const LEVELS = modeLevels.current || ZUMA_LEVELS;
  const [activeTab, setActiveTab] = useState('game');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [ballsPopped, setBallsPopped] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [activePowerups, setActivePowerups] = useState([]);
  const [lb, setLb] = useState(null);
  const [lbLoading, setLbLoading] = useState(false);
  const [lbError, setLbError] = useState(false);

  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const elapsedRef = useRef(0);
  const startedRef = useRef(false);
  const doneRef = useRef(false);
  const submittedRef = useRef(false);
  const levelRef = useRef(1);
  const scoreRef = useRef(0);
  const bpRef = useRef(0);
  const chainRef = useRef([]);
  const shotRef = useRef(null);
  const frogAngleRef = useRef(-Math.PI / 2);
  const curColorRef = useRef(ZUMA_COLORS_ALL[0]);
  const nxtColorRef = useRef(ZUMA_COLORS_ALL[1]);
  const pathDataRef = useRef(null);
  const powerUpsRef = useRef([]);
  const activePowerupsRef = useRef([]);
  const baseShotSpeedRef = useRef(ZUMA_SHOT_SPEED);
  const wildColorLoadedRef = useRef(0);
  const chainClearLoadedRef = useRef(0);
  const onWinRef = useRef(onWin); onWinRef.current = onWin;
  const onStepRef = useRef(onStepChange); onStepRef.current = onStepChange;

  function initLevel(lvlNum) {
    const lvl = LEVELS[Math.min(lvlNum, LEVELS.length) - 1];
    pathDataRef.current = zumaComputePathData(lvl.path);
    chainRef.current = zumaBuildChain(lvl.ballCount, lvl.colors);
    curColorRef.current = zumaRandColor(lvl.colors);
    nxtColorRef.current = zumaRandColor(lvl.colors);
    shotRef.current = null;
  }

  function init() {
    levelRef.current = 1;
    scoreRef.current = 0;
    bpRef.current = 0;
    elapsedRef.current = 0;
    startedRef.current = false;
    doneRef.current = false;
    submittedRef.current = false;
    powerUpsRef.current = [];
    activePowerupsRef.current = [];
    wildColorLoadedRef.current = 0;
    chainClearLoadedRef.current = 0;
    initLevel(1);
    setScore(0); setLevel(1); setBallsPopped(0);
    setStarted(false); setDone(false); setElapsedSecs(0); setActivePowerups([]);
  }

  useEffect(() => { init(); }, [resetKey]);

  useEffect(() => {
    if (!started || done) return;
    const id = setInterval(() => { elapsedRef.current++; setElapsedSecs(elapsedRef.current); }, 1000);
    return () => clearInterval(id);
  }, [started, done]);

  const submitScore = async (finalScore, finalLevel) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    try {
      await api('/api/zuma/score', {
        method: 'POST',
        body: JSON.stringify({ score: finalScore, level: finalLevel, timeSecs: elapsedRef.current }),
      });
    } catch (_) {}
  };

  function triggerEnd(cleared) {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    const s = scoreRef.current;
    const bp = bpRef.current;
    const secs = elapsedRef.current;
    const lv = levelRef.current;
    submitScore(s, lv);
    onWinRef.current(s, bp, secs, {
      winnerLabel: cleared ? 'Cleared! 🎉' : 'Game Over',
      share: cleared
        ? '🐸 Marble Loop — ' + s + ' pts, all 3 levels cleared!'
        : '🐸 Marble Loop — ' + s + ' pts, level ' + lv,
    });
  }

  const loopRunning = activeTab === 'game' && !done;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = canvasDpr();
    canvas.width = Math.round(ZUMA_W * dpr);
    canvas.height = Math.round(ZUMA_H * dpr);

    function drawFrame() {
      const ctx = guardCanvasCtx(canvas.getContext('2d'));
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.fillStyle = PAL.bg;
      ctx.fillRect(0, 0, ZUMA_W, ZUMA_H);

      const pd = pathDataRef.current;
      if (pd) {
        // Track outer
        ctx.beginPath();
        ctx.moveTo(pd.waypoints[0].x, pd.waypoints[0].y);
        for (let i = 1; i < pd.waypoints.length; i++) ctx.lineTo(pd.waypoints[i].x, pd.waypoints[i].y);
        ctx.strokeStyle = '#1e3a5f';
        ctx.lineWidth = ZUMA_BALL_R * 2 + 6;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.stroke();
        // Track inner
        ctx.beginPath();
        ctx.moveTo(pd.waypoints[0].x, pd.waypoints[0].y);
        for (let i = 1; i < pd.waypoints.length; i++) ctx.lineTo(pd.waypoints[i].x, pd.waypoints[i].y);
        ctx.strokeStyle = '#0e1f33';
        ctx.lineWidth = ZUMA_BALL_R * 2 - 2;
        ctx.stroke();
        // Entry marker
        const entry = pd.waypoints[0];
        ctx.beginPath(); ctx.arc(entry.x, entry.y, 8, 0, Math.PI*2);
        ctx.fillStyle = '#334155'; ctx.fill();
        // Chain balls (back to front — lower dist first)
        const chain = chainRef.current;
        for (let i = chain.length - 1; i >= 0; i--) {
          const ball = chain[i];
          if (ball.dist < 0 || ball.dist > pd.totalLen) continue;
          const pt = zumaPointAtDist(pd, ball.dist);
          ctx.beginPath(); ctx.arc(pt.x, pt.y, ZUMA_BALL_R, 0, Math.PI*2);
          ctx.fillStyle = ball.color; ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.beginPath(); ctx.arc(pt.x-3, pt.y-3, 4, 0, Math.PI*2);
          ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill();
        }
        // Power-ups in flight
        for (let i = 0; i < powerUpsRef.current.length; i++) {
          const pu = powerUpsRef.current[i];
          ctx.save();
          ctx.translate(pu.x, pu.y);
          const rotation = ((Date.now() - pu.spawnedAt) / 100) % (Math.PI * 2);
          ctx.rotate(rotation);
          ctx.font = '20px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(POWERUP_ICONS[pu.type], 0, 0);
          ctx.restore();
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.beginPath();
          ctx.ellipse(pu.x, pu.y + pu.radius + 3, pu.radius * 0.7, pu.radius * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Shot ball
        const sh = shotRef.current;
        if (sh) {
          ctx.beginPath(); ctx.arc(sh.x, sh.y, ZUMA_BALL_R, 0, Math.PI*2);
          ctx.fillStyle = sh.color; ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.beginPath(); ctx.arc(sh.x-3, sh.y-3, 4, 0, Math.PI*2);
          ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill();
        }
        // Skull at path end
        const skull = pd.waypoints[pd.waypoints.length - 1];
        ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('💀', skull.x, skull.y);
      }

      // Frog shadow
      ctx.beginPath(); ctx.arc(FROG_X+2, FROG_Y+2, 18, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
      // Frog body
      ctx.beginPath(); ctx.arc(FROG_X, FROG_Y, 18, 0, Math.PI*2);
      ctx.fillStyle = '#059669'; ctx.fill();
      ctx.strokeStyle = '#064e3b'; ctx.lineWidth = 2; ctx.stroke();
      // Eyes
      const angle = frogAngleRef.current;
      const ex = Math.cos(angle-0.5)*10+FROG_X, ey = Math.sin(angle-0.5)*10+FROG_Y;
      const ex2 = Math.cos(angle+0.5)*10+FROG_X, ey2 = Math.sin(angle+0.5)*10+FROG_Y;
      ctx.beginPath(); ctx.arc(ex, ey, 3.5, 0, Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
      ctx.beginPath(); ctx.arc(ex+Math.cos(angle), ey+Math.sin(angle), 2, 0, Math.PI*2); ctx.fillStyle='#111'; ctx.fill();
      ctx.beginPath(); ctx.arc(ex2, ey2, 3.5, 0, Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
      ctx.beginPath(); ctx.arc(ex2+Math.cos(angle), ey2+Math.sin(angle), 2, 0, Math.PI*2); ctx.fillStyle='#111'; ctx.fill();
      // Ball loaded in frog
      ctx.beginPath(); ctx.arc(FROG_X, FROG_Y, 8, 0, Math.PI*2);
      ctx.fillStyle = curColorRef.current; ctx.fill();
      // Aim pointer
      ctx.beginPath();
      ctx.moveTo(FROG_X+Math.cos(angle)*20, FROG_Y+Math.sin(angle)*20);
      ctx.lineTo(FROG_X+Math.cos(angle)*32, FROG_Y+Math.sin(angle)*32);
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3; ctx.stroke();
      // Next ball preview
      const nx = FROG_X+Math.cos(angle+Math.PI)*30, ny = FROG_Y+Math.sin(angle+Math.PI)*30;
      ctx.beginPath(); ctx.arc(nx, ny, 7, 0, Math.PI*2);
      ctx.fillStyle = nxtColorRef.current; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth=1.5; ctx.stroke();
      ctx.font='8px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.fillText('next', nx, ny);

      // Start overlay
      if (!startedRef.current && !doneRef.current) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, ZUMA_W, ZUMA_H);
        ctx.font = 'bold 16px "Space Grotesk",system-ui,sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#e2e8f0'; ctx.fillText('Tap to shoot!', ZUMA_W/2, ZUMA_H/2);
        ctx.font = '13px "Space Grotesk",system-ui,sans-serif';
        ctx.fillStyle = '#64748b'; ctx.fillText('Move pointer to aim', ZUMA_W/2, ZUMA_H/2+24);
      }
      ctx.restore();
    }

    if (!loopRunning) { drawFrame(); return; }

    let alive = true, lastTs = null;
    const loop = (ts) => {
      if (!alive) return;
      rafRef.current = requestAnimationFrame(loop);
      if (!lastTs) { lastTs = ts; drawFrame(); return; }
      const dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;

      const chain = chainRef.current;
      const pd = pathDataRef.current;
      const lv = LEVELS[Math.min(levelRef.current, LEVELS.length) - 1];

      // Advance chain
      for (let i = 0; i < chain.length; i++) chain[i].dist += lv.speed * dt;

      // Game over: front ball crossed the skull
      if (chain.length > 0 && chain[0].dist >= pd.totalLen) {
        triggerEnd(false); drawFrame(); return;
      }

      // Level cleared: chain empty and no shot in flight
      if (chain.length === 0 && !shotRef.current) {
        scoreRef.current += 500 * levelRef.current;
        setScore(scoreRef.current);
        if (levelRef.current >= LEVELS.length) { triggerEnd(true); drawFrame(); return; }
        levelRef.current++;
        setLevel(levelRef.current);
        initLevel(levelRef.current);
        drawFrame(); return;
      }

      // Update power-ups and handle frog collision
      const now = Date.now();
      for (let i = powerUpsRef.current.length - 1; i >= 0; i--) {
        const pu = powerUpsRef.current[i];
        updatePowerup(pu, dt);
        if (!pu.caught && Math.hypot(pu.x - FROG_X, pu.y - FROG_Y) < POWERUP_RADIUS + 18) {
          pu.caught = true;
          const existing = activePowerupsRef.current.find(p => p.type === pu.type);
          if (existing) {
            existing.stacks += 1;
            existing.startedAt = now;
          } else {
            activePowerupsRef.current.push({ type: pu.type, startedAt: now, stacks: 1 });
          }
          if (pu.type === 'chain-clear') chainClearLoadedRef.current = existing ? existing.stacks : 1;
          if (pu.type === 'color-switch') wildColorLoadedRef.current = existing ? existing.stacks : 1;
          setActivePowerups([...activePowerupsRef.current]);
          powerUpsRef.current.splice(i, 1);
        } else if (pu.y > ZUMA_H + 50) {
          powerUpsRef.current.splice(i, 1);
        }
      }
      for (let i = activePowerupsRef.current.length - 1; i >= 0; i--) {
        const ap = activePowerupsRef.current[i];
        if (now - ap.startedAt > POWERUP_DURATION_MS) {
          if (ap.type === 'chain-clear') chainClearLoadedRef.current = 0;
          if (ap.type === 'color-switch') wildColorLoadedRef.current = 0;
          activePowerupsRef.current.splice(i, 1);
        }
      }

      // Update baseShotSpeed for faster-shot power-up
      const fasterPower = activePowerupsRef.current.find(p => p.type === 'faster-shot');
      if (fasterPower) {
        baseShotSpeedRef.current = ZUMA_SHOT_SPEED * Math.pow(1.4, fasterPower.stacks);
      } else {
        baseShotSpeedRef.current = ZUMA_SHOT_SPEED;
      }

      // Advance shot ball
      if (shotRef.current) {
        const sh = shotRef.current;
        sh.x += sh.vx * dt; sh.y += sh.vy * dt;
        if (sh.x < -20 || sh.x > ZUMA_W+20 || sh.y < -20 || sh.y > ZUMA_H+20) {
          shotRef.current = null;
        } else {
          for (let i = 0; i < chain.length; i++) {
            if (chain[i].dist < 0) continue;
            const pt = zumaPointAtDist(pd, chain[i].dist);
            const dx = sh.x - pt.x, dy = sh.y - pt.y;
            if (dx*dx + dy*dy < (ZUMA_BALL_R*2)*(ZUMA_BALL_R*2)) {
              if (chainClearLoadedRef.current > 0) {
                chain.length = 0;
                chainClearLoadedRef.current = 0;
              } else {
                chain.splice(i+1, 0, { color: sh.color, dist: chain[i].dist - ZUMA_DIAM });
                for (let j = i+2; j < chain.length; j++) {
                  const needed = chain[j-1].dist - ZUMA_DIAM;
                  if (chain[j].dist > needed) chain[j].dist = needed; else break;
                }
                const p = zumaCheckMatches(chain, i+1);
                if (p > 0) {
                  const bonus = p >= 6 ? (p-5)*50 : 0;
                  scoreRef.current += p*10 + bonus;
                  bpRef.current += p;
                  setScore(scoreRef.current);
                  setBallsPopped(bpRef.current);
                  onStepRef.current && onStepRef.current(bpRef.current);
                }
              }
              if (Math.random() < POWERUP_SPAWN_RATE) {
                const pt = zumaPointAtDist(pd, chain[i] ? chain[i].dist : chain[chain.length - 1] ? chain[chain.length - 1].dist : 0);
                powerUpsRef.current.push(spawnPowerup(pt.x, pt.y, POWERUP_TYPES.zuma));
              }
              shotRef.current = null;
              break;
            }
          }
        }
      }
      drawFrame();
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { alive = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [loopRunning, resetKey]);

  const getCanvasCoords = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const sx = ZUMA_W / rect.width, sy = ZUMA_H / rect.height;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (cx - rect.left)*sx, y: (cy - rect.top)*sy };
  };

  const updateAim = e => {
    const c = canvasRef.current; if (!c) return;
    const { x, y } = getCanvasCoords(e, c);
    frogAngleRef.current = Math.atan2(y - FROG_Y, x - FROG_X);
  };

  const shoot = () => {
    if (doneRef.current || shotRef.current) return;
    if (!startedRef.current) { startedRef.current = true; setStarted(true); }
    const lv = LEVELS[Math.min(levelRef.current, LEVELS.length) - 1];
    const angle = frogAngleRef.current;
    const fasterPower = activePowerupsRef.current.find(p => p.type === 'faster-shot');
    const currentSpeed = fasterPower ? ZUMA_SHOT_SPEED * Math.pow(1.4, fasterPower.stacks) : ZUMA_SHOT_SPEED;

    const useWildColor = wildColorLoadedRef.current > 0;
    const shotColor = useWildColor ? '#ffffff' : curColorRef.current;
    if (useWildColor) wildColorLoadedRef.current = 0;

    shotRef.current = {
      x: FROG_X + Math.cos(angle)*20, y: FROG_Y + Math.sin(angle)*20,
      vx: Math.cos(angle)*currentSpeed, vy: Math.sin(angle)*currentSpeed,
      color: shotColor,
    };
    curColorRef.current = nxtColorRef.current;
    nxtColorRef.current = zumaRandColor(lv.colors);
  };

  const loadLeaderboard = async () => {
    setLbLoading(true); setLbError(false);
    const { ok, body } = await api('/api/zuma/leaderboard');
    if (ok && body) setLb(body); else setLbError(true);
    setLbLoading(false);
  };

  const fmtS = s => String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');

  return (
    React.createElement('div', null,
      activeTab === 'game' && React.createElement('div', null,
        React.createElement('div', { className: 'status-bar' },
          React.createElement('div', { className: 'pill' },
            React.createElement('div', { className: 'plabel' }, 'Score'),
            React.createElement('div', { className: 'pvalue mono' }, score.toLocaleString())
          ),
          React.createElement('div', { className: 'pill' },
            React.createElement('div', { className: 'plabel' }, 'Level'),
            React.createElement('div', { className: 'pvalue mono' }, level + '/3')
          ),
          React.createElement('div', { className: 'pill' },
            React.createElement('div', { className: 'plabel' }, 'Popped'),
            React.createElement('div', { className: 'pvalue mono' }, ballsPopped)
          ),
          React.createElement('div', { className: 'pill' },
            React.createElement('div', { className: 'plabel' }, 'Time'),
            React.createElement('div', { className: 'pvalue mono' }, fmtS(elapsedSecs))
          ),
          activePowerups.map((ap, idx) => {
            const now = Date.now();
            const elapsed = now - ap.startedAt;
            const remaining = Math.max(0, Math.ceil((POWERUP_DURATION_MS - elapsed) / 1000));
            return React.createElement('div', { key: idx, className: 'pill', style: { background: ca('emerald','22'), border: `1px solid ${C.emerald}` } },
              React.createElement('div', { className: 'plabel', style: { fontSize: '0.75rem' } },
                POWERUP_ICONS[ap.type] + ' ' + remaining + 's' + (ap.stacks > 1 ? ' ×' + ap.stacks : '')
              )
            );
          })
        ),
        React.createElement('div', { className: 'zuma-wrap' },
          React.createElement('canvas', {
            ref: canvasRef,
            className: 'zuma-canvas',
            onMouseMove: e => updateAim(e),
            onClick: e => { updateAim(e); shoot(); },
            onTouchMove: e => { e.preventDefault(); updateAim(e); },
            onTouchEnd: () => shoot(),
          })
        ),
        React.createElement('div', { className: 'bounce-controls' },
          React.createElement('button', { onClick: () => init() }, '↺ New Game')
        )
      ),
      activeTab === 'leaderboard' && React.createElement('div', null,
        lbLoading && React.createElement('div', { className: 'snake-lb-empty' }, 'Loading…'),
        !lbLoading && lbError && React.createElement('div', { className: 'snake-lb-empty' }, 'Leaderboard unavailable — score saved locally.'),
        !lbLoading && !lbError && lb && (() => {
          const top = lb.top || [], me = lb.me || null;
          const meInTop = me && top.some(r => r.rank === me.rank);
          if (!top.length) return React.createElement('div', { className: 'snake-lb-empty' }, 'No scores yet — be the first!');
          return React.createElement('div', { className: 'snake-lb-list' },
            top.map(r =>
              React.createElement('div', { key: r.rank, className: 'snake-lb-row' + (me && r.rank === me.rank ? ' snake-lb-me' : '') },
                React.createElement('span', { className: 'snake-lb-rank' }, '#' + r.rank),
                React.createElement('span', { className: 'snake-lb-name' }, r.username || 'anon'),
                React.createElement('span', { className: 'snake-lb-score' }, Number(r.bestScore).toLocaleString())
              )
            ),
            me && !meInTop && React.createElement('div', null,
              React.createElement('div', { className: 'snake-lb-divider' }, '···'),
              React.createElement('div', { className: 'snake-lb-row snake-lb-me' },
                React.createElement('span', { className: 'snake-lb-rank' }, '#' + me.rank),
                React.createElement('span', { className: 'snake-lb-name' }, me.username || 'You'),
                React.createElement('span', { className: 'snake-lb-score' }, Number(me.bestScore).toLocaleString())
              )
            )
          );
        })()
      ),
      React.createElement('div', { className: 't2048-bottom-nav' },
        ['game', 'leaderboard'].map(tab =>
          React.createElement('button', {
            key: tab,
            className: 't2048-tab' + (activeTab === tab ? ' active' : ''),
            onClick: () => { setActiveTab(tab); if (tab === 'leaderboard') loadLeaderboard(); },
          }, tab.charAt(0).toUpperCase() + tab.slice(1))
        )
      )
    )
  );
}

// ---- Match-3 Campaign Game ----
function Match3Game({ onWin, onLose, onStepChange, offset, savedProgress, onSaveProgress, resetKey, playMode, band }) {
  /* #176 — the campaign CONVERGES onto the shared progression at the layer
     that matters: rewards. Its fifty authored puzzles group into five story
     bands of ten, and clearing a band's last puzzle ticks the rung and pays,
     once, through game_progress. The campaign keeps its own fine-grained
     match3_* rows for which individual puzzle you are on and your per-puzzle
     bests, because that is session detail rather than progression — moving it
     would have been a risky migration for no behavioural gain.

     Daily and arcade come nearly free on top: the board generator was already
     seeded, so a daily is "today's goal plus today's board" and arcade is the
     same with a fresh seed and a goal that keeps rising. */
  const M3_BAND_SIZE = 10;
  const bandPuzzle = playMode === 'story'
    ? Math.min(50, (Math.max(0, band || 0) + 1) * M3_BAND_SIZE)
    : null;
  const dailyPuzzle = playMode === 'daily'
    ? 1 + (utcDayNum(offset) % 50)
    : null;
  const arcadePuzzle = playMode === 'arcade'
    ? [12, 28, 46][Math.max(0, ARCADE_BANDS.findIndex(b => b.id === band))] || 28
    : null;
  const forcedPuzzle = bandPuzzle || dailyPuzzle || arcadePuzzle;
  const [phase, setPhase] = useState(forcedPuzzle ? 'playing' : 'campaign');
  const [selectedPuzzle, setSelectedPuzzle] = useState(forcedPuzzle || 1);
  const [puzzleConfig, setPuzzleConfig] = useState(null);
  const [tiles, setTiles] = useState([]);
  const [bar, setBar] = useState([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [done, setDone] = useState(false);
  const [userProgress, setUserProgress] = useState(null);
  const [boardSeed, setBoardSeed] = useState(0);

  const secs = useElapsed(resetKey, !done && phase === 'playing');
  const secsRef = useRef(0);
  secsRef.current = secs;

  // Match-3 puzzle definitions (same as server)
  const MATCH3_PUZZLES = [
    { id: 1, name: 'Getting Started', target: 800, timeLimit: 120, moveLimit: 30, layers: 2, difficulty: 'Easy' },
    { id: 2, name: 'Gather Gems', target: 1200, timeLimit: 120, moveLimit: 28, layers: 3, difficulty: 'Easy' },
    { id: 3, name: 'Color Cascade', target: 1500, timeLimit: 120, moveLimit: 26, layers: 2, difficulty: 'Easy' },
    { id: 4, name: 'Tile Practice', target: 2000, timeLimit: 120, moveLimit: 35, layers: 3, difficulty: 'Easy' },
    { id: 5, name: 'Gem Master', target: 2500, timeLimit: 120, moveLimit: 32, layers: 2, difficulty: 'Easy' },
    { id: 6, name: 'Combo Chain', target: 1800, timeLimit: 120, moveLimit: 40, layers: 2, difficulty: 'Easy' },
    { id: 7, name: 'Rainbow Tiles', target: 2200, timeLimit: 120, moveLimit: 30, layers: 3, difficulty: 'Easy' },
    { id: 8, name: 'Momentum', target: 2700, timeLimit: 120, moveLimit: 28, layers: 2, difficulty: 'Easy' },
    { id: 9, name: 'Precision Match', target: 2000, timeLimit: 120, moveLimit: 25, layers: 3, difficulty: 'Easy' },
    { id: 10, name: 'Power Play', target: 2800, timeLimit: 120, moveLimit: 32, layers: 3, difficulty: 'Easy' },
    { id: 11, name: 'Rising Challenge', target: 3000, timeLimit: 110, moveLimit: 28, layers: 3, difficulty: 'Medium' },
    { id: 12, name: 'Locked Tiles', target: 3200, timeLimit: 110, moveLimit: 26, layers: 4, difficulty: 'Medium' },
    { id: 13, name: 'Strategic Moves', target: 3500, timeLimit: 110, moveLimit: 30, layers: 3, difficulty: 'Medium' },
    { id: 14, name: 'Gem Rush', target: 3800, timeLimit: 110, moveLimit: 28, layers: 4, difficulty: 'Medium' },
    { id: 15, name: 'Pressure Cooker', target: 3200, timeLimit: 100, moveLimit: 24, layers: 3, difficulty: 'Medium' },
    { id: 16, name: 'Ice Breaker', target: 4000, timeLimit: 110, moveLimit: 32, layers: 4, difficulty: 'Medium' },
    { id: 17, name: 'Cascade Master', target: 3600, timeLimit: 110, moveLimit: 26, layers: 3, difficulty: 'Medium' },
    { id: 18, name: 'Deep Focus', target: 4200, timeLimit: 110, moveLimit: 30, layers: 4, difficulty: 'Medium' },
    { id: 19, name: 'Tile Tactics', target: 3900, timeLimit: 100, moveLimit: 25, layers: 3, difficulty: 'Medium' },
    { id: 20, name: 'Gem Sculptor', target: 4400, timeLimit: 110, moveLimit: 28, layers: 4, difficulty: 'Medium' },
    { id: 21, name: 'Locked & Loaded', target: 4100, timeLimit: 110, moveLimit: 30, layers: 4, difficulty: 'Medium' },
    { id: 22, name: 'Precision Strike', target: 3800, timeLimit: 100, moveLimit: 23, layers: 3, difficulty: 'Medium' },
    { id: 23, name: 'Color Theory', target: 4300, timeLimit: 110, moveLimit: 28, layers: 4, difficulty: 'Medium' },
    { id: 24, name: 'Momentum Shift', target: 4600, timeLimit: 110, moveLimit: 32, layers: 4, difficulty: 'Medium' },
    { id: 25, name: 'Maze Solver', target: 4000, timeLimit: 100, moveLimit: 26, layers: 3, difficulty: 'Medium' },
    { id: 26, name: 'Time Pressure', target: 3900, timeLimit: 90, moveLimit: 22, layers: 4, difficulty: 'Medium' },
    { id: 27, name: 'Champion\'s Path', target: 4500, timeLimit: 110, moveLimit: 30, layers: 4, difficulty: 'Medium' },
    { id: 28, name: 'Final Stand', target: 4800, timeLimit: 110, moveLimit: 28, layers: 4, difficulty: 'Medium' },
    { id: 29, name: 'Gem Dynasty', target: 4200, timeLimit: 100, moveLimit: 24, layers: 3, difficulty: 'Medium' },
    { id: 30, name: 'Gateway Challenge', target: 5000, timeLimit: 110, moveLimit: 32, layers: 4, difficulty: 'Medium' },
    { id: 31, name: 'Expert Territory', target: 5200, timeLimit: 100, moveLimit: 26, layers: 5, difficulty: 'Hard' },
    { id: 32, name: 'Ice Fortress', target: 5400, timeLimit: 100, moveLimit: 24, layers: 5, difficulty: 'Hard' },
    { id: 33, name: 'Avalanche', target: 5800, timeLimit: 100, moveLimit: 28, layers: 5, difficulty: 'Hard' },
    { id: 34, name: 'Locked Labyrinth', target: 5600, timeLimit: 100, moveLimit: 25, layers: 5, difficulty: 'Hard' },
    { id: 35, name: 'Inferno', target: 6000, timeLimit: 90, moveLimit: 22, layers: 5, difficulty: 'Hard' },
    { id: 36, name: 'Master Puzzle', target: 5900, timeLimit: 100, moveLimit: 26, layers: 5, difficulty: 'Hard' },
    { id: 37, name: 'Complexity', target: 6200, timeLimit: 100, moveLimit: 28, layers: 5, difficulty: 'Hard' },
    { id: 38, name: 'Precision Required', target: 5800, timeLimit: 90, moveLimit: 23, layers: 5, difficulty: 'Hard' },
    { id: 39, name: 'Final Test', target: 6400, timeLimit: 100, moveLimit: 26, layers: 5, difficulty: 'Hard' },
    { id: 40, name: 'Legendary Tier', target: 6600, timeLimit: 100, moveLimit: 30, layers: 5, difficulty: 'Hard' },
    { id: 41, name: 'Peak Performance', target: 6000, timeLimit: 90, moveLimit: 24, layers: 5, difficulty: 'Hard' },
    { id: 42, name: 'Unrelenting', target: 6300, timeLimit: 100, moveLimit: 27, layers: 5, difficulty: 'Hard' },
    { id: 43, name: 'Titan\'s Trial', target: 6800, timeLimit: 100, moveLimit: 28, layers: 5, difficulty: 'Hard' },
    { id: 44, name: 'Endgame', target: 6500, timeLimit: 90, moveLimit: 25, layers: 5, difficulty: 'Hard' },
    { id: 45, name: 'Perfection Quest', target: 6900, timeLimit: 100, moveLimit: 30, layers: 5, difficulty: 'Hard' },
    { id: 46, name: 'Unstoppable', target: 6700, timeLimit: 100, moveLimit: 26, layers: 5, difficulty: 'Hard' },
    { id: 47, name: 'Ultra Challenge', target: 7000, timeLimit: 100, moveLimit: 28, layers: 5, difficulty: 'Hard' },
    { id: 48, name: 'Reality Bender', target: 6800, timeLimit: 90, moveLimit: 23, layers: 5, difficulty: 'Hard' },
    { id: 49, name: 'Pandora\'s Box', target: 7100, timeLimit: 100, moveLimit: 30, layers: 5, difficulty: 'Hard' },
    { id: 50, name: 'Master Challenge', target: 7200, timeLimit: 100, moveLimit: 28, layers: 5, difficulty: 'Hard' },
  ];

  // Load user progress
  useEffect(() => {
    (async () => {
      const { ok, body } = await api('/api/match3/progress');
      if (ok && body) {
        setUserProgress(body);
        setSelectedPuzzle(body.lastPlayedPuzzle || 1);
      }
    })();
  }, []);

  // A mode that named a puzzle skips the campaign screen entirely.
  const m3Booted = useRef(false);
  useEffect(() => {
    if (forcedPuzzle && !m3Booted.current) { m3Booted.current = true; startPuzzle(forcedPuzzle); }
  }, [forcedPuzzle]);

  // Start a puzzle
  const startPuzzle = async (puzzleId) => {
    /* PHASE 8 — this was a GET against a POST-only route
       (app.post('/api/match3/start/:puzzleId')), so it fell through to the
       catch-all, came back as the HTML shell, and JSON parsing failed — the
       third reason Match 3 could never actually be played. */
    const { ok, body } = await api(`/api/match3/start/${puzzleId}`, { method: 'POST' });
    if (ok && body) {
      setPuzzleConfig(body);
      setBoardSeed(body.boardSeed);
      setSelectedPuzzle(puzzleId);

      if (body.savedSession) {
        setTiles(body.savedSession.tiles || []);
        setBar(body.savedSession.bar || []);
        setScore(body.savedSession.score || 0);
        setMoves(body.savedSession.moves || 0);
      } else {
        // Generate fresh board (simple: 5 random tiles per layer)
        const config = body;
        const newTiles = [];
        let id = 1;
        for (let i = 0; i < config.layers * 5; i++) {
          newTiles.push({
            id: id++,
            type: i % 5,
            pos: i,
            locked: false,
            inBar: false,
            removed: false,
          });
        }
        setTiles(newTiles);
        setBar([]);
        setScore(0);
        setMoves(0);
      }

      setDone(false);
      setPhase('playing');
    }
  };

  // Handle tile click
  const selectTile = (tileId) => {
    if (phase !== 'playing' || done) return;
    if (bar.length >= 7) {
      onLose(moves, secsRef.current, { share: `Match-3 • Puzzle ${selectedPuzzle} • ${moves} moves` });
      setDone(true);
      setPhase('lost');
      return;
    }

    const newBar = [...bar, tileId];
    const newMoves = moves + 1;

    // Check for match-3
    let matched = false;
    if (newBar.length >= 3) {
      for (let i = 0; i <= newBar.length - 3; i++) {
        const t1 = tiles.find(t => t.id === newBar[i]);
        const t2 = tiles.find(t => t.id === newBar[i + 1]);
        const t3 = tiles.find(t => t.id === newBar[i + 2]);
        if (t1 && t2 && t3 && t1.type === t2.type && t2.type === t3.type) {
          matched = true;
          // Remove matched tiles
          const toRemove = new Set([newBar[i], newBar[i + 1], newBar[i + 2]]);
          setTiles(tiles.map(t => toRemove.has(t.id) ? { ...t, removed: true } : t));
          setBar(newBar.filter(id => !toRemove.has(id)));
          const newScore = score + 300;
          setScore(newScore);
          setMoves(newMoves);
          onStepChange && onStepChange(newMoves);

          if (newScore >= puzzleConfig.target) {
            onWin(newScore, newMoves, secsRef.current, { share: `Match-3 • Puzzle ${selectedPuzzle}: ${newScore}pts` });
            setDone(true);
            setPhase('won');
            /* The campaign row still records which puzzle you reached and your
               best on it. The shell's mode dispatch handles the band clear and
               the payout, so this stays a pure campaign-detail write. */
            api(`/api/match3/finish/${selectedPuzzle}`, {
              method: 'POST',
              body: JSON.stringify({ score: newScore, timeSecs: secsRef.current, moves: newMoves })
            });
          }
          return;
        }
      }
    }

    if (!matched) {
      setBar(newBar);
      setMoves(newMoves);
      onStepChange && onStepChange(newMoves);
    }
  };

  // Autosave
  useAutosave(
    onSaveProgress,
    () => ({
      puzzleId: selectedPuzzle,
      tiles,
      bar,
      score,
      moves,
    }),
    !done && phase === 'playing'
  );

  if (phase === 'campaign' && userProgress) {
    // Campaign selection screen
    const easyPuzzles = MATCH3_PUZZLES.slice(0, 10);
    const mediumPuzzles = MATCH3_PUZZLES.slice(10, 30);
    const hardPuzzles = MATCH3_PUZZLES.slice(30, 50);

    return React.createElement(
      'div',
      { style: { padding: '1.5rem', maxWidth: '900px', margin: '0 auto' } },
      React.createElement('h2', { style: { marginBottom: '1.5rem', color: C.text } }, '🟩 Match-3 Campaign'),
      React.createElement('div', { style: { marginBottom: '2rem', padding: '1rem', background: C.card, borderRadius: '0.5rem', border: `1px solid ${C.border}` } },
        React.createElement('div', { style: { display: 'flex', gap: '2rem', marginBottom: '1rem' } },
          React.createElement('div', null,
            React.createElement('div', { style: { fontSize: '0.75rem', textTransform: 'uppercase', color: C.muted, marginBottom: '0.25rem' } }, 'Highest Puzzle'),
            React.createElement('div', { style: { fontSize: '1.75rem', fontWeight: 700, color: C.gold } }, `${userProgress.highestPuzzle}/50`)
          ),
          React.createElement('div', null,
            React.createElement('div', { style: { fontSize: '0.75rem', textTransform: 'uppercase', color: C.muted, marginBottom: '0.25rem' } }, 'Best Score'),
            React.createElement('div', { style: { fontSize: '1.5rem', fontWeight: 600, color: C.emerald } }, userProgress.bestScore.toLocaleString())
          ),
          React.createElement('div', null,
            React.createElement('div', { style: { fontSize: '0.75rem', textTransform: 'uppercase', color: C.muted, marginBottom: '0.25rem' } }, 'Completed'),
            React.createElement('div', { style: { fontSize: '1.5rem', fontWeight: 600, color: C.accent } }, userProgress.totalCompleted)
          )
        ),
        userProgress.highestPuzzle > 0 && React.createElement(
          'button',
          {
            onClick: () => startPuzzle(Math.min(userProgress.lastPlayedPuzzle, 50)),
            style: {
              padding: '0.5rem 1rem',
              background: C.accent,
              color: C.bg,
              border: 'none',
              borderRadius: '0.375rem',
              fontWeight: 600,
              cursor: 'pointer',
            }
          },
          '▶ Resume Puzzle ' + Math.min(userProgress.lastPlayedPuzzle, 50)
        )
      ),
      ['Easy (1-10)', 'Medium (11-30)', 'Hard (31-50)'].map((tier, tierIdx) => {
        const puzzles = tierIdx === 0 ? easyPuzzles : tierIdx === 1 ? mediumPuzzles : hardPuzzles;
        const tierColor = tierIdx === 0 ? C.emerald : tierIdx === 1 ? C.gold : C.rose;
        return React.createElement(
          'div',
          { key: tier, style: { marginBottom: '2rem' } },
          React.createElement('h3', { style: { color: tierColor, marginBottom: '1rem', fontSize: '1.1rem' } }, tier),
          React.createElement(
            'div',
            { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' } },
            puzzles.map(p => {
              /* PHASE 8 — the unlock gate was `p.id <= highestPuzzle`, i.e. you
                 could only replay puzzles you had ALREADY solved. With
                 highestPuzzle: 0 on a new player that locked all 50, so nobody
                 could ever start the game — the second half of why Match 3 was
                 unplayable rather than merely unstyled (the first being its API
                 routes sitting after the catch-all, see server.js). The next
                 unsolved puzzle must be playable. */
              const isSolved = p.id <= userProgress.highestPuzzle;
              const isUnlocked = p.id <= userProgress.highestPuzzle + 1;
              return React.createElement(
                'button',
                Object.assign(
                  {
                    key: p.id,
                    disabled: !isUnlocked,
                    className: 'm3-level' + (isSolved ? ' solved' : '') + (isUnlocked ? '' : ' locked'),
                    'aria-label': `Puzzle ${p.id}: ${p.name}${isSolved ? ' (solved)' : isUnlocked ? '' : ' (locked)'}`,
                  },
                  tapProps(() => startPuzzle(p.id), { disabled: !isUnlocked })
                ),
                React.createElement('div', { className: 'm3-level-id' }, isSolved ? '✓' : isUnlocked ? p.id : '🔒'),
                React.createElement('div', { className: 'm3-level-name' }, p.name)
              );
            })
          )
        );
      })
    );
  }

  /* PHASE 8 — Match 3 was the only game in the registry with no design system:
     hand-written inline styles, plain coloured blocks with padding: 2rem, a bare
     "Bar:" label, `minHeight: 100vh` inside an already-fitted stage, and no CSS
     classes at all — so it also missed every registry-wide fix (Phase 2's
     touch-action/press state, Phase 3's fit sizing). Rebuilt on the same
     CgStatus / .m3-* / tray idiom the two Tile Match games use.
     Gameplay, scoring and MATCH3_PUZZLES are untouched: markup and CSS only. */
  if (phase === 'playing' && puzzleConfig) {
    const M3_ICONS = ['🔴', '🟠', '🟢', '🔵', '🟣'];
    const M3_COLORS = [C.rose, C.gold, C.emerald, C.accent, C.violet];
    const barFull = bar.length >= 6;
    return React.createElement(
      'div',
      { className: 'm3-wrap fit-col', style: { alignItems: 'center', gap: '0.75rem' } },
      React.createElement(CgStatus, {
        items: [
          { l: 'Score', v: `${score} / ${puzzleConfig.targetScore}` },
          { l: 'Moves', v: `${moves} / ${puzzleConfig.moveLimit}` },
          { l: 'Time', v: `${secs}s` },
        ],
      }),
      React.createElement(
        'div',
        { className: 'm3-grid' },
        tiles.map(t => React.createElement(
          'button',
          Object.assign(
            {
              key: t.id,
              className: 'm3-tile' + (t.removed ? ' gone' : '') + (bar.indexOf(t.id) >= 0 ? ' sel' : ''),
              disabled: t.removed || done,
              style: { background: t.removed ? C.surface : M3_COLORS[t.type % 5] },
              'aria-label': `Tile ${t.type + 1}` + (t.removed ? ', cleared' : ''),
            },
            tapProps(() => selectTile(t.id), { disabled: t.removed || done })
          ),
          t.removed ? '✓' : M3_ICONS[t.type % 5]
        ))
      ),
      React.createElement(
        'div',
        { className: 'm3-bar' + (barFull ? ' full' : '') },
        React.createElement('span', { className: 'm3-bar-label' + (barFull ? ' full' : '') }, 'Tray'),
        bar.length > 0
          ? bar.map(id => {
              const t = tiles.find(tile => tile.id === id);
              if (!t) return null;
              return React.createElement(
                'div',
                { key: id, className: 'm3-bar-tile', style: { background: M3_COLORS[t.type % 5] } },
                M3_ICONS[t.type % 5]
              );
            })
          : React.createElement('span', { className: 'm3-bar-empty' }, 'Match three of a kind to clear them')
      )
    );
  }

  return React.createElement('div', { style: { padding: '1rem', color: C.text } }, 'Loading...');
}
