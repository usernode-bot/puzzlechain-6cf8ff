/* ============================================================
   2048 helpers
   ============================================================ */
const T2048_BOARD_KEY   = 'puzzlechain_2048_board';
const T2048_BEST_KEY    = 'puzzlechain_2048_best';
const T2048_UNDO_KEY    = 'puzzlechain_2048_undo';
const T2048_HISTORY_KEY = 'puzzlechain_2048_history';
const T2048_HISTORY_MAX = 50;

let t2048TileCounter = 0;

const T2048_COLORS = {
  2:    { bg: '#2E3038', color: '#8B9196' },
  4:    { bg: '#363B45', color: '#A0A7B0' },
  8:    { bg: '#B5630A', color: '#FFF' },
  16:   { bg: '#D4720E', color: '#FFF' },
  32:   { bg: '#C2410C', color: '#FFF' },
  64:   { bg: '#9D174D', color: '#FFF' },
  128:  { bg: '#5B21B6', color: '#FFF' },
  256:  { bg: '#1D4ED8', color: '#FFF' },
  512:  { bg: '#0369A1', color: '#FFF' },
  1024: { bg: '#0F766E', color: '#FFF' },
  2048: { bg: '#92400E', color: '#FEF3C7' },
};

function t2048_tileStyle(value) {
  if (T2048_COLORS[value]) return T2048_COLORS[value];
  const palette = ['#3b82f6', '#8b5cf6', '#f43f5e', '#10b981', '#f59e0b'];
  return { bg: palette[Math.floor(Math.log2(value)) % palette.length], color: '#FFF' };
}

function t2048_tileFontSize(v) {
  if (v < 100)   return '1.4rem';
  if (v < 1000)  return '1.15rem';
  if (v < 10000) return '0.92rem';
  return '0.72rem';
}

function t2048_newTile(value, isNew, isMerged) {
  return { value, id: ++t2048TileCounter, isNew: !!isNew, isMerged: !!isMerged };
}

function t2048_emptyCells(grid) {
  const out = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (!grid[r][c]) out.push([r, c]);
  return out;
}

function t2048_addRandom(grid) {
  const empties = t2048_emptyCells(grid);
  if (!empties.length) return grid;
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  const next = grid.map(row => [...row]);
  next[r][c] = t2048_newTile(Math.random() < 0.9 ? 2 : 4, true, false);
  return next;
}

function t2048_initGrid() {
  let g = [[null,null,null,null],[null,null,null,null],[null,null,null,null],[null,null,null,null]];
  g = t2048_addRandom(g);
  g = t2048_addRandom(g);
  return g;
}

function t2048_slideRowLeft(row) {
  const tiles = row.filter(Boolean);
  let delta = 0;
  const out = [];
  let i = 0;
  while (i < tiles.length) {
    if (i + 1 < tiles.length && tiles[i].value === tiles[i + 1].value) {
      const val = tiles[i].value * 2;
      delta += val;
      out.push(t2048_newTile(val, false, true));
      i += 2;
    } else {
      out.push({ ...tiles[i], isNew: false, isMerged: false });
      i++;
    }
  }
  const newRow = [...out, null, null, null, null].slice(0, 4);
  let moved = false;
  for (let j = 0; j < 4; j++) {
    const ov = row[j] ? row[j].value : 0;
    const nv = newRow[j] ? newRow[j].value : 0;
    if (ov !== nv) { moved = true; break; }
  }
  return { row: newRow, delta, moved };
}

function t2048_rotateCW(g) {
  return Array.from({length:4},(_,c)=>Array.from({length:4},(_,r)=>g[3-r][c]));
}
function t2048_rotateCCW(g) {
  return Array.from({length:4},(_,c)=>Array.from({length:4},(_,r)=>g[r][3-c]));
}
function t2048_rot180(g) { return t2048_rotateCW(t2048_rotateCW(g)); }

function t2048_move(grid, dir) {
  let g = grid;
  if (dir === 'right') g = t2048_rot180(g);
  else if (dir === 'up')   g = t2048_rotateCW(g);
  else if (dir === 'down') g = t2048_rotateCCW(g);
  let totalDelta = 0, anyMoved = false;
  const next = g.map(row => {
    const { row: nr, delta, moved } = t2048_slideRowLeft(row);
    totalDelta += delta;
    if (moved) anyMoved = true;
    return nr;
  });
  let result = next;
  if (dir === 'right') result = t2048_rot180(next);
  else if (dir === 'up')   result = t2048_rotateCCW(next);
  else if (dir === 'down') result = t2048_rotateCW(next);
  return { grid: result, delta: totalDelta, moved: anyMoved };
}

function t2048_hasMove(grid) {
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      if (!grid[r][c]) return true;
      const v = grid[r][c].value;
      if (c + 1 < 4 && grid[r][c+1] && grid[r][c+1].value === v) return true;
      if (r + 1 < 4 && grid[r+1][c] && grid[r+1][c].value === v) return true;
    }
  return false;
}

