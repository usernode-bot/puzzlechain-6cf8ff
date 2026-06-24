/* ---------------- Diamond Rush ---------------- */
const DR_GEMS = ['💎', '🔴', '🟡', '🟢', '🟣', '🔵'];
function drMake() {
  const g = new Array(64);
  for (let i = 0; i < 64; i++) {
    let v;
    do { v = Math.floor(Math.random() * 6); }
    while (
      (i % 8 >= 2 && g[i - 1] === v && g[i - 2] === v) ||
      (i >= 16 && g[i - 8] === v && g[i - 16] === v)
    );
    g[i] = v;
  }
  return g;
}
function drFindMatches(g) {
  const m = new Set();
  for (let r = 0; r < 8; r++) for (let c = 0; c < 6; c++) {
    const i = r * 8 + c, v = g[i];
    if (v != null && g[i + 1] === v && g[i + 2] === v) { m.add(i); m.add(i + 1); m.add(i + 2); }
  }
  for (let c = 0; c < 8; c++) for (let r = 0; r < 6; r++) {
    const i = r * 8 + c, v = g[i];
    if (v != null && g[i + 8] === v && g[i + 16] === v) { m.add(i); m.add(i + 8); m.add(i + 16); }
  }
  return m;
}
function drResolve(grid) {
  let g = grid.slice();
  let total = 0, cascades = 0, maxClear = 0;
  while (true) {
    const m = drFindMatches(g);
    if (!m.size) break;
    cascades++;
    maxClear = Math.max(maxClear, m.size);
    total += m.size * 10 * cascades;
    m.forEach(i => { g[i] = null; });
    for (let c = 0; c < 8; c++) {
      const col = [];
      for (let r = 7; r >= 0; r--) { const v = g[r * 8 + c]; if (v != null) col.push(v); }
      for (let r = 7; r >= 0; r--) {
        const idx = (7 - r);
        g[r * 8 + c] = idx < col.length ? col[idx] : Math.floor(Math.random() * 6);
      }
    }
  }
  return { grid: g, total, cascades, maxClear };
}
function DiamondRushGame({ onWin, onLose, onStepChange, resetKey, game, onBack }) {
  const TARGET = 800, START_MOVES = 18;
  const [grid, setGrid] = useState(() => drMake());
  const [sel, setSel] = useState(-1);
  const [moves, setMoves] = useState(START_MOVES);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const doneRef = useRef(false);
  const bestCascadeRef = useRef(0);
  const touch = useRef(null);
  const secs = useElapsed(resetKey, !done);
  const secsRef = useRef(0); secsRef.current = secs;

  const init = () => {
    setGrid(drMake()); setSel(-1); setMoves(START_MOVES); setScore(0);
    setDone(false); doneRef.current = false; bestCascadeRef.current = 0;
  };
  useEffect(() => { init(); }, [resetKey]);

  const finish = (sc, win, mv) => {
    doneRef.current = true; setDone(true);
    cgSound(win ? 'win' : 'lose'); cgHaptic(win ? [15, 30, 15] : [20, 40]);
    cgSaveHistory(DR_KEY, { score: sc, win, cascade: bestCascadeRef.current, ts: Date.now() });
    if (win) onWin(sc, START_MOVES - mv, secsRef.current, { share: `💎 Diamond Rush — ${sc} pts!` });
    else onLose(START_MOVES - mv, secsRef.current, { share: `💎 Diamond Rush — ${sc}/${TARGET}` });
  };
  const adjacent = (a, b) => {
    const ar = Math.floor(a / 8), ac = a % 8, br = Math.floor(b / 8), bc = b % 8;
    return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
  };
  const trySwap = (a, b) => {
    if (done || a === b || !adjacent(a, b)) { setSel(-1); return; }
    const g = grid.slice();
    [g[a], g[b]] = [g[b], g[a]];
    if (!drFindMatches(g).size) { cgSound('move'); setSel(-1); return; } // no match, revert
    const res = drResolve(g);
    bestCascadeRef.current = Math.max(bestCascadeRef.current, res.cascades);
    cgSound('clear', 1 + res.cascades * 0.12); cgHaptic(20);
    const ns = score + res.total;
    const nm = moves - 1;
    setGrid(res.grid); setScore(ns); setMoves(nm); setSel(-1);
    onStepChange && onStepChange(START_MOVES - nm);
    if (ns >= TARGET) { setTimeout(() => finish(ns, true, nm), 150); }
    else if (nm <= 0) { setTimeout(() => finish(ns, false, nm), 150); }
  };
  const onGemDown = (e, i) => { const p = pointerXY(e); touch.current = { i, x: p.x, y: p.y }; };
  const onGemUp = (e, i) => {
    const start = touch.current; touch.current = null;
    if (!start) { return; }
    const p = pointerXY(e);
    const dx = p.x - start.x, dy = p.y - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 18) {
      // swipe from start.i toward neighbor
      const r = Math.floor(start.i / 8), c = start.i % 8;
      let nr = r, nc = c;
      if (Math.abs(dx) > Math.abs(dy)) nc += dx > 0 ? 1 : -1; else nr += dy > 0 ? 1 : -1;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) trySwap(start.i, nr * 8 + nc);
      else setSel(-1);
      return;
    }
    // tap
    if (sel === -1) { setSel(start.i); cgSound('click'); }
    else if (sel === start.i) { setSel(-1); }
    else trySwap(sel, start.i);
  };
  const hist = cgLoadHistory(DR_KEY);
  const best = hist.reduce((m, r) => Math.max(m, r.score || 0), 0);
  const wins = hist.filter(r => r.win).length;
  const bigC = hist.reduce((m, r) => Math.max(m, r.cascade || 0), 0);
  const sheet = [
    cgHistorySection(hist, r => <><span>{r.win ? '✅' : '❌'} {r.score} pts</span><span className="mono">x{r.cascade}</span></>),
    cgStatsSection([
      { val: best, lbl: 'Best score' }, { val: wins, lbl: 'Rounds won' },
      { val: bigC, lbl: 'Best cascade' }, { val: score, lbl: 'This round' },
    ]),
    cgRulesSection([`Reach ${TARGET} points within ${START_MOVES} moves.`, 'Tap a gem then an adjacent gem — or swipe — to swap.', 'Line up 3+ of one colour to clear them.', 'Falling gems can chain into cascades for big bonuses.']),
  ];
  return (
    <ClassicShell game={game} onExit={onBack} onNewGame={() => init()} sheetSections={sheet}>
      <div className="cg-stage">
        <CgStatus items={[{ l: 'Score', v: `${score}/${TARGET}` }, { l: 'Moves', v: moves }, { l: 'Time', v: cgFmt(secs) }]} />
        <div className="dr-grid">
          {grid.map((v, i) => (
            <div key={i} className={'dr-gem' + (sel === i ? ' sel' : '')}
              onMouseDown={(e) => onGemDown(e, i)} onMouseUp={(e) => onGemUp(e, i)}
              onTouchStart={(e) => onGemDown(e, i)} onTouchEnd={(e) => onGemUp(e, i)}>
              {DR_GEMS[v]}
            </div>
          ))}
        </div>
      </div>
    </ClassicShell>
  );
}


