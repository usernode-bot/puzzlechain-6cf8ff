/* ============================================================
   Game 4 — Minesweeper (8×8, 10 mines, classic game)
   ============================================================ */
const MS_ROWS = 8, MS_COLS = 8, MS_MINES = 10, MS_SAFE = MS_ROWS * MS_COLS - MS_MINES; // 54

const MS_HISTORY_KEY = 'puzzlechain_minesweeper_history';
const MS_HISTORY_MAX = 50;

function msLoadHistory() {
  try { return JSON.parse(localStorage.getItem(MS_HISTORY_KEY) || '[]'); }
  catch { return []; }
}
function msSaveEntry(entry) {
  const h = msLoadHistory();
  h.unshift(entry);
  if (h.length > MS_HISTORY_MAX) h.length = MS_HISTORY_MAX;
  try { localStorage.setItem(MS_HISTORY_KEY, JSON.stringify(h)); } catch {}
}

function generateMines(firstR, firstC) {
  const protected_ = new Set();
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = firstR + dr, c = firstC + dc;
      if (r >= 0 && r < MS_ROWS && c >= 0 && c < MS_COLS)
        protected_.add(r * MS_COLS + c);
    }
  }
  const indices = [];
  for (let i = 0; i < MS_ROWS * MS_COLS; i++) if (!protected_.has(i)) indices.push(i);
  // Fisher-Yates on eligible indices
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return new Set(indices.slice(0, MS_MINES));
}

function computeAdjacency(mineSet) {
  const adj = new Int8Array(MS_ROWS * MS_COLS);
  for (let r = 0; r < MS_ROWS; r++) {
    for (let c = 0; c < MS_COLS; c++) {
      const idx = r * MS_COLS + c;
      if (mineSet.has(idx)) { adj[idx] = -1; continue; }
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < MS_ROWS && nc >= 0 && nc < MS_COLS && mineSet.has(nr * MS_COLS + nc)) count++;
      }
      adj[idx] = count;
    }
  }
  return adj;
}

function floodReveal(startIdx, adjacency, mineSet, prevRevealed, flagged) {
  const next = new Set(prevRevealed);
  const queue = [startIdx];
  while (queue.length) {
    const idx = queue.shift();
    if (next.has(idx) || mineSet.has(idx) || flagged.has(idx)) continue;
    next.add(idx);
    if (adjacency[idx] === 0) {
      const r = Math.floor(idx / MS_COLS), c = idx % MS_COLS;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < MS_ROWS && nc >= 0 && nc < MS_COLS) queue.push(nr * MS_COLS + nc);
      }
    }
  }
  return next;
}