function t2048_maxTile(grid) {
  let max = 0;
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (grid[r][c] && grid[r][c].value > max) max = grid[r][c].value;
  return max;
}

function t2048_toShareText(score, moves, secs, highTile) {
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return '2048 🔢 Score: ' + score.toLocaleString() + '\nHighest tile: ' + highTile + ' 🏆\nMoves: ' + moves + ' | Time: ' + mm + ':' + ss + '\nPlay at PuzzleChain';
}

function t2048_stripAnim(grid) {
  return grid.map(row => row.map(cell =>
    cell ? { value: cell.value, id: cell.id, isNew: false, isMerged: false } : null
  ));
}

function t2048LoadHistory() {
  try { return JSON.parse(localStorage.getItem(T2048_HISTORY_KEY) || '[]'); }
  catch { return []; }
}
function t2048SaveEntry(entry) {
  const h = t2048LoadHistory();
  h.unshift(entry);
  if (h.length > T2048_HISTORY_MAX) h.length = T2048_HISTORY_MAX;
  try { localStorage.setItem(T2048_HISTORY_KEY, JSON.stringify(h)); } catch {}
}
function t2048LoadSavedBoard() {
  try {
    const raw = localStorage.getItem(T2048_BOARD_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return { ...p, grid: t2048_stripAnim(p.grid) };
  } catch { return null; }
}
function t2048SaveBoard(grid, score, elapsed, won, moves) {
  try {
    localStorage.setItem(T2048_BOARD_KEY, JSON.stringify({
      grid: t2048_stripAnim(grid), score, elapsed, won, moves: moves || 0
    }));
  } catch {}
}
function t2048ClearBoard() {
  try { localStorage.removeItem(T2048_BOARD_KEY); } catch {}
}
function t2048LoadBest() {
  try { return parseInt(localStorage.getItem(T2048_BEST_KEY) || '0', 10) || 0; }
  catch { return 0; }
}
function t2048SaveBest(v) {
  try { localStorage.setItem(T2048_BEST_KEY, String(v)); } catch {}
}

/* ============================================================
   T2048Game component
   ============================================================ */
function T2048Game({ onWin, onLose, onStepChange, resetKey }) {
  const _saved = t2048LoadSavedBoard();

  const [grid, setGrid]               = useState(() => _saved ? _saved.grid : t2048_initGrid());
  const [score, setScore]             = useState(() => _saved ? _saved.score || 0 : 0);
  const [moves, setMoves]             = useState(() => _saved ? _saved.moves || 0 : 0);
  const [elapsedSecs, setElapsedSecs] = useState(() => _saved ? _saved.elapsed || 0 : 0);
  const [done, setDone]               = useState(false);
  const [hasWon, setHasWon]           = useState(() => _saved ? _saved.won || false : false);
  const [victoryVisible, setVictoryVisible] = useState(false);
  const [isMock, setIsMock]           = useState(false);
  const [activeTab, setActiveTab]     = useState('game');
  const [history, setHistory]         = useState(() => t2048LoadHistory());
  const [bestScore, setBestScore]     = useState(() => t2048LoadBest());
  const [undoStack, setUndoStack]     = useState([]);
  const [scoreDelta, setScoreDelta]   = useState(null);

  const touchStartRef  = useRef(null);
  const deltaTimerRef  = useRef(null);
  const executeMoveRef = useRef(null);

  const gameRunning = !done && !victoryVisible && activeTab === 'game';

  useEffect(() => {
    if (!gameRunning) return;
    const id = setInterval(() => setElapsedSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [gameRunning]);

  useEffect(() => {
    if (window.usernode && typeof window.usernode.isMockEnabled === 'function') {
      window.usernode.isMockEnabled().then(m => setIsMock(!!m)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!resetKey) return;
    handleNewGame();
  }, [resetKey]);

  // Clear animation flags after 200ms
  useEffect(() => {
    const hasTmp = grid.some(row => row.some(c => c && (c.isNew || c.isMerged)));
    if (!hasTmp) return;
    const id = setTimeout(() => {
      setGrid(g => g.map(row => row.map(c =>
        c && (c.isNew || c.isMerged) ? { ...c, isNew: false, isMerged: false } : c
      )));
    }, 200);
    return () => clearTimeout(id);
  }, [grid]);

  // Keyboard handler — always reads fresh executeMove via ref
  useEffect(() => {
    const handler = (e) => {
      const dirs = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
      if (dirs[e.key]) {
        e.preventDefault();
        if (executeMoveRef.current) executeMoveRef.current(dirs[e.key]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const fmtSecs = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  const fmtDate = d => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return m + '/' + day + '/' + y.slice(2);
  };

  const handleNewGame = () => {
    t2048ClearBoard();
    try { localStorage.removeItem(T2048_UNDO_KEY); } catch {}
    setGrid(t2048_initGrid());
    setScore(0);
    setMoves(0);
    setElapsedSecs(0);
    setDone(false);
    setHasWon(false);
    setVictoryVisible(false);
    setUndoStack([]);
    setScoreDelta(null);
  };

  const executeMove = (dir) => {
    if (done || victoryVisible || activeTab !== 'game') return;
    const { grid: movedGrid, delta, moved } = t2048_move(grid, dir);
    if (!moved) return;

    const newUndo = isMock
      ? [{ grid: t2048_stripAnim(grid), score, moves }, ...undoStack].slice(0, 10)
      : undoStack;

    const withTile  = t2048_addRandom(movedGrid);
    const newScore  = score + delta;
    const newMoves  = moves + 1;

    setGrid(withTile);
    setScore(newScore);
    setMoves(newMoves);
    setUndoStack(newUndo);

    if (delta > 0) {
      if (deltaTimerRef.current) clearTimeout(deltaTimerRef.current);
      setScoreDelta(delta);
      deltaTimerRef.current = setTimeout(() => setScoreDelta(null), 600);
    }

    if (newScore > bestScore) { setBestScore(newScore); t2048SaveBest(newScore); }
    t2048SaveBoard(withTile, newScore, elapsedSecs, hasWon, newMoves);
    if (isMock) {
      try { localStorage.setItem(T2048_UNDO_KEY, JSON.stringify(newUndo)); } catch {}
    }
    onStepChange && onStepChange(newMoves);

    const maxT = t2048_maxTile(withTile);
    if (maxT >= 2048 && !hasWon) {
      setHasWon(true);
      setVictoryVisible(true);
      return;
    }
    if (!t2048_hasMove(withTile)) {
      setDone(true);
      const entry = {
        id: Date.now(),
        date: new Date().toISOString().slice(0, 10),
        outcome: 'loss',
        score: newScore,
        moves: newMoves,
        secs: elapsedSecs,
        highTile: maxT,
      };
      t2048SaveEntry(entry);
      t2048ClearBoard();
      onLose && onLose(newMoves, elapsedSecs, {
        share: t2048_toShareText(newScore, newMoves, elapsedSecs, maxT),
        answer: String(maxT),
      });
    }
  };

  // Keep ref fresh on every render so the keyboard handler always calls the latest closure
  executeMoveRef.current = executeMove;

  const handleUndo = () => {
    if (!undoStack.length || done) return;
    const [prev, ...rest] = undoStack;
    setGrid(prev.grid);
    setScore(prev.score);
    setMoves(prev.moves);
    setUndoStack(rest);
    try { if (isMock) localStorage.setItem(T2048_UNDO_KEY, JSON.stringify(rest)); } catch {}
  };

  const handleFinish = () => {
    const maxT = t2048_maxTile(grid);
    t2048SaveEntry({
      id: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      outcome: 'win',
      score,
      moves,
      secs: elapsedSecs,
      highTile: maxT,
    });
    t2048ClearBoard();
    onWin && onWin(score, moves, elapsedSecs, {
      share: t2048_toShareText(score, moves, elapsedSecs, maxT),
    });
  };

  const handleTouchStart = (e) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };
  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 40) return;
    const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    executeMove(dir);
  };

  const maxTile = t2048_maxTile(grid);

  // Inline stats computation (same pattern as Mancala)
  const histStats = history.length ? (() => {
    const gp = history.length;
    const gw = history.filter(h => h.outcome === 'win').length;
    const hs = Math.max(0, ...history.map(h => h.score));
    const ht = Math.max(0, ...history.map(h => h.highTile));
    const avg = Math.round(history.reduce((a, h) => a + h.score, 0) / gp);
    const tm  = history.reduce((a, h) => a + h.moves, 0);
    const ls  = Math.max(0, ...history.map(h => h.secs));
    const fmtDur = s => {
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
      return h > 0 ? h + 'h ' + m + 'm' : m + 'm ' + sec + 's';
    };
    return { gp, gw, hs, ht, avg, tm, ls: fmtDur(ls) };
  })() : null;

  return (
    <div>
      {isMock && <div className="t2048-banner">Local storage — will sync to chain when live</div>}

      {activeTab === 'game' && (
        <div>
          <div className="status-bar">
            <div className="pill" style={{ position: 'relative' }}>
              <div className="plabel">Score</div>
              <div className="pvalue mono">
                {score.toLocaleString()}
                {scoreDelta !== null && <span className="t2048-score-delta">+{scoreDelta}</span>}
              </div>
            </div>
            <div className="pill">
              <div className="plabel">Best</div>
              <div className="pvalue mono">{bestScore.toLocaleString()}</div>
            </div>
            <div className="pill">
              <div className="plabel">Tile</div>
              <div className="pvalue mono">{maxTile || '—'}</div>
            </div>
            <div className="pill">
              <div className="plabel">Moves</div>
              <div className="pvalue">{moves}</div>
            </div>
            <div className="pill">
              <div className="plabel">Time</div>
              <div className="pvalue time">{fmtSecs(elapsedSecs)}</div>
            </div>
          </div>

          <div
            className="t2048-board-wrap"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="t2048-grid">
              {grid.flat().map((cell, i) => {
                if (!cell) return <div key={'c' + i} className="t2048-cell" />;
                const { bg, color } = t2048_tileStyle(cell.value);
                return (
                  <div
                    key={'t' + cell.id}
                    className={'t2048-tile' + (cell.isNew ? ' is-new' : '') + (cell.isMerged ? ' is-merged' : '')}
                    style={{
                      background: bg,
                      color,
                      fontSize: t2048_tileFontSize(cell.value),
                      boxShadow: cell.value === 2048 ? '0 0 14px #F59E0B88' : 'none',
                    }}
                  >
                    {cell.value}
                  </div>
                );
              })}
            </div>

            {victoryVisible && (
              <div className="t2048-overlay">
                <div style={{ fontSize: '2rem' }}>🎉</div>
                <h3 style={{ color: C.gold }}>You did it!</h3>
                <div className="t2048-overlay-score">{score.toLocaleString()}</div>
                <div style={{ fontSize: '0.75rem', color: C.muted }}>Keep playing for a higher score</div>
                <div className="t2048-overlay-btns">
                  <button className="t2048-keep-btn" onClick={() => setVictoryVisible(false)}>Keep Going</button>
                  <button className="t2048-finish-btn" onClick={handleFinish}>Finish</button>
                </div>
              </div>
            )}
          </div>

          <div className="t2048-controls">
            <button onClick={handleNewGame}>↺ New Game</button>
            {isMock && (
              <button onClick={handleUndo} disabled={undoStack.length === 0 || done}>↩ Undo</button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          <div className="t2048-history-list">
            {history.length === 0
              ? <div className="t2048-empty-state">No games recorded yet</div>
              : history.map(h => (
                <div key={h.id} className="t2048-history-row">
                  <span className={'t2048-outcome-chip ' + h.outcome}>{h.outcome === 'win' ? 'Win' : 'Loss'}</span>
                  <span style={{ color: C.muted, fontSize: '0.75rem' }}>{fmtDate(h.date)}</span>
                  <span className="mono" style={{ color: C.gold }}>{h.score.toLocaleString()}</span>
                  <span style={{ color: C.muted, fontSize: '0.75rem' }}>×{h.highTile}</span>
                  <span style={{ color: C.muted, fontSize: '0.75rem' }}>{h.moves}mv · {fmtSecs(h.secs)}</span>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div>
          {!histStats
            ? <div className="t2048-empty-state">No games recorded yet</div>
            : (
              <div className="t2048-stats-grid">
                <div className="t2048-stat-card">
                  <div className="t2048-stat-val">{histStats.gp}</div>
                  <div className="t2048-stat-lbl">Played</div>
                </div>
                <div className="t2048-stat-card">
                  <div className="t2048-stat-val" style={{ color: C.emerald }}>{histStats.gw}</div>
                  <div className="t2048-stat-lbl">Won</div>
                </div>
                <div className="t2048-stat-card">
                  <div className="t2048-stat-val">{histStats.hs.toLocaleString()}</div>
                  <div className="t2048-stat-lbl">Best Score</div>
                </div>
                <div className="t2048-stat-card">
                  <div className="t2048-stat-val" style={{ color: C.gold }}>{histStats.ht}</div>
                  <div className="t2048-stat-lbl">Best Tile</div>
                </div>
                <div className="t2048-stat-card">
                  <div className="t2048-stat-val">{histStats.avg.toLocaleString()}</div>
                  <div className="t2048-stat-lbl">Avg Score</div>
                </div>
                <div className="t2048-stat-card">
                  <div className="t2048-stat-val">{histStats.tm.toLocaleString()}</div>
                  <div className="t2048-stat-lbl">Total Moves</div>
                </div>
                <div className="t2048-stat-card" style={{ gridColumn: '1 / 3' }}>
                  <div className="t2048-stat-val">{histStats.ls}</div>
                  <div className="t2048-stat-lbl">Longest Session</div>
                </div>
              </div>
            )
          }
        </div>
      )}

      <div className="t2048-bottom-nav">
        {['game', 'history', 'stats'].map(tab => (
          <button
            key={tab}
            className={'t2048-tab' + (activeTab === tab ? ' active' : '')}
            onClick={() => { setActiveTab(tab); if (tab !== 'game') setHistory(t2048LoadHistory()); }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}