/* ============================================================
   Diamond Rush — original tile maze adventure (Classic, server-saved)
   ============================================================ */
// Tile legend: # wall, . floor, G gem, K key, D door, T trap, X exit, S start.
// Enemies are defined out-of-grid as a patrol path; they advance one step
// per player move (turn-based, fully deterministic — no soft-locks).
const DR_LEVELS = [
  {
    name: 'First Sparkle',
    grid: [
      '########',
      '#S.....#',
      '#.G.G..#',
      '#......#',
      '#..GG..#',
      '#......#',
      '#....GX#',
      '########',
    ],
    enemyPath: null,
  },
  {
    name: 'Mind the Spikes',
    grid: [
      '########',
      '#S...G.#',
      '#.TT##.#',
      '#.G..T.#',
      '#.##.#.#',
      '#G...G.#',
      '#.T#..X#',
      '########',
    ],
    enemyPath: null,
  },
  {
    name: 'Locked Vault',
    grid: [
      '########',
      '#S..K..#',
      '#.####.#',
      '#G.G.#.#',
      '#.##.#.#',
      '#.#GD..#',
      '#.#..#X#',
      '########',
    ],
    // The gem at (5,3) sits in a pocket sealed by the door at (5,4): the only
    // way to collect every gem (required to open the exit) is to grab the key.
    enemyPath: null,
  },
  {
    name: 'Patrol Run',
    grid: [
      '########',
      '#S.G...#',
      '#.####.#',
      '#.G..G.#',
      '#.####.#',
      '#...G..#',
      '#G....X#',
      '########',
    ],
    enemyPath: [[3,1],[3,2],[3,3],[3,4],[3,5],[3,6],[3,5],[3,4],[3,3],[3,2]],
  },
  {
    name: 'The Gauntlet',
    grid: [
      '########',
      '#S.G.K.#',
      '#.##.#.#',
      '#.G#.#.#',
      '#.#.#G.#',
      '#.T.#.D#',
      '#G..T#X#',
      '########',
    ],
    enemyPath: [[1,6],[2,6],[3,6],[4,6],[3,6],[2,6]],
  },
];

const DR_SOUND_KEY = 'puzzlechain_diamondrush_sound';
const DR_LIVES = 3;