function MinesweeperGame({ onWin, onLose, onStepChange, resetKey }) {
  const [theme, setTheme] = useState('dark');
  const [activeTab, setActiveTab] = useState('game');
  const [mineSet, setMineSet] = useState(null);
  const [adjacency, setAdjacency] = useState(null);
  const [revealed, setRevealed] = useState(() => new Set());
  const [flagged, setFlagged] = useState(() => new Set());
  const [done, setDone] = useState(false);
  const [gameOverMine, setGameOverMine] = useState(null);
  const [steps, setSteps] = useState(0);
  const [isMock, setIsMock] = useState(false);
  const [gameHistory, setGameHistory] = useState(() => msLoadHistory());
  const flagTimerRef = useRef(null);
  const { secs, fmt: timeFmt } = useTimer(!done && mineSet !== null);

  // Reset when parent increments resetKey
  useEffect(() => {
    setMineSet(null);
    setAdjacency(null);
    setRevealed(new Set());
    setFlagged(new Set());
    setDone(false);
    setGameOverMine(null);
    setSteps(0);
    setActiveTab('game');
  }, [resetKey]);

  // Bridge: detect mock mode
  useEffect(() => {
    if (window.usernode && typeof window.usernode.isMockEnabled === 'function') {
      window.usernode.isMockEnabled().then(m => setIsMock(!!m)).catch(() => {});
    }
  }, []);

  const safeRevealed = mineSet
    ? Array.from(revealed).filter(i => !mineSet.has(i)).length
    : 0;
  const cashOutActive = safeRevealed >= 10 && !done;
  const cashoutMultiplier = parseFloat((1.0 + safeRevealed / MS_SAFE).toFixed(2));

  const handleReveal = (idx) => {
    if (done || revealed.has(idx) || flagged.has(idx)) return;
    const r = Math.floor(idx / MS_COLS), c = idx % MS_COLS;

    let mines = mineSet, adj = adjacency;
    if (!mines) {
      mines = generateMines(r, c);
      adj = computeAdjacency(mines);
      setMineSet(mines);
      setAdjacency(adj);
    }

    const newSteps = steps + 1;
    setSteps(newSteps);
    onStepChange(newSteps);

    if (mines.has(idx)) {
      setGameOverMine(idx);
      setDone(true);
      const baseScore = 0;
      const entry = {
        id: String(Date.now()),
        date: new Date().toISOString().slice(0, 10),
        outcome: 'loss', score: 0, steps: newSteps, secs, safeRevealed, cashOut: false, cashoutMultiplier: null,
      };
      msSaveEntry(entry);
      setGameHistory(msLoadHistory());
      const shareText = `Minesweeper ${entry.date} — 💥 Game Over · ${safeRevealed}/54 safe · ${secs}s · +0 pts`;
      onLose(newSteps, secs, { share: shareText });
      return;
    }

    const newRevealed = floodReveal(idx, adj, mines, revealed, flagged);
    setRevealed(newRevealed);

    const newSafeRevealed = Array.from(newRevealed).filter(i => !mines.has(i)).length;
    if (newSafeRevealed >= MS_SAFE) {
      // Full board clear
      setDone(true);
      const baseScore = Math.max(newSafeRevealed * 30 - secs * 2, 100) + 200;
      const dateStr = new Date().toISOString().slice(0, 10);
      const entry = {
        id: String(Date.now()),
        date: dateStr,
        outcome: 'win', score: baseScore, steps: newSteps, secs, safeRevealed: newSafeRevealed, cashOut: false, cashoutMultiplier: 1.0,
      };
      msSaveEntry(entry);
      setGameHistory(msLoadHistory());
      const shareText = `Minesweeper ${dateStr} — ✅ Full Clear · ${newSafeRevealed}/54 safe · ${secs}s · +${baseScore} pts`;
      onWin(baseScore, newSteps, secs, { share: shareText, cashOut: false });
    }
  };

  const handleCashOut = () => {
    if (!cashOutActive || !mineSet) return;
    setDone(true);
    const baseScore = Math.max(safeRevealed * 30 - secs * 2, 100);
    const finalScore = Math.round(baseScore * cashoutMultiplier);
    const dateStr = new Date().toISOString().slice(0, 10);
    const entry = {
      id: String(Date.now()),
      date: dateStr,
      outcome: 'win', score: finalScore, steps, secs, safeRevealed, cashOut: true, cashoutMultiplier,
    };
    msSaveEntry(entry);
    setGameHistory(msLoadHistory());
    const shareText = `Minesweeper ${dateStr} — 💰×${cashoutMultiplier} · ${safeRevealed}/54 safe · ${secs}s · +${finalScore} pts`;
    onWin(finalScore, steps, secs, { share: shareText, cashOut: true, cashoutMultiplier });
  };

  const handleFlag = (idx) => {
    if (done || revealed.has(idx)) return;
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  // Long-press flagging
  const onPointerDown = (idx) => {
    flagTimerRef.current = setTimeout(() => { handleFlag(idx); flagTimerRef.current = null; }, 500);
  };
  const onPointerUp = () => { if (flagTimerRef.current) { clearTimeout(flagTimerRef.current); flagTimerRef.current = null; } };

  const minesLeft = MS_MINES - flagged.size;

  const bannerText = isMock
    ? '🔧 Developer Mode — mock wallet active'
    : (window.usernode ? '🔗 Usernode connected' : null);

  const fmtDate = (d) => { const [y, m, day] = d.split('-'); return `${m}/${day}/${y.slice(2)}`; };

  return (
    <div>
      <div className="ms-game-header">
        {bannerText && <span className="ms-usernode-banner">{bannerText}</span>}
        <button className="ms-theme-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? '☀' : '🌙'}
        </button>
      </div>

      {activeTab === 'game' && (
        <div>
          <div className="status-bar">
            <div className="pill">
              <div className="plabel">Time</div>
              <div className="pvalue time">{timeFmt}</div>
            </div>
            <div className="pill">
              <div className="plabel">Mines Left</div>
              <div className="pvalue">{minesLeft}</div>
            </div>
            <div className="pill">
              <div className="plabel">Safe Revealed</div>
              <div className="pvalue">{safeRevealed}/{MS_SAFE}</div>
            </div>
          </div>

          <div
            className="ms-grid"
            data-ms-theme={theme}
            onContextMenu={e => e.preventDefault()}
          >
            {Array.from({ length: MS_ROWS * MS_COLS }, (_, idx) => {
              const isRevealed = revealed.has(idx);
              const isFlagged = flagged.has(idx);
              const isMine = mineSet && mineSet.has(idx);
              const isExploded = gameOverMine === idx;
              const isMineVisible = done && mineSet && mineSet.has(idx) && !isRevealed;
              const adjVal = adjacency && adjacency[idx];

              let cls = 'ms-cell';
              if (isExploded) cls += ' ms-exploded';
              else if (isMineVisible) cls += ' ms-mine-dead';
              else if (isRevealed) { cls += ' ms-revealed'; if (adjVal > 0) cls += ` ms-n${adjVal}`; }
              else if (isFlagged) cls += ' ms-flagged';
              else cls += ' ms-hidden';

              let content = '';
              if (isExploded) content = '💥';
              else if (isMineVisible) content = '💣';
              else if (isRevealed && adjVal > 0) content = adjVal;
              else if (isRevealed && adjVal === 0) content = '';
              else if (isFlagged) content = '🚩';

              return (
                <div
                  key={idx}
                  className={cls}
                  onClick={() => !done && !isFlagged && handleReveal(idx)}
                  onContextMenu={e => { e.preventDefault(); handleFlag(idx); }}
                  onPointerDown={() => onPointerDown(idx)}
                  onPointerUp={onPointerUp}
                  onPointerLeave={onPointerUp}
                >
                  {content}
                </div>
              );
            })}
          </div>

          <div className="ms-action-row">
            <div className="ms-cashout-wrap">
              <button
                className={'ms-cashout-btn' + (cashOutActive ? '' : ' disabled')}
                onClick={handleCashOut}
                disabled={!cashOutActive}
              >
                Cash Out 💰 ×{cashoutMultiplier}
              </button>
              {isMock && <div className="ms-dev-badge">Dev — simulated</div>}
            </div>
            <button className="ms-newgame-btn" onClick={() => {
              setMineSet(null); setAdjacency(null); setRevealed(new Set());
              setFlagged(new Set()); setDone(false); setGameOverMine(null); setSteps(0);
            }}>↺ New</button>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          {isMock && <div className="ms-dev-label">Local storage — will sync to chain when live</div>}
          <div className="ms-history-list">
            {gameHistory.length === 0
              ? <div className="ms-empty-state">No games recorded yet</div>
              : gameHistory.map(h => (
                <div key={h.id} className="ms-history-row">
                  <span className={`ms-outcome-chip ${h.outcome}`}>{h.outcome === 'win' ? 'Win' : 'Loss'}</span>
                  <span style={{ color: C.muted, fontSize: '0.75rem' }}>{fmtDate(h.date)}</span>
                  <span className="mono" style={{ color: C.gold }}>+{h.score}</span>
                  <span style={{ color: C.muted, fontSize: '0.75rem' }}>{h.safeRevealed}/54 · {h.secs}s</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div>
          {isMock && <div className="ms-dev-label">Local leaderboard — dev mode</div>}
          {gameHistory.length === 0
            ? <div className="ms-empty-state">No games recorded yet</div>
            : gameHistory
                .filter(h => h.outcome === 'win')
                .sort((a, b) => b.score - a.score)
                .slice(0, 10)
                .map((h, i) => (
                  <div key={h.id} className="ms-leaderboard-row">
                    <span className="ms-rank">#{i + 1}</span>
                    <span style={{ flex: 1, fontWeight: 600 }}>You</span>
                    <span className="mono" style={{ color: C.gold }}>+{h.score}</span>
                    <span style={{ color: C.muted, fontSize: '0.75rem' }}>{fmtDate(h.date)}</span>
                  </div>
                ))}
        </div>
      )}

      <div className="ms-bottom-nav">
        {['game', 'history', 'leaderboard'].map(tab => (
          <button
            key={tab}
            className={'ms-tab' + (activeTab === tab ? ' active' : '')}
            onClick={() => { setActiveTab(tab); if (tab !== 'game') setGameHistory(msLoadHistory()); }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}
