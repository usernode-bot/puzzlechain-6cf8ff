/* ---------------- Snake ---- Difficulty config ---- */
const SNAKE_SPEED_CONFIG = {
  easy:   { initial: 250, decrement: 4 },
  normal: { initial: 200, decrement: 6 },
  hard:   { initial: 150, decrement: 8 },
};

/* ---- Snake — Mode Selector ---- */
function SnakeGameModeSelect({ onSelectDifficulty }) {
  const [difficulty, setDifficulty] = useState(() => localStorage.getItem(SNAKE_DIFFICULTY_KEY) || 'normal');

  const handleStart = () => {
    try { localStorage.setItem(SNAKE_DIFFICULTY_KEY, difficulty); } catch {}
    onSelectDifficulty(difficulty);
  };

  return (
    <div className="mnc-mode-select">
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Choose Difficulty</h3>
        <p style={{ color: 'var(--cg-muted, #999)', fontSize: '0.9rem', margin: '0 0 1.5rem 0' }}>Affects starting speed and acceleration</p>
      </div>
      <div className="mnc-difficulty-row">
        {['easy', 'normal', 'hard'].map(d => (
          <button key={d} className={'mnc-difficulty-pill' + (difficulty === d ? ' active' : '')} onClick={() => setDifficulty(d)}>
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </button>
        ))}
      </div>
      <button className="mnc-mode-start-btn" onClick={handleStart}>
        Play
      </button>
    </div>
  );
}

