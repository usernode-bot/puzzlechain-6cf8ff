/* ============================================================
   Zuma — frog shooter (Classic, leaderboard)
   ============================================================ */
const ZUMA_W = 300, ZUMA_H = 400;
const ZUMA_BALL_R = 11;
const ZUMA_DIAM = ZUMA_BALL_R * 2 + 2;
const ZUMA_SHOT_SPEED = 300;
const FROG_X = 150, FROG_Y = 218;
const ZUMA_COLORS_ALL = ['#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

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

function ZumaGame({ onWin, onStepChange, resetKey }) {
  const { useState, useEffect, useRef } = React;
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
    const lvl = ZUMA_LEVELS[lvlNum - 1];
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
        ? '🐸 Zuma — ' + s + ' pts, all 3 levels cleared!'
        : '🐸 Zuma — ' + s + ' pts, level ' + lv,
    });
  }

  const loopRunning = activeTab === 'game' && !done;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(ZUMA_W * dpr);
    canvas.height = Math.round(ZUMA_H * dpr);

    function drawFrame() {
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.fillStyle = C.bg;
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
      const lv = ZUMA_LEVELS[levelRef.current - 1];

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
        if (levelRef.current >= 3) { triggerEnd(true); drawFrame(); return; }
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
    const lv = ZUMA_LEVELS[levelRef.current - 1];
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
            return React.createElement('div', { key: idx, className: 'pill', style: { background: C.emerald + '22', border: `1px solid ${C.emerald}` } },
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