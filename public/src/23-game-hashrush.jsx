/* ============================================================
   Hash Rush — crypto-themed lane dodger (self-shell canvas game)
   ============================================================ */
const HR_HISTORY_KEY = 'puzzlechain_hashrush_history';
const HR_LANES = 3;
const HR_START_SPEED = 150;     // px/s downward
const HR_SPEED_STEP = 28;       // +px/s every ramp
const HR_RAMP_SECS = 30;        // ramp every N seconds
const HR_MAX_SPEED = HR_START_SPEED * 3;
const HR_TOKEN_SCORE = 10;
const HR_BOOST_MULT = 2;
const HR_BOOST_SECS = 5;
const HR_LIVES = 3;

/* #176 — three modes over one loop.

   Hash Rush was pure endless score-attack driven by Math.random(), which is
   fine for a classic and disqualifying for a daily: two players would dodge
   different hazards and their scores would not be comparable. So the spawn
   stream is now drawn from a seeded rng in every mode except free play, and
   the modes differ only in how the shift is BOUNDED:

     daily  — a fixed 90-second shift over the day's spawn stream. Everyone
              dodges the same hazards in the same order. Running out of lives
              ends it early with whatever you mined; the score is the result
              either way, so both endings report a score (the same reading
              Snake and Marble Loop use).
     story  — five rungs, each a longer and faster shift than the last. The
              rung is cleared by SURVIVING its duration, so losing your lives
              leaves it unticked.
     arcade — endless again, with the band setting the starting pressure. */
const HR_DAILY_SECS = 90;
const HR_STORY_BANDS = 5;
const HR_STORY = [
  { secs: 45,  speed: 150, blockRate: 0.26, spawnEvery: 0.95, lives: 3 },
  { secs: 60,  speed: 170, blockRate: 0.30, spawnEvery: 0.88, lives: 3 },
  { secs: 75,  speed: 195, blockRate: 0.34, spawnEvery: 0.80, lives: 3 },
  { secs: 90,  speed: 220, blockRate: 0.38, spawnEvery: 0.72, lives: 2 },
  { secs: 120, speed: 250, blockRate: 0.42, spawnEvery: 0.64, lives: 2 },
];
const HR_ARCADE = {
  easy:   { speed: 130, blockRate: 0.24, spawnEvery: 1.00, lives: 4 },
  normal: { speed: 150, blockRate: 0.30, spawnEvery: 0.85, lives: 3 },
  hard:   { speed: 190, blockRate: 0.38, spawnEvery: 0.70, lives: 2 },
};

// One config for whichever mode the shell opened this in. `limit` of 0 means
// endless — the run ends when the lives do.
function hrModeConfig(playMode, band) {
  if (playMode === 'story') {
    const c = HR_STORY[Math.max(0, Math.min(HR_STORY.length - 1, band || 0))];
    return { ...c, limit: c.secs, label: `Rung ${Math.max(0, band || 0) + 1}` };
  }
  if (playMode === 'arcade') {
    const c = HR_ARCADE[band] || HR_ARCADE.normal;
    return { ...c, limit: 0, label: 'Arcade' };
  }
  if (playMode === 'daily') {
    return { speed: HR_START_SPEED, blockRate: 0.30, spawnEvery: 0.85,
             lives: HR_LIVES, limit: HR_DAILY_SECS, label: "Today's shift" };
  }
  return { speed: HR_START_SPEED, blockRate: 0.30, spawnEvery: 0.85,
           lives: HR_LIVES, limit: 0, label: 'Free play' };
}

/* `resultShown` (phase 1, #160) — true once App's shared results card owns this
   run's ending. Hash Rush is the ONE shell:'self' classic that draws its own
   end panel, and that panel is absolute-positioned over its canvas: leaving it
   up would hide the very board "View board" exists to reveal, and would repeat
   the score the shared card is already showing. Every other self-shell game
   (Snake, Block Fit, Diamond Rush) has no end panel and needs nothing. */