/* ---- Snake — Gameplay ---- */
function SnakeGameplay({ onWin, onStepChange, resetKey, game, onBack, difficulty }) {
  const N = 15;
  const [, render] = useState(0);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [pausedSecs, setPausedSecs] = useState(0);
  const st = useRef(null);
  const doneRef = useRef(false);
  const boardRef = useRef(null);
  const secs = useElapsed(resetKey, !done && !paused);
  const secsRef = useRef(0); secsRef.current = secs;

  const randFood = (snake) => {
    let c;
    do { c = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) }; }
    while (snake.some(s => s.x === c.x && s.y === c.y));
    return c;
  };
  const init = () => {
    const m = Math.floor(N / 2);
    const snake = [{ x: m, y: m }, { x: m - 1, y: m }, { x: m - 2, y: m }];
    const config = SNAKE_SPEED_CONFIG[difficulty || 'normal'];
    st.current = { snake, dir: { x: 1, y: 0 }, nextDir: { x: 1, y: 0 }, food: randFood(snake), speed: config.initial, eaten: 0 };
    doneRef.current = false;
    setDone(false); setScore(0); setStarted(false); setPaused(false); setPausedSecs(0); render(n => n + 1);
  };
  useEffect(() => { init(); }, [resetKey]);

  const gameOver = () => {
    if (doneRef.current) return;
    doneRef.current = true; setDone(true);
    cgSound('lose'); cgHaptic([20, 40, 20]);
    const sc = st.current.eaten * 10;
    cgSaveHistory(SNAKE_KEY, { score: sc, len: st.current.snake.length, ts: Date.now() });
    const hist = cgLoadHistory(SNAKE_KEY);
    const bestScore = hist.reduce((m, r) => Math.max(m, r.score || 0), 0);
    const longestSnake = hist.reduce((m, r) => Math.max(m, r.len || 0), 0);
    onWin(sc, st.current.eaten, secsRef.current, { winnerLabel: 'Game Over', share: `🐍 Snake — ${sc} pts, length ${st.current.snake.length}`, bestScore, longestSnake });
  };
  const step = () => {
    const s = st.current;
    if (!s || doneRef.current) return;
    s.dir = s.nextDir;
    const head = s.snake[0];
    const nx = head.x + s.dir.x, ny = head.y + s.dir.y;
    if (nx < 0 || ny < 0 || nx >= N || ny >= N ||
        s.snake.some((seg, i) => i < s.snake.length - 1 && seg.x === nx && seg.y === ny)) {
      gameOver(); return;
    }
    s.snake.unshift({ x: nx, y: ny });
    if (nx === s.food.x && ny === s.food.y) {
      s.eaten++; setScore(s.eaten * 10);
      cgSound('clear', 1 + s.eaten * 0.02); cgHaptic(15);
      s.food = randFood(s.snake);
      const config = SNAKE_SPEED_CONFIG[difficulty || 'normal'];
      s.speed = Math.max(80, config.initial - s.eaten * config.decrement);
      onStepChange && onStepChange(s.eaten);
    } else {
      s.snake.pop();
    }
    render(n => n + 1);
  };
  useEffect(() => {
    if (done || !started || paused) return;
    let raf, last = 0, alive = true;
    const loop = (ts) => {
      if (!alive) return;
      const s = st.current;
      if (s && ts - last >= s.speed) { last = ts; step(); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [done, started, paused, resetKey]);

  const turn = (dir) => {
    const s = st.current;
    if (!s || doneRef.current || paused) return;
    const map = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
    const nd = map[dir]; if (!nd) return;
    if (nd.x === -s.dir.x && nd.y === -s.dir.y) return;
    s.nextDir = nd;
    if (!started) setStarted(true);
    cgSound('move');
  };
  useGestures(boardRef, { onSwipe: (d) => turn(d), onTap: () => { if (!started && !paused) setStarted(true); } });
  useEffect(() => {
    const onKey = (e) => {
      const k = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key];
      if (k) { e.preventDefault(); turn(k); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started]);

  const s = st.current;
  const cells = [];
  if (s) {
    const occ = {};
    s.snake.forEach((seg, i) => { occ[seg.y * N + seg.x] = i === 0 ? 'head' : 'body'; });
    const fi = s.food.y * N + s.food.x;
    for (let i = 0; i < N * N; i++) {
      const o = occ[i];
      cells.push(<div key={i} className={'snake-cell' + (o ? ' ' + o : '') + (i === fi ? ' food' : '')} />);
    }
  }
  const hist = cgLoadHistory(SNAKE_KEY);
  const best = hist.reduce((m, r) => Math.max(m, r.score || 0), 0);
  const longest = hist.reduce((m, r) => Math.max(m, r.len || 0), 0);
  const sheet = [
    cgHistorySection(hist, r => <><span>{r.score} pts</span><span className="mono">len {r.len}</span></>),
    cgStatsSection([
      { val: best, lbl: 'Best score' }, { val: hist.length, lbl: 'Games' },
      { val: longest, lbl: 'Longest' }, { val: score, lbl: 'This run' },
    ]),
    cgRulesSection(['Swipe (or arrow keys) to steer the snake.', 'Eat the red food to grow and score.', 'Avoid the walls and your own tail.', 'It speeds up as you grow — chase a high score!', `Difficulty: ${(difficulty || 'normal').charAt(0).toUpperCase() + (difficulty || 'normal').slice(1)} — change via New Game.`]),
  ];
  return (
    <ClassicShell game={game} onExit={onBack} onNewGame={() => init()} sheetSections={sheet}>
      <div className="cg-stage">
        <CgStatus items={[{ l: 'Score', v: score }, { l: 'Length', v: s ? s.snake.length : 0 }, { l: 'Time', v: cgFmt(secs) }]} />
        <div className="snake-board-wrap">
          <div className="snake-board" ref={boardRef} style={{ gridTemplateColumns: `repeat(${N}, 1fr)`, gridTemplateRows: `repeat(${N}, 1fr)` }}>
            {cells}
          </div>
          {paused && !done && (
            <div className="snake-pause-overlay">
              <div className="snake-pause-text">PAUSED</div>
            </div>
          )}
        </div>
        <div className="snake-hint">{started ? 'Swipe to steer' : 'Swipe or tap to start'}</div>
        <div className="snake-controls">
          {!started && <button onClick={() => init()}>Restart</button>}
          {started && !paused && !done && (
            <>
              <button onClick={() => { setPaused(true); setPausedSecs(secs); }}>Pause</button>
              <button onClick={() => init()}>Restart</button>
            </>
          )}
          {paused && !done && (
            <>
              <button onClick={() => { setPaused(false); }}>Resume</button>
              <button onClick={() => init()}>Restart</button>
            </>
          )}
        </div>
      </div>
    </ClassicShell>
  );
}

/* ---- Snake — Wrapper (mode selector + gameplay) ---- */
function SnakeGame({ onWin, onStepChange, resetKey, game, onBack }) {
  const [difficulty, setDifficulty] = useState(null);
  const diffRef = useRef(difficulty);
  diffRef.current = difficulty;

  useEffect(() => {
    if (diffRef.current !== null) {
      setDifficulty(null);
    }
  }, [resetKey]);

  if (!difficulty) {
    return (
      <ClassicShell game={game} onExit={onBack} sheetSections={[]}>
        <div className="cg-stage">
          <SnakeGameModeSelect onSelectDifficulty={(d) => setDifficulty(d)} />
        </div>
      </ClassicShell>
    );
  }

  return React.createElement(SnakeGameplay, { onWin, onStepChange, resetKey, game, onBack, difficulty });
}