function HashRushGame({ onWin, onLose, onStepChange, resetKey, game, onBack, menuConfig,
                       resultShown, playMode, band, offset }) {
  const cfg = useRef(null);
  if (!cfg.current) cfg.current = hrModeConfig(playMode, band);
  const MODE = cfg.current;
  const MODE_LIMIT_INIT = MODE.limit || 0;
  const [phase, setPhase] = useState('idle'); // idle | playing | dead
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MODE.lives);
  const [mult, setMult] = useState(1);
  const [boostLeft, setBoostLeft] = useState(0);
  const [secsLeft, setSecsLeft] = useState(MODE_LIMIT_INIT);
  const [finalRank, setFinalRank] = useState(null);

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const lastTsRef = useRef(0);
  const stateRef = useRef(null);
  const submittedRef = useRef(false);
  const onWinRef = useRef(onWin); onWinRef.current = onWin;
  const onLoseRef = useRef(onLose); onLoseRef.current = onLose;
  const onStepRef = useRef(onStepChange); onStepRef.current = onStepChange;

  /* The spawn stream is seeded in every mode but free play. A fresh rng per
     RUN (not per mount) is what makes "restart the rung" replay the same
     hazards — a rung you cannot learn is not a rung. */
  const fresh = () => ({
    lane: 1, objs: [], elapsed: 0, score: 0, lives: MODE.lives, tokens: 0,
    speed: MODE.speed, boost: 0, spawnT: 0, spawnEvery: MODE.spawnEvery, dead: false,
    rng: playMode ? modeSeed(playMode, 'hashrush', band, offset).rng : null,
    cleared: false,
  });

  const reset = () => {
    stateRef.current = fresh();
    setScore(0); setLives(MODE.lives); setMult(1); setBoostLeft(0); setFinalRank(null);
    setSecsLeft(MODE.limit || 0);
    submittedRef.current = false;
  };

  useEffect(() => { reset(); setPhase('idle'); }, [resetKey]);

  // Lane shift (-1 left, +1 right).
  const shift = (dir) => {
    const s = stateRef.current; if (!s || s.dead) return;
    s.lane = Math.max(0, Math.min(HR_LANES - 1, s.lane + dir));
    cgSound('move');
  };

  // #137 — drag to steer. Tap-halves alone meant you were tapping a target
  // rather than driving; the miner now tracks the thumb, with tap-halves and
  // arrow keys still working. .hr-canvas already has touch-action: none, so the
  // browser never scrolls out from under the drag.
  const setLane = (lane) => {
    const s = stateRef.current; if (!s || s.dead) return;
    const next = Math.max(0, Math.min(HR_LANES - 1, lane));
    if (next !== s.lane) { s.lane = next; cgSound('move'); }
  };

  useEffect(() => {
    const el = canvasRef.current; if (!el) return;
    const drag = { active: false, moved: false, startX: 0 };
    const laneAt = (clientX) => {
      const rect = el.getBoundingClientRect();
      const t = (clientX - rect.left) / Math.max(rect.width, 1);
      return Math.round(t * (HR_LANES - 1));
    };
    const onDown = (e) => {
      if (phase === 'idle') { startGame(); return; }
      drag.active = true; drag.moved = false; drag.startX = e.clientX;
      if (el.setPointerCapture) { try { el.setPointerCapture(e.pointerId); } catch {} }
    };
    const onMove = (e) => {
      if (!drag.active) return;
      if (Math.abs(e.clientX - drag.startX) > 6) drag.moved = true;
      if (drag.moved) setLane(laneAt(e.clientX));
    };
    const onUp = (e) => {
      if (!drag.active) return;
      drag.active = false;
      // A press that never moved keeps the old tap-halves behaviour.
      if (!drag.moved) {
        const rect = el.getBoundingClientRect();
        shift(e.clientX - rect.left < rect.width / 2 ? -1 : 1);
      }
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
  }, [phase]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); shift(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); shift(1); }
      else if ((e.key === ' ' || e.key === 'Enter') && phase === 'idle') { e.preventDefault(); startGame(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  const endGame = (cleared) => {
    const s = stateRef.current; if (!s) return;
    s.dead = true;
    s.cleared = !!cleared;
    setPhase('dead');
    cgSound(cleared ? 'clear' : 'lose'); cgHaptic(cleared ? 20 : [20, 40, 20]);
    const finalScore = Math.round(s.score);
    cgSaveHistory(HR_HISTORY_KEY, { score: finalScore, tokens: s.tokens, secs: Math.round(s.elapsed), ts: Date.now() });
    if (!submittedRef.current) {
      submittedRef.current = true;
      // Only free play and arcade belong on the classic all-time board; a
      // daily and a story rung settle on their own endpoints.
      if (!playMode || playMode === 'arcade') {
        submitClassicScore('hashrush', finalScore, { tokens: s.tokens, timeSecs: Math.round(s.elapsed) })
          .then(r => { if (r && r.rank) setFinalRank(r.rank); });
      }
      reportRunEnd(
        { cleared: !!cleared, playMode, onWin: onWinRef.current, onLose: onLoseRef.current },
        finalScore, s.tokens, Math.round(s.elapsed),
        {
          winnerLabel: cleared ? 'Shift complete! ⛏️' : 'Game Over',
          share: `⛏️ Hash Rush — ${finalScore} pts, ${s.tokens} hashes mined`,
        }
      );
    }
  };

  const startGame = () => {
    reset();
    setPhase('playing');
    cgSound('click');
  };

  // Main loop.
  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = guardCanvasCtx(canvas.getContext('2d'));
    let running = true;
    lastTsRef.current = 0;

    const sizeCanvas = () => {
      const wrap = wrapRef.current; if (!wrap) return;
      const dpr = canvasDpr();
      const w = wrap.clientWidth, h = wrap.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);

    const spawn = (s) => {
      const rnd = s.rng || Math.random;
      const lane = Math.floor(rnd() * HR_LANES);
      const roll = rnd();
      let type = 'token';
      if (roll < MODE.blockRate) type = 'block';
      else if (roll < MODE.blockRate + 0.12) type = 'boost';
      s.objs.push({ lane, y: -30, type });
    };

    const step = (s, dt, W, H) => {
      s.elapsed += dt;
      s.speed = Math.min(HR_MAX_SPEED, MODE.speed + Math.floor(s.elapsed / HR_RAMP_SECS) * HR_SPEED_STEP);
      if (s.boost > 0) { s.boost = Math.max(0, s.boost - dt); }
      s.spawnT += dt;
      const every = Math.max(0.45, s.spawnEvery - s.elapsed * 0.004);
      if (s.spawnT >= every) { s.spawnT = 0; spawn(s); }

      const minerY = H * 0.82;
      const laneW = W / HR_LANES;
      for (const o of s.objs) {
        o.y += s.speed * dt;
        if (o.hit) continue;
        // collision band around the miner
        if (o.lane === s.lane && Math.abs(o.y - minerY) < 30) {
          o.hit = true;
          if (o.type === 'token') {
            const m = s.boost > 0 ? HR_BOOST_MULT : 1;
            s.score += HR_TOKEN_SCORE * m; s.tokens += 1;
            cgSound('clear');
          } else if (o.type === 'boost') {
            s.boost = HR_BOOST_SECS; cgSound('clear');
          } else if (o.type === 'block') {
            s.lives -= 1; cgSound('lose'); cgHaptic(30);
            if (s.lives <= 0) { s.dead = true; }
          }
        }
      }
      // Drop collected/offscreen objects.
      s.objs = s.objs.filter(o => !o.hit && o.y < H + 40);

      // sync HUD (throttled by React batching)
      setScore(Math.round(s.score));
      setLives(s.lives);
      setMult(s.boost > 0 ? HR_BOOST_MULT : 1);
      setBoostLeft(s.boost > 0 ? Math.ceil(s.boost) : 0);
      if (MODE.limit) setSecsLeft(Math.max(0, Math.ceil(MODE.limit - s.elapsed)));
      if (onStepRef.current) onStepRef.current(s.tokens);
    };

    const draw = (s, W, H) => {
      ctx.clearRect(0, 0, W, H);
      // Play-area chrome follows the theme (PAL, resolved every frame so a
      // Light↔Dark flip recolours mid-run). The old near-white lane stripes
      // were invisible in the light palette. The miner / tokens / hazards below
      // stay hardcoded — intrinsic arcade art, like the Drop Stack pieces.
      ctx.fillStyle = PAL.bg;
      ctx.fillRect(0, 0, W, H);
      const laneW = W / HR_LANES;
      for (let i = 0; i < HR_LANES; i++) {
        ctx.fillStyle = i % 2 ? PAL.surface : PAL.card;
        ctx.fillRect(i * laneW, 0, laneW, H);
      }
      ctx.strokeStyle = PAL.border;
      ctx.lineWidth = 1;
      for (let i = 1; i < HR_LANES; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.round(i * laneW) + 0.5, 0);
        ctx.lineTo(Math.round(i * laneW) + 0.5, H);
        ctx.stroke();
      }
      // objects
      for (const o of s.objs) {
        const cx = o.lane * laneW + laneW / 2;
        ctx.font = '26px serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (o.type === 'block') {
          ctx.fillStyle = 'rgba(244,63,94,0.85)';
          ctx.fillRect(cx - laneW * 0.4, o.y - 16, laneW * 0.8, 32);
          ctx.fillStyle = '#fff'; ctx.fillText('🚫', cx, o.y);
        } else {
          ctx.fillText(o.type === 'boost' ? '⚡' : '⛏️', cx, o.y);
        }
      }
      // miner
      const minerY = H * 0.82;
      const mx = s.lane * laneW + laneW / 2;
      ctx.font = '34px serif';
      if (s.boost > 0) {
        ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 18;
      }
      ctx.fillText('⛏️', mx, minerY - 4);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(99,102,241,0.9)';
      ctx.fillRect(mx - 18, minerY + 14, 36, 6);
    };

    const frame = (ts) => {
      if (!running) return;
      const s = stateRef.current;
      const W = canvas.clientWidth, H = canvas.clientHeight;
      if (!lastTsRef.current) lastTsRef.current = ts;
      let dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      if (dt > 0.05) dt = 0.05;
      step(s, dt, W, H);
      draw(s, W, H);
      // A bounded shift (daily / story rung) that runs its clock out is
      // CLEARED, which is a different ending from running out of lives — the
      // distinction is the only thing that decides whether a story rung ticks.
      if (!s.dead && MODE.limit && s.elapsed >= MODE.limit) { endGame(true); return; }
      if (s.dead) { endGame(false); return; }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      running = false;
      window.removeEventListener('resize', sizeCanvas);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase]);

  const hist = cgLoadHistory(HR_HISTORY_KEY);
  const best = hist.reduce((m, r) => Math.max(m, r.score || 0), 0);
  const sheet = [
    cgLeaderboardSection('hashrush'),
    cgHistorySection(hist, r => <><span>{r.score} pts</span><span className="mono">{r.tokens} ⛏️ · {r.secs}s</span></>),
    cgStatsSection([
      { val: best, lbl: 'Best score' }, { val: hist.length, lbl: 'Runs' },
    ]),
    cgRulesSection([
      'Drag across the screen to steer — the miner follows your thumb. Tapping the left/right half (or ← → keys) still nudges one lane.',
      'Collect ⛏️ hash tokens to score — each is worth 10 points.',
      'Grab ⚡ Compute Boost for 5 seconds of 2× scoring.',
      'Dodge 🚫 invalid blocks — three hits and the run ends.',
      'It speeds up the longer you survive. Chase a high score!',
    ]),
  ];

  return (
    <ClassicShell game={game} onExit={onBack} onNewGame={() => startGame()} sheetSections={sheet} menuConfig={menuConfig}>
      <div className="cg-stage">
        <CgStatus items={[
          { l: 'Score', v: score },
          { l: 'Lives', v: '❤️'.repeat(lives) || '—' },
          MODE.limit
            ? { l: 'Left', v: `${Math.floor(secsLeft / 60)}:${String(secsLeft % 60).padStart(2, '0')}` }
            : { l: 'Mult', v: '×' + mult },
        ]} />
        <div className="hr-wrap" ref={wrapRef}>
          <canvas ref={canvasRef} className="hr-canvas" />
          {boostLeft > 0 && phase === 'playing' && (
            <div className="hr-boost-badge">⚡ Boost {boostLeft}s</div>
          )}
          {phase === 'idle' && (
            <div className="hr-overlay">
              <div className="hr-overlay-title">⛏️ Hash Rush</div>
              <div className="hr-overlay-sub">
                {MODE.limit
                  ? `${MODE.label} — survive ${MODE.limit}s. Mine hashes, dodge invalid blocks.`
                  : 'Mine hashes, dodge invalid blocks.'}
              </div>
              <button className="gm-play-btn" style={{ maxWidth: 200 }} onClick={startGame}>Start mining</button>
            </div>
          )}
          {phase === 'dead' && !resultShown && (
            <div className="hr-overlay">
              <div className="hr-overlay-title">
                {stateRef.current && stateRef.current.cleared ? 'Shift complete' : 'Game Over'}
              </div>
              <div className="hr-overlay-score">{score} pts</div>
              {finalRank && <div className="hr-overlay-sub">Global rank #{finalRank}</div>}
              <button className="gm-play-btn" style={{ maxWidth: 200 }} onClick={startGame}>Mine again</button>
            </div>
          )}
        </div>
      </div>
    </ClassicShell>
  );
}
